// Heja Eslöv! – the rollerskier trains for real (free roam; feature 7, DESIGN §10.12). The rollerskier
// with ESLÖV on his chest skis up and down the Eslöv lane by the tomato fields, double-poling on red
// rollerskis (anim flag `ski`), and stands at the lane's south end now and then, facing the road.
// The horn within reach (honk.press hands it over: `horn`) brings Stig's "Heja Eslöv!" through the
// window and the skier's wave with his pole ("Bara 390 mil kvar!"); on foot E does the same, and he
// glides to a stop and offers Eslövloppet: once round the tomato fields on the roads, start and
// finish at the ESLÖV 3 900 KM sign. Stig runs, the skier poles at the pace that crosses the line
// as the clock runs out; win and Stig gets a coin and his best time is kept (`game.records.eslov`).
// Stig standing in his track gets "Spår!" from behind, says sorry and hops aside. Only on the
// island with `missions.state === 'idle'`: out of it he is back at his place (eslovVag) at once, as
// before the feature, so no mission, timer or calibration pool sees him move. Config: ESLOV
// (content/island.js). Owned by Game as `eslov`; main.js asks who is `posed` and `waving`, for the
// race's objective card, target and markers, and calls `update` once a frame.

import { ESLOV } from '../content/index.js';
import { lm } from '../world/layout.js';
import { audio } from '../audio.js';
import { S, fmt } from '../strings.js';
import { hud } from './hud.js';
import { clamp, dist, pick, yawTo, dampAngle } from '../util.js';

const MARK = 'eslov';   // npc.spot while the skier is ours (a placement by anyone else clears it)
const KP = 3;           // m/s of steering per metre off his line
const _p = {}, _q = {};
const toward = (v, w, up, down) => (w > v ? Math.min(w, v + up) : Math.max(w, v - down));
// Race times as the HUD shows them: 0:38,4.
export const raceClock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0').replace('.', ',')}`;

export class Eslov {
  constructor(game, cfg = ESLOV) {
    this.g = game;
    this.cfg = cfg;
    this.mode = null;        // null (not ours) | 'ski' | 'rest' | 'greet' | 'offer' | 'start' | 'race' | 'back' | 'after' | 'lent'
    this.t = 0;              // seconds in the mode
    this.s = 0;              // metres along the lane loop
    this.v = 0;              // his speed along it
    this.off = 0;            // the swerve round Stig: metres to his right of the loop
    this.laps = 0;
    this.restDue = false;    // stop at the south end when he gets there
    this.comeBack = false;   // braking on the north leg to turn back to his place (Stig waits there, §10.39)
    this.walkTo = null;      // { x, z }: on foot to it standing (lent: to the lane's edge; given back: to his rest)
    this.blockT = 0;
    this.lines = [];         // [{ at, who: 'stig' | 'eslov', text, wave?, then? }] still to say (g.time)
    this.hejaT = -Infinity;
    this.sparT = -Infinity;
    this.waveUntil = 0;
    this.replies = 0;        // answers given this session (the first is the first reply)
    this.newWin = false;     // a win since his last answer (the next is the first `won` one)
    this.lastReply = null;
    this.race = null;        // the race while it runs (startRace)
    this.back = null;        // after it: the rest of his lap ({ path, cum, len, s, v, lines })
    this.spotWas = null;
    this.last = null;        // tests: { kind: 'heja' | 'spar' | 'race', t, ... }
    const self = this;
    game.addInteractable({
      id: 'eslov', r: cfg.heja.r2,
      pos: () => { const n = self.npc; return n ? { x: n.x, z: n.z, y: n.y } : null; },
      enabled: () => self.canTalk(),
      get prompt() { return self.mode === 'offer' ? self.cfg.race.prompt : self.cfg.heja.prompt; },
      use: () => { if (self.mode === 'offer') self.startRace(); else self.cheer(); },
    });
  }

