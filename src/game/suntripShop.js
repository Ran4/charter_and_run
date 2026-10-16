// Bränsletillägg tillkommer – SunTrip-butiken (free roam, DESIGN §10.23; feature 34). On the island
// with no mission running a yellow counter stands on the SunTrip office's porch (world/blocks/
// hotels.js SUNTRIP_SHOP; its group and solids only then), the film's travel agent behind it with
// the hat, the sunglasses, the dotted shirt and the nose guard. E buys one at the sign's price plus
// the add-ons: the receipt comes as a toast, line by line, and Stig sighs. The hat goes on SunTrip's
// Trapp Trull account (a third now, two instalments later) with a beach bag he must take, or the
// clerk calls "Paketet!" after him. What he buys is a layer over his outfit (`dress`, called by
// main.js setPlayerOutfit), worn in free roam only and saved (§10.5). Config BUTIK in
// content/island.js. Invented (§1.6): the shop on the island and Stig buying there.

import { BUTIK } from '../content/index.js';
import { Character } from '../actors/character.js';
import { SUNTRIP_SHOP } from '../world/blocks/hotels.js';
import { landmarks } from '../world/layout.js';
import { hud } from './hud.js';
import { audio } from '../audio.js';
import { dist, yawTo, dampAngle } from '../util.js';

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const total = (it) => it.base + it.add.reduce((a, [, n]) => a + n, 0);

