// Level 1 "Flygresan" (DESIGN §5; WP-A1): the Arlanda gate set and the cut-away DC-8 cabin, built
// once at x = 3000 (local (lx, lz) = world (x - 3000, z)). The nose points +z; seats A B C are on
// the port side (+x), D E F on starboard (-x). Floor = the engine's infinite CURB plane.
//
// Contents: the §5.2 collision table, the seat map (§5.4), landmarks (§5.5), the phase machine
// (§5.6; the outside itself is WP-A2's flightScenery.js), turbulence and HÅLL I DIG (§5.7), the
// trolley AI with its pusher and the bowling (§5.8), the cabin's FLYGRÄDSLA sources (§5.9),
// interactables (§5.10), the minimap plan (§5.11) and the ambient cabin life (§5.12): seated cast
// bubbles, "Ra-tara-tara", Angerud's complaint, aisle walkers and the luggage stowers.
// Visuals: one merged vertex-coloured toon mesh for the cabin, one for the gate set (cut-away
// walls 2.6 m, no roof, 1979 brochure palette §13.2); racks and ceiling are down-facing planes.
// Invented (DESIGN §1.6): turbulence, holding on, the trolley and its bowling, the stowers, the
// on-board toilet hideout and the galley self-serve juice.

import { THREE, GeoBuilder, toonMesh, signMesh, setSkyPalette, MAT } from '../gfx.js';
import { box, circle } from './collision.js';
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
import { mulberry32, pick, dist, dampAngle, angleDiff, clamp } from '../util.js';

export const CABIN_X = 3000;
const CX = CABIN_X;

// §5.3. clampPitch (A1 addition): while the eye z is clamped at the cabin ends, the pitch is
// steepened up to this angle; beyond it the camera looks further ahead instead (camera.js).
export const CAM_CABIN = { pivotH: 1.5, dist: 6.5, pitchMin: 0.72, pitchMax: 1.1, pitch0: 0.9,
  noPull: true, fov: 58, cineSide: 2.0, cineUp: 3.6, clampZ: [-19.2, 17.2], clampPitch: 1.22 };

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
// A phase change that is not `instant` blends into the new palette over PAL_BLEND seconds (§5.6):
// 1.5 s into climb (under the whiteout puffs), else 2 s (the cruise puffs fade in over 2 s).
const PAL_BLEND = { climb: 1.5 }, PAL_BLEND_DEFAULT = 2;
const PAL_COLORS = ['top', 'horizon', 'sun', 'hemiSky', 'hemiGround', 'window'], PAL_NUMS = ['fogNear', 'fogFar', 'sunI', 'hemiI'];
const _palA = new THREE.Color(), _palB = new THREE.Color();

// FLYGRÄDSLA sources and reliefs owned by the cabin (§5.9). Rates are per (scaled) second.
export const FEAR = {
  standSeatbelt: 1.5, sprint: 1, takeoffRoll: 4, takeoffRollSecs: 10, climbBump: 8, approach: 1,
  touchdown: 10, reverse: 5, joltUnheld: 6, joltFall: 12, joltHeld: 1, joltSeated: 4, joltSeatedMantra: 1,
  bowled: 12, oleBark: 8, oleBarkEvery: 25, oleBarkR: 4, seatedRelief: 5, seatedReliefBelt: 2,
  toilet: 50, blockerBump: 3, juice: 30, juiceCooldown: 30,
};

export const PHASES = ['gate', 'takeoff', 'climb', 'cruise', 'approach', 'landing', 'landed'];
export const PHASE_LEN = { takeoff: 12, climb: 8, approach: 14, landing: 6 };
const NEXT = { takeoff: 'climb', climb: 'cruise', approach: 'landing', landing: 'landed' };
// Cabin drone per phase: [level, bright] (§5.6). Turbulence raises the level by 30 % (§5.7).
const DRONE = { gate: [0.25, 0.2], takeoff: [0.9, 1], climb: [0.7, 0.6], cruise: [0.45, 0.3], approach: [0.7, 0.5], landing: [0.6, 0.5], landed: [0.2, 0.1] };
const TURB_DRONE = 1.3;

// Rows 1-12 and 14-24 (no row 13).
export const ROWS = [...Array(12).keys()].map((k) => k + 1).concat([...Array(11).keys()].map((k) => k + 14));
export const rowZ = (row) => 12.4 - 1.2 * (row <= 12 ? row - 1 : row - 2);
export const SEAT_X = { A: 2.0, B: 1.45, C: 0.9, D: -0.9, E: -1.45, F: -2.0 };
// The seat map (§5.4). Cast seats are never filled with busts; nor is 14C, nor C/D of the dodge rows.
export const CAST_SEATS = { '6C': 'angerud', '10A': 'herrStorch', '10B': 'fruStorch', '14A': 'ole', '14B': 'stig', '16D': 'jose', '16E': 'majsan', '16F': 'siv', '22C': 'berra', '22D': 'robban' };
export const DODGE_ROWS = [3, 8, 12, 15, 18, 20, 23];
const BLOCKER_ROWS = [3, 8, 12];
const SMOKING_FROM = 20;   // rows 20-24: the smokers' section (1980: allowed, at the rear)

// §5.5 landmarks: [lx, lz, yaw, y?]. The *Cam ones are cut cameras (`{ at, dist: 0, height }`: the
// eye on the spot, looking along the yaw) for the mission-1/2/5 scenes the dollhouse cannot frame.
const LANDMARKS = {
  gateStart: [36.5, 5.0, -Math.PI / 2], gateQueue: [35.6, 6.6, Math.PI / 2], gateArch: [33.0, 5.0, -Math.PI / 2],
  queueCam: [36.1, 1.2, 0], statsCam: [24.0, 6.8, 0],
  gateOle: [23.0, 11.8, Math.PI], gateLounge: [22.0, 16.0, 0], gateDesk: [18.0, 20.5, -Math.PI / 2],
  herrtoaGang: [27.9, 12.2, 0], herrtoaDoor: [29.0, 25.2, Math.PI / 2], herrtoa: [33.5, 26.0, Math.PI / 2], damtoaDoor: [28.8, 18.4, Math.PI / 2],
  bridge: [8.0, 14.7, -Math.PI / 2], bridgeCam: [3.7, 14.7, Math.PI / 2],
  cabinDoor: [0.8, 14.7, Math.PI], galleyFront: [-0.2, 13.0, Math.PI], cockpitDoor: [0, 16.6, Math.PI],
  doorCam: [-1.2, 14.2, Math.PI / 2], galleyCam: [0, 8.6, 0],
  cabinRow1: [0, 12.6, Math.PI], cabinRow6: [0, 6.3, 0], cabinRow10: [0, 1.5, 0], cabinRow14: [0.25, -2.1, Math.PI / 2], cabinRow16: [-0.25, -4.5, -Math.PI / 2],
  cabinRow22: [0, -11.7, Math.PI / 2], row22Cam: [0, -9.2, Math.PI], cabinCentre: [0, 0, 0], toiletBackL: [0.6, -15.6, Math.PI / 2], toiletBackR: [-0.6, -15.6, -Math.PI / 2],
  galleyBack: [0, -17.6, 0], trolleyPark: [0, 16.2, Math.PI], call14: [1.45, -2.2, 0, 2.2],
};

// §13.2 palette (cabin + Arlanda 1976) plus a few shades.
const C = {
  seat: 0xd2601f, seatDk: 0xa84a16, cushion: 0xe07a3a, anti: 0xf2efe6, wall: 0xe6dcc4, wallLt: 0xf4eedf, wallDk: 0xcdc1a6,
  rack: 0xd8cdb4, frame: 0x8f8574, skin: 0xf4f4f0, cheat: 0x1b2f6b, curtain: 0x1f4f55, curtainDk: 0x163b40, tray: 0x9a9a92,
  steel: 0xb4b9c0, steelLt: 0xd4d7dc, steelDk: 0x6e737a, carpet: 0x5a4a3a, runner: 0x74583f, lino: 0x9d968a, red: 0xe0342a,
  arm: 0x5e4c40, porcelain: 0xf6f6f2, mirror: 0xbfe6ff, juice: 0xf7a21b, glassDk: 0x2a3a4a, ink: 0x1d1426, orange: 0xf07a1e,
  counter: 0xd8743a, wood: 0x9a6a3a, woodDk: 0x6a4a2a, lounge: 0x6a4a32, cream: 0xe8e0cc, brick: 0x8a5a3a, vinyl: 0xb8a68a,
  tile: 0xd8d0c0, tilePink: 0xe2c8bf, chrome: 0xc8ccd2, plant: 0x3f7a3a, plantLt: 0x5a9a48, pot: 0x8a5a3a, metal: 0x9aa0a8,
  rubber: 0x3a3a40, yellow: 0xf7c31b, beige: 0xd8cfb8, whisky: 0xb8741e,
};

// ---------------------------------------------------------------------------------------------
// The trolley model (§5.8): steel box with drawers and latches, a top tray with juice jug, glasses,
// cans and a whisky bottle, a push bar at the rear (-z local; the car's forward is +z), castors.

function buildTrolley(spec, color) {
  const g = new GeoBuilder();
  const L = spec.len, W = spec.wid, y0 = 0.08, H = 0.84;
  g.boxB(color, 0, y0, 0, W, H, L);
  for (const s of [-1, 1]) {
    g.box(C.steelLt, s * (W / 2 + 0.004), y0 + H / 2 + 0.02, 0, 0.008, H - 0.14, L - 0.1);
    for (let k = 0; k < 3; k++) g.box(C.steelDk, s * (W / 2 + 0.012), y0 + 0.2 + k * 0.25, 0.25, 0.012, 0.03, 0.16);
    g.box(C.orange, s * (W / 2 + 0.006), y0 + H - 0.05, 0, 0.01, 0.05, L - 0.04);   // Sol-Viking stripe
  }
  for (const s of [-1, 1]) g.box(C.steelLt, 0, y0 + H / 2, s * (L / 2 + 0.004), W - 0.08, H - 0.12, 0.008);
  g.boxB(C.tray, 0, y0 + H, 0, W + 0.05, 0.03, L + 0.05);
  for (const s of [-1, 1]) g.box(C.steelDk, s * (W / 2 + 0.02), y0 + H + 0.06, 0, 0.02, 0.06, L + 0.04);
  // On the tray: a juice jug, a stack of paper cups, glasses of juice, cans, the whisky.
  g.cyl(C.juice, -0.1, y0 + H + 0.14, 0.22, 0.06, 0.22, 10);
  g.cyl(C.skin, -0.1, y0 + H + 0.26, 0.22, 0.045, 0.03, 10);
  g.cyl(C.skin, 0.11, y0 + H + 0.12, 0.25, 0.035, 0.18, 8);
  for (let k = 0; k < 3; k++) g.cyl(C.juice, -0.11 + k * 0.11, y0 + H + 0.07, -0.02, 0.03, 0.09, 8);
  g.cyl(0xd8321e, -0.1, y0 + H + 0.08, -0.22, 0.035, 0.12, 8);
  g.cyl(C.yellow, 0.0, y0 + H + 0.08, -0.22, 0.035, 0.12, 8);
  g.cyl(C.whisky, 0.12, y0 + H + 0.11, -0.2, 0.04, 0.18, 8);
  g.cyl(C.ink, 0.12, y0 + H + 0.23, -0.2, 0.018, 0.06, 6);
  // Push bar with grips at the rear.
  for (const s of [-1, 1]) g.box(C.steelDk, s * (W / 2 - 0.04), y0 + H + 0.06, -L / 2 - 0.05, 0.03, 0.14, 0.03);
  g.box(C.rubber, 0, y0 + H + 0.13, -L / 2 - 0.06, W, 0.045, 0.045);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.box(C.steelDk, sx * (W / 2 - 0.06), 0.07, sz * (L / 2 - 0.09), 0.03, 0.04, 0.03);
    g.sphere(C.ink, sx * (W / 2 - 0.06), 0.04, sz * (L / 2 - 0.09), 0.08);
  }
  return { geo: g.build(), glass: null };
}

