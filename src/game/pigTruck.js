import { PIG_TRUCK, UNLOCKS } from '../content/index.js';
import { pigMesh, PIG_SLOTS } from '../actors/car.js';
import { queryBlocks, circleVsBlock, circleVsObb, groundAt, topAt, RAMP } from '../world/collision.js';
import { lm } from '../world/layout.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt, pta } from '../strings.js';
import { dist, yawTo, dampAngle, damp, pick, clamp, lerp } from '../util.js';

const _bl = [], _h = {}, _w = { x: 0, y: 0, z: 0 };

// One pig off the grisbil's bed (Grisarna ramlar av grisbilen, DESIGN §10.15): `mode` fly (tumbling
// through the air) | down (on its side) | shake (up, shaking itself) | trot | roam (pottering, a
// pause or a short trot) | skip (a hop aside from a car) | carried (over Stig's head) | hop (a
// scripted arc: back into the bed, or over the fence into the pen) | pen (wandering in the pen).
// A plain bubble anchor for game.say ({ x, y, z, height }).
class LoosePig {
  constructor(scene, slot, x, y, z, yaw) {
    this.scene = scene;
    this.slot = slot;
    this.s = PIG_SLOTS[slot][3];
    this.mesh = pigMesh(this.s);
    this.mesh.rotation.order = 'YXZ';
    scene.add(this.mesh);
    this.x = x; this.y = y; this.z = z; this.yaw = yaw;
    this.vx = this.vz = this.vy = 0;
    this.roll = 0; this.spin = 0; this.rollTo = 0; this.bob = 0;
    this.mode = 'fly'; this.t = 0;
    this.dirX = 0; this.dirZ = 0; this.speed = 0;
    this.home = null;
    this.oinkT = -Infinity;
    this.height = 0.95 * this.s + 0.15;
  }
  get onFoot() { return this.mode === 'down' || this.mode === 'shake' || this.mode === 'trot' || this.mode === 'roam'; }
  get loose() { return this.onFoot || this.mode === 'fly' || this.mode === 'skip'; }

  // Horizontal move with the rabbits' wall rule (a block more than 0.5 m over its feet stops it).
  move(dx, dz) {
    const nx = this.x + dx, nz = this.z + dz;
    queryBlocks(nx - 0.4, nz - 0.4, nx + 0.4, nz + 0.4, _bl);
    for (const b of _bl) {
      const top = b.shape === RAMP ? topAt(b, nx, nz) : b.top;
      if (top > this.y + 0.5 && circleVsBlock(nx, nz, 0.35, b, _h)) return false;
    }
    this.x = nx; this.z = nz;
    return true;
  }
  ground() { return groundAt(this.x, this.z, this.y + 0.5, 0.5); }

  // A ballistic leg (fly, skip): true on the frame it lands.
  air(dt) {
    if (!this.move(this.vx * dt, this.vz * dt)) { this.vx *= -0.3; this.vz *= -0.3; }
    this.vy -= 20 * dt;
    this.y += this.vy * dt;
    const gh = this.ground();
    if (this.y > gh) return false;
    this.y = gh; this.vy = 0;
    return true;
  }

  // A scripted arc to `to()` (a live point: the bed moves) over `dur` s, `h` m over the higher end.
  hopTo(to, dur, h, done) {
    this.mode = 'hop'; this.t = 0;
    this.hop = { x0: this.x, y0: this.y, z0: this.z, to, dur, h, done, yaw0: this.yaw };
  }

  sync() {
    const lift = 0.33 * this.s * Math.abs(Math.sin(this.roll));
    this.mesh.position.set(this.x, this.y + lift + this.bob, this.z);
    this.mesh.rotation.set(0, this.yaw, this.roll);
  }

  remove() { this.scene.remove(this.mesh); }
}

