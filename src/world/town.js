// Builds Nueva Estocolmo (DESIGN §6.2, §6.4, §6.5; WP-B): a fictional SunTrip resort town on
// southern Gran Canaria, Christmas week 1979. Streets with Spanish double-arm lamps, Canary palms
// and GOD JUL banners; outskirts with the red Monte Rojo mountains (north/east), Maspalomas-style
// dunes (west) and the sea (south, out to z 1150); the residential blocks `bungalowR` (whitewashed
// bungalows behind garden walls) and `lagenhet` (1970s apartment-hotel slabs with balcony rows,
// half-finished concrete frames and pool courtyards). Every special block comes from
// BLOCK_BUILDERS (world/blocks/*.js). Landmarks come from landmarks-island.js before any block runs.
//
// Performance: all static geometry is merged per block into one outlined toon mesh (S) plus one
// flat, shadow-receiving ground mesh (F). Signs are batched into one mesh per sign texture.
// Invented for the game (§1.6 spirit): every hotel/complex name on the residential signs.

import { THREE, GeoBuilder, toonMesh, MAT, PRIM, mat, makeWedge, textCanvas, skyDark } from '../gfx.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { N, HALF, RHW, SW, CURB, EDGE, BOUND, rc, blockInterior, MAP, landmarks } from './layout.js';
import { box, circle, ramp, queryBlocks, CIRCLE } from './collision.js';
import { placeProp } from './props.js';
import { Frame, parkedCars, setFrameScene } from './frame.js';
import { registerIslandLandmarks } from './landmarks-island.js';
import { BLOCK_BUILDERS } from './blocks/index.js';
import { duneGeo, DUNE_WIND, DUNE_LEE } from './blocks/nature.js';
import { mulberry32, pick } from '../util.js';

export { parkedCars };

const rnd = mulberry32(19791224);
const R = (a, b, r = rnd) => a + (b - a) * r();

// §13.2 island palette.
const C = {
  white: 0xf4efe6, white2: 0xfbf7ee, cream: 0xf2e6d0, ochreWall: 0xf0dcb4, pink: 0xf3d6c8,
  terracotta: 0xc0623a, terracotta2: 0xa8502e, tile: 0xd89a70,
  sand: 0xc9a26b, beach: 0xe8cf98, dune: 0xecd6a4, dune2: 0xdcc08a,
  rock: 0xa5532f, rock2: 0xc27a45, rock3: 0xb0603a, rock4: 0x8e4428,
  bouga: 0xc2307a, bouga2: 0xd8509a, leaf: 0x3f7a3a, leaf2: 0x4f8f44, leaf3: 0x5a9a48,
  trunk: 0x8a6a4a, trunk2: 0x6f5238, sea: 0x1c7fb8, shallow: 0x3fa8c6, foam: 0xf4f8f6,
  sidewalk: 0xddd3c0, curbStone: 0xc8c0b0, asphalt: 0x4c4c56, iron: 0x2c3530,
  glass: 0x4a7398, glassDark: 0x2c4a66, concrete: 0xb8b2a6, concrete2: 0xa39d92, brick: 0xb8583a,
  sun: 0xf7c31b, red: 0xd8321e, orange: 0xf07a1e, blue: 0x2f6ad1, green: 0x2f8a4a, gold: 0xf2c12e,
};
const WALLS = [C.white, C.white, C.white2, C.white, C.cream, C.ochreWall, C.white2, C.pink];
const DOORS = [0x2f8a4a, 0x2f5a8a, 0x6a4a2a, 0x8a3a2a, 0x1e7a78];
const SHUTTERS = [0x2f6a3f, 0x2f5a8a, 0x6a4a2a, 0x3f7a3a];
const AWNINGS = [C.orange, C.green, C.blue, C.sun, C.red, 0x1e9aa0];
const TOWELS = [C.sun, C.blue, 0xf2a0b8, C.red, 0xfafafa, C.orange, 0x6ab0e8];
const FAR = 1150;   // §4.1: nothing island-side beyond |x|, |z| = 1150

export const pedLoops = [];     // sidewalk loops for pedestrians
export const animated = [];     // objects with tick(t)
export const lamps = [];
export const bouncers = [];     // trampoline ('bounce') blocks
// Every bungalowR lot (Fin hund…, feature 31, DESIGN §10.21: game/dogs.js picks the watchdogs'
// lots from it): { ox, oz, yaw (the lot's frame: the street at local z 0, the lot back to +z),
// w, d, door: [x, z] (the front door), house: [x, z, w, d] (the cube), drive: [x, z] | null (the
// parked car's spot), tramp: [x, z] | null (the trampoline's middle), corner } in lot-local metres.
// Filled as the lots are built, with no random draws of its own: the world builds as before.
export const dogLots = [];
export const frameRamps = [];   // half-built frames: { x, z, yaw, top, top2, deck: { x, z, w, d } } = the foot of ramp 1, deck heights, deck 1's centre and size (w across the lot, d deep; the stunt jumps' take-off, §10.27)
// Hoppet mellan hotelltaken (feature 41, DESIGN §10.29): the two seven-storey slabs in (4,4)'s north
// row, HOTEL ATLÁNTICO (lot 1) and APARTAMENTOS SOL DE INVIERNO (lot 2), 3.7 m apart, get walkable
// roofs between missions. `lots`: residential lot id (bi, bj, side, k) -> roof key. Filled by
// roofWalk with no random draws of its own (the world builds as before): `roofs[key]` = { name,
// minX, maxX, minZ, maxZ (the slab's footprint), floor (the roof's height), blocks (what he stands
// on up there) }, `gap` = { x0, x1, z0, z1 } between them, `coins` [[x, y, z]] for game/roofJump.js
// to place. The slab's own solids (top 99) give way to the roof's while `live()` (set by the game
// module: the island with no mission running); in a mission every stage meets the world as before.
export const ROOF_JUMP = { lots: { '4,4,0,1': 'atl', '4,4,0,2': 'sol' }, roofs: {}, gap: null, coins: [], live: () => false };
// Balkongerna lever (feature 77, DESIGN §10.42): every apartment-hotel slab's balcony rows, for the
// residents game/residents.js puts on them. One entry a slab: { id (the residential lot, as
// ROOF_JUMP's), x, z (the middle of its balcony line), yaw (facing the street), w, floors, spots:
// [{ x, y, z, fl, u }] } in world coordinates, a spot per balcony unit and floor: on the floor's top,
// 0.95 m in from the balcony's front edge (0.35 m behind the railing, so a body turned to the street
// keeps its apron and its broom behind it) and a little off the unit's middle (clear of the fins and
// the potted plant). Filled by slabLot with no random draws of its own: the world builds as before.
export const balconyLots = [];
// Lit after dark (§13.3): the street lamps' lantern panes and star centres go into one unlit mesh
// that draws only while the sky is dark, as the hotels' lit windows do. The block builders run
// inside buildTown and may add their own night lights here (world coordinates); buildTown makes
// the mesh at the end (nightLights).
export const nightGlow = new GeoBuilder();

let scene;

// ---------------------------------------------------------------------------------------------
// Cached unit primitives and signs.

const GEO = {};
const taperGeo = (ratio, n) => (GEO['t' + ratio.toFixed(3) + '_' + n] ??= new THREE.CylinderGeometry(0.5 * ratio, 0.5, 1, n));
// Tapered cylinder by centre: radius rBot at the bottom, rTop at the top.
function taper(G, color, x, y, z, rTop, rBot, h, n = 8, rx = 0, ry = 0, rz = 0) {
  G.add(taperGeo(rTop / rBot, n), color, mat(x, y, z, rx, ry, rz, rBot * 2, h, rBot * 2));
}
const lump = (G, color, x, y, z, sx, sy, sz, ry = 0) => G.add(PRIM.ico(0), color, mat(x, y, z, 0, ry, 0, sx, sy, sz));

// Signs: one merged mesh per texture (text + size + style), added to the scene at the end.
const signBatches = new Map();
function addSign(text, w, h, opts, x, y, z, yaw, double = false) {
  const key = text + '|' + w + 'x' + h + '|' + JSON.stringify(opts);
  let b = signBatches.get(key);
  if (!b) {
    const tex = new THREE.CanvasTexture(textCanvas(text, w, h, opts));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    b = { mat: new THREE.MeshBasicMaterial({ map: tex, transparent: !opts.bg }), geos: [] };
    signBatches.set(key, b);
  }
  const plane = (ry) => new THREE.PlaneGeometry(w, h).applyMatrix4(mat(x, y, z, 0, ry, 0));
  b.geos.push(plane(yaw));
  if (double) b.geos.push(plane(yaw + Math.PI));
}
function flushSigns() {
  for (const b of signBatches.values()) {
    const m = new THREE.Mesh(mergeGeometries(b.geos, false), b.mat);
    m.name = 'signs';
    scene.add(m);
  }
  signBatches.clear();
}

// ---------------------------------------------------------------------------------------------
// Plants, rocks, street furniture (world coordinates on a GeoBuilder).

// Canary palm (Phoenix canariensis): fat trunk with leaf-scar rings, a "pineapple" crown, two
// tiers of arching fronds, orange dates. Optional Christmas tinsel spiral round the trunk.
function palm(G, x, z, s = 1, { tinsel = false, y0 = CURB, collide = true, r = rnd } = {}) {
  const h = R(5.0, 7.2, r) * s, tr = 0.36 * s, lean = R(-0.06, 0.06, r), ly = r() * 6.28;
  const tx = x + Math.sin(ly) * lean * h, tz = z + Math.cos(ly) * lean * h;   // crown offset by the lean
  taper(G, C.trunk, (x + tx) / 2, y0 + h / 2, (z + tz) / 2, tr * 0.8, tr, h, 8, Math.cos(ly) * lean, 0, -Math.sin(ly) * lean);
  for (let k = 1; k < 4; k++) {
    const f = k / 4;
    G.cyl(C.trunk2, x + (tx - x) * f, y0 + h * f, z + (tz - z) * f, tr * (1 - 0.2 * f) + 0.04, 0.16 * s, 6);
  }
  if (tinsel) {
    for (let k = 0; k < 12; k++) {
      const a = k * 1.15, f = 0.1 + k * 0.065;
      const rr = tr * (1 - 0.2 * f) + 0.06;
      G.box(k % 2 ? C.red : C.gold, x + (tx - x) * f + Math.cos(a) * rr, y0 + h * f, z + (tz - z) * f + Math.sin(a) * rr, 0.42 * s, 0.13, 0.13, -a + Math.PI / 2, 0, 0.35);
    }
  }
  const cy = y0 + h;
  G.sphere(0x8a7040, tx, cy, tz, 1.15 * s, 0.95 * s, 1.15 * s, 0, 0, 0, 8);
  const n = 11;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r() * 0.3;
    const up = k % 2 === 0;
    const col = up ? C.leaf : (k % 3 ? C.leaf2 : C.leaf3);
    const t1 = up ? 0.45 : 0.05, t2 = up ? -0.25 : -0.7;     // inner tilt up, tip droops
    const L1 = 1.7 * s, L2 = 1.6 * s;
    const ca = Math.cos(a), sa = Math.sin(a);
    const x1 = tx + ca * (L1 / 2) * Math.cos(t1), y1 = cy + 0.1 + (L1 / 2) * Math.sin(t1), z1 = tz + sa * (L1 / 2) * Math.cos(t1);
    G.box(col, x1, y1, z1, L1, 0.07 * s, 0.75 * s, -a, 0, t1);
    const ex = tx + ca * L1 * Math.cos(t1), ey = cy + 0.1 + L1 * Math.sin(t1), ez = tz + sa * L1 * Math.cos(t1);
    G.box(col, ex + ca * (L2 / 2) * Math.cos(t2), ey + (L2 / 2) * Math.sin(t2), ez + sa * (L2 / 2) * Math.cos(t2), L2, 0.06 * s, 0.6 * s, -a, 0, t2);
  }
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + 0.5;
    G.ico(C.orange, tx + Math.cos(a) * 0.45 * s, cy - 0.45 * s, tz + Math.sin(a) * 0.45 * s, 0.38 * s, 0);
  }
  if (collide) circle(x, z, tr + 0.05, 99, 'tree');
}

