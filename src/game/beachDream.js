// Strandkyssen i bränningen – Stig's daydream in the surf (free roam; feature 57, DESIGN §10.33).
// A lone towel, blue with white dots like Majsan's dress, lies at the water's edge below Flamenco.
// Between missions E there and Stig lies down on it, the picture washes to white, and for eight
// seconds the island is a dream: sunset, a soft picture with white edges, the waltz and DAGDRÖM, and
// Majsan lying beside him in the surf in each other's arms while the foam washes over their legs.
// She whispers the film's "Då kanske vi ses…", and the camera glides away to the sky before the
// kiss. A white flash: day again, Majsan gone, and a real wave rolls in over him: "Blött." Now and
// then Siv stands on the sand and gives him her score; after the end it is Majsan herself who
// stands there and asks him to dance. In the film he dreams of the beach kiss in the Stockholm
// slush (research-plot.md:104); here he lies on the beach of the poster, and it is still a dream.
// The Majsan of the dream is a double (a Character of her look, only in the scene): the real one
// stays where she is, so no mission giver, placement or other module ever sees her move. Only on the
// island with no mission running (`missions.state === 'idle'`); a mission start or the other level
// ends everything at once (the palette, the picture and the music back, the visitor home), so no
// mission, timer or calibration pool sees any of it. Nothing is saved. Config: STRANDKYSSEN
// (content/island.js). Owned by Game as `dream`: main.js calls `update` once a frame and asks
// `posed(key)` (the visitor on the sand) in npcPosed; honk.free asks it too.

import { STRANDKYSSEN } from '../content/index.js';
import { MISSIONS } from './missions/index.js';
import { THREE, scene, camera, GeoBuilder, toonMesh } from '../gfx.js';
import { Character } from '../actors/character.js';
import { audio } from '../audio.js';
import { fx } from './fx.js';
import { hud } from './hud.js';
import { clamp, lerp, dist, yawTo } from '../util.js';

const MARK = 'strand';   // npc.spot while the visitor stands on the sand for us (a placement by anyone else clears it)
const ease = (k) => k * k * (3 - 2 * k);
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere(), _v = new THREE.Vector3();

function towelMesh(c) {
  const g = new GeoBuilder(), w = c.w, l = c.len;
  g.box(c.color, 0, 0.01, 0, w, 0.02, l);
  // White dots in a loose grid, the fringe at both ends.
  for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) {
    const x = -w / 2 + (i + 0.5 + (j % 2 ? 0.25 : -0.25)) * (w / 4), z = -l / 2 + (j + 0.5) * (l / 8);
    if (Math.abs(x) < w / 2 - 0.06) g.cyl(c.dots, x, 0.022, z, 0.045, 0.006, 10);
  }
  for (const s of [-1, 1]) g.box(c.fringe, 0, 0.012, s * (l / 2 + 0.04), w * 0.96, 0.016, 0.08);
  return toonMesh(g.build(), { outline: 0.012, cast: false });
}

// The foam: its front edge along local x at z 0, lumps in three rows and a thin sheet under them
// behind it towards the sea (+z); scale.y is the crest (1: the front lumps 0.42 m high).
function foamMesh(w) {
  const g = new GeoBuilder(), FOAM = 0xf4f8f6, n = Math.round(w / 0.7);
  g.box(FOAM, 0, 0.03, 1.0, w * 0.9, 0.06, 1.7);
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + (i / n) * w, edge = 1 - Math.abs(x) / (w / 2), k = 0.55 + 0.45 * Math.sqrt(edge);
    const j = Math.sin(i * 2.7) * 0.18;
    g.sphere(FOAM, x, 0.12, 0.35 + j, 1.0 * k, 0.6 * k, 0.8 * k);
    if (i % 2) g.sphere(FOAM, x + 0.2, 0.08, 1.0 - j, 0.8 * k, 0.36 * k, 0.65 * k);
    else if (Math.abs(x) < w / 2 - 0.8) g.sphere(FOAM, x + 0.3, 0.04, 1.65 + j, 0.6 * k, 0.2 * k, 0.5 * k);
  }
  const m = toonMesh(g.build(), { outline: 0.02, cast: false });
  m.visible = false;
  return m;
}

