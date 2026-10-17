// Smörj in Majsans rygg – the SOLKRÄM meter (free roam; feature 35, DESIGN §10.26). Majsan's two
// pool lines from the film ("Du, vill du smörja in mig på ryggen?" / "Ta inte för mycket, då kan det
// börja koka.") are first heard in fataga's intro; after it she asks again at Flamenco's pool. E by
// her ("E Smörj in ryggen") plays a short scene (the film's pair once ever, later one of ours), she
// turns her back, and Stig stands behind her with his hands on her shoulders. Holding E fills the
// meter (the objective card: the haggle's bar as the cream, a green field with a light stripe in its
// middle, the marker on the fill) and he lets go in the green:
//  - in it Majsan is pleased and Siv holds up a card from her place: 5 at the field's edge, 6 nearer,
//    7 in the stripe ("Giraffen, då? Sju." / "Mer än pizza-racern!");
//  - past it (or held to the end) the cream runs down her back, seen from behind: "Oj! Nu kokar det!",
//    Stig blames the bottle and Siv's minus;
//  - short of it Majsan asks if that was all.
// The field narrows with each try of the session. The best points are `records.solkram` (saved), and
// the first 7 unlocks `sjuPoang`: Siv's chatter is about it from then on. Only on the island with no
// mission running (`missions.state === 'idle'`) from `fromIndex`, by day, on foot, with both sisters
// at home and nobody's; the scene holds them (`busy`) and is a dialogue throughout, so no mission,
// timer or calibration pool sees it. Config: SOLKRAM (content/island.js). Owned by Game as
// `solkram`: main.js calls `update` once a frame and `objective` in updateHud; the interactable is
// registered here.

import { SOLKRAM } from '../content/index.js';
import { THREE, scene, GeoBuilder, toonMesh, MAT } from '../gfx.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { fmt } from '../strings.js';
import { hud } from './hud.js';
import { dist, yawTo, pick } from '../util.js';

const KEYS = ['majsan', 'siv'];
const CREAM = 0xfffbea;
// The cream on her back, in her frame: its top at the shoulder blades, the dress's back further out
// lower down (the skirt's cone).
const BACK_Y = 1.36;
const backZ = (y) => -(0.155 + Math.max(0, BACK_Y - y) * 0.16);

// The unbranded bottle (§1.5): an orange body, a white cap and nozzle, 0.24 m.
function bottleMesh() {
  const g = new GeoBuilder();
  g.cyl(0xf07f1e, 0, 0.09, 0, 0.042, 0.18, 12);
  g.cyl(0xfff8e6, 0, 0.195, 0, 0.034, 0.03, 12);
  g.cone(0xfff8e6, 0, 0.23, 0, 0.016, 0.04, 8);
  return toonMesh(g.build(), { outline: 0.012 });
}
// A dab of cream: a few white blobs (scaled with the fill); a drop running down is one blob. Unlit
// (the mouths' vertex-colour material): on her back in the shade the toon cream read as grey cloth.
function dabMesh() {
  const g = new GeoBuilder();
  g.sphere(CREAM, 0, 0, 0, 0.15, 0.1, 0.06);
  g.sphere(CREAM, 0.08, -0.03, 0, 0.09, 0.07, 0.05);
  g.sphere(CREAM, -0.07, 0.015, 0, 0.08, 0.065, 0.045);
  return toonMesh(g.build(), { outline: 0.008, cast: false, material: MAT.mouth });
}
function dropMesh() {
  const g = new GeoBuilder();
  g.sphere(CREAM, 0, 0, 0, 0.065, 0.12, 0.04);
  return toonMesh(g.build(), { outline: 0.006, cast: false, material: MAT.mouth });
}

