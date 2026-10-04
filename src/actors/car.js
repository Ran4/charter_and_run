// Cars: cartoon models with open cabins (so you can see who's driving) and an arcade physics
// model — bicycle steering, lateral grip, handbrake drifts, ramps, rigid-body bumps.

import { THREE, GeoBuilder, toonMesh, MAT, mat, PRIM } from '../gfx.js';
import { queryBlocks, obbVsBlock, obbVsObb, groundAt, topAt, RAMP } from '../world/collision.js';
import { clamp, damp, pick } from '../util.js';
import { fx as FX } from '../game/fx.js';

// DESIGN §6.6. Spec flags: tall, bus, bed, icecream, livery ('suntrip' | 'guagua'), guardia, taxi,
// pigs, build (custom geometry: (spec, color) -> { geo, glass }), noWheels, noSpeedo.
// Car fields set by game code: noEnter (never offered to the player), noExplode (damage -> dead +
// steam, no fire), isPursuer, riders[] (decorative busts), locked.
const SEDAN = { len: 4.5, wid: 1.9, bodyH: 0.62, cabinH: 0.68, wheelR: 0.36, maxSpeed: 31, accel: 12, grip: 9.5, steer: 0.6, mass: 1400, hp: 100, cabin: [-0.3, 0.12] };
const PICKUP = { len: 5.1, wid: 2.0, bodyH: 0.75, cabinH: 0.75, wheelR: 0.42, maxSpeed: 29, accel: 11, grip: 8.6, steer: 0.58, mass: 1900, hp: 130, cabin: [-0.05, 0.2], bed: true };
const BUS = { len: 10.5, wid: 2.5, bodyH: 2.2, cabinH: 0, wheelR: 0.5, maxSpeed: 21, accel: 6.5, grip: 7.5, steer: 0.52, mass: 7000, hp: 300, tall: true, bus: true };
export const CAR_TYPES = {
  sedan: { name: 'Sedan', ...SEDAN },
  hatch: { name: 'Småbil', len: 3.9, wid: 1.8, bodyH: 0.62, cabinH: 0.7, wheelR: 0.34, maxSpeed: 30, accel: 13, grip: 10.5, steer: 0.64, mass: 1100, hp: 85, cabin: [-0.44, 0.1] },
  wagon: { name: 'Kombi', len: 4.9, wid: 1.95, bodyH: 0.62, cabinH: 0.72, wheelR: 0.37, maxSpeed: 30, accel: 11.5, grip: 9.2, steer: 0.6, mass: 1500, hp: 115, cabin: [-0.46, 0.12] },
  van: { name: 'Skåpbil', len: 5.0, wid: 2.05, bodyH: 1.5, cabinH: 0, wheelR: 0.38, maxSpeed: 26, accel: 9.5, grip: 8.2, steer: 0.58, mass: 2100, hp: 140, tall: true },
  pickup: { name: 'Flakbil', ...PICKUP },
  bus: { name: 'SunTrip-buss', ...BUS, color: 0xf4f4f0, livery: 'suntrip' },
  guagua: { name: 'Guagua', ...BUS, color: 0x2f8a4a, livery: 'guagua' },
  icecream: { name: 'Glassbil', len: 5.4, wid: 2.1, bodyH: 1.7, cabinH: 0, wheelR: 0.4, maxSpeed: 24, accel: 8.5, grip: 8, steer: 0.56, mass: 2300, hp: 140, color: 0xfafafa, tall: true, icecream: true },
  taxi: { name: 'Taxi', ...SEDAN, color: 0xe8dcb8, taxi: true },
  guardia: { name: 'Guardia Civil', len: 4.2, wid: 1.9, bodyH: 1.45, cabinH: 0, wheelR: 0.4, maxSpeed: 30, accel: 12, grip: 9, steer: 0.58, mass: 2000, hp: 160, color: 0x2e5e3e, tall: true, guardia: true },
  grisbil: { name: 'Grisbilen', ...PICKUP, maxSpeed: 34, accel: 14, color: 0xa8442a, pigs: true },
  // Bigmouth leftovers (no longer spawned; their geometry branches stay until WP-E removes them).
  hearse: { name: 'Hearse', len: 5.8, wid: 2.0, bodyH: 0.62, cabinH: 0.82, wheelR: 0.38, maxSpeed: 33, accel: 12.5, grip: 9.2, steer: 0.56, mass: 2000, hp: 150, cabin: [-0.47, 0.08], color: 0x1d1426, hearse: true },
};
export function registerCarType(key, spec) { CAR_TYPES[key] = spec; }

