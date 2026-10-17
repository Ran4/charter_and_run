// Båtturen med PALOMA – slutbilden, fast på riktigt (free roam; feature 76, DESIGN §10.41). The PASEOS
// EN BARCO kiosk at the marina's pier root sells its boat trip: E there between missions, by day, pays
// 300 pta (Ole pays when the purse is short) and after a white flash Stig sits on PALOMA, the
// marina's excursion boat, with Ole. The trip is fixed shots with a white flash between them, as the
// Rio end card: out of the harbour basin past an inflatable shark fin, Stig holding on to his bench
// while Ole stands at the bow, points at the fin and gives his statistics ("Farlige saker…"); along
// the beach with the town behind; the turn at the lighthouse in the sunset, Ole's "Tenk å sitte her i
// desember. Det er som i Rio.", Stig's "Har du varit i Rio?", "Nei, men jeg skal reise dit."; and back
// on the pier by day. After the end the trip is the end card again on our coast: Stig and Ole in their
// Rio suits with a cup each, Majsan and Siv behind them, the samba, Ole's Rio line and the cups raised
// under the end card's banner. E skips to the pier. PALOMA (world/blocks/coast.js) is her own mesh,
// moved for the trip and put back on her mooring (her collider never moves); Stig is seated on her by
// hand (`seatAt`: no physics step), and Ole, Majsan and Siv are doubles (Characters of their looks,
// only in the trip), so no mission giver, placement or other module ever sees the real ones move.
// Only on the island with no mission running (`missions.state === 'idle'`); a mission start or the
// other level ends it at once (PALOMA, the fin, the sky, the music and his clothes back, Stig on the
// pier), so no mission, timer or calibration pool sees any of it. Nothing is saved. Config: BATTUR
// (content/island.js). Owned by Game as `battur`: main.js calls `update` once a frame.

import { BATTUR } from '../content/index.js';
import { MISSIONS } from './missions/index.js';
import { PALOMA } from '../world/blocks/coast.js';
import { lm } from '../world/layout.js';
import { THREE, scene, camera } from '../gfx.js';
import { Character } from '../actors/character.js';
import { outfitDef } from '../actors/models.js';
import { COLLECT_KINDS } from '../actors/pickups.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { S, pta } from '../strings.js';
import { hud } from './hud.js';
import { clamp, lerp } from '../util.js';

const WATER = 0.15;   // PALOMA's waterline in the basin and at sea (her mesh's y 0)
const WHITE = 'rgba(255,255,255,0.95)';
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere(), _v = new THREE.Vector3();
const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
const POSES = ['hold', 'point', 'cupHeld', 'cupUp', 'wave'];   // the anim flags the trip sets
// PALOMA's frame at her mooring.
const moor = () => ({ x: PALOMA.x, z: PALOMA.z, yaw: PALOMA.yaw });

