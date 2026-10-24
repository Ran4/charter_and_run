// Vi liftar – tummen upp på vischan (free roam, DESIGN §10.47). At a hitch-hiking spot on a country
// road (LIFTA.spots), Stig on foot gets "E Lifta": he stands at the kerb with his thumb out, a grisbil
// comes down the road (the farmer at the wheel, three pigs in the bed) and stops just past him; he
// asks, the farmer answers, he hops up into the bed and the truck drives itself into town, to the back
// of Hotel Flamenco. Stig does not steer: A/D lean him against the truck's turns and its weave, and
// ÅKSJUKA rises the more he is off balance. Full, he tumbles off and the truck drives on ("¡Adiós,
// señor!"); all the way, he thanks the farmer and steps down. E hops off on the way. Only on the island
// with no mission running; a mission start or a debug warp takes him off at once and the truck away.
//
// While he rides, the player is 'seated' (no physics, no interactables) with his root on the truck's
// tilt group at the bed's middle, standing (the `ride` pose, `rideLean` its tip); main.js points the
// chase camera at the truck (`camFocus`), shows the card (`objective`) and the keys (`hint`), plays
// the truck's engine, blocks R and passes the truck's knocks and landings (`onImpact`).

import { LIFTA } from '../content/index.js';
import { AIDriver, LanePath, startNodes } from '../actors/drivers.js';
import { Car, CAR_TYPES } from '../actors/car.js';
import { lm, laneSpot, nodeRef, findPath } from '../world/layout.js';
import { THREE, scene, camera } from '../gfx.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { clamp, damp, dist, yawTo, lerp, angleDiff } from '../util.js';

const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere(), _w = { x: 0, y: 0, z: 0 };

export class Hitch {
  constructor(game, cfg = LIFTA) {
    this.g = game;
    this.cfg = cfg;
    this.sc = null;       // the hitch under way: { phase: 'wait' | 'stop' | 'climb' | 'ride' | 'off', spot, car, t, stop, meter, lean, push, e, peak, said, hop }
    this.away = [];       // trucks done with him: { car, t, byeAt, goAt } (g.time)
    this.queue = [];      // [{ at, fn }] (g.time)
    this.rides = 0;       // tests: rides all the way this session
    this.falls = 0;       // tests: falls off this session
    this.last = null;     // tests: { kind: 'wait' | 'stop' | 'ride' | 'fall' | 'jump' | 'off' | 'cancel' | 'gone' | 'warp', t, spot, … }
    for (const spot of cfg.spots) {
      game.addInteractable({ id: `lifta-${spot.id}`, r: cfg.r, prompt: cfg.prompt, pos: () => lm(spot.lm), enabled: () => this.canUse(), use: () => this.start(spot) });
    }
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get busy() { return !!this.sc; }
  get riding() { return this.sc?.phase === 'ride'; }
  // On the truck, or stopped beside it, getting on or off: R is not his (main.js).
  get onTruck() { return !!this.sc && this.sc.phase !== 'wait'; }
  get car() { return this.sc?.car || null; }

  canUse() {
    const g = this.g, p = g.player;
    return this.live && !this.sc && !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying
      && p.state === 'normal' && p.onGround && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active
      && !g.skis.on && !g.gatlopp.mode;
  }

  // ---------------------------------------------------------------------------------------------
  // The truck

  // Where the truck's middle stops on the lane of `edge` ([[i, j], [i, j]], the way it drives):
  // `at` (a kerb spot) projected onto that lane, `ahead` m on. { x, z, yaw }.
  lanePoint(edge, at, ahead) {
    const s = laneSpot(edge[0], edge[1], 0), fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
    const t = (at.x - s.x) * fx + (at.z - s.z) * fz + ahead;
    return { x: s.x + fx * t, z: s.z + fz * t, yaw: s.yaw };
  }
  // A lane path from where the car is, through `via` (nodes, the shortest way between them).
  path(car, via, wander = false) {
    const nodes = startNodes(car);
    for (const v of via) nodes.push(...findPath(nodes[nodes.length - 1], nodeRef(v)).slice(1));
    return new LanePath(nodes, { wander });
  }
  drive(car, path) {
    const c = this.cfg;
    car.ai = new AIDriver(car, { mode: 'route', path, cruise: c.cruise, wobble: c.wobble });
  }

  spawn(spot) {
    const g = this.g, c = this.cfg, [a, b] = spot.spawn.lane;
    // Its lane spot, or a little further up or down the road if a car stands there.
    let s = null;
    for (const dt of [0, 12, -8, 24]) {
      s = laneSpot(a, b, spot.spawn.t + dt);
      if (!g.cars.some((o) => dist(o.x, o.z, s.x, s.z) < 9)) break;
    }
    const car = new Car('grisbil');
    car.place(s.x, s.z, s.yaw);
    car.locked = true;        // not his to take, and no carjack
    car.noEnter = true;
    car.invulnerable = true;  // never wrecked under him (a knock is his ÅKSJUKA's)
    car.hitch = true;
    g.addCar(car);
    g.addBust(g.charDef(c.driver), car);
    this.drive(car, this.path(car, spot.via));
    return car;
  }

  // Brings the truck to a stop with its middle on `s` ({ x, z, yaw }): on its lane, heading its way,
  // from `approach` m before it the cruise eases off to `creep` m/s, and 0.5 m before it (or past it)
  // the farmer stops. True once it stands.
  creep(car, s) {
    const c = this.cfg;
    if (!car.ai) return car.speed < 0.2;
    const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), dx = s.x - car.x, dz = s.z - car.z;
    const along = dx * fx + dz * fz, lat = dx * fz - dz * fx;
    if (Math.cos(car.yaw - s.yaw) < 0.94 || Math.abs(lat) > 2.5 || along > c.approach) return false;
    car.ai.cruise = clamp(along * 0.55, c.creep, c.cruise);
    if (along < 0.5) { car.ai = null; car.ctrl.park = true; car.ctrl.throttle = 0; }
    return false;
  }

