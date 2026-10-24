// Guaguan – åk buss och snacka fotboll (free roam, DESIGN §10.53; feature 112). At a PARADA GUAGUA stop
// (world/town.js `busStops`), Stig on foot gets "E Vänta på guaguan": he stands at the kerb looking up
// the road, the camera cuts to the sidewalk behind him, and a green guagua of the module's own comes
// down the near lane from behind the camera and stops with its door by the bench. "E Kliv på guaguan"
// puts him in the passenger seat beside the driver; the bus drives on with the chase camera on it while
// they talk (the first ride the film's football talk, Ole's bust at a window), W/S choose the stop,
// and the picture fades out and in again with Stig off at that stop and the bus driving away. Only on
// the island with no mission running; a mission start or a debug warp takes him off and the bus away.
//
// While he rides he is seated in the bus as its passenger (game.seat, side −1: no physics, no
// interactables) and the bus is never `playerCar`; main.js points the chase camera at the bus
// (`camFocus`), shows the card (`objective`) and the keys (`hint`), plays the bus's engine, blocks R
// (`onBus`) and collects no coin or collectible on the way.

import { GUAGUA } from '../content/index.js';
import { AIDriver, LanePath, startNodes } from '../actors/drivers.js';
import { Car } from '../actors/car.js';
import { randomPed } from '../actors/models.js';
import { busStops } from '../world/town.js';
import { N, P, HALF, RHW, LANE, nodeI, nodeJ, nodeId, nodeX, nodeZ, rc } from '../world/layout.js';
import { obbVsObb } from '../world/collision.js';
import { THREE, scene, camera } from '../gfx.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt } from '../strings.js';
import { clamp, dist, lerp, angleDiff, mulberry32 } from '../util.js';

const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere(), _h = {};

