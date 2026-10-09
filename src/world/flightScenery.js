// The outside of the flight (DESIGN §5.6; WP-A2): the static airframe around the cut-away cabin, the
// Arlanda gate-set exterior, and the animated scenery that moves past the plane per flight phase
// (snowy apron and runway, the cloud deck, streaming puffs, the sea, Gran Canaria, the Gando runway).
//
//   buildFlightScenery(scene) -> { airframe, scenery, gateVisual, setPhaseVisual(name, t), setGateVisible(on), tick(dt) }
//   buildPlaneExterior(group, { gear = true, cutaway = false }) -> group   (the airport block reuses it)
//
// Coordinates are plane-local: nose +z, port (left) +x, cabin floor y 0.15, origin = cabin centre
// (world x = 3000 in the flight level). With the gear down the wheels stand on PLANE_GROUND_Y.
//
// Rules this file keeps (DESIGN §5.3, §5.6):
// - The airframe never moves; only `scenery.rotation.x/z` tilts. The cabin writes rotation.z
//   (turbulence wobble); this file owns the pitch (rotation.x, positive = nose up) and rewrites it
//   every tick from the phase clock.
// - Nothing on the airframe is higher than y 3 within 7 m aft of the rear wall (z -20): the tail is
//   cut at y 2.6 (a lid) back to z -27, where the closed tail cone and the fin start.
// - Any airframe part whose bounding box contains the render camera is hidden for that frame.
// - The cut hull leaves the port front door (z 14..15.4) open while the gate set is up.
// - Clouds are instanced; per-frame work writes into preallocated buffers only (no allocations).
// - Everything is kept at local x >= -850, so nothing renders behind the island (|x| <= 1150) in
//   its fog range; the whole set is also switched off whenever the camera is far from the plane.
//
// Invented for the game (§1.6): the SunTrip livery and the plane's name "Sol-Viking" SE-SOL
// (the film's plane is a Scanair DC-8-62); the de-icing truck, the cut-away styling.

import { THREE, GeoBuilder, toonMesh, signMesh, toonGradient, outlineMat, outlineGeometry, PRIM, MAT, camera } from '../gfx.js';

const CX = 3000;
export const PLANE_GROUND_Y = -4.65;   // wheel contact height (plane-local) with the gear down
const GY = PLANE_GROUND_Y;
const LEN = { takeoff: 12, climb: 8, approach: 14, landing: 6 };   // = cabin.js PHASE_LEN

const COL = {
  white: 0xf4f4f0, belly: 0xb8bec6, cheat: 0x1b2f6b, pin: 0x6f9fd8, sun: 0xf07a1e, cap: 0xc8202a,
  rim: 0xf2e8cf, cut: 0xe6d9ba, window: 0xb4cde2, cockpit: 0x223040, radome: 0x4a4f58, seam: 0x8a9098,
  wing: 0xc9ced6, flap: 0xa7aeb8, pod: 0xd5d9de, lip: 0xeef0f2, intake: 0x262b33, nozzle: 0x585c63,
  strut: 0xc8ccd2, tyre: 0x26262c, hub: 0x9aa0a8,
  snow: 0xf2f4f6, snowShade: 0xdfe6ec, apron: 0xaeb3b9, slush: 0x7d838b, asphalt: 0x5a5e66, mark: 0xf4f4f0,
  yellow: 0xf7c31b, orange: 0xd8743a, wood: 0x9a6a3a, cream: 0xe8e0cc, brown: 0x6a4a32, glass: 0x34424f,
  pine: 0x2c4a38, pineSnow: 0xdde6e4, trunk: 0x5a4030, concrete: 0xb8b0a2, steel: 0x8c9096, dark: 0x3a3a40,
  sand: 0xe8cf98, ochre: 0xc9a26b, dirt: 0xb48a58, rock1: 0xa5532f, rock2: 0xc27a45, rock3: 0x9a6a48,
  whitewash: 0xf4efe6, terracotta: 0xc0623a, palm: 0x3f7a3a, palmTrunk: 0x8a6a4a, foam: 0xeaf6fb,
  greenhouse: 0xd9dcd6, field: 0x7f8f4a,
};

// ---------------------------------------------------------------------------------------------
// Small build-time helpers (allocation is fine here; nothing below runs per frame).

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const _m4 = new THREE.Matrix4(), _va = new THREE.Vector3(), _vb = new THREE.Vector3(), _vu = new THREE.Vector3();
// Turn obj so its local +z faces (nx, ny, nz) and its local +y leans towards (ux, uy, uz).
function orient(obj, nx, ny, nz, ux = 0, uy = 1, uz = 0) {
  _m4.lookAt(_va.set(nx, ny, nz), _vb.set(0, 0, 0), _vu.set(ux, uy, uz));
  obj.quaternion.setFromRotationMatrix(_m4);
}
// Painted lettering: a transparent text plane (no board) facing n.
function decal(parent, text, w, h, x, y, z, n, opts = {}, up = [0, 1, 0]) {
  const m = signMesh(text, w, h, { bg: null, border: null, fg: '#1b2f6b', scale: 0.86, ...opts });
  m.position.set(x, y, z);
  orient(m, n[0], n[1], n[2], up[0], up[1], up[2]);
  parent.add(m);
  return m;
}
// Raw geometry -> GeoBuilder part.
function geoFrom(pos, nor, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (nor) g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (idx) g.setIndex(idx);
  if (!nor) g.computeVertexNormals();
  return g;
}
// A convex hexahedron from 8 corners: P[0..3] one ring, P[4..7] the opposite ring in the same order.
// Faces are flat-shaded and turned outwards.
function hexa(g, color, P) {
  const F = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  let cx = 0, cy = 0, cz = 0;
  for (const p of P) { cx += p[0] / 8; cy += p[1] / 8; cz += p[2] / 8; }
  const pos = [];
  const tri = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (a[0] + b[0] + c[0]) / 3 - cx, my = (a[1] + b[1] + c[1]) / 3 - cy, mz = (a[2] + b[2] + c[2]) / 3 - cz;
    if (nx * mx + ny * my + nz * mz < 0) pos.push(...a, ...c, ...b); else pos.push(...a, ...b, ...c);
  };
  for (const [a, b, c, d] of F) { tri(P[a], P[b], P[c]); tri(P[a], P[c], P[d]); }
  g.add(geoFrom(pos), color);
}
// A tapered slab (wing, fin, tailplane): two chord lines (root, tip), each [x, y, zLE, zTE, thick];
// `vertical` puts the thickness along x (a fin) instead of y.
function slab(g, color, root, tip, vertical = false) {
  const ring = (s, sgn) => {
    const [x, y, le, te, th] = s, h = (th / 2) * sgn;
    return vertical ? [[x + h, y, le], [x + h, y, te]] : [[x, y + h, le], [x, y + h, te]];
  };
  const [r0, r1] = ring(root, -1), [t0, t1] = ring(tip, -1), [R0, R1] = ring(root, 1), [T0, T1] = ring(tip, 1);
  hexa(g, color, [r0, r1, t1, t0, R0, R1, T1, T0]);
}

// ---------------------------------------------------------------------------------------------
// The DC-8 fuselage: stations [z, centre y, radius], tail tip to nose tip. The cabin section is a
// plain cylinder (centre y 1.35, r 3.7: the cut at y 2.6 lands on the outer face of the 1 m cabin walls).

const ST = [
  [-36.6, 3.15, 0.08], [-35.4, 3.05, 0.62], [-33.2, 2.78, 1.3], [-30.8, 2.42, 1.95], [-28.4, 2.08, 2.5],
  [-27.0, 1.92, 2.78], [-25.4, 1.76, 3.04], [-23.0, 1.54, 3.38], [-21.0, 1.4, 3.62], [-20.0, 1.35, 3.7],
  [-8.0, 1.35, 3.7], [4.0, 1.35, 3.7], [18.4, 1.35, 3.7], [20.0, 1.33, 3.62], [21.5, 1.28, 3.42],
  [23.0, 1.18, 3.08], [24.3, 1.04, 2.62], [25.4, 0.9, 2.05], [26.4, 0.76, 1.42], [27.2, 0.66, 0.8],
  [27.8, 0.6, 0.28], [28.0, 0.58, 0.03],
];
const Y_CUT = 2.6, Z_TAILCUT = -27, Z_NOSE = 18.4, Z_REAR = -20, DOOR = [14.0, 15.4];
// Livery bands by height: [yLo, yHi, colour].
const BANDS = [[1.95, 99, COL.white], [1.35, 1.95, COL.cheat], [1.2, 1.35, COL.pin], [-0.25, 1.2, COL.white], [-99, -0.25, COL.belly]];