  // The farmer's bubble anchor: over his head at the wheel.
  anchor(car) {
    const a = (car.hitchAnchor ||= { x: 0, y: 0, z: 0, height: 1.25, who: this.cfg.driver });   // (his voice, voice.js)
    car.seatWorld(1, a);
    return a;
  }
  pigAnchor(car) {
    const a = (car.pigAnchor ||= { x: 0, y: 0, z: 0, height: 0.9 });
    car.pigWorld(1, a);
    return a;
  }
  // Where he stands in the bed: its middle, `bed` × the length behind the truck's middle.
  bedWorld(car, out = _w) {
    const s = car.spec, z = -this.cfg.bed * s.len;
    out.x = car.x + Math.sin(car.yaw) * z;
    out.y = car.y + s.wheelR * 0.95 + s.bodyH;
    out.z = car.z + Math.cos(car.yaw) * z;
    return out;
  }

  // The truck is done with him: it waits (stopped) until `go` s, the farmer's `bye` s from now, then
  // drives on (its path wanders on from where it ends) and is taken away out of sight.
  leave(car, { bye = null, go = 0 } = {}) {
    const g = this.g;
    this.away.push({ car, t: 0, byeAt: bye == null ? null : g.time + bye, goAt: g.time + go });
  }
  tickAway(dt) {
    const g = this.g, c = this.cfg;
    for (const a of this.away.slice()) {
      const car = a.car;
      a.t += dt;
      if (!g.cars.includes(car)) { this.away.splice(this.away.indexOf(a), 1); continue; }
      this.anchor(car);
      if (a.byeAt != null && g.time >= a.byeAt) { a.byeAt = null; g.say(car.hitchAnchor, c.adios, 1.8); }
      if (a.goAt != null && g.time >= a.goAt) {
        a.goAt = null;
        if (car.ai?.path) { car.ai.path.wander = true; car.ai.cruise = c.cruise; }
        else this.drive(car, this.path(car, [], true));
      }
      const d = dist(car.x, car.z, camera.position.x, camera.position.z);
      if (a.goAt == null && a.byeAt == null && ((d > c.awayR && !this.inView(car)) || d > c.awayFar)) {
        g.unsay(car.hitchAnchor);
        g.removeCar(car);
        this.away.splice(this.away.indexOf(a), 1);
      }
    }
  }
  inView(car) {
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    return _frustum.intersectsSphere(_sphere.set(_sphere.center.set(car.x, car.y + 1, car.z), car.radius + 0.5));
  }

