// Rakt genom fruktståndet (free roam; feature 28, DESIGN §10.19). The market's five fruit stalls are
// props of the type `frutas` (world/props.js; the yellow-and-orange awning tells them apart), and
// Stig's car goes straight through one above its minSpeed: fruit and awning flaps fly, the coins
// burst out, SKANDAL rises (the props' own path, main.js onPropBroken), and
//  - the fruit seller pops up beside the wreck (never in the car's way), waves her arms and cries
//    "¡Mis tomates!" for `vendorSecs` s, a figure of her own with no collision;
//  - Stig says sorry from the car (StigSorry's `stand` kind, §10.14);
//  - after asnan the souvenir seller, `swearR` m off or nearer, swears "Jävla smålänningar!" at most
//    once in `swearGap` s.
// Only his car breaks one, on the island with no mission running (`missions.state === 'idle'`) and
// outside a dialogue; a kick never does (`carOnly`, main.js areaHit). Anything else meets the wall
// the stall always was. A broken stall comes back by the props' rule (75–115 s, him 70 m off), not
// while a car stands in its footprint; a mission start or the other level brings all five back at
// once (a car in a footprint is moved out), so every mission and timer meets the stalls as before.
// Config: FRUKTSTAND (content/island.js). Owned by Game as `stands`: main.js asks `canBreak(car)` and
// calls `onBroken` from Game.breakProp, `update` once a frame before tickProps, `posed` in syncAll.

import { FRUKTSTAND } from '../content/index.js';
import { Character } from '../actors/character.js';
import { propsOfType, reviveProps } from '../world/props.js';
import { queryBlocks, circleVsBlock, obbVsBlock } from '../world/collision.js';
import { fx } from './fx.js';
import { dist, yawTo, dampAngle } from '../util.js';

const _q = [], _hit = {}, _c = {};

export class FruitStands {
  constructor(game, cfg = FRUKTSTAND) {
    this.g = game;
    this.cfg = cfg;
    this.list = null;        // the five `frutas` props (found on first use)
    this.vendor = null;      // the fruit seller (a Character made once, hidden between crashes)
    this.vendorT = 0;        // s she stays up
    this.queue = [];         // [{ at, fn }] (g.time)
    this.swearT = -Infinity; // g.time of the souvenir seller's last swear
    this.swearing = 0;       // s he stays turned to the wreck, then as long again turning back
    this.swearAim = null;    // { x, z, yaw }: the wreck he swears at, and his facing before it
    this.last = null;        // for tests: { t, i, x, z, vendor: { x, z }, swear }
  }

  get stalls() { return (this.list ??= propsOfType('frutas')); }
  // Free roam on the island, outside a dialogue.
  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle' && !g.inDialog; }
  // Game.breakProp: only his own car, only in free roam.
  canBreak(car) { return !!car && car === this.g.playerCar && this.live; }
  // main.js syncAll: the souvenir seller while he swears neither turns to him, waves nor chatters.
  posed(key) { return key === 'souvenir' && this.swearing > 0; }

  // A stall gone under his car (Game.breakProp, after the props' smash, coins and SKANDAL).
  onBroken(p, car) {
    const g = this.g, c = this.cfg;
    const spot = this.vendorSpot(p, car);
    this.showVendor(spot, p);
    fx.spill(p.x, 1.0, p.z, 0xd8321e, 14);
    fx.spill(p.x, 1.0, p.z, 0xf7c31b, 8);
    this.last = { t: g.time, i: this.stalls.indexOf(p), x: p.x, z: p.z, vendor: { x: spot.x, z: spot.z }, swear: false };
    const s = g.npc('souvenir');
    if (g.missions.index >= c.swearFrom && s && dist(s.x, s.z, p.x, p.z) <= c.swearR && g.time - this.swearT >= c.swearGap) {
      const last = this.last, before = this.swearT;
      this.swearT = g.time;   // one queued at a time; not said, it does not count
      this.later(c.swearAt, () => {
        if (!g.honk.free('souvenir') || g.saying(s)) { this.swearT = before; return; }
        g.say(s, c.swearLine, c.swearSecs);
        s.chatT = 7 + Math.random() * 6;
        s.anim.yell = true;
        this.swearing = 2 * c.swearSecs;
        this.swearAim = { x: p.x, z: p.z, yaw: s.yaw };
        last.swear = true;
      });
    }
  }

