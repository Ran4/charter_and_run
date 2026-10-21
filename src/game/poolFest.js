// Små grodorna i poolen – the pool fest after the end (free roam; feature 8, DESIGN §10.13). The
// Christmas party is not quite over: whenever Stig comes onto Flamenco's pool deck, the SunTrip lot
// wade into the shallow end and stand in a ring round Lasse in his Santa hat, and to Små grodorna
// (audio.trad, a round at a time) they hop on every other beat with their hands as frog's ears or
// tails, Affe and Gabbe with their accordion and congas; a couple of rounds, a pause, again. The
// first visit of a session Stig asks whether he must ("Måste man gå på den?") and Majsan answers;
// each visit the porter steps out onto the deck and shakes his head. A gap in the ring is marked on
// the water: E there and Stig steps in (stiff as a stick, in his suit) and hops with Space. Eight
// hops in a row on the ring's beat: the ring cheers, Ole's "Heia Norge!" and once a visit a coin from
// Lasse; off the beat the ring laughs, kindly. The beat is the music's own clock (audio.tradAt; with
// the music off the audio clock still, and with no running audio the game's). Only on the island with `missions.state === 'idle'`, after the
// end (julafton's unlock) and in daytime hours: out of it everyone ours is back home at once, so no
// mission, timer or calibration pool sees it. Config: POOL_FEST (content/island.js).
// Owned by Game as `fest`; main.js hands it Space while Stig is in the ring (`hop`), asks who is
// `posed` and whether he is `joined`, and calls `update` once a frame.

import { POOL_FEST } from '../content/index.js';
import { lm } from '../world/layout.js';
import { groundAt, waterAt } from '../world/collision.js';
import { THREE, scene } from '../gfx.js';
import { audio, tradInfo } from '../audio.js';
import { fmt } from '../strings.js';
import { fx } from './fx.js';
import { hud } from './hud.js';
import { clamp, dist, yawTo, dampAngle, TAU } from '../util.js';

const MARK = 'poolFest';   // npc.spot while a dancer or the porter is ours (a placement by anyone else clears it)
const toward = (v, w, k) => (w > v ? Math.min(w, v + k) : Math.max(w, v - k));

export class PoolFest {
  constructor(game, cfg = POOL_FEST) {
    this.g = game;
    this.cfg = cfg;
    this.info = tradInfo(cfg.tune);   // { bpm, beats }: 32 beats of Små grodorna
    this.visit = false;
    this.held = {};          // key -> { spot, goal: 'ring' | 'home', x, z, yaw, at, up, laugh, steer } while ours
    this.phase = null;       // null | 'form' | 'wait' | 'round' | 'gap' | 'pause' (during a visit)
    this.phaseT = 0;
    this.round = null;       // { n, t0, game, t, vol } while a round plays and in the gap after it (t: seconds since its beat 0)
    this.nextAt = null;      // the next round's beat 0 in the gap between two rounds of a set
    this.joined = false;
    this.streak = 0;         // hops on the beat in a row
    this.hit = new Set();    // the round's hop beats he hit
    this.passed = -2;        // the round's last hop beat whose window has closed
    this.early0 = false;     // the next round's beat 0 hit early, in the gap
    this.asked = false;      // the session's exchange at the edge
    this.portered = false;   // the porter came out this visit
    this.porterT = -Infinity;
    this.porterO = null;     // { spot, goal: 'out' | 'home', x, z, t, said } while he is ours
    this.paid = false;       // Lasse's coin this visit
    this.cheerT = 0;
    this.laughT = -Infinity;
    this.laughUntil = 0;
    this.lines = [];         // [{ at, who, text }] still to say (g.time)
    this.said = new Map();   // text -> g.time it was last said
    this.wet = new Set();    // characters with `wade` > 0, eased back out when let go
    this.stats = { hits: 0, misses: 0, breaks: 0, goals: 0, rounds: 0 };
    this.last = null;        // tests: the last hop { k, off, ok, round } or { kind }
    this.buildMarks();
    const self = this;
    game.addInteractable({
      id: 'poolFest', r: cfg.join.r,
      pos: () => (self.joined || self.canJoin() ? self.gap : null),
      get prompt() { return self.joined ? self.cfg.join.leave : self.cfg.join.prompt; },
      use: () => { if (self.joined) self.leave(true); else self.join(); },
    });
  }

