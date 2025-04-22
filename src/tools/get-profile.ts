import * as fitbit from '../fitbit.js';
import * as storage from '../storage.js';

/**
 * Fetch the current user profile for fitbitty.
 */

const [userId] = process.argv.slice(2);
if (!userId) {
	throw Error('Fitbit UserID required.');
}
const data = await storage.getFitbitTokens(userId);
const profile = await fitbit.getProfile(userId, data);
console.log(profile);
