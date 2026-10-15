// Lite film. – herr Storchs semesterfilm (free roam; feature 6, DESIGN §10.11). Herr Storch notices
// when Stig does something spectacular within `r` m of him (a double jump, a bounce, a stomp, a long
// drop, the glide, or an offence the witness rule sees: a kicked sunbed), trots over the sand, lifts
// his camera to the eye ("Lite film.") and walks back to his place beside his wife. E by him ("Titta
// i kameran") makes the screen his viewfinder: perforation, dust, the day counter and a black picture.
// The lens cap is on, and only the player knows. After the end (julafton's `bodega` unlock) the cap is
// off: the viewfinder shows the island in pale small-gauge colours, every trick he films leaves a
// still, and he offers "Vill du se min film?": the film night, seven black days and then the player's
// own julafton stunts. The witness rule turns round then (UNLOCKS.bodega.witness: an offence near him
// counts, there is evidence now). Only on the island with `missions.state === 'idle'`: he never moves
// in a mission (the witness zone follows him), and a mission's start finds him at his place. He runs
// only on the beach's sand, never over the paseo or a road. Config: STORCH_FILM (content/island.js).
// Owned by Game as `film`; main.js hands it the tricks (`trick`, `onLand`), asks who is `posed`,
// calls `update` once a frame and `grab` after the frame's render when `grabNow` is set.

import { STORCH_FILM } from '../content/index.js';
import { CHARS } from '../actors/models.js';
import { lm } from '../world/layout.js';
import { groundAt, groundInfo } from '../world/collision.js';
import { THREE, renderer, scene, camera } from '../gfx.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { fmt } from '../strings.js';
import { hud } from './hud.js';
import { clamp, dist, pick, yawTo, dampAngle } from '../util.js';

const MARK = 'storchFilm';   // npc.spot while Herr Storch is ours (a placement by anyone else clears it)
const _dir = new THREE.Vector3();

export class StorchFilm {
  constructor(game, cfg = STORCH_FILM) {
    this.g = game;
    this.cfg = cfg;
    this.st = null;          // null | 'notice' | 'trot' | 'film' | 'home' | 'settle'
    this.t = 0;              // seconds in the state
    this.stuckT = 0;
    this.nextT = -Infinity;  // g.time before which he lets a trick pass (`every`)
    this.from = null;        // his place when he set off: { x, z, yaw, spot }
    this.goal = null;
    this.view = null;        // null | 'look' | 'night': a viewfinder or the film night is up
    this.shot = null;        // the still being taken while he films: { src, h, n }
    this.grabNow = false;    // main.loop calls grab() after the render
    this.stills = this.load();          // data-URL jpegs, oldest first (after the end)
    this.seen = 0;                      // the film night has shown up to here (a session's first offer shows the album)
    this.offerT = -Infinity;
    this.airTop = null;      // the player's highest y since he left the ground (a long drop)
    this.gliding = false;
    this.cam3 = new THREE.PerspectiveCamera(cfg.stills.fov, 16 / 9, 0.25, 1800);
    this.canvas = null;
    this.last = null;        // the last trick, for tests: { kind, t, d0, ran, filmed, still, at }
    this.lastView = null;    // the last viewfinder or film night, for tests
    const self = this;
    game.addInteractable({
      id: 'storchFilm', r: cfg.look.r,
      pos: () => { const n = self.npc; return n ? { x: n.x, z: n.z, y: n.y } : null; },
      enabled: () => self.canLook(),
      get prompt() { return self.offering ? self.cfg.night.prompt : self.cfg.look.prompt; },
      use: () => { if (self.offering) self.night(); else self.look(); },
    });
  }

  get npc() { return this.g.npcs[this.cfg.who]; }
  get after() { return this.g.unlocked.has(this.cfg.after); }
  get active() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get offering() { return this.after && this.stills.length > this.seen; }
  get name() { return CHARS[this.cfg.who]?.name || 'Herr Storch'; }

