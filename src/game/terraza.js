// Takterrassen på La Medina vaknar (free roam; feature 122, DESIGN §10.59). Up La Medina's courtyard
// stairs the roof terrace (world/blocks/centre.js MEDINA) has people between missions: guests at the four
// café tables, some with a glass, and a bartender behind the new counter before TERRAZA · BAR, who greets
// Stig in Swedish with Spanish words and shouts "¡Olé!" at a splash; the roof pool has water (a `water`
// floor, so a landing in it splashes, main.onLand) and Flamenco's board at its north end; the two old sun
// loungers by it always have a dozing bather (game/bathers.js, the roles asked from `role`), and the third
// is Stig's: E there and he lies down for "Bara en liten stund.", dozes off, the clock spins on in the
// black and he wakes up red. The burn (a layer over his outfit's skin, `dress`, called by main.js
// setPlayerOutfit) lasts until the next morning; till then anyone bumping into him gets "Aj!" (main.js
// carsVsPeople and onCharHit call `onTouch`). A guest reads the brochure's sea view out on Stig's first
// time up; the water tanks' coins are out only while he is up there (the island's fixed coins stay within
// 260 outside a visit). Only on the island with no mission running (`missions.state === 'idle'`): a
// mission start or the other level takes the people and the coins away, ends the nap and the burn at
// once, so no mission, stage, timer or calibration pool sees any of it. Nothing is saved. Config TERRAZA
// (content/island.js). Owned by Game as `terraza`: main.js calls `update` once a frame and hands it the
// player's landings (`onLand`), the taken coins (`onCoin`), the bumps (`onTouch`) and a debug warp (`end`);
// the interactable is registered here.

import { TERRAZA, DAY } from '../content/index.js';
import { THREE, camera, scene } from '../gfx.js';
import { Character } from '../actors/character.js';
import { randomPed } from '../actors/models.js';
import { placeCoin, removeCoin } from '../actors/pickups.js';
import { MEDINA } from '../world/blocks/centre.js';
import { lm } from '../world/layout.js';
import { contains } from '../world/collision.js';
import { propsOfType } from '../world/props.js';
import { lieOn } from './bathers.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { dist, mulberry32 } from '../util.js';

const TAG = 'terraza';
const SOLS = { terrazaSol1: 'asleep', terrazaSol2: 'asleep', terrazaSol3: 'kept' };
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere(), _v = new THREE.Vector3();

