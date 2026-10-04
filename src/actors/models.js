// Characters built from coloured primitives: oversized heads, big mouths that flap when they talk,
// hormone monsters with horns and fur, a ghost and a wizard. Animated procedurally.

import { THREE, GeoBuilder, toonMesh, MAT, mat, PRIM } from '../gfx.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32, pick } from '../util.js';

export const CHARS = {
  nick: { name: 'Nick', kind: 'kid', scale: 0.92, skin: 0xf7cfb0, hair: 'swoop', hairC: 0xc4733a, shirt: 0x4a9ad6, stripe: 0xf2f2f2, pants: 0x34445e, shoes: 0xd8321e, nose: 'button', brows: 0xa05a2a, freckles: true, voice: 430 },
  andrew: { name: 'Andrew', kind: 'kid', scale: 1.07, skin: 0xf2c39e, hair: 'curly', hairC: 0x2a1a12, glasses: 0x2a2a2a, shirt: 0x6f8f4f, pants: 0x6a5a4a, shoes: 0x8a5a3a, nose: 'big', brows: 0x2a1a12, voice: 290 },
  jessi: { name: 'Jessi', kind: 'kid', scale: 0.95, skin: 0xf3c6a4, hair: 'curlyLong', hairC: 0x6a3a1e, glasses: 0x8a3aa0, shirt: 0xffc83a, pants: 0x3a4a8a, shoes: 0xffffff, nose: 'small', brows: 0x5a2a12, voice: 480 },
  jay: { name: 'Jay', kind: 'kid', scale: 0.97, skin: 0xe6b08a, hair: 'slick', hairC: 0x15100c, shirt: 0x2a2a2a, pants: 0x2a2a3a, shoes: 0x222222, nose: 'pointy', brows: 0x15100c, cape: 0x9a1a2e, voice: 330 },
  steve: { name: 'Coach Steve', kind: 'adult', scale: 1.0, skin: 0xf6d2b4, hair: 'balding', hairC: 0xe8d27a, shirt: 0x2f5fb3, pants: 0xeeeeee, shorts: true, shoes: 0xffffff, nose: 'long', ears: 'big', whistle: true, brows: 0xd8c27a, voice: 540 },
  maurice: { name: 'Maurice', kind: 'monster', scale: 1.0, fur: 0x6f6aa6, fur2: 0x8d89c4, horn: 0xe8dcc0, noseC: 0xb07ab0, eyeC: 0xfff2a0, beard: true, voice: 140 },
  connie: { name: 'Connie', kind: 'monster', scale: 0.96, fur: 0xc883b6, fur2: 0xe8a8d0, horn: 0xf2e8d0, noseC: 0x9a4a7a, eyeC: 0xfff6c0, bigHair: 0x1d1426, earrings: 0xf2c12e, lashes: true, voice: 230 },
  duke: { name: 'Duke Ellington', kind: 'ghost', scale: 1.0, skin: 0xb7e2fa, hair: 'slick', hairC: 0x5a8ab8, shirt: 0x4a7ab8, pants: 0x4a7ab8, nose: 'small', mustache: 0x5a8ab8, brows: 0x5a8ab8, voice: 210 },
  shame: { name: 'Shame Wizard', kind: 'wizard', scale: 1.05, robe: 0x5a2a7a, robe2: 0x3a1a52, skin: 0xe8e4f0, voice: 110 },
};

const OUT = 0.022;

function furGeo(seed) {
  const base = new THREE.IcosahedronGeometry(0.5, 2);
  base.deleteAttribute('uv');
  base.deleteAttribute('normal');
  const g = mergeVertices(base);
  const r = mulberry32(seed);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (r() - 0.3) * 0.16;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}
const FUR = [furGeo(3), furGeo(11)];

// ---------------------------------------------------------------------------------------------

