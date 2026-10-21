// Liv på torget – siesta och paseo (free roam; feature 135, DESIGN §10.62). The centre keeps people
// between missions: vendors before their stalls in the market (block (2,1)), old men and women on the
// plaza's benches and the fountain's rim (block (2,3)) and locals on Templo Ecuménico's square (block
// (3,1)). The island's clock (§10.10) gives the town a rhythm: the market is open in the morning and the
// late afternoon; at the siesta and at night its stalls (all but stall K and the souvenir stand) get a
// cloth cover rolled down before the counter, every third with a SIESTA or CERRADO · STÄNGT board, and at
// the siesta two vendors doze on a crate before their stall while the rest are gone; the souvenir seller
// is always open, and after julafton holds up a plastic giraffe to Stig, who holds up his own. In the
// sunset the plaza has its paseo: locals walking in pairs round the fountain, the bench sitters muttering
// "Suecos…" after Stig. The church's bells ring the town's turns (13, 17, 19) with a toast in the centre.
// Vendors call to Stig on foot, the church's locals greet him. Everyone can be kicked over or run over
// like a pedestrian; a sitter is knocked off his seat (a kick, a car, his bench smashed), gets up and sits
// down again. A body comes or goes only unseen (or just after a cut). Only on the island with no mission
// running (`missions.state === 'idle'`): a mission start or the other level takes every body, cover and
// crate away at once, so no mission, stage, timer or calibration pool sees any of it. Nothing is saved.
// Config TORG (content/island.js). Owned by Game as `torg`: main.js calls `update` once a frame and `step`
// in its fixed step, counts `extras` as people (allChars, areaHit), hands it a kick (`kick`) and a broken
// prop (`onPropBroken`), and asks `posed(key)` (the souvenir seller in the giraffe's exchange).

import { TORG } from '../content/index.js';
import { THREE, camera, scene, GeoBuilder, toonMesh, signMesh } from '../gfx.js';
import { Character } from '../actors/character.js';
import { randomPed } from '../actors/models.js';
import { propsOfType, spawnDebris } from '../world/props.js';
import { circleVsObb } from '../world/collision.js';
import { blockCentre } from '../world/landmarks-island.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { hourIn } from './soundscape.js';
import { dist, yawTo, dampAngle, angleDiff, mulberry32, pick } from '../util.js';

const CURB = 0.15;
const APRONS = [0xf4f0e6, 0xe8d8b0, 0x9ac8e0, 0xf4f4f0];
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere(), _v = new THREE.Vector3();
const _hit = {};
const wrapH = (h) => ((h % 24) + 24) % 24;

// A cover's cloth in its own frame: the top edge's middle at the origin, hanging down `h` m, +z out (the
// stall's facing); broad stripes of a and b, a roll at the top and a darker hem.
function clothGeo(w, h, a, b) {
  const g = new GeoBuilder(), n = 8;
  for (let k = 0; k < n; k++) g.box(k % 2 ? b : a, -w / 2 + (k + 0.5) * (w / n), -h / 2, 0, w / n, h, 0.03);
  g.box(0x6a5a48, 0, -h + 0.04, 0.005, w, 0.08, 0.04);
  g.cyl(a, 0, -0.02, 0.02, 0.07, w + 0.06, 8, 0, 0, Math.PI / 2);
  return g.build();
}

function crateMesh(c) {
  const g = new GeoBuilder();
  g.boxB(c.color, 0, 0, 0, c.w, c.h, c.d);
  for (const y of [0.1, 0.24, 0.38]) for (const s of [-1, 1]) g.box(c.slat, 0, y * (c.h / 0.42), s * (c.d / 2 + 0.005), c.w + 0.01, 0.05, 0.01);
  for (const s of [-1, 1]) g.box(c.slat, s * (c.w / 2 + 0.005), c.h / 2, 0, 0.01, c.h, c.d * 0.4);
  const m = toonMesh(g.build(), { outline: 0.012, cast: false });
  m.visible = false;
  scene.add(m);
  return m;
}