function stAt(z) {
  if (z <= ST[0][0]) return ST[0].slice();
  for (let i = 1; i < ST.length; i++) {
    if (z <= ST[i][0]) {
      const a = ST[i - 1], b = ST[i], f = (z - a[0]) / (b[0] - a[0]);
      return [z, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
  }
  return ST[ST.length - 1].slice();
}
function slice(z0, z1) {
  const out = [stAt(z0)];
  for (const s of ST) if (s[0] > z0 + 1e-6 && s[0] < z1 - 1e-6) out.push(s.slice());
  out.push(stAt(z1));
  return out;
}
const deriv = (z) => { const h = 0.35, a = stAt(z - h), b = stAt(z + h); return [(b[1] - a[1]) / (2 * h), (b[2] - a[2]) / (2 * h)]; };
// Half-width of the hull at height y (0 if above/below the section).
const hullX = (z, y) => { const [, cy, r] = stAt(z); const d = y - cy; return d * d < r * r ? Math.sqrt(r * r - d * d) : 0; };

// One livery band of the hull on one side (+1 port, -1 starboard) between z0..z1 and heights yLo..yHi.
// Analytic normals, so bands of different colours meet without a lighting seam.
function band(g, color, z0, z1, yLo, yHi, side, nA = 5, dr = 0) {
  if (z1 - z0 < 1e-4 || yHi <= yLo) return;
  const secs = slice(z0, z1);
  const pos = [], nor = [], idx = [];
  for (const [z, cy, r0] of secs) {
    const r = r0 + dr;
    const tTop = Math.acos(clamp((yHi - cy) / r, -1, 1)), tBot = Math.acos(clamp((yLo - cy) / r, -1, 1));
    const [dcy, drr] = deriv(z);
    for (let j = 0; j <= nA; j++) {
      const th = (tTop + ((tBot - tTop) * j) / nA) * side;
      const s = Math.sin(th), c = Math.cos(th);
      pos.push(r * s, cy + r * c, z);
      const nx = s, ny = c, nz = -(dcy * c + drr), l = Math.hypot(nx, ny, nz) || 1;
      nor.push(nx / l, ny / l, nz / l);
    }
  }
  const W = nA + 1;
  for (let i = 0; i < secs.length - 1; i++) {
    for (let j = 0; j < nA; j++) {
      const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
      if (side > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
  }
  g.add(geoFrom(pos, nor, idx), color);
}
// Every livery band of one hull piece/side. yMax cuts the top off (the cut-away); gap leaves the
// port door open between the floor and the cut.
function hullPiece(g, z0, z1, side, yMax, gap = null) {
  for (const [lo, hi0, color] of BANDS) {
    const hi = Math.min(hi0, yMax);
    if (hi <= lo) continue;
    const n = hi - lo > 3 ? 7 : hi - lo > 0.4 ? 3 : 1;
    if (gap && hi > 0.15 && lo < Y_CUT) {
      if (lo < 0.15) band(g, color, z0, z1, lo, 0.15, side, n);
      const l2 = Math.max(lo, 0.15);
      band(g, color, z0, gap[0], l2, hi, side, n);
      band(g, color, gap[1], z1, l2, hi, side, n);
    } else band(g, color, z0, z1, lo, hi, side, n);
  }
}
// A flat cap of the section above yCut at z, facing dir (+1 = +z).
function capAbove(g, color, z, yCut, dir) {
  const [, cy, r] = stAt(z);
  if (cy + r <= yCut) return;
  const tc = Math.acos(clamp((yCut - cy) / r, -1, 1)), n = 14, pos = [];
  for (let j = 0; j < n; j++) {
    const a0 = -tc + (2 * tc * j) / n, a1 = -tc + (2 * tc * (j + 1)) / n;
    const p0 = [r * Math.sin(a0), cy + r * Math.cos(a0), z], p1 = [r * Math.sin(a1), cy + r * Math.cos(a1), z], c = [0, yCut, z];
    if (dir > 0) pos.push(...c, ...p1, ...p0); else pos.push(...c, ...p0, ...p1);
  }
  g.add(geoFrom(pos), color);
}
// The flat lid over the cut tail section (y = yCut, z0..z1), facing up.
function lid(g, color, z0, z1, y) {
  const secs = slice(z0, z1), pos = [], idx = [];
  for (const [z] of secs) { const x = hullX(z, y); pos.push(-x, y, z, x, y, z); }
  for (let i = 0; i < secs.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const nor = []; for (let i = 0; i < pos.length / 3; i++) nor.push(0, 1, 0);
  g.add(geoFrom(pos, nor, idx), color);
}
// A seam line drawn on the hull at fixed z from y0 to y1 (small boxes following the curve).
function seamV(g, color, z, y0, y1, side, w = 0.07) {
  const n = 5;
  for (let k = 0; k < n; k++) {
    const ya = lerp(y0, y1, k / n), yb = lerp(y0, y1, (k + 1) / n), xa = hullX(z, ya), xb = hullX(z, yb);
    const len = Math.hypot(xb - xa, yb - ya), rz = Math.atan2(yb - ya, xb - xa) - Math.PI / 2;
    g.box(color, side * ((xa + xb) / 2 + 0.015), (ya + yb) / 2, z, w, len + 0.02, w, 0, 0, side * rz);
  }
}
function seamH(g, color, y, z0, z1, side, w = 0.07) {
  const x = hullX((z0 + z1) / 2, y), [, cy, r] = stAt((z0 + z1) / 2);
  const rz = -Math.asin(clamp((y - cy) / r, -1, 1));
  g.box(color, side * (x + 0.015), y, (z0 + z1) / 2, w, w, z1 - z0, 0, 0, side * rz);
}
function doorOutline(g, z0, z1, y0, y1, side) {
  seamV(g, COL.seam, z0, y0, y1, side); seamV(g, COL.seam, z1, y0, y1, side);
  seamH(g, COL.seam, y0, z0, z1, side); seamH(g, COL.seam, y1, z0, z1, side);
}

const ROW_Z = [];
for (let row = 1; row <= 24; row++) if (row !== 13) ROW_Z.push(12.4 - 1.2 * (row <= 12 ? row - 1 : row - 2));

// Wing planform (|x| from 2.6 at the root to 21 at the tip).
const WING = {
  y: (ax) => -0.85 + 0.6 * (ax - 2.6) / 18.4,
  le: (ax) => 6 - 8.5 * (ax - 2.6) / 18.4,
  te: (ax) => -4 - 1.5 * (ax - 2.6) / 18.4,
  th: (ax) => 0.8 - 0.56 * (ax - 2.6) / 18.4,
};
const ENGINE_X = [8, 14];

// ---------------------------------------------------------------------------------------------
// The exterior. cutaway: the flight set (top cut off along the cabin, port door open, tail lid);
// otherwise a closed DC-8 (the parked plane at the Gando block).

export function buildPlaneExterior(group, { gear = true, cutaway = false } = {}) {
  const gBody = new GeoBuilder(), gNose = new GeoBuilder(), gTail = new GeoBuilder(), gWing = new GeoBuilder();
  const gFin = new GeoBuilder(), gGear = new GeoBuilder(), gDoor = new GeoBuilder(), gLight = new GeoBuilder(), gBeacon = new GeoBuilder();
  const top = cutaway ? Y_CUT : 99;

  // ---- fuselage ----
  for (const side of [1, -1]) {
    // Tail cone: closed aft of Z_TAILCUT, cut (lid) between there and the rear wall.
    hullPiece(gTail, ST[0][0], Z_TAILCUT, side, 99);
    hullPiece(gTail, Z_TAILCUT, Z_REAR, side, top);
    // Cabin section. Port: the front door gap (cutaway) or a door outline.
    hullPiece(gBody, Z_REAR, Z_NOSE, side, top, cutaway && side > 0 ? DOOR : null);
    // Nose: closed, radome tip in grey.
    hullPiece(gNose, Z_NOSE, 26.3, side, 99);
    band(gNose, COL.radome, 26.3, 28.0, -99, 99, side, 8);
    // Cockpit windows: a dark band laid just proud of the skin.
    band(gNose, COL.cockpit, 22.6, 24.9, 2.25, 3.05, side, 2, 0.03);
    // Cabin windows along the cheat line, one per row (rows 1-24, no 13), plus two by the cockpit.
    const wx = hullX(0, 1.65) + 0.0;
    for (const z of ROW_Z) gBody.box(COL.window, side * wx, 1.65, z - 0.25, 0.12, 0.42, 0.34);
    for (const z of [19.3, 20.4]) gNose.box(COL.window, side * (hullX(z, 1.65) - 0.02), 1.65, z, 0.12, 0.42, 0.34, 0, 0, side * 0.08);
    // Doors: rear on both sides, front starboard service door; front port only on the closed plane.
    doorOutline(gBody, -18.6, -17.3, 0.3, 2.45, side);
    if (side < 0) { doorOutline(gBody, 14.2, 15.5, 0.3, 2.45, side); doorOutline(gBody, 7.6, 9.8, -1.35, -0.35, side); }
    else if (!cutaway) doorOutline(gBody, DOOR[0] + 0.05, DOOR[1] - 0.05, 0.3, 2.45, side);
    else {
      // The closed front door, shown while the gate set is down (flight phases).
      hullPiece(gDoor, DOOR[0], DOOR[1], 1, Y_CUT);
      gDoor.parts.length && doorOutline(gDoor, DOOR[0] + 0.05, DOOR[1] - 0.05, 0.3, 2.45, 1);
    }
  }
  if (cutaway) {
    lid(gTail, COL.cut, Z_TAILCUT, Z_REAR, Y_CUT);
    capAbove(gTail, COL.cut, Z_TAILCUT, Y_CUT, 1);
    capAbove(gNose, COL.cut, Z_NOSE, Y_CUT, -1);
    // Cream rim on the cut wall tops, a little proud of the hull.
    for (const s of [1, -1]) gBody.box(COL.rim, s * 3.43, Y_CUT + 0.04, (Z_REAR + Z_NOSE) / 2, 0.36, 0.09, Z_NOSE - Z_REAR);
  }
  // Belly fairing where the wing meets the fuselage.
  gBody.sphere(COL.belly, 0, -1.95, 0.8, 7.2, 1.7, 15, 0, 0, 0, 18);

  // ---- wings, engines, tailplane ----
  for (const s of [1, -1]) {
    const R = 2.6, T = 21, split = (ax) => WING.te(ax) + 0.24 * (WING.le(ax) - WING.te(ax));
    slab(gWing, COL.wing, [s * R, WING.y(R), WING.le(R), split(R), WING.th(R)], [s * T, WING.y(T), WING.le(T), split(T), WING.th(T)]);
    slab(gWing, COL.flap, [s * R, WING.y(R) - 0.05, split(R), WING.te(R), WING.th(R) * 0.6], [s * T, WING.y(T) - 0.02, split(T), WING.te(T), WING.th(T) * 0.6]);
    // A thin lighter leading-edge strip on top reads as the wing's front edge from above.
    slab(gWing, COL.lip, [s * R, WING.y(R) + WING.th(R) / 2 + 0.01, WING.le(R), WING.le(R) - 0.7, 0.03], [s * T, WING.y(T) + WING.th(T) / 2 + 0.01, WING.le(T), WING.le(T) - 0.4, 0.03]);
    for (const ax of ENGINE_X) {
      const x = s * ax, wb = WING.y(ax) - WING.th(ax) / 2, y = wb - 1.4, le = WING.le(ax);
      gWing.cyl(COL.pod, x, y, le - 0.5, 0.84, 4.6, 16, Math.PI / 2);
      gWing.cyl(COL.lip, x, y, le + 1.9, 0.88, 0.3, 16, Math.PI / 2);
      gWing.cyl(COL.intake, x, y, le + 2.06, 0.66, 0.04, 16, Math.PI / 2);
      gWing.cone(COL.nozzle, x, y, le + 2.0, 0.26, 0.5, 10, Math.PI / 2);
      gWing.cyl(COL.belly, x, y, le - 3.05, 0.74, 0.6, 16, Math.PI / 2);
      gWing.cone(COL.nozzle, x, y, le - 3.9, 0.58, 1.2, 12, -Math.PI / 2);
      gWing.box(COL.pod, x, (y + 0.7 + wb) / 2 + 0.1, le - 1.2, 0.3, wb - (y + 0.7) + 0.3, 3.6);
    }
    slab(gWing, COL.white, [s * 1.0, 2.95, -29.6, -33.8, 0.42], [s * 8.6, 3.45, -33.6, -35.6, 0.16]);
    // Wingtip navigation lights: red port, green starboard.
    gLight.sphere(s > 0 ? 0xff3030 : 0x30e060, s * 21.05, WING.y(21) + 0.05, WING.te(21) + 1.0, 0.22);
  }
  gLight.sphere(0xffffff, 0, 3.15, -36.7, 0.2);

  // ---- fin: SunTrip sun, red cap ----
  // Chords [x, y, zLE, zTE, thickness] at the root (inside the tail cone) and under the cap.
  const finRoot = [0, 3.4, -27.2, -34.3, 0.56], finTop = [0, 11.5, -31.5, -34.9, 0.32];
  const finSlab = (y0, y1, c) => {
    const f = (y) => (y - finRoot[1]) / (finTop[1] - finRoot[1]);
    const at = (y) => [0, y, lerp(finRoot[2], finTop[2], f(y)), lerp(finRoot[3], finTop[3], f(y)), lerp(finRoot[4], finTop[4], f(y))];
    const a = at(y0), b = at(y1);
    hexa(gFin, c, [[-a[4] / 2, y0, a[2]], [-a[4] / 2, y0, a[3]], [-b[4] / 2, y1, b[3]], [-b[4] / 2, y1, b[2]],
      [a[4] / 2, y0, a[2]], [a[4] / 2, y0, a[3]], [b[4] / 2, y1, b[3]], [b[4] / 2, y1, b[2]]]);
  };
  finSlab(3.4, 11.5, COL.white);
  finSlab(11.5, 12.3, COL.cap);
  const finAt = (y) => { const f = (y - 3.4) / 8.1; return { le: lerp(-27.2, -31.5, f), te: lerp(-34.3, -34.9, f), th: lerp(0.56, 0.32, f) }; };
  { const a = finAt(8.4); for (const s of [1, -1]) gFin.cyl(COL.sun, s * (a.th / 2 + 0.03), 8.4, (a.le + a.te) / 2 + 0.1, 1.5, 0.05, 28, 0, 0, Math.PI / 2); }
  gBeacon.sphere(0xff2a2a, 0, 12.4, -33.6, 0.24);
  gBeacon.sphere(0xff2a2a, 0, -2.7, 2.5, 0.24);

  // ---- landing gear (wheels stand on GY) ----
  if (gear || cutaway) {
    for (const s of [1, -1]) {
      const x = s * 4.4, wb = WING.y(4.4) - WING.th(4.4) / 2, ay = GY + 0.65;
      gGear.cyl(COL.strut, x, (wb + ay) / 2, -1.5, 0.17, wb - ay, 8);
      gGear.box(COL.strut, x, ay, -1.5, 0.24, 0.24, 1.9);
      gGear.box(COL.hub, x, (wb + ay) / 2 + 0.6, -1.0, 0.1, (wb - ay) * 0.7, 0.1, 0, -0.35, 0);
      for (const dz of [-0.75, 0.75]) for (const dx of [-0.38, 0.38]) {
        gGear.cyl(COL.tyre, x + dx, ay, -1.5 + dz, 0.65, 0.4, 14, 0, 0, Math.PI / 2);
        gGear.cyl(COL.hub, x + dx * 1.06, ay, -1.5 + dz, 0.32, 0.4, 10, 0, 0, Math.PI / 2);
      }
    }
    const nz = 21.6, hb = stAt(nz)[1] - stAt(nz)[2], ay = GY + 0.5;
    gGear.cyl(COL.strut, 0, (hb + ay) / 2 + 0.2, nz, 0.14, hb - ay + 0.4, 8);
    for (const dx of [-0.3, 0.3]) { gGear.cyl(COL.tyre, dx, ay, nz, 0.5, 0.3, 12, 0, 0, Math.PI / 2); gGear.cyl(COL.hub, dx * 1.12, ay, nz, 0.24, 0.3, 8, 0, 0, Math.PI / 2); }
  }

  const parts = {};
  const add = (name, gb, outline = 0.04) => {
    if (gb.empty) return null;
    const m = toonMesh(gb.build(), { outline });
    m.name = name;
    group.add(m);
    parts[name] = m;
    return m;
  };
  add('body', gBody); add('nose', gNose); add('tail', gTail); add('wings', gWing); add('fin', gFin);
  if (gear || cutaway) add('gear', gGear, 0.03);
  if (cutaway) add('doorPatch', gDoor, 0.02);
  const lightMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  for (const [name, gb] of [['lights', gLight], ['beacon', gBeacon]]) {
    const m = new THREE.Mesh(gb.build(), lightMat);
    m.name = name;
    group.add(m);
    parts[name] = m;
  }

  // ---- lettering: SUNTRIP titles, SOL-VIKING, SE-SOL, the fin ----
  const signs = new THREE.Group();
  signs.name = 'livery';
  const onHull = (text, w, h, z, y, side, opts) => {
    const [, cy, r] = stAt(z), d = y - cy, x = Math.sqrt(r * r - d * d), nx = x / r, ny = d / r;
    decal(signs, text, w, h, side * (x + 0.035), y, z, [side * nx, ny, 0], opts);
  };
  for (const s of [1, -1]) {
    onHull('SUNTRIP', 7.2, 0.62, 3.2, 2.27, s, { scale: 0.92 });
    onHull('SOL-VIKING', 2.6, 0.4, 20.6, 2.28, s, { scale: 0.9 });
    onHull('SE-SOL', 2.1, 0.46, -22.6, 2.15, s, { scale: 0.9 });
    const a = finAt(5.7);
    decal(signs, 'SUNTRIP', 4.2, 0.95, s * (a.th / 2 + 0.03), 5.7, (a.le + a.te) / 2 + 0.2, [s, 0, 0], { scale: 0.9 });
  }
  group.add(signs);
  parts.livery = signs;

  group.userData.parts = parts;
  group.userData.engines = [];
  for (const s of [1, -1]) for (const ax of ENGINE_X) {
    const wb = WING.y(ax) - WING.th(ax) / 2;
    group.userData.engines.push([s * ax, wb - 1.4, WING.le(ax) - 4.5, WING.le(ax) + 2.1]);
  }
  group.userData.mainGear = [[4.4, GY + 0.2, -1.5], [-4.4, GY + 0.2, -1.5]];
  return group;
}

// ---------------------------------------------------------------------------------------------
// Scenery pieces.

function pine(g, x, y, z, h, snowy = true) {
  g.cyl(COL.trunk, x, y + h * 0.1, z, h * 0.05, h * 0.2, 5);
  g.cone(COL.pine, x, y + h * 0.42, z, h * 0.3, h * 0.6, 7);
  g.cone(snowy ? COL.pineSnow : COL.pine, x, y + h * 0.78, z, h * 0.19, h * 0.42, 7);
}
function palm(g, rnd, x, y, z, h) {
  const lean = (rnd() - 0.5) * 0.25, lz = (rnd() - 0.5) * 0.25;
  for (let k = 0; k < 3; k++) g.cyl(COL.palmTrunk, x + lean * h * (k + 0.5) / 3, y + h * (k + 0.5) / 3, z + lz * h * (k + 0.5) / 3, h * 0.05 * (1 - k * 0.15), h / 3 + 0.05, 6, lz, 0, -lean);
  const tx = x + lean * h, tz = z + lz * h, ty = y + h;
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + rnd() * 0.4, L = h * 0.42;
    g.box(COL.palm, tx + Math.sin(a) * L * 0.45, ty - L * 0.12, tz + Math.cos(a) * L * 0.45, L * 0.22, 0.08, L, a, 0.35, 0);
  }
  g.sphere(0x6a5a2a, tx, ty - 0.2, tz, h * 0.09);
}
// A boxy 1970s car (axis along z).
function car(g, x, y, z, color, ry = 0, snowRoof = false) {
  const c = Math.cos(ry), s = Math.sin(ry), P = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  let [px, pz] = P(0, 0);
  g.boxB(color, px, y + 0.35, pz, 1.75, 0.6, 4.4, ry);
  g.boxB(COL.glass, px, y + 0.95, pz - 0.2 * c, 1.55, 0.5, 2.2, ry);
  g.boxB(snowRoof ? COL.snow : color, px, y + 1.45, pz - 0.2 * c, 1.6, 0.1, 2.0, ry);
  for (const [dx, dz] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) { [px, pz] = P(dx, dz); g.cyl(COL.tyre, px, y + 0.33, pz, 0.33, 0.25, 8, 0, ry, Math.PI / 2); }
}
function wheelPair(g, x, y, z, r, w, gap) { for (const s of [-1, 1]) g.cyl(COL.tyre, x + s * gap, y + r, z, r, w, 10, 0, 0, Math.PI / 2); }

// Cloud lump clusters (unit size ~2 x 0.7 x 1.6), one geometry shared by every instance.
function cloudGeo(seed, lumps, flat) {
  const rnd = rng(seed), g = new GeoBuilder();
  g.sphere(0xffffff, 0, 0, 0, 2.0, flat ? 0.5 : 0.9, 1.6, 0, 0, 0, 12);
  for (let k = 0; k < lumps; k++) {
    const a = (k / lumps) * Math.PI * 2 + rnd() * 0.6, d = 0.25 + rnd() * 0.45, s = 0.55 + rnd() * 0.55;
    g.sphere(0xffffff, Math.cos(a) * d, (flat ? 0.12 : 0.2) + rnd() * 0.22, Math.sin(a) * d * 0.75, s, s * (flat ? 0.7 : 0.9), s, 0, 0, 0, 8);
  }
  g.sphere(0xffffff, 0, flat ? 0.35 : 0.5, 0, 0.7, 0.6, 0.7, 0, 0, 0, 10);
  return g.build();
}

// An instanced cloud layer with an ink outline sharing the instance matrices (the outline offset is
// applied before the instance scale, so `outline` is in unit-cluster units). Per-frame updates
// only write the translation of each instance (base position + scroll), or park it far below.
function cloudLayer(geo, mat, n, outline, outlineColor, seed, place) {
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const line = new THREE.InstancedMesh(outlineGeometry(geo), outlineMat(outline, outlineColor), n);
  line.instanceMatrix = mesh.instanceMatrix;
  mesh.frustumCulled = line.frustumCulled = false;
  mesh.castShadow = mesh.receiveShadow = false;
  mesh.add(line);
  const rnd = rng(seed);
  const D = { x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), w: new Float32Array(n), h: new Float32Array(n) };
  const q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), m = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const o = place(rnd, i);
    D.x[i] = o.x; D.y[i] = o.y; D.z[i] = o.z; D.w[i] = o.sx * 1.25; D.h[i] = o.sy * 0.8;
    m.compose(p.set(o.x, o.y, o.z), q.setFromEuler(e.set(0, rnd() * Math.PI * 2, 0)), sc.set(o.sx, o.sy, o.sz));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.setHex(0xffffff).lerp(col.clone().setHex(0xdfe8f3), rnd() * 0.7));
  }
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return { mesh, line, D, arr: mesh.instanceMatrix.array, n };
}

