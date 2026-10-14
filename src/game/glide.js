// Jag kan flyga – the glide (free roam after julafton; feature 3, DESIGN §10.7). Once julafton has
// unlocked `bodega`, J pressed in the air and held spreads Stig's arms as in Levander's exercise:
// the mantra in his bubble, the fall eased to a slow, stiff drift forwards that the movement keys
// turn a little. A quick J (released within `tap` s) is still the stomp. Every landing is a forward
// roll onto his back and a dazed shake of the head; on water a splash, and the first time in a pool
// ever, Lasse on the radio. Only on the island, on foot, with no mission running
// (`missions.state === 'idle'`) and nothing carried: no mission, timer or calibration pool is
// touched. Config: GLIDE (content/island.js). Owned by Game as `glide`; main.js hands it the air J
// press (`press`), calls `step` before the player's physics step and `after` behind it, and
// `update` once a frame.

import { GLIDE } from '../content/index.js';
import { GRAV } from '../actors/character.js';
import { groundAt, queryBlocks, contains, topAt } from '../world/collision.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { S } from '../strings.js';
import { fx } from './fx.js';
import { hud } from './hud.js';
import { dist, yawTo } from '../util.js';

const AIR_ACCEL = 14;   // Character.step's acceleration in the air (m/s²)
const _blocks = [];
// The water floor he stands in at (x, z, y), or null. Pools and ponds lie at CURB, level with the
// ground, so groundAt (which wants a floor above the ground) never names them.
function waterAt(x, z, y) {
  for (const b of queryBlocks(x, z, x, z, _blocks)) {
    if (b.kind === 'water' && !b.dead && contains(b, x, z) && Math.abs(topAt(b, x, z) - y) < 0.05) return b;
  }
  return null;
}
// (vx, vz) moved towards (wx, wz) by at most a.
function approach(vx, vz, wx, wz, a) {
  const dx = wx - vx, dz = wz - vz, l = Math.hypot(dx, dz);
  return l > a ? [vx + (dx / l) * a, vz + (dz / l) * a] : [wx, wz];
}

export class Glide {
  constructor(game, cfg = GLIDE) {
    this.g = game;
    this.cfg = cfg;
    this.pendT = null;    // J pressed in the air, held this long so far: a tap is the stomp, a hold the glide
    this.on = false;
    this.yaw = 0;         // the glide's heading (his facing follows it)
    this.t = 0;           // seconds into this glide
    this.bank = 0;
    this.vFree = 0;       // his speed this step before any wall (to tell a hit)
    this.px = 0; this.pz = 0;   // where the step started
    this.headway = 0;     // his speed along the heading, averaged over `stuckSecs`
    this.blocked = false;
    this.sayT = 0;
    this.oleT = -Infinity;
    this.oleSaid = false;
    this.tumbling = false;
    this.dazeT = 0;
    this.last = null;     // the last glide, for tests: { x0, z0, y0, yMax, x1, z1, y1, secs, dist, landed, water, pool }
  }

  // Julafton's unlock; then on the island, on foot, between missions, free hands, nothing holding him.
  get unlocked() { return this.g.unlocked.has('bodega'); }
  allowed() {
    const g = this.g, p = g.player;
    return g.level === 'island' && this.unlocked && g.missions.state === 'idle' && !g.playerCar && !g.carrying
      && !g.inDialog && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !g.mantraMode && p.state === 'normal';
  }

  // handleOneShots: J pressed in the air, high enough to stomp. True: the glide takes the press (a
  // quick release stomps, see `step`); false: the caller stomps at once, as before the unlock.
  press() {
    if (!this.allowed()) return false;
    this.pendT = 0;
    return true;
  }

  // fixedStep, before the player's step: the tap-or-hold window, then the glide's steering, wish and
  // eased fall.
  step(h) {
    const g = this.g, p = g.player, c = this.cfg;
    if (this.pendT != null) {
      if (!this.allowed() || p.onGround) this.pendT = null;
      else if (!input.down('attack')) { this.pendT = null; g.stomp(); }
      else if ((this.pendT += h) >= c.tap) { this.pendT = null; this.start(); }
    }
    if (!this.on) return;
    if (!this.allowed() || !input.down('attack') || p.onGround) { this.stop(false); return; }
    this.t += h;
    // Towards the held direction (camera-relative, as on foot), at most `turn` rad/s; none held: on.
    const mx = input.moveX(), my = input.moveY();
    let turn = 0;
    if (!this.blocked && Math.hypot(mx, my) > 0.2) {
      const cx = Math.sin(g.cam.yaw), cz = Math.cos(g.cam.yaw);
      const want = yawTo(cx * my - cz * mx, cz * my + cx * mx);
      const d = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
      turn = Math.max(-c.turn * h, Math.min(c.turn * h, d));
      this.yaw += turn;
    }
    // Lean into the turn (a right turn lowers yaw; + bank = his right).
    this.bank += (-(turn / (c.turn * h)) * 0.22 - this.bank) * Math.min(1, 8 * h);
    p.anim.bank = this.bank;
    const hx = Math.sin(this.yaw), hz = Math.cos(this.yaw);
    p.wishX = hx * c.speed; p.wishZ = hz * c.speed;
    p.anim.sprint = false;
    // The arms catch the air: `accel` m/s² towards the glide on top of the step's own air control.
    // vFree is his speed after both, before any wall.
    [p.vx, p.vz] = approach(p.vx, p.vz, p.wishX, p.wishZ, c.accel * h);
    this.vFree = Math.hypot(...approach(p.vx, p.vz, p.wishX, p.wishZ, AIR_ACCEL * h));
    this.px = p.x; this.pz = p.z;
    // The fall eases to `sink`: the step's gravity then leaves exactly -sink (braked, not stopped dead).
    const floor = GRAV * h - c.sink;
    if (p.vy < floor) p.vy = Math.min(floor, p.vy + (GRAV + c.brake) * h);
  }

