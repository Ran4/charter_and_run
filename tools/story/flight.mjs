// The story script for the flight missions, M[0..4] (DESIGN §16.3). Owner: WP-F.
// Phase 0b: drives the placeholder missions (src/game/missions/flight.js) through debug warps.
import { check } from '../lib.mjs';
import { untilStage, warpLm, touchAll } from './common.mjs';

export const M_FLIGHT = [
  // 0 · gate: arch (E) -> dash to the men's room -> mantra (J) -> past the ladies' door -> on board.
  async (T) => {
    await T.startMission();
    await warpLm(T, 'gateArch');
    await T.tap('KeyE');
    await untilStage(T, 1);
    await warpLm(T, 'herrtoa');
    await untilStage(T, 2);
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running' || __game.missions.stageI >= 3);
    await untilStage(T, 3);
    await warpLm(T, 'damtoaDoor');          // starts the overheard "fyra p:na" (awaitOverhear)
    await T.frames(10);
    await warpLm(T, 'cabinDoor');
    await T.waitIdle(1);
  },
  // 1 · ombord: sit in 14B, hold the mantra through the takeoff timeline.
  async (T) => {
    await T.startMission();
    await T.sit('14B');
    await untilStage(T, 1);
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running');
    await T.waitIdle(2);
    check(await T.ev(() => __game.cabin.phase === 'cruise'), 'ombord ends in cruise');
  },
  // 2 · juice: call button from 14B, juice at the (stopped) trolley, carry it back, sit.
  async (T) => {
    await T.startMission();
    await T.sit('14B');
    await T.frames(3);
    await T.tap('KeyE');
    await untilStage(T, 1);
    await T.ev(() => { const g = __game; g.cabin.stopTrolley(); g.cabin.trolleyStopped = true; });
    await T.ev(() => { const g = __game, a = g.missions.stage.at; g.debugWarp(a.x, a.z, Math.PI); });
    await T.frames(3);
    await T.tap('KeyE');
    await untilStage(T, 2);
    await warpLm(T, 'cabinRow14');
    await untilStage(T, 3);
    await T.sit('14B');
    await T.waitIdle(3);
  },
  // 3 · sprit: catch the rolling bottles, then to the front galley.
  async (T) => {
    await T.startMission();
    await touchAll(T);
    await untilStage(T, 1);
    await warpLm(T, 'galleyFront');
    await T.waitIdle(4);
  },
  // 4 · landning: round up the standing passengers, back to 14B, mantra through the approach.
  async (T) => {
    await T.startMission();
    await touchAll(T);
    await untilStage(T, 1);
    await T.sit('14B');
    await untilStage(T, 2);
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running');
    await T.waitIdle(5);
    const r = await T.ev(() => { const g = __game, a = window.__lm('airport'); return { level: g.level, d: Math.hypot(g.player.x - a.x, g.player.z - a.z) }; });
    T.log('landed on the island', JSON.stringify(r));
    check(r.level === 'island' && r.d < 20, 'after landning: island, near the airport');
  },
];
