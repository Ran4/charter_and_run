// The level's meter, configured from METERS (DESIGN §5.9, §7). Owner: WP-H.
//   mode 'panic' (FLYGRÄDSLA, flight): at 100 Stig-Helmer gets PANIK (flail, then the mission's
//     onPanic or game.onPanicIdle). Never a pursuit. Deferred (clamped at 95) during dialogue.
//   mode 'pursuit' (SKANDAL, island): at 100 the Guardia Civil come: two Land Rovers and, on foot,
//     an officer who walks at you with collision. Busted = ¡MULTA! (20 % of the purse, 250–1500)
//     and a 3 s freeze. Escape by getting far away until the meter drains.
// Phase 0: the officer walks straight at the player (+ the stuck teleport); WP-H adds routeAim
// steering, the porter hideout and siren polish.

import { Car } from '../actors/car.js';
import { AIDriver } from '../actors/drivers.js';
import { Character } from '../actors/character.js';
import { CHARS } from '../actors/models.js';
import { nodeX, nodeZ, NN, LANE, neighbors } from '../world/layout.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { yawTo, pick, clamp, dist } from '../util.js';
import { fmt } from '../strings.js';

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
    this.deferred = false;   // PANIK waiting for the dialogue/cinematic to end
    this.witnessT = 0;
  }

  get mode() { return this.cfg.mode; }

  // Switch meters (level change): v = 0, any pursuit ended, pursuers and the officer removed.
  configure(cfg) {
    this.clear();
    this.cfg = cfg;
    this.panicT = 0;
    this.deferred = false;
    this.locked = false;
    hud.setMeterLabel(cfg.label, cfg.cls);
    hud.setFear(0);
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
        if (g.inDialog) { this.v = 95; this.deferred = true; }
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
        if (this.witnessT <= 0) { this.witnessT = w.cooldown; hud.toast(w.text); }
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
    hud.showBanner(main, sub, 'fear', 2400);
    hud.flashColor('rgba(255,255,255,0.85)');
    g.cam.shake = 1.2;
    for (let k = 0; k < 3; k++) setTimeout(() => audio.heartbeat(), k * 300);
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
    // Spawn the Land Rovers at intersections a little way off, out of the player's face.
    const cands = [];
    for (let id = 0; id < NN * NN; id++) {
      const d = Math.hypot(nodeX(id) - f.x, nodeZ(id) - f.z);
      if (d > 70 && d < 150) cands.push(id);
    }
    for (let k = 0; k < (c.vehicleCount ?? 2) && cands.length; k++) {
      const id = cands.splice((Math.random() * cands.length) | 0, 1)[0];
      const nb = neighbors(id)[0];
      const dx = nodeX(nb) - nodeX(id), dz = nodeZ(nb) - nodeZ(id), l = Math.hypot(dx, dz);
      const x = nodeX(id) + (dx / l) * 12 + (-dz / l) * LANE, z = nodeZ(id) + (dz / l) * 12 + (dx / l) * LANE;
      const car = new Car(c.vehicle || 'guardia', { x, z, yaw: yawTo(dx, dz) });
      car.place(x, z, yawTo(dx, dz));
      car.isPursuer = true;
      car.locked = true;
      car.spec.maxSpeed = c.vehicleMaxSpeed ?? 28;
      car.ai = new AIDriver(car, { mode: 'chase', target: () => g.focusTarget(), cruise: (c.vehicleMaxSpeed ?? 28) - 2, aggressive: true, avoid: false });
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
    hud.showBanner(main, fine ? String(sub || fmt('busted', { n: fine })).replace('{n}', fine) : none, 'skandal', 3000);
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
    g.missions.onBusted?.();
  }

  // The officer on foot: a solid Character that walks at the player with collision (pursuit mode,
  // pursuerPhysics 'walk'). Created once and reused.
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
    return o;
  }
  hideOfficer() {
    const o = this.officer;
    if (!o) return;
    o.state = 'hidden';
    o.root.visible = false;
    o.wishX = o.wishZ = 0;
  }

  officerChase(dt) {
    const g = this.game, c = this.cfg;
    const p = g.player;
    if (g.playerCar) { this.hideOfficer(); this.officerGone = true; return; }
    let o = this.officer;
    if (!o || o.state === 'hidden') {
      // Spawn (or re-spawn after a car ride) 30 m away.
      const s = g.freeSpot(p.x, p.z, this.officerGone ? 30 : 22, this.officerGone ? 34 : 32);
      o = this.ensureOfficer(s.x, s.z);
      this.officerGone = false;
    }
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
    const sp = c.onFootSpeed ?? 7;
    o.wishX = d > 0.5 ? (dx / d) * sp : 0;
    o.wishZ = d > 0.5 ? (dz / d) * sp : 0;
    o.step(dt, g);
    o.sync(dt);
    // Stuck rule: moved < 0.6 m in 3 s, or > 60 m away, while out of the camera's view (or > 25 m
    // from it): teleport him behind the player (opposite the camera yaw).
    o.age += dt;
    o.trail.push({ x: o.x, z: o.z, t: o.age });
    while (o.trail.length > 2 && o.age - o.trail[0].t > 3) o.trail.shift();
    const old = o.trail[0];
    const stuck = o.age - old.t >= 2.9 && Math.hypot(o.x - old.x, o.z - old.z) < 0.6;
    if ((stuck || d > 60) && !this.inView(o)) {
      const yaw = g.cam.yaw, bx = p.x - Math.sin(yaw) * 27, bz = p.z - Math.cos(yaw) * 27;
      const s = g.spotFree(bx, bz) && g.levelDef.inBounds(bx, bz, g) ? { x: bx, z: bz } : g.freeSpot(p.x, p.z, 22, 32);
      o.teleport(s.x, s.z);
      o.trail = [{ x: o.x, z: o.z, t: o.age }];
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
        if (this.deferred && !g.inDialog) { if (this.v >= 95) this.panic(); else this.deferred = false; }
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
    if (this.panicT > 0) { this.panicT = 0; g.player && (g.player.anim.flail = false); }
  }
}
