import express from 'express';
import bodyParser from 'body-parser';
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

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
  console.log('sayin hello!');
  res.send('👋');
});

app.post(
  '/',
  verifyKeyMiddleware(config.DISCORD_PUBLIC_KEY),
  async (request, response) => {
    const message = request.body;
    console.log(message);
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
            type: 4,
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

app.get('/verified-role', async (req, res) => {
  const url = discord.getOAuthUrl();
  res.redirect(url);
});

app.get('/discord-oauth-callback', async (req, res) => {
  const code = req.query['code'] as string;
  const tokens = await discord.getOAuthTokens(code);
  const meData = await discord.getUserData(tokens);
  const userId = meData.user.id;
  await storage.storeDiscordTokens(userId, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  });

  // start the fitbit OAuth2 flow
  const { url, codeVerifier, state } = fitbit.getOAuthUrl();
  await storage.storeDiscordStateData(state, {
    discordUserId: userId,
    codeVerifier,
  });

  res.redirect(url);
});

app.get('/fitbit-oauth-callback', async (req, res) => {
  const code = req.query['code'] as string;
  const state = req.query['state'] as string;
  const { discordUserId, codeVerifier } = await storage.getDiscordStateData(
    state
  );
  const tokens = await fitbit.getOAuthTokens(code, codeVerifier);
  const userId = tokens.user_id;
  const data = {
    discord_user_id: discordUserId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    code_verifier: codeVerifier,
  };
  await storage.storeFitbitTokens(userId, data);
  await fitbit.createSubscription(userId, data);
  res.send('You did it!  Now go back to Discord.');
});

// Verify subscriber as explained in:
// https://dev.fitbit.com/build/reference/web-api/developer-guide/using-subscriptions/#Verifying-a-Subscriber
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

app.post('/fitbit-webhook', async (req, res) => {
  const body = req.body as fitbit.WebhookBody;
  const userId = body.ownerId;
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
  await discord.pushMetadata(userId, discordTokens, metadata);
  res.sendStatus(204);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
