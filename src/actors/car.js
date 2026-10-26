// Cars: cartoon models with open cabins (so you can see who's driving) and an arcade physics
// model — bicycle steering, lateral grip, handbrake drifts, ramps, rigid-body bumps.

import { THREE, GeoBuilder, toonMesh, MAT, mat, PRIM, textCanvas, toonGradient, outlineGeometry, outlineMat } from '../gfx.js';
import { queryBlocks, obbVsBlock, obbVsObb, groundAt, topAt, RAMP } from '../world/collision.js';
import { clamp, damp, pick } from '../util.js';
import { fx as FX } from '../game/fx.js';

// DESIGN §6.6. Spec flags: tall, bus, bed, icecream, livery ('suntrip' | 'guagua'), guardia, taxi,
// pigs, build (custom geometry: (spec, color) -> { geo, glass, extras? }), noWheels, noSpeedo,
// colors (palette for random colours), wheelInset (wheel centre from the body's end less wheelR,
// default 0.38), and for the golf cart (feature 74, §10.40): toy (a joke car, never a mission's:
// main.enterCar refuses it outside free roam), governed (no pull past maxSpeed), horn ('pip': the
// golf carts' pip-pip instead of the two-tone horn), electric (a hum for the engine), noExplode.
// For the tractor (feature 121, §10.54): wheels (axles [{ z, r, x?, w?, front?, rim?, lugs? }] instead
// of the four equal ones: centre z, radius, half track, tyre width scale, steered, rim colour, tread
// lugs), seat ({ y, x, z, px, pz }: seatY and the driver's and the passenger's spots, car-local), open
// (no roof over the seats: nobody is shrunk), height (the top people stand on and cars meet), wb (the
// steering's wheelbase, default len × 0.62), diesel (a low putt for the engine).
// For the pedal boat (feature 120, §10.57): boat (it skips the 'bound' walls in collideStatic; the sea
// that holds it is game/trampbat.js's, and main.js gives it no engine, skid or horn), coast (the drag
// in m/s² with no pedal down, default 2.2: a boat glides on), horn 'none' (no horn at all).
// For the gas truck (feature 143, §10.65): butano (a steel rack on the bed with BOTTLE_SLOTS' orange
// bottles, each one an instance a jolt can throw off: setBottle; BUTANO on both doors).
// Car fields set by game code: noEnter (never offered to the player), noExplode (damage -> dead +
// steam, no fire; also from the spec), isPursuer, riders[] (decorative busts), locked. Physics
// numbers are Bigmouth's except the ones §6.6 lists.
const SEDAN = { len: 4.5, wid: 1.9, bodyH: 0.62, cabinH: 0.68, wheelR: 0.36, maxSpeed: 31, accel: 12, grip: 9.5, steer: 0.6, mass: 1400, hp: 100, cabin: [-0.3, 0.12] };
const PICKUP = { len: 5.1, wid: 2.0, bodyH: 0.75, cabinH: 0.75, wheelR: 0.42, maxSpeed: 29, accel: 11, grip: 8.6, steer: 0.58, mass: 1900, hp: 130, cabin: [-0.05, 0.2], bed: true };
// aiSteer: an AI-driven bus steers like G's night bus (0.9): at 0.52 it cannot follow a lane path's
// turns and swings into the far kerb; the player's bus keeps 0.52 (Phase 2).
const BUS = { len: 10.5, wid: 2.5, bodyH: 2.2, cabinH: 0, wheelR: 0.5, maxSpeed: 21, accel: 6.5, grip: 7.5, steer: 0.52, aiSteer: 0.9, mass: 7000, hp: 300, tall: true, bus: true };
// The 1979 street: orange, mustard, avocado, brown, beige, white, sky blue, red, bottle green.
const COLORS = [0xd8321e, 0xe07a2a, 0xd8a62a, 0x7a8a3a, 0x7a4a2a, 0xe0d0a8, 0xf4f1e8, 0x8fb3c9, 0x2f5a3a, 0xf0e2b8, 0xa0703a, 0x3a5a8a, 0xf4f1e8, 0xc8b88a];
export const CAR_TYPES = {
  sedan: { name: 'Sedan', ...SEDAN },
  hatch: { name: 'Småbil', len: 3.9, wid: 1.8, bodyH: 0.62, cabinH: 0.7, wheelR: 0.34, maxSpeed: 30, accel: 13, grip: 10.5, steer: 0.64, mass: 1100, hp: 85, cabin: [-0.44, 0.1], hatch: true },
  wagon: { name: 'Kombi', len: 4.9, wid: 1.95, bodyH: 0.62, cabinH: 0.72, wheelR: 0.37, maxSpeed: 30, accel: 11.5, grip: 9.2, steer: 0.6, mass: 1500, hp: 115, cabin: [-0.46, 0.12], wagon: true },
  van: { name: 'Skåpbil', len: 5.0, wid: 2.05, bodyH: 1.5, cabinH: 0, wheelR: 0.38, maxSpeed: 26, accel: 9.5, grip: 8.2, steer: 0.58, mass: 2100, hp: 140, tall: true, colors: [0xf4f1e8, 0xe8dcb8, 0xf0ead8, 0xd8cca0] },
  pickup: { name: 'Flakbil', ...PICKUP },
  bus: { name: 'SunTrip-buss', ...BUS, color: 0xf4f4f0, livery: 'suntrip' },
  guagua: { name: 'Guagua', ...BUS, color: 0x2f8a4a, livery: 'guagua' },
  icecream: { name: 'Glassbil', len: 5.4, wid: 2.1, bodyH: 1.7, cabinH: 0, wheelR: 0.4, maxSpeed: 24, accel: 8.5, grip: 8, steer: 0.56, mass: 2300, hp: 140, color: 0xfafafa, tall: true, icecream: true },
  taxi: { name: 'Taxi', ...SEDAN, color: 0xe8dcb8, taxi: true },
  guardia: { name: 'Guardia Civil', len: 4.2, wid: 1.9, bodyH: 1.45, cabinH: 0, wheelR: 0.4, maxSpeed: 30, accel: 12, grip: 9, steer: 0.58, mass: 2000, hp: 160, color: 0x2e5e3e, tall: true, guardia: true },
  grisbil: { name: 'Grisbilen', ...PICKUP, maxSpeed: 34, accel: 14, color: 0xa8442a, pigs: true },
  // The butanero's gas truck (feature 143, §10.65): a cream flatbed laden with bottles, never in traffic.
  butanero: { name: 'Gasolbilen', ...PICKUP, maxSpeed: 26, accel: 10, mass: 2300, color: 0xf4efe0, butano: true },
  // The golf carts at the clubhouse (feature 74, §10.40): ×1.2 for the player, about 23 km/h.
  golfbil: { name: 'Golfbil', len: 2.4, wid: 1.3, bodyH: 0.45, cabinH: 1.48, wheelR: 0.25, wheelInset: 0.12, maxSpeed: 5.5, accel: 6, grip: 11, steer: 0.75, mass: 450, hp: 80,
    color: 0xf4f4f0, toy: true, governed: true, horn: 'pip', electric: true, noExplode: true, build: buildGolfbil },
  // The tractor at the tomato fields' tool hut (feature 121, §10.54): ×1.2 for the player, 18 km/h. Its
  // length is the tractor and the trailer of tomato boxes together (a fixed trailer: one rigid body).
  traktor: { name: 'Traktor', len: 6.3, wid: 1.9, bodyH: 0.36, cabinH: 0, wheelR: 0.4, maxSpeed: 4.2, accel: 3, grip: 10, steer: 0.62, mass: 2200, hp: 140,
    color: 0xc8281e, toy: true, governed: true, diesel: true, noExplode: true, bed: true, open: true, height: 1.6, wb: 2.4,
    seat: { y: 1.0, x: 0, z: 0.5, px: -0.36, pz: -0.95 },
    wheels: [{ z: 2.5, r: 0.34, x: 0.62, w: 0.26, front: true, rim: 0xf2c12e }, { z: 0.7, r: 0.64, x: 0.72, w: 0.56, rim: 0xf2c12e, lugs: true }, { z: -2.1, r: 0.34, x: 0.84, w: 0.28 }],
    build: buildTraktor },
  // The pedal boat from the PATINES rental on the beach (feature 120, §10.57): ×1.2 for the player, 7 km/h.
  // Low grip, so it glides out in the turns; only ever on the sea (game/trampbat.js).
  trampbat: { name: 'Trampbåt', len: 3.3, wid: 2.1, bodyH: 0.6, cabinH: 0, wheelR: 0.32, maxSpeed: 1.65, accel: 1.4, grip: 2.4, steer: 0.7, mass: 260, hp: 400,
    color: 0x1e9aa0, toy: true, boat: true, governed: true, open: true, noWheels: true, noExplode: true, horn: 'none', coast: 0.45, height: 1.0, wb: 2.0,
    seat: { y: 0.93, x: 0.36, z: 0.2, px: -0.36, pz: 0.2 },
    build: buildTrampbat },
};
export function registerCarType(key, spec) { CAR_TYPES[key] = spec; }

// The player's car runs at x1.2 (binding user decision 2026-10-04, DESIGN §6.6): top speed and pull,
// reverse and brake impulses x1.2, drag /1.2. Every drive timer is calibrated against it (§8).
export const PLAYER_BOOST = 1.2;

const INK = 0x1d1426, TRIM = 0x2a2a30, CHROME = 0xd8dce0, TYRE = 0x1d1d22;
function shade(c, k) { const col = new THREE.Color(c); col.multiplyScalar(k); return col.getHex(); }

// Painted text (liveries, signs): one shared texture + geometry per text, lit like the cars.
const _txt = {};
function textPlane(text, w, h, opts = {}) {
  const key = `${text}|${w}|${h}|${opts.bg}|${opts.fg}|${opts.border}`;
  let c = _txt[key];
  if (!c) {
    const tex = new THREE.CanvasTexture(textCanvas(text, w, h, { border: null, bg: null, scale: 0.78, ...opts }));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    c = _txt[key] = { geo: new THREE.PlaneGeometry(w, h), mat: new THREE.MeshToonMaterial({ map: tex, gradientMap: toonGradient(), transparent: !opts.bg, alphaTest: opts.bg ? 0 : 0.05 }) };
  }
  return new THREE.Mesh(c.geo, c.mat);
}
// Put a text plane on the car: side = +1 (left, +x), -1 (right, -x), 'front', 'rear'.
function decal(ctx, text, w, h, side, y, z, opts, x = null) {
  const p = textPlane(text, w, h, opts);
  if (side === 'front') { p.position.set(x ?? 0, y, z); }
  else if (side === 'rear') { p.position.set(x ?? 0, y, z); p.rotation.y = Math.PI; }
  else { p.position.set(side * (ctx.W / 2 + 0.025), y, z); p.rotation.y = side * Math.PI / 2; }
  ctx.extras.push(p);
  return p;
}

