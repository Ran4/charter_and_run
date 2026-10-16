// Badgäster på solstolarna – och stekta Berra och Robban (free roam; feature 32, DESIGN §10.22).
// Tourists lie on the sun loungers nearest Stig and turn red as they lie there: pale, pink, lobster
// red (the skin is baked into a model's vertex colours, so a stage is a rebuilt model, made while it
// is out of view). A kick or a car through a taken lounger is the props' own smash (debris, coins, the
// SKANDAL an empty one gives): the bather goes off it backwards over the backrest with a tourist's
// complaint, gets up with another, stands, and is gone once nobody sees him; a lounger back after its
// smash has someone new on it. Between buss17 and the bodega (friskotek or asnan next) Berra and
// Robban lie lobster red on two pool-deck loungers by BAR PISCINA and snore; E wakes Berra for "five
// minutes more". Only on the island with no mission running (`missions.state === 'idle'`): a mission
// start or the other level takes every bather away and sends Berra and Robban home in their own skin
// at once, so no mission, cutscene, timer or calibration pool sees any of it. Bathers only by day (the
// clock's `dayHours`), and a new crowd every morning. Config: BATHERS (content/island.js). Owned by
// Game as `bathers`: main.js calls `update` once a frame and `step` in its fixed step, adds `loose`
// (the bathers off their loungers) to the people and the kicks, and hands it `onPropBroken` (every
// smashed prop) and `onGetUp` (every body back on its feet; true: a bather, his line said).

import { BATHERS } from '../content/index.js';
import { THREE, camera, scene } from '../gfx.js';
import { Character } from '../actors/character.js';
import { randomPed } from '../actors/models.js';
import { propsOfType } from '../world/props.js';
import { lm } from '../world/layout.js';
import { audio } from '../audio.js';
import { dist, yawTo, dampAngle, mulberry32 } from '../util.js';

const MARK = 'stekt';   // npc.spot while Berra or Robban lies on our lounger (a placement by anyone else clears it)
const PAIR = ['berra', 'robban'];
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere();

// The sun lounger (world/props.js `solstol`) in its own frame: u along its facing (towards the
// backrest), y over its foot. The seat's top; a point on the backrest's face, the face's normal
// (towards the seat) and its slope, which is the lean of a body lying on it.
const SEAT_Y = 0.395, BACK_U = 0.636, BACK_Y = 0.596, LEAN = -0.75, BACK_NU = Math.sin(LEAN), BACK_NY = Math.cos(LEAN);

// Where a body lies on lounger p: the hips just over the seat (the legs on it) and as far back as the
// back of the torso reaches the backrest's face; facing down the bed, leaning back on the backrest.
function lieOn(ch, p, look) {
  const m = ch.model, hy = SEAT_Y + 0.08 * m.s;
  const u = BACK_U + (m.torsoD / 2 + 0.01 - (hy - BACK_Y) * BACK_NY) / BACK_NU;
  return { x: p.x + Math.sin(p.yaw) * u, y: p.baseY + hy, z: p.z + Math.cos(p.yaw) * u, yaw: p.yaw + Math.PI, lean: LEAN, arms: look.arms, tilt: look.tilt, lift: 0 };
}

// Every geometry of a model given up (a bather's look is rebuilt often; nothing in it is shared:
// bathers hold no props, and every part is built for its model).
function dispose(root) { root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }

export class Bathers {
  constructor(game, cfg = BATHERS) {
    this.g = game;
    this.cfg = cfg;
    this.recs = null;        // one per sun lounger: { p, i, n, day, occ, seed, since, look, alive, ch }
    this.byProp = new Map(); // prop -> its rec
    this.lying = [];         // bathers on their loungers (Characters, `bather` = { rec, stage })
    this.loose = [];         // bathers off them: flung, down or standing (main.js counts them as people)
    this.spare = [];         // bodies not in use (hidden)
    this.made = 0;           // bodies made so far (at most cfg.max)
    this.on = false;         // live last frame
    this.cutT = 0;           // s left in which bodies may come and go in view (after a cut)
    this.fx = 0; this.fz = 0;
    this.dayN = 0;           // mornings since the session began (a new crowd each)
    this.wasDay = undefined;
    // Berra and Robban.
    this.beds = null;        // { berra, robban }: their loungers' props (found on first use)
    this.held = {};          // key -> { bed, fallen }: lying on our lounger, or off it asleep on the ground
    this.queue = [];         // [{ at, fn }] the wake's lines (g.time)
    this.waking = false;
    this.lift = 0;           // Berra's head off the backrest (eased towards)
    this.snoreT = 2; this.snoreI = 0; this.snoreK = { berra: 0, robban: 0 };
    this.last = null;        // for tests: the last event { kind, ... }
    const w = cfg.stekt.wake;
    game.addInteractable({
      id: 'stekt:wake', r: w.r, prompt: w.prompt,
      pos: () => (this.canWake() ? game.npc('berra') : null),
      use: () => this.wake(),
    });
  }

