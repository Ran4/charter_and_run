// Characters built from coloured primitives: oversized heads, big mouths that flap when they talk,
// animated procedurally. The cast of Sällskapsresan (DESIGN §2), 1979 tourists and locals (§6.7).
//
// Look fields (DESIGN §2, §14.6; all optional):
//   scale, wide, legK/armK/neckK (proportions), skin, nose ('button'|'small'|'big'|'pointy'|'long'),
//   hair ('swoop'|'curly'|'curlyLong'|'slick'|'balding'|'bun'|'long'|'afro'|'short'|'page') + hairC,
//   curlySides, thin (sparse hair), tuft (Stig's cowlick), brows, lashes, mustache (colour) +
//   stache ('thin'|'thick'|'big'|'walrus'), beard, sideburns, glasses (frame colour) + glassesBig +
//   lens (tinted lens colour) + aviator, shades (filled lens colour), hat ('trilby'|'pilot'|'tricorn'|
//   'bucket'|'sunhat'|'tomte'|'scarf'|'cap'|'fur') + hatC + capStyle ('flat') + peakC (the cap's
//   peak) + hatBand (the bucket's band) + hatSun (SunTrip's sun on the bucket's front), hairFlower,
//   noseGuard (a tourist's plastic nose shield over the nose),
//   shirt, longSleeves, print [c1, c2, c3] + printStyle ('confetti'|'dots'|'floral'|'check') (under
//   a suit or a vest only on the shirt in front), skirtPrint (the dress's dots if not the print's),
//   stripe (one band) + stripes (several) + bib (text printed on the one band's front) + bibC, sash, scarf (neck), apron, belly, collar, suit (colour of
//   the shirt seen in the jacket's V), coat (long coat tails), tie, bowtie, vest, epaulets, badge,
//   chain, belt, dress (cone skirt) + pinafore (the dress also covers the torso), pants, shorts +
//   baggy + shortsHem (a band at the hem), legsC (stockings), shoes, hands (gloves/mittens) +
//   mittenBand, held ('camera'|'boombox'|'accordion'|'congas'|'cup'|'mirror'|'broom'|'giraffe'|
//   'butterKnife'|'knacke'|'handbag').
// Outfits are shallow-merged over the base def (outfitDef); an outfit clears a base field with null.

import { THREE, GeoBuilder, toonMesh, MAT, mat, PRIM, outlineGeometry, outlineMat, textCanvas } from '../gfx.js';
import { mulberry32, pick } from '../util.js';

const SV = 0xf2c9a8, ES = 0xc99a6e;   // default skins: Swedish tourist, Spanish local
const A = (o) => ({ kind: 'adult', scale: 1, skin: SV, shoes: 0x2a2a2a, brows: 0x3a2a1e, nose: 'small', ...o });
const NO_SUIT = { suit: null, tie: null, bowtie: null, coat: null, vest: null };
// Berra's and Robban's island looks; `stekt` is the same, lobster red from the sun (game/bathers.js).
const BERRA_SOL = { hat: 'cap', hatC: 0xffffff }, ROBBAN_SOL = { shirt: 0x1f2f6a, print: [0xffd23f], printStyle: 'dots', collar: 0xffd23f, hat: 'cap', hatC: 0xf4f4f0, peakC: 0x2a4fa0 };
export const STEKT_SKIN = 0xf0705a;

// Invented look details beyond §2.1 and the research (§1.6): Stig's arlanda scarf, Fru Storch's
// white dress.
export const CHARS = {
  // "Giraffen": tall, thin, long neck, round brown glasses, a cowlick. Base look = kostym.
  stig: A({ name: 'Stig-Helmer', scale: 1.12, legK: 1.12, neckK: 1.9, armK: 1.06, wide: 0.85, skin: 0xf1c9a5, hair: 'swoop', hairC: 0x2a1e18, tuft: true, brows: 0x2a1e18,
    mustache: 0x2a1e18, stache: 'thin', glasses: 0x6b4a2a, nose: 'long', shoes: 0x3a2618,
    shirt: 0x4a3426, longSleeves: true, suit: 0xe8e0d0, tie: 0x7a2a2a, pants: 0x3a2a1e, voice: 250, ring: '#4a9ad6',
    outfits: {
      arlanda: { shirt: 0x3a2a1e, longSleeves: true, coat: true, suit: null, tie: null, scarf: 0x8a7a5a, pants: 0x2e2620, hat: 'cap', capStyle: 'flat', hatC: 0x8a7a5a, hands: 0xf4f0e6, mittenBand: 0x9a3a2a },
      kostym: { shirt: 0x4a3426, longSleeves: true, suit: 0xe8e0d0, tie: 0x7a2a2a, pants: 0x3a2a1e },
      hawaii: { ...NO_SUIT, shirt: 0xd8321e, print: [0xffd23f, 0x3f7a3a, 0x2f6ad8], printStyle: 'floral', longSleeves: false, collar: true, shorts: true, baggy: true, pants: 0xe8dcb8, shoes: 0x6a4a2a },
      rio: { shirt: 0xf4f0e6, longSleeves: true, suit: 0xffffff, tie: null, bowtie: 0x1d1426, pants: 0x1d1426, shoes: 0x1d1426 },
    } }),
  // Wide and jolly: curly red-brown fringe round a bald top, big mustache, sideburns, pilot frames.
  ole: A({ name: 'Ole', wide: 1.35, belly: true, skin: 0xf2b89a, hair: 'balding', curlySides: true, hairC: 0xa0522d, mustache: 0xa0522d, stache: 'big', sideburns: true,
    brows: 0xa0522d, nose: 'big', glasses: 0xb89040, aviator: true, shirt: 0xf4f4f0, collar: true, pants: 0x8a7a5a, shoes: 0x5a3a22, voice: 270, ring: '#f7c31b',
    outfits: {
      arlanda: { hat: 'trilby', hatC: 0xe8e2d0, shirt: 0xd8c8a0, longSleeves: true, coat: true, held: 'boombox' },
      flyg: { shirt: 0xf4f4f0, collar: true },
      flygRadio: { shirt: 0xf4f4f0, collar: true, held: 'boombox' },   // the sprit outro's demonstration (cue)
      sol: { shirt: 0xf2c94c, print: [0xc8902a, 0xfff0b0], printStyle: 'check', collar: true, pants: 0xe8dcb8, shades: 0x2a2a2a, glasses: null },
      gris: { shirt: 0xf4f4f0, stripe: 0xd8321e, stripes: true, collar: true, chain: 0xe8c040 },
      rio: { shirt: 0xf4f4f0, longSleeves: true, suit: 0xf4f4f0, bowtie: 0x1d1426, pants: 0x1d1426, shades: 0x2a2a2a, glasses: null },
    } }),
  majsan: A({ name: 'Majsan', scale: 0.97, hair: 'page', hairC: 0x8a3b22, brows: 0x8a3b22, lashes: true, skin: 0xf6d3c0, dress: 0x4a7fd0, print: [0xffffff], printStyle: 'dots',
    shirt: 0x4a7fd0, pants: 0x4a7fd0, shoes: 0xf4f0e6, voice: 340, ring: '#fff8e6',
    outfits: { flyg: { shirt: 0xd8c8a8, longSleeves: true, print: null }, sol: { hairFlower: 0xffffff } } }),   // flyg: plain cardigan (the dress dots would sit on it)
  // White and red flowers on the pink top; the red dress keeps its pink dots.
  siv: A({ name: 'Sivan', hair: 'bun', hairC: 0x7a3018, brows: 0x7a3018, lashes: true, dress: 0xd8321e, print: [0xffffff, 0xd8321e], printStyle: 'floral',
    skirtPrint: [0xffb0c0, 0xffffff], shirt: 0xffb0c0, pants: 0xd8321e, shoes: 0xd8321e, voice: 360, ring: '#fff8e6',
    outfits: { flyg: { shirt: 0xc8b8a0, longSleeves: true, print: null, skirtPrint: null }, sol: {} } }),
  // Gangly, half-long hair, walrus mustache, big tinted glasses, plain blue tee (no slogan), denim vest.
  berra: A({ name: 'Berra', wide: 0.9, legK: 1.06, hair: 'long', hairC: 0x5a3a22, mustache: 0x5a3a22, stache: 'walrus', brows: 0x5a3a22,
    glasses: 0x3a3a3a, glassesBig: true, lens: 0xa89a80, shirt: 0x2a4fa0, vest: 0x4a6a9a, pants: 0x3a4a6a, shoes: 0x6a4a2a, voice: 220, ring: '#fff8e6',
    outfits: {
      arlanda: { shirt: 0xf0ead8, stripe: 0x4a3a2a, stripes: true, longSleeves: true, vest: null, collar: true },
      flyg: {},
      sol: BERRA_SOL,
      stekt: { ...BERRA_SOL, skin: STEKT_SKIN },
    } }),
  robban: A({ name: 'Robban', wide: 1.25, belly: true, hair: 'short', thin: true, hairC: 0x6a5a48, glasses: 0x2a2a2a, shirt: 0xf07a1e, pants: 0x4a4a52, voice: 235, ring: '#fff8e6',
    outfits: { flyg: { shirt: 0xf07a1e, collar: 0x1f2f6a }, sol: ROBBAN_SOL, stekt: { ...ROBBAN_SOL, skin: STEKT_SKIN } } }),
  // Dark suit, blue shirt, red tie; at Arlanda a camel coat and a brown fur hat over it.
  angerud: A({ name: 'Gösta Angerud', wide: 1.35, belly: true, skin: 0xf0b8a0, hair: 'balding', hairC: 0x5a4a3a, brows: 0x5a4a3a, nose: 'big',
    shirt: 0x3a3a44, longSleeves: true, suit: 0x8ab0d8, tie: 0xc8202a, pants: 0x3a3a44, voice: 200, ring: '#fff8e6',
    outfits: {
      arlanda: { coat: true, shirt: 0xc8a06a, hat: 'fur', hatC: 0x5a3a22 },
      flyg: {},
      sol: { shirt: 0x9cc4e4, suit: 0xf4f4f0, pants: 0x9cc4e4, tie: null, shades: 0x2a2a2a, aviator: true, shoes: 0xf0ead8 },
    } }),
  levander: A({ name: 'Dr Levander', scale: 1.06, legK: 1.08, wide: 0.85, hair: 'slick', hairC: 0x2a2a2a, glasses: 0x2a2a2a, glassesBig: true,
    shirt: 0xf4f4f0, longSleeves: true, coat: true, suit: 0x8a8a96, tie: 0x1b2f6b, pants: 0x5a5a64, voice: 290, ring: '#c8c8d8' }),
  lasse: A({ name: 'Lasse', wide: 1.08, skin: 0xc98f62, hair: 'curly', hairC: 0x1d1426, brows: 0x1d1426, sideburns: true,
    shirt: 0xffd23f, print: [0xf07a1e, 0xffffff], printStyle: 'floral', pants: 0xffd23f, longSleeves: true, suit: 0xf07a1e, shoes: 0xf4f0e6, voice: 300, ring: '#f07a1e',
    outfits: { sol: {}, jul: { ...NO_SUIT, shirt: 0xd8321e, print: null, longSleeves: false, pants: 0xd8321e, shorts: true, shortsHem: 0xffffff, hat: 'tomte' } } }),
  affe: A({ name: 'Affe', wide: 0.85, hair: 'short', hairC: 0xc9a66b, brows: 0x9a7a4a, shirt: 0xf4f0e6, print: [0xf07a1e, 0xffd23f, 0x2fb8a8], printStyle: 'floral', collar: true,
    pants: 0xffd23f, shades: 0x2a2a2a, aviator: true, held: 'accordion', voice: 280, ring: '#f07a1e' }),
  gabbe: A({ name: 'Gabbe', wide: 1.4, belly: true, hair: 'afro', hairC: 0xc0602a, beard: 0xc0602a, mustache: 0xc0602a, stache: 'big', brows: 0xc0602a,
    shades: 0x2a2a2a, shirt: 0xf07a1e, print: [0x2fb8a8, 0xffd23f, 0xc2307a], printStyle: 'floral', collar: true, pants: 0xffd23f, held: 'congas', voice: 190, ring: '#f07a1e' }),
  jose: A({ name: 'José', skin: ES, hair: 'slick', hairC: 0x1d1426, brows: 0x1d1426, mustache: 0x1d1426, stache: 'thick', sideburns: true,
    shirt: 0x2048c8, longSleeves: true, collar: true, chain: 0xe8c040, pants: 0x1d1426, voice: 280, ring: '#d8321e' }),
  mamma: A({ name: 'Josés mamma', scale: 0.9, wide: 1.1, skin: ES, hair: 'bun', hairC: 0x9a9a9a, brows: 0x6a6a6a, glasses: 0x2a2a2a, dress: 0x1d1426,
    shirt: 0x1d1426, longSleeves: true, pants: 0x1d1426, legsC: 0x3a3030, held: 'handbag', voice: 380, ring: '#d8321e' }),
  pappa: A({ name: 'Josés pappa', skin: 0xb8865a, hair: 'short', hairC: 0x3a3a3a, shirt: 0x1d1426, longSleeves: true, suit: 0xf4f0e6, pants: 0x1d1426,
    hat: 'trilby', hatC: 0x1d1426, mustache: 0x5a5a5a, stache: 'thick', brows: 0x5a5a5a, voice: 180, ring: '#d8321e' }),
  carmencita: A({ name: 'Carmencita', skin: ES, hair: 'short', hairC: 0x1d1426, brows: 0x1d1426, lashes: true, dress: 0x1d1426, shirt: 0x1d1426, scarf: 0xd8321e,
    pants: 0x1d1426, shoes: 0xd8321e, voice: 360, ring: '#d8321e' }),
  herrStorch: A({ name: 'Herr Storch', scale: 1.06, legK: 1.08, wide: 0.85, hair: 'curly', hairC: 0x9a7a52, brows: 0x7a5a3a, shirt: 0x3a2a4a, print: [0xc0623a, 0xd8b04a], printStyle: 'floral',
    collar: true, longSleeves: true, vest: 0xb07a5a, pants: 0x6a5a48, held: 'camera', voice: 300, ring: '#fff8e6' }),
  fruStorch: A({ name: 'Fru Storch', scale: 0.95, wide: 1.15, hair: 'curly', hairC: 0xf0dca0, brows: 0xc0a060, lashes: true, glasses: 0x8a3a6a, shirt: 0xd0307a, dress: 0xf4f0e6,
    scarf: 0xf4f4f0, hairFlower: 0xffffff, pants: 0xf4f0e6, shoes: 0xf4f0e6, voice: 410, ring: '#fff8e6' }),
  portier: A({ name: 'Portiern', skin: ES, hair: 'slick', hairC: 0x1d1426, brows: 0x1d1426, shirt: 0xf4f4f0, longSleeves: true, vest: 0x1d1426, bowtie: 0x1d1426,
    mustache: 0x1d1426, stache: 'thick', pants: 0x1d1426, voice: 255, ring: '#d8321e' }),
  sulan: A({ name: 'Sulan', skin: 0xd9a07a, hair: 'short', hairC: 0x6a4a2a, shirt: 0x6a4a2a, collar: true, longSleeves: true, pants: 0x4a4a52, voice: 245, ring: '#fff8e6' }),
  vardinna: A({ name: 'Flygvärdinnan', hair: 'bun', hairC: 0xf0d890, brows: 0xc0a060, lashes: true, dress: 0x1e9aa0, pinafore: true, shirt: 0xf4f4f0, longSleeves: true,
    scarf: 0xf7c31b, pants: 0x1e9aa0, shoes: 0x1d1426, voice: 370, ring: '#1e9aa0' }),
  vardinna2: A({ name: 'Flygvärdinnan', hair: 'bun', hairC: 0x8a5a2a, brows: 0x6a4a2a, lashes: true, dress: 0x1e9aa0, pinafore: true, shirt: 0xf4f4f0, longSleeves: true,
    scarf: 0xf7c31b, pants: 0x1e9aa0, shoes: 0x1d1426, voice: 390, ring: '#1e9aa0' }),
  kapten: A({ name: 'Kaptenen', hair: 'short', hairC: 0x8a8a8a, brows: 0x6a6a6a, shirt: 0xf4f4f0, collar: true, epaulets: 0xe8c040, tie: 0x1b2f6b, pants: 0x1b2f6b,
    hat: 'pilot', hatC: 0x1b2f6b, voice: 185, ring: '#1e9aa0' }),
  pa: A({ name: 'Högtalaren', hair: 'bun', hairC: 0xc0a060, lashes: true, shirt: 0xffd23f, longSleeves: true, suit: 0xf4f4f0, dress: 0x3a3a44, pants: 0x3a3a44, voice: 400, ring: '#1e9aa0' }),
  kontrollant: A({ name: 'Kontrollanten', hair: 'short', hairC: 0x5a4a3a, hat: 'cap', hatC: 0x1b2f6b, shirt: 0x3a4a6a, longSleeves: true, collar: true, tie: 0x1d1426, badge: 0xe8c040,
    pants: 0x2a2a34, voice: 230, ring: '#fff8e6' }),
  hittegods: A({ name: 'Killen från flygplatsen', skin: ES, hair: 'short', hairC: 0x1d1426, hat: 'cap', hatC: 0x3a4a6a, shirt: 0xd8d0b0, collar: true, pants: 0x3a4a6a, voice: 300, ring: '#d8321e' }),
  saljare: A({ name: 'Bungalowförsäljaren', scale: 1.06, legK: 1.05, hair: 'swoop', hairC: 0xe0c890, brows: 0xc0a060, shirt: 0xf4f0e6, longSleeves: true, suit: 0x6ab0e8,
    pants: 0xf4f0e6, shoes: 0xf4f0e6, shades: 0x2a2a2a, aviator: true, voice: 310, ring: '#fff8e6' }),
  souvenir: A({ name: 'Souvenirförsäljaren', skin: ES, wide: 1.2, belly: true, hair: 'balding', hairC: 0x1d1426, shirt: 0xe8d8a8, collar: true, mustache: 0x1d1426, stache: 'thick',
    pants: 0x6a5a48, hat: 'sunhat', voice: 225, ring: '#d8321e' }),
  stadare: A({ name: 'Städerskan', scale: 1.08, legK: 1.06, nose: 'big', hat: 'scarf', hatC: 0x5a4a6a, hair: 'bun', hairC: 0x2a2a2a, dress: 0x1d1426, apron: 0xf0a0c0,
    shirt: 0x1d1426, longSleeves: true, pants: 0x1d1426, legsC: 0x3a3030, held: 'broom', voice: 260, ring: '#d8321e' }),
  // ESLÖV printed on the yellow band, as on the film's rollerskier's chest; his skis and poles come
  // with the `ski` anim flag (game/eslov.js), so the cast sheets show the base look.
  eslov: A({ name: 'Rullskidåkaren', hair: 'short', hairC: 0xc9a66b, hat: 'cap', hatC: 0xffd23f, shirt: 0x2a4fa0, stripe: 0xffd23f, bib: 'ESLÖV', pants: 0x2a4fa0, longSleeves: true,
    hands: 0xffd23f, voice: 320, ring: '#fff8e6' }),
  grisbonde: A({ name: 'Grisbonden', skin: 0xb8865a, hair: 'short', hairC: 0x2a2a2a, shirt: 0x6a5a3a, longSleeves: true, pants: 0x4a3a2a, mustache: 0x2a2a2a, stache: 'thick',
    hat: 'sunhat', voice: 200, ring: '#d8321e' }),
  varden: A({ name: 'Grisfestvärden', skin: ES, wide: 1.3, belly: true, hair: 'slick', hairC: 0x1d1426, shirt: 0xf4f4f0, longSleeves: true, collar: true, sash: 0xd8321e,
    mustache: 0x1d1426, stache: 'big', pants: 0x1d1426, voice: 210, ring: '#d8321e' }),
  guardia: A({ name: 'Guardia Civil', skin: ES, hair: 'short', hairC: 0x1d1426, shirt: 0x3d5a3a, pants: 0x3d5a3a, longSleeves: true, collar: true, belt: 0x141414, sash: 0x141414,
    hat: 'tricorn', hatC: 0x121212, mustache: 0x1d1426, stache: 'thick', shoes: 0x121212, voice: 210, ring: '#3d5a3a' }),
  // Portrait only (main.js RADIO_ONLY): the clerk at the Las Palmas telephone station ("Hytt två!").
  telefonist: A({ name: 'Telefonisten', skin: ES, hair: 'short', hairC: 0x1d1426, brows: 0x1d1426, glasses: 0x2a2a2a, shirt: 0xd8e4f0, longSleeves: true, collar: true,
    pants: 0x3a3a44, voice: 330, ring: '#d8321e' }),
  pax: A({ name: 'Medpassagerare', hair: 'short', hairC: 0x5a3a1e, shirt: 0xb07a3a, longSleeves: true, collar: true, pants: 0x6a4a2a, voice: 280, ring: '#fff8e6' }),
};

