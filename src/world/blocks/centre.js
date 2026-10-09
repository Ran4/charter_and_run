// Town-centre blocks (WP-C2, DESIGN §6.3): kasbah (Centro La Medina), cita (Centro Nórdico),
// plaza (with Casa Lola), marknad, kyrka (Templo Ecuménico), bensin (Gasolina), guardia (Casa Cuartel).
//
// Builder signature fn(f, W, ctx): f = Frame at the block centre (yaw 0, local = world offset,
// interior ±31; +z is south, towards the sea; every block fronts its south road), ctx = { i, j,
// scene, rnd }. Static geometry goes into the block's merged builders: f.S (outlined toon mesh)
// and f.F (flat, no outline: ground decals and hair-thin details). Lit things (neon tubes, bulbs,
// stained glass, lanterns) go into one extra unlit mesh per block, so they glow at night (§13.3).
//
// Names are fictional stand-ins (§1.5): LA MEDINA, CENTRO NÓRDICO, CASA LOLA, GASOLINA. Every
// invented sign text is [N]; the church sign is the sisters' language-record line, relocated [F*].
// Collectible routes: pryl_poolpen on La Medina's roof terrace (courtyard stairs → roof, top 6.0);
// pryl_kalkylator on the electronics stall's awning in the market (crate steps or a bounce awning).

import { THREE, GeoBuilder, toonMesh, PRIM, mat, makeWedge } from '../../gfx.js';
import { CURB } from '../layout.js';
import { ramp } from '../collision.js';
import { Frame } from '../frame.js';

const PI = Math.PI, HP = PI / 2;

// Palette (§13.2 island group plus a few shop colours).
const WHITE = 0xf4efe6, WHITE2 = 0xfbf7ef, CREAM = 0xf2e6d0, TERRA = 0xc0623a, TERRA_D = 0x9a4a30,
  OCHRE = 0xd9a35a, OCHRE_D = 0xb8823e, PAVE = 0xe6d6b4, TILE = 0xc98a5a, ROOF_T = 0xc8845a,
  LOT = 0x6c6c74, LINE = 0xf4f4f0, GLASS = 0x6f9cc0, GLASS_D = 0x35536f, WOOD = 0x6a4528,
  WOOD_D = 0x452a18, STEEL = 0x8a9098, DARK = 0x2a2630, GREEN = 0x2f8a4a, GUARDIA = 0x2e5e3e,
  SUN = 0xf7c31b, RED = 0xd8321e, BLUE = 0x2f5a9a, PALM = 0x3f7a3a, PALM2 = 0x4e8c3e,
  TRUNK = 0x8a6a4a, BOUG = 0xc2307a, SKIN = 0xe8c0a0, BRONZE = 0xb07a30, SEA = 0x1c7fb8;
const BULBS = [0xff5a4a, 0xffd23f, 0x6ad86a, 0x5ab4ff, 0xff8ad8];
const TOWELS = [0xd8321e, 0x2f8ad8, 0xf7c31b, 0x2fa07a, 0xf07a1e, 0xffffff, 0xc2307a];

// ---------------------------------------------------------------------------------------------
// Per-block state: the unlit "glow" builder and the block's seeded RNG (deterministic layout).

let GL = null, RND = Math.random, GLOW_MAT = null;
const R = (a, b) => a + (b - a) * RND();
const pickR = (a) => a[(RND() * a.length) | 0];

function block(fn) {
  return (f, W, ctx = {}) => {
    GL = new GeoBuilder();
    RND = ctx.rnd || Math.random;
    fn(f, W, ctx);
    if (!GL.empty) {
      GLOW_MAT ??= new THREE.MeshBasicMaterial({ vertexColors: true });
      const m = new THREE.Mesh(GL.build(), GLOW_MAT);
      m.name = 'centreGlow';
      f.scene?.add(m);
    }
    GL = null;
  };
}

// ---------------------------------------------------------------------------------------------
// Small geometry helpers (block-local coordinates).

const rbox = (f, c, x0, z0, x1, z1, y0, h, G) => f.box(c, (x0 + x1) / 2, y0, (z0 + z1) / 2, x1 - x0, h, z1 - z0, 0, G);
const rsolid = (f, x0, z0, x1, z1, top = 99, kind = 'building') => f.solid((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, top, kind);
const rflat = (f, c, x0, z0, x1, z1, y = CURB + 0.02) => f.flat(c, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, y);
const disc = (f, c, x, z, r, y = CURB + 0.02, n = 28) => f.F.cyl(c, f.wx(x, z), y, f.wz(x, z), r, 0.03, n);
function geo(f, g, c, x, y, z, sx, sy, sz, ly = 0, rx = 0, rz = 0, G = f.S) {
  G.add(g, c, mat(f.wx(x, z), y, f.wz(x, z), rx, f.yaw + ly, rz, sx, sy, sz));
}
// Cone with a full rotation (Frame.cone has none).
const cone = (f, c, x, y, z, r, h, n = 10, ly = 0, rx = 0, rz = 0, G = f.S) => geo(f, PRIM.cone(n), c, x, y, z, 2 * r, h, 2 * r, ly, rx, rz, G);

// Low-poly sphere (the GeoBuilder default is 14 × 10 segments, far too many for fruit and bulbs).
const sph = (f, c, x, y, z, sx, sy = sx, sz = sx, G = f.S, seg = 7) => geo(f, PRIM.sphere(seg, Math.max(4, seg - 3)), c, x, y, z, sx, sy, sz, 0, 0, 0, G);

// A frame on a building face: origin at (x, z) on the wall plane, local +z = outward, local +x =
// the right hand of someone outside looking at the wall. side: 'S' | 'N' | 'E' | 'W'.
const FACE = { S: 0, N: PI, E: HP, W: -HP };
const face = (f, side, x, z) => new Frame(f.S, f.F, f.wx(x, z), f.wz(x, z), f.yaw + FACE[side], f.scene);

// Window on a face frame: centre (u, y), w × h; o = { arch, shutters, trim, glass, flowers, z }.
function win(fr, u, y, w, h, o = {}) {
  const z = o.z ?? 0, trim = o.trim ?? WHITE2, glass = o.glass ?? GLASS_D;
  fr.boxC(trim, u, y, z + 0.04, w + 0.24, h + 0.24, 0.1);
  fr.boxC(glass, u, y, z + 0.08, w, h, 0.1);
  if (o.arch) {
    fr.cyl(trim, u, y + h / 2, z + 0.04, w / 2 + 0.12, 0.1, 14, HP);
    fr.cyl(glass, u, y + h / 2, z + 0.08, w / 2, 0.1, 14, HP);
  }
  if (o.shutters) for (const s of [-1, 1]) fr.boxC(o.shutters, u + s * (w / 2 + 0.36), y, z + 0.08, 0.5, h + 0.1, 0.08);
  if (o.flowers) {
    fr.boxC(TERRA, u, y - h / 2 - 0.12, z + 0.26, w + 0.1, 0.24, 0.32);
    for (let k = 0; k < 4; k++) sph(fr, pickR([0xd8321e, BOUG, 0xf04a6a, 0xf7c31b]), u - w / 2 + 0.2 + k * (w - 0.4) / 3, y - h / 2 + 0.06, z + 0.26, 0.34);
  }
}

function door(fr, u, w, h, c, o = {}) {
  const z = o.z ?? 0, trim = o.trim ?? WHITE2, y0 = o.y0 ?? CURB;
  fr.box(trim, u, y0, z + 0.03, w + 0.3, h + 0.15, 0.1);
  fr.box(c, u, y0, z + 0.07, w, h, 0.1);
  if (o.arch) {
    fr.cyl(trim, u, y0 + h, z + 0.03, w / 2 + 0.15, 0.1, 16, HP);
    fr.cyl(c, u, y0 + h, z + 0.07, w / 2, 0.1, 16, HP);
  }
  if (o.split) fr.box(DARK, u, y0, z + 0.13, 0.05, h, 0.02, 0, fr.F);
  fr.boxC(0xd8a040, u + (o.split ? 0.15 : w * 0.32), y0 + h * 0.46, z + 0.14, 0.08, 0.08, 0.06);
}

// Neon tube rectangle (unlit) centred at (u, y) on a face frame.
function neonRect(fr, u, y, z, w, h, c, t = 0.07) {
  fr.boxC(c, u, y + h / 2, z, w + t, t, t, 0, 0, 0, GL);
  fr.boxC(c, u, y - h / 2, z, w + t, t, t, 0, 0, 0, GL);
  fr.boxC(c, u - w / 2, y, z, t, h, t, 0, 0, 0, GL);
  fr.boxC(c, u + w / 2, y, z, t, h, t, 0, 0, 0, GL);
}

// A sign board on a face frame (centre u, y), with a dark backing and optionally a neon frame.
function board(fr, text, u, y, w, h, o = {}) {
  const z = o.z ?? 0.14;
  if (o.back !== false) fr.boxC(o.backC ?? DARK, u, y, z - 0.07, w + 0.16, h + 0.16, 0.08);
  fr.sign(text, u, y, z, w, h, 0, { bg: o.bg ?? '#fff8e6', fg: o.fg ?? '#1d1426', border: o.border ?? null, scale: o.scale ?? 0.62, stroke: o.stroke ?? null });
  if (o.neon) neonRect(fr, u, y, z + 0.05, w + 0.26, h + 0.26, o.neon);
}

// Freestanding double-sided sign on one or two legs (block coords, facing ly).
function standSign(f, text, x, z, y, w, h, ly = 0, o = {}) {
  const fr = new Frame(f.S, f.F, f.wx(x, z), f.wz(x, z), f.yaw + ly, f.scene);
  const opts = { bg: o.bg ?? '#fff8e6', fg: o.fg ?? '#1d1426', border: o.border ?? null, scale: o.scale ?? 0.6 };
  fr.boxC(o.backC ?? WOOD, 0, y, 0, w + 0.14, h + 0.14, 0.08);
  fr.sign(text, 0, y, 0.05, w, h, 0, opts);
  fr.sign(text, 0, y, -0.05, w, h, PI, opts);
  for (const u of o.legs ?? [-w / 2 + 0.15, w / 2 - 0.15]) { fr.box(o.backC ?? WOOD, u, CURB, 0, 0.1, y - h / 2 - CURB, 0.1); fr.circ(u, 0, 0.1, 99, 'pole'); }
}

// Striped canvas awning sloping out from a face (top edge at height y, `depth` out from the wall).
function awning(fr, u, w, y, depth, cols, o = {}) {
  const tilt = o.tilt ?? 0.32, n = Math.max(2, Math.round(w / 0.55)), sw = w / n;
  const cy = y - Math.sin(tilt) * depth / 2, cz = Math.cos(tilt) * depth / 2;
  const fy = y - Math.sin(tilt) * depth, fz = Math.cos(tilt) * depth;
  for (let k = 0; k < n; k++) {
    const c = cols[k % cols.length], uu = u - w / 2 + (k + 0.5) * sw;
    fr.boxC(c, uu, cy, cz, sw, 0.07, depth, 0, tilt);
    fr.boxC(c, uu, fy - 0.16, fz, sw, 0.32, 0.05);
  }
  for (const s of [-1, 1]) fr.boxC(STEEL, u + s * (w / 2 - 0.05), cy - 0.06, cz, 0.05, 0.05, depth, 0, tilt);
}

// Shop window band with a door: glass panes across width w, door at u + doorAt, standing on y0.
function shopGlass(fr, u, w, o = {}) {
  const h = o.h ?? 3.1, du = u + (o.doorAt ?? (w / 2 - 1.2)), frame = o.frame ?? DARK, y0 = o.y0 ?? CURB;
  fr.box(frame, u, y0, 0.03, w - 0.2, h, 0.06);
  for (const [a, b] of [[u - w / 2 + 0.3, du - 0.85], [du + 0.85, u + w / 2 - 0.3]]) {
    if (b - a < 0.4) continue;
    fr.box(o.glass ?? GLASS, (a + b) / 2, y0 + 0.55, 0.07, b - a, h - 0.75, 0.06);
    for (let m = a + 1.7; m < b - 0.5; m += 1.7) fr.box(frame, m, y0 + 0.55, 0.11, 0.07, h - 0.75, 0.03, 0, fr.F);
  }
  fr.box(o.doorC ?? GLASS_D, du, y0, 0.08, 1.4, Math.min(2.45, h - 0.1), 0.06);
  fr.box(frame, du, y0 + 1.1, 0.12, 1.1, 0.07, 0.03, 0, fr.F);
}

// Parapet strip on a roof: rect (x0, z0, x1, z1) standing on y, merlons on top if asked.
function parapet(f, x0, z0, x1, z1, y, o = {}) {
  const h = o.h ?? 0.9, c = o.color ?? WHITE;
  rbox(f, c, x0, z0, x1, z1, y, h);
  if (o.cap) rbox(f, o.cap, x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04, y + h, 0.08);
  rsolid(f, x0, z0, x1, z1, y + h, 'wall');
  if (o.merlons) {
    const along = x1 - x0 > z1 - z0, len = along ? x1 - x0 : z1 - z0, n = Math.floor(len / 1.15);
    for (let k = 0; k < n; k++) {
      const s = (along ? x0 : z0) + (k + 0.5) * (len / n);
      if (along) rbox(f, c, s - 0.26, z0, s + 0.26, z1, y + h, 0.48);
      else rbox(f, c, x0, s - 0.26, x1, s + 0.26, y + h, 0.48);
    }
  }
}

// Horseshoe-arch panel (a rectangle with an arched opening cut from its bottom), extruded.
const _arch = new Map();
function archGeo(s, r, al, H, depth) {
  const key = [s, r, al, H, depth].map((v) => v.toFixed(2)).join();
  let g = _arch.get(key);
  if (!g) {
    const sh = new THREE.Shape(), yb = -r * Math.sin(al);
    sh.moveTo(-s / 2, yb);
    sh.lineTo(-r * Math.cos(al), yb);
    sh.absarc(0, 0, r, PI + al, -al, true);
    sh.lineTo(s / 2, yb);
    sh.lineTo(s / 2, H);
    sh.lineTo(-s / 2, H);
    sh.closePath();
    g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 14 });
    g.translate(0, 0, -depth / 2);
    _arch.set(key, g);
  }
  return g;
}

// Arcade along a face frame: columns at us (local u), arches between them, a roof slab on top.
// depth = how far the column line stands out from the wall. Nothing overhead is solid; a camera
// ceiling keeps the chase eye under the roof slab.
function arcade(fr, us, depth, o = {}) {
  const top = o.top ?? 3.6, spring = o.spring ?? 1.85, al = o.al ?? 0.32, c = o.color ?? WHITE;
  const zc = depth - 0.25;
  for (const u of us) {
    fr.cyl(o.colC ?? WHITE2, u, CURB + (spring - CURB) / 2, zc, 0.2, spring - CURB, 10);
    fr.boxC(o.capC ?? TERRA, u, spring, zc, 0.56, 0.22, 0.56);
    fr.boxC(o.colC ?? WHITE2, u, CURB + 0.15, zc, 0.5, 0.3, 0.5);
    fr.circ(u, zc, 0.24, 99, 'pole');
  }
  for (let k = 0; k + 1 < us.length; k++) {
    const s = us[k + 1] - us[k], r = s / 2 - 0.24;
    const yc = spring + 0.11 + r * Math.sin(al);
    geo(fr, archGeo(s, r, al, top - yc, 0.36), c, (us[k] + us[k + 1]) / 2, yc, zc, 1, 1, 1);
  }
  const a = us[0] - 0.3, b = us[us.length - 1] + 0.3;
  fr.box(c, (a + b) / 2, top, depth / 2, b - a, 0.28, depth + 0.02);
  fr.box(o.band ?? TERRA, (a + b) / 2, top + 0.06, depth + 0.02, b - a, 0.16, 0.06);
  fr.ceiling((a + b) / 2, depth / 2, b - a, depth + 0.02, top, top + 0.3);
}

// Canary palm: trunk, crown knob, ten fronds; o = { h, y, tinsel, solid }.
function palm(f, x, z, s = 1, o = {}) {
  const h = (o.h ?? 6.2) * s, y0 = o.y ?? CURB;
  f.cyl(TRUNK, x, y0 + h / 2, z, 0.3 * s, h, 9);
  f.cyl(0x7a5838, x, y0 + 0.35 * s, z, 0.42 * s, 0.7 * s, 9);
  for (let k = 1; k < 5; k++) f.cyl(0x7a5838, x, y0 + h * k / 5, z, 0.33 * s, 0.14, 9);
  sph(f, 0x8a8a3a, x, y0 + h, z, 1.0 * s, 0.75 * s, 1.0 * s, f.S, 9);
  const ph = RND() * 6;
  for (let k = 0; k < 10; k++) {
    const a = ph + (k / 10) * PI * 2, ca = Math.cos(a), sa = Math.sin(a), c = k % 2 ? PALM : PALM2;
    f.boxC(c, x + ca * 1.15 * s, y0 + h + 0.35 * s, z + sa * 1.15 * s, 2.3 * s, 0.1 * s, 0.62 * s, -a, 0, 0.28);
    f.boxC(c, x + ca * 2.85 * s, y0 + h + 0.2 * s, z + sa * 2.85 * s, 1.6 * s, 0.1 * s, 0.5 * s, -a, 0, -0.55);
  }
  if (o.tinsel) for (let k = 0; k < 18; k++) {
    const a = k * 0.95, yy = y0 + 0.9 * s + k * (h - 1.6 * s) / 18;
    f.boxC(k % 3 === 0 ? 0xff4a3a : 0xffd23f, x + Math.cos(a) * 0.34 * s, yy, z + Math.sin(a) * 0.34 * s, 0.24, 0.1, 0.1, -a, 0, 0, GL);
  }
  if (o.solid !== false) f.circ(x, z, 0.36 * s, 99, 'tree');
}