// Round headlight facing +z (or -z), with a chrome rim.
function lamp(g, x, y, z, r, col, dir = 1) {
  g.cyl(CHROME, x, y, z, r * 1.2, 0.06, 12, Math.PI / 2);
  g.cyl(col, x, y, z + dir * 0.03, r, 0.04, 12, Math.PI / 2);
}
// Bumpers, lights, grille and plates for a body of length L, width W, bumper height yb.
function ends(ctx, { yb, lampY, round = true, grille = true, lampR = 0.15, front = ctx.L / 2, rear = -ctx.L / 2 }) {
  const { g, W } = ctx;
  g.box(CHROME, 0, yb, front + 0.06, W + 0.06, 0.16, 0.14);
  g.box(CHROME, 0, yb, rear - 0.06, W + 0.06, 0.16, 0.14);
  for (const sx of [-1, 1]) {
    if (round) lamp(g, sx * (W / 2 - 0.3), lampY, front + 0.01, lampR, 0xfff6c0);
    else { g.box(CHROME, sx * (W / 2 - 0.32), lampY, front + 0.01, 0.42, 0.26, 0.04); g.box(0xfff6c0, sx * (W / 2 - 0.32), lampY, front + 0.03, 0.34, 0.18, 0.04); }
    g.box(0xf0901e, sx * (W / 2 - 0.12), yb + 0.14, front + 0.02, 0.12, 0.08, 0.04);
    g.box(0xe8322a, sx * (W / 2 - 0.22), lampY, rear - 0.02, 0.3, 0.18, 0.04);
    g.box(0xf0901e, sx * (W / 2 - 0.22), lampY - 0.13, rear - 0.02, 0.3, 0.07, 0.04);
  }
  if (grille) {
    g.box(TRIM, 0, lampY, front + 0.02, W * 0.42, 0.24, 0.04);
    for (let k = 0; k < 3; k++) g.box(CHROME, 0, lampY - 0.08 + k * 0.08, front + 0.04, W * 0.4, 0.02, 0.02);
  }
  // Number plates (white, a dark band where the letters go).
  g.box(0xf4f4f0, 0, yb + 0.14, front + 0.13, 0.5, 0.12, 0.02);
  g.box(INK, 0, yb + 0.14, front + 0.145, 0.38, 0.05, 0.01);
  g.box(0xf4f4f0, 0, yb + 0.16, rear - 0.13, 0.5, 0.12, 0.02);
  g.box(INK, 0, yb + 0.16, rear - 0.145, 0.38, 0.05, 0.01);
}
// Dark wheel-arch shadows on the body sides.
function arches(ctx, inset = 0.38) {
  const { g, s, W, L } = ctx;
  const wz = L / 2 - s.wheelR - (s.bus ? 1.2 : inset);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.cyl(TRIM, sx * (W / 2 + 0.006), s.wheelR, sz * wz, s.wheelR * 1.18, 0.03, 16, 0, 0, Math.PI / 2);
}

// ---------------------------------------------------------------------------------------------
// Bodies

// Saloon, hatchback, estate, taxi, pickup: a low body with an open cabin of pillars under a roof.
function carBody(ctx) {
  const { g, glass, s, color, L, W, y0, top } = ctx;
  const dark = shade(color, 0.7);
  g.boxB(color, 0, y0, 0, W, s.bodyH, L);
  // Bonnet and boot lids, a chrome waist line, door seams.
  g.boxB(shade(color, 1.08), 0, top - 0.02, L * 0.3, W - 0.12, 0.05, L * 0.36);
  for (const sx of [-1, 1]) {
    g.box(CHROME, sx * (W / 2 + 0.01), y0 + s.bodyH * 0.62, 0, 0.02, 0.04, L * 0.86);
    g.box(dark, sx * (W / 2 + 0.008), y0 + s.bodyH * 0.45, s.bed ? L * 0.12 : -L * 0.04, 0.012, s.bodyH * 0.7, 0.03);
    g.box(dark, sx * (W / 2 + 0.008), y0 + s.bodyH * 0.72, (s.bed ? L * 0.06 : -L * 0.12), 0.015, 0.03, 0.18);
  }
  arches(ctx);
  const [c0, c1] = s.cabin;
  const z0 = c0 * L, z1 = c1 * L, ch = s.cabinH, ct = top + ch;
  const pil = 0.12;
  for (const sx of [-1, 1]) {
    g.box(dark, sx * (W / 2 - pil / 2 - 0.02), top + ch / 2, z1 - 0.12, pil, ch * 1.05, pil, 0, -0.35);
    // Rear pillar: the hatch slopes, the estate's stands upright, the saloon's leans.
    g.box(dark, sx * (W / 2 - pil / 2 - 0.02), top + ch / 2, z0 + 0.1, pil * (s.wagon ? 1.2 : 1.6), ch, pil * 1.6, 0, s.hatch ? 0.35 : s.wagon ? 0 : 0.2);
    if (s.wagon) g.box(dark, sx * (W / 2 - pil / 2 - 0.02), top + ch / 2, (z0 + z1) / 2 - 0.25, pil, ch, pil);
  }
  g.boxB(shade(color, 0.92), 0, ct, (z0 + z1) / 2 - 0.05, W - 0.06, 0.13, z1 - z0 + 0.15);
  if (s.wagon) g.boxB(CHROME, 0, ct + 0.13, (z0 + z1) / 2 - 0.1, W * 0.8, 0.04, (z1 - z0) * 0.8);
  glass.box(0xffffff, 0, top + ch / 2, z1 - 0.15, W - 0.3, ch * 1.02, 0.05, 0, -0.35);
  glass.box(0xffffff, 0, top + ch / 2, z0 + 0.12, W - 0.3, ch * 0.95, 0.05, 0, s.hatch ? 0.4 : 0.2);
  if (s.bed) {
    for (const sx of [-1, 1]) g.boxB(color, sx * (W / 2 - 0.06), top, -L * 0.28, 0.12, 0.4, L * 0.42);
    g.boxB(color, 0, top, -L / 2 + 0.06, W, 0.4, 0.12);
    g.boxB(0x5a4a3a, 0, top - 0.02, -L * 0.28, W - 0.2, 0.03, L * 0.42);
    for (let k = 0; k < 5; k++) g.box(0x4a3a2a, 0, top + 0.02, -L * 0.48 + k * L * 0.1, W - 0.22, 0.02, 0.05);
  }
  // Seats and a steering wheel (driver sits on the car's left, +x).
  for (const sx of [-1, 1]) {
    g.boxB(0x5a3a2a, sx * W * 0.22, top - 0.25, -0.1, 0.55, 0.25, 0.6);
    g.box(0x5a3a2a, sx * W * 0.22, top + 0.15, -0.42, 0.55, 0.7, 0.14, 0, -0.15);
  }
  g.add(PRIM.torus(), TYRE, mat(W * 0.22, top + 0.25, z1 - 0.55, -0.9, 0, 0, 0.42, 0.42, 0.42));
  g.box(TRIM, 0, top + 0.05, z1 - 0.3, W - 0.2, 0.2, 0.3);
  ends(ctx, { yb: y0 + 0.02, lampY: y0 + s.bodyH * 0.6, round: !s.bed, lampR: s.hatch ? 0.14 : 0.13 });
}

// Vans and the ice-cream van: an open cab up front (pillars + roof), a box behind it.
function vanBody(ctx, { cabLen = 2.2 } = {}) {
  const { g, glass, s, color, L, W, y0, top } = ctx;
  const dark = shade(color, 0.7), belt = y0 + 0.78;
  const cz = L / 2 - cabLen;                       // where the cab meets the box
  g.boxB(color, 0, y0, (cz - L / 2) / 2, W, s.bodyH, cz + L / 2);
  // Cab: lower body, a short sloping bonnet, pillars, roof.
  g.boxB(color, 0, y0, (cz + L / 2) / 2, W, belt - y0, L / 2 - cz);
  g.box(shade(color, 1.06), 0, belt + 0.06, L / 2 - 0.3, W - 0.08, 0.16, 0.6, 0, 0.35);
  for (const sx of [-1, 1]) {
    g.box(dark, sx * (W / 2 - 0.07), (belt + top) / 2, L / 2 - 0.62, 0.12, top - belt, 0.12, 0, -0.3);
    g.box(dark, sx * (W / 2 - 0.07), (belt + top) / 2, cz + 0.06, 0.12, top - belt, 0.12);
    g.box(CHROME, sx * (W / 2 + 0.06), belt + 0.18, L / 2 - 0.85, 0.08, 0.16, 0.06);   // wing mirrors
  }
  g.boxB(color, 0, top - 0.12, (cz + L / 2 - 0.5) / 2, W, 0.12, L / 2 - 0.5 - cz);
  glass.box(0xffffff, 0, (belt + top) / 2, L / 2 - 0.6, W - 0.2, top - belt, 0.05, 0, -0.3);
  // Seats, wheel, dashboard.
  for (const sx of [-1, 1]) g.boxB(0x5a3a2a, sx * W * 0.22, y0 + 0.1, cz + 0.55, 0.6, 0.28, 0.55);
  g.box(TRIM, 0, belt - 0.05, L / 2 - 0.7, W - 0.2, 0.18, 0.3);
  g.add(PRIM.torus(), TYRE, mat(W * 0.22, belt + 0.1, L / 2 - 1.0, -0.6, 0, 0, 0.42, 0.42, 0.42));
  // Side windows on the box (painted) and a seam.
  if (!s.icecream) for (const sx of [-1, 1]) g.box(0x2a3a4a, sx * (W / 2 + 0.01), top - 0.5, cz - 0.9, 0.03, 0.5, 1.1);
  g.box(dark, 0, y0 + s.bodyH * 0.5, -L / 2 - 0.01, 0.03, s.bodyH * 0.9, 0.02);
  arches(ctx);
  ends(ctx, { yb: y0 + 0.02, lampY: y0 + 0.42, round: true, lampR: 0.14 });
}

