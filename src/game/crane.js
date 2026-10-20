// Åk med byggkranen – the building site's tower crane (free roam; feature 118, DESIGN §10.56). The crane
// in world/blocks/nature.js (`CRANE`: the mast, the spots, the coins and the meshes) runs one cycle: the
// brick pallet rests on the yard east of the frame (P0), is hoisted, slewed over the frame and set down on
// the 3rd floor's slab (P1), rests, and goes back. The pose (the jib's heading `phi`, the trolley's radius
// `R`, the pallet's underside `y`) is stepped in fixedStep (`step`, before the player's step), the pallet
// swinging on its cable (a damped pendulum the hook pushes). Between missions on the island the pallet is
// a floor for Stig (`platformAt`, read by Character.step through main.platformAt) that carries him, in the
// air over it too, so a hop on it lands on it. High on it and moving he spreads his arms and says the
// mantra; on the slab (out of reach otherwise) the coins and, by its north edge, Angerud's pitch as a
// toast; a long fall off either is a thud (`onLand`). A SKANDAL pursuit sends the pallet home to P0 and
// holds it there; in a mission the pallet is no floor (the crane runs on as scenery) and Stig, if up
// there, is put down by P0. Config: KRANEN (content/island.js). Owned by Game as `crane`; main.js calls
// `step` in fixedStep, `update` once a frame, `platformAt` for Character.step and `onLand`.

import { THREE } from '../gfx.js';
import { KRANEN } from '../content/index.js';
import { CRANE, PALLET } from '../world/blocks/nature.js';
import { lm } from '../world/layout.js';
import { groundAt } from '../world/collision.js';
import { placeCoin } from '../actors/pickups.js';
import { audio } from '../audio.js';
import { S } from '../strings.js';
import { fx } from './fx.js';
import { hud } from './hud.js';

// The cycle's moves in turn; `up`, `hold` only on the way home in a pursuit.
const CYCLE = ['rest0', 'up0', 'out', 'down1', 'rest1', 'up1', 'back', 'down0'];
const G = 9.8;       // the pendulum's gravity: a look (the sway's period), not the game's GRAV
const AMAX = 3;      // the hook's acceleration the sway takes, m/s² (a move cut short is no kick)
const EYE = 1.5;     // the sling hides with the camera's eye within this of its footprint
const ease = (u) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clampA = (a) => Math.max(-AMAX, Math.min(AMAX, a));
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();

