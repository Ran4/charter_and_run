// The story script for the island missions, M[5..12] (DESIGN §16.3). Owner: WP-G.
// Plays the full §8.6–8.13 sheets (src/game/missions/island.js) through debug warps and asserts the
// staging that matters (riders, outfits, sky, unlocks, who stands where).
// SHOTS=1 also saves screenshots of the key scenes (isl_*.png in OUT) for visual review.
import { check } from '../lib.mjs';
import { untilStage, warpLm, footAt, carBeside, touchAll, followCar, breakAll, raceCheckpoints, haggleWin } from './common.mjs';

const SHOTS = !!process.env.SHOTS;

// Screenshot once a dialogue line containing `text` is on screen (SHOTS only). Returns a promise
// that callers may start before the action that triggers the line and await afterwards.
// `before` = a stage index: the wait gives up (shot skipped) once the running mission reaches that
// stage, so a missed line never holds the script while a timed stage's clock runs (a missed "Heia
// Norge!" blocked 60 s and ran the 19 s Tonga drive out four times). An intro line passes 0.
function shotWhen(T, name, text, { timeout = 60000, before = null } = {}) {
  if (!SHOTS) return Promise.resolve();
  return T.until((t, b) => {
    if ((document.querySelector('#dialog .dlg-text')?.textContent || '').includes(t)) return 'line';
    const m = __game.missions;
    return b != null && m.state === 'running' && m.stageI >= b ? 'gone' : false;
  }, timeout, text, before)
    .then(async (h) => ((await h.jsonValue()) === 'line' ? T.shot(`isl_${name}`) : T.log(`shot skipped (stage ${before} began first):`, name)), () => T.log('shot skipped (line never shown):', name));
}
async function shot(T, name) { if (SHOTS) await T.shot(`isl_${name}`); }
// SHOTS: slow the dialogue down so a line stays up long enough to be photographed. Every script
// calls it: a FROM run reloads the page at its first mission, which resets the speed.
async function slow(T) { if (SHOTS) await T.ev(() => { __game.dialogSpeed = 28; }); }

