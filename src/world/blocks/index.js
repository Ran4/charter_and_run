// BLOCK_BUILDERS: every MAP type -> builder(f, W, ctx). Merged from the per-owner block files.
// `bungalowR` and `lagenhet` are built by town.js's residential(); unknown types get an empty slab.

import { BUILDERS as HOTELS } from './hotels.js';
import { BUILDERS as CENTRE } from './centre.js';
import { BUILDERS as NATURE } from './nature.js';
import { BUILDERS as COAST } from './coast.js';

export const BLOCK_BUILDERS = { ...HOTELS, ...CENTRE, ...NATURE, ...COAST };
