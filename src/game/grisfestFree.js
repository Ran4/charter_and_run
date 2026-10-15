// Grisfest varje torsdag – 800 pesetas (free roam; feature 21, DESIGN §10.18). After the grisfest the
// farm's host stands at his post inside the gate: "Här är det alltid torsdag, señor." For exactly the
// film's 800 pesetas (Ole does not pay here) a black fade turns the island to a Thursday evening: the
// clock held at night, the vals, a band on the stage, the gang and some tourists dancing under the
// bulbs, Herr Storch filming, Fru Storch at the long table asking for Swedish coffee, the host going
// round with the sangria. Stig tries Ole's line on a dancing tourist, she turns her back, and Majsan
// asks him instead (the film's warmest scene, not turned round). The evening lasts until Stig leaves
// the walled farm; then the morning after, everyone home. Only on the island with no mission running
// (`missions.state === 'idle'`); a mission start or the other level ends it at once, so no mission,
// timer or calibration pool sees it. Config: GRISFEST_FREE (content/island.js). Owned by Game as
// `party`: main.js calls `update` once a frame and `step` in its fixed step, adds `extras` (the band
// and the tourists) to the people, and asks `posed(key)` in syncAll; honk.free asks it too, so the
// other free-roam modules leave the evening's cast be.

import { GRISFEST_FREE } from '../content/index.js';
import { scene } from '../gfx.js';
import { Character } from '../actors/character.js';
import { randomPed } from '../actors/models.js';
import { lm } from '../world/layout.js';
import { groundAt } from '../world/collision.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt, pta } from '../strings.js';
import { dist, yawTo, dampAngle, mulberry32 } from '../util.js';

const MARK = 'grisfestFree';   // npc.spot while one of the cast is ours (a placement by anyone else clears it)
const rnd = ([a, b]) => a + Math.random() * (b - a);

export class GrisfestFree {
  constructor(game, cfg = GRISFEST_FREE) {
    this.g = game;
    this.cfg = cfg;
    this.on = false;         // the evening: from the pay to the morning after
    this.busy = false;       // a fade or the invitation is playing
    this.gen = 0;            // bumped by reset: a fade or a scene from before it stops
    this.held = {};          // key -> { spot, x, z, yaw, dance, film, face?, steer }: the cast we hold (MARK)
    this.extras = [];        // the band and the tourists (Characters) while the evening is on
    this.cast = null;        // [{ ch, x, z, yaw, dance, sing, solo, stage, away }] built at the first evening
    this.round = null;       // the host's walk: { i, dir, waitT }
    this.lines = [];         // [{ at, who, text }] still to say (g.time)
    this.greeted = false;    // the gate exchange this approach
    this.invited = false;    // Majsan has asked him this evening
    this.coffee = false;     // Fru Storch's question this evening
    this.dancing = false;    // we set Stig's dance flag
    this.oleWas = undefined; // Ole's outfit before his grisfest shirt (while he is at the evening)
    this.nextT = {};         // the host's and Ole's next lines (g.time)
    this.last = null;        // for tests: the last event { kind, ... }
    const self = this;
    game.addInteractable({
      id: 'grisfest:pay', r: cfg.pay.r,
      get prompt() { return fmt(self.cfg.pay.prompt, { n: pta(self.cfg.fee) }); },
      pos: () => (this.canPay() ? this.hostNpc : null),
      use: () => this.pay(),
    });
    game.addInteractable({
      id: 'grisfest:ask', r: cfg.ask.r, prompt: cfg.ask.prompt,
      pos: () => this.askable()?.ch ?? null,
      use: () => { const t = this.askable(); if (t) this.invite(t); },
    });
  }

  get hostNpc() { return this.g.npc(this.cfg.host); }
  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get open() { return this.live && this.g.missions.index >= this.cfg.fromIndex; }
  posed(key) { return !!this.held[key] && this.g.npc(key)?.spot === MARK; }
  at(a) { return this.g.lmOffset(this.cfg.at, a[0], a[1]); }