// Every key with a dialogue portrait (all of them unless a def says portrait: false).
export const CAST = Object.keys(CHARS).filter((k) => CHARS[k].portrait !== false);

// A def with an outfit shallow-merged over the base look (outfit null/unknown = base look).
export function outfitDef(key, outfit) {
  const d = CHARS[key];
  return { ...d, ...(outfit && d.outfits?.[outfit] ? d.outfits[outfit] : {}) };
}

const OUT = 0.022;
const INK = 0x1d1426, WHITE = 0xf4f4f0;
const THIN_TORUS = new THREE.TorusGeometry(0.5, 0.075, 6, 20);
const HAT_C = { cap: 0xf4f4f0, trilby: 0xe8e2d0, pilot: 0x1b2f6b, tricorn: 0x121212, bucket: 0xf4f1e8, sunhat: 0xe8cf8a, tomte: 0xd8321e, scarf: 0xd8c8a0, fur: 0x5a3a22 };

// A GeoBuilder that picks a sphere's segment count from its size (pupils and print dots don't need
// 230 triangles each); everything in this file builds with it.
class CharBuilder extends GeoBuilder {
  sphere(color, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0, seg) {
    if (seg === undefined) { const m = Math.max(sx, sy, sz); seg = m < 0.06 ? 6 : m < 0.13 ? 8 : m < 0.32 ? 10 : 14; }
    return super.sphere(color, x, y, z, sx, sy, sz, rx, ry, rz, seg);
  }
}

// Unit frustum (height 1, bottom radius 0.5, top radius 0.5 * k), cached by k.
const _fr = {};
function frustum(k, n = 14) { const key = `${k.toFixed(2)}_${n}`; return (_fr[key] ??= new THREE.CylinderGeometry(0.5 * k, 0.5, 1, n)); }
// A frustum with bottom radius rb and top radius rt, centred at (x, y, z).
function fru(g, color, x, y, z, rt, rb, h, n = 14, rx = 0, ry = 0, rz = 0) {
  g.add(frustum(rt / rb, n), color, mat(x, y, z, rx, ry, rz, rb * 2, h, rb * 2));
}
function shade(c, k) { const col = new THREE.Color(c); col.multiplyScalar(k); return col.getHex(); }

// ---------------------------------------------------------------------------------------------
// Head: origin at the head centre, +z forward, R = head radius.

function headParts(g, d, R, lo = false) {
  const skin = d.skin;
  const seg = lo ? 14 : 18;
  g.sphere(skin, 0, 0, 0, R * 2, R * 2.12, R * 1.95, 0, 0, 0, seg);
  // Jowls on the heavy men.
  if (d.belly) g.sphere(skin, 0, -R * 0.42, R * 0.2, R * 1.8, R * 1.1, R * 1.5, 0, 0, 0, 12);
  // Ears.
  for (const s of [-1, 1]) g.sphere(skin, s * R * 0.98, -0.05 * R, -0.05 * R, R * 0.28, R * 0.48, R * 0.22);
  // Nose.
  const nose = { button: [0.24, 0.22, 0.26], small: [0.26, 0.28, 0.32], big: [0.38, 0.46, 0.5], pointy: [0.24, 0.3, 0.5], long: [0.24, 0.36, 0.52] }[d.nose || 'small'];
  const nz = d.nose === 'long' ? R * 0.95 : R * 0.92;
  g.sphere(d.nose === 'big' ? shade(skin, 0.97) : skin, 0, -0.1 * R, nz, R * nose[0] * 2, R * nose[1] * 2, R * nose[2] * 2, d.nose === 'big' || d.nose === 'long' ? 0.25 : 0);
  // The nose guard (Bränsletillägg tillkommer, §10.23): a white plastic shell over the whole nose,
  // its own shape grown a little and drawn out to a beak in front, and a tab up to the bridge.
  if (d.noseGuard) {
    const tip = d.nose === 'big' || d.nose === 'long' ? 0.25 : 0, f = R * 0.08;
    g.sphere(d.noseGuard, 0, -0.1 * R - Math.sin(tip) * f, nz + Math.cos(tip) * f, R * nose[0] * 2.5, R * nose[1] * 2.3, R * nose[2] * 2.6, tip);
    g.box(d.noseGuard, 0, R * 0.2, R * 0.9, R * 0.16, R * 0.2, R * 0.08);
  }
  // Eyes and brows.
  for (const s of [-1, 1]) {
    g.sphere(0xffffff, s * R * 0.36, R * 0.22, R * 0.8, R * 0.38, R * 0.46, R * 0.22);
    g.sphere(INK, s * R * 0.34, R * 0.2, R * 0.9, R * 0.15, R * 0.18, R * 0.08);
    if (d.lashes) g.box(INK, s * R * 0.5, R * 0.4, R * 0.84, R * 0.16, R * 0.05, R * 0.05, 0, 0, s * -0.5);
    if (d.brows) g.box(d.brows, s * R * 0.38, R * 0.54, R * 0.84, R * 0.38, R * (d.belly ? 0.1 : 0.075), R * 0.08, s * -0.12, 0, s * -0.1);
  }
  if (d.freckles) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) g.sphere(0xd0905a, s * R * (0.42 + k * 0.08), -R * (0.02 + (k % 2) * 0.07), R * 0.86, R * 0.05, R * 0.05, R * 0.03);
  // Glasses: rings (round, big or aviator), optional tinted lens with the pupils drawn on it.
  if (d.shades) {
    const f = d.shadesF ?? 0x2a2a2a;
    for (const s of [-1, 1]) g.sphere(d.shades, s * R * 0.37, R * 0.2, R * 0.96, R * 0.62, R * 0.5, R * 0.14, 0, 0, s * 0.18);
    g.box(f, 0, R * 0.38, R * 0.98, R * 1.3, R * 0.06, R * 0.06);
    for (const s of [-1, 1]) g.box(f, s * R * 0.86, R * 0.3, R * 0.5, R * 0.05, R * 0.05, R * 0.85);
  } else if (d.glasses) {
    const big = d.glassesBig || d.aviator, sx = big ? 0.8 : 0.62, sy = d.aviator ? 0.7 : big ? 0.74 : 0.66;
    if (d.lens) for (const s of [-1, 1]) {
      g.sphere(d.lens, s * R * 0.37, R * 0.21, R * 0.93, R * sx * 0.95, R * sy * 0.95, R * 0.1);
      g.sphere(INK, s * R * 0.34, R * 0.2, R * 0.99, R * 0.13, R * 0.15, R * 0.04);
    }
    for (const s of [-1, 1]) g.add(THIN_TORUS, d.glasses, mat(s * R * 0.38, R * 0.22, R * 0.96, 0, 0, d.aviator ? s * 0.18 : 0, R * sx, R * sy, R * 0.6));
    g.box(d.glasses, 0, R * 0.27, R * 0.99, R * 0.22, R * 0.05, R * 0.05);
    for (const s of [-1, 1]) g.box(d.glasses, s * R * 0.84, R * 0.28, R * 0.5, R * 0.04, R * 0.04, R * 0.85);
  }
  // Facial hair.
  if (d.sideburns) for (const s of [-1, 1]) g.box(d.hairC ?? d.mustache ?? INK, s * R * 0.9, -R * 0.12, R * 0.22, R * 0.14, R * 0.62, R * 0.3);
  if (d.beard) {
    for (let k = 0; k <= 8; k++) {
      const a = -1.35 + (k / 8) * 2.7, y = -R * (0.3 + 0.55 * Math.cos(a * 0.75));
      g.sphere(d.beard, Math.sin(a) * R * 0.86, y, Math.cos(a) * R * 0.62, R * 0.52, R * 0.62, R * 0.5);
    }
    g.sphere(d.beard, 0, -R * 0.98, R * 0.42, R * 1.15, R * 0.72, R * 0.8);
  }
  if (d.mustache) {
    const c = d.mustache;
    switch (d.stache) {
      case 'big':
        for (const s of [-1, 1]) { g.sphere(c, s * R * 0.24, -R * 0.36, R * 0.9, R * 0.6, R * 0.28, R * 0.3, 0, 0, s * 0.25); g.sphere(c, s * R * 0.5, -R * 0.48, R * 0.78, R * 0.3, R * 0.3, R * 0.26); }
        break;
      case 'walrus':
        g.sphere(c, 0, -R * 0.38, R * 0.9, R * 1.0, R * 0.32, R * 0.28);
        for (const s of [-1, 1]) g.sphere(c, s * R * 0.42, -R * 0.62, R * 0.8, R * 0.24, R * 0.52, R * 0.24, 0, 0, s * 0.2);
        break;
      case 'thick':
        g.sphere(c, 0, -R * 0.36, R * 0.9, R * 0.9, R * 0.22, R * 0.22);
        for (const s of [-1, 1]) g.sphere(c, s * R * 0.4, -R * 0.44, R * 0.82, R * 0.22, R * 0.24, R * 0.2);
        break;
      default:
        g.sphere(c, 0, -R * 0.35, R * 0.9, R * 0.78, R * 0.15, R * 0.17);
    }
  }
  hair(g, d, R);
  if (d.hat) hat(g, d, R);
  if (d.hairFlower) {
    const fx = d.hat === 'scarf' ? 0 : R * 0.8, fy = R * 0.62, fz = R * 0.28;
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; g.sphere(d.hairFlower, fx + R * 0.05, fy + Math.cos(a) * R * 0.17, fz + Math.sin(a) * R * 0.17, R * 0.16, R * 0.24, R * 0.24); }
    g.sphere(0xffd23f, fx + R * 0.12, fy, fz, R * 0.12, R * 0.16, R * 0.16);
  }
}