export class Solkram {
  constructor(game, cfg = SOLKRAM) {
    this.g = game;
    this.cfg = cfg;
    this.phase = null;     // null | 'intro' | 'ready' | 'hold' | 'result' (a scene under way)
    this.fill = 0;         // the meter, 0..1
    this.zone = null;      // [z0, z1] this try
    this.mid = 0;          // the field's middle
    this.armed = false;    // E seen up since the meter came on (the line's skip press does not count)
    this.waitT = 0;        // s on the meter without a hold
    this.squirtT = 0;
    this.restT = 0;        // s before E starts the next try
    this.cardT = 0;
    this.dripT = -1;       // s since the cream started running (-1: not running)
    this.flailT = 0;       // s left of Stig's flail (only the one set here)
    this.lines = [];       // the result's bubbles still to say: [{ at, who, text }] (g.time)
    this.doneAt = 0;       // g.time the result ends
    this.frontAt = null;   // g.time the over's shot cuts back to the meter's
    this.tries = 0;       // tries this session (the field narrows with each)
    this.last = null;      // tests: { kind, points, fill, zone, mid, record, best, t }
    this.held = null;      // key -> { busy } while a scene holds the sisters
    this.stage = null;     // the scene's spots: { m: { x, z }, f: { x, z }, r: { x, z } }
    this.buildMeshes();
    const self = this;
    game.addInteractable({
      id: 'solkram', r: cfg.r, priority: cfg.priority, prompt: cfg.prompt,
      pos: () => { const n = game.npc('majsan'); return n ? { x: n.x, z: n.z, y: n.y } : null; },
      enabled: () => self.canUse(),
      use: () => self.start(),
    });
  }

  get live() {
    const g = this.g;
    return g.level === 'island' && g.missions.state === 'idle' && g.missions.index >= this.cfg.fromIndex;
  }
  // The meter's shot and card are up (tests).
  get meter() { return this.phase === 'ready' || this.phase === 'hold'; }

  // On foot, standing, free (as the G17 toasters'); not in a scene, not in Eslövloppet (its clock
  // would run on through the scene).
  playerFree() {
    const g = this.g, p = g.player;
    return !g.inDialog && !g.playerCar && !g.carrying && p.state === 'normal' && p.onGround && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.shame.pursuit && !g.fest.joined && !g.belt.seated && !g.eslov.race;
  }
  // Where she lives (her HOMES spot, or an unlock's override), or null; its placeNpcs spot id.
  homeOf(key) {
    const g = this.g;
    let home = g.levelDef.homes(g)[key] ?? null;
    if (key in g.homeOverrides) home = g.homeOverrides[key];
    return home && !home.seat ? home : null;
  }
  // Standing at home, shown, nobody's: not placed or held by a mission, another free-roam module
  // (honk.free asks them all) or a scene (`busy`), not the waiting mission's giver or extra.
  atHome(key) {
    const g = this.g, n = g.npc(key), home = this.homeOf(key), cur = g.missions.current;
    if (!n || !home || n.state !== 'normal' || !n.root.visible || n.car || n.seatId || n.busy || !g.honk.free(key)) return false;
    if (cur && cur.level === 'island' && (cur.giver === key || cur.extra?.some((e) => e === key || (Array.isArray(e) && e[0] === key)))) return false;
    const q = g.lmOffset(home[0], home[1], home[2]);
    return n.spot === `${home[0]}:${home[1]}:${home[2]}` && dist(n.x, n.z, q.x, q.z) < this.cfg.homeR;
  }
  canUse() {
    return !this.phase && this.restT <= 0 && this.live && this.g.day.isDay() && this.playerFree() && KEYS.every((k) => this.atHome(k));
  }

  // ---------------------------------------------------------------------------------------------
  // The scene

