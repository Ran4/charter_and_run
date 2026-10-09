// Everything drawn over the 3D view: pesetas, the level's meter (FLYGRÄDSLA / SKANDAL), objectives
// and timers, the minimap (town or cabin plan), dialogue with portraits, banners, toasts, speech
// bubbles. Owner: WP-H. Strings come from strings.js.
//   Map source: { canvas, scale (px/m), x0, z0 (world at canvas px 0,0), zoom (minimap px/m),
//                 crop: { x0, z0, x1, z1 } (big map), north: 'N' | 'FRAM', bg }

import { THREE, camera } from '../gfx.js';
import { MAP, N, P, HALF, RHW, rc, BOUND, BLOCK_MAP_COLORS } from '../world/layout.js';
import { blocks, BOX, CIRCLE } from '../world/collision.js';
import { audio } from '../audio.js';
import { S, fmt, pta } from '../strings.js';
import { NAMED_CARS } from '../content/index.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; parent?.appendChild(e); return e; };
// Luckiest Guy's lowercase glyphs are odd small caps ('GRISFeSTeN'): text set in it (banner mains,
// the objective title, dialogue names, big-map labels) is uppercased here (§1.3; no CSS
// text-transform).
const upper = (s) => String(s).toLocaleUpperCase('sv');
// A toast fades out (0.5 s transition) and is removed.
const dropToast = (t) => { if (t.classList.contains('out')) return; t.classList.add('out'); setTimeout(() => t.remove(), 600); };

let root, mapCanvas, mapCtx;
const _bubbleV = new THREE.Vector3();
const MAP_SCALE = 1.6; // px per metre on the town base map
const MAP_EXT = BOUND + 20;
const BUBBLE_TOP = 96;   // px: speech bubbles stay under the coins / meter row