// Hair domes are tipped back so their front rim (the hairline) sits at ~0.65 R, clear of the
// eyes (whites up to 0.45 R) and the brows (~0.58 R): a flatter dome would cover the eyes, and the
// eyes' outline hulls would show through the hair as black scribbles.
const HAIR_TILT = -0.62;

function hair(g, d, R) {
  const c = d.hairC;
  const hatted = !!d.hat;
  switch (d.hat === 'scarf' ? 'none' : d.hair) {
    case 'swoop':
      g.add(PRIM.dome(), c, mat(0, R * 0.02, -R * 0.05, HAIR_TILT, 0, 0, R * 2.14, R * 2.3, R * 2.1));
      // The side-swept fringe (above the brows) and a flat back of the head.
      g.sphere(c, R * 0.25, R * 0.86, R * 0.5, R * 1.15, R * 0.36, R * 0.7, 0.35, 0, -0.38);
      g.sphere(c, -R * 0.38, R * 0.8, R * 0.46, R * 0.66, R * 0.32, R * 0.6, 0.2, 0, 0.3);
      for (const s of [-1, 1]) g.box(c, s * R * 0.92, R * 0.2, R * 0.08, R * 0.16, R * 0.5, R * 0.4);
      break;
    case 'page':
      // A pageboy bob with a fringe: crown, rounded sides to the jaw, bangs over the brows.
      g.add(PRIM.dome(), c, mat(0, R * 0.04, -R * 0.04, HAIR_TILT, 0, 0, R * 2.2, R * 2.36, R * 2.16));
      g.sphere(c, 0, -R * 0.12, -R * 0.26, R * 2.34, R * 1.72, R * 2.0, 0, 0, 0, 16);
      g.sphere(c, 0, R * 0.78, R * 0.58, R * 1.76, R * 0.3, R * 0.54, 0.35);
      for (const s of [-1, 1]) g.sphere(c, s * R * 0.92, -R * 0.42, R * 0.18, R * 0.42, R * 0.6, R * 0.62);
      break;
    case 'curly':
    case 'curlyLong': {
      // A cap and a nape under the curls, so the back and sides of the head are not bald.
      g.add(PRIM.dome(), c, mat(0, R * 0.04, -R * 0.06, HAIR_TILT, 0, 0, R * 2.12, R * 2.2, R * 2.1));
      g.sphere(c, 0, -R * 0.25, -R * 0.45, R * 1.8, R * 1.2, R * 1.2);
      const r = mulberry32((d.name || 'x').length * 7 + (c & 0xff));
      for (let k = 0; k < 26; k++) {
        const th = r() * 1.25, ph = r() * Math.PI * 2;
        const x = Math.sin(th) * Math.sin(ph), y = Math.cos(th), z = Math.sin(th) * Math.cos(ph);
        if (z > 0.55 && y < 0.75) continue;
        if (hatted && y > 0.55) continue;
        g.sphere(c, x * R * 1.0, y * R * 1.02, z * R * 0.98, R * 0.62, R * 0.62, R * 0.62, 0, 0, 0, 8);
      }
      if (d.hair === 'curlyLong') {
        for (let k = 0; k < 16; k++) {
          const a = Math.PI * 0.35 + (k / 15) * Math.PI * 1.3, y = -R * (0.1 + r() * 1.2);
          g.sphere(c, Math.sin(a) * R * 1.0, y, Math.cos(a) * R * 1.0 - R * 0.1, R * 0.6, R * 0.6, R * 0.6, 0, 0, 0, 8);
        }
      }
      break;
    }
    case 'slick':
      g.add(PRIM.dome(), c, mat(0, R * 0.08, -R * 0.08, HAIR_TILT, 0, 0, R * 2.14, R * 2.1, R * 2.12));
      if (!hatted) g.sphere(c, 0, R * 0.88, R * 0.4, R * 1.4, R * 0.38, R * 0.78, 0.4);
      for (const s of [-1, 1]) g.box(c, s * R * 0.93, R * 0.18, R * 0.1, R * 0.14, R * 0.46, R * 0.4);
      break;
    case 'balding':
      // A fringe round the back and sides; curly puffs above the ears for Ole.
      for (let k = 0; k < 9; k++) { const a = Math.PI * 0.5 + (k / 8) * Math.PI; g.sphere(c, Math.sin(a) * R * 0.98, R * 0.05, Math.cos(a) * R * 0.95, R * 0.42, R * 0.5, R * 0.42); }
      if (d.curlySides) for (const s of [-1, 1]) for (let k = 0; k < 4; k++) g.sphere(c, s * R * (1.0 - k * 0.04), R * (0.32 - k * 0.12), R * (0.12 - k * 0.24), R * 0.46, R * 0.42, R * 0.42, 0, 0, 0, 8);
      if (!hatted) for (let k = 0; k < 3; k++) g.box(c, (k - 1) * R * 0.18, R * 1.06, R * 0.1, R * 0.04, R * 0.04, R * 1.1, 0, 0, (k - 1) * 0.2);
      break;
    case 'bun':
      g.add(PRIM.dome(), c, mat(0, R * 0.05, -R * 0.05, HAIR_TILT, 0, 0, R * 2.16, R * 2.24, R * 2.14));
      if (!hatted) { g.sphere(c, 0, R * 0.95, -R * 0.62, R * 0.86); g.box(shade(c, 0.8), 0, R * 0.62, -R * 0.72, R * 0.6, R * 0.08, R * 0.2); }
      break;
    case 'long':
      g.add(PRIM.dome(), c, mat(0, R * 0.02, -R * 0.05, HAIR_TILT, 0, 0, R * 2.16, R * 2.24, R * 2.14));
      g.sphere(c, 0, -R * 0.42, -R * 0.42, R * 2.12, R * 1.8, R * 1.2);
      for (const s of [-1, 1]) g.sphere(c, s * R * 0.9, -R * 0.45, R * 0.05, R * 0.42, R * 1.4, R * 0.7);
      break;
    case 'afro': {
      const r = mulberry32(17);
      g.sphere(c, 0, R * 0.48, -R * 0.15, R * 2.5, R * 2.1, R * 2.3);
      for (let k = 0; k < 18; k++) {
        const th = 0.15 + r() * 1.35, ph = r() * Math.PI * 2;
        const x = Math.sin(th) * Math.sin(ph), y = Math.cos(th), z = Math.sin(th) * Math.cos(ph);
        if (z > 0.6 && y < 0.7) continue;
        g.sphere(c, x * R * 1.18, R * 0.48 + y * R * 1.0, z * R * 1.08 - R * 0.15, R * 0.7, R * 0.7, R * 0.7, 0, 0, 0, 8);
      }
      break;
    }
    case 'short':
      if (d.thin) {
        g.add(PRIM.dome(), c, mat(0, R * 0.04, -R * 0.2, -0.45, 0, 0, R * 2.1, R * 1.9, R * 2.06));
        for (let k = 0; k < 4; k++) g.box(c, (k - 1.5) * R * 0.16, R * 1.05, R * 0.25, R * 0.04, R * 0.04, R * 0.6, 0, 0, (k - 1.5) * 0.15);
      } else g.add(PRIM.dome(), c, mat(0, R * 0.1, -R * 0.08, HAIR_TILT, 0, 0, R * 2.14, R * 2.0, R * 2.12));
      for (const s of [-1, 1]) g.box(c, s * R * 0.92, R * 0.2, R * 0.05, R * 0.14, R * 0.4, R * 0.36);
      break;
    case 'cap':   // legacy: a plain cap in the hair colour
      g.add(PRIM.dome(), c, mat(0, R * 0.2, 0, 0, 0, 0, R * 2.16, R * 1.8, R * 2.16));
      g.box(c, 0, R * 0.25, R * 1.1, R * 1.5, R * 0.08, R * 0.9);
      break;
    default:
  }
  // Stig's cowlick: three stiff strands sticking up at the crown.
  if (d.tuft && !hatted) {
    const tc = typeof d.tuft === 'number' ? d.tuft : c;
    g.cone(tc, -R * 0.12, R * 1.18, -R * 0.32, R * 0.1, R * 0.5, 5, -0.5, 0, 0.35);
    g.cone(tc, R * 0.02, R * 1.22, -R * 0.36, R * 0.09, R * 0.46, 5, -0.7, 0, -0.1);
    g.cone(tc, R * 0.16, R * 1.16, -R * 0.3, R * 0.08, R * 0.4, 5, -0.4, 0, -0.55);
  }
}

function hat(g, d, R) {
  const c = d.hatC ?? HAT_C[d.hat] ?? WHITE;
  const dark = shade(c, 0.62);
  switch (d.hat) {
    case 'cap':
      if (d.capStyle === 'flat') {
        // A tweed flat cap: a soft, forward-tipped crown and a short peak.
        g.sphere(c, 0, R * 0.78, R * 0.12, R * 2.3, R * 0.78, R * 2.36, 0.22);
        g.sphere(shade(c, 0.85), 0, R * 0.58, R * 0.96, R * 1.3, R * 0.16, R * 0.6, 0.35);
        g.sphere(c, 0, R * 1.0, R * 0.0, R * 0.22);
      } else {
        // Tipped back so the peak sits on the forehead, above the brows, and the eyes stay visible.
        const pc = d.peakC ?? c;
        g.add(PRIM.dome(), c, mat(0, R * 0.42, -R * 0.02, -0.3, 0, 0, R * 2.26, R * 1.86, R * 2.26));
        g.cyl(pc, 0, R * 0.7, R * 1.1, R * 0.72, R * 0.07, 14, 0.18, 0, 0);
        g.box(pc, 0, R * 0.7, R * 0.96, R * 1.3, R * 0.07, R * 0.5, 0, 0.18);
        g.sphere(dark, 0, R * 1.3, -R * 0.12, R * 0.2);
      }
      break;
    case 'trilby':
      fru(g, c, 0, R * 0.62, -R * 0.02, R * 1.62, R * 1.62, R * 0.07, 18, 0.06);
      fru(g, c, 0, R * 1.0, -R * 0.04, R * 0.8, R * 0.98, R * 0.78, 14, 0.06);
      g.sphere(c, 0, R * 1.38, -R * 0.06, R * 1.6, R * 0.34, R * 1.8, 0.06);
      fru(g, dark, 0, R * 0.74, -R * 0.03, R * 0.99, R * 1.0, R * 0.18, 14, 0.06);
      break;
    case 'pilot':
      fru(g, c, 0, R * 0.72, 0, R * 1.02, R * 1.0, R * 0.38, 16);
      g.cyl(c, 0, R * 1.08, -R * 0.06, R * 1.2, R * 0.36, 18, -0.1);
      g.cyl(INK, 0, R * 0.62, R * 0.98, R * 0.62, R * 0.07, 14, 0.25);
      g.box(0xe8c040, 0, R * 0.92, R * 1.02, R * 0.34, R * 0.24, R * 0.06);
      g.box(0xe8c040, 0, R * 0.64, R * 1.0, R * 1.2, R * 0.06, R * 0.06);
      break;
    case 'tricorn':
      // Guardia Civil tricornio: glossy black crown, a turned-up front brim and the flat back wall.
      g.add(PRIM.dome(), c, mat(0, R * 0.48, -R * 0.04, 0, 0, 0, R * 2.2, R * 1.6, R * 2.16));
      g.sphere(c, 0, R * 0.56, R * 0.55, R * 2.5, R * 0.14, R * 1.3, -0.28);
      // The flat back wall: a wide plate with a straight top and rounded corners that rises well
      // above the crown, so the hat reads as a tricornio from the front and three-quarter too.
      g.box(c, 0, R * 0.975, -R * 0.8, R * 2.5, R * 0.85, R * 0.16);
      g.box(c, 0, R * 1.6, -R * 0.8, R * 1.8, R * 0.3, R * 0.16);
      for (const s of [-1, 1]) g.cyl(c, s * R * 0.9, R * 1.4, -R * 0.8, R * 0.35, R * 0.16, 12, Math.PI / 2, 0, 0);
      g.box(0x3a3a3a, 0, R * 0.58, R * 0.98, R * 0.8, R * 0.05, R * 0.05, 0, -0.28);
      break;
    case 'bucket':
      fru(g, c, 0, R * 0.98, -R * 0.02, R * 0.86, R * 1.04, R * 0.72, 14);
      g.sphere(c, 0, R * 1.32, -R * 0.02, R * 1.72, R * 0.2, R * 1.72);
      fru(g, c, 0, R * 0.52, -R * 0.02, R * 1.06, R * 1.5, R * 0.26, 16);
      fru(g, d.hatBand ?? dark, 0, R * 0.72, -R * 0.02, R * 1.03, R * 1.05, R * 0.12, 14);
      // SunTrip's logo (§10.23; red text on a yellow sun, research-characters.md:36): a yellow disc
      // on the crown's front, laid on its slope, with a red bar across it for the letters.
      if (d.hatSun) {
        const sl = Math.atan(0.18 / 0.72), y = R * 1.04, z = -R * 0.02 + R * 0.95 + R * 0.04;
        g.cyl(0xf7c31b, 0, y, z, R * 0.3, R * 0.05, 14, Math.PI / 2 - sl, 0, 0);
        g.box(0xd8321e, 0, y + R * 0.01, z + R * 0.03, R * 0.44, R * 0.1, R * 0.03, 0, -sl);
      }
      break;
    case 'sunhat':
      g.cyl(c, 0, R * 0.6, -R * 0.02, R * 2.0, R * 0.07, 20, 0.08);
      fru(g, c, 0, R * 0.98, -R * 0.04, R * 0.82, R * 0.98, R * 0.76, 14, 0.08);
      g.sphere(c, 0, R * 1.34, -R * 0.06, R * 1.62, R * 0.3, R * 1.62, 0.08);
      fru(g, 0xd8321e, 0, R * 0.72, -R * 0.03, R * 0.99, R * 1.0, R * 0.16, 14, 0.08);
      break;
    case 'tomte': {
      fru(g, c, 0, R * 1.2, -R * 0.28, R * 0.12, R * 1.0, R * 1.3, 14, -0.55);
      const tipY = R * 1.2 + Math.cos(0.55) * R * 0.7, tipZ = -R * 0.28 - Math.sin(0.55) * R * 0.7;
      g.sphere(c, 0, tipY - R * 0.05, tipZ - R * 0.1, R * 0.32);
      g.sphere(0xffffff, 0, tipY - R * 0.22, tipZ - R * 0.42, R * 0.46);
      g.add(PRIM.torus(), 0xffffff, mat(0, R * 0.66, -R * 0.06, Math.PI / 2 + 0.25, 0, 0, R * 2.18, R * 2.18, R * 2.4));
      break;
    }
    case 'fur':
      // A round fur hat (Stockholm in December): a tall, slightly flared crown with a soft top.
      fru(g, c, 0, R * 0.98, -R * 0.03, R * 1.12, R * 1.06, R * 0.8, 14, -0.06);
      g.sphere(c, 0, R * 1.38, -R * 0.06, R * 2.2, R * 0.36, R * 2.2, -0.06);
      fru(g, shade(c, 0.8), 0, R * 0.64, -R * 0.01, R * 1.1, R * 1.1, R * 0.14, 14, -0.06);
      break;
    case 'scarf':
      // Headscarf: covers the top and the back, side flaps to the jaw, a knot under the chin.
      g.add(PRIM.dome(), c, mat(0, -R * 0.02, -R * 0.12, -0.72, 0, 0, R * 2.3, R * 2.36, R * 2.26));
      for (const s of [-1, 1]) g.sphere(c, s * R * 0.84, -R * 0.38, R * 0.08, R * 0.5, R * 1.1, R * 0.86);
      g.sphere(c, 0, -R * 1.02, R * 0.38, R * 0.36, R * 0.26, R * 0.3);
      g.box(shade(c, 0.8), 0, R * 0.7, R * 0.74, R * 1.6, R * 0.12, R * 0.2, 0, 0.3);
      break;
    default:
  }
}

