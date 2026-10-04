// The Shame meter is this game's Hit & Run meter. Knock people over, smash cars and mailboxes and
// it fills; when it tops out, the Shame Wizard's hearses come for you. Get caught and you're
// SHAMED: a pile of coins gone. Stay out of their sight and the shame fades.

import { Car } from '../actors/car.js';
import { AIDriver } from '../actors/drivers.js';
import { Character } from '../actors/character.js';
import { CHARS } from '../actors/models.js';
import { nodeX, nodeZ, NN, LANE, nearestNode, neighbors } from '../world/layout.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { yawTo, pick } from '../util.js';

const TAUNTS = [
  'SHAAAAME!',
  'I know what you did, Nicholas!',
  'Shame on you! Shame on your family!',
  'Remember when you cried at the spelling bee?',
  'Everyone saw that, Nicholas. EVERYONE.',
  'Your mother will hear of this!',
];

export class Shame {
  constructor(game) {
    this.game = game;
    this.v = 0;
    this.pursuit = false;
    this.hearses = [];
    this.wizard = null;
    this.sinceOffense = 99;
    this.locked = false;     // missions can freeze the meter
    this.forced = false;     // missions can force a pursuit
    this.tauntT = 3;
    this.caughtT = 0;
    this.leaving = [];
  }

  add(amount) {
    if (this.locked || amount <= 0) return;
    this.v = Math.min(100, this.v + amount);
    this.sinceOffense = 0;
    if (this.v >= 100 && !this.pursuit) this.startPursuit();
  }

  startPursuit() {
    const g = this.game;
    this.pursuit = true;
    this.v = 100;
    audio.shameBell();
    hud.showBanner('SHAAAME!', 'The Shame Wizard is coming for you', 'shame', 2600);
    hud.flashColor('rgba(140,60,200,0.45)');
    const f = g.focus();
    // Spawn the hearses at intersections a little way off, out of the player's face.
    const n0 = nearestNode(f.x, f.z);
    const cands = [];
    for (let id = 0; id < NN * NN; id++) {
      const d = Math.hypot(nodeX(id) - f.x, nodeZ(id) - f.z);
      if (d > 70 && d < 150) cands.push(id);
    }
    for (let k = 0; k < 2 && cands.length; k++) {
      const id = cands.splice((Math.random() * cands.length) | 0, 1)[0];
      const nb = neighbors(id)[0];
      const dx = nodeX(nb) - nodeX(id), dz = nodeZ(nb) - nodeZ(id), l = Math.hypot(dx, dz);
      const x = nodeX(id) + (dx / l) * 12 + (-dz / l) * LANE, z = nodeZ(id) + (dz / l) * 12 + (dx / l) * LANE;
      const car = new Car('hearse', { x, z, yaw: yawTo(dx, dz) });
      car.place(x, z, yaw(dx, dz));
      car.isHearse = true;
      car.spec.maxSpeed = 28;
      car.ai = new AIDriver(car, { mode: 'chase', target: () => g.focusTarget(), cruise: 26, aggressive: true, avoid: false });
      car.bust = g.addBust(CHARS.shame, car);
      g.addCar(car);
      this.hearses.push(car);
    }
  }

  endPursuit(caught) {
    this.pursuit = false;
    this.forced = false;
    for (const h of this.hearses) {
      if (h.dead) { this.leaving.push({ car: h, t: 12 }); continue; }
      h.ai = new AIDriver(h, { mode: 'traffic', cruise: 14 });
      this.leaving.push({ car: h, t: 25 });
    }
    this.hearses = [];
    if (this.wizard) { this.game.scene.remove(this.wizard.root); this.wizard = null; }
    if (!caught) {
      hud.showBanner('SHAME SHAKEN', 'You gave the Wizard the slip', 'good', 2200);
      audio.jingle('complete');
    }
  }

  busted() {
    const g = this.game;
    const lost = Math.min(g.coins, 50);
    g.coins -= lost;
    hud.setCoins(g.coins);
    this.v = 0;
    this.caughtT = 2.2;
    const f = g.focus();
    fx.shame(f.x, f.y + 1, f.z, 30);
    hud.flashColor('rgba(120,40,180,0.7)');
    hud.showBanner('SHAMED!', lost ? `The Shame Wizard took ${lost} coins` : 'You have nothing left to lose', 'shame', 3000);
    audio.shameBell();
    this.endPursuit(true);
    g.missions.onBusted?.();
  }

