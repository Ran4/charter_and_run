// Hotel blocks (WP-C1): `flamenco` (Hotel Flamenco + Pepes Bodega) and `suntrip` (Hotel SunTrip).
// Phase 0 ships stubs; landmarks come from landmarks-island.js. Builder signature: fn(f, W, ctx),
// f = Frame at the block centre (yaw 0, local = world offset, local +-31), ctx = { i, j, scene, rnd }.

import { stubBlock } from './stub.js';
import { worldHooks } from '../registry.js';

function hotelFlamenco(f, W) {
  stubBlock(f, W, { color: 0xf4efe6, name: 'HOTEL FLAMENCO', water: [[-3, 7, 10, 6]] });
  f.sign('PEPES BODEGA', 8, 3, -31.2, 5, 1, Math.PI, { bg: '#2f8a4a', fg: '#fff8e6', scale: 0.55, double: true });
  f.car('sedan', -26, 22, Math.PI, { name: 'hyrbil', color: 0xf4f4f0 });
  worldHooks.bodegaLit = (on) => { /* WP-C1: light the PEPES BODEGA sign */ };
}

function hotelSunTrip(f, W) {
  stubBlock(f, W, { color: 0xf2d98a, name: 'HOTEL SUNTRIP', water: [[14, 8, 8, 6]] });
}

export const BUILDERS = { flamenco: hotelFlamenco, suntrip: hotelSunTrip };
