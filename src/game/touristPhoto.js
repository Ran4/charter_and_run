// "Kan du ta ett kort på oss?" – turistparet vid fyren (free roam; feature 110, DESIGN §10.51). Once
// asnan is done, by day and between missions, a sunburnt Swedish couple waits at one of three spots in
// turn (the lighthouse's plaza, the dunes' boardwalk, the gate of LA MEDINA) and asks Stig to take their
// picture with the landmark in it. E: the man hands over his camera and the screen is its viewfinder: a
// 3:2 frame (the camera's `scope`, its view set so the frame holds the lens's), the mouse aims it, W/A/S/D
// walk Stig, the right button or V turns it on end, Space says "Säg… omelett." and snaps. The frame's
// reading says whether both their heads are in it, whether they are big enough to see, and whether the
// landmark is whole. A picture without them: they ask again. Otherwise the camera goes back, they pay a
// tip (100 pta for a good one, 10 for "bara foten" or a speck of a couple) and walk off, and the next
// couple waits at the next spot. At the lighthouse (56 m) only the camera on end from about the compass
// rose takes both the couple and the lantern. Only on the island with `missions.state === 'idle'`: a
// mission start or the other level hides the couple and ends a view at once (`last.kind` 'gone'), so no
// mission, stage, timer or calibration pool sees any of it. Config: KORT (content/island.js). Owned by
// Game as `kort`: main.js calls `update` once a frame and `step` in its fixed step, counts `extras` (the
// couple while shown) as people, takes Stig's walk in the view from `wish()` and calls `grab()` after
// the render when `grabNow` is set (the frozen picture).

import { KORT } from '../content/index.js';
import { THREE, scene, camera, renderer } from '../gfx.js';
import { Character } from '../actors/character.js';
import { randomPed } from '../actors/models.js';
import { blockCentre } from '../world/landmarks-island.js';
import { lm } from '../world/layout.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { fmt } from '../strings.js';
import { hud } from './hud.js';
import { clamp, dist, yawTo, dampAngle, mulberry32, pick } from '../util.js';

const DEG = 180 / Math.PI;
const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _e = new THREE.Vector3();
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere();

