// Fåglarna som lyfter – och storken i La Charca (free roam; feature 43, DESIGN §10.31). Small flocks
// live on the island: pigeons round the plaza's fountain, gulls at the beach's HELADOS · GLASS kiosk
// and on the marina's pier, and the two herons of La Charca (broken out of the dunes block's merged
// geometry, world/blocks/nature.js) with a stork among them. They peck, take a few steps and turn.
// When Stig runs, jumps or drives in among them, or honks within reach, the birds nearest him lift
// away from him with a flap of wings (the gulls cry, the herons croak), circle the place and land on
// their spots again about half a minute later; a lifting bird takes its neighbours with it, so the
// far end of a flock pecks on. Only the player scares them, never traffic or pedestrians. On foot
// among them Stig puts his hands up and says sorry. The stork does not circle: while the Storches
// stand on the beach at playa it flies east along the coast and lands beside Fru Storch, and the one
// who follows hears Stig's "Oj, en stork!", Fru Storch's correction (the first time only, saved) and
// sees Herr Storch film it before it flies home to the lagoon. Only on the island with no mission
// running (`missions.state === 'idle'`): otherwise every bird stands still on its spot and the stork
// is home, so no mission meets them. Purely visual: no colliders, its own random draws (the world's
// and the town's are spent as before), no actor or autopilot touched, no SKANDAL; no bird is ever
// hurt (§1.2): they lift in time, and a car passes through where one stood. Config: BIRDS
// (content/island.js). Owned by Game as `birds`; main.js calls `update` once a frame and asks
// `posed` (Herr Storch while he films the stork).

import { BIRDS } from '../content/index.js';
import { THREE, GeoBuilder, MAT, outlineGeometry, outlineMat, camera } from '../gfx.js';
import { lm } from '../world/layout.js';
import { blockCentre } from '../world/landmarks-island.js';
import { groundAt } from '../world/collision.js';
import { audio } from '../audio.js';
import { clamp, dist, lerp, damp, dampAngle, angleDiff, yawTo, mulberry32 } from '../util.js';

const PI = Math.PI, TAU = PI * 2;
const INK = 0x1d1426;

// ---------------------------------------------------------------------------------------------
// The looks, facing +z with the feet at y 0, at life size; `s` scales the whole bird (the pigeons
// and gulls are drawn large, as the chase camera sees them). Four meshes a kind: standing (legs
// down, wings folded), flying (legs tucked or trailing), the left and the right wing, each wing
// hinged at its `shoulder` (the left one's, mirrored for the right) and spread along ±x.

function pigeon(fly) {
  const g = new GeoBuilder(), B = 0x8e95a6, W = 0x9aa2b2, D = 0x4c5262, LEG = 0xd06a6a;
  g.sphere(B, 0, 0.21, 0, 0.2, 0.19, 0.34, 0, 0, 0, 8);
  g.sphere(0x7f8798, 0, 0.18, 0.07, 0.17, 0.15, 0.2, 0, 0, 0, 8);
  g.sphere(0x4f7d70, 0, 0.29, 0.1, 0.13, 0.13, 0.12, 0, 0, 0, 8);    // the green-purple neck
  g.sphere(0x8a90a0, 0, 0.36, 0.14, 0.1, 0.1, 0.11, 0, 0, 0, 8);
  g.cone(0x3a3640, 0, 0.355, 0.205, 0.014, 0.05, 5, PI / 2);
  g.box(D, 0, 0.21, -0.21, 0.12, 0.03, 0.15, 0, 0.25);
  for (const sd of [-1, 1]) {
    g.sphere(0xf09030, sd * 0.042, 0.37, 0.16, 0.024, 0.024, 0.024, 0, 0, 0, 6);
    g.sphere(W, sd * 0.085, 0.23, -0.03, 0.06, 0.12, 0.26, 0, 0, 0, 8);   // the folded wing
    for (const z of [-0.05, -0.11]) g.box(D, sd * 0.113, 0.22, z, 0.012, 0.03, 0.05);
    if (fly) g.sphere(LEG, sd * 0.035, 0.12, -0.06, 0.03, 0.03, 0.05, 0, 0, 0, 6);
    else { g.cyl(LEG, sd * 0.04, 0.06, 0, 0.012, 0.12, 4); g.box(LEG, sd * 0.04, 0.006, 0.02, 0.035, 0.012, 0.06); }
  }
  return g.build();
}

function gull(fly) {
  const g = new GeoBuilder(), WH = 0xf6f4ee, GR = 0xa9b3c0, TIP = 0x23232a, LEG = 0xe0a890;
  g.sphere(WH, 0, 0.3, 0, 0.24, 0.22, 0.46, 0, 0, 0, 8);
  g.sphere(GR, 0, 0.37, -0.03, 0.21, 0.09, 0.34, 0, 0, 0, 8);      // the grey mantle
  g.sphere(WH, 0, 0.47, 0.2, 0.15, 0.14, 0.17, 0, 0, 0, 8);
  g.cone(0xf2c12e, 0, 0.465, 0.32, 0.022, 0.11, 5, PI / 2);
  g.sphere(0xd8321e, 0, 0.452, 0.33, 0.016, 0.016, 0.016, 0, 0, 0, 5);
  g.box(WH, 0, 0.31, -0.25, 0.14, 0.04, 0.14);
  for (const sd of [-1, 1]) {
    g.sphere(INK, sd * 0.055, 0.495, 0.25, 0.022, 0.022, 0.022, 0, 0, 0, 5);
    if (!fly) g.sphere(GR, sd * 0.1, 0.33, -0.06, 0.07, 0.15, 0.4, 0, 0, 0, 8);
    if (fly) g.sphere(LEG, sd * 0.04, 0.2, -0.16, 0.03, 0.03, 0.08, 0, 0, 0, 6);
    else { g.cyl(LEG, sd * 0.05, 0.1, 0, 0.016, 0.2, 4); g.box(LEG, sd * 0.05, 0.007, 0.03, 0.05, 0.014, 0.08); }
  }
  if (!fly) g.sphere(TIP, 0, 0.33, -0.3, 0.16, 0.06, 0.18, 0, 0, 0, 8);   // the folded wings' black tips, crossed
  return g.build();
}

