// Mikrofonen på scenen – Stig reads Lasse's announcements (free roam; feature 44, DESIGN §10.30).
// The welcome stage at Hotel SunTrip has a microphone between its two speakers. Between missions E
// there plays the PA chime, and Stig reads the next of Lasse's announcements from the bus and the
// welcome meeting with a civil servant's gravity, and the hotel round him does what he says: the
// guests at the terrace tables spit out their drinks ("Ni bör inte dricka vattnet."), tourists and
// the free ones of the gang come onto the lawn and cheer for the grisfest, with the film's question
// time and Stig's "Ja." in Lasse's place, Ole answers the time, the crowd sinks and drifts off at
// "Friskoteket börjar halv tio varje morgon.", and while the fin still circles in the SunTrip pool
// "Hajar i poolen!" sends the bathers off their loungers (Lasse waves it off). Everything is in
// bubbles: he walks free all the time. Only on the island with no mission running
// (`missions.state === 'idle'`); a mission start or the other level takes the crowd, the guests and
// the lines away at once (the gang home), so no mission, timer or calibration pool sees any of it.
// Config: MIKROFON (content/island.js). Owned by Game as `mic`: main.js calls `update` once a frame
// and `step` in its fixed step, counts `extras` (the crowd's tourists) as people and asks `posed(key)`
// (the gang in the crowd) in npcPosed; honk.free asks it too, so the other modules leave them be.

import { MIKROFON } from '../content/index.js';
import { THREE, camera, scene } from '../gfx.js';
import { Character } from '../actors/character.js';
import { randomPed } from '../actors/models.js';
import { lm } from '../world/layout.js';
import { blockCentre } from '../world/landmarks-island.js';
import { audio } from '../audio.js';
import { input } from '../input.js';
import { fx } from './fx.js';
import { fmt } from '../strings.js';
import { dist, yawTo, dampAngle, mulberry32 } from '../util.js';

const MARK = 'mic';   // npc.spot while one of the gang is in the crowd (a placement by anyone else clears it)
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere(), _v = new THREE.Vector3();

