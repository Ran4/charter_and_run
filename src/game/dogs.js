// Fin hund… – the watchdogs in the bungalow gardens and the farmyard on vischan (free roam; feature
// 31, DESIGN §10.21). About one bungalowR lot in four (world/town.js `dogLots`) and the finca's yard
// (world/blocks/nature.js `FARM_YARD`) keep a dog. It lies by the front door and barks at Stig on
// the sidewalk from inside its wall; when he walks into its lot it rushes at him and stands barking
// a step off. It never bites and never leaves its lot: out through the gate again is enough. Stig
// puts his hands up and murmurs "Fin hund… fin hund…"; up out of its reach (a car roof, a garden
// wall, the tank's rim, the trampoline) he talks to it, the mantra with his arms out among it, until
// the owner whistles from the house unseen and the dog trots home and lies down. Only on the island
// with no mission running (`missions.state === 'idle'`): otherwise the dogs are put away (no mesh,
// no push), so no mission, timer or calibration pool meets them. They are not characters: no kick,
// stomp or car reaches them, and they add no SKANDAL. Config: DOGS (content/island.js). Owned by
// Game as `dogs`; main.js calls `update` once a frame.

import { DOGS } from '../content/index.js';
import { dogLots, bouncers } from '../world/town.js';
import { FARM_YARD } from '../world/blocks/nature.js';
import { THREE, GeoBuilder, toonMesh } from '../gfx.js';
import { queryBlocks, circleVsBlock, circleVsObb, groundAt, topAt, contains, RAMP } from '../world/collision.js';
import { blockAt, blockInterior } from '../world/layout.js';
import { audio } from '../audio.js';
import { S } from '../strings.js';
import { dist, yawTo, dampAngle, angleDiff, damp, lerp, clamp, mulberry32 } from '../util.js';

const _bl = [], _h = {};
const INK = 0x1d1426;

// ---------------------------------------------------------------------------------------------
// The dogs' looks, built at a medium dog's size (shoulder 0.6 m), facing +z, feet at y 0; `s`
// scales the whole dog. Parts: the body (with the neck), the head, the tail and four legs, each on
// its own pivot so it can run, bark, rear up against a wall and lie down.

const LOOKS = {
  brun: { s: 1.0, coat: 0x8a5530, belly: 0xc8955e, ear: 0x5e3820, ears: 'flop' },
  gul: { s: 0.95, coat: 0xd6a952, belly: 0xf0d79c, ear: 0xb08236, ears: 'half' },
  svart: { s: 1.18, coat: 0x2a2522, belly: 0xa8642c, ear: 0x2a2522, ears: 'up', tan: true },
  flack: { s: 1.0, coat: 0xf2eee4, belly: 0xf2eee4, ear: 0x2a2522, ears: 'flop', spots: 0x2a2522 },
  pudel: { s: 0.72, coat: 0xf6f0e6, belly: 0xf6f0e6, ear: 0xe6dccb, ears: 'long', poodle: true },
  gra: { s: 0.78, coat: 0x8c8a84, belly: 0xb8b4aa, ear: 0x6e6c66, ears: 'up', beard: true },
};
const HIP = 0.36, FZ = 0.2, BZ = -0.22, LX = 0.09;   // the leg pivots; the rig rears about (0, HIP, BZ)

