// A walking body: capsule-ish physics on the town's blocks, standing on low things, bouncing on
// trampolines, getting flung by cars and lying there for a bit. States: normal | flung | down |
// seated (in a car via game.seat, or in a plane seat via seatAt) | lying (on a sun lounger via lieAt,
// game/bathers.js; on the sand, game/beachDream.js) | hidden (no step, invisible).
// `tumble(secs, roll)`: a forward roll onto his back, then down (the glide's landing, game/glide.js).
// `flop(secs)`: flat on his belly, then up (the belly flop into the pool, game/poolJudges.js).
// `wade`: metres the standing model is sunk below his feet (waist-deep in the pool, game/poolFest.js).
// `leap`, `bomb`: the falls off the 10 m tower (arms out, the cannonball; game/diveTower.js).
// `placate`: 1 hands up to a barking watchdog, 2 arms out out of its reach (game/dogs.js).
// `rub`: 1 the hands on the shoulders of someone shorter in front, 2 rubbing (the sun cream, game/solkram.js).
// `eyesShut`: the lids down (the exercise on the lighthouse gallery, game/lighthouse.js).
// `tap`: the right hand down on the bell on a desk, his head bent to it (game/receptionBell.js).
// `scratch`: the right hand up at the side of his head, scratching it (game/church.js).
// `point`: the right arm out at something ahead (Ole at the shark fin, game/boatTrip.js).
// `fish`: Stig with the rod at the pier's end, `fishK` the move's 0..1 (game/fishing.js).
// `thumb`: the left arm out to the traffic, hitch-hiking; `ride`: standing in a grisbil's bed while
// 'seated' (the standing pose, not the seat's), `rideLean` his tip in rad (+: to his right; game/hitch.js).
// `kikare`: the lifeguard's binoculars in both hands, 'eyes' up at his eyes or 'low' at his chest
// (game/binoculars.js).

import { buildCharacter, animateCharacter } from './models.js';
import { queryBlocks, circleVsBlock, groundAt, groundInfo, topAt, RAMP } from '../world/collision.js';
import { dampAngle, yawTo } from '../util.js';