function planter(f, x, z, r = 1, c = WHITE) {
  f.cyl(c, x, CURB + 0.33, z, r, 0.66, 16);
  f.cyl(0x7a5a3a, x, CURB + 0.67, z, r - 0.12, 0.04, 16, 0, 0, f.F);
  f.circ(x, z, r, CURB + 0.66, 'planter');
}
const palmPot = (f, x, z, s = 1, o = {}) => { planter(f, x, z, 1.0); palm(f, x, z, s, { ...o, y: CURB + 0.66 }); };

function agave(f, x, z, s = 1) {
  for (let k = 0; k < 9; k++) {
    const a = k * 0.7 + RND();
    f.boxC(k % 2 ? 0x6a9a7a : 0x5a8a6a, x + Math.cos(a) * 0.42 * s, CURB + 0.42 * s, z + Math.sin(a) * 0.42 * s, 1.1 * s, 0.12 * s, 0.26 * s, -a, 0, 0.75);
  }
}

function cardon(f, x, z, s = 1) {
  const c = 0x5a8a4a;
  f.cyl(c, x, CURB + 1.4 * s, z, 0.32 * s, 2.8 * s, 8);
  sph(f, c, x, CURB + 2.8 * s, z, 0.64 * s);
  for (const [dx, dz, hh] of [[0.55, 0.1, 2.0], [-0.5, 0.25, 1.6], [0.1, -0.55, 2.3]]) {
    f.cyl(c, x + dx * s, CURB + hh * s / 2, z + dz * s, 0.26 * s, hh * s, 8);
    sph(f, c, x + dx * s, CURB + hh * s, z + dz * s, 0.52 * s);
  }
  f.circ(x, z, 0.85 * s, 99, 'tree');
}

function rock(f, x, z, s = 1) { f.ico(pickR([0x8a3a2a, 0x7a4a3a, 0x9a5a3a]), x, CURB + 0.2 * s, z, s); }

// Rooftop clutter on a flat roof at height y: water tanks (solid when `solid`) and TV aerials.
function rooftop(f, x0, z0, x1, z1, y, n = 4, solid = false) {
  for (let k = 0; k < n; k++) {
    const x = R(x0 + 1.5, x1 - 1.5), z = R(z0 + 1.5, z1 - 1.5);
    if (k % 2 === 0) {
      f.box(STEEL, x, y, z, 1.4, 0.3, 1.4);
      f.cyl(k % 4 ? 0x3a3a42 : WHITE2, x, y + 1.0, z, 0.6, 1.4, 10);
      if (solid) f.circ(x, z, 0.75, y + 1.7, 'solid');
    } else {
      const h = R(2.2, 3.4);
      f.box(DARK, x, y, z, 0.05, h, 0.05, 0, f.F);
      for (let m = 0; m < 3; m++) f.box(DARK, x, y + h - 0.2 - m * 0.45, z, 1.3 - m * 0.3, 0.04, 0.04, 0.6, f.F);
      f.box(DARK, x, y + h - 0.2, z, 0.04, 0.04, 0.9, 0.6, f.F);
    }
  }
}

// Spanish lantern post with two hanging lanterns (lit); the arm runs along ly.
function lantern(f, x, z, h = 4.2, ly = 0) {
  const ax = Math.cos(ly), az = -Math.sin(ly);
  f.cyl(DARK, x, CURB + h / 2, z, 0.08, h, 8);
  f.cyl(DARK, x, CURB + 0.25, z, 0.17, 0.5, 8);
  f.boxC(DARK, x, CURB + h - 0.1, z, 1.9, 0.07, 0.07, ly);
  for (const s of [-1, 1]) {
    const lx = x + ax * s * 0.9, lz = z + az * s * 0.9;
    f.box(DARK, lx, CURB + h - 0.85, lz, 0.34, 0.08, 0.34, ly);
    f.box(0xffe6a0, lx, CURB + h - 0.77, lz, 0.24, 0.48, 0.24, ly, GL);
    cone(f, DARK, lx, CURB + h - 0.18, lz, 0.25, 0.24, 4, ly + PI / 4);
  }
  f.circ(x, z, 0.17, 99, 'pole');
}

// Café table with chairs (and an optional parasol), standing on y0.
function cafeTable(f, x, z, o = {}) {
  const y0 = o.y ?? CURB, n = o.chairs ?? 3, rot = o.rot ?? RND() * 6;
  f.cyl(DARK, x, y0 + 0.37, z, 0.05, 0.74, 6);
  f.cyl(o.cloth ?? WHITE2, x, y0 + 0.76, z, 0.52, 0.05, 14);
  if (o.check) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if ((i + j) % 2 === 0) f.box(RED, x + i * 0.24, y0 + 0.785, z + j * 0.24, 0.24, 0.01, 0.24, 0, f.F);
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * PI * 2, cx = x + Math.cos(a) * 0.85, cz = z + Math.sin(a) * 0.85;
    f.box(o.chairC ?? WOOD, cx, y0 + 0.42, cz, 0.42, 0.06, 0.42, -a);
    f.box(o.chairC ?? WOOD, cx + Math.cos(a) * 0.2, y0 + 0.45, cz + Math.sin(a) * 0.2, 0.05, 0.5, 0.42, -a);
    for (const [dx, dz] of [[-0.17, -0.17], [0.17, 0.17], [-0.17, 0.17], [0.17, -0.17]]) f.box(DARK, cx + dx, y0, cz + dz, 0.04, 0.42, 0.04, 0, f.F);
  }
  if (o.parasol) {
    f.cyl(STEEL, x, y0 + 1.3, z, 0.04, 2.6, 6);
    cone(f, o.parasol, x, y0 + 2.62, z, 1.45, 0.55, 8);
    cone(f, WHITE2, x, y0 + 2.92, z, 0.2, 0.2, 8);
  }
  f.circ(x, z, 0.56, y0 + 0.8, 'table');
}

// A sagging wire from a to b ([x, y, z] block coords) with coloured bulbs (cols = null: none).
function stringLights(f, a, b, n = 12, sag = 0.6, cols = BULBS) {
  let p = null;
  for (let k = 0; k <= n; k++) {
    const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
    const y = a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t);
    if (p) {
      const dx = x - p[0], dy = y - p[1], dz = z - p[2], L = Math.hypot(dx, dy, dz);
      f.boxC(DARK, (x + p[0]) / 2, (y + p[1]) / 2, (z + p[2]) / 2, L, 0.03, 0.03, -Math.atan2(dz, dx), 0, Math.atan2(dy, Math.hypot(dx, dz)), f.F);
    }
    if (cols && k > 0 && k < n) sph(f, cols[k % cols.length], x, y - 0.1, z, 0.17, 0.22, 0.17, GL);
    p = [x, y, z];
  }
}

// Bunting: triangular pennants on a sagging line.
function bunting(f, a, b, n, sag = 0.5) {
  const cols = [RED, SUN, 0x2f5a9a, GREEN, 0xffffff, 0xf07a1e];
  const ly = -Math.atan2(b[2] - a[2], b[0] - a[0]);
  stringLights(f, a, b, n, sag, null);
  for (let k = 1; k < n; k++) {
    const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
    const y = a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t);
    geo(f, PRIM.cone(3), cols[k % cols.length], x, y - 0.22, z, 0.42, 0.45, 0.05, ly, PI);
  }
}

// Static crate (solid, standable): footprint s × s, height h, standing on y0.
function crate(f, x, z, s, h, y0 = CURB, c = 0xb88a52) {
  f.box(c, x, y0, z, s, h, s);
  f.box(0x8a6438, x, y0 + h - 0.08, z, s + 0.03, 0.08, s + 0.03);
  for (const t of [-1, 1]) {
    f.box(0x8a6438, x + t * (s / 2 + 0.01), y0, z, 0.02, h, 0.12, 0, f.F);
    f.box(0x8a6438, x, y0, z + t * (s / 2 + 0.01), 0.12, h, 0.02, 0, f.F);
  }
  f.solid(x, z, s, s, y0 + h, 'crate');
}

// Painted souvenir donkey (burro) on y0, head towards ly (any Frame works as f).
function burro(f, x, y0, z, s, ly, o = {}) {
  const body = o.c ?? 0xa8a29a, paint = [RED, SUN, BLUE, GREEN, 0xffffff, BOUG];
  const fr = new Frame(f.S, f.F, f.wx(x, z), f.wz(x, z), f.yaw + ly, f.scene);
  for (const [lx, lz] of [[-0.2, -0.08], [-0.2, 0.08], [0.2, -0.08], [0.2, 0.08]]) fr.box(body, lx * s, y0, lz * s, 0.08 * s, 0.34 * s, 0.08 * s);
  fr.box(body, 0, y0 + 0.3 * s, 0, 0.58 * s, 0.27 * s, 0.27 * s);
  fr.boxC(body, 0.31 * s, y0 + 0.62 * s, 0, 0.13 * s, 0.32 * s, 0.13 * s, 0, 0, -0.5);
  fr.box(body, 0.44 * s, y0 + 0.66 * s, 0, 0.28 * s, 0.14 * s, 0.14 * s);
  fr.box(0x3a3430, 0.58 * s, y0 + 0.67 * s, 0, 0.04 * s, 0.11 * s, 0.12 * s);
  for (const e of [-1, 1]) fr.boxC(body, 0.38 * s, y0 + 0.9 * s, e * 0.05 * s, 0.05 * s, 0.22 * s, 0.04 * s, 0, e * 0.3, 0.15);
  fr.boxC(body, -0.31 * s, y0 + 0.42 * s, 0, 0.04 * s, 0.25 * s, 0.04 * s, 0, 0, 0.5);
  fr.box(o.saddle ?? RED, -0.02 * s, y0 + 0.565 * s, 0, 0.26 * s, 0.04 * s, 0.3 * s);
  if (o.painted !== false) for (let k = 0; k < 7; k++) {
    sph(fr, paint[k % paint.length], (-0.24 + k * 0.08) * s, y0 + (0.36 + (k % 2) * 0.1) * s, (k % 2 ? 0.14 : -0.14) * s, 0.07 * s);
  }
}

// Plastic toy giraffe (the film's giraffe), about 1.7 m at s = 1.
function giraffe(f, x, z, s, ly) {
  const Y = 0xf2c84a, B = 0x9a5a2a;
  const fr = new Frame(f.S, f.F, f.wx(x, z), f.wz(x, z), f.yaw + ly, f.scene);
  for (const [lx, lz] of [[-0.18, -0.09], [-0.18, 0.09], [0.18, -0.09], [0.18, 0.09]]) fr.box(Y, lx * s, CURB, lz * s, 0.07 * s, 0.62 * s, 0.07 * s);
  fr.box(Y, 0, CURB + 0.6 * s, 0, 0.52 * s, 0.28 * s, 0.24 * s);
  fr.boxC(Y, 0.24 * s, CURB + 1.12 * s, 0, 0.11 * s, 0.82 * s, 0.11 * s, 0, 0, -0.32);
  fr.box(Y, 0.4 * s, CURB + 1.45 * s, 0, 0.26 * s, 0.13 * s, 0.13 * s);
  for (const e of [-1, 1]) fr.box(B, 0.34 * s, CURB + 1.57 * s, e * 0.04 * s, 0.03 * s, 0.1 * s, 0.03 * s);
  for (let k = 0; k < 6; k++) fr.box(B, (-0.18 + (k % 3) * 0.17) * s, CURB + (0.66 + ((k >> 1) % 2) * 0.1) * s, (k < 3 ? 0.125 : -0.125) * s, 0.09 * s, 0.07 * s, 0.01 * s, 0, f.F);
  fr.circ(0, 0, 0.32 * s, 99, 'solid');
}

// A simple standing figure (crèche): robe cone, head, veil.
function figure(f, x, z, robe, s = 1, veil = null) {
  cone(f, robe, x, CURB + 0.55 * s, z, 0.32 * s, 1.1 * s, 10);
  sph(f, SKIN, x, CURB + 1.18 * s, z, 0.3 * s);
  if (veil) sph(f, veil, x, CURB + 1.24 * s, z - 0.03 * s, 0.34 * s, 0.3 * s, 0.3 * s);
}

// ---------------------------------------------------------------------------------------------
// Market stall facing +z (face1 = 1) or -z (face1 = -1): flat striped awning roof (its top is the
// collider, so the awnings are walkable roofs), counter with goods, cloth back and sides.

function stall(f, x, z, w, d, face1, o) {
  const top = o.top ?? 2.55, cols = o.colors;
  const fr = new Frame(f.S, f.F, f.wx(x, z), f.wz(x, z), f.yaw + (face1 > 0 ? 0 : PI), f.scene);
  const hd = d / 2;
  fr.box(o.back ?? CREAM, 0, CURB, -hd + 0.08, w - 0.1, top - 0.15 - CURB, 0.1);
  for (const s of [-1, 1]) fr.box(cols[1] ?? CREAM, s * (w / 2 - 0.06), CURB + 1.0, 0, 0.06, top - 1.15 - CURB, d - 0.2);
  for (const s of [-1, 1]) for (const t of [-1, 1]) fr.box(WOOD, s * (w / 2 - 0.08), CURB, t * (hd - 0.08), 0.12, top - CURB, 0.12);
  fr.box(o.counter ?? WOOD, 0, CURB, hd - 0.45, w - 0.3, 0.88, 0.8);
  fr.box(o.cloth ?? cols[0], 0, CURB + 0.88, hd - 0.45, w - 0.18, 0.05, 0.86);
  fr.box(o.cloth ?? cols[0], 0, CURB + 0.45, hd - 0.04, w - 0.18, 0.45, 0.04);
  const n = Math.max(3, Math.round(w / 0.62));
  for (let k = 0; k < n; k++) {
    const c = cols[k % cols.length], u = -w / 2 + (k + 0.5) * (w / n);
    fr.box(c, u, top - 0.14, 0.12, w / n, 0.14, d + 0.5);
    fr.box(c, u, top - 0.48, hd + 0.36, w / n, 0.34, 0.05);
  }
  goods(fr, o.goods, w, hd);
  const sopt = { bg: o.signBg ?? '#fff8e6', fg: o.signFg ?? '#1d1426', border: '#1d1426', scale: 0.62 };
  if (o.signLow) fr.sign(o.signLow, 0, top - 0.48, hd + 0.42, w - 0.6, 0.36, 0, { ...sopt, border: null, scale: 0.8 });
  if (o.sign) {
    fr.sign(o.sign, 0, top + 0.42, hd - 0.2, Math.min(w - 0.4, 3.6), 0.62, 0, { ...sopt, double: true });
    for (const s of [-1, 1]) fr.box(WOOD, s * 1.2, top, hd - 0.2, 0.08, 0.15, 0.08);
  }
  f.solid(x, z, w, d, top, 'stall');
}