// Guardia Civil Land Rover: flat bonnet with the spare wheel, an upright windscreen, open sides,
// white hard top with a blue lamp, a white door band with the lettering.
function guardiaBody(ctx) {
  const { g, glass, s, color, L, W, y0, top } = ctx;
  const belt = y0 + 0.78, bonnet = y0 + 0.86, wsz = L / 2 - 1.15;
  g.boxB(color, 0, y0, 0, W, belt - y0, L);
  g.boxB(color, 0, belt, (wsz + L / 2) / 2, W - 0.1, bonnet - belt, L / 2 - wsz);
  g.box(shade(color, 0.85), 0, bonnet + 0.01, (wsz + L / 2) / 2 + 0.05, W - 0.5, 0.02, L / 2 - wsz - 0.3);
  // Spare wheel on the bonnet.
  g.cyl(TYRE, 0, bonnet + 0.1, L / 2 - 0.62, 0.34, 0.2, 16);
  g.cyl(0xc8ccd2, 0, bonnet + 0.2, L / 2 - 0.62, 0.17, 0.02, 12);
  // Upright windscreen frame, pillars, white roof.
  for (const sx of [-1, 1]) {
    g.box(color, sx * (W / 2 - 0.06), (bonnet + top) / 2, wsz, 0.1, top - bonnet, 0.1);
    g.box(color, sx * (W / 2 - 0.06), (belt + top) / 2, -0.55, 0.1, top - belt, 0.12);
    g.box(color, sx * (W / 2 - 0.06), (belt + top) / 2, -L / 2 + 0.08, 0.1, top - belt, 0.14);
    g.box(CHROME, sx * (W / 2 + 0.07), bonnet + 0.12, wsz + 0.05, 0.07, 0.14, 0.05);
  }
  g.box(color, 0, top - 0.03, wsz, W - 0.1, 0.06, 0.1);
  g.box(color, 0, bonnet + 0.02, wsz, W - 0.1, 0.06, 0.1);
  g.boxB(0xf4f4f0, 0, top - 0.04, (wsz - L / 2) / 2 - 0.02, W + 0.02, 0.1, wsz + L / 2 + 0.1);
  g.boxB(0xf4f4f0, 0, top + 0.06, (wsz - L / 2) / 2 - 0.02, W - 0.3, 0.05, wsz + L / 2 - 0.3);
  // Blue lamp on a bar.
  g.box(TRIM, 0, top + 0.13, wsz - 0.35, 0.7, 0.06, 0.18);
  g.cyl(0x2f6ad8, 0, top + 0.25, wsz - 0.35, 0.12, 0.2, 12);
  g.sphere(0x8ab8ff, 0, top + 0.36, wsz - 0.35, 0.16, 0.08, 0.16);
  glass.box(0xffffff, 0, (bonnet + top) / 2, wsz, W - 0.24, top - bonnet - 0.08, 0.04);
  // Rear tub: a rear window and a back door with a step.
  g.box(TRIM, 0, (belt + top) / 2 + 0.05, -L / 2 - 0.01, W * 0.5, (top - belt) * 0.6, 0.02);
  g.box(TRIM, 0, y0 + 0.08, -L / 2 - 0.12, 0.6, 0.06, 0.24);
  // White door band (painted lettering on it).
  for (const sx of [-1, 1]) g.box(0xf4f4f0, sx * (W / 2 + 0.008), y0 + 0.5, -0.1, 0.012, 0.3, L * 0.62);
  for (const sx of [-1, 1]) decal(ctx, 'GUARDIA CIVIL', L * 0.6, 0.26, sx, y0 + 0.5, -0.1, { fg: '#1f4a2c' });
  // Seats and wheel.
  for (const sx of [-1, 1]) g.boxB(0x3a2a22, sx * W * 0.22, y0 + 0.12, 0.3, 0.55, 0.3, 0.55);
  g.boxB(0x3a2a22, 0, y0 + 0.12, -1.3, W - 0.3, 0.3, 0.8);
  g.add(PRIM.torus(), TYRE, mat(W * 0.22, belt + 0.15, wsz - 0.35, -0.5, 0, 0, 0.4, 0.4, 0.4));
  g.box(TRIM, 0, bonnet - 0.06, wsz - 0.15, W - 0.2, 0.14, 0.24);
  // Square grille between round lamps; a black bumper with a winch.
  arches(ctx);
  g.box(0x1d1d22, 0, y0 + 0.02, L / 2 + 0.06, W + 0.08, 0.18, 0.16);
  g.box(0xd8dce0, 0, y0 + 0.5, L / 2 + 0.01, W * 0.4, 0.42, 0.04);
  for (let k = 0; k < 4; k++) g.box(TRIM, 0, y0 + 0.36 + k * 0.09, L / 2 + 0.03, W * 0.36, 0.035, 0.03);
  for (const sx of [-1, 1]) {
    lamp(g, sx * (W / 2 - 0.3), y0 + 0.55, L / 2 + 0.01, 0.13, 0xfff6c0);
    g.box(0xe8322a, sx * (W / 2 - 0.15), y0 + 0.62, -L / 2 - 0.02, 0.12, 0.2, 0.04);
  }
  g.box(0x1d1d22, 0, y0 + 0.02, -L / 2 - 0.06, W + 0.08, 0.18, 0.12);
  g.box(0xf4f4f0, 0, y0 + 0.18, L / 2 + 0.09, 0.5, 0.12, 0.02);
}

// Buses: a lower body, an open window band with glass and seat backs, a roof; the driver sits in
// an open cab behind the windscreen. Liveries: SunTrip (white, orange/yellow bands, the sun, "17"),
// guagua (green and cream).
function busBody(ctx) {
  const { g, glass, s, color, L, W, y0, top } = ctx;
  const sill = y0 + 1.12, roofY = top - 0.22, fz = L / 2;
  const accent = s.livery === 'guagua' ? 0xf0e2b8 : 0xf4f4f0;
  g.boxB(color, 0, y0, 0, W, sill - y0, L);
  g.boxB(color, 0, roofY, 0, W, top - roofY, L);
  g.boxB(shade(color, 0.94), 0, top, -0.4, W - 0.3, 0.1, L - 1.6);
  for (const z of [-2.6, 1.2]) g.boxB(shade(color, 0.85), 0, top + 0.06, z, 0.8, 0.08, 0.8);
  // Window pillars (between the panes) along both sides; the rear is solid.
  const nWin = 7, z0 = -L / 2 + 0.25, z1 = fz - 2.2, pitch = (z1 - z0) / nWin;
  for (const sx of [-1, 1]) {
    for (let k = 0; k <= nWin; k++) g.box(accent === 0xf4f4f0 ? color : accent, sx * (W / 2 - 0.05), (sill + roofY) / 2, z0 + k * pitch, 0.1, roofY - sill, 0.16);
    glass.box(0xffffff, sx * (W / 2 - 0.04), (sill + roofY) / 2, (z0 + z1) / 2, 0.03, roofY - sill - 0.04, z1 - z0);
  }
  g.boxB(color, 0, sill, -L / 2 + 0.1, W, roofY - sill, 0.2);
  g.box(TRIM, 0, (sill + roofY) / 2, -L / 2 - 0.01, W * 0.7, (roofY - sill) * 0.7, 0.02);
  // Inside: a floor under the seats (car.seatY() is y0 + 0.55) and rows of orange seat backs whose
  // tops show in the windows.
  g.boxB(0x5a4a3a, 0, y0 + 0.47, -0.6, W - 0.2, 0.05, L - 2.4);
  for (let k = 0; k < nWin; k++) for (const sx of [-1, 1]) g.boxB(0xd2601f, sx * (W / 2 - 0.55), y0 + 0.52, z0 + (k + 0.6) * pitch, 0.8, 0.85, 0.14);
  // Cab: pillars, dashboard, steering wheel, the big windscreen; the door on the right (-x).
  for (const sx of [-1, 1]) g.box(color, sx * (W / 2 - 0.08), (sill + roofY) / 2, fz - 0.1, 0.16, roofY - sill, 0.2);
  g.box(TRIM, 0, sill + 0.05, fz - 0.4, W - 0.2, 0.25, 0.5);
  g.add(PRIM.torus(), TYRE, mat(W * 0.22, sill, fz - 1.0, -0.9, 0, 0, 0.55, 0.55, 0.55));
  glass.box(0xffffff, 0, (sill + roofY) / 2 + 0.02, fz - 0.08, W - 0.3, roofY - sill + 0.05, 0.04, 0, -0.06);
  glass.box(0xffffff, -(W / 2 + 0.005), (y0 + roofY) / 2 + 0.2, fz - 1.3, 0.03, roofY - y0 - 0.3, 0.9);
  g.box(TRIM, -(W / 2 + 0.01), (y0 + sill) / 2 + 0.05, fz - 1.3, 0.02, sill - y0 - 0.2, 0.9);
  for (const sx of [-1, 1]) g.box(CHROME, sx * (W / 2 + 0.25), roofY - 0.25, fz - 0.15, 0.06, 0.4, 0.12);
  for (const sx of [-1, 1]) g.box(TRIM, sx * (W / 2 + 0.15), roofY - 0.05, fz - 0.15, 0.3, 0.04, 0.04);
  // Destination box above the windscreen.
  g.box(INK, 0, roofY + 0.1, fz + 0.01, W * 0.7, 0.26, 0.04);
  arches(ctx);
  // Bumpers and lights.
  g.box(CHROME, 0, y0 + 0.02, fz + 0.06, W + 0.04, 0.22, 0.14);
  g.box(CHROME, 0, y0 + 0.02, -fz - 0.06, W + 0.04, 0.22, 0.14);
  for (const sx of [-1, 1]) {
    lamp(g, sx * (W / 2 - 0.35), y0 + 0.4, fz + 0.01, 0.15, 0xfff6c0);
    g.box(0xe8322a, sx * (W / 2 - 0.25), y0 + 0.55, -fz - 0.02, 0.24, 0.32, 0.04);
  }
  g.box(TRIM, 0, y0 + 0.5, -fz - 0.02, W * 0.5, 0.36, 0.03);
  g.box(0xf4f4f0, 0, y0 + 0.2, fz + 0.14, 0.5, 0.12, 0.02);
  if (s.livery === 'suntrip') {
    // Yellow and orange bands round the bus; on both sides the sun and the name; "17" up front.
    for (const [c, y, h] of [[0xf7c31b, y0 + 0.3, 0.14], [0xf07a1e, y0 + 0.48, 0.2]]) {
      for (const sx of [-1, 1]) g.box(c, sx * (W / 2 + 0.006), y, 0, 0.012, h, L - 0.1);
      g.box(c, 0, y, fz + 0.006, W - 0.1, h, 0.012);
      g.box(c, 0, y, -fz - 0.006, W - 0.1, h, 0.012);
    }
    for (const sx of [-1, 1]) {
      // Read in order (sun, then name) from either side: the +x side reads front to rear.
      const sy = y0 + 0.86, sz = -1.0 + sx * 1.6;
      g.cyl(0xf7c31b, sx * (W / 2 + 0.02), sy, sz, 0.22, 0.03, 16, 0, 0, Math.PI / 2);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; g.box(0xf07a1e, sx * (W / 2 + 0.014), sy + Math.sin(a) * 0.32, sz + Math.cos(a) * 0.32, 0.012, 0.07, 0.12, 0, a + Math.PI / 2); }
      decal(ctx, 'SunTrip', 3.0, 0.52, sx, sy, sz - sx * 2.02, { fg: '#d8321e' });
    }
    decal(ctx, '17', 0.6, 0.24, 'front', roofY + 0.1, fz + 0.04, { fg: '#f7c31b' });
    decal(ctx, 'SunTrip', 1.2, 0.3, 'rear', y0 + 0.95, -fz - 0.03, { fg: '#d8321e' });
  } else if (s.livery === 'guagua') {
    for (const sx of [-1, 1]) g.box(0xf0e2b8, sx * (W / 2 + 0.006), y0 + 0.7, 0, 0.012, 0.3, L - 0.1);
    g.box(0xf0e2b8, 0, y0 + 0.7, fz + 0.006, W - 0.1, 0.3, 0.012);
    decal(ctx, 'GUAGUA', 1.4, 0.24, 'front', roofY + 0.1, fz + 0.04, { fg: '#f0e2b8' });
    for (const sx of [-1, 1]) decal(ctx, 'GUAGUA', 1.6, 0.26, sx, y0 + 0.7, 0, { fg: '#2f8a4a' });
  }
}

// ---------------------------------------------------------------------------------------------
// Dressing