export const STEP = 0.45;
export const ANIM_FLAGS = ['wings', 'cupUp', 'cupHeld', 'push', 'planeSeat', 'hold', 'flail', 'oath', 'dance', 'laugh', 'slump', 'shoeOff', 'mirror', 'film', 'camShow', 'giraffe', 'butterKnife', 'carryOver', 'glide', 'swan', 'calc', 'ski', 'groda', 'ticket', 'leap', 'bomb', 'placate', 'rub', 'eyesShut', 'tap', 'scratch', 'point', 'fish', 'thumb', 'ride', 'kikare'];
export const GRAV = 24;
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
    this.state = 'normal';   // normal | flung | down | seated | lying | hidden
    this.onGround = true;
    this.timer = 0;
    this.wishX = 0; this.wishZ = 0;
    this.faceWish = true;
    this.anim = { speed: 0, air: false, vy: 0, kick: 0, talk: false, seated: false, flung: false, down: false, lie: null, t: Math.random() * 10, spin: 0, look: 0, wave: false, cheer: false, sprint: false, yell: false, hop: 0 };
    for (const f of ANIM_FLAGS) this.anim[f] = false;
    this.car = null;
    this.spin = 0; this.spinRate = 0;
    this.tumbleT = null; this.tumbleRoll = 0;
    this.flopped = false;
    this.liePose = null;     // lying: { x, y, z (the hips), yaw, lean, arms, tilt, lift }
    this.flip = false;       // flung with a somersault about his own right axis (fling's `flip`)
    this.height = this.model.height;
    this.floats = def.kind === 'wizard' || def.kind === 'ghost';
    this.solid = true;
    this.wade = 0;
    this.sync(0);
  }

  get speed() { return Math.hypot(this.vx, this.vz); }

  // Swap the look (outfits): rebuild the model under the same parent, keeping the transform, the
  // position, the state and the anim flags.
  setDef(def) {
    const old = this.root, parent = old.parent;
    this.def = def;
    this.model = buildCharacter(def);
    this.root = this.model.root;
    this.root.position.copy(old.position);
    this.root.rotation.copy(old.rotation);
    this.root.scale.copy(old.scale);
    this.root.visible = old.visible;
    if (parent) { parent.add(this.root); parent.remove(old); }
    this.height = this.model.height;
    this.sync(0);
    if (this.state === 'seated' && this.seatPose) this.placeSeated(this.seatPose);
  }

  // Plane seat: placed by hand (no car). x/y/z = the cushion (bubbles and markers read them).
  seatAt({ x, y, z, yaw = 0 }) {
    this.state = 'seated';
    this.anim.planeSeat = true;
    this.vx = this.vz = this.vy = 0;
    this.x = x; this.y = y; this.z = z; this.yaw = yaw;
    this.seatPose = { x, y, z, yaw };
    this.sync(0);
    this.placeSeated(this.seatPose);
  }
  placeSeated({ x, y, z, yaw }) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    this.root.position.set(x - fx * 0.12, y + 0.1 - this.model.legLen, z - fz * 0.12);
    this.root.rotation.set(0, yaw, 0);
    this.root.visible = true;
  }
  // On a sun lounger: the hips at (x, y, z), facing yaw (down the bed), leaning back `lean` (the
  // backrest's slope, negative) about them; no physics until something flings him or places him.
  // The anim pose reads the rest of `pose` (arms 'side' | 'belly', tilt, lift; models.js).
  lieAt(pose) {
    this.state = 'lying';
    this.flip = false;
    this.vx = this.vz = this.vy = 0;
    this.x = pose.x; this.y = pose.y; this.z = pose.z; this.yaw = pose.yaw;
    this.liePose = pose;
    this.sync(0);
  }
  standAt(x, z, yaw = this.yaw) {
    this.state = 'normal';
    this.anim.planeSeat = false;
    this.seatPose = null;
    this.teleport(x, z, yaw);
  }

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

  // `flip`: a somersault about his own right axis at that rate (rad/s, negative: backwards), from
  // the lean he had (a sunbather off his lounger, game/bathers.js); otherwise the tumble about the
  // world's X axis every flung body has.
  fling(vx, vy, vz, flip = 0) {
    if (this.state === 'seated' || this.state === 'hidden' || this.invulnerable) return false;
    const lean = this.state === 'lying' ? this.liePose.lean : 0;
    this.state = 'flung';
    this.liePose = null;
    if (this.tumbleT != null || this.flopped) { this.tumbleT = null; this.flopped = false; }
    this.root.rotation.order = 'XYZ';
    this.vx = vx; this.vy = vy; this.vz = vz;
    this.onGround = false;
    this.flip = !!flip;
    this.spin = flip ? lean : this.spin;
    this.spinRate = flip || (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 8);
    this.bounces = 0;
    return true;
  }

  // A forward roll over his head onto his back (`roll` s), then lying on his back until `secs` is
  // up, then up as from any fall (onGetUp). His momentum (vx, vz) carries the roll on a little, never
  // off an edge.
  tumble(secs, roll) {
    if (this.state !== 'normal') return false;
    this.state = 'down';
    this.timer = secs;
    this.tumbleT = 0; this.tumbleRoll = roll;
    this.vy = 0;
    return true;
  }

  // Flat on his belly where he landed for `secs`, then up as from any fall (onGetUp).
  flop(secs) {
    if (this.state !== 'normal') return false;
    this.state = 'down';
    this.timer = secs;
    this.flopped = true;
    this.vx = this.vz = this.vy = 0;
    return true;
  }

  step(dt, game) {
    if (this.state === 'seated' || this.state === 'hidden' || this.state === 'lying') return;
    if (this.state === 'down') {
      this.timer -= dt;
      if (this.tumbleT != null) {
        this.tumbleT += dt;
        const k = Math.exp(-6 * dt);
        this.vx *= k; this.vz *= k;
        const nx = this.x + this.vx * dt, nz = this.z + this.vz * dt, g = groundAt(nx, nz, this.y, STEP);
        if (Math.abs(g - this.y) < 0.3) { this.x = nx; this.z = nz; this.y = g; this.collideWalls(false); }
        else this.vx = this.vz = 0;
      }
      if (this.timer <= 0) {
        this.state = 'normal'; this.spin = 0;
        if (this.flopped) { this.flopped = false; this.root.rotation.order = 'XYZ'; }
        if (this.tumbleT != null) { this.tumbleT = null; this.vx = this.vz = 0; this.root.rotation.order = 'XYZ'; }
        game?.onGetUp(this);
      }
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
          if (this.flip) { this.flip = false; this.root.rotation.order = 'XYZ'; }
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
      if (!this.onGround && this.vy < -6) { this.model.squash = 0.5; game?.onLand(this, -this.vy, gh); }
      this.y = gh;
      this.vy = 0;
      this.onGround = true;
      if (gb && gb.kind === 'bounce') {
        this.vy = 15.5; this.onGround = false;
        this.model.squash = 0.6;
        game?.onBounce(this, gb);
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
    if (this.state === 'hidden') { this.root.visible = false; return; }
    const a = this.anim;
    a.t += dt;
    a.speed = this.state === 'normal' ? Math.hypot(this.vx, this.vz) : 0;
    a.air = !this.onGround && this.state === 'normal';
    a.vy = this.vy;
    a.flung = this.state === 'flung';
    a.down = this.state === 'down';
    a.seated = this.state === 'seated';
    a.lie = this.state === 'lying' ? this.liePose : null;
    if (a.kick > 0) a.kick = Math.max(0, a.kick - dt * 3.2);
    animateCharacter(this.model, a, dt);
    if (this.state === 'seated') return;
    if (a.lie) {
      // The hips at the pose's point: the root sits legLen below them along his leaned up axis (YXZ).
      const L = a.lie, r = this.root, ll = this.model.legLen, sl = Math.sin(L.lean);
      r.rotation.order = 'YXZ';
      r.rotation.set(L.lean, L.yaw, 0);
      r.position.set(L.x - ll * sl * Math.sin(L.yaw), L.y - ll * Math.cos(L.lean), L.z - ll * sl * Math.cos(L.yaw));
      this.model.body.position.y = 0;
      r.visible = true;
      return;
    }
    if (this.root.rotation.order === 'YXZ' && this.tumbleT == null && !this.flopped && !this.flip) this.root.rotation.order = 'XYZ';
    this.root.visible = true;
    this.root.position.set(this.x, this.y - (this.state === 'normal' ? this.wade : 0), this.z);
    this.root.rotation.set(0, this.yaw, 0);
    if (this.state === 'flung' && this.flip) {
      this.root.rotation.order = 'YXZ';
      this.root.rotation.set(this.spin, this.yaw, 0);
      this.root.position.y += this.height * 0.4;
      this.model.body.position.y = -this.height * 0.4;
    } else if (this.state === 'flung') {
      this.root.rotation.x = this.spin;
      this.root.position.y += this.height * 0.4;
      this.model.body.position.y = -this.height * 0.4;
    } else if (this.state === 'down' && this.tumbleT != null) {
      // The roll is about his own right axis (YXZ): upright, face down, upside down, on his back;
      // turning about his middle, held high enough that no part goes under the ground.
      const th = Math.min(1, this.tumbleT / this.tumbleRoll) * 1.5 * Math.PI, c = this.height * 0.5;
      this.root.rotation.order = 'YXZ';
      this.root.rotation.set(th, this.yaw, 0);
      this.root.position.y += c * Math.abs(Math.cos(th)) + 0.22 * Math.abs(Math.sin(th));
      this.model.body.position.y = -c;
    } else if (this.state === 'down' && this.flopped) {
      // Face down along his facing, head first (about his own right axis: YXZ, as the tumble).
      this.root.rotation.order = 'YXZ';
      this.root.rotation.set(Math.PI / 2, this.yaw, 0);
      this.root.position.y += 0.25;
      this.model.body.position.y = 0;
    } else if (this.state === 'down') {
      this.root.rotation.x = -Math.PI / 2;
      this.root.position.y += 0.25;
      this.model.body.position.y = 0;
    }
  }
}
