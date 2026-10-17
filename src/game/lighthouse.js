// Uppför fyren – the mantra 51 m up (free roam; feature 52, DESIGN §10.35). E at the arched door of
// Faro de Maspalomas' keeper's house climbs the tower: a black fade ("Många trappsteg senare …") and
// Stig stands on the gallery outside the lantern's door, 51.3 m up, the whole town under him. By day
// the climb has taken the afternoon: the clock (§10.10) is on at the sunset. "Femtio meter … det är ju
// nästan som att flyga.", and the vertigo rocks the camera. J held is Levander's exercise (the
// island's mantra, game.mantraMode): his back pressed to the lantern, arms straight out, eyes shut, the
// mantra; the vertigo settles. Held on while the lantern is still dark, the screen fades down as if
// he had kept his eyes shut a long time, the clock spins on to the night, and he opens them under
// the lit lantern with the beam sweeping round over his head. Down by E at the lantern's door ("… och
// lika många ner.") or by R; the clock goes on as it is. The gallery is a 1.3 m ring between the
// lantern and a closed railing: no jumping up there (main.js), and its own cameras (`cam`), because
// the chase camera would sit in the lantern: from outside the railing, round the tower with him (the
// mouse turns it), in front of him in the exercise, and the town as he sees it, from over his head,
// when he stands still facing out. Only on the island with no mission running (`missions.state ===
// 'idle'`), and the door is shut in a SKANDAL pursuit; a mission start with him up there puts him at
// the door below. The gallery's solids (world/blocks/coast.js LIGHTHOUSE) are all inside the tower's
// footprint, above 51.3 m, so nothing at the foot changes. Config: FYREN (content/island.js). Owned by
// Game as `fyren`: main.js calls `update` once a frame, asks `up` before a jump and `prompt(base)` for
// the J hint.

import { FYREN } from '../content/index.js';
import { LIGHTHOUSE } from '../world/blocks/coast.js';
import { lm } from '../world/layout.js';
import { groundAt } from '../world/collision.js';
import { input } from '../input.js';
import { S } from '../strings.js';
import { hud } from './hud.js';
import { clamp, damp, dampAngle, yawTo } from '../util.js';