function bodyGeo(L) {
  const g = new GeoBuilder();
  if (L.poodle) {
    g.sphere(L.coat, 0, 0.47, 0.13, 0.34, 0.38, 0.38);   // the clipped mane
    g.sphere(L.coat, 0, 0.45, -0.08, 0.19, 0.19, 0.42);
    g.sphere(L.coat, 0, 0.47, -0.25, 0.24, 0.24, 0.22);
  } else {
    g.sphere(L.coat, 0, 0.46, -0.02, 0.3, 0.28, 0.68);
    g.sphere(L.coat, 0, 0.48, 0.17, 0.3, 0.33, 0.34);
    g.sphere(L.belly, 0, 0.4, 0.06, 0.22, 0.16, 0.46);
    if (L.tan) g.sphere(L.belly, 0, 0.44, 0.28, 0.2, 0.2, 0.12);
    if (L.spots) for (const [x, y, z, d] of [[0.11, 0.52, -0.1, 0.13], [-0.11, 0.5, 0.08, 0.11], [0.05, 0.59, 0.12, 0.09], [-0.12, 0.47, -0.21, 0.12], [0, 0.6, -0.17, 0.1]]) g.sphere(L.spots, x, y, z, d, d * 0.8, d);
  }
  g.cyl(L.coat, 0, 0.58, 0.3, 0.085, 0.2, 8, 0.7);
  return g.build();
}
function headGeo(L) {
  const g = new GeoBuilder();
  g.sphere(L.coat, 0, 0.06, 0.03, 0.24, 0.22, 0.25);
  g.sphere(L.tan ? L.belly : L.coat, 0, 0, 0.16, 0.13, 0.11, 0.2);
  g.sphere(INK, 0, 0.03, 0.26, 0.055, 0.045, 0.045);
  g.box(0x6a2a2a, 0, -0.035, 0.18, 0.09, 0.012, 0.1);   // the mouth's line
  for (const s of [-1, 1]) {
    g.sphere(0xffffff, s * 0.065, 0.09, 0.13, 0.05, 0.05, 0.03);
    g.sphere(INK, s * 0.066, 0.09, 0.145, 0.03, 0.03, 0.02);
    if (L.tan) g.sphere(L.belly, s * 0.06, 0.135, 0.125, 0.045, 0.025, 0.03);
    if (L.ears === 'flop') g.sphere(L.ear, s * 0.12, 0.02, 0, 0.06, 0.18, 0.11, 0, 0, s * 0.25);
    else if (L.ears === 'half') { g.cone(L.ear, s * 0.08, 0.17, 0, 0.05, 0.1, 6, 0, 0, -s * 0.2); g.sphere(L.ear, s * 0.1, 0.21, 0.04, 0.06, 0.04, 0.07); }
    else if (L.ears === 'up') g.cone(L.ear, s * 0.075, 0.2, -0.01, 0.05, 0.13, 6, 0, 0, -s * 0.15);
    else g.sphere(L.ear, s * 0.12, -0.03, 0, 0.08, 0.22, 0.1);
  }
  if (L.poodle) g.sphere(L.coat, 0, 0.17, 0, 0.18, 0.15, 0.18);
  if (L.beard) g.sphere(L.belly, 0, -0.05, 0.17, 0.11, 0.1, 0.14);
  return g.build();
}
function tailGeo(L) {
  const g = new GeoBuilder();
  if (L.poodle) { g.cyl(L.coat, 0, 0.08, -0.03, 0.02, 0.16, 6, -0.4); g.sphere(L.coat, 0, 0.17, -0.07, 0.11); }
  else g.cyl(L.coat, 0, 0.1, -0.06, L.s > 1.1 ? 0.035 : 0.03, 0.24, 6, -0.55);
  return g.build();
}
function legGeo(L, back) {
  const g = new GeoBuilder();
  if (back) g.sphere(L.coat, 0, -0.04, -0.01, 0.12, 0.2, 0.17);
  g.cyl(L.coat, 0, -0.17, 0, 0.042, 0.34, 6);
  g.sphere(L.tan ? L.belly : L.coat, 0, -0.33, 0.025, L.poodle ? 0.12 : 0.085, L.poodle ? 0.1 : 0.06, L.poodle ? 0.12 : 0.11);
  return g.build();
}
const PROTO = {};
function proto(look) {
  const L = LOOKS[look];
  const mk = (geo, outline = 0.022) => toonMesh(geo, { outline });
  return (PROTO[look] ??= { body: mk(bodyGeo(L)), head: mk(headGeo(L)), tail: mk(tailGeo(L), 0.015), front: mk(legGeo(L, false), 0.015), back: mk(legGeo(L, true), 0.015) });
}

// ---------------------------------------------------------------------------------------------
// A dog's lot, in its own frame (the bungalow's: the street at local z 0, the lot back to +z; the
// farm's: the block's): the rectangle it keeps (x0..x1, z0..z1), the walls it runs round, its spot
// by the door and the door the owner calls from.

