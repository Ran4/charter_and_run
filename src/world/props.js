// Breakable street furniture: Correos boxes, bins, beach showers, sunbeds, garden walls, butano
// bottles... Each type is one instanced mesh. Smash one with a car or a kick and it bursts into
// debris and coins (25 pta each).
//   Type flags (DESIGN §6.8): debris: n (chunks), splash: true, explode: 'big' | 'small'; the fruit
//   stalls' carOnly (no kick breaks it), kind (its block's kind), spread / debrisY, shreds, slow, sign.
//   Every car-smashable prop has top > 0.75 (cars ride over anything with top <= y + 0.6).

import { THREE, GeoBuilder, MAT, PRIM, outlineGeometry, outlineMat, mat, signMesh } from '../gfx.js';
import { box, circle, ceiling } from './collision.js';

const CURB = 0.15;

// Extra primitives for the §6.8 looks (cached; unit sized, scaled by the matrix).
const GEO = {};
// Tapered cylinder, unit height and bottom radius 0.5: top radius = 0.5 * ratio.
const taperGeo = (ratio, n) => (GEO['t' + ratio.toFixed(3) + '_' + n] ??= new THREE.CylinderGeometry(0.5 * ratio, 0.5, 1, n));
function taper(g, color, x, y, z, rTop, rBot, h, n = 12) {
  g.add(taperGeo(rTop / rBot, n), color, mat(x, y, z, 0, 0, 0, rBot * 2, h, rBot * 2));
}
// One slice of a unit cone (k of n), for striped parasols.
const sliceGeo = (k, n) => (GEO['k' + k + '_' + n] ??= new THREE.ConeGeometry(0.5, 1, 2, 1, false, (k / n) * Math.PI * 2, (Math.PI * 2) / n));

// A low-poly ball (icosahedron, 80 triangles) in place of a 280-triangle sphere: props are
// instanced by the hundred.
const ball = (g, color, x, y, z, sx, sy = sx, sz = sx, d = 1) => g.add(PRIM.ico(d), color, mat(x, y, z, 0, 0, 0, sx, sy, sz));

const WHITEWASH = 0xf4efe6, TERRACOTTA = 0xc0623a, BUTANO = 0xf07a1e, IRON = 0x3a3f44, INK = 0x1d1f22;