// The herons stood in the dunes block's geometry at this size (nature.js `heron` before feature 43).
function heron(fly) {
  const g = new GeoBuilder(), BODY = 0xb8c0c8, NECK = 0xd8dce0, HEAD = 0xe8ecf0, LEG = 0xc8a040, BEAK = 0xd8a030;
  if (fly) {
    g.sphere(BODY, 0, 1.05, 0, 0.36, 0.36, 0.82, 0, 0, 0, 8);
    g.sphere(NECK, 0, 1.12, 0.34, 0.2, 0.22, 0.26, 0, 0, 0, 8);    // the neck folded back in an S
    g.sphere(HEAD, 0, 1.18, 0.46, 0.17, 0.16, 0.19, 0, 0, 0, 8);
    g.cone(BEAK, 0, 1.16, 0.67, 0.04, 0.3, 5, PI / 2);
    for (const sd of [-1, 1]) g.cyl(LEG, sd * 0.06, 1.0, -0.72, 0.026, 0.72, 4, PI / 2);   // the legs trailing
  } else {
    for (const sd of [-1, 1]) g.cyl(LEG, sd * 0.1, 0.45, 0, 0.03, 0.9, 4);
    g.sphere(BODY, 0, 1.05, 0, 0.36, 0.4, 0.8, -0.3, 0, 0, 8);
    for (const sd of [-1, 1]) g.sphere(0x9aa2ac, sd * 0.12, 1.07, -0.06, 0.12, 0.3, 0.62, -0.3, 0, 0, 8);
    g.cyl(NECK, 0, 1.45, 0.35, 0.05, 0.6, 5, 0.3);
    g.sphere(HEAD, 0, 1.75, 0.45, 0.18, 0.18, 0.2, 0, 0, 0, 8);
    g.box(0x2a2a30, 0, 1.79, 0.33, 0.025, 0.025, 0.22, 0, -0.35);   // the black plume
    g.cone(BEAK, 0, 1.73, 0.65, 0.04, 0.32, 5, PI / 2);
  }
  const hy = fly ? 1.2 : 1.77, hz = fly ? 0.5 : 0.5;
  for (const sd of [-1, 1]) g.sphere(INK, sd * 0.07, hy, hz, 0.03, 0.03, 0.03, 0, 0, 0, 5);
  return g.build();
}

// White with black flight feathers, the red beak and the red legs.
function stork(fly) {
  const g = new GeoBuilder(), WH = 0xf4f2ec, BL = 0x1d1d22, RED = 0xd8321e;
  if (fly) {
    g.sphere(WH, 0, 0.98, 0, 0.34, 0.34, 0.74, 0, 0, 0, 8);
    g.cyl(WH, 0, 1.02, 0.5, 0.06, 0.42, 5, PI / 2);                // the neck stretched out
    g.sphere(WH, 0, 1.03, 0.74, 0.15, 0.14, 0.17, 0, 0, 0, 8);
    g.cone(RED, 0, 1.01, 0.98, 0.04, 0.36, 5, PI / 2 + 0.08);
    for (const sd of [-1, 1]) g.cyl(RED, sd * 0.05, 0.95, -0.74, 0.022, 0.8, 4, PI / 2);
    for (const sd of [-1, 1]) g.sphere(INK, sd * 0.06, 1.07, 0.78, 0.028, 0.028, 0.028, 0, 0, 0, 5);
  } else {
    for (const sd of [-1, 1]) g.cyl(RED, sd * 0.08, 0.41, 0, 0.028, 0.82, 4);
    g.sphere(WH, 0, 0.98, 0, 0.34, 0.36, 0.7, -0.2, 0, 0, 8);
    for (const sd of [-1, 1]) g.sphere(BL, sd * 0.11, 0.96, -0.16, 0.14, 0.25, 0.5, -0.2, 0, 0, 8);
    g.cyl(WH, 0, 1.32, 0.28, 0.065, 0.5, 5, 0.35);
    g.sphere(WH, 0, 1.58, 0.38, 0.15, 0.15, 0.17, 0, 0, 0, 8);
    g.cone(RED, 0, 1.51, 0.6, 0.045, 0.4, 5, PI / 2 + 0.35);
    for (const sd of [-1, 1]) g.sphere(INK, sd * 0.06, 1.61, 0.42, 0.028, 0.028, 0.028, 0, 0, 0, 5);
  }
  return g.build();
}

// A wing: flattened ellipsoids [colour, x (along the span), z, span, chord] on the left side (+x);
// `sd` −1 mirrors it for the right.
function wing(parts, th, sd) {
  const g = new GeoBuilder();
  for (const [c, x, z, sx, sz] of parts) g.sphere(c, sd * x, 0, z, sx, th, sz, 0, 0, 0, 8);
  return g.build();
}