// What lies on a stall's counter (y = CURB + 0.93, z ≈ hd - 0.45) and hangs from its front.
function goods(fr, type, w, hd) {
  const y = CURB + 0.93, z = hd - 0.45, n = Math.floor((w - 0.8) / 0.5);
  const at = (k) => -w / 2 + 0.6 + k * ((w - 1.2) / Math.max(1, n - 1));
  if (type === 'fruit') for (let k = 0; k < n; k++) {
    const c = [0xf07a1e, 0xf7c31b, 0xd8321e, 0x6ab04a, 0xf0a020][k % 5];
    fr.box(0xb88a52, at(k), y, z, 0.42, 0.14, 0.5);
    for (let m = 0; m < 4; m++) sph(fr, c, at(k) + (m % 2 - 0.5) * 0.18, y + 0.2, z + ((m >> 1) - 0.5) * 0.2, 0.17);
  } else if (type === 'pots') for (let k = 0; k < n; k++) {
    const c = [TERRA, 0xd07a4a, 0xe8d8b0, 0x2f5a9a][k % 4];
    if (k % 2) sph(fr, c, at(k), y + 0.18, z, 0.34, 0.36, 0.34); else fr.cyl(c, at(k), y + 0.2, z, 0.15, 0.4, 10);
  } else if (type === 'hats') {
    for (let k = 0; k < n; k++) { fr.cyl(0xe8c870, at(k), y + 0.03, z, 0.26, 0.04, 12); fr.cyl(0xe8c870, at(k), y + 0.13, z, 0.13, 0.18, 10); }
    for (let k = 0; k < n; k += 2) fr.cyl(k % 4 ? 0xe8c870 : RED, at(k), 1.95, hd + 0.2, 0.24, 0.04, 12, HP);
  } else if (type === 'cloth' || type === 'tablecloths') {
    for (let k = 0; k < n; k++) fr.box(pickR([RED, BLUE, 0xffffff, SUN, GREEN, BOUG]), at(k), y, z, 0.4, 0.08 + (k % 3) * 0.06, 0.5);
    for (let k = 0; k < Math.floor(w / 0.8); k++) fr.box(pickR([RED, 0xffffff, SUN, 0x1e9aa0, BOUG]), -w / 2 + 0.5 + k * 0.8, 1.0, -hd + 0.25, 0.65, 1.2, 0.03, 0, fr.F);
  } else if (type === 'spices') for (let k = 0; k < n; k++) {
    fr.cyl(0xb88a52, at(k), y + 0.05, z, 0.2, 0.1, 10);
    cone(fr, [0xd8321e, 0xf0a020, 0xf7c31b, 0x8a5a2a, 0x6a8a3a][k % 5], at(k), y + 0.2, z, 0.18, 0.22, 10);
  } else if (type === 'bags' || type === 'shoes') for (let k = 0; k < n; k++) {
    const c = [0x8a5a2a, 0x6a3a1a, 0xb87a3a, DARK][k % 4];
    fr.box(c, at(k), y, z, 0.36, type === 'bags' ? 0.34 : 0.12, type === 'bags' ? 0.14 : 0.22);
  } else if (type === 'sunglasses' || type === 'radios') {
    fr.box(DARK, 0, y, z - 0.25, w - 1.2, 0.7, 0.06);
    for (let k = 0; k < n; k++) {
      if (type === 'sunglasses') fr.box(DARK, at(k), y + 0.35, z - 0.2, 0.3, 0.08, 0.04, 0, fr.F);
      else { fr.box(k % 2 ? 0xd8d0c0 : 0x4a4a52, at(k), y, z + 0.05, 0.36, 0.22, 0.18); fr.box(0xe8e4dc, at(k), y, z + 0.25, 0.14, 0.03, 0.22, 0, fr.F); }
    }
  } else if (type === 'flowers') for (let k = 0; k < n; k++) {
    fr.cyl(0x5a6a7a, at(k), y + 0.15, z, 0.15, 0.3, 8);
    for (let m = 0; m < 3; m++) sph(fr, [0xf07a1e, BOUG, 0xf7c31b, 0xd8321e][(k + m) % 4], at(k) + (m - 1) * 0.08, y + 0.42 + m * 0.04, z, 0.14);
  } else if (type === 'churros') {
    fr.box(STEEL, -0.6, y, z, 1.0, 0.25, 0.6);
    for (let k = 0; k < 6; k++) fr.cyl(0xd8a050, 0.2 + k * 0.12, y + 0.1, z, 0.03, 0.4, 6, 0, HP);
  } else if (type === 'souvenir') {
    for (let k = 0; k < n; k++) burro(fr, at(k), y, z, 0.42, k % 2 ? 0.4 : -0.4, { saddle: [RED, SUN, BLUE][k % 3] });
    for (let k = 0; k < Math.floor(w / 1.1); k++) fr.cyl(k % 3 ? 0xe8c870 : 0xd8321e, -w / 2 + 0.7 + k * 1.1, 2.0, hd + 0.18, 0.25, 0.04, 12, HP);
  }
}

// ---------------------------------------------------------------------------------------------
// (1,2) Centro La Medina (internal id kasbah): two-level nightlife courtyard centre.
//   West wing (Viking Bar, Bar Svenska), east wing (Tonga Tonga, Prensa), north wing; courtyard
//   open to the south with stairs to the roof terrace (top 6.0) and pryl_poolpen at (8, -6).

function kasbah(f) {
  const TOP = 6.0, ART = 3.6;
  rflat(f, PAVE, -31, -31, 31, 31, CURB + 0.01);
  for (let i = 0; i < 7; i++) for (let j = 0; j < 10; j++) if ((i + j) % 2 === 0) rflat(f, TILE, -7 + i * 2, -9 + j * 2, -5 + i * 2, -7 + j * 2, CURB + 0.02);
  for (let k = 0; k < 9; k++) f.flat(TILE, 0, 15 + k * 1.9, 1.3, 1.3, CURB + 0.02, PI / 4);
  rflat(f, TERRA, -31, 13.45, 9.5, 13.7, CURB + 0.02);
  // Parking lot (tongaLot) on the south-east.
  rflat(f, LOT, 9.5, 18.5, 31, 31, CURB + 0.02);
  for (let k = 0; k < 8; k++) { const x = 10.8 + k * 2.8; rflat(f, LINE, x - 0.07, 25, x + 0.07, 30.6, CURB + 0.03); }
  f.car('hatch', 28.2, 27.8, PI);

  // Wings: white two-storey blocks with a terracotta dado and terrace tiles on the roof.
  const WW = [-29, -29, -7, 11], EW = [7, -29, 29, 11], NW = [-7, -29, 7, -9];
  for (const r of [WW, EW, NW]) {
    rbox(f, WHITE, ...r, CURB, TOP - CURB);
    rbox(f, TERRA, r[0] - 0.05, r[1] - 0.05, r[2] + 0.05, r[3] + 0.05, CURB, 0.5);
    rbox(f, TERRA, r[0] - 0.05, r[1] - 0.05, r[2] + 0.05, r[3] + 0.05, ART - 0.1, 0.16);
    rbox(f, OCHRE, r[0] - 0.08, r[1] - 0.08, r[2] + 0.08, r[3] + 0.08, TOP - 0.22, 0.24);
    rflat(f, ROOF_T, r[0], r[1], r[2], r[3], TOP + 0.03);
    rsolid(f, ...r, TOP);
  }
  // Parapets: crenellated on the outside, plain round the courtyard (gap where the stairs arrive).
  const P = { cap: OCHRE };
  parapet(f, -29, -29, 29, -28.65, TOP, { ...P, merlons: true });
  parapet(f, -29, -28.65, -28.65, 11, TOP, { ...P, merlons: true });
  parapet(f, 28.65, -28.65, 29, 11, TOP, { ...P, merlons: true });
  parapet(f, -28.65, 10.65, -9.6, 11, TOP, { ...P, merlons: true });
  parapet(f, 9.6, 10.65, 28.65, 11, TOP, { ...P, merlons: true });
  parapet(f, -7.35, -6.3, -7, 10.65, TOP, { ...P, h: 1.0 });
  parapet(f, -7, -9.35, 7, -9, TOP, { ...P, h: 1.0 });
  parapet(f, 7, -9.35, 7.35, 10.65, TOP, { ...P, h: 1.0 });

  // Gate pylons with green-tiled domes, the CENTRO LA MEDINA sign between them.
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -9.6 : 6.4, x1 = x0 + 3.2, cx = (x0 + x1) / 2;
    rbox(f, WHITE, x0, 9.4, x1, 13.6, CURB, 9.2 - CURB);
    rbox(f, TERRA, x0 - 0.05, 9.35, x1 + 0.05, 13.65, CURB, 0.5);
    rbox(f, OCHRE, x0 - 0.1, 9.3, x1 + 0.1, 13.7, 8.9, 0.3);
    for (const [mx, mz] of [[x0 + 0.3, 9.7], [x1 - 0.3, 9.7], [x0 + 0.3, 13.3], [x1 - 0.3, 13.3]]) rbox(f, WHITE, mx - 0.28, mz - 0.28, mx + 0.28, mz + 0.28, 9.2, 0.55);
    geo(f, PRIM.dome(), 0x2f8a6a, cx, 9.2, 11.5, 2.6, 2.2, 2.6);
    sph(f, 0xd8a040, cx, 10.45, 11.5, 0.36);
    const pf = face(f, 'S', cx, 13.6);
    pf.boxC(0x8a3a2a, 0, 4.75, 0.02, 1.3, 1.3, 0.06);
    geo(pf, archGeo(1.6, 0.66, 0.3, 1.1, 0.12), TERRA_D, 0, 4.75, 0.06, 1, 1, 1);
    pf.box(0xffe6a0, 0, 3.0, 0.12, 0.36, 0.5, 0.2, 0, GL);
    pf.box(DARK, 0, 2.9, 0.12, 0.46, 0.1, 0.3);
    rsolid(f, x0, 9.4, x1, 13.6);
  }
  rbox(f, OCHRE_D, -6.4, 12.3, 6.4, 12.85, 6.3, 2.25);
  for (let k = 0; k < 10; k++) rbox(f, OCHRE_D, -6.1 + k * 1.355 - 0.25, 12.3, -6.1 + k * 1.355 + 0.25, 12.85, 8.55, 0.45);
  const gateOpt = { bg: '#c0623a', fg: '#fff3c8', border: '#f7c31b', scale: 0.6, stroke: '#1d1426' };
  f.sign('CENTRO LA MEDINA', 0, 7.43, 12.92, 12, 1.8, 0, gateOpt);
  f.sign('CENTRO LA MEDINA', 0, 7.43, 12.23, 12, 1.8, PI, gateOpt);
  neonRect(face(f, 'S', 0, 12.97), 0, 7.43, 0, 12.25, 2.05, 0xffd23f);

  // Front arcades (horseshoe arches) along both wings.
  const usW = [], usE = [];
  for (let k = 0; k <= 7; k++) { usW.push(-28.6 + k * (18.6 / 7)); usE.push(10.0 + k * (18.6 / 7)); }
  const front = face(f, 'S', 0, 11);
  arcade(front, usW, 2.45, { top: ART });
  arcade(front, usE, 2.45, { top: ART });
  rflat(f, CREAM, -29, 11, -9.6, 13.45, CURB + 0.025);
  rflat(f, CREAM, 9.6, 11, 29, 13.45, CURB + 0.025);
  for (const x of [-21.0, -11.1, 11.1]) win(front, x, 4.75, 0.9, 1.3, { arch: true, shutters: GREEN });

  // Viking Bar: timber front, shields, bull's-eye windows, horned helmet on the parapet.
  const vb = face(f, 'S', -16, 11);
  vb.box(0x5a3a22, 0, CURB, 0.05, 11.2, 3.3, 0.1);
  for (let k = 0; k < 22; k++) vb.box(0x3e2614, -5.25 + k * 0.5, CURB, 0.11, 0.05, 3.3, 0.02, 0, f.F);
  door(vb, 0, 1.6, 2.5, 0x2a1a10, { z: 0.08, trim: 0x3e2614, split: true });
  for (const u of [-3.4, 3.4]) {
    vb.cyl(0x3e2614, u, CURB + 1.75, 0.12, 0.66, 0.1, 16, HP);
    vb.cyl(0xe8a040, u, CURB + 1.75, 0.15, 0.52, 0.06, 16, HP, 0, GL);
    vb.boxC(0x3e2614, u, CURB + 1.75, 0.2, 1.04, 0.06, 0.03);
    vb.boxC(0x3e2614, u, CURB + 1.75, 0.2, 0.06, 1.04, 0.03);
  }
  [-4.6, -2.2, 2.2, 4.6].forEach((u, k) => {
    vb.cyl([RED, SUN, BLUE, 0xf4efe6][k], u, CURB + 2.95, 0.14, 0.4, 0.08, 16, HP);
    vb.boxC([0xf4efe6, RED, SUN, BLUE][k], u, CURB + 2.95, 0.19, 0.8, 0.1, 0.02, 0, 0, k * 0.8);
    sph(vb, 0xc8ccd2, u, CURB + 2.95, 0.2, 0.2);
  });
  vb.box(0xffe6a0, 1.25, 2.3, 0.2, 0.2, 0.32, 0.2, 0, GL);
  board(vb, 'VIKING BAR', 0, 4.85, 7.4, 1.45, { bg: '#3a2416', fg: '#f7c31b', stroke: '#1d1426', scale: 0.74, neon: 0xffd23f, backC: WOOD_D, border: '#f7c31b' });
  {
    const hx = -16, hz = 10.75, hy = TOP + 0.9;
    geo(f, PRIM.dome(), 0x9aa3ad, hx, hy, hz, 2.6, 2.3, 2.6);
    f.cyl(0xd8a040, hx, hy + 0.1, hz, 1.34, 0.22, 18);
    f.boxC(0x9aa3ad, hx, hy - 0.15, hz + 1.25, 0.22, 0.7, 0.12);
    sph(f, 0xd8a040, hx, hy + 1.15, hz, 0.3);
    for (const s of [-1, 1]) {
      cone(f, 0xf2e8d0, hx + s * 1.8, hy + 1.0, hz, 0.36, 1.6, 10, 0, 0, -0.85 * s);
      cone(f, 0xf2e8d0, hx + s * 2.5, hy + 1.85, hz, 0.17, 0.75, 8, 0, 0, -0.2 * s);
    }
  }

  // Bar Svenska · Smörgåsar (blue and yellow), menu board in Swedish.
  const bs = face(f, 'S', -25.2, 11);
  shopGlass(bs, 0, 6.2, { doorAt: 1.8, frame: BLUE, glass: GLASS });
  board(bs, 'BAR SVENSKA · SMÖRGÅSAR', 0, 4.85, 5.8, 1.2, { bg: '#2f5a9a', fg: '#f7c31b', scale: 0.6, neon: 0x7ac8ff, backC: BLUE }); // [N]
  standSign(f, 'RÄKMACKA 150 PTA\nKÖTTBULLAR 200 PTA\nSVENSKT KAFFE 40', -22.6, 12.6, 1.0, 1.3, 1.1, 0, { bg: '#1d1426', fg: '#fff8e6', scale: 0.72 }); // [N]
  cafeTable(f, -27.6, 16.2, { parasol: SUN, cloth: BLUE });
  cafeTable(f, -24.4, 17.4, { parasol: BLUE, cloth: SUN });

  // Tonga Tonga: bamboo front, tiki masks, neon palm, mirror ball on the roof.
  const tg = face(f, 'S', 14, 11);
  for (let k = 0; k < 40; k++) tg.box(k % 2 ? 0xc8a050 : 0xa47a36, -4.875 + k * 0.25, CURB, 0.07, 0.25, 3.3, 0.12);
  door(tg, 0, 1.9, 2.5, 0x4a2a6a, { z: 0.12, trim: 0x2a1a3a, split: true });
  for (const u of [-0.45, 0.45]) tg.cyl(0xff5ab4, u, CURB + 1.75, 0.22, 0.2, 0.04, 12, HP, 0, GL);
  for (const u of [-2.4, 2.4]) {
    tg.box(0x7a4a2a, u, CURB, 0.35, 0.9, 2.7, 0.35);
    tg.box(0x5a321a, u, CURB + 2.7, 0.35, 1.1, 0.2, 0.4);
    for (const e of [-0.2, 0.2]) tg.box(0xf4efe6, u + e, CURB + 2.1, 0.53, 0.18, 0.18, 0.04);
    tg.box(RED, u, CURB + 1.4, 0.53, 0.5, 0.14, 0.04);
    tg.box(0x2f8a6a, u, CURB + 1.75, 0.53, 0.16, 0.3, 0.04);
  }
  board(tg, 'TONGA TONGA', 0, 4.85, 8.0, 1.45, { bg: '#2a1440', fg: '#ff5ab4', stroke: '#ffd23f', scale: 0.74, neon: 0xff5ab4, backC: 0x2a1440 }); // [F*] the film's night spot (Siv's line)
  tg.sign('DISCOTECA', 0, 3.25, 0.16, 2.6, 0.42, 0, { bg: '#1d1426', fg: '#7ae0ff', border: null, scale: 0.7 });
  {
    const u = 4.75, y = 3.95, z = 0.22;
    for (let k = 0; k < 3; k++) tg.boxC(0xffb04a, u + k * 0.05, y + 0.22 + k * 0.42, z, 0.08, 0.44, 0.08, 0, 0, -0.1, GL);
    for (const th of [0.35, 0.95, 1.57, 2.2, 2.8]) tg.boxC(0x6ae07a, u + 0.1 + Math.cos(th) * 0.42, y + 1.35 + Math.sin(th) * 0.42 - 0.12, z, 0.84, 0.08, 0.08, 0, 0, th - 0.25 * Math.sign(Math.cos(th)), GL);
  }
  {
    const bx = 14, bz = 8.8;
    f.cyl(STEEL, bx, TOP + 1.3, bz, 0.1, 2.6, 8);
    f.circ(bx, bz, 0.15, 99, 'pole');
    const g = new GeoBuilder();
    g.ico(0xc9d0da, 0, 0, 0, 2.3, 2);
    for (let k = 0; k < 46; k++) {
      const a = RND() * PI * 2, b = Math.acos(2 * RND() - 1);
      g.box(k % 3 ? 0xffffff : 0x9fd8ff, 1.13 * Math.sin(b) * Math.cos(a), 1.13 * Math.cos(b), 1.13 * Math.sin(b) * Math.sin(a), 0.24, 0.24, 0.24, a, b);
    }
    const ball = toonMesh(g.build(), { outline: 0.03 });
    ball.position.set(f.wx(bx, bz), TOP + 2.6 + 1.15, f.wz(bx, bz));
    ball.onBeforeRender = () => { ball.rotation.y = performance.now() * 0.0007; };
    f.scene?.add(ball);
  }

  // Prensa · Kvällstidningar: newspaper racks under the arcade.
  const pr = face(f, 'S', 24.5, 11);
  pr.box(0x2f8a4a, 0, CURB, 0.05, 8.2, 3.3, 0.1);
  for (let k = 0; k < 3; k++) {
    pr.boxC(0xd8d0c0, -2.6 + k * 2.6, 1.3, 0.55, 2.2, 1.6, 0.25, 0, -0.25);
    for (let m = 0; m < 8; m++) pr.boxC(pickR([0xfff8e6, 0xffd23f, 0xd8321e, 0x7ac8ff, 0xffffff]), -3.4 + k * 2.6 + (m % 4) * 0.52, 0.95 + (m >> 2) * 0.72, 0.72, 0.44, 0.58, 0.02, 0, -0.25, 0, f.F);
  }
  board(pr, 'PRENSA · KVÄLLSTIDNINGAR', 0, 4.85, 6.6, 1.1, { bg: '#fff8e6', fg: '#d8321e', scale: 0.58 }); // [N]
  f.prop('vykort', 21.4, 12.4, PI);
  f.prop('vykort', 27.8, 12.4, PI);

  // Courtyard shops on the wings' inner faces, with neon signs upstairs.
  const sr = face(f, 'E', -7, 2);
  shopGlass(sr, 0, 7, { doorAt: 2.2, frame: DARK, glass: 0x2a3a5a });
  for (let k = 0; k < 6; k++) sr.box(BULBS[k % 5], -2.6 + k * 0.7, CURB + 1.0 + (k % 2) * 0.6, 0.12, 0.3, 0.3, 0.02, 0, GL);
  board(sr, 'SALÓN RECREATIVO', 0, 4.8, 5.6, 1.0, { bg: '#1d1426', fg: '#7ae0ff', scale: 0.62, neon: 0x7ae0ff }); // [N]
  const bz = face(f, 'W', 7, 2);
  shopGlass(bz, 0, 7, { doorAt: -2.2, frame: WOOD_D, glass: 0x9a7a4a });
  for (let k = 0; k < 6; k++) bz.box(WOOD_D, -3.3 + k * 1.32, ART + 0.2, 0.06, 0.18, TOP - ART - 0.5, 0.06);
  bz.box(WOOD_D, 0, ART + 0.2, 0.06, 7, 0.18, 0.06);
  bz.boxC(WOOD_D, -2.64, 4.75, 0.06, 0.16, 2.4, 0.06, 0, 0, 0.5);
  bz.boxC(WOOD_D, 2.64, 4.75, 0.06, 0.16, 2.4, 0.06, 0, 0, -0.5);
  board(bz, 'CERVECERÍA · ÖL', 0, 4.75, 3.2, 0.8, { bg: '#f4e4b0', fg: '#6a3a1a', scale: 0.6 }); // [N]
  for (const [fr2, txt, c] of [[face(f, 'E', -7, -3.5), 'PUB LOS AMIGOS', '#ffd23f'], [face(f, 'W', 7, -4.5), 'CLUB 2000', '#ff5ab4']]) { // [N]
    win(fr2, 0, 4.7, 1.2, 1.6, { arch: true, shutters: GREEN });
    fr2.boxC(DARK, 0, 2.9, 0.08, 3.3, 0.65, 0.06);
    fr2.sign(txt, 0, 2.9, 0.14, 3.2, 0.55, 0, { bg: null, fg: c, border: null, scale: 0.8, stroke: '#1d1426' });
  }
  // Windows on every outer face; a back door; gas bottles.
  const winRow = (fr2, from, to, step, skip = []) => {
    for (let u = from; u <= to + 0.01; u += step) {
      if (skip.some(([a, b]) => u > a && u < b)) continue;
      win(fr2, u, 4.65, 1.1, 1.5, { arch: true, shutters: GREEN });
      win(fr2, u, 1.75, 1.1, 1.5, { shutters: GREEN });
    }
  };
  winRow(face(f, 'N', 0, -29), -26, 26, 3.7, [[-1.5, 1.5]]);
  winRow(face(f, 'W', -29, -9), -18, 18, 3.6);
  winRow(face(f, 'E', 29, -9), -18, 18, 3.6);
  door(face(f, 'N', 0, -29), 0, 1.8, 2.4, WOOD, { arch: true, split: true });
  for (const x of [-20, 12]) f.prop('butano', x, -29.8);
  f.prop('papelera', -4, -30, 0);

  // Stairs from the courtyard to the roof terrace: visible steps + one ramp collider. The flight's
  // foot is 0.5 m from the east wing, so the way on is from the courtyard over the bottom three
  // steps; the balustrade starts above them (newel post at xs), with a sloped wall collider along
  // it (without one the player walked through it and fell up to 5.85 m).
  {
    const x0 = 6.5, x1 = -7, z0 = -9, z1 = -6.6, n = 27, len = x0 - x1;
    for (let k = 0; k < n; k++) {
      const xa = x0 - (k + 1) * (len / n), h = (k + 1) / n * (TOP - CURB);
      rbox(f, k % 2 ? WHITE : CREAM, xa, z0, xa + len / n, z1, CURB, h);
      rbox(f, TILE, xa, z0, xa + len / n, z1, CURB + h, 0.04);
    }
    const xs = x0 - 3 * (len / n), hs = CURB + 3 / n * (TOP - CURB), zb = z1 - 0.1;
    const ang = Math.atan2(TOP - hs, xs - x1), L = Math.hypot(TOP - hs, xs - x1);
    f.boxC(WHITE2, (xs + x1) / 2, (TOP + hs) / 2 + 0.55, zb, L, 0.95, 0.18, 0, 0, -ang);
    f.boxC(TERRA, (xs + x1) / 2, (TOP + hs) / 2 + 1.05, zb, L, 0.1, 0.24, 0, 0, -ang);
    f.box(WHITE2, xs, CURB, zb, 0.26, hs + 1.15 - CURB, 0.26);
    f.box(TERRA, xs, hs + 1.15, zb, 0.32, 0.08, 0.32);
    f.circ(xs, zb, 0.15, 99, 'pole');
    ramp(f.wx((x0 + x1) / 2, (z0 + z1) / 2), f.wz((x0 + x1) / 2, (z0 + z1) / 2), f.yaw - HP, z1 - z0, len, CURB, TOP);
    ramp(f.wx((xs + x1) / 2, zb), f.wz((xs + x1) / 2, zb), f.yaw - HP, 0.2, xs - x1, hs + 1.1, TOP + 1.1, 'wall');
  }
  // Courtyard: fountain, café tables, julgran, string lights.
  f.cyl(WHITE2, 0, CURB + 0.3, 3, 1.5, 0.6, 8);
  f.cyl(0x2f6aa8, 0, CURB + 0.5, 3, 1.53, 0.14, 8, 0, 0, f.F);
  f.F.cyl(SEA, f.wx(0, 3), CURB + 0.6, f.wz(0, 3), 1.32, 0.03, 8);
  f.cyl(WHITE2, 0, CURB + 1.0, 3, 0.18, 1.2, 8);
  sph(f, WHITE2, 0, CURB + 1.65, 3, 0.55, 0.3, 0.55, f.S, 10);
  f.circ(0, 3, 1.5, CURB + 0.6, 'solid');
  cafeTable(f, -4.4, 7.6, { parasol: RED });
  cafeTable(f, 4.4, 7.6, { parasol: GREEN });
  cafeTable(f, -4.4, -2.0, { parasol: SUN });
  cafeTable(f, 4.2, -0.6, { parasol: BLUE });
  f.prop('julgran', -5.6, 10.3);
  for (const z of [-3, 2.5, 8]) stringLights(f, [-7, 5.4, z], [7, 5.4, z], 14, 0.8);

  // Front plaza: palms in planters at the gate, lanterns, a bench, bins.
  palmPot(f, -4.7, 16.4, 0.78, { tinsel: true });
  palmPot(f, 4.7, 16.4, 0.78, { tinsel: true });
  palmPot(f, -28.6, 28.6, 1.1);
  palm(f, 29.8, 16.2, 1.05);
  lantern(f, -21.0, 15.0);
  lantern(f, 21.0, 15.4);
  f.prop('bank', -10.5, 16.8, 0);
  f.prop('papelera', -8.6, 14.4);
  f.prop('papelera', 8.6, 14.4);
  f.prop('correos', -30.2, 20);

  // Roof terrace: a small bar kiosk, tables, the plunge pool by the pen, water tanks.
  rbox(f, WHITE, -25, -24, -19, -18, TOP, 2.6);
  rbox(f, TERRA, -25.4, -24.4, -18.6, -17.6, TOP + 2.6, 0.22);
  const kf = face(f, 'E', -19, -21);
  shopGlass(kf, 0, 5, { h: 2.3, doorAt: 1.4, frame: BLUE, y0: TOP });
  awning(kf, 0, 5.6, TOP + 2.4, 1.6, [0x1e9aa0, WHITE2]);
  kf.sign('TERRAZA · BAR', 0, TOP + 2.95, 0.3, 3.2, 0.45, 0, { bg: '#fff8e6', fg: '#c0623a', border: '#1d1426', scale: 0.7 }); // [N]
  rsolid(f, -25, -24, -19, -18);
  for (const [x, z, c] of [[-14, -20, RED], [-12.5, -13.5, SUN], [-20.5, -11.5, BLUE], [-23, -5, GREEN]]) cafeTable(f, x, z, { y: TOP, parasol: c });
  rflat(f, SEA, 9.4, -8.2, 13.6, -3.6, TOP + 0.07);
  for (const [a, b, c, d] of [[9.1, -8.5, 13.9, -8.2], [9.1, -3.6, 13.9, -3.3], [9.1, -8.2, 9.4, -3.6], [13.6, -8.2, 13.9, -3.6]]) rbox(f, WHITE2, a, b, c, d, TOP, 0.16);
  f.prop('solstol', 16.0, -7.0, HP, TOP);
  f.prop('solstol', 16.0, -4.4, HP, TOP);
  f.prop('parasoll', 17.6, -5.7, 0, TOP);
  for (const x of [-3, 2.5]) { f.cyl(WHITE2, x, TOP + 0.85, -25.5, 0.85, 1.7, 12); f.circ(x, -25.5, 0.85, TOP + 1.7, 'solid'); }
  rooftop(f, 16, -27, 27, -12, TOP, 5, true);
  rooftop(f, -27, -2, -10, 9, TOP, 3, true);
  for (const r of [WW, EW, NW]) {
    for (let x = r[0] + 2; x < r[2] - 0.5; x += 2) rflat(f, 0xb06a46, x - 0.04, r[1] + 0.4, x + 0.04, r[3] - 0.4, TOP + 0.045);
    for (let z = r[1] + 2; z < r[3] - 0.5; z += 2) rflat(f, 0xb06a46, r[0] + 0.4, z - 0.04, r[2] - 0.4, z + 0.04, TOP + 0.045);
  }
}