function headParts(g, d, R) {
  const skin = d.skin;
  g.sphere(skin, 0, 0, 0, R * 2, R * 2.12, R * 1.95, 0, 0, 0, 18);
  // Ears.
  const es = d.ears === 'big' ? 1.6 : 1;
  for (const s of [-1, 1]) g.sphere(skin, s * R * 0.98, -0.05 * R, -0.05 * R, R * 0.28 * es, R * 0.48 * es, R * 0.22 * es);
  // Nose.
  const nose = { button: [0.24, 0.22, 0.26], small: [0.26, 0.28, 0.32], big: [0.36, 0.5, 0.56], pointy: [0.24, 0.3, 0.5], long: [0.28, 0.36, 0.62] }[d.nose || 'small'];
  g.sphere(skin, 0, -0.12 * R, R * 0.92, R * nose[0] * 2, R * nose[1] * 2, R * nose[2] * 2, d.nose === 'big' || d.nose === 'long' ? 0.25 : 0);
  // Eyes.
  for (const s of [-1, 1]) {
    g.sphere(0xffffff, s * R * 0.36, R * 0.22, R * 0.8, R * 0.38, R * 0.46, R * 0.22);
    g.sphere(0x1d1426, s * R * 0.34, R * 0.2, R * 0.9, R * 0.15, R * 0.18, R * 0.08);
    if (d.brows) g.box(d.brows, s * R * 0.38, R * 0.52, R * 0.84, R * 0.36, R * 0.07, R * 0.07, s * -0.12, 0, s * -0.1);
  }
  if (d.freckles) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) g.sphere(0xd0905a, s * R * (0.42 + k * 0.08), -R * (0.02 + (k % 2) * 0.07), R * 0.86, R * 0.05, R * 0.05, R * 0.03);
  if (d.glasses) {
    for (const s of [-1, 1]) g.add(PRIM.torus(), d.glasses, mat(s * R * 0.37, R * 0.22, R * 0.95, 0, 0, 0, R * 0.62, R * 0.66, R * 0.5));
    g.box(d.glasses, 0, R * 0.25, R * 0.98, R * 0.22, R * 0.05, R * 0.05);
  }
  if (d.mustache) g.sphere(d.mustache, 0, -R * 0.36, R * 0.9, R * 0.8, R * 0.16, R * 0.18);
  hair(g, d, R);
}

function hair(g, d, R) {
  const c = d.hairC;
  switch (d.hair) {
    case 'swoop':
      g.add(PRIM.dome(), c, mat(0, R * 0.02, -R * 0.05, -0.18, 0, 0, R * 2.14, R * 2.3, R * 2.1));
      g.sphere(c, R * 0.25, R * 0.78, R * 0.55, R * 1.1, R * 0.44, R * 0.7, 0.3, 0, -0.35);
      g.sphere(c, -R * 0.35, R * 0.7, R * 0.5, R * 0.7, R * 0.4, R * 0.6, 0.2, 0, 0.3);
      break;
    case 'curly':
    case 'curlyLong': {
      const r = mulberry32(d.name.length * 7);
      for (let k = 0; k < 26; k++) {
        const th = r() * 1.25, ph = r() * Math.PI * 2;
        const x = Math.sin(th) * Math.sin(ph), y = Math.cos(th), z = Math.sin(th) * Math.cos(ph);
        if (z > 0.55 && y < 0.75) continue;
        g.sphere(c, x * R * 1.0, y * R * 1.02, z * R * 0.98, R * 0.62);
      }
      if (d.hair === 'curlyLong') {
        for (let k = 0; k < 16; k++) {
          const a = Math.PI * 0.35 + (k / 15) * Math.PI * 1.3, y = -R * (0.1 + r() * 1.2);
          g.sphere(c, Math.sin(a) * R * 1.0, y, Math.cos(a) * R * 1.0 - R * 0.1, R * 0.6);
        }
      }
      break;
    }
    case 'slick':
      g.add(PRIM.dome(), c, mat(0, R * 0.08, -R * 0.08, -0.1, 0, 0, R * 2.14, R * 2.1, R * 2.12));
      g.sphere(c, 0, R * 0.82, R * 0.42, R * 1.4, R * 0.42, R * 0.8, 0.4);
      break;
    case 'balding':
      for (let k = 0; k < 9; k++) { const a = Math.PI * 0.5 + (k / 8) * Math.PI; g.sphere(c, Math.sin(a) * R * 0.98, R * 0.05, Math.cos(a) * R * 0.95, R * 0.42, R * 0.5, R * 0.42); }
      for (let k = 0; k < 3; k++) g.box(c, (k - 1) * R * 0.18, R * 1.08, R * 0.1, R * 0.04, R * 0.04, R * 1.2, 0, 0, (k - 1) * 0.2);
      break;
    case 'bun':
      g.add(PRIM.dome(), c, mat(0, R * 0.05, -R * 0.05, -0.15, 0, 0, R * 2.14, R * 2.2, R * 2.12));
      g.sphere(c, 0, R * 1.1, -R * 0.45, R * 0.8);
      break;
    case 'long':
      g.add(PRIM.dome(), c, mat(0, R * 0.02, -R * 0.05, -0.15, 0, 0, R * 2.16, R * 2.24, R * 2.14));
      g.box(c, 0, -R * 0.55, -R * 0.55, R * 1.9, R * 1.6, R * 0.7);
      break;
    case 'afro':
      g.sphere(c, 0, R * 0.55, -R * 0.15, R * 2.7, R * 2.3, R * 2.5);
      break;
    case 'short':
      g.add(PRIM.dome(), c, mat(0, R * 0.12, -R * 0.06, -0.12, 0, 0, R * 2.12, R * 1.9, R * 2.1));
      break;
    case 'cap':
      g.add(PRIM.dome(), c, mat(0, R * 0.2, 0, 0, 0, 0, R * 2.16, R * 1.8, R * 2.16));
      g.box(c, 0, R * 0.25, R * 1.1, R * 1.5, R * 0.08, R * 0.9);
      break;
    default:
  }
}

