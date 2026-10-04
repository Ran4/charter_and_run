// The Rio end card (DESIGN §6.3, §11.7; WP-B, P1): a small off-world set at x = -3000, used only by
// the julafton epilogue (game.playEndCard, wired in Phase 2). A white motor yacht (deck top 0.55,
// solid) with a little band of busts on the wheelhouse roof, and behind it, framed from rioCam,
// a crescent of Copacabana beach with palms and parasols, the wave-patterned promenade, a row of
// high-rises, green hills and the Sugarloaf with its cable car. Landmarks rioBoat and rioCam.
// Invented for the game (§1.6): the Rio card as a playable epilogue, the yacht and its name.
// Far from everything: > 1800 m (the camera far plane) from the island and > 4000 m from the cabin.

import { THREE, GeoBuilder, toonMesh, MAT, PRIM, mat, textCanvas } from '../gfx.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { landmarks } from './layout.js';
import { box } from './collision.js';
import { buildBustGeo, randomPed } from '../actors/models.js';
import { mulberry32, pick } from '../util.js';

export const RIO_X = -3000;

const taperGeo = {};
function taper(G, color, x, y, z, rTop, rBot, h, n = 10, ry = 0) {
  const k = (rTop / rBot).toFixed(3) + '_' + n;
  G.add(taperGeo[k] ??= new THREE.CylinderGeometry(0.5 * rTop / rBot, 0.5, 1, n), color, mat(x, y, z, 0, ry, 0, rBot * 2, h, rBot * 2));
}

function textPlane(scene, text, w, h, opts, x, y, z, ry) {
  const tex = new THREE.CanvasTexture(textCanvas(text, w, h, opts));
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !opts.bg }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  scene.add(m);
  return m;
}

