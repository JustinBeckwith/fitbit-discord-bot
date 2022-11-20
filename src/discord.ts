import util from 'util';
import config from './config.js';
import { DiscordData, storeDiscordTokens } from './storage.js';
import { request, GaxiosError } from 'gaxios';

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

export function getOAuthUrl() {
  const url = new URL('https://discord.com/api/oauth2/authorize');
  url.searchParams.set('client_id', config.DISCORD_CLIENT_ID);
  url.searchParams.set('redirect_uri', config.DISCORD_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'role_connections.write identify');
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

export async function getOAuthTokens(code: string) {
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

export async function pushMetadata(
  userId: string,
  data: DiscordData,
  metadata: Record<string, string>
) {
  // GET/PUT /users/@me/applications/:id/role-connection
  const url = `https://discord.com/api/v10/users/@me/applications/${config.DISCORD_CLIENT_ID}/role-connection`;
  const accessToken = await getAccessToken(userId, data);
  const body = {
    platform_name: 'I have no idea what this is',
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

export async function registerMetadataSchema() {
  const url = `https://discord.com/api/v10/applications/${config.DISCORD_CLIENT_ID}/role-connections/metadata`;
  const body = [
    {
      key: 'averagedailysteps',
      name: 'averagedailysteps',
      description: 'Average Daily Steps Greater Than',
      type: 2, // supported types: number_lt=1, number_gt=2, number_eq=3 number_neq=4, datetime_lt=5, datetime_gt=6, boolean_eq=7
    },
    {
      key: 'ambassador',
      name: 'ambassador',
      description: 'Is a Fitbit Ambassador',
      type: 7,
    },
    {
      key: 'membersince',
      name: 'membersince',
      description: 'Has been a member since',
      type: 6,
    },
    {
      key: 'iscoach',
      name: 'iscoach',
      description: 'Is a coach',
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
    await storeDiscordTokens(userId, data);
    return r.data.access_token;
  }
  return data.access_token;
}