  // Free to take: shown, standing, nobody's (not placed or held by a mission, another free-roam
  // module or a scene), not the waiting mission's giver or extra.
  free(key) {
    const g = this.g, n = g.npc(key), cur = g.missions.current;
    if (!n || n.state !== 'normal' || !n.root.visible || n.car || n.seatId || n.busy || !g.honk.free(key)) return false;
    return !(cur && cur.level === 'island' && (cur.giver === key || cur.extra?.some((e) => e === key || (Array.isArray(e) && e[0] === key))));
  }
  homeOf(key) {
    const g = this.g;
    let home = g.levelDef.homes(g)[key] ?? null;
    if (key in g.homeOverrides) home = g.homeOverrides[key];
    return home && !home.seat ? home : null;
  }
  // Inside the farm's walled square (with `m` m to spare), in the floor's axes.
  inFarm(x, z, m = 0) {
    const c = lm(this.cfg.at), w = this.cfg.walls + m;
    return Math.abs(x - c.x) <= w && Math.abs(z - c.z) <= w;
  }

  // ---------------------------------------------------------------------------------------------
  // The gate

  // The host at his post (his home, standing, free) and Stig on foot by him, no evening on.
  hostAtPost() {
    const n = this.hostNpc, h = this.homeOf(this.cfg.host);
    if (!h || !this.free(this.cfg.host)) return false;
    const q = this.g.lmOffset(h[0], h[1], h[2]);
    return dist(n.x, n.z, q.x, q.z) < 2.5;
  }
  canPay() {
    const g = this.g;
    return this.open && !this.on && !this.busy && !g.inDialog && !g.playerCar && !g.carrying && !g.shame.pursuit && g.player.state === 'normal' && this.hostAtPost();
  }
  gate() {
    const g = this.g, c = this.cfg, p = g.player, n = this.hostNpc;
    if (!n) return;
    const d = dist(p.x, p.z, n.x, n.z);
    if (d > c.greetAgainR) this.greeted = false;
    if (this.greeted || d > c.greetR || g.playerCar || g.inDialog || p.state !== 'normal' || !this.hostAtPost()) return;
    this.greeted = true;
    for (const [t, who, text] of c.greet) this.lines.push({ at: g.time + t, who, text });
    n.chatT = Math.max(n.chatT ?? 0, 6);   // his sangria chatter not over his answer
    this.last = { kind: 'greet', t: g.time };
  }
  pay() {
    const g = this.g, c = this.cfg;
    if (!this.canPay()) return;
    if (g.coins < c.fee) {
      g.say(this.hostNpc, c.short, 2.6);
      this.hostNpc.chatT = Math.max(this.hostNpc.chatT ?? 0, 6);
      this.last = { kind: 'short', t: g.time, coins: g.coins };
      return;
    }
    g.addCoins(-c.fee);
    audio.coin();
    this.last = { kind: 'paid', t: g.time, coins: g.coins };
    this.begin();
  }

  // ---------------------------------------------------------------------------------------------
  // The evening

  async begin() {
    const g = this.g, c = this.cfg, p = g.player, day = g.day, gen = this.gen;
    this.on = this.busy = true;
    this.lines.length = 0;
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    day.over = true;
    hud.fade(true);
    await g.wait(c.fadeSecs);
    if (gen !== this.gen) return;
    hud.showBanner(c.inBanner[0], c.inBanner[1], 'mission', 0);
    const from = day.h, to = from >= c.hour || from < c.nightTill ? from : c.hour;
    day.hold = true;
    this.setUp();
    if (to !== from) await day.spin(from, to); else await g.wait(day.cfg.spinSecs);
    if (gen !== this.gen) return;
    day.set(to);
    day.write();
    await g.wait(c.holdSecs);
    if (gen !== this.gen) return;
    hud.hideBanner();
    hud.fade(false);
    await g.wait(c.fadeSecs);
    if (gen !== this.gen) return;
    day.over = false;
    g.inDialog = false;
    this.busy = false;
    this.last = { kind: 'evening', t: g.time, from, to, cast: Object.keys(this.held), extras: this.extras.length };
  }

