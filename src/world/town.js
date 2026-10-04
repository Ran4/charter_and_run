// Builds Bridgeton: streets, houses, the school, the mall, the park... All static geometry is
// merged per block into one outlined toon mesh plus one flat ground mesh.

import { THREE, GeoBuilder, toonMesh, signMesh, MAT, mat, PRIM, makeWedge, textCanvas } from '../gfx.js';
import { P, N, HALF, RHW, SW, CURB, EDGE, BOUND, rc, blockInterior, MAP, landmarks } from './layout.js';
import { box, circle, ramp } from './collision.js';
import { placeProp } from './props.js';
import { mulberry32, pick } from '../util.js';

const rnd = mulberry32(20171229);
const R = (a, b) => a + (b - a) * rnd();

const WALLS = [0xf2d7a6, 0xa9c8e8, 0xeab0a8, 0xc9e3b5, 0xf4f1e8, 0xd9c3e8, 0xf6c890, 0xb8d8d0, 0xe8e0a0, 0xd8c0a8, 0xb9d4ec];
const ROOFS = [0x7a4a3a, 0x4a5568, 0x8a3a3a, 0x5a6a4a, 0x3a3a48, 0x6a4a6a, 0x2f5a6a, 0x9a5a3a];
const DOORS = [0xb3402e, 0x2f5a8a, 0x3f7a4a, 0x6a3a8a, 0xf2c12e, 0x2a2a2a, 0xe86a9a];
const LAWN = [0x86c75c, 0x7fc057, 0x8ccb62];
const SIDEWALK = 0xd8d3c6, ASPHALT = 0x4c4c56, DRIVE = 0x9d988f, TRIM = 0xfbf6ec, LOT = 0x5d5d66, DIRT = 0xc09a64, GLASS = 0x5f8fb8;

export const parkedCars = [];   // { type, x, z, yaw, color, name }
export const pedLoops = [];     // sidewalk loops for pedestrians
export const animated = [];     // objects with tick(t)
export const lamps = [];

let scene;

// ---------------------------------------------------------------------------------------------
// A local frame: origin + yaw, so lots and buildings can be authored facing one way.