// Cardón (Euphorbia canariensis): a clump of grey-green columns with rounded tips.
function cardon(G, x, z, s = 1, r = rnd) {
  const n = 5 + Math.floor(r() * 5);
  for (let k = 0; k < n; k++) {
    const a = r() * 6.28, d = k === 0 ? 0 : R(0.25, 0.75, r) * s, h = (k === 0 ? 2.6 : R(1.0, 2.4, r)) * s;
    const cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d, col = k % 2 ? 0x6f8a52 : 0x7f9a5c;
    G.cyl(col, cx, CURB + h / 2, cz, 0.2 * s, h, 6);
    G.ico(col, cx, CURB + h, cz, 0.4 * s, 0);
  }
  lump(G, 0x9a7a52, x, CURB, z, 1.6 * s, 0.4 * s, 1.6 * s);
  circle(x, z, 0.9 * s, 99, 'tree');
}

// Agave: a rosette of blue-green blades, sometimes with its tall flower stalk.
function agave(G, x, z, s = 1, r = rnd, collide = true) {
  const n = 9;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 6.28 + r() * 0.3, t = k % 2 ? 1.05 : 0.7, h = (k % 2 ? 1.0 : 1.2) * s;
    G.cone(k % 3 ? 0x7a9e8a : 0x6a8e7c, x + Math.sin(a) * Math.sin(t) * h / 2, CURB + Math.cos(t) * h / 2, z + Math.cos(a) * Math.sin(t) * h / 2, 0.14 * s, h, 4, t, a, 0);
  }
  if (r() < 0.25) {
    G.cyl(0x8a7a4a, x, CURB + 2.2 * s, z, 0.06 * s, 4.4 * s, 5);
    for (let k = 0; k < 4; k++) G.ico(0xd8b030, x + (k % 2 ? 0.4 : -0.4) * s, CURB + (3.2 + k * 0.35) * s, z + (k > 1 ? 0.3 : -0.3) * s, 0.45 * s, 0);
  }
  if (collide) circle(x, z, 0.6 * s, CURB + 0.9 * s, 'solid');
}

// Bougainvillea climbing a wall: green cushion with magenta blossom lumps, up to `h`.
function bouga(G, x, z, h = 2.6, s = 1, r = rnd) {
  for (let y = 0.5; y < h; y += 0.7) {
    const w = s * (1.2 - y / (h * 2));
    G.ico(C.leaf2, x + R(-0.2, 0.2, r), CURB + y, z + R(-0.2, 0.2, r), w * 1.1, 0);
    G.ico(r() < 0.5 ? C.bouga : C.bouga2, x + R(-0.4, 0.4, r), CURB + y + 0.2, z + R(-0.4, 0.4, r), w * 0.9, 0);
  }
  G.ico(C.bouga, x, CURB + h, z, 0.8 * s, 0);
}

// Spanish double-arm street lamp (iron, two hanging lanterns along the road); stars at Christmas.
function lamp(G, x, z, yaw, star) {
  const ax = Math.sin(yaw), az = Math.cos(yaw), px = Math.cos(yaw), pz = -Math.sin(yaw);
  G.cyl(C.iron, x, CURB + 0.35, z, 0.2, 0.7, 8);
  G.cyl(C.iron, x, CURB + 2.7, z, 0.08, 4.4, 8);
  G.ico(C.iron, x, CURB + 4.95, z, 0.26, 0);
  G.cone(C.iron, x, CURB + 5.2, z, 0.06, 0.3, 6);
  for (const s of [-1, 1]) {
    const ex = x + px * s * 0.95, ez = z + pz * s * 0.95;
    G.box(C.iron, x + px * s * 0.48, CURB + 4.72, z + pz * s * 0.48, 0.96, 0.07, 0.07, yaw);
    G.box(C.iron, x + px * s * 0.3, CURB + 4.45, z + pz * s * 0.3, 0.62, 0.05, 0.05, yaw, 0, s * 0.75);
    G.box(C.iron, ex, CURB + 4.62, ez, 0.04, 0.2, 0.04);
    G.cone(C.iron, ex, CURB + 4.48, ez, 0.25, 0.2, 4, 0, yaw + Math.PI / 4);
    G.box(0xfff1b8, ex, CURB + 4.2, ez, 0.28, 0.42, 0.28, yaw);
    nightGlow.box(0xffd890, ex, CURB + 4.2, ez, 0.3, 0.4, 0.3, yaw);   // just outside the pane
    G.box(C.iron, ex, CURB + 3.97, ez, 0.2, 0.06, 0.2, yaw);
  }
  if (star) {
    G.box(C.gold, x + ax * 0.14, CURB + 3.7, z + az * 0.14, 0.62, 0.62, 0.05, yaw, 0, Math.PI / 4);
    G.box(C.gold, x + ax * 0.14, CURB + 3.7, z + az * 0.14, 0.62, 0.62, 0.05, yaw);
    G.box(0xfff1b8, x + ax * 0.18, CURB + 3.7, z + az * 0.18, 0.22, 0.22, 0.05, yaw, 0, Math.PI / 4);
    nightGlow.box(0xfff1b8, x + ax * 0.18, CURB + 3.7, z + az * 0.18, 0.24, 0.24, 0.07, yaw, 0, Math.PI / 4);
  }
  circle(x, z, 0.2, 99, 'pole');
  lamps.push({ x, z });
}

// ---------------------------------------------------------------------------------------------
// Pieces in a lot frame (street at local z = 0, the lot runs back to +z).

// A walkable shallow pool: tiled rim strips around the water (no overlapping slabs), the water a
// floor at CURB (kind 'water', blue on the minimap, flagged `pool`: the glide's landing, §10.7).
function pool(f, lx, lz, w, d, rimC = 0xeae6dc) {
  const rim = 0.9;
  const y = CURB + 0.03;
  f.flat(rimC, lx, lz - d / 2 - rim / 2, w + rim * 2, rim, y);
  f.flat(rimC, lx, lz + d / 2 + rim / 2, w + rim * 2, rim, y);
  f.flat(rimC, lx - w / 2 - rim / 2, lz, rim, d, y);
  f.flat(rimC, lx + w / 2 + rim / 2, lz, rim, d, y);
  f.flat(0x2a9ad0, lx, lz, w, d, CURB + 0.045);
  const x = f.wx(lx, lz), z = f.wz(lx, lz);
  const turned = Math.abs(Math.sin(f.yaw)) > 0.7;
  const hw = (turned ? d : w) / 2, hd = (turned ? w : d) / 2;
  box(x - hw, z - hd, x + hw, z + hd, CURB, 'water').pool = true;
  f.box(0xd8dde2, lx + w / 2 - 0.6, CURB, lz - d / 2 - 0.15, 0.06, 0.9, 0.06);
  f.box(0xd8dde2, lx + w / 2 - 1.1, CURB, lz - d / 2 - 0.15, 0.06, 0.9, 0.06);
}

// A paper advent star in a window (the Swedish guests brought one; §6.9 charter Sweden).
function adventStar(f, lx, y, lz, r = rnd) {
  const c = pick([C.red, 0xfafafa, C.orange, C.sun], r);
  f.boxC(c, lx, y, lz, 0.5, 0.5, 0.1, 0, 0, Math.PI / 4);
  f.boxC(c, lx, y, lz, 0.5, 0.5, 0.1);
  f.boxC(0xfff1b8, lx, y, lz - 0.03, 0.18, 0.18, 0.1, 0, 0, Math.PI / 4);
  f.boxC(0xfafafa, lx, y + 0.6, lz, 0.02, 0.7, 0.02);
}

// Hotel trampoline ("studsmatta"): a 'bounce' floor.
function trampoline(f, lx, lz) {
  const x = f.wx(lx, lz), z = f.wz(lx, lz);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.4; f.S.cyl(0x555a66, x + Math.cos(a) * 1.65, CURB + 0.4, z + Math.sin(a) * 1.65, 0.05, 0.8, 6); }
  f.S.add(PRIM.torus(), C.orange, mat(x, CURB + 0.84, z, Math.PI / 2, 0, 0, 3.7, 3.7, 1.6));
  f.F.cyl(0x1d1f26, x, CURB + 0.86, z, 1.6, 0.04, 18);
  bouncers.push(circle(x, z, 1.8, CURB + 0.85, 'bounce'));
}

// A clothes line with laundry between two posts (along local x).
function laundry(f, lx, lz, len) {
  for (const s of [-1, 1]) f.box(0x8a8f96, lx + s * len / 2, CURB, lz, 0.07, 1.9, 0.07);
  f.boxC(0xdadada, lx, CURB + 1.85, lz, len, 0.02, 0.02);
  const n = Math.floor(len / 0.8);
  for (let k = 0; k < n; k++) {
    if (rnd() < 0.3) continue;
    const big = rnd() < 0.4;
    f.boxC(pick(TOWELS, rnd), lx - len / 2 + 0.5 + k * 0.8, CURB + (big ? 1.45 : 1.6), lz, 0.55, big ? 0.8 : 0.5, 0.03);
  }
}

