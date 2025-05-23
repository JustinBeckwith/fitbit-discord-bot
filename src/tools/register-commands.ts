import dotenv from 'dotenv';
import { commands } from '../commands/commands.js';
dotenv.config({ path: '.dev.vars' });

/**
 * This file is meant to be run from the command line, and is not used by the
 * application server.  It's allowed to use node.js primitives, and only needs
 * to be run once.
 */

/**
 * Register all commands globally.  This can take o(minutes), so wait until
 * you're sure these are the commands you want.
 */
const url = `https://discord.com/api/v10/applications/${process.env.DISCORD_CLIENT_ID}/commands`;

const res = await fetch(url, {
	headers: {
		'Content-Type': 'application/json',
		Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
	},
	method: 'PUT',
	body: JSON.stringify(commands),
});

if (!res.ok) {
	console.error('Failed to register commands');
	console.error(await res.text());
	process.exit(1);
}

console.log('Registered all commands');
const data = await res.json();
console.log(data);
