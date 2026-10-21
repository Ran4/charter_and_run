// Helan går från balkongen (free roam; feature 134, DESIGN §10.63). In the evening "Helan går" is heard
// between the apartment slabs: a party on a balcony, a new one every evening, where Affe plays his
// accordion, Gabbe his congas and two Swedish guests sing under a garland of coloured bulbs. There is no
// arrow and no marker: the song grows louder as Stig comes nearer and comes from its side of the camera
// (the soundscape's `fest` layer, audio.js), and the island tune is ducked near it. Under the balcony the
// guests call him up ("Skål, grannen! Kom upp!"), he does not dare ("Det känns fånigt att gå upp…", the
// grisfest's shyness), and the first time an evening a guest drops a napkin with a few pesetas. With the
// music off a dot on the minimap shows where it is. The film only hears the song that evening
// (research-plot.md:276), so the party is ours [N] (§1.6); the musicians are the film's.
// Affe, Gabbe and the guests are doubles (Characters of their looks, placed by hand with `perchAt`: the
// balcony is only a look, no solid), and the real Affe and Gabbe are hidden meanwhile (taken out of view,
// given back home or to the waiting mission's place), so no mission giver, placement or other module ever
// sees them on the balcony. Only on the island with no mission running (`missions.state === 'idle'`), from
// `fromIndex` and in the clock's `hours`: a mission start or the other level ends it at once (the
// musicians back at the mission's place behind the morning cut's black), so no mission, timer or
// calibration pool sees any of it. Nothing is saved. Config: HELAN (content/island.js). Owned by Game as
// `helan`: main.js calls `update` once a frame and `sound` in updateAudio (after the soundscape), ducks
// the tune by `musicDuck` and adds `markers()` to the minimap.

import { HELAN } from '../content/index.js';
import { THREE, scene, camera, GeoBuilder, toonMesh, MAT } from '../gfx.js';
import { Character } from '../actors/character.js';
import { randomPed } from '../actors/models.js';
import { balconyLots } from '../world/town.js';
import { groundAt } from '../world/collision.js';
import { audio, tradInfo } from '../audio.js';
import { hourIn } from './soundscape.js';
import { hud } from './hud.js';
import { pta } from '../strings.js';
import { fx } from './fx.js';
import { clamp, dist, yawTo, dampAngle, mulberry32 } from '../util.js';

const MARK = 'helanGar';   // npc.spot while the real Affe or Gabbe is ours (hidden; placeNpcs leaves them be)
const smooth = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere(), _dir = new THREE.Vector3();
const POSES = ['wave', 'cupHeld', 'cupUp', 'cheer', 'point', 'talk'];

// A body's own geometries (not its props' shared ones), when it is re-dressed.
function dispose(model) {
  const keep = new Set();
  for (const k in model.props) model.props[k].traverse((o) => keep.add(o));
  model.root.traverse((o) => { if (o.isMesh && !keep.has(o)) o.geometry.dispose(); });
}

let napkinGeo = null;
function napkinMesh() {
  if (!napkinGeo) {
    const g = new GeoBuilder();
    // A paper napkin folded over a few coins, a corner turned back.
    g.box(0xfbf7ee, 0, 0.012, 0, 0.26, 0.024, 0.26);
    g.box(0xf1ebdc, 0.05, 0.03, 0.05, 0.15, 0.012, 0.15, 0.785);
    for (const [x, z] of [[-0.06, -0.05], [0.0, -0.07], [-0.08, 0.03]]) g.cyl(0xf2c230, x, 0.03, z, 0.04, 0.012, 10);
    napkinGeo = g.build();
  }
  const m = toonMesh(napkinGeo, { outline: 0.01, cast: false });
  m.scale.setScalar(1.7);   // it must read on its way down and at his feet
  m.visible = false;
  scene.add(m);
  return m;
}

