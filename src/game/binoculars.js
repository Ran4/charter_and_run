// Livräddarens kikare (free roam; feature 108, DESIGN §10.48). The lifeguard's binoculars lie on the
// SOCORRISTA tower's south railing on the main beach. On foot up on the platform (landmark `kikare`),
// on the island with no mission running (`missions.state === 'idle'`), E ("E Ta kikaren") stands Stig in
// the middle with them at his eyes, and the screen is theirs: two round glasses, a narrow view at his
// eye (the camera's `scope`, no easing) that the mouse or WASD turn round the whole horizon. Ole has
// warned him about the beach ("Understrømmer, solstikk og haier."), so he scans for danger: eight things
// out there are on his list (the inflatable shark fin inside the buoy line, Herr Storch on the beach
// filming with the lens cap on, the raft, the pedal boats, the ferry, the fishing boat, the lighthouse
// and the towels on the RESERVADO row). Holding the view on one for a moment checks it, pays a few
// pesetas and gives his line under the picture; the list is saved (`records.kikare`). A fin already
// taken counts as found. With all eight he lowers the binoculars: a cut to him from the sand, "Inga
// hajar. Bara svenskar.". E or Q lowers them any time. A mission start or the other level ends a look at
// once (`last.kind` 'gone'), so no mission, timer or calibration pool sees any of it. Config: KIKARE
// (content/island.js). Owned by Game as `kikare`: main.js calls `update` once a frame.

import { KIKARE } from '../content/index.js';
import { lm } from '../world/layout.js';
import { LIGHTHOUSE } from '../world/blocks/coast.js';
import { THREE, GeoBuilder, toonMesh, scene } from '../gfx.js';
import { binoculars } from '../actors/models.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { fmt } from '../strings.js';
import { hud } from './hud.js';
import { clamp, dist, yawTo, dampAngle } from '../util.js';

const DEG = 180 / Math.PI;
const _v = new THREE.Vector3(), _f = new THREE.Vector3();