export class Mic {
  constructor(game, cfg = MIKROFON) {
    this.g = game;
    this.cfg = cfg;
    const c = blockCentre(cfg.block[0], cfg.block[1]);
    this.ox = c.x; this.oz = c.z;
    this.next = 0;             // index in cfg.order of the next announcement (per session)
    this.coolUntil = -Infinity;
    this.script = [];          // lines still to say, one after another: { who, text, secs?, if?, until?, max?, fn? }
    this.scriptAt = 0;         // g.time of the next one
    this.queue = [];           // reactions on a clock: [{ at, fn }] (g.time)
    this.camT = 0;             // s left of the camera easing in behind him
    this.camYaw = 0;
    this.crowd = [];           // { ch, key, si, spot, entry, path, st: 'come' | 'stand' | 'leave' | 'out', speed, waitT, stuckT, cheerT, slump, outT }
    this.extras = [];          // the crowd's tourists (main.js counts them as people)
    this.tourists = null;      // their Characters, made at the first grisfest
    this.stayUntil = Infinity; // g.time when the crowd walks off by itself
    this.cheered = 0;          // tourists who have cheered since the last grisfest (the first two say a line)
    this.clapped = false;      // the applause at the first arrival since the last grisfest
    this.drinkers = null;      // the terrace guests: [{ k, seat: { x, z, yaw }, ch, on }]
    this.on = false;           // live last frame
    this.cutT = 0;             // s left in which bodies may come and go in view (after a cut)
    this.fx = 0; this.fz = 0;
    this.last = null;          // tests: the last announcement { id, t, text, drinkers, crowd, gang, scared }
    this.said = [];            // tests: [who, text, g.time] said since the last announcement
    game.addInteractable({
      id: 'mic', r: cfg.r, prompt: cfg.prompt,
      pos: () => { const l = lm(cfg.lm); return { x: l.x, z: l.z, y: cfg.stageY }; },
      enabled: () => this.canUse(),
      use: () => this.speak(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  // The chime's cooldown, or lines of the last announcement still to come.
  get busy() { return this.g.time < this.coolUntil || this.script.length > 0; }
  get micAt() { return lm(this.cfg.lm); }
  at(p) { return { x: this.ox + p[0], z: this.oz + p[1] }; }
  posed(key) { return this.crowd.some((m) => m.key === key) && this.g.npc(key)?.spot === MARK; }
  inCrowd(key, st = ['come', 'stand']) { return this.crowd.some((m) => m.key === key && st.includes(m.st) && m.ch.state === 'normal'); }

  // On foot on the stage by the mic: no scene, car, carry, pursuit, bust, PANIK, pool-fest ring, belt
  // or talk with the gang.
  canUse() {
    const g = this.g, p = g.player;
    return this.live && !this.busy && !g.inDialog && !g.playerCar && !g.carrying && p.state === 'normal' && p.onGround
      && p.y > this.cfg.stageY - 0.1 && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !g.fest.joined
      && !g.belt.seated && !g.chat.busy;
  }

  // Free to take into the crowd: shown, standing at home, nobody's (busy: placed or held by a mission,
  // another free-roam module or a scene), not the waiting mission's giver or extra.
  free(key) {
    const g = this.g, n = g.npc(key), cur = g.missions.current;
    if (!n || n.state !== 'normal' || !n.root.visible || n.car || n.seatId || n.busy || n.steer || !g.honk.free(key) || g.npcPosed(key)) return false;
    return !(cur && cur.level === 'island' && (cur.giver === key || cur.extra?.some((e) => e === key || (Array.isArray(e) && e[0] === key))));
  }
  homeOf(key) {
    const g = this.g;
    let home = g.levelDef.homes(g)[key] ?? null;
    if (key in g.homeOverrides) home = g.homeOverrides[key];
    return home && !home.seat ? home : null;
  }

  // Out of the camera's view (or more than popR m from it), or just after a cut: a body may come or go.
  seen(x, y, z) { return _frustum.intersectsSphere(_sphere.set(_sphere.center.set(x, y, z), 1.2)); }
  mayPop(x, y, z) { return this.cutT > 0 || camera.position.distanceTo(_v.set(x, y, z)) > this.cfg.popR || !this.seen(x, y, z); }

  // The next announcement in turn: the shark warning only while the fin still circles.
  nextId() {
    const o = this.cfg.order;
    for (let k = 0; k < o.length; k++) {
      const id = o[(this.next + k) % o.length];
      if (id === 'hajar' && this.g.collected.fenor?.has(this.cfg.hajar.fin)) continue;
      return id;
    }
    return null;
  }
  // The island's clock in words, as an official reads it: "tre", "halv fyra" (a quarter past to a
  // quarter to), "fyra".
  clockWords(h = this.g.day.h) {
    const H = Math.floor(h), m = Math.floor((h - H) * 60 + 1e-6), w = (n) => this.cfg.hours[((n % 12) + 12) % 12];
    if (m < 15) return w(H);
    return m < 45 ? fmt(this.cfg.half, { h: w(H + 1) }) : w(H + 1);
  }

  // ---------------------------------------------------------------------------------------------
  // E at the mic

  speak() {
    const g = this.g, c = this.cfg, p = g.player, id = this.nextId();
    if (!id || !this.canUse()) return;
    this.next = c.order.indexOf(id) + 1;
    const L = c.lines[id], f = this.at(L.face);
    this.queue.length = 0;
    this.script.length = 0;
    this.said = [];
    audio.dingdong();
    // The chime takes down the chatter round the stage (Affe's and Gabbe's), not to stack over him.
    const m = this.micAt;
    for (const k in g.npcs) { const n = g.npcs[k]; if (dist(n.x, n.z, m.x, m.z) < c.hushR && !this.posed(k)) g.unsay(n); }
    p.yaw = yawTo(f.x - p.x, f.z - p.z);
    this.camYaw = p.yaw + c.camOff;
    this.camT = c.camSecs;
    this.coolUntil = g.time + c.cool;
    const text = id === 'klocka' ? fmt(L.text, { tid: this.clockWords() }) : L.text;
    this.scriptAt = g.time + c.dingSecs;
    this.line('stig', text);
    this.last = { id, t: g.time, text };
    if (id === 'vatten') this.spit();
    else if (id === 'grisfest') this.gather();
    else if (id === 'klocka') this.clock();
    else if (id === 'friskotek') this.sink();
    else this.shark();
  }

  line(who, text, o = {}) { this.script.push({ who, text, ...o }); }
  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }
  say(ch, who, text, secs) { this.g.say(ch, text, secs); this.said.push([who, text, +this.g.time.toFixed(2)]); }

  // Who says a script line: Stig while he is by the mic on foot; a tourist of the crowd; a guest at
  // the terrace; someone of the crowd's audience (either); or one of the cast standing free.
  speaker(who) {
    const g = this.g, p = g.player, m = this.micAt;
    if (who === 'stig') return !g.playerCar && p.state === 'normal' && dist(p.x, p.z, m.x, m.z) <= this.cfg.leaveR ? p : null;
    const tourist = () => this.crowd.find((x) => !x.key && x.st !== 'out' && x.ch.state === 'normal')?.ch ?? null;
    const guest = () => (this.drinkers || []).find((d) => d.on && d.ch.state === 'seated')?.ch ?? null;
    if (who === 'tourist') return tourist();
    if (who === 'audience') return tourist() || guest();
    const n = g.npc(who);
    return n && n.state === 'normal' && n.root.visible && (this.posed(who) || !g.npcPosed(who)) ? n : null;
  }

  tickScript() {
    const g = this.g;
    while (this.script.length && g.time >= this.scriptAt) {
      const s = this.script[0];
      if (s.until) {
        s.t0 ??= g.time;
        if (!s.until() && g.time - s.t0 < s.max) return;
      }
      this.script.shift();
      if (s.if && !s.if()) continue;
      if (!s.text) { s.fn?.(); continue; }
      const ch = this.speaker(s.who);
      if (!ch) {
        if (s.who === 'stig') this.script.length = 0;   // he has gone: the rest is his question time
        continue;
      }
      s.fn?.();
      this.say(ch, s.who, s.text, s.secs ?? 2.2);
      this.scriptAt = g.time + Math.max(0, (ch.sayEnd - performance.now()) / 1000) + this.cfg.gap;
      return;
    }
  }
  tickQueue() {
    const g = this.g;
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      q.fn();
    }
  }

  // ---------------------------------------------------------------------------------------------
  // "Ni bör inte dricka vattnet.": the terrace's guests drink at the chime and spit it out.

  spit() {
    const g = this.g, c = this.cfg.terrace, t = this.cfg.dingSecs + c.spitAt;
    const ds = (this.drinkers || []).filter((d) => d.on && d.ch.state === 'seated');
    ds.forEach((d, k) => {
      const ch = d.ch, at = t + k * 0.3;
      this.later(c.sipAt + k * 0.15, () => { if (d.on) ch.anim.cupHeld = true; });
      this.later(at, () => {
        if (!d.on) return;
        ch.anim.cupHeld = false;
        ch.anim.yell = true;
        this.spray(ch);
        this.say(ch, 'guest', c.spit[k % c.spit.length], 1.6);
      });
      this.later(at + c.yellSecs, () => { ch.anim.yell = false; });
    });
    this.last.drinkers = ds.length;
  }
  // The drink out of his mouth: a spray forward, the drink and its ice.
  spray(ch) {
    ch.root.updateWorldMatrix(true, false);
    const m = ch.root.localToWorld(_v.set(0, ch.model.headTop - 0.22, 0.2));
    for (let k = 0; k < 18; k++) {
      const a = ch.yaw + (Math.random() - 0.5) * 0.8, s = 1.8 + Math.random() * 2.4;
      fx.spawn(m.x, m.y, m.z, k % 3 ? 0xf7a21b : 0xffffff, { vx: Math.sin(a) * s, vz: Math.cos(a) * s, vy: 0.6 + Math.random() * 1.6, s0: 0.2, s1: 0.07, life: 0.7, drag: 0.6, grav: 12 });
    }
  }

  // The guests at the terrace tables: seated by day and evening while he is within r m, each put on
  // or taken off its chair only out of the camera's view (or after a cut).
  tickDrinkers(dt) {
    const g = this.g, c = this.cfg.terrace, f = g.focus(), h = g.day.h, hours = h >= c.hours[0] && h < c.hours[1];
    this.drinkers ??= c.seats.map((s, k) => ({ k, seat: { ...this.at(s), yaw: s[2] }, ch: null, on: false }));
    for (const d of this.drinkers) {
      const s = d.seat, near = dist(s.x, s.z, f.x, f.z) < c.r, pop = this.mayPop(s.x, c.y + 0.6, s.z);
      if (!d.on && hours && near && pop) this.seatGuest(d);
      else if (d.on && (!near || (!hours && pop))) this.standGuest(d);
      if (d.on) d.ch.sync(dt);
    }
  }
  seatGuest(d) {
    const c = this.cfg.terrace;
    if (!d.ch) {
      let def;
      for (let s = c.seed + d.k * 101; ; s++) { def = randomPed(mulberry32(s)); if (!def.local) break; }
      delete def.held;
      d.ch = new Character(def);
      scene.add(d.ch.root);
    }
    d.ch.seatAt({ x: d.seat.x, y: c.y, z: d.seat.z, yaw: d.seat.yaw });
    d.on = true;
  }
  standGuest(d) {
    const ch = d.ch;
    this.g.unsay(ch);
    ch.anim.cupHeld = ch.anim.yell = ch.anim.slump = false;
    ch.state = 'hidden';
    ch.root.visible = false;
    d.on = false;
  }

  // ---------------------------------------------------------------------------------------------
  // "Grisfesten är på torsdag…": the crowd comes onto the lawn, cheers, and the question time.

  ensureTourists() {
    if (this.tourists) return;
    const c = this.cfg.crowd;
    let seed = c.seed;
    this.tourists = [];
    for (let k = 0; k < c.tourists; k++) {
      let def;
      for (;;) { def = randomPed(mulberry32(seed++)); if (!def.local) break; }
      delete def.held;
      const ch = new Character(def);
      ch.state = 'hidden';
      ch.root.visible = false;
      scene.add(ch.root);
      this.tourists.push(ch);
    }
  }

  gather() {
    const g = this.g, c = this.cfg.crowd;
    this.ensureTourists();
    const used = new Set(this.crowd.map((m) => m.si));
    const spot = () => { for (let i = 0; i < c.spots.length; i++) if (!used.has(i)) { used.add(i); return i; } return -1; };
    let lag = 0;
    for (const key of c.gang) {
      const m = this.crowd.find((x) => x.key === key);
      if (m) { this.comeBack(m); continue; }
      if (!this.free(key)) continue;
      const si = spot();
      if (si >= 0) this.join(g.npc(key), key, si, (lag += 0.35));
    }
    for (const ch of this.tourists) {
      const m = this.crowd.find((x) => x.ch === ch);
      if (m) { this.comeBack(m); continue; }
      const si = spot();
      if (si >= 0) this.join(ch, null, si, Math.random() * c.lag);
    }
    this.stayUntil = Infinity;
    this.cheered = 0;
    this.clapped = false;
    this.extras = this.crowd.filter((m) => !m.key).map((m) => m.ch);
    // Once they are there: Robban's Benidorm, and the question time if Fru Storch has come.
    this.line(null, null, { until: () => !this.crowd.some((m) => m.st === 'come'), max: c.arriveSecs });
    this.line('robban', c.robban, { if: () => this.inCrowd('robban', ['stand']) });
    const [ask, ja, norsk, ja2] = c.qa;
    let asked = false, oled = false;
    this.line(ask[0], ask[1], { if: () => this.inCrowd('fruStorch'), fn: () => { asked = true; } });
    this.line(ja[0], ja[1], { if: () => asked });
    this.line(norsk[0], norsk[1], { if: () => asked && this.inCrowd('ole'), fn: () => { oled = true; } });
    this.line(ja2[0], ja2[1], { if: () => oled });
    this.last.crowd = this.crowd.length;
    this.last.gang = this.crowd.filter((m) => m.key).map((m) => m.key);
  }

  // One of the crowd: from an entry out of view (or where he stands, if he is in view) to spot si.
  join(ch, key, si, wait) {
    const g = this.g, c = this.cfg.crowd, spot = this.at(c.spots[si]);
    let entry = null;
    if (this.mayPop(ch.x, ch.y + 1, ch.z) || ch.state === 'hidden') {
      const e = this.entryFor(spot);
      entry = e.name;
      // A little spread at the start, so the crowd does not come in single file.
      const j = (Math.random() - 0.5) * 2.4;
      const sx = e.start.x + (e.name === 's' ? j : 0), sz = e.start.z + (e.name === 's' ? 0 : j);
      if (ch.state === 'hidden') ch.state = 'normal';
      ch.teleport(sx, sz, yawTo(spot.x - sx, spot.z - sz));
      ch.root.visible = true;
    }
    const m = { ch, key, si, spot, entry, path: this.pathIn(entry, spot), st: 'come', speed: c.walk, waitT: wait, stuckT: 0, cheerT: 0, slump: false, outT: 0 };
    if (key) {
      ch.busy = true;
      ch.spot = MARK;
      ch.steer = m.steer = () => this.steer(m);
      g.unsay(ch);
    }
    this.crowd.push(m);
  }
  // Back to his spot (the grisfest again while he stands, walks off or waits outside).
  comeBack(m) {
    m.cheerT = m.st === 'stand' ? this.cfg.crowd.cheerSecs : 0;
    if (m.st !== 'stand') { m.st = 'come'; m.path = this.pathIn(m.entry ?? this.nearestEntry(m.ch), m.spot); }
    m.speed = this.cfg.crowd.walk;
    m.slump = false;
    m.waitT = 0;
  }

  entryFor(spot) {
    let best = null, far = null;
    for (const [name, e] of Object.entries(this.cfg.crowd.entries)) {
      for (const f of e.from) {
        const q = this.at(f), d = camera.position.distanceTo(_v.set(q.x, 1, q.z));
        if (!far || d > far.d) far = { name, start: q, d };
        if (!this.mayPop(q.x, 1, q.z)) continue;
        const pts = [q, ...e.via.map((v) => this.at(v)), spot];
        let len = 0;
        for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1].x, pts[i - 1].z, pts[i].x, pts[i].z);
        if (!best || len < best.len) best = { name, start: q, len };
        break;   // the nearest start of this entry that is out of view
      }
    }
    return best || far;
  }
  nearestEntry(ch) {
    let best = null, bd = Infinity;
    for (const [name, e] of Object.entries(this.cfg.crowd.entries)) {
      const q = this.at(e.via[0]), d = dist(q.x, q.z, ch.x, ch.z);
      if (d < bd) { bd = d; best = name; }
    }
    return best;
  }
  pathIn(entry, spot) {
    const e = entry && this.cfg.crowd.entries[entry];
    return [...(e ? e.via.map((v) => this.at(v)) : []), { x: spot.x, z: spot.z }];
  }
  pathOut(m) {
    const e = this.cfg.crowd.entries[m.entry ?? this.nearestEntry(m.ch)];
    return [...e.via.slice().reverse().map((v) => this.at(v)), this.at(e.from[e.from.length - 1])];
  }

