// The headless harness (DESIGN §16.2): serves the game, loads it in headless Chrome (real GPU via
// ANGLE, no window) and hands scenarios the T API. Used by tools/shot.mjs.
//   T = { page, ev, frames, sleep, shot, hold(keys, ms), tap(key), fresh(query), until(fn, timeout, ...args),
//         warp(x, z, yaw), L(name), state(), log(...), startMission(), anyCar(), enterNamed(name),
//         waitIdle(idx), holdUntil(key, fnDone, timeout), sit(seatId), out, port }
import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

export async function launch({ port, out, w = 1280, h = 720 }) {
  fs.mkdirSync(out, { recursive: true });
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
      const idx = path.join(p, 'index.html');
      if (fs.existsSync(idx)) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(fs.readFileSync(idx)); }
      res.writeHead(404); return res.end();
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(fs.readFileSync(p));
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl', `--window-size=${w},${h}`, '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || m.type() === 'warning' || t.startsWith('[t]')) { console.log(`[${m.type()}]`, t.slice(0, 500)); if (m.type() === 'error') errors.push(t); }
  });
  page.on('pageerror', (e) => { console.log('[pageerror]', e.message, e.stack?.split('\n').slice(0, 4).join(' | ')); errors.push(e.message); });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const frames = async (n) => { const f0 = await page.evaluate(() => window.__frame); await page.waitForFunction(`window.__frame >= ${f0 + n}`, { timeout: 60000, polling: 50 }); };

  const T = {
    page, ev, frames, sleep, out, port, errors,
    async fresh(query = '') {
      const t0 = Date.now();
      await page.goto(`http://127.0.0.1:${port}/index.html?test=1&fresh=1${process.env.QUERY || ''}${query}`, { waitUntil: 'load' });
      try { await page.waitForFunction('window.__ready === true', { timeout: 120000, polling: 250 }); }
      catch (e) { console.log('never became ready:', await page.evaluate(() => document.getElementById('loading')?.textContent)); throw e; }
      console.log('ready after', ((Date.now() - t0) / 1000).toFixed(1), 's');
      // Let the title card finish fading out (0.6 s) so screenshots are clean.
      await page.waitForFunction(() => { const t = document.getElementById('title'); return !t || getComputedStyle(t).opacity === '0'; }, { timeout: 5000, polling: 100 }).catch(() => {});
    },
    async shot(name) { await frames(3); await page.screenshot({ path: path.join(out, name + '.png') }); console.log('saved', name); },
    async hold(keys, ms) { for (const k of keys) await page.keyboard.down(k); await sleep(ms); for (const k of keys) await page.keyboard.up(k); },
    async tap(k) { await page.keyboard.down(k); await frames(2); await page.keyboard.up(k); await frames(1); },
    until(fn, timeout = 90000, ...args) { return page.waitForFunction(fn, { timeout, polling: 100 }, ...args); },
    warp(x, z, yaw = 0) { return ev((x, z, yaw) => __game.debugWarp(x, z, yaw), x, z, yaw); },
    L(name) { return ev((n) => window.__lm(n), name); },
    state() { return ev(() => { const m = __game.missions; return `#${m.index} ${m.state} stage ${m.stageI ?? '-'} ${m.stage?.sub || m.stage?.text || ''}`; }); },
    log(...a) { console.log('[t]', ...a); },
    // Walk up to the current mission's giver and talk (race-proof: warp to `at`, then to the giver).
    async startMission() {
      await frames(3);
      await ev(() => { const g = __game; if (g.playerCar) g.exitCar(true); if (g.player.seatId) g.standPlayer(); });
      await ev(() => { const g = __game, s = g.approachSpot(g.missions.current.at); g.debugWarp(s.x, s.z, s.yaw); });
      await frames(3);
      await ev(() => {
        const g = __game, n = g.npc(g.missions.current.giver), p = g.player;
        if (n.state !== 'seated' && Math.hypot(n.x - p.x, n.z - p.z) > 3) {
          const s = g.freeSpot(n.x, n.z, 1.2, 2.2);
          g.debugWarp(s.x, s.z, Math.atan2(n.x - s.x, n.z - s.z));
        }
      });
      await frames(3);
      await T.tap('KeyE');
      await T.until(() => __game.missions.state === 'running');
      T.log('started', await T.state());
    },
    async anyCar() {
      if (await ev(() => !!__game.playerCar)) return;
      await ev(() => {
        const g = __game, p = g.player;
        let best = null, bd = 1e9;
        for (const c of g.cars) { if (c.locked || c.dead || c.ai || c.noEnter) continue; const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < bd) { bd = d; best = c; } }
        if (best) { best.place(p.x + 3, p.z, best.yaw); g.enterCar(best); }
      });
      await frames(5);
    },
    async enterNamed(name) { await ev((n) => { const g = __game; g.enterCar(g.ensureNamedCar(n)); }, name); await frames(5); },
    async waitIdle(idx) {
      await page.waitForFunction((i) => __game.missions.state === 'idle' && __game.missions.index === i, { timeout: 90000, polling: 100 }, idx);
      T.log('done ->', await T.state(), 'coins', await ev(() => __game.coins));
    },
    async holdUntil(key, fnDone, timeout = 60000) {
      await page.keyboard.down(key);
      try { await T.until(fnDone, timeout); } finally { await page.keyboard.up(key); }
    },
    sit(seatId) { return ev((id) => __game.sitPlayer(id), seatId); },
    async fps() { const a = await ev(() => window.__frame); await sleep(2000); const b = await ev(() => window.__frame); return ((b - a) / 2).toFixed(0); },
  };

  const close = async () => { await browser.close(); server.close(); };
  return { T, errors, close, page };
}

// A throwing assertion for scenarios.
export function check(cond, msg) { if (!cond) throw new Error('check failed: ' + msg); }
