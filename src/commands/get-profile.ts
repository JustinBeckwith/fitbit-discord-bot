import { InteractionResponseType } from 'discord-interactions';
import { sendNoConnectionFound } from '../common.js';
import type { Env } from '../config.js';
import type { Command, Interaction } from '../discord-types.js';
import * as fitbit from '../fitbit.js';
import * as storage from '../storage.js';

export const cmd: Command = {
	name: 'get-profile',
	description: 'Get your Fitbit profile.',
	execute,
};

/**
 * GET PROFILE
 * If the user has a linked Fitbit account, fetch the profile data.
 */
async function execute(interaction: Interaction, env: Env) {
	const userId = interaction.member.user.id;
	const fitbitUserId = await storage.getLinkedFitbitUserId(env, userId);
	if (!fitbitUserId) {
		return sendNoConnectionFound(env);
	}

	const fitbitTokens = await storage.getFitbitTokens(env, fitbitUserId);
	if (!fitbitTokens) {
		return sendNoConnectionFound(env);
	}
	const profile = await fitbit.getProfile(fitbitUserId, fitbitTokens, env);
	const metadata = {
		averagedailysteps: profile.user.averageDailySteps,
		ambassador: profile.user.ambassador,
		membersince: profile.user.memberSince,
		iscoach: profile.user.isCoach,
	};
	return {
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: {
			content: `\`\`\`${JSON.stringify(metadata)}\`\`\``,
		},
	};
}