  // The beach of block (3,6), from the `sand` offsets around its landmark (world axes).
  get sand() {
    if (!this._sand) {
      const s = this.cfg.sand, l = lm(s.at);
      this._sand = { x0: l.x + s.x[0], x1: l.x + s.x[1], z0: l.z + s.z[0], z1: l.z + s.z[1] };
    }
    return this._sand;
  }
  onSand(x, z) { const s = this.sand; return x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1; }

  // Standing, shown, not in a car or a seat, not held by a mission's idle pose, the Berra job or the
  // diving judges, and on no one else's errand.
  free() {
    const g = this.g, k = this.cfg.who, n = this.npc;
    return !!n && n.state === 'normal' && n.root.visible && !n.car && !n.seatId && !g.missions.idlePose(k)
      && !g.berraJob.posed(k) && !g.judges.posed(k) && (!n.busy || n.spot === MARK);
  }
  // The waiting mission's giver or extra: he films from his place.
  pinned() {
    const cur = this.g.missions.current, k = this.cfg.who;
    return !!cur && cur.level === 'island' && (cur.giver === k || !!cur.extra?.some((e) => e === k || (Array.isArray(e) && e[0] === k)));
  }
  // syncAll: no turn to the player, no wave, no chatter while he is on it.
  posed(key) { return key === this.cfg.who && (this.st !== null || this.view !== null) && this.npc?.spot === MARK; }

  // ---- tricks --------------------------------------------------------------------------------
  // A trick by Stig (or his car, for an offence): true when Herr Storch takes it.
  trick(kind) {
    const g = this.g, c = this.cfg, n = this.npc;
    if (!this.active || g.inDialog || this.view || !this.free()) return false;
    if (this.st && this.st !== 'home' && this.st !== 'settle') return false;
    if (g.time < this.nextT) return false;
    const f = g.focus(), d = dist(n.x, n.z, f.x, f.z);
    if (d > c.r) return false;
    this.nextT = g.time + c.every;
    if (!this.st) this.claim();
    this.st = 'notice';
    this.t = 0;
    this.last = { kind, t: g.time, d0: +d.toFixed(2), ran: false, filmed: false, still: false, at: null };
    return true;
  }
  // main.onLand (the player's landings, `stomping` before it is cleared): a stomp, or a drop of
  // `drop` m or more from the top of his air time.
  onLand(y, stomping) {
    const top = this.airTop, p = this.g.player;
    this.airTop = null;
    if (stomping) { this.trick('stamp'); return; }
    groundAt(p.x, p.z, y + 0.05, 0.45);
    if (groundInfo.block?.kind === 'bounce') return;   // a trampoline: onBounce's `studs`
    if (top != null && top - y >= this.cfg.drop) this.trick('fall');
  }
  watchAir() {
    const g = this.g, p = g.player;
    if (g.playerCar || p.state !== 'normal' || p.onGround) this.airTop = null;
    else this.airTop = Math.max(this.airTop ?? p.y, p.y);
    const on = !!g.glide.on;
    if (on && !this.gliding) this.trick('glid');
    this.gliding = on;
  }

  claim() {
    const n = this.npc;
    const home = n.spot && n.homeX != null && dist(n.x, n.z, n.homeX, n.homeZ) < 6;
    this.from = { x: home ? n.homeX : n.x, z: home ? n.homeZ : n.z, yaw: n.yaw, spot: n.spot };
    n.busy = true;
    n.spot = MARK;
    n.steer = () => this.steer();
  }
  // Let him go: his own place again when he is on it (placeNpcs keeps him there), else none (it
  // takes him home once Stig is 50 m off).
  release() {
    const n = this.npc, f = this.from;
    this.st = null;
    this.goal = null;
    this.shot = null;
    if (!n) return;
    delete n.steer;
    n.anim.film = false;
    if (n.spot !== MARK) { this.from = null; return; }
    n.busy = false;
    n.spot = f && dist(n.x, n.z, f.x, f.z) < 1 ? f.spot : null;
    this.from = null;
  }
  // Out of free roam (a mission starts, the level changes): straight back to his place, so the
  // witness zone and the mission's staging are as before.
  reset() {
    const n = this.npc, f = this.from;
    if (this.view) this.endView();
    if (this.st && n && n.spot === MARK && f) {
      n.teleport(f.x, f.z, f.yaw);
      n.vx = n.vz = 0;
    }
    if (this.st || (n && n.spot === MARK)) this.release();
    this.st = null;
  }

