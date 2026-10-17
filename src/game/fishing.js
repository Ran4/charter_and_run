// Meta från piren (free roam; feature 107, DESIGN §10.45). At the far end of the marina's pier a rod
// stands in its holder on the green harbour light, a tin bucket beside it. On foot by it (landmark
// `fiske`), on the island with no mission running (`missions.state === 'idle'`), E ("E Meta") stands
// Stig at the edge facing the basin with the rod in his hands (`anim.fish`), the camera cuts over his
// shoulder and he casts: the float flies out on its line and lands with a plop, bobs a while with a
// nibble or two, then dives. E within the window hooks the catch: a fish, an old shoe, an inflatable
// shark fin or, very rarely, a wet and empty SPORT-KNÄCKE pack. It comes up out of the water on the
// line, the camera cuts to his face as he shows it with his line (the pack: the customs' "En julklapp.
// Den är inte till mig."), and the fish goes back into the water, the rest into the bucket. E too early,
// or none in the window: a splash and an empty hook. Q while he waits puts the rod down. The FÅNGST
// card (hud.setFangst, top left) keeps the count near the pier and while he fishes, and all four kinds
// once is the hunt (`records.fiske`, saved). The fin is a look only: never the Hajfenor set's collect.
// A mission start or the other level ends a cast at once (the rod back in its holder, the float and the
// catch gone), so no mission, timer or calibration pool sees any of it. Config: FISKE
// (content/island.js). Owned by Game as `fiske`: main.js calls `update` once a frame and `hint` in
// updateHud.

import { FISKE } from '../content/index.js';
import { lm } from '../world/layout.js';
import { THREE, GeoBuilder, toonMesh, scene } from '../gfx.js';
import { fishingRod, ROD_LEN } from '../actors/models.js';
import { COLLECT_KINDS } from '../actors/pickups.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { clamp, dist, lerp, randRange } from '../util.js';

export const FISH_KINDS = ['fisk', 'sko', 'fena', 'knacke'];
const DECK = 0.55;          // the pier's deck (world/blocks/coast.js hamn)
const N_LINE = 14;          // points along the line
const ease = (k) => (1 - Math.cos(Math.PI * clamp(k, 0, 1))) / 2;
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

