import { updateMetadata } from '../common.js';
import 'dotenv/config';
import type { Env } from '../config.js';

/**
 * Fetch the current user profile for fitbitty.
 */

const [userId] = process.argv.slice(2);
if (!userId) {
	throw Error('Fitbit UserID required.');
}
await updateMetadata(userId, process.env as unknown as Env);

console.log('Metadata pushed!');
