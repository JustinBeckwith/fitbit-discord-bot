import { registerMetadataSchema } from '../discord.js';
const schema = await registerMetadataSchema();
console.log('Metadata schema set.');
console.log(schema);
