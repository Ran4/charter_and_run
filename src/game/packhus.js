// Stig på löpande band – sortera tomater i packhuset (free roam; feature 109, DESIGN §10.49). On the
// packing shed's yard in block (3,0) a foreman in a cap waves Stig in by day: they need people for the
// shift. On the island with no mission running (`missions.state === 'idle'`), E at the foreman ("E Ta ett
// skift") puts Stig behind a sorting belt for a short shift with a fixed camera: behind a black fade the
// belt, its bins (ROJOS, the bucket, VERDES), two workers and the tomatoes appear. None of it exists in a
// mission or between shifts (no solid, no collider; built at the first shift and hidden after it). The
// tomatoes come along the belt faster and faster; A, S and D throw the one in the yellow zone into ROJOS,
// the bucket or VERDES. A wrong bin bounces it out onto the ground and a missed one drops off the belt's
// end onto the pile; at `pileMax` on the ground the pile gives way (TOMATRAS!) and Stig stands there with
// his arms full saying sorry. A full box gets the stamp KONTROLLERAD AV G17, a whole shift pays 100
// pesetas, and the most boxes filled in a shift is the record (`records.packhus`, saved). Afterwards Siv
// at the pool can tell him to relax. A mission start or the other level ends a shift at once
// (`last.kind` 'gone'). Config: LOPANDE_BAND (content/island.js). Owned by Game as `packhus`: main.js
// calls `update` once a frame and `step` in its fixed step, and counts `extras` (the foreman while he is
// shown) as people.

import { LOPANDE_BAND } from '../content/index.js';
import { THREE, scene, camera, GeoBuilder, toonMesh, outlineGeometry, outlineMat, MAT, signMesh } from '../gfx.js';
import { Character } from '../actors/character.js';
import { randomPed } from '../actors/models.js';
import { blockCentre } from '../world/landmarks-island.js';
import { CURB } from '../world/layout.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { fmt } from '../strings.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { clamp, dist, lerp, mulberry32, yawTo, dampAngle } from '../util.js';

export const TOMATO_KINDS = ['rojo', 'verde', 'podrido'];
const R = 0.13;              // a tomato's radius (oversized, so it reads from the camera)
const CAP = 48;              // instances per kind
const FLOOR = CURB + 0.022;  // the yard's dirt (nature.js tomatPackhus)
const BOX = { w: 0.8, h: 0.38, d: 0.56 };
const SLOTS = [[-0.25, -0.12, 0], [0, -0.12, 0], [0.25, -0.12, 0], [-0.125, 0.12, 0.08], [0.125, 0.12, 0.08]];   // [x, z, up] in a crate
const STACK = 4;             // crates a stack high (then a second stack outside it)
const KEY = { rojo: 'R', verde: 'L', podrido: 'C' };   // Stig's throw: ROJOS on his right, VERDES on his left
const ease = (k) => (1 - Math.cos(Math.PI * clamp(k, 0, 1))) / 2;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere();

function tomatoGeo(kind) {
  const g = new GeoBuilder();
  if (kind === 'rojo') {
    g.sphere(0xd8321e, 0, 0, 0, 2 * R, 1.76 * R, 2 * R, 0, 0, 0, 12);
    g.sphere(0xf06a50, -0.35 * R, 0.35 * R, 0.45 * R, 0.5 * R, 0.4 * R, 0.5 * R);
    for (let k = 0; k < 3; k++) g.box(0x3f7a3a, 0, 0.88 * R, 0, 1.0 * R, 0.08 * R, 0.24 * R, (k * Math.PI) / 3);
    g.cyl(0x2f6a2a, 0, 1.0 * R, 0, 0.1 * R, 0.4 * R, 6);
  } else if (kind === 'verde') {
    g.sphere(0x8cc43c, 0, 0, 0, 1.9 * R, 1.66 * R, 1.9 * R, 0, 0, 0, 12);
    g.sphere(0xc4e27a, -0.35 * R, 0.32 * R, 0.42 * R, 0.5 * R, 0.4 * R, 0.5 * R);
    for (let k = 0; k < 3; k++) g.box(0x2f5a2a, 0, 0.83 * R, 0, 0.95 * R, 0.08 * R, 0.24 * R, (k * Math.PI) / 3);
    g.cyl(0x2a4a24, 0, 0.95 * R, 0, 0.1 * R, 0.4 * R, 6);
  } else {
    // Rotten: squat, brown, split, with dark spots and a grey bloom of mould.
    g.sphere(0x6e4a2c, 0, -0.12 * R, 0, 2.1 * R, 1.4 * R, 2.0 * R, 0, 0, 0.12, 12);
    for (const [x, y, z, s] of [[0.55, 0.1, 0.5, 0.55], [-0.6, 0.05, 0.4, 0.45], [0.1, 0.38, -0.55, 0.5], [-0.2, -0.1, 0.85, 0.4]]) g.sphere(0x2a1c12, x * R, y * R, z * R, s * R, 0.3 * s * R, s * R);
    g.sphere(0x9aa08a, -0.25 * R, 0.45 * R, 0.1 * R, 0.8 * R, 0.25 * R, 0.6 * R);
    g.box(0x3a2a1a, 0, 0.5 * R, 0, 0.9 * R, 0.08 * R, 0.2 * R, 0.6);
  }
  return g.build();
}

