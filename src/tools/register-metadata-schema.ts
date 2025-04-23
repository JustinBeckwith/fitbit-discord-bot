import { registerMetadataSchema } from '../discord.js';
import 'dotenv/config';
import type { Env } from '../config.js';

const schema = await registerMetadataSchema(process.env as unknown as Env);
console.log('Metadata schema set.');
console.log(schema);
