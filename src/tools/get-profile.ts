import * as fitbit from '../fitbit.js';
import * as storage from '../storage.js';
import 'dotenv/config';
import type { Env } from '../config.js';

/**
 * Fetch the current user profile for fitbitty.
 */

const [userId] = process.argv.slice(2);
if (!userId) {
	throw Error('Fitbit UserID required.');
}
const data = await storage.getFitbitTokens(
	process.env as unknown as Env,
	userId,
);
const profile = await fitbit.getProfile(
	userId,
	data,
	process.env as unknown as Env,
);
console.log(profile);
