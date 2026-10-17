// Gatlopp mot pizza-racern – José's street races (free roam, DESIGN §10.38; feature 69): gatlopp, gatloppkal.
//   gatlopp:  the feature end to end (`&ts=1`): the lines tagged; no race before Gamla kläder is done;
//             after it José's "!", the friend dot, his prompt close by and his talk a step off; the
//             board by Berra and Robban, the talk at Berra, the bet at the board (too little money, then
//             100 pta); E at José: the offer, the fade, the grid (the hire car, José and his mother in
//             his car, the banner, the countdown, the card); a loss standing still (the bet lost, the
//             course open, José back at his place); a win by calibrate's autopilot (prize, bet, save,
//             the next race); a mission start mid-race; a wreck; races 2 and 3 won (the finish banners);
//             nothing left after three; the sisters' six once; the board at the bodega after julafton.
//   gatloppkal: the races' balance, measured the way `calibrate` measures the night-bus race (§8 "Races
//             and chases"): calibrate's autopilot (`installAutopilot`, imported from the unchanged
//             calibrate.mjs) drives the hire car from the grid in free roam at index 10 (`&ts=1`), out
//             of the left lane, on the course's road route at full speed, `GATLOPP_RUNS` (2) clean runs
//             and as many with one big crash at 45 % of the route (a stop in the left lane, 1 s to
//             recover); every car-car impact of either racer is logged. Won = the race's own result;
//             the margin is José's road left at his average speed (won) or Stig's distance left at
//             30 m/s (lost). Checks per course: a clean run wins, a clean win is by less than 6 s, one
//             crash loses. Env: GATLOPP_RACE=1,2,3 (the courses), GATLOPP_RUNS, GATLOPP_SWEEP=
//             'cruise:maxSpeed:accel:steer;…' (José's spec per set, no checks; the tuning sweep).
import { check } from '../lib.mjs';
import { installAutopilot } from './calibrate.mjs';

const f1 = (v) => (v == null ? '-' : (+v).toFixed(1));

// The autopilot's road route per course (the kind's own route for José: the same corners), from the
// grid's edge to a point past the finish, and where it ends.
export const ROUTES = [
  { nodes: [[5, 3], [4, 3], [3, 3], [3, 4], [4, 4], [5, 4], [5, 3], [4, 3]], end: { x: 76, z: -42.75 } },
  { nodes: [[5, 3], [4, 3], [3, 3], [3, 2], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1]], end: { x: 244, z: -197.25 } },
  { nodes: [[5, 3], [4, 3], [3, 3], [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [1, 1], [1, 2]], end: { x: -202.75, z: -156 } },
];