  get centre() { return lm(this.cfg.at); }
  get beat() { return 60 / this.info.bpm; }
  get leader() { return this.cfg.leader; }
  get keys() { return [this.cfg.leader, ...this.cfg.ring]; }
  get active() {
    const g = this.g, c = this.cfg;
    return g.level === 'island' && g.missions.state === 'idle' && g.missions.index >= c.fromIndex && g.unlocked.has(c.after);
  }
  get inHours() { const h = this.g.day?.h ?? 15, [a, b] = this.cfg.hours; return h >= a && h < b; }
  // The ring has formed (everyone ours in place, or the wait is over): Stig may step in.
  get formed() { return this.visit && this.phase !== null && this.phase !== 'form'; }
  // main.js syncAll: a dancer or the porter of ours neither waves, turns to him by the 10 m rule nor
  // chatters; honk.free and the diving judges read it too.
  posed(key) { return (!!this.held[key] || (key === this.cfg.porter.who && !!this.porterO)) && this.g.npc(key)?.spot === MARK; }

  // Place i of the ring (0 = Stig's gap, then clockwise seen from above): { x, z, yaw } facing the
  // middle.
  slot(i) {
    const c = this.centre, n = this.cfg.ring.length + 1, a = this.cfg.gapYaw + (i * TAU) / n;
    return { x: c.x + Math.sin(a) * this.cfg.r, z: c.z + Math.cos(a) * this.cfg.r, yaw: a + Math.PI };
  }
  get gap() { const s = this.slot(0); return { x: s.x, z: s.z, y: this.waterY }; }
  // Where E takes him out: `join.out` m behind the gap, on the coping.
  get outSpot() {
    const c = this.centre, a = this.cfg.gapYaw, R = this.cfg.r + this.cfg.join.out;
    return { x: c.x + Math.sin(a) * R, z: c.z + Math.cos(a) * R, yaw: a + Math.PI };
  }
  get waterY() { if (this._wy == null) { const c = this.centre; this._wy = groundAt(c.x, c.z, 0.2, 0.6); } return this._wy; }
  onDeck(x, z, m = 0) {
    const c = this.centre, d = this.cfg.deck;
    return x >= c.x + d.x[0] - m && x <= c.x + d.x[1] + m && z >= c.z + d.z[0] - m && z <= c.z + d.z[1] + m;
  }

