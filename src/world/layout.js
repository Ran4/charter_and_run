// Nueva Estocolmo's street grid: N x N blocks between N+1 roads each way, plus the road graph
// that traffic, chasers and the waypoint arrow all route over. North (-z) is inland, south (+z)
// is the sea. Right-hand traffic.

export const P = 80;          // road pitch (centre to centre)
export const N = 7;           // blocks per side
export const HALF = (P * N) / 2;
export const RHW = 5.5;       // asphalt half-width
export const SW = 3.5;        // sidewalk width
export const LANE = 2.75;     // lane centre offset from the road centre line
export const CURB = 0.15;     // everything off the asphalt sits this high
export const EDGE = HALF + RHW + SW; // outer edge of the outermost sidewalk
export const BOUND = HALF + 34;      // invisible wall beyond the trees

export const rc = (i) => i * P - HALF;

export function blockInterior(i, j) {
  return { x0: rc(i) + RHW + SW, x1: rc(i + 1) - RHW - SW, z0: rc(j) + RHW + SW, z1: rc(j + 1) - RHW - SW };
}
export function blockAt(x, z) {
  const i = Math.floor((x + HALF) / P), j = Math.floor((z + HALF) / P);
  if (i < 0 || j < 0 || i >= N || j >= N) return null;
  return { i, j };
}

// Distance from the nearest road centre line along each axis (or Infinity off-grid).
function offAxis(v, other) {
  if (Math.abs(other) > HALF + RHW) return Infinity;
  if (v < -HALF - RHW || v > HALF + RHW) return Infinity;
  const m = (((v + HALF) % P) + P) % P;
  return Math.min(m, P - m);
}
export function isRoad(x, z) {
  return offAxis(x, z) <= RHW || offAxis(z, x) <= RHW;
}
export function baseGround(x, z) {
  return isRoad(x, z) ? 0 : CURB;
}

// MAP[j][i]: the block type at column i, row j (DESIGN §6.2). Unknown types build an empty slab.
//                 i=0          1            2            3            4            5            6
export const MAP = [
  ['fataga',    'tomat',     'grisfest',  'tomat',     'golf',      'bungalow',  'flygplats'], // j=0 inland
  ['tomat',     'lagenhet',  'marknad',   'kyrka',     'lagenhet',  'bygge',     'dromplan'],  // j=1
  ['bungalowR', 'kasbah',    'lagenhet',  'suntrip',   'cita',      'lagenhet',  'bungalowR'], // j=2
  ['lagenhet',  'bungalowR', 'plaza',     'flamenco',  'bensin',    'guardia',   'lagenhet'],  // j=3
  ['dyner',     'lagenhet',  'bungalowR', 'lagenhet',  'lagenhet',  'bungalowR', 'lagenhet'],  // j=4
  ['dyner',     'bungalowR', 'lagenhet',  'bungalowR', 'lagenhet',  'lagenhet',  'bungalowR'], // j=5
  ['fyren',     'playa',     'playa',     'playa',     'playa',     'hamn',      'playa'],     // j=6 sea
];

// Minimap lot colours per MAP type (WP-B tunes them).
export const BLOCK_MAP_COLORS = {
  flamenco: '#f4efe6', suntrip: '#f2d98a', kasbah: '#d8b48a', cita: '#c8c0b0', plaza: '#e8d8b0',
  marknad: '#e0b878', kyrka: '#f4f0e6', bensin: '#9a9a96', guardia: '#c9a26b', tomat: '#7aa04a',
  grisfest: '#b89a6a', fataga: '#c9a26b', golf: '#7cc456', bungalow: '#e8dcc4', bygge: '#c09a64',
  dromplan: '#b8a07a', flygplats: '#a8a8a0', dyner: '#e8cf98', fyren: '#e8cf98', playa: '#e8cf98',
  hamn: '#5aa0c8', bungalowR: '#e6d6b8', lagenhet: '#dccbb0',
};
export const blockType = (i, j) => MAP[j][i];

// --------------------------------------------------------------------------------------------
// Road graph. Node id = j*(N+1)+i, at road intersections.

export const NN = N + 1;
export const nodeId = (i, j) => j * NN + i;
export const nodeI = (id) => id % NN;
export const nodeJ = (id) => Math.floor(id / NN);
export const nodeX = (id) => rc(id % NN);
export const nodeZ = (id) => rc(Math.floor(id / NN));

export function neighbors(id) {
  const i = nodeI(id), j = nodeJ(id), out = [];
  if (i > 0) out.push(nodeId(i - 1, j));
  if (i < N) out.push(nodeId(i + 1, j));
  if (j > 0) out.push(nodeId(i, j - 1));
  if (j < N) out.push(nodeId(i, j + 1));
  return out;
}

