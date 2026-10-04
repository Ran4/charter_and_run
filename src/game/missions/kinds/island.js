// Stage kinds, part 3 (DESIGN §9.2): haggle smash. Frozen after Phase 0 (owner none).

import { common, at, RadioSeq, lineSecs } from './core.js';
import { reviveProps, propsOfType } from '../../../world/props.js';
import { audio } from '../../../audio.js';
import { hud } from '../../hud.js';
import { fx } from '../../fx.js';
import { S, fmt } from '../../../strings.js';
import { dist, yawTo } from '../../../util.js';

// ---------------------------------------------------------------------------------------------
// haggle (invented): at · who (the seller) · partner (haggles beside the player) · onFoot = true
// (the bar runs only on foot within 3 m of `at`; sub "Kliv ur bilen!") · start · steps · zones ·
// speeds · maxMiss = 3 · pay · lines { start, hit: [lines per round], miss, win } · barLabel ·
// failText
// The objective bar shows a marker oscillating 0..1 (speeds[round] cycles/s) and a green zone of
// width zones[round] at a random spot each round. E in the zone = hit (price -> steps[round], play
// hit[round]); outside = miss (+50 on the price, `miss` as bubbles); maxMiss misses fail. Win plays
// `win`, then game.pay(pay). Test mode: zones 0.6, speeds x 0.5. The bid is an interactable with
// priority 100 ('<b>E</b> Bjud!'), so E never enters a car or talks to someone instead.

const NEAR = 3;

export const haggle = (o) => common(o, {
  text: o.text,
  init(g, m) {
    this.g = g;
    this.m = m;
    this.l = at(o.at);
    this.round = 0;
    this.price = o.start;
    this.miss = 0;
    this.phase = 'approach';   // approach | talk | bid | done | failed
    this.tt = 0;
    this.mk = 0;
    this.test = g.testMode;
    const seller = g.npc(o.who);
    if (seller && (seller.state === 'hidden' || seller.car || dist(seller.x, seller.z, this.l.x, this.l.z) > 4)) g.placeNpc(o.who, o.at, 0, 1.2);
    if (seller) seller.busy = true;
    this.newZone();
    const self = this;
    this.it = {
      id: 'haggle', r: NEAR, prompt: S.promptBid, priority: 100,
      pos() { return { x: self.l.x, z: self.l.z }; },
      enabled(gg) { return self.phase === 'bid' && !gg.playerCar && !gg.inDialog; },
      use(gg) { self.bid(gg); },
    };
    this.remove = g.addInteractable(this.it);
    m.items.push(this.remove);
  },
  newZone() {
    const w = this.test ? 0.6 : o.zones[Math.min(this.round, o.zones.length - 1)];
    const z0 = Math.random() * (1 - w);
    this.zone = [z0, z0 + w];
    this.speed = o.speeds[Math.min(this.round, o.speeds.length - 1)] * (this.test ? 0.5 : 1);
  },
  get inZone() { return this.phase === 'bid' && !!this.g && !this.g.inDialog && this.mk >= this.zone[0] && this.mk <= this.zone[1]; },
  near(g) { const p = g.player; return !g.playerCar && p.state === 'normal' && dist(p.x, p.z, this.l.x, this.l.z) < NEAR; },
  target() { return this.phase === 'approach' ? { x: this.l.x, z: this.l.z, r: NEAR } : null; },
  obj() {
    if (this.phase === 'approach') return {};
    return { bar: 0, zone: this.zone, marker: this.mk, barLabel: `${o.barLabel || ''} ${this.price} pta`.trim() };
  },
  // Play a list of lines as a framed dialogue (seller + player).
  async talk(g, lines) {
    if (!lines?.length) return;
    const seller = g.npc(o.who);
    if (seller && seller.state !== 'hidden') g.cinematic(seller, g.player);
    else g.cinematicOne(g.player);
    await g.dialog(lines);
    g.endCut();
    g.endCinematic();
  },
  // The partner (Ole) steps out of the car, if he rode along, and stands beside the player.
  bringPartner(g) {
    if (!o.partner) return;
    const n = g.npc(o.partner);
    if (!n) return;
    if (n.state === 'normal' && !n.car && dist(n.x, n.z, this.l.x, this.l.z) < 6) return;
    const q = g.lmOffset(this.l, 1.4, 1.6);
    const s = g.spotFree(q.x, q.z) ? q : g.freeSpot(this.l.x, this.l.z, 1.2, 2.5);
    g.unseatAny(n);
    n.state = 'normal';
    n.root.visible = true;
    n.teleport(s.x, s.z, yawTo(this.l.x - s.x, this.l.z - s.z));
    n.busy = true;
  },
  bid(g) {
    if (this.phase !== 'bid') return;
    const m = this.m;
    if (this.inZone) {
      this.price = o.steps[this.round];
      const lines = o.lines?.hit?.[this.round];
      this.round++;
      audio.checkpoint();
      fx.sparkle(g.player.x, g.player.y + 1.6, g.player.z, 0x5fd35f, 12);
      const won = this.round >= o.steps.length;
      this.phase = 'talk';
      (async () => {
        await this.talk(g, lines);
        if (g.missions.m !== m) return;
        if (!won) { this.newZone(); this.tt = 0; this.phase = 'bid'; return; }
        await this.talk(g, o.lines?.win);
        if (g.missions.m !== m) return;
        await g.pay(o.pay);
        this.phase = 'done';
      })();
    } else {
      this.miss++;
      this.price += 50;
      audio.ouch();
      for (const [k, [who, text]] of (o.lines?.miss || []).entries()) setTimeout(() => g.say(g.npc(who), text, lineSecs(g, text)), k * 900);
      if (this.miss >= (o.maxMiss ?? 3)) this.phase = 'failed';
      else this.newZone();
    }
  },
  update(g, m, dt) {
    if (this.phase === 'failed') return { fail: o.failText || S.outOfTime };
    if (this.phase === 'done') return 'done';
    const onFoot = o.onFoot !== false;
    this.sub = onFoot && g.playerCar ? S.exitCar : null;
    if (this.phase === 'approach') {
      const close = onFoot ? this.near(g) : dist(g.focus().x, g.focus().z, this.l.x, this.l.z) < NEAR;
      if (!close) return;
      this.phase = 'talk';
      this.bringPartner(g);
      (async () => {
        await this.talk(g, o.lines?.start);
        if (g.missions.m === m && this.phase === 'talk') { this.tt = 0; this.phase = 'bid'; }
      })();
      return;
    }
    if (this.phase === 'bid' && !g.inDialog && (!onFoot || this.near(g))) {
      this.tt += dt;
      this.mk = 0.5 - 0.5 * Math.cos(2 * Math.PI * this.speed * this.tt);
    }
  },
});