class Lot {
  constructor(o, farm, cfg) {
    this.farm = farm;
    this.ox = o.ox; this.oz = o.oz; this.c = Math.cos(o.yaw); this.s = Math.sin(o.yaw);
    if (farm) {
      Object.assign(this, { x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1, front: null, walls: o.walls, tramp: null });
      this.homeL = o.home; this.doorL = o.door; this.doorsL = [o.door];
    } else {
      const [hx, , hw, hd] = o.house, [dx, front] = o.door;
      this.doorsL = [o.door, [hx, front + hd]];   // the front door and the back door
      Object.assign(this, { x0: -o.w / 2 + 0.3, x1: o.w / 2 - 0.3, z0: 0.75, z1: o.d - 0.45, front: 0.75, tramp: o.tramp });
      this.walls = [[hx - hw / 2, front, hx + hw / 2, front + hd]];
      this.homeL = [dx - 1.5, front - 1.0]; this.doorL = [dx, front];
    }
    // Where the dog may be: its lot and `reach` m into a neighbour's garden beside it, never out over
    // the front wall, the back wall or onto a side street (the farm's: `reach` m round its yard).
    const r = cfg.reach, side = (lx) => {
      const [x, z] = this.world(lx, (this.z0 + this.z1) / 2), b = blockAt(x, z), I = b && blockInterior(b.i, b.j);
      return !!I && x > I.x0 + 1 && x < I.x1 - 1 && z > I.z0 + 1 && z < I.z1 - 1;
    };
    this.rL = farm || side(this.x0 - 1.5) ? r : 0;
    this.rR = farm || side(this.x1 + 1.5) ? r : 0;
    this.rB = farm ? r : 0;
    this.allow = [this.x0 - this.rL, this.front != null ? cfg.wallIn : this.z0 - r, this.x1 + this.rR, this.z1 + this.rB];
    this.reach = r;
    const [hx, hz] = this.world(...this.homeL);
    // Lying facing the street (the farm's: the track, east).
    this.home = { x: hx, z: hz, yaw: o.yaw + (farm ? Math.PI / 2 : Math.PI) };
    // The owner's call comes from a door (bubble anchors).
    this.anchors = this.doorsL.map(([lx, lz]) => { const [x, z] = this.world(lx, lz); return { x, y: 0.15, z, height: 2.3 }; });
    this.anchor = this.anchors[0];
    this.mid = this.world((this.x0 + this.x1) / 2, (this.z0 + this.z1) / 2);
  }
  local(x, z) { const dx = x - this.ox, dz = z - this.oz; return [dx * this.c - dz * this.s, dx * this.s + dz * this.c]; }
  world(lx, lz) { return [this.ox + lx * this.c + lz * this.s, this.oz - lx * this.s + lz * this.c]; }
  inside(lx, lz) { return lx >= this.x0 && lx <= this.x1 && lz >= this.z0 && lz <= this.z1; }
  // Stig still "in" it: where the dog may go (the lot, a neighbour's garden beside it; not out
  // through the front wall).
  near(lx, lz) { return lx >= this.x0 - this.rL && lx <= this.x1 + this.rR && lz >= (this.front != null ? this.z0 : this.z0 - this.reach) && lz <= this.z1 + this.rB; }
  // How far outside the lot (local) a point is (0 inside).
  outside(lx, lz) { return Math.hypot(Math.max(this.x0 - lx, 0, lx - this.x1), Math.max(this.z0 - lz, 0, lz - this.z1)); }
  // A point in one of its walls' boxes (him up on the tank) moved out to a side, 0.7 m out: where
  // the dog can bark up at him from. The side nearest him, the dog's own side first on a near-tie
  // (on the tank's middle line it stays on the yard's side, out of the finca's crowded corner).
  clear(lx, lz, ax, az) {
    for (const w of this.walls) {
      if (!inBox(w, 0.4, lx, lz)) continue;
      const m = 0.7, P = [[w[0] - m, lz], [w[2] + m, lz], [lx, w[1] - m], [lx, w[3] + m]];
      let best = null, bc = Infinity;
      for (const q of P) {
        const c = Math.hypot(q[0] - lx, q[1] - lz) + 0.25 * Math.hypot(q[0] - ax, q[1] - az);
        if (c < bc) { bc = c; best = q; }
      }
      return best;
    }
    return [lx, lz];
  }
  // The next corner to run by when the line from a to b crosses one of the lot's walls (local), or
  // null: the shortest way round that wall's box over its corners, `CORNER` m out (clear of the
  // bougainvillea at a bungalow's front corner).
  via(ax, az, bx, bz) {
    for (const w of this.walls) {
      if (!crosses(w, 0.4, ax, az, bx, bz)) continue;
      const m = CORNER, C = [[w[0] - m, w[1] - m], [w[2] + m, w[1] - m], [w[2] + m, w[3] + m], [w[0] - m, w[3] + m]];
      const inA = inBox(w, 0.4, ax, az), inB = inBox(w, 0.4, bx, bz);
      // Dijkstra over a, the four corners (each joined to its two neighbours) and b.
      const cost = [0, Infinity, Infinity, Infinity, Infinity, Infinity], prev = [], done = [];
      const P = [[ax, az], ...C, [bx, bz]];
      const edge = (i, j) => {
        if (i === 0 && j === 5) return false;
        if (i === 0) return Math.hypot(C[j - 1][0] - ax, C[j - 1][1] - az) > 0.3 && (inA || !crosses(w, 0.4, ax, az, ...C[j - 1]));
        if (j === 5) return inB || !crosses(w, 0.4, ...C[i - 1], bx, bz);
        return j !== 0 && (Math.abs(i - j) === 1 || Math.abs(i - j) === 3);
      };
      for (;;) {
        let u = -1;
        for (let i = 0; i < 6; i++) if (!done[i] && cost[i] < Infinity && (u < 0 || cost[i] < cost[u])) u = i;
        if (u < 0 || u === 5) break;
        done[u] = true;
        for (let v = 1; v < 6; v++) {
          if (done[v] || !edge(u, v)) continue;
          const c = cost[u] + Math.hypot(P[v][0] - P[u][0], P[v][1] - P[u][1]);
          if (c < cost[v]) { cost[v] = c; prev[v] = u; }
        }
      }
      if (cost[5] === Infinity) return null;
      let v = 5;
      while (prev[v] !== 0) v = prev[v];
      return P[v];
    }
    return null;
  }
}
const CORNER = 1.2;
const inBox = (w, m, x, z) => x > w[0] - m && x < w[2] + m && z > w[1] - m && z < w[3] + m;
// Does the segment a→b cross the box w = [x0, z0, x1, z1] grown by m (slab test)?
function crosses(w, m, ax, az, bx, bz) {
  let t0 = 0, t1 = 1;
  for (const [p, d, lo, hi] of [[ax, bx - ax, w[0] - m, w[2] + m], [az, bz - az, w[1] - m, w[3] + m]]) {
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; continue; }
    let u0 = (lo - p) / d, u1 = (hi - p) / d;
    if (u0 > u1) [u0, u1] = [u1, u0];
    t0 = Math.max(t0, u0); t1 = Math.min(t1, u1);
    if (t0 > t1) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------------------------
// One dog. `mode`: rest (lying by the door) | home (trotting back to it) | alert (inside its wall,
// barking at him outside) | rush (at him in its lot) | bay (standing barking at him, rearing up when
// he is out of reach) | back (at its lot's edge, barking after him) | called (home after the
// whistle, deaf to him for `calm` s). A plain bubble anchor for game.say ({ x, y, z, height }).

class Dog {
  constructor(scene, def, lot) {
    this.def = def;
    this.name = def.name;
    this.lot = lot;
    const L = LOOKS[def.look] || LOOKS.brun, P = proto(LOOKS[def.look] ? def.look : 'brun');
    this.s = L.s;
    this.root = new THREE.Group();
    this.rig = new THREE.Group();
    this.root.add(this.rig);
    this.root.scale.setScalar(this.s);
    const part = (m, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); o.add(m.clone()); this.rig.add(o); return o; };
    this.rig.add(P.body.clone());
    this.head = part(P.head, 0, 0.66, 0.36);
    this.head.rotation.order = 'YXZ';
    this.tail = part(P.tail, 0, 0.54, -0.34);
    this.legs = [part(P.front, LX, HIP, FZ), part(P.front, -LX, HIP, FZ), part(P.back, LX, HIP, BZ), part(P.back, -LX, HIP, BZ)];
    this.root.visible = false;
    scene.add(this.root);
    this.height = 0.95 * this.s;
    this.on = false;
    this.calm = 0;
    this.home();
  }
  get state() { return this.on ? 'normal' : 'hidden'; }
  home() {
    const h = this.lot.home;
    this.x = h.x; this.z = h.z; this.yaw = h.yaw;
    this.base = groundAt(h.x, h.z, 0.6, 0.5);
    this.y = this.base;
    this.mode = 'rest'; this.t = 0; this.speed = 0; this.phase = Math.random() * 6;
    this.barkT = 0.4; this.barkA = 0; this.rear = 0; this.lie = 1; this.look = 0;
    this.inT = 0; this.upT = 0; this.stuckT = 0; this.bayD = 0; this.best = Infinity; this.rem = 0; this.dodge = null;
  }
}