  // On foot the Wizard himself floats out after you, straight through everything.
  wizardChase(dt) {
    const g = this.game;
    const p = g.player;
    if (g.playerCar) {
      if (this.wizard) { g.scene.remove(this.wizard.root); this.wizard = null; }
      return;
    }
    if (!this.wizard) {
      const h = this.hearses.find((c) => !c.dead) || null;
      const sx = h ? h.x : p.x + 30, sz = h ? h.z : p.z + 30;
      this.wizard = new Character(CHARS.shame, { x: sx, z: sz });
      this.wizard.solid = false;
      g.scene.add(this.wizard.root);
    }
    const w = this.wizard;
    const dx = p.x - w.x, dz = p.z - w.z, d = Math.hypot(dx, dz);
    const sp = 7.4;
    if (d > 0.1) { w.x += (dx / d) * sp * dt; w.z += (dz / d) * sp * dt; }
    w.y += ((p.y + 0.4) - w.y) * Math.min(1, dt * 3);
    w.yaw = yawTo(dx, dz);
    w.vx = (dx / (d || 1)) * sp; w.vz = (dz / (d || 1)) * sp;
    w.anim.talk = Math.sin(performance.now() / 300) > 0.3;
    w.sync(dt);
    if (Math.random() < dt * 4) fx.shame(w.x, w.y + 1.2, w.z, 1);
    if (d < 1.4 && this.caughtT <= 0) this.busted();
  }

  update(dt) {
    const g = this.game;
    this.sinceOffense += dt;
    this.caughtT = Math.max(0, this.caughtT - dt);
    for (let k = this.leaving.length - 1; k >= 0; k--) {
      const l = this.leaving[k];
      l.t -= dt;
      const f = g.focus();
      if (l.t <= 0 || (l.t < 20 && Math.hypot(l.car.x - f.x, l.car.z - f.z) > 120)) { g.removeCar(l.car); this.leaving.splice(k, 1); }
    }
    if (!this.pursuit) {
      if (this.forced) { this.v = 100; this.startPursuit(); }
      else if (this.sinceOffense > 4) this.v = Math.max(0, this.v - 5 * dt);
    } else {
      const f = g.focus();
      let near = Infinity;
      for (const h of this.hearses) if (!h.dead) near = Math.min(near, Math.hypot(h.x - f.x, h.z - f.z));
      if (this.wizard) near = Math.min(near, Math.hypot(this.wizard.x - f.x, this.wizard.z - f.z));
      if (!this.forced) {
        if (near > 42) this.v -= 9 * dt;
        else if (near > 22) this.v -= 3 * dt;
        if (this.hearses.every((h) => h.dead) && !this.wizard) this.v -= 12 * dt;
        if (this.v <= 0) { this.v = 0; this.endPursuit(false); }
      }
      if (this.pursuit) {
        this.wizardChase(dt);
        this.tauntT -= dt;
        if (this.tauntT <= 0 && near < 40) {
          this.tauntT = 4 + Math.random() * 3;
          const src = this.wizard || this.hearses.find((h) => !h.dead);
          if (src) g.say(src.bust ? { x: src.x, y: src.y, z: src.z, height: 2.6 } : src, pick(TAUNTS), 2.2);
        }
      }
    }
    hud.setShame(this.v, this.pursuit);
  }

  // A hearse rammed the player's car.
  onRam(car, impact) {
    if (this.pursuit && car.isHearse && impact > 1.5 && this.caughtT <= 0) this.busted();
  }

  clear() {
    for (const h of this.hearses) g_remove(this.game, h);
    for (const l of this.leaving) g_remove(this.game, l.car);
    this.hearses = []; this.leaving = [];
    if (this.wizard) { this.game.scene.remove(this.wizard.root); this.wizard = null; }
    this.pursuit = false; this.forced = false; this.v = 0;
  }
}
function g_remove(g, car) { g.removeCar(car); }
function yaw(dx, dz) { return Math.atan2(dx, dz); }