export const hud = {
  portraits: {},
  dialogActive: false,
  src: null,

  init() {
    root = $('hud');
    root.innerHTML = `
      <div id="vignette"></div>
      <div id="sirenlights"><div class="sl-l"></div><div class="sl-r"></div></div>
      <div id="panik"></div>
      <div id="coins"><span class="coin-icon"></span><span id="coin-n">0 pta</span></div>
      <div id="collect"></div>
      <div id="shame"><div class="shame-label"></div><div class="shame-row"><div class="meter-icon"><i></i></div><div class="shame-bar"><div class="shame-fill"></div><div class="shame-ticks"></div></div></div></div>
      <div id="objective"><div class="obj-title"></div><div class="obj-text"></div><div class="obj-timer"></div><div class="obj-bar"><div class="obj-zone"></div><div class="obj-bar-fill"></div><div class="obj-marker"></div><span class="obj-bar-label"></span></div></div>
      <div id="minimap-wrap"><canvas id="minimap" width="220" height="220"></canvas><div class="mm-n">N</div></div>
      <div id="speedo"><div class="sp-num">0</div><div class="sp-unit">${S.speedUnit}</div><div class="sp-hp"><div class="sp-hp-fill"></div></div><div class="sp-name"></div></div>
      <div id="prompt"></div>
      <div id="toasts"></div>
      <div id="banner"><div class="banner-main"></div><div class="banner-sub"></div></div>
      <div id="bubbles"></div>
      <div id="letterbox"><div class="lb-top"></div><div class="lb-bot"></div></div>
      <div id="dialog"><div class="dlg-portrait"><img alt=""></div><div class="dlg-body"><div class="dlg-name"></div><div class="dlg-text"></div></div><div class="dlg-next">${S.dialogNext}</div></div>
      <div id="flash"></div>
      <div id="bigmap"><canvas width="760" height="760"></canvas><div class="bm-legend"></div></div>
    `;
    mapCanvas = $('minimap');
    mapCtx = mapCanvas.getContext('2d');
    this.coinEl = $('coin-n');
    this.shameFill = root.querySelector('.shame-fill');
    this.shameLabel = root.querySelector('.shame-label');
    this.shameEl = $('shame');
    this.obj = $('objective');
    this.objTitle = root.querySelector('.obj-title');
    this.objText = root.querySelector('.obj-text');
    this.objTimer = root.querySelector('.obj-timer');
    this.objBar = root.querySelector('.obj-bar');
    this.objBarFill = root.querySelector('.obj-bar-fill');
    this.objBarLabel = root.querySelector('.obj-bar-label');
    this.objZone = root.querySelector('.obj-zone');
    this.objMarker = root.querySelector('.obj-marker');
    this.speedo = $('speedo');
    this.prompt = $('prompt');
    this.toastsEl = $('toasts');
    this.banner = $('banner');
    this.bubbles = $('bubbles');
    this.dialog = $('dialog');
    this.collectEl = $('collect');
    this.flash = $('flash');
    this.bigmap = $('bigmap');
  },

  // The town's static minimap, drawn once from the town data. Returns a map source.
  buildBaseMap() {
    const size = Math.ceil(MAP_EXT * 2 * MAP_SCALE);
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const x = cv.getContext('2d');
    const W = (v) => (v + MAP_EXT) * MAP_SCALE;
    x.fillStyle = '#d9bf86';
    x.fillRect(0, 0, size, size);
    x.fillStyle = '#1c7fb8';
    x.fillRect(0, W(HALF + RHW + 9), size, size);
    x.fillStyle = '#4a5058';
    x.fillRect(W(-HALF - RHW), W(-HALF - RHW), (2 * HALF + 2 * RHW) * MAP_SCALE, (2 * HALF + 2 * RHW) * MAP_SCALE);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      x.fillStyle = '#c8c3b6';
      x.fillRect(W(rc(i) + RHW), W(rc(j) + RHW), (P - 2 * RHW) * MAP_SCALE, (P - 2 * RHW) * MAP_SCALE);
      x.fillStyle = BLOCK_MAP_COLORS[MAP[j][i]] || '#e6d6b8';
      x.fillRect(W(rc(i) + RHW + 3.5), W(rc(j) + RHW + 3.5), (P - 2 * RHW - 7) * MAP_SCALE, (P - 2 * RHW - 7) * MAP_SCALE);
    }
    for (const b of blocks) {
      if (Math.abs(b.bx0) > MAP_EXT * 1.5) continue;
      if (b.shape === BOX && (b.kind === 'building' || b.kind === 'garage' || b.kind === 'marquee')) {
        x.fillStyle = b.kind === 'building' ? '#f4efe6' : '#e0d8c8';
        x.fillRect(W(b.minX), W(b.minZ), (b.maxX - b.minX) * MAP_SCALE, (b.maxZ - b.minZ) * MAP_SCALE);
        x.strokeStyle = '#5a4a5a';
        x.lineWidth = 1;
        x.strokeRect(W(b.minX), W(b.minZ), (b.maxX - b.minX) * MAP_SCALE, (b.maxZ - b.minZ) * MAP_SCALE);
      } else if (b.kind === 'water') {
        x.fillStyle = '#1c7fb8';
        if (b.shape === CIRCLE) { x.beginPath(); x.arc(W(b.x), W(b.z), b.r * MAP_SCALE, 0, Math.PI * 2); x.fill(); }
        else if (b.shape === BOX) x.fillRect(W(b.minX), W(b.minZ), (b.maxX - b.minX) * MAP_SCALE, (b.maxZ - b.minZ) * MAP_SCALE);
      }
    }
    // Centre lines.
    x.strokeStyle = '#f4f4f0';
    x.lineWidth = 1;
    x.setLineDash([4, 4]);
    for (let k = 0; k <= N; k++) {
      x.beginPath(); x.moveTo(W(rc(k)), W(-HALF)); x.lineTo(W(rc(k)), W(HALF)); x.stroke();
      x.beginPath(); x.moveTo(W(-HALF), W(rc(k))); x.lineTo(W(HALF), W(rc(k))); x.stroke();
    }
    x.setLineDash([]);
    const E = HALF + 16;
    this.townMap = { canvas: cv, scale: MAP_SCALE, x0: -MAP_EXT, z0: -MAP_EXT, zoom: 1.25, crop: { x0: -E, z0: -E, x1: E, z1: E }, north: 'N', bg: '#d9bf86' };
    if (!this.src) this.src = this.townMap;
    return this.townMap;
  },

  // A plan drawn from the collision blocks inside world bounds { x0, z0, x1, z1 }, coloured by kind.
  buildMapFromBlocks(bounds, { scale = 12, bg = '#2a3442', kinds = {}, zoom = 9, north = 'N' } = {}) {
    const pad = 2;
    const x0 = bounds.x0 - pad, z0 = bounds.z0 - pad, x1 = bounds.x1 + pad, z1 = bounds.z1 + pad;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil((x1 - x0) * scale); cv.height = Math.ceil((z1 - z0) * scale);
    const c = cv.getContext('2d');
    c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height);
    const X = (v) => (v - x0) * scale, Z = (v) => (v - z0) * scale;
    for (const b of blocks) {
      if (b.bx1 < x0 || b.bx0 > x1 || b.bz1 < z0 || b.bz0 > z1) continue;
      const col = kinds[b.kind];
      if (!col) continue;
      c.fillStyle = col;
      if (b.shape === BOX) c.fillRect(X(b.minX), Z(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
      else if (b.shape === CIRCLE) { c.beginPath(); c.arc(X(b.x), Z(b.z), Math.max(1.5, b.r * scale), 0, Math.PI * 2); c.fill(); }
    }
    return { canvas: cv, scale, x0, z0, zoom, crop: { x0, z0, x1, z1 }, north, bg };
  },

  setMapSource(src) {
    if (!src) return;
    this.src = src;
    const n = this._north ||= document.querySelector('.mm-n');
    if (n) n.textContent = src.north || 'N';
  },

  setCoins(n) { this.coinEl.textContent = fmt('coins', { n: pta(n) }); },
  bumpCoins() { this.coinEl.parentElement.classList.remove('bump'); void this.coinEl.offsetWidth; this.coinEl.parentElement.classList.add('bump'); },

  // The level's meter: value 0..100, hot (>= cfg.hot), pursuit (SKANDAL only). Called every frame:
  // the DOM is only touched when something visible changes.
  setMeter(v, hot, pursuit) {
    const w = Math.round(v);
    if (w !== this._meterW) {
      this._meterW = w;
      this.shameFill.style.width = `${w}%`;
      // Stretch the fill's gradient over the whole bar, so its colour says how full it is.
      this.shameFill.style.setProperty('--gw', w > 0 ? `${(10000 / w).toFixed(1)}%` : '100%');
    }
    hot = !!hot; pursuit = !!pursuit;
    if (hot !== this._meterHot) { this._meterHot = hot; this.shameEl.classList.toggle('hot', hot); }
    if (pursuit !== this._meterPursuit) {
      this._meterPursuit = pursuit;
      this.shameEl.classList.toggle('pursuit', pursuit);
      document.body.classList.toggle('pursuit', pursuit);
    }
  },
  setMeterLabel(text, cls = '') {
    this.shameLabel.textContent = text;
    this.shameEl.className = cls ? `meter-${cls}` : '';
    this.shameEl.dataset.cls = cls;
    this._meterHot = this._meterPursuit = undefined;
    document.body.classList.remove('pursuit');
  },
  // FLYGRÄDSLA 0..1: the --fear CSS variable (the red vignette grows from 0.5 up) and body.fear-hot
  // (>= 0.7: the vignette pulses with the heartbeat).
  setFear(v01) {
    const f = Math.round(Math.max(0, Math.min(1, v01)) * 50) / 50;
    if (f === this._fear) return;
    this._fear = f;
    document.body.style.setProperty('--fear', String(f));
    document.body.classList.toggle('fear-hot', f >= 0.7);
  },
  // PANIK! (§5.9): tunnel vision and a shaking HUD for `secs` (0 ends it).
  panic(secs) {
    clearTimeout(this._panikT);
    document.body.classList.toggle('panik', secs > 0);
    if (secs > 0) this._panikT = setTimeout(() => document.body.classList.remove('panik'), secs * 1000);
  },

  setObjective(o) {
    if (!o) { this.obj.classList.remove('show'); return; }
    this.obj.classList.add('show');
    this.objTitle.textContent = upper(o.title || '');
    this.objText.textContent = o.text || '';
    if (o.timer != null) {
      const t = Math.max(0, o.timer);
      const m = Math.floor(t / 60), s = Math.floor(t % 60);
      this.objTimer.textContent = `${m}:${String(s).padStart(2, '0')}`;
      this.objTimer.classList.toggle('urgent', t < 10);
      this.objTimer.style.display = '';
    } else this.objTimer.style.display = 'none';
    if (o.bar != null || o.zone || o.marker != null) {
      this.objBar.style.display = '';
      this.objBarFill.style.width = `${Math.round(Math.max(0, Math.min(1, o.bar ?? 0)) * 100)}%`;
      this.objBarFill.style.background = o.barColor || '';
      this.objBarLabel.textContent = o.barLabel || '';
      if (o.zone) {
        this.objZone.style.display = 'block';
        this.objZone.style.left = `${o.zone[0] * 100}%`;
        this.objZone.style.width = `${Math.max(0, o.zone[1] - o.zone[0]) * 100}%`;
      } else this.objZone.style.display = 'none';
      if (o.marker != null) {
        this.objMarker.style.display = 'block';
        this.objMarker.style.left = `${Math.max(0, Math.min(1, o.marker)) * 100}%`;
      } else this.objMarker.style.display = 'none';
    } else this.objBar.style.display = 'none';
  },

  setSpeedo(car) {
    if (!car || car.spec.noSpeedo) { this.speedo.classList.remove('show'); return; }
    this.speedo.classList.add('show');
    this.speedo.querySelector('.sp-num').textContent = Math.round(Math.abs(car.forwardSpeed) * 3.6);
    const hp = car.hp / car.spec.hp;
    const f = this.speedo.querySelector('.sp-hp-fill');
    f.style.width = `${Math.round(hp * 100)}%`;
    f.style.background = hp > 0.5 ? '#5fd35f' : hp > 0.25 ? '#ffd23f' : '#ff4a3a';
    this.speedo.querySelector('.sp-name').textContent = (car.name && NAMED_CARS[car.name]) || car.spec.name;
  },

  setPrompt(text) {
    if (text === this._prompt) return;
    this._prompt = text;
    this.prompt.innerHTML = text || '';
    this.prompt.classList.toggle('show', !!text);
  },

  // Up long enough to read (radio lines run to 100 characters): 2.4–7 s by length unless `secs`
  // says otherwise. At most three at once: a fourth pushes the oldest out.
  toast(text, cls = '', secs) {
    const t = el('div', 'toast ' + cls, this.toastsEl, text);
    const ms = (secs ?? Math.min(7, Math.max(2.4, 1 + t.textContent.length * 0.06))) * 1000;
    const live = [...this.toastsEl.children].filter((e) => !e.classList.contains('out'));
    if (live.length > 3) dropToast(live[0]);
    setTimeout(() => dropToast(t), ms);
  },
  // Gameplay toasts do not carry over into a dialogue (runDialog); its own cue toasts come after.
  clearToasts() { for (const t of this.toastsEl.children) dropToast(t); },

  showBanner(main, sub = '', cls = '', ms = 2600) {
    clearTimeout(this._bannerT);
    this.banner.className = 'show ' + cls;
    this.banner.querySelector('.banner-main').textContent = upper(main);
    this.banner.querySelector('.banner-sub').textContent = sub;
    if (ms) this._bannerT = setTimeout(() => this.hideBanner(), ms);
  },
  // Keeps the cls while it fades, so it fades where it stood (an intro title card in the top bar
  // used to slide down across the faces).
  hideBanner() { this.banner.classList.remove('show'); },

  flashColor(color, ms = 400) {
    this.flash.style.background = color;
    this.flash.classList.remove('go'); void this.flash.offsetWidth; this.flash.classList.add('go');
  },

  showCollect(text) {
    this.collectEl.innerHTML = text;
    this.collectEl.classList.add('show');
    clearTimeout(this._collectT);
    this._collectT = setTimeout(() => this.collectEl.classList.remove('show'), 3500);
  },

  letterbox(on) { $('letterbox').classList.toggle('on', on); },

  // ------------------------------------------------------------------------------------------
  // Dialogue: lines of { who, text, cue }. game.cue(cue) fires when a line starts. Resolves when
  // the last line is dismissed (auto-advances when game.autoDialog).
  async runDialog(lines, game) {
    this.dialogActive = true;
    this.dialog.classList.add('show');
    document.body.classList.add('in-dialog');
    this.clearToasts();
    const speed = game.dialogSpeed || 55, pad = game.testMode ? 8 : 30;
    for (const line of lines) {
      if (line.cue) game.cue(line.cue);
      const def = game.charDef(line.who);
      const img = this.dialog.querySelector('img');
      img.src = this.portraits[line.who] || '';
      this.dialog.style.setProperty('--ring', def?.ring || '#f7c31b');
      this.dialog.querySelector('.dlg-name').textContent = upper(def?.name || line.who);
      const textEl = this.dialog.querySelector('.dlg-text');
      textEl.textContent = '';
      game.setTalker(line.who);
      let shown = 0;
      const text = line.text;
      let done = false, skipped = false;
      await new Promise((resolve) => {
        let acc = 0, blip = 0;
        const step = (dt) => {
          if (!done) {
            acc += dt * speed;
            const n = Math.min(text.length, Math.floor(acc));
            if (n > shown) {
              shown = n;
              textEl.textContent = text.slice(0, shown);
              blip -= 1;
              if (blip <= 0 && /\p{L}/u.test(text[shown - 1])) { audio.talk(def?.voice || 300); blip = 2; }
            }
            if (shown >= text.length) { done = true; game.setTalker(null); }
          }
          if (game.input.pressed('skip')) {
            if (!done) { shown = text.length; textEl.textContent = text; done = true; game.setTalker(null); }
            else { skipped = true; }
          }
          if (skipped || (game.autoDialog && done && (acc += dt * speed) > text.length + pad)) { game.offFrame(step); resolve(); }
        };
        game.onFrame(step);
      });
    }
    game.setTalker(null);
    this.dialog.classList.remove('show');
    document.body.classList.remove('in-dialog');
    this.dialogActive = false;
  },

  // Speech bubbles over characters in the world. One bubble per speaker: a new line replaces the
  // speaker's live bubble. Bubbles that would overlap on screen stack upwards, the newer one above
  // (scripted lines, Ole's barks and the mantra over neighbouring seats). A bubble wraps at 300 px
  // and stays on screen, under the coins / meter row and under a shown objective card; a stacked
  // bubble with no room left above waits, hidden, until the ones below it are gone.
  say(target, text, secs = 2) {
    if (!target) return;
    const list = (this._bubbles ||= []);
    for (let k = list.length - 1; k >= 0; k--) if (list[k].target === target) { list[k].b.remove(); list.splice(k, 1); }
    const b = el('div', 'bubble', this.bubbles, text);
    list.push({ b, target, until: performance.now() + secs * 1000 });
  },
  // Takes the speaker's live bubble down now (a line cut short by a scene). Returns when the last
  // bubble still up ends (0 if none), so Game.unsay can pull its `sayEnd` back.
  unsay(target) {
    const list = this._bubbles || [];
    let end = 0;
    for (let k = list.length - 1; k >= 0; k--) {
      if (list[k].target === target) { list[k].b.remove(); list.splice(k, 1); }
      else end = Math.max(end, list[k].until);
    }
    return end;
  },
  tickBubbles() {
    const list = this._bubbles || [];
    const now = performance.now();
    const v = _bubbleV;
    const placed = [];
    const W = window.innerWidth, H = window.innerHeight;
    let ob;   // the objective card's rect, read once per tick when needed
    for (let k = 0; k < list.length; k++) {   // oldest first: newer bubbles move up out of the way
      const it = list[k];
      if (now > it.until) { it.b.remove(); list.splice(k--, 1); continue; }
      const t = it.target;
      if (t.state === 'hidden') { it.b.style.display = 'none'; continue; }
      v.set(t.x, t.y + (t.height || 2) + 0.6, t.z);
      v.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { it.b.style.display = 'none'; continue; }
      it.b.style.display = '';
      const w = it.b.offsetWidth, h = it.b.offsetHeight;
      // The bubble's anchor is its bottom centre (translate(-50%, -100%)).
      const x = Math.min(W - w / 2 - 8, Math.max(w / 2 + 8, (v.x * 0.5 + 0.5) * W));
      if (ob === undefined) ob = this.obj.classList.contains('show') ? this.obj.getBoundingClientRect() : null;
      const top = ob && x + w / 2 > ob.left && x - w / 2 < ob.right ? Math.max(BUBBLE_TOP, ob.bottom + 8) : BUBBLE_TOP;
      let y = Math.max((-v.y * 0.5 + 0.5) * H, top + h);
      for (let moved = true, n = 0; moved && n < 8; n++) {
        moved = false;
        for (const p of placed) {
          if (Math.abs(p.x - x) < (p.w + w) / 2 + 4 && y > p.y - p.h - 4 && y - h < p.y + 4) { y = p.y - p.h - 6; moved = true; }
        }
      }
      if (y - h < top - 1) { it.b.style.display = 'none'; continue; }
      placed.push({ x, y, w, h });
      it.b.style.left = `${x}px`;
      it.b.style.top = `${y}px`;
    }
  },

  // ------------------------------------------------------------------------------------------
  // Minimap: the base map shifted and turned so the camera's forward is up.

  drawMinimap(px, pz, camYaw, playerYaw, markers, route) {
    const src = this.src;
    if (!src) return;
    const c = mapCtx, Sz = mapCanvas.width, R = Sz / 2;
    const zoom = src.zoom;
    c.save();
    c.clearRect(0, 0, Sz, Sz);
    c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI * 2); c.clip();
    c.fillStyle = src.bg || '#d9bf86'; c.fillRect(0, 0, Sz, Sz);
    c.translate(R, R);
    c.rotate(camYaw + Math.PI);
    c.scale(zoom / src.scale, zoom / src.scale);
    c.drawImage(src.canvas, -(px - src.x0) * src.scale, -(pz - src.z0) * src.scale);
    c.restore();
    c.save();
    c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI * 2); c.clip();
    c.translate(R, R);
    c.rotate(camYaw + Math.PI);
    const k = zoom;
    if (route && route.length > 1) {
      c.strokeStyle = 'rgba(255,210,63,0.9)';
      c.lineWidth = 4;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0, 0);
      for (const [x, z] of route) c.lineTo((x - px) * k, (z - pz) * k);
      c.stroke();
    }
    for (const m of markers) {
      let x = (m.x - px) * k, y = (m.z - pz) * k;
      const d = Math.hypot(x, y), lim = R - 12;
      const clamped = d > lim;
      if (clamped) { if (!m.edge) continue; x *= lim / d; y *= lim / d; }
      c.save();
      c.translate(x, y);
      c.rotate(-(camYaw + Math.PI));
      drawMarker(c, m, clamped);
      c.restore();
    }
    c.restore();
    // Player arrow (always up = camera forward, turned by facing relative to the camera).
    c.save();
    c.translate(R, R);
    c.rotate(-(playerYaw - camYaw));
    c.fillStyle = '#ffffff'; c.strokeStyle = '#1d1426'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -9); c.lineTo(7, 7); c.lineTo(0, 3); c.lineTo(-7, 7); c.closePath(); c.fill(); c.stroke();
    c.restore();
    c.strokeStyle = '#1d1426'; c.lineWidth = 4;
    c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI * 2); c.stroke();
    // Rim badge: 'N' points to -z (inland); 'FRAM' points to +z (the plane's nose).
    const n = this._north ||= document.querySelector('.mm-n');
    const a = camYaw + Math.PI + (src.north === 'FRAM' ? Math.PI : 0);
    const tx = Math.round(Math.cos(a - Math.PI / 2) * (R - 8)), ty = Math.round(Math.sin(a - Math.PI / 2) * (R - 8));
    if (tx !== this._nX || ty !== this._nY) { this._nX = tx; this._nY = ty; n.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`; }
  },

  toggleBigMap(on, game) {
    this.bigmap.classList.toggle('show', on);
    if (!on) return;
    const src = this.src;
    if (!src) return;
    const cv = this.bigmap.querySelector('canvas');
    const c = cv.getContext('2d');
    const cr = src.crop, Sz = cv.width;
    const w = cr.x1 - cr.x0, h = cr.z1 - cr.z0, k = Sz / Math.max(w, h);
    const ox = (Sz - w * k) / 2, oz = (Sz - h * k) / 2;
    c.fillStyle = src.bg || '#d9bf86';
    c.fillRect(0, 0, Sz, Sz);
    // FRAM maps (the cabin) are turned half a turn so the plane's nose (+z) points up.
    const flip = src.north === 'FRAM';
    c.save();
    if (flip) { c.translate(Sz, Sz); c.rotate(Math.PI); }
    c.drawImage(src.canvas, (cr.x0 - src.x0) * src.scale, (cr.z0 - src.z0) * src.scale, w * src.scale, h * src.scale, ox, oz, w * k, h * k);
    c.restore();
    const toC = flip ? (x, z) => [Sz - (ox + (x - cr.x0) * k), Sz - (oz + (z - cr.z0) * k)] : (x, z) => [ox + (x - cr.x0) * k, oz + (z - cr.z0) * k];
    // Labels: laid out once per label set (collision-free), then drawn every refresh. The giver's
    // "!" and the objective star are drawn on top, so the layout keeps clear of them too (the gate
    // map's "!" sat on SÄKERHETSKONTROLL); their spots are part of the key, in 8 px steps.
    const labels = game.mapLabels();
    const marks = game.mapMarkers(true).filter((m) => m.type === 'mission' || m.type === 'objective').map((m) => toC(m.x, m.z));
    const key = `${flip}${cr.x0},${cr.z0},${cr.x1},${cr.z1}|${labels.map((l) => l[0] + l[1].toFixed(0) + l[2].toFixed(0)).join('|')}|${marks.map(([x, y]) => `${Math.round(x / 8)},${Math.round(y / 8)}`).join(';')}`;
    if (key !== this._labelKey) {
      this._labelKey = key;
      this.labelLayout = layoutLabels(c, labels.map(([name, lx, lz]) => { const [ax, ay] = toC(lx, lz); return { name: upper(name), ax, ay }; }), Sz, marks);
    }
    drawLabels(c, this.labelLayout);
    // Markers and the player on top of the labels.
    for (const m of game.mapMarkers(true)) {
      const [x, y] = toC(m.x, m.z);
      c.save(); c.translate(x, y); drawMarker(c, m, false, 1.3); c.restore();
    }
    const p = game.focus();
    const [x, y] = toC(p.x, p.z);
    c.save(); c.translate(x, y); c.rotate(-p.yaw + (flip ? 0 : Math.PI));
    c.fillStyle = '#fff'; c.strokeStyle = '#1d1426'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -10); c.lineTo(8, 8); c.lineTo(0, 3); c.lineTo(-8, 8); c.closePath(); c.fill(); c.stroke();
    c.restore();
    // Cartouche: where we are.
    const title = game.level === 'flight' ? (game.cabin?.phase === 'gate' ? S.mapTitleGate : S.mapTitleFlight) : S.mapTitleIsland;
    if (title) {
      c.font = '22px "Luckiest Guy", Impact, sans-serif';
      const tw = c.measureText(title).width + 28;
      c.fillStyle = '#fff8e6'; c.strokeStyle = '#1d1426'; c.lineWidth = 3;
      roundRect(c, 14, 14, tw, 36, 10); c.fill(); c.stroke();
      c.fillStyle = '#c0623a'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText(title, 28, 33);
      c.textBaseline = 'alphabetic';
    }
    this.bigmap.querySelector('.bm-legend').innerHTML = game.mapLegend();
  },
};

// ---- big-map labels ------------------------------------------------------------------------------
// Greedy placement without collisions: the most crowded labels first; each tries a ring of spots
// around its landmark (above, below, right, left, diagonals, then further out) and takes the first
// that overlaps no placed label, no other landmark dot, no map marker (`marks`, [x, y] canvas
// spots of the 1.3× "!" and star) and stays on the canvas; failing that, a smaller font, and as a
// last resort the spot with the least overlap. A label set off its landmark gets a leader line to
// the dot.
const LABEL_FONT = (px) => `${px}px "Luckiest Guy", Impact, sans-serif`;
function layoutLabels(c, items, Sz, marks = []) {
  const dotR = 5, pad = 3, markR = 13;
  const dots = items.map((it) => ({ x0: it.ax - dotR, y0: it.ay - dotR, x1: it.ax + dotR, y1: it.ay + dotR }));
  for (const [x, y] of marks) dots.push({ x0: x - markR, y0: y - markR, x1: x + markR, y1: y + markR });
  const crowd = items.map((a) => items.reduce((n, b) => n + (Math.hypot(a.ax - b.ax, a.ay - b.ay) < 150 ? 1 : 0), 0));
  const order = items.map((_, i) => i).sort((a, b) => crowd[b] - crowd[a] || items[a].ay - items[b].ay);
  const placed = [], out = new Array(items.length);
  const overlap = (r, s) => Math.max(0, Math.min(r.x1, s.x1) - Math.max(r.x0, s.x0)) * Math.max(0, Math.min(r.y1, s.y1) - Math.max(r.y0, s.y0));
  for (const i of order) {
    const it = items[i];
    let best = null, bestCost = Infinity;
    for (const px of [17, 14]) {
      c.font = LABEL_FONT(px);
      const w = c.measureText(it.name).width + 8, h = px + 3;
      const cands = [];
      for (const ring of [0, 1, 2]) {
        const gx = w / 2 + 9 + ring * 14, gy = h / 2 + 9 + ring * 14;
        cands.push([0, -gy], [0, gy], [gx, 0], [-gx, 0], [gx * 0.8, -gy], [-gx * 0.8, -gy], [gx * 0.8, gy], [-gx * 0.8, gy]);
      }
      for (const [dx, dy] of cands) {
        const cx = it.ax + dx, cy = it.ay + dy;
        const r = { x0: cx - w / 2 - pad, y0: cy - h / 2 - pad, x1: cx + w / 2 + pad, y1: cy + h / 2 + pad };
        let cost = 0;
        if (r.x0 < 2 || r.y0 < 2 || r.x1 > Sz - 2 || r.y1 > Sz - 2 || (r.y0 < 56 && r.x0 < 340)) cost += 1e6;   // canvas, cartouche
        for (const s of placed) cost += overlap(r, s) * 10;
        dots.forEach((d, k) => { if (k !== i) cost += overlap(r, d) * 4; });
        cost += Math.hypot(dx, dy) * 0.05 + (px < 17 ? 30 : 0);
        if (cost < bestCost) { bestCost = cost; best = { name: it.name, ax: it.ax, ay: it.ay, cx, cy, w, h, px, r, ok: cost < 1000 }; }
        if (cost < 4) break;
      }
      if (best && bestCost < 40) break;
    }
    placed.push(best.r);
    out[i] = best;
  }
  return out;
}
function drawLabels(c, list) {
  if (!list) return;
  c.lineJoin = 'round';
  for (const l of list) {
    if (!l) continue;
    const far = Math.hypot(l.cx - l.ax, l.cy - l.ay) > l.h / 2 + 12;
    if (far) {
      // Leader from the dot to the nearest edge of the label box.
      const ex = Math.max(l.cx - l.w / 2, Math.min(l.ax, l.cx + l.w / 2)), ey = Math.max(l.cy - l.h / 2, Math.min(l.ay, l.cy + l.h / 2));
      c.strokeStyle = '#1d1426'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(l.ax, l.ay); c.lineTo(ex, ey); c.stroke();
    }
    c.fillStyle = '#fff8e6'; c.strokeStyle = '#1d1426'; c.lineWidth = 2;
    c.beginPath(); c.arc(l.ax, l.ay, 4, 0, Math.PI * 2); c.fill(); c.stroke();
  }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const l of list) {
    if (!l) continue;
    c.font = LABEL_FONT(l.px);
    c.strokeStyle = '#fff8e6'; c.lineWidth = 5; c.strokeText(l.name, l.cx, l.cy + 1);
    c.fillStyle = '#1d1426'; c.fillText(l.name, l.cx, l.cy + 1);
  }
  c.textBaseline = 'alphabetic';
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function drawMarker(c, m, clamped, scale = 1) {
  c.scale(scale, scale);
  if (m.type === 'mission') {
    c.fillStyle = '#ffd23f'; c.strokeStyle = '#1d1426'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#1d1426'; c.font = 'bold 13px "Luckiest Guy", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('!', 0, 1);
  } else if (m.type === 'objective') {
    c.fillStyle = '#ffd23f'; c.strokeStyle = '#1d1426'; c.lineWidth = 2;
    c.beginPath();
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 4 : 9; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.stroke();
  } else if (m.type === 'enemy') {
    c.fillStyle = '#2e5e3e'; c.strokeStyle = '#fff'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill(); c.stroke();
  } else if (m.type === 'friend') {
    c.fillStyle = '#3ad8a0'; c.strokeStyle = '#1d1426'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill(); c.stroke();
  } else if (m.type === 'pryl') {
    c.fillStyle = '#f07a1e'; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
  } else if (m.type === 'fena') {
    c.fillStyle = '#1c7fb8'; c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill(); c.stroke();
  } else if (m.type === 'item') {
    c.fillStyle = '#ffffff'; c.strokeStyle = '#1d1426'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill(); c.stroke();
  }
}

// Render a character's head to an image for the dialogue box. The model is borrowed: its parent,
// position, rotation and scale are restored afterwards (seated characters stay in their seats).
export function renderPortrait(renderer, model, R = 0.3) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8a7a, 2.2));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2);
  dl.position.set(1, 2, 3);
  scene.add(dl);
  const holder = new THREE.Group();
  const r0 = model.root;
  const parent = r0.parent, pos = r0.position.clone(), rot = r0.rotation.clone(), scl = r0.scale.clone(), vis = r0.visible;
  holder.add(r0);
  scene.add(holder);
  r0.position.set(0, 0, 0);
  r0.rotation.set(0, 0.35, 0);
  r0.scale.setScalar(1);
  r0.visible = true;
  r0.updateMatrixWorld(true);
  const head = new THREE.Vector3();
  model.head.getWorldPosition(head);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
  const dist = (model.def.kind === 'monster' ? 2.6 : model.def.kind === 'wizard' ? 2.1 : 1.7) * (model.def.scale || 1);
  cam.position.set(head.x + 0.25, head.y + 0.05, head.z + dist);
  cam.lookAt(head.x, head.y - 0.05, head.z);
  const rt = new THREE.WebGLRenderTarget(160, 160, { colorSpace: THREE.SRGBColorSpace });
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, cam);
  const px = new Uint8Array(160 * 160 * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, 160, 160, px);
  renderer.setRenderTarget(null);
  const cv = document.createElement('canvas');
  cv.width = cv.height = 160;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(160, 160);
  for (let y = 0; y < 160; y++) img.data.set(px.subarray((159 - y) * 640, (160 - y) * 640), y * 640);
  ctx.putImageData(img, 0, 0);
  rt.dispose();
  holder.remove(r0);
  if (parent) parent.add(r0);
  r0.position.copy(pos); r0.rotation.copy(rot); r0.scale.copy(scl); r0.visible = vis;
  r0.updateMatrixWorld(true);
  return cv.toDataURL();
}
