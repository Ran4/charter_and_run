// Hotel blocks (WP-C1, DESIGN §6.3): `flamenco` (3,3) = Hotel Flamenco + Pepes Bodega, the hero
// block at the origin, and `suntrip` (3,2) = Hotel SunTrip with the welcome stage and the
// friskotek lawn. Builder signature: fn(f, W, ctx); f = Frame at the block centre (yaw 0, so
// local = world offset from the centre, interior ±31), ctx = { i, j, scene, rnd }.
// Everything static goes into f.S (outlined toon mesh, merged per block) or f.F (flat ground);
// glowing bulbs share one unlit vertex-colour mesh per block (MAT.mouth, no new materials), and
// Pepes Bodega's lights are a few small meshes that worldHooks.bodegaLit(on) switches.
// Signs are player-facing Swedish/Spanish; film lines used as signs carry their source tag.

import { THREE, PRIM, mat, GeoBuilder, MAT, toonMesh, skyDark } from '../../gfx.js';
import { CURB } from '../layout.js';
import { box } from '../collision.js';
import { worldHooks } from '../registry.js';

const C = CURB;
const PI = Math.PI;

// Ground layers (top heights), a centimetre apart so they never z-fight at distance.
const Y_BASE = C + 0.01, Y_AREA = C + 0.02, Y_LINE = C + 0.03, Y_WATER = C + 0.04, Y_DEEP = C + 0.05, Y_GLINT = C + 0.06;

// §13.2 island palette plus a few shades of it.
const WHITE = 0xf4efe6, TRIM = 0xfbf6ec, TERRA = 0xc0623a, TERRA_D = 0x9a4a30;
const TILE = 0xc98a5e, TILE_L = 0xe0b98e, PAVE = 0xe6dccb, PAVE_D = 0xd2c7b2, DECK = 0xf0e8d8;
const GLASS = 0x3f6f96, GLASS_D = 0x2a4660, WOOD = 0x9a6a3a, WOOD_D = 0x6a4a2a, STEEL = 0x4a505a;
const CHROME = 0xd8dde2, POOL = 0x1c7fb8, POOL_D = 0x16679c, POOL_L = 0x9fdcf2, ASPH = 0x5a5a62;
const STRIPE = 0xf4f4f0, GREEN = 0x2f8a4a, SUN = 0xf7c31b, ORANGE = 0xf07a1e, RED = 0xd8321e;
const LEAF2 = 0x5a9a48, BOUG = 0xc2307a, PICON = 0x4a403c, STRAW = 0xd9b45a;
const ROCK = 0xa5532f, ROCK2 = 0xc27a45, LAWN = 0x8cbf58, LAWN_D = 0x7aae4c;
const INK = 0x2a2a2e, GOLD = 0xf2c12e, WARM = 0xffe6a0;
const AWNINGS = [ORANGE, SUN, GREEN, 0x1e9aa0, RED, 0x2f5a8a, ORANGE];
const TOWELS = [RED, 0x1e9aa0, SUN, 0xf2f2f2, BOUG, 0x2f5a8a, ORANGE, 0x7ac043];
const CURTAINS = [0xf2e6d0, ORANGE, 0xe8c070, 0x8ab8c8, 0xd88a6a];

const pick = (a, rnd) => a[Math.floor(rnd() * a.length) % a.length];

// Lit windows for the night palette (grisfest): while a builder runs, NIGHT collects warm panes
// in front of a share of the glass; nightMesh() turns them into one unlit mesh that draws only
// when the sky is dark (gfx.skyDark).
const NIGHT_COLS = [0xffd890, 0xffe6b0, 0xffc870, 0xffd890, 0xcfe0ff];
let NIGHT = null, NIGHT_RND = Math.random;
function nightPane(x, y, z, w, h, d, ry = 0) {
  if (NIGHT && NIGHT_RND() < 0.42) NIGHT.box(NIGHT_COLS[Math.floor(NIGHT_RND() * NIGHT_COLS.length)], x, y, z, w, h, d, ry);
}
function nightMesh(scene) {
  const g = NIGHT;
  NIGHT = null;
  if (!g || g.empty) return;
  const m = new THREE.Mesh(g.build(), MAT.mouth);
  m.frustumCulled = false;
  m.onBeforeRender = (r, sc, cam, geo) => { geo.setDrawRange(0, skyDark() ? Infinity : 0); };
  scene.add(m);
}

// ------------------------------------------------------------------------------------------------
// Small pieces shared by both hotels (local coordinates of the block frame).

// Raw primitive with a full transform (non-uniform rocks, tori), local coordinates.
function prim(f, geo, color, lx, y, lz, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  f.S.add(geo, color, mat(f.wx(lx, lz), y, f.wz(lx, lz), rx, f.yaw + ry, rz, sx, sy, sz));
}

// A walkable shallow pool (DESIGN §6.4): coping, flat water, a darker deep end, a few glints, and
// a `water` floor at CURB (blue on the minimap; the fins circle on it), flagged `pool` (the glide's
// landing, §10.7).
function pool(f, x0, z0, x1, z1, { coping = 0.8, deep = null, glints = 6, rnd = Math.random } = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  f.flat(TRIM, cx, cz, w + 2 * coping, d + 2 * coping, Y_LINE);
  f.flat(POOL, cx, cz, w, d, Y_WATER);
  f.flat(POOL_D, cx, cz, w - 1.2, 0.22, Y_DEEP);   // the tiled lane line along the middle
  if (deep) f.flat(POOL_D, (deep[0] + deep[1]) / 2, cz, deep[1] - deep[0], d, Y_DEEP);
  // A darker band inside the coping fakes the pool wall going down.
  const b = 0.35;
  f.flat(POOL_D, cx, z0 + b / 2, w, b, Y_GLINT); f.flat(POOL_D, cx, z1 - b / 2, w, b, Y_GLINT);
  f.flat(POOL_D, x0 + b / 2, cz, b, d - 2 * b, Y_GLINT); f.flat(POOL_D, x1 - b / 2, cz, b, d - 2 * b, Y_GLINT);
  for (let k = 0; k < glints; k++) {
    const gx = x0 + 1 + rnd() * (w - 2), gz = z0 + 0.8 + rnd() * (d - 1.6);
    f.flat(POOL_L, gx, gz, 0.6 + rnd() * 1.2, 0.12, Y_GLINT, rnd() * 0.6 - 0.3);
  }
  box(f.wx(x0, z0), f.wz(x0, z0), f.wx(x1, z1), f.wz(x1, z1), C, 'water').pool = true;
}

// A pool ladder: two chrome hoops over the coping edge (lz = the coping line, dir = into the pool).
function ladder(f, lx, lz, dir) {
  for (const s of [-0.3, 0.3]) {
    f.cyl(CHROME, lx + s, C + 0.5, lz + dir * 0.2, 0.04, 0.9, 6);
    f.boxC(CHROME, lx + s, C + 0.95, lz, 0.07, 0.07, 0.5);
    f.cyl(CHROME, lx + s, C + 0.5, lz - dir * 0.2, 0.04, 0.9, 6);
  }
}

// Canary palm (frame.tree 'palm') with optional tinsel spiral (DESIGN §6.4: tinsel on some palms).
function palm(f, lx, lz, s = 1.2, tinsel = false) {
  f.tree(lx, lz, s, 'palm');
  f.cyl(0x7a5a3a, lx, C + 0.25, lz, 0.38 * s, 0.5, 8);   // the swollen Canary-palm foot
  if (tinsel) for (let k = 0; k < 14; k++) {
    const a = k * 0.95, y = C + 0.7 + k * 0.33 * s;
    f.boxC(k % 2 ? GOLD : RED, lx + Math.cos(a) * 0.25 * s, y, lz + Math.sin(a) * 0.25 * s, 0.16, 0.1, 0.16, a);
  }
}

// Bougainvillea: a green clump spotted with magenta.
function bougainvillea(f, lx, lz, s = 1, rnd = Math.random) {
  f.ico(LEAF2, lx, C + 0.6 * s, lz, 1.4 * s);
  for (let k = 0; k < 5; k++) {
    const a = rnd() * PI * 2, r = 0.45 * s;
    f.ico(BOUG, lx + Math.cos(a) * r, C + (0.6 + rnd() * 0.5) * s, lz + Math.sin(a) * r, 0.55 * s);
  }
  f.circ(lx, lz, 0.55 * s, C + 1.2 * s, 'hedge');
}

// Agave: a rosette of blades leaning outwards.
function agave(f, lx, lz, s = 1) {
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * PI * 2 + 0.3;
    f.boxC(0x6f9c72, lx + Math.sin(a) * 0.3 * s, C + 0.42 * s, lz + Math.cos(a) * 0.3 * s, 0.2 * s, 0.95 * s, 0.07 * s, a, 0.7);
  }
}

// Cardón cactus: a fat trunk with two arms.
function cardon(f, lx, lz, s = 1) {
  const g = 0x5a8a4a;
  f.cyl(g, lx, C + 1.1 * s, lz, 0.24 * s, 2.2 * s, 8);
  f.cyl(g, lx + 0.5 * s, C + 1.45 * s, lz, 0.16 * s, 1.3 * s, 7);
  f.cyl(g, lx - 0.45 * s, C + 1.25 * s, lz, 0.15 * s, 1.0 * s, 7);
  f.boxC(g, lx + 0.25 * s, C + 0.85 * s, lz, 0.5 * s, 0.2 * s, 0.2 * s);
  f.boxC(g, lx - 0.22 * s, C + 0.8 * s, lz, 0.45 * s, 0.18 * s, 0.18 * s);
  f.circ(lx, lz, 0.35 * s, 99, 'tree');
}

// A bed of black picón gravel with a stone edge, the Canary garden look.
function piconBed(f, lx, lz, w, d) {
  f.flat(0xb8ab98, lx, lz, w + 0.3, d + 0.3, Y_LINE);
  f.flat(PICON, lx, lz, w, d, Y_WATER);
}

// Garden lamp: white post with a glowing globe (glow = the block's unlit bulb builder).
function gardenLamp(f, glow, lx, lz, h = 2.6) {
  f.cyl(TRIM, lx, C + h / 2, lz, 0.07, h, 8);
  f.cyl(STEEL, lx, C + 0.12, lz, 0.16, 0.24, 8);
  glow.ico(WARM, f.wx(lx, lz), C + h + 0.14, f.wz(lx, lz), 0.32, 1);
  f.cyl(STEEL, lx, C + h + 0.33, lz, 0.12, 0.06, 8);
  f.circ(lx, lz, 0.12, 99, 'pole');
}

// Parking sign: a blue P plate over a name strip, both faces, on a post that stops under the
// plate (Phase 3 r2: one two-line plate shrank the P to the name's size, and the post ran up
// through both faces).
function parkingSign(f, lx, lz, name) {
  f.box(STEEL, lx, C, lz, 0.1, 1.87, 0.1);
  f.circ(lx, lz, 0.1, 99, 'pole');
  f.box(STEEL, lx, C + 1.87, lz, 1.26, 1.16, 0.05);
  const o = { bg: '#2f5a8a', fg: '#fff8e6', border: '#fff8e6' };
  for (const s of [1, -1]) {
    const ly = s > 0 ? 0 : PI;
    f.sign('P', lx, C + 2.6, lz + s * 0.03, 1.2, 0.8, ly, { ...o, scale: 0.9 });
    f.sign(name, lx, C + 2.05, lz + s * 0.03, 1.2, 0.3, ly, { ...o, scale: 0.62, ppm: 192, borderW: 0.12 });
  }
}

