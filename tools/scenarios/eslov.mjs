// Heja Eslöv! – the rollerskier trains for real (free roam, DESIGN §10.12; feature 7): eslov, eslovlopp.
//   eslov:     in free roam the rollerskier (skis, poles, ESLÖV on the band) stands at his place, then
//              skis up and down the Eslöv lane inside it; the horn from the road beside the lane: Stig's "Heja Eslöv!",
//              the skier's "Bara 390 mil kvar!" and a wave of the pole, no sorry and no island answer
//              from him, nothing again within 8 s; E on foot: the cheer, he stops, offers Eslövloppet
//              (the prompt changes); Stig in his track: "Spår!", "Oj, förlåt!", a hop aside and the
//              skier passes him; the race: the countdown, the clock in the objective card, a loss on a
//              20 s clock, R and a car end it, a win with the walker at the shipped timer (pesetas,
//              the saved record, the skier's line at the line), then the `won` replies; a mission's
//              start puts him back at his place and he stays there.
//   eslovlopp: the timer measurement (DESIGN §8 "Timers and difficulty", on foot): calibrate's
//              walker runs the lap ESLOV_RUNS times (default 3) with the clock raised; T_ref = the
//              median + 0.5 s × 5 targets, timer = ceil(1.25 × T_ref). The raw times go into
//              notes/calibration-samples.md (`eslovLopp`).
import { check, pct, timerRange } from '../lib.mjs';
import { installAutopilot } from './calibrate.mjs';

const sk = (T) => T.ev(() => {
  const g = __game, n = g.npc('eslov'), e = g.eslov;
  return { x: +n.x.toFixed(2), z: +n.z.toFixed(2), yaw: +n.yaw.toFixed(2), sp: +Math.hypot(n.vx, n.vz).toFixed(2), mode: e.mode, s: +e.s.toFixed(1),
    off: +e.off.toFixed(2), ski: n.anim.ski, wave: n.anim.wave, spot: n.spot, busy: n.busy, laps: e.laps, state: n.state };
});
// Every line said through game.say since the last reset, as [speaker, text].
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([typeof t === 'string' ? t : (t === g.player ? 'stig' : t.key || 'ped'), text]); return o(t, text, secs); };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const has = (s, who, text) => s.some(([w, t]) => w === who && t === text);
// A fixed camera `d` m from the skier at `ang` rad from his facing (0 = in front), `h` m up, looking
// at him (or at the point between him and Stig with `both`); `release` hands the camera back.
const cut = (T, ang, d = 4, h = 1.5, both = false) => T.ev((ang, d, h, both) => {
  const g = __game, n = g.npc('eslov'), p = g.player, a = n.yaw + ang;
  const mx = both ? (n.x + p.x) / 2 : n.x, mz = both ? (n.z + p.z) / 2 : n.z;
  g.cam.cutTo({ x: mx + Math.sin(a) * d, y: n.y + h, z: mz + Math.cos(a) * d }, { x: mx, y: n.y + 1.0, z: mz });
}, ang, d, h, both);
const release = (T) => T.ev(() => { __game.cam.release(); __game.cam.snapNext = true; });
// Stig beside the skier (`side` m to his left, out of his track) facing him.
const besideSkier = (T, side = 2) => T.ev((side) => {
  const g = __game, n = g.npc('eslov'), p = g.player, fx = Math.sin(n.yaw), fz = Math.cos(n.yaw);
  if (g.playerCar) g.exitCar(true);
  p.state = 'normal';
  const x = n.x + fz * side, z = n.z - fx * side;
  p.teleport(x, z, Math.atan2(n.x - x, n.z - z)); p.vx = p.vz = 0; g.cam.yaw = p.yaw; g.cam.snapNext = true;
}, side);
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
// Cheer him on foot and take his offer: Eslövloppet starts (`timer`: the clock for this race only).
// While he skis: at index 9, past the bodega, E at his rest is the loan of his skis (§10.39).
async function enterRace(T, timer = null) {
  await T.until(() => __game.eslov.mode === 'ski' && __game.time - __game.eslov.hejaT >= 8, 30000);
  await T.ev((timer) => { __game.eslov.timer = timer ?? undefined; }, timer);
  await besideSkier(T, 2);
  await T.tap('KeyE');
  await T.until(() => __game.eslov.mode === 'offer', 8000);
  await T.tap('KeyE');
  await T.until(() => __game.eslov.mode === 'start', 3000);
}
// The walker (calibrate's `walker-r1r2`) runs the course: at each frame it heads for the race's
// current target (a checkpoint's middle, then 1.2 m past the line), switching as soon as the race
// takes a checkpoint, as a player follows the arrow. Falls are counted.
const chain = (T) => T.ev(() => {
  const g = __game, ap = window.__ap, e = g.eslov;
  ap.eslovFalls = 0;
  if (ap.eslovHook) return;
  ap.eslovHook = true;
  let up = true;
  g.onFrame(() => {
    const p = g.player, u = p.state !== 'flung' && p.state !== 'down', r = e.race;
    if (r && !u && up) ap.eslovFalls++;
    up = u;
    if (!r || e.mode !== 'race') return;
    const fin = r.pi >= r.cps.length;
    const t = fin ? { x: r.lineX, z: r.lineZ - 1.2, r: 0.5 } : { x: r.cps[r.pi].x, z: r.cps[r.pi].z, r: 0.5 };
    const f = ap.foot;
    if (!f || f.spec.x !== t.x || f.spec.z !== t.z) ap.walk({ kind: 'point', ...t });
  });
});
// Until the skier's mode is `mode`; on a timeout the failure says where he is.
async function waitMode(T, mode, ms) {
  const ok = await T.until((m) => __game.eslov.mode === m, ms, mode).then(() => true, () => false);
  if (!ok) {
    const s = await sk(T), b = await T.ev(() => { const e = __game.eslov, b = e.back; return b ? { s: +b.s.toFixed(1), len: +b.len.toFixed(1), v: +b.v.toFixed(2) } : null; });
    throw new Error(`the skier never got to '${mode}' in ${ms} ms: ${JSON.stringify({ s, b })}`);
  }
}
const raceDone = (T, after, timeout = 150000) => T.until((a) => __game.eslov.last?.kind === 'race' && __game.eslov.last.at > a, timeout, after);