export class BoatTrip {
  constructor(game, cfg = BATTUR) {
    this.g = game;
    this.cfg = cfg;
    this.sc = null;         // the trip under way: { t, ev, variant, clip, boat: { x, z, yaw }, cast, prevOutfit, sunset, said }
    this.doubles = {};      // key -> the Character standing in for them (built at the first trip)
    this.ashore = null;     // the doubles left on the pier: { keys, until }
    this.trips = 0;         // tests: trips this session
    this.last = null;       // tests: { t, variant, paid, clips: [id], said: [[who, text]], banner, ended }
    this.fin = COLLECT_KINDS.fena.build();
    this.fin.visible = false;
    scene.add(this.fin);
    game.addInteractable({
      id: 'battur', r: cfg.r,
      get prompt() { return priced(game.missions.index >= MISSIONS.length ? cfg.promptRio : cfg.prompt, cfg.price); },
      pos: () => lm(cfg.lm),
      enabled: () => this.canUse(),
      use: () => this.start(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get busy() { return !!this.sc; }

  // On foot by the kiosk, by day: no scene, car, carry, pursuit, bust, PANIK, pool-fest ring, belt,
  // talk, nap or other free-roam hold.
  canUse() {
    const g = this.g, p = g.player;
    return this.live && !this.sc && g.day.isDay() && !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying
      && p.state === 'normal' && p.onGround && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active;
  }

  // ---------------------------------------------------------------------------------------------
  // E at the kiosk

  start() {
    if (!this.canUse()) return;
    const g = this.g, c = this.cfg, p = g.player;
    const variant = g.missions.index >= MISSIONS.length ? 'rio' : 'plain';
    this.endAshore();
    hud.clearToasts();
    hud.hideBanner();
    const paid = g.coins >= c.price;
    g.pay(c.price);
    g.inDialog = true;
    hud.letterbox(true);
    p.wishX = p.wishZ = p.vx = p.vz = p.vy = 0;
    p.anim.sprint = false;
    this.trips++;
    const cast = variant === 'rio' ? ['ole', 'majsan', 'siv'] : ['ole'];
    this.sc = { t: 0, ev: [], variant, clip: null, boat: { x: PALOMA.x, z: PALOMA.z, yaw: PALOMA.yaw }, cast, prevOutfit: p.outfit, sunset: false, said: [] };
    this.last = { t: g.time, variant, paid, clips: [], said: this.sc.said, banner: false, ended: null };
    for (const k of cast) this.double(k, variant === 'rio' && k === 'ole' ? 'rio' : null);
    if (variant === 'rio') {
      g.setPlayerOutfit('rio', { persist: false });
      audio.setTune(c.rio.tune);
    }
    PALOMA.away = true;
    for (const clip of c.clips.slice(1)) this.on(clip.at, () => this.cut(clip));
    for (const [t, who, text] of c[variant].lines) this.on(t, () => this.say(who, text));
    if (variant === 'rio') {
      this.on(c.rio.cheers, () => this.cheers(true));
      this.on(c.rio.banner, () => { hud.showBanner(S.endCardMain, S.endCardSub, 'mission endcard', c.rio.bannerSecs * 1000); this.last.banner = true; });
    }
    this.on(c.end, () => this.finish('done'));
    this.cut(c.clips[0]);
  }
  on(t, fn) { this.sc.ev.push({ t, fn }); this.sc.ev.sort((a, b) => a.t - b.t); }
  who(key) { return key === 'stig' ? this.g.player : this.doubles[key]; }
  say(key, text) {
    const g = this.g, ch = this.who(key);
    if (!ch || !ch.root.visible) return;
    g.say(ch, text, 2.8);
    this.sc?.said.push([key, text]);
  }

  // A double of `key` in `outfit` (null: their look as it is now), shown; built once, re-dressed.
  double(key, outfit) {
    const def = outfit ? outfitDef(key, outfit) : this.g.npc(key)?.def ?? outfitDef(key, null);
    let d = this.doubles[key];
    if (!d) { d = this.doubles[key] = new Character(def); d.key = key; scene.add(d.root); }
    else if (d.def !== def) d.setDef(def);
    d.state = 'normal';
    d.root.visible = true;
    return d;
  }
  hideDouble(key) {
    const d = this.doubles[key];
    if (!d) return;
    this.g.unsay(d);
    for (const f of POSES) d.anim[f] = false;
    d.state = 'hidden';
    d.root.visible = false;
  }

  // ---------------------------------------------------------------------------------------------
  // The shots

  // A cut (and its white flash, but the first): PALOMA to the clip's start, the passengers to their
  // places, the camera to the shot, the sky and the fin as the clip wants them.
  cut(clip) {
    const sc = this.sc;
    hud.flashColor(WHITE, sc.clip ? 400 : 600);
    sc.clip = clip;
    this.last.clips.push(clip.id);
    const sunset = clip.sky === 'sunset';
    if (sunset !== sc.sunset) { sc.sunset = sunset; this.sky(sunset); }
    this.fin.visible = clip.id === 'hamn';
    if (clip.ashore) this.ashoreAll();
    else this.board(clip);
    this.moveBoat(0);
    this.place();
    sc.camFrame = { ...sc.boat };
    this.camera(true);
  }

  // Everyone on board for this clip: seated on the benches facing the bow; in the basin before the
  // end Ole stands at the bow and points at the fin, Stig holds on.
  board(clip) {
    const sc = this.sc, p = this.g.player, rio = sc.variant === 'rio';
    sc.pose = {};
    for (const k of ['stig', ...sc.cast]) sc.pose[k] = { seat: this.cfg.seats[k] };
    if (!rio && clip.id === 'hamn') sc.pose.ole = { stand: this.cfg.oleStands, point: true };
    p.anim.hold = !rio && clip.id !== 'fyren';
    const ole = this.doubles.ole;
    ole.anim.point = !!sc.pose.ole.point;
    ole.anim.wave = !rio && clip.id === 'playa';
    if (rio) this.cheers(false);
  }
  // The cups: held before the chest, or raised (`up`) for Ole's Rio line.
  cheers(up) {
    const sc = this.sc;
    for (const k of ['stig', 'ole', 'majsan', 'siv']) {
      const ch = this.who(k);
      if (!ch || (k !== 'stig' && !sc.cast.includes(k))) continue;
      ch.anim.cupHeld = up ? true : 'low';
    }
  }

  // Back on the pier by day: the sky, the music and his clothes back under the flash; everyone
  // standing on the pier beside PALOMA, Stig facing the quay.
  ashoreAll() {
    const g = this.g, sc = this.sc, c = this.cfg, p = g.player;
    if (sc.variant === 'rio') this.restoreLook();
    for (const ch of [p, ...sc.cast.map((k) => this.doubles[k])]) for (const f of POSES) ch.anim[f] = false;
    sc.pose = {};
    for (const k of ['stig', ...sc.cast]) sc.pose[k] = { pier: c.pier[k] };
    if (sc.variant === 'rio') this.double('ole', null);
  }
  restoreLook() {
    const g = this.g, sc = this.sc;
    if (sc.restored) return;
    sc.restored = true;
    if (sc.variant !== 'rio') return;
    if (g.player.outfit !== sc.prevOutfit) g.setPlayerOutfit(sc.prevOutfit, { persist: false });
    if (audio.tune === this.cfg.rio.tune) audio.setTune(g.levelTune());
  }
  // The sunset at the lighthouse and the clock's palette after it (it does not write while the trip
  // holds inDialog).
  sky(sunset) {
    const g = this.g;
    if (sunset) { g.setSky('sunset'); return; }
    g.setSky(g.levelDef.palette || 'day');
    g.day.resync();
    g.day.write();
  }

  // PALOMA along the clip's line, k 0..1 (linear: she is under way when the shot starts), bobbing.
  moveBoat(k) {
    const sc = this.sc, clip = sc.clip, b = sc.boat;
    const s = clip.start === 'moor' ? [PALOMA.x, PALOMA.z] : clip.start;
    b.x = s[0] + lerp(clip.from[0], clip.to[0], k);
    b.z = s[1] + lerp(clip.from[1], clip.to[1], k);
    b.yaw = PALOMA.yaw + lerpAngle(clip.from[2], clip.to[2], k);
    const t = this.g.time, m = PALOMA.mesh;
    b.y = Math.sin(t * 1.15) * 0.05 + (clip.start === 'moor' ? 0 : Math.sin(t * 0.7 + 1) * 0.04);
    m.position.set(b.x, b.y, b.z);
    m.rotation.y = b.yaw;
  }
  // [u (port), v (bow)] in her frame now, to the world.
  at(u, v, f = this.sc.boat) {
    const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
    return { x: f.x + u * c + v * s, z: f.z - u * s + v * c };
  }
  // The passengers where the boat is now (by hand: Stig is seated, no physics step; the doubles are
  // in no world list).
  place() {
    const sc = this.sc, c = this.cfg, b = sc.boat;
    for (const [k, pose] of Object.entries(sc.pose)) {
      const ch = this.who(k);
      if (!ch) continue;
      if (pose.pier) {
        const [u, v, yaw] = pose.pier, q = this.at(u, v, moor());
        if (ch.state !== 'normal' || Math.hypot(ch.x - q.x, ch.z - q.z) > 0.01) ch.standAt(q.x, q.z, yaw);
        continue;
      }
      if (pose.stand) {
        const [u, v] = pose.stand, q = this.at(u, v), f = this.at(c.fin.at[0], c.fin.at[1], moor());
        ch.state = 'normal';
        ch.x = q.x; ch.z = q.z; ch.y = b.y + WATER + c.deck;
        ch.yaw = Math.atan2(f.x - q.x, f.z - q.z);
        ch.vx = ch.vz = ch.vy = 0;
        continue;
      }
      const [u, v] = pose.seat, q = this.at(u, v), y = b.y + WATER + c.bench;
      if (ch.state !== 'seated') ch.seatAt({ x: q.x, y, z: q.z, yaw: b.yaw });
      const sp = ch.seatPose;
      sp.x = ch.x = q.x; sp.y = ch.y = y; sp.z = ch.z = q.z; sp.yaw = ch.yaw = b.yaw;
      ch.placeSeated(sp);
    }
  }
  // The fin bobbing in the basin, in her frame at the mooring, turning slowly.
  tickFin() {
    if (!this.fin.visible) return;
    const c = this.cfg.fin, t = this.g.time, q = this.at(c.at[0], c.at[1], moor());
    this.fin.position.set(q.x, 0.17 + Math.sin(t * 1.6) * c.bob, q.z);
    this.fin.rotation.set(Math.sin(t * 1.3) * 0.08, PALOMA.yaw + 2.2 + Math.sin(t * 0.4) * 0.3, Math.sin(t * 1.1) * 0.06);
  }

  // The shot: in her frame at the clip's start (or every frame with `track`), [u, v, y over the water];
  // with `world`, world [x, z, y].
  camera(snap) {
    const sc = this.sc, clip = sc.clip, f = clip.track ? sc.boat : sc.camFrame, cam = this.g.cam;
    const w = (a) => (clip.world ? { x: a[0], z: a[1] } : this.at(a[0], a[1], f));
    const e = w(clip.eye), l = w(clip.look);
    const eye = { x: e.x, y: 0.17 + clip.eye[2], z: e.z }, look = { x: l.x, y: 0.17 + clip.look[2], z: l.z };
    if (snap || !cam.cine) { cam.cutTo(eye, look); cam.snapNext = true; }
    else { cam.cine.pos.set(eye.x, eye.y, eye.z); cam.cine.look.set(look.x, look.y, look.z); }
  }

  // ---------------------------------------------------------------------------------------------
  // E: straight to the pier.

  skip() {
    const sc = this.sc, c = this.cfg;
    if (!sc || sc.clip.ashore) { this.finish('skip'); return; }
    hud.hideBanner();
    const pier = c.clips.find((x) => x.ashore), left = c.end - pier.at;
    sc.ev = [];
    this.g.unsay(this.g.player);
    for (const k of sc.cast) this.g.unsay(this.doubles[k]);
    sc.t = pier.at;
    this.cut(pier);
    this.on(pier.at + left, () => this.finish('skip'));
  }

  // The trip is over: free roam on the pier, the camera behind him; PALOMA moored; the doubles stay a
  // little and go out of view.
  finish(how) {
    const g = this.g, p = g.player, sc = this.sc;
    if (!sc.clip.ashore) this.cut(this.cfg.clips.find((x) => x.ashore));
    this.restoreLook();
    this.home();
    g.cam.release();
    g.cam.yaw = p.yaw;
    g.cam.snapNext = true;
    hud.letterbox(false);
    g.inDialog = false;
    this.ashore = { keys: sc.cast.slice(), until: g.time + this.cfg.stay };
    this.last.ended = how;
    this.sc = null;
  }
  // PALOMA back on her mooring (the harbour's bob takes her again), the fin away, the sky back.
  home() {
    const sc = this.sc;
    PALOMA.away = false;
    PALOMA.mesh.position.set(PALOMA.x, 0, PALOMA.z);
    PALOMA.mesh.rotation.y = PALOMA.yaw;
    this.fin.visible = false;
    if (sc?.sunset) { sc.sunset = false; this.sky(false); }
  }
  endAshore() {
    if (!this.ashore) return;
    for (const k of this.ashore.keys) this.hideDouble(k);
    this.ashore = null;
  }
  mayPop(d) {
    if (camera.position.distanceTo(_v.set(d.x, d.y + 1, d.z)) > this.cfg.popR) return true;
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    return !_frustum.intersectsSphere(_sphere.set(_sphere.center.set(d.x, d.y + 1, d.z), 1.2));
  }

  // ---------------------------------------------------------------------------------------------
  // Every frame

  update(dt) {
    const g = this.g;
    if (!this.live) {
      if (this.sc || this.ashore) this.reset();
      return;
    }
    if (this.ashore) {
      const a = this.ashore;
      for (const k of a.keys) this.doubles[k]?.sync(dt);
      if (g.time >= a.until && a.keys.every((k) => this.mayPop(this.doubles[k]))) this.endAshore();
    }
    const sc = this.sc;
    if (!sc) return;
    sc.t += dt;
    if (sc.t >= this.cfg.skipFrom && input.pressed('interact')) this.skip();
    while (this.sc && sc.ev.length && sc.ev[0].t <= sc.t) sc.ev.shift().fn();
    if (!this.sc) return;
    const clip = sc.clip, next = this.cfg.clips[this.cfg.clips.indexOf(clip) + 1];
    const t1 = next ? next.at : this.cfg.end;
    if (!clip.ashore) this.moveBoat(clamp((sc.t - clip.at) / (t1 - clip.at), 0, 1));
    else PALOMA.mesh.position.y = Math.sin(g.time * 1.15) * 0.05;
    this.place();
    this.tickFin();
    this.camera(false);
    for (const k of sc.cast) this.doubles[k].sync(dt);
  }

  // Out of free roam (a mission starts, the other level): everything back at once, Stig on the pier.
  // A mission's start owns the dialogue state, the letterbox and the camera from its first frame; only
  // a level change with the trip under way gives them back here.
  reset() {
    const g = this.g, p = g.player, sc = this.sc;
    if (sc) {
      hud.hideBanner();
      this.restoreLook();
      this.home();
      for (const f of POSES) p.anim[f] = false;
      if (p.state === 'seated' && !p.seatId && !p.car) {
        if (g.level === 'island') { const [u, v, yaw] = this.cfg.pier.stig, q = this.at(u, v, moor()); p.standAt(q.x, q.z, yaw); }
        else { p.state = 'normal'; p.anim.planeSeat = false; p.seatPose = null; }   // the other level places him
      }
      if (g.missions.state === 'idle') { g.cam.release(); g.cam.snapNext = true; hud.letterbox(false); g.inDialog = false; }
      for (const k of sc.cast) this.hideDouble(k);
      this.last.ended = 'reset';
      this.sc = null;
    }
    this.endAshore();
  }
}

// The prompt's price ({n}) as the purse shows it.
function priced(text, n) { return text.replace('{n}', pta(n)); }
