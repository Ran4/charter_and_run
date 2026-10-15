// Förlåt, förlåt! – Stig-Helmer says sorry (free roam, DESIGN §10.14; feature 11): artig.
//   artig: at index 9 (free roam) on Gasolina's forecourt: a kick that bowls a pedestrian over brings
//          the pedestrian's line and then Stig's first sorry (the session's first offence always);
//          the SKANDAL is what a kick always adds; a second kick within the 7 s gap gets none; a kick
//          into two at once gets one line; a kicked petrol pump "Oj… förlåt.", a kicked bin "Jag
//          ersätter den, självklart!"; in a car on the street, a pedestrian run over "Förlåt! Jag såg
//          er inte!", a bin driven through a prop line, an AI car's prop none; a carjacking: the
//          Swedish driver silent at first, Stig's "Ursäkta, är det din bil?", the driver's "Nej.";
//          a Spanish driver's own complaint and the question, no "Nej."; a Swedish one past the
//          first: the complaint, the question, no "Nej." (the draw stubbed); never over a line of
//          his own; a dialogue drops a queued sorry and takes one that is up down; in a running
//          mission none.
import { check } from '../lib.mjs';

const PI = Math.PI;
// Every line said through game.say since the last reset, as [speaker, text]: 'stig', an NPC key,
// or 'ped<k>' for pedestrian k.
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      const k = g.peds.findIndex((p) => p.char === t);
      window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || (k >= 0 ? `ped${k}` : '?'), text, +(performance.now() / 1000).toFixed(2)]);
      return o(t, text, secs);
    };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const stigSaid = (s) => s.filter(([w]) => w === 'stig');
// A deterministic step: his last bubble down, the gap over, the next offence counted as the first,
// and the SKANDAL at 0 (no pursuit banner over the shots).
const force = (T) => T.ev(() => { const g = __game, s = g.sorry; g.unsay(g.player); s.lastT = -Infinity; s.first = true; g.shame.clear(); });
const sh = (T) => T.ev(() => +__game.shame.v.toFixed(2));
// Stig on foot at (x, z) facing yaw, the camera turned `cam` rad off his back.
async function stand(T, x, z, yaw, cam = 0) {
  await T.ev((x, z, yaw, cam) => {
    const g = __game, p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.teleport(x, z, yaw);
    p.vx = p.vz = 0;
    g.cam.yaw = yaw + cam; g.cam.snapNext = true;
    g.kickT = 0;
  }, x, z, yaw, cam);
  await T.frames(8);
}
// Pedestrian k standing still `along` m ahead of Stig (or his car) and `lat` m to his right.
const plantPed = (T, k, along, lat = 0) => T.ev((k, along, lat) => {
  const g = __game, f = g.playerCar || g.player, ped = g.peds[k], fx = Math.sin(f.yaw), fz = Math.cos(f.yaw);
  ped.char.state = 'normal';
  ped.char.teleport(f.x + fx * along - fz * lat, f.z + fz * along + fx * lat);
  ped.char.vx = ped.char.vz = 0;
  ped.idleT = 30; ped.panicT = 0; ped.startled = null;
}, k, along, lat);
// Everyone but pedestrians 0–2 at least 40 m from (x, z).
const clearPeds = (T, x, z) => T.ev((x, z) => {
  __game.peds.forEach((ped, k) => { if (k > 2 && Math.hypot(ped.char.x - x, ped.char.z - z) < 40) ped.char.teleport(x + 200, z + 200); });
}, x, z);
const pedState = (T, k) => T.ev((k) => __game.peds[k].char.state, k);
async function kick(T) { await T.tap('KeyJ'); await T.sleep(150); }