// The Copacabana promenade: black-and-white wave mosaic, as one tiled canvas texture.
function waveTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 64;
  const x = cv.getContext('2d');
  x.fillStyle = '#f4f0e6'; x.fillRect(0, 0, 256, 64);
  x.fillStyle = '#1d1a1c';
  for (const off of [0, 32]) {
    x.beginPath();
    for (let i = 0; i <= 256; i += 4) x.lineTo(i, 16 + off + Math.sin((i / 256) * Math.PI * 4) * 9);
    for (let i = 256; i >= 0; i -= 4) x.lineTo(i, 26 + off + Math.sin((i / 256) * Math.PI * 4) * 9);
    x.closePath(); x.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function buildRioCard(scene) {
  const X = RIO_X, r = mulberry32(1980);
  const R = (a, b) => a + (b - a) * r();
  const cam = { x: X + 9, z: 6 };
  landmarks.rioBoat = { x: X, z: 0, yaw: 0 };
  landmarks.rioCam = { x: cam.x, z: cam.z, yaw: Math.atan2(X - cam.x, 0 - cam.z) };

  // The bay.
  const sea = new THREE.Mesh(new THREE.CircleGeometry(400, 48).rotateX(-Math.PI / 2), MAT.water);
  sea.position.set(X, 0.1, 0);
  scene.add(sea);

  // ---- The yacht (bow towards -z, wheelhouse forward, open aft deck for the cast) ----
  const Y = new GeoBuilder();
  const deck = 0.55;
  Y.boxB(0xfafafa, X, -1.0, 1.25, 4.4, 1.55, 11.5);                        // hull z -4.5 .. 7
  Y.add(PRIM.cyl(3), 0xfafafa, mat(X, -0.225, -6, 0, Math.PI, 0, 5.08, 1.55, 6));   // bow
  Y.boxB(0x1c3f7a, X, 0.05, 1.25, 4.46, 0.22, 11.56);                      // navy stripe
  Y.add(PRIM.cyl(3), 0x1c3f7a, mat(X, 0.16, -6.01, 0, Math.PI, 0, 5.15, 0.22, 6.05));
  Y.boxB(0xb07a44, X, deck - 0.04, 1.6, 4.0, 0.06, 10.6);                  // teak deck
  Y.boxB(0xc8c0b0, X, -0.95, 7.05, 3.6, 0.5, 0.2);                         // swim platform
  // Railings: posts and a top rail round the aft deck.
  for (const sx of [-1.9, 1.9]) {
    for (let z = -4; z <= 6.8; z += 1.2) Y.boxB(0xe8ecf0, X + sx, deck, z, 0.05, 0.9, 0.05);
    Y.box(0xe8ecf0, X + sx, deck + 0.9, 1.4, 0.07, 0.07, 10.8);
  }
  for (let x = -1.9; x <= 1.9; x += 0.95) Y.boxB(0xe8ecf0, X + x, deck, 6.8, 0.05, 0.9, 0.05);
  Y.box(0xe8ecf0, X, deck + 0.9, 6.8, 3.8, 0.07, 0.07);
  // Wheelhouse with a dark window band and an overhanging roof (the band plays up there).
  Y.boxB(0xfafafa, X, deck, -2.4, 3.2, 2.0, 3.6);
  Y.box(0x2c4a66, X, deck + 1.35, -2.4, 3.26, 0.7, 3.4);
  Y.box(0x2c4a66, X, deck + 1.3, -0.58, 2.6, 0.75, 0.06);
  Y.boxB(0xfafafa, X, deck + 2.0, -2.2, 3.7, 0.18, 4.4);
  const roof = deck + 2.18;
  for (let x = -1.7; x <= 1.7; x += 0.85) Y.boxB(0xe8ecf0, X + x, roof, -0.05, 0.04, 0.7, 0.04);
  Y.box(0xe8ecf0, X, roof + 0.7, -0.05, 3.5, 0.06, 0.06);
  Y.add(PRIM.torus(), 0xf07a1e, mat(X + 1.64, deck + 0.95, -2.4, 0, Math.PI / 2, 0, 1.1, 1.1, 1.4));
  // Stern flagstaff with a Swedish flag (they brought it, of course).
  Y.cyl(0xb07a44, X - 1.4, deck + 1.3, 6.6, 0.04, 2.6, 5);
  Y.box(0x1f5aa6, X - 1.4, deck + 2.25, 7.15, 0.04, 0.7, 1.1);
  Y.box(0xf7c31b, X - 1.4, deck + 2.25, 7.0, 0.05, 0.16, 1.12);
  Y.box(0xf7c31b, X - 1.4, deck + 2.25, 6.95, 0.05, 0.72, 0.16);

  // The band: five busts on the wheelhouse roof, facing the camera, with their instruments.
  const look = (x, z) => Math.atan2(cam.x - x, cam.z - z);
  const shirts = [0xfafafa, 0xf7c31b, 0xfafafa, 0xd8321e, 0xfafafa];
  for (let k = 0; k < 5; k++) {
    const x = X - 1.4 + k * 0.7, z = -2.4 + (k % 2) * 0.5, yaw = look(x, z);
    const d = { ...randomPed(r), kind: 'adult', scale: 0.95, shirt: shirts[k], skin: pick([0xc99a6e, 0xa8774f, 0x8a5a3a, 0xe8b894], r), glasses: 0 };
    const g = buildBustGeo(d);
    g.applyMatrix4(mat(x, roof, z, 0, yaw, 0));
    Y.parts.push(g);
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const ix = x + fx * 0.32, iz = z + fz * 0.32, iy = roof + 0.45;
    if (k === 0) { Y.cyl(0xe8c040, ix, iy + 0.08, iz, 0.03, 0.5, 6, Math.PI / 2, yaw); Y.cone(0xe8c040, ix + fx * 0.3, iy + 0.08, iz + fz * 0.3, 0.09, 0.16, 8, Math.PI / 2, yaw); }
    else if (k === 1) { for (const s of [-1, 1]) Y.sphere(s > 0 ? 0xd8321e : 0x2f8a4a, ix + s * 0.2 * fz, iy + 0.35, iz - s * 0.2 * fx, 0.16, 0.2, 0.16); }
    else if (k === 2) { Y.sphere(0x8a5a2a, ix, iy - 0.05, iz, 0.5, 0.5, 0.18, 0, yaw, 0.4); Y.box(0x5a3a1a, ix - fz * 0.35, iy + 0.12, iz + fx * 0.35, 0.5, 0.06, 0.06, yaw, 0, 0.4); }
    else if (k === 3) { taper(Y, 0xc0623a, ix + fx * 0.15, roof + 0.35, iz + fz * 0.15, 0.17, 0.12, 0.7); Y.cyl(0xf2e6d0, ix + fx * 0.15, roof + 0.71, iz + fz * 0.15, 0.17, 0.03, 10); }
    else { Y.box(0xd8321e, ix, iy, iz, 0.42, 0.34, 0.2, yaw); for (let p = 0; p < 4; p++) Y.box(0xfafafa, ix - 0.15 * Math.cos(yaw) + p * 0.1 * Math.cos(yaw), iy, iz + 0.15 * Math.sin(yaw) - p * 0.1 * Math.sin(yaw), 0.03, 0.34, 0.22, yaw); }
  }
  scene.add(toonMesh(Y.build(), { outline: 0.035 }));
  // Name on the transom and both sides of the bow.
  textPlane(scene, 'MAJSAN', 2.6, 0.55, { bg: null, fg: '#1c3f7a', border: null, scale: 0.9 }, X, -0.35, 7.01, 0);
  textPlane(scene, 'MAJSAN', 2.4, 0.5, { bg: null, fg: '#1c3f7a', border: null, scale: 0.9 }, X + 2.21, -0.3, -3.2, Math.PI / 2);
  // Solids: the deck (top 0.55), the wheelhouse, rails so nobody steps into the bay.
  box(X - 2, -6, X + 2, 6.8, deck, 'deck');
  box(X - 1.6, -4.2, X + 1.6, -0.6, 99, 'building');
  box(X - 2.2, -6, X - 1.85, 6.9, 1.5, 'rail');
  box(X + 1.85, -6, X + 2.2, 6.9, 1.5, 'rail');
  box(X - 2.2, 6.75, X + 2.2, 7.1, 1.5, 'rail');

  // ---- Copacabana, framed from rioCam: the view runs along d, the beach along t (= view right) ----
  const yawV = landmarks.rioCam.yaw;
  const d = { x: Math.sin(yawV), z: Math.cos(yawV) }, t = { x: -Math.cos(yawV), z: Math.sin(yawV) };
  const at = (s, u, out = {}) => { out.x = cam.x + d.x * u + t.x * s; out.z = cam.z + d.z * u + t.z * s; return out; };
  const L = new GeoBuilder();
  // The beach is a crescent (u grows towards its ends): slices of 40 m, each turned to the curve,
  // with sand, the mosaic promenade, the avenue and the city ground behind (all above the bay).
  const SL = 11, S0 = -320, BOW = 60;
  const uOf = (s) => 150 + (s / 320) ** 2 * BOW;
  const slice = (sm) => {
    const k = (2 * sm / 320 ** 2) * BOW, nx = t.x + d.x * k, nz = t.z + d.z * k, n = Math.hypot(nx, nz);
    const tx = nx / n, tz = nz / n;                       // along the curve
    const ox = -tz, oz = tx;                               // across it, pointing away from the camera
    const sgn = ox * d.x + oz * d.z < 0 ? -1 : 1;
    const base = at(sm, uOf(sm));
    return { yaw: Math.atan2(tx, tz), p: (v) => ({ x: base.x + ox * sgn * v, z: base.z + oz * sgn * v }) };
  };
  for (let k = 0; k < SL; k++) {
    const s0 = S0 + k * 40, sm = s0 + 20, u = uOf(sm), sl = slice(sm);
    const c = sl.p(17);
    L.boxB(0xf0dcae, c.x, -0.8, c.z, 34, 1.15, 44, sl.yaw);                         // sand, top 0.35
    const p = sl.p(46);
    L.boxB(0x4c4c56, p.x, -0.6, p.z, 14, 1.0, 44, sl.yaw);                          // avenue, top 0.4
    const g = sl.p(53 + 150);
    L.boxB(0x7a8a6a, g.x, -0.5, g.z, 300, 1.0, 44, sl.yaw);                         // city ground
    // Parasols and palms on the beach and the promenade.
    for (let q = 0; q < 3; q++) {
      const b = at(s0 + R(4, 36), u + R(4, 26));
      L.cyl(0xe8e4da, b.x, 1.2, b.z, 0.04, 1.8, 5);
      L.cone(pick([0xf07a1e, 0xf7c31b, 0xd8321e, 0x2f6ad1, 0x1e9aa0, 0xfafafa], r), b.x, 2.25, b.z, 1.3, 0.5, 8);
    }
    for (const sp of [s0 + 8, s0 + 28]) {
      const pp = at(sp, uOf(sp) + 36.5);
      const h = R(7, 10);
      L.cyl(0x8a6a4a, pp.x, 0.4 + h / 2, pp.z, 0.22, h, 6);
      for (let f = 0; f < 7; f++) {
        const a = (f / 7) * Math.PI * 2;
        L.box(f % 2 ? 0x3f7a3a : 0x4f8f44, pp.x + Math.cos(a) * 1.5, 0.4 + h, pp.z + Math.sin(a) * 1.5, 3.2, 0.08, 0.7, -a, 0, -0.3);
      }
    }
    // High-rises along the avenue: white and pastel slabs with window bands.
    for (let q = 0; q < 2; q++) {
      const sb = s0 + 4 + q * 20, hb = R(22, 46), wb = R(12, 17), db = R(10, 14);
      const bs = slice(sb + wb / 2), c2 = bs.p(55 + db / 2), c3 = bs.p(55 - 0.05);
      const col = pick([0xfafafa, 0xf4efe6, 0xf2d4c4, 0xf2e2b0, 0xc8dce8, 0xf4efe6], r);
      L.boxB(col, c2.x, 0.4, c2.z, db, hb, wb, bs.yaw);
      for (let fl = 3; fl < hb - 2; fl += 3) L.boxB(0x5f7f9a, c3.x, 0.4 + fl, c3.z, 0.2, 1.2, wb - 1.5, bs.yaw);
    }
  }
  // The promenade mosaic: one textured strip per slice, merged into one mesh.
  const waves = waveTexture();
  waves.repeat.set(5, 1);
  const strips = [];
  for (let k = 0; k < SL; k++) {
    const sl = slice(S0 + k * 40 + 20), c = sl.p(36.5);
    strips.push(new THREE.PlaneGeometry(44, 5).rotateX(-Math.PI / 2).applyMatrix4(mat(c.x, 0.37, c.z, 0, sl.yaw + Math.PI / 2, 0)));
  }
  scene.add(new THREE.Mesh(mergeGeometries(strips, false), new THREE.MeshBasicMaterial({ map: waves })));
  // Green hills behind the city, and the Sugarloaf with Morro da Urca and the cable car.
  for (let k = 0; k < 12; k++) {
    const h = at(R(-340, 340), R(330, 430));
    const s = R(90, 170);
    L.sphere(pick([0x3f7a3a, 0x4f8f44, 0x5a8a4a, 0x356a34], r), h.x, -20, h.z, s * 1.6, s * R(0.7, 1.0), s * 1.3, 0, r() * 6, 0, 12);
  }
  const sl = at(175, 265), ur = at(130, 240);
  taper(L, 0x8a7a6a, sl.x, 35, sl.z, 22, 40, 70, 12);
  L.sphere(0x8a7a6a, sl.x, 70, sl.z, 46, 52, 44, 0, 0, 0, 14);
  L.sphere(0x4f8f44, sl.x, 4, sl.z, 110, 26, 100, 0, 0, 0, 12);
  L.sphere(0x6a6a5a, ur.x, 0, ur.z, 70, 70, 60, 0, 0.6, 0, 12);
  L.sphere(0x4f8f44, ur.x, 8, ur.z, 72, 40, 62, 0, 0, 0, 12);
  {
    const ax = ur.x, az = ur.z, ay = 34, bx = sl.x, bz = sl.z, by = 94;
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    const yaw = Math.atan2(bx - ax, bz - az), pitch = Math.atan2(by - ay, Math.hypot(bx - ax, bz - az));
    L.box(0x1d1f26, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, 0.3, 0.3, len, yaw, -pitch);
    L.box(0xd8321e, ax + (bx - ax) * 0.4, ay + (by - ay) * 0.4 - 2.2, az + (bz - az) * 0.4, 3, 2.6, 3.4, yaw);
  }
  // Sailboats in the bay.
  for (let k = 0; k < 5; k++) {
    const p = at(R(-200, 200), R(60, 130));
    L.boxB(0xfafafa, p.x, -0.2, p.z, 1.4, 0.7, 5, r() * 6);
    L.cone(pick([0xfafafa, 0xf07a1e, 0xf7c31b], r), p.x, 3.4, p.z, 1.3, 5.4, 4);
  }
  scene.add(toonMesh(L.build(), { outline: 0.08, cast: false }));
}
