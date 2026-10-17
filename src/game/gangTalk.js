// Prata med gänget – E talks to the gang (free roam; feature 39, DESIGN §10.28). Between missions
// the gang no longer only bubbles past Stig: on foot by Ole, Majsan, Berra or anyone else in the gang
// who stands at their place, "E Prata med <namn>" plays a short exchange in bubbles in which Stig
// answers, and what they talk about follows the journey: Ole's "Det er som i Rio." from the arrival
// until julafton, Majsan's julfest among the palms between the grisfest and julafton, new lines for
// everyone after the end (Berra's "Ska du ha?" at the bodega). E again is the next exchange, round
// and round. Only on the island with no mission running (`missions.state === 'idle'`) and no
// dialogue, and only bubbles, never the dialogue box: `inDialog` counts as a scene for the SKANDAL
// pursuit (shame.js), so a talk must not be a way out of a chase. No mission, timer or meter changes.
// A mission's giver keeps his own E (main.nearestInteractable asks `nearest` after every interactable
// and before the cars). Config: TALK_ISLAND (content/island.js). Owned by Game as `chat`: main.js asks
// `nearest` (the prompt and E), calls `start` from interact, holds the chatter bubbles while `busy`,
// and calls `update` once a frame.

import { TALK_ISLAND } from '../content/index.js';
import { MISSIONS } from './missions/index.js';
import { hhmm } from './dayClock.js';
import { fmt } from '../strings.js';
import { dist, yawTo } from '../util.js';

export class GangTalk {
  constructor(game, cfg = TALK_ISLAND) {
    this.g = game;
    this.cfg = cfg;
    this.run = null;       // the exchange under way: { key, ex, i (next line), at (g.time), pose: [ch, flag] | null }
    this.up = [];          // [{ who, end }]: bubbles we put up, taken down when free roam ends
    this.lastId = {};      // person key -> the id of the exchange they last played
    this.last = null;      // for tests: { key, id, t, lines: [[who, text]], ended }
    // The windows as mission indices ('end' = after the last mission).
    const at = (id) => (id === 'end' ? MISSIONS.length : MISSIONS.findIndex((m) => m.id === id));
    this.win = new Map();
    for (const [key, list] of Object.entries(cfg.people)) {
      for (const ex of list) {
        const w = [at(ex.from), at(ex.to)];
        if (w[0] < 0 || w[1] < 0) console.warn('TALK_ISLAND: unknown mission in', key, ex.id);
        this.win.set(ex, w);
      }
    }
  }

  // On the island between missions, outside any dialogue.
  active() {
    const g = this.g;
    return g.level === 'island' && g.missions.state === 'idle' && !g.inDialog;
  }
  get busy() { return !!this.run; }

  // Can `key` talk (or say a line) now: shown and standing, not walked anywhere by a module (`steer`),
  // not held in a pose of their own (main.npcPosed), not the idle mission's giver (who keeps his E)
  // and not Robban waving Stig over to the sleeping Berra (the Berra job's own talk, §10.6).
  free(key) {
    const g = this.g, n = g.npc(key), cur = g.missions.current;
    if (!n || n.state !== 'normal' || !n.root.visible || n.steer || n.car || n.seatId) return false;
    if (cur?.giver === key && cur.level === g.level) return false;
    return !g.npcPosed(key) && !g.berraJob.waving(key);
  }
  // Stig can start one: on foot and standing, in no other free-roam hold.
  stigFree() {
    const g = this.g, p = g.player;
    return !g.playerCar && p.state === 'normal' && !g.carrying && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.solkram.meter && !g.toasters.active;
  }

