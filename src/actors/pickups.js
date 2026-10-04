// Coins (pooled, instanced; one coin = 25 pesetas), collectibles by kind (Ole's gadgets, shark
// fins, mission items) and runaway "rabbits" (beach balls, sheep, flowers, piglets).

import { THREE, GeoBuilder, toonMesh, MAT, outlineGeometry, outlineMat, mat, PRIM, textCanvas, toonGradient } from '../gfx.js';
import { groundAt, queryBlocks, circleVsBlock, topAt, RAMP } from '../world/collision.js';
import { CURB } from '../world/layout.js';
import { yawTo, mulberry32 } from '../util.js';

const _fr = {};
function frustumGeo(k, n = 10) { return (_fr[k] ??= new THREE.CylinderGeometry(0.5 * k, 0.5, 1, n)); }

// ---------------------------------------------------------------------------------------------
// Coins

const MAXC = 500;
export const COIN_VALUE = 25;
let coinMesh, coinOutline;
export const coins = [];
const _m = new THREE.Matrix4(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);

export function initCoins(scene) {
  const g = new GeoBuilder();
  g.cyl(0xffc928, 0, 0, 0, 0.34, 0.08, 18, Math.PI / 2);
  g.cyl(0xffe27a, 0, 0, 0, 0.22, 0.1, 14, Math.PI / 2);
  g.box(0xd89a1a, 0, 0, 0, 0.06, 0.26, 0.11);
  const geo = g.build();
  coinMesh = new THREE.InstancedMesh(geo, MAT.toon, MAXC);
  coinMesh.frustumCulled = false;
  coinOutline = new THREE.InstancedMesh(outlineGeometry(geo), outlineMat(0.02), MAXC);
  coinOutline.instanceMatrix = coinMesh.instanceMatrix;
  coinOutline.frustumCulled = false;
  for (let i = 0; i < MAXC; i++) {
    coinMesh.setMatrixAt(i, _zero);
    coins.push({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, fixed: false, settle: 0, value: 1 });
  }
  scene.add(coinMesh, coinOutline);
}

function freeCoin() {
  for (let i = 0; i < MAXC; i++) if (!coins[i].active) return coins[i];
  // Recycle the oldest loose coin.
  let best = null;
  for (const c of coins) if (!c.fixed && (!best || c.life < best.life)) best = c;
  return best;
}

export function placeCoin(x, y, z) {
  const c = freeCoin();
  if (!c) return;
  Object.assign(c, { active: true, fixed: true, x, y, z, vx: 0, vy: 0, vz: 0, life: Infinity, settle: 1, value: COIN_VALUE });
}

export function burstCoins(x, y, z, n, vx = 0, vz = 0) {
  for (let k = 0; k < n; k++) {
    const c = freeCoin();
    if (!c) return;
    const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3;
    Object.assign(c, { active: true, fixed: false, x, y: y + 0.5, z, vx: vx * 0.3 + Math.cos(a) * s, vz: vz * 0.3 + Math.sin(a) * s, vy: 5 + Math.random() * 4, life: 25, settle: 0, value: COIN_VALUE });
  }
}