function crateGeo() {
  const g = new GeoBuilder(), W = BOX.w, H = BOX.h, D = BOX.d, WOOD = 0xc08a4a, DARK = 0x9a6a3a;
  g.boxB(DARK, 0, 0, 0, W, 0.03, D);
  for (const y of [0.03, 0.21]) {
    for (const s of [-1, 1]) {
      g.boxB(WOOD, 0, y, s * (D / 2 - 0.012), W, 0.14, 0.024);
      g.boxB(WOOD, s * (W / 2 - 0.012), y, 0, 0.024, 0.14, D);
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.boxB(DARK, sx * (W / 2 - 0.025), 0, sz * (D / 2 - 0.025), 0.05, H, 0.05);
  return g.build();
}

export class Packhus {
  constructor(game, cfg = LOPANDE_BAND) {
    this.g = game;
    this.cfg = cfg;
    this.c0 = blockCentre(cfg.b[0], cfg.b[1]);
    this.sc = null;          // the shift under way (see start)
    this.built = false;      // the belt, the bins, the workers (built at the first shift)
    this.extras = [];        // the foreman while he is shown (main.js counts him as a person)
    this.shown = false;      // the foreman on the yard
    this.callNear = false;   // Stig within callR on the last frame
    this.callT = -Infinity;
    this.sivDue = false;     // Siv's line waits for him at the pool
    this.seed = cfg.seed;    // the next shift's draws (tests may set it)
    this.shifts = 0;         // tests: shifts started this session
    this.auto = null;        // tests: { react (s), wrong (0..1) } sorts by itself
    this.last = null;        // tests: { kind: 'done' | 'ras' | 'quit' | 'gone', t, boxes, dropped, sorted, pay, record, ended }
    this.boss = new Character(this.bossDef());
    this.boss.state = 'hidden';
    this.boss.root.visible = false;
    scene.add(this.boss.root);
    game.addInteractable({
      id: 'packhus', r: cfg.r, prompt: cfg.prompt,
      pos: () => this.at(cfg.boss.at),
      enabled: () => this.canUse(),
      use: () => this.start(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get busy() { return !!this.sc; }
  // Running: the belt moves and A/S/D sort (tests).
  get running() { return this.sc?.phase === 'run'; }
  get best() { return this.g.records.packhus ?? 0; }

  // Block-local [x, z] (and an absolute y) to world.
  at([x, z], y = FLOOR) { return new THREE.Vector3(this.c0.x + x, y, this.c0.z + z); }
  bossSpot() { return this.at(this.cfg.boss.at); }

  canUse() {
    const g = this.g, p = g.player, b = this.boss, s = this.bossSpot();
    return this.live && !this.sc && this.shown && g.day.isDay() && b.state === 'normal' && dist(b.x, b.z, s.x, s.z) < 1
      && !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying
      && p.state === 'normal' && p.onGround && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active
      && !g.skis.on && !g.gatlopp.mode && !g.fiske.busy && !g.kikare.busy && !g.hitch.onTruck;
  }

  // ---------------------------------------------------------------------------------------------
  // The people

  // A local in a cap (randomPed's locals: a white shirt and dark trousers), sleeves rolled up.
  bossDef() {
    let d, seed = this.cfg.seed;
    for (;;) { d = randomPed(mulberry32(seed++)); if (d.local && !d.lashes) break; }
    return { ...d, name: 'Förmannen', scale: 1.02, wide: Math.max(1.05, d.wide), hat: 'cap', hatC: 0x2f4f7a, peakC: 0x1d2a44, shirt: 0xf4f0e6,
      longSleeves: false, collar: true, vest: null, bowtie: null, pants: 0x5a4632, mustache: d.hairC, stache: 'thick', held: null, voice: 215 };
  }
  workerDef(w, k) {
    let d, seed = w.seed;
    const woman = k === 0;
    for (;;) { d = randomPed(mulberry32(seed++)); if (d.local && !!d.lashes === woman) break; }
    return woman
      ? { ...d, hat: 'scarf', hatC: 0xd8321e, dress: 0x2a2a34, shirt: 0x2a2a34, longSleeves: false, apron: 0xf4f0e6, held: null }
      : { ...d, hat: 'cap', hatC: 0x8a6a3a, shirt: 0xd8d0b0, longSleeves: false, vest: null, bowtie: null, apron: 0xe8e0c8, pants: 0x4a3a2a, held: null };
  }

  // A pop in or out of the world where nobody sees it: off the camera's view or far.
  mayPop(x, y, z) {
    if (camera.position.distanceTo(_p.set(x, y, z)) > 70) return true;
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_pm);
    return !_frustum.intersectsSphere(_sphere.set(_p, 1.4));
  }

  showBoss(on) {
    const b = this.boss, s = this.bossSpot();
    if (on) {
      b.state = 'normal';
      b.teleport(s.x, s.z, this.cfg.boss.yaw);
      b.root.visible = true;
      this.extras = [b];
    } else {
      this.g.unsay(b);
      b.state = 'hidden';
      b.root.visible = false;
      this.extras = [];
      this.clearAnim(b);
    }
    this.shown = on;
  }

  clearAnim(ch) {
    const a = ch.anim;
    a.wave = a.point = a.scratch = a.cheer = a.tap = a.placate = a.sort = a.talk = false;
    a.sortK = 0;
  }

  // main.js fixedStep: in free roam back to his spot when pushed off it or up after a kick.
  step(h) {
    if (!this.shown) return;
    const b = this.boss;
    if (!this.sc && b.state === 'normal') {
      const s = this.bossSpot(), dx = s.x - b.x, dz = s.z - b.z, d = Math.hypot(dx, dz);
      const sp = d > 0.12 ? Math.min(1.6, 0.4 + d * 1.6) : 0;
      b.wishX = sp ? (dx / d) * sp : 0; b.wishZ = sp ? (dz / d) * sp : 0;
    } else b.wishX = b.wishZ = 0;
    b.step(h, this.g);
  }

  tickBoss(dt) {
    const g = this.g, c = this.cfg, b = this.boss, p = g.player, s = this.bossSpot();
    const want = !!this.sc || (this.live && g.day.isDay());
    if (want !== this.shown) {
      if (this.sc || this.mayPop(s.x, s.y + 1, s.z) && (!this.shown || this.mayPop(b.x, b.y + 1, b.z))) this.showBoss(want);
      else if (!want && !this.live) this.showBoss(false);   // a mission or the other level: at once
    }
    if (!this.shown) return;
    b.anim.talk = g.saying(b);
    if (!this.sc) {
      // Far off (a car's knock) and nobody looking: back on his spot.
      const d = dist(b.x, b.z, s.x, s.z);
      if (b.state === 'normal' && d > 25 && this.mayPop(b.x, b.y + 1, b.z)) b.teleport(s.x, s.z, c.boss.yaw);
      const near = !g.playerCar ? dist(p.x, p.z, b.x, b.z) : Infinity;
      const free = b.state === 'normal' && d < 1 && this.live && !g.inDialog && !g.shame.pursuit;
      if (b.state === 'normal') b.yaw = dampAngle(b.yaw, free && near < c.waveR ? yawTo(p.x - b.x, p.z - b.z) : c.boss.yaw, 5, dt);
      b.anim.wave = free && near < c.waveR && near > 2.6;
      const inR = free && near < c.callR;
      if (inR && !this.callNear && g.time - this.callT > c.callGap && !g.saying(b)) {
        this.callT = g.time;
        g.say(b, this.shifts ? c.callAgain : c.call, 2.6);
      }
      this.callNear = inR;
    }
    if (b.root.visible) b.sync(dt);
  }

  // After a shift: Siv at the pool tells him to relax, once, when he passes her on foot.
  tickSiv() {
    if (!this.sivDue || this.sc) return;
    const g = this.g, n = g.npc('siv'), p = g.player;
    if (!n || !this.live || g.inDialog || g.playerCar || g.chat.busy || !g.honk.free('siv') || g.saying(n)) return;
    if (dist(n.x, n.z, p.x, p.z) > this.cfg.sivR || Math.abs(n.y - p.y) > 1.5) return;
    this.sivDue = false;
    g.say(n, this.cfg.siv, 2.8);
    n.chatT = Math.max(n.chatT ?? 0, 8);
    this.sivSaid = g.time;
  }

  // ---------------------------------------------------------------------------------------------
  // The belt and its things (built at the first shift)

  build() {
    if (this.built) return;
    this.built = true;
    const c = this.cfg, B = c.belt, Y = FLOOR + B.top, L = B.x1 - B.x0, cx = (B.x0 + B.x1) / 2;
    this.root = new THREE.Group();
    this.root.position.set(this.c0.x, 0, this.c0.z);
    this.root.visible = false;
    scene.add(this.root);
    const g = new GeoBuilder(), STEEL = 0x8a9094, DARK = 0x5a5e66, YEL = 0xf7c31b;
    g.box(0x2c2c30, cx, Y - 0.04, B.z, L + 0.24, 0.08, B.w);
    for (const sz of [-1, 1]) {
      g.box(STEEL, cx, Y + 0.02, B.z + sz * (B.w / 2 + 0.035), L + 0.36, 0.11, 0.06);
      g.box(DARK, cx, Y - 0.16, B.z + sz * (B.w / 2 + 0.035), L + 0.3, 0.14, 0.05);
    }
    for (const x of [B.x0 - 0.12, B.x1 + 0.12]) g.cyl(DARK, x, Y - 0.05, B.z, 0.07, B.w + 0.1, 12, Math.PI / 2);
    for (let x = B.x0 + 0.2; x <= B.x1; x += (L - 0.4) / 5) {
      for (const sz of [-1, 1]) g.boxB(DARK, x, FLOOR, B.z + sz * (B.w / 2 - 0.02), 0.07, B.top - 0.22, 0.07);
      g.box(DARK, x, FLOOR + 0.3, B.z, 0.05, 0.05, B.w);
    }
    // The sorting zone: yellow on both rails and two short posts on the front rail at its ends.
    const [z0, z1] = c.zone;
    for (const sz of [-1, 1]) g.box(YEL, (z0 + z1) / 2, Y + 0.08, B.z + sz * (B.w / 2 + 0.035), z1 - z0, 0.012, 0.075);
    for (const x of [z0, z1]) g.boxB(YEL, x, Y + 0.075, B.z + B.w / 2 + 0.035, 0.035, 0.2, 0.035);
    // The motor at the belt's end, and the tomato crate at its head (where the first worker tips them on).
    g.boxB(0x3a6a8a, B.x1 - 0.2, FLOOR + 0.25, B.z - B.w / 2 - 0.2, 0.36, 0.3, 0.26);
    g.boxB(0xd8321e, B.x1 - 0.2, FLOOR + 0.55, B.z - B.w / 2 - 0.2, 0.06, 0.04, 0.06);
    const hx = B.x0 + 0.25, hz = B.z - B.w / 2 - 0.5;
    g.boxB(0x9a6a3a, hx, FLOOR, hz, 0.95, 0.62, 0.7);
    g.boxB(0xc08a4a, hx, FLOOR + 0.62, hz, 1.0, 0.04, 0.74);
    const rnd = mulberry32(7);
    for (let k = 0; k < 16; k++) g.sphere(rnd() < 0.55 ? 0xd8321e : rnd() < 0.7 ? 0x8cc43c : 0x6e4a2c, hx + (rnd() - 0.5) * 0.78, FLOOR + 0.66 + rnd() * 0.06, hz + (rnd() - 0.5) * 0.54, 2 * R, 1.76 * R, 2 * R);
    // The bins' stands: two posts behind ROJOS and VERDES holding their signs; the bucket.
    for (const k of ['rojo', 'verde']) {
      const [x, z] = c.bins[k], bz = z - BOX.d / 2 - 0.06;
      for (const sx of [-1, 1]) g.boxB(DARK, x + sx * 0.33, FLOOR, bz, 0.04, 0.86, 0.04);
    }
    const [bx, bz] = c.bins.podrido;
    g.cyl(0x8a9aa8, bx, FLOOR + 0.2, bz, 0.22, 0.4, 14);
    g.cyl(0x2a2a2e, bx, FLOOR + 0.395, bz, 0.2, 0.012, 14);
    g.cyl(0x6a7a88, bx, FLOOR + 0.405, bz, 0.235, 0.025, 14);
    this.root.add(toonMesh(g.build(), { outline: 0.02 }));
    for (const k of ['rojo', 'verde']) {
      const [x, z] = c.bins[k];
      const sign = signMesh(c.signs[k], 0.72, 0.24, k === 'rojo'
        ? { bg: '#d8321e', fg: '#fff8e6', border: '#1d1426', ppm: 360, scale: 0.72 }
        : { bg: '#2f7a3a', fg: '#fff8e6', border: '#1d1426', ppm: 360, scale: 0.72 });
      sign.position.set(x, FLOOR + 0.74, z - BOX.d / 2 - 0.035);
      this.root.add(sign);
    }
    // The belt's cleats: they ride round with it.
    const cg = new THREE.BoxGeometry(0.035, 0.012, B.w - 0.06);
    this.cleatN = Math.floor(L / 0.42);
    this.cleats = new THREE.InstancedMesh(cg, new THREE.MeshToonMaterial({ color: 0x6a6a70, gradientMap: MAT.toon.gradientMap }), this.cleatN);
    this.cleats.frustumCulled = false;
    this.root.add(this.cleats);
    // The tomatoes: one instanced mesh a kind, with its outline on the same matrices.
    this.ims = {};
    for (const k of TOMATO_KINDS) {
      const geo = tomatoGeo(k);
      const im = new THREE.InstancedMesh(geo, MAT.toon, CAP);
      im.castShadow = true; im.frustumCulled = false; im.count = 0;
      const om = new THREE.InstancedMesh(outlineGeometry(geo), outlineMat(0.012), CAP);
      om.instanceMatrix = im.instanceMatrix; om.frustumCulled = false; om.castShadow = false; om.count = 0;
      this.root.add(im, om);
      this.ims[k] = { im, om };
    }
    // The crates: made as needed and reused; the label shows once one is stamped.
    this.crateGeo = crateGeo();
    this.crateOut = outlineGeometry(this.crateGeo);
    this.labelMesh = signMesh(c.label, 0.5, 0.2, { bg: '#f7c31b', fg: '#1d1426', border: '#1d1426', ppm: 700, scale: 0.8 });
    this.crates = [];
    // The workers.
    this.workers = c.workers.map((w, k) => {
      const ch = new Character(this.workerDef(w, k));
      ch.state = 'hidden';
      ch.root.visible = false;
      scene.add(ch.root);
      return ch;
    });
  }

  crate() {
    let cr = this.crates.find((q) => !q.used);
    if (!cr) {
      const mesh = new THREE.Mesh(this.crateGeo, MAT.toon);
      mesh.castShadow = true; mesh.receiveShadow = true;
      const o = new THREE.Mesh(this.crateOut, outlineMat(0.02));
      o.name = 'outline';
      mesh.add(o);
      const lab = this.labelMesh.clone();
      lab.position.set(0, BOX.h * 0.5, BOX.d / 2 + 0.006);
      mesh.add(lab);
      this.root.add(mesh);
      cr = { mesh, lab };
      this.crates.push(cr);
    }
    Object.assign(cr, { used: true, n: 0, kind: null, st: 'bin', t: 0, from: null, to: null, pop: 0 });
    cr.lab.visible = false;
    cr.mesh.visible = true;
    return cr;
  }

  // A crate on its bin, empty, popping in (`wait` s from now).
  newCrate(kind, wait = 0) {
    const cr = this.crate(), [x, z] = this.cfg.bins[kind];
    cr.kind = kind;
    cr.wait = wait;
    cr.mesh.position.set(x, FLOOR, z);
    cr.mesh.rotation.set(0, 0, 0);
    cr.mesh.scale.setScalar(0.01);
    return cr;
  }

  // The k-th filled crate's place on its stack: up STACK high, then a second stack outside it.
  stackAt(kind, k) {
    const [x, z] = this.cfg.stacks[kind], side = kind === 'rojo' ? -1 : 1;
    return new THREE.Vector3(x + side * Math.floor(k / STACK) * (BOX.w + 0.06), FLOOR + (k % STACK) * (BOX.h + 0.005), z);
  }

  // A tomato's spot in a crate (block-local, its middle).
  slotIn(cr, i) {
    const [sx, sz, up] = SLOTS[i % SLOTS.length], p = cr.mesh.position;
    return new THREE.Vector3(p.x + sx, p.y + 0.03 + R * 0.88 + up, p.z + sz);
  }

  // The k-th tomato on the pile past the belt's end: a heap, the first ones in the middle and on top.
  pileAt(k) {
    const [x, z] = this.cfg.pile, a = k * 2.4, r = 0.17 * Math.sqrt(k);
    return new THREE.Vector3(x + Math.cos(a) * r, FLOOR + R * 0.88 + 0.2 * Math.max(0, 1 - r / 0.5), z + Math.sin(a) * r);
  }

  // ---------------------------------------------------------------------------------------------
  // The shift

  start() {
    if (!this.canUse()) return;
    const g = this.g, p = g.player;
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    p.anim.sprint = false;
    g.unsay(this.boss);
    this.boss.anim.wave = false;
    this.sc = { phase: 'in', t: 0, T: 0, frame: g.frame };
    this.shifts++;
    hud.fade(true);
    audio.tone(520, 0.08, 'triangle', 0.05);
  }

  // Behind the fade: the belt, the bins, the workers, Stig at the belt, the foreman by the pile, the cut.
  setUp() {
    const g = this.g, c = this.cfg, p = g.player, s = this.sc, b = this.boss;
    this.build();
    this.root.visible = true;
    Object.assign(s, {
      phase: 'intro', t: 0, rnd: mulberry32(this.seed++), toms: [], v: 0, off: 0, since: Infinity, spawned: 0,
      sorted: 0, dropped: 0, wrong: 0, piled: 0, ground: { rojo: 0, verde: 0, podrido: 0 }, filled: 0,
      bins: { rojo: this.newCrate('rojo'), verde: this.newCrate('verde') }, done: { rojo: 0, verde: 0 },
      cool: 0, poseT: -1, said: {}, faster: 0, wrongT: -Infinity, stampT: -1, held: null,
    });
    const st = this.at(c.stig.at);
    p.teleport(st.x, st.z, c.stig.yaw);
    p.wishX = p.wishZ = 0;
    this.clearAnim(p);
    const ba = this.at(c.boss.shiftAt);
    b.teleport(ba.x, ba.z, yawTo(st.x - ba.x, st.z - ba.z));
    this.clearAnim(b);
    this.workers.forEach((w, k) => {
      const q = this.at(c.workers[k].at);
      w.state = 'normal';
      w.teleport(q.x, q.z, c.workers[k].yaw);
      w.root.visible = true;
      this.clearAnim(w);
    });
    const sh = c.shot;
    g.cam.cutTo(this.at([sh.eye[0], sh.eye[1]], sh.eye[2]), this.at([sh.look[0], sh.look[1]], sh.look[2]));
    g.cam.snapNext = true;
    hud.fade(false);
  }

  update(dt) {
    const g = this.g, c = this.cfg;
    this.tickBoss(dt);
    this.tickSiv();
    const s = this.sc;
    if (!s) return;
    if (!this.live) { this.end('gone'); return; }
    s.t += dt; s.T += dt;
    const once = (key, at, fn) => { if (s.t >= at && !s.said[key]) { s.said[key] = true; fn(); } };
    switch (s.phase) {
      case 'in':
        if (s.t >= c.fadeSecs) this.setUp();
        break;
      case 'intro':
        once('intro', 0.3, () => { g.say(this.boss, c.intro, 3.0); this.boss.anim.point = true; });
        once('stig', 1.9, () => { g.say(g.player, c.stigIntro, 2.2); this.boss.anim.point = false; });
        if (s.t >= c.introSecs) { s.phase = 'run'; s.t = 0; audio.sweep(0.5, 0.05, 120, 420, 'lowpass', 1, 0); }
        else if (input.pressed('hangUp')) this.finish('quit');
        break;
      case 'run':
        this.run(dt);
        break;
      case 'end':
        this.ending();
        if (s.t >= s.endSecs) { s.phase = 'out'; s.t = 0; hud.fade(true); }
        break;
      case 'out':
        if (s.t >= c.fadeSecs) { this.tearDown(s.result); hud.fade(false); return; }
        break;
      default:
    }
    if (this.sc && this.sc.phase !== 'in') this.animate(dt);
  }

  // The belt's speed at progress k (0..1 of the shift's tomatoes come on), and the gap behind the last one.
  speedAt(k) { const c = this.cfg; return lerp(c.speed[0], c.speed[1], clamp(k, 0, 1)); }
  gapAt(k) { const c = this.cfg; return lerp(c.gap[0], c.gap[1], clamp(k, 0, 1)); }

  run(dt) {
    const g = this.g, c = this.cfg, s = this.sc, B = c.belt;
    const k = s.spawned / c.count;
    s.v = s.hold ? 0 : this.speedAt(k);
    s.off = (s.off + s.v * dt) % 0.42;
    // On at the head, gap behind the last one.
    if (s.spawned < c.count) {
      const gap = this.gapAt(k);
      if (s.since === Infinity) s.since = gap;
      s.since += s.v * dt;
      if (s.since >= gap) { s.since -= gap; this.spawn(B.x0 + s.since); }
    }
    for (const t of s.toms) {
      if (t.st !== 'belt') continue;
      t.x += s.v * dt;
      t.spin += (s.v * dt) / R;
      if (t.x > B.x1 + 0.05) this.drop(t);
    }
    // The foreman hurries him on.
    c.fasterAt.forEach((at, i) => {
      if (s.faster <= i && k >= at) {
        s.faster = i + 1;
        g.say(this.boss, c.faster[i], 2.4);
        this.boss.anim.point = true; s.pointT = 1.4;
        audio.sweep(0.4, 0.05, 200, 520, 'lowpass', 1, 0);
      }
    });
    // The keys (or the tests' autopilot).
    if (s.cool > 0) s.cool -= dt;
    if (input.pressed('hangUp')) { this.finish('quit'); return; }
    const key = input.pressed('sortRed') ? 'rojo' : input.pressed('sortGreen') ? 'verde' : input.pressed('sortRotten') ? 'podrido' : null;
    if (key && s.cool <= 0) this.sort(key);
    else if (this.auto && s.cool <= 0) this.autoSort();
    if (s.dropped >= c.pileMax) { this.ras(); return; }
    if (s.spawned >= c.count && !s.toms.some((t) => t.st === 'belt' || t.st === 'fly')) this.finish('done');
  }

  spawn(x) {
    const c = this.cfg, s = this.sc, r = s.rnd();
    let kind = 'podrido';
    if (r < c.weights.rojo) kind = 'rojo';
    else if (r < c.weights.rojo + c.weights.verde) kind = 'verde';
    if (s.next?.length) kind = s.next.shift();
    s.toms.push({ kind, st: 'belt', x, y: FLOOR + c.belt.top + R * 0.88, z: c.belt.z + (s.rnd() - 0.5) * 0.12, spin: s.rnd() * 6, yaw: s.rnd() * 6, pop: 0, id: s.spawned });
    s.spawned++;
  }

  // The tomato a key takes: the one furthest along the belt inside the zone.
  inZone() {
    const [z0, z1] = this.cfg.zone;
    let best = null;
    for (const t of this.sc.toms) if (t.st === 'belt' && t.x >= z0 && t.x <= z1 && (!best || t.x > best.x)) best = t;
    return best;
  }

  sort(kind) {
    const g = this.g, c = this.cfg, s = this.sc, p = g.player;
    s.cool = c.cool;
    p.anim.tap = false;
    p.anim.sort = KEY[kind]; p.anim.sortK = 0; s.poseT = 0;
    const t = this.inZone();
    if (!t) { audio.tone(300, 0.05, 'triangle', 0.03, 240); return; }
    const from = new THREE.Vector3(t.x, t.y, t.z);
    if (t.kind === kind) {
      s.sorted++;
      if (kind === 'podrido') {
        const [bx, bz] = c.bins.podrido;
        this.fly(t, from, new THREE.Vector3(bx, FLOOR + 0.3, bz), 0.45, () => { t.st = 'gone'; audio.thud(); });
        return;
      }
      const cr = s.bins[kind], i = cr.n++;
      t.crate = cr; t.slot = i;
      // Full: the next one of its kind goes into a new crate, which pops in once this one is away.
      if (cr.n >= c.perBox) s.bins[kind] = this.newCrate(kind, c.flySecs + c.stampSecs + 0.15);
      this.fly(t, from, this.slotIn(cr, i), 0.5, () => {
        t.st = 'box';
        audio.tone(420 + i * 40, 0.06, 'sine', 0.09, 300);
        if (cr.n >= c.perBox && cr.st === 'bin' && s.toms.every((q) => q.crate !== cr || q.st === 'box')) this.stampCrate(cr);
      });
      return;
    }
    // The wrong bin: over its rim and out onto the ground before it.
    s.wrong++;
    s.dropped++;
    const [bx, bz] = c.bins[kind], n = s.ground[kind]++;
    const rim = new THREE.Vector3(bx + (t.x > bx ? 0.1 : -0.1), FLOOR + BOX.h + 0.12, bz);
    const land = new THREE.Vector3(bx - 0.36 + ((n * 0.29) % 0.72), FLOOR + R * 0.88, bz + BOX.d / 2 + 0.26 + (n % 2) * 0.22);
    this.fly(t, from, rim, 0.45, () => {
      audio.tone(180, 0.06, 'square', 0.04);
      this.fly(t, rim, land, 0.25, () => { t.st = 'ground'; this.splat(t, 0.5); });
    }, c.flySecs * 0.8);
    if (g.time - s.wrongT > c.wrongGap) { s.wrongT = g.time; g.say(this.boss, c.wrong[t.kind], 1.8); }
  }

  // Off the belt's end onto the pile.
  drop(t) {
    const s = this.sc, to = this.pileAt(s.piled++);
    s.dropped++;
    this.fly(t, new THREE.Vector3(t.x, t.y, t.z), to, 0.15, () => { t.st = 'pile'; this.splat(t, 1); }, 0.38);
  }

  fly(t, from, to, h, then, secs = this.cfg.flySecs) {
    Object.assign(t, { st: 'fly', from, to, h, then, ft: 0, fsecs: secs });
  }

  splat(t, k) {
    audio.noise(0.08, 0.1 * k, 700, 'lowpass', 0, 1.2);
    audio.tone(140, 0.07, 'sine', 0.07 * k, 80);
    const col = t.kind === 'rojo' ? 0xd8321e : t.kind === 'verde' ? 0x8cc43c : 0x6e4a2c;
    const w = this.at([t.x, t.z]);
    for (let i = 0; i < 3; i++) fx.spawn(w.x, t.y, w.z, col, { vx: (Math.random() - 0.5) * 1.6, vz: (Math.random() - 0.5) * 1.6, vy: 1 + Math.random(), s0: 0.06, s1: 0.03, life: 0.4, grav: 12 });
  }

  // A full crate: Stig stamps it, and it goes on its stack; a new one on the bin.
  stampCrate(cr) {
    const g = this.g, c = this.cfg, s = this.sc, p = g.player, kind = cr.kind;
    cr.lab.visible = true;
    cr.st = 'slide'; cr.t = -c.stampSecs; cr.from = cr.mesh.position.clone(); cr.to = this.stackAt(kind, s.done[kind]++);
    s.filled++;
    p.anim.sort = false; p.anim.tap = true; s.stampT = c.stampSecs;
    audio.stamp();
    if (s.filled === 1) g.say(p, c.firstBox, 1.8);
  }

  autoSort() {
    const s = this.sc, a = this.auto, t = this.inZone();
    if (!t) return;
    t.seen ??= s.T;
    if (s.T - t.seen < (a.react ?? 0.3)) return;
    let kind = t.kind;
    if (a.wrong && s.rnd() < a.wrong) kind = TOMATO_KINDS[(TOMATO_KINDS.indexOf(t.kind) + 1) % 3];
    this.sort(kind);
  }

  // The pile gives way: the belt stops and every tomato rolls.
  ras() {
    const g = this.g, c = this.cfg, s = this.sc, p = g.player;
    const [px, pz] = c.pile;
    for (const t of s.toms) {
      if (t.st === 'belt' || t.st === 'fly') {
        Object.assign(t, { st: 'roll', vx: 0.8 + s.rnd() * 1.6, vy: 0.8 + s.rnd() * 1.4, vz: -0.3 + s.rnd() * 1.6, then: null });
      } else if (t.st === 'pile') {
        const a = Math.atan2(t.z - pz, t.x - px) + (s.rnd() - 0.5) * 0.6, sp = 1.2 + s.rnd() * 1.6;
        Object.assign(t, { st: 'roll', vx: Math.cos(a) * sp + 0.6, vy: 0.6 + s.rnd() * 1.2, vz: Math.sin(a) * sp + 0.4 });
      }
    }
    // Two of them in his arms.
    s.held = [{ kind: 'rojo', side: 0 }, { kind: 'verde', side: 1 }].map((h) => {
      const t = { kind: h.kind, st: 'held', side: h.side, x: 0, y: 0, z: 0, spin: 0, yaw: 0, pop: 1 };
      s.toms.push(t);
      return t;
    });
    g.cam.shake = Math.max(g.cam.shake, 0.45);
    audio.noise(0.9, 0.3, 380, 'lowpass', 0, 0.8);
    for (let k = 0; k < 6; k++) audio.noise(0.07, 0.12, 700, 'lowpass', 0.1 + k * 0.11, 1.2);
    this.finish('ras');
  }

  // The shift is over ('done': every tomato handled; 'ras': the pile gave way; 'quit': Q): the lines,
  // the card, the pay and the record; `endSecs` later the fade.
  finish(kind) {
    const g = this.g, c = this.cfg, s = this.sc, p = g.player, b = this.boss;
    s.phase = 'end'; s.t = 0; s.result = kind; s.v = 0; s.said = {};
    s.endSecs = kind === 'done' ? c.doneSecs : kind === 'ras' ? c.rasSecs : 1.6;
    p.anim.sort = false; p.anim.tap = false; b.anim.point = false;
    const best = this.best, record = s.filled > best;
    if (record) { g.records.packhus = s.filled; g.save(); }
    const pay = kind === 'done' ? c.pay : 0;
    const lador = (n) => fmt(c.lador[n === 1 ? 0 : 1], { n });
    if (kind === 'done') {
      g.addCoins(pay);
      audio.coin();
      hud.banner.className = '';
      void hud.banner.offsetWidth;
      hud.showBanner(c.stamp, '', 'stamp', 1600);
      audio.stamp();
      g.say(b, c.done, 2.6);
      p.anim.cheer = true;
    } else if (kind === 'ras') {
      p.anim.placate = 2;
      g.say(p, c.rasStig, 2.6);
    } else {
      g.say(b, c.quit, 1.8);
    }
    const sub = record ? c.sub.record : best > 0 ? fmt(c.sub.best, { lador: lador(best) }) : '';
    if (kind !== 'quit' || s.filled > 0) hud.showScore(fmt(c.card[kind], { lador: lador(s.filled), pay }), sub, record, s.endSecs + 0.4);
    this.last = { kind, t: g.time, boxes: s.filled, dropped: s.dropped, sorted: s.sorted, wrong: s.wrong, spawned: s.spawned, pay, record, best };
  }

  // The lines after the end.
  ending() {
    const g = this.g, c = this.cfg, s = this.sc, p = g.player, b = this.boss;
    if (s.said.end) return;
    if (s.result === 'ras') {
      if (s.t >= 0.7 && !s.said.boss) { s.said.boss = true; g.say(b, c.rasBoss, 2.0); b.anim.scratch = true; }
      if (s.t >= 2.3) { s.said.end = true; g.say(b, c.rasAfter, 2.2); b.anim.scratch = false; }
    } else if (s.result === 'done') {
      if (s.t >= 1.3) { s.said.end = true; g.say(p, c.doneStig, 2.4); }
    } else s.said.end = true;
  }

  // Every frame of a shift: the belt's cleats, the tomatoes' flights and rolls, the crates, the poses,
  // the instances.
  animate(dt) {
    const g = this.g, c = this.cfg, s = this.sc, p = g.player, B = c.belt;
    // Stig's poses.
    if (s.poseT >= 0) {
      s.poseT += dt;
      p.anim.sortK = s.poseT / c.sortSecs;
      if (s.poseT >= c.sortSecs) { s.poseT = -1; p.anim.sort = false; p.anim.sortK = 0; }
    }
    if (s.stampT > 0 && (s.stampT -= dt) <= 0) p.anim.tap = false;
    if (s.pointT > 0 && (s.pointT -= dt) <= 0) this.boss.anim.point = false;
    // The workers: the first tips tomatoes on at the head, the second sorts the stretch before Stig.
    const [w0, w1] = this.workers, going = s.phase === 'run';
    for (const [w, k] of [[w0, 0], [w1, 1]]) {
      const cyc = going ? (s.T * (k ? 1.3 : 0.9) + k * 0.37) % 1 : 0;
      w.anim.sort = going ? (k ? (Math.floor(s.T * 1.3) % 2 ? 'L' : 'R') : 'C') : false;
      w.anim.sortK = cyc;
      if (!going) w.yaw = dampAngle(w.yaw, yawTo(p.x - w.x, p.z - w.z), 3, dt);
      w.sync(dt);
    }
    const b = this.boss;
    b.yaw = dampAngle(b.yaw, yawTo(p.x - b.x, p.z - b.z), 4, dt);
    // The cleats.
    const L = B.x1 - B.x0;
    for (let i = 0; i < this.cleatN; i++) {
      const x = B.x0 + ((i * 0.42 + s.off) % L + L) % L;
      _m.makeTranslation(x, FLOOR + B.top + 0.006, B.z);
      this.cleats.setMatrixAt(i, _m);
    }
    this.cleats.instanceMatrix.needsUpdate = true;
    // The crates: popping in on their bins, sliding to their stacks after the stamp.
    for (const cr of this.crates) {
      if (!cr.used) continue;
      if (cr.st === 'bin' && cr.pop < 1) {
        if (cr.wait > 0) cr.wait -= dt;
        else { cr.pop = Math.min(1, cr.pop + dt / 0.2); cr.mesh.scale.setScalar(Math.max(0.01, ease(cr.pop))); }
      }
      if (cr.st === 'slide') {
        cr.t += dt;
        const k = ease(cr.t / 0.45);
        cr.mesh.position.lerpVectors(cr.from, cr.to, k);
        cr.mesh.position.y = lerp(cr.from.y, cr.to.y, k) + Math.sin(Math.PI * k) * 0.35;
        if (cr.t >= 0.45) cr.st = 'stack';
      }
    }
    // The tomatoes.
    for (const t of s.toms) {
      if (t.pop < 1) t.pop = Math.min(1, t.pop + dt / 0.15);
      if (t.st === 'fly') {
        t.ft += dt;
        const k = clamp(t.ft / t.fsecs, 0, 1), e = ease(k);
        t.x = lerp(t.from.x, t.to.x, k); t.z = lerp(t.from.z, t.to.z, k);
        t.y = lerp(t.from.y, t.to.y, e) + Math.sin(Math.PI * k) * t.h;
        t.spin += dt * 9;
        if (k >= 1) { const f = t.then; t.then = null; t.st = 'rest'; f?.(); }
      } else if (t.st === 'roll') {
        t.vy -= 14 * dt;
        t.x += t.vx * dt; t.y += t.vy * dt; t.z += t.vz * dt;
        const fl = FLOOR + R * 0.88;
        if (t.y <= fl) {
          t.y = fl;
          if (t.vy < -1.2) { t.vy *= -0.3; if (!t.bumped) { t.bumped = true; this.splat(t, 0.4); } } else t.vy = 0;
          const f = Math.exp(-1.6 * dt);
          t.vx *= f; t.vz *= f;
        }
        if (t.z < 6.7) { t.z = 6.7; t.vz = Math.abs(t.vz) * 0.3; }   // the loading dock's face
        t.spin += (Math.hypot(t.vx, t.vz) * dt) / R;
      } else if (t.st === 'box') {
        const q = this.slotIn(t.crate, t.slot);
        t.x = q.x; t.y = q.y; t.z = q.z;
      } else if (t.st === 'held') {
        const arm = p.model.arms[t.side];
        arm.updateWorldMatrix(true, false);
        arm.localToWorld(_p.set(0, -p.model.armLen - 0.06, 0.04));
        t.x = _p.x - this.c0.x; t.y = _p.y; t.z = _p.z - this.c0.z;
      }
    }
    this.draw();
    if (s.held && s.phase === 'end') p.anim.placate = 2;
  }

  draw() {
    const s = this.sc, n = { rojo: 0, verde: 0, podrido: 0 };
    for (const t of s.toms) {
      if (t.st === 'gone' || (t.crate && !t.crate.used)) continue;
      const k = t.kind, i = n[k]++;
      if (i >= CAP) continue;
      _q.setFromEuler(_e.set(0, t.yaw, -t.spin, 'YXZ'));
      _s.setScalar(Math.max(0.01, t.pop));
      _m.compose(_p.set(t.x, t.y, t.z), _q, _s);
      this.ims[k].im.setMatrixAt(i, _m);
    }
    for (const k of TOMATO_KINDS) {
      const { im, om } = this.ims[k];
      im.count = om.count = Math.min(CAP, n[k]);
      im.instanceMatrix.needsUpdate = true;
    }
  }

  // Back to free roam ('gone': a mission or the other level took over, at once and with no fade).
  tearDown(kind) {
    const g = this.g, c = this.cfg, p = g.player, s = this.sc;
    this.sc = null;
    if (this.root) this.root.visible = false;
    for (const cr of this.crates || []) { cr.used = false; cr.mesh.visible = false; }
    for (const w of this.workers || []) { w.state = 'hidden'; w.root.visible = false; this.clearAnim(w); }
    this.clearAnim(p);
    this.clearAnim(this.boss);
    if (this.shown) {
      const b = this.boss, sp = this.bossSpot();
      b.teleport(sp.x, sp.z, c.boss.yaw);
    }
    if (kind !== 'gone' || g.missions.state === 'idle') {
      const a = this.at(c.after.at);
      p.teleport(a.x, a.z, c.after.yaw);
      g.cam.release();
      g.cam.yaw = p.yaw;
      g.cam.snapNext = true;
      g.inDialog = false;
    }
    if (kind === 'gone') {
      hud.fade(false);
      hud.hideScore();
      this.last = { kind: 'gone', t: g.time, boxes: s?.filled ?? 0, dropped: s?.dropped ?? 0, sorted: s?.sorted ?? 0, pay: 0, record: false };
    }
    if ((s?.sorted ?? 0) >= c.sivAfter) this.sivDue = true;
    if (this.last) this.last.ended = g.time;
  }

  // A mission start, the other level or a debug warp: off the belt at once.
  end(kind = 'gone') { if (this.sc) this.tearDown(kind); }

  objective() {
    const s = this.sc, c = this.cfg;
    if (!s || s.phase === 'in' || s.phase === 'out' || !this.live) return null;
    const handled = s.sorted + s.dropped;
    return {
      title: c.title, text: fmt(c.text, { n: Math.min(c.count, handled), total: c.count, boxes: s.filled }),
      bar: s.dropped / c.pileMax, barColor: s.dropped >= c.pileMax - 2 ? '#ff4a3a' : '#f07a1e', barLabel: fmt(c.barLabel, { n: s.dropped, max: c.pileMax }),
    };
  }
  hint() { const s = this.sc; return s && (s.phase === 'intro' || s.phase === 'run') ? this.cfg.keys : s ? '' : null; }
}