// §6.8: the Charter & Run prop registry (footprint, top, coins, shame, minSpeed, flags as DESIGN
// lists them). Local frame: origin on the ground (baseY), +z = the prop's facing. `color` is the
// debris colour.
const SPEC = {
  // A green Spanish street bin: basket on a post.
  papelera: {
    r: 0.38, top: 1.05, coins: 1, shame: 1, minSpeed: 3, color: 0x2f7a3e,
    build(g) {
      g.boxB(IRON, 0, 0, 0, 0.3, 0.05, 0.3);
      g.cyl(IRON, 0, 0.52, -0.02, 0.045, 1.0, 6);
      taper(g, 0x2f7a3e, 0, 0.66, 0.05, 0.33, 0.27, 0.64, 12);
      g.cyl(0x25633a, 0, 1.0, 0.05, 0.35, 0.07, 12);
      g.cyl(INK, 0, 1.03, 0.05, 0.28, 0.02, 12);
      g.box(0xf4efe6, 0, 0.68, 0.37, 0.16, 0.1, 0.02, 0, 0.12);
    },
  },
  // The yellow Correos pillar box with its dome, slot and post-horn badge.
  correos: {
    r: 0.32, top: 1.3, coins: 2, shame: 1, minSpeed: 3, color: 0xf2c12e,
    build(g) {
      g.cyl(0x6a6a66, 0, 0.05, 0, 0.31, 0.1, 14);
      g.cyl(0xf2c12e, 0, 0.55, 0, 0.27, 0.9, 14);
      g.cyl(0xd9a619, 0, 1.0, 0, 0.29, 0.06, 14);
      ball(g, 0xf2c12e, 0, 1.02, 0, 0.56, 0.48, 0.56);
      ball(g, 0xd9a619, 0, 1.26, 0, 0.1);
      g.box(INK, 0, 0.88, 0.25, 0.24, 0.045, 0.08);
      g.box(0xd9a619, 0, 0.93, 0.27, 0.3, 0.04, 0.06);
      g.cyl(0x8a2a1a, 0, 0.6, 0.27, 0.08, 0.03, 10, Math.PI / 2);
      g.box(0x8a2a1a, 0.07, 0.6, 0.27, 0.12, 0.03, 0.03);
    },
  },
  // A spinning postcard rack, four tiers of sun-and-sea postcards.
  vykort: {
    r: 0.35, top: 1.6, coins: 2, shame: 1, minSpeed: 3, color: 0xf6f0e0,
    build(g) {
      g.boxB(IRON, 0, 0, 0, 0.5, 0.05, 0.5, Math.PI / 4);
      g.cyl(0x9aa0a8, 0, 0.8, 0, 0.03, 1.5, 6);
      const cards = [0x1c7fb8, 0xf7c31b, 0xd8321e, 0x2f8a4a, BUTANO, 0xc2307a, 0x6ab0e8, 0xe8cf98];
      for (let t = 0; t < 4; t++) {
        const y = 0.5 + t * 0.29;
        g.cyl(0x9aa0a8, 0, y - 0.15, 0, 0.27, 0.02, 10);
        for (let k = 0; k < 4; k++) {
          const a = k * Math.PI / 2 + t * 0.35;
          g.box(0xfaf6ea, Math.sin(a) * 0.25, y, Math.cos(a) * 0.25, 0.22, 0.27, 0.02, a, -0.12);
          g.box(cards[(t * 3 + k) % cards.length], Math.sin(a) * 0.262, y + 0.02, Math.cos(a) * 0.262, 0.18, 0.18, 0.01, a, -0.12);
        }
      }
      g.box(0xf7c31b, 0, 1.52, 0, 0.34, 0.14, 0.34, Math.PI / 4);
    },
  },
  // A beach shower: tiled foot, steel pole, arm and head, blue tap.
  dusch: {
    r: 0.25, top: 2.2, coins: 3, shame: 2, minSpeed: 6, splash: true, color: 0x9ab8d0,
    build(g) {
      g.boxB(0xd8d3c6, 0, 0, 0, 0.62, 0.08, 0.62);
      g.boxB(0x6ab0e8, 0, 0, 0, 0.42, 0.09, 0.42);
      g.cyl(0xdfe5ea, 0, 1.08, 0, 0.06, 2.0, 8);
      g.cyl(0xdfe5ea, 0, 2.08, 0.2, 0.04, 0.42, 6, Math.PI / 2);
      g.cyl(0xb8c4cc, 0, 2.03, 0.4, 0.12, 0.07, 12);
      ball(g, 0xdfe5ea, 0, 2.12, 0, 0.12);
      g.box(0x1c7fb8, 0.08, 1.15, 0, 0.14, 0.06, 0.06);
      g.box(0x1c7fb8, 0, 0.95, 0.07, 0.07, 0.07, 0.1);
    },
  },
  // Beach parasol: orange-and-cream striped canopy on a pole with a concrete foot. The canopy's rim
  // is at 2.07, over his head (Phase 3 r3: at 1.72 it cut through his head whichever side the eye
  // was on), and a camera ceiling while the parasol stands (`canopy`: half-width, underside, top).
  parasoll: {
    r: 0.25, top: 2.55, coins: 1, shame: 1, minSpeed: 3, color: BUTANO, canopy: [1.15, 2.07, 2.6],
    build(g) {
      g.cyl(0xb8b4aa, 0, 0.06, 0, 0.24, 0.12, 10);
      g.cyl(0xe8e4da, 0, 1.175, 0, 0.035, 2.25, 6);
      for (let k = 0; k < 8; k++) g.add(sliceGeo(k, 8), k % 2 ? 0xfaf3e2 : BUTANO, mat(0, 2.31, 0, 0, 0, 0, 2.3, 0.48, 2.3));
      ball(g, 0xfaf3e2, 0, 2.56, 0, 0.09);
    },
  },
  // Sunbed with a backrest and a SunTrip-yellow towel (the Swedes reserve them early).
  solstol: {
    w: 0.7, d: 1.9, top: 0.8, coins: 1, shame: 1, minSpeed: 3, color: 0xf7c31b,
    build(g) {
      for (const sx of [-0.29, 0.29]) for (const sz of [-0.82, 0.3]) g.boxB(0xb8c0c8, sx, 0, sz, 0.05, 0.33, 0.05);
      g.box(0xfafafa, 0, 0.36, -0.27, 0.66, 0.07, 1.32);
      g.box(0xfafafa, 0, 0.57, 0.66, 0.66, 0.07, 0.6, 0, -0.75);
      g.box(0xf7c31b, 0, 0.41, -0.3, 0.56, 0.03, 1.12);
      g.box(0xd8321e, 0, 0.425, -0.62, 0.56, 0.02, 0.1);
      g.box(0xd8321e, 0, 0.425, -0.42, 0.56, 0.02, 0.06);
      g.box(0xf7c31b, 0, 0.61, 0.64, 0.56, 0.03, 0.5, 0, -0.75);
    },
  },
  // Terracotta pot with a little fan palm.
  palmkruka: {
    r: 0.4, top: 1.4, coins: 1, shame: 1, minSpeed: 4, color: TERRACOTTA,
    build(g) {
      taper(g, TERRACOTTA, 0, 0.26, 0, 0.36, 0.25, 0.52, 12);
      g.cyl(0xa8502e, 0, 0.53, 0, 0.38, 0.07, 12);
      g.cyl(0x5a3a2a, 0, 0.56, 0, 0.32, 0.02, 12);
      g.cyl(0x8a6a4a, 0, 0.8, 0, 0.07, 0.5, 7);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        g.box(k % 2 ? 0x3f7a3a : 0x4f8f44, Math.cos(a) * 0.28, 1.12, Math.sin(a) * 0.28, 0.62, 0.04, 0.17, -a, 0, 0.55);
      }
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.4;
        g.box(0x4f8f44, Math.cos(a) * 0.36, 0.98, Math.sin(a) * 0.36, 0.6, 0.04, 0.16, -a, 0, -0.25);
      }
    },
  },
  // Whitewashed garden wall: plinth, breeze-block openings, terracotta coping.
  mur: {
    w: 2.5, d: 0.3, top: 1.1, coins: 0, shame: 1, minSpeed: 2, debris: 9, color: WHITEWASH,
    build(g) {
      g.boxB(0xe2d6c0, 0, 0, 0, 2.52, 0.2, 0.31);
      g.boxB(WHITEWASH, 0, 0.2, 0, 2.5, 0.78, 0.27);
      g.boxB(0xfbf7ee, 0, 0.98, 0, 2.56, 0.08, 0.34);
      g.boxB(TERRACOTTA, 0, 1.06, 0, 2.5, 0.04, 0.2);
      for (const x of [-0.75, -0.25, 0.25, 0.75]) g.box(0xa89a86, x, 0.74, 0, 0.26, 0.26, 0.29, 0, 0, Math.PI / 4);
    },
  },
  // Two slatted tomato crates, the top one full.
  tomatlada: {
    w: 1.2, d: 1.2, top: 1.2, coins: 2, shame: 0, minSpeed: 5, color: 0xd8321e,
    build(g) {
      for (const [y, r] of [[0, 0], [0.58, 0.12]]) {
        g.boxB(0xc08a50, 0, y, 0, 1.12, 0.55, 1.12, r);
        for (const yy of [0.17, 0.36]) g.box(0x8a5a2e, 0, y + yy, 0, 1.15, 0.035, 1.15, r);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.boxB(0xa8763e, sx * 0.53, y, sz * 0.53, 0.08, 0.56, 0.08, r);
      }
      g.box(0x6a3a1a, 0, 1.1, 0, 1.0, 0.04, 1.0, 0.12);
      for (let k = 0; k < 9; k++) {
        const x = ((k % 3) - 1) * 0.3, z = (Math.floor(k / 3) - 1) * 0.3;
        ball(g, k % 4 ? 0xd8321e : 0xe8452a, x + (k % 2) * 0.04, 1.15, z, 0.3, 0.26, 0.3, 0);
      }
      for (let k = 0; k < 3; k++) ball(g, 0xd8321e, -0.35 + k * 0.35, 0.62, -0.6, 0.24, 0.24, 0.24, 0);
    },
  },
  // An upright bodega wine barrel with iron hoops.
  tunna: {
    r: 0.42, top: 1.05, coins: 2, shame: 0, minSpeed: 4, color: 0x8a5a3a,
    build(g) {
      taper(g, 0x9a5f34, 0, 0.26, 0, 0.41, 0.35, 0.52, 14);
      taper(g, 0x9a5f34, 0, 0.78, 0, 0.35, 0.41, 0.52, 14);
      for (const [y, r] of [[0.07, 0.36], [0.98, 0.36], [0.36, 0.405], [0.7, 0.405]]) g.cyl(0x3a3236, 0, y, 0, r, 0.06, 14);
      g.cyl(0x7a4526, 0, 1.04, 0, 0.34, 0.02, 14);
      g.cyl(0x5a2a1e, 0, 0.55, 0.4, 0.05, 0.04, 8, Math.PI / 2);
    },
  },
  // Park bench: green cast-iron sides, wooden slats (driven over; kick to break).
  bank: {
    w: 1.9, d: 0.7, top: 0.55, coins: 1, shame: 1, minSpeed: 4, color: 0xa8703c,
    build(g) {
      for (const sx of [-0.8, 0.8]) {
        g.boxB(0x2f4a3a, sx, 0, 0.02, 0.07, 0.42, 0.5);
        g.box(0x2f4a3a, sx, 0.66, -0.25, 0.07, 0.56, 0.07, 0, 0.22);
      }
      for (let k = 0; k < 3; k++) g.boxB(0xb07a44, 0, 0.42, -0.17 + k * 0.17, 1.9, 0.05, 0.13);
      for (let k = 0; k < 2; k++) g.box(0xb07a44, 0, 0.66 + k * 0.17, -0.27 - k * 0.035, 1.9, 0.11, 0.04, 0, 0.22);
    },
  },
  // Traffic cone.
  kon: {
    r: 0.28, top: 0.75, coins: 1, shame: 0, minSpeed: 1, color: 0xff7a1a,
    build(g) {
      g.boxB(0xe8641a, 0, 0, 0, 0.5, 0.06, 0.5);
      g.cone(0xff7a1a, 0, 0.4, 0, 0.2, 0.7, 10);
      g.cyl(0xfafafa, 0, 0.38, 0, 0.13, 0.12, 10);
    },
  },
  // Airport luggage trolley with a blue suitcase on it.
  bagagevagn: {
    r: 0.45, top: 1.0, coins: 1, shame: 0, minSpeed: 1, color: 0xb8bec6,
    build(g) {
      g.boxB(0xb8bec6, 0, 0.14, 0, 0.56, 0.05, 0.84);
      for (const sx of [-0.24, 0.24]) for (const sz of [-0.32, 0.32]) g.cyl(INK, sx, 0.08, sz, 0.08, 0.06, 10, 0, 0, Math.PI / 2);
      for (const sx of [-0.25, 0.25]) g.box(0xb8bec6, sx, 0.58, -0.4, 0.04, 0.86, 0.04);
      g.box(0x8a9098, 0, 0.55, -0.405, 0.48, 0.5, 0.02);
      g.cyl(0xd8321e, 0, 0.98, -0.42, 0.035, 0.6, 6, 0, 0, Math.PI / 2);
      g.boxB(0x2f5a8a, 0, 0.19, 0.06, 0.5, 0.24, 0.66);
      g.box(0xd8b48a, 0, 0.44, 0.06, 0.16, 0.04, 0.05);
    },
  },
  // REFRESCOS machine: red cabinet, lit header, bottle window, coin panel.
  automat: {
    w: 1.0, d: 0.8, top: 2.0, coins: 8, shame: 2, minSpeed: 6, color: 0xd8321e,
    build(g) {
      g.boxB(0xd8321e, 0, 0, 0, 1.0, 1.95, 0.8);
      g.boxB(0xa8241a, 0, 1.95, 0, 1.03, 0.05, 0.83);
      g.box(0xfff4c0, 0, 1.72, 0.405, 0.86, 0.3, 0.02);
      for (let k = 0; k < 5; k++) g.box(0xd8321e, -0.3 + k * 0.15, 1.72, 0.418, 0.09, 0.12, 0.01);
      g.box(0xffffff, 0, 1.5, 0.405, 0.86, 0.06, 0.02);
      g.box(0x223040, -0.14, 1.0, 0.405, 0.54, 0.74, 0.02);
      const bottles = [0x6a3a1a, BUTANO, 0x2f8a4a, 0xf7c31b];
      for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) g.box(bottles[(row + col) % 4], -0.35 + col * 0.14, 0.76 + row * 0.24, 0.418, 0.07, 0.16, 0.012);
      g.box(0xc8ccd2, 0.34, 1.05, 0.405, 0.2, 0.44, 0.02);
      g.box(INK, 0.34, 1.16, 0.418, 0.06, 0.09, 0.01);
      g.box(INK, 0, 0.3, 0.405, 0.52, 0.2, 0.02);
    },
  },
  // 1970s petrol pump: white body, red head with a lamp globe, price window, hose.
  gaspump: {
    w: 0.9, d: 0.6, top: 1.9, coins: 12, shame: 6, minSpeed: 5, explode: 'big', color: 0xd8321e,
    build(g) {
      g.boxB(0x8a8a86, 0, 0, 0, 1.0, 0.12, 0.7);
      g.boxB(0xf4f4f0, 0, 0.12, 0, 0.8, 1.3, 0.55);
      g.boxB(0xd8321e, 0, 1.42, 0, 0.84, 0.42, 0.58);
      g.boxB(0xd8321e, 0, 0.12, 0, 0.82, 0.12, 0.57);
      ball(g, 0xfff4c0, 0, 1.96, 0, 0.3);
      g.box(0xfff8e6, 0, 1.12, 0.28, 0.52, 0.34, 0.02);
      g.box(INK, 0, 1.18, 0.292, 0.4, 0.07, 0.01);
      g.box(INK, 0, 1.06, 0.292, 0.4, 0.07, 0.01);
      g.box(0x2a2a2a, 0.43, 0.95, 0.1, 0.08, 0.32, 0.14);
      g.cyl(INK, 0.47, 0.6, 0.16, 0.03, 0.72, 6);
      g.box(0x9a9a9a, 0.44, 1.08, 0.18, 0.05, 0.08, 0.2);
    },
  },
  // Orange butano gas bottle (explodes, small).
  butano: {
    r: 0.22, top: 0.85, coins: 3, shame: 3, minSpeed: 3, explode: 'small', color: BUTANO,
    build(g) {
      g.cyl(0xc85a10, 0, 0.03, 0, 0.19, 0.06, 14);
      g.cyl(BUTANO, 0, 0.36, 0, 0.2, 0.6, 14);
      ball(g, BUTANO, 0, 0.66, 0, 0.4, 0.24, 0.4);
      g.cyl(0xc85a10, 0, 0.76, 0, 0.15, 0.05, 10);
      g.cyl(0x9a9a9a, 0, 0.79, 0, 0.05, 0.08, 8);
      g.cyl(INK, 0, 0.84, 0, 0.06, 0.03, 8);
    },
  },
  // Plastic Christmas tree in a red bucket: baubles, tinsel, a gold star.
  julgran: {
    r: 0.5, top: 2.0, coins: 3, shame: 2, minSpeed: 3, color: 0xe0c050,
    build(g) {
      taper(g, 0xd8321e, 0, 0.15, 0, 0.28, 0.24, 0.3, 12);
      g.cyl(0x6a4528, 0, 0.36, 0, 0.05, 0.16, 6);
      g.cone(0x2f8a4a, 0, 0.78, 0, 0.5, 0.8, 9);
      g.cone(0x3a9a52, 0, 1.16, 0, 0.4, 0.7, 9);
      g.cone(0x2f8a4a, 0, 1.5, 0, 0.28, 0.62, 9);
      g.add(PRIM.torus(), 0xe0c050, mat(0, 0.56, 0, Math.PI / 2, 0, 0.1, 0.8, 0.8, 0.3));
      g.add(PRIM.torus(), 0xd8dde4, mat(0, 1.0, 0, Math.PI / 2, 0, -0.1, 0.6, 0.6, 0.25));
      const balls = [[0.3, 0.6, 0.22, 0xd8321e], [-0.27, 0.68, 0.2, 0xf2c12e], [0.05, 0.62, -0.36, 0x2f6ad1], [-0.2, 1.02, -0.18, 0xd8321e],
        [0.22, 1.05, 0.1, 0xd8dde4], [0.0, 1.0, 0.27, 0x2f6ad1], [0.1, 1.38, -0.12, 0xf2c12e], [-0.12, 1.4, 0.12, 0xd8321e]];
      for (const [x, y, z, c] of balls) ball(g, c, x, y, z, 0.14, 0.14, 0.14, 0);
      g.box(0xf7c31b, 0, 1.9, 0, 0.22, 0.22, 0.05, 0, 0, Math.PI / 4);
      g.box(0xf7c31b, 0, 1.9, 0, 0.22, 0.22, 0.05);
    },
  },
  // Three stacks of white plates with blue rims (the grisfest smash).
  tallrikar: {
    r: 0.4, top: 0.9, coins: 2, shame: 0, minSpeed: 2, color: 0xf4f4f0,
    build(g) {
      for (const [x, z, h] of [[0, -0.08, 0.88], [0.24, 0.15, 0.55], [-0.24, 0.16, 0.4]]) {
        g.cyl(0xf6f6f2, x, h / 2, z, 0.14, h, 14);
        for (let y = 0.06; y < h; y += 0.11) g.cyl(0x2f6ad1, x, y, z, 0.147, 0.018, 14);
        g.cyl(0xe8e8e2, x, h + 0.005, z, 0.15, 0.01, 14);
      }
    },
  },
  // A brown suitcase on its side with straps, and a small tan vanity case.
  resvaska: {
    w: 0.8, d: 0.5, top: 0.9, coins: 2, shame: 0, minSpeed: 3, color: 0x8a5a3a,
    build(g) {
      g.boxB(0x8a5a3a, 0, 0, -0.08, 0.74, 0.7, 0.28);
      for (const x of [-0.2, 0.2]) g.boxB(0xd8b48a, x, 0, -0.08, 0.06, 0.71, 0.3);
      g.box(0x3a2a1e, 0, 0.75, -0.08, 0.22, 0.06, 0.06);
      for (const x of [-0.12, 0.12]) g.boxB(0x3a2a1e, x, 0.7, -0.08, 0.03, 0.08, 0.04);
      g.box(0xf7c31b, -0.24, 0.48, 0.065, 0.12, 0.09, 0.01);
      g.boxB(0xd8b48a, 0.1, 0, 0.17, 0.42, 0.28, 0.2);
      g.box(0x6a4a2a, 0.1, 0.31, 0.17, 0.14, 0.04, 0.04);
    },
  },
  // A fruit stall at the market (feature 28, DESIGN §10.19): centre.js's market stall with a
  // yellow-and-orange striped awning (a walkable roof at 2.55), crates of tomatoes, bananas,
  // oranges and melons on the counter. Only his car breaks it, and only in free roam (`carOnly`;
  // game/fruitStands.js decides): in a mission it is the wall the stall always was. `kind: 'stall'`
  // keeps its solid the stall's for the camera, the guides and the officer (a 'prop' they see
  // through). Fruit-coloured debris (`color` a list) over the counter (`spread`, `debrisY`), the
  // awning torn into `shreds`, the car slowed to `slow` of its speed. A placement may give it a sign
  // on the awning (`sign`: the text; FRUTAS on the market's first).
  frutas: {
    w: 5, d: 3.5, top: 2.55, coins: 4, shame: 3, minSpeed: 6, carOnly: true, kind: 'stall',
    debris: 26, spread: 3.4, debrisY: 0.75, shreds: 4, slow: 0.8,
    color: [0xd8321e, 0xf7c31b, 0xf07a1e, 0x6ab04a, 0xe8452a, 0xb88a52],
    sign: { y: 2.82, z: 1.55, w: 3.6, h: 0.62, posts: 1.2, opts: { bg: '#fff8e6', fg: '#1d1426', border: '#1d1426', scale: 0.62, double: true } },
    build(g) {
      const w = 5, d = 3.5, hd = d / 2, top = 2.4, AW = [0xf7c31b, 0xf07a1e], WOOD = 0x6a4528;
      g.boxB(0xf2e6d0, 0, 0, -hd + 0.08, w - 0.1, top - 0.15, 0.1);
      for (const s of [-1, 1]) g.boxB(AW[1], s * (w / 2 - 0.06), 1.0, 0, 0.06, top - 1.15, d - 0.2);
      for (const s of [-1, 1]) for (const t of [-1, 1]) g.boxB(WOOD, s * (w / 2 - 0.08), 0, t * (hd - 0.08), 0.12, top, 0.12);
      g.boxB(WOOD, 0, 0, hd - 0.45, w - 0.3, 0.88, 0.8);
      g.boxB(AW[0], 0, 0.88, hd - 0.45, w - 0.18, 0.05, 0.86);
      g.boxB(AW[0], 0, 0.45, hd - 0.04, w - 0.18, 0.45, 0.04);
      for (let k = 0; k < 8; k++) {
        const u = -w / 2 + (k + 0.5) * (w / 8);
        g.boxB(AW[k % 2], u, top - 0.14, 0.12, w / 8, 0.14, d + 0.5);
        g.boxB(AW[k % 2], u, top - 0.48, hd + 0.36, w / 8, 0.34, 0.05);
      }
      // Eight crates on the counter: tomatoes, bananas, oranges, melons, lemons, round again.
      const FRUIT = [0xd8321e, 0xf7c31b, 0xf07a1e, 0x6ab04a, 0xf0a020];
      for (let k = 0; k < 8; k++) {
        const x = -w / 2 + 0.6 + k * ((w - 1.2) / 7), z = hd - 0.45, c = FRUIT[k % 5];
        g.boxB(0xb88a52, x, 0.93, z, 0.42, 0.14, 0.5);
        if (c === 0xf7c31b) for (let m = 0; m < 3; m++) g.box(c, x, 1.12, z - 0.14 + m * 0.14, 0.34, 0.07, 0.11, 0.25 * (m - 1), 0, 0.35);
        else if (c === 0x6ab04a) for (let m = 0; m < 2; m++) ball(g, c, x + (m - 0.5) * 0.18, 1.18, z + (m - 0.5) * 0.14, 0.26, 0.22, 0.3, 0);
        else for (let m = 0; m < 4; m++) ball(g, c, x + (m % 2 - 0.5) * 0.18, 1.13, z + ((m >> 1) - 0.5) * 0.2, 0.17, 0.17, 0.17, 0);
      }
      // A half melon on the front crate and three tomato boxes stacked by the counter's end.
      ball(g, 0xe8452a, 1.95, 1.17, hd - 0.3, 0.24, 0.12, 0.24, 0);
      for (let k = 0; k < 3; k++) g.boxB(k === 1 ? 0xa8763e : 0xc08a50, -1.9 + k * 0.05, k * 0.3, -0.4, 0.5, 0.3, 0.4, k * 0.12);
      for (let k = 0; k < 4; k++) ball(g, 0xd8321e, -2.0 + (k % 2) * 0.18, 0.95, -0.48 + (k >> 1) * 0.16, 0.16, 0.16, 0.16, 0);
    },
  },
  // Ice-cream A-board: a cone with three scoops painted on.
  glasskylt: {
    w: 0.8, d: 0.2, top: 1.3, coins: 1, shame: 1, minSpeed: 3, color: 0xfafafa,
    build(g) {
      g.box(0xfafafa, 0, 0.62, 0.07, 0.72, 1.22, 0.04, 0, -0.12);
      g.box(0xfafafa, 0, 0.62, -0.07, 0.72, 1.22, 0.04, 0, 0.12);
      g.box(0xd8321e, 0, 1.13, 0.032, 0.74, 0.18, 0.05, 0, -0.12);
      g.box(0xd8321e, 0, 1.13, -0.032, 0.74, 0.18, 0.05, 0, 0.12);
      g.cone(0xd8a060, 0, 0.5, 0.115, 0.13, 0.42, 8, Math.PI);
      ball(g, 0xf2a0b8, 0, 0.78, 0.1, 0.26, 0.22, 0.08);
      ball(g, 0xfff8e6, -0.09, 0.92, 0.085, 0.22, 0.2, 0.08);
      ball(g, 0x6a3a1a, 0.09, 0.92, 0.085, 0.22, 0.2, 0.08);
    },
  },
};

