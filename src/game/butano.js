// Butaneron och gasolbilen (free roam; feature 143, DESIGN §10.65). Between missions, by day, one gas
// truck laden with orange butano bottles (the car type `butanero`, car.js: a car of this module's own,
// never `traffic`, so recycleTraffic and the traffic mix leave it be) crawls a lap from GASOLINA's BUTANO
// rack round the bungalows of (5,4) and back. At a house the butanero gets out, knocks a bottle with his
// spanner and calls "¡Butanooo!", and the resident comes out with an empty bottle and walks home with a
// full one; at the rack he fetches a bottle for the bed. Stig standing close by is taken for a customer
// and pays for a bottle he never ordered, and then carries it. E with the butanero at the wheel is a
// carjacking: he tumbles out himself and shouts after his truck. At its wheel every hard knock throws a
// bottle off the bed, and it bursts where it lands with sparks, smoke, coins and a little SKANDAL. A
// mission start, the other level or a street race takes it all away (and the night, once nobody sees
// it); a new lap starts where nobody sees it. So no stage, route, timer or calibration pool meets it.
// Config: BUTANERO (content/island.js). Owned by Game as `butano`: main.js calls `update` once a frame
// and `step` in its fixed step, `jolt(car, kind, impact)` from onCarImpact and onCarLanded, `onDestroyed`
// from onCarDestroyed and `carjack(car)` from enterCar, counts `extras` (the butanero and a resident on
// foot) as people and shows `objective()`.

import { BUTANERO } from '../content/index.js';
import { Car, BOTTLE_SLOTS, bottleGeo } from '../actors/car.js';
import { Character } from '../actors/character.js';
import { AIDriver, LanePath } from '../actors/drivers.js';
import { randomPed } from '../actors/models.js';
import { burstCoins } from '../actors/pickups.js';
import { dogLots } from '../world/town.js';
import { nodeId } from '../world/layout.js';
import { queryBlocks, circleVsBlock, groundAt, topAt } from '../world/collision.js';
import { THREE, scene, camera, toonMesh } from '../gfx.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { fmt, pta } from '../strings.js';
import { clamp, dist, yawTo, dampAngle, mulberry32 } from '../util.js';

const _p = new THREE.Vector3(), _pm = new THREE.Matrix4(), _frustum = new THREE.Frustum(), _sphere = new THREE.Sphere();
const _bl = [], _h = {}, _w = { x: 0, y: 0, z: 0 };

// The lap as a path for the AI driver (drivers.js): every point there from the start, no wandering.
// The lap starts where it ends, so the driver's own slowing for a path's end is off (`nodes` as if an
// edge were still to build): this module brakes it for the depot as for every stop.
class LapPath extends LanePath {
  constructor(pts) { super([]); this.pts = pts.map((p) => ({ ...p })); this.nodes = [0, 0]; }
  ensure() { if (this.idx > 40) { this.pts.splice(0, 30); this.idx -= 30; } }
}

let _bottle = null;
function bottleMesh() {
  _bottle ||= toonMesh(bottleGeo(), { outline: 0.03 });
  return _bottle.clone();
}

export class Butanero {
  constructor(game, cfg = BUTANERO) {
    this.g = game;
    this.cfg = cfg;
    this.car = null;         // the truck, built at its first lap and kept (in g.cars while it is out)
    this.bust = null;        // the butanero at its wheel (built once, moved in and out)
    this.ai = null;          // the lap's route driver, kept while the truck stands
    this.hold = null;        // the truck's controller while it stands: never an empty car (tests' anyCar)
    this.man = new Character(cfg.man);
    this.man.state = 'hidden';
    this.man.root.visible = false;
    scene.add(this.man.root);
    this.cab = { x: 0, y: 0, z: 0, height: 1.25 };   // his call from the cab: a bubble at the wheel
    this.lap = null;         // [{ x, z, turn? }]: depot -> exit -> lanes -> entry -> depot (+ `over`)
    this.route = null;       // the houses' stops in lap order, then the depot's: { kind, x, z, yaw, fx, fz, i, … }
    this.phase = null;       // null (not out) | 'drive' | 'stop' | 'taken' (Stig at its wheel) | 'left' (he left it)
    this.next = 0;           // the route stop it drives to
    this.sc = null;          // the stop's scene: { s, step, t, … }
    this.manMode = null;     // null (at the wheel or away) | 'scene' | 'robbed' | 'off'
    this.rob = null;         // { t, i, at }: his shouts after his truck
    this.out = [];           // residents out of their doors: { ch, s, step: 'go' | 'wait' | 'home', leg, legs, face }
    this.loose = [];         // bottles off the bed in the air
    this.carry = null;       // our g.carrying while Stig has a bottle
    this.queue = [];         // [{ at, fn }] (g.time)
    this.waits = new Map();  // traffic car -> { t, at }: queued behind the truck
    this.extras = [];        // the butanero and the resident while on foot (main.js: people)
    this.spawnT = 0;
    this.callT = -Infinity;  // his last call from the cab
    this.offerT = -Infinity; // his last offer to Stig
    this.gapT = 0;           // no bottle thrown off until it runs out
    // For tests: counters, the last event and `log` (the last 60): { t, kind: 'spawn' | 'arrive' |
    // 'out' | 'call' | 'come' | 'swap' | 'home' | 'depart' | 'rack' | 'lap' | 'offer' | 'sold' | 'walked'
    // | 'take' | 'carjack' | 'shout' | 'throw' | 'pop' | 'wreck' | 'left' | 'reset' | 'release' |
    // 'stowed' | 'burst', … }.
    this.n = { laps: 0, spawns: 0, stops: 0, calls: 0, served: 0, sold: 0, thrown: 0, pops: 0, takes: 0, wrecks: 0, clonks: 0 };
    this.last = null;
    this.log = [];
  }