  get npc() { return this.g.npcs[this.cfg.who]; }
  get home() { return lm(this.cfg.at); }
  get active() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  // honk.free: in free roam he answers the horn himself (`horn`), never with the island's lines.
  owns(key) { return key === this.cfg.who && this.active; }
  // syncAll: no turn to the player, no wave and no chatter while he skis or races; standing (a rest,
  // the greeting, the offer, after the race) he is as anyone.
  posed(key) { return key === this.cfg.who && this.npc?.spot === MARK && (this.mode === 'ski' || this.mode === 'start' || this.mode === 'race' || this.mode === 'back'); }
  waving(key) { return key === this.cfg.who && this.g.time < this.waveUntil; }

  // ---- the lane loop -------------------------------------------------------------------------
  // North along the lane `side` m east of its middle, a half circle round at the north end, south
  // `side` m west of it, a half circle at the south end (`at`, which faces south).
  get loop() {
    if (!this._loop) {
      const l = this.home, c = this.cfg.lane, r = c.side, leg = -c.to, u = Math.PI * r;
      this._loop = { cx: l.x, zS: l.z, zN: l.z + c.to, r, leg, u, C: 2 * leg + 2 * u, sRest: 2 * leg + u };
    }
    return this._loop;
  }
  // The loop at s: the point and the heading (unit).
  at(s, out) {
    const { cx, zS, zN, r, leg, u, C } = this.loop;
    s = ((s % C) + C) % C;
    if (s < leg) return Object.assign(out, { x: cx + r, z: zS - s, tx: 0, tz: -1 });
    s -= leg;
    if (s < u) { const f = s / r; return Object.assign(out, { x: cx + r * Math.cos(f), z: zN - r * Math.sin(f), tx: -Math.sin(f), tz: -Math.cos(f) }); }
    s -= u;
    if (s < leg) return Object.assign(out, { x: cx - r, z: zN + s, tx: 0, tz: 1 });
    s -= leg;
    const f = s / r;
    return Object.assign(out, { x: cx - r * Math.cos(f), z: zS + r * Math.sin(f), tx: Math.sin(f), tz: Math.cos(f) });
  }
  // The leg on his side of the lane's middle, at his z.
  nearestS(x, z) {
    const { cx, zS, zN, leg, u } = this.loop;
    return x >= cx ? clamp(zS - z, 0, leg - 0.01) : leg + u + clamp(z - zN, 0, leg - 0.01);
  }
  // Back the way he came, from the same spot on the other leg.
  turnBack() {
    const { leg, u } = this.loop, s = this.s;
    if (s < leg) this.s = 2 * leg + u - s;
    else if (s >= leg + u && s < 2 * leg + u) this.s = leg - (s - leg - u);
    this.off = 0;
  }
  // Full speed on the legs, `turnSpeed` in the half circles, braking for them at `accel`; a due rest
  // brakes to a stop at the south leg's end.
  vWant() {
    const c = this.cfg, L = this.loop, s = this.s;
    let v = c.speed;
    for (const [a, b] of [[L.leg, L.leg + L.u], [L.sRest, L.C]]) {
      if (s >= a && s < b) return c.turnSpeed;
      v = Math.min(v, Math.sqrt(c.turnSpeed ** 2 + 2 * c.accel * (s < a ? a - s : a + L.C - s)));
    }
    if (this.restDue && s < L.sRest && s >= L.leg + L.u) v = Math.min(v, Math.max(0.3, Math.sqrt(2 * c.accel * (L.sRest - s))));
    return v;
  }
  advance(ds) {
    const L = this.loop, s0 = this.s, s1 = s0 + ds, a = L.leg + L.u;
    if (s0 < a && s1 >= a && ((this.laps + 1) % this.cfg.restEvery === 0 || this.g.day?.dark)) this.restDue = true;
    if (s0 < L.sRest && s1 >= L.sRest) {
      this.laps++;
      if (this.restDue) { this.s = L.sRest; this.setMode('rest'); return; }
    }
    this.s = s1 >= L.C ? s1 - L.C : s1;
  }

