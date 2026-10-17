// Låna Guardia-jeepen – "Ursäkta, är det din bil?" (free roam; feature 51, DESIGN §10.34). After the
// bodega the west jeep at the Casa Cuartel (guardia1) stands open between missions. Getting in at
// the barracks is a loan, and Stig says so: "Jag lånar den bara en liten stund…", and SKANDAL goes to
// the top. Shaken off, the jeep is his for the session; H in it is the siren and its blue lamp, and
// traffic ahead going his way slows and keeps to the right. Busted with it, the officer asks the
// film's "Ursäkta, är det din bil?", Stig answers "Nej.", and the jeep is towed back to its bay.
// Only on the island with no mission running (`missions.state === 'idle'`): in a mission and in the
// flight level the jeep is locked as before and H is the horn, so no mission, stage kind, timer or
// calibration pool sees any of it, and the pursuit's own jeeps never make traffic give way. Config:
// GUARDIA_JEEP (content/island.js). Owned by Game as `jeep`: main.js calls `onEnter(car)` from
// enterCar, `prompt(car)` from updateHud, `hasSiren(car)` for H, `update` once a frame and reads
// `sirenOn`; shame.js calls `onBusted()` from busted and `onPursuitEnd()` from endPursuit; the
// traffic's AIDriver reads `game.sirenYield`.

import { GUARDIA_JEEP } from '../content/index.js';
import { THREE } from '../gfx.js';
import { input } from '../input.js';
import { hud } from './hud.js';
import { dist, pick, yawTo, dampAngle } from '../util.js';

// The blinking lamp over the merged blue one on the roof (car.js guardiaBody: top + 0.25 at the
// windscreen − 0.35), a bright dome and an additive halo; one material each, shared. Also the
// lamps of the Land Rovers waiting outside the church (game/church.js).
let lampMat = null, haloMat = null;
export function lampMesh(car) {
  if (!lampMat) {
    lampMat = new THREE.MeshBasicMaterial({ color: 0x7ab4ff });
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(150,200,255,1)');
    gr.addColorStop(0.3, 'rgba(60,130,255,0.55)');
    gr.addColorStop(1, 'rgba(40,110,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    haloMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  }
  const s = car.spec, top = s.wheelR * 0.95 + s.bodyH, z = s.len / 2 - 1.15 - 0.35;
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), lampMat);
  dome.scale.set(1, 0.75, 1);
  dome.position.set(0, top + 0.33, z);
  const halo = new THREE.Sprite(haloMat);
  halo.position.set(0, top + 0.36, z);
  halo.scale.setScalar(1.7);
  g.add(dome, halo);
  g.visible = false;
  car.tilt.add(g);
  return g;
}

export class GuardiaJeep {
  constructor(game, cfg = GUARDIA_JEEP) {
    this.g = game;
    this.cfg = cfg;
    this.loanT = 0;          // s until the loan's SKANDAL (he has just got in at the barracks)
    this.loan = false;       // the running pursuit is the loan's
    this.hisCar = null;      // the jeep he shook them off in: his, no SKANDAL (this session)
    this.bust = null;        // the bust scene: { t, asked, no, dark, towed }
    this.sirenOn = false;    // H held in it (free roam)
    this.yielded = false;    // the session's first car has given way (Stig's `surprised`)
    this.angerudT = -Infinity;
    this.oathT = 0;
    this.lamp = null;        // { car, mesh }
    this.known = null;       // the unlock was there at the first frame (a loaded save): no `open` toast
    this.yield = { x: 0, z: 0, fx: 0, fz: 1, ...cfg.yield };
    this.last = null;        // for tests: { t, kind: 'loan' | 'his' | 'bust' | 'tow' | 'respawn', ... }
  }

