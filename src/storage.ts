import { createClient, RedisClientType } from 'redis';

let _client: RedisClientType;

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
}

async function getClient() {
  if (!_client) {
    _client = createClient();
    _client.on('error', (err) => {
      console.log('Redis Client Error', err);
    });
    await _client.connect();
    return _client;
  }
  if (!_client.isOpen) {
    await _client.connect();
  }
  return _client;
}

export async function storeDiscordTokens(userId: string, data: DiscordData) {
  const client = await getClient();
  await client.set(`discord-${userId}`, JSON.stringify(data));
}

export async function getDiscordTokens(userId: string) {
  const client = await getClient();
  const data = await client.get(`discord-${userId}`);
  return JSON.parse(data) as DiscordData;
}

export async function storeFitbitTokens(userId: string, data: FitbitData) {
  const client = await getClient();
  await client.set(`fitbit-${userId}`, JSON.stringify(data));
}

export async function getFitbitTokens(userId: string) {
  const client = await getClient();
  const data = await client.get(`fitbit-${userId}`);
  return JSON.parse(data) as FitbitData;
}

export async function storeDiscordStateData(state: string, data: StateData) {
  const client = await getClient();
  await client.set(`state-${state}`, JSON.stringify(data), { EX: 60 });
}

export async function getDiscordStateData(state: string) {
  const client = await getClient();
  const data = await client.get(`state-${state}`);
  return JSON.parse(data) as StateData;
}
