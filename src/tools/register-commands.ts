import { request } from 'gaxios';
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
  const json = await registerCommands(url);
  console.log(json);
  json.forEach(async (cmd) => {
    await request({
      url: `https://discord.com/api/v10/applications/${config.DISCORD_CLIENT_ID}/guilds/${config.DISCORD_TEST_GUILD_ID}/commands/${cmd.id}`,
    });
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

type CommandsResponse = [
  {
    id: string;
  }
];

async function registerCommands(url) {
  const res = await request<CommandsResponse>({
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${config.DISCORD_TOKEN}`,
    },
    method: 'PUT',
    body: JSON.stringify([DUMP_COMMAND]),
  });
  console.log('Registered all commands');
  return res.data;
}

await registerGlobalCommands();
// await registerGuildCommands();
