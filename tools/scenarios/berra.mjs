// Bärra hem Berra – igen (free roam after the grisfest, DESIGN §10.6; feature 2): berra.
//   berra: nothing before the grisfest (index 11); with index 12 the nap never pops into view (10 m
//          off, or 30 m off and in view: no; 30 m off behind the camera: yes); Berra asleep on the
//          plaza bench (seated, slumped, still), Robban beside him waving, the "…zzz" bubble, the
//          minimap marker, the talk prompt; Robban's ask (the two film lines) and the lift; the walk
//          home (calibrate's autopilot, never sprinting) with Robban on Stig's trail: the time, no
//          drop, the desk scene ("Hade jag kul?", 100 pta, the toast); the next nap on the SunTrip
//          lounger (the sun line in his sleep); a smashed lounger leaves him asleep on the ground and
//          the ask still works; the walk home from there; back on the bench, no talk to Ole while
//          carrying; the sprint, R and fall drops (Robban's sigh, the card, Berra stays down, E lifts
//          him), 25 pta after three drops; a mission start sends both home and nothing of the job
//          shows while it runs; back on the lounger after it.
import { check } from '../lib.mjs';
import { installAutopilot } from './calibrate.mjs';

const job = (T) => T.ev(() => {
  const g = __game, j = g.berraJob, b = g.npc('berra'), r = g.npc('robban'), p = g.player;
  return { phase: j.phase, shown: j.shown, spotI: j.spotI, drops: j.drops, napT: +j.napT.toFixed(1), active: j.active,
    b: { s: b.state, x: +b.x.toFixed(2), z: +b.z.toFixed(2), slump: b.anim.slump, busy: b.busy }, r: { s: r.state, x: +r.x.toFixed(2), z: +r.z.toFixed(2), busy: r.busy, wave: r.anim.wave },
    carry: g.carrying?.who || null, cap: g.speedCap, over: p.anim.carryOver, coins: g.coins, ms: g.missions.state };
});
const bubbles = (T) => T.ev(() => [...document.querySelectorAll('.bubble')].filter((b) => b.style.display !== 'none').map((b) => b.textContent).join(' | '));
const prompt = (T) => T.ev(() => document.getElementById('prompt')?.textContent || '');
const card = (T) => T.ev(() => (document.getElementById('objective')?.classList.contains('show') ? document.getElementById('objective').innerText.replace(/\s+/g, ' ') : ''));
// Stand `d` m from landmark `at` along `a` (radians from +z), facing it (`face` true) or away.
const stand = (T, at, d, a, face = true) => T.ev((at, d, a, face) => {
  const g = __game, l = window.__lm(at), x = l.x + Math.sin(a) * d, z = l.z + Math.cos(a) * d, y = Math.atan2(l.x - x, l.z - z) + (face ? 0 : Math.PI);
  g.debugWarp(x, z, y); g.cam.yaw = y; g.cam.snapNext = true;
}, at, d, a, face);
const near = (T, who, d) => T.ev((who, d) => {
  const g = __game, n = g.npc(who), p = g.player, l = Math.hypot(p.x - n.x, p.z - n.z) || 1;
  const x = n.x + ((p.x - n.x) / l) * d, z = n.z + ((p.z - n.z) / l) * d, y = Math.atan2(n.x - x, n.z - z);
  g.debugWarp(x, z, y); g.cam.yaw = y; g.cam.snapNext = true;
}, who, d);
const far = (T) => T.ev(() => { const g = __game; g.debugWarp(230, -230, 0); g.cam.snapNext = true; });
// Carry him home on calibrate's walker, never sprinting: { t (lift-free walk to the desk scene, s),
// robMax, robEnd (Robban's distance to Stig), stuck }. `shot(name)` on the way (x ≈ -40) if given.
async function walkHome(T, shot) {
  await T.ev(() => {
    const g = __game, j = g.berraJob;
    window.__noSprint = true;
    window.__walk = { t0: g.time, robMax: 0, robEnd: null, tEnd: null };
    const l = window.__lm('flamencoRecepcion');
    window.__ap.walk({ kind: 'point', x: l.x, z: l.z, r: 1.0 });
  });
  if (shot) {
    await T.until(() => { const g = __game; return g.berraJob.phase !== 'carry' || Math.abs(g.player.x + 40) < 3; }, 60000).catch(() => {});
    await T.shot(shot);
  }
  await T.ev(() => { __game.dialogSpeed = 24; });
  await T.until(() => document.querySelector('.dlg-text')?.textContent.includes('Hade jag kul') || (!window.__ap.foot && window.__ap.walkResult()?.stuck), 90000);
  const res = await T.ev(() => window.__ap.walkResult());
  await T.ev(() => { window.__ap.foot = null; window.__noSprint = false; });
  return res;
}
async function homeDone(T) {
  await T.until(() => !__game.berraJob.busy, 15000);
  await T.ev(() => { __game.dialogSpeed = 220; });
  await T.frames(4);
  return T.ev(() => { const w = window.__walk; return { t: +(w.tEnd - w.t0).toFixed(1), robMax: +w.robMax.toFixed(1), robEnd: +(w.robEnd ?? -1).toFixed(1) }; });
}

