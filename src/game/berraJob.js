// Bärra hem Berra – igen (free roam; feature 2, DESIGN §10.6). After the grisfest Berra naps now
// and then, on the bench south of the plaza fountain or a SunTrip sun lounger, Robban waiting beside
// him. Talk to Robban: the film's exchange, then Stig carries Berra over his shoulders (walking
// only, as in the grisfest carry) to the Flamenco reception. Sprinting, a fall, a bust or R drops
// him, and he lies there snoring until E lifts him again. At the desk Berra wakes and Robban pays,
// less a coin a drop; `napSecs` later Berra naps at the other spot. Only on the island with no
// mission running (`missions.state === 'idle'`): a mission start sends both home, and no mission,
// timer or calibration pool is touched. Config: BERRA_JOB (content/island.js). Owned by Game as
// `berraJob`; main.js asks it for the posed/waving NPCs, Robban's steering, the target, the
// objective card and the minimap marker.

import { THREE, camera } from '../gfx.js';
import { lm, routeAim } from '../world/layout.js';
import { props, reviveProps } from '../world/props.js';
import { BERRA_JOB } from '../content/index.js';
import { hud } from './hud.js';
import { fmt, pta } from '../strings.js';
import { dist, yawTo, dampAngle } from '../util.js';

const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _v = new THREE.Vector3();

export class BerraJob {
  constructor(game, cfg = BERRA_JOB) {
    this.g = game;
    this.cfg = cfg;
    this.phase = 'nap';      // nap | asleep | carry | dropped
    this.napT = 0;           // the first nap as soon as nobody sees him go
    this.spotI = 0;
    this.shown = false;      // Berra and Robban posed at the spot (phase asleep)
    this.busy = false;       // the ask or the delivery scene is playing
    this.carry = null;       // our g.carrying (cleared only while it is still ours)
    this.drops = 0;
    this.robGoal = null;
    this.snoreT = 0; this.snoreK = 0;
    this.propBy = new Map();   // spot -> its bench or lounger prop
    // Robban's ask while Berra sleeps; lifting the dropped Berra again.
    game.addInteractable({
      id: 'berra:ask', r: 2.6, prompt: fmt('promptTalk', { name: game.charDef('robban').name }),
      pos: () => (this.phase === 'asleep' && this.shown && !this.busy && this.active ? this.robban : null),
      use: () => this.ask(),
    });
    game.addInteractable({
      id: 'berra:lift', r: 1.9, prompt: cfg.liftPrompt,
      pos: () => (this.phase === 'dropped' && !this.busy && this.active && this.berra.state === 'down' ? this.berra : null),
      use: () => this.lift(),
    });
  }

  get berra() { return this.g.npc('berra'); }
  get robban() { return this.g.npc('robban'); }
  get spot() { return this.cfg.spots[this.spotI]; }
  get active() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle' && g.missions.index >= this.cfg.fromIndex; }
  get holding() { return this.shown || this.phase === 'carry' || this.phase === 'dropped'; }

  // main.js hooks. `posed`: no wave, turn or chatter (as a mission's idleAnim); `waving`: Robban
  // waves Stig over (main.js keeps the 9 m rule); `target`, `objective`, `markers` as the runner's.
  posed(key) {
    if (!this.holding && !this.busy) return false;
    return key === 'berra' || (key === 'robban' && (this.busy || this.phase !== 'asleep'));
  }
  waving(key) { return key === 'robban' && this.phase === 'asleep' && this.shown && !this.busy && this.active; }
  target() {
    if (!this.active || this.busy) return null;
    if (this.phase === 'carry') { const t = lm(this.cfg.to); return { x: t.x, z: t.z, r: this.cfg.radius }; }
    // Dropped: the arrow and a minimap dot, no beacon (it stood in the chase eye 2 m behind him).
    if (this.phase === 'dropped') { const n = this.berra; return { x: n.x, z: n.z, follow: true }; }
    return null;
  }
  objective() {
    if (!this.active || this.busy) return null;
    if (this.phase === 'carry') return { title: this.cfg.title, text: this.cfg.carryText };
    if (this.phase === 'dropped') return { title: this.cfg.title, text: this.cfg.liftText };
    return null;
  }
  markers() {
    if (!this.active || this.phase !== 'asleep' || !this.shown) return [];
    const n = this.berra;
    return [{ type: 'friend', x: n.x, z: n.z }];
  }
  // Robban's walk (main.js fixedStep reads `n.steer(h)`): to `robGoal`, faster the further it is.
  steerRobban() {
    const n = this.robban, q = this.robGoal;
    if (!q || n.state !== 'normal') return null;
    const dx = q.x - n.x, dz = q.z - n.z, d = Math.hypot(dx, dz);
    if (d < 0.35) return null;
    const sp = Math.min(4.6, 1.4 + d * 1.5);
    return { x: (dx / d) * sp, z: (dz / d) * sp };
  }

