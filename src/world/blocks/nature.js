// Nature blocks (WP-D1, DESIGN §6.3): the inland and west edge of Nueva Estocolmo.
//   tomat    (1,0) (3,0) (0,1)  tomato fields (aparcero farms): low merged bush rows a car drives
//                               through (no solids), packing shed TOMATES · EXPORTACIÓN on (3,0),
//                               the gravel track at "vischan" and the Eslöv lane on (0,1)
//   grisfest (2,0)              the grisfest farm: whitewashed farmhouse with a flat azotea (outside
//                               stair; pryl_pung up there), pergolas with long tables and the 12
//                               tallrikar (baseY = table top), dance floor, bandstand, spit-roast pig,
//                               sangria bar, piglet pen, string lights (unlit bulbs glow at night)
//   fataga   (0,0)              the mountain village: white houses, tile roofs, lanes, church with
//                               a bell gable, the well (pryl_kniv), embroidered tablecloths, sheepfold
//   golf     (4,0)              fairway, bunkers, pond (fena_golf), green 18, clubhouse
//   bungalow (5,0)              Angerud's show bungalow on red rock: plot wall, pool (fena_bungalow)
//   bygge    (5,1)              half-built hotel frame, ramps up to the 2nd-floor slab (pryl_klocka),
//                               tower crane, hoarding PRÓXIMAMENTE · HOTEL NUEVA ESTOCOLMO II
//   dyner    (0,4) (0,5)        Maspalomas dunes (hip-ended sand ridges you can drive over), palm
//                               grove, the lagoon (La Charca: walkable shallow water)
// Signs are world text (Spanish/Swedish); the invented ones are marked [N] in comments, film text
// moved onto a sign [F*]. Real place names (FATAGA, DUNAS DE MASPALOMAS, LA CHARCA) carry no tag.
// Builder signature fn(f, W, ctx): f = Frame at the block centre (yaw 0, local = world offset).

import { THREE, GeoBuilder, MAT, PRIM, mat, makeWedge, toonMesh } from '../../gfx.js';
import { CURB } from '../layout.js';
import { box, circle, ramp } from '../collision.js';

const PI = Math.PI;

// §13.2 island palette plus a few earth tones.
const WHITE = 0xf4efe6, WHITE2 = 0xe9e0cf, TERRA = 0xc0623a, TERRA_D = 0x9a4a30, OCHRE = 0xc9a26b;
const SAND = 0xe8cf98, SAND_D = 0xd9bb7e, ROJO = 0xa5532f, ROJO2 = 0xc27a45, BOUG = 0xc2307a;
const PALM = 0x3f7a3a, PALM2 = 0x4f8f42, TRUNK = 0x8a6a4a, BUTANO = 0xf07a1e, SEA = 0x1c7fb8;
const SUNY = 0xf7c31b, RED = 0xd8321e, WOOD = 0x8a5a3a, WOOD_D = 0x5e3c24, GREEN_DOOR = 0x2f6a4a;
const SOIL = 0x6e4630, SOIL_D = 0x553524, DIRT = 0xb8925e, LEAF = 0x4f8a3a, LEAF2 = 0x67a446;
const STONE = 0x8f8070, STONE_D = 0x6e6258, CONC = 0xbab3a5, CONC_D = 0x99938a, STEEL = 0x5a6068;
const YELLOW = 0xf2c12e, INK = 0x1d1426, GLASS_D = 0x2c3440, POOL_EDGE = 0xf2eee4;
const SIGN = { bg: '#f4efe6', fg: '#1d1426', border: '#1d1426', scale: 0.55 };

// ---------------------------------------------------------------------------------------------
// Small shared pieces. Coordinates are block-local (the frame has yaw 0).

// Faces of an axis-aligned box centred (cx, cz), w along x and d along z.
const FACE = { s: 0, e: PI / 2, n: PI, w: -PI / 2 };
function facePt(cx, cz, w, d, side, t, out = 0) {
  const ly = FACE[side], nx = Math.sin(ly), nz = Math.cos(ly), tx = Math.cos(ly), tz = -Math.sin(ly);
  const half = side === 's' || side === 'n' ? d / 2 : w / 2;
  return { x: cx + nx * (half + out) + tx * t, z: cz + nz * (half + out) + tz * t, ly };
}
const faceLen = (w, d, side) => (side === 's' || side === 'n' ? w : d);

// A whitewashed Canarian house: cube, stone plinth, wooden doors and shuttered windows, tile
// gable roof or flat azotea with a parapet. Solid 'building' (top 99 unless o.top).
//   o: { roof: 'tile' | 'flat', doors: [[side, t]], wall, door, shutter, plinth, noWin: [sides],
//        stories, top, gap }
function house(f, cx, cz, w, d, h, o = {}) {
  const wall = o.wall ?? WHITE, door = o.door ?? WOOD, shutter = o.shutter ?? GREEN_DOOR;
  f.box(wall, cx, CURB, cz, w, h, d);
  f.box(o.plinth ?? 0xb7a58a, cx, CURB, cz, w + 0.08, 0.45, d + 0.08);
  if (o.roof === 'tile') {
    const along = w >= d, rh = Math.min(w, d) * 0.28;
    f.box(TERRA_D, cx, CURB + h - 0.05, cz, w + 0.5, 0.12, d + 0.5);
    f.roof(TERRA, cx, CURB + h, cz, (along ? w : d) + 0.5, rh, (along ? d : w) + 0.6, along ? 0 : PI / 2);
  } else {
    // Azotea: a ring parapet (visual only) round a pale roof deck, so the roof stays walkable at h.
    // o.gap = { side, a, b }: leave the parapet open between a and b (local x on n/s, z on e/w).
    const pt = 0.3, ph = 0.45, trim = o.trim ?? WHITE2;
    f.F.box(0xe2dccd, f.wx(cx, cz), CURB + h + 0.012, f.wz(cx, cz), w - 2 * pt, 0.02, d - 2 * pt);
    const seg = (x0, z0, x1, z1) => {
      const sw = Math.max(x1 - x0, pt), sd = Math.max(z1 - z0, pt), sx = (x0 + x1) / 2, sz = (z0 + z1) / 2;
      f.box(trim, sx, CURB + h, sz, sw, ph, sd);
      f.box(TERRA_D, sx, CURB + h + ph, sz, sw + 0.08, 0.07, sd + 0.08);
    };
    const X0 = cx - w / 2 + pt / 2, X1 = cx + w / 2 - pt / 2, Z0 = cz - d / 2 + pt / 2, Z1 = cz + d / 2 - pt / 2;
    const side = (s, ax, az, bx, bz) => {
      const g = o.gap?.side === s ? o.gap : null;
      if (!g) return seg(ax, az, bx, bz);
      if (ax === bx) { if (g.a > az) seg(ax, az, bx, g.a); if (g.b < bz) seg(ax, g.b, bx, bz); }
      else { if (g.a > ax) seg(ax, az, g.a, bz); if (g.b < bx) seg(g.b, az, bx, bz); }
    };
    side('n', cx - w / 2, Z0, cx + w / 2, Z0); side('s', cx - w / 2, Z1, cx + w / 2, Z1);
    side('w', X0, cz - d / 2 + pt, X0, cz + d / 2 - pt); side('e', X1, cz - d / 2 + pt, X1, cz + d / 2 - pt);
  }
  f.solid(cx, cz, w, d, o.top ?? 99, 'building');
  const doors = o.doors ?? [];
  for (const [side, t] of doors) {
    const p = facePt(cx, cz, w, d, side, t, 0.04);
    f.box(door, p.x, CURB, p.z, 1.2, 2.25, 0.1, p.ly);
    f.box(WOOD_D, p.x, CURB + 2.25, p.z, 1.5, 0.18, 0.14, p.ly);
  }
  const stories = o.stories ?? Math.max(1, Math.floor(h / 3));
  for (const side of ['s', 'n', 'e', 'w']) {
    if (o.noWin?.includes(side)) continue;
    const len = faceLen(w, d, side), n = Math.max(1, Math.floor(len / 3.4));
    for (let s = 0; s < stories; s++) {
      const y = CURB + 1.0 + s * 3.0;
      if (y + 1.3 > CURB + h) break;
      for (let k = 0; k < n; k++) {
        const t = -len / 2 + (k + 0.5) * (len / n);
        if (s === 0 && doors.some(([ds, dt]) => ds === side && Math.abs(dt - t) < 1.5)) continue;
        const p = facePt(cx, cz, w, d, side, t, 0.03);
        f.box(GLASS_D, p.x, y, p.z, 0.8, 1.15, 0.08, p.ly);
        const q = facePt(cx, cz, w, d, side, t, 0.07);
        const tx = Math.cos(p.ly), tz = -Math.sin(p.ly);
        for (const sg of [-1, 1]) f.box(shutter, q.x + tx * sg * 0.62, y - 0.02, q.z + tz * sg * 0.62, 0.42, 1.2, 0.06, p.ly);
        f.box(WHITE2, q.x, y - 0.12, q.z, 1.1, 0.1, 0.16, p.ly);
      }
    }
  }
}

// Canary palm (Phoenix canariensis): stout trunk with leaf-scar rings, dense arching crown.
// Date clusters (orange) when dates = true.
function palm(f, lx, lz, s = 1, dates = false, h = 6.5) {
  const G = f.S, x = f.wx(lx, lz), z = f.wz(lx, lz), H = h * s;
  G.cyl(TRUNK, x, CURB + H / 2, z, 0.36 * s, H, 9);
  for (let k = 1; k < 5; k++) G.cyl(0x7a5a3c, x, CURB + H * k / 5, z, 0.4 * s, 0.14, 9);
  G.sphere(0x6a5a2a, x, CURB + H, z, 1.0 * s, 0.8 * s, 1.0 * s, 0, 0, 0, 8);
  const n = 11;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * PI * 2 + s, L1 = 2.0 * s, L2 = 2.2 * s, t1 = 0.55, t2 = -0.45;
    const c = k % 2 ? PALM : PALM2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const x1 = x + ca * (L1 / 2) * Math.cos(t1), y1 = CURB + H + 0.3 * s + (L1 / 2) * Math.sin(t1), z1 = z + sa * (L1 / 2) * Math.cos(t1);
    G.box(c, x1, y1, z1, L1, 0.1, 0.7 * s, -a, 0, t1);
    const ex = x + ca * L1 * Math.cos(t1), ey = CURB + H + 0.3 * s + L1 * Math.sin(t1), ez = z + sa * L1 * Math.cos(t1);
    G.box(c, ex + ca * (L2 / 2) * Math.cos(t2), ey + (L2 / 2) * Math.sin(t2), ez + sa * (L2 / 2) * Math.cos(t2), L2, 0.1, 0.62 * s, -a, 0, t2);
  }
  if (dates) for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + 0.4;
    G.sphere(0xd0702a, x + Math.cos(a) * 0.62 * s, CURB + H - 0.45 * s, z + Math.sin(a) * 0.62 * s, 0.26 * s, 0.42 * s, 0.26 * s, 0, 0, 0, 6);
  }
  circle(x, z, 0.4 * s, 99, 'tree');
}

// Christmas week (§6.9): a tinsel bauble (diameter d, low-poly) and a spiral of them up a palm's
// trunk (visual only).
const bauble = (f, color, lx, y, lz, d) => f.S.sphere(color, f.wx(lx, lz), y, f.wz(lx, lz), d, d, d, 0, 0, 0, 6);
function tinsel(f, lx, lz, s = 1, h = 6.5) {
  const n = Math.floor(h * s / 0.4);
  for (let k = 0; k < n; k++) {
    const a = k * 0.9, y = CURB + 0.6 + k * 0.38;
    bauble(f, [RED, SUNY, 0xe8e8f0][k % 3], lx + Math.sin(a) * 0.42 * s, y, lz + Math.cos(a) * 0.42 * s, 0.18);
  }
}

// Prickly pear (tunera): flat pads in a clump. No collider (it is low; kicking through is fine).
function tunera(f, lx, lz, s = 1, rnd = Math.random) {
  const G = f.S, x = f.wx(lx, lz), z = f.wz(lx, lz);
  for (let k = 0; k < 6; k++) {
    const a = k * 1.7 + rnd(), r = (k < 3 ? 0.25 : 0.6) * s, y = CURB + (k < 3 ? 0.45 : 1.0) * s;
    G.sphere(k % 2 ? 0x5f8f4a : 0x6f9f52, x + Math.cos(a) * r, y, z + Math.sin(a) * r, 0.75 * s, 0.9 * s, 0.2 * s, 0, a, 0.3 * (rnd() - 0.5), 8);
  }
  G.sphere(RED, x + 0.3 * s, CURB + 1.5 * s, z, 0.14 * s, 0.18 * s, 0.14 * s, 0, 0, 0, 6);
}

// Cardón (columnar euphorbia): a clump of ribbed columns. Circle collider.
function cardon(f, lx, lz, s = 1) {
  const G = f.S, x = f.wx(lx, lz), z = f.wz(lx, lz);
  const cols = [[0, 0, 2.2], [0.5, 0.2, 1.7], [-0.4, 0.4, 1.5], [0.1, -0.5, 1.9], [-0.5, -0.3, 1.2]];
  for (const [dx, dz, hh] of cols) {
    G.cyl(0x5f8a4a, x + dx * s, CURB + hh * s / 2, z + dz * s, 0.2 * s, hh * s, 6);
    G.sphere(0x5f8a4a, x + dx * s, CURB + hh * s, z + dz * s, 0.4 * s, 0.4 * s, 0.4 * s, 0, 0, 0, 6);
  }
  circle(x, z, 0.8 * s, 99, 'tree');
}