const _bl = [], _h = {};
export function tickCoins(dt, t, collector, game) {
  const cx = collector.x, cy = collector.y, cz = collector.z, cr = collector.r;
  const spin = t * 3;
  for (let i = 0; i < MAXC; i++) {
    const c = coins[i];
    if (!c.active) continue;
    if (!c.fixed) {
      c.life -= dt;
      if (c.life <= 0) { c.active = false; coinMesh.setMatrixAt(i, _zero); continue; }
      if (c.settle < 1) {
        c.vy -= 20 * dt;
        c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
        queryBlocks(c.x - 0.3, c.z - 0.3, c.x + 0.3, c.z + 0.3, _bl);
        for (const b of _bl) {
          const top = b.shape === RAMP ? topAt(b, c.x, c.z) : b.top;
          if (top < c.y || !circleVsBlock(c.x, c.z, 0.3, b, _h)) continue;
          c.x += _h.nx * _h.depth; c.z += _h.nz * _h.depth;
          c.vx *= -0.4; c.vz *= -0.4;
        }
        const g = groundAt(c.x, c.z, c.y, 0.3) + 0.45;
        if (c.y < g) { c.y = g; c.vy = Math.abs(c.vy) * 0.4; c.vx *= 0.6; c.vz *= 0.6; if (c.vy < 1.2) { c.settle = 1; c.vy = 0; } }
      }
    }
    // Magnet and collect.
    const dx = cx - c.x, dz = cz - c.z, dy = cy + 0.8 - c.y;
    const d2 = dx * dx + dz * dz;
    if (d2 < (cr + 3) * (cr + 3) && Math.abs(dy) < 3.5 && (c.fixed || c.settle || c.life < 24.4)) {
      const d = Math.sqrt(d2) || 0.01;
      if (d < cr + 0.6 && Math.abs(dy) < 2.2) {
        c.active = false;
        coinMesh.setMatrixAt(i, _zero);
        game.collectCoin(c);
        continue;
      }
      const pull = 14 * dt;
      c.x += (dx / d) * pull; c.z += (dz / d) * pull; c.y += dy * Math.min(1, pull * 0.4);
    }
    const bob = c.fixed ? Math.sin(t * 2.5 + i) * 0.1 : 0;
    _m.makeRotationY(spin + i * 0.3);
    _m.setPosition(c.x, c.y + bob, c.z);
    coinMesh.setMatrixAt(i, _m);
  }
  coinMesh.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------
// Collectibles by kind (DESIGN §14.6). Each kind: { build(id) -> Object3D, motion, beam?, scale? };
// motion: 'spin' | 'circle' (r 1.2 around the spot) | 'bob' | 'roll' (moved by its owner) | 'none'.
// Geometry is built once per kind/variant and shared; each Collectible gets its own mesh.

const _kindGeo = {};
function shared(key, fn, outline = 0.03) {
  let c = _kindGeo[key];
  if (!c) {
    const g = new GeoBuilder();
    fn(g);
    const geo = g.build();
    c = _kindGeo[key] = { geo, out: outline ? outlineGeometry(geo) : null, outline };
  }
  const mesh = new THREE.Mesh(c.geo, MAT.toon);
  mesh.castShadow = true;
  if (c.out) { const o = new THREE.Mesh(c.out, outlineMat(c.outline)); o.name = 'outline'; mesh.add(o); }
  return mesh;
}
function geoMesh(fn, outline = 0.03) { const g = new GeoBuilder(); fn(g); return toonMesh(g.build(), { outline }); }

// A painted label on a pack or a suitcase: one shared texture per text.
const _labels = {};
function label(text, w, h, opts) {
  const key = `${text}|${w}|${h}`;
  let c = _labels[key];
  if (!c) {
    const tex = new THREE.CanvasTexture(textCanvas(text, w, h, { scale: 0.7, ppm: 160, ...opts }));
    tex.colorSpace = THREE.SRGBColorSpace;
    c = _labels[key] = { geo: new THREE.PlaneGeometry(w, h), mat: new THREE.MeshToonMaterial({ map: tex, gradientMap: toonGradient() }) };
  }
  return new THREE.Mesh(c.geo, c.mat);
}

const INK = 0x1d1426, CHROME = 0xd8dce0;
// Ole's seven gadgets (COLLECTIBLES.prylar ids), oversized so they read from the street.
const PRYL = {
  klocka(g) {     // digital + analog wristwatch: steel case, red LED digits, a strap loop
    for (const sy of [-1, 1]) { g.box(0x2a2a30, 0, sy * 0.36, -0.06, 0.3, 0.32, 0.05, 0, sy * -0.45); g.box(0x2a2a30, 0, sy * 0.5, -0.26, 0.3, 0.05, 0.3, 0, sy * -0.2); }
    g.box(CHROME, 0, -0.52, -0.16, 0.32, 0.06, 0.06);
    g.box(CHROME, 0, 0, 0, 0.5, 0.5, 0.16);
    g.box(0x1d1d22, 0, 0.04, 0.085, 0.4, 0.22, 0.02);
    for (let k = 0; k < 4; k++) g.box(0xff3a2a, -0.13 + k * 0.085, 0.04, 0.1, 0.05, 0.12, 0.01);
    g.cyl(0xf4f0e6, 0, -0.14, 0.085, 0.08, 0.02, 12, Math.PI / 2);
    for (const x of [-0.27, 0.27]) g.box(0xc8ccd2, x, 0.1, 0, 0.05, 0.06, 0.06);
  },
  poolpen(g) {    // "Penn som skriver under vannet": a fat blue pen with a chrome clip, bubbles at the tip
    const rz = 0.6, dx = -Math.sin(rz), dy = Math.cos(rz);
    g.cyl(0x2f6ad8, 0, 0, 0, 0.065, 0.8, 12, 0, 0, rz);
    g.cone(0xd8dce0, -dx * 0.48, -dy * 0.48, 0, 0.065, 0.16, 10, 0, 0, rz + Math.PI);
    g.cyl(0xf4f4f0, dx * 0.3, dy * 0.3, 0, 0.075, 0.24, 12, 0, 0, rz);
    g.box(CHROME, dx * 0.24, dy * 0.24, 0.085, 0.03, 0.3, 0.02, 0, 0, rz);
    for (let k = 0; k < 4; k++) g.sphere(0x9ad0f0, -dx * 0.6 + 0.1 + k * 0.05, -dy * 0.6 + 0.05 + k * 0.13, 0, 0.09 - k * 0.015);
  },
  kalkylator(g) { // calculator with an alarm clock: beige body, green display, button grid, a bell
    g.box(0xe8dcc0, 0, 0, 0, 0.5, 0.7, 0.1);
    g.box(0x1d2a1d, 0, 0.22, 0.055, 0.4, 0.14, 0.02);
    for (let k = 0; k < 5; k++) g.box(0x7aff8a, -0.14 + k * 0.07, 0.22, 0.068, 0.04, 0.08, 0.005);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) g.box(r === 3 && c === 3 ? 0xf07a1e : 0x3a3a40, -0.15 + c * 0.1, 0.04 - r * 0.09, 0.06, 0.07, 0.06, 0.03);
    g.add(PRIM.dome(), 0xd8a83a, mat(0, 0.36, -0.02, 0, 0, 0, 0.2, 0.18, 0.2));
  },
  kniv(g) {       // Swiss Army knife: red body, white cross, blade, scissors, corkscrew out
    g.box(0xd8321e, 0, 0, 0, 0.62, 0.2, 0.12);
    for (const x of [-0.31, 0.31]) g.cyl(0xd8321e, x, 0, 0, 0.1, 0.12, 12, Math.PI / 2);
    g.box(0xf4f4f0, -0.1, 0, 0.065, 0.12, 0.04, 0.01); g.box(0xf4f4f0, -0.1, 0, 0.065, 0.04, 0.12, 0.01);
    g.box(CHROME, 0.42, 0.2, 0, 0.5, 0.09, 0.02, 0, 0, 0.5);
    g.box(CHROME, -0.35, 0.22, 0.02, 0.3, 0.05, 0.02, 0, 0, -0.9);
    g.box(CHROME, -0.28, 0.24, -0.02, 0.3, 0.05, 0.02, 0, 0, -1.2);
    g.cone(CHROME, 0.2, 0.25, 0.0, 0.03, 0.3, 6);
  },
  kamera(g) {     // "Kamera. Skjerpe. Smil.": a black/chrome 35 mm with a flash cube
    g.box(0x2a2a30, 0, 0, 0, 0.6, 0.36, 0.2);
    g.box(CHROME, 0, 0.12, 0, 0.6, 0.12, 0.21);
    g.cyl(INK, 0.04, -0.02, 0.18, 0.15, 0.2, 16, Math.PI / 2);
    g.cyl(0x6a8ab8, 0.04, -0.02, 0.29, 0.1, 0.02, 14, Math.PI / 2);
    g.box(0xf4f4f0, -0.2, 0.3, 0, 0.14, 0.14, 0.14);
    g.box(CHROME, 0.2, 0.22, 0, 0.08, 0.06, 0.08);
  },
  glasogon(g) {   // "Mot klor": swimming goggles with a strap
    for (const x of [-0.2, 0.2]) { g.cyl(0x2fb8a8, x, 0, 0, 0.17, 0.1, 16, Math.PI / 2); g.cyl(0xbfe6ff, x, 0, 0.055, 0.13, 0.02, 14, Math.PI / 2); }
    g.box(0x1d1d22, 0, 0, 0, 0.12, 0.04, 0.04);
    g.add(PRIM.torus(), 0x1d1d22, mat(0, 0, -0.18, Math.PI / 2, 0, 0, 0.9, 0.62, 0.3));
  },
  pung(g) {       // "Å ha penger i når man svømmer": a waterproof money pouch on a cord
    g.sphere(0xf7c31b, 0, 0, 0, 0.5, 0.42, 0.18);
    g.box(0xf07a1e, 0, 0.13, 0.06, 0.4, 0.04, 0.04);
    g.box(INK, 0.15, 0.13, 0.085, 0.05, 0.06, 0.02);
    g.add(PRIM.torus(), 0x2a2a30, mat(0, 0.3, 0, 0, 0, 0, 0.6, 0.6, 0.3));
    g.cyl(0x3a8a3a, -0.1, -0.05, 0.09, 0.07, 0.02, 10, Math.PI / 2);
  },
};
const PRYL_IDS = Object.keys(PRYL);