// Front garden wall of `mur` props along local z = lz, with gaps [x0, x1] left open.
function frontWall(f, LW, lz, gaps) {
  for (let x = -LW / 2 + 1.35; x <= LW / 2 - 1.3; x += 2.5) {
    if (gaps.some(([a, b]) => x + 1.25 > a && x - 1.25 < b)) continue;
    f.prop('mur', x, lz, 0);
  }
}

// ---------------------------------------------------------------------------------------------
// bungalowR lot: one-storey whitewashed cube on red-ochre gravel, flat or terracotta roof, garden
// wall, bougainvillea, butano bottles, sometimes a pool, a trampoline (1 in 8), a parked car.

function bungalowLot(f, LW, LD, r, corner = false) {
  const hw = R(8.2, 11, r), hd = R(6.8, 8.8, r), h = R(3.0, 3.4, r);
  const front = R(7.2, 9, r), hx = R(-1, 1, r), cz = front + hd / 2;
  const wall = pick(WALLS, r), door = pick(DOORS, r), shut = pick(SHUTTERS, r);
  const gs = r() < 0.5 ? -1 : 1;
  // Lot gravel (tan or the red San Agustín rock), a tiled terrace round the house, a dry lawn.
  f.flat(pick([0xd2b48c, 0xcaa680, 0xc89a78], r), 0, LD / 2, LW - 0.6, LD - 0.6, CURB);
  f.flat(0xd8a27a, hx, cz, hw + 2.4, hd + 2.4, CURB + 0.03);
  const lawnX = -gs * (LW / 4), lawnZ = front + hd + 6;
  if (lawnZ + 4 < LD) f.flat(r() < 0.5 ? 0x8fae5a : 0x9ab866, lawnX, lawnZ, LW / 2 - 1.5, 7, CURB + 0.015);
  for (let k = 0; k < 3; k++) {
    const rx = R(-LW / 2 + 1.5, LW / 2 - 1.5, r), rz = R(2.2, front - 1.2, r);
    if (Math.abs(rx - hx) < 2 || Math.abs(rx - gs * (LW / 2 - 2.4)) < 2.5) continue;
    lump(f.S, pick([0xa5532f, 0x8e4428, 0xb0603a], r), f.wx(rx, rz), CURB - 0.1, f.wz(rx, rz), R(0.8, 1.6, r), R(0.5, 0.9, r), R(0.8, 1.4, r), r() * 6);
  }
  // The cube.
  f.box(0xd8b896, hx, CURB, cz, hw + 0.12, 0.45, hd + 0.12);
  f.box(wall, hx, CURB + 0.45, cz, hw, h - 0.45, hd);
  f.solid(hx, cz, hw, hd, 99);
  const flatRoof = r() < 0.5;
  if (flatRoof) {
    f.box(C.white2, hx, CURB + h, cz, hw + 0.25, 0.5, hd + 0.25);
    f.box(0xd8cfc0, hx, CURB + h + 0.5, cz, hw - 0.4, 0.04, hd - 0.4);
    if (r() < 0.7) { f.cyl(0xd8d8d0, hx + R(-2, 2, r), CURB + h + 1.2, cz + hd / 4, 0.55, 1.4, 10); f.box(0x9a9a96, hx, CURB + h + 0.5, cz + hd / 4, 1.0, 0.5, 0.5); }
    if (r() < 0.6) { const ax = hx - hw / 3; f.cyl(0x8a8f96, ax, CURB + h + 1.5, cz, 0.03, 2.4, 4); f.boxC(0x8a8f96, ax, CURB + h + 2.4, cz, 1.4, 0.04, 0.04, 0.4); f.boxC(0x8a8f96, ax, CURB + h + 2.1, cz, 1.0, 0.04, 0.04, 0.4); }
  } else {
    f.box(C.white2, hx, CURB + h, cz, hw + 0.3, 0.22, hd + 0.3);
    f.roof(pick([C.terracotta, C.terracotta2, 0xb85a36], r), hx, CURB + h + 0.22, cz, hw + 1.0, R(1.4, 2.0, r), hd + 1.1);
    if (r() < 0.6) f.box(C.white2, hx + hw * 0.3, CURB + h, cz + hd * 0.2, 0.8, 2.6, 0.8);
  }
  // Door, windows with wooden shutters, sills.
  const dx = hx + R(-1.4, 1.4, r);
  f.box(door, dx, CURB, front - 0.06, 1.15, 2.25, 0.14);
  f.box(C.white2, dx, CURB + 2.25, front - 0.08, 1.5, 0.18, 0.18);
  for (const s of [-1, 1]) {
    const wx = hx + s * hw * 0.32;
    if (Math.abs(wx - dx) < 1.6) continue;
    f.box(C.glassDark, wx, CURB + 1.0, front - 0.04, 1.15, 1.25, 0.1);
    f.box(shut, wx - 0.85, CURB + 0.95, front - 0.07, 0.52, 1.36, 0.08);
    f.box(shut, wx + 0.85, CURB + 0.95, front - 0.07, 0.52, 1.36, 0.08);
    f.box(C.white2, wx, CURB + 0.9, front - 0.12, 1.5, 0.08, 0.24);
    if (r() < 0.2) adventStar(f, wx, CURB + 1.55, front - 0.14, r);
  }
  for (const s of [-1, 1]) {   // back windows
    const wx = hx + s * hw * 0.28;
    f.box(C.glassDark, wx, CURB + 1.0, front + hd - 0.06, 1.15, 1.25, 0.1);
    f.box(shut, wx - 0.85, CURB + 0.95, front + hd - 0.03, 0.52, 1.36, 0.08);
    f.box(shut, wx + 0.85, CURB + 0.95, front + hd - 0.03, 0.52, 1.36, 0.08);
  }
  f.box(door, hx, CURB, front + hd - 0.06, 1.0, 2.1, 0.12);
  for (const s of [-1, 1]) {   // side windows
    const sx = hx + s * (hw / 2 + 0.04);
    f.boxC(C.glassDark, sx, CURB + 1.6, cz, 0.1, 1.1, 1.0);
    f.boxC(shut, sx + s * 0.03, CURB + 1.6, cz - 0.75, 0.08, 1.2, 0.45);
    f.boxC(shut, sx + s * 0.03, CURB + 1.6, cz + 0.75, 0.08, 1.2, 0.45);
  }
  // Arcaded porch (pillars + tiled lintel; you walk under it, 2.5D collision has no ceilings).
  const porch = r() < 0.55;
  if (porch) {
    const pw = hw * 0.75, pz = front - 1.4;
    f.flat(C.tile, hx, pz, pw, 2.8, CURB + 0.05);
    for (const s of [-1, 0, 1]) {
      if (s === 0 && pw < 7) continue;
      const px = hx + s * (pw / 2 - 0.25);
      f.box(C.white2, px, CURB, front - 2.6, 0.38, 2.55, 0.38);
      f.circ(px, front - 2.6, 0.24, 99, 'pole');
    }
    f.box(C.white2, hx, CURB + 2.55, pz, pw + 0.2, 0.42, 3.0);
    f.box(C.terracotta, hx, CURB + 2.97, pz, pw + 0.3, 0.12, 3.1);
  }
  // Bougainvillea on a front corner, a garden palm or agave, butano by the door.
  const bc = gs * (hw / 2 + 0.2);
  bouga(f.S, f.wx(hx + bc, front - 0.4), f.wz(hx + bc, front - 0.4), h - 0.2, 1, r);
  f.circ(hx + bc, front - 0.4, 0.5, 99, 'tree');
  f.prop('butano', dx + 1.0, front - 0.45, r() * 6);
  if (r() < 0.5) f.prop('butano', dx + 1.45, front - 0.4, r() * 6);
  const gx = -gs * (LW / 2 - 3);
  if (r() < 0.45) palm(f.S, f.wx(gx, 4.2), f.wz(gx, 4.2), R(0.7, 0.9, r), { r });
  else agave(f.S, f.wx(gx, 4), f.wz(gx, 4), R(0.8, 1.1, r), r);
  // Path from the gate to the door (or to the porch).
  const pathEnd = porch ? front - 2.8 : front - 1.2;
  f.flat(0xe6dac4, dx, (1.0 + pathEnd) / 2, 1.3, pathEnd - 1.0, CURB + 0.03);
  // Garden wall with a gate gap, plus a driveway gap and a car (some lots).
  const car = !corner && r() < 0.28;
  const carX = gs * (LW / 2 - 2.4);
  const gaps = [[dx - 1.1, dx + 1.1]];
  if (car) gaps.push([carX - 1.6, carX + 1.6]);
  if (corner) {
    // The complex's name on a whitewashed sign wall at the block corner.
    const sx = -LW / 2 + 2.6;
    gaps.push([sx - 2.4, sx + 2.4]);
    f.box(C.white2, sx, CURB, 0.75, 4.6, 2.0, 0.5);
    f.box(C.terracotta, sx, CURB + 2.0, 0.75, 4.8, 0.14, 0.62);
    f.solid(sx, 0.75, 4.6, 0.5, 99, 'solid');
    addSign('BUNGALOWS\nLOS CACTUS', 4.0, 1.4, { bg: '#fbf7ee', fg: '#2f8a4a', border: null, scale: 0.72 }, f.wx(sx, 0.48), CURB + 1.1, f.wz(sx, 0.48), f.yaw + Math.PI);
  }
  frontWall(f, LW, 0.75, gaps);
  if (car) {
    f.flat(0xa8a39a, carX, 3.2, 3.0, 5.6, CURB + 0.03);
    f.car(pick(['hatch', 'hatch', 'sedan', 'wagon'], r), carX, 3.4, Math.PI);
  }
  // Back yard: pool / trampoline / laundry / sunbeds.
  const by = front + hd + 1.5;
  const roll = r();
  let tramp = null;
  if (roll < 0.125 && by + 4 < LD - 1) { tramp = [hx + R(-2, 2, r), Math.min(LD - 3, by + 3.2)]; trampoline(f, tramp[0], tramp[1]); }
  else if (roll < 0.45 && by + 4.5 < LD - 0.5) {
    pool(f, hx, Math.min(LD - 3.2, by + 2.6), 6, 3.2);
    if (r() < 0.7) f.prop('solstol', hx + 4.6, Math.min(LD - 3.2, by + 2.6), Math.PI);
  } else if (roll < 0.8) laundry(f, hx, Math.min(LD - 2, by + 2.5), 5.5);
  else { f.prop('parasoll', hx - 2, by + 2.5); f.prop('solstol', hx, by + 2.5, Math.PI / 2); }
  dogLots.push({ ox: f.ox, oz: f.oz, yaw: f.yaw, w: LW, d: LD, door: [dx, front], house: [hx, cz, hw, hd], drive: car ? [carX, 3.4] : null, tramp, corner });
}

