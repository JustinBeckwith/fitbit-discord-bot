import { InteractionResponseType } from 'discord-interactions';
import type { Context } from 'hono';
import type { Env } from './config.js';
import * as discord from './discord.js';
import * as fitbit from './fitbit.js';
import * as storage from './storage.js';

/**
 * Shared utility function. For a given Fitbit UserId, fetch profile metadata,
 * transform it, and push it to the Discord metadata endpoint.
 */
export async function updateMetadata(userId: string, env: Env) {
	const fitbitTokens = await storage.getFitbitTokens(env, userId);
	const discordTokens = await storage.getDiscordTokens(
		env,
		fitbitTokens.discord_user_id,
	);

	// Fetch the user profile data from Fitbit
	let metadata: Record<string, string>;
	try {
		const profile = await fitbit.getProfile(userId, fitbitTokens, env);
		// Transform the data from the profile, and grab only the bits of data used by Discord.
		metadata = {
			averagedailysteps: profile.user.averageDailySteps,
			ambassador: profile.user.ambassador,
			membersince: profile.user.memberSince,
			iscoach: profile.user.isCoach,
		};
	} catch (e) {
		e.message = `Error fetching Fitbit profile data: ${e.message}`;
		console.error(e);
		// If fetching the profile data for the Fitbit user fails for any reason,
		// ensure metadata on the Discord side is nulled out. This prevents cases
		// where the user revokes the Fitbit app permissions, and is left with
		// stale verified role data.
		metadata = {
			averagedailysteps: undefined,
			ambassador: undefined,
			membersince: undefined,
			iscoach: undefined,
		};
	}

	// Push the data to Discord.
	await discord.pushMetadata(userId, discordTokens, metadata, env);
}

export function sendNoConnectionFound(env: Env) {
	return {
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: {
			content: `🥴 no Fitbit connection info found.  Visit ${env.VERIFICATION_URL} to set it up.`,
		},
	};
}

export async function throwFetchError(response: Response) {
	let errorText = `Error fetching ${response.url}: ${response.status} ${response.statusText}`;
	try {
		const error = await response.text();
		if (error) {
			errorText = `${errorText} \n\n ${error}`;
		}
	} catch {}

	throw new FetchError(errorText, response);
}

export class FetchError extends Error {
	constructor(
		message: string,
		public response: Response,
	) {
		super(message);
	}
}
