// Coast blocks (WP-D2, DESIGN §6.3): flygplats (Gando airport, with the parked DC-8 outside the
// bound wall at (240, -335)), dromplan (the old DC-7 "drömplanet" on a dirt lot), fyren (Faro de
// Maspalomas), playa (the beach: five blocks, one variant each) and hamn (the marina).
//
// Every builder works in its block Frame (yaw 0, local ±31 = world offset from the block centre).
// Static geometry goes into the block's merged GeoBuilders (f.S outlined, f.F flat ground). The few
// moving or switchable parts get their own small meshes and one shared ticker (see onTick):
//   - the baggage carousel ring (rotates; its belt carries Stig in free roam: `BELT`, §10.16),
//   - the airport hall roof (hidden while the camera looks into the hall: a dollhouse cut-away),
//   - flags and the windsock (sway), the marina boats (bob),
//   - the lighthouse lantern glow and beam (night palettes only).
// World coins on roofs and routes (fyren roof arc, dream-plane crate stairs, the marina pier) are
// queued here and placed on the first tick, after main.js has created the coin pool (§14.2).
//
// Invented for the game (signs are [N] unless marked): the Gando hall layout, the lost-and-found
// desk, the dream plane's crate stairs and "PROHIBIDO SUBIR" plate, the beach and marina dressing,
// the boat names. Public landmarks named as §1.5 allows: Gando, Faro de Maspalomas (lit 1890).
// The DC-7 by the road is the film's dream-sequence plane (notes/research-flight.md §1.4: long
// faded red, near Bahía Feliz); its registration EC-DRM is invented.

import { THREE, GeoBuilder, toonMesh, signMesh, mat, PRIM, makeWedge, camera, beaconLit } from '../../gfx.js';
import { CURB } from '../layout.js';
import { box, ramp } from '../collision.js';
import { Frame } from '../frame.js';
import { buildPlaneExterior } from '../flightScenery.js';
import { placeCoin, coins } from '../../actors/pickups.js';
import * as TOWN from '../town.js';

const PI = Math.PI;

// §13.2 island palette + a few local tones.
const WASH = 0xf4efe6, TRIM = 0xfbf6ec, TERRA = 0xc0623a, SAND = 0xe8cf98, OCHRE = 0xc9a26b;
const SEA = 0x1c7fb8, SUNY = 0xf7c31b, ORANGE = 0xf07a1e, RED = 0xd8321e, INK = 0x1d1426;
const GLASS = 0x4f7fa8, DARK = 0x2a3440, WOOD = 0x9a6a3a, WOOD2 = 0x7a5232;
const PAVE = 0xd8cfbe, BLUE = 0x2f5a8a, GREEN = 0x2f8a4a, ROPE = 0xc8b48a, TEAL = 0x1e9aa0;

// ---------------------------------------------------------------------------------------------
// Shared ticker: one entry in town.js's `animated` list drives every coast animation. Fallback
// (should that list ever be renamed): chain the scene's onBeforeRender with wall-clock time.

const tickers = [];
let hooked = false;
function onTick(fn, scene) {
  tickers.push(fn);
  if (hooked) return;
  hooked = true;
  const run = (t) => { for (let k = 0; k < tickers.length; k++) tickers[k](t); };
  if (Array.isArray(TOWN.animated)) TOWN.animated.push({ tick: run });
  else if (scene) {
    const prev = scene.onBeforeRender;
    scene.onBeforeRender = function (...a) { prev?.apply(this, a); run(performance.now() / 1000); };
  }
}

// The baggage belt of CINTA 2 at Gando as the free-roam ride sees it (game/baggageBelt.js, §10.16),
// filled by the flygplats builder: the ring's middle (world), its spin (rad/s of game time: the ring's
// rotation.y is `t * spin`, so a ring-local angle a is the world angle a + t * spin round the middle,
// at (sin, cos)), the belt's floor block, its top and radii (the still centre island inside r0), and
// the bags (`k` the slot, `a` its ring-local angle, `top` its lid, `out` the radius of its outer end;
// the skis are left out).
export const BELT = { x: 0, z: 0, spin: 0.32, top: 0, r0: 0, r1: 0, block: null, bags: [] };

// Coins wanted at build time, placed once the pool exists (pickups.initCoins runs after buildTown).
const pendingCoins = [];
function coinAt(f, lx, lz, y) {
  pendingCoins.push([f.wx(lx, lz), y, f.wz(lx, lz)]);
  if (pendingCoins.length === 1) {
    onTick(() => {
      if (!pendingCoins.length || !coins.length) return;
      for (const [x, yy, z] of pendingCoins) placeCoin(x, yy, z);
      pendingCoins.length = 0;
    }, f.scene);
  }
}

// ---------------------------------------------------------------------------------------------
// Small geometry helpers.

const geoCache = new Map();
const cached = (k, make) => { if (!geoCache.has(k)) geoCache.set(k, make()); return geoCache.get(k); };
// Open cylinder segment along z, centred on "up" (centre = PI) or "down" (centre = 0), ±a radians.
const arcGeo = (r, len, a, centre = PI, segs = 20) => cached(`arc${r}_${len}_${a}_${centre}_${segs}`, () =>
  new THREE.CylinderGeometry(r, r, len, segs, 1, true, centre - a, 2 * a).rotateX(PI / 2));
// Tapered cylinder (radius rt at +y, rb at -y).
const taperGeo = (rt, rb, h, segs = 16) => cached(`tap${rt}_${rb}_${h}_${segs}`, () => new THREE.CylinderGeometry(rt, rb, h, segs));
// Circle sector in the XY plane (faces +z), centred on +y, ±a radians; a half disc for a = PI/2.
const sectorGeo = (r, a, segs = 16) => cached(`sec${r}_${a}_${segs}`, () => new THREE.CircleGeometry(r, segs, PI / 2 - a, 2 * a));
const halfDiscGeo = (r) => sectorGeo(r, PI / 2, 18);

// A sand-dune ramp: a walkable top (width w) rising along +z from 0 to h over len, with rounded
// shoulders falling to the sand on both sides (smooth normals). Base at y 0, centred at the origin.
const duneGeo = (len, w, h) => cached(`dune${len}_${w}_${h}`, () => {
  const rows = 8, pos = [], idx = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows, z = -len / 2 + t * len, y = t * h, s = 0.6 + y * 0.8;
    for (const [x, k] of [[-w / 2 - s, 0], [-w / 2 - s * 0.45, 0.72], [-w / 2, 1], [0, 1.02], [w / 2, 1], [w / 2 + s * 0.45, 0.72], [w / 2 + s, 0]]) pos.push(x, y * k, z);
  }
  const C = 7;
  for (let r = 0; r < rows; r++) for (let c = 0; c < C - 1; c++) {
    const a = r * C + c, b = (r + 1) * C + c;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
});

// Sphere/ellipsoid in frame-local coordinates with a segment count.
function sph(f, color, lx, y, lz, sx, sy = sx, sz = sx, ly = 0, seg = 12) {
  f.S.sphere(color, f.wx(lx, lz), y, f.wz(lx, lz), sx, sy, sz, 0, f.yaw + ly, 0, seg);
}

function meshOf(G, scene, outline = 0.045) {
  const geo = G.build();
  if (!geo) return null;
  const m = toonMesh(geo, { outline });
  scene.add(m);
  return m;
}

// A wedge ramp (visual + collider) rising along ly from h0 at the back to h1 at the front.
function rampUp(f, color, lx, lz, ly, w, len, h0, h1) {
  f.S.add(makeWedge(), color, mat(f.wx(lx, lz), h0, f.wz(lx, lz), 0, f.yaw + ly, 0, w, h1 - h0, len));
  ramp(f.wx(lx, lz), f.wz(lx, lz), f.yaw + ly, w, len, h0, h1);
}

// A sign board on two posts; y = the board's centre height (absolute).
function postSign(f, text, lx, lz, ly, w, h, y, opts = {}) {
  const c = Math.cos(ly), s = Math.sin(ly);
  for (const d of [-w / 2 + 0.3, w / 2 - 0.3]) f.box(opts.post ?? 0x6a4528, lx + d * c, CURB, lz - d * s, 0.18, y + h / 2 - CURB, 0.18);
  return f.sign(text, lx + 0.12 * s, y, lz + 0.12 * c, w, h, ly, { bg: '#f7c31b', fg: '#1d1426', scale: 0.55, double: true, ...opts });
}

// A flat text decal lying on the ground, readable from the south (bus bay markings).
function groundText(f, text, lx, lz, w, h, color = '#f7c31b') {
  const m = signMesh(text, w, h, { bg: null, border: null, fg: color, scale: 0.8 });
  m.rotation.order = 'YXZ';
  m.rotation.set(-PI / 2, f.yaw, 0);
  m.position.set(f.wx(lx, lz), CURB + 0.05, f.wz(lx, lz));
  f.scene?.add(m);
}

// A palm with a tinsel spiral and coloured baubles (DESIGN §6.9).
function tinselPalm(f, lx, lz, s = 1) {
  f.tree(lx, lz, s, 'palm');
  for (let k = 0; k < 14; k++) {
    const a = k * 0.9, y = CURB + 0.6 + k * 0.38 * s;
    f.sphere(k % 3 === 0 ? RED : k % 3 === 1 ? SUNY : 0xe8e8f0, lx + Math.sin(a) * 0.26 * s, y, lz + Math.cos(a) * 0.26 * s, 0.16);
  }
}

// A swaying flag on a pole (pole static, cloth its own small mesh).
function flag(f, lx, lz, h, stripes, vertical = false, phase = 0) {
  f.cyl(0xe8e8ec, lx, CURB + h / 2, lz, 0.07, h, 8);
  f.sphere(SUNY, lx, CURB + h + 0.08, lz, 0.18);
  f.circ(lx, lz, 0.1, 99, 'pole');
  const G = new GeoBuilder(), W = 1.8, H = 1.2, n = stripes.length;
  stripes.forEach((c, k) => {
    if (vertical) G.box(c, 0.1 + (k + 0.5) * W / n, 0, 0, W / n, H, 0.04);
    else G.box(c, 0.1 + W / 2, H / 2 - (k + 0.5) * H / n, 0, W, H / n, 0.04);
  });
  const m = meshOf(G, f.scene, 0.02);
  m.position.set(f.wx(lx, lz), CURB + h - 0.7, f.wz(lx, lz));
  const base = f.yaw + 0.4 + phase * 0.3;
  onTick((t) => { m.rotation.y = base + Math.sin(t * 2.1 + phase * 3) * 0.22; }, f.scene);
  return m;
}

// Low decorative mound (no collider: at most ~0.35 m proud of the sand).
function mound(f, lx, lz, rx, rz, h, color = SAND) {
  sph(f, color, lx, CURB - h * 0.6, lz, rx * 2, h * 3.2, rz * 2, 0, 16);
}

function tuft(f, lx, lz, s = 1, color = 0x8a9a4a) {
  for (let k = 0; k < 3; k++) {
    const x = lx + (k - 1) * 0.18 * s, z = lz + ((k * 7) % 3 - 1) * 0.12 * s;
    f.S.cone(color, f.wx(x, z), CURB + 0.3 * s, f.wz(x, z), 0.08 * s, 0.6 * s, 4, (k - 1) * 0.3, 0, (k - 1) * 0.25);
  }
}

// Cardón cactus (ribbed columns) with a collider.
function cardon(f, lx, lz, s = 1) {
  const c = 0x5f8a4a;
  f.cyl(c, lx, CURB + 1.2 * s, lz, 0.32 * s, 2.4 * s, 8);
  f.sphere(c, lx, CURB + 2.4 * s, lz, 0.64 * s, 0.4 * s, 0.64 * s);
  for (const [dx, h] of [[0.7, 1.7], [-0.65, 1.4], [0.1, 1.9]]) {
    const dz = (dx > 0 ? 0.2 : -0.25) * s;
    f.cyl(c, lx + dx * s, CURB + (0.7 + h / 2) * s, lz + dz, 0.24 * s, h * s, 7);
    f.sphere(c, lx + dx * s, CURB + (0.7 + h) * s, lz + dz, 0.48 * s, 0.3 * s, 0.48 * s);
    f.boxC(c, lx + dx * s / 2, CURB + 0.65 * s, lz + dz / 2, Math.abs(dx) * s, 0.22 * s, 0.22 * s);
  }
  f.circ(lx, lz, 0.9 * s, 99, 'tree');
}

function agave(f, lx, lz, s = 1) {
  for (let k = 0; k < 7; k++) {
    const a = k * 0.9;
    f.boxC(0x6f9a7a, lx + Math.sin(a) * 0.35 * s, CURB + 0.45 * s, lz + Math.cos(a) * 0.35 * s, 0.18 * s, 1.0 * s, 0.06 * s, a, 0.55);
  }
}

// ---------------------------------------------------------------------------------------------
// Boats. Hull = an elongated ellipsoid sunk to its waist (the lower half is under the ground slab),
// deck and fittings on top. (x, z) local to the Frame; yaw 0 = bow towards +z.