class Frame {
  constructor(S, F, ox, oz, yaw = 0) {
    this.S = S; this.F = F; this.ox = ox; this.oz = oz; this.yaw = yaw;
    this.c = Math.cos(yaw); this.s = Math.sin(yaw);
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
  prop(type, lx, lz, ly = 0) { placeProp(type, this.wx(lx, lz), this.wz(lx, lz), this.yaw + ly); }
  mark(name, lx, lz, ly = 0) { landmarks[name] = { x: this.wx(lx, lz), z: this.wz(lx, lz), yaw: this.yaw + ly }; }
  car(type, lx, lz, ly, extra = {}) { parkedCars.push({ type, x: this.wx(lx, lz), z: this.wz(lx, lz), yaw: this.yaw + ly, ...extra }); }
  sign(text, lx, y, lz, w, h, ly = 0, opts = {}) {
    const m = signMesh(text, w, h, opts);
    m.position.set(this.wx(lx, lz), y, this.wz(lx, lz));
    m.rotation.y = this.yaw + ly;
    scene.add(m);
    return m;
  }
  tree(lx, lz, s = 1, kind = 'round') { tree(this.S, this.wx(lx, lz), this.wz(lx, lz), s, kind); }
}

// ---------------------------------------------------------------------------------------------
// Small reusable pieces (world coordinates).

function tree(G, x, z, s = 1, kind = 'round') {
  const y = CURB;
  if (kind === 'pine') {
    G.cyl(0x6a4528, x, y + 0.8 * s, z, 0.2 * s, 1.6 * s, 7);
    const g = pick([0x3f8a4a, 0x4a9a52, 0x3a7a46], rnd);
    for (let k = 0; k < 3; k++) G.cone(g, x, y + (2.2 + k * 1.5) * s, z, (2.2 - k * 0.55) * s, 2.6 * s, 9);
  } else if (kind === 'dead') {
    G.cyl(0x4a3a30, x, y + 1.6 * s, z, 0.2 * s, 3.2 * s, 6);
    G.cyl(0x4a3a30, x + 0.5 * s, y + 3 * s, z, 0.08 * s, 1.6 * s, 5, 0, 0, -0.7);
    G.cyl(0x4a3a30, x - 0.4 * s, y + 2.6 * s, z + 0.2, 0.07 * s, 1.4 * s, 5, 0.3, 0, 0.8);
  } else {
    G.cyl(0x7a5232, x, y + 1.3 * s, z, 0.24 * s, 2.6 * s, 7);
    const g1 = pick([0x5aa84a, 0x66b552, 0x4f9e48, 0x78b84e], rnd), g2 = pick([0x6cbf55, 0x5fae4c, 0x84c45a], rnd);
    G.ico(g1, x, y + 3.6 * s, z, 3.6 * s, 1, rnd() * 6);
    G.ico(g2, x + 0.9 * s, y + 4.4 * s, z - 0.5 * s, 2.6 * s, 1, rnd() * 6);
    G.ico(g2, x - 0.8 * s, y + 4.0 * s, z + 0.6 * s, 2.4 * s, 1, rnd() * 6);
  }
  circle(x, z, 0.32 * s, 99, 'tree');
}

function lamp(G, x, z, yaw) {
  G.cyl(0x3a3f4a, x, CURB + 2.7, z, 0.09, 5.4, 8);
  G.cyl(0x3a3f4a, x, CURB + 0.2, z, 0.16, 0.4, 8);
  const ax = Math.sin(yaw), az = Math.cos(yaw);
  G.box(0x3a3f4a, x + ax * 0.7, CURB + 5.35, z + az * 0.7, 0.1, 0.1, 1.5, yaw);
  G.box(0x3a3f4a, x + ax * 1.35, CURB + 5.25, z + az * 1.35, 0.5, 0.18, 0.7, yaw);
  G.box(0xfff1b8, x + ax * 1.35, CURB + 5.13, z + az * 1.35, 0.4, 0.06, 0.6, yaw);
  circle(x, z, 0.16, 99, 'pole');
  lamps.push({ x, z });
}

function bush(G, x, z, s = 1) {
  const c = pick([0x4f9a44, 0x5aa84a, 0x468e3e], rnd);
  G.ico(c, x, CURB + 0.45 * s, z, 1.1 * s, 1, rnd() * 6);
}

// ---------------------------------------------------------------------------------------------
// Houses. Authored in a lot frame: street at local z=0, lot runs back to +z; x across.

function house(f, LW, LD, o = {}) {
  const stories = o.stories ?? (rnd() < 0.5 ? 2 : 1);
  const hw = o.w ?? R(9, 11.5), hd = o.d ?? R(7.5, 9.2);
  const wall = o.wall ?? pick(WALLS, rnd), roofC = o.roof ?? pick(ROOFS, rnd), door = o.door ?? pick(DOORS, rnd);
  const gs = o.garageSide ?? (rnd() < 0.5 ? -1 : 1);
  const gW = 4.8, gD = 6.2;
  const shift = o.shift ?? (rnd() - 0.5) * 1.5;
  const hx = shift - gs * gW / 2, gx = shift + gs * hw / 2;
  const front = o.front ?? R(7.2, 8.6);
  const H = stories * 3.05;
  const cz = front + hd / 2;

  f.box(wall, hx, CURB, cz, hw, H, hd);
  f.box(TRIM, hx, CURB, cz, hw + 0.12, 0.35, hd + 0.12);
  if (stories === 2) f.box(TRIM, hx, CURB + 3.0, cz, hw + 0.12, 0.16, hd + 0.12);
  const rh = o.roofH ?? R(2.3, 3.2);
  f.roof(roofC, hx, CURB + H, cz, hw + 1.0, rh, hd + 1.1);
  if (rnd() < 0.7) f.box(0x8a4a3a, hx + hw * 0.28 * (rnd() < 0.5 ? 1 : -1), CURB + H - 0.5, cz + hd * 0.2, 0.9, rh + 1.2, 0.9);
  f.solid(hx, cz, hw, hd, 99);

  // Front door with a little porch roof and step.
  const dx = hx + (o.doorX ?? R(-1.2, 1.2));
  f.box(door, dx, CURB, front - 0.05, 1.15, 2.25, 0.14);
  f.box(0xf2c12e, dx + 0.38, CURB + 1.1, front - 0.14, 0.09, 0.09, 0.06);
  f.box(TRIM, dx, CURB, front - 0.7, 2.2, 0.2, 1.3);
  if (rnd() < 0.6) {
    f.box(TRIM, dx, CURB + 2.55, front - 0.75, 2.6, 0.14, 1.6);
    f.box(TRIM, dx - 1.15, CURB, front - 1.4, 0.16, 2.55, 0.16);
    f.box(TRIM, dx + 1.15, CURB, front - 1.4, 0.16, 2.55, 0.16);
  }
  // Windows across the front, skipping the door.
  const shutters = rnd() < 0.5 ? pick([0x2f4a6a, 0x3f6a3f, 0x6a2f2f, 0x2a2a2a], rnd) : null;
  for (let s = 0; s < stories; s++) {
    const y = CURB + 0.95 + s * 3.05;
    const nWin = Math.max(2, Math.floor(hw / 3.2));
    for (let k = 0; k < nWin; k++) {
      const wx = hx - hw / 2 + (k + 0.5) * (hw / nWin);
      if (s === 0 && Math.abs(wx - dx) < 1.4) continue;
      window_(f, wx, y, front, 1.3, 1.45, shutters);
    }
    // Side windows.
    for (const side of [-1, 1]) {
      if (side === gs && s === 0) continue;
      const sx = hx + side * (hw / 2 + 0.05);
      f.boxC(TRIM, sx, y + 0.7, cz, 0.1, 1.5, 1.35);
      f.boxC(GLASS, sx + side * 0.03, y + 0.7, cz, 0.1, 1.2, 1.05);
    }
  }
  // Garage with a flat roof you can clamber onto.
  if (!o.noGarage) {
    const gz = front + 1.2 + gD / 2;
    f.box(wall, gx, CURB, gz, gW, 2.95, gD);
    f.box(roofC, gx, CURB + 2.95, gz, gW + 0.3, 0.25, gD + 0.3);
    f.box(TRIM, gx, CURB, front + 1.15, 3.8, 2.35, 0.12);
    for (let k = 1; k < 4; k++) f.box(0xe0dbcf, gx, CURB + k * 0.58, front + 1.08, 3.7, 0.05, 0.05);
    f.solid(gx, gz, gW, gD, CURB + 3.2, 'garage');
    f.flat(DRIVE, gx, (front + 1.2) / 2, 3.7, front + 1.2, CURB + 0.035);
    if (rnd() < 0.3) { // basketball hoop over the garage
      f.box(0xffffff, gx, CURB + 3.3, front + 1.2, 1.2, 0.8, 0.06);
      f.cyl(0xff6a1a, gx, CURB + 3.25, front + 0.85, 0.25, 0.04, 12);
    }
  }
  // Walk to the door.
  f.flat(0xe9e2d0, dx, (front - 1.3) / 2, 1.3, front - 1.3, CURB + 0.03);
  // Mailbox at the end of the drive, bushes along the front, maybe a tree and a flamingo.
  f.prop('mailbox', gx + gs * 2.3, 0.7, Math.PI);
  for (let k = 0; k < 3; k++) {
    const bx = hx - hw / 2 + 1 + k * (hw - 2) / 2;
    if (Math.abs(bx - dx) > 1.6) bush(f.S, f.wx(bx, front - 0.9), f.wz(bx, front - 0.9), R(0.8, 1.2));
  }
  if (!o.noTree && rnd() < 0.75) f.tree(hx - gs * (hw / 2 - 1.5) + R(-1, 1), R(2.8, 4.2), R(0.85, 1.15), rnd() < 0.2 ? 'pine' : 'round');
  if (rnd() < 0.25) f.prop('flamingo', hx + R(-3, 3), R(1.8, 3.5), R(0, 6));
  if (rnd() < 0.2) f.prop('gnome', hx + R(-3, 3), R(2, 4), Math.PI);
  if (rnd() < 0.3) { f.prop('trashcan', gx + gs * (gW / 2 + 0.6), front + 2.5); }
  // Parked car.
  if (!o.noCar && rnd() < 0.36) f.car(pick(['sedan', 'hatch', 'wagon', 'pickup', 'van', 'sedan', 'hatch'], rnd), gx, front - 2.2, Math.PI);

  // Back yard extra.
  const by = front + hd + 3.5;
  if (by < LD - 4 && !o.noYard) {
    const r = rnd();
    if (r < 0.3) trampoline(f, hx + R(-2, 2), by + 2.5);
    else if (r < 0.55) shed(f, -gs * (LW / 2 - 3), LD - 4, rnd() < 0.5 ? 0xb07a4a : pick(WALLS, rnd));
    else if (r < 0.75) swingset(f, hx, by + 2.5);
    else if (r < 0.88) pool(f, hx, by + 2.8);
  }
  return { hx, gx, front, hw, hd, gs, dx, H };
}

function window_(f, x, y, front, w, h, shutters) {
  f.box(TRIM, x, y, front - 0.04, w + 0.22, h + 0.22, 0.1);
  f.box(GLASS, x, y + 0.11, front - 0.08, w, h, 0.1);
  f.box(TRIM, x, y + 0.11 + h / 2 - 0.04, front - 0.11, 0.07, h, 0.06);
  if (shutters) {
    f.box(shutters, x - w / 2 - 0.4, y, front - 0.06, 0.45, h + 0.2, 0.08);
    f.box(shutters, x + w / 2 + 0.4, y, front - 0.06, 0.45, h + 0.2, 0.08);
  }
}

export const bouncers = [];
function trampoline(f, lx, lz) {
  const x = f.wx(lx, lz), z = f.wz(lx, lz);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; f.S.cyl(0x555a66, x + Math.cos(a) * 1.6, CURB + 0.4, z + Math.sin(a) * 1.6, 0.05, 0.8, 6); }
  f.S.cyl(0x2f6ad1, x, CURB + 0.82, z, 1.85, 0.1, 18);
  f.F.cyl(0x1d1f26, x, CURB + 0.86, z, 1.55, 0.04, 18);
  const b = circle(x, z, 1.8, CURB + 0.85, 'bounce');
  bouncers.push(b);
}
function shed(f, lx, lz, color) {
  f.box(color, lx, CURB, lz, 3.2, 2.4, 2.6);
  f.roof(0x6a4a3a, lx, CURB + 2.4, lz, 3.6, 1.0, 3.0);
  f.box(0x7a5a3a, lx, CURB, lz - 1.32, 1.0, 1.9, 0.06);
  f.solid(lx, lz, 3.2, 2.6, CURB + 2.6, 'shed');
}
function swingset(f, lx, lz) {
  const c = 0xd8321e;
  for (const s of [-1.6, 1.6]) {
    f.boxC(c, lx + s, CURB + 1.1, lz - 0.6, 0.09, 2.4, 0.09, 0, 0.45);
    f.boxC(c, lx + s, CURB + 1.1, lz + 0.6, 0.09, 2.4, 0.09, 0, -0.45);
  }
  f.boxC(c, lx, CURB + 2.25, lz, 3.4, 0.1, 0.1);
  for (const s of [-0.7, 0.7]) { f.boxC(0x666666, lx + s, CURB + 1.5, lz, 0.03, 1.5, 0.03); f.boxC(0x2a2a2a, lx + s, CURB + 0.72, lz, 0.5, 0.06, 0.25); }
}
function pool(f, lx, lz) {
  f.box(0xe8e4da, lx, CURB, lz, 6.4, 0.6, 3.6);
  f.box(0x46b4e6, lx, CURB + 0.02, lz, 5.8, 0.62, 3.0, 0, f.F);
  f.solid(lx, lz, 6.4, 3.6, CURB + 0.65, 'pool');
}