  // Beside the wreck, on free ground, never ahead of the car: a front or back corner of the
  // footprint or the middle of a side, the first in that order with 0.45 m clear of solids and out of
  // the car's lane (2.4 m either side of its line, ahead of it); none clear, the one furthest behind it.
  vendorSpot(p, car) {
    const def = p.def, hw = def.w / 2, hd = def.d / 2, c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    const sp = Math.hypot(car.vx, car.vz) || 1, ux = car.vx / sp, uz = car.vz / sp;
    let best = null, bestBack = Infinity;
    for (const [u, v] of [[hw - 0.6, hd + 0.9], [-hw + 0.6, hd + 0.9], [hw + 0.8, 0], [-hw - 0.8, 0], [hw - 0.6, -hd - 0.9], [-hw + 0.6, -hd - 0.9]]) {
      const x = p.x + u * c + v * s, z = p.z - u * s + v * c;
      const dx = x - car.x, dz = z - car.z, ahead = dx * ux + dz * uz, side = Math.abs(dx * uz - dz * ux);
      const clear = !queryBlocks(x - 0.5, z - 0.5, x + 0.5, z + 0.5, _q).some((b) => b.top > 0.6 && b !== p.block && circleVsBlock(x, z, 0.45, b, _c));
      if (clear && (ahead < 0 || side > 2.4)) return { x, z };
      if (clear && ahead < bestBack) { bestBack = ahead; best = { x, z }; }
    }
    return best ?? { x: p.x - ux * 3, z: p.z - uz * 3 };
  }

  showVendor(spot, p) {
    const g = this.g, c = this.cfg;
    if (!this.vendor) {
      this.vendor = new Character(c.vendor, { x: spot.x, z: spot.z });
      this.vendor.key = 'frutera';
      g.scene.add(this.vendor.root);
    }
    const v = this.vendor;
    v.state = 'normal';
    v.teleport(spot.x, spot.z, yawTo(p.x - spot.x, p.z - spot.z));
    v.vx = v.vz = 0;
    v.anim.flail = v.anim.yell = true;
    v.root.visible = true;
    fx.dust(spot.x, spot.z, 5);
    g.say(v, c.vendorLine, c.vendorLineSecs);
    this.vendorT = c.vendorSecs;
  }

  hideVendor() {
    const v = this.vendor;
    if (!v || v.state === 'hidden') return;
    this.g.unsay(v);
    v.anim.flail = v.anim.yell = false;
    v.state = 'hidden';
    v.root.visible = false;
    this.vendorT = 0;
  }

  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }

  update(dt) {
    const g = this.g, stalls = this.stalls;
    if (!stalls.length) return;
    if (g.level !== 'island' || g.missions.state !== 'idle') { this.reset(); return; }
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      if (!g.inDialog) q.fn();
    }
    const v = this.vendor;
    if (v && v.state !== 'hidden') {
      this.vendorT -= dt;
      if (this.vendorT <= 0 || g.inDialog) { fx.dust(v.x, v.z, 4); this.hideVendor(); }
      else {
        const f = g.focus();
        v.yaw = dampAngle(v.yaw, yawTo(f.x - v.x, f.z - v.z), 4, dt);
        v.sync(dt);
      }
    }
    if (this.swearing > 0) {
      this.swearing -= dt;
      const s = g.npc('souvenir'), a = this.swearAim;
      if (this.swearing <= 0 || !s || s.state !== 'normal') { if (s) s.anim.yell = false; this.swearing = 0; }
      else if (this.swearing > this.cfg.swearSecs) s.yaw = dampAngle(s.yaw, yawTo(a.x - s.x, a.z - s.z), 6, dt);
      else { s.anim.yell = false; s.yaw = dampAngle(s.yaw, a.yaw, 4, dt); }   // back to his stand
    }
    // A broken stall waits for the props' respawn (tickProps runs after this), but not with a car
    // in its footprint.
    for (const p of stalls) if (!p.alive && p.respawn < 0.5 && this.carIn(p)) p.respawn = 0.5;
  }

  carIn(p) { return this.g.cars.some((c) => obbVsBlock(c.obb, p.block, _hit)); }

  // A mission state or the other level: all five stand again (a car in a footprint is moved out of
  // it first, along the shortest way), the seller gone, the souvenir seller's swear dropped.
  reset() {
    if (this.queue.length) this.queue.length = 0;
    this.hideVendor();
    if (this.swearing > 0) { const s = this.g.npc('souvenir'); if (s) s.anim.yell = false; this.swearing = 0; }
    for (const p of this.stalls) {
      if (p.alive) continue;
      for (const c of this.g.cars) {
        if (!obbVsBlock(c.obb, p.block, _hit)) continue;
        const d = _hit.depth + 0.3;
        c.place(c.x + _hit.nx * d, c.z + _hit.nz * d, c.yaw);
        c.vx = c.vz = 0;
      }
      reviveProps('frutas', { x: p.x, z: p.z, r: 0.1 });
    }
  }
}
