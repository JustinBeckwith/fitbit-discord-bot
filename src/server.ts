import {
	InteractionResponseType,
	InteractionType,
	verifyKey,
} from 'discord-interactions';
import { type Context, Hono, type HonoRequest } from 'hono';
import { getSignedCookie, setSignedCookie } from 'hono/cookie';
import { CONNECT, DISCONNECT, GET_PROFILE } from './commands.js';
import { updateMetadata } from './common.js';
import type { Env } from './config.js';
import type { Interaction } from './discord-types.js';
import * as discord from './discord.js';
import * as fitbit from './fitbit.js';
import * as storage from './storage.js';

/**
 * Main HTTP server used for the bot.
 */

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
	// Just a happy little route to show our server is up.
	return c.text('👋');
});

/**
 * Main entry point for bot slash commands. It uses the `verifyKeyMiddleware`
 * to validate request signatures, and returns relevent slash command data.
 */
app.post('/', async (c) => {
	const { isValid, interaction } = await verifyDiscordRequest(c.req, c.env);
	if (!isValid || !interaction) {
		return c.text('Bad request signature.', { status: 401 });
	}

	console.log(JSON.stringify(interaction, null, 2));

	if (interaction.type === InteractionType.PING) {
		console.log('Handling Ping request');
		return c.json({
			type: InteractionResponseType.PONG,
		});
	}

	if (interaction.type === InteractionType.APPLICATION_COMMAND) {
		console.log(`Handling application command: ${interaction.data.name}`);
		switch (interaction.data.name.toLowerCase()) {
			case CONNECT.name.toLowerCase(): {
				return c.json({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						content: `Visit ${c.env.VERIFICATION_URL} to connect your Fitbit account.`,
					},
				});
			}
			/**
			 * DISCONNECT
			 * Revokes all tokens to both Discord and Fitbit, while clearing out
			 * all associated data:
			 * 1. Push empty Metadata to Discord to null out the verified role
			 * 2. Revoke Discord OAuth2 tokens
			 * 3. Fetch the Fitbit UserId using the Discord UserId
			 * 4. Revoke Fitbit OAuth2 tokens
			 * 5. Let the user know the slash command worked
			 */
			case DISCONNECT.name.toLowerCase(): {
				const userId = interaction.member.user.id;
				let cleanedUp = false;
				const discordTokens = await storage.getDiscordTokens(c.env, userId);

				if (discordTokens) {
					cleanedUp = true;

					// 1. Push empty Metadata to Discord to null out the verified role
					await discord.pushMetadata(userId, discordTokens, {}, c.env);

					// 2. Revoke Discord OAuth2 tokens
					await discord.revokeAccess(userId, c.env);
				}

				// 3. Fetch the Fitbit UserId using the Discord UserId
				const fitbitUserId = await storage.getLinkedFitbitUserId(c.env, userId);
				if (fitbitUserId) {
					cleanedUp = true;

					// 4. Revoke Fitbit OAuth2 tokens
					await fitbit.revokeAccess(fitbitUserId, c.env);
					await storage.deleteLinkedFitbitUser(c.env, userId);
				}

				// 5. Let the user know the slash command worked
				if (cleanedUp) {
					return c.json({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: 'Fitbit account disconnected.',
						},
					});
				}
				return sendNoConnectionFound(c);
			}
			case GET_PROFILE.name.toLowerCase(): {
				/**
				 * GET PROFILE
				 * If the user has a linked Fitbit account, fetch the profile data.
				 */
				const userId = interaction.member.user.id;
				const fitbitUserId = await storage.getLinkedFitbitUserId(c.env, userId);
				if (!fitbitUserId) {
					return sendNoConnectionFound(c);
				}

				const fitbitTokens = await storage.getFitbitTokens(c.env, fitbitUserId);
				if (!fitbitTokens) {
					return sendNoConnectionFound(c);
				}
				const profile = await fitbit.getProfile(
					fitbitUserId,
					fitbitTokens,
					c.env,
				);
				const metadata = {
					averagedailysteps: profile.user.averageDailySteps,
					ambassador: profile.user.ambassador,
					membersince: profile.user.memberSince,
					iscoach: profile.user.isCoach,
				};
				return c.json({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						content: `\`\`\`${JSON.stringify(metadata)}\`\`\``,
					},
				});
			}
			default:
				console.error('Unknown Command');
				return c.json({ error: 'Unknown Type' }, { status: 400 });
		}
	}
	return c.json({ error: 'Unknown Type' }, { status: 400 });
});

/**
 * Route configured in the Discord developer console which facilitates the
 * connection between Discord and Fitbit. To start the flow, generate the OAuth2
 * consent dialog url for Discord, and send the user there.
 */
app.get('/verified-role', async (c) => {
	const { url, state } = await discord.getOAuthUrl(c.env);
	console.log(url, state);

	// Set the signed state param in the response cookies
	await setSignedCookie(c, 'clientState', state, c.env.COOKIE_SECRET, {
		maxAge: 1000 * 60 * 5,
	});

	// Redirect the user to the Discord owned OAuth2 authorization endpoint
	return c.redirect(url);
});

/**
 * Route configured in the Discord developer console, the redirect Url to which
 * the user is sent after approving the bot for their Discord account. This
 * completes a few steps:
 * 1. Uses the code to acquire Discord OAuth2 tokens
 * 2. Uses the Discord Access Token to fetch the user profile
 * 3. Stores the OAuth2 Discord Tokens in KV
 * 4. Generates an OAuth2 consent dialog url for Fitbit, and redirects the user.
 */