// Mouth: an unlit dark oval with teeth, scaled open/closed. Origin at its centre.
function mouthGeo(R, wide = 1, fangs = false) {
  const g = new GeoBuilder();
  g.sphere(0x3a0f1a, 0, 0, 0, R * 0.8 * wide, R * 0.5, R * 0.3);
  g.sphere(0xd85a6a, 0, -R * 0.12, R * 0.04, R * 0.42 * wide, R * 0.2, R * 0.2);
  g.box(0xffffff, 0, R * 0.17, R * 0.07, R * 0.58 * wide, R * 0.1, R * 0.12);
  if (fangs) for (let k = -3; k <= 3; k++) g.cone(0xffffff, k * R * 0.11 * wide, R * 0.1, R * 0.1, R * 0.05, R * 0.18, 5, Math.PI);
  return g.build();
}

// ---------------------------------------------------------------------------------------------

export function buildCharacter(d) {
  const s = d.scale || 1;
  const m = { def: d, root: new THREE.Group(), meshes: [], phase: Math.random() * 6, squash: 0, talkT: 0 };
  const body = new THREE.Group();
  m.root.add(body);
  m.body = body;
  const add = (parent, geo, outline = OUT, material = d.kind === 'ghost' ? MAT.ghost : MAT.toon) => {
    const mesh = toonMesh(geo, { outline: d.kind === 'ghost' ? 0 : outline, material });
    parent.add(mesh);
    m.meshes.push(mesh);
    return mesh;
  };

  if (d.kind === 'monster') return buildMonster(m, d, s, add);
  if (d.kind === 'wizard') return buildWizard(m, d, s, add);

  const adult = d.kind === 'adult' || d.kind === 'ghost';
  const legLen = (adult ? 0.86 : 0.52) * s;
  const torsoH = (adult ? 0.66 : 0.5) * s, torsoW = (adult ? 0.5 : 0.42) * s * (d.wide || 1), torsoD = (adult ? 0.3 : 0.27) * s * (d.wide || 1);
  const armLen = (adult ? 0.66 : 0.48) * s;
  const R = (d.headR || (adult ? 0.25 : 0.29)) * s;

  const hips = new THREE.Group();
  hips.position.y = legLen;
  body.add(hips);
  m.hips = hips;

  // Torso.
  {
    const g = new GeoBuilder();
    g.add(PRIM.capsule(), d.shirt, mat(0, torsoH / 2, 0, 0, 0, 0, torsoW, torsoH / 2, torsoD));
    if (d.kind !== 'ghost') g.box(d.pants, 0, torsoH * 0.06, 0, torsoW * 0.98, torsoH * 0.3, torsoD * 0.98);
    if (d.stripe) g.box(d.stripe, 0, torsoH * 0.55, 0, torsoW * 1.02, torsoH * 0.12, torsoD * 1.04);
    if (d.whistle) { g.cyl(0xdddddd, 0, torsoH * 0.62, torsoD * 0.52, 0.035 * s, 0.1 * s, 6, Math.PI / 2); g.box(0xd8321e, 0, torsoH * 0.82, torsoD * 0.35, 0.02, torsoH * 0.35, 0.02, 0, -0.3); }
    if (d.kind === 'ghost') { g.box(0xffffff, 0, torsoH * 0.75, torsoD * 0.48, torsoW * 0.3, torsoH * 0.4, 0.04); g.box(0xd8321e, 0, torsoH * 0.7, torsoD * 0.52, 0.06 * s, torsoH * 0.28, 0.03); }
    if (d.cape) g.box(d.cape, 0, torsoH * 0.35, -torsoD * 0.58, torsoW * 1.25, torsoH * 1.25, 0.03, 0.12);
    if (d.kind === 'adult' && d.whistle) g.box(0xffffff, 0, torsoH * 0.92, 0, torsoW * 0.5, 0.05, torsoD * 1.02);
    add(hips, g.build());
  }
  // Head on a neck pivot.
  const neck = new THREE.Group();
  neck.position.y = torsoH + 0.03 * s;
  hips.add(neck);
  m.neck = neck;
  {
    const g = new GeoBuilder();
    g.cyl(d.skin, 0, 0.03 * s, 0, 0.07 * s, 0.12 * s, 8);
    const hg = new GeoBuilder();
    headParts(hg, d, R);
    const head = add(neck, hg.build());
    head.position.y = R * 0.95 + 0.04 * s;
    m.head = head;
    add(neck, g.build());
    const mouth = new THREE.Mesh(mouthGeo(R, d.mouthW || 1), MAT.mouth);
    mouth.position.set(0, -R * 0.5, R * 0.8);
    mouth.scale.y = 0.3;
    head.add(mouth);
    m.mouth = mouth;
  }
  m.headTop = legLen + torsoH + R * 2.1 + 0.06 * s;
  m.height = m.headTop;

  // Arms on shoulder pivots, hanging down.
  m.arms = [];
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(side * (torsoW / 2 + 0.05 * s), torsoH * 0.88, 0);
    hips.add(piv);
    const g = new GeoBuilder();
    const sleeve = d.kind === 'ghost' || d.longSleeves ? d.shirt : d.skin;
    g.add(PRIM.capsule(), d.shirt, mat(0, -armLen * 0.22, 0, 0, 0, 0, 0.15 * s, armLen * 0.22, 0.15 * s));
    g.add(PRIM.capsule(), sleeve, mat(0, -armLen * 0.62, 0, 0, 0, 0, 0.11 * s, armLen * 0.3, 0.11 * s));
    g.sphere(d.skin, 0, -armLen - 0.02 * s, 0, 0.15 * s);
    add(piv, g.build());
    m.arms.push(piv);
  }
  // Legs.
  m.legs = [];
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(side * torsoW * 0.24, legLen, 0);
    body.add(piv);
    const g = new GeoBuilder();
    if (d.kind === 'ghost') {
      g.cone(d.shirt, 0, -legLen * 0.45, 0, 0.16 * s, legLen * 0.9, 8, Math.PI);
    } else {
      const legC = d.shorts ? d.skin : d.pants;
      g.add(PRIM.capsule(), legC, mat(0, -legLen * 0.5, 0, 0, 0, 0, 0.15 * s, legLen * 0.38, 0.15 * s));
      if (d.shorts) g.add(PRIM.capsule(), d.pants, mat(0, -legLen * 0.12, 0, 0, 0, 0, 0.19 * s, legLen * 0.15, 0.19 * s));
      if (d.shorts) g.cyl(0xffffff, 0, -legLen * 0.85, 0, 0.08 * s, 0.12 * s, 8);
      g.sphere(d.shoes, 0, -legLen + 0.05 * s, 0.06 * s, 0.17 * s, 0.13 * s, 0.3 * s);
    }
    add(piv, g.build());
    m.legs.push(piv);
  }
  m.legLen = legLen;
  m.armLen = armLen;
  return m;
}