export class SuntripShop {
  constructor(game, cfg = BUTIK) {
    this.g = game;
    this.cfg = cfg;
    this.items = cfg.items;
    this.owned = new Set();   // saved: the ids bought
    this.off = new Set();     // saved: the owned ids taken off at the counter
    this.trapp = 0;           // saved: Trapp Trull instalments still to pay
    this.trappT = 0;          // saved: s of free roam towards the next one
    this.bag = false;         // saved: the account's beach bag taken
    this.worn = '';           // the layer on him now: worn ids joined in item order ('' = none)
    this.clerk = null;        // the travel agent (a Character made on first show)
    this.near = false;        // he has been within backR of the counter since the last "Paketet!"
    this.greeted = false;     // once a session
    this.oleDue = false;      // the hat bought or put on: Ole's line when he next sees it
    this.queue = [];          // [{ at, fn }] (g.time)
    this.last = null;         // for tests: { kind: 'buy' | 'short' | 'toggle' | 'bag' | 'paketet' | 'instalment' | 'ole', ... }
    SUNTRIP_SHOP.live = () => this.live;
    if (SUNTRIP_SHOP.group) SUNTRIP_SHOP.group.visible = false;
    const shop = this;
    for (const it of this.items) {
      const w = SUNTRIP_SHOP.wares[it.id];
      if (!w) continue;
      game.addInteractable({
        id: `butik:${it.id}`, x: w.x, z: w.z, r: cfg.r,
        get prompt() { return shop.prompt(it); },
        enabled: () => this.canUse(),
        use: () => this.use(it),
      });
    }
    const b = SUNTRIP_SHOP.wares.bag;
    if (b) game.addInteractable({ id: 'butik:bag', x: b.x, z: b.z, r: cfg.r, prompt: cfg.prompt.bag, enabled: () => this.canUse() && this.bagWaiting, use: () => this.takeBag() });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get bagWaiting() { return this.owned.has('hatt') && !this.bag; }
  get counter() { return landmarks.butik; }
  canUse() {
    const g = this.g, p = g.player;
    return this.live && !g.inDialog && !g.playerCar && p.state === 'normal' && !g.carrying && !!this.clerk?.root.visible;
  }

  prompt(it) {
    const P = this.cfg.prompt;
    if (this.owned.has(it.id)) return fill(this.off.has(it.id) ? P.on : P.off, { name: it.the ?? it.name });
    return fill(it.base ? P.buy : P.free, { name: it.name, n: it.base });
  }

  // The layer over his outfit: the looks of what he wears, in item order (main.js setPlayerOutfit).
  dress(def, name) {
    if (!this.worn || name === 'rio') return def;
    const out = { ...def };
    for (const it of this.items) if (this.worn.split(' ').includes(it.id)) Object.assign(out, it.look);
    return out;
  }
  wanted() {
    const g = this.g;
    if (!this.live || g.player.outfit === 'rio') return '';
    return this.items.filter((it) => this.owned.has(it.id) && !this.off.has(it.id)).map((it) => it.id).join(' ');
  }
  // On foot (or seated in a scene) the layer follows `wanted` at once; in a car it waits until he is
  // out, so a car seat never holds a model scaled for another head (main.js seat).
  refresh(force = false) {
    const g = this.g, want = this.wanted();
    if (want === this.worn && !force) return;
    if (g.player.car) return;
    this.worn = want;
    g.setPlayerOutfit(g.player.outfit, { persist: false });
  }

  use(it) {
    const g = this.g, c = this.cfg, p = g.player, k = this.clerk;
    if (k) p.yaw = yawTo(k.x - p.x, k.z - p.z);
    if (this.owned.has(it.id)) {
      if (this.off.has(it.id)) this.off.delete(it.id); else this.off.add(it.id);
      if (it.id === 'hatt') this.oleDue = !this.off.has('hatt');
      audio.pickup();
      this.refresh();
      g.save();
      this.last = { kind: 'toggle', id: it.id, on: !this.off.has(it.id), t: g.time };
      return;
    }
    const sum = total(it), now = it.trapp ? Math.ceil(sum / c.trapp.parts) : sum;
    if (g.coins < now) {
      this.clerkSay(g.coins < c.poorBelow ? c.poor : fill(c.short, { n: sum }));
      this.last = { kind: 'short', id: it.id, need: now, coins: g.coins, t: g.time };
      return;
    }
    g.addCoins(-now);
    audio.coin();
    this.owned.add(it.id);
    this.off.delete(it.id);
    if (it.trapp) { this.trapp = c.trapp.parts - 1; this.trappT = 0; this.bag = false; this.near = true; }
    if (it.id === 'hatt') this.oleDue = true;
    this.refresh();
    g.save();
    // The receipt: its lines one by one, the total last; Stig's sigh after the total.
    const lines = [`${it.receipt} ${it.base}`, ...it.add.map(([n, v]) => `+ ${n} ${v}`), `= <b>${sum} pta</b>`];
    if (it.trapp) lines.push(fill(c.receiptTrapp, { n: now, k: c.trapp.parts - 1 }));
    const html = `<div class="receipt"><b>${c.receiptHead}</b>${lines.map((l, i) => `<span style="animation-delay:${(i * c.lineSecs).toFixed(2)}s">${l}</span>`).join('')}</div>`;
    hud.toast(html, 'receipt', c.toastSecs);
    this.clerkSay(it.sell, c.sellSecs);
    const sumAt = (it.add.length + 1) * c.lineSecs;
    this.later(sumAt, () => audio.pling());
    this.later(sumAt + c.sighAt, () => { if (!g.inDialog) g.say(p, it.sigh, c.sighSecs); });
    this.last = { kind: 'buy', id: it.id, total: sum, paid: now, lines: lines.length, t: g.time };
  }

  takeBag() {
    const g = this.g;
    this.bag = true;
    audio.pickup();
    g.say(g.player, this.cfg.bagTaken, 2.2);
    g.save();
    this.last = { kind: 'bag', t: g.time };
  }

  clerkSay(text, secs = 2.4) {
    const k = this.clerk;
    if (!k || !k.root.visible) return;
    this.g.say(k, text, secs);
  }

  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }

  showClerk() {
    const g = this.g, s = SUNTRIP_SHOP.clerk;
    if (!s) return;
    if (!this.clerk) {
      this.clerk = new Character(this.cfg.clerk, { x: s.x, z: s.z });
      this.clerk.key = 'resesaljare';
      g.scene.add(this.clerk.root);
    }
    const k = this.clerk;
    k.state = 'normal';
    k.teleport(s.x, s.z, s.yaw);
    k.vx = k.vz = 0;
    k.root.visible = true;
  }
  hideClerk() {
    const k = this.clerk;
    if (!k || !k.root.visible) return;
    this.g.unsay(k);
    k.anim.yell = k.anim.wave = k.anim.talk = false;
    k.state = 'hidden';
    k.root.visible = false;
  }