export class BeachDream {
  constructor(game, cfg = STRANDKYSSEN) {
    this.g = game;
    this.cfg = cfg;
    const t = cfg.towel;
    this.T = { x: t.at[0], z: t.at[1], yaw: t.yaw };
    this.fx = Math.sin(t.yaw); this.fz = Math.cos(t.yaw);   // along the towel, to the sea
    this.lx = Math.cos(t.yaw); this.lz = -Math.sin(t.yaw);  // its left (+x local)
    this.sc = null;            // the scene under way: { t, ev: [{ t, fn }], dream, wake, wave, visitor, variant, hy }
    this.dreams = 0;           // dreams this session (Siv's visit counts them)
    this.vis = null;           // the visitor on the sand: { key, n, busy, stayUntil, laughUntil, dance }
    this.dripUntil = 0;
    this.dripT = 0;
    this.double = null;        // Majsan of the dream (built at the first dream)
    this.last = null;          // tests: { t, variant, visitor, dream, wake, splash, said: [[who, text]], ended }
    this.towel = towelMesh(t);
    this.towel.position.set(this.T.x, 0.172, this.T.z);
    this.towel.rotation.y = t.yaw;
    scene.add(this.towel);
    this.foam = foamMesh(cfg.wave.w);
    this.foam.rotation.y = t.yaw;
    scene.add(this.foam);
    game.addInteractable({
      id: 'strandkyssen', r: cfg.r, prompt: cfg.prompt,
      pos: () => ({ x: this.T.x, z: this.T.z, y: 0.15 }),
      enabled: () => this.canUse(),
      use: () => this.start(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get busy() { return !!this.sc; }
  posed(key) { return !!this.vis && this.vis.key === key && this.vis.n.spot === MARK; }
  // [dx, y, dz] in the towel's frame (dx to its left, dz along it to the sea) to the world.
  at(dx, dz) { return { x: this.T.x + this.lx * dx + this.fx * dz, z: this.T.z + this.lz * dx + this.fz * dz }; }
  spot(a) { const q = this.at(a[0], a[2]); return { x: q.x, y: this.g.groundAt(q.x, q.z) + a[1], z: q.z }; }

  // On foot by the towel: no scene, car, carry, pursuit, bust, PANIK, pool-fest ring, belt or talk.
  canUse() {
    const g = this.g, p = g.player;
    return this.live && !this.sc && !g.inDialog && !g.playerCar && !g.carrying && p.state === 'normal' && p.onGround
      && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !g.fest.joined && !g.belt.seated && !g.chat.busy;
  }

  // Free to stand on the sand: shown, standing, nobody's (busy: placed or held by a mission, another
  // free-roam module or a scene), not walked by a module, not the waiting mission's giver or extra.
  free(key) {
    const g = this.g, n = g.npc(key), cur = g.missions.current;
    if (!n || n.state !== 'normal' || !n.root.visible || n.car || n.seatId || n.busy || n.steer || !g.honk.free(key) || g.npcPosed(key)) return false;
    return !(cur && cur.level === 'island' && (cur.giver === key || cur.extra?.some((e) => e === key || (Array.isArray(e) && e[0] === key))));
  }
  homeOf(key) {
    const g = this.g;
    let home = g.levelDef.homes(g)[key] ?? null;
    if (key in g.homeOverrides) home = g.homeOverrides[key];
    return home && !home.seat ? home : null;
  }
  sivDue(n = this.dreams) { const s = this.cfg.siv; return n >= s.first && (n - s.first) % s.every === 0; }

  // ---------------------------------------------------------------------------------------------
  // E at the towel

  start() {
    if (!this.canUse()) return;
    const g = this.g, c = this.cfg, p = g.player;
    this.dreams++;
    this.endVisitor();
    this.dripUntil = 0;
    g.inDialog = true;
    hud.letterbox(true);
    hud.clearToasts();
    p.wishX = p.wishZ = p.vx = p.vz = p.vy = 0;
    p.anim.sprint = false;
    const H = this.at(0, c.lie.hips), hy = g.groundAt(H.x, H.z) + p.model.torsoD / 2 + 0.03;
    this.sc = { t: 0, ev: [], hy, H, dream: false, wake: false, wave: null, variant: null, said: [] };
    this.last = { t: g.time, variant: null, visitor: null, dream: false, wake: false, splash: 0, said: this.sc.said, ended: null };
    p.lieAt({ x: H.x, y: hy, z: H.z, yaw: this.T.yaw, lean: -0.15, arms: 'side', tilt: 0, lift: 0 });
    this.cut(c.cam.lie);
    const A = c.at;
    this.on(A.wash, () => hud.dreamWash(true, c.washSecs));
    this.on(A.dream, () => this.dreamOn());
    this.on(A.whisper, () => this.say(this.double, c.whisper[1], 2.8, c.whisper[0]));
    this.on(A.wake, () => this.wakeUp());
    this.on(A.wave, () => { this.sc.wave = { t: 0 }; });
    this.on(A.blott, () => this.say(p, c.blott, 2.2, 'stig'));
  }
  on(t, fn) { this.sc.ev.push({ t, fn }); this.sc.ev.sort((a, b) => a.t - b.t); }
  say(who, text, secs, key) { this.g.say(who, text, secs); this.sc?.said.push([key, text]); }
  cut(spec) { this.g.cam.cutTo(this.spot(spec.eye), this.spot(spec.look)); }

  dreamOn() {
    const g = this.g, c = this.cfg, p = g.player, sc = this.sc, P = c.pose;
    sc.dream = true;
    this.last.dream = true;
    g.setSky('sunset');
    hud.dream(c.title);
    audio.setTune(c.tune);
    p.lieAt({ ...P.stig, x: sc.H.x, y: sc.hy, z: sc.H.z, yaw: this.T.yaw, lean: -Math.PI / 2, lift: 0 });
    const d = this.majsan(), a = P.majsan.at, q = { x: sc.H.x + this.lx * a[0] + this.fx * a[1], z: sc.H.z + this.lz * a[0] + this.fz * a[1] };
    d.lieAt({ ...P.majsan, x: q.x, y: g.groundAt(q.x, q.z) + d.model.torsoD / 2 + 0.03, z: q.z, yaw: this.T.yaw, lean: -Math.PI / 2, lift: 0 });
    d.root.visible = true;
    this.cut(c.cam.dream);
    hud.dreamWash(false, c.washOutSecs);
  }

  // Majsan of the dream: a Character of her look as it is now, never in the world's lists.
  majsan() {
    const def = this.g.npc('majsan')?.def;
    if (!this.double) { this.double = new Character(def); this.double.key = 'majsan'; scene.add(this.double.root); }
    else if (this.double.def !== def) this.double.setDef(def);
    return this.double;
  }

  // The white flash: day again (the clock's palette), the music back, Majsan gone, Stig alone.
  wakeUp() {
    const g = this.g, c = this.cfg, p = g.player, sc = this.sc;
    this.dreamOff();
    hud.dreamFlash(c.flashSecs);
    sc.wake = true;
    this.last.wake = true;
    p.lieAt({ x: sc.H.x, y: sc.hy, z: sc.H.z, yaw: this.T.yaw, lean: -Math.PI / 2, arms: 'side', tilt: 0.12, lift: 0 });
    this.cut(c.cam.wake);
    // Who stands on the sand: after the end Majsan, now and then by day Siv, if free.
    const after = g.missions.index >= MISSIONS.length;
    let variant = null;
    if (after && this.free('majsan')) variant = 'after';
    else if (!after && this.sivDue() && g.day.isDay() && this.free('siv')) variant = 'siv';
    sc.variant = variant;
    this.last.variant = variant;
    if (variant) this.takeVisitor(variant === 'after' ? 'majsan' : 'siv');
    const v = this.vis, S = variant === 'after' ? c.after.script : variant === 'siv' ? c.siv.script : c.plain;
    if (variant === 'siv') {
      this.on(S.line, () => { if (!this.vis) return; v.n.anim.laugh = true; v.laughUntil = g.time + c.siv.laughSecs; this.say(v.n, c.siv.line[1], 2.8, 'siv'); });
    } else if (variant === 'after') {
      this.on(S.line, () => { if (this.vis) this.say(v.n, c.after.line[1], 2.8, 'majsan'); });
      this.on(S.answer, () => {
        this.say(p, c.after.answer, 1.6, 'stig');
        if (this.vis) { v.dance = true; v.n.anim.dance = true; }
      });
    }
    this.on(S.up, () => this.getUp());
    this.on(S.end, () => this.finish());
  }

  dreamOff() {
    const g = this.g, sc = this.sc;
    if (!sc?.dream) return;
    sc.dream = false;
    hud.dream(null);
    g.setSky(g.levelDef.palette || 'day');
    g.day.resync();
    g.day.write();   // the clock's palette now: the scene keeps it from writing until it ends
    if (audio.tune === this.cfg.tune) audio.setTune(g.levelTune());
    if (this.double) { g.unsay(this.double); this.double.state = 'hidden'; this.double.root.visible = false; }
  }

  takeVisitor(key) {
    const g = this.g, c = this.cfg, n = g.npc(key), p = g.player, q = this.at(c.visitor[0], c.visitor[1]);
    this.vis = { key, n, busy: n.busy, stayUntil: Infinity, laughUntil: 0, dance: false };
    g.unsay(n);
    n.busy = true;
    n.wishX = n.wishZ = n.vx = n.vz = 0;
    n.teleport(q.x, q.z, yawTo(p.x - q.x, p.z - q.z));
    n.spot = MARK;
    this.last.visitor = key;
  }

  getUp() {
    const g = this.g, c = this.cfg, p = g.player, q = this.at(c.stand[0], c.stand[1]), v = this.vis;
    const yaw = v ? yawTo(v.n.x - q.x, v.n.z - q.z) : this.T.yaw + Math.PI;
    p.standAt(q.x, q.z, yaw);
    // Face to face with the visitor, the two framed as in a talk.
    if (v) { v.n.yaw = yawTo(q.x - v.n.x, q.z - v.n.z); g.cam.frame(v.n, p); }
    this.dripUntil = g.time + c.dripSecs;
  }

  // The scene's end: the camera back behind him, the letterbox off, free roam on; the visitor stays
  // a little and goes home out of view.
  finish() {
    const g = this.g, p = g.player;
    if (p.state === 'lying') this.getUp();
    g.cam.release();
    g.cam.yaw = p.yaw + (this.vis ? 0.5 : 0);   // the visitor beside him, not behind him
    g.cam.snapNext = true;
    hud.letterbox(false);
    g.inDialog = false;
    if (this.vis) this.vis.stayUntil = g.time + (this.vis.dance ? this.cfg.after.stay : this.cfg.stay);
    this.foam.visible = false;
    this.last.ended = 'done';
    this.sc = null;
  }

  // ---------------------------------------------------------------------------------------------
  // Every frame

  update(dt) {
    const g = this.g;
    if (!this.live) {
      if (this.sc || this.vis || this.dripUntil) this.reset();
      return;
    }
    this.tickDrip(dt);
    this.tickVisitor();
    const sc = this.sc;
    if (!sc) return;
    sc.t += dt;
    while (this.sc && sc.ev.length && sc.ev[0].t <= sc.t) sc.ev.shift().fn();
    if (!this.sc) return;
    this.tickLie();
    if (sc.dream) this.tickDream();
    if (sc.wave) this.tickWave(dt);
    if (this.double?.root.visible) this.double.sync(dt);
  }

  // Onto his back: from sitting (lean −0.15) to flat over `lie.back` s.
  tickLie() {
    const sc = this.sc, p = this.g.player, c = this.cfg.lie;
    if (sc.dream || sc.wake || p.state !== 'lying') return;
    p.liePose.lean = lerp(-0.15, -Math.PI / 2, ease(clamp(sc.t / c.back, 0, 1)));
  }

  // The foam washing slowly over their legs, and the camera holding on them, then gliding away.
  tickDream() {
    const sc = this.sc, c = this.cfg, w = c.swash, A = c.at, f = this.foam;
    const k = 0.5 + 0.5 * Math.cos(((sc.t - A.dream) / w.secs) * Math.PI * 2);
    this.placeFoam(lerp(w.near, w.far, k), w.crest / 0.42 * (0.7 + 0.3 * (1 - k)));
    f.visible = true;
    const g = this.g, cine = g.cam.cine;
    if (!cine || sc.t < A.glide) return;
    const e = ease(clamp((sc.t - A.glide) / (A.wake - A.glide), 0, 1)), a = c.cam.dream, b = c.cam.away;
    const mix = (u, v) => [lerp(u[0], v[0], e), lerp(u[1], v[1], e), lerp(u[2], v[2], e)];
    const eye = this.spot(mix(a.eye, b.eye)), look = this.spot(mix(a.look, b.look));
    cine.pos.set(eye.x, eye.y, eye.z);
    cine.look.set(look.x, look.y, look.z);
  }

  // `z`: the world z of the foam's front (along the towel's axis), `crest` its scale.y.
  placeFoam(z, crest) {
    const f = this.foam, d = z - this.T.z;
    f.position.set(this.T.x + this.fx * d, 0.172, this.T.z + this.fz * d);
    f.scale.set(1, Math.max(0.05, crest), 1);
  }

  // The real wave: in from the sea fast, over him with a splash, and back out.
  tickWave(dt) {
    const g = this.g, c = this.cfg.wave, sc = this.sc, w = sc.wave, H = sc.H;
    w.t += dt;
    let z, crest;
    if (w.t <= c.inSecs) {
      const k = 1 - (1 - w.t / c.inSecs) ** 2;
      z = lerp(c.from, c.to, k);
      crest = c.crest / 0.42 * (1 - 0.55 * k);
    } else if (w.t <= c.inSecs + c.outSecs) {
      const k = ease((w.t - c.inSecs) / c.outSecs);
      z = lerp(c.to, c.back, k);
      crest = c.crest / 0.42 * (0.45 - 0.35 * k);
    } else { this.foam.visible = false; sc.wave = null; return; }
    this.foam.visible = true;
    this.placeFoam(z, crest);
    // Along the towel's axis: his feet, his middle and his head as the front passes them.
    const along = (z - this.T.z), hips = (H.z - this.T.z) * this.fz + (H.x - this.T.x) * this.fx;
    const marks = [[hips + 1.05, 'feet'], [hips - 0.3, 'body'], [hips - 1.2, 'head']];
    w.passed ??= new Set();
    for (const [m, id] of marks) {
      if (along > m || w.passed.has(id)) continue;
      w.passed.add(id);
      const q = this.at(0, m);
      if (id === 'body') {
        fx.splash(q.x, q.z, 22, 3, 5);
        fx.splash(q.x - this.lx * 0.6, q.z - this.lz * 0.6, 12, 2.4, 4);
        audio.splash(1);
        g.cam.shake = Math.max(g.cam.shake, 0.3);
      } else fx.splash(q.x, q.z, 10, 2.2, 3.4);
      this.last.splash++;
    }
  }

  // His clothes dripping after the wave.
  tickDrip(dt) {
    const g = this.g, p = g.player;
    if (!this.dripUntil) return;
    if (g.time >= this.dripUntil || g.playerCar || p.state === 'hidden') { this.dripUntil = 0; return; }
    const left = (this.dripUntil - g.time) / this.cfg.dripSecs;
    this.dripT -= dt;
    if (this.dripT > 0 || p.state === 'lying') return;
    this.dripT = 0.05 + (1 - left) * 0.18;
    const s = Math.sin(p.yaw), co = Math.cos(p.yaw), u = (Math.random() - 0.5) * 0.5, v = (Math.random() - 0.5) * 0.25;
    fx.spawn(p.x - co * u + s * v, p.y + 0.35 + Math.random() * 1.25, p.z + s * u + co * v, Math.random() < 0.5 ? 0x9fdcff : 0xffffff,
      { vy: -0.6, s0: 0.11, s1: 0.07, life: 0.6, drag: 0.2, grav: 12 });
  }

  // The visitor: posed while the scene runs and `stay` s after it, then home once out of the
  // camera's view or `popR` m from it.
  tickVisitor() {
    const g = this.g, v = this.vis;
    if (!v) return;
    if (v.n.spot !== MARK) { this.lose(); return; }
    if (v.laughUntil && g.time >= v.laughUntil) { v.n.anim.laugh = false; v.laughUntil = 0; }
    if (this.sc || g.time < v.stayUntil) return;
    if (v.dance) { v.n.anim.dance = false; v.dance = false; }
    if (this.mayPop(v.n)) this.endVisitor();
  }
  mayPop(n) {
    if (camera.position.distanceTo(_v.set(n.x, n.y + 1, n.z)) > this.cfg.popR) return true;
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    return !_frustum.intersectsSphere(_sphere.set(_sphere.center.set(n.x, n.y + 1, n.z), 1.2));
  }
  // Home (teleported) unless someone else placed her meanwhile.
  endVisitor() {
    const v = this.vis;
    if (!v) return;
    const g = this.g, n = v.n;
    this.vis = null;
    n.anim.laugh = n.anim.dance = false;
    if (n.spot !== MARK) return;
    g.unsay(n);
    const h = this.homeOf(v.key);
    if (h) g.placeNpc(v.key, h[0], h[1], h[2], h[3]);
    n.busy = v.busy;
    n.spot = null;
  }
  // Placed by someone else (a forced placeNpcs, a scene): ours no more, where she is.
  lose() {
    const n = this.vis.n;
    n.anim.laugh = n.anim.dance = false;
    this.vis = null;
  }

  // Out of free roam (a mission starts, the other level): everything off at once. A mission's start
  // owns the dialogue state, the letterbox and the camera from its first frame; only a level change
  // with the scene under way gives them back here.
  reset() {
    const g = this.g, p = g.player, sc = this.sc;
    if (sc) {
      this.dreamOff();
      hud.dreamWash(false, 0);
      this.foam.visible = false;
      if (p.state === 'lying') { const q = this.at(this.cfg.stand[0], this.cfg.stand[1]); p.standAt(q.x, q.z, this.T.yaw + Math.PI); }
      if (g.missions.state === 'idle') { g.cam.release(); g.cam.snapNext = true; hud.letterbox(false); g.inDialog = false; }
      this.last.ended = 'reset';
      this.sc = null;
    }
    this.endVisitor();
    this.dripUntil = 0;
  }
}
