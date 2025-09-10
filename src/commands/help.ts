import {
	type APIInteraction,
	InteractionResponseType,
	MessageFlags,
} from 'discord-api-types/v10';
import type { Env } from '../config.js';
import * as discord from '../discord.js';
import type { Command } from '../discord-types.js';

export const cmd: Command = {
	name: 'help',
	description: 'Get help with the bot.',
	execute,
};

async function execute(_interaction: APIInteraction, env: Env) {
	const commands = await discord.getCommands(env);
	const commandRefs = commands.map(
		(c) => `- </${c.name}:${c.id}>: ${c.description}`,
	);
	return {
		type: InteractionResponseType.ChannelMessageWithSource as const,
		data: {
			flags: MessageFlags.Ephemeral,
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