// ---------------------------------------------------------------------------------------------
// Residential block: three lots facing each of two opposite streets, back yards fenced.

function residential(bi, bj, b, S, F, special = {}) {
  const ew = special.ew ?? ((bi + bj) % 2 === 1);
  const W = b.x1 - b.x0;
  F.box(pick(LAWN, rnd), (b.x0 + b.x1) / 2, CURB + 0.0, (b.z0 + b.z1) / 2, W, 0.04, W);
  const LW = W / 3, LD = W / 2;
  for (let side = 0; side < 2; side++) {
    for (let k = 0; k < 3; k++) {
      const along = (k + 0.5) * LW;
      let f;
      if (!ew) f = side === 0 ? new Frame(S, F, b.x0 + along, b.z0, 0) : new Frame(S, F, b.x1 - along, b.z1, Math.PI);
      else f = side === 0 ? new Frame(S, F, b.x0, b.z1 - along, Math.PI / 2) : new Frame(S, F, b.x1, b.z0 + along, -Math.PI / 2);
      const idx = side * 3 + k;
      if (special.lots && special.lots[idx]) special.lots[idx](f, LW, LD);
      else house(f, LW, LD);
    }
  }
  // Back fence down the middle and dividers between back yards.
  const mid = W / 2, run = (from, to, fixed, alongX) => {
    for (let t = from + 1.25; t <= to - 1.2; t += 2.5) {
      if (alongX) placeProp('woodfence', t, fixed, 0);
      else placeProp('woodfence', fixed, t, Math.PI / 2);
    }
  };
  if (!ew) {
    run(b.x0 + 1, b.x1 - 1, b.z0 + mid, true);
    for (const k of [1, 2]) run(b.z0 + 19.5, b.z1 - 19.5, b.x0 + k * LW, false);
  } else {
    run(b.z0 + 1, b.z1 - 1, b.x0 + mid, false);
    for (const k of [1, 2]) run(b.x0 + 19.5, b.x1 - 19.5, b.z0 + k * LW, true);
  }
}

// ---------------------------------------------------------------------------------------------
// The special houses.

function birchHouse(f, LW, LD) {
  const h = house(f, LW, LD, { stories: 2, w: 11, d: 9, wall: 0xcfe0ee, roof: 0x3f4a66, door: 0xb3402e, garageSide: 1, shift: 0, noCar: true, front: 8, roofH: 3.6, doorX: -1.6 });
  // Duke's attic: a dormer with a round window.
  f.box(0xcfe0ee, h.hx - 1.5, CURB + 6.1, h.front + 1.4, 2.2, 1.7, 1.6);
  f.roof(0x3f4a66, h.hx - 1.5, CURB + 7.8, h.front + 1.4, 2.6, 0.9, 2.0, Math.PI / 2);
  f.cyl(TRIM, h.hx - 1.5, CURB + 6.95, h.front + 0.55, 0.55, 0.12, 16, Math.PI / 2);
  f.cyl(0x3a6a9a, h.hx - 1.5, CURB + 6.95, h.front + 0.5, 0.42, 0.12, 16, Math.PI / 2);
  f.car('wagon', h.gx, h.front - 2.4, Math.PI, { name: 'birchWagon', color: 0xd8c49a });
  f.mark('birch', h.hx + 1.6, h.front - 3.4, Math.PI);
  f.mark('birchGarage', h.gx, h.front + 1.2 + 3.1, 0);
  f.prop('trashcan', h.gx + 3.0, h.front + 2.6);
  f.mark('birchDrive', h.gx, h.front - 2.4, Math.PI);
  f.sign('THE BIRCHES', h.gx + 2.6, CURB + 1.0, 0.95, 1.4, 0.45, Math.PI, { bg: '#fff', fg: '#2a3a6a', scale: 0.5 });
}
function gloubHouse(f, LW, LD) {
  const h = house(f, LW, LD, { stories: 2, w: 10.5, d: 9, wall: 0xe9d4ae, roof: 0x7a3a2a, door: 0x2f5a8a, garageSide: -1, shift: 0, noCar: true, front: 8 });
  f.car('sedan', h.gx, h.front - 2.4, Math.PI, { name: 'martySedan', color: 0x7a1e2a });
  f.mark('gloub', h.hx - 1.5, h.front - 3.4, Math.PI);
  f.mark('gloubDrive', h.gx, h.front - 2.4, Math.PI);
  f.sign('GLOUBERMAN', h.gx - 2.6, CURB + 1.0, 0.95, 1.5, 0.45, Math.PI, { bg: '#fff', fg: '#6a2a1a', scale: 0.5 });
}
function jayHouse(f, LW, LD) {
  const h = house(f, LW, LD, { stories: 1, w: 10, d: 8.5, wall: 0x9aa486, roof: 0x4a4a3a, door: 0x3a3a3a, garageSide: 1, noCar: true, noTree: true, front: 9, noYard: true });
  // Junk on the lawn and a trampoline out front.
  trampoline(f, h.hx - 2.5, 4.6);
  f.mark('jayTramp', h.hx - 2.5, 4.6, 0);
  f.box(0x6a7a8a, h.gx, CURB + 0.25, h.front - 2.6, 1.9, 0.75, 4.2);
  f.box(0x5a6a7a, h.gx, CURB + 1.0, h.front - 2.2, 1.7, 0.6, 2.2);
  for (const s of [-0.7, 0.7]) for (const t of [-1.5, 1.5]) f.box(0x8a8a8a, h.gx + s, CURB, h.front - 2.6 + t, 0.4, 0.3, 0.4);
  f.solid(h.gx, h.front - 2.6, 1.9, 4.2, CURB + 1.6, 'junk');
  f.prop('barrel', h.gx - 2.5, h.front - 4);
  f.prop('crate', h.hx + 3.5, 3.2);
  f.mark('jay', h.hx + 1.5, 3.0, Math.PI);
  f.sign('BILZERIAN', h.hx + 4.2, CURB + 1.0, 0.8, 1.5, 0.45, Math.PI, { bg: '#ddd', fg: '#222', scale: 0.5 });
}
function steveHouse(f, LW, LD) {
  const h = house(f, LW, LD, { stories: 1, w: 7, d: 6.5, wall: 0xf0e48a, roof: 0x8a6a3a, door: 0x6a3a8a, garageSide: -1, noCar: true, front: 9.5, roofH: 1.8 });
  f.car('van', h.gx, h.front - 2.6, Math.PI, { name: 'steveVan', color: 0xe8e2d0 });
  // Lawn chair and a sad grill.
  f.box(0x3fa0d8, h.hx + 2, CURB, 4.5, 0.7, 0.45, 0.7);
  f.boxC(0x3fa0d8, h.hx + 2, CURB + 0.7, 4.85, 0.7, 0.7, 0.08, 0, 0.3);
  f.cyl(0x2a2a2a, h.hx - 2, CURB + 0.8, 4.0, 0.35, 0.3, 10);
  f.cyl(0x2a2a2a, h.hx - 2, CURB + 0.35, 4.0, 0.04, 0.7, 6);
  f.mark('steve', h.hx, 3.4, Math.PI);
  f.sign("COACH'S PLACE", h.hx + 3.6, CURB + 1.0, 0.8, 1.6, 0.45, Math.PI, { bg: '#fff', fg: '#2f5fb3', scale: 0.45 });
}