export const SCENARIOS = {
  async berra(T) {
    // 0. Before the grisfest: no job.
    await T.fresh('&mission=11');
    await far(T);
    await T.sleep(1500);
    let r = await job(T);
    check(!r.active && !r.shown && r.phase === 'nap', 'no Berra job before the grisfest');

    await T.fresh('&mission=12');
    await T.ev(() => {
      window.__toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | ');
      const j = __game.berraJob;
      j.release(); j.phase = 'nap'; j.napT = 1e9; j.spotI = 0;
    });
    // 1. The nap never pops into view.
    await stand(T, 'berraBank', 10, 0);
    await T.ev(() => { __game.berraJob.napT = 0; });
    await T.sleep(1200);
    const seen10 = (await job(T)).shown;
    await stand(T, 'berraBank', 30, 0);
    await T.sleep(1200);
    const seen30 = (await job(T)).shown;
    await stand(T, 'berraBank', 30, 0, false);
    await T.until(() => __game.berraJob.shown, 3000).catch(() => {});
    r = await job(T);
    T.log('pop rule', JSON.stringify({ seen10, seen30, behind: r.shown }));
    check(!seen10 && !seen30 && r.shown, 'the nap starts only out of sight (not at 10 m, not in view at 30 m, yes behind the camera)');
    // 2. Asleep on the bench: seated, slumped, still; Robban beside him, waving; "…zzz"; the marker.
    r = await T.ev(() => {
      const g = __game, b = g.npc('berra'), rb = g.npc('robban'), l = window.__lm('berraBank');
      return { s: b.state, slump: b.anim.slump, d: Math.hypot(b.x - l.x, b.z - l.z), rd: Math.hypot(rb.x - l.x, rb.z - l.z), yaw: b.yaw, marker: g.mapMarkers().some((m) => m.type === 'friend' && Math.hypot(m.x - b.x, m.z - b.z) < 0.5) };
    });
    T.log('asleep', JSON.stringify(r));
    check(r.s === 'seated' && r.slump && r.d < 0.3 && r.rd < 2.5 && r.marker, 'Berra asleep on the bench, Robban beside him, the minimap marker');
    await stand(T, 'berraBank', 5.5, 0.35);
    await T.until(() => [...document.querySelectorAll('.bubble')].some((b) => b.textContent.includes('zzz')), 7000);
    const yaw0 = r.yaw;
    r = await job(T);
    const yaw1 = await T.ev(() => __game.npc('berra').yaw);
    T.log('near', JSON.stringify({ wave: r.r.wave, yaw0, yaw1 }));
    check(r.r.wave && Math.abs(yaw1 - yaw0) < 1e-6, 'Robban waves, Berra snores and does not turn');
    await T.shot('berra_bench');
    await near(T, 'robban', 1.8);
    await T.frames(4);
    const pr = await prompt(T);
    check(pr.includes('Prata med Robban'), 'the talk prompt at Robban: ' + pr);
    // 3. Robban asks; the lift.
    await T.ev(() => { __game.dialogSpeed = 24; });
    await T.tap('KeyE');
    await T.until(() => document.querySelector('.dlg-text')?.textContent.includes('bära hem Berra'), 5000);
    await T.shot('berra_ask');
    await T.until(() => document.querySelector('.dlg-text')?.textContent.includes('Bärra hem Berra'), 8000);
    await T.until(() => __game.berraJob.phase === 'carry', 10000);
    await T.ev(() => { __game.dialogSpeed = 220; });
    await T.frames(3);
    r = await job(T);
    const c1 = await card(T);
    const tgt = await T.ev(() => { const t = __game.berraJob.target(), l = window.__lm('flamencoRecepcion'); return t && Math.hypot(t.x - l.x, t.z - l.z); });
    T.log('lift', JSON.stringify(r), c1);
    check(r.carry === 'berra' && r.cap === 3.2 && r.over && r.b.s === 'seated' && c1.includes('BÄRRA HEM BERRA') && c1.includes('receptionen') && tgt === 0, 'the lift: over the shoulders, walk only, the card and the reception as target');
    // 4. The walk home: calibrate's autopilot, never sprinting.
    await T.ev(installAutopilot);
    await T.ev(async () => {
      const { input } = await import('/src/input.js');
      const d0 = input.down.bind(input);
      input.down = (a) => (a === 'sprint' && window.__noSprint ? false : d0(a));
      const g = __game, j = g.berraJob;
      g.onFrame(() => {
        const w = window.__walk, p = g.player, rb = g.npc('robban');
        if (!w) return;
        if (j.phase === 'carry' && w.tEnd == null) { w.robMax = Math.max(w.robMax, Math.hypot(rb.x - p.x, rb.z - p.z)); w.robEnd = Math.hypot(rb.x - p.x, rb.z - p.z); }
        if (j.busy && w.tEnd == null) w.tEnd = g.time;
      });
    });
    let res = await walkHome(T, 'berra_street');
    await T.shot('berra_desk');
    let w = await homeDone(T);
    r = await job(T);
    let toasts = await T.ev(() => window.__toasts());
    T.log('home from the bench', JSON.stringify({ ...w, walker: res, drops: r.drops, coins: r.coins, phase: r.phase, napT: r.napT, spotI: r.spotI, b: r.b }), toasts);
    check(r.drops === 0 && r.coins === 100 && toasts.includes('Robban betalade 100 pta'), 'delivered without a drop: 100 pta and the toast');
    check(w.t > 15 && w.t < 60 && w.robEnd < 6, 'the carry from the bench takes about half a minute on foot; Robban keeps up');
    check(r.phase === 'nap' && r.napT > 140 && r.spotI === 1 && !r.b.slump && !r.b.busy && !r.r.busy && r.carry === null && !r.over, 'after the desk: awake, free, the next nap at the lounger');
    // 5. The next nap: the SunTrip lounger, the sun line in his sleep.
    await T.ev(() => { __game.berraJob.napT = 0; });
    await far(T);
    await T.until(() => __game.berraJob.shown, 5000);
    await stand(T, 'berraSolstol', 6, -2.3);
    await T.until(() => [...document.querySelectorAll('.bubble')].some((b) => b.textContent.includes('solen tar')), 16000);
    r = await T.ev(() => { const g = __game, b = g.npc('berra'), l = window.__lm('berraSolstol'); return { s: b.state, d: Math.hypot(b.x - l.x, b.z - l.z) }; });
    T.log('lounger', JSON.stringify(r));
    check(r.s === 'seated' && r.d < 0.4, 'Berra asleep on the lounger, mumbling about the sun');
    await T.shot('berra_lounger');
    // A smashed lounger: he sleeps on in the sand; the ask still works.
    await T.ev(async () => { const P = await import('/src/world/props.js'), j = __game.berraJob; P.breakProp(j.propOf(j.spot)); });
    await T.until(() => __game.npc('berra').state === 'down', 4000);
    await T.sleep(3000);
    r = await job(T);
    check(r.b.s === 'down' && r.phase === 'asleep' && r.shown, 'the lounger smashed: Berra asleep on the ground');
    await near(T, 'robban', 1.8);
    await T.frames(4);
    await T.tap('KeyE');
    await T.until(() => __game.berraJob.phase === 'carry', 10000);
    // ...and home from the SunTrip pool on the walker.
    res = await walkHome(T);
    w = await homeDone(T);
    r = await job(T);
    T.log('home from the lounger', JSON.stringify({ ...w, walker: res, drops: r.drops, coins: r.coins, spotI: r.spotI }));
    check(r.drops === 0 && r.coins === 200 && w.t > 15 && w.t < 60 && w.robEnd < 6 && r.spotI === 0, 'the carry from the lounger: about half a minute, Robban keeps up, 100 pta');
    // 6. The bench again: no talk to Ole (julafton's giver, 20 m from the desk) with Berra on the
    // shoulders.
    await T.ev(() => { __game.berraJob.napT = 0; });
    await far(T);
    await T.until(() => __game.berraJob.shown, 5000);
    await near(T, 'robban', 1.8);
    await T.frames(4);
    await T.tap('KeyE');
    await T.until(() => __game.berraJob.phase === 'carry', 10000);
    await near(T, 'ole', 1.6);
    await T.frames(5);
    r = await T.ev(() => ({ it: __game.nearestInteractable()?.type || null }));
    await T.tap('KeyE');
    await T.sleep(600);
    const r2 = await job(T);
    T.log('ole', JSON.stringify(r), r2.ms, r2.phase);
    check(r.it !== 'talk' && r2.ms === 'idle' && r2.phase === 'carry', 'no mission talk while carrying Berra');
    // 7. Drops: sprinting, R, a fall. Each: Robban's sigh, the card, Berra stays down, E lifts him.
    const relift = async (what) => {
      await T.until(() => __game.npc('berra').state === 'down', 5000);
      await T.until(() => __game.player.state === 'normal', 6000);
      await T.sleep(2500);
      const s = await job(T), c = await card(T), b = await bubbles(T);
      T.log('drop', what, JSON.stringify({ phase: s.phase, drops: s.drops, b: s.b.s, carry: s.carry, cap: s.cap, over: s.over }), c, b);
      check(s.phase === 'dropped' && s.b.s === 'down' && !s.carry && s.cap === null && !s.over && c.includes('Lyft upp'), `${what}: dropped, he stays down`);
      await near(T, 'berra', 1.2);
      await T.frames(4);
      const pp = await prompt(T);
      check(pp.includes('Lyft upp Berra'), `${what}: the lift prompt (${pp})`);
      await T.tap('KeyE');
      await T.until(() => __game.berraJob.phase === 'carry', 3000);
    };
    await T.ev(() => { const g = __game, l = window.__lm('flamencoRecepcion'); g.debugWarp(l.x - 14, l.z + 14, Math.PI); g.cam.yaw = Math.PI; g.cam.snapNext = true; });
    await T.frames(5);
    await T.hold(['KeyW', 'ShiftLeft'], 700);
    await T.until(() => __game.berraJob.phase === 'dropped', 2000);
    await T.until(() => [...document.querySelectorAll('.bubble')].some((b) => b.textContent.includes('skärpning')), 3000);
    await T.until(() => __game.npc('berra').state === 'down', 5000);
    await T.shot('berra_dropped');
    await relift('sprint');
    await T.tap('KeyR');
    await T.until(() => __game.berraJob.phase === 'dropped', 2000);
    await relift('R');
    await T.ev(() => __game.player.fling(4, 5, 0));
    await T.until(() => __game.berraJob.phase === 'dropped', 2000);
    await relift('fall');
    // 8. Home after three drops: 25 pta.
    const coins0 = (await job(T)).coins;
    await T.ev(() => { const g = __game, l = window.__lm('flamencoRecepcion'); g.debugWarp(l.x, l.z + 1.2, Math.PI); });
    await T.until(() => document.querySelector('.dlg-text')?.textContent.includes('Avdrag'), 8000);
    await T.until(() => !__game.berraJob.busy, 15000);
    r = await job(T);
    T.log('docked', r.drops, r.coins - coins0, await T.ev(() => window.__toasts()));
    check(r.drops === 3 && r.coins - coins0 === 25, 'three drops: Robban pays 25 pta');
    // 9. A mission start sends both home; nothing of the job while it runs; back after it.
    await T.ev(() => { __game.berraJob.napT = 0; });
    await far(T);
    await T.until(() => __game.berraJob.shown, 5000);
    check((await job(T)).spotI === 1, 'the fourth nap: back on the lounger');
    await T.startMission();
    await T.frames(5);
    r = await T.ev(() => {
      const g = __game, j = g.berraJob, b = g.npc('berra'), rb = g.npc('robban'), l = window.__lm('flamencoBar'), k = window.__lm(j.spot.at);
      return { shown: j.shown, phase: j.phase, posed: j.posed('berra'), tgt: j.target(), obj: j.objective(), mk: j.markers().length, s: b.state, slump: b.anim.slump, spot: Math.hypot(b.x - k.x, b.z - k.z), rd: Math.hypot(rb.x - l.x, rb.z - l.z) };
    });
    T.log('mission', JSON.stringify(r));
    // (julafton's round-up then places Berra at the bodega itself.)
    check(!r.shown && r.phase === 'asleep' && !r.posed && !r.tgt && !r.obj && !r.mk && r.s === 'normal' && !r.slump && r.spot > 20 && r.rd < 2.5, 'a mission start sends Berra and Robban home; no job while it runs');
    await T.ev(() => __game.missions.fail('x'));
    await T.sleep(900);
    await T.tap('KeyQ');
    await T.until(() => __game.missions.state === 'idle', 3000);
    await far(T);
    await T.until(() => __game.berraJob.shown, 5000);
    r = await job(T);
    check(r.phase === 'asleep' && r.b.s === 'seated' && r.b.slump && r.spotI === 1, 'after the mission: asleep on the lounger again');
  },
};
