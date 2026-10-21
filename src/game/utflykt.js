// Utflykt med Lasse – åk med SunTrip-bussen till Fataga (free roam, DESIGN §10.58). After fataga
// (`missions.index` ≥ UTFLYKT.fromIndex, idle) the excursion the SunTrip office's window promises
// (UTFLYKT FATAGA) runs between missions. On the sidewalk in front of the office Stig gets "E Åk på
// utflykt till Fataga – 50 pta": Lasse greets him, he pays and, behind a fade, sits in the front row
// beside Affe in SunTrip's bus at the kerb, tourists at the windows. The bus drives its loop by
// itself, left turns only (AI buses cannot turn right, §6.6): east past Flamenco's back, up the town's
// east edge, west along the inland road past Gando, the grisfest's gate and Fataga, down the west
// edge and back east to the office. Lasse guides on the radio, Affe and a tourist speak in bubbles,
// Stig gets car-sick on the way inland. At each stop (Gando, Grisfesten, Fataga) E steps off; at
// Fataga the bus waits two minutes for him (E at its door gets him back on) and goes without him when
// they are up: "Bussen har redan gått!". Back at the office he steps off by himself.
//
// While he rides, the player is 'seated' (game.seat, the passenger's side: the bus is never
// `playerCar`); main.js points the chase camera at the bus (`camFocus`), shows the card
// (`objective`) and the keys (`hint`), plays the bus's engine, blocks R and the coins (`onBus`), and
// takes him off at a debug warp (`reset('warp')`). A mission start (or the other level) ends it at
// once (`reset('gone')`): the buses are the module's own and exist only in free roam, so no stage,
// route, timer or calibration pool meets them.

import { UTFLYKT } from '../content/index.js';
import { AIDriver, LanePath } from '../actors/drivers.js';
import { Car } from '../actors/car.js';
import { randomPed } from '../actors/models.js';
import { N, nodeI, nodeJ, nodeId, nodeX, nodeZ } from '../world/layout.js';
import { obbVsObb } from '../world/collision.js';
import { THREE, scene, camera } from '../gfx.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt } from '../strings.js';
import { clamp, dist, lerp, angleDiff, mulberry32 } from '../util.js';

const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere(), _h = {};

export class Utflykt {
  constructor(game, cfg = UTFLYKT) {
    this.g = game;
    this.cfg = cfg;
    // The trip under way: { phase: 'call' | 'fade' | 'ride' | 'stop' | 'board' | 'home', car, t, at (the
    // stop it stands at), next (the stop it drives to), leg, aboard, ai (parked), goAt, arrT, offT, … }
    this.sc = null;
    this.away = [];       // buses done with him: { car, goAt, ai } (parked until goAt, then driving on)
    this.queue = [];      // [{ at, fn }] (g.time)
    this.trips = 0;       // tests: whole loops ridden this session
    this.said = [];       // tests: [who, text, g.time] of every line this session
    this.last = null;     // tests: { kind: 'call' | 'blocked' | 'ride' | 'stop' | 'off' | 'board' | 'depart' | 'left' | 'missed' | 'home' | 'gone' | 'warp', t, … }
    const [kx, kz, kyaw] = cfg.at;
    this.spot = { x: kx, z: kz, yaw: kyaw };   // the booking's spot on the office's sidewalk
    this.stops = cfg.stops.map(({ key, name, at: [x, z, yaw], secs = 0, wait = 0 }) => {
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      return { key, name, x, z, yaw, fx, fz, rx: -fz, rz: fx, secs, wait };
    });
    game.addInteractable({ id: 'utflykt', r: cfg.r, prompt: fmt(cfg.prompt, { n: cfg.fare }), pos: () => this.spot, enabled: () => this.canUse(), use: () => this.call() });
    game.addInteractable({ id: 'utflykt-door', r: cfg.boardR, prompt: cfg.boardPrompt, priority: 5, pos: () => this.doorSpot(), enabled: () => this.canBoard(), use: () => this.board() });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle' && g.missions.index >= this.cfg.fromIndex; }
  get busy() { return !!this.sc; }
  get car() { return this.sc?.car || null; }
  // In the bus or getting in: from the fade to his step off (R and the coins are not his).
  get onBus() {
    const sc = this.sc;
    return !!sc && (sc.phase === 'fade' || sc.phase === 'board' || (!!sc.car && this.g.player.car === sc.car));
  }
  get riding() { return this.onBus && !!this.sc.car && this.g.player.car === this.sc.car; }

  free() {
    const g = this.g, p = g.player;
    return this.live && !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying
      && p.state === 'normal' && p.onGround && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active
      && !g.skis.on && !g.gatlopp.mode && !g.hitch.busy && !g.guagua.busy;
  }
  canUse() { return !this.sc && this.free(); }
  canBoard() { const sc = this.sc; return sc?.phase === 'stop' && !sc.aboard && this.free(); }

  // A spot beside the bus: `along` m ahead of its middle, `out` m to its right (the door's side).
  side(car, along, out) {
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    return { x: car.x + fx * along - fz * out, z: car.z + fz * along + fx * out };
  }
  doorSpot() {
    const sc = this.sc;
    if (sc?.phase !== 'stop' || sc.aboard) return null;
    return this.side(sc.car, this.cfg.door, sc.car.spec.wid / 2 + 0.8);
  }

  // No car standing on the bus's spot at a stop (its footprint, 0.4 m round; one driving through does
  // not count). `make`: the unnamed ones that came to a stop there since are taken away (in the dark).
  clear(s, make = false) {
    const g = this.g, pad = 0.4;
    const o = { x: s.x, z: s.z, fx: s.fx, fz: s.fz, hx: 2.5 / 2 + pad, hz: 10.5 / 2 + pad };
    for (const car of g.cars.slice()) {
      if (car.dead || car.speed > 1.5 || !obbVsObb(o, car.obb, _h)) continue;
      if (make && car !== g.playerCar && !car.name && !car.locked) g.removeCar(car);
      else return false;
    }
    return true;
  }

  inView(car) {
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    return _frustum.intersectsSphere(_sphere.set(_sphere.center.set(car.x, car.y + 1.5, car.z), car.radius + 0.5));
  }

  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }

