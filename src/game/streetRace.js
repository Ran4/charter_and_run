// Gatlopp mot pizza-racern – mamma åker med (free roam; feature 69, DESIGN §10.38). After Gamla kläder
// (ropavieja) José stands at Centro Nórdico with a "!" over him between missions, and E on him is his
// challenge to the first of three street races not yet won, from the SALIDA · START line across the
// z −40 road south of the centre: Ett varv runt centrum (round SunTrip and Centro Nórdico, back to the
// line), Till flygplatsen (the terminal's front on the z −200 road) and Till Eslöv-skylten (up to the
// north ring road, the real road past the farm and the fields, and down to the sign). Stig races in
// the hire car, José in his blue hatch with his mother beside him. The race itself is the mission
// stage kind `race` (kinds/core.js: the countdown, the checkpoints, the closed course, the rubber
// band), run here on a holder of our own (`m`), never through the runner: the missions' index, the
// save's mission number, the banner's "uppdrag i/n" and the mission reward are never touched. Each
// course hands José his own spec (its `oppSpec`), measured with calibrate's autopilot in the hire car
// so that a clean run wins by a few seconds and one crash loses (scenario `gatloppkal`). Won, the
// course pays its prize and the next is offered (`records.gatlopp.won`, saved); either way José
// drives back to the kerb in front of the centre and walks to his place with his mother. Before a
// race Stig can bet at the pool bar (the bodega after julafton): Berra takes his 100 pta on the
// Spaniard, Robban pays five times on Stig. All three won, the sisters at the pool give him a six.
// Only on the island with `missions.state === 'idle'`: a mission start or the other level ends a race
// at once and sends José and his mother home, so no mission, timer or calibration pool sees any of it.
// Config: GATLOPP (content/island.js). Owned by Game as `gatlopp`: main.js asks it for the objective
// card, the target, the markers and who is `posed`, and calls `update` once a frame.

import { GATLOPP } from '../content/index.js';
import { MISSIONS } from './missions/index.js';
import { race, at } from './missions/kinds/core.js';
import { AIDriver, LanePath, startNodes } from '../actors/drivers.js';
import { findPath, nodeRef, nodeX, RHW, CURB } from '../world/layout.js';
import { THREE, GeoBuilder, toonMesh, signMesh, scene, camera } from '../gfx.js';
import { Bang } from './markers.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt } from '../strings.js';
import { clamp, dist, yawTo } from '../util.js';
import { raceClock } from './eslov.js';

const _v = new THREE.Vector3();

// A banner across a road on two poles at the kerbs (the town's GOD JUL banners, town.js, at their
// height: 8.4 m clears the bus chase eye), the text both ways; with `strip` a chequered line on the
// asphalt under it. Local X runs across the road, the sign faces along it (+Z); y 0 is the asphalt.
function buildBanner(text, h, strip) {
  const grp = new THREE.Group(), span = RHW + 1.0, w = 2 * span - 1.2;
  const gb = new GeoBuilder();
  for (const s of [-1, 1]) {
    gb.cyl(0xf4f4f0, s * span, CURB + (h + 1.2) / 2, 0, 0.12, h + 1.2, 8);
    gb.ico(0xd8321e, s * span, CURB + h + 1.3, 0, 0.35, 1);
  }
  grp.add(toonMesh(gb.build(), { outline: 0.03, cast: false }));
  const sign = signMesh(text, w, 1.45, { bg: '#fff8e6', fg: '#1d1426', border: '#d8321e', scale: 0.6, borderW: 0.1, double: true });
  sign.position.set(0, CURB + h, 0);
  grp.add(sign);
  if (strip) {
    const sq = new GeoBuilder(), n = 22, a = (2 * RHW) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) sq.box((i + j) % 2 ? 0x1d1426 : 0xf4f4f0, -RHW + (i + 0.5) * a, 0.02, (j - 0.5) * a, a, 0.02, a);
    grp.add(toonMesh(sq.build(), { outline: 0, cast: false }));
  }
  grp.visible = false;
  scene.add(grp);
  return grp;
}