  // ---- whose he is -----------------------------------------------------------------------------
  canClaim() {
    const n = this.npc;
    return !!n && n.state === 'normal' && n.root.visible && !n.car && !n.seatId && (!n.busy || n.spot === MARK);
  }
  // Ours: he stands at his place first (a rest), then skis.
  claim() {
    const n = this.npc;
    this.spotWas = n.spot;
    n.busy = true;
    n.spot = MARK;
    n.steer = () => this.steer();
    this.s = this.loop.sRest;
    this.v = 0;
    this.off = 0;
    this.restDue = false;
    this.comeBack = false;
    this.walkTo = null;
    this.setMode('rest');
  }
  setMode(m) { this.mode = m; this.t = 0; }
  // Someone else placed him (a forced placeNpcs): let go; the next frame takes him again from there.
  drop() {
    const n = this.npc;
    if (this.mode === 'start') { hud.fade(false); this.g.frozenT = 0; }
    if (this.race) this.endRace(null);
    this.back = null;
    this.walkTo = null;
    this.comeBack = false;
    delete n.steer;
    n.invulnerable = false;
    this.mode = null;
    this.lines.length = 0;
  }
  // Out of free roam (a mission starts, the level changes): back at his place, as before.
  reset() {
    const g = this.g, n = this.npc, l = this.home;
    if (this.race) {
      if (this.mode === 'start') { hud.fade(false); g.frozenT = 0; }
      this.race = null;
    }
    this.back = null;
    this.walkTo = null;
    this.comeBack = false;
    this.lines.length = 0;
    this.waveUntil = 0;
    if (n && n.spot === MARK) {
      delete n.steer;
      n.invulnerable = false;
      if (n.state === 'normal') { n.teleport(l.x, l.z, l.yaw); n.vx = n.vz = 0; }
      n.busy = false;
      n.spot = this.spotWas;
    }
    this.mode = null;
  }

  // ---- the frame ---------------------------------------------------------------------------------
  update(dt) {
    const g = this.g, n = this.npc;
    if (!n) return;
    // Lent to Stig (§10.39), he stands at the lane's edge without them.
    const lent = !!g.skis?.on;
    n.anim.ski = g.level === 'island' && !lent;
    if (!this.active) { if (this.mode || this.race || this.lines.length || n.spot === MARK) this.reset(); return; }
    if (!this.mode) { if (this.canClaim()) this.claim(); else return; }
    if (n.spot !== MARK) { this.drop(); return; }
    if (lent && this.mode !== 'lent') {
      if (this.race) this.endRace(null);
      this.back = null;
      this.v = 0;
      const l = this.home, [dx, dz] = g.skis.cfg.lend.stand;
      this.walkTo = { x: l.x + dx, z: l.z + dz };
      this.setMode('lent');
    } else if (!lent && this.mode === 'lent') {
      // His skis back on: on foot to his rest at the place, then on with his laps.
      this.s = this.loop.sRest;
      this.v = 0;
      this.restDue = false;
      this.walkTo = this.at(this.s, { ..._p });
      this.setMode('rest');
    }
    this.sayDue();
    this.t += dt;
    const c = this.cfg, p = g.player;
    const face = (yaw, k = 6) => { n.yaw = dampAngle(n.yaw, yaw, k, dt); };
    const faceStig = () => face(yawTo(p.x - n.x, p.z - n.z));
    switch (this.mode) {
      case 'rest':
        if (dist(p.x, p.z, n.x, n.z) > 10) face(this.home.yaw, 3);   // nearer, syncAll turns him to Stig
        // Stig waiting at his place after the bodega keeps him standing there (the loan, §10.39).
        if (this.t >= c.restSecs && !g.day?.dark && n.state === 'normal' && !this.walkTo && !g.skis?.waiting()) { this.restDue = false; this.setMode('ski'); }
        break;
      case 'lent':
        if (dist(p.x, p.z, n.x, n.z) > 10 && !this.walkTo) face(this.home.yaw + Math.PI / 2, 3);   // to the lane; nearer, syncAll turns him to Stig
        break;
      case 'ski':
        if (n.state === 'normal') this.ski(dt);
        break;
      case 'greet':
        // He glides to a stop on his line, then turns to Stig; the offer's line moves him on (sayDue).
        this.glide(dt);
        if (this.v < 0.6) faceStig();
        if (this.t > c.heja.replyAt + c.race.offerAt + 1) this.setMode('ski');   // no offer (the night)
        break;
      case 'offer':
        faceStig();
        if (this.t >= c.race.offerSecs || dist(p.x, p.z, n.x, n.z) > 9 || g.playerCar) this.setMode('ski');
        break;
      case 'start':
        this.tickStart();
        break;
      case 'race':
        this.tickRace();
        break;
      case 'back': {
        // The rest of his lap at the race's pace, to the line; then he stops and says his piece.
        // Held 1.5 s at a standstill (a car on the line) and he has arrived where he stands.
        const b = this.back;
        b.s = Math.min(b.len, b.s + b.v * dt);
        b.stuckT = Math.hypot(n.vx, n.vz) < 0.3 && n.state === 'normal' ? (b.stuckT || 0) + dt : 0;
        if (b.s >= b.len && (dist(n.x, n.z, b.path[b.path.length - 1].x, b.path[b.path.length - 1].z) < 1 || b.stuckT > 1.5)) this.arrive(b.lines);
        break;
      }
      case 'after':
        this.glide(dt);
        if (this.v < 0.6) faceStig();
        if (this.t >= c.race.afterSecs) { this.s = this.nearestS(n.x, n.z); this.setMode('ski'); }
        break;
    }
  }