// Agave: a rosette of stiff leaves. No collider.
function agave(f, lx, lz, s = 1) {
  const G = f.S, x = f.wx(lx, lz), z = f.wz(lx, lz);
  for (let k = 0; k < 9; k++) {
    const a = k * 0.7, t = 0.6 + (k % 3) * 0.25;
    G.box(0x7a9a72, x + Math.cos(a) * 0.35 * s, CURB + 0.35 * s, z + Math.sin(a) * 0.35 * s, 1.1 * s, 0.08, 0.22 * s, -a, 0, t);
  }
}

// A clump of reeds / bulrushes at a water edge: leaning stalks, brown cattail heads. No collider.
function reeds(f, lx, lz, rnd, n = 7) {
  const G = f.S;
  for (let k = 0; k < n; k++) {
    const a = rnd() * PI * 2, r = rnd() * 0.7, h = 1.2 + rnd() * 0.9, tx = (rnd() - 0.5) * 0.35, tz = (rnd() - 0.5) * 0.35;
    const x = f.wx(lx + Math.cos(a) * r, lz + Math.sin(a) * r), z = f.wz(lx + Math.cos(a) * r, lz + Math.sin(a) * r);
    G.cyl(k % 3 ? 0x7a8a3a : 0x5f7a32, x, CURB + h / 2, z, 0.035, h, 4, tx, 0, tz);
    if (k % 2) G.cyl(0x6a4428, x + Math.sin(tz) * -h * 0.45, CURB + h * 0.95, z + Math.sin(tx) * h * 0.45, 0.07, 0.3, 5, tx, 0, tz);
  }
  G.cone(0x6f8a3a, f.wx(lx, lz), CURB + 0.35, f.wz(lx, lz), 0.6, 0.7, 6);
}

// Flower colour for a seed (geraniums, hibiscus, bougainvillea).
const FLOWERS = [0xd8321e, 0xc2307a, 0xf07a1e, 0xf7c31b, 0xe86aa0];
const k2c = (n) => FLOWERS[Math.abs(Math.round(n)) % FLOWERS.length];

// Bougainvillea: a magenta bush heaped against a wall.
function boug(f, lx, lz, s = 1) {
  f.S.sphere(0x3f7a3a, f.wx(lx, lz), CURB + 0.9 * s, f.wz(lx, lz), 1.6 * s, 1.8 * s, 1.2 * s, 0, 0, 0, 8);
  f.S.sphere(BOUG, f.wx(lx + 0.2, lz + 0.1), CURB + 1.4 * s, f.wz(lx + 0.2, lz + 0.1), 1.5 * s, 1.2 * s, 1.1 * s, 0, 0.5, 0, 8);
}

// A faceted rock (non-uniform icosahedron).
function rock(f, lx, lz, sx, sy, sz, c = ROJO, ry = 0, coll = true) {
  f.S.add(PRIM.ico(0), c, mat(f.wx(lx, lz), CURB + sy * 0.3, f.wz(lx, lz), 0, ry, 0, sx, sy, sz));
  if (coll) circle(f.wx(lx, lz), f.wz(lx, lz), Math.min(sx, sz) * 0.42, CURB + sy * 0.75, 'rock');
}

// Axis-aligned wall segment from (ax, az) to (bx, bz) (one coordinate equal), with a coping.
function wallSeg(f, ax, az, bx, bz, h = 1.1, c = WHITE, t = 0.35, cap = TERRA) {
  const cx = (ax + bx) / 2, cz = (az + bz) / 2, w = Math.abs(bx - ax) || t, d = Math.abs(bz - az) || t;
  f.box(c, cx, CURB, cz, w, h, d);
  if (cap) f.box(cap, cx, CURB + h, cz, w + 0.1, 0.1, d + 0.1);
  f.solid(cx, cz, w, d, CURB + h, 'wall');
}

// Ramp collider + wedge visual. (lx, lz) = centre; yaw = direction it rises; h0/h1 absolute.
function rampL(f, lx, lz, yaw, w, l, h0, h1, color, G = f.S) {
  const x = f.wx(lx, lz), z = f.wz(lx, lz);
  G.add(makeWedge(), color, mat(x, h0, z, 0, yaw, 0, w, h1 - h0, l));
  if (h0 > CURB + 0.01) G.box(color, x, (CURB + h0) / 2, z, w, h0 - CURB, l, yaw);
  ramp(x, z, yaw, w, l, h0, h1);
}

// Shallow walkable water: a floor at CURB of kind 'water' (blue on the minimap) + a flat blue slab.
function waterBox(f, lx, lz, w, d, rim = POOL_EDGE, rimW = 0.6) {
  if (rim) f.flat(rim, lx, lz, w + rimW * 2, d + rimW * 2, CURB + 0.024);
  f.flat(SEA, lx, lz, w, d, CURB + 0.03);
  f.flat(0x2f9ad0, lx, lz, w - 0.6, d - 0.6, CURB + 0.035);
  box(f.wx(lx, lz) - w / 2, f.wz(lx, lz) - d / 2, f.wx(lx, lz) + w / 2, f.wz(lx, lz) + d / 2, CURB, 'water');
}
function waterDisc(f, lx, lz, r, shore = 0xd8c08a) {
  const x = f.wx(lx, lz), z = f.wz(lx, lz);
  if (shore) f.F.cyl(shore, x, CURB + 0.012, z, r + 1.0, 0.02, 28);
  f.F.cyl(SEA, x, CURB + 0.03, z, r, 0.03, 28);
  f.F.cyl(0x2f9ad0, x, CURB + 0.04, z, r * 0.72, 0.02, 24);   // top 5 mm over the SEA disc (no z-fight)
  circle(x, z, r, CURB, 'water');
}

