// Balkongerna lever – the neighbours on the balconies (free roam; feature 77, DESIGN §10.42). The
// apartment hotels' balcony rows (world/town.js `balconyLots`, the 52 slabs) get residents: Swedish
// tourists who turn to Stig, wave and call down to him, a tourist holding a hand mirror out for the
// sea view (the porter's trick from room 107), and here and there a señora sweeping her balcony. A car
// Stig leaves with its wheels up on the sidewalk under a balcony gets a Swede's comment; at siesta his
// horn or a thing he smashes near a señora gets "¡Silencio! ¡Siesta!" and a slipper that comes down on
// his head (or his car's roof), and Stig says sorry to the balcony while the Swedes laugh. The slipper
// is harmless: no fling, no SKANDAL, no Guardia.
// Only on the island with no mission running (`missions.state === 'idle'`): a mission start or the
// other level takes every resident and slipper away at once, so no mission, timer or calibration pool
// sees any of it; they speak and react only outside a dialogue. They are placed by hand and never
// stepped (no gravity, no groundAt: the balcony is outside the slab's solid), never hit, kicked or
// flung (not in game.allChars), and draw from their own seed (the town's draws are untouched).
// Config: BALKONG (content/island.js). Owned by Game as `residents`: main.js calls `update` once a
// frame and hands it `onPropBroken` (every smashed prop); the horn is read from game.hornAt (§10.9).

import { BALKONG } from '../content/index.js';
import { THREE, camera, scene, GeoBuilder, toonMesh } from '../gfx.js';
import { Character } from '../actors/character.js';
import { randomPed } from '../actors/models.js';
import { balconyLots } from '../world/town.js';
import { groundAt } from '../world/collision.js';
import { audio } from '../audio.js';
import { dist, yawTo, dampAngle, mulberry32 } from '../util.js';

const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere();
const _t = new THREE.Vector3();
const APRONS = [0xf4f0e6, 0x9ac8e0, 0xe8d27a, 0xb8d8a8];

// Every body geometry of a model given up, but not its props' (the mirror's and the broom's are
// shared by every character holding one, models.js PROP_GEO).
function dispose(model) {
  const keep = new Set();
  for (const k in model.props) model.props[k].traverse((o) => keep.add(o));
  model.root.traverse((o) => { if (o.isMesh && !keep.has(o)) o.geometry.dispose(); });
}

// A pink terry slipper: origin under the middle of its sole, its toe to +z (one geometry for all).
let shoeGeo = null;
function shoeMesh(c) {
  if (!shoeGeo) {
    const g = new GeoBuilder();
    g.box(c.sole, 0, 0.02, 0, 0.13, 0.04, 0.32);
    g.sphere(c.color, 0, 0.06, 0.06, 0.15, 0.09, 0.2);
    g.box(c.color, 0, 0.05, -0.08, 0.13, 0.05, 0.14);
    g.sphere(c.pom, 0, 0.12, 0.1, 0.07);
    shoeGeo = g.build();
  }
  const m = toonMesh(shoeGeo, { outline: 0.012, cast: false });
  m.scale.setScalar(c.scale);   // a cartoon slipper: big enough to read against a slab 15 m up
  m.visible = false;
  scene.add(m);
  return m;
}

export class Residents {
  constructor(game, cfg = BALKONG) {
    this.g = game;
    this.cfg = cfg;
    this.recs = null;        // every occupied balcony: { i, lot, spot, role, seed, def, ch, waved, called }
    this.bodies = [];        // residents on their balconies (Characters, `res` = { rec, waveT, yellT, laughT, nextT })
    this.spare = [];         // bodies not in use (hidden)
    this.made = 0;           // bodies made so far (at most cfg.max)
    this.on = false;         // live last frame
    this.cutT = 0;           // s left in which bodies may come and go in view (after a cut)
    this.fx = 0; this.fz = 0;
    this.pickT = 0;
    this.want = [];          // the occupied balconies within r, nearest first (refreshed every pickEvery s)
    this.lineT = -Infinity;  // g.time of a resident's last line (a call down waits callEvery s after it)
    this.first = { call: true, sea: true };   // the session's first of each line always
    this.hornT = null;       // the last horn press handled (game.hornAt.t)
    this.carWas = null;      // his car last frame
    this.left = null;        // { car, t }: the car he just got out of
    this.parkT = -Infinity;
    this.queue = [];         // [{ at, fn }] (g.time)
    this.shoes = [];         // slippers out: { mesh, from, by, t, T, phase: 'fly' | 'fall' | 'rest', v, restT }
    this.shoePool = [];
    this.counts = { call: 0, sea: 0, park: 0, wave: 0, yell: 0, hit: 0, sorry: 0, laugh: 0 };
    this.last = null;        // for tests: the last event { kind, t, ... }
  }