  async start() {
    if (!this.canUse()) return;
    const g = this.g, c = this.cfg, p = g.player, st = c.stage;
    const M = g.npc('majsan'), V = g.npc('siv');
    this.phase = 'intro';
    this.held = {};
    for (const k of KEYS) { const n = g.npc(k); this.held[k] = { busy: n.busy }; n.busy = true; n.vx = n.vz = 0; }
    // Her frame with her back to Stig: f her facing then, r her right.
    const home = this.homeOf('majsan'), m = g.lmOffset(home[0], home[1], home[2]);
    const f = { x: Math.sin(st.yaw), z: Math.cos(st.yaw) }, r = { x: -f.z, z: f.x };
    this.stage = { m, f, r };
    // The ask: face to face, Stig `talk` m in front of her.
    M.teleport(m.x, m.z, st.yaw + Math.PI);
    p.teleport(m.x - f.x * st.talk, m.z - f.z * st.talk, st.yaw);
    p.vx = p.vz = 0;
    V.yaw = yawTo(m.x - V.x, m.z - V.z);
    this.showBottle(true);
    g.cinematic(M, p);
    this.cut(st.camAsk, st.lookAsk);
    const first = !g.unlocked.has(c.onceKey);
    if (first) { g.unlocked.add(c.onceKey); g.save(); }
    await g.dialog(first ? c.ask : pick(c.again));
    if (this.phase !== 'intro') return;   // reset meanwhile
    this.turn();
  }

  // She turns her back, Stig steps up behind her, the meter comes on (letterbox off for the card).
  turn() {
    const g = this.g, c = this.cfg, st = c.stage, p = g.player, M = g.npc('majsan');
    const { m, f } = this.stage;
    M.teleport(m.x, m.z, st.yaw);
    p.teleport(m.x - f.x * st.back, m.z - f.z * st.back, st.yaw);
    p.vx = p.vz = 0;
    p.anim.rub = 1;
    this.cut(st.cam, st.look);
    hud.letterbox(false);
    g.inDialog = true;
    const w = Math.max(c.zone.min, c.zone.w0 * c.zone.shrink ** this.tries);
    this.mid = c.zone.at[0] + Math.random() * (c.zone.at[1] - c.zone.at[0]);
    this.zone = [this.mid - w / 2, this.mid + w / 2];
    this.tries++;
    this.fill = 0;
    this.armed = false;
    this.waitT = 0;
    this.squirtT = 0;
    this.phase = 'ready';
  }

  // A fixed shot from her frame: [forward, right, height] for the eye and the look.
  cut(eye, look) {
    const { m, f, r } = this.stage, at = (a) => ({ x: m.x + f.x * a[0] + r.x * a[1], y: a[2], z: m.z + f.z * a[0] + r.z * a[1] });
    const gy = this.g.groundAt(m.x, m.z);
    const e = at(eye), l = at(look);
    e.y += gy; l.y += gy;
    this.g.cam.cutTo(e, l);
  }

  // E let go (or the bar full): early, in the field (5, 6, 7) or over.
  judge() {
    const g = this.g, c = this.cfg, p = g.player, fill = this.fill;
    const [z0, z1] = this.zone, off = Math.abs(fill - this.mid);
    const kind = fill < z0 ? 'early' : fill > z1 ? 'over' : off <= c.bull ? 7 : off <= c.six ? 6 : 5;
    const k = c.kinds[kind];
    this.phase = 'result';
    p.anim.rub = 1;
    const points = typeof kind === 'number' ? kind : kind === 'over' ? -1 : null;
    const best = g.records.solkram ?? null, record = points > 0 && (best == null || points > best);
    if (record) { g.records.solkram = points; g.save(); }
    this.last = { kind, points, fill: +fill.toFixed(3), zone: this.zone.map((v) => +v.toFixed(3)), mid: +this.mid.toFixed(3), record, best: g.records.solkram ?? null, t: g.time };
    const V = g.npc('siv');
    if (k.card) { V.anim.card = k.card; this.cardT = c.cardSecs; }
    if (k.laugh) V.anim.laugh = true;
    const main = kind === 'over' ? c.scoreOver : kind === 'early' ? c.scoreEarly : fmt(c.score, { n: points });
    const sub = record ? c.newRecord : g.records.solkram != null ? fmt(c.record, { n: g.records.solkram }) : '';
    hud.showScore(main, sub, record);
    if (kind === 'over') {
      // From behind: the cream runs down her back; Stig steps back from it and flails.
      const { m, f } = this.stage, back = c.stage.back + c.stage.overStep;
      p.teleport(m.x - f.x * back, m.z - f.z * back, c.stage.yaw);
      this.cut(c.stage.camOver, c.stage.lookOver);
      this.dripT = 0;
      audio.splat();
      p.anim.rub = false;
      p.anim.flail = true;
      this.flailT = c.flailSecs;
      this.frontAt = g.time + k.front;
    } else if (kind === 'early') audio.thud();
    else audio.pling();
    hud.letterbox(true);
    this.say(k.lines);
  }

