// Stage kinds, part 3 (DESIGN §9.2): haggle smash. Frozen after Phase 0 (owner none). Phase 0a
// ships stubs that throw; Phase 0b implements every option.

import { common } from './core.js';

const todo = (kind) => (o = {}) => common(o, {
  text: o.text || kind,
  init() { throw new Error(`stage kind '${kind}' is not implemented yet (Phase 0b)`); },
  target() { return null; },
  update() {},
});

export const haggle = todo('haggle');
export const smash = todo('smash');
