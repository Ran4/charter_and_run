// Stage-kind contract scenarios (Phase 0b; owner none, Phase 2 keeps them green):
//   fullstory — swaps the literal §8 missions (tools/fixtures/full-missions.js) into MISSIONS and plays
//               them per the §16.3 outline (FROM / TO env as for `story`); proves the frozen kinds,
//               the runner and game.cue accept the real mission data.
//   kinds     — targeted checks of options the story never fails on: haggle misses, follow minDist,
//               smooth/fragile meters, carry spills, timeline lockSeat, checkpoint retry with ambient
//               cues and revived plates, grab at a wreck, scene exitCar, destroy without a spawn.
import { check, missionDataProblems } from '../lib.mjs';
import { untilStage, warpLm, footAt, carBeside, touchAll, followCar, breakAll, raceCheckpoints, haggleWin } from '../story/common.mjs';

// Swap the §8 fixture into the live MISSIONS array (same module instances as the game).
async function useFull(T) {
  await T.ev(async () => {
    const { FULL_MISSIONS } = await import('/tools/fixtures/full-missions.js');
    const M = window.__missions();
    M.splice(0, M.length, ...FULL_MISSIONS);
    __game.placeNpcs(true);
  });
}

// Run one synthetic single-mission def (built in the page from kinds) at the current index.
async function useSynthetic(T, src) {
  await T.ev(async (src) => {
    const K = await import('/src/game/missions/kinds/index.js');
    const def = new Function('K', `return (${src});`)(K);
    const M = window.__missions(), g = __game;
    M[g.missions.index] = { ...M[g.missions.index], ...def };
    g.placeNpcs(true);
  }, src);
}

