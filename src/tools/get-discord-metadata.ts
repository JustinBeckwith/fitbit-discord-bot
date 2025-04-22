import * as discord from '../discord.js';
import * as storage from '../storage.js';

/**
 * Fetch the current weight metadata.
 */

const [userId] = process.argv.slice(2);
if (!userId) {
	throw Error('Discord UserID required.');
}

const discordTokens = await storage.getDiscordTokens(userId);
const metadata = await discord.getMetadata(userId, discordTokens);
console.log(metadata);
process.exit();
