// Characters built from coloured primitives: oversized heads, big mouths that flap when they talk.
// Animated procedurally. The cast of Sällskapsresan (DESIGN §2); look fields marked † in DESIGN
// (hat, dress, shades, beard, print, tuft, tie, bowtie, vest, held, hairFlower, hair 'page') are
// data for WP-E and are ignored by the Phase-0 builder, which approximates them with old fields.

import { THREE, GeoBuilder, toonMesh, MAT, mat, PRIM } from '../gfx.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32, pick } from '../util.js';

const SV = 0xf2c9a8, ES = 0xd9a07a;   // default skins: Swedish tourist, Spanish local
const A = (o) => ({ kind: 'adult', scale: 1, skin: SV, shoes: 0x2a2a2a, brows: 0x3a2a1e, nose: 'small', ...o });

export const CHARS = {
  stig: A({ name: 'Stig-Helmer', scale: 1.12, wide: 0.85, skin: 0xf1c9a5, hair: 'swoop', hairC: 0x2a1e18, tuft: true, brows: 0x2a1e18, mustache: 0x2a1e18, glasses: 0x6b4a2a, nose: 'long',
    shirt: 0x4a3426, longSleeves: true, pants: 0x3a2a1e, voice: 250, ring: '#4a9ad6',
    outfits: {
      arlanda: { shirt: 0x3a2a1e, longSleeves: true, pants: 0x2e2620, hat: 'cap', hatC: 0x8a7a5a, hair: 'cap', hairC: 0x8a7a5a },
      kostym: { shirt: 0x4a3426, longSleeves: true, pants: 0x3a2a1e, tie: 0x7a2a2a },
      hawaii: { shirt: 0xd8321e, print: [0xffd23f, 0x3f7a3a, 0x2f6ad8], longSleeves: false, shorts: true, pants: 0xe8dcb8 },
      rio: { shirt: 0xf4f0e6, longSleeves: true, bowtie: 0x1d1426, pants: 0x1d1426 },
    } }),
  ole: A({ name: 'Ole', wide: 1.35, skin: 0xf2b89a, hair: 'balding', hairC: 0xa0522d, mustache: 0xa0522d, brows: 0xa0522d, nose: 'big', shirt: 0xf4f4f0, pants: 0x8a7a5a, voice: 270, ring: '#f7c31b',
    outfits: {
      arlanda: { hat: 'trilby', hatC: 0xe8e2d0, shirt: 0xd8c8a0, longSleeves: true, held: 'boombox' },
      flyg: { shirt: 0xf4f4f0 },
      sol: { shirt: 0xf2c94c, print: 'check', pants: 0xe8dcb8, shades: 0x2a2a2a, glasses: 0x2a2a2a },
      gris: { shirt: 0xf4f4f0, stripe: 0xd8321e },
      rio: { shirt: 0xf4f4f0, longSleeves: true, bowtie: 0x1d1426, shades: 0x2a2a2a, glasses: 0x2a2a2a },
    } }),
  majsan: A({ name: 'Majsan', scale: 0.97, hair: 'long', hairC: 0x8a3b22, brows: 0x8a3b22, dress: 0x4a7fd0, print: [0xffffff], shirt: 0x4a7fd0, pants: 0x4a7fd0, skin: 0xf6d3c0, shoes: 0xf4f0e6, voice: 340, ring: '#fff8e6',
    outfits: { flyg: { shirt: 0xd8c8a8, longSleeves: true }, sol: { hairFlower: 0xffffff } } }),
  siv: A({ name: 'Sivan', hair: 'bun', hairC: 0x7a3018, brows: 0x7a3018, dress: 0xd8321e, print: [0xffb0c0], shirt: 0xd8321e, pants: 0xd8321e, voice: 360, ring: '#fff8e6',
    outfits: { flyg: { shirt: 0xc8b8a0, longSleeves: true }, sol: {} } }),
  berra: A({ name: 'Berra', wide: 0.9, hair: 'long', hairC: 0x5a3a22, mustache: 0x5a3a22, brows: 0x5a3a22, glasses: 0x3a3a3a, shirt: 0x2a4fa0, vest: 0x4a6a9a, pants: 0x3a4a6a, voice: 220, ring: '#fff8e6',
    outfits: {
      arlanda: { shirt: 0xf0ead8, stripe: 0x4a3a2a, longSleeves: true },
      flyg: {},
      sol: { hat: 'cap', hatC: 0xffffff },
    } }),
  robban: A({ name: 'Robban', wide: 1.25, hair: 'short', hairC: 0x6a5a48, glasses: 0x2a2a2a, shirt: 0xf07a1e, pants: 0x4a4a52, voice: 235, ring: '#fff8e6',
    outfits: { flyg: { shirt: 0xf07a1e }, sol: { shirt: 0x1f2f6a, hat: 'cap', hatC: 0xf4f4f0, hair: 'cap', hairC: 0xf4f4f0 } } }),
  angerud: A({ name: 'Gösta Angerud', wide: 1.35, skin: 0xf0b8a0, hair: 'balding', hairC: 0x5a4a3a, shirt: 0x3a3a44, longSleeves: true, pants: 0x3a3a44, tie: 0xc8202a, nose: 'big', voice: 200, ring: '#fff8e6',
    outfits: { flyg: {}, sol: { shirt: 0x9cc4e4, pants: 0x9cc4e4, shades: 0x2a2a2a, glasses: 0x2a2a2a } } }),
  levander: A({ name: 'Dr Levander', scale: 1.06, wide: 0.85, hair: 'slick', hairC: 0x2a2a2a, glasses: 0x2a2a2a, shirt: 0xf4f4f0, longSleeves: true, pants: 0x3a3a44, tie: 0x1b2f6b, voice: 290, ring: '#c8c8d8' }),
  lasse: A({ name: 'Lasse', skin: 0xc98f62, hair: 'curly', hairC: 0x1d1426, brows: 0x1d1426, shirt: 0xffd23f, pants: 0xffd23f, longSleeves: true, print: [0xf07a1e], voice: 300, ring: '#f07a1e',
    outfits: { sol: {}, jul: { shirt: 0xd8321e, pants: 0xd8321e, hat: 'tomte' } } }),
  affe: A({ name: 'Affe', wide: 0.85, hair: 'short', hairC: 0xc9a66b, shirt: 0xf4f0e6, print: [0xf07a1e, 0xffd23f], pants: 0xffd23f, shades: 0x2a2a2a, glasses: 0x2a2a2a, held: 'accordion', voice: 280, ring: '#f07a1e' }),
  gabbe: A({ name: 'Gabbe', wide: 1.4, hair: 'afro', hairC: 0xc0602a, beard: 0xc0602a, mustache: 0xc0602a, shades: 0x2a2a2a, glasses: 0x2a2a2a, shirt: 0xf07a1e, pants: 0xffd23f, held: 'congas', voice: 190, ring: '#f07a1e' }),
  jose: A({ name: 'José', skin: ES, hair: 'slick', hairC: 0x1d1426, brows: 0x1d1426, mustache: 0x1d1426, shirt: 0x2048c8, longSleeves: true, pants: 0x1d1426, voice: 280, ring: '#d8321e' }),
  mamma: A({ name: 'Josés mamma', scale: 0.92, skin: ES, hair: 'bun', hairC: 0x9a9a9a, glasses: 0x2a2a2a, dress: 0x1d1426, shirt: 0x1d1426, pants: 0x1d1426, voice: 380, ring: '#d8321e' }),
  pappa: A({ name: 'Josés pappa', skin: ES, hair: 'short', hairC: 0x3a3a3a, shirt: 0x1d1426, longSleeves: true, pants: 0x1d1426, hat: 'trilby', hatC: 0x1d1426, mustache: 0x5a5a5a, voice: 180, ring: '#d8321e' }),
  carmencita: A({ name: 'Carmencita', skin: ES, hair: 'short', hairC: 0x1d1426, dress: 0x1d1426, stripe: 0xd8321e, shirt: 0x1d1426, pants: 0x1d1426, voice: 360, ring: '#d8321e' }),
  herrStorch: A({ name: 'Herr Storch', scale: 1.08, hair: 'curly', hairC: 0x9a7a52, shirt: 0x3a2a4a, print: [0xc0623a], vest: 0xb07a5a, pants: 0x6a5a48, held: 'camera', voice: 300, ring: '#fff8e6' }),
  fruStorch: A({ name: 'Fru Storch', wide: 1.15, hair: 'curly', hairC: 0xf0dca0, glasses: 0x8a3a6a, shirt: 0xd0307a, pants: 0xf4f0e6, hairFlower: 0xffffff, voice: 410, ring: '#fff8e6' }),
  portier: A({ name: 'Portiern', skin: ES, hair: 'slick', hairC: 0x1d1426, shirt: 0xf4f4f0, vest: 0x1d1426, bowtie: 0x1d1426, mustache: 0x1d1426, pants: 0x1d1426, voice: 255, ring: '#d8321e' }),
  sulan: A({ name: 'Sulan', skin: 0xd9a07a, hair: 'short', hairC: 0x6a4a2a, shirt: 0x6a4a2a, pants: 0x4a4a52, voice: 245, ring: '#fff8e6' }),
  vardinna: A({ name: 'Flygvärdinnan', hair: 'bun', hairC: 0xf0d890, brows: 0xc0a060, dress: 0x1e9aa0, shirt: 0x1e9aa0, pants: 0x1e9aa0, shoes: 0x1d1426, voice: 370, ring: '#1e9aa0' }),
  vardinna2: A({ name: 'Flygvärdinnan', hair: 'bun', hairC: 0x8a5a2a, dress: 0x1e9aa0, shirt: 0x1e9aa0, pants: 0x1e9aa0, shoes: 0x1d1426, voice: 390, ring: '#1e9aa0' }),
  kapten: A({ name: 'Kaptenen', hair: 'short', hairC: 0x5a5a5a, shirt: 0xf4f4f0, pants: 0x1b2f6b, hat: 'pilot', hatC: 0x1b2f6b, voice: 185, ring: '#1e9aa0' }),
  pa: A({ name: 'Högtalaren', hair: 'bun', hairC: 0xc0a060, shirt: 0xffd23f, longSleeves: true, pants: 0x3a3a44, voice: 400, ring: '#1e9aa0' }),
  kontrollant: A({ name: 'Kontrollanten', hair: 'cap', hairC: 0x1b2f6b, hat: 'cap', hatC: 0x1b2f6b, shirt: 0x3a4a6a, longSleeves: true, pants: 0x2a2a34, voice: 230, ring: '#fff8e6' }),
  hittegods: A({ name: 'Killen från flygplatsen', skin: ES, hair: 'cap', hairC: 0x3a4a6a, hat: 'cap', hatC: 0x3a4a6a, shirt: 0xd8d0b0, pants: 0x3a4a6a, voice: 300, ring: '#d8321e' }),
  saljare: A({ name: 'Bungalowförsäljaren', hair: 'swoop', hairC: 0xe0c890, shirt: 0xf4f0e6, longSleeves: true, pants: 0xf4f0e6, shades: 0x2a2a2a, glasses: 0x2a2a2a, voice: 310, ring: '#fff8e6' }),
  souvenir: A({ name: 'Souvenirförsäljaren', skin: ES, wide: 1.2, hair: 'balding', hairC: 0x1d1426, shirt: 0xe8d8a8, mustache: 0x1d1426, pants: 0x6a5a48, hat: 'sunhat', voice: 225, ring: '#d8321e' }),
  stadare: A({ name: 'Städerskan', scale: 1.1, hat: 'scarf', hair: 'bun', hairC: 0x2a2a2a, dress: 0x1d1426, stripe: 0xf0a0c0, shirt: 0x1d1426, pants: 0x1d1426, held: 'broom', voice: 260, ring: '#d8321e' }),
  eslov: A({ name: 'Rullskidåkaren', hair: 'cap', hairC: 0xffd23f, hat: 'cap', hatC: 0xffd23f, shirt: 0x2a4fa0, stripe: 0xffd23f, pants: 0x2a4fa0, longSleeves: true, voice: 320, ring: '#fff8e6' }),
  grisbonde: A({ name: 'Grisbonden', skin: ES, hair: 'short', hairC: 0x2a2a2a, shirt: 0x6a5a3a, pants: 0x4a3a2a, hat: 'sunhat', voice: 200, ring: '#d8321e' }),
  varden: A({ name: 'Grisfestvärden', skin: ES, wide: 1.3, hair: 'slick', hairC: 0x1d1426, shirt: 0xf4f4f0, stripe: 0xd8321e, mustache: 0x1d1426, pants: 0x1d1426, voice: 210, ring: '#d8321e' }),
  guardia: A({ name: 'Guardia Civil', skin: ES, hair: 'short', hairC: 0x1d1426, shirt: 0x3d5a3a, pants: 0x3d5a3a, longSleeves: true, hat: 'tricorn', mustache: 0x1d1426, voice: 210, ring: '#3d5a3a' }),
  pax: A({ name: 'Medpassagerare', hair: 'short', hairC: 0x5a3a1e, shirt: 0xb07a3a, pants: 0x6a4a2a, voice: 280, ring: '#fff8e6' }),
};

