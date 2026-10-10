// The two levels are configurations of one static world, not scenes (DESIGN §4). main.js applies a
// level with game.setLevel(name) (every row of the §4.3 table). Frozen after Phase 0.

import { CAM_CABIN, FLIGHT_PALETTES, CABIN_X } from './world/cabin.js';
import { BOUND } from './world/layout.js';
import { dist } from './util.js';
import { HOMES, MAP_LABELS, LEVEL_OUTFITS } from './content/index.js';
import { METERS } from './meters.js';                 // §5.9, §7.1 (meters.js: Phase 0, then WP-H)

// §13.3 island palettes (fog colour = sky horizon = body background). sunDir = the sun's offset
// from the shadow target (+z = south): high from the ESE by day and night, low from the WSW at
// sunset (28° N in December), so the sunset shadows are long and point away from it. cloudRim =
// the town clouds' outline (a sky-blue rim glowed cyan round the night clouds and blue round the
// peach sunset ones).
export const ISLAND_PALETTES = {
  day: { top: 0x2a86e0, horizon: 0xf2e4c4, fogNear: 220, fogFar: 760, sun: 0xffe7b8, sunI: 2.9, hemiSky: 0xd8ecff, hemiGround: 0xa08060, hemiI: 1.45, sunDir: [70, 130, 45], cloudRim: 0x6f9ccc },
  night: { top: 0x141a3c, horizon: 0x3a2f4e, fogNear: 120, fogFar: 600, sun: 0x9fb4ff, sunI: 0.9, hemiSky: 0x5a6aa0, hemiGround: 0x3a2a20, hemiI: 0.9, sunDir: [70, 130, 45], cloudRim: 0x101433 },
  sunset: { top: 0x3a4fa0, horizon: 0xf7a26b, fogNear: 200, fogFar: 760, sun: 0xffb070, sunI: 2.2, hemiSky: 0xffd8b0, hemiGround: 0x8a5a40, hemiI: 1.3, sunDir: [-105, 60, 60], cloudRim: 0xa0605a },
};

// The aisle's centre line at the player's row: the nearest free spot within 2 m along it, else
// where he stands.
function aisleSpot(g) {
  const p = g.player, z0 = Math.max(-18.5, Math.min(16.8, p.z));
  for (let k = 0; k <= 10; k++) {
    const z = z0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.4;
    if (g.spotFree(CABIN_X, z)) return { x: CABIN_X, z, yaw: p.yaw };
  }
  return { x: p.x, z: p.z, yaw: p.yaw };
}

export const LEVELS = {
  flight: {
    name: 'flight', title: 'Flygresan',
    meter: 'flygradsla',            // METERS key → game.shame.configure()
    camProfile: CAM_CABIN,          // §5.3
    map: 'cabin',                   // game asks cabin.mapSource(phase)
    clouds: false,                  // town sky clouds hidden
    shadows: false,                 // sun.castShadow
    sim: { traffic: false, peds: false },   // skip traffic AI/peds stepping + hide them
    verbs: { jump: false, kick: false, hold: true, mantra: true, enterCars: false },
    speeds: { walk: 3.6, sprint: 5.2 },
    tune: 'muzak',
    phaseForIndex: (i) => (i <= 1 ? 'gate' : 'cruise'),
    paletteFor: (phase) => FLIGHT_PALETTES[phase],
    // Cast keyed on mission progress, never on phase: ombord (index 1) starts in phase 'gate' with
    // the player already on board, and its cast must be seated from the first frame.
    homes: (g) => (g.missions.index === 0 ? HOMES.gate : HOMES.flight),
    outfits: (g) => (g.missions.index === 0 ? LEVEL_OUTFITS.gate : LEVEL_OUTFITS.flight),
    inBounds: (x, z, g) => g.cabin.inside(x, z),
    spawn: (g, i) => (i === 0 ? 'gateStart' : i === 1 ? 'cabinDoor' : 'cabinRow14'),
    // R (§3), keyed on where the player is (cabin.inCabin = the interior rect only). In the cabin:
    // back into the aisle at the same row, never along it (R to row 14 sat him in 14B for free in
    // ombord's and landning's seat dashes). In the terminal: the lounge; on a timed stage (the
    // toilet dash) the lounge or else Ole's spot (the PANIK home, behind the dash start), whichever
    // is not nearer the stage's target than he is, else null: R does nothing (main.js says so). A
    // guide waypoint's own `goal` counts, not the waypoint (the dash's corridor guide). Phase 3 r3:
    // R did nothing whenever the lounge was nearer the target, on the untimed stages too (the
    // queue, boarding), where it is the only way out of a wedge (no jump in the flight level).
    resetSpot: (g) => {
      const p = g.player;
      if (g.cabin.inCabin(p.x, p.z)) return aisleSpot(g);
      const w = g.missions.target(), t = w?.goal || w;
      if (!t || g.missions.stage?.o?.timer == null) return 'gateLounge';
      const d = dist(p.x, p.z, t.x, t.z);
      return ['gateLounge', 'gateOle'].map((n) => g.approachSpot(n)).find((s) => dist(s.x, s.z, t.x, t.z) >= d) || null;
    },
    panicHome: (g) => (g.cabin.inCabin(g.player.x, g.player.z) ? { seat: '14B' } : { lm: 'gateOle' }),
    routeAim: false,                // markers/guide arrow aim straight at the target (§5.2)
    labels: () => MAP_LABELS.flight,
    titleOrbit: { x: 3012, z: 8, r: 32, h: 20 },
  },
  island: {
    name: 'island', title: 'Nueva Estocolmo',
    meter: 'skandal', camProfile: null, map: 'town', clouds: true, shadows: true,
    sim: { traffic: true, peds: true },
    verbs: { jump: true, kick: true, hold: false, mantra: false, enterCars: true },
    speeds: { walk: 5.4, sprint: 8.8 },
    tune: 'sol', palette: 'day',
    homes: () => HOMES.island,
    outfits: () => LEVEL_OUTFITS.island,
    routeAim: true,
    inBounds: (x, z) => Math.abs(x) < BOUND - 5 && Math.abs(z) < BOUND - 5,
    spawn: (g, i) => (i === 5 ? 'airport' : 'flamencoDeck'),
    resetSpot: null,                 // null = Bigmouth "nearest road" reset (use P/HALF constants)
    labels: () => MAP_LABELS.island,
    titleOrbit: { lm: 'flamencoPool', r: 45, h: 24 },
  },
};

export { METERS };
