import dotenv from 'dotenv';
dotenv.config({ path: '.dev.vars' });

/**
 * Register the metadata to be stored by Discord. This should be a one time action.
 * Note: uses a Bot token for authentication, not a user token.
 */
const url = `https://discord.com/api/v10/applications/${process.env.DISCORD_CLIENT_ID}/role-connections/metadata`;
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

const res = await fetch(url, {
	method: 'PUT',
	body: JSON.stringify(body),
	headers: {
		'Content-Type': 'application/json',
		Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
	},
});

if (!res.ok) {
	console.error('Failed to register metadata schema');
	console.error(await res.text());
	process.exit(1);
}

const schema = await res.json();
console.log(schema);