export class HelanGar {
  constructor(game, cfg = HELAN) {
    this.g = game;
    this.cfg = cfg;
    // Its own draws (never the world's or Math.random's); the same balconies every test run.
    this.rnd = mulberry32(cfg.seed + (game.testMode ? 0 : Date.now() % 1000003));
    this.info = tradInfo('helanGar');
    this.cands = null;       // the balconies a party may take: [{ lot, spot, block }]
    this.evening = 0;        // evenings begun this session
    this.wasIn = false;      // the clock was in `hours` last frame
    this.spot = null;        // tonight's balcony: { lot, spot, block, x, y, z (the unit's middle on the residents' line), ax, az, ox, oz, yaw, uw }
    this.lastBlock = null;
    this.on = false;         // the party is up on its balcony
    this.held = {};          // key -> true: the real musician hidden by us (MARK)
    this.bodies = null;      // { a, b, affe, gabbe } (Characters), made at the first party
    this.garland = null;     // the bulbs' mesh (tonight's)
    this.napkin = null;      // { mesh, phase: 'fall' | 'rest', t, from, to, side, restT }
    this.napkinM = null;     // its mesh, made at the first drop
    this.queue = [];         // lines still to say: [{ at, who, text, secs }] (g.time)
    this.greeted = false;    // the first exchange this evening
    this.armed = true;       // he has been `awayR` m off since the last exchange
    this.paid = false;       // the napkin this evening
    this.sighed = false;     // Affe's sigh this evening
    this.lineT = -Infinity;  // g.time of our last line
    this.pos = null;         // { cycle, k }: the song's bar last frame
    this.songT = 0;          // the party's own clock with no running audio (s)
    this.blackAt = null;     // g.time when the morning cut's black began (the musicians go back behind it)
    this.wasLive = false;
    this.cutT = 0; this.fx = 0; this.fz = 0;
    this.d = Infinity;       // Stig's (or his car's) distance to the balcony on the ground
    this.level = 0; this.side = 0; this.out = 0; this.musicDuck = 1; this.hz = cfg.lp[0];
    this.poseT = {};         // body key -> { flag: g.time it ends }
    this.counts = { evening: 0, begin: 0, end: 0, first: 0, again: 0, sung: 0, skal: 0, sigh: 0, drop: 0, pick: 0, hold: 0, release: 0 };
    this.said = [];          // [who, text, t] (tests)
    this.last = null;        // tests: the last event { kind, t, … }
  }

  get live() {
    const g = this.g;
    return g.level === 'island' && g.missions.state === 'idle' && g.missions.index >= this.cfg.fromIndex && !g.party?.on && !!g.levelDef.sim.peds;
  }
  inHours(h = this.g.day.h) { return hourIn(h, this.cfg.hours); }
  // The real musician free to be taken: shown, standing, in no car, seat or walk, held and posed by nobody.
  free(key) {
    const g = this.g, n = g.npc(key);
    if (!n || n.state !== 'normal' || !n.root.visible || n.car || n.seatId || n.steer || n.busy || n.perched) return false;
    return !g.npcPosed(key) && g.honk.free(key);
  }
  // The waiting mission's place for `key` ([lm, dx, dz]) if it is its giver or an extra (as placeNpcs).
  missionPlace(key) {
    const g = this.g, cur = g.missions.current;
    if (!cur || cur.level !== 'island') return null;
    if (cur.giver === key) return [cur.at, 0, 0];
    const ex = cur.extra?.find((e) => e === key || (Array.isArray(e) && e[0] === key));
    if (!ex) return null;
    if (Array.isArray(ex)) return [cur.at, ex[1], ex[2]];
    const h = this.homeOf(key);
    return [cur.at, Array.isArray(h) ? h[1] : 0, Array.isArray(h) ? h[2] : 0];
  }
  homeOf(key) {
    const g = this.g;
    let home = g.levelDef.homes(g)[key] ?? null;
    if (key in g.homeOverrides) home = g.homeOverrides[key];
    return home && !home.seat ? home : null;
  }

  // ---------------------------------------------------------------------------------------------
  // Tonight's balcony