// One race from the grid with the autopilot at the wheel: { won, margin, t, impacts, … }.
// `fresh` false: on the page as it is, the race already on the grid (the challenge's fade) or put
// there now.
export async function raceRun(T, k, { crash = false, set = null, fresh = true } = {}) {
  if (fresh) await T.fresh('&mission=10&ts=1');
  await T.ev(installAutopilot);
  check(await T.ev(() => __game.timeScale === 1), 'gatloppkal needs timeScale 1');
  if (set) await T.ev((a) => { const R = __game.gatlopp.cfg.races[a.k], [cr, mx, ac, sr] = a.set.split(':').map(Number); R.cruise = cr; R.spec = { maxSpeed: mx, accel: ac, steer: sr || R.spec.steer }; }, { k, set });
  const ok = await T.ev((k) => {
    const g = __game, sr = g.gatlopp;
    if (!(sr.racing && sr.k === k) && !sr.startRace(k)) return false;
    const st = sr.st, o = (window.__calOpp = { car: st.opp, path: st.opp.ai.path, d: 0, t: 0, x: st.opp.x, z: st.opp.z, fin: null, hits: [] });
    g.onFrame((dt) => {
      if (sr.st === st && st.countdown <= 0) { o.t += dt; o.d += Math.hypot(o.car.x - o.x, o.car.z - o.z); }
      o.x = o.car.x; o.z = o.car.z;
      // The moment the race ended (the frame after): José's road left on the race's own path.
      if (!o.fin && sr.st !== st && sr.result) {
        const p = o.path, c = o.car;
        p.ensure(100000);
        let left = Math.hypot(p.pts[p.idx].x - c.x, p.pts[p.idx].z - c.z);
        for (let q = p.idx; q < p.pts.length - 1; q++) left += Math.hypot(p.pts[q + 1].x - p.pts[q].x, p.pts[q + 1].z - p.pts[q].z);
        const pc = g.playerCar || g.player;
        o.fin = { left, avg: o.d / Math.max(1, o.t), px: pc.x, pz: pc.z };
      }
    });
    const kind = (c) => (c === st.opp ? 'jose' : c === g.playerCar ? 'player' : c.traffic ? 'traffic' : c.ai ? 'ai' : 'parked');
    const orig = g.onCarImpact;
    g.onCarImpact = function (a, b, impact, cx, cz) {
      if (sr.st === st && (a === st.opp || b === st.opp || a === g.playerCar || b === g.playerCar) && impact > 3 && o.hits.length < 12) o.hits.push(`${kind(a)}>${kind(b)} ${impact.toFixed(1)} @(${cx.toFixed(0)},${cz.toFixed(0)}) t${o.t.toFixed(1)}`);
      return orig.call(this, a, b, impact, cx, cz);
    };
    return true;
  }, k);
  check(ok, `gatlopp ${k + 1}: the grid`);
  await T.frames(3);
  const info = await T.ev(() => { const sr = __game.gatlopp, st = sr.st; return { car: __game.playerCar?.type, name: __game.playerCar?.name, cruise: st.o.cruise, opp: st.opp.spec.maxSpeed, accel: st.opp.spec.accel, steer: st.opp.spec.steer }; });
  const R = ROUTES[k];
  const plan = await T.ev((s) => window.__ap.drive(s), { nodes: R.nodes, end: R.end, vEnd: 40, startOff: -5.5, free: true, until: 'gatlopp', crashSide: 'left', crashAt: null });
  if (crash) await T.ev((d) => { window.__ap.active.ctl.path.crashAt = d; }, Math.round(plan.len * 0.45));
  // Short waits in a loop (long page waits hit the protocol timeout).
  const t0 = Date.now();
  let done = false;
  while (!done && Date.now() - t0 < 180000) done = await T.until(() => !!__game.gatlopp.result && !!window.__calOpp.fin, 20000).then(() => true, () => false);
  const rr = await T.ev(() => window.__ap.result());
  await T.ev(() => window.__ap.stop());
  const res = await T.ev(() => ({ last: __game.gatlopp.result, fin: window.__calOpp.fin, hits: window.__calOpp.hits }));
  check(done, `gatlopp ${k + 1}: the race ended (${JSON.stringify(res.last)})`);
  const won = res.last.result === 'win', fin = R.end;
  const margin = won ? res.fin.left / res.fin.avg : -Math.hypot(res.fin.px - fin.x, res.fin.pz - fin.z) / 30;
  const out = { won, margin: +margin.toFixed(1), t: res.last.t, impacts: rr.impacts, hits: rr.hits, crashV: rr.crashV, blocked: rr.blocked, blockedBy: rr.blockedBy, carHits: res.hits, info, len: plan.len };
  T.log('gatlopp', k + 1, crash ? 'crash' : 'clean', JSON.stringify(out));
  return out;
}