function buildMonster(m, d, s, add) {
  const legLen = 0.55 * s, torsoH = 0.95 * s, W = 1.0 * s, R = 0.44 * s;
  const hips = new THREE.Group();
  hips.position.y = legLen;
  m.body.add(hips);
  m.hips = hips;
  {
    const g = new GeoBuilder();
    g.add(FUR[0], d.fur, mat(0, torsoH * 0.5, 0, 0, 0, 0, W, torsoH * 1.15, W * 0.8));
    g.add(FUR[1], d.fur2, mat(0, torsoH * 0.42, W * 0.18, 0, 0, 0, W * 0.7, torsoH * 0.85, W * 0.5));
    // Tail.
    g.cone(d.fur, 0, torsoH * 0.12, -W * 0.5, 0.12 * s, 0.7 * s, 6, -2.2);
    add(hips, g.build(), 0.03);
  }
  const neck = new THREE.Group();
  neck.position.set(0, torsoH * 0.95, W * 0.22);
  hips.add(neck);
  m.neck = neck;
  {
    const g = new GeoBuilder();
    g.add(FUR[1], d.fur, mat(0, 0, 0, 0, 0, 0, R * 2.2, R * 2.0, R * 2.0));
    // Snout and the huge jaw line.
    g.sphere(d.fur2, 0, -R * 0.35, R * 0.62, R * 1.6, R * 0.9, R * 0.9);
    g.sphere(d.noseC, 0, R * 0.02, R * 1.02, R * 0.62, R * 0.46, R * 0.48);
    for (const sd of [-1, 1]) {
      g.sphere(0xffffff, sd * R * 0.42, R * 0.38, R * 0.78, R * 0.42, R * 0.48, R * 0.24);
      g.sphere(0x1d1426, sd * R * 0.4, R * 0.36, R * 0.88, R * 0.16, R * 0.2, R * 0.08);
      g.sphere(d.eyeC, sd * R * 0.42, R * 0.52, R * 0.76, R * 0.46, R * 0.12, R * 0.26);
      // Horns curl up and out.
      g.cone(d.horn, sd * R * 0.75, R * 1.05, -R * 0.05, R * 0.2, R * 0.8, 8, 0, 0, -sd * 0.55);
      g.cone(d.horn, sd * R * 1.05, R * 1.55, -R * 0.05, R * 0.12, R * 0.55, 8, 0, 0, -sd * 0.15);
      // Pointy ears.
      g.cone(d.fur, sd * R * 1.05, R * 0.4, -R * 0.1, R * 0.18, R * 0.55, 6, 0, 0, -sd * 1.3);
      if (d.earrings) g.add(PRIM.torus(), d.earrings, mat(sd * R * 1.15, R * 0.05, -R * 0.1, 0, Math.PI / 2, 0, R * 0.35, R * 0.35, R * 0.35));
      if (d.lashes) for (let k = 0; k < 3; k++) g.box(0x1d1426, sd * R * (0.3 + k * 0.1), R * 0.66, R * 0.86, R * 0.04, R * 0.18, R * 0.04, 0, 0, sd * (0.4 - k * 0.3));
    }
    g.box(0x2a1a3a, 0, R * 0.7, R * 0.82, R * 1.1, R * 0.1, R * 0.1);
    if (d.beard) for (let k = 0; k < 7; k++) g.sphere(d.fur2, (k - 3) * R * 0.22, -R * 0.95 - (k % 2) * R * 0.1, R * 0.5, R * 0.36);
    if (d.bigHair) {
      for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; g.sphere(d.bigHair, Math.sin(a) * R * 0.85, R * (0.95 + Math.cos(a * 2) * 0.12), Math.cos(a) * R * 0.75 - R * 0.25, R * 0.85); }
      g.sphere(d.bigHair, 0, R * 1.4, -R * 0.2, R * 1.4, R * 1.0, R * 1.3);
    }
    const head = add(neck, g.build(), 0.03);
    head.position.y = R * 0.7;
    m.head = head;
    const mouth = new THREE.Mesh(mouthGeo(R, 1.5, true), MAT.mouth);
    mouth.position.set(0, -R * 0.48, R * 1.08);
    mouth.scale.y = 0.35;
    head.add(mouth);
    m.mouth = mouth;
  }
  m.headTop = legLen + torsoH + R * 2.2;
  m.height = m.headTop;
  m.arms = [];
  const armLen = 1.0 * s;
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(side * W * 0.5, torsoH * 0.8, W * 0.1);
    hips.add(piv);
    const g = new GeoBuilder();
    g.add(FUR[side > 0 ? 0 : 1], d.fur, mat(0, -armLen * 0.45, 0, 0, 0, 0, 0.32 * s, armLen * 0.95, 0.32 * s));
    g.sphere(d.fur2, 0, -armLen, 0.04 * s, 0.34 * s, 0.26 * s, 0.36 * s);
    for (let k = -1; k <= 1; k++) g.cone(0xf2e8d0, k * 0.08 * s, -armLen - 0.13 * s, 0.14 * s, 0.035 * s, 0.12 * s, 5, Math.PI);
    add(piv, g.build(), 0.03);
    m.arms.push(piv);
  }
  m.legs = [];
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(side * W * 0.26, legLen, 0);
    m.body.add(piv);
    const g = new GeoBuilder();
    g.add(FUR[0], d.fur, mat(0, -legLen * 0.45, 0, 0, 0, 0, 0.38 * s, legLen * 1.0, 0.38 * s));
    g.sphere(d.fur2, 0, -legLen + 0.08 * s, 0.1 * s, 0.36 * s, 0.18 * s, 0.5 * s);
    add(piv, g.build(), 0.03);
    m.legs.push(piv);
  }
  m.legLen = legLen;
  m.armLen = armLen;
  m.hunch = 0.22;
  return m;
}