// ---------------------------------------------------------------------------------------------
// lagenhet lots.

const HOTELS = [
  ['HOTEL LAS GAVIOTAS', { bg: '#fbf7ee', fg: '#1c5fa8', border: '#1c5fa8' }],
  ['APARTAMENTOS SOL', { bg: '#f7c31b', fg: '#d8321e', border: '#d8321e' }],
  ['APARTAMENTOS VIENTO SUR', { bg: '#1e9aa0', fg: '#fbf7ee', border: '#fbf7ee' }],
  ['HOTEL MAR AZUL', { bg: '#1c7fb8', fg: '#fbf7ee', border: '#fbf7ee' }],
  ['HOTEL ATLÁNTICO', { bg: '#fbf7ee', fg: '#c0623a', border: '#c0623a' }],
  ['APARTAMENTOS SOL DE INVIERNO', { bg: '#f07a1e', fg: '#fbf7ee', border: '#fbf7ee' }],
];
let hotelNext = 0;
// Ground-floor cafés under some slabs (charter Sweden, §6.9; invented names).
const CAFES = [
  ['CAFETERÍA · SVENSKT KAFFE', '#2f8a4a'], ['BAR · HÄR TALAS SVENSKA', '#1c7fb8'],
  ['KVÄLLSTIDNINGAR · PRENSA', '#d8321e'], ['SMÖRGÅSAR · BOCADILLOS', '#c0623a'],
];

// A 4-7 storey 1970s apartment-hotel slab: balcony rows, concrete fins, awnings, towels, roof sign.
// `id`: the residential lot (bi, bj, side, k), for the walkable roofs (ROOF_JUMP).
function slabLot(f, LW, LD, r, id) {
  const floors = 4 + Math.floor(r() * 4), fh = 2.9, H = floors * fh;
  const w = R(15.2, 17.4, r), d = R(10, 12, r), front = R(6.2, 7.6, r), cz = front + d / 2;
  const wall = pick([C.white, C.white2, C.white, C.cream, C.ochreWall], r);
  const accent = pick(AWNINGS, r);
  const rail = pick([C.white2, C.white2, C.white2, 0x1e9aa0, C.terracotta, 0x2f6ad1, 0xd8a24a], r);   // balcony fronts
  f.box(wall, 0, CURB, cz, w, H, d);
  const body = f.solid(0, cz, w, d, 99);
  // Ground floor: glass lobby band, entrance canopy on two poles, forecourt paving.
  f.box(C.glassDark, 0, CURB, front - 0.04, w - 2.4, 2.4, 0.1);
  f.box(0xd8cbb4, 0, CURB, front - 0.07, w + 0.1, 0.35, 0.12);
  f.box(accent, 0, CURB + 2.65, front - 1.5, 5.4, 0.2, 3.0);
  for (const s of [-1, 1]) { f.box(C.white2, s * 2.5, CURB, front - 2.85, 0.16, 2.65, 0.16); f.circ(s * 2.5, front - 2.85, 0.12, 99, 'pole'); }
  f.ceiling(0, front - 1.5, 5.4, 3.0, CURB + 2.65, CURB + 2.85);   // the chase camera stays under it
  f.flat(0xe6dac4, 0, front / 2, w + 2, front - 0.3, CURB + 0.03);
  // Balcony floors.
  const units = Math.max(3, Math.round(w / 3.8)), uw = w / units;
  const lot = { id, x: f.wx(0, front - 0.95), z: f.wz(0, front - 0.95), yaw: f.yaw + Math.PI, w, floors, spots: [] };
  balconyLots.push(lot);
  for (let fl = 1; fl < floors; fl++) {
    const y = CURB + fl * fh;
    for (let u = 0; u < units; u++) {
      const sx = -w / 2 + (u + 0.64) * uw;
      lot.spots.push({ x: f.wx(sx, front - 0.95), y: y + 0.02, z: f.wz(sx, front - 0.95), fl, u });
    }
    f.box(C.white2, 0, y - 0.18, front - 0.7, w + 0.3, 0.2, 1.4);
    f.box(C.glass, 0, y + 0.2, front - 0.03, w - 0.8, 2.0, 0.08);
    f.box(rail, 0, y + 0.02, front - 1.36, w + 0.3, 0.92, 0.12);
    if (rail !== C.white2) f.box(C.white2, 0, y + 0.94, front - 1.36, w + 0.34, 0.08, 0.16);
    for (let u = 0; u < units; u++) {
      const ux = -w / 2 + (u + 0.5) * uw;
      if (r() < 0.32) f.boxC(pick(AWNINGS, r), ux, y + fh - 0.45, front - 0.62, uw - 0.5, 0.07, 1.35, 0, -0.32);
      if (r() < 0.35) f.boxC(pick(TOWELS, r), ux + R(-0.6, 0.6, r), y + 0.62, front - 1.44, 0.62, 0.78, 0.04);
      if (r() < 0.12) f.boxC(0x2f8a4a, ux - uw / 3, y + 0.4, front - 1.0, 0.5, 0.5, 0.5);   // potted plant
      if (r() < 0.07) adventStar(f, ux + uw / 4, y + 1.75, front - 0.12, r);                  // Swedes abroad
    }
  }
  for (let u = 0; u <= units; u++) f.box(wall === C.white ? C.white2 : C.white, -w / 2 + u * uw, CURB + fh - 0.2, front - 0.72, 0.22, H - fh + 0.2, 1.46);
  f.ceiling(0, front - 0.73, w + 0.3, 1.46, CURB + fh - 0.2, CURB + H);   // and under the first balcony row
  // A stair tower on one side: an accent colour with a vertical strip of glass blocks.
  const st = r() < 0.5 ? -1 : 1, stC = pick([C.terracotta, C.sun, 0x1e9aa0, C.white2, 0x2f6ad1], r);
  const stx = st * (w / 2 - 1.7), stz = front + d + 1.0;
  f.box(stC, stx, CURB, stz, 3.4, H + 1.6, 2.4);
  f.box(0xd8e6ee, stx + st * 1.71, CURB + 1.2, stz, 0.06, H - 1.0, 0.9);
  const stair = f.solid(stx, stz, 3.4, 2.4, 99);
  // Sides and back: small windows per floor.
  for (let fl = 0; fl < floors; fl++) {
    const y = CURB + fl * fh + 1.0;
    for (const s of [-1, 1]) f.boxC(C.glassDark, s * (w / 2 + 0.03), y + 0.55, cz + d * 0.22, 0.08, 1.1, 1.2);
    if (fl > 0) f.boxC(C.glass, 0, y + 0.5, front + d + 0.03, w - 2, 1.2, 0.08);
  }
  // Roof: parapet, lift room, water tanks, antennas, the hotel sign on posts.
  const top = CURB + H;
  f.box(C.white2, 0, top, cz, w + 0.3, 0.6, d + 0.3);
  f.box(0xd8cfc0, 0, top + 0.6, cz, w - 0.6, 0.04, d - 0.6);
  f.box(wall, w / 4, top, cz + d / 4, 3.2, 2.6, 2.8);
  for (const s of [-1, 1]) f.cyl(0xdcdcd4, s * w / 3, top + 1.3, cz + d / 4, 0.7, 1.6, 10);
  f.cyl(0x8a8f96, -w / 4, top + 1.9, cz + d / 3, 0.03, 3.0, 4);
  f.boxC(0x8a8f96, -w / 4, top + 3.0, cz + d / 3, 1.6, 0.04, 0.04);
  const [name, style] = HOTELS[hotelNext++ % HOTELS.length];
  const sw = Math.min(w - 1, 3.2 + name.length * 0.55), sz = front + 1.0;
  for (const s of [-1, 1]) f.box(C.iron, s * (sw / 2 - 0.8), top + 0.6, sz, 0.12, 2.3, 0.12);
  f.box(C.iron, 0, top + 0.6, sz + 0.06, sw, 0.1, 0.1);
  addSign(name, sw, 1.7, { ...style, scale: 0.62, borderW: 0.08 }, f.wx(0, sz - 0.08), top + 2.1, f.wz(0, sz - 0.08), f.yaw + Math.PI);
  if (ROOF_JUMP.lots[id]) roofWalk(f, ROOF_JUMP.lots[id], { name, w, d, front, cz, top, stx, stz, sw, sz, body, stair });
  // Forecourt: planters with bougainvillea flanking the entrance (or a café terrace on one side);
  // palms; sometimes a car.
  const cafe = r() < 0.35 ? (r() < 0.5 ? -1 : 1) : 0;
  if (cafe) {
    const [txt, bg] = pick(CAFES, r);
    const cx = cafe * (w / 2 - 3.6);
    addSign(txt, 6.2, 0.9, { bg, fg: '#fbf7ee', border: '#fbf7ee', scale: 0.6 }, f.wx(cx, front - 0.14), CURB + 2.95, f.wz(cx, front - 0.14), f.yaw + Math.PI);
    f.box(pick(AWNINGS, r), cx, CURB + 2.5, front - 1.0, 6.4, 0.12, 2.0);
    f.ceiling(cx, front - 1.0, 6.4, 2.0, CURB + 2.5, CURB + 2.62);
    for (const k of [-1, 1]) {
      const tx = cx + k * 1.6, tz = 3.2;
      f.cyl(0xfafafa, tx, CURB + 0.37, tz, 0.4, 0.06, 10);
      f.cyl(0xb8bec6, tx, CURB + 0.18, tz, 0.04, 0.36, 5);
      for (const c of [-1, 1]) f.box(0xd8321e, tx + c * 0.62, CURB, tz, 0.4, 0.45, 0.4);
      f.prop('parasoll', tx, tz + 0.01);
    }
  }
  for (const s of [-1, 1]) {
    if (s === cafe) continue;
    const px = s * (w / 2 - 2.2);
    f.box(C.white2, px, CURB, 1.6, 3.4, 0.7, 1.2);
    f.solid(px, 1.6, 3.4, 1.2, CURB + 0.7, 'planter');
    for (let k = -1; k <= 1; k++) f.ico(k ? C.leaf2 : (r() < 0.5 ? C.bouga : C.bouga2), px + k * 1.1, CURB + 1.0, 1.6, 1.05);
  }
  if (r() < 0.6) palm(f.S, f.wx(-w / 2 - 1.2, front + 1.5), f.wz(-w / 2 - 1.2, front + 1.5), R(0.85, 1.05, r), { r });
  if (r() < 0.4) palm(f.S, f.wx(w / 2 + 1.2, front + 2.5), f.wz(w / 2 + 1.2, front + 2.5), R(0.8, 1.0, r), { r });
  f.prop('palmkruka', -3.4, front - 0.6, 0);
  f.prop('palmkruka', 3.4, front - 0.6, 0);
  if (!cafe && r() < 0.35) f.car(pick(['hatch', 'sedan', 'hatch', 'van'], r), (r() < 0.5 ? -1 : 1) * (w / 2 - 2.6), 3.6, Math.PI / 2);
}

