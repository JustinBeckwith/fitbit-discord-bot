import { createClient, RedisClientType } from 'redis';
import { Firestore, Timestamp } from '@google-cloud/firestore';
import config from './config.js';

export interface StorageProvider {
  storeDiscordTokens(userId: string, data: DiscordData): Promise<void>;
  getDiscordTokens(userId: string): Promise<DiscordData>;
  storeFitbitTokens(userId: string, data: FitbitData);
  getFitbitTokens(userId: string): Promise<FitbitData>;
  storeDiscordStateData(state: string, data: StateData): Promise<void>;
  getDiscordStateData(state: string): Promise<StateData>;
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

  async storeDiscordTokens(userId: string, data: DiscordData) {
    const client = await this.getClient();
    await client.set(`discord-${userId}`, JSON.stringify(data));
  }

  async getDiscordTokens(userId: string) {
    const client = await this.getClient();
    const data = await client.get(`discord-${userId}`);
    return JSON.parse(data) as DiscordData;
  }

  async storeFitbitTokens(userId: string, data: FitbitData) {
    const client = await this.getClient();
    await client.set(`fitbit-${userId}`, JSON.stringify(data));
  }

  async getFitbitTokens(userId: string) {
    const client = await this.getClient();
    const data = await client.get(`fitbit-${userId}`);
    return JSON.parse(data) as FitbitData;
  }

  async storeDiscordStateData(state: string, data: StateData) {
    const client = await this.getClient();
    await client.set(`state-${state}`, JSON.stringify(data), { EX: 60 });
  }

  async getDiscordStateData(state: string) {
    const client = await this.getClient();
    const data = await client.get(`state-${state}`);
    return JSON.parse(data) as StateData;
  }
}

export class FirestoreClient implements StorageProvider {
  private db = new Firestore();
  private tbl = this.db.collection('fitbit');

  async storeDiscordTokens(userId: string, data: DiscordData) {
    await this.tbl.doc(`discord-${userId}`).set(data);
  }

  async getDiscordTokens(userId: string) {
    const doc = await this.tbl.doc(`discord-${userId}`).get();
    return doc.data() as DiscordData;
  }

  async storeFitbitTokens(userId: string, data: FitbitData) {
    await this.tbl.doc(`fitbit-${userId}`).set(data);
  }

  async getFitbitTokens(userId: string) {
    const doc = await this.tbl.doc(`fitbit-${userId}`).get();
    return doc.data() as FitbitData;
  }

  async storeDiscordStateData(state: string, data: StateData) {
    // configure the TTL for an hour
    const seconds = Math.floor(Date.now() / 1000 + 60 * 60);
    data.ttl = new Timestamp(seconds, 0);
    await this.tbl.doc(`state-${state}`).set(data);
  }

  async getDiscordStateData(state: string) {
    const doc = await this.tbl.doc(`state-${state}`).get();
    return doc.data() as StateData;
  }
}

let client: StorageProvider;
if (config.DATABASE_TYPE === 'firestore') {
  client = new FirestoreClient();
} else {
  client = new RedisClient();
}

export default client;
