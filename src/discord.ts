import type {
	APIApplicationCommand,
	RESTGetAPIOAuth2CurrentAuthorizationResult,
	RESTPostOAuth2AccessTokenResult,
} from 'discord-api-types/v10';
import { throwFetchError } from './common.js';
import type { Env } from './config.js';
import * as storage from './storage.js';

/**
 * Code specific to communicating with the Discord API.
 */

/**
 * The following methods all facilitate OAuth2 communication with Discord.
 * See https://discord.com/developers/docs/topics/oauth2 for more details.
 */

const baseUrl = 'https://discord.com/api/v10';

/**
 * Generate the url which the user will be directed to in order to approve the
 * bot, and see the list of requested scopes.
 */
export function getOAuthUrl(env: Env) {
	const state = crypto.randomUUID();

	const url = new URL('https://discord.com/api/oauth2/authorize');
	url.searchParams.set('client_id', env.DISCORD_CLIENT_ID);
	url.searchParams.set('redirect_uri', env.DISCORD_REDIRECT_URI);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('state', state);
	url.searchParams.set('scope', 'role_connections.write identify');
	url.searchParams.set('prompt', 'consent');
	return { state, url: url.toString() };
}

/**
 * Given an OAuth2 code from the scope approval page, make a request to Discord's
 * OAuth2 service to retreive an access token, refresh token, and expiration.
 */
export async function getOAuthTokens(
	code: string,
	env: Env,
): Promise<RESTPostOAuth2AccessTokenResult> {
	const url = `${baseUrl}/oauth2/token`;
	const data = new URLSearchParams({
		client_id: env.DISCORD_CLIENT_ID,
		client_secret: env.DISCORD_CLIENT_SECRET,
		grant_type: 'authorization_code',
		code,
		redirect_uri: env.DISCORD_REDIRECT_URI,
	});

	const r = await fetch(url, {
		body: data,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});
	const responseData = (await r.json()) as RESTPostOAuth2AccessTokenResult;
	return responseData;
}

/**
 * The initial token request comes with both an access token and a refresh
 * token.  Check if the access token has expired, and if it has, use the
 * refresh token to acquire a new, fresh access token.
 */
export async function getAccessToken(
	userId: string,
	data: storage.DiscordData,
	env: Env,
) {
	if (Date.now() > data.expires_at) {
		const url = `${baseUrl}/oauth2/token`;
		const body = new URLSearchParams({
			client_id: env.DISCORD_CLIENT_ID,
			client_secret: env.DISCORD_CLIENT_SECRET,
			grant_type: 'refresh_token',
			refresh_token: data.refresh_token,
		});
		const r = await fetch(url, {
			body,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});
		const responseData = (await r.json()) as RESTPostOAuth2AccessTokenResult;
		console.log(`new discord access token: ${responseData.access_token}`);
		data.access_token = responseData.access_token;
		data.expires_at = Date.now() + responseData.expires_in * 1000;
		await storage.storeDiscordTokens(env, userId, data);
		return responseData.access_token;
	}
	return data.access_token;
}

/**
 * Revoke the given user's Discord access and refresh tokens.
 * @param userId The Discord User ID
 */
export async function revokeAccess(userId: string, env: Env) {
	const url = `${baseUrl}/oauth2/token/revoke`;
	const tokens = await env.fitbit.get<storage.DiscordData>(`discord-${userId}`);

	// revoke the refresh token
	await fetch(url, {
		method: 'POST',
		body: new URLSearchParams({
			client_id: env.DISCORD_CLIENT_ID,
			client_secret: env.DISCORD_CLIENT_SECRET,
			token: tokens.refresh_token,
			token_type_hint: 'refresh_token',
		}),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});

	// remove the tokens from storage
	await storage.deleteDiscordTokens(env, userId);
}

/**
 * Given a user based access token, fetch profile information for the current user.
 */
export async function getUserData(tokens: RESTPostOAuth2AccessTokenResult) {
	const url = `${baseUrl}/oauth2/@me`;
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${tokens.access_token}`,
		},
	});
	const responseData =
		(await res.json()) as RESTGetAPIOAuth2CurrentAuthorizationResult;
	return responseData;
}

/**
 * Given metadata that matches the schema, push that data to Discord on behalf
 * of the current user.
 */
export async function pushMetadata(
	userId: string,
	data: storage.DiscordData,
	metadata: Record<string, string>,
	env: Env,
) {
	// GET/PUT /users/@me/applications/:id/role-connection
	const url = `${baseUrl}/users/@me/applications/${env.DISCORD_CLIENT_ID}/role-connection`;
	const accessToken = await getAccessToken(userId, data, env);
	const body = {
		platform_name: 'Fitbit Discord Bot',
		metadata,
	};
	try {
		await fetch(url, {
			method: 'PUT',
			body: JSON.stringify(body),
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
		});
	} catch (e) {
		console.error(e);
		throw e;
	}
}

/**
 * Fetch the metadata currently pushed to Discord for the currently logged
 * in user, for this specific bot.
 */
export async function getMetadata(
	userId: string,
	data: storage.DiscordData,
	env: Env,
) {
	// GET/PUT /users/@me/applications/:id/role-connection
	const url = `${baseUrl}/users/@me/applications/${env.DISCORD_CLIENT_ID}/role-connection`;
	const accessToken = await getAccessToken(userId, data, env);
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
	const responseData = await res.json();
	return responseData;
}

/**
 * Fetch the metadata schema to be used by Discord for the current bot.
 * Note: uses a Bot token for authentication, not a user token.
 */
export async function getMetadataSchema(env: Env) {
	const url = `${baseUrl}/applications/${env.DISCORD_CLIENT_ID}/role-connections/metadata`;
	const res = await fetch(url, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${env.DISCORD_TOKEN}`,
		},
	});
	const responseData = await res.json();
	return responseData;
}

let commands: APIApplicationCommand[];

export async function getCommands(env: Env) {
	if (!commands) {
		const url = `${baseUrl}/applications/${env.DISCORD_CLIENT_ID}/commands`;
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bot ${env.DISCORD_TOKEN}`,
			},
		});
		if (!response.ok) {
			await throwFetchError(response);
		}

		const data = (await response.json()) as APIApplicationCommand[];
		console.log(data);
		commands = data;
	}
	return commands;
}