  setUp() {
    const g = this.g, c = this.cfg, p = g.player, idx = g.missions.index;
    this.invited = this.coffee = false;
    for (const [key, s] of Object.entries(c.cast)) {
      if (key === 'ole' && idx < c.oleFrom) continue;
      if (this.free(key)) this.claim(key, s);
    }
    if (this.free(c.host)) {
      this.claim(c.host, { at: [...c.round[0], 0] });
      this.held[c.host].cup = true;
      this.round = { i: 0, dir: 1, waitT: c.hostWait };
    }
    if (this.held.ole) { this.oleWas = g.npcs.ole.outfit ?? null; g.setNpcOutfit('ole', 'gris'); }
    this.buildCast();
    for (const e of this.cast) {
      const q = this.at(e.at);
      e.x = q.x; e.z = q.z; e.yaw = e.at[2]; e.away = false; e.stuck = 0;
      const ch = e.ch;
      ch.state = 'normal';
      ch.teleport(q.x, q.z, e.yaw);
      if (e.stage) ch.y = groundAt(q.x, q.z, 1.2, 0.6);   // up on the bandstand (1.0), not the ground under it
      ch.root.visible = true;
    }
    this.extras = this.cast.map((e) => e.ch);
    // Stig on the gravel drive, facing the floor (a car of his on the drive is stepped round).
    const spots = [c.enter, ...c.enterAlt];
    const s = spots.find((a) => { const q = this.at(a); return g.spotFree(q.x, q.z); }) || c.enter;
    g.placeNpc('stig', c.at, s[0], s[1], c.enter[2]);
    g.cam.yaw = p.yaw;
    g.cam.snapNext = true;
    audio.setTune(c.tune);
    const now = g.time;
    this.nextT = { sangria: now + rnd(c.sangria.every) * 0.5, heia: now + rnd(c.heia.every) * 0.5 };
  }

  // The band and the tourists: made once, from seeded random pedestrians (the band local men with a
  // red sash, the tourists Swedish), kept out of the world until an evening.
  buildCast() {
    if (this.cast) return;
    const c = this.cfg;
    let seed = c.seed;
    const ped = (woman, local) => {
      for (;;) { const d = randomPed(mulberry32(seed++)); if (!!d.lashes === woman && !!d.local === local) return d; }
    };
    const make = (d, s, more) => {
      const ch = new Character(d);
      ch.root.visible = false;
      scene.add(ch.root);
      return { ch, at: s.at, dance: false, sing: false, solo: false, stage: false, ...more };
    };
    this.cast = [
      ...c.band.map((b) => {
        const d = ped(false, true);
        d.held = b.held;
        d.sash = c.bandSash;
        delete d.hat;
        return make(d, b, { stage: true, sing: !!b.sing });
      }),
      ...c.tourists.map((t) => {
        const d = ped(t.woman, false);
        delete d.held;
        return make(d, t, { dance: true, solo: !!t.solo });
      }),
    ];
  }

  claim(key, s) {
    const g = this.g, n = g.npc(key), spot = n.spot;
    g.placeNpc(key, this.cfg.at, s.at[0], s.at[1], s.at[2]);
    const q = this.at(s.at);
    const o = this.held[key] = { spot, x: q.x, z: q.z, yaw: s.at[2], dance: !!s.dance, film: !!s.film, face: null, cup: false };
    n.spot = MARK;
    n.steer = o.steer = () => this.steer(n, o, key === this.cfg.host ? this.cfg.hostWalk : this.cfg.walk);
  }
  steer(n, o, walk) {
    if (!o || n.state !== 'normal') return null;
    const dx = o.x - n.x, dz = o.z - n.z, d = Math.hypot(dx, dz);
    if (d < 0.25) return null;
    const sp = Math.min(walk, 0.5 + d * 1.5);
    return { x: (dx / d) * sp, z: (dz / d) * sp };
  }
  still(n) { n.anim.dance = n.anim.film = n.anim.cupHeld = false; }
  // Ours no more (someone else placed them, or the evening is over): home at once with `teleport`.
  release(key, teleport) {
    const g = this.g, n = g.npc(key), o = this.held[key];
    if (!o) return;
    delete this.held[key];
    if (n.steer === o.steer) delete n.steer;
    this.still(n);
    if (n.spot !== MARK) return;   // someone else placed them meanwhile
    const home = teleport ? this.homeOf(key) : null;
    if (home) g.placeNpc(key, home[0], home[1], home[2], home[3]);
    n.busy = false;
    n.spot = null;
  }

