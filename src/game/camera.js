// Third-person camera: free mouse-look on foot, a chase cam in cars that swings in behind the
// direction of travel, pulled in when a wall gets between it and you. A level can set a profile
// (the cabin's steep dollhouse view: no pull-in, clamped pitch, eye z clamped inside the cabin).
//   profile = { pivotH, dist, pitchMin, pitchMax, pitch0, noPull, fov, cineSide, cineUp, clampZ? }

import { THREE } from '../gfx.js';
import { segmentBlocked } from '../world/collision.js';
import { clamp, damp, dampAngle } from '../util.js';

export class CamRig {
  constructor(cam) {
    this.cam = cam;
    this.yaw = Math.PI;
    this.pitch = 0.3;
    this.dist = 6;
    this.manualT = 0;
    this.pos = new THREE.Vector3(0, 10, 10);
    this.look = new THREE.Vector3();
    this.shake = 0;
    this.fov = 62;
    this.cine = null; // { pos, look } for dialogue framing and cutaways
    this.snapNext = true;
    this.profile = null;
    this.clampActive = false; // set each frame by main: flight level && cabin.inCabin(focus)
  }

  setProfile(p) {
    this.profile = p || null;
    if (p) this.pitch = p.pitch0 ?? this.pitch;
    else this.pitch = clamp(this.pitch, -0.25, 1.15);
    this.snapNext = true;
  }

  update(dt, focus, look, cars = []) {
    const cam = this.cam;
    const pf = this.profile;
    if (this.cine) {
      if (this.snapNext) { this.pos.copy(this.cine.pos); this.look.copy(this.cine.look); this.snapNext = false; }
      this.pos.lerp(this.cine.pos, 1 - Math.exp(-4 * dt));
      this.look.lerp(this.cine.look, 1 - Math.exp(-5 * dt));
      cam.position.copy(this.pos);
      cam.lookAt(this.look);
      this.fov = damp(this.fov, pf ? pf.fov : 50, 4, dt);
      cam.fov = this.fov; cam.updateProjectionMatrix();
      return;
    }
    const pMin = pf && !focus.car ? pf.pitchMin : -0.25, pMax = pf && !focus.car ? pf.pitchMax : 1.15;
    if (look && (Math.abs(look.x) > 0.1 || Math.abs(look.y) > 0.1)) {
      // Clamp: some browsers deliver a huge jump on the first pointer-locked move.
      this.yaw -= clamp(look.x, -250, 250) * 0.0024;
      this.pitch = clamp(this.pitch + clamp(look.y, -250, 250) * 0.002, pMin, pMax);
      this.manualT = 1.8;
    }
    this.manualT -= dt;
    let pivotH, dist, lead = 0;
    if (focus.car) {
      const car = focus.car, sp = car.speed;
      const vyaw = sp > 3 ? Math.atan2(car.vx, car.vz) : car.yaw;
      const reversing = car.forwardSpeed < -2;
      const want = reversing ? car.yaw : vyaw;
      if (this.manualT <= 0) {
        this.yaw = dampAngle(this.yaw, want, sp > 1 ? 3.2 : 1.2, dt);
        this.pitch = damp(this.pitch, 0.22, 2, dt);
      }
      if (focus.lookBack) this.yaw = want + Math.PI;
      pivotH = car.height + 0.9;
      dist = 5.2 + car.spec.len * 0.75 + Math.min(4, sp * 0.1);
      lead = Math.min(3, sp * 0.12);
      this.fov = damp(this.fov, 62 + Math.min(14, sp * 0.4), 3, dt);
    } else {
      pivotH = pf ? pf.pivotH : 1.55;
      dist = pf ? pf.dist : 6.0;
      this.pitch = clamp(this.pitch, pMin, pMax);
      this.fov = damp(this.fov, pf ? pf.fov : 62, 3, dt);
      // Ease in behind the player when they run and leave the mouse alone.
      if (this.manualT <= 0 && focus.speed > 3 && focus.autoTurn) this.yaw = dampAngle(this.yaw, focus.yaw, 0.9, dt);
    }
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const px = focus.x, py = focus.y + pivotH, pz = focus.z;
    let pitch = this.pitch;
    let d = dist;
    let hit = -1;
    // Pull in if a building is in the way (not with a noPull profile: its eye is above every wall).
    if (!(pf && pf.noPull && !focus.car)) {
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const tx = px - fx * cp * d, tz = pz - fz * cp * d, ty = py + sp * d;
      hit = segmentBlocked(px, pz, tx, tz, Math.min(py, ty) + 0.3);
      if (hit >= 0) d = Math.max(1.6, hit * d - 0.6);
    }
    let h = Math.cos(pitch) * d;
    // Cabin: keep the eye's z inside the cabin; steepen the pitch to keep the distance.
    if (pf && pf.clampZ && this.clampActive && !focus.car && Math.abs(fz) > 1e-3) {
      const ez = pz - fz * h;
      const cz = clamp(ez, pf.clampZ[0], pf.clampZ[1]);
      if (cz !== ez) {
        h = Math.max(0, (pz - cz) / fz);
        pitch = Math.acos(clamp(h / d, 0, 1));
      }
    }
    const want = new THREE.Vector3(px - fx * h, Math.max(focus.y + 0.6, py + Math.sin(pitch) * d), pz - fz * h);
    if (this.snapNext) { this.pos.copy(want); this.snapNext = false; }
    else {
      const k = focus.car ? 10 : 14;
      this.pos.x = damp(this.pos.x, want.x, k, dt);
      this.pos.y = damp(this.pos.y, want.y, k * 0.7, dt);
      this.pos.z = damp(this.pos.z, want.z, k, dt);
      // Never lag so far behind that a wall slips between us.
      if (hit >= 0) this.pos.copy(want);
    }
    this.look.set(px + fx * lead, py - 0.2 + (focus.car ? 0 : 0.1), pz + fz * lead);
    // Never sit inside another car: ride up over its roof instead.
    for (const c of cars) {
      if (c === focus.car || Math.abs(c.x - this.pos.x) > c.radius + 1 || Math.abs(c.z - this.pos.z) > c.radius + 1) continue;
      const dx = this.pos.x - c.x, dz = this.pos.z - c.z, cfx = Math.sin(c.yaw), cfz = Math.cos(c.yaw);
      if (Math.abs(dx * cfx + dz * cfz) < c.spec.len / 2 + 0.6 && Math.abs(dx * -cfz + dz * cfx) < c.spec.wid / 2 + 0.6) {
        this.pos.y = Math.max(this.pos.y, c.y + c.height + 0.7);
      }
    }
    cam.position.copy(this.pos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.35;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
      cam.position.z += (Math.random() - 0.5) * s;
    }
    cam.lookAt(this.look);
    cam.fov = this.fov;
    cam.updateProjectionMatrix();
  }