// Mouth: an unlit dark oval with teeth, scaled open/closed. Origin at its centre.
function mouthGeo(R, wide = 1) {
  const g = new CharBuilder();
  g.sphere(0x3a0f1a, 0, 0, 0, R * 0.8 * wide, R * 0.5, R * 0.3);
  g.sphere(0xd85a6a, 0, -R * 0.12, R * 0.04, R * 0.42 * wide, R * 0.2, R * 0.2);
  g.box(0xffffff, 0, R * 0.17, R * 0.07, R * 0.58 * wide, R * 0.1, R * 0.12);
  return g.build();
}

// ---------------------------------------------------------------------------------------------
// Torso: drawn in the hips frame (y from 0 to torsoH, +z forward). Shared by the full body and the
// seated busts. lo = fewer parts (busts: ~80 of them are merged into one cabin mesh).

function onTorso(T, a, y) {
  // Point on the torso capsule's surface at angle a (0 = front) and height y; with the outward
  // normal's yaw. The capsule's straight part runs from torsoH/4 to 3 torsoH/4.
  const rx = T.W / 2, rz = T.D / 2;
  const yy = (y - T.H / 2) / (T.H / 2);   // -1..1
  const k = Math.abs(yy) > 0.5 ? Math.sqrt(Math.max(0, 1 - ((Math.abs(yy) - 0.5) / 0.5) ** 2)) : 1;
  const x = Math.sin(a) * rx * k, z = Math.cos(a) * rz * k;
  return [x, z, Math.atan2(Math.sin(a) / rx, Math.cos(a) / rz)];
}

// Prints go into pg: the caller adds it without an outline, which would ring every petal and dot
// with black.
function torsoParts(g, d, T, lo = false, pg = g) {
  const { H, W, D, s } = T;
  const top = d.pinafore && d.dress ? d.dress : d.shirt;
  g.add(PRIM.capsule(), top, mat(0, H / 2, 0, 0, 0, 0, W, H / 2, D));
  if (d.belly) g.sphere(top, 0, H * 0.34, D * 0.16, W * 0.92, H * 0.62, D * 1.02);
  // Waistband: trousers (or the dress), with a belt for the men.
  const waist = d.dress ?? d.pants;
  g.add(PRIM.cyl(14), waist, mat(0, H * 0.06, 0, 0, 0, 0, W * 0.98, H * 0.3, D * (d.belly ? 1.14 : 1.0)));
  if (!d.dress && (d.belt || (!d.suit && !d.shorts && !d.coat))) g.add(PRIM.cyl(14), d.belt ?? 0x3a2a1e, mat(0, H * 0.19, 0, 0, 0, 0, W * 1.0, H * 0.06, D * (d.belly ? 1.16 : 1.03)));
  // Patterns.
  if (d.print) printParts(pg, d, T, lo);
  if (d.stripe) {
    // Bands hugging the torso (and the belly): elliptic cylinders just outside the shirt.
    // A band with a print (`bib`) is wider, to carry the letters.
    const n = d.stripes ? (lo ? 2 : 4) : 1;
    for (let k = 0; k < n; k++) {
      const y = n === 1 ? H * 0.55 : H * (0.33 + k * 0.16);
      const yy = (y - H / 2) / (H / 2), kk = Math.abs(yy) > 0.5 ? Math.sqrt(Math.max(0, 1 - ((Math.abs(yy) - 0.5) / 0.5) ** 2)) : 1;
      const bz = d.belly && y < H * 0.6 ? D * 0.1 : 0;
      g.add(PRIM.cyl(16), d.stripe, mat(0, y, bz, 0, 0, 0, W * kk * 1.04, H * (n === 1 ? (d.bib ? BIB_H : 0.12) : 0.075), (D * kk + bz * 2) * 1.06));
    }
  }
  if (d.vest) {
    g.add(PRIM.capsule(), d.vest, mat(0, H * 0.55, -D * 0.02, 0, 0, 0, W * 1.06, H * 0.42, D * 1.06));
    g.box(d.shirt, 0, H * 0.6, D * 0.52, W * 0.2, H * 0.56, D * 0.12);
    if (!lo) for (let k = 0; k < 3; k++) for (const sx of [-1, 1]) g.sphere(shade(d.vest, 0.7), sx * W * 0.13, H * (0.46 + k * 0.14), D * 0.53, 0.028 * s);
  }
  // Suit jacket: a V of shirt and lapels.
  if (d.suit) {
    g.box(d.suit, 0, H * 0.78, D * 0.48, W * 0.3, H * 0.34, D * 0.1, 0, -0.18);
    for (const sx of [-1, 1]) g.box(shade(d.shirt, 0.82), sx * W * 0.16, H * 0.72, D * 0.5, W * 0.12, H * 0.42, D * 0.07, 0, -0.15, sx * 0.3);
    if (!lo) for (let k = 0; k < 2; k++) g.sphere(shade(d.shirt, 0.6), 0, H * (0.42 + k * 0.14), D * 0.5, 0.032 * s);
  }
  if (d.collar || d.tie || (d.suit && !d.bowtie)) {
    const cc = d.suit ?? d.shirt;
    for (const sx of [-1, 1]) g.box(d.collar === true || !d.collar ? shade(cc, d.suit ? 1 : 0.92) : d.collar, sx * W * 0.11, H * 0.96, D * 0.36, W * 0.18, H * 0.08, D * 0.26, sx * 0.45, -0.35, sx * 0.25);
  }
  if (d.tie) {
    g.box(d.tie, 0, H * 0.92, D * 0.52, 0.07 * s, 0.07 * s, 0.05 * s);
    g.box(d.tie, 0, H * 0.66, D * 0.54, 0.075 * s, H * 0.46, 0.03 * s, 0, -0.08);
    g.cone(d.tie, 0, H * 0.41, D * 0.56, 0.06 * s, 0.07 * s, 4, Math.PI, Math.PI / 4);
  }
  if (d.bowtie) {
    for (const sx of [-1, 1]) g.cone(d.bowtie, sx * 0.05 * s, H * 0.95, D * 0.52, 0.04 * s, 0.1 * s, 4, 0, 0, sx * Math.PI / 2);
    g.sphere(d.bowtie, 0, H * 0.95, D * 0.53, 0.035 * s);
  }
  if (d.scarf) {
    g.add(PRIM.torus(), d.scarf, mat(0, H * 0.98, 0, Math.PI / 2, 0, 0, W * 0.62, D * 1.15, 0.2 * s));
    g.box(d.scarf, W * 0.12, H * 0.82, D * 0.5, 0.08 * s, H * 0.3, 0.04 * s, 0, -0.2, 0.2);
  }
  if (d.sash) g.box(d.sash, 0, H * 0.58, 0, W * 0.16, H * 1.25, D * (d.belly ? 1.2 : 1.06), 0, 0, -0.75);
  if (d.apron) {
    g.box(d.apron, 0, H * 0.72, D * 0.52, W * 0.52, H * 0.36, D * 0.06);
    g.box(d.apron, 0, -H * 0.05, D * (d.belly ? 0.62 : 0.56), W * 0.8, H * 0.5, D * 0.06, 0, 0.08);
  }
  if (d.epaulets) for (const sx of [-1, 1]) g.box(d.epaulets, sx * W * 0.38, H * 0.98, 0, W * 0.26, 0.03 * s, D * 0.6, 0, 0, sx * -0.35);
  if (d.badge) g.box(d.badge, -W * 0.2, H * 0.72, D * 0.5, 0.07 * s, 0.09 * s, 0.03 * s);
  if (d.chain) g.add(PRIM.torus(), d.chain, mat(0, H * 0.9, D * 0.22, Math.PI / 2 - 0.5, 0, 0, W * 0.42, D * 0.8, 0.06 * s));
  if (d.pinafore && d.dress) {
    // White blouse showing at the collar.
    g.box(d.shirt, 0, H * 0.9, D * 0.45, W * 0.28, H * 0.18, D * 0.1, 0, -0.2);
  }
}

// The text on a single band's front (`bib`: the rollerskier's ESLÖV): a strip of the band's elliptic
// cylinder just outside it, `BIB_ARC` rad round the front, the letters on a transparent canvas and
// unlit, like the town's signs (no outline). One texture per text and colour (`bibC`, default blue;
// the travel agent's SUNTRIP is red, §10.23).
const BIB_H = 0.2, BIB_ARC = 1.9;
const _bibTex = {};
function bibMesh(d, T) {
  const { H, W, D } = T;
  const fg = d.bibC ?? '#1b3a8a', key = d.bib + fg;
  let tex = _bibTex[key];
  if (!tex) {
    tex = _bibTex[key] = new THREE.CanvasTexture(textCanvas(d.bib, 0.46, 0.12, { bg: null, fg, border: null, scale: 0.86, ppm: 640 }));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
  }
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1, true, -BIB_ARC / 2, BIB_ARC), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.position.y = H * 0.55;
  m.scale.set(W * 1.04 * 1.03, H * BIB_H * 0.9, D * 1.06 * 1.06);
  return m;
}

