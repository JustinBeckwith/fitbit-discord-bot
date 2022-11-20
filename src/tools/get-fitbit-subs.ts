import * as storage from '../storage.js';
import * as fitbit from '../fitbit.js';

/**
 * Fetch the current set of fitbit subscriptions.
 */

const [userId] = process.argv.slice(2);
if (!userId) {
  throw Error('Fitbit UserID required.');
}
const data = await storage.getFitbitTokens(userId);
const subs = await fitbit.listSubscriptions(userId, data);
console.log(subs);
process.exit();
