// Strandvolley mot Berra och Robban (free roam; feature 111, DESIGN §10.50). The beach volleyball court in
// block (4,6) by the pedal-boat rental (the landmark `volley`: the net's middle on the sand, facing the
// sea) has a real ball now, red and white, that rolls when Stig kicks it or walks or drives into it.
// Between missions, with Ole, Berra and Robban free (none of them the idle mission's giver), E at the ball
// on the court fades to black and back with Ole beside Stig and Berra and Robban across the net: first to
// five. Stig kicks the ball over with J (within reach, in time) or heads it in a jump; Ole takes the balls
// that land far from Stig and sets them up for him; Berra and Robban lumber after theirs and lob them
// back, worse the thirstier they get (the points played), and say so between the points. A ball landing
// in a half is the other side's point, one landing out the hitter's loss. Won, Berra and Robban give up
// and walk off towards the bar; lost, they wait a while for a rematch. Q gives up; walking off the court,
// a warp or a pursuit ends a match the same way, and a mission start or the other level ends it at once,
// everyone home and the ball back on the court. No pay: `records.volley` counts the wins and losses.
// Config: VOLLEY (content/island.js). Owned by Game as `volley`: main.js calls `swing()` when a kick
// starts, `ate()` before the kick's areaHit, `step(h)` in fixedStep, `update(dt)` once a frame, `hint()`
// for the keys, `posed(k)`, `giveUp()` on Q and `end('warp')` from debugWarp.

import { VOLLEY } from '../content/index.js';
import { THREE, GeoBuilder, toonMesh, scene } from '../gfx.js';
import { lm } from '../world/layout.js';
import { groundAt, queryBlocks, circleVsBlock, circleVsObb, topAt, RAMP } from '../world/collision.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt } from '../strings.js';
import { clamp, dist, yawTo } from '../util.js';

const _bl = [], _h = {}, _q = new THREE.Quaternion(), _ax = new THREE.Vector3();
const AI = ['ole', 'berra', 'robban'];
const TEAM = { stig: 'us', ole: 'us', berra: 'them', robban: 'them' };
const rand = (a, b) => a + Math.random() * (b - a);
const pm = (k) => (Math.random() * 2 - 1) * k;

// The ball: six gores, red and white, `r` m round, built from its middle.
function ballGeo(r) {
  const g = new GeoBuilder();
  for (let i = 0; i < 6; i++) g.add(new THREE.SphereGeometry(r, 4, 12, (i / 6) * Math.PI * 2, Math.PI / 3), i % 2 ? 0xf4f4f0 : 0xd8321e);
  return g.build();
}

