// Cartoon particles: puffs of smoke, fire, dust, sparkles, snow, steam, spills and cigarette
// wisps. One instanced mesh of chunky icospheres with per-instance colour; each puff swells and
// then shrinks away.

import { THREE, MAT, toonGradient } from '../gfx.js';

const MAX = 700;
let mesh;
const P = [];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color();
let next = 0;

// Skid marks: a ring buffer of flat dark quads.
const SKIDS = 900;
let skidMesh, skidNext = 0;

export const fx = {
  init(scene) {
    mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshToonMaterial({ gradientMap: toonGradient() }), MAX);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    for (let i = 0; i < MAX; i++) {
      P.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s0: 1, s1: 1, rot: 0, drag: 1, grav: 0 });
      mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
      mesh.setColorAt(i, _c.set(0xffffff));
    }
    scene.add(mesh);

    skidMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1d1d22, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), SKIDS);
    skidMesh.frustumCulled = false;
    for (let i = 0; i < SKIDS; i++) skidMesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
    scene.add(skidMesh);
  },

  spawn(x, y, z, color, { vx = 0, vy = 0, vz = 0, s0 = 0.5, s1 = 1.5, life = 1, drag = 1.5, grav = 0 } = {}) {
    const i = next++ % MAX;
    const p = P[i];
    Object.assign(p, { life, max: life, x, y, z, vx, vy, vz, s0, s1, drag, grav, rot: Math.random() * 6 });
    mesh.setColorAt(i, _c.set(color));
    mesh.instanceColor.needsUpdate = true;
  },

  smoke(x, y, z, dark = false) {
    this.spawn(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4, dark ? 0x3a3a40 : 0xb8b8bc, { vy: 2 + Math.random(), vx: (Math.random() - 0.5), vz: (Math.random() - 0.5), s0: 0.4, s1: 1.6, life: 1.4 });
  },
  fire(x, y, z) {
    const c = [0xffd23f, 0xff8a1a, 0xff5a1a][(Math.random() * 3) | 0];
    this.spawn(x + (Math.random() - 0.5) * 0.8, y, z + (Math.random() - 0.5) * 0.8, c, { vy: 3 + Math.random() * 2, s0: 0.7, s1: 0.1, life: 0.6 });
  },
  explosion(x, y, z) {
    for (let k = 0; k < 26; k++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
      this.spawn(x, y + 0.5, z, [0xffd23f, 0xff8a1a, 0xff5a1a, 0xfff3b0][k % 4], { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 2 + Math.random() * 6, s0: 1.6, s1: 0.2, life: 0.7 + Math.random() * 0.3, drag: 3 });
    }
    for (let k = 0; k < 14; k++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3;
      this.spawn(x, y + 1, z, 0x4a4a50, { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 3 + Math.random() * 3, s0: 1.2, s1: 3.2, life: 1.8, drag: 1.2 });
    }
  },
  dust(x, z, n = 3, y = 0.3) {
    for (let k = 0; k < n; k++) this.spawn(x + (Math.random() - 0.5), y, z + (Math.random() - 0.5), 0xd8c8a8, { vy: 0.8 + Math.random(), vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, s0: 0.3, s1: 1.0, life: 0.7 });
  },
  sparkle(x, y, z, color = 0xffd23f, n = 10) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(x, y, z, color, { vx: Math.cos(a) * 4, vz: Math.sin(a) * 4, vy: 2 + Math.random() * 4, s0: 0.25, s1: 0.0, life: 0.5, drag: 2, grav: 9 });
    }
  },
  sparks(x, y, z, n = 8) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(x, y, z, k % 2 ? 0xfff3b0 : 0xffb030, { vx: Math.cos(a) * 6, vz: Math.sin(a) * 6, vy: 2 + Math.random() * 5, s0: 0.18, s1: 0.0, life: 0.35, drag: 1, grav: 20 });
    }
  },
  // A ring of coloured puffs (meter events: busts, panic).
  meterPuff(x, y, z, color = 0x3d5a3a, n = 12) {
    const c2 = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.45).getHex();
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(x + Math.cos(a) * 0.8, y + Math.random() * 1.5, z + Math.sin(a) * 0.8, k % 2 ? color : c2, { vy: 1.5, vx: Math.cos(a) * 1.5, vz: Math.sin(a) * 1.5, s0: 0.6, s1: 1.4, life: 1.2 });
    }
  },
  // One snowflake drifting down (call ~20/s around the camera in the gate phase; the cabin spawns
  // them outdoors only).
  snow(x, y, z) {
    this.spawn(x, y, z, 0xffffff, { vx: 0.25 + (Math.random() - 0.5) * 0.6, vz: (Math.random() - 0.5) * 0.6, vy: -1.4 - Math.random() * 0.8, s0: 0.13, s1: 0.1, life: 4.5, drag: 0 });
  },
  // Droplets thrown off something that got knocked (the trolley's juice when it bowls you over).
  spill(x, y, z, color = 0xf7a21b, n = 8) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, sp = 0.8 + Math.random() * 1.6;
      this.spawn(x, y, z, k % 3 ? color : 0xffffff, { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 1.5 + Math.random() * 2, s0: 0.14, s1: 0.06, life: 0.6, drag: 0.6, grav: 12 });
    }
  },
  // A faint cigarette wisp rising slowly (the smokers' rows, 1980).
  wisp(x, y, z) {
    this.spawn(x + (Math.random() - 0.5) * 0.1, y, z + (Math.random() - 0.5) * 0.1, 0xd8d8dc, { vy: 0.35 + Math.random() * 0.2, vx: (Math.random() - 0.5) * 0.15, vz: (Math.random() - 0.5) * 0.15, s0: 0.06, s1: 0.32, life: 2.2, drag: 0.4 });
  },
  // A white steam puff (wrecked cars that do not explode).
  steam(x, y, z) {
    this.spawn(x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5, 0xf2f2f2, { vy: 2.2 + Math.random(), vx: (Math.random() - 0.5) * 0.6, vz: (Math.random() - 0.5) * 0.6, s0: 0.5, s1: 1.8, life: 1.3 });
  },
  splash(x, z) {
    for (let k = 0; k < 16; k++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(x, 0.3, z, k % 2 ? 0x9fdcff : 0xffffff, { vx: Math.cos(a) * 3, vz: Math.sin(a) * 3, vy: 4 + Math.random() * 4, s0: 0.5, s1: 0.1, life: 0.8, drag: 0.8, grav: 14 });
    }
  },

  skid(x, z, yaw, w = 0.28) {
    const i = skidNext++ % SKIDS;
    _m.compose(_v.set(x, 0.035, z), _q.setFromEuler(_e.set(0, yaw, 0)), _s.set(w, 1, 0.55));
    skidMesh.setMatrixAt(i, _m);
    skidMesh.instanceMatrix.needsUpdate = true;
  },

  tick(dt) {
    for (let i = 0; i < MAX; i++) {
      const p = P[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k; p.vy = p.vy * k - p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const t = 1 - p.life / p.max;
      let s = p.s0 + (p.s1 - p.s0) * t;
      if (p.life <= 0) s = 0;
      else if (t > 0.75) s *= (1 - t) / 0.25;
      _m.compose(_v.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(p.rot, p.rot * 0.7, 0)), _s.set(s, s, s));
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  },
};
