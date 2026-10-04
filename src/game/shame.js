// The level's meter, configured from METERS (DESIGN §5.9, §7). Owner: WP-H.
//   mode 'panic' (FLYGRÄDSLA, flight): at 100 Stig-Helmer gets PANIK (flail, then the mission's
//     onPanic or game.onPanicIdle). Never a pursuit. Deferred (clamped at 95) while a dialogue, a
//     cinematic or a cutaway camera is up; it fires when the scene ends if v is still >= 95.
//   mode 'pursuit' (SKANDAL, island): at 100 the Guardia Civil come: two Land Rovers and, on foot,
//     an officer who walks at you with collision, steering along the streets (routeAim's road graph)
//     when a building is in the way. Busted = ¡MULTA! (20 % of the purse, 250–1500) and a 3 s
//     freeze. Escape by getting far away until the meter drains, or bribe the porter at Hotel
//     Flamenco's reception (hideout, 500 pta, 60 s cooldown). Offences near Herr Storch add nothing
//     (the witness rule: his lens cap is on).

import { Car } from '../actors/car.js';
import { AIDriver } from '../actors/drivers.js';
import { Character } from '../actors/character.js';
import { CHARS } from '../actors/models.js';
import { nodeX, nodeZ, nodeI, nodeJ, nodeId, NN, N, P, HALF, LANE, neighbors, nearestNode, cellCorners, landmarks } from '../world/layout.js';
import { segmentBlocked } from '../world/collision.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { yawTo, pick, clamp, dist } from '../util.js';
import { fmt } from '../strings.js';

const STEER_REPLAN = 0.25;   // s between officer route plans
const rc = (i) => i * P - HALF;

export class Shame {
  constructor(game) {
    this.game = game;
    this.cfg = { mode: 'pursuit', label: '', cls: '', hot: 70, decayIdle: 5, idleDelay: 4, taunts: [] };
    this.v = 0;
    this.pursuit = false;
    this.pursuers = [];
    this.officer = null;
    this.sinceOffense = 99;
    this.locked = false;     // missions can freeze the meter (pursuit mode only)
    this.forced = false;     // missions can force a pursuit
    this.tauntT = 3;
    this.caughtT = 0;
    this.leaving = [];
    this.panicT = 0;         // > 0 while Stig-Helmer flails
    this.deferred = false;   // PANIK waiting for the dialogue/cinematic/cutaway to end
    this.witnessT = 0;
    this.hideoutT = 0;       // porter-bribe cooldown
    this.filmT = 0;
    this._hideoutRm = [];
    // Officer steering state (reused; no per-frame allocation).
    this.steer = { t: 0, x: 0, z: 0, mode: 'direct', path: [], chkT: 0, chkX: 0, chkZ: 0, sideT: 0, side: 1 };
  }

  get mode() { return this.cfg.mode; }

  // A dialogue, a cinematic or a cutaway camera is up: no PANIK now (§5.9).
  get inScene() { const g = this.game; return !!(g.inDialog || g.inCutaway); }

  // Switch meters (level change): v = 0, any pursuit ended, pursuers and the officer removed.
  configure(cfg) {
    this.clear();
    this.cfg = cfg;
    this.panicT = 0;
    this.deferred = false;
    this.locked = false;
    hud.setMeterLabel(cfg.label, cfg.cls);
    hud.setFear(0);
    hud.setMeter(0, false, false);
    this.setupHideouts(cfg);
  }

  add(amount, { force = false } = {}) {
    if (amount <= 0) return;
    const g = this.game;
    if (this.cfg.mode === 'panic') {
      // Panic mode ignores `locked` and never starts a pursuit.
      if (this.panicT > 0) return;
      this.v = Math.min(100, this.v + amount);
      this.sinceOffense = 0;
      if (this.v >= 100) {
        if (this.inScene) { this.v = 95; this.deferred = true; }
        else this.panic();
      }
      return;
    }
    if (this.locked && !force) return;
    // Witness rule: an offence near Herr Storch adds nothing (the lens cap is on).
    const w = this.cfg.witnessToast;
    if (w && !force) {
      const n = g.npcs?.[w.who];
      const f = g.focus();
      if (n && n.state !== 'hidden' && dist(n.x, n.z, f.x, f.z) < w.r) {
        // The lens-cap toast and the filming are free-roam colour: never over a scene or cutaway.
        if (this.witnessT <= 0 && !this.inScene) {
          this.witnessT = w.cooldown ?? 60;
          hud.toast(w.text, 'witness');
          if (w.say) g.say(n, w.say, 2.4);
          if (n.anim && !n.anim.film) { n.anim.film = true; this.filmT = 2.4; this.filmWho = n; }
        }
        return;
      }
    }
    this.v = Math.min(100, this.v + amount);
    this.sinceOffense = 0;
    if (this.v >= 100 && !this.pursuit) this.startPursuit();
  }

