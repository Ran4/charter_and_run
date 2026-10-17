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
//  - Ole's boombox: the pause menu's Musik in the room (main.js setIslandTune; feature 67). Before the
//    samba unlock Ole only answers "Kvarts og digital."; after it E plays the samba, with Ole's "Ja,
//    det er fint! Samba!" or "Hører du? Samba.", and while it plays turns it back to the sol tune;
//  - the wardrobe inside the door (Garderoben, feature 67, §10.36): E changes his free-roam outfit
//    (`islandOutfit`, saved) to the next one hanging there: the suit and the Arlanda coat, the hawaii
//    shirt after buss17, the white Rio jacket after the end. The next on the hanger while he
//    changes, a white flash, then he turns to the shot in his new clothes; Stig's or Ole's line from
//    the film. Not in Skjortbytet's suit (closet.js has its way back) and not in a pursuit; a mission
//    gives him the story's outfit back (main.js islandWear).
// Config: RUM107 (content/island.js). Owned by Game as `room107`; main.js calls `update` once a frame.

import { RUM107, COLLECTIBLES } from '../content/index.js';
import { ROOM107 } from '../world/blocks/hotels.js';
import { lm } from '../world/layout.js';
import { worldHooks } from '../world/registry.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt } from '../strings.js';
import { dist, yawTo } from '../util.js';

const WHITE = 'rgba(255,255,255,0.9)';

export class Room107 {
  constructor(game, cfg = RUM107) {
    this.g = game;
    this.cfg = cfg;
    this.world = ROOM107;      // tests: the keepsakes' meshes
    this.holdT = 0;            // s left with the giraffe in his hand
    this.restT = 0;            // s before the shelf can be checked again
    this.radioT = 0;           // s before the locked boombox answers again
    this.sambas = 0;           // samba starts at the boombox this session (Ole's two lines in turn)
    this.swap = null;          // the wardrobe's change under way: { from, to, t, done, shut, cine }
    this.helanUntil = 0;       // performance.now() until the last change's Helan går has played
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
      id: 'rum107:radio', r: cfg.radio.r, pos: spot('radio'),
      get prompt() { return !self.g.unlocked.has('samba') ? cfg.radio.locked : self.samba ? cfg.radio.off : cfg.radio.prompt; },
      enabled: () => this.canUse() && this.radioT <= 0,
      use: () => this.radio(),
    });
    // In the outfit he picked (in Skjortbytet's suit the way back is closet.js's), between changes.
    game.addInteractable({
      id: 'rum107:garderob', r: cfg.wardrobe.r, prompt: cfg.wardrobe.prompt, pos: spot('wardrobe'),
      enabled: () => this.canUse() && !this.swap && game.player.outfit === game.islandOutfit,
      use: () => this.dress(),
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

  // Locked: Ole's answer and nothing more; the samba on (the music too if it was off), or off again.
  radio() {
    const g = this.g, c = this.cfg.radio;
    this.face(c.lm);
    if (!g.unlocked.has('samba')) {
      this.radioT = c.gap;
      g.radio('ole', c.quartz);
      this.last = { what: 'radio', tune: g.islandTune, line: c.quartz };
      return;
    }
    if (this.samba) {
      g.setIslandTune('sol');
      audio.tick();
      this.last = { what: 'radio', tune: g.islandTune, line: null };
      return;
    }
    if (!audio.musicOn) audio.setMusic(true);
    g.setIslandTune('samba');
    const line = this.sambas++ % 2 ? c.again : c.line;
    g.radio('ole', line);
    this.last = { what: 'radio', tune: g.islandTune, line };
  }

  // The wardrobe (feature 67): what hangs in it at this point of the trip, and E for the next one.
  outfits() { const w = this.cfg.wardrobe; return w.order.filter((o) => this.g.missions.index >= w.from[o]); }
  dress() {
    const g = this.g, w = this.cfg.wardrobe, list = this.outfits(), from = g.islandOutfit;
    const to = list[(list.indexOf(from) + 1) % list.length], q = g.lmOffset(w.lm, w.mark[0], w.mark[1]);
    g.player.teleport(q.x, q.z, q.yaw);   // on his mark under the cut
    this.face(w.lm);
    g.frozenT = Math.max(g.frozenT, w.secs + w.show);
    worldHooks.wardrobe?.(to);
    audio.door();
    audio.sweep(0.6, 0.05, 500, 1600, 'bandpass', 1.4, 0.5);   // the rustle of clothes (closet.js)
    const s = this.shot();
    g.cam.cutTo(s.eye, s.look);
    this.swap = { from, to, t: 0, done: false, shut: false, cine: g.cam.cine };
    this.last = { what: 'wardrobe', from, to, done: false };
  }
  // The shot of the change: the eye and the look in the wardrobe spot's frame.
  shot() {
    const g = this.g, w = this.cfg.wardrobe, l = lm(w.lm), gy = g.groundAt(l.x, l.z);
    const at = ([dx, dz, h]) => { const q = g.lmOffset(w.lm, dx, dz); return { x: q.x, y: gy + h, z: q.z }; };
    return { eye: at(w.shot.eye), look: at(w.shot.look) };
  }
  tickSwap(dt) {
    const g = this.g, w = this.cfg.wardrobe, s = this.swap, p = g.player;
    s.t += dt;
    if (!s.done && s.t >= w.secs) {
      s.done = true;
      hud.flashColor(WHITE);
      g.setPlayerOutfit(s.to);
      worldHooks.wardrobe?.(s.from);   // what he took off hangs there now
      const e = this.shot().eye;
      p.yaw = yawTo(e.x - p.x, e.z - p.z);
      const l = w.lines[s.to] || {};
      if (l.say) g.say(p, l.say, 2.4);
      if (l.radio) this.later(w.radioAt, () => { if (g.player.outfit === s.to) g.radio(l.radio[0], l.radio[1]); });
      // Helan går, as when Ole changes him in buss17's outro; not over the last change's.
      const now = performance.now();
      if (now >= this.helanUntil) this.helanUntil = now + audio.trad('helanGar') * 1000;
      g.save();
      this.last = { what: 'wardrobe', from: s.from, to: s.to, done: true };
    }
    if (s.done && !s.shut && s.t >= w.secs + w.shutSecs) {
      s.shut = true;
      worldHooks.wardrobe?.(null);
      audio.door();
    }
    if (s.t >= w.secs + w.show) this.endSwap();
  }
  // The doors shut and the chase camera back where the shot looked from (his new clothes from the
  // front); the shot is let go only if it is still the camera's (a mission's framing is not).
  endSwap() {
    const g = this.g, s = this.swap;
    this.swap = null;
    if (!s.shut) worldHooks.wardrobe?.(null);
    if (g.cam.cine !== s.cine) return;
    const { eye, look } = this.shot();
    g.cam.release();
    g.cam.yaw = yawTo(look.x - eye.x, look.z - eye.z);
    g.cam.snapNext = true;
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
    this.radioT = Math.max(0, this.radioT - dt);
    if (this.swap) this.tickSwap(dt);
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

  // A mission start or the other level: the giraffe back on the bed, Ole's count dropped, a change
  // broken off (the doors shut, its freeze off; the mission puts the story's outfit on).
  reset() {
    if (this.holdT > 0 || ROOM107.held) this.hold(false);
    if (this.swap) { this.endSwap(); this.g.frozenT = 0; }
    this.queue = [];
    this.restT = 0;
    this.radioT = 0;
  }
}