function buildWizard(m, d, s, add) {
  const robeH = 1.75 * s, R = 0.27 * s;
  const hips = new THREE.Group();
  m.body.add(hips);
  m.hips = hips;
  {
    const g = new GeoBuilder();
    g.cone(d.robe, 0, robeH / 2, 0, 0.62 * s, robeH, 14);
    g.cyl(d.robe2, 0, 0.12 * s, 0, 0.63 * s, 0.22 * s, 14);
    g.sphere(d.robe, 0, robeH - 0.15 * s, 0, 0.7 * s, 0.4 * s, 0.5 * s);
    // Hood.
    g.cone(d.robe2, 0, robeH + 0.55 * s, -0.12 * s, 0.34 * s, 0.9 * s, 10, -0.35);
    g.sphere(d.robe2, 0, robeH + 0.18 * s, -0.08 * s, 0.74 * s, 0.7 * s, 0.68 * s);
    add(hips, g.build(), 0.03);
  }
  const neck = new THREE.Group();
  neck.position.y = robeH;
  hips.add(neck);
  m.neck = neck;
  {
    const g = new GeoBuilder();
    g.sphere(d.skin, 0, 0, 0, R * 1.8, R * 2.5, R * 1.8, 0, 0, 0, 16);
    g.sphere(0x2a1a3a, -R * 0.33, R * 0.25, R * 0.72, R * 0.42, R * 0.32, R * 0.2);
    g.sphere(0x2a1a3a, R * 0.33, R * 0.25, R * 0.72, R * 0.42, R * 0.32, R * 0.2);
    g.sphere(0xc89aff, -R * 0.33, R * 0.25, R * 0.82, R * 0.12);
    g.sphere(0xc89aff, R * 0.33, R * 0.25, R * 0.82, R * 0.12);
    g.box(0x2a1a3a, -R * 0.36, R * 0.55, R * 0.74, R * 0.42, R * 0.07, R * 0.07, 0, 0, 0.35);
    g.box(0x2a1a3a, R * 0.36, R * 0.55, R * 0.74, R * 0.42, R * 0.07, R * 0.07, 0, 0, -0.35);
    g.sphere(d.skin, 0, -R * 0.05, R * 0.85, R * 0.3, R * 0.5, R * 0.4);
    g.cone(0xe8e4f0, 0, -R * 1.45, R * 0.4, R * 0.35, R * 0.9, 8, Math.PI);
    const head = add(neck, g.build(), 0.025);
    head.position.y = R * 0.9;
    m.head = head;
    const mouth = new THREE.Mesh(mouthGeo(R, 0.8), MAT.mouth);
    mouth.position.set(0, -R * 0.62, R * 0.72);
    mouth.scale.y = 0.3;
    head.add(mouth);
    m.mouth = mouth;
  }
  m.headTop = robeH + R * 2.6;
  m.height = m.headTop;
  m.arms = [];
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(side * 0.42 * s, robeH - 0.2 * s, 0);
    hips.add(piv);
    const g = new GeoBuilder();
    g.cone(d.robe, 0, -0.3 * s, 0, 0.2 * s, 0.75 * s, 8, Math.PI);
    g.sphere(d.skin, 0, -0.72 * s, 0, 0.13 * s);
    if (side > 0) {
      g.cyl(0x5a3a2a, 0, -0.5 * s, 0.1 * s, 0.035 * s, 2.2 * s, 6, 0.1);
      g.ico(0xb06aff, 0, 0.6 * s, 0.22 * s, 0.32 * s, 1);
    }
    add(piv, g.build(), 0.025);
    m.arms.push(piv);
  }
  m.legs = [];
  m.legLen = 0;
  m.armLen = 0.75 * s;
  m.floaty = true;
  return m;
}

