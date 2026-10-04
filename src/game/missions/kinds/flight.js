// Stage kinds, part 2 (DESIGN §9.2): collect sit interact carry mantra timeline. Frozen after
// Phase 0 (owner none). Phase 0a ships stubs that throw; Phase 0b implements every option.

import { common } from './core.js';

const todo = (kind) => (o = {}) => common(o, {
  text: o.text || kind,
  init() { throw new Error(`stage kind '${kind}' is not implemented yet (Phase 0b)`); },
  target() { return null; },
  update() {},
});

export const collect = todo('collect');
export const sit = todo('sit');
export const interact = todo('interact');
export const carry = todo('carry');
export const mantra = todo('mantra');
export const timeline = todo('timeline');
