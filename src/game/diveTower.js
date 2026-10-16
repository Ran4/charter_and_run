// Från fjärde våningen – the 10 m diving tower at Flamenco's deep end (free roam; feature 24, DESIGN
// §10.20). E at the ladder's foot climbs up (a short black fade) and he stands on the platform, level
// with the hotel's fourth floor; E up there climbs down. Off the platform he spreads his arms as at
// Levander's clinic and says the mantra on the way down. J in the air is the stomp, and into the water
// a cannonball: the biggest splash and the camera shaken. Without it he comes down flat: a belly flop,
// face down, then up with "Oj.". The session's first dive into the water brings Lasse's phone call on
// the radio. Only on the island with no mission running (`missions.state === 'idle'`): the tower's
// solids are live only then (world/blocks/hotels.js DIVE_TOWER), so no mission stage meets it and no
// timer or calibration pool changes; a mission start with him up there puts him at the ladder's foot.
// Config: TOWER (content/island.js). Owned by Game as `tower`; main.js hands it the player's hard
// landings (`onLand`) before the stomp's own and calls `update` once a frame.

import { TOWER } from '../content/index.js';
import { DIVE_TOWER } from '../world/blocks/hotels.js';
import { lm } from '../world/layout.js';
import { groundAt, groundInfo, waterAt } from '../world/collision.js';
import { S } from '../strings.js';
import { hud } from './hud.js';