  candidates() {
    if (this.cands) return this.cands;
    const res = this.g.residents, recs = (res.recs ??= res.build());
    const taken = new Set(recs.map((r) => r.spot));
    const out = [];
    for (const lot of balconyLots) {
      const block = lot.id.split(',').slice(0, 2).join(',');
      for (const s of lot.spots) if (this.cfg.floors.includes(s.fl) && !s.awning && !s.plant && !taken.has(s)) out.push({ lot, spot: s, block });
    }
    return (this.cands = out);
  }
  // A block other than last evening's, then one of its free balconies.
  pick() {
    const all = this.candidates(), blocks = [...new Set(all.map((c) => c.block))].filter((b) => b !== this.lastBlock);
    if (!blocks.length) return null;
    const block = blocks[Math.floor(this.rnd() * blocks.length)], list = all.filter((c) => c.block === block);
    return this.frame(list[Math.floor(this.rnd() * list.length)]);
  }
  // A balcony's frame: the unit's middle on the residents' line, its row (a) and the street's way (o).
  frame(c) {
    const { lot, spot } = c, uw = lot.uw, ax = lot.ax, az = lot.az;
    return { ...c, x: spot.x - ax * 0.14 * uw, y: spot.y, z: spot.z - az * 0.14 * uw, ax, az, ox: Math.sin(lot.yaw), oz: Math.cos(lot.yaw), yaw: lot.yaw, uw };
  }
  // A point on tonight's balcony: `k` × its width along the row, `out` m towards the street, `h` m up.
  at(k, out = 0, h = 0, b = this.spot) {
    return { x: b.x + b.ax * k * b.uw + b.ox * out, y: b.y + h, z: b.z + b.az * k * b.uw + b.oz * out };
  }
  newEvening() {
    if (this.on) this.end('evening');
    this.evening++;
    this.counts.evening++;
    this.greeted = this.paid = this.sighed = false;
    this.armed = true;
    this.spot = this.pick();
    if (this.spot) this.lastBlock = this.spot.block;
    this.last = { kind: 'evening', t: this.g.time, n: this.evening, lot: this.spot?.lot.id, fl: this.spot?.spot.fl, u: this.spot?.spot.u };
  }

  // ---------------------------------------------------------------------------------------------
  // Out of view (the residents' rule, §10.42): bodies come and go only beyond `seenR` m of the camera,
  // outside its frustum, or within `cutSecs` s of a cut.

  seen(x, y, z, r = 2) { return _frustum.intersectsSphere(_sphere.set(_sphere.center.set(x, y, z), r)); }
  unseen(x, y, z) {
    const cp = camera.position;
    return this.cutT > 0 || Math.hypot(x - cp.x, z - cp.z) > this.cfg.seenR || !this.seen(x, y, z);
  }
  balconyUnseen() { const b = this.spot; return this.unseen(b.x, b.y + 1.4, b.z); }

  // ---------------------------------------------------------------------------------------------
  // The real musicians