  relieve(n) {
    if (n <= 0) return;
    this.v = Math.max(0, this.v - n);
  }

  // ---- panic mode -----------------------------------------------------------------------------
  panic() {
    const g = this.game, c = this.cfg;
    this.v = 100;
    this.deferred = false;
    this.panicT = c.flailSecs ?? 2.5;
    const [main, sub] = c.panicBanner || ['PANIK!', ''];
    hud.showBanner(main, sub, 'fear', Math.round(this.panicT * 1000));
    hud.flashColor('rgba(255,255,255,0.85)');
    hud.panic(this.panicT);
    g.cam.shake = 1.2;
    for (let k = 0; k < 4; k++) setTimeout(() => audio.heartbeat(), k * 280);
    g.player.anim.flail = true;
  }

  endPanic() {
    const g = this.game;
    g.player.anim.flail = false;
    const failed = g.missions.onPanic?.();
    if (!failed) g.onPanicIdle();
  }

  // ---- pursuit mode ---------------------------------------------------------------------------
  startPursuit() {
    const g = this.game, c = this.cfg;
    if (c.mode !== 'pursuit') return;
    this.pursuit = true;
    this.v = 100;
    const [main, sub] = c.bannerStart || ['', ''];
    hud.showBanner(main, sub, 'skandal', 2600);
    hud.flashColor('rgba(60,110,70,0.45)');
    if (c.siren) audio.siren(true);
    audio.setTune('skandal');
    const f = g.focus();
    // Spawn the Land Rovers at intersections a little way off, out of the player's face
    // (cfg.spawnDist [min, max] m).
    // Never straight ahead of a moving player (a head-on bust in the first seconds), and each
    // car starts facing the street that leads towards him.
    const [dMin, dMax] = c.spawnDist || [70, 150];
    const sp = Math.hypot(f.car?.vx || 0, f.car?.vz || 0), hx = sp > 2 ? f.car.vx / sp : 0, hz = sp > 2 ? f.car.vz / sp : 0;
    const cands = [];
    for (let id = 0; id < NN * NN; id++) {
      const dx = nodeX(id) - f.x, dz = nodeZ(id) - f.z, d = Math.hypot(dx, dz);
      if (d > dMin && d < dMax && (dx * hx + dz * hz) / d < 0.5) cands.push(id);
    }
    for (let k = 0; k < (c.vehicleCount ?? 2) && cands.length; k++) {
      const id = cands.splice((Math.random() * cands.length) | 0, 1)[0];
      let nb = neighbors(id)[0], best = -Infinity;
      for (const m of neighbors(id)) {
        const ex = nodeX(m) - nodeX(id), ez = nodeZ(m) - nodeZ(id), s2 = (ex * (f.x - nodeX(id)) + ez * (f.z - nodeZ(id))) / (Math.hypot(ex, ez) || 1);
        if (s2 > best) { best = s2; nb = m; }
      }
      const dx = nodeX(nb) - nodeX(id), dz = nodeZ(nb) - nodeZ(id), l = Math.hypot(dx, dz);
      const x = nodeX(id) + (dx / l) * 12 + (-dz / l) * LANE, z = nodeZ(id) + (dz / l) * 12 + (dx / l) * LANE;
      const car = new Car(c.vehicle || 'guardia', { x, z, yaw: yawTo(dx, dz) });
      car.place(x, z, yawTo(dx, dz));
      car.isPursuer = true;
      car.locked = true;
      car.spec.maxSpeed = c.vehicleMaxSpeed ?? 28;
      // Rubber band (cfg.catchUp [beyond m, × speed]): a Land Rover that has lost touch drives harder
      // (bends included), so getting away means staying away, not just one good straight.
      const [farD, farK] = c.catchUp || [Infinity, 1];
      car.ai = new AIDriver(car, { mode: 'chase', target: () => g.focusTarget(), cruise: (c.vehicleMaxSpeed ?? 28) - 2, aggressive: true, avoid: false,
        rubber: () => { const ff = g.focus(); return Math.hypot(ff.x - car.x, ff.z - car.z) > farD ? farK : 1; } });
      car.bust = g.addBust(CHARS[c.pursuerDef || 'guardia'], car);
      g.addCar(car);
      this.pursuers.push(car);
    }
  }

