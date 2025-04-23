import type { KVNamespace } from '@cloudflare/workers-types';

export type Env = {
	DISCORD_TOKEN: string;
	DISCORD_CLIENT_ID: string;
	DISCORD_CLIENT_SECRET: string;
	DISCORD_PUBLIC_KEY: string;
	DISCORD_REDIRECT_URI: string;
	FITBIT_CLIENT_ID: string;
	FITBIT_CLIENT_SECRET: string;
	FITBIT_REDIRECT_URI: string;
	FITBIT_SUBSCRIBER_VERIFY: string;
	COOKIE_SECRET: string;
	VERIFICATION_URL: string;

	fitbit: KVNamespace;
};
