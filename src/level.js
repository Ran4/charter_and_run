// The two levels are configurations of one static world, not scenes (DESIGN §4). main.js applies a
// level with game.setLevel(name) (every row of the §4.3 table). Frozen after Phase 0.

import { CAM_CABIN, FLIGHT_PALETTES } from './world/cabin.js';
import { BOUND } from './world/layout.js';
import { HOMES, MAP_LABELS, LEVEL_OUTFITS } from './content/index.js';
import { METERS } from './meters.js';                 // §5.9, §7.1 (meters.js: Phase 0, then WP-H)

// §13.3 island palettes (fog colour = sky horizon = body background).
export const ISLAND_PALETTES = {
  day: { top: 0x2a86e0, horizon: 0xf2e4c4, fogNear: 220, fogFar: 760, sun: 0xffe7b8, sunI: 2.9, hemiSky: 0xd8ecff, hemiGround: 0xa08060, hemiI: 1.45 },
  night: { top: 0x141a3c, horizon: 0x3a2f4e, fogNear: 120, fogFar: 600, sun: 0x9fb4ff, sunI: 0.9, hemiSky: 0x5a6aa0, hemiGround: 0x3a2a20, hemiI: 0.9 },
  sunset: { top: 0x3a4fa0, horizon: 0xf7a26b, fogNear: 200, fogFar: 760, sun: 0xffb070, sunI: 2.2, hemiSky: 0xffd8b0, hemiGround: 0x8a5a40, hemiI: 1.3 },
};

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
    // Spots keyed on where the player is (cabin.inCabin = the interior rect only).
    resetSpot: (g) => (g.cabin.inCabin(g.player.x, g.player.z) ? 'cabinRow14' : 'gateLounge'),
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