// Hoppet mellan hotelltaken (feature 41, §10.29): a slab's roof made walkable between missions. The
// roof is the parapet's top (top + 0.64, over the slab's footprint), the lift room, the two water
// tanks, the antenna, the name sign and the stair tower's head walls up there; the slab's own 99 m
// solids are dead while ROOF_JUMP.live() and these are dead otherwise. Both lobbies get a glass door,
// both lift rooms a door to the stairs (game/roofJump.js puts its E points by them); SOL DE INVIERNO's
// lobby has ASCENSOR AVERIADO over its door and the coin line to the jump, ATLÁNTICO the brochure's
// sign and a little stash of coins by its south (sea) edge. No random draws: the world builds as before.
function roofWalk(f, key, { name, w, d, front, cz, top, stx, stz, sw, sz, body, stair }) {
  const J = ROOF_JUMP, floor = top + 0.64, lz = cz + d / 4, liftZ = lz - 1.4;
  const blocks = [
    f.solid(0, cz, w, d, floor, 'building'),
    f.solid(stx, stz, 3.4, 2.4, top + 1.6, 'building'),
    f.solid(w / 4, lz, 3.2, 2.8, top + 2.6, 'roof'),
    f.circ(-w / 3, lz, 0.7, top + 2.1, 'roof'),
    f.circ(w / 3, lz, 0.7, top + 2.1, 'roof'),
    f.circ(-w / 4, cz + d / 3, 0.12, top + 3.4, 'roof'),
    f.solid(0, sz, sw, 0.3, top + 2.95, 'roof'),
  ];
  // The lobby's glass door (bronze frame, two leaves) and the lift room's door to the stairs.
  f.box(0x6a4a2a, 0, CURB, front - 0.12, 2.1, 2.2, 0.05);
  for (const s of [-1, 1]) {
    f.box(C.glass, s * 0.5, CURB + 0.06, front - 0.15, 0.9, 2.04, 0.04);
    f.box(0xd8cbb4, s * 0.12, CURB + 0.95, front - 0.19, 0.05, 0.3, 0.04);
  }
  f.box(0x6a4a2a, w / 4, floor, liftZ - 0.03, 1.0, 1.82, 0.05);
  f.box(0x1e7a78, w / 4, floor, liftZ - 0.06, 0.86, 1.74, 0.04);
  f.box(0xd8cbb4, w / 4 + 0.3, floor + 0.9, liftZ - 0.09, 0.05, 0.05, 0.04);
  if (key === 'sol') {
    addSign('ASCENSOR AVERIADO', 1.9, 0.34, { bg: '#fbf7ee', fg: '#d8321e', border: '#d8321e', scale: 0.62 }, f.wx(0, front - 0.16), CURB + 2.38, f.wz(0, front - 0.16), f.yaw + Math.PI);   // [N] the lift out of order
    // The coins from in front of the lift room's door (out of the coin magnet's reach where the stairs
    // put him) to the west edge, where the jump goes over (world z of the line in `jz`;
    // roofJumpFinish adds the three over the gap).
    J.jz = f.wz(0, front + 4.2);
    for (let k = 0; k < 8; k++) {
      const t = k / 7, x = w / 4 - 4.3 + (-w / 2 + 0.8 - (w / 4 - 4.3)) * t, z = liftZ - 1.2 + (front + 4.2 - (liftZ - 1.2)) * t;
      J.coins.push([f.wx(x, z), floor + 0.75, f.wz(x, z)]);
    }
  } else {
    // The brochure's promise on two posts by the south edge, facing the roof (the sea behind it),
    // and the stash beside the view.
    const bz = front + d - 0.45;
    for (const s of [-1, 1]) f.box(C.iron, -2.4 + s * 1.3, floor, bz, 0.08, 1.98, 0.08);
    f.box(C.white2, -2.4, floor + 0.98, bz, 3.3, 1.05, 0.05);
    addSign('BALKONG MED HAVSUTSIKT\nOCH KVÄLLSSOL', 3.2, 1.0, { bg: '#fbf7ee', fg: '#c0623a', border: '#c0623a', scale: 0.62 }, f.wx(-2.4, bz - 0.04), floor + 1.5, f.wz(-2.4, bz - 0.04), f.yaw + Math.PI);   // [F*] the brochure (research-plot.md:253)
    blocks.push(f.solid(-2.4, bz, 3.4, 0.3, floor + 2.05, 'roof'));
    for (const x of [0.4, 1.1, 1.8]) for (const z of [front + d - 0.55, front + d - 1.2]) J.coins.push([f.wx(x, z), floor + 0.75, f.wz(x, z)]);
  }
  J.roofs[key] = { name, minX: body.minX, maxX: body.maxX, minZ: body.minZ, maxZ: body.maxZ, floor, blocks };
  for (const b of [body, stair]) Object.defineProperty(b, 'dead', { get: () => J.live(), set() {}, configurable: true });
  for (const b of blocks) Object.defineProperty(b, 'dead', { get: () => !J.live(), set() {}, configurable: true });
}

// After every block: the gap between the two roofs, its three coins, and the palms that stand in it.
// A tree's trunk collider reaches 99 m, so up there a palm would be a wall in the air; between
// missions those in the gap stop at 8 m (the tallest crown is 7.6).
function roofJumpFinish() {
  const J = ROOF_JUMP, { atl, sol } = J.roofs;
  if (!atl || !sol) return;
  const g = J.gap = { x0: atl.maxX, x1: sol.minX, z0: Math.max(atl.minZ, sol.minZ), z1: Math.min(atl.maxZ, sol.maxZ) };
  const mx = (g.x0 + g.x1) / 2, y = Math.max(atl.floor, sol.floor);
  for (const [dx, dy] of [[1.1, 1.2], [0, 1.6], [-1.1, 1.2]]) J.coins.push([mx + dx, y + dy, J.jz]);
  for (const b of queryBlocks(g.x0, g.z0, g.x1, g.z1, [])) {
    if (b.kind !== 'tree' || b.shape !== CIRCLE) continue;
    const low = circle(b.x, b.z, b.r, 8, 'tree');
    Object.defineProperty(b, 'dead', { get: () => J.live(), set() {}, configurable: true });
    Object.defineProperty(low, 'dead', { get: () => !J.live(), set() {}, configurable: true });
  }
}

// Half-finished concrete frame: a ramp to the first deck, a ramp to the second, rebar, a mixer.
function frameLot(f, LW, LD, r) {
  const w = LW - 4, d = 13, front = 8.5, cz = front + d / 2, t1 = CURB + 3.3, t2 = CURB + 6.4;
  f.flat(0xb89a72, 0, LD / 2, LW - 0.6, LD - 0.6, CURB);
  f.box(0x4a4640, 0, CURB, cz, w - 0.5, 3.0, d - 0.5);   // the shadowed inside, a solid block
  for (const s of [-1, 1]) f.box(C.brick, s * (w / 2 - 0.12), CURB, cz + 1.5, 0.24, 2.2, d - 4);
  f.box(C.brick, 0, CURB, front + d - 0.12, w - 1, 1.6, 0.24);
  f.box(C.concrete, 0, t1 - 0.3, cz, w, 0.3, d);
  f.solid(0, cz, w, d, t1, 'garage');
  const d2 = d / 2, cz2 = front + d - d2 / 2;
  f.box(C.concrete2, 0, t2 - 0.3, cz2, w, 0.3, d2);
  f.solid(0, cz2, w, d2, t2, 'garage');
  for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 3; iz++) {
    const x = -w / 2 + 0.25 + ix * (w - 0.5) / 3, z = front + 0.25 + iz * (d - 0.5) / 2;
    const tall = iz > 0 || ix % 3 === 0;
    f.box(C.concrete, x, CURB, z, 0.45, (tall ? t2 : t1) - CURB - 0.3, 0.45);
    f.circ(x, z, 0.25, tall ? t2 : t1, 'pole');   // solid on the ground and on deck 1
    for (const o of [-0.12, 0.12]) f.box(0x7a4a32, x + o, tall ? t2 : t1, z + o, 0.05, 1.2, 0.05);
  }
  // Ramp 1 from the forecourt up to deck 1 (rising along local +z), ramp 2 along deck 1.
  const r1x = -w / 2 + 2.4, r2x = w / 2 - 2.2, L1 = 7.6, L2 = d - d2;
  f.S.add(makeWedge(), C.concrete2, mat(f.wx(r1x, front - L1 / 2), CURB, f.wz(r1x, front - L1 / 2), 0, f.yaw, 0, 3.2, t1 - CURB, L1));
  ramp(f.wx(r1x, front - L1 / 2), f.wz(r1x, front - L1 / 2), f.yaw, 3.2, L1, CURB, t1);
  frameRamps.push({ x: f.wx(r1x, front - L1 - 1), z: f.wz(r1x, front - L1 - 1), yaw: f.yaw, top: t1, top2: t2, deck: { x: f.wx(0, cz), z: f.wz(0, cz), w, d } });
  f.S.add(makeWedge(), C.concrete2, mat(f.wx(r2x, front + L2 / 2), t1, f.wz(r2x, front + L2 / 2), 0, f.yaw, 0, 2.8, t2 - t1, L2));
  ramp(f.wx(r2x, front + L2 / 2), f.wz(r2x, front + L2 / 2), f.yaw, 2.8, L2, t1, t2);
  // Site clutter: sand pile, cement bags, the mixer, cones, a barrier and the sign.
  lump(f.S, 0xd8c08a, f.wx(4, 3), CURB, f.wz(4, 3), 4, 1.6, 3.2);
  for (let k = 0; k < 4; k++) f.box(0xe8e0d0, 0.5 + (k % 2) * 0.8, CURB + Math.floor(k / 2) * 0.3, 5.6, 0.7, 0.3, 0.5, 0.2);
  const mx = -1.5, mz = 4.2;
  f.cyl(C.orange, mx, CURB + 1.15, mz, 0.6, 1.2, 10, 0.5);
  f.cyl(0xd86a14, mx, CURB + 1.5, mz + 0.4, 0.35, 0.5, 10, 0.5);
  f.box(0x6a6a66, mx, CURB, mz, 1.0, 0.6, 1.4);
  f.circ(mx, mz, 0.9, CURB + 1.6, 'solid');
  for (const [x, z] of [[-3.4, 1.4], [2.4, 1.6], [7.6, 2.0]]) f.prop('kon', x, z, 0);
  for (const s of [-1, 1]) f.box(0xfafafa, s * 3.2, CURB, 0.8, 0.1, 1.0, 0.1);
  for (let k = 0; k < 4; k++) f.box(k % 2 ? C.red : 0xfafafa, -1.2 + k * 0.8, CURB + 0.85, 0.8, 0.8, 0.18, 0.06);
  addSign('OBRA\nPROHIBIDO EL PASO', 2.2, 1.3, { bg: '#f7c31b', fg: '#1d1426', border: '#1d1426', scale: 0.62 }, f.wx(8.4, 0.9), CURB + 1.5, f.wz(8.4, 0.9), f.yaw + Math.PI);
  f.box(C.iron, 8.4, CURB, 0.95, 0.08, 1.0, 0.08);
}