export class TouristPhoto {
  constructor(game, cfg = KORT) {
    this.g = game;
    this.cfg = cfg;
    this.sc = null;          // the camera in Stig's hands (see start)
    this.at = null;          // the spot (index into cfg.spots) whose couple is out, or null
    this.state = 'off';      // off (none shown) | wait (at the spot) | leave (walking off after a picture)
    this.pair = null;        // [han, hon]: two Characters, made at the first show (new looks by setDef)
    this.extras = [];        // the couple while shown (main.js counts them as people)
    this.path = null;        // the way off: world [{ x, z }] and the step on it
    this.n = 0;              // couples shown this session (each one's looks)
    this.askT = -Infinity;   // g.time of her last ask (again after askGap s while he is near)
    this.on = false;         // live on the last frame
    this.cutT = 0;           // s left in which bodies may come and go in view (after a cut)
    this.fx = 0; this.fz = 0;
    this.grabNow = false;    // main.loop: grab the picture from this frame's render
    this.cam3 = new THREE.PerspectiveCamera(60, 16 / 9, 0.25, 1800);   // judge(): the view at the snap
    this.views = 0;          // tests: views started this session
    this.last = null;        // tests: { kind: 'bra' | 'kapad' | 'liten' | 'miss' | 'abort' | 'gone' | 'knock' | 'warp', t, spot, pay, read }
    game.addInteractable({
      id: 'kort', r: cfg.r, prompt: cfg.prompt,
      pos: () => (this.state === 'wait' ? this.home() : null),
      enabled: () => this.canUse(),
      use: () => this.start(),
    });
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle' && g.missions.index >= this.cfg.from; }
  get busy() { return !!this.sc; }
  // In the viewfinder (tests).
  get viewing() { return this.sc?.phase === 'view' || this.sc?.phase === 'still'; }
  get shown() { return this.extras.length > 0; }
  get rec() { const r = this.g.records; return (r.kort ||= { next: 0, bra: 0, kort: 0 }); }
  get spotNo() { return this.rec.next % this.cfg.spots.length; }
  spot(i = this.at) { return this.cfg.spots[i]; }
  // The couple's place (the middle between them) and its facing.
  home(i = this.at) { return lm(this.spot(i).lm); }
  // A spot's block-local [x, z] (and an absolute y) to world.
  world(i, [x, y, z]) { const c = blockCentre(...this.spot(i).b); return new THREE.Vector3(c.x + x, y, c.z + z); }
  // Each one's own place beside the other: han on her right, facing the camera's way.
  place(k, i = this.at) {
    const L = this.home(i), s = (k ? 1 : -1) * this.cfg.apart / 2;
    return { x: L.x - Math.cos(L.yaw) * s, z: L.z + Math.sin(L.yaw) * s, yaw: L.yaw };
  }

  canUse() {
    const g = this.g, p = g.player;
    if (!this.live || this.sc || this.state !== 'wait' || !g.day.isDay()) return false;
    if (!this.pair.every((ch, k) => { const q = this.place(k); return ch.state === 'normal' && dist(ch.x, ch.z, q.x, q.z) < 1.2; })) return false;
    return !g.inDialog && !g.inCutaway && !g.playerCar && !g.carrying
      && p.state === 'normal' && p.onGround && !g.shame.pursuit && !(g.frozenT > 0) && !(g.shame.panicT > 0)
      && !g.fest.joined && !g.belt.seated && !g.chat.busy && !g.day.busy && !g.solkram.meter && !g.toasters.active
      && !g.skis.on && !g.gatlopp.mode && !g.fiske.busy && !g.kikare.busy && !g.hitch.onTruck && !g.packhus.busy && !g.volley.mode;
  }

  // ---------------------------------------------------------------------------------------------
  // The couple

  // His and her looks for the n-th couple: a tourist face from randomPed, the trip's clothes.
  defs(n) {
    const c = this.cfg, r = mulberry32(c.seed + n * 97);
    let seed = c.seed + n * 131;
    const face = (woman) => { for (;;) { const d = randomPed(mulberry32(seed++)); if (!d.local && !!d.lashes === woman) return d; } };
    const f = n === 0 ? c.first : { shirt: pick(c.shirts, r), print: pick(c.prints, r), dress: pick(c.dresses, r) };
    const han = face(false), hon = face(true);
    return [
      { ...han, name: 'Turisten', skin: c.skin[0], shirt: f.shirt, print: f.print, printStyle: 'floral', collar: true, longSleeves: false,
        shorts: true, pants: 0xf0ead8, hat: 'sunhat', hatC: 0xe8cf8a, shades: 0x2a2a2a, glasses: null, vest: null, stripe: null, dress: null, held: null },
      { ...hon, name: 'Turisten', skin: c.skin[1], dress: f.dress, shirt: f.dress, print: [0xffffff], printStyle: 'dots', shorts: false,
        hat: 'bucket', hatC: 0xf4f1e8, vest: null, stripe: null, held: null },
    ];
  }

  show(i) {
    const defs = this.defs(this.n++);
    if (!this.pair) {
      this.pair = defs.map((d) => {
        const ch = new Character(d);
        ch.state = 'hidden';
        ch.root.visible = false;
        scene.add(ch.root);
        return ch;
      });
    } else this.pair.forEach((ch, k) => ch.setDef(defs[k]));
    this.at = i;
    this.pair.forEach((ch, k) => {
      const q = this.place(k, i);
      this.clearAnim(ch);
      ch.state = 'normal';
      ch.teleport(q.x, q.z, q.yaw);
      ch.vx = ch.vz = ch.vy = 0; ch.wishX = ch.wishZ = 0;
      ch.root.visible = true;
      ch.stuckT = 0;
    });
    this.pair[0].anim.foto = 'belly';
    this.extras = this.pair.slice();
    this.state = 'wait';
    this.path = null;
    this.askT = -Infinity;
  }

  hide() {
    for (const ch of this.pair || []) {
      this.g.unsay(ch);
      this.clearAnim(ch);
      ch.wishX = ch.wishZ = 0;
      ch.state = 'hidden';
      ch.root.visible = false;
    }
    this.extras = [];
    this.state = 'off';
    this.at = null;
    this.path = null;
  }

  clearAnim(ch) {
    const a = ch.anim;
    a.wave = a.talk = a.foto = false;
  }

  // Out of the camera's view (or more than popR m from it), or just after a cut: a body may come or go.
  mayPop(x, y, z, r = 1.4) {
    if (this.cutT > 0 || camera.position.distanceTo(_v.set(x, y, z)) > this.cfg.popR) return true;
    return !_frustum.intersectsSphere(_sphere.set(_v, r));
  }

  // main.js fixedStep: each one to where the state wants them (home, to Stig, off along the path).
  step(h) {
    if (!this.shown) return;
    const g = this.g, s = this.sc;
    this.pair.forEach((ch, k) => {
      let to = null, sp = 1.6;
      if (ch.state === 'normal') {
        if (s?.phase === 'back' && !s.faded) {
          const p = g.player, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), n = this.cfg.fetch.near, side = k ? 0.9 : 0;
          to = { x: p.x + fx * n - fz * side, z: p.z + fz * n + fx * side };
          sp = this.cfg.fetch.speed;
        } else if (this.state === 'leave' && this.path) {
          const q = this.path.pts[Math.min(this.path.i, this.path.pts.length - 1)];
          to = { x: q.x - Math.cos(q.yaw) * (k ? 0.45 : -0.45), z: q.z + Math.sin(q.yaw) * (k ? 0.45 : -0.45) };
          sp = this.cfg.leaveWalk;
        } else if (this.state === 'wait' && !(s && s.phase === 'thanks')) to = this.place(k);
      }
      if (to) {
        const dx = to.x - ch.x, dz = to.z - ch.z, d = Math.hypot(dx, dz);
        const v = d > 0.12 ? Math.min(sp, 0.4 + d * 1.6) : 0;
        ch.wishX = v ? (dx / d) * v : 0; ch.wishZ = v ? (dz / d) * v : 0;
      } else ch.wishX = ch.wishZ = 0;
      ch.step(h, g);
    });
  }