export const TYPES = {};
for (const [k, d] of Object.entries(SPEC)) TYPES[k] = { ...d };

const placements = []; // { type, x, z, yaw, baseY, sign? }
export const props = []; // runtime list
let meshes = {};
let debris, debrisState = [];
const DEBRIS = 160;
// Torn awning (the fruit stalls' `shreds`): striped flaps that flutter down and lie where they land.
let shreds = null, shredState = [];
const SHREDS = 12;

// baseY: the height the prop stands on (CURB on the ground; a table top for the grisfest plates).
// opts.sign: the text of the type's `sign` (a board on posts, its own mesh, hidden while broken).
// Must be called before finalizeProps (props are instanced at finalize time).
const warned = new Set();
export function placeProp(type, x, z, yaw = 0, baseY = CURB, opts = {}) {
  if (!TYPES[type]) {
    if (!warned.has(type)) { warned.add(type); console.warn('placeProp: unknown prop type', type); }
    return;
  }
  placements.push({ type, x, z, yaw, baseY, sign: opts.sign ?? null });
}

// A placement's sign: the board on two posts over the awning, in the prop's frame.
function buildSign(p, scene) {
  const s = p.def.sign, grp = new THREE.Group();
  const m = signMesh(p.sign, s.w, s.h, s.opts);
  m.position.set(0, s.y, s.z);
  grp.add(m);
  const g = new GeoBuilder();
  for (const x of [-s.posts, s.posts]) g.boxB(0x6a4528, x, p.def.top - CURB, s.z, 0.08, 0.15, 0.08);
  grp.add(new THREE.Mesh(g.build(), MAT.toon));
  grp.position.set(p.x, p.baseY, p.z);
  grp.rotation.y = p.yaw;
  scene.add(grp);
  return grp;
}

