import { HYTT_TVA, NAMED_CARS } from '../content/index.js';
import { parkedCars } from '../world/town.js';
import { lm } from '../world/layout.js';
import { queryBlocks, obbVsBlock, obbVsObb, circleVsObb } from '../world/collision.js';
import { CAR_TYPES } from '../actors/car.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt } from '../strings.js';
import { yawTo } from '../util.js';

const _h = {}, _bl = [];

// Hytt två! – ring efter en bil (free roam, DESIGN §10.43; feature 80). E at booth 2 of the phone
// pavilion in Centro Nórdico opens a small menu of the named cars Stig may drive (`HYTT_TVA.cars`);
// the one he rings for is moved, whole, to a free spot in the car park behind the camera while the
// camera is on the booth, and the telefonist asks for the fare.
export class PhoneBooth {
  constructor(game, cfg = HYTT_TVA) {
    this.g = game;
    this.cfg = cfg;
    this.menu = null;       // the open menu: { rows: [{ name, label }], sel, frame (the E that opened it) }
    this.call = null;       // the call under way: { name, t0 }
    this.sel = null;        // the car last rung for (the menu opens on it)
    this.calls = 0;         // tests: cars delivered this session
    this.last = null;       // tests: { kind: 'open' | 'hangup' | 'ring' | 'full' | 'moved' | 'paid' | 'end', t, … }
    game.addInteractable({
      id: 'hytt', r: cfg.r, prompt: cfg.prompt,
      pos: () => this.stand(),
      enabled: () => this.canUse(),
      use: () => this.open(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get busy() { return !!(this.menu || this.call); }
  stand() { const c = this.cfg; return this.g.lmOffset(c.lm, c.stand[0], c.stand[1]); }

  // The cars on the menu: on the island (in parkedCars: the grisbil once unlocked) and not locked.
  rows() {
    const g = this.g;
    return this.cfg.cars.filter((name) => {
      const pc = parkedCars.find((p) => p.name === name), car = g.named[name];
      return !!pc && !pc.locked && !(car && g.cars.includes(car) && !car.dead && car.locked);
    }).map((name) => ({ name, label: NAMED_CARS[name] || name }));
  }

  // On foot by the booth: no scene, car, carry, pursuit, bust, PANIK, pool-fest ring, belt, talk, nap,
  // other free-roam hold or street race.
  canUse() {
    const g = this.g, p = g.player;
    return this.live && !this.busy && !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying
      && p.state === 'normal' && p.onGround && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active
      && !g.skis.on && !g.gatlopp.mode && this.rows().length > 0;
  }

  // ---------------------------------------------------------------------------------------------
  // The menu

  open() {
    if (!this.canUse()) return;
    const g = this.g, c = this.cfg, p = g.player, s = this.stand();
    g.inDialog = true;
    p.teleport(s.x, s.z, s.yaw);
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    p.anim.sprint = false;
    this.shoot();
    g.radio(c.who, c.booth);
    const rows = this.rows();
    const k = Math.max(0, rows.findIndex((r) => r.name === this.sel));
    this.menu = { rows, sel: k, frame: g.frame };
    this.draw();
    this.last = { kind: 'open', t: g.time, rows: rows.map((r) => r.name) };
  }
  draw() {
    const c = this.cfg, m = this.menu;
    hud.menu(m && { title: c.title, rows: m.rows.map((r) => ({ label: r.label, side: `${c.price} pta` })), sel: m.sel, note: c.note, keys: c.keys });
  }
  // The booth's shot: over Stig's shoulder at the door, the car park behind the eye.
  shoot() {
    const g = this.g, c = this.cfg, l = lm(c.lm), gy = g.groundAt(l.x, l.z);
    const at = ([dx, dz, y]) => { const q = g.lmOffset(c.lm, dx, dz); return { x: q.x, y: gy + y, z: q.z }; };
    g.cam.cutTo(at(c.eye), at(c.look));
    g.cam.snapNext = true;
  }

  update() {
    const g = this.g, m = this.menu;
    if (!m) return;
    if (!this.live) { this.hangUp('gone'); return; }
    if (g.frame === m.frame) return;   // the E that opened it
    const n = m.rows.length;
    if (input.pressed('menuUp')) { m.sel = (m.sel + n - 1) % n; this.draw(); audio.tone(660, 0.04, 'square', 0.04); }
    else if (input.pressed('menuDown')) { m.sel = (m.sel + 1) % n; this.draw(); audio.tone(660, 0.04, 'square', 0.04); }
    else if (input.pressed('hangUp')) this.hangUp('hangup');
    else if (input.pressed('interact')) this.ring();
  }

  // Q: the receiver back on its hook, nothing paid.
  hangUp(kind) {
    const g = this.g;
    this.menu = null;
    this.draw();
    audio.tone(1100, 0.04, 'square', 0.04);
    audio.tone(700, 0.05, 'square', 0.03, null, 0.05);
    this.release(null);
    this.last = { kind, t: g.time };
  }

  // Back to free roam: the chase camera behind Stig. With a `car` he has stepped back from the booth
  // (`after`: room for the camera behind him) and turned to it, so it stands in the shot.
  release(car) {
    const g = this.g, c = this.cfg, p = g.player;
    if (car) {
      const q = g.lmOffset(c.lm, c.after[0], c.after[1]);
      p.teleport(q.x, q.z, yawTo(car.x - q.x, car.z - q.z));
      p.wishX = p.wishZ = 0;
    }
    g.cam.release();
    g.cam.yaw = p.yaw;
    g.cam.snapNext = true;
    g.inDialog = false;
  }

  // ---------------------------------------------------------------------------------------------
  // The call

  async ring() {
    const g = this.g, c = this.cfg, m = this.menu, row = m.rows[m.sel];
    this.sel = row.name;
    this.menu = null;
    this.draw();
    this.call = { name: row.name, t0: g.time };
    this.last = { kind: 'ring', t: g.time, name: row.name };
    // The Spanish ring tone, twice (425 Hz).
    for (const d of [0, 0.55]) { audio.tone(425, 0.4, 'sine', 0.06, null, d); audio.tone(850, 0.4, 'sine', 0.01, null, d); }
    let car = null;
    try {
      await g.wait(c.ringSecs);
      g.say(g.player, fmt(c.order, { name: row.label }), 1.6);
      await g.wait(c.moveAt - c.ringSecs);
      const spot = this.freeSpot(row.name);
      if (!spot) {
        g.radio(c.who, c.full);
        this.last = { kind: 'full', t: g.time, name: row.name };
        await g.wait(c.endAt - c.moveAt);
        return;
      }
      const r = this.fetch(row.name, spot);
      car = r?.car || null;
      this.last = { kind: 'moved', t: g.time, name: row.name, spot: spot.key, fresh: r?.fresh, repaired: r?.repaired };
      await g.wait(c.payAt - c.moveAt);
      const paid = g.coins >= c.price;
      g.radio(c.who, c.pay);
      g.pay(c.price);
      g.say(g.player, c.thanks, 1.6);
      this.calls++;
      this.last = { ...this.last, kind: 'paid', t: g.time, paid };
      await g.wait(c.endAt - c.payAt);
    } finally {
      this.call = null;
      this.release(car && !car.dead && g.cars.includes(car) ? car : null);
      if (car) hud.toast(fmt(c.toast, { name: row.label }));
      if (this.last) this.last.ended = g.time;
    }
    if (car?.spec.pigs) {
      await g.wait(c.pigAt);
      if (this.live && !g.saying(g.player)) g.say(g.player, c.pig, 2.2);
    }
  }

  // The first spot whose footprint (the car's, `pad` m round) is clear of walls, cars (but this one),
  // people and loose pigs; null when every one is taken.
  freeSpot(name) {
    const g = this.g, c = this.cfg, pc = parkedCars.find((p) => p.name === name), s = CAR_TYPES[pc?.type];
    if (!s) return null;
    const mine = g.named[name], pad = c.pad;
    const people = [g.player, ...Object.values(g.npcs), ...g.peds.map((q) => q.char)].filter((ch) => ch && ch.root.visible && ch.state !== 'hidden' && !ch.car);
    for (const key of c.spots) {
      const l = lm(key), fx = Math.sin(l.yaw), fz = Math.cos(l.yaw);
      const o = { x: l.x, z: l.z, fx, fz, hx: s.wid / 2 + pad, hz: s.len / 2 + pad };
      let ok = true;
      queryBlocks(l.x - s.len, l.z - s.len, l.x + s.len, l.z + s.len, _bl);
      for (const b of _bl) if (!b.dead && b.top > 0.15 + 0.6 && obbVsBlock(o, b, _h)) { ok = false; break; }
      if (ok) for (const car of g.cars) if (car !== mine && obbVsObb(o, car.obb, _h)) { ok = false; break; }
      if (ok) for (const ch of people) if (circleVsObb(ch.x, ch.z, 0.4, o, _h)) { ok = false; break; }
      if (ok) for (const pig of g.pigs.loose) if (circleVsObb(pig.x, pig.z, 0.5, o, _h)) { ok = false; break; }
      if (ok) return { key, x: l.x, z: l.z, yaw: l.yaw };
    }
    return null;
  }

  // The named car itself to the spot, whole: a wreck (or a car gone) comes back as a new one (never a
  // second car of that name), a dent is repaired. A delivered grisbil's bed stays empty until it has
  // been home to Flamenco (§10.15). Majsan's ticket for it (§10.17) gives up by itself: the car is gone
  // from where she found it.
  fetch(name, spot) {
    const g = this.g;
    let car = g.named[name];
    const fresh = !car || car.dead || !g.cars.includes(car);
    if (fresh) car = g.ensureNamedCar(name);
    if (!car) return null;
    if (fresh && car.spec.pigs && g.pigs.delivered) for (let i = 0; i < car.pigs.length; i++) car.setPig(i, false);
    const repaired = !fresh && car.hp < car.spec.hp;
    if (repaired) car.repair();
    car.place(spot.x, spot.z, spot.yaw);
    car.ai = null;
    Object.assign(car.ctrl, { throttle: 0, brake: 0, steer: 0, handbrake: false, park: true });
    return { car, fresh, repaired };
  }
}