  // Frame two people talking. Bigmouth: from the side, at least 4.5 m out. With a profile: from
  // above and a little to the side (pos = mid + perp * min(d, cineSide) + up * cineUp).
  frame(a, b) {
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    let nx = -dz / l, nz = dx / l;
    const top = Math.max(a.height || 1.6, b.height || 1.6);
    const headY = Math.max(a.y, b.y) + top * 0.72;
    // Prefer the side the camera is already on.
    if ((this.pos.x - mx) * nx + (this.pos.z - mz) * nz < 0) { nx = -nx; nz = -nz; }
    const pf = this.profile;
    if (pf) {
      const d = Math.min(Math.max(4.5, l * 1.6 + 2.5), pf.cineSide);
      this.cine = { pos: new THREE.Vector3(mx + nx * d, headY + pf.cineUp, mz + nz * d), look: new THREE.Vector3(mx, headY, mz) };
      return;
    }
    const d = Math.max(4.5, l * 1.6 + 2.5);
    let px = mx + nx * d, pz = mz + nz * d;
    if (segmentBlocked(mx, mz, px, pz, 1.5) >= 0) { px = mx - nx * d; pz = mz - nz * d; }
    this.cine = { pos: new THREE.Vector3(px, Math.max(a.y, b.y) + top * 0.75 + 0.6, pz), look: new THREE.Vector3(mx, headY, mz) };
  }

  // Frame one character, from in front of them (both modes).
  frameOne(a) {
    const fx = Math.sin(a.yaw || 0), fz = Math.cos(a.yaw || 0);
    const top = a.height || 1.8;
    const headY = a.y + top * 0.8;
    const pf = this.profile;
    if (pf) {
      this.cine = { pos: new THREE.Vector3(a.x + fx * pf.cineSide, headY + pf.cineUp, a.z + fz * pf.cineSide), look: new THREE.Vector3(a.x, headY, a.z) };
      return;
    }
    let px = a.x + fx * 3.6, pz = a.z + fz * 3.6;
    if (segmentBlocked(a.x, a.z, px, pz, a.y + 1.4) >= 0) { px = a.x - fx * 3.6; pz = a.z - fz * 3.6; }
    this.cine = { pos: new THREE.Vector3(px, headY + 0.6, pz), look: new THREE.Vector3(a.x, headY - 0.1, a.z) };
  }

  // A fixed cutaway: camera at pos looking at look ({x, y, z} each). release() returns.
  cutTo(pos, look) {
    this.cine = { pos: new THREE.Vector3(pos.x, pos.y, pos.z), look: new THREE.Vector3(look.x, look.y, look.z) };
    this.snapNext = true;
  }

  release() {
    if (!this.cine) return;
    // Resume behind wherever the cinematic camera ended up looking.
    this.cine = null;
  }
}
