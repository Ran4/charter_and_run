// Kyrkfrid i Templo Ecuménico (free roam, DESIGN §7.2; feature 60). During a free-roam SKANDAL
// pursuit, on foot, E at the church door ("Sök skydd i kyrkan") and Stig slips in: `enterSecs` s at
// the door, frozen, while the officer keeps coming (one who reaches him busts him as anywhere), then
// the door slams and Stig is hidden. The camera stays out on the plaza (`cam`): the officer walks to
// the sisters' sign ES UNA IGLESIA / DET ÄR EN KYRKA, reads it out, spells his way through the Swedish
// and scratches his head, while the Land Rovers wait at the street with their blue lamps on and the
// meter sinks (`secs`; held at `floor` until he has read the sign: the bands do not move with a
// pursuer this close). Then they give up: "De där svenskarna är heltokiga!", the pursuit over without
// a fine, the officer off to his Land Rover, and Stig peeks out of the door, steps out and says the
// sisters' "Hoppas vi inte får användning för det."; the banner KYRKFRID, and the Land Rovers drive
// off once the officer is in. Free, but on foot, at the door and with its own cooldown (`t`; the
// porter's and the paint shop's is shame.hideoutT, the wardrobe's closet.t). Only on the island with
// no mission running (`missions.state === 'idle'`, as the wardrobe): a mission start or the other
// level ends it at once, so no mission, stage, timer or calibration pool sees it. Nothing is saved.
// Config: METERS.skandal.kyrkfrid (offsets [x, z] from its landmark `at`). Owned by Shame as
// `shame.church`: Shame.update leaves a pursuit to it while `holds`, and calls `update` after the
// wardrobe's. Invented (§1.6): the sanctuary and the scene; the lines are the film's, relocated.

import { scene, GeoBuilder, toonMesh } from '../gfx.js';
import { AIDriver } from '../actors/drivers.js';
import { lm } from '../world/layout.js';
import { segmentBlocked } from '../world/collision.js';
import { lampMesh } from './guardiaJeep.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { dist, yawTo, lerp } from '../util.js';

// The open right leaf of the church door: the dark church behind it (the leaf swings in). Door
// face at block z 1 (world/blocks/centre.js kyrka: 3.2 × 3.4 m, split), its front 0.12 m out.
function doorway() {
  const g = new GeoBuilder();
  g.boxB(0x16110e, 0, 0, 0, 1.5, 3.32, 0.04);
  g.boxB(0x5a3e28, 0.72, 0, 0.01, 0.07, 3.32, 0.05);    // the leaf swung in, edge on at its hinge
  return toonMesh(g.build(), { outline: 0, cast: false });
}

export class Church {
  constructor(shame) {
    this.sh = shame;
    this.g = shame.game;
    this.cfg = null;
    this.t = 0;              // s before the church shelters him again
    this.s = null;           // the scene: { phase enter | wait | out, t, ... }
    this.walk = null;        // the officer's walk: { pts, k, t, then, max, chkT, chkX, chkZ }
    this.held = [];          // the Land Rovers waiting at the street: [{ car, placed, lamp }]
    this.cut = false;        // the plaza shot is ours
    this.mesh = null;        // the open doorway
    this.card = null;        // the objective card while they wait
    this.last = null;        // tests: { kind, t }
    this.said = [];          // tests: [who, text, g.time]
  }

  // The config (or null): registers the door's E spot, returns its remover (shame.setupHideouts).
  configure(h) {
    this.clear();
    this.cfg = h || null;
    this.t = 0;
    const g = this.g;
    if (!h || !g.addInteractable) return [];
    if (!this.mesh) {
      this.mesh = doorway();
      this.mesh.visible = false;
      scene.add(this.mesh);
    }
    const q = this.at(h.leaf);
    this.mesh.position.set(q.x, g.groundAt(q.x, q.z), q.z);
    return [g.addInteractable({ id: 'kyrka:' + h.at, r: h.r, prompt: h.prompt, priority: 100,
      pos: () => lm(h.at), enabled: () => this.canUse(), use: () => this.enter() })];
  }