export class Torgliv {
  constructor(game, cfg = TORG) {
    this.g = game;
    this.cfg = cfg;
    this.recs = null;        // every place someone can be: { i, kind, group, x, z, yaw, seat?, crate?, call, dozes, R, th0, ch, as, … }
    this.shown = [];         // the recs with a body out now
    this.extras = [];        // their bodies (main.js counts them as people: the seated ones are skipped there by state)
    this.covers = null;      // the market's cloth covers: [{ i, mesh, sign, prop, k, want, delay }]
    this.on = false;         // live last frame
    this.everOn = false;
    this.cutT = 0;           // s left in which bodies may come and go in view (after a cut)
    this.fx = 0; this.fz = 0;
    this.lineT = { market: -Infinity, suecos: -Infinity, greet: -Infinity };
    this.first = { market: true, suecos: true };
    this.gir = null;         // the giraffe's exchange under way: { t, stig }
    this.girT = -Infinity;   // g.time of its last start
    this.girArmed = true;    // Stig has been away since (giraffe.awayR)
    this.lastH = null;       // the clock's hour last frame (the bells' turns)
    this.lastSiesta = null;  // the cover boards' state last frame
    this.counts = { call: 0, suecos: 0, greet: 0, giraffe: 0, bells: 0, knock: 0, sit: 0, crate: 0, show: 0, put: 0 };
    this.last = null;        // tests: the last event { kind, t, … }
    this.log = [];           // tests: [{ kind, t, … }]
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle' && !!g.levelDef.sim.peds; }
  get talk() { const g = this.g; return this.live && !g.inDialog && !g.chat.busy && !g.day.busy; }
  open(h = this.g.day.h) { return this.cfg.market.open.some((w) => hourIn(h, w)); }
  siesta(h = this.g.day.h) { return hourIn(h, this.cfg.market.siesta); }
  paseo(h = this.g.day.h) { return hourIn(h, this.cfg.paseoHours); }
  posed(key) { return key === 'souvenir' && !!this.gir; }
  note(kind, o = {}) { this.last = { kind, t: +this.g.time.toFixed(2), ...o }; this.log.push(this.last); if (this.log.length > 80) this.log.shift(); }

  // ---------------------------------------------------------------------------------------------
  // The places (built on the first live frame: the benches are props)

  build() {
    const c = this.cfg, recs = [];
    this.M = blockCentre(c.market.b[0], c.market.b[1]);
    this.P = blockCentre(c.plaza.b[0], c.plaza.b[1]);
    this.K = blockCentre(c.kyrka.b[0], c.kyrka.b[1]);
    const add = (o) => { const r = { i: recs.length, ch: null, as: null, def: null, visit: false, stale: false, stuckT: 0, call: null, dozes: false, ...o }; recs.push(r); return r; };
    for (const v of c.vendors) {
      const [lx, lz, yaw] = v.at, x = this.M.x + lx, z = this.M.z + lz;
      const r = add({ kind: 'vendor', group: 'market', x, z, yaw, call: v.call ?? null, dozes: !!v.dozes });
      if (r.dozes) {
        const fx = Math.sin(yaw), fz = Math.cos(yaw);
        r.seat = { prop: null, x, z, y: CURB + c.crate.h + c.crateY, yaw, front: { x: x + fx * c.frontOut, z: z + fz * c.frontOut } };
        r.crate = { mesh: crateMesh(c.crate), x, z, dead: false };
        r.crate.mesh.position.set(x, CURB, z);
        r.crate.mesh.rotation.y = yaw;
      }
    }
    const seat = (B, s, group) => {
      const st = s.rim != null ? this.rimSeat(B, s.rim) : this.benchSeat(B, s.bench, s.u);
      if (st) add({ kind: 'seat', group, x: st.x, z: st.z, yaw: st.yaw, seat: st });
    };
    for (const s of c.plazaSeats) seat(this.P, s, 'plaza');
    for (const s of c.kyrkaSeats) seat(this.K, s, 'kyrka');
    const [a, b] = c.kyrkaStand.map(([lx, lz]) => ({ x: this.K.x + lx, z: this.K.z + lz }));
    add({ kind: 'stand', group: 'kyrka', x: a.x, z: a.z, yaw: yawTo(b.x - a.x, b.z - a.z), pair: 0 });
    add({ kind: 'stand', group: 'kyrka', x: b.x, z: b.z, yaw: yawTo(a.x - b.x, a.z - b.z), pair: 1 });
    const pz = c.paseo;
    for (let j = 0; j < pz.walkers; j++) add({ kind: 'walker', group: 'plaza', x: this.P.x, z: this.P.z, yaw: 0, R: pz.radii[j & 1], th0: (j >> 1) * (Math.PI / 2) + 0.4, pair: j & 1 });
    this.recs = recs;
  }
  // A bench's seat `u` m along it (its local +x), `fwd` m forward of its middle, the cushion `ry` m up.
  benchSeat(B, [lx, lz], u) {
    const c = this.cfg, p = propsOfType('bank', { x: B.x + lx, z: B.z + lz, r: 0.4 })[0];
    if (!p) return null;
    const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
    const x = p.x + cy * u + sy * c.fwd, z = p.z - sy * u + cy * c.fwd;
    return { prop: p, x, z, y: (p.baseY ?? CURB) + c.ry, yaw: p.yaw, front: { x: x + sy * c.frontOut, z: z + cy * c.frontOut } };
  }
  // The fountain rim's side k (as centre.js builds the octagon), `rimR` m out, facing out.
  rimSeat(B, k) {
    const c = this.cfg, a = (k / 8) * Math.PI * 2 + Math.PI / 8, ox = Math.cos(a), oz = Math.sin(a);
    const x = B.x + ox * c.rimR, z = B.z + oz * c.rimR;
    return { prop: null, x, z, y: c.rimY, yaw: yawTo(ox, oz), front: { x: x + ox * c.frontOut, z: z + oz * c.frontOut } };
  }

  // What the place holds now: 'stand' | 'sit' | 'doze' | 'walk' | null.
  mode(r, h) {
    const c = this.cfg;
    if (r.kind === 'vendor') return this.open(h) ? 'stand' : r.dozes && this.siesta(h) ? 'doze' : null;
    if (r.kind === 'seat') return hourIn(h, r.group === 'kyrka' ? c.kyrkaHours : c.benchHours) && (!r.seat.prop || r.seat.prop.alive) ? 'sit' : null;
    if (r.kind === 'stand') return hourIn(h, c.kyrkaHours) ? 'stand' : null;
    return this.paseo(h) ? 'walk' : null;
  }
  // Where a body in mode m appears: { x, y, z, yaw }.
  spotOf(r, m) {
    if (m === 'sit' || m === 'doze') return r.seat;
    if (m === 'walk') {
      const th = r.th0 + this.cfg.paseo.omega * this.g.time, P = this.P;
      return { x: P.x + Math.cos(th) * r.R, y: CURB, z: P.z + Math.sin(th) * r.R, yaw: yawTo(-Math.sin(th), Math.cos(th)) };
    }
    return { x: r.x, y: CURB, z: r.z, yaw: r.yaw };
  }

  // ---------------------------------------------------------------------------------------------
  // Bodies

  look(r) {
    const c = this.cfg;
    let d;
    for (let s = c.seed + r.i * 7919; ; s++) { d = randomPed(mulberry32(s)); if (d.local) break; }
    delete d.held;
    const rnd = mulberry32(c.seed * 3 + r.i * 101), woman = !!d.lashes;
    if (r.kind === 'vendor') {
      if (woman || rnd() < 0.4) d.apron = APRONS[r.i % APRONS.length];
    } else if (r.kind === 'walker') {
      if (!woman && rnd() < 0.55) d.hat = 'sunhat';
      if (!woman && rnd() < 0.5) d.vest = 0x1d1426;
    } else {
      // The old: grey or white hair, a straw hat on some of the men, the women's sleeves long.
      d.hairC = rnd() < 0.5 ? 0x9a9a9a : 0xd4d0c8;
      if (d.mustache) d.mustache = d.hairC;
      if (!woman && rnd() < 0.45) d.hat = 'sunhat';
      if (woman) d.longSleeves = true;
    }
    return d;
  }
  make(r) {
    const ch = new Character((r.def ??= this.look(r)), { x: r.x, z: r.z, yaw: r.yaw });
    ch.torg = r;
    ch.state = 'hidden';
    ch.root.visible = false;
    scene.add(ch.root);
    return ch;
  }

  seen(x, y, z, rad = 1.4) { return _frustum.intersectsSphere(_sphere.set(_sphere.center.set(x, y, z), rad)); }
  popOk(x, y, z) { return this.cutT > 0 || camera.position.distanceTo(_v.set(x, y, z)) > this.cfg.popR || !this.seen(x, y, z); }

  show(r, m, at) {
    const ch = (r.ch ??= this.make(r));
    r.as = m; r.stale = false; r.stuckT = 0;
    ch.anim.slump = ch.anim.talk = false;
    ch.vx = ch.vz = ch.vy = 0;
    ch.wishX = ch.wishZ = 0;
    if (m === 'sit' || m === 'doze') this.sit(r);
    else ch.standAt(at.x, at.z, at.yaw);
    ch.root.visible = true;
    if (!this.shown.includes(r)) { this.shown.push(r); this.extras.push(ch); }
    this.counts.show++;
  }
  sit(r) {
    const ch = r.ch, s = r.seat;
    if (r.crate) { r.crate.dead = false; r.crate.mesh.visible = true; }
    ch.seatAt({ x: s.x, y: s.y, z: s.z, yaw: s.yaw });
    ch.anim.slump = r.as === 'doze';   // dozing on his crate: head down, arms hanging
  }
  put(r) {
    const ch = r.ch;
    this.g.unsay(ch);
    ch.anim.slump = ch.anim.talk = false;
    ch.anim.planeSeat = false;
    ch.seatPose = null;
    ch.state = 'hidden';
    ch.root.visible = false;
    ch.wishX = ch.wishZ = ch.vx = ch.vz = 0;
    r.as = null;
    if (r.crate) r.crate.mesh.visible = false;
    const i = this.shown.indexOf(r);
    if (i >= 0) { this.shown.splice(i, 1); this.extras.splice(this.extras.indexOf(ch), 1); }
    this.counts.put++;
  }

  tickBodies(f, h) {
    const c = this.cfg;
    let budget = c.budget;
    for (const r of this.recs) {
      const m = this.mode(r, h), d = dist(r.x, r.z, f.x, f.z);
      if (r.as) {
        const ch = r.ch;
        if (d > c.out && dist(ch.x, ch.z, f.x, f.z) > c.out) { this.put(r); continue; }
        if ((m !== r.as || r.stale) && ch.state !== 'flung' && this.popOk(ch.x, ch.y + 1, ch.z)) this.put(r);
        continue;
      }
      if (!m || d >= c.r || budget <= 0) continue;
      const at = this.spotOf(r, m);
      if (!this.popOk(at.x, at.y + 1, at.z)) continue;
      if (dist(at.x, at.z, f.x, f.z) < 1.2) continue;   // never on top of Stig
      budget--;
      this.show(r, m, at);
    }
  }

  // main.js fixedStep: the standing walk back to their spots, the knocked back to their seats, the paseo
  // round the fountain; cars knock sitters off their seats; Stig is kept out of the sitters.
  step(h) {
    if (!this.on) return;
    const g = this.g;
    for (const r of this.shown) {
      const ch = r.ch;
      if (ch.state === 'seated' || ch.state === 'hidden') continue;
      if (ch.state === 'normal') this.steer(r, ch); else ch.wishX = ch.wishZ = 0;
      ch.step(h, g);
    }
    this.carsVsSeated();
    this.keepOut();
  }
  steer(r, ch) {
    const c = this.cfg;
    if (r.as === 'walk') {
      // Along the circle (its tangent, θ growing) with a pull back onto its radius; far off it (a knock),
      // straight back to it at `catchUp`.
      const P = this.P, ox = ch.x - P.x, oz = ch.z - P.z, d = Math.hypot(ox, oz) || 1, ux = ox / d, uz = oz / d, e = r.R - d;
      if (Math.abs(e) > c.paseo.back) { ch.wishX = ux * Math.sign(e) * c.paseo.catchUp; ch.wishZ = uz * Math.sign(e) * c.paseo.catchUp; return; }
      const v = c.paseo.omega * r.R, k = Math.max(-1, Math.min(1, e * c.paseo.pull));
      ch.wishX = -uz * v + ux * k; ch.wishZ = ux * v + uz * k;
      return;
    }
    if (r.stale) { ch.wishX = ch.wishZ = 0; return; }
    const to = r.as === 'stand' ? r : r.seat.front;
    const dx = to.x - ch.x, dz = to.z - ch.z, d = Math.hypot(dx, dz);
    if (r.as !== 'stand' && d < 0.3) { this.resit(r); return; }
    const sp = d > 0.12 ? Math.min(c.walk, 0.4 + d * 1.6) : 0;
    ch.wishX = sp ? (dx / d) * sp : 0; ch.wishZ = sp ? (dz / d) * sp : 0;
  }
  // Back on his seat after a fall; with the bench smashed or the crate gone he stands, put away unseen.
  resit(r) {
    const ok = r.as === 'sit' ? !r.seat.prop || r.seat.prop.alive : !r.crate?.dead;
    if (!ok) { r.stale = true; r.ch.wishX = r.ch.wishZ = 0; return; }
    this.sit(r);
    this.counts.sit++;
    this.note('sit', { i: r.i });
  }

  // Off the seat and flung: a kick, a car, his bench smashed.
  knock(r, vx, vy, vz, why) {
    const ch = r.ch;
    ch.anim.slump = false;
    ch.standAt(ch.x, ch.z, ch.yaw);
    ch.fling(vx, vy, vz);
    this.counts.knock++;
    this.note('knock', { i: r.i, why, rec: r.kind });
  }
  // A kick (main.js areaHit, after its people): sitters within it are knocked off (SKANDAL as a
  // pedestrian's, the local bark). Returns whether anyone was.
  kick(x, z, y, rad, dx, dz) {
    if (!this.on) return false;
    const g = this.g;
    let bowled = false;
    for (const r of this.shown.slice()) {
      const ch = r.ch;
      if (ch.state !== 'seated' || Math.abs(ch.y - y) > 1.6 || dist(ch.x, ch.z, x, z) > rad + 0.4) continue;
      this.knock(r, dx * 6 + (ch.x - x) * 2, 4.5, dz * 6 + (ch.z - z) * 2, 'kick');
      g.shame.add(9);
      audio.ouch();
      g.say(ch, g.bark(ch, 'ouch'), 1.5);
      bowled = true;
    }
    return bowled;
  }
  // A smashed bench throws its sitters off (no SKANDAL beyond the bench's own, as a sun lounger's).
  onPropBroken(p, vx = 0, vz = 0) {
    if (!this.on || p.type !== 'bank') return;
    const g = this.g;
    for (const r of this.shown.slice()) {
      if (r.seat?.prop !== p || r.ch.state !== 'seated') continue;
      const ch = r.ch;
      this.knock(r, vx * 0.35 + Math.sin(ch.yaw) * 2, 3.2, vz * 0.35 + Math.cos(ch.yaw) * 2, 'bench');
      audio.ouch();
      g.say(ch, g.bark(ch, 'ouch'), 1.5);
    }
  }
  carsVsSeated() {
    const g = this.g;
    for (const r of this.shown) {
      const ch = r.ch, cr = r.crate;
      if (ch.state !== 'seated' && !(cr && cr.mesh.visible)) continue;
      for (const car of g.cars) {
        if (car.speed < 0.5 || Math.abs(car.x - ch.x) > car.radius + 1 || Math.abs(car.z - ch.z) > car.radius + 1) continue;
        if (cr && cr.mesh.visible && car.speed > 3 && circleVsObb(cr.x, cr.z, 0.32, car.obb, _hit)) this.smashCrate(r, car);
        if (ch.state !== 'seated' || ch.y > car.y + car.height - 0.3 || !circleVsObb(ch.x, ch.z, 0.4, car.obb, _hit)) continue;
        const closing = car.vx * _hit.nx + car.vz * _hit.nz;
        if (closing > 4.5) {
          const sp = car.speed;
          this.knock(r, car.vx * 1.05 + _hit.nx * 3, 4.5 + sp * 0.22, car.vz * 1.05 + _hit.nz * 3, 'car');
          car.vx *= 0.94; car.vz *= 0.94;
          g.onCharHit(ch, car, closing);
        } else if (closing > 0.5) {
          // Slowly into him: he gets up out of the way (then main.js pushes him as anyone standing).
          ch.anim.slump = false;
          ch.standAt(ch.x + _hit.nx * (_hit.depth + 0.1), ch.z + _hit.nz * (_hit.depth + 0.1), ch.yaw);
          this.note('up', { i: r.i, why: 'car' });
        }
      }
    }
  }
  smashCrate(r, car) {
    const cr = r.crate;
    cr.dead = true;
    cr.mesh.visible = false;
    spawnDebris(cr.x, CURB + 0.25, cr.z, this.cfg.crate.color, 6, car.vx, car.vz);
    audio.smash();
    this.counts.crate++;
    this.note('crate', { i: r.i });
  }
  keepOut() {
    const g = this.g, p = g.player;
    if (g.playerCar || p.state !== 'normal') return;
    for (const r of this.shown) {
      const ch = r.ch;
      if (ch.state !== 'seated') continue;
      const dx = p.x - ch.x, dz = p.z - ch.z, d = Math.hypot(dx, dz), R = p.r + 0.3;
      if (d < R && d > 1e-3 && Math.abs(p.y - ch.y) < 1.0) { p.x += (dx / d) * (R - d); p.z += (dz / d) * (R - d); }
    }
  }

  // Facing: a vendor or a church local at his spot turns to Stig near him; the church's pair and the
  // paseo's pairs talk to each other in turn.
  pose(dt, f) {
    const g = this.g, c = this.cfg, p = g.player;
    for (const r of this.shown) {
      const ch = r.ch, a = ch.anim;
      const chat = (r.kind === 'walker' || r.kind === 'stand') && ch.state === 'normal' && !g.saying(ch);
      a.talk = g.saying(ch) || (chat && Math.floor((g.time + (r.kind === 'stand' ? 0 : r.i * 0.9)) / 2.3) % 2 === r.pair);
      if (r.kind === 'walker' || ch.state !== 'normal' || r.stale || dist(ch.x, ch.z, r.x, r.z) > 0.3) continue;
      let want = r.yaw;
      if (!g.playerCar && dist(ch.x, ch.z, p.x, p.z) < c.turnR) {
        const off = angleDiff(r.yaw, yawTo(p.x - ch.x, p.z - ch.z));
        want = r.yaw + Math.max(-c.turnMax, Math.min(c.turnMax, off));
      }
      ch.yaw = dampAngle(ch.yaw, want, 4, dt);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Lines

  say(ch, text, kind, secs = 2.2, o = {}) {
    this.g.say(ch, text, secs);
    this.counts[kind]++;
    this.note(kind, { text, ...o });
  }
  tickLines(f, h) {
    const g = this.g, c = this.cfg, p = g.player, foot = !g.playerCar && p.state === 'normal';
    for (const r of this.shown) {
      const ch = r.ch, d = dist(ch.x, ch.z, f.x, f.z);
      if (d > c.awayR) { r.visit = false; continue; }
      if (!foot || r.visit || g.saying(ch) || (ch.state !== 'normal' && ch.state !== 'seated') || r.stale) continue;
      if (r.kind === 'vendor' && r.as === 'stand' && ch.state === 'normal') {
        const ahead = (p.x - r.x) * Math.sin(r.yaw) + (p.z - r.z) * Math.cos(r.yaw);
        if (d >= c.callR || ahead < -0.3 || g.time - this.lineT.market < c.callGap) continue;
        r.visit = true;
        if (!this.first.market && Math.random() >= c.callChance) continue;
        this.first.market = false;
        this.lineT.market = g.time;
        this.say(ch, r.call && Math.random() < 0.5 ? r.call : pick(c.calls), 'call', 2.2, { i: r.i });
      } else if (r.group === 'kyrka') {
        if (d >= c.greetR || g.time - this.lineT.greet < c.greetGap) continue;
        r.visit = true;
        this.lineT.greet = g.time;
        let line = c.greet[0][1];
        for (const [from, l] of c.greet) if (h >= from) line = l;
        this.say(ch, line, 'greet', 2.0, { i: r.i });
      } else if (r.kind === 'seat' && this.paseo(h) && ch.state === 'seated') {
        if (d >= c.suecosR || g.time - this.lineT.suecos < c.suecosGap) continue;
        r.visit = true;
        if (!this.first.suecos && Math.random() >= c.suecosChance) continue;
        this.first.suecos = false;
        this.lineT.suecos = g.time;
        this.say(ch, c.suecos, 'suecos', 2.0, { i: r.i });
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The souvenir seller's giraffe (after julafton)

  seller() { return this.g.npc('souvenir'); }
  girOk() {
    const g = this.g, c = this.cfg.giraffe, p = g.player, s = this.seller();
    if (!g.unlocked.has(c.unlock) || g.playerCar || g.carrying || p.state !== 'normal' || !p.onGround || p.anim.giraffe || g.shame.pursuit) return false;
    if (!s || s.state !== 'normal' || !s.root.visible || s.car || !g.honk.free('souvenir') || g.npcPosed('souvenir')) return false;
    // Before the stand (its front at the block's z 0), at his level.
    return dist(p.x, p.z, s.x, s.z) < c.r && Math.abs(p.y - s.y) < c.dy && p.z > this.M.z - 0.3;
  }
  tickGiraffe(dt, f) {
    const g = this.g, c = this.cfg.giraffe, p = g.player, s = this.seller();
    if (!this.gir) {
      if (s && dist(f.x, f.z, s.x, s.z) > c.awayR) this.girArmed = true;
      if (!this.talk || !this.girArmed || g.time - this.girT < c.every || !this.girOk()) return;
      this.girArmed = false;
      this.girT = g.time;
      this.gir = { t: 0, stig: false };
      g.unsay(s);
      s.anim.giraffe = true;
      this.say(s, c.line, 'giraffe', c.secs, { who: 'souvenir' });
      return;
    }
    const x = this.gir;
    if (!this.talk || !s || s.state !== 'normal') { this.endGiraffe(); return; }
    x.t += dt;
    s.yaw = dampAngle(s.yaw, yawTo(p.x - s.x, p.z - s.z), 6, dt);
    if (!x.stig && x.t >= c.stigAt) {
      x.stig = true;
      if (!g.playerCar && p.state === 'normal' && !p.anim.giraffe && !g.carrying) {
        x.held = true;
        p.anim.giraffe = true;
        if (p.speed < 1.5) p.yaw = yawTo(s.x - p.x, s.z - p.z);
        this.say(p, c.stig, 'giraffe', c.secs, { who: 'stig' });
      }
    }
    if (x.held && (g.playerCar || p.state !== 'normal')) { p.anim.giraffe = false; x.held = false; }
    if (x.t >= c.downAt) this.endGiraffe();
  }
  endGiraffe() {
    const x = this.gir;
    if (!x) return;
    const g = this.g, s = this.seller();
    if (s) s.anim.giraffe = false;
    if (x.held && !(g.room107?.holdT > 0)) g.player.anim.giraffe = false;
    this.gir = null;
  }

  // ---------------------------------------------------------------------------------------------
  // The market's covers

  buildCovers() {
    const c = this.cfg, cv = c.cover, M = this.M, top = 2.55, H = top - cv.drop - cv.low;
    const geos = cv.cloth.map(([a, b]) => clothGeo(cv.w, H, a, b));
    const board = (text, fg) => signMesh(text, 1.6, 0.44, { bg: '#fff8e6', fg, border: '#1d1426', scale: 0.62 });
    const S = board(c.siestaSign, '#d8321e'), C = board(c.closedSign, '#1d1426');
    const list = [];
    const add = (x, z, yaw, d, prop) => {
      const i = list.length, out = d / 2 + cv.out;
      const mesh = toonMesh(geos[i % geos.length], { outline: 0, cast: false });
      mesh.position.set(x + Math.sin(yaw) * out, top - cv.drop, z + Math.cos(yaw) * out);
      mesh.rotation.y = yaw;
      mesh.visible = false;
      scene.add(mesh);
      let sign = null;
      if (i % cv.signEvery === 0) {
        sign = { siesta: new THREE.Mesh(S.geometry, S.material), closed: new THREE.Mesh(C.geometry, C.material) };
        for (const m of [sign.siesta, sign.closed]) { m.position.set(0, -0.62, 0.03); mesh.add(m); }
      }
      list.push({ i, mesh, sign, prop, k: 0, want: 0, delay: 0 });
    };
    for (const [lx, lz, face, d] of c.stalls) add(M.x + lx, M.z + lz, face > 0 ? 0 : Math.PI, d, null);
    for (const p of propsOfType('frutas', { x: M.x, z: M.z, r: 45 })) add(p.x, p.z, p.yaw, 3.5, p);
    this.covers = list;
  }
  tickCovers(dt, f, h) {
    const c = this.cfg.cover, near = dist(f.x, f.z, this.M.x, this.M.z) < 260, down = this.open(h) ? 0 : 1, si = this.siesta(h);
    for (const cv of this.covers) {
      const want = cv.prop && !cv.prop.alive ? 0 : down;
      if (cv.prop && !cv.prop.alive) cv.k = 0;
      if (want !== cv.want) { cv.want = want; cv.delay = cv.i * c.stagger; }
      if (cv.delay > 0) cv.delay -= dt;
      else if (cv.k !== cv.want) cv.k = cv.want > cv.k ? Math.min(1, cv.k + dt / c.rollSecs) : Math.max(0, cv.k - dt / c.rollSecs);
      cv.mesh.visible = near && cv.k > 0;
      cv.mesh.scale.y = Math.max(0.04, cv.k);
      if (cv.sign) { cv.sign.siesta.visible = si; cv.sign.closed.visible = !si; }
    }
  }
  hideCovers() {
    for (const cv of this.covers || []) { cv.k = 0; cv.want = 0; cv.delay = 0; cv.mesh.visible = false; }
  }

  // ---------------------------------------------------------------------------------------------
  // The bells at the town's turns

  tickClock(h, f) {
    const last = this.lastH;
    this.lastH = h;
    if (last == null) return;
    const dh = wrapH(h - last);
    if (dh <= 0 || dh > 0.5) return;   // a jump (the nap, the morning cut, a test's set) rings nothing
    for (const E of Object.keys(this.cfg.bells.rounds).map(Number)) {
      const t = wrapH(E - last);
      if (t > 0 && t <= dh) this.turn(E, f);
    }
  }
  turn(E, f) {
    const g = this.g, c = this.cfg, B = c.bells, d = dist(f.x, f.z, B.at[0], B.at[1]);
    const vol = B.vol / (1 + d / B.falloff);
    audio.bells(B.rounds[E], vol);
    this.counts.bells++;
    const inCentre = [this.M, this.P, this.K].some((q) => dist(f.x, f.z, q.x, q.z) < c.toastR);
    if (inCentre && !g.inDialog && c.toasts[E]) hud.toast(c.toasts[E]);
    this.note('bells', { hour: E, vol: +vol.toFixed(4), toast: inCentre && !g.inDialog });
  }

  // ---------------------------------------------------------------------------------------------

  update(dt) {
    const g = this.g, c = this.cfg;
    if (!this.live) { this.reset(); return; }
    if (!this.recs) { this.build(); this.buildCovers(); }
    const f = g.focus(), h = g.day.h, moved = dist(f.x, f.z, this.fx, this.fz) > c.jumpR;
    // A cut: the first frame, free roam again somewhere else (a mission's end, a load), R, a warp.
    if (!this.everOn || moved) this.cutT = c.cutSecs;
    this.on = this.everOn = true;
    this.fx = f.x; this.fz = f.z;
    this.cutT -= dt;
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    this.tickBodies(f, h);
    this.tickCovers(dt, f, h);
    this.pose(dt, f);
    if (this.talk) this.tickLines(f, h);
    this.tickGiraffe(dt, f);
    this.tickClock(h, f);
    for (const r of this.shown.slice()) {
      const ch = r.ch;
      // Held somewhere, or carried far off (a car's knock): back at his place when nobody sees it.
      const home = r.as === 'walk' ? null : r.as === 'stand' ? r : r.seat.front;
      if (home && ch.state === 'normal' && !r.stale) {
        const d = dist(ch.x, ch.z, home.x, home.z);
        r.stuckT = d > 0.5 && ch.speed < 0.2 ? r.stuckT + dt : 0;
        if ((r.stuckT > 3 || d > 30) && this.popOk(ch.x, ch.y + 1, ch.z)) { this.put(r); continue; }
      }
      ch.sync(dt);
    }
  }

  // A mission start or the other level: every body, cover and crate away, the giraffe down.
  reset() {
    this.endGiraffe();
    this.lastH = null;
    if (!this.on) return;
    this.on = false;
    for (const r of this.shown.slice()) this.put(r);
    this.hideCovers();
  }

  // Tests: the bodies out now.
  snapshot() {
    const f = this.g.focus();
    return this.shown.map((r) => {
      const ch = r.ch;
      return { i: r.i, kind: r.kind, group: r.group, as: r.as, state: ch.state, slump: !!ch.anim.slump, stale: r.stale, d: +dist(ch.x, ch.z, f.x, f.z).toFixed(1),
        x: +ch.x.toFixed(2), y: +ch.y.toFixed(2), z: +ch.z.toFixed(2), visible: ch.root.visible, local: !!ch.def.local };
    });
  }
}