// ---------------------------------------------------------------------------------------------
// (4,2) Centro Nórdico (internal id cita): strip mall with flats above, a phone pavilion in the
//   courtyard and a car park on the street side.

function cita(f) {
  const TOPN = 8.2, TOPW = 4.6;
  rflat(f, PAVE, -31, -31, 31, 13.6, CURB + 0.01);
  for (let i = 0; i < 11; i++) for (let j = 0; j < 9; j++) if ((i + j) % 2 === 0) rflat(f, 0xe8dcc4, -11 + i * 2, -5.6 + j * 2, -9 + i * 2, -3.6 + j * 2, CURB + 0.02);
  rflat(f, LOT, -31, 13.6, 31, 31, CURB + 0.015);
  rflat(f, CREAM, -29, 12, 29, 13.6, CURB + 0.025);
  for (let k = 0; k <= 20; k++) { const x = -29 + k * 2.9; rflat(f, LINE, x - 0.07, 25.8, x + 0.07, 30.8, CURB + 0.03); }
  rflat(f, LINE, -29, 25.7, 29, 25.85, CURB + 0.03);
  for (const [x, t, c] of [[-27.55, 'hatch', null], [-10.15, 'sedan', null], [10.15, 'van', 0xe8e0c8], [24.65, 'hatch', null]]) f.car(t, x, 28.3, PI, c ? { color: c } : {});
  lantern(f, -14, 24.6, 4.4, HP);
  lantern(f, 14, 24.6, 4.4, HP);

  // North block: shops under a canopy, flats with balconies above, the big rooftop sign.
  const NB = [-29, -29, 29, -8];
  rbox(f, WHITE, ...NB, CURB, TOPN - CURB);
  rbox(f, 0xd8d0c0, -29.05, -29.05, 29.05, -7.95, CURB, 0.5);
  rbox(f, BLUE, -29.12, -29.12, 29.12, -7.88, TOPN - 0.4, 0.45);
  rsolid(f, ...NB);
  // The courtyard between the wings (x ±11) shows x -11…11 of the north face: the shop row and its
  // canopy stay inside that (until Phase 3 they ran into the wings and two shops were buried).
  rbox(f, WHITE2, -11, -8, 11, -5.6, 3.7, 0.25);
  rbox(f, BLUE, -11, -5.76, 11, -5.56, 3.5, 0.58);
  for (const x of [-8.6, -2.8, 2.8, 8.6]) { f.cyl(STEEL, x, CURB + 1.68, -5.9, 0.11, 3.36, 8); f.circ(x, -5.9, 0.14, 99, 'pole'); }
  f.ceiling(0, -6.8, 22, 2.4, 3.5, 4.1);   // the chase camera stays under the canopy (fascia bottom)
  const sf = face(f, 'S', 0, -8);
  const shops = [ // [N]
    [-7.5, 7, 'SVENSKT KAFFE · KONDITORI', '#2f5a9a', '#f7c31b', -1.6],
    [7.5, 7, 'ESTANCO · TABACOS', '#7a1f2a', '#f7c31b', 1.6],
  ];
  for (const [u, w, name, bg, fg, d] of shops) {
    shopGlass(sf, u, w, { doorAt: d, glass: GLASS });
    sf.sign(name, u, 3.79, 2.47, w - 1.0, 0.5, 0, { bg, fg, border: null, scale: 0.8 });
  }
  shopGlass(sf, 0, 8, { doorAt: 0, glass: 0x9ac8e0, doorC: 0x9ac8e0 });
  sf.sign('CENTRO NÓRDICO · ENTRADA', 0, 3.79, 2.47, 7, 0.5, 0, { bg: '#1f4f9a', fg: '#f7c31b', border: null, scale: 0.8 });
  // SOUVENIRS (posters in the window) and FARMACIA on the wings' courtyard faces.
  const so = face(f, 'E', -11, -3.5);
  shopGlass(so, 0, 3.8, { doorAt: 0.9, glass: GLASS });
  board(so, 'SOUVENIRS · REGALOS', 0, 3.95, 3.6, 0.6, { bg: '#f7c31b', fg: '#1d1426', scale: 0.66, back: false }); // [N]
  for (let k = 0; k < 3; k++) so.box(k % 2 ? 0xf7c31b : 0xd8321e, -1.3 + k * 0.55, CURB + 1.4, 0.12, 0.45, 0.7, 0.02, 0, f.F);
  const fa = face(f, 'W', 11, 8.8);
  shopGlass(fa, 0, 6, { doorAt: -1.6, glass: GLASS });
  board(fa, 'FARMACIA', 0, 3.95, 4.4, 0.7, { bg: '#2f8a4a', fg: '#ffffff', scale: 0.7, back: false }); // [N]
  // The green pharmacy cross (lit) on a bracket, square to the wall: it reads from the courtyard mouth.
  fa.boxC(STEEL, 2.6, 3.9, 0.13, 0.08, 0.08, 0.26);
  fa.boxC(0x3ad86a, 2.6, 3.9, 0.75, 0.14, 1.0, 0.34, 0, 0, 0, GL);
  fa.boxC(0x3ad86a, 2.6, 3.9, 0.75, 0.14, 0.34, 1.0, 0, 0, 0, GL);
  // The estanco's maroon-and-yellow T standing on the canopy.
  f.box(STEEL, 6.6, 3.95, -6.0, 0.12, 0.6, 0.12);
  f.box(0x7a1f2a, 6.6, 4.5, -6.0, 0.9, 0.9, 0.2);
  f.box(0xf7c31b, 6.6, 5.06, -5.88, 0.6, 0.14, 0.02, 0, f.F);
  f.box(0xf7c31b, 6.6, 4.62, -5.88, 0.14, 0.52, 0.02, 0, f.F);
  // Flats: balconies, awnings, towels.
  for (let k = 0; k < 8; k++) {
    const u = -24.5 + k * 7, cols = k % 2 ? [GREEN, WHITE2] : [0xf07a1e, WHITE2];
    sf.box(WHITE2, u, 4.3, 0.55, 4.6, 0.15, 1.1);
    sf.box(WHITE2, u, 4.45, 1.07, 4.6, 0.95, 0.06);
    for (const s of [-1, 1]) sf.box(WHITE2, u + s * 2.27, 4.45, 0.55, 0.06, 0.95, 1.1);
    win(sf, u - 0.9, 5.55, 1.1, 2.0, { trim: WHITE2 });
    win(sf, u + 1.1, 5.9, 1.3, 1.2, { trim: WHITE2 });
    awning(sf, u, 4.4, 7.55, 1.35, cols);
    for (let t = 0; t < 1 + (k % 2); t++) sf.box(pickR(TOWELS), u + R(-1.7, 1.7), 4.75, 1.12, 0.6, 0.75, 0.04);
    sph(sf, PALM2, u - 2.0, 4.65, 0.4, 0.5);
  }
  for (const [x, kind] of [[-20, 'se'], [-14, 'no'], [14, 'dk'], [20, 'es']]) flag(f, x, -8.7, TOPN, kind);
  for (const s of [-1, 1]) f.box(STEEL, s * 6.5, TOPN, -16, 0.25, 1.3, 0.25);
  rooftop(f, -28, -28, -10, -18, TOPN, 6);
  rooftop(f, 10, -28, 28, -18, TOPN, 6);
  f.sign('CENTRO NÓRDICO', 0, TOPN + 2.45, -16, 17, 2.3, 0, { bg: '#1f4f9a', fg: '#f7c31b', border: '#f7c31b', scale: 0.66, double: true });
  neonRect(face(f, 'S', 0, -15.96), 0, TOPN + 2.45, 0, 17.2, 2.5, 0xffd23f);
  // Back of the north block: windows, loading doors, gas bottles.
  const nb = face(f, 'N', 0, -29);
  for (let u = -26; u <= 26.01; u += 4) win(nb, u, 5.8, 1.3, 1.4, { shutters: BLUE });
  for (const u of [-8, 8]) { nb.box(0x9aa0a8, u, CURB, 0.06, 3.4, 3.0, 0.08); for (let k = 0; k < 9; k++) nb.box(0x7a8088, u, CURB + 0.3 + k * 0.32, 0.11, 3.3, 0.04, 0.02, 0, f.F); }
  nb.sign('CARGA Y DESCARGA', 0, 3.4, 0.06, 4.0, 0.5, 0, { bg: '#fff8e6', fg: '#d8321e', border: null, scale: 0.7 });
  for (const x of [-15, -14.4, 16]) f.prop('butano', x, -29.8);

  // Wings: SUPERMERCADO and FERRETERÍA on the street side, CAMBIO and FOTO on the courtyard.
  const WW = [-29, -8, -11, 12], EW = [11, -8, 29, 12];
  for (const r of [WW, EW]) {
    rbox(f, WHITE, ...r, CURB, TOPW - CURB);
    rbox(f, 0xd8d0c0, r[0] - 0.05, r[1] - 0.05, r[2] + 0.05, r[3] + 0.05, CURB, 0.45);
    rbox(f, BLUE, r[0] - 0.1, r[1] - 0.1, r[2] + 0.1, r[3] + 0.1, TOPW - 0.25, 0.3);
    rsolid(f, ...r);
  }
  const sm = face(f, 'S', -20, 12);
  shopGlass(sm, 0, 17, { doorAt: 2, glass: 0x8ab8d8 });
  awning(sm, 0, 17.4, 3.5, 1.4, [RED, WHITE2]);
  f.ceiling(-20, 12.7, 17.4, 1.4, 2.74, 3.6);   // the chase camera stays under the awning (valance bottom)
  board(sm, 'SUPERMERCADO', 0, 4.0, 11, 0.85, { bg: '#d8321e', fg: '#ffffff', scale: 0.74, back: false }); // [N]
  for (const [u, t] of [[-5.5, 'OFERTAS'], [-2.4, 'LECHE · PAN · VINO'], [6, 'FRUTA FRESCA']]) sm.sign(t, u, 2.0, 0.12, 2.6, 0.7, 0, { bg: '#f7c31b', fg: '#d8321e', border: null, scale: 0.6 }); // [N]
  for (let k = 0; k < 4; k++) {
    const x = -27.6 + k * 1.15;
    f.box(0xb88a52, x, CURB, 13.0, 0.95, 0.45, 0.7);
    for (let m = 0; m < 4; m++) sph(f, [0xf07a1e, 0xf7c31b, 0xd8321e, 0x6ab04a][k], x + (m % 2 - 0.5) * 0.4, CURB + 0.55, 13.0 + ((m >> 1) - 0.5) * 0.3, 0.26);
  }
  f.solid(-25.9, 13.0, 4.6, 0.7, CURB + 0.6, 'crate');
  const ce = face(f, 'E', -11, 2);
  shopGlass(ce, 0, 7, { doorAt: -2, glass: GLASS });
  board(ce, 'CAMBIO · VÄXLING', 0, 3.95, 6.4, 0.7, { bg: '#1d1426', fg: '#f7c31b', scale: 0.62, back: false }); // [N]
  standSign(f, 'CAMBIO\n1 KR = 17 PTA', -8.6, 12.9, 1.55, 1.9, 1.1, 0, { bg: '#1d1426', fg: '#f7c31b', scale: 0.7 }); // §10.2 flavour sign
  const sw = face(f, 'W', -29, 2);
  board(sw, 'SUNTRIP\nBUSSUTFLYKTER · FATAGA · MARKNADEN', 0, 2.3, 10, 2.8, { bg: '#f7c31b', fg: '#d8321e', scale: 0.58, back: false, z: 0.04 }); // [N]
  const fe = face(f, 'S', 20, 12);
  shopGlass(fe, 0, 17, { doorAt: -2, frame: 0x3a2a1a, glass: 0x7aa0b8 });
  awning(fe, 0, 17.4, 3.5, 1.4, [GREEN, WHITE2]);
  f.ceiling(20, 12.7, 17.4, 1.4, 2.74, 3.6);
  board(fe, 'FERRETERÍA · PINTURAS', 0, 4.0, 12, 0.85, { bg: '#8a3a1a', fg: '#fff8e6', scale: 0.74, back: false }); // [N]
  {
    f.box(WOOD, 24.6, CURB, 13.0, 3.0, 0.5, 0.75);
    for (let k = 0; k < 12; k++) f.cyl([RED, BLUE, SUN, GREEN, WHITE2, 0xf07a1e][k % 6], 23.4 + (k % 6) * 0.48, CURB + 0.68 + (k >= 6 ? 0.36 : 0), 13.0 + (k >= 6 ? -0.12 : 0.12), 0.19, 0.34, 10);
    f.solid(24.6, 13.0, 3.0, 0.75, CURB + 1.2, 'crate');
    for (const s of [-0.3, 0.3]) f.boxC(0xc8a050, 27.6 + s, 1.6, 12.35, 0.08, 3.0, 0.08, 0, -0.18);
    for (let k = 0; k < 7; k++) { const y = 0.45 + k * 0.4; f.boxC(0xc8a050, 27.6, y, 12.35 - 0.182 * (y - 1.6), 0.62, 0.06, 0.06); }
    for (const x of [15.8, 16.4]) { f.cyl(WOOD, x, 1.2, 12.25, 0.03, 2.1, 6); f.box(0xd8b060, x, CURB, 12.25, 0.3, 0.35, 0.12); }
    for (let k = 0; k < 3; k++) f.cyl([RED, BLUE, SUN][k], 19.2 + k * 0.6, 2.85, 12.9, 0.17, 0.3, 10);
  }
  const fo = face(f, 'W', 11, 2);
  shopGlass(fo, 0, 7, { doorAt: 2, glass: GLASS });
  board(fo, 'FOTO · REVELADO 24 H', 0, 3.95, 6, 0.7, { bg: '#f7c31b', fg: '#d8321e', scale: 0.66, back: false }); // [N]
  board(face(f, 'E', 29, 2), 'HÄR TALAS SVENSKA', 0, 2.6, 8, 1.2, { bg: '#2f5a9a', fg: '#f7c31b', scale: 0.62, back: false, z: 0.04 }); // §6.9

  // TELÉFONOS · HYTT 1·2·3: the phone pavilion in the courtyard (telefon landmark faces it).
  rbox(f, 0xe8e4da, -3.4, 1.5, 3.4, 4.7, CURB, 0.12);
  const tf = face(f, 'S', 0, 4.6);
  for (let k = -1; k <= 1; k++) {
    const u = k * 2.1;
    tf.box(0xd8d4c8, u, CURB + 0.12, -1.5, 2.0, 2.5, 3.0);
    tf.box(STEEL, u, CURB + 0.12, 0.02, 1.8, 2.45, 0.06);
    tf.box(0xa8d8ec, u, CURB + 0.3, 0.06, 1.45, 2.05, 0.05);
    tf.box(DARK, u + 0.55, CURB + 1.2, 0.1, 0.06, 0.3, 0.04);
    tf.sign(String(k + 2), u, 2.0, 0.1, 0.42, 0.42, 0, { bg: '#fff8e6', fg: '#1d1426', scale: 0.8 });
  }
  tf.box(WHITE2, 0, 2.75, -1.5, 7.0, 0.22, 3.5);
  board(tf, 'TELÉFONOS · HYTT 1·2·3', 0, 3.38, 6.2, 0.75, { bg: '#2f5a9a', fg: '#ffffff', z: 0.06, scale: 0.66 }); // [N]
  rsolid(f, -3.3, 1.6, 3.3, 4.6);
  palmPot(f, -7.4, -1.6, 0.95);
  palmPot(f, 7.4, -1.6, 0.95);
  f.prop('bank', -7.6, 7.2, HP);
  f.prop('bank', 7.6, 7.2, -HP);
  f.prop('automat', -10.4, 10.6, HP);
  f.prop('papelera', 9.9, 10.9);
  f.prop('vykort', -9.6, -4.6);
  f.prop('julgran', 3.6, -4.4);
  for (const z of [0.5, 9.5]) stringLights(f, [-11, 4.3, z], [11, 4.3, z], 16, 0.6);
}