const _m = new THREE.Matrix4(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);

export function finalizeProps(scene) {
  const counts = {};
  for (const p of placements) counts[p.type] = (counts[p.type] || 0) + 1;
  for (const [type, n] of Object.entries(counts)) {
    const def = TYPES[type];
    const g = new GeoBuilder();
    def.build(g);
    const geo = g.build();
    const im = new THREE.InstancedMesh(geo, MAT.toon, n);
    im.castShadow = true; im.receiveShadow = true;
    const om = new THREE.InstancedMesh(outlineGeometry(geo), outlineMat(0.03), n);
    om.instanceMatrix = im.instanceMatrix;
    scene.add(im, om);
    meshes[type] = { im, om, next: 0 };
  }
  for (const p of placements) {
    const def = TYPES[p.type];
    const m = meshes[p.type];
    const idx = m.next++;
    const prop = { ...p, def, idx, alive: true, respawn: 0 };
    const top = p.baseY - CURB + def.top, kind = def.kind ?? 'prop';
    // Fences turn by multiples of 90 degrees, so their footprint stays an axis-aligned box.
    if (def.r) prop.block = circle(p.x, p.z, def.r, top, kind, prop);
    else {
      const turned = Math.abs(Math.sin(p.yaw)) > 0.7;
      const hw = (turned ? def.d : def.w) / 2, hd = (turned ? def.w : def.d) / 2;
      prop.block = box(p.x - hw, p.z - hd, p.x + hw, p.z + hd, top, kind, prop);
    }
    prop.sign = p.sign && def.sign ? buildSign(prop, scene) : null;
    if (def.canopy) {
      const [h, u, t] = def.canopy, c = ceiling(p.x - h, p.z - h, p.x + h, p.z + h, p.baseY + u, p.baseY + t);
      c.underOnly = true; c.block = prop.block;
    }
    props.push(prop);
    setMatrix(prop, true);
  }
  for (const m of Object.values(meshes)) { m.im.instanceMatrix.needsUpdate = true; m.im.computeBoundingSphere(); m.om.computeBoundingSphere(); }

  // Debris chunks share one instanced mesh with per-instance colours.
  debris = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshToonMaterial({ gradientMap: MAT.toon.gradientMap }), DEBRIS);
  debris.castShadow = true;
  debris.frustumCulled = false;
  for (let k = 0; k < DEBRIS; k++) {
    debris.setMatrixAt(k, _zero);
    debris.setColorAt(k, new THREE.Color(0xffffff));
    debrisState.push({ t: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.2, rx: 0, ry: 0, wx: 0, wy: 0 });
  }
  scene.add(debris);
  if (Object.keys(counts).some((t) => TYPES[t].shreds)) {
    // One flap: four stripes of the fruit stalls' awning, yellow and orange.
    const g = new GeoBuilder();
    for (let k = 0; k < 4; k++) g.box(k % 2 ? 0xf07a1e : 0xf7c31b, -0.27 + k * 0.18, 0, 0, 0.18, 0.03, 0.62);
    shreds = new THREE.InstancedMesh(g.build(), MAT.toon, SHREDS);
    shreds.castShadow = true;
    shreds.frustumCulled = false;
    for (let k = 0; k < SHREDS; k++) {
      shreds.setMatrixAt(k, _zero);
      shredState.push({ t: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, s: 1 });
    }
    scene.add(shreds);
  }
  placements.length = 0;
}

