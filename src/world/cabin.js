// Level 1 "Flygresan" (DESIGN §5; WP-A1): the Arlanda gate set and the cut-away DC-8 cabin, built
// once at x = 3000 (local (lx, lz) = world (x - 3000, z)). The nose points +z; seats A B C are on
// the port side (+x), D E F on starboard (-x). Floor = the engine's infinite CURB plane.
//
// Phase 0 ships the REAL collision table, seat map, seat objects and landmarks, the phase machine,
// turbulence and jolts, the trolley (kinematic, bowls the player over), the luggage stowers, the
// fear sources and the interactables, with plain-box visuals. WP-A1 replaces the visuals and
// polishes behaviour; WP-A2 replaces the outside (flightScenery.js). The API below is frozen.

import { THREE, GeoBuilder, toonMesh, signMesh, setSkyPalette } from '../gfx.js';
import { box, circle, blocks } from './collision.js';
import { landmarks } from './layout.js';
import { Car, registerCarType } from '../actors/car.js';
import { Character } from '../actors/character.js';
import { CHARS, randomPed, buildBustGeo } from '../actors/models.js';
import { placeCoin } from '../actors/pickups.js';
import { audio } from '../audio.js';
import { hud } from '../game/hud.js';
import { fx } from '../game/fx.js';
import { buildFlightScenery } from './flightScenery.js';
import { OLE_STATS, CHATTER_FLIGHT } from '../content/flight.js';
import { S } from '../strings.js';
import { mulberry32, pick, dist } from '../util.js';

export const CABIN_X = 3000;
const CX = CABIN_X;

export const CAM_CABIN = { pivotH: 1.5, dist: 6.5, pitchMin: 0.72, pitchMax: 1.1, pitch0: 0.9,
  noPull: true, fov: 58, cineSide: 2.0, cineUp: 3.6, clampZ: [-19.2, 17.2] };

// §13.3 sky palettes (fog near >= 40 so the interior is never fogged) and the phase -> palette map.
export const PALETTES = {
  gate: { top: 0x8e99a6, horizon: 0xc7ccd2, fogNear: 40, fogFar: 300, sun: 0xdfe8f2, sunI: 0.8, hemiSky: 0xc8d4e0, hemiGround: 0xf0f4f8, hemiI: 1.5, window: 0xb8c0c8 },
  clouds: { top: 0xe8eef4, horizon: 0xf4f6f8, fogNear: 160, fogFar: 520, sun: 0xffffff, sunI: 1.0, hemiSky: 0xffffff, hemiGround: 0xe8eef4, hemiI: 1.7, window: 0xf8f8f8 },
  above: { top: 0x1f6fd0, horizon: 0xbfe0ff, fogNear: 300, fogFar: 900, sun: 0xfff4dc, sunI: 2.6, hemiSky: 0xe6f2ff, hemiGround: 0xffffff, hemiI: 1.6, window: 0x7fb8ef },
  descent: { top: 0x2a86e0, horizon: 0xf2e4c4, fogNear: 260, fogFar: 820, sun: 0xffe7b8, sunI: 2.8, hemiSky: 0xd8ecff, hemiGround: 0xa08060, hemiI: 1.5, window: 0x9ad0f0 },
  island: { top: 0x2a86e0, horizon: 0xf2e4c4, fogNear: 220, fogFar: 760, sun: 0xffe7b8, sunI: 2.9, hemiSky: 0xd8ecff, hemiGround: 0xa08060, hemiI: 1.45, window: 0xa8d8f8 },
};
// Keyed by PHASE (level.js: paletteFor: (phase) => FLIGHT_PALETTES[phase]).
export const FLIGHT_PALETTES = {
  gate: PALETTES.gate, takeoff: PALETTES.gate, climb: PALETTES.clouds, cruise: PALETTES.above,
  approach: PALETTES.descent, landing: PALETTES.island, landed: PALETTES.island,
};

// FLYGRÄDSLA sources and reliefs owned by the cabin (§5.9). Rates are per (scaled) second.
export const FEAR = {
  standSeatbelt: 1.5, sprint: 1, takeoffRoll: 4, takeoffRollSecs: 10, climbBump: 8, approach: 1,
  touchdown: 10, reverse: 5, joltUnheld: 6, joltFall: 12, joltHeld: 1, joltSeated: 4, joltSeatedMantra: 1,
  bowled: 12, oleBark: 8, oleBarkEvery: 25, oleBarkR: 4, seatedRelief: 5, seatedReliefBelt: 2,
  toilet: 50, blockerBump: 3,
};

export const PHASES = ['gate', 'takeoff', 'climb', 'cruise', 'approach', 'landing', 'landed'];
export const PHASE_LEN = { takeoff: 12, climb: 8, approach: 14, landing: 6 };
const NEXT = { takeoff: 'climb', climb: 'cruise', approach: 'landing', landing: 'landed' };
const DRONE = { gate: [0.25, 0.2], takeoff: [0.9, 1], climb: [0.7, 0.6], cruise: [0.45, 0.3], approach: [0.6, 0.5], landing: [0.6, 0.5], landed: [0.2, 0.1] };

// Rows 1-12 and 14-24 (no row 13).
export const ROWS = [...Array(12).keys()].map((k) => k + 1).concat([...Array(11).keys()].map((k) => k + 14));
export const rowZ = (row) => 12.4 - 1.2 * (row <= 12 ? row - 1 : row - 2);
export const SEAT_X = { A: 2.0, B: 1.45, C: 0.9, D: -0.9, E: -1.45, F: -2.0 };
// The seat map (§5.4). Cast seats are never filled with busts; nor is 14C, nor C/D of the dodge rows.
export const CAST_SEATS = { '6C': 'angerud', '10A': 'herrStorch', '10B': 'fruStorch', '14A': 'ole', '14B': 'stig', '16D': 'jose', '16E': 'majsan', '16F': 'siv', '22C': 'berra', '22D': 'robban' };
export const DODGE_ROWS = [3, 8, 12, 15, 18, 20, 23];
const BLOCKER_ROWS = [3, 8, 12];

