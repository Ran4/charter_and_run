// Timer calibration and difficulty checks for the island missions (DESIGN §8 "Timers and
// difficulty"). Written by WP-G, reworked by the Phase 2 balance pass (§15.3 step 5).
//   PORT=… OUT=… node tools/shot.mjs calibrate          (all cases)
//   CAL=buss17,race node tools/shot.mjs calibrate        (a subset; ids below)
// Env: RUNS (drive runs per deterministic stage, default 3), JEEP_RUNS (12), FOOT_RUNS (4),
// HOME_RUNS (2 per spot), RACE_RUNS (2 clean + 2 with one crash), PURSUIT_RUNS (3 per driver), JEEP=cruise:damageScale,
// RACE_SWEEP='cruise:maxSpeed:accel:steer;…', RACE_CAR (sedan).
// A headless autopilot drives the PLAYER's car (PLAYER_BOOST 1.2, timeScale 1 via &ts=1, traffic
// on) by writing playerCar.ctrl every fixed step (it sits in car.ai, which main.js steps right after
// the input write): lane-following pure pursuit over the road graph, full throttle, braking before
// corners from a curvature speed profile, overtaking slower traffic on clear straights. `smooth`
// stages keep lateral accel ≤ 5.2 m/s² and braking ≤ 9 m/s² (ÅKSJUKA counts > 6 and > 14);
// `fragile` stages avoid impacts. On foot it holds W+Shift and steers the camera yaw (kicking
// when a smash target is in reach).
// Each timed stage is entered directly (runner.stageI + startStage) with the player placed where a
// human would be when that stage starts, so a measurement never depends on earlier stages.
// Statistics (§8): a deterministic drive's T_ref is the MEDIAN of its clean runs (no impact; within
// the ÅKSJUKA limits for `smooth`); random stages (fleeing targets, random spawns, the jeep's flee
// route) use the 75th percentile. On foot, T_ref = measured + 0.5 s per target (a human's reaction
// and aim). timer = T_ref × 1.2 (drives) / × 1.25 (on foot), rounded up to a whole second.
// The printed table (`[t] CAL …` lines and the final summary) is DESIGN §8's timer table.
import { check, pct, timerRange } from '../lib.mjs';

// Whole seconds: a 5 s step alone added up to 5 s of slack (vischan 30.6 -> 35, 27 % left).
export const roundTimer = (t) => Math.ceil(t);
const CAL = process.env.CAL ? process.env.CAL.split(',') : null;
const want = (id) => !CAL || CAL.includes(id);
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
// pct (interpolated percentile) and timerRange (a random stage's bootstrap timer range) are in lib.mjs.
const f1 = (v) => (v == null ? '-' : (+v).toFixed(1));

// ---------------------------------------------------------------------------------------------
// Page side: the autopilot. Serialised into the page by T.ev (no closure over Node variables).