// Every key with a dialogue portrait (all of them unless a def says portrait: false).
export const CAST = Object.keys(CHARS).filter((k) => CHARS[k].portrait !== false);

// A def with an outfit shallow-merged over the base look (outfit null/unknown = base look).
export function outfitDef(key, outfit) {
  const d = CHARS[key];
  return { ...d, ...(outfit && d.outfits?.[outfit] ? d.outfits[outfit] : {}) };
}

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
  if (!m.floaty && !st.flung && !st.down) poseFlags(m, st, t);
  if (m.neck) m.neck.rotation.y = st.look || 0;
  // The big mouth.
  if (m.mouth) {
    const target = st.talk ? 0.35 + Math.abs(Math.sin(t * 17 + Math.sin(t * 5) * 2)) * 0.95 : st.flung || st.yell ? 1.1 : 0.32;
    m.mouth.scale.y += (target - m.mouth.scale.y) * Math.min(1, dt * 25);
  }
}

// Anim flags layered over the base pose (Phase 0: minimal arm poses; WP-E polishes and adds laugh,
// slump, shoeOff, mirror, film, giraffe, butterKnife, carryOver). arms[0] is the right arm (-x).
function poseFlags(m, st, t) {
  const [R, L] = m.arms;
  if (!R || !L) return;
  if (st.planeSeat && st.seated) { R.rotation.set(-0.45, 0, -0.32); L.rotation.set(-0.45, 0, 0.32); }
  if (st.push) { R.rotation.set(-1.3, 0, 0.12); L.rotation.set(-1.3, 0, -0.12); }
  if (st.hold) { R.rotation.set(-0.35, 0, -0.85); L.rotation.set(-0.35, 0, 0.85); }
  if (st.cupUp) R.rotation.set(-2.7, 0, -0.1);
  if (st.oath) { R.rotation.set(-0.15, 0, -2.85); L.rotation.set(-1.35, 0, -0.65); }
  if (st.wings) { R.rotation.set(0, 0, -1.55 + Math.sin(t * 2) * 0.03); L.rotation.set(0, 0, 1.55 - Math.sin(t * 2) * 0.03); }
  if (st.flail) {
    R.rotation.set(Math.sin(t * 14) * 0.8, 0, -1.9 - Math.sin(t * 11) * 0.5);
    L.rotation.set(-Math.sin(t * 13) * 0.8, 0, 1.9 + Math.sin(t * 12) * 0.5);
  }
  if (st.dance) {
    R.rotation.set(0, 0, -2.4 + Math.sin(t * 8) * 0.4); L.rotation.set(0, 0, 2.4 - Math.sin(t * 8 + 1) * 0.4);
    if (!st.seated) { m.body.position.y = Math.abs(Math.sin(t * 6)) * 0.18; m.body.rotation.y = Math.sin(t * 3) * 0.35; }
  }
}