// Per kind: the look (`stand`, `fly`, `wing` parts and thickness), the scale `s`, the pitch pivot
// `hip`, the wing `shoulder`; and the motion. `flap` [Hz, amplitude, bias] (rad), gliding
// `glide` (the share of the circling spent on spread wings at `glideA`), `cruise` m/s, `lift`
// [away, up] m/s for `liftSecs` after the take-off, `steer` (the velocity's damping), `lead` (how far
// ahead on its circle a bird aims, rad), `bank`; `shy` (times the scare radii), `chain` (m: the
// neighbours a lifting bird takes along), `wander` and `walk` (its steps round its spot), `peck`
// { secs, depth }, `idle` [peck, step, turn] (each idle pause's chances; the rest is standing),
// `next` [s, s] (the pause), `legs` (m from its spot when a landing bird puts its legs down).
export const KINDS = {
  duva: {
    stand: () => pigeon(false), fly: () => pigeon(true), th: 0.025, outline: 0.02,
    wing: [[0x9aa2b2, 0.15, -0.02, 0.3, 0.15], [0x4c5262, 0.27, -0.05, 0.12, 0.1]],
    s: 1.45, hip: 0.2, shoulder: [0.07, 0.25, 0.03],
    flap: [7.5, 0.95, 0.15], glide: 0.2, glideA: 0.12, cruise: 7, lift: [5.5, 3.4], liftSecs: 1.0, steer: 2.6, lead: 0.55, bank: 0.35,
    shy: 1, chain: 2.6, wander: 1.0, walk: 0.7, peck: { secs: 0.26, depth: 0.75 }, idle: [0.5, 0.3, 0.15], next: [0.4, 1.6], legs: 1.0,
  },
  mas: {
    stand: () => gull(false), fly: () => gull(true), th: 0.03, outline: 0.02,
    wing: [[0xa9b3c0, 0.3, -0.02, 0.6, 0.2], [0x23232a, 0.56, -0.04, 0.17, 0.13]],
    s: 1.3, hip: 0.3, shoulder: [0.09, 0.37, 0.04],
    flap: [3.4, 0.8, 0.1], glide: 0.55, glideA: 0.06, cruise: 8, lift: [4.5, 3.4], liftSecs: 1.2, steer: 2.0, lead: 0.5, bank: 0.45,
    shy: 1.1, chain: 4.5, wander: 0.8, walk: 0.8, peck: { secs: 0.35, depth: 0.5 }, idle: [0.18, 0.25, 0.3], next: [0.8, 2.6], legs: 1.2,
  },
  hager: {
    stand: () => heron(false), fly: () => heron(true), th: 0.04, outline: 0.03,
    wing: [[0xa8b0ba, 0.45, -0.04, 0.9, 0.4], [0x4a4f5a, 0.8, -0.08, 0.3, 0.3]],
    s: 1, hip: 1.05, shoulder: [0.15, 1.12, 0.06],
    flap: [2.0, 0.7, 0.05], glide: 0.25, glideA: 0.04, cruise: 6.5, lift: [3.2, 2.6], liftSecs: 1.6, steer: 1.5, lead: 0.45, bank: 0.3,
    shy: 1.6, chain: 14, wander: 0.5, walk: 0.3, peck: { secs: 0.5, depth: 0.45 }, idle: [0.12, 0.12, 0.15], next: [2.5, 6], legs: 2.2,
  },
  stork: {
    stand: () => stork(false), fly: () => stork(true), th: 0.04, outline: 0.03,
    wing: [[0xf4f2ec, 0.3, -0.02, 0.62, 0.42], [0x1d1d22, 0.32, -0.17, 0.6, 0.14], [0x1d1d22, 0.78, -0.06, 0.6, 0.36]],
    s: 1.05, hip: 0.98, shoulder: [0.14, 1.04, 0.06],
    flap: [2.0, 0.7, 0.05], glide: 0.45, glideA: 0.04, cruise: 7, lift: [2.8, 3.2], liftSecs: 1.6, steer: 1.5, lead: 0.45, bank: 0.3,
    shy: 1.6, chain: 14, wander: 0.4, walk: 0.3, peck: { secs: 0.5, depth: 0.4 }, idle: [0.12, 0.08, 0.2], next: [2.5, 6], legs: 2.2,
  },
};

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _mb = new THREE.Matrix4(), _ml = new THREE.Matrix4(), _mw = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3();
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// One kind's instanced meshes (standing, flying, the two wings), each with its inverted-hull
// outline on the same matrices. Few instances that move: no frustum culling, but hidden when every
// bird of the kind is far from the camera.
class Kind {
  constructor(scene, key, n) {
    const K = KINDS[key];
    this.n = n;
    this.next = 0;
    this.on = true;
    this.parts = [K.stand(), K.fly(), wing(K.wing, K.th, 1), wing(K.wing, K.th, -1)].map((geo) => {
      const im = new THREE.InstancedMesh(geo, MAT.toon, n);
      im.castShadow = true; im.receiveShadow = false; im.frustumCulled = false;
      const om = new THREE.InstancedMesh(outlineGeometry(geo), outlineMat(K.outline), n);
      om.instanceMatrix = im.instanceMatrix; om.frustumCulled = false; om.castShadow = false;
      for (let i = 0; i < n; i++) im.setMatrixAt(i, ZERO);
      scene.add(im, om);
      return { im, om };
    });
  }
  set(i, part, m) { this.parts[part].im.setMatrixAt(i, m); }
  flush() { for (const p of this.parts) p.im.instanceMatrix.needsUpdate = true; }
  show(on) {
    if (on === this.on) return;
    this.on = on;
    for (const p of this.parts) { p.im.visible = on; p.om.visible = on; }
  }
}

export class Birds {
  constructor(game, cfg = BIRDS) {
    this.g = game;
    this.cfg = cfg;
    this.rnd = mulberry32(cfg.seed);   // its own draws: the world's, the town's and Math.random's are untouched
    this.kinds = {};
    this.flocks = [];
    this.all = [];
    this.held = false;      // anything to put back when free roam ends
    this.hornSeen = null;   // the last horn press heard (game.hornAt)
    this.sorryT = -Infinity;
    this.posing = false;    // our player.anim.placate (his hands up among the birds), for `poseT` s
    this.poseT = 0;
    this.events = [];       // for tests: { t, flock, n, cause } a lift; { t, stork } the stork's steps
    this.sorryN = 0;        // the take-offs he caused on foot near him, fading over a second or so
    this.build(game.scene);
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }

