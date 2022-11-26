import util from 'util';
import crypto from 'crypto';
import config from './config.js';
import storage, { DiscordData } from './storage.js';
import { request, GaxiosError } from 'gaxios';

/**
 * Code specific to communicating with the Discord API.
 */

export interface OAuth2TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export interface OAuth2UserInfo {
  application: {
    id: string;
    name: string;
    icon: string | null;
    description: string;
    summary: string;
    type: string | null;
    hook: boolean;
    bot_public: boolean;
    bot_require_code_grant: boolean;
    verify_key: string;
    flags: number;
  };
  scopes: string[];
  expires: string;
  user: {
    id: string;
    username: string;
    avatar: string;
    avatar_decoration: string | null;
    discriminator: string;
    public_flags: number;
  };
}

/**
 * The following methods all facilitate OAuth2 communication with Discord.
 * See https://discord.com/developers/docs/topics/oauth2 for more details.
 */

/**
 * Generate the url which the user will be directed to in order to approve the
 * bot, and see the list of requested scopes.
 */
export function getOAuthUrl() {
  const state = crypto.randomUUID();

  const url = new URL('https://discord.com/api/oauth2/authorize');
  url.searchParams.set('client_id', config.DISCORD_CLIENT_ID);
  url.searchParams.set('redirect_uri', config.DISCORD_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'role_connections.write identify');
  url.searchParams.set('prompt', 'consent');
  return { state, url: url.toString() };
}

/**
 * Given an OAuth2 code from the scope approval page, make a request to Discord's
 * OAuth2 service to retreive an access token, refresh token, and expiration.
 */
export async function getOAuthTokens(
  code: string
): Promise<OAuth2TokenResponse> {
  const url = 'https://discord.com/api/v10/oauth2/token';
  const data = new URLSearchParams({
    client_id: config.DISCORD_CLIENT_ID,
    client_secret: config.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.DISCORD_REDIRECT_URI,
  });

  const r = await request<OAuth2TokenResponse>({
    url,
    body: data,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return r.data;
}

/**
 * The initial token request comes with both an access token and a refresh
 * token.  Check if the access token has expired, and if it has, use the
 * refresh token to acquire a new, fresh access token.
 */
export async function getAccessToken(userId: string, data: DiscordData) {
  if (Date.now() > data.expires_at) {
    const url = 'https://discord.com/api/v10/oauth2/token';
    const body = new URLSearchParams({
      client_id: config.DISCORD_CLIENT_ID,
      client_secret: config.DISCORD_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
    });
    const r = await request<OAuth2TokenResponse>({
      url,
      body,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    console.log(`new discord access token: ${r.data.access_token}`);
    data.access_token = r.data.access_token;
    data.expires_at = Date.now() + r.data.expires_in * 1000;
    await storage.storeDiscordTokens(userId, data);
    return r.data.access_token;
  }
  return data.access_token;
}

/**
 * Given a user based access token, fetch profile information for the current user.
 */
export async function getUserData(tokens: OAuth2TokenResponse) {
  const url = 'https://discord.com/api/v10/oauth2/@me';
  const res = await request<OAuth2UserInfo>({
    url,
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });
  return res.data;
}

/**
 * Given metadata that matches the schema, push that data to Discord on behalf
 * of the current user.
 */
export async function pushMetadata(
  userId: string,
  data: DiscordData,
  metadata: Record<string, string>
) {
  // GET/PUT /users/@me/applications/:id/role-connection
  const url = `https://discord.com/api/v10/users/@me/applications/${config.DISCORD_CLIENT_ID}/role-connection`;
  const accessToken = await getAccessToken(userId, data);
  const body = {
    platform_name: 'Fitbit Discord Bot',
    metadata,
  };
  try {
    await request({
      url,
      method: 'PUT',
      data: body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    const err = e as GaxiosError;
    console.error(e);
    console.log(util.inspect(err.response?.data, false, 12));
    throw e;
  }
}

/**
 * Fetch the metadata currently pushed to Discord for the currently logged
 * in user, for this specific bot.
 */
export async function getMetadata(userId: string, data: DiscordData) {
  // GET/PUT /users/@me/applications/:id/role-connection
  const url = `https://discord.com/api/v10/users/@me/applications/${config.DISCORD_CLIENT_ID}/role-connection`;
  const accessToken = await getAccessToken(userId, data);
  const res = await request({
    url,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return res.data;
}

/**
 * Register the metadata to be stored by Discord. This should be a one time action.
 * Note: uses a Bot token for authentication, not a user token.
 */
export async function registerMetadataSchema() {
  const url = `https://discord.com/api/v10/applications/${config.DISCORD_CLIENT_ID}/role-connections/metadata`;
  const body = [
    {
      key: 'averagedailysteps',
      name: 'Average Daily Steps',
      description: 'Average Daily Steps Greater Than',
      type: 2, // supported types: number_lt=1, number_gt=2, number_eq=3 number_neq=4, datetime_lt=5, datetime_gt=6, boolean_eq=7
    },
    {
      key: 'ambassador',
      name: 'Fitbit Ambassador',
      description: 'Is a Fitbit Ambassador',
      type: 7,
    },
    {
      key: 'membersince',
      name: 'Member Since',
      description: 'Days since becoming a member',
      type: 6,
    },
    {
      key: 'iscoach',
      name: 'Is Coach',
      description: 'Is a Fitbit coach',
      type: 7,
    },
  ];

  try {
    const res = await request({
      url,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${config.DISCORD_TOKEN}`,
      },
    });
    return res.data;
  } catch (e) {
    const err = e as GaxiosError;
    console.error(e);
    console.log(util.inspect(err.response?.data, false, 12));
    throw e;
  }
}

/**
 * Fetch the metadata schema to be used by Discord for the current bot.
 * Note: uses a Bot token for authentication, not a user token.
 */
export async function getMetadataSchema() {
  const url = `https://discord.com/api/v10/applications/${config.DISCORD_CLIENT_ID}/role-connections/metadata`;
  const res = await request({
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${config.DISCORD_TOKEN}`,
    },
  });
  return res.data;
}