function boat(f, kind, lx, lz, yaw, o = {}) {
  const L = o.len ?? (kind === 'excursion' ? 12 : kind === 'fishing' ? 6 : 7.5);
  const B = o.beam ?? (kind === 'excursion' ? 3.6 : kind === 'fishing' ? 2.2 : 2.5);
  const y0 = o.y ?? CURB;            // waterline
  const hull = o.hull ?? (kind === 'fishing' ? 0x2f6aa8 : WASH);
  const band = o.band ?? (kind === 'fishing' ? 0xe8e4da : kind === 'motor' ? RED : BLUE);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (u, v) => [lx + u * c + v * s, lz - u * s + v * c];   // (across, along) -> local
  const at = (u, v, y, w, h, d, color, rx = 0) => { const [x, z] = P(u, v); f.boxC(color, x, y, z, w, h, d, yaw, rx); };
  sph(f, hull, lx, y0 + 0.15, lz, B, 1.5, L, yaw, 18);
  sph(f, band, lx, y0 + 0.2, lz, B * 1.01, 0.25, L * 1.005, yaw, 18);
  at(0, -0.05 * L, y0 + 0.6, B * 0.78, 0.1, L * 0.72, kind === 'fishing' ? 0xb08a5a : 0xc89a68);   // deck
  if (kind === 'sail') {
    at(0, -0.05 * L, y0 + 0.95, B * 0.55, 0.6, L * 0.3, WASH);                 // cabin top
    at(0, 0.11 * L, y0 + 0.95, B * 0.5, 0.25, 0.2, DARK, -0.4);               // windows
    const [mx, mz] = P(0, 0.14 * L);
    f.cyl(0xd8d8d8, mx, y0 + 5.2, mz, 0.08, 9.2, 6);
    const [bx, bz] = P(0, -0.12 * L);
    f.boxC(0xd8d8d8, bx, y0 + 1.75, bz, 0.08, 0.08, 0.52 * L, yaw);           // boom
    f.boxC(o.cover ?? BLUE, bx, y0 + 1.95, bz, 0.34, 0.32, 0.48 * L, yaw);     // furled sail cover
  } else if (kind === 'motor') {
    at(0, 0.05 * L, y0 + 1.0, B * 0.66, 0.75, L * 0.34, WASH);
    at(0, 0.23 * L, y0 + 1.15, B * 0.6, 0.35, 0.25, DARK, -0.6);
    at(0, -0.32 * L, y0 + 0.75, B * 0.6, 0.2, L * 0.2, 0xe8e0d0);
  } else if (kind === 'fishing') {
    at(0, -0.15 * L, y0 + 1.15, 1.2, 1.1, 1.3, o.house ?? 0xf4f4f0);         // wheelhouse
    at(0, -0.15 * L + 0.66, y0 + 1.35, 1.0, 0.35, 0.05, DARK);
    at(0, -0.15 * L, y0 + 1.75, 1.35, 0.1, 1.5, o.roof ?? RED);
    const [px, pz] = P(0, 0.25 * L);
    f.cyl(0x6a4528, px, y0 + 2.0, pz, 0.06, 2.8, 6);
    f.sphere(0xfff1b8, px, y0 + 3.4, pz, 0.22);
    at(0.2, 0.05 * L, y0 + 0.8, 0.9, 0.3, 0.9, 0x3f5f4a);                    // nets
  } else if (kind === 'excursion') {
    for (const u of [-1, 1]) for (const v of [-0.3, 0, 0.3]) { const [x, z] = P(u * B * 0.36, v * L); f.cyl(WASH, x, y0 + 1.6, z, 0.06, 2.0, 6); }
    at(0, 0, y0 + 2.65, B * 0.9, 0.12, L * 0.72, o.canopy ?? TEAL);
    at(0, 0, y0 + 2.75, B * 0.8, 0.08, L * 0.62, WASH);
    for (const v of [-0.25, -0.05, 0.15]) at(0, v * L, y0 + 0.85, B * 0.7, 0.4, 0.35, BLUE);   // benches
  }
  if (o.solid !== false) {
    const turned = Math.abs(s) > 0.7;
    f.solid(lx, lz, turned ? L * 0.9 : B * 0.9, turned ? B * 0.9 : L * 0.9, y0 + 0.55, 'boat');
  }
}

// A fixed straw beach umbrella with two striped deckchairs under it.
function sombrilla(f, lx, lz, rnd) {
  f.cyl(0x8a6a44, lx, CURB + 1.25, lz, 0.07, 2.5, 6);
  f.cone(0xd8b878, lx, CURB + 2.62, lz, 1.75, 0.75, 12);
  f.cyl(0xc4a060, lx, CURB + 2.2, lz, 1.76, 0.14, 12);
  f.circ(lx, lz, 0.12, 99, 'pole');
  const C = [[RED, 0xf4f4f0], [TEAL, 0xf4f4f0], [BLUE, SUNY], [ORANGE, 0xf4f4f0]][(rnd() * 4) | 0];
  for (const dx of [-0.9, 0.9]) {
    const ly = (rnd() - 0.5) * 0.5;
    f.boxC(WOOD2, lx + dx, CURB + 0.25, lz + 0.1, 0.62, 0.5, 0.06, ly);
    for (let k = 0; k < 3; k++) f.boxC(C[k % 2], lx + dx, CURB + 0.42 + k * 0.17, lz + 0.35 + k * 0.17, 0.58, 0.02, 0.24, ly, 0.75);
    f.boxC(WOOD2, lx + dx, CURB + 0.2, lz + 0.75, 0.62, 0.4, 0.06, ly, -0.4);
  }
}

// A pedal boat (two pontoons, a seat, a paddle-wheel box). On the sand or afloat.
function pedalBoat(f, lx, lz, yaw, color = SUNY, y0 = CURB) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const u of [-0.75, 0.75]) sph(f, color, lx + u * c, y0 + 0.25, lz - u * s, 0.62, 0.7, 3.2, yaw, 12);
  f.boxC(WASH, lx, y0 + 0.55, lz, 1.8, 0.12, 1.8, yaw);
  f.boxC(BLUE, lx + 0.4 * s, y0 + 0.8, lz + 0.4 * c, 1.4, 0.35, 0.5, yaw);
  f.boxC(BLUE, lx - 0.1 * s, y0 + 1.05, lz - 0.1 * c, 1.4, 0.6, 0.12, yaw, -0.3);
  f.boxC(color, lx - 0.85 * s, y0 + 0.75, lz - 0.85 * c, 1.0, 0.5, 0.6, yaw);
}

// ---------------------------------------------------------------------------------------------
// Gando airport (6,0). Terminal across the north, an open arrivals hall under a flat canopy (its
// roof hides while the camera looks in), the forecourt with the bus bay and the taxi rank on the
// south. The parked DC-8 stands on its apron beyond the north road and the bound wall.