  update(dt) {
    const g = this.g, c = this.cfg, live = this.live;
    if (SUNTRIP_SHOP.group && SUNTRIP_SHOP.group.visible !== live) SUNTRIP_SHOP.group.visible = live;
    if (SUNTRIP_SHOP.bag) SUNTRIP_SHOP.bag.visible = live && this.bagWaiting;
    if (!live) {
      if (this.queue.length) this.queue.length = 0;
      this.hideClerk();
      this.refresh();
      return;
    }
    if (!this.clerk?.root.visible) this.showClerk();
    this.refresh();
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      q.fn();
    }
    const k = this.clerk, f = g.focus(), at = this.counter, d = dist(f.x, f.z, at.x, at.z);
    // The clerk turns to him within 10 m, else back to the street; his mouth goes with his bubble.
    if (k) {
      const want = d < 10 && !g.inDialog ? yawTo(f.x - k.x, f.z - k.z) : SUNTRIP_SHOP.clerk.yaw;
      k.yaw = dampAngle(k.yaw, want, 4, dt);
      k.anim.talk = g.saying(k);
      if (k.anim.yell && !g.saying(k)) k.anim.yell = false;
      k.sync(dt);
    }
    if (g.inDialog) return;
    if (!this.greeted && d < c.greetR && !g.playerCar) { this.greeted = true; this.clerkSay(c.greet, 2.6); }
    // "Paketet!": walking (or driving) off with the bag still by the counter.
    if (d < c.backR) this.near = true;
    else if (this.near && d > c.leaveR && this.bagWaiting) {
      this.near = false;
      this.clerkSay(c.paketet, 2);
      if (k) k.anim.yell = true;
      this.last = { kind: 'paketet', t: g.time, d };
    }
    // The Trapp Trull account's instalments: free-roam time, the purse must hold one.
    if (this.trapp > 0) {
      this.trappT += dt;
      if (this.trappT >= c.trapp.every) {
        const hat = this.items.find((it) => it.trapp), n = Math.ceil(total(hat) / c.trapp.parts);
        if (g.coins >= n) {
          g.addCoins(-n);
          audio.coin();
          const i = c.trapp.parts - this.trapp + 1;
          this.trapp--;
          this.trappT = 0;
          hud.toast(fill(c.instalment, { i, k: c.trapp.parts, n }) + (this.trapp ? '' : `<br>${c.instalmentLast}`));
          g.save();
          this.last = { kind: 'instalment', i, n, t: g.time };
        } else this.trappT = c.trapp.every - c.trapp.retry;
      }
    }
    // Ole sees the new hat (bought or put on again at the counter).
    if (this.oleDue && this.worn.split(' ').includes('hatt')) {
      const o = g.npc('ole'), p = g.player;
      if (o && o.root.visible && g.honk.free('ole') && !o.busy && !o.car && !g.saying(o) && dist(o.x, o.z, p.x, p.z) < c.oleR) {
        this.oleDue = false;
        g.say(o, c.ole, 3);
        o.chatT = 8 + Math.random() * 4;
        this.last = { kind: 'ole', t: g.time };
      }
    }
  }

  saveData() {
    return { owned: [...this.owned], off: [...this.off], trapp: this.trapp, trappT: Math.round(this.trappT), bag: this.bag };
  }
  loadData(s) {
    if (!s) return;
    const ids = this.items.map((it) => it.id);
    this.owned = new Set((s.owned || []).filter((id) => ids.includes(id)));
    this.off = new Set((s.off || []).filter((id) => this.owned.has(id)));
    this.trapp = Math.max(0, Math.min(this.cfg.trapp.parts - 1, s.trapp | 0));
    this.trappT = Math.max(0, +s.trappT || 0);
    this.bag = !!s.bag;
  }
}
