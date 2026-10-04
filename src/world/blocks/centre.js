// Town-centre blocks (WP-C2): kasbah (Centro La Medina), cita (Centro Nórdico), plaza (Casa Lola),
// marknad, kyrka (Templo Ecuménico), bensin, guardia. Phase 0 ships stubs.

import { stubBlock } from './stub.js';

export const BUILDERS = {
  kasbah: (f, W) => stubBlock(f, W, { color: 0xd8b48a, name: 'CENTRO LA MEDINA' }),
  cita: (f, W) => stubBlock(f, W, { color: 0xc8c0b0, name: 'CENTRO NÓRDICO' }),
  plaza: (f, W) => stubBlock(f, W, { color: 0xe8d8b0, name: 'PLAZA · CASA LOLA', water: [[0, 0, 7, 7]], signZ: -24 }),
  marknad: (f, W) => stubBlock(f, W, { color: 0xe0b878, name: 'MERCADO' }),
  kyrka: (f, W) => stubBlock(f, W, { color: 0xf4f0e6, name: 'TEMPLO ECUMÉNICO' }),
  bensin: (f, W) => stubBlock(f, W, { color: 0x9a9a96, name: 'GASOLINA' }),
  guardia: (f, W) => {
    stubBlock(f, W, { color: 0xc9a26b, name: 'CASA CUARTEL', signColor: '#e8c050' });
    f.car('guardia', -8, 6, Math.PI, { name: 'guardia1', locked: true });
    f.car('guardia', 8, 6, Math.PI, { name: 'guardia2', locked: true });
  },
};