  // Stig out of the farm: the morning after.
  async leave() {
    const g = this.g, c = this.cfg, day = g.day, gen = this.gen;
    this.busy = true;
    g.inDialog = true;
    this.unDance();
    day.over = true;
    hud.fade(true);
    await g.wait(c.fadeSecs);
    if (gen !== this.gen) return;
    hud.showBanner(c.outBanner[0], c.outBanner[1], 'mission', 0);
    this.tearDown();
    const from = day.h;
    await day.spin(from, c.morning);
    if (gen !== this.gen) return;
    day.set(c.morning);
    day.write();
    day.hold = false;
    await g.wait(c.holdSecs);
    if (gen !== this.gen) return;
    hud.hideBanner();
    hud.fade(false);
    await g.wait(c.fadeSecs);
    if (gen !== this.gen) return;
    day.over = false;
    g.inDialog = false;
    this.busy = this.on = false;
    this.last = { kind: 'morning', t: g.time, from, to: day.h };
  }

  // Everyone home, the band and the tourists gone, Ole's shirt and the island's tune back.
  tearDown() {
    const g = this.g;
    for (const key of Object.keys(this.held)) this.release(key, true);
    for (const e of this.cast || []) { e.ch.root.visible = false; e.ch.state = 'hidden'; }
    this.extras = [];
    this.round = null;
    this.lines.length = 0;
    this.unDance();
    // Ole's shirt off again, unless someone else has dressed him since (a forced placement).
    if (this.oleWas !== undefined && g.npcs.ole?.outfit === 'gris') g.setNpcOutfit('ole', this.oleWas);
    this.oleWas = undefined;
    if (audio.tune === this.cfg.tune) audio.setTune(g.levelTune());
  }

  // Out of free roam (a mission starts, the level changes): all of it off at once, no fade. The
  // clock runs again; a mission start in the dark gets the clock's morning cut (§10.10).
  reset() {
    const g = this.g;
    this.gen++;
    const fading = this.busy;
    this.tearDown();
    g.day.hold = false;
    if (fading) {
      hud.fade(false);
      hud.hideBanner();
      g.day.over = false;
      // Not over a starting mission's own intro framing.
      if (g.missions.state === 'idle') { g.endCinematic(); g.inDialog = false; }
    }
    this.on = this.busy = false;
    this.greeted = false;
  }

  // ---------------------------------------------------------------------------------------------
  // The invitation