app.get('/discord-oauth-callback', async (c) => {
	try {
		// 1. Uses the code and state to acquire Discord OAuth2 tokens
		const code = c.req.query('code');
		const discordState = c.req.query('state');

		// make sure the state parameter exists
		const clientState = await getSignedCookie(
			c,
			c.env.COOKIE_SECRET,
			'clientState',
		);
		if (clientState !== discordState) {
			console.error('State verification failed.');
			return c.json({ error: 'State verification failed.' }, { status: 403 });
		}

		const tokens = await discord.getOAuthTokens(code, c.env);

		// 2. Uses the Discord Access Token to fetch the user profile
		const meData = await discord.getUserData(tokens);
		const userId = meData.user.id;
		await storage.storeDiscordTokens(c.env, userId, {
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token,
			expires_at: Date.now() + tokens.expires_in * 1000,
		});

		// start the fitbit OAuth2 flow by generating a new OAuth2 Url
		const { url, codeVerifier, state } = await fitbit.getOAuthUrl(c.env);
		// store the code verifier and state arguments required by the fitbit url
		await storage.storeStateData(c.env, state, {
			discordUserId: userId,
			codeVerifier,
		});

		// send the user to the fitbit OAuth2 consent dialog screen
		return c.redirect(url);
	} catch (e) {
		console.error(e);
		return c.body(null, 500);
	}
});

/**
 * Route configured in the Fitbit developer console, the redirect Url to which
 * the user is sent after approvingv the bot for their Fitbit account.
 * 1. Use the state in the querystring to fetch the code verifier and challenge
 * 2. Use the code in the querystring to acquire Fitbit OAuth2 tokens
 * 3. Store the Fitbit tokens in KV
 * 4. Create a new subscription to ensure webhook events are sent for the current user
 * 5. Fetch Fitbit profile metadata, and push it to the Discord metadata service
 */
app.get('/fitbit-oauth-callback', async (c) => {
	try {
		// 1. Use the state in the querystring to fetch the code verifier and challenge
		const state = c.req.query('state');
		const { discordUserId, codeVerifier } = await storage.getStateData(
			c.env,
			state,
		);

		// 2. Use the code in the querystring to acquire Fitbit OAuth2 tokens
		const code = c.req.query('code');
		const tokens = await fitbit.getOAuthTokens(code, codeVerifier, c.env);

		// 3. Store the Fitbit tokens in KV
		const userId = tokens.user_id;
		const data = {
			discord_user_id: discordUserId,
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token,
			expires_at: Date.now() + tokens.expires_in * 1000,
			code_verifier: codeVerifier,
		};
		await storage.storeFitbitTokens(c.env, userId, data);

		// 4. Create a new subscription to ensure webhook events are sent for the current user
		await fitbit.createSubscription(userId, data, c.env);

		// 5. Fetch Fitbit profile metadata, and push it to the Discord metadata service
		await updateMetadata(userId, c.env);

		await storage.setLinkedFitbitUserId(c.env, discordUserId, userId);

		return c.text('You did it!  Now go back to Discord.');
	} catch (e) {
		console.error(e);
		return c.body(null, 500);
	}
});

/**
 * Route configured in the Fitbit developer console, the route where user
 * events are sent. This is used once for url verification by the Fitbit API.
 * Note: this is a `GET`, and the actual webhook is a `POST`
 * Verify subscriber as explained in:
 * https://dev.fitbit.com/build/reference/web-api/developer-guide/using-subscriptions/#Verifying-a-Subscriber
 */
app.get('/fitbit-webhook', async (c) => {
	const verify = c.req.query('verify');
	if (verify === c.env.FITBIT_SUBSCRIBER_VERIFY) {
		console.log(`verified: ${verify}`);
		return c.body(null, 204);
	}
	return c.body(null, 404);
});

/**
 * Route configured in the Fitbit developer console, the route where user events are sent.
 * Takes a few steps:
 * 1. Fetch the Discord and Fitbit tokens from storage KV
 * 2. Fetch the user profile data from Fitbit and send it to Discord
 */
app.post('/fitbit-webhook', async (c) => {
	try {
		const body = await c.req.json<fitbit.WebhookBody[]>();
		if (body.length === 0) throw new Error('No events returned from Fitbit');
		const userId = body[0].ownerId;		
		await updateMetadata(userId, c.env);
		return c.body(null, 204);
	} catch (e) {
		console.error(e);
		return c.body(null, 500);
	}
});

// app.get('/dump', async (c) => {
// 	const keys = await c.env.fitbit.list();
// 	for (const key of keys.keys) {
// 		const value = await c.env.fitbit.get(key.name);
// 		console.log(`${key.name}: ${value}\n\n`);
// 	}
// 	return c.text('done');
// });

function sendNoConnectionFound(c: Context) {
	return c.json({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: {
			content: `🥴 no Fitbit connection info found.  Visit ${c.env.VERIFICATION_URL} to set it up.`,
		},
	});
}
async function verifyDiscordRequest(request: HonoRequest, env: Env) {
	const signature = request.header('x-signature-ed25519');
	const timestamp = request.header('x-signature-timestamp');
	const body = await request.text();
	const isValidRequest =
		signature &&
		timestamp &&
		(await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));
	if (!isValidRequest) {
		return { isValid: false };
	}

	return { interaction: JSON.parse(body) as Interaction, isValid: true };
}

export default app;