// Pool courtyard: big shallow pool, sunbed rows, parasols, palms, a straw-roofed pool bar.
function poolLot(f, LW, LD, r) {
  f.flat(0xe0d2b8, 0, LD / 2, LW - 0.6, LD - 0.6, CURB);
  pool(f, 0, 15, 11, 6.5);
  for (let k = 0; k < 4; k++) {
    const x = -5.4 + k * 3.6;
    f.prop('solstol', x, 8.6, Math.PI);
    if (k % 2 === 0) f.prop('parasoll', x + 1.8, 8.4);
  }
  for (const s of [-1, 1]) f.prop('solstol', s * 7.8, 15, s * Math.PI / 2);
  palm(f.S, f.wx(-7.6, 5.5), f.wz(-7.6, 5.5), R(0.9, 1.1, r), { r });
  palm(f.S, f.wx(7.4, 22.5), f.wz(7.4, 22.5), R(0.9, 1.1, r), { r });
  // Pool bar: white hut with a straw cone roof.
  const bx = -5, bz = 24.5;
  f.box(C.white2, bx, CURB, bz, 3.4, 2.3, 2.4);
  f.box(0x8a5a3a, bx, CURB + 1.0, bz - 1.25, 3.5, 0.12, 0.3);
  f.solid(bx, bz, 3.4, 2.4, 99);
  f.cone(0xd8b060, bx, CURB + 3.1, bz, 2.9, 1.6, 10);
  f.cyl(0xb8903a, bx, CURB + 2.35, bz, 2.85, 0.12, 10);
  addSign('BAR', 1.6, 0.6, { bg: '#f7c31b', fg: '#d8321e', border: '#d8321e', scale: 0.7 }, f.wx(bx, bz - 1.25), CURB + 2.0, f.wz(bx, bz - 1.25), f.yaw + Math.PI);
  frontWall(f, LW, 0.75, [[-1.6, 1.6]]);
}

// ---------------------------------------------------------------------------------------------
// Residential block: three lots facing each of two opposite streets, back walls between them.

