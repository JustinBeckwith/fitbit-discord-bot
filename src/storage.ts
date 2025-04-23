import type { Env } from './config.js';

/**
 * OAuth2 inherently requires storing access tokens, refresh tokens, and
 * expiration times to ensure the bot service can continue to make authenticated
 * calls to Fitbit and Discord on behalf of a given user.
 */

export interface DiscordData {
	access_token: string;
	expires_at: number;
	refresh_token: string;
}

export interface FitbitData {
	code_verifier: string;
	access_token: string;
	expires_at: number;
	refresh_token: string;
	discord_user_id: string;
}

interface StateData {
	codeVerifier: string;
	discordUserId: string;
	ttl?: number;
}

export async function storeDiscordTokens(
	env: Env,
	userId: string,
	data: DiscordData,
) {
	await env.fitbit.put(`discord-${userId}`, JSON.stringify(data));
}

export async function getDiscordTokens(env: Env, userId: string) {
	const data = await env.fitbit.get<DiscordData>(`discord-${userId}`, 'json');
	return data;
}

export async function storeFitbitTokens(
	env: Env,
	userId: string,
	data: FitbitData,
) {
	await env.fitbit.put(`fitbit-${userId}`, JSON.stringify(data));
}

export async function getFitbitTokens(env: Env, userId: string) {
	const data = await env.fitbit.get<FitbitData>(`fitbit-${userId}`, 'json');
	return data;
}

export async function storeStateData(env: Env, state: string, data: StateData) {
	await env.fitbit.put(`state-${state}`, JSON.stringify(data), {
		expirationTtl: 60,
	});
}

export async function getStateData(env: Env, state: string) {
	const data = await env.fitbit.get<StateData>(`state-${state}`, 'json');
	return data;
}

export async function deleteDiscordTokens(env: Env, userId: string) {
	await env.fitbit.delete(`discord-${userId}`);
}

export async function deleteFitbitTokens(env: Env, userId: string) {
	await env.fitbit.delete(`fitbit-${userId}`);
}

export async function getLinkedFitbitUserId(env: Env, discordUserId: string) {
	const data = await env.fitbit.get<string>(`discord-link-${discordUserId}`);
	return data;
}

export async function setLinkedFitbitUserId(
	env: Env,
	discordUserId: string,
	fitbitUserId: string,
) {
	await env.fitbit.put(`discord-link-${discordUserId}`, fitbitUserId);
}

export async function deleteLinkedFitbitUser(env: Env, discordUserId: string) {
	await env.fitbit.delete(`discord-link-${discordUserId}`);
}