// White plastic patio chair facing ly.
function chair(f, lx, lz, ly = 0) {
  const fx = Math.sin(ly), fz = Math.cos(ly);
  f.boxC(TRIM, lx, C + 0.43, lz, 0.46, 0.06, 0.46, ly);
  f.boxC(TRIM, lx - fx * 0.22, C + 0.7, lz - fz * 0.22, 0.46, 0.5, 0.05, ly, -0.12);
  for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
    f.boxC(TRIM, lx + a * fz + b * fx, C + 0.2, lz - a * fx + b * fz, 0.05, 0.42, 0.05, ly);
  }
}

// Straw parasol (thatched "palapa") over a round table with two chairs.
function strawParasol(f, lx, lz, table = true) {
  f.cyl(WOOD, lx, C + 1.3, lz, 0.07, 2.6, 6);
  f.cone(STRAW, lx, C + 2.75, lz, 1.7, 0.9, 10);
  f.cyl(0xc49a44, lx, C + 2.25, lz, 1.62, 0.22, 10);   // the fringe
  f.circ(lx, lz, 0.12, 99, 'pole');
  f.ceiling(lx, lz, 2.8, 2.8, C + 2.14, C + 3.2);        // the chase camera stays under the straw
  if (table) {
    f.cyl(TRIM, lx, C + 0.74, lz, 0.5, 0.05, 12);
    f.cyl(STEEL, lx, C + 0.37, lz + 0.001, 0.05, 0.74, 6);
    for (const s of [-1, 1]) chair(f, lx + s * 0.85, lz, s > 0 ? -PI / 2 : PI / 2);
    f.circ(lx, lz, 0.55, C + 0.8, 'furniture');
  }
}

// A balcony facade: bays along `axis` ('x': the face lies along x at lz = c; 'z': along z at
// lx = c) from u0 to u1, facing s (+1/-1). Floors 1..floors-1 get balconies (floor 0 is the
// ground floor, handled by the caller); y0 = top of floor 0's slab, fh = floor height.
function balconies(f, rnd, { axis, c, s, u0, u1, bays, y0, fh, floors, stripe = TERRA, depth = 1.35, awnP = 0.3, towelP = 0.45, plantP = 0.25, special = null, gallery = false }) {
  const L = u1 - u0, um = (u0 + u1) / 2;
  const B = (color, u, y, v, wu, h, wv) => (axis === 'x' ? f.box(color, u, y, c + s * v, wu, h, wv) : f.box(color, c + s * v, y, u, wv, h, wu));
  const BC = (color, u, y, v, wu, h, wv, tilt = 0) => (axis === 'x'
    ? f.boxC(color, u, y, c + s * v, wu, h, wv, 0, s * tilt, 0)
    : f.boxC(color, c + s * v, y, u, wv, h, wu, 0, 0, -s * tilt));
  const edges = [u0, ...bays.map((b) => b[1])];
  for (let k = 1; k < floors; k++) {
    const y = y0 + (k - 1) * fh;
    B(TRIM, um, y - 0.2, depth / 2, L + 0.3, 0.2, depth);              // balcony slab
    B(WHITE, um, y, depth - 0.06, L + 0.3, 0.95, 0.12);                 // parapet
    B(stripe, um, y + 0.95, depth - 0.06, L + 0.45, 0.09, 0.2);         // coloured coping
    for (const e of edges) B(WHITE, Math.max(u0 + 0.1, Math.min(u1 - 0.1, e)), y, depth / 2, 0.2, fh - 0.2, depth);
    for (const [b0, b1] of bays) {
      const bu = (b0 + b1) / 2, bw = b1 - b0;
      const sp = special && special(k, bu);
      if (gallery) {
        // Access gallery: two room doors and a small window per bay.
        for (const d of [-1, 1]) { B(WOOD, bu + d * bw / 4, y + 0.02, 0.03, 0.95, 2.1, 0.06); B(GOLD, bu + d * bw / 4 + 0.3, y + 1.0, 0.07, 0.06, 0.06, 0.04); }
        B(GLASS, bu, y + 1.05, 0.03, 1.1, 0.85, 0.06);
        if (axis === 'x') nightPane(f.wx(bu, c + s * 0.068), y + 1.475, f.wz(bu, c + s * 0.068), 1.05, 0.8, 0.004);
        else nightPane(f.wx(c + s * 0.068, bu), y + 1.475, f.wz(c + s * 0.068, bu), 0.004, 0.8, 1.05);
      } else {
        B(GLASS, bu, y + 0.05, 0.03, bw - 1.8, 2.3, 0.06);              // sliding glass door
        if (axis === 'x') nightPane(f.wx(bu, c + s * 0.068), y + 1.2, f.wz(bu, c + s * 0.068), bw - 1.85, 2.25, 0.004);
        else nightPane(f.wx(c + s * 0.068, bu), y + 1.2, f.wz(c + s * 0.068, bu), 0.004, 2.25, bw - 1.85);
        B(TRIM, bu, y + 2.35, 0.05, bw - 1.5, 0.1, 0.1);
        B(pick(CURTAINS, rnd), bu - (bw - 1.8) / 2 + 0.3, y + 0.1, 0.08, 0.5, 2.2, 0.04);
      }
      if (sp ? sp.awning : rnd() < awnP) {
        const col = sp ? sp.awning : pick(AWNINGS, rnd);
        BC(col, bu, y + 2.45, 0.75, bw - 0.5, 0.06, 1.5, 0.36);
        BC(TRIM, bu, y + 2.08, 1.45, bw - 0.5, 0.22, 0.04, 0);          // white valance
      }
      if (sp ? sp.towel : rnd() < towelP) {
        const tu = bu + (rnd() - 0.5) * (bw - 2), col = sp ? sp.towel : pick(TOWELS, rnd);
        B(col, tu, y + 0.3, depth + 0.02, 0.75, 0.7, 0.04);
        B(col, tu, y + 0.98, depth - 0.06, 0.75, 0.04, 0.22);
      }
      if (sp ? sp.plant : rnd() < plantP) {
        const pu = bu + (rnd() < 0.5 ? -1 : 1) * (bw / 2 - 0.7);
        BC(LEAF2, pu, y + 1.0, depth - 0.45, 0.7, 0.7, 0.7);
        BC(BOUG, pu + 0.2, y + 1.25, depth - 0.35, 0.35, 0.35, 0.35);
      }
    }
  }
}

// Plain window rows on an outer face (same axis convention as balconies).
function windows(f, { axis, c, s, u0, u1, step, y0, fh, floors, skip = () => false, w = 1.3, h = 1.25 }) {
  const B = (color, u, y, v, wu, hh, wv) => (axis === 'x' ? f.box(color, u, y, c + s * v, wu, hh, wv) : f.box(color, c + s * v, y, u, wv, hh, wu));
  const n = Math.floor((u1 - u0) / step);
  const start = (u0 + u1) / 2 - ((n - 1) * step) / 2;
  for (let k = 0; k < floors; k++) {
    const y = y0 + k * fh;
    if (k > 0) B(TRIM, (u0 + u1) / 2, y - 0.14, 0.04, u1 - u0, 0.14, 0.08);   // floor line
    for (let q = 0; q < n; q++) {
      const u = start + q * step;
      if (skip(u, k)) continue;
      B(GLASS, u, y + 0.85, 0.03, w, h, 0.06);
      if (axis === 'x') nightPane(f.wx(u, c + s * 0.068), y + 0.85 + h / 2, f.wz(u, c + s * 0.068), w - 0.05, h - 0.05, 0.004);
      else nightPane(f.wx(c + s * 0.068, u), y + 0.85 + h / 2, f.wz(c + s * 0.068, u), 0.004, h - 0.05, w - 0.05);
      B(TRIM, u, y + 0.75, 0.1, w + 0.3, 0.1, 0.2);
      B(TRIM, u, y + 0.85 + h, 0.04, w + 0.2, 0.08, 0.08);
    }
  }
}

// One unlit mesh for a block's glowing bulbs (lamp globes, footlights, string lights).
function addGlow(scene, glow, visible = true) {
  if (glow.empty) return null;
  const m = new THREE.Mesh(glow.build(), MAT.mouth);
  m.visible = visible;
  scene.add(m);
  return m;
}

// A sagging string of coloured bulbs from a to b (local x, absolute y, local z).
function stringLights(f, glow, ax, ay, az, bx, by, bz, n, sag = 0.8) {
  const cols = [RED, SUN, GREEN, 0x3a8ad8, ORANGE];
  let px = 0, py = 0, pz = 0;
  for (let k = 0; k <= n; k++) {
    const t = k / n, lx = ax + (bx - ax) * t, lz = az + (bz - az) * t;
    const x = f.wx(lx, lz), z = f.wz(lx, lz), y = ay + (by - ay) * t - sag * 4 * t * (1 - t);
    if (k > 0) {
      const dx = x - px, dy = y - py, dz = z - pz, l = Math.hypot(dx, dy, dz);
      glow.box(0x2a2a2e, (x + px) / 2, (y + py) / 2, (z + pz) / 2, 0.03, 0.03, l, Math.atan2(dx, dz), -Math.asin(dy / l));
    }
    if (k > 0 && k < n) glow.ico(cols[k % cols.length], x, y - 0.12, z, 0.2, 0);
    px = x; py = y; pz = z;
  }
}

// ================================================================================================
// HOTEL FLAMENCO (3,3): the 7-storey slab x [-26, 26], z [-27, -14]; pool deck south, parking lot
// west, Pepes Bodega on the north side facing the road to SunTrip.

const SX = 26, SZ0 = -27, SZ1 = -14, GH = 3.8, FH = 3.0, NF = 6;
const Y1 = C + GH, ROOF = Y1 + NF * FH;
const ROOM_BACK = -21.5;     // back wall of the two open ground-floor rooms (107 and 113)
const BAYS = [[-26, -21], [-21, -15], [-15, -9], [-9, -3], [-3, 3], [3, 9], [9, 15], [15, 21], [21, 26]];
const OPEN_ROOMS = { 1: '107', 7: '113' };            // bay index -> room (Stig & Ole west, 113 east)
const CLOSED_ROOMS = { 0: '105', 2: '109', 6: '111', 8: '115' };
const POOL_X0 = -14, POOL_X1 = 6, POOL_Z0 = 1.5, POOL_Z1 = 12.5;

function hotelFlamenco(f, W, ctx) {
  const rnd = ctx.rnd, glow = new GeoBuilder();
  NIGHT = new GeoBuilder(); NIGHT_RND = rnd;
  flamencoGround(f, W);
  flamencoSlab(f, rnd);
  flamencoRooms(f, rnd, glow);
  flamencoPorch(f, glow, rnd);
  flamencoPool(f, rnd, glow);
  flamencoBar(f, glow);
  flamencoLot(f, glow);
  flamencoBack(f);
  flamencoGardens(f, rnd, glow);
  pepesBodega(f, ctx.scene || f.scene);
  // Named car (§6.3): the default getInCar car and the test car; one more guest's car.
  f.car('sedan', -26, 22, PI, { name: 'hyrbil', color: 0xf4f4f0 });
  f.car('hatch', -20.4, 22, PI, { color: 0x2f5a8a });
  addGlow(f.scene, glow);
  nightMesh(f.scene);
  // `flamenco` faces the hotel (yaw π, landmarks-island.js since Phase 2), so its cutaway/views
  // camera stands on the pool deck instead of inside the slab.
}