// The bookmakers' chalkboard (APUESTAS · VAD) on a little easel beside Berra and Robban.
function buildBoard(text) {
  const grp = new THREE.Group(), gb = new GeoBuilder();
  for (const s of [-1, 1]) gb.box(0x7a5230, s * 0.42, 0.62, -0.12, 0.06, 1.26, 0.06, 0, 0.18);
  gb.box(0x7a5230, 0, 0.55, -0.32, 0.05, 1.1, 0.05, 0, -0.32);
  gb.box(0x8a5a2a, 0, 1.02, 0, 1.0, 0.86, 0.05);
  grp.add(toonMesh(gb.build(), { outline: 0.02, cast: true }));
  const face = signMesh(text, 0.9, 0.76, { bg: '#23412f', fg: '#f4f1e6', border: null, scale: 0.8, font: '"Nunito", sans-serif' });
  face.position.set(0, 1.02, 0.03);
  grp.add(face);
  grp.visible = false;
  scene.add(grp);
  return grp;
}

export class StreetRace {
  constructor(game, cfg = GATLOPP) {
    this.g = game;
    this.cfg = cfg;
    this.from = MISSIONS.findIndex((m) => m.id === cfg.after) + 1;
    this.mode = null;      // null | 'offer' (his challenge, the fade) | 'race' | 'home' (José drives back) | 'walk'
    this.t = 0;            // seconds in the mode
    this.k = -1;           // the course under way (an index into cfg.races)
    this.m = null;         // the race kind's holder { def, cars, items, data } (never the runner's)
    this.st = null;        // the race stage while it runs
    this.car = null;       // José's car, from the grid until he is on foot again
    this.t0 = null;        // g.time at KÖR!
    this.faded = false;
    this.bet = null;       // { stake }: Stig's money on himself for the next race (this session)
    this.lines = [];       // [{ at, who, text }] bubbles still to say (g.time)
    this.walkers = null;   // { key: { x, z, yaw, done } } on foot back to José's place
    this.wreck = null;     // José's wrecked car, cleared away once Stig is well off
    this.bang = null;      // the "!" over José (made the first time it shows)
    this.banners = {};     // text -> banner group
    this.board = null;
    this.boardAt = null;
    this.result = null;    // the last race's: { k, result: 'win' | 'lose' | 'wreck', t (s from KÖR!), at, bet } (null while one runs)
    this.last = null;      // tests: { kind: 'offer' | 'start' | 'race' | 'bet' | 'back' | 'home' | 'sisters' | 'abort', … }
    const self = this;
    game.addInteractable({
      id: 'gatlopp', r: cfg.r,
      pos: () => { const n = self.jose; return n ? { x: n.x, z: n.z, y: n.y } : null; },
      enabled: () => self.canChallenge(),
      get prompt() { const k = self.next, R = cfg.races[k]; return R ? fmt(cfg.prompt, { i: k + 1, n: cfg.races.length, name: R.name }) : ''; },
      use: () => self.challenge(),
    });
    game.addInteractable({
      id: 'gatloppVad', r: cfg.bet.r,
      pos: () => self.boardSpot(),
      enabled: () => self.canBet(),
      prompt: cfg.bet.prompt,
      use: () => self.placeBet(),
    });
  }

  get jose() { return this.g.npcs[this.cfg.who]; }
  get won() { return this.g.records.gatlopp?.won ?? 0; }
  // The course José offers: the first not yet won (-1: all three are).
  get next() { return this.won < this.cfg.races.length ? this.won : -1; }
  get active() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle' && g.missions.index >= this.from; }
  get racing() { return this.mode === 'race'; }
  // main.npcPosed: José and his mother walking back to his place (no turn to Stig, no chatter).
  posed(key) { return !!this.walkers?.[key] && !this.walkers[key].done; }

  // A home as placeNpcs reads it (an unlock's override first): [landmark, dx, dz, yaw?] or null.
  homeOf(key) {
    const g = this.g, h = key in g.homeOverrides ? g.homeOverrides[key] : g.levelDef?.homes(g)?.[key];
    return Array.isArray(h) ? h : null;
  }
  homeSpot(key) {
    const h = this.homeOf(key);
    if (!h) return null;
    const q = this.g.lmOffset(h[0], h[1] ?? 0, h[2] ?? 0);
    return { x: q.x, z: q.z, yaw: h[3] ?? q.yaw, id: `${h[0]}:${h[1] ?? 0}:${h[2] ?? 0}` };
  }
  // Back at home at once (out of free roam): as placeNpcs puts them, free again.
  sendHome(key) {
    const g = this.g, n = g.npcs[key];
    if (!n) return;
    delete n.steer;
    if (n.car) g.unseat(n);
    const s = this.homeSpot(key);
    if (s && n.state !== 'hidden') {
      n.state = 'normal';
      n.root.visible = true;
      n.teleport(s.x, s.z, s.yaw);
      n.vx = n.vz = 0;
      n.homeX = s.x; n.homeZ = s.z;
      n.spot = s.id;
    } else n.spot = null;
    n.busy = false;
  }
  // Ours no longer: placeNpcs puts them home once Stig is away (his mother to Fataga).
  release(key) {
    const n = this.g.npcs[key];
    if (!n) return;
    delete n.steer;
    n.busy = false;
    n.spot = null;
  }

