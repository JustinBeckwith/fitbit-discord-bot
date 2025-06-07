import type { Env } from '../config.js';
import { InteractionResponseType, type APIInteraction } from 'discord-api-types/v10';
import type { Command } from '../discord-types.js';

export const cmd: Command = {
	name: 'connect',
	description: 'Connect your Fitbit account to your Discord account.',
	execute,
};

async function execute(interaction: APIInteraction, env: Env) {
	return {
		type: InteractionResponseType.ChannelMessageWithSource as const,
		data: {
			content: `Visit ${env.VERIFICATION_URL} to connect your Fitbit account.`,
		},
	};
}
