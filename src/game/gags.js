// Gags på E – Ole's flash and Angerud's Viking special (free roam; feature 47, DESIGN §10.32).
// Hit & Run's gags: E on something in the world plays a short film scene. At Ole's camera bag on the
// patio wall under Hotel Flamenco's pergola, Ole shows his second camera ("Kamera to – japansk,
// liten, motor…"), sniffs at Stig's ("Gammelt…" / "Fast det är blixt.") and takes his picture: "Si
// omelett!" and the flash. Under the lamp beside Viking Bar's door Angerud orders another Viking
// special and Stig a juice, and while Carmencita fetches them Stig holds his cup up under the lamp, as
// under the call button on the plane ("Om man vill ha lite mer juice…?"); Angerud does not even look
// up. In the dialogue box with the letterbox and fixed shots, like the paint shop's scene
// (paintshop.js). Only on the island with no mission running (`missions.state === 'idle'`); a scene
// holds everything (`inDialog`), and afterwards only the people it moved are put back. The first time
// a gag pays and counts on the Gags row. No mission, timer or calibration pool sees any of it.
// Config: GAGS (content/island.js). Owned by Game as `gags`: main.js saves and loads `done`
// (`saveData`/`loadData`), shows the count in the big map's legend and asks `posed(key)` in npcPosed.

import { GAGS } from '../content/index.js';
import { THREE } from '../gfx.js';
import { lm } from '../world/layout.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { dist } from '../util.js';

const _v = new THREE.Vector3();

