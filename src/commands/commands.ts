/**
 * Share command metadata from a common spot to be used for both runtime
 * and registration.
 */

import type { Command } from '../discord-types.js';

import { cmd as connect } from './connect.js';
import { cmd as disconnect } from './disconnect.js';
import { cmd as getProfile } from './get-profile.js';
import { cmd as help } from './help.js';

export const commands: Command[] = [connect, disconnect, getProfile, help];