  // fixedStep, after the player's step: a landing, a knock, or a wall in the way.
  after(h) {
    if (!this.on) return;
    const p = this.g.player, c = this.cfg, L = this.last;
    if (p.state !== 'normal') { this.stop(false); return; }
    L.yMax = Math.max(L.yMax, p.y);
    if (p.onGround) { this.land(); return; }
    // A wall or a palm trunk took most of his speed. The heading holds, so he slides round a trunk
    // and on; dead head-on there is nothing to slide along, so a sideways nudge (`deflect` m/s, on
    // the side he was already slipping to). His headway along the heading, averaged over
    // `stuckSecs`, under `headway` × speed (a wall, a corner): he lets go and drops. A palm must not
    // hold him in the air.
    const hx = Math.sin(this.yaw), hz = Math.cos(this.yaw), v = Math.hypot(p.vx, p.vz);
    this.headway += (((p.x - this.px) * hx + (p.z - this.pz) * hz) / h - this.headway) * Math.min(1, h / c.stuckSecs);
    this.blocked = this.vFree > 0.3 && v < 0.6 * this.vFree;
    if (this.blocked && v < 0.3) {
      const rx = -hz, rz = hx, side = p.vx * rx + p.vz * rz < 0 ? -1 : 1;
      p.vx += rx * side * c.deflect; p.vz += rz * side * c.deflect;
    }
    if (this.t > c.stuckSecs && this.headway < c.headway * c.speed) this.stop(false);
  }

  start() {
    const g = this.g, p = g.player;
    this.on = true;
    this.t = 0; this.blocked = false; this.bank = 0; this.sayT = 0; this.oleSaid = false;
    this.yaw = p.yaw;
    this.headway = p.vx * Math.sin(this.yaw) + p.vz * Math.cos(this.yaw);
    g.stomping = false;
    p.anim.wings = true; p.anim.glide = true;
    audio.glide();
    this.last = { x0: p.x, z0: p.z, y0: p.y, yMax: p.y, x1: null, z1: null, y1: null, secs: 0, dist: 0, landed: false, water: false, pool: false };
  }

  stop(landed) {
    const p = this.g.player, L = this.last;
    this.on = false;
    this.pendT = null;
    this.blocked = false;
    p.anim.wings = false; p.anim.glide = false; p.anim.bank = 0;
    if (L) Object.assign(L, { x1: p.x, z1: p.z, y1: p.y, secs: +this.t.toFixed(2), dist: +dist(L.x0, L.z0, p.x, p.z).toFixed(2), landed });
  }

  // Down he comes: a splash on water (and Lasse, once ever, in a pool) or dust, then the roll.
  land() {
    const g = this.g, p = g.player, c = this.cfg;
    const b = p.standingOn ? null : waterAt(p.x, p.z, p.y), water = !!b, pool = !!b?.pool;
    this.stop(true);
    Object.assign(this.last, { water, pool });
    if (water) { fx.splash(p.x, p.z, 28, 4.5); audio.splash(); }
    else { fx.dust(p.x, p.z, 9, p.y + 0.2); audio.thud(); }
    if (p.tumble(c.tumble.secs, c.tumble.roll)) this.tumbling = true;
    if (pool && !g.unlocked.has(c.onceKey)) {
      g.unlocked.add(c.onceKey);
      g.save();
      g.radio(c.poolRadio[0], c.poolRadio[1]);
    }
  }

  // Once a frame: the unlock's toast, the mantra bubble, Ole's shout, the daze after the roll.
  update(dt) {
    const g = this.g, p = g.player, c = this.cfg;
    if (!this.on && !g.unlocked.has('glid') && this.allowed() && !p.onGround
      && p.y > groundAt(p.x, p.z, p.y, 0.45) + c.minAir) g.unlock('glid');
    if (this.on) {
      this.sayT -= dt;
      // The auto-bubble waits while any other bubble is up (as the mantra's).
      if (this.sayT <= 0 && performance.now() >= (g.sayEnd || 0)) { this.sayT = c.sayEvery; hud.say(p, S.mantraLine, 2.2); }
      const ole = g.npc(c.oleShout[0]);
      if (!this.oleSaid && this.t >= c.oleAfter && g.time - this.oleT >= c.oleEvery && ole && ole.state === 'normal'
        && dist(ole.x, ole.z, p.x, p.z) < c.oleR) {
        this.oleSaid = true;
        this.oleT = g.time;
        g.say(ole, c.oleShout[1], 2.2);
      }
    }
    if (this.tumbling && p.state !== 'down') {
      this.tumbling = false;
      if (p.state === 'normal') this.dazeT = c.dazeSecs;
    }
    if (this.dazeT > 0) {
      this.dazeT = Math.max(0, this.dazeT - dt);
      p.anim.look = Math.sin(this.dazeT * 13) * 0.5 * (this.dazeT / c.dazeSecs);
    }
  }
}