// A flag on a pole standing on a roof edge (y0): kind 'se' | 'no' | 'dk' | 'es'.
function flag(f, x, z, y0, kind) {
  f.cyl(WHITE2, x, y0 + 2.2, z, 0.06, 4.4, 6);
  sph(f, 0xd8a040, x, y0 + 4.45, z, 0.16);
  const w = 1.5, h = 1.0, fx = x + w / 2 + 0.06, fy = y0 + 3.7;
  f.boxC({ se: 0x2a6ab8, no: 0xc8202a, dk: 0xc8202a, es: 0xc8202a }[kind], fx, fy, z, w, h, 0.04);
  const cross = (c, t, d = 0.06) => { f.boxC(c, fx - w * 0.12, fy, z, t, h, d, 0, 0, 0, f.F); f.boxC(c, fx, fy, z, w, t, d, 0, 0, 0, f.F); };
  if (kind === 'se') cross(SUN, 0.2);
  else if (kind === 'dk') cross(0xffffff, 0.16);
  else if (kind === 'no') { cross(0xffffff, 0.26); cross(0x1f3a7a, 0.12, 0.07); }
  else if (kind === 'es') f.boxC(SUN, fx, fy, z, w, h * 0.5, 0.06, 0, 0, 0, f.F);
}

// ---------------------------------------------------------------------------------------------
// (2,3) Plaza: palms round a walkable shallow fountain (fena_plaza circles in it), arcades and
//   café terraces, a big plastic Christmas tree, and CASA LOLA's terrace on the south-east corner.

