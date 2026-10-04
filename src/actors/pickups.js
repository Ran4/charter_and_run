// Coins (pooled, instanced), Duke's lost records, Tito the Anxiety Mosquitoes, and Jay's runaway
// rabbits for the magic-show mission.

import { THREE, GeoBuilder, toonMesh, MAT, outlineGeometry, outlineMat, mat, PRIM } from '../gfx.js';
import { groundAt, queryBlocks, circleVsBlock, topAt, RAMP } from '../world/collision.js';
import { CURB } from '../world/layout.js';
import { yawTo } from '../util.js';

// ---------------------------------------------------------------------------------------------
// Coins

const MAXC = 500;
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
  Object.assign(c, { active: true, fixed: true, x, y, z, vx: 0, vy: 0, vz: 0, life: Infinity, settle: 1, value: 1 });
}

export function burstCoins(x, y, z, n, vx = 0, vz = 0) {
  for (let k = 0; k < n; k++) {
    const c = freeCoin();
    if (!c) return;
    const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3;
    Object.assign(c, { active: true, fixed: false, x, y: y + 0.5, z, vx: vx * 0.3 + Math.cos(a) * s, vz: vz * 0.3 + Math.sin(a) * s, vy: 5 + Math.random() * 4, life: 25, settle: 0, value: 1 });
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
// Duke's records

function recordGeo() {
  const g = new GeoBuilder();
  g.cyl(0x1d1426, 0, 0, 0, 0.62, 0.05, 28, Math.PI / 2);
  g.cyl(0xd8321e, 0, 0, 0, 0.22, 0.07, 16, Math.PI / 2);
  g.cyl(0xfff3b0, 0, 0, 0, 0.05, 0.08, 8, Math.PI / 2);
  return g.build();
}

export class Collectible {
  constructor(scene, kind, id, x, y, z) {
    this.kind = kind; this.id = id; this.x = x; this.y = y; this.z = z;
    this.alive = true;
    this.mesh = kind === 'record' ? toonMesh(recordGeo(), { outline: 0.03 }) : mosquitoMesh();
    this.mesh.position.set(x, y, z);
    if (kind === 'record') {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xb8e0ff, transparent: true, opacity: 0.18, depthWrite: false }));
      beam.position.y = 3;
      this.mesh.add(beam);
    }
    scene.add(this.mesh);
    this.ph = Math.random() * 6;
  }
  tick(t, dt) {
    if (!this.alive) return;
    if (this.kind === 'record') {
      this.mesh.rotation.y = t * 1.8;
      this.mesh.position.y = this.y + Math.sin(t * 2 + this.ph) * 0.15;
    } else {
      const ph = t * 1.3 + this.ph;
      this.mesh.position.set(this.x + Math.sin(ph) * 1.4, this.y + Math.sin(ph * 2.3) * 0.4, this.z + Math.cos(ph * 0.8) * 1.4);
      this.mesh.rotation.y = ph + Math.PI / 2;
      this.mesh.children[1]?.rotation.set(0, 0, Math.sin(t * 60) * 0.6);
      this.mesh.children[2]?.rotation.set(0, 0, -Math.sin(t * 60) * 0.6);
    }
  }
  remove() {
    this.alive = false;
    this.mesh.visible = false;
  }
}

function mosquitoMesh() {
  const root = new THREE.Group();
  const g = new GeoBuilder();
  g.sphere(0x6a8a5a, 0, 0, -0.35, 0.55, 0.45, 0.85);
  g.sphere(0x7aa06a, 0, 0.05, 0.15, 0.45);
  g.sphere(0xffffff, -0.13, 0.15, 0.32, 0.2, 0.26, 0.15);
  g.sphere(0xffffff, 0.13, 0.15, 0.32, 0.2, 0.26, 0.15);
  g.sphere(0x1d1426, -0.13, 0.13, 0.4, 0.09);
  g.sphere(0x1d1426, 0.13, 0.13, 0.4, 0.09);
  g.cyl(0x3a2a2a, 0, 0, 0.6, 0.025, 0.55, 5, Math.PI / 2 + 0.35);
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) g.cyl(0x3a2a2a, s * 0.25, -0.3, -0.1 - k * 0.18, 0.015, 0.6, 4, 0.3, 0, s * 0.6);
  root.add(toonMesh(g.build(), { outline: 0.02 }));
  for (const s of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(s * 0.1, 0.2, -0.15);
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6), new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.55, depthWrite: false }));
    w.scale.set(0.7, 0.06, 0.35);
    w.position.x = s * 0.35;
    piv.add(w);
    root.add(piv);
  }
  root.scale.setScalar(0.95);
  return root;
}

// ---------------------------------------------------------------------------------------------
// Rabbits: hop about, bolt from you, poof into Jay's hat when caught.

let rabbitGeo;
export class Rabbit {
  constructor(scene, x, z) {
    if (!rabbitGeo) {
      const g = new GeoBuilder();
      g.sphere(0xffffff, 0, 0.35, 0, 0.55, 0.5, 0.75);
      g.sphere(0xffffff, 0, 0.62, 0.32, 0.4);
      for (const s of [-1, 1]) {
        g.sphere(0xffffff, s * 0.09, 0.98, 0.26, 0.12, 0.45, 0.1, -0.2, 0, s * 0.15);
        g.sphere(0xffb8c8, s * 0.09, 0.98, 0.3, 0.06, 0.32, 0.04, -0.2, 0, s * 0.15);
        g.sphere(0x1d1426, s * 0.12, 0.68, 0.48, 0.07);
      }
      g.sphere(0xffb8c8, 0, 0.6, 0.52, 0.07);
      g.sphere(0xffffff, 0, 0.4, -0.42, 0.22);
      rabbitGeo = g.build();
    }
    this.mesh = toonMesh(rabbitGeo, { outline: 0.02 });
    this.x = x; this.z = z; this.y = groundAt(x, z, 0.2, 0.6); this.vy = 0; this.vx = 0; this.vz = 0;
    this.hopT = Math.random();
    this.alive = true;
    this.yaw = Math.random() * 6;
    this.home = [x, z];
    scene.add(this.mesh);
  }
  update(dt, px, pz) {
    if (!this.alive) return;
    const g = groundAt(this.x, this.z, this.y + 0.5, 0.5);
    const onGround = this.y <= g + 0.01;
    if (onGround) {
      this.y = g; this.vy = 0;
      this.hopT -= dt;
      const dx = this.x - px, dz = this.z - pz, d = Math.hypot(dx, dz);
      if (this.hopT <= 0) {
        let ax, az, sp;
        if (d < 7) { ax = dx / d; az = dz / d; sp = 5.2; this.hopT = 0.05; }
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
