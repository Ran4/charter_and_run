// The story script for the flight missions, M[0..4] (DESIGN §16.3). Owner: WP-F.
// Drives the real §8.1–8.5 missions (src/game/missions/flight.js) through debug warps and asserts
// the beats that matter: the gate outfit swap, the cast seated from ombord on, the takeoff ending in
// cruise, the juice reaching 14B, the round-up re-seating everyone, and the handover to the island.
// SHOTS=1 also saves screenshots of the key scenes (fl_*.png in OUT) for visual review.
import { check } from '../lib.mjs';
import { untilStage, warpLm, touchAll } from './common.mjs';

const SHOTS = !!process.env.SHOTS;

// Screenshot once a dialogue line containing `text` is on screen (SHOTS only), as in island.mjs.
function shotWhen(T, name, text, timeout = 60000) {
  if (!SHOTS) return Promise.resolve();
  return T.until((t) => (document.querySelector('#dialog .dlg-text')?.textContent || '').includes(t), timeout, text)
    .then(() => T.shot(`fl_${name}`), () => T.log('shot skipped (line never shown):', name));
}
const shots = (T, list) => Promise.all(list.map(([name, text]) => shotWhen(T, name, text)));
async function shot(T, name) { if (SHOTS) await T.shot(`fl_${name}`); }
// SHOTS: slow the dialogue down so a line stays up long enough to be photographed.
async function slow(T) { if (SHOTS) await T.ev(() => { __game.dialogSpeed = 28; }); }

const stageIs = (T, i) => T.ev((i) => __game.missions.state === 'running' && __game.missions.stageI === i, i);

export const M_FLIGHT = [
  // 0 · gate: arch (E) -> Ole's statistics at gate 8 -> dash to the men's room -> mantra (J) ->
  // Berra -> the queue past the ladies' door (overheard) -> the bodega tip -> on board.
  async (T) => {
    await slow(T);
    const s0 = shots(T, [['gate_intro', 'Rutinekontroll']]);
    await T.startMission();
    await s0;
    check(await T.ev(() => __game.player.outfit === 'arlanda' && __game.cabin.phase === 'gate'), 'gate: arlanda outfit, phase gate');
    await warpLm(T, 'gateArch');
    const s1 = shots(T, [['gate_shoe', 'ta av er skon'], ['gate_terrorist', 'Kolla terroristen']]);
    await T.tap('KeyE');
    await s1;
    await untilStage(T, 1);
    const s2 = shots(T, [['gate_stats', '50 prosent']]);
    await warpLm(T, 'gateOle');
    await s2;
    await untilStage(T, 3);
    const v = await T.ev(() => __game.shame.v);
    T.log('gate: fear at the dash', v.toFixed(0));
    await warpLm(T, 'herrtoa');
    await untilStage(T, 4);
    const s3 = shots(T, [['gate_berra', 'järn'], ['gate_vemfan', 'vem fan']]);
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running' || __game.missions.stageI >= 5);
    await s3;
    await untilStage(T, 6);
    const s4 = shots(T, [['gate_swahn', 'Lennart Swahn'], ['gate_bodega', 'Glöm aldrig']]);
    await warpLm(T, 'gateLounge');
    await s4;
    await untilStage(T, 8);
    const s5 = shots(T, [['gate_outro', 'giraff']]);
    await warpLm(T, 'cabinDoor');
    await s5;
    await T.waitIdle(1);
    const r = await T.ev(() => { const g = __game; return { outfit: g.player.outfit, ole: g.cabin.seatOf(g.npc('ole')), majsan: g.cabin.seatOf(g.npc('majsan')) }; });
    T.log('after gate', JSON.stringify(r));
    check(r.outfit === 'kostym' && r.ole === '14A' && r.majsan === '16E', 'after gate: kostym, cast seated');
  },
  // 1 · ombord: find 14B (the timer runs), hold the mantra through the takeoff timeline.
  async (T) => {
    await slow(T);
    const s0 = shots(T, [['ombord_intro', 'rad tretton']]);
    await T.startMission();
    await s0;
    check(await T.ev(() => __game.cabin.seatbelt && __game.cabin.blockers.some((b) => b.active)), 'ombord: seatbelt sign and luggage stowers');
    await T.sit('14B');
    await untilStage(T, 1);
    check(await T.ev(() => !__game.cabin.blockers.some((b) => b.active)), 'ombord: stowers gone once seated');
    const s1 = shots(T, [['ombord_merke', 'merke'], ['ombord_concorde', 'Concorde']]);
    const s2 = SHOTS ? T.until(() => (__game.missions.stage?.t ?? 0) >= 12 || __game.missions.state !== 'running', 60000).then(() => shot(T, 'ombord_takeoff'), () => {}) : null;
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running');
    await s2;
    await s1;
    await T.waitIdle(2);
    check(await T.ev(() => __game.cabin.phase === 'cruise'), 'ombord ends in cruise');
  },
  // 2 · juice: call button from 14B, juice at the (stopped) trolley, carry it back, sit.
  async (T) => {
    await slow(T);
    await T.startMission();
    await T.sit('14B');
    await T.frames(3);
    const s0 = shots(T, [['juice_cup', 'Nei…!']]);
    await T.tap('KeyE');
    await s0;
    await untilStage(T, 1);
    await T.ev(() => { const g = __game; g.cabin.stopTrolley(); });
    await T.ev(() => { const g = __game, a = g.missions.stage.at; g.debugWarp(a.x, a.z, Math.PI); });
    await T.frames(3);
    await T.tap('KeyE');
    await untilStage(T, 2);
    check(await T.ev(() => __game.carrying?.item === 'juice'), 'juice: carrying the cup');
    await warpLm(T, 'cabinRow14');
    await untilStage(T, 3);
    const s1 = shots(T, [['juice_outro', 'Neste gang']]);
    await T.sit('14B');
    await s1;
    await T.waitIdle(3);
  },
  // 3 · sprit: catch the rolling bottles, then to the front galley.
  async (T) => {
    await slow(T);
    const s0 = shots(T, [['sprit_berra', 'vackert']]);
    await T.startMission();
    await s0;
    check(await T.ev(() => __game.missions.stage.list.length === 5), 'sprit: five bottles');
    await touchAll(T);
    await untilStage(T, 1);
    const s1 = shots(T, [['sprit_nykter', 'nykter'], ['sprit_kvarts', 'Kvarts']]);
    await warpLm(T, 'galleyFront');
    await s1;
    await T.waitIdle(4);
  },
  // 4 · landning: round up the standing passengers, back to 14B, mantra through the approach.
  async (T) => {
    await slow(T);
    const s0 = shots(T, [['landning_fyra', 'Giraffen']]);
    await T.startMission();
    await s0;
    await touchAll(T);
    await untilStage(T, 1);
    await T.sit('14B');
    await untilStage(T, 2);
    check(await stageIs(T, 2), 'landning: approach stage');
    const s1 = shots(T, [['landning_tomater', 'tomater'], ['landning_skarpning', 'skärpning']]);
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running');
    await s1;
    await T.waitIdle(5);
    const r = await T.ev(() => { const g = __game, a = window.__lm('airport'); return { level: g.level, d: Math.hypot(g.player.x - a.x, g.player.z - a.z) }; });
    T.log('landed on the island', JSON.stringify(r));
    check(r.level === 'island' && r.d < 20, 'after landning: island, near the airport');
  },
];
