// Breakable street furniture: mailboxes, bins, hydrants, flamingos, fences... Each type is one
// instanced mesh. Smash one with a car or a kick and it bursts into debris and coins.

import { THREE, GeoBuilder, MAT, outlineGeometry, outlineMat, mat } from '../gfx.js';
import { box, circle } from './collision.js';

const TYPES = {
  mailbox: {
    r: 0.32, top: 1.3, coins: 2, shame: 1, color: 0x2a5bd7,
    build(g) { g.boxB(0x6b4a2a, 0, 0, 0, 0.14, 1.0, 0.14); g.box(0x2a5bd7, 0, 1.12, 0, 0.42, 0.34, 0.62); g.sphere(0x2a5bd7, 0, 1.28, 0, 0.42, 0.22, 0.62); g.box(0xe23b2e, 0.24, 1.25, -0.1, 0.04, 0.26, 0.08); },
  },
  trashcan: {
    r: 0.38, top: 1.05, coins: 1, shame: 1, color: 0x4f7a54,
    build(g) { g.cyl(0x4f7a54, 0, 0.5, 0, 0.36, 1.0, 12); g.cyl(0x3a5c3e, 0, 1.04, 0, 0.4, 0.1, 12); g.box(0x2a3a2c, 0, 1.12, 0, 0.3, 0.06, 0.08); },
  },
  hydrant: {
    r: 0.3, top: 0.85, coins: 3, shame: 2, minSpeed: 6, color: 0xe2382b,
    build(g) { g.cyl(0xe2382b, 0, 0.35, 0, 0.18, 0.7, 10); g.sphere(0xe2382b, 0, 0.72, 0, 0.36, 0.3, 0.36); g.cyl(0xf1d54a, 0, 0.78, 0, 0.06, 0.12, 8); g.cyl(0xe2382b, 0, 0.42, 0, 0.07, 0.56, 8, 0, 0, Math.PI / 2); },
  },
  newsbox: {
    w: 0.55, d: 0.5, top: 1.15, coins: 3, shame: 1, color: 0xf1c232,
    build(g) { g.boxB(0xf1c232, 0, 0.35, 0, 0.55, 0.75, 0.5); g.boxB(0x333333, 0, 0, 0, 0.08, 0.35, 0.08); g.box(0xdde8ee, 0, 0.82, 0.26, 0.38, 0.25, 0.02); },
  },
  flamingo: {
    r: 0.25, top: 1.0, coins: 1, shame: 1, color: 0xff6fa5,
    build(g) { g.cyl(0x333333, 0, 0.3, 0, 0.015, 0.6, 5); g.sphere(0xff6fa5, 0, 0.7, 0, 0.32, 0.22, 0.45); g.cyl(0xff6fa5, 0, 0.88, 0.16, 0.035, 0.3, 6, 0.3); g.sphere(0xff6fa5, 0, 1.04, 0.22, 0.12); g.cone(0x222222, 0, 1.0, 0.33, 0.035, 0.12, 6, Math.PI / 2 + 0.4); },
  },
  gnome: {
    r: 0.25, top: 0.65, coins: 2, shame: 1, color: 0x3a6ad1,
    build(g) { g.cyl(0x3a6ad1, 0, 0.18, 0, 0.16, 0.36, 10); g.sphere(0xf2c9a0, 0, 0.42, 0, 0.2); g.sphere(0xffffff, 0, 0.33, 0.08, 0.2, 0.18, 0.12); g.cone(0xe23b2e, 0, 0.62, 0, 0.12, 0.3, 10); },
  },
  fence: {
    w: 2.5, d: 0.16, top: 1.35, coins: 0, shame: 1, minSpeed: 2, color: 0xe9dcc1,
    build(g) {
      for (let k = 0; k < 6; k++) { g.boxB(0xf3ead8, -1.04 + k * 0.415, 0, 0, 0.3, 1.2, 0.06); g.cone(0xf3ead8, -1.04 + k * 0.415, 1.25, 0, 0.21, 0.14, 4, 0, Math.PI / 4); }
      g.box(0xe0d3b6, 0, 0.35, -0.05, 2.5, 0.12, 0.05); g.box(0xe0d3b6, 0, 0.95, -0.05, 2.5, 0.12, 0.05);
    },
  },
  woodfence: {
    w: 2.5, d: 0.16, top: 1.8, coins: 0, shame: 1, minSpeed: 2, color: 0xa87a4c,
    build(g) {
      for (let k = 0; k < 5; k++) g.boxB(k % 2 ? 0xb3845a : 0xa87a4c, -1.0 + k * 0.5, 0, 0, 0.48, 1.75, 0.07);
      g.box(0x8a5e38, 0, 0.5, -0.06, 2.5, 0.12, 0.05); g.box(0x8a5e38, 0, 1.4, -0.06, 2.5, 0.12, 0.05);
    },
  },
  cone: {
    r: 0.28, top: 0.75, coins: 1, shame: 0, minSpeed: 1, color: 0xff7a1a,
    build(g) { g.boxB(0xff7a1a, 0, 0, 0, 0.5, 0.06, 0.5); g.cone(0xff7a1a, 0, 0.4, 0, 0.2, 0.7, 10); g.cyl(0xffffff, 0, 0.38, 0, 0.13, 0.12, 10); },
  },
  crate: {
    w: 1.2, d: 1.2, top: 1.2, coins: 2, shame: 0, minSpeed: 5, color: 0xc08a4a,
    build(g) { g.boxB(0xc08a4a, 0, 0, 0, 1.2, 1.2, 1.2); g.box(0x8f6232, 0, 0.6, 0.61, 1.2, 0.16, 0.02, 0, 0, 0.78); g.box(0x8f6232, 0, 0.6, -0.61, 1.2, 0.16, 0.02, 0, 0, -0.78); },
  },
  bench: {
    w: 1.9, d: 0.7, top: 0.55, coins: 1, shame: 1, minSpeed: 4, color: 0x7a5232,
    build(g) {
      g.boxB(0x333333, -0.8, 0, 0, 0.08, 0.45, 0.6); g.boxB(0x333333, 0.8, 0, 0, 0.08, 0.45, 0.6);
      for (let k = 0; k < 3; k++) g.boxB(0x9a6a3e, 0, 0.45, -0.2 + k * 0.2, 1.9, 0.06, 0.16);
      g.box(0x9a6a3e, 0, 0.8, -0.32, 1.9, 0.28, 0.06, 0, -0.15);
    },
  },
  cart: {
    r: 0.45, top: 1.0, coins: 1, shame: 0, minSpeed: 1, color: 0xc7ccd4,
    build(g) {
      g.boxB(0xc7ccd4, 0, 0.35, 0, 0.55, 0.5, 0.85); g.box(0x5a5f66, 0, 0.62, 0, 0.5, 0.04, 0.8);
      g.cyl(0xe23b2e, 0, 0.95, -0.46, 0.03, 0.6, 6, 0, 0, Math.PI / 2);
      for (const sx of [-0.22, 0.22]) for (const sz of [-0.32, 0.32]) g.sphere(0x222222, sx, 0.08, sz, 0.14);
    },
  },
  pump: {
    w: 0.9, d: 0.6, top: 1.9, coins: 12, shame: 6, minSpeed: 5, color: 0xd8321e,
    build(g) {
      g.boxB(0xd8321e, 0, 0, 0, 0.9, 1.7, 0.6); g.box(0xfdf6e3, 0, 1.25, 0.31, 0.6, 0.45, 0.02); g.boxB(0xfdf6e3, 0, 1.7, 0, 0.9, 0.2, 0.6);
      g.cyl(0x222222, 0.5, 1.0, 0, 0.04, 0.9, 6, 0.4);
    },
  },
  vending: {
    w: 1.0, d: 0.8, top: 2.0, coins: 8, shame: 2, minSpeed: 6, color: 0xe2382b,
    build(g) { g.boxB(0xe2382b, 0, 0, 0, 1.0, 2.0, 0.8); g.box(0xbfe6ff, -0.15, 1.2, 0.41, 0.55, 1.1, 0.02); g.box(0xffffff, 0.33, 1.4, 0.41, 0.2, 0.5, 0.02); },
  },
  barrel: {
    r: 0.42, top: 1.05, coins: 2, shame: 0, minSpeed: 4, color: 0x3a7ac8,
    build(g) { g.cyl(0x3a7ac8, 0, 0.52, 0, 0.4, 1.04, 12); g.cyl(0x2a5a98, 0, 0.3, 0, 0.41, 0.08, 12); g.cyl(0x2a5a98, 0, 0.75, 0, 0.41, 0.08, 12); },
  },
  hay: {
    w: 1.6, d: 1.0, top: 1.0, coins: 1, shame: 0, minSpeed: 5, color: 0xe6c35a,
    build(g) { g.boxB(0xe6c35a, 0, 0, 0, 1.6, 1.0, 1.0); g.box(0xb8962e, 0, 0.5, 0, 1.62, 0.08, 1.02); },
  },
  tombstone: {
    w: 1.0, d: 0.35, top: 1.25, coins: 2, shame: 3, minSpeed: 5, color: 0x9a9aa6,
    build(g) { g.boxB(0x9a9aa6, 0, 0, 0, 0.9, 0.95, 0.3); g.cyl(0x9a9aa6, 0, 0.95, 0, 0.45, 0.3, 14, Math.PI / 2); g.boxB(0x6f6f7a, 0, 0, 0, 1.0, 0.12, 0.45); },
  },
};