// The grisbil's slatted rack and three pink pigs in the bed.
function pigBody(g, x, y, z, ry, s = 1, head = true) {
  const P = 0xf4a8b8, D = 0xe0889a;
  const c = Math.cos(ry), sn = Math.sin(ry);
  const at = (lx, lz) => [x + lx * c + lz * sn, z - lx * sn + lz * c];
  g.sphere(P, x, y + 0.36 * s, z, 0.62 * s, 0.5 * s, 0.9 * s, 0, ry);
  for (const [lx, lz] of [[-0.15, 0.25], [0.15, 0.25], [-0.15, -0.25], [0.15, -0.25]]) { const [px, pz] = at(lx * s, lz * s); g.cyl(D, px, y + 0.1 * s, pz, 0.06 * s, 0.22 * s, 6); }
  if (head) {
    const [hx, hz] = at(0, 0.44 * s);
    g.sphere(P, hx, y + 0.46 * s, hz, 0.42 * s, 0.38 * s, 0.38 * s);
    const [nx, nz] = at(0, 0.64 * s);
    g.cyl(D, nx, y + 0.42 * s, nz, 0.1 * s, 0.08 * s, 10, Math.PI / 2, ry);
    for (const sx of [-1, 1]) {
      const [ex, ez] = at(sx * 0.13 * s, 0.4 * s);
      g.cone(D, ex, y + 0.66 * s, ez, 0.07 * s, 0.16 * s, 4, 0.3, ry, sx * -0.4);
      const [ix, iz] = at(sx * 0.09 * s, 0.6 * s);
      g.sphere(INK, ix, y + 0.52 * s, iz, 0.05 * s);
    }
  }
  const [tx, tz] = at(0, -0.46 * s);
  g.add(PRIM.torus(), D, mat(tx, y + 0.42 * s, tz, 0, ry + Math.PI / 2, 0, 0.12 * s, 0.12 * s, 0.12 * s));
}
function pigsIn(ctx) {
  const { g, L, W, top } = ctx;
  const bz0 = -L / 2 + 0.1, bz1 = -L * 0.07, wood = 0x8a5a32;
  // Slatted rack round the bed. The pigs in it are their own meshes (Car.pigs, PIG_SLOTS).
  for (let k = 0; k <= 5; k++) for (const sx of [-1, 1]) g.box(wood, sx * (W / 2 - 0.06), top + 0.55, bz0 + (k / 5) * (bz1 - bz0), 0.07, 1.1, 0.07);
  for (const y of [0.55, 0.85, 1.08]) {
    for (const sx of [-1, 1]) g.box(wood, sx * (W / 2 - 0.04), top + y, (bz0 + bz1) / 2, 0.05, 0.07, bz1 - bz0);
    g.box(wood, 0, top + y, bz0, W - 0.08, 0.07, 0.05);
  }
}
// The three pigs in the bed, each its own mesh so one can tumble off and be put back (free roam,
// DESIGN §10.15): [x, z / len, yaw, scale], car-local on the bed floor. One at the front and two at
// the back of the bed, leaving the middle (z = -0.3 L, the 'bed' rider slots of main.addRider) free
// for hitch-hikers. The back two stand across the bed, snout to snout and a little apart, wholly
// inside the rack (facing aft at -0.42 L their heads and snouts stuck ~0.2 m out over the tailgate).
export const PIG_SLOTS = [[0.05, -0.15, Math.PI / 2 + 0.15, 0.85], [-0.47, -0.41, Math.PI / 2 - 0.12, 0.72], [0.47, -0.425, -Math.PI / 2 - 0.12, 0.72]];
// A pig mesh of scale s (feet at y 0, snout along +z), outlined; built once per scale and cloned
// (geometry shared). The loose pigs of game/pigTruck.js are the same meshes.
const _pigMesh = {};
export function pigMesh(s) {
  if (!_pigMesh[s]) {
    const g = new GeoBuilder();
    pigBody(g, 0, 0, 0, 0, s);
    _pigMesh[s] = toonMesh(g.build(), { outline: 0.035 });
  }
  return _pigMesh[s].clone();
}

// The gas truck's dressing (feature 143, §10.65): an orange band along the sides, BUTANO on both doors
// (no maker's name or mark, §1.5), and a steel rack round the bed that holds the bottles upright: corner
// posts, two rails a side, one across behind the cab and one over the tailgate.
const BUTANO_C = 0xf07a1e, RACK = 0x8a8f99;
function butanoRack(ctx) {
  const { g, s, L, W, y0, top } = ctx;
  const z0 = -L / 2 + 0.12, z1 = -L * 0.07 - 0.04, zm = (z0 + z1) / 2;
  for (const sx of [-1, 1]) {
    g.box(BUTANO_C, sx * (W / 2 + 0.006), y0 + s.bodyH * 0.18, 0, 0.012, 0.12, L - 0.12);
    decal(ctx, 'BUTANO', 0.76, 0.2, sx, y0 + s.bodyH * 0.44, 0.12, { fg: '#f07a1e' });
    for (const z of [z0, z1]) g.box(RACK, sx * (W / 2 - 0.08), top + 0.48, z, 0.06, 0.96, 0.06);
    for (const y of [0.5, 0.92]) g.box(RACK, sx * (W / 2 - 0.08), top + y, zm, 0.05, 0.05, z1 - z0);
  }
  for (const z of [z0, z1]) g.box(RACK, 0, top + 0.92, z, W - 0.16, 0.05, 0.05);
  g.box(RACK, 0, top + 0.5, z1, W - 0.16, 0.05, 0.05);
}
// The bottles on the bed: [x, z] car-local on the bed floor, three across and four deep. Back to front,
// so a jolt throws the tailgate's row off first (game/butano.js).
export const BOTTLE_SLOTS = [];
for (const z of [-2.14, -1.64, -1.14, -0.64]) for (const x of [-0.55, 0, 0.55]) BOTTLE_SLOTS.push([x, z]);
// An orange butano bottle (the prop's shape, props.js `butano`, at `s`): the foot ring, the body, its
// dome, the collar, the valve and its cap; the origin on the ground under it.
export function butanoBottle(g, s = 1, y = 0) {
  g.cyl(0xc85a10, 0, y + 0.03 * s, 0, 0.19 * s, 0.06 * s, 14);
  g.cyl(BUTANO_C, 0, y + 0.36 * s, 0, 0.2 * s, 0.6 * s, 14);
  g.sphere(BUTANO_C, 0, y + 0.66 * s, 0, 0.4 * s, 0.24 * s, 0.4 * s);
  g.cyl(0xc85a10, 0, y + 0.76 * s, 0, 0.15 * s, 0.05 * s, 10);
  g.cyl(0x9a9a9a, 0, y + 0.79 * s, 0, 0.05 * s, 0.08 * s, 8);
  g.cyl(INK, 0, y + 0.84 * s, 0, 0.06 * s, 0.03 * s, 8);
}
export const BOTTLE_S = 0.92;
let _bottleGeo = null;
export function bottleGeo() {
  if (!_bottleGeo) { const g = new GeoBuilder(); butanoBottle(g, BOTTLE_S); _bottleGeo = g.build(); }
  return _bottleGeo;
}

function taxiSign(ctx) {
  const { g, s, L, W, top } = ctx;
  const [c0, c1] = s.cabin, rz = ((c0 + c1) / 2) * L - 0.05, ry = top + s.cabinH + 0.13;
  g.boxB(0xf4f4f0, 0, ry, rz, 0.7, 0.24, 0.32);
  g.boxB(INK, 0, ry - 0.01, rz, 0.74, 0.04, 0.36);
  g.sphere(0x3fd04a, 0.42, ry + 0.08, rz + 0.05, 0.16);
  decal(ctx, 'TAXI', 0.6, 0.18, 'front', ry + 0.13, rz + 0.17, { fg: '#1d1426' });
  decal(ctx, 'TAXI', 0.6, 0.18, 'rear', ry + 0.13, rz - 0.17, { fg: '#1d1426' });
  decal(ctx, 'LIBRE', 0.28, 0.1, 'front', ry + 0.08, rz + 0.18, { fg: '#2a8a2a', bg: '#d8ffd0' }, 0.42);
  // A thin red line along the doors.
  for (const sx of [-1, 1]) g.box(0xc8202a, sx * (W / 2 + 0.012), ctx.y0 + s.bodyH * 0.35, 0, 0.012, 0.06, L * 0.8);
}

function icecreamDress(ctx) {
  const { g, L, W, y0, top } = ctx;
  const cz = L / 2 - 2.2;
  // Pink waves round the box, a serving hatch with an awning on the kerb side (right, -x).
  for (const sx of [-1, 1]) g.box(0xff8ab8, sx * (W / 2 + 0.008), y0 + 0.55, 0, 0.012, 0.28, L - 0.1);
  for (let k = 0; k < 7; k++) for (const sx of [-1, 1]) g.sphere(0xff8ab8, sx * (W / 2 + 0.006), y0 + 0.72, -L / 2 + 0.4 + k * 0.48, 0.02, 0.24, 0.42);
  g.box(0x2a3a4a, -(W / 2 + 0.01), top - 0.7, cz - 1.3, 0.03, 0.62, 1.5);
  g.box(0xd8dce0, -(W / 2 + 0.15), top - 1.03, cz - 1.3, 0.3, 0.05, 1.5);
  for (let k = 0; k < 6; k++) g.box(k % 2 ? 0xffffff : 0xff6aa0, -(W / 2 + 0.28), top - 0.27, cz - 1.3 - 0.625 + k * 0.25, 0.56, 0.05, 0.25, 0, 0, -0.35);
  // The giant cone on the roof.
  const rz = cz - 1.0;
  g.cone(0xe8b878, 0, top + 0.55, rz, 0.38, 1.0, 10, Math.PI);
  for (let k = 0; k < 3; k++) g.add(PRIM.torus(), 0xc8904a, mat(0, top + 0.35 + k * 0.25, rz, Math.PI / 2, 0, 0, 0.55 - k * 0.15, 0.55 - k * 0.15, 0.3));
  g.sphere(0xffb8d0, 0, top + 1.15, rz, 0.85);
  g.sphere(0xfff0c8, 0, top + 1.5, rz, 0.6);
  g.sphere(0xd8321e, 0, top + 1.85, rz, 0.18);
  g.boxB(0xd8dce0, 0, top, rz, 0.5, 0.08, 0.5);
  for (const sx of [-1, 1]) decal(ctx, 'HELADOS', 2.4, 0.46, sx, top - 0.32, cz - 1.0, { fg: '#d8321e', bg: '#fff6c0', border: '#d8321e' });
  decal(ctx, 'HELADOS', 1.3, 0.24, 'front', top + 0.06, L / 2 - 0.45, { fg: '#d8321e', bg: '#fff6c0', border: '#d8321e' });
}