  endPursuit(caught) {
    const g = this.game;
    this.pursuit = false;
    this.forced = false;
    for (const h of this.pursuers) {
      if (h.dead) { this.leaving.push({ car: h, t: 12 }); continue; }
      h.ai = new AIDriver(h, { mode: 'traffic', cruise: 14 });
      this.leaving.push({ car: h, t: 25 });
    }
    this.pursuers = [];
    this.hideOfficer();
    audio.siren(false);
    audio.setTune(g.levelTune?.() || g.levelDef?.tune || 'sol');
    if (!caught) {
      const [main, sub] = this.cfg.bannerEscape || ['', ''];
      hud.showBanner(main, sub, 'good', 2200);
      audio.jingle('complete');
    }
  }

  busted() {
    const g = this.game, c = this.cfg;
    const pen = c.penalty || { share: 0.2, min: 250, max: 1500 };
    const fine = Math.min(g.coins, clamp(Math.round((pen.share * g.coins) / 25) * 25, pen.min, pen.max));
    g.coins -= fine;
    hud.setCoins(g.coins);
    this.v = 0;
    this.caughtT = 2.2;
    if (g.playerCar) g.exitCar(true);
    const f = g.focus();
    fx.meterPuff(f.x, f.y + 1, f.z, 0x3d5a3a, 30);
    hud.flashColor('rgba(60,110,70,0.7)');
    const [main, sub, none] = c.bannerCaught || ['', '', ''];
    hud.showBanner(main, fine ? String(sub || fmt('busted', { n: fine })).replace('{n}', fine) : none, 'multa', 3000);
    audio.slap();
    // Frozen beside the officer for bustFreeze seconds. endPursuit first (it hides the officer),
    // then the officer is (re)placed 1.1 m in front of the player, whether the bust came on foot or
    // from a ram while the player was in a car (the officer is hidden then, possibly far away).
    g.frozenT = c.bustFreeze ?? 3;
    this.endPursuit(true);
    const p = g.player;
    let ox = p.x + Math.sin(p.yaw) * 1.1, oz = p.z + Math.cos(p.yaw) * 1.1;
    if (!g.spotFree(ox, oz) || !g.levelDef.inBounds(ox, oz, g)) { const s = g.freeSpot(p.x, p.z, 1, 2); ox = s.x; oz = s.z; }
    const o = this.ensureOfficer(ox, oz);
    o.wishX = o.wishZ = 0;
    o.yaw = yawTo(p.x - o.x, p.z - o.z);
    o.sync(0);
    g.say(o, c.bustLine || '¡Documentación!', 2.2);
    this.officerLinger = c.bustFreeze ?? 3;
    // P1 flavour: Lasse on the radio, once the freeze is over; free roam only (never after a bust
    // that fails or interrupts a mission).
    if (c.bustRadio && g.wait && g.missions.state === 'idle') g.wait((c.bustFreeze ?? 3) + 0.3).then(() => { if (g.level === 'island' && g.missions.state === 'idle') g.radio(c.bustRadio[0], c.bustRadio[1]); });
    g.missions.onBusted?.();
  }

  // ---- hideouts (P1, §7.2): bribe the porter during a pursuit ---------------------------------
  setupHideouts(cfg) {
    for (const rm of this._hideoutRm) rm();
    this._hideoutRm = [];
    if (cfg.mode !== 'pursuit' || !cfg.hideouts || !this.game.addInteractable) return;
    for (const h of cfg.hideouts) {
      const it = {
        id: 'hideout:' + h.at, r: h.r ?? 2.6, prompt: h.prompt, priority: 100,
        pos: () => landmarks[h.at] || null,
        enabled: (g) => this.pursuit && !g.playerCar && this.hideoutT <= 0 && !(g.frozenT > 0),
        use: () => this.bribe(h),
      };
      this._hideoutRm.push(this.game.addInteractable(it));
    }
  }

