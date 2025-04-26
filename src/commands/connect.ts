import { InteractionResponseType } from 'discord-interactions';
import type { Env } from '../config.js';
import type { Command, Interaction } from '../discord-types.js';

export const cmd: Command = {
	name: 'connect',
	description: 'Connect your Fitbit account to your Discord account.',
	execute,
};

async function execute(interaction: Interaction, env: Env) {
	return {
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: {
			content: `Visit ${env.VERIFICATION_URL} to connect your Fitbit account.`,
		},
	};
}
