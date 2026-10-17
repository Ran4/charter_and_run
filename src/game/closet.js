// Skjortbytet – Guardia letar efter "el de la camisa" (free roam, DESIGN §7.2; feature 36). The
// wardrobe inside room 107's door is the island's second hideout (the METERS.skandal.hideouts entry
// with `outfit`). During a free-roam pursuit, on foot in the hawaii shirt, E there ("Byt till
// kostymen") opens it and Stig changes for `secs` s, frozen, while the officer keeps coming: one who
// reaches him busts him as anywhere else. Done: a white flash, the suit (`setPlayerOutfit(.., {
// persist: false })`: never saved), the pursuit over without a fine, and the officer, who is looking
// for the shirt, walks up onto the patio, looks into the room and walks on past him (`passBy`). Ole
// on the radio forbids the suit as he did in room 107. Back to the shirt at the wardrobe when no one
// is after him ("Byt till hawaiiskjortan"), or at the next mission start (runner.begin). The shout
// "¡Usted! ¡El de la camisa!" only while the shirt shows (`taunts`). Its own cooldown (`t`; the
// porter's and the paint shop's is shame.hideoutT). Owned by Shame as `shame.closet`. Invented
// (§1.6): the hideout, the change and the officer walking past; the lines about the clothes are the
// film's room-107 scene, relocated.

import { landmarks } from '../world/layout.js';
import { segmentBlocked } from '../world/collision.js';
import { worldHooks } from '../world/registry.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { dist, yawTo } from '../util.js';

const WHITE = 'rgba(255,255,255,0.9)';

export class Closet {
  constructor(shame) {
    this.sh = shame;
    this.g = shame.game;
    this.cfg = null;
    this.t = 0;              // s before the wardrobe hides him again
    this.swap = null;        // the change under way: { to, hide, t }
    this.walk = null;        // the officer walking past: { phase, pts, k, t, exit, ... }
    this.last = null;        // tests: { kind: 'hide' | 'back' | 'done' | 'busted' | 'look' | 'reply' | 'gone' | 'giveUp', t }
  }

  // The hideout entry (or null): registers its two E spots, returns their removers (shame.setupHideouts).
  configure(h) {
    this.clear();
    this.cfg = h || null;
    this.t = 0;
    const g = this.g;
    if (!h || !g.addInteractable) return [];
    const pos = () => landmarks[h.at] || null;
    return [
      g.addInteractable({ id: 'hideout:' + h.at, r: h.r, prompt: h.prompt, priority: 100, pos,
        enabled: () => this.canHide(), use: () => this.change(h.outfit.to) }),
      g.addInteractable({ id: 'garderob:' + h.at, r: h.r, prompt: h.back.prompt, pos,
        enabled: () => this.canBack(), use: () => this.change(h.outfit.need) }),
    ];
  }

  get open() { const g = this.g; return !!this.cfg && g.level === 'island' && g.missions.state === 'idle'; }
  // The hawaii shirt shows: worn, and not under SunTrip-butiken's dotted shirt (§10.23).
  get shirt() {
    const g = this.g, o = this.cfg?.outfit;
    return !!o && g.player.outfit === o.need && !(g.shop?.worn || '').split(' ').includes(o.cover);
  }
  free() {
    const g = this.g, p = g.player;
    return this.open && !this.swap && !g.inDialog && !g.playerCar && !g.carrying && p.state === 'normal'
      && !(g.frozenT > 0) && !(this.sh.panicT > 0);
  }
  canHide() { return this.sh.pursuit && this.t <= 0 && this.shirt && this.free(); }
  canBack() {
    const g = this.g, o = this.cfg.outfit;
    return !this.sh.pursuit && !this.walk && g.player.outfit === o.to && g.islandOutfit === o.need && this.free();
  }

  // The officers' shouts: the one about the shirt only while it shows.
  taunts(list) { return this.cfg?.taunt && !this.shirt ? list.filter((t) => t !== this.cfg.taunt) : list; }

  markers() {
    const l = this.cfg && landmarks[this.cfg.at];
    return l && this.canHide() ? [{ type: 'friend', x: l.x, z: l.z, edge: true }] : [];
  }