export async function installAutopilot() {
  if (window.__ap) return true;
  const L = await import('/src/world/layout.js');
  const D = await import('/src/actors/drivers.js');
  const { input } = await import('/src/input.js');
  const C = await import('/src/world/collision.js');
  const g = window.__game;
  const LANE = L.LANE;
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const yawTo = (dx, dz) => Math.atan2(dx, dz);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const NR = (n) => L.nodeRef(n);
  const nx = (id) => L.nodeX(id), nz = (id) => L.nodeZ(id);
  const ap = (window.__ap = { t: 0, active: null, foot: null, topScale: 1 });

  // --- route planning: L-shaped node staircases, both turn orders, both end-edge directions -----
  function stair(a, b, iFirst) {
    const out = [a];
    let i = L.nodeI(a), j = L.nodeJ(a);
    const bi = L.nodeI(b), bj = L.nodeJ(b);
    const si = () => { while (i !== bi) { i += Math.sign(bi - i); out.push(L.nodeId(i, j)); } };
    const sj = () => { while (j !== bj) { j += Math.sign(bj - j); out.push(L.nodeId(i, j)); } };
    if (iFirst) { si(); sj(); } else { sj(); si(); }
    return out;
  }
  function score(ns) {
    let len = 0, turns = 0, rev = 0;
    for (let k = 1; k < ns.length; k++) len += Math.hypot(nx(ns[k]) - nx(ns[k - 1]), nz(ns[k]) - nz(ns[k - 1]));
    for (let k = 1; k < ns.length - 1; k++) {
      if (ns[k - 1] === ns[k + 1]) { rev++; continue; }
      const d1 = [nx(ns[k]) - nx(ns[k - 1]), nz(ns[k]) - nz(ns[k - 1])], d2 = [nx(ns[k + 1]) - nx(ns[k]), nz(ns[k + 1]) - nz(ns[k])];
      if (d1[0] * d2[0] + d1[1] * d2[1] < 1) turns++;
    }
    return len + turns * 12 + rev * 70;
  }
  // The road edge (pair of nodes) a point lies on or next to.
  function edgeAt(x, z) {
    const fi = (x + L.HALF) / L.P, fj = (z + L.HALF) / L.P;
    const di = Math.abs(fi - Math.round(fi)) * L.P, dj = Math.abs(fj - Math.round(fj)) * L.P;
    if (di <= dj) { const i = clamp(Math.round(fi), 0, L.N), j = clamp(Math.floor(fj), 0, L.N - 1); return [L.nodeId(i, j), L.nodeId(i, j + 1)]; }
    const j = clamp(Math.round(fj), 0, L.N), i = clamp(Math.floor(fi), 0, L.N - 1);
    return [L.nodeId(i, j), L.nodeId(i + 1, j)];
  }
  // Off-road approach from the end edge's right-hand lane to `end` (driven slowly, and backed
  // out of afterwards): weighted 4× in the route score.
  function approach(A, B, end) {
    if (!end) return 0;
    const ax = nx(A), az = nz(A), dx = nx(B) - ax, dz = nz(B) - az, l = Math.hypot(dx, dz) || 1;
    const ux = dx / l, uz = dz / l, lx = ax - uz * LANE, lz = az + ux * LANE;
    const u = clamp((end.x - lx) * ux + (end.z - lz) * uz, 0, l);
    return Math.hypot(lx + ux * u - end.x, lz + uz * u - end.z);
  }
  function plan(car, endEdges, via = [], end = null) {
    const [a, b] = D.startNodes(car);
    let best = null;
    for (const [s0, s1, pen] of [[a, b, 0], [b, a, 40]]) {
      for (const e of endEdges) for (const [A, B] of [[NR(e[0]), NR(e[1])], [NR(e[1]), NR(e[0])]]) for (const iF of [true, false]) {
        const ns = [s0, s1];
        for (const t of [...via.map(NR), A]) ns.push(...stair(ns[ns.length - 1], t, iF).slice(1));
        ns.push(B);
        const sc = score(ns) + pen + 4 * approach(A, B, end);
        if (!best || sc < best.sc) best = { ns, sc };
      }
    }
    return best.ns;
  }

  // --- path geometry: lane points, entry from where the car stands, exit to the end point -------
  // Right-hand lane lines joined by circular fillets, wider than the lane path's own corners (a
  // good driver uses the whole junction): right turns R 9 m, left turns R 13 m.
  // A long vehicle takes every turn at 1.1 × the radius it can hold at 4 m/s (steering lock falls
  // off with speed: steer / (1 + v/15)); the bus (15 m there) otherwise ran wide out of a left
  // turn into the kerbside pole at (-46, -182).
  function lanePts(ns, car) {
    const rMin = car ? (car.spec.len * 0.62) / Math.tan(car.spec.steer / (1 + 4 / 15)) * 1.1 : 0;
    const out = [];
    const dir = (a, b) => { const dx = nx(b) - nx(a), dz = nz(b) - nz(a), l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
    const lanePt = (a, b, t) => { const [dx, dz] = dir(a, b); return { x: nx(a) + dx * t - dz * LANE, z: nz(a) + dz * t + dx * LANE }; };
    let cur = lanePt(ns[0], ns[1], 0);
    out.push(cur);
    const seg = (a, b) => { const l = hyp(a, b), n = Math.max(1, Math.round(l / 5)); for (let i = 1; i <= n; i++) out.push({ x: a.x + (b.x - a.x) * (i / n), z: a.z + (b.z - a.z) * (i / n) }); };
    for (let k = 1; k < ns.length - 1; k++) {
      const A = ns[k - 1], B = ns[k], Cn = ns[k + 1];
      const [d1x, d1z] = dir(A, B), [d2x, d2z] = dir(B, Cn);
      const dot = d1x * d2x + d1z * d2z;
      if (dot > 0.9) continue;                       // straight on
      const r1 = [-d1z, d1x], r2 = [-d2z, d2x];
      if (dot < -0.9) {                              // U-turn: swing round in front of the node
        const e = { x: nx(B) - d1x * 6 + r1[0] * LANE, z: nz(B) - d1z * 6 + r1[1] * LANE };
        seg(cur, e);
        for (const [f, l] of [[2, 1], [4, 0], [2, -1]]) out.push({ x: nx(B) - d1x * (6 - f) + r1[0] * LANE * l, z: nz(B) - d1z * (6 - f) + r1[1] * LANE * l });
        cur = { x: nx(B) - d1x * 6 - r1[0] * LANE, z: nz(B) - d1z * 6 - r1[1] * LANE };
        out.push(cur);
        continue;
      }
      const right = r1[0] * d2x + r1[1] * d2z > 0;
      const R = Math.max(right ? 9 : 13, rMin);
      const P = { x: nx(B) + (r1[0] + r2[0]) * LANE, z: nz(B) + (r1[1] + r2[1]) * LANE };
      const T1 = { x: P.x - d1x * R, z: P.z - d1z * R }, T2 = { x: P.x + d2x * R, z: P.z + d2z * R };
      const nrm = right ? r1 : [-r1[0], -r1[1]];
      const c = { x: T1.x + nrm[0] * R, z: T1.z + nrm[1] * R };
      seg(cur, T1);
      const a0 = Math.atan2(T1.z - c.z, T1.x - c.x), a1 = Math.atan2(T2.z - c.z, T2.x - c.x);
      let da = wrap(a1 - a0);
      const n = Math.max(3, Math.ceil(Math.abs(da) * R / 2));
      for (let i = 1; i <= n; i++) { const a = a0 + da * (i / n); out.push({ x: c.x + Math.cos(a) * R, z: c.z + Math.sin(a) * R, turn: true }); }
      cur = T2;
    }
    seg(cur, lanePt(ns[ns.length - 2], ns[ns.length - 1], hyp({ x: nx(ns[ns.length - 2]), z: nz(ns[ns.length - 2]) }, { x: nx(ns[ns.length - 1]), z: nz(ns[ns.length - 1]) })));
    return out;
  }
  // `pre`: lead-in points driven first (out of a car park onto the road, as a human would).
  function buildPath(car, ns, end, pre) {
    let pts = lanePts(ns, car);
    let exit = null;
    if (end) {
      let k = pts.length - 1;
      while (k > 0 && hyp(pts[k - 1], end) < hyp(pts[k], end)) k--;
      pts = pts.slice(0, k + 1);
      exit = { x: pts[k].x, z: pts[k].z, d: hyp(pts[k], end), pts: [] };
      const d = hyp(pts[k], end);
      // Off the road (a plaza, a beach): an A* route for the car's footprint round the kerbside
      // furniture (palms, signs, stalls), not a straight line through it.
      const fp = d > 5 ? footPath(pts[k].x, pts[k].z, car.y, end.x, end.z, Math.max(1.1, car.spec.wid / 2 + 0.2), 0.6) : null;
      if (fp && fp.length > 2) { for (let i = 3; i < fp.length - 1; i += 3) exit.pts.push(fp[i]); exit.pts.push({ x: end.x, z: end.z }); pts.push(...exit.pts); }
      else { const n = Math.max(1, Math.round(d / 4)); for (let i = 1; i <= n; i++) { const q = { x: pts[k].x + (end.x - pts[k].x) * (i / n), z: pts[k].z + (end.z - pts[k].z) * (i / n) }; pts.push(q); exit.pts.push(q); } }
    }
    if (pre?.length) {
      // Join the lane at the point nearest the last lead-in point.
      const q = pre[pre.length - 1];
      let k0 = 0, bd = Infinity;
      for (let k = 0; k < pts.length; k++) { const d = hyp(pts[k], q); if (d < bd) { bd = d; k0 = k; } }
      const out = [];
      let cur = { x: car.x, z: car.z };
      for (const p of pre) { const l = hyp(cur, p), n = Math.max(1, Math.round(l / 3)); for (let i = 1; i <= n; i++) out.push({ x: cur.x + (p.x - cur.x) * (i / n), z: cur.z + (p.z - cur.z) * (i / n) }); cur = p; }
      const r = [...out, ...pts.slice(k0 + 1)];
      r.exit = exit;
      return r;
    }
    // Entry: project the car onto the first 160 m and join a little ahead of the projection.
    const s = [0];
    for (let k = 1; k < pts.length; k++) s.push(s[k - 1] + hyp(pts[k], pts[k - 1]));
    let bs = 0, bd = Infinity;
    for (let k = 0; k < pts.length - 1 && s[k] < 160; k++) {
      const a = pts[k], b = pts[k + 1], lx = b.x - a.x, lz = b.z - a.z, l2 = lx * lx + lz * lz || 1;
      const u = clamp(((car.x - a.x) * lx + (car.z - a.z) * lz) / l2, 0, 1);
      const d = Math.hypot(a.x + lx * u - car.x, a.z + lz * u - car.z);
      if (d < bd) { bd = d; bs = s[k] + u * Math.sqrt(l2); }
    }
    const lead = bs > 0 ? clamp(0.7 * bd, 5, 18) : 0;
    let i0 = 0;
    while (i0 < pts.length - 1 && s[i0] < bs + lead) i0++;
    const r = pts.slice(i0);
    r.exit = exit;
    return r;
  }
  function menger(a, b, c) {
    const ab = hyp(a, b), bc = hyp(b, c), ca = hyp(c, a);
    const cross = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x));
    return ab * bc * ca > 1e-6 ? (2 * cross) / (ab * bc * ca) : 0;
  }
  function limits(car, mode) {
    const s = car.spec;
    return { s, wb: s.len * 0.62, top: s.maxSpeed * (g.playerCar === car ? 1.2 : 1) * ap.topScale, aLat: mode === 'smooth' ? 5.2 : 30, aBr: mode === 'smooth' ? 9 : 19 };
  }
  // Highest speed at which the car can hold curvature k (lateral accel and steering lock).
  function capSpeed(k, lim) {
    if (k < 1e-4) return lim.top;
    k = Math.min(k, Math.tan(lim.s.steer) / lim.wb);
    let v = Math.min(lim.top, Math.sqrt(lim.aLat / k));
    while (v > 4 && Math.tan(lim.s.steer / (1 + v / 15)) / lim.wb < k * 1.08) v -= 0.5;
    return Math.max(4, v);
  }
  function profile(pts, lim, vEnd) {
    const n = pts.length, v = new Array(n).fill(lim.top);
    for (let k = 1; k < n - 1; k++) {
      const a = pts[Math.max(0, k - 1)], c = pts[Math.min(n - 1, k + 1)];
      v[k] = capSpeed(menger(a, pts[k], c), lim);
    }
    v[n - 1] = Math.min(lim.top, vEnd);
    for (let k = n - 2; k >= 0; k--) v[k] = Math.min(v[k], Math.sqrt(v[k + 1] ** 2 + 2 * lim.aBr * hyp(pts[k], pts[k + 1])));
    return v;
  }

  // --- traffic: brake behind slower things in our lane, overtake on clear straights ------------
  function traffic(car, vt, lim, path, idx) {
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw), rx = -fz, rz = fx;
    const v = car.forwardSpeed, range = v * v / (2 * lim.aBr) + 14;
    let capIn = Infinity, slowAhead = null, leftBusy = false, rightBusy = false;
    const halfW = car.spec.wid / 2;
    const off = path.off || 0;
    let capBy = null;
    const scan = (x, z, r, ov, isCar, oncoming, half = r, who = 'ped') => {
      const dx = x - car.x, dz = z - car.z, along = dx * fx + dz * fz - car.spec.len / 2 - r, lat = dx * rx + dz * rz;
      if (along < -16 || along > Math.max(range, 55)) return;
      // lat is measured from the car itself, which sits `off` from the path lane: its own lane is lat ≈ 0.
      if (Math.abs(lat) < halfW + r + 0.5 && along > -1 && along < range) {
        const c = Math.max(0, ov) + Math.sqrt(2 * lim.aBr * 0.6 * Math.max(0, along - (isCar ? 6 : 3)));
        // Slower than we want to go (not merely than we go now: following at its speed is still slow).
        if (c < capIn) { capIn = c; capBy = who; if (isCar && (ov < Math.max(v, Math.min(vt, lim.top)) - 2 || ov < 1.5)) slowAhead = { along }; }
      }
      if (isCar && lat < -2.2 && lat > -9 && along > -6 && along < (oncoming ? 70 : 45)) leftBusy = true;
      // Out in the left lane: the right lane (lat ≈ -off) is busy while a car overlaps us there
      // lengthwise, with 3 m behind and 6 m in front to spare (no cutting in).
      if (isCar && off < -1 && Math.abs(lat + off) < halfW + 1.6 && dx * fx + dz * fz > -(car.spec.len / 2 + half + 3) && dx * fx + dz * fz < car.spec.len / 2 + half + 6) rightBusy = true;
    };
    for (const o of g.cars) {
      if (o === car || (path.ignore && o.name === path.ignore) || o.isPursuer || Math.abs(o.x - car.x) > 80 || Math.abs(o.z - car.z) > 80) continue;
      const ov = o.vx * fx + o.vz * fz;
      scan(o.x, o.z, Math.min(o.spec.wid, o.spec.len) / 2, ov, true, ov < -2, o.spec.len / 2, o.traffic ? 'traffic' : o.ai ? (o.name || 'ai') : 'parked');
    }
    for (const p of g.peds) { const c = p.char; if (c.state === 'normal' && Math.abs(c.x - car.x) < 60 && Math.abs(c.z - car.z) < 60) scan(c.x, c.z, 0.4, 0, false, false); }
    // Overtake: a slower car ahead, the left lane clear, the next 50 m straight.
    let straight = true;
    for (let k = idx, s = 0; k < path.pts.length - 1 && s < 55; s += hyp(path.pts[k], path.pts[k + 1]), k++) if (path.v[k] < lim.top * 0.85) { straight = false; break; }
    // Stalled behind something that is not moving (a wreck, a parked car): pull out regardless.
    path.stallT = (slowAhead || capIn < 1) && v < 2 ? (path.stallT || 0) + 1 / 60 : 0;
    if (path.stallT > 1.2) path.forceT = 3;
    path.forceT = Math.max(0, (path.forceT || 0) - 1 / 60);
    // Merging back needs the right lane clear for 0.3 s; a car showing up there mid-merge sends
    // us back out (no cutting in).
    path.clearT = rightBusy ? 0 : (path.clearT || 0) + 1 / 60;
    const canMerge = path.clearT > 0.3;
    if (path.forceT > 0) path.offT = -2 * LANE;
    else {
      if (slowAhead && !leftBusy && straight && path.mode !== 'smooth' && slowAhead.along < 30) path.offT = -2 * LANE;
      else if (path.offT < 0 && !slowAhead && canMerge) path.offT = 0;
      if (!straight && canMerge) path.offT = 0;
      if (rightBusy && path.off < -1.5) path.offT = -2 * LANE;
    }
    path.capBy = capBy;
    return capIn;
  }

  // Pushing without moving (a wall, a parked car): back up with the wheel turned the other way.
  // Stuck again within 6 s of the last time, it backs up longer (1, 1.6, 2.2 … 3 s), the wheel
  // the other way each time: a plain 1 s reverse could not free the jeep chase's truck from
  // between a kerbside tree and the Flamenco bins (Phase 2: about one chase in three wedged).
  function unstick(car, st, dt) {
    const c = car.ctrl;
    if ((st.revT || 0) > 0) { st.revT -= dt; c.throttle = 0; c.brake = 1; c.park = false; c.steer = -(st.revSteer || 0); return true; }
    if (c.throttle > 0.5 && Math.abs(car.forwardSpeed) < 1) st.stuckT = (st.stuckT || 0) + dt;
    else st.stuckT = Math.max(0, (st.stuckT || 0) - dt);
    if (st.stuckT > 0.9) {
      st.streak = ap.t - (st.stuckAt ?? -Infinity) < 6 ? (st.streak || 0) + 1 : 0;
      st.stuckAt = ap.t;
      st.stuckT = 0; st.revT = Math.min(3, 1 + 0.6 * st.streak); st.revSteer = (c.steer || 1) * (st.streak % 2 ? -1 : 1);
      st.unsticks = (st.unsticks || 0) + 1;
    }
    return false;
  }

  // --- the controller (car.ai): pure pursuit + speed profile --------------------------------------
  // path.crashAt (m driven): one big crash there, the way a human loses a race to a lamp post: the
  // car stops dead 3.5 m to the right (on the kerb), or with crashSide 'left' in the left lane (the
  // race: out of the bus's lane, since the race bus does not brake and would shunt it), turned
  // 0.5 rad, and needs 1 s to recover.
  // `ust`: the object that keeps the unstick state (default: the controller's own), for a caller
  // that builds a new controller on every re-plan (the chase).
  function makeController(car, path, ust = null) {
    const lim = limits(car, path.mode);
    path.v = profile(path.pts, lim, path.vEnd ?? 10);
    path.idx = 0; path.off = 0; path.offT = 0;
    const st = { impacts: 0, hits: [], blockedT: 0, maxLat: 0, maxBrake: 0, dist: 0, pvx: car.vx, pvz: car.vz, px: car.x, pz: car.z, crashed: false, crashHold: 0 };
    return {
      st, path, lim,
      update(dt, game) {
        const c = car.ctrl;
        c.park = false; c.handbrake = false;
        // Held still (race countdown, dialogue): park, since brake at standstill means reverse.
        if (game.freezeCar || game.inDialog || game.missions.state === 'failed' || (game.missions.state !== 'running' && !path.free)) { c.throttle = 0; c.brake = 0; c.steer = 0; c.park = true; return; }
        const pts = path.pts;
        // Impacts and lateral accel (for the clean-run check).
        const dv = Math.hypot(car.vx - st.pvx, car.vz - st.pvz);
        if (dv > 3 * (dt / (1 / 60)) && !st.justCrashed) { st.impacts++; st.hits.push([+car.x.toFixed(1), +car.z.toFixed(1), +dv.toFixed(1)]); }
        st.justCrashed = false;
        st.dist += Math.hypot(car.x - st.px, car.z - st.pz); st.px = car.x; st.pz = car.z;
        if (path.crashAt != null && !st.crashed && st.dist >= path.crashAt) {
          // Into the kerb furniture on the right: stopped 3.5 m to the right, nose 0.5 rad off the road.
          st.crashed = true; st.crashHold = 1.0; st.crashV = +car.forwardSpeed.toFixed(1); st.justCrashed = true;
          if (path.crashSide === 'left') {
            // Race: spun out into the left lane (lane offset −3.3 m from the road's centre line,
            // nose 0.5 rad left), whichever lane it was in. Shifting it "3.5 m right" put a player
            // who had moved over to the right lane into the bus's lane: the bus shunted it and lost
            // time itself, and the "one crash loses" check flaked (Phase 2 exit run).
            const [n1, n2] = edgeAt(car.x, car.z);
            let dx = nx(n2) - nx(n1), dz = nz(n2) - nz(n1);
            const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
            if (dx * Math.sin(car.yaw) + dz * Math.cos(car.yaw) < 0) { dx = -dx; dz = -dz; }
            const rx = -dz, rz = dx, lat = (car.x - nx(n1)) * rx + (car.z - nz(n1)) * rz;
            car.place(car.x + rx * (-3.3 - lat), car.z + rz * (-3.3 - lat), Math.atan2(dx, dz) + 0.5);
          } else {
            const rx = -Math.cos(car.yaw), rz = Math.sin(car.yaw);
            car.place(car.x + rx * 3.5, car.z + rz * 3.5, car.yaw - 0.5);
          }
          car.vx = 0; car.vz = 0; car.w = 0;
        }
        st.pvx = car.vx; st.pvz = car.vz;
        if (st.crashHold > 0) { st.crashHold -= dt; c.throttle = 0; c.brake = 0; c.park = true; return; }
        st.maxLat = Math.max(st.maxLat, Math.abs(car.forwardSpeed * (car.w || 0)));
        // Progress along the path.
        while (path.idx < pts.length - 1) {
          const q = pts[path.idx], dx = q.x - car.x, dz = q.z - car.z;
          const ahead = dx * Math.sin(car.yaw) + dz * Math.cos(car.yaw);
          if (dx * dx + dz * dz < 9 || (ahead < 0 && dx * dx + dz * dz < 144) || hyp(pts[path.idx + 1], car) < hyp(q, car) - 0.5) path.idx++;
          else break;
        }
        const v = car.forwardSpeed;
        const Ld = 3.5 + Math.max(0, v) * 0.3 + lim.wb * 0.4;
        // Lookahead along the path from the car's projection (the car may sit `off` beside it).
        let k = path.idx, acc = Math.max(0, hyp(pts[k], car) - Math.abs(path.off)), aim = pts[k];
        while (acc < Ld && k < pts.length - 1) { acc += hyp(pts[k], pts[k + 1]); k++; aim = pts[k]; }
        // Lateral offset (overtaking) at the aim point.
        path.off += clamp(path.offT - path.off, -4 * dt, 4 * dt);
        let ax = aim.x, az = aim.z;
        if (Math.abs(path.off) > 0.05 && k > 0) {
          const p0 = pts[k - 1], l = hyp(aim, p0) || 1, dx = (aim.x - p0.x) / l, dz = (aim.z - p0.z) / l;
          ax += -dz * path.off; az += dx * path.off;
        }
        const e = wrap(yawTo(ax - car.x, az - car.z) - car.yaw);
        c.steer = clamp(-e * 2.6, -1, 1);
        let vt = Math.min(path.v[path.idx], path.v[Math.min(pts.length - 1, path.idx + 1)]);
        if (Math.abs(e) > 0.12) vt = Math.min(vt, capSpeed((2 * Math.abs(Math.sin(e))) / Math.max(2, acc), lim));
        const cap = traffic(car, vt, lim, path, path.idx);
        if (cap < vt - 1) { st.blockedT += dt; const by = path.capBy || '?'; (st.blockedBy ||= {})[by] = (st.blockedBy[by] || 0) + dt; }
        vt = Math.min(vt, cap);
        if (path.done?.()) vt = 0;
        if (v < vt - 0.4) { c.throttle = 1; c.brake = 0; }
        else if (v > vt + 0.8) { c.throttle = 0; c.brake = clamp((v - vt) * 0.25, 0.08, path.mode === 'smooth' ? 0.3 : 1); }
        else if (vt < 0.5 && v < 0.8) { c.throttle = 0; c.brake = 0; c.park = true; }
        else { c.throttle = 0.35; c.brake = 0; }
        if (v > 0.5 && c.brake > 0) st.maxBrake = Math.max(st.maxBrake, c.brake * 24 * 1.2);
        unstick(car, ust || st, dt);
      },
    };
  }

  // --- public API ---------------------------------------------------------------------------------
  const lmOr = (p) => (typeof p === 'string' ? L.lm(p) : p);
  ap.endAt = (p) => lmOr(p);
  // Drive the player's car: { end, endEdges, via?, nodes?, pre?, mode, vEnd, crashAt?, until: 'stage' | { npc } }.
  ap.drive = (spec) => {
    const car = g.playerCar;
    if (!car) return { err: 'no car' };
    const end = spec.end ? lmOr(spec.end) : null;
    const ns = spec.nodes ? spec.nodes.map(NR) : plan(car, spec.endEdges || [edgeAt(end.x, end.z)], spec.via || [], end);
    const pts = buildPath(car, ns, end, spec.pre);
    const path = { pts, mode: spec.mode || 'normal', vEnd: spec.vEnd ?? 10, ignore: spec.ignore || null, crashAt: spec.crashAt ?? null, crashSide: spec.crashSide || 'right', free: !!spec.free };
    const ctl = makeController(car, path);
    // startOff: begin out in the left lane (the race grid), merging right once it is clear.
    if (spec.startOff) { path.off = path.offT = spec.startOff; }
    car.ai = ctl;
    const ms = g.missions;
    ap.active = { ctl, car, t0: ap.t, tEnd: null, stage0: ms.stageI, until: spec.until || 'stage', fail: null, len: pts.reduce((s, q, i) => s + (i ? hyp(q, pts[i - 1]) : 0), 0) };
    return { nodes: ns.map((n) => [L.nodeI(n), L.nodeJ(n)]), pts: pts.length, len: Math.round(ap.active.len), exit: pts.exit };
  };
  // Reverse back out to q (out of a plaza the way we drove in): the rear points at q; a reversing
  // car's yaw rate flips sign, so the steering does too.
  // With wantYaw, the last stretch (on the road) is a reversing turn that leaves the nose pointing
  // along the road the way the next leg goes, as a driver does it.
  ap.backTo = (list, wantYaw = null) => {
    const car = g.playerCar;
    ap.backDone = false;
    const t0 = ap.t;
    let i = 0, turnT = null, bd = Infinity;
    for (let k = 0; k < list.length; k++) { const d = Math.hypot(list[k].x - car.x, list[k].z - car.z); if (d < bd) { bd = d; i = k; } }
    const stop = () => { const c = car.ctrl; c.brake = 0; c.throttle = 0; c.park = true; car.ai = null; ap.backDone = +(ap.t - t0).toFixed(1); ap.backInfo = { i, n: list.length, turnT, x: +car.x.toFixed(1), z: +car.z.toFixed(1), yaw: +car.yaw.toFixed(2), want: wantYaw, list: list.map((p) => [+p.x.toFixed(1), +p.z.toFixed(1)]) }; };
    car.ai = { update(dt) {
      const c = car.ctrl;
      c.park = false; c.handbrake = false; c.throttle = 0;
      if (ap.t - t0 > 9) return stop();
      // Skip points within 2.5 m, or not behind the car (a reversing car cannot reach a point
      // inside its turning circle; aiming at one makes it circle).
      const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
      while (i < list.length - 1 && (Math.hypot(list[i].x - car.x, list[i].z - car.z) < 2.5 || (list[i].x - car.x) * fx + (list[i].z - car.z) * fz > -1)) i++;
      const q = list[i], dx = q.x - car.x, dz = q.z - car.z;
      if (wantYaw != null && (turnT != null || i === list.length - 1)) {
        // Reversing, a positive steer raises yaw (the yaw rate flips with the direction of travel).
        turnT = (turnT ?? 0) + dt;
        const e = wrap(wantYaw - car.yaw);
        if (Math.abs(e) < 0.25 || turnT > 4) return stop();
        c.steer = clamp(e * 3, -1, 1);
        c.brake = car.forwardSpeed < -5 ? 0 : 1;
        return;
      }
      if (i === list.length - 1 && Math.hypot(dx, dz) < 1.5) return stop();
      const e = wrap(yawTo(-dx, -dz) - car.yaw);
      c.steer = clamp(e * 2.2, -1, 1);
      c.brake = car.forwardSpeed < -9 ? 0 : 1;
    } };
    return true;
  };
  // Completion of the active drive/chase/tail. A stage change counts before anything else: the
  // next stage's staging (a scene `place`, a mission end) may take the player out of the car in
  // the same missions.update that completed the goto, and that must not read as "car lost".
  // ap.t has already been advanced for the current frame by our onFrame hook (which runs before
  // missions.update), so stamping tEnd = ap.t here is the completion time, whether this runs from
  // the next frame's hook or from a poll between frames.
  ap.check = () => {
    const a = ap.active;
    if (!a) return true;
    if (a.tEnd == null) {
      const ms = g.missions;
      let done = false;
      if (a.until === 'escape') done = !!a.result;
      else if (ms.state === 'failed') { a.fail = 'failed'; done = true; }
      else if (a.until === 'stage') done = ms.stageI !== a.stage0 || ms.state !== 'running';
      else if (a.until.npc) done = ms.stageI !== a.stage0 || ms.state !== 'running' || !ms.stage?.list?.find((e) => e.key === a.until.npc)?.alive;
      if (done) a.tEnd = ap.t;
    }
    return a.tEnd != null;
  };
  ap.result = () => {
    const a = ap.active;
    if (!a) return null;
    ap.check();
    const st = a.ctl.st, f = (v) => +(v ?? 0).toFixed(1);
    const band = a.stats ? { dMin: f(a.stats.dMin), dMax: f(a.stats.dMax) } : undefined;
    return { t: a.tEnd != null ? a.tEnd - a.t0 : null, fail: a.fail, len: Math.round(a.len), driven: Math.round(st.dist), unsticks: st.unsticks || 0, impacts: st.impacts, hits: st.hits, crashV: st.crashV, blocked: f(st.blockedT), blockedBy: st.blockedBy ? Object.fromEntries(Object.entries(st.blockedBy).map(([k, v]) => [k, f(v)])) : undefined, maxLat: f(st.maxLat), maxBrake: f(st.maxBrake), x: f(a.car.x), z: f(a.car.z), yaw: +a.car.yaw.toFixed(2), band, escape: a.result || undefined };
  };
  ap.stop = () => { const a = ap.active; if (a && a.car.ai === a.ctl) { a.car.ai = null; a.car.ctrl.throttle = 0; a.car.ctrl.brake = 1; } ap.active = null; };

  // Chase (destroy): road route towards the quarry, direct pursuit with lead inside 35 m.
  // The unstick state lives in the chase's own `st`, not in the route controller it re-builds every
  // 1.2 s: that reset the stuck timer and cut every reverse short, so a truck nosed into a kerbside
  // tree or the bins pushed and backed off in place until the 150 s ran out (the Phase 2 "wedges").
  // After backing out it follows the road for 2.5 s before it rams across a corner again.
  ap.chase = (getTarget) => {
    const car = g.playerCar;
    const lim = limits(car, 'normal');
    const st = { impacts: 0, hits: [], rams: 0, dist: 0, px: car.x, pz: car.z, roadT: 0 };
    let path = null, ctl = null, replan = 0;
    const self = {
      st,
      update(dt, game) {
        const c = car.ctrl;
        c.park = false; c.handbrake = false;
        const t = getTarget();
        if (!t || game.freezeCar || game.inDialog || game.missions.state !== 'running') { c.throttle = 0; c.brake = 0; c.park = true; return; }
        st.dist += Math.hypot(car.x - st.px, car.z - st.pz); st.px = car.x; st.pz = car.z;
        st.roadT = (st.revT || 0) > 0 ? 2.5 : Math.max(0, st.roadT - dt);
        const d = Math.hypot(t.x - car.x, t.z - car.z);
        if (d < 35 && !st.roadT && C.segmentBlocked(car.x, car.z, t.x, t.z, car.y + 0.6) < 0) {
          // Ram: aim at the quarry with a short lead; when glued to its bumper (closing < 5 m/s),
          // drop back ~10 m and come again, so each hit lands at a real closing speed.
          const tv = t.vx * Math.sin(car.yaw) + t.vz * Math.cos(car.yaw), closing = car.forwardSpeed - tv;
          const lead = clamp(d / Math.max(6, closing), 0, 0.5);
          const ax = t.x + t.vx * lead, az = t.z + t.vz * lead;
          const e = wrap(yawTo(ax - car.x, az - car.z) - car.yaw);
          c.steer = clamp(-e * 2.2, -1, 1);
          if (d < 7.5 && closing < 5) st.backT = 0.7;
          st.backT = Math.max(0, (st.backT || 0) - dt);
          const back = st.backT > 0;
          c.throttle = back || (Math.abs(e) > 1.3 && car.forwardSpeed > 10) ? 0 : 1;
          c.brake = !back && Math.abs(e) > 1.3 && car.forwardSpeed > 10 ? 0.5 : 0;
          path = null;
          unstick(car, st, dt);
          return;
        }
        replan -= dt;
        if (!path || replan <= 0) {
          replan = 1.2;
          const ns = plan(car, [edgeAt(t.x, t.z)]);
          path = { pts: buildPath(car, ns, { x: t.x, z: t.z }), mode: 'normal', vEnd: lim.top };
          ctl = makeController(car, path, st);
        }
        ctl.update(dt, game);
      },
    };
    car.ai = self;
    ap.active = { ctl: self, car, t0: ap.t, tEnd: null, stage0: g.missions.stageI, until: 'stage', fail: null, len: 0 };
    return true;
  };

  // Tail (follow): the quarry's own route, keeping a gap.
  ap.tail = (gap) => {
    const car = g.playerCar, st0 = g.missions.stage, q = st0.car;
    const p = q.ai.path;
    const end = p.endPoint ? { x: p.endPoint[0], z: p.endPoint[1] } : null;
    const path = { pts: buildPath(car, p.nodes.slice(), end), mode: 'normal', vEnd: 0 };
    const ctl = makeController(car, path);
    const stats = { dMin: Infinity, dMax: 0 };
    const self = {
      st: ctl.st,
      update(dt, game) {
        const d = Math.hypot(q.x - car.x, q.z - car.z);
        if (st0.started) { stats.dMin = Math.min(stats.dMin, d); stats.dMax = Math.max(stats.dMax, d); }
        path.done = () => false;
        ctl.update(dt, game);
        const qv = Math.max(0, q.vx * Math.sin(q.yaw) + q.vz * Math.cos(q.yaw));
        const want = clamp(qv + 0.7 * (d - gap), 0, 40);
        if (car.forwardSpeed < 0.6 && want < 0.5) { car.ctrl.throttle = 0; car.ctrl.brake = 0; car.ctrl.park = true; }
        else if (car.forwardSpeed > want + 0.5) { car.ctrl.throttle = 0; car.ctrl.brake = clamp((car.forwardSpeed - want) * 0.3, 0.1, 1); }
        else if (car.ctrl.throttle > 0 && car.forwardSpeed > want - 0.4) car.ctrl.throttle = 0.3;
      },
    };
    car.ai = self;
    ap.active = { ctl: self, car, t0: ap.t, tEnd: null, stage0: g.missions.stageI, until: 'stage', fail: null, len: 0, stats };
    return true;
  };
  ap.tailStats = () => { const s = ap.active?.stats; return s ? { dMin: +s.dMin.toFixed(1), dMax: +s.dMax.toFixed(1) } : null; };

  // Escape (SKANDAL pursuit, free roam): drive at full speed to an intersection far from both
  // Guardia cars, re-planning on arrival and every 6 s; never towards a pursuer. Done when the
  // pursuit ends (escaped) or the player is busted.
  ap.escape = (crashAt = null) => {
    const car = g.playerCar, sh = g.shame;
    const st0 = { impacts: 0, hits: [], dist: 0, px: car.x, pz: car.z, crashed: false };
    let ctl = null, replan = 0;
    const a = { ctl: { st: st0 }, car, t0: ap.t, tEnd: null, stage0: null, until: 'escape', fail: null, len: 0, result: null };
    const bust = sh.busted.bind(sh);
    sh.busted = () => { if (!a.result) a.result = { busted: true, t: +(ap.t - a.t0).toFixed(1) }; bust(); };
    let minD = Infinity;
    const self = {
      st: st0,
      update(dt, game) {
        if (a.result) { car.ctrl.throttle = 0; car.ctrl.brake = 1; return; }
        if (!sh.pursuit && a.started) { a.result = { escaped: true, t: +(ap.t - a.t0).toFixed(1), minD: +minD.toFixed(1), spawn: a.spawn }; return; }
        if (sh.pursuit && !a.started) {
          a.started = true; a.t0 = ap.t; replan = 0;
          // Where the Land Rovers came in (distance from the car, m): an empty list is a pursuit
          // without pursuers, which decays to an "escape" in 6.7 s.
          a.spawn = sh.pursuers.map((h) => +Math.hypot(h.x - car.x, h.z - car.z).toFixed(0));
          a.at = [+car.x.toFixed(0), +car.z.toFixed(0), +Math.hypot(car.vx, car.vz).toFixed(1)];
        }
        const hs = sh.pursuers.filter((h) => !h.dead);
        for (const h of hs) minD = Math.min(minD, Math.hypot(h.x - car.x, h.z - car.z));
        replan -= dt;
        const p = ctl?.path;
        if (!ctl || replan <= 0 || p.idx >= p.pts.length - 4) {
          replan = 6;
          const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
          let best = null, bs = -Infinity;
          for (let id = 0; id < (L.N + 1) * (L.N + 1); id++) {
            const x = nx(id), z = nz(id), d = Math.hypot(x - car.x, z - car.z);
            if (d < 120 || d > 360) continue;
            const ahead = ((x - car.x) * fx + (z - car.z) * fz) / d;
            let hmin = Infinity;
            for (const h of hs) hmin = Math.min(hmin, Math.hypot(x - h.x, z - h.z) - Math.hypot(x - car.x, z - car.z));
            const sc = hmin + ahead * 60 + Math.random() * 10;
            if (sc > bs) { bs = sc; best = id; }
          }
          const nb = L.neighbors(best)[0];
          const ns = plan(car, [[best, nb]]);
          const path = { pts: buildPath(car, ns, null), mode: 'normal', vEnd: 20, free: true, crashAt };
          const hold = ctl?.st.crashHold || 0;
          ctl = makeController(car, path);
          ctl.st.dist = st0.dist; ctl.st.impacts = st0.impacts; ctl.st.hits = st0.hits; ctl.st.crashed = st0.crashed; ctl.st.crashHold = hold;
        }
        ctl.update(dt, game);
        st0.dist = ctl.st.dist; st0.impacts = ctl.st.impacts; st0.hits = ctl.st.hits; st0.crashed = ctl.st.crashed;
      },
    };
    car.ai = self;
    ap.active = a;
    a.ctl = self;
    return true;
  };

  // On foot: hold W + Shift through the input module and steer the camera yaw along a grid A*
  // path through the real collision (0.5 m cells, body radius 0.4, the character's 0.45 m step,
  // every solid including props); `kick` taps the kick (attack) when a target is in reach in front.
  const om = input.moveY.bind(input), ox = input.moveX.bind(input), od = input.down.bind(input), opr = input.pressed.bind(input);
  input.moveY = () => (ap.foot && !ap.foot.hold ? 1 : om());
  input.moveX = () => (ap.foot ? 0 : ox());
  input.down = (a) => (ap.foot && a === 'sprint') || od(a);
  input.pressed = (a) => (ap.kickNow && a === 'attack') || (ap.jumpNow && a === 'jump') || opr(a);
  const qb = [], hit = {};
  // `jump` (m): ledges up to this high are taken with a jump (island: the player jumps ~1.6 m;
  // sheep hop onto walls the 0.45 m step does not reach); such cells carry `jump: true`.
  // `pad` (m): how far beyond the start/target box the search may go; the result carries
  // `reached` (false: the path ends at the cell nearest the target).
  // `avoid`: points the walker stalled at (a gap the grid sees but the body does not pass): cells
  // within 0.6 m are closed. `cars`: car OBBs to walk round (the walker's stopped cars).
  function footPath(sx, sz, sy, tx, tz, rad = 0.4, step = 0.45, jump = 0, pad = 14, avoid = null, cars = null) {
    const S = 0.5;
    const x0 = Math.min(sx, tx) - pad, z0 = Math.min(sz, tz) - pad;
    const W = Math.ceil((Math.max(sx, tx) + pad - x0) / S), H = Math.ceil((Math.max(sz, tz) + pad - z0) / S);
    if (W * H > 90000) return null;
    const hgt = new Float32Array(W * H).fill(NaN), cost = new Float32Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1);
    const cx = (i) => x0 + (i + 0.5) * S, cz = (j) => z0 + (j + 0.5) * S;
    // Can a body standing at height h move into cell (i, j)? Returns the new height or NaN.
    const enter = (i, j, h, st = step) => {
      const x = cx(i), z = cz(j);
      if (avoid) for (const a of avoid) if ((x - a.x) ** 2 + (z - a.z) ** 2 < 0.36) return NaN;
      if (cars) for (const o of cars) if (C.circleVsObb(x, z, rad, o, hit)) return NaN;
      queryBlocks(x - rad - 0.05, z - rad - 0.05, x + rad + 0.05, z + rad + 0.05, qb);
      for (const b of qb) { const top = b.shape === C.RAMP ? C.topAt(b, x, z) : b.top; if (top > h + st && C.circleVsBlock(x, z, rad, b, hit)) return NaN; }
      return C.groundAt(x, z, h, st);
    };
    const jmp = new Uint8Array(W * H);
    const si = clamp(Math.floor((sx - x0) / S), 0, W - 1), sj = clamp(Math.floor((sz - z0) / S), 0, H - 1);
    const ti = clamp(Math.floor((tx - x0) / S), 0, W - 1), tj = clamp(Math.floor((tz - z0) / S), 0, H - 1);
    const s0 = sj * W + si, t0 = tj * W + ti;
    hgt[s0] = sy; cost[s0] = 0;
    // Binary heap on f = g + h.
    const heap = [], push = (n, f) => { heap.push([f, n]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    push(s0, 0);
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let best = s0, bestH = Infinity, n = 0, reached = false;
    const maxN = pad > 14 ? 160000 : 60000;
    while (heap.length && n++ < maxN) {
      const [, c] = pop();
      const ci = c % W, cj = (c / W) | 0;
      const hh = Math.hypot(ci - ti, cj - tj);
      if (hh < bestH) { bestH = hh; best = c; }
      if (c === t0 || hh < 1.5) { best = c; reached = true; break; }
      for (const [di, dj, w] of D) {
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const nI = nj * W + ni;
        const g2 = cost[c] + w;
        if (g2 >= cost[nI]) continue;
        let h2 = enter(ni, nj, hgt[c]), jumped = 0, g3 = g2;
        if (Number.isNaN(h2) && jump && !(di && dj)) { h2 = enter(ni, nj, hgt[c], jump); jumped = 1; g3 = g2 + 3; if (g3 >= cost[nI]) continue; }
        if (Number.isNaN(h2)) continue;
        if (di && dj && (Number.isNaN(enter(ci + di, cj, hgt[c])) || Number.isNaN(enter(ci, cj + dj, hgt[c])))) continue;
        cost[nI] = g3; hgt[nI] = h2; from[nI] = c; jmp[nI] = jumped;
        push(nI, g2 + Math.hypot(ni - ti, nj - tj));
      }
    }
    const out = [];
    for (let c = best; c >= 0 && c !== s0; c = from[c]) out.push({ x: cx(c % W), z: cz((c / W) | 0), jump: !!jmp[c], h: hgt[c] });
    out.reverse();
    out.push({ x: tx, z: tz });
    out.reached = reached;
    return out;
  }
  const queryBlocks = C.queryBlocks;
  ap.footPath = footPath;
  // The OBBs of the cars standing (under 1.5 m/s) within 30 m of the walker's start-target box: a
  // moving car is not planned round (a human dodges it, or is run over, as in the game).
  const stoppedCars = (p, t) => {
    const x0 = Math.min(p.x, t.x) - 30, x1 = Math.max(p.x, t.x) + 30, z0 = Math.min(p.z, t.z) - 30, z1 = Math.max(p.z, t.z) + 30;
    return g.cars.filter((c) => c.obb && c !== g.playerCar && c.root?.visible !== false && Math.hypot(c.vx, c.vz) < 1.5 && c.x > x0 && c.x < x1 && c.z > z0 && c.z < z1).map((c) => c.obb);
  };
  ap.walk = (spec) => {
    // spec.kind: 'list' (nearest alive entry of stage.list) | 'point' {x, z, r}; spec.kick
    ap.foot = { spec, t0: ap.t, tEnd: null, stage0: g.missions.stageI, path: 0, px: g.player.x, pz: g.player.z, kicks: 0, route: null, replanT: 0, plans: 0, falls: 0, wasUp: true };
    ap.active = null;
    return true;
  };
  // `falls`: times the walker was knocked over (flung) on the way, by a car or anything else.
  ap.walkResult = () => { const f = ap.foot || ap.lastFoot; return f ? { t: f.tEnd != null ? f.tEnd - f.t0 : null, walked: Math.round(f.path), kicks: f.kicks, plans: f.plans, falls: f.falls, stuck: f.stuck } : null; };

  // The clock and the completion checks run on the game's own frame dt (the stage timers' clock).
  g.onFrame((dt) => {
    ap.t += dt;
    ap.kickNow = false; ap.jumpNow = false;
    const ms = g.missions;
    ap.check();
    const f = ap.foot;
    if (f) {
      const p = g.player;
      f.path += Math.hypot(p.x - f.px, p.z - f.pz); f.px = p.x; f.pz = p.z;
      const up = p.state !== 'flung' && p.state !== 'down';
      if (!up && f.wasUp) f.falls++;
      f.wasUp = up;
      let t = null;
      if (f.spec.kind === 'list') {
        // Nearest by the straight line, as a player picks the next one on screen.
        let bd = Infinity;
        for (const e of ms.stage?.list || []) if (e.alive) { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; t = e; } }
      } else if (f.spec.kind === 'point') t = Math.hypot(f.spec.x - p.x, f.spec.z - p.z) > (f.spec.r ?? 1) ? f.spec : null;
      const over = f.spec.kind === 'list' ? (ms.stageI !== f.stage0 || ms.state !== 'running' || !t) : !t;
      if (over) { f.tEnd = ap.t; ap.lastFoot = f; ap.foot = null; return; }
      const dt0 = Math.hypot(t.x - p.x, t.z - p.z);
      // Stuck: 12 s without getting 1 m closer to anything. Give up and report where.
      if (dt0 < (f.bestD ?? Infinity) - 1 || f.tgt !== t) { f.bestD = dt0; f.bestT = ap.t; }
      if (ap.t - (f.bestT ?? ap.t) > 12) { f.stuck = { p: [+p.x.toFixed(1), +p.y.toFixed(2), +p.z.toFixed(1)], t: [+t.x.toFixed(1), +(t.y ?? 0).toFixed(2), +t.z.toFixed(1)], route: f.route?.pts.length }; f.tEnd = null; ap.lastFoot = f; ap.foot = null; return; }
      // Kick when the target is within the kick's reach (0.9 m ahead, r 1.0) and in front.
      f.hold = false;
      if (f.spec.kick && dt0 < 1.7) {
        const fwd = ((t.x - p.x) * Math.sin(p.yaw) + (t.z - p.z) * Math.cos(p.yaw)) / (dt0 || 1);
        f.hold = dt0 < 1.2;
        if (fwd > 0.6 && g.kickT <= 0) { ap.kickNow = true; f.kicks++; }
      }
      // Re-plan when the target changed or moved, every 0.6 s while it flees, or when stuck.
      f.replanT -= dt;
      const moved = !f.route || f.tgt !== t || Math.hypot(f.route.end.x - t.x, f.route.end.z - t.z) > 1.5;
      if (moved && f.replanT <= 0 || !f.route) {
        if (f.tgt !== t) f.noJump = false;
        f.replanT = 0.6; f.tgt = t; f.plans++;
        // After a stall, plan without jumps until the target changes (Hotel Flamenco's 1.23 m patio
        // dividers are in jump range on paper, but the jump among the patio chairs can fail; a human
        // then walks round). Toggling back and forth instead made the walker oscillate.
        const J = g.levelDef.verbs.jump && !f.noJump ? 1.3 : 0;
        // Stopped cars are walked round, as a player does: the grid holds only static solids, so the
        // walker ran into a parked car between it and a ball (the SunTrip car park) and stalled there.
        f.cars = stoppedCars(p, t);
        let pts = footPath(p.x, p.z, p.y, t.x, t.z, 0.4, 0.45, J, 14, f.avoid, f.cars);
        // The way round may leave the 14 m margin (e.g. round Hotel Flamenco's 52 m slab): widen it.
        if (pts && !pts.reached) pts = footPath(p.x, p.z, p.y, t.x, t.z, 0.4, 0.45, J, 45, f.avoid, f.cars) || pts;
        pts = pts || [{ x: t.x, z: t.z }];
        f.route = { pts, k: 0, end: { x: t.x, z: t.z } };
      }
      const R = f.route;
      // Follow the route: aim at the furthest of the next few cells that the body (±0.3 m) can
      // reach in a straight line, every solid counted (props too).
      const y = p.y + 0.46;
      // Can the body walk straight to q? Sweep a 0.38 m circle (the player is 0.36) along the line
      // every 0.1 m against every solid taller than a step. (collision.segmentBlocked samples a
      // bare line every 0.8 m: it stepped through Hotel Flamenco's 0.22 m patio dividers, and three
      // parallel lines 0.3 m apart missed a 0.12 m pole beside the pool bar, wedging the walker.)
      const clear = (q) => {
        const ax = p.x, az = p.z, bx = q.x, bz = q.z;
        queryBlocks(Math.min(ax, bx) - 0.4, Math.min(az, bz) - 0.4, Math.max(ax, bx) + 0.4, Math.max(az, bz) + 0.4, qb);
        const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1));
        for (const b of qb) {
          if (b.top < y) continue;
          for (let k = 1; k <= n; k++) if (C.circleVsBlock(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, 0.38, b, hit)) return false;
        }
        for (const o of f.cars || []) for (let k = 1; k <= n; k++) if (C.circleVsObb(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, 0.38, o, hit)) return false;
        return true;
      };
      // Never skip a jump cell (a ledge or the top of a thin wall) before standing on it: from
      // 0.5 m away the walker used to drop it and walk into the wall for good.
      while (R.k < R.pts.length - 1 && Math.hypot(R.pts[R.k].x - p.x, R.pts[R.k].z - p.z) < 0.7 && !(R.pts[R.k].jump && p.y < R.pts[R.k].h - 0.3)) R.k++;
      let aim = R.pts[R.k];
      // A ledge ahead on the route: jump when it is 1.2 m away (aim straight at it, no shortcut).
      let ledge = null;
      for (let j = R.k; j < Math.min(R.pts.length, R.k + 4); j++) if (R.pts[j].jump) { ledge = R.pts[j]; break; }
      if (ledge) { aim = ledge; if (Math.hypot(ledge.x - p.x, ledge.z - p.z) < 1.2 && p.onGround) ap.jumpNow = true; }
      else for (let j = Math.min(R.pts.length - 1, R.k + 10); j > R.k; j--) if (clear(R.pts[j])) { aim = R.pts[j]; break; }
      // The target itself up on a ledge within reach: jump at it.
      if (t.y != null && t.y > p.y + 0.4 && dt0 < 2.5 && p.onGround) ap.jumpNow = true;
      if (dt0 < 3 && clear(t)) aim = t;
      // No progress for 2 s: plan again from here.
      if (ap.t - (f.bestT ?? ap.t) > 2 && f.replanT <= -1.4) { f.noJump = true;
        // Remember the route cell it could not get to, so the next plan goes another way.
        const R0 = f.route, q = R0 && R0.k < R0.pts.length - 1 ? R0.pts[R0.k] : null;
        if (q) (f.avoid ||= []).push({ x: q.x, z: q.z });
        f.route = null; f.replanT = 0; }
      f.yaw = yawTo(aim.x - p.x, aim.z - p.z);
      g.cam.yaw = f.yaw;
    }
  });
  ap.edgeAt = edgeAt;
  return true;
}