  hold(key) {
    const g = this.g, n = g.npc(key);
    g.unsay(n);
    g.hideNpc(key);
    n.spot = MARK;
    this.held[key] = true;
    this.counts.hold++;
  }
  release(key) {
    const g = this.g, n = g.npc(key);
    delete this.held[key];
    if (!n || n.spot !== MARK) return;   // someone placed them meanwhile
    const q = this.missionPlace(key) ?? this.homeOf(key);
    if (q) g.placeNpc(key, q[0], q[1], q[2], q[3]);
    n.busy = false;
    n.spot = null;
    this.counts.release++;
    this.last = { kind: 'release', t: g.time, key, at: q?.[0] ?? null };
  }
  // Kept while tonight's party is on or waits to begin; given back once it is over: out of view at their
  // place, or behind the morning cut's black at a mission start (a fade of `DAY.fadeSecs`), at once
  // otherwise.
  tickRelease(live, want = false) {
    const g = this.g;
    for (const key of Object.keys(this.held)) {
      const n = g.npc(key);
      if (!n || n.spot !== MARK) { delete this.held[key]; continue; }
      if (this.on || (live && want)) continue;
      if (!live) {
        if (g.day.busy) {
          this.blackAt ??= g.time;
          if (g.time - this.blackAt < g.day.cfg.fadeSecs) continue;
        }
        this.release(key);
        continue;
      }
      const q = this.missionPlace(key) ?? this.homeOf(key), p = q && g.lmOffset(q[0], q[1], q[2]);
      if (!p || this.unseen(p.x, 1, p.z)) this.release(key);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The party

  makeBodies() {
    if (this.bodies) return this.bodies;
    const g = this.g, c = this.cfg;
    const guest = (woman, seed) => {
      for (let s = seed; ; s++) {
        const d = randomPed(mulberry32(s));
        if (!d.local && !!d.lashes === woman) { delete d.held; delete d.hat; return d; }
      }
    };
    const make = (d) => { const ch = new Character(d); ch.state = 'hidden'; ch.root.visible = false; scene.add(ch.root); return ch; };
    this.bodies = {
      a: make(guest(c.guests[0], c.seed + 1)),
      b: make(guest(c.guests[1], c.seed + 101)),
      affe: make(g.npc('affe')?.def ?? g.charDef('affe')),
      gabbe: make(g.npc('gabbe')?.def ?? g.charDef('gabbe')),
    };
    return this.bodies;
  }
  who(key) { return key === 'stig' ? this.g.player : this.bodies?.[key] ?? null; }
  // Where `key` stands tonight, and its yaw (to the street, turned a little to the middle).
  place(e) { const p = this.at(e.k, -e.back); return { ...p, yaw: this.spot.yaw + e.turn }; }

  begin() {
    const g = this.g, c = this.cfg, B = this.makeBodies();
    // Affe and Gabbe as they look now (a cue's outfit, if any).
    for (const k of c.musicians) {
      const d = g.npc(k)?.def;
      if (d && B[k].def !== d) { const old = B[k].model; B[k].setDef(d); dispose(old); }
    }
    for (const e of c.cast) {
      const ch = B[e.who], p = this.place(e);
      for (const f of POSES) ch.anim[f] = false;
      ch.perchAt(p.x, p.y, p.z, p.yaw);
      ch.root.visible = true;
      ch.base = p.yaw;
    }
    B.a.anim.cupHeld = 'low';
    this.buildGarland();
    audio.festStart(c.restBars);
    this.songT = 0;
    this.pos = null;
    this.on = true;
    this.counts.begin++;
    this.last = { kind: 'begin', t: g.time, lot: this.spot.lot.id, fl: this.spot.spot.fl, u: this.spot.spot.u };
  }
  end(why) {
    const g = this.g;
    if (!this.on) return;
    for (const ch of Object.values(this.bodies)) {
      g.unsay(ch);
      for (const f of POSES) ch.anim[f] = false;
      ch.state = 'hidden';
      ch.root.visible = false;
    }
    if (this.garland) this.garland.visible = false;
    audio.ambFest(false);
    this.queue.length = 0;
    this.poseT = {};
    this.on = false;
    this.counts.end++;
    this.last = { kind: 'end', t: g.time, why };
  }

  // The garland: a dark wire hung from fin to fin under the balcony above, sagging, with `bulbs` bulbs in
  // `colors` (unlit, as the town's night lights), and a warm glow on the balcony door behind the party.
  buildGarland() {
    const c = this.cfg, b = this.spot, G = new GeoBuilder();
    const half = 0.5 - 0.13 / b.uw, n = c.bulbs, out = 0.22;
    const wire = (k) => 2.5 - 0.32 * (1 - (k / half) ** 2);   // its height over the floor at k
    const segs = 16;
    for (let i = 0; i < segs; i++) {
      const k0 = -half + (2 * half * i) / segs, k1 = -half + (2 * half * (i + 1)) / segs;
      const p0 = this.at(k0, out, wire(k0)), p1 = this.at(k1, out, wire(k1));
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z), yaw = Math.atan2(p1.x - p0.x, p1.z - p0.z);
      G.box(0x2a2620, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2, 0.018, 0.018, len, yaw, -Math.atan2(p1.y - p0.y, Math.hypot(p1.x - p0.x, p1.z - p0.z)));
    }
    for (let i = 0; i < n; i++) {
      const k = -half + (2 * half * (i + 0.5)) / n, p = this.at(k, out, wire(k) - 0.09);
      G.box(0x2a2620, p.x, p.y + 0.06, p.z, 0.03, 0.05, 0.03);
      G.sphere(c.colors[i % c.colors.length], p.x, p.y, p.z, 0.1, 0.12, 0.1);
    }
    // The door behind them lit (over the slab's glass, 0.06 m in front of it).
    const d = this.at(0, -0.86, 1.2);
    G.box(0xffd68a, d.x, d.y, d.z, (b.uw - 0.5), 1.9, 0.02, b.yaw);
    if (this.garland) { this.garland.geometry.dispose(); scene.remove(this.garland); }
    this.garland = new THREE.Mesh(G.build(), MAT.mouth);
    this.garland.name = 'helanGarland';
    scene.add(this.garland);
  }

  // ---------------------------------------------------------------------------------------------
  // Frames

  update(dt) {
    const g = this.g, c = this.cfg;
    const inH = g.level === 'island' && this.inHours();
    if (inH && !this.wasIn) this.newEvening();
    this.wasIn = inH;
    const live = this.live;
    if (!live) {
      this.reset('off');
      this.tickRelease(false);
      this.wasLive = false;
      return;
    }
    this.blackAt = null;
    const f = g.focus();
    if (!this.wasLive || dist(f.x, f.z, this.fx, this.fz) > 15) this.cutT = c.cutSecs;
    this.wasLive = true;
    this.fx = f.x; this.fz = f.z;
    this.cutT -= dt;
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const want = inH && !!this.spot;
    if (this.on && c.musicians.some((k) => g.npc(k)?.spot !== MARK)) this.end('taken');   // placed by someone else
    if (want && !this.on) this.tryBegin();
    else if (this.on && !want && this.balconyUnseen()) this.end('hours');
    this.tickRelease(true, want);
    if (this.on) this.party(dt, f);
    this.tickNapkin(dt, f);
  }
  tryBegin() {
    const g = this.g, c = this.cfg;
    for (const key of c.musicians) {
      if (this.held[key]) continue;
      const n = g.npc(key);
      if (this.free(key) && this.unseen(n.x, n.y + 1, n.z)) this.hold(key);
    }
    if (c.musicians.every((k) => this.held[k]) && this.balconyUnseen()) this.begin();
  }
  // Off at once (a mission start, the other level, the grisfest's evening): the party, its lines and the
  // napkin; the musicians go back in tickRelease.
  reset(why) {
    if (this.on) this.end(why);
    this.queue.length = 0;
    if (this.napkin) { this.napkin.mesh.visible = false; this.napkin = null; }
    audio.ambFest(false);
  }

  // Where the song is: the audio clock's bar (also with the music off), else the party's own clock.
  songPos(dt) {
    const p = audio.festPos();
    if (p) return p;
    this.songT += dt;
    const bar = (60 / this.info.bpm) * 4, n = Math.floor(this.songT / bar), cyc = 8 + this.cfg.restBars;
    return { bars: this.songT / bar, cycle: Math.floor(n / cyc), k: n % cyc };
  }
  pose(key, flag, secs, v = true) {
    const ch = this.bodies[key];
    ch.anim[flag] = v;
    (this.poseT[key] ??= {})[flag] = this.g.time + secs;
  }
  say(who, text, secs = 2.6) {
    const g = this.g, ch = this.who(who);
    if (!ch || (who !== 'stig' && !ch.root.visible)) return;
    g.say(ch, text, secs);
    this.lineT = g.time;
    // The neighbours on the balconies (§10.42) hold their calls as after a line of their own.
    if (g.residents) g.residents.lineT = Math.max(g.residents.lineT, g.time);
    this.said.push([who, text, +g.time.toFixed(2)]);
    if (this.said.length > 40) this.said.shift();
  }
  // In front of the balcony (its street side) or under it up to `back` m behind its line.
  ahead(x, z) { const b = this.spot; return (x - b.x) * b.ox + (z - b.z) * b.oz > -this.cfg.back; }

  party(dt, f) {
    const g = this.g, c = this.cfg, B = this.bodies, p = g.player;
    const b = this.spot;
    this.d = dist(f.x, f.z, b.x, b.z);
    const talk = !g.inDialog && !hud.dialogActive && !hud.letterboxed;
    // The song's bars: a round's start, its end (the pause).
    const pos = this.songPos(dt);
    const melody = pos.k < 8;
    if (!this.pos || pos.cycle !== this.pos.cycle || pos.k !== this.pos.k) {
      const near = this.d < c.singR && talk;
      if (pos.k === 0 && this.pos) {
        if (near) {
          const s = g.saying(B.a) ? 'b' : 'a';
          this.say(s, c.sung, 3.4);
          this.counts.sung++;
        }
      } else if (pos.k === 8 && this.pos) {
        this.pose('a', 'cupUp', 1.6);
        this.pose('b', 'cheer', 1.4);
        if (near) { this.say('a', c.skal, 1.6); this.counts.skal++; }
        if (near && !this.sighed) { this.sighed = true; this.queue.push({ at: g.time + 2.2, who: 'affe', text: c.sigh, secs: 3, sigh: true }); }
      }
      this.pos = { cycle: pos.cycle, k: pos.k };
    }
    B.a.anim.talk = B.b.anim.talk = melody && !g.saying(B.a) && this.d < 45;
    // Stig under the balcony, on foot: the exchange (the first an evening with the napkin).
    if (this.d > c.awayR) this.armed = true;
    const under = !g.playerCar && p.state === 'normal' && this.d < c.callR && this.ahead(f.x, f.z);
    const quiet = g.time - this.lineT > c.every && g.time - (g.residents?.lineT ?? -Infinity) > c.after;
    if (under && this.armed && talk && quiet) {
      this.armed = false;
      const set = this.greeted ? c.again : c.first;
      const t0 = g.time;
      for (const [at, who, text] of set) this.queue.push({ at: t0 + at, who, text, secs: 2.6 });
      this.pose('a', 'wave', 2.2);
      this.pose('a', 'cupUp', 2.2);
      if (!this.paid) this.queue.push({ at: t0 + c.dropAt, drop: true });   // the napkin until he has had it
      this.counts[this.greeted ? 'again' : 'first']++;
      this.last = { kind: this.greeted ? 'again' : 'first', t: t0 };
      this.greeted = true;
    }
    if (!talk) this.queue = this.queue.filter((q) => q.drop);   // a dialogue takes the lines, not the napkin
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      if (q.drop) this.drop();
      else {
        if (q.who === 'stig' && (g.playerCar || this.d > c.singR)) continue;   // he has gone on
        this.say(q.who, q.text, q.secs);
        if (q.sigh) this.counts.sigh++;
      }
    }
    // Poses that end; the guests turn to him while he is in front within 30 m.
    for (const [key, fl] of Object.entries(this.poseT)) {
      for (const [flag, until] of Object.entries(fl)) if (g.time >= until) { B[key].anim[flag] = false; delete fl[flag]; }
    }
    B.a.anim.cupHeld = B.a.anim.cupUp ? true : 'low';
    const front = this.ahead(f.x, f.z) && this.d < 30;
    for (const key of ['a', 'b']) {
      const ch = B[key], want = front ? yawTo(f.x - ch.x, f.z - ch.z) : ch.base;
      const off = Math.atan2(Math.sin(want - b.yaw), Math.cos(want - b.yaw));
      ch.yaw = dampAngle(ch.yaw, b.yaw + clamp(off, -0.8, 0.8), 3, dt);
    }
    for (const ch of Object.values(B)) ch.sync(dt);
  }