// §5.5 landmarks: [lx, lz, yaw, y?]
const LANDMARKS = {
  gateStart: [36.5, 5.0, -Math.PI / 2], gateQueue: [35.6, 6.6, Math.PI / 2], gateArch: [33.0, 5.0, -Math.PI / 2],
  gateOle: [23.0, 11.8, Math.PI], gateLounge: [22.0, 16.0, 0], gateDesk: [18.0, 20.5, -Math.PI / 2],
  herrtoaDoor: [29.0, 25.2, Math.PI / 2], herrtoa: [33.5, 26.0, Math.PI / 2], damtoaDoor: [28.8, 18.4, Math.PI / 2],
  bridge: [8.0, 14.7, -Math.PI / 2], bridgeQueue1: [4.2, 14.2, -Math.PI / 2], bridgeQueue2: [5.2, 15.2, -Math.PI / 2],
  cabinDoor: [0.8, 14.7, Math.PI], galleyFront: [-0.2, 13.0, Math.PI], cockpitDoor: [0, 16.6, Math.PI],
  cabinRow6: [0, 6.3, 0], cabinRow10: [0, 1.5, 0], cabinRow14: [0.25, -2.1, Math.PI / 2], cabinRow16: [-0.25, -4.5, -Math.PI / 2],
  cabinRow22: [0, -11.7, Math.PI / 2], cabinCentre: [0, 0, 0], toiletBackL: [0.6, -15.6, Math.PI / 2], toiletBackR: [-0.6, -15.6, -Math.PI / 2],
  galleyBack: [0, -17.6, 0], trolleyPark: [0, 16.2, Math.PI], call14: [1.45, -2.2, 0, 2.2],
};

const COL = { seat: 0xd2601f, cushion: 0xe07a3a, anti: 0xf2efe6, wall: 0xe6dcc4, rack: 0xd8cdb4, curtain: 0x1f4f55, galley: 0x9a9a92, carpet: 0x5a4a3a,
  lounge: 0x6a4a32, counter: 0xd8743a, wood: 0x9a6a3a, cream: 0xe8e0cc, toilet: 0x8a9aaa };

// ---------------------------------------------------------------------------------------------

function buildTrolley(spec, color) {
  const g = new GeoBuilder();
  const L = spec.len, W = spec.wid, y0 = 0.06;
  g.boxB(color, 0, y0, 0, W, 0.86, L);
  for (let k = 0; k < 3; k++) g.box(0x9aa0a8, W / 2 + 0.005, y0 + 0.2 + k * 0.25, 0, 0.01, 0.18, L - 0.12);
  g.boxB(0x9a9a92, 0, y0 + 0.86, 0, W + 0.04, 0.04, L + 0.04);
  for (let k = 0; k < 4; k++) g.cyl(k % 2 ? 0xd8321e : 0xf7c31b, -0.1 + (k % 2) * 0.2, y0 + 0.97, -0.25 + k * 0.15, 0.04, 0.13, 8);
  for (let k = 0; k < 3; k++) g.cyl(0xf4f4f0, 0.12, y0 + 0.95, 0.15 - k * 0.12, 0.035, 0.1, 8);
  g.box(0x3a3a40, 0, y0 + 0.95, -L / 2 - 0.05, W, 0.04, 0.04);   // push bar at the rear (-z local)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.sphere(0x1d1d22, sx * (W / 2 - 0.05), 0.04, sz * (L / 2 - 0.08), 0.08);
  return { geo: g.build(), glass: null };
}

