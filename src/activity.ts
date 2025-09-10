import type { Env } from './config';
import * as fitbit from './fitbit';
import * as storage from './storage';

export async function updateActivity(
	userId: string,
	_event: fitbit.WebhookBody,
	env: Env,
) {
	// Get the user's Fitbit data
	const fitbitData = await storage.getFitbitTokens(env, userId);
	if (!fitbitData) {
		console.error(`No Fitbit data found for user ${userId}`);
		return;
	}

	// Get recent activities
	const activities = await fitbit.getRecentActivities(userId, fitbitData, env);

	// Process the activities
	for (const activity of activities) {
		console.log(JSON.stringify(activity, null, 2));
	}
}
