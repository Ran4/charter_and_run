// Stunthopp med G17-stämpel – the car jumps judged (free roam; feature 40, DESIGN §10.27). The jumps
// were there (the bygge's yellow ramp, the half-built garages' decks; the dunes lift no car) and
// nothing measured them. Now every real jump of his car gets LUFTTID on the result line while it is in the air, and a
// rubber stamp when it is over: KONTROLLERAD AV G17 (GODKÄND before fataga, whose intro is where the
// film's boast is first heard) if he lands and drives on, UNDERKÄND if the car hits something in the
// air or within `settle` s of landing, or is wrecked. The flagship is the plank at the bygge's first
// floor (nature.js), off over the road at x 200 towards the dream plane: the mantra in a bubble in the
// air, and Stig's line at the stamp (his arms out if he gets out by the plane). A named jump pays
// the first time it passes and after that only a new record (its distance, saved in
// `records.stunts`). Only on the island with no mission running (`missions.state === 'idle'`).
// Config: STUNTHOPP (content/island.js). Owned by Game as `stunts`; car.js measures the flight
// (airT, airFrom) and main.js calls `onLand` from onCarAirEnd (every landing of a car), `onImpact`
// from onCarImpact (his car), `onWreck` from onCarDestroyed (his car) and `update` once a frame.
// No slow motion: the game's clock is the missions' (the idea's optional slow-mo was left out).

import { STUNTHOPP } from '../content/index.js';
import { lm } from '../world/layout.js';
import { frameRamps } from '../world/town.js';
import { audio } from '../audio.js';
import { S, fmt } from '../strings.js';
import { hud } from './hud.js';
import { dist, yawTo } from '../util.js';

const secs = (t) => t.toFixed(1).replace('.', ',');   // 0,4 S (a Swedish decimal comma)

export class Stunts {
  constructor(game, cfg = STUNTHOPP) {
    this.g = game;
    this.cfg = cfg;
    this.jump = null;      // the jump under way: { car, zone, air, dist, phase: 'air' | 'settle', settleT, flights, said }
    this.zones = null;     // the named jumps' take-off areas (built on first use: landmarks, frames)
    this.queue = [];       // [{ at, fn }] (g.time)
    this.dream = null;     // after the plank's pass: { until } (his arms out if he gets out by the plane)
    this.pose = null;      // { until } while his arms are out
    this.failT = -Infinity;
    this.mantraEnd = 0;    // the sayEnd of the mantra bubble we put up (a line of ours may replace it)
    this.done = null;      // the airFrom of a flight already judged or dropped in the air: not a new jump
    this.liveShown = false;
    this.wasLive = false;
    this.last = null;      // tests: the last verdict { kind, id, air, dist, pay, record, best, stamp, reason, t }
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }

  // { id, name, mantra, dream, test(x, z, y) } per named jump: a square round a landmark, or the
  // half-built garages' decks (town.js frameRamps).
  buildZones() {
    const out = [];
    for (const j of this.cfg.jumps) {
      const boxes = [];
      if (j.lm) { const l = lm(j.lm); boxes.push({ x0: l.x - j.r, z0: l.z - j.r, x1: l.x + j.r, z1: l.z + j.r }); }
      if (j.frames) {
        for (const f of frameRamps) {
          const d = f.deck, c = Math.abs(Math.cos(f.yaw)), s = Math.abs(Math.sin(f.yaw)), pad = j.pad ?? 0;
          const hx = (d.w * c + d.d * s) / 2 + pad, hz = (d.w * s + d.d * c) / 2 + pad;
          boxes.push({ x0: d.x - hx, z0: d.z - hz, x1: d.x + hx, z1: d.z + hz });
        }
      }
      const yMin = j.yMin ?? -Infinity;
      out.push({ ...j, boxes, test: (x, z, y) => y >= yMin && boxes.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) });
    }
    return out;
  }
  zoneAt(p) {
    this.zones ??= this.buildZones();
    return (p && this.zones.find((z) => z.test(p.x, p.z, p.y))) || null;
  }

  // A jump starts when his car leaves the ground (car.js `air`, the take-off point `airFrom`), not
  // in a flight already judged or dropped, busted or in a dialogue.
  canBegin(car) { const g = this.g; return !!car.airFrom && car.airFrom !== this.done && !(g.frozenT > 0) && !g.inDialog; }
  begin(car) {
    const zone = this.zoneAt(car.airFrom);
    this.jump = { car, zone, air: 0, dist: 0, phase: 'air', settleT: 0, flights: 0, said: false };
  }

  // Every landing of every car (car.js, soft ones too). A flight too short for a frame to see it in
  // the air starts its jump here.
  onLand(car) {
    const g = this.g, cfg = this.cfg;
    if (!this.live || car !== g.playerCar || car.dead) return;
    if (!this.jump) { if (!this.canBegin(car)) return; this.begin(car); }
    const j = this.jump;
    if (j.car !== car) return;
    j.air += car.airT;
    j.dist += dist(car.x, car.z, car.airFrom.x, car.airFrom.z);
    j.flights++;
    // The first flight must be a real jump (a kerb or a dune's lip is not); later hops in the
    // settle add to it.
    if (j.flights === 1 && (j.air < cfg.minAir || j.dist < cfg.minDist)) { this.drop(); return; }
    j.phase = 'settle';
    j.settleT = cfg.settle;
  }

  onImpact() { if (this.jump && this.live) this.fail('krock'); }
  // Wrecked: the engine's KVADDAD! banner first, the stamp `wreckAt` s later.
  onWreck() { if (this.jump && this.live) this.fail('kvaddad', this.cfg.wreckAt); }

  // Counted: past the thresholds (in the air long enough to be a jump, or landed as one).
  counted(j) { return j.flights > 0 || j.car.airT >= this.cfg.minAir; }

  pass() {
    const g = this.g, cfg = this.cfg, j = this.jump, z = j.zone, p = g.player;
    this.jump = null;
    const g17 = g.missions.index >= cfg.g17From;
    const stamp = g17 ? cfg.stampG17 : cfg.stampOk;
    this.stamp(stamp, 'stamp');
    audio.stamp();
    g.cam.shake = Math.max(g.cam.shake, 0.35);
    let pay = 0, record = false, best = null;
    if (z) {
      g.records.stunts ??= {};
      best = g.records.stunts[z.id] ?? null;
      record = best == null || j.dist > best + cfg.recordBy;
      pay = best == null ? cfg.pay.first : record ? cfg.pay.record : 0;
      if (record) { g.records.stunts[z.id] = +j.dist.toFixed(1); g.save(); }
      if (pay) { g.addCoins(pay); audio.coin(); }
    }
    const main = fmt(cfg.card, { t: secs(j.air), d: Math.round(j.dist) }) + (pay ? fmt(cfg.cardPay, { n: pay }) : '');
    const sub = !z ? '' : record ? fmt(cfg.newRecord, { name: z.name }) : fmt(cfg.record, { name: z.name, d: Math.round(g.records.stunts[z.id]) });
    hud.showScore(main, sub, record, cfg.cardSecs);
    this.liveShown = false;
    if (z?.dream) {
      this.later(cfg.lineAt, () => { if (this.live && this.free(p)) g.say(p, g17 ? cfg.dreamLine.g17 : cfg.dreamLine.pre, 2.6); });
      this.dream = { until: g.time + cfg.arms.window };
    }
    this.last = { kind: 'pass', id: z?.id ?? null, air: +j.air.toFixed(2), dist: +j.dist.toFixed(1), flights: j.flights, pay, record, best, stamp, t: g.time };
  }

  fail(reason, delay = 0) {
    const g = this.g, cfg = this.cfg, j = this.jump, z = j.zone, c = j.car, p = g.player;
    this.jump = null;
    if (c.air) this.done = c.airFrom;   // the rest of this flight is not another jump
    if (!this.counted(j)) { this.hideLive(); return; }
    // The flight under way counts as far as it went.
    const air = j.air + (c.air ? c.airT : 0), d = j.dist + (c.air && c.airFrom ? dist(c.x, c.z, c.airFrom.x, c.airFrom.z) : 0);
    const show = () => {
      this.stamp(cfg.stampFail, 'stamp fail');
      audio.stampFail();
      hud.showScore(fmt(cfg.card, { t: secs(air), d: Math.round(d) }), z ? z.name : '', false, cfg.cardSecs);
    };
    this.liveShown = false;
    if (delay) { hud.hideScore(); this.later(delay, show); } else show();
    if (g.time - this.failT > cfg.failGap) {
      this.failT = g.time;
      this.later(delay + cfg.lineAt, () => { if (this.live && this.free(p)) g.say(p, cfg.failLine, 2.2); });
    }
    this.last = { kind: 'fail', id: z?.id ?? null, air: +air.toFixed(2), dist: +d.toFixed(1), flights: j.flights, reason, stamp: cfg.stampFail, t: g.time };
  }

  // The stamp comes down again even over one still showing (the class is set afresh).
  stamp(text, cls) {
    hud.banner.className = '';
    void hud.banner.offsetWidth;
    hud.showBanner(text, '', cls, this.cfg.stampSecs * 1000);
  }

  // Off without a verdict: out of the car, teleported, a mission, the other level.
  drop() {
    if (this.jump?.car.air) this.done = this.jump.car.airFrom;
    this.jump = null;
    this.hideLive();
  }
  hideLive() { if (this.liveShown) hud.hideScore(); this.liveShown = false; }

  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }
  // His bubble is free for a line of ours: nothing up, or still the mantra we put up in the air.
  free(p) { return !this.g.saying(p) || p.sayEnd === this.mantraEnd; }

  update(dt) {
    const g = this.g, cfg = this.cfg;
    if (!this.live) {
      if (this.wasLive) this.reset();
      this.wasLive = false;
      return;
    }
    this.wasLive = true;
    if (this.queue.length) {
      const due = this.queue.filter((q) => g.time >= q.at);
      this.queue = this.queue.filter((q) => g.time < q.at);
      for (const q of due) q.fn();
    }
    this.arms();
    const car = g.playerCar, j = this.jump;
    if (j && (car !== j.car || car.dead || g.frozenT > 0 || g.inDialog || (j.phase === 'air' && !car.air))) { this.drop(); return; }
    if (!car) return;
    if (!j) { if (car.air && this.canBegin(car)) this.begin(car); else return; }
    const J = this.jump;
    if (J.phase === 'settle' && car.air) J.phase = 'air';   // a hop in the settle goes on with the jump
    if (J.phase === 'air') {
      const t = J.air + car.airT;
      if (t >= cfg.showAt) { hud.liveScore(fmt(cfg.live, { t: secs(t) })); this.liveShown = true; }
      if (!J.said && J.zone?.mantra && t >= cfg.showAt) { J.said = true; g.say(g.player, S.mantraLine, 1.6); this.mantraEnd = g.player.sayEnd; }
      return;
    }
    if ((J.settleT -= dt) <= 0) this.pass();
  }

  // His arms out before the dream plane (the film's dream: research-plot.md:126), if he gets out
  // within `arms.window` s of the plank's pass and `arms.r` m of it.
  arms() {
    const g = this.g, c = this.cfg.arms, p = g.player;
    if (this.pose && (g.time >= this.pose.until || g.playerCar || p.state !== 'normal')) this.clearPose();
    if (!this.dream) return;
    if (g.time > this.dream.until) { this.dream = null; return; }
    if (g.playerCar || p.state !== 'normal' || g.inDialog) return;
    const l = lm(c.lm), f = lm(c.face);
    if (dist(p.x, p.z, l.x, l.z) > c.r) return;
    this.dream = null;
    p.yaw = yawTo(f.x - p.x, f.z - p.z);
    if (!p.anim.wings) { p.anim.wings = true; this.pose = { until: g.time + c.secs }; }
  }
  clearPose() {
    const g = this.g;
    if (this.pose && !g.mantraPose) g.player.anim.wings = false;
    this.pose = null;
  }

  reset() {
    this.jump = null;
    this.queue = [];
    this.dream = null;
    this.clearPose();
    this.hideLive();
  }
}
