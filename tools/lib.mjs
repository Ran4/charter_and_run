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
      // Retry: something (the trolley, a jolt) may knock him over before the talk lands.
      for (let tries = 0; tries < 6; tries++) {
        await ev(() => { const g = __game; if (g.playerCar) g.exitCar(true); if (g.player.seatId) g.standPlayer(); g.player.state = g.player.state === 'hidden' ? 'normal' : g.player.state; });
        // A knocked-over player ('flung', then 'down' for ~2 s; e.g. after M[3], where the auto
        // trolley keeps bowling him in the aisle as he gets up) cannot talk: move him to the
        // approach spot first (a downed body may be teleported), then wait until he is back on
        // his feet before the warps and E.
        await ev(() => { const g = __game, p = g.player; if (p.state === 'down' || p.state === 'flung') { const s = g.approachSpot(g.missions.current.at); p.teleport(s.x, s.z, s.yaw); g.cam.snapNext = true; } });
        const up = await T.until(() => __game.player.state === 'normal', 8000).then(() => true, () => false);
        if (!up) T.log('startMission: player still', await ev(() => __game.player.state));
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
        const ok = await T.until(() => __game.missions.state !== 'idle', 3000).then(() => true, () => false);
        if (ok) break;
        T.log('startMission: no talk yet, retrying', await ev(() => `${__game.player.state} ${__game.player.x.toFixed(1)},${__game.player.z.toFixed(1)}`));
        await sleep(800);
      }
      await T.until(() => __game.missions.state === 'running');
      T.log('started', await T.state());
    },
    async anyCar() {
      if (await ev(() => !!__game.playerCar)) return;
      await ev(() => {
        const g = __game, p = g.player;
        let best = null, bd = 1e9;
        // Never a golf cart (a toy, refused in a mission: DESIGN §10.40).
        for (const c of g.cars) { if (c.locked || c.dead || c.ai || c.noEnter || c.spec.toy) continue; const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < bd) { bd = d; best = c; } }
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

// Timer statistics for `calibrate` / `calibflight` (DESIGN §8 "Timers and difficulty").
// Percentile with linear interpolation between order statistics (h = (n − 1)·q). The nearest-rank
// form floor(q·n) returned the slowest run for n = 4, i.e. a worst case.
export const pct = (a, q) => { const s = a.slice().sort((x, y) => x - y), h = (s.length - 1) * q, i = Math.floor(h); return i + 1 < s.length ? s[i] + (h - i) * (s[i + 1] - s[i]) : s[i]; };
// The sampling range of a random stage's timer. The p75 of a dozen runs swings by several seconds
// between samples of the same code (Phase 3 r1: friskotek balls 31–38 over 12 runs, the jeep 35–42
// over 20), so one sample's timer is not the timer. A bootstrap (B resamples with replacement, a
// fixed seed, so the same runs always print the same range) gives the central 90 % of the timers
// the sample supports: a shipped timer inside it is consistent with the sample, one outside it
// disagrees. `toTimer(p75)` applies the stage's rule (§8), e.g. p => Math.ceil(1.25 * (p + 3)).
export function timerRange(ts, toTimer, { q = 0.75, B = 2000, seed = 1 } = {}) {
  if (ts.length < 2) return null;
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = new Array(B);
  for (let b = 0; b < B; b++) out[b] = toTimer(pct(ts.map(() => ts[Math.floor(rnd() * ts.length)]), q));
  out.sort((x, y) => x - y);
  return [out[Math.floor(0.05 * (B - 1))], out[Math.ceil(0.95 * (B - 1))]];
}

// Mission data checks (DESIGN §16.4 `missions`), run IN THE PAGE: T.ev(missionDataProblems) or
// T.ev(missionDataProblems, null, '/tools/fixtures/full-missions.js'). Every character key and
// landmark that any mission def references (def fields, stage options, lines, every cue field)
// must resolve; plane seats must exist; every checkpoint stage acting > 60 m from `at` needs retryAt.
// Returns a list of problems (empty = OK).
export async function missionDataProblems(_unused, fixtureUrl) {
  const g = __game, out = [];
  const defs = fixtureUrl ? (await import(fixtureUrl)).FULL_MISSIONS : window.__missions();
  const lmOk = (n) => { try { window.__lm(n); return true; } catch (e) { return false; } };
  const PHASES = ['gate', 'takeoff', 'climb', 'cruise', 'approach', 'landing', 'landed'], SKIES = ['day', 'night', 'sunset'];
  for (const d of defs) {
    const P = (what) => out.push(`${d.id}: ${what}`);
    const lm = (n, w) => { if (typeof n === 'string' && !lmOk(n)) P(`unknown landmark '${n}' (${w})`); else if (n && typeof n === 'object' && typeof n.at === 'string') lm(n.at, w); };
    const npc = (k, w) => { if (k && k !== 'stig' && !g.npc(k)) P(`unknown character '${k}' (${w})`); };
    const spk = (k, w) => { if (k && !g.charDef(k)) P(`unknown speaker '${k}' (${w})`); };
    const places = (m, w) => { for (const [k, v] of Object.entries(m || {})) { npc(k, w); if (Array.isArray(v)) lm(v[0], w); } };
    const cue = (c, w) => {
      if (!c || typeof c !== 'object') return;
      if (c.say) npc(c.say[0], `${w} say`);
      if (c.radio) spk(c.radio[0], `${w} radio`);
      if (c.place) places(c.place, `${w} place`);
      for (const k of [...(c.hide || []), ...(c.show || [])]) npc(k, `${w} hide/show`);
      if (c.anim) for (const k of [].concat(c.anim.who)) npc(k, `${w} anim`);
      if (c.outfit) npc(c.outfit.who, `${w} outfit`);
      if (c.cut) lm(c.cut, `${w} cut`);
      if (c.phase !== undefined) { const p = Array.isArray(c.phase) ? c.phase[0] : c.phase; if (!PHASES.includes(p)) P(`unknown phase '${p}' (${w})`); }
      if (c.sky !== undefined && !SKIES.includes(c.sky)) P(`unknown sky '${c.sky}' (${w})`);
    };
    const lines = (ls, w) => {
      if (!ls) return;
      if (!Array.isArray(ls)) { for (const [k, v] of Object.entries(ls)) lines(v, `${w}.${k}`); return; }
      for (const l of ls) {
        if (Array.isArray(l) && Array.isArray(l[0])) { lines(l, w); continue; }
        if (Array.isArray(l)) { spk(l[0], w); cue(l[2], w); }
      }
    };
    if (!['flight', 'island'].includes(d.level)) P(`bad level '${d.level}'`);
    npc(d.giver, 'giver');
    lm(d.at, 'at');
    for (const e of d.extra || []) npc(Array.isArray(e) ? e[0] : e, 'extra');
    places(d.outroPlace, 'outroPlace');
    for (const k of d.outroHide || []) npc(k, 'outroHide');
    if (Array.isArray(d.outroCam)) d.outroCam.forEach((k) => npc(k, 'outroCam')); else if (d.outroCam && d.outroCam !== 'player') lm(d.outroCam, 'outroCam');
    lines(d.intro, 'intro');
    lines(d.outro, 'outro');
    d.stages.forEach((f, i) => {
      const w = `stage ${i}`;
      let st;
      try { st = f(); } catch (e) { P(`${w}: factory threw ${e.message}`); return; }
      if (typeof st?.update !== 'function' || typeof st?.init !== 'function') { P(`${w}: not a stage`); return; }
      const o = st.o || {};
      for (const k of ['to', 'near', 'retryAt', 'start', 'spawn', 'finish']) lm(o[k], `${w} ${k}`);
      if (typeof o.at === 'string') lm(o.at, `${w} at`);
      if (o.area) lm(o.area.lm, `${w} area`);
      if (o.cam) lm(o.cam, `${w} cam`);
      for (const it of o.items || []) lm(it, `${w} items`);
      places(o.place, `${w} place`); places(o.findAt, `${w} findAt`); places(o.sendTo, `${w} sendTo`);
      for (const k of Object.keys(o.standAt || {})) npc(k, `${w} standAt`);
      for (const k of Object.keys(o.anim || {})) npc(k, `${w} anim`);
      for (const k of [...(o.frame || []), ...[].concat(o.who || []), o.duet, o.passenger, o.rider, ...(o.riders || []), o.partner, o.playerPassenger, o.oppPassenger]) npc(k, w);
      spk(o.driver, `${w} driver`);
      if (o.say) npc(o.say[0], `${w} say`);
      if (o.retryCar) { lm(o.retryCar.at, `${w} retryCar`); npc(o.retryCar.passenger, `${w} retryCar`); npc(o.retryCar.rider, `${w} retryCar`); }
      for (const s of [o.seat, o.seated]) if (s && !g.cabin.seats[s]) P(`${w}: unknown seat '${s}'`);
      lines(o.lines, `${w} lines`);
      for (const r of o.radio || []) if (Array.isArray(r)) { spk(r[0], `${w} radio`); cue(r[2], `${w} radio`); }
      for (const v of o.overhear || []) { lm(v.at, `${w} overhear`); lines(v.lines, `${w} overhear`); }
      for (const [, c] of [...(o.events || []), ...(o.timedCues || [])]) cue(c, `${w} timed`);
      for (const k of ['startCue', 'doneCue', 'useCue', 'fillCue']) cue(o[k], `${w} ${k}`);
      if (o.checkpoint && !o.retryAt && !o.checkpoints) {
        const at = window.__lm(d.at), to = o.to || o.at || o.near || o.area?.lm;
        const l = typeof to === 'string' && lmOk(to) ? window.__lm(to) : null;
        if (l && Math.hypot(l.x - at.x, l.z - at.z) > 60) P(`${w}: checkpoint > 60 m from at without retryAt`);
      }
    });
  }
  return out;
}