export const SCENARIOS = {
  async eslov(T) {
    // 0. Free roam before ropavieja: he stands at his place (eslovVag) with skis and poles.
    await T.fresh('&mission=9');
    await resetSaid(T);
    const l = await T.L('eslovVag');
    let s = await sk(T);
    T.log('start', JSON.stringify(s));
    check(s.mode === 'rest' && Math.hypot(s.x - l.x, s.z - l.z) < 0.3 && s.ski && s.spot === 'eslov' && s.busy, `he stands at his place with his skis (${JSON.stringify(s)})`);
    await T.ev((x, z) => __game.debugWarp(x + 16, z - 20, -Math.PI / 2), l.x, l.z);
    await cut(T, 0.35, 4.2, 1.5);
    await T.shot('eslov_rest');

    // 1. He skis: inside the lane, up to its north end and back, 3.2 m/s on the legs.
    const lane = { x0: l.x - 3, x1: l.x + 3, z0: l.z - 52.5, z1: l.z + 1.6 };
    let north = false, southAgain = false, maxSp = 0, out = null;
    for (let k = 0; k < 90; k++) {
      await T.sleep(500);
      s = await sk(T);
      if (s.x < lane.x0 || s.x > lane.x1 || s.z < lane.z0 || s.z > lane.z1) out = s;
      if (s.z < l.z - 46) north = true;
      if (north && Math.cos(s.yaw) > 0.95 && s.sp > 2.5) southAgain = true;   // heading south (yaw ≈ 0, unwrapped)
      maxSp = Math.max(maxSp, s.sp);
      if (k === 8) { await cut(T, 0.6, 4.2, 1.4); await T.shot('eslov_ski_front'); }
      if (k === 10) { await cut(T, 1.5, 4.6, 1.3); await T.shot('eslov_ski_side'); }
      if (southAgain) break;
    }
    await release(T);
    T.log('lap', JSON.stringify({ north, southAgain, maxSp, out, s }));
    check(!out, `he stays in the lane (${JSON.stringify(out)})`);
    check(north && southAgain, 'he skis to the north end and back');
    check(maxSp > 3.0 && maxSp < 3.5, `skiing speed (${maxSp})`);

    // 2. The horn: Stig at the wheel on the x −200 road that runs beside the lane (the southbound
    //    lane, 9.75 m east of the lane's middle), level with the skier. "Heja Eslöv!", "Bara 390 mil
    //    kvar!", a wave of the pole; no sorry, no island answer from him; nothing again within 8 s.
    await T.until(() => { const e = __game.eslov; return e.mode === 'ski' && e.v > 2; }, 60000);
    await T.ev(() => {
      const g = __game, p = g.player, n = g.npc('eslov');
      if (!g.playerCar) {
        const car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && !c.spec.pigs && c.spec.len < 5);
        car.place(p.x + 3, p.z, 0);
        g.enterCar(car);
      }
      g.playerCar.place(-202.75, n.z + 2, 0);
      g.playerCar.vx = g.playerCar.vz = 0;
      g.cam.yaw = 0; g.cam.snapNext = true;
    });
    await T.frames(10);
    await resetSaid(T);
    await T.tap('KeyH');
    const st = await T.ev(() => ({ honk: __game.honk.last, e: __game.eslov.last }));
    T.log('horn', JSON.stringify(st));
    check(st.honk.eslov && st.e?.kind === 'heja' && st.e.by === 'horn', 'the skier takes the horn');
    check(!st.honk.replies.some(([k]) => k === 'eslov'), 'no island answer from him');
    let waved = false;
    for (let t = 0; t < 2600; t += 100) {
      await T.sleep(100);
      if (await T.ev(() => __game.npc('eslov').anim.wave)) waved = true;
      if (t === 1300) { await cut(T, -0.5, 6, 1.8); await T.shot('eslov_horn'); await release(T); }
    }
    let sd = await said(T);
    T.log('said', JSON.stringify(sd));
    check(has(sd, 'stig', 'Heja Eslöv!') && has(sd, 'eslov', 'Bara 390 mil kvar!'), 'the cheer and the first reply');
    check(!has(sd, 'stig', 'Förlåt! Jag kom åt tutan!'), 'no sorry: he meant to honk');
    check(waved, 'he waves his pole');
    await resetSaid(T);
    await T.tap('KeyH');
    await T.sleep(1600);
    sd = await said(T);
    check(!has(sd, 'stig', 'Heja Eslöv!') && !sd.some(([w]) => w === 'eslov'), `nothing again within 8 s (${JSON.stringify(sd)})`);

    // 3. On foot: E beside him, the cheer (another reply), he stops and offers the race.
    await T.ev(() => __game.exitCar(true));
    await T.until(() => __game.time - __game.eslov.hejaT >= 8 && __game.eslov.mode === 'ski', 20000);   // at his rest E is the loan (§10.39)
    await besideSkier(T, 2);
    await T.frames(3);
    const p0 = await prompt(T);
    await resetSaid(T);
    await T.tap('KeyE');
    await T.until(() => __game.eslov.mode === 'offer', 8000);
    await T.frames(4);
    const p1 = await prompt(T);
    sd = await said(T);
    s = await sk(T);
    T.log('foot', JSON.stringify({ p0, p1, sd, s }));
    check(p0 === 'E Heja Eslöv!' && p1 === 'E Eslövloppet – ett varv runt fälten', `the prompts (${p0} / ${p1})`);
    check(has(sd, 'stig', 'Heja Eslöv!') && sd.some(([w, t]) => w === 'eslov' && t !== 'Bara 390 mil kvar!' && t !== 'Ska vi ta ett varv runt fälten? Start och mål vid skylten.'), 'the cheer and another reply');
    check(has(sd, 'eslov', 'Ska vi ta ett varv runt fälten? Start och mål vid skylten.') && s.sp < 0.2, 'he stops and offers the race');
    await cut(T, 0.9, 5, 1.6, true);
    await T.shot('eslov_offer');
    await release(T);
    await T.ev(() => { const g = __game, p = g.player; p.teleport(p.x + 12, p.z, p.yaw); });
    await T.until(() => __game.eslov.mode === 'ski', 3000);

    // 4. "Spår!": Stig 6.5 m ahead of him in his track (on the north leg), facing away.
    await T.until((z) => { const e = __game.eslov, n = __game.npc('eslov'); return e.mode === 'ski' && e.s > 4 && e.s < 12 && n.z < z - 4; }, 60000, l.z);
    await resetSaid(T);
    await T.ev(() => { const g = __game, n = g.npc('eslov'), p = g.player; p.teleport(n.x, n.z - 6.5, Math.PI); p.vx = p.vz = 0; g.cam.yaw = Math.PI; g.cam.snapNext = true; });
    let minD = 9, passed = false, shot = false;
    for (let t = 0; t < 4500; t += 50) {
      await T.sleep(50);
      const d = await T.ev(() => { const g = __game, n = g.npc('eslov'), p = g.player; return { d: Math.hypot(n.x - p.x, n.z - p.z), past: n.z < p.z - 1.5, off: g.eslov.off }; });
      minD = Math.min(minD, d.d);
      if (d.past) passed = true;
      if (!shot && t >= 900) { shot = true; await cut(T, -1.1, 5.5, 1.8, true); await T.shot('eslov_spar'); await release(T); }
    }
    sd = await said(T);
    const sp = await T.ev(() => __game.eslov.last);
    T.log('spar', JSON.stringify({ sd, sp, minD, passed }));
    check(has(sd, 'eslov', 'Spår!') && has(sd, 'stig', 'Oj, förlåt!'), '"Spår!" and the sorry');
    check(sp.kind === 'spar' && sp.hop, 'Stig hops aside');
    check(passed && minD > 0.8, `the skier passes him (min ${minD.toFixed(2)} m)`);

    // 5. The race, lost: a 20 s clock (this race only), Stig stays at the start. The countdown, the
    //    card with the clock.
    let coins0 = await T.ev(() => __game.coins);
    await enterRace(T, 20);
    await T.until(() => __game.eslov.race?.placed && __game.eslov.race.count <= 2, 8000);
    await T.shot('eslov_countdown');
    await T.until(() => __game.eslov.mode === 'race', 6000);
    await T.sleep(1500);
    const card = await T.ev(() => ({ title: document.querySelector('.obj-title').textContent, timer: document.querySelector('.obj-timer').textContent, bar: document.querySelector('.obj-bar-label')?.textContent }));
    T.log('card', JSON.stringify(card));
    check(card.title === 'ESLÖVLOPPET' && /^0:1[7-9]$/.test(card.timer) && card.bar === '2:A · KONTROLL 0/5', `the objective card with the clock (${JSON.stringify(card)})`);
    let t0 = await T.ev(() => __game.time);
    await resetSaid(T);
    await raceDone(T, t0 - 10, 30000);
    let r = await T.ev(() => __game.eslov.last);
    await T.until(() => __game.eslov.mode === 'after', 15000);
    await T.sleep(1200);
    sd = await said(T);
    T.log('lose', JSON.stringify({ r, sd }));
    check(r.result === 'lose' && (await T.ev(() => __game.coins)) === coins0, 'the clock runs out: lost, no pesetas');
    check(has(sd, 'eslov', 'Det är träningen som gör det!'), 'his line at the line');
    check(await T.ev(() => !__game.eslov.objective()), 'no card after it');

    // 6. R ends a race, and so does a car.
    await T.until(() => __game.eslov.mode === 'ski', 10000);
    await enterRace(T);
    await T.until(() => __game.eslov.mode === 'race', 8000);
    await T.sleep(800);
    t0 = await T.ev(() => __game.time);
    await T.tap('KeyR');
    await raceDone(T, t0 - 0.5, 5000);
    r = await T.ev(() => __game.eslov.last);
    check(r.result === 'abort', `R ends the race (${JSON.stringify(r)})`);
    check(await T.ev(() => __game.eslov.mode === 'after'), 'still on the lane: he trains on from there');
    await T.until(() => __game.eslov.mode === 'ski', 30000);
    await enterRace(T);
    await T.until(() => __game.eslov.mode === 'race', 8000);
    t0 = await T.ev(() => __game.time);
    await T.ev(() => { const g = __game, p = g.player, car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && c.spec.len < 5); car.place(p.x + 2.5, p.z, 0); g.enterCar(car); });
    await raceDone(T, t0 - 0.5, 5000);
    r = await T.ev(() => __game.eslov.last);
    check(r.result === 'abort', `a car ends the race (${JSON.stringify(r)})`);
    await T.ev(() => { const g = __game, c = g.playerCar; g.exitCar(true); c.place(-196, -170, 0); });   // off the start line
    await T.until(() => __game.eslov.mode === 'ski', 60000);

    // 7. The race, won: calibrate's walker at the shipped clock, the skier at his race pace.
    await T.ev(installAutopilot);
    await T.until(() => __game.eslov.mode === 'ski', 40000);
    coins0 = await T.ev(() => __game.coins);
    await enterRace(T);
    await chain(T);
    await T.until(() => __game.eslov.mode === 'race', 8000);
    t0 = await T.ev(() => __game.time);
    await T.sleep(9000);
    await T.shot('eslov_race');
    await resetSaid(T);
    await raceDone(T, t0 - 0.5, 90000);
    r = await T.ev(() => __game.eslov.last);
    const win = await T.ev(() => ({ coins: __game.coins, rec: __game.records.eslov, saved: Object.keys(localStorage).map((k) => { try { return JSON.parse(localStorage.getItem(k))?.records?.eslov; } catch (e) { return undefined; } }).find((v) => v != null) ?? null,
      banner: document.querySelector('#banner .banner-main').textContent, sub: document.querySelector('#banner .banner-sub').textContent, falls: window.__ap.eslovFalls }));
    T.log('win', JSON.stringify({ r, win }));
    await T.shot('eslov_win');
    check(r.result === 'win' && r.t < r.T, `the walker wins (${JSON.stringify(r)})`);
    check(win.coins === coins0 + 100 && win.rec === +r.t.toFixed(2) && win.saved === win.rec, 'a coin and the saved record');
    check(win.banner === 'DU VANN!' && /nytt rekord/.test(win.sub), `the banner (${win.banner} / ${win.sub})`);
    const slack = (r.T - r.t) / r.T;
    T.log('slack', (slack * 100).toFixed(1), '%');
    check(slack > 0.1 && slack < 0.3, `a clean lap keeps about 15–20 % (${(slack * 100).toFixed(1)} %)`);
    await waitMode(T, 'after', 20000);
    await T.sleep(2600);
    sd = await said(T);
    T.log('after', JSON.stringify(sd));
    check(has(sd, 'eslov', 'Där fick jag! Här, en slant till en läsk.') && has(sd, 'stig', 'Tack! Det var nog bara tur.'), 'his line and Stig\'s at the line');
    await T.ev(() => { const g = __game, n = g.npc('eslov'), p = g.player, mz = (n.z + p.z) / 2; g.cam.cutTo({ x: n.x + 5.5, y: n.y + 1.7, z: mz - 1.5 }, { x: (n.x + p.x) / 2, y: n.y + 1.1, z: mz }); });   // from the east, clear of the sign
    await T.shot('eslov_after');
    await release(T);

    // 8. After a win he greets the runner.
    await T.until(() => __game.time - __game.eslov.hejaT >= 8 && __game.eslov.mode === 'ski', 30000);
    await besideSkier(T, 2);
    await resetSaid(T);
    await T.tap('KeyE');
    await T.sleep(1500);
    sd = await said(T);
    check(has(sd, 'eslov', 'Där har vi löparen!'), `the won reply (${JSON.stringify(sd)})`);

    // 9. A mission's start: back at his place, and he stays there.
    await T.startMission();
    s = await sk(T);
    T.log('mission', JSON.stringify(s));
    check(Math.hypot(s.x - l.x, s.z - l.z) < 0.3 && s.mode === null && s.spot !== 'eslov' && !(await T.ev(() => !!__game.npc('eslov').steer)), `at his place in the mission (${JSON.stringify(s)})`);
    await T.sleep(3000);
    const s2 = await sk(T);
    check(Math.hypot(s2.x - l.x, s2.z - l.z) < 0.3 && s2.mode === null, 'he stays there');
  },

  async eslovlopp(T) {
    const N = +(process.env.ESLOV_RUNS || 3);
    const runs = [];
    let shipped = null;
    for (let k = 0; k < N; k++) {
      await T.fresh('&mission=9&ts=1');
      check(await T.ev(() => __game.timeScale === 1), 'the measurement needs timeScale 1');
      await T.ev(installAutopilot);
      shipped = await T.ev(() => __game.eslov.cfg.race.timer);
      await enterRace(T, 600);
      await chain(T);
      await T.until(() => __game.eslov.mode === 'race', 8000);
      const t0 = await T.ev(() => __game.time);
      await raceDone(T, t0 - 0.5, 150000);
      const r = await T.ev(() => ({ ...__game.eslov.last, falls: window.__ap.eslovFalls }));
      T.log('eslovlopp run', k, JSON.stringify(r));
      check(r.result === 'win', `run ${k}: the lap is run (${JSON.stringify(r)})`);
      runs.push(r);
    }
    const clean = runs.filter((r) => r.falls === 0).map((r) => r.t);
    const ts = clean.length ? clean : runs.map((r) => r.t);
    const med = pct(ts, 0.5), tRef = med + 0.5 * 5, timer = Math.ceil(1.25 * tRef);
    const range = timerRange(ts, (p) => Math.ceil(1.25 * (p + 2.5)), { q: 0.5 });
    T.log(`CAL eslovLopp | Eslövloppet, once round the tomato fields (on foot, measured) | walker, checkpoint to checkpoint | T_ref ${tRef.toFixed(2)} | timer ${timer} | median of ${ts.length} ${clean.length ? 'clean ' : ''}runs + 0.5 s × 5: ${runs.map((r) => `${r.t.toFixed(2)}${r.falls ? '*' : ''}`).join(' ')} s`);
    T.log(`CAL CHECK eslovLopp: shipped ${shipped}, this sample ${timer}${range ? ` (90 % range ${range[0]}–${range[1]})` : ''}: ${range ? (shipped >= range[0] && shipped <= range[1] ? 'OK' : 'DIFFERS') : shipped === timer ? 'OK' : 'DIFFERS'}`);
  },
};