  async bribe(h) {
    const g = this.game;
    if (!this.pursuit) return;
    await g.pay(h.cost ?? 500);          // Ole pays if the purse is short (§10.2)
    if (!this.pursuit) return;
    this.hideoutT = h.cooldown ?? 60;
    this.v = 0;
    this.endPursuit(true);
    const [who, text] = h.line || [];
    const n = who && g.npcs?.[who];
    if (n && n.state !== 'hidden') g.say(n, text, 3.2);
    else if (who) g.radio(who, text);
    const [main, sub] = h.banner || ['', ''];
    hud.showBanner(main, sub, 'good', 2600);
    hud.flashColor('rgba(247,195,27,0.4)');
    audio.coin();
    audio.jingle('complete');
  }

  // ---- the officer on foot ----------------------------------------------------------------------
  // A solid Character that walks at the player with collision (pursuit mode, pursuerPhysics
  // 'walk'). Created once and reused.
  ensureOfficer(x, z) {
    const g = this.game;
    if (!this.officer) {
      this.officer = new Character(CHARS[this.cfg.pursuerDef || 'guardia'], { x, z });
      this.officer.key = 'guardiaOfficer';
      g.scene.add(this.officer.root);
    }
    const o = this.officer;
    o.state = 'normal';
    o.teleport(x, z);
    o.root.visible = true;
    o.trail = [{ x, z, t: 0 }];
    o.age = 0;
    const st = this.steer;
    st.t = 0; st.sideT = 0; st.chkT = 0; st.chkX = x; st.chkZ = z;
    return o;
  }
  hideOfficer() {
    const o = this.officer;
    if (!o) return;
    o.state = 'hidden';
    o.root.visible = false;
    o.wishX = o.wishZ = 0;
  }

  // Where the officer walks this step (§7.2, risk 11): straight at the player when nothing solid
  // stands in between, otherwise along the streets. The route is officer -> the corner of his block
  // he can reach -> a staircase of intersections -> the kerb point nearest the player -> the
  // player, string-pulled to the furthest waypoint he can see. Replanned four times a second.
  planOfficer(o, p) {
    const st = this.steer, y = o.y + 0.5;
    st.mode = 'direct'; st.x = p.x; st.z = p.z;
    if (!this.game.levelDef.routeAim) return;
    if (segmentBlocked(o.x, o.z, p.x, p.z, y) < 0) return;
    // The kerb point nearest the player: the closest point on the four streets around his block.
    const ci = clamp(Math.floor((p.x + HALF) / P), 0, N - 1), cj = clamp(Math.floor((p.z + HALF) / P), 0, N - 1);
    const x0 = rc(ci), x1 = rc(ci + 1), z0 = rc(cj), z1 = rc(cj + 1);
    let kx = p.x, kz = z0, kd = Math.abs(p.z - z0);
    if (Math.abs(p.z - z1) < kd) { kd = Math.abs(p.z - z1); kz = z1; }
    if (Math.abs(p.x - x0) < kd) { kd = Math.abs(p.x - x0); kx = x0; kz = p.z; }
    if (Math.abs(p.x - x1) < kd) { kd = Math.abs(p.x - x1); kx = x1; kz = p.z; }
    kx = clamp(kx, rc(0), rc(N)); kz = clamp(kz, rc(0), rc(N));
    const end = nearestNode(kx, kz);
    // Start at the corner of his own cell that is visible and cheapest overall.
    let start = end, bc = Infinity;
    for (const c of cellCorners(o.x, o.z)) {
      const cx = nodeX(c), cz = nodeZ(c);
      const cost = Math.hypot(cx - o.x, cz - o.z) + (Math.abs(nodeI(c) - nodeI(end)) + Math.abs(nodeJ(c) - nodeJ(end))) * P
        + (segmentBlocked(o.x, o.z, cx, cz, y) < 0 ? 0 : 300);
      if (cost < bc) { bc = cost; start = c; }
    }
    // Staircase start -> end, along the longer axis first.
    const path = st.path;
    path.length = 0;
    let i = nodeI(start), j = nodeJ(start);
    const ei = nodeI(end), ej = nodeJ(end);
    path.push(start);
    const iFirst = Math.abs(ei - i) >= Math.abs(ej - j);
    for (let pass = 0; pass < 2; pass++) {
      if ((pass === 0) === iFirst) while (i !== ei) { i += Math.sign(ei - i); path.push(nodeId(i, j)); }
      else while (j !== ej) { j += Math.sign(ej - j); path.push(nodeId(i, j)); }
    }
    // String-pull: the furthest visible of [kerb point, ...path reversed]; a few checks at most.
    st.mode = 'route';
    if (segmentBlocked(o.x, o.z, kx, kz, y) < 0) { st.x = kx; st.z = kz; return; }
    for (let k = path.length - 1, checks = 0; k >= 1 && checks < 3; k--, checks++) {
      const nx = nodeX(path[k]), nz = nodeZ(path[k]);
      if (segmentBlocked(o.x, o.z, nx, nz, y) < 0) { st.x = nx; st.z = nz; return; }
    }
    st.x = nodeX(path[0]); st.z = nodeZ(path[0]);
    // Already standing on the first waypoint: head on to the next one.
    if (Math.hypot(st.x - o.x, st.z - o.z) < 2) {
      if (path.length > 1) { st.x = nodeX(path[1]); st.z = nodeZ(path[1]); } else { st.x = kx; st.z = kz; }
    }
  }

