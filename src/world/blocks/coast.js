// Coast blocks (WP-D2): flygplats (Gando, with the parked DC-8 outside the bound wall), dromplan,
// fyren, playa, hamn. Phase 0 ships stubs.

import { stubBlock } from './stub.js';

export const BUILDERS = {
  flygplats: (f, W) => {
    stubBlock(f, W, { color: 0xa8a8a0, name: 'AEROPUERTO DE GANDO' });
    f.car('bus', 16, 24, -Math.PI / 2, { name: 'buss17', color: 0xf4f4f0 });
    f.car('taxi', -16, 24, -Math.PI / 2, { name: 'taxiAirport', locked: true });
  },
  dromplan: (f, W) => stubBlock(f, W, { color: 0xb8a07a, name: 'AERÓDROMO' }),
  fyren: (f, W) => stubBlock(f, W, { color: 0xe8cf98, name: 'FARO DE MASPALOMAS' }),
  playa: (f, W) => stubBlock(f, W, { color: 0xe8cf98, name: '' }),
  hamn: (f, W) => stubBlock(f, W, { color: 0xd8d3c6, name: 'PUERTO', water: [[-8, 10, 14, 10]] }),
};