// ---------------------------------------------------------------------------------------------
// Whole-block landmarks. Each gets a frame at the block centre (yaw 0, so local = world offset).

function school(f, W) {
  // Main building along the north, entrance facing south onto the lot.
  const bz = -W / 2 + 15, bw = 46, bd = 20;
  f.flat(LOT, 0, 12, W - 2, 34, CURB + 0.02);
  f.flat(pick(LAWN, rnd), 0, -W / 2 + 13, W - 2, 26, CURB + 0.01);
  f.box(0xb5523b, -6, CURB, bz, bw, 8.5, bd);
  f.box(TRIM, -6, CURB + 8.5, bz, bw + 0.4, 0.5, bd + 0.4);
  f.box(0x9a3f2e, -6, CURB + 9.0, bz, bw + 0.2, 0.4, bd + 0.2);
  f.solid(-6, bz, bw, bd, 99);
  // Gym wing.
  f.box(0xc8b48a, 22, CURB, bz + 2, 14, 10.5, 24);
  f.box(0x8a7a5a, 22, CURB + 10.5, bz + 2, 14.4, 0.6, 24.4);
  f.solid(22, bz + 2, 14, 24, 99);
  f.box(0x2f5fb3, 22, CURB, bz + 14.05, 3.2, 2.8, 0.1);
  f.sign('GYM', 22, CURB + 3.6, bz + 14.1, 3.2, 0.9, 0, { bg: '#2f5fb3', fg: '#fff', border: null, scale: 0.7 });
  f.mark('gym', 22, bz + 17.5, 0);
  // Windows.
  for (let k = 0; k < 11; k++) for (let s = 0; s < 2; s++) {
    const x = -6 - bw / 2 + 2.2 + k * 4.2;
    if (s === 0 && Math.abs(x + 6) < 4) continue;
    f.box(TRIM, x, CURB + 1.4 + s * 3.9, bz + bd / 2 + 0.02, 2.6, 2.2, 0.1);
    f.box(GLASS, x, CURB + 1.55 + s * 3.9, bz + bd / 2 + 0.06, 2.3, 1.9, 0.1);
  }
  // Entrance portico.
  f.box(TRIM, -6, CURB, bz + bd / 2 + 2.2, 10, 0.4, 4.4);
  f.box(TRIM, -6, CURB + 5.2, bz + bd / 2 + 2.2, 10.6, 0.6, 4.8);
  for (const s of [-4.4, -1.5, 1.5, 4.4]) { f.cyl(TRIM, -6 + s, CURB + 2.7, bz + bd / 2 + 4.0, 0.32, 5.0, 12); f.circ(-6 + s, bz + bd / 2 + 4.0, 0.35); }
  f.box(0x6a3a2a, -6, CURB, bz + bd / 2 + 0.05, 3.4, 3.2, 0.12);
  f.box(TRIM, -6, CURB + 5.5, bz + bd / 2 + 4.4, 13.6, 1.9, 0.3);
  f.sign('BRIDGETON MIDDLE SCHOOL', -6, CURB + 6.4, bz + bd / 2 + 4.62, 13, 1.5, 0, { bg: '#fbf6ec', fg: '#7a1e1e', scale: 0.62 });
  f.mark('school', -6, bz + bd / 2 + 8, 0);
  // Flagpole.
  f.cyl(0xdddddd, 6, CURB + 6, bz + bd / 2 + 6, 0.08, 12, 8);
  f.circ(6, bz + bd / 2 + 6, 0.12);
  const flag = signMesh('★ ★ ★', 2.4, 1.4, { bg: '#d8321e', fg: '#fff', border: null, scale: 0.5, double: true });
  flag.position.set(f.wx(7.25, bz + bd / 2 + 6), CURB + 11.2, f.wz(7.25, bz + bd / 2 + 6));
  scene.add(flag);
  animated.push({ tick: (t) => { flag.rotation.y = Math.sin(t * 2.3) * 0.18; } });
  // Lot stripes, buses, bike rack.
  for (let k = 0; k < 9; k++) f.flat(0xf2f2f2, -24 + k * 5, 22, 0.15, 5.5, CURB + 0.04);
  f.car('bus', 14, 22.5, Math.PI / 2, { name: 'schoolBus' });
  f.car('bus', 14, 15.5, Math.PI / 2);
  f.mark('schoolLot', -8, 18, Math.PI);
  for (let k = 0; k < 5; k++) f.box(0x8a8f99, -20 + k * 0.7, CURB, bz + bd / 2 + 2.5, 0.06, 0.9, 1.2);
  f.prop('trashcan', -14, bz + bd / 2 + 3);
  f.prop('trashcan', 2, bz + bd / 2 + 3);
  f.prop('vending', 15, bz + bd / 2 + 1.0, Math.PI);
  // Driveway gaps are implicit: lot is open to the south street.
  for (const x of [-27, 27]) f.tree(x, -W / 2 + 3, 1.1);
}

function footballField(f, W) {
  f.flat(0xb5523b, 0, 0, W - 2, W - 4, CURB + 0.02);
  f.flat(0x5fb548, 0, 0, W - 14, W - 22, CURB + 0.04);
  for (let k = 0; k <= 10; k++) f.flat(0xffffff, 0, -20 + k * 4, W - 16, 0.18, CURB + 0.06);
  f.flat(0xffffff, -(W - 16) / 2, 0, 0.2, 40, CURB + 0.06);
  f.flat(0xffffff, (W - 16) / 2, 0, 0.2, 40, CURB + 0.06);
  for (const s of [-1, 1]) {
    const z = s * 22.5;
    f.cyl(0xf2c12e, 0, CURB + 1.5, z, 0.12, 3.0, 8);
    f.boxC(0xf2c12e, 0, CURB + 3.0, z, 5.6, 0.2, 0.2);
    f.cyl(0xf2c12e, -2.7, CURB + 5.0, z, 0.1, 4.0, 8);
    f.cyl(0xf2c12e, 2.7, CURB + 5.0, z, 0.1, 4.0, 8);
    f.circ(0, z, 0.2);
  }
  // Bleachers: stepped, so you can climb them.
  for (let k = 0; k < 5; k++) {
    const x = 22 + k * 1.1, top = CURB + 0.6 * (k + 1);
    f.box(k % 2 ? 0xb8bec8 : 0xa4aab4, x, CURB, 0, 1.1, 0.6 * (k + 1), 28);
    f.solid(x, 0, 1.1, 28, top, 'bleacher');
  }
  // Scoreboard.
  f.box(0x2a2a2a, -22, CURB, -25, 0.4, 4, 0.4);
  f.box(0x2a2a2a, -16, CURB, -25, 0.4, 4, 0.4);
  f.box(0x1d3a6a, -19, CURB + 4, -25, 8, 3.2, 0.5);
  f.sign('BOBCATS 0  ·  GUESTS 0', -19, CURB + 5.6, -24.7, 7.6, 2.6, 0, { bg: '#1d3a6a', fg: '#ffd23f', border: null, scale: 0.45 });
  f.solid(-19, -25, 8, 0.6, 99);
  f.mark('field', 0, 6, 0);
}