const COLORS = [0xd8321e, 0x2f6ad8, 0x3fa04a, 0xf2c12e, 0x8a3ab8, 0xff7ab0, 0xf4f1e8, 0x3a3a44, 0x2fb8a8, 0xff8a3a, 0x8fb3c9, 0xb88a5a];

function shade(c, k) { const col = new THREE.Color(c); col.multiplyScalar(k); return col.getHex(); }

function buildCarModel(s, color) {
  if (s.build) return s.build(s, color);
  const g = new GeoBuilder();
  const L = s.len, W = s.wid, y0 = s.wheelR * 0.95, top = y0 + s.bodyH;
  const dark = shade(color, 0.7), trim = 0x2a2a30, chrome = 0xd8dce0;
  const glass = new GeoBuilder();
  if (s.tall) {
    // Vans and buses: one tall box, a glass windscreen up front, windows down the sides.
    const cabZ = L / 2 - 1.3;
    g.boxB(color, 0, y0, -0.25, W, s.bodyH, L - 0.5);
    g.boxB(color, 0, y0, cabZ + 0.2, W, s.bodyH * 0.45, 1.6);
    g.boxB(color, 0, top - 0.12, 0, W + 0.04, 0.16, L);
    for (const sx of [-1, 1]) {
      g.box(trim, sx * (W / 2 - 0.08), top - s.bodyH * 0.27, cabZ + 0.1, 0.18, s.bodyH * 0.52, 0.12);
    }
    glass.box(0xffffff, 0, top - s.bodyH * 0.27, L / 2 - 0.55, W - 0.16, s.bodyH * 0.5, 0.06, 0, -0.25);
    if (s.bus) {
      for (let k = 0; k < 8; k++) for (const sx of [-1, 1]) g.box(0x2a3a4a, sx * (W / 2 + 0.01), top - 0.65, -L / 2 + 1.2 + k * 1.05, 0.04, 0.7, 0.85);
      g.box(0x1d1d22, 0, y0 + 0.9, 0, W + 0.04, 0.12, L - 0.4);
      if (!s.livery) g.box(0xd8321e, W / 2 + 0.25, y0 + 1.2, L / 2 - 2.4, 0.04, 0.5, 0.5);
      if (s.livery === 'suntrip') for (const sx of [-1, 1]) { g.box(0xf07a1e, sx * (W / 2 + 0.02), y0 + 0.55, 0, 0.04, 0.22, L - 0.6); g.box(0xf7c31b, sx * (W / 2 + 0.02), y0 + 0.3, 0, 0.04, 0.16, L - 0.6); }
    } else {
      for (const sx of [-1, 1]) g.box(0x2a3a4a, sx * (W / 2 + 0.01), top - 0.55, -0.6, 0.04, 0.6, L * 0.45);
    }
    if (s.guardia) {
      g.boxB(0xf4f4f0, 0, top - 0.02, -0.25, W - 0.1, 0.06, L - 0.9);
      g.boxB(0x2f6ad8, 0, top + 0.04, 0.2, 0.5, 0.18, 0.3);
      for (const sx of [-1, 1]) g.box(0xf4f4f0, sx * (W / 2 + 0.02), y0 + 0.55, -0.2, 0.04, 0.16, L * 0.6);
    }
    if (s.icecream) {
      g.cone(0xe8b878, 0, top + 0.55, -0.6, 0.38, 1.0, 10, Math.PI);
      g.sphere(0xffb8d0, 0, top + 1.15, -0.6, 0.85);
      g.sphere(0x8a4a2a, 0, top + 1.5, -0.6, 0.15);
      for (const sx of [-1, 1]) g.box(0xff8ab8, sx * (W / 2 + 0.02), y0 + 0.6, -0.6, 0.04, 0.3, L * 0.7);
    }
  } else {
    // Cars: lower body, hood and boot, open cabin of pillars under a roof.
    g.boxB(color, 0, y0, 0, W, s.bodyH, L);
    g.boxB(shade(color, 1.08), 0, top - 0.02, L * 0.28, W - 0.1, 0.05, L * 0.4);
    const [c0, c1] = s.cabin;
    const z0 = c0 * L, z1 = c1 * L, ch = s.cabinH, ct = top + ch;
    const pil = 0.12;
    for (const sx of [-1, 1]) {
      g.box(dark, sx * (W / 2 - pil / 2 - 0.02), top + ch / 2, z1 - 0.12, pil, ch * 1.05, pil, 0, -0.35);
      g.box(dark, sx * (W / 2 - pil / 2 - 0.02), top + ch / 2, z0 + 0.1, pil, ch, pil * 1.6);
      if (s.wood) g.box(0x9a6a3a, sx * (W / 2 + 0.01), y0 + s.bodyH * 0.55, -L * 0.1, 0.04, s.bodyH * 0.5, L * 0.72);
      if (s.hearse) {
        g.boxB(color, sx * (W / 2 - 0.06), top, (z0 + (z1 - L * 0.12)) / 2 - 0.2, 0.12, ch, (z1 - L * 0.12) - z0 - 0.4);
        g.box(0x8a3ab8, sx * (W / 2 + 0.01), top + ch * 0.5, z0 + L * 0.18, 0.03, ch * 0.6, L * 0.3);
        g.box(chrome, sx * (W / 2 + 0.01), top - 0.06, 0, 0.03, 0.06, L * 0.9);
      }
    }
    g.boxB(s.hearse ? color : shade(color, 0.92), 0, ct, (z0 + z1) / 2 - 0.05, W - 0.06, 0.13, z1 - z0 + 0.15);
    glass.box(0xffffff, 0, top + ch / 2, z1 - 0.15, W - 0.3, ch * 1.02, 0.05, 0, -0.35);
    glass.box(0xffffff, 0, top + ch / 2, z0 + 0.12, W - 0.3, ch * 0.95, 0.05, 0, 0.2);
    if (s.taxi) { g.boxB(0xf4f4f0, 0, top + ch + 0.12, (z0 + z1) / 2, 0.6, 0.22, 0.3); g.boxB(0x3fa04a, 0.22, top + ch + 0.34, (z0 + z1) / 2, 0.1, 0.08, 0.1); }
    if (s.bed) {
      for (const sx of [-1, 1]) g.boxB(color, sx * (W / 2 - 0.06), top, -L * 0.3, 0.12, 0.4, L * 0.38);
      g.boxB(color, 0, top, -L / 2 + 0.06, W, 0.4, 0.12);
      g.boxB(0x3a3a40, 0, top - 0.02, -L * 0.3, W - 0.2, 0.03, L * 0.38);
      if (s.pigs) for (let k = 0; k < 3; k++) g.sphere(0xf4a8b8, (k - 1) * 0.55, top + 0.35, -L * 0.3, 0.6, 0.45, 0.85);
    }
    if (s.muscle) {
      g.boxB(0xffffff, 0.25, top, 0, 0.18, 0.02, L * 0.99);
      g.boxB(0xffffff, -0.25, top, 0, 0.18, 0.02, L * 0.99);
      g.boxB(0x2a2a2a, 0, top, L * 0.22, 0.6, 0.2, 0.7);
      g.boxB(0x2a2a2a, 0, top + 0.3, -L / 2 + 0.2, W - 0.2, 0.06, 0.3);
      for (const sx of [-0.7, 0.7]) g.boxB(0x2a2a2a, sx, top, -L / 2 + 0.2, 0.08, 0.3, 0.08);
    }
    // Seats and a steering wheel (driver sits on the car's left, +x).
    for (const sx of [-1, 1]) {
      g.boxB(0x3a2a2a, sx * W * 0.22, top - 0.25, -0.1, 0.55, 0.25, 0.6);
      g.box(0x3a2a2a, sx * W * 0.22, top + 0.15, -0.42, 0.55, 0.7, 0.14, 0, -0.15);
    }
    g.add(PRIM.torus(), 0x1d1d22, mat(W * 0.22, top + 0.25, z1 - 0.55, -0.9, 0, 0, 0.42, 0.42, 0.42));
  }
  // Bumpers and lights.
  g.boxB(trim, 0, y0 - 0.06, L / 2 - 0.05, W + 0.06, 0.26, 0.2);
  g.boxB(trim, 0, y0 - 0.06, -L / 2 + 0.05, W + 0.06, 0.26, 0.2);
  for (const sx of [-1, 1]) {
    g.box(0xfff6c0, sx * (W / 2 - 0.3), y0 + 0.36, L / 2 + 0.01, 0.38, 0.22, 0.06);
    g.box(0xe8322a, sx * (W / 2 - 0.25), y0 + 0.36, -L / 2 - 0.01, 0.32, 0.16, 0.06);
  }
  g.box(shade(color, 0.8), 0, y0 + 0.2, L / 2 + 0.01, W * 0.4, 0.18, 0.04);
  if (s.hearse) {
    g.boxB(0x8a3ab8, 0, top + s.cabinH + 0.12, -L * 0.18, 0.6, 0.08, 1.2);
  }
  return { geo: g.build(), glass: glass.empty ? null : glass.build() };
}