  steer() {
    const n = this.npc, c = this.cfg;
    if (this.view || n.state !== 'normal') return null;
    const goal = this.st === 'trot' ? this.goal : this.st === 'home' ? this.from : null;
    if (!goal) return null;
    const dx = goal.x - n.x, dz = goal.z - n.z, d = Math.hypot(dx, dz);
    if (d < 0.15) return null;
    const v = Math.min(this.st === 'trot' ? c.trot : c.walk, 0.4 + d * 2);
    return { x: (dx / d) * v, z: (dz / d) * v };
  }
  // `filmDist` m from Stig on the line to Herr Storch, kept on the sand.
  aim(f) {
    const n = this.npc, c = this.cfg, s = this.sand;
    const dx = n.x - f.x, dz = n.z - f.z, d = Math.hypot(dx, dz) || 1;
    return { x: clamp(f.x + (dx / d) * c.filmDist, s.x0, s.x1), z: clamp(f.z + (dz / d) * c.filmDist, s.z0, s.z1) };
  }

  update(dt) {
    const g = this.g, c = this.cfg, n = this.npc;
    if (!n) return;
    if (!this.active) { if (this.st || this.view) this.reset(); return; }
    this.watchAir();
    if (this.view === 'look') { n.root.visible = false; g.player.root.visible = false; }   // both behind the lens
    if (this.view) return;
    if (!this.st) { this.maybeOffer(); return; }
    if (n.spot !== MARK) { this.st = null; this.from = null; delete n.steer; n.anim.film = false; return; }   // placed by someone else
    if (n.state !== 'normal') {
      // Knocked over: the filming is off; once up he walks home.
      if (this.st !== 'home') { n.anim.film = false; this.shot = null; this.st = 'home'; }
      this.t = 0; this.stuckT = 0;
      return;
    }
    this.t += dt;
    const f = g.focus(), face = (x, z, k = 6) => { n.yaw = dampAngle(n.yaw, yawTo(x - n.x, z - n.z), k, dt); };
    switch (this.st) {
      case 'notice':
        face(f.x, f.z, 8);
        if (this.t >= c.notice) this.decide();
        break;
      case 'trot': {
        this.goal = this.aim(f);
        const sp = Math.hypot(n.vx, n.vz);
        this.stuckT = this.t > 0.4 && sp < 0.5 ? this.stuckT + dt : 0;
        if (dist(n.x, n.z, this.goal.x, this.goal.z) < 0.4 || dist(n.x, n.z, f.x, f.z) <= c.filmDist + 0.3 || this.t > c.giveUp || this.stuckT > c.stuckSecs) this.startFilm();
        break;
      }
      case 'film':
        face(f.x, f.z);
        if (this.shot && this.t >= c.stills.first && this.shot.n < c.stills.grabs && (this.shot.n === 0 || this.height() > this.shot.h + c.stills.higher)) this.grabNow = true;
        if (this.t >= c.filmSecs) this.endFilm();
        break;
      case 'home': {
        const fr = this.from;
        if (dist(n.x, n.z, fr.x, fr.z) < 0.3) { this.st = 'settle'; this.t = 0; break; }
        const sp = Math.hypot(n.vx, n.vz);
        this.stuckT = this.t > 0.6 && sp < 0.3 ? this.stuckT + dt : 0;
        if (this.stuckT > 2) this.release();
        break;
      }
      case 'settle':
        n.yaw = dampAngle(n.yaw, this.from.yaw, 6, dt);
        if (this.t > 0.6) { this.release(); this.maybeOffer(); }
        break;
    }
  }

  decide() {
    const g = this.g, c = this.cfg, n = this.npc, f = g.focus();
    if (dist(n.x, n.z, f.x, f.z) <= c.near || this.pinned() || !this.onSand(n.x, n.z)) { this.startFilm(); return; }
    this.st = 'trot';
    this.t = 0;
    this.stuckT = 0;
    this.goal = this.aim(f);
    this.last.ran = true;
  }