// The dalahäst dress (the free-roam paint shop, DESIGN §7.2): white flowers with yellow eyes and
// green leaves on the doors and the bonnet, and the horse's harness (white, green and blue stripes
// with a saddle on the rear door) along the sides. Ordinary bodies only (carBody, vanBody); built
// as its own mesh with no outline, so it reads as paint, and a wreck hides it with the liveries.
const DALA = { petal: 0xfaf6ea, eye: 0xf7c31b, leaf: 0x2f8a4a, blue: 0x2f6ad8 };
// One flower of size k: on a side (sx = ±1, in the y–z plane) or flat on the bonnet (sx = 0).
function dalaFlower(g, sx, x, y, z, k) {
  const cyl = PRIM.cyl(10);
  const put = (c, d, a, len, wid, lift) => {
    const ca = Math.cos(a) * d, sa = Math.sin(a) * d;
    if (sx) g.add(cyl, c, mat(x + sx * lift, y + ca, z + sa, a, 0, Math.PI / 2, len, 0.01, wid));
    else g.add(cyl, c, mat(x + ca, y + lift, z - sa, 0, a, 0, len, 0.01, wid));
  };
  for (const a of [Math.PI - 0.75, Math.PI + 0.75]) put(DALA.leaf, 0.17 * k, a, 0.2 * k, 0.08 * k, 0);
  for (let i = 0; i < 6; i++) put(DALA.petal, 0.085 * k, (i * Math.PI) / 3, 0.15 * k, 0.085 * k, 0.003);
  put(DALA.eye, 0, 0, 0.085 * k, 0.085 * k, 0.006);
}
function dalaDress(s) {
  const g = new GeoBuilder();
  const L = s.len, W = s.wid, y0 = s.wheelR * 0.95, top = y0 + s.bodyH;
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 + 0.014);
    // The harness: three stripes from nose to tail, under the waist on a van.
    const band = s.tall ? y0 + 0.62 : top - 0.05;
    [DALA.petal, DALA.leaf, DALA.blue].forEach((c, k) => g.box(c, x, band - k * 0.045, 0, 0.01, 0.045, L - 0.24));
    if (s.tall) {
      dalaFlower(g, sx, x, y0 + 0.3, L / 2 - 2.1 - 0.9, 1.25);
      dalaFlower(g, sx, x, y0 + 0.3, L / 2 - 1.55, 0.8);
      continue;
    }
    // The saddle: a white panel with a blue rim, hanging from the harness.
    const sz = -L * 0.16, sb = y0 + 0.1, st = band - 0.115;
    g.box(DALA.blue, x - sx * 0.002, (sb + st) / 2, sz, 0.01, st - sb + 0.06, 0.46);
    g.box(DALA.petal, x + sx * 0.002, (sb + st) / 2, sz, 0.01, st - sb, 0.36);
    dalaFlower(g, sx, x + sx * 0.004, (sb + st) / 2, sz, 0.55);
    // Flowers on the front door.
    const fy = y0 + s.bodyH * 0.36;
    dalaFlower(g, sx, x, fy, L * 0.09, 1.0);
    dalaFlower(g, sx, x, fy + 0.06, L * 0.09 + 0.36, 0.55);
    dalaFlower(g, sx, x, fy + 0.06, L * 0.09 - 0.36, 0.55);
  }
  if (!s.tall) {
    // A big flower and two small ones on the bonnet lid (top at top + 0.03, centred at L·0.3).
    const by = top + 0.035, bz = L * 0.3;
    dalaFlower(g, 0, 0, by, bz, 1.5);
    for (const sx of [-1, 1]) dalaFlower(g, 0, sx * W * 0.28, by, bz - L * 0.08, 0.7);
  }
  return g.build();
}

// The golf cart (feature 74, §10.40): open sides, a bench under a roof on four posts with a red
// edge, a windscreen, a low nose and two golf bags in the rear well. Nose and rear well are narrow
// below the fenders, so the wheels (wheelInset) turn clear of them. Stig sits full size under the
// roof on the ordinary seat (seatY/roofY), his legs out under the dash.
const GOLF = { seat: 0xe8dcc0, roofEdge: 0xd8321e, post: 0xc8ccd2, bags: [[0xc8322a, 0xf4f4f0], [0x2a3a6a, 0xd8c49a]], covers: [0xffd23f, 0xd8321e, 0x2f8a4a] };
function buildGolfbil(s, color) {
  const g = new GeoBuilder(), glass = new GeoBuilder();
  const L = s.len, W = s.wid, F = L / 2, R = -L / 2, dark = shade(color, 0.72);
  const rt = s.wheelR * 0.95 + s.bodyH + s.cabinH;   // the roof's underside + 0.08 (roofY + 0.08)
  // Floor between the wheels, sills along the sides.
  g.boxB(TRIM, 0, 0.16, 0, W - 0.52, 0.12, L - 0.1);
  for (const sx of [-1, 1]) g.boxB(dark, sx * (W / 2 - 0.12), 0.17, 0, 0.24, 0.1, 1.1);
  // The nose: narrow below, full width over the front wheels, a dash sloping up to the driver.
  g.boxB(color, 0, 0.2, F - 0.33, W - 0.52, 0.32, 0.66);
  g.boxB(color, 0, 0.52, F - 0.33, W, 0.22, 0.66);
  g.box(shade(color, 1.06), 0, 0.8, F - 0.62, W - 0.04, 0.08, 0.36, 0, 0.45);
  g.box(TRIM, 0, 0.3, F + 0.04, W - 0.1, 0.08, 0.08);
  for (const sx of [-1, 1]) lamp(g, sx * (W / 2 - 0.24), 0.6, F + 0.01, 0.07, 0xfff6c0);
  // Steering column and wheel before the driver (left, +x).
  g.cyl(TRIM, W * 0.22, 0.86, F - 0.72, 0.025, 0.42, 6, -0.55);
  g.add(PRIM.torus(), TYRE, mat(W * 0.22, 1.04, F - 0.82, -0.9, 0, 0, 0.32, 0.32, 0.32));
  // The bench: base, cushion, a backrest leaning back, the hip rails.
  g.boxB(color, 0, 0.28, -0.1, W - 0.08, 0.14, 0.66);
  g.boxB(GOLF.seat, 0, 0.42, -0.08, W - 0.16, 0.08, 0.62);
  g.box(GOLF.seat, 0, 0.8, -0.42, W - 0.16, 0.6, 0.09, 0, -0.14);
  for (const sx of [-1, 1]) {
    g.box(CHROME, sx * (W / 2 - 0.04), 0.66, -0.06, 0.04, 0.04, 0.52);
    g.box(CHROME, sx * (W / 2 - 0.04), 0.55, 0.18, 0.04, 0.22, 0.04);
  }
  // The rear well: narrow below, full width over the rear wheels; bumper and tail lamps.
  g.boxB(color, 0, 0.2, R + 0.38, W - 0.52, 0.32, 0.76);
  g.boxB(color, 0, 0.52, R + 0.38, W, 0.14, 0.76);
  g.box(TRIM, 0, 0.3, R - 0.04, W - 0.1, 0.08, 0.08);
  for (const sx of [-1, 1]) g.box(0xe8322a, sx * (W / 2 - 0.16), 0.58, R - 0.01, 0.16, 0.08, 0.04);
  // Four posts and the roof with its red edge, the windscreen between the front posts.
  for (const sx of [-1, 1]) {
    g.box(GOLF.post, sx * (W / 2 - 0.06), (0.8 + rt) / 2, F - 0.7, 0.05, rt - 0.8, 0.05, 0, -0.06);
    g.box(GOLF.post, sx * (W / 2 - 0.06), (0.66 + rt) / 2, -0.62, 0.05, rt - 0.66, 0.05);
  }
  g.boxB(color, 0, rt - 0.02, -0.06, W + 0.12, 0.08, 1.56);
  for (const sz of [-1, 1]) g.box(GOLF.roofEdge, 0, rt + 0.01, -0.06 + sz * 0.79, W + 0.16, 0.07, 0.04);
  for (const sx of [-1, 1]) g.box(GOLF.roofEdge, sx * (W / 2 + 0.07), rt + 0.01, -0.06, 0.04, 0.07, 1.62);
  glass.box(0xffffff, 0, (0.84 + rt) / 2, F - 0.69, W - 0.18, rt - 0.88, 0.03, 0, -0.06);
  // Two golf bags leaning back in the well, a strap across, clubs with head covers out of the top.
  g.box(TRIM, 0, 1.16, -0.76, W - 0.24, 0.05, 0.04);
  GOLF.bags.forEach(([bag, band], k) => {
    const x = (k ? -1 : 1) * 0.27, a = -0.24, h = 0.95, c = Math.cos(a), sn = Math.sin(a);
    const at = (d) => [x, 0.66 + d * c, -0.9 + d * sn];
    g.cyl(bag, ...at(h / 2), 0.14, h, 12, a);
    g.cyl(band, ...at(h - 0.05), 0.145, 0.1, 12, a);
    g.cyl(band, ...at(0.12), 0.145, 0.06, 12, a);
    for (let j = 0; j < 3; j++) {
      const [cx, cy, cz] = at(h + 0.1);
      g.sphere(GOLF.covers[(j + k) % 3], cx + (j - 1) * 0.08, cy + (j % 2) * 0.05, cz + (j % 2 ? -0.03 : 0.03), 0.12, 0.16, 0.12);
    }
  });
  return { geo: g.build(), glass: glass.build() };
}