  // The wish to the next point of his path (slowing in at his spot); none while he waits or is down.
  steer(m) {
    const ch = m.ch;
    if (ch.state !== 'normal' || m.waitT > 0 || !m.path.length) return null;
    const q = m.path[0], dx = q.x - ch.x, dz = q.z - ch.z, d = Math.hypot(dx, dz), end = m.path.length === 1;
    if (d < (end ? 0.25 : 0.9)) { m.path.shift(); return null; }
    const sp = end ? Math.min(m.speed, 0.4 + d * 1.6) : m.speed;
    return { x: (dx / d) * sp, z: (dz / d) * sp };
  }
  // main.js fixedStep: the tourists (the gang walk by their `steer`).
  step(h) {
    for (const m of this.crowd) {
      if (m.key) continue;
      const ch = m.ch, w = this.steer(m);
      ch.wishX = w ? w.x : 0; ch.wishZ = w ? w.z : 0;
      ch.step(h, this.g);
    }
  }

  tickCrowd(dt) {
    const g = this.g, c = this.cfg.crowd, mic = this.micAt;
    for (const m of this.crowd.slice()) {
      const ch = m.ch;
      if (m.key && (ch.spot !== MARK || ch.state === 'hidden')) { this.lose(m); continue; }   // placed by someone else
      if (m.waitT > 0) m.waitT -= dt;
      const going = m.path.length && ch.state === 'normal' && !(m.waitT > 0);
      m.stuckT = going && ch.speed < 0.3 ? m.stuckT + dt : 0;
      if (m.stuckT > 1.5) { m.path.shift(); m.stuckT = 0; }   // held by something: the next point
      if (m.st === 'come' && !m.path.length) this.arrive(m);
      else if (m.st === 'leave' && !m.path.length) { m.st = 'out'; m.outT = 0; }
      if (m.st === 'out' && ((m.outT += dt) > c.outSecs || this.mayPop(ch.x, ch.y + 1, ch.z))) { this.drop(m); continue; }
      if (m.cheerT > 0) m.cheerT -= dt;
      const up = ch.state === 'normal';
      ch.anim.cheer = up && m.cheerT > 0;
      ch.anim.slump = up && m.slump;
      if (m.key === 'herrStorch') ch.anim.film = up && m.st === 'stand';
      if (up && m.st === 'stand') ch.yaw = dampAngle(ch.yaw, yawTo(mic.x - ch.x, mic.z - ch.z), 5, dt);
      if (!m.key) ch.sync(dt);
    }
    if (this.crowd.length && this.stayUntil === Infinity && !this.crowd.some((m) => m.st === 'come')) this.stayUntil = g.time + c.stay;
    if (g.time > this.stayUntil) { this.stayUntil = Infinity; this.leaveAll(false); }
  }
  arrive(m) {
    const g = this.g, c = this.cfg.crowd;
    m.st = 'stand';
    m.cheerT = c.cheerSecs;
    if (!this.clapped) { this.clapped = true; audio.applause(2.5); }
    if (this.cheered < c.cheer.length && !m.key) this.say(m.ch, 'tourist', c.cheer[this.cheered], 1.4);
    if (!m.key) this.cheered++;
  }
  // Everyone off the way they came, strolling; after "friskoteket" slumped and slower, after a moment.
  leaveAll(slumped) {
    const c = this.cfg.crowd;
    for (const m of this.crowd) {
      if (m.st === 'out' || m.st === 'leave') continue;
      m.st = 'leave';
      m.path = this.pathOut(m);
      m.speed = slumped ? c.slumpWalk : c.outWalk;
      m.slump = slumped;
      m.cheerT = 0;
      m.waitT = (slumped ? c.slumpSecs : 0) + Math.random() * 1.2;
    }
  }
  still(ch) { ch.anim.cheer = ch.anim.slump = ch.anim.film = false; }
  // Done with him: a tourist hidden, one of the gang home (teleported) unless `home` is false.
  drop(m, home = true) {
    const i = this.crowd.indexOf(m);
    if (i >= 0) this.crowd.splice(i, 1);
    const ch = m.ch;
    this.still(ch);
    if (m.key) { this.release(m, home); return; }
    this.g.unsay(ch);
    ch.wishX = ch.wishZ = 0;
    ch.state = 'hidden';
    ch.root.visible = false;
    this.extras = this.crowd.filter((x) => !x.key).map((x) => x.ch);
  }
  release(m, home) {
    const g = this.g, n = m.ch, key = m.key;
    if (n.steer === m.steer) delete n.steer;
    if (n.spot !== MARK) return;   // someone else placed him meanwhile
    const h = home ? this.homeOf(key) : null;
    if (h) g.placeNpc(key, h[0], h[1], h[2], h[3]);
    n.busy = false;
    n.spot = null;
  }
  // Placed by someone else (a forced placeNpcs, a scene): ours no more, where he is.
  lose(m) {
    const i = this.crowd.indexOf(m);
    if (i >= 0) this.crowd.splice(i, 1);
    this.still(m.ch);
    if (m.ch.steer === m.steer) delete m.ch.steer;
  }

