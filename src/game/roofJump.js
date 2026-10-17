// Hoppet mellan hotelltaken – the jump between the hotel roofs (free roam; feature 41, DESIGN §10.29).
// In (4,4)'s north row, opposite the petrol station, APARTAMENTOS SOL DE INVIERNO and HOTEL ATLÁNTICO
// stand seven storeys high with a 3.7 m gap between them. E at SOL DE INVIERNO's lobby door (the lift
// is out of order: ASCENSOR AVERIADO) takes the stairs: a short black fade, and Stig stands out of
// breath by the lift room on the roof ("Sju våningar…"). A line of coins leads to the west edge; over
// the gap he spreads his arms as at Levander's clinic and says the mantra, and on ATLÁNTICO's roof the
// brochure's sign stands by the south edge with a stash of coins and the view ("Nu har jag
// havsutsikt."). Down by the stairs again (both lift rooms), by R, or straight off ATLÁNTICO's west
// edge into the hotel pool next door: arms out and the mantra on the way down, a belly flop (or, with
// J, a cannonball) and the splash. Only on the island with no mission running (`missions.state ===
// 'idle'`): the roofs' solids are live only then (world/town.js ROOF_JUMP), so no mission stage meets
// them and no timer or calibration pool changes; a mission start with him up there puts him at the
// lobby below. The stairs are shut in a SKANDAL pursuit. Config: TAKHOPP (content/island.js). Owned
// by Game as `roofs`; main.js hands it the player's hard landings (`onLand`) and calls `update` once a
// frame.

import { TAKHOPP } from '../content/index.js';
import { ROOF_JUMP } from '../world/town.js';
import { lm } from '../world/layout.js';
import { groundAt, groundInfo, waterAt } from '../world/collision.js';
import { placeCoin } from '../actors/pickups.js';
import { S } from '../strings.js';
import { hud } from './hud.js';