// Confetti / dots / floral / check on the shirt (front, sides and back). Under a suit jacket or a
// vest the shirt only shows in front (the jacket's V, tipped back 0.18 rad, or the vest's opening;
// see torsoParts), so the print does too: a few dots there, in the print colours that differ from
// the shirt's. FRONT_DOTS are fractions of that panel's half width and half height.
const FRONT_DOTS = [[-0.47, 0.7], [0.4, 0.4], [-0.2, 0.05], [0.47, -0.3], [-0.4, -0.6], [0.13, -0.88]];
function printParts(g, d, T, lo = false) {
  const { H, W, D, s } = T;
  const cols = d.print, style = d.printStyle || 'confetti';
  if (d.suit || d.vest) {
    const vc = cols.filter((c) => c !== (d.suit ?? d.shirt));
    if (!vc.length) vc.push(WHITE);
    // Panel: pivot y/z, its front face's offset, tilt, half height, half width.
    const [cy, cz, fz, tilt, hh, hw] = d.suit ? [H * 0.78, D * 0.48, D * 0.05, 0.18, H * 0.17, W * 0.15] : [H * 0.6, D * 0.52, D * 0.06, 0, H * 0.28, W * 0.1];
    const cs = Math.cos(tilt), sn = Math.sin(tilt), zl = fz + 0.004 * s;
    FRONT_DOTS.forEach(([xf, yf], k) => {
      const yl = yf * hh;
      g.cyl(vc[k % vc.length], xf * hw, cy + yl * cs + zl * sn, cz - yl * sn + zl * cs, W * 0.035, 0.012 * s, 8, Math.PI / 2 - tilt);
    });
    return;
  }
  if (lo) {
    for (let k = 0; k < 8; k++) { const [x, z, ry] = onTorso(T, -1.2 + k * 0.34, H * (0.45 + (k % 2) * 0.22)); g.sphere(cols[k % cols.length], x, H * (0.45 + (k % 2) * 0.22), z, W * 0.16, W * 0.16, 0.03, 0, ry, 0, 6); }
    return;
  }
  const r = mulberry32(((d.shirt ?? 0) & 0xffff) + cols.length * 131);
  if (style === 'check') {
    for (let row = 0; row < 5; row++) for (let k = 0; k < 14; k++) {
      if ((row + k) % 2) continue;
      const a = (k / 14) * Math.PI * 2, y = H * (0.3 + row * 0.13);
      const [x, z, ry] = onTorso(T, a, y);
      g.box(cols[(row >> 1) % cols.length], x, y, z, W * 0.2, H * 0.12, 0.02 * s, ry);
    }
    return;
  }
  const n = (style === 'dots' ? 22 : 28) >> (d.name === 'ped' ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const a = r() * Math.PI * 2, y = H * (0.3 + r() * 0.6);
    const [x, z, ry] = onTorso(T, a, y);
    const c = cols[k % cols.length];
    if (style === 'floral') {
      // Four petals (flat squares turned on the surface) round a round centre.
      const rr = W * (0.07 + r() * 0.05), a0 = r() * Math.PI;
      for (let p = 0; p < 5; p++) { const pa = a0 + (p / 5) * Math.PI * 2; g.cyl(c, x + Math.cos(ry) * Math.cos(pa) * rr * 0.5, y + Math.sin(pa) * rr * 0.5, z - Math.sin(ry) * Math.cos(pa) * rr * 0.5, rr * 0.36, 0.016 * s, 6, Math.PI / 2, ry); }
      g.cyl(cols[(k + 1) % cols.length], x, y, z, rr * 0.3, 0.026 * s, 6, Math.PI / 2, ry);
    } else {
      const rr = style === 'dots' ? W * 0.08 : W * (0.07 + r() * 0.09);
      g.cyl(c, x, y, z, rr / 2, 0.022 * s, style === 'dots' ? 8 : 5, Math.PI / 2, ry);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Hand-held props (DESIGN §14.6 `held`, and the props of the anim flags). Built once per kind,
// shared geometry; each character gets its own mesh lazily, parented to the hips. Origin = grip.

const PROP_GEO = {
  camera(g) {   // Herr Storch's Super 8, lens cap on
    g.box(0x3a3a40, 0, 0.1, 0, 0.12, 0.15, 0.28);
    g.box(0x2a2a30, 0, 0.0, -0.02, 0.06, 0.16, 0.08, 0, 0.3);
    g.cyl(0x1d1d22, 0, 0.11, 0.2, 0.055, 0.14, 12, Math.PI / 2);
    g.cyl(0xc8ccd2, 0, 0.11, 0.17, 0.065, 0.03, 12, Math.PI / 2);
    g.cyl(0x101014, 0, 0.11, 0.28, 0.062, 0.03, 12, Math.PI / 2);
    g.box(0x1d1d22, 0, 0.2, -0.12, 0.06, 0.06, 0.12);
  },
  boombox(g) {  // Ole's giant black "bergsprängare": chrome speaker rims and centres, a silver deck
    g.box(0x1d1d22, 0, -0.03, 0, 0.08, 0.06, 0.34);
    for (const z of [-0.15, 0.15]) g.box(0x1d1d22, 0, -0.06, z, 0.06, 0.08, 0.04);
    g.box(0x2a2a30, 0, -0.27, 0, 0.18, 0.36, 0.7);
    for (const sx of [-1, 1]) for (const z of [-0.2, 0.2]) {
      g.cyl(0x8a8f99, sx * 0.086, -0.28, z, 0.13, 0.03, 14, 0, 0, Math.PI / 2);
      g.cyl(0x1d1d22, sx * 0.09, -0.28, z, 0.12, 0.03, 14, 0, 0, Math.PI / 2);
      g.cyl(0x8a8f99, sx * 0.1, -0.28, z, 0.045, 0.03, 10, 0, 0, Math.PI / 2);
    }
    for (const sx of [-1, 1]) g.box(0x8a8f99, sx * 0.09, -0.3, 0, 0.02, 0.1, 0.14);
    g.box(0xd8321e, 0.09, -0.14, -0.26, 0.02, 0.03, 0.06);
  },
  accordion(g) {
    for (const sx of [-1, 1]) g.box(0xc8202a, sx * 0.2, 0, 0, 0.1, 0.4, 0.24);
    for (let k = 0; k < 7; k++) g.box(k % 2 ? 0x2a2a30 : 0xf4f0e6, -0.13 + k * 0.043, 0, 0, 0.04, 0.37, 0.22);
    for (let k = 0; k < 5; k++) g.box(0xf4f4f0, 0.255, 0.14 - k * 0.07, 0.05, 0.02, 0.045, 0.1);
    for (let k = 0; k < 6; k++) g.sphere(0xf4f0e6, -0.255, 0.12 - (k % 3) * 0.09, (k < 3 ? -0.05 : 0.05), 0.035);
  },
  congas(g) {
    for (const sx of [-1, 1]) {
      g.add(frustum(0.82), 0xb8743a, mat(sx * 0.2, -0.36, 0, 0, 0, 0, 0.36, 0.7, 0.36));
      g.cyl(0xf0e2c0, sx * 0.2, 0.0, 0, 0.16, 0.04, 14);
      for (const y of [-0.08, -0.6]) g.add(PRIM.torus(), 0xd8c8a0, mat(sx * 0.2, y, 0, Math.PI / 2, 0, 0, y > -0.3 ? 0.31 : 0.36, y > -0.3 ? 0.31 : 0.36, 0.3));
    }
    g.box(0x6a4a2a, 0, -0.1, 0, 0.12, 0.04, 0.05);
  },
  cup(g) {
    g.add(frustum(1.3), 0xf4f4f0, mat(0, 0.08, 0, 0, 0, 0, 0.12, 0.18, 0.12));
    g.cyl(0xf7a21b, 0, 0.165, 0, 0.074, 0.01, 12);
  },
  mirror(g) {
    g.cyl(0xd8a83a, 0, -0.08, 0, 0.025, 0.18, 8);
    g.cyl(0xd8a83a, 0, 0.12, 0, 0.14, 0.03, 18, Math.PI / 2);
    g.cyl(0xcfe8f8, 0, 0.12, 0.012, 0.12, 0.02, 18, Math.PI / 2);
  },
  broom(g) {    // Städerskan's green broom; bristles near the ground
    g.cyl(0x2f8a3a, 0, -0.3, 0, 0.025, 1.6, 8);
    g.box(0x2f8a3a, 0, -1.06, 0, 0.36, 0.08, 0.1);
    for (let k = 0; k < 7; k++) g.box(0x9adf6a, -0.15 + k * 0.05, -1.14, 0, 0.035, 0.12, 0.08);
  },
  giraffe(g) {  // the plastic giraffe (Majsan's Christmas present)
    const Y = 0xf2c12e, Br = 0x9a5a22;
    g.sphere(Y, 0, 0, 0, 0.3, 0.2, 0.42);
    for (const x of [-0.07, 0.07]) for (const z of [-0.12, 0.12]) g.cyl(Y, x, -0.17, z, 0.025, 0.2, 6);
    g.cyl(Y, 0, 0.2, 0.17, 0.035, 0.38, 8, 0.35);
    g.sphere(Y, 0, 0.4, 0.26, 0.11, 0.1, 0.17);
    for (const x of [-0.03, 0.03]) g.cyl(Br, x, 0.48, 0.24, 0.01, 0.07, 5);
    g.sphere(Br, 0, 0.39, 0.35, 0.06, 0.05, 0.04);
    const r = mulberry32(5);
    for (let k = 0; k < 9; k++) { const a = r() * 6.28; g.sphere(Br, Math.sin(a) * 0.14, 0.04 + (r() - 0.5) * 0.1, Math.cos(a) * 0.18 * r(), 0.05, 0.05, 0.05); }
    g.cone(Y, 0, 0.02, -0.24, 0.02, 0.12, 5, -1.9);
  },
  butterKnife(g) {
    g.box(0x8a5a32, 0, 0, 0, 0.03, 0.03, 0.1);
    g.box(0xd8dce0, 0, 0, 0.11, 0.035, 0.008, 0.13);
  },
  lappblock(g) {   // Majsan's pad of parking tickets (anim.ticket, game/lapplisa.js): yellow slips on a card back
    g.box(0x8a6a4a, 0, 0.0, 0, 0.17, 0.24, 0.02);
    g.box(0xf7d84a, 0, 0.005, 0.016, 0.15, 0.21, 0.014);
    g.box(0x1d1426, 0, 0.06, 0.024, 0.1, 0.012, 0.002);
    g.box(0x1d1426, 0, 0.03, 0.024, 0.11, 0.008, 0.002);
  },
  penna(g) {       // her pen
    g.cyl(0x2a4a8a, 0, 0.02, 0, 0.012, 0.15, 6);
    g.cone(0xd8dce0, 0, -0.07, 0, 0.012, 0.03, 6, Math.PI);
  },
  knacke(g) {   // a SPORT-KNÄCKE pack in the hand
    g.box(0xe8b04a, 0, 0.0, 0, 0.26, 0.1, 0.07);
    g.box(0xd8321e, 0, 0.0, 0.036, 0.22, 0.03, 0.005);
    g.box(0xf4f0e6, 0.08, 0.025, 0.036, 0.05, 0.03, 0.005);
  },
  handbag(g) {
    g.add(PRIM.torus(), 0x141414, mat(0, -0.02, 0, 0, Math.PI / 2, 0, 0.18, 0.2, 0.2));
    g.box(0x1d1d22, 0, -0.17, 0, 0.12, 0.2, 0.28);
    g.box(0xd8a83a, 0.065, -0.1, 0, 0.01, 0.03, 0.06);
  },
  shoe(g) {
    g.sphere(0x3a2618, 0, -0.04, 0.05, 0.15, 0.11, 0.28);
    g.box(0x1d1410, 0, -0.09, 0.05, 0.14, 0.03, 0.26);
  },
  sock(g) {     // grey wool sock over the foot (origin at the foot)
    g.sphere(0xb8b4a8, 0, 0, 0, 0.19, 0.15, 0.33);
    g.cyl(0xb8b4a8, 0, 0.1, -0.05, 0.08, 0.2, 8);
  },
  kalkylator(g) {  // Ole's calculator with an alarm (anim.calc, the nap in room 107): black, a green display
    g.box(0x1d1d22, 0, 0, 0, 0.15, 0.25, 0.045);
    g.box(0x9fe0a0, 0, 0.065, 0.024, 0.115, 0.055, 0.006);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g.box(r === 2 && c === 2 ? 0xf07a1e : 0xc8c8c0, -0.04 + c * 0.04, -0.012 - r * 0.036, 0.024, 0.026, 0.022, 0.006);
  },
  scoreCard(g) {   // the sisters' score card on a stick (anim.card; the number is a face, cardFace)
    g.cyl(0x8a5a32, 0, 0.06, 0, 0.018, 0.22, 6);
    g.box(0xf4f0e6, 0, 0.36, 0, 0.6, 0.42, 0.03);
  },
  // The rollerskier's kit (anim.ski). A red rollerski: origin at the shoe's sole, the binding under
  // it, a black wheel at each end down to `SKI_LIFT` under the sole.
  skiR: rollerski, skiL: rollerski,
  // A pole: the grip at the origin, the shaft down -y to the hard tip `POLE_LEN` below it.
  poleR: skiPole, poleL: skiPole,
};
function rollerski(g) {
  g.box(0xd8321e, 0, -0.025, 0.02, 0.075, 0.03, 0.74);
  g.box(0x1d1d22, 0, -0.004, 0.04, 0.09, 0.03, 0.17);
  for (const z of [-0.31, 0.35]) g.cyl(0x1d1d22, 0, -0.065, z, 0.045, 0.05, 10, 0, 0, Math.PI / 2);
}
function skiPole(g) {
  g.cyl(0x1d1d22, 0, 0.02, 0, 0.024, 0.15, 8);
  g.cyl(0xc8ccd2, 0, -0.64, 0, 0.012, 1.2, 6);
  g.cyl(0x1d1d22, 0, -1.25, 0, 0.032, 0.012, 8);
  g.cone(0x5a6068, 0, -1.29, 0, 0.013, 0.06, 5, Math.PI);
}
const SKI_LIFT = 0.11, POLE_LEN = 1.32;
const _propCache = {};
// The number on a score card (`anim.card`, a string such as '10' or '–1'): a plane on each side of
// the board, its texture drawn once per number.
const _cardTex = {};
function cardFace(p, text) {
  let f = p.userData.face;
  if (!f) {
    f = p.userData.face = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.38), new THREE.MeshBasicMaterial());
    f.position.set(0, 0.36, 0.0165);
    const back = new THREE.Mesh(f.geometry, f.material);
    back.rotation.y = Math.PI;
    back.position.z = -0.033;
    f.add(back);
    p.add(f);
  }
  if (f.userData.text !== text) {
    f.userData.text = text;
    let t = _cardTex[text];
    if (!t) {
      t = _cardTex[text] = new THREE.CanvasTexture(textCanvas(text, 0.56, 0.38, { bg: '#fffdf4', fg: '#1d1426', border: '#1d1426', scale: 0.86, ppm: 400 }));
      t.colorSpace = THREE.SRGBColorSpace;
    }
    f.material.map = t;
    f.material.needsUpdate = true;
  }
}
function propMesh(name) {
  let c = _propCache[name];
  if (!c) {
    const g = new CharBuilder();
    PROP_GEO[name](g);
    const geo = g.build();
    c = _propCache[name] = { geo, out: outlineGeometry(geo) };
  }
  const mesh = new THREE.Mesh(c.geo, MAT.toon);
  mesh.castShadow = true;
  const o = new THREE.Mesh(c.out, outlineMat(0.018));
  o.name = 'outline';
  mesh.add(o);
  return mesh;
}
function prop(m, name, parent = m.hips) {
  let p = m.props[name];
  if (!p) {
    p = m.props[name] = propMesh(name);
    p.scale.setScalar(m.s);
    parent.add(p);
  }
  p.visible = true;
  p.userData.used = true;
  return p;
}

// ---------------------------------------------------------------------------------------------

export function buildCharacter(d) {
  const s = d.scale || 1;
  const m = { def: d, root: new THREE.Group(), meshes: [], phase: Math.random() * 6, squash: 0, talkT: 0, props: {}, s };
  const body = new THREE.Group();
  m.root.add(body);
  m.body = body;
  const add = (parent, geo, outline = OUT) => {
    const mesh = toonMesh(geo, { outline, material: MAT.toon });
    parent.add(mesh);
    m.meshes.push(mesh);
    return mesh;
  };

  const wide = d.wide || 1;
  const legLen = 0.86 * s * (d.legK || 1);
  const torsoH = 0.66 * s, torsoW = 0.5 * s * wide, torsoD = 0.3 * s * (wide > 1 ? 1 + (wide - 1) * 0.8 : wide);
  const armLen = 0.66 * s * (d.armK || 1);
  const R = (d.headR || 0.25) * s;
  const neckH = 0.12 * s * (d.neckK || 1);
  const T = { H: torsoH, W: torsoW, D: torsoD, s };

  const hips = new THREE.Group();
  hips.position.y = legLen;
  body.add(hips);
  m.hips = hips;

  // Torso (+ the skirt and coat tails, which hang from the hips and do not swing with the legs).
  // The prints (shirt and dress) are a second mesh without an outline.
  {
    const g = new CharBuilder(), pg = new CharBuilder();
    torsoParts(g, d, T, false, pg);
    if (d.dress) {
      const len = legLen * (d.pinafore ? 0.48 : 0.56);
      fru(g, d.dress, 0, torsoH * 0.2 - len / 2, 0, torsoW * 0.5, torsoW * 0.66, torsoH * 0.4 + len, 16);
      const sp = d.skirtPrint ?? d.print;
      if (sp && d.printStyle !== 'check') {
        // Flat dots lying on the (round) cone: its radius grows from 0.5 W at the top (torsoH 0.4)
        // to 0.66 W at the hem (-len).
        const r = mulberry32(d.dress & 0xffff), top = torsoH * 0.4, h = top + len;
        for (let k = 0; k < 16; k++) {
          const a = r() * Math.PI * 2, f = r(), y = torsoH * 0.1 - f * len, rr = torsoW * (0.5 + 0.16 * (top - y) / h) + 0.004 * s;
          pg.cyl(sp[k % sp.length], Math.sin(a) * rr, y, Math.cos(a) * rr, torsoW * 0.07, 0.012 * s, 8, Math.PI / 2, a);
        }
      }
      if (d.apron) g.box(d.apron, 0, -len * 0.35, torsoW * 0.62, torsoW * 0.8, len * 0.72, 0.03, 0, 0.1);
    }
    if (d.coat) {
      // Long coat tails: a flared skirt of the coat colour down to the knees, open at the front.
      const len = legLen * 0.52, h = len + torsoH * 0.3, cz = d.belly ? torsoD * 0.08 : 0;
      g.add(frustum(0.8), d.shirt, mat(0, torsoH * 0.3 - h / 2, cz, 0, 0, 0, torsoW * 1.18, h, torsoD * 1.5 + cz * 2));
      g.box(shade(d.shirt, 0.55), 0, torsoH * 0.3 - h / 2 - len * 0.1, torsoD * 0.72 + cz * 1.5, 0.03 * s, h * 0.8, 0.03 * s, 0, 0.12);
      for (let k = 0; k < 3; k++) g.sphere(shade(d.shirt, 0.6), torsoW * 0.06, torsoH * (0.32 + k * 0.16), torsoD * 0.5 + (d.belly ? torsoD * 0.18 : 0), 0.03 * s);
    }
    add(hips, g.build());
    if (!pg.empty) hips.add(toonMesh(pg.build(), { outline: 0, cast: false }));
    if (d.bib && d.stripe && !d.stripes) hips.add(bibMesh(d, T));
  }
  // Head on a neck pivot.
  const neck = new THREE.Group();
  neck.position.y = torsoH + 0.03 * s;
  hips.add(neck);
  m.neck = neck;
  let headTopLocal;
  {
    // Head and neck in one mesh (the neck drawn in the head's frame).
    const headY = R * 0.95 + neckH * 0.33;
    const hg = new CharBuilder();
    hg.cyl(d.skin, 0, neckH * 0.25 - headY, 0, 0.07 * s * Math.min(1.3, wide), neckH, 8);
    headParts(hg, d, R);
    const hgeo = hg.build();
    const head = add(neck, hgeo);
    head.position.y = headY;
    m.head = head;
    headTopLocal = head.position.y + hgeo.boundingBox.max.y;
    const mouth = new THREE.Mesh(mouthGeo(R, d.mouthW || 1), MAT.mouth);
    mouth.position.set(0, -R * 0.5, R * 0.8);
    mouth.scale.y = 0.3;
    head.add(mouth);
    m.mouth = mouth;
    m.R = R;
  }
  m.headTop = legLen + neck.position.y + headTopLocal;
  m.height = m.headTop;

  // Arms on shoulder pivots, hanging down. arms[0] = right (-x), arms[1] = left (+x).
  m.arms = [];
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(side * (torsoW / 2 + 0.05 * s), torsoH * 0.88, 0);
    hips.add(piv);
    const g = new CharBuilder();
    const sleeve = d.longSleeves ? d.shirt : d.skin;
    g.add(PRIM.capsule(), d.shirt, mat(0, -armLen * 0.22, 0, 0, 0, 0, 0.16 * s, armLen * 0.22, 0.16 * s));
    g.add(PRIM.capsule(), sleeve, mat(0, -armLen * 0.62, 0, 0, 0, 0, 0.11 * s, armLen * 0.3, 0.11 * s));
    if (d.longSleeves && !d.hands) g.cyl(shade(d.shirt, d.suit ? 1 : 0.9), 0, -armLen * 0.86, 0, 0.065 * s, 0.05 * s, 8);
    if (d.suit && d.longSleeves) g.cyl(d.suit, 0, -armLen * 0.9, 0, 0.06 * s, 0.04 * s, 8);
    g.sphere(d.hands ?? d.skin, 0, -armLen - 0.02 * s, 0, 0.15 * s);
    // Stig's Nordic-pattern mittens: a coloured band round the white mitten.
    if (d.hands && d.mittenBand) g.cyl(d.mittenBand, 0, -armLen - 0.01 * s, 0, 0.077 * s, 0.035 * s, 10);
    add(piv, g.build());
    m.arms.push(piv);
  }
  // Legs.
  m.legs = [];
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(side * torsoW * 0.24, legLen, 0);
    body.add(piv);
    const g = new CharBuilder();
    const bare = d.legsC ?? d.skin;
    const legC = d.shorts || d.dress ? bare : d.pants;
    g.add(PRIM.capsule(), legC, mat(0, -legLen * 0.5, 0, 0, 0, 0, 0.15 * s, legLen * 0.38, 0.15 * s));
    if (d.shorts) {
      const b = d.baggy ? 1.35 : 1;
      g.add(PRIM.capsule(), d.pants, mat(0, -legLen * (d.baggy ? 0.2 : 0.14), 0, 0, 0, side * 0.05, 0.2 * s * b, legLen * (d.baggy ? 0.2 : 0.15), 0.2 * s * b));
      // A trim band where the leg's straight part ends (Lasse's jul shorts "med vit kant").
      if (d.shortsHem) g.cyl(d.shortsHem, 0, -legLen * (d.baggy ? 0.3 : 0.215), 0, 0.1 * s * b + 0.006 * s, 0.04 * s, 12, 0, 0, side * 0.05);
      g.cyl(0xffffff, 0, -legLen * 0.84, 0, 0.082 * s, 0.14 * s, 8);
    } else if (!d.dress) {
      // A 1970s flare at the ankle.
      g.add(frustum(0.7), d.pants, mat(0, -legLen * 0.86, 0, 0, 0, 0, 0.2 * s, legLen * 0.14, 0.2 * s));
    }
    g.sphere(d.shoes, 0, -legLen + 0.05 * s, 0.06 * s, 0.17 * s, 0.13 * s, 0.3 * s);
    add(piv, g.build());
    m.legs.push(piv);
  }
  m.legLen = legLen;
  m.armLen = armLen;
  m.torsoH = torsoH; m.torsoW = torsoW; m.torsoD = torsoD;
  return m;
}