function flamencoGround(f, W) {
  f.flat(PAVE, 0, 0, W, W, Y_BASE);
  f.flat(ASPH, -24.7, 14.5, 12.6, 33, Y_AREA);            // parking lot x [-31, -18.4], z [-2, 31]
  f.flat(ASPH, -28.65, -16.5, 4.7, 29, Y_AREA);           // service drive along the west gable
  f.flat(PAVE_D, -0.15, -29, 52.3, 4, Y_AREA);            // service yard behind the slab
  f.flat(TILE, -17.5, -11.25, 17, 5.5, Y_AREA);           // patios x [-26, -9], z [-14, -8.5]
  f.flat(TILE, 17.5, -11.25, 17, 5.5, Y_AREA);
  f.flat(0xd9a07a, 0, -10.6, 18, 9.2, Y_AREA);            // reception porch tiles
  f.flat(TERRA, 0, -6.15, 18, 0.3, Y_LINE);
  f.flat(DECK, 6.5, 15.25, 49, 31.5, Y_AREA);             // pool deck x [-18, 31], z [-0.5, 31]
  // Tile joints on the south deck so the big surface reads as paving.
  for (let x = -16; x <= 30; x += 4) f.flat(0xe2d8c4, x, 22.15, 0.08, 17.7, Y_LINE);
}

function flamencoSlab(f, rnd) {
  const midZ = (SZ0 + SZ1) / 2;
  // Mass: upper floors, then the ground floor around the two open rooms and the lobby recess.
  f.box(WHITE, 0, Y1, midZ, 2 * SX, NF * FH, SZ1 - SZ0);
  f.box(WHITE, 0, C, (SZ0 + ROOM_BACK) / 2, 2 * SX, GH, ROOM_BACK - SZ0);
  f.solid(0, (SZ0 + ROOM_BACK) / 2, 2 * SX, ROOM_BACK - SZ0, 99, 'building');
  BAYS.forEach(([x0, x1], i) => {
    if (OPEN_ROOMS[i] || (i >= 3 && i <= 5)) return;
    f.box(WHITE, (x0 + x1) / 2, C, (ROOM_BACK + SZ1) / 2, x1 - x0, GH, SZ1 - ROOM_BACK);
    f.solid((x0 + x1) / 2, (ROOM_BACK + SZ1) / 2, x1 - x0, SZ1 - ROOM_BACK, 99, 'building');
  });
  const LZ = -15.2;   // lobby glazing, set back under the slab
  f.box(WHITE, 0, C, (ROOM_BACK + LZ) / 2, 18, GH, LZ - ROOM_BACK);
  f.solid(0, (ROOM_BACK + LZ) / 2, 18, LZ - ROOM_BACK, 99, 'building');
  f.box(0x6f9ec0, 0, C + 0.05, LZ + 0.05, 18, GH - 0.15, 0.08);
  NIGHT?.box(0xffe0a0, f.wx(0, LZ + 0.1), C + GH / 2, f.wz(0, LZ + 0.1), 17.9, GH - 0.2, 0.004);   // the lobby, lit all night
  for (let x = -9; x <= 9; x += 2) f.box(TRIM, x, C, LZ + 0.1, 0.14, GH, 0.14);
  f.box(TRIM, 0, C + 2.7, LZ + 0.1, 18, 0.12, 0.14);
  f.box(GLASS_D, -3, C + 0.05, LZ + 0.12, 2.2, 2.5, 0.06);   // entrance doors
  for (const s of [-1, 1]) f.box(GOLD, -3 + s * 0.35, C + 1.0, LZ + 0.18, 0.06, 0.6, 0.05);

  // Ground-floor piers in terracotta tiles at the bay lines. Solid (Phase 3 r2): without a collider
  // the chase eye stood behind one in an open room's doorway, the frame all terracotta.
  for (const x of [-25.7, -21, -15, -9, 9, 15, 21, 25.7]) {
    f.box(TERRA, x, C, SZ1 + 0.15, 0.6, GH, 0.32);
    f.solid(x, SZ1 + 0.15, 0.6, 0.32, 99, 'building');
  }
  f.box(TERRA, 0, C + GH - 0.35, SZ1 + 0.1, 2 * SX + 0.2, 0.35, 0.22);   // band under the first balconies

  // South face: balcony rows; the one above 113 is Angerud's (orange awning, a red towel).
  balconies(f, rnd, {
    axis: 'x', c: SZ1, s: 1, u0: -SX, u1: SX, bays: BAYS, y0: Y1, fh: FH, floors: NF + 1,
    special: (k, bu) => (k === 1 && bu === 18 ? { awning: ORANGE, towel: RED, plant: true } : null),
  });
  // Angerud's deck chair on the 113 balcony, its back showing over the parapet.
  f.boxC(ORANGE, 19.6, Y1 + 1.05, SZ1 + 0.5, 0.65, 0.9, 0.06, 0, -0.35);
  // Camera ceilings (§14.3): the chase camera stays under the terracotta band over the patios and
  // the balcony row above them, and inside the open rooms 107 and 113 (from their back wall).
  f.ceiling(0, (ROOM_BACK + SZ1 + 1.35) / 2, 2 * SX + 0.3, SZ1 + 1.35 - ROOM_BACK, C + GH - 0.35, ROOF);

  // North face: access galleries, kitchen windows, the stair core with the back door.
  const NBAYS = Array.from({ length: 8 }, (_, k) => [-SX + k * 6.5, -SX + (k + 1) * 6.5]);
  balconies(f, rnd, { axis: 'x', c: SZ0, s: -1, u0: -SX, u1: SX, bays: NBAYS, y0: Y1, fh: FH, floors: NF + 1, depth: 1.25, awnP: 0, towelP: 0.25, plantP: 0.3, gallery: true });
  f.ceiling(0, SZ0 - 0.625, 2 * SX + 0.3, 1.25, Y1 - 0.2, ROOF);   // the camera stays under the galleries
  windows(f, { axis: 'x', c: SZ0, s: -1, u0: -SX, u1: SX, step: 6, y0: C + 0.55, fh: FH, floors: 1, w: 1.1, h: 0.8, skip: (u) => (u > 3 && u < 13) || Math.abs(u + 6) < 3 });
  f.box(TRIM, 0, Y1 - 0.14, SZ0 - 0.04, 2 * SX, 0.14, 0.08);
  f.box(WHITE, -6, C, SZ0 - 0.75, 4, ROOF + 3 - C, 1.5);
  f.solid(-6, SZ0 - 0.75, 4, 1.5, 99, 'building');
  f.box(GLASS, -6, Y1, SZ0 - 1.53, 0.8, NF * FH - 0.5, 0.06);
  f.box(TERRA, -6, C, SZ0 - 1.52, 4.05, 0.5, 0.06);
  f.box(WOOD_D, -6, C, SZ0 - 1.54, 1.3, 2.3, 0.08);                       // back door
  f.box(TRIM, -6, C + 2.45, SZ0 - 1.9, 2.0, 0.12, 0.8);                    // its little canopy
  f.ceiling(-6, SZ0 - 1.9, 2.0, 0.8, C + 2.45, C + 2.57);
  f.sign('SERVICIO · PRIVADO', -6, C + 2.85, SZ0 - 1.56, 2.2, 0.35, PI, { bg: '#fff8e6', fg: '#1d1426', scale: 0.62 });   // [N]

  // Gables: terracotta panels and a vertical FLAMENCO sign on both ends.
  for (const s of [-1, 1]) {
    f.box(TERRA, s * (SX + 0.03), Y1, midZ, 0.06, NF * FH, 6);
    f.sign('F\nL\nA\nM\nE\nN\nC\nO', s * (SX + 0.08), Y1 + NF * FH / 2, midZ, 2.6, 15, s * PI / 2,
      { bg: null, border: null, fg: '#fff8e6', stroke: '#1d1426', scale: 0.85 });
    f.box(GLASS, s * (SX + 0.03), C + 1.0, -24.5, 0.06, 1.2, 1.4);
    f.box(GLASS, s * (SX + 0.03), C + 1.0, -16.5, 0.06, 1.2, 1.4);
  }

  // Roof: terracotta cornice, parapet, tar, lift housing, water tanks, aerials and the big sign.
  f.box(TERRA, 0, ROOF - 0.3, midZ, 2 * SX + 0.5, 0.35, SZ1 - SZ0 + 0.5);
  f.box(0xcfc8bb, 0, ROOF, midZ, 2 * SX - 0.4, 0.05, SZ1 - SZ0 - 0.4);
  f.box(WHITE, 0, ROOF + 0.05, SZ0 + 0.12, 2 * SX, 0.7, 0.24);
  f.box(WHITE, 0, ROOF + 0.05, SZ1 - 0.12, 2 * SX, 0.7, 0.24);
  for (const s of [-1, 1]) f.box(WHITE, s * (SX - 0.12), ROOF + 0.05, midZ, 0.24, 0.7, SZ1 - SZ0);
  f.box(WHITE, -6, ROOF, -24.75, 4, 3.0, 4.5);
  f.box(TERRA, -6, ROOF + 3.0, -25.5, 4.3, 0.2, 6.3);
  for (const x of [11, 14]) {
    f.cyl(0xc8ccd0, x, ROOF + 1.5, -23, 0.95, 1.7, 14);
    for (const s of [-0.6, 0.6]) f.box(STEEL, x + s, ROOF, -23, 0.1, 0.65, 0.1);
  }
  for (const [x, z] of [[-18, -21], [-14, -24], [3, -21], [19, -24]]) {
    f.box(STEEL, x, ROOF, z, 0.07, 3.0, 0.07);
    for (let q = 0; q < 3; q++) f.box(STEEL, x, ROOF + 2.0 + q * 0.35, z, 1.4 - q * 0.3, 0.05, 0.05);
  }
  const SZS = SZ1 - 1.1;   // roof-sign line, just inside the south parapet
  for (const x of [-12, -4, 4, 12]) f.box(STEEL, x, ROOF, SZS - 0.1, 0.18, 5.6, 0.18);
  f.box(STEEL, 0, ROOF + 1.15, SZS - 0.1, 25, 0.14, 0.14);
  f.box(STEEL, 0, ROOF + 5.4, SZS - 0.1, 25, 0.14, 0.14);
  f.sign('HOTEL FLAMENCO', 0, ROOF + 3.3, SZS, 26, 3.8, 0,
    { bg: null, border: null, fg: '#d8321e', stroke: '#fff8e6', scale: 0.86, double: true });
}

