# Tools

This is a collection of tools which make development time easier.  They are meant to be executed from the cmdline. These can be run after cloning and building the repository:

```sh
$ npm run build
$ cd build/src
$ node register-commands.js
```

## Commands

### get-discord-metadata.ts <discord-user-id>

Get the metadata for the current user and this bot from Discord.  This is the data that will be used to verify role memberships and shown on profile badges. 

```sh
$ node get-discord-metadata.ts <discord-user-id>
```

### get-fitbit-subs.ts <fitbit-user-id>

Fetch a list of Fitbit push subscriptions configured for the current user.  There should really only be one of these. 

```sh
$ node get-fitbit-subs.ts <fitbit-user-id>
```

### get-metadata-schema.ts

Get the schema configured in Discord for this verified role bot. 

```sh
$ node get-metadata-schema.ts
```

### get-profile.ts <fitbit-user-id>

Fetch the user profile from Fitbit.

```sh
$ node get-profile.ts <fitbit-user-id>
```

### push-fitbit-metadata.ts <fitbit-user-id>

Fetch the user profile from Fitbit, and then push the transformed metadata to Discord.

```sh
$ node push-fitbit-metadata.ts <fitbit-user-id>
```

### register-commands.ts

Register the slash commands used for this bot. 

```sh
$ node register-commands.ts
```

### register-metadata-schema.ts

Register the metadata schema used by verified roles for this bot.

```sh
$ node register-metadata-schema.ts
```