  // ---------------------------------------------------------------------------------------------
  // The bus

  // The loop's nodes and a few more past the office, straight on or left at the town's edge (guagua's
  // `extend`), so a bus done with him drives on out of sight instead of stopping at the path's end.
  loopPath() {
    const nodes = this.cfg.loop.map(([i, j]) => nodeId(i, j));
    for (let k = 0; k < 4; k++) {
      const b = nodes[nodes.length - 1], a = nodes[nodes.length - 2];
      const di = Math.sign(nodeI(b) - nodeI(a)), dj = Math.sign(nodeJ(b) - nodeJ(a));
      for (const [ei, ej] of [[di, dj], [dj, -di], [-dj, di]]) {
        const i = nodeI(b) + ei, j = nodeJ(b) + ej;
        if (i >= 0 && j >= 0 && i <= N && j <= N) { nodes.push(nodeId(i, j)); break; }
      }
    }
    return new LanePath(nodes);
  }

  spawn() {
    const g = this.g, c = this.cfg, s = this.stops[0];
    const car = new Car('bus');
    car.place(s.x, s.z, s.yaw);
    car.locked = true;        // not his to take, and no carjack
    car.noEnter = true;
    car.invulnerable = true;  // never wrecked with him in it
    car.utflykt = true;
    Object.assign(car.ctrl, { throttle: 0, brake: 1, steer: 0, handbrake: false, park: true });
    g.addCar(car);
    g.addBust(g.npc('affe')?.def || g.charDef('affe'), car);
    const r = mulberry32((g.frame * 7919 + 17) >>> 0);
    for (const slot of c.riders) g.addRider(randomPed(r), car, slot);
    const tourist = g.addRider(randomPed(r), car, c.tourist);
    return { car, tourist };
  }

  // Bubble anchors: Affe at the wheel, the tourist at the window.
  anchor(car) {
    const a = (car.utflyktAnchor ||= { x: 0, y: 0, z: 0, height: 1.25 });
    car.seatWorld(1, a);
    return a;
  }
  touristAnchor(car, bust) {
    const a = (car.touristAnchor ||= { x: 0, y: 0, z: 0, height: 1.25 }), p = bust.position;
    const co = Math.cos(car.yaw), sn = Math.sin(car.yaw);
    a.x = car.x + p.x * co + p.z * sn;
    a.y = car.y + p.y;
    a.z = car.z - p.x * sn + p.z * co;
    return a;
  }