  // The result's lines as bubbles, [delay s, who, text] from now; the scene ends `tail` s after the
  // last one starts.
  say(lines) {
    const t = this.g.time;
    this.lines = lines.map(([d, who, text]) => ({ at: t + d, who, text }));
    this.doneAt = t + Math.max(...lines.map(([d]) => d)) + this.cfg.tail;
  }

  // The scene is over: the camera back behind him, the sisters free, the next try after `restSecs`.
  // Only a scene of ours ends the cinematic (a reset for a mission start must not end the mission's).
  end(unlock = true) {
    const g = this.g, p = g.player, was = this.phase;
    this.phase = null;
    this.zone = null;
    this.lines = [];
    this.frontAt = null;
    this.restT = this.cfg.restSecs;
    p.anim.rub = false;
    if (this.flailT > 0 && !g.flailPose) p.anim.flail = false;
    this.flailT = 0;
    if (was) {
      g.endCinematic();
      // The chase camera from her right side, the two of them side by side (from behind Stig it
      // stood at Siv's place).
      const r = this.stage?.r;
      if (r) g.cam.yaw = yawTo(-r.x, -r.z);
      g.cam.snapNext = true;
    }
    this.release();
    this.showBottle(false);
    this.dab.visible = false;
    this.dripT = -1;
    for (const d of this.drops) d.visible = false;
    if (unlock && this.last?.points === 7 && !g.unlocked.has('sjuPoang')) g.unlock('sjuPoang');
  }

  // Back to whatever held them before (nothing: they are at home and placeNpcs takes them again).
  release() {
    if (!this.held) return;
    const g = this.g;
    for (const [k, h] of Object.entries(this.held)) { const n = g.npc(k); if (n) { n.busy = h.busy; n.anim.laugh = false; } }
    this.held = null;
  }

  // A mission start or the other level mid-scene: everything off at once.
  reset() {
    this.end(false);   // a start() still in its dialogue stops after it (phase no longer 'intro')
    this.cardDown();
    hud.hideScore();
  }

  cardDown() {
    this.cardT = 0;
    const V = this.g.npc('siv');
    if (V && V.anim.card != null) V.anim.card = null;
  }

  // ---------------------------------------------------------------------------------------------
  // The bottle and the cream

  buildMeshes() {
    this.bottle = bottleMesh();
    this.bottle.visible = false;
    scene.add(this.bottle);
    this.dab = dabMesh();
    this.dab.visible = false;
    scene.add(this.dab);
    this.drops = [0, 1, 2].map(() => { const d = dropMesh(); d.visible = false; scene.add(d); return d; });
  }
  showBottle(on) {
    const b = this.bottle;
    b.visible = on;
    if (!on || !this.stage) return;
    const { m, f, r } = this.stage, [fw, rt] = this.cfg.stage.bottle;
    const x = m.x + f.x * fw + r.x * rt, z = m.z + f.z * fw + r.z * rt;
    b.position.set(x, this.g.groundAt(x, z), z);
    b.rotation.set(0, 0.4, 0);
  }
  // A point on her back (her frame: side, height), in the world.
  onBack(side, y, out = 0) {
    const M = this.g.npc('majsan'), s = Math.sin(M.yaw), c = Math.cos(M.yaw), z = backZ(y) - out;
    return new THREE.Vector3(M.x + c * side + s * z, M.y + y, M.z - s * side + c * z);
  }
  tickCream(dt) {
    const M = this.g.npc('majsan');
    // The dab grows with the fill; it stays (and runs) when it is too much, and is rubbed in otherwise.
    const show = this.phase === 'hold' || (this.phase === 'result' && this.dripT >= 0);
    this.dab.visible = show && this.fill > 0.02;
    if (this.dab.visible) {
      const k = 0.35 + Math.min(1.25, this.fill) * 1.1;
      this.dab.position.copy(this.onBack(0, BACK_Y - 0.04, 0.01));
      this.dab.rotation.set(0, M.yaw + Math.PI, 0);
      this.dab.scale.set(k, k, 1);
    }
    if (this.dripT < 0) return;
    this.dripT += dt;
    const T = this.cfg.drip;
    this.drops.forEach((d, i) => {
      const t = Math.min(1, Math.max(0, this.dripT - i * 0.22) / T);
      d.visible = this.dripT > i * 0.22;
      const y = BACK_Y - 0.08 - t * (0.42 + i * 0.12);
      d.position.copy(this.onBack([0.04, -0.06, 0.09][i], y, 0.008));
      d.rotation.set(0, M.yaw + Math.PI, 0);
      d.scale.set(1, 1 + t * 0.8, 1);
    });
  }