export class Volley {
  constructor(game, cfg = VOLLEY) {
    this.g = game;
    this.cfg = cfg;
    this.mode = null;      // null | 'fade' | 'serve' | 'rally' | 'point' | 'end' | 'rematch'
    this.t = 0;            // seconds in the mode
    this.score = [0, 0];   // [Stig & Ole, Berra & Robban]
    this.thirst = 0;       // the points played this match
    this.next = 'us';      // the side that serves next (the last point's winner)
    this.server = 'robban';   // the one of them who served last (they take turns)
    this.touch = null;     // the last touch: { team, who, kind }
    this.plan = null;      // { side, chaser, leave, land: { x, z, u, v }, hit: { x, z } }
    this.netHit = false;   // the ball has touched the net since the last touch
    this.tired = 0;        // Berra's and Robban's touches in this rally
    this.swingT = 0;       // s left of Stig's kick window
    this.swung = false;    // this kick has met the ball
    this.held = {};        // key -> true: ours (in a match, or walking off)
    this.walk = null;      // { t, keys: { key: index into walkOff.path } }: Berra and Robban off to the bar
    this.lines = [];       // [{ at, who, text }] bubbles still to say (g.time)
    this.why = null;       // the point's reason on the board, while the point pause lasts
    this.hinted = false;   // the serve hint shown this match
    this.outT = 0;         // s Stig has been off the court in a match
    this.toss = null;      // { to: 'us' | key, T }: the ball on its way to the next server
    this.rallyT = 0;
    this.last = null;      // tests: { kind: 'start' | 'serve' | 'kick' | 'header' | 'hit' | 'point' | 'end' | 'abort' | 'gone', … }
    this.log = [];         // tests: the points [{ team, why, score }]
    const R = cfg.ball.r;
    this.b = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, held: null, live: false, landed: true, pv: 0 };
    this.mesh = toonMesh(ballGeo(R), { outline: 0.018 });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1d1426, transparent: true, opacity: 0.32, depthWrite: false }));
    this.shadow.renderOrder = 1;
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbf6ec, transparent: true, opacity: 0.8, depthWrite: false });
    this.ring = new THREE.Group();
    this.ring.add(new THREE.Mesh(new THREE.RingGeometry(0.42, 0.54, 32).rotateX(-Math.PI / 2), ringMat));
    this.ring.add(new THREE.Mesh(new THREE.CircleGeometry(0.1, 12).rotateX(-Math.PI / 2), ringMat));
    this.ring.visible = false;
    scene.add(this.mesh, this.shadow, this.ring);
    this.placed = false;
    const self = this;
    game.addInteractable({
      id: 'volley', r: cfg.r,
      pos: () => self.promptAt(),
      enabled: () => (self.mode === 'rematch' ? self.canRematch() : self.canStart()),
      get prompt() { return self.mode === 'rematch' ? cfg.promptRematch : cfg.prompt; },
      use: () => (self.mode === 'rematch' ? self.rematch() : self.start()),
    });
  }

  // ---- the court ---------------------------------------------------------------------------------
  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  // A match under way (Stig's J, E and Q are the match's).
  get playing() { return this.mode === 'fade' || this.mode === 'serve' || this.mode === 'rally' || this.mode === 'point'; }
  get won() { return this.g.records.volley?.won ?? 0; }
  get lost() { return this.g.records.volley?.lost ?? 0; }
  posed(key) { return !!this.held[key]; }

  get F() {
    if (!this._f) {
      const l = lm(this.cfg.lm), yaw = l.yaw || 0;
      this._f = { x: l.x, z: l.z, fx: Math.sin(yaw), fz: Math.cos(yaw), yaw, y: groundAt(l.x, l.z, 0.2, 0.6) };
    }
    return this._f;
  }
  // Court [u, v] -> world (as lmOffset: u to the landmark's left, v forward) and back.
  w(u, v) { const f = this.F; return { x: f.x + f.fz * u + f.fx * v, z: f.z - f.fx * u + f.fz * v }; }
  c(x, z) { const f = this.F, dx = x - f.x, dz = z - f.z; return { u: dx * f.fz - dz * f.fx, v: dx * f.fx + dz * f.fz }; }
  dirW(du, dv) { const f = this.F; return { x: f.fz * du + f.fx * dv, z: -f.fx * du + f.fz * dv }; }
  dirC(dx, dz) { const f = this.F; return { u: dx * f.fz - dz * f.fx, v: dx * f.fx + dz * f.fz }; }
  inCourt(x, z, m = 0) { const q = this.c(x, z), [W, L] = this.cfg.court; return Math.abs(q.u) <= W + m && Math.abs(q.v) <= L + m; }
  sideOf(x, z) { return this.c(x, z).v < 0 ? 'us' : 'them'; }
  npc(key) { return key === 'stig' ? this.g.player : this.g.npcs[key]; }

  // ---- the ball ----------------------------------------------------------------------------------
  placeBall(x, z, y = null) {
    const b = this.b, R = this.cfg.ball.r;
    b.x = x; b.z = z; b.y = y ?? groundAt(x, z, 1, 0.6) + R;
    b.vx = b.vy = b.vz = 0;
    b.held = null;
    b.landed = true;
    this.toss = null;
  }
  home() { const q = this.w(...this.cfg.rest); this.placeBall(q.x, q.z); }
  atRest() { const q = this.w(...this.cfg.rest), b = this.b; return dist(b.x, b.z, q.x, q.z) < 0.05 && Math.abs(b.vx) + Math.abs(b.vz) + Math.abs(b.vy) < 1e-3; }

  // Where the ball's arc (no drag) comes down to height y: { x, z, t }, or null if it never does.
  predict(y) {
    const b = this.b, G = this.cfg.ball.g, d = b.vy * b.vy + 2 * G * (b.y - y);
    if (d < 0) return null;
    const t = (b.vy + Math.sqrt(d)) / G;
    return { x: b.x + b.vx * t, z: b.z + b.vz * t, t };
  }
  // The ball off to court [u, v] on the sand, the top of its arc `apex` m over the sand (at least `rise` m
  // over where it starts; with `clear` raised until it passes over the net).
  launch(u, v, apex, { clear = true, rise = 0.4 } = {}) {
    const b = this.b, c = this.cfg, R = c.ball.r, G = c.ball.g, f = this.F, t = this.w(u, v);
    const y1 = f.y + R;
    let H = Math.max(f.y + apex, b.y + rise);
    let vx = 0, vy = 0, vz = 0;
    for (let k = 0; k < 12; k++) {
      vy = Math.sqrt(2 * G * (H - b.y));
      const T = vy / G + Math.sqrt(2 * (H - y1) / G);
      vx = (t.x - b.x) / T; vz = (t.z - b.z) / T;
      if (!clear) break;
      // Over the net: while the ball is within its radius of v 0 (net()'s slab), its bottom over the tape.
      const v0 = this.c(b.x, b.z).v, dv = this.dirC(vx, vz).v;
      if (Math.abs(dv) < 1e-3 || Math.sign(v0) === Math.sign(v)) break;
      const tc = -v0 / dv, tr = (R + 0.05) / Math.abs(dv);
      if (tc + tr <= 0 || tc - tr >= T) break;
      const yAt = (t) => b.y + vy * t - 0.5 * G * t * t;
      if (Math.min(yAt(Math.max(0, tc - tr)), yAt(tc), yAt(tc + tr)) > f.y + c.net[1] + R * 0.4 + 0.08) break;
      H += 0.4;
    }
    b.vx = vx; b.vy = vy; b.vz = vz;
    b.held = null;
    b.landed = false;
    this.netHit = false;
  }

  // ---- the frame ---------------------------------------------------------------------------------
  update(dt) {
    const g = this.g;
    if (!this.placed) { this.placed = true; this.home(); }
    if (!this.live) {
      if (this.mode || this.walk || Object.keys(this.held).length || this.lines.length || !this.atRest()) this.reset();
      this.draw(dt);
      return;
    }
    this.t += dt;
    this.sayDue();
    if (this.mode === 'rally') this.rallyT += dt;
    switch (this.mode) {
      case 'fade': if (this.t >= this.cfg.fadeSecs) this.place(); break;
      case 'serve': this.tickServe(); break;
      case 'rally': this.tickRally(); break;
      case 'point': this.tickPoint(); break;
      case 'end': if (this.t >= this.cfg.endSecs) this.afterEnd(); break;
      case 'rematch': this.tickRematch(); break;
    }
    if (this.playing && this.mode !== 'fade') {
      if (g.input.pressed('hangUp') && !g.inDialog) this.giveUp();
      else this.tickLeave(dt);
    }
    if (this.walk) this.tickWalk(dt);
    if (!this.mode && !this.walk) this.tickHome();
    this.face(dt);
    this.board();
    this.draw(dt);
  }

  // In fixedStep (after the people have moved): the kick window, the hits, then the ball.
  step(h) {
    if (!this.live) return;
    if (this.swingT > 0) this.swingT -= h;
    const b = this.b;
    if (b.held) { this.hold(); return; }
    if (this.mode === 'rally' || (this.mode === 'serve' && this.next === 'us')) { this.tryStig(); if (this.mode === 'rally') this.tryAi(); }
    else if (!this.playing) this.tryFree();
    this.physics(h);
  }

  // ---- Stig's kick ---------------------------------------------------------------------------------
  // main.handleOneShots: J on the ground opens the kick's window.
  swing() { if (this.live) { this.swingT = this.cfg.kick.window; this.swung = false; } }
  // main.fixedStep: the kick's areaHit is the ball's in a match, or when this kick met it.
  ate() { return this.live && (this.playing || this.swung); }

  reachable() {
    const g = this.g, p = g.player, k = this.cfg.kick, b = this.b;
    if (g.playerCar || p.state !== 'normal') return false;
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), ax = p.x + fx * k.ahead, az = p.z + fz * k.ahead;
    const dy = b.y - this.cfg.ball.r - p.y;
    return dist(b.x, b.z, ax, az) <= k.reach && dy >= -0.3 && dy <= k.high && p.y - groundAt(p.x, p.z, p.y, 0.45) < 0.35;
  }
  headable() {
    const p = this.g.player, b = this.b;
    if (p.state !== 'normal' || p.onGround) return false;
    const hy = p.y + p.height - 0.25;
    return Math.hypot(b.x - p.x, b.z - p.z, b.y - hy) <= this.cfg.header.r;
  }
  // Where Stig aims: his facing, the camera's when he faces away from the net, else straight over it.
  aim() {
    const g = this.g, p = g.player, k = this.cfg.kick;
    let a = this.dirC(Math.sin(p.yaw), Math.cos(p.yaw));
    if (a.v < k.minFwd) { const cv = this.dirC(Math.sin(g.cam.yaw), Math.cos(g.cam.yaw)); a = cv.v >= k.minFwd ? cv : { u: 0, v: 1 }; }
    return a;
  }
  tryStig() {
    const g = this.g, p = g.player, b = this.b;
    if (this.c(p.x, p.z).v > 0.5 || this.c(b.x, b.z).v > 0.15) return;   // never from their half, nor over the net
    if (this.swingT > 0 && !this.swung && this.reachable()) this.kick('kick');
    else if (this.headable() && this.touch?.who !== 'stig') this.kick('header');
  }
  kick(kind) {
    const g = this.g, c = this.cfg, k = c.kick, p = g.player, b = this.b;
    const a = this.aim(), bc = this.c(b.x, b.z);
    const depth = rand(k.depth[0], k.depth[1]);
    let u = bc.u + k.side * clamp(a.u / a.v, -1.2, 1.2) * (depth - bc.v) + pm(k.spread), v = depth + pm(k.spread * 0.6);
    // A kick from right under the net still drops into their half.
    if (v < 0.8) v = 0.8;
    const d = this.dirW(a.u, a.v);
    p.yaw = yawTo(d.x, d.z);
    this.swung = true;
    this.launch(u, v, kind === 'header' ? c.header.apex : k.apex);
    this.touched('stig', kind);
    audio.kick();
    if (this.mode === 'serve') this.setMode('rally');
  }
  // Out of a match: the ball kicked along his facing.
  tryFree() {
    if (!(this.swingT > 0) || this.swung || !this.reachable()) return;
    const p = this.g.player, f = this.cfg.kick.free, b = this.b, q = this.c(b.x + Math.sin(p.yaw) * f.dist, b.z + Math.cos(p.yaw) * f.dist);
    this.swung = true;
    this.launch(q.u, q.v, f.apex, { clear: false });
    this.touch = null;
    audio.kick();
    this.last = { kind: 'free', t: this.g.time };
  }

  // ---- the others' hits ---------------------------------------------------------------------------
  tryAi() {
    const b = this.b;
    if (b.landed || b.vy >= 0) return;
    const side = this.sideOf(b.x, b.z), plan = this.plan;
    for (const key of AI) {
      if (TEAM[key] !== side || this.touch?.who === key) continue;
      if (plan?.side === side && plan.leave) continue;   // an out ball they leave
      const n = this.npc(key), o = key === 'ole' ? this.cfg.ole : this.cfg.them;
      if (!n || n.state !== 'normal') continue;
      const dy = b.y - n.y;
      if (dist(b.x, b.z, n.x, n.z) > (o.reach ?? this.cfg.them.reach) || dy < this.cfg.them.low || dy > this.cfg.them.high) continue;
      if (key === 'ole') this.oleSet(); else this.theirHit(key);
      return;
    }
  }
  // Ole bumps it up for Stig, `ahead` m before him (a bad one goes astray).
  oleSet() {
    const g = this.g, o = this.cfg.ole, p = g.player, sp = this.c(p.x, p.z), [W] = this.cfg.court;
    this.pose('ole', 'bump', 0.45);
    let u = clamp(sp.u, -W + 0.4, W - 0.4), v = clamp(sp.v + o.ahead, -3.6, -0.7);
    if (Math.random() < o.bad) { u = Math.sign(pm(1)) * rand(3.5, 6); v = rand(-5, -2.5); }
    this.launch(u, v, o.apex, { clear: false });
    this.touched('ole', 'set');
    audio.kick();
  }
  // Berra or Robban lobs it back into Stig's half, off by their thirst, or misses: into the net or out.
  theirHit(key) {
    const c = this.cfg.them, t = this.thirst, [W, L] = this.cfg.court;
    this.pose(key, 'bump', 0.45);
    audio.kick();
    let miss = Math.min(c.miss[2], c.miss[0] + c.miss[1] * t + c.tire * this.tired);
    this.tired++;
    if (this.touch?.kind === 'header') miss += this.cfg.header.harder;
    if (Math.random() < miss) {
      if (Math.random() < 0.45) this.intoNet();
      else this.launch(Math.sign(pm(1)) * rand(W + 1.1, W + 3.5), rand(-L - 1.5, -1), rand(c.apex[0], c.apex[1]));   // out
      this.touched(key, 'miss');
      return;
    }
    const e = c.err[0] + c.err[1] * t, sm = c.smash;
    if (Math.random() < sm.p[0] + sm.p[1] * t) this.launch(Math.sign(pm(1)) * rand(sm.u[0], sm.u[1]), rand(sm.v[0], sm.v[1]), sm.apex);   // hard and low, into a back corner
    else this.launch(rand(-c.to.u, c.to.u) + pm(e), rand(c.to.v[0], c.to.v[1]) + pm(e), rand(c.apex[0], c.apex[1]));
    this.touched(key, 'hit');
  }
  // A low one at the net's mesh, under the tape: it drops back on their side.
  intoNet() { this.launch(rand(-3, 3), -0.8, this.cfg.net[1] - 0.6, { clear: false, rise: 0.1 }); }
  // Their serve from the serve spot: a fault into the net, or deep into Stig's half.
  theirServe(key) {
    const c = this.cfg.them, t = this.thirst;
    this.pose(key, 'bump', 0.45);
    audio.kick();
    if (Math.random() < Math.min(c.fault[2], c.fault[0] + c.fault[1] * t)) {
      this.intoNet();
      this.touched(key, 'fault');
    } else {
      const e = c.err[0] + c.err[1] * t;
      this.launch(rand(-c.to.u, c.to.u) + pm(e), rand(c.serveTo[0], c.serveTo[1]) + pm(e * 0.5), rand(c.apex[0], c.apex[1]));
      this.touched(key, 'serve');
    }
    this.setMode('rally');
  }

  // A touch: who, and the plan for the side it comes down on (who goes for it, or nobody: out).
  touched(who, kind) {
    const g = this.g, c = this.cfg, b = this.b;
    this.touch = { team: TEAM[who], who, kind, t: g.time };
    this.rallyT = 0;
    this.last = { kind: kind === 'kick' || kind === 'header' ? kind : 'hit', who, how: kind, t: g.time };
    const land = this.predict(this.F.y + c.ball.r);
    if (!land) { this.plan = null; return; }
    const lq = this.c(land.x, land.z), side = lq.v < 0 ? 'us' : 'them', out = !this.inCourt(land.x, land.z, c.ball.r * 0.5);
    const hit = this.predict(this.F.y + c.them.hitH) || land;
    const plan = this.plan = { side, chaser: null, leave: false, land: { x: land.x, z: land.z, u: lq.u, v: lq.v }, hit: { x: hit.x, z: hit.z }, out, go: g.time + (side === 'us' ? c.ole.react : c.them.react) };
    if (side === 'them') {
      if (out && Math.random() < c.them.leaveOut) { plan.leave = true; this.say('berra', c.outCall.berra, Math.max(0, land.t - 0.6)); return; }
      let best = Infinity;
      for (const key of ['berra', 'robban']) {
        const n = this.npc(key);
        const tt = dist(n.x, n.z, hit.x, hit.z) / this.speed(key);
        if (tt < best) { best = tt; plan.chaser = key; }
      }
    } else {
      if (who === 'ole') return;   // never twice running: Stig's
      const p = g.player, o = this.npc('ole'), ds = dist(p.x, p.z, land.x, land.z), dO = dist(o.x, o.z, land.x, land.z);
      if (out && Math.random() < c.ole.leaveOut) { plan.leave = true; this.say('ole', c.outCall.ole, Math.max(0, land.t - 0.6)); return; }
      if (ds > c.ole.take && dO < ds) plan.chaser = 'ole';
    }
  }

  // ---- the ball's physics ------------------------------------------------------------------------------
  physics(h) {
    const g = this.g, c = this.cfg, R = c.ball.r, G = c.ball.g, b = this.b;
    const resting = b.landed && b.vy === 0 && Math.abs(b.vx) + Math.abs(b.vz) < 1e-4;
    // The toss to the next server flies clear of everything (a post sent one back to their side).
    const ghost = !!this.toss && this.mode === 'point';
    if (!ghost) { this.bodies(); this.cars(); }
    if (resting && Math.abs(b.vx) + Math.abs(b.vz) < 1e-4) return;
    b.pv = this.c(b.x, b.z).v;
    b.vy -= G * h;
    b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
    if (!ghost) { this.walls(); this.net(); }
    const gy = groundAt(b.x, b.z, b.y - R, 0.3);
    if (b.y - R <= gy) {
      b.y = gy + R;
      const first = !b.landed;
      if (b.vy < -c.ball.stopV) {
        b.vy = -b.vy * c.ball.bounce;
        b.vx *= 0.62; b.vz *= 0.62;
        audio.thud();
      } else b.vy = 0;
      b.landed = true;
      if (first) this.onLand();
    }
    if (b.landed && b.vy === 0) {
      const k = Math.exp(-c.ball.roll * h);
      b.vx *= k; b.vz *= k;
      if (Math.hypot(b.vx, b.vz) < 0.05) b.vx = b.vz = 0;
    }
  }
  // Solids: the ball off walls, posts and props taller than its bottom.
  walls() {
    const b = this.b, R = this.cfg.ball.r;
    queryBlocks(b.x - R, b.z - R, b.x + R, b.z + R, _bl);
    for (const k of _bl) {
      if (k.dead) continue;
      const top = k.shape === RAMP ? topAt(k, b.x, b.z) : k.top;
      if (top <= b.y - R + 0.05 || !circleVsBlock(b.x, b.z, R, k, _h)) continue;
      b.x += _h.nx * _h.depth; b.z += _h.nz * _h.depth;
      const vn = b.vx * _h.nx + b.vz * _h.nz;
      if (vn < 0) { b.vx -= _h.nx * vn * 1.55; b.vz -= _h.nz * vn * 1.55; }
    }
  }
  // The net between the posts: the tape bumps it up and on, the mesh drops it back on its side.
  net() {
    const b = this.b, c = this.cfg, R = c.ball.r, f = this.F, q = this.c(b.x, b.z);
    if (Math.abs(q.u) > c.court[0] || Math.abs(q.v) >= R) return;
    const bot = f.y + c.net[0], top = f.y + c.net[1];
    if (b.y < bot - R * 0.5 || b.y > top + R * 0.4) return;
    const from = Math.sign(b.pv) || -Math.sign(this.dirC(b.vx, b.vz).v) || -1;
    const vel = this.dirC(b.vx, b.vz);
    if (b.y > top) {
      b.vy = Math.abs(b.vy) * 0.35 + 1.0;
      const w = this.dirW(vel.u * 0.6, vel.v * 0.55);
      b.vx = w.x; b.vz = w.z;
      b.y = top + R * 0.45;
    } else {
      const p = this.w(q.u, from * R * 1.05), w = this.dirW(vel.u * 0.5, -vel.v * 0.22);
      b.x = p.x; b.z = p.z; b.vx = w.x; b.vz = w.z;
    }
    if (!this.netHit) audio.thud();
    this.netHit = true;
  }
  // The four players' bodies: the ball off them (Stig's walking into it pushes it along). Not the one who
  // just touched it (it leaves from inside his reach), nor the ball waiting for Stig's serve.
  bodies() {
    const g = this.g, b = this.b, R = this.cfg.ball.r;
    if (this.mode === 'serve' && this.next === 'us') return;
    const who = this.playing || this.mode === 'end' || this.mode === 'rematch' ? ['stig', ...AI] : ['stig'];
    for (const key of who) {
      if (this.touch?.who === key && g.time - this.touch.t < 0.4) continue;
      const n = this.npc(key);
      if (!n || n.state === 'hidden' || n.state === 'seated' || (key === 'stig' && g.playerCar)) continue;
      if (b.y - R > n.y + n.height || b.y + R < n.y) continue;
      const dx = b.x - n.x, dz = b.z - n.z, d = Math.hypot(dx, dz), m = n.r + R;
      if (d >= m || d < 1e-4) continue;
      const nx = dx / d, nz = dz / d;
      b.x = n.x + nx * m; b.z = n.z + nz * m;
      const rv = (b.vx - n.vx) * nx + (b.vz - n.vz) * nz;
      if (rv < 0) {
        b.vx -= nx * rv * 1.4; b.vz -= nz * rv * 1.4;
        if (b.landed && b.vy === 0 && Math.hypot(n.vx, n.vz) > 1) b.vy = 1.2;   // a dribble hops a little
      }
    }
  }
  // Cars knock it on (never an obstacle to them).
  cars() {
    const g = this.g, b = this.b, R = this.cfg.ball.r;
    for (const car of g.cars) {
      if (car.dead || !car.root.visible || Math.abs(car.x - b.x) > 6 || Math.abs(car.z - b.z) > 6) continue;
      if (b.y - R > car.y + car.height || !circleVsObb(b.x, b.z, R, car.obb, _h)) continue;
      b.x += _h.nx * _h.depth; b.z += _h.nz * _h.depth;
      const sp = Math.hypot(car.vx, car.vz);
      if (sp > 0.5) {
        b.vx = car.vx * 1.3 + _h.nx * 2; b.vz = car.vz * 1.3 + _h.nz * 2; b.vy = 2.5 + sp * 0.25;
        b.landed = this.mode !== 'rally';
        audio.kick();
      }
    }
  }
  // Held by a server: in his raised hands.
  hold() {
    const b = this.b, n = this.npc(b.held);
    if (!n) { b.held = null; return; }
    const fx = Math.sin(n.yaw), fz = Math.cos(n.yaw);
    b.x = n.x + fx * 0.12; b.z = n.z + fz * 0.12; b.y = n.y + n.height + 0.12;
    b.vx = b.vy = b.vz = 0;
  }

  // ---- the points --------------------------------------------------------------------------------------
  onLand() {
    if (this.mode !== 'rally' || !this.touch) return;
    const b = this.b, R = this.cfg.ball.r, side = this.sideOf(b.x, b.z);
    if (this.inCourt(b.x, b.z, R * 0.5)) {
      if (side !== this.touch.team) this.point(this.touch.team, 'in');
      else this.point(side === 'us' ? 'them' : 'us', this.touch.kind === 'fault' ? 'fault' : this.netHit ? 'net' : 'miss');
    } else this.point(this.touch.team === 'us' ? 'them' : 'us', this.touch.kind === 'fault' ? 'fault' : this.netHit ? 'net' : 'out');
  }
  // In a rally: stuck (a roof, a boat), off too far, or in the hands of nobody for too long.
  tickRally() {
    const b = this.b;
    if (this.rallyT > this.cfg.stall || dist(b.x, b.z, this.F.x, this.F.z) > this.cfg.farR) this.point(this.touch?.team === 'them' ? 'us' : 'them', 'out');
  }
  point(team, why) {
    const g = this.g, c = this.cfg;
    this.score[team === 'us' ? 0 : 1]++;
    this.thirst++;
    this.next = team;
    if (team === 'them') this.server = this.server === 'berra' ? 'robban' : 'berra';   // they take turns
    this.why = c.why[why] || null;
    this.plan = null;
    this.toss = null;
    this.tired = 0;
    this.touch = null;
    this.swingT = 0;
    this.log.push({ team, why, score: this.score.slice() });
    this.last = { kind: 'point', team, why, score: this.score.slice(), t: g.time };
    audio.whistle();
    const [a, bb] = this.score;
    if (a >= c.winTo || bb >= c.winTo) { this.finish(a >= c.winTo ? 'us' : 'them'); return; }
    const list = team === 'us' ? c.ours : c.theirs, [who, text] = list[((team === 'us' ? a : bb) - 1) % list.length];
    if (team === 'us' || Math.random() < 0.6) this.say(who, text, 0.5);
    const th = c.thirst[this.thirst / 2 - 1];
    if (this.thirst % 2 === 0 && th) for (const [d, w, l] of th) this.say(w, l, 1.6 + d);
    this.setMode('point');
  }
  tickPoint() {
    const c = this.cfg;
    if (!this.toss && this.t >= c.tossAt) this.tossBall();
    if (this.toss?.to && this.toss.to !== 'us') {
      const n = this.npc(this.toss.to), b = this.b;
      if (!b.held && (this.toss.T <= this.t - c.tossAt || (b.vy < 0 && Math.hypot(b.x - n.x, b.z - n.z, b.y - n.y - n.height) < 1.0))) { b.held = this.toss.to; b.landed = true; }
    }
    if (this.t >= c.pointSecs) {
      this.why = null;
      const b = this.b;
      if (this.next === 'them' && !b.held) b.held = this.server;
      this.setMode('serve');
    }
  }
  // The ball to the next server: on the sand before Stig, or into Berra's or Robban's hands at his spot.
  tossBall() {
    const g = this.g, c = this.cfg, p = g.player, [W] = c.court;
    if (this.next === 'us') {
      const sp = this.c(p.x, p.z), onOurs = Math.abs(sp.u) <= W + 1 && sp.v < -0.4 && sp.v > -c.court[1] - 2;
      const u = onOurs ? clamp(sp.u, -W + 0.4, W - 0.4) : c.marks.stig[0], v = onOurs ? clamp(sp.v + 0.9, -3.6, -0.8) : c.marks.stig[1] + 0.9;
      this.launch(u, v, Math.max(2.4, this.b.y - this.F.y + 0.6));
      this.toss = { to: 'us', T: 0 };
    } else {
      const s = c.serveSpot[this.server], b = this.b;
      this.launch(s[0], s[1], Math.max(3.0, b.y - this.F.y + 0.6));
      const at = this.predict(this.F.y + 2.0);
      this.toss = { to: this.server, T: at ? at.t : 1 };
    }
    this.b.landed = true;   // no point on the way
  }
  tickServe() {
    const g = this.g, c = this.cfg;
    if (this.next === 'them') {
      const key = this.server, n = this.npc(key), s = this.w(...c.serveSpot[key]);
      if (!this.b.held) this.b.held = key;
      if (n && dist(n.x, n.z, s.x, s.z) < 0.4 && this.t >= c.them.serveHold) this.theirServe(key);
      else if (n && this.t < c.them.serveHold + 4) this.pose(key, 'up', 0.15);
      else this.theirServe(key);   // held up on the way: from where he stands
    } else {
      // The ball for Stig's serve off his half (pushed, knocked): back on the sand before him.
      const b = this.b, q = this.c(b.x, b.z), p = g.player, sp = this.c(p.x, p.z), [W, L] = c.court;
      if (b.landed && Math.hypot(b.vx, b.vz) < 0.05 && (q.v > -0.3 || q.v < -L - 2 || Math.abs(q.u) > W + 2)) {
        const onOurs = Math.abs(sp.u) <= W + 1 && sp.v < -0.4 && sp.v > -L - 2;
        const s = this.w(onOurs ? clamp(sp.u, -W + 0.4, W - 0.4) : c.marks.stig[0], onOurs ? clamp(sp.v + 0.9, -3.6, -0.8) : c.marks.stig[1] + 0.9);
        this.placeBall(s.x, s.z);
      }
      if (!this.hinted && this.t >= c.serveHintSecs) { this.hinted = true; hud.toast(c.serveHint); }
    }
  }
  tickLeave(dt) {
    const g = this.g, p = g.player, c = this.cfg;
    if (!this.mode) return;
    if (g.shame.pursuit) { this.end('pursuit'); return; }
    const off = g.playerCar || !this.inCourt(p.x, p.z, c.leaveR);
    this.outT = off ? this.outT + dt : 0;
    if (this.outT >= c.leaveSecs) this.end('leave');
  }

  // ---- start, end ------------------------------------------------------------------------------------
  promptAt() {
    const g = this.g, p = g.player, b = this.b;
    if (this.mode === 'rematch') return this.inCourt(p.x, p.z, 2) ? { x: p.x, z: p.z, y: p.y } : null;
    return this.mode ? null : { x: b.x, z: b.z, y: b.y - this.cfg.ball.r };
  }
  // A cast member we may take: shown and standing, not walked or held by anyone, not the idle mission's.
  free(key) {
    const g = this.g, n = g.npcs[key], cur = g.missions.current;
    if (!n || n.state !== 'normal' || !n.root.visible || n.busy || n.car || n.seatId || n.steer || g.npcPosed(key) || !g.honk.free(key)) return false;
    if (cur && cur.level === g.level && (cur.giver === key || cur.extra?.some((e) => e === key || (Array.isArray(e) && e[0] === key)))) return false;
    return true;
  }
  stigFree() {
    const g = this.g, p = g.player;
    return !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying && p.state === 'normal' && p.onGround && !g.shame.pursuit
      && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter
      && !g.toasters.active && !g.skis.on && !g.gatlopp.mode && !g.fiske.busy && !g.kikare.busy && !g.hitch.busy && !g.dream.busy && !g.battur.busy && !g.hytt.busy && !g.packhus.busy;
  }
  canStart() {
    const b = this.b;
    return this.live && !this.mode && !this.walk && this.stigFree() && !b.held && this.inCourt(b.x, b.z, 1.5) && AI.every((k) => this.free(k));
  }
  canRematch() { return this.live && this.mode === 'rematch' && this.stigFree(); }

  // E: Stig held through a black fade; the others are ours from now.
  start() {
    if (!this.canStart()) return false;
    const g = this.g;
    for (const key of AI) this.take(key);
    this.begin();
    return true;
  }
  rematch() {
    if (!this.canRematch()) return false;
    this.begin();
    return true;
  }
  begin() {
    const g = this.g, p = g.player;
    p.vx = p.vz = p.wishX = p.wishZ = 0;
    g.frozenT = this.cfg.fadeSecs + 0.3;
    hud.fade(true);
    this.lines.length = 0;
    this.setMode('fade');
    this.last = { kind: 'fade', t: g.time };
  }
  take(key) {
    const g = this.g, n = g.npcs[key];
    g.unsay(n);
    n.busy = true;
    n.spot = null;
    n.steer = () => this.steer(key);
    this.held[key] = true;
  }
  // Behind the black: everyone on their marks, the ball on the sand before Stig, the camera behind him.
  place() {
    const g = this.g, c = this.cfg, p = g.player, f = this.F;
    for (const [key, [u, v]] of Object.entries(c.marks)) {
      const q = this.w(u, v), yaw = v < 0 ? f.yaw : f.yaw + Math.PI;
      if (key === 'stig') { p.teleport(q.x, q.z, yaw); p.wishX = p.wishZ = 0; continue; }
      const n = g.npcs[key];
      n.state = 'normal';
      n.root.visible = true;
      n.teleport(q.x, q.z, yaw);
      n.anim.volley = false;
    }
    const s = this.w(c.marks.stig[0], c.marks.stig[1] + 0.9);
    this.placeBall(s.x, s.z);
    g.cam.yaw = f.yaw;
    g.cam.snapNext = true;
    g.frozenT = 0;
    hud.fade(false);
    this.score = [0, 0];
    this.thirst = 0;
    this.next = 'us';
    this.server = 'robban';
    this.touch = null;
    this.plan = null;
    this.why = null;
    this.tired = 0;
    this.hinted = false;
    this.outT = 0;
    this.log = [];
    hud.showBanner(c.banner[0], c.banner[1], '', 2200);
    for (const [d, w, l] of c.intro) this.say(w, l, d);
    this.setMode('serve');
    this.last = { kind: 'start', t: g.time };
  }
  // First to five: the banner, the record, the lines.
  finish(team) {
    const g = this.g, c = this.cfg, e = team === 'us' ? c.win : c.lose, [a, b] = this.score;
    const rec = (g.records.volley ||= { won: 0, lost: 0 });
    if (team === 'us') rec.won = (rec.won || 0) + 1; else rec.lost = (rec.lost || 0) + 1;
    g.save();
    hud.showBanner(e.banner[0], fmt(e.banner[1], { a, b }), team === 'us' ? 'good' : '', 3200);
    audio.jingle(team === 'us' ? 'complete' : 'fail');
    if (team === 'us') audio.applause(1.5);
    for (const [d, w, l] of e.lines) this.say(w, l, d);
    this.plan = null;
    this.result = team;
    this.setMode('end');
    this.last = { kind: 'end', team, score: this.score.slice(), t: g.time };
  }
  afterEnd() {
    if (this.result === 'them') { this.setMode('rematch'); return; }
    this.walkOff();
    this.release('ole');
    this.setMode(null);
  }
  tickRematch() {
    const g = this.g, p = g.player;
    if (this.t >= this.cfg.rematchSecs || g.playerCar || !this.inCourt(p.x, p.z, this.cfg.leaveR) || g.shame.pursuit) {
      this.walkOff();
      this.release('ole');
      this.setMode(null);
    }
  }
  // Q, off the court, a warp, a pursuit: the match is off, and Berra and Robban go to the bar.
  giveUp() { if (this.playing && this.mode !== 'fade') this.end('quit'); }
  end(kind) {
    const g = this.g;
    if (!this.mode) return;
    if (this.mode === 'fade') { hud.fade(false); g.frozenT = 0; }
    this.last = { kind: 'abort', why: kind, score: this.score.slice(), t: g.time };
    const bb = this.b;
    if (bb.held) { bb.held = null; bb.landed = true; }
    this.lines.length = 0;
    if (kind !== 'warp') for (const [d, w, l] of this.cfg.quit.lines) this.say(w, l, d);
    this.walkOff();
    this.release('ole');
    this.plan = null;
    this.setMode(null);
  }
  // A mission start or the other level: everything off at once, everyone home, the ball back.
  reset() {
    const g = this.g;
    if (this.mode === 'fade') { hud.fade(false); g.frozenT = 0; }
    if (this.mode) this.last = { kind: 'gone', t: g.time };
    for (const key of Object.keys(this.held)) this.sendHome(key);
    this.held = {};
    this.walk = null;
    this.lines.length = 0;
    this.plan = null;
    this.why = null;
    this.swingT = 0;
    this.setMode(null);
    this.home();
    hud.setVolley(null);
  }
  setMode(m) { this.mode = m; this.t = 0; }

  // ---- the cast ----------------------------------------------------------------------------------------
  speed(key) {
    if (key === 'ole') return this.cfg.ole.speed;
    return this.cfg.them.speed[key] * Math.max(0.5, 1 - this.cfg.them.slow * this.thirst);
  }
  // Where `key` is going now (world), or null to stand.
  goal(key) {
    const c = this.cfg, plan = this.plan;
    if (this.walk?.keys[key] != null) { const pt = c.walkOff.path[this.walk.keys[key]]; return pt ? this.w(pt[0], pt[1]) : null; }
    if (this.mode === 'fade' || (!this.playing && this.mode !== 'rematch' && this.mode !== 'end')) return null;
    if (this.mode === 'rally' && plan?.chaser === key && !this.b.landed) return this.g.time >= plan.go ? plan.hit : null;
    if ((this.mode === 'serve' || this.mode === 'point') && this.next === 'them' && key === this.server) return this.w(...c.serveSpot[key]);
    if (key === 'ole') {
      const s = this.c(this.g.player.x, this.g.player.z), [bu, bv] = c.ole.base;
      return this.w((s.u > 0.3 ? -1 : 1) * bu, bv);
    }
    return this.w(...c.marks[key]);
  }
  // n.steer (main.fixedStep): towards the goal, slowing in the last metre.
  steer(key) {
    if (!this.live) return null;
    const n = this.g.npcs[key], q = this.goal(key);
    if (!n || !q || n.state !== 'normal') return null;
    const dx = q.x - n.x, dz = q.z - n.z, d = Math.hypot(dx, dz);
    if (d < 0.15) return null;
    const sp = Math.min(this.walk?.keys[key] != null ? this.cfg.walkOff.speed : this.speed(key), d * 3.5);
    return { x: (dx / d) * sp, z: (dz / d) * sp };
  }
  // Standing, they watch the ball (on the walk off, the way they go).
  face(dt) {
    const b = this.b;
    for (const key of Object.keys(this.held)) {
      const n = this.npc(key);
      if (!n || n.state !== 'normal' || this.walk?.keys[key] != null || Math.hypot(n.vx, n.vz) > 0.4) continue;
      const want = b.held === key ? this.F.yaw + Math.PI : yawTo(b.x - n.x, b.z - n.z);
      n.yaw += Math.atan2(Math.sin(want - n.yaw), Math.cos(want - n.yaw)) * Math.min(1, dt * 5);
    }
  }
  pose(key, flag, secs) {
    const n = this.npc(key);
    if (!n) return;
    n.anim.volley = flag;
    n.volleyT = this.g.time + secs;
  }
  // Berra and Robban off along the path towards the bar; theirs again when there, or after `secs`.
  walkOff() {
    const keys = {};
    for (const key of ['berra', 'robban']) if (this.held[key]) { keys[key] = 0; this.npc(key).anim.volley = false; }
    this.walk = Object.keys(keys).length ? { t: 0, keys } : null;
  }
  tickWalk(dt) {
    const w = this.walk, c = this.cfg.walkOff;
    w.t += dt;
    for (const key of Object.keys(w.keys)) {
      const n = this.npc(key), pt = c.path[w.keys[key]];
      if (pt) { const q = this.w(pt[0], pt[1]); if (dist(n.x, n.z, q.x, q.z) < 0.6) w.keys[key]++; }
      if (!c.path[w.keys[key]] || w.t > c.secs || n.state !== 'normal') { delete w.keys[key]; this.release(key); }
    }
    if (!Object.keys(w.keys).length) this.walk = null;
  }
  // Ours no longer: placeNpcs puts them home once Stig is away.
  release(key) {
    const n = this.g.npcs[key];
    delete this.held[key];
    if (!n) return;
    delete n.steer;
    n.anim.volley = false;
    n.busy = false;
    n.spot = null;
  }
  // Home at once (out of free roam), as placeNpcs puts them.
  sendHome(key) {
    const g = this.g, n = g.npcs[key];
    this.release(key);
    if (!n) return;
    const h = key in g.homeOverrides ? g.homeOverrides[key] : g.levelDef?.homes(g)?.[key];
    if (!Array.isArray(h) || n.state === 'hidden') return;
    const q = g.lmOffset(h[0], h[1] ?? 0, h[2] ?? 0);
    n.state = 'normal';
    n.root.visible = true;
    n.teleport(q.x, q.z, h[3] ?? q.yaw);
    n.homeX = q.x; n.homeZ = q.z;
    n.spot = `${h[0]}:${h[1] ?? 0}:${h[2] ?? 0}`;
  }
  // Out of a match, the ball off the court and Stig well away: back on the court.
  tickHome() {
    const g = this.g, f = g.focus(), b = this.b, q = this.w(...this.cfg.rest);
    if (b.held || this.atRest()) return;
    if (dist(f.x, f.z, b.x, b.z) > this.cfg.homeR && dist(f.x, f.z, q.x, q.z) > this.cfg.homeR) this.home();
  }

  // ---- what shows ----------------------------------------------------------------------------------------
  say(who, text, delay = 0) { this.lines.push({ at: this.g.time + delay, who, text }); }
  sayDue() {
    const g = this.g;
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i];
      if (l.at > g.time) continue;
      this.lines.splice(i--, 1);
      const n = this.npc(l.who);
      if (!n || n.state === 'hidden') continue;
      g.say(n, l.text, 2.4);
      if (n !== g.player) n.chatT = 8 + Math.random() * 3;
    }
    for (const key of AI) { const n = this.npc(key); if (n?.anim.volley && g.time >= (n.volleyT ?? 0) && !(this.mode === 'serve' && key === this.server && this.next === 'them' && this.b.held === key)) n.anim.volley = false; }
  }
  board() {
    const c = this.cfg, on = this.playing && this.mode !== 'fade' || this.mode === 'end';
    hud.setVolley(on ? { us: c.board.us, them: c.board.them, a: this.score[0], b: this.score[1], sub: fmt(c.board.sub, { n: c.winTo }), why: this.mode === 'point' ? this.why : null } : null);
  }
  hint() { return this.playing && this.mode !== 'fade' && !this.g.inDialog ? this.cfg.keys : null; }
  draw(dt) {
    const b = this.b, R = this.cfg.ball.r, m = this.mesh;
    m.position.set(b.x, b.y, b.z);
    const sp = Math.hypot(b.vx, b.vz);
    if (sp > 0.05 && !b.held) {
      _ax.set(b.vz, 0, -b.vx).normalize();
      _q.setFromAxisAngle(_ax, (sp / R) * dt);
      m.quaternion.premultiply(_q);
    }
    const gy = groundAt(b.x, b.z, b.y - R, 0.3), hgt = Math.max(0, b.y - R - gy), k = clamp(1 - hgt / 6, 0.35, 1);
    this.shadow.position.set(b.x, gy + 0.035, b.z);
    this.shadow.scale.setScalar(R * 1.05 * k);
    this.shadow.material.opacity = 0.32 * k;
    // The landing ring on Stig's half while a ball comes down there.
    const pl = this.plan, ring = this.mode === 'rally' && !b.landed && pl?.side === 'us' && hgt > 0.6;
    this.ring.visible = !!ring;
    if (ring) this.ring.position.set(pl.land.x, this.F.y + 0.04, pl.land.z);
  }
}