// ---------------------------------------------------------------------------------------------
// Node side.

const rows = [];
function row(id, what, route, tRef, timer, note = '') {
  rows.push({ id, what, route, tRef, timer, note });
  console.log(`[t] CAL ${id} | ${what} | ${route} | T_ref ${tRef} | timer ${timer} | ${note}`);
}

async function boot(T, mission) {
  await T.fresh(`&mission=${mission}&ts=1`);
  await T.ev(installAutopilot);
  check(await T.ev(() => __game.timeScale === 1), 'calibrate needs timeScale 1');
}
// Start the mission (intro at test speed), then jump straight to stage k with the player set up.
async function jumpTo(T, k, setup) {
  await T.startMission();
  await T.ev((k) => { const ms = __game.missions; ms.stageI = k; ms.startStage(); }, k);
  if (setup) await T.ev(setup.fn, setup.arg);
  await T.frames(3);
}
// Put the player in a car of `type` at {x, z, yaw} (a fresh car that survives mission cleanup),
// optionally with a passenger.
function carSetup() {
  return (a) => {
    const g = __game;
    if (g.playerCar) g.exitCar(true);
    let car = a.named ? g.ensureNamedCar(a.named) : null;
    if (!car) { car = g.spawnMissionCar(g.missions.m || { cars: [] }, a.type || 'sedan', a.x, a.z, a.yaw); g.missions.m?.cars.pop(); }
    car.locked = false;
    car.place(a.x, a.z, a.yaw);
    g.enterCar(car);
    if (a.passenger) { const n = g.npc(a.passenger); g.unseatAny(n); n.state = 'normal'; g.seat(n, car, -1); n.busy = true; }
    g.cam.snapNext = true;
    return true;
  };
}
async function waitDone(T, timeout = 240000) {
  // Short waits in a loop (long page waits hit the protocol timeout); give up if the car is lost.
  const t0 = Date.now();
  for (;;) {
    const done = await T.until(() => window.__ap.check() || !__game.playerCar || __game.playerCar.dead, 20000).then(() => true, () => false);
    if (done || Date.now() - t0 > timeout) break;
  }
  // result() runs the completion check first, so a stage that completed counts as done even
  // when the car is gone by now.
  const r = await T.ev(() => window.__ap.result());
  const lost = await T.ev(() => !__game.playerCar || __game.playerCar.dead);
  if (r && lost && r.t == null) r.fail = 'car lost';
  if (r && r.t == null && !r.fail) r.fail = 'timeout';
  await T.ev(() => window.__ap.stop());
  return r;
}
async function drive(T, spec, timeout) {
  const plan = await T.ev((s) => window.__ap.drive(s), spec);
  const r = await waitDone(T, timeout);
  return { ...r, plan };
}
const fmtNodes = (p) => (p?.nodes ? p.nodes.map((n) => n.join(',')).join('>') : '');
const stageTimer = (T) => T.ev(() => __game.missions.stage?.t ?? null);
const raiseTimer = (T) => T.ev(() => { const st = __game.missions.stage; if (st && st.t != null) st.t = 600; });