  // ---- the marks on the water ----------------------------------------------------------------
  // A yellow ring on the water at Stig's gap, and a ring of foam round everyone wading (one shared
  // geometry and material), swelling as a hop lands.
  buildMarks() {
    const flat = (g) => g.rotateX(-Math.PI / 2);
    const foamGeo = flat(new THREE.RingGeometry(0.4, 0.55, 28));
    this.foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
    this.foam = new Map();   // character -> { mesh, pulse }
    this.foamGeo = foamGeo;
    const gm = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xf7c31b, transparent: true, opacity: 0.85, depthWrite: false });
    gm.add(new THREE.Mesh(flat(new THREE.RingGeometry(0.5, 0.64, 36)), mat));
    gm.add(new THREE.Mesh(flat(new THREE.RingGeometry(0.2, 0.27, 24)), mat));
    gm.visible = false;
    scene.add(gm);
    this.gapMark = gm;
  }
  foamOf(ch) {
    let f = this.foam.get(ch);
    if (!f) {
      const mesh = new THREE.Mesh(this.foamGeo, this.foamMat);
      mesh.visible = false;
      scene.add(mesh);
      f = { mesh, pulse: 0 };
      this.foam.set(ch, f);
    }
    return f;
  }
  tickMarks(dt) {
    const y = this.waterY + 0.075;   // over the pool's water, lane line and glints (CURB + 0.04 to 0.06)
    for (const [ch, f] of this.foam) {
      f.pulse = Math.max(0, f.pulse - dt * 2.2);
      const on = ch.wade > 0.2 && ch.state === 'normal' && ch.root.visible;
      f.mesh.visible = on;
      if (!on) continue;
      f.mesh.position.set(ch.x, y, ch.z);
      f.mesh.scale.setScalar(1 + f.pulse * 0.9);
    }
    const show = this.canJoin();
    this.gapMark.visible = show;
    if (show) {
      const s = this.gap;
      this.gapMark.position.set(s.x, y + 0.005, s.z);
      this.gapMark.scale.setScalar(1 + Math.sin(this.g.time * 4) * 0.08);
    }
  }
  // A few small drops round a wader's waist as a hop lands (fx.splash throws them head-high).
  splash(x, z) {
    const y = this.waterY + 0.12;
    for (let k = 0; k < 4; k++) {
      const a = Math.random() * TAU, c = Math.cos(a), s = Math.sin(a);
      fx.spawn(x + c * 0.4, y, z + s * 0.4, k % 2 ? 0x9fdcff : 0xffffff, { vx: c * 1.2, vz: s * 1.2, vy: 1.6 + Math.random() * 1.2, s0: 0.3, s1: 0.06, life: 0.5, drag: 0.8, grav: 12 });
    }
  }
  // Waist-deep in the water: each wader eases to `wadeTo`; let go, back out.
  easeWade(dt) {
    for (const ch of this.wet) {
      ch.wade = toward(ch.wade, ch.wadeTo || 0, 1.4 * dt);
      if (!ch.wade && !ch.wadeTo) this.wet.delete(ch);
    }
  }
  setWade(ch, w) { ch.wadeTo = w; if (w) this.wet.add(ch); }

  // ---- whose they are ----------------------------------------------------------------------------
  free(key) {
    const g = this.g, n = g.npc(key);
    return !!n && n.state === 'normal' && n.root.visible && !n.car && !n.seatId && (!n.busy || n.spot === MARK)
      && !g.missions.idlePose(key) && !g.berraJob.posed(key) && !g.judges.posed(key) && !g.film.posed(key)
      && !g.glass?.wants(key);   // Majsan while Stig brings her an ice cream (§10.61)
  }
  canClaim(key) {
    const n = this.g.npc(key), c = this.centre;
    return !this.held[key] && this.free(key) && dist(n.x, n.z, c.x, c.z) < this.cfg.claimR;
  }
  claimable() { return this.keys.filter((k) => this.canClaim(k)); }
  claim(key) {
    const n = this.g.npc(key);
    const i = this.cfg.ring.indexOf(key);
    const q = i < 0 ? { ...this.centre } : this.slot(i + 1);
    const o = this.held[key] = { spot: n.spot === MARK ? null : n.spot, goal: 'ring', x: q.x, z: q.z, yaw: q.yaw ?? this.cfg.gapYaw, at: false, up: false };
    n.busy = true;
    n.spot = MARK;
    n.steer = o.steer = () => this.steer(n, o, this.cfg.walk);
    n.invulnerable = true;   // a car in the pool pushes them aside, never bowls them over
    this.foamOf(n);
  }
  // Where he or she lives (a HOMES spot, or an unlock's override), or null.
  homeOf(key) {
    const g = this.g;
    let home = g.levelDef.homes(g)[key] ?? null;
    if (key in g.homeOverrides) home = g.homeOverrides[key];
    return home && !home.seat ? home : null;
  }
  // The dance and the wade off (a dancer out of the ring).
  still(n) {
    n.anim.groda = false;
    n.anim.hop = 0;
    n.anim.cheer = false;
    n.anim.laugh = false;
    this.setWade(n, 0);
  }
  // Back home on foot (the visit is over).
  sendHome(key) {
    const o = this.held[key], home = this.homeOf(key), n = this.g.npc(key);
    if (!o) return;
    this.still(n);
    if (!home) { this.release(key); return; }
    const q = this.g.lmOffset(home[0], home[1], home[2]);
    Object.assign(o, { goal: 'home', x: q.x, z: q.z });
  }
  // Ours no more: free for placeNpcs again (its spot id back), or at home at once (`teleport`).
  release(key, teleport = false) {
    const g = this.g, n = g.npc(key), o = this.held[key];
    if (!o) return;
    delete this.held[key];
    this.letGo(n, o);
    if (n.spot !== MARK) return;   // someone else placed him meanwhile
    const home = teleport ? this.homeOf(key) : null;
    if (home) { g.placeNpc(key, home[0], home[1], home[2], home[3]); n.wade = n.wadeTo = 0; }
    n.busy = false;
    n.spot = teleport ? null : o.spot;
  }
  // Our walk off (not one someone else gave him since), the dance and the wade off.
  letGo(n, o) {
    if (n.steer === o.steer) delete n.steer;
    n.invulnerable = false;
    this.still(n);
  }
  // Taken by someone else (the judges, the nap, a forced placement): ours no more, where he is.
  drop(key) {
    const n = this.g.npc(key), o = this.held[key];
    delete this.held[key];
    this.letGo(n, o);
  }
  // An NPC's walk (main.js fixedStep reads `npc.steer(h)`): to o's x, z at `walk` m/s, easing in.
  steer(n, o, walk) {
    if (!o || n.state !== 'normal') return null;
    const dx = o.x - n.x, dz = o.z - n.z, d = Math.hypot(dx, dz);
    if (d < 0.2) return null;
    const sp = Math.min(walk, 0.6 + d * 1.5);
    return { x: (dx / d) * sp, z: (dz / d) * sp };
  }

  // ---- visits --------------------------------------------------------------------------------------
  begin() {
    this.visit = true;
    this.portered = false;
    this.paid = false;
    this.streak = 0;
    this.lines.length = 0;
    this.setPhase('form');
    for (const k of this.claimable()) this.claim(k);
    this.last = { kind: 'begin', held: Object.keys(this.held) };
  }
  // Stig gone from the deck, or the hours over: everyone walks home.
  end() {
    this.visit = false;
    this.setPhase(null);
    this.round = null;
    this.nextAt = null;
    this.lines.length = 0;
    if (this.joined) this.leave(false);
    for (const key of Object.keys(this.held)) this.sendHome(key);
    if (this.porterO) this.porterHome();
    this.cheerT = 0;
    hud.setTakt(null);
    this.last = { kind: 'end' };
  }
  // Out of free roam (a mission starts, the level changes): everyone ours home at once.
  reset() {
    if (this.joined) this.leave(false);
    for (const key of Object.keys(this.held)) this.release(key, true);
    if (this.porterO) this.releasePorter(true);
    this.visit = false;
    this.setPhase(null);
    this.round = null;
    this.nextAt = null;
    this.lines.length = 0;
    this.cheerT = 0;
    hud.setTakt(null);
  }
  setPhase(p) { this.phase = p; this.phaseT = 0; }

  // ---- the frame -----------------------------------------------------------------------------------
  update(dt) {
    const g = this.g, c = this.cfg;
    this.easeWade(dt);
    if (!this.active) {
      if (this.visit || this.porterO || Object.keys(this.held).length || this.joined) this.reset();
      this.tickMarks(dt);
      return;
    }
    const f = g.focus();
    if (!this.visit) {
      if (this.inHours && !g.inDialog && !g.day?.busy && this.onDeck(f.x, f.z) && this.claimable().length >= c.minDancers) this.begin();
    } else if (!this.inHours || !this.onDeck(f.x, f.z, c.margin)) this.end();
    if (this.visit) {
      for (const k of this.claimable()) this.claim(k);   // back from the judges or the nap
      this.tick(dt);
    }
    this.sayDue();
    this.tickHeld(dt);
    this.tickPorter(dt);
    this.tickJoined();
    this.tickMarks(dt);
  }

  // The fest's clock: the audio clock while it runs, else the game's (a round keeps the one it began
  // on, re-anchored if the audio stops under it, the next round's beat 0 in a gap with it).
  now(r = this.round) {
    const a = audio.clock();
    if (r && !r.game && a == null) {
      const shift = this.g.time - r.t - r.t0;
      r.game = true;
      r.t0 += shift;
      if (this.nextAt != null) this.nextAt += shift;
    }
    return r ? (r.game ? this.g.time : a) : (a ?? this.g.time);
  }
  // The ring's hop at time t of the round (seconds since its beat 0), in metres.
  hopAt(t) {
    const c = this.cfg.hop, b = t / this.beat;
    if (t < 0 || b >= this.info.beats) return 0;
    const cyc = (b % 2) / 2;
    if (cyc >= c.air) return 0;
    const u = cyc / c.air;
    return (b >= c.chorusFrom ? c.chorus : c.h) * 4 * u * (1 - u);
  }
  // The routine by beat: hands behind ("svansar") on beats 0–7 and 12–15, as ears otherwise.
  armsAt(t) { const b = t / this.beat; return (b < 8 || (b >= 12 && b < 16)) ? 2 : 1; }

  tick(dt) {
    const g = this.g, c = this.cfg, beat = this.beat, B = this.info.beats;
    this.phaseT += dt;
    if (this.cheerT > 0) this.cheerT -= dt;
    switch (this.phase) {
      case 'form': {
        const ring = Object.values(this.held).filter((o) => o.goal === 'ring');
        if ((ring.length >= c.minDancers && ring.every((o) => o.at)) || this.phaseT >= c.formSecs) this.setPhase('wait');
        break;
      }
      case 'wait':
        if (this.phaseT >= c.startSecs) this.startRound(1);
        break;
      case 'round': {
        const r = this.round;
        r.t = this.now() - r.t0;
        this.judgePassed();
        if (r.t >= B * beat) {
          if (r.n < c.rounds) { this.nextAt = r.t0 + (B + c.gapBeats) * beat; this.setPhase('gap'); }
          else { this.round = null; this.setPhase('pause'); this.setStreak(0); }
        }
        break;
      }
      case 'gap':
        if (this.now() >= this.nextAt - 0.12) this.startRound(this.round.n + 1);
        break;
      case 'pause':
        if (this.phaseT >= c.pauseSecs) this.startRound(1);
        break;
    }
    // The first visit of a session: the exchange at the edge, once Stig stands near the ring.
    const p = g.player, gp = this.gap;
    if (!this.asked && this.formed && !this.joined && !g.playerCar && !g.inDialog && p.state === 'normal'
      && dist(p.x, p.z, gp.x, gp.z) < c.askR && this.held.majsan?.at) {
      this.asked = true;
      for (const [d, who, text] of c.ask) this.lines.push({ at: g.time + d, who, text });
    }
  }

  // A round of the tune: its level by the distance to Stig, its beat 0 on the audio clock (the
  // game's with no running audio; with the music off a silent round from now + 0.12 s).
  startRound(n) {
    const g = this.g, c = this.cfg, f = g.focus(), m = this.centre, v = c.vol;
    const vol = clamp(1 - (dist(f.x, f.z, m.x, m.z) - v.near) / (v.far - v.near), v.min, 1);
    const len = audio.trad(c.tune, { vol, duck: 1 - 0.7 * vol });
    const a = audio.clock();
    this.round = len > 0 && a != null ? { n, t0: audio.tradAt, game: false, t: a - audio.tradAt, vol }
      : { n, t0: (a ?? g.time) + 0.12, game: a == null, t: -0.12, vol };
    this.nextAt = null;
    this.hit.clear();
    this.passed = -2;
    if (this.early0) { this.hit.add(0); this.early0 = false; }
    this.stats.rounds++;
    this.setPhase('round');
    if (n === 1 && !this.portered) this.callPorter();
  }

  // Every hop beat whose window has closed without his hop breaks a row (only in the ring).
  judgePassed() {
    const r = this.round, beat = this.beat, last = this.info.beats - 2;
    while (this.passed + 2 <= last && (this.passed + 2) * beat + this.cfg.window < r.t) {
      this.passed += 2;
      if (this.joined && !this.hit.has(this.passed) && this.streak > 0) { this.stats.breaks++; this.setStreak(0); }
    }
  }

  // ---- the dancers ---------------------------------------------------------------------------------
  tickHeld(dt) {
    const g = this.g, c = this.cfg, p = g.player, r = this.phase === 'round' ? this.round : null;
    const t = r ? r.t : null, y = r ? this.hopAt(t) : 0, arms = r ? this.armsAt(t) : 1;
    const cheer = this.cheerT > 0, laughing = g.time < this.laughUntil;
    const near = dist(p.x, p.z, this.centre.x, this.centre.z) < 60;
    for (const key of Object.keys(this.held)) {
      const n = g.npc(key), o = this.held[key];
      if (n.spot !== MARK || n.state === 'hidden') { this.drop(key); continue; }   // placed by someone else
      const d = dist(n.x, n.z, o.x, o.z);
      if (o.goal === 'home') {
        if (d < 0.3 || (dist(p.x, p.z, n.x, n.z) > 60 && dist(p.x, p.z, o.x, o.z) > 60)) this.release(key, d >= 0.3);
        continue;
      }
      if (n.state !== 'normal') continue;
      this.setWade(n, waterAt(n.x, n.z, n.y) ? c.wade : 0);
      o.at = d < 0.35 && Math.hypot(n.vx, n.vz) < 0.4;
      if (!o.at) { n.anim.groda = false; n.anim.hop = 0; n.anim.cheer = false; continue; }
      // Facing: the ring faces the middle; Lasse turns once round in a round (from Stig's gap), and
      // between the rounds faces Stig (near) or the gap.
      let want = o.yaw;
      if (key === this.leader) {
        want = r ? c.gapYaw + (Math.max(0, t) / (this.info.beats * this.beat)) * TAU
          : dist(p.x, p.z, n.x, n.z) < 20 ? yawTo(p.x - n.x, p.z - n.z) : c.gapYaw;
      }
      n.yaw = dampAngle(n.yaw, want, key === this.leader && r ? 12 : 5, dt);
      const music = c.musicians.includes(key);
      n.anim.cheer = cheer;
      n.anim.groda = !cheer && r && t >= 0 && !music ? arms : false;
      n.anim.hop = cheer ? 0 : y;
      n.anim.laugh = laughing && !!o.laugh;
      // A landing: the foam swells and a little water flies.
      const up = y > 0;
      if (o.up && !up) {
        this.foamOf(n).pulse = 1;
        if (near && n.wade > 0.2) this.splash(n.x, n.z);
      }
      o.up = up;
    }
  }

  // ---- Stig in the ring ----------------------------------------------------------------------------
  canJoin() {
    const g = this.g, p = g.player;
    return this.formed && !this.joined && p.state === 'normal' && p.onGround && !g.playerCar && !g.carrying
      && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !g.inDialog;
  }
  // E at the gap: he steps into it, waist-deep, facing the middle, the camera behind him and turned
  // `join.camTurn` off his back (straight behind, his head hid Lasse in the middle).
  join() {
    if (!this.canJoin()) return;
    const g = this.g, p = g.player, s = this.slot(0);
    p.teleport(s.x, s.z, s.yaw);
    g.cam.yaw = s.yaw + this.cfg.join.camTurn;
    g.cam.snapNext = true;
    this.joined = true;
    this.hopped = false;   // his first hop brings his line
    this.inAir = false;
    this.asked = true;     // no "must one?" once he is in
    this.setWade(p, this.cfg.wade);
    p.anim.groda = 3;
    this.foamOf(p);
    this.setStreak(0);
    this.last = { kind: 'join' };
  }
  // E again (`step`: back up onto the coping behind the gap), a step away, or the visit's end.
  leave(step) {
    const g = this.g, p = g.player;
    this.joined = false;
    p.anim.groda = false;
    this.setWade(p, 0);
    if (step) {
      const o = this.outSpot;
      p.teleport(o.x, o.z, o.yaw);
      p.wade = 0;
      g.cam.yaw = o.yaw;
      g.cam.snapNext = true;
    }
    hud.setTakt(null);
    this.last = { kind: 'leave', step: !!step };
  }
  tickJoined() {
    if (!this.joined) return;
    const g = this.g, p = g.player, inp = g.input;
    if (!this.visit || p.state !== 'normal' || g.playerCar || g.carrying || g.frozenT > 0 || g.shame.panicT > 0) { this.leave(false); return; }
    if (Math.hypot(inp.moveX(), inp.moveY()) > 0.5) { this.leave(false); return; }
    const s = this.slot(0);
    if (dist(p.x, p.z, s.x, s.z) > 1.2) { this.leave(false); return; }   // R, a teleport, a shove
    p.yaw = s.yaw;
    p.anim.groda = 3;
    // His landing swells his foam and splashes, as the ring's do.
    if (this.inAir && p.onGround) { this.foamOf(p).pulse = 1; this.splash(p.x, p.z); }
    this.inAir = !p.onGround;
  }
  // Space in the ring (main.js handleOneShots): a hop, judged against the ring's hop beats.
  hop() {
    const g = this.g, p = g.player, c = this.cfg, beat = this.beat;
    if (!this.joined || !p.onGround || p.state !== 'normal') return;
    p.jump(c.join.hopV);
    g.jumps = 2;   // no double jump in the ring
    audio.jump();
    if (!this.hopped) { this.hopped = true; this.sayOnce('stig', c.join.line, 25); }
    let k = null, off = null;
    if (this.phase === 'round') {
      const t = this.now() - this.round.t0;
      k = clamp(2 * Math.round(t / (2 * beat)), 0, this.info.beats - 2);
      off = t - k * beat;
    } else if (this.phase === 'gap') {
      // Early for the next round's beat 0, or late for this one's last hop.
      const t = this.now(), toNext = t - this.nextAt, back = t - (this.round.t0 + (this.info.beats - 2) * beat);
      if (Math.abs(toNext) <= Math.abs(back)) { k = 'next'; off = toNext; } else { k = this.info.beats - 2; off = back; }
    } else {
      this.last = { k: null, off: null, ok: null, round: null };
      return;   // no music: just a hop
    }
    const ok = Math.abs(off) <= c.window && (k === 'next' ? !this.early0 : !this.hit.has(k));
    this.last = { k, off: +off.toFixed(3), ok, round: this.round?.n ?? null };
    if (ok) {
      if (k === 'next') this.early0 = true; else this.hit.add(k);
      this.stats.hits++;
      this.setStreak(this.streak + 1);
      if (this.streak >= c.goal) this.goal();
    } else {
      this.stats.misses++;
      this.setStreak(0, 'miss');
      this.laugh();
    }
  }
  setStreak(n, flash = '') {
    this.streak = n;
    if (this.joined) hud.setTakt(flash === 'miss' ? this.cfg.miss : `${this.cfg.takt} ${n} / ${this.cfg.goal}`, flash);
  }
  // Eight in a row: the ring cheers, Ole shouts, and once a visit Lasse gives him a coin.
  goal() {
    const g = this.g, c = this.cfg, t = g.time;
    this.stats.goals++;
    hud.setTakt(`${c.takt} ${c.goal} / ${c.goal}`, 'goal');
    this.streak = 0;
    this.cheerT = c.cheerSecs;
    audio.applause(2);
    if (this.held.ole?.at) this.lines.push({ at: t + 0.3, who: c.cheer[0], text: c.cheer[1] });
    let paid = false;
    if (!this.paid && this.held[this.leader]?.at) {
      this.paid = paid = true;
      g.addCoins(c.pay);
      hud.toast(fmt(c.payToast, { n: c.pay }));
      this.lines.push({ at: t + 1.5, who: this.leader, text: c.payLine });
    }
    this.last = { kind: 'goal', paid };
  }
  // Off the beat: the two nearest in the ring laugh (kindly), at most every `laughEvery` s.
  laugh() {
    const g = this.g, c = this.cfg, p = g.player;
    if (g.time - this.laughT < c.laughEvery) return;
    this.laughT = g.time;
    this.laughUntil = g.time + c.laughSecs;
    const ring = Object.keys(this.held).filter((k) => this.held[k].goal === 'ring' && this.held[k].at && k !== this.leader);
    ring.sort((a, b) => dist(g.npc(a).x, g.npc(a).z, p.x, p.z) - dist(g.npc(b).x, g.npc(b).z, p.x, p.z));
    for (const k of Object.keys(this.held)) this.held[k].laugh = ring.indexOf(k) >= 0 && ring.indexOf(k) < 2;
    audio.laugh();
  }

  // ---- the porter ----------------------------------------------------------------------------------
  // At the first round of a visit (at most every 60 s) he steps out onto the deck, says his line and
  // shakes his head, then goes back to his desk.
  callPorter() {
    const g = this.g, pc = this.cfg.porter, n = g.npc(pc.who), c = this.centre;
    this.portered = true;
    if (!n || this.porterO || g.time - this.porterT < 60 || !this.free(pc.who) || dist(n.x, n.z, c.x, c.z) > this.cfg.claimR) return;
    this.porterT = g.time;
    const o = this.porterO = { spot: n.spot === MARK ? null : n.spot, goal: 'out', x: c.x + pc.at[0], z: c.z + pc.at[1], t: 0, said: false };
    n.busy = true;
    n.spot = MARK;
    n.steer = o.steer = () => this.steer(n, o, pc.walk);
    n.invulnerable = true;
  }
  porterHome() {
    const o = this.porterO, home = this.homeOf(this.cfg.porter.who);
    if (!o) return;
    this.g.npc(this.cfg.porter.who).anim.look = 0;
    if (!home) { this.releasePorter(false); return; }
    const q = this.g.lmOffset(home[0], home[1], home[2]);
    Object.assign(o, { goal: 'home', x: q.x, z: q.z });
  }
  releasePorter(teleport) {
    const g = this.g, key = this.cfg.porter.who, n = g.npc(key), o = this.porterO;
    this.porterO = null;
    if (n.steer === o.steer) delete n.steer;
    n.invulnerable = false;
    n.anim.look = 0;
    if (n.spot !== MARK) return;
    const home = teleport ? this.homeOf(key) : null;
    if (home) g.placeNpc(key, home[0], home[1], home[2], home[3]);
    n.busy = false;
    n.spot = teleport ? null : o.spot;
  }
  tickPorter(dt) {
    const o = this.porterO;
    if (!o) return;
    const g = this.g, pc = this.cfg.porter, n = g.npc(pc.who), p = g.player, c = this.centre;
    if (n.spot !== MARK || n.state === 'hidden') { this.porterO = null; if (n.steer === o.steer) delete n.steer; n.invulnerable = false; n.anim.look = 0; return; }
    const d = dist(n.x, n.z, o.x, o.z);
    if (o.goal === 'home') {
      if (d < 0.3 || (dist(p.x, p.z, n.x, n.z) > 60 && dist(p.x, p.z, o.x, o.z) > 60)) this.releasePorter(d >= 0.3);
      return;
    }
    if (d > 0.35 || n.state !== 'normal') return;
    o.t += dt;
    n.yaw = dampAngle(n.yaw, yawTo(c.x - n.x, c.z - n.z), 5, dt);
    if (!o.said && o.t > 0.4) { o.said = true; this.sayOnce(pc.who, pc.line, this.cfg.again); }
    n.anim.look = o.said && o.t < 0.4 + pc.shakeSecs ? Math.sin(o.t * 11) * 0.42 : 0;
    if (o.t >= pc.stay) this.porterHome();
  }

  // ---- lines ---------------------------------------------------------------------------------------
  sayOnce(who, text, again = this.cfg.again) {
    const g = this.g, t = this.said.get(text);
    if (t != null && g.time - t < again) return false;
    const n = g.npc(who);
    if (!n || n.state === 'hidden') return false;
    this.said.set(text, g.time);
    g.say(n, text, 2.6);
    if (n !== g.player) n.chatT = 8 + Math.random() * 4;
    return true;
  }
  // In a scene they wait, and are dropped when 2 s late.
  sayDue() {
    if (!this.lines.length || this.g.inDialog) return;
    const g = this.g, due = this.lines.filter((l) => l.at <= g.time);
    this.lines = this.lines.filter((l) => l.at > g.time);
    for (const l of due) if (g.time - l.at < 2) this.sayOnce(l.who, l.text);
  }
}
