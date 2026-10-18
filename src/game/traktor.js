// Traktorn med släpkärran (free roam; feature 121, DESIGN §10.54). By the tool hut in the tomato fields
// on (1,0) stands the farmer's small red tractor with a trailer of tomato boxes: a named parked car of
// the toy type `traktor` (car.js), never a mission's. On the island with no mission running
// (`missions.state === 'idle'`) Stig borrows it with E ("Jag lånar den bara en liten stund!"), and the
// farmer comes out of the hut's door and runs after it shouting, never catching up (he keeps `keep` m
// behind its tail), until he gives up and walks back in. At 18 km/h the island's traffic queues and
// honks behind it, every bush row of a tomato field jolts it, and Stig has an inclination to travel
// sickness. A mission start sends the tractor home and the farmer in; between missions a tractor left
// elsewhere, or wrecked, is back on its spot once nobody sees it (the farmer fetched it). Config:
// TRAKTORN (content/island.js). Owned by Game as `traktor`: main.js calls `update` once a frame (after
// syncAll: the jolts go on top of the car's synced tilt) and `step` in its fixed step, asks
// `prompt(car)` for the car prompt and `refuse()` from enterCar, calls `onHonk(car)` from game.onHonk
// and counts `extras` (the farmer while he is out) as people.

import { TRAKTORN } from '../content/index.js';
import { THREE, scene, camera } from '../gfx.js';
import { Character } from '../actors/character.js';
import { TOMATO_ROWS } from '../world/blocks/nature.js';
import { spawnDebris } from '../world/props.js';
import { lm, isRoad } from '../world/layout.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { dist, yawTo, dampAngle } from '../util.js';

const AXLES = [[2.5, 1], [0.7, 0.8], [-2.1, 0.5]];   // [car-local z, jolt share]: front, rear, the trailer's
const LEAF = [0x4f8a3a, 0x67a446, 0xd8321e];
const K = 160, DAMP = 9;                             // the jolts' spring
const _p = new THREE.Vector3(), _pm = new THREE.Matrix4(), _frustum = new THREE.Frustum(), _sphere = new THREE.Sphere();

// The bush row cell under (x, z): '<field>:<row>' (the row index changes as a bush row's middle is
// crossed), or null outside every field.
export function rowCell(x, z) {
  for (let k = 0; k < TOMATO_ROWS.length; k++) {
    const r = TOMATO_ROWS[k], lx = x - r.ox, lz = z - r.oz;
    if (lx < r.x0 || lx > r.x1 || lz < r.z0 || lz > r.z1) continue;
    const a = r.dir === 'z' ? lx - r.x0 : lz - r.z0;
    return `${k}:${Math.floor((a - r.gap / 2) / r.gap)}`;
  }
  return null;
}

export class Traktor {
  constructor(game, cfg = TRAKTORN) {
    this.g = game;
    this.cfg = cfg;
    this.farmer = new Character(cfg.farmer);
    this.farmer.state = 'hidden';
    this.farmer.root.visible = false;
    scene.add(this.farmer.root);
    this.extras = [];        // the farmer while he is out (main.js counts him as a person)
    this.mode = null;        // the farmer: null (in the hut) | 'out' | 'chase' | 'sulk' | 'back' | 'home'
    this.t = 0;              // s in the mode
    this.live = false;       // the island with no mission at the last update
    this.wasIn = false;      // Stig at the wheel at the last update
    this.knocked = false;    // the farmer knocked over in this chase
    this.moved = { x: 0, z: 0, t: 0 };   // the farmer's progress check (stuck)
    this.shoutT = 0; this.shoutI = 0; this.shoutN = 0; this.answerAt = null; this.answerI = 0;
    this.backSaid = 0;
    this.jolt = { y: 0, vy: 0, p: 0, vp: 0, r: 0, vr: 0 };
    this.cells = [null, null, null];   // AXLES' row cells at the last frame
    this.recent = [];        // g.time of the recent row jolts
    this.sickT = -Infinity; this.sickI = 0;
    this.honkT = -Infinity; this.honkI = 0;
    this.queue = new Map();  // traffic car -> { t: s in the queue behind the tractor, at: g.time of its last honk }
    this.smokeT = 0; this.roughT = 0; this.lastV = 0;
    // For tests: counters and the last event { t, kind: 'take' | 'door' (the farmer out of it: x, z) |
    // 'shout' | 'answer' | 'giveUp' | 'back' | 'in' (pop) | 'refuse' | 'out' (put out of it in a mission)
    // | 'fetch' (wreck) | 'home' (moved) | 'sick' | 'honk' | 'spill' (dv), text? }, and `log`, the last 40.
    this.takes = 0; this.chases = 0; this.bumps = 0; this.honks = 0; this.spills = 0; this.fetched = 0; this.puffs = 0;
    this.near = Infinity;    // the farmer's least distance to the tail in this chase
    this.joltMax = 0;        // the largest jolt (m up) since a test reset it
    this.last = null;
    this.log = [];
  }