// Plain drive cases: the stage, where the car starts (a landmark or {x, z}, yaw, passenger), the drive.
// asnan: the car stands in the Centro Nórdico lot in front of the supermercado facing the street
// (z -40); a human drives straight out onto the near (westbound) lane, then on to the Viking Bar.
const DRIVES = [
  { id: 'buss17', mission: 5, stage: 1, what: 'buss17 s2 busBay -> flamencoDrive (ÅKSJUKA, stop)', key: 'buss17Drive', smooth: true,
    car: { named: 'buss17', lm: 'busBay', passenger: 'ole' }, spec: { end: 'flamencoDrive', endEdges: [[[3, 3], [3, 4]]], mode: 'smooth', vEnd: 0 } },
  { id: 'asnan', mission: 7, stage: 8, what: 'asnan s9 supermercado lot -> vikingbar (SKICK)', key: 'asnanPaint',
    car: { type: 'sedan', lm: 'supermercado', yaw: 0, passenger: 'ole' }, spec: { end: 'vikingbar', nodes: [[5, 3], [4, 3], [3, 3], [2, 3], [1, 3]], pre: [{ x: 62, z: -50 }, { x: 58, z: -43.5 }], mode: 'fragile', vEnd: 8 } },
  { id: 'vischan', mission: 8, stage: 3, what: 'bodega s4 playa -> vischan', key: 'bodegaVischan',
    car: { type: 'sedan', at: { x: 0, z: 236 }, yaw: 0, passenger: 'berra' }, spec: { end: 'vischan', endEdges: [[[0, 2], [1, 2]]], vEnd: 12 } },
];