function plaza(f) {
  rflat(f, PAVE, -31, -31, 31, 31, CURB + 0.01);
  disc(f, TILE, 0, 0, 9.6, CURB + 0.02, 40);
  disc(f, CREAM, 0, 0, 8.4, CURB + 0.025, 40);
  for (let k = 0; k < 16; k++) { const a = (k / 16) * PI * 2; f.flat(TILE, Math.cos(a) * 8.0, Math.sin(a) * 8.0, 0.8, 0.8, CURB + 0.03, a + PI / 4); }
  rflat(f, 0xdcc8a0, -1.6, 9.6, 1.6, 31, CURB + 0.02);
  rflat(f, 0xdcc8a0, -1.6, -14.6, 1.6, -9.6, CURB + 0.02);
  rflat(f, 0xdcc8a0, -19, -1.6, -9.6, 1.6, CURB + 0.02);

  // The fountain: octagonal rim (a step, top 0.55), shallow water (a floor at CURB), tiered bowl.
  const FR = 5.2, RIM = CURB + 0.4;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * PI * 2 + PI / 8, x = Math.cos(a) * FR, z = Math.sin(a) * FR, len = 2 * (FR + 0.3) * Math.tan(PI / 8) + 0.02;
    f.boxC(WHITE2, x, CURB + 0.2, z, 0.6, 0.4, len, -a);
    f.boxC(0x2f6aa8, x + Math.cos(a) * 0.31, CURB + 0.2, z + Math.sin(a) * 0.31, 0.02, 0.24, len, -a, 0, 0, f.F);
    ramp(f.wx(x, z), f.wz(x, z), f.yaw - a, 0.6, len, RIM, RIM, 'rim');
  }
  f.F.cyl(SEA, f.wx(0, 0), CURB + 0.04, f.wz(0, 0), FR + 0.05, 0.03, 8, 0, PI / 8);
  f.circ(0, 0, FR - 0.3, CURB, 'water');
  f.cyl(WHITE2, 0, CURB + 0.6, 0, 0.42, 1.2, 10);
  f.cyl(WHITE2, 0, CURB + 1.5, 0, 0.62, 0.25, 12);
  f.cyl(WHITE2, 0, CURB + 1.72, 0, 1.0, 0.22, 14);
  f.F.cyl(SEA, f.wx(0, 0), CURB + 1.84, f.wz(0, 0), 0.86, 0.03, 14);
  f.cyl(WHITE2, 0, CURB + 2.3, 0, 0.14, 1.0, 8);
  f.cyl(WHITE2, 0, CURB + 2.82, 0, 0.45, 0.14, 10);
  sph(f, 0xd8a040, 0, CURB + 3.0, 0, 0.26);
  f.cyl(0x9ad8f4, 0, CURB + 3.35, 0, 0.06, 0.7, 6);
  for (let k = 0; k < 4; k++) {
    const a = k * HP + PI / 4;
    f.boxC(0x9ad8f4, Math.cos(a) * 1.25, CURB + 1.25, Math.sin(a) * 1.25, 0.6, 0.06, 0.06, -a, 0, -1.0);
  }
  f.circ(0, 0, 0.45, 99, 'solid');
  // The fountain's column stands at (0, 0): the `plaza` landmark is just outside the rim on the
  // south side, facing the fountain, (0, 6.8, π) in landmarks-island.js since Phase 2.

  // Palm ring (tinsel on every other trunk), benches, lanterns, the big Christmas tree.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * PI * 2 + PI / 8, x = Math.cos(a) * 12.3, z = Math.sin(a) * 12.3;
    disc(f, 0x9a7a52, x, z, 1.1, CURB + 0.035, 14);
    palm(f, x, z, 1.05 + (k % 3) * 0.07, { tinsel: k % 2 === 0 });
  }
  for (const [x, z, y] of [[8.6, 0, -HP], [-8.6, 0, HP], [0, 8.6, 0], [0, -8.6, PI]]) f.prop('bank', x, z, y);
  for (const [x, z] of [[9.6, 9.6], [-9.6, 9.6], [-9.6, -9.6], [9.6, -9.6]]) lantern(f, x, z, 4.2, PI / 4);
  xmasTree(f, -6.5, -11.6, 6.4);

  // North row: three storeys with a round-arched arcade, wrought-iron balconies, shops.
  const NR = [-29, -29, 29, -17];
  rbox(f, WHITE, ...NR, CURB, 9.8 - CURB);
  rbox(f, OCHRE, -29.1, -29.1, 29.1, -16.9, 9.5, 0.35);
  rbox(f, TERRA, -29.05, -29.05, 29.05, -16.95, CURB, 0.45);
  rsolid(f, ...NR);
  rooftop(f, -28, -28, 28, -18, 9.85, 9);
  const nr = face(f, 'S', 0, -17);
  const us = [];
  for (let k = 0; k <= 14; k++) us.push(-28 + k * 4);
  arcade(nr, us, 2.4, { top: 4.4, spring: 2.25, al: 0, capC: OCHRE, band: OCHRE });
  rflat(f, CREAM, -29, -17, 29, -14.6, CURB + 0.025);
  const shopsN = [[-21, 10, 'CAFETERÍA EL SOL', '#f07a1e', '#fff8e6'], [-9, 8, 'HELADERÍA LA PALMERA', '#f4d0e0', '#c2307a'], [3, 8, 'CORREOS · TELÉGRAFOS', '#f7c31b', '#1d1426'], [14, 8, 'BANCO · CAMBIO', '#2f5a9a', '#ffffff'], [24, 7, 'PELUQUERÍA', '#1e9aa0', '#ffffff']]; // [N]
  for (const [u, w, name, bg, fg] of shopsN) {
    shopGlass(nr, u, w, { h: 3.0, glass: GLASS });
    nr.sign(name, u, 3.62, 0.12, w - 1.4, 0.55, 0, { bg, fg, border: null, scale: 0.78 });
  }
  for (const fl of [5.9, 8.4]) for (let u = -26; u <= 26.01; u += 4) {
    win(nr, u, fl, 1.2, 1.7, { shutters: Math.round(u / 4) % 2 === 0 ? GREEN : BLUE });
    nr.box(DARK, u, fl - 1.0, 0.4, 1.9, 0.08, 0.7);
    for (let b = 0; b < 8; b++) nr.box(DARK, u - 0.84 + b * 0.24, fl - 0.92, 0.72, 0.03, 0.85, 0.03, 0, f.F);
    nr.box(DARK, u, fl - 0.07, 0.72, 1.9, 0.05, 0.05, 0, f.F);
    if (RND() < 0.4) for (let p = 0; p < 3; p++) sph(nr, pickR([0xd8321e, BOUG, 0xf04a6a]), u - 0.6 + p * 0.6, fl - 0.8, 0.55, 0.3);
  }
  for (const [x, z] of [[-25, -11.4], [-20, -11.0], [-15.2, -11.6]]) { cafeTable(f, x, z, { chairs: 3 }); f.prop('parasoll', x, z); }
  f.prop('correos', 5.6, -13.4);
  f.prop('papelera', -2.4, -13.6);

  // West row: two storeys, terracotta roof, Canarian wooden balconies, Restaurante El Patio.
  const WR = [-29, -17, -19, 29];
  rbox(f, CREAM, ...WR, CURB, 6.6 - CURB);
  rbox(f, TERRA, -29.05, -17.05, -18.95, 29.05, CURB, 0.45);
  f.roof(TERRA, -24, 6.6, 6, 47.2, 2.6, 11.2, HP);
  rsolid(f, ...WR);
  for (const z of [-11, -2, 15, 23]) {
    const bf = face(f, 'E', -19, z);
    win(bf, 0, 1.8, 1.2, 1.6, { trim: WHITE2, shutters: WOOD });
    bf.box(WOOD, 0, 3.75, 0.06, 1.0, 2.1, 0.08);
    bf.box(WOOD, 0, 3.6, 0.5, 3.2, 0.14, 1.0);
    bf.box(WOOD_D, 0, 3.74, 0.97, 3.2, 0.12, 0.06);
    bf.box(WOOD_D, 0, 4.66, 0.97, 3.2, 0.1, 0.08);
    for (let b = 0; b < 13; b++) bf.box(WOOD, -1.5 + b * 0.25, 3.86, 0.97, 0.06, 0.8, 0.06, 0, f.F);
    for (const s of [-1, 1]) bf.box(WOOD_D, s * 1.55, 3.74, 0.97, 0.1, 2.2, 0.1);
    bf.boxC(WOOD_D, 0, 6.05, 0.6, 3.5, 0.1, 1.3, 0, 0.25);
  }
  {
    const pf = face(f, 'E', -19, 6.5);
    door(pf, 0, 1.6, 2.5, GREEN, { arch: true, split: true });
    for (const u of [-3, 3]) { win(pf, u, 1.8, 1.4, 1.6, { trim: WHITE2 }); for (let b = 0; b < 6; b++) pf.box(DARK, u - 0.6 + b * 0.24, 1.0, 0.16, 0.04, 1.6, 0.04, 0, f.F); }
    board(pf, 'RESTAURANTE EL PATIO', 0, 3.55, 5.4, 0.62, { bg: '#fff8e6', fg: '#2f8a4a', scale: 0.7, back: false, z: 0.06 }); // [N]
    for (const z of [2.0, 7.0, 12.0]) cafeTable(f, -15.6, z, { parasol: GREEN, check: true });
  }

  // CASA LOLA · COMIDA CANARIA: white house with a tile roof, pergola terrace with string lights.
  const CL = [13, 4, 29, 14];
  rbox(f, WHITE, ...CL, CURB, 3.9 - CURB);
  rbox(f, 0x5a8a5a, 12.95, 3.95, 29.05, 14.05, CURB, 0.4);
  f.roof(TERRA, 21, 3.9, 9, 17.2, 2.2, 11.4);
  rbox(f, WHITE, 25.4, 7.6, 26.6, 8.8, 3.9, 2.8);
  rbox(f, TERRA_D, 25.2, 7.4, 26.8, 9.0, 6.7, 0.25);
  rsolid(f, ...CL);
  const cl = face(f, 'S', 21, 14);
  door(cl, -1, 1.5, 2.4, GREEN, { split: true });
  for (const u of [-5.5, 3, 6.5]) win(cl, u, 1.75, 1.3, 1.4, { shutters: GREEN, flowers: true });
  board(cl, 'CASA LOLA · COMIDA CANARIA', -1, 3.22, 7.8, 0.72, { bg: '#fff8e6', fg: '#c0623a', scale: 0.66, backC: GREEN, border: '#2f8a4a' }); // [N] stands in for Grill Paco (§1.5)
  // Bougainvillea along the eave, above the pergola's camera cap (2.6), short of the name board.
  for (let k = 0; k < 9; k++) f.ico(BOUG, 13.3 + k * 0.3, 3.45 + Math.sin(k) * 0.12, 14.1, 0.6 + (k % 3) * 0.15);
  for (let k = 0; k < 5; k++) f.ico(BOUG, 28.9, CURB + 1.6 + k * 0.45, 5.0 + k * 1.6, 0.8);
  {
    for (const x of [12.2, 16.6, 25.4, 29.6]) for (const z of [15.0, 29.4]) { f.box(WOOD, x, CURB, z, 0.2, 2.75, 0.2); f.circ(x, z, 0.14, 99, 'pole'); }
    for (const z of [15.0, 29.4]) rbox(f, WOOD_D, 12.1, z - 0.11, 29.7, z + 0.11, 2.9, 0.18);
    for (const x of [12.2, 16.6, 21.0, 25.4, 29.6]) {
      rbox(f, WOOD, x - 0.08, 14.6, x + 0.08, 29.8, 3.08, 0.14);
      for (let k = 0; k < 7; k++) sph(f, k % 2 ? PALM : PALM2, x + R(-0.25, 0.25), 3.22, 15.8 + k * 2.2, 0.7, 0.32, 1.1);
      stringLights(f, [x, 3.0, 15.0], [x, 3.0, 29.4], 10, 0.35);
    }
    f.ceiling(20.9, 22.2, 17.6, 15.2, 2.9, 3.6);   // the chase camera stays under the beams
    for (const [x, z] of [[15.0, 19.0], [22.8, 18.2], [27.4, 20.2], [15.0, 25.6], [22.4, 27.0], [27.6, 27.2]]) cafeTable(f, x, z, { check: true, chairs: 4, chairC: 0x8a5a2a });
    for (const x of [12.25, 14.75, 17.25, 23.25, 25.75, 28.25]) f.prop('mur', x, 30.3, 0);
    for (const z of [16.25, 18.75, 26.25, 28.75]) f.prop('mur', 11.3, z, HP);
    standSign(f, 'MENÚ DEL DÍA\nPAPAS ARRUGADAS · MOJO\nPESCADO DEL DÍA · 350 PTA', 17.9, 15.9, 1.15, 1.8, 1.2, 0, { bg: '#1d1426', fg: '#fff8e6', scale: 0.62 }); // [N]
    f.prop('julgran', 13.6, 16.0);
    f.box(0x9a4a30, 28.0, CURB, 15.9, 1.4, 0.85, 0.9);
    f.box(DARK, 28.0, CURB + 0.85, 15.9, 1.3, 0.06, 0.8);
    f.box(0xff7a2a, 28.0, CURB + 0.88, 15.9, 1.1, 0.03, 0.6, 0, GL);
    f.solid(28.0, 15.9, 1.4, 0.9, CURB + 0.9, 'crate');
  }

  // Lottery kiosk and a taxi sign by the south road.
  f.cyl(0x2f8a4a, -13, CURB + 1.3, 25, 1.3, 2.6, 6);
  cone(f, RED, -13, CURB + 2.95, 25, 1.6, 0.7, 6);
  f.box(0xf7c31b, -13, CURB + 1.0, 26.15, 1.2, 1.0, 0.06);
  f.sign('LOTERÍA · PRENSA', -13, CURB + 2.25, 26.3, 2.0, 0.45, 0, { bg: '#fff8e6', fg: '#2f8a4a', border: null, scale: 0.7 }); // [N]
  f.circ(-13, 25, 1.35, 99, 'building');
  f.cyl(STEEL, -6, CURB + 1.4, 29.6, 0.05, 2.8, 6);
  f.circ(-6, 29.6, 0.08, 99, 'pole');
  f.sign('TAXI', -6, CURB + 3.0, 29.6, 0.9, 0.45, 0, { bg: '#1d1426', fg: '#f7c31b', border: null, scale: 0.8, double: true });
  f.prop('papelera', 4.0, 27.5);
  f.prop('vykort', -4.0, 27.5);
  palm(f, -27, 29, 1.0);
  palm(f, 6, 29.2, 1.0);
}

// Big plastic Christmas tree (lit baubles, star).
function xmasTree(f, x, z, h = 6) {
  const s = h / 6;
  f.cyl(RED, x, CURB + 0.35, z, 0.95 * s, 0.7, 12);
  f.cyl(WOOD, x, CURB + 0.9, z, 0.25, 0.6, 8);
  for (let k = 0; k < 4; k++) cone(f, 0x2f7a42, x, CURB + 1.75 + k * 1.05 * s, z, (2.0 - k * 0.42) * s, 1.9 * s, 12);
  for (let k = 0; k < 22; k++) {
    const t = k / 22, a = k * 2.4, rr = (1.8 - t * 1.5) * s, yy = CURB + 1.3 + t * 4.4 * s;
    sph(f, k % 2 ? 0xff3a2a : 0xffd23f, x + Math.cos(a) * rr, yy, z + Math.sin(a) * rr, 0.3 * s, 0.3 * s, 0.3 * s, GL);
  }
  f.ico(0xffe680, x, CURB + 1.7 + 4.25 * s, z, 0.75 * s, GL);
  f.circ(x, z, 1.5 * s, 99, 'tree');
}

// ---------------------------------------------------------------------------------------------
// (2,1) The market (marknad): rows of striped stalls, the souvenir stand with painted donkeys
//   (asnestand), plastic giraffes, bunting. pryl_kalkylator sits on the electronics stall K at
//   (-12, -8) (awning top 2.55): crate steps on its east side, or the bounce awning to its west.

function marknad(f) {
  rflat(f, 0xdcc394, -31, -31, 31, 31, CURB + 0.01);
  rflat(f, 0xe6d2a8, -4, -23.5, 4, 31, CURB + 0.02);
  rflat(f, 0xe6d2a8, -29, 11.5, 29, 15, CURB + 0.02);
  rflat(f, 0xe6d2a8, -29, -6, 17, 1, CURB + 0.02);
  const SCH = [[RED, WHITE2], [0x2f5a9a, WHITE2], [SUN, 0xf07a1e], [GREEN, WHITE2], [BOUG, 0xf4d0e0], [0x1e9aa0, WHITE2], [TERRA, CREAM]];
  const xs = [-24.5, -18.5, -12.5, -6.5, 6.5, 12.5, 18.5, 24.5];
  const rowA = ['fruit', 'hats', 'cloth', 'pots', 'spices', 'bags', 'shoes', 'fruit'];
  const rowA2 = ['flowers', 'sunglasses', 'tablecloths', 'pots', 'hats', 'fruit', 'spices', 'bags'];
  const rowC = ['pots', 'cloth', 'hats', 'spices', 'fruit', 'sunglasses', 'churros', 'flowers'];
  const SIGNS = { 0: 'FRUTAS', 3: 'CERÁMICA', 6: 'ZAPATOS' }; // [N]
  xs.forEach((x, k) => stall(f, x, -25.25, 5, 3.5, 1, { colors: SCH[k % 7], goods: rowA[k], sign: SIGNS[k] }));
  xs.forEach((x, k) => stall(f, x, -16.75, 5, 3.5, -1, { colors: SCH[(k + 3) % 7], goods: rowA2[k], sign: k === 4 ? 'SOMBREROS' : undefined }));
  xs.forEach((x, k) => stall(f, x, 9.75, 5, 3.5, 1, { colors: SCH[(k + 5) % 7], goods: rowC[k], sign: k === 6 ? 'CHURROS' : k === 3 ? 'ESPECIAS' : k === 1 ? 'BORDADOS' : undefined, signBg: '#f7c31b' }));
  stall(f, -24.5, -8, 5, 4, 1, { colors: SCH[4], goods: 'tablecloths', sign: 'MANTELES' });
  stall(f, 18.5, -8, 5, 4, 1, { colors: SCH[1], goods: 'fruit' });
  stall(f, 24.5, -8, 5, 4, 1, { colors: SCH[2], goods: 'pots' });

  // K: the electronics stall whose awning carries pryl_kalkylator (y 3.4 = 0.85 above the top).
  stall(f, -12, -8, 5, 4, 1, { colors: [0x2f5a9a, SUN], goods: 'radios', signLow: 'RELOJES · RADIOS · CALCULADORAS', signBg: '#2f5a9a', signFg: '#f7c31b' }); // [N]
  // Route 1: crate steps on K's east side (top 1.0 → 1.8 → awning 2.55).
  crate(f, -8.7, -5.1, 1.1, 0.85);
  crate(f, -8.7, -6.25, 1.1, 0.85);
  crate(f, -8.7, -6.25, 1.0, 0.8, CURB + 0.85);
  f.prop('tomatlada', -7.0, -4.3, 0.3);
  // Route 2: a low pottery shade whose taut canvas is a bounce pad (top 1.45).
  {
    const x = -18.5, z = -8, w = 5, d = 4, top = 1.45;
    for (const s of [-1, 1]) for (const t of [-1, 1]) f.box(WOOD, x + s * 2.4, CURB, z + t * 1.9, 0.12, top - CURB, 0.12);
    for (let k = 0; k < 8; k++) f.box(k % 2 ? WHITE2 : RED, x - w / 2 + (k + 0.5) * (w / 8), top - 0.1, z, w / 8, 0.1, d);
    rbox(f, 0x2f5a9a, x - 2.55, z - 2.05, x + 2.55, z + 2.05, top - 0.22, 0.12);
    for (let k = 0; k < 9; k++) {
      const px = x - 2 + (k % 3) * 2, pz = z - 1.3 + ((k / 3) | 0) * 1.3, c = [TERRA, 0xd07a4a, 0xe8d8b0][k % 3];
      if (k % 2) sph(f, c, px, CURB + 0.32, pz, 0.62, 0.6, 0.62); else f.cyl(c, px, CURB + 0.35, pz, 0.25, 0.7, 10);
    }
    f.solid(x, z, w, d, top, 'bounce');
    f.sign('¡SALTA!', x, top + 0.35, z + 2.0, 1.4, 0.45, 0, { bg: '#f7c31b', fg: '#d8321e', border: '#1d1426', scale: 0.7, double: true }); // [N]
    for (const s of [-1, 1]) f.box(WOOD, x + s * 0.6, top, z + 2.0, 0.06, 0.12, 0.06);
  }

  // The souvenir stand (asnestand at (6, 2): the seller stands at (6, 0.8) in front of it).
  stall(f, 6, -1.75, 9, 3.5, 1, { colors: [SUN, RED], goods: 'souvenir', top: 2.9 });
  f.sign('BURROS · 500 PTA', 6, 2.08, 0.44, 3.0, 0.48, 0, { bg: '#fff8e6', fg: '#d8321e', border: '#1d1426', scale: 0.7 }); // [N] §6.3
  standSign(f, 'BURROS\n500 PTA', 12.3, 0.5, 1.45, 1.3, 0.9, -0.3, { bg: '#f7c31b', fg: '#d8321e', scale: 0.7 }); // [N]
  f.sign('SOUVENIRS · RECUERDOS', 6, 3.35, -1.4, 5.6, 0.7, 0, { bg: '#d8321e', fg: '#fff8e6', border: '#f7c31b', scale: 0.62, double: true }); // [N]
  for (const s of [-1, 1]) f.box(WOOD, 6 + s * 2.4, 2.9, -1.4, 0.1, 0.12, 0.1);
  for (const [x, ly] of [[0.6, 0.5], [11.4, PI - 0.5]]) {
    f.box(0xe8dcc0, x, CURB, -0.8, 1.3, 0.3, 0.9);
    burro(f, x, CURB + 0.3, -0.8, 1.6, ly);
    f.solid(x, -0.8, 1.3, 0.9, 99, 'solid');
  }
  for (const [x, z, s, ly] of [[12.9, -2.4, 1.0, -2.2], [13.9, -1.6, 1.15, -2.5], [14.9, -2.7, 0.9, -2.0]]) giraffe(f, x, z, s, ly);
  f.prop('vykort', -0.8, 1.6, PI);
  f.prop('vykort', 13.6, 0.4, PI);

  // Gate, bunting, edges.
  for (const s of [-1, 1]) {
    rbox(f, WHITE, s * 6.6 - 0.35, 28.85, s * 6.6 + 0.35, 29.55, CURB, 6.4);
    rbox(f, TERRA, s * 6.6 - 0.45, 28.75, s * 6.6 + 0.45, 29.65, CURB + 6.4, 0.3);
    rbox(f, TERRA, s * 6.6 - 0.42, 28.78, s * 6.6 + 0.42, 29.62, CURB, 0.5);
    rsolid(f, s * 6.6 - 0.35, 28.85, s * 6.6 + 0.35, 29.55);
    f.cyl(STEEL, s * 3.6, CURB + 2.3, -14.6, 0.07, 4.6, 6);
    f.circ(s * 3.6, -14.6, 0.1, 99, 'pole');
    bunting(f, [s * 6.6, 5.2, 29.2], [s * 3.6, 4.55, -14.6], 60, 0.9);
  }
  bunting(f, [-6.6, 6.5, 29.2], [6.6, 6.5, 29.2], 18, 0.9);
  standSign(f, 'MERCADILLO · MARKNAD', -12.5, 29.6, 2.9, 6.2, 1.1, 0, { bg: '#d8321e', fg: '#fff8e6', border: '#f7c31b', scale: 0.62, backC: WOOD_D }); // [N]
  standSign(f, 'LUNES A SÁBADO · 9–14', 12.5, 29.6, 1.6, 3.0, 0.6, 0, { bg: '#fff8e6', fg: '#1d1426', scale: 0.62 }); // [N]
  for (const z of [20, 4, -12]) bunting(f, [-4.6, 4.6, z], [4.6, 4.6, z], 12, 0.5);
  f.car('van', -26.2, 23.0, PI, { color: 0xe8e0c8 });
  for (const [x, z] of [[-28.2, -20.6], [28.2, -20.6], [-28.6, 14.6], [28.4, 14.6], [-28.3, -12.4]]) f.prop('tomatlada', x, z, R(0, 1));
  f.prop('butano', 26.9, 12.5);
  f.prop('papelera', -7.6, 27.8);
  f.prop('papelera', 7.6, 27.8);
  for (const x of [-24, -18, 18, 24]) palm(f, x, 28.0, R(0.9, 1.05));
}