  // ---------------------------------------------------------------------------------------------
  // The napkin with pesetas

  drop() {
    const g = this.g, c = this.cfg, b = this.spot, f = g.focus();
    if (this.paid || this.napkin || this.d > c.callR + 4) return;   // not after him down the street
    this.paid = true;
    this.pose('b', 'point', 0.7);
    const from = this.at(this.cfg.cast.find((e) => e.who === 'b').k, 0.62, 1.45);
    // `land` m before him on the way to the balcony, on the ground there.
    const dx = b.x - f.x, dz = b.z - f.z, d = Math.hypot(dx, dz) || 1;
    const x = f.x + (dx / d) * Math.min(c.land, d), z = f.z + (dz / d) * Math.min(c.land, d);
    const to = { x, y: groundAt(x, z, 0.2, 0.6) + 0.01, z };
    const mesh = (this.napkinM ??= napkinMesh());
    mesh.visible = true;
    mesh.position.set(from.x, from.y, from.z);
    this.napkin = { mesh, phase: 'fall', t: 0, from, to, side: { x: -dz / d, z: dx / d }, restT: 0 };
    this.counts.drop++;
    this.last = { kind: 'drop', t: g.time, from, to };
  }
  tickNapkin(dt, f) {
    const N = this.napkin;
    if (!N) return;
    const g = this.g, c = this.cfg, m = N.mesh;
    if (N.phase === 'fall') {
      N.t += dt;
      const k = Math.min(1, N.t / c.fall), e = 1 - (1 - k) ** 2;
      const sway = Math.sin(N.t * 5.2) * 0.35 * (1 - k);
      m.position.set(
        N.from.x + (N.to.x - N.from.x) * e + N.side.x * sway,
        N.from.y + (N.to.y - N.from.y) * k + Math.sin(k * Math.PI) * 0.35,
        N.from.z + (N.to.z - N.from.z) * e + N.side.z * sway,
      );
      m.rotation.set(Math.sin(N.t * 6.1) * 0.6 * (1 - k), N.t * 3.4, Math.cos(N.t * 4.7) * 0.5 * (1 - k));
      if (k >= 1) { N.phase = 'rest'; m.position.set(N.to.x, N.to.y, N.to.z); m.rotation.set(0, N.t * 3.4, 0); fx.sparkle(N.to.x, N.to.y + 0.1, N.to.z, 0xffd23f, 6); }
      return;
    }
    N.restT += dt;
    const r = g.playerCar ? c.pickR + 0.8 : c.pickR;
    if (dist(f.x, f.z, N.to.x, N.to.z) < r && (g.playerCar || g.player.state === 'normal')) {
      g.addCoins(c.pay);
      audio.coin();
      hud.toast(fill(c.toast, { n: pta(c.pay) }));
      m.visible = false;
      this.napkin = null;
      this.counts.pick++;
      this.last = { kind: 'pick', t: g.time, n: c.pay };
      return;
    }
    if (N.restT > c.rest && this.unseen(N.to.x, N.to.y, N.to.z)) { m.visible = false; this.napkin = null; }
  }

