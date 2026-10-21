// Glass till Majsan innan den smälter (free roam; feature 126, DESIGN §10.61). Between missions, by day,
// the HELADOS · GLASS kiosk on the main beach sells Stig an ice cream (E at its counter, 25 pta; Ole pays
// when the purse is short), and it is for Majsan. In his left hand (`carrying.glass`) it melts away in
// GLASS.meltSecs s wherever he is, in a car too (hidden there): the vanilla scoop on top first, then the
// strawberry, dripping pink spots on the ground behind him; all gone, the last of it plops to the ground
// and he holds the bare cone. A fall or R drops it all. Within `giveR` m of Majsan, on foot, both free,
// the handover plays by itself (no E: as fataga's giver her talk wins within 3.4 m): in time she thanks
// him and eats it (the share left as a toast, the best kept in `records.glass`); with the bare cone
// "Den var hel när jag köpte den…" / "Det är tanken som räknas, Stig.". While he has it the objective
// card and the guide arrow point at her; no countdown. Only on the island with no mission running
// (`missions.state === 'idle'`); a mission start or the other level ends all of it at once, so no
// mission, timer or calibration pool sees it. Config: GLASS (content/island.js); the cone and its scoops
// are models.js's (`anim.glass`, `glassK`). Owned by Game as `glass`: main.js calls `update` once a frame,
// `target` and `objective` for the marker and the card, and asks `posed(key)` in npcPosed (honk.free too).

import { GLASS } from '../content/index.js';
import { THREE, scene, GeoBuilder, toonMesh } from '../gfx.js';
import { groundAt } from '../world/collision.js';
import { audio } from '../audio.js';
import { fx } from './fx.js';
import { hud } from './hud.js';
import { pta } from '../strings.js';
import { dist, yawTo, dampAngle } from '../util.js';

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const PINK = 0xe2809f;
const SPOTS = 24;
// Stig's arm poses that take his hands: the cone is not shown while one is on (it melts on).
const ARMS = ['wings', 'cupUp', 'push', 'hold', 'flail', 'oath', 'dance', 'laugh', 'mirror', 'film', 'camShow', 'giraffe', 'butterKnife', 'carryOver',
  'glide', 'swan', 'calc', 'ski', 'groda', 'ticket', 'leap', 'bomb', 'placate', 'rub', 'eyesShut', 'tap', 'scratch', 'point', 'cheer',
  'fish', 'thumb', 'ride', 'kikare', 'sort', 'volley', 'foto', 'whisky'];
const _v = new THREE.Vector3();