  tickPair(dt) {
    const g = this.g, c = this.cfg, p = g.player, f = g.focus();
    if (!this.shown) {
      // The next couple, by day, where nobody sees it come and Stig is not standing on its place.
      const i = this.spotNo, L = this.home(i);
      if (g.day.isDay() && dist(f.x, f.z, L.x, L.z) > c.showR && this.mayPop(L.x, 1, L.z, 2)) this.show(i);
      return;
    }
    const [han, hon] = this.pair, s = this.sc;
    if (this.state === 'leave') {
      // Along the path; gone once there (or far) and out of view.
      const pa = this.path, q = pa.pts[pa.i];
      if (pa.i < pa.pts.length - 1 && dist(han.x, han.z, q.x, q.z) < 1.2) pa.i++;
      const end = pa.i === pa.pts.length - 1 && dist(han.x, han.z, q.x, q.z) < 1.5;
      if ((end || dist(han.x, han.z, f.x, f.z) > 40) && this.pair.every((ch) => this.mayPop(ch.x, ch.y + 1, ch.z))) { this.hide(); return; }
    } else if (!s) {
      // Waiting: in the evening away where nobody sees it; back on the place when stuck or far off.
      if (!g.day.isDay() && this.pair.every((ch) => this.mayPop(ch.x, ch.y + 1, ch.z))) { this.hide(); return; }
      this.pair.forEach((ch, k) => {
        const q = this.place(k), d = dist(ch.x, ch.z, q.x, q.z);
        ch.stuckT = ch.state === 'normal' && d > 0.5 && ch.speed < 0.2 ? ch.stuckT + dt : 0;
        if ((ch.stuckT > 3 || (d > 30 && ch.state === 'normal')) && this.mayPop(ch.x, ch.y + 1, ch.z) && this.mayPop(q.x, 1, q.z)) {
          ch.teleport(q.x, q.z, q.yaw);
          ch.stuckT = 0;
        }
      });
    }
    // Facing: at Stig while he is near or has their camera, else the camera's way.
    const near = g.playerCar ? Infinity : dist(p.x, p.z, this.home().x, this.home().z);
    const free = this.state === 'wait' && !g.shame.pursuit;
    this.pair.forEach((ch, k) => {
      if (ch.state !== 'normal' || ch.speed > 0.4) return;
      const look = s || (free && near < c.waveR && !g.inDialog);
      ch.yaw = dampAngle(ch.yaw, look ? yawTo(p.x - ch.x, p.z - ch.z) : this.place(k).yaw, 6, dt);
    });
    // He waves Stig over, and poses (waving) in the viewfinder.
    han.anim.wave = han.state === 'normal' && (s ? this.viewing : free && !g.inDialog && near < c.waveR && near > 3);
    for (const ch of this.pair) ch.anim.talk = g.saying(ch);
    // Her question as he comes near on foot, again after askGap s.
    if (free && !s && !g.inDialog && !g.playerCar && near < c.askR && hon.state === 'normal' && g.time - this.askT > c.askGap && !g.saying(hon)) {
      this.askT = g.time;
      g.say(hon, this.spot().ask, 3.2);
    }
    for (const ch of this.pair) {
      ch.root.visible = ch.state !== 'hidden' && camera.position.distanceTo(_v.set(ch.x, ch.y, ch.z)) < 170;
      if (ch.root.visible) ch.sync(dt);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The camera in Stig's hands

  // E: the man hands it over; handSecs s on the viewfinder is up.
  start() {
    if (!this.canUse()) return;
    const g = this.g, p = g.player, L = this.home();
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    p.anim.sprint = false;
    p.yaw = yawTo(L.x - p.x, L.z - p.z);
    g.cam.yaw = p.yaw;
    const [han] = this.pair;
    han.anim.foto = 'give';
    this.sc = { phase: 'hand', t: 0, frame: g.frame, yaw: p.yaw, pitch: this.cfg.pitch0, hog: false, sayAt: null, shot: null, read: null,
      line: null, lineT: -1, who: '', result: null, faded: false };
    this.say(han, 'han', this.cfg.hand, 2.2);
    this.views++;
  }

  // A line: a bubble over the speaker, or in the viewfinder over its frame (`who` the label).
  say(ch, who, text, secs = 2.6) {
    const g = this.g, s = this.sc;
    if (s && (s.phase === 'view' || s.phase === 'still')) { s.line = text; s.lineT = g.time; s.who = this.cfg.who[who]; return; }
    g.say(ch, text, secs);
  }

  // The eye: his, a little before his face (the camera), looking along the view's yaw and pitch.
  eye(s = this.sc) {
    const c = this.cfg, p = this.g.player;
    return _e.set(p.x + Math.sin(s.yaw) * c.ahead, p.y + c.eye, p.z + Math.cos(s.yaw) * c.ahead);
  }

  // The frame on the screen (px, and its share of the screen as NDC half sizes) and the camera's
  // vertical view (°) that makes the frame hold the lens's: `long`° along its long side.
  frame(hog) {
    const L = this.cfg.lens, W = window.innerWidth || 1280, H = window.innerHeight || 720;
    let fh = H * (hog ? L.hog : L.land), fw = hog ? fh / L.ratio : fh * L.ratio;
    if (fw > W * L.maxW) { fw = W * L.maxW; fh = hog ? fw * L.ratio : fw / L.ratio; }
    const half = Math.tan((L.long / 2) / DEG), vHalf = hog ? half : half / L.ratio;
    const fov = 2 * Math.atan(vHalf * H / fh) * DEG;
    return { W, H, fw, fh, nx: fw / W, ny: fh / H, fov };
  }

  view() {
    const g = this.g, s = this.sc, p = g.player;
    s.phase = 'view';
    s.t = 0;
    p.anim.foto = 'eye';
    p.root.visible = false;
    p.faceWish = false;
    for (const ch of this.pair) g.unsay(ch);   // their bubbles over the picture
    g.cam.scope = { pos: new THREE.Vector3(), yaw: s.yaw, pitch: s.pitch, fov: this.frame(false).fov };
    this.aim();
    audio.tone(1200, 0.03, 'square', 0.03, 900, 0.02);
  }

  // The scope from the view's yaw, pitch and frame; Stig unseen (his arms were in the picture).
  aim() {
    const g = this.g, s = this.sc, sc = g.cam.scope;
    if (!sc) return;
    g.player.yaw = s.yaw;
    g.player.root.visible = false;
    sc.pos.copy(this.eye(s));
    sc.yaw = s.yaw;
    sc.pitch = s.pitch;
    sc.fov = this.frame(s.hog).fov;
  }

  // main.js fixedStep: his walk in the viewfinder (W/S along the view, A/D across it), never further
  // than `leash` m from the couple's place; null outside it.
  wish() {
    const s = this.sc;
    if (!s || s.phase !== 'view') return null;
    const c = this.cfg, p = this.g.player, mx = input.moveX(), my = input.moveY();
    const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
    let wx = fx * my - fz * mx, wz = fz * my + fx * mx;
    const l = Math.hypot(wx, wz);
    if (l > 1) { wx /= l; wz /= l; }
    wx *= c.walk; wz *= c.walk;
    const L = this.home(), dx = p.x - L.x, dz = p.z - L.z, d = Math.hypot(dx, dz);
    if (d > c.leash) {
      const out = (wx * dx + wz * dz) / d;
      if (out > 0) { wx -= (dx / d) * out; wz -= (dz / d) * out; }
    }
    return { x: wx, z: wz };
  }

  // The picture as the frame holds it now: the couple (`par`: 'ok' | 'liten' | 'kapat' | 'none'), the
  // subject (`sub`: 'ok' | 'part' | 'none') and what a snap would make of it (`kind`).
  judge(s = this.sc) {
    const c = this.cfg, F = this.frame(s.hog), cam = this.cam3, sp = this.spot();
    const e = _a.copy(this.eye(s)), cp = Math.cos(s.pitch);
    cam.fov = F.fov; cam.aspect = F.W / F.H; cam.updateProjectionMatrix();
    cam.position.copy(e);
    cam.lookAt(e.x + Math.sin(s.yaw) * cp, e.y + Math.sin(s.pitch), e.z + Math.cos(s.yaw) * cp);
    cam.updateMatrixWorld();
    const inF = (q) => { _v.copy(q).project(cam); return _v.z > -1 && _v.z < 1 && Math.abs(_v.x) <= F.nx && Math.abs(_v.y) <= F.ny; };
    let heads = 0, size = Infinity;
    for (const ch of this.pair) {
      if (ch.state === 'hidden') continue;
      ch.root.updateMatrixWorld(true);
      const hd = ch.model.head.getWorldPosition(new THREE.Vector3());
      if (inF(hd)) heads++;
      // His height at the eye: from the feet to the top of the head.
      _b.set(ch.x, ch.y, ch.z).sub(e).normalize();
      _v.set(hd.x, hd.y + ch.model.R, hd.z).sub(e).normalize();
      size = Math.min(size, Math.acos(clamp(_b.dot(_v), -1, 1)) * DEG);
    }
    const pts = sp.pts.map((q) => this.world(this.at, q)), n = pts.filter(inF).length;
    const sub = n === pts.length ? 'ok' : n || sp.base.some((q) => inF(this.world(this.at, q))) ? 'part' : 'none';
    const par = heads === 2 ? (size < c.minDeg ? 'liten' : 'ok') : heads ? 'kapat' : 'none';
    const kind = par === 'kapat' || par === 'none' ? 'miss' : par === 'liten' ? 'liten' : sub === 'ok' ? 'bra' : 'kapad';
    return { kind, par, sub, heads, size: +size.toFixed(2), n };
  }

  // Space (or the left button): his "Säg… omelett.", and sayAt s later the snap.
  snapPress() {
    const s = this.sc;
    if (s.sayAt != null) return;
    s.sayAt = s.t;
    this.say(null, 'stig', this.cfg.omelett);
  }

  snap() {
    const g = this.g, s = this.sc, r = this.judge();
    s.phase = 'still';
    s.t = 0;
    s.sayAt = null;
    s.result = r;
    s.shot = { still: null, read: r };
    this.grabNow = true;
    audio.shutter();
    hud.flashColor('rgba(255, 255, 255, 0.92)', 300);
    if (r.kind === 'miss') this.last = { kind: 'miss', t: g.time, spot: this.spot().id, pay: 0, read: r };
  }

  // main.loop, right after the render (the canvas keeps no buffer): the frame's part of it, small.
  grab() {
    this.grabNow = false;
    const s = this.sc;
    if (!s?.shot) return;
    const el = renderer.domElement, F = this.frame(s.hog), k = el.width / F.W;
    const sw = F.fw * k, sh = F.fh * k, w = s.hog ? 360 : 540, h = Math.round((w * sh) / sw);
    const cv = (this.canvas ??= document.createElement('canvas'));
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(el, (el.width - sw) / 2, (el.height - sh) / 2, sw, sh, 0, 0, w, h);
    s.shot.still = cv.toDataURL('image/jpeg', 0.82);
    this.card();
  }

  // The view down: the chase camera behind him again, Stig seen, the camera held out to them.
  lower() {
    const g = this.g, s = this.sc, p = g.player;
    g.cam.scope = null;
    hud.setKort(null);
    p.root.visible = true;
    p.faceWish = true;
    p.yaw = s.yaw;
    p.anim.foto = 'give';
    g.cam.release();
    g.cam.yaw = s.yaw;
    g.cam.pitch = 0.3;
    g.cam.snapNext = true;
    g.cam.fov = g.cam.profile?.fov ?? 62;
    s.phase = 'back';
    s.t = 0;
  }

  // The camera back in his hands; her (or his) line and the tip.
  thank() {
    const g = this.g, c = this.cfg, s = this.sc, p = g.player, [han, hon] = this.pair, r = s.result;
    s.phase = 'thanks';
    s.t = 0;
    p.anim.foto = false;
    han.anim.foto = 'belly';
    const kind = r ? r.kind : 'abort', [who, line] = c.lines[kind];
    this.say(who === 'han' ? han : hon, who, line, 2.6);
    const pay = c.pay[kind] ?? 0;
    if (pay) {
      g.addCoins(pay);
      audio.coin();
      hud.toast(fmt(c.tip, { n: pay }));
    }
    if (r) {
      this.rec.kort++;
      if (kind === 'bra') this.rec.bra++;
    }
    this.last = { kind, t: g.time, spot: this.spot().id, pay, read: r };
  }

  // Free again: after a picture they walk off and the next couple waits at the next spot; given back
  // unused they go back to their place.
  finish() {
    const g = this.g, c = this.cfg, s = this.sc;
    this.sc = null;
    g.inDialog = false;
    g.player.anim.foto = false;
    if (!s.result) return;
    const i = this.at, sp = this.spot(i);
    this.rec.next = (i + 1) % c.spots.length;
    this.state = 'leave';
    const cb = blockCentre(...sp.b);
    const pts = sp.exit.map(([x, z], k, a) => {
      const q = { x: cb.x + x, z: cb.z + z }, o = a[Math.max(0, k - 1)], from = k ? { x: cb.x + o[0], z: cb.z + o[1] } : this.home(i);
      return { ...q, yaw: yawTo(q.x - from.x, q.z - from.z) };
    });
    this.path = { pts, i: 0 };
    hud.toast(fmt(c.next, { where: this.spot(this.rec.next).where }));
    g.save();
  }

  // At once (a mission start or the other level, a pursuit, a knock, a warp): the view and the camera
  // down, the couple keeps theirs and waits on. In a mission the camera and `inDialog` are the mission's.
  end(kind) {
    const g = this.g, p = g.player, s = this.sc;
    if (!s) return;
    this.sc = null;
    if (g.cam.scope) g.cam.scope = null;
    hud.setKort(null);
    if (s.faded) hud.fade(false);
    p.root.visible = true;
    p.faceWish = true;
    p.anim.foto = false;
    if (s.phase === 'view' || s.phase === 'still') p.yaw = s.yaw;
    if (this.pair?.[0]) this.pair[0].anim.foto = this.shown ? 'belly' : false;
    if (kind !== 'gone' || g.missions.state === 'idle') {
      g.cam.release();
      g.cam.yaw = p.yaw;
      g.cam.snapNext = true;
      g.inDialog = false;
    }
    g.cam.fov = g.cam.cine ? 50 : g.cam.profile?.fov ?? 62;
    this.last = { kind, t: g.time, spot: this.at != null ? this.spot().id : null, pay: 0, read: null };
  }

  tickCam(dt) {
    const g = this.g, c = this.cfg, s = this.sc, p = g.player;
    if (!this.live || g.shame.pursuit) { this.end('gone'); return; }
    if (p.state !== 'normal' && s.phase !== 'thanks') { this.end('knock'); return; }
    s.t += dt;
    if (s.phase === 'hand') {
      p.wishX = p.wishZ = 0;
      if (s.t >= c.giveAt && !p.anim.foto) { this.pair[0].anim.foto = false; p.anim.foto = 'eye'; }
      if (s.t >= c.handSecs) this.view();
      return;
    }
    if (s.phase === 'view') {
      const fresh = g.frame === s.frame;
      if (!fresh && s.sayAt == null && (input.pressed('interact') || input.pressed('hangUp'))) { s.result = null; this.lower(); return; }
      const look = input.look();
      s.yaw -= clamp(look.x, -250, 250) * c.turn;
      s.pitch = clamp(s.pitch - clamp(look.y, -250, 250) * c.turn, c.pitch[0], c.pitch[1]);
      if (input.pressed('turnCam')) { s.hog = !s.hog; audio.tone(700, 0.04, 'triangle', 0.04, 520, 0.03); }
      if (input.pressed('snap')) this.snapPress();
      this.aim();
      s.read = this.judge();
      if (s.sayAt != null && s.t - s.sayAt >= c.sayAt) this.snap();
      this.card();
      return;
    }
    if (s.phase === 'still') {
      this.aim();
      if (s.t >= c.stillSecs) {
        if (s.result.kind === 'miss') {
          s.phase = 'view';
          s.t = 0;
          s.frame = g.frame;
          this.say(this.pair[1], 'hon', c.miss);
          s.read = this.judge();
        } else this.lower();
      }
      this.card();
      return;
    }
    if (s.phase === 'back') {
      // They come for it; if they are not there by `secs` s, a black fade puts them before him.
      const [han, hon] = this.pair, F = c.fetch, d = dist(han.x, han.z, p.x, p.z);
      p.yaw = dampAngle(p.yaw, yawTo(han.x - p.x, han.z - p.z), 6, dt);
      if (!s.faded && (d < F.near + 0.35 || han.state !== 'normal')) { this.thank(); return; }
      if (!s.faded && s.t >= F.secs) { s.faded = true; s.fadeT = 0; hud.fade(true); }
      if (s.faded) {
        s.fadeT += dt;
        if (s.fadeT >= F.fadeSecs && !s.placed) {
          s.placed = true;
          const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
          [han, hon].forEach((ch, k) => {
            const side = k ? 0.9 : 0;
            ch.teleport(p.x + fx * F.near - fz * side, p.z + fz * F.near + fx * side, p.yaw + Math.PI);
            ch.vx = ch.vz = 0;
          });
          hud.fade(false);
        }
        if (s.fadeT >= 2 * F.fadeSecs) { s.faded = false; this.thank(); }
      }
      return;
    }
    if (s.phase === 'thanks') {
      const [han] = this.pair;
      p.yaw = dampAngle(p.yaw, yawTo(han.x - p.x, han.z - p.z), 6, dt);
      if (s.t >= c.thanksSecs) this.finish();
    }
  }

  // The viewfinder's overlay from the view's state.
  card() {
    const g = this.g, c = this.cfg, s = this.sc;
    if (!s || (s.phase !== 'view' && s.phase !== 'still')) { hud.setKort(null); return; }
    const F = this.frame(s.hog), sp = this.spot(), r = s.phase === 'still' ? s.result : s.read || this.judge();
    const R = c.read, still = s.phase === 'still';
    const sub = fmt(R.sub[r.sub], { s: sp.subject, p: sp.part });
    const stamp = still ? [r.kind === 'kapad' ? fmt(c.stamp.kapad, { p: sp.part }) : c.stamp[r.kind], r.kind === 'bra'] : null;
    hud.setKort({
      fw: Math.round(F.fw), fh: Math.round(F.fh), hog: s.hog,
      keys: fmt(c.keys, { vrid: s.hog ? c.vrid.land : c.vrid.hog }),
      par: [R.par[r.par], r.par === 'ok'], sub: [sub, r.sub === 'ok'],
      line: !still && s.line && g.time - s.lineT < c.lineSecs ? s.line : '', who: s.who,
      still: still ? s.shot?.still || null : null, stamp,
    });
  }

  update(dt) {
    const g = this.g;
    if (this.sc) this.tickCam(dt);
    if (!this.live) { if (this.shown) this.hide(); this.on = false; return; }
    const f = g.focus();
    // A cut (free roam again after a mission or a load, R, a warp): bodies come and go freely a moment.
    if (!this.on || dist(f.x, f.z, this.fx, this.fz) > 15) this.cutT = 0.5;
    this.on = true;
    this.fx = f.x; this.fz = f.z;
    this.cutT -= dt;
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    this.tickPair(dt);
  }
}