  build(scene) {
    const c = this.cfg, counts = { stork: 1 };
    for (const f of c.flocks) counts[f.kind] = (counts[f.kind] || 0) + f.spots.length;
    for (const k in counts) this.kinds[k] = new Kind(scene, k, counts[k]);
    for (const f of c.flocks) {
      const bc = blockCentre(f.b[0], f.b[1]);
      const fl = { id: f.id, cfg: f, birds: [], cx: bc.x + f.loop.at[0], cz: bc.z + f.loop.at[1], dir: 1, quiet: true, cryT: 0, flapN: 0, flapT: 0 };
      for (const [lx, lz, y, yaw, perch] of f.spots) this.bird(fl, f.kind, bc.x + lx, bc.z + lz, y, yaw, perch);
      this.flocks.push(fl);
    }
    const s = c.stork, fl = this.flocks.find((f) => f.id === s.flock), bc = blockCentre(fl.cfg.b[0], fl.cfg.b[1]);
    this.stork = { b: this.bird(fl, 'stork', bc.x + s.at[0], bc.z + s.at[1], null, s.yaw, false), st: 'home', path: null, s: 0, waitT: 0, nextT: -Infinity, sc: null, trips: 0, scenes: 0 };
    for (const b of this.all) this.draw(b);
    for (const k in this.kinds) this.kinds[k].flush();
  }

  bird(fl, kind, x, z, y, yaw, perch) {
    const K = KINDS[kind], m = this.kinds[kind];
    y ??= groundAt(x, z, 0.6, 0.45);
    yaw ??= this.rnd() * TAU;
    const b = {
      fl, kind, K, m, idx: m.next++, home: { x, y, z, yaw }, base: { x, y, z }, perch: !!perch,
      x, y, z, yaw, pitch: 0, roll: 0, vx: 0, vy: 0, vz: 0,
      st: 'ground',          // ground | fly | land | trip (the stork's way to the beach and back) | beach
      t: 0, act: null, actT: 0, pecks: 0, to: null, next: this.rnd() * 2, bob: 0,
      flap: this.rnd() * TAU, wing: 0, glideT: 0, legs: false,
      liftAt: null, from: null, cause: null, R: 0, H: 0, loopEnd: 0,
    };
    this.all.push(b);
    fl.birds.push(b);
    return b;
  }

  // ---------------------------------------------------------------------------------------------

  update(dt) {
    const g = this.g;
    if (!this.live) { if (this.held) this.rest(); return; }
    this.held = true;
    const f = g.focus(), th = this.threat(f);
    // A horn press in free roam (honk.press), heard once.
    const horn = g.hornAt && g.hornAt !== this.hornSeen && g.time - g.hornAt.t < 0.2 ? g.hornAt : null;
    this.hornSeen = g.hornAt;
    this.sorryN *= Math.exp(-dt / 1.2);
    for (const fl of this.flocks) this.tickFlock(fl, dt, f, th, horn);
    this.tickStork(dt, f);
    this.tickStig(dt);
    this.render();
  }

  // Who scares them: Stig on foot (his speed, a jump's included; a kick), or his car (its speed).
  threat(f) {
    const g = this.g, c = this.cfg, p = g.player;
    if (f.car) {
      const sp = f.car.speed;
      return { x: f.x, y: f.y, z: f.z, car: true, r: sp > c.car.minSpeed ? c.car.base + sp * c.car.perSpeed : c.car.still };
    }
    if (p.state === 'hidden' || !p.root.visible) return null;
    const sp = Math.hypot(p.vx, p.onGround ? 0 : p.vy, p.vz);
    let r = c.foot.base + sp * c.foot.perSpeed;
    if (p.anim.kick > 0) r = Math.max(r, c.foot.kick);
    return { x: p.x, y: p.y, z: p.z, car: false, r };
  }

  tickFlock(fl, dt, f, th, horn) {
    const g = this.g, c = this.cfg;
    if (dist(fl.cx, fl.cz, f.x, f.z) > c.farR) { if (!fl.quiet) this.restFlock(fl); return; }
    let n = 0, gulls = false, heron = false, cause = null;
    // `quiet` (every bird on its spot) until this frame's first take-off, which picks the way round.
    fl.quiet = fl.birds.every((b) => b.st === 'ground' || b.st === 'trip' || b.st === 'beach');
    for (const b of fl.birds) {
      if (b.st === 'trip' || b.st === 'beach') continue;   // the stork away on its errand
      if ((b.st === 'ground' || b.st === 'land') && b.liftAt == null) {
        if (th && Math.abs(b.y - th.y) < c.dy && dist(b.x, b.z, th.x, th.z) < th.r * b.K.shy) this.scare(b, th.x, th.z, c.react[0] + this.rnd() * (c.react[1] - c.react[0]), th.car ? 'car' : 'foot');
        else if (horn) { const d = dist(b.x, b.z, horn.x, horn.z); if (d < c.horn.r) this.scare(b, horn.x, horn.z, d * c.horn.lag + this.rnd() * 0.15, 'horn'); }
      }
      if (b.liftAt != null && g.time >= b.liftAt) {
        cause ??= b.cause;
        this.lift(b);
        n++;
        if (b.kind === 'mas') gulls = true;
        if (b.kind === 'hager' || b.kind === 'stork') heron = true;
        if (b.cause === 'foot' && !g.playerCar && dist(b.x, b.z, g.player.x, g.player.z) < c.sorry.r) this.sorryN += b.kind === 'duva' ? 1 : 2;
      }
      if (b.st === 'fly') this.fly(b, dt, th);
      else if (b.st === 'land') this.land(b, dt, th);
      else if (b.st === 'ground') this.idle(b, dt);
    }
    fl.quiet = fl.birds.every((b) => b.st === 'ground' || b.st === 'trip' || b.st === 'beach');
    // Sound: a flap for the take-offs of the last 0.15 s, the gulls' cry, the herons' croak.
    const vol = clamp(1 - dist(fl.cx, fl.cz, f.x, f.z) / c.sound.r, 0, 1);
    if (n) {
      this.events.push({ t: +g.time.toFixed(2), flock: fl.id, n, cause });
      if (this.events.length > 60) this.events.shift();
      if (vol > 0.04 && gulls && fl.cryT <= 0) { audio.gull(vol, 1); fl.cryT = 0.5; }
      if (vol > 0.04 && heron && fl.cryT <= 0) { audio.gull(vol, c.sound.croak); fl.cryT = 1.5; }
    }
    fl.flapN += n;
    fl.flapT -= dt;
    if (fl.flapN && fl.flapT <= 0) { if (vol > 0.04) audio.flap(fl.flapN, vol); fl.flapN = 0; fl.flapT = 0.15; }
    fl.cryT -= dt;
    // The gulls cry now and then while they circle.
    if (fl.cfg.kind === 'mas' && !fl.quiet && fl.cryT <= 0) {
      fl.cryT = c.sound.cry[0] + this.rnd() * (c.sound.cry[1] - c.sound.cry[0]);
      if (vol > 0.04) audio.gull(vol * 0.7, 0.9 + this.rnd() * 0.25);
    }
  }