  // ---------------------------------------------------------------------------------------------
  // The song (main.updateAudio, after the soundscape's update: its mix)

  sound() {
    const g = this.g, c = this.cfg;
    let lv = 0, side = 0;
    if (this.on && this.live) {
      const f = g.focus(), b = this.spot, d = dist(f.x, f.z, b.x, b.z);
      lv = (d <= c.near ? 1 : c.near / d) * (1 - smooth((d - c.fadeFrom) / (c.far - c.fadeFrom)));
      camera.getWorldDirection(_dir);
      const fl = Math.hypot(_dir.x, _dir.z) || 1, rx = -_dir.z / fl, rz = _dir.x / fl;
      const ux = d > 1e-3 ? (b.x - f.x) / d : 0, uz = d > 1e-3 ? (b.z - f.z) / d : 0;
      side = c.pan * clamp((d - c.near) / c.near, 0, 1) * (ux * rx + uz * rz);
      this.hz = c.lp[0] * (c.lp[1] / c.lp[0]) ** clamp((d - c.near) / (c.far - c.near), 0, 1);   // even in pitch
    }
    this.level = lv;
    this.side = side;
    this.out = audio.musicOn ? lv * (g.ljud?.mix ?? 0) : 0;
    audio.ambLayer('fest', this.out, side);
    audio.festLowpass(this.hz);
    audio.ambFest(this.out > 0.003);
    // Down only near it (the square of its level): sol and the samba clash with it in key and tempo.
    this.musicDuck = this.out > 0.003 ? Math.round((1 - c.duck * this.out * this.out) * 20) / 20 : 1;
  }

  // The minimap's dot while the song cannot be heard (the music off or muted).
  markers() {
    if (!this.on || !this.cfg.dot || (audio.ready && audio.musicOn && !audio.muted)) return [];
    return [{ type: 'fest', x: this.spot.x, z: this.spot.z, edge: true }];
  }
}