// ---------------------------------------------------------------------------------------------
// Pose the model for this frame.
//   st: { speed, air, vy, kick (0..1), talk, seated, flung, down, wave, t, sprint }

export function animateCharacter(m, st, dt) {
  const t = st.t;
  const legs = m.legs, arms = m.arms;
  m.phase += Math.min(st.speed, 12) * dt * (m.legLen > 0.7 ? 2.4 : 3.4);
  const sp = Math.min(1, st.speed / 6);
  const swing = Math.sin(m.phase) * (0.25 + sp * 0.75) * Math.min(1, st.speed * 0.6);
  let bob = Math.abs(Math.sin(m.phase)) * 0.06 * sp;
  m.squash = Math.max(0, m.squash - dt * 4);
  const sq = 1 - Math.sin(m.squash * Math.PI) * 0.18;
  m.body.scale.set(2 - sq, sq, 2 - sq);

  if (m.floaty) {
    m.body.position.y = 0.25 + Math.sin(t * 2) * 0.12;
    m.hips.rotation.x = Math.min(0.35, st.speed * 0.05);
    arms[0].rotation.set(-0.3 + Math.sin(t * 1.7) * 0.1, 0, -0.25);
    arms[1].rotation.set(-0.6 + Math.sin(t * 1.3) * 0.15, 0, 0.25);
    if (st.talk) arms[1].rotation.x = -1.3 + Math.sin(t * 6) * 0.3;
  } else if (st.seated) {
    m.body.position.y = 0;
    m.hips.rotation.x = 0;
    for (const l of legs) l.rotation.set(-1.45, 0, 0);
    arms[0].rotation.set(-1.15 + Math.sin(t * 3) * 0.04, 0, 0.18);
    arms[1].rotation.set(-1.15 - Math.sin(t * 3) * 0.04, 0, -0.18);
  } else if (st.flung) {
    m.body.position.y = 0;
    legs[0].rotation.set(-0.6 + Math.sin(t * 20) * 0.4, 0, -0.5);
    legs[1].rotation.set(0.4 - Math.sin(t * 20) * 0.4, 0, 0.5);
    arms[0].rotation.set(Math.sin(t * 18) * 0.5, 0, -2.4);
    arms[1].rotation.set(-Math.sin(t * 18) * 0.5, 0, 2.4);
  } else if (st.down) {
    m.body.position.y = 0;
    legs[0].rotation.set(0.1, 0, -0.25); legs[1].rotation.set(0.05, 0, 0.25);
    arms[0].rotation.set(0, 0, -1.2); arms[1].rotation.set(0, 0, 1.2);
  } else if (st.air) {
    m.body.position.y = 0;
    const up = st.vy > 0;
    legs[0].rotation.set(up ? -0.9 : -0.4, 0, 0);
    legs[1].rotation.set(up ? 0.35 : 0.2, 0, 0);
    arms[0].rotation.set(-0.4, 0, up ? -2.5 : -1.4);
    arms[1].rotation.set(-0.4, 0, up ? 2.5 : 1.4);
    if (st.spin) m.body.rotation.y = st.spin;
  } else {
    m.body.position.y = bob;
    m.body.rotation.y = 0;
    m.hips.rotation.x = (m.hunch || 0) + sp * (st.sprint ? 0.22 : 0.1);
    legs[0].rotation.set(swing, 0, 0);
    legs[1].rotation.set(-swing, 0, 0);
    const idle = st.speed < 0.2 ? Math.sin(t * 2.2) * 0.04 : 0;
    arms[0].rotation.set(-swing * 1.1, 0, -0.12 - idle);
    arms[1].rotation.set(swing * 1.1, 0, 0.12 + idle);
    if (st.wave) { arms[1].rotation.set(-0.3, 0, 2.6 + Math.sin(t * 9) * 0.35); }
    if (st.kick > 0) {
      const k = Math.sin(st.kick * Math.PI);
      legs[1].rotation.x = -1.7 * k;
      legs[0].rotation.x = 0.2 * k;
      m.hips.rotation.x -= 0.25 * k;
      arms[0].rotation.set(-0.8 * k, 0, -0.9 * k);
      arms[1].rotation.set(0.6 * k, 0, 0.9 * k);
    }
    if (st.cheer) { arms[0].rotation.set(0, 0, -2.6 + Math.sin(t * 10) * 0.3); arms[1].rotation.set(0, 0, 2.6 - Math.sin(t * 10) * 0.3); m.body.position.y = Math.abs(Math.sin(t * 6)) * 0.25; }
  }
  if (m.neck) m.neck.rotation.y = st.look || 0;
  // The big mouth.
  if (m.mouth) {
    const target = st.talk ? 0.35 + Math.abs(Math.sin(t * 17 + Math.sin(t * 5) * 2)) * 0.95 : st.flung || st.yell ? 1.1 : 0.32;
    m.mouth.scale.y += (target - m.mouth.scale.y) * Math.min(1, dt * 25);
  }
}

