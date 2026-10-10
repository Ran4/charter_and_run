// Floating "!" over mission givers, beams on objectives, race checkpoints, and the big arrow
// that hovers over you pointing the way.

import { THREE, GeoBuilder, toonMesh, MAT, outlineMat } from '../gfx.js';

function bangGeo(color) {
  const g = new GeoBuilder();
  g.box(color, 0, 0.75, 0, 0.42, 1.2, 0.42);
  g.sphere(color, 0, 1.38, 0, 0.44, 0.3, 0.44);
  g.sphere(color, 0, 0.18, 0, 0.18, 0.12, 0.18);
  g.box(color, 0, 0, 0, 0.42, 0.42, 0.42, Math.PI / 4, Math.PI / 4);
  return g.build();
}

export class Bang {
  constructor(scene, color = 0xffd23f) {
    this.root = new THREE.Group();
    const m = toonMesh(bangGeo(color), { outline: 0.05, cast: false });
    m.scale.setScalar(1.1);
    this.root.add(m);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 30;
    this.root.add(beam);
    this.beam = beam;
    scene.add(this.root);
    this.visible = true;
  }
  // k = 0..1 of the beam's full opacity (main fades it near the cabin eye, §5.3).
  fadeBeam(k) { this.beam.material.opacity = 0.16 * k; this.beam.visible = k > 0; }
  set(x, y, z, t) {
    this.root.position.set(x, y + Math.sin(t * 3) * 0.2, z);
    this.root.children[0].rotation.y = t * 2;
  }
  show(v) { this.root.visible = v; this.visible = v; }
}

export class Beacon {
  constructor(scene, color = 0xffd23f) {
    this.root = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 120, 16, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 60;
    this.root.add(beam);
    this.beam = beam;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.22, 6, 32), new THREE.MeshBasicMaterial({ color }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4;
    this.root.add(ring);
    this.ring = ring;
    const g = new GeoBuilder();
    g.cone(color, 0, 0, 0, 0.9, 1.4, 4, Math.PI);
    g.box(color, 0, 1.1, 0, 0.6, 1.2, 0.6);
    this.arrow = toonMesh(g.build(), { outline: 0.05, cast: false });
    this.root.add(this.arrow);
    scene.add(this.root);
    this.root.visible = false;
  }
  set(x, y, z, t, radius = 3.2) {
    this.root.visible = true;
    this.root.position.set(x, y, z);
    const s = radius / 3.2;
    this.ring.scale.set(s, s, s);
    this.ring.rotation.z = t;
    this.arrow.position.y = 4.5 + Math.sin(t * 4) * 0.5;
    this.arrow.rotation.y = t * 2;
  }
  // k = 0..1 of the beam's full opacity (main fades it near the cabin eye, §5.3).
  fadeBeam(k) { this.beam.material.opacity = 0.22 * k; this.beam.visible = k > 0; }
  hide() { this.root.visible = false; }
}

// The guide arrow that floats above the player.
export class GuideArrow {
  constructor(scene) {
    const g = new GeoBuilder();
    g.box(0xffd23f, 0, 0, -0.35, 0.55, 0.3, 1.3);
    g.cone(0xffd23f, 0, 0, 0.65, 0.75, 1.0, 4, Math.PI / 2);
    this.mesh = toonMesh(g.build(), { outline: 0.05, cast: false });
    this.mesh.scale.setScalar(0.62);
    this.mesh.renderOrder = 5;
    scene.add(this.mesh);
    this.mesh.visible = false;
    this.yaw = 0;
  }
  set(x, y, z, yaw, t) {
    this.mesh.visible = true;
    let d = yaw - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * 0.2;
    this.mesh.position.set(x, y + Math.sin(t * 3) * 0.12, z);
    this.mesh.rotation.y = this.yaw;
  }
  hide() { this.mesh.visible = false; }
}