// The ground-floor rooms along the south face. 107 (Stig & Ole, west) and 113 (Angerud, east) are
// open to their patios: the julafton room-113 scene camera stands inside 113 looking out.
function flamencoRooms(f, rnd, glow) {
  BAYS.forEach(([x0, x1], i) => {
    const bx = (x0 + x1) / 2, bw = x1 - x0, num = OPEN_ROOMS[i] || CLOSED_ROOMS[i];
    if (!num) return;
    if (CLOSED_ROOMS[i]) {
      const gw = bw - 2.0;
      f.box(GLASS, bx, C + 0.05, SZ1 + 0.03, gw, 2.45, 0.06);
      nightPane(f.wx(bx, SZ1 + 0.068), C + 1.27, f.wz(bx, SZ1 + 0.068), gw - 0.05, 2.4, 0.004);
      f.box(TRIM, bx, C + 2.5, SZ1 + 0.05, gw + 0.3, 0.12, 0.1);
      f.box(TRIM, bx, C + 0.05, SZ1 + 0.06, 0.1, 2.45, 0.08);
      const cc = pick(CURTAINS, rnd);
      f.box(cc, bx - gw / 2 + 0.35, C + 0.12, SZ1 + 0.08, 0.6, 2.3, 0.04);
      f.box(cc, bx + gw / 2 - 0.35, C + 0.12, SZ1 + 0.08, 0.6, 2.3, 0.04);
      // A planter with bougainvillea closes most of the patio front.
      f.box(TERRA_D, bx, C, -8.95, bw - 2.6, 0.55, 0.7);
      f.box(0x4a403c, bx, C + 0.55, -8.95, bw - 2.8, 0.04, 0.5);
      for (let q = 0; q < 3; q++) f.ico(q === 1 ? BOUG : LEAF2, bx + (q - 1) * (bw - 3.4) / 2, C + 0.95, -8.95, 0.75);
      f.solid(bx, -8.95, bw - 2.6, 0.7, C + 0.6, 'wall');
    } else {
      // Open room: tiled floor, lintel, curtains drawn to the sides, beds against the back wall.
      f.flat(TILE_L, bx, (ROOM_BACK + SZ1) / 2, bw, SZ1 - ROOM_BACK, Y_AREA);
      f.box(TRIM, bx, C + 3.45, SZ1 + 0.02, bw, GH - 3.45, 0.3);
      f.box(0xf2e6d0, x0 + 0.45, C + 0.1, SZ1 - 0.25, 0.55, 3.25, 0.06);
      f.box(0xf2e6d0, x1 - 0.45, C + 0.1, SZ1 - 0.25, 0.55, 3.25, 0.06);
      f.box(STEEL, bx, C + 3.38, SZ1 - 0.25, bw - 0.2, 0.05, 0.05);
      // Warm wallpaper on the three inner walls, a skirting board, a cream ceiling.
      const WALL = num === '113' ? 0xf0d9a8 : 0xd8ecd8;
      f.box(WALL, bx, C, ROOM_BACK + 0.02, bw - 0.1, GH - 0.02, 0.04);
      f.box(WALL, x0 + 0.02, C, (ROOM_BACK + SZ1) / 2, 0.04, GH - 0.02, SZ1 - ROOM_BACK - 0.6);
      f.box(WALL, x1 - 0.02, C, (ROOM_BACK + SZ1) / 2, 0.04, GH - 0.02, SZ1 - ROOM_BACK - 0.6);
      f.box(WOOD_D, bx, C, ROOM_BACK + 0.05, bw - 0.1, 0.12, 0.04);
      f.box(0xfff4dc, bx, Y1 - 0.03, (ROOM_BACK + SZ1) / 2, bw - 0.1, 0.02, SZ1 - ROOM_BACK - 0.4);
      glow.box(WARM, f.wx(bx, -17.5), Y1 - 0.08, f.wz(bx, -17.5), 0.6, 0.06, 0.6);   // ceiling light
      if (num === '107') stigOleRoom(f, bx);
      else room113(f, bx);
    }
    // Room number: an open room's on its right-hand terracotta pier; a closed room's centred on the
    // wall above its own glass door (at the bay's edge it read as the next room's opening's number).
    const open = !!OPEN_ROOMS[i];
    f.sign(num, open ? x1 : bx, C + (open ? 2.1 : 2.95), SZ1 + (open ? 0.33 : 0.09), 0.5, 0.3, 0, { bg: '#fff8e6', fg: '#1d1426', border: '#c0623a', scale: 0.7 });
    // Patio set at the back corner.
    const tx = x0 + 1.25, tz = -12.7;
    f.cyl(TRIM, tx, C + 0.72, tz, 0.38, 0.05, 12);
    f.cyl(STEEL, tx, C + 0.36, tz, 0.04, 0.72, 6);
    chair(f, tx + 0.75, tz, -PI / 2);
    chair(f, tx, tz + 0.75, PI);
    f.circ(tx, tz, 0.42, C + 0.8, 'furniture');
  });
  // Patio dividers: low white walls with terracotta caps (the patios stay open at the front).
  for (const x of [-21, -15, -9, 9, 15, 21]) {
    f.box(WHITE, x, C, -12.3, 0.22, 1.0, 3.4);
    f.box(TERRA, x, C + 1.0, -12.3, 0.3, 0.08, 3.5);
    f.solid(x, -12.3, 0.22, 3.4, C + 1.08, 'wall');
  }
  // Angerud's lounger on the 113 patio.
  f.boxC(0xe8e0d0, 19.9, C + 0.35, -12.4, 0.7, 0.08, 1.7, 0, 0);
  f.boxC(ORANGE, 19.9, C + 0.6, -13.25, 0.7, 0.08, 0.7, 0, 0.9);
  for (const z of [-13.0, -11.8]) f.box(STEEL, 19.9, C, z, 0.6, 0.3, 0.05);
  f.solid(19.9, -12.6, 0.7, 1.9, C + 0.5, 'furniture');
}

function bed(f, x, z, w, blanket) {
  f.box(WOOD, x, C, z, w, 0.32, 2.05);
  f.box(TRIM, x, C + 0.32, z, w - 0.06, 0.18, 1.98);
  f.box(blanket, x, C + 0.5, z + 0.3, w - 0.02, 0.05, 1.35);
  f.box(TRIM, x, C + 0.5, z - 0.75, w - 0.3, 0.12, 0.38);
  f.solid(x, z, w, 2.05, C + 0.55, 'furniture');
}

// Room 107: Stig-Helmer and Ole share it (overbooking). Two single beds, Ole's boombox.
function stigOleRoom(f, bx) {
  const z = ROOM_BACK + 1.05;
  bed(f, bx - 1.75, z, 1.0, 0x1e9aa0);
  bed(f, bx + 1.75, z, 1.0, ORANGE);
  f.box(WOOD_D, bx, C, ROOM_BACK + 0.3, 0.7, 0.55, 0.45);
  f.box(INK, bx, C + 0.55, ROOM_BACK + 0.3, 0.55, 0.28, 0.2);            // Ole's boombox
  f.cyl(CHROME, bx - 0.15, C + 0.69, ROOM_BACK + 0.41, 0.07, 0.02, 10, PI / 2);
  f.cyl(CHROME, bx + 0.15, C + 0.69, ROOM_BACK + 0.41, 0.07, 0.02, 10, PI / 2);
  f.box(SUN, bx, C + 1.5, ROOM_BACK + 0.03, 1.4, 0.95, 0.04);            // a sunny print
  f.box(ORANGE, bx, C + 1.65, ROOM_BACK + 0.05, 0.6, 0.6, 0.03);
  f.box(WOOD, bx - 2.55, C, -15.6, 0.8, 2.0, 1.4);                        // wardrobe
  f.solid(bx - 2.55, -15.6, 0.8, 1.4, 99, 'furniture');
}

// Room 113: director Angerud's. A double bed, his "röka" on the night stand, his suitcase.
function room113(f, bx) {
  const z = ROOM_BACK + 1.1;
  bed(f, bx, z, 1.9, 0x8a2a3a);
  f.box(WOOD_D, bx, C, ROOM_BACK + 0.06, 2.2, 1.15, 0.12);               // headboard
  for (const s of [-1, 1]) f.box(WOOD_D, bx + s * 1.45, C, ROOM_BACK + 0.3, 0.55, 0.55, 0.45);
  f.box(RED, bx + 1.45, C + 0.55, ROOM_BACK + 0.32, 0.1, 0.05, 0.15);      // the cigarettes
  f.cyl(0xc8ccd0, bx - 1.45, C + 0.6, ROOM_BACK + 0.3, 0.12, 0.08, 10);   // ashtray
  f.box(WOOD, bx + 2.45, C, -17.5, 0.9, 2.1, 1.6);                        // wardrobe
  f.solid(bx + 2.45, -17.5, 0.9, 1.6, 99, 'furniture');
  f.box(INK, bx - 2.4, C, -16.2, 0.62, 0.78, 0.26);                       // suitcase
  f.box(0x8a5a3a, bx, C + 1.55, ROOM_BACK + 0.04, 1.6, 0.8, 0.04);         // a bullfight print
  f.box(RED, bx, C + 1.6, ROOM_BACK + 0.06, 0.5, 0.5, 0.03);
}

// Open reception porch (§6.3): canopy, porter desk with key board, plastic Christmas tree.
// The porter stands at flamencoRecepcion (2, -10) facing the guests; the desk is behind him, so
// every outro placement south of him stays free.
function flamencoPorch(f, glow, rnd) {
  // A slatted pergola (x [-9.5, 9.5], z [-14, -6.2]) overgrown with bougainvillea: shade with
  // sunlight in stripes, and room for the camera to see through.
  for (let x = -9.25; x <= 9.3; x += 0.75) f.box(TRIM, x, C + 3.6, -10.1, 0.16, 0.3, 7.8);
  f.box(TRIM, 0, C + 3.4, -10.1, 19.2, 0.2, 0.22);
  f.box(TERRA, 0, C + 3.1, -6.15, 19.2, 0.75, 0.3);           // fascia
  f.box(TERRA, 0, C + 3.85, -6.12, 12.4, 0.82, 0.12);         // the name panel standing on it
  f.ceiling(0, -10.1, 19.2, 7.9, C + 3.1, C + 4.7);             // the camera stays under it
  for (let k = 0; k < 16; k++) {
    const x = -8.8 + rnd() * 17.6, z = -13.4 + rnd() * 6.6;
    f.ico(k % 3 ? BOUG : LEAF2, x, C + 3.95 + rnd() * 0.2, z, 0.7 + rnd() * 0.6);
  }
  for (const x of [-8.6, -4.2, 4.2, 8.6]) f.ico(LEAF2, x, C + 3.2, -5.95, 0.55);
  // The name stands above the fascia: on it, it filled the top of the frame from under the pergola.
  f.sign('HOTEL FLAMENCO · RECEPCIÓN', 0, C + 4.28, -6.04, 12, 0.6, 0,
    { bg: '#c0623a', fg: '#fff8e6', border: null, scale: 0.72 });
  // A Christmas garland with baubles across the fascia's face (Phase 3 r2: it hung under the fascia,
  // where the chase eye, capped under the pergola, met it).
  f.cyl(0x2f6a3a, 0, C + 3.5, -5.95, 0.12, 19, 8, 0, PI / 2);
  for (let x = -9; x <= 9; x += 1.5) f.sphere(x % 3 === 0 ? RED : GOLD, x, C + 3.32, -5.9, 0.2);
  for (const s of [-1, 1]) {
    f.cyl(TRIM, s * 9.3, C + 1.65, -6.6, 0.22, 3.3, 12);
    f.cyl(TERRA, s * 9.3, C + 0.2, -6.6, 0.3, 0.4, 12);
    f.circ(s * 9.3, -6.6, 0.3, 99, 'pole');
  }
  for (const x of [-6, 0, 6]) {   // hanging lanterns
    f.box(INK, x, C + 2.95, -10.1, 0.03, 0.45, 0.03);
    f.cyl(INK, x, C + 2.95, -10.1, 0.2, 0.06, 8);
    glow.ico(WARM, f.wx(x, -10.1), C + 2.72, f.wz(x, -10.1), 0.36, 1);
  }

  // Porter's desk and the key board behind it.
  f.box(WOOD, 2, C, -11.2, 4.0, 1.05, 0.8);
  f.box(TERRA, 2, C + 0.1, -10.79, 3.9, 0.7, 0.02);
  f.box(TRIM, 2, C + 1.05, -11.2, 4.2, 0.08, 0.95);
  f.sphere(GOLD, 3.3, C + 1.18, -10.95, 0.16, 0.1, 0.16);       // the bell
  f.box(0x8a2a2a, 1.0, C + 1.13, -11.0, 0.5, 0.05, 0.35);        // guest book
  f.box(WOOD_D, 2, C, -12.65, 4.2, 2.6, 0.2);
  for (let r = 0; r < 4; r++) for (let q = 0; q < 8; q++) {
    f.box(0x3a2a1a, 0.25 + q * 0.5, C + 1.25 + r * 0.32, -12.53, 0.38, 0.24, 0.05);
    if ((r * 3 + q * 5) % 4 !== 0) f.box(GOLD, 0.25 + q * 0.5, C + 1.3 + r * 0.32, -12.5, 0.06, 0.12, 0.03);
  }
  f.sign('RECEPCIÓN', 2, C + 2.85, -12.53, 3.6, 0.5, 0, { bg: '#fff8e6', fg: '#1d1426', border: '#c0623a', scale: 0.62 });
  f.sign('HÄR TALAS SVENSKA', 0.55, C + 1.32, -10.74, 1.0, 0.24, 0, { bg: '#2f5a8a', fg: '#f7c31b', border: null, scale: 0.6 });   // §6.9 [N]
  f.solid(2, -11.75, 4.2, 1.9, C + 2.75, 'desk');

  // Plastic Christmas tree in the lobby, potted palms, a luggage trolley and a bench.
  f.prop('julgran', -7.3, -12.6);
  f.prop('palmkruka', -8.3, -7.7);
  f.prop('palmkruka', 8.3, -7.7);
  f.prop('bagagevagn', 6.6, -13.1, 0.4);
  f.prop('bank', -5.5, -14.55, 0);
}