export function buildCabin(scene, game) {
  const S = new GeoBuilder(), F = new GeoBuilder();       // cabin (always visible)
  const GS = new GeoBuilder(), GF = new GeoBuilder();     // gate set (phase gate only)
  const W = (lx) => CX + lx;
  const solid = (minX, minZ, maxX, maxZ, top, kind) => box(W(minX), minZ, W(maxX), maxZ, top, kind);
  // Visual box from a local rect: footprint [x0, x1] x [z0, z1], from y0 to y1.
  const vbox = (G, color, x0, z0, x1, z1, y0, y1) => G.boxB(color, W((x0 + x1) / 2), y0, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
  const WALL_H = 2.6, FLOOR = 0.15;

  // ---- cabin collision (§5.2) ---------------------------------------------------------------
  const cabinBlocks = [];
  const cb = (minX, minZ, maxX, maxZ, top, kind, color, vis = true) => {
    const b = solid(minX, minZ, maxX, maxZ, top, kind);
    cabinBlocks.push(b);
    if (vis) vbox(S, color, minX, minZ, maxX, maxZ, FLOOR, Math.min(top, WALL_H));
    return b;
  };
  cb(2.45, -19.0, 3.45, 14.0, 99, 'bound', COL.wall);
  cb(2.45, 15.4, 3.45, 17.4, 99, 'bound', COL.wall);
  const doorBlock = solid(2.45, 14.0, 3.45, 15.4, 99, 'door');
  cb(-3.45, -19.0, -2.45, 17.4, 99, 'bound', COL.wall);
  cb(-3.45, 17.4, 3.45, 18.4, 99, 'bound', COL.wall);
  cb(-3.45, -20.0, 3.45, -19.0, 99, 'bound', COL.wall);
  for (const row of ROWS) {
    const z = rowZ(row);
    for (const [x0, x1] of [[0.6, 2.45], [-2.45, -0.6]]) {
      cb(x0, z - 0.52, x1, z - 0.40, 1.25, 'seatback', COL.seat, false);
      cb(x0, z - 0.40, x1, z - 0.05, 0.55, 'cushion', COL.cushion, false);
    }
    // Seat visuals: three seats per side, antimacassars on top.
    for (const L of 'ABCDEF') {
      const x = SEAT_X[L];
      S.boxB(COL.seat, W(x), FLOOR, z - 0.46, 0.52, 1.1, 0.12);
      S.boxB(COL.anti, W(x), FLOOR + 0.95, z - 0.465, 0.38, 0.16, 0.13);
      S.boxB(COL.cushion, W(x), FLOOR, z - 0.225, 0.52, 0.4, 0.35);
      S.boxB(COL.seat, W(x + (x > 0 ? 0.27 : -0.27)), FLOOR + 0.4, z - 0.24, 0.05, 0.22, 0.4);
    }
  }
  cb(-2.45, 13.6, -0.7, 16.8, 1.0, 'galley', COL.galley);
  cb(0.7, 15.6, 2.45, 17.4, 2.0, 'galley', COL.galley);
  cb(1.0, -16.4, 2.45, -14.9, 99, 'toilet', COL.toilet);
  cb(-2.45, -16.4, -1.0, -14.9, 99, 'toilet', COL.toilet);
  cb(0.8, -19.0, 2.45, -16.6, 1.0, 'galley', COL.galley);
  cb(-2.45, -19.0, -0.8, -16.6, 1.0, 'galley', COL.galley);
  // Floor, curtain strip to the front galley, signs.
  vbox(F, COL.carpet, -2.45, -19.0, 2.45, 17.4, FLOOR - 0.06, FLOOR - 0.01);
  vbox(F, 0x7a6a5a, -0.45, -19.0, 0.45, 17.4, FLOOR - 0.01, FLOOR + 0.005);
  vbox(S, COL.curtain, -2.45, 13.15, -0.7, 13.25, FLOOR, 2.2);
  const signs = new THREE.Group();
  const addSign = (text, lx, y, lz, w, h, yaw, opts) => { const m = signMesh(text, w, h, opts); m.position.set(W(lx), y, lz); m.rotation.set(-Math.PI / 2 + 0.6, yaw, 0, 'YXZ'); signs.add(m); };
  addSign('FRÄMRE BYSSAN', -1.6, 1.3, 15.2, 1.5, 0.35, 0, { bg: '#1f4f55', fg: '#fff8e6', scale: 0.55 });
  addSign('BAKRE BYSSAN', 0, 1.3, -17.8, 1.6, 0.35, 0, { bg: '#1f4f55', fg: '#fff8e6', scale: 0.55 });
  addSign('TOALETT', 1.7, 2.5, -15.6, 1.0, 0.3, 0, { bg: '#fff8e6', fg: '#1d1426', scale: 0.55 });
  addSign('TOALETT', -1.7, 2.5, -15.6, 1.0, 0.3, 0, { bg: '#fff8e6', fg: '#1d1426', scale: 0.55 });
  addSign('BESÄTTNING', 0, 2.3, 17.35, 1.4, 0.3, 0, { bg: '#fff8e6', fg: '#1d1426', scale: 0.55 });
  scene.add(signs);
  // Ceiling and hat racks: down-facing planes only, invisible from the camera above.
  const downMat = new THREE.MeshLambertMaterial({ color: COL.rack, side: THREE.FrontSide });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 36.4).rotateX(Math.PI / 2), downMat);
  ceil.position.set(CX, 2.6, -0.8);
  scene.add(ceil);
  for (const s of [-1, 1]) {
    const rack = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 33).rotateX(Math.PI / 2), downMat);
    rack.position.set(CX + s * 2.175, 2.1, -1.5);
    scene.add(rack);
  }
  const doorMesh = toonMesh(new GeoBuilder().boxB(COL.wall, W(2.95), FLOOR, 14.7, 1.0, WALL_H - FLOOR, 1.4).build(), { outline: 0.03 });
  scene.add(doorMesh);

  // ---- gate set collision (§5.2; dead unless phase gate) --------------------------------------
  const gateBlocks = [];
  const gb = (minX, minZ, maxX, maxZ, top, kind, color) => {
    gateBlocks.push(solid(minX, minZ, maxX, maxZ, top, kind));
    vbox(GS, color, minX, minZ, maxX, maxZ, FLOOR, Math.min(top, WALL_H));
  };
  gb(3.45, 12.7, 14.0, 13.7, 99, 'gatewall', COL.cream);
  gb(3.45, 15.7, 14.0, 16.7, 99, 'gatewall', COL.cream);
  gb(13.0, 0, 14.0, 13.7, 99, 'gatewall', COL.cream);
  gb(13.0, 15.7, 14.0, 30.0, 99, 'gatewall', COL.cream);
  gb(38.0, 0, 39.0, 30.0, 99, 'gatewall', COL.cream);
  gb(13.0, -1.0, 39.0, 0, 99, 'gatewall', COL.cream);
  gb(13.0, 30.0, 39.0, 31.0, 99, 'gatewall', COL.cream);
  gb(31.0, 0, 35.0, 3.9, 1.1, 'counter', COL.counter);
  gb(31.0, 6.1, 35.0, 10.0, 1.1, 'counter', COL.counter);
  gb(35.0, 10.0, 38.0, 11.0, 99, 'gatewall', COL.cream);
  for (const z of [3.85, 6.15]) {
    gateBlocks.push(circle(W(33.0), z, 0.15, 2.4, 'gatewall'));
    GS.cyl(0x8a8f99, W(33.0), FLOOR + 1.2, z, 0.15, 2.4, 8);
  }
  GS.boxB(0x8a8f99, W(33.0), FLOOR + 2.3, 5.0, 0.3, 0.2, 2.6);
  gb(29.5, 22.0, 30.5, 24.4, 99, 'gatewall', COL.cream);
  gb(29.5, 26.0, 30.5, 30.0, 99, 'gatewall', COL.cream);
  gb(30.0, 21.5, 38.0, 22.5, 99, 'gatewall', COL.cream);
  gb(29.5, 14.0, 30.5, 21.5, 99, 'gatewall', COL.cream);
  gb(30.0, 13.5, 38.0, 14.5, 99, 'gatewall', COL.cream);
  gb(16.0, 18.5, 17.2, 22.5, 1.1, 'counter', COL.counter);
  for (const z0 of [6.6, 12.6, 18.6]) gb(19.0, z0, 27.0, z0 + 0.8, 0.95, 'bench', COL.seat);
  vbox(GF, COL.lounge, 13.0, -1.0, 39.0, 31.0, FLOOR - 0.06, FLOOR - 0.01);
  vbox(GF, 0x8a7a6a, 3.45, 12.7, 14.0, 16.7, FLOOR - 0.06, FLOOR - 0.01);
  vbox(GF, 0xd8d0c0, 30.5, 22.5, 38.0, 30.0, FLOOR - 0.005, FLOOR);   // men's room tiles
  const gateGroup = new THREE.Group();
  gateGroup.add(toonMesh(GS.build(), { outline: 0.035 }));
  { const m = new THREE.Mesh(GF.build(), new THREE.MeshToonMaterial({ vertexColors: true })); m.receiveShadow = true; gateGroup.add(m); }
  const gsign = (text, lx, y, lz, w, h, yaw, opts) => { const m = signMesh(text, w, h, { double: true, ...opts }); m.position.set(W(lx), y, lz); m.rotation.y = yaw; gateGroup.add(m); };
  gsign('ARLANDA UTRIKES', 26, 3.4, 30.6, 9, 1.4, Math.PI, { bg: '#d8743a', fg: '#fff8e6', scale: 0.6 });
  gsign('SÄKERHETSKONTROLL', 33, 3.0, 5.0, 4.2, 0.7, -Math.PI / 2, { bg: '#fff8e6', fg: '#1d1426', scale: 0.55 });
  gsign('GATE 8 · LAS PALMAS 09.40', 16.6, 2.6, 20.5, 5, 0.8, Math.PI / 2, { bg: '#1d1426', fg: '#ffd23f', scale: 0.5 });
  gsign('HERRAR', 30.0, 2.9, 25.2, 1.8, 0.5, -Math.PI / 2, { bg: '#fff8e6', fg: '#1d1426', scale: 0.6 });
  gsign('DAMER', 30.0, 2.9, 18.4, 1.8, 0.5, -Math.PI / 2, { bg: '#fff8e6', fg: '#1d1426', scale: 0.6 });
  scene.add(gateGroup);

  const cabinMesh = toonMesh(S.build(), { outline: 0.03 });
  scene.add(cabinMesh);
  { const m = new THREE.Mesh(F.build(), new THREE.MeshToonMaterial({ vertexColors: true })); m.receiveShadow = true; scene.add(m); }

  // ---- landmarks ---------------------------------------------------------------------------
  for (const [name, [lx, lz, yaw, y]] of Object.entries(LANDMARKS)) {
    landmarks[name] = { x: W(lx), z: lz, yaw };
    if (y !== undefined) landmarks[name].y = y;
  }

  // ---- seats and passenger busts (§5.2, §5.4) ------------------------------------------------
  const seats = {};
  const rnd = mulberry32(1979);
  const bustG = new GeoBuilder();
  for (const row of ROWS) {
    const z = rowZ(row);
    for (const L of 'ABCDEF') {
      const id = `${row}${L}`, x = SEAT_X[L];
      const seat = { id, row, letter: L, x: W(x), z: z - 0.22, y: 0.55, yaw: 0, aisle: { x: W(x > 0 ? 0.25 : -0.25), z: z - 0.1 }, taken: null };
      seats[id] = seat;
      const reserved = CAST_SEATS[id] || id === '14C' || (DODGE_ROWS.includes(row) && (L === 'C' || L === 'D'));
      if (!reserved && rnd() < 0.7) {
        seat.taken = 'bust';
        const geo = buildBustGeo(randomPed(rnd));
        geo.translate(W(x), 0.55, z - 0.3);
        bustG.parts.push(geo);
      }
    }
  }
  const bustMesh = toonMesh(bustG.build(), { outline: 0.025 });
  scene.add(bustMesh);

  // ---- outside -----------------------------------------------------------------------------
  const scenery = buildFlightScenery(scene);

  // ---- the trolley (§5.8) -----------------------------------------------------------------
  registerCarType('trolley', { name: 'Serveringsvagn', len: 0.85, wid: 0.45, bodyH: 0.95, cabinH: 0,
    wheelR: 0.06, maxSpeed: 1.6, accel: 3, grip: 16, steer: 0.35, mass: 80, hp: 999,
    color: 0xc8ccd2, tall: true, noWheels: true, noSpeedo: true, build: buildTrolley });
  const park = landmarks.trolleyPark;
  const trolley = new Car('trolley', { x: park.x, z: park.z, yaw: Math.PI });
  trolley.place(park.x, park.z, Math.PI);
  trolley.locked = true;
  trolley.noEnter = true;
  trolley.invulnerable = true;
  game.addCar(trolley);
  const pusher = new Character(CHARS.vardinna2);
  pusher.key = 'vardinna2';
  pusher.anim.push = true;
  scene.add(pusher.root);

  const blockers = [];
  const listeners = { phase: [], jolt: [] };
  const fear = (n) => { if (n > 0) game.shame?.add(n, { force: true }); };
  const relieve = (n) => { if (n > 0) game.shame?.relieve(n); };

  const cabin = {
    bounds: { x0: W(-3.45), z0: -20, x1: W(39), z1: 31 },
    phase: 'gate', phaseT: 0, hold: false, seatbelt: false,
    trolley, trolleyStopped: true, pusher,
    stats: { bowled: 0, falls: 0, jolts: 0 },
    seats, scenery, doorBlock, gateBlocks, cabinBlocks,
    gateActive: true,
    _t: { mode: 'auto', wait: 0, stopAt: null, pauseT: 0, bowlCd: 0, running: false },
    _turb: null, _idleTurbT: 75, _oleBarkT: 10, _row13: false, _prevPz: null, _snowT: 0, _fired: {},

    inside(x, z) {
      const lx = x - CX;
      if (lx >= -2.45 && lx <= 2.45 && z >= -19 && z <= 17.4) return true;
      if (this.phase === 'gate') {
        if (lx >= 2.45 && lx <= 14 && z >= 13.7 && z <= 15.7) return true;   // door + jet bridge
        if (lx >= 14 && lx <= 38 && z >= 0 && z <= 30) return true;          // lounge
      }
      return false;
    },
    inCabin(x, z) { const lx = x - CX; return lx >= -2.45 && lx <= 2.45 && z >= -19 && z <= 17.4; },

    setGateActive(on) {
      this.gateActive = !!on;
      gateGroup.visible = !!on;
      for (const b of gateBlocks) b.dead = !on;
      doorBlock.dead = !!on;
      doorMesh.visible = !on;
      scenery.setGateVisible(on);
    },

    // ---- phases (§5.6) ----
    setPhase(name, { instant = false, hold = false } = {}) {
      if (!PHASES.includes(name)) { console.warn('cabin.setPhase: unknown phase', name); return; }
      this.phase = name;
      this.hold = !!hold;
      this.phaseT = instant ? (PHASE_LEN[name] ?? 0) : 0;
      this._fired = {};
      this.setGateActive(name === 'gate');
      if (name === 'gate') this.setSeatbelt(false, { chime: false });
      this.applyPalette();
      scenery.setPhaseVisual(name, this.phaseT);
      scenery.scenery.rotation.x = name === 'takeoff' && instant ? -0.12 : name === 'approach' ? 0.04 : 0;
      if (game.level === 'flight') audio.drone(...(DRONE[name] || [0, 0]));
      if (name === 'takeoff' && !instant) { this.setSeatbelt(true, { chime: false }); }
      for (const fn of listeners.phase.slice()) fn(name);
    },
    applyPalette() { if (game.level === 'flight') setSkyPalette(FLIGHT_PALETTES[this.phase]); },
    onPhase(fn) { listeners.phase.push(fn); return () => { const i = listeners.phase.indexOf(fn); if (i >= 0) listeners.phase.splice(i, 1); }; },
    onJolt(fn) { listeners.jolt.push(fn); return () => { const i = listeners.jolt.indexOf(fn); if (i >= 0) listeners.jolt.splice(i, 1); }; },

    setSeatbelt(on, { chime = true } = {}) {
      if (on && !this.seatbelt && chime) audio.chime();
      this.seatbelt = !!on;
    },

    // ---- turbulence (§5.7) ----
    // True from the warning (chime, belt sign, banner) until the shaking ends: the window in which
    // main.js shows the `Håll i dig!` prompt. Part of the §14.7 contract.
    get turbulent() {
      const T = this._turb;
      return !!T && T.warned && T.t - T.delay - T.warn <= T.secs;
    },
    turbulence(strength, secs, { warn = 1.5, delay = 0 } = {}) {
      this._turb = { strength, secs, warn, delay, t: 0, started: false, warned: false, joltT: 0.8, shakeT: 0, rattleT: 0, unheld: 0, beltBefore: this.seatbelt, endT: null };
    },

    // ---- seats ----
    seatCharacter(ch, seatId) {
      const seat = seats[seatId];
      if (!seat) { console.warn('cabin.seatCharacter: unknown seat', seatId); return false; }
      const key = ch.key || 'npc';
      if (seat.taken && seat.taken !== key) return false;
      if (ch.car) game.unseat(ch);
      if (ch.seatId && ch.seatId !== seatId) this.unseatCharacter(ch);
      seat.taken = key;
      ch.seatId = seatId;
      ch.busy = true;
      ch.seatAt({ x: seat.x, y: seat.y, z: seat.z, yaw: seat.yaw });
      return true;
    },
    unseatCharacter(ch, spot) {
      const seat = seats[ch.seatId];
      if (!seat) { ch.seatId = null; return; }
      if (seat.taken === (ch.key || 'npc')) seat.taken = null;
      ch.seatId = null;
      const x = spot?.x ?? seat.aisle.x, z = spot?.z ?? seat.aisle.z;
      ch.standAt(x, z, spot?.yaw ?? (seat.x > CX ? -Math.PI / 2 : Math.PI / 2));
    },
    unseatAll() {
      for (const seat of Object.values(seats)) {
        if (!seat.taken || seat.taken === 'bust') continue;
        const ch = game.npc(seat.taken);
        if (ch && ch.seatId === seat.id) this.unseatCharacter(ch);
        else seat.taken = null;
      }
    },
    seatOf(ch) { return ch?.seatId ?? null; },
    // The best free seat for the standing player (§5.10), or null.
    bestSeat(g) {
      const p = g.player;
      if (p.state !== 'normal' || g.playerCar || !this.inCabin(p.x, p.z)) return null;
      const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
      const want = g.missions?.stage?.seat;
      const wantId = typeof want === 'string' ? want : want?.id;
      let best = null, bs = -Infinity;
      for (const seat of Object.values(seats)) {
        if (Math.abs(seat.z - p.z) > 1 || Math.abs(seat.x - p.x) > 2.5) continue;
        if (seat.taken) continue;
        const d = Math.hypot(seat.x - p.x, seat.z - p.z);
        if (d > 0.8 && !(seat.id === wantId && d < 1.6)) continue;
        const dot = d > 0.01 ? (fx * (seat.x - p.x) + fz * (seat.z - p.z)) / d : 1;
        const score = dot - d * 0.5 + (seat.id === wantId ? 10 : 0);
        if (score > bs) { bs = score; best = seat; }
      }
      return best;
    },

    // ---- trolley ----
    startTrolley() { this._t.mode = 'run'; this.trolleyStopped = false; },
    stopTrolley() { this._t.mode = 'stop'; this.trolleyStopped = true; },
    trolleyEnd(g) {
      const p = g.player;
      const a = { x: trolley.x, z: trolley.z + 0.85 }, b = { x: trolley.x, z: trolley.z - 0.85 };
      return dist(a.x, a.z, p.x, p.z) < dist(b.x, b.z, p.x, p.z) ? a : b;
    },

    // ---- luggage stowers (§5.12) ----
    setAisleBlockers(on) {
      if (on) {
        if (!blockers.length) {
          const r = mulberry32(813);
          for (let k = 0; k < BLOCKER_ROWS.length; k++) {
            const ch = new Character({ ...randomPed(r), kind: 'adult', scale: 1 });
            ch.key = `blocker${k}`;
            ch.anim.cupUp = true;
            blockers.push(ch);
          }
        }
        blockers.forEach((ch, k) => {
          const z = rowZ(BLOCKER_ROWS[k]) + 0.25;
          ch.standAt(CX, z, Math.PI / 2);
          ch.anim.cupUp = true;
          ch.moved = false;
          ch.bumpCd = 0;
          if (!ch.root.parent) scene.add(ch.root);
          ch.active = true;
        });
      } else {
        for (const ch of blockers) { ch.active = false; scene.remove(ch.root); }
      }
    },
    blockers,

    placeCoins() {
      for (let z = 11; z >= -14; z -= 2.5) placeCoin(W(0), 0.9, z);
      placeCoin(W(-0.2), 0.9, 14.6);
      placeCoin(W(0), 0.9, -18.2);
    },

    mapSource(phase) {
      const gate = phase === 'gate';
      const key = gate ? '_mapGate' : '_mapCabin';
      if (!this[key]) {
        const bounds = gate ? { x0: W(-3.5), z0: -20, x1: W(39), z1: 31 } : { x0: W(-3.5), z0: -20.5, x1: W(3.5), z1: 18.5 };
        this[key] = hud.buildMapFromBlocks(bounds, { scale: 12, bg: '#2a3442', zoom: 9, north: 'FRAM',
          kinds: { seatback: '#d2601f', cushion: '#e8925a', galley: '#9a9a92', toilet: '#6a7a8a', bound: '#e6dcc4', door: '#e6dcc4',
            gatewall: '#c8b89a', counter: '#9a9a92', bench: '#d2601f', bridge: '#c8b89a' } });
      }
      return this[key];
    },

    // ---- per frame (dt already scaled by timeScale) ----
    tick(dt, t, g) {
      this.stepPhase(dt, g);
      this.stepTurbulence(dt, g);
      this.stepPusher(dt);
      this.stepFear(dt, g);
      this.stepBlockers(dt, g);
      this.stepAmbient(dt, g);
      scenery.tick(dt);
    },

    stepPhase(dt, g) {
      const len = PHASE_LEN[this.phase];
      const t0 = this.phaseT;
      if (len !== undefined) this.phaseT = Math.min(len, this.phaseT + dt);
      else this.phaseT += dt;
      const t1 = this.phaseT;
      const at = (k, tt) => { if (t0 <= tt && t1 >= tt && !this._fired[k] && (tt > 0 || t0 === 0)) { this._fired[k] = true; return true; } return false; };
      const ph = this.phase;
      if (ph === 'takeoff') {
        if (at('drone', 0)) audio.drone(0.9, 1);
        if (t1 > 8) scenery.scenery.rotation.x = -0.12 * Math.min(1, (t1 - 8) / 1.5);
      } else if (ph === 'climb') {
        for (const tt of [1.5, 4, 6.5]) if (at('bump' + tt, tt)) { g.cam.shake = Math.max(g.cam.shake, 0.3); fear(FEAR.climbBump); g.interruptMantra?.(); audio.rattle(); }
      } else if (ph === 'landing') {
        if (at('touch', 5)) { audio.thud(); g.cam.shake = Math.max(g.cam.shake, 0.6); fear(FEAR.touchdown); }
        if (at('rev', 5.5)) { audio.drone(1, 1); fear(FEAR.reverse); this._revT = 3; }
      } else if (ph === 'cruise' && g.missions?.state === 'idle' && !this._turb) {
        this._idleTurbT -= dt;
        if (this._idleTurbT <= 0) { this._idleTurbT = 60 + Math.random() * 30; this.turbulence(0.3 + Math.random() * 0.3, 4 + Math.random() * 2); }
      }
      if (this._revT > 0) { this._revT -= dt; if (this._revT <= 0) audio.drone(...DRONE.landed); }
      if (len !== undefined && t1 >= len && !this.hold && NEXT[ph]) this.setPhase(NEXT[ph]);
    },

    stepTurbulence(dt, g) {
      const T = this._turb;
      if (!T) return;
      T.t += dt;
      if (T.t < T.delay) return;
      const tt = T.t - T.delay;
      if (!T.warned) {
        T.warned = true;
        audio.chime();
        this.setSeatbelt(true, { chime: false });
        hud.showBanner(S.turbulence, '', 'count', 1200);
      }
      const run = tt - T.warn;
      if (run < 0) return;
      if (run <= T.secs) {
        T.shakeT -= dt;
        if (T.shakeT <= 0) { T.shakeT = 0.3; g.cam.shake = Math.max(g.cam.shake, 0.5 * T.strength); }
        T.rattleT -= dt;
        if (T.rattleT <= 0) { T.rattleT = 0.4; audio.rattle(); }
        scenery.scenery.rotation.z = Math.sin(tt * 9) * 0.03 * T.strength;
        trolley.x = CX + Math.sin(tt * 13) * 0.05;
        T.joltT -= dt;
        if (T.joltT <= 0) { T.joltT = 0.8; this.jolt(g, T); }
      } else {
        scenery.scenery.rotation.z = 0;
        trolley.x = CX;
        if (run > T.secs + 3) {
          if (!T.beltBefore) this.setSeatbelt(false, { chime: false });
          this._turb = null;
        }
      }
    },

    jolt(g, T) {
      this.stats.jolts++;
      for (const fn of listeners.jolt.slice()) fn({ strength: T.strength });
      const p = g.player;
      if (p.state === 'hidden') return;
      if (p.state === 'seated' && p.seatId) { fear(g.mantraOn ? FEAR.joltSeatedMantra : FEAR.joltSeated); g.interruptMantra?.(); return; }
      if (p.state !== 'normal' || g.playerCar) return;
      const side = Math.random() < 0.5 ? -1 : 1;
      if (g.holding) { fear(FEAR.joltHeld); p.vx += side * 0.4; T.unheld = 0; return; }
      T.unheld++;
      if (T.unheld >= 2) {
        T.unheld = 0;
        p.fling(side * 2, 3, 0);
        fear(FEAR.joltFall);
        this.stats.falls++;
        g.bumpedT = 0.4;
      } else {
        fear(FEAR.joltUnheld);
        p.vx += side * 2.5;
        p.x += side * 0.15;
      }
    },

    // Trolley mini-AI (called from the fixed step through trolley.ai; kinematic, unscaled dt).
    stepTrolley(h, g) {
      const T = this._t;
      trolley.vx = trolley.vz = 0;
      trolley.ctrl.park = true;
      const auto = T.mode === 'auto';
      const shouldRun = T.mode === 'run' || (auto && this.phase === 'cruise' && g.level === 'flight' && (g.missions?.index ?? 0) >= 2);
      T.bowlCd -= h;
      if (!shouldRun) {
        T.running = false;
        this.trolleyStopped = true;
        if (auto && Math.abs(trolley.z - park.z) > 0.05) { trolley.place(park.x, park.z, Math.PI); T.stopAt = null; }
        return;
      }
      if (T.wait > 0) { T.wait -= h; this.trolleyStopped = true; T.running = false; return; }
      if (T.pauseT > 0) { T.pauseT -= h; this.trolleyStopped = true; T.running = false; return; }
      if (T.stopAt === null) T.stopAt = rowZ(3);
      // Wait for anyone (not the player) standing in the aisle just ahead.
      const front = trolley.z - 0.425;
      const people = [...Object.values(g.npcs), ...blockers.filter((b) => b.active)];
      for (const ch of people) {
        if (ch.state !== 'normal') continue;
        if (Math.abs(ch.x - CX) < 0.75 && front - ch.z > 0 && front - ch.z < 1.2) { this.trolleyStopped = true; T.running = false; return; }
      }
      // Serve every three rows.
      if (trolley.z <= T.stopAt) {
        T.pauseT = 3;
        const k = ROWS.findIndex((r) => rowZ(r) <= T.stopAt + 0.01);
        T.stopAt = k >= 0 && ROWS[k + 3] ? rowZ(ROWS[k + 3]) : -99;
        if (Math.random() < 0.6) g.say(pusher, 'Juice, whisky?', 1.6);   // [F*]
        return;
      }
      this.trolleyStopped = false;
      T.running = true;
      trolley.z -= 1.1 * h;
      trolley.updateObb();
      if (trolley.z < -15.5) { trolley.place(park.x, park.z, Math.PI); T.wait = 6; T.stopAt = rowZ(3); return; }
      // Bowling (invented): a moving trolley knocks over a standing player right in front of it.
      const p = g.player;
      if (T.bowlCd <= 0 && p.state === 'normal' && !g.playerCar && Math.abs(p.x - CX) < 0.75) {
        const dz = trolley.z - p.z;
        if (dz > 0 && dz < 0.95) {
          p.fling(0, 3.0, -2.6);
          fear(FEAR.bowled);
          g.say(pusher, 'Akta tårna!', 1.6);   // [N]
          this.stats.bowled++;
          g.bumpedT = 0.4;
          T.pauseT = 1.5;
          T.bowlCd = 2;
        }
      }
    },

    stepPusher(dt) {
      pusher.standAt(trolley.x, trolley.z + 0.9, Math.PI);
      pusher.anim.push = true;
      pusher.sync(dt);
    },

    stepFear(dt, g) {
      if (game.shame?.cfg?.mode !== 'panic') return;
      const p = g.player;
      const seated = p.state === 'seated' && !!p.seatId;
      const ph = this.phase;
      if (!seated && p.state !== 'hidden' && this.seatbelt) fear(FEAR.standSeatbelt * dt);
      if (!seated && p.state === 'normal' && p.anim.sprint && p.speed > 1) fear(FEAR.sprint * dt);
      if (ph === 'takeoff' && this.phaseT < FEAR.takeoffRollSecs && this.phaseT > 0) fear(FEAR.takeoffRoll * dt);
      if (ph === 'approach') fear(FEAR.approach * dt);
      if (seated && ph !== 'takeoff' && ph !== 'climb' && ph !== 'approach') relieve((this.seatbelt ? FEAR.seatedReliefBelt : FEAR.seatedRelief) * dt);
      // Ole's statistics.
      const ole = g.npcs?.ole;
      const running = g.missions?.state === 'running';
      if (ole && ole.state !== 'hidden' && (!running || g.missions.stage?.oleBarks) && dist(ole.x, ole.z, p.x, p.z) < FEAR.oleBarkR) {
        this._oleBarkT -= dt;
        if (this._oleBarkT <= 0 && !g.inDialog) {
          this._oleBarkT = FEAR.oleBarkEvery;
          g.say(ole, pick(OLE_STATS), 3);
          fear(FEAR.oleBark);
        }
      }
    },

    stepBlockers(dt, g) {
      const p = g.player;
      for (const ch of blockers) {
        if (!ch.active) continue;
        ch.sync(dt);
        ch.bumpCd -= dt;
        if (p.state !== 'normal' || g.playerCar) continue;
        const dx = p.x - ch.x, dz = p.z - ch.z, d = Math.hypot(dx, dz), R = p.r + ch.r;
        if (d < R && d > 0.001 && Math.abs(p.y - ch.y) < 1.2) {
          p.x += (dx / d) * (R - d); p.z += (dz / d) * (R - d);
          if (ch.bumpCd <= 0) { ch.bumpCd = 2; fear(FEAR.blockerBump); g.say(ch, 'Vänta lite, jag ska bara…', 1.8); }   // [N]
        }
      }
    },

    stepAmbient(dt, g) {
      const p = g.player;
      // Row 13 does not exist: toast the first time he crosses lz -1.4 going aft.
      if (this._prevPz !== null && !this._row13 && this.inCabin(p.x, p.z) && this._prevPz > -1.4 && p.z <= -1.4) {
        this._row13 = true;
        hud.toast(S.row13);
      }
      this._prevPz = p.z;
      // Snow at the gate.
      if (this.phase === 'gate' || (this.phase === 'takeoff' && this.phaseT < 6)) {
        this._snowT -= dt;
        while (this._snowT <= 0) {
          this._snowT += 0.05;
          const c = g.cam.cam.position;
          fx.snow(c.x + (Math.random() - 0.5) * 30, c.y + 6, c.z + (Math.random() - 0.5) * 30);
        }
      }
      // Seated cast idle bubbles.
      if (g.missions?.state !== 'running' && !g.inDialog) {
        for (const [key, n] of Object.entries(g.npcs || {})) {
          if (n.state !== 'seated' || !n.seatId || dist(n.x, n.z, p.x, p.z) > 6) continue;
          n.cabinChatT = (n.cabinChatT ?? 4 + Math.random() * 8) - dt;
          if (n.cabinChatT <= 0) { n.cabinChatT = 12 + Math.random() * 8; if (CHATTER_FLIGHT[key]) g.say(n, pick(CHATTER_FLIGHT[key]), 2.6); }
        }
      }
    },
  };

  trolley.ai = { update: (h, g) => cabin.stepTrolley(h, g) };

  // ---- interactables (§5.10) ----------------------------------------------------------------
  const seatIt = {
    id: 'seat', x: 0, z: 0, y: 0.55, r: 1.6, prompt: S.promptSit, priority: 0,
    _seat: null,
    pos(g) { const s = cabin.bestSeat(g); this._seat = s; if (s) this.id = `seat:${s.id}`; return s ? { x: s.x, z: s.z, y: 0.55 } : { x: 1e9, z: 1e9 }; },
    enabled() { return !!this._seat; },
    use(g) { if (this._seat) g.sitPlayer(this._seat.id); },
  };
  game.addInteractable(seatIt);
  BLOCKER_ROWS.forEach((row, k) => {
    game.addInteractable({
      id: `blocker:${k}`, r: 1.3, prompt: S.promptExcuse, priority: 1,
      pos() { const ch = blockers[k]; return ch ? { x: ch.x, z: ch.z } : { x: 1e9, z: 1e9 }; },
      enabled() { const ch = blockers[k]; return !!ch && ch.active && !ch.moved; },
      use(g) {
        const ch = blockers[k];
        const seat = seats[`${row}${Math.random() < 0.5 ? 'C' : 'D'}`];
        ch.standAt(seat.x, seat.z, Math.PI / 2);
        ch.moved = true;
        g.say(ch, 'Ursäkta!', 1.4);   // [N]
      },
    });
  });
  const lockIn = (g) => {
    const p = g.player;
    p.state = 'hidden';
    p.vx = p.vz = 0;
    relieve(FEAR.toilet);
    audio.flush();
    g.wait(4).then(() => { if (p.state === 'hidden') { p.state = 'normal'; p.root.visible = true; } });
  };
  for (const [id, lm, gateOnly] of [['toilet:L', 'toiletBackL', false], ['toilet:R', 'toiletBackR', false], ['toilet:gate', 'herrtoa', true]]) {
    const l = landmarks[lm];
    game.addInteractable({ id, x: l.x, z: l.z, r: gateOnly ? 1.5 : 1.0, prompt: S.promptLock,
      enabled: () => (gateOnly ? cabin.phase === 'gate' : cabin.phase !== 'gate'), use: lockIn });
  }

  cabin.setPhase('gate', { instant: true });
  return cabin;
}