  // A solo tourist within reach, before Majsan has asked him.
  askable() {
    const g = this.g, p = g.player;
    if (!this.on || this.busy || this.invited || g.inDialog || g.playerCar || p.state !== 'normal' || !this.cast) return null;
    let best = null, bd = this.cfg.ask.r;
    for (const e of this.cast) {
      if (!e.solo || e.ch.state !== 'normal') continue;
      const d = dist(e.ch.x, e.ch.z, p.x, p.z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // E on a solo tourist: a side two-shot of the two; his line, she turns her back, his fear; Majsan
  // comes over, and in a cut the two stand on clear floor for her invitation and the dance.
  async invite(t) {
    const g = this.g, c = this.cfg, a = c.ask, p = g.player, gen = this.gen;
    const talk = async (lines) => { await g.dialog(lines); g.inDialog = true; };
    this.busy = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    p.yaw = yawTo(t.ch.x - p.x, t.ch.z - p.z);
    t.face = p;
    g.cinematic(t.ch, p);
    g.cam.snapNext = true;
    this.last = { kind: 'ask', t: g.time, step: 'line' };
    g.say(p, a.line, 2.0);
    await g.wait(a.turnAt);
    if (gen !== this.gen) return;
    // She turns her back on him and dances on.
    t.face = null;
    t.yaw = yawTo(t.ch.x - p.x, t.ch.z - p.z);
    t.away = true;
    this.last.step = 'away';
    await g.wait(a.scaredAt);
    if (gen !== this.gen) return;
    g.say(p, a.scared, 2.4);
    const M = this.posed('majsan') ? g.npc('majsan') : null, o = this.held.majsan;
    const pair = M ? this.pairSpot(p, M) : null;
    if (M) { o.x = pair.q.x; o.z = pair.q.z; }   // she comes over
    this.last.step = 'scared';
    await g.wait(a.comeSecs);
    if (gen !== this.gen) return;
    if (!M || !this.posed('majsan')) {
      this.last.step = 'alone';
      this.endScene();
      return;
    }
    // The cut: the two face to face on clear floor, the two-shot.
    const { s: S, q: Q } = pair;
    g.unsay(p);   // his fear is not stacked over her line
    p.teleport(S.x, S.z, yawTo(Q.x - S.x, Q.z - S.z));
    M.teleport(Q.x, Q.z, yawTo(S.x - Q.x, S.z - Q.z));
    g.cam.frame(M, p);
    g.cam.snapNext = true;
    this.last.step = 'invite';
    this.last.pair = pair;
    await talk(c.invite);
    if (gen !== this.gen) return;
    o.dance = true;
    p.anim.dance = this.dancing = true;
    const seen = this.posed('siv') ? [c.seen] : [];
    await talk([c.accept, ...seen]);
    if (gen !== this.gen) return;
    if (this.posed('ole')) { g.say(g.npc('ole'), c.heia.line, 2.2); audio.applause(2); this.nextT.heia = g.time + rnd(c.heia.every); }
    this.invited = true;
    this.last.step = 'dance';
    await g.wait(c.danceSecs);
    if (gen !== this.gen) return;
    this.last.step = 'done';
    this.endScene();
  }
  endScene() {
    const g = this.g;
    g.endCinematic();
    g.cam.yaw = g.player.yaw;
    g.cam.snapNext = true;
    this.busy = false;
  }
  // Where the two stand for her invitation: Stig within 2.4 m of where he is (S) and Majsan `frontR` m
  // from him (Q), both on his floor with a metre or more to anyone else, and the two-shot's line of
  // sight clear; nearer is better, and her side of him.
  pairSpot(p, M) {
    const g = this.g, r = this.cfg.ask.frontR, T = Math.PI / 6;
    const people = [...g.allChars(), ...this.extras].filter((ch) => ch !== p && ch !== M && ch.state !== 'hidden' && ch.root.visible && dist(ch.x, ch.z, p.x, p.z) < 14);
    const ok = (x, z) => g.spotFree(x, z, p.y) && Math.abs(groundAt(x, z, p.y, 0.45) - p.y) < 0.3;
    const clear = (x, z) => Math.min(3, ...people.map((ch) => dist(ch.x, ch.z, x, z)));
    const seg = (ax, az, bx, bz) => {
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      return Math.min(3, ...people.map((ch) => {
        const k = Math.max(0, Math.min(1, ((ch.x - ax) * dx + (ch.z - az) * dz) / L2));
        return dist(ch.x, ch.z, ax + dx * k, az + dz * k);
      }));
    };
    const toM = yawTo(M.x - p.x, M.z - p.z), cam = g.cam.pos;
    let best = null, bs = -Infinity;
    for (const R of [0, 0.8, 1.6, 2.4]) {
      for (let i = 0; i < (R ? 12 : 1); i++) {
        const sx = p.x + Math.sin(i * T) * R, sz = p.z + Math.cos(i * T) * R;
        if (!ok(sx, sz)) continue;
        const cs = clear(sx, sz);
        if (cs < 1) continue;
        for (let k = 0; k < 12; k++) {
          const a = toM + k * T, qx = sx + Math.sin(a) * r, qz = sz + Math.cos(a) * r;
          if (!ok(qx, qz)) continue;
          const cq = clear(qx, qz);
          if (cq < 1) continue;
          // The side camera.frame(M, p) takes (the one the eye is on), 4.5 m out from the middle.
          const mx = (sx + qx) / 2, mz = (sz + qz) / 2;
          let nx = Math.cos(a), nz = -Math.sin(a);
          if ((cam.x - mx) * nx + (cam.z - mz) * nz < 0) { nx = -nx; nz = -nz; }
          const side = seg(mx + nx * 4.5, mz + nz * 4.5, mx, mz);
          const sc = Math.min(cs, cq, 2) + 1.2 * Math.min(side, 1.6) - 0.35 * R + 0.2 * Math.cos(a - toM);
          if (sc > bs) { bs = sc; best = { s: { x: sx, z: sz }, q: { x: qx, z: qz }, clear: +Math.min(cs, cq).toFixed(2), side: +side.toFixed(2) }; }
        }
      }
    }
    return best || { s: { x: p.x, z: p.z }, q: { x: p.x + Math.sin(toM) * r, z: p.z + Math.cos(toM) * r }, clear: 0, side: 0 };
  }

  // After the invitation: standing still by her, he dances with her.
  partner(dt) {
    const g = this.g, p = g.player, M = this.invited && this.posed('majsan') ? g.npc('majsan') : null;
    const want = !!M && !this.busy && !g.inDialog && !g.playerCar && p.state === 'normal' && p.onGround
      && Math.hypot(p.wishX, p.wishZ) < 0.1 && dist(p.x, p.z, M.x, M.z) < this.cfg.partnerR;
    if (want) {
      p.anim.dance = this.dancing = true;
      p.yaw = dampAngle(p.yaw, yawTo(M.x - p.x, M.z - p.z), 6, dt);
    } else if (this.dancing && !this.busy) this.unDance();
  }
  unDance() { if (this.dancing) { this.g.player.anim.dance = false; this.dancing = false; } }

  // ---------------------------------------------------------------------------------------------
  // The frame

  // main.js fixedStep: the band and the tourists (back to their places if pushed off them).
  step(h) {
    if (!this.extras.length) return;
    for (const e of this.cast) {
      const ch = e.ch;
      if (ch.state === 'normal') {
        const w = this.steer(ch, e, this.cfg.walk);
        ch.wishX = w ? w.x : 0; ch.wishZ = w ? w.z : 0;
      } else ch.wishX = ch.wishZ = 0;
      ch.step(h, this.g);
    }
  }

  update(dt) {
    const g = this.g;
    if (!this.open) { if (this.on || this.busy || Object.keys(this.held).length) this.reset(); return; }
    this.sayDue();
    if (!this.on) { this.gate(); return; }
    this.tickHeld(dt);
    this.tickCast(dt);
    if (this.busy) return;
    this.tickHost(dt);
    this.tickLines();
    this.partner(dt);
    const f = g.focus();
    if (!g.inDialog && !this.inFarm(f.x, f.z, this.cfg.out)) this.leave();
  }

  sayDue() {
    const g = this.g;
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i];
      if (l.at > g.time) continue;
      this.lines.splice(i--, 1);
      const n = g.npc(l.who);
      if (n && (l.who === 'stig' || n.state === 'normal')) g.say(n, l.text, 2.6);
    }
  }

  tickHeld(dt) {
    const g = this.g, p = g.player;
    for (const key of Object.keys(this.held)) {
      const n = g.npc(key), o = this.held[key];
      if (n.spot !== MARK || n.state === 'hidden') { this.release(key, false); continue; }   // placed by someone else
      if (n.state !== 'normal') { this.still(n); continue; }
      const at = dist(n.x, n.z, o.x, o.z) < 0.35 && Math.hypot(n.vx, n.vz) < 0.4;
      n.anim.dance = o.dance && at;
      n.anim.film = o.film && at;
      n.anim.cupHeld = o.cup;
      if (!at) continue;
      if (o.face && g.time > (o.faceUntil ?? Infinity)) o.face = null;
      let want = o.yaw;
      const f = o.face ?? (key === 'majsan' && dist(p.x, p.z, n.x, n.z) < 5 ? p : null);
      if (f) want = yawTo(f.x - n.x, f.z - n.z);
      n.yaw = dampAngle(n.yaw, want, 5, dt);
    }
  }

  tickCast(dt) {
    for (const e of this.cast || []) {
      const ch = e.ch;
      if (ch.state === 'normal') {
        const off = dist(ch.x, ch.z, e.x, e.z), at = off < 0.35 && ch.speed < 0.4;
        // Stuck off the place (knocked off the bandstand, behind a table): back to it.
        e.stuck = off > 0.5 && ch.speed < 0.2 ? e.stuck + dt : 0;
        if (e.stuck > 2.5) { ch.teleport(e.x, e.z, e.yaw); if (e.stage) ch.y = groundAt(e.x, e.z, 1.2, 0.6); e.stuck = 0; }
        ch.anim.dance = e.dance && at;
        ch.anim.talk = e.sing && at;
        if (at) ch.yaw = dampAngle(ch.yaw, e.face ? yawTo(e.face.x - ch.x, e.face.z - ch.z) : e.yaw, e.away ? 7 : 5, dt);
      } else { ch.anim.dance = ch.anim.talk = false; }
      ch.sync(dt);
    }
  }

  tickHost(dt) {
    const g = this.g, c = this.cfg, key = c.host, o = this.held[key], R = this.round;
    if (!o || !R) return;
    const n = g.npc(key), wp = c.round[R.i], q = this.at(wp);
    o.x = q.x; o.z = q.z;
    if (dist(n.x, n.z, q.x, q.z) > 0.4) return;
    const end = R.i === 0 || R.i === c.round.length - 1;
    if (end && (R.waitT -= dt) > 0) return;
    if (R.i + R.dir < 0 || R.i + R.dir >= c.round.length) R.dir = -R.dir;
    R.i += R.dir;
    R.waitT = c.hostWait;
    const nq = this.at(c.round[R.i]);
    o.yaw = yawTo(nq.x - q.x, nq.z - q.z);
  }

  tickLines() {
    const g = this.g, c = this.cfg, p = g.player;
    if (g.inDialog) return;
    const near = (key, r) => this.posed(key) && g.npc(key).state === 'normal' && dist(g.npc(key).x, g.npc(key).z, p.x, p.z) < r;
    if (g.time >= this.nextT.sangria && near(c.host, c.sangria.r)) {
      g.say(this.hostNpc, c.sangria.line, 2.4);
      this.nextT.sangria = g.time + rnd(c.sangria.every);
    }
    if (g.time >= this.nextT.heia && near('ole', c.heia.r)) {
      g.say(g.npc('ole'), c.heia.line, 2.0);
      this.nextT.heia = g.time + rnd(c.heia.every);
    }
    // Fru Storch at the long table asks the host; Ole answers from the floor.
    if (!this.coffee && near('fruStorch', c.coffee.r)) {
      this.coffee = true;
      const F = this.held.fruStorch, h = this.posed(c.host) ? this.hostNpc : null;
      if (h) { F.face = h; F.faceUntil = g.time + 4; }
      this.lines.push({ at: g.time, who: c.coffee.ask[0], text: c.coffee.ask[1] });
      if (this.posed('ole')) this.lines.push({ at: g.time + c.coffee.gap, who: c.coffee.reply[0], text: c.coffee.reply[1] });
      this.last = { kind: 'coffee', t: g.time, ole: this.posed('ole'), host: !!h };
    }
  }
}