  // ---------------------------------------------------------------------------------------------

  update(dt) {
    const g = this.g, c = this.cfg, p = g.player;
    if (!this.live) {
      if (this.phase || this.held || this.cardT > 0) this.reset();
      return;
    }
    this.restT = Math.max(0, this.restT - dt);
    if (this.cardT > 0 && (this.cardT -= dt) <= 0) this.cardDown();
    if (this.flailT > 0 && (this.flailT -= dt) <= 0 && !g.flailPose) p.anim.flail = false;
    if (this.phase) this.tickCream(dt);
    if (this.phase === 'result') {
      const due = this.lines.filter((l) => l.at <= g.time);
      this.lines = this.lines.filter((l) => l.at > g.time);
      for (const l of due) g.say(g.npc(l.who), l.text, c.lineSecs);
      if (this.frontAt != null && g.time >= this.frontAt) { this.frontAt = null; this.cut(c.stage.cam, c.stage.look); }
      if (g.time >= this.doneAt) this.end();
      return;
    }
    if (!this.meter) return;
    const down = input.down('interact');
    if (this.phase === 'ready') {
      if (!down) this.armed = true;
      else if (this.armed) { this.phase = 'hold'; p.anim.rub = 2; }
      if (this.phase === 'ready' && (this.waitT += dt) > c.readySecs) { this.giveUp(); return; }
    }
    if (this.phase !== 'hold') return;
    if (!down) { this.judge(); return; }
    this.fill = Math.min(1, this.fill + dt / c.secs);
    if ((this.squirtT -= dt) <= 0) { this.squirtT = c.squirtEvery; audio.squirt(); }
    if (this.fill >= 1) this.judge();
  }

  giveUp() {
    const g = this.g;
    this.phase = 'result';
    g.player.anim.rub = false;
    this.last = { kind: 'giveUp', points: null, fill: 0, zone: this.zone, mid: this.mid, record: false, best: g.records.solkram ?? null, t: g.time };
    hud.letterbox(true);
    this.say(this.cfg.giveUp);
  }

  // main.js updateHud, with no mission's card: the meter while it is on.
  objective() {
    if (!this.meter) return null;
    const c = this.cfg, [z0, z1] = this.zone, w = z1 - z0, f = this.fill, over = f > z1;
    // The field green, its middle `bull` either side light: the 7.
    const a = Math.max(0, (0.5 - c.bull / w) * 100).toFixed(1), b = Math.min(100, (0.5 + c.bull / w) * 100).toFixed(1);
    const zoneFill = `linear-gradient(90deg, rgba(58, 190, 104, 0.5) ${a}%, rgba(214, 255, 222, 0.95) ${a}% ${b}%, rgba(58, 190, 104, 0.5) ${b}%)`;
    const text = this.phase === 'ready' ? c.text : over ? c.textOver : f >= z0 ? c.textZone : c.textHold;
    return { title: c.title, text, bar: f, barColor: over ? c.barColorOver : c.barColor, zone: this.zone, zoneColor: [zoneFill, c.zoneEdge],
      marker: f, barLabel: over ? c.barLabelOver : c.barLabel };
  }
}