export class Binoculars {
  constructor(game, cfg = KIKARE) {
    this.g = game;
    this.cfg = cfg;
    this.sc = null;          // the look under way: { t, frame, yaw, pitch, aim, k, line, lineT, news, newT, out }
    this.warned = false;     // Ole's warning said this session (the first look)
    this.storch = null;      // Herr Storch filming the tower while he is watched: { n, yaw, back }
    this.looks = 0;          // tests: looks this session
    this.last = null;        // tests: { kind: id | 'down' | 'done' | 'gone', t, n, all, ended }
    this.build();
    game.addInteractable({
      id: 'kikare', r: cfg.r, prompt: cfg.prompt,
      pos: () => lm(cfg.lm),
      enabled: () => this.canUse(),
      use: () => this.start(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  get busy() { return !!this.sc; }
  get up() { return !!this.sc && !this.sc.out; }
  // The ids found, in the order found (saved).
  get found() { const r = this.g.records; return (r.kikare ||= []); }
  has(id) { return this.found.includes(id); }
  get all() { return this.cfg.targets.every((t) => this.has(t.id)); }
  spot() { return lm(this.cfg.lm); }
  at([dx, dz], y) { const q = this.g.lmOffset(this.cfg.lm, dx, dz); return new THREE.Vector3(q.x, y, q.z); }

  // On foot up on the platform: no scene, car, carry, pursuit, bust, PANIK, pool-fest ring, belt, talk,
  // nap, other free-roam hold or street race.
  canUse() {
    const g = this.g, p = g.player;
    return this.live && !this.sc && !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying
      && p.state === 'normal' && p.onGround && p.y > this.spot().y - 0.3 && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active
      && !g.skis.on && !g.gatlopp.mode && !g.fiske.busy;
  }

  // The pair on the railing (hidden while Stig holds his: the `kikare` prop, the same geometry).
  build() {
    const b = new GeoBuilder();
    binoculars(b);
    this.rest = toonMesh(b.build(), { outline: 0.012 });
    this.rest.scale.setScalar(1.12);   // Stig's scale: the pair he holds is the same size
    const c = this.cfg, s = this.spot();
    this.rest.position.copy(this.at(c.rest, s.y + c.rest[2]));
    this.rest.rotation.y = s.yaw + Math.PI / 2;   // lying along the rail
    scene.add(this.rest);
  }

  // Where a target is now: its points (world), or null when it is not out there.
  points(t) {
    const g = this.g;
    if (t.pts) return t.pts.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    if (t.npc) {
      const n = g.npcs[t.npc];
      return n && n.state !== 'hidden' && n.root.visible ? [new THREE.Vector3(n.x, n.y + t.dy, n.z)] : null;
    }
    if (t.fin) {
      const c = g.collectibles[t.fin[0]]?.find((k) => k.id === t.fin[1]);
      return c?.alive ? [new THREE.Vector3(c.px, c.mesh.position.y + t.dy, c.pz)] : null;
    }
    if (t.tower) return [new THREE.Vector3(LIGHTHOUSE.x, t.dy, LIGHTHOUSE.z)];
    return null;
  }
  // A fin already taken (the Hajfenor set) counts as found, without pay or line.
  takenFins() {
    const g = this.g;
    let n = 0;
    for (const t of this.cfg.targets) {
      if (!t.fin || this.has(t.id) || !g.collected[t.fin[0]]?.has(t.fin[1])) continue;
      this.found.push(t.id);
      n++;
    }
    if (n) g.save();
  }

  // ---------------------------------------------------------------------------------------------
  // E: the binoculars up

  start() {
    if (!this.canUse()) return;
    const g = this.g, c = this.cfg, p = g.player, s = this.spot();
    g.inDialog = true;
    // In the middle of the platform (clear of the roof's posts), looking the way the camera looked.
    p.x = s.x; p.z = s.z; p.y = s.y;
    p.vx = p.vz = p.vy = 0; p.wishX = p.wishZ = 0;
    p.onGround = true;
    p.anim.sprint = false;
    p.anim.kikare = 'eyes';
    const yaw = g.cam.yaw;
    this.rest.visible = false;
    const was = this.all;
    this.takenFins();
    this.sc = { t: 0, frame: g.frame, yaw, pitch: c.pitch0, aim: null, k: 0, line: null, lineT: -1, news: null, newT: -1, out: null };
    // The fin taken since the last look was the eighth: the end comes at once.
    if (!was && this.all) { this.sc.allAt = c.allAfter; audio.chime(); }
    g.cam.scope = { pos: new THREE.Vector3(), yaw, pitch: c.pitch0, fov: c.fov };
    this.place();
    this.storchOn();
    this.looks++;
    if (this.all && was) this.say(c.allLine);
    else if (!this.warned) { this.warned = true; this.say(c.warn); }
    this.card();
    audio.noise(0.08, 0.12, 700, 'bandpass', 0, 1.6);
    audio.tone(240, 0.05, 'triangle', 0.05, 180, 0.05);
  }

  // The eye at his, ahead of his face; Stig turned with the view (hidden: the eye is in front of him).
  place() {
    const g = this.g, c = this.cfg, s = this.sc, p = g.player, sc = g.cam.scope;
    p.yaw = s.yaw;
    p.root.visible = false;
    sc.pos.set(p.x + Math.sin(s.yaw) * c.ahead, p.y + c.eye, p.z + Math.cos(s.yaw) * c.ahead);
    sc.yaw = s.yaw;
    sc.pitch = s.pitch;
  }

  say(line) {
    const s = this.sc;
    s.line = line;
    s.lineT = this.g.time;
  }

  update(dt) {
    const g = this.g, s = this.sc;
    this.storchBack(dt);
    if (!s) return;
    if (!this.live || g.shame.pursuit) { this.end('gone'); return; }
    const c = this.cfg;
    s.t += dt;
    if (s.out) {
      // The last find's shot: Stig on the tower with the binoculars at his chest, his line.
      if (s.t >= s.out.at) this.end('done');
      return;
    }
    const fresh = g.frame === s.frame;   // the E that took them
    if (!fresh && (input.pressed('interact') || input.pressed('hangUp'))) { this.end('down'); return; }
    // Turned by the mouse (or the pad's right stick) and the keys.
    const look = input.look();
    s.yaw -= clamp(look.x, -250, 250) * c.turn + input.moveX() * c.keyTurn * dt;
    s.pitch = clamp(s.pitch - clamp(look.y, -250, 250) * c.turn + input.moveY() * c.keyTurn * dt, c.pitch[0], c.pitch[1]);
    this.place();
    this.storchFilm(dt);
    if (s.allAt != null) {
      if (s.t >= s.allAt) this.lower();
      this.card();
      return;
    }
    // The target nearest the middle of the view, within its cone; held `hold` s, it is found.
    const best = this.aimed();
    if (best && best.id === s.aim) s.k += dt / c.hold;
    else if (best) { s.aim = best.id; s.k = dt / c.hold; }
    else { s.k = Math.max(0, s.k - (2 * dt) / c.hold); if (s.k === 0) s.aim = null; }
    if (best && s.k >= 1) this.find(best);
    this.card();
  }

  // The unfound target nearest the middle of the view within its cone (`aim`°, widened by its size's
  // angle, at most `aimMax`°), or null.
  aimed() {
    const c = this.cfg, s = this.sc, eye = this.g.cam.scope.pos, cp = Math.cos(s.pitch);
    _f.set(Math.sin(s.yaw) * cp, Math.sin(s.pitch), Math.cos(s.yaw) * cp);
    let best = null, ba = Infinity;
    for (const t of c.targets) {
      if (this.has(t.id)) continue;
      for (const q of this.points(t) || []) {
        _v.subVectors(q, eye);
        const d = _v.length();
        const a = Math.acos(clamp(_v.dot(_f) / d, -1, 1)) * DEG;
        const cone = Math.min(c.aimMax, c.aim + Math.atan(t.size / d) * DEG);
        if (a < cone && a < ba) { best = t; ba = a; }
      }
    }
    this.lastAim = best ? +ba.toFixed(2) : null;
    return best;
  }

  find(t) {
    const g = this.g, c = this.cfg, s = this.sc;
    this.found.push(t.id);
    s.aim = null; s.k = 0;
    g.addCoins(c.pay);
    audio.pickup();
    this.say(t.line);
    s.news = t.name;
    s.newT = g.time;
    const all = this.all;
    this.last = { kind: t.id, t: g.time, n: this.found.length, all };
    if (all) {
      s.allAt = s.t + c.allAfter;
      audio.chime();
    }
    g.save();
  }

  // All eight: the view cuts to Stig on the tower from the sand, the binoculars at his chest, facing
  // the sea; his line.
  lower() {
    const g = this.g, c = this.cfg, s = this.sc, p = g.player, sp = this.spot();
    g.cam.scope = null;
    hud.setKikare(null);
    this.storchOff();
    p.root.visible = true;
    p.yaw = sp.yaw;
    p.anim.kikare = 'low';
    const e = this.at(c.shot.eye, c.shot.eye[2]), l = this.at(c.shot.look, c.shot.look[2]);
    g.cam.cutTo(e, l);
    g.cam.fov = 50;   // the cut's own view at once, not a zoom out from the binoculars'
    g.say(p, c.allLine, c.outSecs - 0.3);
    hud.toast(c.allToast);   // here, not under the binoculars' black
    s.out = { at: s.t + c.outSecs };
  }

  // The look is over: the binoculars back on the railing, Stig free in the middle of the platform, the
  // camera behind him (a cut). Out of free roam (`gone`) only our things are put away: a mission owns
  // the camera and the dialogue now.
  end(kind) {
    const g = this.g, p = g.player, s = this.sc;
    this.sc = null;
    g.cam.scope = null;
    hud.setKikare(null);
    this.storchOff();
    this.rest.visible = true;
    p.root.visible = true;
    p.anim.kikare = false;
    if (kind !== 'gone' || g.missions.state === 'idle') {
      g.cam.release();
      g.cam.yaw = p.yaw;
      g.cam.snapNext = true;
      g.inDialog = false;
    }
    // The view's own width at once (a mission's cut too), not a zoom out from the binoculars'.
    g.cam.fov = g.cam.cine ? 50 : g.cam.profile?.fov ?? 62;
    this.last = { kind, t: g.time, n: this.found.length, all: this.all, ended: g.time, yaw: +s.yaw.toFixed(3) };
  }

  // The overlay: the list, the bar (with the latest find for `newSecs` s), Stig's line (`lineSecs` s),
  // the aim ring.
  card() {
    const g = this.g, c = this.cfg, s = this.sc;
    if (!s || s.out) return;
    const found = this.found, n = c.targets.filter((t) => found.includes(t.id)).length, all = n === c.targets.length;
    const line = s.line && g.time - s.lineT < c.lineSecs ? s.line : '';
    hud.setKikare({
      title: c.title,
      rows: c.targets.map((t) => ({ label: t.label, found: found.includes(t.id) })),
      bar: all ? c.allBar : fmt(c.bar, { n, total: c.targets.length }),
      news: s.news && g.time - s.newT < c.newSecs ? s.news : '',
      line, who: c.who, keys: c.keys,
    });
    hud.kikareRing(s.aim ? clamp(s.k, 0, 1) : null);
  }

  // ---------------------------------------------------------------------------------------------
  // Herr Storch, free at his place on the beach, turns to the tower and films it while he is watched
  // (the lens cap on, as always); after, he turns back to the sea.

  storchOn() {
    const g = this.g, n = g.npcs.herrStorch;
    if (this.storch?.back) { this.storch.n.yaw = this.storch.yaw; this.storch = null; }
    if (!n || n.state !== 'normal' || !n.root.visible || n.busy || n.car || n.seatId || g.npcPosed('herrStorch') || g.film.st || g.film.view) return;
    if (n.homeX == null || dist(n.x, n.z, n.homeX, n.homeZ) > 1) return;
    this.storch = { n, yaw: n.yaw, back: false };
    n.anim.film = true;
    audio.whirr(0.8);
  }
  storchFilm(dt) {
    const st = this.storch, sp = this.spot();
    if (!st || st.back) return;
    if (st.n.busy || st.n.state !== 'normal') { st.n.anim.film = false; this.storch = null; return; }
    st.n.yaw = dampAngle(st.n.yaw, yawTo(sp.x - st.n.x, sp.z - st.n.z), 5, dt);
  }
  storchOff() {
    const st = this.storch;
    if (!st || st.back) return;
    st.n.anim.film = false;
    st.back = true;
  }
  storchBack(dt) {
    const st = this.storch;
    if (!st?.back) return;
    const n = st.n;
    if (n.busy || n.state !== 'normal' || n.anim.film) { this.storch = null; return; }
    n.yaw = dampAngle(n.yaw, st.yaw, 4, dt);
    if (Math.abs(Math.atan2(Math.sin(n.yaw - st.yaw), Math.cos(n.yaw - st.yaw))) < 0.01) { n.yaw = st.yaw; this.storch = null; }
  }
}
