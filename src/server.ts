import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from 'discord-interactions';
import storage from './storage.js';
import { DUMP_COMMAND } from './commands.js';
import config from './config.js';
import * as fitbit from './fitbit.js';
import * as discord from './discord.js';
import { updateMetadata } from './common.js';

/**
 * Main HTTP server used for the bot.
 */

const app = express();
app.use(bodyParser.json());
app.use(cookieParser(config.COOKIE_SECRET));

app.get('/', (req, res) => {
  // Just a happy little route to show our server is up.
  res.send('👋');
});

/**
 * Main entry point for bot slash commands. It uses the `verifyKeyMiddleware`
 * to validate request signatures, and returns relevent slash command data.
 */
app.post(
  '/',
  verifyKeyMiddleware(config.DISCORD_PUBLIC_KEY),
  async (request, response) => {
    const message = request.body;
    if (message.type === InteractionType.PING) {
      console.log('Handling Ping request');
      response.json({
        type: InteractionResponseType.PONG,
      });
    } else if (message.type === InteractionType.APPLICATION_COMMAND) {
      console.log(`Handling application command: ${message.data.name}`);
      switch (message.data.name.toLowerCase()) {
        case DUMP_COMMAND.name.toLowerCase(): {
          const dump = await fitbit.getDump();
          response.status(200).send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: dump,
            },
          });
          break;
        }
        default:
          console.error('Unknown Command');
          response.status(400).send({ error: 'Unknown Type' });
          break;
      }
    } else {
      console.error('Unknown Type');
      response.status(400).send({ error: 'Unknown Type' });
    }
  }
);

/**
 * Route configured in the Discord developer console which facilitates the
 * connection between Discord and Fitbit. To start the flow, generate the OAuth2
 * consent dialog url for Discord, and send the user there.
 */
app.get('/verified-role', async (req, res) => {
  const { url, state } = discord.getOAuthUrl();
  res.cookie('clientState', state, { maxAge: 1000 * 60 * 5, signed: true });
  res.redirect(url);
});

/**
 * Route configured in the Discord developer console, the redirect Url to which
 * the user is sent after approving the bot for their Discord account. This
 * completes a few steps:
 * 1. Uses the code to acquire Discord OAuth2 tokens
 * 2. Uses the Discord Access Token to fetch the user profile
 * 3. Stores the OAuth2 Discord Tokens in Redis / Firestore
 * 4. Generates an OAuth2 consent dialog url for Fitbit, and redirects the user.
 */
app.get('/discord-oauth-callback', async (req, res) => {
  try {
    // 1. Uses the code and state to acquire Discord OAuth2 tokens
    const code = req.query['code'] as string;
    const discordState = req.query['state'] as string;

    // make sure the state parameter exists
    const { clientState } = req.signedCookies;
    if (clientState !== discordState) {
      console.error('State verification failed.');
      return res.sendStatus(403);
    }

    const tokens = await discord.getOAuthTokens(code);

    // 2. Uses the Discord Access Token to fetch the user profile
    const meData = await discord.getUserData(tokens);
    const userId = meData.user.id;
    await storage.storeDiscordTokens(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    });

    // start the fitbit OAuth2 flow by generating a new OAuth2 Url
    const { url, codeVerifier, state } = fitbit.getOAuthUrl();

    // store the code verifier and state arguments required by the fitbit url
    await storage.storeStateData(state, {
      discordUserId: userId,
      codeVerifier,
    });

    // send the user to the fitbit OAuth2 consent dialog screen
    res.redirect(url);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

/**
 * Route configured in the Fitbit developer console, the redirect Url to which
 * the user is sent after approvingv the bot for their Fitbit account.
 * 1. Use the state in the querystring to fetch the code verifier and challenge
 * 2. Use the code in the querystring to acquire Fitbit OAuth2 tokens
 * 3. Store the Fitbit tokens in redis / Firestore
 * 4. Create a new subscription to ensure webhook events are sent for the current user
 * 5. Fetch Fitbit profile metadata, and push it to the Discord metadata service
 */
app.get('/fitbit-oauth-callback', async (req, res) => {
  try {
    // 1. Use the state in the querystring to fetch the code verifier and challenge
    const state = req.query['state'] as string;
    const { discordUserId, codeVerifier } = await storage.getStateData(state);

    // 2. Use the code in the querystring to acquire Fitbit OAuth2 tokens
    const code = req.query['code'] as string;
    const tokens = await fitbit.getOAuthTokens(code, codeVerifier);

    // 3. Store the Fitbit tokens in redis / Firestore
    const userId = tokens.user_id;
    const data = {
      discord_user_id: discordUserId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      code_verifier: codeVerifier,
    };
    await storage.storeFitbitTokens(userId, data);

    // 4. Create a new subscription to ensure webhook events are sent for the current user
    await fitbit.createSubscription(userId, data);

    // 5. Fetch Fitbit profile metadata, and push it to the Discord metadata service
    await updateMetadata(userId);

    res.send('You did it!  Now go back to Discord.');
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

/**
 * Route configured in the Fitbit developer console, the route where user
 * events are sent. This is used once for url verification by the Fitbit API.
 * Note: this is a `GET`, and the actual webhook is a `POST`
 * Verify subscriber as explained in:
 * https://dev.fitbit.com/build/reference/web-api/developer-guide/using-subscriptions/#Verifying-a-Subscriber
 */
app.get('/fitbit-webhook', async (req, res) => {
  const verify = req.query['verify'] as string;
  console.log(req.url);
  if (verify === config.FITBIT_SUBSCRIBER_VERIFY) {
    console.log(`verified: ${verify}`);
    res.sendStatus(204);
  } else {
    res.sendStatus(404);
  }
});

/**
 * Route configured in the Fitbit developer console, the route where user events are sent.
 * Takes a few steps:
 * 1. Fetch the Discord and Fitbit tokens from storage (redis / firestore)
 * 2. Fetch the user profile data from Fitbit and send it to Discord
 */
app.post('/fitbit-webhook', async (req, res) => {
  try {
    const body = req.body as fitbit.WebhookBody;

    // 1. Fetch the Discord and Fitbit tokens from storage (redis / firestore)
    const userId = body.ownerId;
    await updateMetadata(userId);

    // 2. Fetch the user profile data from Fitbit, and push it to Discord
    res.sendStatus(204);
  } catch (e) {
    res.sendStatus(500);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
