// Hyr en trampbåt (free roam; feature 120, DESIGN §10.57). The PATINES · TRAMPBÅTAR · 200 PTA/H sign by the
// pedal-boat rental on the beach (block (4,6)) takes E on the island with no mission running
// (`missions.state === 'idle'`), on foot, with the SKANDAL meter down: Stig pays 200 pesetas (Ole pays when
// the purse is short, game.pay), and after a short black fade he sits at the pedals of a pedal boat at the
// water's edge, Ole's double beside him, the samba playing. The boat is a car of the toy type `trampbat`
// (car.js: governed to 7 km/h for the player, low grip, gliding on, no engine, horn or skid), made for the
// ride and removed after it, so no mission ever sees it. It is the only thing that goes past the sea's
// bound wall (car.js skips the 'bound' walls for a `boat`), and it keeps to its own water: its middle in
// `sea`, from the water's edge out to z 352, held at the sea's level. Out past the buoy line Ole's Rio
// exchange, further out his statistics; the raft out there holds eight coins, the ride's price back.
// E steps Stig ashore only at the water's edge, and Ole pedals the boat back to the rental (gone once
// out of view); out at sea E gives a toast. R puts the boat back at the rental's water's edge. A pursuit,
// a mission start, the other level or a debug warp ends the ride with Stig on the sand and the boat and
// Ole gone; Stig on foot in the water past the bound wall (a forced exit at sea) is a splash and back on
// the sand. Nothing is saved. Config: TRAMPBAT (content/island.js). Owned by Game as `trampbat`: main.js
// calls `update` once a frame (after syncAll: the wobble goes on top of the boat's synced tilt), `step`
// after the cars' steps in fixedStep, `leave()` for E and `reset()` for R in the boat, `hint()` for the
// prompt, `camFocus(f)` for the camera, `end('warp')` from debugWarp and `onCoin(c)` from collectCoin.

import { TRAMPBAT } from '../content/index.js';
import { Car } from '../actors/car.js';
import { Character } from '../actors/character.js';
import { outfitDef } from '../actors/models.js';
import { placeCoin, removeCoin } from '../actors/pickups.js';
import { THREE, scene, camera } from '../gfx.js';
import { lm, BOUND } from '../world/layout.js';
import { audio } from '../audio.js';
import { pta } from '../strings.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { clamp, dist, yawTo, angleDiff } from '../util.js';

const TAG = 'trampbat';
const FLOAT = 0.15;   // the boat's base: CURB (its model's waterline is 0.02 over it, the sea's 0.17)
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere(), _v = new THREE.Vector3();

