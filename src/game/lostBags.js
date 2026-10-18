// Hittelön – de borttappade väskorna (free roam; feature 116, DESIGN §10.52). Six strangers' suitcases
// lie inland (COLLECTIBLES.vaskor, built by main.buildCollectibles like the other sets). On the island
// with no mission running (`missions.state === 'idle'`), on foot and free, Stig walking into one lifts it
// onto his head and carries it at walk speed (`game.carrying` { item: 'vaska', bag }, so the other
// free-roam E spots wait; a car still takes him, the bag riding along out of sight). A fall drops it at
// his feet, R where he stood. Carried, the card, the beacon and the arrow point at the lost-and-found
// counter at Gando: E there puts it on the counter and plays the julafton morning's exchange with the
// money going the other way (the clerk's "Hammarby…?", Stig's "Nej, inte min.", "Hittelön." with the
// pay, "Tack så mycket."); then `game.collect` counts it, saves and at 6/6 pays the set's bonus with
// Angerud on the radio. In a mission or the other level the bags are hidden and one carried or dropped
// is back on its spot, so no mission, timer or calibration pool sees them. Config: HITTELON
// (content/island.js). Owned by Game as `bags`: main.js calls `update` once a frame and asks `target()`
// (the beacon, the arrow, the minimap) and `objective()` (the card).

import { HITTELON } from '../content/index.js';
import { lm } from '../world/layout.js';
import { groundAt } from '../world/collision.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt, pta } from '../strings.js';
import { clamp, dist, lerp } from '../util.js';

export class LostBags {
  constructor(game, cfg = HITTELON) {
    this.g = game;
    this.cfg = cfg;
    this.bag = null;          // the Collectible on Stig's head (on the counter in the exchange)
    this.carry = null;        // our g.carrying (cleared only while it is still ours)
    this.falls = [];          // dropped ones tumbling down: [{ b, t, from, to, yaw, spin }]
    this.busy = false;        // the exchange at the counter
    this.shown = undefined;   // the bags shown (live) or hidden, as last set
    this.saidFirst = false;   // Angerud's tip said this session
    this.prev = null;         // Stig's spot last frame on foot with the bag (where an R spills it)
    this.handed = 0;          // tests: exchanges played this session
    this.last = null;         // tests: the last event { kind: 'lift' | 'drop' | 'home' | 'hand', id, … }
    for (const b of this.list) {
      b.home = { x: b.x, y: b.y, z: b.z, yaw: b.mesh.rotation.y };
      b.mesh.rotation.order = 'YXZ';   // on his head it lies on its back (place)
    }
    game.addInteractable({
      id: 'hittelon:lamna', r: cfg.r, prompt: cfg.prompt,
      pos: () => lm(cfg.lm),
      enabled: () => this.canHand(),
      use: () => this.handOver(),
    });
  }

  get list() { return this.g.collectibles[this.cfg.set] || []; }
  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get holding() { return !!this.bag && !this.busy && this.g.carrying === this.carry; }

  // On foot and his hands free: a bag is lifted only then.
  free() {
    const g = this.g, p = g.player;
    return !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying && p.state === 'normal' && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.skis.on && !g.belt.seated && !g.hitch.onTruck && !g.fest.joined;
  }
  canHand() {
    const g = this.g;
    return this.live && this.holding && !g.inDialog && !g.playerCar && g.player.state === 'normal' && this.clerkHere();
  }
  // The clerk behind his counter, nobody else's.
  clerkHere() {
    const g = this.g, n = g.npc('hittegods'), h = lm('hittegods');
    return !!n && g.honk.free('hittegods') && dist(n.x, n.z, h.x, h.z) < this.cfg.clerkR;
  }

  target() {
    if (!this.live || !this.holding) return null;
    const l = lm(this.cfg.lm);
    return { x: l.x, z: l.z, r: this.cfg.r };
  }
  objective() {
    if (!this.live || !this.holding) return null;
    return { title: this.cfg.title, text: this.cfg.text };
  }

  update(dt) {
    const live = this.live;
    if (live !== this.shown) {
      if (!live) this.reset();
      this.shown = live;
      for (const b of this.list) if (b.alive) b.mesh.visible = live;
    }
    if (!live) return;
    this.tickFalls(dt);
    if (this.busy) return;
    if (this.bag) this.carried();
    else if (this.free()) this.pickUps();
  }

  pickUps() {
    const g = this.g, p = g.player, c = this.cfg;
    for (const b of this.list) {
      if (!b.alive || b.held || b.falling) continue;
      if (dist(b.x, b.z, p.x, p.z) < c.pickR && Math.abs(b.y - p.y) < c.pickDy) { this.lift(b); return; }
    }
  }

  lift(b) {
    const g = this.g, p = g.player, c = this.cfg;
    this.bag = b;
    b.held = true;
    this.carry = { item: 'vaska', bag: b.id };
    g.carrying = this.carry;
    g.speedCap = g.levelDef.speeds.walk;
    g.bumpedT = 0;
    this.beam(b, false);
    audio.pickup();
    const first = !this.saidFirst && g.collected[c.set].size === 0;
    if (first) this.saidFirst = true;
    const text = first ? c.pickFirst : b.item?.say;
    if (text) g.say(p, text, 2.6);
    this.prev = { x: p.x, y: p.y, z: p.z };
    this.last = { kind: 'lift', id: b.id, first };
    this.place();
  }