function fin(g) {        // inflatable shark fin on a float ring
  const F = 0x6a8aa8, B = 0xe8eef4;
  g.add(PRIM.prism(), F, mat(0, 0.0, -0.05, 0, 0, 0, 0.16, 0.95, 1.0));
  g.sphere(F, 0, 0.42, -0.2, 0.18, 0.9, 0.5, -0.45);
  g.box(B, 0, 0.12, 0.05, 0.19, 0.08, 0.9);
  g.sphere(0x1d1426, 0.09, 0.28, 0.3, 0.03, 0.03, 0.03);
  g.add(PRIM.torus(), 0x1c7fb8, mat(0, -0.02, 0, Math.PI / 2, 0, 0, 1.3, 1.3, 0.35));
  g.add(PRIM.torus(), 0xffffff, mat(0, -0.03, 0, Math.PI / 2, 0, 0, 1.7, 1.7, 0.25));
}

export const COLLECT_KINDS = {
  pryl: { motion: 'spin', beam: true, build: (id) => shared('pryl_' + (PRYL[id] ? id : 'klocka'), PRYL[id] || PRYL.klocka) },
  fena: { motion: 'circle', build: () => shared('fena', fin, 0.025) },
  // A rolling liquor bottle (axis along z, so it rolls across the aisle when turned).
  flaska: { motion: 'roll', build: () => shared('flaska', (g) => {
    g.cyl(0x4a7a3a, 0, 0, 0, 0.12, 0.34, 12, Math.PI / 2);
    g.sphere(0x4a7a3a, 0, 0, 0.17, 0.24, 0.24, 0.16);
    g.cyl(0x4a7a3a, 0, 0, 0.27, 0.045, 0.14, 8, Math.PI / 2);
    g.cyl(0xd8a83a, 0, 0, 0.35, 0.05, 0.04, 8, Math.PI / 2);
    g.cyl(0xf4f0e6, 0, 0, -0.02, 0.124, 0.16, 12, Math.PI / 2);
    g.cyl(0xd8321e, 0, 0, -0.02, 0.126, 0.04, 12, Math.PI / 2);
  }, 0.02) },
  // Juice in a plastic cup on a little SunTrip tray (carried over the head).
  juice: { motion: 'none', build: () => shared('juice', (g) => {
    g.box(0x9a9a92, 0, -0.02, 0, 0.34, 0.03, 0.26);
    g.add(PRIM.cyl(12), 0xf4f4f0, mat(0, 0.1, 0, 0, 0, 0, 0.17, 0.22, 0.17));
    g.cyl(0xf7a21b, 0, 0.2, 0, 0.078, 0.02, 12);
    g.cyl(0xf07a1e, 0, 0.12, 0, 0.087, 0.05, 12);
    g.cyl(0xd8321e, 0.03, 0.27, 0, 0.012, 0.22, 6, 0, 0, -0.3);
  }, 0.015) },
  // A SPORT-KNÄCKE crispbread pack (the one with the money in it), label on both faces.
  knacke: { motion: 'spin', beam: true, build: () => {
    const m = shared('knacke', (g) => {
      g.box(0xe8b04a, 0, 0, 0, 0.62, 0.42, 0.16);
      g.box(0xd8321e, 0, 0.16, 0, 0.63, 0.08, 0.165);
      g.box(0xc89040, 0, -0.18, 0, 0.63, 0.04, 0.165);
    });
    for (const side of [1, -1]) { const l = label('SPORT-\nKNÄCKE', 0.54, 0.26, { bg: '#e8b04a', fg: '#d8321e', border: null }); l.position.set(0, -0.02, side * 0.083); l.rotation.y = side > 0 ? 0 : Math.PI; m.add(l); }
    return m;
  } },
  // The souvenir donkey, painted like a dalahäst: red, white bridle, flower garland on the saddle.
  asna: { motion: 'spin', beam: true, build: () => shared('asna', (g) => {
    const Rd = 0xd8321e, W = 0xf4f0e6, Y = 0xf7c31b, G = 0x3f7a3a, B = 0x2f6ad8;
    g.sphere(Rd, 0, 0.45, 0, 0.36, 0.34, 0.66);
    for (const x of [-0.09, 0.09]) for (const z of [-0.2, 0.2]) g.add(frustumGeo(0.8), Rd, mat(x, 0.18, z, 0, 0, 0, 0.12, 0.34, 0.12));
    g.box(Rd, 0, 0.66, 0.3, 0.16, 0.34, 0.16, 0, -0.5);
    g.box(Rd, 0, 0.84, 0.44, 0.18, 0.18, 0.32, 0, 0.25);
    for (const x of [-0.05, 0.05]) g.cone(Rd, x, 1.04, 0.36, 0.05, 0.3, 5, -0.2, 0, x * 3);
    g.cone(INK, 0, 0.62, -0.36, 0.04, 0.22, 5, -2.4);
    // Dalahäst painting: white bridle, a saddle cloth with a flower garland.
    g.box(W, 0, 0.86, 0.48, 0.19, 0.04, 0.2, 0, 0.25);
    g.box(W, 0, 0.82, 0.36, 0.19, 0.2, 0.03, 0, -0.4);
    g.box(B, 0, 0.62, 0, 0.37, 0.12, 0.34);
    for (let k = 0; k < 5; k++) for (const sx of [-1, 1]) {
      g.sphere(k % 2 ? Y : W, sx * 0.17, 0.52 - (k % 2) * 0.04, -0.2 + k * 0.1, 0.03, 0.08, 0.08);
      g.sphere(G, sx * 0.175, 0.44, -0.2 + k * 0.1 + 0.05, 0.02, 0.05, 0.03);
    }
    for (const sx of [-1, 1]) g.sphere(INK, sx * 0.08, 0.9, 0.56, 0.03);
    g.box(0x6a4a2a, 0, 0.01, 0, 0.32, 0.03, 0.62);
  }) },
  // Stig-Helmer's lost suitcase: brown, straps, a handle, travel stickers (green-white for Hammarby).
  vaska: { motion: 'spin', beam: true, build: () => shared('vaska', (g) => {
    g.box(0x8a5a3a, 0, 0, 0, 0.8, 0.56, 0.26);
    for (const x of [-0.22, 0.22]) g.box(0x5a3a22, x, 0, 0, 0.06, 0.57, 0.27);
    g.box(0x3a2a1e, 0, 0.32, 0, 0.26, 0.06, 0.06);
    for (const x of [-0.14, 0.14]) g.box(0x3a2a1e, x, 0.3, 0, 0.04, 0.06, 0.06);
    for (const x of [-0.36, 0.36]) for (const y of [-0.25, 0.25]) g.box(CHROME, x, y, 0, 0.06, 0.06, 0.28);
    g.box(0x3f9a5a, -0.05, 0.08, 0.135, 0.18, 0.12, 0.01);
    g.box(0xf4f4f0, -0.05, 0.08, 0.137, 0.18, 0.04, 0.01);
    g.cyl(0xf7c31b, 0.1, -0.12, 0.136, 0.07, 0.01, 12, Math.PI / 2);
    g.box(0xd8321e, -0.08, -0.14, 0.135, 0.14, 0.09, 0.01, 0, 0, 0.2);
  }) },
  // The plastic giraffe (Majsan's present).
  giraff: { motion: 'spin', beam: true, build: () => shared('giraff', (g) => {
    const Y = 0xf2c12e, Br = 0x9a5a22;
    g.sphere(Y, 0, 0.55, 0, 0.36, 0.3, 0.6);
    for (const x of [-0.1, 0.1]) for (const z of [-0.18, 0.18]) g.cyl(Y, x, 0.22, z, 0.035, 0.44, 6);
    for (const x of [-0.1, 0.1]) for (const z of [-0.18, 0.18]) g.cyl(Br, x, 0.02, z, 0.04, 0.04, 6);
    g.cyl(Y, 0, 0.92, 0.26, 0.05, 0.62, 8, 0.4);
    g.sphere(Y, 0, 1.22, 0.4, 0.16, 0.15, 0.26);
    for (const x of [-0.04, 0.04]) { g.cyl(Br, x, 1.34, 0.36, 0.015, 0.1, 5); g.sphere(Br, x, 1.39, 0.36, 0.04); }
    for (const x of [-0.08, 0.08]) g.cone(Y, x, 1.3, 0.32, 0.03, 0.1, 5, 0, 0, x * 8);
    g.sphere(Br, 0, 1.2, 0.53, 0.09, 0.07, 0.06);
    for (const x of [-0.06, 0.06]) g.sphere(INK, x, 1.27, 0.48, 0.03);
    const r = mulberry32(5);
    for (let k = 0; k < 12; k++) { const a = r() * Math.PI * 2, y = 0.45 + r() * 0.22; g.sphere(Br, Math.sin(a) * 0.17, y, Math.cos(a) * 0.26 * (0.4 + r() * 0.6), 0.08, 0.08, 0.08); }
    for (let k = 0; k < 4; k++) g.sphere(Br, 0, 0.75 + k * 0.12, 0.17 + k * 0.05, 0.06, 0.06, 0.06);
    g.cone(Y, 0, 0.5, -0.34, 0.03, 0.22, 5, -2.0);
    g.sphere(Br, 0, 0.42, -0.44, 0.05);
  }) },
};
export function registerCollectKind(kind, def) { COLLECT_KINDS[kind] = def; }