export const SCENARIOS = {
  async gatlopp(T) { await SCENARIOS_FEATURE.gatlopp(T); },
  async gatloppkal(T) {
    const races = process.env.GATLOPP_RACE ? process.env.GATLOPP_RACE.split(',').map((n) => +n - 1) : [0, 1, 2];
    const runs = +(process.env.GATLOPP_RUNS || 2);
    const sweep = process.env.GATLOPP_SWEEP ? process.env.GATLOPP_SWEEP.split(';') : [null];
    for (const k of races) for (const set of sweep) {
      const res = { clean: [], crash: [] };
      for (const mode of ['clean', 'crash']) for (let r = 0; r < runs; r++) res[mode].push(await raceRun(T, k, { crash: mode === 'crash', set }));
      const i0 = (res.clean[0] || res.crash[0]).info;
      console.log(`[t] GATLOPP ${k + 1} | José cruise ${i0.cruise}, maxSpeed ${i0.opp}, accel ${i0.accel}, steer ${i0.steer}; Stig ${i0.name || i0.car} | route ${res.clean[0]?.len ?? '-'} m | `
        + `clean: ${res.clean.map((r) => `${r.won ? 'WON' : 'LOST'} by ≈ ${f1(Math.abs(r.margin))} s in ${f1(r.t)} s${r.impacts ? ` (${r.impacts} impacts)` : ''}`).join(' / ')}; `
        + `one crash: ${res.crash.map((r) => `${r.won ? 'WON' : 'LOST'} (${f1(r.margin)} s)`).join(' / ')}`);
      if (!set) {
        check(res.clean.filter((r) => r.won && r.impacts === 0).length >= Math.ceil(res.clean.length / 2), `gatlopp ${k + 1}: a clean run wins`);
        check(res.clean.every((r) => !r.won || r.margin < 6), `gatlopp ${k + 1}: a clean win is by a few seconds, not a walkover`);
        check(res.crash.every((r) => !r.won), `gatlopp ${k + 1}: one big crash loses the race`);
      }
    }
  },
};