export class DiveTower {
  constructor(game, cfg = TOWER) {
    this.g = game;
    this.cfg = cfg;
    this.fromTop = false;   // he last stood on the platform or the board
    this.dive = null;       // off the top until he lands: { t, x, z }
    this.busy = false;      // a climb's fade is playing
    this.flopped = false;   // face down after a belly flop ("Oj." once he is up)
    this.ojT = -Infinity;
    this.radioSaid = false; // Lasse's line, once a session (the glide's pool landing reads it too)
    this.radioAt = null;    // g.time to say it
    this.last = null;       // tests: the last dive's landing { kind: 'bomb' | 'magplask' | 'dry', x, z, v, t, secs }
    this.climbs = 0;        // tests: climbs this session
    DIVE_TOWER.live = () => game.level === 'island' && game.missions.state === 'idle';
    game.addInteractable({
      id: 'hopptorn:upp', r: cfg.r, prompt: cfg.promptUp,
      pos: () => lm(cfg.foot),
      enabled: () => this.canClimb(),
      use: () => this.climb(true),
    });
    game.addInteractable({
      id: 'hopptorn:ner', r: cfg.r, prompt: cfg.promptDown,
      pos: () => lm(cfg.top),
      enabled: () => this.canClimb(),
      use: () => this.climb(false),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  // On foot and free: no scene, car, carry, bust, PANIK, pool-fest ring or bag on the belt.
  canClimb() {
    const g = this.g, p = g.player;
    return this.live && !this.busy && !g.inDialog && !g.playerCar && !g.carrying && p.state === 'normal' && p.onGround
      && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !g.fest.joined && !g.belt.seated;
  }
  // Up there: over the tower's or the board's footprint (0.5 m round them), within 1.5 m of the top.
  onTower() {
    const p = this.g.player, [a, b] = DIVE_TOWER.blocks;
    const over = (q) => p.x > q.minX - 0.5 && p.x < q.maxX + 0.5 && p.z > q.minZ - 0.5 && p.z < q.maxZ + 0.5;
    return !!a && p.y > DIVE_TOWER.top - 1.5 && (over(a) || over(b));
  }

  // The ladder: a black fade, and he is at the other end (inDialog holds his keys and the camera).
  async climb(up) {
    const g = this.g, p = g.player, c = this.cfg;
    this.busy = true;
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    hud.fade(true);
    await g.wait(c.fadeSecs);
    this.put(up);
    await g.wait(c.holdSecs);
    hud.fade(false);
    g.inDialog = false;
    this.busy = false;
    this.climbs++;
  }

  // On the platform facing along the board, or at the foot turned away from the ladder. Set by hand:
  // `teleport` snaps to ground-level floors only (§14.6).
  put(up) {
    const g = this.g, p = g.player, l = lm(up ? this.cfg.top : this.cfg.foot), yaw = up ? l.yaw : l.yaw + Math.PI;
    this.end();
    p.state = 'normal';
    p.x = l.x; p.z = l.z; p.yaw = yaw;
    p.y = up ? DIVE_TOWER.top : groundAt(l.x, l.z, 0.2, 0.6);
    p.vx = p.vz = p.vy = 0; p.wishX = p.wishZ = 0;
    p.onGround = true;
    g.jumps = 0;
    this.fromTop = up;
    g.cam.yaw = yaw;
    g.cam.snapNext = true;
  }

  // Off the top: arms out and the mantra.
  start() {
    const g = this.g, p = g.player;
    this.dive = { t: g.time, x: p.x, z: p.z };
    p.anim.leap = true;
    g.say(p, S.mantraLine, 2.2);   // [F*] the exercise at Levander's clinic (research-plot.md:122–123), said off the tower
  }

  end() {
    const p = this.g.player;
    this.dive = null;
    this.fromTop = false;
    if (p.anim.leap) p.anim.leap = false;
    if (p.anim.bomb) p.anim.bomb = false;
  }

  // main.js onLand: a hard landing (over 6 m/s, v) on floor height y. A dive that ends in the water is
  // a cannonball (a stomp) or a belly flop, with game.waterSplash; true: the splash replaced the dust.
  onLand(v, y) {
    const d = this.dive, g = this.g, p = g.player, c = this.cfg;
    this.end();
    if (!d) return false;
    const water = this.live && p.state === 'normal' && !p.standingOn && !!waterAt(p.x, p.z, y);
    const kind = !water ? 'dry' : g.stomping ? 'bomb' : 'magplask';
    this.last = { kind, x: +p.x.toFixed(2), z: +p.z.toFixed(2), v: +v.toFixed(1), t: g.time, secs: +(g.time - d.t).toFixed(2) };
    if (!water) return false;
    g.waterSplash(p.x, p.z, v, kind === 'bomb');
    if (kind === 'magplask' && p.flop(c.flopSecs)) this.flopped = true;
    if (!this.radioSaid && !g.glide.radioSaid) { this.radioSaid = true; this.radioAt = g.time + c.radioAt; }
    return true;
  }

  update() {
    const g = this.g, p = g.player, c = this.cfg;
    if (!this.live) {
      // A mission (or a level change) with him up there: the tower is not solid now, so down at the foot.
      if (g.level === 'island' && !this.busy && !g.playerCar && p.state === 'normal' && this.onTower()) this.put(false);
      if (this.dive || this.fromTop) this.end();
      this.radioAt = null;
      this.flopped = false;
      return;
    }
    if (this.radioAt != null && g.time >= this.radioAt && !g.inDialog) {
      this.radioAt = null;
      g.radio(c.radio[0], c.radio[1]);
    }
    if (this.flopped && p.state !== 'down') {
      this.flopped = false;
      if (p.state === 'normal' && g.time - this.ojT >= c.ojAgain) { this.ojT = g.time; g.say(p, c.oj, 1.4); }
    }
    if (this.busy) return;
    if (p.state !== 'normal' || g.playerCar) { if (this.dive || this.fromTop) this.end(); return; }
    if (p.onGround) {
      // A landing onLand did not hear (soft, or on a car roof) ends the dive; on the top a new one can start.
      if (this.dive) this.end();
      groundAt(p.x, p.z, p.y, 0.05);
      this.fromTop = Math.abs(p.y - DIVE_TOWER.top) < 0.05 && DIVE_TOWER.blocks.includes(groundInfo.block);
    } else if (this.dive) {
      // The glide takes the dive over (§10.7); a stomp turns it into the cannonball.
      if (g.glide.on) this.end();
      else { p.anim.bomb = !!g.stomping; p.anim.leap = !g.stomping; }
    } else if (this.fromTop && p.y < DIVE_TOWER.top - 0.4) this.start();
  }
}