export class Collectible {
  // opts: { motion, beam, scale }
  constructor(scene, kind, id, x, y, z, opts = {}) {
    this.kind = kind; this.id = id; this.x = x; this.y = y; this.z = z;
    this.alive = true;
    const def = COLLECT_KINDS[kind];
    this.motion = opts.motion ?? def?.motion ?? 'spin';
    this.mesh = def ? def.build(id) : geoMesh((g) => g.box(0xffd23f, 0, 0, 0, 0.6, 0.6, 0.6));
    const sc = opts.scale ?? def?.scale;
    if (sc) this.mesh.scale.setScalar(sc);
    this.mesh.position.set(x, y, z);
    if (opts.beam ?? def?.beam) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe7b8, transparent: true, opacity: 0.2, depthWrite: false }));
      beam.position.y = 3;
      this.mesh.add(beam);
    }
    this.scene = scene;
    scene.add(this.mesh);
    this.ph = Math.random() * 6;
  }
  tick(t, dt) {
    if (!this.alive) return;
    const p = this.mesh.position;
    if (this.motion === 'spin') { this.mesh.rotation.y = t * 1.8; p.y = this.y + Math.sin(t * 2 + this.ph) * 0.15; }
    else if (this.motion === 'bob') p.y = this.y + Math.sin(t * 2.4 + this.ph) * 0.2;
    else if (this.motion === 'circle') {
      const a = t * 0.9 + this.ph;
      p.set(this.x + Math.cos(a) * 1.2, this.y, this.z + Math.sin(a) * 1.2);
      this.mesh.rotation.y = -a;
    }
    // 'roll' and 'none': the owner moves the mesh (and this.x/z).
  }
  // Current world position of the mesh (circling/bobbing items move around their spot).
  get px() { return this.mesh.position.x; }
  get pz() { return this.mesh.position.z; }
  remove() {
    this.alive = false;
    this.mesh.visible = false;
  }
}