export class PigTruck {
  constructor(game, cfg = PIG_TRUCK) {
    this.g = game;
    this.cfg = cfg;
    this.loose = [];        // LoosePig off the bed (not the pen's)
    this.pen = [];          // the last delivery's pigs, wandering in the pen
    this.queue = [];        // [{ at, fn }] (g.time)
    this.carry = null;      // our g.carrying while a pig is over Stig's head
    this.gapT = 0;          // no new fall until it runs out
    this.skidT = 0;         // skidding time (decays when not skidding)
    this.falls = 0;         // pigs fallen since the bed was last full at Flamenco (the clean pay)
    this.delivered = false; // the bed was emptied into the pen; it fills again at Flamenco
    this.busy = false;      // the delivery is playing
    this.fellOnce = false;  // Stig's "Oj! Grisen!" (the session's first fall)
    this.asked = -Infinity; // Stig asked Lasse (g.time)
    this.missingT = -Infinity;
    this.picked = null;     // the pickup line said last
    this.face = null;       // { key, until }: an NPC turned to Stig
    this.walk = null;       // the grisbonde's walk to the pen: { i, path, hold }
    this.steerFn = () => this.steerBonde();
    this.held = false;      // anything to release when free roam ends
    this.last = null;       // for tests: the last fall { t, why, slot, impact }
    this.paid = null;       // for tests: the last delivery { t, pay, clean }
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  truck() { const c = this.g.named[this.cfg.car]; return c && this.g.cars.includes(c) ? c : null; }
  bedFull(car) { return car.pigs.every((p) => p.in); }
  // The bed's middle in world space (0.28 × the length behind the car's middle).
  bed(car) {
    const b = -car.spec.len * 0.28;
    return { x: car.x + Math.sin(car.yaw) * b, y: car.y, z: car.z + Math.cos(car.yaw) * b };
  }
  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }
  stigSay(text, secs = 2.2) {
    const g = this.g;
    if (!text || g.saying(g.player)) return false;
    g.say(g.player, text, secs);
    return true;
  }
  // An NPC's line; his chatter clock restarts, so no chatter bubble lands on it (as the horn's answers).
  npcSay(n, text, secs) {
    this.g.say(n, text, secs);
    n.chatT = 7 + Math.random() * 6;
  }
  oink(pig, force = false) {
    const g = this.g, f = g.focus(), d = dist(pig.x, pig.z, f.x, f.z);
    if (!force && g.time - pig.oinkT < this.cfg.oinkEvery) return;
    pig.oinkT = g.time;
    if (d < 40) g.say(pig, this.cfg.oink, 1.2);
    if (d < 25) audio.oink();
  }

  // ---------------------------------------------------------------------------------------------
  // The falls

  // A landing (`land`) or a crash (`crash`) of the player's grisbil (main.onCarLanded/onCarImpact).
  jolt(car, kind, impact) {
    const g = this.g, c = this.cfg;
    if (!this.live || g.inDialog || !car || car !== g.playerCar || car !== this.truck() || car.dead) return;
    if (impact >= (kind === 'land' ? c.land : c.crash)) this.tip(car, kind, impact);
  }

  tip(car, why, impact = 0) {
    const g = this.g, c = this.cfg;
    if (this.gapT > 0 || this.delivered) return false;
    const slot = c.order.find((i) => car.pigs[i].in);
    if (slot == null) return false;
    this.gapT = c.gap;
    car.pigWorld(slot, _w);
    const [lx, , ry] = PIG_SLOTS[slot];
    const pig = new LoosePig(g.scene, slot, _w.x, _w.y, _w.z, car.yaw + ry);
    // Out over the side its slot is on (the front one either way), a little backwards, up.
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    const side = lx > 0.2 ? 1 : lx < -0.2 ? -1 : Math.random() < 0.5 ? 1 : -1;   // +1: the car's left (+x local)
    const f = c.fly;
    pig.vx = car.vx * f.keep - fx * f.back + fz * side * f.side;
    pig.vz = car.vz * f.keep - fz * f.back - fx * side * f.side;
    pig.vy = f.up;
    pig.spin = side * (8 + Math.random() * 4);
    car.setPig(slot, false);
    this.loose.push(pig);
    this.held = true;
    this.falls++;
    this.last = { t: g.time, why, slot, impact: +impact.toFixed(2) };
    if (!this.fellOnce) { this.fellOnce = true; this.later(0.5, () => this.stigSay(c.fall, 1.8)); }
    return true;
  }