function waterTower(f, W) {
  f.flat(pick(LAWN, rnd), 0, 0, W - 2, W - 2, CURB + 0.01);
  // Baseball diamond.
  f.flat(DIRT, 12, 10, 22, 22, CURB + 0.03, Math.PI / 4);
  f.flat(0x86c75c, 12, 10, 13, 13, CURB + 0.05, Math.PI / 4);
  for (const [x, z] of [[12, 1.5], [20.5, 10], [12, 18.5], [3.5, 10]]) f.flat(0xffffff, x, z, 0.8, 0.8, CURB + 0.07, Math.PI / 4);
  f.box(0x7a7f88, 12, CURB, -2.5, 8, 4, 0.1);
  // The tower.
  const tx = -12, tz = -10, legH = 20;
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4, lx = tx + Math.cos(a) * 3.6, lz = tz + Math.sin(a) * 3.6;
    f.cyl(0x8aa0b8, lx, CURB + legH / 2, lz, 0.3, legH, 8);
    f.circ(lx, lz, 0.35);
  }
  f.boxC(0x8aa0b8, tx, CURB + 8, tz, 7.6, 0.25, 0.25, Math.PI / 4);
  f.boxC(0x8aa0b8, tx, CURB + 8, tz, 7.6, 0.25, 0.25, -Math.PI / 4);
  f.cyl(0xa8c2dc, tx, CURB + legH + 3, tz, 6, 6, 24);
  f.cone(0x8aa0b8, tx, CURB + legH + 7.6, tz, 6.3, 3.2, 24);
  f.cone(0xa8c2dc, tx, CURB + legH - 0.9, tz, 6, 2, 24);
  f.S.add(PRIM.cyl(24), 0x8aa0b8, mat(f.wx(tx, tz), CURB + legH + 9.4, f.wz(tx, tz), 0, 0, 0, 0.3, 1.2, 0.3));
  const tex = new THREE.CanvasTexture(textCanvas('BRIDGETON        BRIDGETON        ', 24, 2.2, { bg: '#a8c2dc', fg: '#2a3a6a', border: null, scale: 0.75 }));
  tex.colorSpace = THREE.SRGBColorSpace;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(6.05, 6.05, 2.2, 32, 1, true), new THREE.MeshBasicMaterial({ map: tex }));
  band.position.set(f.wx(tx, tz), CURB + legH + 3.4, f.wz(tx, tz));
  scene.add(band);
  f.mark('tower', tx + 6, tz + 6, 0);
  for (const [x, z] of [[-26, 22], [-20, 25], [26, -24], [-27, -26]]) f.tree(x, z, 1.1);
  f.prop('bench', -4, 20, 0);
  f.prop('bench', 2, 24, Math.PI / 2);
}

function cinema(f, W) {
  f.flat(LOT, 0, 10, W - 2, 40, CURB + 0.02);
  const bz = -W / 2 + 12;
  f.box(0x5a3a7a, 0, CURB, bz, 40, 11, 20);
  f.box(0xf2c12e, 0, CURB + 11, bz, 40.4, 0.6, 20.4);
  f.solid(0, bz, 40, 20, 99);
  f.box(0x2a1a3a, 0, CURB, bz + 10.05, 12, 3.2, 0.14);
  // Marquee.
  f.box(0xfbf6ec, 0, CURB + 4.0, bz + 12, 16, 2.6, 4);
  f.solid(0, bz + 12, 16, 4, 99, 'marquee').noFloor = true;
  f.box(0xd8321e, 0, CURB, bz + 13.6, 0.4, 4, 0.4);
  f.sign('NOW SHOWING: PUBERTY 2 · THE RETURN', 0, CURB + 5.3, bz + 14.02, 15.6, 2.2, 0, { bg: '#fff8e6', fg: '#d8321e', scale: 0.38 });
  f.sign('CINEPLEX', 0, CURB + 8.6, bz + 10.06, 14, 2.6, 0, { bg: '#5a3a7a', fg: '#ffd23f', border: null, scale: 0.8, stroke: '#1d1426' });
  for (let k = 0; k < 7; k++) f.flat(0xf2f2f2, -18 + k * 6, 26, 0.15, 5.5, CURB + 0.04);
  f.prop('newsbox', -9, bz + 11.2);
  f.prop('trashcan', 9, bz + 11.2);
  f.mark('cinema', 0, bz + 17, 0);
}

function apartments(f, W) {
  f.flat(pick(LAWN, rnd), 0, 0, W - 2, W - 2, CURB + 0.01);
  f.flat(LOT, 16, 14, 26, 30, CURB + 0.03);
  const parts = [[-14, -10, 26, 16], [-20, 17, 14, 22]];
  for (const [x, z, w, d] of parts) {
    f.box(0xd8a878, x, CURB, z, w, 9.3, d);
    f.box(0x8a5a3a, x, CURB + 9.3, z, w + 0.4, 0.5, d + 0.4);
    f.solid(x, z, w, d, 99);
  }
  // The north wing faces south, so author its windows in a frame turned around.
  const facade = new Frame(f.S, f.F, f.wx(0, -2), f.wz(0, -2), Math.PI);
  for (let s = 0; s < 3; s++) for (let k = 0; k < 6; k++) {
    if (s === 0 && k === 3) continue;
    window_(facade, 24 - k * 4, CURB + 0.9 + s * 3.0, 0, 1.3, 1.4, null);
  }
  // Balconies on the east side of the south wing.
  for (let s = 1; s < 3; s++) for (let k = 0; k < 4; k++) {
    f.box(0x8a5a3a, -12.3, CURB + s * 3.0, 9 + k * 5.2, 1.6, 0.15, 3.2);
    f.box(0xe8e2d0, -11.6, CURB + s * 3.0, 9 + k * 5.2, 0.1, 1.0, 3.2);
  }
  f.box(0x2f5a8a, -14, CURB, -1.95, 2.2, 2.6, 0.14);
  f.sign('GLASER APTS', -14, CURB + 3.5, -1.85, 4.4, 1.0, 0, { bg: '#fbf6ec', fg: '#8a3a5a', scale: 0.6 });
  f.mark('glaser', -9, 3, 0);
  for (let k = 0; k < 4; k++) f.flat(0xf2f2f2, 6 + k * 6, 10, 0.15, 5.5, CURB + 0.05);
  f.car('hatch', 9, 10, 0, { name: 'glaserHatch', color: 0x8ad1c8 });
  f.prop('trashcan', 3, -5);
  f.prop('trashcan', 4, -5);
  for (const [x, z] of [[20, -20], [8, -24], [-2, 26]]) f.tree(x, z, 1.05);
}

function mall(f, W) {
  f.flat(LOT, 0, 0, W - 2, W - 2, CURB + 0.02);
  const bz = -W / 2 + 13;
  f.box(0xe8dcc8, 0, CURB, bz, 54, 9, 22);
  f.box(0x2f8a8a, 0, CURB + 9, bz, 54.4, 0.6, 22.4);
  f.solid(0, bz, 54, 22, 99);
  f.box(0xbfe6ff, 0, CURB, bz + 11.05, 10, 4, 0.12);
  f.box(0x2f8a8a, 0, CURB + 4.2, bz + 12.5, 13, 0.4, 3.2);
  f.sign('BRIDGETON GALLERIA', 0, CURB + 6.6, bz + 11.08, 20, 2.4, 0, { bg: '#2f8a8a', fg: '#fff', border: null, scale: 0.7 });
  f.mark('mall', 0, bz + 15, 0);
  for (let r = 0; r < 2; r++) for (let k = 0; k < 9; k++) f.flat(0xf2f2f2, -24 + k * 6, 6 + r * 14, 0.15, 5.5, CURB + 0.04);
  for (const [x, z] of [[-18, 13], [0, 13], [18, 13]]) lamp(f.S, f.wx(x, z), f.wz(x, z), 0);
  for (let k = 0; k < 6; k++) f.prop('cart', -20 + k * 7.5 + R(-1, 1), 13 + R(-3, 3), R(0, 6));
  f.prop('trashcan', -7, bz + 12);
  f.prop('trashcan', 7, bz + 12);
  f.mark('mallLot', 0, 20, Math.PI);
}

