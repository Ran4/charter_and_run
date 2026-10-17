// Pesetas på marknadstaken (free roam, DESIGN §10.46; feature 92): the coin trail over the market's
// awnings from the second ¡SALTA! bounce shade to the donkey stand's roof (world/blocks/centre.js
// `MARKET`), the souvenir seller's "¡No, no, no!" at Stig up on his roof, and after asnan the roof's own
// four coins and his swear when Stig takes the last of them. Owned by Game as `awnings`; main.js hands it
// every coin taken (`onCoin`, from collectCoin).
import { MARKNADSTAK } from '../content/index.js';
import { MARKET } from '../world/blocks/centre.js';
import { groundAt, groundInfo } from '../world/collision.js';
import { placeCoin } from '../actors/pickups.js';
import { dist } from '../util.js';

const TAG = 'asnetak';

export class MarketRoofs {
  constructor(game, cfg = MARKNADSTAK) {
    this.g = game;
    this.cfg = cfg;
    this.roofCoins = null;   // the roof's coins once placed (after asnan, once a session)
    this.left = 0;           // of them not yet taken
    this.on = false;         // Stig on the roof this visit (a visit ends when he stands on anything else)
    this.noT = -Infinity;    // g.time of the seller's last "¡No, no, no!"
    this.queue = [];         // [{ at, fn }] (g.time)
    this.yellT = 0;          // s the seller's yell pose has left
    this.counts = { visits: 0, no: 0, swear: 0, sorry: 0 };   // tests
    this.last = null;        // tests: { kind: 'no' | 'lastCoin' | 'swear' | 'sorry', t, … }
    for (const [x, y, z] of MARKET.coins) placeCoin(x, y, z, null, cfg.minY);
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get roofUp() { return this.left > 0; }

  // The souvenir seller, standing at his stand and free (the horn's rule, and no free-roam pose), within
  // r m of Stig; otherwise null.
  seller(r) {
    const g = this.g, s = g.npc('souvenir'), p = g.player;
    if (!s || !g.honk.free('souvenir') || g.npcPosed('souvenir')) return null;
    return dist(s.x, s.z, p.x, p.z) <= r ? s : null;
  }

  // The block Stig stands on: null on the bare ground, a car's roof, in a car or knocked over;
  // undefined in the air (a jump on the roof goes on with the visit).
  under() {
    const g = this.g, p = g.player;
    if (g.playerCar || p.state !== 'normal' || p.standingOn) return null;
    if (!p.onGround) return undefined;
    groundAt(p.x, p.z, p.y, 0.05);
    return groundInfo.block;
  }

  // collectCoin: a coin taken. The last of the roof's, with Stig up there, brings the swear.
  onCoin(c) {
    if (c.tag !== TAG || !this.left) return;
    this.left--;
    if (this.left) return;
    const g = this.g, k = this.cfg, p = g.player;
    const s = this.live && !g.inDialog && p.y > k.highY ? this.seller(k.swearR) : null;
    this.last = { kind: 'lastCoin', t: g.time, y: +p.y.toFixed(2), seller: !!s };
    if (s) this.later(k.swearAt, () => this.swear());
  }

  swear() {
    const g = this.g, k = this.cfg, s = this.seller(k.swearR + 3), p = g.player;
    if (!s) return;
    g.say(s, k.swearLine, k.swearSecs);
    s.chatT = 7 + Math.random() * 6;
    s.anim.yell = true;
    this.yellT = k.swearSecs;
    this.counts.swear++;
    this.last = { kind: 'swear', t: g.time, d: +dist(s.x, s.z, p.x, p.z).toFixed(2) };
    this.later(k.sorryAt, () => {
      if (g.saying(p)) return;
      g.say(p, k.sorry, k.sorrySecs);
      this.counts.sorry++;
      this.last = { kind: 'sorry', t: g.time };
    });
  }

  // Stig on the roof for the first time this visit: the seller's no, unless the roof's coins are up
  // (then the swear is coming).
  arrive() {
    const g = this.g, k = this.cfg, p = g.player;
    this.counts.visits++;
    if (this.roofUp || g.time - this.noT < k.noGap) return;
    const s = this.seller(k.noR);   // over his chatter, as the swear is
    if (!s) return;
    this.noT = g.time;
    g.say(s, k.no, k.noSecs);
    s.chatT = 7 + Math.random() * 6;
    this.counts.no++;
    this.last = { kind: 'no', t: g.time, d: +dist(s.x, s.z, p.x, p.z).toFixed(2) };
  }

  placeRoof() {
    const k = this.cfg;
    this.roofCoins = MARKET.roofCoins.map(([x, y, z]) => placeCoin(x, y, z, TAG, k.minY)).filter(Boolean);
    this.left = this.roofCoins.length;
  }

  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }

  update(dt) {
    const g = this.g, k = this.cfg, p = g.player;
    if (!this.live || !MARKET.roof) { this.reset(); return; }
    if (!this.roofCoins && g.missions.index >= k.from) {
      const r = MARKET.roof, cx = (r.minX + r.maxX) / 2, cz = (r.minZ + r.maxZ) / 2;
      if (dist(p.x, p.z, cx, cz) >= k.placeR) this.placeRoof();
    }
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      if (!g.inDialog) q.fn();
    }
    if (this.yellT > 0) {
      this.yellT -= dt;
      if (this.yellT <= 0) this.unyell();
    }
    if (g.inDialog) return;
    const b = this.under();
    if (b === MARKET.roof) { if (!this.on) { this.on = true; this.arrive(); } }
    else if (b !== undefined) this.on = false;
  }

  unyell() {
    const s = this.g.npc('souvenir');
    if (s) s.anim.yell = false;
    this.yellT = 0;
  }

  // A mission start or the other level: nothing pending, the seller as he was (the coins stay where they are).
  reset() {
    if (this.queue.length) this.queue.length = 0;
    if (this.yellT > 0) this.unyell();
    this.on = false;
  }
}