  // Where Stig (on foot) stands on the track from `from` to `to` m ahead of him: the first point of
  // it level with Stig (within 0.5 m along it) and less than `w` m off the line `ref` m right of the
  // loop (the swerved line), { d, lat } (lat: metres to the right of the loop), else null. Along
  // the track, so the half circles count as he will ski them, not along his heading.
  inTrack(from, to, ref = this.off, w = this.cfg.spar.pass) {
    const g = this.g, n = this.npc, p = g.player;
    if (g.playerCar || p.state !== 'normal' || Math.abs(p.y - n.y) > 1.5) return null;
    for (let d = from; d <= to; d += 0.5) {
      const Q = this.at(this.s + d, _q), ex = p.x - Q.x, ez = p.z - Q.z;
      const along = ex * Q.tx + ez * Q.tz, lat = ex * -Q.tz + ez * Q.tx;
      if (Math.abs(along) <= 0.5 && Math.abs(lat - ref) < w) return { d, lat };
    }
    return null;
  }

  // Skiing: Stig in his track ahead gets "Spår!" and is passed `spar.pass` m off (held until he is
  // 1.5 m past); a car in it stops him, and he turns back after `blockSecs`; else on along the loop.
  ski(dt) {
    const g = this.g, c = this.cfg, n = this.npc, p = g.player, l = this.home;
    const P = this.at(this.s, _p), hx = P.tx, hz = P.tz;
    // Far off his lane (held up somewhere after a race) and nobody near to see it: back at his place,
    // as placeNpcs would put him.
    if (dist(n.x, n.z, P.x, P.z) > 8 && dist(p.x, p.z, n.x, n.z) > 50 && dist(p.x, p.z, l.x, l.z) > 50) {
      n.teleport(l.x, l.z, l.yaw);
      this.s = this.loop.sRest;
      this.v = 0;
      this.setMode('rest');
      return;
    }
    // Stig waiting at his place after the bodega (§10.39): he stops at it next time round, and on
    // the north leg brakes and turns back to it.
    if (g.skis?.waiting()) {
      this.restDue = true;
      if (this.s < this.loop.leg) this.comeBack = true;
    }
    let want = this.vWant(), offWant = 0;
    if (this.comeBack) {
      want = 0;
      if (this.v < 0.1) { this.comeBack = false; this.turnBack(); }
    }
    const hit = this.inTrack(-1.5, c.spar.ahead);
    if (hit) {
      offWant = hit.lat >= 0 ? hit.lat - c.spar.pass : hit.lat + c.spar.pass;
      if (hit.d >= 1.5 && Math.abs(hit.lat) < c.spar.lat && g.time - this.sparT >= c.spar.every && !this.lines.length && !g.saying(n)) this.spar();
    }
    this.off = toward(this.off, clamp(offWant, -c.lane.side - 2.2, 2.6 - c.lane.side), 2.4 * dt, 2.4 * dt);
    let blocked = false;
    for (const car of g.cars) {
      if (car.dead || Math.abs(car.x - n.x) > 12 || Math.abs(car.z - n.z) > 12) continue;
      const dx = car.x - n.x, dz = car.z - n.z, along = dx * hx + dz * hz, lat = dx * -hz + dz * hx, rr = Math.min(car.spec.len, car.spec.wid) / 2 + 0.5;
      if (along > 0 && along - car.radius < c.block && Math.abs(lat - this.off) < rr + 0.6) { blocked = true; break; }
    }
    if (blocked) {
      want = 0;
      this.blockT += dt;
      if (this.blockT > c.blockSecs && this.v < 0.1) { this.blockT = 0; this.turnBack(); }
    } else this.blockT = 0;
    this.v = toward(this.v, want, c.accel * dt, 3 * dt);
    const Q = this.at(this.s, _q);
    if (dist(n.x, n.z, Q.x - Q.tz * this.off, Q.z + Q.tx * this.off) < 2.5) this.advance(this.v * dt);
  }
  // Braking to a stop on his line at 5 m/s² (the greeting: a metre on from 3.2 m/s; after the race).
  glide(dt) { this.v = toward(this.v, 0, 0, 5 * dt); if (this.v > 0) this.s = (this.s + this.v * dt) % this.loop.C; }