export class Terraza {
  constructor(game, cfg = TERRAZA) {
    this.g = game;
    this.cfg = cfg;
    this.guests = null;      // [{ k, seat: { x, y, z, yaw }, cup, ch, on }]
    this.barman = null;      // { spot, ch, on }
    this.roles = null;       // sun lounger prop -> 'asleep' | 'kept' (found on first use)
    this.mine = null;        // Stig's lounger (prop)
    this.on = false;         // live last frame
    this.cutT = 0;           // s left in which bodies may come and go in view (after a cut)
    this.fx = 0; this.fz = 0;
    this.up = false;         // Stig up on the terrace (the stairs' top third or the roof)
    this.visits = 0;
    this.greeted = false;    // the bartender's line said this visit
    this.greetI = 0;
    this.brochured = false;  // the brochure line read this session
    this.oleT = -Infinity;
    this.stash = [];         // the tanks' coins out now: [{ i, c }]
    this.taken = new Set();  // their spots taken this session
    this.sc = null;          // the nap: { t, ev: [{ t, fn }], from, to }
    this.burnt = false;      // burnt by the nap, until the next morning or a mission start
    this.night = false;      // a night has come since the burn
    this.worn = false;       // the burn is on his model now (`dress`)
    this.burntSaid = false;  // the bartender has seen this burn
    this.ajT = -Infinity;
    this.naps = 0; this.splashes = 0; this.ajs = 0; this.oles = 0; this.greets = 0;
    this.last = null;        // tests: the last event { kind, t, … }
    this.log = [];           // tests: [{ kind, t, … }]
    const self = this, n = cfg.nap;
    game.addInteractable({
      id: 'terraza:solstol', r: n.r,
      pos: () => { const p = self.lounger(); return p ? { x: p.x, y: p.baseY, z: p.z } : null; },
      prompt: n.prompt,
      enabled: () => self.canNap(),
      use: () => self.startNap(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get busy() { return !!this.sc; }
  get coinsLeft() { return MEDINA.coins.length - this.taken.size; }
  note(kind, o = {}) { this.last = { kind, t: +this.g.time.toFixed(2), ...o }; this.log.push(this.last); if (this.log.length > 60) this.log.shift(); }

  // ---------------------------------------------------------------------------------------------
  // The loungers (asked by game/bathers.js)

  // The role of a sun lounger on the roof terrace: 'asleep' (a dozing bather always on it), 'kept'
  // (Stig's: never a bather), else null.
  role(p) {
    if (!this.roles) {
      this.roles = new Map();
      for (const [name, role] of Object.entries(SOLS)) {
        const l = lm(name), q = l && propsOfType('solstol', { x: l.x, z: l.z, r: 0.3 })[0];
        if (q) this.roles.set(q, role);
        if (q && role === 'kept') this.mine = q;
      }
    }
    return this.roles.get(p) ?? null;
  }
  lounger() { if (!this.roles) this.role(null); return this.mine; }

  // ---------------------------------------------------------------------------------------------
  // Bodies

  seen(x, y, z) { return _frustum.intersectsSphere(_sphere.set(_sphere.center.set(x, y, z), 1.2)); }
  mayPop(x, y, z) { return this.cutT > 0 || camera.position.distanceTo(_v.set(x, y, z)) > this.cfg.popR || !this.seen(x, y, z); }
  open() { const h = this.g.day.h, [a, b] = this.cfg.hours; return h >= a && h < b; }

  build() {
    const c = this.cfg;
    this.guests = c.guests.map(([t, k], i) => ({ k: i, seat: MEDINA.chairs[t * 3 + k], cup: c.cups.includes(i), ch: null, on: false }));
    this.barman = { spot: MEDINA.bar, ch: null, on: false };
  }
  seatGuest(d) {
    const c = this.cfg;
    if (!d.ch) {
      let def;
      for (let s = c.seed + d.k * 101; ; s++) { def = randomPed(mulberry32(s)); if (!def.local) break; }
      delete def.held;
      d.ch = new Character(def);
      scene.add(d.ch.root);
    }
    d.ch.seatAt({ x: d.seat.x, y: d.seat.y, z: d.seat.z, yaw: d.seat.yaw });
    d.ch.anim.cupHeld = d.cup ? 'low' : false;
    d.on = true;
  }
  putBarman() {
    const b = this.barman;
    if (!b.ch) { b.ch = new Character({ ...this.cfg.barman.look }); scene.add(b.ch.root); }
    b.ch.state = 'normal';
    b.ch.perchAt(b.spot.x, b.spot.y, b.spot.z, b.spot.yaw);
    b.on = true;
  }
  hide(d) {
    const ch = d.ch;
    this.g.unsay(ch);
    ch.anim.cupHeld = false;
    ch.state = 'hidden';
    ch.root.visible = false;
    d.on = false;
  }
  tickPeople(dt) {
    const f = this.g.focus(), open = this.open();
    for (const d of [...this.guests, this.barman]) {
      const s = d.seat ?? d.spot, near = dist(s.x, s.z, f.x, f.z) < this.cfg.r, pop = this.mayPop(s.x, s.y + 0.8, s.z);
      if (!d.on && open && near && pop) { if (d === this.barman) this.putBarman(); else this.seatGuest(d); }
      else if (d.on && (!near || (!open && pop))) this.hide(d);
      if (d.on) d.ch.sync(dt);
    }
  }
  guest(i) { const d = this.guests?.[i]; return d?.on ? d.ch : null; }
  get bartender() { return this.barman?.on ? this.barman.ch : null; }

  // ---------------------------------------------------------------------------------------------
  // Up on the terrace: the visit, the coins, the lines

  isUp(p = this.g.player) {
    const R = MEDINA.roof;
    return !!R && !this.g.playerCar && p.x >= R.x0 && p.x <= R.x1 && p.z >= R.z0 && p.z <= R.z1 && p.y >= this.cfg.upY;
  }
  tickUp() {
    const up = this.isUp();
    if (up && !this.up) { this.visits++; this.greeted = false; this.placeStash(); this.note('up', { visit: this.visits }); }
    else if (!up && this.up) { this.removeStash(); this.note('down'); }
    this.up = up;
  }
  placeStash() {
    this.removeStash();
    MEDINA.coins.forEach(([x, y, z], i) => {
      if (this.taken.has(i)) return;
      const c = placeCoin(x, y, z, TAG, MEDINA.coinMinY);
      if (c) this.stash.push({ i, c });
    });
  }
  removeStash() {
    for (const { c } of this.stash) if (c.tag === TAG) removeCoin(c);
    this.stash = [];
  }
  // A coin taken (game.collectCoin).
  onCoin(c) {
    const s = c.tag === TAG && this.stash.find((e) => e.c === c);
    if (!s) return;
    this.stash = this.stash.filter((e) => e !== s);
    this.taken.add(s.i);
    this.note('coin', { left: this.coinsLeft });
  }

  // The brochure line and its reply, the bartender's greeting or his look at the burn.
  tickLines() {
    const g = this.g, c = this.cfg, p = g.player;
    if (!this.up || g.inDialog || this.sc) return;
    const B = c.brochure, a = this.guest(B.who[0]), b = this.guest(B.who[1]);
    if (!this.brochured && a && b && dist(a.x, a.z, p.x, p.z) < B.r) {
      this.brochured = true;
      g.say(a, B.line, B.secs);
      this.later(B.gap, () => { const q = this.guest(B.who[1]); if (q) g.say(q, B.reply, 2.2); });
      this.note('brochure');
    }
    const m = this.bartender, M = c.barman;
    if (!m || g.saying(m) || dist(m.x, m.z, p.x, p.z) > M.greetR) return;
    if (this.worn && !this.burntSaid) {
      this.burntSaid = true;
      this.greeted = true;
      g.say(m, M.burnt, M.secs);
      this.note('burntSeen');
    } else if (!this.greeted) {
      this.greeted = true;
      this.greets++;
      g.say(m, M.greet[this.greetI++ % M.greet.length], M.secs);
      this.note('greet', { i: this.greetI - 1 });
    }
  }
  later(secs, fn) { (this.queue ??= []).push({ at: this.g.time + secs, fn }); }
  tickQueue() {
    const q = this.queue;
    if (!q) return;
    for (let i = 0; i < q.length; i++) if (q[i].at <= this.g.time) { const e = q.splice(i--, 1)[0]; e.fn(); }
  }

  // main.js onLand, after its splash (`wet`): a landing in the roof pool is his; the bartender's "¡Olé!".
  onLand(v, y, wet) {
    const g = this.g, p = g.player, P = MEDINA.pool;
    if (!this.live || !wet || !P || !contains(P, p.x, p.z) || Math.abs(y - P.top) > 0.05) return;
    this.splashes++;
    this.note('splash', { v: +v.toFixed(1), bomb: !!g.stomping, x: +p.x.toFixed(2), z: +p.z.toFixed(2) });
    const m = this.bartender, M = this.cfg.barman;
    if (m && g.time - this.oleT > M.oleEvery && dist(m.x, m.z, p.x, p.z) < M.oleR && !g.inDialog) {
      this.oleT = g.time;
      this.oles++;
      g.say(m, M.ole, 1.4);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The nap on his lounger

  // E at his lounger: free roam, by day, on foot and standing up there, nothing carried, no pursuit, bust,
  // PANIK, pool-fest ring, belt or talk with the gang; the lounger whole.
  canNap() {
    const g = this.g, p = g.player, L = this.lounger();
    return this.live && !this.sc && !!L && L.alive && g.day.isDay() && !g.inDialog && !g.playerCar && !g.carrying && p.state === 'normal' && p.onGround
      && Math.abs(p.y - L.baseY) < 0.5 && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !g.fest.joined && !g.belt.seated && !g.chat.busy;
  }
  // [m along the lounger's facing, m to its right, m over its floor] to the world.
  at(a) {
    const L = this.mine, fx = Math.sin(L.yaw), fz = Math.cos(L.yaw);
    return { x: L.x + fx * a[0] - fz * a[1], y: L.baseY + (a[2] ?? 0), z: L.z + fz * a[0] + fx * a[1] };
  }
  startNap() {
    if (!this.canNap()) return;
    const g = this.g, n = this.cfg.nap, p = g.player;
    this.naps++;
    g.inDialog = true;
    hud.letterbox(true);
    hud.clearToasts();
    p.wishX = p.wishZ = p.vx = p.vz = p.vy = 0;
    p.anim.sprint = false;
    p.lieAt(lieOn(p, this.mine, n.pose));
    g.cam.cutTo(this.at(n.cam), this.at(n.look));
    g.say(p, n.line, 2.2);
    this.sc = { t: 0, ev: [] };
    this.note('nap', { n: this.naps, h: +g.day.h.toFixed(2) });
    const dark = n.dark, back = dark + n.fadeSecs + DAY.spinSecs + n.hold, up = back + n.fadeSecs + n.zzzAt + n.wakeAt + n.upAt;
    this.on2(n.doze, () => { p.anim.eyesShut = p.anim.slump = true; g.say(p, n.zzz, 1.6); });
    this.on2(dark, () => { g.day.over = true; hud.fade(true); this.sc.black = true; });
    this.on2(dark + n.fadeSecs, () => this.inTheDark());
    this.on2(back, () => { hud.hideBanner(); hud.fade(false); this.sc.banner = this.sc.black = false; });
    this.on2(back + n.fadeSecs, () => { g.day.over = false; });
    this.on2(back + n.fadeSecs + n.zzzAt, () => g.say(p, n.zzz, 1.2));
    this.on2(back + n.fadeSecs + n.zzzAt + n.wakeAt, () => {
      p.anim.eyesShut = p.anim.slump = false;
      this.sc.lift = 1;
      g.say(p, n.wake, 2.4);
    });
    this.on2(up, () => this.getUp(true));
    this.on2(up + n.endAt, () => this.endNap('done'));
  }
  on2(t, fn) { this.sc.ev.push({ t, fn }); this.sc.ev.sort((a, b) => a.t - b.t); }
  // In the black: the clock on `hours` h (spun on the HUD clock, as the room-107 nap's), and the burn.
  inTheDark() {
    const g = this.g, n = this.cfg.nap, D = g.day, from = D.h, to = from + n.hours;
    hud.showBanner(n.banner, '', 'mission', 0);
    this.sc.banner = true;
    D.spin(from, to).then(() => { if (!this.sc) return; D.set(to); D.write(); });
    this.sc.from = from; this.sc.to = to % 24;
    this.burn();
  }
  burn() {
    this.burnt = true;
    this.night = false;
    this.burntSaid = false;
    this.refresh();
    this.note('burn');
  }
  // On his feet before the lounger's foot, facing back down it, on the roof's floor (teleport would put
  // him on the ground under it).
  getUp(said) {
    const g = this.g, n = this.cfg.nap, p = g.player, L = this.mine, q = this.at([-n.stand, 0, 0]);
    p.state = 'normal';
    p.liePose = null;
    p.perched = false;
    p.anim.eyesShut = p.anim.slump = false;
    p.x = q.x; p.z = q.z; p.y = L.baseY; p.yaw = L.yaw + Math.PI;
    p.vx = p.vz = p.vy = 0;
    p.onGround = true;
    p.root.rotation.order = 'XYZ';
    if (said) {
      g.say(p, n.ouch, 1.4);
      audio.ouch();
      hud.toast(n.toast);
    }
  }
  endNap(why) {
    const g = this.g, p = g.player, sc = this.sc;
    if (!sc) return;
    if (p.state === 'lying') this.getUp(false);
    if (sc.to != null && why !== 'done') { g.day.set(sc.to); g.day.write(); }
    if (sc.banner) hud.hideBanner();
    if (sc.black) hud.fade(false);
    g.day.over = false;
    g.cam.release();
    g.cam.yaw = p.yaw;
    g.cam.snapNext = true;
    hud.letterbox(false);
    g.inDialog = false;
    this.sc = null;
    this.note('napEnd', { why });
  }
  tickNap(dt) {
    const sc = this.sc;
    if (!sc) return;
    sc.t += dt;
    while (this.sc && sc.ev.length && sc.ev[0].t <= sc.t) sc.ev.shift().fn();
    const p = this.g.player;
    if (this.sc && p.liePose) p.liePose.lift += ((sc.lift || 0) - p.liePose.lift) * Math.min(1, dt * 5);
  }

  // ---------------------------------------------------------------------------------------------
  // The burn

  // The layer over his outfit (main.js setPlayerOutfit): his skin red while the burn is on.
  dress(def) { return this.worn && this.live ? { ...def, skin: this.cfg.burn.skin } : def; }
  // On foot (or lying, in the scene) the layer follows the burn at once; in a car it waits until he is
  // out, as SunTrip-butiken's does (§10.23).
  refresh() {
    const g = this.g, want = this.burnt && this.live;
    if (want === this.worn || g.player.car) return;
    this.worn = want;
    g.setPlayerOutfit(g.player.outfit, { persist: false });
  }
  // A night gone by heals it (the island's clock; held in test mode, so there only a mission start does).
  tickBurn() {
    if (!this.burnt && !this.worn) return;
    const day = this.g.day.isDay();
    if (!day) this.night = true;
    else if (this.night && this.burnt) { this.burnt = false; this.note('healed'); }
    this.refresh();
  }
  // Someone bumps into him, he into someone, a car knocks him (main.js carsVsPeople, onCharHit): "Aj!".
  onTouch(why = 'bump') {
    const g = this.g, b = this.cfg.burn, p = g.player;
    if (!this.worn || !this.live || g.inDialog || this.sc || g.time - this.ajT < b.ajEvery) return;
    this.ajT = g.time;
    this.ajs++;
    g.say(p, b.aj, b.ajSecs);
    audio.ouch();
    this.note('aj', { why });
  }

  // ---------------------------------------------------------------------------------------------
  // The frame

  update(dt) {
    const g = this.g;
    if (!this.live) { if (this.on || this.sc || this.burnt || this.worn) this.reset(); return; }
    if (!MEDINA.roof) return;
    if (!this.guests) this.build();
    const f = g.focus();
    if (!this.on || dist(f.x, f.z, this.fx, this.fz) > 15) this.cutT = this.cfg.cutSecs;
    this.on = true;
    this.fx = f.x; this.fz = f.z;
    this.cutT -= dt;
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    this.tickPeople(dt);
    this.tickUp();
    this.tickQueue();
    this.tickLines();
    this.tickNap(dt);
    this.tickBurn();
  }

  // A debug warp: the nap off, Stig where the warp puts him.
  end(why) { if (this.sc) this.endNap(why); }

  // Out of free roam (a mission starts, the other level): the people and the coins away, the nap off,
  // the burn healed, at once.
  reset() {
    const g = this.g;
    if (this.sc) {
      const p = g.player, sc = this.sc;
      if (p.state === 'lying') this.getUp(false);
      // Our banner and black only (a mission's start may have shown its own, or begun NÄSTA MORGON's).
      if (sc.banner) hud.hideBanner();
      if (sc.black && !g.day.busy) hud.fade(false);
      g.day.over = false;
      this.sc = null;
      // A mission's start owns the dialogue state, the letterbox and the camera from its first frame;
      // only a level change gives them back here.
      if (g.missions.state === 'idle') { g.cam.release(); g.cam.snapNext = true; hud.letterbox(false); g.inDialog = false; }
      this.note('napEnd', { why: 'reset' });
    }
    this.on = false;
    if (this.queue) this.queue.length = 0;
    for (const d of [...(this.guests || []), ...(this.barman ? [this.barman] : [])]) if (d.on) this.hide(d);
    this.removeStash();
    this.up = false;
    this.burnt = false;
    this.refresh();
  }
}