// The haggle (asnan s4): a model player watches the marker and presses E aiming at the middle of
// the green zone, with a Gaussian timing error σ; frames at 60 Hz. Same marker law as the kind:
// mk = 0.5 − 0.5·cos(2π·speed·t). Returns the success rate (≤ maxMiss − 1 misses over all rounds)
// and the mean misses.
function haggleModel(zones, speeds, sigma, maxMiss = 3, n = 20000) {
  let wins = 0, misses = 0;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  for (let k = 0; k < n; k++) {
    let miss = 0, round = 0;
    while (round < zones.length && miss < maxMiss) {
      const w = zones[round], f = speeds[round];
      const z0 = Math.random() * (1 - w), z1 = z0 + w;
      // The player aims at the time the marker crosses the zone middle (on the rising or falling
      // half-cycle, whichever is next), i.e. phase φ with mk(φ) = mid.
      const mid = (z0 + z1) / 2, ph = Math.acos(1 - 2 * mid) / (2 * Math.PI * f);
      const tAim = Math.random() < 0.5 ? ph : 1 / f - ph;
      const t = Math.round((tAim + gauss() * sigma) * 60) / 60;
      const mk = 0.5 - 0.5 * Math.cos(2 * Math.PI * f * t);
      if (mk >= z0 && mk <= z1) round++;
      else { miss++; }
    }
    misses += miss;
    if (round >= zones.length) wins++;
  }
  return { win: wins / n, misses: misses / n };
}