  // A line: Lasse's on the radio, the others' bubbles.
  line(who, text, secs = 2.8) {
    const g = this.g, sc = this.sc, car = sc?.car;
    if (who === 'lasse') g.radio('lasse', text);
    else if (who === 'stig') g.say(g.player, text, secs);
    else if (who === 'affe' && car) g.say(this.anchor(car), text, secs);
    else if (who === 'turist' && car && sc.tourist) g.say(this.touristAnchor(car, sc.tourist), text, secs);
    else return;
    this.said.push([who, text, +g.time.toFixed(2)]);
  }
  // Lines [t, who, text] from now, while `still()` holds.
  lines(list, still) {
    for (const [at, who, text] of list || []) this.later(at, () => { if (still()) this.line(who, text); });
  }

  // Parked where it stands; its route driver kept for the way on.
  park(car) {
    const sc = this.sc;
    if (car.ai) sc.ai = car.ai;
    car.ai = null;
    Object.assign(car.ctrl, { throttle: 0, brake: 1, steer: 0, handbrake: false, park: true });
  }
  go(car, ai) {
    car.ai = ai || new AIDriver(car, { mode: 'route', path: this.loopPath(), cruise: this.cfg.cruise, wobble: 0 });
    car.ai.cruise = this.cfg.cruise;
    car.ctrl.park = false;
  }

  // Tests: the bus driving with him `back` m before stop i on its lane, on the loop from there.
  jump(i, back = 40) {
    const sc = this.sc;
    if (sc?.phase !== 'ride' || !sc.car?.ai) return false;
    const s = this.stops[i], car = sc.car, x = s.x - s.fx * back, z = s.z - s.fz * back;
    const loop = this.cfg.loop.map(([a, b]) => nodeId(a, b));
    let k = -1;
    for (let n = 0; n < loop.length - 1 && k < 0; n++) {
      const ax = nodeX(loop[n]), az = nodeZ(loop[n]), bx = nodeX(loop[n + 1]), bz = nodeZ(loop[n + 1]), l = Math.hypot(bx - ax, bz - az);
      const t = ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (l * l);
      if (t > 0 && t < 1 && ((bx - ax) * s.fx + (bz - az) * s.fz) / l > 0.9 && Math.abs((x - ax) * (bz - az) - (z - az) * (bx - ax)) / l < 4) k = n;
    }
    if (k < 0) return false;
    const path = this.loopPath();
    path.nodes.splice(0, k);
    car.place(x, z, s.yaw);
    car.ai = new AIDriver(car, { mode: 'route', path, cruise: this.cfg.cruise, wobble: 0 });
    sc.next = i;
    sc.leg = (i + this.stops.length - 1) % this.stops.length;
    this.g.cam.snapNext = true;
    return true;
  }

  // Traffic queued behind the parked bus waits there (never the AI's shove on after 3.5 s).
  patient(car) {
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    for (const o of this.g.cars) {
      if (o === car || !o.ai || o.isPursuer) continue;
      const dx = o.x - car.x, dz = o.z - car.z, along = dx * fx + dz * fz;
      if (along > -2 || along < -32 || Math.abs(dz * fx - dx * fz) > 2.6 || Math.cos(o.yaw - car.yaw) < 0.7) continue;
      o.ai.blockedT = Math.min(o.ai.blockedT, 3);
    }
  }