  skid(car, dt) {
    const c = this.cfg;
    const on = !car.air && car.skidAmt >= c.skidAmt && car.speed >= c.skidMin;
    this.skidT = on ? this.skidT + dt : Math.max(0, this.skidT - dt);
    if (this.skidT >= c.skidSecs && this.tip(car, 'skid')) this.skidT = 0;
  }

  // ---------------------------------------------------------------------------------------------
  // The loose pigs

  // A car coming at (x, z) faster than `creep`: the way to skip aside, or null.
  threat(x, z) {
    const c = this.cfg;
    for (const car of this.g.cars) {
      const sp = car.speed;
      if (sp < c.creep || Math.abs(car.x - x) > 24 || Math.abs(car.z - z) > 24) continue;
      const vx = car.vx / sp, vz = car.vz / sp, dx = x - car.x, dz = z - car.z;
      const along = dx * vx + dz * vz, lat = dx * -vz + dz * vx;
      if (along > -1 && along < car.spec.len / 2 + sp * 0.6 + 2 && Math.abs(lat) < car.spec.wid / 2 + 1.6) {
        const s = lat >= 0 ? 1 : -1;
        return { x: -vz * s, z: vx * s };
      }
    }
    return null;
  }
  // Never under a car: a pig inside a car's box is pushed out of it.
  pushOut(pig) {
    for (const car of this.g.cars) {
      if (Math.abs(car.x - pig.x) > car.radius + 1 || Math.abs(car.z - pig.z) > car.radius + 1) continue;
      if (pig.y > car.y + car.height - 0.3) continue;
      if (!circleVsObb(pig.x, pig.z, 0.4, car.obb, _h)) continue;
      const dx = _h.nx * _h.depth, dz = _h.nz * _h.depth;
      if (!pig.move(dx, dz)) { pig.x += dx; pig.z += dz; }
    }
  }
  trot(pig, dx, dz, speed, secs) {
    const l = Math.hypot(dx, dz) || 1;
    pig.mode = 'trot'; pig.t = secs;
    pig.dirX = dx / l; pig.dirZ = dz / l; pig.speed = speed;
  }