function shops(f, W) {
  f.flat(LOT, 0, 0, W - 2, W - 2, CURB + 0.02);
  const bz = -W / 2 + 9;
  const stores = [
    ['TEENAGE PIZZA', 0xd8321e, '#fff8e6', '#d8321e'],
    ['SWEATY TOPIC', 0x2a2a2a, '#2a2a2a', '#ff5aa0'],
    ['ZIT HAPPENS', 0xf4d0b0, '#fff', '#c0392b'],
    ['FOREVER 13', 0xffd23f, '#ffd23f', '#1d1426'],
    ['HORMONE DEPOT', 0xff7a1a, '#ff7a1a', '#fff'],
  ];
  const sw = 11;
  stores.forEach(([name, col, bg, fg], k) => {
    const x = -W / 2 + 4 + sw / 2 + k * sw;
    f.box(col, x, CURB, bz, sw, 6.2, 14);
    f.box(TRIM, x, CURB + 6.2, bz, sw + 0.1, 0.4, 14.1);
    f.box(0xbfe6ff, x - 1.5, CURB + 0.5, bz + 7.04, 5.5, 3.0, 0.1);
    f.box(0x3a3a3a, x + 3, CURB, bz + 7.04, 1.6, 2.6, 0.12);
    f.sign(name, x, CURB + 4.8, bz + 7.12, sw - 1.2, 1.5, 0, { bg, fg, scale: 0.62 });
  });
  f.solid(0, bz, stores.length * sw, 14, 99);
  // Awning walk.
  f.box(0x2f5fb3, 0, CURB + 3.5, bz + 8.3, stores.length * sw, 0.2, 2.6);
  // Giant pizza on the roof.
  const px = -W / 2 + 4 + sw / 2;
  f.cyl(0xf2c14e, px, CURB + 8.2, bz, 3.0, 0.4, 18, Math.PI / 2 - 0.3);
  f.cyl(0xd8321e, px, CURB + 8.25, bz + 0.12, 2.6, 0.4, 18, Math.PI / 2 - 0.3);
  for (let k = 0; k < 6; k++) { const a = k * 1.05; f.cyl(0xa83a2a, px + Math.cos(a) * 1.5, CURB + 8.2 + Math.sin(a) * 1.4, bz + 0.4, 0.38, 0.2, 10, Math.PI / 2 - 0.3); }
  f.box(0x5a5a5a, px, CURB + 6.2, bz, 0.3, 1.5, 0.3);
  f.mark('pizza', px, bz + 12, 0);
  for (let r = 0; r < 2; r++) for (let k = 0; k < 9; k++) f.flat(0xf2f2f2, -24 + k * 6, 10 + r * 13, 0.15, 5.5, CURB + 0.04);
  f.prop('newsbox', px + 4, bz + 9.6);
  f.prop('newsbox', px + 26, bz + 9.6);
  f.prop('bench', px + 14, bz + 9.8);
  f.prop('trashcan', px + 18, bz + 9.8);
  f.prop('vending', px + 38, bz + 9.6);
  f.car('icecream', 18, 22, -Math.PI / 2);
}

function park(f, W) {
  f.flat(0x7cc456, 0, 0, W - 2, W - 2, CURB + 0.01);
  // Paths.
  f.flat(0xe8dcb8, 0, 0, 3, W - 2, CURB + 0.03);
  f.flat(0xe8dcb8, 0, 0, W - 2, 3, CURB + 0.03);
  // Pond with a rocky rim.
  const px = 14, pz = 14, pr = 11;
  f.F.cyl(0x46b4e6, f.wx(px, pz), CURB + 0.0, f.wz(px, pz), pr, 0.12, 28);
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2;
    f.S.ico(pick([0x9a9a9a, 0x8a8a8a, 0xa8a49a], rnd), f.wx(px + Math.cos(a) * pr, pz + Math.sin(a) * pr), CURB + 0.2, f.wz(px + Math.cos(a) * pr, pz + Math.sin(a) * pr), R(1.2, 1.9), 0, rnd() * 6);
  }
  f.circ(px, pz, pr + 0.5, 99, 'water');
  // Ducks.
  for (let k = 0; k < 3; k++) {
    const g = new GeoBuilder();
    g.sphere(0xffffff, 0, 0.18, 0, 0.5, 0.35, 0.7);
    g.sphere(0x2f8a4a, 0, 0.42, 0.25, 0.26);
    g.cone(0xf2a12e, 0, 0.42, 0.42, 0.06, 0.18, 6, Math.PI / 2);
    const duck = toonMesh(g.build(), { outline: 0.02 });
    scene.add(duck);
    const ph = k * 2.1, rr = 4 + k * 2;
    animated.push({ tick: (t) => { const a = t * 0.25 + ph; duck.position.set(f.wx(px + Math.cos(a) * rr, pz + Math.sin(a) * rr), CURB + 0.06, f.wz(px + Math.cos(a) * rr, pz + Math.sin(a) * rr)); duck.rotation.y = -a; } });
  }
  // Gazebo.
  const gx = -14, gz = -14;
  f.cyl(0xfbf6ec, gx, CURB + 0.25, gz, 5, 0.5, 8);
  f.solid(gx, gz, 7, 7, CURB + 0.5, 'deck');
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; f.cyl(TRIM, gx + Math.cos(a) * 4.4, CURB + 2.2, gz + Math.sin(a) * 4.4, 0.15, 3.6, 6); f.circ(gx + Math.cos(a) * 4.4, gz + Math.sin(a) * 4.4, 0.18); }
  f.cone(0x8a3a3a, gx, CURB + 5.0, gz, 6, 2.4, 8);
  f.mark('gazebo', gx, gz + 6.5, 0);
  // Playground: slide platform you can climb.
  const sx = -15, sz = 15;
  f.box(0xf2c12e, sx, CURB, sz, 2.2, 2.2, 2.2);
  f.solid(sx, sz, 2.2, 2.2, CURB + 2.2, 'platform');
  f.box(0xd8321e, sx, CURB + 2.2, sz, 2.4, 0.15, 2.4);
  f.boxC(0x2f8ad8, sx + 2.6, CURB + 1.1, sz, 3.6, 0.1, 1.0, 0, 0, -0.55);
  ramp(f.wx(sx + 2.6, sz), f.wz(sx + 2.6, sz), -Math.PI / 2, 1.0, 3.0, CURB + 0.05, CURB + 2.2, 'slide');
  f.box(0x8a5a3a, sx - 1.6, CURB, sz, 0.5, 0.7, 1.2);
  f.solid(sx - 1.6, sz, 0.5, 1.2, CURB + 0.7, 'step');
  swingset(f, -6, 22);
  // Dirt jump for cars.
  f.box(DIRT, 0, CURB, -24, 6, 0.01, 6);
  const rx = 22, rz = -16;
  f.S.add(makeWedge(), DIRT, mat(f.wx(rx, rz), CURB, f.wz(rx, rz), 0, Math.PI, 0, 5, 1.6, 7));
  ramp(f.wx(rx, rz), f.wz(rx, rz), Math.PI, 5, 7, CURB, CURB + 1.6);
  for (const [x, z] of [[-26, -3], [-24, -26], [26, 2], [-4, -26], [5, 26], [-27, 27], [27, 27], [10, -6]]) f.tree(x, z, R(1, 1.3));
  for (const [x, z, y] of [[3, -8, Math.PI / 2], [-3, 8, -Math.PI / 2], [8, 3, 0]]) f.prop('bench', x, z, y);
  f.prop('trashcan', 3, 5);
  f.mark('park', 0, -6, 0);
  f.mark('pond', px - pr - 3, pz, 0);
}