  // On the island between missions.
  active() {
    const g = this.g;
    return g.level === 'island' && g.missions.state === 'idle';
  }
  // The jeep is open (unlocked, free roam, no bust scene under way).
  open() { return this.active() && this.g.unlocked.has(this.cfg.unlock) && !this.bust; }
  car() { const c = this.g.named[this.cfg.car]; return c && this.g.cars.includes(c) ? c : null; }
  bay() { return this.g.named[this.cfg.car]?.home || null; }
  his(car) { return !!car && car === this.hisCar && !car.dead; }
  // Getting into `car` now is the loan: the open jeep, not his, at the barracks.
  isLoan(car) {
    const b = this.bay();
    return !!car && car === this.car() && !car.locked && this.open() && !this.his(car) && !!b && dist(car.x, car.z, b.x, b.z) < this.cfg.loanR;
  }
  // H in `car` is the siren (the jeep in free roam), not the horn.
  hasSiren(car) { return !!car && !car.dead && !!car.spec.guardia && car === this.car() && this.active(); }

  prompt(car) { return this.isLoan(car) ? this.cfg.prompt : null; }

  // main.enterCar, before he sits down.
  onEnter(car) {
    if (!this.isLoan(car)) return;
    const g = this.g;
    g.say(g.player, this.cfg.borrow, 2.2);
    this.loanT = this.cfg.shameAt;
    this.last = { t: g.time, kind: 'loan' };
  }

  // shame.busted, before he is pulled out: true when the jeep's scene replaces the bust line and the
  // radio (he is in it, or this is the loan's pursuit).
  onBusted() {
    const g = this.g, car = this.car();
    if (!this.active() || !car || this.bust || !(this.loan || g.playerCar === car)) return false;
    this.loan = false;
    this.loanT = 0;
    this.hisCar = null;
    this.bust = { t: g.time, asked: false, no: false, dark: false, towed: false, inCar: g.playerCar === car };
    this.last = { t: g.time, kind: 'bust', inCar: this.bust.inCar };
    return true;
  }
  // shame.endPursuit: the loan's pursuit is over and it was no bust (onBusted came first): his.
  onPursuitEnd() {
    if (!this.loan) return;
    this.loan = false;
    if (this.active()) this.makeHis();
  }
  makeHis() {
    const g = this.g, car = this.car();
    if (!car || car.dead) return;
    this.hisCar = car;
    hud.toast(this.cfg.his);
    this.last = { t: g.time, kind: 'his' };
  }

  update(dt) {
    const g = this.g, c = this.cfg;
    // The unlock's own toast, after the grisbil's (not for a loaded save), once it is free roam.
    const has = g.unlocked.has(c.unlock);
    if (this.known == null) this.known = has;
    else if (has && !this.known && this.active()) { this.known = true; hud.toast(c.open); }
    if (!this.active()) { this.reset(); return; }
    const car = this.car();
    // Locked as before in a mission (reset) and while it is being towed; open between missions.
    if (car && car !== g.playerCar) car.locked = !this.open();
    if (this.loanT > 0) {
      this.loanT -= dt;
      if (this.loanT <= 0) {
        this.loanT = 0;
        g.shame.add(c.shame);
        // A pursuit (a running one too) is the loan's; none (Herr Storch's lens cap): his at once.
        if (g.shame.pursuit) this.loan = true; else this.makeHis();
      }
    }
    if (this.loan && !g.shame.pursuit) this.loan = false;   // cleared (shame.clear), not shaken off
    if (this.bust) this.tickBust();
    // Wrecked and cleared away (recycleTraffic): a new one in its bay once he is well away.
    const b = this.bay();
    if (!car && b && this.open()) {
      const f = g.focus();
      if (dist(f.x, f.z, b.x, b.z) > c.respawnR) { g.ensureNamedCar(c.car); this.last = { t: g.time, kind: 'respawn' }; }
    }
    this.tickSiren(dt);
  }

