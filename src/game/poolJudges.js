// Siv och Majsan sätter poäng – the sisters judge his dives (free roam; feature 4, DESIGN §10.8).
// The points scene from the plane as a game at Flamenco's pool: Stig bounces off the diving board,
// and every hop that ends in the water gets Siv's card and Majsan's. A stomp in the air (J) is a
// belly flop and minus points, the double jump's spin a somersault and Siv's nine (never more), any
// other hop a swan dive with his arms out and Siv's four; Majsan holds up a ten every time. The
// first bounce of a visit brings Stig's line and the sisters a few steps to the pool's edge; they
// walk home when he leaves the board alone. The best total is the saved record. Only on the island
// with no mission running (`missions.state === 'idle'`): a mission start sends them home at once,
// and no mission, timer or calibration pool is touched. Config: POOL_JUDGES (content/island.js).
// Owned by Game as `judges`; main.js hands it the player's bounces (`onBounce`) and landings
// (`onLand`), asks it for the posed sisters (`posed`) and calls `update` once a frame.

import { POOL_JUDGES } from '../content/index.js';
import { lm } from '../world/layout.js';
import { contains, groundAt, groundInfo, waterAt } from '../world/collision.js';
import { audio } from '../audio.js';
import { fmt } from '../strings.js';
import { fx } from './fx.js';
import { hud } from './hud.js';
import { dist, yawTo, dampAngle } from '../util.js';

const KEYS = ['siv', 'majsan'];
const MARK = 'poolJudges';   // npc.spot while the sisters are ours (a placement by anyone else clears it)
const num = (n) => (n < 0 ? `–${-n}` : String(n));   // an en dash for the minus (in Luckiest Guy)

export class PoolJudges {
  constructor(game, cfg = POOL_JUDGES) {
    this.g = game;
    this.cfg = cfg;
    this.hop = null;       // the hop in the air off the board (true while it lasts)
    this.visit = false;    // called by a bounce; until `stayOut` s without one, or he leaves
    this.idleT = 0;        // seconds of the visit since the last bounce
    this.out = {};         // key -> { goal: 'edge' | 'home', spot } while a sister is ours
    this.lines = [];       // [{ at, who, text }] still to say (g.time)
    this.said = new Map(); // text -> g.time it was last said
    this.cardT = 0;
    this.laugher = null;
    this.tens = 0;         // Majsan's tens this visit (Siv's tease after `teaseAfter`)
    this.teased = false;
    this.last = null;      // the last verdict, for tests: { kind, siv, majsan, sum, record, best }
  }

  get active() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  // On foot and free to hop; not in a scene, a car, a carry, a bust or a PANIK.
  canHop() {
    const g = this.g;
    return this.active && !g.inDialog && !g.playerCar && !g.carrying && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && g.player.state === 'normal';
  }
  // The board's bounce pad is the block under the `board` landmark.
  isBoard(b) { const l = lm(this.cfg.board); return !!b && b.kind === 'bounce' && contains(b, l.x, l.z); }
  // A sister who waits here as the idle mission's giver or extra (ropavieja, fataga): she judges
  // from her place, only turning to him (placeNpcs keeps her there).
  pinned(key) {
    const cur = this.g.missions.current;
    return !!cur && cur.level === 'island' && (cur.giver === key || !!cur.extra?.some((e) => e === key || (Array.isArray(e) && e[0] === key)));
  }
  // She can judge: standing, shown, not held by a mission's idle pose or the Berra job, and not
  // placed by anyone else (busy) unless she is ours.
  free(key) {
    const g = this.g, n = g.npc(key);
    return !!n && n.state === 'normal' && n.root.visible && !g.missions.idlePose(key) && !g.berraJob.posed(key)
      && (!n.busy || n.spot === MARK);
  }
  // Free and within `judgeR` m of the board (not at the airport or friskotek as a mission's extra).
  here(key) {
    const n = this.g.npc(key), b = lm(this.cfg.board);
    return this.free(key) && dist(n.x, n.z, b.x, b.z) < this.cfg.judgeR;
  }
  // main.js syncAll: a sister walking to or from the edge, or standing there, neither waves, turns
  // to him by the 10 m rule nor chatters (she turns to him here).
  posed(key) { return !!this.out[key] && this.g.npc(key)?.spot === MARK; }

  // ---------------------------------------------------------------------------------------------
  // main.js hooks