export class Fishing {
  constructor(game, cfg = FISKE) {
    this.g = game;
    this.cfg = cfg;
    this.sc = null;         // the cast under way: { phase, t, frame, wait, dips, kind, result, catch, from, … }
    this.next = null;       // tests: the next catch's kind
    this.since = 0;         // hooks this session since the last pack (the pity rule)
    this.casts = 0;         // tests: casts this session
    this.last = null;       // tests: { kind: 'fisk' | … | 'early' | 'late' | 'quit' | 'gone', t, line, all }
    this.build();
    game.addInteractable({
      id: 'fiske', r: cfg.r, y: DECK, prompt: cfg.prompt,
      pos: () => lm(cfg.lm),
      enabled: () => this.canUse(),
      use: () => this.start(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get busy() { return !!this.sc; }
  get tally() { return (this.g.records.fiske ||= {}); }
  spot() { return lm(this.cfg.lm); }
  at([dx, dz], y = DECK) { const q = this.g.lmOffset(this.cfg.lm, dx, dz); return new THREE.Vector3(q.x, y, q.z); }

  // On foot by the rod: no scene, car, carry, pursuit, bust, PANIK, pool-fest ring, belt, talk, nap,
  // other free-roam hold or street race.
  canUse() {
    const g = this.g, p = g.player;
    return this.live && !this.sc && !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying
      && p.state === 'normal' && p.onGround && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active
      && !g.skis.on && !g.gatlopp.mode;
  }

  // ---------------------------------------------------------------------------------------------
  // The things on the pier: the rod in its holder, the bucket, the float, the line, the catches.

  build() {
    const c = this.cfg;
    const rg = new GeoBuilder();
    fishingRod(rg);
    this.rod = toonMesh(rg.build(), { outline: 0.018 });
    this.rod.scale.setScalar(1.12);   // Stig's scale: the rod he holds is the same size
    scene.add(this.rod);
    // The holder: a band round the post at the rod's height and the bracket out to the rod.
    const lamp = this.at(c.lamp), sp = this.spot();
    const dir = new THREE.Vector3(sp.x - lamp.x, 0, sp.z - lamp.z).normalize();
    const butt = lamp.clone().addScaledVector(dir, c.rodOff);
    butt.y = DECK + 0.36 * 1.12;
    this.rod.position.copy(butt);
    this.rod.quaternion.setFromUnitVectors(_v.set(0, 1, 0), _w.set(dir.x * Math.sin(c.rodLean), Math.cos(c.rodLean), dir.z * Math.sin(c.rodLean)));
    const hg = new GeoBuilder();
    hg.cyl(0x5a5e66, 0, 0, 0, 0.34, 0.06, 12);
    hg.box(0x5a5e66, 0, 0, 0.36, 0.05, 0.05, 0.16);
    hg.cyl(0x5a5e66, 0, 0, c.rodOff, 0.04, 0.12, 8);
    this.holder = toonMesh(hg.build(), { outline: 0.012 });
    this.holder.position.set(lamp.x, DECK + 0.95, lamp.z);
    this.holder.rotation.y = Math.atan2(dir.x, dir.z);
    scene.add(this.holder);
    // The tin bucket, a little water in it.
    const bg = new GeoBuilder();
    bg.cyl(0x8a9aa8, 0, 0.14, 0, 0.17, 0.28, 12);
    bg.cyl(0x3a7aa8, 0, 0.26, 0, 0.15, 0.02, 12);
    bg.cyl(0x6a7a88, 0, 0.28, 0, 0.175, 0.02, 12);
    bg.add(new THREE.TorusGeometry(0.17, 0.008, 4, 16, Math.PI), 0x3a3a40, new THREE.Matrix4().makeRotationZ(0).setPosition(0, 0.28, 0));
    this.bucket = toonMesh(bg.build(), { outline: 0.012 });
    this.bucketAt = this.at(c.bucket);
    this.bucket.position.copy(this.bucketAt);
    scene.add(this.bucket);
    // The float: red over white, a little antenna; its origin at the waterline.
    const fg = new GeoBuilder();
    fg.sphere(0xf4f4f0, 0, -0.02, 0, 0.17, 0.17, 0.17);
    fg.sphere(0xd8321e, 0, 0.02, 0, 0.175, 0.14, 0.175);
    fg.cyl(0xd8321e, 0, 0.13, 0, 0.012, 0.16, 6);
    this.float = toonMesh(fg.build(), { outline: 0.015 });
    this.float.scale.setScalar(1.35);   // bigger than life, so the dive reads from the shot
    this.float.visible = false;
    scene.add(this.float);
    // The line: a thin dark line from the rod's tip, sagging when slack.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N_LINE * 3), 3));
    this.line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x2a2430 }));
    this.line.frustumCulled = false;
    this.line.visible = false;
    scene.add(this.line);
    // The catches, built once; each hangs from its origin (the hook).
    this.catches = {};
    for (const k of FISH_KINDS) { const m = catchMesh(k); m.visible = false; scene.add(m); this.catches[k] = m; }
  }

  // The rod's tip and Stig's left hand in the world (after this frame's pose).
  tip(out) {
    const r = this.g.player.model.props.metspo;
    if (!r) return null;
    r.updateWorldMatrix(true, false);
    return r.localToWorld(out.set(0, ROD_LEN, 0));
  }
  hand(out) {
    const m = this.g.player.model, arm = m.arms[1];
    arm.updateWorldMatrix(true, false);
    return arm.localToWorld(out.set(0, -m.armLen - 0.02 * m.s, 0));
  }

  // ---------------------------------------------------------------------------------------------
  // E at the rod: the cast

  start() {
    if (!this.canUse()) return;
    const g = this.g, c = this.cfg, p = g.player, s = this.spot();
    g.inDialog = true;
    p.teleport(s.x, s.z, s.yaw);
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    p.anim.sprint = false;
    this.pose('cast', 0);
    this.rod.visible = false;
    this.shoot('fish');
    const land = this.at(c.float, c.water);
    this.sc = { phase: 'cast', t: 0, frame: g.frame, land, from: null, flyT: -1, wait: randRange(c.waitSecs[0], c.waitSecs[1]), dips: [], kind: null, show: null, tossTo: null };
    // Up to `nibbles` dips before the dive, none in its last 0.6 s.
    const n = Math.floor(Math.random() * (c.nibbles + 1));
    for (let k = 0; k < n; k++) this.sc.dips.push(randRange(0.6, Math.max(0.7, this.sc.wait - 0.6)));
    this.sc.dips.sort((a, b) => a - b);
    this.casts++;
    audio.sweep(0.35, 0.05, 700, 2400, 'bandpass', 1.2, 0.18);
  }

  shoot(name) {
    const g = this.g, sh = this.cfg.shots[name];
    const at = ([dx, dz, y]) => this.at([dx, dz], DECK + y);
    g.cam.cutTo(at(sh.eye), at(sh.look));
    g.cam.snapNext = true;
  }
  pose(flag, k) { const a = this.g.player.anim; a.fish = flag; a.fishK = k; }

  // The prompt line while he fishes (main.js updateHud): the wait's hint, the dive's call; else null.
  hint() {
    const s = this.sc;
    if (!s) return null;
    if (s.phase === 'wait') return this.cfg.hint.wait;
    if (s.phase === 'bite') return this.cfg.hint.bite;
    return '';
  }

  update(dt) {
    const g = this.g, s = this.sc;
    this.dt = dt;
    this.card();
    if (!s) return;
    if (!this.live) { this.end('gone'); return; }
    const c = this.cfg;
    s.t += dt;
    const fresh = g.frame === s.frame;   // the E that cast
    const e = !fresh && input.pressed('interact'), q = !fresh && input.pressed('hangUp');
    switch (s.phase) {
      case 'cast': {
        this.pose('cast', s.t / c.castSecs);
        if (s.flyT < 0 && s.t >= c.castSecs * c.release) { s.flyT = 0; s.from = this.tip(new THREE.Vector3()) || s.land.clone(); }
        if (s.flyT >= 0) {
          s.flyT += dt;
          const k = clamp(s.flyT / c.flySecs, 0, 1);
          this.float.position.lerpVectors(s.from, s.land, k);
          this.float.position.y = lerp(s.from.y, s.land.y, k) + Math.sin(Math.PI * k) * 1.3;
          this.float.visible = true;
          if (k >= 1 && s.t >= c.castSecs) {
            this.plop(s.land, 0.6);
            this.phase('wait');
          }
        } else this.hangFloat();
        break;
      }
      case 'wait': {
        this.pose('wait', 1);
        // A nibble: a quick dip and a tiny plip.
        let dip = 0;
        for (const d of s.dips) {
          const u = (s.t - d) / 0.18;
          if (u >= 0 && u <= 1) dip = Math.max(dip, Math.sin(Math.PI * u) * 0.05);
          if (u >= 0 && !s[`d${d}`]) { s[`d${d}`] = true; audio.tone(760, 0.04, 'sine', 0.035, 420); }
        }
        this.bob(dip);
        if (q) { this.empty('quit'); break; }
        if (e) { this.empty('early'); break; }
        if (s.t >= s.wait) {
          this.phase('bite');
          audio.tone(320, 0.2, 'sine', 0.13, 110);
          audio.noise(0.18, 0.12, 900, 'bandpass', 0, 1.5);
          this.spray(s.land, 6, 0.6, 1.4);
        }
        break;
      }
      case 'bite': {
        this.pose('bite', 1);
        const u = clamp(s.t / 0.07, 0, 1);
        this.float.position.set(s.land.x + Math.sin(s.t * 31) * 0.05, c.water - 0.15 * u, s.land.z + Math.cos(s.t * 23) * 0.04);
        if (e) { this.hook(); break; }
        if (s.t >= c.window) this.empty('late');
        break;
      }
      case 'reel': {
        this.pose('reel', s.t / c.reelSecs);
        const tip = this.tip(_v);
        if (tip) {
          const k = ease(s.t / c.reelSecs), m = this.catches[s.kind];
          _w.set(tip.x, tip.y - 0.75, tip.z);
          m.position.lerpVectors(s.land, _w, k);
          m.position.y = lerp(c.water - 0.2, _w.y, k) + Math.sin(Math.PI * k) * 0.6;
          m.rotation.set(0, s.t * 4, Math.sin(s.t * 13) * 0.25);
          this.drip(m.position, 0.04);
        }
        if (s.t >= c.reelSecs) this.showCatch();
        break;
      }
      case 'show': {
        const m = this.catches[s.kind], hand = this.hand(_v);
        const k = ease(s.t / 0.25);
        if (s.t < 0.25) m.position.lerpVectors(s.from, hand, k);
        else m.position.copy(hand);
        // Broadside to the camera before him: the fish's, shoe's and fin's flank, the pack's label.
        // The fin's ring tipped up to the camera.
        m.rotation.set(0, this.spot().yaw - Math.PI / 2 + (s.kind === 'knacke' ? Math.PI / 2 : 0) + Math.sin(s.t * 2.1) * 0.25, Math.sin(s.t * 3) * 0.06 + (s.kind === 'fena' ? 0.5 : 0));
        if (s.kind !== 'sko') this.drip(m.position, s.kind === 'knacke' ? 0.07 : 0.12);
        if (s.t >= s.show) { this.phase('toss'); s.from = null; }
        break;
      }
      case 'toss': {
        this.pose('toss', s.t / c.tossSecs);
        const m = this.catches[s.kind];
        if (!s.from) s.from = m.position.clone();
        const to = s.kind === 'fisk' ? s.land : _w.copy(this.bucketAt).setY(DECK + 0.3);
        const k = ease(s.t / c.tossSecs);
        m.position.lerpVectors(s.from, to, k);
        m.position.y = lerp(s.from.y, to.y, k) + Math.sin(Math.PI * k) * (s.kind === 'fisk' ? 1.0 : 0.4);
        m.rotation.z += dt * (s.kind === 'fisk' ? 9 : 2);
        if (s.t >= c.tossSecs) {
          m.visible = false;
          if (s.kind === 'fisk') this.plop(s.land, 1);
          else audio.tone(180, 0.1, 'sine', 0.12, 120);
          this.end(s.kind);
        }
        break;
      }
      case 'empty': {
        // The hook comes back up empty: the float flies in to hang under the tip.
        this.pose('reel', s.t / c.reelSecs);
        const tip = this.tip(_v);
        if (tip) {
          const k = ease(s.t / c.reelSecs);
          _w.set(tip.x, tip.y - 0.3, tip.z);
          this.float.position.lerpVectors(s.land, _w, k);
          this.float.position.y = lerp(c.water, _w.y, k) + Math.sin(Math.PI * k) * 0.5;
        }
        if (s.t >= c.emptySecs) this.end(s.result);
        break;
      }
      default:
    }
    this.drawLine();
  }

  phase(name) { const s = this.sc; s.phase = name; s.t = 0; }

  // The float at rest on the water, bobbing (minus a nibble's `dip`).
  bob(dip = 0) {
    const s = this.sc, t = this.g.time;
    this.float.position.set(s.land.x, this.cfg.water + Math.sin(t * 2.3) * 0.012 - dip, s.land.z);
    this.float.rotation.set(Math.sin(t * 1.7) * 0.08, 0, Math.sin(t * 2.1) * 0.08);
  }
  // Before the cast lets go: the float hangs a little under the rod's tip.
  hangFloat() {
    const tip = this.tip(_v);
    if (!tip) return;
    this.float.position.set(tip.x, tip.y - 0.3, tip.z);
    this.float.visible = true;
  }
  plop(at, k) {
    audio.tone(560, 0.07, 'sine', 0.09 * k, 190);
    audio.noise(0.12, 0.1 * k, 1400, 'bandpass', 0.01, 1.4);
    this.spray(at, Math.round(4 + 5 * k), 0.5 + 0.4 * k, 1.2 + k);
  }
  // Drops thrown up off the water at `at` (fx.splash's, float-sized: `n` drops, `sp` out, `up` up).
  spray(at, n, sp, up) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      fx.spawn(at.x, this.cfg.water + 0.05, at.z, k % 2 ? 0x9fdcff : 0xffffff, { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: up + Math.random() * up, s0: 0.16, s1: 0.05, life: 0.6, drag: 0.8, grav: 14 });
    }
  }
  drip(at, every) {
    const s = this.sc;
    s.dripT = (s.dripT ?? 0) - this.dt;
    if (s.dripT > 0) return;
    s.dripT = every;
    fx.spawn(at.x + (Math.random() - 0.5) * 0.12, at.y - 0.1, at.z + (Math.random() - 0.5) * 0.12, 0x9fdcff, { vy: -0.6, s0: 0.12, s1: 0.06, life: 0.5, grav: 9 });
  }

  // E in the window: the catch on the hook.
  hook() {
    const s = this.sc;
    s.kind = this.pick();
    this.float.visible = false;
    const m = this.catches[s.kind];
    m.position.copy(s.land);
    m.visible = true;
    audio.splash(0);
    this.spray(s.land, 12, 1.2, 2.4);
    for (let k = 0; k < 6; k++) audio.tone(1500 + k * 60, 0.03, 'square', 0.025, null, k * 0.06);   // the reel's click
    this.phase('reel');
    this.since = s.kind === 'knacke' ? 0 : this.since + 1;
  }

  // The catch: `next` (tests), the pack by the pity rule, else drawn from the weights.
  pick() {
    const c = this.cfg;
    if (this.next) { const k = this.next; this.next = null; return k; }
    if (!this.tally.knacke && this.since + 1 >= c.pity) return 'knacke';
    let r = Math.random() * FISH_KINDS.reduce((a, k) => a + c.weights[k], 0);
    for (const k of FISH_KINDS) { r -= c.weights[k]; if (r < 0) return k; }
    return 'fisk';
  }

  // The catch up in his hand, his face, his line; the count and the save.
  showCatch() {
    const g = this.g, c = this.cfg, s = this.sc, p = g.player, kind = s.kind;
    const tally = this.tally, had = FISH_KINDS.filter((k) => tally[k] > 0).length;
    const n = tally[kind] || 0;
    tally[kind] = n + 1;
    const lines = c.lines[kind], i = n % lines.length, line = lines[i];
    s.show = c.show[kind];
    s.from = this.catches[kind].position.clone();
    this.phase('show');
    this.pose(kind === 'fisk' && i === c.sizeLine ? 'size' : 'show', 1);
    this.shoot('show');
    g.say(p, line, s.show - 0.2);
    hud.toast(c.toasts[kind]);
    audio.pickup();
    const all = had < FISH_KINDS.length && FISH_KINDS.every((k) => tally[k] > 0);
    this.last = { kind, t: g.time, line, n: tally[kind], all };
    // The first time all four are on the card: its toast at once, Stig's line after his own.
    if (all) {
      s.show += c.allAt;
      hud.toast(c.allToast);
      audio.chime();
      this.later = { at: g.time + c.show[kind] - 0.1, fn: () => g.say(p, c.allLine, 2.4) };
    }
    g.save();
    this.cardKey = null;
  }

  // An empty hook: too early (E before the dive), too late (no E in the window) or Q (no line).
  empty(result) {
    const g = this.g, c = this.cfg, s = this.sc;
    s.result = result;
    this.phase('empty');
    if (result !== 'quit') {
      audio.splash(0);
      this.spray(s.land, 9, 1.0, 2.0);
      g.say(g.player, result === 'early' ? c.early : c.late, 1.6);
      hud.toast(c.emptyToast);
    } else audio.tone(900, 0.05, 'square', 0.03, 600);
    this.last = { kind: result, t: g.time };
  }

  // The cast is over: the rod back in its holder, Stig free on the spot, the camera behind him. Out of
  // free roam (`gone`) only our things are put away: a mission owns the camera and the dialogue now.
  end(kind) {
    const g = this.g, p = g.player;
    this.sc = null;
    this.float.visible = false;
    this.line.visible = false;
    for (const m of Object.values(this.catches)) m.visible = false;
    this.rod.visible = true;
    if (p.anim.fish) { p.anim.fish = false; p.anim.fishK = 0; }
    if (kind !== 'gone' || g.missions.state === 'idle') {
      g.cam.release();
      g.cam.yaw = p.yaw;
      g.cam.snapNext = true;
      g.inDialog = false;
    }
    if (kind === 'gone') { this.later = null; this.last = { kind, t: g.time }; }
    this.last.ended = g.time;
  }

  // The line from the rod's tip to the float or the catch, sagging when slack.
  drawLine() {
    const s = this.sc;
    if (!s) return;
    const tip = this.tip(_v);
    let end = null, sag = 0;
    if (s.phase === 'reel' || s.phase === 'show') { end = this.catches[s.kind].position; sag = 0.02; }
    else if (s.phase === 'toss') { if (s.t < 0.15) end = this.catches[s.kind].position; }
    else if (this.float.visible) { end = this.float.position; sag = s.phase === 'wait' ? 0.45 : s.phase === 'cast' ? 0.15 : 0.04; }
    if (!tip || !end) { this.line.visible = false; return; }
    const a = this.line.geometry.attributes.position;
    for (let i = 0; i < N_LINE; i++) {
      const u = i / (N_LINE - 1);
      a.setXYZ(i, lerp(tip.x, end.x, u), lerp(tip.y, end.y, u) - sag * 4 * u * (1 - u), lerp(tip.z, end.z, u));
    }
    a.needsUpdate = true;
    this.line.visible = true;
  }

  // The FÅNGST card: near the pier's end between missions, and while he fishes.
  card() {
    const g = this.g, c = this.cfg, p = g.player, sp = this.spot();
    if (this.later && g.time >= this.later.at) { const f = this.later.fn; this.later = null; if (this.sc) f(); }
    const on = !!this.sc || (this.live && !g.playerCar && dist(p.x, p.z, sp.x, sp.z) < c.cardR && Math.abs(p.y - DECK) < 3);
    if (!on) { if (this.cardKey !== null) { this.cardKey = null; hud.setFangst(null); } return; }
    const t = this.tally, key = FISH_KINDS.map((k) => t[k] || 0).join(',');
    if (key === this.cardKey) return;
    this.cardKey = key;
    hud.setFangst({
      title: c.card.title,
      rows: FISH_KINDS.map((k) => ({ label: t[k] ? c.names[k] : c.card.unknown, n: t[k] || 0 })),
      all: FISH_KINDS.every((k) => t[k] > 0) ? c.card.all : '',
    });
  }
}

