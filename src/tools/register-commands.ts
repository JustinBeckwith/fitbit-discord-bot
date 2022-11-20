import { DUMP_COMMAND } from '../commands.js';
import config from '../config.js';

/**
 * This file is meant to be run from the command line, and is not used by the
 * application server.  It's allowed to use node.js primitives, and only needs
 * to be run once.
 */

if (!config.DISCORD_TOKEN) {
  throw new Error('The DISCORD_TOKEN environment variable is required.');
}
if (!config.DISCORD_CLIENT_ID) {
  throw new Error('The DISCORD_CLIENT_ID environment variable is required.');
}

/**
 * Register all commands with a specific guild/server. Useful during initial
 * development and testing.
 */
export async function registerGuildCommands() {
  if (!config.DISCORD_TEST_GUILD_ID) {
    throw new Error(
      'The DISCORD_TEST_GUILD_ID environment variable is required.'
    );
  }
  const url = `https://discord.com/api/v10/applications/${config.DISCORD_CLIENT_ID}/guilds/${config.DISCORD_TEST_GUILD_ID}/commands`;
  const res = await registerCommands(url);
  const json = await res.json();
  console.log(json);
  json.forEach(async (cmd) => {
    const response = await fetch(
      `https://discord.com/api/v10/applications/${config.DISCORD_CLIENT_ID}/guilds/${config.DISCORD_TEST_GUILD_ID}/commands/${cmd.id}`
    );
    if (!response.ok) {
      console.error(`Problem removing command ${cmd.id}`);
    }
  });
}

/**
 * Register all commands globally.  This can take o(minutes), so wait until
 * you're sure these are the commands you want.
 */
async function registerGlobalCommands() {
  const url = `https://discord.com/api/v10/applications/${config.DISCORD_CLIENT_ID}/commands`;
  await registerCommands(url);
}

async function registerCommands(url) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${config.DISCORD_TOKEN}`,
    },
    method: 'PUT',
    body: JSON.stringify([DUMP_COMMAND]),
  });

  if (response.ok) {
    console.log('Registered all commands');
  } else {
    console.error('Error registering commands');
    const text = await response.text();
    console.error(text);
  }
  return response;
}

await registerGlobalCommands();
// await registerGuildCommands();