export class Lighthouse {
  constructor(game, cfg = FYREN) {
    this.g = game;
    this.cfg = cfg;
    this.up = false;          // on the gallery (from the climb until he is off it)
    this.busy = false;        // a fade is playing (the stairs, the long blink)
    this.blinking = false;    // the long blink is playing
    this.gen = 0;             // bumped when a fade's sequence must stop (he left, a mission)
    this.upT = 0;             // seconds on the gallery this visit
    this.holdT = 0;           // game seconds the exercise has been held (J, after the wind-up), this hold
    this.calm = false;        // held calmSecs this visit: the vertigo is gone
    this.blinked = false;     // the long blink played this visit
    this.reminded = false;
    this.sway = 0;            // the vertigo's weight on the camera, 0..1
    this.view = null;         // 'orbit' | 'pose' | 'vista': the gallery camera in use
    this.off = 0;             // the mouse's turn of the orbit camera round the tower (rad)
    this.vistaOff = 0;        // and of the view out over the town
    this.stillT = 0;          // seconds standing still facing out
    this.last = null;         // tests: { kind: 'up' | 'down' | 'night', t, from, to }
    this.climbs = 0;          // tests: stairs taken this session
    game.addInteractable({
      id: 'fyren:upp', r: cfg.r, prompt: cfg.promptUp,
      pos: () => lm(cfg.door),
      enabled: () => this.canUse(true),
      use: () => this.stairs(true),
    });
    game.addInteractable({
      id: 'fyren:ner', r: cfg.r, prompt: cfg.promptDown,
      pos: () => lm(cfg.gallery),
      enabled: () => this.canUse(false),
      use: () => this.stairs(false),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  // On foot and free: no scene, car, carry, bust, PANIK, pool-fest ring or bag on the belt; up only
  // with no SKANDAL pursuit (the gallery would be a free hideout where the porter's costs 500 pta).
  canUse(upward) {
    const g = this.g, p = g.player;
    return this.live && !this.busy && !g.inDialog && !g.playerCar && !g.carrying && p.state === 'normal' && p.onGround
      && !(upward && g.shame.pursuit) && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !g.fest.joined && !g.belt.seated;
  }
  // Over the gallery's ring, no more than 1.5 m under its floor.
  onGallery() {
    const p = this.g.player, L = LIGHTHOUSE;
    return p.y > L.deck - 1.5 && Math.hypot(p.x - L.x, p.z - L.z) < L.rail + 0.5;
  }
  // The prompt up there: the J hint after whatever E offers (the door down).
  prompt(base) {
    if (!this.up || this.busy || this.g.mantraPose) return base;
    return base ? `${base} &nbsp; ${S.promptMantra}` : S.promptMantra;
  }

  // ---------------------------------------------------------------------------------------------
  // The stairs

  // Up or down: a black fade with the banner, the clock on to the evening by day (spun as the nap's),
  // and he is at the other end (inDialog holds his keys).
  async stairs(upward) {
    const g = this.g, p = g.player, c = this.cfg, day = g.day, gen = ++this.gen;
    this.busy = true;
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    day.over = true;
    hud.fade(true);
    await g.wait(c.fadeSecs);
    if (gen !== this.gen) return;
    hud.showBanner(upward ? c.upBanner : c.downBanner, '', 'mission', 0);
    this.put(upward);
    const from = day.h, to = upward && day.isDay(from) ? c.evening : from;
    if (to !== from) {
      await day.spin(from, to);
      if (gen !== this.gen) return;
      day.set(to);
      day.write();
    }
    await g.wait(c.holdSecs);
    if (gen !== this.gen) return;
    hud.hideBanner();
    hud.fade(false);
    await g.wait(c.fadeSecs);
    if (gen !== this.gen) return;
    day.over = false;
    g.inDialog = false;
    this.busy = false;
    this.climbs++;
    this.last = { kind: upward ? 'up' : 'down', t: g.time, from, to: day.h };
    if (upward) {
      await g.wait(c.arriveAt);
      if (gen === this.gen && this.up) g.say(p, c.arrive, 3.2);
    }
  }

  // Up: on the gallery outside the lantern's door, facing out over the town. Down: `outStep` m out
  // from the door's E spot, turned away from the door. Set by hand: `teleport` snaps to ground-level
  // floors only (§14.6).
  put(upward) {
    const g = this.g, p = g.player, c = this.cfg, l = lm(upward ? c.gallery : c.door);
    const yaw = upward ? l.yaw : l.yaw + Math.PI, out = upward ? 0 : c.outStep;
    p.state = 'normal';
    p.x = l.x + Math.sin(yaw) * out; p.z = l.z + Math.cos(yaw) * out; p.yaw = yaw;
    p.y = upward ? LIGHTHOUSE.deck : groundAt(p.x, p.z, 0.2, 0.6);
    p.vx = p.vz = p.vy = 0; p.wishX = p.wishZ = 0;
    p.onGround = true;
    g.jumps = 0;
    if (upward) this.enter();
    else { this.leave(); g.cam.yaw = yaw; g.cam.snapNext = true; }
  }

  // A visit starts: the island's J is the mantra, the vertigo on, the camera round the tower with him.
  enter() {
    const g = this.g;
    this.up = true;
    this.upT = this.holdT = this.stillT = 0;
    this.calm = this.blinked = this.reminded = false;
    this.sway = 1;
    this.off = this.vistaOff = 0;
    this.view = null;
    g.mantraMode = true;
    this.camera(0, true);
  }
  // The visit is over (the stairs down, R, a mission, anything that moved him off): his eyes open,
  // J the island's again, the chase camera behind him. Only he is up there between missions, so the
  // mantra is his to clear: a mission that starts with him up there has no stage running yet (a mantra
  // stage sets it again for itself).
  leave() {
    const g = this.g, p = g.player;
    if (!this.up) return;
    this.up = false;
    this.view = null;
    this.holdT = 0;
    p.anim.eyesShut = false;
    g.mantraMode = false;
    g.cam.release();
    g.cam.snapNext = true;
  }
  // A fade under way stops where it is (the screen and the keys given back).
  abort() {
    const g = this.g;
    this.gen++;
    if (!this.busy) return;
    // A blink's held pose goes back to the engine (dropped at its next step unless J is held).
    if (this.blinking) g.mantraPose = true;
    this.busy = this.blinking = false;
    hud.fade(false);
    hud.hideBanner();
    g.day.over = false;
    if (g.missions.state === 'idle') g.inDialog = false;
  }

  // ---------------------------------------------------------------------------------------------
  // The long blink: black, the clock on to the night, his eyes open under the lit lantern.

  async blink() {
    const g = this.g, p = g.player, c = this.cfg, day = g.day, gen = ++this.gen;
    this.busy = this.blinked = this.blinking = true;
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    day.over = true;
    hud.fade(true);
    await g.wait(c.blinkSecs);
    if (gen !== this.gen) return;
    const from = day.h;
    await day.spin(from, c.night);
    if (gen !== this.gen) return;
    day.set(c.night);
    day.write();
    await g.wait(c.holdSecs);
    if (gen !== this.gen) return;
    hud.fade(false);
    await g.wait(c.fadeSecs);
    if (gen !== this.gen) return;
    day.over = false;
    g.inDialog = false;
    this.busy = this.blinking = false;
    // The pose goes back to the engine: kept while J is still held, dropped at the next step if not.
    g.mantraPose = true;
    this.last = { kind: 'night', t: g.time, from, to: day.h };
  }

  // ---------------------------------------------------------------------------------------------

  update(dt) {
    const g = this.g, p = g.player, c = this.cfg, L = LIGHTHOUSE;
    if (!this.up) return;
    if (!this.live) {
      // A mission (or a level change) with him up there: down at the door, never a fall.
      this.abort();
      if (g.level === 'island' && !g.playerCar && p.state === 'normal' && this.onGallery()) this.put(false);
      else this.leave();
      return;
    }
    // Off the gallery by anything but the stairs (R, a warp): the visit is over.
    if (!this.onGallery() || g.playerCar || p.state !== 'normal') { this.abort(); this.leave(); return; }
    if (this.busy) {
      // Through the long blink he stands as he was: back to the lantern, arms out, eyes shut.
      if (this.blinking) { p.anim.wings = true; p.anim.eyesShut = true; }
      return;
    }
    this.upT += dt;
    const dx = p.x - L.x, dz = p.z - L.z, r = Math.hypot(dx, dz) || 1e-6, out = yawTo(dx, dz);
    // The railing's walls hold him; a last guard keeps him inside its ring whatever pushed him.
    if (r > L.rOut + 0.05) { const k = (L.rOut + 0.05) / r; p.x = L.x + dx * k; p.z = L.z + dz * k; }
    const pose = g.mantraPose;
    p.anim.eyesShut = !!pose;
    if (pose) {
      // Levander's exercise: his back to the lantern, facing out, eased there.
      const want = L.rIn + 0.02, rr = damp(Math.min(r, L.rOut), want, 8, dt);
      p.x = L.x + (dx / r) * rr; p.z = L.z + (dz / r) * rr;
      p.yaw = dampAngle(p.yaw, out, 10, dt);
      if (g.mantraOn) {
        this.holdT += dt * g.timeScale;
        if (this.holdT >= c.calmSecs) this.calm = true;
        if (this.holdT >= c.nightSecs && !this.blinked && !g.day.lit()) { this.blink(); return; }
      }
    } else this.holdT = 0;
    // The vertigo: on until the exercise has been held calmSecs, eased off while it is held.
    const swayTo = this.calm || g.mantraOn ? 0 : 1;
    this.sway = damp(this.sway, swayTo, swayTo > this.sway ? c.sway.in : c.sway.out, dt);
    if (!this.reminded && !this.calm && !pose && this.upT > c.remind.after && !g.saying(p)) {
      this.reminded = true;
      g.say(p, c.remind.line, 3.4);
    }
    this.camera(dt, false);
  }

  // The gallery's cameras (cam.cine, eased by CamRig), and cam.yaw for the keys:
  //  - pose: in the exercise, straight out in front of him, a little under his eyes, the lantern behind;
  //  - vista: standing still facing out (not against the lantern) and not talking, from over his
  //    head out over the town, as he sees it (the mouse turns it a little);
  //  - orbit: otherwise outside the railing round the tower with him, looking in at him (the mouse
  //    turns it round the tower, both ways up to `max`).
  // A change of view is a cut.
  camera(dt, snap) {
    const g = this.g, p = g.player, C = this.cfg.cam, L = LIGHTHOUSE;
    const dx = p.x - L.x, dz = p.z - L.z, r = Math.hypot(dx, dz) || 1e-6, a = yawTo(dx, dz);
    // Still: not moving (leaning on the railing with W held still counts), facing out.
    const look = input.look(), still = p.speed < 0.3;
    const facing = Math.abs(Math.atan2(Math.sin(p.yaw - a), Math.cos(p.yaw - a))) < C.vista.face;
    // Not while he is saying something: his bubble needs his head in the frame.
    this.stillT = still && facing && r > L.rIn + 0.15 && !g.mantraPose && !g.saying(p) ? this.stillT + dt : 0;
    const view = g.mantraPose ? 'pose' : this.stillT >= C.vista.still ? 'vista' : 'orbit';
    if (view !== this.view) { snap = true; if (view === 'vista') this.vistaOff = 0; }
    this.view = view;
    let ex, ey, ez, lx, ly, lz;
    if (view === 'vista') {
      if (!g.inDialog) this.vistaOff = clamp(this.vistaOff - look.x * C.vista.turn, -C.vista.max, C.vista.max);
      const ux = dx / r, uz = dz / r, tx = uz, tz = -ux, yaw = p.yaw + this.vistaOff;
      const er = Math.max(L.lantern + 0.25, r - C.vista.back);
      ex = L.x + ux * er + tx * C.vista.side; ez = L.z + uz * er + tz * C.vista.side; ey = L.deck + C.vista.h;
      lx = p.x + Math.sin(yaw) * C.vista.out; lz = p.z + Math.cos(yaw) * C.vista.out; ly = L.deck - C.vista.down;
      g.cam.yaw = yaw;
    } else {
      const o = view === 'pose' ? C.pose : C.orbit;
      if (view === 'orbit' && !g.inDialog) this.off = clamp(this.off - look.x * C.orbit.turn, -C.orbit.max, C.orbit.max);
      const b = a + (view === 'orbit' ? this.off : 0);
      ex = L.x + Math.sin(b) * o.r; ez = L.z + Math.cos(b) * o.r; ey = L.deck + o.h;
      lx = p.x; lz = p.z; ly = L.deck + o.look;
      g.cam.yaw = yawTo(p.x - ex, p.z - ez);
    }
    // The vertigo: the sight line rocks slowly from side to side and up and down, the eye bobs.
    const W = this.cfg.sway, k = this.sway, t = g.time * W.rate;
    if (k > 0.001) {
      const vx = lx - ex, vy = ly - ey, vz = lz - ez, hd = Math.hypot(vx, vz), d = Math.hypot(hd, vy);
      const yw = Math.atan2(vx, vz) + Math.sin(t) * W.yaw * k, pt = Math.atan2(vy, hd) + Math.sin(t * 1.37 + 1) * W.pitch * k;
      lx = ex + Math.sin(yw) * Math.cos(pt) * d; lz = ez + Math.cos(yw) * Math.cos(pt) * d; ly = ey + Math.sin(pt) * d;
      ey += Math.sin(t * 0.71 + 2) * W.bob * k;
    }
    const cam = g.cam;
    if (snap || !cam.cine) cam.cutTo({ x: ex, y: ey, z: ez }, { x: lx, y: ly, z: lz });
    else { cam.cine.pos.set(ex, ey, ez); cam.cine.look.set(lx, ly, lz); }
  }
}