function setMatrix(p, show) {
  const m = meshes[p.type];
  if (show) _m.copy(mat(p.x, p.baseY ?? 0.15, p.z, 0, p.yaw, 0));
  else _m.copy(_zero);
  m.im.setMatrixAt(p.idx, _m);
  m.im.instanceMatrix.needsUpdate = true;
  if (p.sign) p.sign.visible = show;
}

let debrisNext = 0;
const _c = new THREE.Color();
// color: one colour, or a list the chunks take in turn (the fruit stalls' tomatoes, bananas...).
// spread: the width of the square they start in.
export function spawnDebris(x, y, z, color, n, vx = 0, vz = 0, power = 1, spread = 0.6) {
  const list = Array.isArray(color) ? color : null;
  if (!list) _c.set(color);
  for (let k = 0; k < n; k++) {
    const i = debrisNext++ % DEBRIS;
    const d = debrisState[i];
    d.t = 1.6 + Math.random() * 0.8;
    d.x = x + (Math.random() - 0.5) * spread; d.y = y + Math.random() * 0.6; d.z = z + (Math.random() - 0.5) * spread;
    d.vx = vx * 0.6 + (Math.random() - 0.5) * 7 * power;
    d.vz = vz * 0.6 + (Math.random() - 0.5) * 7 * power;
    d.vy = 3 + Math.random() * 6 * power;
    d.s = 0.12 + Math.random() * 0.22;
    d.wx = (Math.random() - 0.5) * 20; d.wy = (Math.random() - 0.5) * 20;
    if (list) _c.set(list[k % list.length]);
    debris.setColorAt(i, !list && k % 3 === 2 ? _c.clone().multiplyScalar(0.7) : _c);
  }
  debris.instanceColor.needsUpdate = true;
}