  carried() {
    const g = this.g, p = g.player;
    // Someone else's carry took over (Berra lifted off his bench, §10.6): it falls at his feet.
    if (g.carrying !== this.carry) { this.carry = null; this.drop(p.x, p.y, p.z); return; }
    if (p.state === 'flung' || p.state === 'down') { this.drop(p.x, p.y, p.z); return; }
    // R spills it where he stood (in a car it stays in the car).
    if (g.bumpedT > 0 && !g.playerCar) { this.drop(this.prev.x, this.prev.y, this.prev.z); return; }
    this.place();
    if (!g.playerCar && p.state === 'normal') this.prev = { x: p.x, y: p.y, z: p.z };
  }

  // Over his head between his raised hands, lying on its back (the label up), its length across his
  // shoulders, the handle behind him; in a car out of sight, his arms down.
  place() {
    const g = this.g, p = g.player, m = this.bag.mesh, inCar = !!g.playerCar;
    m.visible = !inCar;
    p.anim.carryOver = !inCar;
    if (inCar) return;
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), k = 0.28;   // half the bag's height, now its depth
    m.rotation.set(-Math.PI / 2, p.yaw, 0);
    m.position.set(p.x + fx * k, p.y + p.height + 0.14, p.z + fz * k);
  }

  unhold() {
    const g = this.g;
    if (this.carry && g.carrying === this.carry) {
      g.carrying = null;
      g.speedCap = null;
      g.player.anim.carryOver = false;
    }
    this.carry = null;
  }

  // Off his head: it tumbles down onto the floor there and lies where it fell (its marker with it).
  drop(x, y, z) {
    const b = this.bag, m = b.mesh;
    this.unhold();
    this.bag = null;
    m.visible = true;
    b.falling = true;
    const to = { x, y: groundAt(x, z, y + 0.5, 0.6) + 0.04, z };
    this.falls.push({ b, t: 0, from: m.position.clone(), to, yaw: m.rotation.y, spin: (Math.random() < 0.5 ? -1 : 1) * 2.5 });
    this.last = { kind: 'drop', id: b.id, x: +x.toFixed(2), z: +z.toFixed(2) };
  }
  tickFalls(dt) {
    if (!this.falls.length) return;
    const T = this.cfg.tumbleSecs;
    for (const f of this.falls) {
      f.t += dt;
      const k = clamp(f.t / T, 0, 1), m = f.b.mesh;
      m.position.set(lerp(f.from.x, f.to.x, k), lerp(f.from.y, f.to.y, k * k), lerp(f.from.z, f.to.z, k));
      m.rotation.set(-Math.PI / 2 * (1 - k), f.yaw + f.spin * k, 0);
      if (k >= 1) this.land(f);
    }
    this.falls = this.falls.filter((f) => f.t < T);
  }
  land(f) {
    const b = f.b;
    b.falling = false;
    b.held = false;
    b.x = f.to.x; b.y = f.to.y; b.z = f.to.z;
    this.beam(b, true);
    audio.thud();
  }

  // Back on its spot, standing (a mission start, the other level, a carry taken over).
  home(b) {
    const h = b.home, m = b.mesh;
    this.falls = this.falls.filter((f) => f.b !== b);
    b.held = false;
    b.falling = false;
    b.x = h.x; b.y = h.y; b.z = h.z;
    m.position.set(h.x, h.y, h.z);
    m.rotation.set(0, h.yaw, 0);
    this.beam(b, true);
    this.last = { kind: 'home', id: b.id };
  }
  // Out of free roam: off his head, everything back on its spot.
  reset() {
    this.unhold();
    this.bag = null;
    for (const b of this.list) if (b.alive && (b.held || b.falling || b.x !== b.home.x || b.z !== b.home.z || b.y !== b.home.y)) this.home(b);
    this.falls = [];
  }

  beam(b, on) { const o = b.mesh.getObjectByName('beam'); if (o) o.visible = on; }

  // E at the counter: the bag on the counter, the clerk's exchange (the pay on `pays`), then the set's card.
  async handOver() {
    const g = this.g, c = this.cfg, b = this.bag;
    if (!b || this.busy || !this.canHand()) return;
    this.busy = true;
    this.unhold();
    const d = lm(c.disk), m = b.mesh;
    m.visible = true;
    m.position.set(d.x, d.y, d.z);
    m.rotation.set(0, d.yaw, 0);
    g.unsay(g.player);
    g.placeNpc('stig', c.lm);
    g.cutTo(c.cam);
    g.inDialog = true;
    hud.letterbox(true);
    const pays = { coins: c.pay, sfx: 'coin', toast: fmt(c.toast, { n: pta(c.pay) }) };
    try {
      await g.dialog(c.lines.map(([who, text, cue]) => [who, text, cue?.pays ? pays : cue]));
    } finally {
      g.endCut();
      g.endCinematic();
      this.busy = false;
    }
    this.bag = null;
    b.held = false;
    this.handed++;
    this.last = { kind: 'hand', id: b.id, n: g.collected[c.set].size + 1 };
    g.collect(c.set, b);   // hides it; the card, the chime, the save; 6/6: the bonus and Angerud
  }
}