// A node reference may be an id or an [i, j] pair.
export const nodeRef = (n) => (Array.isArray(n) ? nodeId(n[0], n[1]) : n);

// Right-hand lane spot on the edge node a -> node b, t metres from a, facing along the edge.
export function laneSpot(a, b, t = 12) {
  const A = nodeRef(a), B = nodeRef(b);
  const ax = nodeX(A), az = nodeZ(A), bx = nodeX(B), bz = nodeZ(B);
  const l = Math.hypot(bx - ax, bz - az) || 1;
  const dx = (bx - ax) / l, dz = (bz - az) / l;
  return { x: ax + dx * t - dz * LANE, z: az + dz * t + dx * LANE, yaw: Math.atan2(dx, dz) };
}

export function nearestNode(x, z) {
  const i = Math.max(0, Math.min(N, Math.round((x + HALF) / P)));
  const j = Math.max(0, Math.min(N, Math.round((z + HALF) / P)));
  return nodeId(i, j);
}

// Shortest node path. The grid is complete so this is just a Manhattan staircase, but we take
// the BFS anyway so a blocked road can be modelled later.
export function findPath(a, b, blocked = null) {
  if (a === b) return [a];
  const prev = new Map([[a, -1]]);
  const q = [a];
  while (q.length) {
    const n = q.shift();
    if (n === b) break;
    const nb = neighbors(n);
    for (let k = nb.length - 1; k > 0; k--) { const r = (Math.random() * (k + 1)) | 0; [nb[k], nb[r]] = [nb[r], nb[k]]; }
    for (const m of nb) {
      if (prev.has(m) || (blocked && blocked.has(m))) continue;
      prev.set(m, n);
      q.push(m);
    }
  }
  if (!prev.has(b)) return [a];
  const path = [];
  for (let n = b; n !== -1; n = prev.get(n)) path.push(n);
  return path.reverse();
}

// Nodes at the corners of the grid cell holding (x,z), for routing from mid-block.
export function cellCorners(x, z) {
  const i = Math.max(0, Math.min(N - 1, Math.floor((x + HALF) / P)));
  const j = Math.max(0, Math.min(N - 1, Math.floor((z + HALF) / P)));
  return [nodeId(i, j), nodeId(i + 1, j), nodeId(i, j + 1), nodeId(i + 1, j + 1)];
}

// Where to steer someone at (x,z) heading for (tx,tz): the next intersection along a shortest
// road route, or the target itself once it's close or on the same stretch of road.
export function routeAim(x, z, tx, tz) {
  const d = Math.hypot(tx - x, tz - z);
  if (d < 45) return { x: tx, z: tz, nodes: [] };
  const tn = nearestNode(tx, tz);
  let best = null, bestCost = Infinity;
  for (const c of cellCorners(x, z)) {
    const cx = nodeX(c), cz = nodeZ(c);
    const cost = Math.hypot(cx - x, cz - z) + (Math.abs(nodeI(c) - nodeI(tn)) + Math.abs(nodeJ(c) - nodeJ(tn))) * P + Math.hypot(nodeX(tn) - tx, nodeZ(tn) - tz);
    if (cost < bestCost) { bestCost = cost; best = c; }
  }
  const nodes = manhattanPath(best, tn, x, z);
  let k = 0;
  while (k < nodes.length - 1 && Math.hypot(nodeX(nodes[k]) - x, nodeZ(nodes[k]) - z) < 14) k++;
  if (k >= nodes.length - 1 && Math.hypot(nodeX(nodes[k]) - x, nodeZ(nodes[k]) - z) < 14) return { x: tx, z: tz, nodes };
  return { x: nodeX(nodes[k]), z: nodeZ(nodes[k]), nodes: nodes.slice(k) };
}

// Staircase path preferring to travel first along the axis we're already lined up with.
function manhattanPath(a, b, x, z) {
  const out = [a];
  let i = nodeI(a), j = nodeJ(a);
  const bi = nodeI(b), bj = nodeJ(b);
  const firstI = Math.abs(nodeZ(a) - z) < Math.abs(nodeX(a) - x);
  const stepI = () => { while (i !== bi) { i += Math.sign(bi - i); out.push(nodeId(i, j)); } };
  const stepJ = () => { while (j !== bj) { j += Math.sign(bj - j); out.push(nodeId(i, j)); } };
  if (firstI) { stepI(); stepJ(); } else { stepJ(); stepI(); }
  return out;
}

// Landmarks: name -> { x, z, yaw, y? }. Filled in by registerIslandLandmarks (landmarks-island.js),
// block builders (their own block only) and buildCabin (flight set at x = 3000).
export const landmarks = {};
export function lm(name) {
  const l = landmarks[name];
  if (!l) throw new Error('unknown landmark ' + name);
  return l;
}