// ---------------------------------------------------------------------------------------------
// Pose the model for this frame.
//   st: { speed, air, vy, kick (0..1), talk, seated, flung, down, wave, cheer, t, sprint, yell,
//         lie ({ lean, arms, tilt, lift, roll?, turn? } on a sun lounger or the sand, else null),
//         + the anim flags (character.js ANIM_FLAGS) }

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), DOWN = new THREE.Vector3(0, -1, 0);

export function animateCharacter(m, st, dt) {
  const t = st.t;
  const legs = m.legs, arms = m.arms;
  m.phase += Math.min(st.speed, 12) * dt * (m.legLen > 0.7 ? 2.4 : 3.4);
  const sp = Math.min(1, st.speed / 6);
  const swing = Math.sin(m.phase) * (0.25 + sp * 0.75) * Math.min(1, st.speed * 0.6);
  const bob = Math.abs(Math.sin(m.phase)) * 0.06 * sp;
  m.squash = Math.max(0, m.squash - dt * 4);
  const sq = 1 - Math.sin(m.squash * Math.PI) * 0.18;
  m.body.scale.set(2 - sq, sq, 2 - sq);
  m.body.rotation.set(0, 0, 0);
  m.hips.rotation.set(0, 0, 0);
  m.neck.rotation.set(0, 0, 0);

  if (st.seated) {
    m.body.position.y = 0;
    // Plane seats: legs angled down to the floor (single-segment legs have no knees); car seats: out
    // into the footwell.
    for (const l of legs) l.rotation.set(st.planeSeat ? -1.18 : -1.45, 0, 0);
    arms[0].rotation.set(-1.15 + Math.sin(t * 3) * 0.04, 0, 0.18);
    arms[1].rotation.set(-1.15 - Math.sin(t * 3) * 0.04, 0, -0.18);
  } else if (st.lie) {
    // On a sun lounger (Character.lieAt): the root leans back `lean` on the backrest (flat on the
    // sand: −π/2), the legs lie straight along the bed, toes up; the arms at his sides, the hands on
    // his belly or as given, the head tipped `tilt` to a side and turned `turn` (asleep, `slump`:
    // lolling, the mouth open). `lift` (0..1) raises the head off the backrest.
    const L = st.lie, k = -Math.PI / 2 - L.lean, br = Math.sin(t * 1.4) * 0.012;
    m.body.position.y = 0;
    m.hips.rotation.x = br;
    legs[0].rotation.set(k, 0, -0.06); legs[1].rotation.set(k + 0.03, 0, 0.07);
    if (L.arms === 'belly') { arms[0].rotation.set(-0.72, 0, 0.32); arms[1].rotation.set(-0.72, 0, -0.32); }   // the hands folded on the belly
    else if (Array.isArray(L.arms)) { arms[0].rotation.set(...L.arms[0]); arms[1].rotation.set(...L.arms[1]); }   // [right, left] as given (two in each other's arms on the sand, game/beachDream.js)
    else { arms[0].rotation.set(0.12, 0, -0.3); arms[1].rotation.set(0.12, 0, 0.3); }
    const lift = L.lift || 0;
    m.neck.rotation.set(-0.1 - br + 0.55 * lift, L.turn || 0, ((st.slump ? 0.45 : 0) + (L.tilt || 0)) * (1 - lift));
    // `roll`: turned onto his side about his own long axis (+: his front towards his left).
    if (L.roll) m.body.rotation.y = L.roll;
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
    m.hips.rotation.x = sp * (st.sprint ? 0.22 : 0.1);
    legs[0].rotation.set(swing, 0, 0);
    legs[1].rotation.set(-swing, 0, 0);
    const idle = st.speed < 0.2 ? Math.sin(t * 2.2) * 0.04 : 0;
    arms[0].rotation.set(-swing * 1.1, 0, -0.12 - idle);
    arms[1].rotation.set(swing * 1.1, 0, 0.12 + idle);
    // Talking while standing: the left hand gestures.
    if (st.talk && st.speed < 0.3) arms[1].rotation.set(-0.55 - Math.sin(t * 4.3) * 0.25, 0, 0.3 + Math.sin(t * 2.7) * 0.12);
    if (st.wave) arms[1].rotation.set(-0.3, 0, 2.6 + Math.sin(t * 9) * 0.35);
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
  for (const k in m.props) m.props[k].userData.used = false;
  if (!st.flung && !st.down) {
    heldPose(m, st, t);
    poseFlags(m, st, t);
    heldPose(m, st, t, true);
  }
  for (const k in m.props) if (!m.props[k].userData.used) m.props[k].visible = false;
  // Eyes shut (Levander's "Slut ögonen.", the exercise on the lighthouse gallery, game/lighthouse.js):
  // the lids are made the first time they are wanted, then shown or hidden.
  if (st.eyesShut && !m.lids) m.lids = lids(m);
  if (m.lids) m.lids.visible = !!st.eyesShut;
  m.neck.rotation.y += st.look || 0;
  // The big mouth.
  if (m.mouth) {
    let target = st.talk ? 0.35 + Math.abs(Math.sin(t * 17 + Math.sin(t * 5) * 2)) * 0.95 : st.flung || st.yell || st.flail ? 1.1 : 0.32;
    if (st.laugh) target = 0.8 + Math.abs(Math.sin(t * 14)) * 0.5;
    if (st.slump && !st.talk) target = 0.55;
    m.mouth.scale.y += (target - m.mouth.scale.y) * Math.min(1, dt * 25);
  }
}

// Shut eyelids over the eyes (headParts' whites and pupils): a skin dome over each, with a dark
// lash line across its lower half; a child of the head, built only for a body that shuts its eyes.
function lids(m) {
  const d = m.def, R = m.R, g = new CharBuilder();
  for (const s of [-1, 1]) {
    g.sphere(d.skin, s * R * 0.36, R * 0.22, R * 0.84, R * 0.42, R * 0.5, R * 0.26);
    g.box(INK, s * R * 0.36, R * 0.14, R * 0.97, R * 0.34, R * 0.05, R * 0.04, 0, 0, s * 0.12);
  }
  const mesh = toonMesh(g.build(), { outline: 0, material: MAT.toon, cast: false });
  m.head.add(mesh);
  return mesh;
}

// Hand position (hips frame) of arm i, into out.
function hand(m, i, out) {
  const a = m.arms[i];
  return out.set(0, -m.armLen - 0.02 * m.s, 0).applyEuler(a.rotation).add(a.position);
}
// Put prop p in hand i (+ an offset in the hips frame), upright, facing yaw ry.
function inHand(m, p, i, dx = 0, dy = 0, dz = 0, rx = 0, ry = 0, rz = 0) {
  hand(m, i, _v);
  p.position.set(_v.x + dx * m.s, _v.y + dy * m.s, _v.z + dz * m.s);
  p.rotation.set(rx, ry, rz);
}
function between(m, p, dx = 0, dy = 0, dz = 0) {
  hand(m, 0, _v); hand(m, 1, _w);
  p.position.set((_v.x + _w.x) / 2 + dx * m.s, (_v.y + _w.y) / 2 + dy * m.s, (_v.z + _w.z) / 2 + dz * m.s);
  p.rotation.set(0, 0, 0);
}

// Which arms a held item takes (R = arms[0], L = arms[1]).
const HELD_ARMS = { camera: 'R', boombox: 'R', cup: 'R', mirror: 'R', broom: 'R', giraffe: 'R', butterKnife: 'R', knacke: 'R', handbag: 'L', accordion: 'RL', congas: 'RL' };

// The def's held item, in two passes: before the anim flags it poses the holding arm (unless a
// flag takes the hands); after them (place = true) it puts the prop in the final hand position.
function heldPose(m, st, t, place = false) {
  const h = m.def.held;
  if (!h || !PROP_GEO[h]) return;
  const [R, L] = m.arms;
  const busy = st.wings || st.cupUp || st.cupHeld || st.push || st.rub || st.hold || st.flail || st.oath || st.dance || st.laugh || st.mirror || st.film || st.camShow || st.giraffe || st.butterKnife || st.ticket || st.carryOver || st.shoeOff || st.calc || st.groda || st.placate || st.tap || st.scratch || st.cheer || st.wave || st.kick > 0;
  const pose = !place && !busy;
  const moving = st.speed > 0.3;
  switch (h) {
    case 'camera':
      if (st.film || st.camShow) return;   // the film flag lifts it to the eye; camShow holds it out
      if (pose) R.rotation.set(st.seated ? -1.0 : -0.8, 0, 0.32);
      if (place) inHand(m, prop(m, 'camera'), 0, 0, -0.02, 0.02);
      break;
    case 'boombox':
      if (st.seated) {
        // In a seat (Ole's flygRadio on the plane): on his lap, the speakers to the front, a hand on
        // it (hanging at his side it sank into the next seat).
        if (pose) R.rotation.set(-0.95, 0, 0.3);
        if (place) { const p = prop(m, 'boombox'); p.position.set(0, m.torsoH * 0.7, m.torsoD * 0.5 + 0.12 * m.s); p.rotation.set(0, Math.PI / 2, 0); }
        break;
      }
      if (pose) R.rotation.set(moving ? -0.12 * Math.sin(m.phase) : 0, 0, -0.22);
      if (place) inHand(m, prop(m, 'boombox'), 0, 0, 0.0, 0);
      break;
    case 'accordion': {
      const pump = Math.sin(t * (moving ? 5 : 2.6));
      if (place) {
        const p = prop(m, 'accordion');
        p.position.set(0, m.torsoH * 0.6, m.torsoD * 0.5 + 0.16 * m.s);
        p.rotation.set(0, 0, 0);
        p.scale.set(m.s * (1 + pump * 0.14), m.s, m.s);
      }
      if (pose) { R.rotation.set(-0.62, 0, 0.42 - pump * 0.1); L.rotation.set(-0.62, 0, -0.42 + pump * 0.1); }
      break;
    }
    case 'congas': {
      if (place) {
        const p = prop(m, 'congas');
        p.position.set(0, m.torsoH * 0.12, m.torsoD * 0.5 + 0.24 * m.s);
        p.rotation.set(0.1, 0, 0);
      }
      if (pose) {
        const drum = st.seated ? 0 : moving ? 0 : 1;
        R.rotation.set(-0.72 - drum * Math.max(0, Math.sin(t * 9)) * 0.25, 0, 0.18);
        L.rotation.set(-0.72 - drum * Math.max(0, Math.sin(t * 9 + Math.PI)) * 0.25, 0, -0.18);
      }
      break;
    }
    case 'cup':
      if (pose) R.rotation.set(-0.95, 0, 0.25);
      if (place) inHand(m, prop(m, 'cup'), 0, 0, -0.02, 0);
      break;
    case 'mirror':
      if (st.mirror) return;   // the mirror flag holds it up
      if (pose) R.rotation.set(-0.9, 0, 0.2);
      if (place) inHand(m, prop(m, 'mirror'), 0, 0, 0, 0, 0, Math.PI, 0);
      break;
    case 'broom': {
      const sweep = moving ? 0 : Math.sin(t * 2.4);
      if (pose) R.rotation.set(-0.42, 0, 0.12 + sweep * 0.12);
      if (place) inHand(m, prop(m, 'broom'), 0, 0, 0, 0, 0.28, 0, sweep * 0.25);
      break;
    }
    case 'giraffe':
      if (st.giraffe) return;
      if (pose) R.rotation.set(-0.85, 0, 0.3);
      if (place) inHand(m, prop(m, 'giraffe'), 0, 0, 0.12, 0.05);
      break;
    case 'butterKnife':
      if (st.butterKnife) return;
      if (pose) R.rotation.set(-0.9, 0, 0.25);
      if (place) inHand(m, prop(m, 'butterKnife'), 0);
      break;
    case 'knacke':
      if (st.butterKnife) return;
      if (pose) R.rotation.set(-0.9, 0, 0.25);
      if (place) inHand(m, prop(m, 'knacke'), 0, 0, 0.02, 0.02);
      break;
    case 'handbag':
      if (pose) L.rotation.set(-0.15 + (moving ? 0.1 * Math.sin(m.phase) : 0), 0, 0.3);
      if (place) inHand(m, prop(m, 'handbag'), 1, 0, 0.02, 0);
      break;
    default:
  }
}

// Anim flags layered over the base pose (DESIGN §14.6). arms[0] is the right arm (-x).
function poseFlags(m, st, t) {
  const [R, L] = m.arms;
  const legs = m.legs, s = m.s;
  if (st.planeSeat && st.seated) {
    // Seated in a plane seat: forearms on the armrests (unless a hand holds something), breathing.
    const held = HELD_ARMS[m.def.held] || '';
    if (!held.includes('R')) R.rotation.set(-0.45, 0, -0.34);
    if (!held.includes('L')) L.rotation.set(-0.45, 0, 0.34);
    m.hips.rotation.x = -0.06 + Math.sin(t * 1.3) * 0.015;
  }
  if (st.push) {
    R.rotation.set(-1.3, 0, 0.14); L.rotation.set(-1.3, 0, -0.14);
    m.hips.rotation.x += 0.18;
  }
  if (st.rub) {
    // The sun cream (game/solkram.js): push's lean with the arms nearer level, so the hands rest on
    // the shoulders of someone shorter in front; 2 rubs them side to side together.
    const w = st.rub === 2 ? Math.sin(t * 8) * 0.1 : 0;
    R.rotation.set(-1.47, 0, 0.1 + w); L.rotation.set(-1.47, 0, -0.1 + w);
    m.hips.rotation.x += 0.18;
  }
  if (st.hold) {
    // Braced against turbulence: knees bent, arms out low, gripping.
    R.rotation.set(-0.4, 0, -0.9 + Math.sin(t * 21) * 0.03); L.rotation.set(-0.4, 0, 0.9 - Math.sin(t * 23) * 0.03);
    if (!st.seated) {
      m.body.position.y -= 0.1 * s;
      legs[0].rotation.set(-0.25, 0, -0.18); legs[1].rotation.set(-0.25, 0, 0.18);
      m.hips.rotation.x += 0.22;
      m.neck.rotation.x = -0.12;
    }
  }
  if (st.cupUp) R.rotation.set(-2.75, 0, -0.08);   // an empty hand up (the stowers at the rack, the carried juice)
  if (st.tap) { R.rotation.set(-1.05, 0, 0.16); m.neck.rotation.x = 0.26; }   // a pling on the reception's bell (game/receptionBell.js)
  if (st.scratch) {
    // Scratching his head (the officer at the church's sign, game/church.js): the right hand up at
    // the side of his head, rubbing, the head cocked towards it.
    R.rotation.set(-0.3, 0, -2.75 + Math.sin(t * 15) * 0.08);
    m.neck.rotation.z = 0.14; m.neck.rotation.x = 0.08;
  }
  if (st.cupHeld) {
    // A paper cup in the right hand: raised from a seat (Stig's "Ja." to the call button, §8.3),
    // held out to the row standing (the trolley stewardess serving); with `cupUp` raised standing
    // too (Stig under Viking Bar's lamp, §10.32).
    const up = st.seated || st.cupUp;
    R.rotation.set(up ? -2.75 : -1.65, 0, up ? -0.08 : 0.12);
    if (st.cupUp && !st.seated) m.neck.rotation.x = -0.3;   // and he looks up to it
    inHand(m, prop(m, 'cup'), 0, 0, 0.01, 0);
  }
  if (st.oath) {
    R.rotation.set(-0.15, 0, -2.85);
    L.rotation.set(-1.25, 0, -0.75);
    m.neck.rotation.x = -0.12;
  }
  if (st.wings) {
    // "Jag kan flyga, jag är inte rädd": arms straight out, chin up, a tiny tremble.
    R.rotation.set(0, 0, -1.55 + Math.sin(t * 2) * 0.03);
    L.rotation.set(0, 0, 1.55 - Math.sin(t * 2) * 0.03);
    m.neck.rotation.x = -0.15;
    if (!st.seated && st.speed < 0.3) m.body.rotation.z = Math.sin(t * 1.6) * 0.04;
  }
  if (st.glide) {
    // Gliding (game/glide.js; `wings` holds the arms): stiff as a plank, legs together, tipped a
    // little forward, rocking like a falling leaf and leaning into a turn (`bank`, + = his right).
    legs[0].rotation.set(0.06 + Math.sin(t * 7) * 0.04, 0, -0.03);
    legs[1].rotation.set(0.06 - Math.sin(t * 7) * 0.04, 0, 0.03);
    m.body.rotation.x = 0.28;
    m.body.rotation.z = Math.sin(t * 2.3) * 0.07 + (st.bank || 0);
  }
  if (st.swan) {
    // A swan dive off the diving board (game/poolJudges.js): arms straight out and a little back,
    // chin up, legs together, tipped forward towards the water. Only a look: it steers nothing.
    R.rotation.set(0.3, 0, -1.5); L.rotation.set(0.3, 0, 1.5);
    legs[0].rotation.set(0.12, 0, -0.03); legs[1].rotation.set(0.12, 0, 0.03);
    m.body.rotation.x = 0.5;
    m.neck.rotation.x = -0.35;
  }
  if (st.leap) {
    // Off the 10 m tower (game/diveTower.js): Levander's arms straight out (as `wings`, shaking a
    // little more), legs together, tipping forward as the fall gathers speed, so that he comes down
    // flat (the belly flop). Only a look: it steers nothing.
    const k = Math.min(1, Math.max(0, -st.vy) / 20);
    R.rotation.set(0, 0, -1.55 + Math.sin(t * 9) * 0.06); L.rotation.set(0, 0, 1.55 - Math.sin(t * 9) * 0.06);
    legs[0].rotation.set(0.08, 0, -0.03); legs[1].rotation.set(0.08, 0, 0.03);
    m.body.rotation.x = 1.3 * k;
    m.neck.rotation.x = -0.15 - 0.45 * k;
  }
  if (st.bomb) {
    // A cannonball (the stomp off the tower): knees up, arms round them, chin down.
    legs[0].rotation.set(-1.55, 0, -0.12); legs[1].rotation.set(-1.55, 0, 0.12);
    R.rotation.set(-1.05, 0, 0.42); L.rotation.set(-1.05, 0, -0.42);
    m.body.rotation.x = 0.3;
    m.neck.rotation.x = 0.25;
  }
  if (st.placate) {
    // A watchdog barking at him (game/dogs.js, §10.21). 1: "Fin hund…": both hands up by his head,
    // palms out, trembling, leaning back, his eyes on the dog; 2: up out of its reach, the mantra
    // with his arms straight out (as `wings`, which would stop him). Only a look: it steers nothing.
    if (st.placate === 2) {
      R.rotation.set(0, 0, -1.55 + Math.sin(t * 9) * 0.05); L.rotation.set(0, 0, 1.55 - Math.sin(t * 9) * 0.05);
      m.neck.rotation.x = -0.15;
    } else {
      R.rotation.set(-2.4 + Math.sin(t * 17) * 0.05, 0, -0.5); L.rotation.set(-2.4 - Math.sin(t * 19) * 0.05, 0, 0.5);
      if (!st.seated) m.body.rotation.x = -0.07;
      m.neck.rotation.x = 0.22;
    }
  }
  if (st.flail) {
    R.rotation.set(Math.sin(t * 14) * 0.8, 0, -1.9 - Math.sin(t * 11) * 0.5);
    L.rotation.set(-Math.sin(t * 13) * 0.8, 0, 1.9 + Math.sin(t * 12) * 0.5);
    m.neck.rotation.z = Math.sin(t * 17) * 0.12;
    if (!st.seated) {
      m.body.position.y += Math.abs(Math.sin(t * 15)) * 0.06;
      if (st.speed < 0.3) { legs[0].rotation.x = Math.sin(t * 15) * 0.35; legs[1].rotation.x = -Math.sin(t * 15) * 0.35; }
    }
  }
  if (st.dance) {
    // 1979 disco: point up, point down, hips swaying, stepping on the beat.
    const beat = Math.sin(t * 5.2), up = beat > 0;
    R.rotation.set(up ? -0.4 : 0.25, 0, up ? -2.7 : -0.35);
    L.rotation.set(up ? 0.2 : -0.5, 0, up ? 0.3 : 0.6 + Math.abs(beat) * 0.3);
    m.hips.rotation.z = Math.sin(t * 2.6) * 0.12;
    m.neck.rotation.z = -Math.sin(t * 2.6) * 0.1;
    if (!st.seated) {
      m.body.position.y = Math.abs(Math.sin(t * 5.2)) * 0.1 * s;
      m.body.rotation.y = Math.sin(t * 2.6) * 0.35;
      legs[0].rotation.set(Math.max(0, Math.sin(t * 5.2)) * -0.45, 0, -0.08);
      legs[1].rotation.set(Math.max(0, -Math.sin(t * 5.2)) * -0.45, 0, 0.08);
    }
  }
  if (st.groda) {
    // Små grodorna in Flamenco's pool (game/poolFest.js): 1 "öron", straight arms up beside the head
    // like a frog's ears; 2 "svansar", the hands behind at the seat; both crouched (the hips forward,
    // the legs apart and forward, the body low). 3 is Stig hopping with them, stiff as a stick: arms
    // pressed to his sides, legs straight together, chin up. The hop itself is `hop` below (Stig's is
    // a real jump).
    const k = st.groda;
    if (k === 3) {
      R.rotation.set(0.04, 0, -0.06); L.rotation.set(0.04, 0, 0.06);
      legs[0].rotation.set(0, 0, -0.02); legs[1].rotation.set(0, 0, 0.02);
      m.hips.rotation.x = 0;
      m.neck.rotation.x = -0.14;
    } else {
      if (k === 2) { R.rotation.set(0.85, 0, -0.32); L.rotation.set(0.85, 0, 0.32); }
      else { R.rotation.set(-0.22, 0, -2.75); L.rotation.set(-0.22, 0, 2.75); }
      legs[0].rotation.set(-0.38, 0, -0.22); legs[1].rotation.set(-0.38, 0, 0.22);
      m.hips.rotation.x += 0.3;
      m.neck.rotation.x = -0.25;
      m.body.position.y -= 0.08 * s;
    }
  }
  // A hop on the beat that is only a look (the ring in the pool): the whole body up `hop` m.
  if (st.hop) m.body.position.y += st.hop;
  if (st.laugh) {
    // Holding the belly, leaning back, shaking.
    R.rotation.set(-0.55, 0, 0.62);
    L.rotation.set(-0.55, 0, -0.62);
    m.hips.rotation.x -= 0.16;
    m.neck.rotation.x = -0.32;
    m.body.position.y += Math.abs(Math.sin(t * 16)) * 0.035 * s;
  }
  if (st.calc) {
    // Ole's calculator held up high, its alarm going (the nap in room 107, game/dayClock.js): the left
    // arm (the near one, as he stands at the bed's head facing Stig) up and a little forward, the
    // display to the front, a small shake.
    L.rotation.set(-0.45 + Math.sin(t * 13) * 0.05, 0, 2.55);
    m.neck.rotation.x = -0.12;
    inHand(m, prop(m, 'kalkylator'), 1, 0, 0.1, 0.04, 0.35, 0, 0);
  }
  if (st.card != null) {
    // A score card held out in the right hand, from shoulder to eye height and off to her right, under
    // her speech bubble (the sisters judging his dives, game/poolJudges.js); after `laugh`, which keeps
    // the other hand on the belly.
    R.rotation.set(-1.15, 0, -0.45);
    const p = prop(m, 'scoreCard');
    inHand(m, p, 0, 0, 0.02, 0);
    cardFace(p, st.card);
  }
  if (st.slump && !st.lie) {   // lying asleep: the lounger's pose has the head (animateCharacter)
    if (st.seated) {
      // Passed out: head lolling, arms hanging, legs loose.
      m.neck.rotation.set(0.45, 0, 0.5 + Math.sin(t * 0.9) * 0.08);
      R.rotation.set(0.15, 0, -0.08); L.rotation.set(0.1, 0, 0.08);
      legs[0].rotation.set(-1.0, 0, -0.15); legs[1].rotation.set(-0.8, 0, 0.18);
      m.hips.rotation.x = -0.15;
    } else {
      // Asleep on his feet: chin on chest, swaying, knees soft.
      m.neck.rotation.x = 0.75;
      m.hips.rotation.x = 0.22;
      m.body.rotation.z = Math.sin(t * 1.1) * 0.07;
      m.body.position.y -= 0.06 * s;
      R.rotation.set(0.2 + Math.sin(t * 1.1) * 0.08, 0, 0.05); L.rotation.set(0.2 - Math.sin(t * 1.1) * 0.08, 0, -0.05);
      if (st.speed < 0.3) { legs[0].rotation.set(-0.12, 0, 0); legs[1].rotation.set(-0.12, 0, 0); }
    }
  }
  if (st.carryOver) {
    // Fireman's carry: hands up by the shoulders holding the load, bent forward a little.
    R.rotation.set(-0.35, 0, -2.45); L.rotation.set(-0.35, 0, 2.45);
    m.hips.rotation.x += 0.2;
    m.neck.rotation.x = -0.2;
  }
  if (st.mirror) {
    // The porter shows the sea view: a hand mirror held far out to the side and up.
    R.rotation.set(-0.7, 0, -1.95);
    L.rotation.set(-0.2, 0, 0.35);
    m.hips.rotation.z = 0.12;
    m.neck.rotation.y = -0.65;
    m.neck.rotation.x = -0.15;
    // The glass (the prop's +z face) faces forward and a little out to his right, to the camera.
    inHand(m, prop(m, 'mirror'), 0, 0, 0.05, 0, 0, -0.3, 0);
  }
  if (st.film) {
    // Herr Storch filming (lens cap on): the Super 8 up at the eye, both hands on it.
    R.rotation.set(-1.95, 0, 0.62); L.rotation.set(-1.8, 0, -0.68);
    m.neck.rotation.x = 0.05;
    m.body.rotation.y = Math.sin(t * 0.8) * 0.3;
    const p = prop(m, 'camera');
    between(m, p, 0.0, 0.0, -0.06);
    p.rotation.y = 0;
  }
  if (st.camShow) {
    // Ole showing his camera (the gag at his bag, §10.32): held out in both hands at the chest,
    // the lens to the one he shows it to, his head bent to it.
    R.rotation.set(-1.25, 0, 0.5); L.rotation.set(-1.2, 0, -0.5);
    m.neck.rotation.x = 0.22;
    const p = prop(m, 'camera');
    between(m, p, 0.0, 0.04, 0.02);
    p.rotation.y = 0;
  }
  if (st.giraffe) {
    // Stig with the plastic giraffe, held up proudly.
    R.rotation.set(-1.55, 0, 0.52); L.rotation.set(-1.55, 0, -0.52);
    m.neck.rotation.x = -0.1;
    m.body.position.y += Math.abs(Math.sin(t * 4)) * 0.03 * s;
    between(m, prop(m, 'giraffe'), 0, 0.12, 0.08);
  }
  if (st.butterKnife) {
    R.rotation.set(-1.2, 0, 0.36); L.rotation.set(-1.0, 0, -0.42);
    m.neck.rotation.x = 0.28;
    inHand(m, prop(m, 'butterKnife'), 0, 0, 0.02, 0.02, -0.5 + Math.sin(t * 7) * 0.2, -0.2, 0);
    inHand(m, prop(m, 'knacke'), 1, 0, 0.03, 0.03, 0, 0.3, 0);
  }
  if (st.ticket) {
    // Majsan writing a parking ticket (game/lapplisa.js, §10.17): the pad held up in the left hand at
    // the chest, the pen scribbling over it in the right, her head bent to it.
    R.rotation.set(-1.25 + Math.sin(t * 11) * 0.06, 0, 0.5 + Math.sin(t * 7) * 0.05); L.rotation.set(-1.15, 0, -0.5);
    m.neck.rotation.x = 0.32;
    inHand(m, prop(m, 'lappblock'), 1, 0, 0.04, 0.05, -0.6, 0.5, 0);
    inHand(m, prop(m, 'penna'), 0, 0, 0.02, 0.03, 0.9, 0, 0.3);
  }
  if (st.ski) skiPose(m, st, t);
  if (st.shoeOff) {
    // At the arch: standing on one leg in a wool sock, the shoe in his hand.
    legs[0].rotation.set(0.95, 0, -0.1);
    legs[1].rotation.set(0, 0, 0.04);
    R.rotation.set(-0.5, 0, -0.95);
    L.rotation.set(0, 0, 1.15 + Math.sin(t * 6) * 0.08);
    m.body.rotation.z = Math.sin(t * 5) * 0.05;
    m.neck.rotation.x = 0.25;
    inHand(m, prop(m, 'shoe'), 0, 0, 0, 0, 0.2, -0.4, 0);
    const sock = prop(m, 'sock', legs[0]);
    sock.position.set(0, -m.legLen + 0.05 * s, 0.06 * s);
    sock.scale.setScalar(s);
  }
}

// The rollerskier (anim.ski, game/eslov.js): a red rollerski under each shoe (the body rides
// SKI_LIFT up on their wheels, the skis kept level whatever the legs do) and a pole in each hand.
// Moving, he double-poles on m.phase at half the walking rate (u, 0..1 a cycle): the push from arms
// high in front to arms back, bending at the hips and dipping, the tips planted behind; then the
// arms swing forward with the tips trailing off the ground. Each pole is aimed so its tip reaches
// the ground (or `lift` over it) from where the hand is: from the hand's height over his soles the
// horizontal reach of a POLE_LEN pole follows, laid back and a little out (standing: forward and
// out, the hands resting on the grips). The waving hand (`wave`, the base pose) holds its pole up.
function skiPose(m, st) {
  const [R, L] = m.arms, legs = m.legs, s = m.s;
  const a = Math.min(1, st.speed / 2.5), u = ((m.phase * 0.5) / (Math.PI * 2)) % 1;
  const push = u < 0.42, k = push ? u / 0.42 : (u - 0.42) / 0.58, e = (1 - Math.cos(Math.PI * k)) / 2;
  const bend = push ? Math.sin(Math.PI * k) : 0;
  const lean = a * (0.18 + 0.42 * bend);
  m.hips.rotation.x = lean;
  m.body.position.y = (SKI_LIFT - a * 0.06 * bend) * s;
  legs[0].rotation.set(-0.06 * a * bend, 0, -0.05);
  legs[1].rotation.set(-0.06 * a * bend, 0, 0.05);
  const arm = -0.42 + ((push ? -1.25 + 1.8 * e : 0.55 - 1.8 * e) + 0.42) * a;
  R.rotation.set(arm, 0, -0.2);
  if (!st.wave) L.rotation.set(arm, 0, 0.2);
  for (let i = 0; i < 2; i++) {
    const sk = prop(m, i ? 'skiL' : 'skiR', legs[i]);
    sk.position.set(0, -m.legLen - 0.015 * s, 0.06 * s);
    sk.rotation.set(-legs[i].rotation.x, 0, -legs[i].rotation.z);
  }
  const lp = POLE_LEN * s, c = Math.cos(lean), sn = Math.sin(lean);
  for (let i = 0; i < 2; i++) {
    const sx = i ? 1 : -1, p = prop(m, i ? 'poleL' : 'poleR');
    hand(m, i, _v);
    p.position.copy(_v);
    if (i === 1 && st.wave) _w.set(0.3, 0.92, -0.25);
    else {
      const hh = m.body.position.y + m.legLen + _v.y * c - _v.z * sn;
      const lift = push ? 0 : 0.35 * Math.sin(Math.PI * k) * a;
      const v = Math.min(lp * 0.98, Math.max(0.2, hh - lift)), reach = Math.sqrt(lp * lp - v * v);
      let hx = sx * (0.45 + (0.22 - 0.45) * a), hz = 0.89 + (-0.97 - 0.89) * a;
      const hl = Math.hypot(hx, hz) || 1;
      hx /= hl; hz /= hl;
      _w.set(hx * reach, -v, hz * reach);
    }
    // From the root's axes into the hips' (leaned `lean` about x).
    const y = _w.y, z = _w.z;
    _w.set(_w.x, y * c + z * sn, -y * sn + z * c).normalize();
    p.quaternion.setFromUnitVectors(DOWN, _w);
  }
}

// ---------------------------------------------------------------------------------------------
// Pedestrians (DESIGN §6.7): 1979 Swedish charter tourists (70 %) and locals (30 %), no kids.
//   randomPed(r, { flight }) — flight: tourists only, travel clothes (long sleeves, no shorts/hats).

const T_SKIN = [0xf2b8a0, 0xe89a7a, 0xf6d3c0];
const L_SKIN = [0xc99a6e, 0xa8774f];
const T_HAIR = [0xe8d27a, 0xd8b860, 0x9a7a52, 0x5a3a1e, 0xb8582a, 0x9a9a9a, 0x3a2a1e, 0xc9a66b];
const L_HAIR = [0x1d1426, 0x2a1a12, 0x3a2a1e, 0x8a8a8a];
const LOUD = [0xf07a1e, 0xe0a82a, 0x8a9a3a, 0x2fb8a8, 0x6ab0e8, 0xd8321e, 0xf08ab0, 0xf7d23a, 0xa88ad0, 0xc0623a, 0xf4f1e8, 0x3f9a5a];
const HAWAII = [[0xffd23f, 0x3f7a3a, 0xffffff], [0xffffff, 0xf07a1e, 0x2fb8a8], [0xf7d23a, 0xd8321e, 0x3f7a3a], [0xf08ab0, 0xffffff, 0x2f6ad8]];
const T_PANTS = [0xf0ead8, 0xd8c49a, 0x2a3a6a, 0x6a4a2a, 0x4a6a9a, 0x6a6a3a, 0x8a5a32];
const TRAVEL = [0x8a5a32, 0xb07a3a, 0xc0623a, 0xd8a64a, 0x6a4a2a, 0xe0d0a8, 0x9a6a3a, 0x7a8a3a, 0xa04a2a, 0x4a5a7a];
const DRESS = [0xf7d23a, 0x2fb8a8, 0xf08ab0, 0xf07a1e, 0xf4f1e8, 0xa88ad0, 0x6ab0e8, 0xd8321e];

export function randomPed(r = Math.random, opts = {}) {
  const flight = !!opts.flight;
  const local = !flight && r() < 0.3;
  const woman = r() < 0.45;
  const d = {
    name: 'ped', kind: 'adult', scale: 0.94 + r() * 0.14, wide: 0.88 + r() * 0.42, local,
    nose: pick(['button', 'small', 'big', 'pointy', 'long', 'small'], r), voice: woman ? 300 + r() * 120 : 180 + r() * 120,
  };
  if (d.wide > 1.18) d.belly = true;
  if (local) {
    d.skin = pick(L_SKIN, r);
    d.hairC = pick(L_HAIR, r);
    d.brows = 0x1d1426;
    if (woman) {
      d.hair = pick(['bun', 'page', 'long', 'curly'], r);
      d.dress = 0x1d1426; d.shirt = r() < 0.5 ? 0x1d1426 : 0xf4f4f0; d.pants = 0x1d1426; d.longSleeves = r() < 0.6;
      d.shoes = 0x1d1426; d.lashes = true;
      if (r() < 0.3) d.held = 'handbag';
    } else {
      d.hair = pick(['slick', 'short', 'balding', 'curly'], r);
      d.shirt = 0xf4f4f0; d.pants = 0x1d1426; d.longSleeves = r() < 0.5; d.collar = true;
      if (r() < 0.3) d.vest = 0x1d1426;
      if (r() < 0.2) d.bowtie = 0x1d1426;
      if (r() < 0.5) { d.mustache = d.hairC; d.stache = pick(['thick', 'thin', 'big'], r); }
      if (r() < 0.12) d.hat = 'sunhat';
    }
  } else {
    d.skin = pick(T_SKIN, r);
    d.hairC = pick(T_HAIR, r);
    d.brows = d.hairC === 0xe8d27a || d.hairC === 0xd8b860 ? 0xb89a5a : d.hairC;
    if (flight) {
      d.shirt = pick(TRAVEL, r); d.longSleeves = true; d.collar = r() < 0.6; d.pants = pick([0x6a4a2a, 0x3a3a44, 0x8a6a4a, 0x4a4a52], r);
      if (r() < 0.3) d.vest = pick(TRAVEL, r);
      if (r() < 0.25) { d.stripe = pick(TRAVEL, r); d.stripes = r() < 0.5; }
    } else {
      d.shirt = pick(LOUD, r); d.longSleeves = r() < 0.15; d.pants = pick(T_PANTS, r);
      if (r() < 0.3) { d.print = pick(HAWAII, r); d.printStyle = 'floral'; d.collar = true; }
      if (r() < 0.35) { d.hat = r() < 0.5 ? 'sunhat' : 'bucket'; d.hatC = d.hat === 'bucket' ? pick([0xf4f1e8, 0xf7c31b, 0x4a6a9a], r) : 0xe8cf8a; }
      if (r() < 0.1) d.held = 'camera';
      if (r() < 0.25) d.shades = 0x2a2a2a;
    }
    if (woman) {
      d.hair = pick(['page', 'long', 'bun', 'curly', 'curlyLong'], r);
      d.lashes = true;
      if (!flight && r() < 0.5) { d.dress = pick(DRESS, r); d.shirt = d.dress; if (r() < 0.5) { d.print = [0xffffff]; d.printStyle = 'dots'; } }
      if (flight && r() < 0.4) d.dress = pick(TRAVEL, r);
      d.shoes = pick([0xf4f0e6, 0x8a5a3a, 0xd8321e], r);
    } else {
      d.hair = pick(['short', 'short', 'balding', 'slick', 'curly', 'swoop', 'long'], r);
      if (r() < 0.35) { d.mustache = d.hairC; d.stache = pick(['thin', 'thick', 'big', 'walrus'], r); }
      if (r() < 0.15) d.sideburns = true;
      d.shoes = pick([0x2a2a2a, 0x8a5a3a, 0xf4f0e6], r);
    }
    // §6.7 shorts 55 %: of the island tourists not in a dress (a sundress already shows the legs).
    if (!flight && !d.dress && r() < 0.55) d.shorts = true;
    if (!d.shades && r() < 0.2) d.glasses = pick([0x2a2a2a, 0x8a5a2a, 0xc8a040], r);
  }
  return d;
}

// A seated bust (torso + arms + head) as one merged, vertex-coloured geometry: origin at the torso
// bottom, +z forward. The cabin merges ~80 of these into one static mesh.
export function buildBustGeo(d) {
  const g = bustBuilder(d);
  const s = d.scale || 1, R = 0.25 * s, torsoH = 0.66 * s;
  // A closed, smiling mouth.
  g.sphere(0x3a0f1a, 0, torsoH + R * 0.45 + 0.06 * s, R * 0.84, R * 0.62, R * 0.16, R * 0.18);
  return g.build();
}

// pg: where the print goes (default: merged into the bust, which the cabin and the Rio boat do).
function bustBuilder(d, pg = null) {
  // Seated in the plane or a car, a random ped has taken the sun hat off (its brim would stick
  // through a car roof).
  if (d.name === 'ped' && (d.hat === 'sunhat' || d.hat === 'bucket')) d = { ...d, hat: null };
  const s = d.scale || 1, wide = d.wide || 1;
  const R = 0.25 * s, torsoH = 0.66 * s, torsoW = 0.5 * s * wide, torsoD = 0.3 * s * (wide > 1 ? 1 + (wide - 1) * 0.8 : wide);
  const T = { H: torsoH, W: torsoW, D: torsoD, s };
  const g = new CharBuilder();
  torsoParts(g, d, T, true, pg ?? g);
  // Arms resting forward (sleeves, hands on the lap).
  const sleeve = d.longSleeves ? d.shirt : d.skin;
  for (const sd of [-1, 1]) {
    g.add(PRIM.capsule(), d.shirt, mat(sd * (torsoW / 2 + 0.02 * s), torsoH * 0.62, 0.04 * s, -0.5, 0, sd * 0.12, 0.15 * s, 0.16 * s, 0.15 * s));
    g.add(PRIM.capsule(), sleeve, mat(sd * (torsoW / 2 - 0.04 * s), torsoH * 0.36, 0.22 * s, -1.35, 0, 0, 0.11 * s, 0.16 * s, 0.11 * s));
    g.sphere(d.hands ?? d.skin, sd * (torsoW / 2 - 0.08 * s), torsoH * 0.33, 0.42 * s, 0.14 * s);
  }
  g.cyl(d.skin, 0, torsoH + 0.05 * s, 0, 0.07 * s * Math.min(1.3, wide), 0.12 * s, 8);
  const hg = new CharBuilder();
  headParts(hg, d, R, true);
  const hgeo = hg.build();
  hgeo.translate(0, torsoH + R * 0.95 + 0.06 * s, 0);
  g.parts.push(hgeo);
  return g;
}

// A cheap seated figure (torso + head in one mesh) for traffic drivers and riders. The talking
// mouth is root.userData.mouth; root.userData.h is its height.
export function buildBust(d) {
  const s = d.scale || 1;
  const R = 0.25 * s, torsoH = 0.66 * s;
  const pg = new CharBuilder();
  const geo = bustBuilder(d, pg).build();
  const root = new THREE.Group();
  root.add(toonMesh(geo, { outline: OUT }));
  if (!pg.empty) root.add(toonMesh(pg.build(), { outline: 0, cast: false }));
  const mouth = new THREE.Mesh(mouthGeo(R, 1), MAT.mouth);
  mouth.position.set(0, torsoH + R * 0.45 + 0.06 * s, R * 0.8);
  mouth.scale.y = 0.3;
  root.add(mouth);
  root.userData.mouth = mouth;
  root.userData.h = geo.boundingBox.max.y;
  return root;
}