  stepPig(pig, dt) {
    const g = this.g, c = this.cfg, p = g.player;
    pig.t -= dt;
    if (pig.mode === 'fly') {
      pig.roll += pig.spin * dt;
      if (pig.air(dt)) {
        pig.mode = 'down'; pig.t = c.downSecs;
        const s = Math.sin(pig.roll);
        pig.rollTo = (Math.abs(s) > 0.2 ? Math.sign(s) : Math.sign(pig.spin) || 1) * Math.PI / 2;
        pig.roll = Math.atan2(Math.sin(pig.roll), Math.cos(pig.roll));
        pig.home = { x: pig.x, z: pig.z };
        const f = g.focus();
        if (dist(pig.x, pig.z, f.x, f.z) < 30) audio.thud();
      }
    } else if (pig.mode === 'skip') {
      if (pig.air(dt)) { pig.mode = 'roam'; pig.t = 0.3; pig.speed = 0; }
    }
    if (pig.mode === 'fly' || pig.mode === 'skip') { pig.bob = 0; return; }
    // On its feet (or its side): skip aside from a car coming at it, never under one.
    const th = this.threat(pig.x, pig.z);
    if (th) {
      pig.mode = 'skip'; pig.roll = 0;
      pig.vx = th.x * c.dodge; pig.vz = th.z * c.dodge; pig.vy = 4.2;
      pig.yaw = yawTo(th.x, th.z);
      this.oink(pig);
      return;
    }
    // Keep to the ground (a step down is a fall).
    const gh = pig.ground();
    if (gh < pig.y - 0.4) { pig.mode = 'skip'; pig.vx = pig.vz = pig.vy = 0; return; }
    pig.y = gh;
    if (pig.mode === 'down') {
      pig.roll = damp(pig.roll, pig.rollTo, 16, dt);
      // The landing's slide.
      const k = Math.exp(-7 * dt);
      pig.vx *= k; pig.vz *= k;
      if (!pig.move(pig.vx * dt, pig.vz * dt)) pig.vx = pig.vz = 0;
      if (pig.t <= 0) { pig.mode = 'shake'; pig.t = c.shakeSecs; this.oink(pig, true); }
    } else if (pig.mode === 'shake') {
      const up = c.shakeSecs - pig.t;
      pig.roll = up < 0.2 ? damp(pig.roll, 0, 18, dt) : Math.sin(up * 42) * 0.3 * Math.max(0, pig.t / c.shakeSecs);
      if (pig.t <= 0) {
        pig.roll = 0;
        // Off, away from the truck (or Stig, on foot) and a little to the side.
        const car = this.truck(), from = !g.playerCar && p.state === 'normal' ? p : car || p;
        const a = yawTo(pig.x - from.x, pig.z - from.z) + (Math.random() - 0.5) * 1.2;
        this.trot(pig, Math.sin(a), Math.cos(a), c.trot, c.trotSecs);
      }
    } else {
      // Shy of Stig on foot (but slower than his walk); pottering round where it landed.
      const near = !g.playerCar && p.state === 'normal' && dist(p.x, p.z, pig.x, pig.z) < c.shyR;
      if (near) this.trot(pig, pig.x - p.x + (Math.random() - 0.5) * 0.4, pig.z - p.z + (Math.random() - 0.5) * 0.4, c.shy, 0.4);
      else if (pig.t <= 0) {
        if (pig.mode === 'trot' || Math.random() < 0.4) { pig.mode = 'roam'; pig.t = 0.6 + Math.random() * 1.2; pig.speed = 0; }
        else {
          const h = pig.home || pig, hx = h.x - pig.x, hz = h.z - pig.z, hd = Math.hypot(hx, hz);
          const a = Math.random() * Math.PI * 2;
          const pull = hd > c.roamR ? 2 / hd : 0;
          this.trot(pig, Math.sin(a) + hx * pull, Math.cos(a) + hz * pull, c.trot * 0.6, 0.8 + Math.random() * 1.2);
        }
      }
      if (pig.mode === 'trot') {
        if (!pig.move(pig.dirX * pig.speed * dt, pig.dirZ * pig.speed * dt)) {
          // A wall: turn off it (right or left of where it came from).
          const a = yawTo(-pig.dirX, -pig.dirZ) + (Math.random() < 0.5 ? 1 : -1) * (0.9 + Math.random() * 0.9);
          pig.dirX = Math.sin(a); pig.dirZ = Math.cos(a);
        }
        pig.yaw = dampAngle(pig.yaw, yawTo(pig.dirX, pig.dirZ), 10, dt);
        pig.bob = Math.abs(Math.sin((pig.phase = (pig.phase || 0) + pig.speed * dt * 3.2))) * 0.07;
      } else pig.bob = damp(pig.bob, 0, 12, dt);
    }
    this.pushOut(pig);
  }

  stepHop(pig, dt) {
    const h = pig.hop;
    pig.t += dt;
    const k = Math.min(1, pig.t / h.dur), q = h.to();
    pig.x = lerp(h.x0, q.x, k); pig.z = lerp(h.z0, q.z, k);
    const top = Math.max(h.y0, q.y) + h.h;
    // A parabola through (0, y0), (1, q.y) peaking near `top`.
    pig.y = lerp(h.y0, q.y, k) + 4 * (top - (h.y0 + q.y) / 2) * k * (1 - k);
    if (q.yaw != null) pig.yaw = h.yaw0 + Math.atan2(Math.sin(q.yaw - h.yaw0), Math.cos(q.yaw - h.yaw0)) * k;
    pig.roll = 0; pig.bob = 0;
    if (k >= 1) h.done();
  }