function gasStation(f, W) {
  f.flat(LOT, 0, 0, W - 2, W - 2, CURB + 0.02);
  // Canopy on four posts over two islands of pumps.
  const cx = 4, cz = 6;
  for (const sx of [-8, 8]) for (const sz of [-4, 4]) { f.box(0xfbf6ec, cx + sx, CURB, cz + sz, 0.5, 5.2, 0.5); f.solid(cx + sx, cz + sz, 0.5, 0.5); }
  f.box(0xd8321e, cx, CURB + 5.2, cz, 20, 0.9, 12);
  f.box(0xfbf6ec, cx, CURB + 6.1, cz, 20.2, 0.25, 12.2);
  f.sign("GAS 'N' GAS", cx, CURB + 5.65, cz + 6.06, 8, 0.85, 0, { bg: '#d8321e', fg: '#fff', border: null, scale: 0.8 });
  for (const sx of [-5, 5]) {
    f.box(0xd8d4c8, cx + sx, CURB, cz, 1.4, 0.25, 7);
    f.prop('pump', cx + sx, cz - 1.8, 0);
    f.prop('pump', cx + sx, cz + 1.8, Math.PI);
  }
  // Mini-mart.
  const mz = -W / 2 + 9;
  f.box(0xfbf6ec, -6, CURB, mz, 24, 5, 12);
  f.box(0xd8321e, -6, CURB + 5, mz, 24.3, 0.6, 12.3);
  f.solid(-6, mz, 24, 12, 99);
  f.box(0xbfe6ff, -10, CURB + 0.4, mz + 6.04, 9, 2.8, 0.1);
  f.box(0x3a3a3a, -2, CURB, mz + 6.04, 1.8, 2.6, 0.12);
  f.sign('MINI MART · SLUSHIES', -6, CURB + 4.0, mz + 6.1, 12, 1.1, 0, { bg: '#fff8e6', fg: '#d8321e', scale: 0.6 });
  f.prop('vending', 4, mz + 5.2, 0);
  f.prop('trashcan', 6, mz + 6.6);
  f.prop('newsbox', -15, mz + 6.6);
  // Price sign by the road.
  f.box(0x5a5a5a, 24, CURB, 24, 0.4, 5, 0.4);
  f.sign('REGULAR 3.99\nPREMIUM 4.49', 24, CURB + 6.2, 24.3, 4.2, 2.6, 0, { bg: '#fff', fg: '#d8321e', scale: 0.62 });
  f.circ(24, 24, 0.3);
  f.mark('gas', cx, cz + 10, 0);
}

function construction(f, W) {
  f.flat(DIRT, 0, 0, W - 2, W - 2, CURB + 0.02);
  // Chain fence (unbreakable) with a gap on the west side.
  for (let k = 0; k < 24; k++) {
    const t = -W / 2 + 2 + k * (W - 4) / 23;
    for (const [x, z, ax] of [[t, -W / 2 + 1.2, true], [t, W / 2 - 1.2, true], [W / 2 - 1.2, t, false]]) f.cyl(0x8a8f99, x, CURB + 1.0, z, 0.05, 2.0, 5);
  }
  // Jump ramps.
  const ramps = [[-12, 0, Math.PI / 2, 5, 9, 2.4], [14, -14, 0, 5, 8, 2.0], [12, 18, Math.PI, 5, 8, 2.8], [-18, -18, Math.PI / 4, 4.5, 7, 1.8]];
  for (const [x, z, yaw, w, l, h] of ramps) {
    f.S.add(makeWedge(), 0xf2c12e, mat(f.wx(x, z), CURB, f.wz(x, z), 0, yaw, 0, w, h, l));
    ramp(f.wx(x, z), f.wz(x, z), yaw, w, l, CURB, CURB + h);
  }
  // A landing platform made of a girder deck.
  f.box(0x8a8f99, 6, CURB, 0, 10, 2.4, 10);
  f.solid(6, 0, 10, 10, CURB + 2.4, 'deck');
  f.box(0xd86a1a, 6, CURB + 2.4, 0, 10.2, 0.2, 10.2);
  f.S.add(makeWedge(), 0x8a8f99, mat(f.wx(6, -8), CURB, f.wz(6, -8), 0, 0, 0, 5, 2.4, 6));
  ramp(f.wx(6, -8), f.wz(6, -8), 0, 5, 6, CURB, CURB + 2.4);
  // Crane.
  f.box(0xf2c12e, 20, CURB, 2, 1.6, 26, 1.6);
  f.solid(20, 2, 1.6, 1.6);
  f.box(0xf2c12e, 14, CURB + 26, 2, 22, 1.2, 1.2);
  f.box(0x5a5a5a, 22, CURB + 24.6, 2, 2.8, 1.8, 2.8);
  f.cyl(0x333333, 6, CURB + 20, 2, 0.04, 12, 4);
  f.box(0x8a8f99, 6, CURB + 13, 2, 3, 0.5, 1);
  // Pipes and stacks of stuff.
  for (let k = 0; k < 3; k++) { f.cyl(0x6a8fa8, -20 + k * 2.1, CURB + 1.0, 18, 1.0, 6, 12, Math.PI / 2); }
  f.solid(-18, 18, 6.3, 6, CURB + 2.0, 'pipes');
  for (let k = 0; k < 6; k++) f.prop('crate', -4 + (k % 3) * 1.3, 16 + Math.floor(k / 3) * 1.3);
  for (let k = 0; k < 5; k++) f.prop('barrel', 22 + (k % 2), 18 - k * 1.2);
  for (let k = 0; k < 10; k++) f.prop('cone', -26 + k * 1.5, -10 + (k % 2) * 0.6);
  f.prop('hay', 0, -22);
  f.prop('hay', 1.8, -22);
  f.box(0xfbf6ec, -24, CURB, -22, 6, 2.8, 3);
  f.solid(-24, -22, 6, 3, CURB + 2.8, 'trailer');
  f.sign('KEEP OUT · HARD HATS', -24, CURB + 1.6, -20.48, 5, 1.2, 0, { bg: '#ffd23f', fg: '#1d1426', scale: 0.5 });
  f.mark('construct', -26, 0, Math.PI / 2);
}

function cemetery(f, W) {
  f.flat(0x6aa04a, 0, 0, W - 2, W - 2, CURB + 0.01);
  f.flat(0xb8b0a0, 0, 0, 3, W - 2, CURB + 0.03);
  for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) {
    if (k === 3) continue;
    f.prop('tombstone', -24 + k * 8, -18 + r * 8 + (k % 2), R(-0.1, 0.1) + Math.PI);
  }
  // The Shame Wizard's crypt.
  f.box(0x6a5a8a, 0, CURB, 24, 12, 7, 8);
  f.roof(0x3a2a4a, 0, CURB + 7, 24, 13, 3, 9, Math.PI / 2);
  f.solid(0, 24, 12, 8);
  f.box(0x1d1426, 0, CURB, 19.95, 3, 4, 0.12);
  f.sign('SHAME', 0, CURB + 5.4, 19.9, 5, 1.1, Math.PI, { bg: '#3a2a4a', fg: '#c89aff', border: null, scale: 0.8 });
  for (const [x, z] of [[-24, 26], [24, 25], [-26, -26], [26, -24], [12, 10]]) f.tree(x, z, R(1.2, 1.5), 'dead');
  f.mark('cemetery', 0, -26, Math.PI);
  f.mark('crypt', 0, 15, Math.PI);
}

// ---------------------------------------------------------------------------------------------

