// Låna rullskidorna – åk fort på asfalt (free roam; feature 71, DESIGN §10.39). After Pepes Bodega
// the rollerskier standing at his place lends Stig his skis, poles and an ESLÖV bib, and free roam
// gets a way to move that is neither walking nor driving: on asphalt Stig poles up to 1.5 × the
// sprint, slow to speed up, wide in the turns and with no brake (he ploughs); off it he wobbles at a
// crawl with his arms up, and sand stops him dead. Off the asphalt, into a wall, a car or a person at
// speed, or onto sand he falls (Character.fling, then 'down': on his back, the skis in the air) and
// gets up blaming the heat. Berra and Swedish tourists shout "Heja Eslöv!" at the bib, and Stig puts
// them right. Eslövrundan: Eslövloppet's course (eslov.js) on the skis, against the skier's own
// measured times, with a result list. The skis go back to him by themselves when Stig gets into a
// car, a mission or a SKANDAL pursuit starts, he sits down or leaves the island, and they are never
// saved: no mission, timer or calibration pool sees them. Config: SKIDOR (content/island.js). Owned
// by Game as `skis`: main.fixedStep calls `step` before the player's Character.step and `after`
// after it, main.update calls `update`; eslov.js asks `on`, `canLend` and `waiting`; main.js asks
// for the trial's objective card, target and markers, and filters the interactables while `on`.

import { SKIDOR } from '../content/index.js';
import { MISSIONS } from './missions/index.js';
import { isRoad, blockAt, blockType, blockInterior, lm, rc, EDGE, HALF, RHW, CURB } from '../world/layout.js';
import { groundAt, groundInfo } from '../world/collision.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { S, fmt } from '../strings.js';
import { fx } from './fx.js';
import { hud } from './hud.js';
import { raceClock } from './eslov.js';
import { clamp, dist, pick, wrapAngle } from '../util.js';

// Sand for the skis (§10.39): the sand round the town and the beach past EDGE; inside the beach
// blocks (playa: south of the paseo, off the boardwalk), the dunes (off the boardwalk) and the
// lighthouse's block (off its plazas). The blocks' sidewalk rings are pavement.
function sandAt(x, z) {
  if (Math.abs(x) > EDGE || Math.abs(z) > EDGE) return true;
  const b = blockAt(x, z);
  if (!b) return false;
  const t = blockType(b.i, b.j), I = blockInterior(b.i, b.j);
  if (x < I.x0 || x > I.x1 || z < I.z0 || z > I.z1) return false;
  const lx = x - (I.x0 + I.x1) / 2, lz = z - (I.z0 + I.z1) / 2;
  if (t === 'dyner') return Math.abs(lx) > 1.3;
  if (t === 'playa') {
    if (lz < -26) return false;
    const bw = b.i === 3 ? 0 : b.i === 1 ? 12 : -12, end = b.i === 3 ? 26 : 12;
    return !(Math.abs(lx - bw) < 1.3 && lz < end);
  }
  if (t === 'fyren') return !((Math.abs(lx) <= 20 && lz >= 2 && lz <= 31) || (lx >= 20 && lx <= 31 && lz >= 12 && lz <= 21));
  return false;
}

// The ground under him for the skis: 'asphalt' (the road grid, the Eslöv lane `lane` with its kerb
// crossings, the west stub), 'sand' or 'kerb' (everything else: sidewalks, lots, decks, roofs).
export function skiSurface(x, z, y, lane) {
  groundAt(x, z, y, 0.1);
  if (groundInfo.block?.kind === 'sand') return 'sand';
  if (y > CURB + 0.3) return 'kerb';
  if (y < 0.08 && isRoad(x, z)) return 'asphalt';
  if (x >= lane.x0 && x <= lane.x1 && z >= lane.z0 && z <= lane.z1) return 'asphalt';
  if (x < -(HALF + RHW) && Math.abs(z - rc(3)) <= RHW) return 'asphalt';
  return sandAt(x, z) ? 'sand' : 'kerb';
}

