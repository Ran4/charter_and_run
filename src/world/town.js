// Builds Nueva Estocolmo: streets, outskirts, the residential blocks, and every special block via
// BLOCK_BUILDERS (world/blocks/*.js). All static geometry is merged per block into one outlined toon
// mesh plus one flat ground mesh. Landmarks come from landmarks-island.js before any block runs.

import { THREE, GeoBuilder, toonMesh, signMesh, MAT } from '../gfx.js';
import { P, N, HALF, RHW, SW, CURB, EDGE, BOUND, rc, blockInterior, MAP } from './layout.js';
import { box, circle } from './collision.js';
import { placeProp } from './props.js';
import { Frame, tree, parkedCars, setFrameScene } from './frame.js';
import { registerIslandLandmarks } from './landmarks-island.js';
import { BLOCK_BUILDERS } from './blocks/index.js';
import { mulberry32, pick } from '../util.js';

export { parkedCars };

const rnd = mulberry32(20171229);
const R = (a, b) => a + (b - a) * rnd();

const WALLS = [0xf4efe6, 0xf2e6d0, 0xf6f0e0, 0xeadcc0, 0xf4efe6, 0xf0e2c8, 0xf6c890, 0xe8d8c0];
const ROOFS = [0xc0623a, 0xb05a34, 0xd0704a, 0x9a4a30, 0xf4efe6];
const DOORS = [0x2f8a4a, 0x2f5a8a, 0x8a3a2a, 0xf07a1e, 0x6a4a2a];
const LAWN = [0xc9a26b, 0xd4ae76, 0xbf9a62];
const SIDEWALK = 0xd8d3c6, ASPHALT = 0x4c4c56, DRIVE = 0x9d988f, TRIM = 0xfbf6ec, GLASS = 0x5f8fb8;

export const pedLoops = [];     // sidewalk loops for pedestrians
export const animated = [];     // objects with tick(t)
export const lamps = [];

let scene;

// ---------------------------------------------------------------------------------------------
// Small reusable pieces (world coordinates).

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
  f.prop('correos', gx + gs * 2.3, 0.7, Math.PI);
  for (let k = 0; k < 3; k++) {
    const bx = hx - hw / 2 + 1 + k * (hw - 2) / 2;
    if (Math.abs(bx - dx) > 1.6) bush(f.S, f.wx(bx, front - 0.9), f.wz(bx, front - 0.9), R(0.8, 1.2));
  }
  if (!o.noTree && rnd() < 0.75) f.tree(hx - gs * (hw / 2 - 1.5) + R(-1, 1), R(2.8, 4.2), R(0.85, 1.15), rnd() < 0.2 ? 'pine' : 'round');
  if (rnd() < 0.25) f.prop('parasoll', hx + R(-3, 3), R(1.8, 3.5), R(0, 6));
  if (rnd() < 0.2) f.prop('palmkruka', hx + R(-3, 3), R(2, 4), Math.PI);
  if (rnd() < 0.3) { f.prop('butano', gx + gs * (gW / 2 + 0.6), front + 2.5); }
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
      if (alongX) placeProp('mur', t, fixed, 0);
      else placeProp('mur', fixed, t, Math.PI / 2);
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
    F.box(0xc9a26b, cx, CURB / 2 - 0.5, cz, w, CURB + 1, d);
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
        F.box(0xf4f4f0, t + 1.5, 0.012, c, 3, 0.02, 0.16);
        F.box(0xf4f4f0, c, 0.012, t + 1.5, 0.16, 0.02, 3);
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
    if ((i * 7 + j * 3) % 3 === 0) placeProp('correos', x0 + 4, z0 + 0.4, 0);
    if ((i * 5 + j) % 4 === 1) placeProp('correos', x1 - 4, z1 - 0.4, 0);
    if ((i + j * 2) % 5 === 2) placeProp('vykort', mx, z1 - 0.3, Math.PI);
    if ((i * 3 + j) % 4 === 0) placeProp('papelera', x1, mz + 3, 0);
  }
}

// The parked DC-8 sits outside the bound wall at (240, -335): no hills within 100 m of it and
// nothing taller than 1 m within 60 m (DESIGN §6.4).
export const DC8_SPOT = { x: 240, z: -335 };
const nearDc8 = (x, z, r) => Math.hypot(x - DC8_SPOT.x, z - DC8_SPOT.z) < r;

function outskirts(S, F) {
  // A belt of trees, then rolling hills to hide the edge of the world.
  const inner = EDGE + 6;
  for (let k = 0; k < 200; k++) {
    const side = k % 4, t = (rnd() * 2 - 1) * (BOUND + 10);
    const d = inner + rnd() * (BOUND - inner + 30);
    const x = side === 0 ? t : side === 1 ? t : side === 2 ? -d : d;
    const z = side === 0 ? -d : side === 1 ? d : t;
    const s = R(1.1, 1.8), kind = rnd() < 0.45 ? 'pine' : 'round';
    if (side === 1 || nearDc8(x, z, 60)) continue;   // south is the sea; keep the DC-8 sector clear
    tree(S, x, z, s, kind);
  }
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    const d = BOUND + 90 + rnd() * 60;
    const c = pick([0xa5532f, 0xc27a45, 0xb0603a], rnd), rx = R(140, 220), ry = R(70, 120), rz = R(140, 220), ry2 = rnd() * 6;
    const x = Math.cos(a) * d * 1.05, z = Math.sin(a) * d * 1.05;
    if (z > 200) continue;                                   // the sea side stays open
    if (Math.hypot(x - DC8_SPOT.x, z - DC8_SPOT.z) - Math.max(rx, rz) / 2 < 100) continue;
    S.sphere(c, x, -20, z, rx, ry, rz, 0, ry2, 0, 16);
  }
  // The sea: sand strip z 289 -> 300, then water 2 cm above CURB out to z 1150, x +-1150.
  F.box(0xe8cf98, 0, CURB + 0.005, 294.5, 2 * 600, 0.01, 11);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2300, 850).rotateX(-Math.PI / 2), MAT.water);
  sea.position.set(0, 0.17, 300 + 425);
  sea.receiveShadow = true;
  scene.add(sea);
  const b = BOUND;
  box(-b - 10, -b - 10, b + 10, -b, 99, 'bound');
  box(-b - 10, b, b + 10, b + 10, 99, 'bound');
  box(-b - 10, -b, -b, b, 99, 'bound');
  box(b, -b, b + 10, b, 99, 'bound');
  // Welcome sign on the west edge.
  const sg = signMesh('BIENVENIDOS A NUEVA ESTOCOLMO\nVÄLKOMMEN!', 9, 3.2, { bg: '#f7c31b', fg: '#1d1426', border: '#1d1426', scale: 0.5 });
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
  setFrameScene(sc);
  registerIslandLandmarks();
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
    const type = MAP[j][i];
    if (type === 'bungalowR' || type === 'lagenhet') residential(i, j, b, S, F);
    else {
      const f = new Frame(S, F, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, 0, scene);
      const fn = BLOCK_BUILDERS[type];
      if (fn) fn(f, W, { i, j, scene, rnd: mulberry32(1000 + i * 31 + j * 7) });
      else F.box(0xd8d3c6, (b.x0 + b.x1) / 2, CURB + 0.0, (b.z0 + b.z1) / 2, W, 0.04, W);   // unknown type: empty slab
    }
    add(S, F);
  }
  {
    const S = new GeoBuilder(), F = new GeoBuilder();
    outskirts(S, F);
    add(S, F);
  }
  addPedLoops();
}

export function tickTown(t) {
  for (const a of animated) a.tick(t);
}