// String of party bulbs from a to b (block-local, absolute heights) sagging in the middle. The
// cable is outlined geometry; the bulbs go into L, rendered with an unlit material (MAT.mouth), so
// they glow in the night palette (§13.3).
const BULBS = [0xffd23f, 0xf07a1e, 0xd8321e, 0x7ad04a, 0x6ab0e8, 0xffffff];
function lights(f, L, ax, ay, az, bx, by, bz, n = 10, sag = 0.6) {
  let px = ax, py = ay, pz = az;
  for (let k = 1; k <= n; k++) {
    const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t - sag * 4 * t * (1 - t);
    const mx = (px + x) / 2, my = (py + y) / 2, mz = (pz + z) / 2, dx = x - px, dy = y - py, dz = z - pz;
    const len = Math.hypot(dx, dy, dz), yaw = Math.atan2(dx, dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
    f.S.box(0x2a2a2a, f.wx(mx, mz), my, f.wz(mx, mz), 0.04, 0.04, len, yaw, -pitch, 0);
    if (k < n) L.box(BULBS[(k + Math.round(ax)) % BULBS.length], f.wx(x, z), y - 0.12, f.wz(x, z), 0.16, 0.22, 0.16);
    px = x; py = y; pz = z;
  }
}
function addGlow(f, L) {
  if (L.empty || !f.scene) return;
  f.scene.add(new THREE.Mesh(L.build(), MAT.mouth));
}

// A separate outlined mesh that spins about one local axis while it is on screen.
function spinner(f, G, x, y, z, axis, speed) {
  if (G.empty || !f.scene) return null;
  const m = toonMesh(G.build(), { outline: 0.03 });
  m.position.set(x, y, z);
  m.onBeforeRender = () => { m.rotation[axis] = (performance.now() / 1000) * speed; };
  f.scene.add(m);
  return m;
}

// A sign on two posts. (lx, lz) = centre, ly = facing (0 faces +z / south).
function postSign(f, text, lx, lz, w, h, y0, ly = 0, opts = {}) {
  const tx = Math.cos(ly), tz = -Math.sin(ly);
  for (const s of [-1, 1]) {
    const px = lx + tx * s * (w / 2 + 0.2), pz = lz + tz * s * (w / 2 + 0.2);
    f.box(opts.post ?? WOOD_D, px, CURB, pz, 0.22, y0 + h - CURB, 0.22);
    f.circ(px, pz, 0.15, 99, 'pole');
  }
  f.box(opts.back ?? WOOD_D, lx, y0 - 0.1, lz, w + 0.2, h + 0.2, 0.1, ly);
  // Front plane just in front of the board, its double just behind it (same texture).
  const nx = Math.sin(ly), nz = Math.cos(ly);
  const m = f.sign(text, lx + nx * 0.07, y0 + h / 2, lz + nz * 0.07, w, h, ly, { ...SIGN, ...opts, double: true });
  const back = m.getObjectByName('signBack');
  if (back) back.position.z = -0.14;
}

// ---------------------------------------------------------------------------------------------
// tomat: tomato fields. Rows of low bushes on dark volcanic soil, merged, no solids (§6.3).

// Rows running along z (dir 'z') or x inside the rect [x0, x1] × [z0, z1].
function tomatoRows(f, x0, x1, z0, z1, dir, rnd, gap = 2.2) {
  const along = dir === 'z';
  const a0 = along ? x0 : z0, a1 = along ? x1 : z1, b0 = along ? z0 : x0, b1 = along ? z1 : x1;
  f.flat(SOIL, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, CURB + 0.02);
  for (let a = a0 + gap / 2; a <= a1 - gap / 2 + 0.01; a += gap) {
    // Furrow ridge (darker), then the bush row in segments of random height, red tomato dots.
    const len = b1 - b0;
    if (along) f.flat(SOIL_D, a, (b0 + b1) / 2, 0.9, len, CURB + 0.03);
    else f.flat(SOIL_D, (b0 + b1) / 2, a, len, 0.9, CURB + 0.03);
    const seg = 2.6, n = Math.max(1, Math.floor(len / seg));
    for (let k = 0; k < n; k++) {
      const b = b0 + (k + 0.5) * (len / n), hh = 0.42 + rnd() * 0.2, ww = 0.75 + rnd() * 0.25, ll = len / n - 0.25;
      const c = rnd() < 0.5 ? LEAF : LEAF2, jit = (rnd() - 0.5) * 0.12;
      if (along) f.box(c, a + jit, CURB, b, ww, hh, ll);
      else f.box(c, b, CURB, a + jit, ll, hh, ww);
      for (let t = 0; t < 3; t++) {
        const u = b + (rnd() - 0.5) * (ll - 0.4), side = rnd() < 0.5 ? -1 : 1, yy = CURB + 0.18 + rnd() * (hh - 0.2);
        const px = along ? a + side * (ww / 2 + 0.02) : u, pz = along ? u : a + side * (ww / 2 + 0.02);
        f.F.box(RED, f.wx(px, pz), yy, f.wz(px, pz), 0.16, 0.16, 0.16, rnd() * 3);
      }
    }
  }
}

// Windbreak of cane (cortavientos): a tall pale reed screen. Solid (it is at the field edge).
function canes(f, ax, az, bx, bz, h = 2.4) {
  const cx = (ax + bx) / 2, cz = (az + bz) / 2, w = Math.abs(bx - ax) || 0.25, d = Math.abs(bz - az) || 0.25;
  f.box(0xd8c890, cx, CURB, cz, w, h, d);
  const len = Math.max(w, d), alongX = w > d;
  for (let t = -len / 2 + 0.6; t < len / 2; t += 1.2) {
    const px = alongX ? cx + t : cx, pz = alongX ? cz : cz + t;
    f.box(0xb8a870, px, CURB, pz, alongX ? 0.08 : w + 0.06, h + 0.25, alongX ? d + 0.06 : 0.08);
  }
  f.solid(cx, cz, w, d, CURB + h, 'wall');
}

// Gravel / dirt track.
const track = (f, lx, lz, w, d) => { f.flat(DIRT, lx, lz, w, d, CURB + 0.025); };

// Estanque: a raised round concrete farm water tank with a walkable rim (top 1.8).
function estanque(f, lx, lz, r) {
  const x = f.wx(lx, lz), z = f.wz(lx, lz);
  f.S.cyl(CONC, x, CURB + 0.9, z, r, 1.8, 24);
  f.S.cyl(CONC_D, x, CURB + 1.82, z, r + 0.08, 0.06, 24);
  f.F.cyl(SEA, x, CURB + 1.86, z, r - 0.4, 0.04, 24);
  circle(x, z, r, CURB + 1.8, 'tank');
  rampL(f, lx - r - 2.2, lz, PI / 2, 1.2, 4.4, CURB, CURB + 1.8, CONC_D);
}

// Small farmhouse with a lean-to, a butano bottle and a crate.
function finca(f, cx, cz, side = 's') {
  house(f, cx, cz, 9, 7, 3.2, { roof: 'flat', doors: [[side, -1.5]], shutter: 0x6a4a2a });
  const p = facePt(cx, cz, 9, 7, side, 1.6, 1.3);
  f.box(WOOD_D, p.x, CURB + 2.5, p.z, 3.4, 0.12, 2.4, p.ly);
  f.prop('butano', p.x + 0.8, p.z + 1.6);
  f.prop('tomatlada', p.x + 0.4, p.z - 1.8);
}

function tomatfalt(f, W, ctx) {
  const { i, j, rnd } = ctx;
  f.flat(0x7a5236, 0, 0, W - 2, W - 2, CURB + 0.01);
  if (i === 0 && j === 1) tomatVischan(f, rnd);
  else if (i === 3 && j === 0) tomatPackhus(f, rnd);
  else tomatFields(f, rnd);
}

// The farmyard on vischan (Fin hund…, feature 31, DESIGN §10.21): the finca's yard dog keeps to
// it (game/dogs.js). Lot-shaped, as town.js `dogLots`: { ox, oz, yaw (the block's frame), x0, z0,
// x1, z1 (the yard, block-local: from the canes on the west and north to the fields on the south and
// past the tank on the east, not the track at x 6), door: [x, z] (the finca's), home: [x, z] (the
// dog's spot by it), walls: [[x0, z0, x1, z1]] (what it runs round: the finca; the tank with its
// ramp) }. Filled by tomatVischan.
export const FARM_YARD = {};

// (0,1): the gravel track Stig-Helmer refuses to drive on, and the lane by the field where Berra
// shouts "Heja Eslöv!" at a rollerskier.
function tomatVischan(f, rnd) {
  tomatoRows(f, -30, 2, -14, 30, 'z', rnd);
  tomatoRows(f, 10, 22, -16, 30, 'z', rnd);
  tomatoRows(f, -2, 22, -30, -22, 'x', rnd);
  // The track: from the south kerb up between the fields, then west to the finca.
  track(f, 6, 6, 6, 50);
  track(f, -11, -19.5, 28, 5);
  for (let k = 0; k < 9; k++) f.flat(0xa07e50, 6 + (k % 2 ? 1.2 : -1.2), 28 - k * 5.5, 0.6, 3.2, CURB + 0.03);
  finca(f, -22, -25, 'e');
  estanque(f, -7, -26, 2.8);
  Object.assign(FARM_YARD, { ox: f.ox, oz: f.oz, yaw: f.yaw, x0: -30.1, z0: -30.1, x1: -2.6, z1: -14.8, door: [-17.5, -23.5], home: [-16.4, -21.9],
    walls: [[-26.5, -28.5, -17.5, -21.5], [-14.2, -28.8, -4.2, -23.2]] });
  postSign(f, 'CAMINO SIN ASFALTAR', 1.4, 29.2, 3.8, 0.9, 1.6, 0, { bg: '#f4efe6', fg: '#d8321e' });   // [N]
  // The Eslöv lane: a narrow asphalt strip down the east side of the block.
  f.flat(0x55555c, 27.5, 0, 6, 60, CURB + 0.025);
  for (let z = -27; z < 30; z += 6) f.flat(0xf4f4f0, 27.5, z, 0.14, 2.6, CURB + 0.032);
  for (const z of [-29, -10, 10, 29]) { f.box(0xf4efe6, 24.2, CURB, z, 0.3, 0.6, 0.3); f.box(RED, 24.2, CURB + 0.6, z, 0.32, 0.12, 0.32); }
  postSign(f, 'ESLÖV 3 900 KM', 23.8, 16, 3.6, 0.9, 1.7, PI / 2, { bg: '#2f6a4a', fg: '#ffffff', border: '#ffffff' });   // [N] road-sign gag (≈ 3 880 km as the crow flies)
  canes(f, -30.5, -30.6, 22, -30.6);
  canes(f, -30.6, -30.5, -30.6, 30);
  for (const [x, z] of [[23.2, 23], [23.2, -22]]) palm(f, x, z, 0.8);
  tunera(f, -28, 28, 1.1, rnd);
  agave(f, 14, 29.5);
  f.prop('tomatlada', 9.6, 20);
  f.prop('tomatlada', 9.6, 18.6);
  f.prop('tomatlada', 2.4, 4);
}

// (3,0): the packing shed (empaquetado) where the tomato trucks load.
function tomatPackhus(f, rnd) {
  tomatoRows(f, -30, 30, -30, -19, 'x', rnd);
  tomatoRows(f, -30, -18, -16, 30, 'z', rnd);
  tomatoRows(f, 19, 30, -16, 30, 'z', rnd);
  f.flat(DIRT, 0, 10, 36, 40, CURB + 0.022);
  // The shed: x [-14, 14], z [-15, 3], whitewashed walls, corrugated sawtooth roof.
  const H = 5.6;
  f.box(WHITE, 0, CURB, -6, 28, H, 18);
  f.box(0xb7a58a, 0, CURB, -6, 28.1, 0.5, 18.1);
  for (let k = 0; k < 4; k++) f.roof(0x9aa0a4, 0, CURB + H, -15 + 4.5 * k + 2.25, 28.6, 1.4, 4.6);
  f.solid(0, -6, 28, 18, 99, 'building');
  // Loading bays on the south face; a dock (deck top 1.1) with a ramp at the west end.
  for (const x of [-8, 0, 8]) {
    f.box(0x3a3a3e, x, CURB + 0.95, 3.04, 4.2, 3.3, 0.1);
    f.box(0x9aa0a4, x, CURB + 4.25, 3.08, 4.6, 0.3, 0.14);
    for (let k = 0; k < 6; k++) f.box(0x8a9094, x, CURB + 1.2 + k * 0.5, 3.1, 4.0, 0.06, 0.06);
  }
  f.box(CONC, 0, CURB, 4.75, 24, 0.95, 3.5);
  f.solid(0, 4.75, 24, 3.5, CURB + 0.95, 'deck');
  rampL(f, -14.5, 4.75, PI / 2, 3.5, 5, CURB, CURB + 0.95, CONC_D);
  f.sign('TOMATES · EXPORTACIÓN', 0, CURB + H + 1.6, 3.2, 16, 2.0, 0, { bg: '#d8321e', fg: '#fff8e6', border: '#1d1426', scale: 0.6, double: true });   // [N]
  f.box(WOOD_D, -7, CURB + H - 0.4, 3.0, 0.2, 1.4, 0.2);
  f.box(WOOD_D, 7, CURB + H - 0.4, 3.0, 0.2, 1.4, 0.2);
  f.sign('EMPAQUETADO', 0, CURB + 4.95, 3.14, 4.6, 0.75, 0, { ...SIGN, scale: 0.62 });   // [N]
  // Crates on the dock and in the yard (smashable), stacked pallets (static).
  for (let k = 0; k < 5; k++) f.prop('tomatlada', -9 + k * 1.5, 5.4, 0, CURB + 0.95);
  for (const [x, z] of [[-12, 12], [-10.6, 12], [-12, 13.4], [11, 10], [12.4, 10], [11.7, 11.4]]) f.prop('tomatlada', x, z);
  for (let k = 0; k < 3; k++) {
    f.box(WOOD, 16, CURB + k * 0.5, 7 + k * 0.1, 1.4, 0.14, 1.2);
    f.box(0xc08a4a, 16, CURB + 0.14 + k * 0.5, 7, 1.2, 0.34, 1.1);
  }
  f.solid(16, 7, 1.4, 1.2, CURB + 1.5, 'crates');
  f.car('pickup', 6, 15, PI / 2, { color: 0x8a6a3a });
  postSign(f, 'TOMATES · EXPORTACIÓN', -22, 28.6, 6, 1.1, 1.5, 0, { bg: '#d8321e', fg: '#fff8e6' });   // [N]
  for (const [x, z] of [[-16.6, 10], [16.6, -2], [-16.6, -14]]) palm(f, x, z, 0.85, true);
  agave(f, 15, 27);
  tunera(f, -15.5, 27, 1, rnd);
  f.prop('butano', 14.3, 3.6);
  f.prop('papelera', -15.4, 6.4);
}

// (1,0): plain fields, a cane windbreak, a tool hut and a water tank.
function tomatFields(f, rnd) {
  tomatoRows(f, -30, -4, -30, 30, 'z', rnd);
  tomatoRows(f, 4, 30, -30, 8, 'z', rnd);
  tomatoRows(f, 14, 30, 12, 30, 'x', rnd);
  track(f, 0, 0, 7, 62);
  track(f, 9, 10, 10, 4);
  canes(f, -30.6, -30.5, -30.6, 30.5);
  canes(f, 30.6, -30.5, 30.6, 10);
  estanque(f, 9, 21, 3.4);
  // Tool hut (cuarto de aperos) with a tile roof.
  f.box(WHITE, -0.5, CURB, -24, 4, 2.6, 3.4);
  f.roof(TERRA, -0.5, CURB + 2.6, -24, 4.4, 1.0, 3.8);
  f.box(WOOD, 1.52, CURB, -24, 0.1, 2.0, 1.1);
  f.solid(-0.5, -24, 4, 3.4, 99, 'shed');
  for (const [x, z] of [[2, 29], [-2.5, -14], [2.6, -8]]) f.prop('tomatlada', x, z);
  f.prop('butano', 1.6, -21.6);
  palm(f, 2.4, 24, 0.8, true);
  cardon(f, -2.2, 12, 0.9);
  agave(f, 3, 3);
}

// ---------------------------------------------------------------------------------------------
// grisfest (2,0): the farm. Gate on the south road; the dance floor at the block centre.

function grisgard(f, W, ctx) {
  const { rnd } = ctx;
  const L = new GeoBuilder();
  f.flat(0xd2ae78, 0, 0, W - 2, W - 2, CURB + 0.01);
  f.flat(0xc49c66, 0, 19, 7, 24, CURB + 0.02);          // gravel drive, gate -> dance floor
  // Perimeter wall (white, terracotta coping) with the gate gap x [-4, 4] on the south.
  const E = 30.6;
  wallSeg(f, -E, E, -4.4, E, 1.3); wallSeg(f, 4.4, E, E, E, 1.3);
  wallSeg(f, E, -E, E, E, 1.3);
  wallSeg(f, -E, -10, -E, E, 1.3);
  wallSeg(f, -8, -E, E, -E, 1.3);
  // Gate: two pillars and a wrought-iron arch with the sign.
  for (const s of [-1, 1]) {
    f.box(WHITE, s * 4.8, CURB, E, 1.0, 3.0, 1.0);
    f.box(TERRA, s * 4.8, CURB + 3.0, E, 1.2, 0.2, 1.2);
    f.sphere(WHITE2, s * 4.8, CURB + 3.45, E, 0.5);
    f.solid(s * 4.8, E, 1.0, 1.0, 99, 'wall');
    f.box(0x2a2a2a, s * 4.2, CURB, E - 1.3, 0.08, 1.6, 2.0);               // iron gate leaves, open
  }
  for (const s of [-1, 1]) f.box(0x2a2a2a, s * 4.4, CURB + 3.0, E, 0.1, 1.7, 0.1);
  f.box(0x2a2a2a, 0, CURB + 4.6, E, 9.0, 0.14, 0.14);
  f.sign('GRISFEST\nFIESTA CANARIA', 0, CURB + 3.85, E + 0.1, 6.4, 1.4, 0, { bg: '#c0623a', fg: '#fff8e6', border: '#1d1426', scale: 0.62, double: true });   // [N]
  // Christmas week (§6.9): a garland of baubles along the arch and up its posts, a board on top.
  for (let k = 0; k <= 19; k++) bauble(f, [RED, SUNY, 0x2f8a4a, 0xe8e8f0][k % 4], -4.28 + k * 0.45, CURB + 4.67, E + 0.16, 0.18);
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) bauble(f, [SUNY, RED][k % 2], s * 4.4, CURB + 3.2 + k * 0.4, E + 0.12, 0.16);
  f.sign('FELIZ NAVIDAD · GOD JUL', 0, CURB + 5.02, E, 4.6, 0.56, 0, { bg: '#d8321e', fg: '#f7c31b', border: '#1d1426', scale: 0.6, double: true });   // [N]

  // Dance floor: plank deck x [-6.5, 6.5], z [-14, 6], top 0.4 (§6.3); dansgolv (0, 0) is on it.
  const DT = 0.4;
  f.box(WOOD_D, 0, CURB, -4, 13.1, DT - CURB, 20.1);
  for (let k = 0; k < 13; k++) f.box(k % 2 ? 0xb07a4a : 0xa06a3e, -6 + k, DT - 0.02, -4, 0.96, 0.03, 20);
  f.solid(0, -4, 13, 20, DT, 'deck');
  // Bandstand north of the floor: x [-4, 4], z [-23, -17], top 1.0, a step, tiled canopy.
  const BT = 1.0, BZ = -20;
  f.box(WHITE, 0, CURB, BZ, 8, BT - CURB, 6);
  f.box(TERRA_D, 0, BT - 0.04, BZ, 8.1, 0.06, 6.1);
  f.solid(0, BZ, 8, 6, BT, 'stage');
  f.box(WHITE2, 0, CURB, BZ + 3.3, 3, 0.45, 0.6); f.solid(0, BZ + 3.3, 3, 0.6, CURB + 0.45, 'step');
  for (const [x, z] of [[-3.7, BZ - 2.7], [3.7, BZ - 2.7], [-3.7, BZ + 2.7], [3.7, BZ + 2.7]]) f.cyl(WHITE, x, BT + 1.4, z, 0.16, 2.8, 8);
  f.roof(TERRA, 0, BT + 2.8, BZ, 9, 1.0, 7);
  f.box(TERRA_D, 0, BT + 2.75, BZ, 9.0, 0.1, 7.0);
  // Instruments: two guitars on stands, a drum, a mic, a speaker (the band is on its break).
  for (const x of [-2.2, 1.8]) {
    f.boxC(0xb8742e, x, BT + 0.55, BZ - 0.5, 0.45, 0.62, 0.14, 0.2);
    f.boxC(WOOD_D, x, BT + 1.15, BZ - 0.55, 0.08, 0.8, 0.06, 0.2);
  }
  f.cyl(RED, 0, BT + 0.35, BZ - 1.6, 0.4, 0.5, 12); f.cyl(0xf4f4f0, 0, BT + 0.62, BZ - 1.6, 0.38, 0.04, 12);
  f.cyl(0x2a2a2a, 0.2, BT + 0.7, BZ + 1.8, 0.03, 1.4, 5); f.sphere(0x2a2a2a, 0.2, BT + 1.45, BZ + 1.8, 0.12);
  f.box(0x2a2a2a, 3.1, BT, BZ + 1.6, 0.8, 1.1, 0.6);
  // Pergolas with the long tables. Tables run along z at x = ±13, ±19, z [-5, 7], top 0.9.
  const TT = 0.9;
  for (const side of [-1, 1]) {
    const px = side * 16;
    f.flat(0xc8b08a, px, 1, 12.5, 15, CURB + 0.025);
    for (const dx of [-6, 0, 6]) for (const z of [-6.5, 1, 8.5]) {
      f.box(WOOD_D, px + dx, CURB, z, 0.24, 3.0, 0.24);
      f.circ(px + dx, z, 0.16, 99, 'pole');
    }
    for (const dx of [-6, 0, 6]) f.box(WOOD, px + dx, CURB + 3.0, 1, 0.26, 0.22, 15.4);
    f.ceiling(px, 1, 13.2, 16, CURB + 2.95, CURB + 3.9);   // the chase camera stays under beams and vines
    for (let k = 0; k < 9; k++) f.box(WOOD, px, CURB + 3.22, -6.5 + k * 1.875, 12.6, 0.12, 0.16);
    for (let k = 0; k < 7; k++) {
      const vx = px + (rnd() - 0.5) * 10, vz = -5 + k * 2;
      f.S.sphere(k % 2 ? 0x4f8a3a : 0x5f9e44, f.wx(vx, vz), CURB + 3.4, f.wz(vx, vz), 2.4, 0.5, 1.6, 0, rnd() * 3, 0, 8);
    }
    for (const dx of [-3, 3]) {
      const tx = px + dx;
      f.box(0xf4f4f0, tx, TT - 0.06, 1, 1.25, 0.06, 12.2);                      // paper tablecloth
      f.box(RED, tx, TT - 0.1, 1, 1.3, 0.05, 12.25);
      f.box(WOOD, tx, CURB, -4.2, 0.9, TT - CURB - 0.1, 0.12); f.box(WOOD, tx, CURB, 6.2, 0.9, TT - CURB - 0.1, 0.12);
      f.solid(tx, 1, 1.2, 12, TT, 'table');
      for (const bs of [-1, 1]) {
        f.box(WOOD, tx + bs * 1.0, CURB, 1, 0.38, 0.45, 11.6);
        f.solid(tx + bs * 1.0, 1, 0.38, 11.6, CURB + 0.45, 'bench');
      }
      // Static table dressing: sangria jugs, wine bottles, bread.
      for (const z of [-4.2, -0.8, 2.8, 6.2]) {
        f.cyl(0xa8202a, tx - 0.25, TT + 0.17, z, 0.12, 0.34, 8);
        f.cyl(0x2f5a2a, tx + 0.3, TT + 0.2, z + 0.3, 0.06, 0.4, 6);
        f.sphere(0xe8c890, tx + 0.15, TT + 0.06, z - 0.4, 0.42, 0.16, 0.42);
      }
      // The grisfest plates (§6.3, §8.12 smash): three stacks per table, baseY = table top.
      for (const z of [-3, 1, 5]) f.prop('tallrikar', tx, z, 0, TT);
    }
    // Bulbs along the pergola's outer and inner edges.
    lights(f, L, px - 6, 3.0, -6.5, px - 6, 3.0, 8.5, 12, 0.35);
    lights(f, L, px + 6, 3.0, -6.5, px + 6, 3.0, 8.5, 12, 0.35);
  }
  // Light poles around the dance floor, strung across it and out to the gate.
  const poles = [[-8.6, -7.2], [8.6, -7.2], [-8.6, 9.5], [8.6, 9.5]];
  for (const [x, z] of poles) { f.cyl(WOOD_D, x, CURB + 2.4, z, 0.13, 4.8, 7); f.circ(x, z, 0.15, 99, 'pole'); }
  const PT = CURB + 4.6;
  lights(f, L, -8.6, PT, -7.2, 8.6, PT, 9.5, 18, 0.9);
  lights(f, L, 8.6, PT, -7.2, -8.6, PT, 9.5, 18, 0.9);
  lights(f, L, -8.6, PT, 9.5, 8.6, PT, 9.5, 12, 0.7);
  lights(f, L, -8.6, PT, -7.2, -3.7, BT + 2.8, BZ + 2.7, 8, 0.4);
  lights(f, L, 8.6, PT, -7.2, 3.7, BT + 2.8, BZ + 2.7, 8, 0.4);
  lights(f, L, -8.6, PT, 9.5, -4.8, CURB + 3.6, E, 14, 0.8);
  lights(f, L, 8.6, PT, 9.5, 4.8, CURB + 3.6, E, 14, 0.8);

  // Farmhouse ("the barn", §6.3): x [-29, -9], z [-29, -12], flat azotea top 5.0 with a parapet;
  // outside stair (a ramp) up the east face from z -10 to the roof at z -28. pryl_pung is on it.
  const RT = 5.0;
  house(f, -19, -20.5, 20, 17, RT - CURB, { roof: 'flat', top: RT, doors: [['s', -6], ['s', 0]], noWin: ['n', 'w', 'e'], gap: { side: 'e', a: -29, b: -26.6 } });
  f.box(GREEN_DOOR, -19, CURB, -11.96, 3.2, 2.9, 0.1);
  f.box(WOOD_D, -19, CURB + 2.9, -11.94, 3.6, 0.2, 0.14);
  rampL(f, -7.8, -19, PI, 2.2, 18, CURB, RT, WHITE2);
  for (let k = 1; k < 18; k++) f.box(0xcfc6b4, -7.8, CURB + (RT - CURB) * k / 18, -10 - k, 2.24, 0.04, 0.08);
  // Landing at the top, flush with the roof's north edge, so nobody runs off the end of the stair.
  f.box(WHITE2, -7.8, CURB, -28.75, 2.2, RT - CURB, 1.5);
  f.solid(-7.8, -28.75, 2.2, 1.5, RT, 'landing');
  f.box(WHITE, -6.62, CURB, -19.75, 0.16, RT + 0.9 - CURB, 19.5);                // stair balustrade
  f.box(TERRA_D, -6.62, RT + 0.9, -19.75, 0.22, 0.08, 19.6);
  f.solid(-6.62, -19.75, 0.16, 19.5, 99, 'wall');
  f.box(WHITE, -7.8, RT, -29.42, 2.36, 0.9, 0.16);
  f.solid(-7.8, -29.42, 2.36, 0.16, 99, 'wall');
  // On the roof: a water tank, a clothes line, an aerial. Keep (-18, -14) free (pryl_pung).
  f.box(0x2a2a2a, -25, RT, -25, 2.2, 1.6, 2.2);
  f.solid(-25, -25, 2.2, 2.2, RT + 1.6, 'tank');
  f.cyl(0x8a8a8a, -12, RT + 1.6, -26, 0.04, 3.2, 5); f.box(0x8a8a8a, -12, RT + 3.0, -26, 1.6, 0.05, 0.05);
  for (const x of [-22, -14]) f.cyl(0x8a8a8a, x, RT + 0.8, -21, 0.04, 1.6, 5);
  f.box(0xf4f4f0, -18, RT + 0.85, -21, 8, 0.7, 0.04);
  f.box(SUNY, -15.5, RT + 0.9, -21, 1.2, 0.6, 0.05);
  boug(f, -28, -10.6, 1.0);
  boug(f, -12.4, -10.6, 0.8);
  // Dragon tree (drago) by the farmhouse corner.
  const dx = -27, dz = -5;
  f.cyl(0x9a8a72, dx, CURB + 1.5, dz, 0.7, 3.0, 9);
  for (let k = 0; k < 6; k++) {
    const a = k * 1.05, bx = dx + Math.cos(a) * 1.4, bz = dz + Math.sin(a) * 1.4;
    f.boxC(0x9a8a72, (dx + bx) / 2, CURB + 3.6, (dz + bz) / 2, 0.35, 1.8, 0.35, -a, 0, 0.5);
    f.S.add(PRIM.ico(0), 0x3f6a3a, mat(f.wx(bx, bz), CURB + 4.7, f.wz(bx, bz), 0, a, 0, 2.0, 1.1, 2.0));
  }
  f.circ(dx, dz, 0.8, 99, 'tree');

  // Spit-roast pig over a fire pit (east of the drive). The pig turns while on screen.
  const sx = 15, sz = 19;
  for (let k = 0; k < 12; k++) { const a = k / 12 * PI * 2; rock(f, sx + Math.cos(a) * 1.5, sz + Math.sin(a) * 1.1, 0.6, 0.4, 0.6, STONE_D, a, false); }
  f.F.box(0x3a2a22, f.wx(sx, sz), CURB + 0.03, f.wz(sx, sz), 2.6, 0.04, 1.8);
  for (let k = 0; k < 7; k++) L.box(k % 2 ? 0xf07a1e : 0xffb030, f.wx(sx - 1 + k * 0.33, sz + (k % 3 - 1) * 0.3), CURB + 0.12, f.wz(sx, sz + (k % 3 - 1) * 0.3), 0.3, 0.12, 0.3, k);
  circle(f.wx(sx, sz), f.wz(sx, sz), 1.5, CURB + 1.5, 'fire');
  for (const s of [-1, 1]) {
    f.boxC(WOOD_D, sx + s * 1.8, CURB + 0.6, sz, 0.12, 1.3, 0.12, 0, 0, s * 0.25);
    f.boxC(WOOD_D, sx + s * 1.8, CURB + 0.6, sz, 0.12, 1.3, 0.12, 0, 0, -s * 0.25);
  }
  f.cyl(0x6a6a6a, sx, CURB + 1.15, sz, 0.04, 4.2, 5, 0, PI / 2);
  const pig = new GeoBuilder();
  pig.sphere(0xc8784a, 0, 0, 0, 1.7, 0.75, 0.8);
  pig.sphere(0xb86a40, 0.95, 0.05, 0, 0.6, 0.55, 0.55);
  pig.cyl(0xd88a5a, 1.25, 0.02, 0, 0.17, 0.15, 8, 0, 0, PI / 2);
  pig.cone(0xa85a34, 0.85, 0.28, 0.17, 0.1, 0.2, 5); pig.cone(0xa85a34, 0.85, 0.28, -0.17, 0.1, 0.2, 5);
  pig.sphere(RED, 1.36, 0.02, 0, 0.16);
  for (const lx of [-0.5, 0.5]) for (const lz of [-0.22, 0.22]) pig.cyl(0xb86a40, lx, -0.42, lz, 0.08, 0.35, 6);
  spinner(f, pig, f.wx(sx, sz), CURB + 1.15, f.wz(sx, sz), 'x', 0.9);
  // Sangria bar: a counter with jugs, barrels, a sign and bulbs.
  f.box(WHITE, 26, CURB, 1, 1.4, 1.1, 9);
  f.box(TERRA, 26, CURB + 1.1, 1, 1.7, 0.1, 9.3);
  f.solid(26, 1, 1.4, 9, CURB + 1.2, 'counter');
  for (let k = 0; k < 5; k++) f.cyl(0xa8202a, 26, CURB + 1.35, -2.6 + k * 1.8, 0.14, 0.4, 8);
  for (const z of [-4.5, -3.3, 5.6]) f.prop('tunna', 28.9, z);
  f.box(WOOD_D, 28.6, CURB, 1, 0.2, 3.2, 0.2);
  f.sign('SANGRÍA · VINO', 28.0, CURB + 2.7, 1, 4.6, 0.8, -PI / 2, { bg: '#fff8e6', fg: '#a8202a', border: '#1d1426', scale: 0.62, double: true });   // [N]
  lights(f, L, 26, CURB + 3.2, -4.5, 26, CURB + 3.2, 6.5, 8, 0.3);
  for (const z of [-4.5, 6.5]) f.box(WOOD_D, 26, CURB, z, 0.14, 3.1, 0.14);
  // Café tables round the courtyard (stools are low enough to walk through), a donkey cart, hay.
  for (const [x, z] of [[21.5, 13.5], [24, 21], [19.5, 26.5], [-9.5, 16]]) {
    f.cyl(WOOD, x, CURB + 0.85, z, 0.65, 0.08, 12); f.cyl(WOOD_D, x, CURB + 0.42, z, 0.08, 0.85, 5);
    f.cyl(0xa8202a, x + 0.15, CURB + 1.04, z - 0.1, 0.1, 0.3, 8);
    f.circ(x, z, 0.65, CURB + 0.9, 'table');
    for (const a of [0.4, 2.0, 3.6, 5.2]) f.cyl(WOOD, x + Math.cos(a) * 1.05, CURB + 0.25, z + Math.sin(a) * 1.05, 0.22, 0.5, 8);
  }
  f.box(WOOD, -12, CURB + 0.75, 26.8, 3.2, 0.12, 1.6, 0.3);
  for (const s of [-1, 1]) f.box(WOOD_D, -12 + Math.sin(0.3) * s * 0.8, CURB + 0.95, 26.8 + Math.cos(0.3) * s * 0.8, 3.2, 0.4, 0.08, 0.3);
  for (const s of [-1, 1]) f.cyl(WOOD_D, -12.3 + Math.sin(0.3) * s * 0.95, CURB + 0.6, 26.9 + Math.cos(0.3) * s * 0.95, 0.6, 0.1, 10, PI / 2, -0.3);
  f.boxC(WOOD_D, -14.4, CURB + 0.55, 27.6, 2.6, 0.1, 0.1, 0.3, 0, 0.35);
  f.solid(-12, 26.8, 3.4, 1.8, CURB + 1.2, 'cart');
  for (const [x, z] of [[-13, 12.4], [-11.6, 11.6]]) { f.box(0xe6c35a, x, CURB, z, 1.4, 0.8, 0.9); f.box(0xb8962e, x, CURB + 0.4, z, 1.42, 0.06, 0.92); }
  f.solid(-12.3, 12, 2.6, 1.8, CURB + 0.8, 'hay');
  // Piglet pen (west of the drive): low fence, mud, a trough, a shelter, five piglets.
  const gx = -20, gz = 20;
  f.flat(0x6a4a30, gx, gz, 10, 7, CURB + 0.03);
  for (const [ax, az, bx, bz] of [[-25.2, 16.3, -14.8, 16.3], [-25.2, 23.7, -14.8, 23.7], [-25.2, 16.3, -25.2, 23.7], [-14.8, 16.3, -14.8, 23.7]]) {
    const cx = (ax + bx) / 2, cz = (az + bz) / 2, w = Math.abs(bx - ax) || 0.2, d = Math.abs(bz - az) || 0.2;
    f.box(WOOD, cx, CURB + 0.35, cz, w, 0.12, d); f.box(WOOD, cx, CURB + 0.8, cz, w, 0.12, d);
    f.solid(cx, cz, w + 0.1, d + 0.1, CURB + 1.0, 'fence');
  }
  for (const [x, z] of [[-25.2, 16.3], [-14.8, 16.3], [-25.2, 23.7], [-14.8, 23.7], [-20, 16.3], [-20, 23.7]]) f.box(WOOD_D, x, CURB, z, 0.18, 1.05, 0.18);
  f.box(WOOD_D, -23.5, CURB, 22.4, 3, 1.4, 2.4); f.box(TERRA, -23.5, CURB + 1.4, 22.4, 3.4, 0.14, 2.8);
  f.box(0x8a8a8a, -17, CURB, 17.4, 2.2, 0.4, 0.6);
  for (let k = 0; k < 5; k++) {
    const x = gx - 2 + k * 1.2 + (rnd() - 0.5), z = gz - 1.5 + (k % 2) * 1.6, a = rnd() * 6;
    const hx = x + Math.cos(a) * 0.38, hz = z - Math.sin(a) * 0.38;
    f.S.sphere(0xf2a8a0, f.wx(x, z), CURB + 0.32, f.wz(x, z), 0.75, 0.48, 0.48, 0, a, 0, 8);
    f.S.sphere(0xf2a8a0, f.wx(hx, hz), CURB + 0.42, f.wz(hx, hz), 0.32, 0.3, 0.32, 0, 0, 0, 8);
  }
  // Greenery: palms in the corners, prickly pears and bougainvillea along the walls.
  for (const [x, z] of [[-27.5, 27.5], [27.5, 27.5], [27.5, -27.5], [8, 26], [-8, 26]]) palm(f, x, z, x * x > 400 ? 1.05 : 0.8);
  for (const [x, z] of [[-29, 4], [29, 14], [-2, -29], [12, -29], [22, -29]]) tunera(f, x, z, 1.1, rnd);
  for (const [x, z] of [[-10, 29.4], [12, 29.4], [29.4, -12], [29.4, 22]]) boug(f, x, z, 0.9);
  f.prop('butano', -10.4, -11.2);
  f.prop('butano', 24.6, -5.6);
  addGlow(f, L);
}

