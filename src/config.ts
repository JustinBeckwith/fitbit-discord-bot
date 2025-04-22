import nconf from 'nconf';

/**
 * Parse configuration data from either environment variables, command line
 * arguments, or a local file.  The local file containing the actual
 * configuration should not be checked into source control.
 */

nconf.env().argv().file('config.json');

const config = {
	DISCORD_TOKEN: nconf.get('DISCORD_TOKEN') as string,
	DISCORD_CLIENT_ID: nconf.get('DISCORD_CLIENT_ID') as string,
	DISCORD_CLIENT_SECRET: nconf.get('DISCORD_CLIENT_SECRET') as string,
	DISCORD_TEST_GUILD_ID: nconf.get('DISCORD_TEST_GUILD_ID') as string,
	DISCORD_PUBLIC_KEY: nconf.get('DISCORD_PUBLIC_KEY') as string,
	DISCORD_REDIRECT_URI: nconf.get('DISCORD_REDIRECT_URI') as string,
	FITBIT_CLIENT_ID: nconf.get('FITBIT_CLIENT_ID') as string,
	FITBIT_CLIENT_SECRET: nconf.get('FITBIT_CLIENT_SECRET') as string,
	FITBIT_REDIRECT_URI: nconf.get('FITBIT_REDIRECT_URI') as string,
	FITBIT_SUBSCRIBER_VERIFY: nconf.get('FITBIT_SUBSCRIBER_VERIFY') as string,
	DATABASE_TYPE: nconf.get('DATABASE_TYPE') as string,
	COOKIE_SECRET: nconf.get('COOKIE_SECRET') as string,
	VERIFICATION_URL: nconf.get('VERIFICATION_URL') as string,
};

export default config;