export class Dogs {
  constructor(game, cfg = DOGS) {
    this.g = game;
    this.cfg = cfg;
    this.dogs = null;       // built on the first update in free roam
    this.enc = null;        // Stig and the dog at him: { dog, first, lineT, gI, upI, wasUp, mantraT, called, thanksAt }
    this.pose = 0;          // our player.anim.placate
    this.held = false;      // anything to put away when free roam ends
    this.events = [];       // for tests: { t, name, kind: rush | up | call | back | alert }
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }

  build() {
    const c = this.cfg, r = mulberry32(31);   // its own draws: the town's are spent as before
    const keyed = dogLots.map((o) => {
      const lot = new Lot(o, false, c), b = blockAt(lot.mid[0], lot.mid[1]);
      return { lot, b: b ? b.i + ',' + b.j : '', key: (o.tramp ? 0 : o.drive ? 1 : 2) + r() };
    }).sort((a, b) => a.key - b.key);
    const per = {}, lots = [];
    for (const k of keyed) {
      if (lots.length >= Math.min(c.lots, c.pack.length)) break;
      if ((per[k.b] = (per[k.b] || 0) + 1) > c.perBlock) continue;
      lots.push(k.lot);
    }
    this.dogs = lots.map((lot, i) => new Dog(this.g.scene, c.pack[i], lot));
    if (FARM_YARD.walls) this.dogs.push(new Dog(this.g.scene, c.farm, new Lot(FARM_YARD, true, c)));
  }