// The tractor (feature 121, §10.54): a small red tractor with no badge (§1.5), a narrow bonnet with a
// grille and lamps, the exhaust stack before the driver, big lugged rear wheels under round fenders,
// a pan seat high over the rear axle and a steering wheel on a raked column; behind it on a drawbar a
// fixed trailer of tomato boxes (its floor at the `bed` height, wheelR·0.95 + bodyH = 0.74). The
// passenger sits on an upturned box at the trailer's front (spec.seat px, pz). Wheels: spec.wheels.
const TRAK = { wood: 0x9a6a3a, box: 0xc08a50, slat: 0x8a5a2e, steel: 0x5a6068, tomato: [0xd8321e, 0xe8452a] };
function buildTraktor(s, color) {
  const g = new GeoBuilder(), dark = shade(color, 0.72), top = s.wheelR * 0.95 + s.bodyH;
  // Front axle, the sump under the bonnet, the bonnet with a lighter top and vent slots.
  g.box(TRIM, 0, 0.34, 2.5, 1.04, 0.12, 0.14);
  g.boxB(TRIM, 0, 0.3, 2.05, 0.42, 0.34, 1.7);
  g.boxB(color, 0, 0.62, 2.12, 0.7, 0.42, 1.66);
  g.box(shade(color, 1.1), 0, 1.06, 2.12, 0.6, 0.05, 1.62);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) g.box(TRIM, sx * 0.352, 0.86, 2.36 + k * 0.16, 0.01, 0.16, 0.06);
  // Grille with chrome bars, a front weight, round lamps on brackets.
  g.box(TRIM, 0, 0.84, 2.96, 0.56, 0.38, 0.03);
  for (let k = 0; k < 4; k++) g.box(CHROME, 0, 0.71 + k * 0.09, 2.98, 0.52, 0.025, 0.02);
  g.box(TRIM, 0, 0.5, 3.04, 0.82, 0.22, 0.16);
  for (const sx of [-1, 1]) {
    g.box(TRIM, sx * 0.4, 0.98, 2.84, 0.12, 0.04, 0.04);
    lamp(g, sx * 0.47, 0.98, 2.87, 0.075, 0xfff6c0);
  }
  // The exhaust stack before the driver (smoke from its top: game/traktor.js) and the air intake.
  g.cyl(0x3a3a40, 0.2, 1.42, 2.55, 0.045, 0.76, 8);
  g.cyl(TRIM, 0.2, 1.82, 2.55, 0.06, 0.05, 8);
  g.cyl(0x8a8f99, -0.18, 1.2, 2.25, 0.05, 0.32, 8);
  g.cyl(TRAK.steel, -0.18, 1.38, 2.25, 0.08, 0.1, 10);
  // Gearbox between bonnet and rear axle, the rear axle's housing, footplates.
  g.boxB(dark, 0, 0.42, 0.98, 0.6, 0.5, 0.66);
  g.cyl(TRIM, 0, 0.64, 0.7, 0.1, 1.3, 10, 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) g.boxB(TRIM, sx * 0.42, 0.5, 1.12, 0.26, 0.04, 0.6);
  // Round fenders over the rear wheels: plates on an arc about the axle (y 0.64, z 0.7).
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) {
    const a = -1.0 + k * 0.46, R = 0.74;
    g.box(color, sx * 0.72, 0.64 + R * Math.cos(a), 0.7 + R * Math.sin(a), 0.5, 0.05, 0.36, 0, a);
  }
  // The seat on its spring over the rear axle (pan top 1.02 = seat.y + 0.02), its back, the column
  // and the wheel.
  g.box(TRAK.steel, 0, 0.97, 0.5, 0.08, 0.12, 0.3);
  g.boxB(TRIM, 0, 0.94, 0.5, 0.48, 0.08, 0.44);
  g.box(TRIM, 0, 1.2, 0.26, 0.44, 0.3, 0.06, 0, -0.15);
  g.cyl(TRIM, 0, 1.18, 1.16, 0.03, 0.55, 6, -0.55);
  g.add(PRIM.torus(), TYRE, mat(0, 1.44, 0.98, -1.0, 0, 0, 0.4, 0.4, 0.4));
  // Drawbar and the trailer's A-frame to its front.
  g.box(TRIM, 0, 0.46, -0.1, 0.1, 0.08, 0.9);
  g.cyl(CHROME, 0, 0.5, 0.18, 0.04, 0.16, 6);
  for (const sx of [-1, 1]) g.box(TRIM, sx * 0.3, 0.5, -0.4, 0.07, 0.06, 0.72, -sx * 0.98);
  // The trailer: beams, the plank floor (top = the bed), red sides, front board and tailgate, corner
  // stakes, mudguards over its wheels, tail lamps.
  const z0 = -0.57, z1 = -3.15, zm = (z0 + z1) / 2, len = z0 - z1, w = 1.48;
  for (const sx of [-1, 1]) g.box(TRIM, sx * 0.6, 0.56, zm, 0.08, 0.1, len);
  g.boxB(TRAK.wood, 0, top - 0.12, zm, w, 0.12, len);
  for (let k = 1; k < 6; k++) g.box(TRAK.slat, 0, top + 0.002, z1 + (k * len) / 6, w - 0.1, 0.004, 0.03);
  for (const sx of [-1, 1]) {
    g.boxB(color, sx * (w / 2 - 0.03), top, zm, 0.06, 0.3, len);
    g.box(shade(color, 1.1), sx * (w / 2 - 0.03), top + 0.31, zm, 0.08, 0.03, len);
    for (const z of [z0 - 0.03, zm, z1 + 0.03]) g.boxB(dark, sx * (w / 2 - 0.02), top - 0.04, z, 0.08, 0.4, 0.08);
    g.boxB(TRIM, sx * 0.84, 0.72, -2.1, 0.24, 0.04, 0.84);
    g.box(0xe8322a, sx * 0.6, 0.66, z1 - 0.02, 0.12, 0.08, 0.03);
  }
  g.boxB(color, 0, top, z0 - 0.03, w, 0.36, 0.06);
  g.boxB(color, 0, top, z1 + 0.03, w, 0.3, 0.06);
  // Tomato boxes (one row upturned at the front left: the passenger's seat), two stacked at the back.
  const crate = (x, z, ry, y = top, full = true) => {
    g.boxB(TRAK.box, x, y, z, 0.6, 0.3, 0.46, ry);
    for (const yy of [0.1, 0.22]) g.box(TRAK.slat, x, y + yy, z, 0.62, 0.03, 0.48, ry);
    if (!full) return;
    const c = Math.cos(ry), sn = Math.sin(ry);
    [[-0.15, -0.1], [0.15, -0.1], [0, 0.11], [-0.17, 0.12], [0.17, 0.1]].forEach(([dx, dz], k) => {
      g.sphere(TRAK.tomato[k % 2], x + dx * c + dz * sn, y + 0.31, z - dx * sn + dz * c, 0.17, 0.14, 0.17);
    });
  };
  crate(-0.36, -0.95, 0.02, top, false);
  crate(0.37, -1.05, -0.04);
  crate(0.37, -1.6, 0.03);
  crate(-0.36, -1.66, -0.05);
  crate(0.36, -2.25, 0.02);
  crate(-0.38, -2.3, 0.06);
  crate(0.35, -2.85, -0.03);
  crate(-0.36, -2.88, 0.02);
  crate(0.36, -2.25, -0.1, top + 0.3);
  crate(-0.36, -2.88, 0.08, top + 0.3);
  return { geo: g.build(), glass: null };
}

// The pedal boat (feature 120, §10.57), the beach's pedalBoat (coast.js) as a car: two pontoons in its
// colour with a darker band at the waterline, cross beams, a white deck, a blue bench for two with its
// back, two pairs of pedals in the footwell before it, the paddle-wheel housing at the stern and a white
// rail round the bow. Its waterline is 0.02 over the base (the boat rides at CURB 0.15, the sea lies at
// 0.17). The paddle wheel under the housing is an extra (userData.paddle) game/trampbat.js turns.
const TRAMP = { deck: 0xf4efe6, seat: 0x2f5a8a, rail: 0xf4f4f0, crank: 0x8a8f99, pedal: 0x2a2a30 };
function buildTrampbat(s, color) {
  const g = new GeoBuilder(), WL = 0.02, dark = shade(color, 0.74);
  for (const sx of [-1, 1]) {
    g.sphere(color, sx * 0.75, WL + 0.25, 0, 0.62, 0.7, 3.2, 0, 0, 0, 14);
    g.sphere(dark, sx * 0.75, WL + 0.06, 0, 0.66, 0.2, 3.1, 0, 0, 0, 14);
  }
  for (const z of [-1.05, 1.2]) g.box(TRIM, 0, WL + 0.5, z, 1.62, 0.08, 0.14);
  g.box(TRAMP.deck, 0, WL + 0.55, 0.1, 1.8, 0.12, 2.1);
  // The bench (its cushion's top is the seat.y, 0.93) and its back leaning back.
  g.boxB(TRAMP.seat, 0, WL + 0.61, 0.2, 1.44, 0.3, 0.52);
  g.box(TRAMP.seat, 0, WL + 1.12, -0.12, 1.44, 0.6, 0.12, 0, -0.3);
  // The pedals: a crank housing across the footwell, a pair of pedals for each seat.
  g.box(TRAMP.crank, 0, WL + 0.74, 0.98, 1.3, 0.1, 0.12);
  for (const sx of [-1, 1]) for (const k of [-1, 1]) g.box(TRAMP.pedal, sx * 0.36 + k * 0.1, WL + 0.74 + k * 0.08, 0.98 + k * 0.05, 0.08, 0.04, 0.14);
  // The paddle-wheel housing at the stern, a lighter lid; the bow rail on four posts.
  g.boxB(color, 0, WL + 0.5, -1.0, 1.0, 0.46, 0.62);
  g.box(shade(color, 1.12), 0, WL + 0.98, -1.0, 1.04, 0.05, 0.66);
  g.box(TRAMP.rail, 0, WL + 0.98, 1.36, 1.5, 0.05, 0.05);
  for (const sx of [-1, 1]) {
    g.box(TRAMP.rail, sx * 0.75, WL + 0.98, 1.08, 0.05, 0.05, 0.56);
    for (const z of [0.82, 1.34]) g.box(TRAMP.rail, sx * 0.75, WL + 0.79, z, 0.04, 0.38, 0.04);
  }
  const w = new GeoBuilder();
  w.cyl(TRAMP.crank, 0, 0, 0, 0.06, 0.74, 8, 0, 0, Math.PI / 2);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; w.box(TRAMP.rail, 0, Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0.66, 0.26, 0.04, 0, -a); }
  const wheel = toonMesh(w.build(), { outline: 0.02 });
  wheel.position.set(0, WL + 0.26, -1.0);
  wheel.userData.paddle = true;
  return { geo: g.build(), glass: null, extras: [wheel] };
}

function buildCarModel(s, color) {
  if (s.build) return s.build(s, color);
  const g = new GeoBuilder(), glass = new GeoBuilder(), extras = [];
  const ctx = { g, glass, extras, s, color, L: s.len, W: s.wid, y0: s.wheelR * 0.95, top: s.wheelR * 0.95 + s.bodyH };
  if (s.bus) busBody(ctx);
  else if (s.guardia) guardiaBody(ctx);
  else if (s.tall) vanBody(ctx, { cabLen: s.icecream ? 2.2 : 2.1 });
  else carBody(ctx);
  if (s.pigs) pigsIn(ctx);
  if (s.butano) butanoRack(ctx);
  if (s.taxi) taxiSign(ctx);
  if (s.icecream) icecreamDress(ctx);
  return { geo: g.build(), glass: glass.empty ? null : glass.build(), extras };
}

// A unit wheel (radius 1, axle along x), one per rim colour and tread: `lugs` adds the tractor's
// tread lugs round the tyre.
const wheelGeo = {};
function getWheelGeo(rim = 0xc8ccd2, lugs = false) {
  const key = `${rim}|${lugs}`;
  if (wheelGeo[key]) return wheelGeo[key];
  const g = new GeoBuilder();
  g.cyl(0x1d1d22, 0, 0, 0, 1, 0.75, 16, 0, 0, Math.PI / 2);
  g.cyl(rim, 0, 0, 0, 0.55, 0.8, 10, 0, 0, Math.PI / 2);
  g.box(0x8a8f99, 0, 0, 0, 0.82, 0.2, 0.6);
  if (lugs) for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; g.box(0x1d1d22, 0, Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0.7, 0.12, 0.2, 0, a); }
  return (wheelGeo[key] = g.build());
}

// ---------------------------------------------------------------------------------------------

