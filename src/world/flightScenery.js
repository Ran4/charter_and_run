// The outside of the flight (DESIGN §5.6; WP-A2): the static airframe around the cut-away cabin and
// the animated scenery that moves past it (apron, cloud deck, puffs, sea, island, Gando runway).
// Only scenery.rotation.x/z ever tilts; the airframe never moves.
//
// Phase-0 stub with the exact API shape: plain boxes, a few phase toggles, a scrolling deck.
//   buildFlightScenery(scene) -> { airframe, scenery, gateVisual, setPhaseVisual(name, t), setGateVisible(on), tick(dt) }
//   buildPlaneExterior(group, { gear = true }) -> group   (the airport block reuses it for the parked DC-8)

import { THREE, GeoBuilder, toonMesh } from '../gfx.js';

const CX = 3000;
const WHITE = 0xf4f4f0, BELLY = 0xb8bec6, CHEAT = 0x1b2f6b, SUN = 0xf07a1e;

// A DC-8-ish exterior in local coordinates (nose +z, port +x, floor at y 0.15).
export function buildPlaneExterior(group, { gear = true } = {}) {
  const g = new GeoBuilder();
  g.box(WHITE, 0, -1.0, -0.8, 7.0, 2.2, 37.6);            // fuselage belly under the cabin floor
  g.box(BELLY, 0, -2.2, -0.8, 5.6, 0.4, 37.6);
  g.box(CHEAT, 3.52, 1.2, -0.8, 0.06, 0.3, 37.6);
  g.box(CHEAT, -3.52, 1.2, -0.8, 0.06, 0.3, 37.6);
  g.box(WHITE, 0, 0.4, 21.7, 5.0, 4.4, 6.6);               // nose (z 18.4 -> 25), own roof
  g.box(0x2a3a4a, 0, 1.9, 24.6, 3.0, 0.6, 0.6);           // cockpit windows
  g.box(WHITE, 0, -0.4, -24.0, 4.2, 3.0, 8.0);             // tail cone (z -20 -> -28), low
  g.box(WHITE, 0, 6.6, -28.0, 0.5, 8.0, 4.0);              // fin, root at z <= -26
  g.cyl(SUN, 0.3, 7.6, -28.0, 1.2, 0.08, 16, 0, 0, Math.PI / 2);
  g.cyl(SUN, -0.3, 7.6, -28.0, 1.2, 0.08, 16, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) {
    g.box(WHITE, s * 12, -0.8, 1.0, 18, 0.4, 7.0, 0, 0, s * 0.05);          // wings, tips x +-21
    for (const ex of [8, 14]) g.cyl(BELLY, s * ex, -1.8, 3.0, 0.7, 3.4, 10, Math.PI / 2);  // engine pods
  }
  if (gear) for (const [x, z] of [[0, 19], [-2.5, -1], [2.5, -1]]) g.box(0x2a2a30, x, -2.9, z, 0.5, 1.4, 0.8);
  group.add(toonMesh(g.build(), { outline: 0.04 }));
  return group;
}

export function buildFlightScenery(scene) {
  const airframe = new THREE.Group();
  airframe.position.set(CX, 0, 0);
  buildPlaneExterior(airframe, { gear: false });
  scene.add(airframe);

  const scenery = new THREE.Group();
  scenery.position.set(CX, 0, 0);
  scene.add(scenery);
  const sub = (name) => { const g = new THREE.Group(); g.name = name; scenery.add(g); return g; };
  const ground = sub('ground'), deck = sub('deck'), puffs = sub('puffs'), sea = sub('sea'), island = sub('island'), landingStrip = sub('landingStrip');

  // Arlanda apron: snow, a runway strip.
  const snow = new THREE.Mesh(new THREE.CircleGeometry(600, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xf2f4f6 }));
  snow.position.y = 0.13;
  ground.add(snow);
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(45, 900).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x5a5e66 }));
  rw.position.set(-40, 0.135, 0);
  ground.add(rw);
  // Cloud deck: white blobs below, wrapping in a box (x +-600, z +-700).
  const cg = new GeoBuilder();
  for (let k = 0; k < 120; k++) {
    const x = (Math.random() - 0.5) * 1200, z = (Math.random() - 0.5) * 1400, s = 25 + Math.random() * 40;
    cg.sphere(0xffffff, x, -30 + Math.random() * 18, z, s, s * 0.4, s);
  }
  const deckMesh = toonMesh(cg.build(), { outline: 0, cast: false });
  deck.add(deckMesh);
  const pg = new GeoBuilder();
  for (let k = 0; k < 30; k++) pg.sphere(0xffffff, (Math.random() - 0.5) * 60, -4 + Math.random() * 12, (Math.random() - 0.5) * 400, 8 + Math.random() * 10);
  puffs.add(toonMesh(pg.build(), { outline: 0, cast: false }));
  const seaMesh = new THREE.Mesh(new THREE.CircleGeometry(1200, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x1c7fb8 }));
  seaMesh.position.y = -90;
  sea.add(seaMesh);
  const ig = new GeoBuilder();
  for (let k = 0; k < 8; k++) ig.sphere(k % 2 ? 0xa5532f : 0xc27a45, (Math.random() - 0.5) * 500, -95, 900 + Math.random() * 200, 160, 60, 120);
  island.add(toonMesh(ig.build(), { outline: 0, cast: false }));
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(45, 900).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x6a6a70 }));
  strip.position.set(0, 0.13, 0);
  landingStrip.add(strip);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(500, 32).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xc9a26b }));
  sand.position.set(0, 0.12, 0);
  landingStrip.add(sand);

  const gateVisual = new THREE.Group();
  gateVisual.position.set(CX, 0, 0);
  scene.add(gateVisual);

  const SHOW = {
    gate: ['ground'], takeoff: ['ground'], climb: ['puffs', 'deck'], cruise: ['deck'],
    approach: ['deck', 'sea', 'island'], landing: ['landingStrip', 'sea'], landed: ['landingStrip', 'sea'],
  };
  let phase = 'gate';
  return {
    airframe, scenery, gateVisual,
    setPhaseVisual(name, t = 0) {
      phase = name;
      for (const g of scenery.children) g.visible = (SHOW[name] || []).includes(g.name);
      deck.position.y = name === 'climb' ? 5 : name === 'approach' ? -20 : 0;
    },
    setGateVisible(on) { gateVisual.visible = !!on; },
    tick(dt) {
      if (phase === 'cruise' || phase === 'climb' || phase === 'approach') {
        deck.position.z -= 55 * dt;
        if (deck.position.z < -700) deck.position.z += 1400;
        puffs.position.z -= 120 * dt;
        if (puffs.position.z < -300) puffs.position.z += 600;
      }
    },
  };
}