  // The bust with the jeep: the question, the answer, the tow.
  tickBust() {
    const g = this.g, c = this.cfg, b = this.bust, t = g.time - b.t;
    if (!b.asked && t >= c.askAt) {
      b.asked = true;
      const o = g.shame.officer;
      if (o && o.state !== 'hidden') g.say(o, c.ask, 1.6);
    }
    if (!b.no && t >= c.noAt) { b.no = true; g.say(g.player, c.no, 1.2); }
    if (!b.started && t >= c.towAt) {
      b.started = true;
      const car = this.car(), f = g.focus();
      b.dark = !!car && dist(car.x, car.z, f.x, f.z) < c.seeR && !g.inDialog;
      if (b.dark) { g.inDialog = true; hud.fade(true); }
    }
    if (b.started && !b.towed && (!b.dark || t >= c.towAt + c.fadeSecs)) this.tow();
    if (b.towed && (!b.dark || t >= c.towAt + c.fadeSecs + 0.35)) this.endBust();
  }
  tow() {
    const g = this.g, b = this.bust, car = this.car();
    b.towed = true;
    if (!car || car.dead) g.ensureNamedCar(this.cfg.car);   // gone or a wreck: a new one in the bay
    else if (car !== g.playerCar) {
      const h = car.home;
      car.place(h.x, h.z, h.yaw);
      car.ai = null; car.ctrl.park = true; car.ctrl.throttle = 0;
      car.sync(0);
    }
    this.last = { t: g.time, kind: 'tow', dark: b.dark, inCar: b.inCar };
  }
  endBust() {
    const b = this.bust;
    if (b.dark) { hud.fade(false); this.g.inDialog = false; }
    this.bust = null;
    hud.toast(this.cfg.towToast);
  }

  // H held in the jeep: the sound (main.updateAudio), the lamp, the screen's corners; the traffic
  // gives way with no pursuit (drivers.js reads game.sirenYield); Angerud's outburst.
  tickSiren(dt) {
    const g = this.g, c = this.cfg, car = g.playerCar;
    const on = this.hasSiren(car) && input.down('horn') && !g.inDialog;
    this.setSiren(on, car);
    if (!on) { this.tickOath(dt); return; }
    const L = this.lamp.mesh;
    L.visible = Math.floor(g.time / c.blink) % 2 === 0;
    const y = this.yield;
    if (!g.shame.pursuit) {
      y.x = car.x; y.z = car.z; y.fx = Math.sin(car.yaw); y.fz = Math.cos(car.yaw);
      g.sirenYield = y;
    } else g.sirenYield = null;
    if (!this.yielded && g.sirenYield && g.cars.some((o) => o.traffic && (o.ai?.yieldK || 0) > 0.6)) {
      this.yielded = true;
      g.say(g.player, c.surprised, 2.2);
    }
    // Angerud at his bar door: honest motorists again.
    const a = c.angerud, n = g.npc('angerud');
    if (n && g.time - this.angerudT >= a.every && n.root.visible && dist(n.x, n.z, car.x, car.z) < a.r && g.honk.free('angerud') && g.honk.sees(n, car)) {
      this.angerudT = g.time;
      const text = pick(a.lines.filter((l) => l !== this.angerudSaid));
      this.angerudSaid = text;
      g.say(n, text, 2.6);
      n.chatT = 7 + Math.random() * 6;
      n.anim.oath = true;
      this.oathT = a.oath;
      this.oathWho = n;
    }
    this.tickOath(dt);
  }
  tickOath(dt) {
    if (this.oathT <= 0) return;
    const n = this.oathWho, car = this.g.playerCar;
    this.oathT -= dt;
    if (car && n) n.yaw = dampAngle(n.yaw, yawTo(car.x - n.x, car.z - n.z), 6, dt);
    if (this.oathT <= 0 && n) n.anim.oath = false;
  }
  setSiren(on, car) {
    if (on && this.lamp?.car !== car) {
      if (this.lamp) this.lamp.mesh.visible = false;
      this.lamp = { car, mesh: car.sirenLamp ||= lampMesh(car) };
    }
    if (on === this.sirenOn) return;
    this.sirenOn = on;
    hud.sirenLights(on);
    if (!on) {
      if (this.lamp) this.lamp.mesh.visible = false;
      this.g.sirenYield = null;
    }
  }

  // Free roam is over (a mission, the other level): the siren off, a loan forgotten, a tow done.
  reset() {
    const g = this.g;
    this.setSiren(false, null);
    if (this.oathT > 0) { this.oathT = 0; if (this.oathWho) this.oathWho.anim.oath = false; }
    this.loan = false;
    this.loanT = 0;
    if (this.bust) {
      if (!this.bust.towed) this.tow();
      if (this.bust.dark) { hud.fade(false); g.inDialog = false; }
      this.bust = null;
    }
    const car = this.car();
    if (car && car !== g.playerCar) car.locked = true;
  }
}