export class Guagua {
  constructor(game, cfg = GUAGUA) {
    this.g = game;
    this.cfg = cfg;
    this.sc = null;       // the ride under way: { phase: 'wait' | 'door' | 'board' | 'ride' | 'fade', stop, car, t, s, film, ole, dest, said, done, … }
    this.away = [];       // buses done with him: { car, goAt } (g.time)
    this.queue = [];      // [{ at, fn }] (g.time)
    this.rides = 0;       // tests: rides to a stop this session
    this.last = null;     // tests: { kind: 'wait' | 'door' | 'board' | 'ride' | 'arrive' | 'cancel' | 'leave' | 'gone' | 'warp', t, stop, … }
    // The stops in the loop's order, each with its frame: `d` the bus's way (the bench's right as he
    // faces the road), `f` towards the road, `lane` the near lane's offset out from the bench.
    this.stops = cfg.order.map((key) => busStops.find((b) => b.key === key)).filter(Boolean).map((b) => this.frameOf(b));
    for (const stop of this.stops) {
      game.addInteractable({ id: `guagua-${stop.key}`, r: cfg.r, prompt: cfg.prompt, pos: () => this.at(stop, cfg.wait[0], cfg.wait[1]), enabled: () => this.canUse() && !this.leaving(stop), use: () => this.start(stop) });
    }
    game.addInteractable({ id: 'guagua-door', r: cfg.boardR, prompt: cfg.boardPrompt, priority: 5, pos: () => this.doorSpot(), enabled: () => this.canBoard(), use: () => this.board() });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get busy() { return !!this.sc; }
  get car() { return this.sc?.car || null; }
  get riding() { return this.sc?.phase === 'ride'; }
  // Getting on, seated in the bus or in the fade off it: R is not his (main.js), no pickups.
  get onBus() { const ph = this.sc?.phase; return ph === 'board' || ph === 'ride' || ph === 'fade'; }
  get dest() { return this.sc?.dest || null; }

  // On foot at a stop: no scene, car, carry, pursuit, bust, PANIK or other free-roam hold.
  free() {
    const g = this.g, p = g.player;
    return this.live && !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying
      && p.state === 'normal' && p.onGround && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active
      && !g.skis.on && !g.gatlopp.mode && !g.hitch.busy;
  }
  canUse() { return !this.sc && this.free(); }
  // A bus that has just let him off (or gone without him) still by the stop: no new wait there yet.
  leaving(stop) { return this.away.some((a) => dist(a.car.x, a.car.z, stop.x, stop.z) < this.cfg.awayR / 2); }
  canBoard() { return this.sc?.phase === 'door' && this.free(); }

  // ---------------------------------------------------------------------------------------------
  // The stops

  frameOf(b) {
    const f = { x: Math.sin(b.yaw), z: Math.cos(b.yaw) }, d = { x: -f.z, z: f.x };
    // The road's centre line across the bench (the nearest grid line out along f).
    const line = (v) => rc(Math.max(0, Math.min(N, Math.round((v + HALF) / P))));
    const off = Math.abs(f.x) > 0.5 ? Math.abs(line(b.x + f.x * (RHW + 3)) - b.x) : Math.abs(line(b.z + f.z * (RHW + 3)) - b.z);
    return { ...b, f, d, yb: Math.atan2(d.x, d.z), lane: off - LANE, name: this.cfg.names[b.key] || b.key };
  }
  // A point `along` m the bus's way and `out` m towards the road from the bench.
  at(stop, along, out) { return { x: stop.x + stop.d.x * along + stop.f.x * out, z: stop.z + stop.d.z * along + stop.f.z * out, yaw: stop.yb }; }
  // Where the bus's middle stands at the stop: on the near lane, its door by the bench.
  busSpot(stop) { return this.at(stop, -this.cfg.door, stop.lane); }
  // The door's kerb side (the board prompt's place), while the bus waits there.
  doorSpot() {
    const sc = this.sc;
    if (sc?.phase !== 'door') return null;
    const car = sc.car, fx = Math.sin(car.yaw), fz = Math.cos(car.yaw), rx = -fz, rz = fx, w = car.spec.wid / 2 + 0.8;
    return { x: car.x + fx * this.cfg.door + rx * w, z: car.z + fz * this.cfg.door + rz * w };
  }
  // The next stop in the loop after `stop` (k steps on).
  next(stop, k = 1) { const n = this.stops.length, i = this.stops.indexOf(stop); return this.stops[(((i + k) % n) + n) % n]; }

  // A bus's footprint at `s` ({ x, z, yaw }) clear of every car but `but` (`still`: of every car standing
  // there; one driving through is not in the way).
  clear(s, but = null, still = false) {
    const g = this.g, sp = { wid: 2.5, len: 10.5 }, pad = 0.4;
    const o = { x: s.x, z: s.z, fx: Math.sin(s.yaw), fz: Math.cos(s.yaw), hx: sp.wid / 2 + pad, hz: sp.len / 2 + pad };
    for (const car of g.cars) if (car !== but && !car.dead && !(still && car.speed > 1.5) && obbVsObb(o, car.obb, _h)) return false;
    return true;
  }

  // ---------------------------------------------------------------------------------------------
  // The bus

  // Nodes on from a car's lane: straight on, else left (the town's edge), else right (its corners).
  extend(nodes, n) {
    for (let k = 0; k < n; k++) {
      const b = nodes[nodes.length - 1], a = nodes[nodes.length - 2];
      const di = Math.sign(nodeI(b) - nodeI(a)), dj = Math.sign(nodeJ(b) - nodeJ(a));
      for (const [ei, ej] of [[di, dj], [dj, -di], [-dj, di]]) {
        const i = nodeI(b) + ei, j = nodeJ(b) + ej;
        if (i >= 0 && j >= 0 && i <= N && j <= N) { nodes.push(nodeId(i, j)); break; }
      }
    }
    return nodes;
  }
  drive(car, cruise = this.cfg.cruise) {
    car.ai = new AIDriver(car, { mode: 'route', path: new LanePath(this.extend(startNodes(car), 4)), cruise, wobble: 0 });
    car.ctrl.park = false;
  }
  // The polyline the bus drives from `s` for about `len` m (Ole's check).
  route(s, len) {
    const fake = { x: s.x, z: s.z, yaw: s.yaw }, nodes = this.extend(startNodes(fake), 3), pts = [[s.x, s.z]];
    for (const n of nodes.slice(1)) pts.push([nodeX(n), nodeZ(n)]);
    const out = [];
    let left = len;
    for (let k = 1; k < pts.length && left > 0; k++) {
      const [ax, az] = pts[k - 1], [bx, bz] = pts[k], l = Math.hypot(bx - ax, bz - az);
      for (let u = 0; u <= Math.min(l, left); u += 10) out.push([ax + (bx - ax) * u / l, az + (bz - az) * u / l]);
      left -= l;
    }
    return out;
  }

  spawn(stop, film) {
    const g = this.g, c = this.cfg, s = this.busSpot(stop), d = stop.d;
    const along = (q) => q.x * d.x + q.z * d.z;   // the road's own coordinate (it runs along d)
    let at = null;
    for (const back of c.spawn) {
      const q = { x: s.x - d.x * back, z: s.z - d.z * back, yaw: stop.yb };
      if (Math.abs(along(q)) > HALF - c.edge) continue;   // past the road's start at the town's edge
      if (g.cars.some((o) => dist(o.x, o.z, q.x, q.z) < 9)) continue;
      at = q;
      break;
    }
    if (!at) return null;
    const car = new Car('guagua');
    car.place(at.x, at.z, at.yaw);
    car.vx = d.x * c.spawnV;
    car.vz = d.z * c.spawnV;
    car.locked = true;        // not his to take, and no carjack
    car.noEnter = true;
    car.invulnerable = true;  // never wrecked with him in it
    car.guagua = true;
    g.addCar(car);
    g.addBust(c.driver, car);
    const r = mulberry32((g.frame * 7919 + this.stops.indexOf(stop) * 131) >>> 0);
    for (const slot of c.riders) g.addRider(randomPed(r), car, slot);
    // Ole's bust at the window on the film's ride, unless the real Ole is in sight of the ride.
    const ole = g.npcs.ole;
    const seen = !!ole && ole.state !== 'hidden' && ole.root.visible
      && (dist(ole.x, ole.z, stop.x, stop.z) < c.oleR || this.route(s, c.oleRoute).some(([x, z]) => dist(ole.x, ole.z, x, z) < c.oleR));
    const bust = film && !seen ? g.addRider('ole', car, c.oleSlot) : null;
    this.drive(car);
    return { car, bust, seen };
  }

  // Bubble anchors: over the driver's head at the wheel, over Ole's bust at his window.
  anchor(car) {
    const a = (car.guaguaAnchor ||= { x: 0, y: 0, z: 0, height: 1.25 });
    car.seatWorld(1, a);
    return a;
  }
  oleAnchor(car, bust) {
    const a = (car.oleAnchor ||= { x: 0, y: 0, z: 0, height: 1.25, who: 'ole' }), p = bust.position;   // (his voice, voice.js)
    const c = Math.cos(car.yaw), sn = Math.sin(car.yaw);
    a.x = car.x + p.x * c + p.z * sn;
    a.y = car.y + p.y;
    a.z = car.z - p.x * sn + p.z * c;
    return a;
  }

  inView(car) {
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    return _frustum.intersectsSphere(_sphere.set(_sphere.center.set(car.x, car.y + 1.5, car.z), car.radius + 0.5));
  }

  // The bus is done with him: it waits until `goAt` (g.time), then drives on and is taken away out of
  // sight.
  leave(car, go = 0) { this.away.push({ car, goAt: this.g.time + go }); }
  tickAway() {
    const g = this.g, c = this.cfg;
    for (const a of this.away.slice()) {
      const car = a.car;
      if (!g.cars.includes(car)) { this.away.splice(this.away.indexOf(a), 1); continue; }
      this.anchor(car);
      if (a.goAt != null && g.time >= a.goAt) { a.goAt = null; this.drive(car); }
      const d = dist(car.x, car.z, camera.position.x, camera.position.z);
      if (a.goAt == null && ((d > c.awayR && !this.inView(car)) || d > c.awayFar)) {
        g.unsay(car.guaguaAnchor);
        g.removeCar(car);
        this.away.splice(this.away.indexOf(a), 1);
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The wait

  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }

  start(stop) {
    if (!this.canUse()) return;
    const g = this.g, c = this.cfg, p = g.player;
    if (!this.clear(this.busSpot(stop), null, true)) { hud.toast(c.blocked); this.last = { kind: 'blocked', t: g.time, stop: stop.key }; return; }
    const film = !(g.records.guagua > 0);
    const r = this.spawn(stop, film);
    if (!r) { hud.toast(c.never); this.last = { kind: 'cancel', t: g.time, stop: stop.key, why: 'spawn' }; return; }
    const w = this.at(stop, c.wait[0], c.wait[1]);
    p.teleport(w.x, w.z, stop.yb + Math.PI);   // looking up the road, where it comes from
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    p.anim.sprint = false;
    g.inDialog = true;
    this.shoot(stop);
    this.sc = { phase: 'wait', stop, car: r.car, t: 0, s: this.busSpot(stop), film, ole: r.bust, seen: r.seen, dest: this.next(stop), said: [], done: false };
    this.last = { kind: 'wait', t: g.time, stop: stop.key, film, ole: !!r.bust };
  }
  shoot(stop) {
    const g = this.g, s = this.cfg.shot, gy = g.groundAt(stop.x, stop.z);
    const q = ([a, o, y]) => { const w = this.at(stop, a, o); return { x: w.x, y: gy + y, z: w.z }; };
    g.cam.cutTo(q(s.eye), q(s.look));
    g.cam.snapNext = true;
  }

  // The bus on its way to the stop: on the near lane, heading its way, from `approach` m before it it
  // brakes to stand with its door by the bench.
  coming(dt) {
    const g = this.g, c = this.cfg, sc = this.sc, car = sc.car, s = sc.s;
    if (input.pressed('hangUp')) { this.cancel('quit'); return; }
    if (sc.t > c.waitMax || !g.cars.includes(car)) { this.cancel('nobody'); return; }
    if (!car.ai) { if (car.speed < 0.2) this.stopped(); return; }
    const park = () => { car.ai = null; Object.assign(car.ctrl, { throttle: 0, brake: 1, steer: 0, park: true }); };
    // Held up short of the stop (a car standing in the lane, a queue): the driver waits behind it (never
    // the AI's shove on after 3.5 s) and opens the door where he is.
    car.ai.blockedT = Math.min(car.ai.blockedT, 3);
    sc.held = car.speed < 0.3 && dist(car.x, car.z, s.x, s.z) < c.heldR ? (sc.held || 0) + dt : 0;
    if (sc.held > c.heldSecs) { park(); return; }
    const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), dx = s.x - car.x, dz = s.z - car.z;
    const along = dx * fx + dz * fz, lat = dx * fz - dz * fx;
    if (Math.cos(car.yaw - s.yaw) < 0.94 || Math.abs(lat) > 2.5 || along > c.approach) return;
    car.ai.cruise = clamp(Math.sqrt(2 * c.brake * Math.max(0, along - 0.4)), c.creep, c.cruise);
    if (along < 0.4) park();
  }

  // Q, or no bus: the camera back on him, the bus (if any) driving on by.
  cancel(why) {
    const g = this.g, sc = this.sc;
    if (why === 'nobody') hud.toast(this.cfg.never);
    g.cam.release();
    g.cam.snapNext = true;
    g.inDialog = false;
    if (g.cars.includes(sc.car)) { if (!sc.car.ai) this.drive(sc.car); this.leave(sc.car); }
    this.last = { kind: 'cancel', t: g.time, stop: sc.stop.key, why };
    this.sc = null;
  }

  // At the stop: the chase camera behind him, turned to the door; the driver's hello.
  stopped() {
    const g = this.g, c = this.cfg, sc = this.sc, p = g.player, car = sc.car, stop = sc.stop;
    sc.phase = 'door';
    sc.t = 0;
    const q = this.doorSpot();
    sc.leaveR = Math.max(c.leaveR, dist(p.x, p.z, q.x, q.z) + 6);   // held up short of the stop, the door further off
    p.yaw = Math.atan2(stop.f.x, stop.f.z);
    p.root.rotation.y = p.yaw;
    g.cam.release();
    g.cam.yaw = stop.yb + this.cfg.doorCam;
    g.cam.snapNext = true;
    g.inDialog = false;
    g.say(this.anchor(car), c.hello, 2.2);
    audio.door();
    this.last = { kind: 'door', t: g.time, stop: stop.key, x: +car.x.toFixed(2), z: +car.z.toFixed(2), yaw: +car.yaw.toFixed(3) };
  }
  // At the door: walked off, held up or kept waiting, the bus goes without him.
  door() {
    const g = this.g, c = this.cfg, sc = this.sc, p = g.player, q = this.doorSpot();
    if (!g.cars.includes(sc.car)) { this.reset('gone'); return; }
    if (sc.t > c.doorWait || dist(p.x, p.z, q.x, q.z) > sc.leaveR || g.shame.pursuit || g.playerCar) {
      g.say(this.anchor(sc.car), c.bye, 1.6);
      this.leave(sc.car, 0.8);
      this.last = { kind: 'leave', t: g.time, stop: sc.stop.key };
      this.sc = null;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The ride

  board() {
    if (!this.canBoard()) return;
    const g = this.g, sc = this.sc, p = g.player, car = sc.car;
    sc.phase = 'board';
    sc.t = 0;
    g.inDialog = true;
    p.state = 'seated';
    p.wishX = p.wishZ = p.vx = p.vz = p.vy = 0;
    p.anim.sprint = false;
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw), rx = -fz, rz = fx, w = car.spec.wid / 2 - 0.3;
    sc.hop = { x0: p.x, y0: p.y, z0: p.z, yaw0: p.yaw, x1: car.x + fx * this.cfg.door + rx * w, z1: car.z + fz * this.cfg.door + rz * w, y1: car.y + car.seatY() };
    this.last = { kind: 'board', t: g.time, stop: sc.stop.key };
  }
  boarding() {
    const g = this.g, c = this.cfg, sc = this.sc, h = sc.hop, p = g.player, car = sc.car;
    const k = Math.min(1, sc.t / c.boardSecs);
    p.x = lerp(h.x0, h.x1, k);
    p.z = lerp(h.z0, h.z1, k);
    p.y = lerp(h.y0, h.y1, k) + 0.25 * 4 * k * (1 - k);
    p.yaw = h.yaw0 + angleDiff(h.yaw0, car.yaw) * k;
    p.root.position.set(p.x, p.y, p.z);
    p.root.rotation.set(0, p.yaw, 0);
    if (k < 1) return;
    g.seat(p, car, -1);
    audio.door();
    g.pay(c.fare);
    g.say(this.anchor(car), c.fareLine, 1.8);
    sc.phase = 'ride';
    sc.t = 0;
    sc.t0 = g.time;
    g.inDialog = false;
    g.cam.yaw = car.yaw;
    g.cam.snapNext = true;
    this.later(c.departAt, () => { if (this.sc === sc && sc.phase === 'ride') this.drive(car); });
    const set = sc.film ? c.film : c.rides[(Math.max(1, g.records.guagua || 0) - 1) % c.rides.length];
    sc.end = set.end;
    set.lines.forEach(([at, who, text], i) => this.later(at, () => {
      if (this.sc !== sc || sc.phase !== 'ride') return;
      const by = who === 'stig' ? p : who === 'ole' && sc.ole ? this.oleAnchor(car, sc.ole) : this.anchor(car);
      const line = who === 'ole' && !sc.ole ? c.oleAlt : text;
      g.say(by, line, 2.8);
      sc.said.push([who === 'ole' && !sc.ole ? 'chofer' : who, line]);
      if (i === set.lines.length - 1) sc.done = true;
    }));
    this.last = { kind: 'ride', t: g.time, stop: sc.stop.key, film: sc.film, ole: !!sc.ole };
  }
  ride() {
    const g = this.g, sc = this.sc, car = sc.car;
    if (!g.cars.includes(car) || g.player.car !== car) { this.reset('gone'); return; }
    if (sc.ole) this.oleAnchor(car, sc.ole);
    if (input.pressed('menuUp')) { sc.dest = this.next(sc.dest, -1); if (sc.dest === sc.stop) sc.dest = this.next(sc.dest, -1); audio.tone(660, 0.04, 'square', 0.04); }
    else if (input.pressed('menuDown')) { sc.dest = this.next(sc.dest); if (sc.dest === sc.stop) sc.dest = this.next(sc.dest); audio.tone(660, 0.04, 'square', 0.04); }
    else if (input.pressed('interact') || sc.t >= sc.end) this.fade(input.pressed('interact') ? 'skip' : 'end');
  }

  // Out at the chosen stop: the picture fades out, he stands there with the bus beside him, it fades in.
  fade(why) {
    const g = this.g, c = this.cfg, sc = this.sc, car = sc.car;
    sc.phase = 'fade';
    sc.why = why;
    g.inDialog = true;
    hud.fade(true);
    this.later(c.fadeSecs, () => { if (this.sc === sc) this.arrive(); });
    this.last = { kind: 'fade', t: g.time, stop: sc.stop.key, dest: sc.dest.key, why, ride: +(g.time - sc.t0).toFixed(2), done: sc.done, x: +car.x.toFixed(1), z: +car.z.toFixed(1) };
  }
  arrive() {
    const g = this.g, c = this.cfg, sc = this.sc, car = sc.car, p = g.player, dest = sc.dest;
    for (const t of [this.anchor(car), p, car.oleAnchor]) if (t) g.unsay(t);
    // The bus at the stop, or a little short of it when a car stands there.
    const w = this.at(dest, c.wait[0], c.wait[1]);
    const s = c.backOff.map((b) => this.at(dest, -c.door - b, dest.lane)).find((q) => this.clear(q, car)) || null, room = !!s;
    g.unseat(p, w.x, w.z);
    p.teleport(w.x, w.z, dest.yb);
    if (room) {
      car.ai = null;
      car.place(s.x, s.z, s.yaw);
      Object.assign(car.ctrl, { throttle: 0, brake: 1, steer: 0, handbrake: false, park: true });
    } else g.removeCar(car);
    g.cam.release();
    g.cam.yaw = dest.yb;
    g.cam.snapNext = true;
    if (sc.done) g.records.guagua = (g.records.guagua || 0) + 1;
    this.rides++;
    g.save();
    this.last = { kind: 'arrive', t: g.time, stop: sc.stop.key, dest: dest.key, why: sc.why, done: sc.done, bus: room, ride: +(g.time - sc.t0).toFixed(2), said: sc.said.slice() };
    this.sc = null;
    this.later(c.holdSecs, () => hud.fade(false));
    this.later(c.holdSecs + c.fadeSecs, () => { if (this.live && !this.sc) g.inDialog = false; });
    if (room) {
      this.later(c.holdSecs + c.byeAt, () => { if (g.cars.includes(car)) g.say(this.anchor(car), c.byeLine, 1.8); });
      this.later(c.holdSecs + c.thanksAt, () => { if (this.live && !g.saying(p)) g.say(p, c.thanks, 1.6); });
      this.leave(car, c.holdSecs + c.goAt);
    } else this.later(c.holdSecs + c.thanksAt, () => { if (this.live && !g.saying(p)) g.say(p, c.thanks, 1.6); });
  }

  // ---------------------------------------------------------------------------------------------

  update(dt) {
    const g = this.g;
    if (!this.live) { this.reset('gone'); return; }
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      q.fn();
    }
    this.tickAway();
    const sc = this.sc;
    if (!sc) return;
    sc.t += dt;
    if (!g.cars.includes(sc.car)) { this.reset('gone'); return; }
    this.anchor(sc.car);
    if (sc.phase === 'wait') this.coming(dt);
    else if (sc.phase === 'door') this.door();
    else if (sc.phase === 'board') this.boarding();
    else if (sc.phase === 'ride') this.ride();
  }

  // Free roam ends (a mission, the other level) or a debug warp: Stig off the bus at once, on his feet
  // beside it (unless something else has placed him already), the picture back, every guagua gone.
  reset(kind) {
    const g = this.g, sc = this.sc, p = g.player;
    const fading = this.queue.length > 0 || sc?.phase === 'fade';
    if (!sc && !this.away.length && !this.queue.length) return;
    this.queue.length = 0;
    if (fading) hud.fade(false);
    if (sc) {
      if (p.car === sc.car) g.unseat(p);
      else if (p.state === 'seated' && !p.seatId && !p.car) { p.state = 'normal'; p.teleport(p.x, p.z, p.yaw); }
      if (p.root.parent !== scene) { scene.add(p.root); p.root.scale.setScalar(1); }
      // The cut and the hold are ours to end only while no mission has taken over.
      if (sc.phase !== 'door' && sc.phase !== 'ride' && g.missions.state === 'idle') {
        g.cam.release();
        g.cam.snapNext = true;
        g.inDialog = false;
      }
      this.last = { kind, t: g.time, stop: sc.stop.key, phase: sc.phase };
      if (g.cars.includes(sc.car)) g.removeCar(sc.car);
      this.sc = null;
    } else if (fading && g.missions.state === 'idle') g.inDialog = false;
    for (const a of this.away) if (g.cars.includes(a.car)) g.removeCar(a.car);
    this.away.length = 0;
  }

  // ---------------------------------------------------------------------------------------------
  // HUD and camera (main.js)

  objective() {
    const sc = this.sc, c = this.cfg;
    if (!sc || !this.live) return null;
    if (sc.phase === 'wait') return { title: c.title, text: c.waitText };
    if (sc.phase === 'ride') return { title: c.title, text: fmt(c.rideText, { name: sc.dest.name }) };
    return null;
  }
  hint() {
    const ph = this.sc?.phase;
    return ph === 'wait' ? this.cfg.waitKeys : ph === 'ride' ? this.cfg.rideKeys : null;
  }
  // The chase camera rides behind the bus while he sits in it.
  camFocus(f) {
    if (!this.riding) return f;
    const c = this.sc.car;
    return { ...f, x: c.x, y: c.y, z: c.z, yaw: c.yaw, car: c, speed: c.speed };
  }
}