  // On the island between missions (peds about). The bathers by day; Berra and Robban in their window.
  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle' && !!g.levelDef.sim.peds; }
  get window() { const s = this.cfg.stekt, i = this.g.missions.index; return this.live && i >= s.from && i < s.to; }
  get count() { return this.lying.length + this.loose.length; }

  // ---------------------------------------------------------------------------------------------
  // The loungers

  build() {
    const recs = propsOfType('solstol').map((p, i) => ({ p, i, n: 0, day: -1, occ: false, seed: 0, since: 0, look: null, alive: p.alive, ch: null }));
    for (const r of recs) this.byProp.set(r.p, r);
    return recs;
  }
  // A draw for lounger r: taken or not, who, how long he has lain there. The session's first crowd has
  // lain from nought to past lobster red; a morning's or a newcomer's (`fresh`) only just lain down.
  roll(r, fresh = false) {
    const c = this.cfg, rnd = mulberry32(c.seed + r.i * 7919 + this.dayN * 104729 + r.n * 613);
    r.day = this.dayN;
    r.occ = fresh || rnd() < c.share;
    r.seed = (rnd() * 2 ** 31) | 0;
    r.since = this.g.time - rnd() * (fresh ? 0 : this.dayN === 0 ? c.burn[1] + 120 : 60);
    r.look = { arms: rnd() < 0.5 ? 'belly' : 'side', tilt: (rnd() - 0.5) * 0.5 };
    r.base = null;
  }
  stage(r) { const t = this.g.time - r.since, b = this.cfg.burn; return t < b[0] ? 0 : t < b[1] ? 1 : 2; }
  // A lounger someone else lies on: Berra's and Robban's in their window, the Berra job's (§10.6).
  reserved(r) {
    const g = this.g, bj = g.berraJob;
    if (this.window && this.beds && (r.p === this.beds.berra || r.p === this.beds.robban)) return true;
    return bj.active && bj.spot.prop === 'solstol' && bj.propOf(bj.spot) === r.p;
  }
  // A tourist (never a local), without what a pedestrian carries, in stage k's skin.
  def(r, k) {
    if (!r.base) {
      let d;
      for (let s = r.seed; ; s++) { d = randomPed(mulberry32(s)); if (!d.local) break; }
      delete d.held;
      r.base = d;
    }
    const set = this.cfg.skins[k];
    return { ...r.base, skin: set[r.seed % set.length] };
  }

  // ---------------------------------------------------------------------------------------------
  // Bodies

  // In the camera's view (last frame's camera), within a sphere of rad r.
  seen(x, y, z, r = 1.4) { return _frustum.intersectsSphere(_sphere.set(_sphere.center.set(x, y, z), r)); }
  // A body may appear or go here: after a cut, far enough off, or out of view.
  mayPop(x, y, z, d, far = this.cfg.seenR) { return this.cutT > 0 || d > far || !this.seen(x, y, z); }

  // A body dressed for lounger r: a spare one rebuilt, or a new one while fewer than max are made.
  body(r) {
    let ch = this.spare.pop();
    if (ch) { this.dress(ch, r); return ch; }
    if (this.made >= this.cfg.max) return null;
    this.made++;
    const k = this.stage(r);
    ch = new Character(this.def(r, k));
    ch.bather = { rec: null, stage: k, standT: 0 };
    scene.add(ch.root);
    return ch;
  }
  // Rebuilt in lounger r's look at its stage (the old model's geometries given up).
  dress(ch, r) {
    const k = this.stage(r), old = ch.root;
    ch.setDef(this.def(r, k));
    dispose(old);
    ch.bather.stage = k;
  }
  lay(ch, r) {
    ch.bather.rec = r;
    r.ch = ch;
    ch.lieAt(lieOn(ch, r.p, r.look));
    if (!this.lying.includes(ch)) this.lying.push(ch);
  }
  // Out of the world, back to the spare bodies.
  put(ch) {
    const r = ch.bather.rec;
    if (r && r.ch === ch) r.ch = null;
    ch.bather.rec = null;
    this.g.unsay(ch);
    ch.state = 'hidden';
    ch.liePose = null;
    ch.root.visible = false;
    for (const list of [this.lying, this.loose]) { const i = list.indexOf(ch); if (i >= 0) list.splice(i, 1); }
    if (!this.spare.includes(ch)) this.spare.push(ch);
  }

