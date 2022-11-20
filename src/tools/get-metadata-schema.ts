import { getMetadataSchema } from '../discord.js';

/**
 * Get the current Discord Metadata schema.
 */

const metadata = await getMetadataSchema();
console.log(metadata);