  officerChase(dt) {
    const g = this.game, c = this.cfg, st = this.steer;
    const p = g.player;
    if (g.playerCar) { this.hideOfficer(); this.officerGone = true; return; }
    let o = this.officer;
    if (!o || o.state === 'hidden') {
      // Spawn (or re-spawn after a car ride) 30 m away.
      const s = g.freeSpot(p.x, p.z, this.officerGone ? 30 : 22, this.officerGone ? 34 : 32);
      o = this.ensureOfficer(s.x, s.z);
      this.officerGone = false;
    }
    const d = Math.hypot(p.x - o.x, p.z - o.z);
    st.t -= dt;
    if (st.t <= 0 || (st.mode === 'route' && Math.hypot(st.x - o.x, st.z - o.z) < 1.5)) { st.t = STEER_REPLAN; this.planOfficer(o, p); }
    if (st.mode === 'direct') { st.x = p.x; st.z = p.z; }
    let ax = st.x - o.x, az = st.z - o.z;
    const al = Math.hypot(ax, az) || 1;
    ax /= al; az /= al;
    // Unstick: less than 0.5 m of progress in a second while not at the player -> sidestep along
    // the wall for 0.8 s (alternating sides), then plan again.
    st.chkT += dt;
    if (st.chkT >= 1) {
      const moved = Math.hypot(o.x - st.chkX, o.z - st.chkZ);
      if (moved < 0.5 && d > 2) { st.sideT = 0.8; st.side = -st.side; st.t = 0; }
      st.chkT = 0; st.chkX = o.x; st.chkZ = o.z;
    }
    if (st.sideT > 0) {
      st.sideT -= dt;
      const sx = -az * st.side, sz = ax * st.side;
      ax = ax * 0.25 + sx; az = az * 0.25 + sz;
      const l2 = Math.hypot(ax, az) || 1; ax /= l2; az /= l2;
    }
    const sp = c.onFootSpeed ?? 7;
    o.wishX = d > 0.5 ? ax * sp : 0;
    o.wishZ = d > 0.5 ? az * sp : 0;
    o.step(dt, g);
    o.sync(dt);
    // Stuck rule (safety net): moved < 0.6 m in 3 s, or > 60 m away, while out of the camera's view
    // (or > 25 m from it): teleport him behind the player (opposite the camera yaw).
    o.age += dt;
    o.trail.push({ x: o.x, z: o.z, t: o.age });
    while (o.trail.length > 2 && o.age - o.trail[0].t > 3) o.trail.shift();
    const old = o.trail[0];
    const stuck = o.age - old.t >= 2.9 && Math.hypot(o.x - old.x, o.z - old.z) < 0.6;
    if ((stuck || d > 60) && !this.inView(o)) {
      const yaw = g.cam.yaw, bx = p.x - Math.sin(yaw) * 27, bz = p.z - Math.cos(yaw) * 27;
      const s = g.spotFree(bx, bz) && g.levelDef.inBounds(bx, bz, g) ? { x: bx, z: bz } : g.freeSpot(p.x, p.z, 22, 32);
      o.teleport(s.x, s.z);
      o.trail.length = 0;
      o.trail.push({ x: o.x, z: o.z, t: o.age });
      st.t = 0; st.sideT = 0; st.chkT = 0; st.chkX = o.x; st.chkZ = o.z;
      this.teleports = (this.teleports || 0) + 1;
    }
    if (d < 1.4 && this.caughtT <= 0) this.busted();
  }