// ---------------------------------------------------------------------------------------------

export function buildFlightScenery(scene) {
  const airframe = new THREE.Group();
  airframe.name = 'airframe';
  airframe.position.set(CX, 0, 0);
  buildPlaneExterior(airframe, { gear: true, cutaway: true });
  scene.add(airframe);
  const P = airframe.userData.parts;

  const scenery = new THREE.Group();
  scenery.name = 'flightScenery';
  scenery.position.set(CX, 0, 0);
  scene.add(scenery);
  const sub = (name) => { const g = new THREE.Group(); g.name = name; scenery.add(g); return g; };
  const ground = sub('ground'), deck = sub('deck'), puffs = sub('puffs'), sea = sub('sea'), island = sub('island'), landingStrip = sub('landingStrip');

  const gateVisual = new THREE.Group();
  gateVisual.name = 'gateVisual';
  gateVisual.position.set(CX, 0, 0);
  scene.add(gateVisual);

  const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient() });
  const R = rng(1979);

  // ================= ground (Arlanda: snowfield, forest, runway for the takeoff roll) ==========
  let drifts;
  {
    const g = new GeoBuilder(), gd = new GeoBuilder();
    g.cyl(COL.snow, 0, GY - 0.06, 120, 640, 0.1, 48);
    // Low snow drifts break the white plain up a little. At the gate only: during the takeoff roll
    // they would stand still while the runway tile scrolls past (the tile has its own).
    for (let k = 0; k < 70; k++) {
      const a = R() * Math.PI * 2, d = 60 + R() * 520, x = Math.cos(a) * d, z = 120 + Math.sin(a) * d;
      if (x < -850 + 30 || (x > -70 && x < 95 && z > -140 && z < 200)) continue;
      gd.sphere(COL.snowShade, x, GY, z, 8 + R() * 20, 1.2 + R() * 1.5, 6 + R() * 14);
    }
    const m = toonMesh(g.build(), { outline: 0, cast: false });
    m.name = 'snowfield';
    ground.add(m);
    drifts = toonMesh(gd.build(), { outline: 0, cast: false });
    drifts.name = 'drifts';
    ground.add(drifts);
  }
  const runwayTile = new THREE.Group();
  runwayTile.name = 'runway';
  ground.add(runwayTile);
  const RUN_P = 240;   // the runway pattern repeats every 240 m; the tile scrolls modulo that
  {
    const g = new GeoBuilder(), gl = new GeoBuilder(), gd = new GeoBuilder(), r = rng(8);
    const z0 = -2 * RUN_P, z1 = 3 * RUN_P;
    g.boxB(COL.asphalt, 0, GY, (z0 + z1) / 2, 50, 0.04, z1 - z0);
    g.boxB(COL.slush, 0, GY + 0.002, (z0 + z1) / 2, 6, 0.04, z1 - z0);
    for (const s of [-1, 1]) {
      g.boxB(COL.mark, s * 23.6, GY + 0.004, (z0 + z1) / 2, 0.7, 0.04, z1 - z0);
      g.boxB(COL.snow, s * 31, GY - 0.05, (z0 + z1) / 2, 10, 0.12, z1 - z0);   // cleared shoulder edge
    }
    for (let t = 0; t < 5; t++) {
      const zt = z0 + t * RUN_P;
      for (let k = 0; k < RUN_P; k += 40) g.boxB(COL.mark, 0, GY + 0.006, zt + k + 10, 0.9, 0.04, 20);
      for (let k = 0; k < RUN_P; k += 30) for (const s of [-1, 1]) {
        gl.sphere(0xffe9a8, s * 26.2, GY + 0.35, zt + k, 0.28);
        g.cyl(COL.dark, s * 26.2, GY + 0.15, zt + k, 0.08, 0.3, 5);
      }
      // Plough banks along the shoulders.
      const rr = rng(40 + t);
      for (let k = 0; k < 12; k++) for (const s of [-1, 1]) {
        const zz = zt + rr() * RUN_P, len = 10 + rr() * 22;
        g.sphere(COL.snow, s * (36 + rr() * 4), GY, zz, 3 + rr() * 2, 1.6 + rr() * 1.4, len);
      }
      // Low drifts in the field between the banks and the forest (scroll with the tile; soft, no
      // outline, like the gate's).
      const rd = rng(140 + t);
      for (let k = 0; k < 10; k++) {
        const s = rd() < 0.5 ? -1 : 1, x = s * (50 + rd() * 28), z = zt + rd() * RUN_P;
        if (s < 0 && Math.abs(z - (zt + 120)) < 20) continue;   // the turn-off
        gd.sphere(COL.snowShade, x, GY, z, 6 + rd() * 10, 0.8 + rd() * 1.0, 6 + rd() * 12);
      }
      // A taxiway sign and a turn-off per tile.
      const zs = zt + 120;
      g.boxB(COL.asphalt, -60, GY - 0.01, zs, 70, 0.04, 22, 0);
      g.boxB(COL.yellow, -60, GY + 0.003, zs, 70, 0.04, 0.4);
      g.boxB(COL.dark, -30, GY, zs - 14, 0.15, 1.3, 0.15);
      g.boxB(COL.yellow, -30, GY + 1.3, zs - 14, 2.6, 1.0, 0.25);
      // Snowy pines beyond the field.
      const rf = rng(90 + t);
      for (let k = 0; k < 70; k++) {
        const s = rf() < 0.5 ? -1 : 1, x = s * (85 + rf() * 140), z = zt + rf() * RUN_P;
        if (x < -840) continue;
        pine(g, x, GY, z, 9 + rf() * 9);
      }
    }
    const m = toonMesh(g.build(), { outline: 0.05, cast: false });
    runwayTile.add(m);
    runwayTile.add(toonMesh(gd.build(), { outline: 0, cast: false }));
    runwayTile.add(new THREE.Mesh(gl.build(), new THREE.MeshBasicMaterial({ vertexColors: true })));
  }

  // ================= deck (the cloud sea) ========================================================
  const DECK_X = 620, DECK_Z = 760, DECK_FLOOR = -25;
  const deckL = cloudLayer(cloudGeo(5, 6, true), cloudMat, 150, 0.006, 0x8aa8cc, 77, (r) => {
    const s = 22 + r() * 30;
    return { x: (r() - 0.5) * 2 * DECK_X, y: -24 + r() * 7, z: (r() - 0.5) * 2 * DECK_Z, sx: s, sy: s * (0.55 + r() * 0.35), sz: s * (0.8 + r() * 0.4) };
  });
  deck.add(deckL.mesh);
  const deckFloor = new THREE.Mesh(new THREE.PlaneGeometry(1700, 2 * DECK_Z + 400).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ color: 0xe6eef8, gradientMap: toonGradient() }));
  deckFloor.position.y = DECK_FLOOR;
  deck.add(deckFloor);

  // ================= puffs (streaming past the plane in climb/approach; a few drift by in cruise)
  const PUFF_Z = 270;
  const puffL = cloudLayer(cloudGeo(9, 6, false), cloudMat, 44, 0.012, 0x9ab4d4, 31, (r) => {
    const s = 6 + r() * 11, side = r() < 0.5 ? -1 : 1;
    const low = r() < 0.35;   // some pass under the plane, the rest beside and above
    return { x: low ? (r() - 0.5) * 120 : side * (14 + s * 1.5 + r() * 80), y: low ? -12 - r() * 16 : -14 + r() * 30, z: (r() - 0.5) * 2 * PUFF_Z, sx: s, sy: s * 0.85, sz: s };
  });
  puffs.add(puffL.mesh);

  // ================= sea =========================================================================
  const SEA_P = 200;
  const seaFoam = new THREE.Group();
  {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2350, 3200).rotateX(-Math.PI / 2), MAT.water);
    plane.position.set(325, GY - 0.7, 300);
    sea.add(plane);
    const g = new GeoBuilder(), r = rng(12);
    for (let t = -4; t <= 4; t++) for (let k = 0; k < 170; k++) {
      const x = -300 + r() * 900, z = t * SEA_P + r() * SEA_P;
      g.box(COL.foam, x, GY - 0.66, z, 2 + r() * 4, 0.04, 0.5 + r() * 0.5, r() * 0.4 - 0.2);
    }
    seaFoam.add(new THREE.Mesh(g.build(), new THREE.MeshBasicMaterial({ vertexColors: true })));
    sea.add(seaFoam);
  }

  // ================= island (Gran Canaria from the approach; track frame, see apply()) ===========
  {
    const g = new GeoBuilder(), gh = new GeoBuilder(), r = rng(28);
    // Land: ochre plain west of a wavy coast (straight-ish by the airport), a beach and a surf line.
    const coast = (z) => 66 + smooth(650, 1050, Math.abs(z)) * (34 * Math.sin(z / 120) + 14 * Math.sin(z / 41 + 1)) + 3 * Math.sin(z / 57);
    const strip = (color, xa, xb, y) => {
      const pos = [], nor = [], idx = [];
      let i = 0;
      for (let z = -1300; z <= 1700; z += 20, i++) {
        pos.push(xa(z), y, z, xb(z), y, z); nor.push(0, 1, 0, 0, 1, 0);
        if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      g.add(geoFrom(pos, nor, idx), color);
    };
    strip(COL.ochre, () => -850, (z) => coast(z) - 9, GY - 0.05);
    strip(COL.sand, (z) => coast(z) - 9.5, (z) => coast(z) + 1, GY - 0.12);
    strip(COL.foam, (z) => coast(z) + 0.5, (z) => coast(z) + 3.5, GY - 0.66);
    g.boxB(COL.ochre, -420, GY - 0.75, 200, 860, 0.6, 3000);   // the land's body under the top
    // Dry patches, fields, greenhouses (the Canaries' white plastic tomato houses).
    for (let k = 0; k < 120; k++) {
      const x = -820 + r() * 640, z = -1200 + r() * 2800;
      if (x > -230 && z > -950 && z < 800) continue;   // keep the airport strip clear
      const c = r() < 0.4 ? COL.greenhouse : r() < 0.5 ? COL.field : COL.dirt;
      g.boxB(c, x, GY - 0.06, z, 20 + r() * 50, c === COL.greenhouse ? 2.0 : 0.05, 20 + r() * 60, r() * 0.6);
    }
    // Volcanic hills inland (west), red-brown domes.
    const rocks = [COL.rock1, COL.rock2, COL.rock3, COL.ochre];
    for (let k = 0; k < 34; k++) {
      const x = -830 + r() * 560, z = -1300 + r() * 2900, rad = 80 + r() * 150, h = 70 + r() * 230;
      if (x + rad * 0.5 > -240 && z > -1000 && z < 900) continue;
      const cx = Math.max(x, -850 + rad);
      gh.add(PRIM.dome(), rocks[k % 4], new THREE.Matrix4().compose(new THREE.Vector3(cx, GY - 0.8, z), new THREE.Quaternion(), new THREE.Vector3(rad * 2, h, rad * 1.7)));
    }
    // White towns: clusters of small cubes along the coast and up the valleys.
    for (const [tx, tz, n] of [[-150, 1150, 40], [-90, -1150, 34], [-330, 1350, 26], [-420, -600, 22], [-300, 400, 18]]) {
      for (let k = 0; k < n; k++) {
        const x = tx + (r() - 0.5) * 90, z = tz + (r() - 0.5) * 120, w = 6 + r() * 8;
        g.boxB(r() < 0.8 ? COL.whitewash : COL.terracotta, x, GY - 0.1, z, w, 3 + r() * 6, w * (0.8 + r() * 0.6));
      }
    }
    // Coast road.
    g.boxB(0x7a7268, 30, GY - 0.08, 200, 6, 0.06, 3000);
    island.add(toonMesh(g.build(), { outline: 0.06, cast: false }));
    island.add(toonMesh(gh.build(), { outline: 0.12, cast: false }));
  }

  // ================= landingStrip (Gando: runway by the sea, terminal, tower, palms) =============
  {
    const g = new GeoBuilder(), gl = new GeoBuilder(), r = rng(35);
    const rz0 = -900, rz1 = 760;
    g.boxB(COL.asphalt, 0, GY - 0.06, (rz0 + rz1) / 2, 48, 0.06, rz1 - rz0);
    for (const s of [-1, 1]) g.boxB(COL.mark, s * 22.6, GY - 0.002, (rz0 + rz1) / 2, 0.8, 0.004, rz1 - rz0);
    for (let z = rz0 + 60; z < rz1 - 20; z += 36) g.boxB(COL.mark, 0, GY - 0.002, z, 0.9, 0.004, 18);
    for (let k = 0; k < 8; k++) for (const s of [-1, 1]) g.boxB(COL.mark, s * (3.5 + k * 2.4), GY - 0.002, rz0 + 30, 1.5, 0.004, 24);
    for (const s of [-1, 1]) { g.boxB(COL.mark, s * 8.5, GY - 0.002, rz0 + 330, 5, 0.004, 45); for (const dz of [150, 450, 600]) for (const dx of [6, 9.5]) g.boxB(COL.mark, s * dx, GY - 0.002, rz0 + dz, 1.4, 0.004, 22); }
    for (let z = rz0 + 30; z < rz1; z += 60) for (const s of [-1, 1]) gl.sphere(0xfff4d6, s * 25, GY + 0.25, z, 0.25);
    // Taxiway, connectors, apron.
    g.boxB(0x6a6e74, -75, GY - 0.065, -150, 22, 0.06, 1100);
    for (const z of [-520, -60, 300]) g.boxB(0x6a6e74, -38, GY - 0.064, z, 54, 0.06, 22);
    g.boxB(COL.concrete, -125, GY - 0.065, 40, 80, 0.06, 240);
    for (let z = -620; z < 380; z += 30) g.boxB(COL.yellow, -75, GY - 0.003, z, 0.35, 0.004, 15);
    // Terminal: low white two-storey block with a window band, roof sign faces the runway.
    g.boxB(COL.whitewash, -190, GY - 0.06, 40, 34, 9, 170);
    g.boxB(COL.glass, -172.9, GY + 1.0, 40, 0.3, 2.6, 150);
    g.boxB(COL.glass, -172.9, GY + 5.2, 40, 0.3, 2.0, 160);
    g.boxB(0xd8d2c6, -190, GY + 8.94, 40, 35, 0.5, 171);
    g.boxB(COL.whitewash, -166, GY + 3.6, 40, 14, 0.4, 40);   // arrivals canopy
    for (const z of [22, 40, 58]) g.cyl(COL.whitewash, -160, GY + 1.8, z, 0.3, 3.6, 8);
    // Control tower.
    g.cyl(COL.whitewash, -168, GY + 11, 150, 2.6, 22, 12);
    g.cyl(COL.glass, -168, GY + 23.6, 150, 4.2, 3.2, 14);
    g.cyl(COL.whitewash, -168, GY + 25.6, 150, 4.8, 0.8, 14);
    g.cyl(COL.dark, -168, GY + 27.5, 150, 0.1, 3, 4);
    // A hangar with a curved roof.
    g.boxB(0xd9d4c8, -150, GY - 0.06, -330, 50, 8, 40);
    g.cyl(0xc8c2b4, -150, GY + 7.9, -330, 20, 50, 16, 0, 0, Math.PI / 2);
    // Spanish flag, windsock, service vehicles.
    g.cyl(COL.dark, -160, GY + 5, 120, 0.12, 10, 5);
    g.boxB(0xc8202a, -160, GY + 7.5, 121.6, 0.05, 2.1, 3); g.boxB(COL.yellow, -159.98, GY + 8.2, 121.6, 0.05, 0.7, 3);
    g.cyl(COL.dark, 38, GY + 3, -420, 0.1, 6, 5);
    for (let k = 0; k < 4; k++) g.cyl(k % 2 ? 0xffffff : COL.sun, 38, GY + 5.6, -421.6 - k * 0.9, 0.55 - k * 0.08, 0.9, 10, Math.PI / 2);
    car(g, -110, GY, 10, COL.yellow, Math.PI / 2);
    car(g, -118, GY, 70, COL.whitewash, 0);
    g.boxB(COL.whitewash, -100, GY, 90, 2.4, 2.6, 8);  g.boxB(0x2e5e9e, -100, GY + 2.6, 92.5, 2.4, 0.9, 3);
    // Palms: terminal front and along the beach; scrub on the dirt.
    for (let z = -40; z <= 120; z += 12) palm(g, r, -150 + (r() - 0.5) * 2, GY, z, 7 + r() * 3);
    for (let z = -880; z < 760; z += 34 + r() * 30) palm(g, r, 58 + r() * 8, GY - 0.2, z, 6 + r() * 4);
    for (let k = 0; k < 90; k++) {
      const x = -60 + r() * 112, z = rz0 + r() * (rz1 - rz0);
      if (Math.abs(x) < 30) continue;
      g.sphere(0x7a8a46, x, GY - 0.1, z, 1.2 + r() * 1.6, 0.8 + r(), 1.2 + r() * 1.6);
    }
    landingStrip.add(toonMesh(g.build(), { outline: 0.05, cast: false }));
    landingStrip.add(new THREE.Mesh(gl.build(), new THREE.MeshBasicMaterial({ vertexColors: true })));
    const sign = signMesh('AEROPUERTO DE GRAN CANARIA', 28, 2.4, { bg: '#f4efe6', fg: '#1b2f6b', border: '#1b2f6b', scale: 0.62, double: false });
    sign.position.set(-172.6, GY + 10.6, 40);
    orient(sign, 1, 0, 0);
    landingStrip.add(sign);
    const rwyNum = signMesh('03', 12, 9, { bg: null, border: null, fg: '#f4f4f0', scale: 0.9 });
    rwyNum.position.set(0, GY + 0.003, rz0 + 70);
    orient(rwyNum, 0, 1, 0, 0, 0, 1);
    landingStrip.add(rwyNum);
  }

  // ================= gate visuals (Arlanda pier under the lounge, apron, landside) ===============
  {
    const g = new GeoBuilder(), gl = new GeoBuilder(), r = rng(14);
    // Apron concrete with snow patches, slush tracks, the yellow lead-in line to stand 8.
    g.boxB(COL.apron, -38, GY - 0.02, 20, 104, 0.05, 210);
    for (let k = 0; k < 60; k++) g.cyl(COL.snow, -86 + r() * 98, GY + 0.02, -80 + r() * 200, 1.5 + r() * 5, 0.02, 10);
    for (const x of [-9, -2.5, 6.5]) g.boxB(COL.slush, x, GY + 0.03, 10, 0.6, 0.005, 180);
    g.boxB(COL.yellow, 0, GY + 0.034, -28, 0.35, 0.005, 100);
    g.boxB(COL.yellow, 0, GY + 0.034, 22.3, 4, 0.005, 0.4);
    g.boxB(COL.yellow, -45, GY + 0.034, 20, 0.35, 0.005, 200);
    // Snow heaps at the apron edge and the stand corners.
    for (let k = 0; k < 22; k++) g.sphere(COL.snow, -92 + r() * 6, GY, -80 + k * 9.5, 4 + r() * 3, 1.5 + r() * 2, 5 + r() * 3);
    for (const [x, z] of [[-30, 50], [-28, -40], [10, -60], [9, 60]]) g.sphere(COL.snow, x, GY, z, 5, 2.4, 4);

    // The pier: the lounge sits on a concrete slab over a glazed ground floor (baggage hall).
    g.boxB(COL.concrete, 26, -0.25, 15, 26, 0.33, 32);
    g.boxB(COL.brown, 26.5, GY, 15.5, 23, -0.25 - GY, 29);
    g.boxB(COL.glass, 14.98, GY + 0.6, 15.5, 0.1, 2.7, 27);
    for (let z = 2.5; z <= 28.5; z += 2.0) g.boxB(COL.wood, 14.92, GY + 0.6, z, 0.08, 2.7, 0.14);
    g.boxB(COL.orange, 14.95, GY + 3.3, 15.5, 0.14, 0.9, 27.2);
    for (const z of [3, 9, 21, 27]) g.cyl(COL.concrete, 13.5, (GY - 0.25) / 2, z, 0.28, -0.25 - GY, 8);
    g.boxB(COL.dark, 14.9, GY, 6, 0.1, 2.3, 1.6);
    for (let k = 0; k < 6; k++) g.sphere(COL.snow, 14 + r() * 1.2, GY, 2 + k * 5, 1.2 + r(), 0.5 + r() * 0.5, 1.6 + r());
    // Jet bridge underside, drive column with wheels, rotunda.
    g.boxB(COL.steel, 8.5, -0.62, 14.7, 9.0, 0.7, 3.8);
    for (let x = 4.4; x < 13; x += 0.9) g.boxB(0x7a7e84, x, -0.64, 14.7, 0.12, 0.04, 3.85);
    for (const z of [13.4, 16.0]) g.cyl(COL.dark, 7.5, (GY - 0.62) / 2, z, 0.16, -0.62 - GY, 8);
    g.boxB(COL.dark, 7.5, GY + 0.9, 14.7, 0.3, 0.3, 3.0);
    g.boxB(COL.yellow, 7.5, GY + 0.35, 14.7, 1.2, 0.6, 3.4);
    wheelPair(g, 7.5, GY, 13.6, 0.4, 0.35, 0.5); wheelPair(g, 7.5, GY, 15.8, 0.4, 0.35, 0.5);
    g.cyl(COL.concrete, 13.4, (GY - 0.62) / 2, 14.7, 1.0, -0.62 - GY, 14);

    // Neighbouring pier wings (empty stands) with flat snowy roofs no higher than the cut (2.6).
    const wingBlock = (x0, x1, z0, z1) => {
      g.boxB(COL.cream, (x0 + x1) / 2, GY, (z0 + z1) / 2, x1 - x0, 2.1 - GY, z1 - z0);
      g.boxB(COL.snow, (x0 + x1) / 2, 2.1, (z0 + z1) / 2, x1 - x0 + 0.4, 0.3, z1 - z0 + 0.4);
      g.boxB(COL.orange, x0 - 0.06, 1.5, (z0 + z1) / 2, 0.14, 0.6, z1 - z0);
      g.boxB(COL.glass, x0 - 0.05, GY + 0.6, (z0 + z1) / 2, 0.1, 2.7, z1 - z0 - 2);
      g.boxB(COL.glass, x0 - 0.05, 0.1, (z0 + z1) / 2, 0.1, 1.3, z1 - z0 - 2);
      for (let k = 0; k < (z1 - z0) / 12; k++) g.boxB(0x9aa0a8, x0 + 4 + r() * (x1 - x0 - 8), 2.4, z0 + 4 + r() * (z1 - z0 - 8), 1.6, 0.6, 1.6);
    };
    wingBlock(14, 40, 32, 118);
    wingBlock(24, 42, -58, -3);
    // Two more jet bridges at the next (empty) stands.
    for (const z of [62, 96]) {
      g.boxB(0xb8bcc2, 8, -0.6, z, 12, 3.2, 3.4);
      g.boxB(COL.glass, 8, 1.0, z + 1.72, 10, 0.7, 0.05);
      g.boxB(COL.glass, 8, 1.0, z - 1.72, 10, 0.7, 0.05);
      g.boxB(COL.snow, 8, 2.6, z, 12.2, 0.15, 3.6);
      g.cyl(COL.dark, 5, (GY - 0.6) / 2, z, 0.18, -0.6 - GY, 8);
      g.boxB(COL.yellow, 0, GY + 0.034, z - 40, 0.35, 0.005, 80);
    }
    // Landside: road, kerbs, cars, a bus, lamps.
    g.boxB(0x4a4e55, 50, GY + 0.01, 30, 12, 0.03, 200);
    g.boxB(COL.concrete, 43, GY + 0.01, 30, 2.4, 0.18, 200);
    for (let k = 0; k < 18; k++) g.sphere(COL.snow, 57.5 + r() * 2, GY, -65 + k * 11, 2.5, 1.2 + r(), 4 + r() * 3);
    for (let z = -60; z <= 120; z += 24) { g.cyl(COL.dark, 42.5, GY + 3.5, z, 0.1, 7, 5); g.boxB(COL.dark, 41.8, GY + 6.9, z, 1.5, 0.2, 0.4); gl.boxB(0xfff1c0, 41.4, GY + 6.75, z, 0.6, 0.06, 0.3); }
    car(g, 47, GY, 8, 0xc9a03a, 0, true);
    car(g, 47, GY, 21, COL.brown, 0, true);
    car(g, 53, GY, 46, 0xd8743a, Math.PI, true);
    g.boxB(0xd8743a, 47.5, GY + 0.4, 84, 2.6, 2.6, 11);
    g.boxB(COL.glass, 47.5, GY + 1.6, 84, 2.65, 1.0, 10.4);
    g.boxB(COL.snow, 47.5, GY + 3.0, 84, 2.5, 0.12, 10.8);
    wheelPair(g, 47.5, GY, 80, 0.5, 0.4, 1.1); wheelPair(g, 47.5, GY, 88, 0.5, 0.4, 1.1);
    // Old Arlanda tower in the distance.
    g.cyl(COL.cream, 72, GY + 14, 150, 2.4, 28, 10);
    g.cyl(COL.glass, 72, GY + 29.5, 150, 5.2, 3.0, 14);
    g.cyl(COL.cream, 72, GY + 31.4, 150, 5.8, 0.8, 14);

    // Apron vehicles. Pushback tug at the nose, power cart (the DC-8 has no APU), belt loader
    // at the forward hold, baggage train, catering truck aft, de-icing truck at the starboard wing.
    g.boxB(COL.yellow, 0, GY + 0.35, 31.0, 2.7, 1.0, 4.6);
    g.boxB(COL.glass, 0, GY + 1.35, 32.2, 1.6, 0.8, 1.4);
    g.boxB(COL.yellow, 0, GY + 2.15, 32.2, 1.8, 0.12, 1.6);
    wheelPair(g, 0, GY, 29.6, 0.45, 0.4, 1.3); wheelPair(g, 0, GY, 32.4, 0.45, 0.4, 1.3);
    g.boxB(COL.dark, 0, GY + 0.45, 25.6, 0.18, 0.18, 6.3);
    g.boxB(COL.yellow, -4.0, GY + 0.2, 25.0, 1.4, 1.1, 2.0);
    g.boxB(COL.dark, -2.4, GY + 0.9, 23.6, 2.6, 0.1, 0.1, 0.5);
    const beltRun = 5.4, beltRise = (-0.95) - (GY + 0.9), ang = Math.atan2(beltRise, beltRun);
    g.box(COL.dark, -3.85 - beltRun / 2, (GY + 0.9 - 0.95) / 2, 8.7, Math.hypot(beltRun, beltRise), 0.25, 1.1, 0, 0, ang);
    g.boxB(COL.yellow, -6.8, GY + 0.3, 8.7, 3.4, 0.8, 1.7);
    wheelPair(g, -6.8, GY, 8.7, 0.35, 0.3, 0.9);
    const bags = [0x8a4a2a, 0xc0623a, 0x2e5e9e, 0x3f7a3a, 0x9a8a6a, 0x6a2a3a];
    for (let k = 0; k < 3; k++) { const f = 0.25 + k * 0.25; g.box(bags[k], -3.85 - beltRun * (1 - f), GY + 0.9 + beltRise * f + 0.35, 8.7, 0.8, 0.4, 0.6, 0, 0, ang); }
    g.boxB(COL.orange, -12, GY + 0.3, 17, 1.5, 1.1, 2.4);
    g.boxB(COL.glass, -12, GY + 1.4, 16.4, 1.3, 0.6, 0.9);
    wheelPair(g, -12, GY, 17.6, 0.35, 0.3, 0.8);
    for (let c = 0; c < 3; c++) {
      const z = 13 - c * 4.2;
      g.boxB(0x7a7e84, -12, GY + 0.5, z, 1.7, 0.15, 3.4);
      wheelPair(g, -12, GY, z - 1.2, 0.25, 0.2, 0.75); wheelPair(g, -12, GY, z + 1.2, 0.25, 0.2, 0.75);
      for (let k = 0; k < 6; k++) g.boxB(bags[(c * 3 + k) % 6], -12.4 + (k % 2) * 0.8, GY + 0.65 + (k > 3 ? 0.55 : 0), z - 1.1 + ((k >> 1) % 2) * 1.2 + (k > 3 ? 0.4 : 0), 0.7, 0.5, 1.0);
      g.boxB(COL.snow, -12, GY + 1.75, z, 1.8, 0.08, 3.4);
    }
    g.boxB(0x2e5e9e, -6.9, GY + 0.4, -12.2, 2.3, 1.6, 2.6);
    g.boxB(COL.glass, -6.9, GY + 1.3, -11.0, 2.2, 0.6, 0.1);
    g.boxB(COL.dark, -6.9, GY + 0.4, -16.3, 2.3, 0.3, 6.0);
    wheelPair(g, -6.9, GY, -12.4, 0.45, 0.4, 1.0); wheelPair(g, -6.9, GY, -18.0, 0.45, 0.4, 1.0);
    for (const s of [-1, 1]) g.box(COL.steel, -6.9, (GY + 0.7 - 2.3) / 2, -16.3, 0.12, 0.12, 5.4, 0, s * 0.7, 0);
    g.boxB(COL.whitewash, -6.6, -2.4, -16.3, 2.9, 2.3, 5.4);
    g.boxB(0x2e5e9e, -6.6, -1.2, -16.3, 2.95, 0.3, 5.45);
    g.boxB(COL.orange, -24, GY + 0.4, 9, 2.5, 2.2, 6.5);
    g.boxB(COL.glass, -24, GY + 1.6, 12.0, 2.3, 0.8, 0.1);
    wheelPair(g, -24, GY, 7, 0.5, 0.4, 1.1); wheelPair(g, -24, GY, 11.2, 0.5, 0.4, 1.1);
    g.box(COL.dark, -22.0, GY + 3.8, 6.5, 0.35, 0.35, 7.6, 0, 0.5, -0.35);
    g.boxB(COL.yellow, -19.9, GY + 5.0, 3.6, 1.4, 1.0, 1.4);
    for (const [x, z] of [[22, -4], [-22, -4], [0, 30.5 + 3.5], [6, -22]]) g.cone(COL.sun, x, GY + 0.4, z, 0.3, 0.8, 8);
    // Floodlight masts far out on the apron.
    for (const z of [-60, 70]) { g.cyl(0x8a8f99, -70, GY + 11, z, 0.35, 22, 6); g.boxB(COL.dark, -70, GY + 21.6, z, 3.4, 1.2, 0.6); gl.boxB(0xfff4d6, -70, GY + 21.8, z + 0.32, 3.0, 0.8, 0.05); }
    // Forest ring around the airport (none on the terminal side).
    for (let k = 0; k < 260; k++) {
      const a = r() * Math.PI * 2, d = 150 + r() * 160, x = Math.cos(a) * d, z = 20 + Math.sin(a) * d;
      if ((x > 0 && z > -90 && z < 180) || x < -840) continue;
      pine(g, x, GY, z, 10 + r() * 10);
    }
    gateVisual.add(toonMesh(g.build(), { outline: 0.035, cast: false }));
    gateVisual.add(new THREE.Mesh(gl.build(), new THREE.MeshBasicMaterial({ vertexColors: true })));
    const fascia = decal(gateVisual, 'ARLANDA', 8, 0.8, 14.86, GY + 3.75, 21, [-1, 0, 0], { fg: '#fff8e6' });
    fascia.name = 'arlandaSign';
    decal(gateVisual, 'AVISNING', 4.4, 0.7, -25.27, GY + 1.6, 9, [-1, 0, 0], { fg: '#1d1426' });
    decal(gateVisual, '8', 3.2, 3.2, 0, GY + 0.04, 27.4, [0, 1, 0], { fg: '#f7c31b' }, [0, 0, 1]);
  }

  // ================= particles (engine smoke, snow spray, tyre smoke), plane frame =============
  const NP = 120;
  const pGeo = PRIM.sphere(10, 7);
  const pMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient() });
  const pMesh = new THREE.InstancedMesh(pGeo, pMat, NP);
  const pLine = new THREE.InstancedMesh(outlineGeometry(pGeo), outlineMat(0.03, 0x4a4f5a), NP);
  pLine.instanceMatrix = pMesh.instanceMatrix;
  pMesh.frustumCulled = pLine.frustumCulled = false;
  pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pMesh.add(pLine);
  pMesh.name = 'particles';
  airframe.add(pMesh);
  const PA = { x: new Float32Array(NP), y: new Float32Array(NP), z: new Float32Array(NP), vx: new Float32Array(NP), vy: new Float32Array(NP), vz: new Float32Array(NP),
    age: new Float32Array(NP), life: new Float32Array(NP), s0: new Float32Array(NP), s1: new Float32Array(NP), drag: new Float32Array(NP) };
  const pArr = pMesh.instanceMatrix.array;
  const _col = new THREE.Color();
  {
    const m = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < NP; i++) { pMesh.setMatrixAt(i, m); pMesh.setColorAt(i, _col.setHex(0xffffff)); PA.life[i] = 0; }
  }
  let pNext = 0;
  const spawn = (x, y, z, vx, vy, vz, life, s0, s1, color, drag = 1.2) => {
    const i = pNext; pNext = (pNext + 1) % NP;
    PA.x[i] = x; PA.y[i] = y; PA.z[i] = z; PA.vx[i] = vx; PA.vy[i] = vy; PA.vz[i] = vz;
    PA.age[i] = 0; PA.life[i] = life; PA.s0[i] = s0; PA.s1[i] = s1; PA.drag[i] = drag;
    pMesh.setColorAt(i, _col.setHex(color));
    pMesh.instanceColor.needsUpdate = true;
  };
  const stepParticles = (dt) => {
    for (let i = 0; i < NP; i++) {
      const o = i * 16;
      if (PA.life[i] <= 0) { if (pArr[o] !== 0) { pArr[o] = pArr[o + 5] = pArr[o + 10] = 0; } continue; }
      PA.age[i] += dt;
      if (PA.age[i] >= PA.life[i]) { PA.life[i] = 0; pArr[o] = pArr[o + 5] = pArr[o + 10] = 0; continue; }
      const k = Math.max(0, 1 - PA.drag[i] * dt);
      PA.vx[i] *= k; PA.vy[i] *= k; PA.vz[i] *= k;
      PA.x[i] += PA.vx[i] * dt; PA.y[i] += PA.vy[i] * dt; PA.z[i] += PA.vz[i] * dt;
      const f = PA.age[i] / PA.life[i];
      const s = lerp(PA.s0[i], PA.s1[i], f) * (f > 0.7 ? (1 - f) / 0.3 : 1);
      pArr[o] = pArr[o + 5] = pArr[o + 10] = s;
      pArr[o + 12] = PA.x[i]; pArr[o + 13] = PA.y[i]; pArr[o + 14] = PA.z[i];
    }
    pMesh.instanceMatrix.needsUpdate = true;
  };
  const ENG = airframe.userData.engines, MG = airframe.userData.mainGear;

  // ================= falling snow around the camera (gate, start of the takeoff roll) ==========
  const NS = 900, SX = 24, SY0 = -12, SY1 = 8, SZ = 24;
  const snowPos = new Float32Array(NS * 3), snowOff = new Float32Array(NS * 3), snowV = new Float32Array(NS * 2);
  {
    const r = rng(3);
    for (let i = 0; i < NS; i++) {
      snowOff[i * 3] = (r() * 2 - 1) * SX; snowOff[i * 3 + 1] = SY0 + r() * (SY1 - SY0); snowOff[i * 3 + 2] = (r() * 2 - 1) * SZ;
      snowV[i * 2] = 1.2 + r() * 1.0; snowV[i * 2 + 1] = r() * Math.PI * 2;
    }
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3).setUsage(THREE.DynamicDrawUsage));
  const flake = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(16, 16, 13, 0, Math.PI * 2); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const snowPts = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, map: flake, alphaTest: 0.5, sizeAttenuation: true }));
  snowPts.frustumCulled = false;
  snowPts.name = 'snow';
  airframe.add(snowPts);

  // ================= state, phase visuals ========================================================
  const st = {
    phase: 'gate', t: 0, gate: true, inCloud: false, active: true, gearDown: true, snow: 1, vPlane: 0,
    deckOff: 0, puffOff: 0, deckY: 0, deckOn: false, puffN: 0, puffV: 0, deckV: 55, seaTrack: 0,
    beaconT: 0, emitSmoke: 0, emitSpray: 0, smokeAcc: 0, sprayAcc: 0, touch: false, revT: 0,
  };
  const SHOW = {
    gate: ['ground'], takeoff: ['ground'], climb: ['ground', 'puffs', 'deck'], cruise: ['deck', 'puffs'],
    approach: ['deck', 'puffs', 'sea', 'island', 'landingStrip'], landing: ['landingStrip', 'sea', 'island'], landed: ['landingStrip', 'sea', 'island'],
  };
  const groups = { ground, deck, puffs, sea, island, landingStrip };

  const takeoffRun = (t) => (t < 10 ? 3.5 * t * t : 350 + 70 * (t - 10));
  const landDist = (t) => (t < 5 ? 72 * t : 360 + 72 * (t - 5) - 36 * (t - 5) * (t - 5));
  const LAND_D = landDist(6);

  // Everything visible is a function of (phase, t), so instant jumps and held phases look right.
  function apply() {
    const ph = st.phase, t = st.t;
    let pitch = 0, alt = 0, run = 0, track = 0, gnd = true;
    st.deckOn = false; st.inCloud = false; st.puffN = 0; st.deckY = 0; st.gearDown = true; st.snow = 0; st.vPlane = 0; st.emitSmoke = 0; st.emitSpray = 0;
    st.deckV = 55; st.puffV = 70;
    if (ph === 'gate') { st.snow = 1; }
    else if (ph === 'takeoff') {
      st.vPlane = t < 10 ? 7 * t : 70;
      run = takeoffRun(t);
      alt = t < 9 ? 0 : 2.6 * (t - 9) * (t - 9) + 3 * (t - 9);
      pitch = 0.12 * smooth(8, 9.5, t);
      st.gearDown = t < 11;
      st.snow = 1 - smooth(4, 7, t);
      st.emitSmoke = t > 0.3 ? 0.5 + 0.5 * smooth(0.3, 2, t) : 0;
      st.emitSpray = t > 2 && t < 9.1 ? smooth(2, 4, t) : 0;
    } else if (ph === 'climb') {
      st.vPlane = 72;
      run = takeoffRun(12) + 72 * t;
      alt = 32.4 + 16 * t + 2.5 * t * t;   // takeoff ends at alt(12) = 32.4: no jump
      gnd = t < 2.8;
      st.deckOn = t >= 4.3;
      st.inCloud = t > 2.2 && t < 5;
      st.deckY = 24 * (1 - smooth(4.3, 8, t));
      st.puffN = smooth(0.3, 2.0, t) * (1 - smooth(5.0, 7.6, t));
      st.puffV = 72; st.deckV = 60;
      pitch = lerp(0.12, 0.05, smooth(5, 8, t));
      st.gearDown = false;
      st.emitSmoke = 0.35 * (1 - smooth(1, 3, t));
    } else if (ph === 'cruise') {
      // Eased out of the climb (which ends at pitch 0.05 with no puffs): no horizon or puff pop.
      gnd = false; st.deckOn = true; st.puffN = (8 / 44) * smooth(0, 2, t); st.puffV = 55; st.gearDown = false;
      pitch = 0.05 * (1 - smooth(0, 2, t));
    } else if (ph === 'approach') {
      gnd = false;
      st.deckY = 44 * smooth(0, 3.1, t);
      st.deckOn = t < 2.9;
      st.inCloud = t > 0.9 && t < 2.9;
      st.puffN = smooth(0.2, 1.1, t) * (1 - smooth(2.8, 4.4, t));
      st.puffV = 80;
      alt = 30 + 390 * Math.pow(1 - t / 14, 1.5);
      track = LAND_D + 80 * (14 - t);
      pitch = -0.03;
      st.gearDown = t > 9;
    } else if (ph === 'landing') {
      gnd = false;
      alt = 30 * Math.pow(1 - Math.min(1, t / 5), 1.6);
      track = LAND_D - landDist(t);
      pitch = t < 5 ? lerp(-0.03, 0.05, smooth(2.5, 4.8, t)) : 0.05 * (1 - smooth(5, 6, t));
      st.vPlane = t < 5 ? 72 : 72 * (1 - (t - 5));
    } else if (ph === 'landed') { gnd = false; }
    // Groups on/off.
    const show = SHOW[ph] || [];
    for (const k in groups) groups[k].visible = show.includes(k);
    ground.visible = ground.visible && gnd;
    runwayTile.visible = ph !== 'gate';
    drifts.visible = !runwayTile.visible;
    deck.visible = deck.visible && (st.deckOn || st.inCloud);
    deckL.mesh.visible = st.deckOn;
    puffs.visible = puffs.visible && st.puffN > 0.001;
    if (ph === 'approach') landingStrip.visible = t > 4;
    // Transforms.
    scenery.rotation.x = pitch;
    ground.position.y = -alt;
    runwayTile.position.z = -(run % RUN_P);
    sea.position.y = -alt;
    seaFoam.position.z = -(((track % SEA_P) + SEA_P) % SEA_P);
    island.position.set(0, -alt, track);
    landingStrip.position.set(0, -alt, track);
    // The deck's floor never comes closer than 6 m under the cabin floor (below the belly, the
    // engines and the gear); inside the layer it stays there, a white-out under the plane.
    deckFloor.position.y = Math.min(DECK_FLOOR + st.deckY, -6);
    deckFloor.visible = DECK_FLOOR + st.deckY < -6 || st.inCloud;
    const pc = Math.round(puffL.n * st.puffN);
    puffL.mesh.count = puffL.line.count = pc;
    if (P.doorPatch) P.doorPatch.visible = !st.gate;
  }

  // Instance updates: wrap along z, park any lump that would sit in the cabin column.
  function layoutLayer(L, off, yOff, halfZ, padX, colLo, colHi) {
    const { D, arr, n } = L, span = 2 * halfZ;
    for (let i = 0; i < n; i++) {
      let z = D.z[i] - off;
      z -= span * Math.floor((z + halfZ) / span);
      const y = D.y[i] + yOff, o = i * 16;
      // A lump crossing the plane's level is pushed out sideways: it never fills the cabin, and
      // while the plane is inside the layer the lumps make walls of cloud on both sides.
      const inCol = Math.abs(D.x[i]) < D.w[i] + padX && y + D.h[i] > colLo && y - D.h[i] < colHi;
      arr[o + 12] = inCol ? (D.x[i] < 0 ? -1 : 1) * (D.w[i] + padX) : D.x[i]; arr[o + 13] = y; arr[o + 14] = z;
    }
    L.mesh.instanceMatrix.needsUpdate = true;
  }

  function stepSnow(dt) {
    const k = st.snow, lx = camera.position.x - CX, ly = camera.position.y, lz = camera.position.z;
    const n = Math.round(NS * k);
    snowGeo.setDrawRange(0, n);
    if (n === 0) return;
    const vz = st.vPlane, gate = st.gate;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      snowV[i * 2 + 1] += dt * 1.3;
      snowOff[j] += Math.sin(snowV[i * 2 + 1]) * 0.35 * dt;
      snowOff[j + 1] -= snowV[i * 2] * dt;
      snowOff[j + 2] -= vz * dt;
      if (snowOff[j + 1] < SY0) snowOff[j + 1] += SY1 - SY0;
      if (snowOff[j] < -SX) snowOff[j] += 2 * SX; else if (snowOff[j] > SX) snowOff[j] -= 2 * SX;
      if (snowOff[j + 2] < -SZ) snowOff[j + 2] += 2 * SZ; else if (snowOff[j + 2] > SZ) snowOff[j + 2] -= 2 * SZ;
      const x = lx + snowOff[j], y = ly + snowOff[j + 1], z = lz + snowOff[j + 2];
      // No snow inside the roofless cabin, jet bridge or lounge. Over the terminal rooms at any
      // height: a flake between the wall tops and the high camera lands, on screen, on their floors.
      const inside = (y < 2.7 && x > -3.6 && x < 3.6 && z > -27 && z < 18.6) || (gate && ((x > 3.4 && x < 14 && z > 12.6 && z < 16.8) || (x > 13 && x < 39 && z > -1 && z < 31)));
      snowPos[j] = x; snowPos[j + 1] = inside || y < GY ? -1e4 : y; snowPos[j + 2] = z;
    }
    snowGeo.attributes.position.needsUpdate = true;
  }

  function emit(dt) {
    const ph = st.phase, t = st.t;
    if (st.emitSmoke > 0) {
      st.smokeAcc += dt * 9 * st.emitSmoke;
      while (st.smokeAcc >= 1) {
        st.smokeAcc -= 1;
        for (let e = 0; e < ENG.length; e++) {
          const E = ENG[e], v = st.vPlane * 0.85 + 12;
          spawn(E[0] + (Math.random() - 0.5) * 0.3, E[1] + (Math.random() - 0.5) * 0.3, E[2], (Math.random() - 0.5) * 1.2, 0.6 + Math.random() * 0.6, -v, st.phase === 'climb' ? 0.9 : 1.3, 0.55, st.phase === 'climb' ? 1.4 : 2.1, st.phase === 'climb' ? 0x9a9ca4 : 0x74767e, 0.6);
        }
      }
    }
    if (st.emitSpray > 0) {
      st.sprayAcc += dt * 14 * st.emitSpray;
      while (st.sprayAcc >= 1) {
        st.sprayAcc -= 1;
        for (const G of MG) spawn(G[0] + (Math.random() - 0.5) * 1.5, G[1] + 0.2, G[2] - 1, (Math.random() - 0.5) * 3, 2 + Math.random() * 3, -st.vPlane * 0.6, 0.9, 0.7, 2.4, 0xffffff, 1.0);
        const E = ENG[(Math.random() * ENG.length) | 0];
        spawn(E[0], GY + 0.4, E[2] - 3, (Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, -st.vPlane * 0.7, 0.8, 0.8, 2.6, 0xf2f6fa, 1.0);
      }
    }
    if (ph === 'landing') {
      if (t >= 5 && !st.touch) {
        st.touch = true;
        for (const G of MG) for (let k = 0; k < 9; k++) spawn(G[0] + (Math.random() - 0.5), G[1] + 0.3, G[2] + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, -20 - Math.random() * 20, 1.1, 0.6, 2.2, 0xe4e4e8, 1.6);
      }
      if (t >= 5.5) st.revT = 2.5;
    }
    if (st.revT > 0) {
      st.revT -= dt;
      if (Math.random() < dt * 30) { const E = ENG[(Math.random() * ENG.length) | 0]; spawn(E[0], E[1], E[3] - 1.5, (Math.random() - 0.5) * 2, 0.4, 14 + Math.random() * 8, 0.8, 0.4, 1.6, 0xd8d4c8, 2.2); }
    }
  }

  // Off when the camera is far from the plane (the island level), and per frame: hide any airframe
  // part whose bounding box contains the render camera (DESIGN §5.3).
  const hideParts = [];
  for (const name of ['body', 'nose', 'tail', 'wings', 'fin', 'gear', 'doorPatch']) {
    const m = P[name];
    if (!m) continue;
    const b = m.geometry.boundingBox.clone().expandByScalar(0.4);
    b.min.x += CX; b.max.x += CX;
    hideParts.push({ m, b, name });
  }
  const prevBefore = scene.onBeforeRender;
  scene.onBeforeRender = function (renderer, sc, cam, rt) {
    if (prevBefore) prevBefore.call(this, renderer, sc, cam, rt);
    const on = cam.position.x > CX - 1100;
    airframe.visible = scenery.visible = on;
    gateVisual.visible = on && st.gate;
    if (!on) return;
    for (const h of hideParts) {
      let vis = !h.b.containsPoint(cam.position);
      if (h.name === 'gear') vis = vis && st.gearDown;
      else if (h.name === 'doorPatch') vis = vis && !st.gate;
      h.m.visible = vis;
    }
  };

  function update(dt) {
    apply();
    st.deckOff += st.deckV * dt * (st.deckOn ? 1 : 0);
    st.puffOff += st.puffV * dt;
    if (deck.visible && st.deckOn) layoutLayer(deckL, st.deckOff, st.deckY, DECK_Z, 7, -5, 9);
    if (puffs.visible) layoutLayer(puffL, st.puffOff, 0, PUFF_Z, 9, -4.5, 9);
    stepSnow(dt);
    emit(dt);
    stepParticles(dt);
    // Anti-collision beacon: blinks once a second when the engines run.
    st.beaconT = (st.beaconT + dt) % 1.1;
    P.beacon.visible = st.phase !== 'gate' && st.beaconT < 0.12;
  }

  setGateVisible(true);
  setPhaseVisual('gate', 0);

  function setPhaseVisual(name, t = 0) {
    st.phase = name;
    st.t = t;
    st.touch = name === 'landing' && t >= 5;
    st.revT = 0;
    update(0);
  }
  function setGateVisible(on) {
    st.gate = !!on;
    gateVisual.visible = st.gate;
    if (P.doorPatch) P.doorPatch.visible = !st.gate;
  }

  return {
    airframe, scenery, gateVisual,
    setPhaseVisual,
    setGateVisible,
    tick(dt) {
      const len = LEN[st.phase];
      st.t = len !== undefined ? Math.min(len, st.t + dt) : st.t + dt;
      update(dt);
    },
    get phaseT() { return st.t; },
  };
}