// The four catches, each hanging from its origin (the hook) in -y.
function catchMesh(kind) {
  if (kind === 'fena') {
    // The inflatable fin on its float ring (the Hajfenor set's look), small, hung by the fin's tip.
    const g = new THREE.Group(), f = COLLECT_KINDS.fena.build();
    f.scale.setScalar(0.4);
    f.position.y = -0.37;
    g.add(f);
    return g;
  }
  if (kind === 'knacke') {
    // The SPORT-KNÄCKE pack (the money's pack, its label on both faces), wet and empty, hung by a corner.
    const g = new THREE.Group(), k = COLLECT_KINDS.knacke.build();
    k.scale.setScalar(0.6);
    k.position.set(0, -0.14, 0);
    k.rotation.z = 0.35;
    g.add(k);
    return g;
  }
  const b = new GeoBuilder();
  if (kind === 'fisk') {
    // A small silvery fish, head up: the body, a dark back, the tail fin, a back fin, an eye each side.
    b.sphere(0xb8ccd8, 0, -0.17, 0, 0.07, 0.3, 0.12);
    b.sphere(0x4a6a8a, 0, -0.17, -0.025, 0.05, 0.26, 0.07);
    b.box(0x7a9ab0, 0, -0.35, 0, 0.1, 0.012, 0.12, 0, 0, 0.6);
    b.box(0x7a9ab0, 0, -0.35, 0, 0.1, 0.012, 0.12, 0, 0, -0.6);
    b.box(0x6a8aa8, 0, -0.18, -0.065, 0.01, 0.1, 0.05);
    for (const sx of [-1, 1]) { b.sphere(0xf4f4f0, sx * 0.03, -0.07, 0.025, 0.03, 0.03, 0.03); b.sphere(0x1d1426, sx * 0.04, -0.07, 0.03, 0.015, 0.015, 0.015); }
  } else {
    // An old brown shoe, toe down, hooked by its heel loop; a strand of weed over it.
    b.sphere(0x6a4a30, 0, -0.18, 0.02, 0.12, 0.28, 0.13, 0.2);
    b.box(0x2a1e18, 0, -0.18, -0.055, 0.12, 0.27, 0.025, 0, 0.2);
    b.cyl(0x3a2a1e, 0, -0.06, 0.03, 0.05, 0.03, 8);
    b.box(0x3f7a3a, 0.05, -0.16, 0.06, 0.02, 0.24, 0.015, 0, 0.3, 0.2);
    b.box(0x3f7a3a, -0.04, -0.2, 0.07, 0.018, 0.18, 0.015, 0, 0.1, -0.3);
  }
  return toonMesh(b.build(), { outline: 0.012 });
}
