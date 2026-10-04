// The story script for the flight missions, M[0..4] (DESIGN §16.3). Owner: WP-F.
// Phase 0a: generic placeholders that hop to each goto destination.
import { generic } from './common.mjs';

export const M_FLIGHT = [0, 1, 2, 3, 4].map(generic);