export class Rollerskis {
  constructor(game, cfg = SKIDOR) {
    this.g = game;
    this.cfg = cfg;
    this.from = MISSIONS.findIndex((m) => m.id === cfg.after) + 1;
    this.on = false;         // Stig on the skis
    this.v = 0;              // his speed along the heading
    this.yaw = 0;            // the heading (his facing)
    this.vSet = 0;           // the speed the last step gave him (what a wall took is the difference)
    this.px = 0; this.pz = 0;   // where the last step started (a jump in it is a teleport)
    this.surf = null;        // the ground under him last step: 'asphalt' | 'kerb' | 'sand'
    this.mode = 'glide';     // the pose: 'pole' | 'glide' | 'wobble'
    this.fallen = null;      // the fall under way until he is up: 'sand' | 'kerb' | 'wall' | 'person'
    this.downSaid = false;
    this.falls = 0;          // this loan's
    this.sandFalls = 0;
    this.lines = [];         // [{ at, who: 'stig' | npc key, text, secs }] still to say (g.time)
    this.hejaT = -Infinity;
    this.hejaBy = new Map(); // shouter -> g.time of his last shout
    this.trial = null;       // Eslövrundan while it runs
    this.runs = 0;           // this session's finished runs (the "efter första åket")
    this.hinted = false;
    this.auto = null;        // tests: (skis) -> { yaw } (the heading the keys would ask for) or null, in place of the keys
    this.last = null;        // tests: { kind: 'lend' | 'back' | 'fall' | 'heja' | 'trial', … }
    const self = this, c = cfg;
    const skier = () => { const n = game.eslov.npc; return n ? { x: n.x, z: n.z, y: n.y } : null; };
    // E at the rollerskier standing at his place: the loan (over his "Heja Eslöv!", whose rest it is).
    game.addInteractable({ id: 'skidor:lan', r: c.lend.r, priority: 1, pos: skier, prompt: c.lend.prompt, enabled: () => self.canLend(), use: () => self.lend() });
    // On the skis: E at him gives them back, E at the start line is Eslövrundan.
    game.addInteractable({ id: 'skidor:tillbaka', r: c.back.r, skis: true, pos: skier, prompt: c.back.prompt, enabled: () => self.canReturn(), use: () => self.giveBack('e') });
    game.addInteractable({ id: 'skidor:runda', r: c.trial.r, skis: true, pos: () => self.startSpot(), prompt: c.trial.prompt, enabled: () => self.canTrial(), use: () => self.startTrial() });
  }

  get unlocked() { return this.g.missions.index >= this.from; }
  get active() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  // The Eslöv lane's asphalt in world coordinates (from ESLOV.at).
  get lane() {
    if (!this._lane) {
      const l = lm(this.g.eslov.cfg.at), [x0, z0, x1, z1] = this.cfg.lane;
      this._lane = { x0: l.x + x0, z0: l.z + z0, x1: l.x + x1, z1: l.z + z1 };
    }
    return this._lane;
  }
  startSpot() { const l = lm(this.g.eslov.cfg.at), [dx, dz] = this.cfg.trial.start; return { x: l.x + dx, z: l.z + dz }; }
  surface() { const p = this.g.player; return skiSurface(p.x, p.z, p.y, this.lane); }

