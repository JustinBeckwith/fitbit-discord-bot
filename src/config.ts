import nconf from 'nconf';
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
};

export default config;
