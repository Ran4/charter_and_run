// Headless driver: serves the game, loads it in headless Chrome (real GPU via ANGLE, no window),
// runs a scenario and saves screenshots to out/.
//   node tools/shot.mjs <scenario> [more scenarios...]   (see SCENARIOS below)
import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// OUT=dir puts screenshots elsewhere (parallel runs must not share a dir or a PORT).
const OUT = process.env.OUT ? path.resolve(process.env.OUT) : path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
const PORT = +(process.env.PORT || 8841);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
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
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl', `--window-size=${W},${H}`, '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' || m.type() === 'warning' || t.startsWith('[t]')) { console.log(`[${m.type()}]`, t.slice(0, 500)); if (m.type() === 'error') errors.push(t); }
});
page.on('pageerror', (e) => { console.log('[pageerror]', e.message, e.stack?.split('\n').slice(0, 4).join(' | ')); errors.push(e.message); });

async function fresh(query = '') {
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1&fresh=1${process.env.QUERY || ''}${query}`, { waitUntil: 'load' });
  try { await page.waitForFunction('window.__ready === true', { timeout: 120000, polling: 250 }); }
  catch (e) { console.log('never became ready:', await page.evaluate(() => document.getElementById('loading')?.textContent)); }
  console.log('ready after', ((Date.now() - t0) / 1000).toFixed(1), 's');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = async (n) => { const f0 = await page.evaluate(() => window.__frame); await page.waitForFunction(`window.__frame >= ${f0 + n}`, { timeout: 60000, polling: 50 }); };
const shot = async (name) => { await frames(3); await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('saved', name); };
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const hold = async (keys, ms) => { for (const k of keys) await page.keyboard.down(k); await sleep(ms); for (const k of keys) await page.keyboard.up(k); };
const tap = async (k) => { await page.keyboard.down(k); await frames(2); await page.keyboard.up(k); await frames(1); };

const fps = async () => { const a = await ev(() => window.__frame); await sleep(2000); const b = await ev(() => window.__frame); return ((b - a) / 2).toFixed(0); };

const SCENARIOS = {
  async start() {
    await frames(30);
    console.log('fps ~', await fps());
    console.log('[t] stats', JSON.stringify(await ev(() => window.__stats())));
    await shot('start');
  },
  async views() {
    const L = ['birch', 'gloub', 'school', 'mall', 'pizza', 'park', 'gas', 'cinema', 'glaser', 'jay', 'steve', 'cemetery', 'construct', 'tower', 'field'];
    for (const l of L) {
      await ev((l) => { const g = __game; const p = g.player; const m = window.__lm(l); p.teleport(m.x, m.z, m.yaw); g.cam.yaw = m.yaw + Math.PI; g.cam.pitch = 0.35; g.cam.snapNext = true; }, l);
      await frames(20);
      await shot('view_' + l);
    }
  },
  async aerial() {
    await ev(() => { __game.aerial = true; });
    await frames(10);
    await shot('aerial');
  },
  async drive() {
    await ev(() => { const g = __game; const c = g.named.birchWagon; const p = g.player; p.teleport(c.x + 2, c.z, 0); });
    await frames(5);
    await tap('KeyE');
    await frames(10);
    console.log('[t] in car', await ev(() => !!__game.playerCar));
    await shot('drive_0');
    await hold(['KeyW'], 1500);
    await shot('drive_1');
    await hold(['KeyW', 'KeyD'], 1200);
    await shot('drive_2');
    await hold(['KeyW'], 2500);
    console.log('[t] car', JSON.stringify(await ev(() => { const c = __game.playerCar; return { x: c.x.toFixed(1), z: c.z.toFixed(1), v: c.speed.toFixed(1), hp: c.hp.toFixed(0) }; })));
    await shot('drive_3');
  },
  async walk() {
    await hold(['KeyW'], 1200);
    await shot('walk_0');
    await tap('Space');
    await frames(8);
    await shot('walk_jump');
    await tap('KeyJ');
    await frames(6);
    await shot('walk_kick');
  },
  // Play the whole story through with debug warps, checking each mission starts and finishes.
  async story() {
    const until = (fn, timeout = 90000) => page.waitForFunction(fn, { timeout, polling: 100 });
    const warp = (x, z, yaw = 0) => ev((x, z, yaw) => __game.debugWarp(x, z, yaw), x, z, yaw);
    const L = (n) => ev((n) => window.__lm(n), n);
    const state = () => ev(() => { const m = __game.missions; return `#${m.index} ${m.state} stage ${m.stageI ?? '-'} ${m.stage?.sub || m.stage?.text || ''}`; });
    const startMission = async () => {
      const g = await ev(() => { const n = __game.npc(__game.missions.current.giver); return { x: n.x, z: n.z }; });
      if (await ev(() => !!__game.playerCar)) await ev(() => __game.exitCar(true));
      await warp(g.x + 1.2, g.z + 1.2);
      await frames(3);
      await tap('KeyE');
      await until(() => __game.missions.state === 'running');
      console.log('[t] started', await state());
    };
    const anyCar = async () => {
      if (await ev(() => !!__game.playerCar)) return;
      await ev(() => {
        const g = __game, p = g.player;
        let best = null, bd = 1e9;
        for (const c of g.cars) { if (c.locked || c.dead || c.ai) continue; const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < bd) { bd = d; best = c; } }
        g.enterCar(best);
      });
      await frames(5);
    };
    const finish = async (i) => { await until(() => __game.missions.state === 'idle' && __game.missions.index === arguments[0], 60000).catch(() => {}); };
    const waitIdle = async (idx) => { await page.waitForFunction((i) => __game.missions.state === 'idle' && __game.missions.index === i, { timeout: 90000, polling: 100 }, idx); console.log('[t] done ->', await state(), 'coins', await ev(() => __game.coins)); };

    const from = +(process.env.FROM || 0);
    if (from) await fresh(`&mission=${from}`);
    const M = [];
    // 1: wagon to Andrew's.
    M.push(async () => {
    await startMission();
    await ev(() => __game.enterCar(__game.named.birchWagon));
    await until(() => __game.missions.stageI >= 1);
    const m = await L('gloub');
    await warp(m.x - Math.sin(m.yaw) * -4, m.z - Math.cos(m.yaw) * -4, m.yaw);
    await waitIdle(1);
    await shot('m1_done');
    });

    // 2: pick Andrew up, beat the bell.
    M.push(async () => {
    await startMission();
    await anyCar();
    console.log('[t] m2 car?', await ev(() => { const g = __game; return `${!!g.playerCar} ${g.playerCar?.type} player=${g.player.state} stage=${g.missions.stageI} ${g.missions.state}`; }));
    await sleep(1000);
    console.log('[t] m2 car?', await ev(() => { const g = __game; return `${!!g.playerCar} ${g.playerCar?.type} player=${g.player.state} stage=${g.missions.stageI} ${g.missions.state} ${g.missions.stage?.sub}`; }));
    await until(() => __game.missions.stageI >= 1);
    const a = await ev(() => { const n = __game.npc('andrew'); return { x: n.x, z: n.z }; });
    await warp(a.x + 3, a.z + 3);
    await until(() => __game.missions.stageI >= 2);
    console.log('[t] andrew aboard', await ev(() => __game.npc('andrew').car === __game.playerCar));
    await shot('m2_pickup');
    const m = await L('school');
    await warp(m.x, m.z, 0);
    await waitIdle(2);
    });

    // 3: follow Coach Steve.
    // Let him drive a while, then fast-forward.
    M.push(async () => {
    await startMission();
    await anyCar();
    await until(() => __game.missions.stageI >= 1);
    const v = await ev(() => { const c = __game.missions.stage.car; return { x: c.x, z: c.z }; });
    await warp(v.x + 8, v.z - 6, 0);
    await sleep(6000);
    console.log('[t] follow', await state(), await ev(() => { const c = __game.missions.stage.car; return `van at ${c.x.toFixed(0)},${c.z.toFixed(0)} v=${c.speed.toFixed(1)}`; }));
    await shot('m3_follow');
    for (let k = 0; k < 40; k++) {
      const done = await ev(() => __game.missions.state !== 'running' || __game.missions.stageI !== 1);
      if (done) break;
      await ev(() => { const g = __game, c = g.missions.stage.car; g.debugWarp(c.x - Math.sin(c.yaw) * 12, c.z - Math.cos(c.yaw) * 12, c.yaw); });
      await sleep(1500);
    }
    console.log('[t] after follow', await state());
    await waitIdle(3);
    });

    // 4: rabbits.
    M.push(async () => {
    await startMission();
    await shot('m4_rabbits');
    for (let k = 0; k < 6; k++) {
      await ev(() => { const g = __game, r = g.missions.stage.list.find((r) => r.alive); if (r) g.debugWarp(r.x, r.z); });
      await frames(4);
    }
    await until(() => __game.missions.stageI >= 1);
    const m = await L('jay');
    await warp(m.x, m.z);
    await waitIdle(4);
    });

    // 5: the race.
    // Watch Jessi go, then hop between checkpoints.
    M.push(async () => {
    await startMission();
    await anyCar();
    await until(() => __game.missions.stageI >= 1);
    await sleep(6000);
    console.log('[t] race', await state(), await ev(() => { const s = __game.missions.stage, o = s.opp; return `opp ${o.x.toFixed(0)},${o.z.toFixed(0)} v=${o.speed.toFixed(1)} oi=${s.oi}`; }));
    await shot('m5_race');
    for (let k = 0; k < 8; k++) {
      const r = await ev(() => { const g = __game, s = g.missions.stage; if (!s || !s.cps) return 'gone'; const c = s.cps[s.pi]; if (c) g.debugWarp(c.x, c.z, g.playerCar.yaw); return s.pi; });
      if (r === 'gone') break;
      await frames(5);
    }
    await waitIdle(5);
    });

    // 6: wreck the hearse.
    M.push(async () => {
    await startMission();
    await anyCar();
    await until(() => __game.missions.stageI >= 1);
    await sleep(4000);
    console.log('[t] hearse', await ev(() => { const c = __game.missions.stage.car; return `at ${c.x.toFixed(0)},${c.z.toFixed(0)} v=${c.speed.toFixed(1)}`; }));
    await shot('m6_hearse');
    await ev(() => __game.missions.stage.car.damage(999, __game));
    console.log('[t] after wreck', await state());
    await until(() => __game.missions.stageI >= 2).catch(async (e) => { console.log('[t] stuck at', await state()); throw e; });
    await ev(() => { const g = __game, it = g.missions.stage.item; g.debugWarp(it.x, it.z); });
    console.log('[t] at item', await state(), await ev(() => { const g = __game, it = g.missions.stage?.item, f = g.focus(); return it ? `item ${it.x.toFixed(1)},${it.y.toFixed(1)},${it.z.toFixed(1)} focus ${f.x.toFixed(1)},${f.y.toFixed(1)},${f.z.toFixed(1)}` : '-'; }));
    await waitIdle(6).catch(async (e) => { console.log('[t] stuck at', await state()); throw e; });
    console.log('[t] muscle car', await ev(() => !!__game.named.muscle));
    });

    // 7: the dance, with the Wizard in pursuit.
    M.push(async () => {
    await startMission();
    await anyCar();
    await until(() => __game.missions.stageI >= 1);
    await sleep(3000);
    console.log('[t] pursuit', await ev(() => `${__game.shame.pursuit} hearses=${__game.shame.hearses.length}`));
    const a2 = await ev(() => { const n = __game.npc('andrew'); return { x: n.x, z: n.z }; });
    await warp(a2.x + 3, a2.z + 3);
    await until(() => __game.missions.stageI >= 2);
    await sleep(2500);
    await shot('m7_chase');
    const m = await L('gym');
    await warp(m.x, m.z);
    await waitIdle(7);
    await shot('m7_done');
    });
    for (let k = from; k < M.length; k++) await M[k]();
  },

  // Mission 3 on its own, logging what Coach Steve's van is doing.
  async m3() {
    await fresh('&mission=2');
    const n = await ev(() => { const n = __game.npc('steve'); return { x: n.x, z: n.z }; });
    await ev((n) => __game.debugWarp(n.x + 1, n.z + 1), n);
    await frames(3);
    await tap('KeyE');
    await page.waitForFunction(() => __game.missions.state === 'running', { timeout: 60000 });
    await ev(() => { const g = __game; let best = null, bd = 1e9; for (const c of g.cars) { if (c.locked || c.dead || c.ai) continue; const d = Math.hypot(c.x - g.player.x, c.z - g.player.z); if (d < bd) { bd = d; best = c; } } g.enterCar(best); });
    await frames(10);
    for (let k = 0; k < 30; k++) {
      // Keep the player politely behind the van.
      await ev(() => { const g = __game, c = g.missions.stage?.car; if (!c) return; g.debugWarp(c.x - Math.sin(c.yaw) * 14, c.z - Math.cos(c.yaw) * 14, c.yaw); });
      await sleep(1000);
      const info = await ev(() => { const g = __game, s = g.missions.stage; if (!s?.car) return g.missions.state; const c = s.car, ai = c.ai, p = ai?.path; return `van ${c.x.toFixed(0)},${c.z.toFixed(0)} v=${c.speed.toFixed(1)} yaw=${c.yaw.toFixed(2)} idx=${p?.idx}/${p?.pts.length} built=${p?.built}/${p?.nodes.length} cruise=${ai?.cruise} thr=${c.ctrl.throttle.toFixed(2)} brk=${c.ctrl.brake.toFixed(2)} st=${c.ctrl.steer.toFixed(2)} blocked=${ai?.blockedT.toFixed(1)} rev=${ai?.reverseT.toFixed(1)} arrived=${s.arrived}`; });
      console.log('[t]', k, info);
      if (typeof info === 'string' && !info.startsWith('van')) break;
    }
    await shot('m3_debug');
  },

  // Drive the wagon through mailboxes and pedestrians until the Shame Wizard shows up.
  async chaos() {
    await ev(() => { const g = __game; g.enterCar(g.named.birchWagon); });
    await frames(5);
    // Point down the street and floor it, swerving.
    await ev(() => { const g = __game, c = g.playerCar; c.place(c.x, c.z - 8, Math.PI / 2); });
    for (let k = 0; k < 6; k++) {
      await hold(['KeyW', k % 2 ? 'KeyA' : 'KeyD'], 700);
      await hold(['KeyW'], 500);
    }
    console.log('[t] shame', await ev(() => __game.shame.v.toFixed(0)), 'coins', await ev(() => __game.coins));
    await shot('chaos_0');
    // Force the pursuit to see the hearses.
    await ev(() => __game.shame.add(100));
    await sleep(3500);
    await shot('chaos_1');
    console.log('[t] hearses', await ev(() => __game.shame.hearses.map((h) => `${h.x.toFixed(0)},${h.z.toFixed(0)} v=${h.speed.toFixed(1)}`).join(' | ')));
    await sleep(5000);
    console.log('[t] hearses', await ev(() => __game.shame.hearses.map((h) => `${h.x.toFixed(0)},${h.z.toFixed(0)} v=${h.speed.toFixed(1)}`).join(' | ')), 'player', await ev(() => { const c = __game.focus(); return `${c.x.toFixed(0)},${c.z.toFixed(0)}`; }));
    await shot('chaos_2');
    // Get out and run: the Wizard floats after you.
    await ev(() => __game.exitCar(true));
    await sleep(3000);
    await shot('chaos_3');
    console.log('[t] wizard', await ev(() => { const w = __game.shame.wizard; return w ? `${w.x.toFixed(0)},${w.z.toFixed(0)}` : 'none'; }), 'pursuit', await ev(() => __game.shame.pursuit), 'coins', await ev(() => __game.coins));
  },

  // Ram a mailbox and a pedestrian; check that things break, coins fly and shame rises.
  async smash() {
    const r = await ev(() => {
      const g = __game, car = g.named.birchWagon;
      g.enterCar(car);
      // Nearest intact mailbox to the wagon.
      let best = null, bd = 1e9;
      for (const p of window.__props) if (p.alive && p.type === 'mailbox') { const d = Math.hypot(p.x - car.x, p.z - car.z); if (d < bd && d > 10) { bd = d; best = p; } }
      // Line the car up 14 m before it, heading straight at it along the sidewalk axis.
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      let ok = null;
      for (const [dx, dz] of dirs) {
        const x = best.x - dx * 14, z = best.z - dz * 14;
        if (g.spotFree(x, z)) { ok = { x, z, yaw: Math.atan2(dx, dz) }; break; }
      }
      car.place(ok.x, ok.z, ok.yaw);
      window.__target = best;
      return { prop: [best.x.toFixed(1), best.z.toFixed(1)], from: ok };
    });
    console.log('[t] target', JSON.stringify(r));
    await frames(5);
    await shot('smash_0');
    await hold(['KeyW'], 1600);
    await frames(10);
    await shot('smash_1');
    console.log('[t] mailbox alive?', await ev(() => window.__target.alive), 'shame', await ev(() => __game.shame.v.toFixed(1)));
    await sleep(1500);
    console.log('[t] coins', await ev(() => __game.coins));
    // Now a pedestrian steps in front of the car.
    await ev(() => {
      const g = __game, c = g.playerCar, ped = g.peds[0].char;
      c.vx = c.vz = 0; c.w = 0;
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      ped.teleport(c.x + fx * 12, c.z + fz * 12);
      ped.state = 'normal';
      g.peds[0].idleT = 5;
      window.__ped = ped;
    });
    await hold(['KeyW'], 1300);
    await frames(4);
    await shot('smash_2');
    console.log('[t] ped', await ev(() => window.__ped.state), 'shame', await ev(() => __game.shame.v.toFixed(1)));
    await sleep(1200);
    await shot('smash_3');
  },

  // Let traffic run for a minute and report cars that have stopped moving.
  async traffic() {
    const snap = () => ev(() => __game.cars.filter((c) => c.traffic && !c.dead).map((c) => ({ x: c.x, z: c.z, v: c.speed })));
    const a = await snap();
    await sleep(30000);
    const b = await snap();
    await sleep(30000);
    const c = await snap();
    const moved = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);
    let stuck = 0;
    const n = Math.min(a.length, b.length, c.length);
    for (let k = 0; k < n; k++) if (moved(b[k], c[k]) < 5) { stuck++; console.log('[t] stuck car at', c[k].x.toFixed(0), c[k].z.toFixed(0), 'v', c[k].v.toFixed(1)); }
    console.log('[t] traffic cars', n, 'stuck', stuck, 'avg speed', (c.reduce((s, q) => s + q.v, 0) / c.length).toFixed(1));
    console.log('[t] fps', await fps());
    await ev(() => { __game.aerial = true; });
    await frames(5);
    await shot('traffic_aerial');
    await ev(() => { __game.aerial = false; });
    await tap('KeyM');
    await frames(12);
    await shot('bigmap');
  },

  // On-foot stuff: trampoline to a record, kick a mosquito, stand on a car roof.
  async foot() {
    await ev(() => { const g = __game, t = window.__lm('jayTramp'); g.player.teleport(t.x, t.z); g.player.y = 2.5; g.player.onGround = false; });
    let maxY = 0;
    for (let k = 0; k < 40; k++) { await frames(2); maxY = Math.max(maxY, await ev(() => __game.player.y)); }
    console.log('[t] bounce max y', maxY.toFixed(2), 'records', await ev(() => __game.got.records.size));
    await ev(() => { const g = __game, t = window.__lm('jayTramp'); g.player.teleport(t.x, t.z); g.player.y = 2.5; g.player.onGround = false; g.cam.pitch = 0.1; });
    await frames(14);
    await shot('foot_bounce');
    // Mosquito: stand under it and kick.
    const m = await ev(() => { const g = __game, m = g.mosquitoes[0], p = m.mesh.position; g.player.teleport(p.x - 0.8, p.z, Math.PI / 2); return [p.x, p.y, p.z]; });
    await frames(2);
    await ev(() => { const g = __game, m = g.mosquitoes[0], p = m.mesh.position; g.player.teleport(p.x - Math.sin(g.player.yaw) * 0.9, p.z - Math.cos(g.player.yaw) * 0.9, g.player.yaw); });
    await tap('KeyJ');
    await frames(12);
    console.log('[t] mosquito', JSON.stringify(m.map((v) => v.toFixed(1))), 'squashed', await ev(() => __game.got.mosquitoes.size));
    await shot('foot_kick');
    // Jump onto a parked car roof.
    const r = await ev(() => { const g = __game, c = g.cars.find((c) => !c.traffic && c.type === 'sedan' && !c.name); g.player.teleport(c.x, c.z); g.player.y = c.y + c.height + 1.5; g.player.onGround = false; window.__roof = c; return c.y + c.height; });
    await frames(30);
    console.log('[t] roof top', r.toFixed(2), 'player y', (await ev(() => __game.player.y)).toFixed(2), 'onGround', await ev(() => __game.player.onGround));
    await shot('foot_roof');
    // Double jump height check from flat ground.
    await ev(() => { const g = __game, b = window.__lm('park'); g.player.teleport(b.x, b.z); });
    await frames(5);
    let top = 0;
    await page.keyboard.down('Space'); await frames(2); await page.keyboard.up('Space');
    for (let k = 0; k < 12; k++) { await frames(1); top = Math.max(top, await ev(() => __game.player.y)); }
    await page.keyboard.down('Space'); await frames(2); await page.keyboard.up('Space');
    for (let k = 0; k < 40; k++) { await frames(1); top = Math.max(top, await ev(() => __game.player.y)); }
    console.log('[t] double jump apex', top.toFixed(2));
  },

  // Start the race and just sit there: Jessi should complete the course and win.
  async race() {
    await fresh('&mission=4');
    const n = await ev(() => { const n = __game.npc('jessi'); return { x: n.x, z: n.z }; });
    await ev((n) => __game.debugWarp(n.x + 1, n.z + 1), n);
    await frames(3);
    await tap('KeyE');
    await page.waitForFunction(() => __game.missions.state === 'running', { timeout: 60000 });
    await ev(() => { const g = __game; let best = null, bd = 1e9; for (const c of g.cars) { if (c.locked || c.dead || c.ai) continue; const d = Math.hypot(c.x - g.player.x, c.z - g.player.z); if (d < bd) { bd = d; best = c; } } g.enterCar(best); });
    const t0 = Date.now();
    for (let k = 0; k < 120; k++) {
      await sleep(1000);
      const info = await ev(() => { const g = __game, s = g.missions.stage; if (g.missions.state !== 'running' || !s?.opp) return g.missions.state; const o = s.opp; return `opp ${o.x.toFixed(0)},${o.z.toFixed(0)} v=${o.speed.toFixed(1)} oi=${s.oi}/${s.cps.length} idx=${o.ai?.path?.idx}/${o.ai?.path?.pts.length} hp=${o.hp.toFixed(0)}`; });
      if (k % 5 === 0 || !info.startsWith('opp')) console.log('[t]', k, info);
      if (!info.startsWith('opp')) break;
      if (k === 20) await shot('race_mid');
    }
    console.log('[t] race over after', ((Date.now() - t0) / 1000).toFixed(0), 's');
  },

  // Flee AI: how long does the hearse keep running, and does it get stuck?
  async flee() {
    await fresh('&mission=5');
    const n = await ev(() => { const n = __game.npc('duke'); return { x: n.x, z: n.z }; });
    await ev((n) => __game.debugWarp(n.x + 1, n.z + 1), n);
    await frames(3);
    await tap('KeyE');
    await page.waitForFunction(() => __game.missions.state === 'running', { timeout: 60000 });
    await ev(() => __game.enterCar(__game.named.birchWagon));
    for (let k = 0; k < 40; k++) {
      await sleep(1000);
      const info = await ev(() => { const g = __game, s = g.missions.stage; if (!s?.car) return g.missions.state + ' ' + (s?.text || ''); const c = s.car; return `hearse ${c.x.toFixed(0)},${c.z.toFixed(0)} v=${c.speed.toFixed(1)} hp=${c.hp.toFixed(0)} t=${s.t.toFixed(0)}`; });
      if (k % 4 === 0) console.log('[t]', k, info);
    }
  },

  // Shame pursuit on foot: the Wizard floats out after you.
  async wizard() {
    await ev(() => __game.shame.add(100));
    await sleep(2500);
    await hold(['KeyW', 'ShiftLeft'], 2500);
    console.log('[t] wizard', await ev(() => { const w = __game.shame.wizard, p = __game.player; return w ? `dist ${Math.hypot(w.x - p.x, w.z - p.z).toFixed(1)}` : 'none'; }));
    await ev(() => { const g = __game, w = g.shame.wizard, p = g.player; if (w) { w.x = p.x + 5; w.z = p.z + 3; } g.cam.yaw = Math.atan2(5, 3) ; });
    await frames(6);
    await shot('wizard');
    await sleep(3000);
    console.log('[t] after', await ev(() => `pursuit=${__game.shame.pursuit} shame=${__game.shame.v.toFixed(0)}`));
  },

  // Let an AI chauffeur drive the player's car around town for a look at the chase cam.
  async cruise() {
    await ev(() => { const g = __game; g.enterCar(g.named.birchWagon); });
    await frames(3);
    await ev(() => { const g = __game, c = g.playerCar; c.place(window.__lm('birchDrive').x + 6, -40 + 2.75, Math.PI / 2); });
    await ev(async () => { const { AIDriver } = await import('./src/actors/drivers.js'); const c = __game.playerCar; c.ai = new AIDriver(c, { mode: 'traffic', cruise: 18, avoid: true }); });
    for (let k = 0; k < 6; k++) { await sleep(3500); await shot('cruise_' + k); }
  },

  async title() {
    await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1`, { waitUntil: 'load' });
    await page.waitForFunction('window.__ready === true', { timeout: 60000 });
    await sleep(1500);
    await shot('title');
  },

  async talk() {
    await ev(() => { const g = __game; g.autoDialog = false; const n = g.npc('maurice'); g.player.teleport(n.x + 1.5, n.z + 1.5, 0); });
    await frames(5);
    await tap('KeyE');
    await frames(40);
    await shot('talk_0');
    await tap('Space'); await frames(10); await tap('Space'); await frames(30);
    await shot('talk_1');
  },
};

for (const name of process.argv.slice(2)) {
  if (!SCENARIOS[name]) { console.log('unknown scenario', name); continue; }
  console.log('--', name);
  await fresh();
  try { await SCENARIOS[name](); } catch (e) { console.log('scenario failed:', e.message); }
}
console.log(errors.length ? `${errors.length} errors` : 'no errors');
await browser.close();
server.close();