// n flaps of torn awning from a roof of half-size (hw, hd) at height y, turned yaw, pushed along
// (vx, vz) by the car: they flutter (low gravity, drag), then lie flat where they land.
let shredNext = 0;
export function spawnShreds(x, y, z, yaw, hw, hd, n, vx = 0, vz = 0) {
  if (!shreds) return;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (let k = 0; k < n; k++) {
    const d = shredState[shredNext++ % SHREDS];
    const u = ((k + 0.5) / n - 0.5) * 2 * hw * 0.8, v = (Math.random() - 0.5) * hd;
    d.t = 3.2 + Math.random() * 1.2;
    d.x = x + u * c + v * s; d.y = y + Math.random() * 0.3; d.z = z - u * s + v * c;
    d.vx = vx * 0.45 + (Math.random() - 0.5) * 5; d.vz = vz * 0.45 + (Math.random() - 0.5) * 5;
    d.vy = 4 + Math.random() * 3.5;
    d.rx = Math.random() * 6; d.ry = Math.random() * 6; d.rz = Math.random() * 6;
    d.wx = (Math.random() - 0.5) * 9; d.wy = (Math.random() - 0.5) * 6; d.wz = (Math.random() - 0.5) * 9;
    d.s = 0.85 + Math.random() * 0.4;
  }
}