// ---------------------------------------------------------------------------------------------
// fataga (0,0): the village. Entry lane from the south road (bus stop) to the square with the well;
// church north of the square; tablecloths on lines east of the well; sheepfold in the north-west.

function fataga(f, W, ctx) {
  const { rnd } = ctx;
  f.flat(0xc9a26b, 0, 0, W - 2, W - 2, CURB + 0.01);
  // Cobbled lanes and the square.
  const COB = 0xcdb894, COB2 = 0xbfa982;
  f.flat(COB, 0, 20, 6, 22, CURB + 0.02);                 // entry lane
  f.flat(COB, 3, 0.5, 26, 21, CURB + 0.02);               // square x [-10, 16], z [-10, 11]
  f.flat(COB, -15, 10, 30, 6, CURB + 0.021);              // west lane
  f.flat(COB, 3, -27, 6, 6, CURB + 0.021);
  f.flat(COB, -6.5, -16, 7, 30, CURB + 0.021);            // lane west of the church
  f.flat(COB, 15, -19, 6, 4, CURB + 0.021);
  for (let k = 0; k < 40; k++) f.flat(COB2, -8 + rnd() * 22, -8 + rnd() * 18, 0.9 + rnd(), 0.7 + rnd() * 0.6, CURB + 0.024, rnd() * 3);
  // The well at (0, 0): pryl_kniv floats above its rim (y 1.2).
  f.cyl(0xe8e0d0, 0, CURB + 0.38, 0, 0.75, 0.75, 14);
  f.cyl(STONE, 0, CURB + 0.8, 0, 0.8, 0.1, 14);
  f.F.cyl(0x1a3a5a, f.wx(0, 0), CURB + 0.86, f.wz(0, 0), 0.5, 0.02, 12);
  for (const s of [-1, 1]) f.box(WOOD_D, s * 0.7, CURB + 0.8, 0, 0.12, 1.5, 0.12);
  f.box(WOOD_D, 0, CURB + 2.3, 0, 1.6, 0.14, 0.14);
  f.circ(0, 0, 0.8, CURB + 0.85, 'well');
  // Church: x [-3, 9], z [-22, -10], bell gable on the south front.
  house(f, 3, -16.5, 12, 13, 6.5, { roof: 'tile', doors: [['s', 0]], noWin: ['s', 'n'], door: 0x6a3a22 });
  f.box(WHITE, 3, CURB + 6.5, -10.25, 5.2, 4.2, 0.5);
  f.roof(WHITE, 3, CURB + 10.7, -10.25, 5.2, 1.2, 0.5, 0);
  for (const s of [-1, 1]) {
    f.box(0x2a2420, 3 + s * 1.2, CURB + 7.4, -10.0, 1.0, 1.7, 0.1);
    f.cyl(0xb08a3a, 3 + s * 1.2, CURB + 7.8, -10.1, 0.32, 0.6, 10);
  }
  f.box(WOOD_D, 3, CURB + 11.9, -10.25, 0.12, 1.2, 0.12); f.box(WOOD_D, 3, CURB + 12.25, -10.25, 0.7, 0.12, 0.12);
  f.box(0xd8cfbc, 3, CURB, -9.4, 5, 0.3, 1.2); f.solid(3, -9.4, 5, 1.2, CURB + 0.3, 'step');
  f.box(0x6a3a22, 3, CURB + 2.5, -9.94, 1.8, 0.7, 0.08);
  // Houses [cx, cz, w, d, h, opts].
  const H = [
    [-8, 22, 7, 8, 3.4, { roof: 'tile', doors: [['e', 0]] }],
    [-15.75, 22, 8.5, 9, 4.2, { roof: 'flat', doors: [['n', 1]] }],
    [-25, 20, 10, 12, 3.6, { roof: 'tile', doors: [['n', 0]] }],
    [8, 22, 7, 9, 3.6, { roof: 'tile', doors: [['w', 1]] }],
    [16.75, 21, 10.5, 8, 4.0, { roof: 'flat', doors: [['n', -2]], shutter: 0x6a4a2a }],
    [26, 23, 8, 10, 3.4, { roof: 'tile', doors: [['n', 0]] }],
    [-14, 1, 9, 9, 4.2, { roof: 'tile', doors: [['e', 0]] }],
    [-26, 0, 8, 12, 3.4, { roof: 'flat', doors: [['e', 2]], shutter: 0x6a4a2a }],
    [22, 3, 10, 10, 6.0, { roof: 'tile', doors: [['w', 2]], stories: 2 }],
    [24, -12, 12, 10, 3.6, { roof: 'flat', doors: [['w', 0]] }],
    [21, -25, 14, 8, 3.8, { roof: 'tile', doors: [['s', -3]], shutter: 0x6a4a2a }],
  ];
  for (const [cx, cz, w, d, h, o] of H) house(f, cx, cz, w, d, h, o);
  // Canarian wooden balcony on the two-storey house facing the square.
  f.box(WOOD_D, 16.6, CURB + 3.1, 3, 0.8, 0.14, 5);
  for (let k = 0; k < 9; k++) f.box(WOOD, 16.3, CURB + 3.24, 0.7 + k * 0.58, 0.08, 1.0, 0.08);
  f.box(WOOD_D, 16.3, CURB + 4.24, 3, 0.14, 0.1, 5);
  f.box(WOOD_D, 16.6, CURB + 5.8, 3, 1.0, 0.12, 5.4);
  // Bar/shop sign.
  f.sign('BAR · TIENDA', 21, CURB + 3.0, -20.9, 4.2, 0.8, 0, { ...SIGN, bg: '#fff8e6', fg: '#2f6a4a' });   // [N]
  f.prop('butano', 15.4, -20.4);
  f.prop('palmkruka', 13.6, -20.2);
  // Tablecloths on lines (MANTELES · DUKAR) behind fatagaDukar (8, 4), facing the square.
  for (const x of [4, 9, 14]) { f.box(WOOD_D, x, CURB, 7.2, 0.14, 2.6, 0.14); f.circ(x, 7.2, 0.12, 99, 'pole'); }
  f.box(0xe8e4dc, 9, CURB + 2.5, 7.2, 10, 0.03, 0.03);
  const EMB = [0xd8321e, 0x2f6aa8, 0x2f8a4a, 0xf07a1e, 0xc2307a, 0xf7c31b];
  for (let k = 0; k < 6; k++) {
    const x = 4.9 + k * 1.65;
    f.box(0xfbf7ee, x, CURB + 1.2, 7.2, 1.45, 1.3, 0.04);
    f.box(EMB[k], x, CURB + 1.28, 7.2, 1.25, 0.08, 0.06);
    f.box(EMB[(k + 2) % 6], x, CURB + 1.85, 7.2, 0.5, 0.5, 0.06, 0.785);
    f.box(EMB[k], x, CURB + 2.35, 7.2, 1.25, 0.06, 0.06);
  }
  f.sign('MANTELES · DUKAR', 9, CURB + 3.0, 7.2, 4.8, 0.7, 0, { ...SIGN, bg: '#fff8e6', fg: '#a8202a', double: true });   // [N]
  f.box(WOOD, 12.5, CURB, 9.4, 2.4, 0.8, 1.0); f.solid(12.5, 9.4, 2.4, 1.0, CURB + 0.8, 'table');
  for (let k = 0; k < 4; k++) f.box(EMB[k + 1], 11.8 + (k % 2) * 1.3, CURB + 0.8 + Math.floor(k / 2) * 0.1, 9.4, 1.0, 0.1, 0.7);
  // Sheepfold: dry-stone walls x [-28, -10], z [-30, -16]; gate gap x [-20, -16] on the south.
  const SWALL = (ax, az, bx, bz) => wallSeg(f, ax, az, bx, bz, 1.1, STONE, 0.6, STONE_D);
  SWALL(-28, -16, -20, -16); SWALL(-16, -16, -10, -16); SWALL(-28, -30, -10, -30); SWALL(-28, -30, -28, -16); SWALL(-10, -30, -10, -16);
  f.box(WOOD_D, -18, CURB + 0.6, -15.6, 0.12, 1.2, 0.12);
  f.flat(0xa88a5a, -19, -23, 17, 13, CURB + 0.022);
  for (const [x, z] of [[-26.5, -28.5], [-20, -28.5], [-13.5, -28.5], [-26.5, -25], [-13.5, -25]]) f.box(WOOD_D, x, CURB, z, 0.2, 2.2, 0.2);
  f.box(TERRA, -20, CURB + 2.2, -26.7, 14.2, 0.14, 4.4);
  f.ceiling(-20, -26.7, 14.2, 4.4, CURB + 2.2, CURB + 2.34);   // the chase camera stays under the shelter
  f.solid(-20, -28.5, 14, 0.4, 99, 'post');
  f.box(0xd8c060, -24, CURB, -28.4, 3, 0.8, 1.2);
  for (const [x, z, a] of [[-15, -20, 0.4], [-22, -21.5, 2.2], [-18.5, -24, 4.1]]) sheep(f, x, z, a);
  // Date palms, cacti, bougainvillea.
  for (const [x, z, s] of [[-8, -8, 1], [-8.4, 8.4, 0.9], [14.6, -7.8, 1.05], [-8, 28.6, 0.85], [12.6, 28.6, 0.8], [-30, 9, 1.1], [29.5, 9.5, 0.9]]) palm(f, x, z, s, true);
  // Christmas week (§6.9): tinsel on the square's palm by the entry lane, and a plastic julgran on
  // the azotea of the corner house (16.75, 21). Up there its collider stays inside the house's, so
  // nothing solid is added where the sheep run (fatagaSheep is measured).
  tinsel(f, -8.4, 8.4, 0.9);
  f.prop('julgran', 12.4, 17.9, 0, CURB + 4.0);
  for (const [x, z] of [[-9.6, -13], [9.6, -23], [30, -30], [-30, -30.5], [-30, -13]]) tunera(f, x, z, 1, rnd);
  for (const [x, z] of [[-4.6, 17.5], [4.2, 27.4], [16.4, -2.6], [-8.9, -4.2], [17.4, -17.6]]) boug(f, x, z, 0.8);
  agave(f, 11, -9); agave(f, -10.4, 13);
  // Ochre crags behind the village (north edge), clear of the sidewalk ped loop at -32.6. Each is
  // 0.85·sx long: besides rock()'s 1 m circle (the waist) it gets the mesh's widest section, a box
  // 0.85·sx × 0.53·sz along its long axis (r3: the circle alone let the player walk 2–3 m into the
  // rock, and under the fold shelter the chase eye ended inside it).
  for (let k = 0; k < 6; k++) {
    const x = -28 + k * 11 + rnd() * 3, z = -29.5 + rnd(), sx = 5 + rnd() * 3, sy = 3 + rnd() * 2.5, ry = rnd() * 3;
    rock(f, x, z, sx, sy, 2.4, k % 2 ? ROJO2 : OCHRE, ry);
    ramp(f.wx(x, z), f.wz(x, z), ry + PI / 2, 2.4 * 0.526, sx * 0.85, CURB + sy * 0.75, CURB + sy * 0.75, 'rock');
  }
  // Village sign at the entry, a bench, wall lanterns.
  postSign(f, 'FATAGA', 5.2, 29.4, 3.2, 0.8, 1.4, 0, { bg: '#f4efe6', fg: '#1d1426' });
  f.prop('bank', -3.6, 3.4, PI / 2);
  for (const [x, z] of [[-4.45, 20], [4.45, 19], [-9.45, 1], [16.95, -1]]) f.box(0x2a2a2a, x, CURB + 2.5, z, 0.3, 0.45, 0.3);
}

