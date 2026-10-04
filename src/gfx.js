import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE };
export let renderer, scene, camera, sun, hemi;
export const MAT = {};
const SUN_OFFSET = new THREE.Vector3(70, 130, 45);

export function initGfx(container) {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.25, 1800);

  hemi = new THREE.HemisphereLight(0xd8ecff, 0x8a7656, 1.45);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff0d6, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 10; sc.far = 420;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);

  scene.fog = new THREE.Fog(0xcbe7f6, 220, 760);
  initMaterials();
  addSky();
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Keep the shadow frustum centred on whatever the camera is looking at, snapped to texels so
// shadows don't crawl as the player moves.
const _snap = new THREE.Vector3();
export function followSun(x, z) {
  const texel = 150 / 2048;
  _snap.set(Math.round(x / texel) * texel, 0, Math.round(z / texel) * texel);
  sun.target.position.copy(_snap);
  sun.position.copy(_snap).add(SUN_OFFSET);
}

let gradient;
export function toonGradient() {
  if (gradient) return gradient;
  const data = new Uint8Array([105, 175, 232, 255]);
  gradient = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

function initMaterials() {
  const g = toonGradient();
  MAT.toon = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: g });
  MAT.burnt = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: g, color: 0x3a3236 });
  MAT.ghost = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: g, transparent: true, opacity: 0.62, depthWrite: false });
  MAT.glass = new THREE.MeshToonMaterial({ color: 0xbfe6ff, gradientMap: g, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  MAT.cloud = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: g, fog: false });
  MAT.water = new THREE.MeshToonMaterial({ color: 0x46b4e6, gradientMap: g });
  MAT.white = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: g });
  MAT.mouth = new THREE.MeshBasicMaterial({ vertexColors: true });
  MAT.beam = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
}

// Inverted-hull outline: a back-face copy pushed out along smoothed normals. Thickness grows a
// little with distance so far things keep a line instead of losing it to sub-pixel width.
const outlineMats = new Map();
export function outlineMat(t, color = 0x1d1426) {
  const key = t + ':' + color;
  if (outlineMats.has(key)) return outlineMats.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uOutline = { value: t };
    s.vertexShader = 'uniform float uOutline;\n' + s.vertexShader.replace(
      '#include <begin_vertex>',
      `vec4 _ov = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        _ov = instanceMatrix * _ov;
      #endif
      float _od = -(modelViewMatrix * _ov).z;
      vec3 transformed = position + normal * uOutline * clamp(_od * 0.035, 1.0, 4.0);`
    );
  };
  outlineMats.set(key, m);
  return m;
}

export function outlineGeometry(geo) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.attributes.position.clone());
  if (geo.index) g.setIndex(geo.index.clone());
  const m = mergeVertices(g, 1e-3);
  m.computeVertexNormals();
  return m;
}

export function toonMesh(geo, { outline = 0.04, cast = true, receive = true, material = MAT.toon } = {}) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  if (outline) {
    const o = new THREE.Mesh(outlineGeometry(geo), outlineMat(outline));
    o.castShadow = false;
    o.receiveShadow = false;
    o.name = 'outline';
    mesh.add(o);
  }
  return mesh;
}

// ---------------------------------------------------------------------------------------------
// Geometry assembly: everything static is built from coloured primitives merged into one mesh.

const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
export function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
}