  // ---------------------------------------------------------------------------------------------

  update(dt) {
    const g = this.g, c = this.cfg;
    if (!this.live) { this.release(); return; }
    if (!this.dogs) this.build();
    this.held = true;
    const f = g.focus();
    for (const d of this.dogs) {
      if (dist(d.lot.home.x, d.lot.home.z, f.x, f.z) > c.farR) { if (d.on) this.sleep(d); d.calm = Math.max(0, d.calm - dt); continue; }
      if (!d.on) { d.on = true; d.root.visible = true; }
      this.think(d, dt);
      this.shove(d);
      this.sync(d, dt);
    }
    this.talk(dt);
  }

  // Put away: hidden at home, lying (a dog out of range, or free roam ending).
  sleep(d) {
    const g = this.g;
    d.on = false;
    d.root.visible = false;
    g.unsay(d);
    d.home();
    if (this.enc?.dog === d) this.endEnc();
  }

  // Free roam ends (a mission, the other level): every dog hidden at home, his hands down.
  release() {
    if (!this.held) return;
    for (const d of this.dogs || []) { this.sleep(d); d.calm = 0; }
    this.enc = null;
    this.setPose(0);
    this.held = false;
  }

  // ---------------------------------------------------------------------------------------------
  // What a dog does

  // Stig on foot and up, out of its reach: standing at least `upH` m over its yard (a car roof, a
  // garden wall, the tank's rim, a crate), or bouncing on its trampoline. A jump is not up.
  up(d) {
    const g = this.g, p = g.player;
    if (g.playerCar || p.state !== 'normal' || p.y < d.base + this.cfg.upH) return false;
    return p.onGround || bouncers.some((b) => contains(b, p.x, p.z));
  }

  think(d, dt) {
    const g = this.g, c = this.cfg, p = g.player, L = d.lot, f = g.focus();
    const car = g.playerCar, foot = !car && p.state !== 'hidden' && p.state !== 'seated';
    const [lx, lz] = L.local(f.x, f.z);
    const inside = L.inside(lx, lz), near = L.outside(lx, lz) <= c.hearR;
    d.barkT -= dt;
    d.rearing = false;
    if (d.calm > 0) d.calm -= dt;
    const free = d.calm <= 0 && !g.inDialog;
    // A car coming at it: a hop aside (it is never under a car).
    if (!d.dodge) { const th = this.threat(d); if (th) d.dodge = { vx: th.x * 7, vz: th.z * 7, t: 0.35 }; }
    if (d.dodge) {
      d.dodge.t -= dt;
      this.move(d, d.dodge.vx * dt, d.dodge.vz * dt);
      d.yaw = dampAngle(d.yaw, yawTo(d.dodge.vx, d.dodge.vz), 12, dt);
      d.speed = 5;
      if (d.dodge.t <= 0) d.dodge = null;
      this.pushOut(d);
      return;
    }
    if (free && foot && p.state === 'normal' && inside && d.mode !== 'rush' && d.mode !== 'bay') this.rush(d);
    switch (d.mode) {
      case 'rest':
      case 'home':
        if (free && near && !inside || free && car && inside) { d.mode = 'alert'; d.t = c.alertHold; this.event(d, 'alert'); break; }
        if (d.mode === 'home' && this.go(d, L.home.x, L.home.z, c.trot, 0.25, dt)) d.mode = 'rest';
        if (d.mode === 'rest') { d.speed = damp(d.speed, 0, 10, dt); d.yaw = dampAngle(d.yaw, L.home.yaw, 3, dt); }
        break;
      case 'called':
        if (this.go(d, L.home.x, L.home.z, c.trot, 0.25, dt)) d.mode = 'rest';
        break;
      case 'alert': {
        // To the inside of its wall opposite him (or the lot's edge nearest him), barking.
        if (near || car && inside) d.t = c.alertHold;
        else if ((d.t -= dt) <= 0) { d.mode = 'home'; break; }
        const tx = clamp(lx, L.x0 + 0.6, L.x1 - 0.6), tz = clamp(lz, L.front != null ? c.wallIn : L.z0 + 0.6, L.z1 - 0.6);
        const [wx, wz] = L.world(tx, tz);
        const there = car && inside ? this.go(d, f.x, f.z, c.alertSpeed, c.carR, dt) : this.go(d, wx, wz, c.alertSpeed, 0.3, dt);
        if (there) { d.speed = damp(d.speed, 0, 12, dt); this.face(d, f.x, f.z, dt); }
        if (d.barkT <= 0 && !g.inDialog) this.bark(d);
        break;
      }
      case 'rush':
      case 'bay': {
        if (!foot || !L.near(lx, lz)) {
          if (car) { d.mode = 'alert'; d.t = c.alertHold; } else { d.mode = 'back'; d.t = c.backSecs; this.event(d, 'back'); }
          if (this.enc?.dog === d) this.endEnc();
          break;
        }
        if (g.inDialog) { d.speed = damp(d.speed, 0, 12, dt); break; }
        const up = this.up(d), dd = dist(d.x, d.z, p.x, p.z);
        d.inT += dt;
        if (up) { if (d.upT === 0) this.event(d, 'up'); d.upT += dt; }
        if (d.upT >= c.callAfter || d.inT >= c.groundCall) { this.call(d); break; }
        if (d.mode === 'bay') {
          if (dd > Math.max(up ? c.stopUp : c.stopR, d.bayD) + 1) { d.mode = 'rush'; d.best = Infinity; d.stuckT = 0; }
          // A step or two after him at a walk, to its distance again; else standing, rearing up at him.
          else if (!up && dd > c.stopR + 0.35) this.go(d, p.x, p.z, c.trot, c.stopR, dt);
          else { d.speed = damp(d.speed, 0, 12, dt); this.face(d, p.x, p.z, dt); d.rearing = up && dd < 2.4; }
        } else {
          const at = this.go(d, p.x, p.z, c.speed, up ? c.stopUp : c.stopR, dt);
          // Against the car, the wall or the trampoline under him: no nearer for `stuck` s, as near as
          // it gets (its way left to go, `rem`, measured; a jump in it is him moving off).
          if (d.rem < d.best - 0.25 || d.rem > d.best + 0.5) { d.best = d.rem; d.stuckT = 0; } else d.stuckT += dt;
          if (at || d.stuckT > c.stuck) { d.mode = 'bay'; d.bayD = dd; d.stuckT = 0; }
        }
        if (d.barkT <= 0 && dd < 9) this.bark(d);
        break;
      }
      case 'back':
        // At the edge, barking after him, then home (or at him again if he comes back in).
        d.speed = damp(d.speed, 0, 12, dt);
        this.face(d, f.x, f.z, dt);
        if (d.barkT <= 0 && !g.inDialog) this.bark(d);
        if ((d.t -= dt) <= 0) d.mode = 'home';
        break;
    }
    this.pushOut(d);
  }