// Pool deck (§6.3): the walkable shallow pool, the depth sign, diving board, sunbeds, toys.
function flamencoPool(f, rnd, glow) {
  pool(f, POOL_X0, POOL_Z0, POOL_X1, POOL_Z1, { deep: [POOL_X0, -7], glints: 9, rnd });
  // Depth markings painted on the coping, readable from the south.
  for (const [t, x] of [['3 M', -10.5], ['1 M', 2.5]]) {
    const m = f.sign(t, x, Y_LINE + 0.012, POOL_Z1 + 0.42, 1.1, 0.45, 0, { bg: null, border: null, fg: '#1c4f8a', scale: 0.8 });
    m.rotation.set(-PI / 2, 0, 0);
  }
  // The sign: the bungalow seller's line, relocated [F*].
  for (const x of [-12.8, -9.2]) { f.box(STEEL, x, C, 14.6, 0.1, 2.5, 0.1); f.circ(x, 14.6, 0.12, 99, 'pole'); }
  f.sign('TRE METER DJUPT I ENA ÄNDEN,\nEN METER I DEN ANDRA.\nBARNVÄNLIG!', -11, C + 1.75, 14.66, 4.0, 1.5, 0,
    { bg: '#fff8e6', fg: '#1c4f8a', border: '#1c7fb8', scale: 0.62, double: true });   // [F*]
  ladder(f, 4.5, POOL_Z0 - 0.4, 1);
  ladder(f, -11, POOL_Z0 - 0.4, 1);
  // Diving board at the deep end: a bounce pad (jump on it) that drops you in the "three metres".
  f.box(0xe8e4da, -15.75, C, 7, 1.1, 0.55, 1.1);
  f.solid(-15.75, 7, 1.1, 1.1, C + 0.55, 'step');
  f.box(STEEL, -14.6, C, 7, 0.18, 0.72, 0.5);
  f.box(TRIM, -14.1, C + 0.72, 7, 3.6, 0.1, 0.62);
  f.box(0x1e9aa0, -14.1, C + 0.82, 7, 3.4, 0.02, 0.5);
  f.solid(-14.1, 7, 3.6, 0.62, C + 0.82, 'bounce');
  // Pool toys: a ring and an air mattress (flat on the water).
  prim(f, PRIM.torus(), RED, 1.2, Y_GLINT + 0.05, 4.0, 1.4, 1.4, 1.4, PI / 2);
  f.boxC(SUN, -8.5, Y_GLINT + 0.06, 10.6, 0.8, 0.12, 1.9, 0.5);
  // Sunbeds and parasols on the deck (props: kickable, drive-overable at speed).
  for (const x of [3.4, 5.0, 6.6, 8.2]) { f.prop('solstol', x, 16.6, 0); f.prop('solstol', x, 21.6, 0); }
  for (const z of [2.6, 4.6, 6.6, 8.6, 10.6]) f.prop('solstol', 8.9, z, PI / 2);
  for (const z of [17.5, 20.5, 24]) f.prop('solstol', -16.2, z, 0);
  f.prop('parasoll', 4.2, 19.1); f.prop('parasoll', 7.4, 19.1);
  f.prop('parasoll', 10.2, 5.6); f.prop('parasoll', 10.2, 9.6);
  f.prop('parasoll', -15.2, 19.0);
  f.prop('dusch', 7.2, 0.4);
  strawParasol(f, 12.6, 6.0);
  strawParasol(f, 12.6, 18.0);
  strawParasol(f, 21.0, 21.5);
  strawParasol(f, 4.8, 25.8);
  // The Christmas-party tree (julafton) beside the guests' spot by the pool corner, in the party
  // shot (PARTY_CAM, 22° right of its axis) and the sunset duet (30°); the GOD JUL banner is
  // behind both cameras.
  f.prop('julgran', 2.2, 16.0);
  // Party banner over the south gate, facing the pool, string lights to the palms.
  for (const x of [-6.6, 0.6]) { f.box(WOOD, x, C, 29.9, 0.16, 3.4, 0.16); f.circ(x, 29.9, 0.14, 99, 'pole'); }
  f.sign('GOD JUL · FELIZ NAVIDAD', -3, C + 2.95, 29.9, 7.0, 0.75, PI, { bg: '#d8321e', fg: '#fff8e6', border: '#f2c12e', scale: 0.66, double: true });   // §6.9 [N]
  stringLights(f, glow, -6.6, C + 3.4, 29.9, -9.5, C + 4.2, 27.5, 5, 0.3);
  stringLights(f, glow, 0.6, C + 3.4, 29.9, 9.5, C + 4.2, 27.8, 8, 0.5);
}

// Pool bar (§6.3: "BAR PISCINA · SVENSKT KAFFE" under straw). Berra holds court at flamencoBar
// (16, 12), facing the pool with the counter at his back.
function flamencoBar(f, glow) {
  f.box(WHITE, 22.25, C, 12, 4.5, 2.7, 8);                        // kiosk x [20, 24.5], z [8, 16]
  f.solid(22.25, 12, 4.5, 8, 99, 'building');
  f.box(TERRA, 22.25, C, 12, 4.6, 0.4, 8.1);
  f.box(WOOD, 18.05, C, 12, 0.9, 1.1, 7.6);                       // counter x [17.6, 18.5]
  f.box(TRIM, 17.95, C + 1.1, 12, 1.2, 0.08, 7.8);
  for (let z = 8.8; z <= 15.2; z += 1.6) f.box(STRAW, 17.58, C + 0.1, z, 0.04, 0.9, 0.7);
  f.solid(18.05, 12, 0.9, 7.6, C + 1.15, 'bar');
  // Shelves of bottles on the kiosk wall, a percolator for the Swedish coffee.
  const bottles = [GREEN, 0x8a2a2a, GOLD, 0x6a9ac8];
  for (const y of [1.25, 1.85]) {
    f.box(WOOD_D, 19.85, C + y, 12, 0.3, 0.05, 6.5);
    let q = 0;
    for (let z = 9.2; z <= 14.8; z += 0.45) f.cyl(bottles[q++ % 4], 19.85, C + y + 0.2, z, 0.07, 0.36, 6);
  }
  f.cyl(CHROME, 18.0, C + 1.35, 9.2, 0.2, 0.42, 10);
  f.cyl(INK, 18.0, C + 1.6, 9.2, 0.12, 0.1, 10);
  for (const z of [9.3, 10.6, 14.6]) {
    f.cyl(CHROME, 17.0, C + 0.38, z, 0.04, 0.76, 6);
    f.cyl(RED, 17.0, C + 0.78, z, 0.22, 0.08, 10);
  }
  // Thatched roof over kiosk, bartender aisle and counter; a fringe round the eaves.
  f.roof(STRAW, 21.0, C + 2.7, 12, 10.2, 1.8, 8.6, PI / 2);
  for (const z of [6.95, 17.05]) f.box(0xc49a44, 21.0, C + 2.45, z, 8.6, 0.3, 0.1);
  f.box(0xc49a44, 25.25, C + 2.45, 12, 0.1, 0.3, 10.2);
  for (const z of [7.3, 16.7]) for (const x of [17.3, 24.7]) { f.cyl(WOOD, x, C + 1.3, z, 0.1, 2.6, 6); f.circ(x, z, 0.12, 99, 'pole'); }
  f.box(WOOD_D, 16.8, C + 2.15, 12, 0.08, 0.62, 5.2);
  f.sign('BAR PISCINA · SVENSKT KAFFE', 16.74, C + 2.46, 12, 5.0, 0.5, -PI / 2,
    { bg: '#f7c31b', fg: '#d8321e', border: '#1d1426', scale: 0.66 });   // §6.3 [N]
  // The chase camera stays under the thatch (its fringe's bottom edge) all round the kiosk, and
  // over the counter and the bartender's aisle under the sign board's bottom edge (front edge x 16.7
  // to the kiosk wall).
  f.ceiling(21.0, 12, 8.6, 10.2, C + 2.45, C + 4.5);
  f.ceiling(18.35, 12, 3.3, 10.2, C + 2.15, C + 4.5);
  for (const z of [6.85, 17.15]) stringLights(f, glow, 16.8, C + 2.55, z, 25.2, C + 2.55, z, 7, 0.25);
  f.prop('automat', 24.9, 5.9, -PI / 2);
  f.prop('papelera', 16.4, 17.2);
}

// Parking lot west of the pool (§6.3 flamencoDrive, the hyrbil's spot); service drive to the back.
function flamencoLot(f, glow) {
  for (const z0 of [8, 19.5]) {
    for (const x of [-30.2, -27.4, -24.6, -21.8, -19]) f.flat(STRIPE, x, z0 + 2.5, 0.12, 5, Y_LINE);
    f.flat(STRIPE, -24.6, z0 + (z0 < 10 ? 0 : 5), 11.2, 0.12, Y_LINE);
  }
  // Hedge between the lot and the pool deck, with a gap for the path.
  for (const [z0, z1] of [[-0.5, 12], [16, 30.3]]) {
    const zc = (z0 + z1) / 2, d = z1 - z0;
    f.box(0x4f8a3a, -18, C, zc, 0.8, 1.05, d);
    let q = 0;
    for (let z = z0 + 0.8; z < z1; z += 2.3) f.ico(q++ % 2 ? BOUG : LEAF2, -18, C + 1.05, z, 0.7);
    f.solid(-18, zc, 0.8, d, C + 1.15, 'hedge');
  }
  // Parking sign at the south entrance; lamps along the hedge (the west side stays open for the bus).
  parkingSign(f, -18.0, 30.9, 'HOTEL FLAMENCO');
  for (const z of [-1.2, 14]) gardenLamp(f, glow, -18.9, z, 3.2);
}

// Behind the hotel: service yard, bins, butano bottles (the grisbil drives home to flamencoBack).
function flamencoBack(f) {
  for (const x of [-15, -12.6]) {
    f.box(0x2f6a3a, x, C, -29.5, 2.1, 1.25, 1.2);
    f.boxC(0x245a30, x, C + 1.32, -29.5, 2.15, 0.12, 1.25, 0, 0.1);
    f.solid(x, -29.5, 2.1, 1.2, C + 1.4, 'bin');
  }
  f.prop('butano', -8.5, -29.0); f.prop('butano', -8.9, -29.6); f.prop('butano', -3.4, -29.2);
  f.prop('tomatlada', -1.2, -29.5); f.prop('tomatlada', 0.2, -29.7, 0.3);
  f.prop('papelera', 1.6, -30.5);
  // Air-con units, 0.4 m deep: under the galleries the chase eye keeps 0.45 m off the wall.
  for (const x of [-20, 16, 22]) { f.box(0xb8bcc2, x, C + 2.8, SZ0 - 0.2, 1.0, 0.7, 0.4); f.box(STEEL, x, C + 2.8, SZ0 - 0.42, 0.8, 0.5, 0.05); }
  for (const x of [17.5, 23.5]) cardon(f, x, -29.4, 0.9);
  agave(f, 20.5, -29.5, 1.1);
  agave(f, 14.2, -29.3, 0.9);
}