// ---------------------------------------------------------------------------------------------
// "Rabbits": hop about and bolt from you (flee), or sit and bob (flee: false). Meshes (built from
// y = 0, facing +z): badboll (beach ball), faar (sheep), blomma (a clump of flowers), gris (piglet).

const _gore = [];
function gore(i) { return (_gore[i] ??= new THREE.SphereGeometry(0.5, 4, 12, (i / 6) * Math.PI * 2, Math.PI / 3)); }
const RABBIT_MESHES = {
  badboll: (g) => {
    const cols = [0xd8321e, 0xf4f4f0, 0x2f6ad8, 0xf7c31b, 0xf4f4f0, 0x3f9a5a];
    for (let i = 0; i < 6; i++) g.add(gore(i), cols[i], mat(0, 0.45, 0, 0.3, 0, 0.2, 0.9, 0.9, 0.9));
    for (const s of [-1, 1]) g.sphere(0xf4f4f0, Math.sin(0.2) * -s * 0.43, 0.45 + s * 0.41, Math.sin(0.3) * s * 0.12, 0.18, 0.08, 0.18, 0.3, 0, 0.2);
  },
  faar: (g) => {
    const W = 0xf4f0e6, D = 0x2a2a2a;
    const r = mulberry32(31);
    g.sphere(W, 0, 0.62, 0, 0.8, 0.62, 1.0);
    for (let k = 0; k < 14; k++) { const a = r() * Math.PI * 2, b = r() * 1.2; g.sphere(W, Math.sin(a) * 0.32 * Math.cos(b), 0.62 + Math.sin(b) * 0.26, Math.cos(a) * 0.42, 0.36, 0.36, 0.36, 0, 0, 0, 8); }
    g.sphere(D, 0, 0.78, 0.55, 0.3, 0.34, 0.42, 0.3);
    g.sphere(W, 0, 0.94, 0.48, 0.3, 0.2, 0.26);
    for (const s of [-1, 1]) { g.sphere(D, s * 0.2, 0.84, 0.5, 0.22, 0.08, 0.12, 0, 0, s * 0.4); g.sphere(0xffffff, s * 0.09, 0.84, 0.72, 0.08); g.sphere(0x1d1426, s * 0.09, 0.84, 0.75, 0.04); }
    for (const x of [-0.2, 0.2]) for (const z of [-0.3, 0.3]) g.cyl(D, x, 0.17, z, 0.06, 0.34, 6);
    g.sphere(W, 0, 0.7, -0.52, 0.22);
  },
  blomma: (g) => {   // a clump of flowers, ~1.2 m tall so it reads across a garden
    const G = 0x3f7a3a, K = 1.5;
    const g0 = g;
    g = { sphere: (c, x, y, z, ...r) => g0.sphere(c, x * K, y * K, z * K, ...r.slice(0, 3).map((v) => v * K), ...r.slice(3)), cyl: (c, x, y, z, rad, h, ...r) => g0.cyl(c, x * K, y * K, z * K, rad * K, h * K, ...r) };
    for (let k = 0; k < 5; k++) { const a = k * 1.26; g.sphere(G, Math.cos(a) * 0.12, 0.08, Math.sin(a) * 0.12, 0.22, 0.12, 0.34, 0, a, 0); }
    const heads = [[0, 0.78, 0, 0xc2307a], [-0.2, 0.62, 0.1, 0xd8321e], [0.2, 0.55, -0.08, 0xf7c31b]];
    for (const [x, y, z, c] of heads) {
      g.cyl(G, x / 2, y / 2, z / 2, 0.025, y, 5, z * 0.5, 0, -x * 0.5);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.sphere(c, x + Math.cos(a) * 0.1, y, z + Math.sin(a) * 0.1, 0.14, 0.06, 0.14, 0, -a, 0, 8); }
      g.sphere(c === 0xf7c31b ? 0xf07a1e : 0xffd23f, x, y + 0.03, z, 0.09);
    }
    g.sphere(G, 0.1, 0.3, 0.05, 0.16, 0.04, 0.08, 0, 0.5, 0.4);
    g.sphere(G, -0.08, 0.36, -0.04, 0.16, 0.04, 0.08, 0, -0.6, -0.4);
  },
  gris: (g) => {
    const P = 0xf4a8b8, D = 0xe0889a;
    g.sphere(P, 0, 0.36, 0, 0.56, 0.46, 0.8);
    g.sphere(P, 0, 0.44, 0.38, 0.4, 0.36, 0.36);
    g.cyl(D, 0, 0.4, 0.58, 0.09, 0.08, 10, Math.PI / 2);
    for (const s of [-1, 1]) { g.sphere(INK, s * 0.04, 0.4, 0.62, 0.025); g.cone(D, s * 0.13, 0.62, 0.34, 0.07, 0.16, 4, 0.4, 0, s * -0.4); g.sphere(INK, s * 0.09, 0.5, 0.53, 0.045); }
    for (const x of [-0.14, 0.14]) for (const z of [-0.22, 0.24]) g.cyl(D, x, 0.1, z, 0.06, 0.2, 6);
    g.add(PRIM.torus(), D, mat(0, 0.42, -0.42, 0, Math.PI / 2, 0, 0.14, 0.14, 0.14));
  },
};
const rabbitGeos = {};
export class Rabbit {
  constructor(scene, x, z, { mesh = 'badboll', flee = true } = {}) {
    if (!rabbitGeos[mesh]) {
      const g = new GeoBuilder();
      (RABBIT_MESHES[mesh] || RABBIT_MESHES.badboll)(g);
      rabbitGeos[mesh] = g.build();
    }
    this.flee = flee;
    this.mesh = toonMesh(rabbitGeos[mesh], { outline: 0.02 });
    this.x = x; this.z = z; this.y = groundAt(x, z, 0.2, 0.6); this.vy = 0; this.vx = 0; this.vz = 0;
    this.hopT = Math.random();
    this.alive = true;
    this.yaw = Math.random() * 6;
    this.home = [x, z];
    scene.add(this.mesh);
  }
  update(dt, px, pz) {
    if (!this.alive) return;
    if (!this.flee) {
      // Static and bobbing.
      this.y = groundAt(this.x, this.z, this.y + 0.5, 0.5);
      this.mesh.position.set(this.x, this.y + Math.abs(Math.sin(performance.now() / 300 + this.hopT * 6)) * 0.25, this.z);
      return;
    }
    const g = groundAt(this.x, this.z, this.y + 0.5, 0.5);
    const onGround = this.y <= g + 0.01;
    if (onGround) {
      this.y = g; this.vy = 0;
      this.hopT -= dt;
      // Guard d = 0 (someone standing exactly on it): flee along +x instead of NaN.
      const dx = this.x - px, dz = this.z - pz, d0 = Math.hypot(dx, dz), d = Math.max(d0, 1e-3);
      if (this.hopT <= 0) {
        let ax, az, sp;
        if (d < 7) { ax = d0 > 1e-3 ? dx / d : 1; az = d0 > 1e-3 ? dz / d : 0; sp = 5.2; this.hopT = 0.05; }
        else {
          const hx = this.home[0] - this.x, hz = this.home[1] - this.z, hd = Math.hypot(hx, hz);
          const a = Math.random() * Math.PI * 2;
          ax = Math.cos(a) + (hd > 12 ? hx / hd * 2 : 0); az = Math.sin(a) + (hd > 12 ? hz / hd * 2 : 0);
          const l = Math.hypot(ax, az); ax /= l; az /= l;
          sp = 2.5; this.hopT = 0.4 + Math.random() * 1.2;
        }
        // Wiggle so they don't flee in a perfectly straight line.
        const w = (Math.random() - 0.5) * 1.2;
        const c = Math.cos(w), s = Math.sin(w);
        this.vx = (ax * c - az * s) * sp; this.vz = (ax * s + az * c) * sp; this.vy = 4.5;
        this.yaw = yawTo(this.vx, this.vz);
      } else { this.vx = 0; this.vz = 0; }
    }
    this.vy -= 18 * dt;
    const nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    queryBlocks(nx - 0.4, nz - 0.4, nx + 0.4, nz + 0.4, _bl);
    let blocked = false;
    for (const b of _bl) { const top = b.shape === RAMP ? topAt(b, nx, nz) : b.top; if (top > this.y + 0.5 && circleVsBlock(nx, nz, 0.35, b, _h)) { blocked = true; break; } }
    if (!blocked) { this.x = nx; this.z = nz; } else { this.vx = -this.vx; this.vz = -this.vz; }
    this.y = Math.max(groundAt(this.x, this.z, this.y + 0.5, 0.5), this.y + this.vy * dt);
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.yaw;
    const st = onGround ? 1 : 1.15;
    this.mesh.scale.set(2 - st, st, 2 - st);
  }
  remove(scene) {
    this.alive = false;
    scene.remove(this.mesh);
  }
}