  // ---------------------------------------------------------------------------------------------
  // "Klockan är tre spansk tid…": Ole and his watch.

  clock() {
    const g = this.g, c = this.cfg.klocka, mic = this.micAt;
    const ole = () => {
      if (this.inCrowd('ole', ['stand'])) return true;
      const n = g.npc('ole');
      return !this.posed('ole') && !!this.speaker('ole') && dist(n.x, n.z, mic.x, mic.z) < c.r;
    };
    const found = g.collected.prylar?.has('klocka');
    let oleSaid = false;
    this.line('ole', found ? c.ole : c.oleLost, { if: ole, fn: () => { oleSaid = true; } });
    this.line('audience', c.other, { if: () => !oleSaid });
  }

  // ---------------------------------------------------------------------------------------------
  // "Friskoteket börjar halv tio varje morgon.": the crowd sinks and drifts off, the terrace too.

  sink() {
    const c = this.cfg, t = c.terrace, n = this.crowd.filter((m) => m.st === 'come' || m.st === 'stand').length;
    this.later(c.dingSecs + 0.6, () => this.leaveAll(true));
    const ds = (this.drinkers || []).filter((d) => d.on);
    for (const d of ds) {
      this.later(c.dingSecs + 0.6 + Math.random() * 0.5, () => { if (d.on) d.ch.anim.slump = true; });
      this.later(c.dingSecs + t.slumpSecs, () => { if (d.on) d.ch.anim.slump = false; });
    }
    this.line('tourist', c.crowd.slump, { if: () => !!this.speaker('tourist') });
    this.line('berra', c.crowd.berraSlump, { if: () => this.inCrowd('berra', ['leave']) });
    this.last.crowd = n;
    this.last.drinkers = ds.length;
  }