// Pepes Bodega (§6.3): a whitewashed annex x [4, 12], z [-31, -27] on the slab's north side,
// green door and sign facing the road to SunTrip. In plain sight all game; worldHooks.bodegaLit
// lights it after julafton (unlock 'bodega').
function pepesBodega(f, scene) {
  const H = 3.4, front = -31;
  f.box(WHITE, 8, C, -29, 8, H, 4);
  f.solid(8, -29, 8, 4, 99, 'building');
  f.box(TERRA, 8, C + H, -29.1, 8.5, 0.22, 4.4);
  f.roof(TERRA_D, 8, C + H + 0.22, front + 0.6, 8.6, 0.55, 1.3);           // a strip of roof tiles
  f.box(0xb8ab98, 8, C, front - 0.02, 8.05, 0.35, 0.06);                   // grey plinth
  for (const x of [5.3, 10.7]) {
    f.box(INK, x, C + 1.0, front - 0.03, 1.0, 1.2, 0.06);
    for (const s of [-1, 1]) f.box(GREEN, x + s * 0.78, C + 0.95, front - 0.05, 0.5, 1.3, 0.06);
    for (let q = -1.5; q <= 1.5; q++) f.box(INK, x + q * 0.25, C + 1.0, front - 0.09, 0.04, 1.2, 0.04);
    f.box(TRIM, x, C + 0.92, front - 0.12, 1.3, 0.08, 0.22);
  }
  for (const s of [-1, 1]) f.box(WOOD_D, 8 + s * 0.78, C, front - 0.05, 0.14, 2.5, 0.1);   // door frame
  f.box(WOOD_D, 8, C + 2.4, front - 0.05, 1.7, 0.12, 0.1);
  f.box(INK, 8, C, front - 0.01, 1.42, 2.4, 0.02);                           // dark doorway
  // Lantern bracket (its glass glows when lit).
  f.box(INK, 9.5, C + 2.45, front - 0.3, 0.06, 0.06, 0.55);
  f.box(INK, 9.5, C + 2.0, front - 0.55, 0.36, 0.06, 0.36);
  // A wine-barrel table and a chalk board (the film's "80-procentig rom på vinflaskor").
  f.cyl(WOOD, 12.95, C + 0.5, -31.6, 0.42, 1.0, 12);
  f.cyl(INK, 12.95, C + 0.75, -31.6, 0.44, 0.06, 12);
  f.cyl(INK, 12.95, C + 0.25, -31.6, 0.44, 0.06, 12);
  f.circ(12.95, -31.6, 0.45, C + 1.0, 'furniture');
  for (const x of [3.3, 2.5]) f.box(WOOD, x, C + 0.02, -31.55, 0.04, 1.1, 0.5);
  f.sign('RON 80 %\nVINO DE LA CASA', 2.9, C + 0.85, -31.6, 0.8, 0.95, PI, { bg: '#2a3a2e', fg: '#f4efe6', border: '#8a5a32', scale: 0.5, double: true });   // [F*] the film's rumour
  f.prop('tunna', 4.7, -31.6);
  f.prop('tunna', 11.3, -31.6);
  f.prop('tunna', 14.0, -31.45);

  // Switchable parts: dull sign + shut door (default) vs lit sign + bulbs + open door.
  const SIGN = 'PEPES BODEGA\nVINOS · RON';
  const unlit = f.sign(SIGN, 8, C + 2.92, front - 0.08, 5.6, 0.9, PI, { bg: '#6f8a62', fg: '#efe4c8', border: '#4a5a40', scale: 0.62 });
  const lit = f.sign(SIGN, 8, C + 2.92, front - 0.08, 5.6, 0.9, PI, { bg: '#2f8a4a', fg: '#fff8e6', border: '#f7c31b', scale: 0.62 });
  const shutSign = f.sign('CERRADO', 8, C + 1.75, front - 0.14, 0.75, 0.25, PI, { bg: '#fff8e6', fg: '#d8321e', border: '#d8321e', scale: 0.62 });
  const openSign = f.sign('ABIERTO', 9.3, C + 1.15, front - 0.14, 0.75, 0.25, PI, { bg: '#fff8e6', fg: '#2f8a4a', border: '#2f8a4a', scale: 0.62 });

  const shut = new GeoBuilder();
  shut.box(GREEN, f.wx(8, front - 0.08), C + 1.2, f.wz(8, front - 0.08), 1.35, 2.3, 0.06);
  shut.box(GOLD, f.wx(7.6, front - 0.13), C + 1.1, f.wz(7.6, front - 0.13), 0.08, 0.08, 0.05);
  for (let q = 0; q < 3; q++) shut.box(0x24703a, f.wx(8, front - 0.12), C + 0.5 + q * 0.75, f.wz(8, front - 0.12), 1.1, 0.5, 0.02);
  const doorShut = toonMesh(shut.build(), { outline: 0.045 });
  scene.add(doorShut);
  const open = new GeoBuilder();
  open.box(GREEN, f.wx(7.3, front - 0.72), C + 1.2, f.wz(7.3, front - 0.72), 0.06, 2.3, 1.35);
  open.box(GOLD, f.wx(7.25, front - 1.2), C + 1.1, f.wz(7.25, front - 1.2), 0.05, 0.08, 0.08);
  const doorOpen = toonMesh(open.build(), { outline: 0.045 });
  scene.add(doorOpen);

  const bulbs = new GeoBuilder();
  bulbs.box(0xffc860, f.wx(8, front - 0.03), C + 1.2, f.wz(8, front - 0.03), 1.4, 2.38, 0.02);       // warm doorway
  bulbs.box(0xffd27a, f.wx(9.5, front - 0.55), C + 1.78, f.wz(9.5, front - 0.55), 0.26, 0.4, 0.26);  // lantern
  for (const x of [5.3, 10.7]) bulbs.box(0xffb850, f.wx(x, front - 0.064), C + 1.6, f.wz(x, front - 0.064), 0.9, 1.1, 0.006);
  const cols = [RED, SUN, GREEN, ORANGE];
  let n = 0;
  const ring = (x0, y0, x1, y1, steps) => {
    for (let k = 0; k < steps; k++) {
      const t = k / steps, lx = x0 + (x1 - x0) * t;
      bulbs.ico(cols[n++ % 4], f.wx(lx, front - 0.16), y0 + (y1 - y0) * t, f.wz(lx, front - 0.16), 0.15, 0);
    }
  };
  const bx0 = 5.05, bx1 = 10.95, by0 = C + 2.4, by1 = C + 3.42;
  ring(bx0, by0, bx1, by0, 16); ring(bx1, by0, bx1, by1, 3); ring(bx1, by1, bx0, by1, 16); ring(bx0, by1, bx0, by0, 3);
  const glowMesh = addGlow(scene, bulbs, false);

  const set = (on) => {
    on = !!on;
    unlit.visible = !on; lit.visible = on;
    shutSign.visible = !on; openSign.visible = on;
    doorShut.visible = !on; doorOpen.visible = on;
    if (glowMesh) glowMesh.visible = on;
  };
  set(false);
  worldHooks.bodegaLit = set;
}

// Gardens between the patios and the pool, palm rows, the south wall with the hotel sign.
function flamencoGardens(f, rnd, glow) {
  for (const [x, s, t] of [[-11.5, 1.25, true], [11.5, 1.3, false], [24, 1.2, true]]) {
    piconBed(f, x, -3.2, 4.2, 3.2);
    palm(f, x, -3.2, s, t);
    agave(f, x - 1.3, -2.3, 0.8);
    gardenLamp(f, glow, x + 1.5, -4.2);
  }
  piconBed(f, -23.5, -5.5, 4, 2.4);
  cardon(f, -24.3, -5.6, 1.0);
  agave(f, -22.4, -5.2, 0.9);
  // Deck palms and the east palm row.
  for (const [x, z, s, t] of [[-16.6, 28.5, 1.35, false], [-9.5, 27.5, 1.2, true], [9.5, 27.8, 1.3, false], [16, 25.5, 1.15, true],
    [28.5, 22, 1.3, false], [28.5, 10, 1.4, true], [28.5, -2, 1.25, false], [28.5, -14, 1.35, false], [28.5, -24, 1.2, false]]) {
    palm(f, x, z, s, t);
  }
  for (const z of [-19, -8, 4, 16]) agave(f, 29.6, z, 1.0);
  bougainvillea(f, -26.8, -12.0, 1.0, rnd);
  bougainvillea(f, 27.0, -11.2, 1.0, rnd);
  for (const [x, z] of [[-7.5, 23.5], [10.5, 22.5], [-15.6, 13.6], [26.5, 28.2], [-7.0, -0.8]]) gardenLamp(f, glow, x, z);
  // South boundary wall (gates at x [-6.6, 0.6] and [13, 16]) and the hotel's street sign.
  for (const [x0, x1] of [[-17.6, -6.6], [0.6, 13], [16, 20], [28, 31]]) {
    const xc = (x0 + x1) / 2, w = x1 - x0;
    f.box(WHITE, xc, C, 30.6, w, 1.0, 0.3);
    f.box(TERRA, xc, C + 1.0, 30.6, w + 0.1, 0.08, 0.4);
    f.solid(xc, 30.6, w, 0.3, C + 1.1, 'wall');
  }
  f.box(WHITE, 24, C, 30.6, 8, 1.9, 0.45);
  f.box(TERRA, 24, C + 1.9, 30.6, 8.2, 0.12, 0.6);
  f.solid(24, 30.6, 8, 0.45, 99, 'wall');
  f.sign('HOTEL FLAMENCO', 24, C + 1.15, 30.85, 7.0, 1.1, 0, { bg: '#c0623a', fg: '#fff8e6', border: '#fff8e6', scale: 0.7 });
  f.sign('HOTEL FLAMENCO', 24, C + 1.15, 30.35, 7.0, 1.1, PI, { bg: '#c0623a', fg: '#fff8e6', border: '#fff8e6', scale: 0.7 });
  for (const x of [-12, 6.5, 18]) bougainvillea(f, x, 29.6, 0.9, rnd);
}

// ================================================================================================
// HOTEL SUNTRIP (3,2): a lower U-shaped hotel on red rock. The U opens south: wings west and east,
// two back-wing halves with red rocks between them, the welcome stage in front of the rocks, the
// friskotek lawn, the pool, the parking lot, and the SunTrip office on the street side facing
// Flamenco's back.

const ST = { GH: 3.2, FH: 2.9, NF: 3 };

function hotelSunTrip(f, W, ctx) {
  const rnd = ctx.rnd, glow = new GeoBuilder();
  NIGHT = new GeoBuilder(); NIGHT_RND = rnd;
  suntripGround(f, W);
  suntripWings(f, rnd);
  suntripRocks(f, rnd);
  suntripStage(f, glow);
  suntripLawn(f, rnd, glow);
  suntripPool(f, rnd, glow);
  suntripOffice(f, glow);
  suntripLot(f, glow);
  addGlow(f.scene, glow);
  nightMesh(f.scene);
  // `suntrip` faces the office porch (yaw π, landmarks-island.js since Phase 2), so its
  // views/cutaway camera stands in the street instead of behind the office.
}

function suntripGround(f, W) {
  f.flat(0xc58a5c, 0, 0, W, W, Y_BASE);                     // red-ochre rock ground
  f.flat(LAWN, -8.25, -5, 28.5, 36, Y_AREA);                // lawn x [-22.5, 6], z [-23, 13]
  for (let x = -21; x <= 4.5; x += 3) f.flat(LAWN_D, x, -5, 1.4, 36, Y_LINE);   // mowing stripes
  f.flat(0xf0e8d8, 18.5, 5.5, 25, 15, Y_AREA);              // pool deck x [6, 31], z [-2, 13]
  f.flat(PAVE, -7.5, 22, 47, 18, Y_AREA);                   // forecourt x [-31, 16], z [13, 31]
  f.flat(PAVE, 23.5, 14.5, 15, 3, Y_AREA);                  // x [16, 31], z [13, 16]
  f.flat(ASPH, 23.5, 23.5, 15, 15, Y_AREA);                 // lot x [16, 31], z [16, 31]
  f.flat(PAVE, 15.5, -12.5, 15, 21, Y_AREA);                // terrace x [8, 23], z [-23, -2]
}