  // Done with him: it drives on (with `ai`, its parked route driver) `go` s from now.
  leave(car, go = 0, ai = null) {
    if (go > 0) this.away.push({ car, goAt: this.g.time + go, ai });
    else { this.go(car, ai); this.away.push({ car, goAt: null }); }
  }
  tickAway() {
    const g = this.g, c = this.cfg;
    for (const a of this.away.slice()) {
      const car = a.car;
      if (!g.cars.includes(car)) { this.away.splice(this.away.indexOf(a), 1); continue; }
      this.anchor(car);
      if (a.goAt != null) {
        if (g.time < a.goAt) continue;
        a.goAt = null;
        this.go(car, a.ai);
      }
      const d = dist(car.x, car.z, camera.position.x, camera.position.z);
      if ((d > c.awayR && !this.inView(car)) || d > c.awayFar) {
        g.unsay(car.utflyktAnchor);
        if (car.touristAnchor) g.unsay(car.touristAnchor);
        g.removeCar(car);
        this.away.splice(this.away.indexOf(a), 1);
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The trip

  // E on the office's sidewalk: Lasse's greeting and the fare, the cut; the fade after `callSecs`.
  call() {
    if (!this.canUse()) return;
    const g = this.g, c = this.cfg, p = g.player, s = this.stops[0];
    if (!this.clear(s)) { hud.toast(c.blocked); this.last = { kind: 'blocked', t: g.time }; return; }
    const at = this.spot;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    p.anim.sprint = false;
    p.yaw = at.yaw;
    p.root.rotation.y = p.yaw;
    g.inDialog = true;
    const [ex, ey, ez] = c.shot.eye, [lx, ly, lz] = c.shot.look;
    g.cam.cutTo({ x: ex, y: ey, z: ez }, { x: lx, y: ly, z: lz });
    g.cam.snapNext = true;
    const n = g.npc('lasse'), here = !!n && n.state !== 'hidden' && n.root.visible && dist(n.x, n.z, at.x, at.z) < c.lasseR;
    if (here) { g.say(n, c.call[1], 2.4); this.said.push(['lasse', c.call[1], +g.time.toFixed(2)]); }
    this.sc = { phase: 'call', car: null, t: 0, at: 0, next: 1, leg: -1, aboard: false, ai: null, tourist: null, goAt: 0 };
    if (!here) this.line('lasse', c.call[1]);
    g.pay(c.fare);
    this.last = { kind: 'call', t: g.time, lasse: here };
  }

  // The fade: in the dark the bus at the office's stop and Stig in it, the camera behind the bus.
  fade() {
    const g = this.g, c = this.cfg, sc = this.sc;
    sc.phase = 'fade';
    hud.fade(true);
    this.later(c.fadeSecs, () => {
      if (this.sc !== sc) return;
      this.clear(this.stops[0], true);
      const { car, tourist } = this.spawn();
      sc.car = car;
      sc.tourist = tourist;
      sc.aboard = true;
      g.seat(g.player, car, -1);
      g.cam.release();
      g.cam.yaw = car.yaw;
      g.cam.snapNext = true;
      this.later(c.holdSecs, () => { if (this.sc === sc) hud.fade(false); });
      this.later(c.holdSecs + c.fadeSecs, () => {
        if (this.sc !== sc) return;
        sc.phase = 'ride';
        g.inDialog = false;
        this.last = { kind: 'ride', t: g.time };
      });
      this.later(c.holdSecs + c.fadeSecs + c.departAt, () => { if (this.sc === sc) this.depart(); });
    });
  }

  // Off from the stop it stands at, with its leg's lines.
  depart() {
    const g = this.g, c = this.cfg, sc = this.sc, from = this.stops[sc.at];
    if (sc.phase === 'stop' && from.wait && sc.offT == null) this.line('lasse', c.stayLine);
    sc.phase = 'ride';
    sc.leg = sc.at;
    sc.next = (sc.at + 1) % this.stops.length;
    sc.depT = g.time;
    this.go(sc.car, sc.ai);
    sc.ai = null;
    const leg = sc.leg;
    this.lines(c.legs[from.key], () => this.sc === sc && sc.phase === 'ride' && sc.leg === leg);
    this.last = { kind: 'depart', t: g.time, from: from.key, aboard: sc.aboard };
  }

  // Driving: the brake for the next stop, parked 0.4 m before it. Held up short of it (a car standing in
  // its lane), it waits behind (never the AI's shove) and after `heldSecs` s stops where it is.
  ride(dt) {
    const g = this.g, c = this.cfg, sc = this.sc, car = sc.car;
    if (g.player.car !== car) { this.reset('gone'); return; }
    const ai = car.ai;
    if (!ai) return;
    const s = this.stops[sc.next], dx = s.x - car.x, dz = s.z - car.z;
    const along = dx * s.fx + dz * s.fz, lat = dx * s.fz - dz * s.fx;
    if (Math.cos(car.yaw - s.yaw) < 0.94 || Math.abs(lat) > 2.5 || along > c.approach) { ai.cruise = c.cruise; sc.held = 0; return; }
    ai.blockedT = Math.min(ai.blockedT, 3);
    ai.cruise = clamp(Math.sqrt(2 * c.brake * Math.max(0, along - 0.4)), c.creep, c.cruise);
    sc.held = car.speed < 0.3 ? (sc.held || 0) + dt : 0;
    if (along < 0.4 || sc.held > c.heldSecs) this.arrive();
  }

  arrive() {
    const g = this.g, c = this.cfg, sc = this.sc, car = sc.car, i = sc.next, s = this.stops[i];
    this.park(car);
    sc.phase = 'stop';
    sc.at = i;
    sc.arrT = g.time;
    sc.offT = null;
    sc.held = 0;
    sc.goAt = g.time + s.secs;
    audio.door();
    this.last = { kind: 'stop', t: g.time, stop: s.key, x: +car.x.toFixed(2), z: +car.z.toFixed(2), yaw: +car.yaw.toFixed(3), ride: +(g.time - sc.depT).toFixed(2) };
    this.lines(c.arrive[s.key], () => this.sc === sc && sc.at === i && (sc.phase === 'stop' || sc.phase === 'board' || sc.phase === 'home'));
    if (i === 0) this.home();
  }

  // At a stop: E off with him aboard; on when its time is up, without him if he is off.
  atStop() {
    const g = this.g, c = this.cfg, sc = this.sc, p = g.player;
    if (sc.aboard) {
      if (p.car !== sc.car) { this.reset('gone'); return; }
      if (input.pressed('interact') && !g.inDialog) { this.off(); return; }
    } else if (dist(p.x, p.z, sc.car.x, sc.car.z) > c.giveUpR) { this.without(true); return; }
    if (g.time < sc.goAt) return;
    if (sc.aboard) this.depart();
    else this.without(false);
  }

  // Stig off at the door, onto the sidewalk, facing the bus's way; the chase camera behind him turned
  // `offCam` off it, out over the sidewalk (straight behind him it stood in the bus).
  off() {
    const g = this.g, c = this.cfg, sc = this.sc, p = g.player, car = sc.car, s = this.stops[sc.at];
    const q = this.side(car, c.door, c.out), yaw = Math.atan2(Math.sin(car.yaw), Math.cos(car.yaw));
    g.unseat(p, q.x, q.z);
    p.teleport(q.x, q.z, yaw);
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    g.cam.yaw = yaw + c.offCam;
    g.cam.snapNext = true;
    audio.door();
    sc.aboard = false;
    sc.offT = g.time;
    sc.goAt = Math.max(sc.goAt, g.time + (s.wait || c.offGo));
    if (s.wait) {
      this.line('lasse', c.offLine);
      const off = sc.offT;
      this.later(s.wait - c.warnAt, () => { if (this.sc === sc && !sc.aboard && sc.offT === off && sc.phase === 'stop') this.line('lasse', c.warnLine); });
    }
    this.last = { kind: 'off', t: g.time, stop: s.key, x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
  }

  // E at the door: up the step into his seat.
  board() {
    if (!this.canBoard()) return;
    const g = this.g, sc = this.sc, p = g.player, car = sc.car, c = this.cfg;
    sc.phase = 'board';
    sc.t = 0;
    g.inDialog = true;
    p.state = 'seated';
    p.wishX = p.wishZ = p.vx = p.vz = p.vy = 0;
    p.anim.sprint = false;
    const d = this.side(car, c.door, car.spec.wid / 2 - 0.3);
    sc.hop = { x0: p.x, y0: p.y, z0: p.z, yaw0: p.yaw, x1: d.x, z1: d.z, y1: car.y + car.seatY() };
    this.last = { kind: 'board', t: g.time, stop: this.stops[sc.at].key };
  }
  boarding() {
    const g = this.g, c = this.cfg, sc = this.sc, h = sc.hop, p = g.player, car = sc.car, s = this.stops[sc.at];
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
    sc.phase = 'stop';
    sc.aboard = true;
    g.inDialog = false;
    g.cam.yaw = car.yaw;
    g.cam.snapNext = true;
    sc.goAt = Math.max(sc.arrT + s.secs, g.time + c.backGo);
    if (s.wait) this.line('lasse', c.backLine);
  }

  // On from a stop without him: done with him, it drives on out of sight.
  without(far) {
    const g = this.g, c = this.cfg, sc = this.sc, car = sc.car, s = this.stops[sc.at];
    this.leave(car, 0, sc.ai);
    this.sc = null;
    if (far) { this.last = { kind: 'gone', t: g.time, stop: s.key, why: 'far' }; return; }
    if (s.wait) {
      g.radio('lasse', c.missed);
      this.said.push(['lasse', c.missed, +g.time.toFixed(2)]);
      this.later(c.missedStigAt, () => {
        if (!this.live || this.sc || g.saying(g.player) || g.player.state !== 'normal') return;
        g.say(g.player, c.missedStig, 2.4);
        this.said.push(['stig', c.missedStig, +g.time.toFixed(2)]);
      });
      this.last = { kind: 'missed', t: g.time, stop: s.key };
    } else {
      g.say(this.anchor(car), c.byeLine, 1.8);
      this.said.push(['affe', c.byeLine, +g.time.toFixed(2)]);
      this.last = { kind: 'left', t: g.time, stop: s.key };
    }
  }

  // Back at the office: he steps off by himself, a whole loop ridden.
  home() {
    const g = this.g, c = this.cfg, sc = this.sc, car = sc.car;
    sc.phase = 'home';
    this.later(c.homeOff, () => {
      if (this.sc !== sc) return;
      const p = g.player;
      const q = this.side(car, c.door, c.out), yaw = Math.atan2(Math.sin(car.yaw), Math.cos(car.yaw));
      if (p.car === car) g.unseat(p, q.x, q.z);
      p.teleport(q.x, q.z, yaw);
      g.cam.yaw = yaw + c.offCam;
      g.cam.snapNext = true;
      audio.door();
      g.records.utflykt = (g.records.utflykt || 0) + 1;
      this.trips++;
      g.save();
      this.last = { kind: 'home', t: g.time, ride: +(g.time - sc.t0).toFixed(1), x: +q.x.toFixed(2), z: +q.z.toFixed(2) };
      this.leave(car, c.goAt, sc.ai);
      this.sc = null;
      this.later(c.thanksAt, () => { if (this.live && !this.sc && !g.saying(p) && p.state === 'normal') { g.say(p, c.thanks, 1.6); this.said.push(['stig', c.thanks, +g.time.toFixed(2)]); } });
    });
  }

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
    for (const a of this.away) if (!a.car.ai) this.patient(a.car);
    const sc = this.sc;
    if (!sc) return;
    sc.t += dt;
    if (sc.car && !g.cars.includes(sc.car)) { this.reset('gone'); return; }
    if (sc.car) {
      this.anchor(sc.car);
      if (!sc.car.ai) this.patient(sc.car);
    }
    if (sc.phase === 'call') { if (sc.t >= this.cfg.callSecs) { sc.t0 = g.time; this.fade(); } }
    else if (sc.phase === 'ride') this.ride(dt);
    else if (sc.phase === 'stop') this.atStop();
    else if (sc.phase === 'board') this.boarding();
  }

  reset(kind) {
    const g = this.g, sc = this.sc, p = g.player;
    if (!sc && !this.away.length && !this.queue.length) return;
    const fading = sc?.phase === 'fade';
    this.queue.length = 0;
    if (fading) hud.fade(false);
    if (sc) {
      const car = sc.car;
      if (car && p.car === car) g.unseat(p);
      else if (p.state === 'seated' && !p.seatId && !p.car) { p.state = 'normal'; p.teleport(p.x, p.z, p.yaw); }
      if (p.root.parent !== scene) { scene.add(p.root); p.root.scale.setScalar(1); }
      if ((sc.phase === 'call' || sc.phase === 'fade' || sc.phase === 'board') && g.missions.state === 'idle') {
        g.cam.release();
        g.cam.snapNext = true;
        g.inDialog = false;
      }
      this.last = { kind, t: g.time, phase: sc.phase };
      if (car && g.cars.includes(car)) g.removeCar(car);
      this.sc = null;
    }
    for (const a of this.away) if (g.cars.includes(a.car)) g.removeCar(a.car);
    this.away.length = 0;
  }

  objective() {
    const sc = this.sc, c = this.cfg;
    if (!sc || !this.live) return null;
    if (sc.phase === 'ride') return { title: c.title, text: fmt(c.nextText, { name: this.stops[sc.next].name }) };
    if (sc.phase === 'stop' || sc.phase === 'board' || sc.phase === 'home') {
      const s = this.stops[sc.at];
      if (!sc.aboard && sc.phase === 'stop' && s.wait) return { title: c.title, text: c.backText, timer: Math.max(0, sc.goAt - this.g.time) };
      if (sc.aboard || sc.phase === 'board') return { title: c.title, text: fmt(c.atText, { name: s.name }) };
    }
    return null;
  }
  hint() {
    const sc = this.sc;
    return sc?.phase === 'stop' && sc.aboard && sc.at !== 0 && !this.g.inDialog ? this.cfg.offKeys : null;
  }
  camFocus(f) {
    if (!this.riding) return f;
    const c = this.sc.car;
    return { ...f, x: c.x, y: c.y, z: c.z, yaw: c.yaw, car: c, speed: c.speed };
  }
}
