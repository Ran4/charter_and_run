// The Rio end card (DESIGN §11.7; WP-B, P1): a small off-world set at x = -3000, used only by the
// julafton epilogue (game.playEndCard, wired in Phase 2). Landmarks rioBoat and rioCam.
// Phase 0 ships a stub: sea, a yacht deck (solid top 0.55), a Sugarloaf cone, and the landmarks.

import { THREE, GeoBuilder, toonMesh, MAT } from '../gfx.js';
import { landmarks } from './layout.js';
import { box } from './collision.js';

export function buildRioCard(scene) {
  const X = -3000;
  const sea = new THREE.Mesh(new THREE.CircleGeometry(400, 40).rotateX(-Math.PI / 2), MAT.water);
  sea.position.set(X, 0.1, 0);
  scene.add(sea);
  const g = new GeoBuilder();
  g.boxB(0xf4f4f0, X, 0, 0, 4, 0.55, 12);
  g.cone(0x3f7a3a, X - 60, 40, -180, 45, 90, 16);
  g.boxB(0xe8cf98, X + 40, 0, 0, 30, 0.3, 200);
  scene.add(toonMesh(g.build(), { outline: 0.04 }));
  box(X - 2, -6, X + 2, 6, 0.55, 'deck');
  landmarks.rioBoat = { x: X, z: 0, yaw: 0 };
  landmarks.rioCam = { x: X + 9, z: 6, yaw: Math.atan2(-9, -6) };
}
