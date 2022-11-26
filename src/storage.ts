import { createClient, RedisClientType } from 'redis';
import { Firestore, Timestamp } from '@google-cloud/firestore';
import config from './config.js';

/**
 * OAuth2 inherently requires storing access tokens, refresh tokens, and
 * expiration times to ensure the bot service can continue to make authenticated
 * calls to Fitbit and Discord on behalf of a given user. This file provides two
 * example implementations: one in Redis, and one in Google Cloud Firestore.
 * You can control which provider is used by modifying `config.json`. The
 * valid settings are `redis` and `firestore`.
 */

/**
 * Shared interface for both storage providers.
 */
export interface StorageProvider {
  setData(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  getData<T>(key: string): Promise<T>;
  deleteData(key: string): Promise<void>;
}

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
  ttl?: Timestamp;
}

export async function storeDiscordTokens(userId: string, data: DiscordData) {
  await client.setData(`discord-${userId}`, data);
}

export async function getDiscordTokens(userId: string) {
  const data = await client.getData<DiscordData>(`discord-${userId}`);
  return data;
}

export async function storeFitbitTokens(userId: string, data: FitbitData) {
  await client.setData(`fitbit-${userId}`, data);
}

export async function getFitbitTokens(userId: string) {
  const data = await client.getData<FitbitData>(`fitbit-${userId}`);
  return data;
}

export async function storeStateData(state: string, data: StateData) {
  await client.setData(`state-${state}`, data, 60);
}

export async function getStateData(state: string) {
  const data = await client.getData<StateData>(`state-${state}`);
  return data;
}

export async function deleteDiscordTokens(userId: string) {
  await client.deleteData(`discord-${userId}`);
}

export async function deleteFitbitTokens(userId: string) {
  await client.deleteData(`fitbit-${userId}`);
}

export async function getLinkedFitbitUserId(discordUserId: string) {
  const data = await client.getData<string>(`discord-link-${discordUserId}`);
  return data;
}

export async function setLinkedFitbitUserId(
  discordUserId: string,
  fitbitUserId: string
) {
  await client.setData(`discord-link-${discordUserId}`, fitbitUserId);
}

/**
 * Redis storage provider.  Very nice when developing locally with Redis.
 */
export class RedisClient implements StorageProvider {
  private _client: RedisClientType;

  async getClient() {
    if (!this._client) {
      this._client = createClient();
      this._client.on('error', (err) => {
        console.log('Redis Client Error', err);
      });
      await this._client.connect();
      return this._client;
    }
    if (!this._client.isOpen) {
      await this._client.connect();
    }
    return this._client;
  }

  async setData(key: string, data: unknown, ttlSeconds?: number) {
    const client = await this.getClient();
    const options = ttlSeconds ? { EX: ttlSeconds } : undefined;
    await client.set(key, JSON.stringify(data), options);
  }

  async getData<T>(key: string) {
    const client = await this.getClient();
    const data = await client.get(key);
    return JSON.parse(data) as T;
  }

  async deleteData(key: string) {
    const client = await this.getClient();
    await client.del(key);
  }
}

/**
 * Firestore storage provider.  Requires some work to use locally,
 * but should work automatically from Cloud Run, GKE, etc.  Feel
 * free to write your own provider for a database of your choice :)
 */
export class FirestoreClient implements StorageProvider {
  private db = new Firestore();
  private tbl = this.db.collection('fitbit');

  async setData(key: string, data: unknown, ttlSeconds?: number) {
    if (ttlSeconds) {
      const seconds = Math.floor(Date.now() / 1000) + ttlSeconds;
      (data as { ttl: Timestamp }).ttl = new Timestamp(seconds, 0);
    }
    await this.tbl.doc(key).set(data);
  }

  async getData<T>(key: string) {
    const doc = await this.tbl.doc(key).get();
    return doc.data() as T;
  }

  async deleteData(key: string) {
    await this.tbl.doc(key).delete();
  }
}

let client: StorageProvider;
if (config.DATABASE_TYPE === 'firestore') {
  client = new FirestoreClient();
} else {
  client = new RedisClient();
}