function gando(f, W) {
  const scene = f.scene;
  const HALL_Z0 = -10, HALL_Z1 = 13.8;       // hall under the canopy roof
  const ROOF_Y = CURB + 4.4;                 // canopy roof underside
  // Ground: terrazzo hall floor, kerb strip, forecourt asphalt.
  f.flat(0xe6dcc8, 0, (HALL_Z0 + 13) / 2, W, 13 - HALL_Z0, CURB + 0.02);
  for (let x = -28; x <= 28; x += 4) f.flat(0xd4c4a4, x, (HALL_Z0 + 12) / 2, 0.25, 12 - HALL_Z0 - 0.5, CURB + 0.025);
  f.flat(0xc87a48, 0, HALL_Z0 + 1.2, W, 0.6, CURB + 0.026);
  f.flat(0xd8d3c6, 0, 14.75, W, 3.5, CURB + 0.02);
  f.flat(0xf4f4f0, 0, 16.4, W, 0.2, CURB + 0.026);
  f.flat(0x56565e, 0, 23.75, W, 14.5, CURB + 0.02);
  for (let x = -28; x <= 28; x += 4.5) f.flat(0xf4f4f0, x, 28.4, 2.2, 0.16, CURB + 0.026);   // lane dashes
  for (let k = 0; k < 4; k++) f.flat(0xf4f4f0, 0, 17.4 + k * 1.05, 3.2, 0.55, CURB + 0.027); // zebra to the hall
  // Bus bay (yellow box + painted text) and taxi rank (white box).
  const bay = (x0, x1, z0, z1, c) => {
    f.flat(c, (x0 + x1) / 2, z0, x1 - x0, 0.18, CURB + 0.027); f.flat(c, (x0 + x1) / 2, z1, x1 - x0, 0.18, CURB + 0.027);
    f.flat(c, x0, (z0 + z1) / 2, 0.18, z1 - z0, CURB + 0.027); f.flat(c, x1, (z0 + z1) / 2, 0.18, z1 - z0, CURB + 0.027);
  };
  bay(9, 24, 21.4, 26.6, SUNY);
  bay(-27, -9, 21.6, 26.4, 0xf4f4f0);
  groundText(f, 'BUSS 17', 16.5, 27.6, 5.5, 1.2);
  groundText(f, 'TAXI', -18, 27.6, 3.5, 1.2, '#f4f4f0');

  // --- Terminal building (closed), x [-31, 31], z [-31, -10], roof 5.5 m.
  const TH = 5.5, tz = -20.5, td = 21;
  f.box(WASH, 0, CURB, tz, W, TH, td);
  f.solid(0, tz, W, td, 99, 'building');
  f.box(TRIM, 0, CURB + TH, tz, W + 0.3, 0.45, td + 0.3);
  f.box(0xd8d0c0, 0, CURB + TH + 0.45, tz, W - 1, 0.04, td - 1);
  f.box(0xc87a48, 0, CURB + TH - 0.9, tz, W + 0.12, 0.35, td + 0.12);                       // 70s orange band
  // Airside (north) ribbon glazing with mullions, and the same on the gable ends.
  f.box(GLASS, 0, CURB + 1.4, -31.06, W - 4, 2.2, 0.1);
  for (let x = -28; x <= 28; x += 3) f.box(TRIM, x, CURB + 1.3, -31.12, 0.18, 2.4, 0.1);
  for (const sx of [-1, 1]) {
    f.box(GLASS, sx * 31.06, CURB + 1.4, tz, 0.1, 2.2, td - 4);
    for (let z = -29; z <= -12; z += 3) f.box(TRIM, sx * 31.12, CURB + 1.3, z, 0.1, 2.4, 0.18);
  }
  // Rooftop: AC boxes, the name sign on a frame, the control tower at the east end.
  for (const [x, z] of [[-18, -24], [-10, -27], [4, -26], [12, -22]]) { f.box(0xc8ccd2, x, CURB + TH + 0.45, z, 2.4, 1.1, 1.6); f.box(0x9aa0a6, x, CURB + TH + 1.55, z, 1.2, 0.2, 1.2); }
  for (const x of [-9.5, 0, 9.5]) f.box(0x5a5e66, x, CURB + TH + 0.45, -11.2, 0.2, 2.4, 0.2);
  f.sign('AEROPUERTO DE GANDO', 0, CURB + TH + 1.85, -10.95, 21, 1.7, 0, { bg: '#fbf6ec', fg: '#1b2f6b', scale: 0.62, double: true });
  const TX = 24, TZ = -22;
  f.cyl(0xe8e2d4, TX, CURB + 9, TZ, 1.5, 18, 14);
  for (let y = 7; y < 17; y += 2.5) f.box(GLASS, TX, CURB + y, TZ + 1.45, 0.4, 0.9, 0.1);
  f.cyl(TRIM, TX, CURB + 18.2, TZ, 2.7, 0.4, 10);
  f.cyl(0x3a6a7a, TX, CURB + 19.6, TZ, 2.5, 2.4, 10);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * PI * 2; f.boxC(TRIM, TX + Math.sin(a) * 2.5, CURB + 19.6, TZ + Math.cos(a) * 2.5, 0.14, 2.4, 0.14); }
  f.cyl(TRIM, TX, CURB + 21.0, TZ, 2.8, 0.4, 10);
  f.cyl(0x8a8e94, TX, CURB + 22.6, TZ, 0.06, 3.0, 6);
  f.sphere(RED, TX, CURB + 24.15, TZ, 0.22);

  // --- Hall back wall (the terminal's south face at z -10): customs doors, flight board, banner.
  const wallZ = HALL_Z0 + 0.06;
  for (const x of [-6, 2]) { f.box(0x3a3f4a, x, CURB, HALL_Z0 + 0.02, 2.6, 2.6, 0.1); f.box(0xb8bec6, x, CURB + 2.6, HALL_Z0 + 0.04, 2.9, 0.18, 0.12); }
  f.sign('ADUANA · TULL', -2, CURB + 3.45, wallZ, 6.5, 0.7, 0, { bg: '#1b2f6b', fg: '#fbf6ec', border: null, scale: 0.7 });
  f.sign('NADA QUE DECLARAR', -6, CURB + 3.0, wallZ + 0.02, 2.6, 0.32, 0, { bg: '#2f8a4a', fg: '#ffffff', border: null, scale: 0.7 });
  f.sign('ALGO QUE DECLARAR', 2, CURB + 3.0, wallZ + 0.02, 2.6, 0.32, 0, { bg: '#d8321e', fg: '#ffffff', border: null, scale: 0.7 });
  f.box(0x1d1f26, -21, CURB + 1.6, HALL_Z0 + 0.03, 9.4, 2.5, 0.08);
  f.sign('LLEGADAS · ANKOMST\nESTOCOLMO     14.55     ATERRIZÓ\nOSLO     15.20     RETRASADO\nGOTEMBURGO     16.10     EN HORA', -21, CURB + 2.85, wallZ + 0.03, 9.0, 2.2, 0, { bg: '#1d1f26', fg: '#f7c31b', border: null, scale: 0.78, font: '"Nunito", sans-serif' });
  f.sign('BIENVENIDOS A GRAN CANARIA · VÄLKOMMEN', 17, CURB + 3.55, wallZ, 13, 0.9, 0, { bg: '#f7c31b', fg: '#d8321e', scale: 0.62 });
  // The wall clock says three o'clock ("Klockan är tre spansk tid", §8.6).
  f.cyl(TRIM, 27.5, CURB + 3.3, HALL_Z0 + 0.1, 0.65, 0.12, 20, PI / 2);
  f.cyl(INK, 27.5, CURB + 3.3, HALL_Z0 + 0.06, 0.72, 0.08, 20, PI / 2);
  f.boxC(INK, 27.5, CURB + 3.5, HALL_Z0 + 0.2, 0.06, 0.42, 0.04);
  f.boxC(INK, 27.68, CURB + 3.3, HALL_Z0 + 0.2, 0.36, 0.07, 0.04);

  // --- Hall furniture.
  // Canopy columns: a front row (none at x 0, the main entrance) and an inner row.
  for (const x of [-27, -18, -9, 9, 18, 27]) { f.cyl(TRIM, x, CURB + ROOF_Y / 2, 12.6, 0.32, ROOF_Y, 10); f.circ(x, 12.6, 0.36, 99, 'pole'); }
  for (const x of [-22, -2, 16, 26]) { f.cyl(TRIM, x, CURB + ROOF_Y / 2, -2.5, 0.3, ROOF_Y, 10); f.circ(x, -2.5, 0.34, 99, 'pole'); }
  // Baggage carousel (bagageband): static skirt, centre island, belt; the moving ring is its own mesh.
  const CX = 6, CZ = 5.5;
  f.cyl(0x9aa0a6, CX, CURB + 0.28, CZ, 3.3, 0.56, 28);
  f.cyl(0x3a3a40, CX, CURB + 0.6, CZ, 3.15, 0.08, 28);
  f.cyl(0xc8ccd2, CX, CURB + 0.45, CZ, 1.85, 0.9, 24);
  f.cone(0xc8ccd2, CX, CURB + 1.15, CZ, 1.85, 0.5, 24);
  f.cyl(0x5a5e66, CX, CURB + 2.2, CZ, 0.1, 2.6, 8);
  f.sign('CINTA 2 · BAGAGE', CX, CURB + 3.3, CZ, 3.6, 0.6, 0, { bg: '#1b2f6b', fg: '#f7c31b', border: null, scale: 0.6, double: true });
  // The belt is the floor at its own top (the ride carries Stig on it, game/baggageBelt.js §10.16);
  // the centre island stands still: its own floor, stepped up the cone, and the sign's post.
  Object.assign(BELT, { x: f.wx(CX, CZ), z: f.wz(CX, CZ), top: CURB + 0.64, r0: 1.85, r1: 3.3, bags: [] });
  BELT.block = f.circ(CX, CZ, BELT.r1, BELT.top, 'carousel');
  f.circ(CX, CZ, 1.85, CURB + 0.9);
  f.circ(CX, CZ, 1.35, CURB + 1.03);
  f.circ(CX, CZ, 0.85, CURB + 1.17);
  f.circ(CX, CZ, 0.1, 99, 'pole');
  {
    const G = new GeoBuilder(), lf = new Frame(G, G, 0, 0, 0, scene);
    const COL = [0x8a5a3a, BLUE, 0xc0392b, GREEN, OCHRE, ORANGE, 0x6a6a72, 0x8a5a3a, 0xc2307a, 0x2f5a8a, 0xd8743a, 0x5a3a2a];
    const n = 14;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * PI * 2, x = Math.sin(a) * 2.5, z = Math.cos(a) * 2.5;
      if (k === 5) {   // a pair of skis: someone else's luggage (the film's Frösö skier, research-plot §7.1)
        lf.boxC(RED, x - Math.cos(a) * 0.12, CURB + 0.7, z + Math.sin(a) * 0.12, 0.12, 0.05, 1.9, a + PI / 2);
        lf.boxC(RED, x + Math.cos(a) * 0.12, CURB + 0.7, z - Math.sin(a) * 0.12, 0.12, 0.05, 1.9, a + PI / 2);
        continue;
      }
      const w = 0.75 + (k % 3) * 0.1, h = 0.26 + (k % 2) * 0.06;
      lf.boxC(COL[k % COL.length], x, CURB + 0.66 + h / 2, z, w, h, 0.5, a + PI / 2);
      lf.boxC(0x2a2a2a, x, CURB + 0.7 + h, z, 0.25, 0.06, 0.08, a + PI / 2);
      BELT.bags.push({ k, a, top: CURB + 0.66 + h, out: 2.5 + w / 2 });
    }
    const ring = meshOf(G, scene, 0.025);
    ring.position.set(f.wx(CX, CZ), 0, f.wz(CX, CZ));
    onTick((t) => { ring.rotation.y = t * BELT.spin; }, scene);
  }
  // Lost-and-found (OBJETOS PERDIDOS · HITTEGODS): the clerk stands at `hittegods` (-14, 6) behind
  // his counter, facing the hall; behind him a wall of shelves full of suitcases.
  {
    // Open-topped (dollhouse) booth: 2.7 m walls, so cut-aways and the follow camera see the clerk.
    const bx = -14, z0 = 2.4, z1 = 7.7, WH = 2.7;
    f.box(0xe8e0cc, bx, CURB, z0 + 0.2, 11, WH, 0.4);
    f.box(TRIM, bx, CURB + WH, z0 + 0.2, 11.1, 0.12, 0.5);
    for (const sx of [-5.35, 5.35]) {
      f.box(WASH, bx + sx, CURB, (z0 + z1) / 2, 0.3, WH, z1 - z0);
      f.box(TRIM, bx + sx, CURB + WH, (z0 + z1) / 2, 0.4, 0.12, z1 - z0 + 0.1);
      f.solid(bx + sx, (z0 + z1) / 2, 0.3, z1 - z0, 99, 'wall');
    }
    f.solid(bx, z0 + 0.2, 11, 0.4, 99, 'wall');
    const BAGS = [0x8a5a3a, 0x2f5a8a, 0xc0392b, 0x2f6a4a, OCHRE, ORANGE, 0x6a6a72, 0xc2307a, 0x5a3a2a, 0x3a3a40];
    for (let r = 0; r < 3; r++) {
      const y = CURB + 0.3 + r * 0.82;
      f.box(WOOD, bx, y - 0.06, z0 + 0.62, 10.2, 0.06, 0.45);
      let x = bx - 4.9;
      for (let k = 0; x < bx + 4.4; k++) {
        const w = 0.6 + ((k * 7 + r * 3) % 4) * 0.12, h = 0.42 + ((k + r) % 3) * 0.1;
        f.box(BAGS[(k * 3 + r * 5) % BAGS.length], x + w / 2, y, z0 + 0.62, w, h, 0.36);
        x += w + 0.08;
      }
    }
    // On top of the shelves: a julklapp-sized parcel with a red ribbon (the film's "julklapp");
    // an umbrella and a guitar leaning on the shelves.
    f.box(0xf2efe6, bx + 3.2, CURB + WH + 0.12, z0 + 0.2, 0.6, 0.35, 0.4);
    f.box(RED, bx + 3.2, CURB + WH + 0.11, z0 + 0.2, 0.1, 0.37, 0.42);
    f.boxC(INK, bx - 4.6, CURB + 1.1, z0 + 1.1, 0.06, 2.0, 0.06, 0, 0, 0.12);
    sph(f, 0x8a5a3a, bx + 4.5, CURB + 0.7, z0 + 1.1, 0.5, 0.9, 0.22);
    f.boxC(0x5a3a2a, bx + 4.5, CURB + 1.55, z0 + 1.1, 0.1, 1.1, 0.06);
    // Counter in front of the clerk (top 1.05 m) with a bell and a ledger.
    f.box(WOOD, bx, CURB, z1 - 0.35, 10.4, 1.0, 0.7);
    f.box(0xd8743a, bx, CURB + 1.0, z1 - 0.35, 10.6, 0.08, 0.85);
    f.solid(bx, z1 - 0.35, 10.4, 0.7, CURB + 1.08, 'counter');
    f.cyl(0xd8b040, bx + 1.6, CURB + 1.14, z1 - 0.3, 0.12, 0.1, 10);
    f.box(BLUE, bx - 1.2, CURB + 1.08, z1 - 0.3, 0.6, 0.06, 0.45);
    // Sign band across the front, carried by the side walls.
    f.box(WASH, bx, CURB + WH, z1 - 0.1, 11.0, 0.7, 0.2);
    f.sign('OBJETOS PERDIDOS · HITTEGODS', bx, CURB + WH + 0.35, z1 + 0.02, 10.4, 0.6, 0, { bg: '#fbf6ec', fg: '#1b2f6b', border: '#d8743a', scale: 0.62 });
  }
  // SunTrip desk (the reseledare meet the group) and a passport booth with a wheelchair
  // ("Invalido.", §8.6): small set pieces along the back wall.
  {
    f.box(SUNY, -27, CURB, -5.8, 4.2, 1.05, 0.8);
    f.box(TRIM, -27, CURB + 1.05, -5.8, 4.4, 0.08, 1.0);
    f.solid(-27, -5.8, 4.2, 0.8, CURB + 1.1, 'counter');
    f.box(WASH, -27, CURB, -9.6, 4.6, 3.4, 0.3);
    f.cyl(ORANGE, -27, CURB + 2.6, -9.4, 0.7, 0.08, 18, PI / 2);
    f.sign('SUNTRIP', -27, CURB + 1.5, -9.4, 3.4, 0.6, 0, { bg: null, border: null, fg: '#d8321e', scale: 0.8 });
    f.box(GLASS, 11.5, CURB + 1.1, -7.2, 2.4, 1.0, 1.8);
    f.box(0xe8e0cc, 11.5, CURB, -7.2, 2.4, 1.1, 1.8);
    f.box(TRIM, 11.5, CURB + 2.1, -7.2, 2.6, 0.2, 2.0);
    f.solid(11.5, -7.2, 2.4, 1.8, 99, 'booth');
    f.sign('PASAPORTES', 11.5, CURB + 2.5, -6.18, 2.4, 0.4, 0, { bg: '#1b2f6b', fg: '#fbf6ec', border: null, scale: 0.7 });
    const wx = 8.6, wz = -6.4;
    for (const sx of [-0.32, 0.32]) f.cyl(0x3a3a40, wx + sx, CURB + 0.33, wz, 0.32, 0.05, 14, 0, PI / 2);
    f.box(0x5a5e66, wx, CURB + 0.45, wz, 0.55, 0.06, 0.5);
    f.box(BLUE, wx, CURB + 0.5, wz - 0.25, 0.55, 0.55, 0.06);
    f.circ(wx, wz, 0.45, CURB + 0.9, 'chair');
  }
  // Seat banks (orange 70s shells), facing the hall.
  const seats = (x0, n, z) => {
    f.box(0x5a5e66, x0 + n * 0.3, CURB + 0.2, z, n * 0.6, 0.06, 0.5);
    for (let k = 0; k < n; k++) {
      f.box(0xd2601f, x0 + 0.3 + k * 0.6, CURB + 0.4, z, 0.52, 0.08, 0.48);
      f.boxC(0xd2601f, x0 + 0.3 + k * 0.6, CURB + 0.72, z - 0.25, 0.52, 0.6, 0.08, 0, -0.15);
    }
    for (const dx of [0.2, n * 0.6 - 0.2]) f.box(0x5a5e66, x0 + dx, CURB, z, 0.08, 0.4, 0.4);
    f.solid(x0 + n * 0.3, z, n * 0.6, 0.6, CURB + 0.55, 'seat');
  };
  seats(-19, 8, -5.6); seats(17, 8, -5.6); seats(-6, 6, 9.5);
  // Props (breakable): luggage carts, suitcases, a REFRESCOS machine, the plastic Christmas tree.
  for (const [x, z, y] of [[1.6, 9.6, 0.4], [11.2, 2.0, -0.6], [10.8, 9.8, 0.2], [-4, 12.0, 0], [20, 11.2, 0.3], [22, 11.6, 0.1]]) f.prop('bagagevagn', x, z, y);
  for (const [x, z, y] of [[2.0, 1.5, 0.3], [9.4, 1.2, -0.4], [-7.5, 8.2, 1.1], [13.5, 19.2, 0], [19.0, 19.0, 0.2]]) f.prop('resvaska', x, z, y);
  f.prop('automat', -30.0, -1.0, PI / 2);
  f.prop('julgran', -22, 9.5, 0);
  f.prop('papelera', -11.5, 12.0, 0);
  f.prop('papelera', 13.5, 12.0, 0);
  for (const x of [-25.9, 25.9]) f.prop('palmkruka', x, 11.8, 0);

  // --- Canopy roof over the hall (own mesh: hidden while the camera looks into the hall).
  {
    const G = new GeoBuilder(), rf = new Frame(G, G, f.ox, f.oz, f.yaw, scene);
    const zc = (HALL_Z0 + HALL_Z1) / 2, d = HALL_Z1 - HALL_Z0;
    rf.box(0xf2ece0, 0, ROOF_Y, zc, W + 1, 0.5, d);
    rf.box(TRIM, 0, ROOF_Y - 0.5, HALL_Z1 - 0.25, W + 1.2, 1.4, 0.6);          // fascia
    rf.box(ORANGE, 0, ROOF_Y + 0.62, HALL_Z1 + 0.07, W + 1.22, 0.2, 0.04);
    rf.box(0xc87a48, 0, ROOF_Y - 0.42, HALL_Z1 + 0.07, W + 1.22, 0.14, 0.04);
    // Raised entrance portico over the main doors (x -9..9) carrying the big LLEGADAS sign.
    rf.box(TRIM, 0, ROOF_Y + 0.5, HALL_Z1 - 1.6, 18.6, 1.5, 3.2);
    rf.box(ORANGE, 0, ROOF_Y + 1.82, HALL_Z1 + 0.01, 18.62, 0.18, 0.04);
    rf.box(0xc87a48, 0, ROOF_Y + 1.66, HALL_Z1 + 0.01, 18.62, 0.1, 0.04);
    for (const sx of [-1, 1]) rf.box(TRIM, sx * (W / 2 + 0.3), ROOF_Y - 0.5, zc, 0.6, 1.4, d);
    rf.box(0xe0d8c8, 0, ROOF_Y + 0.5, zc - 1, W - 1.5, 0.03, d - 3);                        // roof membrane
    for (const x of [-22, -13, -4, 13, 22]) for (const z of [-4.5, 3]) { rf.box(0x9fcfe8, x, ROOF_Y + 0.5, z, 3.2, 0.3, 2.2); rf.box(TRIM, x, ROOF_Y + 0.8, z, 3.4, 0.06, 0.12); }
    for (let x = -24; x <= 24; x += 8) rf.box(0xe0d8c8, x, ROOF_Y - 0.35, zc, 0.35, 0.35, d - 0.6);   // soffit beams
    for (const [x, z] of [[CX, CZ - 4.5], [-12, 11.2]]) for (const dx of [-1.8, 1.8]) rf.cyl(0x5a5e66, x + dx, ROOF_Y - 0.3, z, 0.03, 0.6, 4);
    // Tinsel garland along the fascia (Christmas week).
    for (let k = 0; k <= 52; k++) {
      const x = -31.2 + k * 1.2;
      rf.sphere([RED, SUNY, GREEN, 0xe8e8f0][k % 4], x, ROOF_Y - 0.6 - Math.abs(Math.sin(k * 0.6)) * 0.25, HALL_Z1 + 0.14, 0.2);
    }
    const roof = meshOf(G, scene);
    // LLEGADAS stands 3 cm in front of the fascia's orange stripe, so its opaque board covers it.
    for (const s of [
      rf.sign('LLEGADAS · ANKOMST', 0, ROOF_Y + 0.95, HALL_Z1 + 0.12, 16, 1.25, 0, { bg: '#fbf6ec', fg: '#1b2f6b', border: null, scale: 0.78 }),
      rf.sign('EQUIPAJES · BAGAGE', CX, ROOF_Y - 0.9, CZ - 4.5, 5, 0.6, 0, { bg: '#1b2f6b', fg: '#f7c31b', border: null, scale: 0.6, double: true }),
      rf.sign('SALIDA · UTGÅNG · TAXI · BUSS', -12, ROOF_Y - 0.9, 11.2, 7, 0.6, 0, { bg: '#1b2f6b', fg: '#fbf6ec', border: null, scale: 0.6, double: true }),
    ]) { scene.remove(s); roof.add(s); }
    const x0 = f.wx(-W / 2 - 1, 0), x1 = f.wx(W / 2 + 1, 0), z0 = f.wz(0, HALL_Z0), z1 = f.wz(0, HALL_Z1 + 0.6);
    const dir = new THREE.Vector3();
    onTick(() => {
      const c = camera;
      if (!c) return;
      const p = c.position;
      // Hysteresis: once hidden, the hall counts 1.5 m larger, so a camera or look ray hovering at
      // the edge (the player shuffling outside the hall) does not pop the roof in and out.
      const m = roof.visible ? 0 : 1.5;
      let inside = p.x > x0 - m && p.x < x1 + m && p.z > z0 - m && p.z < z1 + m && p.y < ROOF_Y + 6 + m;
      if (!inside) {
        c.getWorldDirection(dir);
        if (dir.y < -0.02) {
          const t = (p.y - 1.2) / -dir.y;
          if (t < 70) {
            const px = p.x + dir.x * t, pz = p.z + dir.z * t;
            inside = px > x0 - m && px < x1 + m && pz > z0 - m && pz < z1 + m;
          }
        }
      }
      roof.visible = !inside;
    }, scene);
  }

  // --- Forecourt: bus shelter (BUSS 17), taxi sign, flags, palms in planters.
  {
    const sx = 17, sz = 18.6;
    for (const dx of [-2.6, 2.6]) { f.box(0x5a5e66, sx + dx, CURB, sz, 0.14, 2.6, 0.14); f.circ(sx + dx, sz, 0.12, 99, 'pole'); }
    f.box(SUNY, sx, CURB + 2.6, sz - 0.3, 6.0, 0.15, 1.8);
    f.box(ORANGE, sx, CURB + 2.45, sz + 0.55, 6.0, 0.15, 0.12);
    f.box(GLASS, sx, CURB + 0.6, sz - 1.05, 5.0, 1.8, 0.06);
    f.prop('bank', sx, sz - 0.6, PI);
    f.sign('SUNTRIP · BUSS 17 · TRASLADOS', sx, CURB + 3.05, sz + 0.62, 6.2, 0.7, 0, { bg: '#f7c31b', fg: '#d8321e', scale: 0.6, double: true });
    f.box(0x5a5e66, -21.5, CURB, 18.6, 0.12, 2.8, 0.12);
    f.circ(-21.5, 18.6, 0.12, 99, 'pole');
    f.sign('TAXI', -21.5, CURB + 3.1, 18.66, 1.8, 0.6, 0, { bg: '#1d1426', fg: '#f7c31b', border: null, scale: 0.7, double: true });
    f.sphere(0x3fd86a, -21.5, CURB + 3.55, 18.6, 0.18);
    // Flags: Spain, the Canaries, SunTrip.
    flag(f, 29.2, 17.5, 8, [0xc8202a, SUNY, SUNY, 0xc8202a], false, 0);
    flag(f, 29.2, 20.5, 8, [0xf4f4f0, 0x1f5fa8, SUNY], true, 1.3);
    flag(f, 29.2, 23.5, 8, [SUNY, ORANGE, SUNY], false, 2.1);
    for (const [x, z] of [[-29.6, 17], [-29.6, 29.5], [29.6, 29.5]]) {
      f.cyl(0xe8e0cc, x, CURB + 0.35, z, 1.0, 0.7, 12);
      f.circ(x, z, 1.0, CURB + 0.7, 'planter');
      f.tree(x, z, 1.05, 'palm');
    }
  }
  // Named cars (§6.3): the SunTrip coach in the bus bay, the locked airport taxi; one more taxi.
  f.car('bus', 16, 24, -PI / 2, { name: 'buss17', color: 0xf4f4f0 });
  f.car('taxi', -16, 24, -PI / 2, { name: 'taxiAirport', locked: true });
  f.car('taxi', -24, 24, -PI / 2, { locked: true });

  // --- Airside, beyond the north road and the bound wall: apron, perimeter fence, the DC-8.
  const AZ = -95;   // DC-8 at local (0, -95) = world (240, -335)
  f.flat(0xc4c0b4, 0, AZ - 5, 130, 90, CURB + 0.015);
  f.flat(0xf2c12e, 0, AZ + 16, 90, 0.3, CURB + 0.02);
  f.flat(0xf2c12e, -46, AZ, 0.3, 32, CURB + 0.02);
  for (let k = 0; k < 8; k++) f.flat(0xf4f4f0, -45 + k * 13, -63, 6, 0.25, CURB + 0.02);
  for (let x = -60; x <= 60; x += 3) {
    f.box(0x8a8e94, x, CURB, -74.4, 0.08, 2.4, 0.08);
    if (x < 60) for (const y of [0.9, 1.6, 2.3]) f.box(0xa8acb0, x + 1.5, CURB + y, -74.4, 3, 0.03, 0.03);
  }
  f.sign('ZONA RESTRINGIDA · PROHIBIDO EL PASO', 0, CURB + 1.4, -74.3, 7.5, 0.7, 0, { bg: '#d8321e', fg: '#ffffff', border: null, scale: 0.55, double: true });
  for (const sx of [-1, 1]) {
    const x = sx * 62, z = AZ - 10;
    f.cyl(0x8a8e94, x, CURB + 8, z, 0.2, 16, 8);
    f.box(0x5a5e66, x, CURB + 15.6, z, 2.4, 0.9, 0.6);
    f.box(0xfff1b8, x, CURB + 15.55, z + 0.31, 2.1, 0.6, 0.02);
    f.box(0xfff1b8, x, CURB + 15.54, z + 0.32, 2.12, 0.62, 0.04, 0, TOWN.nightGlow);   // lit after dark (§13.3)
  }
  parkedDC8(f, 0, AZ, -PI / 2 - 0.3);
}

