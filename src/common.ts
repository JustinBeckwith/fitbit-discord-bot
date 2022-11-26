import * as storage from './storage.js';
import * as fitbit from './fitbit.js';
import * as discord from './discord.js';

/**
 * Shared utility function. For a given Fitbit UserId, fetch profile metadata,
 * transform it, and push it to the Discord metadata endpoint.
 */
export async function updateMetadata(userId: string) {
  const fitbitTokens = await storage.getFitbitTokens(userId);
  const discordTokens = await storage.getDiscordTokens(
    fitbitTokens.discord_user_id
  );

  // Fetch the user profile data from Fitbit
  let metadata: Record<string, string>;
  try {
    const profile = await fitbit.getProfile(userId, fitbitTokens);
    // Transform the data from the profile, and grab only the bits of data used by Discord.
    metadata = {
      averagedailysteps: profile.user.averageDailySteps,
      ambassador: profile.user.ambassador,
      membersince: profile.user.memberSince,
      iscoach: profile.user.isCoach,
    };
  } catch (e) {
    e.message = `Error fetching Fitbit profile data: ${e.message}`;
    console.error(e);
    // If fetching the profile data for the Fitbit user fails for any reason,
    // ensure metadata on the Discord side is nulled out. This prevents cases
    // where the user revokes the Fitbit app permissions, and is left with
    // stale verified role data.
    metadata = {
      averagedailysteps: undefined,
      ambassador: undefined,
      membersince: undefined,
      iscoach: undefined,
    };
  }

  // Push the data to Discord.
  await discord.pushMetadata(userId, discordTokens, metadata);
}
