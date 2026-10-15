// Förlåt, förlåt! – Stig-Helmer says sorry (free roam; feature 11, DESIGN §10.14). Stig is too well
// brought up for Hit & Run: when he bowls someone over with a kick or a stomp, runs someone over,
// breaks a thing or takes a car, he says sorry in his own bubble. A carjacking gets the film's
// question the other way round, "Ursäkta, är det din bil?", and now and then a Swedish driver answers
// "Nej." from the asphalt. Only on the island with no mission running (`missions.state === 'idle'`)
// and no dialogue, never over a line of his own, and the SKANDAL is what it was (the offence is
// done). Config: STIG_SORRY (content/island.js). Owned by Game as `sorry`; main.js calls
// `offence(kind)` from areaHit (one call a kick), onCharHit and breakProp (his car only),
// `carjack(ch)` from enterCar, and `update` once a frame.

import { STIG_SORRY } from '../content/index.js';
import { dist, pick } from '../util.js';

// A line not yet said gives way to a weightier one (a parasol and the man under it in one frame).
const RANK = { prop: 1, kick: 2, hit: 2, boom: 3, carjack: 4 };

export class StigSorry {
  constructor(game, cfg = STIG_SORRY) {
    this.g = game;
    this.cfg = cfg;
    this.queue = [];        // [{ at, who: 'stig' | a Character, kind, text, no? }] still to say (g.time)
    this.up = [];           // [{ who, end }]: bubbles we put up, taken down when free roam ends
    this.lastT = -Infinity; // g.time of his last sorry (`gap`)
    this.first = true;      // the session's first offence always gets one
    this.noDone = false;    // the session's first Swedish carjacking always gets the "Nej."
    this.said = {};         // kind -> the line it last gave
    this.last = null;       // for tests: { t, kind, text, no }
  }

  // On the island between missions, outside any dialogue.
  active() {
    const g = this.g;
    return g.level === 'island' && g.missions.state === 'idle' && !g.inDialog;
  }
  pending() { return this.queue.find((q) => q.who === 'stig'); }

  // kind: 'kick' | 'hit' | 'prop' | 'boom' (null: nothing to say). Returns the line queued, or null.
  offence(kind) {
    const g = this.g, c = this.cfg;
    if (!kind || !this.active() || g.saying(g.player)) return null;
    const pend = this.pending();
    if (pend) { if (RANK[kind] <= RANK[pend.kind]) return null; }
    else if (g.time - this.lastT < c.gap || (!this.first && Math.random() >= c.chance[kind])) return null;
    return this.push(kind, c.at);
  }

  // main.enterCar: ch tumbles out of his car. True when his own complaint is to be left out (he
  // answers "Nej." instead).
  carjack(ch) {
    const g = this.g, c = this.cfg;
    if (!ch || !this.active() || g.saying(g.player)) return false;
    const no = !ch.def?.local && (!this.noDone || Math.random() < c.noChance);
    if (no) this.noDone = true;
    this.push('carjack', c.askAt, no ? ch : null);
    return no;
  }

  push(kind, at, no = null) {
    const g = this.g, all = this.cfg[kind], prev = this.said[kind];
    const text = prev == null ? all[0] : pick(all.length > 1 ? all.filter((l) => l !== prev) : all);
    this.said[kind] = text;
    this.queue = this.queue.filter((q) => q.who !== 'stig');
    this.queue.push({ at: g.time + at, who: 'stig', kind, text, no });
    this.first = false;
    this.lastT = g.time;
    this.last = { t: g.time, kind, text, no: !!no };
    return text;
  }

  say(who, text, secs) {
    const g = this.g;
    g.say(who, text, secs);
    this.up.push({ who, end: who.sayEnd });
  }

  update() {
    const g = this.g, c = this.cfg;
    if (!this.active()) { this.reset(); return; }
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      if (q.who === 'stig') {
        // Something else of his came first (the horn's sorry, a judge's call): this one goes, and
        // the driver's answer with it.
        if (g.saying(g.player)) continue;
        this.say(g.player, q.text, c.secs);
        if (q.no) this.queue.push({ at: g.time + c.noGap, who: q.no, kind: 'no', text: c.no });
      } else if (q.who.state !== 'hidden' && q.who.state !== 'seated' && dist(q.who.x, q.who.z, g.player.x, g.player.z) < 40) {
        this.say(q.who, q.text, c.noSecs);
      }
    }
    const now = performance.now();
    if (this.up.length) this.up = this.up.filter((u) => u.who.sayEnd === u.end && u.end > now);
  }

  // A mission state, a dialogue or the other level: the lines not yet said go, and a bubble of ours
  // still up comes down (only ours: a line said since is left alone).
  reset() {
    if (this.queue.length) this.queue.length = 0;
    const now = performance.now();
    for (const u of this.up) if (u.who.sayEnd === u.end && u.end > now) this.g.unsay(u.who);
    if (this.up.length) this.up.length = 0;
  }
}