let nextId = 1;
export class Car {
  constructor(type, opts = {}) {
    const spec = (this.spec = { ...CAR_TYPES[type], ...(opts.spec || {}) });
    this.type = type;
    this.id = nextId++;
    this.name = opts.name || null;
    this.color = opts.color ?? spec.color ?? pick(spec.colors || COLORS);
    this.root = new THREE.Group();
    this.tilt = new THREE.Group();
    this.root.add(this.tilt);
    const { geo, glass, extras } = buildCarModel(spec, this.color);
    this.body = toonMesh(geo, { outline: 0.035 });
    this.tilt.add(this.body);
    this.decals = extras || [];
    for (const e of this.decals) this.tilt.add(e);
    if (glass) {
      const gm = new THREE.Mesh(glass, MAT.glass);
      gm.renderOrder = 2;
      this.tilt.add(gm);
    }
    // The grisbil's pigs: `pigs[i]` = { mesh, in } for PIG_SLOTS[i]; `in` false while that pig is
    // off the bed (setPig). A burnt wreck hides them with the decals.
    this.pigs = [];
    if (spec.pigs) {
      const top = spec.wheelR * 0.95 + spec.bodyH;
      for (const [x, z, ry, s] of PIG_SLOTS) {
        const mesh = pigMesh(s);
        mesh.position.set(x, top, z * spec.len);
        mesh.rotation.y = ry;
        this.tilt.add(mesh);
        this.pigs.push({ mesh, in: true });
      }
    }
    // The gas truck's bottles (§10.65): one instance each of BOTTLE_SLOTS, `bottles[i]` true while
    // bottle i stands on the bed (setBottle). A burnt wreck hides them with the decals.
    this.bottles = [];
    if (spec.butano) {
      const geo = bottleGeo(), n = BOTTLE_SLOTS.length;
      const im = new THREE.InstancedMesh(geo, MAT.toon, n), om = new THREE.InstancedMesh(outlineGeometry(geo), outlineMat(0.03), n);
      om.instanceMatrix = im.instanceMatrix;
      im.castShadow = true;
      im.frustumCulled = om.frustumCulled = false;
      this.rack = { im, om, top: spec.wheelR * 0.95 + spec.bodyH };
      this.tilt.add(im, om);
      for (let i = 0; i < n; i++) { this.bottles.push(true); this.setBottle(i, true); }
    }
    // Wheels: two axles of spec.wheelR at ±wz, or the spec's own axles (the tractor); `k` turns a
    // wheel of another radius at its own rate.
    this.wheels = [];
    const wr = spec.wheelR, wx = spec.wid / 2 - 0.02, wz = spec.len / 2 - wr - (spec.bus ? 1.2 : spec.wheelInset ?? 0.38);
    const axles = spec.wheels || (spec.noWheels ? [] : [{ z: wz, front: true }, { z: -wz }]);
    for (const a of axles) for (const sx of [1, -1]) {
      const r = a.r ?? wr, piv = new THREE.Group();
      piv.position.set(sx * (a.x ?? wx), r, a.z);
      const w = toonMesh(getWheelGeo(a.rim, a.lugs), { outline: 0.02 });
      w.scale.set(a.w ?? 0.36, r, r);
      piv.add(w);
      this.tilt.add(piv);
      this.wheels.push({ piv, mesh: w, front: !!a.front, k: wr / r });
    }
    this.x = opts.x || 0; this.z = opts.z || 0; this.y = 0.15; this.yaw = opts.yaw || 0;
    this.vx = 0; this.vz = 0; this.vy = 0; this.w = 0;
    this.steerAngle = 0;
    this.hp = spec.hp;
    this.dead = false;
    this.air = false;
    this.airT = 0;           // s in the air since it left the ground at airFrom { x, z, y } (the stunt jumps, §10.27)
    this.airFrom = null;
    this.mass = spec.mass;
    this.inertia = (spec.mass * (spec.len * spec.len + spec.wid * spec.wid)) / 12;
    this.ctrl = { throttle: 0, brake: 0, steer: 0, handbrake: false, park: true };
    this.obb = { x: 0, z: 0, fx: 0, fz: 1, hx: spec.wid / 2, hz: spec.len / 2 };
    this.radius = Math.hypot(spec.wid, spec.len) / 2;
    this.height = spec.height ?? (spec.tall ? spec.wheelR * 0.95 + spec.bodyH : spec.wheelR * 0.95 + spec.bodyH + spec.cabinH + 0.13);
    this.driver = null;      // Character at the wheel
    this.passengers = [];    // extra seated characters
    this.ai = null;          // controller object with update(car, dt)
    this.wheelSpin = 0;
    this.bump = 0;
    this.pitch = 0; this.roll = 0;
    this.smokeT = 0;
    this.skidAmt = 0;
    this.lastHit = 0;
    this.revs = 0;
    this.riders = [];
    this.noEnter = false;
    this.noExplode = !!spec.noExplode;
    this.isPursuer = false;
    this.lift = 0;           // the nose raised, rad (hooked to the tow truck in Lapplisan Majsan, §10.17)
    this.updateObb();
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
  }

  get speed() { return Math.hypot(this.vx, this.vz); }
  get forwardSpeed() { return this.vx * Math.sin(this.yaw) + this.vz * Math.cos(this.yaw); }

  updateObb() {
    const o = this.obb;
    o.x = this.x; o.z = this.z; o.fx = Math.sin(this.yaw); o.fz = Math.cos(this.yaw);
  }

  // Seat position in world space: driver on the left (+x local), passenger on the right. Computed
  // from the physics state (not the last rendered matrix), so it is current within the frame.
  seatWorld(side = 1, out = { x: 0, y: 0, z: 0 }) {
    const s = this.spec;
    let lx = side * s.wid * 0.22, ly = s.tall ? s.wheelR * 0.95 + 0.45 : s.wheelR * 0.95 + s.bodyH - 0.25, lz = s.tall ? s.len / 2 - 1.6 : -0.1;
    if (s.seat) { const a = this.seatAt(side); lx = a.x; lz = a.z; ly = s.seat.y + 0.12; }
    const c = Math.cos(this.yaw), sn = Math.sin(this.yaw);
    out.x = this.x + lx * c + lz * sn;
    out.y = this.y + ly;
    out.z = this.z - lx * sn + lz * c;
    return out;
  }

  place(x, z, yaw) {
    this.x = x; this.z = z; this.yaw = yaw; this.vx = this.vz = this.vy = this.w = 0;
    this.y = groundAt(x, z, 0.2, 0.6);
    this.air = false;
    this.airFrom = null;
    this.updateObb();
  }