// A static sheep for the fold (the mission sheep are Rabbits).
function sheep(f, lx, lz, a) {
  const x = f.wx(lx, lz), z = f.wz(lx, lz), G = f.S, c = Math.cos(a), s = Math.sin(a);
  G.sphere(0xf2ede0, x, CURB + 0.75, z, 1.2, 0.8, 0.8, 0, -a, 0, 8);
  G.sphere(0x3a3230, x + c * 0.7, CURB + 0.95, z + s * 0.7, 0.36, 0.42, 0.32, 0, -a, 0, 8);
  for (const [u, v] of [[-0.35, -0.22], [-0.35, 0.22], [0.35, -0.22], [0.35, 0.22]]) G.cyl(0x3a3230, x + c * u - s * v, CURB + 0.2, z + s * u + c * v, 0.06, 0.4, 5);
  circle(x, z, 0.5, CURB + 1.0, 'sheep');
}

// ---------------------------------------------------------------------------------------------
// golf (4,0): fairway from the tee (south-east) past the pond to green 18 (north-west).

function golf(f, W, ctx) {
  const { rnd } = ctx;
  f.flat(0x6aa84a, 0, 0, W - 2, W - 2, CURB + 0.01);
  // Fairway: overlapping rounded patches with mowing stripes.
  const FW = [[16, 14, 9], [8, 6, 10], [0, -2, 10], [-8, -12, 9], [-14, -19, 8]];
  for (const [x, z, r] of FW) f.F.cyl(0x86c95a, f.wx(x, z), CURB + 0.02, f.wz(x, z), r, 0.02, 24);
  // Mowing bands across the fairway line, tee (16, 14) -> green (-14, -19).
  const fy = Math.atan2(-30, -33);
  for (let k = 0; k < 9; k++) {
    const t = (k + 0.5) / 9;
    f.flat(k % 2 ? 0x92d264 : 0x7cbf52, 16 - 30 * t, 14 - 33 * t, 9, 4.9, CURB + 0.035, fy);   // over the fairway discs (top CURB+0.03)
  }
  // Green with flag 18.
  f.F.cyl(0xa8e07a, f.wx(-17, -21), CURB + 0.03, f.wz(-17, -21), 5.5, 0.02, 24);
  f.F.cyl(0x1d1426, f.wx(-16, -21), CURB + 0.04, f.wz(-16, -21), 0.18, 0.02, 10);
  f.cyl(0xf4f4f0, -16, CURB + 1.6, -21, 0.05, 3.2, 6);
  f.box(RED, -15.4, CURB + 2.7, -21, 1.2, 0.8, 0.04);
  f.sign('18', -15.4, CURB + 2.75, -20.96, 0.9, 0.6, 0, { bg: '#d8321e', fg: '#fff8e6', border: null, scale: 0.8, double: true });   // [N]
  f.circ(-16, -21, 0.08, 99, 'pole');
  // Bunkers.
  for (const [x, z, r] of [[-22, -14, 3], [-11, -26, 2.6], [-12.5, -24.5, 2.2], [6, -4, 2.8], [8.5, -2, 2.2], [-2, 10, 2.6]]) {
    f.F.cyl(0xb89a62, f.wx(x, z), CURB + 0.032, f.wz(x, z), r + 0.35, 0.02, 18);
    f.F.cyl(0xf0dca8, f.wx(x, z), CURB + 0.036, f.wz(x, z), r, 0.02, 18);
  }
  // The pond (fena_golf circles in it): walkable shallow water, reeds and rocks on the north side.
  waterDisc(f, -10, -6, 6.2, 0x5a8a3a);
  for (let k = 0; k < 7; k++) { const a = PI + 0.3 + k * 0.32; rock(f, -10 + Math.cos(a) * 7.2, -6 + Math.sin(a) * 7.2, 1.2, 0.8, 1.0, 0x9a948a, a, false); }
  for (const a of [-0.4, 0.5, 1.3, 2.4]) reeds(f, -10 + Math.cos(a) * 6.2, -6 + Math.sin(a) * 6.2, rnd);
  // Tee box (raised, top 0.4) with markers, a bench and a ball washer.
  f.box(0x86c95a, 19, CURB, 19, 6, 0.25, 4);
  f.solid(19, 19, 6, 4, CURB + 0.25, 'tee');
  f.sphere(RED, 17.4, CURB + 0.35, 18, 0.25); f.sphere(RED, 20.6, CURB + 0.35, 18, 0.25);
  f.prop('bank', 19, 22.2, PI);
  f.box(STEEL, 22.6, CURB, 18.4, 0.12, 1.0, 0.12); f.box(0x2f6aa8, 22.6, CURB + 1.0, 18.4, 0.3, 0.4, 0.3);
  // Clubhouse (south-west corner), terracotta roof, veranda to the east, sign to the road.
  house(f, -18, 21, 18, 10, 3.6, { roof: 'tile', doors: [['e', 0], ['s', 3]] });
  for (const z of [16.6, 25.4]) { f.box(WHITE, -7.4, CURB, z, 0.3, 3.0, 0.3); f.circ(-7.4, z, 0.2, 99, 'pole'); }
  f.box(TERRA_D, -7.9, CURB + 3.0, 21, 1.4, 0.14, 9.6);
  f.ceiling(-8.1, 21, 1.8, 9.6, CURB + 3.0, CURB + 3.6);   // the chase camera stays under the veranda
  f.prop('julgran', -8.0, 23.6);   // Christmas week (§6.9): by the clubhouse door, under the veranda
  postSign(f, 'CAMPO DE GOLF', -18, 28.6, 6.4, 1.2, 1.6, 0, { bg: '#2f6a4a', fg: '#fff8e6', border: '#fff8e6' });   // [N]
  for (const [z, c] of [[14.4, 0xf4f4f0], [11.6, 0xf2e6c0]]) golfCart(f, -14, z, c);
  // Palms along the edges, flowering bushes by the clubhouse.
  for (const [x, z] of [[28, -28], [28, -10], [28, 6], [-28, -28], [-28, -6], [-28, 8], [6, -28], [-11, 29.4], [12, 28.6]]) palm(f, x, z, 0.95);
  for (const [x, z] of [[-27.6, 15], [-9, 27], [-27.6, 27]]) boug(f, x, z, 0.9);
  for (const [x, z] of [[2, 24], [24, 26]]) f.prop('palmkruka', x, z);
}