// The parked DC-8 (§6.3/§6.4): A2's buildPlaneExterior (the flight airframe) on its gear, plus
// stairs, a tug and baggage carts. The flight airframe may be open on top (the cabin is a cut-away
// in flight): if the measured fuselage has no roof, a top hull with windows is added here.
function parkedDC8(f, lx, lz, yaw) {
  const scene = f.scene;
  const g = new THREE.Group();
  buildPlaneExterior(g, { gear: true });
  // The island sun is low and the 2048² map covers 150 m, so the round fuselage self-shadows in
  // stripes (acne) along its belly. The airframe still casts onto the apron; it only stops
  // receiving (toon shading by normal already darkens the underside).
  g.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
  g.updateMatrixWorld(true);
  // Measure the airframe (any shape A2 delivers): lowest point, and a cross-section of the forward
  // cabin at z 12 by raycasting (belly bottom, half width, roof or cut-wall top).
  const meshes = [];
  g.traverse((o) => { if (o.isMesh && o.name !== 'outline' && !o.isInstancedMesh) meshes.push(o); });
  const bb = new THREE.Box3().setFromObject(g);
  const minY = isFinite(bb.min.y) ? bb.min.y : -3.6;
  const rc = new THREE.Raycaster(), o3 = new THREE.Vector3(), d3 = new THREE.Vector3();
  const hit = (ox, oy, oz, dx, dy) => { rc.set(o3.set(ox, oy, oz), d3.set(dx, dy, 0)); rc.far = 200; const h = rc.intersectObjects(meshes, false)[0]; return h ? h.point : null; };
  const zs = 12;
  const bottom = hit(0, -80, zs, 0, 1)?.y ?? -3.4;
  const halfW = hit(40, bottom + 1.0, zs, -1, 0)?.x ?? 3.5;
  const top = hit(0, 80, zs, 0, -1)?.y ?? null;
  const ground = CURB + 0.015;
  const lift = ground - minY;
  g.position.set(f.wx(lx, lz), lift, f.wz(lx, lz));
  g.rotation.y = f.yaw + yaw;
  scene.add(g);
  const gy = ground - lift;   // the apron in plane-local y
  const G = new GeoBuilder();
  const r = halfW > 1 ? halfW : 3.5;
  if (top === null || top < bottom + 1.6 * r) {
    // Open or low top: close it with an arc from the side-wall tops over the roof, end caps, windows.
    const yc = bottom + r;
    const wallTop = hit(r - 0.25, 80, zs, 0, -1)?.y ?? yc;
    const a = Math.acos(Math.max(-0.95, Math.min(0.95, (wallTop - 0.06 - yc) / r)));
    const sMaxY = wallTop;
    const z0 = -19.5, z1 = 18.6, L = z1 - z0, zm = (z0 + z1) / 2;
    G.add(arcGeo(r, L, a, PI, 28), 0xf4f4f0, mat(0, yc, zm));
    G.add(sectorGeo(r, a, 24), 0xf4f4f0, mat(0, yc, z1));
    G.add(sectorGeo(r, a, 24), 0xf4f4f0, mat(0, yc, z0, 0, PI, 0));
    const wy = Math.max(sMaxY + 0.35, yc - 0.15), wx = Math.sqrt(Math.max(0.1, r * r - (wy - yc) ** 2)) + 0.02;
    for (let z = -16; z <= 15.5; z += 1.25) for (const sx of [-1, 1]) G.box(0x2a3a4a, sx * wx, wy, z, 0.06, 0.42, 0.36);
    for (const sx of [-1, 1]) G.box(0x1b2f6b, sx * (wx + 0.01), wy - 0.38, zm, 0.05, 0.16, L - 1);
    for (const sx of [-1, 1]) for (const z of [14.2, -15.5]) G.box(0xd8d8d0, sx * wx, wy - 0.5, z, 0.05, 1.9, 1.0);   // doors
    const name = signMesh('SOL-VIKING', 6, 0.8, { bg: null, border: null, fg: '#1b2f6b', scale: 0.8 });
    name.position.set(wx + 0.04, wy + 0.75, 10);
    name.rotation.y = PI / 2;
    g.add(name);
    const reg = signMesh('SE-SOL', 3.2, 0.7, { bg: null, border: null, fg: '#1b2f6b', scale: 0.8 });
    reg.position.set(wx + 0.04, wy + 0.7, -12);
    reg.rotation.y = PI / 2;
    g.add(reg);
  }
  // Passenger stairs at the forward port door (local +x side), a tug and three baggage carts.
  const sill = 0.15, sx0 = r + 0.25, run = Math.max(3, (sill - gy) * 1.25);
  const sy = (sill + gy) / 2, ang = Math.atan2(sill - gy, run), len = Math.hypot(run, sill - gy);
  G.box(0xf4f4f0, sx0 + 1.0, sill - 0.12, 14.2, 2.0, 0.24, 2.2);                              // platform
  G.box(0xe8e8ec, sx0 + 2.0 + run / 2, sy - 0.2, 14.2, len, 0.3, 1.6, 0, 0, -ang);
  for (const dz of [-0.85, 0.85]) G.box(RED, sx0 + 2.0 + run / 2, sy + 0.75, 14.2 + dz, len, 0.08, 0.08, 0, 0, -ang);
  G.box(0x5a5e66, sx0 + 2.5 + run / 2, gy + 0.6, 14.2, run + 2.5, 0.8, 2.2);                 // truck chassis
  G.box(SUNY, sx0 + 2.5 + run + 1.2, gy + 1.2, 14.2, 1.8, 1.6, 2.1);                          // cab
  G.box(0x2a3a4a, sx0 + 2.5 + run + 1.9, gy + 1.5, 14.2, 0.4, 0.6, 1.8);
  for (const dz of [-1.0, 1.0]) for (const dx of [1.5, run + 2.8]) G.cyl(0x2a2a2a, sx0 + dx, gy + 0.4, 14.2 + dz, 0.4, 0.3, 10, PI / 2);
  G.box(SUNY, 10, gy + 0.6, -10, 1.8, 1.0, 3.0);
  G.box(0x2a3a4a, 10, gy + 1.4, -10.6, 1.5, 0.7, 1.0);
  for (let k = 0; k < 3; k++) {
    const z = -13.5 - k * 3.2;
    G.box(0x8a8e94, 10, gy + 0.55, z, 1.7, 0.12, 2.6);
    for (let b = 0; b < 4; b++) G.box([0x8a5a3a, BLUE, RED, GREEN, OCHRE][(b + k) % 5], 10 + (b % 2 ? 0.4 : -0.4), gy + 0.85 + (b > 1 ? 0.45 : 0), z + (b % 2 ? 0.5 : -0.5), 0.7, 0.4, 1.0);
    for (const dx of [-0.7, 0.7]) for (const dz of [-0.9, 0.9]) G.cyl(0x2a2a2a, 10 + dx, gy + 0.25, z + dz, 0.22, 0.14, 8, 0, 0, PI / 2);
  }
  for (const [x, z] of [[2.2, 21.5], [-2.2, 21.5], [5, 24], [-5, 24]]) G.cone(ORANGE, x, gy + 0.35, z, 0.25, 0.7, 8);
  g.add(toonMesh(G.build(), { outline: 0.04 }));
}

// ---------------------------------------------------------------------------------------------
// The dream plane (6,1): a faded red DC-7-like airliner, nose to the road, on a dirt lot. A stack
// of crates leads up onto the left wing (pryl_kamera at (-4, -2), 3.6). Windsock, an old hangar.