  get car() { return this.g.named[this.cfg.name] || null; }
  open() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  isTraktor(c) { return c?.type === 'traktor'; }
  mine() { const c = this.g.playerCar; return this.isTraktor(c) && !c.dead && this.g.level === 'island' ? c : null; }
  prompt(car) { return this.isTraktor(car) && this.open() ? this.cfg.prompt : null; }
  refuse(kind = 'refuse') { hud.toast(this.cfg.blocked); this.note(kind); }
  door() { return lm(this.cfg.door); }
  note(kind, extra = {}) {
    this.last = { t: +this.g.time.toFixed(2), kind, ...extra };
    this.log.push(this.last);
    if (this.log.length > 40) this.log.shift();
  }

  // Nobody sees (x, y, z) within r: off the camera's view or far.
  unseen(x, y, z, r = 1.4) {
    _p.set(x, y, z);
    if (camera.position.distanceTo(_p) > 70) return true;
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_pm);
    return !_frustum.intersectsSphere(_sphere.set(_p, r));
  }

  // ---------------------------------------------------------------------------------------------
  // Once a frame

  update(dt) {
    const g = this.g;
    if (this.mine() && !this.open()) { g.exitCar(true); this.refuse('out'); }
    const live = this.open();
    if (!live) {
      if (this.live) this.home();
      this.live = false;
      this.wasIn = false;
      this.settle(dt, this.car);
      return;
    }
    this.live = true;
    const car = this.car, inIt = !!this.mine();
    if (inIt && !this.wasIn) this.onTake(car);
    if (!inIt && this.wasIn) this.onLeave(car);
    this.wasIn = inIt;
    this.tickFarmer(dt, car);
    if (inIt) this.ride(dt, car);
    else if (this.queue.size) this.queue.clear();
    this.settle(dt, car, inIt);
    this.fetch();
    if (this.farmer.root.visible) this.farmer.sync(dt);
  }

  onTake(car) {
    const g = this.g, c = this.cfg, d = this.door();
    this.takes++;
    g.say(g.player, c.borrow, 2.4);
    this.note('take');
    this.lastV = car.speed;
    this.cells = [null, null, null];
    if (dist(car.x, car.z, d.x, d.z) > c.seeR) return;   // far from the hut: nobody sees it go
    if (this.mode === null) this.setMode('out');
    else if (this.mode !== 'out' && this.mode !== 'chase') { this.startChase(); }
  }

  onLeave(car) {
    const f = this.farmer;
    if (this.mode === 'out') { this.setMode(null); return; }
    if (this.mode === 'chase' && f.state === 'normal' && car && dist(f.x, f.z, car.x, car.z) < this.cfg.thanksR) this.setMode('back');
    else if (this.mode === 'chase') this.giveUp();
  }

  setMode(m) {
    this.mode = m;
    this.t = 0;
    const f = this.farmer;
    this.moved = { x: f.x, z: f.z, t: 0 };
    this.backSaid = 0;       // 'back': 0 nothing said, > 0 g.time of his line, −1 Stig answered
    f.anim.sprint = false;
    f.anim.oath = false;
  }

  startChase() {
    this.chases++;
    this.knocked = false;
    this.near = Infinity;
    this.shoutI = 0; this.shoutN = 0; this.shoutT = 0; this.answerAt = null;
    this.setMode('chase');
    this.shout();
  }

  shout() {
    const g = this.g, c = this.cfg, f = this.farmer;
    const text = c.shouts[this.shoutI++ % c.shouts.length];
    g.say(f, text, Math.min(c.shoutEvery - 0.2, 2.6));
    this.shoutT = c.shoutEvery;
    if (this.shoutN++ < c.answers.length) this.answerAt = g.time + c.answerAfter;
    this.note('shout', { text });
  }

  showFarmer() {
    const f = this.farmer, d = this.door();
    f.state = 'normal';
    f.teleport(d.x, d.z, d.yaw);
    f.root.visible = true;
    this.extras = [f];
    this.note('door', { x: +f.x.toFixed(2), z: +f.z.toFixed(2) });
  }

  hideFarmer() {
    const f = this.farmer;
    this.g.unsay(f);
    f.state = 'hidden';
    f.root.visible = false;
    f.wishX = f.wishZ = f.vx = f.vz = 0;
    f.anim.sprint = f.anim.oath = f.anim.talk = false;
    this.extras = [];
    this.setMode(null);
  }

  giveUp() {
    const g = this.g;
    this.setMode('sulk');
    if (this.farmer.state === 'normal') {
      this.farmer.anim.oath = true;
      g.say(this.farmer, this.cfg.giveUp, 2.2);
    }
    this.note('giveUp');
  }

  // A point `back` m behind the car's tail (the trailer's end): what the farmer runs at.
  tail(car, back = 0.4) {
    const s = car.spec, fx_ = Math.sin(car.yaw), fz = Math.cos(car.yaw), k = s.len / 2 + back;
    return { x: car.x - fx_ * k, z: car.z - fz * k };
  }

  tickFarmer(dt, car) {
    const g = this.g, c = this.cfg, f = this.farmer, p = g.player;
    if (this.mode === null) return;
    this.t += dt;
    if (f.state === 'flung' || f.state === 'down') this.knocked = true;
    f.anim.talk = g.saying(f);
    switch (this.mode) {
      case 'out':
        if (!car || car.dead) { this.setMode(null); return; }
        if (this.t >= c.outAfter) { this.showFarmer(); this.startChase(); }
        return;
      case 'chase': {
        if (!car || car.dead) { this.giveUp(); return; }
        const t = this.tail(car), d = this.door(), dt_ = dist(f.x, f.z, t.x, t.z);
        this.near = Math.min(this.near, dt_);
        if (this.knocked && f.state === 'normal') { this.giveUp(); return; }
        if (f.state !== 'normal') return;
        if (dist(f.x, f.z, d.x, d.z) > c.giveUpR || dt_ > c.loseR || this.t > c.maxSecs || this.stuck(dt)) { this.giveUp(); return; }
        this.shoutT -= dt;
        if (this.shoutT <= 0 && !g.inDialog) this.shout();
        f.anim.oath = g.saying(f);
        // Stig's answer waits for his own line to end (at most 2 s).
        if (this.answerAt != null && g.time >= this.answerAt && (!g.saying(p) || g.time > this.answerAt + 2)) {
          this.answerAt = null;
          if (!g.inDialog && !g.saying(p) && this.mine()) {
            const text = c.answers[this.answerI++ % c.answers.length];
            g.say(p, text, 2.2);
            this.note('answer', { text });
          }
        }
        return;
      }
      case 'sulk':
        if (car && f.state === 'normal') f.yaw = dampAngle(f.yaw, yawTo(car.x - f.x, car.z - f.z), 6, dt);
        if (this.t >= c.sulkSecs) this.setMode('home');
        return;
      case 'back': {
        if (!car || car.dead || this.mine()) { this.setMode('home'); return; }
        const s = this.backSpot(car);
        if (f.state === 'normal' && dist(f.x, f.z, s.x, s.z) < 0.6 && !this.backSaid) {
          this.backSaid = g.time;
          g.say(f, c.back, 2.2);
          this.note('back');
        }
        if (this.backSaid > 0 && g.time - this.backSaid > 1.3) {
          this.backSaid = -1;
          if (!this.mine() && !g.saying(p) && !g.inDialog) g.say(p, c.backStig, 2.0);
        }
        if ((this.backSaid === -1 && this.t > 4) || this.t > 14 || this.stuck(dt)) this.setMode('home');
        if (f.state === 'normal' && dist(f.x, f.z, s.x, s.z) < 0.8) f.yaw = dampAngle(f.yaw, yawTo(car.x - f.x, car.z - f.z), 6, dt);
        return;
      }
      case 'home': {
        const d = this.door();
        if (f.state === 'normal' && dist(f.x, f.z, d.x, d.z) < 0.5) { this.hideFarmer(); this.note('in'); return; }
        // Stuck on the way, or a long way off: in where nobody sees it.
        if ((this.stuck(dt) || dist(f.x, f.z, d.x, d.z) > 25) && this.unseen(f.x, f.y + 1, f.z) && this.unseen(d.x, d.y ?? 1, d.z)) { this.hideFarmer(); this.note('in', { pop: true }); }
        return;
      }
    }
  }

  // Where the farmer stands to take his tractor back: beside its seat, on the side towards his door
  // (so his walk home does not cross it).
  backSpot(car) {
    const fx_ = Math.sin(car.yaw), fz = Math.cos(car.yaw), lx = fz, lz = -fx_, d = this.door();
    const side = (d.x - car.x) * lx + (d.z - car.z) * lz >= 0 ? 1 : -1;
    return { x: car.x + side * lx * 1.6 + fx_ * 0.6, z: car.z + side * lz * 1.6 + fz * 0.6 };
  }

  // No headway for 3 s while he means to move.
  stuck(dt) {
    const f = this.farmer, m = this.moved;
    if (Math.hypot(f.wishX, f.wishZ) < 0.5) { m.x = f.x; m.z = f.z; m.t = 0; return false; }
    m.t += dt;
    if (dist(f.x, f.z, m.x, m.z) > 1) { m.x = f.x; m.z = f.z; m.t = 0; }
    return m.t > 3;
  }

  // main.js fixedStep: the farmer's run, walk and stand.
  step(h) {
    const f = this.farmer, c = this.cfg, car = this.car;
    if (f.state === 'hidden') return;
    let to = null, sp = 0;
    if (f.state === 'normal' && car) {
      if (this.mode === 'chase') {
        to = this.tail(car, 0.4);
        // Never nearer than `keep` behind the tail: there he only matches its speed.
        const gap = dist(f.x, f.z, to.x, to.z) - c.keep;
        sp = gap <= 0 ? 0 : Math.min(c.run, car.speed + gap * 1.5);
      } else if (this.mode === 'back') {
        to = this.backSpot(car);
        const d = dist(f.x, f.z, to.x, to.z);
        sp = d > 0.3 ? Math.min(3.2, 0.6 + d * 1.5) : 0;
      } else if (this.mode === 'home') {
        to = this.door();
        const d = dist(f.x, f.z, to.x, to.z);
        sp = d > 0.2 ? Math.min(c.walk, 0.4 + d * 1.5) : 0;
      }
    }
    if (to && sp > 0) {
      const dx = to.x - f.x, dz = to.z - f.z, d = Math.hypot(dx, dz) || 1;
      f.wishX = (dx / d) * sp; f.wishZ = (dz / d) * sp;
    } else f.wishX = f.wishZ = 0;
    f.anim.sprint = sp > 2.4;
    if (this.mode === 'chase' && sp === 0 && car && f.state === 'normal') f.yaw = dampAngle(f.yaw, yawTo(car.x - f.x, car.z - f.z), 8, h);
    f.step(h, this.g);
  }

  // ---------------------------------------------------------------------------------------------
  // At the wheel

  ride(dt, car) {
    const c = this.cfg, J = this.jolt;
    const fx_ = Math.sin(car.yaw), fz = Math.cos(car.yaw), rx = -fz, rz = fx_;
    // The stack's puffs, darker and twice as often with the throttle down.
    const thr = car.ctrl.throttle;
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = c.smokeEvery * (thr > 0.5 ? 0.5 : 1);
      this.puffs++;
      const x = car.x + fx_ * 2.55 - rx * 0.2, z = car.z + fz * 2.55 - rz * 0.2;
      fx.spawn(x, car.y + 1.9 + J.y, z, thr > 0.5 ? 0x4a4a50 : 0x9a9aa0, { vy: 1.4 + Math.random() * 0.6, vx: -car.vx * 0.3 + (Math.random() - 0.5) * 0.4, vz: -car.vz * 0.3 + (Math.random() - 0.5) * 0.4, s0: 0.16, s1: 0.75, life: 0.9, drag: 1.4 });
    }
    // A knock that takes `spill` m/s off it throws tomatoes off the trailer.
    const v = car.speed;
    if (this.lastV - v > c.spill) {
      this.spills++;
      spawnDebris(car.x - fx_ * 1.9, car.y + 1.0, car.z - fz * 1.9, [0xd8321e, 0xe8452a, 0xc08a50], 10, car.vx, car.vz, 0.7, 1.2);
      this.note('spill', { dv: +(this.lastV - v).toFixed(2) });
    }
    this.lastV = v;
    this.queueUp(dt, car);
    if (car.air) { this.cells = [null, null, null]; return; }
    // The furrows: a bush row crossed by an axle jolts it, leaves fly.
    let inField = false;
    AXLES.forEach(([lz, k], i) => {
      const x = car.x + fx_ * lz, z = car.z + fz * lz, cell = rowCell(x, z), was = this.cells[i];
      this.cells[i] = cell;
      if (cell) inField = true;
      if (!cell || !was || cell === was || v < 0.6) return;
      const sgn = Math.random() < 0.5 ? -1 : 1, f = Math.min(1, v / 4);
      J.vy += c.jolt.y * k * f;
      J.vp += c.jolt.p * f * (i === 0 ? -1 : i === 1 ? 0.6 : 0.3);
      J.vr += c.jolt.r * k * f * sgn;
      for (const sx of [-1, 1]) for (let n = 0; n < 2; n++) {
        const wx = x + rx * sx * 0.75, wz = z + rz * sx * 0.75;
        fx.spawn(wx, car.y + 0.4, wz, LEAF[(n + i) % 3], { vx: rx * sx * 1.5 + (Math.random() - 0.5) * 1.5, vz: rz * sx * 1.5 + (Math.random() - 0.5) * 1.5, vy: 2 + Math.random() * 2, s0: 0.18, s1: 0.06, life: 0.6, drag: 1, grav: 10 });
      }
      if (i < 2) this.bump();
    });
    // Off the asphalt (and out of the rows) it rocks now and then.
    if (!inField && v > 1 && !isRoad(car.x, car.z)) {
      this.roughT -= dt;
      if (this.roughT <= 0) {
        this.roughT = 0.25 + Math.random() * 0.35;
        J.vy += c.rough * (0.4 + Math.random() * 0.6) * Math.min(1, v / 4);
        J.vr += c.rough * 0.6 * (Math.random() - 0.5);
      }
    }
  }

  // The queue behind it: a traffic car following within `queue.r` m of its tail, in its lane, going its
  // way and held up (2 m/s under its cruise) for `queue.after` s honks (game.onHonk: the sound and Stig's sorry), again every
  // `queue.every` s or so. drivers.js honks only at a car it is blocked by for 1.2 s on end, and one
  // that matches the tractor's speed keeps slipping in and out of its look-ahead.
  queueUp(dt, car) {
    const g = this.g, Q = this.cfg.queue, fx_ = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    for (const o of g.cars) {
      if (o === car || !o.traffic || !o.ai || o.dead) { this.queue.delete(o); continue; }
      const dx = o.x - car.x, dz = o.z - car.z;
      if (Math.abs(dx) > 40 || Math.abs(dz) > 40) { this.queue.delete(o); continue; }
      const back = -(dx * fx_ + dz * fz) - car.spec.len / 2 - o.spec.len / 2, lat = Math.abs(dx * fz - dz * fx_);
      const q = this.queue.get(o) || { t: 0, at: -Infinity };
      // Held up: behind it, in its line, its way, slower than its own cruise.
      if (back > -0.5 && back < Q.r && lat < Q.lat && Math.cos(o.yaw - car.yaw) > 0.8 && o.speed < (o.ai.cruise ?? 10) - 2) q.t += dt;
      else q.t = 0;
      this.queue.set(o, q);
      if (q.t >= Q.after && g.time - q.at >= Q.every) {
        q.at = g.time + Math.random() * 1.2;
        g.onHonk(o);
      }
    }
  }

  bump() {
    const g = this.g, c = this.cfg, now = g.time;
    this.bumps++;
    this.recent.push(now);
    while (this.recent.length && now - this.recent[0] > c.sickWindow) this.recent.shift();
    if (this.recent.length < c.sickBumps || now - this.sickT < c.sickGap || g.inDialog || g.saying(g.player)) return;
    this.sickT = now;
    const text = c.sick[this.sickI++ % c.sick.length];
    g.say(g.player, text, 2.6);
    this.note('sick', { text });
  }

  // The jolts' springs, and on top of the car's synced tilt (main.syncAll ran this frame) the jolts and,
  // with Stig at the wheel, the engine's shake.
  settle(dt, car, running = false) {
    const J = this.jolt;
    const h = Math.min(dt, 1 / 30);
    for (const [x, v] of [['y', 'vy'], ['p', 'vp'], ['r', 'vr']]) {
      J[v] += (-K * J[x] - DAMP * J[v]) * h;
      J[x] += J[v] * h;
    }
    this.joltMax = Math.max(this.joltMax, Math.abs(J.y));
    if (!car || !car.root.visible) return;
    const t = this.g.time, sh = running ? 1 : 0;
    car.tilt.position.y += J.y + Math.sin(t * 31) * 0.008 * sh;
    car.tilt.rotation.x += J.p;
    car.tilt.rotation.z += J.r + Math.sin(t * 23) * 0.004 * sh;
  }

  // A car honking behind him (drivers.js via game.onHonk): Stig's sorry, now and then.
  onHonk(car) {
    const g = this.g, c = this.cfg, me = this.mine();
    if (!me || car === me || !this.open() || dist(car.x, car.z, me.x, me.z) > 30) return;
    this.honks++;
    if (g.time - this.honkT < c.honkGap || g.inDialog || g.saying(g.player)) return;
    this.honkT = g.time;
    const text = c.honked[this.honkI++ % c.honked.length];
    g.say(g.player, text, 2.2);
    this.note('honk', { text });
  }

  // ---------------------------------------------------------------------------------------------
  // Home

  homeSpot() { return this.car?.home || null; }

  // A tractor left elsewhere, or wrecked, back on its spot where nobody sees it (the farmer fetched it).
  fetch() {
    const g = this.g, c = this.cfg, f = g.focus();
    let car = this.car;
    if (car === g.playerCar || this.mode === 'back') return;
    const h = car?.home;
    if (!h) return;
    const gone = car.dead || !g.cars.includes(car);
    if (!gone && dist(car.x, car.z, h.x, h.z) < 1) return;
    if (!gone && (car.driver || car.passengers.length)) return;
    if (dist(f.x, f.z, h.x, h.z) < c.homeR || (!gone && dist(f.x, f.z, car.x, car.z) < c.homeR)) return;
    if (!this.unseen(h.x, 1, h.z, 3.5) || (!gone && !this.unseen(car.x, 1, car.z, 3.5))) return;
    if (gone) car = g.ensureNamedCar(c.name);
    else this.park(car);
    this.fetched++;
    this.note('fetch', { wreck: gone });
  }

  park(car) {
    const h = car.home;
    car.place(h.x, h.z, h.yaw);
    car.ctrl.park = true;
    car.ctrl.throttle = 0;
  }

  // A mission start (or the other level): the tractor on its spot, the farmer in.
  home() {
    const g = this.g;
    let car = this.car, moved = false;
    if (!car || car.dead || !g.cars.includes(car)) { car = g.ensureNamedCar(this.cfg.name); moved = !!car; }
    else if (car !== g.playerCar && car.home && dist(car.x, car.z, car.home.x, car.home.z) > 0.5) { this.park(car); moved = true; }
    if (this.mode !== null || this.farmer.state !== 'hidden') this.hideFarmer();
    this.jolt = { y: 0, vy: 0, p: 0, vp: 0, r: 0, vr: 0 };
    this.note('home', { moved });
  }
}