function golfCart(f, lx, lz, c) {
  f.box(c, lx, CURB + 0.3, lz, 2.2, 0.6, 1.2);
  f.box(0x2a2a2a, lx - 0.2, CURB + 0.9, lz, 0.5, 0.5, 1.1);
  for (const s of [-1, 1]) for (const t of [-1, 1]) f.box(STEEL, lx + s * 0.9, CURB + 0.9, lz + t * 0.5, 0.06, 1.2, 0.06);
  f.box(c, lx, CURB + 2.1, lz, 2.3, 0.1, 1.3);
  for (const s of [-1, 1]) for (const t of [-1, 1]) f.cyl(0x222222, lx + s * 0.75, CURB + 0.2, lz + t * 0.6, 0.2, 0.14, 8, PI / 2);
  f.solid(lx, lz, 2.2, 1.2, CURB + 2.2, 'cart');
}

// ---------------------------------------------------------------------------------------------
// bungalow (5,0): Angerud's show bungalow on the red rocks. Plot wall with a gate on the south.

function bungalowTomt(f, W, ctx) {
  const { rnd } = ctx;
  f.flat(ROJO2, 0, 0, W - 2, W - 2, CURB + 0.01);
  for (let k = 0; k < 14; k++) f.flat(k % 2 ? 0xb8683a : 0xcf8a52, -28 + rnd() * 56, -28 + rnd() * 56, 3 + rnd() * 6, 2 + rnd() * 4, CURB + 0.014, rnd() * 3);
  // The show plot: tiled terrace inside a white wall x [-14, 20], z [-22, 10]; gate x [-2, 4].
  f.flat(0xe8dcc4, 3, -6, 34, 32, CURB + 0.018);
  wallSeg(f, -14, 10, -2.8, 10, 1.0); wallSeg(f, 4.8, 10, 20, 10, 1.0);
  wallSeg(f, -14, -22, 20, -22, 1.0); wallSeg(f, -14, -22, -14, 10, 1.0); wallSeg(f, 20, -22, 20, 10, 1.0);
  for (const x of [-2.4, 4.4]) { f.box(WHITE, x, CURB, 10, 0.8, 1.8, 0.8); f.box(TERRA, x, CURB + 1.8, 10, 1.0, 0.15, 1.0); f.solid(x, 10, 0.8, 0.8, 99, 'wall'); }
  // Charter Sweden (§6.9): SunTrip posters on the plot wall, facing the road.
  for (const x of [-8.5, 10.5]) f.sign('SUNTRIP\nJUL I SOLEN', x, CURB + 0.55, 10.2, 1.5, 0.75, 0, { bg: '#f7c31b', fg: '#d8321e', border: '#d8321e', scale: 0.62 });   // [N]
  // Garden: a lawn with a crazy-paving path from the gate, terracotta tiles round the pool, a
  // brick barbecue, a table with chairs, flower beds along the wall.
  f.flat(0x7cb84e, -7.5, 1, 11, 16, CURB + 0.02);
  f.flat(0x8ac85a, -7.5, 1, 9.6, 14.6, CURB + 0.022);
  f.flat(0xd07a50, 6, -4, 15, 9, CURB + 0.02);
  for (let k = 0; k < 7; k++) f.flat(0xd9cdb4, 1 + (k % 2) * 0.5, 9 - k * 1.6, 1.6, 1.1, CURB + 0.026, k * 0.4);
  f.box(0xb85a3a, 16.8, CURB, 7.5, 2.2, 1.0, 1.0); f.box(0x6a6a6a, 16.8, CURB + 1.0, 7.5, 1.6, 0.08, 0.6);
  f.box(0xb85a3a, 16.8, CURB + 1.0, 7.95, 2.2, 1.0, 0.12); f.cyl(0x9a948a, 17.6, CURB + 2.4, 7.9, 0.15, 1.4, 6);
  f.solid(16.8, 7.5, 2.2, 1.0, CURB + 2.0, 'bbq');
  f.cyl(0xf4f4f0, 12, CURB + 0.72, 4.5, 0.6, 0.06, 12); f.cyl(STEEL, 12, CURB + 0.36, 4.5, 0.05, 0.72, 5);
  f.circ(12, 4.5, 0.6, CURB + 0.75, 'table');
  for (const a of [0, 1.6, 3.2, 4.8]) {
    const x = 12 + Math.cos(a) * 1.0, z = 4.5 + Math.sin(a) * 1.0;
    f.box(0xf4f4f0, x, CURB + 0.42, z, 0.45, 0.06, 0.45); f.box(0xf4f4f0, x + Math.cos(a) * 0.22, CURB + 0.42, z + Math.sin(a) * 0.22, 0.08, 0.5, 0.45, -a);
  }
  f.cyl(0xf4f4f0, 12, CURB + 1.4, 4.5, 0.03, 2.6, 5); f.cone(0x2f6aa8, 12, CURB + 2.6, 4.5, 1.5, 0.5, 10);
  for (const [x, z] of [[-12.6, -6], [-12.6, 2], [-12.6, 8], [-4, 9]]) { f.flat(0x6a4a30, x, z, 1.4, 1.4, CURB + 0.024); f.S.sphere(k2c(x + z), f.wx(x, z), CURB + 0.45, f.wz(x, z), 1.2, 0.8, 1.2, 0, 0, 0, 8); }
  // The bungalow: one-storey white cube x [-6, 14], z [-20, -9], flat roof; awning over the door.
  house(f, 4, -14.5, 20, 11, 3.2, { roof: 'flat', doors: [['s', -6]], shutter: 0x2f6aa8, noWin: ['s'] });
  f.box(0xbfe6ff, 7, CURB + 0.5, -8.97, 5, 2.0, 0.06);
  f.box(WHITE2, 7, CURB + 0.4, -8.93, 5.2, 0.1, 0.1);
  for (let k = 0; k < 8; k++) f.boxC(k % 2 ? 0xf4f4f0 : BUTANO, -2.6 + k * 0.85, CURB + 2.7, -8.3, 0.85, 0.08, 1.6, 0, -0.3);
  f.ceiling(0.375, -8.3, 6.8, 1.6, CURB + 2.42, CURB + 2.95);   // the chase camera stays under the awning
  // The pool (fena_bungalow circles in it): x [1.5, 10.5], z [-6.5, -1.5]. Depth marks on the coping.
  waterBox(f, 6, -4, 9, 5, POOL_EDGE, 0.7);
  for (const [t, x] of [['3 M', 1.15], ['1 M', 10.85]]) {   // [N] (depth marks; a nod to the Flamenco pool sign [F*])
    const m = f.sign(t, x, CURB + 0.03, -4, 0.6, 0.35, 0, { bg: '#f2eee4', fg: '#2f6aa8', border: null, scale: 0.8 });
    m.rotation.set(-PI / 2, 0, x < 5 ? -PI / 2 : PI / 2);
  }
  for (const s of [-1, 1]) f.box(0xc8ccd2, 10.9, CURB, -5 + s * 0.3, 0.06, 1.0, 0.06);
  f.box(0xf4f4f0, 0.9, CURB + 0.35, -4, 1.8, 0.08, 0.5);
  f.prop('solstol', 13.4, -3, 0);
  f.prop('solstol', 15.2, -3, 0);
  f.prop('parasoll', 14.3, -6);
  f.prop('palmkruka', -4, -7.6);
  f.prop('butano', 13.5, -8.5);
  palm(f, -9, -4, 0.75); palm(f, 17.5, 1.5, 0.7);
  boug(f, -13.2, -12, 0.9); boug(f, 19.2, -18, 0.9);
  // The seller's table under a parasol by the gate; the big SE VENDE board facing the road.
  f.box(0xf4f4f0, -6, CURB + 0.7, 16, 1.6, 0.08, 0.9); f.box(STEEL, -6, CURB, 16, 0.1, 0.7, 0.1);
  f.solid(-6, 16, 1.6, 0.9, CURB + 0.78, 'table');
  f.box(0xd8d0c0, -6.2, CURB + 0.78, 16, 0.5, 0.12, 0.35);
  f.cyl(0xf4f4f0, -6, CURB + 1.3, 16, 0.04, 2.6, 5);
  f.cone(BUTANO, -6, CURB + 2.6, 16, 1.4, 0.5, 10);
  postSign(f, 'SE VENDE · BUNGALOW\n4 RUM OCH KÖK', 18, 19, 7, 2.2, 1.5, 0, { bg: '#f7c31b', fg: '#1d1426', scale: 0.62 });   // [F*] the bungalow seller's line, relocated to the sign
  // Other plots for sale: survey stakes with red tape, a small sign.
  const stake = (x, z) => { f.box(0xf4f4f0, x, CURB, z, 0.1, 0.9, 0.1); f.box(RED, x, CURB + 0.7, z, 0.12, 0.2, 0.12); };
  const tape = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    f.box(RED, (ax + bx) / 2, CURB + 0.75, (az + bz) / 2, ax === bx ? 0.03 : len, 0.03, ax === bx ? len : 0.03);
  };
  for (const [x0, z0, x1, z1] of [[-29, -25, -18, -12], [-29, -6, -18, 8], [22, -28, 29.5, -10], [22, -4, 29.5, 12]]) {
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) stake(x, z);
    tape(x0, z0, x1, z0); tape(x0, z1, x1, z1); tape(x0, z0, x0, z1); tape(x1, z0, x1, z1);
  }
  postSign(f, 'SOLAR · SE VENDE', -24, 11, 3.6, 0.8, 1.2, 0, { bg: '#fff8e6', fg: '#d8321e' });   // [N]
  // Red rocks (Rocas Rojas) and desert plants.
  // (The north row stays clear of the sidewalk ped loop at -32.6.)
  for (const [x, z, s] of [[-26, -29, 4], [-14, -29, 3], [6, -29, 5], [26, -29, 3.6], [-29.5, 22, 3], [29, 26, 3.2], [-20, 28, 2.4]]) rock(f, x, z, s, s * 0.7, Math.min(s * 0.8, z < 0 ? 2.6 : 9), rnd() < 0.5 ? ROJO : 0x8f4a2a, rnd() * 3);
  for (const [x, z] of [[-24, 20], [26, 14], [-10, 24], [12, 26]]) cardon(f, x, z, 0.9);
  for (const [x, z] of [[-17, 18], [24, -14], [-26, -18], [10, 16]]) agave(f, x, z);
}