const prim = {};
export const PRIM = {
  box: () => (prim.box ??= new THREE.BoxGeometry(1, 1, 1)),
  sphere: (w = 14, h = 10) => (prim['s' + w + '_' + h] ??= new THREE.SphereGeometry(0.5, w, h)),
  dome: () => (prim.dome ??= new THREE.SphereGeometry(0.5, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
  cyl: (n = 12) => (prim['c' + n] ??= new THREE.CylinderGeometry(0.5, 0.5, 1, n)),
  cone: (n = 12) => (prim['k' + n] ??= new THREE.ConeGeometry(0.5, 1, n)),
  ico: (d = 1) => (prim['i' + d] ??= new THREE.IcosahedronGeometry(0.5, d)),
  torus: () => (prim.torus ??= new THREE.TorusGeometry(0.5, 0.12, 6, 16)),
  capsule: () => (prim.capsule ??= new THREE.CapsuleGeometry(0.5, 1, 4, 10)),
  prism: () => (prim.prism ??= makePrism()),
};

// Unit gable roof: base 1x1 centred at origin on y=0, ridge along x at y=1.
function makePrism() {
  const v = [];
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5];
  const E = [-0.5, 1, 0], F = [0.5, 1, 0];
  const tri = (a, b, c) => v.push(...a, ...b, ...c);
  tri(A, E, F); tri(A, F, B); // north slope
  tri(D, C, F); tri(D, F, E); // south slope
  tri(A, D, E); // west gable
  tri(B, F, C); // east gable
  tri(A, B, C); tri(A, C, D); // bottom
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex([...Array(v.length / 3).keys()]);
  g.computeVertexNormals();
  return g;
}

// Unit wedge: base 1x1 at y=0, rising from z=-0.5 (height 0) to z=+0.5 (height 1).
export function makeWedge() {
  if (prim.wedge) return prim.wedge;
  const v = [];
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5];
  const E = [-0.5, 1, 0.5], F = [0.5, 1, 0.5];
  const tri = (a, b, c) => v.push(...a, ...b, ...c);
  tri(A, E, F); tri(A, F, B); // ramp face... winding fixed below by normals
  tri(D, C, F); tri(D, F, E); // back
  tri(A, D, E); tri(B, F, C);
  tri(A, B, C); tri(A, C, D);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex([...Array(v.length / 3).keys()]);
  g.computeVertexNormals();
  fixOutward(g);
  return (prim.wedge = g);
}

// Flip any triangle whose normal points towards the centroid of the mesh (convex solids only).
function fixOutward(g) {
  const p = g.attributes.position.array;
  let cx = 0, cy = 0, cz = 0;
  const n = p.length / 3;
  for (let i = 0; i < n; i++) { cx += p[i * 3]; cy += p[i * 3 + 1]; cz += p[i * 3 + 2]; }
  cx /= n; cy /= n; cz /= n;
  for (let t = 0; t < n; t += 3) {
    const a = t * 3, b = a + 3, c = a + 6;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (p[a] + p[b] + p[c]) / 3 - cx, my = (p[a + 1] + p[b + 1] + p[c + 1]) / 3 - cy, mz = (p[a + 2] + p[b + 2] + p[c + 2]) / 3 - cz;
    if (nx * mx + ny * my + nz * mz < 0) {
      for (let k = 0; k < 3; k++) { const tmp = p[b + k]; p[b + k] = p[c + k]; p[c + k] = tmp; }
    }
  }
  g.computeVertexNormals();
}
fixOutward(PRIM.prism());

const _col = new THREE.Color();
export class GeoBuilder {
  constructor() { this.parts = []; }
  add(geo, color, m) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', geo.attributes.position.clone());
    g.setAttribute('normal', geo.attributes.normal.clone());
    g.setIndex(geo.index ? geo.index.clone() : [...Array(geo.attributes.position.count).keys()]);
    if (m) g.applyMatrix4(m);
    _col.set(color);
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = _col.r; c[i * 3 + 1] = _col.g; c[i * 3 + 2] = _col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.parts.push(g);
    return this;
  }
  // Box by centre.
  box(color, x, y, z, w, h, d, ry = 0, rx = 0, rz = 0) { return this.add(PRIM.box(), color, mat(x, y, z, rx, ry, rz, w, h, d)); }
  // Box standing on y0.
  boxB(color, x, y0, z, w, h, d, ry = 0) { return this.box(color, x, y0 + h / 2, z, w, h, d, ry); }
  sphere(color, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0, seg) {
    return this.add(seg ? PRIM.sphere(seg, Math.max(6, (seg * 0.7) | 0)) : PRIM.sphere(), color, mat(x, y, z, rx, ry, rz, sx, sy, sz));
  }
  cyl(color, x, y, z, r, h, n = 12, rx = 0, ry = 0, rz = 0) { return this.add(PRIM.cyl(n), color, mat(x, y, z, rx, ry, rz, r * 2, h, r * 2)); }
  cone(color, x, y, z, r, h, n = 12, rx = 0, ry = 0, rz = 0) { return this.add(PRIM.cone(n), color, mat(x, y, z, rx, ry, rz, r * 2, h, r * 2)); }
  ico(color, x, y, z, s, d = 1, ry = 0) { return this.add(PRIM.ico(d), color, mat(x, y, z, 0, ry, 0, s, s, s)); }
  build() {
    if (!this.parts.length) return null;
    const g = mergeGeometries(this.parts, false);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
  get empty() { return this.parts.length === 0; }
}