  // A bounce on a trampoline: on the board, a hop starts; the first of a visit calls the sisters.
  // The bounce gives the double jump back (one jump counted), so every hop can be a somersault: a
  // double jump during it is the spin (`jumps` 2).
  onBounce(b) {
    const g = this.g;
    this.hop = null;
    if (!this.canHop() || !this.isBoard(b) || !KEYS.every((k) => this.here(k))) return;
    this.hop = true;
    g.jumps = Math.min(g.jumps, 1);
    this.idleT = 0;
    if (!this.visit) this.call();
  }

  // The player landed hard (a fall over 6 m/s) on floor height y. A hop that ends in the water is
  // judged (with a splash for the dust); anywhere else it just ends. True: the splash replaced the
  // landing's dust.
  onLand(y) {
    const hop = this.hop, g = this.g, p = g.player;
    this.hop = null;
    p.anim.swan = false;
    if (!hop || !this.canHop() || p.standingOn || !waterAt(p.x, p.z, y)) return false;
    const kind = g.stomping ? 'magplask' : g.jumps === 2 ? 'volt' : 'svanhopp';
    if (kind === 'magplask') { fx.splash(p.x, p.z, 44, 5.5); p.flop(this.cfg.flopSecs); }
    else fx.splash(p.x, p.z, 28, 4.5);
    audio.splash();
    if (KEYS.every((k) => this.free(k) && dist(g.npc(k).x, g.npc(k).z, p.x, p.z) < this.cfg.judgeR)) this.judge(kind);
    return true;
  }

  // ---------------------------------------------------------------------------------------------

  // Stig's line, and the sisters to the pool's edge (a pinned one stays and only turns).
  call() {
    const g = this.g, c = this.cfg;
    this.visit = true;
    this.tens = 0;
    this.teased = false;
    this.sayOnce(c.call[0], c.call[1], c.callAgain);
    for (const key of KEYS) {
      if (this.pinned(key)) continue;
      const n = g.npc(key), q = g.lmOffset(c.board, ...c.spots[key]);
      if (!this.out[key]) {
        this.out[key] = { spot: n.spot };
        n.busy = true;
        n.spot = MARK;
        n.steer = () => this.steer(key);
      }
      Object.assign(this.out[key], { goal: 'edge', x: q.x, z: q.z });
    }
  }

  // The cards, the result line, the record and the lines.
  judge(kind) {
    const g = this.g, c = this.cfg, k = c.kinds[kind];
    const sum = k.siv + k.majsan, best = g.records.simhopp ?? null, record = best == null || sum > best;
    if (record) { g.records.simhopp = sum; g.save(); }
    this.last = { kind, siv: k.siv, majsan: k.majsan, sum, record, best: g.records.simhopp };
    g.npc('siv').anim.card = num(k.siv);
    g.npc('majsan').anim.card = num(k.majsan);
    this.cardT = c.cardSecs;
    this.setLaugher(k.laugh ? g.npc(k.laugh) : null);
    hud.showScore(fmt(c.result, { kind: k.title, a: num(k.siv), b: num(k.majsan), sum: num(sum) }),
      record ? c.newRecord : fmt(c.record, { n: num(g.records.simhopp) }), record);
    // A new verdict drops the old one's lines not yet said.
    const t = g.time;
    this.lines = k.lines.map(([d, who, text]) => ({ at: t + d, who, text }));
    if (k.majsan === 10) this.tens++;
    if (this.tens >= c.teaseAfter && !this.teased) {
      this.teased = true;
      const end = Math.max(...k.lines.map(([d]) => d));
      this.lines.push({ at: t + end + 1.6, who: c.tease[0], text: c.tease[1] });
    }
  }

  setLaugher(n) {
    if (this.laugher && this.laugher !== n) this.laugher.anim.laugh = false;
    this.laugher = n;
    if (n) n.anim.laugh = true;
  }

  // A line at most every `again` s (the call: `callAgain`); false when held back.
  sayOnce(who, text, again = this.cfg.again) {
    const g = this.g, t = this.said.get(text);
    if (t != null && g.time - t < again) return false;
    const n = g.npc(who);
    if (!n || n.state === 'hidden') return false;
    this.said.set(text, g.time);
    g.say(n, text, 2.6);
    return true;
  }