const M_FULL = [
  // 0 gate
  async (T) => {
    await T.startMission();
    await warpLm(T, 'gateArch');
    await T.tap('KeyE');
    await untilStage(T, 1);
    await warpLm(T, 'gateOle');
    await untilStage(T, 3);
    await warpLm(T, 'herrtoa');
    await untilStage(T, 4);
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running' || __game.missions.stageI >= 5);
    await untilStage(T, 6);
    await warpLm(T, 'gateLounge');
    await untilStage(T, 8);
    await warpLm(T, 'cabinDoor');
    await T.waitIdle(1);
  },
  // 1 ombord
  async (T) => {
    await T.startMission();
    await T.sit('14B');
    await untilStage(T, 1);
    const lock = await T.ev(() => { const g = __game; return { prompt: g.nearestInteractable()?.type ?? null, locks: g.stageLocksSeat() }; });
    T.log('timeline lockSeat', JSON.stringify(lock));
    check(lock.locks && lock.prompt !== 'stand', 'timeline lockSeat: no "Res dig" while the takeoff runs');
    await T.tap('KeyR');
    check(await T.ev(() => __game.player.seatId === '14B'), 'timeline lockSeat: R ignored');
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running');
    await T.waitIdle(2);
  },
  // 2 juice
  async (T) => {
    await T.startMission();
    await T.sit('14B');
    await T.frames(3);
    await T.tap('KeyE');
    await untilStage(T, 1);
    await T.ev(() => { const g = __game; g.cabin.stopTrolley(); });
    await T.ev(() => { const g = __game, a = g.missions.stage.at; g.debugWarp(a.x, a.z, Math.PI); });
    await T.frames(3);
    await T.tap('KeyE');
    await untilStage(T, 2);
    await warpLm(T, 'cabinRow14');
    await untilStage(T, 3);
    await T.sit('14B');
    await T.waitIdle(3);
  },
  // 3 sprit
  async (T) => {
    await T.startMission();
    await touchAll(T);
    await untilStage(T, 1);
    await warpLm(T, 'galleyFront');
    await T.waitIdle(4);
  },
  // 4 landning
  async (T) => {
    await T.startMission();
    await touchAll(T);
    await untilStage(T, 1);
    await T.sit('14B');
    await untilStage(T, 2);
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running');
    await T.waitIdle(5);
    check(await T.ev(() => __game.level === 'island'), 'landning -> island');
  },
  // 5 buss17
  async (T) => {
    await T.startMission();
    const hidden = await T.ev(() => ['fruStorch', 'herrStorch'].every((k) => __game.npc(k).state === 'hidden'));
    await T.enterNamed('buss17');
    await untilStage(T, 1);
    const bus = await T.ev(() => { const g = __game, c = g.playerCar; return { name: c?.name, ole: g.npc('ole').car === c, riders: c?.riders.length }; });
    T.log('buss17', JSON.stringify({ hidden, ...bus }));
    check(hidden && bus.name === 'buss17' && bus.ole && bus.riders === 4, 'buss17: hidden riders, 4 window busts, Ole aboard');
    await warpLm(T, 'flamencoDrive');
    await T.waitIdle(6);
    check(await T.ev(() => __game.player.outfit === 'hawaii'), 'buss17 outro: hawaii');
  },
  // 6 friskotek
  async (T) => {
    await T.startMission();
    await touchAll(T);
    await untilStage(T, 1);
    await warpLm(T, 'friskotek');
    await T.waitIdle(7);
  },
  // 7 asnan
  async (T) => {
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    await carBeside(T, 'ole');
    await untilStage(T, 2);
    await warpLm(T, 'marknad');
    await untilStage(T, 3);
    await footAt(T, 'asnestand', { approach: true });
    await haggleWin(T);
    await untilStage(T, 4);
    await T.ev(() => { const g = __game, it = g.missions.stage.item; g.debugWarp(it.x, it.z, 0); });
    await untilStage(T, 5);
    await carBeside(T, 'ole');
    await T.until(() => __game.npc('ole').car === __game.playerCar, 10000);
    await warpLm(T, 'supermercado');
    await untilStage(T, 6);
    await T.ev(() => { const g = __game, it = g.missions.stage.item; g.debugWarp(it.x, it.z, g.playerCar?.yaw ?? 0); });
    await untilStage(T, 7);
    check(await T.ev(() => !!__game.playerCar && __game.npc('ole').car === __game.playerCar), 'asnan paint scene: both stay seated (frame only)');
    await untilStage(T, 8);
    await warpLm(T, 'vikingbar');
    await untilStage(T, 9);
    await footAt(T, 'vikingbar');
    await T.waitIdle(8);
  },
  // 8 bodega
  async (T) => {
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    await carBeside(T, 'berra');
    await untilStage(T, 2);
    check(await T.ev(() => { const g = __game; return g.npc('robban').state === 'hidden' && g.playerCar.riders.length === 1; }), 'bodega pickup: robban rides as a bust');
    await warpLm(T, 'playa');
    await untilStage(T, 3);
    await warpLm(T, 'vischan');
    await untilStage(T, 5);
    check(await T.ev(() => { const g = __game; return g.npc('robban').state === 'normal' && g.npc('berra').car === null; }), 'bodega dropoff riderOff: robban shown, berra out');
    await untilStage(T, 6);
    await followCar(T, 12);
    await untilStage(T, 7);
    await T.ev(() => { const g = __game, c = g.missions.stage.car; if (g.playerCar) g.exitCar(true); g.enterCar(c); });
    await untilStage(T, 8);
    await T.ev(() => __game.missions.stage.car.damage(999, __game));
    await untilStage(T, 9);
    await warpLm(T, 'flamencoBack');
    await T.waitIdle(9);
  },
  // 9 ropavieja
  async (T) => {
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    await followCar(T, 20);
    await untilStage(T, 2);
    await footAt(T, 'plaza');
    await T.waitIdle(10);
  },
  // 10 fataga
  async (T) => {
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    await carBeside(T, 'majsan');
    await untilStage(T, 2);
    await followCar(T, 12);
    await untilStage(T, 4);
    check(await T.ev(() => { const g = __game; return g.npc('siv').state === 'normal' && !(g.cars.some((c) => c.riders?.some((o) => o.userData.riderKey === 'siv'))); }), 'fataga scene: placed siv leaves her rider bust');
    await touchAll(T);
    await untilStage(T, 5);
    await warpLm(T, 'fatagaFold');
    await T.waitIdle(11);
  },
  // 11 grisfest
  async (T) => {
    await T.startMission();
    await touchAll(T);
    await untilStage(T, 1);
    await T.anyCar();
    await untilStage(T, 2);
    await raceCheckpoints(T);
    await untilStage(T, 3);
    await breakAll(T);
    await untilStage(T, 5);
    await T.anyCar();
    await warpLm(T, 'tongatonga');
    await untilStage(T, 7);
    await carBeside(T, 'berra');
    await untilStage(T, 8);
    await warpLm(T, 'flamencoDrive');
    await untilStage(T, 9);
    await T.ev(() => { if (__game.playerCar) __game.exitCar(true); });
    await T.frames(5);
    check(await T.ev(() => __game.player.anim.carryOver && __game.carrying?.who === 'berra'), 'grisfest: Berra over the shoulders');
    await warpLm(T, 'flamencoRecepcion');
    await T.waitIdle(12);
    check(await T.ev(() => __game.sky === 'day'), 'grisfest onEnd: day');
  },
  // 12 julafton
  async (T) => {
    await T.startMission();
    await T.ev(() => { if (__game.playerCar) __game.exitCar(true); });
    await touchAll(T);
    await untilStage(T, 1);
    await warpLm(T, 'flamencoPool');
    await untilStage(T, 4);
    await footAt(T, 'flamencoPool');
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running');
    await T.waitIdle(13);
    check(await T.ev(() => __game.unlocked.has('bodega')), 'julafton unlocks the bodega');
  },
];