  get live() {
    const g = this.g;
    return g.level === 'island' && g.missions.state === 'idle' && !g.gatlopp?.racing;
  }
  day() { const h = this.g.day.h, [a, b] = this.cfg.hours; return h >= a && h < b; }
  isTruck(c) { return !!c && c === this.car; }
  mine() { return this.car && this.g.playerCar === this.car ? this.car : null; }
  note(kind, extra = {}) {
    this.last = { t: +this.g.time.toFixed(2), kind, ...extra };
    this.log.push(this.last);
    if (this.log.length > 60) this.log.shift();
  }
  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }

  // Nobody sees (x, y, z) within r: off the camera's view or far.
  unseen(x, y, z, r = 2.5) {
    _p.set(x, y, z);
    if (camera.position.distanceTo(_p) > this.cfg.seenR) return true;
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_pm);
    return !_frustum.intersectsSphere(_sphere.set(_p, r));
  }
  // A car-local spot of the truck in the world (x left, z forward, as car.js).
  local(lx, lz, car = this.car) {
    const c = Math.cos(car.yaw), s = Math.sin(car.yaw);
    return { x: car.x + lx * c + lz * s, z: car.z - lx * s + lz * c };
  }
  // The yaw that faces the truck's side from its right (side -1) or its left (side 1).
  faceTruck(side, car = this.car) { return yawTo(-side * Math.cos(car.yaw), side * Math.sin(car.yaw)); }

  // ---------------------------------------------------------------------------------------------
  // The lap and its stops (built once, on the first update: dogLots are the town's)

  build() {
    const c = this.cfg, pts = [], [dx, dz, dyaw] = c.depot;
    let last = { x: dx, z: dz };
    const line = (x, z) => {
      const n = Math.max(1, Math.round(Math.hypot(x - last.x, z - last.z) / 5));
      for (let k = 1; k <= n; k++) pts.push({ x: last.x + ((x - last.x) * k) / n, z: last.z + ((z - last.z) * k) / n });
      last = { x, z };
    };
    const curve = (cx, cz, x, z) => {
      for (let k = 1; k <= 6; k++) { const t = k / 6, u = 1 - t; pts.push({ x: u * u * last.x + 2 * u * t * cx + t * t * x, z: u * u * last.z + 2 * u * t * cz + t * t * z, turn: k < 6 }); }
      last = { x, z };
    };
    const walk = (list) => { for (const p of list) if (p[0] === 'q') curve(p[1], p[2], p[3], p[4]); else line(p[0], p[1]); };
    walk(c.exit);
    const lane = new LanePath(c.nodes.map(([i, j]) => nodeId(i, j)));
    lane.ensure(1e4);
    for (const p of lane.pts) pts.push({ x: p.x, z: p.z, turn: !!p.turn });
    last = pts[pts.length - 1];
    walk(c.entry);
    line(dx, dz);
    line(dx + Math.sin(dyaw) * c.over, dz + Math.cos(dyaw) * c.over);
    this.lap = pts;
    // The houses: each door matched to its bungalowR lot; the truck stands in the lane with its bed
    // `bed` m behind the gate, its right side to the house (heading along the lot's +x).
    const nearest = (x, z, from) => {
      let best = -1, bd = Infinity;
      for (let k = from; k < pts.length; k++) { const d = dist(pts[k].x, pts[k].z, x, z); if (d < bd) { bd = d; best = k; } }
      return best;
    };
    this.route = [];
    let from = 0;
    c.stops.forEach((st, k) => {
      const lot = dogLots.find((o) => {
        const co = Math.cos(o.yaw), so = Math.sin(o.yaw), [ldx, front] = o.door;
        return dist(o.ox + ldx * co + front * so, o.oz - ldx * so + front * co, st.door[0], st.door[1]) < 2;
      });
      if (!lot) { console.warn('butano: no bungalow lot at', st.door); return; }
      const co = Math.cos(lot.yaw), so = Math.sin(lot.yaw), [ldx, front] = lot.door;
      const W = (lx, lz) => ({ x: lot.ox + lx * co + lz * so, z: lot.oz - lx * so + lz * co });
      const fx = co, fz = -so, L = W(ldx, -6.25);
      const s = { kind: 'house', k, who: st.who, x: L.x + fx * c.bed, z: L.z + fz * c.bed, yaw: yawTo(fx, fz), fx, fz, lot,
        door: W(ldx, front - 0.5), inGate: W(ldx, 1.4), outGate: W(ldx, -0.8), visits: 0, home: null };
      s.i = nearest(s.x, s.z, from);
      from = s.i;
      this.route.push(s);
    });
    const yaw = dyaw;
    this.route.push({ kind: 'depot', x: dx, z: dz, yaw, fx: Math.sin(yaw), fz: Math.cos(yaw), i: pts.length - 1 });
  }

  // A resident of house s: a figure of the passers-by's kind (models.js randomPed), a Spanish 'local' or
  // a Swedish 'tourist', drawn from its own seed so the house keeps its resident; nobody holding anything.
  resident(s) {
    if (s.home) return s.home;
    let def = null;
    for (let n = 0; n < 60 && !def; n++) {
      const d = randomPed(mulberry32(14300 + s.k * 101 + n));
      if (!!d.local === (s.who === 'local') && !d.held) def = d;
    }
    const ch = new Character(def || randomPed(mulberry32(14300 + s.k)));
    ch.state = 'hidden';
    ch.root.visible = false;
    scene.add(ch.root);
    return (s.home = ch);
  }

  // ---------------------------------------------------------------------------------------------
  // The truck

  seatBust(car) {
    if (!this.bust) {
      this.g.addBust(this.cfg.man, car);
      this.bust = car.driverBust;
      return;
    }
    const at = car.seatAt(1);
    this.bust.position.set(at.x, car.seatY(), at.z);
    this.bust.scale.setScalar(car.fitScale(this.bust.userData.h || 1.25));
    car.tilt.add(this.bust);
    car.driverBust = this.bust;
  }
  unseatBust(car) {
    if (car.driverBust) car.tilt.remove(car.driverBust);
    car.driverBust = null;
  }
  // Standing: its route driver kept for the way on; a controller that holds the brake, so it is never
  // an empty car to code that looks for one.
  park(car) {
    if (car.ai && car.ai !== this.hold) this.ai = car.ai;
    car.ai = this.hold;
    Object.assign(car.ctrl, { throttle: 0, brake: 1, steer: 0, handbrake: false, park: true });
  }
  go(car) {
    car.ai = this.ai;
    car.ai.cruise = this.cfg.cruise;
    car.ctrl.park = false;
  }
  newAi(car, from) {
    this.ai = new AIDriver(car, { mode: 'route', path: new LapPath(this.lap.slice(from)), cruise: this.cfg.cruise, wobble: 0 });
    return this.ai;
  }

  // Out on a new lap where nobody sees it: at the depot, else at a lane point of the lap, `spawnR` m
  // from him at least, no car within 7 m. Not while the butanero or a resident is still about.
  // `force`: a lap point to start at, seen or not (tests).
  spawn(force = null) {
    const g = this.g, c = this.cfg, f = g.focus(), pts = this.lap;
    if (force == null && (this.man.state !== 'hidden' || this.out.length)) return false;
    const free = (x, z) => dist(x, z, f.x, f.z) >= c.spawnR && this.unseen(x, 1.2, z, 4) && !g.cars.some((o) => dist(o.x, o.z, x, z) < 7);
    let at = force ?? -1;
    const [dx, dz] = c.depot;
    if (at < 0 && free(dx, dz)) at = 0;
    else for (let k = 6; k < pts.length - 6 && at < 0; k += 6) if (!pts[k].turn && free(pts[k].x, pts[k].z)) at = k;
    if (at < 0) return false;
    if (!this.car) {
      this.car = new Car('butanero', { name: c.name });
      const car = this.car;
      this.hold = { blockedT: 0, cruise: 0, update() { Object.assign(car.ctrl, { throttle: 0, brake: 1, steer: 0, handbrake: false, park: true }); } };
    }
    const car = this.car;
    car.repair();
    for (let i = 0; i < car.bottles.length; i++) car.setBottle(i, true);
    car.isPursuer = false;
    car.locked = false;
    if (at === 0) car.place(dx, dz, c.depot[2]);
    else car.place(pts[at].x, pts[at].z, yawTo(pts[at + 1].x - pts[at].x, pts[at + 1].z - pts[at].z));
    car.traffic = false;
    g.addCar(car);
    this.seatBust(car);
    this.waits.clear();
    this.n.spawns++;
    if (at === 0) {
      // At the rack, loaded: off on its lap a moment later.
      this.newAi(car, 0);
      this.park(car);
      this.phase = 'stop';
      this.next = this.route.length - 1;
      this.sc = { s: this.route[this.next], step: 'wait', t: 0, t0: g.time - c.depotSecs + 3 };
    } else {
      this.newAi(car, at);
      car.ai = this.ai;
      this.phase = 'drive';
      this.next = this.route.findIndex((s) => s.i > at);
      if (this.next < 0) this.next = this.route.length - 1;
    }
    this.note('spawn', { at, x: +car.x.toFixed(1), z: +car.z.toFixed(1), next: this.next });
    return true;
  }

  // Not out any more (a mission, the other level, a race, the night; or the truck gone): the truck, the
  // butanero and the residents away, Stig's bottle stowed, the bottles in the air gone.
  release(kind = 'release') {
    const g = this.g;
    if (!this.phase && !this.carry && !this.loose.length && this.man.state === 'hidden' && !this.out.length && !this.queue.length) return;
    this.endCarry('gone');
    this.hideMan();
    for (const r of this.out.slice()) this.hideResident(r);
    for (const b of this.loose) scene.remove(b.mesh);
    this.loose = [];
    this.queue.length = 0;
    this.waits.clear();
    if (this.car) {
      if (g.cars.includes(this.car)) g.removeCar(this.car);
      this.car.ai = null;
    }
    this.ai = null;
    this.sc = null;
    this.rob = null;
    if (this.phase) this.note(kind);
    this.phase = null;
  }

  // ---------------------------------------------------------------------------------------------
  // Once a frame

  update(dt) {
    const g = this.g, c = this.cfg;
    if (!this.live) { this.release(); return; }
    if (!this.lap) this.build();
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      q.fn();
    }
    this.gapT -= dt;
    const car = this.car;
    if (this.phase && (!car || !g.cars.includes(car))) { this.gone('removed'); }
    if (!this.phase) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawnT = 1; if (this.day()) this.spawn(); }
    } else if (this.phase === 'drive' || this.phase === 'stop') {
      if (this.mine()) this.taken('getin');
      else if (car.dead) this.phase = 'left';
      else if (!this.day() && this.man.state === 'hidden' && this.unseen(car.x, 1.2, car.z, 4)) this.release('night');
      else {
        this.cab.height = 1.25;
        car.seatWorld(1, this.cab);
        if (this.phase === 'drive') this.drive(dt, car);
        else this.atStop(dt, car);
        this.queueUp(dt, car);
      }
    } else if (this.phase === 'taken') {
      if (!this.mine()) { this.phase = 'left'; this.note('left'); }
    } else if (this.phase === 'left') {
      const f = g.focus();
      if (this.mine()) { this.phase = 'taken'; this.note('take', { again: true }); }
      // A wreck goes once nobody sees it (25 m off at least), a whole truck once he is `awayR` m from it too.
      else if (dist(f.x, f.z, car.x, car.z) > (car.dead ? 25 : c.awayR) && this.unseen(car.x, 1.2, car.z, 4)) this.gone(car.dead ? 'wreck' : 'away');
    }
    this.tickMan(dt);
    this.tickResidents(dt);
    this.tickLoose(dt);
    this.carried();
    this.extras = [this.man, ...this.out.map((r) => r.ch)].filter((ch) => ch.state !== 'hidden');
    for (const ch of this.extras) { ch.anim.talk = g.saying(ch); ch.sync(dt); }
  }

  // The truck gone from the street (wrecked and towed by recycleTraffic, taken away by another module,
  // left far behind): out of the world; a new lap later.
  gone(why) {
    const g = this.g, car = this.car;
    if (car && g.cars.includes(car) && car !== g.playerCar) g.removeCar(car);
    if (car) car.ai = null;
    this.ai = null;
    this.sc = null;
    if (this.manMode === 'scene') this.hideMan();
    for (const r of this.out) if (r.step !== 'home') this.sendHome(r);
    this.phase = null;
    this.spawnT = 2;
    this.note('reset', { why });
  }

  // ---------------------------------------------------------------------------------------------
  // On its lap

  // Driving to the next stop: the brake for it, parked 0.4 m before it; held up short of it (a car in its
  // lane), it waits behind (never the AI's shove) and after `heldSecs` s stops where it is. On a house's
  // street the butanero calls from the cab now and then.
  drive(dt, car) {
    const g = this.g, c = this.cfg, ai = car.ai;
    if (!ai) { if (this.ai) this.go(car); return; }
    const s = this.route[this.next];
    if (s.kind === 'house' && g.time - this.callT > c.driveCall && dist(car.x, car.z, s.x, s.z) < c.driveCallR && this.near(car.x, car.z)) {
      this.callT = g.time;
      g.say(this.cab, c.call, 1.6);
      this.n.calls++;
      this.note('call', { from: 'cab' });
    }
    const dx = s.x - car.x, dz = s.z - car.z;
    const along = dx * s.fx + dz * s.fz, lat = dx * s.fz - dz * s.fx;
    if (Math.cos(car.yaw - s.yaw) < 0.94 || Math.abs(lat) > 2.5 || along > c.approach) { ai.cruise = c.cruise; this.heldT = 0; return; }
    ai.blockedT = Math.min(ai.blockedT, 3);
    ai.cruise = clamp(Math.sqrt(2 * c.brake * Math.max(0, along - 0.4)), c.creep, c.cruise);
    this.heldT = car.speed < 0.3 ? (this.heldT || 0) + dt : 0;
    if (along < 0.4 || this.heldT > c.heldSecs) this.arrive(car, s);
  }
  near(x, z) { const f = this.g.focus(); return dist(x, z, f.x, f.z) < this.cfg.earR; }

  arrive(car, s) {
    const g = this.g;
    this.park(car);
    this.phase = 'stop';
    this.heldT = 0;
    this.sc = { s, step: 'park', t: 0, t0: g.time, bursts: 0, burstAt: 0, stroke: null, comeAt: null, offered: false, deal: null };
    if (s.kind === 'house') { s.visits++; this.n.stops++; }
    this.note('arrive', { stop: s.kind === 'house' ? s.k : 'depot', x: +car.x.toFixed(2), z: +car.z.toFixed(2), yaw: +car.yaw.toFixed(3), off: +((s.x - car.x) * s.fx + (s.z - car.z) * s.fz).toFixed(2) });
  }

  depart(car) {
    const s = this.sc.s;
    this.sc = null;
    this.phase = 'drive';
    if (s.kind === 'depot') {
      this.n.laps++;
      this.newAi(car, 0);
      this.next = 0;
      this.note('lap', { laps: this.n.laps });
    } else this.next++;
    this.go(car);
    this.note('depart', { from: s.kind === 'house' ? s.k : 'depot', next: this.next });
  }

  // The stop's scene. House: out of the passenger door to the bed, the knocks and the call, the resident,
  // back in. Depot: out of the driver's door to the rack, a bottle into the bed, back in, on.
  atStop(dt, car) {
    const g = this.g, c = this.cfg, sc = this.sc, s = sc.s, m = this.man, house = s.kind === 'house';
    sc.t += dt;
    const side = house ? -1 : 1, W2 = car.spec.wid / 2 + 0.6;
    const door = this.local(side * W2, 0.15, car), bed = this.local(side * W2, -1.4, car);
    switch (sc.step) {
      case 'park':
        if (sc.t < c.outAt) return;
        this.unseatBust(car);
        this.showMan(door.x, door.z, car.yaw);
        if (house) this.goal(m, bed.x, bed.z, c.walk, this.faceTruck(side, car));
        else this.goal(m, c.rack[0], c.rack[1], c.walk, c.rack[2]);
        this.setStep(house ? 'walk' : 'rack');
        this.note('out', { stop: house ? s.k : 'depot' });
        return;
      case 'walk':
        if (this.at(m)) this.setStep('call');
        return;
      case 'rack':
        if (!this.at(m)) return;
        if (sc.rackAt == null) sc.rackAt = sc.t;
        if (sc.t - sc.rackAt < c.rackSecs) return;
        m.anim.butano = 'carry';
        this.goal(m, bed.x, bed.z, c.walk, this.faceTruck(side, car));
        this.setStep('load');
        this.note('rack');
        return;
      case 'load':
        if (!this.at(m)) return;
        m.anim.butano = false;
        this.clonk(m);
        this.goal(m, door.x, door.z, c.walk, car.yaw);
        this.setStep('back');
        return;
      case 'call':
        this.calling(car, s);
        return;
      case 'swap':
        this.swapping(car, s);
        return;
      case 'back':
        if (!this.at(m)) return;
        this.hideMan();
        this.seatBust(car);
        this.setStep('wait');
        return;
      case 'wait': {
        const r = this.out.find((o) => o.s === s);
        if (house && r && r.ch.state === 'normal' && dist(r.ch.x, r.ch.z, car.x, car.z) < car.spec.wid / 2 + 2 && sc.t < 4) return;
        if (!house && g.time - sc.t0 < c.depotSecs) return;
        this.depart(car);
        return;
      }
    }
  }
  setStep(step) { this.sc.step = step; this.sc.t = 0; }

  // At the bed: bursts of knocks with the call, the resident out after the first, Stig as a customer.
  calling(car, s) {
    const g = this.g, c = this.cfg, sc = this.sc, m = this.man, K = c.knock;
    if (sc.deal) { this.dealing(car, s); return; }
    if (m.state !== 'normal') return;
    this.offering(car, s);
    if (sc.deal) return;
    // A stroke under way: the spanner up and down onto the bottle (the clonk at the bottom).
    const st = sc.stroke;
    if (st) {
      const k = (g.time - st.t0) / K.period - st.i;
      m.anim.butano = 'knock';
      m.anim.butanoK = Math.min(1, k);
      if (k >= 1) {
        this.clonk(m);
        if (++st.i >= K.n) { sc.stroke = null; m.anim.butano = false; }
      }
    }
    const nb = this.out.find((o) => o.s === s && o.step !== 'home');
    const coming = !!nb;
    if (coming && nb.step === 'wait') {
      // The resident at the truck: the swap.
      sc.stroke = null;
      m.anim.butano = false;
      this.setStep('swap');
      return;
    }
    // Bursts while nobody is coming (`knock.bursts` of them) or while the resident is on the way.
    if (!st && g.time >= sc.burstAt) {
      if (sc.bursts >= K.bursts && !coming && sc.comeAt == null) { this.backIn(car); return; }
      sc.bursts++;
      sc.burstAt = g.time + K.every;
      sc.stroke = { t0: g.time, i: 0 };
      if (!g.saying(m)) g.say(m, c.call, 1.6);
      this.callT = g.time;
      this.n.calls++;
      this.note('call', { stop: s.k, burst: sc.bursts });
      // The resident: always at the house's first visit this session, then now and then (not while he
      // is still on his way home from the last visit).
      if (sc.bursts === 1 && !this.out.some((o) => o.s === s) && (s.visits === 1 || Math.random() < c.come)) sc.comeAt = g.time + c.comeAt;
    }
    if (sc.comeAt != null && g.time >= sc.comeAt) { sc.comeAt = null; this.comeOut(car, s); }
  }

  // The swap: the resident's ask, a full bottle held out (its clonk off the bed), the butanero's thanks,
  // the resident home and the butanero back in.
  swapping(car, s) {
    const g = this.g, c = this.cfg, sc = this.sc, m = this.man, nb = this.out.find((o) => o.s === s);
    if (!nb || nb.ch.state !== 'normal') { m.anim.butano = false; this.backIn(car); return; }
    if (m.goal) m.goal.face = yawTo(nb.ch.x - m.x, nb.ch.z - m.z);
    if (!sc.asked) {
      sc.asked = true;
      g.say(nb.ch, c.buy[s.who], 2.2);
      this.note('swap', { stop: s.k, who: s.who });
    }
    if (!sc.held && sc.t >= c.swapAt) { sc.held = true; m.anim.butano = 'out'; this.clonk(m); }
    if (!sc.thanked && sc.t >= c.swapAt + 0.9) {
      sc.thanked = true;
      m.anim.butano = false;
      g.say(m, c.thanks, 2.2);
      this.sendHome(nb);
      this.n.served++;
    }
    if (sc.thanked && sc.t >= c.swapAt + 1.6) this.backIn(car);
  }
  backIn(car) {
    const m = this.man, door = this.local(-(car.spec.wid / 2 + 0.6), 0.15, car);
    m.anim.butano = false;
    this.goal(m, door.x, door.z, this.cfg.walk, car.yaw);
    this.setStep('back');
  }

  // ---------------------------------------------------------------------------------------------
  // Stig taken for a customer

  stigFree() {
    const g = this.g, p = g.player;
    return !g.playerCar && p.state === 'normal' && p.onGround && !g.carrying && !g.inDialog && !g.inCutaway && !hud.dialogActive
      && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0);
  }
  offering(car, s) {
    const g = this.g, c = this.cfg.offer, sc = this.sc, m = this.man, p = g.player;
    if (sc.offered || g.time - this.offerT < c.every || !this.stigFree() || dist(p.x, p.z, m.x, m.z) > c.r) return;
    if (this.out.some((o) => o.s === s && o.step !== 'home' && dist(o.ch.x, o.ch.z, m.x, m.z) < 4)) return;
    sc.offered = true;
    this.offerT = g.time;
    sc.stroke = null;
    sc.deal = { t0: g.time };
    m.anim.butano = 'out';
    g.unsay(m);
    g.say(m, c.ask, 2);
    this.note('offer', { stop: s.k });
  }
  dealing(car, s) {
    const g = this.g, c = this.cfg.offer, sc = this.sc, m = this.man, p = g.player, d = sc.deal;
    if (m.goal) m.goal.face = yawTo(p.x - m.x, p.z - m.z);
    if (g.time - d.t0 < c.yesAt) return;
    sc.deal = null;
    m.anim.butano = false;
    if (m.goal) m.goal.face = this.faceTruck(-1, car);
    sc.burstAt = Math.max(sc.burstAt, g.time + 2.5);
    if (!this.stigFree() || dist(p.x, p.z, m.x, m.z) > c.leaveR) { this.note('walked'); return; }
    this.sell();
  }
  async sell() {
    const g = this.g, c = this.cfg.offer, p = g.player, m = this.man, coins = g.coins;
    g.say(p, c.yes, 1.8);
    await g.pay(c.price);
    audio.coin();
    hud.toast(fmt(c.toast, { n: pta(c.price) }));
    this.carry = { item: 'butano', butano: true };
    g.carrying = this.carry;
    g.speedCap = g.levelDef.speeds.walk;
    g.bumpedT = 0;
    p.anim.butano = 'carry';
    g.records.butano = (g.records.butano || 0) + 1;
    g.save();
    this.n.sold++;
    this.note('sold', { paid: coins - g.coins });
    this.later(0.9, () => { if (this.live && m.state === 'normal' && m.root.visible) g.say(m, c.thanks, 1.8); });
    this.later(3.2, () => { if (this.carry && !g.saying(p) && !g.inDialog) g.say(p, c.after, 2.4); });
  }

  // His bottle in both arms: stowed in a car he gets into; burst by a fall, a knock or R.
  carried() {
    const g = this.g, p = g.player;
    if (!this.carry) return;
    if (g.carrying !== this.carry) { this.carry = null; if (p.anim.butano) p.anim.butano = false; return; }
    if (g.playerCar) { this.endCarry('stowed'); return; }
    if (p.state === 'flung' || p.state === 'down' || g.bumpedT > 0) {
      const x = p.x, y = p.y, z = p.z;
      this.endCarry('burst');
      this.burst(x, y + 0.5, z, 'stig');
      this.later(0.6, () => { if (!g.saying(p)) g.say(p, this.cfg.popLine, 1.4); });
      return;
    }
    if (p.state === 'normal' && p.anim.butano !== 'carry') p.anim.butano = 'carry';
  }
  endCarry(kind) {
    const g = this.g, p = g.player;
    if (!this.carry) return;
    if (g.carrying === this.carry) { g.carrying = null; g.speedCap = null; }
    this.carry = null;
    p.anim.butano = false;
    if (kind !== 'gone') this.note(kind);
  }

  // ---------------------------------------------------------------------------------------------
  // The butanero on foot

  showMan(x, z, yaw) {
    const m = this.man;
    m.state = 'normal';
    m.teleport(x, z, yaw);
    m.root.visible = true;
    m.goal = null;
    this.manMode = 'scene';
  }
  hideMan() {
    const m = this.man, g = this.g;
    if (m.state !== 'hidden') g.unsay(m);
    m.state = 'hidden';
    m.root.visible = false;
    m.goal = null;
    m.wishX = m.wishZ = m.vx = m.vz = 0;
    m.anim.butano = false; m.anim.oath = false; m.anim.sprint = false;
    this.manMode = null;
    this.rob = null;
  }
  goal(ch, x, z, sp, face = null) { ch.goal = { x, z, sp, face }; ch.prog = { x: ch.x, z: ch.z, t: 0 }; }
  at(ch, r = 0.3) { return ch.state === 'normal' && (!ch.goal || dist(ch.x, ch.z, ch.goal.x, ch.goal.z) < r); }

  // E at the wheel of his truck (main.enterCar; its driver bust already off): he tumbles out himself, not
  // a passer-by, and asks Stig nothing; Stig's sorry asks him whether it is his. True when it was his.
  carjack(car) {
    const g = this.g;
    if (!this.isTruck(car) || !this.live) return false;
    const e = g.exitSpot(car, 1);
    this.showMan(e.x, e.z, car.yaw);
    this.man.fling(Math.cos(car.yaw) * 4, 4, -Math.sin(car.yaw) * 4);
    g.sorry.carjack(this.man);
    this.taken('carjack');
    this.n.takes++;
    return true;
  }
  // Stig at its wheel: his truck now. The butanero (out, or out of it) shouts after it; a resident goes home.
  taken(why) {
    const g = this.g, car = this.car;
    if (why === 'getin') this.n.takes++;
    this.phase = 'taken';
    this.sc = null;
    this.waits.clear();
    for (const r of this.out) if (r.step !== 'home') this.sendHome(r);
    const m = this.man;
    if (m.state !== 'hidden') {
      m.goal = null;
      m.anim.butano = false;
      this.manMode = 'robbed';
      this.rob = { t: 0, i: 0, at: g.time + (why === 'carjack' ? 1.6 : 0.4) };
    }
    this.note(why === 'getin' ? 'take' : why, { bottles: car.bottles.filter(Boolean).length });
  }

  tickMan(dt) {
    const g = this.g, c = this.cfg, m = this.man;
    if (m.state === 'hidden') return;
    this.stuck(m, dt);
    if (this.manMode === 'robbed' || this.manMode === 'off') {
      const r = this.rob, car = this.car;
      r.t += dt;
      const d = car ? dist(m.x, m.z, car.x, car.z) : Infinity;
      if (this.manMode === 'robbed') {
        if (m.state === 'normal' && car) m.yaw = dampAngle(m.yaw, yawTo(car.x - m.x, car.z - m.z), 6, dt);
        m.anim.oath = g.saying(m);
        if (g.time >= r.at && m.state === 'normal' && d < 45) {
          r.at = g.time + c.shoutEvery;
          const text = c.robbed[r.i++ % c.robbed.length];
          g.say(m, text, 2);
          this.note('shout', { text });
        }
        if (r.t > c.sulkSecs || d > 60) { this.manMode = 'off'; m.anim.oath = false; }
      } else if (m.state === 'normal' && (this.unseen(m.x, m.y + 1, m.z, 1.4) || dist(m.x, m.z, g.focus().x, g.focus().z) > 90)) this.hideMan();
    }
  }

  // ---------------------------------------------------------------------------------------------
  // A resident

  comeOut(car, s) {
    const g = this.g, c = this.cfg, ch = this.resident(s);
    ch.state = 'normal';
    ch.teleport(s.door.x, s.door.z, yawTo(s.outGate.x - s.door.x, s.outGate.z - s.door.z));
    ch.root.visible = true;
    ch.anim.butano = 'carry';
    const spot = this.local(-(car.spec.wid / 2 + 1.45), -1.55, car);
    this.out.push({ ch, s, step: 'go', leg: 0, legs: [s.inGate, s.outGate, spot], face: this.faceTruck(-1, car) });
    this.goal(ch, s.inGate.x, s.inGate.z, c.neighbourWalk);
    this.note('come', { stop: s.k, who: s.who });
  }
  tickResidents(dt) { for (const r of this.out.slice()) this.tickResident(r, dt); }
  tickResident(nb, dt) {
    const c = this.cfg, ch = nb.ch;
    this.stuck(ch, dt);
    if (ch.state !== 'normal') return;
    if (nb.step === 'go') {
      if (!this.at(ch)) return;
      if (++nb.leg < nb.legs.length) {
        const q = nb.legs[nb.leg];
        this.goal(ch, q.x, q.z, c.neighbourWalk, nb.leg === nb.legs.length - 1 ? nb.face : null);
      } else nb.step = 'wait';
    } else if (nb.step === 'home') {
      const legs = [nb.s.outGate, nb.s.inGate, nb.s.door];
      if (nb.leg === 0 && !ch.goal) { this.goal(ch, legs[0].x, legs[0].z, c.neighbourWalk); return; }
      if (!this.at(ch)) return;
      if (nb.leg < legs.length) {
        const q = legs[nb.leg++];
        this.goal(ch, q.x, q.z, c.neighbourWalk);
      } else { this.hideResident(nb); this.note('home', { stop: nb.s.k }); }
    }
  }
  // Back to his door from wherever he is (the swap done, the truck gone or taken).
  sendHome(nb) {
    nb.step = 'home';
    nb.leg = 0;
    nb.ch.goal = null;
    nb.ch.anim.butano = 'carry';
  }
  hideResident(nb) {
    const ch = nb.ch;
    this.g.unsay(ch);
    ch.state = 'hidden';
    ch.root.visible = false;
    ch.goal = null;
    ch.wishX = ch.wishZ = ch.vx = ch.vz = 0;
    ch.anim.butano = false;
    this.out.splice(this.out.indexOf(nb), 1);
  }

  // No headway for 2.5 s while he means to move: where nobody sees it (or after 6 s anyway) he is put
  // where he was going.
  stuck(ch, dt) {
    const q = ch.goal, pr = ch.prog;
    if (!q || !pr || ch.state !== 'normal' || dist(ch.x, ch.z, q.x, q.z) < 0.3) { if (pr) { pr.x = ch.x; pr.z = ch.z; pr.t = 0; } return; }
    pr.t += dt;
    if (dist(ch.x, ch.z, pr.x, pr.z) > 0.5) { pr.x = ch.x; pr.z = ch.z; pr.t = 0; return; }
    if (pr.t > 6 || (pr.t > 2.5 && this.unseen(ch.x, ch.y + 1, ch.z, 1.4))) {
      ch.teleport(q.x, q.z, q.face ?? ch.yaw);
      pr.t = 0;
    }
  }

  // main.js fixedStep: the butanero's and a resident's walks.
  step(h) {
    for (const ch of [this.man, ...this.out.map((r) => r.ch)]) {
      if (ch.state === 'hidden') continue;
      const q = ch.goal;
      if (q && ch.state === 'normal') {
        const dx = q.x - ch.x, dz = q.z - ch.z, d = Math.hypot(dx, dz);
        if (d > 0.12) {
          const sp = Math.min(q.sp, 0.35 + d * 2);
          ch.wishX = (dx / d) * sp; ch.wishZ = (dz / d) * sp;
        } else {
          ch.wishX = ch.wishZ = 0;
          if (q.face != null) ch.yaw = dampAngle(ch.yaw, q.face, 10, h);
        }
      } else ch.wishX = ch.wishZ = 0;
      ch.step(h, this.g);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The bottles off the bed

  // A hard knock to his truck at its wheel (main.onCarImpact 'crash', onCarLanded 'land').
  jolt(car, kind, impact) {
    const g = this.g, J = this.cfg.jolt;
    if (!this.live || this.phase !== 'taken' || !this.isTruck(car) || car !== g.playerCar || car.dead) return;
    if (impact < (kind === 'land' ? J.land : J.crash) || this.gapT > 0) return;
    this.gapT = J.gap;
    const n = impact >= J.two ? 2 : 1;
    for (let k = 0; k < n; k++) this.throwOff(car, 'jolt', impact);
  }
  // The first bottle still in the bed (the tailgate's row first) off over a side, a little back, up.
  throwOff(car, why, impact = 0) {
    const i = car.bottles.indexOf(true);
    if (i < 0) return false;
    const F = this.cfg.jolt.fly, fx_ = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    car.bottleWorld(i, _w);
    car.setBottle(i, false);
    const side = BOTTLE_SLOTS[i][0] > 0.2 ? 1 : BOTTLE_SLOTS[i][0] < -0.2 ? -1 : Math.random() < 0.5 ? 1 : -1;
    const wreck = why === 'wreck', sd = wreck ? 1.5 + Math.random() * 3 : F.side * (0.7 + Math.random() * 0.6);
    const b = {
      mesh: bottleMesh(), why, t: 0,
      x: _w.x, y: _w.y, z: _w.z,
      vx: car.vx * F.keep - fx_ * F.back * (wreck ? Math.random() * 2 - 1 : 1) + fz * side * sd,
      vz: car.vz * F.keep - fz * F.back * (wreck ? Math.random() * 2 - 1 : 1) - fx_ * side * sd,
      vy: wreck ? 4 + Math.random() * 5 : F.up * (0.85 + Math.random() * 0.3),
      rx: 0, rz: 0, wx: (Math.random() - 0.5) * 14, wz: side * (6 + Math.random() * 5),
    };
    b.mesh.position.set(b.x, b.y, b.z);
    scene.add(b.mesh);
    this.loose.push(b);
    this.n.thrown++;
    this.note('throw', { slot: i, why, impact: +impact.toFixed(2), left: car.bottles.filter(Boolean).length });
    return true;
  }
  tickLoose(dt) {
    for (const b of this.loose.slice()) {
      b.t += dt;
      b.vy -= 20 * dt;
      const nx = b.x + b.vx * dt, nz = b.z + b.vz * dt, ny = b.y + b.vy * dt;
      let hit = b.t > 4;
      queryBlocks(nx - 0.3, nz - 0.3, nx + 0.3, nz + 0.3, _bl);
      for (const bl of _bl) if (topAt(bl, nx, nz) > ny + 0.3 && circleVsBlock(nx, nz, 0.2, bl, _h)) { hit = true; break; }
      if (!hit) {
        b.x = nx; b.z = nz; b.y = ny;
        const gh = groundAt(b.x, b.z, b.y + 0.4, 0.6);
        if (b.y <= gh) { b.y = gh; hit = true; }
      }
      b.rx += b.wx * dt; b.rz += b.wz * dt;
      b.mesh.position.set(b.x, b.y, b.z);
      b.mesh.rotation.set(b.rx, 0, b.rz);
      if (hit) {
        scene.remove(b.mesh);
        this.loose.splice(this.loose.indexOf(b), 1);
        this.burst(b.x, b.y + 0.35, b.z, b.why, b.vx, b.vz);
      }
    }
  }
  // A bottle bursting at (x, y, z): sparks, smoke, the bang; off the bed also coins, and from his knock
  // SKANDAL and his sorry.
  burst(x, y, z, why, vx = 0, vz = 0) {
    const g = this.g, P = this.cfg.pop, f = g.focus(), d = dist(x, z, f.x, f.z);
    fx.sparks(x, y, z, P.sparks);
    fx.smoke(x, y + 0.1, z, true); fx.smoke(x, y + 0.3, z, true); fx.smoke(x, y + 0.6, z, false);
    audio.gasPop(clamp(1 - d / 70, 0, 1));
    if (why !== 'stig') burstCoins(x, y, z, why === 'wreck' ? this.cfg.wreckCoins : P.coins, vx, vz);
    if (why === 'jolt') { g.shame.add(P.shame); g.sorry.offence('boom'); }
    this.n.pops++;
    this.note('pop', { why, x: +x.toFixed(1), z: +z.toFixed(1) });
  }
  // main.onCarDestroyed: his wreck throws the rest of the bottles up; with the butanero at its wheel he
  // tumbles out and shouts.
  onDestroyed(car) {
    const g = this.g;
    if (!this.isTruck(car) || !this.live) return;
    this.n.wrecks++;
    this.note('wreck', { bottles: car.bottles.filter(Boolean).length });
    while (this.throwOff(car, 'wreck'));
    // Not his at the time: the butanero tumbles out of his cab, or stands where he was, and shouts.
    if (this.phase === 'drive' || this.phase === 'stop') {
      if (this.man.state === 'hidden') {
        const e = g.exitSpot(car, 1);
        this.showMan(e.x, e.z, car.yaw);
        this.man.fling((Math.random() - 0.5) * 5, 5, (Math.random() - 0.5) * 5);
      }
      this.taken('wreck');
      this.phase = 'left';
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The queue behind it, his spanner

  // Traffic queued behind it (within `queue.r` m of its tail, in its line, its way) waits there, never the
  // AI's shove on after 3.5 s; held up for `queue.after` s it honks, again every `queue.every` s or so.
  queueUp(dt, car) {
    const g = this.g, Q = this.cfg.queue, fx_ = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    for (const o of g.cars) {
      if (o === car || !o.traffic || !o.ai || o.dead) { this.waits.delete(o); continue; }
      const dx = o.x - car.x, dz = o.z - car.z;
      if (Math.abs(dx) > 40 || Math.abs(dz) > 40) { this.waits.delete(o); continue; }
      const back = -(dx * fx_ + dz * fz) - car.spec.len / 2 - o.spec.len / 2, lat = Math.abs(dx * fz - dz * fx_);
      const w = this.waits.get(o) || { t: 0, at: -Infinity };
      if (back > -0.5 && back < Q.r && lat < Q.lat && Math.cos(o.yaw - car.yaw) > 0.7) {
        o.ai.blockedT = Math.min(o.ai.blockedT, 3);
        w.t = o.speed < 2 ? w.t + dt : 0;
      } else w.t = 0;
      this.waits.set(o, w);
      if (w.t >= Q.after && g.time - w.at >= Q.every) {
        w.at = g.time + Math.random() * 1.5;
        g.onHonk(o);
      }
    }
  }
  clonk(ch) {
    const f = this.g.focus();
    audio.clonk(clamp(1 - dist(ch.x, ch.z, f.x, f.z) / this.cfg.earR, 0, 1));
    this.n.clonks++;
  }

  // Tests: the truck on its lap `back` m (along the lap) before route stop k, driving, the butanero at
  // its wheel; whatever was out before is put away.
  jump(k, back = 30) {
    if (!this.lap) this.build();
    this.release('jump');
    const s = this.route[k];
    let j = Math.min(s.i, this.lap.length - 2), d = 0;
    while (j > 1 && d < back) { d += dist(this.lap[j].x, this.lap[j].z, this.lap[j - 1].x, this.lap[j - 1].z); j--; }
    if (!this.spawn(j)) return false;
    this.next = k;
    this.g.cam.snapNext = true;
    return true;
  }

  // ---------------------------------------------------------------------------------------------
  // HUD

  objective() {
    const car = this.mine();
    if (!car || !this.live || this.phase !== 'taken') return null;
    return { title: this.cfg.title, text: fmt(this.cfg.text, { n: car.bottles.filter(Boolean).length, m: car.bottles.length }) };
  }
}
