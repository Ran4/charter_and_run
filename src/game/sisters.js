// Systrarnas balkong – "Vi är väl inte på nåt jäkla vernissage?" (free roam; feature 117, DESIGN §10.55).
// Between fataga and the grisfest (`missions.index` 11, idle) Siv and Majsan are no longer needed as
// givers or extras, and when Stig walks onto room 105's patio by day, with both of them free at the
// pool, the camera cuts up to the balcony above 105: the sisters stand there (placed by hand,
// `Character.perchAt`: the balcony is only a look, no solid), Siv with her glass calls down the film's
// line and our errand, "Giraffen! Fixa en whisky!", and Majsan waves. Stig buys a bottle (no label) at
// SUPERMERCADO in Centro Nórdico or at BAR PISCINA, carries it in his left hand (a fall, a knock or R
// breaks it), and E under the balcony plays the delivery: the basket comes down on a knotted beach
// towel, the bottle goes in, the basket goes up, Siv's whisky line from the welcome meeting, her tease
// to Majsan and Stig's puzzled "Varsågoda…". No points, no prize: afterwards Majsan waves each time he
// comes by, until the grisfest starts. A car he leaves on the street or the service drive by the
// hotel's west gable gets Majsan's "Här nere parkerar de hursomhelst." from up there and Siv's "Spänn
// av, Majsan. Du är ledig." (the residents of §10.42 leave the line to her, `parks`). Only on the
// island with `missions.state === 'idle'` at that index: a mission start (or the other level) sends
// the sisters home to the pool at once and takes the bottle, so no mission, stage, timer or
// calibration pool sees any of it, and until Stig comes onto the patio the pool's features keep the
// sisters as before. Nothing is saved. Config: SYSTRARNA (content/island.js). Owned by Game as
// `sisters`: main.js calls `update` once a frame, asks `posed(key)` (npcPosed), `waving(key)` (syncAll),
// `target()` (updateMarkers) and `objective()` (updateHud), lets the giver's talk start with the bottle
// in his hand (`carrying.whisky`) and skips a perched NPC in a kick; honk.free asks `posed`, the
// residents `parks`; the interactables are registered here.

import { SYSTRARNA } from '../content/index.js';
import { THREE, scene, GeoBuilder, toonMesh } from '../gfx.js';
import { whiskyBottle } from '../actors/models.js';
import { lm } from '../world/layout.js';
import { audio } from '../audio.js';
import { fx } from './fx.js';
import { hud } from './hud.js';
import { pta } from '../strings.js';
import { clamp, dist, yawTo, dampAngle } from '../util.js';

const KEYS = ['siv', 'majsan'];
const MARK = 'balkong105';   // the spot id the sisters carry while they are ours (placeNpcs leaves them be)
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const ease = (k) => k * k * (3 - 2 * k);
// The towel's segment and the basket (sizes in m).
const SEG = 0.3, BASKET_H = 0.3, HANDLE = 0.24;