function residential(bi, bj, b, S, F, type) {
  const ew = (bi + bj) % 2 === 1;
  const r = mulberry32(5000 + bi * 13 + bj * 101);
  const W = b.x1 - b.x0;
  const LW = W / 3, LD = W / 2;
  for (let side = 0; side < 2; side++) {
    const special = Math.floor(r() * 3);
    for (let k = 0; k < 3; k++) {
      const along = (k + 0.5) * LW;
      let f;
      if (!ew) f = side === 0 ? new Frame(S, F, b.x0 + along, b.z0, 0) : new Frame(S, F, b.x1 - along, b.z1, Math.PI);
      else f = side === 0 ? new Frame(S, F, b.x0, b.z1 - along, Math.PI / 2) : new Frame(S, F, b.x1, b.z0 + along, -Math.PI / 2);
      if (type === 'bungalowR') bungalowLot(f, LW, LD, r, side === 0 && k === 0);
      else if (k !== special) slabLot(f, LW, LD, r, `${bi},${bj},${side},${k}`);
      else if ((bi + bj + side) % 2) frameLot(f, LW, LD, r);
      else poolLot(f, LW, LD, r);
    }
  }
  // Back wall down the middle; bungalow gardens also get dividers.
  const mid = W / 2, run = (from, to, fixed, alongX) => {
    for (let t = from + 1.25; t <= to - 1.2; t += 2.5) {
      if (alongX) placeProp('mur', t, fixed, 0);
      else placeProp('mur', fixed, t, Math.PI / 2);
    }
  };
  if (!ew) {
    run(b.x0 + 1, b.x1 - 1, b.z0 + mid, true);
    if (type === 'bungalowR') {
      for (const k of [1, 2]) run(b.z0 + 17, b.z1 - 17, b.x0 + k * LW, false);
      for (const x of [b.x0 + 0.6, b.x1 - 0.6]) run(b.z0 + 2.2, b.z1 - 2.2, x, false);   // the side streets
    }
  } else {
    run(b.z0 + 1, b.z1 - 1, b.x0 + mid, false);
    if (type === 'bungalowR') {
      for (const k of [1, 2]) run(b.x0 + 17, b.x1 - 17, b.z0 + k * LW, true);
      for (const z of [b.z0 + 0.6, b.z1 - 0.6]) run(b.x0 + 2.2, b.x1 - 2.2, z, true);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Ground: road grid, block sidewalks, the outer sidewalk, sand, beach, foam, shallows. Every flat
// piece abuts its neighbours instead of overlapping, so nothing z-fights at a distance.

function ground(F) {
  const ext = HALF + RHW + 0.5;
  F.box(C.asphalt, 0, -0.5, 0, ext * 2, 1, ext * 2);
  const top = (c, x0, z0, x1, z1, y = CURB) => F.box(c, (x0 + x1) / 2, y - 0.5, (z0 + z1) / 2, x1 - x0, 1, z1 - z0);
  // Each block: a sidewalk ring at CURB round an interior fill 4 cm lower, so the block builders'
  // own ground (CURB + 0.01 and up) never sits coplanar with anything.
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = rc(i) + RHW, x1 = rc(i + 1) - RHW, z0 = rc(j) + RHW, z1 = rc(j + 1) - RHW;
    top(C.sidewalk, x0, z0, x1, z0 + SW); top(C.sidewalk, x0, z1 - SW, x1, z1);
    top(C.sidewalk, x0, z0 + SW, x0 + SW, z1 - SW); top(C.sidewalk, x1 - SW, z0 + SW, x1, z1 - SW);
    const t = MAP[j][i];
    top(t === 'bungalowR' ? 0xc49270 : t === 'lagenhet' ? 0xd8c8a8 : 0xcfc2a6, x0 + SW, z0 + SW, x1 - SW, z1 - SW, CURB - 0.04);
  }
  const o = HALF + RHW, e = EDGE;
  // The outer sidewalk ring; the west road stub (z -40) cuts the west piece in two.
  top(C.sidewalk, -e, -e, e, -o); top(C.sidewalk, -e, o, e, e);
  top(C.sidewalk, -e, -o, -o, -45.5); top(C.sidewalk, -e, -34.5, -o, o); top(C.sidewalk, o, -o, e, o);
  // Ochre volcanic sand round the town, cut the same way. The stub's asphalt runs from the road's
  // edge (a kerb-high step, as the collision ground) out of the map.
  top(C.sand, -FAR, -FAR, FAR, -e);
  top(C.sand, e, -e, FAR, e);
  top(C.sand, -FAR, -e, -e, -45.5); top(C.sand, -FAR, -34.5, -e, e);
  top(C.asphalt, -FAR, -45.5, -o, -34.5);
  for (let x = -e - 4; x > -FAR; x -= 7) F.box(0xf4f4f0, x, CURB + 0.004, -40, 3, 0.01, 0.16);
  // Beach, foam line, shallows (the sea plane takes over at z 330; all at y 0.17 = 2 cm above CURB).
  top(C.beach, -FAR, e, FAR, 300);
  F.box(C.foam, 0, 0.17 - 0.5, 300.6, 2 * FAR, 1, 1.2);
  F.box(0x63c2d4, 0, 0.17 - 0.5, (301.2 + 312) / 2, 2 * FAR, 1, 312 - 301.2);
  F.box(C.shallow, 0, 0.17 - 0.5, (312 + 330) / 2, 2 * FAR, 1, 330 - 312);
  // Road markings: white centre dashes and zebra crossings.
  for (let k = 0; k <= N; k++) {
    const c = rc(k);
    for (let s = 0; s < N; s++) {
      const a = rc(s) + RHW + 2.8, b = rc(s + 1) - RHW - 2.8;
      for (let t = a + 1; t < b - 1; t += 6) {
        F.box(0xf4f4f0, t + 1.5, 0.012, c, 3, 0.02, 0.16);
        F.box(0xf4f4f0, c, 0.012, t + 1.5, 0.16, 0.02, 3);
      }
    }
    for (let m = 0; m <= N; m++) {
      const ix = rc(k), iz = rc(m);
      for (const dir of [-1, 1]) {
        const along = RHW + 1.6;
        if ((k > 0 || dir > 0) && (k < N || dir < 0)) for (let w = -RHW + 0.7; w < RHW; w += 1.15) F.box(0xf4f4f0, ix + dir * along, 0.014, iz + w, 2.0, 0.02, 0.55);
        if ((m > 0 || dir > 0) && (m < N || dir < 0)) for (let w = -RHW + 0.7; w < RHW; w += 1.15) F.box(0xf4f4f0, ix + w, 0.014, iz + dir * along, 0.55, 0.02, 2.0);
      }
    }
  }
}

// A spot on block (i, j)'s sidewalk: side 0 north, 1 east, 2 south, 3 west; `along` metres from
// the side's middle (counter-clockwise), `inset` metres in from the kerb. yaw faces the road.
function sideSpot(i, j, side, along, inset) {
  const mx = rc(i) + 40, mz = rc(j) + 40, k = RHW + inset;
  if (side === 0) return { x: mx + along, z: rc(j) + k, yaw: Math.PI };
  if (side === 1) return { x: rc(i + 1) - k, z: mz + along, yaw: Math.PI / 2 };
  if (side === 2) return { x: mx - along, z: rc(j + 1) - k, yaw: 0 };
  return { x: rc(i) + k, z: mz - along, yaw: -Math.PI / 2 };
}

// Sight lines onto the island landmarks (from 14 m out along their yaw, as the views and cutaway
// cameras frame them): no street palm or bus stop goes in the way, e.g. of Pepes Bodega across the
// road from Hotel SunTrip.
let sightLines = [];
function collectSightLines() {
  sightLines = [];
  for (const l of Object.values(landmarks)) {
    if (Math.abs(l.x) > 400 || Math.abs(l.z) > 400) continue;
    sightLines.push([l.x - Math.sin(l.yaw || 0) * 14, l.z - Math.cos(l.yaw || 0) * 14, l.x, l.z]);
  }
}
function inSight(x, z, r = 2) {
  for (const [ax, az, bx, bz] of sightLines) {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(ax + dx * t - x, az + dz * t - z) < r) return true;
  }
  return false;
}

const RURAL = new Set(['tomat', 'fataga', 'grisfest', 'golf', 'flygplats', 'dromplan', 'bungalow', 'bygge', 'dyner', 'fyren']);
const FURNITURE = ['correos', 'papelera', 'vykort', 'bank', 'palmkruka', 'papelera', 'correos', 'bank'];

// Lamps, palms and sidewalk furniture of block (i, j), into that block's mesh (so it culls).
function streetFurniture(i, j, S) {
  {
    const type = MAP[j][i], rural = RURAL.has(type);
    for (let side = 0; side < 4; side++) {
      const h = (i * 7 + j * 13 + side * 5) % 8;
      const L = sideSpot(i, j, side, -22, 0.6);
      lamp(S, L.x, L.z, L.yaw, (i + j + side) % 2 === 0);
      for (const along of rural ? [12] : [-9, 15]) {
        const p = sideSpot(i, j, side, along + ((i + side) % 3) - 1, 0.95);
        if (inSight(p.x, p.z)) continue;
        if (rural && side % 2) agave(S, p.x, p.z, 0.75);
        else palm(S, p.x, p.z, R(0.85, 1.05), { tinsel: (i * 3 + j + side + along) % 4 === 0 });
      }
      if (rural) { if (h < 2) placeProp('papelera', ...xz(sideSpot(i, j, side, 4, 3.0))); continue; }
      const bs = sideSpot(i, j, side, 10, 2.95);
      if ((i * 5 + j * 3 + side * 7) % 11 === 0 && !inSight(bs.x, bs.z, 3)) busStop(S, bs);
      const f = sideSpot(i, j, side, 3, 3.0), t = FURNITURE[h];
      placeProp(t, f.x, f.z, f.yaw);
      if (h % 3 === 0) { const q = sideSpot(i, j, side, 26, 3.0); placeProp('papelera', q.x, q.z, q.yaw); }
      if (h === 5) { const q = sideSpot(i, j, side, -15, 3.0); placeProp('vykort', q.x, q.z, q.yaw); }
    }
  }
}
const xz = (p) => [p.x, p.z, p.yaw];

// A guagua stop: shelter with a bench and a PARADA sign, facing the road.
function busStop(S, p) {
  const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  const at = (a, b) => [p.x + rx * a - fx * b, p.z + rz * a - fz * b];   // a along the kerb, b back
  for (const a of [-1.6, 1.6]) { const [x, z] = at(a, 0.45); S.box(0x2f8a4a, x, CURB + 1.2, z, 0.1, 2.4, 0.1); circle(x, z, 0.1, 99, 'pole'); }
  {
    const [x, z] = at(0, 0.45), turned = Math.abs(fx) > 0.7;
    S.box(0xd8e6ee, x, CURB + 1.4, z, 3.2, 1.6, 0.06, p.yaw);
    box(x - (turned ? 0.05 : 1.6), z - (turned ? 1.6 : 0.05), x + (turned ? 0.05 : 1.6), z + (turned ? 1.6 : 0.05), 99, 'solid');
  }
  { const [x, z] = at(0, 0.05); S.box(0x2f8a4a, x, CURB + 2.45, z, 3.6, 0.12, 1.3, p.yaw); }
  { const [x, z] = at(0, 0.2); S.box(0xb07a44, x, CURB + 0.48, z, 2.6, 0.08, 0.4, p.yaw); }
  const [sx, sz] = at(2.1, -0.4);
  S.cyl(C.iron, sx, CURB + 1.4, sz, 0.05, 2.8, 5);
  circle(sx, sz, 0.08, 99, 'pole');
  addSign('PARADA\nGUAGUA', 0.9, 0.7, { bg: '#2f8a4a', fg: '#fbf7ee', border: '#fbf7ee', scale: 0.7 }, sx + fx * 0.06, CURB + 2.5, sz + fz * 0.06, p.yaw, true);
}

// The beach promenade: palms (some with tinsel) and lamps along the outer south sidewalk.
function promenade(S) {
  for (let x = -270; x <= 270; x += 20) palm(S, x, HALF + RHW + 1.0, R(0.9, 1.15), { tinsel: (x / 20) % 3 === 0 });
  for (let x = -260; x <= 260; x += 40) lamp(S, x, HALF + RHW + 0.6, Math.PI, false);
}

// GOD JUL · FELIZ NAVIDAD banners across three roads, on two poles with a tinsel garland.
function banners(S) {
  const spots = [[0, 40, 'x'], [-40, 0, 'z'], [0, -120, 'x']];   // [x, z, road axis]
  for (const [x, z, axis] of spots) {
    // h 8.4 (the banner 7.8–9.2 m): at 6.2 the bus chase eye (≈ 7 m) passed through it (Phase 3).
    const span = RHW + 1.0, h = 8.4, w = 2 * span - 1.2;
    const ends = axis === 'x' ? [[x, z - span], [x, z + span]] : [[x - span, z], [x + span, z]];
    for (const [px, pz] of ends) {
      S.cyl(C.white2, px, CURB + h / 2 + 0.6, pz, 0.12, h + 1.2, 8);
      S.ico(C.gold, px, CURB + h + 1.3, pz, 0.4, 1);
      circle(px, pz, 0.14, 99, 'pole');
    }
    const yaw = axis === 'x' ? Math.PI / 2 : 0;           // plane faces along the road
    addSign('GOD JUL · FELIZ NAVIDAD', w, 1.45, { bg: '#d8321e', fg: '#f7c31b', border: '#f7c31b', scale: 0.6, borderW: 0.1 }, x, CURB + h, z, yaw, true);
    // Garland: little gold/green beads along a wire above the banner.
    const dx = axis === 'x' ? 0 : 1, dz = axis === 'x' ? 1 : 0;
    for (let k = 0; k <= 12; k++) {
      const t = -span + (k / 12) * 2 * span, sag = 0.5 * (1 - (t / span) ** 2);
      S.ico(k % 2 ? C.gold : C.green, x + dx * t, CURB + h + 1.05 - sag, z + dz * t, 0.3, 0);
    }
    S.ico(C.gold, x, CURB + h + 0.95, z, 0.6, 0);
  }
}

// ---------------------------------------------------------------------------------------------
// Outskirts: Monte Rojo (north, east), dunes and palms (west), the sea (south), the NE gap for the
// parked DC-8, the welcome sign, the bound walls.

// The parked DC-8 sits outside the bound wall at (240, -335): no hills within 100 m of it and
// nothing taller than 1 m within 60 m (DESIGN §6.4).
export const DC8_SPOT = { x: 240, z: -335 };
const nearDc8 = (x, z, r) => Math.hypot(x - DC8_SPOT.x, z - DC8_SPOT.z) < r;
const ROCKS = [C.rock, C.rock2, C.rock3, C.rock4];

function outskirts(S, F) {
  const r = mulberry32(7351);
  // Monte Rojo: big domes behind terraced mesas, all in the north and east (z < 200), clear of
  // the DC-8 sector. Angle a measured from +x; north is -z.
  const okMountain = (x, z, rad) => z < 200 && (x > -230 || z < -400) && Math.hypot(x - DC8_SPOT.x, z - DC8_SPOT.z) - rad > 100 && Math.abs(x) < FAR - rad && Math.abs(z) < FAR - rad;
  for (let k = 0; k < 46; k++) {
    const a = -Math.PI * 1.05 + (k / 46) * Math.PI * 1.55;            // from west-north-west round to south-east
    const d = R(470, 640, r), rx = R(150, 260, r), ry = R(80, 150, r), rz = R(150, 240, r);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!okMountain(x, z, Math.max(rx, rz) / 2)) continue;
    S.sphere(pick(ROCKS, r), x, -25, z, rx, ry, rz, 0, r() * 6, 0, 16);
  }
  for (let k = 0; k < 34; k++) {
    const a = -Math.PI * 1.02 + (k / 34) * Math.PI * 1.5 + R(-0.03, 0.03, r);
    const d = R(410, 490, r), rad = R(38, 70, r);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!okMountain(x, z, rad)) continue;
    // Terraced mesa: strata in alternating red and ochre, low-poly (n 7) for the cel look.
    let y = -2, rr = rad;
    const tiers = 2 + Math.floor(r() * 3), ry = r() * 6;
    for (let t = 0; t < tiers; t++) {
      const h = R(8, 17, r);
      taper(S, t % 2 ? C.rock2 : C.rock, x, y + h / 2, z, rr * 0.82, rr, h, 7, 0, ry + t * 0.4, 0);
      y += h; rr *= 0.8;
    }
    S.sphere(C.rock3, x, y - 2, z, rr * 1.6, rr * 0.5, rr * 1.6, 0, ry, 0, 8);
  }
  // Foothills: red boulders and small hills just beyond the bound (north and east).
  for (let k = 0; k < 70; k++) {
    const side = k % 2, t = R(-BOUND - 40, BOUND + 40, r), dd = R(BOUND + 24, BOUND + 80, r);
    const x = side ? dd : t, z = side ? Math.min(t, 180) : -dd;
    const s = R(5, 16, r);
    if (nearDc8(x, z, 100 + s * 1.2)) continue;
    lump(S, pick(ROCKS, r), x, -s * 0.2, z, s * R(1.2, 2.2, r), s * R(0.5, 1, r), s * R(1.2, 2, r), r() * 6);
  }
  // The playable band between the outer sidewalk and the bound wall: cardón and agave in the north
  // and east, palms and small dunes in the west, nothing in the DC-8 sector.
  const inner = EDGE + 6;
  for (let k = 0; k < 150; k++) {
    const side = k % 3, t = R(-BOUND - 10, BOUND + 10, r), d = inner + r() * (BOUND - inner + 34);
    let x, z;
    if (side === 0) { x = t; z = -d; } else if (side === 1) { x = d; z = Math.min(t, 270); } else { x = -d; z = Math.min(t, 270); }
    if (nearDc8(x, z, 60) || (x > 172 && x < 308 && z < -290 && z > -388)) continue;   // the DC-8 and its whole apron (D2)
    if (side === 2 && Math.abs(z + 40) < 24) continue;                 // the west road stub + sign
    if (side === 2) {
      if (r() < 0.55) palm(S, x, z, R(0.9, 1.2, r), { r });
      else lump(S, r() < 0.5 ? C.dune : C.dune2, x, CURB - 0.6, z, R(6, 14, r), R(1.4, 2.6, r), R(5, 10, r), r() * 6);
    } else if (r() < 0.55) cardon(S, x, z, R(0.8, 1.3, r), r);
    else agave(S, x, z, R(0.8, 1.3, r), r);
  }
  // West, opposite the dyner blocks (Phase 3 r2): two rows of big hip-roof dunes just beyond the
  // bound, visual only (no colliders), crests running north-south and their slip faces, in the
  // dyner lee tone, towards the town, so they read as Maspalomas from the boardwalk and the west
  // road (the drivable dunes stop at 2.6 m; rounded beige dunes further out fade into the fog).
  // [z, crest h, length, lee turn from east, set back]: the front row's lee base at x -318 - set
  // back, the back row's crest at -410 - set back.
  for (const [row, list] of [[0, [[40, 8, 58, 0.35, 0], [96, 10.5, 70, -0.2, 8], [150, 9, 64, 0.3, 2], [204, 10, 72, -0.15, 10], [256, 7.5, 54, 0.4, 0]]],
    [1, [[66, 14, 84, 0.15, 0], [124, 17, 92, -0.25, -6], [182, 15, 86, 0.2, 4], [238, 13, 76, -0.1, -4]]]]) {
    for (const [z, h, L, d, back] of list) {
      const phi = Math.PI / 2 + d, Dl = 1.5 * h, Dw = 3.2 * h;
      const x = row ? -410 - back : -318 - back - (L / 2) * Math.abs(Math.sin(d)) - Dl * Math.cos(d);
      const g = duneGeo(L, Dw, Dl, h, Math.min(L / 2 - 2, 1.8 * h)), m = mat(x, CURB - 0.2, z, 0, phi, 0);
      S.add(g.wind, DUNE_WIND, m);
      S.add(g.lee, DUNE_LEE, m);
    }
  }
  const bigDunes = (x, z) => x > -480 && z > 10 && z < 300;
  // West: Maspalomas-style dunes and palm groves beyond the bound, sloping down to the beach.
  for (let k = 0; k < 70; k++) {
    const s = R(20, 60, r), sx = s * R(2.0, 3.2, r), sz = s * R(0.9, 1.4, r), half = Math.max(sx, sz) / 2;
    const x = -R(BOUND + 12 + half, 900 - half, r), z = R(-460, 300, r);
    if (Math.abs(z + 40) < 8 + half || bigDunes(x, z)) continue;
    const ry = R(-0.5, 0.5, r);   // ridges run roughly north-south, as the trade wind piles them
    S.sphere(r() < 0.5 ? C.dune : C.dune2, x, -s * 0.18, z, sz, s * R(0.6, 1.0, r), sx, 0, ry, 0, 12);
  }
  for (let k = 0; k < 40; k++) {
    const x = -R(BOUND + 15, 520, r), z = R(-300, 280, r);
    if (Math.abs(z + 40) < 14 || bigDunes(x, z)) continue;
    palm(S, x, z, R(1.0, 1.5, r), { r, collide: false });
  }
  // South-east headland: red rocks running into the sea.
  for (let k = 0; k < 18; k++) {
    const x = R(330, 520, r), z = R(200, 360, r), s = R(5, 18, r);
    lump(S, pick(ROCKS, r), x, -s * 0.3, z, s * 1.6, s, s * 1.4, r() * 6);
  }
  // The sea.
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2 * FAR, FAR - 330).rotateX(-Math.PI / 2), MAT.water);
  sea.position.set(0, 0.17, (330 + FAR) / 2);
  sea.receiveShadow = true;
  scene.add(sea);
  // White wave dashes on the shallows and boats bobbing out at sea (animated).
  for (let k = 0; k < 40; k++) F.box(C.foam, R(-900, 900, r), 0.17 + 0.004, R(315, 327, r), R(4, 12, r), 0.01, 0.35);
  boats(r);
  // Bound walls.
  const b = BOUND;
  box(-b - 10, -b - 10, b + 10, -b, 99, 'bound');
  box(-b - 10, b, b + 10, b + 10, 99, 'bound');
  box(-b - 10, -b, -b, b, 99, 'bound');
  box(b, -b, b + 10, b, 99, 'bound');
  welcomeSign(S);
  // The entrance road leaves the map: a red-and-white barrier just inside the bound wall.
  for (const z of [-45, -35]) { S.boxB(0xfafafa, -311, CURB, z, 0.25, 1.2, 0.25); circle(-311, z, 0.2, 99, 'pole'); }
  for (let k = 0; k < 8; k++) S.box(k % 2 ? C.red : 0xfafafa, -311, CURB + 1.0, -44.4 + k * 1.25 + 0.6, 0.12, 0.28, 1.25);
}

