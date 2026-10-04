// Nature blocks (WP-D1): tomat, grisfest (12 tallrikar on the tables), fataga, golf, bungalow
// (Angerud's show plot), bygge, dyner. Phase 0 ships stubs.

import { stubBlock } from './stub.js';
import { CURB } from '../layout.js';

function grisgard(f, W) {
  stubBlock(f, W, { color: 0xb89a6a, name: 'GRISFEST' });
  // Two long tables with six plate stacks each (the smash stage needs 12 tallrikar, baseY = table top).
  const top = CURB + 0.6;
  for (const z of [-7, 7]) {
    f.box(0x8a5a3a, 0, CURB, z, 26, 0.6, 1.4);
    f.solid(0, z, 26, 1.4, top, 'table');
    for (let k = 0; k < 6; k++) f.prop('tallrikar', -11 + k * 4.4, z, 0, top);
  }
}

export const BUILDERS = {
  tomat: (f, W) => stubBlock(f, W, { color: 0x7aa04a, name: 'TOMATES · EXPORTACIÓN' }),
  grisfest: grisgard,
  fataga: (f, W) => stubBlock(f, W, { color: 0xc9a26b, name: 'FATAGA' }),
  golf: (f, W) => stubBlock(f, W, { color: 0x7cc456, name: 'CAMPO DE GOLF', water: [[-10, -6, 9, 7]] }),
  bungalow: (f, W) => stubBlock(f, W, { color: 0xe8dcc4, name: 'SE VENDE · BUNGALOW', water: [[6, -4, 6, 4]] }),
  bygge: (f, W) => stubBlock(f, W, { color: 0xc09a64, name: 'PRÓXIMAMENTE' }),
  dyner: (f, W) => stubBlock(f, W, { color: 0xe8cf98, name: '' }),
};