  // ---------------------------------------------------------------------------------------------
  // The hitch

  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }
  // A line of Stig's (`force`: over one of his own still up).
  stigSay(text, secs, force = false) {
    const g = this.g;
    if (!force && g.saying(g.player)) return false;
    g.say(g.player, text, secs);
    return true;
  }

  start(spot) {
    if (!this.canUse()) return;
    const g = this.g, p = g.player, l = lm(spot.lm);
    p.teleport(l.x, l.z, l.yaw);
    p.wishX = p.wishZ = 0;
    p.anim.sprint = false;
    p.anim.thumb = true;
    g.cam.yaw = l.yaw + this.cfg.lookUp;
    g.cam.snapNext = true;
    const car = this.spawn(spot);
    const stop = this.lanePoint(spot.stop, l, this.cfg.tailPast + car.spec.len / 2);
    this.sc = { phase: 'wait', spot, car, t: 0, stop, meter: 0, lean: 0, push: 0, e: 0, peak: 0, said: {}, hop: null, fwd: 0 };
    this.last = { kind: 'wait', t: g.time, spot: spot.id };
  }

  waiting() {
    const g = this.g, c = this.cfg, sc = this.sc, p = g.player, l = lm(sc.spot.lm), car = sc.car;
    if (dist(p.x, p.z, l.x, l.z) > c.leaveR || p.state !== 'normal' || g.playerCar || g.inDialog || g.carrying) { this.cancel('walk'); return; }
    if (sc.t > c.waitMax || !g.cars.includes(car)) { this.cancel('nobody'); return; }
    p.anim.thumb = p.speed < 0.3;
    if (this.creep(car, sc.stop)) this.stopped();
  }

  cancel(why) {
    const g = this.g, sc = this.sc;
    g.player.anim.thumb = false;
    if (why === 'nobody') hud.toast(this.cfg.nobody);
    if (g.cars.includes(sc.car)) this.leave(sc.car);
    this.last = { kind: 'cancel', t: g.time, spot: sc.spot.id, why };
    this.sc = null;
  }

  // The truck stands beside him: the camera across the road, his question and the farmer's answer,
  // then the hop up.
  stopped() {
    const g = this.g, c = this.cfg, sc = this.sc, p = g.player, car = sc.car;
    sc.phase = 'stop';
    sc.t = 0;
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    p.anim.thumb = false;
    p.anim.sprint = false;
    const b = this.bedWorld(car);
    p.yaw = yawTo(b.x - p.x, b.z - p.z);
    this.shoot(sc.spot);
    this.anchor(car);
    this.later(c.askAt, () => { if (this.sc === sc) this.stigSay(c.please, 2.6, true); });
    this.later(c.answerAt, () => { if (this.sc === sc) g.say(car.hitchAnchor, c.hopIn, 2.2); });
    this.later(c.climbAt, () => { if (this.sc === sc) this.climb(); });
    this.last = { kind: 'stop', t: g.time, spot: sc.spot.id, x: +car.x.toFixed(2), z: +car.z.toFixed(2), yaw: +car.yaw.toFixed(3) };
  }
  shoot(spot) {
    const g = this.g, s = this.cfg.shot, l = lm(spot.lm), gy = g.groundAt(l.x, l.z);
    const at = ([dx, dz, y]) => { const q = g.lmOffset(spot.lm, dx, dz); return { x: q.x, y: gy + y, z: q.z }; };
    g.cam.cutTo(at(s.eye), at(s.look));
    g.cam.snapNext = true;
  }

  // A hop in an arc (no physics: 'seated', the ride pose), onto the bed's middle (`on`) or down to
  // `to` ({ x, y, z, yaw }).
  hop(on, secs, to = null) {
    const sc = this.sc, p = this.g.player;
    if (p.root.parent !== scene) scene.add(p.root);
    p.root.scale.setScalar(1);
    p.state = 'seated';
    p.vx = p.vz = p.vy = 0;
    p.anim.ride = true;
    p.anim.rideLean = 0;
    sc.hop = { on, secs, to, x0: p.x, y0: p.y, z0: p.z, yaw0: p.yaw };
    sc.t = 0;
  }
  climb() {
    this.sc.phase = 'climb';
    this.hop(true, this.cfg.climbSecs);
  }
  hopping() {
    const sc = this.sc, h = sc.hop, p = this.g.player, car = sc.car;
    const k = Math.min(1, sc.t / h.secs), to = h.on ? this.bedWorld(car) : h.to;
    const top = Math.max(h.y0, to.y) + 0.4;
    p.x = lerp(h.x0, to.x, k);
    p.z = lerp(h.z0, to.z, k);
    p.y = lerp(h.y0, to.y, k) + 4 * (top - (h.y0 + to.y) / 2) * k * (1 - k);
    p.yaw = h.yaw0 + angleDiff(h.yaw0, h.on ? car.yaw : to.yaw) * k;
    p.root.position.set(p.x, p.y, p.z);
    p.root.rotation.set(0, p.yaw, 0);
    if (k < 1) return;
    if (h.on) this.ride();
    else this.down();
  }

  // In the bed: the root on the truck's tilt, the camera behind the truck, on to town.
  ride() {
    const g = this.g, c = this.cfg, sc = this.sc, p = g.player, car = sc.car, s = car.spec;
    sc.phase = 'ride';
    sc.t = 0;
    sc.t0 = g.time;
    car.tilt.add(p.root);
    p.root.position.set(0, s.wheelR * 0.95 + s.bodyH, -c.bed * s.len);
    p.root.rotation.set(0, 0, 0);
    this.place();
    g.inDialog = false;
    g.cam.release();
    g.cam.yaw = car.yaw;
    g.cam.snapNext = true;
    this.drive(car, this.path(car, sc.spot.route));
    sc.stop = this.lanePoint(c.drop.lane, lm(c.drop.lm), c.bed * s.len);
    sc.fwd = car.forwardSpeed;
    g.say(this.pigAnchor(car), c.oink, 1.2);
    audio.oink();
    this.later(c.stinkAt, () => { if (this.sc === sc && sc.phase === 'ride') this.stigSay(c.stink, 2.4); });
    this.last = { kind: 'ride', t: g.time, spot: sc.spot.id };
  }
  place() {
    const p = this.g.player, car = this.sc.car, w = this.bedWorld(car);
    p.x = w.x; p.y = w.y; p.z = w.z; p.yaw = car.yaw;
  }

  // The balance: the truck's sideways pull on him (its speed × its turn rate: + to his right, a left
  // turn), against his lean (A/D, + to his right); ÅKSJUKA from what is left over, the braking and
  // the knocks.
  balance(dt) {
    const g = this.g, c = this.cfg, L = c.lean, sc = this.sc, car = sc.car, p = g.player;
    const fwd = car.forwardSpeed, push = fwd * car.w;
    const acc = dt > 0 ? (fwd - sc.fwd) / dt : 0;
    sc.fwd = fwd;
    sc.push = push;
    sc.lean = damp(sc.lean, clamp(input.steer(), -1, 1), L.k, dt);
    // Leaning further than the pull (or on a straight) is his own doing and costs `over` × as much
    // as being thrown by it: a lean held on after a turn is cheap, one held all the way is not.
    const e = (sc.e = clamp(push / L.aRef + sc.lean, -2, 2)), ae = Math.abs(e);
    const own = e * push <= 0 || Math.abs(push) < L.dead * L.aRef;
    let rate = ae > L.dead ? L.rise * (ae - L.dead) * (own ? L.over : 1) : -L.decay;
    if (-acc > L.brake) rate += (-acc - L.brake) * L.brakeK;
    sc.meter = clamp(sc.meter + rate * dt + (sc.jolt || 0), 0, 100);
    sc.jolt = 0;
    sc.peak = Math.max(sc.peak, sc.meter);
    p.anim.rideLean = clamp(e, -1.6, 1.6) * L.tip + Math.sin(g.time * 13) * 0.012;
    this.place();
    if (!sc.said.sick && sc.meter >= c.sickAt) sc.said.sick = this.stigSay(c.sick, 2.4);
    if (sc.meter >= 100) { this.fall(Math.sign(e) || Math.sign(push) || 1, 'fall'); return; }
    if (input.pressed('interact')) { this.hopOff(); return; }
    if (this.creep(car, sc.stop)) this.alight(null);
    else if (sc.t > c.rideMax) this.alight(this.g.exitSpot(car, -1));
  }
  onImpact(a, b, impact) {
    const sc = this.sc;
    if (sc?.phase === 'ride' && (a === sc.car || b === sc.car)) sc.jolt = (sc.jolt || 0) + impact * this.cfg.lean.jolt;
  }

  // Off the truck at the bed's middle: the root back in the scene, standing, full size.
  offTruck() {
    const p = this.g.player, car = this.sc.car, w = this.bedWorld(car);
    if (p.root.parent !== scene) scene.add(p.root);
    p.root.scale.setScalar(1);
    p.anim.ride = false;
    p.anim.rideLean = 0;
    p.anim.thumb = false;
    p.state = 'normal';
    p.x = w.x; p.y = w.y; p.z = w.z; p.yaw = car.yaw;
    p.vx = p.vz = p.vy = 0;
  }
  // Over the side he tips (+1: his right), tumbling; the truck drives on.
  fall(side, kind) {
    const g = this.g, c = this.cfg, f = c.fling, sc = this.sc, car = sc.car, p = g.player;
    this.offTruck();
    const rx = -Math.cos(car.yaw), rz = Math.sin(car.yaw);
    p.fling(car.vx * f.keep + rx * side * f.out, f.up, car.vz * f.keep + rz * side * f.out);
    audio.ouch();
    if (kind === 'fall') this.falls++;
    this.last = { kind, t: g.time, spot: sc.spot.id, meter: Math.round(sc.meter), peak: Math.round(sc.peak), side, speed: +car.speed.toFixed(2), ride: +(g.time - sc.t0).toFixed(2) };
    this.leave(car, { bye: c.adiosAt, go: 0 });
    this.sc = null;
  }
  // E on the way: a step down to the kerb side when the truck is all but stopped, else a jump.
  hopOff() {
    const car = this.sc.car;
    if (car.speed < this.cfg.hopSpeed) this.alight(this.g.exitSpot(car, -1));
    else this.fall(1, 'jump');
  }
  // A step down: at the drop (to = null: the drop's kerb spot, facing the truck) or anywhere (to).
  alight(to) {
    const g = this.g, c = this.cfg, sc = this.sc, car = sc.car;
    const l = to || lm(c.drop.lm), w = this.bedWorld(car);
    const target = { x: l.x, y: g.groundAt(l.x, l.z), z: l.z };
    target.yaw = yawTo(car.x - target.x, car.z - target.z);
    sc.phase = 'off';
    sc.arrived = !to;
    g.inDialog = true;
    const p = g.player;
    p.x = w.x; p.y = w.y; p.z = w.z; p.yaw = car.yaw;
    this.hop(false, c.hopSecs, target);
  }
  down() {
    const g = this.g, c = this.cfg, sc = this.sc, car = sc.car, p = g.player, h = sc.hop;
    p.anim.ride = false;
    p.anim.rideLean = 0;
    p.state = 'normal';
    p.teleport(h.to.x, h.to.z, h.to.yaw);
    g.inDialog = false;
    g.cam.yaw = car.yaw;
    this.stigSay(c.thanks, 2.2, true);
    if (sc.arrived) this.rides++;
    this.last = { kind: sc.arrived ? 'off' : 'step', t: g.time, spot: sc.spot.id, meter: Math.round(sc.meter), peak: Math.round(sc.peak), ride: +(g.time - sc.t0).toFixed(2) };
    this.leave(car, { bye: c.byeAt, go: c.departAt });
    if (!sc.arrived && car.ai) { car.ai.path.wander = true; car.ai.cruise = c.cruise; }
    this.sc = null;
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
    this.tickAway(dt);
    const sc = this.sc;
    if (!sc) return;
    sc.t += dt;
    if (!g.cars.includes(sc.car)) { this.reset('gone'); return; }
    this.anchor(sc.car);
    if (sc.car.pigAnchor) this.pigAnchor(sc.car);
    if (sc.phase === 'wait') this.waiting();
    else if (sc.phase === 'climb' || sc.phase === 'off') this.hopping();
    else if (sc.phase === 'ride') this.balance(dt);
  }

  // Free roam ends (a mission, the other level) or a debug warp: Stig off the truck at once, on his
  // feet beside it (unless something else has placed him already), and every hitch truck gone.
  reset(kind) {
    const g = this.g, sc = this.sc, p = g.player;
    if (!sc && !this.away.length && !this.queue.length) return;
    this.queue.length = 0;
    if (sc) {
      p.anim.thumb = false;
      p.anim.ride = false;
      p.anim.rideLean = 0;
      if (p.root.parent !== scene) { scene.add(p.root); p.root.scale.setScalar(1); }
      if (p.state === 'seated' && !p.seatId && !p.car) {
        const e = g.exitSpot(sc.car, -1);
        p.state = 'normal';
        p.teleport(e.x, e.z, sc.car.yaw);
      }
      // A cut or the hops' hold is ours to end only while no mission has taken over.
      if ((sc.phase === 'stop' || sc.phase === 'climb' || sc.phase === 'off') && g.missions.state === 'idle') {
        g.cam.release();
        g.cam.snapNext = true;
        g.inDialog = false;
      }
      this.last = { kind, t: g.time, spot: sc.spot.id, phase: sc.phase };
      if (g.cars.includes(sc.car)) g.removeCar(sc.car);
      this.sc = null;
    }
    for (const a of this.away) if (g.cars.includes(a.car)) g.removeCar(a.car);
    this.away.length = 0;
  }

  // ---------------------------------------------------------------------------------------------
  // HUD and camera (main.js)

  objective() {
    const sc = this.sc, c = this.cfg;
    if (!sc || !this.live) return null;
    if (sc.phase === 'wait') return { title: c.title, text: c.waitText };
    if (sc.phase !== 'ride') return null;
    const v = sc.meter / 100;
    return { title: c.rideTitle, text: c.rideText, bar: v, barLabel: c.barLabel, barColor: v > 0.7 ? '#ff4a3a' : '#8fd35f' };
  }
  hint() { return this.riding && !this.g.inDialog ? this.cfg.keys : null; }
  // The chase camera rides behind the truck while he stands in its bed.
  camFocus(f) {
    if (!this.riding) return f;
    const c = this.sc.car;
    return { ...f, x: c.x, y: c.y, z: c.z, yaw: c.yaw, car: c, speed: c.speed };
  }
}