export class RoofJump {
  constructor(game, cfg = TAKHOPP) {
    this.g = game;
    this.cfg = cfg;
    this.on = null;          // the roof he last stood on: 'sol' | 'atl' | null (down off them)
    this.dive = null;        // off a roof until he lands: { t, x, z, y0, gap }
    this.busy = false;       // a stair's fade is playing
    this.puffT = 0;          // out of breath after the stairs up (anim.slump)
    this.viewSaid = false;   // "Nu har jag havsutsikt." said this visit
    this.last = null;        // tests: the last fall's landing { kind: 'bomb' | 'magplask' | 'dry' | 'roof', x, z, v, t, secs, gap }
    this.climbs = 0;         // tests: stairs taken this session
    this.mantras = 0;        // tests: falls that said the mantra
    ROOF_JUMP.live = () => game.level === 'island' && game.missions.state === 'idle';
    for (const [x, y, z] of ROOF_JUMP.coins) placeCoin(x, y, z);
    for (const d of cfg.doors) {
      game.addInteractable({
        id: 'takhopp:' + d.id, r: cfg.r, prompt: d.up ? cfg.promptUp : cfg.promptDown,
        pos: () => lm(d.at),
        enabled: () => this.canUse(),
        use: () => this.stairs(d),
      });
    }
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  // On foot and free: no scene, car, carry, pursuit, bust, PANIK, pool-fest ring or bag on the belt.
  canUse() {
    const g = this.g, p = g.player;
    return this.live && !this.busy && !g.inDialog && !g.playerCar && !g.carrying && p.state === 'normal' && p.onGround
      && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !g.fest.joined && !g.belt.seated;
  }
  // The roof he is over (its footprint grown by `m`), no further than 1.5 m under its floor; or null.
  roofUnder(m = 0.5) {
    const p = this.g.player;
    for (const [k, r] of Object.entries(ROOF_JUMP.roofs)) {
      if (p.x > r.minX - m && p.x < r.maxX + m && p.z > r.minZ - m && p.z < r.maxZ + m && p.y > r.floor - 1.5) return k;
    }
    return null;
  }
  overGap() {
    const p = this.g.player, q = ROOF_JUMP.gap;
    return !!q && p.x > q.x0 && p.x < q.x1 && p.z > q.z0 && p.z < q.z1;
  }

  // The stairs: a black fade, and he is at the other end (inDialog holds his keys and the camera).
  async stairs(d) {
    const g = this.g, p = g.player, c = this.cfg;
    this.busy = true;
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    hud.fade(true);
    await g.wait(c.fadeSecs);
    this.put(d.to, !!d.up);
    await g.wait(c.holdSecs);
    hud.fade(false);
    g.inDialog = false;
    this.busy = false;
    this.climbs++;
    if (d.up && this.live) {
      this.puffT = c.puffSecs;
      p.anim.slump = true;
      g.say(p, c.top, 1.8);
    }
  }

  // Up: on the roof by the lift room, facing the way the landmark does (the gap). Down: out of the
  // lobby, `outStep` m from its door's E spot and turned away from the door (clear of the entrance
  // canopy, which would hold the chase camera at his shoulder). Set by hand: `teleport` snaps to
  // ground-level floors only (§14.6).
  put(name, up) {
    const g = this.g, p = g.player, l = lm(name), yaw = up ? l.yaw : l.yaw + Math.PI, out = up ? 0 : this.cfg.outStep;
    this.end();
    this.puff(false);
    p.state = 'normal';
    p.x = l.x + Math.sin(yaw) * out; p.z = l.z + Math.cos(yaw) * out; p.yaw = yaw;
    p.y = up ? l.y : groundAt(p.x, p.z, 0.2, 0.6);
    p.vx = p.vz = p.vy = 0; p.wishX = p.wishZ = 0;
    p.onGround = true;
    g.jumps = 0;
    this.on = up ? this.roofUnder() : null;
    g.cam.yaw = yaw;
    g.cam.snapNext = true;
  }

  puff(on) {
    if (!on && this.puffT > 0) { this.puffT = 0; this.g.player.anim.slump = false; }
  }

  // Off a roof: arms out and the mantra.
  start(gap) {
    const g = this.g, p = g.player;
    this.dive = { t: g.time, x: p.x, z: p.z, y0: p.y, gap };
    this.mantras++;
    p.anim.leap = true;
    g.say(p, S.mantraLine, 2.2);   // [F*] the exercise at Levander's clinic (research-plot.md:122–123), said over the gap
  }

  end() {
    const p = this.g.player;
    this.dive = null;
    if (p.anim.leap) p.anim.leap = false;
    if (p.anim.bomb) p.anim.bomb = false;
  }

  // main.js onLand: a hard landing (over 6 m/s, v) on floor height y. A fall that ends in the water is
  // a cannonball (a stomp) or a belly flop, with game.waterSplash; true: the splash replaced the dust.
  // On a roof (over the gap and down on the other one) or on dry ground it is an ordinary landing.
  onLand(v, y) {
    const d = this.dive, g = this.g, p = g.player;
    if (!d) return false;
    this.end();
    const water = this.live && p.state === 'normal' && !p.standingOn && !!waterAt(p.x, p.z, y);
    this.land(water ? (g.stomping ? 'bomb' : 'magplask') : this.roofUnder(0) ? 'roof' : 'dry', d, v);
    if (!water) return false;
    g.waterSplash(p.x, p.z, v, g.stomping);
    if (!g.stomping) p.flop(this.cfg.flopSecs);
    return true;
  }
  land(kind, d, v) {
    const g = this.g, p = g.player;
    this.last = { kind, x: +p.x.toFixed(2), z: +p.z.toFixed(2), v: +v.toFixed(1), t: g.time, secs: +(g.time - d.t).toFixed(2), gap: d.gap };
  }

  update(dt) {
    const g = this.g, p = g.player, c = this.cfg;
    if (!this.live) {
      // A mission (or a level change) with him up there: the roofs are not solid now, so down at the
      // lobby of the one he is on.
      if (g.level === 'island' && !this.busy && !g.playerCar && p.state === 'normal') {
        const k = this.roofUnder();
        if (k) this.put(k === 'sol' ? 'takSolLobby' : 'takAtlLobby', false);
      }
      if (this.dive) this.end();
      this.puff(false);
      this.on = null;
      this.viewSaid = false;
      return;
    }
    if (this.busy) return;
    if (this.puffT > 0) {
      this.puffT -= dt;
      if (this.puffT <= 0 || p.speed > 1 || !p.onGround || p.state !== 'normal') this.puff(false);
    }
    if (p.state !== 'normal' || g.playerCar) { if (this.dive) this.end(); if (g.playerCar) this.on = null; return; }
    if (p.onGround) {
      // A landing onLand did not hear (soft: back on a roof) ends the fall.
      if (this.dive) { this.land('roof', this.dive, -p.vy); this.end(); }
      groundAt(p.x, p.z, p.y, 0.05);
      const b = groundInfo.block;
      this.on = null;
      for (const [k, r] of Object.entries(ROOF_JUMP.roofs)) if (b && r.blocks.includes(b)) this.on = k;
      if (!this.on) this.viewSaid = false;
      const v = c.view, l = lm(v.lm);
      if (this.on === 'atl' && !this.viewSaid && Math.hypot(p.x - l.x, p.z - l.z) < v.r) {
        this.viewSaid = true;
        g.say(p, v.line, 2.4);
      }
    } else if (this.dive) {
      // The glide takes the fall over (§10.7); a stomp turns it into the cannonball.
      if (g.glide.on) this.end();
      else { p.anim.bomb = !!g.stomping; p.anim.leap = !g.stomping; }
    } else if (this.on && !g.glide.on) {
      const floor = ROOF_JUMP.roofs[this.on].floor, gap = this.overGap() && p.y > floor - 3;
      if (gap || p.y < floor - c.dropBy) this.start(gap);
    }
  }
}