  rush(d) {
    d.mode = 'rush';
    d.inT = 0; d.upT = 0; d.stuckT = 0; d.best = Infinity;
    d.barkT = Math.min(d.barkT, 0.15);
    this.event(d, 'rush');
    if (!this.enc || this.enc.dog !== d) this.enc = { dog: d, first: false, lineT: 0, gI: 0, upI: 0, wasUp: false, mantraT: 0, called: null, thanksAt: null };
  }

  // The owner whistles from the house, unseen, and calls it by name; it trots home and lies down.
  call(d) {
    const g = this.g, c = this.cfg, f = g.focus();
    d.mode = 'called';
    d.calm = c.restSecs;
    d.inT = d.upT = 0;
    // From the door nearer him (the back door when he is on the trampoline behind the house).
    const a = d.lot.anchors.reduce((b, q) => (dist(q.x, q.z, f.x, f.z) < dist(b.x, b.z, f.x, f.z) ? q : b));
    d.lot.anchor = a;
    audio.whistle();
    g.say(a, d.def.call, c.callSecs);
    this.event(d, 'call');
    if (this.enc?.dog === d) Object.assign(this.enc, { dog: null, called: d, thanksAt: g.time + c.thanksAt, mantraT: 0 });
  }

  bark(d) {
    const g = this.g, c = this.cfg, f = g.focus(), dd = dist(d.x, d.z, f.x, f.z);
    d.barkT = c.barkGap[0] + Math.random() * (c.barkGap[1] - c.barkGap[0]);
    d.barkA = 1;
    if (dd < c.barkHear) audio.woof(d.s, 2, clamp(1.2 - dd / c.barkHear, 0.25, 1));
    g.say(d, d.def.bark, c.barkSecs);
  }

  event(d, kind) {
    this.events.push({ t: +this.g.time.toFixed(2), name: d.name, kind });
    if (this.events.length > 60) this.events.shift();
  }

  face(d, x, z, dt) { if (Math.hypot(x - d.x, z - d.z) > 0.2) d.yaw = dampAngle(d.yaw, yawTo(x - d.x, z - d.z), 9, dt); }