  // b will lift `delay` s from now, away from (x, z).
  scare(b, x, z, delay, cause) {
    b.liftAt = this.g.time + delay;
    b.from = { x, z };
    b.cause = cause;
  }

  lift(b) {
    const K = b.K, fl = b.fl, L = fl.cfg.loop, r = this.rnd;
    // Its neighbours on the ground follow it up a moment later.
    for (const o of fl.birds) {
      if (o === b || o.liftAt != null || (o.st !== 'ground' && o.st !== 'land')) continue;
      if (dist(o.x, o.z, b.x, b.z) < Math.max(K.chain, o.K.chain)) this.scare(o, b.from.x, b.from.z, 0.05 + r() * 0.2, b.cause);
    }
    // The stork goes to the Storches instead, when they are on the beach.
    if (b === this.stork.b && this.tripOk()) { this.startTrip(); return; }
    if (fl.quiet) { fl.dir = r() < 0.5 ? -1 : 1; fl.quiet = false; }   // the first take-off picks the way round
    let ex = b.x - b.from.x, ez = b.z - b.from.z, l = Math.hypot(ex, ez);
    if (l < 0.05) { const a = r() * TAU; ex = Math.cos(a); ez = Math.sin(a); l = 1; }
    const a = Math.atan2(ez, ex) + (r() - 0.5) * 1.1;
    b.ex = Math.cos(a); b.ez = Math.sin(a);
    b.st = 'fly';
    b.t = 0;
    b.liftAt = null;
    b.act = null; b.pitch = 0; b.legs = false;
    b.vx = b.ex * K.lift[0] * 0.5; b.vz = b.ez * K.lift[0] * 0.5; b.vy = K.lift[1] * 0.8;
    b.R = L.r * (0.8 + r() * 0.4);
    b.H = lerp(L.h[0], L.h[1], r());
    b.loopEnd = lerp(L.secs[0], L.secs[1], r());
    b.glideT = 0;
  }

  // On the ground: peck, take a step round its spot, turn, or stand.
  idle(b, dt) {
    const K = b.K, r = this.rnd;
    if (b.act === 'peck') {
      b.actT += dt;
      const ph = b.actT / K.peck.secs;
      b.pitch = Math.sin(Math.min(1, ph) * PI) * K.peck.depth;
      if (ph >= 1) { if (--b.pecks > 0) b.actT = 0; else { b.act = null; b.pitch = 0; } }
      return;
    }
    if (b.act === 'step') {
      const dx = b.to.x - b.x, dz = b.to.z - b.z, d = Math.hypot(dx, dz), st = Math.min(d, K.walk * dt);
      b.yaw = dampAngle(b.yaw, yawTo(dx, dz), 10, dt);
      if (d > 1e-3) { b.x += (dx / d) * st; b.z += (dz / d) * st; }
      b.bob += dt * 14;
      b.y = b.base.y + Math.abs(Math.sin(b.bob)) * 0.012 * K.s;
      if (d < 0.02) { b.act = null; b.y = b.base.y; }
      return;
    }
    if (b.act === 'turn') {
      b.yaw = dampAngle(b.yaw, b.to, 7, dt);
      if (Math.abs(angleDiff(b.yaw, b.to)) < 0.04) b.act = null;
      return;
    }
    b.next -= dt;
    if (b.next > 0) return;
    b.next = lerp(K.next[0], K.next[1], r());
    const u = r(), [pk, sp, tn] = K.idle;
    if (u < pk) { b.act = 'peck'; b.actT = 0; b.pecks = 1 + Math.floor(r() * 3); }
    else if (u < pk + sp && !b.perch && b.st === 'ground') {
      const a = r() * TAU, d = r() * K.wander;
      b.act = 'step'; b.to = { x: b.base.x + Math.cos(a) * d, z: b.base.z + Math.sin(a) * d };
    } else if (u < pk + sp + tn) { b.act = 'turn'; b.to = b.yaw + (r() - 0.5) * 3; }
  }

