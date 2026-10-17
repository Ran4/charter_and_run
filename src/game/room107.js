// Rum 107 fylls med resans minnen (free roam; feature 38, DESIGN §10.25). What the collectibles find
// comes home to Stig and Ole's room on Hotel Flamenco's ground floor by itself: Ole's gadgets on the
// shelf over the print, the trodden fins flat in a pile by Stig's bed, and after julafton the
// suitcase, the plastic giraffe and the SPORT-KNÄCKE pack (world/blocks/hotels.js roomKeepsakes,
// shown through worldHooks.rum107: main.js `dressRoom107` at a pickup, an unlock and a load). Here
// are the room's three E spots, on foot on the island with no mission running
// (`missions.state === 'idle'`):
//  - the shelf: Stig checks it as the G17 he is ("Kontrollerad av G17.", or "Inget att kontrollera."
//    with nothing found), the collect card counts the gadgets and the fins, and Ole on the radio
//    counts his gadgets in bokmål;
//  - the plastic giraffe on Stig's bed (after julafton): he holds it up, "Precis en sån har jag
//    önskat mig.", and puts it back with E, after a while, or when he walks off;
//  - Ole's boombox (after the samba unlock, while the samba is not playing): the island tune to samba
//    (the pause menu's Musik, main.js setIslandTune), and Ole's "Ja, det er fint! Samba!".
// Config: RUM107 (content/island.js). Owned by Game as `room107`; main.js calls `update` once a frame.

import { RUM107, COLLECTIBLES } from '../content/index.js';
import { ROOM107 } from '../world/blocks/hotels.js';
import { lm } from '../world/layout.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt } from '../strings.js';
import { dist, yawTo } from '../util.js';

export class Room107 {
  constructor(game, cfg = RUM107) {
    this.g = game;
    this.cfg = cfg;
    this.world = ROOM107;      // tests: the keepsakes' meshes
    this.holdT = 0;            // s left with the giraffe in his hand
    this.restT = 0;            // s before the shelf can be checked again
    this.queue = [];           // [{ at, fn }] (g.time)
    this.wasLive = false;
    this.last = null;          // tests: the last use { what, ... }
    const spot = (k) => () => lm(cfg[k].lm);
    game.addInteractable({
      id: 'rum107:hylla', r: cfg.shelf.r, prompt: cfg.shelf.prompt, pos: spot('shelf'),
      enabled: () => this.canUse() && this.restT <= 0,
      use: () => this.shelf(),
    });
    // With the giraffe in his hand E puts it back, as far off as the hold lasts, over the nap's prompt
    // beside the bed and a giver's talk.
    const self = this;
    game.addInteractable({
      id: 'rum107:giraff', pos: spot('giraffe'),
      get r() { return self.holdT > 0 ? cfg.giraffe.dropR : cfg.giraffe.r; },
      get priority() { return self.holdT > 0 ? 100 : 0; },
      get prompt() { return self.holdT > 0 ? cfg.giraffe.putBack : cfg.giraffe.prompt; },
      enabled: () => this.canUse() && this.g.unlocked.has('bodega'),
      use: () => (this.holdT > 0 ? this.hold(false) : this.giraffe()),
    });
    game.addInteractable({
      id: 'rum107:radio', r: cfg.radio.r, prompt: cfg.radio.prompt, pos: spot('radio'),
      enabled: () => this.canUse() && this.g.unlocked.has('samba') && !this.samba,
      use: () => this.radio(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get samba() { return this.g.islandTune === 'samba' && audio.musicOn; }
  // On foot, standing, free (as the G17 toasters').
  canUse() {
    const g = this.g, p = g.player;
    return this.live && !g.inDialog && !g.playerCar && !g.carrying && p.state === 'normal' && !(g.frozenT > 0)
      && !(g.shame.panicT > 0) && !g.shame.pursuit && !g.fest.joined && !g.belt.seated;
  }
  face(name) { const p = this.g.player, l = lm(name); p.yaw = l.yaw; p.wishX = p.wishZ = p.vx = p.vz = 0; }

  shelf() {
    const g = this.g, c = this.cfg.shelf, n = g.collected.prylar.size, m = g.collected.fenor.size;
    this.face(c.lm);
    this.restT = c.gap;
    g.say(g.player, n + m ? c.line : c.empty, 2.4);
    const count = (k) => { const s = COLLECTIBLES[k]; return `<span class="${s.icon}"></span> ${s.label} <b>${g.collected[k].size}/${s.items.length}</b>`; };
    hud.showCollect(`${count('prylar')} · ${count('fenor')}`);
    const ole = n === 0 ? c.none : n >= COLLECTIBLES.prylar.items.length ? c.full : fmt(c.count, { n: c.nums[n] });
    this.later(c.oleAt, () => g.radio('ole', ole));
    this.last = { what: 'shelf', prylar: n, fenor: m, ole };
  }

  giraffe() {
    const g = this.g, c = this.cfg.giraffe, p = g.player, it = ROOM107.after.giraff;
    if (it) p.yaw = yawTo(it.position.x - p.x, it.position.z - p.z);
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    this.hold(true);
    g.say(p, c.line, 2.6);
    this.last = { what: 'giraffe' };
  }
  // The giraffe in his hand (anim `giraffe`) and gone from the bed, or back on the bed.
  hold(on) {
    const g = this.g;
    this.holdT = on ? this.cfg.giraffe.holdSecs : 0;
    g.player.anim.giraffe = on;
    ROOM107.held = on ? 'giraff' : null;
    g.dressRoom107();
  }

  radio() {
    const g = this.g, c = this.cfg.radio;
    this.face(c.lm);
    if (!audio.musicOn) audio.setMusic(true);
    g.setIslandTune('samba');
    g.radio('ole', c.line);
    this.last = { what: 'radio', tune: g.islandTune };
  }

  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }

  update(dt) {
    const g = this.g;
    if (!this.live) {
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
    if (this.holdT > 0) {
      const p = g.player, l = lm(this.cfg.giraffe.lm);
      this.holdT -= dt;
      if (this.holdT <= 0 || !this.canUse() || dist(p.x, p.z, l.x, l.z) > this.cfg.giraffe.dropR) this.hold(false);
    }
  }

  // A mission start or the other level: the giraffe back on the bed, Ole's count dropped.
  reset() {
    if (this.holdT > 0 || ROOM107.held) this.hold(false);
    this.queue = [];
    this.restT = 0;
  }
}