// A small atlas of row-number plates (one canvas, one material): rows 1-12, 14-24.
function rowAtlas() {
  const cols = 8, rows = 3, cw = 128, ch = 72;
  const cv = document.createElement('canvas');
  cv.width = cols * cw; cv.height = rows * ch;
  const x = cv.getContext('2d');
  const cells = {};
  ROWS.forEach((row, i) => {
    const c = i % cols, r = (i / cols) | 0;
    const px = c * cw, py = r * ch;
    x.fillStyle = '#1f4f55';
    x.fillRect(px, py, cw, ch);
    x.fillStyle = '#fff8e6';
    x.fillRect(px + 4, py + 4, cw - 8, 4);
    x.font = '50px "Luckiest Guy", Impact, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(String(row), px + cw / 2, py + ch / 2 + 6);
    cells[row] = { u0: c / cols, u1: (c + 1) / cols, v0: 1 - (r + 1) / rows, v1: 1 - r / rows };
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, cells };
}

export function buildCabin(scene, game) {
  const GC = new GeoBuilder();      // cabin, outlined (always visible)
  const GF = new GeoBuilder();      // cabin floors (no outline)
  const GG = new GeoBuilder();      // gate set, outlined
  const GGF = new GeoBuilder();     // gate floors (no outline)
  const GD = new GeoBuilder();      // the closed front door
  const GS = new GeoBuilder();      // small cabin details (no outline: ink would swamp them)
  const W = (lx) => CX + lx;
  const solid = (minX, minZ, maxX, maxZ, top, kind) => box(W(minX), minZ, W(maxX), maxZ, top, kind);
  // Visual box from a local rect: footprint [x0, x1] x [z0, z1], from y0 to y1.
  const vbox = (G, color, x0, z0, x1, z1, y0, y1) => G.boxB(color, W((x0 + x1) / 2), y0, (z0 + z1) / 2, Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0));
  // Visual box by local centre.
  const vb = (G, color, x, y, z, w, h, d, ry = 0, rx = 0, rz = 0) => G.box(color, W(x), y, z, w, h, d, ry, rx, rz);
  // Mirror helper: a rect given on the port side (a..b >= 0) for side s (+1 port, -1 starboard).
  const sx0 = (s, a, b) => Math.min(s * a, s * b), sx1 = (s, a, b) => Math.max(s * a, s * b);
  const vboxS = (G, color, s, a, b, z0, z1, y0, y1) => vbox(G, color, sx0(s, a, b), z0, sx1(s, a, b), z1, y0, y1);
  const WALL_H = 2.6, FLOOR = 0.15;
  const signs = new THREE.Group();
  scene.add(signs);
  // A sign facing `yaw` (0 = +z), leaning back by `tilt` (negative = face tilts up, readable from
  // the high cabin camera).
  const sign = (group, text, lx, y, lz, w, h, { yaw = 0, tilt = -0.5, ...opts } = {}) => {
    const m = signMesh(text, w, h, opts);
    m.position.set(W(lx), y, lz);
    m.rotation.set(tilt, yaw, 0, 'YXZ');
    group.add(m);
    return m;
  };
  const SIGN = { bg: '#1f4f55', fg: '#fff8e6', scale: 0.55 };
  const SIGN_W = { bg: '#fff8e6', fg: '#1d1426', scale: 0.55 };

  // ---- cabin collision (§5.2) ---------------------------------------------------------------
  const cabinBlocks = [];
  const cb = (minX, minZ, maxX, maxZ, top, kind) => { const b = solid(minX, minZ, maxX, maxZ, top, kind); cabinBlocks.push(b); return b; };
  cb(2.45, -19.0, 3.45, 14.0, 99, 'bound');
  cb(2.45, 15.4, 3.45, 17.4, 99, 'bound');
  const doorBlock = solid(2.45, 14.0, 3.45, 15.4, 99, 'door');
  cb(-3.45, -19.0, -2.45, 17.4, 99, 'bound');
  cb(-3.45, 17.4, 3.45, 18.4, 99, 'bound');
  cb(-3.45, -20.0, 3.45, -19.0, 99, 'bound');
  for (const row of ROWS) {
    const z = rowZ(row);
    for (const [x0, x1] of [[0.6, 2.45], [-2.45, -0.6]]) {
      cb(x0, z - 0.52, x1, z - 0.40, 1.25, 'seatback');
      cb(x0, z - 0.40, x1, z - 0.05, 0.55, 'cushion');
    }
  }
  cb(-2.45, 13.6, -0.7, 16.8, 1.0, 'galley');
  cb(0.7, 15.6, 2.45, 17.4, 2.0, 'galley');
  cb(1.0, -16.4, 2.45, -14.9, 99, 'toilet');
  cb(-2.45, -16.4, -1.0, -14.9, 99, 'toilet');
  cb(0.8, -19.0, 2.45, -16.6, 1.0, 'galley');
  cb(-2.45, -19.0, -0.8, -16.6, 1.0, 'galley');

  // ---- cabin visuals ---------------------------------------------------------------------------
  // Floors: carpet, a lighter aisle runner, lino in the galleys and at the door.
  vbox(GF, C.carpet, -2.45, -19.0, 2.45, 17.4, FLOOR - 0.06, FLOOR - 0.012);
  vbox(GF, C.runner, -0.5, -14.9, 0.5, 13.2, FLOOR - 0.012, FLOOR - 0.004);
  vbox(GF, C.lino, -2.45, 13.2, 2.45, 17.4, FLOOR - 0.012, FLOOR - 0.004);
  vbox(GF, C.lino, -2.45, -19.0, 2.45, -14.9, FLOOR - 0.012, FLOOR - 0.004);
  for (let z = 13.4; z < 17.3; z += 0.5) vbox(GF, 0x8c857a, -2.45, z, 2.45, z + 0.04, FLOOR - 0.004, FLOOR - 0.001);

  // Side walls as a section: cream inner skin, structure, white outer skin with the cheat line.
  const wallSeg = (G, s, z0, z1) => {
    vboxS(G, C.wall, s, 2.45, 2.6, z0, z1, FLOOR, WALL_H);
    vboxS(G, C.frame, s, 2.6, 3.3, z0, z1, FLOOR, WALL_H - 0.05);
    vboxS(G, C.skin, s, 3.3, 3.45, z0, z1, FLOOR, WALL_H);
    vboxS(G, C.wallDk, s, 2.44, 2.45, z0, z1, FLOOR, 0.5);              // kick panel
    vboxS(G, C.cheat, s, 3.45, 3.47, z0, z1, 1.0, 1.45);                // cheat line outside
    vboxS(G, C.wallLt, s, 2.42, 2.45, z0, z1, 2.05, 2.12);              // rack lip on the wall
  };
  wallSeg(GC, 1, -19.0, 14.0);
  wallSeg(GC, 1, 15.4, 17.4);
  wallSeg(GC, -1, -19.0, 17.4);
  // Door frame and the header over the open door (visual only, above head height).
  vbox(GC, C.wallDk, 2.40, 13.9, 2.62, 14.0, FLOOR, WALL_H);
  vbox(GC, C.wallDk, 2.40, 15.4, 2.62, 15.5, FLOOR, WALL_H);
  vbox(GC, C.wall, 2.45, 14.0, 3.45, 15.4, 2.3, WALL_H);
  vbox(GC, C.red, 2.43, 13.92, 2.45, 13.98, 0.9, 1.5);
  // The closed door (hidden in phase gate): wall section with a porthole and the lever.
  vbox(GD, C.wallLt, 2.45, 14.0, 2.62, 15.4, FLOOR, 2.3);
  vbox(GD, C.frame, 2.62, 14.0, 3.3, 15.4, FLOOR, 2.25);
  vbox(GD, C.skin, 3.3, 14.0, 3.45, 15.4, FLOOR, 2.3);
  vbox(GD, C.cheat, 3.45, 14.0, 3.47, 15.4, 1.0, 1.45);
  GD.cyl(C.glassDk, W(2.43), 1.45, 14.7, 0.16, 0.03, 12, 0, 0, Math.PI / 2);
  GD.cyl(C.wallDk, W(2.435), 1.45, 14.7, 0.21, 0.02, 12, 0, 0, Math.PI / 2);
  vb(GD, C.steelDk, 2.40, 1.0, 14.3, 0.06, 0.06, 0.5);
  vb(GD, C.red, 2.41, 1.0, 14.05, 0.05, 0.08, 0.08);
  // Cockpit wall with the crew door, rear wall.
  vbox(GC, C.wall, -2.45, 17.4, 2.45, 17.55, FLOOR, WALL_H);
  vbox(GC, C.frame, -3.45, 17.55, 3.45, 18.25, FLOOR, WALL_H - 0.05);
  vbox(GC, C.skin, -3.45, 18.25, 3.45, 18.4, FLOOR, WALL_H);
  vbox(GC, C.beige, -0.48, 17.36, 0.48, 17.4, FLOOR, 2.15);
  vbox(GC, C.wallDk, -0.52, 17.37, 0.52, 17.4, 2.15, 2.2);
  vb(GS, C.steelDk, 0.32, 1.05, 17.34, 0.1, 0.05, 0.05);
  GS.cyl(C.ink, W(0), 1.6, 17.355, 0.03, 0.02, 8, Math.PI / 2);
  vbox(GC, C.wall, -2.45, -19.15, 2.45, -19.0, FLOOR, WALL_H);
  vbox(GC, C.frame, -3.45, -19.85, 3.45, -19.15, FLOOR, WALL_H - 0.05);
  vbox(GC, C.skin, -3.45, -20.0, 3.45, -19.85, FLOOR, WALL_H);

  // Windows, one per row and side (panes use their own material: the palette's window colour).
  const GW = new GeoBuilder();
  const rndW = mulberry32(77);
  const windowAt = (s, z) => {
    vboxS(GC, C.wallLt, s, 2.425, 2.45, z - 0.21, z + 0.21, 0.9, 1.52);
    vboxS(GW, 0xffffff, s, 2.415, 2.425, z - 0.15, z + 0.15, 0.98, 1.44);
    vboxS(GC, C.glassDk, s, 3.47, 3.48, z - 0.15, z + 0.15, 1.04, 1.4);
    if (rndW() < 0.3) vboxS(GC, C.rack, s, 2.41, 2.415, z - 0.16, z + 0.16, 1.22 + rndW() * 0.08, 1.45);   // a half-drawn shade
  };
  for (const row of ROWS) for (const s of [1, -1]) windowAt(s, rowZ(row) - 0.25);
  const windowMat = new THREE.MeshBasicMaterial({ color: PALETTES.gate.window });
  const windowMesh = new THREE.Mesh(GW.build(), windowMat);
  scene.add(windowMesh);

  // Row-number plates on the inner wall faces (y 1.7-1.9), both sides: "…11 12 14 15…".
  {
    const { tex, cells } = rowAtlas();
    const parts = [];
    for (const row of ROWS) for (const s of [1, -1]) {
      const geo = new THREE.PlaneGeometry(0.36, 0.2);
      const c = cells[row];
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? c.u1 : c.u0, uv.getY(i) ? c.v1 : c.v0);
      geo.rotateY(s > 0 ? -Math.PI / 2 : Math.PI / 2);
      geo.translate(W(s * 2.414), 1.8, rowZ(row) - 0.25);
      parts.push(geo);
      vboxS(GC, C.wallDk, s, 2.418, 2.425, rowZ(row) - 0.45, rowZ(row) - 0.05, 1.68, 1.92);
    }
    const plates = new THREE.Mesh(mergePlates(parts), new THREE.MeshBasicMaterial({ map: tex }));
    scene.add(plates);
  }

  // Seats: orange 70s seats with white antimacassars, armrests, grey tray tables on the backs.
  for (const row of ROWS) {
    const z = rowZ(row);
    for (const s of [1, -1]) {
      vboxS(GC, C.steelDk, s, 0.66, 2.36, z - 0.27, z - 0.19, FLOOR + 0.06, FLOOR + 0.14);     // seat beam
      for (const lx of [0.75, 2.2]) vbox(GC, C.steelDk, s * lx - 0.03, z - 0.3, s * lx + 0.03, z - 0.14, FLOOR, FLOOR + 0.1);
      for (const ax of [0.63, 1.175, 1.725, 2.27]) {
        vb(GC, C.arm, s * ax, 0.7, z - 0.25, 0.06, 0.05, 0.4);
        vb(GC, C.arm, s * ax, 0.6, z - 0.42, 0.05, 0.18, 0.05);
      }
    }
    for (const L of 'ABCDEF') {
      const x = SEAT_X[L];
      vb(GC, C.seat, x, 0.84, z - 0.455, 0.5, 0.8, 0.13, 0, -0.07);
      vb(GC, C.anti, x, 1.18, z - 0.475, 0.36, 0.2, 0.155, 0, -0.07);
      GC.boxB(C.cushion, W(x), FLOOR + 0.2, z - 0.225, 0.48, 0.2, 0.34);
      GC.boxB(C.seatDk, W(x), FLOOR + 0.12, z - 0.225, 0.42, 0.08, 0.3);
      vb(GC, C.tray, x, 0.95, z - 0.53, 0.32, 0.24, 0.02, 0, -0.07);
      vb(GS, C.steelDk, x, 1.09, z - 0.535, 0.06, 0.02, 0.02);
    }
  }

  // The call button above 14B (the juice gag, `call14`): the one passenger-service part drawn as a
  // solid, so it shows from above. The rest of the service units are down-facing planes with the
  // racks (below). Phase 1 drew them, and a rail along each rack lip, as outlined solids: from the
  // high camera the strip lay across every seated B/E forehead and the rail ran down the A/F faces.
  vb(GS, C.orange, 1.45, 2.058, rowZ(14) - 0.27, 0.05, 0.012, 0.04);

  // Front galley (starboard): counter, ovens against the wall, coffee and juice on the worktop.
  vbox(GC, C.steel, -2.45, 13.6, -0.7, 16.8, FLOOR, 0.95);
  vbox(GC, C.steelLt, -2.47, 13.58, -0.68, 16.82, 0.95, 1.0);
  for (let z = 13.75; z < 16.6; z += 0.55) {
    vbox(GC, C.steelLt, -0.695, z, -0.685, z + 0.48, 0.22, 0.88);
    vb(GS, C.steelDk, -0.68, 0.8, z + 0.24, 0.02, 0.03, 0.18);
  }
  vbox(GC, C.steel, -2.45, 13.7, -1.95, 16.7, 1.0, 2.05);
  for (let z = 13.9; z < 16.5; z += 0.7) vbox(GC, C.glassDk, -1.95, z, -1.94, z + 0.5, 1.25, 1.75);
  for (let k = 0; k < 2; k++) { GC.cyl(0x5a3a2a, W(-1.6 + k * 0.3), 1.12, 14.0, 0.07, 0.24, 10); GS.cyl(C.ink, W(-1.6 + k * 0.3), 1.26, 14.0, 0.035, 0.05, 8); }
  for (let k = 0; k < 6; k++) GS.cyl(C.juice, W(-1.65 + (k % 3) * 0.13), 1.05, 15.0 + ((k / 3) | 0) * 0.14, 0.04, 0.1, 8);
  vbox(GC, C.tray, -1.75, 14.9, -1.3, 15.35, 1.0, 1.01);
  for (let k = 0; k < 4; k++) GS.cyl(C.skin, W(-1.1), 1.04 + k * 0.05, 16.0, 0.045, 0.05, 8);
  // Coat closet (port, forward of the door): cut-away, coats on a rail.
  vbox(GC, C.beige, 0.7, 15.6, 0.78, 17.4, FLOOR, 2.0);
  vbox(GC, C.beige, 0.7, 15.6, 2.45, 15.68, FLOOR, 2.0);
  GC.cyl(C.steel, W(1.6), 1.75, 16.5, 0.02, 1.6, 6, 0, 0, Math.PI / 2);
  [0x3a4a6a, 0x8a5a3a, 0x5a2a2a, 0x2a2a30].forEach((c, k) => vb(GC, c, 1.0 + k * 0.4, 1.25, 16.5, 0.3, 0.95, 0.42));
  vbox(GC, C.beige, 0.78, 15.68, 2.45, 17.4, 1.95, 1.98);
  // The curtain to the front galley, rail across, gathered at the aisle; the seatbelt signs.
  for (let x = -2.45, k = 0; x < -0.75; x += 0.14, k++) vbox(GC, k % 2 ? C.curtain : C.curtainDk, x, 13.14 + (k % 2) * 0.05, x + 0.14, 13.26 + (k % 2) * 0.05, FLOOR + 0.12, 2.2);
  vbox(GC, C.curtainDk, -0.75, 13.08, -0.6, 13.34, FLOOR + 0.08, 2.2);
  vbox(GC, C.curtainDk, 0.6, 13.08, 0.78, 13.34, FLOOR + 0.08, 2.2);
  GC.cyl(C.steelLt, W(0), 2.24, 13.2, 0.02, 4.9, 6, 0, 0, Math.PI / 2);
  // Rear galleys: counters, tall units against the rear wall, coffee and the whisky.
  for (const s of [1, -1]) {
    vboxS(GC, C.steel, s, 0.8, 2.45, -19.0, -16.6, FLOOR, 0.95);
    vboxS(GC, C.steelLt, s, 0.78, 2.47, -19.0, -16.58, 0.95, 1.0);
    vboxS(GC, C.steel, s, 0.8, 2.45, -19.0, -18.55, 1.0, 2.05);
    for (let k = 0; k < 3; k++) vboxS(GC, C.steelLt, s, 0.795, 0.805, -18.9 + k * 0.75, -18.3 + k * 0.75, 0.2, 0.88);
    vboxS(GC, C.glassDk, s, 1.0, 1.6, -18.56, -18.55, 1.3, 1.8);
    GC.cyl(0x5a3a2a, W(s * 1.5), 1.12, -17.4, 0.07, 0.24, 10);
    for (let k = 0; k < 5; k++) GS.cyl(C.skin, W(s * 1.1), 1.04 + k * 0.05, -17.0, 0.045, 0.05, 8);
  }
  GC.cyl(C.whisky, W(1.95), 1.1, -17.0, 0.05, 0.2, 8);
  GC.cyl(C.juice, W(-1.95), 1.1, -17.0, 0.06, 0.2, 8);

  // Rear toilets (cut-away cubicles): the aisle wall is the door; bowl, sink and mirror inside.
  const toiletLamp = {};
  for (const s of [1, -1]) {
    vboxS(GC, C.wallDk, s, 1.0, 1.07, -16.4, -14.9, FLOOR, 2.3);
    vboxS(GC, C.wall, s, 1.0, 2.45, -14.97, -14.9, FLOOR, 2.3);
    vboxS(GC, C.wall, s, 1.0, 2.45, -16.4, -16.33, FLOOR, 2.3);
    vboxS(GF, C.tile, s, 1.07, 2.45, -16.33, -14.97, FLOOR - 0.004, FLOOR + 0.002);
    vboxS(GS, C.steelDk, s, 0.98, 1.0, -15.4, -15.25, 0.95, 1.05);
    GC.cyl(C.porcelain, W(s * 1.95), FLOOR + 0.2, -15.95, 0.2, 0.4, 12);
    GC.cyl(C.wallLt, W(s * 1.95), FLOOR + 0.42, -15.95, 0.21, 0.04, 12);
    vboxS(GC, C.porcelain, s, 2.2, 2.45, -16.33, -15.6, FLOOR, 0.7);
    vboxS(GC, C.steelLt, s, 1.5, 2.45, -15.3, -14.97, 0.8, 0.9);
    GS.cyl(C.mirror, W(s * 1.95), 0.9, -15.12, 0.09, 0.02, 10);
    vboxS(GC, C.mirror, s, 2.42, 2.45, -15.35, -14.98, 1.3, 1.85);
  }

  // Ceiling and hat racks: down-facing planes only, invisible from the camera above (§5.3).
  const downMat = new THREE.MeshLambertMaterial({ color: C.rack, side: THREE.FrontSide });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 36.4).rotateX(Math.PI / 2), downMat);
  ceil.position.set(CX, 2.6, -0.8);
  scene.add(ceil);
  for (const s of [-1, 1]) {
    const rack = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 28.1).rotateX(Math.PI / 2), downMat);
    rack.position.set(CX + s * 2.175, 2.1, -0.95);
    scene.add(rack);
  }
  // A passenger service unit over each B/E seat (reading lamps, call button), one merged mesh.
  const psu = [];
  for (const s of [-1, 1]) for (const row of ROWS) psu.push(new THREE.PlaneGeometry(0.36, 0.1).rotateX(Math.PI / 2).translate(W(s * 1.45), 2.06, rowZ(row) - 0.3));
  scene.add(new THREE.Mesh(mergePlates(psu), downMat));

  // Signs: galleys, crew door, emergency exits, the smokers' section, the seatbelt signs, the toilets.
  // The hanging ones (`hang`) turn about the vertical to face the render camera every frame (YXZ:
  // the up-tilt turns with them; scene.onBeforeRender below): a fixed one was edge-on from the side
  // cameras (a red strip across the speakers) and read upside down from beyond its top edge
  // ("NASSYB ERKAB", "TTELAOT"). `swing` caps the turn away from the sign's own facing or its
  // reverse, whichever is nearer the camera: BAKRE BYSSAN hangs 0.45 m off the rear wall.
  const hanging = [];
  const hang = (m, swing = Math.PI / 2) => { hanging.push({ m, base: m.rotation.y, swing }); return m; };
  hang(sign(signs, 'FRÄMRE BYSSAN', -1.6, 2.4, 13.5, 1.5, 0.32, { yaw: Math.PI, tilt: -0.7, ...SIGN }));
  hang(sign(signs, 'BAKRE BYSSAN', 0, 2.3, -18.45, 1.7, 0.34, { yaw: 0, tilt: -0.7, ...SIGN }), 0.6);
  sign(signs, 'BESÄTTNING', 0, 2.38, 17.36, 1.3, 0.28, { yaw: Math.PI, tilt: -0.6, ...SIGN_W });
  for (const s of [1, -1]) {
    sign(signs, 'NÖDUTGÅNG', s * 2.4, 2.32, rowZ(11) - 0.25, 1.0, 0.22, { yaw: s > 0 ? -Math.PI / 2 : Math.PI / 2, tilt: -0.55, bg: '#e0342a', fg: '#fff8e6', scale: 0.6 });
    vboxS(GC, C.red, s, 2.41, 2.42, rowZ(11) - 0.65, rowZ(11) + 0.15, 0.55, 0.6);
    vboxS(GC, C.red, s, 2.41, 2.42, rowZ(11) - 0.65, rowZ(11) + 0.15, 1.6, 1.65);
    sign(signs, 'RÖKARE', s * 2.4, 2.32, rowZ(SMOKING_FROM) + 0.35, 0.8, 0.22, { yaw: s > 0 ? -Math.PI / 2 : Math.PI / 2, tilt: -0.55, ...SIGN_W });
  }
  // The seatbelt / no-smoking signs over the aisle, lit while the sign is on (§5.7 step 1).
  const beltSigns = [
    hang(sign(signs, 'SPÄNN FAST BÄLTET\nRÖKNING FÖRBJUDEN', 0, 2.42, 13.1, 1.1, 0.36, { yaw: Math.PI, tilt: -0.75, bg: '#e0342a', fg: '#fff8e6', scale: 0.7 })),
    hang(sign(signs, 'SPÄNN FAST BÄLTET\nRÖKNING FÖRBJUDEN', 0, 2.42, -14.7, 1.1, 0.36, { yaw: 0, tilt: -0.75, bg: '#e0342a', fg: '#fff8e6', scale: 0.7 })),
  ];
  for (const m of beltSigns) m.material = m.material.clone();
  const setBeltSignLit = (on) => { for (const m of beltSigns) m.material.color.setHex(on ? 0xffffff : 0x4a4a4a); };
  // TOALETT over each toilet door with its UPPTAGET lamp hanging under it (lit while someone is
  // locked in). They hang 0.2 m off the door wall, so the turning lamp (below the 2.3 m wall top)
  // never enters it; the sign turns above the cubicle.
  for (const s of [1, -1]) {
    const m = hang(sign(signs, 'TOALETT', s * 0.8, 2.42, -15.65, 0.9, 0.24, { yaw: s > 0 ? -Math.PI / 2 : Math.PI / 2, tilt: -0.6, ...SIGN_W }));
    const lamp = signMesh('UPPTAGET', 0.4, 0.16, { bg: '#e0342a', fg: '#fff8e6', scale: 0.7 });
    lamp.position.set(0, -0.22, 0.002);
    lamp.material.color.setHex(0x4a4a4a);
    m.add(lamp);
    toiletLamp[s > 0 ? 'L' : 'R'] = lamp;
  }
  // Turned for the camera that renders this frame (dialogue cuts included), after three has updated
  // the matrices, so each sign refreshes its own. Chained (buildFlightScenery chains onto it).
  const prevBefore = scene.onBeforeRender;
  scene.onBeforeRender = function (renderer, sc, cam, rt) {
    if (prevBefore) prevBefore.call(this, renderer, sc, cam, rt);
    if (cam.position.x < CX - 1100) return;
    for (const h of hanging) {
      const m = h.m, a = Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z);
      const b = Math.abs(angleDiff(h.base, a)) > Math.PI / 2 ? h.base + Math.PI : h.base;
      m.rotation.y = b + clamp(angleDiff(b, a), -h.swing, h.swing);
      m.updateMatrixWorld(true);
    }
  };

  // ---- gate set collision + visuals (§5.2; dead and hidden unless phase gate) ------------------
  const gateBlocks = [];
  const gb = (minX, minZ, maxX, maxZ, top, kind) => { const b = solid(minX, minZ, maxX, maxZ, top, kind); gateBlocks.push(b); return b; };
  const gateGroup = new THREE.Group();
  // A cut-away wall: body to 2.56 m, a darker cap on the section; `skin` paints one face cream.
  const gwall = (x0, z0, x1, z1, body = C.cream, cap = 0xb8a888) => {
    vbox(GG, body, x0, z0, x1, z1, FLOOR, WALL_H - 0.04);
    vbox(GG, cap, x0, z0, x1, z1, WALL_H - 0.04, WALL_H);
  };
  const skin = (x0, z0, x1, z1) => vbox(GG, C.cream, x0, z0, x1, z1, FLOOR, WALL_H - 0.035);

  // Jet bridge: metal box walls with a cream inner skin, small windows, rubber bellows at the plane.
  gb(3.45, 12.7, 14.0, 13.7, 99, 'gatewall');
  gb(3.45, 15.7, 14.0, 16.7, 99, 'gatewall');
  for (const [z0, z1, iz0, iz1] of [[12.7, 13.7, 13.55, 13.7], [15.7, 16.7, 15.7, 15.85]]) {
    gwall(3.45, z0, 14.0, z1, C.metal, 0x6e737a);
    vbox(GG, C.beige, 3.45, iz0, 14.0, iz1, FLOOR, WALL_H - 0.03);
    for (let x = 6.0; x < 13.5; x += 1.6) vbox(GG, C.glassDk, x, z0 < 14 ? 13.7 : 15.69, x + 0.8, z0 < 14 ? 13.71 : 15.7, 1.1, 1.7);
    for (let x = 3.45, k = 0; x < 5.6; x += 0.3, k++) vbox(GG, k % 2 ? C.rubber : 0x55555c, x, z0 - 0.06, x + 0.3, z1 + 0.06, FLOOR, WALL_H + 0.06);
  }
  vbox(GGF, 0x7a7e86, 3.45, 13.7, 14.0, 15.7, FLOOR - 0.04, FLOOR - 0.005);
  for (let x = 3.6; x < 14; x += 0.4) vbox(GGF, 0x6a6e76, x, 13.7, x + 0.05, 15.7, FLOOR - 0.005, FLOOR - 0.001);

  // Lounge walls. West: the window wall onto the apron and the plane (gap for the jet bridge).
  gb(13.0, 0, 14.0, 13.7, 99, 'gatewall');
  gb(13.0, 15.7, 14.0, 30.0, 99, 'gatewall');
  const glassPanes = new GeoBuilder();
  for (const [z0, z1] of [[0, 13.7], [15.7, 30.0]]) {
    vbox(GG, C.woodDk, 13.0, z0, 14.0, z1, FLOOR, 0.7);
    vbox(GG, C.woodDk, 13.0, z0, 14.0, z1, 2.42, WALL_H);
    for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / Math.max(1, Math.round((z1 - z0) / 1.7))) vbox(GG, C.woodDk, 13.3, z - 0.06, 13.7, z + 0.06, 0.7, 2.42);
    glassPanes.boxB(0xffffff, W(13.5), 0.7, (z0 + z1) / 2, 0.04, 1.72, z1 - z0);
  }
  vbox(GG, C.woodDk, 13.0, 13.7, 14.0, 15.7, 2.3, WALL_H);   // header over the bridge gap
  gateGroup.add(new THREE.Mesh(glassPanes.build(), MAT.glass));
  // East, south and north boundary walls (brick outside, cream inside).
  gb(38.0, 0, 39.0, 30.0, 99, 'gatewall');
  gb(13.0, -1.0, 39.0, 0, 99, 'gatewall');
  gb(13.0, 30.0, 39.0, 31.0, 99, 'gatewall');
  gwall(38.0, -1.0, 39.0, 31.0, C.brick, C.woodDk);
  gwall(13.0, -1.0, 38.0, 0, C.brick, C.woodDk);
  gwall(13.0, 30.0, 38.0, 31.0, C.brick, C.woodDk);
  skin(38.0, 0, 38.15, 30.0);
  skin(14.0, -0.15, 37.85, 0);
  skin(14.0, 30.0, 37.85, 30.15);
  // Security: the x-ray belt on the south barrier, trays on the north one, the metal-detector arch.
  gb(31.0, 0, 35.0, 3.9, 1.1, 'counter');
  gb(31.0, 6.1, 35.0, 10.0, 1.1, 'counter');
  for (const [z0, z1] of [[0, 3.9], [6.1, 10.0]]) {
    vbox(GG, C.counter, 31.0, z0, 35.0, z1, FLOOR, 1.02);
    vbox(GG, C.wood, 30.95, z0 - 0.05, 35.05, z1 + 0.05, 1.02, 1.1);
  }
  vbox(GG, C.rubber, 31.0, 2.9, 35.0, 3.6, 1.1, 1.14);
  vbox(GG, C.beige, 32.2, 2.75, 33.8, 3.75, 1.1, 1.95);
  vbox(GG, C.rubber, 32.18, 2.95, 32.22, 3.55, 1.12, 1.6);
  vbox(GG, C.rubber, 33.78, 2.95, 33.82, 3.55, 1.12, 1.6);
  vbox(GG, C.glassDk, 32.6, 2.7, 33.4, 2.75, 1.5, 1.85);
  for (let k = 0; k < 3; k++) vbox(GG, k % 2 ? 0x4a6aa0 : 0x8a8f99, 31.2 + k * 1.2, 7.0 + k * 0.4, 31.9 + k * 1.2, 7.5 + k * 0.4, 1.1, 1.18);
  vbox(GG, 0x4a4a52, 34.2, 8.4, 34.8, 9.6, 1.1, 1.6);
  vbox(GG, C.glassDk, 34.18, 8.6, 34.2, 9.4, 1.25, 1.55);
  for (const z of [3.85, 6.15]) {
    gateBlocks.push(circle(W(33.0), z, 0.15, 2.4, 'gatewall'));
    GG.cyl(0x8a8f99, W(33.0), FLOOR + 1.15, z, 0.15, 2.3, 10);
  }
  vb(GG, 0x8a8f99, 33.0, FLOOR + 2.4, 5.0, 0.32, 0.22, 2.62);
  GGF.sphere(0x3ac05a, W(33.0), FLOOR + 2.58, 4.4, 0.12);
  GGF.sphere(C.red, W(33.0), FLOOR + 2.58, 5.6, 0.12);
  vbox(GGF, C.vinyl, 30.0, 0, 38.0, 13.5, FLOOR - 0.012, FLOOR - 0.004);
  // The landside pocket: a frosted glass partition (forces you through the arch); queue posts.
  gb(35.0, 10.0, 38.0, 11.0, 99, 'gatewall');
  vbox(GG, C.wood, 35.0, 10.0, 38.0, 11.0, FLOOR, 0.9);
  vbox(GG, C.wood, 35.0, 10.0, 38.0, 11.0, 2.45, WALL_H);
  for (const x of [35.05, 36.5, 37.95]) vbox(GG, C.wood, x - 0.05, 10.0, x + 0.05, 11.0, 0.9, 2.45);
  const frosted = new GeoBuilder();
  frosted.boxB(0xffffff, W(36.5), 0.9, 10.5, 2.9, 1.55, 0.05);
  gateGroup.add(new THREE.Mesh(frosted.build(), MAT.glass));
  for (const z of [1.0, 3.0, 7.5, 9.4]) { GG.cyl(C.chrome, W(37.6), FLOOR + 0.5, z, 0.04, 1.0, 8); GG.cyl(C.ink, W(37.6), FLOOR + 0.02, z, 0.16, 0.04, 10); }
  vbox(GG, 0x2a4fa0, 37.58, 1.0, 37.62, 9.4, 0.88, 0.95);
  // Men's room (door gap z 24.4-26.0): urinals, three basins with a mirror, a cubicle.
  gb(29.5, 22.0, 30.5, 24.4, 99, 'gatewall');
  gb(29.5, 26.0, 30.5, 30.0, 99, 'gatewall');
  gb(30.0, 21.5, 38.0, 22.5, 99, 'gatewall');
  gwall(29.5, 22.0, 30.5, 24.4);
  gwall(29.5, 26.0, 30.5, 30.0);
  gwall(30.0, 21.5, 38.0, 22.5);
  for (const [x0, z0, x1, z1] of [[30.5, 22.5, 37.85, 22.6], [30.5, 22.5, 30.6, 24.4], [30.5, 26.0, 30.6, 30.0]]) vbox(GG, C.tile, x0, z0, x1, z1, FLOOR, 1.6);
  vbox(GGF, C.tile, 30.5, 22.5, 38.0, 30.0, FLOOR - 0.012, FLOOR - 0.004);
  for (const x of [32.2, 33.4, 34.6]) { vbox(GG, C.porcelain, x - 0.22, 22.6, x + 0.22, 22.95, 0.55, 1.25); vbox(GG, C.wallDk, x - 0.25, 22.6, x + 0.25, 22.65, 1.25, 1.35); }
  vbox(GG, C.tile, 37.4, 23.2, 37.85, 28.0, FLOOR, 0.85);
  vbox(GG, C.steelLt, 37.35, 23.15, 37.85, 28.05, 0.85, 0.9);
  for (const z of [23.9, 25.6, 27.3]) { GG.cyl(C.porcelain, W(37.55), 0.92, z, 0.2, 0.05, 12); GGF.cyl(C.steel, W(37.75), 1.0, z, 0.03, 0.18, 6); }
  vbox(GG, C.mirror, 37.82, 23.2, 37.85, 28.0, 1.2, 2.1);
  gb(35.8, 27.9, 38.0, 30.0, 2.2, 'gatewall');   // the cubicle (A1: solid, so it is never walked through)
  vbox(GG, C.beige, 35.8, 27.9, 35.86, 29.0, FLOOR + 0.12, 2.2);
  vbox(GG, C.beige, 35.8, 27.9, 37.85, 27.96, FLOOR + 0.12, 2.2);
  vbox(GG, C.wood, 35.74, 29.0, 35.8, 29.95, FLOOR + 0.12, 2.1);
  GG.cyl(C.porcelain, W(37.0), FLOOR + 0.2, 29.3, 0.2, 0.4, 12);
  vbox(GG, C.porcelain, 36.7, 29.7, 37.3, 29.85, FLOOR, 0.8);
  // Ladies' room (closed; door drawn on its west wall): the sisters' toilet picnic inside.
  gb(29.5, 14.0, 30.5, 21.5, 99, 'gatewall');
  gb(30.0, 13.5, 38.0, 14.5, 99, 'gatewall');
  gwall(29.5, 14.0, 30.5, 21.5);
  gwall(30.0, 13.5, 38.0, 14.5);
  vbox(GG, C.wood, 29.44, 17.6, 29.5, 19.2, FLOOR, 2.1);
  vb(GG, C.steelDk, 29.42, 1.05, 18.95, 0.04, 0.05, 0.16);
  vbox(GGF, C.tilePink, 30.5, 14.5, 38.0, 21.5, FLOOR - 0.012, FLOOR - 0.004);
  for (const x of [34.0, 36.0]) vbox(GG, C.beige, x, 17.8, x + 0.06, 21.5, FLOOR + 0.12, 2.1);
  for (const x of [35.0, 37.0]) { GG.cyl(C.porcelain, W(x), FLOOR + 0.2, 21.0, 0.2, 0.4, 12); vbox(GG, C.porcelain, x - 0.3, 21.25, x + 0.3, 21.45, FLOOR, 0.8); }
  vb(GG, 0xc8a070, 35.0, FLOOR + 0.43, 21.0, 0.62, 0.02, 0.5);           // cardboard table on the lid
  GG.cyl(0x3a7a3a, W(35.1), FLOOR + 0.58, 20.95, 0.045, 0.26, 8);
  GGF.cyl(C.skin, W(34.85), FLOOR + 0.49, 21.1, 0.03, 0.09, 8);
  GGF.cyl(C.skin, W(34.92), FLOOR + 0.49, 20.82, 0.03, 0.09, 8);
  vb(GGF, C.red, 35.25, FLOOR + 0.48, 20.8, 0.12, 0.08, 0.06);
  vbox(GG, C.tile, 30.5, 14.5, 33.0, 15.0, FLOOR, 0.85);
  vbox(GG, C.mirror, 30.5, 14.5, 33.0, 14.55, 1.2, 2.0);
  // Gate desk with the terminal and the gate sign; lounge chairs (orange shells on chrome).
  gb(16.0, 18.5, 17.2, 22.5, 1.1, 'counter');
  vbox(GG, C.counter, 16.1, 18.5, 17.2, 22.5, FLOOR, 1.02);
  vbox(GG, C.wood, 15.95, 18.4, 17.3, 22.6, 1.02, 1.1);
  vbox(GG, C.beige, 16.15, 19.4, 16.6, 19.9, 1.1, 1.45);
  vbox(GG, C.glassDk, 16.6, 19.45, 16.62, 19.85, 1.17, 1.4);
  vbox(GG, C.beige, 16.2, 21.2, 16.6, 21.7, 1.1, 1.25);
  GGF.cyl(C.ink, W(16.9), 1.25, 20.5, 0.015, 0.3, 6);
  // Lounge passengers, but none at the east end of the front row (x >= 26): from the arch two-shot's
  // eye a face there filled the bottom-left corner. (Its random draws are still made, so the other
  // busts stay who they were.)
  const loungeBusts = new GeoBuilder();
  const rndL = mulberry32(1976);
  for (const z0 of [6.6, 12.6, 18.6]) {
    gb(19.0, z0, 27.0, z0 + 0.8, 0.95, 'bench');
    vbox(GG, C.chrome, 19.1, z0 + 0.3, 26.9, z0 + 0.42, FLOOR + 0.25, FLOOR + 0.31);
    for (const x of [19.4, 26.6]) vbox(GG, C.chrome, x - 0.04, z0 + 0.15, x + 0.04, z0 + 0.65, FLOOR, FLOOR + 0.3);
    for (let k = 0; k < 12; k++) {
      const x = 19.33 + k * 0.667;
      vb(GG, C.seat, x, 0.5, z0 + 0.45, 0.56, 0.08, 0.5);
      vb(GG, C.seat, x, 0.74, z0 + 0.1, 0.56, 0.44, 0.08, 0, -0.18);
      if (k % 4 !== 3) vb(GGF, C.chrome, x + 0.33, 0.62, z0 + 0.4, 0.04, 0.04, 0.42);
      if (rndL() < 0.3) {
        const geo = buildBustGeo(randomPed(rndL, { flight: true }));
        geo.translate(W(x), 0.54, z0 + 0.38);
        if (!(z0 === 6.6 && k >= 10)) loungeBusts.parts.push(geo);
      }
    }
  }
  // Plants, standing ashtrays, a clock, the departures board and the SunTrip poster.
  for (const [x, z] of [[14.7, 0.7], [14.7, 29.3], [28.8, 29.3], [28.8, 0.7]]) {
    GG.cyl(C.pot, W(x), FLOOR + 0.25, z, 0.3, 0.5, 10);
    GG.ico(C.plant, W(x), FLOOR + 1.0, z, 0.9, 1);
    GG.ico(C.plantLt, W(x + 0.15), FLOOR + 1.45, z - 0.1, 0.6, 1);
  }
  for (const [x, z] of [[18.4, 10.0], [27.6, 16.0], [18.4, 22.0]]) { GG.cyl(C.chrome, W(x), FLOOR + 0.4, z, 0.06, 0.8, 8); GG.cyl(C.steelDk, W(x), FLOOR + 0.82, z, 0.17, 0.06, 10); }
  // The clock: an ink rim behind the face, hands at 9.05 (the flight leaves 09.40).
  GG.cyl(C.ink, W(30.0), 2.0, 0.015, 0.33, 0.03, 16, Math.PI / 2);
  GG.cyl(C.skin, W(30.0), 2.0, 0.035, 0.3, 0.03, 16, Math.PI / 2);
  for (const [a, len, w] of [[-(9 + 5 / 60) / 12 * Math.PI * 2, 0.16, 0.035], [-5 / 60 * Math.PI * 2, 0.24, 0.025]]) {
    vb(GGF, C.ink, 30.0 - Math.sin(a) * len / 2, 2.0 + Math.cos(a) * len / 2, 0.055, w, len, 0.01, 0, 0, a);
  }
  sign(gateGroup, 'AVGÅNGAR\nLAS PALMAS 09.40 · GATE 8 · I TID', 25.75, 1.85, 0.32, 5.3, 1.1, { yaw: 0, tilt: -0.3, bg: '#1d1426', fg: '#ffd23f', scale: 0.62 });
  sign(gateGroup, 'SUNTRIP\nSOLEN VÄNTAR', 18.0, 1.55, 0.3, 2.2, 1.4, { yaw: 0, tilt: -0.25, bg: '#f7c31b', fg: '#d8321e', scale: 0.7 });
  GG.cyl(C.orange, W(18.0), 2.62, 0.12, 0.4, 0.05, 16, Math.PI / 2);
  for (const x of [23.0, 29.0]) vbox(GG, C.woodDk, x - 0.06, 30.4, x + 0.06, 30.6, WALL_H, 2.85);
  // Carpets: brown with an orange 70s border and a lighter rug under the chairs.
  vbox(GGF, C.lounge, 13.0, -1.0, 39.0, 31.0, FLOOR - 0.06, FLOOR - 0.014);
  vbox(GGF, 0x7a5a3e, 18.2, 5.6, 27.8, 20.4, FLOOR - 0.014, FLOOR - 0.008);
  vbox(GGF, 0x7a5a3e, 14.0, 13.7, 18.2, 15.7, FLOOR - 0.014, FLOOR - 0.008);
  for (const [x0, z0, x1, z1] of [[15.0, 1.0, 29.0, 1.3], [15.0, 28.7, 29.0, 29.0], [15.0, 1.0, 15.3, 13.2], [15.0, 16.2, 15.3, 29.0], [28.7, 1.0, 29.0, 13.0]]) vbox(GGF, C.counter, x0, z0, x1, z1, FLOOR - 0.008, FLOOR - 0.004);
  // A newsstand on the north wall (solid; the cabin package owns the gate set).
  gb(20.0, 26.8, 24.0, 27.6, 1.1, 'counter');
  gb(20.0, 29.3, 24.0, 30.0, 2.0, 'counter');
  vbox(GG, C.counter, 20.0, 26.8, 24.0, 27.6, FLOOR, 1.02);
  vbox(GG, C.wood, 19.95, 26.75, 24.05, 27.65, 1.02, 1.1);
  vbox(GG, C.wood, 20.0, 29.3, 24.0, 30.0, FLOOR, 2.0);
  { const r = mulberry32(31); for (let x = 20.15; x < 23.9; x += 0.32) for (const y of [0.6, 1.05, 1.5]) vbox(GG, [0xd8321e, C.yellow, 0x2a4fa0, C.skin, 0x3a7a3a][(r() * 5) | 0], x, 29.2, x + 0.26, 29.3, y, y + 0.36); }
  for (let x = 20.3; x < 23.8; x += 0.45) vbox(GGF, [C.red, C.yellow, C.skin][((x * 7) | 0) % 3], x, 26.9, x + 0.35, 27.45, 1.1, 1.13);
  gb(19.9, 26.7, 20.05, 30.0, 2.4, 'counter');
  gb(23.95, 26.7, 24.1, 30.0, 2.4, 'counter');
  vbox(GG, C.wood, 19.9, 26.7, 20.05, 30.0, FLOOR, 2.4);
  vbox(GG, C.wood, 23.95, 26.7, 24.1, 30.0, FLOOR, 2.4);
  vbox(GG, C.counter, 19.9, 26.7, 24.1, 27.0, 2.4, 2.6);
  sign(gateGroup, 'TIDNINGAR · GODIS', 22.0, 2.95, 26.7, 3.6, 0.5, { yaw: Math.PI, tilt: -0.35, bg: '#f7c31b', fg: '#1d1426', scale: 0.6 });
  // Two wall telephones on the south wall.
  for (const x of [15.6, 16.6]) { vbox(GG, 0x8a8f99, x - 0.3, 0.0, x + 0.3, 0.35, 0.9, 2.1); vbox(GGF, C.red, x - 0.12, 0.35, x + 0.12, 0.45, 1.3, 1.65); }
  // Signs.
  sign(gateGroup, 'ARLANDA UTRIKES', 26, 3.5, 30.5, 9, 1.4, { yaw: Math.PI, tilt: -0.35, bg: '#d8743a', fg: '#fff8e6', scale: 0.6, double: true });
  sign(gateGroup, 'SÄKERHETSKONTROLL', 33, 3.05, 5.0, 4.2, 0.7, { yaw: -Math.PI / 2, tilt: -0.3, double: true, ...SIGN_W });
  sign(gateGroup, 'GATE 8 · LAS PALMAS 09.40', 16.6, 2.55, 20.5, 4.2, 0.7, { yaw: Math.PI / 2, tilt: -0.35, bg: '#1d1426', fg: '#ffd23f', scale: 0.5 });
  sign(gateGroup, 'HERRAR', 29.45, 2.9, 25.2, 1.6, 0.45, { yaw: -Math.PI / 2, tilt: -0.3, double: true, ...SIGN_W });
  sign(gateGroup, 'DAMER', 29.45, 2.9, 18.4, 1.6, 0.45, { yaw: -Math.PI / 2, tilt: -0.3, double: true, ...SIGN_W });
  sign(gateGroup, 'GATE 8', 13.5, 2.95, 14.7, 1.6, 0.5, { yaw: Math.PI / 2, tilt: -0.3, double: true, bg: '#1d1426', fg: '#ffd23f', scale: 0.6 });

  gateGroup.add(toonMesh(GG.build(), { outline: 0.035 }));
  gateGroup.add(toonMesh(GGF.build(), { outline: 0, cast: false }));
  { const geo = buildBustGeo(randomPed(mulberry32(88), { flight: true })); geo.rotateY(Math.PI); geo.translate(W(22.0), 0.75, 28.4); loungeBusts.parts.push(geo); }   // the newsstand vendor
  if (!loungeBusts.empty) gateGroup.add(toonMesh(loungeBusts.build(), { outline: 0.025 }));
  scene.add(gateGroup);

  const cabinMesh = toonMesh(GC.build(), { outline: 0.028 });
  scene.add(cabinMesh);
  scene.add(toonMesh(GF.build(), { outline: 0, cast: false }));
  scene.add(toonMesh(GS.build(), { outline: 0, cast: false }));
  const doorMesh = toonMesh(GD.build(), { outline: 0.028 });
  scene.add(doorMesh);

  // ---- landmarks ---------------------------------------------------------------------------
  for (const [name, [lx, lz, yaw, y]] of Object.entries(LANDMARKS)) {
    landmarks[name] = { x: W(lx), z: lz, yaw };
    if (y !== undefined) landmarks[name].y = y;
  }

  // ---- seats and passenger busts (§5.2, §5.4) ------------------------------------------------
  const seats = {};
  const reservedSeat = (id, row, L) => !!CAST_SEATS[id] || id === '14C' || (DODGE_ROWS.includes(row) && (L === 'C' || L === 'D'));
  const rnd = mulberry32(1979);
  const bustG = new GeoBuilder();
  for (const row of ROWS) {
    const z = rowZ(row);
    for (const L of 'ABCDEF') {
      const id = `${row}${L}`, x = SEAT_X[L];
      const seat = { id, row, letter: L, x: W(x), z: z - 0.22, y: 0.55, yaw: 0, aisle: { x: W(x > 0 ? 0.25 : -0.25), z: z - 0.1 }, taken: null };
      seats[id] = seat;
      if (!reservedSeat(id, row, L) && rnd() < 0.7) {
        seat.taken = 'bust';
        const geo = buildBustGeo(randomPed(rnd, { flight: true }));
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

  // ---- aisle walkers (§5.12, P1): standing passengers who shuffle to the galleys and toilets ----
  const walkers = [];
  {
    const r = mulberry32(4242);
    const homeRows = [[5, 4, 7, 6, 9], [17, 19, 16, 21, 15], [24, 21, 23, 19]];
    homeRows.forEach((rows, k) => {
      let home = null;
      for (const row of rows) {
        for (const L of 'ABCDEF') { const s = seats[`${row}${L}`]; if (!s.taken && !reservedSeat(s.id, row, L)) { home = s; break; } }
        if (home) break;
      }
      if (!home) return;
      const ch = new Character({ ...randomPed(r, { flight: true }), kind: 'adult', scale: 0.96 + r() * 0.08 });
      ch.key = `walker${k}`;
      scene.add(ch.root);
      walkers.push({ ch, home, seat: null, mode: 'seated', t: 8 + k * 9 + r() * 10, goal: null, dodge: null, waitT: 0, sayCd: 0, rnd: r });
    });
  }

  const blockers = [];
  const listeners = { phase: [], jolt: [] };
  const fear = (n) => { if (n > 0) game.shame?.add(n, { force: true }); };
  const relieve = (n) => { if (n > 0) game.shame?.relieve(n); };
  const missionToken = () => game.missions?.m || null;
  const inAisle = (x) => Math.abs(x - CX) < 0.75;

  const cabin = {
    bounds: { x0: W(-3.45), z0: -20, x1: W(39), z1: 31 },
    phase: 'gate', phaseT: 0, hold: false, seatbelt: false,
    trolley, trolleyStopped: true, pusher,
    stats: { bowled: 0, falls: 0, jolts: 0 },
    seats, scenery, doorBlock, gateBlocks, cabinBlocks, walkers,
    gateActive: true,
    // Trolley state. mode: 'auto' (the §5.8 default: runs in cruise from mission index 2, else
    // parked) | 'run' | 'stop' (startTrolley/stopTrolley). A manual mode belongs to the mission run
    // that set it (`owner`) and falls back to 'auto' when that run ends (complete, fail, abort).
    _t: { mode: 'auto', owner: null, wait: 0, stopAt: null, stopRow: null, pauseT: 0, bowlCd: 0, running: false, v: 0, serveYaw: 0 },
    _turb: null, _idleTurbT: 75, _oleBarkT: 10, _row13: false, _prevPz: null, _fired: {},
    _beltWant: false,       // the sign as missions/phases set it; turbulence lights it on top (§5.7 step 4)
    _drone: DRONE.gate, _droneUp: false, _bounce: 0, _ratataCd: 0, _angerudDone: false, _juiceT: { front: 0, back: 0 },
    _toilet: { L: null, R: null, gate: null },   // who is locked in: 'stig' | walker key | null
    _smokeT: 2, _chatCd: 0,
    _pal: { now: null, from: null, to: null, t: 0, len: 0 },   // palette blend (applyPalette)

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
      const prev = this.phase;
      this.phase = name;
      this.hold = !!hold;
      this.phaseT = instant ? (PHASE_LEN[name] ?? 0) : 0;
      this._fired = {};
      this.setGateActive(name === 'gate');
      if (name === 'gate') { this._beltWant = false; this._applyBelt(); }
      this.applyPalette(instant ? 0 : PAL_BLEND[name] ?? PAL_BLEND_DEFAULT);
      scenery.setPhaseVisual(name, this.phaseT);
      this._setDrone(DRONE[name] || [0, 0]);
      if (name === 'takeoff' && !instant) { this._beltWant = true; this._applyBelt(); }
      if (name === 'cruise' && prev !== 'cruise') this._angerudDone = false;
      for (const fn of listeners.phase.slice()) fn(name);
    },
    // The phase's palette: at once, or blended over `secs` from what is on screen now (stepPalette;
    // a blend under way starts the next one from where it stands).
    applyPalette(secs = 0) {
      const P = this._pal, pal = FLIGHT_PALETTES[this.phase];
      P.to = pal;
      P.t = 0;
      if (secs > 0 && P.now && P.now !== pal) { P.from = P.now; P.len = secs; return; }
      P.len = 0;
      this._writePalette(pal);
    },
    _writePalette(p) {
      windowMat.color.setHex(p.window);
      if (game.level === 'flight') setSkyPalette(p);
      this._pal.now = p;
    },
    stepPalette(dt) {
      const P = this._pal;
      if (!P.len) return;
      P.t = Math.min(P.len, P.t + dt);
      if (P.t >= P.len) { P.len = 0; this._writePalette(P.to); return; }
      const k = P.t / P.len, s = k * k * (3 - 2 * k), p = {};
      for (const key of PAL_COLORS) p[key] = _palA.setHex(P.from[key]).lerp(_palB.setHex(P.to[key]), s).getHex();
      for (const key of PAL_NUMS) p[key] = P.from[key] + (P.to[key] - P.from[key]) * s;
      this._writePalette(p);
    },
    // A stage that plays Angerud's row-6 complaint itself (juice stage 1, rowSixComplaint) takes the
    // line: the trolley's own row-6 bark stays quiet until the next cruise.
    skipRowSixBark() { this._angerudDone = true; },
    onPhase(fn) { listeners.phase.push(fn); return () => { const i = listeners.phase.indexOf(fn); if (i >= 0) listeners.phase.splice(i, 1); }; },
    onJolt(fn) { listeners.jolt.push(fn); return () => { const i = listeners.jolt.indexOf(fn); if (i >= 0) listeners.jolt.splice(i, 1); }; },

    // The public switch (missions, cues, restoreAmbience): records what the mission wants; a
    // turbulence keeps the sign lit on top of that until 3 s after it ends.
    setSeatbelt(on, { chime = true } = {}) {
      const was = this.seatbelt;
      this._beltWant = !!on;
      this._applyBelt();
      if (this.seatbelt && !was && chime) audio.chime();
    },
    _applyBelt() {
      this.seatbelt = this._beltWant || !!(this._turb && (this._turb.warned || this._turb.beltHold));
      setBeltSignLit(this.seatbelt);
    },
    // Cabin drone (§5.6): base level per phase/event, +30 % while the turbulence shakes (§5.7).
    _setDrone(d) {
      this._drone = d;
      if (game.level === 'flight') audio.drone(d[0] * (this._droneUp ? TURB_DRONE : 1), d[1]);
    },

    // ---- turbulence (§5.7) ----
    // True from the warning (chime, belt sign, banner) until the shaking ends: the window in which
    // main.js shows the `Håll i dig!` prompt. Part of the §14.7 contract.
    get turbulent() {
      const T = this._turb;
      return !!T && T.warned && T.t - T.delay - T.warn <= T.secs;
    },
    turbulence(strength, secs, { warn = 1.5, delay = 0 } = {}) {
      // A new turbulence replaces a running one; its sign stays lit through the new delay.
      const beltHold = !!(this._turb && (this._turb.warned || this._turb.beltHold));
      this._turb = { strength, secs, warn, delay, t: 0, warned: false, beltHold, joltT: 0.8, shakeT: 0, rattleT: 0, unheld: 0 };
      if (this._droneUp) { this._droneUp = false; this._setDrone(this._drone); }
    },
    // Ends any turbulence at once (restoreAmbience after a failed or aborted flight mission): no
    // more shaking or jolts, the wobble and drone back to normal, the belt sign back to what the
    // mission/phase wants (no turbulence hold).
    stopTurbulence() {
      this._turb = null;
      if (this._droneUp) { this._droneUp = false; this._setDrone(this._drone); }
      scenery.scenery.rotation.z = 0;
      this._applyBelt();
    },

    // ---- seats ----
    seatCharacter(ch, seatId) {
      const seat = seats[seatId];
      if (!seat) { console.warn('cabin.seatCharacter: unknown seat', seatId); return false; }
      const key = ch.key || 'npc';
      if (seat.taken && seat.taken !== key) {
        // A walker or a stower gives the seat up for anyone else (he stands in the aisle).
        const w = walkers.find((v) => v.ch.key === seat.taken);
        if (w) this._walkerStand(w, true);
        else return false;
      }
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
        const w = walkers.find((v) => v.ch.key === seat.taken);
        if (w) continue;   // walkers keep their seats (they are passengers, not cast)
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
      for (const id in seats) {
        const seat = seats[id];
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
    startTrolley() { const T = this._t; T.mode = 'run'; T.owner = missionToken(); this.trolleyStopped = false; },
    stopTrolley() { const T = this._t; T.mode = 'stop'; T.owner = missionToken(); T.v = 0; this.trolleyStopped = true; },
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
            const ch = new Character({ ...randomPed(r, { flight: true }), kind: 'adult', scale: 1 });
            ch.key = `blocker${k}`;
            ch.anim.cupUp = true;
            blockers.push(ch);
          }
        }
        blockers.forEach((ch, k) => {
          this._releaseSeat(ch);
          const z = rowZ(BLOCKER_ROWS[k]) + 0.25;
          ch.standAt(CX, z, Math.PI / 2);
          ch.anim.cupUp = true;
          ch.moved = false;
          ch.bumpCd = 0;
          if (!ch.root.parent) scene.add(ch.root);
          ch.active = true;
        });
      } else {
        for (const ch of blockers) { this._releaseSeat(ch); ch.active = false; scene.remove(ch.root); }
      }
    },
    blockers,
    _releaseSeat(ch) {
      if (ch.seatId && seats[ch.seatId]?.taken === ch.key) seats[ch.seatId].taken = null;
      ch.seatId = null;
    },
    // "Ursäkta!": the stower steps into a free C/D seat of his dodge row and sits there (the seat
    // is then taken, so the player cannot sit on him); with both taken he stands in the leg room.
    _excuseBlocker(ch, row, g) {
      const side = ch.x >= CX ? 1 : -1;
      const ids = side > 0 ? [`${row}C`, `${row}D`] : [`${row}D`, `${row}C`];
      const seat = ids.map((id) => seats[id]).find((s) => !s.taken);
      ch.anim.cupUp = false;
      if (seat) {
        seat.taken = ch.key;
        ch.seatId = seat.id;
        ch.seatAt({ x: seat.x, y: seat.y, z: seat.z, yaw: 0 });
      } else ch.standAt(W(side * 1.0), rowZ(row) + 0.31, 0);
      ch.moved = true;
      g.say(ch, 'Ursäkta!', 1.4);   // [N]
    },

    placeCoins() {
      // 24 fixed coins (§5.2 budget ≤ 30): the aisle, the galleys, a few in dodge-row leg room. The
      // aisle line runs z 9.8 to -10.0, clear of the cut cameras that look along it: `row22Cam` aft
      // past row 22, `galleyCam` forward to the front galley (none in its galley either).
      for (let k = 0; k < 12; k++) placeCoin(W(0), 0.9, 9.8 - k * 1.8);
      placeCoin(W(0), 0.9, -16.4);
      placeCoin(W(0), 0.9, -18.4);
      placeCoin(W(-1.2), 0.9, 12.9);
      for (const [row, s] of [[3, -1], [8, 1], [8, -1], [15, -1], [18, 1], [18, -1], [20, 1], [20, -1], [23, -1]]) placeCoin(W(s * 1.0), 0.9, rowZ(row) + 0.31);
    },

    // The minimap plan (§5.11). Only live blocks: the gate plan has the door open and the bridge
    // and lounge; every other phase is cropped to the cabin with the door closed.
    mapSource(phase) {
      const gate = phase === 'gate';
      const key = gate ? '_mapGate' : '_mapCabin';
      if (!this[key]) {
        const bounds = gate ? { x0: W(-3.5), z0: -20, x1: W(39), z1: 31 } : { x0: W(-3.5), z0: -20.5, x1: W(3.5), z1: 18.5 };
        const off = gate ? [doorBlock] : gateBlocks;
        const kinds = off.map((b) => b.kind);
        for (const b of off) b.kind = '_off';
        try {
          this[key] = hud.buildMapFromBlocks(bounds, { scale: 12, bg: '#2a3442', zoom: 9, north: 'FRAM',
            kinds: { seatback: '#d2601f', cushion: '#e8925a', galley: '#9a9a92', toilet: '#6a7a8a', bound: '#e6dcc4', door: '#e6dcc4',
              gatewall: '#c8b89a', counter: '#9a9a92', bench: '#d2601f', bridge: '#c8b89a' } });
        } finally { off.forEach((b, i) => { b.kind = kinds[i]; }); }
        this._decorateMap(this[key], gate);
      }
      return this[key];
    },
    _decorateMap(src, gate) {
      const c = src.canvas.getContext('2d');
      const X = (lx) => (W(lx) - src.x0) * src.scale, Z = (z) => (z - src.z0) * src.scale;
      c.fillStyle = '#4a3c30';     // aisle runner
      c.globalCompositeOperation = 'lighten';
      c.fillRect(X(-0.5), Z(-14.9), X(0.5) - X(-0.5), Z(13.2) - Z(-14.9));
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#ffd23f';     // the player's seat 14B
      const s = seats['14B'];
      c.fillRect(X(1.2), Z(s.z - 0.2), X(1.7) - X(1.2), Z(s.z + 0.2) - Z(s.z - 0.2));
      if (gate) {
        c.fillStyle = '#5a4434';   // lounge carpet and bridge floor under the walls
        c.globalCompositeOperation = 'lighten';
        c.fillRect(X(14), Z(0), X(38) - X(14), Z(30) - Z(0));
        c.fillRect(X(3.45), Z(13.7), X(14) - X(3.45), Z(15.7) - Z(13.7));
        c.globalCompositeOperation = 'source-over';
      }
    },

    // ---- per frame (dt already scaled by timeScale) ----
    tick(dt, t, g) {
      this.stepPhase(dt, g);
      this.stepPalette(dt);
      this.stepTurbulence(dt, g);
      this.stepPusher(dt, g);
      this.stepFear(dt, g);
      this.stepBlockers(dt, g);
      this.stepWalkers(dt, g);
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
        if (at('drone', 0)) this._setDrone(DRONE.takeoff);
      } else if (ph === 'climb') {
        for (const tt of [1.5, 4, 6.5]) if (at('bump' + tt, tt)) { g.cam.shake = Math.max(g.cam.shake, 0.3); fear(FEAR.climbBump); g.interruptMantra?.(); audio.rattle(); this._bounce = 0.05; }
      } else if (ph === 'landing') {
        if (at('touch', 5)) { audio.thud(); g.cam.shake = Math.max(g.cam.shake, 0.6); fear(FEAR.touchdown); this._bounce = 0.08; }
        if (at('rev', 5.5)) { this._setDrone([1, 1]); fear(FEAR.reverse); this._revT = 3; }
      } else if (ph === 'cruise' && g.missions?.state === 'idle' && !this._turb) {
        this._idleTurbT -= dt;
        if (this._idleTurbT <= 0) { this._idleTurbT = 60 + Math.random() * 30; this.turbulence(0.3 + Math.random() * 0.3, 4 + Math.random() * 2); }
      }
      if (this._revT > 0) { this._revT -= dt; if (this._revT <= 0) this._setDrone(DRONE[this.phase] || DRONE.landed); }
      if (len !== undefined && t1 >= len && !this.hold && NEXT[ph]) this.setPhase(NEXT[ph]);
    },

    stepTurbulence(dt, g) {
      const T = this._turb;
      // Passenger busts bob after bumps and jolts.
      if (this._bounce > 0.001) { this._bounce *= Math.exp(-6 * dt); bustMesh.position.y = Math.sin(t3(this) * 40) * this._bounce; } else bustMesh.position.y = 0;
      if (!T) return;
      T.t += dt;
      if (T.t < T.delay) return;
      const tt = T.t - T.delay;
      if (!T.warned) {
        T.warned = true;
        audio.chime();
        this._applyBelt();
        hud.showBanner(S.turbulence, '', 'count', 1200);
      }
      const run = tt - T.warn;
      if (run < 0) return;
      if (run <= T.secs) {
        if (!this._droneUp) { this._droneUp = true; this._setDrone(this._drone); }
        T.shakeT -= dt;
        if (T.shakeT <= 0) { T.shakeT = 0.3; g.cam.shake = Math.max(g.cam.shake, 0.5 * T.strength); }
        T.rattleT -= dt;
        if (T.rattleT <= 0) { T.rattleT = 0.4; audio.rattle(); }
        scenery.scenery.rotation.z = Math.sin(tt * 9) * 0.03 * T.strength;
        T.joltT -= dt;
        if (T.joltT <= 0) { T.joltT = 0.8; this.jolt(g, T); }
      } else {
        if (this._droneUp) { this._droneUp = false; this._setDrone(this._drone); }
        scenery.scenery.rotation.z = 0;
        if (run > T.secs + 3) {
          this._turb = null;
          this._applyBelt();     // off again unless a mission (or the takeoff) wants it on
        }
      }
    },

    jolt(g, T) {
      this.stats.jolts++;
      this._bounce = Math.max(this._bounce, 0.035 * (0.5 + T.strength));
      for (const fn of listeners.jolt.slice()) fn({ strength: T.strength });
      const p = g.player;
      if (p.state === 'hidden') return;
      if (p.state === 'seated' && p.seatId) { fear(g.mantraOn ? FEAR.joltSeatedMantra : FEAR.joltSeated); g.interruptMantra?.(); return; }
      if (p.state !== 'normal' || g.playerCar) return;
      const side = Math.random() < 0.5 ? -1 : 1;
      g.interruptMantra?.();    // §5.9: every jolt interrupts a held mantra, standing or seated
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
      // A manual mode set by a mission run ends with that run (fail/abort/complete): back to auto.
      if (T.mode !== 'auto' && T.owner !== missionToken()) { T.mode = 'auto'; T.owner = null; }
      const auto = T.mode === 'auto';
      const shouldRun = T.mode === 'run' || (auto && this.phase === 'cruise' && g.level === 'flight' && (g.missions?.index ?? 0) >= 2);
      T.bowlCd -= h;
      // Turbulence: the trolley jitters ±0.05 m sideways (kinematic, never into the seats).
      const turb = this.turbulent && this._turb.t - this._turb.delay - this._turb.warn >= 0;
      T.jitT = (T.jitT || 0) + h;
      const jx = turb ? Math.sin(T.jitT * 13) * 0.05 : 0;
      if (!shouldRun) {
        T.running = false;
        T.serving = false;
        T.v = 0;
        this.trolleyStopped = true;
        if (auto && (Math.abs(trolley.z - park.z) > 0.05 || Math.abs(trolley.x - park.x) > 0.06)) { trolley.place(park.x, park.z, Math.PI); T.stopAt = null; }
        else { trolley.x = CX + jx; trolley.updateObb(); }
        return;
      }
      trolley.x = CX + jx;
      const halt = () => { T.v = 0; T.running = false; this.trolleyStopped = true; trolley.updateObb(); };
      // Scripted moments freeze it where it stands (no serving, bubbles or bowling): a dialogue or
      // cutaway, and the intro, outro and fail screen around them. It bowled Stig over in the
      // landning intro and called "Juice, whisky?" over scripted lines.
      const ms = g.missions?.state;
      if (g.inDialog || g.inCutaway || (ms && ms !== 'idle' && ms !== 'running')) return halt();
      if (T.wait > 0) { T.wait -= h; return halt(); }
      if (T.pauseT > 0) { T.pauseT -= h; return halt(); }
      if (T.stopAt === null) { T.stopAt = rowZ(3); T.stopRow = 3; }
      // Wait for anyone (not the player) standing in the aisle just ahead.
      const front = trolley.z - 0.425;
      if (this._someoneAhead(front, g)) return halt();
      // A bowled-over player lying ahead is waited for (never shoved along the aisle), and once
      // he is up he gets a moment to step aside before the next bowl.
      const pl = g.player, pAhead = !g.playerCar && inAisle(pl.x) && trolley.z - pl.z > 0 && trolley.z - pl.z < 2.0;
      if (pAhead && (pl.state === 'down' || pl.state === 'flung')) { T.graceT = 1.2; return halt(); }
      if (T.graceT > 0) { T.graceT -= h; if (pAhead) return halt(); }
      // Serve every three rows.
      if (trolley.z <= T.stopAt) {
        T.pauseT = 3;
        T.serving = true;
        T.serveYaw = Math.random() < 0.5 ? -Math.PI / 2 : Math.PI / 2;
        const row = T.stopRow;
        const k = ROWS.indexOf(row);
        T.stopRow = k >= 0 && ROWS[k + 3] ? ROWS[k + 3] : null;
        T.stopAt = T.stopRow ? rowZ(T.stopRow) : -99;
        if (row === 6 && !this._angerudDone && this._seatedCast(g, 'angerud', '6C')) {
          this._angerudDone = true;
          g.say('angerud', 'Kallar ni det här \'varm middag\'?', 2.8);   // [F*](t)
        } else g.say(pusher, 'Juice, whisky?', 1.6);   // [F*]
        return halt();
      }
      // Gentle P-control on the speed (target 1.1 m/s aft), then the kinematic step.
      T.v = Math.min(1.1, T.v + 1.5 * h);
      this.trolleyStopped = false;
      T.running = true;
      T.serving = false;
      trolley.z -= T.v * h;
      trolley.updateObb();
      if (trolley.z < -15.5) { trolley.place(park.x, park.z, Math.PI); T.wait = 6; T.stopAt = rowZ(3); T.stopRow = 3; T.v = 0; return; }
      // Bowling (invented): a moving trolley knocks over a standing player right in front of it.
      const p = g.player;
      if (T.bowlCd <= 0 && p.state === 'normal' && !g.playerCar && Math.abs(p.x - CX) < 0.75) {
        const dz = trolley.z - p.z;
        if (dz > 0 && dz < 0.95) {
          p.fling(0, 3.0, -2.6);
          fear(FEAR.bowled);
          g.say(pusher, 'Akta tårna!', 1.6);   // [N]
          fx.spill(trolley.x, 1.05, trolley.z - 0.4, C.juice, 8);
          audio.crash?.(0.25);
          this.stats.bowled++;
          g.bumpedT = 0.4;
          T.pauseT = 1.5;
          T.v = 0;
          T.bowlCd = 2;
        }
      }
    },
    _someoneAhead(front, g) {
      for (const k in g.npcs) if (aheadOf(g.npcs[k], front)) return true;
      for (const ch of blockers) if (ch.active && aheadOf(ch, front)) return true;
      for (const w of walkers) if (aheadOf(w.ch, front)) return true;
      return false;
    },
    _seatedCast(g, key, seatId) { const n = g.npcs?.[key]; return !!n && n.state === 'seated' && n.seatId === seatId; },

    stepPusher(dt, g) {
      const T = this._t;
      const serving = T.serving && T.pauseT > 0;
      const yaw = serving ? T.serveYaw : Math.PI;
      pusher.standAt(trolley.x, trolley.z + 0.9, yaw);
      pusher.anim.push = !serving;
      pusher.anim.cupHeld = serving;   // a cup held out to the row (§14.6)
      pusher.sync(dt);
      // "Ra-tara-tara…" [F]: Berra and Robban, at the stewardess, as she passes rows 21-23.
      this._ratataCd -= dt;
      if (this._ratataCd <= 0 && T.running && pusher.z < rowZ(21) + 0.6 && pusher.z > rowZ(23) - 0.6 && !g.inDialog) {
        if (this._seatedCast(g, 'berra', '22C') || this._seatedCast(g, 'robban', '22D')) {
          this._ratataCd = 45;
          g.say('berra', 'Ra-tara-tara…', 2.2);   // [F]
          g.wait?.(0.7).then(() => g.say('robban', 'Ra-tara-tara…', 2.0));   // [F]
        }
      }
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
      // Ole's statistics: in free play or an `oleBarks` stage, never in a dialogue (the timer used to
      // run on through it, so a bark was due the moment every dialogue ended) and never over a line
      // of his own still on screen (it would replace a scripted takeoff line mid-sentence).
      const ole = g.npcs?.ole;
      const ms = g.missions?.state;
      if (ole && ole.state !== 'hidden' && !g.inDialog && (ms === 'idle' || (ms === 'running' && g.missions.stage?.oleBarks)) && dist(ole.x, ole.z, p.x, p.z) < FEAR.oleBarkR) {
        this._oleBarkT -= dt;
        if (this._oleBarkT <= 0 && !g.saying?.(ole)) {
          this._oleBarkT = FEAR.oleBarkEvery;
          g.say(ole, pick(OLE_STATS), 3);
          fear(FEAR.oleBark);
        }
      }
    },

    // Solid bodies the player cannot walk through: stowers, the pusher, aisle walkers. The stowers
    // and the pusher stand firm (the player is pushed out); a walker makes way (he moves).
    stepBlockers(dt, g) {
      const p = g.player;
      const free = p.state === 'normal' && !g.playerCar;
      for (const ch of blockers) {
        if (!ch.active) continue;
        ch.sync(dt);
        ch.bumpCd -= dt;
        if (!free || ch.state !== 'normal') continue;
        if (solidVs(p, ch, true) && ch.bumpCd <= 0) { ch.bumpCd = 2; fear(FEAR.blockerBump); g.say(ch, 'Vänta lite, jag ska bara…', 1.8); }   // [N]
      }
      if (free && this.inCabin(pusher.x, pusher.z)) solidVs(p, pusher, true);
      if (free) for (const w of walkers) if (w.ch.state === 'normal' && w.mode !== 'dodge') solidVs(p, w.ch, false);
    },

    // ---- aisle walkers (§5.12, P1) ----
    _walkersActive(g) { return g.level === 'flight' && this.phase === 'cruise' && !this.seatbelt; },
    _walkerStand(w, evicted) {
      const ch = w.ch, seat = w.seat;
      if (seat) { if (seat.taken === ch.key) seat.taken = null; w.seat = null; }
      ch.seatId = null;
      ch.standAt(seat ? seat.aisle.x : W(0), seat ? seat.aisle.z : ch.z, seat && seat.x > CX ? -Math.PI / 2 : Math.PI / 2);
      if (evicted) { w.mode = 'return'; w.t = 0; }
    },
    _walkerSit(w) {
      // Back to the home seat (or any free unreserved seat near it).
      let seat = w.home.taken ? null : w.home;
      if (!seat) {
        let bd = 1e9;
        for (const id in seats) {
          const s = seats[id];
          if (s.taken || reservedSeat(s.id, s.row, s.letter)) continue;
          const d = Math.abs(s.z - w.ch.z);
          if (d < bd) { bd = d; seat = s; }
        }
      }
      if (!seat) { w.ch.state = 'hidden'; w.mode = 'gone'; return; }
      seat.taken = w.ch.key;
      w.seat = seat;
      w.ch.seatId = seat.id;
      w.ch.seatAt({ x: seat.x, y: seat.y, z: seat.z, yaw: 0 });
      w.mode = 'seated';
      w.t = 20 + w.rnd() * 25;
    },
    // Kinematic walk toward (x, z), along the aisle first. Returns true on arrival.
    _walkTo(ch, x, z, sp, dt) {
      let tx = x, tz = z;
      if (Math.abs(z - ch.z) > 0.3) {
        if (Math.abs(ch.x - CX) > 0.06) { tx = CX; tz = ch.z; }      // into the aisle first
        else if (Math.abs(x - CX) > 0.3) { tx = CX; tz = z; }        // along the aisle, then out
      }
      const dx = tx - ch.x, dz = tz - ch.z, d = Math.hypot(dx, dz);
      if (d < 0.04) {
        ch.x = tx; ch.z = tz; ch.vx = ch.vz = 0;
        return tx === x && tz === z;
      }
      const step = Math.min(d, sp * dt);
      ch.x += (dx / d) * step; ch.z += (dz / d) * step;
      ch.vx = (dx / d) * sp; ch.vz = (dz / d) * sp;
      ch.yaw = dampAngle(ch.yaw, Math.atan2(dx, dz), 10, dt);
      ch.y = FLOOR;
      return false;
    },
    // Something in the aisle ahead of a walker: 'dodge' (player, trolley) | 'wait' (others) | null.
    _walkerBlocked(w, dir, g) {
      const ch = w.ch, p = g.player;
      const ahead = (z, r) => inFront(z, ch.z, dir, r);
      if (p.state === 'normal' && !g.playerCar && inAisle(p.x) && ahead(p.z, 1.5)) return 'player';
      if (inAisle(trolley.x) && (ahead(trolley.z, 2.6) || ahead(pusher.z, 1.6))) return 'trolley';
      for (const v of walkers) {
        if (v === w || v.ch.state !== 'normal' || v.mode === 'dodge' || !inAisle(v.ch.x) || !ahead(v.ch.z, 1.1)) continue;
        if (v.ch.vz * dir > 0.1) { if (ahead(v.ch.z, 0.9)) return 'wait'; continue; }   // same way: follow
        return walkers.indexOf(v) < walkers.indexOf(w) ? 'walker' : 'wait';
      }
      for (const k in g.npcs) { const n = g.npcs[k]; if (n.state === 'normal' && inAisle(n.x) && ahead(n.z, 1.1)) return 'wait'; }
      for (const b of blockers) if (b.active && b.state === 'normal' && inAisle(b.x) && ahead(b.z, 1.1)) return 'wait';
      return null;
    },
    _dodgeSpot(w, dir, g) {
      const ch = w.ch, p = g.player;
      let best = null, bd = 1e9;
      for (const row of ROWS) {
        const z = rowZ(row) + 0.31;
        const rel = (z - ch.z) * dir;
        if (rel > 0.4 || rel < -2.8) continue;
        for (const s of [1, -1]) {
          const seat = seats[`${row}${s > 0 ? 'C' : 'D'}`];
          if (seat.taken && seat.taken !== 'bust') continue;
          const x = W(s * 1.0);
          if (dist(x, z, p.x, p.z) < 0.9) continue;
          if (walkers.some((v) => v !== w && dist(x, z, v.ch.x, v.ch.z) < 0.9)) continue;
          const d = Math.abs(rel) + (s > 0 ? 0 : 0.05);
          if (d < bd) { bd = d; best = { x, z }; }
        }
      }
      return best;
    },
    stepWalkers(dt, g) {
      const active = this._walkersActive(g);
      const p = g.player;
      for (const w of walkers) {
        const ch = w.ch;
        w.sayCd -= dt;
        if (w.mode === 'gone') { if (active) this._walkerSit(w); continue; }
        if (w.mode === 'seated') {
          ch.sync(dt);
          if (!active) continue;
          w.t -= dt;
          if (w.t > 0) continue;
          // Up and off to a galley or a toilet.
          const r = w.rnd();
          w.goal = r < 0.4 ? { kind: 'toilet', side: w.rnd() < 0.5 ? 'L' : 'R' } : r < 0.7 ? { kind: 'galley', x: W(-0.3), z: 12.9, yaw: Math.PI } : { kind: 'galley', x: W(0), z: -16.3, yaw: Math.PI };
          if (w.goal.kind === 'toilet') { const lm = landmarks[w.goal.side === 'L' ? 'toiletBackL' : 'toiletBackR']; Object.assign(w.goal, { x: lm.x, z: lm.z, yaw: lm.yaw }); }
          this._walkerStand(w, false);
          w.mode = 'walk';
          continue;
        }
        if (w.mode === 'toilet') {
          w.t -= dt;
          if (w.t <= 0) {
            this._toilet[w.goal.side] = null;
            ch.standAt(W(0), -14.4, 0);
            w.mode = 'return';
          }
          continue;
        }
        if ((w.mode === 'walk' || w.mode === 'dwell') && !active) w.mode = 'return';
        if (w.mode === 'dwell') {
          ch.vx = ch.vz = 0;
          ch.yaw = dampAngle(ch.yaw, w.goal.yaw, 6, dt);
          w.t -= dt;
          if (w.t <= 0) w.mode = 'return';
          ch.sync(dt);
          continue;
        }
        if (w.mode === 'dodge') {
          const D = w.dodge;
          if (!D.inSpot) { if (this._walkTo(ch, D.x, D.z, 1.2, dt)) D.inSpot = true; }
          else {
            ch.vx = ch.vz = 0;
            ch.yaw = dampAngle(ch.yaw, D.x > CX ? -Math.PI / 2 : Math.PI / 2, 6, dt);
            D.t += dt;
            const pClear = D.why !== 'player' || !(p.state === 'normal' && inAisle(p.x) && Math.abs(p.z - D.z) < 1.8);
            const tClear = D.why !== 'trolley' || ((Math.abs(trolley.z - D.z) > 1.4 && Math.abs(pusher.z - D.z) > 1.0) && !(this._t.running && trolley.z > D.z));
            if ((pClear && tClear && D.t > 1.0) || D.t > 12) { D.back = true; }
          }
          if (D.back && this._walkTo(ch, CX, D.z, 1.0, dt)) { w.mode = D.resume; w.dodge = null; }
          ch.sync(dt);
          continue;
        }
        // walk / return: along the aisle to the goal (galley spot, toilet door, or the seat row).
        let tx, tz;
        if (w.mode === 'walk') { tx = w.goal.x; tz = w.goal.z; }
        else { const s = w.home.taken && w.home.taken !== ch.key ? null : w.home; tx = s ? s.aisle.x : CX; tz = s ? s.aisle.z : ch.z; }
        const dir = Math.sign(tz - ch.z) || 1;
        const why = Math.abs(tz - ch.z) > 0.2 ? this._walkerBlocked(w, dir, g) : null;
        if (why === 'player' || why === 'trolley' || why === 'walker') {
          const spot = this._dodgeSpot(w, dir, g);
          if (spot) {
            w.dodge = { x: spot.x, z: spot.z, why, t: 0, inSpot: false, back: false, resume: w.mode };
            w.mode = 'dodge';
            if (why === 'player' && w.sayCd <= 0 && !g.inDialog) { w.sayCd = 6; g.say(ch, 'Ursäkta!', 1.3); }   // [N]
            ch.sync(dt);
            continue;
          }
        }
        if (why) {
          ch.vx = ch.vz = 0;
          w.waitT += dt;
          if (w.waitT > 6) { w.waitT = 0; ch.z += dir * 1.6; }   // never deadlock: squeeze past
          ch.sync(dt);
          continue;
        }
        w.waitT = 0;
        if (this._walkTo(ch, tx, tz, 0.9, dt)) {
          if (w.mode === 'walk') {
            if (w.goal.kind === 'toilet' && !this._toilet[w.goal.side] && !this._playerNear(g, tx, tz, 0.8)) {
              this._toilet[w.goal.side] = ch.key;
              ch.state = 'hidden';
              ch.root.visible = false;
              w.mode = 'toilet';
              w.t = 5 + w.rnd() * 4;
              audio.door?.();
            } else { w.mode = 'dwell'; w.t = 3 + w.rnd() * 3; }
          } else this._walkerSit(w);
        }
        ch.sync(dt);
      }
    },
    _playerNear(g, x, z, r) { return dist(g.player.x, g.player.z, x, z) < r; },

    stepAmbient(dt, g) {
      const p = g.player;
      // Row 13 does not exist: toast the first time he crosses lz -1.4 going aft.
      if (this._prevPz !== null && !this._row13 && this.inCabin(p.x, p.z) && this._prevPz > -1.4 && p.z <= -1.4) {
        this._row13 = true;
        hud.toast(S.row13);
      }
      this._prevPz = p.z;
      // Smokers at the back (1980): a faint wisp now and then over rows 20-24 in cruise.
      if (this.phase === 'cruise' && !this.seatbelt) {
        this._smokeT -= dt;
        if (this._smokeT <= 0) {
          this._smokeT = 1.2 + Math.random() * 2;
          const row = SMOKING_FROM + ((Math.random() * 5) | 0);
          const L = 'ABCDEF'[(Math.random() * 6) | 0];
          const s = seats[`${row}${L}`];
          if (s?.taken && s.taken !== 'stig') fx.wisp(s.x, 1.45, s.z - 0.05);
        }
      }
      // Toilet lamps (UPPTAGET while someone is locked in).
      if (this._toilet.L === 'stig' && p.state !== 'hidden') this._toilet.L = null;
      if (this._toilet.R === 'stig' && p.state !== 'hidden') this._toilet.R = null;
      toiletLamp.L.material.color.setHex(this._toilet.L ? 0xffffff : 0x4a4a4a);
      toiletLamp.R.material.color.setHex(this._toilet.R ? 0xffffff : 0x4a4a4a);
      // Seated cast idle bubbles: free play only (not in the 1.6 s gap before an outro, where they
      // used to stack over its first line), at most one every 5 s for the whole cabin.
      this._chatCd -= dt;
      if (g.missions?.state === 'idle' && !g.inDialog) {
        for (const key in g.npcs) {
          const n = g.npcs[key];
          if (n.state !== 'seated' || !n.seatId || dist(n.x, n.z, p.x, p.z) > 6) continue;
          n.cabinChatT = (n.cabinChatT ?? 4 + Math.random() * 8) - dt;
          if (n.cabinChatT > 0) continue;
          n.cabinChatT = 12 + Math.random() * 8;
          if (this._chatCd <= 0 && CHATTER_FLIGHT[key]) { this._chatCd = 5; g.say(n, pick(CHATTER_FLIGHT[key]), 2.6); }
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
      use(g) { cabin._excuseBlocker(blockers[k], row, g); },
    });
  });
  const lockIn = (side) => (g) => {
    const p = g.player;
    p.state = 'hidden';
    p.vx = p.vz = 0;
    cabin._toilet[side] = 'stig';
    relieve(FEAR.toilet);
    audio.door?.();
    audio.flush();
    g.wait(4).then(() => { if (p.state === 'hidden') { p.state = 'normal'; p.root.visible = true; } cabin._toilet[side] = null; });
  };
  for (const [id, lm, side, gateOnly] of [['toilet:L', 'toiletBackL', 'L', false], ['toilet:R', 'toiletBackR', 'R', false], ['toilet:gate', 'herrtoa', 'gate', true]]) {
    const l = landmarks[lm];
    game.addInteractable({ id, x: l.x, z: l.z, r: gateOnly ? 1.5 : 1.0, prompt: S.promptLock,
      enabled: () => (gateOnly ? cabin.phase === 'gate' : cabin.phase !== 'gate' && !cabin._toilet[side]), use: lockIn(side) });
  }
  // Galley juice (P1): relieve 30, 30 s cooldown per galley; below mission interactables.
  for (const [which, x, z] of [['front', -0.45, 14.4], ['back', 0, -17.4]]) {
    game.addInteractable({ id: `juice:${which}`, x: W(x), z, r: 1.1, prompt: S.promptJuice, priority: -1,
      enabled: (g) => g.level === 'flight' && cabin.phase !== 'gate' && g.time >= cabin._juiceT[which],
      use: (g) => {
        cabin._juiceT[which] = g.time + FEAR.juiceCooldown;
        relieve(FEAR.juice);
        audio.pickup();
        fx.sparkle(g.player.x, g.player.y + 1.6, g.player.z, C.juice, 8);
      } });
  }

  cabin.setPhase('gate', { instant: true });
  // The walkers start in their seats.
  for (const w of walkers) cabin._walkerSit(w);
  return cabin;
}