  // On the island between missions (pedestrians about); they speak and react only outside a dialogue.
  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle' && !!g.levelDef.sim.peds; }
  get talk() { return this.live && !this.g.inDialog; }
  // Out on the balconies at these hours of the island's clock (§10.10); siesta at those.
  out(h = this.g.day.h) { const [a, b] = this.cfg.hours; return h >= a && h < b; }
  siesta(h = this.g.day.h) { const [a, b] = this.cfg.siesta; return h >= a && h < b; }
  // (x, z) on the street side of rec r's façade (its forecourt counts: up to `back` m behind the
  // balcony's line, under it; the back yards are 10 m and more behind it).
  ahead(r, x, z) { return (x - r.spot.x) * Math.sin(r.lot.yaw) + (z - r.spot.z) * Math.cos(r.lot.yaw) > -this.cfg.back; }
  near(r, x, z) { return dist(r.spot.x, r.spot.z, x, z); }

  // ---------------------------------------------------------------------------------------------
  // Who lives where

  // Per slab, from its own seed: perLot occupied balconies, the first a señora (at `senora`), the
  // second the mirror tourist (at `mirror`), the rest Swedes.
  build() {
    const c = this.cfg, recs = [];
    balconyLots.forEach((lot, li) => {
      const rnd = mulberry32(c.seed + li * 7919);
      const n = Math.min(lot.spots.length, c.perLot[0] + Math.floor(rnd() * (c.perLot[1] - c.perLot[0] + 1)));
      const idx = lot.spots.map((_, k) => k);
      for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; }
      const senora = rnd() < c.senora, mirror = rnd() < c.mirror;
      for (let k = 0; k < n; k++) {
        const role = k === 0 && senora ? 'senora' : k === 1 && mirror ? 'mirror' : 'sv';
        recs.push({ i: recs.length, lot, spot: lot.spots[idx[k]], role, seed: (rnd() * 2 ** 31) | 0, def: null, ch: null, waved: false, called: false });
      }
    });
    return recs;
  }
  // The look: a pedestrian's (models.randomPed) from the rec's seed, a local woman for a señora (her
  // broom and an apron, her hair up), a tourist otherwise; the mirror tourist with the porter's mirror
  // but none of his look (no moustache, no white shirt).
  def(r) {
    if (r.def) return r.def;
    const want = r.role === 'senora' ? (d) => d.local && d.lashes : (d) => !d.local;
    let d;
    for (let s = r.seed; ; s++) { d = randomPed(mulberry32(s)); if (want(d)) break; }
    delete d.held;
    if (r.role === 'senora') Object.assign(d, { held: 'broom', hair: 'bun', apron: APRONS[r.seed % APRONS.length], longSleeves: true });
    if (r.role === 'mirror') {
      d.held = 'mirror';
      delete d.mustache; delete d.stache;
      if (d.shirt === 0xf4f1e8 || d.shirt === 0xffffff) d.shirt = 0xf07a1e;
    }
    return (r.def = d);
  }

  // ---------------------------------------------------------------------------------------------
  // Bodies

  seen(x, y, z, r = 1.4) { return _frustum.intersectsSphere(_sphere.set(_sphere.center.set(x, y, z), r)); }
  mayPop(x, y, z, d) { return this.cutT > 0 || d > this.cfg.seenR || !this.seen(x, y, z); }
  popOk(r, f) { return this.mayPop(r.spot.x, r.spot.y + 1, r.spot.z, this.near(r, f.x, f.z)); }

  // A body in rec r's look: a spare one that wore it last, a new one while fewer than max are made, or
  // a spare one rebuilt (the old model's own geometries given up).
  body(r) {
    const d = this.def(r);
    const k = this.spare.findIndex((ch) => ch.def === d);
    if (k >= 0) return this.spare.splice(k, 1)[0];
    if (this.made < this.cfg.max) {
      this.made++;
      const ch = new Character(d, { x: r.spot.x, y: r.spot.y, z: r.spot.z, yaw: r.lot.yaw });
      ch.res = { rec: null, waveT: 0, yellT: 0, laughT: 0, nextT: 0 };
      scene.add(ch.root);
      return ch;
    }
    const ch = this.spare.pop();
    if (!ch) return null;
    const old = ch.model;
    ch.setDef(d);
    dispose(old);
    return ch;
  }
  place(ch, r) {
    ch.res.rec = r;
    ch.res.waveT = ch.res.yellT = ch.res.laughT = 0;
    r.ch = ch;
    ch.state = 'normal';
    ch.x = r.spot.x; ch.y = r.spot.y; ch.z = r.spot.z; ch.yaw = r.lot.yaw;
    ch.vx = ch.vz = ch.vy = 0;
    ch.onGround = true;
    for (const f of ['wave', 'yell', 'oath', 'laugh', 'talk']) ch.anim[f] = false;
    ch.anim.mirror = r.role === 'mirror';
    if (!this.bodies.includes(ch)) this.bodies.push(ch);
  }
  // Off the balcony, back to the spare bodies.
  put(ch) {
    const r = ch.res.rec;
    if (r && r.ch === ch) r.ch = null;
    ch.res.rec = null;
    this.g.unsay(ch);
    ch.state = 'hidden';
    ch.root.visible = false;
    const i = this.bodies.indexOf(ch);
    if (i >= 0) this.bodies.splice(i, 1);
    if (!this.spare.includes(ch)) this.spare.push(ch);
  }

  // The nearest occupied balconies within r get a body (one placed a frame); a body goes past out m,
  // or out of the clock's hours once unseen; a nearer balcony by `swap` m takes the furthest body
  // when there are no more.
  tickBodies(dt, f) {
    const c = this.cfg, out = this.out();
    for (const ch of this.bodies.slice()) {
      const r = ch.res.rec;
      if (this.near(r, f.x, f.z) > c.out || (!out && this.popOk(r, f))) this.put(ch);
    }
    if (!out) return;
    if ((this.pickT -= dt) <= 0 || this.cutT > 0) {
      this.pickT = c.pickEvery;
      this.want = this.recs.filter((r) => this.near(r, f.x, f.z) < c.r).sort((a, b) => this.near(a, f.x, f.z) - this.near(b, f.x, f.z));
    }
    let budget = 1;
    for (const r of this.want) {
      if (budget <= 0) break;
      if (r.ch || this.near(r, f.x, f.z) >= c.r || !this.popOk(r, f)) continue;
      if (!this.spare.length && this.made >= c.max) {
        const far = this.bodies.reduce((a, b) => (!a || this.near(b.res.rec, f.x, f.z) > this.near(a.res.rec, f.x, f.z) ? b : a), null);
        if (!far || this.near(far.res.rec, f.x, f.z) < this.near(r, f.x, f.z) + c.swap || !this.popOk(far.res.rec, f)) break;
        this.put(far);
      }
      const ch = this.body(r);
      if (!ch) break;
      budget--;
      this.place(ch, r);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The frame

  update(dt) {
    const g = this.g, c = this.cfg;
    if (!this.live) { this.reset(); return; }
    this.recs ??= this.build();
    const f = g.focus();
    // A cut (free roam again after a mission or a load, R, a warp): bodies come and go freely a moment.
    if (!this.on || dist(f.x, f.z, this.fx, this.fz) > 15) this.cutT = c.cutSecs;
    this.on = true;
    this.fx = f.x; this.fz = f.z;
    this.cutT -= dt;
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    this.tickBodies(dt, f);
    if (this.talk) {
      this.events();
      this.greet(f);
      for (let i = 0; i < this.queue.length; i++) {
        const q = this.queue[i];
        if (q.at > g.time) continue;
        this.queue.splice(i--, 1);
        q.fn();
      }
    } else {
      this.queue.length = 0;
      this.left = null;
      this.carWas = g.playerCar;
      this.hornT = g.hornAt?.t ?? null;
    }
    this.tickShoes(dt, f);
    this.pose(dt, f);
    for (const ch of this.bodies) ch.sync(dt);
  }

  // His horn (game.hornAt, a new press) and the car he has just left.
  events() {
    const g = this.g, c = this.cfg, h = g.hornAt;
    if (h && h.t !== this.hornT) {
      this.hornT = h.t;
      if (g.time - h.t < 0.5) this.noise(h.x, h.z, 'horn');
    }
    const car = g.playerCar;
    if (this.carWas && !car) this.left = { car: this.carWas, t: g.time };
    this.carWas = car;
    const l = this.left;
    if (!l) return;
    if (car || l.car.dead || g.time - l.t > 3) { this.left = null; return; }
    if (l.car.speed >= c.park.still) return;
    this.left = null;
    // Below the sisters on the balcony above 105 the line is Majsan's own (§10.55).
    if (g.sisters?.parks(l.car)) return;
    const wheels = g.lapp?.wheelsOn(l.car).n ?? 0;
    if (g.time - this.parkT < c.park.every || wheels < c.park.wheels) return;
    const ch = this.nearest(l.car.x, l.car.z, c.park.r, (r) => r.role === 'sv') || this.nearest(l.car.x, l.car.z, c.park.r, (r) => r.role === 'mirror');
    if (!ch) return;
    this.parkT = g.time;
    this.say(ch, c.park.line, 'park', { wheels });
  }

  // A smashed prop (main.js onPropBroken): his, if he is within mineR m of it (on foot or in his car).
  onPropBroken(p) {
    const g = this.g;
    if (!this.talk) return;
    const f = g.focus();
    if (dist(p.x, p.z, f.x, f.z) <= this.cfg.mineR) this.noise(p.x, p.z, 'smash', p.type);
  }

  // A noise at (x, z): the Swedes within hornR wave at a horn; at siesta the nearest señora within
  // siestaR m, with (x, z) in front of her balcony, scolds and throws.
  noise(x, z, kind, what = null) {
    const g = this.g, c = this.cfg;
    if (kind === 'horn') for (const ch of this.bodies) {
      const r = ch.res.rec;
      if (r.role === 'sv' && this.near(r, x, z) < c.hornR && this.ahead(r, x, z)) { ch.res.waveT = c.waveSecs; this.counts.wave++; }
    }
    if (!this.siesta()) return;
    let best = null, bd = c.siestaR;
    for (const ch of this.bodies) {
      const r = ch.res.rec, d = this.near(r, x, z);
      if (r.role === 'senora' && g.time >= ch.res.nextT && this.ahead(r, x, z) && d < bd) { bd = d; best = ch; }
    }
    if (!best) return;
    best.res.nextT = g.time + c.every;
    best.res.yellT = c.yellSecs;
    g.say(best, c.yell, c.yellSecs);
    this.lineT = g.time;
    this.counts.yell++;
    this.last = { kind: 'yell', why: kind, what, t: g.time, i: best.res.rec.i, d: +bd.toFixed(1) };
    this.queue.push({ at: g.time + c.throwAt, fn: () => this.throwShoe(best) });
  }

  // The nearest resident on a balcony within R m of (x, z), (x, z) in front of it, `ok(rec)`.
  nearest(x, z, R, ok = () => true) {
    let best = null, bd = R;
    for (const ch of this.bodies) {
      const r = ch.res.rec, d = this.near(r, x, z);
      if (d < bd && ok(r) && this.ahead(r, x, z)) { bd = d; best = ch; }
    }
    return best;
  }
  say(ch, text, kind, extra = {}) {
    const g = this.g;
    g.say(ch, text, 2.6);
    this.lineT = g.time;
    this.counts[kind]++;
    this.last = { kind, text, t: g.time, i: ch.res.rec.i, role: ch.res.rec.role, fl: ch.res.rec.spot.fl, ...extra };
  }

  // Stig coming by on the street side: the Swedes wave once an approach and one of them calls down;
  // the mirror tourist asks about the sea view. Again once he has been awayR m off; a call never within
  // callEvery s of another resident's line.
  greet(f) {
    const g = this.g, c = this.cfg;
    for (const ch of this.bodies) {
      const r = ch.res.rec, d = this.near(r, f.x, f.z);
      if (d > c.awayR) { r.waved = r.called = false; continue; }
      if (r.role === 'senora' || !this.ahead(r, f.x, f.z)) continue;
      if (r.role === 'sv' && !r.waved && d < c.waveR) { r.waved = true; ch.res.waveT = c.waveSecs; this.counts.wave++; }
      if (r.called || d >= c.callR || g.time - this.lineT < c.callEvery || g.saying(ch)) continue;
      r.called = true;
      const kind = r.role === 'mirror' ? 'sea' : 'call';
      if (!this.first[kind] && Math.random() >= c.callChance) continue;
      this.first[kind] = false;
      this.say(ch, c[kind], kind);
    }
  }

  // Poses: a wave, a laugh, the señora's broom up as she yells, the mirror held out; the mouth with a
  // line. The Swedes and the señora turn to Stig in front of their balcony (at most turnMax off it).
  pose(dt, f) {
    const g = this.g, c = this.cfg;
    for (const ch of this.bodies) {
      const r = ch.res.rec, s = ch.res, a = ch.anim;
      s.waveT = Math.max(0, s.waveT - dt);
      s.yellT = Math.max(0, s.yellT - dt);
      s.laughT = Math.max(0, s.laughT - dt);
      a.laugh = s.laughT > 0;
      a.wave = s.waveT > 0 && !a.laugh;
      a.yell = a.oath = s.yellT > 0;
      a.talk = !a.yell && g.saying(ch);
      a.mirror = r.role === 'mirror';
      let want = r.lot.yaw;
      if (r.role !== 'mirror' && this.near(r, f.x, f.z) < c.turnR && this.ahead(r, f.x, f.z)) {
        const off = yawTo(f.x - ch.x, f.z - ch.z) - r.lot.yaw;
        want += Math.max(-c.turnMax, Math.min(c.turnMax, Math.atan2(Math.sin(off), Math.cos(off))));
      }
      ch.yaw = dampAngle(ch.yaw, want, 3, dt);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The slipper

  // Where it comes down: his head on foot, the middle of his car's roof.
  target(out) {
    const g = this.g, car = g.playerCar, p = g.player;
    return car ? out.set(car.x, car.y + car.height, car.z) : out.set(p.x, p.y + p.height, p.z);
  }
  throwShoe(ch) {
    const g = this.g, c = this.cfg.shoe;
    if (ch.res.rec?.ch !== ch) return;   // put away meanwhile
    const fx = Math.sin(ch.yaw), fz = Math.cos(ch.yaw);
    const from = new THREE.Vector3(ch.x + fx * 0.45, ch.y + 1.45, ch.z + fz * 0.45);
    const s = { mesh: this.shoePool.pop() || shoeMesh(c), from, by: ch, t: 0, phase: 'fly', v: null, restT: 0 };
    s.T = c.secs + c.perM * from.distanceTo(this.target(_t));
    s.mesh.position.copy(from);
    s.mesh.rotation.set(0, ch.yaw, 0);
    s.mesh.visible = true;
    this.shoes.push(s);
    this.last = { kind: 'throw', t: g.time, i: ch.res.rec.i, T: +s.T.toFixed(2) };
  }
  // It flies on an arc to the target (homing: the end is where he is now, `up` m over the line at the
  // top), spinning end over end; at the end it hits, bounces off, falls and lies.
  tickShoes(dt, f) {
    const c = this.cfg.shoe;
    for (const s of this.shoes.slice()) {
      const m = s.mesh;
      if (s.phase === 'fly') {
        s.t += dt;
        const k = Math.min(1, s.t / s.T);
        this.target(_t);
        m.position.lerpVectors(s.from, _t, k);
        m.position.y += 4 * c.up * k * (1 - k);
        m.rotation.x += dt * 13;
        if (k >= 1) this.hit(s);
      } else if (s.phase === 'fall') {
        s.v.y -= c.g * dt;
        m.position.addScaledVector(s.v, dt);
        m.rotation.x += dt * 9;
        const gy = groundAt(m.position.x, m.position.z, m.position.y, 0.3);
        if (m.position.y <= gy && s.v.y < 0) {
          s.phase = 'rest';
          s.restT = c.rest;
          m.position.y = gy;
          m.rotation.set(0, m.rotation.y, Math.random() < 0.3 ? Math.PI : 0);
          if (m.rotation.z) m.position.y += 0.1;
        }
      } else {
        s.restT -= dt;
        const p = m.position, d = dist(p.x, p.z, f.x, f.z);
        if (d > this.cfg.out || (s.restT <= 0 && this.mayPop(p.x, p.y, p.z, d))) this.dropShoe(s);
      }
    }
  }
  hit(s) {
    const g = this.g, c = this.cfg, car = g.playerCar, p = g.player;
    const by = s.by, dx = s.mesh.position.x - by.x, dz = s.mesh.position.z - by.z, l = Math.hypot(dx, dz) || 1;
    let ox = dx / l, oz = dz / l;
    if (car) {   // off the roof to the side it came from, clear of the car
      const sx = Math.cos(car.yaw), sz = -Math.sin(car.yaw), side = sx * -ox + sz * -oz >= 0 ? 1 : -1;
      ox = sx * side; oz = sz * side;
      audio.thud();
    } else {
      audio.slap();
      p.model.squash = 0.5;
    }
    const [up, out] = c.shoe.bounce, k = car ? 1.5 : 1;
    s.phase = 'fall';
    s.v = new THREE.Vector3(ox * out * k + (Math.random() - 0.5) * 0.6, up, oz * out * k + (Math.random() - 0.5) * 0.6);
    this.counts.hit++;
    this.last = { kind: 'hit', t: g.time, car: !!car, i: by.res.rec?.i ?? null };
    for (const ch of this.bodies) {
      const r = ch.res.rec;
      if (r.role === 'sv' && this.near(r, s.mesh.position.x, s.mesh.position.z) < c.laughR) { ch.res.laughT = c.laughSecs; this.counts.laugh++; }
    }
    this.queue.push({ at: g.time + c.sorryAt, fn: () => {
      g.say(p, c.sorry, 1.6);
      this.counts.sorry++;
      this.last = { kind: 'sorry', t: g.time, text: c.sorry };
    } });
  }
  dropShoe(s) {
    s.mesh.visible = false;
    this.shoePool.push(s.mesh);
    const i = this.shoes.indexOf(s);
    if (i >= 0) this.shoes.splice(i, 1);
  }

  // Out of free roam (a mission starts, the other level): every resident and slipper gone.
  reset() {
    const g = this.g;
    this.queue.length = 0;
    this.left = null;
    this.carWas = g.playerCar;
    this.hornT = g.hornAt?.t ?? null;
    for (const s of this.shoes.slice()) this.dropShoe(s);
    if (!this.on) return;
    this.on = false;
    for (const ch of this.bodies.slice()) this.put(ch);
  }

  // For tests: the residents on their balconies.
  snapshot() {
    const f = this.g.focus();
    return this.bodies.map((ch) => {
      const r = ch.res.rec;
      return { i: r.i, role: r.role, lot: r.lot.id, fl: r.spot.fl, d: +this.near(r, f.x, f.z).toFixed(1), x: +ch.x.toFixed(2), y: +ch.y.toFixed(2), z: +ch.z.toFixed(2), visible: ch.root.visible, state: ch.state, held: ch.def.held || null };
    });
  }
}
