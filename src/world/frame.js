// A local frame: origin + yaw, so lots, blocks and sets can be authored facing one way. Every
// block builder gets one at the block centre (yaw 0, so local = world offset); the cabin uses one
// at x = 3000. Also home to the small reusable world pieces (trees) and the parked-car list.

import { PRIM, mat, signMesh } from '../gfx.js';
import { CURB, landmarks } from './layout.js';
import { box, circle } from './collision.js';
import { placeProp } from './props.js';
import { mulberry32, pick } from '../util.js';

export const parkedCars = [];   // { type, x, z, yaw, color, name, ... } spawned by main after the world is built

let defaultScene = null;
export function setFrameScene(scene) { defaultScene = scene; }

const rnd = mulberry32(20171229);

export class Frame {
  constructor(S, F, ox, oz, yaw = 0, scene = null) {
    this.S = S; this.F = F; this.ox = ox; this.oz = oz; this.yaw = yaw;
    this.c = Math.cos(yaw); this.s = Math.sin(yaw);
    this.scene = scene || defaultScene;
  }
  wx(lx, lz) { return this.ox + lx * this.c + lz * this.s; }
  wz(lx, lz) { return this.oz - lx * this.s + lz * this.c; }
  box(color, lx, y0, lz, w, h, d, ly = 0, G = this.S) { G.boxB(color, this.wx(lx, lz), y0, this.wz(lx, lz), w, h, d, this.yaw + ly); }
  boxC(color, lx, y, lz, w, h, d, ly = 0, rx = 0, rz = 0, G = this.S) { G.box(color, this.wx(lx, lz), y, this.wz(lx, lz), w, h, d, this.yaw + ly, rx, rz); }
  sphere(color, lx, y, lz, sx, sy = sx, sz = sx, ly = 0, G = this.S) { G.sphere(color, this.wx(lx, lz), y, this.wz(lx, lz), sx, sy, sz, 0, this.yaw + ly, 0); }
  cyl(color, lx, y, lz, r, h, n = 12, rx = 0, rz = 0, G = this.S) { G.cyl(color, this.wx(lx, lz), y, this.wz(lx, lz), r, h, n, rx, this.yaw, rz); }
  cone(color, lx, y, lz, r, h, n = 12, G = this.S) { G.cone(color, this.wx(lx, lz), y, this.wz(lx, lz), r, h, n); }
  ico(color, lx, y, lz, s, G = this.S) { G.ico(color, this.wx(lx, lz), y, this.wz(lx, lz), s, 1, rnd() * 6); }
  roof(color, lx, y0, lz, w, h, d, ly = 0) { this.S.add(PRIM.prism(), color, mat(this.wx(lx, lz), y0, this.wz(lx, lz), 0, this.yaw + ly, 0, w, h, d)); }
  flat(color, lx, lz, w, d, y = CURB + 0.02, ly = 0) { this.F.box(color, this.wx(lx, lz), y - 0.03, this.wz(lx, lz), w, 0.06, d, this.yaw + ly); }
  // Axis-aligned collider from a local rectangle (frame yaw must be a multiple of 90 degrees).
  solid(lx, lz, w, d, top = 99, kind = 'building', ly = 0) {
    const turned = Math.abs(Math.sin(this.yaw + ly)) > 0.7;
    const hw = (turned ? d : w) / 2, hd = (turned ? w : d) / 2;
    const x = this.wx(lx, lz), z = this.wz(lx, lz);
    return box(x - hw, z - hd, x + hw, z + hd, top, kind);
  }
  circ(lx, lz, r, top = 99, kind = 'solid') { return circle(this.wx(lx, lz), this.wz(lx, lz), r, top, kind); }
  prop(type, lx, lz, ly = 0, baseY = CURB) { placeProp(type, this.wx(lx, lz), this.wz(lx, lz), this.yaw + ly, baseY); }
  // Landmark: yaw = the direction a person standing there faces; y (optional) = absolute height
  // for collectible spots on roofs.
  mark(name, lx, lz, ly = 0, y) {
    const l = { x: this.wx(lx, lz), z: this.wz(lx, lz), yaw: this.yaw + ly };
    if (y !== undefined) l.y = y;
    landmarks[name] = l;
    return l;
  }
  car(type, lx, lz, ly = 0, extra = {}) { parkedCars.push({ type, x: this.wx(lx, lz), z: this.wz(lx, lz), yaw: this.yaw + ly, ...extra }); }
  sign(text, lx, y, lz, w, h, ly = 0, opts = {}) {
    const m = signMesh(text, w, h, opts);
    m.position.set(this.wx(lx, lz), y, this.wz(lx, lz));
    m.rotation.y = this.yaw + ly;
    this.scene?.add(m);
    return m;
  }
  tree(lx, lz, s = 1, kind = 'round') { tree(this.S, this.wx(lx, lz), this.wz(lx, lz), s, kind); }
}

// A tree in world coordinates (trunk collider included). kind: 'round' | 'pine' | 'dead' | 'palm'.
export function tree(G, x, z, s = 1, kind = 'round') {
  const y = CURB;
  if (kind === 'pine') {
    G.cyl(0x6a4528, x, y + 0.8 * s, z, 0.2 * s, 1.6 * s, 7);
    const g = pick([0x3f8a4a, 0x4a9a52, 0x3a7a46], rnd);
    for (let k = 0; k < 3; k++) G.cone(g, x, y + (2.2 + k * 1.5) * s, z, (2.2 - k * 0.55) * s, 2.6 * s, 9);
  } else if (kind === 'dead') {
    G.cyl(0x4a3a30, x, y + 1.6 * s, z, 0.2 * s, 3.2 * s, 6);
    G.cyl(0x4a3a30, x + 0.5 * s, y + 3 * s, z, 0.08 * s, 1.6 * s, 5, 0, 0, -0.7);
    G.cyl(0x4a3a30, x - 0.4 * s, y + 2.6 * s, z + 0.2, 0.07 * s, 1.4 * s, 5, 0.3, 0, 0.8);
  } else if (kind === 'palm') {
    G.cyl(0x8a6a4a, x, y + 3 * s, z, 0.22 * s, 6 * s, 7);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      G.box(0x3f7a3a, x + Math.cos(a) * 1.3 * s, y + 5.9 * s, z + Math.sin(a) * 1.3 * s, 2.8 * s, 0.12 * s, 0.7 * s, -a, 0, -0.35);
    }
  } else {
    G.cyl(0x7a5232, x, y + 1.3 * s, z, 0.24 * s, 2.6 * s, 7);
    const g1 = pick([0x5aa84a, 0x66b552, 0x4f9e48, 0x78b84e], rnd), g2 = pick([0x6cbf55, 0x5fae4c, 0x84c45a], rnd);
    G.ico(g1, x, y + 3.6 * s, z, 3.6 * s, 1, rnd() * 6);
    G.ico(g2, x + 0.9 * s, y + 4.4 * s, z - 0.5 * s, 2.6 * s, 1, rnd() * 6);
    G.ico(g2, x - 0.8 * s, y + 4.0 * s, z + 0.6 * s, 2.4 * s, 1, rnd() * 6);
  }
  circle(x, z, 0.32 * s, 99, 'tree');
}
