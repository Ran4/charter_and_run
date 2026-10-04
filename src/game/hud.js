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

let root, mapCanvas, mapCtx;
const MAP_SCALE = 1.6; // px per metre on the town base map
const MAP_EXT = BOUND + 20;

export const hud = {
  portraits: {},
  dialogActive: false,
  src: null,

  init() {
    root = $('hud');
    root.innerHTML = `
      <div id="coins"><span class="coin-icon"></span><span id="coin-n">0 pta</span></div>
      <div id="collect"></div>
      <div id="shame"><div class="shame-label"></div><div class="shame-bar"><div class="shame-fill"></div><div class="shame-ticks"></div></div></div>
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

  // The level's meter: value 0..100, hot (>= cfg.hot), pursuit (SKANDAL only).
  setMeter(v, hot, pursuit) {
    this.shameFill.style.width = `${Math.round(v)}%`;
    this.shameEl.classList.toggle('hot', !!hot);
    this.shameEl.classList.toggle('pursuit', !!pursuit);
  },
  setMeterLabel(text, cls = '') {
    this.shameLabel.textContent = text;
    this.shameEl.className = cls ? `meter-${cls}` : '';
    this.shameEl.dataset.cls = cls;
  },
  // FLYGRÄDSLA 0..1: drives the body.fear-hot vignette (>= 0.7) and a --fear CSS variable.
  setFear(v01) {
    document.body.style.setProperty('--fear', String(Math.max(0, Math.min(1, v01))));
    document.body.classList.toggle('fear-hot', v01 >= 0.7);
  },

  setObjective(o) {
    if (!o) { this.obj.classList.remove('show'); return; }
    this.obj.classList.add('show');
    this.objTitle.textContent = o.title || '';
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
        this.objZone.style.display = '';
        this.objZone.style.left = `${o.zone[0] * 100}%`;
        this.objZone.style.width = `${Math.max(0, o.zone[1] - o.zone[0]) * 100}%`;
      } else this.objZone.style.display = 'none';
      if (o.marker != null) {
        this.objMarker.style.display = '';
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

  toast(text, cls = '') {
    const t = el('div', 'toast ' + cls, this.toastsEl, text);
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2800);
  },

  showBanner(main, sub = '', cls = '', ms = 2600) {
    clearTimeout(this._bannerT);
    this.banner.className = 'show ' + cls;
    this.banner.querySelector('.banner-main').textContent = main;
    this.banner.querySelector('.banner-sub').textContent = sub;
    if (ms) this._bannerT = setTimeout(() => this.hideBanner(), ms);
  },
  hideBanner() { this.banner.className = ''; },

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
    const speed = game.dialogSpeed || 55, pad = game.testMode ? 8 : 30;
    for (const line of lines) {
      if (line.cue) game.cue(line.cue);
      const def = game.charDef(line.who);
      const img = this.dialog.querySelector('img');
      img.src = this.portraits[line.who] || '';
      this.dialog.querySelector('.dlg-portrait').style.background = def?.ring || '#ffd23f';
      this.dialog.querySelector('.dlg-name').textContent = def?.name || line.who;
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
    this.dialogActive = false;
  },

  // Speech bubbles over characters in the world.
  say(target, text, secs = 2) {
    if (!target) return;
    const b = el('div', 'bubble', this.bubbles, text);
    const item = { b, target, until: performance.now() + secs * 1000 };
    (this._bubbles ||= []).push(item);
  },
  tickBubbles() {
    const list = this._bubbles || [];
    const now = performance.now();
    const v = new THREE.Vector3();
    for (let k = list.length - 1; k >= 0; k--) {
      const it = list[k];
      if (now > it.until) { it.b.remove(); list.splice(k, 1); continue; }
      const t = it.target;
      if (t.state === 'hidden') { it.b.style.display = 'none'; continue; }
      v.set(t.x, t.y + (t.height || 2) + 0.6, t.z);
      v.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { it.b.style.display = 'none'; continue; }
      it.b.style.display = '';
      it.b.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
      it.b.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
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
    n.style.transform = `translate(${Math.cos(a - Math.PI / 2) * (R - 6)}px, ${Math.sin(a - Math.PI / 2) * (R - 6)}px)`;
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
    c.drawImage(src.canvas, (cr.x0 - src.x0) * src.scale, (cr.z0 - src.z0) * src.scale, w * src.scale, h * src.scale, ox, oz, w * k, h * k);
    const toC = (x, z) => [ox + (x - cr.x0) * k, oz + (z - cr.z0) * k];
    for (const m of game.mapMarkers(true)) {
      const [x, y] = toC(m.x, m.z);
      c.save(); c.translate(x, y); drawMarker(c, m, false, 1.3); c.restore();
    }
    const p = game.focus();
    const [x, y] = toC(p.x, p.z);
    c.save(); c.translate(x, y); c.rotate(-p.yaw + Math.PI);
    c.fillStyle = '#fff'; c.strokeStyle = '#1d1426'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -10); c.lineTo(8, 8); c.lineTo(0, 3); c.lineTo(-8, 8); c.closePath(); c.fill(); c.stroke();
    c.restore();
    c.font = '17px "Luckiest Guy", Impact, sans-serif';
    c.textAlign = 'center';
    c.lineJoin = 'round';
    for (const [name, lx, lz] of game.mapLabels()) {
      const [x2, y2] = toC(lx, lz);
      c.strokeStyle = '#fff8e6'; c.lineWidth = 5; c.strokeText(name, x2, y2 - 12);
      c.fillStyle = '#1d1426'; c.fillText(name, x2, y2 - 12);
    }
    this.bigmap.querySelector('.bm-legend').innerHTML = game.mapLegend();
  },
};

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