// ---------------------------------------------------------------------------------------------
// Pedestrians: random Bridgetonians.

const PED_SKIN = [0xf7d2b6, 0xf2c39e, 0xe0a882, 0xc68a62, 0x9a6a4a, 0x7a4e36, 0xf5cdb0];
const PED_HAIR = [0x2a1a12, 0x5a3a1e, 0xc4733a, 0xe8d27a, 0x1a1a1a, 0x8a8a8a, 0xb84a2a];
const PED_SHIRT = [0xd8321e, 0x2f8ad8, 0x3fa04a, 0xf2c12e, 0x8a3ab8, 0xff7ab0, 0xffffff, 0x2a2a2a, 0x2fb8a8, 0xff8a3a];
const PED_PANTS = [0x2a3a6a, 0x3a3a3a, 0x6a5a4a, 0x8a8a9a, 0x1d2a4a, 0x5a3a2a];
const HAIRS = ['short', 'long', 'bun', 'curly', 'afro', 'balding', 'cap', 'slick', 'short'];

export function randomPed(r = Math.random) {
  const adult = r() < 0.6;
  return {
    name: 'ped', kind: adult ? 'adult' : 'kid', scale: adult ? 0.94 + r() * 0.14 : 0.86 + r() * 0.14,
    skin: pick(PED_SKIN, r), hair: pick(HAIRS, r), hairC: pick(PED_HAIR, r), shirt: pick(PED_SHIRT, r), pants: pick(PED_PANTS, r),
    shoes: pick([0x222222, 0xffffff, 0x8a5a3a, 0xd8321e], r), nose: pick(['button', 'small', 'big', 'pointy', 'long'], r),
    brows: pick(PED_HAIR, r), glasses: r() < 0.2 ? 0x2a2a2a : 0, wide: adult ? 0.9 + r() * 0.45 : 1, shorts: r() < 0.15, longSleeves: r() < 0.4,
    voice: adult ? 200 + r() * 150 : 380 + r() * 120,
  };
}