export const SCENARIOS = {
  async artig(T) {
    await T.fresh('&mission=9');
    await resetSaid(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');
    const cfg = await T.ev(() => { const s = __game.sorry.cfg; return { kick: s.kick, hit: s.hit, prop: s.prop, boom: s.boom, carjack: s.carjack, no: s.no, gap: s.gap, at: s.at }; });
    // Gasolina's forecourt (block (4,3)): its four pumps, the open lane between the two islands.
    const pumps = await T.ev(() => {
      const l = __lm('pintura');
      return __props.filter((p) => p.type === 'gaspump' && Math.hypot(p.x - l.x, p.z - l.z) < 30).map((p) => ({ x: p.x, z: p.z, i: __props.indexOf(p) }));
    });
    T.log('pumps', JSON.stringify(pumps));
    check(pumps.length === 4, 'Gasolina has four pumps');
    const cx = pumps.reduce((a, p) => a + p.x, 0) / 4, cz = pumps.reduce((a, p) => a + p.z, 0) / 4;
    const islandsAlongX = Math.abs(pumps[0].x - pumps[1].x) + Math.abs(pumps[2].x - pumps[3].x) < 1;   // pumps paired on x
    // Stig in the lane between the islands, 3 m short of the middle, facing along it.
    const yaw = islandsAlongX ? 0 : PI / 2;
    const sx = cx - Math.sin(yaw) * 3, sz = cz - Math.cos(yaw) * 3;
    await clearPeds(T, cx, cz);

    // 1. The first kick: the pedestrian's line, then Stig's first sorry, 0.5 s later.
    await stand(T, sx, sz, yaw, -PI / 2 + 0.35);
    await plantPed(T, 0, 1.2);
    await T.frames(4);
    await T.ev(() => __game.shame.clear());
    let v0 = await sh(T);
    await kick(T);
    check((await pedState(T, 0)) === 'flung', 'the kick bowls him over');
    await T.sleep(550);
    await T.shot('artig_spark');
    let s = await said(T);
    T.log('kick 1', JSON.stringify(s));
    const st1 = stigSaid(s);
    check(st1.length === 1 && st1[0][1] === cfg.kick[0], `Stig's first sorry is the kick's first line (${JSON.stringify(st1)})`);
    const pedLine = s.findIndex(([w]) => w === 'ped0');
    check(pedLine >= 0 && pedLine < s.indexOf(st1[0]), 'the pedestrian speaks first');
    const lag = st1[0][2] - s[pedLine][2];
    check(lag > 0.3 && lag < 1.0, `the sorry ${lag.toFixed(2)} s after (0.5 s, game time)`);
    let v1 = await sh(T);
    check(Math.abs(v1 - v0 - 27) < 0.01, `the SKANDAL a kicked pedestrian always adds (${v0} -> ${v1})`);

    // 2. Again within the 7 s gap: his line, no sorry.
    await resetSaid(T);
    await stand(T, sx, sz, yaw, PI - 0.7);
    await plantPed(T, 1, 1.2);
    await T.frames(4);
    await kick(T);
    await T.sleep(1000);
    s = await said(T);
    T.log('kick 2', JSON.stringify(s));
    check(s.some(([w]) => w === 'ped1') && !stigSaid(s).length, `no sorry within the gap (${JSON.stringify(s)})`);

    // 3. One kick into two people: two lines from them, one from Stig, not the one he said last.
    await resetSaid(T);
    await stand(T, sx, sz, yaw, PI / 2 - 0.35);
    await plantPed(T, 0, 1.15, -0.35);
    await plantPed(T, 2, 1.15, 0.35);
    await T.frames(4);
    await force(T);
    await kick(T);
    await T.sleep(550);
    await T.shot('artig_tva');
    await T.sleep(350);
    s = await said(T);
    T.log('kick 3', JSON.stringify(s));
    check(s.some(([w]) => w === 'ped0') && s.some(([w]) => w === 'ped2'), 'both are bowled over and speak');
    const st3 = stigSaid(s);
    check(st3.length === 1 && cfg.kick.includes(st3[0][1]) && st3[0][1] !== cfg.kick[0], `one sorry for the kick, a new line (${JSON.stringify(st3)})`);
    await T.ev(() => __game.shame.clear());

    // 4. A kicked petrol pump goes up: "Oj… förlåt."
    await resetSaid(T);
    const pump = pumps[0];
    const away = islandsAlongX ? (pump.x > cx ? -1 : 1) : 0, awayZ = islandsAlongX ? 0 : (pump.z > cz ? -1 : 1);
    const pyaw = Math.atan2(-away, -awayZ);
    await stand(T, pump.x + away * 1.3, pump.z + awayZ * 1.3, pyaw, PI / 2 + 0.25);
    await force(T);
    v0 = await sh(T);
    await kick(T);
    check(await T.ev((i) => !__props[i].alive, pump.i), 'the pump is broken');
    await T.sleep(800);
    await T.shot('artig_pump');
    s = await said(T);
    T.log('pump', JSON.stringify(s), 'skandal', v0, '->', await sh(T));
    check(Math.abs((await sh(T)) - v0 - 12.6) < 0.01, 'the SKANDAL a kicked pump always adds (6 × 0.7 × 3)');
    check(stigSaid(s).length === 1 && stigSaid(s)[0][1] === cfg.boom[0], `the pump's sorry (${JSON.stringify(s)})`);
    await T.ev(() => __game.shame.clear());

    // 5. A kicked bin: "Jag ersätter den, självklart!"
    await resetSaid(T);
    const bin = await T.ev((x, z) => {
      let best = null, bd = 1e9;
      __props.forEach((p, i) => { if (p.type === 'papelera' && p.alive) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = { x: p.x, z: p.z, i }; } } });
      return best;
    }, cx, cz);
    T.log('bin', JSON.stringify(bin));
    await stand(T, bin.x - 1.3, bin.z, PI / 2, PI - 0.6);
    await clearPeds(T, bin.x, bin.z);
    await force(T);
    await kick(T);
    check(await T.ev((i) => !__props[i].alive, bin.i), 'the bin is broken');
    await T.sleep(800);
    s = await said(T);
    T.log('bin', JSON.stringify(s));
    check(stigSaid(s).length === 1 && stigSaid(s)[0][1] === cfg.prop[0], `the bin's sorry (${JSON.stringify(s)})`);

    // 6. In a car on the street north of the forecourt: a pedestrian run over.
    await resetSaid(T);
    await T.ev(() => __game.shame.clear());
    const road = await T.ev((cx, cz) => {
      const g = __game, p = g.player;
      const car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && !c.spec.pigs && c.spec.len < 5);
      car.place(p.x + 3, p.z, 0);
      g.enterCar(car);
      return { type: car.type };
    }, cx, cz);
    T.log('car', JSON.stringify(road));
    // The road through z = 40 (east-bound lane), west of the forecourt's block.
    const rx = cx - 30, rz = 40 + 2.75;
    await T.ev((x, z) => { const g = __game, c = g.playerCar; c.place(x, z, Math.PI / 2); c.vx = c.vz = 0; g.cam.yaw = Math.PI / 2 + Math.PI - 0.8; g.cam.snapNext = true; }, rx, rz);
    await T.frames(6);
    await clearPeds(T, rx + 10, rz);
    await plantPed(T, 1, 7);
    await T.frames(3);
    await force(T);
    v0 = await sh(T);
    await T.ev(() => { const c = __game.playerCar; c.vx = Math.sin(c.yaw) * 13; c.vz = Math.cos(c.yaw) * 13; });
    await T.until(() => __game.peds[1].char.state !== 'normal', 3000).catch(() => {});
    check((await pedState(T, 1)) !== 'normal', 'he is run over');
    await T.ev(() => { const c = __game.playerCar; c.vx *= 0.3; c.vz *= 0.3; });
    await T.sleep(700);
    await T.shot('artig_kor');
    s = await said(T);
    T.log('run over', JSON.stringify(s), 'skandal', v0, '->', await sh(T));
    check(stigSaid(s).length === 1 && stigSaid(s)[0][1] === cfg.hit[0], `the run-over sorry (${JSON.stringify(s)})`);
    check(Math.abs((await sh(T)) - v0 - 54) < 0.01, 'the SKANDAL a pedestrian run over always adds');

    // 7. A bin driven through: a prop line. A bin an AI car breaks: none.
    await resetSaid(T);
    await T.ev(() => __game.shame.clear());
    const bin2 = await T.ev((x, z) => {
      let best = null, bd = 1e9;
      __props.forEach((p, i) => { if (p.type === 'papelera' && p.alive) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = { x: p.x, z: p.z, i }; } } });
      return best;
    }, rx, rz);
    T.log('bin2', JSON.stringify(bin2));
    await T.ev((b) => {
      const g = __game, c = g.playerCar;
      const y = Math.atan2(1, 0);   // from the west
      c.place(b.x - 6, b.z, y); c.vx = c.vz = 0;
      g.cam.yaw = y + Math.PI - 0.8; g.cam.snapNext = true;
    }, bin2);
    await clearPeds(T, bin2.x, bin2.z);
    await T.frames(5);
    await force(T);
    await T.ev(() => { const c = __game.playerCar; c.vx = Math.sin(c.yaw) * 10; c.vz = Math.cos(c.yaw) * 10; });
    await T.until((i) => !__props[i].alive, 3000, bin2.i).catch(() => {});
    check(await T.ev((i) => !__props[i].alive, bin2.i), 'the car breaks the bin');
    await T.sleep(800);
    s = await said(T);
    T.log('bin driven through', JSON.stringify(s));
    const st7 = stigSaid(s);
    check(st7.length === 1 && cfg.prop.includes(st7[0][1]) && st7[0][1] !== cfg.prop[0], `a prop line, not the last one (${JSON.stringify(st7)})`);
    await resetSaid(T);
    await force(T);
    const aiBroke = await T.ev((x, z) => {
      const g = __game, ai = g.cars.find((c) => c.traffic && !c.dead);
      const p = __props.find((q) => q.alive && q.type === 'papelera' && Math.hypot(q.x - x, q.z - z) > 15);
      g.breakProp(p, 0, 0, ai);
      return !p.alive;
    }, rx, rz);
    await T.sleep(900);
    s = await said(T);
    check(aiBroke && !stigSaid(s).length, `an AI car's prop: no sorry (${JSON.stringify(s)})`);

    // 8. A carjacking, the driver a Swedish tourist (the session's first: "Nej.").
    await T.ev(() => __game.shame.clear());
    await stand(T, rx, rz + 6, PI / 2, PI - 0.9);
    await resetSaid(T);
    await force(T);
    const jack = async (local, stubRandom = null) => T.ev((local, stub) => {
      const g = __game, p = g.player;
      const car = g.cars.find((c) => c.traffic && c.driverBust && !c.dead && !c.locked);
      car.place(p.x + Math.sin(p.yaw) * 3, p.z + Math.cos(p.yaw) * 3, p.yaw + Math.PI / 2);
      car.vx = car.vz = 0;
      // The driver is the pedestrian furthest from Stig (enterCar's reduce).
      const ped = g.peds.reduce((best, q) => (!best || Math.hypot(q.char.x - p.x, q.char.z - p.z) > Math.hypot(best.char.x - p.x, best.char.z - p.z) ? q : best), null);
      const k = g.peds.indexOf(ped);
      ped.char.def.local = local;
      const v0 = g.shame.v;
      const r = Math.random;
      if (stub != null) Math.random = () => stub;
      try { g.enterCar(car); } finally { Math.random = r; }
      g.cam.yaw = car.yaw + Math.PI - 1.0; g.cam.snapNext = true;
      return { k, now: window.__said.slice(), dv: +(g.shame.v - v0).toFixed(2), in: g.playerCar === car };
    }, local, stubRandom);
    let j = await jack(false);
    T.log('carjack 1', JSON.stringify(j));
    check(j.in, 'he takes the car');
    check(!j.now.some(([w]) => w === `ped${j.k}`), `the Swedish driver says nothing at first (${JSON.stringify(j.now)})`);
    check(Math.abs(j.dv - 24) < 0.01, `the SKANDAL a carjacking always adds (${j.dv})`);
    await T.sleep(1650);
    await T.shot('artig_kapning');
    s = await said(T);
    T.log('carjack 1', JSON.stringify(s));
    const q1 = s.find(([w]) => w === 'stig'), n1 = s.find(([w]) => w === `ped${j.k}`);
    check(q1 && q1[1] === cfg.carjack[0], `Stig asks (${JSON.stringify(s)})`);
    check(n1 && n1[1] === cfg.no && n1[2] > q1[2] + 0.5, `the driver answers "Nej." after the question (${JSON.stringify(s)})`);
    await T.sleep(1500);

    // 9. A Spanish driver: his own complaint at once, the question, no "Nej.".
    await stand(T, rx, rz + 6, PI / 2, PI - 0.9);
    await resetSaid(T);
    await force(T);
    j = await jack(true);
    await T.sleep(1800);
    s = await said(T);
    T.log('carjack 2', JSON.stringify(j), JSON.stringify(s));
    check(j.now.some(([w, t]) => w === `ped${j.k}` && ['¡Ladrón!', '¡Mi coche!', '¡Policía!'].includes(t)), 'the Spanish driver complains at once');
    check(s.some(([w, t]) => w === 'stig' && t === cfg.carjack[0]), 'Stig asks');
    check(!s.some(([, t]) => t === cfg.no), 'no "Nej."');
    // 10. A Swedish driver past the session's first, the draw over `noChance`: the complaint, the
    //     question, no "Nej.".
    await stand(T, rx, rz + 6, PI / 2, PI - 0.9);
    await resetSaid(T);
    await force(T);
    j = await jack(false, 0.99);
    await T.sleep(1800);
    s = await said(T);
    T.log('carjack 3', JSON.stringify(j), JSON.stringify(s));
    check(j.now.some(([w, t]) => w === `ped${j.k}` && ['Det fattades bara det…!', 'Jag har betalat 3 000 för den!'].includes(t)), 'the Swedish driver complains');
    check(s.some(([w, t]) => w === 'stig' && t === cfg.carjack[0]) && !s.some(([, t]) => t === cfg.no), 'the question, no "Nej."');

    // 11. Never over a line of his own.
    await stand(T, sx, sz, yaw, PI - 0.7);
    await clearPeds(T, cx, cz);
    await plantPed(T, 0, 1.2);
    await T.frames(4);
    await resetSaid(T);
    await force(T);
    await T.ev(() => { const g = __game; g.say(g.player, 'Mina ögon tål inte klor.', 3); });
    await kick(T);
    await T.sleep(900);
    s = await said(T);
    T.log('over his own line', JSON.stringify(s));
    check(stigSaid(s).length === 1 && (await T.ev(() => __game.sorry.queue.length)) === 0, `no sorry over his own line (${JSON.stringify(s)})`);
    await T.sleep(2500);

    // 12. A dialogue drops a queued sorry, and takes one that is up down.
    await stand(T, sx, sz, yaw, PI - 0.7);
    await plantPed(T, 0, 1.2);
    await T.frames(4);
    await resetSaid(T);
    await force(T);
    await T.tap('KeyJ');
    await T.until(() => __game.sorry.queue.length > 0, 2000).catch(() => {});
    await T.ev(() => { __game.inDialog = true; });
    await T.frames(3);
    check((await T.ev(() => __game.sorry.queue.length)) === 0, 'the dialogue drops the queue');
    await T.sleep(800);
    await T.ev(() => { __game.inDialog = false; });
    s = await said(T);
    check(!stigSaid(s).length, `nothing said over the dialogue (${JSON.stringify(s)})`);
    await stand(T, sx, sz, yaw, PI - 0.7);
    await plantPed(T, 1, 1.2);
    await T.frames(4);
    await resetSaid(T);
    await force(T);
    await kick(T);
    await T.until(() => __game.saying(__game.player), 2000).catch(() => {});
    const up = await T.ev(() => [...document.querySelectorAll('.bubble')].map((b) => b.textContent));
    await T.ev(() => { __game.inDialog = true; });
    await T.frames(3);
    const after = await T.ev(() => ({ saying: __game.saying(__game.player), bubbles: [...document.querySelectorAll('.bubble')].map((b) => b.textContent) }));
    await T.ev(() => { __game.inDialog = false; });
    T.log('bubble down', JSON.stringify(up), '->', JSON.stringify(after));
    check(up.some((t) => cfg.kick.includes(t)) && !after.saying && !after.bubbles.some((t) => cfg.kick.includes(t)), 'a dialogue takes his sorry down');

    // 13. In a running mission: no sorry.
    await T.startMission();
    await T.ev(() => __game.shame.clear());
    const pp = await T.ev(() => ({ x: __game.player.x, z: __game.player.z, yaw: __game.player.yaw }));
    await clearPeds(T, pp.x, pp.z);
    await plantPed(T, 0, 1.2);
    await T.frames(4);
    await resetSaid(T);
    await force(T);
    await kick(T);
    await T.sleep(1000);
    s = await said(T);
    T.log('in a mission', await T.state(), JSON.stringify(s));
    check(await T.ev(() => __game.missions.state === 'running'), 'a mission runs');
    check(s.some(([w]) => w === 'ped0') && !stigSaid(s).length, `no sorry in a mission (${JSON.stringify(s)})`);
  },
};