  // ---- the loan ----------------------------------------------------------------------------------
  free() {
    const g = this.g, p = g.player;
    return !g.inDialog && !g.playerCar && !g.carrying && !g.shame.pursuit && p.state === 'normal' && p.onGround
      && !(g.frozenT > 0) && !(g.shame.panicT > 0);
  }
  // He stands at his place (a rest between laps, or the night): E is the loan, once Pepes Bodega is done.
  canLend() {
    const e = this.g.eslov, n = e.npc;
    return this.unlocked && this.active && !this.on && !!n && n.spot === 'eslov' && e.mode === 'rest' && n.state === 'normal' && this.free();
  }
  // eslov.js: Stig on foot by the skier's place, after the bodega: he comes back to it and stays.
  waiting() {
    const g = this.g, p = g.player, l = lm(g.eslov.cfg.at);
    return this.unlocked && !this.on && !g.playerCar && p.state === 'normal' && dist(p.x, p.z, l.x, l.z) < this.cfg.lend.waitR;
  }
  canReturn() { return this.on && !this.trial && this.g.eslov.mode === 'lent' && this.free(); }
  lend() {
    if (!this.canLend()) return;
    const g = this.g, c = this.cfg.lend, p = g.player;
    g.say(p, c.ask, 2.2);
    this.lines.push({ at: g.time + 1.3, who: g.eslov.cfg.who, text: c.yes, secs: 2.4 });
    this.put(true);
    this.falls = this.sandFalls = 0;
    if (!this.hinted) { this.hinted = true; hud.toast(c.hint); }
    this.last = { kind: 'lend', t: g.time };
  }
  put(on) {
    const p = this.g.player;
    if (!on && this.trial) this.endTrial('abort');
    this.on = on;
    p.anim.ski = on;
    p.anim.skiMode = on ? 'glide' : undefined;
    p.faceWish = !on;
    this.v = this.vSet = 0;
    this.yaw = p.yaw;
    this.px = p.x; this.pz = p.z;
    this.surf = null;
    this.fallen = null;
    this.mode = 'glide';
  }
  // E at him (`e`), or by themselves (a car, a mission, a pursuit, …): he has them on again at once.
  giveBack(kind) {
    if (!this.on) return;
    const g = this.g, c = this.cfg.back, p = g.player, falls = this.falls, sand = this.sandFalls;
    this.put(false);
    if (kind === 'e') {
      g.say(p, c.stig, 1.8);
      this.lines.push({ at: g.time + 1.1, who: g.eslov.cfg.who, text: sand ? c.sand : falls ? c.fell : c.clean, secs: 2.4 });
    } else hud.toast(c.auto);
    this.last = { kind: 'back', by: kind, falls, sand, t: g.time };
  }
  // What keeps them on: free roam on the island, on foot, standing, nobody carried, no pursuit.
  keep() {
    const g = this.g, p = g.player;
    return this.active && !g.playerCar && !g.shame.pursuit && !g.carrying && p.state !== 'seated' && p.state !== 'hidden'
      && p.state !== 'lying' && !g.belt.seated && !g.fest.joined;
  }