// ---------------------------------------------------------------------------------------------
// smash: type · area {lm, r} · count · timer · onFoot? (breaks from a car do not count; sub
// "Kliv ur bilen!") · barLabel · failText · radio?
// reviveProps(type, area) at init (retries find intact plates); counts props of `type` in the area
// whose `alive` went false after the stage began.

export const smash = (o) => common(o, {
  text: o.text,
  init(g) {
    const c = at(o.area.lm);
    this.area = { x: c.x, z: c.z, r: o.area.r };
    reviveProps(o.type, this.area);
    this.list = propsOfType(o.type, this.area);
    if (this.list.length < o.count) console.warn(`smash: only ${this.list.length} '${o.type}' in the area, need ${o.count}`);
    this.broken = new Set();
    this.t = o.timer ?? null;
    this.radio = o.radio ? new RadioSeq(o.radio) : null;
  },
  target(g) {
    const f = g.focus();
    let best = null, bd = Infinity;
    for (const p of this.list) if (p.alive) { const d = dist(f.x, f.z, p.x, p.z); if (d < bd) { bd = d; best = p; } }
    return best ? { x: best.x, z: best.z, r: 0 } : { x: this.area.x, z: this.area.z, r: this.area.r };
  },
  markers() { return this.list.filter((p) => p.alive).map((p) => ({ type: 'item', x: p.x, z: p.z, edge: false })); },
  obj() { return { timer: this.t, bar: this.broken.size / o.count, barLabel: `${o.barLabel || ''} ${this.broken.size}/${o.count}`.trim(), barColor: '#ffffff' }; },
  update(g, m, dt) {
    if (this.t != null) {
      this.t -= dt;
      if (this.t <= 0) return { fail: o.failText || S.outOfTime };
    }
    this.radio?.tick(g, dt);
    this.sub = o.onFoot && g.playerCar ? S.exitCar : null;
    for (const p of this.list) {
      if (p.alive || this.broken.has(p)) continue;
      if (o.onFoot && g.playerCar) { reviveProps(o.type, { x: p.x, z: p.z, r: 0.05 }); continue; }
      this.broken.add(p);
      hud.toast(fmt('caught', { label: o.barLabel || '', n: this.broken.size, m: o.count }).trim());
    }
    if (this.broken.size >= o.count) return 'done';
  },
});