  // ---------------------------------------------------------------------------------------------
  // Main.js hooks

  // A smashed prop (main.js onPropBroken, after the smash, the coins and the SKANDAL): a taken lounger
  // throws its bather off, backwards over the backrest; Berra or Robban the same, asleep on.
  onPropBroken(p, vx, vz) {
    if (p.type !== 'solstol' || !this.live) return;
    const g = this.g, c = this.cfg, r = this.byProp.get(p);
    const key = PAIR.find((k) => this.held[k]?.bed === p && g.npc(k).state === 'lying');
    const ch = key ? g.npc(key) : r?.ch && r.ch.state === 'lying' ? r.ch : null;
    if (!ch) return;
    const k = g.playerCar ? c.carK : c.push, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), sp = Math.hypot(vx, vz);
    ch.fling(fx * c.back + vx * k, c.up + (g.playerCar ? sp * 0.12 : 0), fz * c.back + vz * k, c.flip);
    this.last = { kind: key ? 'stekt' : 'flyoff', who: key ?? 'bather', t: g.time, x: p.x, z: p.z, car: !!g.playerCar };
    if (key) { this.held[key].fallen = true; return; }   // asleep: he does not even wake
    r.ch = null;
    ch.bather.rec = null;
    ch.bather.standT = 0;
    this.lying.splice(this.lying.indexOf(ch), 1);
    this.loose.push(ch);
    audio.ouch();
    g.say(ch, g.bark(ch, 'ouch'), 1.8);
  }
  // A body on its feet again (Character.step via main.js onGetUp). A bather mutters within getUpR m.
  onGetUp(ch) {
    if (!ch.bather) return false;
    const f = this.g.focus();
    if (dist(ch.x, ch.z, f.x, f.z) < this.cfg.getUpR) this.g.say(ch, this.g.bark(ch, 'getUp'), 2.2);
    if (this.last?.kind === 'flyoff') this.last.up = this.g.time;
    return true;
  }
  // main.js fixedStep: the loose bathers walk nowhere, but fall, land and stand up.
  step(h) {
    for (const ch of this.loose) { ch.wishX = ch.wishZ = 0; ch.step(h, this.g); }
  }

  // ---------------------------------------------------------------------------------------------
  // The frame

  update(dt) {
    const g = this.g, c = this.cfg;
    if (!this.live) { this.reset(); return; }
    this.recs ??= this.build();
    const f = g.focus();
    // A cut (free roam again after a mission or a load, R, a warp): bodies come and go freely a moment.
    if (!this.on || dist(f.x, f.z, this.fx, this.fz) > 15) this.cutT = c.cutSecs;
    this.on = true;
    this.fx = f.x; this.fz = f.z;
    this.cutT -= dt;
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const day = g.day.isDay();
    if (day && this.wasDay === false) this.dayN++;   // a new morning, a new crowd
    this.wasDay = day;
    for (const r of this.recs) {
      if (r.p.alive && !r.alive) { r.n++; this.roll(r, true); }   // back after its smash: someone new lies down
      r.alive = r.p.alive;
      if (r.day !== this.dayN && !r.ch) this.roll(r);
    }
    this.tickLying(f, day);
    this.tickLoose(dt, f);
    for (const ch of this.lying) ch.sync(dt);
    this.tickStekt(dt, f);
  }

  // The nearest taken loungers within r m get a body (one model built a frame); a body goes when its
  // lounger does, is reserved, is out m off, or it is night; a nearer lounger by `swap` m takes the
  // furthest body when there are no more.
  tickLying(f, day) {
    const c = this.cfg;
    let budget = 1;
    const d = (r) => dist(r.p.x, r.p.z, f.x, f.z);
    const pop = (r) => this.mayPop(r.p.x, r.p.baseY + 0.6, r.p.z, d(r));
    for (const ch of this.lying.slice()) {
      const r = ch.bather.rec;
      if (!r.p.alive || !r.occ || this.reserved(r) || d(r) > c.out || (!day && pop(r))) { this.put(ch); continue; }
      if (budget > 0 && ch.bather.stage !== this.stage(r) && pop(r)) { budget--; this.dress(ch, r); this.lay(ch, r); }
    }
    if (!day) return;
    const want = this.recs.filter((r) => !r.ch && r.occ && r.p.alive && d(r) < c.r && !this.reserved(r)).sort((a, b) => d(a) - d(b));
    for (const r of want) {
      if (budget <= 0) break;
      if (!pop(r)) continue;
      if (!this.spare.length && this.made >= c.max) {
        const far = this.lying.reduce((a, b) => (!a || d(b.bather.rec) > d(a.bather.rec) ? b : a), null);
        if (!far || d(far.bather.rec) < d(r) + c.swap || !pop(far.bather.rec)) break;
        this.put(far);
      }
      budget--;
      this.lay(this.body(r), r);
    }
  }

  // Off their loungers: turned to Stig while near, gone once they have stood a while unseen, or far.
  tickLoose(dt, f) {
    for (const ch of this.loose.slice()) {
      const dd = dist(ch.x, ch.z, f.x, f.z);
      if (ch.state === 'normal') {
        ch.bather.standT += dt;
        if (dd < 12) ch.yaw = dampAngle(ch.yaw, yawTo(f.x - ch.x, f.z - ch.z), 3, dt);
      }
      if (dd > this.cfg.out || (ch.state === 'normal' && ch.bather.standT > 4 && this.mayPop(ch.x, ch.y + 1, ch.z, dd))) { this.put(ch); continue; }
      ch.sync(dt);
    }
  }

  // Out of free roam (a mission starts, the other level): every bather gone, Berra and Robban home.
  reset() {
    this.letGo();
    if (!this.on) return;
    this.on = false;
    for (const ch of [...this.lying, ...this.loose]) this.put(ch);
  }

  // ---------------------------------------------------------------------------------------------
  // Berra and Robban, fried

  findBeds() {
    const at = (name) => { const l = lm(name); return propsOfType('solstol', { x: l.x, z: l.z, r: 0.3 })[0] || null; };
    const s = this.cfg.stekt;
    return { berra: at(s.berra), robban: at(s.robban) };
  }
  // Free to take: shown, standing, nobody's, not the waiting mission's giver or extra.
  free(key) {
    const g = this.g, n = g.npc(key), cur = g.missions.current;
    if (!n || n.state !== 'normal' || !n.root.visible || n.car || n.seatId || n.busy || !g.honk.free(key)) return false;
    return !(cur && cur.level === 'island' && (cur.giver === key || cur.extra?.some((e) => e === key || (Array.isArray(e) && e[0] === key))));
  }
  // Never popped onto or off a lounger in view: each place far off or out of the camera's view.
  unseenAt(x, y, z, f) { return this.mayPop(x, y, z, dist(x, z, f.x, f.z), this.cfg.stekt.clearR); }
  // Their island look (the level's outfit set and an unlock's, as applyOutfits has it).
  ownLook(key) { const g = this.g; return ({ ...g.levelDef.outfits(g), ...g.outfitOverrides })[key] ?? null; }

  tickStekt(dt, f) {
    const g = this.g;
    if (!this.window) { this.letGo(); return; }
    this.beds ??= this.findBeds();
    const B = this.beds;
    if (!B.berra || !B.robban) return;
    for (const key of PAIR) {
      const h = this.held[key], n = g.npc(key);
      if (!h) continue;
      if (n.spot !== MARK || n.state === 'hidden' || n.state === 'seated') { this.lost(key); continue; }
      if (n.state === 'lying') n.anim.slump = true;
      else if (n.state === 'down') n.timer = 999;   // off his smashed lounger: asleep on the ground
      // His lounger back (tickProps: he was 70 m off) and nobody looking: on it again.
      if (h.fallen && h.bed.alive && n.state === 'down' && this.unseenAt(n.x, n.y, n.z, f) && this.unseenAt(h.bed.x, 0.6, h.bed.z, f)) this.lie(key);
    }
    if (!this.held.berra && !this.held.robban) this.claim(f);
    this.tickWake(dt);
    this.snore(dt, f);
  }
  claim(f) {
    const g = this.g, B = this.beds;
    if (g.inDialog || !B.berra.alive || !B.robban.alive || !PAIR.every((k) => this.free(k))) return;
    const places = [...PAIR.map((k) => g.npc(k)), B.berra, B.robban];
    if (!places.every((q) => this.unseenAt(q.x, (q.y ?? 0.2) + 0.6, q.z, f))) return;
    for (const key of PAIR) {
      const n = g.npc(key);
      g.unsay(n);
      g.setNpcOutfit(key, 'stekt');
      n.busy = true;
      n.spot = MARK;
      this.held[key] = { bed: B[key], fallen: false };
      this.lie(key);
    }
    this.snoreT = 1.5;
    this.last = { kind: 'claim', t: g.time };
  }
  lie(key) {
    const n = this.g.npc(key), h = this.held[key];
    h.fallen = false;
    n.root.visible = true;
    n.anim.slump = true;
    n.lieAt(lieOn(n, h.bed, { arms: key === 'berra' ? 'side' : 'belly', tilt: key === 'berra' ? -0.15 : 0.2 }));
  }
  // Placed by someone else (a forced placeNpcs, a scene): ours no more, in his own skin.
  lost(key) {
    const g = this.g, n = g.npc(key);
    delete this.held[key];
    n.anim.slump = false;
    if (n.spot === MARK) n.spot = null;
    if (n.outfit === 'stekt') g.setNpcOutfit(key, this.ownLook(key));
    this.waking = false;
    this.queue.length = 0;
  }
  // Out of their window (a mission starts, the other level, the bodega next): home at once, awake, in
  // their own skin.
  letGo() {
    const g = this.g;
    if (!this.held.berra && !this.held.robban) return;
    for (const key of PAIR) {
      const n = g.npc(key);
      if (!this.held[key]) continue;
      const ours = n.spot === MARK && n.state !== 'hidden';
      this.lost(key);
      if (!ours) continue;
      let home = g.levelDef.homes(g)[key] ?? null;
      if (g.level === 'island' && key in g.homeOverrides) home = g.homeOverrides[key];
      if (home && !home.seat) g.placeNpc(key, home[0], home[1], home[2], home[3]);
      else { n.state = 'normal'; n.liePose = null; }
      n.timer = 0;
      n.busy = false;
      n.spot = null;
    }
    this.last = { kind: 'letGo', t: g.time };
  }

  // E on Berra: Stig's word, Berra lifts his head for five minutes more, Robban talks in his sleep.
  canWake() {
    const g = this.g, n = g.npc('berra');
    return !!this.held.berra && !!this.held.robban && n.state === 'lying' && !this.waking && !g.inDialog && !g.playerCar && g.player.state === 'normal';
  }
  wake() {
    const g = this.g, w = this.cfg.stekt.wake, p = g.player, B = g.npc('berra'), R = g.npc('robban');
    if (!this.canWake()) return;
    this.waking = true;
    p.yaw = yawTo(B.x - p.x, B.z - p.z);
    g.unsay(B); g.unsay(R);
    g.say(p, w.stig, 2.0);
    this.last = { kind: 'wake', t: g.time, step: 'stig' };
    const end = w.liftAt + w.liftSecs;
    this.later(w.liftAt, () => { this.lift = 1; g.say(B, w.berra, w.liftSecs); this.last.step = 'berra'; });
    this.later(end, () => { this.lift = 0; });
    this.later(end + w.gap, () => { if (this.held.robban && R.state === 'lying') g.say(R, w.robban, 2.4); this.last.step = 'robban'; });
    this.later(end + w.gap + 2.4, () => { this.waking = false; this.snoreT = 3; this.last.step = 'done'; });
  }
  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }
  tickWake(dt) {
    const g = this.g;
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      q.fn();
    }
    const B = g.npc('berra');
    if (B.liePose) B.liePose.lift += ((this.lift || 0) - B.liePose.lift) * Math.min(1, dt * 5);
  }

  // A snore every snoreEvery s within snoreR m, Berra and Robban by turns (on the ground too).
  snore(dt, f) {
    const g = this.g, s = this.cfg.stekt;
    this.snoreT -= dt;
    if (this.snoreT > 0 || this.waking) return;
    this.snoreT = s.snoreEvery;
    const key = PAIR[this.snoreI++ % 2], n = g.npc(key);
    if (!this.held[key] || (n.state !== 'lying' && n.state !== 'down') || g.inDialog || g.saying(n)) return;
    if (dist(n.x, n.z, f.x, f.z) > s.snoreR) return;
    const lines = s.snore[key];
    g.say(n, lines[this.snoreK[key]++ % lines.length], 2.4);
  }
}
