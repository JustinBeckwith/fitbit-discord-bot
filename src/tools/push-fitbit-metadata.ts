import storage from '../storage.js';
import * as fitbit from '../fitbit.js';
import * as discord from '../discord.js';

/**
 * Fetch the current user profile for fitbitty.
 */

const [userId] = process.argv.slice(2);
if (!userId) {
  throw Error('Fitbit UserID required.');
}
const fitbitTokens = await storage.getFitbitTokens(userId);
const discordTokens = await storage.getDiscordTokens(
  fitbitTokens.discord_user_id
);
const profile = await fitbit.getProfile(userId, fitbitTokens);
const metadata = {
  averagedailysteps: profile.user.averageDailySteps,
  ambassador: profile.user.ambassador,
  membersince: profile.user.memberSince,
  iscoach: profile.user.isCoach,
};
await discord.pushMetadata(
  fitbitTokens.discord_user_id,
  discordTokens,
  metadata
);
console.log('Metadata pushed!');