export class Trampbat {
  constructor(game, cfg = TRAMPBAT) {
    this.g = game;
    this.cfg = cfg;
    this.boat = null;        // the rented boat (a Car), while rented and on its way back
    this.ole = null;         // Ole's double (a Character of his look), seated beside Stig; built at the first ride
    this.ride = null;        // Stig in the boat: { t, said: Set (the line sets said this ride), maxZ, raft (its line said) }
    this.back = null;        // the boat on its way back with Ole: { t, off (backing off the beach first) }
    this.ev = [];            // the lines to come: [{ t (g.time), fn }]
    this.busy = false;       // the rental's fade
    this.gen = 0;            // bumped by end(): a rent whose fade outlives it stops there
    this.wakeT = 0;
    this.waveT = 0;          // s left of Ole's wave
    this.stash = [];         // the raft's coins out now: [{ i (its spot), c (placeCoin, tagged) }], only during a ride
    this.taken = new Set();  // the raft's spots taken this session
    // For tests: counters and the last event { t, kind: 'rent' (paid) | 'line' (key, who, text) | 'farOut' |
    // 'land' | 'home' (the boat back and gone) | 'reset' | 'ashore' (why) | 'wet' | 'coin' (left) | 'end' (why) }
    // and `log`, the last 40.
    this.rentals = 0; this.landings = 0; this.resets = 0; this.wets = 0; this.wakes = 0;
    this.last = null;
    this.log = [];
    const self = this;
    game.addInteractable({
      id: 'trampbat', r: cfg.r,
      get prompt() { return cfg.prompt.replace('{n}', pta(cfg.price)); },
      pos: () => lm(cfg.lm),
      enabled: () => self.canRent(),
      use: () => self.rent(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get coinsLeft() { return this.cfg.raft.coins - this.taken.size; }
  isBoat(c) { return !!c && c === this.boat; }
  mine() { const c = this.g.playerCar; return c && c === this.boat ? c : null; }
  note(kind, extra = {}) {
    this.last = { t: +this.g.time.toFixed(2), kind, ...extra };
    this.log.push(this.last);
    if (this.log.length > 40) this.log.shift();
  }

  // On foot at the sign, free: no scene, car, carry, pursuit or SKANDAL on the meter, bust, PANIK,
  // pool-fest ring, belt, talk, nap or other free-roam hold.
  canRent() {
    const g = this.g, p = g.player, sh = g.shame;
    return this.live && !this.busy && !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying
      && p.state === 'normal' && p.onGround && !sh.pursuit && !(sh.v > 0) && !(g.frozenT > 0) && !(sh.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active;
  }

  // ---------------------------------------------------------------------------------------------
  // E at the sign

  async rent() {
    if (!this.canRent()) return;
    const g = this.g, c = this.cfg, p = g.player, gen = this.gen;
    this.busy = true;
    const paid = g.coins >= c.price;
    g.pay(c.price);
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    p.anim.sprint = false;
    hud.fade(true);
    await g.wait(c.fadeSecs);
    if (!this.live || gen !== this.gen) { hud.fade(false); g.inDialog = false; this.busy = false; return; }
    this.clear();
    const L = lm(c.launch);
    const car = (this.boat = new Car('trampbat', { color: c.color }));
    car.place(L.x, L.z, L.yaw);
    car.invulnerable = true;
    g.addCar(car);
    g.seat(this.oleDouble(), car, -1);
    g.enterCar(car);
    g.cam.yaw = car.yaw;
    g.cam.snapNext = true;
    this.rentals++;
    this.ride = { t: 0, said: new Set(), maxZ: car.z, raft: false };
    this.back = null;
    this.waveT = 0;
    if (audio.tune !== c.tune) audio.setTune(c.tune);
    this.placeStash();
    this.note('rent', { paid });
    await g.wait(c.holdSecs);
    hud.fade(false);
    g.inDialog = false;
    this.busy = false;
    if (this.ride) this.lines('start', c.start);
  }

  // Ole's double in his look as it is now (never the real Ole: no giver, placement or chatter sees it).
  oleDouble() {
    const g = this.g, def = g.npc('ole')?.def ?? outfitDef('ole', null);
    let d = this.ole;
    if (!d) { d = this.ole = new Character(def); d.key = 'ole'; scene.add(d.root); }
    else if (d.def !== def) d.setDef(def);
    d.state = 'normal';
    d.root.visible = true;
    return d;
  }
  hideOle() {
    const d = this.ole;
    if (!d) return;
    this.g.unsay(d);
    const car = d.car;
    if (car) { car.passengers = car.passengers.filter((q) => q !== d); d.car = null; }
    d.root.scale.setScalar(1);
    scene.add(d.root);
    d.anim.wave = false;
    d.anim.pedal = 0;
    d.state = 'hidden';
    d.root.visible = false;
  }

  // A set of lines ([at, who, text]) from now on; in a ride, each set once.
  lines(key, list) {
    const r = this.ride;
    if (r?.said.has(key)) return;
    r?.said.add(key);
    list.forEach(([at, who, text], i) => this.on(at, () => this.say(key, who, text, key === 'rio' && i === 0)));
  }
  on(at, fn) { this.ev.push({ t: this.g.time + at, fn }); this.ev.sort((a, b) => a.t - b.t); }
  // Ole's lines only while his double is out; `wave`: he waves while he says it (his Rio line).
  say(key, who, text, wave = false) {
    const g = this.g, ch = who === 'stig' ? g.player : this.ole;
    if (!ch || ch.state === 'hidden' || g.inDialog) return;
    g.say(ch, text, 2.8);
    if (wave) this.waveT = this.cfg.rio.wave;
    this.note('line', { key, who, text });
  }
  // A line set still being said, or a bubble of theirs still up.
  talking() { const g = this.g; return this.ev.length > 0 || g.saying(g.player) || (!!this.ole && g.saying(this.ole)); }

  // ---------------------------------------------------------------------------------------------
  // Once a frame

  update(dt) {
    const g = this.g;
    if (!this.live) { if (this.boat || this.ride || this.ev.length) this.end(g.level === 'island' ? 'mission' : 'level'); return; }
    while (this.ev.length && this.ev[0].t <= g.time) this.ev.shift().fn();
    const car = this.boat;
    if (!car) return;
    const inIt = g.playerCar === car;
    // Out of it by someone else's exitCar(true) (only E at the water's edge is his own way out).
    if (this.ride && !inIt && !this.busy) { this.leftAtSea(); return; }
    if (inIt && g.shame.pursuit) { this.ashore('pursuit'); return; }
    if (inIt) this.tickRide(dt, car);
    else if (this.back && this.tickBack(dt, car)) return;
    this.waveT = Math.max(0, this.waveT - dt);
    const ole = this.ole;
    if (ole && ole.car === car) {
      ole.anim.talk = g.saying(ole);
      ole.anim.wave = this.waveT > 0 ? 'R' : false;   // the outer arm, past Stig
      ole.anim.pedal = clamp(Math.abs(car.forwardSpeed) / 1.4, 0, 1);
      ole.sync(dt);
    }
    if (inIt) g.player.anim.pedal = clamp(Math.abs(car.forwardSpeed) / 1.4, 0, 1);
    this.float(dt, car);
  }

  tickRide(dt, car) {
    const g = this.g, c = this.cfg, r = this.ride;
    r.t += dt;
    r.maxZ = Math.max(r.maxZ, car.z);
    if (g.inDialog) return;
    // Past the buoy line the Rio exchange, further out the statistics; one set at a time.
    if (!this.talking()) {
      if (car.z >= c.rio.z && !r.said.has('rio')) this.lines('rio', c.rio.lines);
      else if (car.z >= c.shark.z && !r.said.has('shark')) this.lines('shark', c.shark.lines);
      else if (this.coinsLeft && !r.raft && dist(car.x, car.z, c.raft.at[0], c.raft.at[1]) < c.raft.r) {
        r.raft = true;
        this.say('raft', c.raft.line[0], c.raft.line[1]);
      }
    }
  }

  // Ole pedals it back to the rental's water's edge; it goes once he and it are out of view (true).
  tickBack(dt, car) {
    const b = this.back, c = this.cfg;
    b.t += dt;
    if (b.t < c.back.minSecs || !this.unseen(car.x, 1, car.z, 2.5)) return false;
    this.clear();
    this.note('home');
    return true;
  }

  // The pilot that pedals the boat back (car.ai: main.fixedStep calls update(h, game)).
  pilot() {
    const L = lm(this.cfg.launch), near = this.cfg.back.near;
    return {
      update: (h, game) => {
        const car = this.boat;
        if (!car) return;
        const ct = car.ctrl, d = dist(car.x, car.z, L.x, L.z);
        ct.handbrake = false;
        if (d < near) { ct.throttle = ct.brake = ct.steer = 0; ct.park = true; return; }
        const e = angleDiff(car.yaw, yawTo(L.x - car.x, L.z - car.z));
        ct.park = false;
        // Nosed into the beach (where Stig stepped out): back off it first until the bow points the way
        // (within 0.5 rad) or it is 3.5 m out, swinging round (in reverse a steer turns it the other way).
        const b = this.back, z0 = this.cfg.sea.z0;
        if (b && b.off === undefined) b.off = car.z < z0 + 1.4 && Math.cos(car.yaw) < 0.2;
        if (b?.off && (Math.abs(e) < 0.5 || car.z > z0 + 3.5)) b.off = false;
        if (b?.off) { ct.throttle = 0; ct.brake = 1; ct.steer = clamp(e * 2, -1, 1); return; }
        // Positive steer turns right, which decreases yaw.
        ct.brake = 0;
        ct.steer = clamp(-e * 2, -1, 1);
        ct.throttle = Math.abs(e) > 1.3 ? 0.5 : Math.min(1, 0.35 + d * 0.15);
      },
    };
  }

  // The boat rocks on the water (on top of its synced tilt), the paddle wheel turns, its wake.
  float(dt, car) {
    const c = this.cfg, W = c.wobble, t = this.g.time, k = car.id * 1.7;
    if (car.root.visible) {
      const turn = car.steerAngle * car.forwardSpeed * 0.06;
      car.tilt.position.y += Math.sin(t * 2.1 + k) * W.bob;
      car.tilt.rotation.z += Math.sin(t * 1.3 + k) * W.roll + clamp(turn, -0.06, 0.06);
      car.tilt.rotation.x += Math.sin(t * 1.7 + k * 0.5) * W.pitch;
      car.paddle ??= car.decals.find((e) => e.userData.paddle) || null;
      if (car.paddle) car.paddle.rotation.x = car.wheelSpin * 0.9;
    }
    this.wakeT -= dt;
    if (this.wakeT > 0 || car.speed < 0.5) return;
    this.wakeT = c.wakeEvery;
    this.wakes++;
    const fx_ = Math.sin(car.yaw), fz = Math.cos(car.yaw), x = car.x - fx_ * 1.45, z = car.z - fz * 1.45;
    for (let n = 0; n < 2; n++) {
      fx.spawn(x + (Math.random() - 0.5) * 0.6, 0.3, z + (Math.random() - 0.5) * 0.6, n ? 0xf4f8f6 : 0xd8ecf2, { vx: -car.vx * 0.4 + (Math.random() - 0.5) * 0.8, vz: -car.vz * 0.4 + (Math.random() - 0.5) * 0.8, vy: 1.2 + Math.random() * 1.0, s0: 0.16, s1: 0.05, life: 0.5, drag: 1.2, grav: 9 });
    }
  }

  // main.fixedStep, after the cars' steps: the boat on the sea's level, its middle in its water (a soft
  // wall at every edge: the beach, the far sea, both ends).
  step(h) {
    const car = this.boat;
    if (!car) return;
    const S = this.cfg.sea;
    car.y = FLOAT; car.vy = 0; car.air = false; car.airFrom = null;
    if (car.z < S.z0) { car.z = S.z0; if (car.vz < 0) car.vz *= -0.15; }
    if (car.z > S.z1) { car.z = S.z1; if (car.vz > 0) car.vz *= -0.15; }
    if (car.x < S.x0) { car.x = S.x0; if (car.vx < 0) car.vx *= -0.15; }
    if (car.x > S.x1) { car.x = S.x1; if (car.vx > 0) car.vx *= -0.15; }
    car.updateObb();
  }

  // ---------------------------------------------------------------------------------------------
  // Getting out, R, the end

  atShore(car = this.boat) { return !!car && car.z <= this.cfg.shoreZ; }
  // The prompt in the boat at the water's edge.
  hint() { return this.mine() && !this.busy && !this.g.inDialog && this.atShore() ? this.cfg.landPrompt : null; }
  // The camera rides with no pull-in in the boat (its sight line crosses the bound wall).
  camFocus(f) { return this.mine() ? { ...f, noPull: true } : f; }

  // E in the boat: ashore at the water's edge, else the toast. True when it was the boat.
  leave() {
    const g = this.g, c = this.cfg, car = this.mine();
    if (!car) return false;
    if (this.busy) return true;
    if (!this.atShore(car)) { hud.toast(c.farOut); this.note('farOut'); return true; }
    this.putOut(car);
    this.landings++;
    this.note('land');
    // Ole pedals it back.
    this.endRide();
    this.back = { t: 0 };
    car.noEnter = true;
    car.ai = this.pilot();
    this.lines('land', c.land);
    return true;
  }

  // Stig out of the boat onto the sand in front of it, facing inland (the camera behind him).
  putOut(car) {
    const g = this.g, p = g.player, x = this.sandX(car.x);
    g.exitCar(true);
    p.state = 'normal';
    p.teleport(x, this.cfg.landZ, Math.PI);
    p.wishX = p.wishZ = p.vx = p.vz = p.vy = 0;
    p.anim.pedal = 0;
    g.cam.yaw = Math.PI;
    g.cam.snapNext = true;
  }
  // A free spot on the sand nearest x.
  sandX(x0) {
    const g = this.g, z = this.cfg.landZ, B = BOUND - 6;
    for (let k = 0; k < 12; k++) {
      const x = clamp(x0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.2, -B, B);
      if (g.spotFree(x, z)) return x;
    }
    return clamp(x0, -B, B);
  }

  // R in the boat: the boat back at the rental's water's edge, Stig still in it.
  reset() {
    const g = this.g, c = this.cfg, car = this.mine();
    if (!car) return false;
    const L = lm(c.launch);
    car.place(L.x, L.z, L.yaw);
    g.cam.yaw = L.yaw;
    g.cam.snapNext = true;
    hud.toast(c.reset);
    this.resets++;
    this.note('reset');
    return true;
  }

  // Stig ashore at once (a pursuit, a mission start, a warp, the boat put on land): on the sand nearest
  // the boat, the boat and Ole gone.
  ashore(why) {
    const car = this.mine();
    if (car) this.putOut(car);
    this.note('ashore', { why });
    this.endRide();
    this.clear();
  }

  // Put out of the boat by someone else at sea: if he stands in the water past the bound wall, a splash
  // and back on the sand.
  leftAtSea() {
    if (this.inSea()) this.wet();
    this.endRide();
    this.clear();
  }
  // Stig on foot in the water out past the bound wall (where nobody walks to).
  inSea() {
    const g = this.g, p = g.player;
    return g.level === 'island' && !g.playerCar && p.state !== 'hidden' && p.state !== 'seated' && p.z > BOUND - 0.5 && p.z < BOUND + 80 && Math.abs(p.x) < BOUND + 20;
  }
  wet() {
    const g = this.g, p = g.player;
    g.waterSplash(p.x, p.z, 8);
    p.state = 'normal';
    p.teleport(this.sandX(p.x), this.cfg.landZ, Math.PI);
    p.wishX = p.wishZ = p.vx = p.vz = p.vy = 0;
    g.cam.yaw = Math.PI;
    g.cam.snapNext = true;
    g.say(p, this.cfg.wet, 2.2);
    this.wets++;
    this.note('wet');
  }

  // The ride is over (Stig out): the music back, his legs still, the ride's lines to come dropped, the
  // raft's coins not taken away again.
  endRide() {
    const g = this.g, c = this.cfg;
    g.player.anim.pedal = 0;
    this.ev = [];
    this.removeStash();
    if (this.ride && audio.tune === c.tune && g.levelTune() !== c.tune) audio.setTune(g.levelTune());
    this.ride = null;
  }

  // Out of free roam (a mission start, the other level) or a debug warp: everything away at once.
  end(why) {
    const g = this.g;
    this.gen++;
    if (this.mine()) {
      if (g.level === 'island') this.ashore(why);
      else { g.exitCar(true); this.endRide(); this.clear(); }
    } else {
      if (this.ride && this.inSea()) this.wet();
      this.endRide();
      this.clear();
    }
    this.ev = [];
    this.note('end', { why });
  }

  // The boat and Ole gone (removed; Ole hidden), no ride.
  clear() {
    const g = this.g, car = this.boat;
    this.hideOle();
    if (car) {
      if (g.playerCar === car) g.exitCar(true);
      car.ai = null;
      g.removeCar(car);
    }
    this.boat = null;
    this.ride = null;
    this.back = null;
    this.waveT = 0;
  }

  // The raft's coins, only while a boat is out (the island's fixed coins stay within their 260 outside a
  // ride, §10.2): those of its spots (a ring) not taken this session.
  placeStash() {
    const R = this.cfg.raft;
    this.removeStash();
    for (let i = 0; i < R.coins; i++) {
      if (this.taken.has(i)) continue;
      const a = (i / R.coins) * Math.PI * 2;
      const c = placeCoin(R.at[0] + Math.sin(a) * R.ring, R.y, R.at[1] + Math.cos(a) * R.ring, TAG);
      if (c) this.stash.push({ i, c });
    }
  }
  removeStash() {
    for (const { c } of this.stash) if (c.tag === TAG) removeCoin(c);
    this.stash = [];
  }

  // A coin taken (game.collectCoin): the raft's last one gives Ole's line.
  onCoin(c) {
    const s = c.tag === TAG && this.stash.find((e) => e.c === c);
    if (!s) return;
    this.stash = this.stash.filter((e) => e !== s);
    this.taken.add(s.i);
    this.note('coin', { left: this.coinsLeft });
    if (!this.coinsLeft && this.ride && !this.back) {
      const d = this.cfg.raft.done;
      this.on(0.4, () => this.say('raftDone', d[0], d[1]));
    }
  }

  // Nobody sees (x, y, z) within r: off the camera's view or `popR` m off.
  unseen(x, y, z, r = 1.4) {
    _v.set(x, y, z);
    if (camera.position.distanceTo(_v) > this.cfg.back.popR) return true;
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_pm);
    return !_frustum.intersectsSphere(_sphere.set(_v, r));
  }
}
