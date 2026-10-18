// Golfbilen – pip-pip! (free roam; feature 74, DESIGN §10.40). The two golf carts by the golf
// clubhouse (named `golfbil1`, `golfbil2`; world/blocks/nature.js) are parked cars of the toy type
// `golfbil` (car.js): open, governed to about 23 km/h for the player, a pip-pip for a horn and a hum
// for a motor. E gets in only on the island with no mission running (`missions.state === 'idle'`):
// main.enterCar asks `open()` and otherwise `refuse()`s with a toast, so a golf cart is never a
// mission's car (getInCar, retryCar, a timed drive), and a debug start that finds him in one puts
// him out. On the course a bunker brakes it, sand flies off the rear wheels and Stig says "Jag
// pliktar ett slag."; the pond splashes and brakes it to a crawl. Between missions a wrecked golf
// cart comes back on its spot once he is far from it; a mission start puts both back on their spots,
// so every mission finds the course as before. Config: GOLFBIL (content/island.js). Owned by Game as
// `golf`: main.js calls `open()`/`refuse()` from enterCar and updateHud, `step(h)` after the cars'
// steps in fixedStep and `update` once a frame.

import { GOLFBIL } from '../content/index.js';
import { GOLF_COURSE } from '../world/blocks/nature.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { dist } from '../util.js';

export class GolfCarts {
  constructor(game, cfg = GOLFBIL) {
    this.g = game;
    this.cfg = cfg;
    this.surf = null;        // where the player's golf cart is: 'sand' | 'pond' | null
    this.inT = 0;            // s on it since it got there
    this.said = false;       // the surface's line said for this time in
    this.lineT = { sand: -Infinity, pond: -Infinity };   // g.time of each surface's last line
    this.sprayT = 0;
    this.pipT = 0;
    this.free = true;        // no mission at the last update (a mission start sends the carts home)
    this.pips = 0;           // pip-pips played, bunkers and pond driven into, sprays of sand (for tests)
    this.sand = 0;
    this.pond = 0;
    this.sprays = 0;
    this.last = null;        // for tests: { t, kind: 'refuse' | 'out' | 'sand' | 'pond' | 'line' | 'home' | 'respawn', … }
  }

  get course() { return GOLF_COURSE; }   // for tests
  // A golf cart can be driven: on the island between missions.
  open() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  refuse(kind = 'refuse') { hud.toast(this.cfg.blocked); this.last = { t: this.g.time, kind }; }
  // The player's golf cart, whole, on the island.
  // A golf cart (the other toy, the tractor, is game/traktor.js's: §10.54).
  isCart(c) { return c?.type === 'golfbil'; }
  mine() {
    const g = this.g, c = g.playerCar;
    return this.isCart(c) && !c.dead && g.level === 'island' ? c : null;
  }
  // The course's hazard at (x, z): 'pond', 'sand' or null.
  surfaceAt(x, z) {
    const C = GOLF_COURSE, c = this.cfg;
    if (C.pond && dist(x, z, C.pond.x, C.pond.z) < C.pond.r - c.pond.edge) return 'pond';
    for (const b of C.bunkers || []) if (dist(x, z, b.x, b.z) < b.r + c.sand.edge) return 'sand';
    return null;
  }

  // fixedStep, after the cars' steps: a bunker or the pond brakes his golf cart to its crawl.
  step(h) {
    const car = this.mine(), s = car && !car.air ? this.surfaceAt(car.x, car.z) : null;
    if (!s) return;
    const k = this.cfg[s], sp = car.speed;
    if (sp <= k.v) return;
    const f = Math.max(k.v, sp - k.decel * h) / sp;
    car.vx *= f; car.vz *= f;
  }

