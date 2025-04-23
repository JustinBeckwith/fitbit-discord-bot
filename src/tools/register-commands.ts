import { DISCONNECT, GET_PROFILE } from '../commands.js';
import 'dotenv/config';

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
	body: JSON.stringify([GET_PROFILE, DISCONNECT]),
});
console.log('Registered all commands');
const data = await res.json();
console.log(data);