  // ---------------------------------------------------------------------------------------------
  // "Hajar i poolen!": the bathers flee their loungers, Lasse waves it off.

  shark() {
    const g = this.g, c = this.cfg.hajar, q = this.at(c.at);
    this.last.scared = 0;
    this.later(this.cfg.dingSecs + 0.3, () => {
      const scared = g.bathers.scare(q.x, q.z, c.r, c.flee);
      this.last.scared = scared.length;
      scared.slice(0, c.cries.length).forEach((ch, k) => this.later(0.2 + k * 0.45, () => { if (ch.state !== 'hidden') this.say(ch, 'bather', c.cries[k], 1.4); }));
    });
    let lasse = false;
    this.line('lasse', c.lasse, {
      if: () => { const n = this.speaker('lasse'); return !!n && dist(n.x, n.z, q.x, q.z) < c.lasseR; },
      fn: () => { lasse = true; },
    });
    this.line('stig', c.stig, { if: () => lasse });
  }

  // ---------------------------------------------------------------------------------------------
  // The frame

  update(dt) {
    const g = this.g;
    if (!this.live) { if (this.on) this.reset(); return; }
    const f = g.focus();
    // A cut (free roam again after a mission or a load, R, a warp): bodies come and go freely a moment.
    if (!this.on || dist(f.x, f.z, this.fx, this.fz) > 15) this.cutT = this.cfg.cutSecs;
    this.on = true;
    this.fx = f.x; this.fz = f.z;
    this.cutT -= dt;
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    this.tickDrinkers(dt);
    this.tickQueue();
    this.tickScript();
    this.tickCrowd(dt);
    // The NPCs round the stage keep their chatter back while the announcement plays out.
    if (this.script.length || this.queue.length) {
      const mic = this.micAt;
      for (const k in g.npcs) {
        const n = g.npcs[k];
        if (dist(n.x, n.z, mic.x, mic.z) < this.cfg.hushR) n.chatT = Math.max(n.chatT ?? 0, 2);
      }
    }
    // The camera eases in behind him, turned to the announcement's audience (the mouse or a car ends it).
    if (this.camT > 0) {
      this.camT -= dt;
      const l = input.look();
      if (Math.abs(l.x) > 0.1 || Math.abs(l.y) > 0.1 || g.playerCar || g.inCutaway) this.camT = 0;
      else g.cam.yaw = dampAngle(g.cam.yaw, this.camYaw, 4, dt);
    }
  }

  // Out of free roam (a mission starts, the other level): everything off at once, the gang home.
  reset() {
    this.on = false;
    this.queue.length = 0;
    this.script.length = 0;
    this.camT = 0;
    this.stayUntil = Infinity;
    for (const m of this.crowd.slice()) this.drop(m, true);
    this.crowd.length = 0;
    this.extras = [];
    for (const d of this.drinkers || []) if (d.on) this.standGuest(d);
  }
}