function suntripWings(f, rnd) {
  const { GH, FH, NF } = ST, Y1 = C + GH, H = GH + (NF - 1) * FH, TOP = C + H;
  const wings = [
    { x0: -31, x1: -23, z0: -31, z1: 4 },
    { x0: 23, x1: 31, z0: -31, z1: -2 },
    { x0: -23, x1: -9, z0: -31, z1: -23 },
    { x0: 9, x1: 23, z0: -31, z1: -23 },
  ];
  for (const w of wings) {
    const cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2, ww = w.x1 - w.x0, wd = w.z1 - w.z0;
    f.box(WHITE, cx, C, cz, ww, H, wd);
    f.solid(cx, cz, ww, wd, 99, 'building');
    f.box(ROCK, cx, C, cz, ww + 0.16, 0.55, wd + 0.16);                        // red-rock plinth
    f.box(SUN, cx, TOP - 0.25, cz, ww + 0.4, 0.3, wd + 0.4);                   // SunTrip-yellow cornice
    f.box(WHITE, cx, TOP + 0.05, cz, ww + 0.2, 0.55, wd + 0.2);
    f.box(0xcfc8bb, cx, TOP + 0.6, cz, ww - 0.4, 0.04, wd - 0.4);
  }
  // Courtyard faces: balconies (yellow coping), ground-floor glass doors.
  const bays = (u0, u1, n) => Array.from({ length: n }, (_, k) => [u0 + ((u1 - u0) * k) / n, u0 + ((u1 - u0) * (k + 1)) / n]);
  const faces = [
    { axis: 'z', c: -23, s: 1, u0: -21.6, u1: 4, n: 4 },
    { axis: 'z', c: 23, s: -1, u0: -21.6, u1: -2, n: 3 },
    { axis: 'x', c: -23, s: 1, u0: -23, u1: -9, n: 2 },
    { axis: 'x', c: -23, s: 1, u0: 9, u1: 23, n: 2 },
  ];
  for (const fc of faces) {
    const bs = bays(fc.u0, fc.u1, fc.n);
    balconies(f, rnd, { axis: fc.axis, c: fc.c, s: fc.s, u0: fc.u0, u1: fc.u1, bays: bs, y0: Y1, fh: FH, floors: NF, stripe: SUN, depth: 1.25, awnP: 0.45 });
    // The balcony row is a camera ceiling (§14.3): the chase eye stays under its first slab.
    const cu = (fc.u0 + fc.u1) / 2, cl = fc.u1 - fc.u0 + 0.3, cv = fc.c + fc.s * 0.625;
    if (fc.axis === 'x') f.ceiling(cu, cv, cl, 1.25, Y1 - 0.2, TOP);
    else f.ceiling(cv, cu, 1.25, cl, Y1 - 0.2, TOP);
    const B = (color, u, y, v, wu, h, wv) => (fc.axis === 'x' ? f.box(color, u, y, fc.c + fc.s * v, wu, h, wv) : f.box(color, fc.c + fc.s * v, y, u, wv, h, wu));
    for (const [b0, b1] of bs) {
      const bu = (b0 + b1) / 2;
      B(GLASS, bu, C + 0.05, 0.03, b1 - b0 - 2.2, 2.4, 0.06);
      B(TRIM, bu, C + 2.5, 0.05, b1 - b0 - 1.9, 0.1, 0.1);
      B(pick(CURTAINS, rnd), bu - (b1 - b0 - 2.2) / 2 + 0.3, C + 0.1, 0.08, 0.5, 2.3, 0.04);
    }
    B(SUN, (fc.u0 + fc.u1) / 2, Y1 - 0.38, 0.12, fc.u1 - fc.u0, 0.3, 0.2);
  }
  // Outer faces: windows.
  const win = (o) => windows(f, { step: 3.2, y0: C, fh: FH, floors: NF, w: 1.2, h: 1.2, ...o });
  win({ axis: 'z', c: -31, s: -1, u0: -31, u1: 4 });
  win({ axis: 'z', c: 31, s: 1, u0: -31, u1: -2 });
  win({ axis: 'x', c: -31, s: -1, u0: -31, u1: -9 });
  win({ axis: 'x', c: -31, s: -1, u0: 9, u1: 31 });
  win({ axis: 'x', c: 4, s: 1, u0: -31, u1: -23 });
  win({ axis: 'x', c: -2, s: 1, u0: 23, u1: 31 });
  win({ axis: 'z', c: -9, s: 1, u0: -31, u1: -23, step: 2.8 });
  win({ axis: 'z', c: 9, s: -1, u0: -31, u1: -23, step: 2.8 });
  // Roof signs: HOTEL SUNTRIP over the east back wing (facing the courtyard), SUNTRIP down the
  // west wing's street face.
  for (const x of [11, 21]) f.box(STEEL, x, TOP + 0.6, -26, 0.16, 3.2, 0.16);
  f.sign('HOTEL SUNTRIP', 16, TOP + 2.4, -25.9, 11, 2.0, 0, { bg: null, border: null, fg: '#d8321e', stroke: '#f7c31b', scale: 0.86, double: true });
  f.sign('S\nU\nN\nT\nR\nI\nP', -31.1, C + H / 2 + 0.3, -14, 1.6, 7.5, -PI / 2, { bg: '#f7c31b', fg: '#d8321e', border: '#d8321e', scale: 0.85 });
}

// Red rocks between the back wings: the hotel "on red rock", with cardón cacti and agaves.
function suntripRocks(f, rnd) {
  for (const [x, z, sx, sy, sz, col] of [[-5.2, -26.5, 7.5, 4.2, 6.5, ROCK], [3.2, -27.5, 8.5, 4.6, 6.0, ROCK2], [7.2, -23.2, 4.2, 2.6, 4.5, ROCK],
    [-8.0, -22.4, 3.6, 2.2, 3.8, ROCK2], [0.2, -22.0, 3.2, 1.6, 2.6, ROCK], [-1.5, -30.2, 5, 3.2, 3.5, ROCK2]]) {
    prim(f, PRIM.ico(0), col, x, C + sy * 0.18, z, sx, sy, sz, 0, rnd() * PI, 0);
    f.circ(x, z, Math.min(sx, sz) * 0.42, C + sy * 0.6, 'rock');
  }
  cardon(f, -6.0, -27.4, 1.1);
  cardon(f, 4.0, -28.6, 0.9);
  agave(f, 6.6, -21.0, 1.0);
  agave(f, -3.3, -22.6, 0.8);
}

function chairAt(f, lx, lz, y0) {
  f.box(WOOD_D, lx, y0 + 0.42, lz, 0.45, 0.05, 0.45);
  f.box(WOOD_D, lx, y0 + 0.47, lz - 0.21, 0.45, 0.5, 0.04);
  for (const [a, b] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) f.box(WOOD_D, lx + a, y0, lz + b, 0.04, 0.42, 0.04);
}

// Welcome stage (§6.3): platform, SunTrip sun backdrop raised on posts (red text on a yellow sun),
// accordion and congas for Affe and Gabbe (who stand at scen ±3 m), speakers, footlights.
function suntripStage(f, glow) {
  const TOP = C + 0.4, Z1 = -9;
  f.box(WOOD, 0, C, -14, 14, 0.4, 10);
  for (let x = -6; x <= 6; x += 1.5) f.box(0xa06a3a, x, TOP, -14, 0.06, 0.006, 9.8);
  f.box(SUN, 0, C + 0.02, Z1 + 0.01, 14.05, 0.36, 0.04);
  f.box(RED, 0, C + 0.15, Z1 + 0.03, 14.05, 0.08, 0.04);
  f.box(WOOD_D, 0, C, Z1 + 0.5, 4, 0.2, 1.0);                                  // step
  f.solid(0, -14, 14, 10, TOP, 'stage');
  f.solid(0, Z1 + 0.5, 4, 1.0, C + 0.2, 'stage');
  for (let x = -6.5; x <= 6.5; x += 1.3) glow.ico(WARM, f.wx(x, Z1 + 0.15), TOP + 0.06, f.wz(x, Z1 + 0.15), 0.16, 0);
  // Sun backdrop on two posts, high enough to see the band under it.
  for (const s of [-1, 1]) {
    f.box(TRIM, s * 4.9, TOP, -18.6, 0.3, 10.6, 0.3);
    f.circ(s * 4.9, -18.6, 0.25, 99, 'pole');
  }
  f.box(TRIM, 0, TOP + 3.9, -18.6, 9.8, 0.25, 0.25);
  const SY = TOP + 7.6;
  f.cyl(SUN, 0, SY, -18.65, 3.3, 0.3, 32, PI / 2);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * PI * 2;
    if (Math.sin(a) < -0.75) continue;                     // keep the space under the sun open
    f.boxC(ORANGE, Math.cos(a) * 4.0, SY + Math.sin(a) * 4.0, -18.7, 0.55, 1.1, 0.15, 0, 0, a - PI / 2);
  }
  f.sign('SUNTRIP', 0, SY, -18.45, 6.0, 1.7, 0, { bg: null, border: null, fg: '#d8321e', stroke: '#fff8e6', scale: 0.9 });
  f.sign('SUNTRIP', 0, SY, -18.85, 6.0, 1.7, PI, { bg: null, border: null, fg: '#d8321e', stroke: '#fff8e6', scale: 0.9 });
  f.sign('VÄLKOMMEN TILL NUEVA ESTOCOLMO!', 0, TOP + 3.65, -18.42, 9.0, 0.45, 0, { bg: '#d8321e', fg: '#fff8e6', border: null, scale: 0.7 });   // [N]
  // Speakers.
  for (const s of [-1, 1]) {
    f.box(INK, s * 6.2, TOP, -17.6, 0.85, 1.55, 0.75);
    for (const y of [0.45, 1.1]) f.cyl(0x55555e, s * 6.2, TOP + y, -17.22, 0.24, 0.03, 12, PI / 2);
    f.solid(s * 6.2, -17.6, 0.85, 0.75, TOP + 1.55, 'speaker');
  }
  // Affe's accordion on a chair, Gabbe's congas, a microphone.
  chairAt(f, -5.0, -16.6, TOP);
  f.box(RED, -5.0, TOP + 0.48, -16.6, 0.5, 0.42, 0.24);
  for (let q = 0; q < 4; q++) f.box(TRIM, -5.0 + (q - 1.5) * 0.09, TOP + 0.5, -16.47, 0.03, 0.38, 0.02);
  f.box(TRIM, -4.72, TOP + 0.5, -16.6, 0.05, 0.38, 0.26);
  for (const [x, z, h] of [[5.0, -16.4, 0.8], [5.48, -16.75, 0.72]]) {
    f.cyl(0x9a5a32, x, TOP + h / 2, z, 0.17, h, 10);
    f.cyl(0xf2e6cc, x, TOP + h + 0.01, z, 0.18, 0.03, 10);
    f.cyl(GOLD, x, TOP + h * 0.75, z, 0.18, 0.04, 10);
  }
  f.cyl(STEEL, 0, TOP + 0.75, -10.6, 0.03, 1.5, 6);
  f.cyl(STEEL, 0, TOP + 0.02, -10.6, 0.22, 0.04, 8);
  f.sphere(INK, 0, TOP + 1.56, -10.55, 0.09);
  // String lights from the backdrop to the wings.
  stringLights(f, glow, -4.9, TOP + 10.4, -18.6, -16, C + 9.0, -23.4, 10, 1.0);
  stringLights(f, glow, 4.9, TOP + 10.4, -18.6, 16, C + 9.0, -23.4, 10, 1.0);
  stringLights(f, glow, -4.9, TOP + 10.4, -18.6, -23.4, C + 9.0, -6, 12, 1.4);
  stringLights(f, glow, 4.9, TOP + 10.4, -18.6, 23.4, C + 9.0, -8, 12, 1.4);
}