const placements = []; // { type, x, z, yaw }
export const props = []; // runtime list
let meshes = {};
let debris, debrisState = [];
const DEBRIS = 160;

export function placeProp(type, x, z, yaw = 0) {
  placements.push({ type, x, z, yaw });
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
    // Fences turn by multiples of 90 degrees, so their footprint stays an axis-aligned box.
    if (def.r) prop.block = circle(p.x, p.z, def.r, def.top, 'prop', prop);
    else {
      const turned = Math.abs(Math.sin(p.yaw)) > 0.7;
      const hw = (turned ? def.d : def.w) / 2, hd = (turned ? def.w : def.d) / 2;
      prop.block = box(p.x - hw, p.z - hd, p.x + hw, p.z + hd, def.top, 'prop', prop);
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
  placements.length = 0;
}

function setMatrix(p, show) {
  const m = meshes[p.type];
  if (show) _m.copy(mat(p.x, p.baseY ?? 0.15, p.z, 0, p.yaw, 0));
  else _m.copy(_zero);
  m.im.setMatrixAt(p.idx, _m);
  m.im.instanceMatrix.needsUpdate = true;
}

let debrisNext = 0;
const _c = new THREE.Color();
export function spawnDebris(x, y, z, color, n, vx = 0, vz = 0, power = 1) {
  _c.set(color);
  for (let k = 0; k < n; k++) {
    const i = debrisNext++ % DEBRIS;
    const d = debrisState[i];
    d.t = 1.6 + Math.random() * 0.8;
    d.x = x + (Math.random() - 0.5) * 0.6; d.y = y + Math.random() * 0.6; d.z = z + (Math.random() - 0.5) * 0.6;
    d.vx = vx * 0.6 + (Math.random() - 0.5) * 7 * power;
    d.vz = vz * 0.6 + (Math.random() - 0.5) * 7 * power;
    d.vy = 3 + Math.random() * 6 * power;
    d.s = 0.12 + Math.random() * 0.22;
    d.wx = (Math.random() - 0.5) * 20; d.wy = (Math.random() - 0.5) * 20;
    debris.setColorAt(i, k % 3 === 2 ? _c.clone().multiplyScalar(0.7) : _c);
  }
  debris.instanceColor.needsUpdate = true;
}

// Returns the prop if it broke.
export function breakProp(p, vx = 0, vz = 0, game = null) {
  if (!p.alive) return null;
  p.alive = false;
  p.block.dead = true;
  p.respawn = 75 + Math.random() * 40;
  setMatrix(p, false);
  spawnDebris(p.x, 0.4, p.z, p.def.color, p.type === 'fence' || p.type === 'woodfence' ? 9 : 7, vx, vz);
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
}

export function propsNear(x, z, r) {
  const out = [];
  for (const p of props) if (p.alive && (p.x - x) ** 2 + (p.z - z) ** 2 < (r + (p.def.r || p.def.w / 2)) ** 2) out.push(p);
  return out;
}