  // E at the wardrobe: open, `to` on the hanger, Stig frozen in front of it for the change.
  change(to) {
    const g = this.g, c = this.cfg, p = g.player, l = landmarks[c.at];
    const hide = to === c.outfit.to, s = hide ? c : c.back;
    if (hide && !this.sh.pursuit) return;
    p.yaw = l.yaw;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    g.frozenT = Math.max(g.frozenT, s.secs);
    this.swap = { to, hide, t: s.secs };
    worldHooks.wardrobe?.(to);
    audio.door();
    audio.sweep(0.6, 0.05, 500, 1600, 'bandpass', 1.4, 0.5);   // the rustle of clothes
    if (s.line) g.say(p, s.line, 2.4);
    this.last = { kind: hide ? 'hide' : 'back', t: g.time };
  }

  // Busted in the middle of it (shame.busted): the doors shut on the suit, the shirt stays on.
  onBusted() {
    if (!this.swap) return;
    this.swap = null;
    worldHooks.wardrobe?.(null);
    this.last = { kind: 'busted', t: this.g.time };
  }
  // A new pursuit: the officer walking past is the chaser again.
  onPursuit() { this.endScene(); this.walk = null; }

  done(w) {
    const g = this.g, c = this.cfg, sh = this.sh, p = g.player, o = c.outfit;
    this.swap = null;
    hud.flashColor(WHITE);
    g.setPlayerOutfit(w.to, { persist: false });
    worldHooks.wardrobe?.(w.hide ? o.need : o.to);   // what he took off hangs there now
    g.wait(c.shutSecs).then(() => { if (!this.swap) { worldHooks.wardrobe?.(null); audio.door(); } });
    this.last = { kind: 'done', to: w.to, t: g.time };
    if (!w.hide) {
      g.wait(c.back.radioAt).then(() => { if (this.open) g.radio(c.back.radio[0], c.back.radio[1]); });
      return;
    }
    this.t = c.cooldown;
    // Escaped while he changed (the meter ran down): the suit and nothing more.
    if (!sh.pursuit) return;
    // He faces out of the room (the patio's way), the camera with him, to see who comes.
    p.yaw = g.cam.yaw = landmarks[c.passBy.at].yaw;
    const of = sh.officer, from = of && of.state !== 'hidden' ? { x: of.x, z: of.z, yaw: of.yaw } : null;
    sh.v = 0;
    sh.endPursuit(true);
    this.bannerEnd = g.time + c.bannerAt + 2.6;
    g.wait(c.bannerAt).then(() => {
      if (sh.pursuit || !this.open) return;
      hud.showBanner(c.banner[0], c.banner[1], 'good', 2600);
      audio.jingle('complete');
    });
    this.passBy(from);
  }

  // The officer comes up to the patio: from where he is, if he can see its spot or the walk in front
  // of it within `reach` m, else from the end of that walk out of the camera's view; and on past him
  // to the other end.
  passBy(from) {
    const g = this.g, sh = this.sh, c = this.cfg.passBy;
    const at = (d) => g.lmOffset(c.at, d[0], d[1]);
    const look = at(c.look), front = at(c.front), ends = c.ends.map(at);
    const sees = (q) => segmentBlocked(from.x, from.z, q.x, q.z, 0.65) < 0;
    let start = from, pts = [front, look];
    if (from && dist(from.x, from.z, look.x, look.z) < c.reach && sees(look)) pts = [look];
    else if (!from || dist(from.x, from.z, front.x, front.z) > c.reach || !sees(front)) start = ends.find((e) => !sh.inView(e)) || ends[0];
    const o = sh.ensureOfficer(start.x, start.z);
    o.yaw = start === from ? from.yaw : yawTo(front.x - start.x, front.z - start.z);
    o.wishX = o.wishZ = 0;
    o.anim.look = 0;
    sh.officerLinger = 0;
    const exit = ends.reduce((a, b) => (dist(b.x, b.z, start.x, start.z) > dist(a.x, a.z, start.x, start.z) ? b : a));
    this.walk = { phase: 'come', pts, k: 0, t: 0, exit, front, look, chkT: 0, chkX: o.x, chkZ: o.z, from: start === from ? 'him' : 'end' };
  }

  update(dt) {
    if (!this.cfg) return;
    this.t = Math.max(0, this.t - dt);
    if (!this.open) { if (this.swap || this.walk) this.clear(); return; }
    if (this.swap) {
      this.swap.t -= dt;
      if (this.swap.t <= 0) this.done(this.swap);
    }
    if (this.walk) this.tickWalk(dt);
  }

