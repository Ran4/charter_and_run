// Phase-0 placeholder look shared by the stub block builders: a flat coloured slab, a sign with the
// block name, shallow water slabs where the block has a pool / fountain / pond, and a few markers.
// Owner: none. Delete once every block file has its real builders.

import { CURB } from '../layout.js';
import { box } from '../collision.js';

// opts: { color, name, water: [[lx, lz, w, d], ...], signZ }
export function stubBlock(f, W, { color = 0xd8d3c6, name = '', water = [], signZ = -20, signColor = '#f7c31b' } = {}) {
  f.flat(color, 0, 0, W - 2, W - 2, CURB + 0.01);
  for (const [lx, lz, w, d] of water) {
    f.flat(0xe8e4da, lx, lz, w + 1.2, d + 1.2, CURB + 0.015);
    f.flat(0x1c7fb8, lx, lz, w, d, CURB + 0.025);
    // A walkable shallow pool: a floor at CURB, kind 'water' (blue on the minimap).
    const x = f.wx(lx, lz), z = f.wz(lx, lz);
    box(x - w / 2, z - d / 2, x + w / 2, z + d / 2, CURB, 'water');
  }
  if (name) {
    f.box(0x6a4528, -2.2, CURB, signZ, 0.25, 3.2, 0.25);
    f.box(0x6a4528, 2.2, CURB, signZ, 0.25, 3.2, 0.25);
    f.sign(name, 0, CURB + 3.6, signZ, 7, 1.4, 0, { bg: signColor, fg: '#1d1426', scale: 0.5, double: true });
  }
}