// Friskotek lawn (§8.7): Lasse leads the morning gym from his mat at friskotek (-10, 8),
// facing south over the mats; the band stands behind him. Benches round the edge.
function suntripLawn(f, rnd, glow) {
  // Lasse's leader mat: flat, so friskotek keeps a ground-level approach spot (§4.4).
  f.flat(RED, -10, 8, 2.0, 2.0, Y_GLINT);
  f.flat(SUN, -10, 8, 1.7, 1.7, Y_GLINT + 0.01);
  const mats = [0x2f5a8a, RED, 0x1e9aa0, ORANGE, GREEN, SUN];
  let k = 0;
  for (const x of [-19, -16.4, -13.8, -6.2, -3.6, -1]) f.flat(mats[k++ % mats.length], x, 11.2, 1.0, 1.9, Y_DEEP);
  // Notice board (Lasse: "Friskoteket börjar halv tio varje morgon", relocated as a sign).
  // The board is solid too (Phase 3 r3: with only its posts solid he walked through it, and the
  // chase eye stood behind it with the board filling the frame).
  for (const z of [3.1, 4.9]) { f.box(WOOD, -21.6, C, z, 0.12, 2.6, 0.12); f.circ(-21.6, z, 0.1, 99, 'pole'); }
  f.sign('FRISKOTEKET\nVARJE MORGON 9.30', -21.5, C + 1.95, 4, 2.2, 1.0, PI / 2, { bg: '#1e9aa0', fg: '#fff8e6', border: '#f7c31b', scale: 0.55, double: true });   // [F*]
  f.solid(-21.6, 4, 0.12, 2.2, C + 2.45, 'sign');
  // Benches and planters along the lawn edge, palms on the lawn.
  for (const [x, z, y] of [[-20.6, -12, PI / 2], [-20.6, -4, PI / 2], [8.4, -12, -PI / 2]]) f.prop('bank', x, z, y);   // the east one clear of the stage (x ≤ 7)
  for (const [x, z, s, t] of [[-19.5, -19.5, 1.3, false], [-19.8, 9.5, 1.2, true], [5.5, -20, 1.25, false], [3.8, 9.8, 1.15, false]]) palm(f, x, z, s, t);
  for (const [x, z] of [[-14, -20.5], [-21, -16], [6.8, -5]]) bougainvillea(f, x, z, 0.9, rnd);
  for (const [x, z] of [[-21.4, -8], [7.2, 0.5], [-10.5, -20.6]]) gardenLamp(f, glow, x, z);
  f.prop('julgran', -16.0, -21.4);
  // Planters along the west wing's courtyard front.
  for (const z of [-15, -7, 1]) {
    f.box(TERRA_D, -21.3, C, z, 0.9, 0.5, 3.2);
    f.box(0x4a403c, -21.3, C + 0.5, z, 0.7, 0.04, 3.0);
    for (const dz of [-1, 0, 1]) f.ico(dz === 0 ? BOUG : LEAF2, -21.3, C + 0.85, z + dz * 1.0, 0.7);
    f.solid(-21.3, z, 0.9, 3.2, C + 0.55, 'wall');
  }
}

// SunTrip pool (§6.3 suntripPool, the fin): deck, sunbeds with parasols, terrace by the east wing.
function suntripPool(f, rnd, glow) {
  pool(f, 8, 5.5, 21, 12.5, { glints: 6, rnd });
  ladder(f, 19.5, 4.7, 1);
  for (const x of [9.2, 10.8, 17.4, 19.0]) f.prop('solstol', x, 2.2, 0);
  for (const z of [6.2, 8.4, 10.6, 12.8]) f.prop('solstol', 23.0, z, PI / 2);
  for (const [x, z] of [[11.9, 2.4], [24.6, 7.3], [24.6, 11.7]]) f.prop('parasoll', x, z);
  f.prop('dusch', 22.4, 3.2);
  for (const [x, z] of [[27.5, 4], [27.5, 12]]) palm(f, x, z, 1.25, false);
  gardenLamp(f, glow, 7.0, 14.2);
  for (const [x, z] of [[13, -18], [18.5, -18], [13, -11.5], [18.5, -11.5], [15.8, -5.5]]) strawParasol(f, x, z);
  f.prop('automat', 21.9, -4.2, -PI / 2);
  f.prop('papelera', 8.6, -3.0);
}

// SunTrip office on the street side (§6.3: the porch faces Flamenco's back), posters in the windows.
function suntripOffice(f, glow) {
  const x0 = -25, x1 = -5, z0 = 14, z1 = 20.5, H = 3.4, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  f.box(WHITE, cx, C, cz, x1 - x0, H, z1 - z0);
  f.solid(cx, cz, x1 - x0, z1 - z0, 99, 'building');
  f.box(ROCK, cx, C, cz, x1 - x0 + 0.14, 0.45, z1 - z0 + 0.14);
  f.box(SUN, cx, C + H - 0.55, z1 + 0.06, x1 - x0 + 0.2, 0.6, 0.15);
  f.box(SUN, cx, C + H - 0.55, z0 - 0.06, x1 - x0 + 0.2, 0.6, 0.15);
  f.box(WHITE, cx, C + H, cz, x1 - x0 + 0.2, 0.35, z1 - z0 + 0.2);
  // Shop front.
  f.box(GLASS, cx, C + 0.45, z1 + 0.03, 15, 2.25, 0.06);
  NIGHT?.box(0xffe0a0, f.wx(cx, z1 + 0.065), C + 1.575, f.wz(cx, z1 + 0.065), 14.9, 2.2, 0.004);
  for (let x = -22.5; x <= -7.5; x += 2.5) f.box(TRIM, x, C + 0.45, z1 + 0.06, 0.12, 2.25, 0.08);
  f.box(GLASS_D, -14, C + 0.05, z1 + 0.08, 1.6, 2.5, 0.06);
  f.sign('GRISFEST\nTORSDAG\n800 PTA', -19.5, C + 1.5, z1 + 0.12, 1.4, 1.55, 0, { bg: '#f07a1e', fg: '#fff8e6', border: '#d8321e', scale: 0.62 });   // [F*] Lasse's bus line
  f.sign('FRISKOTEKET\n9.30', -17.0, C + 1.5, z1 + 0.12, 1.4, 1.0, 0, { bg: '#1e9aa0', fg: '#fff8e6', border: '#f7c31b', scale: 0.6 });               // [F*]
  f.sign('UTFLYKT\nFATAGA', -11.0, C + 1.5, z1 + 0.12, 1.3, 1.0, 0, { bg: '#2f8a4a', fg: '#fff8e6', border: '#f7c31b', scale: 0.6 });                 // [N]
  f.sign('HÄR TALAS\nSVENSKA', -8.6, C + 1.5, z1 + 0.12, 1.3, 1.0, 0, { bg: '#fff8e6', fg: '#2f5a8a', border: '#2f5a8a', scale: 0.6 });               // §6.9 [N]
  // Big SUNTRIP letters and the sun logo on the roof edge.
  f.sign('SUNTRIP', -13, C + H + 1.15, z1 - 0.2, 9, 1.9, 0, { bg: null, border: null, fg: '#d8321e', stroke: '#fff8e6', scale: 0.92 });
  f.box(STEEL, -13, C + H + 0.35, z1 - 0.3, 9, 0.12, 0.12);
  f.cyl(SUN, -20.2, C + H + 1.15, z1 - 0.25, 1.05, 0.2, 24, PI / 2);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * PI * 2;
    f.boxC(ORANGE, -20.2 + Math.cos(a) * 1.35, C + H + 1.15 + Math.sin(a) * 1.35, z1 - 0.3, 0.25, 0.45, 0.1, 0, 0, a - PI / 2);
  }
  // Striped awning on two posts; Lasse stands just outside it at `suntrip` (-14, 24).
  for (let q = 0; q < 14; q++) f.boxC(q % 2 ? TRIM : SUN, -21.5 + q + 0.5, C + 2.85, z1 + 1.35, 1.0, 0.06, 2.8, 0, 0.2);
  f.box(TRIM, -15, C + 2.45, z1 + 2.72, 14, 0.25, 0.05);
  for (const x of [-21.8, -8.2]) { f.cyl(TRIM, x, C + 1.35, z1 + 2.55, 0.07, 2.7, 8); f.circ(x, z1 + 2.55, 0.12, 99, 'pole'); }
  f.ceiling(-14.5, 22.0, 14.2, 3.2, C + 2.45, C + 3.4);   // the chase camera stays under the awning (valance bottom)
  f.prop('bank', -19.6, 22.0, PI);
  f.prop('vykort', -6.8, 22.6);
  // North wall, facing the friskotek lawn.
  for (let x = -23; x <= -7; x += 4) { f.box(GLASS, x, C + 1.1, z0 - 0.03, 1.3, 1.2, 0.06); f.box(TRIM, x, C + 1.0, z0 - 0.1, 1.6, 0.1, 0.2); }
  f.sign('SUNTRIP · FRISKOTEK', -15, C + 2.55, z0 - 0.14, 6, 0.6, PI, { bg: '#f7c31b', fg: '#d8321e', border: '#d8321e', scale: 0.62 });   // [N]
  // Forecourt: flag mast, palms, cacti, the hotel's street sign on a red-rock wall.
  f.cyl(TRIM, -2.5, C + 4.5, 26, 0.08, 9, 8);
  f.circ(-2.5, 26, 0.12, 99, 'pole');
  f.sign('SUNTRIP', -1.45, C + 8.2, 26, 2.0, 1.3, 0, { bg: '#f7c31b', fg: '#d8321e', border: '#d8321e', scale: 0.55, double: true });
  for (const [x, z, s, t] of [[-28, 15.5, 1.3, true], [-28.5, 27.5, 1.2, false], [6.5, 17, 1.2, false], [12.5, 28.5, 1.3, true]]) palm(f, x, z, s, t);
  piconBed(f, -1, 18, 5, 3);
  cardon(f, -2, 18, 1.0); agave(f, 0.5, 17.5, 0.9);
  for (const [x, z] of [[-27.5, 21], [2.5, 29.4], [-10, 29.4]]) gardenLamp(f, glow, x, z);
  f.box(ROCK, -24, C, 30.3, 9, 1.4, 0.6);
  f.solid(-24, 30.3, 9, 0.6, 99, 'wall');
  f.sign('HOTEL SUNTRIP', -24, C + 0.8, 30.62, 7.5, 0.95, 0, { bg: '#f7c31b', fg: '#d8321e', border: '#d8321e', scale: 0.7 });
  f.sign('HOTEL SUNTRIP', -24, C + 0.8, 29.98, 7.5, 0.95, PI, { bg: '#f7c31b', fg: '#d8321e', border: '#d8321e', scale: 0.7 });
}

function suntripLot(f, glow) {
  for (const x of [17, 19.8, 22.6, 25.4, 28.2]) f.flat(STRIPE, x, 22, 0.12, 5, Y_LINE);
  f.flat(STRIPE, 22.6, 19.5, 11.2, 0.12, Y_LINE);
  f.car('hatch', 18.4, 22, PI, { color: 0xc8202a });
  parkingSign(f, 16.6, 30.0, 'SUNTRIP');
  gardenLamp(f, glow, 30.3, 17, 3.2);
}

export const BUILDERS = { flamenco: hotelFlamenco, suntrip: hotelSunTrip };