function boats(r) {
  const spec = [[-180, 420, 'sail'], [120, 520, 'sail'], [380, 460, 'fish'], [-420, 600, 'sail'], [200, 590, 'ferry'], [-60, 380, 'pedal']];
  for (const [x, z, kind] of spec) {
    const G = new GeoBuilder();
    if (kind === 'sail') {
      G.boxB(0xfafafa, 0, -0.3, 0, 1.8, 0.9, 6.5);
      G.box(0x1c5fa8, 0, 0.45, 0, 1.84, 0.12, 6.54);
      G.cone(0xfafafa, 0, 0.3, 3.4, 0.9, 1.6, 6, Math.PI / 2);
      G.cyl(0x8a8f96, 0, 4.2, 0.4, 0.06, 7.5, 5);
      G.add(makeWedge(), 0xfbf7ee, mat(0, 0.9, -0.6, 0, 0, 0, 0.06, 6.6, 2.0));
      G.add(makeWedge(), C.orange, mat(0, 0.9, 1.6, 0, Math.PI, 0, 0.06, 5.6, 2.2));
    } else if (kind === 'fish') {
      G.boxB(0x2f6ad1, 0, -0.4, 0, 2.6, 1.3, 8);
      G.boxB(0xf4efe6, 0, 0.9, 0, 2.62, 0.2, 8.02);
      G.boxB(0xfafafa, 0, 0.9, -1.5, 1.8, 1.6, 2.2);
      G.cyl(0x8a8f96, 0, 3.0, 1.5, 0.07, 3.4, 5);
      G.cone(C.red, 0, 0.4, 4.6, 1.3, 2.0, 6, Math.PI / 2);
    } else if (kind === 'ferry') {
      G.boxB(0xfafafa, 0, -1, 0, 9, 4, 40);
      G.boxB(0x1c5fa8, 0, 0.6, 0, 9.05, 0.8, 40.05);
      G.boxB(0xfafafa, 0, 3, -4, 7, 3.5, 20);
      G.box(0x2c4a66, 0, 4.6, -4, 7.05, 0.9, 19);
      G.cyl(C.red, 0, 8.5, -8, 1.2, 3.5, 10);
      G.cyl(0x1d1f26, 0, 10.4, -8, 1.25, 0.6, 10);
    } else {
      for (const s of [-1, 1]) G.cyl(0xfafafa, s * 0.9, 0.1, 0, 0.4, 3.2, 8, Math.PI / 2);
      G.boxB(C.sun, 0, 0.3, 0.2, 2.2, 0.15, 1.8);
      G.boxB(C.orange, 0, 0.45, -0.3, 1.6, 0.8, 0.15);
    }
    const m = toonMesh(G.build(), { outline: 0.05, cast: false });
    const yaw = r() * 6.28;
    m.position.set(x, 0.17, z);
    m.rotation.y = yaw;
    scene.add(m);
    const ph = r() * 6.28;
    animated.push({ tick(t) { m.position.y = 0.17 + Math.sin(t * 1.3 + ph) * 0.18; m.rotation.z = Math.sin(t * 0.9 + ph) * 0.05; m.rotation.x = Math.sin(t * 1.1 + ph * 2) * 0.03; } });
  }
}

// Welcome sign at the west entrance (the road stub at z -40), facing the town, double-sided.
function welcomeSign(S) {
  const x = -300, z = -54;
  for (const dz of [-5.4, 5.4]) {
    S.boxB(C.white2, x, CURB, z + dz, 1.0, 4.6, 1.0);
    S.boxB(C.terracotta, x, CURB + 4.6, z + dz, 1.3, 0.3, 1.3);
    box(x - 0.5, z + dz - 0.5, x + 0.5, z + dz + 0.5, 99, 'solid');
  }
  S.boxB(C.sun, x, CURB + 1.4, z, 0.3, 3.2, 10.0);
  S.cyl(C.sun, x, CURB + 5.5, z, 1.6, 0.3, 16, 0, 0, Math.PI / 2);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    S.box(C.orange, x, CURB + 5.5 + Math.sin(a) * 2.2, z + Math.cos(a) * 2.2, 0.25, 0.9, 0.28, 0, Math.PI / 2 - a);
  }
  addSign('BIENVENIDOS A\nNUEVA ESTOCOLMO\nVÄLKOMMEN!', 9.6, 2.9, { bg: '#fbf7ee', fg: '#1c5fa8', border: '#d8321e', scale: 0.82, borderW: 0.07 }, x + 0.17, CURB + 3.0, z, Math.PI / 2);
  addSign('BIENVENIDOS A\nNUEVA ESTOCOLMO\nVÄLKOMMEN!', 9.6, 2.9, { bg: '#fbf7ee', fg: '#1c5fa8', border: '#d8321e', scale: 0.82, borderW: 0.07 }, x - 0.17, CURB + 3.0, z, -Math.PI / 2);
  for (const dz of [-8, 8]) palm(S, x + 1.5, z + dz, 1.1, { tinsel: true });
  for (const dz of [-3, 0, 3]) bouga(S, x + 1.2, z + dz, 1.0, 0.8);
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
  collectSightLines();
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
    ground(F);
    banners(S);
    promenade(S);
    add(S, F);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const S = new GeoBuilder(), F = new GeoBuilder();
    const b = blockInterior(i, j);
    const W = b.x1 - b.x0;
    const type = MAP[j][i];
    streetFurniture(i, j, S);
    if (type === 'bungalowR' || type === 'lagenhet') residential(i, j, b, S, F, type);
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
  roofJumpFinish();
  flushSigns();
  nightLights();
  addPedLoops();
}

// The night glow (nightGlow) as one unlit mesh, drawn only while the sky is dark (night, sunset;
// gfx.skyDark, which the free-roam clock may force, §10.10).
function nightLights() {
  if (nightGlow.empty) return;
  const m = new THREE.Mesh(nightGlow.build(), MAT.mouth);
  m.name = 'nightGlow';
  m.onBeforeRender = (r, sc, cam, geo) => { geo.setDrawRange(0, skyDark() ? Infinity : 0); };
  scene.add(m);
}

export function tickTown(t) {
  for (const a of animated) a.tick(t);
}