  // A step towards (tx, tz) at up to `sp` m/s, round the lot's walls; true once within `stop` m.
  go(d, tx, tz, sp, stop, dt) {
    const L = d.lot, [ax, az] = L.local(d.x, d.z), [bx, bz] = L.clear(...L.local(tx, tz), ax, az);
    const w = L.via(ax, az, bx, bz);
    const [gx, gz] = L.world(...(w || [bx, bz]));
    const dx = gx - d.x, dz = gz - d.z, l = Math.hypot(dx, dz);
    d.rem = w ? l + Math.hypot(bx - w[0], bz - w[1]) : l;
    if (!w && l <= stop) return true;
    d.speed = Math.min(sp, d.speed + 30 * dt);
    const step = Math.min(d.speed * dt, w ? l : l - stop);
    if (step > 0) this.move(d, (dx / l) * step, (dz / l) * step);
    d.yaw = dampAngle(d.yaw, yawTo(dx, dz), 10, dt);
    return false;
  }

  // A move, then out of whatever it walked into (walls, posts, the pool's edge: anything over
  // `climb` above its feet, and water), as people slide along walls; kept in its allowed rectangle
  // and off anything higher than `climb` over its yard (so no ramp takes it up the tank).
  move(d, mx, mz) {
    const c = this.cfg, r = c.dogR * d.s, L = d.lot, A = L.allow;
    let x = d.x + mx, z = d.z + mz;
    for (let k = 0; k < 2; k++) {
      for (const b of queryBlocks(x - r, z - r, x + r, z + r, _bl)) {
        if (b.kind !== 'water' && (b.shape === RAMP ? topAt(b, x, z) : b.top) <= d.y + c.climb) continue;
        if (circleVsBlock(x, z, r, b, _h)) { x += _h.nx * _h.depth; z += _h.nz * _h.depth; }
      }
    }
    const [lx, lz] = L.local(x, z);
    if (lx < A[0] || lx > A[2] || lz < A[1] || lz > A[3]) [x, z] = L.world(clamp(lx, A[0], A[2]), clamp(lz, A[1], A[3]));
    if (groundAt(x, z, d.y + 0.5, 0.5) > d.base + c.climb) return false;
    d.x = x; d.z = z;
    d.y = groundAt(x, z, d.y + 0.5, 0.5);
    return true;
  }

  // A car coming at it faster than 2 m/s: the way to hop aside, or null (the pigs' rule, §10.15).
  threat(d) {
    for (const car of this.g.cars) {
      const sp = car.speed;
      if (sp < 2 || Math.abs(car.x - d.x) > 24 || Math.abs(car.z - d.z) > 24) continue;
      const vx = car.vx / sp, vz = car.vz / sp, dx = d.x - car.x, dz = d.z - car.z;
      const along = dx * vx + dz * vz, lat = dx * -vz + dz * vx;
      if (along > -1 && along < car.spec.len / 2 + sp * 0.6 + 2 && Math.abs(lat) < car.spec.wid / 2 + 1.2) {
        const s = lat >= 0 ? 1 : -1;
        return { x: -vz * s, z: vx * s };
      }
    }
    return null;
  }
  // Never inside a car: pushed out of any car's box.
  pushOut(d) {
    const r = this.cfg.dogR * d.s;
    for (const car of this.g.cars) {
      if (Math.abs(car.x - d.x) > car.radius + 1 || Math.abs(car.z - d.z) > car.radius + 1) continue;
      if (d.y > car.y + car.height - 0.3 || !circleVsObb(d.x, d.z, r, car.obb, _h)) continue;
      d.x += _h.nx * _h.depth; d.z += _h.nz * _h.depth;
    }
  }
  // He cannot walk through a dog: it stands its ground and he gives way.
  shove(d) {
    const g = this.g, p = g.player;
    if (g.playerCar || p.state !== 'normal') return;
    const R = this.cfg.dogR * d.s + p.r + 0.05, dx = p.x - d.x, dz = p.z - d.z, l = Math.hypot(dx, dz);
    if (l < R && l > 1e-3 && Math.abs(p.y - d.y) < 0.7) { p.x += (dx / l) * (R - l); p.z += (dz / l) * (R - l); }
  }

  // ---------------------------------------------------------------------------------------------
  // Stig: his hands, his lines, his thanks

  stigSay(text, secs = 2.2) {
    const g = this.g;
    if (!text || g.saying(g.player) || g.inDialog) return false;
    g.say(g.player, text, secs);
    return true;
  }
  setPose(k) {
    if (k === this.pose) return;
    this.pose = k;
    this.g.player.anim.placate = k;
  }
  endEnc() {
    if (this.enc?.thanksAt == null) this.enc = null;
    else this.enc.dog = null;
  }