  // Up and away, then round the flock's circle, then down to its spot (when the way is clear).
  fly(b, dt, th) {
    const K = b.K, fl = b.fl, c = this.cfg;
    b.t += dt;
    let dx, dy, dz, sp;
    if (b.t < K.liftSecs) {
      dx = b.ex * K.lift[0]; dy = K.lift[1]; dz = b.ez * K.lift[0]; sp = 1;
    } else {
      const a = Math.atan2(b.z - fl.cz, b.x - fl.cx) + fl.dir * K.lead;
      dx = fl.cx + Math.cos(a) * b.R - b.x; dz = fl.cz + Math.sin(a) * b.R - b.z;
      dy = b.H + Math.sin(this.g.time * 0.7 + b.idx) * 0.6 - b.y;
      const l = Math.hypot(dx, dy, dz) || 1;
      sp = K.cruise / l;
    }
    this.steer(b, dx * sp, dy * sp, dz * sp, dt);
    this.wings(b, dt, b.t < K.liftSecs || b.vy > 1.2 ? 1.4 : 1, b.t >= K.liftSecs);
    // Time to land: from its own side of the circle (it does not cut across the middle), once nobody
    // stands at its spot.
    if (b.t >= b.loopEnd) {
      const h = b.home, ha = Math.atan2(h.z - fl.cz, h.x - fl.cx), ba = Math.atan2(b.z - fl.cz, b.x - fl.cx);
      const clear = !th || dist(h.x, h.z, th.x, th.z) > th.r * K.shy + c.clear;
      if (clear && (Math.abs(angleDiff(ba, ha)) < 1.0 || b.t > b.loopEnd + 15)) { b.st = 'land'; b.landT = 0; }
    }
  }

  // The approach: a glide that sinks as the spot comes nearer, the legs down for the last metre.
  land(b, dt, th) {
    const K = b.K, h = b.home, c = this.cfg;
    b.t += dt;
    b.landT += dt;
    if (th && dist(h.x, h.z, th.x, th.z) < th.r * K.shy + c.clear * 0.5) { b.st = 'fly'; b.loopEnd = b.t + 3 + this.rnd() * 3; b.legs = false; return; }
    const dx = h.x - b.x, dz = h.z - b.z, dh = Math.hypot(dx, dz), d = Math.hypot(dh, h.y - b.y);
    if (d < 0.12 || b.landT > 25) { this.settle(b); return; }
    const ty = h.y + dh * 0.45 - b.y, l = Math.hypot(dx, ty, dz) || 1, sp = clamp(d * 1.1, 0.5, K.cruise) / l;
    this.steer(b, dx * sp, ty * sp, dz * sp, dt, 3.2);
    b.legs = d < K.legs * K.s;
    this.wings(b, dt, d < 3 ? 1.5 : 1, d > 4);
  }

  settle(b) {
    const h = b.home;
    b.st = 'ground';
    b.x = h.x; b.y = h.y; b.z = h.z;
    b.base = { x: h.x, y: h.y, z: h.z };
    b.vx = b.vy = b.vz = 0;
    b.pitch = 0; b.roll = 0; b.legs = false;
    b.act = null; b.next = 0.4 + this.rnd() * 1.2;
    b.liftAt = null; b.cause = null;
  }

  // Velocity damped towards (vx, vy, vz); heading, pitch and bank follow it.
  steer(b, vx, vy, vz, dt, k = b.K.steer) {
    const K = b.K;
    b.vx = damp(b.vx, vx, k, dt); b.vy = damp(b.vy, vy, k, dt); b.vz = damp(b.vz, vz, k, dt);
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    this.face(b, dt, K);
  }
  face(b, dt, K) {
    const hs = Math.hypot(b.vx, b.vz);
    if (hs > 0.3) {
      const ny = yawTo(b.vx, b.vz), turn = angleDiff(b.yaw, ny);
      b.yaw = dampAngle(b.yaw, ny, 7, dt);
      b.roll = damp(b.roll, clamp(-turn * K.bank * 4, -0.7, 0.7), 4, dt);
    }
    b.pitch = damp(b.pitch, clamp(-Math.atan2(b.vy, Math.max(hs, 0.5)) * 0.6, -0.5, 0.5), 5, dt);
  }
  // Flapping (`rate` times its beat), or gliding on spread wings now and then when `canGlide`.
  wings(b, dt, rate, canGlide) {
    const K = b.K, [hz, amp, bias] = K.flap;
    if (b.glideT > 0) {
      b.glideT -= dt;
      b.wing = damp(b.wing, K.glideA, 8, dt);
      if (rate > 1 || !canGlide) b.glideT = 0;
      return;
    }
    b.flap += dt * hz * TAU * rate;
    b.wing = bias + amp * Math.sin(b.flap);
    // Glides of 0.8–2.4 s, started so that about `glide` of the time is spent gliding.
    if (canGlide && rate === 1 && this.rnd() < (K.glide / (1 - K.glide) / 1.6) * dt) b.glideT = 0.8 + this.rnd() * 1.6;
  }

  // ---------------------------------------------------------------------------------------------
  // The stork

  // The Storches standing on the beach at playa, free: [herr, fru], else null.
  pair() {
    const g = this.g, c = this.cfg.stork, l = lm(c.beach), out = [];
    for (const k of c.pair) {
      const n = g.npc(k);
      if (!n || n.state !== 'normal' || !n.root.visible || n.car || n.seatId) return null;
      if (dist(n.x, n.z, l.x, l.z) > c.pairR || (g.npcPosed(k) && !this.posed(k))) return null;
      out.push(n);
    }
    return out;
  }
  tripOk() { return this.stork.st === 'home' && this.g.time >= this.stork.nextT && !!this.pair(); }

