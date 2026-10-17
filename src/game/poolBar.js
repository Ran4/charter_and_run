// Poolbaren öppnar – svenskt kaffe ger fart (free roam; feature 84, DESIGN §10.44). BAR PISCINA at
// Hotel Flamenco's pool is shut and empty until friskoteket is done (Berra's "De har inte öppnat än" in
// its outro); after it the bartender stands behind the counter by the percolator (main.placeNpcs asks
// `hides` before). On foot at the counter's north end, between missions, E buys a cup of Swedish
// coffee for 40 pta (the purse must hold it: Ole does not pay): the bartender hands it over, "Äntligen
// riktigt bryggkaffe.", and Stig sprints 20 % faster for 30 s with the cup in his hand while a box under
// the meter counts down; a new cup starts the 30 s again, never more speed. Short of the price, the
// bartender shakes his head. Berra standing at the bar raises his glass, and the Arlanda men's room
// plays again ("Ska du ha?"). With the cup still in his hand, E at Fru Storch answers the film's
// subtitle: her "Finns det svenskt kaffe på hotellet?", his "Ja." and the cup; she pays for it and the
// sprint goes with the cup. Only on the island with no mission running (`missions.state === 'idle'`)
// and not in Eslövloppet: a mission start, the other level or the race ends the coffee at once, so no
// mission, timer or calibration pool sees it. Nothing is saved. Config: KAFFE (content/island.js).
// Owned by Game as `bar`: main.fixedStep multiplies the sprint by `sprintK()`, main.update calls
// `update`, placeNpcs asks `hides(key)` and npcPosed `posed(key)`; the interactables are registered here.

import { KAFFE } from '../content/index.js';
import { MISSIONS } from './missions/index.js';
import { lm } from '../world/layout.js';
import { audio } from '../audio.js';
import { pta } from '../strings.js';
import { hud } from './hud.js';
import { dist, yawTo, dampAngle } from '../util.js';

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
// The anim flags that take Stig's arms: with one of them on, the cup is out of his hand.
const ARMS = ['wings', 'cupUp', 'push', 'hold', 'flail', 'oath', 'dance', 'laugh', 'mirror', 'film', 'camShow', 'giraffe', 'butterKnife', 'carryOver',
  'glide', 'swan', 'calc', 'ski', 'groda', 'ticket', 'leap', 'bomb', 'placate', 'rub', 'eyesShut', 'tap', 'scratch', 'point', 'cheer'];

