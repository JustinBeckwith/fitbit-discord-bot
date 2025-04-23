import 'dotenv/config';
import type { Env } from '../config.js';
import { getMetadataSchema } from '../discord.js';

/**
 * Get the current Discord Metadata schema.
 */

const metadata = await getMetadataSchema(process.env as unknown as Env);
console.log(metadata);