let wheelGeo;
function getWheelGeo() {
  if (wheelGeo) return wheelGeo;
  const g = new GeoBuilder();
  g.cyl(0x1d1d22, 0, 0, 0, 1, 0.75, 16, 0, 0, Math.PI / 2);
  g.cyl(0xc8ccd2, 0, 0, 0, 0.55, 0.8, 10, 0, 0, Math.PI / 2);
  g.box(0x8a8f99, 0, 0, 0, 0.82, 0.2, 0.6);
  return (wheelGeo = g.build());
}

// ---------------------------------------------------------------------------------------------

let nextId = 1;
export class Car {
  constructor(type, opts = {}) {
    const spec = (this.spec = { ...CAR_TYPES[type], ...(opts.spec || {}) });
    this.type = type;
    this.id = nextId++;
    this.name = opts.name || null;
    this.color = opts.color ?? spec.color ?? pick(COLORS);
    this.root = new THREE.Group();
    this.tilt = new THREE.Group();
    this.root.add(this.tilt);
    const { geo, glass } = buildCarModel(spec, this.color);
    this.body = toonMesh(geo, { outline: 0.035 });
    this.tilt.add(this.body);
    if (glass) {
      const gm = new THREE.Mesh(glass, MAT.glass);
      gm.renderOrder = 2;
      this.tilt.add(gm);
    }
    this.wheels = [];
    const wg = getWheelGeo();
    const wr = spec.wheelR, wx = spec.wid / 2 - 0.02, wz = spec.len / 2 - wr - (spec.bus ? 1.2 : 0.38);
    for (const [sx, sz] of spec.noWheels ? [] : [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const piv = new THREE.Group();
      piv.position.set(sx * wx, wr, sz * wz);
      const w = toonMesh(wg, { outline: 0.02 });
      w.scale.set(0.36, wr, wr);
      piv.add(w);
      this.tilt.add(piv);
      this.wheels.push({ piv, mesh: w, front: sz > 0 });
    }
    this.x = opts.x || 0; this.z = opts.z || 0; this.y = 0.15; this.yaw = opts.yaw || 0;
    this.vx = 0; this.vz = 0; this.vy = 0; this.w = 0;
    this.steerAngle = 0;
    this.hp = spec.hp;
    this.dead = false;
    this.air = false;
    this.mass = spec.mass;
    this.inertia = (spec.mass * (spec.len * spec.len + spec.wid * spec.wid)) / 12;
    this.ctrl = { throttle: 0, brake: 0, steer: 0, handbrake: false, park: true };
    this.obb = { x: 0, z: 0, fx: 0, fz: 1, hx: spec.wid / 2, hz: spec.len / 2 };
    this.radius = Math.hypot(spec.wid, spec.len) / 2;
    this.height = spec.tall ? spec.wheelR * 0.95 + spec.bodyH : spec.wheelR * 0.95 + spec.bodyH + spec.cabinH + 0.13;
    this.driver = null;      // Character at the wheel
    this.passengers = [];    // extra seated characters
    this.ai = null;          // controller object with update(car, dt)
    this.wheelSpin = 0;
    this.bump = 0;
    this.pitch = 0; this.roll = 0;
    this.smokeT = 0;
    this.skidAmt = 0;
    this.lastHit = 0;
    this.revs = 0;
    this.riders = [];
    this.noEnter = false;
    this.noExplode = false;
    this.isPursuer = false;
    this.updateObb();
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
  }

  get speed() { return Math.hypot(this.vx, this.vz); }
  get forwardSpeed() { return this.vx * Math.sin(this.yaw) + this.vz * Math.cos(this.yaw); }

  updateObb() {
    const o = this.obb;
    o.x = this.x; o.z = this.z; o.fx = Math.sin(this.yaw); o.fz = Math.cos(this.yaw);
  }

  // Seat position in world space: driver on the left (+x local), passenger on the right. Computed
  // from the physics state (not the last rendered matrix), so it is current within the frame.
  seatWorld(side = 1, out = { x: 0, y: 0, z: 0 }) {
    const s = this.spec;
    const lx = side * s.wid * 0.22, ly = s.tall ? s.wheelR * 0.95 + 0.45 : s.wheelR * 0.95 + s.bodyH - 0.25, lz = s.tall ? s.len / 2 - 1.6 : -0.1;
    const c = Math.cos(this.yaw), sn = Math.sin(this.yaw);
    out.x = this.x + lx * c + lz * sn;
    out.y = this.y + ly;
    out.z = this.z - lx * sn + lz * c;
    return out;
  }

  place(x, z, yaw) {
    this.x = x; this.z = z; this.yaw = yaw; this.vx = this.vz = this.vy = this.w = 0;
    this.y = groundAt(x, z, 0.2, 0.6);
    this.air = false;
    this.updateObb();
  }

  step(dt, game) {
    const s = this.spec, c = this.ctrl;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const rx = -fz, rz = fx;
    let vf = this.vx * fx + this.vz * fz;
    let vr = this.vx * rx + this.vz * rz;
    const driven = !this.dead && (this.driver || this.ai);
    // The player's car runs at double speed: top speed, pull and brakes x2, drag /2.
    const boost = game && game.playerCar === this ? 2 : 1;
    const maxSpeed = s.maxSpeed * boost, accel = s.accel * boost;
    this.skidAmt = 0;
    if (!this.air) {
      if (driven && !c.park) {
        const thr = c.throttle, brk = c.brake;
        if (thr > 0) {
          if (vf < -0.5) vf = Math.min(0, vf + 24 * boost * thr * dt);
          else {
            const t = 1 - Math.max(0, vf) / maxSpeed;
            vf += accel * thr * Math.max(0.08, t) * dt;
            if (vf < 3 && thr > 0.9 && c.handbrake) this.skidAmt = 1;
          }
        }
        if (brk > 0) {
          if (vf > 0.5) { vf = Math.max(0, vf - 24 * boost * brk * dt); if (vf > 8) this.skidAmt = Math.max(this.skidAmt, 0.6 * brk); }
          else vf = Math.max(vf - accel * 0.6 * brk * dt, -maxSpeed * 0.35);
        }
        if (!thr && !brk) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 2.2 * dt);
        if (c.handbrake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 5 * dt);
      } else {
        vf -= Math.sign(vf) * Math.min(Math.abs(vf), (this.dead ? 6 : 9) * dt);
      }
      vf -= vf * Math.abs(vf) * (0.0011 / boost) * dt;
      const grip = c.handbrake && driven ? 1.7 : s.grip;
      if (Math.abs(vr) > 3) this.skidAmt = Math.max(this.skidAmt, Math.min(1, (Math.abs(vr) - 3) / 6));
      vr *= Math.exp(-grip * dt);
      const maxSteer = s.steer / (1 + Math.abs(vf) / 15);
      this.steerAngle = damp(this.steerAngle, driven ? c.steer * maxSteer : 0, 12, dt);
      const wb = s.len * 0.62;
      const targetW = (-vf * Math.tan(this.steerAngle)) / wb * (c.handbrake && driven ? 1.5 : 1);
      this.w = damp(this.w, targetW, c.handbrake ? 4 : 8, dt);
    } else {
      this.w *= Math.exp(-0.6 * dt);
    }
    this.vx = fx * vf + rx * vr;
    this.vz = fz * vf + rz * vr;
    this.yaw += this.w * dt;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.wheelSpin += (vf * dt) / s.wheelR;
    this.revs = damp(this.revs, Math.min(1, Math.abs(vf) / maxSpeed) * 0.85 + (c.throttle > 0 && driven ? 0.2 : 0), 6, dt);

    // Vertical: follow the ground, launch off ramp ends, land with a thump.
    const gh = groundAt(this.x, this.z, this.y, 0.6);
    if (this.air) {
      this.vy -= 22 * dt;
      this.y += this.vy * dt;
      if (this.y <= gh) {
        const impact = -this.vy;
        this.y = gh; this.vy = 0; this.air = false;
        if (impact > 4) {
          this.bump = Math.min(0.35, impact * 0.03);
          game?.onCarLanded(this, impact);
          if (impact > 13) this.damage((impact - 13) * 2.5, game);
        }
      }
    } else if (gh < this.y - 0.35) {
      this.air = true;
    } else {
      this.vy = clamp((gh - this.y) / dt, -6, 12);
      this.y = gh;
    }

    this.updateObb();
    this.collideStatic(game);
    if (!this.dead && this.hp < 35) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = this.hp < 15 ? 0.05 : 0.12;
        const hx = this.x + fx * s.len * 0.38, hz = this.z + fz * s.len * 0.38;
        fx_smoke(hx, this.y + this.height * 0.7, hz, this.hp < 15);
      }
    }
    if (this.dead && this.steamT > 0) {
      this.steamT -= dt;
      this.smokeT -= dt;
      if (this.smokeT <= 0) { this.smokeT = 0.15; FX.steam(this.x + fx * s.len * 0.38, this.y + this.height * 0.8, this.z + fz * s.len * 0.38); }
    }
    if (this.dead) {
      this.smokeT -= dt;
      if (this.smokeT <= 0 && this.burn > 0) {
        this.smokeT = 0.06;
        FX.fire(this.x, this.y + 1.0, this.z);
        if (Math.random() < 0.4) FX.smoke(this.x, this.y + 1.6, this.z, true);
      }
      this.burn -= dt;
    }
  }

  collideStatic(game) {
    const o = this.obb, r = this.radius;
    const list = queryBlocks(this.x - r, this.z - r, this.x + r, this.z + r, _blocks);
    for (const b of list) {
      const top = b.shape === RAMP ? topAt(b, this.x, this.z) : b.top;
      if (top <= this.y + 0.6) continue;
      if (b.kind === 'prop') {
        if (!obbVsBlock(o, b, _hit)) continue;
        const sp = this.speed;
        if (sp > (b.ref.def.minSpeed ?? 3) && game) {
          game.breakProp(b.ref, this.vx, this.vz, this);
          this.vx *= 0.92; this.vz *= 0.92;
          continue;
        }
        this.resolveStatic(_hit, game, b);
        continue;
      }
      if (!obbVsBlock(o, b, _hit)) continue;
      this.resolveStatic(_hit, game, b);
    }
  }

  resolveStatic(h, game, b) {
    const d = Math.min(h.depth, 1.5);
    this.x += h.nx * d; this.z += h.nz * d;
    const rxc = h.cx - this.x, rzc = h.cz - this.z;
    const pvx = this.vx + this.w * rzc, pvz = this.vz - this.w * rxc;
    const vn = pvx * h.nx + pvz * h.nz;
    if (vn < 0) {
      const rn = (rzc * h.nx - rxc * h.nz) * 0.7;
      const invM = 1 / this.mass, invI = 1 / this.inertia;
      const j = (-(1 + 0.22) * vn) / (invM + rn * rn * invI);
      this.vx += j * h.nx * invM; this.vz += j * h.nz * invM;
      this.w += j * rn * invI;
      const tx = -h.nz, tz = h.nx, vt = this.vx * tx + this.vz * tz;
      this.vx -= tx * vt * 0.12; this.vz -= tz * vt * 0.12;
      const impact = -vn;
      if (impact > 2.5 && game) game.onCarImpact(this, null, impact, h.cx, h.cz, b);
      if (impact > 5) this.damage((impact - 5) * 2.0, game);
    }
    this.updateObb();
  }

  damage(amount, game) {
    if (this.dead || amount <= 0) return;
    if (this.invulnerable) return;
    this.hp -= amount * (this.damageScale ?? 1);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      if (this.noExplode) {
        // Wrecked in steam: no fireball, no fire, it just stops.
        this.burn = 0;
        this.steamT = 6;
        FX.steam(this.x, this.y + this.height * 0.8, this.z);
      } else {
        this.burn = 6;
        this.body.material = MAT.burnt;
        FX.explosion(this.x, this.y + 0.5, this.z);
        this.vy = 6; this.air = true;
        this.w += (Math.random() - 0.5) * 3;
      }
      game?.onCarDestroyed(this);
    }
  }

  repair() {
    this.hp = this.spec.hp;
    this.dead = false;
    this.burn = 0;
    this.body.material = MAT.toon;
  }

  // Sync the visual model with the physics state.
  sync(dt) {
    const s = this.spec;
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    let targetPitch = 0;
    if (this.air) targetPitch = -Math.atan2(this.vy, Math.max(4, Math.abs(this.forwardSpeed))) * 0.6;
    else {
      const wb = s.len * 0.35;
      const hF = groundAt(this.x + fx * wb, this.z + fz * wb, this.y + 0.3, 0.6), hR = groundAt(this.x - fx * wb, this.z - fz * wb, this.y + 0.3, 0.6);
      targetPitch = -Math.atan2(hF - hR, wb * 2);
      const accel = this.ctrl.throttle - this.ctrl.brake;
      targetPitch += accel * 0.02 * Math.min(1, this.speed / 5);
    }
    this.pitch = damp(this.pitch, targetPitch, 10, dt);
    const vr = this.vx * -fz + this.vz * fx;
    this.roll = damp(this.roll, clamp(vr * 0.012 - this.steerAngle * this.forwardSpeed * 0.004, -0.12, 0.12), 8, dt);
    this.bump = Math.max(0, this.bump - dt * 1.5);
    this.tilt.rotation.set(this.pitch, 0, this.roll);
    this.tilt.position.y = -Math.sin(this.bump * 12) * this.bump * 0.4;
    for (const w of this.wheels) {
      w.mesh.rotation.x = this.wheelSpin;
      w.piv.rotation.y = w.front ? -this.steerAngle : 0;
    }
  }
}