  // n.steer (main.fixedStep): along his line at `v`, pulled back onto it. Standing: nothing.
  steer() {
    const n = this.npc, r = this.race;
    if (n.state !== 'normal') return null;
    if (this.walkTo && (this.mode === 'lent' || this.mode === 'rest')) {
      const ex = this.walkTo.x - n.x, ez = this.walkTo.z - n.z, d = Math.hypot(ex, ez);
      if (d < 0.12) { this.walkTo = null; return null; }
      const sp = Math.min(1.4, d * 3) / d;
      return { x: ex * sp, z: ez * sp };
    }
    let P, v;
    if (this.mode === 'race' || this.mode === 'back') {
      const q = this.mode === 'race' ? r : this.back;
      if (!q || q.t0 === null) return null;
      P = this.pathAt(q.s, _p, q);
      v = q.s >= q.len ? 0 : q.v;
      // Behind his schedule (held up, pushed aside): along the course to catch up, never across
      // the field (the canes).
      if (dist(n.x, n.z, P.x, P.z) > 4) { P = this.pathAt(Math.min(q.s, this.projS(n.x, n.z, q, q.s) + 3), _p, q); v = q.v; }
    } else if (this.mode === 'ski' || ((this.mode === 'greet' || this.mode === 'after') && this.v > 0.05)) {
      P = this.at(this.s, _p);
      v = this.v;
      const o = this.mode === 'ski' ? this.off : 0;
      P = { x: P.x - P.tz * o, z: P.z + P.tx * o, tx: P.tx, tz: P.tz };
    } else return null;
    const ex = P.x - n.x, ez = P.z - n.z;
    if (v < 0.05 && Math.hypot(ex, ez) < 0.15) return null;
    let wx = P.tx * v + ex * KP, wz = P.tz * v + ez * KP;
    const w = Math.hypot(wx, wz), cap = Math.max(1.2, v + 1.5);
    if (w > cap) { wx *= cap / w; wz *= cap / w; }
    return { x: wx, z: wz };
  }