  // A cubic Bézier from p0 over the two `via` points to p3, its arc length tabulated (64 steps);
  // `y0`/`y3` the ends' heights, `cruise` m over them in between.
  path(p0, via, p3) {
    const P = [p0, ...via, p3], pts = [], N = 64;
    let len = 0;
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t, w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      const x = w.reduce((a, k, j) => a + k * P[j].x, 0), z = w.reduce((a, k, j) => a + k * P[j].z, 0);
      if (i) len += Math.hypot(x - pts[i - 1].x, z - pts[i - 1].z);
      pts.push({ x, z, s: len });
    }
    return { pts, len, y0: p0.y, y3: p3.y };
  }
  pathAt(P, s) {
    const c = this.cfg.stork, pts = P.pts;
    let i = 1;
    while (i < pts.length - 1 && pts[i].s < s) i++;
    const a = pts[i - 1], b = pts[i], k = clamp((s - a.s) / ((b.s - a.s) || 1), 0, 1), u = s / P.len;
    const y = lerp(P.y0, P.y3, u) + c.cruise * sstep(0, 0.2, u) * (1 - sstep(0.72, 1, u));
    return { x: lerp(a.x, b.x, k), y, z: lerp(a.z, b.z, k) };
  }

  // Where it lands: `side` m beyond Fru Storch from her husband, facing her.
  beachSpot() {
    const [herr, fru] = this.pair(), c = this.cfg.stork;
    const hx = herr.homeX ?? herr.x, hz = herr.homeZ ?? herr.z, fx = fru.homeX ?? fru.x, fz = fru.homeZ ?? fru.z;
    let dx = fx - hx, dz = fz - hz, l = Math.hypot(dx, dz);
    if (l < 0.3) { dx = 1; dz = 0; l = 1; }
    const x = fx + (dx / l) * c.side, z = fz + (dz / l) * c.side;
    return { x, z, y: groundAt(x, z, 0.6, 0.45) };
  }

  startTrip() {
    const S = this.stork, b = S.b, c = this.cfg.stork, to = this.beachSpot();
    S.st = 'out';
    S.path = this.path({ x: b.x, y: b.y, z: b.z }, c.via.map(([x, z]) => ({ x, z })), to);
    S.to = to;
    S.s = 0;
    S.trips++;
    b.st = 'trip'; b.liftAt = null; b.act = null; b.legs = false; b.glideT = 0;
    b.vx = b.vy = b.vz = 0;
    this.log('out');
  }
  flyHome() {
    const S = this.stork, b = S.b, c = this.cfg.stork, h = b.home;
    S.st = 'back';
    S.path = this.path({ x: b.x, y: b.y, z: b.z }, c.via.slice().reverse().map(([x, z]) => ({ x, z })), { x: h.x, y: h.y, z: h.z });
    S.s = 0;
    S.sc = null;
    b.st = 'trip'; b.act = null; b.pitch = 0; b.legs = false; b.glideT = 0;
    const f = this.g.focus(), vol = clamp(1 - dist(b.x, b.z, f.x, f.z) / this.cfg.sound.r, 0, 1);
    if (vol > 0.04) audio.flap(1, vol);
    this.log('back');
  }
  log(stork) { this.events.push({ t: +this.g.time.toFixed(2), stork }); if (this.events.length > 60) this.events.shift(); }

  tickStork(dt, f) {
    const g = this.g, S = this.stork, b = S.b, c = this.cfg.stork, K = b.K;
    if (S.st === 'out' || S.st === 'back') {
      const left = S.path.len - S.s, sp = c.speed * clamp(left / 14 + 0.2, 0.25, 1) * Math.min(1, 0.35 + S.s / 10);
      S.s = Math.min(S.path.len, S.s + sp * dt);
      const q = this.pathAt(S.path, S.s), px = b.x, py = b.y, pz = b.z;
      b.x = q.x; b.y = q.y; b.z = q.z;
      b.vx = (b.x - px) / dt; b.vy = (b.y - py) / dt; b.vz = (b.z - pz) / dt;
      this.face(b, dt, K);
      const u = S.s / S.path.len;
      b.legs = left < K.legs;
      this.wings(b, dt, u < 0.2 || left < 6 ? 1.3 : 1, u > 0.2 && left > 10);
      if (S.s >= S.path.len - 1e-3) {
        if (S.st === 'out') {
          S.st = 'beach';
          S.waitT = 0;
          b.st = 'beach';
          b.base = { x: S.to.x, y: S.to.y, z: S.to.z };
          b.x = S.to.x; b.y = S.to.y; b.z = S.to.z;
          const fru = g.npc(c.pair[1]);
          b.yaw = fru ? yawTo(fru.x - b.x, fru.z - b.z) : b.yaw;
          b.vx = b.vy = b.vz = 0; b.pitch = b.roll = 0; b.legs = false; b.act = null; b.next = 1;
          this.log('beach');
        } else {
          this.settle(b);
          S.st = 'home';
          S.nextT = g.time + c.again;
          this.log('home');
        }
      }
      return;
    }
    if (S.st === 'beach') {
      this.idle(b, dt);
      S.waitT += dt;
      const pair = this.pair();
      if (!pair || S.waitT > c.waitSecs) { this.flyHome(); return; }
      if (dist(b.x, b.z, f.x, f.z) < c.sceneR && !g.inDialog && !g.chat?.busy) this.startScene(pair);
      return;
    }
    if (S.st === 'scene') this.tickScene(dt);
  }

  startScene([herr, fru]) {
    const S = this.stork;
    S.st = 'scene';
    S.sc = { t: 0, stig: null, corrected: null, film: null, filmEnd: null, herr, fru };
    S.scenes++;
    herr.chatT = fru.chatT = 9;   // no chatter bubble over the scene
    this.log('scene');
  }

  // "Oj, en stork!", Fru Storch's correction (the first time ever), Herr Storch films it, home.
  tickScene(dt) {
    const g = this.g, S = this.stork, sc = S.sc, b = S.b, c = this.cfg.stork, p = g.player;
    sc.t += dt;
    this.idle(b, dt);
    if (!this.pair() && !sc.film) { this.endFilm(); this.flyHome(); return; }
    if (sc.stig == null) {
      if (!g.saying(p) || sc.t > 2.5) { g.say(p, c.stig, 2.4); sc.stig = sc.t; }
      return;
    }
    if (sc.corrected == null && sc.t >= sc.stig + c.correctAt) {
      sc.corrected = !g.records.stork;
      if (sc.corrected) {
        g.say(sc.fru, c.correct[1], 3.2);
        g.records.stork = true;
        g.save();
      }
      sc.filmAt = sc.t + (sc.corrected ? c.filmAt : 0.4);
    }
    if (sc.corrected == null) return;
    if (sc.film == null && sc.t >= sc.filmAt) {
      // Not while he is out filming Stig's own tricks (game/storchFilm.js has him then).
      sc.film = !g.film.st && !g.film.view;
      if (sc.film) { sc.herr.anim.film = true; audio.whirr(c.filmSecs * 0.8); sc.herr.chatT = c.filmSecs + 4; }
      sc.filmEnd = sc.t + (sc.film ? c.filmSecs : 1);
    }
    if (sc.film && g.film.st) sc.film = false;   // off to film one of Stig's tricks (storchFilm.js has him)
    if (sc.film) sc.herr.yaw = dampAngle(sc.herr.yaw, yawTo(b.x - sc.herr.x, b.z - sc.herr.z), 6, dt);
    if (sc.filmEnd != null && sc.t >= sc.filmEnd) { this.endFilm(); this.flyHome(); }
  }
  endFilm() {
    const sc = this.stork.sc;
    if (sc?.film && !this.g.film.st) sc.herr.anim.film = false;
    if (sc) sc.film = false;
  }
  // main.js npcPosed: Herr Storch while he films the stork (no turn to Stig, no wave, no chatter).
  posed(key) { const sc = this.stork?.sc; return !!sc?.film && key === this.cfg.stork.pair[0]; }

  // ---------------------------------------------------------------------------------------------
  // Stig among the birds: his sorry and his hands up.

  tickStig(dt) {
    const g = this.g, c = this.cfg.sorry, p = g.player;
    if (this.sorryN >= c.min && g.time - this.sorryT > c.every && !g.saying(p) && !g.inDialog && p.state === 'normal') {
      this.sorryT = g.time;
      this.sorryN = 0;
      g.say(p, c.line, 2.2);
      if (!p.anim.placate && !g.dogs?.pose) { p.anim.placate = 1; this.posing = true; this.poseT = c.poseSecs; }
    }
    if (this.posing) {
      this.poseT -= dt;
      if (this.poseT <= 0 || g.playerCar || p.state !== 'normal') this.unpose();
    }
  }
  unpose() {
    const p = this.g.player;
    if (this.posing && p.anim.placate === 1 && !this.g.dogs?.pose) p.anim.placate = 0;
    this.posing = false;
    this.poseT = 0;
  }

  // ---------------------------------------------------------------------------------------------

  // A flock left behind (Stig `farR` m off): every bird home on its spot.
  restFlock(fl) {
    for (const b of fl.birds) if (b.st !== 'trip' && b.st !== 'beach') this.settle(b);
    fl.quiet = true;
    for (const b of fl.birds) this.draw(b);
    for (const k in this.kinds) this.kinds[k].flush();
  }
  // Free roam ends (a mission, the other level): every bird still on its spot, the stork home, the
  // scene's camera down, his hands down.
  rest() {
    const S = this.stork;
    this.endFilm();
    S.st = 'home'; S.sc = null; S.path = null; S.nextT = -Infinity;
    for (const b of this.all) { this.settle(b); b.yaw = b.home.yaw; b.next = 1; }
    for (const fl of this.flocks) fl.quiet = true;
    this.unpose();
    for (const b of this.all) this.draw(b);
    for (const k in this.kinds) { this.kinds[k].flush(); this.kinds[k].show(true); }
    this.held = false;
  }

  render() {
    const f = this.g.focus(), cx = camera.position.x, cz = camera.position.z, near = {};
    for (const b of this.all) {
      if (b.st === 'ground' && b.fl.quiet && b !== this.stork.b && dist(b.fl.cx, b.fl.cz, f.x, f.z) > this.cfg.farR) continue;
      this.draw(b);
    }
    for (const b of this.all) { const d = dist(b.x, b.z, cx, cz); near[b.kind] = Math.min(near[b.kind] ?? Infinity, d); }
    for (const k in this.kinds) { this.kinds[k].show(near[k] < this.cfg.drawR); this.kinds[k].flush(); }
  }

  // The bird's matrices: the body pitched about its hip; the wings at their shoulders.
  draw(b) {
    const K = b.K, m = b.m, h = K.hip * K.s, air = b.st === 'fly' || b.st === 'land' || b.st === 'trip';
    _q.setFromEuler(_e.set(b.pitch, b.yaw, b.roll, 'YXZ'));
    _v.set(0, h, 0).applyQuaternion(_q);
    _mb.compose(_p.set(b.x - _v.x, b.y + h - _v.y, b.z - _v.z), _q, _s.setScalar(K.s));
    const legs = !air || b.legs;
    m.set(b.idx, 0, legs ? _mb : ZERO);
    m.set(b.idx, 1, legs ? ZERO : _mb);
    for (const sd of [1, -1]) {
      if (!air) { m.set(b.idx, sd > 0 ? 2 : 3, ZERO); continue; }
      _ml.compose(_p.set(sd * K.shoulder[0], K.shoulder[1], K.shoulder[2]), _q.setFromEuler(_e.set(0, 0, sd * b.wing, 'YXZ')), _s.setScalar(1));
      _mw.multiplyMatrices(_mb, _ml);
      m.set(b.idx, sd > 0 ? 2 : 3, _mw);
    }
  }
}
