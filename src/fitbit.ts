import crypto from 'node:crypto';
import { request } from 'gaxios';
import config from './config.js';
import * as storage from './storage.js';

/**
 * Code specific to communicating with the Fitbit API.
 */

export interface OAuthTokens {
	access_token: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
	token_type: string;
	user_id: string;
}

export interface WebhookBody {
	collectionType: string; // body
	date: string; // 2022-11-18
	ownerId: string; // 29H3VW
	ownerType: string; // user
	subscriptionId: string; // 940311281653645353
}

export interface ProfileData {
	user: {
		aboutMe: string;
		age: string;
		ambassador: string;
		autoStrideEnabled: string;
		avatar: string;
		avatar150: string;
		avatar640: string;
		averageDailySteps: string;
		challengesBeta: string;
		clockTimeDisplayFormat: string;
		country: string;
		corporate: string;
		corporateAdmin: string;
		dateOfBirth: string;
		displayName: string;
		displayNameSetting: string;
		distanceUnit: string;
		encodedId: string;
		features: {
			exerciseGoal: string;
		};
		firstName: string;
		foodsLocale: string;
		fullName: string;
		gender: string;
		glucoseUnit: string;
		height: string;
		heightUnit: string;
		isBugReportEnabled: string;
		isChild: string;
		isCoach: string;
		languageLocale: string;
		lastName: string;
		legalTermsAcceptRequired: string;
		locale: string;
		memberSince: string;
		mfaEnabled: string;
		offsetFromUTCMillis: string;
		sdkDeveloper: string;
		sleepTracking: string;
		startDayOfWeek: string;
		state: string;
		strideLengthRunning: string;
		strideLengthRunningType: string;
		strideLengthWalking: string;
		strideLengthWalkingType: string;
		swimUnit: string;
		temperatureUnit: string;
		timezone: string;
		topBadges: [
			{
				badgeGradientEndColor: string;
				badgeGradientStartColor: string;
				badgeType: string;
				category: string;
				cheers: string[];
				dateTime: string;
				description: string;
				earnedMessage: string;
				encodedId: string;
				image100px: string;
				image125px: string;
				image300px: string;
				image50px: string;
				image75px: string;
				marketingDescription: string;
				mobileDescription: string;
				name: string;
				shareImage640px: string;
				shareText: string;
				shortDescription: string;
				shortName: string;
				timesAchieved: number;
				value: number;
			},
		];
		waterUnit: string;
		waterUnitName: string;
		weight: string;
		weightUnit: string;
	};
}

/**
 * The following methods all facilitate OAuth2 communication with Fitbit.
 * See https://dev.fitbit.com/build/reference/web-api/developer-guide/authorization/
 * for more details.
 */

/**
 * The Fitbit OAuth2 API requires a cryptographic code verfier and challenge.
 * This method generates both the challenge that will be sent with the initial
 * request to the Fitbit OAuth2 consent dialog, and the verifier that needs to
 * be used with the subsequent request for the access and refresh tokens.
 */