  // ---- the challenge ---------------------------------------------------------------------------
  // José waits at his place with a race left for Stig: the "!" and the friend dot.
  offered() {
    if (!this.active || this.mode || this.next < 0) return false;
    const n = this.jose, s = this.homeSpot(this.cfg.who);
    return !!n && !!s && n.state === 'normal' && n.root.visible && !n.car && !n.seatId && !n.steer && !n.busy
      && !this.g.npcPosed(this.cfg.who) && dist(n.x, n.z, s.x, s.z) < 2;
  }
  canChallenge() {
    const g = this.g, p = g.player;
    return this.offered() && !g.inDialog && !g.chat.busy && !g.playerCar && !g.carrying && !g.shame.pursuit && p.state === 'normal' && p.onGround
      && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !this.lines.length;
  }
  // E: his challenge and Stig's yes, Stig held through the fade, then the grid.
  challenge() {
    if (!this.canChallenge()) return;
    const g = this.g, c = this.cfg, n = this.jose, p = g.player, k = this.next;
    this.k = k;
    p.yaw = yawTo(n.x - p.x, n.z - p.z);
    n.yaw = yawTo(p.x - n.x, p.z - n.z);
    p.vx = p.vz = p.wishX = p.wishZ = 0;
    g.frozenT = c.offer.fadeAt + c.offer.fadeSecs + 0.3;
    this.say(c.who, c.races[k].offer, 0);
    this.say('stig', c.offer.yes, c.offer.yesAt);
    this.setMode('offer');
    this.last = { kind: 'offer', k, t: g.time };
  }
  tickOffer() {
    const g = this.g, c = this.cfg.offer;
    if (!this.faded && this.t >= c.fadeAt) { this.faded = true; hud.fade(true); }
    if (this.faded && this.t >= c.fadeAt + c.fadeSecs) {
      this.faded = false;
      g.frozenT = 0;
      const ok = this.place(this.k);
      hud.fade(false);
      if (!ok) { this.setMode(null); this.last = { kind: 'abort', k: this.k, t: g.time }; }
    }
  }

  // The grid (behind the black, or at once for tests): Stig at the wheel of the hire car, the race
  // kind's init puts both cars on their lanes, seats José and his mother, closes the course and
  // starts the countdown. False when he cannot race now (in a car, knocked down, no hire car).
  place(k) {
    const g = this.g, c = this.cfg, R = c.races[k], p = g.player;
    if (!R || !this.active || g.playerCar || p.state !== 'normal') return false;
    const car = g.ensureNamedCar(c.playerCar);
    if (!car) return false;
    for (const q of [car.driver, ...car.passengers]) if (q && q !== p) g.unseat(q);
    g.removeRiders(car);
    if (car.hp < car.spec.hp) car.repair();
    car.locked = false;
    car.ai = null;
    const s = at(R.start);
    car.place(s.x, s.z, s.yaw);
    g.enterCar(car);
    if (g.playerCar !== car) return false;
    this.k = k;
    this.m = { def: { id: 'gatlopp', title: fmt(c.title, { i: k + 1, n: c.races.length }) }, cars: [], items: [], data: {} };
    this.st = race({
      who: c.who, type: c.car.type, color: c.car.color, carName: c.car.name, oppPassenger: c.rider,
      cruise: R.cruise, oppSpec: R.spec, start: R.start, checkpoints: R.checkpoints, finish: R.finish, radio: R.radio, text: '',
    });
    this.st.init(g, this.m);
    this.car = this.st.opp;
    this.car.noExplode = true;   // a wreck steams (his mother is in it), as the bodega's jeep
    g.cam.yaw = s.yaw;
    g.cam.snapNext = true;
    this.t0 = null;
    this.result = null;
    this.showBanners(R);
    this.setMode('race');
    this.last = { kind: 'start', k, t: g.time };
    return true;
  }
  // Tests and calibration: the grid at once, no challenge, no fade.
  startRace(k = this.next, { instant = true } = {}) {
    if (!instant) { this.challenge(); return this.mode === 'offer'; }
    if (!this.active || this.mode || k < 0) return false;
    return this.place(k);
  }

