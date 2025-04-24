# Discord Fitbit Verified Role Bot

A Discord bot that verifies users' Fitbit accounts and manages their roles based on their Fitbit profile data. The bot uses Discord's Role Connections feature to automatically update user roles based on their Fitbit profile information.

<img width="343" alt="image" src="https://github.com/user-attachments/assets/3b682886-02da-4618-b681-ab8bb1c295ab" />

## Features

- Connect Discord accounts with Fitbit profiles
- Automatic role updates based on Fitbit profile data:
  - Average daily steps
  - Fitbit Ambassador status
  - Membership duration
  - Coach status
- Slash commands for user interaction
- Secure OAuth2 authentication flow
- Automatic token refresh and management

<img width="593" alt="image" src="https://github.com/user-attachments/assets/2a93a727-6147-41e3-8881-6e9f7d3083e6" />


## Prerequisites

- Node.js 22 or higher
- A Discord application with bot token
- A Fitbit application with API credentials
- Cloudflare Workers account (for deployment)

## Setup

1. Clone this repository:

```bash
git clone https://github.com/JustinBeckwith/fitbit-discord-bot.git
cd fitbit-discord-bot
```

2. Install dependencies:

```bash
npm install
```

3. Rename `example.dev.vars` to `.dev.vars`, and add all required fields.

4. Register the bot's commands and metadata schema:

```bash
npm run register-commands
npm run register-metadata-schema
```

## Development

To run the bot locally:

```bash
npm run dev
```

This will start the development server on port 3000.

## Available Commands

The bot provides the following slash commands:

- `/connect` - Start the process of connecting your Fitbit account
- `/disconnect` - Disconnect your Fitbit account and remove associated roles
- `/get-profile` - View your current Fitbit profile data

## Deployment

The bot is designed to be deployed on Cloudflare Workers. To deploy:

```bash
wrangler deploy
```

## License

[MIT](LICENSE)