export class Crane {
  constructor(game, cfg = KRANEN) {
    this.g = game;
    this.cfg = cfg;
    const C = CRANE;
    this.ok = !!C.mast;   // the bygge was built
    // The two spots as the jib's heading and the trolley's radius from the mast, and the pallet's underside.
    this.spot = {};
    for (const k of ['p0', 'p1']) {
      const p = C[k] ?? { x: 0, z: 0, y: 0 }, dx = p.x - (C.mast?.x ?? 0), dz = p.z - (C.mast?.z ?? 0);
      this.spot[k] = { phi: Math.atan2(dx, dz), R: Math.hypot(dx, dz), y: p.y };
    }
    const s0 = this.spot.p0;
    this.phi = s0.phi; this.R = s0.R; this.y = s0.y;
    this.sx = 0; this.sz = 0; this.svx = 0; this.svz = 0;   // the pallet's offset from under the hook, and its rate
    this.hx = 0; this.hz = 0; this.hvx = 0; this.hvz = 0;   // the hook (under the trolley) and its velocity
    this.px = 0; this.pz = 0;                               // the pallet's middle
    this.vx = 0; this.vz = 0; this.vy = 0;                  // the pallet's velocity this step
    this.ride = { vx: 0, vz: 0, carries: true };            // what Character.step rides (its standingOn)
    this.hit = { top: 0, car: this.ride };
    this.i = 0;             // the cycle's move (CYCLE)
    this.move = null;       // { name, t, T, from: { phi, R, y }, to, rest, down }
    this.homing = false;    // in a pursuit, and until the pallet is home after it
    this.floor = false;     // the pallet is a floor this step
    this.on = null;         // where Stig stood last frame: 'pallet' | 'slab' | null
    this.onY = 0;           // that floor's height
    this.riding = false;    // on the pallet (or in the air over it) since it lifted
    this.fall = null;       // off the pallet or the slab, in the air: { y0 (the floor he left), glided }
    this.thudT = null;      // s to his line after a thud
    this.viewSaid = false;  // the toast this visit up
    this.sayT = 0;          // s to the next mantra
    this.posed = false;     // our arms out (anim.placate 2) on him
    // Tests: rides, mantras said, thuds, views, put-downs, the last thud { drop, v, x, z }.
    this.rides = 0; this.mantras = 0; this.thuds = 0; this.views = 0; this.putDowns = 0; this.last = null;
    if (!this.ok) return;
    for (const [x, z] of C.coins) placeCoin(x, C.slab.top + cfg.coinY, z, null, C.slab.top - cfg.coinMinY);
    this.place();
    this.start(0);
    this.sync();
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get name() { return this.move?.name ?? null; }

  // The hook and the pallet where the pose puts them, at rest (no sway, no velocity).
  place() {
    const C = CRANE;
    this.hx = C.mast.x + this.R * Math.sin(this.phi); this.hz = C.mast.z + this.R * Math.cos(this.phi);
    this.hvx = this.hvz = 0;
    this.px = this.hx + this.sx; this.pz = this.hz + this.sz;
    this.vx = this.vz = this.vy = 0;
  }

  start(i) {
    this.i = i % CYCLE.length;
    this.move = this.plan(CYCLE[this.i]);
  }

  // A move from the pose as it is. Rests hold the pose; the others ease every axis in and out over the
  // longest of their times at the axes' peak speeds.
  plan(name) {
    const c = this.cfg, from = { phi: this.phi, R: this.R, y: this.y }, to = { ...from };
    if (name === 'rest0' || name === 'rest1' || name === 'hold') {
      return { name, t: 0, T: name === 'hold' ? Infinity : c[name], from, to, rest: true, down: false };
    }
    let vy = c.hoist.up;
    if (name === 'up0' || name === 'up1' || name === 'up') to.y = c.cruise;
    else if (name === 'out') { to.phi = this.spot.p1.phi; to.R = this.spot.p1.R; }
    else if (name === 'back') { to.phi = this.spot.p0.phi; to.R = this.spot.p0.R; }
    else if (name === 'down1') { to.y = this.spot.p1.y; vy = c.hoist.down; }
    else if (name === 'down0') { to.y = this.spot.p0.y; vy = c.hoist.home; }
    to.phi = from.phi + wrap(to.phi - from.phi);
    const k = Math.PI / 2;
    const T = Math.max(0.5, k * Math.abs(to.y - from.y) / vy, k * Math.abs(to.phi - from.phi) / c.slew.w, k * Math.abs(to.R - from.R) / c.slew.trolley);
    return { name, t: 0, T, from, to, rest: false, down: to.y < from.y };
  }

  atP0() { const s = this.spot.p0; return Math.abs(wrap(this.phi - s.phi)) < 1e-4 && Math.abs(this.R - s.R) < 1e-3; }

  // Home to P0 in a pursuit: up to the cruise height first unless it is over P0, back, down, and held.
  planHome() {
    if (!this.atP0()) return this.plan(this.y < this.cfg.cruise - 1e-3 ? 'up' : 'back');
    return this.plan(this.y > this.spot.p0.y + 1e-3 ? 'down0' : 'hold');
  }

  // Stig on foot by P0 on the ground, waiting for the pallet.
  waiting() {
    const g = this.g, p = g.player, s = CRANE.p0;
    return !g.playerCar && p.state === 'normal' && p.onGround && !this.on && p.y < s.y + 1 && Math.hypot(p.x - s.x, p.z - s.z) < this.cfg.waitR;
  }

  step(h) {
    if (!this.ok) return;
    const g = this.g, c = this.cfg, C = CRANE;
    const pursuit = !!g.shame?.pursuit;
    if (pursuit && !this.homing) { this.homing = true; this.move = this.planHome(); }
    // The pursuit over and the pallet home: the cycle again, from the rest on the yard.
    if (!pursuit && this.homing && this.move.name === 'hold') { this.homing = false; this.start(0); }
    const m = this.move;
    if (m.name === 'rest1' && m.t < m.T - c.rest1Short && this.live && this.waiting()) m.t = m.T - c.rest1Short;
    m.t += h;
    const y0 = this.y;
    if (!m.rest) {
      const u = ease(m.t / m.T);
      this.phi = m.from.phi + (m.to.phi - m.from.phi) * u;
      this.R = m.from.R + (m.to.R - m.from.R) * u;
      this.y = m.from.y + (m.to.y - m.from.y) * u;
    }
    // The hook, and the pallet swinging under it (sitting on its floor at a rest: the offset kept).
    const hx = C.mast.x + this.R * Math.sin(this.phi), hz = C.mast.z + this.R * Math.cos(this.phi);
    const hvx = (hx - this.hx) / h, hvz = (hz - this.hz) / h;
    const ax = clampA((hvx - this.hvx) / h), az = clampA((hvz - this.hvz) / h);
    this.hx = hx; this.hz = hz; this.hvx = hvx; this.hvz = hvz;
    if (m.rest) { this.svx = this.svz = 0; }
    else {
      const w0 = Math.sqrt(G / Math.max(2, C.hookY - this.y)), w2 = w0 * w0;
      const z = m.down && this.y - m.to.y < c.sway.steadyH ? c.sway.steadyZeta : c.sway.zeta;
      this.svx += (-w2 * this.sx - 2 * z * w0 * this.svx - c.sway.k * ax) * h;
      this.svz += (-w2 * this.sz - 2 * z * w0 * this.svz - c.sway.k * az) * h;
      this.sx += this.svx * h; this.sz += this.svz * h;
      const s = Math.hypot(this.sx, this.sz);
      if (s > c.sway.max) {
        const k = c.sway.max / s, nx = this.sx / s, nz = this.sz / s, out = this.svx * nx + this.svz * nz;
        this.sx *= k; this.sz *= k;
        if (out > 0) { this.svx -= out * nx; this.svz -= out * nz; }
      }
    }
    const px = hx + this.sx, pz = hz + this.sz;
    this.vx = (px - this.px) / h; this.vz = (pz - this.pz) / h; this.vy = (this.y - y0) / h;
    this.px = px; this.pz = pz;
    this.ride.vx = this.vx; this.ride.vz = this.vz;
    this.floor = this.live && !g.skis?.on;
    if (m.t >= m.T) {
      if (this.homing) this.move = this.planHome();
      else this.start(this.i + 1);
      // A set-down he stands on, or by: the pallet's thump.
      if (m.down && (this.riding || Math.hypot(g.player.x - px, g.player.z - pz) < 20)) audio.thud();
    }
  }

  // Character.step (through main.platformAt): the pallet's top under (x, z) for Stig when he could
  // stand on it (at most `ytop`), as carRoofAt's { top, car }; null for anyone else, or when it is no floor.
  platformAt(ch, x, z, ytop) {
    if (!this.floor || ch !== this.g.player) return null;
    const P = PALLET, m = 0.1;
    if (Math.abs(x - this.px) > P.hw + m || Math.abs(z - this.pz) > P.hd + m) return null;
    const top = this.y + P.top;
    if (top > ytop) return null;
    this.hit.top = top;
    return this.hit;
  }

  onSlab() {
    const p = this.g.player, s = CRANE.slab;
    return !!s && p.x > s.minX && p.x < s.maxX && p.z > s.minZ && p.z < s.maxZ && p.y > s.top - 0.3;
  }

  // Down beside P0 (a mission start with him up there).
  putDown() {
    const g = this.g, p = g.player, l = lm(this.cfg.putDown);
    p.teleport(l.x, l.z, l.yaw);
    g.cam.yaw = l.yaw;
    g.cam.snapNext = true;
    this.putDowns++;
  }

  pose(on) {
    const g = this.g, p = g.player;
    if (on && !this.posed && !g.dogs?.pose) { p.anim.placate = 2; this.posed = true; }
    else if (!on && this.posed) { if (p.anim.placate === 2) p.anim.placate = g.dogs?.pose || 0; this.posed = false; }
  }

  // main.onLand (not in water): a fall of thud.drop m or more off the pallet or the slab, neither a glide
  // nor a stomp, lands him on his belly with a thump. True when it did.
  onLand(v, y) {
    const f = this.fall, g = this.g, p = g.player, c = this.cfg.thud;
    if (!f) return false;
    this.fall = null;
    const drop = f.y0 - y;
    if (!this.live || drop < c.drop || f.glided || g.glide?.on || g.stomping || p.state !== 'normal') return false;
    p.flop(c.secs);
    audio.thud();
    audio.crash(0.3);
    g.cam.shake = Math.max(g.cam.shake || 0, c.shake);
    fx.dust(p.x, p.z, 14, y + 0.2);
    this.thudT = c.secs + c.lineAt;
    this.thuds++;
    this.last = { drop: +drop.toFixed(2), v: +v.toFixed(1), x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
    return true;
  }

  update(dt) {
    if (!this.ok) return;
    this.sync();
    const g = this.g, p = g.player, c = this.cfg;
    if (!this.live) {
      // A mission (no floor up there): Stig on the pallet or the slab is put down by P0.
      if (g.level === 'island' && !g.playerCar && (p.state === 'normal' || p.state === 'down') && (this.on || this.onSlab())) this.putDown();
      this.pose(false);
      this.on = null; this.fall = null; this.riding = false; this.thudT = null; this.viewSaid = false;
      return;
    }
    if (this.thudT != null) {
      this.thudT -= dt;
      if (this.thudT <= 0 && p.state === 'normal') { this.thudT = null; if (!g.inDialog) g.say(p, c.thud.line, 1.8); }
      else if (p.state !== 'normal' && p.state !== 'down') this.thudT = null;
    }
    const free = !g.playerCar && p.state === 'normal';
    const over = free && p.standingOn === this.ride;   // on the pallet, or in the air over it
    const where = !free || !p.onGround ? null : over ? 'pallet' : this.onSlab() ? 'slab' : null;
    // A fall starts where he leaves the floor he stood on; a glide during it is the glide's landing.
    if (free && !p.onGround && this.on && !this.fall) this.fall = { y0: this.onY, glided: false };
    if (this.fall && g.glide?.on) this.fall.glided = true;
    if (!free || p.onGround) this.fall = null;
    if (where) { this.on = where; this.onY = where === 'pallet' ? this.y + PALLET.top : CRANE.slab.top; }
    else if (!free || p.onGround) this.on = null;
    // The ride: from the pallet's lift with him on it until he is off it.
    const moving = !this.move.rest;
    if (over && moving && !this.riding) { this.riding = true; this.rides++; }
    else if (!over) this.riding = false;
    // High on it and moving: his arms out and the mantra, at once and every mantra.every s.
    const high = over && moving && this.y - groundAt(this.px, this.pz, this.y, 0) >= c.mantra.above;
    this.pose(high);
    if (high) {
      this.sayT -= dt;
      if (this.sayT <= 0 && !g.saying(p) && !g.inDialog) {
        g.say(p, S.mantraLine, c.mantra.secs);   // [F*] the exercise at Levander's clinic, relocated to the pallet
        this.mantras++;
        this.sayT = c.mantra.every;
      }
    } else this.sayT = 0;
    // On the slab by its north edge, over Angerud's plot across the road: his pitch, once a visit.
    if (where === 'slab' && !this.viewSaid && p.z < CRANE.slab.minZ + c.view.edge) {
      this.viewSaid = true;
      this.views++;
      hud.toast(c.view.line);
    }
    if (free && p.onGround && !where && p.y < CRANE.slab.top - 2) this.viewSaid = false;
  }

  // The meshes to the pose: the slewing top, the trolley, the cable from its sheaves to the hook block, the
  // pallet and its sling (the sling and the cable hidden with the camera's eye in or by the sling).
  sync() {
    const M = CRANE.meshes, C = CRANE;
    if (!M) return;
    const a = this.phi + Math.PI / 2;
    M.top.position.set(C.mast.x, C.mast.y, C.mast.z);
    M.top.rotation.y = a;
    M.trolley.position.set(this.hx, C.jibY, this.hz);
    M.trolley.rotation.y = a;
    M.load.position.set(this.px, this.y, this.pz);
    M.sling.position.copy(M.load.position);
    // The sling and the cable go with the camera's eye in or by the sling (`EYE` m round it: behind
    // him as he walks off the pallet the chains filled the picture).
    const e = this.g.cam?.cam?.position, P = PALLET;
    M.sling.visible = M.cable.visible = !e || Math.abs(e.x - this.px) > P.hw + EYE || Math.abs(e.z - this.pz) > P.hd + EYE
      || e.y < this.y + P.top - 0.5 || e.y > this.y + P.hook + 1.2;
    const by = this.y + PALLET.hook + 0.74;
    _d.set(this.hx - this.px, C.hookY - by, this.hz - this.pz);
    const len = _d.length();
    M.cable.position.set(this.px, by, this.pz);
    M.cable.quaternion.setFromUnitVectors(_up, _d.multiplyScalar(1 / Math.max(len, 1e-6)));
    M.cable.scale.set(1, Math.max(len, 0.01), 1);
  }

  // Tests: the cycle from the start of `name` (its pose taken from where the cycle has it then), the
  // pallet still under the hook.
  jump(name) {
    const i = CYCLE.indexOf(name);
    if (i < 0) return false;
    const s = this.spot, sp = i >= 3 && i <= 6 ? s.p1 : s.p0;
    this.phi = sp.phi; this.R = sp.R;
    this.y = [s.p0.y, s.p0.y, this.cfg.cruise, this.cfg.cruise, s.p1.y, s.p1.y, this.cfg.cruise, this.cfg.cruise][i];
    this.sx = this.sz = this.svx = this.svz = 0;
    this.homing = false;
    this.place();
    this.start(i);
    this.sync();
    return true;
  }
}