  tickRace(dt) {
    const g = this.g, st = this.st;
    const r = st.update(g, this.m, dt);
    if (this.t0 == null && st.countdown <= 0) this.t0 = g.time;
    // The kind's 'done' is also José's car wrecked: no race then, not a win.
    if (r === 'done') this.finish(this.car?.dead ? 'wreck' : 'win');
    else if (r && r.fail) this.finish('lose');
  }

  // The result at once (banner, prize, the bet, the save); José's piece from his car if Stig is near;
  // then José drives back. A wreck of his car counts for nothing: the bet is handed back.
  finish(result) {
    const g = this.g, c = this.cfg, k = this.k, R = c.races[k], n = c.races.length;
    const el = this.t0 == null ? 0 : g.time - this.t0;
    this.st.cleanup(g, this.m);
    this.st = null;
    this.hideBanners();
    const bet = this.bet;
    this.bet = null;
    this.result = { k, result, t: +el.toFixed(2), at: g.time, bet: bet?.stake ?? 0 };
    this.last = { kind: 'race', ...this.result };
    if (result === 'win') {
      const rec = (g.records.gatlopp ||= { won: 0 });
      rec.won = Math.max(rec.won || 0, k + 1);
      g.addCoins(R.prize + (bet ? bet.stake * c.bet.odds : 0));
      g.save();
      hud.showBanner(c.win.banner, fmt(c.win.sub, { i: k + 1, n, t: raceClock(el) }), 'good', 3200);
      audio.jingle('complete');
      hud.toast(fmt(c.win.toast, { n: R.prize }));
      if (bet) hud.toast(fmt(c.bet.paid, { n: bet.stake * c.bet.odds }));
      hud.toast(this.next >= 0 ? fmt(c.next, { name: c.races[this.next].name }) : c.all);
    } else if (result === 'wreck') {
      hud.toast(c.wreck);
      if (bet) { g.addCoins(bet.stake); hud.toast(fmt(c.bet.back, { n: bet.stake })); }
    } else {
      hud.showBanner(c.lose.banner, fmt(c.lose.sub, { i: k + 1, n }), '', 2600);
      audio.jingle('fail');
      if (bet) hud.toast(fmt(c.bet.lost, { n: bet.stake }));
    }
    const f = g.focus(), car = this.car;
    if (result !== 'wreck' && car && !car.dead && dist(f.x, f.z, car.x, car.z) < c.linesR) for (const [d, who, text] of (result === 'win' ? c.win : c.lose).lines) this.say(who, text, d);
    this.goHome();
  }