// ---------------------------------------------------------------------------------------------
// Pedestrians: random tourists and locals.

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

// A seated bust (torso + arms + head) as one merged, vertex-coloured geometry: origin at the torso
// bottom, +z forward. The cabin merges ~80 of these into one static mesh.
export function buildBustGeo(d) {
  const s = d.scale || 1;
  const R = 0.25 * s, torsoH = 0.66 * s, torsoW = 0.5 * s * (d.wide || 1);
  const g = new GeoBuilder();
  g.add(PRIM.capsule(), d.shirt, mat(0, torsoH / 2, 0, 0, 0, 0, torsoW, torsoH / 2, 0.28 * s));
  for (const sd of [-1, 1]) g.add(PRIM.capsule(), d.shirt, mat(sd * torsoW * 0.45, torsoH * 0.6, 0.25 * s, -1.2, 0, 0, 0.13 * s, 0.22 * s, 0.13 * s));
  const hg = new GeoBuilder();
  headParts(hg, d, R);
  const hgeo = hg.build();
  hgeo.translate(0, torsoH + R * 0.95 + 0.06 * s, 0);
  g.parts.push(hgeo);
  g.box(0x3a0f1a, 0, torsoH + R * 0.45 + 0.06 * s, R * 0.85, R * 0.7, R * 0.18, R * 0.2);
  return g.build();
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