export class Sisters {
  constructor(game, cfg = SYSTRARNA) {
    this.g = game;
    this.cfg = cfg;
    this.phase = null;       // null | 'ask' | 'errand' | 'deliver' | 'done'
    this.up = false;         // the sisters on the balcony (ours)
    this.carry = null;       // our g.carrying while Stig has the bottle
    this.basketY = null;     // the basket's bottom (null: put away)
    this.tween = null;       // { y0, y1, t, secs } the basket on its way
    this.queue = [];         // bubbles still to say: [{ at, who, text, secs }] (g.time)
    this.armed = false;      // he has been `awayR` m off since the last wave or call
    this.waveT = 0;          // s of Majsan's wave left
    this.remindT = -Infinity;
    this.parkT = -Infinity;
    this.carWas = null;      // his car last frame, and the one he has just left: { car, t }
    this.left = null;
    this.counts = { ask: 0, buy: 0, broke: 0, deliver: 0, wave: 0, remind: 0, park: 0 };
    this.last = null;        // tests: { kind: 'ask' | 'buy' | 'broke' | 'deliver' | 'wave' | 'remind' | 'park' | 'home', t, … }
    this.build();
    const self = this;
    for (const s of cfg.shops) {
      game.addInteractable({
        id: 'whisky:' + s.id, r: s.r,
        pos: () => lm(s.lm),
        get prompt() { return fill(cfg.buyPrompt, { n: pta(s.price) }); },
        enabled: () => self.canBuy(s),
        use: () => self.buy(s),
      });
    }
    game.addInteractable({
      id: 'whisky:korg', r: cfg.korgR, prompt: cfg.korgPrompt,
      pos: () => lm(cfg.stand),
      enabled: () => self.canDeliver(),
      use: () => self.deliver(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle' && g.missions.index === this.cfg.index; }
  get holding() { return !!this.carry && this.g.carrying === this.carry; }
  // A scene of ours is playing (the ask or the delivery).
  get scene() { return this.phase === 'ask' || this.phase === 'deliver'; }

  // main.npcPosed / honk.free: the sisters while they are up on the balcony.
  posed(key) { return this.up && KEYS.includes(key); }
  // main.syncAll: Majsan waves (through a dialogue too: the ask's and the delivery's own).
  waving(key) { return key === 'majsan' && this.up && (this.phase === 'ask' || this.waveT > 0); }
  // residents.events: a car he has just left in the zone below the sisters is Majsan's to talk about.
  parks(car) { return this.up && !this.scene && this.inZone(car, this.cfg.park.zone); }

  inZone(q, [[x0, x1], [z0, z1]]) { return q.x >= x0 && q.x <= x1 && q.z >= z0 && q.z <= z1; }

  // Free to be taken up: shown, standing, in no car, seat or walk, held by nobody.
  free(key) {
    const g = this.g, n = g.npc(key), cur = g.missions.current;
    if (!n || n.state !== 'normal' || !n.root.visible || n.car || n.seatId || n.steer || n.busy || n.perched) return false;
    if (cur && cur.level === 'island' && (cur.giver === key || cur.extra?.some((e) => e === key || (Array.isArray(e) && e[0] === key)))) return false;
    return !g.npcPosed(key) && g.honk.free(key);
  }
  // Stig on foot, standing on the ground, in no scene, hold, ride, game, pursuit, bust or PANIK.
  stigFree(withBottle = false) {
    const g = this.g, p = g.player;
    return !g.inDialog && !g.inCutaway && !g.playerCar && (withBottle ? g.carrying === this.carry : !g.carrying)
      && p.state === 'normal' && p.onGround && !p.seatId && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active
      && !g.skis.on && !g.eslov.race && !g.gatlopp.mode && !g.hitch.onTruck && !g.guagua.onBus && !g.kikare.busy && !g.kort.busy && !g.volley.mode;
  }

  canAsk() {
    const g = this.g, p = g.player;
    return this.live && !this.phase && g.day.isDay() && this.inZone(p, this.cfg.zone) && this.stigFree() && KEYS.every((k) => this.free(k));
  }
  canBuy(s) {
    const g = this.g;
    if (!this.live || this.phase !== 'errand' || this.holding || !this.stigFree()) return false;
    if (!s.who) return true;
    // The bartender at his place behind the counter, free (as the coffee wants him, §10.44).
    const n = g.npc(s.who), h = lm(s.home);
    return !!n && g.bar.open && n.state === 'normal' && n.root.visible && !g.npcPosed(s.who) && g.honk.free(s.who) && dist(n.x, n.z, h.x, h.z) < s.homeR;
  }
  canDeliver() { return this.live && this.phase === 'errand' && this.up && this.holding && this.stigFree(true); }

  target() {
    if (!this.live || this.phase !== 'errand') return null;
    const g = this.g, f = g.focus(), c = this.cfg;
    if (this.holding) { const l = lm(c.stand); return { x: l.x, z: l.z, r: c.korgR }; }
    let best = null, bd = Infinity;
    for (const s of c.shops) { const l = lm(s.lm), d = dist(l.x, l.z, f.x, f.z); if (d < bd) { bd = d; best = { x: l.x, z: l.z, r: s.r }; } }
    return best;
  }
  objective() {
    if (!this.live || this.phase !== 'errand') return null;
    return { title: this.cfg.title, text: this.holding ? this.cfg.bringText : this.cfg.buyText };
  }

  // ---------------------------------------------------------------------------------------------
  // The basket on the knotted towel, and the bottle in it

  build() {
    const tg = new GeoBuilder();
    // One length of the twisted towel: blue and white bands, a knot at its top.
    tg.box(0x2f6fd0, 0, SEG * 0.25, 0, 0.17, SEG * 0.5, 0.09);
    tg.box(0xf4f4f0, 0, SEG * 0.75, 0, 0.17, SEG * 0.5, 0.09);
    tg.sphere(0x2f6fd0, 0, SEG - 0.02, 0, 0.13, 0.08, 0.1);
    const segGeo = tg.build();
    this.segs = [];
    const n = Math.ceil((this.railY() - this.cfg.basketY) / SEG) + 1;
    for (let k = 0; k < n; k++) { const m = toonMesh(segGeo, { outline: 0.012 }); m.visible = false; scene.add(m); this.segs.push(m); }
    // Over the railing's coping to Majsan's hands.
    const og = new GeoBuilder();
    og.box(0x2f6fd0, 0, 0, 0.3, 0.17, 0.07, 0.6);
    this.over = toonMesh(og.build(), { outline: 0.012 });
    this.over.visible = false;
    scene.add(this.over);
    // A wicker basket, its handle up to the towel's end.
    const bg = new GeoBuilder();
    bg.cyl(0xb98a4e, 0, BASKET_H / 2, 0, 0.21, BASKET_H, 14);
    for (const y of [0.06, 0.15, 0.24]) bg.cyl(0x8a5e2e, 0, y, 0, 0.215, 0.03, 14);
    bg.cyl(0x5a3a1e, 0, BASKET_H - 0.005, 0, 0.18, 0.012, 14);
    bg.box(0x8a5e2e, -0.19, BASKET_H + HANDLE / 2, 0, 0.03, HANDLE, 0.03);
    bg.box(0x8a5e2e, 0.19, BASKET_H + HANDLE / 2, 0, 0.03, HANDLE, 0.03);
    bg.box(0x8a5e2e, 0, BASKET_H + HANDLE, 0, 0.41, 0.03, 0.03);
    this.basket = toonMesh(bg.build(), { outline: 0.014 });
    this.basket.visible = false;
    scene.add(this.basket);
    const wg = new GeoBuilder();
    whiskyBottle(wg);
    this.bottle = toonMesh(wg.build(), { outline: 0.01 });
    this.bottle.scale.setScalar(1.12);
    this.bottle.visible = false;
    this.basket.add(this.bottle);
    this.bottle.position.set(0.04, 0.16, 0);
    this.bottle.rotation.z = 0.2;
  }
  // The top of the balcony railing's coping (hotels.js balconies: the floor's top + 1.04).
  railY() { return lm(this.cfg.at).y + 1.04; }
  // Where the towel hangs: under Majsan's hands, just out from the coping.
  hangAt() {
    const c = this.cfg, q = this.g.lmOffset(c.at, c.spots.majsan[0], c.spots.majsan[1] + c.hangOut);
    return { x: q.x, z: q.z };
  }
  // The basket's bottom at y (null: put away), the towel paid out above it to the railing.
  setBasket(y) {
    this.basketY = y;
    const show = y != null;
    this.basket.visible = this.over.visible = show;
    if (!show) { for (const s of this.segs) s.visible = false; this.bottle.visible = false; return; }
    const h = this.hangAt(), top = this.railY(), l = lm(this.cfg.at);
    this.basket.position.set(h.x, y, h.z);
    this.basket.rotation.y = l.yaw;
    this.over.position.set(h.x, top + 0.03, h.z);
    this.over.rotation.y = l.yaw + Math.PI;
    // From the handle's top up: a whole length shows only below the coping.
    const y0 = y + BASKET_H + HANDLE - 0.04;
    this.segs.forEach((s, k) => {
      const sy = y0 + k * SEG;
      s.visible = sy + SEG <= top + 0.02;
      s.position.set(h.x, sy, h.z);
      s.rotation.y = l.yaw + (k % 2 ? 0.5 : -0.3);
    });
  }

  // ---------------------------------------------------------------------------------------------
  // The sisters up and down

  // Up on the balcony: perched on their spots, turned to the patio, held (busy, MARK), Siv's glass.
  claim() {
    const g = this.g, c = this.cfg, l = lm(c.at);
    for (const k of KEYS) {
      const n = g.npc(k), q = g.lmOffset(c.at, c.spots[k][0], c.spots[k][1]);
      g.unsay(n);
      n.perchAt(q.x, l.y, q.z, l.yaw);
      n.busy = true;
      n.spot = MARK;
      n.vx = n.vz = 0;
    }
    g.npc('siv').anim.cupHeld = 'low';
    this.up = true;
  }
  // Back home at the pool at once (a mission start, the other level): only one still ours.
  release() {
    const g = this.g;
    for (const k of KEYS) {
      const n = g.npc(k);
      if (!n) continue;
      if (n.anim.cupHeld === 'low' && k === 'siv') n.anim.cupHeld = false;
      for (const f of ['whisky', 'push', 'cupUp', 'laugh']) n.anim[f] = false;
      n.anim.wave = false;
      if (n.spot !== MARK) continue;   // someone placed her meanwhile (the mission's placeNpcs)
      let home = g.levelDef.homes(g)[k] ?? null;
      if (k in g.homeOverrides) home = g.homeOverrides[k];
      if (home && !home.seat) g.placeNpc(k, home[0], home[1], home[2], home[3]);
      else if (n.perched) n.teleport(n.x, n.z);
      n.busy = false;
      n.spot = null;
    }
    this.up = false;
  }

  // ---------------------------------------------------------------------------------------------
  // The scenes

  // The camera up at the balcony from the patio (`shot` or `korgShot`: [left, forward, y] from `at`).
  cut(s = this.cfg.shot) {
    const g = this.g, e = g.lmOffset(this.cfg.at, s.eye[0], s.eye[1]), k = g.lmOffset(this.cfg.at, s.look[0], s.look[1]);
    g.cam.cutTo({ x: e.x, y: s.eye[2], z: e.z }, { x: k.x, y: s.look[2], z: k.z });
  }
  // Stig on the stand under the balcony, facing it.
  placeStig() {
    const g = this.g, p = g.player, l = lm(this.cfg.stand);
    g.unsay(p);
    p.teleport(l.x, l.z, l.yaw);
    p.wishX = p.wishZ = 0;
  }
  // The scene's end: the chase camera behind him, looking up at the balcony.
  endScene() {
    const g = this.g, p = g.player;
    g.cam.release();
    g.cam.yaw = p.yaw;
    g.cam.snapNext = true;
    hud.letterbox(false);
    g.inDialog = false;
  }

  async ask() {
    if (!this.canAsk()) return;
    const g = this.g, c = this.cfg;
    this.phase = 'ask';
    this.counts.ask++;
    this.queue = [];
    this.claim();
    this.placeStig();
    g.inDialog = true;
    hud.letterbox(true);
    this.cut();
    this.last = { kind: 'ask', t: g.time };
    try {
      await g.dialog(c.ask);
    } finally {
      if (this.phase === 'ask') this.phase = 'errand';
      if (this.up) this.endScene();
      this.armed = false;
    }
  }

  // E at a shop: the bottle for the price (Ole pays when the purse is short), the shop's lines.
  async buy(s) {
    if (!this.canBuy(s)) return;
    const g = this.g, c = this.cfg, p = g.player, l = lm(s.lm);
    p.yaw = l.yaw;
    p.wishX = p.wishZ = 0;
    const coins = g.coins;
    await g.pay(s.price);
    audio.coin();
    this.carry = { item: 'whisky', whisky: true };
    g.carrying = this.carry;
    g.bumpedT = 0;
    this.counts.buy++;
    this.last = { kind: 'buy', shop: s.id, t: g.time, paid: coins - g.coins };
    for (const [at, who, text] of s.lines) this.queue.push({ at: g.time + at, who: who === 'shop' ? this.shopAnchor(s) : who, text, secs: 2.4 });
    audio.pickup();
  }
  // A voice from inside a shop with nobody at its counter: over its door, 2.2 m up.
  shopAnchor(s) {
    const q = this.g.lmOffset(s.lm, 0, s.door ?? 1.3);
    return { x: q.x, y: 0.15, z: q.z, height: 2.2 };
  }

  // E under the balcony with the bottle: the basket down, the bottle in, the basket up, the lines.
  async deliver() {
    if (!this.canDeliver()) return;
    const g = this.g, c = this.cfg, p = g.player, M = g.npc('majsan'), V = g.npc('siv');
    this.phase = 'deliver';
    this.queue = [];
    this.placeStig();
    g.inDialog = true;
    hud.letterbox(true);
    this.cut(c.korgShot);
    this.last = { kind: 'deliver', t: g.time };
    const ok = () => this.live && this.phase === 'deliver';
    try {
      M.anim.push = true;
      audio.squeak();
      this.tween = { y0: this.railY() - BASKET_H - HANDLE, y1: c.basketY, t: 0, secs: c.lowerSecs };
      await g.wait(c.lowerSecs + 0.15);
      if (!ok()) return;
      p.anim.whisky = 'out';
      await g.wait(c.putAt);
      if (!ok()) return;
      this.unhold();
      this.bottle.visible = true;
      audio.pickup();
      await g.wait(c.holdAt);
      if (!ok()) return;
      audio.squeak();
      this.tween = { y0: c.basketY, y1: this.railY() - BASKET_H - HANDLE, t: 0, secs: c.raiseSecs };
      await g.wait(c.raiseSecs + 0.1);
      if (!ok()) return;
      M.anim.push = false;
      this.tween = null;
      this.setBasket(null);
      V.anim.whisky = 'low';
      this.cut();
      await g.dialog(c.deliver);
      this.counts.deliver++;
      this.last = { kind: 'deliver', t: g.time, done: true };
    } finally {
      M.anim.push = false;
      this.tween = null;
      if (this.basketY != null) this.setBasket(null);
      if (this.phase === 'deliver') {
        this.phase = 'done';
        this.waveT = c.waveSecs;
        this.counts.wave++;
      }
      if (this.up) this.endScene();
      this.armed = false;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The bottle in his hand

  unhold() {
    const g = this.g, p = g.player;
    if (this.carry && g.carrying === this.carry) g.carrying = null;
    this.carry = null;
    if (p.anim.whisky) p.anim.whisky = false;
  }
  // A fall, a knock or R: it breaks where he is; back to buying one.
  smash() {
    const g = this.g, p = g.player, c = this.cfg;
    this.unhold();
    audio.smash();
    fx.spill(p.x, p.y + 0.9, p.z, 0xb8741e, 10);
    hud.toast(c.broken);
    this.counts.broke++;
    this.last = { kind: 'broke', t: g.time, x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
  }
  carried() {
    const g = this.g, p = g.player;
    if (g.carrying !== this.carry) { this.carry = null; if (p.anim.whisky) p.anim.whisky = false; return; }
    if (p.state === 'flung' || p.state === 'down' || (g.bumpedT > 0 && !g.playerCar)) { this.smash(); return; }
    // In his hand on foot; in a car it rides along out of sight.
    const want = !g.playerCar && p.state === 'normal' && !p.seatId;
    if (want && p.anim.whisky !== true && this.phase === 'errand') p.anim.whisky = true;
    else if (!want && p.anim.whisky) p.anim.whisky = false;
  }

  // ---------------------------------------------------------------------------------------------

  // Out of free roam at the index: the sisters home, the bottle gone, the basket away.
  reset() {
    const g = this.g;
    if (this.up) this.release();
    this.unhold();
    this.setBasket(null);
    this.tween = null;
    this.queue = [];
    this.waveT = 0;
    this.left = null;
    this.carWas = null;
    if (this.phase) this.last = { kind: 'home', t: g.time, from: this.phase };
    this.phase = null;
  }

  update(dt) {
    const g = this.g, c = this.cfg;
    if (!this.live) {
      if (this.phase || this.up || this.carry || this.basketY != null) this.reset();
      return;
    }
    if (this.tween) {
      const w = this.tween;
      w.t = Math.min(w.secs, w.t + dt);
      this.setBasket(w.y0 + (w.y1 - w.y0) * ease(w.t / w.secs));
    }
    if (this.carry) this.carried();
    if (!this.phase) { if (this.canAsk()) this.ask(); return; }
    if (!this.up) return;
    // Someone placed them meanwhile (it should not happen between missions): over, as at a mission start.
    if (KEYS.some((k) => g.npc(k).spot !== MARK || !g.npc(k).perched)) { this.reset(); return; }
    this.turn(dt);
    this.waveT = Math.max(0, this.waveT - dt);
    if (this.scene || g.inDialog) { if (!this.scene) this.queue = []; return; }
    this.passes();
    this.parking();
    while (this.queue.length && this.queue[0].at <= g.time) {
      const q = this.queue.shift();
      g.say(typeof q.who === 'string' ? (q.who === 'stig' ? g.player : g.npc(q.who)) : q.who, q.text, q.secs);
    }
  }

  // They turn to him when he is in front of the balcony, at most `turnMax` off the façade.
  turn(dt) {
    const g = this.g, c = this.cfg, f = g.focus(), l = lm(c.at);
    const front = this.inFront(f, c.turnR);
    for (const k of KEYS) {
      const n = g.npc(k);
      let want = l.yaw;
      if (front) {
        const d = Math.atan2(Math.sin(yawTo(f.x - n.x, f.z - n.z) - l.yaw), Math.cos(yawTo(f.x - n.x, f.z - n.z) - l.yaw));
        want = l.yaw + clamp(d, -c.turnMax, c.turnMax);
      }
      n.yaw = dampAngle(n.yaw, want, 4, dt);
    }
  }
  // On the street side of the balcony's line (south of the façade), within r m of it.
  inFront(f, r) {
    const l = lm(this.cfg.at), fx = Math.sin(l.yaw), fz = Math.cos(l.yaw);
    return (f.x - l.x) * fx + (f.z - l.z) * fz > 0.4 && dist(f.x, f.z, l.x, l.z) < r;
  }

  // Coming by: before the delivery Siv calls the errand down (Majsan waves when he brings it); after
  // it Majsan waves. Once an approach: again once he has been `awayR` m off.
  passes() {
    const g = this.g, c = this.cfg, f = g.focus(), l = lm(c.at);
    if (dist(f.x, f.z, l.x, l.z) > c.awayR) { this.armed = true; return; }
    if (!this.armed || !this.inFront(f, c.waveR)) return;
    this.armed = false;
    if (this.phase === 'errand' && !this.holding) {
      if (g.time - this.remindT < c.remindEvery) return;
      this.remindT = g.time;
      g.say(g.npc('siv'), c.remind, 2.4);
      this.counts.remind++;
      this.last = { kind: 'remind', t: g.time };
      return;
    }
    this.waveT = c.waveSecs;
    this.counts.wave++;
    this.last = { kind: 'wave', t: g.time };
  }

  // A car he has just left, standing in the zone below: Majsan's line from up there, Siv's answer.
  parking() {
    const g = this.g, p = this.cfg.park, car = g.playerCar;
    if (this.carWas && !car) this.left = { car: this.carWas, t: g.time };
    this.carWas = car;
    const l = this.left;
    if (!l) return;
    if (car || l.car.dead || g.time - l.t > p.secs) { this.left = null; return; }
    if (l.car.speed >= p.still) return;
    this.left = null;
    if (!this.parks(l.car) || g.time - this.parkT < p.every) return;
    this.parkT = g.time;
    this.queue.push({ at: g.time, who: 'majsan', text: p.line, secs: 2.6 }, { at: g.time + p.replyAt, who: 'siv', text: p.reply, secs: 2.6 });
    this.counts.park++;
    this.last = { kind: 'park', t: g.time, x: +l.car.x.toFixed(2), z: +l.car.z.toFixed(2) };
  }
}