// ---------------------------------------------------------------------------------------------
// (3,1) Templo Ecuménico: white rationalist church with a great sloping roof, a freestanding bell
//   slab, a palm plaza with a crèche (belén) and a small fountain; the sisters' sign [F*].

function kyrka(f) {
  rflat(f, 0xece4d2, -31, -31, 31, 31, CURB + 0.01);
  for (let z = 7; z <= 30; z += 4) rflat(f, 0xd9c49a, -29, z - 0.2, 29, z + 0.2, CURB + 0.02);
  rflat(f, 0xe2d2b0, -3.2, 1, 3.2, 31, CURB + 0.022);
  rflat(f, 0xc9a26b, -31, -31, -14, -2, CURB + 0.02);

  // Nave: walls 7.5 m at the entrance rising to 16 m at the back (one monopitch wedge roof).
  const NV = [-12, -26, 12, 1], H0 = 7.5, HR = 8.5, D = NV[3] - NV[1];
  rbox(f, WHITE2, ...NV, CURB, H0 - CURB);
  geo(f, makeWedge(), WHITE2, 0, H0, (NV[1] + NV[3]) / 2, 24, HR, D, PI);
  const ang = Math.atan2(HR, D), L = Math.hypot(HR, D) + 1.6;
  f.boxC(0xb9c2cc, 0, H0 + HR / 2 + 0.3, (NV[1] + NV[3]) / 2, 25.4, 0.35, L, 0, ang);
  rbox(f, 0xd8d0c0, -12.05, -26.05, 12.05, 1.05, CURB, 0.55);
  rsolid(f, ...NV);
  // Stained-glass slots down both side walls (lit at night).
  const SG = [0x2f6ad8, 0xd8321e, 0xf7c31b, 0x2fa05a, 0x8a4ad8];
  for (let k = 0; k < 6; k++) {
    const z = -22.5 + k * 4.0, hz = H0 + HR * (NV[3] - z) / D;
    for (const s of [-1, 1]) {
      f.box(SG[k % 5], s * 12.05, 1.3, z, 0.1, hz - 2.6, 0.55, 0, GL);
      f.box(WHITE, s * 12.08, 1.3 + (hz - 2.6) * 0.5, z, 0.08, 0.08, 0.6, 0, f.F);
    }
  }
  // Entrance: flat portico on two slim pillars, doors, relief cross, coloured slots.
  rbox(f, WHITE2, -6.6, 1, 6.6, 6.5, 4.0, 0.8);
  for (const s of [-1, 1]) { f.cyl(WHITE2, s * 6.0, CURB + 1.93, 5.9, 0.22, 3.85, 10); f.circ(s * 6.0, 5.9, 0.25, 99, 'pole'); }
  f.ceiling(0, 3.75, 13.2, 5.5, 4.0, 4.8);   // the chase camera stays under the portico
  f.sign('TEMPLO ECUMÉNICO', 0, 4.4, 6.53, 11.6, 0.66, 0, { bg: '#fbf7ef', fg: '#2f5a9a', border: null, scale: 0.72 });
  const ef = face(f, 'S', 0, 1);
  door(ef, 0, 3.2, 3.4, WOOD, { split: true, trim: 0xd8d0c0 });
  for (let k = 0; k < 6; k++) ef.box(WOOD_D, -1.4 + k * 0.56, CURB, 0.13, 0.04, 3.4, 0.02, 0, f.F);
  ef.boxC(0xd8d2c6, 0, 6.15, 0.08, 0.5, 2.5, 0.16);
  ef.boxC(0xd8d2c6, 0, 6.6, 0.08, 1.6, 0.48, 0.16);
  [-3.4, -2.6, 2.6, 3.4].forEach((u, k) => ef.box(SG[k + 1], u, 4.95, 0.06, 0.32, 2.2, 0.08, 0, GL));
  [-9, -5.5, 5.5, 9].forEach((u, k) => ef.box(SG[(k + 2) % 5], u, 1.2, 0.06, 0.4, 2.5, 0.08, 0, GL));

  // The bell slab: two tall white slabs, beams, two bells, a cross on top.
  const bx = 18, bzc = -10;
  for (const s of [-1, 1]) rbox(f, WHITE2, bx + s * 1.5 - 0.3, bzc - 1.6, bx + s * 1.5 + 0.3, bzc + 1.6, CURB, 17.2 - CURB);
  for (const y of [CURB, 6.0, 10.4, 14.6, 16.8]) rbox(f, WHITE2, bx - 1.2, bzc - 1.6, bx + 1.2, bzc + 1.6, y, 0.45);
  for (const y of [8.4, 12.6]) {
    f.cyl(BRONZE, bx, y - 0.2, bzc, 0.6, 0.9, 14);
    sph(f, BRONZE, bx, y + 0.25, bzc, 1.2, 0.7, 1.2, f.S, 12);
    f.cyl(0x7a5a2a, bx, y - 0.75, bzc, 0.66, 0.12, 14);
    sph(f, DARK, bx, y - 0.85, bzc, 0.22);
    f.box(WOOD_D, bx, y + 0.55, bzc, 2.4, 0.2, 0.25);
  }
  f.box(WHITE2, bx, 17.25, bzc, 0.32, 3.0, 0.32);
  f.boxC(WHITE2, bx, 19.3, bzc, 1.7, 0.3, 0.32);
  rsolid(f, bx - 1.8, bzc - 1.6, bx + 1.8, bzc + 1.6);

  // Palm plaza, signs, julgranar, benches, lanterns.
  for (const [x, z, t] of [[-9.5, 10, true], [9.5, 10, false], [-9.5, 23, false], [9.5, 23, true], [24, 4, false], [-25, 24, false]]) {
    disc(f, 0x9a7a52, x, z, 1.1, CURB + 0.03, 14);
    palm(f, x, z, R(1.0, 1.15), { tinsel: t });
  }
  standSign(f, 'ES UNA IGLESIA\nDet är en kyrka.', -6.4, 9.6, 1.35, 3.0, 1.2, 0, { bg: '#fbf7ef', fg: '#2f5a9a', backC: 0xd8d0c0, scale: 0.6 }); // [F*] the sisters' language record, relocated
  standSign(f, 'MISA 10.00\nGUDSTJÄNST 11.30', 6.4, 9.6, 1.35, 3.0, 1.0, 0, { bg: '#fbf7ef', fg: '#1d1426', backC: 0xd8d0c0, scale: 0.55 }); // [N]
  f.prop('julgran', -4.4, 7.2);
  f.prop('julgran', 4.4, 7.2);
  for (const [x, z, y] of [[-14, 7.5, 0], [14, 7.5, 0], [-14, 20.5, 0], [-4.8, 27.5, 0]]) f.prop('bank', x, z, y);
  f.prop('papelera', 4.5, 27.4);
  lantern(f, -12.5, 14.5, 4.0, 0);
  lantern(f, 12.5, 14.5, 4.0, 0);

  // Crèche (belén) with the holy family, ox and donkey, two sheep, a lit star.
  {
    const x = -18, z = 14.5;
    rflat(f, 0xd8b860, x - 2.6, z - 1.3, x + 2.6, z + 1.3, CURB + 0.03);
    f.box(WOOD, x, CURB, z - 1.25, 5.0, 2.4, 0.2);
    for (const s of [-1, 1]) for (const t of [-1.2, 1.2]) f.box(WOOD_D, x + s * 2.4, CURB, z + t, 0.2, 2.4, 0.2);
    f.roof(0xc8a050, x, CURB + 2.4, z, 5.8, 1.2, 3.2);
    figure(f, x - 0.8, z + 0.1, 0x2f5aa8, 1.0, 0x8ab0e8);
    figure(f, x + 0.9, z, 0x8a5a3a, 1.08, 0x6a4a2a);
    f.boxC(WOOD_D, x + 1.25, CURB + 0.9, z + 0.1, 0.06, 1.8, 0.06);
    f.box(WOOD, x, CURB, z + 0.6, 0.9, 0.42, 0.5);
    f.box(0xe8c860, x, CURB + 0.42, z + 0.6, 0.8, 0.08, 0.42);
    sph(f, 0xfbf7ef, x, CURB + 0.55, z + 0.6, 0.42, 0.22, 0.24);
    sph(f, SKIN, x + 0.18, CURB + 0.6, z + 0.6, 0.16);
    burro(f, x + 1.8, CURB, z - 0.6, 1.5, PI - 0.3, { painted: false, saddle: 0x7a7068, c: 0x8a847c });
    f.box(0x7a4a2a, x - 1.85, CURB + 0.45, z - 0.55, 0.9, 0.55, 0.5);
    f.box(0x7a4a2a, x - 1.25, CURB + 0.6, z - 0.55, 0.38, 0.32, 0.34);
    for (const s of [-1, 1]) f.boxC(0xe8e0c8, x - 1.18, CURB + 0.86, z - 0.55 + s * 0.18, 0.05, 0.2, 0.05, 0, s * 0.6);
    for (const [sx, sz] of [[2.1, 1.9], [-2.2, 2.0]]) { f.ico(0xfbf7ef, x + sx, CURB + 0.35, z + sz, 0.7); sph(f, DARK, x + sx + 0.32, CURB + 0.45, z + sz, 0.22); }
    f.ico(0xffe680, x, CURB + 4.15, z + 0.2, 0.7, GL);
    f.box(WOOD_D, x, CURB + 0.38, z + 2.6, 5.6, 0.1, 0.08);
    for (let k = 0; k < 6; k++) f.box(WOOD_D, x - 2.75 + k * 1.1, CURB, z + 2.6, 0.1, 0.55, 0.1);
    f.box(WOOD_D, x, CURB + 0.6, z + 2.62, 2.3, 0.6, 0.04);
    f.sign('BELÉN · JULKRUBBA', x, CURB + 0.9, z + 2.66, 2.2, 0.4, 0, { bg: '#fbf7ef', fg: '#8a3a1a', border: null, scale: 0.7 }); // [N]
    rsolid(f, x - 2.6, z - 1.4, x + 2.6, z + 2.7, 99, 'stall');
  }
  // Small fountain on the east of the plaza.
  {
    const x = 17, z = 18;
    f.cyl(WHITE2, x, CURB + 0.3, z, 1.9, 0.6, 16);
    f.F.cyl(SEA, f.wx(x, z), CURB + 0.62, f.wz(x, z), 1.68, 0.03, 16);
    f.cyl(WHITE2, x, CURB + 1.0, z, 0.2, 1.4, 8);
    f.cyl(WHITE2, x, CURB + 1.7, z, 0.6, 0.14, 12);
    f.cyl(0x9ad8f4, x, CURB + 2.1, z, 0.05, 0.6, 6);
    f.circ(x, z, 1.9, CURB + 0.75, 'solid');
  }
  // Garden of agaves, cardón and red rocks on the west; a few on the east.
  for (const [x, z] of [[-17, -22], [-26, -24], [-18, -7], [-27, -5], [-22, -15], [-15.5, -14], [22, -2], [26, -20], [14.5, -24]]) agave(f, x, z, R(0.9, 1.3));
  cardon(f, -21, -20.5, 1.2);
  cardon(f, -25, -10, 1.0);
  cardon(f, 25.5, -26, 1.1);
  for (const [x, z] of [[-19.5, -11], [-28, -16], [-16, -26.5], [-23.5, -3.5], [27, -10]]) rock(f, x, z, R(0.8, 1.4));
}

// ---------------------------------------------------------------------------------------------
// (4,3) Gasolina: canopy over two pump islands (explosive gaspump props), shop, workshop bays,
//   the price totem by the road.