// ---------------------------------------------------------------------------------------------
// bygge (5,1): a half-built hotel. Ramp up to the 1st-floor slab (top 3.55), ramp on to the
// partial 2nd-floor slab (top 6.95, pryl_klocka at (6, -6) y 7.6). Crane, hoarding, site clutter.

function bygge(f, W, ctx) {
  const { rnd } = ctx;
  f.flat(0xb08a5a, 0, 0, W - 2, W - 2, CURB + 0.01);
  for (let k = 0; k < 10; k++) f.flat(k % 2 ? 0xa07a4c : 0xc09a64, -26 + rnd() * 52, -26 + rnd() * 52, 3 + rnd() * 5, 2 + rnd() * 4, CURB + 0.014, rnd() * 3);
  const S1 = CURB + 3.4, S2 = CURB + 6.8;
  // Brick infill (3.05 m tall from y0) along storey faces [ax, az, bx, bz]; gaps show the dark core.
  const infill = (y0, faces) => {
    for (const [ax, az, bx, bz] of faces) {
      const horiz = az === bz, len = horiz ? bx - ax : bz - az;
      for (let t = 0, n = 0; t < len - 0.1; t += 3.5, n++) {
        if ((n + (horiz ? 0 : 1)) % 3 === 1) continue;
        const seg = Math.min(3.5, len - t), cx = horiz ? ax + t + seg / 2 : ax, cz = horiz ? az : az + t + seg / 2;
        f.box(0xb85a3a, cx, y0, cz, horiz ? seg - 0.5 : 0.3, 3.05, horiz ? 0.3 : seg - 0.5);
      }
    }
  };
  // Ground floor: brick infill around a dark core, solid up to the 1st-floor slab.
  f.box(0x3a342e, 8, CURB, -9, 27, 3.05, 17);
  infill(CURB, [[-6, 0, 22, 0], [-6, -18, 22, -18], [-6, -18, -6, 0], [22, -18, 22, 0]]);
  f.solid(8, -9, 28, 18, S1, 'building');
  // Columns (every 7 m) and the slabs; rebar stubs where the 2nd floor is still missing.
  for (let x = -6; x <= 22; x += 7) for (let z = -18; z <= 0; z += 9) {
    f.box(CONC_D, x, CURB, z, 0.6, 3.1, 0.6);
    const inL2 = x >= 2 && z <= -3;
    if (inL2) f.box(CONC_D, x, S1, z, 0.55, 3.1, 0.55);
    else for (const [ox, oz] of [[-0.15, -0.15], [0.15, 0.15], [0.15, -0.15]]) f.cyl(0x6a3a2a, x + ox, S1 + 0.5, z + oz, 0.03, 1.0, 4);
  }
  f.box(CONC, 8, S1 - 0.35, -9, 28.4, 0.35, 18.4);
  f.box(CONC, 12, S2 - 0.35, -10.5, 20.4, 0.35, 15.4);
  // The storey under the 2nd-floor slab is closed like the 3rd floor's (a dark core, brick infill on
  // the faces the 1st floor walks along, corner columns), since its collider is solid from the ground
  // (no overhangs): it read as an open storey with an invisible wall at x 2 and z -3.
  f.box(0x3a342e, 12, S1, -10.5, 19.4, S2 - S1 - 0.35, 14.4);
  infill(S1, [[2, -3, 22, -3], [2, -18, 2, -3]]);
  for (const [x, z] of [[2, -3], [2, -18], [22, -3]]) f.box(CONC_D, x, S1, z, 0.55, 3.1, 0.55);
  f.solid(12, -10.5, 20, 15, S2, 'building');
  // Orange safety rail along the open south edge of the 1st floor.
  f.box(BUTANO, 8, S1 + 0.9, 0.1, 28, 0.12, 0.06);
  for (let x = -5; x <= 21; x += 2) f.box(0x8a8a8a, x, S1, 0.1, 0.05, 1.0, 0.05);
  // Ramp ground -> 1st floor from the west: x [-26, -6], z [-10, -4], rising east.
  rampL(f, -16, -7, PI / 2, 6, 20, CURB, S1, CONC_D);
  for (let k = 0; k < 10; k++) f.box(WOOD, -25 + k * 2, CURB + (S1 - CURB) * (k * 2 + 1) / 20 + 0.02, -7, 0.3, 0.06, 6.0);
  for (const s of [-1, 1]) f.box(YELLOW, -16, CURB, -7 + s * 3.05, 20, 0.2, 0.1);
  // Ramp 1st -> 2nd floor on the slab: x [-6, 2], z [-16, -12], rising east to the 2nd slab.
  rampL(f, -2, -14, PI / 2, 4, 8, S1, S2, 0x8a8f99);
  for (let k = 0; k < 8; k++) f.box(0xd86a1a, -5.5 + k, S1 + (S2 - S1) * (k + 0.5) / 8 + 0.02, -14, 0.25, 0.05, 4.0);
  // The plank at the 1st floor's east end (Stunthopp med G17-stämpel, feature 40, §10.27): the 3 m
  // strip between the 2nd floor's block and the rail runs onto it, and a car leaves it over the road
  // at x 200 towards the dream plane (landmark `stunt_planka`). A board on cement bags with the
  // yellow ramp's stripes at its end, x [19.2, 22], z [-2.7, -0.1] (clear of the column at (22, -3));
  // its collider is the ramp under the board.
  {
    const PL = 2.8, PH = 0.9, PW = 2.6, pz = -1.4, a = Math.atan2(PH, PL);
    ramp(f.wx(20.6, pz), f.wz(20.6, pz), f.yaw + PI / 2, PW, PL, S1, S1 + PH);
    f.boxC(WOOD, 20.6, S1 + PH / 2 - 0.04, pz, Math.hypot(PL, PH), 0.08, PW, 0, 0, a);
    for (let k = 0; k < 5; k++) f.boxC(k % 2 ? INK : YELLOW, 21.55, S1 + PH * (21.55 - 19.2) / PL + 0.01, pz - 1.04 + k * 0.52, 0.5, 0.08, 0.52, 0, 0, a);
    f.box(0xd8d0c0, 21.72, S1, pz, 0.45, 0.6, 2.3); f.box(0xc8c0b0, 21.72, S1 + 0.6, pz, 0.4, 0.04, 2.1);
    f.box(0xb85a3a, 20.3, S1, pz, 0.4, 0.18, 1.8);
  }
  // 3rd floor over the back half of the 2nd: x [12, 22], z [-18, -8], top 10.35 (out of reach;
  // brick infill under it, so it is a wall on the 2nd floor), then bare columns for the 4th.
  const S3 = CURB + 10.2;
  f.box(0x3a342e, 17, S2, -13, 9.4, 3.05, 9.4);
  for (const [px, pz, w, d] of [[14.5, -8, 2.6, 0.3], [20, -8, 3, 0.3], [12, -16.5, 0.3, 2.6], [12, -11, 0.3, 2.4]]) f.box(0xb85a3a, px, S2, pz, w, 3.05, d);
  for (const x of [12, 17, 22]) for (const z of [-18, -13, -8]) if (x !== 17 || z !== -13) f.box(CONC_D, x, S2, z, 0.5, 3.1, 0.5);
  f.box(CONC, 17, S3 - 0.35, -13, 10.4, 0.35, 10.4);
  f.solid(17, -13, 10, 10, S3, 'building');
  for (const [x, z] of [[12, -18], [22, -18], [22, -8], [12, -8]]) {
    f.box(CONC_D, x, S3, z, 0.45, 2.4, 0.45);
    for (const o of [-0.12, 0.12]) f.cyl(0x6a3a2a, x + o, S3 + 2.9, z + o, 0.03, 1.0, 4);
  }
  f.box(CONC_D, 17, S3 + 2.2, -18, 10.4, 0.4, 0.4);
  // On the 2nd floor: cement bags, a wheelbarrow, rebar. Keep (6, -6) free (pryl_klocka).
  f.box(0xd8d0c0, 8, S2, -15.5, 2.4, 0.6, 1.6); f.solid(8, -15.5, 2.4, 1.6, S2 + 0.6, 'bags');
  f.box(0x2f6aa8, 4.5, S2 + 0.35, -11, 1.2, 0.35, 0.7); f.cyl(0x222222, 5.2, S2 + 0.2, -11, 0.2, 0.12, 8, PI / 2);
  for (let x = 4; x <= 20; x += 4) f.cyl(0x6a3a2a, x, S2 + 0.5, -3.4, 0.03, 1.0, 4);
  // Tower crane (north-east corner) with a slowly slewing jib. Lattice mast: corner posts + braces.
  const cx = 26, cz = -24, CH = 28;
  for (const sx of [-0.7, 0.7]) for (const sz of [-0.7, 0.7]) f.box(YELLOW, cx + sx, CURB, cz + sz, 0.22, CH, 0.22);
  for (let k = 0; k < 14; k++) {
    const y = CURB + 1 + k * 2, t = k % 2 ? 0.62 : -0.62;
    f.boxC(0xe0b020, cx, y, cz - 0.7, 1.5, 0.1, 0.1, 0, 0, t);
    f.boxC(0xe0b020, cx, y, cz + 0.7, 1.5, 0.1, 0.1, 0, 0, -t);
    f.boxC(0xe0b020, cx - 0.7, y, cz, 0.1, 0.1, 1.5, 0, t, 0);
    f.boxC(0xe0b020, cx + 0.7, y, cz, 0.1, 0.1, 1.5, 0, -t, 0);
  }
  f.box(STEEL, cx, CURB, cz, 3.2, 1.2, 3.2);
  f.solid(cx, cz, 3.2, 3.2, 99, 'crane');
  const jib = new GeoBuilder();
  jib.box(0x3a3f4a, 0, 1.0, 0, 2.2, 2.0, 2.2);
  jib.box(YELLOW, -12, 2.2, 0, 30, 1.0, 1.0);
  jib.box(YELLOW, 6, 2.2, 0, 10, 0.9, 1.0);
  jib.box(CONC_D, 9.5, 1.3, 0, 2.4, 1.6, 1.6);
  jib.cone(YELLOW, 0, 4.4, 0, 0.6, 3.2, 4);
  jib.box(0x2a2a2a, -18, -4.5, 0, 0.05, 12.4, 0.05);
  jib.box(WOOD, -18, -10.8, 0, 1.6, 0.2, 1.2); jib.box(0xb85a3a, -18, -10.4, 0, 1.4, 0.6, 1.0);
  spinner(f, jib, f.wx(cx, cz), CURB + CH, f.wz(cx, cz), 'y', 0.05);
  // Hoarding along the south edge with the gate x [-8, 8] and the big billboard.
  for (const [x0, x1] of [[-30.6, -8.4], [8.4, 30.6]]) {
    const w = x1 - x0, x = (x0 + x1) / 2;
    f.box(0xe8e0c8, x, CURB, 30.4, w, 2.4, 0.2);
    f.box(0x2f6aa8, x, CURB + 2.2, 30.45, w, 0.2, 0.22);
    f.solid(x, 30.4, w, 0.4, CURB + 2.4, 'wall');
  }
  for (const s of [-1, 1]) { f.box(RED, s * 8.2, CURB, 30.4, 0.4, 2.8, 0.4); f.box(0xf4f4f0, s * 8.2, CURB + 1.0, 30.4, 0.42, 0.4, 0.42); f.solid(s * 8.2, 30.4, 0.4, 0.4, 99, 'post'); }
  for (const x of [17, 27]) f.box(WOOD_D, x, CURB + 2.4, 30.6, 0.3, 4.0, 0.3);
  f.sign('PRÓXIMAMENTE\nHOTEL NUEVA ESTOCOLMO II', 22, CURB + 4.6, 30.75, 13, 3.4, 0, { bg: '#1c7fb8', fg: '#fff8e6', border: '#f7c31b', scale: 0.62, double: true });   // [N] (§6.3)
  // Site hut, cement mixer, sand pile, bricks, a car jump ramp.
  f.box(0xf4f4f0, -22, CURB, 21, 6, 2.6, 2.6); f.box(0x2f6aa8, -22, CURB + 2.6, 21, 6.2, 0.12, 2.8);
  f.box(0x2f6aa8, -20, CURB, 22.34, 0.9, 2.0, 0.06);
  f.solid(-22, 21, 6, 2.6, 99, 'building');
  f.sign('OBRA', -23.6, CURB + 1.6, 22.36, 1.6, 0.6, 0, { ...SIGN, bg: '#f7c31b' });   // [N]
  f.cyl(BUTANO, -4, CURB + 1.3, 9, 0.75, 1.4, 10, 0.5); f.box(STEEL, -4, CURB, 9, 1.2, 0.7, 1.6);
  f.circ(-4, 9, 1.0, CURB + 2.0, 'mixer');
  f.cone(0xd8b878, 12, CURB + 0.9, 11, 3.2, 1.8, 12); f.circ(12, 11, 2.4, CURB + 1.4, 'sand');
  for (let k = 0; k < 4; k++) { f.box(WOOD, 16 + k * 1.6, CURB, 4, 1.3, 0.12, 1.1); f.box(0xb85a3a, 16 + k * 1.6, CURB + 0.12, 4, 1.2, 0.8, 1.0); }
  f.solid(18.4, 4, 6.4, 1.1, CURB + 0.95, 'bricks');
  f.cyl(0x6a3a2a, 2, CURB + 0.3, 14, 0.3, 6, 6, 0, PI / 2);
  f.solid(2, 14, 6, 0.6, CURB + 0.6, 'pipe');
  rampL(f, -16, 8, PI, 5, 8, CURB, CURB + 1.8, YELLOW);
  for (let k = 0; k < 4; k++) f.box(INK, -16, CURB + 0.2 + k * 0.4, 11.0 - k * 1.8, 5.04, 0.08, 0.3);
  for (let k = 0; k < 8; k++) f.prop('kon', -6 + k * 1.8, 24 - (k % 2) * 0.6);
  for (const [x, z] of [[24, 8], [25.2, 8.6], [24.4, 9.8], [-26, -26]]) f.prop('tunna', x, z);
  f.prop('butano', -18.6, 19.2);
  f.prop('butano', -18.2, 18.6);
  for (const [x, z] of [[-28, -28], [-28, 10], [28, 20]]) cardon(f, x, z, 0.8);
}