  inView(o) {
    const cam = this.game.cam.cam;
    const dc = Math.hypot(o.x - cam.position.x, o.z - cam.position.z);
    if (dc > 25) return false;
    const fx = Math.sin(this.game.cam.yaw), fz = Math.cos(this.game.cam.yaw);
    const vx = o.x - cam.position.x, vz = o.z - cam.position.z;
    return (vx * fx + vz * fz) / (dc || 1) > Math.cos((cam.fov * Math.PI) / 180 * 0.9);
  }

  update(dt) {
    const g = this.game, c = this.cfg;
    this.sinceOffense += dt;
    this.caughtT = Math.max(0, this.caughtT - dt);
    this.witnessT -= dt;
    this.hideoutT -= dt;
    if (this.filmT > 0) { this.filmT -= dt; if (this.filmT <= 0 && this.filmWho) { this.filmWho.anim.film = false; this.filmWho = null; } }
    for (let k = this.leaving.length - 1; k >= 0; k--) {
      const l = this.leaving[k];
      l.t -= dt;
      const f = g.focus();
      if (l.t <= 0 || (l.t < 20 && Math.hypot(l.car.x - f.x, l.car.z - f.z) > 120)) { g.removeCar(l.car); this.leaving.splice(k, 1); }
    }
    if (this.officerLinger > 0) {
      this.officerLinger -= dt;
      if (this.officerLinger <= 0 && !this.pursuit) this.hideOfficer();
    }
    if (c.mode === 'panic') {
      if (this.panicT > 0) {
        this.panicT -= dt;
        g.player.anim.flail = true;
        if (this.panicT <= 0) this.endPanic();
      } else {
        if (this.deferred && !this.inScene) { if (this.v >= 95) this.panic(); else this.deferred = false; }
        if (this.sinceOffense > (c.idleDelay ?? 4)) this.v = Math.max(0, this.v - (c.decayIdle ?? 2) * dt);
      }
      hud.setMeter(this.v, this.v >= (c.hot ?? 70), false);
      hud.setFear(this.v / 100);
      return;
    }
    if (!this.pursuit) {
      if (this.forced) { this.v = 100; this.startPursuit(); }
      else if (this.sinceOffense > (c.idleDelay ?? 4)) this.v = Math.max(0, this.v - (c.decayIdle ?? 5) * dt);
    } else {
      const f = g.focus();
      let near = Infinity;
      for (const h of this.pursuers) if (!h.dead) near = Math.min(near, Math.hypot(h.x - f.x, h.z - f.z));
      const o = this.officer && this.officer.state !== 'hidden' ? this.officer : null;
      if (o) near = Math.min(near, Math.hypot(o.x - f.x, o.z - f.z));
      if (!this.forced) {
        for (const [r, rate] of c.bands || [[42, 9], [22, 3]]) if (near > r) { this.v -= rate * dt; break; }
        if (this.pursuers.every((h) => h.dead) && !o) this.v -= (c.allDeadDecay ?? 12) * dt;
        if (this.v <= 0) { this.v = 0; this.endPursuit(false); }
      }
      if (this.pursuit) {
        audio.sirenNear(near);
        if (c.pursuerPhysics === 'walk') this.officerChase(dt);
        this.tauntT -= dt;
        if (this.tauntT <= 0 && near < 40 && c.taunts?.length) {
          this.tauntT = 4 + Math.random() * 3;
          const src = (this.officer && this.officer.state !== 'hidden' && this.officer) || this.pursuers.find((h) => !h.dead);
          if (src) g.say(src.bust ? { x: src.x, y: src.y, z: src.z, height: 2.6 } : src, pick(c.taunts), 2.2);
        }
      }
    }
    hud.setMeter(this.v, this.v >= (c.hot ?? 70), this.pursuit);
  }

  // A pursuer car rammed the player's car.
  onRam(car, impact) {
    if (this.pursuit && car.isPursuer && impact > 1.5 && this.caughtT <= 0) this.busted();
  }

  clear() {
    const g = this.game;
    for (const h of this.pursuers) g.removeCar(h);
    for (const l of this.leaving) g.removeCar(l.car);
    this.pursuers = []; this.leaving = [];
    this.hideOfficer();
    if (this.pursuit) audio.siren(false);
    this.pursuit = false; this.forced = false; this.v = 0;
    this.deferred = false;
    if (this.panicT > 0) { this.panicT = 0; g.player && (g.player.anim.flail = false); hud.panic(0); }
    if (this.filmWho) { this.filmWho.anim.film = false; this.filmWho = null; this.filmT = 0; }
  }
}
