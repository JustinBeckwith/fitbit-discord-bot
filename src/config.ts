import 'dotenv/config';

/**
 * Parse configuration data from either environment variables, command line
 * arguments, or a local file.  The local file containing the actual
 * configuration should not be checked into source control.
 */

const config = {
	DISCORD_TOKEN: process.env.DISCORD_TOKEN as string,
	DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID as string,
	DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET as string,
	DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY as string,
	DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI as string,
	FITBIT_CLIENT_ID: process.env.FITBIT_CLIENT_ID as string,
	FITBIT_CLIENT_SECRET: process.env.FITBIT_CLIENT_SECRET as string,
	FITBIT_REDIRECT_URI: process.env.FITBIT_REDIRECT_URI as string,
	FITBIT_SUBSCRIBER_VERIFY: process.env.FITBIT_SUBSCRIBER_VERIFY as string,
	DATABASE_TYPE: process.env.DATABASE_TYPE as string,
	COOKIE_SECRET: process.env.COOKIE_SECRET as string,
	VERIFICATION_URL: process.env.VERIFICATION_URL as string,
};

if (!config.DISCORD_TOKEN) {
	throw new Error('The DISCORD_TOKEN environment variable is required.');
}

if (!config.DISCORD_CLIENT_ID) {
	throw new Error('The DISCORD_CLIENT_ID environment variable is required.');
}

export default config;