// A cheap seated figure (torso + head in one mesh) for traffic drivers.
export function buildBust(d) {
  const s = d.scale || 1;
  const adult = d.kind === 'adult';
  const R = (adult ? 0.25 : 0.29) * s, torsoH = (adult ? 0.66 : 0.5) * s, torsoW = (adult ? 0.5 : 0.42) * s * (d.wide || 1);
  const g = new GeoBuilder();
  g.add(PRIM.capsule(), d.shirt, mat(0, torsoH / 2, 0, 0, 0, 0, torsoW, torsoH / 2, 0.28 * s));
  for (const sd of [-1, 1]) g.add(PRIM.capsule(), d.shirt, mat(sd * torsoW * 0.45, torsoH * 0.6, 0.25 * s, -1.2, 0, 0, 0.13 * s, 0.22 * s, 0.13 * s));
  const hg = new GeoBuilder();
  headParts(hg, d, R);
  const hgeo = hg.build();
  hgeo.translate(0, torsoH + R * 0.95 + 0.06 * s, 0);
  g.parts.push(...[hgeo].map((x) => x));
  const root = new THREE.Group();
  root.add(toonMesh(g.build(), { outline: OUT }));
  const mouth = new THREE.Mesh(mouthGeo(R, 1), MAT.mouth);
  mouth.position.set(0, torsoH + R * 0.45 + 0.06 * s, R * 0.8);
  mouth.scale.y = 0.3;
  root.add(mouth);
  root.userData.mouth = mouth;
  return root;
}
