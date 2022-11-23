import { updateMetadata } from '../common.js';

/**
 * Fetch the current user profile for fitbitty.
 */

const [userId] = process.argv.slice(2);
if (!userId) {
  throw Error('Fitbit UserID required.');
}
await updateMetadata(userId);

console.log('Metadata pushed!');