function dromplan(f, W) {
  f.flat(0xb89a6a, 0, 0, W, W, CURB + 0.02);
  for (const x of [-1.6, 1.6]) f.flat(0x9a7a52, x, 22, 0.9, 18, CURB + 0.025);                 // tyre tracks
  for (const [x, z, w, d] of [[-18, -10, 9, 6], [16, 8, 7, 9], [-12, 18, 6, 4], [20, -4, 5, 5], [-24, 4, 6, 8]]) f.flat(0xa88a5c, x, z, w, d, CURB + 0.023);
  for (let k = 0; k < 40; k++) {
    const x = ((k * 37) % 58) - 29, z = ((k * 53) % 58) - 29;
    if (Math.abs(x) < 19 && z > -24 && z < 15) continue;
    if (k % 3) tuft(f, x, z, 0.8 + (k % 4) * 0.15, k % 2 ? 0x8a9a4a : 0xa0a050);
    else f.ico(0x9a8a7a, x, CURB + 0.1, z, 0.35 + (k % 3) * 0.1);
  }
  const FY = 3.9, FR = 1.9, WT = 3.0;
  const RED_F = 0xb8574a, RED_D = 0x8a3a30, WHITE_F = 0xebe4d4, ALU = 0xb4b8bc, PROP = 0x2a2a2e;
  // Fuselage: white top half, faded red bottom half; red nose with a white cockpit cap; tail cone.
  f.S.add(arcGeo(FR, 23, PI / 2, PI, 20), WHITE_F, mat(f.wx(0, -2.5), FY, f.wz(0, -2.5)));
  f.S.add(arcGeo(FR, 23, PI / 2, 0, 20), RED_F, mat(f.wx(0, -2.5), FY, f.wz(0, -2.5)));
  sph(f, RED_F, 0, FY, 9, FR * 2, FR * 2, 9, 0, 20);
  sph(f, WHITE_F, 0, FY + 0.3, 8.6, FR * 1.9, FR * 1.75, 8.2, 0, 20);
  f.S.add(taperGeo(FR, 0.5, 8.5, 18), RED_F, mat(f.wx(0, -18.2), FY + 0.35, f.wz(0, -18.2), PI / 2 + 0.09, 0, 0));
  // Cockpit windows, cabin windows (a few boarded up), cheat line, rust and peeled paint.
  for (const sx of [-1, 1]) f.boxC(DARK, sx * 0.62, FY + 1.05, 11.9, 0.9, 0.42, 0.5, sx * 0.5, -0.5);
  f.boxC(DARK, 0, FY + 1.18, 12.15, 0.55, 0.38, 0.45, 0, -0.55);
  for (let z = -11.5; z <= 6.5; z += 1.05) for (const sx of [-1, 1]) {
    const k = Math.round(z * 3 + sx);
    f.box(Math.abs(k) % 7 === 0 ? 0xb89a6a : DARK, sx * 1.9, FY + 0.18, z, 0.08, 0.42, 0.42);
  }
  for (const sx of [-1, 1]) f.box(RED_D, sx * 1.88, FY - 0.32, -2.5, 0.06, 0.2, 22);
  for (const [sx, y, z, h, c] of [[1, 3.0, 2, 0.6, 0x8a4a2e], [-1, 3.3, -6, 0.5, 0x8a4a2e], [1, 4.6, -9, 0.7, 0xd8d0c0], [-1, 4.4, 4, 0.5, 0xd8d0c0], [1, 2.5, -12, 0.4, 0x7a4028]]) {
    f.box(c, sx * (Math.sqrt(Math.max(0, FR * FR - (y + h / 2 - FY) ** 2)) + 0.02), y, z, 0.06, h, 1.8);
  }
  f.sign('EC-DRM', 1.78, FY + 0.95, -10.5, 3.2, 0.75, PI / 2, { bg: null, border: null, fg: '#8a3a30', scale: 0.85 });
  f.sign('EC-DRM', -1.78, FY + 0.95, -10.5, 3.2, 0.75, -PI / 2, { bg: null, border: null, fg: '#8a3a30', scale: 0.85 });
  // Fin (swept), dorsal fillet, tailplanes.
  f.boxC(RED_F, 0, FY + 3.3, -20.4, 0.34, 5.6, 3.4, 0, -0.42);
  f.boxC(WHITE_F, 0, FY + 3.9, -20.65, 0.36, 0.6, 3.1, 0, -0.42);
  f.boxC(RED_D, 0, FY + 2.6, -16.8, 0.3, 1.0, 5.4, 0, -0.16);
  f.box(ALU, 0, FY + 0.45, -21.2, 11.5, 0.22, 2.3);
  for (const sx of [-1, 1]) f.box(RED_D, sx * 5.4, FY + 0.45, -21.2, 0.8, 0.24, 2.32);
  // Wings (top = WT) in three tapered sections with red tips; solid columns (you stand on them).
  const sect = [[4.55, 5.9, -2.0, 5.0], [10.0, 5.0, -2.0, 4.0], [14.75, 4.5, -1.9, 3.0]];
  for (const sx of [-1, 1]) {
    for (const [x, w, z, d] of sect) {
      f.box(ALU, sx * x, WT - 0.32, z, w, 0.32, d);
      f.box(0x9aa0a4, sx * x, WT - 0.3, z - d / 2 + 0.35, w - 0.3, 0.3, 0.7);            // flaps
      f.solid(sx * x, z, w, d, WT, 'wing');
    }
    f.box(RED_F, sx * 16.4, WT - 0.31, -1.9, 1.2, 0.33, 3.02);
    sph(f, RED_F, sx * 17.0, WT - 0.16, -1.9, 0.6, 0.32, 3.0);
  }
  // Engines: nacelles, cowlings, spinners, three-blade props (one bent, one missing).
  for (const [x, state] of [[-11.4, 'bent'], [-5.8, 'ok'], [5.8, 'ok'], [11.4, 'bare']]) {
    f.cyl(ALU, x, WT - 0.1, -1.35, 0.78, 6.5, 14, PI / 2);
    sph(f, 0x9aa0a4, x, WT - 0.35, -4.4, 1.4, 1.2, 2.2);
    f.solid(x, -1.35, 1.6, 6.5, WT + 0.7, 'nacelle');
    if (state === 'bare') {
      f.cyl(0x4a4a50, x, WT - 0.1, 2.2, 0.62, 0.9, 12, PI / 2);
      for (let k = 0; k < 9; k++) { const a = (k / 9) * PI * 2; f.cyl(0x5a5a60, x + Math.sin(a) * 0.55, WT - 0.1 + Math.cos(a) * 0.55, 2.45, 0.14, 0.5, 6, PI / 2); }
      continue;
    }
    f.cyl(0x5a5e62, x, WT - 0.1, 2.3, 0.86, 0.9, 14, PI / 2);
    f.cyl(RED_F, x, WT - 0.1, 2.8, 0.87, 0.12, 14, PI / 2);
    f.S.cone(0xd8d8d8, f.wx(x, 3.25), WT - 0.1, f.wz(x, 3.25), 0.36, 0.8, 10, PI / 2, f.yaw, 0);
    for (let k = 0; k < 3; k++) {
      const a = k * (2 * PI / 3) + (x > 0 ? 0.4 : 1.1);
      const bend = state === 'bent' && k === 1 ? 0.6 : 0;
      f.boxC(PROP, x + Math.sin(a) * 0.95, WT - 0.1 + Math.cos(a) * 0.95, 3.0, 0.3, 1.8, 0.08, 0, bend, -a);
      f.boxC(SUNY, x + Math.sin(a) * 1.75, WT - 0.1 + Math.cos(a) * 1.75, 3.0 + bend * 0.5, 0.3, 0.25, 0.09, 0, bend, -a);
    }
    f.solid(x, 3.0, 3.6, 0.5, 99, 'prop');
  }
  // Landing gear: twin nose wheels, main gear under the inboard nacelles (one tyre flat).
  f.cyl(0x6a6e74, 0, 1.3, 10.4, 0.12, 1.6, 8);
  for (const dx of [-0.28, 0.28]) f.cyl(0x2a2a2a, dx, CURB + 0.42, 10.4, 0.42, 0.26, 12, 0, PI / 2);
  for (const sx of [-1, 1]) {
    f.cyl(0x6a6e74, sx * 5.8, 1.6, -1.2, 0.16, 2.0, 8);
    for (const dx of [-0.36, 0.36]) {
      const flat = sx > 0 && dx > 0;
      f.S.cyl(0x2a2a2a, f.wx(sx * 5.8 + dx, -1.2), CURB + (flat ? 0.42 : 0.6), f.wz(sx * 5.8 + dx, -1.2), 0.6, 0.34, 14, 0, 0, PI / 2);
      if (flat) f.box(0x2a2a2a, sx * 5.8 + dx, CURB, -1.2, 0.36, 0.25, 1.5);
    }
  }
  // Fuselage and tail colliders (walls, tops at the real heights).
  f.solid(0, -0.5, 3.8, 28, FY + FR, 'plane');
  f.solid(0, -18, 2.6, 7, FY + 1.5, 'plane');
  // The crate stairs up to the left wing's trailing edge (pryl_kamera route), with a coin trail.
  const STX = -4;
  for (let k = 0; k < 7; k++) {
    const top = CURB + 0.4 * (k + 1), z = -11.0 + k;
    f.box(k % 2 ? 0xa87a44 : 0xc08a4a, STX + (k % 2 ? 0.08 : -0.06), CURB, z, 1.6, top - CURB, 1.0);
    for (let y = CURB + 0.4; y < top - 0.01; y += 0.4) f.box(WOOD2, STX, y - 0.03, z, 1.64, 0.06, 1.04);
    for (const dx of [-0.79, 0.79]) f.box(WOOD2, STX + dx, CURB, z, 0.08, top - CURB, 1.04);
    f.solid(STX, z, 1.6, 1.0, top, 'crate');
    coinAt(f, STX, z, top + 0.75);
  }
  for (const [x, z, ly] of [[-6.6, -11.5, 0.3], [-6.4, -9.8, 0], [-2.4, -12.2, 0.2]]) f.prop('tunna', x, z, ly);
  f.prop('tomatlada', -7.0, -13.6, 0.4);
  // Windsock (pole static, sock sways).
  {
    const px = 25, pz = 18;
    f.cyl(0xd8d8d8, px, CURB + 3.6, pz, 0.08, 7.2, 8);
    f.circ(px, pz, 0.15, 99, 'pole');
    const G = new GeoBuilder();
    for (let k = 0; k < 5; k++) G.cyl(k % 2 ? 0xf4f4f0 : ORANGE, 0.35 + k * 0.5, 0, 0, 0.42 - k * 0.06, 0.5, 10, 0, 0, PI / 2);
    const sock = meshOf(G, f.scene, 0.02);
    sock.position.set(f.wx(px, pz), CURB + 7.0, f.wz(px, pz));
    onTick((t) => { sock.rotation.y = 0.6 + Math.sin(t * 0.5) * 0.35; sock.rotation.z = -0.12 + Math.sin(t * 1.7) * 0.05; }, f.scene);
  }
  // Old quonset hangar in the north-east corner.
  {
    const hx = 21, hz = -23, R = 6, L = 14;
    f.S.add(arcGeo(R, L, PI / 2, PI, 18), 0x9aa0a4, mat(f.wx(hx, hz), CURB, f.wz(hx, hz)));
    for (let z = hz - L / 2 + 1; z < hz + L / 2; z += 2) f.S.add(arcGeo(R + 0.04, 0.12, PI / 2, PI, 18), 0x7a8086, mat(f.wx(hx, z), CURB, f.wz(hx, z)));
    f.S.add(halfDiscGeo(R), 0x8a9094, mat(f.wx(hx, hz + L / 2), CURB, f.wz(hx, hz + L / 2)));
    f.S.add(halfDiscGeo(R), 0x8a9094, mat(f.wx(hx, hz - L / 2), CURB, f.wz(hx, hz - L / 2), 0, PI, 0));
    f.box(0x4a4e54, hx, CURB, hz + L / 2 + 0.02, 5.0, 3.8, 0.1);
    f.box(0x8a4a2e, hx + 3.6, CURB + 1.2, hz + L / 2 + 0.03, 1.1, 0.6, 0.06);
    f.sign('HANGAR 2', hx, CURB + 4.5, hz + L / 2 + 0.06, 3.2, 0.6, 0, { bg: '#e8e2d4', fg: '#8a3a30', border: null, scale: 0.7 });
    f.solid(hx, hz, 2 * R, L, 99, 'building');
    for (const [x, z] of [[14, -14.5], [13, -15.6], [12.4, -14.2]]) f.prop('tunna', x, z, 0);
  }
  // Broken fence along the north side; cacti and agaves; a scraggly palm.
  for (let x = -30; x <= 8; x += 3) {
    if (x === -21 || x === -9) continue;
    f.boxC(WOOD2, x, CURB + 0.65, -30.4, 0.12, 1.3, 0.12, 0, 0, (x % 2) * 0.12);
    if (x < 8 && x !== -24 && x !== -12) f.box(0x8a8e94, x + 1.5, CURB + 0.9, -30.4, 3, 0.03, 0.03);
  }
  cardon(f, -26, -24, 1.1); cardon(f, 27, 4, 0.9); cardon(f, -27, 26, 0.8);
  agave(f, 10, 26); agave(f, -22, 12, 1.2); agave(f, 26, -8);
  // The palm stands south of the wing tip, out of the plank jump's run-out from the road at x 200
  // (it was at (-24, -2), in its lane: feature 40, §10.27).
  f.tree(-24, 6, 0.9, 'palm');
  // Road-side sign (AERÓDROMO) and the joke plate.
  postSign(f, 'AERÓDROMO', -14, 27.5, 0, 6, 1.4, CURB + 3.4, { bg: '#e8e2d4', fg: '#8a3a30' });
  f.sign('PROHIBIDO SUBIR AL AVIÓN\nKLÄTTRING FÖRBJUDEN', -14, CURB + 2.1, 27.66, 4.2, 0.9, 0, { bg: '#fbf6ec', fg: '#d8321e', scale: 0.62, double: true });
}

// ---------------------------------------------------------------------------------------------
// Faro de Maspalomas (0,6): ~56 m grey-blue stone tower rising from the keeper's house (roof
// top 4.0, a walkable terrace reached by a sand-dune ramp on the east, coin arc on it), a paved
// plaza with palms in front, dunes around. Lantern glow and a rotating beam at night.