// Someone standing in the aisle within 1.2 m ahead of the trolley's front face (it moves -z).
function aheadOf(ch, front) { return ch.state === 'normal' && Math.abs(ch.x - CX) < 0.75 && front - ch.z > 0 && front - ch.z < 1.2; }
// z lies between 0 and r ahead of z0 in direction dir.
function inFront(z, z0, dir, r) { const d = (z - z0) * dir; return d > 0 && d < r; }
// The player against a solid body: `firm` pushes the player out; otherwise the body makes way.
function solidVs(p, ch, firm) {
  const dx = p.x - ch.x, dz = p.z - ch.z, d = Math.hypot(dx, dz), R = p.r + ch.r;
  if (!(d < R && d > 0.001 && Math.abs(p.y - ch.y) < 1.2)) return false;
  if (firm) { p.x += (dx / d) * (R - d); p.z += (dz / d) * (R - d); } else ch.z -= Math.sign(dz || 1) * (R - d);
  return true;
}

// A clock for the bust bob (the cabin has no own clock; the phase timer is fine).
function t3(cabin) { return cabin.phaseT; }

// Merge plain (uv-carrying) plane geometries into one.
function mergePlates(parts) {
  let n = 0, ni = 0;
  for (const g of parts) { n += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = new Uint32Array(ni);
  let o = 0, oi = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i++) idx[oi + i] = ix[i] + o;
    o += g.attributes.position.count;
    oi += ix.length;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return geo;
}