  // A sister's walk (main.js fixedStep reads `npc.steer(h)`): to her goal at `walk` m/s, easing in.
  steer(key) {
    const n = this.g.npc(key), o = this.out[key];
    if (!o || n.state !== 'normal') return null;
    const dx = o.x - n.x, dz = o.z - n.z, d = Math.hypot(dx, dz);
    if (d < 0.25) return null;
    const sp = Math.min(this.cfg.walk, 0.6 + d * 1.5);
    return { x: (dx / d) * sp, z: (dz / d) * sp };
  }

  // Where she lives (her HOMES spot, or an unlock's override), or null.
  homeOf(key) {
    const g = this.g;
    let home = g.levelDef.homes(g)[key] ?? null;
    if (key in g.homeOverrides) home = g.homeOverrides[key];
    return home && !home.seat ? home : null;
  }

  // Back home on foot (the visit is over).
  sendHome(key) {
    const o = this.out[key], home = this.homeOf(key);
    if (!o) return;
    if (!home) { this.release(key); return; }
    const q = this.g.lmOffset(home[0], home[1], home[2]);
    Object.assign(o, { goal: 'home', x: q.x, z: q.z });
  }

  // She is no longer ours: free for placeNpcs again (at home, its spot id back).
  release(key, teleport = false) {
    const g = this.g, n = g.npc(key), o = this.out[key];
    if (!o) return;
    delete this.out[key];
    delete n.steer;
    if (n.spot !== MARK) return;   // someone else placed her meanwhile
    const home = teleport ? this.homeOf(key) : null;
    if (home) g.placeNpc(key, home[0], home[1], home[2], home[3]);
    n.busy = false;
    n.spot = teleport ? null : o.spot;
  }

  // Everything off: a mission started, the level changed (the sisters home at once).
  reset() {
    for (const key of Object.keys(this.out)) this.release(key, true);
    this.hop = null;
    this.visit = false;
    this.lines = [];
    this.cardDown();
    hud.hideScore();
    if (this.g.player.anim.swan) this.g.player.anim.swan = false;
  }

  cardDown() {
    this.cardT = 0;
    for (const key of KEYS) { const n = this.g.npc(key); if (n && n.anim.card != null) n.anim.card = null; }
    this.setLaugher(null);
  }

  update(dt) {
    const g = this.g, p = g.player, c = this.cfg;
    if (!this.active) {
      if (this.visit || this.hop || this.cardT > 0 || Object.keys(this.out).length) this.reset();
      return;
    }
    // The hop in the air: on the way down a plain one (no double jump, no stomp) spreads his arms
    // once he is off the board (the look only); a glide takes it over, unjudged.
    if (this.hop) {
      if (!this.canHop() || g.glide.on || p.onGround) { this.hop = null; p.anim.swan = false; }
      else {
        groundAt(p.x, p.z, p.y, 0.45);
        p.anim.swan = g.jumps < 2 && !g.stomping && p.vy < 0 && !this.isBoard(groundInfo.block);
      }
    } else if (p.anim.swan) p.anim.swan = false;
    // The cards and the laugh, while she turns to him.
    if (this.cardT > 0) {
      this.cardT -= dt;
      if (this.cardT <= 0) this.cardDown();
    }
    // The lines, in a scene held back (and dropped when it is long).
    if (this.lines.length && !g.inDialog) {
      const due = this.lines.filter((l) => l.at <= g.time);
      this.lines = this.lines.filter((l) => l.at > g.time);
      for (const l of due) if (g.time - l.at < 2) this.sayOnce(l.who, l.text);
    }
    // The visit: home after `stayOut` s without a bounce, or when he is gone from the board.
    if (this.visit) {
      this.idleT += dt;
      const b = lm(c.board);
      if (this.idleT > c.stayOut || dist(p.x, p.z, b.x, b.z) > c.leaveR || !KEYS.every((k) => this.free(k))) {
        this.visit = false;
        for (const key of Object.keys(this.out)) this.sendHome(key);
      }
    }
    // The walk: at the edge (or pinned) she faces him; home, she is free again.
    for (const key of KEYS) {
      const n = g.npc(key), o = this.out[key];
      if (o && n.spot !== MARK) { delete this.out[key]; delete n.steer; continue; }   // placed by someone else
      if (o && o.goal === 'home' && dist(n.x, n.z, o.x, o.z) < 0.3) { this.release(key); continue; }
      const facing = (o && o.goal === 'edge') || (!o && this.visit && this.pinned(key));
      if (facing && n.state === 'normal' && Math.hypot(n.vx, n.vz) < 0.3) n.yaw = dampAngle(n.yaw, yawTo(p.x - n.x, p.z - n.z), 5, dt);
    }
  }
}