// ---------------------------------------------------------------------------------------------
// dyner (0,4) and (0,5): Maspalomas. Hip-ended sand ridges (exact ramp colliders, so cars and
// people run up and over them), a boardwalk down the middle, the palm grove and the lagoon.

// Hip-roof dune geometry in local (u along x, v along z): crest at v = 0, height h, base from
// v = -Dw (windward, gentle) to v = +Dl (lee, steep), ends sloping down over e. Two parts so the
// sunlit windward side and the shaded slip face get their own sand tones. town.js builds the big
// visual-only dunes beyond the west bound from it too.
export const DUNE_WIND = 0xf2dca6, DUNE_LEE = 0xd4ac70;
const _dg = new Map();
export function duneGeo(L, Dw, Dl, h, e) {
  const key = [L, Dw, Dl, h, e].join(',');
  if (_dg.has(key)) return _dg.get(key);
  const R = L / 2 - e;
  const A = [-L / 2, 0, -Dw], B = [L / 2, 0, -Dw], C = [L / 2, 0, Dl], D = [-L / 2, 0, Dl], P = [-R, h, 0], Q = [R, h, 0];
  const I = [0, h * 0.3, (Dl - Dw) * 0.25];
  const build = (tris) => {
    const v = [];
    for (const [a, b, c] of tris) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const mx = (a[0] + b[0] + c[0]) / 3 - I[0], my = (a[1] + b[1] + c[1]) / 3 - I[1], mz = (a[2] + b[2] + c[2]) / 3 - I[2];
      if (nx * mx + ny * my + nz * mz < 0) v.push(...a, ...c, ...b); else v.push(...a, ...b, ...c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  };
  const out = { wind: build([[A, B, Q], [A, Q, P], [A, P, D], [B, C, Q]]), lee: build([[D, P, Q], [D, Q, C]]) };
  _dg.set(key, out);
  return out;
}

// A dune centred at (lx, lz); phi = the lee direction (yaw). Colliders: the ridge part is one ramp
// per side; each sloping end is cut into 0.5 m slices of (up-ramp, flat, down-ramp) that match the
// hip faces at the slice centre (error ≤ 0.1 m), so there are no invisible walls for people. Cars
// test every piece under their body (up to ~2.7 m ahead of the centre) against 0.6 m above them,
// so the ends and the windward face keep a slope of 0.2: a car drives up and over from any side but
// the steeper lee (slip) face, which it can only come down.
function dune(f, lx, lz, phi, L, Dw, Dl, h, e = Math.min(L / 2 - 0.5, h / 0.2)) {
  const cx = f.wx(lx, lz), cz = f.wz(lx, lz), s = Math.sin(phi), c = Math.cos(phi);
  const g = duneGeo(L, Dw, Dl, h, e), m = mat(cx, CURB, cz, 0, phi, 0);
  f.S.add(g.wind, DUNE_WIND, m);
  f.S.add(g.lee, DUNE_LEE, m);
  const P = (u, v) => [cx + u * c + v * s, cz - u * s + v * c];
  const R = L / 2 - e;
  if (R > 0.01) {
    let [x, z] = P(0, -Dw / 2); ramp(x, z, phi, 2 * R, Dw, CURB, CURB + h, 'dune');
    [x, z] = P(0, Dl / 2); ramp(x, z, phi + PI, 2 * R, Dl, CURB, CURB + h, 'dune');
  }
  const n = Math.max(1, Math.ceil(e / 0.5)), du = e / n;
  for (const sd of [-1, 1]) for (let k = 0; k < n; k++) {
    const uc = sd * (R + (k + 0.5) * du), hc = h * (1 - (k + 0.5) / n);
    const vw = -Dw * (1 - hc / h), vl = Dl * (1 - hc / h);
    let [x, z] = P(uc, (-Dw + vw) / 2); ramp(x, z, phi, du, vw + Dw, CURB, CURB + hc, 'dune');
    if (vl - vw > 0.02) { [x, z] = P(uc, (vw + vl) / 2); ramp(x, z, phi, du, vl - vw, CURB + hc, CURB + hc, 'dune'); }
    [x, z] = P(uc, (vl + Dl) / 2); ramp(x, z, phi + PI, du, Dl - vl, CURB, CURB + hc, 'dune');
  }
}

// Tamarisk / beach scrub tuft.
function scrub(f, lx, lz, s = 1, c = 0x7a8a4a) {
  f.S.add(PRIM.ico(0), c, mat(f.wx(lx, lz), CURB + 0.35 * s, f.wz(lx, lz), 0, lx, 0, 1.6 * s, 0.8 * s, 1.4 * s));
}

function dyner(f, W, ctx) {
  const { j, rnd } = ctx;
  f.flat(SAND, 0, 0, W - 2, W - 2, CURB + 0.01);
  for (let k = 0; k < 12; k++) f.flat(SAND_D, -28 + rnd() * 56, -28 + rnd() * 56, 4 + rnd() * 6, 0.25, CURB + 0.014, 0.5 + rnd() * 0.3);
  // Boardwalk down the middle (planks, flush with the sand).
  f.flat(0xa87a4a, 0, 0, 2.6, W - 1, CURB + 0.03);
  for (let z = -30; z < 31; z += 1.2) f.flat(0x8a5e38, 0, z, 2.6, 0.08, CURB + 0.034);
  const scrubs = (n, skip) => {
    for (let k = 0; k < n; k++) {
      const x = (rnd() < 0.5 ? -1 : 1) * (2.5 + rnd() * 27.5), z = -29 + rnd() * 58;
      if (skip?.(x, z)) continue;
      scrub(f, x, z, 0.6 + rnd() * 0.6, rnd() < 0.5 ? 0x7a8a4a : 0x8a9a5a);
    }
  };
  if (j === 4) {
    // The big dunes, west and east of the boardwalk; slip faces to the south-south-west.
    dune(f, -16.5, -17, -0.06, 27, 13, 5.8, 2.6);
    dune(f, -16.5, 9.5, -0.04, 27, 12, 5.4, 2.4);
    dune(f, -17, 24, -0.05, 24, 7, 3.4, 1.4);
    dune(f, 16.5, -17.5, -0.05, 27, 13, 5.6, 2.6);
    dune(f, 16.5, 8, -0.07, 27, 13, 5.6, 2.6);
    dune(f, 17, 23.5, -0.03, 24, 7, 3.4, 1.4);
    // Entrance arch over the boardwalk at the landmark clearing (0, 0), a bench, a bin.
    f.flat(0xf0dcaa, 0, 0, 4.4, 9, CURB + 0.026);
    postSign(f, 'DUNAS DE MASPALOMAS', 0, -4.2, 5.6, 0.9, 2.5, 0, { bg: '#f4efe6', fg: '#1c7fb8' });
    f.prop('bank', 2.0, 2.6, PI / 2);
    f.prop('papelera', -1.9, -1.6);
    for (const [x, z, s] of [[-2.2, -27, 1.1], [2.2, -20, 1], [-29, 15.5, 1.05], [2.2, 12, 0.95], [-2.2, 21, 1], [2.2, 28.5, 1.05], [-28, -7.5, 1.2], [28.5, -8.5, 1.1], [-10, 15.8, 0.9], [12, 15.6, 0.95], [-29, 29, 0.9]]) palm(f, x, z, s, true);
    scrubs(24);
  } else {
    // South block: the palm grove (north-west), the lagoon (La Charca, south-west), two dunes east.
    dune(f, 16.5, -17, -0.05, 27, 13, 5.6, 2.6);
    dune(f, 17, 6, -0.06, 26, 11, 5, 2.2);
    for (const [x, z, s] of [[-24, -26, 1.1], [-14, -27, 1.2], [-6, -22, 1], [-26, -16, 0.95], [-17, -18, 1.15], [-8, -12, 1.05], [-26, -6, 1.2], [2.2, -27, 1], [2.2, -12, 1.1], [26, 18, 1], [-29, 1, 1], [-16, -6, 0.9]]) palm(f, x, z, s, rnd() < 0.5);
    // The lagoon: overlapping shallow discs make an irregular pond; reeds, rocks. Its two herons and
    // the stork stand in game/birds.js (feature 43, §10.31: BIRDS' `charca` flock), where they can lift.
    const LAG = [[-14, 13, 6.5], [-8.5, 17.5, 4.6], [-20, 18.5, 5.2], [-21, 10, 3.6], [-9, 8.5, 3.8], [-14.5, 22, 3.6], [-5.5, 21.5, 2.6]];
    for (const [x, z, r] of LAG) f.F.cyl(0xd8c08a, f.wx(x, z), CURB + 0.012, f.wz(x, z), r + 1.1, 0.02, 28);
    for (const [x, z, r] of LAG) f.F.cyl(SEA, f.wx(x, z), CURB + 0.03, f.wz(x, z), r, 0.03, 28);
    f.F.cyl(0x2f9ad0, f.wx(-14, 14), CURB + 0.04, f.wz(-14, 14), 5.4, 0.02, 24);
    f.F.cyl(0x2f9ad0, f.wx(-19, 17), CURB + 0.042, f.wz(-19, 17), 3.8, 0.02, 24);
    for (const [x, z, r] of LAG) circle(f.wx(x, z), f.wz(x, z), r, CURB, 'water');
    for (const [x, z] of [[-24.5, 7.5], [-19, 5], [-12, 5.2], [-26, 15], [-25, 21], [-3.8, 18], [-4, 13.5], [-11, 26]]) reeds(f, x, z, rnd, 8);
    for (const [x, z] of [[-29, 14], [-28, 25], [5, 23], [4, 12], [-17.5, 27]]) rock(f, x, z, 1.6, 1.0, 1.3, 0x8a7a6a, x, false);
    postSign(f, 'LA CHARCA', 2.4, 6, 2.6, 0.7, 1.0, -PI / 2, { bg: '#f4efe6', fg: '#1c7fb8' });
    scrubs(18, (x, z) => Math.hypot(x + 14, z - 15) < 13);
  }
}

export const BUILDERS = {
  tomat: tomatfalt,
  grisfest: grisgard,
  fataga,
  golf,
  bungalow: bungalowTomt,
  bygge,
  dyner,
};