  talk(dt) {
    const g = this.g, c = this.cfg, p = g.player, e = this.enc;
    const foot = !g.playerCar && p.state === 'normal' && !g.carrying && !p.anim.wings;
    let pose = 0;
    if (e) {
      e.lineT -= dt;
      e.mantraT -= dt;
      const d = e.dog;
      if (d && (d.mode === 'rush' || d.mode === 'bay') && foot) {
        const up = this.up(d), dd = dist(d.x, d.z, p.x, p.z);
        if (!e.first) {
          if ((dd < c.firstR || up) && this.stigSay(up ? c.up[0] : c.first)) { e.first = true; e.lineT = c.lineGap; e.wasUp = up; e.upI = up ? 1 : 0; }
        } else {
          if (up && !e.wasUp && e.upI === 0) e.lineT = Math.min(e.lineT, 0.4);   // just got up: "Snälla hund… sitt!"
          e.wasUp = up;
          if (e.lineT <= 0) {
            const list = up ? c.up : c.ground, k = up ? e.upI % list.length : (e.gI + 1) % list.length;
            const text = list[k] ?? S.mantraLine;
            if (this.stigSay(text, 2.4)) {
              if (up) e.upI++; else e.gI++;
              e.lineT = c.lineGap;
              if (list[k] == null) e.mantraT = c.mantraSecs;
            }
          }
        }
        if (dd < c.poseR || up) pose = e.mantraT > 0 && up ? 2 : 1;
      }
      // His thanks to the owner nobody sees, if he is still there.
      if (e.thanksAt != null && g.time >= e.thanksAt) {
        const a = e.called.lot.anchor;
        if (!foot || dist(a.x, a.z, p.x, p.z) > 25 || this.stigSay(c.thanks, 2.4)) this.enc = null;
      }
    }
    this.setPose(pose);
  }

  // ---------------------------------------------------------------------------------------------
  // The look: running, barking, rearing, lying, the tail

  sync(d, dt) {
    const moving = d.speed > 0.3, gallop = d.speed > 4;
    d.phase += d.speed * dt * (gallop ? 2.3 : 3.2) / d.s;
    d.lie = damp(d.lie, d.mode === 'rest' && !moving ? 1 : 0, 6, dt);
    d.rear = damp(d.rear, d.rearing ? 0.6 : 0, 8, dt);
    d.barkA = Math.max(0, d.barkA - dt * 4);
    const amp = Math.min(0.85, d.speed * 0.16), off = gallop ? [0, 0.5, Math.PI, Math.PI + 0.5] : [0, Math.PI, Math.PI, 0];
    for (let i = 0; i < 4; i++) {
      const a = Math.sin(d.phase + off[i]) * amp;
      d.legs[i].rotation.x = i < 2 ? lerp(lerp(a, -0.9, d.rear), -1.45, d.lie) : lerp(a + d.rear, -1.35, d.lie);
    }
    // The rig: lying lowers it, rearing pitches it about the back hips, a gallop rocks it, a bark hops.
    const th = -d.rear + (gallop ? Math.sin(d.phase) * 0.07 : 0), cs = Math.cos(th), sn = Math.sin(th);
    const bob = moving ? Math.abs(Math.sin(d.phase)) * 0.05 : 0, hop = Math.sin(d.barkA * Math.PI) * 0.06 * (1 - d.lie) * (1 - d.rear);
    d.rig.rotation.x = th;
    d.rig.position.set(0, HIP - (HIP * cs - BZ * sn) - 0.26 * d.lie + bob + hop, BZ - (HIP * sn + BZ * cs));
    // The head: at him when he is near (lying too), a jerk up on each bark, down on its paws.
    const f = this.g.focus(), near = dist(d.x, d.z, f.x, f.z) < 14 && d.mode !== 'called' && d.mode !== 'home';
    d.look = damp(d.look, near ? clamp(angleDiff(d.yaw, yawTo(f.x - d.x, f.z - d.z)), -0.9, 0.9) : 0, 6, dt);
    d.head.rotation.set(-0.35 * d.barkA + 0.25 * d.lie * (near ? 0.2 : 1) - 0.3 * d.rear, d.look, 0);
    // The tail: up and quick at him, a happy wag going home after the call, a slow one lying.
    const t = this.g.time, happy = d.mode === 'called' || d.calm > 0;
    const wag = happy ? Math.sin(t * 15) * 0.6 : d.mode === 'rest' ? Math.sin(t * 3) * 0.15 : Math.sin(t * 22) * 0.18;
    d.tail.rotation.set(d.lie > 0.5 ? 1.0 : happy ? -0.1 : -0.35, wag, 0);
    d.root.position.set(d.x, d.y, d.z);
    d.root.rotation.y = d.yaw;
  }
}