export const SCENARIOS = {
  async fullstory(T) {
    const from = +(process.env.FROM || 0);
    const to = process.env.TO !== undefined ? +process.env.TO : M_FULL.length;
    if (from) await T.fresh(`&mission=${from}`);
    await useFull(T);
    try {
      for (let k = from; k < to; k++) await M_FULL[k](T);
    } finally {
      T.story = { expect: to, index: await T.ev(() => __game.missions.index) };
    }
  },

  async kinds(T) {
    // --- the literal §8 fixture passes the same data checks as the shipped missions.
    const bad = await T.ev(missionDataProblems, null, '/tools/fixtures/full-missions.js');
    for (const b of bad) T.log('fixture data:', b);
    check(!bad.length, 'fixture data checks');
    // --- haggle: three misses fail with failText; the bid has priority over the car prompt.
    await T.fresh('&mission=7');
    await useSynthetic(T, `{ stages: [() => K.haggle({ at: 'asnestand', who: 'souvenir', partner: 'ole', start: 500, steps: [400, 300, 200], zones: [0.3, 0.22, 0.15], speeds: [0.8, 1.1, 1.4], maxMiss: 3, pay: 200, barLabel: 'PRIS', failText: 'HAGGLE-FAIL', text: 'h' })] }`);
    await T.startMission();
    await footAt(T, 'asnestand', { approach: true });
    await T.until(() => __game.missions.stage?.phase === 'bid', 15000);
    await T.shot('kinds_haggle');
    await T.ev(() => { const g = __game, c = g.cars.find((c) => !c.locked && !c.noEnter && !c.dead); const p = g.player; c.place(p.x + 2.2, p.z, 0); });
    await T.frames(3);
    check(await T.ev(() => __game.nearestInteractable()?.it?.id === 'haggle'), 'haggle bid outranks the car next to the player');
    for (let k = 0; k < 3; k++) {
      await T.until(() => { const s = __game.missions.stage; return !s || (s.phase === 'bid' && !__game.inDialog && (s.mk < s.zone[0] - 0.05 || s.mk > s.zone[1] + 0.05)); }, 20000);
      await T.tap('KeyE');
      await T.frames(2);
    }
    await T.until(() => __game.missions.state === 'failed', 5000);
    check(await T.ev(() => document.querySelector('.banner-sub').textContent === 'HAGGLE-FAIL'), 'haggle: maxMiss misses fail with failText');
    await T.tap('KeyQ');

    // --- follow minDist: closer than minDist for > minGrace fails with minText; the bar has a zone.
    await T.fresh('&mission=9');
    await useSynthetic(T, `{ stages: [() => K.follow({ type: 'hatch', carName: 'joseBil', driver: 'jose', passenger: 'siv', riders: ['mamma'], start: { lane: [[5, 3], [4, 3]], t: 12 }, via: [[4, 4], [3, 4]], to: 'grillpacoCurb', maxDist: 75, minDist: 14, minGrace: 2, minText: 'TOO-CLOSE', cruise: 10, text: 'f' })] }`);
    await T.startMission();
    await T.anyCar();
    await T.ev(() => { const g = __game, c = g.missions.stage.car; g.debugWarp(c.x - Math.sin(c.yaw) * 25, c.z - Math.cos(c.yaw) * 25, c.yaw); });
    await T.sleep(1500);
    await T.shot('kinds_follow');
    const o = await T.ev(() => __game.missions.objective());
    check(o.zone && o.zone[1] > 0.7 && o.zone[1] < 0.9, 'follow minDist: green zone on the bar');
    const t0 = Date.now();
    while (Date.now() - t0 < 15000 && (await T.ev(() => __game.missions.state === 'running'))) {
      await T.ev(() => { const g = __game, c = g.missions.stage.car; g.debugWarp(c.x - Math.sin(c.yaw) * 7, c.z - Math.cos(c.yaw) * 7, c.yaw); });
      await T.sleep(300);
    }
    check(await T.ev(() => __game.missions.state === 'failed' && document.querySelector('.banner-sub').textContent === 'TOO-CLOSE'), 'follow: too close for too long fails with minText');
    await T.tap('KeyQ');

    // --- goto smooth / fragile meters: hard impacts move the bars, teleports don't.
    await T.fresh('&mission=7');
    await useSynthetic(T, `{ stages: [() => K.goto({ to: 'vikingbar', radius: 7, inCar: true, timer: 80, smooth: { label: 'ÅKSJUKA', failText: 'SICK' }, text: 'g' }), () => K.goto({ to: 'marknad', radius: 7, inCar: true, fragile: { label: 'SKICK', failText: 'PAINT' }, text: 'g2' })] }`);
    await T.startMission();
    await T.anyCar();
    await T.warp(-40, -160, 0);
    await T.frames(5);
    const kick = (v) => T.ev((v) => { const c = __game.playerCar; c.vx = 0; c.vz = v; }, v);
    let v0 = await T.ev(() => __game.missions.stage.ride.v);
    await kick(9);
    await T.frames(2);
    let v1 = await T.ev(() => __game.missions.stage.ride.v);
    T.log('smooth bar', v0.toFixed(1), '->', v1.toFixed(1));
    check(v0 < 1 && v1 > 12, 'smooth: an impact raises ÅKSJUKA, the teleport did not');
    await T.shot('kinds_smooth');
    await T.frames(40);
    const v2 = await T.ev(() => __game.missions.stage.ride.v);
    check(v2 < v1, 'smooth: the bar decays');
    await warpLm(T, 'vikingbar');
    await untilStage(T, 1);
    await T.warp(-40, -160, 0);
    await T.frames(5);
    v0 = await T.ev(() => __game.missions.stage.ride.v);
    await kick(10);
    await T.frames(2);
    v1 = await T.ev(() => __game.missions.stage.ride.v);
    T.log('fragile bar', v0.toFixed(1), '->', v1.toFixed(1));
    check(v0 === 100 && v1 < 80, 'fragile: an impact costs SKICK, the teleport did not');
    await T.ev(() => { const m = __game.missions; if (m.state === 'running') m.fail('x'); });
    await T.tap('KeyQ');

    // --- carry: a bump (trolley/turbulence) spills the juice.
    await T.fresh('&mission=2');
    await useSynthetic(T, `{ stages: [() => K.carry({ item: 'juice', to: 'galleyFront', radius: 1.2, text: 'c', failText: 'SPILLED', failOn: { bumped: true, sprintSecs: 1.0 } })] }`);
    await T.startMission();
    await T.frames(5);
    check(await T.ev(() => __game.carrying?.item === 'juice'), 'carry sets game.carrying');
    await T.ev(() => { __game.bumpedT = 0.4; });
    await T.until(() => __game.missions.state === 'failed', 3000);
    check(await T.ev(() => __game.carrying === null && document.querySelector('.banner-sub').textContent === 'SPILLED'), 'carry: bumped spills and cleanup resets carrying');
    await T.tap('KeyQ');

    // --- checkpoint retry: ambient cues re-applied (night, vals), plates revived, retryAt spot.
    await T.fresh('&mission=11');
    await useFull(T);
    await T.startMission();
    await touchAll(T);
    await untilStage(T, 1);
    await T.anyCar();
    await untilStage(T, 2);
    await raceCheckpoints(T);
    await untilStage(T, 3);
    await T.ev(() => { const g = __game, st = g.missions.stage; for (const p of st.list.slice(0, 4)) g.breakProp(p, 0, 0); });
    await T.frames(3);
    await T.ev(() => { const g = __game; g.missions.fail('test'); g.setSky('day'); });
    await T.until(() => __game.missions.state === 'failed', 3000);
    await T.sleep(1000);
    await T.tap('KeyE');
    await T.until(() => __game.missions.state === 'running', 5000);
    await T.frames(3);
    const r = await T.ev(() => { const g = __game, st = g.missions.stage, d = window.__lm('dansgolv'); return { i: g.missions.stageI, sky: g.sky, alive: st.list.filter((p) => p.alive).length, n: st.list.length, d: Math.hypot(g.player.x - d.x, g.player.z - d.z) }; });
    T.log('retry', JSON.stringify(r));
    check(r.i === 3 && r.sky === 'night' && r.alive === r.n && r.d < 3, 'retry: smash again at dansgolv, at night, plates intact');
    await T.shot('kinds_retry_night');
    await T.ev(() => __game.missions.fail('x'));
    await T.sleep(900);
    await T.tap('KeyQ');
    await T.frames(3);
    check(await T.ev(() => __game.sky === 'day'), 'abort: onEnd/restoreAmbience back to day');

    // --- destroy (no spawn: a node 70–130 m away) -> grab at the wreck; scene exitCar.
    await T.fresh('&mission=8');
    await useSynthetic(T, `{ stages: [() => K.getInCar({}), () => K.destroy({ type: 'guardia', timer: 60, text: 'd' }), () => K.grab({ mesh: 'vaska', gotText: 'GOT', text: 'gr' }), () => K.scene({ exitCar: true, lines: [['stig', 'Hej.']] })] }`);
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    const d = await T.ev(() => { const g = __game, c = g.missions.stage.car, f = g.focus(); return Math.hypot(c.x - f.x, c.z - f.z); });
    T.log('destroy spawn distance', d.toFixed(0));
    check(d > 60 && d < 150, 'destroy: default spawn 70–130 m away');
    await T.ev(() => __game.missions.stage.car.damage(999, __game));
    await untilStage(T, 2);
    await T.ev(() => { const g = __game, it = g.missions.stage.item; g.debugWarp(it.x, it.z, 0); });
    await untilStage(T, 3);
    await T.frames(5);
    check(await T.ev(() => !__game.playerCar), 'scene exitCar: the player is out of the car');
    await T.until(() => __game.missions.state !== 'running', 15000);
  },
};