  tickWalk(dt) {
    const g = this.g, sh = this.sh, c = this.cfg.passBy, w = this.walk, o = sh.officer;
    if (sh.pursuit || !o || o.state === 'hidden') { this.endScene(); this.walk = null; return; }
    w.t += dt;
    if (w.phase === 'look') {
      o.wishX = o.wishZ = 0;
      o.yaw = w.yaw;
      const p = g.player;
      // He waits for the banner (drawn over bubbles), then looks round for the shirt. With Stig
      // within `replyR` m, on foot, a short scene from the patio (`cam`): Stig stands stiff in his
      // suit and greets him.
      if (!w.said) {
        if (g.time < this.bannerEnd || g.inDialog) { o.step(dt, g); o.sync(dt); return; }
        w.said = true; w.t = 0;
        if (!g.playerCar && p.state === 'normal' && dist(p.x, p.z, o.x, o.z) < c.replyR) {
          w.scene = true;
          p.wishX = p.wishZ = p.vx = p.vz = 0;
          g.cinematic(o, p);
          g.cutTo(c.cam);
        }
        g.say(o, c.line, 2.4);
        this.last = { kind: 'look', scene: !!w.scene, t: g.time };
      }
      o.anim.look = Math.sin(w.t * 2.4) * 0.6;
      if (w.scene && !w.replied && w.t >= c.replyAt) {
        w.replied = true;
        p.yaw = yawTo(o.x - p.x, o.z - p.z);
        g.say(p, c.reply, 1.6);
        this.last = { kind: 'reply', t: g.time };
      }
      if (w.t >= c.lookSecs) {
        o.anim.look = 0;
        this.endScene();
        w.phase = 'leave'; w.t = 0; w.k = 0; w.pts = [w.front, w.exit];
      }
      o.step(dt, g);
      o.sync(dt);
      return;
    }
    if (w.phase === 'leave' && !w.radio && w.t >= c.radioAt) this.radio();
    const tgt = w.pts[w.k];
    let dx = tgt.x - o.x, dz = tgt.z - o.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.45) {
      w.k++;
      if (w.k >= w.pts.length) {
        if (w.phase === 'come') this.startLook(); else this.gone('gone');
        return;
      }
    }
    // Running while far, walking the last `slowR` m and on past him.
    const left = d + (w.k + 1 < w.pts.length ? dist(tgt.x, tgt.z, w.pts[w.pts.length - 1].x, w.pts[w.pts.length - 1].z) : 0);
    const sp = w.phase === 'come' && left > c.slowR ? c.run : c.walk;
    dx /= d || 1; dz /= d || 1;
    o.wishX = dx * sp; o.wishZ = dz * sp;
    o.step(dt, g);
    o.sync(dt);
    // Stuck (under 0.3 m in 1.5 s) or too long on the way: he gives up.
    w.chkT += dt;
    if (w.chkT >= 1.5) {
      const moved = Math.hypot(o.x - w.chkX, o.z - w.chkZ);
      w.chkT = 0; w.chkX = o.x; w.chkZ = o.z;
      if (moved < 0.3) {
        // Held up short of the patio (Stig in the way): he looks from there.
        if (w.phase === 'come' && dist(o.x, o.z, w.look.x, w.look.z) < 2.5) this.startLook(); else this.gone('giveUp');
        return;
      }
    }
    if (w.t > (w.phase === 'come' ? c.comeSecs : c.leaveSecs)) this.gone(w.phase === 'come' ? 'giveUp' : 'gone');
  }

  startLook() {
    const w = this.walk, o = this.sh.officer;
    w.phase = 'look'; w.t = 0;
    w.yaw = yawTo(w.look.x - w.front.x, w.look.z - w.front.z);
    o.wishX = o.wishZ = 0;
  }

  endScene() {
    const g = this.g;
    if (!this.walk?.scene) return;
    this.walk.scene = false;
    g.endCut();
    g.endCinematic();
  }

  radio() {
    const c = this.cfg;
    if (this.walk) this.walk.radio = true;
    this.g.radio(c.radio[0], c.radio[1]);
  }

  // The walk is over: he is out of sight (Ole has his say if he has not yet).
  gone(kind) {
    const w = this.walk;
    if (w && !w.radio) this.radio();
    this.endScene();
    this.walk = null;
    this.sh.hideOfficer();
    this.last = { kind, t: this.g.time };
  }

  clear() {
    this.endScene();
    if (this.walk && !this.sh.pursuit) this.sh.hideOfficer();
    this.walk = null;
    this.swap = null;
    worldHooks.wardrobe?.(null);
  }
}