function generateCodeVerifier() {
	const randomString = crypto.randomBytes(96).toString('base64');
	// The valid characters in the code_verifier are [A-Z]/[a-z]/[0-9]/
	// -/./_/~. Base64 encoded strings are pretty close, so we're just
	// swapping out a few chars.
	const codeVerifier = randomString
		.replace(/\+/g, '~')
		.replace(/=/g, '_')
		.replace(/\//g, '-');
	// Generate the base64 encoded SHA256
	const unencodedCodeChallenge = crypto
		.createHash('sha256')
		.update(codeVerifier)
		.digest('base64');
	// We need to use base64UrlEncoding instead of standard base64
	const codeChallenge = unencodedCodeChallenge
		.split('=')[0]
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
	return { codeVerifier, codeChallenge };
}

/**
 * Generate a url which users will use to approve the current bot for access to
 * their Fitbit account, along with the set of required scopes.
 */
export function getOAuthUrl() {
	const { codeVerifier, codeChallenge } = generateCodeVerifier();
	const state = crypto.randomBytes(20).toString('hex');
	const url = new URL('https://www.fitbit.com/oauth2/authorize');
	url.searchParams.set('client_id', config.FITBIT_CLIENT_ID);
	url.searchParams.set('redirect_uri', config.FITBIT_REDIRECT_URI);
	url.searchParams.set('code_challenge', codeChallenge);
	url.searchParams.set('code_challenge_method', 'S256');
	url.searchParams.set('state', state);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set(
		'scope',
		'activity heartrate location settings sleep weight nutrition oxygen_saturation profile',
	);
	url.searchParams.set('prompt', 'consent');
	return { state, codeVerifier, url: url.toString() };
}

/**
 * Given an OAuth2 code from the scope approval page, make a request to Fitbit's
 * OAuth2 service to retreive an access token, refresh token, and expiration.
 */
export async function getOAuthTokens(code: string, codeVerifier: string) {
	const body = new URLSearchParams({
		client_id: config.FITBIT_CLIENT_ID,
		client_secret: config.FITBIT_CLIENT_SECRET,
		grant_type: 'authorization_code',
		code_verifier: codeVerifier,
		code,
		redirect_uri: config.FITBIT_REDIRECT_URI,
	});
	const r = await request<OAuthTokens>({
		url: 'https://api.fitbit.com/oauth2/token',
		body: body.toString(),
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});
	return r.data;
}

/**
 * The initial token request comes with both an access token and a refresh
 * token.  Check if the access token has expired, and if it has, use the
 * refresh token to acquire a new, fresh access token.
 *
 * See https://dev.fitbit.com/build/reference/web-api/authorization/refresh-token/.
 */
async function getAccessToken(userId: string, data: storage.FitbitData) {
	if (Date.now() > data.expires_at) {
		console.log('token expired, fetching a newsy one');
		const url = 'https://api.fitbit.com/oauth2/token';
		const body = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: data.refresh_token,
		});
		const authCode = Buffer.from(
			`${config.FITBIT_CLIENT_ID}:${config.FITBIT_CLIENT_SECRET}`,
		).toString('base64');
		const r = await request<OAuthTokens>({
			url,
			body,
			method: 'POST',
			headers: {
				Authorization: `Basic ${authCode}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});
		const tokens = r.data;
		console.log(`new access token: ${tokens.access_token}`);
		data.access_token = tokens.access_token;
		data.expires_at = Date.now() + tokens.expires_in * 1000;
		await storage.storeFitbitTokens(userId, data);
		return tokens.access_token;
	}
	return data.access_token;
}

/**
 * Revoke the given user's Fitbit refresh token.
 * See https://dev.fitbit.com/build/reference/web-api/authorization/revoke-token.
 * @param userId The Fitbit User ID
 */
export async function revokeAccess(userId: string) {
	const url = 'https://api.fitbit.com/oauth2/revoke';

	// Revoke the refresh token. It would appear that revoking the refresh token
	// also revokes all associated access tokens for this implementation of the
	// OAuth2 API.
	try {
		const tokens = await storage.getFitbitTokens(userId);
		const accessToken = await getAccessToken(userId, tokens);

		await request({
			url,
			method: 'POST',
			body: new URLSearchParams({
				client_id: config.FITBIT_CLIENT_ID,
				token: tokens.refresh_token,
			}),
			headers: {
				authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});
	} catch (e) {
		// if revoking the token fails, remove the tokens from our storage and
		// move on.
		console.error(e);
	}

	// remove the tokens from storage
	await storage.deleteFitbitTokens(userId);
}

/*
 * Each user registration requires the setup of a single subscription which
 * enables webhook delivery for that user.
 * See https://dev.fitbit.com/build/reference/web-api/subscription/create-subscription/.
 */
export async function createSubscription(
	userId: string,
	data: storage.FitbitData,
) {
	// POST /1/user/[user-id]/[collection-path]/apiSubscriptions/[subscription-id].json
	const url = `https://api.fitbit.com/1/user/-/apiSubscriptions/${data.discord_user_id}.json`;
	const token = await getAccessToken(userId, data);
	await request({
		url,
		method: 'POST',
		headers: {
			authorization: `Bearer ${token}`,
		},
	});
}

/**
 * List all available subscriptions for the given user.
 */
export async function listSubscriptions(
	userId: string,
	data: storage.FitbitData,
) {
	// GET /1/user/[user-id]/[collection-path]/apiSubscriptions.json
	const url = 'https://api.fitbit.com/1/user/-/apiSubscriptions.json';
	const token = await getAccessToken(userId, data);
	const res = await request({
		url,
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
	return res.data;
}

/**
 * Fetch the user profile for the current user.
 */
export async function getProfile(userId: string, data: storage.FitbitData) {
	// /1/user/[user-id]/profile.json
	const url = 'https://api.fitbit.com/1/user/-/profile.json';
	const token = await getAccessToken(userId, data);
	const res = await request<ProfileData>({
		url,
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
	return res.data;
}
