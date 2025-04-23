import type { ExecutionContext } from '@cloudflare/workers-types';
import type { Env } from './config.js';

import type {
	InteractionResponseType,
	InteractionType,
	MessageComponent,
	MessageComponentTypes,
} from 'discord-interactions';

export type MessageData = {
	title?: string;
	custom_id?: string;
	content?: string;
	embeds?: Embed[];
	flags?: number;
	components?: MessageComponent[];
	allowed_mentions?: AllowedMentions;
};

export type AllowedMentions = {
	parse?: string[];
	users?: string[];
};

export type DiscordResponse = {
	type: InteractionResponseType;
	data?: MessageData;
};

export type EmbedImage = {
	url: string;
	proxy_url?: string;
	height?: number;
	width?: number;
};

export type EmbedAuthor = {
	name: string; // String	name of author
	url?: string; // 	String	url of author
	icon_url?: string; // String	url of author icon (only supports http(s) and attachments)
	proxy_icon_url?: string; //	String	a proxied url of author icon
};

export type EmbedField = {
	name: string; //	Name of the field
	value: string; //	Value of the field
	inline?: boolean; // Whether or not this field should display inline
};

export type Embed = {
	title?: string; // Title of embed
	type?: string; //	Type of embed (always rich for webhook embeds)
	description?: string; // Description of embed
	url?: string; // Url of embed
	timestamp?: string; // ISO8601 timestamp of embed content
	color?: number; //	Integer	color code of the embed
	footer?: {
		text?: string;
		icon_url?: string;
		proxy_icon_url?: string;
	};
	image?: EmbedImage;
	thumbnail?: EmbedImage;
	video?: EmbedImage;
	provider?: {
		name?: string;
		url?: string;
	};
	author?: EmbedAuthor; //	Embed author object	author information
	fields?: EmbedField[]; //	Array of embed field objects	fields information
};

export type Interaction = {
	app_permissions: string;
	application_id: string;
	channel_id: string;
	data: {
		id: string;
		name: string;
		type: number;
		component_type?: MessageComponentTypes;
		custom_id?: string;
		values?: string[];
		components?: MessageComponent[];
		options: Array<{
			name: string;
			type: number;
			options: Array<{
				type: number;
				name: string;
				value: string;
			}>;
		}>;
	};
	entitlement_sku_ids?: string[];
	guild_id: string;
	guild_locale: string;
	id: string;
	locale: string;
	member: {
		avatar?: string | null;
		communication_disabled_until?: string;
		deaf: boolean;
		flags?: number;
		is_pending: boolean;
		joined_at: string;
		mute: boolean;
		nick?: string;
		pending: boolean;
		permissions: number;
		premium_since?: string;
		roles: number[];
		user: {
			avatar: string;
			avatar_decoration?: string;
			discriminator: number;
			id: string;
			public_flags: number;
			username: string;
		};
	};
	message?: {
		application_id: string;
		attachments: string[];
		author: {
			avatar?: string;
			avatar_decoration?: string;
			bot: boolean;
			discriminator: number;
			id: string;
			public_flags: number;
			username: string;
		};
		channel_id: string;
		components: MessageComponent[];
		content?: string;
		edited_timestamp?: string;
		embeds: Embed[];
		flags: number;
		id: string;
		interaction: {
			id: string;
			name: string;
			type: number;
			user: {
				avatar: string;
				avatar_decoration?: string;
				discriminator: number;
				id: string;
				public_flags: number;
				username: string;
			};
		};
		mention_everyone: false;
		mention_roles: string[];
		mentions: string[];
		pinned: false;
		timestamp: string;
		tts: boolean;
		type: number;
		webhook_id: string;
	};
	token: string;
	type: InteractionType;
	version: number;
};

export type Channel = {
	id: string;
	guild_id: string;
};

// https://discord.com/developers/docs/resources/channel#message-object
export type Message = {
	id: string;
};

export type Command = {
	name: string;
	description: string;
	options?: CommandOption[];
	integration_types?: CommandIntegrationType[];
	execute: (
		message: Interaction,
		env: Env,
		ctx: ExecutionContext,
	) => Promise<DiscordResponse>;
};

export type CommandOption = {
	name: string;
	description: string;
	type: CommandOptionType;
	required: boolean;
	choices?: CommandOptionChoice[];
};

export type CommandOptionChoice = {
	name: string; // String	1-100 character choice name
	value: string | number; // Integer, or double *	Value for the choice, up to 100 characters if string
};

export enum CommandIntegrationType {
	GUILD_INSTALL = 0,
	USER_INSTALL = 1,
}

export enum CommandOptionType {
	SUB_COMMAND = 1,
	SUB_COMMAND_GROUP = 2,
	STRING = 3,
	INTEGER = 4,
	BOOLEAN = 5,
	USER = 6,
	CHANNEL = 7,
	ROLE = 8,
	MENTIONABLE = 9,
	NUMBER = 10,
	ATTACHMENT = 11,
}