  stepPen(pig, dt) {
    const c = this.cfg;
    pig.t -= dt;
    if (pig.t <= 0) {
      if (pig.speed > 0) { pig.speed = 0; pig.t = 1 + Math.random() * 2.5; }
      else {
        const q = this.g.lmOffset(c.pen.lm, (Math.random() * 2 - 1) * c.pen.hw, (Math.random() * 2 - 1) * c.pen.hd);
        pig.goal = q; pig.speed = 1.1; pig.t = 6;
      }
    }
    if (pig.speed > 0 && pig.goal) {
      const dx = pig.goal.x - pig.x, dz = pig.goal.z - pig.z, d = Math.hypot(dx, dz);
      if (d < 0.2) { pig.speed = 0; pig.t = 1 + Math.random() * 2.5; }
      else {
        const s = Math.min(d, pig.speed * dt);
        pig.x += (dx / d) * s; pig.z += (dz / d) * s;
        pig.yaw = dampAngle(pig.yaw, yawTo(dx, dz), 6, dt);
        pig.bob = Math.abs(Math.sin((pig.phase = (pig.phase || 0) + pig.speed * dt * 3.2))) * 0.05;
      }
    } else pig.bob = damp(pig.bob, 0, 12, dt);
    pig.y = pig.ground();
  }

  // ---------------------------------------------------------------------------------------------
  // Catching

  pickUp(pig) {
    const g = this.g, c = this.cfg, p = g.player;
    pig.mode = 'carried';
    this.carry = { who: 'gris', job: 'pigs' };
    g.carrying = this.carry;
    g.speedCap = g.levelDef.speeds.walk;
    p.anim.carryOver = true;
    g.bumpedT = 0;
    g.unsay(pig);
    const first = this.picked == null;
    if (first || Math.random() < c.pickChance) {
      const text = first ? c.pickup[0] : pick(c.pickup.filter((l) => l !== this.picked));
      if (this.stigSay(text)) this.picked = text;
    }
  }
  unhold() {
    const g = this.g;
    if (this.carry && g.carrying === this.carry) {
      g.carrying = null;
      g.speedCap = null;
      g.player.anim.carryOver = false;
    }
    this.carry = null;
  }
  // Off his head: it tumbles down and trots off again.
  drop(pig, vx, vy, vz) {
    this.unhold();
    pig.mode = 'fly';
    pig.vx = vx; pig.vy = vy; pig.vz = vz;
    pig.spin = (Math.random() < 0.5 ? 1 : -1) * 7;
  }
  carried(pig, car) {
    const g = this.g, p = g.player, c = this.cfg;
    if (g.carrying !== this.carry) { this.carry = null; return this.drop(pig, 0, 2, 0); }
    if (p.state === 'flung' || p.state === 'down') return this.drop(pig, p.vx * 0.7, 4, p.vz * 0.7);
    if (g.bumpedT > 0 || g.frozenT > 0 || g.playerCar) return this.drop(pig, 0, 2.5, 0);
    // Over his head on the raised hands, across him, its legs paddling.
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    pig.x = p.x + fx * 0.05; pig.z = p.z + fz * 0.05; pig.y = p.y + p.height + 0.08;
    pig.yaw = p.yaw + Math.PI / 2;
    pig.roll = Math.sin(g.time * 11) * 0.12; pig.bob = 0;
    if (!car || car.dead || g.inDialog || p.state !== 'normal') return;
    const b = this.bed(car);
    if (dist(p.x, p.z, b.x, b.z) < c.bedR && Math.abs(p.y - car.y) < 1.6) {
      this.unhold();
      this.intoBed(pig, car, 0.4);
    }
  }
  intoBed(pig, car, dur) {
    const slot = pig.slot;
    pig.hopTo(() => { car.pigWorld(slot, _w); return { x: _w.x, y: _w.y, z: _w.z, yaw: car.yaw + PIG_SLOTS[slot][2] }; }, dur, 0.9, () => {
      this.dropPig(pig);
      if (this.truck() === car && !car.dead) car.setPig(slot, true);
    });
  }
  dropPig(pig) {
    const i = this.loose.indexOf(pig);
    if (i >= 0) this.loose.splice(i, 1);
    this.g.unsay(pig);
    pig.remove();
  }