  at(d) { return this.g.lmOffset(this.cfg.at, d[0], d[1]); }
  get open() { const g = this.g; return !!this.cfg && g.level === 'island' && g.missions.state === 'idle'; }
  free() {
    const g = this.g, p = g.player;
    return this.open && !this.s && !g.inDialog && !g.playerCar && !g.carrying && p.state === 'normal' && p.onGround
      && !(g.frozenT > 0) && !(this.sh.panicT > 0);
  }
  canUse() { return this.sh.pursuit && this.t <= 0 && this.free(); }
  // Stig in the church, the pursuit still on: the scene has the meter, the officer and the Land Rovers.
  get holds() { return !!this.s && this.s.phase === 'wait'; }

  markers() {
    const l = this.cfg && lm(this.cfg.at);
    return l && this.canUse() ? [{ type: 'friend', x: l.x, z: l.z, edge: true }] : [];
  }
  objective() { return this.card; }

  say(who, target, text, secs) {
    this.g.say(target, text, secs);
    this.said.push([who, text, +this.g.time.toFixed(2)]);
  }

  // E at the door: he turns to it, it opens, and he walks into the dark (the officer still coming).
  enter() {
    const g = this.g, c = this.cfg, p = g.player;
    if (!this.canUse()) return;
    const d = this.at(c.door);
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    p.yaw = yawTo(d.x - p.x, d.z - p.z);
    g.frozenT = Math.max(g.frozenT, c.enterSecs + 0.1);
    this.s = { phase: 'enter', t: 0, x0: p.x, z0: p.z, d };
    this.mesh.visible = true;
    audio.door();
    this.last = { kind: 'enter', t: g.time };
  }

  // Busted at the door (shame.busted): the door shuts with him outside.
  onBusted() {
    if (this.s?.phase !== 'enter') return;
    this.abort();
    this.last = { kind: 'busted', t: this.g.time };
  }
  // A new pursuit after the scene: the officer is the chaser again, the waiting Land Rovers go.
  onPursuit() {
    if (this.s) this.abort();
    this.walk = null;
    this.release();
  }

  update(dt) {
    if (!this.cfg) return;
    this.t = Math.max(0, this.t - dt);
    if (!this.open) { if (this.s || this.walk || this.held.length) this.stop(); return; }
    const s = this.s;
    if (s) {
      s.t += dt;
      if (s.phase === 'enter') this.tickEnter(s);
      else if (s.phase === 'wait') this.tickWait(s, dt);
      else if (s.phase === 'out') this.tickOut(s);
    }
    if (this.walk) this.tickWalk(dt);
    else if (this.s?.phase === 'wait') this.stand(dt);
    if (this.held.length) {
      const on = Math.floor(this.g.time / this.cfg.blink) % 2 === 0;
      for (const h of this.held) h.lamp.visible = on;
    }
  }

  tickEnter(s) {
    const g = this.g, c = this.cfg, p = g.player, k = Math.min(1, s.t / c.enterSecs);
    // Escaped (or busted) at the door: he stays outside.
    if (!this.sh.pursuit) { this.abort(); return; }
    this.slide(p, s.x0, s.z0, s.d.x, s.d.z, k, c.enterSecs);
    if (k < 1) return;
    this.inside(s);
  }

  // The door slams behind him: hidden, the plaza shot, the officer to the sign, the Land Rovers to
  // the street; the meter sinks from here.
  inside(s) {
    const g = this.g, c = this.cfg, sh = this.sh, p = g.player;
    p.state = 'hidden';
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    p.anim.look = 0;
    this.mesh.visible = false;
    audio.doorSlam();
    g.cam.shake = Math.max(g.cam.shake, 0.35);
    g.cutTo(c.cam);
    this.cut = true;
    const l = lm(c.cam.at), fx = Math.sin(l.yaw), fz = Math.cos(l.yaw);
    this.eye = { x: l.x - fx * c.cam.dist, z: l.z - fz * c.cam.dist, fx, fz };
    this.card = { title: c.card.title, text: c.card.text };
    Object.assign(s, { phase: 'wait', t: 0, v0: Math.max(sh.v, c.floor), read: 'come', readT: 0 });
    this.parkJeeps();
    this.come();
    this.last = { kind: 'in', t: g.time };
  }

