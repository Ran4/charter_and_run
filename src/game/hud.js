// Everything drawn over the 3D view: coins, the Shame meter, objectives and timers, the
// minimap, dialogue with portraits, banners, toasts, speech bubbles, title and pause screens.

import { THREE, camera } from '../gfx.js';
import { MAP, N, P, HALF, RHW, rc, BOUND } from '../world/layout.js';
import { blocks, BOX, CIRCLE } from '../world/collision.js';
import { audio } from '../audio.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; parent?.appendChild(e); return e; };

let root, mapCanvas, mapCtx, baseMap;
const MAP_SCALE = 1.6; // px per metre on the base map
const MAP_EXT = BOUND + 20;

export const hud = {
  portraits: {},
  dialogActive: false,

  init() {
    root = $('hud');
    root.innerHTML = `
      <div id="coins"><span class="coin-icon"></span><span id="coin-n">0</span></div>
      <div id="collect"></div>
      <div id="shame"><div class="shame-label">SHAME</div><div class="shame-bar"><div class="shame-fill"></div><div class="shame-ticks"></div></div></div>
      <div id="objective"><div class="obj-title"></div><div class="obj-text"></div><div class="obj-timer"></div><div class="obj-bar"><div class="obj-bar-fill"></div><span class="obj-bar-label"></span></div></div>
      <div id="minimap-wrap"><canvas id="minimap" width="220" height="220"></canvas><div class="mm-n">N</div></div>
      <div id="speedo"><div class="sp-num">0</div><div class="sp-unit">MPH</div><div class="sp-hp"><div class="sp-hp-fill"></div></div><div class="sp-name"></div></div>
      <div id="prompt"></div>
      <div id="toasts"></div>
      <div id="banner"><div class="banner-main"></div><div class="banner-sub"></div></div>
      <div id="bubbles"></div>
      <div id="letterbox"><div class="lb-top"></div><div class="lb-bot"></div></div>
      <div id="dialog"><div class="dlg-portrait"><img alt=""></div><div class="dlg-body"><div class="dlg-name"></div><div class="dlg-text"></div></div><div class="dlg-next">E ▸</div></div>
      <div id="flash"></div>
      <div id="bigmap"><canvas width="760" height="760"></canvas><div class="bm-legend">M to close · <span class="lg-y">!</span> mission · <span class="lg-r">●</span> record · <span class="lg-g">●</span> mosquito</div></div>
    `;
    mapCanvas = $('minimap');
    mapCtx = mapCanvas.getContext('2d');
    this.coinEl = $('coin-n');
    this.shameFill = root.querySelector('.shame-fill');
    this.shameEl = $('shame');
    this.obj = $('objective');
    this.objTitle = root.querySelector('.obj-title');
    this.objText = root.querySelector('.obj-text');
    this.objTimer = root.querySelector('.obj-timer');
    this.objBar = root.querySelector('.obj-bar');
    this.objBarFill = root.querySelector('.obj-bar-fill');
    this.objBarLabel = root.querySelector('.obj-bar-label');
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

  // The static part of the minimap, drawn once from the town data.
  buildBaseMap() {
    const size = Math.ceil(MAP_EXT * 2 * MAP_SCALE);
    baseMap = document.createElement('canvas');
    baseMap.width = baseMap.height = size;
    const x = baseMap.getContext('2d');
    const W = (v) => (v + MAP_EXT) * MAP_SCALE;
    x.fillStyle = '#6fae4f';
    x.fillRect(0, 0, size, size);
    x.fillStyle = '#4a5058';
    x.fillRect(W(-HALF - RHW), W(-HALF - RHW), (2 * HALF + 2 * RHW) * MAP_SCALE, (2 * HALF + 2 * RHW) * MAP_SCALE);
    const colors = { res: '#8ccb62', school: '#c9a07a', field: '#5fb548', tower: '#86c75c', cinema: '#8a7a9a', glaser: '#9ac87a', mall: '#8a8a94', shops: '#8a8a94', park: '#7cc456', gas: '#8a8a94', construct: '#c09a64', cemetery: '#6aa04a', birch: '#8ccb62', gloub: '#8ccb62', jay: '#8ccb62', steve: '#8ccb62' };
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      x.fillStyle = '#c8c3b6';
      x.fillRect(W(rc(i) + RHW), W(rc(j) + RHW), (P - 2 * RHW) * MAP_SCALE, (P - 2 * RHW) * MAP_SCALE);
      x.fillStyle = colors[MAP[j][i]] || '#8ccb62';
      x.fillRect(W(rc(i) + RHW + 3.5), W(rc(j) + RHW + 3.5), (P - 2 * RHW - 7) * MAP_SCALE, (P - 2 * RHW - 7) * MAP_SCALE);
    }
    for (const b of blocks) {
      if (b.shape === BOX && (b.kind === 'building' || b.kind === 'garage' || b.kind === 'marquee')) {
        x.fillStyle = b.kind === 'building' ? '#e8e0d0' : '#d8d0c0';
        x.fillRect(W(b.minX), W(b.minZ), (b.maxX - b.minX) * MAP_SCALE, (b.maxZ - b.minZ) * MAP_SCALE);
        x.strokeStyle = '#5a4a5a';
        x.lineWidth = 1;
        x.strokeRect(W(b.minX), W(b.minZ), (b.maxX - b.minX) * MAP_SCALE, (b.maxZ - b.minZ) * MAP_SCALE);
      } else if (b.shape === CIRCLE && b.kind === 'water') {
        x.fillStyle = '#46b4e6';
        x.beginPath(); x.arc(W(b.x), W(b.z), b.r * MAP_SCALE, 0, Math.PI * 2); x.fill();
      }
    }
    // Centre lines.
    x.strokeStyle = '#f2c12e';
    x.lineWidth = 1;
    x.setLineDash([4, 4]);
    for (let k = 0; k <= N; k++) {
      x.beginPath(); x.moveTo(W(rc(k)), W(-HALF)); x.lineTo(W(rc(k)), W(HALF)); x.stroke();
      x.beginPath(); x.moveTo(W(-HALF), W(rc(k))); x.lineTo(W(HALF), W(rc(k))); x.stroke();
    }
    x.setLineDash([]);
  },

  setCoins(n) { this.coinEl.textContent = n; },
  bumpCoins() { this.coinEl.parentElement.classList.remove('bump'); void this.coinEl.offsetWidth; this.coinEl.parentElement.classList.add('bump'); },

  setShame(v, pursuit) {
    this.shameFill.style.width = `${Math.round(v)}%`;
    this.shameEl.classList.toggle('hot', v > 70);
    this.shameEl.classList.toggle('pursuit', !!pursuit);
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
    if (o.bar != null) {
      this.objBar.style.display = '';
      this.objBarFill.style.width = `${Math.round(Math.max(0, Math.min(1, o.bar)) * 100)}%`;
      this.objBarFill.style.background = o.barColor || '';
      this.objBarLabel.textContent = o.barLabel || '';
    } else this.objBar.style.display = 'none';
  },

  setSpeedo(car) {
    if (!car) { this.speedo.classList.remove('show'); return; }
    this.speedo.classList.add('show');
    this.speedo.querySelector('.sp-num').textContent = Math.round(Math.abs(car.forwardSpeed) * 2.237);
    const hp = car.hp / car.spec.hp;
    const f = this.speedo.querySelector('.sp-hp-fill');
    f.style.width = `${Math.round(hp * 100)}%`;
    f.style.background = hp > 0.5 ? '#5fd35f' : hp > 0.25 ? '#ffd23f' : '#ff4a3a';
    this.speedo.querySelector('.sp-name').textContent = car.name ? niceCarName(car) : car.spec.name;
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
  // Dialogue: lines of { who, text }. Resolves when the last line is dismissed.

  async runDialog(lines, game) {
    this.dialogActive = true;
    this.dialog.classList.add('show');
    for (const line of lines) {
      const def = game.charDef(line.who);
      const img = this.dialog.querySelector('img');
      img.src = this.portraits[line.who] || '';
      this.dialog.querySelector('.dlg-portrait').style.background = line.who === 'nick' ? '#4a9ad6' : def?.kind === 'monster' ? '#8a3ab8' : def?.kind === 'wizard' ? '#3a1a52' : '#ffd23f';
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
            acc += dt * 55;
            const n = Math.min(text.length, Math.floor(acc));
            if (n > shown) {
              shown = n;
              textEl.textContent = text.slice(0, shown);
              blip -= 1;
              if (blip <= 0 && /[a-z]/i.test(text[shown - 1])) { audio.talk(def?.voice || 300); blip = 2; }
            }
            if (shown >= text.length) { done = true; game.setTalker(null); }
          }
          if (game.input.pressed('skip')) {
            if (!done) { shown = text.length; textEl.textContent = text; done = true; game.setTalker(null); }
            else { skipped = true; }
          }
          if (skipped || (game.autoDialog && done && (acc += dt * 55) > text.length + 30)) { game.offFrame(step); resolve(); }
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
    const c = mapCtx, S = mapCanvas.width, R = S / 2;
    const zoom = 1.25;
    c.save();
    c.clearRect(0, 0, S, S);
    c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#6fae4f'; c.fillRect(0, 0, S, S);
    c.translate(R, R);
    c.rotate(camYaw + Math.PI);
    c.scale(zoom / MAP_SCALE, zoom / MAP_SCALE);
    c.drawImage(baseMap, -(px + MAP_EXT) * MAP_SCALE, -(pz + MAP_EXT) * MAP_SCALE);
    c.restore();
    c.save();
    c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI * 2); c.clip();
    c.translate(R, R);
    c.rotate(camYaw + Math.PI);
    const k = zoom;
    if (route && route.length > 1) {
      c.strokeStyle = 'rgba(255,210,63,0.9)';
      c.lineWidth = 4 / 1;
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
    // North marker orbiting the rim.
    const n = this._north ||= document.querySelector('.mm-n');
    const a = camYaw + Math.PI;
    n.style.transform = `translate(${Math.sin(-a) * 0 + Math.cos(a - Math.PI / 2) * (R - 6)}px, ${Math.sin(a - Math.PI / 2) * (R - 6)}px)`;
  },

  toggleBigMap(on, game) {
    this.bigmap.classList.toggle('show', on);
    if (!on) return;
    const cv = this.bigmap.querySelector('canvas');
    const c = cv.getContext('2d');
    // Crop to the town itself.
    const E = HALF + 16, S = cv.width, k = S / (2 * E);
    c.clearRect(0, 0, S, S);
    c.drawImage(baseMap, (MAP_EXT - E) * MAP_SCALE, (MAP_EXT - E) * MAP_SCALE, 2 * E * MAP_SCALE, 2 * E * MAP_SCALE, 0, 0, S, S);
    const toC = (x, z) => [(x + E) * k, (z + E) * k];
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
    this.bigmap.querySelector('.bm-legend').innerHTML = `M to close · <span class="lg-y">!</span> next mission · Duke's records <b>${game.got.records.size}/7</b> · Anxiety mosquitoes <b>${game.got.mosquitoes.size}/7</b>`;
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
    c.fillStyle = '#a03ad8'; c.strokeStyle = '#fff'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill(); c.stroke();
  } else if (m.type === 'friend') {
    c.fillStyle = '#3ad8a0'; c.strokeStyle = '#1d1426'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill(); c.stroke();
  } else if (m.type === 'record') {
    c.fillStyle = '#ff5a6a'; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
  } else if (m.type === 'mosquito') {
    c.fillStyle = '#5fd35f'; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
  } else if (m.type === 'item') {
    c.fillStyle = '#ffffff'; c.strokeStyle = '#1d1426'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill(); c.stroke();
  }
}

function niceCarName(car) {
  return { birchWagon: "Birches' Wagon", martySedan: "Marty's Sedan", steveVan: "Coach's Van", glaserHatch: "Glaser Hatchback", schoolBus: 'School Bus' }[car.name] || car.spec.name;
}

// Render a character's head to an image for the dialogue box.
export function renderPortrait(renderer, model, R = 0.3) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8a7a, 2.2));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2);
  dl.position.set(1, 2, 3);
  scene.add(dl);
  const holder = new THREE.Group();
  const parent = model.root.parent;
  holder.add(model.root);
  scene.add(holder);
  model.root.position.set(0, 0, 0);
  model.root.rotation.set(0, 0.35, 0);
  model.root.updateMatrixWorld(true);
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
  if (parent) parent.add(model.root); else holder.remove(model.root);
  return cv.toDataURL();
}