  // ---- José back to his place ------------------------------------------------------------------
  // By road to `via`, then west along the z −40 road to the kerb in front of the centre (a U-turn
  // at `via` when he comes the other way), slowing for `stop` over `slowFrom` m.
  goHome() {
    const g = this.g, car = this.car, H = this.cfg.home;
    if (!car || car.dead || !g.cars.includes(car) || car.driver !== this.jose) { this.toFoot(); return; }
    const [a, b] = startNodes(car);
    const nodes = [a, ...findPath(b, nodeRef(H.via)), nodeRef(H.to)];
    car.ai = new AIDriver(car, { mode: 'route', path: new LanePath(nodes), cruise: H.cruise, avoid: true, rubber: () => this.homeRubber() });
    car.locked = true;
    this.setMode('home');
  }
  onStopEdge(car) {
    const H = this.cfg.home;
    return Math.abs(car.z - H.stop[1]) < 2.5 && Math.sin(car.yaw) < -0.8 && car.x < nodeX(nodeRef(H.via)) - 4 && car.x > H.stop[0] - 8;
  }
  homeRubber() {
    const car = this.car, H = this.cfg.home;
    return car && this.onStopEdge(car) ? clamp((car.x - H.stop[0]) / H.slowFrom, 0.12, 1) : 1;
  }
  tickHome() {
    const g = this.g, H = this.cfg.home, car = this.car, f = g.focus();
    if (!car || car.dead || !g.cars.includes(car)) { this.toFoot(); return; }
    if (car.ai && this.onStopEdge(car) && car.x <= H.stop[0] + 0.6) {
      car.ai = null;
      car.ctrl.park = true; car.ctrl.throttle = 0; car.ctrl.brake = 1;
    }
    if (!car.ai && car.speed < 0.3) { this.toFoot(); return; }
    // Held up for good, or far from Stig: home at once, out of his sight.
    const d = dist(f.x, f.z, car.x, car.z);
    if (d > H.farR || (this.t > H.giveUp && d > 60)) this.homeNow();
  }
  // Out of the car (parked at the kerb, or a wreck): near his place, he and his mother walk to it;
  // further off they stand where they are until Stig is away (placeNpcs).
  toFoot() {
    const g = this.g, c = this.cfg, H = c.home, car = this.car;
    if (car && g.cars.includes(car)) {
      const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw), rx = -fz, rz = fx, w = car.spec.wid / 2 + 0.8;
      for (const [key, along] of [[c.who, 0.9], [c.rider, -0.9]]) {
        const n = g.npcs[key];
        if (n && n.car === car) g.unseat(n, car.x + rx * w + fx * along, car.z + rz * w + fz * along);
      }
      if (car.dead) this.wreck = car; else g.removeCar(car);
    }
    this.car = null;
    const s = this.homeSpot(c.who), n = this.jose;
    if (s && n && n.state !== 'hidden' && dist(n.x, n.z, s.x, s.z) < 25) {
      const q = g.lmOffset(this.homeOf(c.who)[0], H.mamma[0], H.mamma[1]);
      this.walkers = { [c.who]: { x: s.x, z: s.z, yaw: s.yaw, done: false }, [c.rider]: { x: q.x, z: q.z, yaw: s.yaw, done: false } };
      for (const key of Object.keys(this.walkers)) {
        const w = g.npcs[key];
        if (!w || w.state === 'hidden') { delete this.walkers[key]; continue; }
        w.busy = true;
        w.spot = null;
        w.steer = () => this.steer(key);
      }
      this.setMode('walk');
      this.last = { kind: 'home', t: g.time, walk: true };
    } else {
      for (const key of [c.who, c.rider]) this.release(key);
      this.setMode(null);
      this.last = { kind: 'home', t: g.time, walk: false };
    }
  }
  // n.steer (main.fixedStep): straight to the spot at a walk.
  steer(key) {
    const n = this.g.npcs[key], w = this.walkers?.[key];
    if (!n || !w || w.done || n.state !== 'normal') return null;
    const dx = w.x - n.x, dz = w.z - n.z, d = Math.hypot(dx, dz);
    if (d < 0.35) { w.done = true; n.yaw = w.yaw; return null; }
    const v = Math.min(this.cfg.home.walk, d * 2);
    return { x: (dx / d) * v, z: (dz / d) * v };
  }
  tickWalk() {
    const g = this.g, ws = this.walkers;
    if (!ws) { this.setMode(null); return; }
    const keys = Object.keys(ws);
    if (keys.every((k) => ws[k].done) || this.t > this.cfg.home.walkSecs) {
      // Still on the way (held up by a car or Stig): there now.
      for (const k of keys) {
        const n = g.npcs[k], w = ws[k];
        if (!w.done && n?.state === 'normal') { n.teleport(w.x, w.z, w.yaw); n.vx = n.vz = 0; }
        this.release(k);
      }
      this.walkers = null;
      this.setMode(null);
      this.last = { kind: 'back', t: g.time };
    }
  }
  // Both home at once (a mission start; the car stuck or far away).
  homeNow() {
    const g = this.g, c = this.cfg, car = this.car;
    if (car && g.cars.includes(car)) {
      for (const q of [car.driver, ...car.passengers]) if (q && q !== g.player) g.unseat(q);
      g.removeCar(car);
    }
    this.car = null;
    for (const key of [c.who, c.rider]) this.sendHome(key);
    this.walkers = null;
    this.setMode(null);
  }

  // ---- the bet ---------------------------------------------------------------------------------
  // The board's spot (the E point): by Berra's home, the pool bar or the bodega.
  boardSpot() {
    const g = this.g, b = this.cfg.board, at = this.homeOf('berra')?.[0] === 'bodega' ? b.bodega : b.flamencoBar;
    const q = g.lmOffset(at[0], at[1], at[2]);
    return { x: q.x, z: q.z, y: g.groundAt(q.x, q.z), yaw: at[3] ?? q.yaw, at };
  }
  canBet() {
    const g = this.g, c = this.cfg.bet, p = g.player;
    if (!this.active || this.bet || this.next < 0 || this.mode === 'offer' || this.mode === 'race' || this.lines.length) return false;
    if (g.inDialog || g.chat.busy || g.playerCar || g.carrying || g.shame.pursuit || p.state !== 'normal' || !p.onGround || g.frozenT > 0 || g.shame.panicT > 0) return false;
    const b = g.npcs.berra, r = g.npcs.robban, s = this.boardSpot();
    return !!b && !!r && g.chat.free('berra') && g.chat.free('robban') && dist(b.x, b.z, s.x, s.z) < c.withR && dist(b.x, b.z, r.x, r.z) < c.withR;
  }
  // E at the board: 100 pta on himself, Berra's line, Robban's; too little money, Berra's no.
  placeBet() {
    if (!this.canBet()) return;
    const g = this.g, c = this.cfg.bet, b = g.npcs.berra, p = g.player;
    p.yaw = yawTo(b.x - p.x, b.z - p.z);
    if (g.coins < c.stake) {
      this.say('berra', c.poor);
      this.last = { kind: 'bet', placed: false, t: g.time };
      return;
    }
    g.addCoins(-c.stake);
    this.bet = { stake: c.stake };
    this.say('berra', c.berra);
    this.say('robban', c.robban, c.robbanAt);
    hud.toast(fmt(c.toast, { n: c.stake, m: c.stake * c.odds }));
    this.last = { kind: 'bet', placed: true, t: g.time };
  }

  // ---- the frame -------------------------------------------------------------------------------
  update(dt) {
    const g = this.g;
    if (!this.active) {
      if (this.mode || this.car || this.wreck || this.walkers || this.lines.length) this.reset();
      this.showMarks(false);
      return;
    }
    this.sayDue();
    this.t += dt;
    switch (this.mode) {
      case 'offer': this.tickOffer(); break;
      case 'race': this.tickRace(dt); break;
      case 'home': this.tickHome(); break;
      case 'walk': this.tickWalk(); break;
    }
    if (this.wreck) {
      const f = g.focus(), w = this.wreck;
      if (!g.cars.includes(w)) this.wreck = null;
      else if (dist(f.x, f.z, w.x, w.z) > 80) { g.removeCar(w); this.wreck = null; }
    }
    this.tickSisters();
    this.showMarks(true);
  }

  // Out of free roam (a mission starts, the other level): the race ended at once, both cars' parts
  // undone, José and his mother home. The bet stays for the next race.
  reset() {
    const g = this.g, c = this.cfg, took = this.mode === 'race' || this.mode === 'home' || this.mode === 'walk' || !!this.car;
    if (this.mode === 'offer') { if (this.faded) hud.fade(false); g.frozenT = 0; }
    this.faded = false;
    if (this.st) {
      this.st.cleanup(g, this.m);
      this.st = null;
      this.last = { kind: 'abort', k: this.k, t: g.time };
    }
    const car = this.car;
    if (car && g.cars.includes(car)) {
      for (const q of [car.driver, ...car.passengers]) if (q && q !== g.player) g.unseat(q);
      g.removeCar(car);
    }
    this.car = null;
    if (this.wreck && g.cars.includes(this.wreck)) g.removeCar(this.wreck);
    this.wreck = null;
    if (took || this.walkers) for (const key of [c.who, c.rider]) this.sendHome(key);
    this.walkers = null;
    this.lines.length = 0;
    this.m = null;
    this.setMode(null);
    this.hideBanners();
  }
  setMode(m) { this.mode = m; this.t = 0; }

  // The sisters' six: all three won, the first time Stig on foot is within `r` of both standing free
  // together (saved).
  tickSisters() {
    const g = this.g, c = this.cfg.sisters, rec = g.records.gatlopp, p = g.player;
    if (!rec || (rec.won ?? 0) < this.cfg.races.length || rec.sex || this.mode === 'offer' || this.mode === 'race' || this.lines.length) return;
    if (g.playerCar || p.state !== 'normal' || g.inDialog || g.shame.pursuit || g.chat.busy) return;
    const s = g.npcs.siv, m = g.npcs.majsan;
    const free = (n, k) => !!n && n.state === 'normal' && n.root.visible && !n.car && !n.seatId && !n.steer && !g.npcPosed(k);
    if (!free(s, 'siv') || !free(m, 'majsan')) return;
    if (dist(s.x, s.z, m.x, m.z) > c.pairR || dist(p.x, p.z, s.x, s.z) > c.r || dist(p.x, p.z, m.x, m.z) > c.r) return;
    rec.sex = true;
    g.save();
    for (const [d, who, text] of c.lines) this.say(who, text, d);
    s.chatT = m.chatT = 9;
    this.last = { kind: 'sisters', t: g.time };
  }

  say(who, text, delay = 0) { this.lines.push({ at: this.g.time + delay, who, text }); }
  sayDue() {
    const g = this.g;
    if (!this.lines.length) return;
    if (g.inDialog) { this.lines.length = 0; return; }
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i];
      if (l.at > g.time) continue;
      this.lines.splice(i--, 1);
      const n = l.who === 'stig' ? g.player : g.npcs[l.who];
      if (!n || n.state === 'hidden') continue;
      g.say(n, l.text, 2.4);
      if (n !== g.player) n.chatT = 8 + Math.random() * 3;   // his chatter clock restarts: no bubble over the line
    }
  }

  // ---- what shows --------------------------------------------------------------------------------
  showMarks(on) {
    const g = this.g;
    // The "!" over José while he offers a race (the mission giver's rule: not within 3 m of the camera
    // or of Stig, where the prompt names him).
    const offer = on && this.offered();
    if (offer && !this.bang) this.bang = new Bang(scene, this.cfg.bang);
    if (this.bang) {
      this.bang.show(offer);
      if (offer) {
        const n = this.jose, p = g.player, by = n.y + n.height + 0.9;
        this.bang.set(n.x, by, n.z, g.time);
        this.bang.root.children[0].visible = camera.position.distanceTo(_v.set(n.x, by + 0.88, n.z)) >= 3 && dist(n.x, n.z, p.x, p.z) > 3;
      }
    }
    // The board beside the bookmakers while a race is left.
    const board = on && this.next >= 0;
    if (board && !this.board) this.board = buildBoard(this.cfg.board.text);
    if (this.board) {
      this.board.visible = board;
      const s = board ? this.boardSpot() : null;
      if (s && s.at !== this.boardAt) {
        this.boardAt = s.at;
        this.board.position.set(s.x, s.y, s.z);
        this.board.rotation.y = s.yaw;
      }
    }
  }
  banner(text, strip) { return (this.banners[text] ||= buildBanner(text, this.cfg.banner.h, strip)); }
  // The start line at `lineX` on the z −40 road; a course's own finish line where it has one.
  showBanners(R) {
    const c = this.cfg, s = this.banner(c.banner.start, true);
    s.position.set(c.lineX, 0, -40);
    s.rotation.y = Math.PI / 2;
    s.visible = true;
    if (R.line) {
      const f = this.banner(c.banner.finish, false);
      f.position.set(R.line.at[0], 0, R.line.at[1]);
      f.rotation.y = R.line.along === 'x' ? Math.PI / 2 : 0;
      f.visible = true;
    }
  }
  hideBanners() { for (const b of Object.values(this.banners)) b.visible = false; }

  // main.js: the objective card, the guide's target and the minimap's markers.
  objective() {
    if (!this.racing || !this.st || !this.active) return null;
    const c = this.cfg, R = c.races[this.k], v = { name: R.name, prize: R.prize, n: this.bet?.stake };
    return { title: fmt(c.title, { i: this.k + 1, n: c.races.length }), text: this.st.sub || fmt(this.bet ? c.bet.card : c.text, v), ...this.st.obj(this.g) };
  }
  target() { return this.racing && this.st && this.active ? this.st.target(this.g) : null; }
  markers() {
    if (this.racing && this.st && this.active) return this.st.markers(this.g);
    const n = this.jose;
    return this.offered() ? [{ type: 'friend', x: n.x, z: n.z, edge: false }] : [];
  }
}