  // The exchanges `key` has now, in table order.
  options(key) {
    const g = this.g, c = this.cfg, i = g.missions.index, n = g.npc(key);
    return (c.people[key] || []).filter((ex) => {
      const [a, b] = this.win.get(ex);
      if (i < a || i > b) return false;
      if (ex.hours && !(g.day.h >= ex.hours[0] && g.day.h < ex.hours[1])) return false;
      if (ex.pryl && !g.collected.prylar?.has(ex.pryl)) return false;
      return (ex.with || []).every((k) => this.free(k) && dist(g.npc(k).x, g.npc(k).z, n.x, n.z) < c.withR);
    });
  }
  // The one E plays with `key`: the next after the one they last played, round and round.
  nextFor(key) {
    const v = this.options(key);
    if (!v.length) return null;
    return v[(v.findIndex((ex) => ex.id === this.lastId[key]) + 1) % v.length];
  }

  // main.nearestInteractable: the person E talks to (a Character), or null.
  nearest() {
    if (this.run || !this.active() || !this.stigFree()) return null;
    const g = this.g, p = g.player;
    let best = null, bd = this.cfg.r;
    for (const key of Object.keys(this.cfg.people)) {
      const n = g.npc(key);
      if (!n) continue;
      const d = dist(n.x, n.z, p.x, p.z);
      if (d >= bd || Math.abs(n.y - p.y) > 2 || !this.free(key) || !this.nextFor(key)) continue;
      best = n; bd = d;
    }
    return best;
  }

  // main.interact: E with the prompt up. Stig turns to them; a bubble they are in the middle of
  // comes down, so the first line is not stacked over it.
  start(n) {
    const g = this.g, key = n?.key, ex = key ? this.nextFor(key) : null;
    if (!ex || this.run || !this.active()) return false;
    this.lastId[key] = ex.id;
    const p = g.player;
    p.yaw = yawTo(n.x - p.x, n.z - p.z);
    for (const k of new Set(['stig', key, ...ex.lines.map(([w]) => w)])) g.unsay(g.npc(k));
    this.run = { key, ex, i: 0, at: g.time, pose: null };
    this.last = { key, id: ex.id, t: g.time, lines: [], ended: null };
    return true;
  }

  update() {
    const r = this.run;
    if (!r) return;
    const g = this.g, c = this.cfg, p = g.player, n = g.npc(r.key);
    if (!this.active()) { this.stop('free roam', true); return; }
    if (!this.free(r.key) || g.playerCar || p.state !== 'normal' || dist(n.x, n.z, p.x, p.z) > c.leaveR) { this.stop('left'); return; }
    if (g.time < r.at) return;
    this.unpose();
    if (r.i >= r.ex.lines.length) { this.stop('done'); return; }
    const [who, text, o] = r.ex.lines[r.i++];
    if (who !== 'stig' && who !== r.key && !this.free(who)) { this.stop('third'); return; }
    const ch = g.npc(who), line = fmt(text, { es: hhmm(g.day.h), no: hhmm(g.day.h + 1) });
    g.say(ch, line, c.secs);
    this.up.push({ who: ch, end: ch.sayEnd });
    if (o?.anim) { ch.anim[o.anim] = true; r.pose = [ch, o.anim]; }
    r.at = g.time + Math.max(0, (ch.sayEnd - performance.now()) / 1000) + c.gap;
    this.last.lines.push([who, line]);
  }

  unpose() {
    const r = this.run;
    if (r?.pose) { r.pose[0].anim[r.pose[1]] = false; r.pose = null; }
  }
  // The chain is over (`why`). The NPCs near him keep quiet a while (no chatter straight after the
  // last line); with `down` (a mission, a dialogue, the other level) our bubbles still up come down
  // (only ours: a line said since is left alone).
  stop(why, down = false) {
    const g = this.g, c = this.cfg, p = g.player;
    this.unpose();
    this.run = null;
    if (this.last) this.last.ended = why;
    const now = performance.now();
    if (down) for (const u of this.up) if (u.who.sayEnd === u.end && u.end > now) g.unsay(u.who);
    this.up.length = 0;
    for (const k in g.npcs) {
      const m = g.npcs[k];
      if (dist(m.x, m.z, p.x, p.z) < c.hushR) m.chatT = Math.max(m.chatT ?? 0, c.after);
    }
  }
}