  startFilm() {
    const g = this.g, c = this.cfg, n = this.npc;
    this.st = 'film';
    this.t = 0;
    n.vx = n.vz = 0;
    n.anim.film = true;
    g.say(n, c.say, 2.4);
    n.chatT = 6;
    audio.whirr(c.filmSecs * 0.8);
    this.shot = this.after ? { src: null, h: -Infinity, n: 0 } : null;
    this.last.filmed = true;
    this.last.at = { x: +n.x.toFixed(2), z: +n.z.toFixed(2) };
  }
  endFilm() {
    const c = this.cfg, n = this.npc;
    n.anim.film = false;
    if (this.shot) this.last.grabs = this.shot.n;
    if (this.shot?.src) {
      this.stills.push(this.shot.src);
      while (this.stills.length > c.stills.max) { this.stills.shift(); this.seen = Math.max(0, this.seen - 1); }
      this.save();
      this.last.still = true;
    }
    this.shot = null;
    this.st = 'home';
    this.t = 0;
    this.stuckT = 0;
  }

  // After the end, with stills he has not shown yet: "Vill du se min film?" near him.
  maybeOffer() {
    const g = this.g, c = this.cfg, n = this.npc, p = g.player;
    if (!this.offering || g.inDialog || g.time < this.offerT || !this.free() || g.playerCar) return;
    if (dist(n.x, n.z, p.x, p.z) > c.offerR) return;
    this.offerT = g.time + c.offerEvery;
    g.say(n, c.offer, 2.6);
    n.chatT = 7;
  }