  catching(car) {
    const g = this.g, p = g.player, c = this.cfg;
    if (g.inDialog) return;
    if (!g.playerCar && !g.carrying && p.state === 'normal') {
      for (const pig of this.loose) {
        if (pig.onFoot && dist(p.x, p.z, pig.x, pig.z) < c.catchR && Math.abs(pig.y - p.y) < 1.2) { this.pickUp(pig); break; }
      }
    }
    // Rolling up to it slowly (not standing: it trots off first) once it is up and about.
    if (car && g.playerCar === car && !car.dead && car.speed > 0.3 && car.speed < c.creep) {
      const b = this.bed(car);
      for (const pig of this.loose) {
        if ((pig.mode === 'trot' || pig.mode === 'roam') && dist(b.x, b.z, pig.x, pig.z) < c.carCatchR && Math.abs(pig.y - car.y) < 1.2) this.intoBed(pig, car, 0.45);
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The pen, the pay, the refill

  zone() { const z = lm(this.cfg.zone.lm); return z; }
  inZone(car) { const z = this.zone(); return dist(car.x, car.z, z.x, z.z) < this.cfg.zone.r; }

  delivering(car) {
    const g = this.g, c = this.cfg;
    if (this.busy || this.delivered || g.inDialog || g.playerCar !== car || car.dead) return;
    if (car.speed >= c.zone.stop || !this.inZone(car)) return;
    if (!this.bedFull(car)) {
      // In the yard with a pig or two missing: the grisbonde counts them.
      if (this.loose.length && g.time - this.missingT > 10) {
        this.missingT = g.time;
        const n = this.bonde();
        if (n) { this.npcSay(n, c.missing, 2.4); this.face = { key: 'grisbonde', until: g.time + 2.4 }; }
      }
      return;
    }
    this.deliver(car);
  }
  bonde() {
    const g = this.g, n = g.npc('grisbonde'), f = g.focus();
    return n && g.honk.free('grisbonde') && dist(n.x, n.z, f.x, f.z) < 45 ? n : null;
  }

  // The grisbonde walks over to the pen when his grisbil comes into the yard with pigs in it
  // (`bonde.r` m from the zone; `bonde.path`: [left, forward] from the zone's landmark), and stays
  // there until it has gone again or `bonde.hold` s after his thanks; placeNpcs takes him home once
  // Stig is far off (its 50 m rule).
  walking(car) {
    const g = this.g, c = this.cfg.bonde, n = g.npc('grisbonde');
    if (!n) return;
    const z = this.zone();
    const want = !!car && !car.dead && g.playerCar === car && !this.delivered && dist(car.x, car.z, z.x, z.z) < c.r && g.honk.free('grisbonde');
    if (want && !this.walk) {
      this.walk = { i: 0, path: c.path.map(([dx, dz]) => g.lmOffset(this.cfg.zone.lm, dx, dz)), hold: 0 };
      n.steer = this.steerFn;
    } else if (this.walk && !want && !this.busy && g.time > this.walk.hold) this.endWalk();
  }
  steerBonde() {
    const w = this.walk, n = this.g.npc('grisbonde');
    if (!w || n.state !== 'normal' || !this.g.honk.free('grisbonde')) return null;
    let q = w.path[w.i];
    if (dist(n.x, n.z, q.x, q.z) < 0.5) {
      if (w.i === w.path.length - 1) return null;
      q = w.path[++w.i];
    }
    const dx = q.x - n.x, dz = q.z - n.z, d = Math.hypot(dx, dz) || 1, sp = Math.min(this.cfg.bonde.walk, 0.6 + d * 2);
    return { x: (dx / d) * sp, z: (dz / d) * sp };
  }
  endWalk() {
    const n = this.g.npc('grisbonde');
    if (n && n.steer === this.steerFn) delete n.steer;
    this.walk = null;
  }

  deliver(car) {
    const g = this.g, c = this.cfg;
    this.busy = true;
    this.delivered = true;
    this.held = true;
    for (const pig of this.pen) { g.unsay(pig); pig.remove(); }
    this.pen = [];
    const clean = this.falls === 0, pay = clean ? c.cleanPay : c.pay;
    c.order.forEach((slot, k) => this.later(0.25 + k * 0.45, () => {
      car.pigWorld(slot, _w);
      car.setPig(slot, false);
      const pig = new LoosePig(g.scene, slot, _w.x, _w.y, _w.z, car.yaw + PIG_SLOTS[slot][2]);
      // Spread over the pen: its back, middle and front third, across at random.
      const spot = g.lmOffset(c.pen.lm, (Math.random() * 2 - 1) * c.pen.hw * 0.8, (k - 1) * c.pen.hd * 0.6);
      spot.y = groundAt(spot.x, spot.z, 0.6, 0.6);
      spot.yaw = yawTo(spot.x - _w.x, spot.z - _w.z);
      pig.hopTo(() => spot, 0.95, 2.4, () => { pig.mode = 'pen'; pig.t = 0.4 + Math.random(); pig.speed = 0; if (k === 2) this.oink(pig, true); });
      this.pen.push(pig);
    }));
    this.later(0.25 + 3 * 0.45 + 0.6, () => {
      const n = this.bonde();
      if (n) { this.npcSay(n, c.thanks, 2.8); this.face = { key: 'grisbonde', until: g.time + 3 }; }
      if (this.walk) this.walk.hold = g.time + c.bonde.hold;
      g.addCoins(pay);
      audio.coin();
      hud.toast(fmt(c.paidToast, { n: pta(pay) }));
      this.paid = { t: g.time, pay, clean };
      if (!clean) this.later(c.sickGap, () => this.stigSay(c.sick, 2.6));
      this.busy = false;
    });
  }

  bay() { const u = UNLOCKS[this.cfg.car]?.car; return u ? this.g.lmOffset(u.at, u.dx ?? 0, u.dz ?? 0) : null; }
  refill(car) {
    const g = this.g, c = this.cfg;
    if (this.busy || this.carry || g.playerCar === car || car.dead) return;
    if (this.bedFull(car) && !this.delivered) return;
    const b = this.bay(), f = g.focus();
    // Not while he is after a pig of its: only an empty bed, or pigs left far behind.
    if (!this.delivered && this.loose.some((pig) => dist(pig.x, pig.z, f.x, f.z) < 60)) return;
    if (!b || dist(car.x, car.z, b.x, b.z) > c.home.r || dist(f.x, f.z, car.x, car.z) < c.home.away) return;
    this.fill(car);
  }
  // Every pig back in the bed (the loose ones taken away): a refill, or free roam ending.
  fill(car) {
    for (const pig of this.loose.slice()) this.dropPig(pig);
    if (car) for (let i = 0; i < car.pigs.length; i++) car.setPig(i, true);
    this.delivered = false;
    this.falls = 0;
  }

  // ---------------------------------------------------------------------------------------------
  // Lasse

  asking() {
    const g = this.g, c = this.cfg, p = g.player;
    if (g.inDialog || g.playerCar || g.carrying || p.state !== 'normal' || g.time - this.asked < c.askEvery) return;
    if (!this.loose.some((pig) => pig.onFoot && dist(pig.x, pig.z, p.x, p.z) < c.askR)) return;
    const n = g.npc('lasse');
    if (!n || !g.honk.free('lasse') || dist(n.x, n.z, p.x, p.z) > c.lasseR || g.saying(n)) return;
    if (!this.stigSay(c.ask, 2)) return;
    this.asked = g.time;
    this.face = { key: 'lasse', until: g.time + c.refuseGap + 2.4 };
    n.chatT = Math.max(n.chatT ?? 0, c.refuseGap + 1);
    this.later(c.refuseGap, () => { if (g.honk.free('lasse')) this.npcSay(n, c.refuse, 2.6); });
  }

  // ---------------------------------------------------------------------------------------------

  update(dt) {
    const g = this.g;
    if (!this.live) { this.release(); return; }
    const car = this.truck();
    if (!car || car.dead) { if (this.loose.length || this.carry) this.clear(car); }
    // A new grisbil (respawned) comes with a full bed.
    else if (this.delivered && !this.busy && this.bedFull(car)) this.delivered = false;
    this.gapT -= dt;
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      q.fn();
    }
    if (car && !car.dead && g.playerCar === car && !g.inDialog) this.skid(car, dt);
    else this.skidT = 0;
    for (const pig of this.loose.slice()) {
      if (pig.mode === 'carried') this.carried(pig, car);
      else if (pig.mode === 'hop') this.stepHop(pig, dt);
      else this.stepPig(pig, dt);
      pig.sync();
    }
    for (const pig of this.pen) {
      if (pig.mode === 'hop') this.stepHop(pig, dt);
      else this.stepPen(pig, dt);
      pig.sync();
    }
    if (car && !car.dead) {
      this.catching(car);
      this.delivering(car);
      this.refill(car);
    }
    this.walking(car);
    this.asking();
    if (this.face) {
      const n = g.npc(this.face.key), p = g.player;
      if (g.time > this.face.until || !n || !g.honk.free(this.face.key)) this.face = null;
      else n.yaw = dampAngle(n.yaw, yawTo(p.x - n.x, p.z - n.z), 6, dt);
    }
  }

  // The grisbil gone or wrecked: its loose pigs go with it (the bed counts as full again).
  clear(car) {
    this.unhold();
    for (const pig of this.loose.slice()) this.dropPig(pig);
    if (car) for (let i = 0; i < car.pigs.length; i++) if (!this.delivered) car.setPig(i, true);
  }

  // Free roam ends (a mission, the other level): the carried and loose pigs are back in the bed and
  // the pen is empty; a delivered bed stays empty until Flamenco.
  release() {
    if (!this.held && !this.queue.length && !this.carry && !this.walk) return;
    const g = this.g, car = this.truck();
    this.unhold();
    this.endWalk();
    this.queue.length = 0;
    this.busy = false;
    this.face = null;
    this.skidT = 0;
    for (const pig of this.loose.slice()) this.dropPig(pig);
    for (const pig of this.pen) { g.unsay(pig); pig.remove(); }
    this.pen = [];
    if (car) for (let i = 0; i < car.pigs.length; i++) car.setPig(i, !this.delivered);
    this.held = false;
  }

  // ---------------------------------------------------------------------------------------------
  // HUD (free roam, after the mission's, the paint shop's, the Berra job's and Eslövloppet's)

  focusPig() {
    const f = this.g.focus();
    let best = null, bd = Infinity;
    for (const pig of this.loose) {
      if (pig.mode === 'carried' || pig.mode === 'hop') continue;
      const d = dist(pig.x, pig.z, f.x, f.z);
      if (d < bd) { bd = d; best = pig; }
    }
    return best;
  }
  shown() {
    const g = this.g;
    return this.live && !this.busy && !g.inDialog && !!this.truck() && !this.truck().dead;
  }
  target() {
    if (!this.shown()) return null;
    const g = this.g, car = this.truck();
    if (this.carry) { const b = this.bed(car); return { x: b.x, z: b.z, follow: true }; }
    const pig = this.focusPig();
    if (pig) return { x: pig.x, z: pig.z, follow: true };
    if (g.playerCar === car && !this.delivered && this.bedFull(car)) { const z = this.zone(); return { x: z.x, z: z.z, r: this.cfg.zone.r }; }
    return null;
  }
  objective() {
    if (!this.shown()) return null;
    const g = this.g, c = this.cfg, car = this.truck();
    if (this.carry) return { title: c.title, text: c.carryText };
    const n = this.loose.filter((pig) => pig.mode !== 'hop').length;
    if (n) return { title: c.title, text: n > 1 ? fmt(c.looseMany, { n }) : c.looseText };
    if (g.playerCar === car && !this.delivered && this.bedFull(car)) return { title: c.title, text: c.homeText };
    return null;
  }
  markers() {
    if (!this.shown()) return [];
    return this.loose.filter((pig) => pig.mode !== 'carried' && pig.mode !== 'hop').map((pig) => ({ type: 'friend', x: pig.x, z: pig.z, edge: true }));
  }
}