export class Glass {
  constructor(game, cfg = GLASS) {
    this.g = game;
    this.cfg = cfg;
    this.carry = null;       // our g.carrying while Stig has it
    this.k = 0;              // how much of it is left: 1 whole .. 0 the bare cone
    this.halfSaid = false;
    this.scene = null;       // the handover: { kind: 'give' | 'strut', t, steps, i, end, x, z }
    this.posedM = false;     // Majsan held (turned to him) by the handover
    this.eatT = 0;           // s Majsan still eats it (or holds the bare cone)
    this.eatK = 0;           // her share left, eaten down to 0 over eatSecs
    this.stigSet = false;    // the anim.glass we put on Stig
    this.dripT = 0;
    this.coneAt = null;      // where the cone was the last frame it was shown, and his floor then (an R's splat stays there)
    this.feetY = 0;
    this.queue = [];         // bubbles still to say: [{ at, who, text, secs }] (g.time)
    this.counts = { buy: 0, half: 0, melt: 0, drop: 0, give: 0, strut: 0, broke: 0 };
    this.last = null;        // tests: { kind: 'buy' | 'half' | 'melt' | 'drop' | 'give' | 'strut' | 'hand' | 'broke' | 'home', t, … }
    this.build();
    const self = this;
    game.addInteractable({
      id: 'glass', r: cfg.r,
      pos: () => ({ x: cfg.at[0], z: cfg.at[1] }),
      get prompt() { return fill(cfg.prompt, { n: pta(cfg.price) }); },
      enabled: () => self.canBuy(),
      use: () => self.buy(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get holding() { return !!this.carry && this.g.carrying === this.carry; }
  posed(key) { return key === 'majsan' && this.posedM; }
  // Majsan while he has her ice cream, hands it over or she eats it: the pool fest's ring leaves her out
  // (game/poolFest.js `free`), or it would take her into the water as he comes onto the deck.
  wants(key) { return key === 'majsan' && this.live && (this.holding || !!this.scene || this.eatT > 0); }

  // On foot, standing, free; `withGlass`: with our ice cream in his hand (else with nothing).
  stigFree(withGlass = false) {
    const g = this.g, p = g.player;
    return !g.inDialog && !g.inCutaway && !g.playerCar && (withGlass ? g.carrying === this.carry : !g.carrying)
      && p.state === 'normal' && p.onGround && !p.seatId && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active
      && !g.skis.on && !g.eslov.race && !g.gatlopp.mode && !g.hitch.onTruck && !g.guagua.onBus && !g.kikare.busy && !g.kort.busy && !g.volley.mode;
  }
  // Majsan shown on the island and on the ground (the kiosk sells only then: not with her up on the balcony
  // above 105, §10.55, or in a car), and free for the handover: standing, not in a car or a seat, up on a
  // balcony or held by anyone (honk.free asks every free-roam module), not eating.
  majsanHere() { const n = this.g.npc('majsan'); return !!n && n.state !== 'hidden' && n.root.visible && !n.perched && !n.car; }
  majsanFree() {
    const g = this.g, n = g.npc('majsan');
    return !!n && n.state === 'normal' && n.root.visible && !n.car && !n.seatId && !n.steer && !n.busy && !n.perched
      && g.honk.free('majsan') && !g.npcPosed('majsan') && this.eatT <= 0;
  }
  canBuy() {
    return this.live && this.g.day.isDay() && !this.carry && !this.scene && this.stigFree() && this.majsanHere();
  }
  canGive() {
    if (!this.live || !this.holding || this.scene) return false;
    const g = this.g, p = g.player, n = g.npc('majsan');
    return this.stigFree(true) && this.majsanFree() && dist(p.x, p.z, n.x, n.z) < this.cfg.giveR && Math.abs(n.y - p.y) < 1;
  }

  target() {
    if (!this.live || !this.holding || this.scene) return null;
    const n = this.g.npc('majsan');
    return n && n.state !== 'hidden' ? { x: n.x, z: n.z, follow: true } : null;
  }
  objective() {
    if (!this.live || !this.holding || this.scene) return null;
    return { title: this.cfg.title, text: this.k > 0 ? this.cfg.text : this.cfg.textStrut };
  }

  // The drips on the ground: a pool of flat pink spots, reused oldest first.
  build() {
    const gb = new GeoBuilder();
    gb.cyl(PINK, 0, 0, 0, 1, 0.012, 12);
    const geo = gb.build();
    this.spots = [];
    for (let k = 0; k < SPOTS; k++) {
      const m = toonMesh(geo, { outline: 0, cast: false });
      m.visible = false;
      scene.add(m);
      this.spots.push({ mesh: m, t: 0, r: 0, rz: 0 });
    }
    this.spotI = 0;
  }
  spot(x, z, y, r) {
    const s = this.spots[this.spotI];
    this.spotI = (this.spotI + 1) % SPOTS;
    s.t = this.cfg.drip.life;
    s.r = r;
    s.rz = r * (0.75 + Math.random() * 0.3);
    s.mesh.position.set(x, y + 0.05, z);   // over the sand's tone patches and towels (CURB + 0.03–0.04)
    s.mesh.scale.set(r, 1, s.rz);
    s.mesh.rotation.y = Math.random() * Math.PI;
    s.mesh.visible = true;
  }
  tickSpots(dt) {
    const f = this.cfg.drip.fade;
    for (const s of this.spots) {
      if (!s.mesh.visible) continue;
      s.t -= dt;
      if (s.t <= 0) { s.mesh.visible = false; continue; }
      const k = Math.min(1, s.t / f);
      s.mesh.scale.x = s.r * k;
      s.mesh.scale.z = s.rz * k;
    }
  }
  clearSpots() { for (const s of this.spots) s.mesh.visible = false; }
  // Where the cone is (his hand), else over his left side.
  conePos() {
    const p = this.g.player, pr = p.model.props.glasstrut;
    if (pr?.visible) return pr.getWorldPosition(_v);
    return _v.set(p.x, p.y + 1.2, p.z);
  }
  floorY(x, z) { const p = this.g.player; return p.onGround ? groundAt(x, z, p.y + 0.3, 0.6) : groundAt(x, z, p.y, 0.6); }

  // ---------------------------------------------------------------------------------------------
  // The kiosk

  async buy() {
    if (!this.canBuy()) return;
    const g = this.g, c = this.cfg, p = g.player;
    p.yaw = c.at[2];
    p.wishX = p.wishZ = 0;
    const coins = g.coins;
    await g.pay(c.price);
    audio.coin();
    audio.pickup();
    this.carry = { item: 'glass', glass: true };
    g.carrying = this.carry;
    g.bumpedT = 0;
    this.k = 1;
    this.halfSaid = false;
    this.dripT = c.drip.every;
    this.counts.buy++;
    this.last = { kind: 'buy', t: g.time, paid: coins - g.coins };
    const w = { x: c.window[0], y: 0.15, z: c.window[1], height: c.window[2] };
    this.queue.push({ at: g.time + c.soldAt, who: w, text: c.sold, secs: c.lineSecs }, { at: g.time + c.stigAt, who: 'stig', text: c.stig, secs: c.lineSecs });
  }

  // ---------------------------------------------------------------------------------------------
  // Carried: the melt, the drips, a fall

  carried(dt) {
    const g = this.g, c = this.cfg, p = g.player;
    if (g.carrying !== this.carry) { this.carry = null; this.last = { kind: 'broke', t: g.time }; this.counts.broke++; return; }
    if (p.state === 'flung' || p.state === 'down' || (g.bumpedT > 0 && !g.playerCar)) { this.drop(); return; }
    if (this.scene || this.k <= 0) return;
    this.k = Math.max(0, this.k - dt / c.meltSecs);
    if (!this.halfSaid && this.k <= 0.5) {
      this.halfSaid = true;
      this.counts.half++;
      this.last = { kind: 'half', t: g.time };
      if (!g.playerCar && !g.inDialog) g.say(p, c.half, 1.6);
    }
    if (this.k <= 0) { this.meltDone(); return; }
    this.dripT -= dt;
    if (this.dripT <= 0) {
      this.dripT = c.drip.every;
      if (this.stigSet && p.onGround) {
        const q = this.conePos();
        fx.spawn(q.x, q.y - 0.12, q.z, PINK, { vy: -0.4, s0: 0.07, s1: 0.05, life: 0.35, drag: 0, grav: 12 });
        const [r0, r1] = c.drip.r;
        this.spot(q.x, q.z, this.floorY(q.x, q.z), r0 + Math.random() * (r1 - r0));
      }
    }
  }
  // All melted: the last of it plops to the ground; he holds the bare cone.
  meltDone() {
    const g = this.g, c = this.cfg, p = g.player;
    this.k = 0;
    this.counts.melt++;
    this.last = { kind: 'melt', t: g.time };
    if (this.stigSet) {
      const q = this.conePos();
      fx.spill(q.x, q.y, q.z, PINK, 5);
      this.spot(q.x, q.z, this.floorY(q.x, q.z), c.plopR);
      audio.splat();
    }
    hud.toast(c.meltToast);
    if (!g.playerCar && !g.inDialog) this.queue.push({ at: g.time + 0.5, who: 'stig', text: c.melted, secs: 1.6 });
  }
  // A fall or R: it is gone, where the cone last was (R has already put him back on the road).
  drop() {
    const g = this.g, c = this.cfg, p = g.player;
    const q = this.coneAt ? this.coneAt.clone() : _v.set(p.x, p.y + 1, p.z).clone(), y = this.coneAt ? this.feetY : this.floorY(q.x, q.z);
    this.unhold();
    fx.spill(q.x, q.y, q.z, PINK, 10);
    this.spot(q.x, q.z, y, c.dropR);
    audio.splat();
    hud.toast(c.dropToast);
    this.counts.drop++;
    this.last = { kind: 'drop', t: g.time, k: +this.k.toFixed(3), x: +q.x.toFixed(2), z: +q.z.toFixed(2) };
  }
  unhold() {
    const g = this.g;
    if (this.carry && g.carrying === this.carry) g.carrying = null;
    this.carry = null;
    this.coneAt = null;
    this.syncStig();
  }

  // ---------------------------------------------------------------------------------------------
  // The handover

  give() {
    const g = this.g, c = this.cfg, p = g.player, n = g.npc('majsan');
    const strut = this.k <= 0, set = strut ? c.strut : c.give[this.counts.give % c.give.length], k = this.k;
    p.yaw = yawTo(n.x - p.x, n.z - p.z);
    p.wishX = p.wishZ = 0;
    g.unsay(n);
    this.queue = [];
    this.posedM = true;
    n.wishX = n.wishZ = 0;
    this.last = { kind: strut ? 'strut' : 'give', t: g.time, k: +k.toFixed(3), lines: set.lines.map(([, w, text]) => [w, text]) };
    const steps = set.lines.map(([at, who, text]) => [at, () => g.say(who === 'stig' ? p : g.npc(who), text, c.lineSecs)]);
    steps.push([set.handAt, () => this.hand(k, strut), true]);
    this.scene = { kind: strut ? 'strut' : 'give', t: 0, steps: steps.sort((a, b) => a[0] - b[0]), i: 0, end: set.end, x: p.x, z: p.z };
    for (const m of Object.values(g.npcs)) if (m.state !== 'hidden' && dist(m.x, m.z, p.x, p.z) < c.hushR) m.chatT = Math.max(m.chatT ?? 0, set.end + c.hushAfter);
  }
  hand(k, strut) {
    const g = this.g, c = this.cfg;
    this.unhold();
    this.eatK = k;
    this.eatT = c.eatSecs;
    this.syncMajsan();
    audio.pickup();
    if (strut) { this.counts.strut++; this.last = { ...this.last, kind: 'hand', strut: true, t: g.time }; return; }
    this.counts.give++;
    const n = Math.max(1, Math.round(k * 100)), best = g.records.glass || 0, record = n > best;
    if (record) { g.records.glass = n; g.save(); }
    hud.toast(`<span>${fill(c.left, { n })}${record ? ' ' + c.record : ''}</span>`);
    this.last = { ...this.last, kind: 'hand', strut: false, pct: n, record, t: g.time };
  }
  tickScene(dt) {
    const s = this.scene;
    if (!s) return;
    const g = this.g, c = this.cfg, p = g.player, n = g.npc('majsan');
    s.t += dt;
    if (dist(p.x, p.z, s.x, s.z) > c.leaveR || g.playerCar || g.inDialog || !n || n.state !== 'normal') {
      g.unsay(n);
      for (; s.i < s.steps.length; s.i++) if (s.steps[s.i][2]) s.steps[s.i][1]();
      s.t = Math.max(s.t, s.end);
      this.last = { ...this.last, broke: true };
    }
    while (s.i < s.steps.length && s.steps[s.i][0] <= s.t) s.steps[s.i++][1]();
    if (s.i >= s.steps.length && s.t >= s.end) { this.scene = null; this.posedM = false; return; }
    if (n && n.state === 'normal') { n.yaw = dampAngle(n.yaw, yawTo(p.x - n.x, p.z - n.z), 8, dt); n.wishX = n.wishZ = 0; }
  }
  // Majsan eats it (or holds the bare cone) for eatSecs.
  tickMajsan(dt) {
    if (this.eatT <= 0) return;
    this.eatT -= dt;
    this.eatK = Math.max(0, this.eatK - dt / this.cfg.eatSecs);
    this.syncMajsan();
  }
  syncMajsan() {
    const n = this.g.npc('majsan');
    if (!n) return;
    if (this.eatT > 0 && n.state === 'normal') { n.anim.glass = 'eat'; n.anim.glassK = this.eatK; }
    else if (n.anim.glass) { n.anim.glass = false; if (this.eatT <= 0) this.eatT = 0; }
  }
  syncStig() {
    const g = this.g, p = g.player;
    const want = this.holding && this.live && !g.playerCar && p.state === 'normal' && !p.seatId && !ARMS.some((f) => p.anim[f]);
    if (want) {
      p.anim.glass = this.scene ? 'out' : true;
      p.anim.glassK = this.k;
      this.stigSet = true;
    } else if (this.stigSet) {
      if (p.anim.glass) p.anim.glass = false;
      this.stigSet = false;
    }
  }

  // ---------------------------------------------------------------------------------------------

  reset(why = 'mission') {
    const g = this.g, n = g.npc('majsan');
    if (this.carry) {
      if (g.carrying === this.carry) g.carrying = null;
      this.carry = null;
    }
    this.k = 0;
    this.scene = null;
    this.posedM = false;
    this.queue = [];
    this.eatT = 0;
    if (n?.anim.glass) n.anim.glass = false;
    this.syncStig();
    this.clearSpots();
    this.last = { kind: 'home', t: g.time, why };
  }

  update(dt) {
    const g = this.g;
    if (!this.live) {
      if (this.carry || this.scene || this.eatT > 0 || this.stigSet || this.queue.length || this.spots.some((s) => s.mesh.visible)) {
        this.reset(g.missions.state !== 'idle' ? 'mission' : 'level');
      }
      return;
    }
    if (this.carry) this.carried(dt);
    if (this.carry && this.stigSet && g.player.onGround) { (this.coneAt ??= new THREE.Vector3()).copy(this.conePos()); this.feetY = g.player.y; }
    this.tickScene(dt);
    this.tickMajsan(dt);
    if (this.carry && !this.scene && this.canGive()) this.give();
    this.syncStig();
    this.tickSpots(dt);
    while (this.queue.length && this.queue[0].at <= g.time) {
      const q = this.queue.shift();
      g.say(typeof q.who === 'string' ? (q.who === 'stig' ? g.player : g.npc(q.who)) : q.who, q.text, q.secs);
    }
  }
}