  step(dt, game) {
    const s = this.spec, c = this.ctrl;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const rx = -fz, rz = fx;
    let vf = this.vx * fx + this.vz * fz;
    let vr = this.vx * rx + this.vz * rz;
    const driven = !this.dead && (this.driver || this.ai);
    const boost = game && game.playerCar === this ? PLAYER_BOOST : 1;
    const maxSpeed = s.maxSpeed * boost, accel = s.accel * boost;
    this.skidAmt = 0;
    if (!this.air) {
      if (driven && !c.park) {
        const thr = c.throttle, brk = c.brake;
        if (thr > 0) {
          if (vf < -0.5) vf = Math.min(0, vf + 24 * boost * thr * dt);
          else {
            const t = 1 - Math.max(0, vf) / maxSpeed;
            vf += accel * thr * Math.max(s.governed ? 0 : 0.08, t) * dt;
            if (vf < 3 && thr > 0.9 && c.handbrake) this.skidAmt = 1;
          }
        }
        if (brk > 0) {
          if (vf > 0.5) { vf = Math.max(0, vf - 24 * boost * brk * dt); if (vf > 8) this.skidAmt = Math.max(this.skidAmt, 0.6 * brk); }
          else vf = Math.max(vf - accel * 0.6 * brk * dt, -maxSpeed * 0.35);
        }
        if (!thr && !brk) vf -= Math.sign(vf) * Math.min(Math.abs(vf), (s.coast ?? 2.2) * dt);
        if (c.handbrake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 5 * dt);
      } else {
        vf -= Math.sign(vf) * Math.min(Math.abs(vf), (this.dead ? 6 : 9) * dt);
      }
      vf -= vf * Math.abs(vf) * (0.0011 / boost) * dt;
      const grip = c.handbrake && driven ? 1.7 : s.grip;
      if (Math.abs(vr) > 3) this.skidAmt = Math.max(this.skidAmt, Math.min(1, (Math.abs(vr) - 3) / 6));
      vr *= Math.exp(-grip * dt);
      const maxSteer = (boost === 1 && s.aiSteer ? s.aiSteer : s.steer) / (1 + Math.abs(vf) / 15);
      this.steerAngle = damp(this.steerAngle, driven ? c.steer * maxSteer : 0, 12, dt);
      const wb = s.wb ?? s.len * 0.62;
      const targetW = (-vf * Math.tan(this.steerAngle)) / wb * (c.handbrake && driven ? 1.5 : 1);
      this.w = damp(this.w, targetW, c.handbrake ? 4 : 8, dt);
    } else {
      this.w *= Math.exp(-0.6 * dt);
    }
    this.vx = fx * vf + rx * vr;
    this.vz = fz * vf + rz * vr;
    this.yaw += this.w * dt;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.wheelSpin += (vf * dt) / s.wheelR;
    this.revs = damp(this.revs, Math.min(1, Math.abs(vf) / maxSpeed) * 0.85 + (c.throttle > 0 && driven ? 0.2 : 0), 6, dt);

    // Vertical: follow the ground, launch off ramp ends, land with a thump. The flight is timed
    // (airT from the take-off at airFrom), and every landing, a soft one too, is reported to
    // onCarAirEnd (the stunt jumps' judge, §10.27) before its damage.
    const gh = groundAt(this.x, this.z, this.y, 0.6);
    if (this.air) {
      this.airT += dt;
      this.vy -= 22 * dt;
      this.y += this.vy * dt;
      if (this.y <= gh) {
        const impact = -this.vy;
        this.y = gh; this.vy = 0; this.air = false;
        game?.onCarAirEnd(this, impact);
        if (impact > 4) {
          this.bump = Math.min(0.35, impact * 0.03);
          game?.onCarLanded(this, impact);
          if (impact > 13) this.damage((impact - 13) * 2.5, game);
        }
      }
    } else if (gh < this.y - 0.35) {
      this.air = true;
      this.airT = 0;
      this.airFrom = { x: this.x, z: this.z, y: this.y };
    } else {
      this.vy = clamp((gh - this.y) / dt, -6, 12);
      this.y = gh;
    }

    this.updateObb();
    this.collideStatic(game);
    if (!this.dead && this.hp < 35) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = this.hp < 15 ? 0.05 : 0.12;
        const hx = this.x + fx * s.len * 0.38, hz = this.z + fz * s.len * 0.38;
        fx_smoke(hx, this.y + this.height * 0.7, hz, this.hp < 15);
      }
    }
    if (this.dead && this.steamT > 0) {
      this.steamT -= dt;
      this.smokeT -= dt;
      if (this.smokeT <= 0) { this.smokeT = 0.15; FX.steam(this.x + fx * s.len * 0.38, this.y + this.height * 0.8, this.z + fz * s.len * 0.38); }
    }
    if (this.dead) {
      this.smokeT -= dt;
      if (this.smokeT <= 0 && this.burn > 0) {
        this.smokeT = 0.06;
        FX.fire(this.x, this.y + 1.0, this.z);
        if (Math.random() < 0.4) FX.smoke(this.x, this.y + 1.6, this.z, true);
      }
      this.burn -= dt;
    }
  }

  collideStatic(game) {
    const o = this.obb, r = this.radius;
    const list = queryBlocks(this.x - r, this.z - r, this.x + r, this.z + r, _blocks);
    for (const b of list) {
      // The pedal boat goes past the sea's bound wall (§10.57: the sea that holds it is trampbat.js's).
      if (b.kind === 'bound' && this.spec.boat) continue;
      const top = b.shape === RAMP ? topAt(b, this.x, this.z) : b.top;
      if (top <= this.y + 0.6) continue;
      // A prop (its block's `ref`; a fruit stall's kind is 'stall'): broken above its minSpeed unless
      // the game says no (a fruit stall in a mission, §10.19), then a wall like any other.
      if (b.ref?.def) {
        if (!obbVsBlock(o, b, _hit)) continue;
        const def = b.ref.def;
        if (this.speed > (def.minSpeed ?? 3) && game?.breakProp(b.ref, this.vx, this.vz, this)) {
          const k = def.slow ?? 0.92;
          this.vx *= k; this.vz *= k;
          continue;
        }
        this.resolveStatic(_hit, game, b);
        continue;
      }
      if (!obbVsBlock(o, b, _hit)) continue;
      this.resolveStatic(_hit, game, b);
    }
  }

  resolveStatic(h, game, b) {
    const d = Math.min(h.depth, 1.5);
    this.x += h.nx * d; this.z += h.nz * d;
    const rxc = h.cx - this.x, rzc = h.cz - this.z;
    const pvx = this.vx + this.w * rzc, pvz = this.vz - this.w * rxc;
    const vn = pvx * h.nx + pvz * h.nz;
    if (vn < 0) {
      const rn = (rzc * h.nx - rxc * h.nz) * 0.7;
      const invM = 1 / this.mass, invI = 1 / this.inertia;
      const j = (-(1 + 0.22) * vn) / (invM + rn * rn * invI);
      this.vx += j * h.nx * invM; this.vz += j * h.nz * invM;
      this.w += j * rn * invI;
      const tx = -h.nz, tz = h.nx, vt = this.vx * tx + this.vz * tz;
      this.vx -= tx * vt * 0.12; this.vz -= tz * vt * 0.12;
      const impact = -vn;
      if (impact > 2.5 && game) game.onCarImpact(this, null, impact, h.cx, h.cz, b);
      if (impact > 5) this.damage((impact - 5) * 2.0, game);
    }
    this.updateObb();
  }

  damage(amount, game) {
    if (this.dead || amount <= 0) return;
    if (this.invulnerable) return;
    this.hp -= amount * (this.damageScale ?? 1);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      if (this.noExplode) {
        // Wrecked in steam: no fireball, no fire, it just stops.
        this.burn = 0;
        this.steamT = 6;
        FX.steam(this.x, this.y + this.height * 0.8, this.z);
      } else {
        this.burn = 6;
        this.body.material = MAT.burnt;
        for (const e of this.decals) e.visible = false;
        for (const p of this.pigs) p.mesh.visible = false;
        if (this.rack) this.rack.im.visible = this.rack.om.visible = false;
        FX.explosion(this.x, this.y + 0.5, this.z);
        this.vy = 6; this.air = true;
        this.w += (Math.random() - 0.5) * 3;
      }
      game?.onCarDestroyed(this);
    }
  }

  repair() {
    this.hp = this.spec.hp;
    this.dead = false;
    this.burn = 0;
    this.body.material = MAT.toon;
    for (const e of this.decals) e.visible = true;
    for (const p of this.pigs) p.mesh.visible = p.in;
    if (this.rack) this.rack.im.visible = this.rack.om.visible = true;
  }

  // Bottle i of the gas truck's bed on (standing in its slot) or off (thrown off: game/butano.js).
  setBottle(i, on) {
    const r = this.rack;
    if (!r || i < 0 || i >= this.bottles.length) return;
    this.bottles[i] = on;
    const [x, z] = BOTTLE_SLOTS[i];
    r.im.setMatrixAt(i, on ? _bm.makeTranslation(x, r.top, z) : _bm.makeScale(0, 0, 0));
    r.im.instanceMatrix.needsUpdate = true;
  }
  // Where bottle i stands, in world space (from the physics state, like seatWorld).
  bottleWorld(i, out = { x: 0, y: 0, z: 0 }) {
    const [lx, lz] = BOTTLE_SLOTS[i], c = Math.cos(this.yaw), sn = Math.sin(this.yaw);
    out.x = this.x + lx * c + lz * sn;
    out.y = this.y + this.rack.top;
    out.z = this.z - lx * sn + lz * c;
    return out;
  }

  // Pig i of the bed on (in it) or off (tumbled off, carried, in the pen: game/pigTruck.js).
  setPig(i, on) {
    const p = this.pigs[i];
    if (!p) return;
    p.in = on;
    p.mesh.visible = on && this.body.material !== MAT.burnt;
  }
  // Where pig i stands in the bed, in world space (from the physics state, like seatWorld).
  pigWorld(i, out = { x: 0, y: 0, z: 0 }) {
    const s = this.spec, [lx, lz] = PIG_SLOTS[i], c = Math.cos(this.yaw), sn = Math.sin(this.yaw), z = lz * s.len;
    out.x = this.x + lx * c + z * sn;
    out.y = this.y + s.wheelR * 0.95 + s.bodyH;
    out.z = this.z - lx * sn + z * c;
    return out;
  }

  // A new coat of paint (the free-roam paint shop, DESIGN §7.2). The colour is baked into the body's
  // vertex colours, so the body and its outline are rebuilt; `dala` adds the dalahäst dress as a
  // decal (once). Glass, wheels, liveries and occupants stay.
  repaint(color, { dala = false } = {}) {
    const old = this.body;
    const { geo, glass } = buildCarModel(this.spec, color);
    glass?.dispose();
    this.color = color;
    this.body = toonMesh(geo, { outline: 0.035 });
    this.body.material = old.material;
    this.tilt.add(this.body);
    this.tilt.remove(old);
    old.geometry.dispose();
    for (const o of old.children) o.geometry?.dispose();
    if (dala && !this.dala && !this.spec.build) {
      this.dala = new THREE.Mesh(dalaDress(this.spec), MAT.toon);
      this.decals.push(this.dala);
      this.tilt.add(this.dala);
    }
  }

  // Sync the visual model with the physics state.
  sync(dt) {
    const s = this.spec;
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    let targetPitch = 0;
    if (this.air) targetPitch = -Math.atan2(this.vy, Math.max(4, Math.abs(this.forwardSpeed))) * 0.6;
    else {
      const wb = s.len * 0.35;
      const hF = groundAt(this.x + fx * wb, this.z + fz * wb, this.y + 0.3, 0.6), hR = groundAt(this.x - fx * wb, this.z - fz * wb, this.y + 0.3, 0.6);
      targetPitch = -Math.atan2(hF - hR, wb * 2);
      const accel = this.ctrl.throttle - this.ctrl.brake;
      targetPitch += accel * 0.02 * Math.min(1, this.speed / 5);
    }
    this.pitch = damp(this.pitch, targetPitch, 10, dt);
    const vr = this.vx * -fz + this.vz * fx;
    this.roll = damp(this.roll, clamp(vr * 0.012 - this.steerAngle * this.forwardSpeed * 0.004, -0.12, 0.12), 8, dt);
    this.bump = Math.max(0, this.bump - dt * 1.5);
    this.tilt.rotation.set(this.pitch - this.lift, 0, this.roll);
    this.tilt.position.y = -Math.sin(this.bump * 12) * this.bump * 0.4;
    // Hooked to the tow truck (§10.17): the nose `lift` rad up about the rear wheels.
    if (this.lift) this.tilt.position.y += Math.sin(this.lift) * (s.len / 2 - s.wheelR - 0.38);
    for (const w of this.wheels) {
      w.mesh.rotation.x = this.wheelSpin * w.k;
      w.piv.rotation.y = w.front ? -this.steerAngle : 0;
    }
  }

  // Occupants (DESIGN §6.6; main.addBust/addRider/seat): seatY() is the car-local height a driver
  // bust stands on and a seated character's hips rest 0.12 above; roofY() is the underside of the
  // roof less a hair's margin (a bus's roof slab is 0.22 thick). Ordinary cars sit people low in the
  // body (its opaque sides hide the legs), the vans/jeep on their cab seats and buses on seats whose
  // heads fill the window band, so heads clear the roof; who is still taller than the room is
  // scaled down (fitScale, never below 0.72).
  // A spec `seat` sets seatY and the seats' spots, and an `open` car has no roof: roofY leaves room for
  // anyone (the tractor, §10.54). seatAt(side): the driver's (1) or the passenger's (−1) spot, car-local
  // { x, z } (main.seat adds 0.12 to z for the hips).
  seatY() { const s = this.spec; return s.seat?.y ?? s.wheelR * 0.95 + (s.bus ? 0.55 : s.tall ? 0.36 : 0.2); }
  roofY() { const s = this.spec; return s.open ? this.seatY() + 2.5 : s.wheelR * 0.95 + s.bodyH + (s.tall ? 0 : s.cabinH) - (s.bus ? 0.22 : 0) - 0.08; }
  seatAt(side = 1) {
    const s = this.spec, o = s.seat;
    if (o) return side > 0 ? { x: o.x, z: o.z } : { x: o.px, z: o.pz ?? o.z };
    return { x: side * s.wid * 0.22, z: s.tall ? s.len / 2 - 1.6 : -0.05 };
  }
  fitScale(h, base = this.seatY()) { return Math.min(1, Math.max(0.72, (this.roofY() - base) / h)); }
}

const _blocks = [];
const _hit = {};
const _bm = new THREE.Matrix4();
function fx_smoke(x, y, z, dark) { FX.smoke(x, y, z, dark); }

// Pairwise car-car collisions with a rigid-body impulse.
const _ch = {};
export function collideCars(a, b, game) {
  const rr = a.radius + b.radius;
  const dx = a.x - b.x, dz = a.z - b.z;
  if (dx * dx + dz * dz > rr * rr) return;
  if (a.y > b.y + b.height - 0.3 || b.y > a.y + a.height - 0.3) return;
  if (!obbVsObb(a.obb, b.obb, _ch)) return;
  const ma = a.mass, mb = b.mass;
  const d = Math.min(_ch.depth, 1.2);
  a.x += _ch.nx * d * mb / (ma + mb); a.z += _ch.nz * d * mb / (ma + mb);
  b.x -= _ch.nx * d * ma / (ma + mb); b.z -= _ch.nz * d * ma / (ma + mb);
  const rax = _ch.cx - a.x, raz = _ch.cz - a.z, rbx = _ch.cx - b.x, rbz = _ch.cz - b.z;
  const vax = a.vx + a.w * raz, vaz = a.vz - a.w * rax;
  const vbx = b.vx + b.w * rbz, vbz = b.vz - b.w * rbx;
  const vn = (vax - vbx) * _ch.nx + (vaz - vbz) * _ch.nz;
  if (vn < 0) {
    const rna = (raz * _ch.nx - rax * _ch.nz) * 0.7, rnb = (rbz * _ch.nx - rbx * _ch.nz) * 0.7;
    const j = (-(1 + 0.3) * vn) / (1 / ma + 1 / mb + (rna * rna) / a.inertia + (rnb * rnb) / b.inertia);
    a.vx += (j * _ch.nx) / ma; a.vz += (j * _ch.nz) / ma; a.w += (j * rna) / a.inertia;
    b.vx -= (j * _ch.nx) / mb; b.vz -= (j * _ch.nz) / mb; b.w -= (j * rnb) / b.inertia;
    const impact = -vn;
    if (impact > 2) {
      game?.onCarImpact(a, b, impact, _ch.cx, _ch.cz);
      if (impact > 4) {
        a.damage((impact - 4) * 1.6 * (mb / (ma + mb)) * 2, game);
        b.damage((impact - 4) * 1.6 * (ma / (ma + mb)) * 2, game);
      }
    }
  }
  a.updateObb(); b.updateObb();
}
