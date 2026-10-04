// A walking body: capsule-ish physics on the town's blocks, standing on low things, bouncing on
// trampolines, getting flung by cars and lying there for a bit.

import { buildCharacter, animateCharacter } from './models.js';
import { queryBlocks, circleVsBlock, groundAt, groundInfo, topAt, RAMP } from '../world/collision.js';
import { dampAngle, yawTo } from '../util.js';

export const STEP = 0.45;
const GRAV = 24;
const _blocks = [], _hit = {};

export class Character {
  constructor(def, opts = {}) {
    this.def = def;
    this.model = buildCharacter(def);
    this.root = this.model.root;
    this.x = opts.x ?? 0; this.z = opts.z ?? 0; this.yaw = opts.yaw ?? 0;
    this.y = opts.y ?? groundAt(this.x, this.z, 0.2, 0.6);
    this.vx = 0; this.vz = 0; this.vy = 0;
    this.r = def.kind === 'monster' ? 0.55 : def.kind === 'adult' ? 0.36 : 0.32;
    this.state = 'normal';   // normal | flung | down | seated | hidden
    this.onGround = true;
    this.timer = 0;
    this.wishX = 0; this.wishZ = 0;
    this.faceWish = true;
    this.anim = { speed: 0, air: false, vy: 0, kick: 0, talk: false, seated: false, flung: false, down: false, t: Math.random() * 10, spin: 0, look: 0, wave: false, cheer: false, sprint: false };
    this.car = null;
    this.spin = 0; this.spinRate = 0;
    this.height = this.model.height;
    this.floats = def.kind === 'wizard' || def.kind === 'ghost';
    this.solid = true;
    this.sync(0);
  }

  get speed() { return Math.hypot(this.vx, this.vz); }

  teleport(x, z, yaw = this.yaw) {
    this.x = x; this.z = z; this.yaw = yaw;
    this.y = groundAt(x, z, 0.2, 0.6);
    this.vx = this.vz = this.vy = 0;
    this.onGround = true;
  }

  jump(v = 8.2) {
    if (this.state !== 'normal') return false;
    this.vy = v;
    this.onGround = false;
    return true;
  }

  fling(vx, vy, vz) {
    if (this.state === 'seated' || this.state === 'hidden' || this.invulnerable) return false;
    this.state = 'flung';
    this.vx = vx; this.vy = vy; this.vz = vz;
    this.onGround = false;
    this.spinRate = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 8);
    this.bounces = 0;
    return true;
  }

  step(dt, game) {
    if (this.state === 'seated' || this.state === 'hidden') return;
    if (this.state === 'down') {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'normal'; this.spin = 0; game?.onGetUp(this); }
      return;
    }
    if (this.state === 'flung') {
      this.vy -= GRAV * dt;
      this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
      this.spin += this.spinRate * dt;
      this.collideWalls(true);
      const gh = groundAt(this.x, this.z, this.y, 0.3);
      if (this.y <= gh && this.vy < 0) {
        this.y = gh;
        if (this.bounces < 1 && -this.vy > 4) {
          this.vy = -this.vy * 0.35; this.vx *= 0.5; this.vz *= 0.5; this.bounces++;
          game?.onBodyBounce(this);
        } else {
          this.state = 'down'; this.timer = 1.6 + Math.random() * 0.8;
          this.vx = this.vz = this.vy = 0;
        }
      }
      return;
    }
    // Normal locomotion: chase the wished-for velocity.
    const accel = this.onGround ? 42 : 14;
    const dvx = this.wishX - this.vx, dvz = this.wishZ - this.vz;
    const dl = Math.hypot(dvx, dvz), maxD = accel * dt;
    if (dl > maxD) { this.vx += (dvx / dl) * maxD; this.vz += (dvz / dl) * maxD; } else { this.vx = this.wishX; this.vz = this.wishZ; }
    this.vy -= GRAV * dt;
    this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
    this.collideWalls(false);
    let gh = groundAt(this.x, this.z, this.y, STEP);
    let gb = groundInfo.block;
    if (game) {
      const roof = game.carRoofAt(this.x, this.z, this.y + STEP);
      if (roof && roof.top > gh) { gh = roof.top; gb = null; this.standingOn = roof.car; } else this.standingOn = null;
    }
    if (this.y <= gh) {
      if (!this.onGround && this.vy < -6) { this.model.squash = 0.5; game?.onLand(this, -this.vy); }
      this.y = gh;
      this.vy = 0;
      this.onGround = true;
      if (gb && gb.kind === 'bounce') {
        this.vy = 15.5; this.onGround = false;
        this.model.squash = 0.6;
        game?.onBounce(this);
      }
    } else if (this.onGround && this.y - gh < 0.3 && this.vy <= 0) {
      this.y = gh; this.vy = 0;
    } else {
      this.onGround = false;
    }
    if (this.standingOn && this.onGround) {
      // Ride along on car roofs.
      this.x += this.standingOn.vx * dt; this.z += this.standingOn.vz * dt;
    }
    if (this.faceWish && Math.hypot(this.wishX, this.wishZ) > 0.5) this.yaw = dampAngle(this.yaw, yawTo(this.wishX, this.wishZ), 12, dt);
  }

  collideWalls(bouncy) {
    const r = this.r;
    const list = queryBlocks(this.x - r, this.z - r, this.x + r, this.z + r, _blocks);
    for (const b of list) {
      const top = b.shape === RAMP ? topAt(b, this.x, this.z) : b.top;
      if (top <= this.y + STEP) continue;
      if (!circleVsBlock(this.x, this.z, r, b, _hit)) continue;
      this.x += _hit.nx * _hit.depth;
      this.z += _hit.nz * _hit.depth;
      const vn = this.vx * _hit.nx + this.vz * _hit.nz;
      if (vn < 0) {
        const k = bouncy ? 1.5 : 1;
        this.vx -= _hit.nx * vn * k; this.vz -= _hit.nz * vn * k;
      }
    }
  }

  sync(dt) {
    const a = this.anim;
    a.t += dt;
    a.speed = this.state === 'normal' ? Math.hypot(this.vx, this.vz) : 0;
    a.air = !this.onGround && this.state === 'normal';
    a.vy = this.vy;
    a.flung = this.state === 'flung';
    a.down = this.state === 'down';
    a.seated = this.state === 'seated';
    if (a.kick > 0) a.kick = Math.max(0, a.kick - dt * 3.2);
    animateCharacter(this.model, a, dt);
    if (this.state === 'seated') return;
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.set(0, this.yaw, 0);
    if (this.state === 'flung') {
      this.root.rotation.x = this.spin;
      this.root.position.y += this.height * 0.4;
      this.model.body.position.y = -this.height * 0.4;
    } else if (this.state === 'down') {
      this.root.rotation.x = -Math.PI / 2;
      this.root.position.y += 0.25;
      this.model.body.position.y = 0;
    }
  }
}
