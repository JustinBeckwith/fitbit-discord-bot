import {
	type APIInteraction,
	InteractionResponseType,
} from 'discord-api-types/v10';
import { sendNoConnectionFound } from '../common.js';
import type { Env } from '../config.js';
import type { Command } from '../discord-types.js';
import * as discord from '../discord.js';
import * as fitbit from '../fitbit.js';
import * as storage from '../storage.js';

export const cmd: Command = {
	name: 'disconnect',
	description: 'Clear all associated Fitbit data and disconnect your account.',
	execute,
};

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
async function execute(interaction: APIInteraction, env: Env) {
	const userId = interaction.member.user.id;
	let cleanedUp = false;
	const discordTokens = await storage.getDiscordTokens(env, userId);

	if (discordTokens) {
		cleanedUp = true;

		// 1. Push empty Metadata to Discord to null out the verified role
		await discord.pushMetadata(userId, discordTokens, {}, env);

		// 2. Revoke Discord OAuth2 tokens
		await discord.revokeAccess(userId, env);
	}

	// 3. Fetch the Fitbit UserId using the Discord UserId
	const fitbitUserId = await storage.getLinkedFitbitUserId(env, userId);
	if (fitbitUserId) {
		cleanedUp = true;

		// 4. Revoke Fitbit OAuth2 tokens
		await fitbit.revokeAccess(fitbitUserId, env);
		await storage.deleteLinkedFitbitUser(env, userId);
	}

	// 5. Let the user know the slash command worked
	if (cleanedUp) {
		return {
			type: InteractionResponseType.ChannelMessageWithSource as const,
			data: {
				content: 'Fitbit account disconnected.',
			},
		};
	}

	return sendNoConnectionFound(env);
}