  // ---- the skis (main.fixedStep) ---------------------------------------------------------------------
  step(h) {
    if (!this.on) return;
    const g = this.g, p = g.player, c = this.cfg;
    if (p.state !== 'normal') { this.v = this.vSet = 0; this.px = p.x; this.pz = p.z; return; }
    // What the last step met: a jump in his position (R, a cut) stops him; a wall or a car took what
    // it took of his speed, and at speed put him down.
    const vAct = Math.hypot(p.vx, p.vz);
    if (dist(p.x, p.z, this.px, this.pz) > this.vSet * h + 2) this.v = 0;
    else if (this.vSet > 0.05 && vAct < this.vSet - 0.05) {
      if (this.vSet >= c.fall.wallV && vAct < c.fall.keep * this.vSet) { this.fall('wall'); return; }
      this.v = vAct;
      if (vAct > 0.5) this.yaw = Math.atan2(p.vx, p.vz);
    }
    const frozen = g.inDialog || g.missions.state === 'failed' || g.frozenT > 0 || g.shame.panicT > 0;
    // The heading the keys ask for (camera-relative, as on foot), and how hard.
    let want = null, push = 0;
    if (frozen) this.v = 0;
    else if (this.auto) { const a = this.auto(this); if (a) { want = a.yaw; push = 1; } }
    else {
      const mx = input.moveX(), my = input.moveY(), fx = Math.sin(g.cam.yaw), fz = Math.cos(g.cam.yaw);
      const wx = fx * my - fz * mx, wz = fz * my + fx * mx, l = Math.hypot(wx, wz);
      if (l > 0.2) { want = Math.atan2(wx, wz); push = Math.min(1, l); }
    }
    const s = p.onGround ? this.surface() : 'air';
    if (s === 'sand' && this.v > c.sand.fallV) { this.fall('sand'); return; }
    if (s === 'kerb' && this.v > c.fall.kerbV) { this.fall('kerb'); return; }
    // Along the heading he poles, against it he ploughs (and turns only once he is slow), across it
    // he rolls; the heading turns to the keys' at most `turn.lat` m/s² sideways.
    let mode = 'roll';
    if (want != null) {
      const d = wrapAngle(want - this.yaw);
      mode = Math.abs(d) < c.poleArc ? 'pole' : Math.abs(d) > c.plogArc ? 'plog' : 'roll';
      const w = s === 'kerb' || s === 'sand' ? c.kerb.turn : Math.min(c.turn.max, c.turn.lat / Math.max(this.v, 0.1)) * (s === 'air' ? c.turn.air : 1);
      if (mode !== 'plog' || this.v < 1.5) this.yaw += clamp(d, -w * h, w * h);
    }
    if (s !== 'air') {
      const top = s === 'asphalt' ? c.speed : s === 'sand' ? c.sand.speed : c.kerb.speed;
      if (mode === 'pole' && this.v < top) this.v = Math.min(top, this.v + c.accel * push * h);
      else if (mode === 'plog') this.v = Math.max(0, this.v - c.plog * h);
      else this.v = Math.max(0, this.v - c.roll * h);
      if (this.v > top) this.v = Math.max(top, this.v - c.kerb.decel * h);
      this.surf = s;
    }
    this.mode = s === 'kerb' || s === 'sand' || mode === 'plog' ? 'wobble' : mode === 'pole' && s !== 'air' ? 'pole' : 'glide';
    const hx = Math.sin(this.yaw), hz = Math.cos(this.yaw);
    p.vx = p.wishX = hx * this.v;
    p.vz = p.wishZ = hz * this.v;
    p.yaw = this.yaw;
    p.anim.sprint = false;
    p.anim.skiMode = this.mode;
    this.vSet = this.v;
    this.px = p.x; this.pz = p.z;
  }
  // After his Character.step: a person ahead of him at speed, bowled over as by a kick, and he falls.
  after() {
    if (!this.on || this.v < this.cfg.fall.wallV) return;
    const g = this.g, p = g.player, hx = Math.sin(this.yaw), hz = Math.cos(this.yaw);
    if (p.state !== 'normal') return;
    for (const ch of g.allChars()) {
      if (ch === p || ch.state !== 'normal' || ch.solid === false || Math.abs(ch.y - p.y) > 1.2) continue;
      const dx = ch.x - p.x, dz = ch.z - p.z;
      if (Math.hypot(dx, dz) > p.r + ch.r + 0.1 || dx * hx + dz * hz <= 0) continue;
      this.bowl(ch);
      this.fall('person');
      return;
    }
  }
  // As areaHit's kick: a pedestrian or an extra is flung (SKANDAL, "Aj!"), the cast only says so.
  bowl(ch) {
    const g = this.g, v = this.v, hx = Math.sin(this.yaw), hz = Math.cos(this.yaw);
    if (ch.key) g.say(ch, g.bark(ch, 'kicked'), 1.4);
    else if (ch.fling(hx * v * 0.5 + (Math.random() - 0.5) * 2, 4.5, hz * v * 0.5 + (Math.random() - 0.5) * 2)) {
      g.shame.add(9);
      audio.ouch();
      g.say(ch, g.bark(ch, 'ouch'), 1.5);
    }
    g.sorry.offence('kick');
  }
  fall(kind) {
    const g = this.g, p = g.player, v = this.v, hx = Math.sin(this.yaw), hz = Math.cos(this.yaw);
    const back = Math.min(3, v * 0.3);
    const ok = kind === 'sand' ? p.fling(hx * v * 0.35, 3.4, hz * v * 0.35)
      : kind === 'kerb' ? p.fling(hx * v * 0.6, 4 + v * 0.15, hz * v * 0.6)
        : p.fling(-hx * back, 3.8, -hz * back);
    this.v = this.vSet = 0;
    if (!ok) return false;
    this.fallen = kind;
    this.downSaid = false;
    this.falls++;
    if (kind === 'sand') this.sandFalls++;
    if (this.trial) this.trial.falls++;
    audio.thud();
    if (kind !== 'sand') audio.crash(0.3);
    fx.dust(p.x, p.z, 10, p.y + 0.2);
    this.last = { kind: 'fall', fall: kind, v: +v.toFixed(2), x: +p.x.toFixed(2), z: +p.z.toFixed(2), t: g.time };
    return true;
  }