export class Gags {
  constructor(game, cfg = GAGS) {
    this.g = game;
    this.cfg = cfg;
    this.done = new Set();       // ids of the gags played at least once (saved `gags`)
    this.run = null;             // the scene under way: { gag, held: { key: where they stood }, poses: [[ch, flag]] }
    this.restUntil = -Infinity;  // g.time before which no gag starts again
    this.last = null;            // tests: { id, t, first, lines: [[who, text]], shots: [key], ended }
    for (const gag of cfg.list) {
      game.addInteractable({
        id: 'gag:' + gag.id, r: cfg.r, prompt: gag.prompt,
        pos: () => lm(gag.lm),
        enabled: () => this.canPlay(gag),
        use: () => this.play(gag),
      });
    }
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get total() { return this.cfg.list.length; }
  get count() { return this.cfg.list.filter((x) => this.done.has(x.id)).length; }
  // One of the people a scene holds (main.npcPosed: no wave, turn or chatter, and the other modules
  // leave them be).
  posed(key) { return !!this.run?.held[key]; }

  saveData() { return [...this.done]; }
  loadData(ids) { this.done = new Set((ids || []).filter((id) => this.cfg.list.some((x) => x.id === id))); }

  // Free to be in a gag: shown and standing, nobody's (not `busy`: at home or the waiting mission's
  // place), walked or posed by no module, in no car or seat, within `needR` m of the gag.
  free(key, gag) {
    const g = this.g, n = g.npc(key), l = lm(gag.lm);
    return !!n && n.state === 'normal' && n.root.visible && !n.busy && !n.car && !n.seatId && !n.steer
      && !g.npcPosed(key) && g.honk.free(key) && dist(n.x, n.z, l.x, l.z) < this.cfg.needR;
  }
  // Stig on foot and on the ground, in no scene, pursuit, bust, PANIK or other free-roam hold.
  canPlay(gag) {
    const g = this.g, p = g.player;
    return this.live && !this.run && g.time >= this.restUntil && !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying
      && p.state === 'normal' && p.onGround && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active
      && gag.needs.every((k) => this.free(k, gag));
  }

  // E: the scene, line by line (each line its own dialogue, so that its `do` can change the shot, the
  // marks and the poses as it starts; the box goes on in the same frame).
  async play(gag) {
    const g = this.g;
    if (!this.canPlay(gag)) return;
    const keys = Object.keys(gag.marks).filter((k) => k !== 'stig');
    const run = this.run = { gag, held: {}, poses: [] };
    for (const k of keys) { const n = g.npc(k); run.held[k] = { x: n.x, z: n.z, yaw: n.yaw, busy: n.busy, spot: n.spot }; }
    const first = !this.done.has(gag.id);
    this.last = { id: gag.id, t: g.time, first, lines: [], shots: [], ended: null };
    for (const k of ['stig', ...keys]) g.unsay(g.npc(k));
    try {
      this.mark(gag, gag.marks);
      g.cinematic(g.player, g.npc(keys[0]));   // the letterbox and inDialog; the shot replaces its framing
      this.shoot(gag, gag.shot);
      for (const [who, text, o] of gag.lines) {
        if (o) this.direct(gag, o);
        this.last.lines.push([who, text]);
        await g.dialog([[who, text]]);
        g.inDialog = true;
      }
      if (gag.end) this.finale(gag.end);
      await g.wait(gag.hold);
    } finally {
      this.close(gag, first);
    }
  }

  direct(gag, o) {
    const g = this.g;
    for (const k of o.hide || []) g.hideNpc(k);   // gone in (Carmencita for the drinks); put back after
    if (o.marks) this.mark(gag, o.marks);
    for (const [k, f] of Object.entries(o.pose || {})) this.pose(k, f);
    if (o.shot) this.shoot(gag, o.shot);
  }
  // The people to their marks: landmark-relative [dx (left), dz (forward), absolute world yaw].
  mark(gag, marks) {
    const g = this.g;
    for (const [k, [dx, dz, yaw]] of Object.entries(marks)) {
      if (k !== 'stig') { g.placeNpc(k, gag.lm, dx, dz, yaw); continue; }
      const q = g.lmOffset(gag.lm, dx, dz), p = g.player;
      p.teleport(q.x, q.z, yaw);
      p.wishX = p.wishZ = 0;
    }
  }
  // `who`'s pose for the rest of the scene: an anim flag, a list of them, or null (none).
  pose(key, flags) {
    const ch = this.g.npc(key), r = this.run;
    for (const [c, f] of r.poses) if (c === ch) c.anim[f] = false;
    r.poses = r.poses.filter(([c]) => c !== ch);
    for (const f of [flags].flat().filter(Boolean)) { ch.anim[f] = true; r.poses.push([ch, f]); }
  }
  // A fixed shot: the eye and the look landmark-relative, [dx, dz, height over the ground].
  shoot(gag, key) {
    const g = this.g, [eye, look] = gag.shots[key], l = lm(gag.lm), gy = g.groundAt(l.x, l.z);
    const at = (a) => { const q = g.lmOffset(gag.lm, a[0], a[1]); return { x: q.x, y: gy + a[2], z: q.z }; };
    g.cam.cutTo(at(eye), at(look));
    g.cam.snapNext = true;
    this.last.shots.push(key);
  }
  // After the last line: Ole's flash (the white screen, the shutter and a burst of light at his
  // camera).
  finale(e) {
    const g = this.g;
    g.cue({ flash: e.flash, sfx: e.sfx });
    if (e.sparkle) {
      const ch = g.npc(e.sparkle), cam = ch.model.props?.camera;
      if (cam?.visible) cam.getWorldPosition(_v); else _v.set(ch.x, ch.y + ch.height * 0.85, ch.z);
      fx.sparkle(_v.x, _v.y, _v.z, 0xffffff, 24);
    }
  }

  // The end (also if the scene broke off): poses off, everyone it moved back where they stood, Stig at
  // his `after` mark with the camera behind him, and the first time the pay and the count.
  close(gag, first) {
    const g = this.g, c = this.cfg, r = this.run, p = g.player;
    for (const [ch, f] of r.poses) ch.anim[f] = false;
    for (const [k, w] of Object.entries(r.held)) {
      const n = g.npc(k);
      n.teleport(w.x, w.z, w.yaw);
      n.state = 'normal';
      n.root.visible = true;
      n.busy = w.busy;
      n.spot = w.spot;
    }
    const [dx, dz, yaw] = gag.after, q = g.lmOffset(gag.lm, dx, dz);
    p.teleport(q.x, q.z, yaw);
    g.endCinematic();
    g.cam.yaw = yaw;
    g.cam.snapNext = true;
    this.run = null;
    this.restUntil = g.time + c.rest;
    this.last.ended = g.time;
    if (!first || !this.live) return;
    this.done.add(gag.id);
    g.addCoins(c.pay);
    audio.coin();
    hud.showCollect(`<span class="gag-icon"></span> ${c.label} <b>${this.count}/${this.total}</b>`);
    g.save();
  }
}