const _blocks = [];
const _hit = {};
function fx_smoke(x, y, z, dark) { FX.smoke(x, y, z, dark); }

// Pairwise car-car collisions with a rigid-body impulse.
const _ch = {};
export function collideCars(a, b, game) {
  const rr = a.radius + b.radius;
  const dx = a.x - b.x, dz = a.z - b.z;
  if (dx * dx + dz * dz > rr * rr) return;
  if (a.y > b.y + b.height - 0.3 || b.y > a.y + a.height - 0.3) return;
  if (!obbVsObb(a.obb, b.obb, _ch)) return;
  const ma = a.mass, mb = b.mass;
  const d = Math.min(_ch.depth, 1.2);
  a.x += _ch.nx * d * mb / (ma + mb); a.z += _ch.nz * d * mb / (ma + mb);
  b.x -= _ch.nx * d * ma / (ma + mb); b.z -= _ch.nz * d * ma / (ma + mb);
  const rax = _ch.cx - a.x, raz = _ch.cz - a.z, rbx = _ch.cx - b.x, rbz = _ch.cz - b.z;
  const vax = a.vx + a.w * raz, vaz = a.vz - a.w * rax;
  const vbx = b.vx + b.w * rbz, vbz = b.vz - b.w * rbx;
  const vn = (vax - vbx) * _ch.nx + (vaz - vbz) * _ch.nz;
  if (vn < 0) {
    const rna = (raz * _ch.nx - rax * _ch.nz) * 0.7, rnb = (rbz * _ch.nx - rbx * _ch.nz) * 0.7;
    const j = (-(1 + 0.3) * vn) / (1 / ma + 1 / mb + (rna * rna) / a.inertia + (rnb * rnb) / b.inertia);
    a.vx += (j * _ch.nx) / ma; a.vz += (j * _ch.nz) / ma; a.w += (j * rna) / a.inertia;
    b.vx -= (j * _ch.nx) / mb; b.vz -= (j * _ch.nz) / mb; b.w -= (j * rnb) / b.inertia;
    const impact = -vn;
    if (impact > 2) {
      game?.onCarImpact(a, b, impact, _ch.cx, _ch.cz);
      if (impact > 4) {
        a.damage((impact - 4) * 1.6 * (mb / (ma + mb)) * 2, game);
        b.damage((impact - 4) * 1.6 * (ma / (ma + mb)) * 2, game);
      }
    }
  }
  a.updateObb(); b.updateObb();
}