  // ---- the frame -----------------------------------------------------------------------------------
  update() {
    const g = this.g, p = g.player;
    if (this.on && !this.keep()) this.giveBack(g.missions.state !== 'idle' ? 'mission' : g.playerCar ? 'car' : g.shame.pursuit ? 'pursuit' : 'auto');
    this.sayDue();
    if (!this.on) return;
    if (this.fallen) {
      if (p.state === 'down' && !this.downSaid) {
        this.downSaid = true;
        if (this.fallen === 'sand') g.say(p, this.cfg.fall.sand, 2.4);
      }
      if (p.state === 'normal') {
        if (this.fallen !== 'sand') g.say(p, pick(this.cfg.fall.getUp), 2);
        this.fallen = null;
        this.yaw = p.yaw;
        this.v = this.vSet = 0;
        this.px = p.x; this.pz = p.z;
      }
    }
    this.cheers();
    if (this.trial) this.tickTrial();
  }
  sayDue() {
    const g = this.g;
    if (!this.lines.length) return;
    if (g.inDialog) { this.lines.length = 0; return; }
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i];
      if (l.at > g.time) continue;
      this.lines.splice(i--, 1);
      const who = l.who === 'stig' ? g.player : g.npc(l.who);
      if (!who || who.state !== 'normal') continue;
      g.say(who, l.text, l.secs || 2.2);
      if (who !== g.player) who.chatT = 8 + Math.random() * 4;   // the chatter clock restarts: no bubble over his line
    }
  }
  // "Heja Eslöv!" at the bib: Berra or a Swedish tourist he passes at speed; Stig puts them right.
  cheers() {
    const g = this.g, c = this.cfg.heja, p = g.player;
    if (this.v < c.minV || p.state !== 'normal' || g.inDialog || g.time - this.hejaT < c.gap) return;
    let who = null, id = null, bd = c.r;
    const ok = (ch, k) => ch && ch.state === 'normal' && ch.root.visible && !ch.car && Math.abs(ch.y - p.y) < 2
      && g.time - (this.hejaBy.get(k) ?? -Infinity) >= c.every;
    const berra = g.npcs.berra;
    if (ok(berra, 'berra') && !g.npcPosed('berra') && !g.saying?.(berra)) { const d = dist(berra.x, berra.z, p.x, p.z); if (d < bd) { who = berra; id = 'berra'; bd = d; } }
    if (g.levelDef.sim.peds) for (const ped of g.peds) {
      const ch = ped.char;
      if (ch.def.local || !ok(ch, ch)) continue;
      const d = dist(ch.x, ch.z, p.x, p.z);
      if (d < bd) { who = ch; id = ch; bd = d; }
    }
    if (!who) return;
    this.hejaT = g.time;
    this.hejaBy.set(id, g.time);
    g.say(who, c.shout, 1.8);
    this.lines.push({ at: g.time + c.answerAt, who: 'stig', text: c.answer, secs: 2.4 });
    this.last = { kind: 'heja', by: id === 'berra' ? 'berra' : 'ped', t: g.time };
  }

  // ---- Eslövrundan ---------------------------------------------------------------------------------
  canTrial() {
    const g = this.g;
    return this.on && !this.trial && this.active && this.v < 2 && this.free() && !!g.eslov.npc;
  }
  // E at the start line: a black cut, Stig on the line facing north, the countdown (frozen), go.
  startTrial() {
    if (!this.canTrial()) return;
    const g = this.g;
    this.trial = { ...g.eslov.course(), start: this.startSpot(), t0: null, pi: 0, faded: false, placed: false, count: 4, falls: 0 };
  }
  tickTrial() {
    const g = this.g, r = this.trial, c = this.cfg.trial, p = g.player;
    if (r.t0 == null) { this.tickStart(); return; }
    const el = g.time - r.t0;
    // No shortcuts by R (any jump in his position) and no more than `cap` s.
    if (dist(p.x, p.z, r.px, r.pz) > 3) { this.endTrial('abort'); return; }
    r.px = p.x; r.pz = p.z;
    if (r.pi < r.cps.length) {
      const q = r.cps[r.pi];
      if (dist(p.x, p.z, q.x, q.z) < q.r) { r.pi++; audio.checkpoint(); }
    } else if (p.z <= r.lineZ && r.prevZ > r.lineZ && Math.abs(p.x - r.lineX) <= r.lineW) { this.endTrial('done', el); return; }
    r.prevZ = p.z;
    if (el >= c.cap) this.endTrial('abort');
  }
  tickStart() {
    const g = this.g, r = this.trial, c = this.cfg.trial, p = g.player, t = g.time - (r.at ??= g.time);
    const tFade = 0.3, tPlace = tFade + c.fadeSecs;
    if (t >= tFade && !r.faded) { r.faded = true; hud.fade(true); g.frozenT = c.fadeSecs + c.count + 0.3; }
    if (t >= tPlace && !r.placed) {
      r.placed = true;
      if (p.state !== 'normal') { hud.fade(false); g.frozenT = 0; this.endTrial('abort'); return; }
      p.teleport(r.start.x, r.start.z, Math.PI);
      this.yaw = Math.PI;
      this.v = this.vSet = 0;
      this.px = p.x; this.pz = p.z;
      g.cam.yaw = Math.PI;
      g.cam.snapNext = true;
      hud.fade(false);
    }
    if (!r.placed) return;
    const left = tPlace + c.count - t, k = Math.ceil(left);
    if (k !== r.count && k >= 0 && k <= 3) {
      r.count = k;
      if (k > 0) { hud.showBanner(String(k), '', 'count', 900); audio.tick(); }
      else { hud.showBanner(S.go, '', 'count', 900); audio.checkpoint(); }
    }
    if (left <= 0) {
      g.frozenT = 0;
      r.t0 = g.time;
      r.px = p.x; r.pz = p.z; r.prevZ = p.z;
    }
  }
  // Finished (`done`, el s): the result list, the prize, the record, the skier's line; else `abort`.
  endTrial(kind, el = null) {
    const g = this.g, c = this.cfg.trial, r = this.trial;
    this.trial = null;
    if (!r) return;
    if (r.t0 == null && r.faded) { hud.fade(false); g.frozenT = 0; }
    if (kind !== 'done') {
      hud.toast(c.abort);
      this.last = { kind: 'trial', result: 'abort', cps: r.pi, at: g.time };
      return;
    }
    this.runs++;
    const L = c.list, rows = [
      { name: L.skier[0], club: L.club, t: c.times[0] },
      { name: L.skier[1], club: L.club, t: c.times[1] },
      { name: L.stig, club: L.stigClub, t: +el.toFixed(2), me: true },
    ].sort((a, b) => a.t - b.t || (a.me ? -1 : b.me ? 1 : 0));
    const place = rows.findIndex((x) => x.me);
    const ord = c.ords[this.runs - 1] ?? fmt(c.ordN, { n: this.runs });
    const caption = fmt(c.place[place], { ord });
    const best = g.records.eslovSkidor ?? null, record = best == null || el < best;
    if (record) g.records.eslovSkidor = +el.toFixed(2);
    if (place === 0) { g.addCoins(c.prize); hud.toast(fmt(c.toast, { n: c.prize })); }
    g.save();
    hud.showResults(L.title, rows.map((x, k) => ({ rank: k + 1, name: x.name, club: x.club, time: raceClock(x.t), me: !!x.me })), caption, 6.5);
    audio.jingle(place === 0 ? 'complete' : place === 1 ? 'pryl' : 'fail');
    if (record) hud.toast(fmt(c.record, { t: raceClock(el) }));
    this.lines.push({ at: g.time + 1.2, who: g.eslov.cfg.who, text: c.lines[place], secs: 2.4 });
    this.last = { kind: 'trial', result: 'done', t: +el.toFixed(2), place: place + 1, caption, record, falls: r.falls, run: this.runs, at: g.time };
  }

  // main.js: the trial's card, the guide's target and the minimap's next point.
  objective() {
    const g = this.g, r = this.trial;
    if (!r || !this.on) return null;
    const c = this.cfg.trial, el = r.t0 == null ? 0 : g.time - r.t0, n = r.cps.length + 1, best = g.records.eslovSkidor;
    const text = fmt(c.text, { t: raceClock(el), a: raceClock(c.times[0]), b: raceClock(c.times[1]) });
    return { title: c.title, text: best != null ? `${text} · ${fmt(c.best, { t: raceClock(best) })}` : text,
      bar: r.pi / n, barLabel: fmt(c.cp, { i: r.pi, n }), barColor: '#ffd23f' };
  }
  target() {
    const r = this.trial;
    if (!r || !this.on) return null;
    const q = r.cps[r.pi];
    return q ? { x: q.x, z: q.z, r: q.r } : { x: r.lineX, z: r.lineZ, r: 2.5 };
  }
  markers() {
    const r = this.trial;
    if (!r || !this.on) return [];
    const q = r.cps[r.pi + 1] || (r.pi < r.cps.length ? { x: r.lineX, z: r.lineZ } : null);
    return q ? [{ type: 'item', x: q.x, z: q.z, edge: false }] : [];
  }
}
