// Kontrollerad av G17 (free roam; feature 33, DESIGN §10.24). Seven chrome toasters stand round the
// island, the collectible set `brodrostar` (content/island.js; landmarks `brodrost_*`), on things that
// were there (a counter, a crate, a café table) with no collider of their own. On foot by one, on the
// island with no mission running (`missions.state === 'idle'`), E ("E Kontrollera brödrosten") pushes
// its lever down, and the objective card shows the haggle's bar as a scale from pale to burnt (the
// marker crosses it once, a little faster for each toaster passed). E again pops the bread:
//  - in the golden field: "Gyllenbrun. Godkänd!", Stig's cheer, and the set's own collect (main.js
//    `collect`: +250 pta, the count, the save; the set's `keep` puts the yellow KONTROLLERAD AV G17
//    label on and leaves the toaster standing); at 7/7 the set's 1000 pta and Majsan on the radio;
//  - before it: "Blekt. Underkänd."; after it, or left to the end: black bread, dark smoke, Stig
//    flailing with "Det här hade aldrig gått igenom på lagret." and, with a sister near, "Bara de
//    inte är ingenjörer.".
// A miss is tried again at once with E: no timer, no SKANDAL, nothing lost. A try is off when he is
// more than `cancelR` m away, in a car, down, in a dialogue, or a mission or a pursuit starts; a
// mission start or the other level also puts the toasters not yet passed back to pale bread.
// Config: BRODROST (content/island.js). Owned by Game as `toasters`: main.js calls `update` once a
// frame and `objective` in updateHud; the interactables are registered here.

import { BRODROST } from '../content/index.js';
import { setToaster, TOASTER } from '../actors/pickups.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { dist, yawTo } from '../util.js';

const SET = 'brodrostar';
// The bread's height after the pop (TOASTER.breadUp × this): up past its rest in 0.08 s, back by 0.3 s.
const popUp = (t) => (t < 0.08 ? (t / 0.08) * 1.8 : 1 + 0.8 * Math.max(0, 1 - (t - 0.08) / 0.22));

export class Toasters {
  constructor(game, cfg = BRODROST) {
    this.g = game;
    this.cfg = cfg;
    this.active = null;      // the try under way: { c, mk (0..1), secs, zone: [z0, z1], tickT }
    this.pops = [];          // bread popping: [{ c, t, kind }]
    this.restT = 0;          // s before E starts the next try (the pop plays out)
    this.pose = null;        // the anim flag set on Stig here ('cheer' | 'flail'), cleared after poseT s
    this.poseT = 0;
    this.queue = [];         // [{ at, fn }] (g.time)
    this.sisterT = -Infinity;
    this.wasLive = false;
    this.tries = 0;          // tests: tries started this session
    this.last = null;        // tests: the last result { id, kind, mk, zone, secs, t }
    const self = this;
    for (const c of this.list) {
      game.addInteractable({
        id: 'brodrost:' + c.id,
        pos: () => ({ x: c.x, z: c.z, y: c.y }),
        // The one under way: E pops its bread as far off as the try lasts, over a giver's talk and
        // the cars (as the haggle's bid).
        get r() { return self.active?.c === c ? cfg.cancelR : cfg.r; },
        get priority() { return self.active?.c === c ? 100 : cfg.priority; },
        get prompt() { return self.active?.c === c ? cfg.promptPop : cfg.prompt; },
        enabled: () => this.canUse(c),
        use: () => this.press(c),
      });
    }
  }

  get list() { return this.g.collectibles[SET] || []; }
  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  // On foot, standing, free: a toaster not passed yet (the one under way stays usable for the pop).
  canUse(c) {
    if (this.active) return this.active.c === c;
    return c.alive && this.live && this.restT <= 0 && this.free();
  }
  free() {
    const g = this.g, p = g.player;
    return !g.inDialog && !g.playerCar && !g.carrying && p.state === 'normal' && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.shame.pursuit && !g.fest.joined && !g.belt.seated;
  }

  press(c) {
    if (!this.active) this.start(c);
    else if (this.active.c === c) this.judge();
  }

  start(c) {
    const g = this.g, cfg = this.cfg, p = g.player;
    const secs = cfg.secs * cfg.speedUp ** g.collected[SET].size;
    const z0 = cfg.zoneAt[0] + Math.random() * (cfg.zoneAt[1] - cfg.zoneAt[0]);
    this.active = { c, mk: 0, secs, zone: [z0, z0 + cfg.zone], tickT: cfg.tick };
    this.pops = this.pops.filter((q) => q.c !== c);
    setToaster(c.mesh, { bread: 'pale', up: 0, lever: 0 });
    p.yaw = yawTo(c.x - p.x, c.z - p.z);
    audio.toasterDown();
    this.tries++;
  }