  // ---- lines --------------------------------------------------------------------------------------
  sayDue() {
    const g = this.g, n = this.npc;
    if (!this.lines.length) return;
    if (g.inDialog) { this.lines.length = 0; return; }
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i];
      if (l.at > g.time) continue;
      this.lines.splice(i--, 1);
      if (l.who === 'eslov') {
        if (n.state !== 'normal') continue;
        g.say(n, l.text, 2.4);
        n.chatT = 8 + Math.random() * 4;   // the chatter clock restarts: no bubble over his line
        if (l.wave) this.waveUntil = g.time + this.cfg.heja.waveSecs;
      } else g.say(g.player, l.text, 2.2);
      l.then?.();
    }
  }

  // "Heja Eslöv!" from Stig `stigAt` s from now, his answer `replyAt` s from now with a wave of the
  // pole: the first reply of the session, and the first after a win, first; then another than the
  // last (after a won race, saved or this session's, the `won` ones).
  heja(stigAt, replyAt) {
    const g = this.g, c = this.cfg.heja;
    const list = g.records.eslov != null ? c.won : c.replies;
    const text = this.replies === 0 || this.newWin ? list[0] : pick(list.length > 1 ? list.filter((l) => l !== this.lastReply) : list);
    this.newWin = false;
    this.replies++;
    this.lastReply = text;
    this.hejaT = g.time;
    this.lines.push({ at: g.time + stigAt, who: 'stig', text: c.stig }, { at: g.time + replyAt, who: 'eslov', text, wave: true });
    return text;
  }
  // honk.press, in free roam: the horn within `heja.r` m of him, if he sees the car. True when he
  // takes it (the island's answers and Stig's sorry are then not for this press).
  horn(car) {
    const g = this.g, c = this.cfg.heja, n = this.npc;
    if (!this.active || !n || n.spot !== MARK || n.state !== 'normal' || this.race || g.time - this.hejaT < c.every) return false;
    if (dist(n.x, n.z, car.x, car.z) > c.r || !g.honk.sees(n, car)) return false;
    const text = this.heja(c.stigAt, c.replyAt);
    this.last = { kind: 'heja', by: 'horn', t: g.time, reply: text };
    return true;
  }
  canTalk() {
    const g = this.g, p = g.player, n = this.npc;
    return this.active && !!n && n.spot === MARK && n.state === 'normal'
      && (this.mode === 'offer' || ((this.mode === 'ski' || this.mode === 'rest') && g.time - this.hejaT >= this.cfg.heja.every))
      && !g.inDialog && !g.playerCar && !g.carrying && !g.shame.pursuit && p.state === 'normal' && p.onGround
      && !(g.frozenT > 0) && !(g.shame.panicT > 0);
  }
  // E on foot: the cheer, then he stops and offers the race.
  cheer() {
    if (!this.canTalk()) return;
    const g = this.g, c = this.cfg, reply = c.heja.replyAt - c.heja.stigAt;
    const text = this.heja(0, reply);
    this.last = { kind: 'heja', by: 'foot', t: g.time, reply: text };
    this.setMode('greet');
    if (!g.day?.dark) this.lines.push({ at: g.time + reply + c.race.offerAt, who: 'eslov', text: c.race.offer, then: () => { if (this.mode === 'greet') this.setMode('offer'); } });
  }
  // "Spår!" from behind; Stig's sorry and a hop aside, if he is still in the track then.
  spar() {
    const g = this.g, c = this.cfg.spar, n = this.npc;
    this.sparT = g.time;
    g.say(n, c.call, 1.6);
    n.chatT = 8;
    this.last = { kind: 'spar', t: g.time, hop: false };
    const last = this.last;
    this.lines.push({ at: g.time + c.sorryAt, who: 'stig', text: c.sorry, then: () => {
      const p = g.player, hit = this.mode === 'ski' ? this.inTrack(-0.5, c.ahead, 0, c.lat + 0.4) : null;
      if (!hit || !p.onGround) return;
      const Q = this.at(this.s + hit.d, _q), side = hit.lat >= this.off ? 1 : -1;
      p.jump(5.5);
      p.vx += -Q.tz * side * c.hop;
      p.vz += Q.tx * side * c.hop;
      last.hop = true;
    } });
  }

  // ---- Eslövloppet -------------------------------------------------------------------------------
  // The course in world coordinates (offsets from `at` in world axes).
  course() {
    const l = this.home, r = this.cfg.race, P = ([dx, dz]) => ({ x: l.x + dx, z: l.z + dz });
    const path = r.path.map(P), cum = [0];
    for (let k = 1; k < path.length; k++) cum.push(cum[k - 1] + dist(path[k - 1].x, path[k - 1].z, path[k].x, path[k].z));
    return {
      stig: P(r.stig), skier: P(r.skier), path, cum, len: cum[cum.length - 1],
      cps: r.cps.map(([dx, dz, rad]) => ({ ...P([dx, dz]), r: rad })),
      lineX: l.x, lineZ: l.z + r.line[0], lineW: r.line[1],
    };
  }
  // The course's s nearest (x, z), up to `sMax` (he is never ahead of his schedule; the start and
  // the line are the same place).
  projS(x, z, q, sMax) {
    const { path, cum } = q;
    let best = 0, bd = Infinity;
    for (let k = 1; k < path.length && cum[k - 1] <= sMax; k++) {
      const a = path[k - 1], b = path[k], L = cum[k] - cum[k - 1] || 1;
      const f = clamp(((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) / (L * L), 0, Math.min(1, (sMax - cum[k - 1]) / L));
      const d = (x - a.x - (b.x - a.x) * f) ** 2 + (z - a.z - (b.z - a.z) * f) ** 2;
      if (d < bd) { bd = d; best = cum[k - 1] + f * L; }
    }
    return best;
  }
  pathAt(s, out, r = this.race) {
    const { path, cum } = r;
    let k = 1;
    while (k < path.length - 1 && cum[k] < s) k++;
    const a = path[k - 1], b = path[k], L = cum[k] - cum[k - 1] || 1, f = clamp((s - cum[k - 1]) / L, 0, 1);
    return Object.assign(out, { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, tx: (b.x - a.x) / L, tz: (b.z - a.z) / L });
  }
  canRace() {
    const g = this.g;
    return this.mode === 'offer' && this.canTalk() && !g.day?.dark;
  }
  // E on the offer: Stig's yes, a black cut, both on the start line, the countdown (frozen), go.
  startRace() {
    if (!this.canRace()) return;
    const g = this.g, c = this.cfg.race;
    g.say(g.player, c.yes, 1.8);
    this.race = { ...this.course(), T: this.timer ?? c.timer, t0: null, s: 0, pi: 0, placed: false, count: 4 };
    this.race.v = this.race.len / this.race.T;
    this.setMode('start');
  }
  tickStart() {
    const g = this.g, c = this.cfg.race, r = this.race, n = this.npc, p = g.player;
    const tFade = 0.9, tPlace = tFade + c.fadeSecs;
    if (this.t >= tFade && !r.faded) { r.faded = true; hud.fade(true); g.frozenT = c.fadeSecs + c.count + 0.3; }
    if (this.t >= tPlace && !r.placed) {
      r.placed = true;
      if (g.playerCar || p.state !== 'normal') { hud.fade(false); this.endRace('abort'); return; }
      p.teleport(r.stig.x, r.stig.z, Math.PI);
      p.vx = p.vz = 0;
      g.cam.yaw = Math.PI;
      g.cam.snapNext = true;
      n.teleport(r.skier.x, r.skier.z, Math.PI);
      n.vx = n.vz = 0;
      n.invulnerable = true;
      hud.fade(false);
    }
    if (!r.placed) return;
    const left = tPlace + c.count - this.t, k = Math.ceil(left);
    if (k !== r.count && k >= 0 && k <= 3) {
      r.count = k;
      if (k > 0) { hud.showBanner(String(k), '', 'count', 900); audio.tick(); }
      else { hud.showBanner(S.go, '', 'count', 900); audio.checkpoint(); }
    }
    if (left <= 0) {
      g.frozenT = 0;
      r.t0 = g.time;
      r.px = p.x; r.pz = p.z; r.prevZ = p.z;
      this.setMode('race');
    }
  }
  tickRace() {
    const g = this.g, r = this.race, p = g.player, el = g.time - r.t0;
    r.s = Math.min(r.len, el * r.v);
    // On foot only, and no shortcuts by R (any jump in his position).
    if (g.playerCar || dist(p.x, p.z, r.px, r.pz) > 3) { this.endRace('abort'); return; }
    r.px = p.x; r.pz = p.z;
    if (r.pi < r.cps.length) {
      const q = r.cps[r.pi];
      if (dist(p.x, p.z, q.x, q.z) < q.r) { r.pi++; audio.checkpoint(); }
    } else if (p.z <= r.lineZ && r.prevZ > r.lineZ && Math.abs(p.x - r.lineX) <= r.lineW) { this.endRace('win', el); return; }
    r.prevZ = p.z;
    if (el >= r.T) this.endRace('lose', r.T);
  }
  // The result at once (banner, coins, record); the skier finishes his lap on the course (`back`:
  // across the field the cane windbreaks would stop him) and then has his say at the line.
  endRace(kind, el = null) {
    const g = this.g, c = this.cfg.race, n = this.npc, r = this.race;
    this.race = null;
    if (n) n.invulnerable = false;
    if (!kind) return;
    this.last = { kind: 'race', result: kind, t: el, T: r.T, cps: r.pi, at: g.time };
    const lines = [];
    this.back = { path: r.path, cum: r.cum, len: r.len, v: Math.max(r.v, this.cfg.speed), lines };
    this.back.s = this.projS(n.x, n.z, this.back, r.s);   // from where he is
    this.setMode('back');
    // Still on the first leg, up the Eslöv lane: that is his own lane, he trains on from there.
    if (this.back.s < r.cum[1] - 1) this.arrive(lines);
    if (kind === 'win') {
      const best = g.records.eslov ?? null, record = best == null || el < best;
      if (record) g.records.eslov = +el.toFixed(2);
      this.newWin = true;   // his next answer greets the runner
      g.addCoins(c.prize);
      g.save();
      this.last.record = record;
      hud.showBanner(c.win.banner, fmt(record ? c.win.record : c.win.sub, { t: raceClock(el) }), 'good', 3200);
      audio.jingle('complete');
      hud.toast(fmt(c.win.toast, { n: c.prize }));
      lines.push({ at: 0.3, who: 'eslov', text: c.win.line }, { at: 2.1, who: 'stig', text: c.win.stig });
    } else if (kind === 'lose') {
      hud.showBanner(c.lose.banner, c.lose.sub, '', 2600);
      audio.jingle('fail');
      lines.push({ at: 0.5, who: 'eslov', text: c.lose.line });
    } else hud.toast(c.abort);
  }

  // At the line after the race (or still on the lane): his piece if Stig is within 25 m, then he
  // faces Stig `afterSecs` and skis on.
  arrive(lines) {
    const g = this.g, n = this.npc, p = g.player;
    if (dist(p.x, p.z, n.x, n.z) < 25) for (const l of lines) this.lines.push({ ...l, at: g.time + l.at });
    this.back = null;
    this.v = 0;
    this.s = this.nearestS(n.x, n.z);
    this.setMode('after');
  }

  // main.js: the objective card, the guide's target and the minimap's markers while the race runs.
  objective() {
    const g = this.g, r = this.race;
    if (!r || !this.active) return null;
    const c = this.cfg.race, el = r.t0 == null ? 0 : g.time - r.t0, n = r.cps.length + 1, first = this.place() === 1;
    const best = g.records.eslov;
    return { title: c.title, text: best != null ? `${c.text} ${fmt(c.best, { t: raceClock(best) })}` : c.text, timer: r.T - el,
      bar: r.pi / n, barLabel: fmt(first ? 'race1' : 'race2', { i: r.pi, n }), barColor: first ? '#5fd35f' : '#ff8a3a' };
  }
  target() {
    const r = this.race;
    if (!r || !this.active) return null;
    const q = r.cps[r.pi];
    return q ? { x: q.x, z: q.z, r: q.r } : { x: r.lineX, z: r.lineZ, r: 2.5 };
  }
  markers() {
    const r = this.race, n = this.npc;
    if (!r || !this.active) return [];
    const out = [{ type: 'enemy', x: n.x, z: n.z, edge: true }];
    const q = r.cps[r.pi + 1] || (r.pi < r.cps.length ? { x: r.lineX, z: r.lineZ } : null);
    if (q) out.push({ type: 'item', x: q.x, z: q.z, edge: false });
    return out;
  }
  // 1 when Stig leads: more checkpoints than the skier's line has passed, or as many and nearer the next.
  place() {
    const r = this.race, p = this.g.player;
    let oi = 0;
    while (oi < r.cps.length && r.s >= r.cum[oi + 1]) oi++;
    if (r.pi !== oi) return r.pi > oi ? 1 : 2;
    const q = r.cps[r.pi] || { x: r.lineX, z: r.lineZ };
    return dist(p.x, p.z, q.x, q.z) <= r.cum[Math.min(oi + 1, r.cum.length - 1)] - r.s ? 1 : 2;
  }
}