function fyren(f, W) {
  f.flat(SAND, 0, 0, W, W, CURB + 0.02);
  // Plaza in front (south) with a compass rose; promenade on to the beach (east).
  f.flat(0xe8dcc0, 0, 16.5, 40, 29, CURB + 0.03);
  f.flat(0xe8dcc0, 25.5, 16.5, 11, 9, CURB + 0.03);
  f.flat(0xc8b490, 0, 16, 12, 12, CURB + 0.033);
  f.flat(0xe8dcc0, 0, 16, 10.6, 10.6, CURB + 0.036);
  for (let k = 0; k < 8; k++) f.flat(k % 2 ? 0x7a8690 : TERRA, 0, 16, 0.5, k % 2 ? 7 : 10, CURB + 0.04, (k * PI) / 8);
  f.cyl(TERRA, 0, CURB + 0.05, 16, 0.9, 0.04, 16);
  for (let x = -18; x <= 18; x += 4) if (Math.abs(x) > 6) f.flat(0xd4c4a0, x, 16.5, 0.18, 28, CURB + 0.035);
  // Keeper's house: 16 x 16 stone block around the tower base, walkable flat roof at 4.0.
  const HX = 0, HZ = -8, HS = 16, HT = 4.0;
  const STONE = 0xe2d8c2, QUOIN = 0x8e9aa4;
  f.box(STONE, HX, CURB, HZ, HS, HT - CURB, HS);
  f.solid(HX, HZ, HS, HS, HT, 'building');
  f.box(0xd2c8b0, HX, HT - 0.02, HZ, HS - 0.6, 0.04, HS - 0.6);
  // Parapet (low, step-over) with a gap where the dune ramp arrives (east side).
  for (const [x, z, w, d] of [[0, HZ - HS / 2 + 0.15, HS, 0.3], [0, HZ + HS / 2 - 0.15, HS, 0.3], [-HS / 2 + 0.15, HZ, 0.3, HS]]) f.box(TRIM, x, HT, z, w, 0.35, d);
  for (const [z0, z1] of [[HZ - HS / 2, HZ - 2.6], [HZ + 2.6, HZ + HS / 2]]) f.box(TRIM, HS / 2 - 0.15, HT, (z0 + z1) / 2, 0.3, 0.35, z1 - z0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let y = CURB; y < HT - 0.3; y += 0.7) {
    f.box(QUOIN, HX + sx * (HS / 2 - 0.35), y, HZ + sz * (HS / 2 - 0.35), 0.74, 0.62, 0.74);
  }
  f.box(QUOIN, HX, HT - 0.55, HZ, HS + 0.1, 0.25, HS + 0.1);
  // Windows with green shutters, an arched door and a plaque on the south face.
  const win = (x, z, ly) => {
    const c = Math.cos(ly), s = Math.sin(ly);
    f.boxC(DARK, x, CURB + 2.0, z, 0.9, 1.3, 0.1, ly);
    for (const d of [-0.7, 0.7]) f.boxC(0x2f6a4a, x + d * c, CURB + 2.0, z - d * s, 0.45, 1.4, 0.08, ly);
    f.boxC(TRIM, x, CURB + 1.3, z, 1.1, 0.12, 0.2, ly);
  };
  for (const x of [-5, 5]) win(x, HZ + HS / 2 + 0.05, 0);
  for (const z of [HZ - 4, HZ + 4]) win(HX - HS / 2 - 0.05, z, -PI / 2);
  win(HX + HS / 2 + 0.05, HZ - 5.5, PI / 2);
  f.box(0x5a3a2a, 0, CURB, HZ + HS / 2 + 0.03, 1.6, 2.3, 0.1);
  f.cyl(0x5a3a2a, 0, CURB + 2.3, HZ + HS / 2 + 0.04, 0.8, 0.1, 14, PI / 2);
  f.S.add(halfDiscGeo(1.05), QUOIN, mat(f.wx(0, HZ + HS / 2 + 0.01), CURB + 2.3, f.wz(0, HZ + HS / 2 + 0.01)));
  f.box(STONE, 0, CURB, HZ + HS / 2 + 0.6, 3.0, 0.15, 1.2);
  f.sign('FARO DE MASPALOMAS · 1890', 0, CURB + 3.35, HZ + HS / 2 + 0.07, 5.2, 0.5, 0, { bg: '#d2c8b0', fg: '#3a4a58', border: null, scale: 0.7 });
  // The tower.
  const TX = HX, TZ = HZ, TOP = 50;
  const rAt = (y) => 3.4 - (y / TOP) * 0.95;
  f.S.add(taperGeo(rAt(TOP), rAt(0), TOP - CURB, 20), 0x8e9aa4, mat(f.wx(TX, TZ), (TOP + CURB) / 2, f.wz(TX, TZ)));
  for (const y of [HT + 0.2, 14, 24, 34, 44]) f.cyl(0x76828c, TX, y, TZ, rAt(y) + 0.07, 0.45, 20);
  for (let y = HT + 1.6; y < TOP - 0.8; y += 1.6) f.cyl(0x808c96, TX, y, TZ, rAt(y) + 0.025, 0.07, 20);   // stone courses
  for (const y of [10, 18, 28, 38]) for (const dz of [1, -1]) f.boxC(DARK, TX, y, TZ + dz * rAt(y), 0.4, 1.1, 0.12);
  f.circ(TX, TZ, rAt(0), 99, 'tower');
  f.cyl(0xa8b2ba, TX, TOP + 0.5, TZ, 3.0, 1.0, 20);
  for (let k = 0; k < 16; k++) { const a = (k / 16) * PI * 2; f.boxC(0xa8b2ba, TX + Math.sin(a) * 2.75, TOP - 0.25, TZ + Math.cos(a) * 2.75, 0.35, 0.5, 0.35, a); }
  f.cyl(0x9aa4ac, TX, TOP + 1.15, TZ, 3.3, 0.3, 20);
  for (let k = 0; k < 20; k++) { const a = (k / 20) * PI * 2; f.cyl(0x3a4a48, TX + Math.sin(a) * 3.15, TOP + 1.8, TZ + Math.cos(a) * 3.15, 0.04, 1.0, 4); }
  for (let k = 0; k < 20; k++) { const a = ((k + 0.5) / 20) * PI * 2; f.boxC(0x3a4a48, TX + Math.sin(a) * 3.12, TOP + 2.3, TZ + Math.cos(a) * 3.12, 1.0, 0.07, 0.07, a + PI / 2); }
  f.cyl(0x3a4a48, TX, TOP + 1.55, TZ, 1.75, 0.5, 16);
  f.cyl(0xd8eef0, TX, TOP + 2.95, TZ, 1.6, 2.3, 16);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * PI * 2; f.boxC(0x3a4a48, TX + Math.sin(a) * 1.62, TOP + 2.95, TZ + Math.cos(a) * 1.62, 0.1, 2.3, 0.1, a); }
  f.cone(0x3a4a48, TX, TOP + 4.75, TZ, 1.8, 1.3, 16);
  f.cyl(0x3a4a48, TX, TOP + 5.7, TZ, 0.06, 0.9, 6);
  f.sphere(0x3a4a48, TX, TOP + 6.2, TZ, 0.3);
  // Night: a warm lantern core and a rotating beam (only while the sun is low: gfx.beaconLit).
  {
    const ly = TOP + 2.95, wx = f.wx(TX, TZ), wz = f.wz(TX, TZ);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1.64, 1.64, 2.25, 16), new THREE.MeshBasicMaterial({ color: 0xfff0b0 }));
    core.position.set(wx, ly, wz);
    // The beam is added light that fades to nothing along its 140 m: warm at the lantern, black (adds
    // nothing) at the open end, unfogged. Outer faces only, so the near wall is one layer and the
    // inside never shows through the open end. Plain alpha read as a grey tube with a disc on its end.
    const beamMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const beamGeo = new THREE.ConeGeometry(9, 140, 16, 6, true).rotateZ(PI / 2).translate(70, 0, 0);
    {
      const p = beamGeo.attributes.position, c = [];
      for (let k = 0; k < p.count; k++) { const t = (1 - p.getX(k) / 140) ** 2; c.push(0.36 * t, 0.32 * t, 0.2 * t); }
      beamGeo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    }
    const beam = new THREE.Group();
    for (const a of [0, PI]) { const b = new THREE.Mesh(beamGeo, beamMat); b.rotation.y = a; beam.add(b); }
    beam.position.set(wx, ly, wz);
    core.visible = beam.visible = false;
    f.scene.add(core, beam);
    onTick((t) => {
      const night = beaconLit();
      core.visible = beam.visible = night;
      if (night) beam.rotation.y = t * 0.8;
    }, f.scene);
  }
  // Dune ramp on the east side: from the sand (x 22) up to the roof terrace (x 8) at 4.0.
  f.S.add(duneGeo(14, 5, HT - CURB), 0xe6cb94, mat(f.wx(15, HZ), CURB, f.wz(15, HZ), 0, f.yaw - PI / 2, 0));
  ramp(f.wx(15, HZ), f.wz(15, HZ), f.yaw - PI / 2, 5, 14, CURB, HT);
  for (const [x, dz] of [[19, -2.8], [16.5, 3.4], [13, -4.2], [11, 4.6], [20.5, 1.8]]) tuft(f, x, HZ + dz, 1.1, 0x9aa05a);
  for (let k = 0; k < 4; k++) { const x = 20 - k * 3.2; coinAt(f, x, HZ, CURB + (HT - CURB) * (22 - x) / 14 + 0.75); }
  // Coin arc on the roof terrace, around the south side of the tower.
  for (let k = 0; k <= 8; k++) { const a = (k / 8) * PI; coinAt(f, HX + Math.cos(a) * 5.6, HZ + Math.sin(a) * 5.6, HT + 0.75); }
  // Dunes, grass, tamarisks and palms around.
  for (const [x, z, rx, rz, h] of [[-22, -20, 8, 6, 0.35], [-24, 0, 6, 9, 0.3], [-18, 26, 7, 4, 0.25], [22, -24, 7, 6, 0.35], [24, 6, 4, 4, 0.2], [-4, -26, 9, 4, 0.3]]) mound(f, x, z, rx, rz, h, 0xe2c58e);
  for (let k = 0; k < 26; k++) {
    const x = ((k * 41) % 60) - 30, z = ((k * 29) % 60) - 30;
    if (Math.abs(x) < 23 && z > -18 && z < 31) continue;
    tuft(f, x, z, 1 + (k % 3) * 0.2, k % 2 ? 0x9aa05a : 0x7a9a5a);
  }
  for (const [x, z] of [[-26, -10], [-14, -26], [26, -14]]) { f.ico(0x7a8a6a, x, CURB + 0.7, z, 2.2); f.circ(x, z, 0.8, CURB + 1.2, 'bush'); }
  for (const [x, z, s] of [[-16, 6, 1.1], [16, 6, 1.0], [-16, 27, 0.95], [16, 27, 1.05], [-27, 18, 1.2]]) f.tree(x, z, s, 'palm');
  for (const [x, z, ly] of [[-9, 23, PI], [9, 23, PI], [-12, 10, PI / 2], [12, 10, -PI / 2]]) f.prop('bank', x, z, ly);
  f.prop('papelera', -6, 28, 0); f.prop('papelera', 6, 28, 0);
  f.prop('vykort', -19, 14, PI / 2);
  postSign(f, 'FARO DE MASPALOMAS', 0, 29.2, 0, 7, 1.3, CURB + 2.4, { bg: '#e2d8c2', fg: '#3a4a58', post: 0x8e9aa4 });
}

// ---------------------------------------------------------------------------------------------
// The beach (1..4,6) and (6,6): a promenade with palms along the north, sand, sunbed rows with
// parasols facing the sea, plus one feature set per block. The (3,6) block keeps a clear lane from
// the road to the `playa` landmark (0, 10) so a car can drive down onto the sand.

function playa(f, W, ctx) {
  const i = ctx.i, rnd = ctx.rnd;
  f.flat(SAND, 0, 2.5, W, W - 5, CURB + 0.02);
  // Paseo: paving with a terracotta border, palms, benches facing the sea.
  f.flat(0xd8c8a8, 0, -28.5, W, 5, CURB + 0.03);
  f.flat(TERRA, 0, -26.1, W, 0.3, CURB + 0.035);
  for (let x = -27; x <= 27; x += 6) f.flat(0xc4b08a, x, -28.5, 0.2, 4.6, CURB + 0.034);
  const lane = i === 3;
  for (let x = -24; x <= 24; x += 12) {
    if (lane && Math.abs(x) < 6) continue;
    if (i === 3 && x === 12) tinselPalm(f, x, -28.6, 1.05);
    else f.tree(x, -28.6, 0.95 + ((x + 24) % 5) * 0.05, 'palm');
  }
  for (let x = -18; x <= 18; x += 12) if (!(lane && Math.abs(x) < 6)) f.prop('bank', x, -25.4, 0);
  f.prop('papelera', -6.5, -26.9, 0); f.prop('papelera', 6.5, -26.9, 0);
  // Beach showers and a boardwalk from the paseo down the sand.
  f.prop('dusch', -9, -24.2, 0);
  f.prop('dusch', 21, -24.2, 0);
  const bwX = lane ? 0 : i === 1 ? 12 : -12;
  const bwEnd = lane ? 26 : 12;
  f.flat(0xb08a5a, bwX, (bwEnd - 26) / 2, 2.6, bwEnd + 26, CURB + 0.06);
  for (let z = -25.5; z < bwEnd; z += 0.9) f.flat(0x8a6a44, bwX, z, 2.6, 0.08, CURB + 0.065);
  // Sunbed rows: parasol between two sunbeds, facing the sea (+z).
  const rows = { 1: [16], 2: [-2, 8, 18], 3: [0, 10, 20], 4: [-6, 4], 6: [14] }[i] || [10];
  const TOWELS = [RED, TEAL, SUNY, 0xc2307a, BLUE, ORANGE, 0xf4f4f0];
  for (const z of rows) {
    for (let x = -25; x <= 25; x += 7.2) {
      if (Math.abs(x - bwX) < (lane ? 6 : 3)) continue;
      if ((i === 1 || i === 6) && x > 8) continue;                  // fishing boats / rocks
      if (i === 4 && z === 4 && x < -6) continue;                   // volleyball court
      if (i === 3 && Math.abs(x - 17) < 5 && Math.abs(z - 17) < 5) continue;   // lifeguard tower
      f.prop('parasoll', x, z, rnd() * 6);
      f.prop('solstol', x - 1.55, z + 0.3, 0);
      f.prop('solstol', x + 1.55, z + 0.3, 0);
      // (No towel on the sand here: the solstol prop carries its own SunTrip towel, §6.9.)
    }
  }
  // A row of fixed straw sombrillas with deckchairs near the promenade (not on the main block,
  // whose kiosk terrace has its own).
  if (i !== 3) {
    for (let x = -24; x <= 24; x += 9) {
      if (Math.abs(x - bwX) < 4 || (i === 1 && (x < -18 || x > 4)) || (i === 6 && x > 6)) continue;
      sombrilla(f, x, -19, rnd);
    }
  }
  // Sand tone patches.
  for (let k = 0; k < 6; k++) {
    const x = -24 + rnd() * 48, z = -18 + rnd() * 44;
    f.F.cyl(k % 2 ? 0xe2c48c : 0xecd6a4, f.wx(x, z), CURB + 0.022, f.wz(x, z), 3 + rnd() * 4, 0.02, 18);
  }
  // Scattered towels and beach balls on the open sand.
  for (let k = 0; k < 7; k++) {
    const x = -26 + rnd() * 52, z = -20 + rnd() * 48;
    if (Math.abs(x - bwX) < 5) continue;
    f.flat(TOWELS[k % TOWELS.length], x, z, 0.9, 1.8, CURB + 0.04, rnd() * 3);
    if (k % 3 === 0) f.sphere(k % 2 ? 0xf4f4f0 : RED, x + 1.2, CURB + 0.2, z + 0.4, 0.4);
  }

  if (i === 3) playaMain(f);
  else if (i === 4) playaBoats(f);
  else if (i === 2) playaTowels(f, ctx);
  else if (i === 1) playaFishers(f);
  else playaRocks(f, ctx);
}