  // In the plaza shot: within the camera's width from its eye (`shotMargin` rad wider, `shotR` m)
  // with nothing solid between. A cut's lens is the profile's or 50° (camera.js), whatever it is now.
  inShot(x, z) {
    const e = this.eye, c = this.cfg, cam = this.g.cam, dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz) || 1;
    const fov = cam.profile ? cam.profile.fov : 50;
    const half = Math.atan(Math.tan((fov * Math.PI) / 360) * cam.cam.aspect) + c.shotMargin;
    return d < c.shotR && (dx * e.fx + dz * e.fz) / d > Math.cos(half) && segmentBlocked(e.x, e.z, x, z, 1.2) < 0;
  }

  // The living Land Rovers out of the shot are put on their stops at the street (the north lane,
  // facing west; a car already there moves the stop along the lane), the others stop where they are.
  // Their blue lamps blink while they wait.
  parkJeeps() {
    const g = this.g, c = this.cfg;
    let k = 0;
    for (const car of this.sh.pursuers) {
      if (car.dead) continue;
      const placed = !this.inShot(car.x, car.z) && k < c.stops.length;
      if (placed) {
        const s = this.at(c.stops[k++]);
        const clear = (x) => !g.cars.some((o) => o !== car && dist(o.x, o.z, x, s.z) < c.stopClear);
        const dx = [0, 7, -7, 14, -14].find((d) => clear(s.x + d)) ?? 0;
        car.place(s.x + dx, s.z, c.stopYaw);
      }
      car.ai = null;
      Object.assign(car.ctrl, { throttle: 0, brake: 0, steer: 0, handbrake: false, park: true });
      this.held.push({ car, placed, lamp: car.sirenLamp ||= lampMesh(car) });
    }
  }

  // The officer to the sign: from where he is when he can see the way within `reach` m, else on from
  // the plaza's south edge, behind the shot.
  come() {
    const g = this.g, c = this.cfg, sh = this.sh;
    const read = this.at(c.read), mid = this.at(c.mid), y = 0.65;
    let o = sh.officer;
    const here = o && o.state !== 'hidden' && dist(o.x, o.z, read.x, read.z) < c.reach;
    const sees = (q) => segmentBlocked(o.x, o.z, q.x, q.z, y) < 0;
    let pts;
    if (here && o.z > mid.z - c.midSouth && sees(read)) pts = [read];
    else if (here && sees(mid)) pts = [mid, read];
    else {
      const e = this.at(c.entry);
      o = sh.ensureOfficer(e.x, e.z);
      pts = [mid, read];
    }
    o.anim.look = 0;
    o.anim.scratch = false;
    sh.officerLinger = 0;
    this.walk = this.newWalk(o, pts, 'read', c.comeSecs);
  }

  newWalk(o, pts, then, max) { return { pts, k: 0, t: 0, then, max, chkT: 0, chkX: o.x, chkZ: o.z }; }

  tickWalk(dt) {
    const g = this.g, c = this.cfg, w = this.walk, o = this.sh.officer;
    if (!o || o.state === 'hidden') { this.walk = null; this.arrived(w.then, true); return; }
    w.t += dt;
    const tgt = w.pts[w.k];
    let dx = tgt.x - o.x, dz = tgt.z - o.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.4) {
      if (++w.k >= w.pts.length) { this.walk = null; this.arrived(w.then); return; }
    }
    const end = w.pts[w.pts.length - 1];
    const left = d + (w.k + 1 < w.pts.length ? dist(tgt.x, tgt.z, end.x, end.z) : 0);
    const sp = left > c.slowR ? c.run : c.walk;
    dx /= d || 1; dz /= d || 1;
    o.wishX = dx * sp; o.wishZ = dz * sp;
    o.step(dt, g);
    o.sync(dt);
    // Stuck (under 0.3 m in 1.5 s) or too long on the way: he is there.
    w.chkT += dt;
    if (w.chkT >= 1.5) {
      const moved = Math.hypot(o.x - w.chkX, o.z - w.chkZ);
      w.chkT = 0; w.chkX = o.x; w.chkZ = o.z;
      if (moved < 0.3) { this.walk = null; this.arrived(w.then, true); return; }
    }
    if (w.t > w.max) { this.walk = null; this.arrived(w.then, true); }
  }

  arrived(then, short = false) {
    const g = this.g, c = this.cfg, o = this.sh.officer;
    if (then === 'board') { this.board(); return; }
    // At the sign. Held up out of the shot: put on the spot he was making for.
    if (short && o && o.state !== 'hidden' && !this.inShot(o.x, o.z)) { const r = this.at(c.read); o.teleport(r.x, r.z); }
    const s = this.s;
    if (s?.phase !== 'wait') return;
    // No one left to read it (hidden meanwhile): they give up on the clock.
    if (!o || o.state === 'hidden') { s.read = 'done'; return; }
    o.wishX = o.wishZ = 0;
    s.read = 'read'; s.readT = 0;
    this.say('officer', o, c.readLine, c.readSecs);
    this.last = { kind: 'read', short, t: g.time };
  }

  // The officer standing at the sign: facing it while he reads, the door while he scratches his head.
  stand(dt) {
    const g = this.g, c = this.cfg, o = this.sh.officer, s = this.s;
    if (!o || o.state === 'hidden') return;
    o.wishX = o.wishZ = 0;
    const q = this.at(s.read === 'scratch' || s.read === 'done' ? c.door : c.sign);
    o.yaw = yawTo(q.x - o.x, q.z - o.z);
    o.step(dt, g);
    o.sync(dt);
  }

  tickWait(s, dt) {
    const g = this.g, c = this.cfg, sh = this.sh, o = sh.officer;
    g.frozenT = Math.max(g.frozenT, 0.2);
    if (!sh.pursuit) { this.abort(); return; }
    // The sign: read out, the Swedish spelt out, then the head scratched.
    if (s.read !== 'come' && s.read !== 'done') {
      s.readT += dt;
      if (s.read === 'read' && s.readT >= c.readSecs) {
        s.read = 'spell'; s.readT = 0;
        if (o) this.say('officer', o, c.spell, c.spellSecs);
        this.last = { kind: 'spell', t: g.time };
      } else if (s.read === 'spell' && s.readT >= c.spellSecs) {
        s.read = 'scratch'; s.readT = 0;
        if (o) o.anim.scratch = true;
        this.last = { kind: 'scratch', t: g.time };
      } else if (s.read === 'scratch' && s.readT >= c.scratchSecs) {
        s.read = 'done';
        if (o) o.anim.scratch = false;
      }
    }
    sh.v = Math.max(s.read === 'done' ? 0 : c.floor, sh.v - (s.v0 / c.secs) * dt);
    let near = Infinity;
    for (const h of this.held) near = Math.min(near, dist(h.car.x, h.car.z, g.player.x, g.player.z));
    audio.sirenNear(near);
    if (s.read === 'done' && s.t >= c.secs) this.giveUp(s);
  }

  // They give up: his shout as he turns away, the pursuit over (no fine, no escape banner), the
  // waiting Land Rovers kept for him; Stig peeks out after `peekAt` s.
  giveUp(s) {
    const g = this.g, c = this.cfg, sh = this.sh;
    let o = sh.officer;
    const at = o && o.state !== 'hidden' ? { x: o.x, z: o.z, yaw: o.yaw } : null;
    sh.pursuers = sh.pursuers.filter((car) => !this.held.some((h) => h.car === car));
    sh.v = 0;
    sh.endPursuit(true);
    this.t = c.cooldown;
    this.card = null;
    if (at) {
      o = sh.ensureOfficer(at.x, at.z);
      o.yaw = at.yaw;
      o.wishX = o.wishZ = 0;
      this.say('officer', o, c.shout, c.shoutSecs);
      // Off to the nearest waiting Land Rover's side (or the plaza's south edge), east of the eye.
      const pts = [this.at(c.away), this.at(c.exit)], ex = pts[1].x;
      const near = this.held.reduce((a, h) => (!a || Math.abs(h.car.x - ex) < Math.abs(a.car.x - ex) ? h : a), null);
      if (near) pts.push({ x: near.car.x, z: this.at(c.kerb).z });
      this.walk = this.newWalk(o, pts, 'board', c.leaveSecs);
    } else this.release();
    Object.assign(s, { phase: 'out', t: 0, peeked: false });
    this.last = { kind: 'giveUp', t: g.time };
  }

  // Peek (the door open, Stig in it, looking left and right), step out, the chase camera behind him
  // facing out, his line, then the banner.
  tickOut(s) {
    const g = this.g, c = this.cfg, p = g.player;
    if (s.t < c.peekAt) { g.frozenT = Math.max(g.frozenT, 0.2); return; }
    const d = this.at(c.door), out = this.at(c.out), yaw = lm(c.at).yaw;
    if (!s.peeked) {
      s.peeked = true;
      p.state = 'normal';
      p.root.visible = true;
      p.teleport(d.x, d.z, yaw);
      this.mesh.visible = true;
      audio.door();
      this.last = { kind: 'peek', t: g.time };
    }
    const tp = s.t - c.peekAt;
    if (tp < c.peekSecs) {
      g.frozenT = Math.max(g.frozenT, 0.2);
      p.anim.look = Math.sin((tp / c.peekSecs) * Math.PI * 2) * c.peekLook;
      p.yaw = yaw;
      return;
    }
    p.anim.look = 0;
    const k = Math.min(1, (tp - c.peekSecs) / c.stepSecs);
    if (k < 1) { g.frozenT = Math.max(g.frozenT, 0.2); this.slide(p, d.x, d.z, out.x, out.z, k, c.stepSecs); return; }
    // Out: the door shuts behind him, the chase camera on him, his line, and the banner after it.
    p.teleport(out.x, out.z, yaw);
    this.mesh.visible = false;
    audio.door();
    this.endCut();
    g.cam.yaw = yaw;
    g.cam.snapNext = true;
    g.frozenT = 0;
    this.s = null;
    this.last = { kind: 'out', t: g.time };
    const ln = c.lineAt, secs = c.lineSecs;
    g.wait(ln).then(() => {
      if (!this.open || this.sh.pursuit || p.state !== 'normal') return;
      this.say('stig', p, c.line, secs);
      this.last = { kind: 'line', t: g.time };
      g.wait(Math.max(secs, (1 + c.line.length * 0.045) * (g.testMode ? 0.5 : 1))).then(() => {
        if (!this.open || this.sh.pursuit) return;
        hud.showBanner(c.banner[0], c.banner[1], 'good', 2600);
        hud.flashColor('rgba(247,195,27,0.4)');
        audio.jingle('complete');
        this.last = { kind: 'banner', t: g.time };
      });
    });
  }

  // Stig walked from (x0, z0) to (x1, z1) over `secs`, k of the way (his walk shows).
  slide(p, x0, z0, x1, z1, k, secs) {
    const yaw = p.yaw;
    p.teleport(lerp(x0, x1, k), lerp(z0, z1, k), yaw);
    p.vx = (x1 - x0) / secs; p.vz = (z1 - z0) / secs;
  }

  // The officer at his Land Rover (or out of the plaza): he is in, and they drive off.
  board() {
    this.sh.hideOfficer();
    this.release();
    this.last = { kind: 'board', t: this.g.time };
  }

  // The waiting Land Rovers drive off as traffic (shame.leaving removes them), lamps off.
  release() {
    for (const h of this.held) {
      h.lamp.visible = false;
      if (!this.g.cars.includes(h.car)) continue;
      h.car.ai = new AIDriver(h.car, { mode: 'traffic', cruise: 14 });
      this.sh.leaving.push({ car: h.car, t: 25 });
    }
    this.held = [];
  }

  // Our shot over. Under someone else's scene (a mission's intro over it, in tests) that scene's own
  // endCut puts the camera back.
  endCut() {
    if (!this.cut) return;
    this.cut = false;
    if (!this.g.inDialog) this.g.endCut();
  }

  // The scene stops where it is: Stig back in the doorway if he was in, the door shut, the shot over.
  abort() {
    const g = this.g, p = g.player, s = this.s;
    this.s = null;
    this.card = null;
    if (this.mesh) this.mesh.visible = false;
    p.anim.look = 0;
    if (s && s.phase !== 'enter') g.frozenT = 0;
    if (p.state === 'hidden') {
      p.state = 'normal';
      p.root.visible = true;
      p.yaw = lm(this.cfg.at).yaw;
      g.cam.snapNext = true;
    }
    this.endCut();
    const o = this.sh.officer;
    if (o) o.anim.scratch = false;
    this.last = { kind: 'abort', t: g.time };
  }

  // Free roam is over (a mission start, in tests mid-scene): all of it at once. A pursuit still on
  // (they were waiting) gets its Land Rovers and its officer back; else the Land Rovers drive off and
  // the officer is gone.
  stop() {
    const sh = this.sh;
    if (this.s) this.abort();
    if (sh.pursuit) {
      for (const h of this.held) { h.lamp.visible = false; if (sh.pursuers.includes(h.car)) sh.chase(h.car); }
      this.held = [];
    } else {
      if (this.walk) sh.hideOfficer();
      this.release();
    }
    this.walk = null;
  }

  // The level changes (shame.configure, shame.clear): the scene over, its cars removed.
  clear() {
    if (this.s) this.abort();
    this.card = null;
    if (this.walk && !this.sh.pursuit) this.sh.hideOfficer();
    this.walk = null;
    for (const h of this.held) { h.lamp.visible = false; this.g.removeCar(h.car); }
    this.held = [];
  }
}