  update(dt) {
    const g = this.g, c = this.cfg;
    // Never a mission's car: out of it in a mission (only a debug start can find him in one), and at
    // a mission start both go back to their spots.
    if (this.isCart(g.playerCar) && !this.open()) { g.exitCar(true); this.refuse('out'); }
    const free = g.missions.state === 'idle';
    if (this.free && !free) this.home();
    this.free = free;
    if (free && g.level === 'island') this.respawn();
    const car = this.mine();
    // The horn: pip-pip, again every `pipEvery` s while H is held (main.updateAudio keeps the
    // two-tone horn off for it).
    if (car && car.spec.horn === 'pip' && input.down('horn')) {
      this.pipT -= dt;
      if (this.pipT <= 0) { audio.pipHorn(); this.pips++; this.pipT = c.pipEvery; }
    } else this.pipT = 0;
    // The course.
    const s = car && !car.air ? this.surfaceAt(car.x, car.z) : null;
    if (s !== this.surf) {
      this.surf = s;
      this.inT = 0;
      this.said = false;
      if (s) this.last = { t: g.time, kind: s, v: +car.speed.toFixed(2) };
      if (s === 'sand') this.sand++;
      if (s === 'pond') { this.pond++; fx.splash(car.x, car.z, 22, 3.2, 3.5); audio.splash(0); }
    }
    if (!s) return;
    const k = c[s];
    this.inT += dt;
    if (!this.said && this.inT >= k.lineAfter && g.time - this.lineT[s] >= k.every && !g.inDialog) {
      this.said = true;
      this.lineT[s] = g.time;
      g.say(g.player, k.line, 2.4);
      this.last = { t: g.time, kind: 'line', surf: s, text: k.line };
    }
    this.sprayT -= dt;
    if (this.sprayT > 0) return;
    if (s === 'sand' && car.ctrl.throttle > 0.1) { this.sprayT = k.sprayEvery; this.spray(car); }
    else if (s === 'pond' && car.speed > 0.3) { this.sprayT = k.wakeEvery; fx.splash(car.x, car.z, 4, 1.4, 1.6); }
  }

  // Sand off both rear wheels, thrown back and up (the pedal down in a bunker, stuck or not).
  spray(car) {
    this.sprays++;
    const s = car.spec, fx_ = Math.sin(car.yaw), fz = Math.cos(car.yaw), rx = -fz, rz = fx_;
    const bz = -(s.len / 2 - s.wheelR - (s.wheelInset ?? 0.38));
    for (const side of [-1, 1]) {
      const x = car.x + fx_ * bz + rx * side * (s.wid / 2 - 0.02), z = car.z + fz * bz + rz * side * (s.wid / 2 - 0.02);
      for (let k = 0; k < 2; k++) {
        const back = 2 + Math.random() * 2.5, lat = (Math.random() - 0.5) * 1.6;
        fx.spawn(x, car.y + 0.15, z, k ? 0xf0dca8 : 0xd8bc84, { vx: -fx_ * back + rx * lat, vz: -fz * back + rz * lat, vy: 2 + Math.random() * 2.5, s0: 0.24, s1: 0.06, life: 0.55, drag: 1.2, grav: 12 });
      }
    }
  }

  // A mission starts: both golf carts back on their spots (a wreck comes back whole).
  home() {
    const g = this.g, moved = [];
    for (const name of this.cfg.names) {
      let car = g.named[name];
      if (!car || car.dead || !g.cars.includes(car)) { car = g.ensureNamedCar(name); if (car) moved.push(name); continue; }
      const h = car.home;
      if (!h || car === g.playerCar || dist(car.x, car.z, h.x, h.z) < 0.5) continue;
      car.place(h.x, h.z, h.yaw);
      car.ctrl.park = true;
      car.ctrl.throttle = 0;
      moved.push(name);
    }
    if (moved.length) this.last = { t: g.time, kind: 'home', names: moved };
  }

  // Between missions a wrecked golf cart comes back on its spot once he is `respawnR` m from both.
  respawn() {
    const g = this.g, f = g.focus(), R = this.cfg.respawnR;
    for (const name of this.cfg.names) {
      const car = g.named[name];
      if (car && !car.dead && g.cars.includes(car)) continue;
      if (car === g.playerCar) continue;
      const h = car?.home;
      if (car && g.cars.includes(car) && dist(f.x, f.z, car.x, car.z) < R) continue;
      if (h && dist(f.x, f.z, h.x, h.z) < R) continue;
      if (g.ensureNamedCar(name)) this.last = { t: g.time, kind: 'respawn', name };
    }
  }
}