// ---------------------------------------------------------------------------------------------
// Text on canvas, for signs, the water tower, marquees.

export function textCanvas(text, w, h, { bg = '#fff8e6', fg = '#1d1426', border = '#1d1426', font = '"Luckiest Guy", Impact, sans-serif', scale = 0.62, ppm = 96, stroke = null, borderW = 0.05 } = {}) {
  const cw = Math.min(2048, Math.round(w * ppm)), ch = Math.max(16, Math.round(cw * h / w));
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const x = cv.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, cw, ch); }
  if (border) { x.strokeStyle = border; x.lineWidth = ch * borderW; x.strokeRect(0, 0, cw, ch); }
  const lines = String(text).split('\n');
  let size = (ch * scale) / lines.length;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = `${size}px ${font}`;
  const widest = Math.max(...lines.map((l) => x.measureText(l).width));
  if (widest > cw * 0.9) { size *= (cw * 0.9) / widest; x.font = `${size}px ${font}`; }
  lines.forEach((l, i) => {
    const y = ch / 2 + (i - (lines.length - 1) / 2) * size * 1.08 + size * 0.06;
    if (stroke) { x.strokeStyle = stroke; x.lineWidth = size * 0.12; x.strokeText(l, cw / 2, y); }
    x.fillStyle = fg;
    x.fillText(l, cw / 2, y);
  });
  return cv;
}

export function signMesh(text, w, h, opts = {}) {
  const tex = new THREE.CanvasTexture(textCanvas(text, w, h, opts));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !opts.bg, side: opts.double ? THREE.DoubleSide : THREE.FrontSide }));
  return m;
}

// ---------------------------------------------------------------------------------------------
// Sky dome and clouds.

function addSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color(0x3d8fe0) }, horizon: { value: new THREE.Color(0xcbe7f6) } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vP;
      void main(){ float t = clamp(vP.y * 1.5, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(t, 0.75)), 1.0);
      #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 24, 12), mat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  sky.onBeforeRender = (r, s, cam) => sky.position.copy(cam.position);
  scene.add(sky);

  const clouds = new THREE.Group();
  const gb = new GeoBuilder();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let c = 0; c < 22; c++) {
    const a = (c / 22) * Math.PI * 2 + rnd() * 0.2;
    const R = 620 + rnd() * 220, y = 150 + rnd() * 140;
    const cx = Math.cos(a) * R, cz = Math.sin(a) * R;
    const puffs = 4 + ((rnd() * 4) | 0);
    for (let p = 0; p < puffs; p++) {
      const s = 30 + rnd() * 40;
      gb.sphere(0xffffff, cx + (p - puffs / 2) * 24 + rnd() * 10, y + rnd() * 12, cz + rnd() * 20, s, s * 0.7, s);
    }
  }
  const cm = new THREE.Mesh(gb.build(), new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), fog: false }));
  const om = outlineMat(0.6, 0x6f9ccc);
  om.fog = false;
  cm.add(new THREE.Mesh(outlineGeometry(cm.geometry), om));
  clouds.add(cm);
  scene.add(clouds);
  MAT._clouds = clouds;
}

export function tickSky(t, camPos) {
  if (MAT._clouds) {
    MAT._clouds.rotation.y = t * 0.004;
    MAT._clouds.position.set(camPos.x, 0, camPos.z);
  }
}