export const M_ISLAND = [
  // 5 · buss17: into bus 17 (Ole aboard, four window busts), drive to Hotel Flamenco, stop.
  async (T) => {
    await slow(T);
    const s1 = shotWhen(T, 'buss17_intro', 'Josito', { before: 0 });
    await T.startMission();
    await s1;
    const hidden = await T.ev(() => ['fruStorch', 'herrStorch', 'majsan', 'siv'].every((k) => __game.npc(k).state === 'hidden'));
    await T.enterNamed('buss17');
    await untilStage(T, 1);
    const bus = await T.ev(() => { const g = __game, c = g.playerCar; return { name: c?.name, ole: g.npc('ole').car === c, riders: c?.riders.length, timer: g.missions.stage.t }; });
    T.log('buss17', JSON.stringify({ hidden, ...bus }));
    check(hidden && bus.name === 'buss17' && bus.ole && bus.riders === 4, 'buss17: hidden riders, 4 window busts, Ole aboard');
    await shot(T, 'buss17_drive');
    const s2 = shotWhen(T, 'buss17_momento', 'Momento');
    const s3 = shotWhen(T, 'buss17_outro', 'sterke farger');
    await warpLm(T, 'flamencoDrive');
    await s2; await s3;
    await T.waitIdle(6);
    check(await T.ev(() => __game.player.outfit === 'hawaii'), 'buss17 outro: hawaii shirt');
    check(await T.ev(() => ['fruStorch', 'herrStorch', 'majsan', 'siv'].every((k) => __game.npc(k).state !== 'hidden')), 'buss17: riders shown again after the mission');
  },
  // 6 · friskotek: catch the six beach balls, back to Lasse.
  async (T) => {
    await slow(T);
    const s1 = shotWhen(T, 'friskotek_oath', 'Jag lovar att bli', { before: 0 });
    await T.startMission();
    await s1;
    await shot(T, 'friskotek_balls');
    await touchAll(T);
    await untilStage(T, 1);
    const s2 = shotWhen(T, 'friskotek_hepaare', 'Hä-pååre');
    await warpLm(T, 'friskotek');
    await s2;
    await T.waitIdle(7);
  },
  // 7 · asnan: a car, pick Ole up, Ole haggles on foot, the donkey, the knäckebröd, the paint
  // scene in the car, the wet-paint drive to Viking Bar, the package on foot.
  async (T) => {
    await slow(T);
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    await carBeside(T, 'ole');
    await untilStage(T, 2);
    await warpLm(T, 'marknad');
    await untilStage(T, 3);
    await footAt(T, 'asnestand', { approach: true });
    const s1 = shotWhen(T, 'asnan_haggle', 'Hvor mye');
    await haggleWin(T);
    await s1;
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
    check(await T.ev(() => __game.missions.stage.ride?.kind === 'fragile'), 'asnan: the SKICK bar runs on the wet-paint drive');
    // Park as a player does, inside the 7 m radius on the courtyard side, not on the bar's door.
    await T.ev(() => { const l = window.__lm('vikingbar'); __game.debugWarp(l.x, l.z + 6, l.yaw); });
    await T.frames(3);
    await untilStage(T, 9);
    const s2 = shotWhen(T, 'asnan_vikingbar', 'lilla vikingen');
    await footAt(T, 'vikingbar');
    await s2;
    await T.waitIdle(8);
  },
  // 8 · bodega: Berra (+ Robban as a bust) to the beach, then inland; the dropoff and the hitch;
  // tail the pig truck, take it over, wreck the Guardia jeep, drive the pigs home.
  async (T) => {
    await slow(T);
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
    await shot(T, 'bodega_grisbil');
    await followCar(T, 12);
    await untilStage(T, 7);
    await T.ev(() => { const g = __game, c = g.missions.stage.car; if (g.playerCar) g.exitCar(true); g.enterCar(c); });
    await untilStage(T, 8);
    await shot(T, 'bodega_jeep');
    await T.ev(() => __game.missions.stage.car.damage(999, __game));
    await untilStage(T, 9);
    check(await T.ev(() => __game.playerCar?.name === 'grisbilFollow' && __game.npc('berra').car === __game.playerCar), 'bodega: home in the grisbil with Berra');
    const s1 = shotWhen(T, 'bodega_benidorm', 'Benidorm');
    const s2 = shotWhen(T, 'bodega_hittelon', 'Tänk på det');
    await warpLm(T, 'flamencoBack');
    await s1; await s2;
    await T.waitIdle(9);
    check(await T.ev(() => __game.unlocked.has('grisbil') && !!__game.named.grisbil), 'bodega unlocks the grisbil');
  },
  // 9 · ropavieja: tail José at 20 m (never closer than minDist), then spy from the plaza on foot.
  async (T) => {
    await slow(T);
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    check(await T.ev(() => { const st = __game.missions.stage, c = st.car; return c.riders.length === 1 && __game.npc('siv').car === c; }), 'ropavieja: Siv beside José, mamma in the back');
    await followCar(T, 20);
    await untilStage(T, 2);
    const s1 = shotWhen(T, 'ropavieja_mamma', 'mamma följde med');
    await footAt(T, 'plaza');
    await s1;
    await T.waitIdle(10);
  },
  // 10 · fataga: Majsan (+ Siv), tail the excursion bus, the scene, round up the sheep.
  async (T) => {
    await slow(T);
    await T.startMission();
    await T.anyCar();
    await untilStage(T, 1);
    await carBeside(T, 'majsan');
    await untilStage(T, 2);
    await followCar(T, 12);
    await untilStage(T, 4);
    check(await T.ev(() => { const g = __game; return g.npc('siv').state === 'normal' && !(g.cars.some((c) => c.riders?.some((o) => o.userData.riderKey === 'siv'))); }), 'fataga scene: placed siv leaves her rider bust');
    await shot(T, 'fataga_sheep');
    await touchAll(T);
    await untilStage(T, 5);
    await warpLm(T, 'fatagaFold');
    await T.waitIdle(11);
  },
  // 11 · grisfest (Ole pays the 800 if short): flowers, the hire car at dusk, the night race, the
  // plates, the dance, Tonga Tonga, "Bärra hem Berra" on the shoulders, the porter.
  async (T) => {
    await slow(T);
    await T.startMission();
    await touchAll(T);
    await untilStage(T, 1);
    await T.enterNamed('hyrbil');
    await untilStage(T, 2);
    check(await T.ev(() => __game.sky === 'night'), 'grisfest: night sky after stage 2 startCue');
    check(await T.ev(() => __game.playerCar?.name === 'hyrbil'), 'grisfest: the race in the hire car');
    await T.until(() => __game.missions.stage?.countdown <= 0, 20000);
    await shot(T, 'grisfest_race');
    await raceCheckpoints(T);
    await untilStage(T, 3);
    await footAt(T, 'dansgolv');
    await shot(T, 'grisfest_plates');
    await breakAll(T);
    const s1 = shotWhen(T, 'grisfest_dance', 'Heia Norge', { before: 5 });
    await untilStage(T, 4);
    check(await T.ev(() => __game.npc('ole').outfit === 'gris'), 'grisfest: Ole in his gris shirt for the dance');
    await s1;
    await untilStage(T, 5);
    await T.anyCar();
    const s2 = shotWhen(T, 'grisfest_tonga', 'Bärra hem Berra');
    // Arrive as a player does, from the street: inside the 10 m radius, short of the club front (a
    // car warped onto the landmark stood in the middle of the scene's street shot).
    await T.ev(() => { const l = window.__lm('tongatonga'); __game.debugWarp(l.x, l.z + 9.5, l.yaw); });
    await T.frames(3);
    await untilStage(T, 7);
    await s2;
    await carBeside(T, 'berra');
    await untilStage(T, 8);
    await warpLm(T, 'flamencoDrive');
    await untilStage(T, 9);
    await T.ev(() => { if (__game.playerCar) __game.exitCar(true); });
    await T.frames(5);
    check(await T.ev(() => __game.player.anim.carryOver && __game.carrying?.who === 'berra'), 'grisfest: Berra over the shoulders');
    await shot(T, 'grisfest_carry');
    const s3 = shotWhen(T, 'grisfest_porter', '500 pesetas kanske');
    const s4 = shotWhen(T, 'grisfest_bonor', 'bruna bönor');
    await warpLm(T, 'flamencoRecepcion');
    await s3; await s4;
    await T.waitIdle(12);
    check(await T.ev(() => __game.sky === 'day'), 'grisfest onEnd: back to the day palette');
  },
  // 12 · julafton: the suitcase, round up the guests, the pool party, room 113, the mantra duet.
  async (T) => {
    await slow(T);
    const s0 = shotWhen(T, 'julafton_hammarby', 'Hammarby', { before: 0 });
    await T.startMission();
    await s0;
    await T.ev(() => { if (__game.playerCar) __game.exitCar(true); });
    await touchAll(T);
    await untilStage(T, 1);
    const s1 = shotWhen(T, 'julafton_party', 'Objektivlokket');
    const s2 = shotWhen(T, 'julafton_bodega', 'baksidan av hotellet');
    const s3 = shotWhen(T, 'julafton_rum113', 'Hoppsan');
    await warpLm(T, 'flamencoPool');
    await s1; await s2; await s3;
    await untilStage(T, 4);
    check(await T.ev(() => __game.sky === 'sunset'), 'julafton: sunset for the duet');
    await footAt(T, 'flamencoPool');
    const s4 = shotWhen(T, 'julafton_duet', 'inte rädd');
    await T.holdUntil('KeyJ', () => __game.missions.state !== 'running');
    await s4;
    await T.waitIdle(13);
    check(await T.ev(() => __game.unlocked.has('bodega')), 'julafton unlocks the bodega');
  },
];
