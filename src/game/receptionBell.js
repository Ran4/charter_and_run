// Ringklockan i receptionen – "Och när ska vi lämna rummen?" (free roam; feature 59, DESIGN §10.37).
// At the porter's desk in Hotel Flamenco's reception three departing guests (last week's, not Stig's
// party) queue with their suitcases, and now and then one asks when the rooms are to be left; the
// porter answers "Momento." E at the bell on the desk plings it, and the porter answers "Momento." each
// time, until the tenth pling in a row: he turns to the key board and rings for the site manager, Lasse
// answers in the radio box ("Klockan 12. Ställ väskorna utanför receptionen."), the first guest asks
// again at once, Stig mumbles "Förlåt…" and the porter puts the bell under the desk. Once Stig has been
// away it is back, with the hotel's hand-written card beside it: PLINGA EN GÅNG · TOQUE UNA VEZ. Only
// on the island with no mission running (`missions.state === 'idle'`): a mission start or the other
// level takes the queue, its suitcases' solids and the card away at once and puts the bell back on the
// desk (the world as before), so no mission, timer or calibration pool sees any of it. Nothing is saved.
// Config: RINGKLOCKA (content/island.js). The bell is this module's mesh (no longer the desk's static
// geometry, world/blocks/hotels.js). Owned by Game as `bell`: main.js calls `update` once a frame and
// `step` in its fixed step, counts `extras` (the queue's guests) as people and asks `posed(key)` (the
// porter on the phone) in npcPosed.

import { RINGKLOCKA } from '../content/index.js';
import { THREE, camera, scene, GeoBuilder, toonMesh, signMesh } from '../gfx.js';
import { Character } from '../actors/character.js';
import { randomPed } from '../actors/models.js';
import { circle, groundAt } from '../world/collision.js';
import { lm } from '../world/layout.js';
import { blockCentre } from '../world/landmarks-island.js';
import { audio } from '../audio.js';
import { dist, yawTo, dampAngle, mulberry32, pick, randRange } from '../util.js';

const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere(), _v = new THREE.Vector3();
const GOLD = 0xf2c12e, IRON = 0x2a2622, CHROME = 0xc8ccd2;

// A desk bell: a black base, the gold dome, and the plunger on top (its own mesh: it dips on a pling).
function bellMesh() {
  const g = new GeoBuilder();
  g.cyl(IRON, 0, 0.014, 0, 0.115, 0.028, 18);
  g.sphere(GOLD, 0, 0.026, 0, 0.2, 0.15, 0.2, 0, 0, 0, 18);
  const group = new THREE.Group();
  group.add(toonMesh(g.build(), { outline: 0.008, cast: false }));
  const p = new GeoBuilder();
  p.cyl(CHROME, 0, 0.012, 0, 0.009, 0.03, 8);
  p.sphere(IRON, 0, 0.032, 0, 0.034, 0.022, 0.034);
  const plunger = toonMesh(p.build(), { outline: 0.005, cast: false });
  plunger.position.y = 0.1;
  group.add(plunger);
  return { group, plunger };
}

// A suitcase standing on end: the body, two straps, the handle on top and a yellow tag.
function caseMesh(color) {
  const g = new GeoBuilder();
  g.boxB(color, 0, 0, 0, 0.62, 0.74, 0.25);
  for (const x of [-0.17, 0.17]) g.boxB(0xd8b48a, x, 0, 0, 0.055, 0.745, 0.262);
  for (const x of [-0.09, 0.09]) g.boxB(0x3a2a1e, x, 0.74, 0, 0.03, 0.07, 0.04);
  g.boxB(0x3a2a1e, 0, 0.8, 0, 0.22, 0.04, 0.05);
  g.box(0xf7c31b, 0.24, 0.52, 0.13, 0.1, 0.08, 0.01);
  return toonMesh(g.build(), { outline: 0.012 });
}

// The hotel's card: a folded tent card on the counter, its front leaning back, in blue felt pen.
function signCard(text) {
  const group = new THREE.Group(), W = 0.56, H = 0.25, lean = 0.28;
  const g = new GeoBuilder();
  g.box(0xfffaf0, 0, (H / 2) * Math.cos(lean), -(H / 2) * Math.sin(lean), W, H, 0.008, 0, lean);   // the back leaf
  group.add(toonMesh(g.build(), { outline: 0.006, cast: false }));
  const face = signMesh(text, W, H, { bg: '#fffaf0', fg: '#1c4f8a', stroke: '#1c4f8a', border: null, scale: 0.7, font: '"Nunito", sans-serif' });
  face.position.set(0, (H / 2) * Math.cos(lean), (H / 2) * Math.sin(lean));
  face.rotation.x = -lean;
  group.add(face);
  return group;
}

