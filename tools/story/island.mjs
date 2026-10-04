// The story script for the island missions, M[5..12] (DESIGN §16.3). Owner: WP-G.
// Phase 0b: drives the placeholder missions (src/game/missions/island.js) through debug warps.
import { check } from '../lib.mjs';
import { untilStage, warpLm, footAt, carBeside, touchAll, followCar, breakAll, raceCheckpoints, haggleWin } from './common.mjs';

export const M_ISLAND = [
  // 5 · buss17: into bus 17 (Ole aboard), drive to Hotel Flamenco, stop.
  async (T) => {
    await T.startMission();
    await T.enterNamed('buss17');
    await untilStage(T, 1);
    await warpLm(T, 'flamencoDrive');
    await T.waitIdle(6);
    check(await T.ev(() => __game.player.outfit === 'hawaii'), 'buss17 outro: hawaii shirt');
  },
  // 6 · friskotek: catch the beach balls, back to Lasse.
  async (T) => {
    await T.startMission();
    await touchAll(T);
    await untilStage(T, 1);
    await warpLm(T, 'friskotek');
    await T.waitIdle(7);
  },
  // 7 · asnan: a car, pick Ole up, haggle on foot, drive the wet donkey to Viking Bar with Ole.
  async (T) => {
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    await carBeside(T, 'ole');
    await untilStage(T, 2);
    await footAt(T, 'asnestand', { approach: true });
    await haggleWin(T);
    await untilStage(T, 3);
    await carBeside(T, 'ole');
    await T.until(() => __game.npc('ole').car === __game.playerCar, 10000);
    await warpLm(T, 'vikingbar');
    await T.waitIdle(8);
  },
  // 8 · bodega: a car, tail the pig truck, take it over, wreck the Guardia jeep.
  async (T) => {
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    await followCar(T, 12);
    await untilStage(T, 2);
    await T.ev(() => { const g = __game, c = g.missions.stage.car; if (g.playerCar) g.exitCar(true); g.enterCar(c); });
    await untilStage(T, 3);
    await T.ev(() => __game.missions.stage.car.damage(999, __game));
    await T.waitIdle(9);
    check(await T.ev(() => __game.unlocked.has('grisbil') && !!__game.named.grisbil), 'bodega unlocks the grisbil');
  },
  // 9 · ropavieja: tail José at 20 m (not closer than 14), then spy from the plaza on foot.
  async (T) => {
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    await followCar(T, 20);
    await untilStage(T, 2);
    await footAt(T, 'plaza');
    await T.waitIdle(10);
  },
  // 10 · fataga: catch the sheep, back to the fold.
  async (T) => {
    await T.startMission();
    await touchAll(T);
    await untilStage(T, 1);
    await warpLm(T, 'fatagaFold');
    await T.waitIdle(11);
  },
  // 11 · grisfest (Ole pays the 800 if short): a car at dusk, the night race, plate smashing.
  async (T) => {
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    check(await T.ev(() => __game.sky === 'night'), 'grisfest: night sky after stage 1 startCue');
    await raceCheckpoints(T);
    await untilStage(T, 2);
    await breakAll(T);
    await T.waitIdle(12);
    check(await T.ev(() => __game.sky === 'day'), 'grisfest onEnd: back to the day palette');
  },
  // 12 · julafton: round up the guests, room 113, the mantra duet with Majsan by the pool.
  async (T) => {
    await T.startMission();
    await T.ev(() => { if (__game.playerCar) __game.exitCar(true); });
    await touchAll(T);
    await untilStage(T, 2);
    await footAt(T, 'flamencoPool');
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running');
    await T.waitIdle(13);
  },
];