function streets(F, S) {
  // Asphalt everywhere under the grid, raised slabs on top for each block.
  const ext = HALF + RHW + 0.5;
  F.box(ASPHALT, 0, -0.5, 0, ext * 2, 1, ext * 2);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = rc(i) + RHW, x1 = rc(i + 1) - RHW, z0 = rc(j) + RHW, z1 = rc(j + 1) - RHW;
    F.box(SIDEWALK, (x0 + x1) / 2, CURB / 2 - 0.5, (z0 + z1) / 2, x1 - x0, CURB + 1, z1 - z0);
  }
  // The ring outside the grid: sidewalk then grass out to the hills.
  const o = HALF + RHW, far = 900;
  for (const [cx, cz, w, d] of [[0, -(o + far) / 2, 2 * far, far - o], [0, (o + far) / 2, 2 * far, far - o], [-(o + far) / 2, 0, far - o, 2 * o], [(o + far) / 2, 0, far - o, 2 * o]]) {
    F.box(0x7bbf55, cx, CURB / 2 - 0.5, cz, w, CURB + 1, d);
  }
  F.box(SIDEWALK, 0, CURB + 0.0, -(o + SW / 2), 2 * (o + SW), 0.04, SW);
  F.box(SIDEWALK, 0, CURB + 0.0, o + SW / 2, 2 * (o + SW), 0.04, SW);
  F.box(SIDEWALK, -(o + SW / 2), CURB + 0.0, 0, SW, 0.04, 2 * o);
  F.box(SIDEWALK, o + SW / 2, CURB + 0.0, 0, SW, 0.04, 2 * o);
  // Markings.
  for (let k = 0; k <= N; k++) {
    const c = rc(k);
    for (let s = 0; s < N; s++) {
      const a = rc(s) + RHW + 2.8, b = rc(s + 1) - RHW - 2.8;
      for (let t = a + 1; t < b - 1; t += 6) {
        F.box(0xf2c12e, t + 1.5, 0.012, c - 0.12, 3, 0.02, 0.14);
        F.box(0xf2c12e, t + 1.5, 0.012, c + 0.12, 3, 0.02, 0.14);
        F.box(0xf2c12e, c - 0.12, 0.012, t + 1.5, 0.14, 0.02, 3);
        F.box(0xf2c12e, c + 0.12, 0.012, t + 1.5, 0.14, 0.02, 3);
      }
    }
    // Crosswalks on each approach to every intersection.
    for (let m = 0; m <= N; m++) {
      const ix = rc(k), iz = rc(m);
      for (const dir of [-1, 1]) {
        const along = RHW + 1.6;
        if ((k > 0 || dir > 0) && (k < N || dir < 0)) for (let w = -RHW + 0.7; w < RHW; w += 1.15) F.box(0xf4f4f0, ix + dir * along, 0.014, iz + w, 2.0, 0.02, 0.55);
        if ((m > 0 || dir > 0) && (m < N || dir < 0)) for (let w = -RHW + 0.7; w < RHW; w += 1.15) F.box(0xf4f4f0, ix + w, 0.014, iz + dir * along, 0.55, 0.02, 2.0);
      }
    }
  }
  // Street lamps and a few hydrants on every block's sidewalk.
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = rc(i) + RHW + 0.6, x1 = rc(i + 1) - RHW - 0.6, z0 = rc(j) + RHW + 0.6, z1 = rc(j + 1) - RHW - 0.6;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    lamp(S, x0 + 12, z0, Math.PI); lamp(S, x1 - 12, z1, 0);
    lamp(S, x0, mz + 8, -Math.PI / 2); lamp(S, x1, mz - 8, Math.PI / 2);
    lamp(S, mx + 20, z0, Math.PI); lamp(S, mx - 20, z1, 0);
    if ((i * 7 + j * 3) % 3 === 0) placeProp('hydrant', x0 + 4, z0 + 0.4, 0);
    if ((i * 5 + j) % 4 === 1) placeProp('hydrant', x1 - 4, z1 - 0.4, 0);
    if ((i + j * 2) % 5 === 2) placeProp('newsbox', mx, z1 - 0.3, Math.PI);
    if ((i * 3 + j) % 4 === 0) placeProp('trashcan', x1, mz + 3, 0);
  }
}

function outskirts(S) {
  // A belt of trees, then rolling hills to hide the edge of the world.
  const inner = EDGE + 6;
  for (let k = 0; k < 200; k++) {
    const side = k % 4, t = (rnd() * 2 - 1) * (BOUND + 10);
    const d = inner + rnd() * (BOUND - inner + 30);
    const x = side === 0 ? t : side === 1 ? t : side === 2 ? -d : d;
    const z = side === 0 ? -d : side === 1 ? d : t;
    tree(S, x, z, R(1.1, 1.8), rnd() < 0.45 ? 'pine' : 'round');
  }
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    const d = BOUND + 90 + rnd() * 60;
    S.sphere(pick([0x6fb24f, 0x79bb57, 0x66a84a], rnd), Math.cos(a) * d * 1.05, -20, Math.sin(a) * d * 1.05, R(140, 220), R(70, 120), R(140, 220), 0, rnd() * 6, 0, 16);
  }
  const b = BOUND;
  box(-b - 10, -b - 10, b + 10, -b, 99, 'bound');
  box(-b - 10, b, b + 10, b + 10, 99, 'bound');
  box(-b - 10, -b, -b, b, 99, 'bound');
  box(b, -b, b + 10, b, 99, 'bound');
  // Welcome sign on the west edge.
  const sg = signMesh('WELCOME TO BRIDGETON\nPop. Puberty', 9, 3.2, { bg: '#2f6a3a', fg: '#fff8e6', border: '#fff8e6', scale: 0.62 });
  sg.position.set(-HALF - RHW - 8, CURB + 3.4, -HALF + 40);
  sg.rotation.y = Math.PI / 2;
  scene.add(sg);
  S.box(0x6a4528, -HALF - RHW - 8.1, CURB + 1.8, -HALF + 37, 0.3, 3.6, 0.3);
  S.box(0x6a4528, -HALF - RHW - 8.1, CURB + 1.8, -HALF + 43, 0.3, 3.6, 0.3);
}

// Sidewalk loops for pedestrians: one rectangle per block, just inside the curb.
function addPedLoops() {
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const o = RHW + SW * 0.55;
    const x0 = rc(i) + o, x1 = rc(i + 1) - o, z0 = rc(j) + o, z1 = rc(j + 1) - o;
    pedLoops.push({ i, j, pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
  }
}

export function buildTown(sc) {
  scene = sc;
  const add = (S, F) => {
    if (!S.empty) scene.add(toonMesh(S.build(), { outline: 0.045 }));
    if (!F.empty) {
      const m = new THREE.Mesh(F.build(), MAT.toon);
      m.receiveShadow = true;
      scene.add(m);
    }
  };
  {
    const S = new GeoBuilder(), F = new GeoBuilder();
    streets(F, S);
    add(S, F);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const S = new GeoBuilder(), F = new GeoBuilder();
    const b = blockInterior(i, j);
    const W = b.x1 - b.x0;
    const f = new Frame(S, F, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, 0);
    switch (MAP[j][i]) {
      case 'res': residential(i, j, b, S, F); break;
      case 'birch': residential(i, j, b, S, F, { ew: false, lots: { 1: birchHouse } }); break;
      case 'gloub': residential(i, j, b, S, F, { ew: false, lots: { 4: gloubHouse } }); break;
      case 'jay': residential(i, j, b, S, F, { ew: true, lots: { 1: jayHouse } }); break;
      case 'steve': residential(i, j, b, S, F, { ew: false, lots: { 4: steveHouse } }); break;
      case 'school': school(f, W); break;
      case 'field': footballField(f, W); break;
      case 'tower': waterTower(f, W); break;
      case 'cinema': cinema(f, W); break;
      case 'glaser': apartments(f, W); break;
      case 'mall': mall(f, W); break;
      case 'shops': shops(f, W); break;
      case 'park': park(f, W); break;
      case 'gas': gasStation(f, W); break;
      case 'construct': construction(f, W); break;
      case 'cemetery': cemetery(f, W); break;
    }
    add(S, F);
  }
  {
    const S = new GeoBuilder(), F = new GeoBuilder();
    outskirts(S);
    add(S, F);
  }
  addPedLoops();
}

export function tickTown(t) {
  for (const a of animated) a.tick(t);
}