// Returns the prop if it broke.
export function breakProp(p, vx = 0, vz = 0, game = null) {
  if (!p.alive) return null;
  const def = p.def, y0 = p.baseY ?? CURB;
  p.alive = false;
  p.block.dead = true;
  p.respawn = 75 + Math.random() * 40;
  setMatrix(p, false);
  spawnDebris(p.x, y0 + (def.debrisY ?? 0.25), p.z, def.color, def.debris ?? 7, vx, vz, 1, def.spread ?? 0.6);
  if (def.shreds) spawnShreds(p.x, y0 + def.top - CURB, p.z, p.yaw, (def.w ?? 2 * def.r) / 2, (def.d ?? 2 * def.r) / 2, def.shreds, vx, vz);
  if (game) game.onPropBroken(p, vx, vz);
  return p;
}

export function tickProps(dt, px, pz) {
  for (const p of props) {
    if (p.alive) continue;
    p.respawn -= dt;
    if (p.respawn <= 0 && (p.x - px) ** 2 + (p.z - pz) ** 2 > 70 * 70) {
      p.alive = true;
      p.block.dead = false;
      setMatrix(p, true);
    }
  }
  let any = false;
  for (let i = 0; i < DEBRIS; i++) {
    const d = debrisState[i];
    if (d.t <= 0) continue;
    any = true;
    d.t -= dt;
    d.vy -= 22 * dt;
    d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    if (d.y < 0.15 + d.s / 2) { d.y = 0.15 + d.s / 2; d.vy = Math.abs(d.vy) * 0.35; d.vx *= 0.6; d.vz *= 0.6; d.wx *= 0.6; d.wy *= 0.6; }
    d.rx += d.wx * dt; d.ry += d.wy * dt;
    const s = d.t <= 0 ? 0 : d.s * Math.min(1, d.t * 2);
    _m.copy(mat(d.x, d.y, d.z, d.rx, d.ry, 0, s, s, s));
    debris.setMatrixAt(i, _m);
  }
  if (any) debris.instanceMatrix.needsUpdate = true;
  if (!shreds) return;
  any = false;
  const drag = Math.exp(-1.6 * dt);   // the air catches the cloth
  for (let i = 0; i < SHREDS; i++) {
    const d = shredState[i];
    if (d.t <= 0) continue;
    any = true;
    d.t -= dt;
    d.vy = Math.max(-3.5, d.vy - 9 * dt);
    d.vx *= drag; d.vz *= drag;
    d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    if (d.y <= 0.17) { d.y = 0.17; d.vx = d.vy = d.vz = 0; d.rx = d.rz = 0; d.wx = d.wy = d.wz = 0; }
    d.rx += d.wx * dt; d.ry += d.wy * dt; d.rz += d.wz * dt;
    const s = d.t <= 0 ? 0 : d.s * Math.min(1, d.t * 1.5);
    _m.copy(mat(d.x, d.y, d.z, d.rx, d.ry, d.rz, s, s, s));
    shreds.setMatrixAt(i, _m);
  }
  if (any) shreds.instanceMatrix.needsUpdate = true;
}

const inArea = (p, a) => !a || (p.x - a.x) ** 2 + (p.z - a.z) ** 2 <= a.r * a.r;

// Bring every prop of `type` inside the area back now (alive, solid, visible): retried stages must
// find intact plates.
export function reviveProps(type, area) {
  for (const p of props) {
    if (p.type !== type || p.alive || !inArea(p, area)) continue;
    p.alive = true;
    p.respawn = 0;
    p.block.dead = false;
    setMatrix(p, true);
  }
}

export function propsOfType(type, area) { return props.filter((p) => p.type === type && inArea(p, area)); }

export function propsNear(x, z, r) {
  const out = [];
  for (const p of props) if (p.alive && (p.x - x) ** 2 + (p.z - z) ** 2 < (r + (p.def.r || p.def.w / 2)) ** 2) out.push(p);
  return out;
}