  // E (or the marker at the end): pale, golden or burnt.
  judge() {
    const a = this.active;
    if (!a) return;
    this.active = null;
    const g = this.g, cfg = this.cfg, c = a.c, p = g.player;
    const kind = a.mk < a.zone[0] ? 'pale' : a.mk <= a.zone[1] ? 'ok' : 'burnt';
    this.last = { id: c.id, kind, mk: +a.mk.toFixed(3), zone: a.zone.map((v) => +v.toFixed(3)), secs: +a.secs.toFixed(2), t: g.time };
    this.restT = cfg.restSecs;
    setToaster(c.mesh, { bread: kind === 'ok' ? 'golden' : kind, lever: 1 });
    this.pops.push({ c, t: 0, kind });
    audio.pop();
    const y = c.y + TOASTER.top + 0.1;
    g.say(p, cfg.lines[kind], 2.2);
    if (kind === 'ok') {
      this.setPose('cheer', cfg.cheerSecs);
      for (let k = 0; k < 3; k++) fx.wisp(c.x, y, c.z);
      g.collect(SET, c);   // +250 pta, the label (keep: Collectible.mark), the count, the save; 7/7: bonus, Majsan
      return;
    }
    audio.thud();
    hud.toast(cfg.toasts[kind]);
    if (kind === 'burnt') {
      this.setPose('flail', cfg.flailSecs);
      for (let k = 0; k < 5; k++) fx.smoke(c.x, y, c.z, true);
      this.sister(c);
    }
  }

  cancel() {
    const a = this.active;
    if (!a) return;
    this.active = null;
    setToaster(a.c.mesh, { up: 1, lever: 1 });
  }

  // The nearer sister within r m who is free says it once in `gap` s.
  sister(c) {
    const g = this.g, s = this.cfg.sister;
    if (g.time - this.sisterT < s.gap) return;
    let who = null, bd = s.r;
    for (const k of s.keys) {
      const n = g.npc(k);
      if (!n || !g.honk.free(k) || g.saying(n)) continue;
      const d = dist(n.x, n.z, c.x, c.z);
      if (d < bd) { bd = d; who = n; }
    }
    if (!who) return;
    this.sisterT = g.time;
    this.later(s.at, () => {
      if (!this.live || !g.honk.free(who.key) || g.saying(who)) return;
      g.say(who, s.line, s.secs);
      who.chatT = 7 + Math.random() * 6;
    });
  }

  setPose(flag, secs) {
    this.clearPose();
    this.g.player.anim[flag] = true;
    this.pose = flag;
    this.poseT = secs;
  }
  // Only what it set; never the engine's own flail (FLYGRÄDSLA's PANIK, main.js fixedStep).
  clearPose() {
    const g = this.g;
    if (this.pose && !(this.pose === 'flail' && g.flailPose)) g.player.anim[this.pose] = false;
    this.pose = null;
    this.poseT = 0;
  }

  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }

  update(dt) {
    const g = this.g, cfg = this.cfg;
    const live = this.live;
    if (!live) {
      if (this.wasLive) this.reset();
      this.wasLive = false;
      return;
    }
    this.wasLive = true;
    this.restT = Math.max(0, this.restT - dt);
    if (this.queue.length) {
      const due = this.queue.filter((q) => g.time >= q.at);
      this.queue = this.queue.filter((q) => g.time < q.at);
      for (const q of due) q.fn();
    }
    if (this.poseT > 0 && (this.poseT -= dt) <= 0) this.clearPose();
    for (const q of this.pops) {
      q.t += dt;
      setToaster(q.c.mesh, { up: popUp(q.t) });
      // A burnt one smokes a while.
      if (q.kind === 'burnt' && q.t < 2.4 && Math.random() < dt * 6) fx.smoke(q.c.x, q.c.y + TOASTER.top + 0.1, q.c.z, true);
    }
    this.pops = this.pops.filter((q) => q.t < 2.4);
    const a = this.active;
    if (!a) return;
    const p = g.player;
    if (!this.free() || dist(p.x, p.z, a.c.x, a.c.z) > cfg.cancelR) { this.cancel(); return; }
    a.mk += dt / a.secs;
    if ((a.tickT -= dt) <= 0) { a.tickT = cfg.tick; audio.tick(); }
    // Past the golden field it starts to smell.
    if (a.mk > a.zone[1] && Math.random() < dt * 4) fx.wisp(a.c.x, a.c.y + TOASTER.top, a.c.z);
    if (a.mk >= 1) { a.mk = 1; this.judge(); }
  }

  // A mission start or the other level: the try off, the queue dropped, the bread of those not passed
  // back to pale and up (a passed one's settled, if it was still popping), so every mission meets the
  // toasters as they stand.
  reset() {
    this.cancel();
    this.queue = [];
    this.pops = [];
    this.clearPose();
    for (const c of this.list) setToaster(c.mesh, c.alive ? { bread: 'pale', up: 1, lever: 1 } : { up: 1 });
  }

  // main.js updateHud, with no mission's card: the scale from pale to burnt while a try is under way.
  objective() {
    const a = this.active, c = this.cfg;
    if (!a) return null;
    return { title: c.title, text: c.text, bar: 1, barColor: c.barColor, zone: a.zone, zoneColor: c.zoneColor, marker: Math.min(1, a.mk), barLabel: '' };
  }
}
