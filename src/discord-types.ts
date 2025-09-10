import type {
	APIApplicationCommandOption,
	APIApplicationIntegrationTypesConfigMap,
	APIInteraction,
	APIInteractionResponseChannelMessageWithSource,
} from 'discord-api-types/v10';
import type { Env } from './config.js';

export type Command = {
	name: string;
	description: string;
	options?: APIApplicationCommandOption[];
	integration_types?: APIApplicationIntegrationTypesConfigMap[];
	execute: (
		message: APIInteraction,
		env: Env,
	) => Promise<APIInteractionResponseChannelMessageWithSource>;
};
