import {
	InteractionResponseFlags,
	InteractionResponseType,
} from 'discord-interactions';
import type { Env } from '../config.js';
import type { Command, Interaction } from '../discord-types.js';
import * as discord from '../discord.js';

export const cmd: Command = {
	name: 'help',
	description: 'Get help with the bot.',
	execute,
};

async function execute(interaction: Interaction, env: Env) {
	const commands = await discord.getCommands(env);
	const commandRefs = commands.map(
		(c) => `- </${c.name}:${c.id}>: ${c.description}`,
	);
	return {
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: {
			flags: InteractionResponseFlags.EPHEMERAL,
			embeds: [
				{
					title: "Oh hai, I'm the Discord FitBit Bot.",
					description: `I do a bunch of things with the FitBit API.\n\n${commandRefs.join('\n')}`,
					color: 0xa2_45_ff, // Purple,
				},
			],
		},
	};
}