export class ReceptionBell {
  constructor(game, cfg = RINGKLOCKA) {
    this.g = game;
    this.cfg = cfg;
    const c = blockCentre(cfg.block[0], cfg.block[1]);
    this.ox = c.x; this.oz = c.z;
    this.bellAt = this.at(cfg.bell);
    this.count = 0;            // plings since the last answer (the session's; a mission start clears it)
    this.phase = 'bell';       // bell (on the desk) | call (the goal-th pling's answer under way) | away (under the desk)
    this.signed = false;       // the hotel's card beside the bell, from the bell's first return (the session's)
    this.signOn = false;       // the card shown now
    this.plingT = -Infinity;   // g.time of the last pling
    this.tapT = 0;             // s left of Stig's hand at the bell
    this.dipT = 0;             // s left of the plunger down
    this.callT = 0;            // s into the call (held while a dialogue is up)
    this.callDone = new Set(); // its steps done
    this.porterFace = null;    // the porter's turn in the call: 'back' | 'front' | 'bell' | null
    this.takeT = -1;           // s into the bell's way under the desk (-1: not under way)
    this.timers = [];          // [{ at, fn }] on g.time: the porter's answers
    this.shown = false;        // the queue out (and its suitcases solid)
    this.guests = null;        // [{ ch, spot: { x, z, yaw }, lookT, stuckT }], made at the first show
    this.extras = [];          // the shown guests (main.js counts them as people)
    this.askAt = Infinity;     // g.time of the queue's next question
    this.nearQ = false;        // Stig within askR of the porter last frame
    this.on = false;           // live last frame
    this.cutT = 0;             // s left in which bodies may come and go in view (after a cut)
    this.fx = 0; this.fz = 0;
    this.last = null;          // tests: the last pling { n, t, call }
    this.said = [];            // tests: [who, text, g.time]
    this.anchor = { x: this.bellAt.x, y: cfg.top, z: this.bellAt.z, height: 0.3 };   // the "*pling*" bubble's

    const b = bellMesh();
    this.bellMesh = b.group;
    this.plunger = b.plunger;
    this.bellMesh.position.set(this.bellAt.x, cfg.top, this.bellAt.z);
    scene.add(this.bellMesh);
    const sp = this.at(cfg.sign);
    this.card = signCard(cfg.signText);
    this.card.position.set(sp.x, cfg.top, sp.z);
    this.card.rotation.y = 0.35;   // turned a little towards the bell's side
    this.card.visible = false;
    scene.add(this.card);

    // The queue's spots (the first faces the porter, each other the one ahead) and the suitcases at
    // their right hands; a suitcase's solid is live only while the queue is out (its `dead` asks).
    const q = cfg.queue, home = lm(cfg.lm);
    this.spots = q.spots.map((s, k) => {
      const p = this.at(s), ahead = k ? this.at(q.spots[k - 1]) : home;
      return { x: p.x, z: p.z, yaw: yawTo(ahead.x - p.x, ahead.z - p.z) };
    });
    this.cases = this.spots.map((s, k) => {
      const x = s.x - Math.cos(s.yaw) * q.caseOut, z = s.z + Math.sin(s.yaw) * q.caseOut, y = groundAt(x, z, 0.2, 0.6);
      const mesh = caseMesh(q.cases[k % q.cases.length]);
      mesh.position.set(x, y, z);
      mesh.rotation.y = s.yaw - Math.PI / 2;   // the broad side out, to his right
      mesh.visible = false;
      scene.add(mesh);
      const block = circle(x, z, q.caseR, y + 0.82, 'prop');
      Object.defineProperty(block, 'dead', { get: () => !this.shown, set() {}, configurable: true });
      return { x, z, mesh, block };
    });

    // Through a pling's `rest` and the call it keeps E (with no prompt in the call), so the toaster
    // beside it (`brodrost_portier`, the same priority) never takes a quick second press.
    const self = this;
    game.addInteractable({
      id: 'ringklocka', r: cfg.r, priority: cfg.priority,
      get prompt() { return self.phase === 'bell' ? cfg.prompt : ''; },
      pos: () => ({ x: this.bellAt.x, z: this.bellAt.z, y: cfg.top }),
      enabled: () => this.holds(),
      use: () => this.pling(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get porter() { return this.g.npc(this.cfg.porter); }
  at(p) { return { x: this.ox + p[0], z: this.oz + p[1] }; }
  // main.js npcPosed: the porter while he rings and puts the bell away (no turn to Stig, no chatter).
  posed(key) { return key === this.cfg.porter && this.phase === 'call'; }

  // At his desk: shown, standing, nobody's (not busy, walked or posed), the horn's answer done.
  porterFree() {
    const g = this.g, n = this.porter, h = lm(this.cfg.lm);
    return !!n && n.state === 'normal' && n.root.visible && !n.busy && !n.car && !n.seatId && !n.steer
      && !g.npcPosed(this.cfg.porter) && g.honk.free(this.cfg.porter) && dist(n.x, n.z, h.x, h.z) < this.cfg.porterR;
  }
  // Stig on foot on the floor (not on the pergola over it): no scene, car, carry, pursuit, bust,
  // PANIK, pool-fest ring, belt, talk with the gang, nap, sun cream, toaster's try or gag.
  stigFree() {
    const g = this.g, p = g.player;
    return this.live && !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying && p.state === 'normal' && p.onGround
      && p.y < this.cfg.top && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !g.fest.joined
      && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active && !g.gags.run;
  }
  // The interactable's: the bell on the desk with the porter at it, or the call under way.
  holds() { return this.phase === 'call' ? this.stigFree() : this.phase === 'bell' && this.stigFree() && this.porterFree(); }
  // A pling now: the bell on the desk and `rest` s since the last.
  canUse() { return this.phase === 'bell' && this.g.time - this.plingT >= this.cfg.rest && this.holds(); }

  // Out of the camera's view (or more than popR m from it), or just after a cut: a body may come or go.
  seen(x, y, z, r = 1.2) { return _frustum.intersectsSphere(_sphere.set(_sphere.center.set(x, y, z), r)); }
  mayPop(x, y, z, r) { return this.cutT > 0 || camera.position.distanceTo(_v.set(x, y, z)) > this.cfg.popR || !this.seen(x, y, z, r); }

  say(target, who, text, secs) { this.g.say(target, text, secs); this.said.push([who, text, +this.g.time.toFixed(2)]); }
  // A scene or a talk with the gang (§10.28) under way: the queue and the porter keep quiet.
  get hush() { return this.g.inDialog || this.g.chat.busy; }
  porterSays(text) {
    const n = this.porter, h = lm(this.cfg.lm);
    if (this.live && !this.hush && n && n.state === 'normal' && n.root.visible && dist(n.x, n.z, h.x, h.z) < this.cfg.porterR) this.say(n, this.cfg.porter, text, 1.6);
  }
  later(secs, fn) { this.timers.push({ at: this.g.time + secs, fn }); }

  // ---------------------------------------------------------------------------------------------
  // The bell.

  pling() {
    const g = this.g, c = this.cfg, p = g.player, b = this.bellAt;
    if (!this.canUse()) return;
    this.plingT = g.time;
    this.count++;
    p.yaw = yawTo(b.x - p.x, b.z - p.z);
    p.anim.tap = true;
    this.tapT = c.tapSecs;
    this.dipT = 0.14;
    audio.pling();
    this.say(this.anchor, 'bell', c.pling, 0.8);
    this.last = { n: this.count, t: g.time, call: this.count >= c.goal };
    if (this.count >= c.goal) { this.startCall(); return; }
    this.later(c.answerAt, () => this.porterSays(c.momento));
    // From the lookFrom-th pling on the queue turns to look at him.
    if (this.count >= c.queue.lookFrom && this.shown) for (const q of this.guests) q.lookT = c.queue.lookSecs;
  }

  startCall() {
    this.phase = 'call';
    this.count = 0;
    this.callT = 0;
    this.callDone.clear();
    this.timers.length = 0;
    this.g.unsay(this.porter);
  }
  // The goal-th pling's answer, step by step on its own clock (held while a scene or a talk is up).
  tickCall(dt) {
    const g = this.g, c = this.cfg, s = c.call;
    if (this.hush) return;
    this.callT += dt;
    const due = (id) => this.callT >= s[id] && !this.callDone.has(id) && this.callDone.add(id);
    if (due('turn')) this.porterFace = 'back';
    if (due('ring')) audio.phone();
    if (due('lasse')) { g.radio('lasse', c.lasse); this.said.push(['lasse', c.lasse, +g.time.toFixed(2)]); }
    if (due('back')) this.porterFace = 'front';
    if (due('ask')) {
      const q = this.shown && this.guests.find((x) => x.ch.state === 'normal');
      if (q) this.say(q.ch, 'gäst', c.ask, 2.4);
    }
    if (due('sorry')) {
      const p = g.player, b = this.bellAt;
      if (!g.playerCar && p.state === 'normal' && dist(p.x, p.z, b.x, b.z) < c.sorryR) this.say(p, 'stig', c.sorry, 1.8);
    }
    if (due('take')) { this.porterFace = 'bell'; this.takeT = 0; }
    if (due('done')) this.endCall();
  }
  endCall() {
    const q = this.cfg.queue;
    this.phase = 'away';
    this.porterFace = null;
    this.takeT = -1;
    this.bellMesh.visible = false;
    this.askAt = this.g.time + randRange(q.every[0], q.every[1]);   // the queue's next question a while after its last
  }
  // The bell back on the desk (and the card beside it once it has been away).
  bellBack() {
    if (this.phase === 'away') this.signed = true;
    this.phase = 'bell';
    this.takeT = -1;
    this.dipT = 0;
    this.bellMesh.position.set(this.bellAt.x, this.cfg.top, this.bellAt.z);
    this.plunger.position.y = 0.1;
    this.bellMesh.visible = true;
  }

  tickBell(dt) {
    const g = this.g, c = this.cfg, p = g.player, b = this.bellAt;
    if (this.tapT > 0 && (this.tapT -= dt) <= 0) p.anim.tap = false;
    if (this.dipT > 0) this.dipT -= dt;
    this.plunger.position.y = this.dipT > 0 ? 0.082 : 0.1;
    if (this.phase === 'call') this.tickCall(dt);
    // On its way under the desk: up off the counter, over to his side and down behind its edge.
    if (this.takeT >= 0) {
      const k = Math.min(1, (this.takeT += dt) / c.call.takeSecs);
      this.bellMesh.position.set(b.x - 0.7 * k, c.top + 0.16 * Math.sin(Math.PI * Math.min(1, k / 0.7)) - 0.7 * Math.max(0, k - 0.6) / 0.4, b.z - 0.4 * k);
      if (k >= 1) { this.bellMesh.visible = false; this.takeT = -1; }
    }
    // Back once he has been away, with the desk out of view.
    if (this.phase === 'away' && dist(p.x, p.z, b.x, b.z) >= c.backR && this.mayPop(b.x, c.top, b.z, 0.6)) this.bellBack();
    if (this.signed && !this.signOn && this.mayPop(b.x, c.top, b.z, 1.0)) this.signOn = true;
    this.card.visible = this.signOn;
    // The porter's turns in the call.
    const n = this.porter;
    if (this.porterFace && n && n.state === 'normal') {
      const h = lm(c.lm);
      const yaw = this.porterFace === 'bell' ? yawTo(b.x - n.x, b.z - n.z) : (h.yaw || 0) + (this.porterFace === 'back' ? Math.PI : 0);
      n.yaw = dampAngle(n.yaw, yaw, 8, dt);
    }
    for (let k = this.timers.length - 1; k >= 0; k--) {
      const t = this.timers[k];
      if (g.time >= t.at) { this.timers.splice(k, 1); t.fn(); }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The queue.

  ensureGuests() {
    if (this.guests) return;
    let seed = this.cfg.queue.seed;
    this.guests = this.spots.map((spot) => {
      let def;
      for (;;) { def = randomPed(mulberry32(seed++)); if (!def.local) break; }
      delete def.held;
      const ch = new Character(def);
      ch.state = 'hidden';
      ch.root.visible = false;
      scene.add(ch.root);
      return { ch, spot, lookT: 0, stuckT: 0 };
    });
  }
  // Berra carried home to this desk (the Berra job's scene, §10.6): it places Robban among the spots,
  // so the queue steps aside at its cut.
  get deskScene() { const b = this.g.berraJob; return b.busy && b.phase === 'carry'; }
  // Every spot and suitcase out of view, and Stig clear of them; no scene at the desk.
  mayShow() {
    const p = this.g.player, m = this.spots[1];
    if (this.deskScene) return false;
    if (!this.mayPop(m.x, 1, m.z, 3.2)) return false;
    return [...this.spots, ...this.cases].every((s) => dist(s.x, s.z, p.x, p.z) > 1.2);
  }
  showQueue() {
    this.ensureGuests();
    for (const q of this.guests) {
      const ch = q.ch;
      ch.state = 'normal';
      ch.teleport(q.spot.x, q.spot.z, q.spot.yaw);
      ch.wishX = ch.wishZ = 0;
      ch.root.visible = true;
      q.lookT = 0; q.stuckT = 0;
    }
    for (const s of this.cases) s.mesh.visible = true;
    this.shown = true;
    this.extras = this.guests.map((q) => q.ch);
  }
  hideQueue() {
    for (const q of this.guests || []) {
      const ch = q.ch;
      this.g.unsay(ch);
      ch.wishX = ch.wishZ = 0;
      ch.state = 'hidden';
      ch.root.visible = false;
    }
    for (const s of this.cases) s.mesh.visible = false;
    this.shown = false;
    this.extras = [];
  }

  // main.js fixedStep: back to his spot when pushed off it or up after a kick; standing there, still.
  step(h) {
    if (!this.shown) return;
    const walk = this.cfg.queue.walk;
    for (const q of this.guests) {
      const ch = q.ch;
      if (ch.state === 'normal') {
        const dx = q.spot.x - ch.x, dz = q.spot.z - ch.z, d = Math.hypot(dx, dz);
        const sp = d > 0.12 ? Math.min(walk, 0.4 + d * 1.6) : 0;
        ch.wishX = sp ? (dx / d) * sp : 0; ch.wishZ = sp ? (dz / d) * sp : 0;
      } else ch.wishX = ch.wishZ = 0;
      ch.step(h, this.g);
    }
  }

  tickQueue(dt) {
    const g = this.g, c = this.cfg, q = c.queue, p = g.player, f = g.focus();
    for (const x of this.guests) {
      const ch = x.ch, d = dist(ch.x, ch.z, x.spot.x, x.spot.z);
      if (x.lookT > 0) x.lookT -= dt;
      if (ch.state === 'normal' && d <= 0.12) {
        const yaw = x.lookT > 0 && !g.playerCar ? yawTo(p.x - ch.x, p.z - ch.z) : x.spot.yaw;
        ch.yaw = dampAngle(ch.yaw, yaw, 6, dt);
      }
      // Held somewhere, or far off (a car's knock): back on his spot when nobody sees it.
      x.stuckT = ch.state === 'normal' && d > 0.5 && ch.speed < 0.2 ? x.stuckT + dt : 0;
      if ((x.stuckT > 3 || (d > 30 && ch.state === 'normal')) && this.mayPop(ch.x, ch.y + 1, ch.z) && this.mayPop(x.spot.x, 1, x.spot.z)) {
        ch.teleport(x.spot.x, x.spot.z, x.spot.yaw);
        x.stuckT = 0;
      }
      ch.root.visible = ch.state !== 'hidden' && camera.position.distanceTo(_v.set(ch.x, ch.y, ch.z)) < 170;
      if (ch.root.visible) ch.sync(dt);
    }
    // The question, now and then, while he is near; the porter's own chatter keeps back meanwhile.
    const n = this.porter, h = lm(c.lm), near = dist(f.x, f.z, h.x, h.z) < q.askR;
    if (near && !this.nearQ) this.askAt = g.time + randRange(2.5, 5);
    this.nearQ = near;
    if (!near) return;
    if (n) n.chatT = Math.max(n.chatT ?? 0, 2);
    if (this.hush) this.askAt = Math.max(this.askAt, g.time + 3);
    if (g.time < this.askAt || this.phase === 'call' || g.time - this.plingT < c.quietSecs || !this.porterFree()) return;
    const who = this.guests.filter((x) => x.ch.state === 'normal' && x.ch.root.visible);
    this.askAt = g.time + randRange(q.every[0], q.every[1]);
    if (!who.length) return;
    this.say(pick(who).ch, 'gäst', c.ask, 2.4);
    this.later(q.replyAt, () => this.porterSays(c.momento));
  }

  // ---------------------------------------------------------------------------------------------

  // A mission start or the other level: the queue and the card away, the bell back on the desk, the
  // porter let go, Stig's hand down. The bell back counts as its return (the card comes after).
  reset() {
    const g = this.g;
    this.hideQueue();
    if (this.phase === 'call' && this.callDone.has('take')) this.phase = 'away';
    this.bellBack();
    this.count = 0;
    this.porterFace = null;
    this.timers.length = 0;
    this.signOn = false;
    this.card.visible = false;
    this.tapT = 0;
    g.player.anim.tap = false;
    this.on = false;
  }

  update(dt) {
    const g = this.g;
    if (!this.live) { if (this.on) this.reset(); return; }
    const f = g.focus();
    // A cut (free roam again after a mission or a load, R, a warp): bodies come and go freely a moment.
    if (!this.on || dist(f.x, f.z, this.fx, this.fz) > 15) this.cutT = 0.5;
    this.on = true;
    this.fx = f.x; this.fz = f.z;
    this.cutT -= dt;
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    if (this.shown && this.deskScene) this.hideQueue();
    if (!this.shown && this.mayShow()) this.showQueue();
    if (this.shown) this.tickQueue(dt);
    this.tickBell(dt);
  }
}
