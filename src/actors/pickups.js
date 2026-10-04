// Coins (pooled, instanced; one coin = 25 pesetas), collectibles by kind (Ole's gadgets, shark
// fins, mission items) and runaway "rabbits" (beach balls, sheep, flowers, piglets).

import { THREE, GeoBuilder, toonMesh, MAT, outlineGeometry, outlineMat, mat, PRIM } from '../gfx.js';
import { groundAt, queryBlocks, circleVsBlock, topAt, RAMP } from '../world/collision.js';
import { CURB } from '../world/layout.js';
import { yawTo } from '../util.js';

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
// Phase-0 placeholders; WP-E builds the real meshes.

function geoMesh(fn, outline = 0.03) { const g = new GeoBuilder(); fn(g); return toonMesh(g.build(), { outline }); }

export const COLLECT_KINDS = {
  pryl: { motion: 'spin', beam: true, build: () => geoMesh((g) => { g.cyl(0x1d1426, 0, 0, 0, 0.5, 0.12, 20, Math.PI / 2); g.cyl(0xf07a1e, 0, 0, 0, 0.3, 0.14, 16, Math.PI / 2); g.box(0xf4f4f0, 0, 0.12, 0.08, 0.06, 0.26, 0.04); }) },
  fena: { motion: 'circle', build: () => geoMesh((g) => { g.cone(0x5a7a9a, 0, 0.45, 0, 0.45, 0.9, 4); g.cyl(0x1c7fb8, 0, 0, 0, 0.6, 0.06, 12); }) },
  flaska: { motion: 'roll', build: () => geoMesh((g) => { g.cyl(0x3a7a3a, 0, 0, 0, 0.12, 0.42, 10, Math.PI / 2); g.cyl(0x3a7a3a, 0, 0, 0.28, 0.05, 0.16, 8, Math.PI / 2); }, 0.02) },
  juice: { motion: 'none', build: () => geoMesh((g) => { g.cyl(0xf4f4f0, 0, 0, 0, 0.09, 0.2, 10); g.cyl(0xf7a21b, 0, 0.06, 0, 0.08, 0.06, 10); }, 0.015) },
  knacke: { motion: 'spin', beam: true, build: () => geoMesh((g) => { g.box(0xd8a050, 0, 0, 0, 0.6, 0.12, 0.35); g.box(0xd8321e, 0, 0.07, 0, 0.5, 0.02, 0.2); }) },
  asna: { motion: 'spin', beam: true, build: () => geoMesh((g) => { g.box(0xd8321e, 0, 0.3, 0, 0.3, 0.3, 0.7); g.box(0xd8321e, 0, 0.6, 0.35, 0.2, 0.35, 0.25); for (const x of [-0.1, 0.1]) for (const z of [-0.25, 0.25]) g.box(0xd8321e, x, 0.08, z, 0.08, 0.2, 0.08); }) },
  vaska: { motion: 'spin', beam: true, build: () => geoMesh((g) => { g.box(0x8a5a3a, 0, 0, 0, 0.8, 0.55, 0.25); g.box(0x3a2a1e, 0, 0.32, 0, 0.3, 0.08, 0.06); }) },
  giraff: { motion: 'spin', beam: true, build: () => geoMesh((g) => { g.box(0xf2c12e, 0, 0.3, 0, 0.25, 0.25, 0.5); g.box(0xf2c12e, 0, 0.7, 0.2, 0.1, 0.6, 0.1); }) },
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
// "Rabbits": hop about and bolt from you (flee), or sit and bob (flee: false). Meshes: badboll,
// faar, blomma, gris (Phase-0 placeholders; WP-E builds the real ones).

const RABBIT_MESHES = {
  badboll: (g) => { g.sphere(0xf4f4f0, 0, 0.45, 0, 0.9); g.sphere(0xd8321e, 0, 0.45, 0, 0.92, 0.3, 0.92); g.sphere(0x2f6ad8, 0, 0.45, 0, 0.3, 0.92, 0.92); },
  faar: (g) => { g.sphere(0xf4f0e6, 0, 0.55, 0, 0.8, 0.6, 1.0); g.sphere(0x2a2a2a, 0, 0.75, 0.5, 0.35, 0.35, 0.4); for (const x of [-0.2, 0.2]) for (const z of [-0.3, 0.3]) g.box(0x2a2a2a, x, 0.15, z, 0.1, 0.3, 0.1); },
  blomma: (g) => { g.cyl(0x3f7a3a, 0, 0.3, 0, 0.03, 0.6, 5); for (let k = 0; k < 5; k++) { const a = k * 1.26; g.sphere(0xc2307a, Math.cos(a) * 0.14, 0.65, Math.sin(a) * 0.14, 0.18); } g.sphere(0xffd23f, 0, 0.66, 0, 0.12); },
  gris: (g) => { g.sphere(0xf4a8b8, 0, 0.35, 0, 0.55, 0.45, 0.8); g.sphere(0xe88a9a, 0, 0.38, 0.42, 0.22, 0.18, 0.12); },
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