// (3,6): the HELADOS kiosk, the lifeguard tower, a terrace, the towel-gag sign; a raft and a buoy
// line out at sea (beyond the bound wall, decor only).
function playaMain(f) {
  const kx = -17, kz = -18.5;
  f.box(WASH, kx, CURB, kz, 5.2, 2.7, 3.6);
  f.solid(kx, kz, 5.2, 3.6, 99, 'building');
  f.box(TEAL, kx, CURB + 2.7, kz, 5.6, 0.25, 4.0);
  for (let k = 0; k < 7; k++) f.boxC(k % 2 ? 0xf4f4f0 : 0xc2307a, kx - 2.4 + k * 0.8, CURB + 2.35, kz + 2.25, 0.8, 0.12, 1.2, 0, 0.45);
  f.box(DARK, kx, CURB + 0.9, kz + 1.82, 3.6, 1.2, 0.06);
  f.box(TRIM, kx, CURB + 0.95, kz + 2.0, 4.0, 0.1, 0.4);
  f.S.cone(0xd8a050, f.wx(kx, kz), CURB + 3.85, f.wz(kx, kz), 0.7, 1.8, 12, PI, 0, 0);
  f.sphere(0xf4c8d8, kx, CURB + 4.95, kz, 1.5);
  f.sphere(0xf4ead0, kx, CURB + 5.65, kz, 1.15);
  f.sphere(0xc0392b, kx, CURB + 6.25, kz, 0.3);
  f.sign('HELADOS · GLASS', kx, CURB + 3.05, kz + 2.04, 5.2, 0.55, 0, { bg: '#fbf6ec', fg: '#c2307a', border: null, scale: 0.72 });
  f.prop('glasskylt', kx - 3.4, kz + 3.0, 0.3);
  f.prop('glasskylt', kx + 3.4, kz + 3.0, -0.2);
  f.prop('julgran', kx + 4.2, kz - 1.2, 0);   // a plastic Christmas tree on the beach (§6.9)
  // Terrace: café tables with fixed straw umbrellas.
  for (const [x, z] of [[-24, -11], [-17, -10.5], [-10, -11.5]]) {
    f.cyl(0x8a6a44, x, CURB + 1.2, z, 0.06, 2.4, 6);
    f.cone(0xd8b878, x, CURB + 2.55, z, 1.6, 0.7, 10);
    f.cyl(0xf4f4f0, x, CURB + 0.72, z, 0.5, 0.06, 12);
    f.cyl(0x8a8a8a, x, CURB + 0.36, z, 0.05, 0.72, 6);
    for (const a of [0, PI / 2, PI, -PI / 2]) f.box(0xf4f4f0, x + Math.sin(a) * 0.95, CURB, z + Math.cos(a) * 0.95, 0.42, 0.45, 0.42);
    f.circ(x, z, 0.55, CURB + 0.78, 'table');
  }
  // Lifeguard tower: platform at 2.6 reached by a plank ramp from the north; red flag; life ring.
  const lx = 17, lz = 18, PT = CURB + 2.6;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.boxC(0xf4f4f0, lx + sx * 1.1, CURB + 1.3, lz + sz * 1.1, 0.16, 2.7, 0.16, 0, sz * 0.06, -sx * 0.06);
  f.box(WOOD, lx, PT - 0.15, lz, 2.8, 0.15, 2.8);
  f.solid(lx, lz, 2.8, 2.8, PT, 'deck');
  for (const [x, z, w, d] of [[lx, lz + 1.35, 2.8, 0.1], [lx - 1.35, lz, 0.1, 2.8], [lx + 1.35, lz, 0.1, 2.8]]) { f.box(RED, x, PT, z, w, 0.9, d); f.solid(x, z, w, d, PT + 0.9, 'rail'); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.box(0xf4f4f0, lx + sx * 1.3, PT, lz + sz * 1.3, 0.1, 2.0, 0.1);
  f.box(RED, lx, PT + 2.0, lz, 3.2, 0.15, 3.2);
  f.cyl(0xf4f4f0, lx - 1.3, PT + 3.0, lz + 1.3, 0.05, 2.0, 6);
  f.box(RED, lx - 1.3 + 0.55, PT + 3.4, lz + 1.3, 1.1, 0.7, 0.04);
  f.S.add(PRIM.torus(), RED, mat(f.wx(lx + 1.42, lz - 0.2), PT + 0.5, f.wz(lx + 1.42, lz - 0.2), 0, PI / 2, 0, 1.3, 1.3, 1.3));
  rampUp(f, WOOD, lx, lz - 3.6, 0, 1.0, 4.4, CURB, PT);
  f.sign('SOCORRISTA', lx, PT + 0.55, lz + 1.42, 2.4, 0.42, 0, { bg: '#d8321e', fg: '#ffffff', border: null, scale: 0.7 });
  // The towel gag: a sign on a sunbed row (towels reserving sunbeds; research-setting §3).
  postSign(f, 'RESERVADO · RESERVIERT · UPPTAGET', 22, 6.6, 0, 4.6, 0.7, CURB + 1.4, { bg: '#fbf6ec', fg: '#2f5a8a' });
  // Two pedal boats on the sand near the lane.
  pedalBoat(f, 9, 26, PI, SUNY);
  pedalBoat(f, 12.5, 26.5, PI + 0.2, TEAL);
  f.solid(9, 26, 2.4, 3.4, CURB + 0.9, 'boat');
  f.solid(12.5, 26.5, 2.4, 3.4, CURB + 0.9, 'boat');
  // Out at sea (beyond the bound wall at z 314 = local 74): a raft and a buoy line.
  f.box(0xd8c8a0, -10, 0.15, 84, 4, 0.3, 4);
  f.box(0x8a6a44, -10, 0.45, 84, 4.1, 0.06, 4.1);
  f.cyl(0xc0c4c8, -11.6, 1.0, 85.6, 0.05, 1.2, 6);
  for (let x = -30; x <= 30; x += 4) f.sphere(x % 8 ? RED : 0xf4f4f0, x, 0.25, 78, 0.5);
  pedalBoat(f, 6, 88, 0.6, SUNY, 0.17);
}

// (4,6): pedal-boat rental on the sand, beach volleyball, pedal boats out at sea.
function playaBoats(f) {
  postSign(f, 'PATINES · TRAMPBÅTAR · 200 PTA/H', 18, 15, 0, 6.5, 0.8, CURB + 1.6, { bg: '#1e9aa0', fg: '#fbf6ec' });
  const cols = [SUNY, TEAL, 0xf4f4f0, RED, SUNY];
  for (let k = 0; k < 5; k++) { const x = 8 + k * 4.2; pedalBoat(f, x, 24, PI + (k % 2 ? 0.08 : -0.06), cols[k]); f.solid(x, 24, 2.4, 3.4, CURB + 0.9, 'boat'); }
  const vx = -16, vz = 4;
  for (const dx of [-4.5, 4.5]) { f.cyl(0xf4f4f0, vx + dx, CURB + 1.25, vz, 0.07, 2.5, 6); f.circ(vx + dx, vz, 0.1, 99, 'pole'); }
  f.box(0xf4f4f0, vx, CURB + 2.35, vz, 9, 0.1, 0.03);
  for (let x = -4.4; x <= 4.4; x += 0.4) f.box(0x3a3a40, vx + x, CURB + 1.75, vz, 0.02, 0.6, 0.02);
  f.box(0x3a3a40, vx, CURB + 1.48, vz, 9, 0.03, 0.02);
  for (const [x, z, w, d] of [[vx, vz - 4, 9, 0.12], [vx, vz + 4, 9, 0.12], [vx - 4.5, vz, 0.12, 8], [vx + 4.5, vz, 0.12, 8]]) f.flat(0xf4f4f0, x, z, w, d, CURB + 0.04);
  f.sphere(0xf4f4f0, vx + 2, CURB + 0.22, vz + 1.8, 0.42);
  pedalBoat(f, -8, 82, 0.4, TEAL, 0.17);
  pedalBoat(f, 4, 80, -0.3, SUNY, 0.17);
}

// (2,6): windbreaks, a sandcastle, the beach-ball corner.
function playaTowels(f, ctx) {
  const rnd = ctx.rnd;
  const WB = [[RED, 0xf4f4f0], [TEAL, SUNY], [BLUE, 0xf4f4f0]];
  for (const [x, z, ly, c] of [[-22, -12, 0.2, 0], [20, -10, -0.3, 1], [-6, 26, 0, 2]]) {
    for (let k = 0; k < 5; k++) {
      const dx = (k - 2) * 0.8;
      f.boxC(WB[c][k % 2], x + dx * Math.cos(ly), CURB + 0.6, z - dx * Math.sin(ly), 0.8, 1.2, 0.04, ly);
      f.boxC(WOOD2, x + (dx + 0.4) * Math.cos(ly), CURB + 0.65, z - (dx + 0.4) * Math.sin(ly), 0.05, 1.3, 0.05, ly);
    }
  }
  postSign(f, 'SUNTRIP · STRANDGYMPA KL 10', 2, -21.5, 0, 5.4, 0.75, CURB + 1.7, { bg: '#f7c31b', fg: '#d8321e' });
  const cx = 6, cz = 25;
  f.box(0xd8b878, cx, CURB, cz, 2.2, 0.5, 2.2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { f.cyl(0xd8b878, cx + sx * 1.0, CURB + 0.55, cz + sz * 1.0, 0.35, 1.1, 8); f.cone(0xd8b878, cx + sx * 1.0, CURB + 1.3, cz + sz * 1.0, 0.4, 0.4, 8); }
  f.cyl(0xd8b878, cx, CURB + 0.9, cz, 0.6, 0.9, 10);
  f.cyl(0x8a6a44, cx, CURB + 1.75, cz, 0.02, 0.8, 4);
  f.box(SUNY, cx + 0.2, CURB + 2.0, cz, 0.4, 0.25, 0.02);
  f.box(RED, cx + 1.8, CURB, cz + 0.6, 0.3, 0.35, 0.3);
  f.circ(cx, cz, 1.4, CURB + 0.6, 'sand');
  for (let k = 0; k < 4; k++) f.sphere([RED, SUNY, TEAL, 0xf4f4f0][k], -16 + rnd() * 6, CURB + 0.22, 20 + rnd() * 4, 0.42);
}

// (1,6): Canarian fishing boats pulled up on the sand, nets, oars.
function playaFishers(f) {
  for (const [x, z, yaw, hull, band, roof] of [[18, 12, PI + 0.25, 0x2f6aa8, 0xf4f4f0, RED], [24, 2, PI - 0.15, 0xf4f4f0, TEAL, SUNY], [15, 24, PI + 0.5, GREEN, SUNY, 0xf4f4f0]]) {
    boat(f, 'fishing', x, z, yaw, { hull, band, roof, y: CURB + 0.3, solid: false, len: 5.5, beam: 2.0 });
    f.solid(x, z, 3.2, 4.6, CURB + 1.0, 'boat');
  }
  for (const [x, z] of [[10, 18], [23, -6]]) { sph(f, 0x3f5f4a, x, CURB + 0.1, z, 2.2, 0.6, 1.6); f.sphere(ORANGE, x + 0.6, CURB + 0.3, z + 0.3, 0.3); }
  for (const [x, z, ly] of [[8, 9, 0.6], [27, 14, -0.4]]) f.boxC(WOOD, x, CURB + 0.08, z, 0.12, 0.08, 3.2, ly);
  f.prop('tunna', 27, -10, 0);
  mound(f, -24, -14, 6, 8, 0.3, 0xe2c58e);
  for (let k = 0; k < 10; k++) tuft(f, -28 + (k % 4) * 2.5, -22 + k * 2.2, 1.1);
}

// (6,6): the east end: red volcanic rocks with a rock pool, a few sunbeds.
function playaRocks(f, ctx) {
  const rnd = ctx.rnd;
  const RK = [0x9a4a30, 0xb0603a, 0x8a3e2a, 0xa5532f];
  // Angular volcanic boulders (stretched low-poly icosahedra).
  const rock = (x, z, sx, sy, sz, c, ry) => f.S.add(PRIM.ico(0), c, mat(f.wx(x, z), CURB + sy * 0.28, f.wz(x, z), (ry * 3) % 0.5, f.yaw + ry, (ry * 7) % 0.4, sx, sy, sz));
  for (const [x, z, s] of [[20, 12, 3.2], [26, 4, 4.0], [24, 22, 3.6], [14, 26, 2.4], [28, 16, 2.6], [-26, 26, 2.2], [27, -12, 2.8]]) {
    rock(x, z, s * 2.2, s * 1.5, s * 1.8, RK[(x * 7 + z) & 3], x * 0.37);
    rock(x + s * 0.7, z - s * 0.5, s * 1.3, s * 0.9, s * 1.1, RK[(x + z * 3) & 3], z * 0.53);
    f.circ(x, z, s * 0.9, CURB + s * 0.75, 'rock');
  }
  // Rock pool: overlapping discs of shallow water ringed with small stones.
  const pools = [[13, 1, 2.6], [16, 2.5, 2.0], [10.5, 3, 1.6]];
  for (const [x, z, r] of pools) {
    f.F.cyl(0x2a8ac0, f.wx(x, z), CURB + 0.02, f.wz(x, z), r, 0.04, 16);
    f.circ(x, z, r, CURB, 'water');
  }
  for (let k = 0; k < 14; k++) {
    const [x, z, r] = pools[k % 3], a = k * 2.1 + rnd();
    rock(x + Math.cos(a) * (r + 0.3), z + Math.sin(a) * (r + 0.3), 0.9 + rnd() * 0.6, 0.5 + rnd() * 0.3, 0.8 + rnd() * 0.5, RK[k & 3], a);
  }
}

// ---------------------------------------------------------------------------------------------
// The marina (5,6): quay with the harbour office and a fish restaurant on the north; a walkable
// shallow basin with moored boats; a pier to the south ending at a green harbour light
// (pryl_glasogon at (12, 28), deck 0.55), a coin trail along it; a low seawall on the south.

function hamn(f, W) {
  const scene = f.scene;
  f.flat(PAVE, 0, -14.5, W, 33, CURB + 0.02);
  for (let x = -28; x <= 28; x += 4) f.flat(0xc8bfac, x, -14.5, 0.15, 32, CURB + 0.025);
  f.box(0xe8e0cc, 0, CURB, 2.5, W, 0.12, 1.0);
  f.flat(SEA, 0, 16.25, W, 26.5, CURB + 0.02);
  for (let k = 0; k < 14; k++) f.flat(0x4aa0d0, -26 + ((k * 23) % 52), 6 + ((k * 13) % 22), 1.6, 0.14, CURB + 0.024, (k % 3) * 0.2);
  box(f.wx(-W / 2, 3), f.wz(-W / 2, 3), f.wx(W / 2, 29.5), f.wz(W / 2, 29.5), CURB, 'water');
  // Seawall (low, walkable) along the south edge.
  f.box(0xc8c0b0, 0, CURB, 30.25, W, 0.35, 1.5);
  for (let x = -29; x <= 29; x += 2.2) f.box(0xb0a898, x, CURB + 0.35, 30.25, 0.08, 0.02, 1.5);
  f.solid(0, 30.25, W, 1.5, CURB + 0.35, 'quay');
  // Pier with piles, end platform, bollards, the green harbour light, a coin trail.
  const PX = 12, DECK = 0.55;
  f.box(WOOD, PX, DECK - 0.15, 15.75, 4, 0.15, 27.5);
  for (let z = 3.5; z < 29.5; z += 0.8) f.box(WOOD2, PX, DECK - 0.005, z, 4, 0.01, 0.06);
  for (let z = 4; z < 29; z += 3) for (const sx of [-2.1, 2.1]) f.cyl(0x4a3a2a, PX + sx, (DECK + CURB) / 2, z, 0.16, DECK - CURB + 0.3, 6);
  f.solid(PX, 15.75, 4, 27.5, DECK, 'pier');
  f.box(WOOD, PX, DECK - 0.15, 27.75, 6, 0.15, 3.5);
  f.solid(PX, 27.75, 6, 3.5, DECK, 'pier');
  for (const z of [6, 12, 18, 24]) for (const sx of [-1.8, 1.8]) f.cyl(INK, PX + sx, DECK + 0.25, z, 0.14, 0.5, 8);
  f.cyl(TRIM, PX + 2.4, DECK + 1.0, 29.0, 0.32, 2.0, 10);
  f.cyl(GREEN, PX + 2.4, DECK + 2.3, 29.0, 0.36, 0.6, 10);
  f.sphere(0x7fe08a, PX + 2.4, DECK + 2.85, 29.0, 0.35);
  f.sphere(0x7fe08a, PX + 2.4, DECK + 2.85, 29.0, 0.37, 0.37, 0.37, 0, TOWN.nightGlow);   // lit after dark (§13.3)
  f.circ(PX + 2.4, 29.0, 0.4, 99, 'pole');
  for (let z = 6; z <= 24; z += 3) coinAt(f, PX, z, DECK + 0.75);
  // Bollards along the quay edge.
  for (let x = -27; x <= 27; x += 6) { if (Math.abs(x - PX) < 3) continue; f.cyl(INK, x, CURB + 0.3, 2.3, 0.18, 0.5, 8); f.circ(x, 2.3, 0.2, CURB + 0.6, 'bollard'); }
  // Boats (one bobbing mesh built around the block centre) + their colliders.
  {
    const G = new GeoBuilder(), bf = new Frame(G, G, 0, 0, 0, scene);
    const BOATS = [
      ['sail', -24, 9, PI, {}], ['motor', -18.5, 8.5, PI, {}], ['fishing', -14, 7.5, PI, { hull: 0x2f6aa8, band: 0xf4f4f0 }],
      ['motor', -4.2, 9.5, PI, { band: GREEN }], ['sail', 7.6, 13.5, 0, { cover: RED }], ['motor', 7.6, 23, 0, {}],
      ['excursion', 16.6, 14, 0, {}], ['motor', 25, 17, 0, { len: 9, beam: 3 }],
      ['fishing', -24, 24, 0, { hull: GREEN, band: SUNY, roof: BLUE }], ['sail', -17.5, 23.5, 0, {}],
    ];
    for (const [kind, x, z, yaw, o] of BOATS) {
      boat(bf, kind, x, z, yaw, { ...o, solid: false });
      const L = o.len ?? (kind === 'excursion' ? 12 : kind === 'fishing' ? 6 : 7.5), B = o.beam ?? (kind === 'excursion' ? 3.6 : kind === 'fishing' ? 2.2 : 2.5);
      f.solid(x, z, B * 0.9, L * 0.9, CURB + 0.55, 'boat');
    }
    const boats = meshOf(G, scene, 0.035);
    boats.position.set(f.ox, 0, f.oz);
    onTick((t) => { boats.position.y = Math.sin(t * 1.15) * 0.05; }, scene);
    for (const [x, z] of [[-24, 5.2], [-18.5, 4.7], [-14, 4.5], [-4.2, 5.7]]) f.boxC(ROPE, x, CURB + 0.45, z - 1.3, 0.05, 0.05, 2.0, 0, 0.2);
    f.sign('PALOMA', 18.45, CURB + 1.25, 17.5, 2.2, 0.5, PI / 2, { bg: null, border: null, fg: '#1b2f6b', scale: 0.8 });
  }
  // North: entrance arch, harbour office (CAPITANÍA), fish restaurant with a terrace.
  for (const sx of [-1, 1]) { f.box(WASH, sx * 5.5, CURB, -29.5, 1.1, 4.2, 1.1); f.solid(sx * 5.5, -29.5, 1.1, 1.1); f.box(TERRA, sx * 5.5, CURB + 4.2, -29.5, 1.3, 0.3, 1.3); }
  f.box(WASH, 0, CURB + 4.2, -29.5, 12, 0.7, 0.5);
  f.sign('PUERTO DEPORTIVO', 0, CURB + 4.55, -29.2, 9.5, 0.62, 0, { bg: '#fbf6ec', fg: '#1b2f6b', border: null, scale: 0.7, double: true });
  {
    const cx = -21, cz = -25, w = 14, d = 10, h = 6.6;
    f.box(WASH, cx, CURB, cz, w, h, d);
    f.solid(cx, cz, w, d);
    f.box(BLUE, cx, CURB + 3.2, cz, w + 0.1, 0.25, d + 0.1);
    f.box(TRIM, cx, CURB + h, cz, w + 0.3, 0.3, d + 0.3);
    for (let x = -5; x <= 5; x += 2.5) for (const y of [1.0, 4.2]) {
      if (y < 2 && Math.abs(x) < 1) continue;
      f.box(DARK, cx + x, CURB + y, cz + d / 2 + 0.03, 1.0, 1.4, 0.06);
      f.box(BLUE, cx + x, CURB + y - 0.1, cz + d / 2 + 0.06, 1.2, 0.1, 0.12);
    }
    f.box(BLUE, cx, CURB, cz + d / 2 + 0.03, 1.4, 2.4, 0.08);
    f.box(WASH, cx + 4.5, CURB + h, cz - 1, 3, 2.8, 3);
    f.box(BLUE, cx + 4.5, CURB + h + 2.8, cz - 1, 3.3, 0.25, 3.3);
    f.sign('CAPITANÍA · PUERTO DEPORTIVO', cx, CURB + 5.4, cz + d / 2 + 0.06, 10, 0.7, 0, { bg: '#fbf6ec', fg: '#1b2f6b', border: '#2f5a8a', scale: 0.62 });
    flag(f, cx - 5.5, cz + d / 2 + 1.2, 9.5, [0xc8202a, SUNY, SUNY, 0xc8202a], false, 0.7);
  }
  {
    const cx = 19, cz = -25.5, w = 18, d = 9, h = 4.0;
    f.box(WASH, cx, CURB, cz, w, h, d);
    f.solid(cx, cz, w, d);
    f.roof(TERRA, cx, CURB + h, cz, w + 0.8, 2.0, d + 0.8);
    for (let x = -7; x <= 7; x += 3.5) {
      f.box(DARK, cx + x, CURB + 1.0, cz + d / 2 + 0.03, 1.1, 1.6, 0.06);
      for (const dx of [-0.8, 0.8]) f.box(0x2f6aa8, cx + x + dx, CURB + 1.0, cz + d / 2 + 0.06, 0.5, 1.7, 0.06);
    }
    f.sign('BAR EL MUELLE · PESCADO FRESCO', cx, CURB + 3.35, cz + d / 2 + 0.07, 11, 0.7, 0, { bg: '#fbf6ec', fg: '#2f6aa8', border: null, scale: 0.65 });
    // Terrace under a reed pergola.
    const tz0 = -21, tz1 = -14.5;
    for (const x of [11, 17, 23, 27.5]) for (const z of [tz0 + 0.3, tz1]) { f.box(WOOD2, x, CURB, z, 0.2, 2.7, 0.2); f.circ(x, z, 0.15, 99, 'pole'); }
    for (let x = 10.5; x <= 28; x += 0.5) f.box(0xd8c08a, x, CURB + 2.7, (tz0 + tz1) / 2, 0.3, 0.08, tz1 - tz0 + 0.6);
    f.ceiling(19.25, (tz0 + tz1) / 2, 17.8, tz1 - tz0 + 0.6, CURB + 2.7, CURB + 2.78);   // the chase camera stays under the reeds
    for (const [x, z] of [[13.5, -18.5], [19.5, -18], [25, -18.5], [16.5, -15.8], [22.5, -15.8]]) {
      f.cyl(0xf4f4f0, x, CURB + 0.72, z, 0.55, 0.06, 12);
      f.cyl(0x8a8a8a, x, CURB + 0.36, z, 0.05, 0.72, 6);
      f.box(0x2f6aa8, x + 0.2, CURB + 0.75, z, 0.6, 0.02, 0.6);
      for (const a of [PI / 2, -PI / 2]) f.box(0x2f6aa8, x + Math.sin(a) * 0.9, CURB, z, 0.42, 0.45, 0.42);
      f.circ(x, z, 0.6, CURB + 0.78, 'table');
    }
  }
  // Boatyard: a fishing boat on a cradle, a boat hoist at the quay edge, nets and crates.
  {
    boat(f, 'fishing', -9, -13, PI, { y: CURB + 1.3, solid: false, hull: 0xf4f4f0, band: RED, roof: 0x2f6aa8 });
    for (const dz of [-1.8, 1.8]) for (const sx of [-1, 1]) f.boxC(0x5a5e66, -9 + sx * 0.8, CURB + 0.6, -13 + dz, 0.15, 1.3, 0.15, 0, 0, -sx * 0.4);
    f.solid(-9, -13, 2.6, 6, CURB + 1.8, 'boat');
    const hx = -27;
    for (const dx of [-1.6, 1.6]) { f.boxC(0x2f6aa8, hx + dx, CURB + 3.0, 1.6, 0.25, 6.0, 0.25); f.circ(hx + dx, 1.6, 0.2, 99, 'pole'); }
    f.box(0x2f6aa8, hx, CURB + 5.9, 1.6, 3.6, 0.3, 0.3);
    f.box(0x5a5e66, hx, CURB + 5.9, 2.5, 0.2, 0.2, 2.0);
    f.box(0x5a5e66, hx, CURB + 3.5, 3.4, 0.04, 2.4, 0.04);
    f.cone(0x3a3a40, hx, CURB + 3.4, 3.4, 0.18, 0.4, 6);
    for (const [x, z] of [[-24, -4], [-15.5, -2.5], [24, -1.5]]) { sph(f, 0x3f5f4a, x, CURB + 0.15, z, 2.2, 0.7, 1.6); f.sphere(ORANGE, x + 0.5, CURB + 0.4, z + 0.3, 0.3); f.sphere(ORANGE, x - 0.6, CURB + 0.35, z - 0.2, 0.26); }
    for (const [x, z] of [[-20.5, -8], [-19.3, -8.2], [-20, -6.8]]) f.prop('tomatlada', x, z, 0.2);
    f.prop('tunna', 28.5, -12, 0); f.prop('tunna', 29.3, -13.2, 0);
    f.prop('gaspump', -5.5, 0.6, PI);
    for (const x of [-11, 4]) f.prop('bank', x, 0.9, PI);
    f.prop('papelera', 7.5, -1.5, 0);
    f.prop('vykort', 9, -9.5, PI / 2);
  }
  // Boat-trip kiosk at the pier root (PASEOS EN BARCO).
  {
    const kx = 18.5, kz = -2;
    f.box(WASH, kx, CURB, kz, 3.2, 2.5, 2.2);
    f.solid(kx, kz, 3.2, 2.2);
    for (let k = 0; k < 5; k++) f.boxC(k % 2 ? 0xf4f4f0 : TEAL, kx - 1.4 + k * 0.7, CURB + 2.35, kz + 1.4, 0.7, 0.1, 1.0, 0, 0.4);
    f.box(DARK, kx, CURB + 0.9, kz + 1.12, 2.2, 1.0, 0.04);
    f.sign('PASEOS EN BARCO · BÅTTURER · 300 PTA', kx, CURB + 3.05, kz + 1.2, 5.6, 0.5, 0, { bg: '#1e9aa0', fg: '#fbf6ec', border: null, scale: 0.62, double: true });
    f.box(0x6a4528, kx, CURB + 2.5, kz + 1.0, 0.12, 0.6, 0.12);
  }
  // Quay lamps (their globes lit after dark, §13.3).
  for (const x of [-15, 0, 15, 27]) {
    f.cyl(0x2a3a4a, x, CURB + 1.8, -4.5, 0.08, 3.6, 6);
    f.sphere(0xfff1b8, x, CURB + 3.75, -4.5, 0.32);
    f.sphere(0xffd890, x, CURB + 3.75, -4.5, 0.34, 0.34, 0.34, 0, TOWN.nightGlow);
    f.circ(x, -4.5, 0.12, 99, 'pole');
  }
  f.car('pickup', 24, -8.5, PI / 2, { color: 0x2f6aa8 });
  // Out at sea: moored boats (decor beyond the bound wall).
  boat(f, 'sail', -12, 86, 0.4, { y: 0.17, solid: false, cover: RED });
  boat(f, 'sail', 14, 98, -0.2, { y: 0.17, solid: false });
  boat(f, 'motor', 30, 84, 1.2, { y: 0.17, solid: false });
}

export const BUILDERS = {
  flygplats: gando,
  dromplan,
  fyren,
  playa,
  hamn,
};