export const SCENARIOS = {
  async calibrate(T) {
    const out = {};      // key -> T_ref (s)
    const kind = {};     // key -> 'drive' | 'foot' (the multiplier)
    const sample = {};   // random stages: key -> { ts: the runs (s), extra: s added to the p75 for T_ref }
    const RUNS = +(process.env.RUNS || 3);
    // ---- plain drives (deterministic: median of the clean runs) ---------------------------------
    for (const c of DRIVES) {
      if (!want(c.id)) continue;
      const runs = [];
      for (let k = 0; k < RUNS + 2 && (runs.length < RUNS || runs.filter((r) => r.clean).length < 2); k++) {
        await boot(T, c.mission);
        const pose = await T.ev((c) => { const l = c.at || window.__lm(c.lm); return { x: l.x, z: l.z, yaw: c.yaw ?? l.yaw }; }, c.car);
        await jumpTo(T, c.stage, { fn: carSetup(), arg: { ...c.car, ...pose } });
        const timer0 = await stageTimer(T);
        await raiseTimer(T);
        const r = await drive(T, c.spec);
        r.clean = r.t != null && !r.fail && r.impacts === 0 && (!c.smooth || r.maxLat <= 6);
        r.timer0 = timer0;
        T.log(c.id, 'run', k, r.clean ? 'clean' : 'NOT CLEAN', JSON.stringify(r));
        runs.push(r);
      }
      const clean = runs.filter((r) => r.clean).map((r) => r.t);
      check(clean.length >= 1, `${c.id}: at least one clean autopilot run`);
      const tRef = median(clean);
      out[c.key] = tRef; kind[c.key] = 'drive';
      row(c.id, c.what, fmtNodes(runs[0].plan), tRef.toFixed(1), roundTimer(tRef * 1.2), `median of ${clean.length} clean runs (${runs.map((r) => `${f1(r.t)}${r.clean ? '' : '*'}`).join(' / ')} s; * = impact or over the ÅKSJUKA limit); maxLat ${runs.map((r) => r.maxLat).join('/')}; shipped ${runs[0].timer0}`);
    }

    // ---- bodega: wreck the Guardia jeep (destroy), then drive the pigs home --------------------
    if (want('jeep')) {
      // 12 by default: the p75 of the 4 usable chases out of 6 swung 33–50 s from run to run (one
      // 124 s chase is enough), Phase 2 gate. DESIGN's timer comes from JEEP_RUNS=20.
      const runs = +(process.env.JEEP_RUNS || 12);
      const jeep = [];
      for (let k = 0; k < runs; k++) {
        await boot(T, 8);
        if (process.env.JEEP) await T.ev(async (s) => { const [c, d] = s.split(':').map(Number); const t = (await import('/src/game/missions/island.js')).TUNING.jeep; t.cruise = c; if (d) t.damageScale = d; }, process.env.JEEP);
        // The truck stopped at the farm gate heading east; Berra rides along (Robban in the bed).
        await jumpTo(T, 8, { fn: carSetup(), arg: { type: 'grisbil', x: -84, z: -199, yaw: Math.PI / 2, passenger: 'berra' } });
        await raiseTimer(T);
        const cruise = await T.ev(() => `${__game.missions.stage.o.cruise}/x${__game.missions.stage.o.damageScale}`);
        await T.ev(() => window.__ap.chase(() => { const c = __game.missions.stage?.car; return c && !c.dead ? c : null; }));
        const r = await waitDone(T, 150000);
        const wreck = await T.ev(() => { const c = __game.playerCar; return c ? { x: +c.x.toFixed(0), z: +c.z.toFixed(0), hp: Math.round(c.hp) } : null; });
        if (!wreck) { T.log('jeep run', k, 'the truck was lost', JSON.stringify(r)); jeep.push({ t: null, wreck: null, cruise, wedged: true }); continue; }
        T.log('jeep run', k, 'cruise', cruise, JSON.stringify(r), 'wreck at', JSON.stringify(wreck));
        // A run averaging under 6 m/s means the autopilot wedged itself on a house while the jeep
        // drove round the block (an autopilot artefact, not the chase): reported, not used.
        const wedged = r.t == null || r.driven / r.t < 6;
        if (wedged) await T.shot(`jeep_wedged_${k}`);
        jeep.push({ t: r.t, wreck, cruise, wedged });
      }
      const ok = jeep.filter((j) => !j.wedged).map((j) => j.t);
      check(ok.length >= 2, 'jeep: at least two chases that did not wedge');
      const tRef = pct(ok, 0.75);
      out.bodegaJeep = tRef; kind.bodegaJeep = 'drive'; sample.bodegaJeep = { ts: ok, extra: 0 };
      out.__jeepWrecks = jeep.filter((j) => !j.wedged).map((j) => j.wreck);
      row('jeep', `bodega s9 wreck the Guardia jeep (cruise/damageScale ${jeep[0].cruise}, ${runs} runs)`, 'gate (-84,-199) in the grisbil, road-route chase', tRef.toFixed(1), roundTimer(tRef * 1.2), `p75 of ${ok.length} chases (the flee route is random): ${jeep.map((j) => `${f1(j.t)}${j.wedged ? ' (wedged, excluded)' : ''}`).join(' / ')} s; median ${f1(median(ok))}`);
    }
    // Stage 10 starts wherever the jeep died, so its timer follows the distance (missions/island.js
    // homeTimer): T_ref(d) = HOME_C + d / HOME_V with d the Manhattan distance to flamencoBack.
    // Measured from a clean start on the road at spots spread over the map.
    if (want('home')) {
      const spots = [{ x: -187, z: 37 }, { x: 120, z: -150 }, { x: -200, z: 160 }, { x: 270, z: 277 }, { x: -270, z: -260 }, { x: 40, z: 120 }];
      const home = [];
      // HOME_RUNS drives from each spot (traffic differs run to run; one drive per spot let a
      // single held-up run move the fit by 15 %, Phase 2 gate).
      const homeRuns = +(process.env.HOME_RUNS || 2);
      for (const w of spots) for (let k = 0; k < homeRuns; k++) {
        await boot(T, 8);
        const pose = await T.ev((w) => {
          // Snap onto the right-hand lane of the nearest road, heading towards the hotel.
          const L = { P: 80, HALF: 280, LANE: 2.75 };
          const fi = (w.x + L.HALF) / L.P, fj = (w.z + L.HALF) / L.P;
          const di = Math.abs(fi - Math.round(fi)) * L.P, dj = Math.abs(fj - Math.round(fj)) * L.P;
          if (di <= dj) { const x = Math.round(fi) * L.P - L.HALF, south = w.z < -37; return { x: x + (south ? -L.LANE : L.LANE), z: w.z, yaw: south ? 0 : Math.PI }; }
          const z = Math.round(fj) * L.P - L.HALF, east = w.x < -6;
          return { x: w.x, z: z + (east ? L.LANE : -L.LANE), yaw: east ? Math.PI / 2 : -Math.PI / 2 };
        }, w);
        await T.startMission();
        // The stage's timer reads the wreck spot (missions/island.js homeTimer).
        await T.ev((w) => { const ms = __game.missions; ms.m.data.wreck = { x: w.x, z: w.z }; ms.stageI = 9; ms.startStage(); }, w);
        await T.ev(carSetup(), { type: 'grisbil', ...pose, passenger: 'berra' });
        await T.frames(3);
        const timer0 = await stageTimer(T);
        await raiseTimer(T);
        const h = await drive(T, { end: 'flamencoBack', endEdges: [[[3, 3], [4, 3]]], vEnd: 12 });
        const d = Math.abs(pose.x - -6) + Math.abs(pose.z - -33.5);
        T.log('home from', JSON.stringify(w), 'manhattan', d.toFixed(0), 'shipped timer', f1(timer0), JSON.stringify(h));
        home.push({ t: h.t, d, clean: h.t != null && !h.fail && h.impacts === 0 && h.blocked < 3, from: w, route: fmtNodes(h.plan), timer0 });
      }
      // Clean = no impact and under 3 s held up by traffic (a human would have gone round).
      const ok = home.filter((h) => h.clean);
      check(ok.length >= 3, 'bodega home: at least three clean drives');
      // Least squares t = c + d / v.
      const n = ok.length, sd = ok.reduce((s, h) => s + h.d, 0), st = ok.reduce((s, h) => s + h.t, 0);
      const sdd = ok.reduce((s, h) => s + h.d * h.d, 0), sdt = ok.reduce((s, h) => s + h.d * h.t, 0);
      const b = (n * sdt - sd * st) / (n * sdd - sd * sd), c0 = (st - b * sd) / n;
      out.__home = { c: +c0.toFixed(2), v: +(1 / b).toFixed(1) };
      const worst = ok.reduce((a, h) => (h.d > a.d ? h : a));
      // The shipped distance-scaled timer (HOME in missions/island.js) must cover every clean drive.
      for (const h of ok) check(h.timer0 >= h.t, `bodega home: shipped timer ${f1(h.timer0)} s from d ${h.d.toFixed(0)} is below the drive ${f1(h.t)} s`);
      row('home', 'bodega s10 wreck spot -> flamencoBack (distance-scaled timer)', `fit over ${n} clean drives (+3 s turning round at the wreck: HOME.c)`, `${c0.toFixed(1)} + d/${(1 / b).toFixed(1)}`, `ceil(1.2 × T_ref(d)), e.g. ${roundTimer(1.2 * (c0 + worst.d * b))} s from d ${worst.d.toFixed(0)}`, home.map((h) => `${f1(h.t)} s from (${h.from.x},${h.from.z}) d ${h.d.toFixed(0)}${h.clean ? '' : '*'} [shipped ${f1(h.timer0)}]`).join(' / '));
    }

    // ---- grisfest: flowers (on foot), the race, the plates, dance floor -> Tonga Tonga ----------
    const FOOT = +(process.env.FOOT_RUNS || 4);
    if (want('flowers')) {
      const ts = [], stuck = [];
      for (let k = 0; k < FOOT; k++) {
        await boot(T, 11);
        await T.startMission();
        await raiseTimer(T);
        // Stage 1: five static flowers round Hotel Flamenco (random spawns), sprinting nearest-first.
        await T.ev(() => window.__ap.walk({ kind: 'list' }));
        await T.until(() => window.__ap.foot === null, 120000);
        const fl = await T.ev(() => window.__ap.walkResult());
        T.log('flowers run', k, JSON.stringify(fl));
        if (fl.t != null) ts.push(fl.t);
        else { await T.shot(`flowers_stuck_${k}`); stuck.push(fl.stuck); }
      }
      check(!stuck.length, `flowers: every spawn reachable (stuck at ${JSON.stringify(stuck)})`);
      const tRef = pct(ts, 0.75) + 0.5 * 5;
      out.grisfestFlowers = tRef; kind.grisfestFlowers = 'foot'; sample.grisfestFlowers = { ts, extra: 0.5 * 5 };
      row('flowers', 'grisfest s1 five flowers round Flamenco (on foot, random spawns)', 'nearest-first sprint', tRef.toFixed(1), roundTimer(tRef * 1.25), `p75 of ${FOOT} runs + 0.5 s × 5: ${ts.map(f1).join(' / ')} s`);
    }
    if (want('plates')) {
      const ts = [];
      for (let k = 0; k < Math.max(2, FOOT - 2); k++) {
        await boot(T, 11);
        await T.startMission();
        // Stage 4 starts at the race finish by the farm gate; the player steps out of the car.
        await T.ev(() => { const g = __game, ms = g.missions; if (g.playerCar) g.exitCar(true); g.player.teleport(-80, -203, Math.PI); g.cam.snapNext = true; ms.stageI = 3; ms.startStage(); });
        await T.frames(3);
        await raiseTimer(T);
        await T.ev(() => window.__ap.walk({ kind: 'list', kick: true }));
        // smash's stage.list holds props (alive); the walker kicks each in reach.
        await T.until(() => window.__ap.foot === null, 120000).catch(() => {});
        const w = await T.ev(() => window.__ap.walkResult());
        const st = await T.ev(() => ({ si: __game.missions.stageI, state: __game.missions.state }));
        T.log('plates run', k, JSON.stringify(w), JSON.stringify(st));
        check(st.si > 3 || st.state !== 'running', 'plates: the walker smashed ten stacks');
        ts.push(w.t);
      }
      // The stacks spawn at random in the dance-floor area: the 75th percentile like other random stages.
      const tRef = pct(ts, 0.75) + 0.5 * 10;
      out.grisfestPlates = tRef; kind.grisfestPlates = 'foot'; sample.grisfestPlates = { ts, extra: 0.5 * 10 };
      row('plates', 'grisfest s4 smash 10 plate stacks (on foot, kick)', 'race finish (-80,-203) -> nearest stack first', tRef.toFixed(1), roundTimer(tRef * 1.25), `p75 of ${ts.length} runs + 0.5 s × 10: ${ts.map(f1).join(' / ')} s; median ${f1(median(ts))}`);
    }
    // Stage 6: from the dance floor on foot back to the car, then Tonga Tonga. The car stands where
    // the race left it: just past the finish line at the farm gate, heading west.
    if (want('tonga')) {
      const ts = [];
      for (let k = 0; k < Math.max(2, RUNS - 1); k++) {
        await boot(T, 11);
        await T.startMission();
        await T.ev(carSetup(), { type: 'sedan', x: -86, z: -202.75, yaw: -Math.PI / 2 });
        const car = await T.ev(() => {
          const g = __game, ms = g.missions, c = g.playerCar;
          ms.stageI = 5; ms.startStage();
          g.exitCar(true);
          c.place(-86, -202.75, -Math.PI / 2);
          const s = g.approachSpot('dansgolv');
          g.player.teleport(s.x, s.z, s.yaw);
          g.cam.snapNext = true;
          window.__calCar = c;
          return { x: c.x, z: c.z, d: Math.hypot(c.x - s.x, c.z - s.z) };
        });
        await T.frames(3);
        await raiseTimer(T);
        await T.ev((c) => window.__ap.walk({ kind: 'point', x: c.x, z: c.z, r: 3.6 }), car);
        await T.until(() => window.__ap.foot === null, 60000);
        const w = await T.ev(() => window.__ap.walkResult());
        await T.ev(() => __game.enterCar(window.__calCar));
        await T.frames(2);
        const d = await drive(T, { end: 'tongatonga', endEdges: [[[1, 3], [2, 3]], [[2, 2], [2, 3]]], vEnd: 12 });
        T.log('tonga', k, JSON.stringify({ w, d }));
        if (d.t != null && !d.fail && d.impacts === 0) ts.push({ t: w.t + 0.5 + d.t, w, d });
      }
      check(ts.length >= 1, 'tonga: a clean run');
      const tRef = median(ts.map((x) => x.t));
      out.grisfestTonga = tRef; kind.grisfestTonga = 'drive';
      row('tonga', 'grisfest s6 dance floor -> car at the gate -> tongatonga', `walk ${ts[0].w.walked} m + ${fmtNodes(ts[0].d.plan)}`, tRef.toFixed(1), roundTimer(tRef * 1.2), `median of ${ts.length} clean runs: ${ts.map((x) => `walk ${f1(x.w.t)} + 0.5 + drive ${f1(x.d.t)}`).join(' / ')}`);
    }

    // ---- grisfest race: Gabbe's night bus. Clean runs must win by a few seconds, a run with one
    // big crash (at 45 % of the route: a head-on stop and 1 s to recover) must lose. ------------
    if (want('race')) {
      const sweep = process.env.RACE_SWEEP ? process.env.RACE_SWEEP.split(';') : [null];
      const runs = +(process.env.RACE_RUNS || 2);
      for (const set of sweep) {
        const res = { clean: [], crash: [] };
        for (const mode of ['clean', 'crash']) for (let k = 0; k < runs; k++) {
          await boot(T, 11);
          if (set) await T.ev(async (s) => { const [cr, mx, ac, sr] = s.split(':').map(Number); const t = (await import('/src/game/missions/island.js')).TUNING.nattbuss; t.cruise = cr; t.spec = { maxSpeed: mx, accel: ac, steer: sr || t.spec.steer }; }, set);
          await T.startMission();
          // Stage 3: the race, from its own start spot (the kind places the player's car).
          await T.ev(carSetup(), { type: process.env.RACE_CAR || 'sedan', x: 0, z: 0, yaw: 0 });
          // __calOpp also logs every car-car impact that involves the player's car or the bus (who
          // hit what, where, when, how hard), so a run that does not follow its script says why.
          await T.ev(() => {
            const g = __game, ms = g.missions; ms.stageI = 2; ms.startStage();
            const st = ms.stage, o = (window.__calOpp = { car: st.opp, path: st.opp.ai.path, d: 0, t: 0, x: st.opp.x, z: st.opp.z, fin: null, hits: [] });
            g.onFrame((dt) => { if (ms.stage !== st || st.countdown > 0) return; o.t += dt; o.d += Math.hypot(o.car.x - o.x, o.car.z - o.z); o.x = o.car.x; o.z = o.car.z; });
            const kind = (c) => (c === st.opp ? 'bus' : c === g.playerCar ? 'player' : c.traffic ? 'traffic' : c.ai ? 'ai' : 'parked');
            const orig = g.onCarImpact;
            g.onCarImpact = function (a, b, impact, cx, cz) {
              if (ms.stage === st && (a === st.opp || b === st.opp || a === g.playerCar || b === g.playerCar) && impact > 3 && o.hits.length < 12) o.hits.push(`${kind(a)}>${kind(b)} ${impact.toFixed(1)} @(${cx.toFixed(0)},${cz.toFixed(0)}) t${o.t.toFixed(1)}`);
              return orig.call(this, a, b, impact, cx, cz);
            };
          });
          await T.frames(3);
          const rinfo = await T.ev(() => { const st = __game.missions.stage; return { type: __game.playerCar.type, opp: st.opp.spec.maxSpeed, cruise: st.o.cruise }; });
          const rr = await drive(T, { nodes: [[3, 3], [4, 3], [4, 2], [4, 1], [3, 1], [2, 1]], end: { x: -80, z: -200 }, vEnd: 40, startOff: -5.5, crashAt: mode === 'crash' ? 165 : null, crashSide: 'left' });
          // Won = the player crossed the line first: the stage completed (t set, no fail). Not
          // "the mission has not failed": a run whose car was wrecked on the way ends the drive
          // while the bus is still racing, and that counted as a win (Phase 2 gate).
          // If the player won, keep the bus running to the finish to measure the margin.
          let margin;
          const won = rr.t != null && !rr.fail;
          if (won) {
            const race = await T.ev(() => {
              const c = window.__calOpp.car, p = window.__calOpp.path;
              p.ensure(100000);
              let left = Math.hypot(p.pts[p.idx].x - c.x, p.pts[p.idx].z - c.z);
              for (let k = p.idx; k < p.pts.length - 1; k++) left += Math.hypot(p.pts[k + 1].x - p.pts[k].x, p.pts[k + 1].z - p.pts[k].z);
              return { left, avg: window.__calOpp.d / Math.max(1, window.__calOpp.t) };
            });
            margin = race.left / race.avg;
          } else {
            // Lost: how far the player still had to go when the bus crossed the line (or the car
            // was lost).
            const left = Math.hypot(rr.x + 80, rr.z + 200);
            margin = -left / 30;
          }
          const carHits = await T.ev(() => window.__calOpp.hits);
          T.log('race', mode, k, JSON.stringify({ rinfo, rr: { t: rr.t, fail: rr.fail, impacts: rr.impacts, hits: rr.hits, crashV: rr.crashV, blocked: rr.blocked, blockedBy: rr.blockedBy }, carHits, margin: +margin.toFixed(1) }));
          res[mode].push({ won, margin, fail: rr.fail, t: rr.t != null ? rr.t - 3.5 : null, impacts: rr.impacts, rinfo });
        }
        const r0 = res.clean[0]?.rinfo || res.crash[0]?.rinfo;
        row('race', `grisfest s3 night-bus race (bus cruise ${r0.cruise}, maxSpeed ${r0.opp}; player ${r0.type})`, 'start lane 3,3>4,3 t 14 (player beside on the left); cps 4,3>4,2>4,1>3,1; finish (-80,-200)', res.clean.map((r) => f1(r.t)).join(' / '), '—',
          `clean: ${res.clean.map((r) => `${r.won ? 'WON' : 'LOST'} by ≈ ${f1(Math.abs(r.margin))} s${r.impacts ? ` (${r.impacts} impacts)` : ''}`).join(' / ')}; one crash: ${res.crash.map((r) => `${r.won ? 'WON' : 'LOST'} (${r.fail === 'car lost' ? 'car lost' : `${f1(r.margin)} s`})`).join(' / ')}`);
        if (!set) {
          check(res.clean.filter((r) => r.won && r.impacts === 0).length >= Math.ceil(res.clean.length / 2), 'race: a clean run wins');
          check(res.clean.every((r) => !r.won || r.margin < 6), 'race: a clean win is by a few seconds, not a walkover');
          check(res.crash.every((r) => !r.won), 'race: one big crash loses the race');
        }
      }
    }

    // ---- julafton: round up the four guests from the patio (walk to the hire car, then drive) --
    if (want('guests')) {
      const ts = [];
      for (let k = 0; k < Math.max(1, RUNS - 1); k++) {
        await boot(T, 12);
        await T.startMission();
        await raiseTimer(T);
        const setup = await T.ev(() => {
          const g = __game, car = g.ensureNamedCar('hyrbil'), st = g.missions.stage;
          window.__calCar = car;
          return { car: { x: car.x, z: car.z }, p: { x: g.player.x, z: g.player.z }, guests: st.list.map((e) => ({ key: e.key, x: e.x, z: e.z })) };
        });
        const t0 = await T.ev(() => window.__ap.t);
        await T.ev((c) => window.__ap.walk({ kind: 'point', x: c.x, z: c.z, r: 3.6 }), setup.car);
        await T.until(() => window.__ap.foot === null, 60000);
        const w = await T.ev(() => window.__ap.walkResult());
        await T.ev(() => __game.enterCar(window.__calCar));
        await T.frames(2);
        // Best visiting order by Manhattan distance over all 24 permutations.
        const perm = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perm([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
        const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
        let best = null;
        for (const o of perm(setup.guests)) { let s = 0, p = setup.car; for (const q of o) { s += man(p, q); p = q; } if (!best || s < best.s) best = { o, s }; }
        const EDGES = { herrStorch: [[[3, 7], [4, 7]], [[3, 6], [4, 6]]], fruStorch: [[[3, 2], [4, 2]], [[3, 1], [4, 1]]], berra: [[[3, 3], [4, 3]]], majsan: [[[2, 2], [3, 2]], [[2, 1], [3, 1]]] };
        const legs = [];
        let impacts = 0, lastExit = null;
        for (const q of best.o) {
          const pos = await T.ev((k) => { const e = __game.missions.stage.list.find((x) => x.key === k); return { x: e.x, z: e.z }; }, q.key);
          if (lastExit && lastExit.d > 3 && lastExit.pts.length) {
            // The last guest stood off the road: back out the way we came in, across to the far
            // lane, so the car has the road's width to turn in.
            const nextPos = await T.ev((k) => { const e = __game.missions.stage.list.find((x) => x.key === k); return { x: e.x, z: e.z }; }, q.key);
            await T.ev((q, n) => {
              // The road runs across the approach; turn the nose the way the next guest lies.
              const a = q.pts[0], l = Math.hypot(a.x - q.x, a.z - q.z) || 1, ax = (a.x - q.x) / l, az = (a.z - q.z) / l;
              let rx = -az, rz = ax;
              if ((n.x - q.x) * rx + (n.z - q.z) * rz < 0) { rx = -rx; rz = -rz; }
              return window.__ap.backTo([...q.pts.slice(0, -1).reverse(), { x: q.x, z: q.z }], Math.atan2(rx, rz));
            }, lastExit, nextPos);
            await T.until(() => window.__ap.backDone, 15000);
            legs.push(`back ${await T.ev(() => window.__ap.backDone)} s`);
          }
          const r = await drive(T, { end: pos, endEdges: EDGES[q.key], vEnd: 7, until: { npc: q.key } });
          lastExit = r.plan?.exit;
          legs.push(`${q.key} ${f1(r.t)} s`);
          T.log('guests leg', q.key, JSON.stringify({ t: r.t, impacts: r.impacts, hits: r.hits, blocked: r.blocked, nodes: fmtNodes(r.plan), exit: r.plan?.exit && { x: r.plan.exit.x, z: r.plan.exit.z, d: r.plan.exit.d, n: r.plan.exit.pts.length } }));
          impacts += r.impacts || 0;
          if (r.t == null || r.fail) { T.log('guests leg failed', q.key, JSON.stringify(r)); await T.shot(`guests_${q.key}`); }
          check(r.t != null && !r.fail, `guests: reached ${q.key}`);
        }
        await T.until(() => __game.missions.stageI !== 0 || __game.missions.state !== 'running', 30000);
        const t1 = await T.ev(() => window.__ap.t);
        T.log('guests', k, `${(t1 - t0).toFixed(1)} s; walk ${f1(w.t)}; ${legs.join('; ')}; impacts ${impacts}`);
        ts.push({ t: t1 - t0, order: best.o.map((q) => q.key).join(' > '), w, impacts });
      }
      const clean = ts.filter((x) => x.impacts === 0);
      const use = clean.length ? clean : ts;
      const tRef = median(use.map((x) => x.t));
      out.julaftonGuests = tRef; kind.julaftonGuests = 'drive';
      row('guests', 'julafton s1 patio -> hyrbil -> four guests', `walk ${ts[0].w.walked} m, then ${ts[0].order}`, tRef.toFixed(1), roundTimer(tRef * 1.2), `median of ${use.length} ${clean.length ? 'clean ' : ''}runs: ${ts.map((x) => `${f1(x.t)}${x.impacts ? '*' : ''}`).join(' / ')} s`);
    }

    // ---- fleeing rabbits on foot: the friskotek beach balls and the Fataga sheep ----------------
    for (const [id, mission, stage, key, what] of [['balls', 6, 0, 'friskotekBalls', 'friskotek s1 six fleeing beach balls'], ['sheep', 10, 4, 'fatagaSheep', 'fataga s5 six fleeing sheep']]) {
      if (!want(id)) continue;
      const ts = [];
      for (let k = 0; k < FOOT; k++) {
        await boot(T, mission);
        if (stage) await jumpTo(T, stage, { fn: () => { const g = __game; if (g.playerCar) g.exitCar(true); const s = window.__lm('fatagaBus'); g.player.teleport(s.x, s.z - 3, Math.PI); g.cam.snapNext = true; return true; } });
        else await T.startMission();
        await raiseTimer(T);
        await T.ev(() => window.__ap.walk({ kind: 'list' }));
        await T.until(() => window.__ap.foot === null, 200000);
        const w = await T.ev(() => window.__ap.walkResult());
        const left = await T.ev(() => (__game.missions.stage?.list || []).filter((r) => r.alive).length);
        T.log(id, 'run', k, JSON.stringify(w), 'left', left);
        if (w.t == null) await T.shot(`${id}_stuck_${k}`);
        check(w.t != null, `${id}: the chase did not get stuck (${JSON.stringify(w.stuck)})`);
        ts.push(w.t);
      }
      // Random spawns and flight paths: the 75th percentile of the measured chases, + 0.5 s per target.
      const tRef = pct(ts, 0.75) + 0.5 * 6;
      out[key] = tRef; kind[key] = 'foot'; sample[key] = { ts, extra: 0.5 * 6 };
      row(id, `${what} (on foot, measured)`, 'nearest-first sprint chase', tRef.toFixed(1), roundTimer(tRef * 1.25), `p75 of ${ts.length} runs + 0.5 s × 6: ${ts.map(f1).join(' / ')} s; median ${f1(median(ts))}`);
    }

    // ---- follows: no timer; check the distance band ---------------------------------------------
    for (const [id, mission, stage, gap, place] of [
      ['follow-grisbil', 8, 6, 24, { x: -293, z: -117.25, yaw: Math.PI / 2 }],
      ['follow-jose', 9, 1, 26, { x: 134, z: -42.75, yaw: -Math.PI / 2 }],
      ['follow-buss', 10, 2, 24, { x: -37.25, z: -109, yaw: Math.PI }],
    ]) {
      if (!want(id) && !want('follow')) continue;
      await boot(T, mission);
      await jumpTo(T, stage, { fn: carSetup(), arg: { type: 'sedan', ...place } });
      const info = await T.ev(() => { const st = __game.missions.stage; return { cruise: st.o.cruise, maxDist: st.o.maxDist, minDist: st.o.minDist ?? null, nodes: st.car.ai.path.nodes.length }; });
      await T.ev((gp) => window.__ap.tail(gp), gap);
      const r = await waitDone(T, 200000);
      const res = await T.ev(() => ({ state: __game.missions.state, stage: __game.missions.stageI }));
      T.log(id, JSON.stringify({ info, r, res }));
      check(r.t != null && !r.fail, `${id}: the follow completed`);
      check(r.band && r.band.dMax < info.maxDist && (!info.minDist || r.band.dMin > info.minDist), `${id}: the tail stayed inside the band`);
      row(id, `${id} (cruise ${info.cruise}, maxDist ${info.maxDist}${info.minDist ? `, minDist ${info.minDist}` : ''})`, 'the quarry\'s own route', r.t.toFixed(1), '—', `tail at ${gap} m stayed ${r.band.dMin}–${r.band.dMax} m; ${r.driven} m driven, impacts ${r.impacts}`);
    }

    // ---- SKANDAL: escaping two Guardia Land Rovers in free roam ---------------------------------
    // Clean driving at full ×1.2 speed must be able to escape; one crash on the way should mostly
    // get him caught ("possible but hard").
    if (want('pursuit')) {
      const runs = +(process.env.PURSUIT_RUNS || 3);
      const res = {};
      for (const [who, crashAt] of [['clean', null], ['one crash', 250]]) {
        res[who] = [];
        for (let k = 0; k < runs; k++) {
          await boot(T, 6);
          await T.ev(carSetup(), { type: 'sedan', x: -30, z: -37.25, yaw: Math.PI / 2 });
          await T.frames(5);
          // The scandal boils over while he is driving (a pursuit never starts at a standstill).
          await T.ev(() => { const c = __game.playerCar; c.vx = 20; c.vz = 0; });
          await T.ev((a) => window.__ap.escape(a), crashAt);
          await T.frames(20);
          await T.ev(() => { const sh = __game.shame; sh.v = 100; sh.startPursuit(); });
          const r = await waitDone(T, 150000);
          T.log('pursuit', who, k, JSON.stringify({ escape: r.escape, driven: r.driven, impacts: r.impacts, hits: r.hits?.slice(0, 4) }));
          res[who].push(r.escape || { timeout: true });
          check(!r.escape || r.escape.busted || r.escape.spawn?.length, `pursuit: Land Rovers spawned (car at ${JSON.stringify(await T.ev(() => window.__ap.active?.at))})`);
        }
      }
      const fmtR = (a) => a.map((e) => (e.escaped ? `escaped ${e.t} s` : e.busted ? `busted ${e.t} s` : 'no result')).join(' / ');
      row('pursuit', 'SKANDAL: escape 2 Guardia cars in a ×1.2 sedan, free roam (meters.js skandal)', 'flee to far intersections at full speed', '—', '—', `clean driving: ${fmtR(res.clean)}; one crash (at 250 m, 1 s at the kerb): ${fmtR(res['one crash'])}`);
      check(res.clean.some((e) => e.escaped), 'pursuit: a clean escape is possible');
      out.__pursuit = res;
    }

    // ---- the haggle (asnan s4): model players against the shipped zones and speeds --------------
    if (want('haggle')) {
      await boot(T, 7);
      const hg = await T.ev(async () => (await import('/src/game/missions/island.js')).HAGGLE);
      const res = {};
      for (const sigma of [0.025, 0.04, 0.06]) res[sigma] = haggleModel(hg.zones, hg.speeds, sigma);
      row('haggle', `asnan s4 haggle (zones ${hg.zones.join('/')}, speeds ${hg.speeds.join('/')}, 3 misses fail)`, 'model player aims at the zone middle, Gaussian timing error σ', '—', '—', Object.entries(res).map(([s, r]) => `σ ${(s * 1000).toFixed(0)} ms: wins ${(r.win * 100).toFixed(0)} %, ${r.misses.toFixed(2)} misses`).join('; '));
      out.__haggle = res;
    }

    // ---- summary --------------------------------------------------------------------------------
    console.log('[t] CAL TABLE id | stage | route | T_ref s | timer s | notes');
    for (const r of rows) console.log(`[t] CAL TABLE ${r.id} | ${r.what} | ${r.route} | ${r.tRef} | ${r.timer} | ${r.note}`);
    T.log('CAL JSON', JSON.stringify(out));
    // Compare with the shipped timers (src/game/missions/island.js TIMERS): a timer below T_ref
    // means a clean run cannot finish; the slack is (timer − T_ref) / timer (§8 target 15–20 %,
    // more only where the 5 s rounding forces it).
    await boot(T, 5);
    const shipped = await T.ev(async () => (await import('/src/game/missions/island.js')).TIMERS);
    for (const [k, t] of Object.entries(out)) {
      if (k.startsWith('__')) continue;
      const mult = kind[k] === 'foot' ? 1.25 : 1.2;
      const want = roundTimer(t * mult);
      const cur = shipped[k];
      // A random stage's single sample does not pin its timer down to the second: say whether the
      // shipped timer lies inside this sample's 90 % bootstrap range (§8; timerRange in lib.mjs).
      const smp = sample[k], rg = smp && timerRange(smp.ts, (p) => roundTimer((p + smp.extra) * mult));
      const range = rg ? `; this sample's 90 % range ${rg[0]}–${rg[1]} s (n ${smp.ts.length}): shipped ${cur >= rg[0] && cur <= rg[1] ? 'inside (consistent)' : 'OUTSIDE (disagrees)'}` : '';
      T.log(`CAL CHECK ${k}: T_ref ${t.toFixed(1)} -> ${want} s; shipped ${cur} s (slack ${(((cur - t) / cur) * 100).toFixed(0)} %) ${cur === want ? 'OK' : cur > want ? 'LOOSER than measured' : cur >= t ? '(tighter than measured)' : 'TOO TIGHT'}${range}`);
      // Random stages (flee routes, spawns) vary run to run: they only warn here.
      if (!['bodegaJeep', 'friskotekBalls', 'fatagaSheep', 'grisfestFlowers'].includes(k)) check(cur >= t, `${k}: shipped timer ${cur} s is below T_ref ${t.toFixed(1)} s`);
    }
  },
};