// ---- gatlopp: the feature end to end -------------------------------------------------------------
// Every line said through game.say since the last reset: [speaker key, text].
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.key || '?', text]); return o(t, text, secs); };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const toasts = (T) => T.ev(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '));
const clearToasts = (T) => T.ev(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
const st = (T) => T.ev(() => {
  const g = __game, s = g.gatlopp, j = g.npcs.jose, m = g.npcs.mamma, car = s.car, home = s.homeSpot('jose');
  return {
    mode: s.mode, k: s.k, result: s.result && { ...s.result }, won: s.won, next: s.next, bet: s.bet, offered: s.offered(), bang: !!s.bang?.visible,
    prompt: document.getElementById('prompt')?.textContent || '', coins: g.coins, index: g.missions.index, state: g.missions.state,
    inCar: g.playerCar?.name || null, joseIn: j.car?.name || null, joseDrives: !!car && car.driver === j, mammaIn: !!car && car.passengers.includes(m),
    joseHome: Math.hypot(j.x - home.x, j.z - home.z) < 1, mammaAt: [Math.round(m.x), Math.round(m.z)], joseBusy: j.busy, mammaBusy: m.busy,
    banners: Object.fromEntries(Object.entries(s.banners).map(([k, b]) => [k, b.visible])), board: !!s.board?.visible,
    freeze: g.freezeCar, closure: !!g.closure, cars: g.cars.filter((c) => c.name === 'joseBil').length, frozenT: +(g.frozenT || 0).toFixed(2),
    title: document.querySelector('.obj-title')?.textContent || '', main: document.querySelector('.banner-main')?.textContent || '',
    sub: document.querySelector('.banner-sub')?.textContent || '', last: s.last && { ...s.last }, rec: g.records.gatlopp ? { ...g.records.gatlopp } : null,
    markers: g.mapMarkers(true).filter((q) => q.type === 'friend').length,
  };
});
// Stig on foot `d` m in front of an NPC (along its yaw), facing it.
const before = (T, key, d = 1.2) => T.ev((a) => {
  const g = __game, n = g.npcs[a.key];
  if (g.playerCar) g.exitCar(true);
  g.player.state = 'normal';
  const x = n.x + Math.sin(n.yaw) * a.d, z = n.z + Math.cos(n.yaw) * a.d, yaw = Math.atan2(n.x - x, n.z - z);
  g.debugWarp(x, z, yaw);
  g.cam.yaw = yaw; g.cam.snapNext = true;
}, { key, d });
// A still from a fixed camera (from -> look at), then the chase camera back.
const still = async (T, name, from, to) => {
  await T.ev((a) => { const g = __game; g.cam.cutTo(a.from, a.to); g.cam.snapNext = true; }, { from, to });
  await T.shot(name);
  await T.ev(() => { __game.cam.release(); __game.cam.snapNext = true; });
};
const savedRec = (T) => T.ev(() => { try { return JSON.parse(localStorage.getItem('charter-and-run-v1') || 'null')?.records?.gatlopp ?? null; } catch (e) { return 'err'; } });

export const SCENARIOS_FEATURE = {
  async gatlopp(T) {
    // ---- 1. The table: every line tagged; "pizza" never in José's, Berra's or Robban's mouths.
    const src = (await import('fs')).readFileSync(new URL('../../src/content/island.js', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('export const GATLOPP'), src.indexOf('\n};\n', src.indexOf('export const GATLOPP')));
    const texts = await T.ev(() => {
      const c = __game.gatlopp.cfg, b = c.bet;
      return [c.prompt, c.offer.yes, c.banner.start, c.banner.finish, c.title, c.text, ...c.races.flatMap((R) => [R.name, R.offer, ...R.radio.map((l) => l[1])]),
        c.win.banner, c.win.sub, c.win.toast, ...c.win.lines.map((l) => l[2]), c.lose.banner, c.lose.sub, ...c.lose.lines.map((l) => l[2]), c.wreck, c.next, c.all,
        b.prompt, b.berra, b.robban, b.toast, b.poor, b.card, b.paid, b.lost, b.back, c.board.text, ...c.sisters.lines.map((l) => l[2])];
    });
    const bad = [];
    for (const text of texts) {
      const first = text.split('\n')[0];
      const row = block.split('\n').find((l) => l.includes(`'${first}`));
      if (!row) bad.push(`not in the block: ${first}`);
      else if (!/(\/\/|\/\*) .*\[(F\*?|N)\]/.test(row)) bad.push(`untagged: ${first}`);
    }
    check(!bad.length, `GATLOPP's lines tagged (${bad.join(' · ')})`);
    check(!/pizza/i.test(texts.join(' ')), 'no "pizza" in a line (the sisters\' word, the title only)');

    // ---- 2. Before Gamla kläder is done (index 9): no race.
    await T.fresh('&mission=9&ts=1');
    await before(T, 'jose');
    await T.frames(6);
    let r = await st(T);
    T.log('index 9', JSON.stringify(r));
    check(!r.offered && !r.bang && !r.prompt.includes('Gatlopp') && !r.board && r.markers === 0, `index 9: no "!", no prompt, no board (${r.prompt})`);

    // ---- 3. After it (index 10): the "!", the friend dot, the prompt.
    await T.fresh('&mission=10&ts=1');
    await T.ev(() => __game.addCoins(3000 - __game.coins));
    await before(T, 'jose', 8);
    await T.frames(6);
    r = await st(T);
    check(r.offered && r.bang && r.markers === 1, `index 10: José offers, the "!" and the dot (${JSON.stringify(r)})`);
    await T.shot('gatlopp_0_jose');
    await before(T, 'jose');
    await T.frames(6);
    r = await st(T);
    check(r.prompt.includes('Gatlopp 1/3 – Ett varv runt centrum'), `at José: the prompt (${r.prompt})`);

    // A step further off, José's talk (the gang's, §10.28).
    await before(T, 'jose', 2.4);
    await T.frames(6);
    r = await st(T);
    check(r.prompt.includes('Prata med José'), `2.4 m from José: his talk (${r.prompt})`);

    // ---- 4. The bet at the pool bar: at Berra his talk, at the board the bet; too little money, the bet.
    await before(T, 'berra', 1.5);
    await T.frames(6);
    r = await st(T);
    check(r.prompt.includes('Prata med Berra') && r.board, `at Berra: his talk, the board up (${r.prompt})`);
    await T.ev(() => { const g = __game, b = g.gatlopp.boardSpot(), x = b.x + Math.sin(b.yaw) * 0.9, z = b.z + Math.cos(b.yaw) * 0.9, yaw = Math.atan2(b.x - x, b.z - z); g.debugWarp(x, z, yaw); g.cam.yaw = yaw; g.cam.snapNext = true; });
    await T.frames(6);
    r = await st(T);
    T.log('bar', JSON.stringify(r));
    check(r.prompt.includes('Slå vad med Berra'), `at the board: "E Slå vad med Berra" (${r.prompt})`);
    await still(T, 'gatlopp_1_tavla', { x: 10.6, y: 2.5, z: 7.4 }, { x: 15.6, y: 1.3, z: 11.6 });
    await T.ev(() => __game.addCoins(50 - __game.coins));
    await resetSaid(T);
    await T.tap('KeyE');
    await T.frames(4);
    let s = await said(T);
    r = await st(T);
    check(!r.bet && r.coins === 50 && s.some(([w, t]) => w === 'berra' && t === 'Inga pesetas, inget vad.'), `50 pta: Berra's no (${JSON.stringify(s)})`);
    await T.until(() => !__game.gatlopp.lines.length, 5000);
    await T.ev(() => __game.addCoins(3000 - __game.coins));
    await clearToasts(T);
    await resetSaid(T);
    await T.tap('KeyE');
    await T.sleep(2200);
    s = await said(T);
    r = await st(T);
    const tt = await toasts(T);
    T.log('bet', JSON.stringify(s), tt, JSON.stringify(r));
    check(r.bet?.stake === 100 && r.coins === 2900 && s.some(([w, t]) => w === 'berra' && t === 'Hundra pesetas på spanjoren!') && s.some(([w, t]) => w === 'robban' && t === 'Jag tar Stig-Helmer. Fem gånger pengarna!')
      && tt.includes('Vinner du betalar Robban 500 pta'), `the bet: −100, Berra's and Robban's lines, the toast (${tt})`);
    await still(T, 'gatlopp_2_vad', { x: 10.6, y: 2.5, z: 7.4 }, { x: 15.6, y: 1.5, z: 11.6 });
    await T.until(() => !__game.gatlopp.lines.length, 5000);
    await T.frames(4);
    r = await st(T);
    check(!r.prompt.includes('Slå vad'), `a bet placed: no second bet (${r.prompt})`);

    // ---- 5. The challenge: José's line, Stig's yes, the fade, the grid.
    await before(T, 'jose');
    await T.frames(4);
    await resetSaid(T);
    await T.tap('KeyE');
    await T.frames(2);
    r = await st(T);
    check(r.mode === 'offer' && r.frozenT > 2, `E: the offer, Stig held (${JSON.stringify(r)})`);
    await T.until(() => __game.gatlopp.mode === 'race', 8000);
    await T.frames(10);
    s = await said(T);
    r = await st(T);
    T.log('grid', JSON.stringify(s), JSON.stringify(r));
    check(s.some(([w, t]) => w === 'jose' && t === 'Ett varv runt centrum, Stig? Mamma åker med.') && s.some(([w, t]) => w === 'stig' && t === 'Jag kör bara hyrbil… men okej.'), `the offer and the yes (${JSON.stringify(s)})`);
    check(r.inCar === 'hyrbil' && r.joseIn === 'joseBil' && r.joseDrives && r.mammaIn && r.freeze && r.closure && r.banners['SALIDA · START'] && r.cars === 1,
      `the grid: Stig in the hire car, José at the wheel of his car, his mother beside him, frozen, the course closed, the banner (${JSON.stringify(r)})`);
    await T.until(() => document.querySelector('.banner-main')?.textContent === '3', 5000);
    await T.shot('gatlopp_3_start');
    await still(T, 'gatlopp_3b_salida', { x: 72, y: 6.5, z: -40 }, { x: 94, y: 3.4, z: -40 });
    await still(T, 'gatlopp_3c_mamma', { x: 86.2, y: 1.9, z: -43.4 }, { x: 92, y: 1.25, z: -42.75 });
    r = await st(T);
    check(/GATLOPP 1\/3/i.test(r.title), `the card: Gatlopp 1/3 (${r.title})`);
    await T.until(() => !__game.freezeCar, 6000);
    await T.sleep(1500);
    await T.ev(() => { const g = __game, c = g.gatlopp.car; g.cam.yaw = Math.atan2(c.x - g.playerCar.x, c.z - g.playerCar.z); g.cam.snapNext = true; });
    await T.shot('gatlopp_4_jose_kor');

    // ---- 6. Stig stays put: José wins; the bet is Berra's; José drives back and walks to his place.
    await clearToasts(T);
    await resetSaid(T);
    await T.until(() => !!__game.gatlopp.result, 60000);
    await T.frames(4);
    r = await st(T);
    const lt = await toasts(T);
    T.log('lost', JSON.stringify(r), lt);
    check(r.result.result === 'lose' && r.main === 'JOSÉ VANN' && r.coins === 2900 && !r.bet && r.won === 0 && lt.includes('Berra vann vadet'), `lost: the banner, no prize, the bet lost (${lt})`);
    check(!r.freeze && !r.closure && !r.banners['SALIDA · START'], 'the course open again, the banner down');
    await T.until(() => __game.gatlopp.mode === null, 60000);
    r = await st(T);
    s = await said(T);
    T.log('back', JSON.stringify(r), JSON.stringify(s));
    check(r.cars === 0 && r.joseHome && !r.joseBusy && r.offered && r.index === 10 && r.state === 'idle', `José back at his place, his car gone, the offer again (${JSON.stringify(r)})`);
    check(s.some(([w, t]) => w === 'jose' && t === 'Mamma säger att du kör som en turist.'), `José's line (${JSON.stringify(s)})`);
    await before(T, 'jose', 6);
    await T.frames(6);
    await T.shot('gatlopp_5_hemma');

    // ---- 7. The challenge again; the autopilot wins: the prize, the bet, the save, the next race.
    await T.ev(() => { __game.gatlopp.bet = { stake: 100 }; __game.addCoins(2900 - __game.coins); });
    await before(T, 'jose');
    await T.frames(4);
    await T.tap('KeyE');
    await T.until(() => __game.gatlopp.mode === 'race', 8000);
    await clearToasts(T);
    await resetSaid(T);
    const w1 = await raceRun(T, 0, { fresh: false });
    check(w1.won, `the autopilot wins race 1 (${JSON.stringify(w1)})`);
    await T.frames(4);
    r = await st(T);
    const wt = await toasts(T);
    T.log('won', JSON.stringify(r), wt);
    check(r.main === 'DU VANN!' && /Gatlopp 1\/3 på 0:\d\d,\d/.test(r.sub) && r.coins === 2900 + 300 + 500 && r.won === 1 && r.next === 1, `won: the banner, 300 + 500 pta, won 1 (${r.sub}, ${r.coins})`);
    check(wt.includes('José gav dig 300 pta') && wt.includes('Robban betalar ut vadet: 500 pta') && wt.includes('Nästa gatlopp: Till flygplatsen'), `the toasts (${wt})`);
    check((await savedRec(T))?.won === 1, `saved (${JSON.stringify(await savedRec(T))})`);
    await T.shot('gatlopp_6_vann');
    await T.until(() => __game.gatlopp.mode === null, 60000);
    await before(T, 'jose');
    await T.frames(6);
    r = await st(T);
    s = await said(T);
    check(r.prompt.includes('Gatlopp 2/3 – Till flygplatsen') && r.index === 10, `the next: Gatlopp 2/3 (${r.prompt})`);
    check(s.some(([w, t]) => w === 'jose' && t === 'Mamma säger att du kör som en spanjor.'), `José's line on a win (${JSON.stringify(s)})`);

    // ---- 8. A mission start mid-race: the race gone, José and his mother home, nothing else.
    await T.ev(() => __game.gatlopp.startRace(1));
    await T.until(() => !__game.freezeCar, 6000);
    await T.sleep(2500);
    await T.ev(() => { const g = __game; g.exitCar(true); g.missions.begin(); });
    await T.frames(6);
    r = await st(T);
    T.log('mission', JSON.stringify(r));
    check(r.mode === null && r.cars === 0 && r.joseHome && !r.freeze && !r.closure && !Object.values(r.banners).some(Boolean) && r.last.kind === 'abort' && r.index === 10 && r.won === 1,
      `a mission start: all gone, José home, index and wins as before (${JSON.stringify(r)})`);
    check(Math.hypot(r.mammaAt[0] - (-232), r.mammaAt[1] - (-236)) < 3, `his mother home in Fataga (${r.mammaAt})`);

    // ---- 8b. José's car wrecked mid-race: no race, the bet handed back, nothing won.
    await T.fresh('&mission=10&ts=1');
    await T.ev(() => { const g = __game; g.records.gatlopp = { won: 1 }; g.gatlopp.bet = { stake: 100 }; g.addCoins(1000 - g.coins); g.gatlopp.startRace(1); });
    await T.until(() => !__game.freezeCar, 6000);
    await clearToasts(T);
    await T.ev(() => __game.gatlopp.car.damage(999, __game));
    await T.until(() => !!__game.gatlopp.result, 3000);
    await T.frames(4);
    r = await st(T);
    const kt = await toasts(T);
    T.log('wreck', JSON.stringify(r), kt);
    check(r.result.result === 'wreck' && r.won === 1 && r.coins === 1100 && !r.bet && kt.includes('Josés bil är kvaddad') && kt.includes('Berra ger tillbaka vadet: 100 pta')
      && !r.freeze && !r.closure && r.main !== 'DU VANN!', `a wreck: no win, the stake back (${kt}, ${r.coins})`);
    await T.until(() => __game.gatlopp.mode === null, 30000);
    r = await st(T);
    check(!r.joseBusy && !r.mammaBusy, 'after the wreck José and his mother are free (home once Stig is off)');

    // ---- 9. Races 2 and 3 won with the autopilot: the finishes, then nothing more to offer.
    for (const k of [1, 2]) {
      await T.fresh('&mission=10&ts=1');
      await T.ev((k) => { __game.records.gatlopp = { won: k }; }, k);
      await T.ev((k) => __game.gatlopp.startRace(k), k);
      await T.frames(6);
      r = await st(T);
      check(r.banners['LLEGADA · MÅL'], `race ${k + 1}: the finish banner`);
      if (k === 1) await still(T, 'gatlopp_7a_flygplats', { x: 214, y: 3.0, z: -192 }, { x: 236, y: 5.5, z: -203 });
      else await still(T, 'gatlopp_7b_eslov', { x: -197, y: 3.2, z: -188 }, { x: -205, y: 4.5, z: -150 });
      const wr = await raceRun(T, k, { fresh: false });
      check(wr.won, `the autopilot wins race ${k + 1} (${JSON.stringify(wr)})`);
      await T.frames(2);
      await T.shot(`gatlopp_${7 + k}_mal`);
    }
    r = await st(T);
    const at = await toasts(T);
    check(r.won === 3 && r.next === -1 && at.includes('Alla tre gatloppen vunna'), `all three won (${at})`);
    await T.until(() => __game.gatlopp.mode === null, 60000);
    await T.ev(() => { const g = __game, j = g.npcs.jose, s = g.gatlopp.homeSpot('jose'); g.gatlopp.sendHome('jose'); });
    await before(T, 'jose');
    await T.frames(6);
    r = await st(T);
    check(!r.offered && !r.bang && !r.board && r.prompt.includes('Prata med José'), `no race left: José's E is the gang's talk again (${r.prompt})`);

    // ---- 10. The sisters at the pool: their six, once.
    // Stig 4.5 m in front of them (along their facing), turned to them, the chase camera behind him.
    await T.ev(() => {
      const g = __game, s = g.npcs.siv, m = g.npcs.majsan, mx = (s.x + m.x) / 2, mz = (s.z + m.z) / 2;
      const x = mx + Math.sin(s.yaw) * 4.5, z = mz + Math.cos(s.yaw) * 4.5, yaw = Math.atan2(mx - x, mz - z);
      g.debugWarp(x, z, yaw);
      g.cam.yaw = yaw; g.cam.pitch = 0.18; g.cam.snapNext = true;
    });
    await resetSaid(T);
    await T.until(() => __game.gatlopp.last?.kind === 'sisters', 6000);
    await T.sleep(1000);
    await T.shot('gatlopp_10_systrarna');
    await T.sleep(3000);
    s = await said(T);
    T.log('sisters', JSON.stringify(s));
    check(s.some(([w, t]) => w === 'siv' && t === 'Giraffen, då?') && s.some(([w, t]) => w === 'majsan' && t === 'Sex, tycker jag.') && s.some(([w, t]) => w === 'stig' && t === '…Sex?'), `the sisters' exchange (${JSON.stringify(s)})`);
    check((await savedRec(T))?.sex === true, 'the six saved');
    await resetSaid(T);
    await T.ev(() => { const g = __game; g.debugWarp(g.player.x + 30, g.player.z, 0); });
    await T.frames(10);
    await T.ev(() => { const g = __game, s = g.npcs.siv; g.debugWarp(s.x + 3, s.z + 3, -2.2); });
    await T.sleep(1500);
    s = await said(T);
    check(!s.some(([, t]) => t === 'Giraffen, då?'), 'not again');

    // ---- 11. After julafton the bookmakers are at Pepes Bodega, and so is the board.
    await T.fresh('&mission=13&ts=1');
    await T.ev(() => { const g = __game; g.unlock('bodega'); g.placeNpcs(true); const j = g.berraJob; j.release?.(); j.phase = 'nap'; j.napT = 1e9; document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    await T.frames(10);
    await T.ev(() => { const g = __game, b = g.gatlopp.boardSpot(), x = b.x + Math.sin(b.yaw) * 0.9, z = b.z + Math.cos(b.yaw) * 0.9; g.debugWarp(x, z, b.yaw + Math.PI); });
    await T.frames(8);
    r = await st(T);
    const bs = await T.ev(() => { const g = __game, b = g.gatlopp.boardSpot(); return { at: b.at[0], berra: Math.hypot(g.npcs.berra.x - b.x, g.npcs.berra.z - b.z) }; });
    T.log('bodega', JSON.stringify(bs), JSON.stringify(r));
    check(r.board && bs.at === 'bodega' && bs.berra < 5, `the board at the bodega by Berra (${JSON.stringify(bs)})`);
    check(r.prompt.includes('Slå vad med Berra'), `at the bodega's board: the bet (${r.prompt})`);
    await still(T, 'gatlopp_11_bodega', { x: 2.5, y: 2.6, z: -42.5 }, { x: 6.5, y: 1.3, z: -33.5 });
  },
};