  update(dt) {
    if (this.busy) return;
    if (!this.active) { if (this.holding) this.release(); return; }
    const g = this.g;
    if (this.phase === 'nap') {
      this.napT -= dt;
      if (this.napT <= 0 && !g.inDialog && this.unseenMove()) this.fallAsleep();
    } else if (this.phase === 'asleep') {
      if (!this.shown) { if (!g.inDialog && this.unseenMove()) this.fallAsleep(); return; }
      if (!this.berra.busy || !this.robban.busy) { this.lost(); return; }
      this.tickAsleep(dt);
    } else if (this.phase === 'carry') {
      if (g.carrying !== this.carry || !this.berra.busy) { this.lost(); return; }
      this.tickCarry(dt);
    } else if (this.phase === 'dropped') {
      if (!this.berra.busy) { this.lost(); return; }
      this.tickDropped(dt);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Asleep at the spot

  // Never popped into or out of view: the spot and both men's current places are each beyond
  // `clearR` of the player, or 15 m off and outside the camera's view (placeNpcs' rule, plus the view).
  unseenMove() {
    const f = this.g.focus(), l = lm(this.spot.at);
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const unseen = (x, y, z) => {
      const d = dist(x, z, f.x, f.z);
      return d > this.cfg.clearR || (d > 15 && !_frustum.containsPoint(_v.set(x, y + 1, z)));
    };
    const ok = (n) => n.state === 'hidden' || unseen(n.x, n.y, n.z);
    return unseen(l.x, 0.2, l.z) && ok(this.berra) && ok(this.robban);
  }

  propOf(spot) {
    if (!this.propBy.has(spot)) { const l = lm(spot.at); this.propBy.set(spot, props.find((p) => p.type === spot.prop && dist(p.x, p.z, l.x, l.z) < 0.3) || null); }
    return this.propBy.get(spot);
  }

  fallAsleep() {
    const g = this.g, s = this.spot, l = lm(s.at);
    reviveProps(s.prop, { x: l.x, z: l.z, r: 0.5 });
    g.placeNpc('robban', s.at, ...s.robban);
    g.placeNpc('berra', s.at, s.seat[0], s.seat[1]);
    const n = this.berra;
    n.state = 'seated';
    n.anim.slump = true;
    this.seat();
    this.phase = 'asleep';
    this.shown = true;
    this.snoreT = 1.5;
    this.snoreK = 0;
  }

  // Berra on his bench or lounger: the hips at `seat`, turned `yaw` from the landmark, leaning back
  // `lean` about them (the lounger's backrest).
  seat() {
    const g = this.g, s = this.spot, n = this.berra, l = lm(s.at);
    const q = g.lmOffset(s.at, s.seat[0], s.seat[1]), hy = s.seat[2], yaw = (l.yaw || 0) + s.yaw, lean = s.lean;
    n.x = q.x; n.z = q.z; n.y = hy - 0.55; n.yaw = yaw;
    const r = n.root, L = n.model.legLen, sl = Math.sin(lean);
    r.rotation.order = 'YXZ';
    r.rotation.set(lean, yaw, 0);
    r.position.set(q.x - L * sl * Math.sin(yaw), hy - L * Math.cos(lean), q.z - L * sl * Math.cos(yaw));
    r.visible = true;
  }

  tickAsleep(dt) {
    const n = this.berra, s = this.spot, prop = this.propOf(s);
    if (n.state === 'seated') {
      // Someone smashed his bench or lounger: he slides off and sleeps on, on the ground.
      if (prop && !prop.alive) this.fall(0, 1, 0, s.seat[2]);
      else this.seat();
    } else this.keepDown();
    this.snore(dt, s.sleep, 4.5);
  }

  snore(dt, lines, every) {
    const g = this.g, n = this.berra, f = g.focus();
    this.snoreT -= dt;
    if (this.snoreT > 0) return;
    this.snoreT = every;
    if (dist(n.x, n.z, f.x, f.z) < this.cfg.snoreR && !g.inDialog && !g.saying(n)) g.say(n, lines[this.snoreK++ % lines.length], 2.4);
  }

  // ---------------------------------------------------------------------------------------------
  // Robban asks; the carry

  async ask() {
    const g = this.g, p = g.player, rob = this.robban;
    if (this.busy || this.phase !== 'asleep' || g.inDialog) return;
    this.busy = true;
    p.wishX = p.wishZ = 0;
    p.vx = p.vz = 0;
    p.yaw = yawTo(rob.x - p.x, rob.z - p.z);
    rob.yaw = yawTo(p.x - rob.x, p.z - rob.z);
    g.unsay(this.berra);
    g.cinematic(rob, p);
    try { await g.dialog(this.cfg.ask); } finally { g.endCut(); g.endCinematic(); this.busy = false; }
    if (!this.active || this.phase !== 'asleep') return;
    this.drops = 0;
    this.lift();
    this.faceGoal();
  }

  lift() {
    const g = this.g, n = this.berra, p = g.player, rob = this.robban;
    if (g.playerCar || p.state !== 'normal') return;
    g.unseatAny(n);
    n.state = 'seated';
    n.root.visible = true;
    n.root.rotation.order = 'XYZ';
    n.anim.slump = true;
    n.busy = true;
    rob.busy = true;
    this.carry = { who: 'berra', job: 'berra' };
    g.carrying = this.carry;
    g.speedCap = this.cfg.walkSpeed;
    p.anim.carryOver = true;
    g.bumpedT = 0;
    this.phase = 'carry';
    this.sprintT = 0;
    this.snoreT = 3;
    this.trail = [{ x: p.x, z: p.z }];
    this.ri = 0;
    rob.steer = () => this.steerRobban();
    this.shoulders();
  }

  // Across his shoulders, as the grisfest carry (kinds/flight.js `carry`).
  shoulders() {
    const n = this.berra, p = this.g.player, h = n.height * 0.5, y = p.y + p.height;
    n.x = p.x + Math.cos(p.yaw) * h; n.y = y; n.z = p.z - Math.sin(p.yaw) * h; n.yaw = p.yaw;
    n.root.position.set(n.x, y, n.z);
    n.root.rotation.set(0, p.yaw, Math.PI / 2);
    this.foot = { yaw: p.yaw };
  }

  faceGoal() {
    const g = this.g, p = g.player, t = lm(this.cfg.to), a = routeAim(p.x, p.z, t.x, t.z);
    if (dist(a.x, a.z, p.x, p.z) > 0.3) p.yaw = g.cam.yaw = yawTo(a.x - p.x, a.z - p.z);
  }

  tickCarry(dt) {
    const g = this.g, p = g.player, c = this.cfg, inp = g.input;
    const moving = Math.hypot(inp.moveX(), inp.moveY()) > 0.1;
    this.sprintT = inp.down('sprint') && moving && !g.inDialog ? this.sprintT + dt : 0;
    if (g.bumpedT > 0) return this.drop(0, 1.5, 0);                                  // R
    if (p.state === 'flung' || p.state === 'down') return this.drop(p.vx * 0.7, 4, p.vz * 0.7);   // run over, fell
    if (g.frozenT > 0 || g.playerCar) return this.drop(0, 2, 0);                     // busted
    if (this.sprintT > c.sprintSecs) {                                               // ran
      const fx = Math.sin(this.foot.yaw) * 2.6, fz = Math.cos(this.foot.yaw) * 2.6;
      return this.drop(fx, 2.6, fz);
    }
    this.shoulders();
    this.follow(dt, 3);
    this.snore(dt, [this.cfg.snore], 6);
    const t = lm(c.to);
    if (p.state === 'normal' && !g.inDialog && dist(p.x, p.z, t.x, t.z) < c.radius) this.deliver();
  }

  // Robban walks Stig's trail (a point every 0.5 m: the way a body got through) and stops `gap` m
  // short of him; a long way behind (knocked over, wedged) he is put back on the trail.
  follow(dt, gap) {
    const p = this.g.player, rob = this.robban, tr = this.trail;
    const last = tr[tr.length - 1];
    if (p.onGround && Math.hypot(p.x - last.x, p.z - last.z) > 0.5) {
      tr.push({ x: p.x, z: p.z });
      if (tr.length > 90) { tr.shift(); this.ri = Math.max(0, this.ri - 1); }
    }
    if (rob.state !== 'normal') { this.robGoal = null; return; }
    const d = dist(rob.x, rob.z, p.x, p.z);
    if (d > 24 && tr.length > 9) {
      const q = tr[tr.length - 9];
      rob.teleport(q.x, q.z, yawTo(p.x - q.x, p.z - q.z));
      this.ri = tr.length - 8;
    }
    while (this.ri < tr.length - 1 && dist(rob.x, rob.z, tr[this.ri].x, tr[this.ri].z) < 0.8) this.ri++;
    this.robGoal = d < gap ? null : tr[this.ri];
    if (!this.robGoal) rob.yaw = dampAngle(rob.yaw, yawTo(p.x - rob.x, p.z - rob.z), 6, dt);
  }

  unhold() {
    const g = this.g;
    if (this.carry && g.carrying === this.carry) {
      g.carrying = null;
      g.speedCap = null;
      g.player.anim.carryOver = false;
    }
    this.carry = null;
  }

  // Off the shoulders: he tumbles down where he was and sleeps on (main.js steps the fall).
  drop(vx, vy, vz) {
    const g = this.g;
    this.unhold();
    this.fall(vx, vy, vz);
    this.drops++;
    this.phase = 'dropped';
    this.snoreT = 2.5;
    g.say(this.robban, this.cfg.drop[1], 3.2);
  }

  fall(vx, vy, vz, y) {
    const n = this.berra;
    n.root.rotation.order = 'XYZ';
    n.root.rotation.set(0, n.yaw, 0);
    n.state = 'normal';
    if (y !== undefined) n.y = y;
    n.fling(vx, vy, vz);
  }

  // Asleep on the ground: never gets up by himself (Character.step's 'down' timer).
  keepDown() {
    const n = this.berra;
    if (n.state === 'normal') n.state = 'down';
    if (n.state === 'down') n.timer = 999;
  }

  tickDropped(dt) {
    const n = this.berra, rob = this.robban;
    this.keepDown();
    // Robban stands over him (1.3 m off, on his own side).
    if (rob.state === 'normal') {
      const d = dist(rob.x, rob.z, n.x, n.z);
      this.robGoal = d > 2 ? { x: n.x + ((rob.x - n.x) / d) * 1.3, z: n.z + ((rob.z - n.z) / d) * 1.3 } : null;
      if (!this.robGoal) rob.yaw = dampAngle(rob.yaw, yawTo(n.x - rob.x, n.z - rob.z), 6, dt);
    } else this.robGoal = null;
    this.snore(dt, [this.cfg.snore], 4);
  }

  // ---------------------------------------------------------------------------------------------
  // The desk

  async deliver() {
    const g = this.g, c = this.cfg, sc = c.scene, n = this.berra, rob = this.robban;
    this.busy = true;
    this.unhold();
    delete rob.steer;
    this.robGoal = null;
    n.root.rotation.set(0, 0, 0);
    n.anim.slump = false;
    const pay = Math.max(c.minPay, c.pay - c.perDrop * this.drops);
    g.unsay(n);
    g.placeNpc('berra', c.to, ...sc.berra);
    g.placeNpc('robban', c.to, ...sc.robban);
    g.placeNpc('stig', c.to, ...sc.stig);
    g.cutTo(sc.cam);
    g.inDialog = true;
    hud.letterbox(true);
    const thanks = pay >= c.pay ? c.thanks : fmt(c.thanksDocked, { n: pta(pay) });
    try {
      await g.dialog([c.home, ['robban', thanks, { coins: pay, sfx: 'coin' }]]);
    } finally {
      g.endCut();
      g.endCinematic();
      // Awake and free: placeNpcs takes them home once the player has gone (its 50 m rule).
      for (const m of [n, rob]) { m.busy = false; m.spot = null; }
      this.busy = false;
    }
    hud.toast(fmt(c.paidToast, { n: pta(pay) }));
    this.phase = 'nap';
    this.napT = c.napSecs;
    this.shown = false;
    this.spotI = (this.spotI + 1) % c.spots.length;
  }

  // ---------------------------------------------------------------------------------------------
  // Hand-backs

  // Someone else placed them (a forced placeNpcs): the nap starts over when nobody sees it.
  lost() {
    this.unhold();
    delete this.robban.steer;
    this.robGoal = null;
    const n = this.berra;
    n.anim.slump = false;
    n.root.rotation.order = 'XYZ';
    if (this.phase !== 'nap') this.phase = 'asleep';
    this.shown = false;
  }

  // A mission starts (or the level changes): both go home at once, un-posed; the nap waits at the
  // same spot for the next idle moment.
  release() {
    const g = this.g;
    this.lost();
    for (const key of ['berra', 'robban']) {
      const n = g.npc(key);
      let home = g.levelDef.homes(g)[key] ?? null;
      if (g.level === 'island' && key in g.homeOverrides) home = g.homeOverrides[key];
      if (home && !home.seat) g.placeNpc(key, home[0], home[1], home[2], home[3]);
      else if (n.state !== 'hidden') n.state = 'normal';
      n.busy = false;
      n.spot = null;
    }
  }
}