function bensin(f) {
  rflat(f, 0xc4beb2, -31, -31, 31, 31, CURB + 0.01);
  rflat(f, LOT, -31, 12.5, 31, 31, CURB + 0.015);
  rflat(f, 0xa8a49a, -31, -1.5, -11.5, 12.5, CURB + 0.015);
  for (let k = 0; k < 6; k++) f.flat(0xf4f4f0, -16 + k * 6.4, 20.5, 2.6, 0.18, CURB + 0.025);
  for (const x of [-4.5, 4.5]) f.flat(0xf4f4f0, x, 14.5, 0.25, 3.2, CURB + 0.025);
  for (let k = 0; k < 7; k++) { const x = R(-8, 8), z = R(2, 9); f.F.cyl(0x4a4640, f.wx(x, z), CURB + 0.02, f.wz(x, z), R(0.3, 0.7), 0.01, 10); }

  // Canopy: four posts, white slab, orange fascia, lights underneath, GASOLINA on both long sides.
  for (const [x, z] of [[-8.5, 1.5], [8.5, 1.5], [-8.5, 8.5], [8.5, 8.5]]) { f.box(WHITE2, x, CURB, z, 0.5, 5.0 - CURB, 0.5); f.box(0xf07a1e, x, CURB, z, 0.54, 0.6, 0.54); f.solid(x, z, 0.55, 0.55, 99, 'pole'); }
  rbox(f, WHITE2, -11, -1, 11, 11, 5.0, 0.3);
  rbox(f, 0xf07a1e, -11.1, -1.1, 11.1, 11.1, 5.3, 0.55);
  rbox(f, WHITE2, -11.15, -1.15, 11.15, 11.15, 5.85, 0.12);
  for (const x of [-6, 0, 6]) for (const z of [1.5, 5, 8.5]) f.box(0xfff8dc, x, 4.96, z, 2.4, 0.04, 0.5, 0, GL);
  // Camera ceilings: the chase eye stays under the pump canopy, the shop canopy and the workshop bays.
  f.ceiling(0, 5, 22.3, 12.3, 5.0, 6.0);
  const gopt = { bg: '#f07a1e', fg: '#fff8e6', border: null, scale: 0.92 };
  f.sign('GASOLINA', 0, 5.575, 11.13, 9, 0.5, 0, gopt); // §1.5 no brand
  f.sign('GASOLINA', 0, 5.575, -1.13, 9, 0.5, PI, gopt);
  f.sign('SÚPER · NORMAL · GASÓLEO', 11.13, 5.575, 5, 9, 0.5, HP, { ...gopt, scale: 0.85 }); // [N]
  f.sign('SÚPER · NORMAL · GASÓLEO', -11.13, 5.575, 5, 9, 0.5, -HP, { ...gopt, scale: 0.85 });
  // Pump islands (low kerbs, a floor for cars) with two pumps each.
  for (const x of [-4.5, 4.5]) {
    rbox(f, 0xd8d4c8, x - 0.7, 1.2, x + 0.7, 8.8, CURB, 0.22);
    for (let k = 0; k < 8; k++) f.box(k % 2 ? DARK : SUN, x, CURB, 1.2 + k * 0.95 + 0.48, 1.42, 0.22, 0.95, 0, f.F);
    rsolid(f, x - 0.7, 1.2, x + 0.7, 8.8, CURB + 0.22, 'curb');
    f.prop('gaspump', x, 3.0, 0, CURB + 0.22);
    f.prop('gaspump', x, 7.0, PI, CURB + 0.22);
    f.box(STEEL, x, CURB + 0.22, 5.0, 0.5, 0.9, 0.35);
    f.box(0x2f8ad8, x, CURB + 1.12, 5.0, 0.42, 0.18, 0.3);
  }
  // Air and water post.
  f.box(0x2f8ad8, 12.6, CURB, 4.5, 0.5, 1.4, 0.4);
  f.cyl(WHITE2, 12.6, CURB + 1.15, 4.73, 0.17, 0.06, 12, HP);
  f.solid(12.6, 4.5, 0.5, 0.4, 99, 'pole');
  standSign(f, 'AIRE · AGUA', 12.6, 3.7, 1.95, 1.4, 0.4, HP, { bg: '#2f8ad8', fg: '#ffffff', legs: [0] }); // [N]

  // Shop with a canopy: TIENDA · BAR · HIELO, a REFRESCOS machine and a rack of butano bottles.
  const SH = [-14, -26, 2, -13];
  rbox(f, WHITE, ...SH, CURB, 4.8 - CURB);
  rbox(f, 0xf07a1e, -14.1, -26.1, 2.1, -12.9, 4.4, 0.4);
  rsolid(f, ...SH);
  rbox(f, WHITE2, -14.4, -13, 2.4, -10.9, 3.4, 0.25);
  for (const x of [-14, 2]) { f.cyl(STEEL, x, CURB + 1.63, -11.2, 0.08, 3.26, 6); f.circ(x, -11.2, 0.1, 99, 'pole'); }
  f.ceiling(-6, -11.95, 16.8, 2.1, 3.4, 3.7);
  const sh = face(f, 'S', -6, -13);
  shopGlass(sh, 0, 15, { doorAt: -3, glass: GLASS, frame: 0x3a3a42 });
  board(sh, 'TIENDA · BAR · HIELO', 0, 4.05, 9, 0.6, { bg: '#fff8e6', fg: '#d8321e', scale: 0.72, back: false }); // [N]
  sh.sign('HELADOS · REFRESCOS · KVÄLLSTIDNINGAR', 3.5, 2.3, 0.12, 5, 0.45, 0, { bg: '#f7c31b', fg: '#1d1426', border: null, scale: 0.7 }); // [N]
  f.prop('automat', 3.1, -14.0, 0);
  f.prop('papelera', -15.0, -11.5);
  rbox(f, WOOD, -13.6, -10.8, -9.4, -9.9, CURB, 0.12);
  for (let k = 0; k < 5; k++) f.prop('butano', -13.1 + k * 0.85, -10.35, 0, CURB + 0.12);
  for (const x of [-13.7, -9.3]) f.box(STEEL, x, CURB, -10.35, 0.05, 1.2, 0.95, 0, f.F);
  f.box(STEEL, -11.5, CURB + 1.2, -10.35, 4.45, 0.05, 0.95, 0, f.F);
  f.sign('BUTANO', -11.5, CURB + 1.5, -9.85, 1.6, 0.4, 0, { bg: '#f07a1e', fg: '#fff8e6', border: null, scale: 0.8 });

  // Workshop with two open bays: TALLER · NEUMÁTICOS · LAVADO.
  const WC = 0xe8e2d4, TOPW = 5.0;
  rbox(f, WC, 6, -28, 28, -17, CURB, TOPW - CURB);
  rsolid(f, 6, -28, 28, -17);
  for (const [a, b] of [[6, 8.5], [14, 15.5], [21, 28]]) {
    rbox(f, WC, a, -17, b, -12, CURB, TOPW - CURB);
    rsolid(f, a, -17, b, -12);
    for (let k = 0; k < 6; k++) f.box(k % 2 ? RED : WHITE2, (a + b) / 2, CURB + k * 0.3, -11.96, b - a - 0.1, 0.3, 0.04, 0, f.F);
  }
  rbox(f, WC, 8.5, -17, 21, -12, 4.0, TOPW - 4.0);
  f.ceiling(14.75, -14.5, 12.5, 5, 4.0, TOPW);
  rbox(f, 0x3a3a42, 8.5, -17.05, 21, -16.95, CURB, 3.85);
  for (const [a, b] of [[8.5, 14], [15.5, 21]]) rbox(f, 0x9aa0a8, a + 0.1, -12.45, b - 0.1, -12.1, 3.5, 0.5);
  rbox(f, 0x2f5a9a, 5.9, -28.1, 28.1, -11.9, TOPW - 0.3, 0.3);
  board(face(f, 'S', 14.75, -12), 'TALLER · NEUMÁTICOS · LAVADO', 0, 4.4, 12, 0.6, { bg: '#2f5a9a', fg: '#ffffff', scale: 0.7, back: false, z: 0.14 }); // [N]
  for (let k = 0; k < 6; k++) f.box(pickR([RED, SUN, BLUE, STEEL]), 9.3 + k * 0.8, 1.3, -16.9, 0.5, 0.7, 0.05, 0, f.F);
  f.F.cyl(0x26262a, f.wx(11, -14.6), CURB + 0.02, f.wz(11, -14.6), 1.1, 0.01, 12);
  const tires = (x, z, n) => {
    for (let k = 0; k < n; k++) { f.cyl(0x26262a, x, CURB + 0.14 + k * 0.28, z, 0.42, 0.26, 12); f.cyl(0x8a8a90, x, CURB + 0.275 + k * 0.28, z, 0.2, 0.01, 10, 0, 0, f.F); }
    f.circ(x, z, 0.44, CURB + n * 0.28, 'crate');
  };
  tires(10.0, -15.9, 4); tires(12.8, -16.0, 3); tires(24.0, -10.8, 5); tires(25.1, -10.4, 2);
  for (const [x, z] of [[16.6, -15.9], [19.8, -16.0], [17.6, -15.9]]) { f.cyl(0x2f5a9a, x, CURB + 0.45, z, 0.32, 0.9, 10); f.circ(x, z, 0.33, CURB + 0.9, 'crate'); }
  f.car('hatch', 24.5, -7.0, HP, { color: 0xc8a03a });
  f.prop('kon', 7.4, -10.4);
  f.prop('kon', 13.8, -10.6);

  // The price totem by the road.
  f.box(STEEL, 26.5, CURB, 26, 0.45, 3.1, 0.45);
  f.box(0xf07a1e, 26.5, 3.1, 26, 3.4, 3.8, 0.4);
  for (const [z, ly] of [[26.22, 0], [25.78, PI]]) {
    f.sign('GASOLINA', 26.5, 6.3, z, 3.1, 0.8, ly, { bg: '#fff8e6', fg: '#f07a1e', border: null, scale: 0.8 });
    f.sign('SÚPER  47\nNORMAL 43\nPTA / LITRO', 26.5, 4.35, z, 3.0, 2.2, ly, { bg: '#1d1426', fg: '#ffd23f', border: null, scale: 0.72 }); // [N] invented 1979 prices
  }
  f.solid(26.5, 26, 0.5, 0.5, 99, 'pole');

  palmPot(f, -27.4, 27.4, 1.0, { tinsel: true });
  palmPot(f, -27.4, 6, 0.95);
  palmPot(f, 27.6, 10.5, 1.0);
  agave(f, 28.5, -6, 1.1);
  agave(f, -28.5, -20, 1.0);
  f.car('pickup', -22.5, -20.0, 0, { color: 0x8a6a4a });
  f.prop('papelera', 9.8, 10.6);
}

// ---------------------------------------------------------------------------------------------
// (5,3) Casa Cuartel of the Guardia Civil: ochre U-shaped barracks behind a walled parade ground,
//   red-yellow-red flag on a mast, sentry box, the two parked green jeeps guardia1 / guardia2.

function guardia(f) {
  rflat(f, 0xd8c49a, -31, -31, 31, 31, CURB + 0.01);
  const MX = 4.6;   // the flag mast stands beside the path, not on the axis to the CASA CUARTEL plaque
  rflat(f, 0xeadfc6, -2.4, -8, 2.4, 29, CURB + 0.02);
  disc(f, 0xeadfc6, MX, 14, 2.2, CURB + 0.025, 24);
  for (const x of [-7.2, 7.2]) for (const s of [-1, 1]) rflat(f, LINE, x + s * 1.35 - 0.06, 5.6, x + s * 1.35 + 0.06, 10.6, CURB + 0.03);

  // Walls round the compound, gate in the south side.
  const wall = (x0, z0, x1, z1) => { rbox(f, OCHRE, x0, z0, x1, z1, CURB, 2.15); rbox(f, WHITE2, x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05, 2.3, 0.14); rsolid(f, x0, z0, x1, z1, 2.45, 'wall'); };
  wall(-30.6, 28.4, -6.0, 29.0); wall(6.0, 28.4, 30.6, 29.0);
  wall(-30.6, -30.6, -30.0, 28.4); wall(30.0, -30.6, 30.6, 28.4); wall(-30.0, -30.6, 30.0, -30.0);
  for (const s of [-1, 1]) {
    const x = s * 6.6;
    rbox(f, OCHRE_D, x - 0.6, 28.1, x + 0.6, 29.3, CURB, 3.0);
    rbox(f, WHITE2, x - 0.7, 28.0, x + 0.7, 29.4, 3.15, 0.22);
    f.box(0xffe6a0, x, 3.37, 28.7, 0.36, 0.5, 0.36, 0, GL);
    cone(f, DARK, x, 4.0, 28.7, 0.32, 0.3, 4, PI / 4);
    rsolid(f, x - 0.6, 28.1, x + 0.6, 29.3);
    f.box(DARK, x - s * 0.62, CURB, 26.9, 0.06, 2.0, 2.6);
    for (let k = 0; k < 9; k++) f.box(DARK, x - s * 0.62, CURB, 25.75 + k * 0.29, 0.04, 2.0, 0.03, 0, f.F);
    f.sign('GUARDIA CIVIL', x, 2.2, 29.33, 1.1, 0.4, 0, { bg: '#fbf7ef', fg: '#2e5e3e', border: null, scale: 0.62 });
  }
  // Sentry box.
  rbox(f, OCHRE, 8.8, 25.3, 10.3, 26.8, CURB, 2.5);
  for (let k = 0; k < 4; k++) rbox(f, k % 2 ? SUN : RED, 8.75, 25.25, 10.35, 26.85, CURB + 0.3 + k * 0.12, 0.12);
  f.roof(RED, 9.55, 2.65, 26.05, 2.0, 0.6, 2.0);
  f.box(DARK, 9.55, CURB, 26.83, 0.8, 2.0, 0.04);
  rsolid(f, 8.8, 25.3, 10.3, 26.8);

  // Barracks: main block plus two forward wings, tile roofs, white quoins and green shutters.
  const TOPB = 7.6;
  for (const r of [[-22, -27, 22, -8], [-22, -8, -13, 6], [13, -8, 22, 6]]) {
    rbox(f, OCHRE, ...r, CURB, TOPB - CURB);
    rbox(f, 0xa89a88, r[0] - 0.06, r[1] - 0.06, r[2] + 0.06, r[3] + 0.06, CURB, 0.8);
    rbox(f, WHITE2, r[0] - 0.12, r[1] - 0.12, r[2] + 0.12, r[3] + 0.12, TOPB - 0.35, 0.35);
    rbox(f, WHITE2, r[0] - 0.08, r[1] - 0.08, r[2] + 0.08, r[3] + 0.08, 3.6, 0.2);
    rsolid(f, ...r);
  }
  f.roof(TERRA, 0, TOPB, -17.5, 45, 2.8, 20.2);
  f.roof(TERRA, -17.5, TOPB, -0.5, 15.6, 2.4, 9.8, HP);
  f.roof(TERRA, 17.5, TOPB, -0.5, 15.6, 2.4, 9.8, HP);
  for (const [x, z] of [[-22, -27], [22, -27], [-22, 6], [22, 6], [-13, 6], [13, 6]]) for (let k = 0; k < 7; k++) f.box(WHITE2, x, CURB + 0.9 + k * 0.95, z, 0.75, 0.45, 0.75);
  const sh = { shutters: GUARDIA, trim: WHITE2 };
  const mf = face(f, 'S', 0, -8);
  for (const u of [-10.3, -6.9, 6.9, 10.3]) { win(mf, u, 1.95, 1.2, 1.7, sh); win(mf, u, 5.35, 1.2, 1.7, { ...sh, flowers: true }); }
  mf.box(0xe8e0cc, 0, CURB, 0.03, 3.3, 4.0, 0.08);
  door(mf, 0, 2.2, 2.6, GUARDIA, { arch: true, split: true, trim: WHITE2, z: 0.04 });
  mf.box(WHITE2, 0, 4.1, 0.4, 3.6, 0.14, 0.8);
  for (let b = 0; b < 12; b++) mf.box(DARK, -1.65 + b * 0.3, 4.24, 0.78, 0.03, 0.8, 0.03, 0, f.F);
  mf.box(DARK, 0, 5.02, 0.78, 3.4, 0.05, 0.05, 0, f.F);
  board(mf, 'CASA CUARTEL\nGUARDIA CIVIL', 0, 5.9, 5.8, 1.15, { bg: '#fbf7ef', fg: '#2e5e3e', scale: 0.66, backC: WHITE2, z: 0.1 });
  for (const s of [-1, 1]) {
    const wf = face(f, 'S', s * 17.5, 6);
    for (const u of [-2.4, 2.4]) { win(wf, u, 1.95, 1.2, 1.7, sh); win(wf, u, 5.35, 1.2, 1.7, sh); }
    const inn = face(f, s < 0 ? 'E' : 'W', s * 13, -1);
    for (const u of [-3.6, 0, 3.6]) { win(inn, u, 1.95, 1.2, 1.7, sh); win(inn, u, 5.35, 1.2, 1.7, sh); }
    const out = face(f, s < 0 ? 'W' : 'E', s * 22, -10.5);
    for (let u = -13.5; u <= 13.51; u += 3.4) { win(out, u, 1.95, 1.2, 1.7, sh); win(out, u, 5.35, 1.2, 1.7, sh); }
  }
  const bk = face(f, 'N', 0, -27);
  for (let u = -19.5; u <= 19.51; u += 3.25) { win(bk, u, 1.95, 1.2, 1.7, sh); win(bk, u, 5.35, 1.2, 1.7, sh); }

  // Flag mast with the red-yellow-red flag (a slight wave in three slices).
  rbox(f, 0xd8d0c0, MX - 0.7, 13.3, MX + 0.7, 14.7, CURB, 0.4);
  f.solid(MX, 14, 1.4, 1.4, CURB + 0.4, 'curb');
  f.cyl(WHITE2, MX, CURB + 5.9, 14, 0.1, 11.0, 8);
  sph(f, 0xd8a040, MX, CURB + 11.5, 14, 0.3);
  f.circ(MX, 14, 0.14, 99, 'pole');
  for (let k = 0; k < 3; k++) {
    const x = MX + 0.6 + k * 1.0, z = 14 + Math.sin(k * 1.4) * 0.18, ly = Math.cos(k * 1.4) * 0.22;
    f.boxC(0xc8202a, x, 10.25, z, 1.02, 2.0, 0.05, ly);
    f.boxC(SUN, x, 10.25, z, 1.02, 1.0, 0.07, ly, 0, 0, f.F);
  }
  // The two parked jeeps (locked, DESIGN §6.3) facing the gate; benches, pots, palms, lanterns.
  f.car('guardia', -7.2, 8.1, 0, { name: 'guardia1', locked: true });
  f.car('guardia', 7.2, 8.1, 0, { name: 'guardia2', locked: true });
  for (const s of [-1, 1]) {
    f.prop('bank', s * 4.2, -6.6, 0);
    f.cyl(TERRA, s * 2.4, CURB + 0.3, -7.3, 0.35, 0.6, 10);
    f.ico(0xd8321e, s * 2.4, CURB + 0.85, -7.3, 0.6);
    f.circ(s * 2.4, -7.3, 0.36, CURB + 0.6, 'planter');
    palm(f, s * 5.2, 23.4, 1.0);
    lantern(f, s * 3.4, 9.2, 4.0, 0);
  }
  f.prop('papelera', 12.2, 27.6);
}

export const BUILDERS = {
  kasbah: block(kasbah),
  cita: block(cita),
  plaza: block(plaza),
  marknad: block(marknad),
  kyrka: block(kyrka),
  bensin: block(bensin),
  guardia: block(guardia),
};