export class PoolBar {
  constructor(game, cfg = KAFFE) {
    this.g = game;
    this.cfg = cfg;
    this.from = MISSIONS.findIndex((m) => m.id === cfg.after) + 1;   // the bar is open from this index on
    this.t = 0;              // s of coffee left (the sprint, the cup, the box)
    this.scene = null;       // what plays at the bar or at Fru Storch: { kind, t, steps, i, end, … }
    this.held = new Map();   // key -> { cup, shake, t }: the people a scene holds (posed), turned to Stig
    this.stigCup = 'low';    // how Stig holds the cup while he has coffee ('low' before the chest, true held out)
    this.cupSet = false;     // the cup flag we put on Stig ('low' | true), false: none
    this.storchCup = 0;      // s Fru Storch still holds the cup she was given
    this.berraT = -Infinity; // g.time of the last men's-room exchange
    this.bought = 0;         // tests: cups bought, refills among them, refusals, deliveries, Berra's exchanges
    this.refills = 0;
    this.refused = 0;
    this.delivered = 0;
    this.berraTalks = 0;
    this.last = null;        // tests: the last E { kind: 'buy' | 'short' | 'give', t, … }
    this.ended = null;       // tests: how the last coffee ended { why: 'cold' | 'given' | 'race' | 'mission' | 'level', t }
    const self = this;
    game.addInteractable({
      id: 'kaffe', r: cfg.r,
      pos: () => lm(cfg.lm),
      get prompt() { return fill(self.t > 0 ? cfg.promptMore : cfg.prompt, { n: pta(cfg.price) }); },
      enabled: () => this.canBuy(),
      use: () => this.buy(),
    });
    const s = cfg.storch;
    game.addInteractable({
      id: 'kaffe:storch', r: s.r, priority: s.priority, prompt: s.prompt,
      pos: () => { const n = game.npc(s.who); return n ? { x: n.x, z: n.z, y: n.y } : null; },
      enabled: () => this.canGive(),
      use: () => this.give(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get open() { return this.g.missions.index >= this.from; }
  get barman() { return this.g.npc(this.cfg.barman); }
  // main.placeNpcs: the bartender has no place before the bar opens (hidden, as the bar was).
  hides(key) { return key === this.cfg.barman && !this.open; }
  // main.npcPosed: someone a scene holds (no wave, turn or chatter; the other modules leave them be).
  posed(key) { return this.held.has(key); }
  // main.fixedStep: the sprint's factor. Never in a mission, in the other level or in Eslövloppet
  // (its clock is measured, §10.12).
  sprintK() { return this.t > 0 && this.live && !this.g.eslov.race ? this.cfg.sprint : 1; }

  // Free to take part: shown and standing, in no car, seat or walk, posed by no module.
  free(key) {
    const g = this.g, n = g.npc(key);
    return !!n && n.state === 'normal' && n.root.visible && !n.car && !n.seatId && !n.steer && !g.npcPosed(key) && g.honk.free(key);
  }
  // Stig on foot and on the ground, in no scene, pursuit, bust, PANIK, race or other free-roam hold.
  stigFree() {
    const g = this.g, p = g.player;
    return !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying && p.state === 'normal' && p.onGround && !p.seatId
      && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0) && !g.fest.joined && !g.belt.seated && !g.chat.busy
      && !g.day.busy && !g.solkram.meter && !g.toasters.active && !g.skis.on && !g.eslov.race;
  }
  canBuy() {
    const n = this.barman;
    if (!this.live || !this.open || this.scene || !this.stigFree() || !this.free(this.cfg.barman)) return false;
    return dist(n.x, n.z, n.homeX ?? n.x, n.homeZ ?? n.z) < this.cfg.barmanR;
  }
  canGive() {
    return this.live && this.t > 0 && !this.scene && this.stigFree() && this.free(this.cfg.storch.who);
  }

  // E at the counter: the cup for the price, or the bartender's head shaken.
  buy() {
    const g = this.g, c = this.cfg, p = g.player, n = this.barman;
    if (!this.canBuy()) return;
    p.yaw = yawTo(n.x - p.x, n.z - p.z);
    p.wishX = p.wishZ = 0;
    if (g.coins < c.price) {
      const k = c.short;
      this.refused++;
      this.last = { kind: 'short', t: g.time, coins: g.coins };
      this.play('short', [
        [0, () => { this.hold(c.barman, { shake: k.shakeSecs }); g.say(n, k.barman, k.barmanSecs); }],
        [k.stigAt, () => g.say(p, k.stig, k.stigSecs)],
      ], k.end);
      return;
    }
    g.addCoins(-c.price);
    audio.coin();
    const b = c.buy, refill = this.t > 0, berra = this.berraNow();
    this.bought++;
    if (refill) this.refills++;
    this.last = { kind: 'buy', t: g.time, refill, berra, coins: g.coins };
    const steps = [
      [0, () => { this.hold(c.barman, { cup: true }); g.say(n, b.thanks, b.thanksSecs); }],
      // Paid is paid: the cup is his even if he walks off before it is handed over.
      [b.handAt, () => {
        this.release(c.barman);
        this.stigCup = 'low';
        this.t = c.secs;
      }, true],
      [b.stigAt, () => g.say(p, refill ? b.more : b.stig, b.stigSecs)],
    ];
    let end = b.end;
    if (berra) {
      const e = c.berra;
      this.berraT = g.time;
      this.last.berraLines = e.lines.map(([, w, text]) => [w, text]);
      steps.push([e.lines[0][0], () => { this.hold('berra', { cup: true }); this.turnTo('berra'); this.berraTalks++; }]);
      for (const [at, who, text, secs] of e.lines) steps.push([at, () => g.say(who === 'stig' ? p : g.npc(who), text, secs)]);
      steps.push([e.lowerAt, () => this.release('berra')]);
      end = e.lowerAt;
    }
    this.play('buy', steps, end);
  }
  // Berra stands at the bar, free, and the men's room has not played for `every` s.
  berraNow() {
    const g = this.g, e = this.cfg.berra, n = g.npc('berra'), l = lm(this.cfg.lm);
    return !!n && this.free('berra') && dist(n.x, n.z, l.x, l.z) < e.r && g.time - this.berraT >= e.every;
  }

  // E at Fru Storch with the cup: her question, his "Ja.", the cup in her hands, the pay.
  give() {
    const g = this.g, c = this.cfg.storch, p = g.player, n = g.npc(c.who);
    if (!this.canGive()) return;
    p.yaw = yawTo(n.x - p.x, n.z - p.z);
    p.wishX = p.wishZ = 0;
    g.unsay(n);
    this.hold(c.who, {});
    this.last = { kind: 'give', t: g.time, left: +this.t.toFixed(2), lines: c.lines.map(([, w, text]) => [w, text]) };
    const steps = c.lines.map(([at, who, text, secs]) => [at, () => g.say(who === 'stig' ? p : g.npc(who), text, secs)]);
    steps.push([c.offerAt, () => { this.stigCup = true; }]);
    steps.push([c.handAt, () => {
      this.stop('given');
      const h = this.held.get(c.who);
      if (h) h.cup = 'low';
      this.storchCup = c.holdSecs;
      g.addCoins(c.pay);
      audio.coin();
      hud.toast(fill(c.toast, { n: pta(c.pay) }));
      this.delivered++;
      this.last.paid = c.pay;
    }]);
    this.play('give', steps, c.end);
  }

  // A scene: `steps` [[at, fn, must]] on its own clock, over at `end`. It breaks off when Stig is more
  // than `leaveR` m from where it started, gets into a car or a dialogue starts: the held people's
  // bubbles come down and only the steps marked `must` still run.
  play(kind, steps, end) {
    const g = this.g, c = this.cfg, p = g.player;
    this.scene = { kind, t: 0, steps: steps.sort((a, b) => a[0] - b[0]), i: 0, end, x: p.x, z: p.z };
    // No chatter bubble over it: the people near keep quiet until `hushAfter` s after its end.
    for (const n of Object.values(g.npcs)) if (n.state !== 'hidden' && dist(n.x, n.z, p.x, p.z) < c.hushR) n.chatT = Math.max(n.chatT ?? 0, end + c.hushAfter);
  }
  // Stig standing still turns to `key` (walking, he keeps his way).
  turnTo(key) {
    const p = this.g.player, n = this.g.npc(key);
    if (n && Math.hypot(p.vx, p.vz) < 0.3 && Math.hypot(p.wishX, p.wishZ) < 0.3) p.yaw = yawTo(n.x - p.x, n.z - p.z);
  }
  hold(key, o) {
    const n = this.g.npc(key);
    if (!n) return;
    this.held.set(key, { cup: o.cup ?? false, shake: o.shake ?? 0, t: 0 });
  }
  release(key) {
    const n = this.g.npc(key), h = this.held.get(key);
    if (!n || !h) return;
    // Fru Storch keeps the cup she was given (`storchCup`, update).
    if (h.cup && n.anim.cupHeld && !(key === this.cfg.storch.who && this.storchCup > 0)) n.anim.cupHeld = false;
    if (h.shake) n.anim.look = 0;
    this.held.delete(key);
  }

  // The coffee is over: cold (`secs` out), given away, a mission or the race.
  stop(why) {
    this.t = 0;
    this.ended = { why, t: this.g.time };
  }
  // Out of free roam: everything back at once (no cup, no box, nobody held).
  reset() {
    const g = this.g;
    if (this.t > 0) this.stop(g.missions.state !== 'idle' ? 'mission' : 'level');
    this.scene = null;
    for (const k of [...this.held.keys()]) this.release(k);
    if (this.storchCup > 0) { const n = g.npc(this.cfg.storch.who); if (n?.anim.cupHeld === 'low') n.anim.cupHeld = false; this.storchCup = 0; }
    this.syncCup();
    hud.setKaffe(null);
  }

  update(dt) {
    const g = this.g, c = this.cfg;
    if (!this.live) {
      if (this.t > 0 || this.scene || this.held.size || this.storchCup > 0 || this.cupSet) this.reset();
      return;
    }
    if (this.t > 0 && g.eslov.race) this.stop('race');
    // The countdown stands still while he hands the cup to Fru Storch.
    if (this.t > 0 && this.scene?.kind !== 'give') {
      this.t -= dt;
      if (this.t <= 0) this.stop('cold');
    }
    const s = this.scene;
    if (s) {
      s.t += dt;
      const p = g.player;
      if (dist(p.x, p.z, s.x, s.z) > c.leaveR || g.playerCar || g.inDialog) {
        for (const k of this.held.keys()) g.unsay(g.npc(k));
        for (; s.i < s.steps.length; s.i++) if (s.steps[s.i][2]) s.steps[s.i][1]();
        s.t = Math.max(s.t, s.end);
        s.broke = true;
        this.last = { ...this.last, broke: +s.t.toFixed(2) };
      }
      while (s.i < s.steps.length && s.steps[s.i][0] <= s.t) s.steps[s.i++][1]();
      if (s.i >= s.steps.length && s.t >= s.end) {
        this.scene = null;
        this.stigCup = 'low';
        for (const k of [...this.held.keys()]) this.release(k);
      }
    }
    // The people held: turned to Stig, the cup out or the head shaken.
    for (const [k, h] of this.held) {
      const n = g.npc(k), p = g.player;
      if (!n || n.state !== 'normal') { this.release(k); continue; }
      h.t += dt;
      n.yaw = dampAngle(n.yaw, yawTo(p.x - n.x, p.z - n.z), 8, dt);
      if (h.cup && n.anim.cupHeld !== h.cup) n.anim.cupHeld = h.cup;
      if (h.shake) n.anim.look = h.t < h.shake ? Math.sin(h.t * 11) * 0.42 : 0;
    }
    // Fru Storch keeps the cup a while after the scene.
    if (this.storchCup > 0) {
      this.storchCup -= dt;
      const n = g.npc(c.storch.who);
      if (n && !this.held.has(c.storch.who)) {
        if (this.storchCup <= 0 || n.state !== 'normal') { if (n.anim.cupHeld === 'low') n.anim.cupHeld = false; this.storchCup = 0; }
        else if (!n.anim.cupHeld) n.anim.cupHeld = 'low';
      }
    }
    this.syncCup();
    hud.setKaffe(this.t > 0 ? fill(c.hud, { t: clock(Math.ceil(this.t)) }) : null, this.t > 0 && this.t <= c.lowSecs);
  }

  // Stig's cup: in his hand while he has coffee, on foot and standing with his arms free (never in a
  // car or a seat, or in someone else's scene). Only a cup we put there is taken away.
  syncCup() {
    const g = this.g, p = g.player;
    const want = this.t > 0 && this.live && !g.inDialog && !g.playerCar && p.state === 'normal' && !p.seatId && !ARMS.some((f) => p.anim[f]);
    if (want) {
      if (p.anim.cupHeld !== this.stigCup) p.anim.cupHeld = this.stigCup;
      this.cupSet = this.stigCup;
    } else if (this.cupSet) {
      if (p.anim.cupHeld === this.cupSet) p.anim.cupHeld = false;
      this.cupSet = false;
      this.stigCup = 'low';
    }
  }
}