  // ---- stills (after the end) ---------------------------------------------------------------------
  // How high Stig is above the ground under him (0 in a car).
  height() {
    const g = this.g, p = g.player;
    return g.playerCar ? 0 : p.y - groundAt(p.x, p.z, p.y, 0.45);
  }
  // Called by main.loop right after the frame's render (the canvas has no preserved buffer): the
  // view from his eye at Stig into the canvas, its middle 16:9 scaled into a small jpeg, then the
  // player's frame again, so the screen never shows his.
  grab() {
    this.grabNow = false;
    const g = this.g, c = this.cfg, s = this.shot, n = this.npc;
    if (!s || !n || this.st !== 'film') return;
    const f = g.focus(), p = g.player;
    const tx = f.x, tz = f.z, ty = g.playerCar ? f.y + 0.9 : p.y + 1.0;
    const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz) || 1;
    const cam = this.cam3, el = renderer.domElement, W = el.width, H = el.height;
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
    cam.position.set(n.x + (dx / d) * c.look.ahead, n.y + c.look.eye, n.z + (dz / d) * c.look.ahead);
    cam.lookAt(tx, ty, tz);
    const vis = n.root.visible;
    n.root.visible = false;   // his own head and hands are behind his lens
    renderer.render(scene, cam);
    let sw = W, sh = (W * 9) / 16;
    if (sh > H) { sh = H; sw = (H * 16) / 9; }
    const cv = this.canvas ??= Object.assign(document.createElement('canvas'), { width: c.stills.w, height: c.stills.h });
    cv.getContext('2d').drawImage(el, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, c.stills.w, c.stills.h);
    s.src = cv.toDataURL('image/jpeg', c.stills.q);
    s.h = this.height();
    s.n++;
    n.root.visible = vis;
    renderer.render(scene, camera);
  }

  load() {
    if (new URLSearchParams(location.search).has('fresh')) return [];
    try {
      const a = JSON.parse(localStorage.getItem(this.cfg.stills.key) || '[]');
      return Array.isArray(a) ? a.filter((s) => typeof s === 'string' && s.startsWith('data:image/')).slice(-this.cfg.stills.max) : [];
    } catch (e) { return []; }
  }
  save() {
    try { localStorage.setItem(this.cfg.stills.key, JSON.stringify(this.stills)); } catch (e) { /* full or private: this session's only */ }
  }
  forget() {
    try { localStorage.removeItem(this.cfg.stills.key); } catch (e) { /* ignore */ }
  }

  // ---- the viewfinder and the film night --------------------------------------------------------
  canLook() {
    const g = this.g, p = g.player;
    return this.active && !g.inDialog && !this.view && this.free() && this.st !== 'notice' && this.st !== 'trot'
      && !g.shame.pursuit && !g.carrying && !g.playerCar && p.state === 'normal' && p.onGround;
  }
  dayLabel() {
    const c = this.cfg;
    return this.after ? c.look.julLabel : fmt(c.look.day, { n: clamp(this.g.missions.index - c.dayFrom, 1, 7) });
  }
  // Start a view: Stig stands still, Herr Storch is held where he is (filming or not).
  beginView(kind) {
    const g = this.g, p = g.player;
    this.ownView = !this.st;
    if (this.ownView) this.claim();
    this.view = kind;
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    hud.letterbox(true);
  }
  endView() {
    const g = this.g, n = this.npc;
    if (this.view === 'look') {
      hud.viewfinder(null);
      g.cam.release();
      g.cam.snapNext = true;
      if (n) n.anim.film = this.st === 'film';
    } else if (this.view === 'night') hud.filmNight(null);
    hud.letterbox(false);
    g.inDialog = false;
    this.view = null;
    if (this.ownView && !this.st) this.release();
    this.ownView = false;
  }
  // Hold a view `secs` s, or until E (or Space) after `minSecs`; `tick(t)` each frame.
  hold(secs, minSecs, tick = null) {
    const g = this.g;
    let t = 0;
    return new Promise((done) => {
      const fn = (dt) => {
        t += dt;
        tick?.(t);
        const skip = !g.autoDialog && t >= minSecs && (input.pressed('interact') || input.pressed('jump'));
        if (t >= secs || skip || !this.view) { g.offFrame(fn); done(); }
      };
      g.onFrame(fn);
    });
  }

  // E "Titta i kameran": the screen is his viewfinder, looking from his eye the way the player looks.
  async look() {
    if (!this.canLook()) return;
    const g = this.g, c = this.cfg, n = this.npc, live = this.after;
    this.beginView('look');
    n.anim.film = true;
    camera.getWorldDirection(_dir);
    _dir.y = 0;
    if (_dir.lengthSq() < 1e-6) _dir.set(Math.sin(n.yaw), 0, Math.cos(n.yaw));
    _dir.normalize();
    const ex = n.x + _dir.x * c.look.ahead, ez = n.z + _dir.z * c.look.ahead, ey = n.y + c.look.eye;
    g.cam.cutTo({ x: ex, y: ey, z: ez }, { x: ex + _dir.x * 12, y: ey - 0.5, z: ez + _dir.z * 12 });
    const line = live ? c.look.liveLine : pick(c.look.capLines), label = this.dayLabel();
    hud.viewfinder({ title: c.look.title, label, who: this.name, line, live });
    audio.whirr(1.2);
    this.lastView = { kind: 'look', live, label, line, t: g.time };
    await this.hold(c.look.secs, c.look.minSecs);
    if (this.view === 'look') this.endView();
  }

  // E "Se filmen" (after the end, with unseen stills): seven black days, his line, the julafton
  // stills, his line.
  async night() {
    if (!this.canLook() || !this.after) return;
    const g = this.g, c = this.cfg, k = c.night;
    const stills = this.stills.slice(-k.max);
    this.beginView('night');
    hud.filmNight({
      title: k.title, sub: k.sub, who: this.name,
      week: Array.from({ length: 7 }, (_, i) => fmt(c.look.day, { n: i + 1 })),
      weekLine: k.weekLine, stills, label: c.look.julLabel, julLine: k.julLine,
    });
    audio.whirr(2.4);
    this.seen = this.stills.length;
    this.lastView = { kind: 'night', stills: stills.length, steps: [], t: g.time };
    let i = 0;
    await this.hold(k.secs, k.minSecs, (t) => {
      while (i < k.steps.length && t >= k.steps[i][0]) { hud.filmNightStep(k.steps[i][1]); this.lastView.steps.push(k.steps[i][1]); i++; }
    });
    if (this.view === 'night') this.endView();
  }
}
