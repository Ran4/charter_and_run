// Timer calibration for the island missions (DESIGN §8 "Timers and difficulty"). Owner: WP-G.
//   PORT=… OUT=… node tools/shot.mjs calibrate          (all cases)
//   CAL=buss17,race node tools/shot.mjs calibrate        (a subset; ids below)
// A headless autopilot drives the PLAYER's car (PLAYER_BOOST 1.2, timeScale 1 via &ts=1, traffic
// on) by writing playerCar.ctrl every fixed step (it sits in car.ai, which main.js steps right after
// the input write): lane-following pure pursuit over the road graph, full throttle, braking before
// corners from a curvature speed profile, overtaking slower traffic on clear straights. `smooth`
// stages keep lateral accel ≤ 5.2 m/s² and braking ≤ 9 m/s² (ÅKSJUKA counts > 6 and > 14);
// `fragile` stages avoid impacts. On foot it holds W+Shift and steers the camera yaw.
// Each timed stage is entered directly (runner.stageI + startStage) with the player placed where a
// human would be when that stage starts, so a measurement never depends on earlier stages.
// T_ref = game seconds from the stage start to the stage being done. Drives: timer = ceil5(1.2 ×
// T_ref); on foot: ceil5(1.25 × T_ref). Races/chases/follows print their margins instead.
// The printed table (`[t] CAL …` lines and the final summary) is the WP-G report's timer table.
import { check } from '../lib.mjs';

const ceil5 = (s) => Math.ceil(s / 5) * 5;
const CAL = process.env.CAL ? process.env.CAL.split(',') : null;
const want = (id) => !CAL || CAL.includes(id);

// ---------------------------------------------------------------------------------------------
// Page side: the autopilot. Serialised into the page by T.ev (no closure over Node variables).

async function installAutopilot() {
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
  const ap = (window.__ap = { t: 0, active: null, foot: null });

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
  function plan(car, endEdges, via = []) {
    const [a, b] = D.startNodes(car);
    let best = null;
    for (const [s0, s1, pen] of [[a, b, 0], [b, a, 40]]) {
      for (const e of endEdges) for (const [A, B] of [[NR(e[0]), NR(e[1])], [NR(e[1]), NR(e[0])]]) for (const iF of [true, false]) {
        const ns = [s0, s1];
        for (const t of [...via.map(NR), A]) ns.push(...stair(ns[ns.length - 1], t, iF).slice(1));
        ns.push(B);
        const sc = score(ns) + pen;
        if (!best || sc < best.sc) best = { ns, sc };
      }
    }
    return best.ns;
  }

  // --- path geometry: lane points, entry from where the car stands, exit to the end point -------
  // Right-hand lane lines joined by circular fillets, wider than the lane path's own corners (a
  // good driver uses the whole junction): right turns R 9 m, left turns R 13 m.
  function lanePts(ns) {
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
      const R = right ? 9 : 13;
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
  function buildPath(car, ns, end) {
    let pts = lanePts(ns);
    if (end) {
      let k = pts.length - 1;
      while (k > 0 && hyp(pts[k - 1], end) < hyp(pts[k], end)) k--;
      pts = pts.slice(0, k + 1);
      const d = hyp(pts[k], end), n = Math.max(1, Math.round(d / 4));
      for (let i = 1; i <= n; i++) pts.push({ x: pts[k].x + (end.x - pts[k].x) * (i / n), z: pts[k].z + (end.z - pts[k].z) * (i / n) });
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
    return pts.slice(i0);
  }
  function menger(a, b, c) {
    const ab = hyp(a, b), bc = hyp(b, c), ca = hyp(c, a);
    const cross = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x));
    return ab * bc * ca > 1e-6 ? (2 * cross) / (ab * bc * ca) : 0;
  }
  function limits(car, mode) {
    const s = car.spec;
    return { s, wb: s.len * 0.62, top: s.maxSpeed * (g.playerCar === car ? 1.2 : 1), aLat: mode === 'smooth' ? 5.2 : 30, aBr: mode === 'smooth' ? 9 : 19 };
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
    let capIn = Infinity, capLeft = Infinity, slowAhead = null, leftBusy = false;
    const halfW = car.spec.wid / 2;
    const off = path.off || 0;
    const scan = (x, z, r, ov, isCar, oncoming) => {
      const dx = x - car.x, dz = z - car.z, along = dx * fx + dz * fz - car.spec.len / 2 - r, lat = dx * rx + dz * rz;
      if (along < -8 || along > Math.max(range, 55)) return;
      if (Math.abs(lat - off) < halfW + r + 0.5 && along > -1 && along < range) {
        const c = Math.max(0, ov) + Math.sqrt(2 * lim.aBr * 0.6 * Math.max(0, along - (isCar ? 6 : 3)));
        if (c < capIn) { capIn = c; if (isCar && (ov < v - 2 || ov < 1.5)) slowAhead = { along }; }
      }
      if (isCar && lat < -2.2 && lat > -9 && along > -6 && along < (oncoming ? 70 : 45)) leftBusy = true;
      if (off < -1 && Math.abs(lat + 2 * LANE) < halfW + r + 0.5 && along > -1 && along < range) capLeft = Math.min(capLeft, Math.max(0, ov) + Math.sqrt(2 * lim.aBr * 0.6 * Math.max(0, along - 6)));
    };
    for (const o of g.cars) {
      if (o === car || (path.ignore && o.name === path.ignore) || Math.abs(o.x - car.x) > 80 || Math.abs(o.z - car.z) > 80) continue;
      const ov = o.vx * fx + o.vz * fz;
      scan(o.x, o.z, Math.min(o.spec.wid, o.spec.len) / 2, ov, true, ov < -2);
    }
    for (const p of g.peds) { const c = p.char; if (c.state === 'normal' && Math.abs(c.x - car.x) < 60 && Math.abs(c.z - car.z) < 60) scan(c.x, c.z, 0.4, 0, false, false); }
    // Overtake: a slower car ahead, the left lane clear, the next 50 m straight.
    let straight = true;
    for (let k = idx, s = 0; k < path.pts.length - 1 && s < 55; s += hyp(path.pts[k], path.pts[k + 1]), k++) if (path.v[k] < lim.top * 0.85) { straight = false; break; }
    // Stalled behind something that is not moving (a wreck, a parked car): pull out regardless.
    path.stallT = slowAhead && v < 2 ? (path.stallT || 0) + 1 / 60 : 0;
    if (path.stallT > 1.2) path.forceT = 3;
    path.forceT = Math.max(0, (path.forceT || 0) - 1 / 60);
    if (path.forceT > 0) path.offT = -2 * LANE;
    else {
      if (slowAhead && !leftBusy && straight && path.mode !== 'smooth' && slowAhead.along < 30) path.offT = -2 * LANE;
      else if (path.offT < 0 && !slowAhead) path.offT = 0;
      if (!straight) path.offT = 0;
    }
    const cap = Math.min(capIn, path.off < -1 ? capLeft : Infinity);
    return cap;
  }

  // Pushing without moving (a wall, a parked car): back up with the wheel turned the other way.
  function unstick(car, st, dt) {
    const c = car.ctrl;
    if ((st.revT || 0) > 0) { st.revT -= dt; c.throttle = 0; c.brake = 1; c.park = false; c.steer = -(st.revSteer || 0); return true; }
    if (c.throttle > 0.5 && Math.abs(car.forwardSpeed) < 1) st.stuckT = (st.stuckT || 0) + dt;
    else st.stuckT = Math.max(0, (st.stuckT || 0) - dt);
    if (st.stuckT > 0.9) { st.stuckT = 0; st.revT = 1.0; st.revSteer = c.steer || 1; st.unsticks = (st.unsticks || 0) + 1; }
    return false;
  }

  // --- the controller (car.ai): pure pursuit + speed profile --------------------------------------
  function makeController(car, path) {
    const lim = limits(car, path.mode);
    path.v = profile(path.pts, lim, path.vEnd ?? 10);
    path.idx = 0; path.off = 0; path.offT = 0;
    const st = { impacts: 0, blockedT: 0, maxLat: 0, maxBrake: 0, dist: 0, pvx: car.vx, pvz: car.vz, px: car.x, pz: car.z };
    return {
      st, path, lim,
      update(dt, game) {
        const c = car.ctrl;
        c.park = false; c.handbrake = false;
        // Held still (race countdown, dialogue): park, since brake at standstill means reverse.
        if (game.freezeCar || game.inDialog || game.missions.state !== 'running') { c.throttle = 0; c.brake = 0; c.steer = 0; c.park = true; return; }
        const pts = path.pts;
        // Impacts and lateral accel (for the clean-run check).
        const dv = Math.hypot(car.vx - st.pvx, car.vz - st.pvz);
        if (dv > 3 * (dt / (1 / 60))) st.impacts++;
        st.pvx = car.vx; st.pvz = car.vz;
        st.dist += Math.hypot(car.x - st.px, car.z - st.pz); st.px = car.x; st.pz = car.z;
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
        let k = path.idx, acc = hyp(pts[k], car), aim = pts[k];
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
        if (cap < vt - 1) st.blockedT += dt;
        vt = Math.min(vt, cap);
        if (path.done?.()) vt = 0;
        if (v < vt - 0.4) { c.throttle = 1; c.brake = 0; }
        else if (v > vt + 0.8) { c.throttle = 0; c.brake = clamp((v - vt) * 0.25, 0.08, path.mode === 'smooth' ? 0.3 : 1); }
        else if (vt < 0.5 && v < 0.8) { c.throttle = 0; c.brake = 0; c.park = true; }
        else { c.throttle = 0.35; c.brake = 0; }
        if (v > 0.5 && c.brake > 0) st.maxBrake = Math.max(st.maxBrake, c.brake * 24 * 1.2);
        unstick(car, st, dt);
      },
    };
  }

  // --- public API ---------------------------------------------------------------------------------
  const lmOr = (p) => (typeof p === 'string' ? L.lm(p) : p);
  ap.endAt = (p) => lmOr(p);
  // Drive the player's car: { end, endEdges, via?, nodes?, mode, vEnd, until: 'stage' | { npc } }.
  ap.drive = (spec) => {
    const car = g.playerCar;
    if (!car) return { err: 'no car' };
    const end = spec.end ? lmOr(spec.end) : null;
    const ns = spec.nodes ? spec.nodes.map(NR) : plan(car, spec.endEdges || [edgeAt(end.x, end.z)], spec.via || []);
    const pts = buildPath(car, ns, end);
    const path = { pts, mode: spec.mode || 'normal', vEnd: spec.vEnd ?? 10, ignore: spec.ignore || null };
    const ctl = makeController(car, path);
    car.ai = ctl;
    const ms = g.missions;
    ap.active = { ctl, car, t0: ap.t, tEnd: null, stage0: ms.stageI, until: spec.until || 'stage', fail: null, len: pts.reduce((s, q, i) => s + (i ? hyp(q, pts[i - 1]) : 0), 0) };
    return { nodes: ns.map((n) => [L.nodeI(n), L.nodeJ(n)]), pts: pts.length, len: Math.round(ap.active.len) };
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
      if (ms.state === 'failed') { a.fail = 'failed'; done = true; }
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
    return { t: a.tEnd != null ? a.tEnd - a.t0 : null, fail: a.fail, len: Math.round(a.len), driven: Math.round(st.dist), impacts: st.impacts, blocked: f(st.blockedT), maxLat: f(st.maxLat), maxBrake: f(st.maxBrake), x: f(a.car.x), z: f(a.car.z), yaw: +a.car.yaw.toFixed(2), band };
  };
  // Back straight up for `secs` (out of a wreck's embrace before planning a route).
  ap.reverse = (secs) => {
    const car = g.playerCar;
    let t = 0;
    car.ai = { update(dt) { const c = car.ctrl; t += dt; c.park = false; c.throttle = 0; c.steer = 0; c.handbrake = false; c.brake = t < secs ? 1 : 0; if (t >= secs) { c.park = true; car.ai = null; } } };
    return true;
  };
  ap.stop = () => { const a = ap.active; if (a && a.car.ai === a.ctl) { a.car.ai = null; a.car.ctrl.throttle = 0; a.car.ctrl.brake = 1; } ap.active = null; };

  // Chase (destroy): road route towards the quarry, direct pursuit with lead inside 35 m.
  ap.chase = (getTarget) => {
    const car = g.playerCar;
    const lim = limits(car, 'normal');
    const st = { impacts: 0, rams: 0, dist: 0, px: car.x, pz: car.z };
    let path = null, ctl = null, replan = 0;
    const self = {
      st,
      update(dt, game) {
        const c = car.ctrl;
        c.park = false; c.handbrake = false;
        const t = getTarget();
        if (!t || game.freezeCar || game.inDialog || game.missions.state !== 'running') { c.throttle = 0; c.brake = 0; c.park = true; return; }
        st.dist += Math.hypot(car.x - st.px, car.z - st.pz); st.px = car.x; st.pz = car.z;
        const d = Math.hypot(t.x - car.x, t.z - car.z);
        if (d < 35 && C.segmentBlocked(car.x, car.z, t.x, t.z, car.y + 0.6) < 0) {
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
          ctl = makeController(car, path);
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

  // On foot: hold W + Shift through the input module and point the camera yaw at the target.
  const om = input.moveY.bind(input), ox = input.moveX.bind(input), od = input.down.bind(input);
  input.moveY = () => (ap.foot ? 1 : om());
  input.moveX = () => (ap.foot ? 0 : ox());
  input.down = (a) => (ap.foot && a === 'sprint') || od(a);
  ap.walk = (spec) => {
    // spec.kind: 'list' (nearest alive entry of stage.list) | 'point' {x, z, r}
    ap.foot = { spec, t0: ap.t, tEnd: null, stage0: g.missions.stageI, path: 0, px: g.player.x, pz: g.player.z };
    ap.active = null;
    return true;
  };
  ap.walkResult = () => { const f = ap.foot || ap.lastFoot; return f ? { t: f.tEnd != null ? f.tEnd - f.t0 : null, walked: Math.round(f.path) } : null; };

  // The clock and the completion checks run on the game's own frame dt (the stage timers' clock).
  g.onFrame((dt) => {
    ap.t += dt;
    const ms = g.missions;
    ap.check();
    const f = ap.foot;
    if (f) {
      const p = g.player;
      f.path += Math.hypot(p.x - f.px, p.z - f.pz); f.px = p.x; f.pz = p.z;
      let t = null;
      if (f.spec.kind === 'list') {
        let bd = Infinity;
        for (const e of ms.stage?.list || []) if (e.alive) { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; t = e; } }
      } else if (f.spec.kind === 'point') t = Math.hypot(f.spec.x - p.x, f.spec.z - p.z) > (f.spec.r ?? 1) ? f.spec : null;
      const over = f.spec.kind === 'list' ? (ms.stageI !== f.stage0 || ms.state !== 'running' || !t) : !t;
      if (over) { f.tEnd = ap.t; ap.lastFoot = f; ap.foot = null; return; }
      // Straight at the target unless a wall is in the way: then the free heading nearest to it.
      const dir = yawTo(t.x - p.x, t.z - p.z), y = p.y + 0.46, dt0 = Math.hypot(t.x - p.x, t.z - p.z);
      const free = (a, l) => C.segmentBlocked(p.x, p.z, p.x + Math.sin(a) * l, p.z + Math.cos(a) * l, y) < 0;
      if (free(dir, Math.min(2.5, dt0))) { f.yaw = dir; f.prev = null; }
      else if (f.prev != null && free(f.prev, 3) && Math.abs(wrap(f.prev - dir)) < 2.6) f.yaw = f.prev;
      else {
        // The free heading nearest to the target; ties go to the side we went last time.
        let pick = null;
        for (let k = 1; k <= 12 && pick == null; k++) for (const sgn of [f.side || 1, -(f.side || 1)]) { const a = dir + sgn * k * 0.26; if (free(a, 4)) { pick = a; f.side = sgn; break; } }
        f.yaw = f.prev = pick ?? dir + Math.PI;
      }
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
    if (!car) { car = g.spawnMissionCar(g.missions.m, a.type || 'sedan', a.x, a.z, a.yaw); g.missions.m.cars.pop(); }
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

// Plain drive cases: the stage, where the car starts (a landmark or {x, z}, yaw, passenger), the drive.
const DRIVES = [
  { id: 'buss17', mission: 5, stage: 1, what: 'buss17 s2 busBay -> flamencoDrive (ÅKSJUKA, stop)', key: 'buss17Drive',
    car: { named: 'buss17', lm: 'busBay', passenger: 'ole' }, spec: { end: 'flamencoDrive', endEdges: [[[3, 3], [3, 4]]], mode: 'smooth', vEnd: 0 } },
  { id: 'asnan', mission: 7, stage: 8, what: 'asnan s9 supermercado -> vikingbar (SKICK)', key: 'asnanPaint',
    car: { type: 'sedan', lm: 'supermercado', yaw: 0, passenger: 'ole' }, spec: { end: 'vikingbar', endEdges: [[[1, 3], [2, 3]]], mode: 'fragile', vEnd: 8 } },
  { id: 'vischan', mission: 8, stage: 3, what: 'bodega s4 playa -> vischan', key: 'bodegaVischan',
    car: { type: 'sedan', at: { x: 0, z: 236 }, yaw: 0, passenger: 'berra' }, spec: { end: 'vischan', endEdges: [[[0, 2], [1, 2]]], vEnd: 12 } },
];

export const SCENARIOS = {
  async calibrate(T) {
    const out = {};
    // ---- plain drives -------------------------------------------------------------------------
    for (const c of DRIVES) {
      if (!want(c.id)) continue;
      await boot(T, c.mission);
      const pose = await T.ev((c) => { const l = c.at || window.__lm(c.lm); return { x: l.x, z: l.z, yaw: c.yaw ?? l.yaw }; }, c.car);
      await jumpTo(T, c.stage, { fn: carSetup(), arg: { ...c.car, ...pose } });
      const timer0 = await stageTimer(T);
      const r = await drive(T, c.spec);
      T.log(c.id, JSON.stringify(r));
      check(r.t != null && !r.fail, `${c.id}: the autopilot finished the stage`);
      out[c.key] = r.t;
      row(c.id, c.what, fmtNodes(r.plan), r.t.toFixed(1), ceil5(r.t * 1.2), `stage timer was ${timer0}; impacts ${r.impacts}, blocked ${r.blocked}s, maxLat ${r.maxLat}, maxBrake ${r.maxBrake}, ${r.driven} m`);
    }
    // ---- bodega: wreck the Guardia jeep (destroy), then drive the pigs home --------------------
    if (want('jeep') || want('home')) {
      const runs = +(process.env.JEEP_RUNS || 2);
      const jeep = [], home = [];
      for (let k = 0; k < runs; k++) {
        await boot(T, 8);
        if (process.env.JEEP) await T.ev(async (s) => { const [c, d] = s.split(':').map(Number); const t = (await import('/src/game/missions/island.js')).TUNING.jeep; t.cruise = c; if (d) t.damageScale = d; }, process.env.JEEP);
        await T.ev(async () => { const M = await import('/src/game/missions/island.js'); M.TIMERS.bodegaJeep = 400; M.TIMERS.bodegaHome = 400; });
        // The truck stopped at the farm gate heading east; Berra rides along (Robban in the bed).
        await jumpTo(T, 8, { fn: carSetup(), arg: { type: 'grisbil', x: -84, z: -199, yaw: Math.PI / 2, passenger: 'berra' } });
        const cruise = await T.ev(() => `${__game.missions.stage.o.cruise}/x${__game.missions.stage.o.damageScale}`);
        await T.ev(() => window.__ap.chase(() => { const c = __game.missions.stage?.car; return c && !c.dead ? c : null; }));
        const r = await waitDone(T, 400000);
        const wreck = await T.ev(() => ({ x: +__game.playerCar.x.toFixed(0), z: +__game.playerCar.z.toFixed(0), hp: Math.round(__game.playerCar.hp) }));
        T.log('jeep run', k, 'cruise', cruise, JSON.stringify(r), 'wreck at', JSON.stringify(wreck));
        check(r.t != null && !r.fail, 'jeep: wrecked');
        // A run averaging under 6 m/s means the autopilot wedged itself on a house while the jeep
        // drove round the block (an autopilot artefact, not the chase): reported, not used.
        jeep.push({ t: r.t, wreck, cruise, wedged: r.driven / r.t < 6 });
      }
      // Stage 10 starts where the jeep died. Measured from a clean start on the road next to each
      // wreck spot (a fresh stage, so a tangle with the wreck never pollutes the drive), plus the
      // far south-east corner of the map.
      const spots = [...jeep.map((j) => j.wreck), { x: 270, z: 277 }];
      for (const w of spots) {
        await boot(T, 8);
        await T.ev(async () => { (await import('/src/game/missions/island.js')).TIMERS.bodegaHome = 400; });
        const pose = await T.ev((w) => {
          // Snap onto the right-hand lane of the nearest road, heading towards the hotel.
          const L = { P: 80, HALF: 280, LANE: 2.75 };
          const fi = (w.x + L.HALF) / L.P, fj = (w.z + L.HALF) / L.P;
          const di = Math.abs(fi - Math.round(fi)) * L.P, dj = Math.abs(fj - Math.round(fj)) * L.P;
          if (di <= dj) { const x = Math.round(fi) * L.P - L.HALF, south = w.z < -37; return { x: x + (south ? -L.LANE : L.LANE), z: w.z, yaw: south ? 0 : Math.PI }; }
          const z = Math.round(fj) * L.P - L.HALF, east = w.x < -6;
          return { x: w.x, z: z + (east ? L.LANE : -L.LANE), yaw: east ? Math.PI / 2 : -Math.PI / 2 };
        }, w);
        await jumpTo(T, 9, { fn: carSetup(), arg: { type: 'grisbil', ...pose, passenger: 'berra' } });
        const h = await drive(T, { end: 'flamencoBack', endEdges: [[[3, 3], [4, 3]]], vEnd: 12 });
        T.log('home from', JSON.stringify(w), JSON.stringify(h));
        check(h.t != null && !h.fail, 'bodega home: arrived');
        home.push({ t: h.t, from: w, route: fmtNodes(h.plan), r: h });
      }
      const ok = jeep.filter((j) => !j.wedged).length ? jeep.filter((j) => !j.wedged) : jeep;
      const jt = Math.max(...ok.map((j) => j.t));
      const med = ok.map((j) => j.t).sort((a, b) => a - b)[Math.floor(ok.length / 2)];
      out.bodegaJeep = jt;
      row('jeep', `bodega s9 wreck the Guardia jeep (cruise/damageScale ${jeep[0].cruise}, ${runs} runs)`, 'gate (-84,-199) in the grisbil, road-route chase', jt.toFixed(1), ceil5(jt * 1.2), `runs ${jeep.map((j) => `${j.t.toFixed(1)}${j.wedged ? ' (wedged, excluded)' : ''}`).join(' / ')} s (median ${med.toFixed(1)}; the flee route is random, so the shipped timer uses the p90 over all calibration runs); truck hp left ${jeep.map((j) => j.wreck.hp).join(' / ')}`);
      const hm = home.reduce((a, b) => (b.t > a.t ? b : a));
      out.bodegaHome = hm.t;
      row('home', 'bodega s10 wreck spot -> flamencoBack', `from (${hm.from.x},${hm.from.z}) ${hm.route}`, hm.t.toFixed(1), ceil5(hm.t * 1.2), `runs ${home.map((h) => `${h.t.toFixed(1)} s from (${h.from.x},${h.from.z})`).join(' / ')}`);
    }

    // ---- grisfest: flowers (on foot), the race, the plates (formula), dance floor -> Tonga Tonga --
    if (want('flowers') || want('plates') || want('tonga')) {
      await boot(T, 11);
      await T.startMission();
      // Stage 1: five static flowers round Hotel Flamenco, sprinting nearest-first.
      const start = await T.ev(() => ({ x: __game.player.x, z: __game.player.z }));
      await T.ev(() => window.__ap.walk({ kind: 'list' }));
      await T.until(() => window.__ap.foot === null, 120000);
      const fl = await T.ev(() => window.__ap.walkResult());
      // Formula over 300 sampled spawns (same generator as the kind: freeSpot(flamenco, 8, 40)).
      const fs = await T.ev((s) => {
        const g = __game, c = window.__lm('flamenco'), res = [];
        for (let k = 0; k < 300; k++) {
          const pts = []; for (let i = 0; i < 5; i++) pts.push(g.freeSpot(c.x, c.z, 8, 40));
          let p = s, L = 0; const left = pts.slice();
          while (left.length) { left.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)); L += Math.hypot(left[0].x - p.x, left[0].z - p.z); p = left.shift(); }
          res.push(L / 8.8 + 1.5 * 5);
        }
        res.sort((a, b) => a - b);
        return { mean: res.reduce((a, b) => a + b, 0) / res.length, p75: res[Math.floor(res.length * 0.75)], max: res[res.length - 1] };
      }, start);
      if (want('flowers')) {
        const tref = Math.max(fl.t, fs.p75);
        out.grisfestFlowers = tref;
        row('flowers', 'grisfest s1 five flowers round Flamenco (on foot, static)', 'nearest-first sprint', tref.toFixed(1), ceil5(tref * 1.25), `measured ${fl.t.toFixed(1)} s (${fl.walked} m); formula NN/8.8+1.5×5 over 300 spawns: mean ${fs.mean.toFixed(1)}, p75 ${fs.p75.toFixed(1)}, max ${fs.max.toFixed(1)}; T_ref = max(measured, p75)`);
      }
      // Stage 4: plates (formula: nearest-neighbour path over 10 of the stacks from the race finish).
      const pl = await T.ev(async () => {
        const P = await import('/src/world/props.js');
        const d = window.__lm('dansgolv');
        const list = P.propsOfType('tallrikar', { x: d.x, z: d.z, r: 22 }).map((p) => ({ x: p.x, z: p.z }));
        let p = { x: -80, z: -200 }, L = 0; const left = list.slice();
        for (let k = 0; k < 10 && left.length; k++) { left.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)); L += Math.hypot(left[0].x - p.x, left[0].z - p.z); p = left.shift(); }
        return { n: list.length, L };
      });
      if (want('plates')) {
        const tref = pl.L / 8.8 + 1.5 * 10;
        out.grisfestPlates = tref;
        row('plates', 'grisfest s4 smash 10 plate stacks (on foot)', `race finish -> NN over ${pl.n} stacks`, tref.toFixed(1), ceil5(tref * 1.25), `NN path ${pl.L.toFixed(0)} m / 8.8 + 1.5×10 (formula)`);
      }
      // Stage 6: from the dance floor on foot back to the car at the farm gate, then Tonga Tonga.
      if (want('tonga')) {
        await T.ev(async () => { (await import('/src/game/missions/island.js')).TIMERS.grisfestTonga = 400; });
        await T.ev(carSetup(), { type: 'sedan', x: -82, z: -198, yaw: Math.PI / 2 });
        const car = await T.ev(() => {
          const g = __game, ms = g.missions, c = g.playerCar;
          ms.stageI = 5; ms.startStage();
          g.exitCar(true);
          c.place(-82, -198, Math.PI / 2);
          const s = g.approachSpot('dansgolv');
          g.player.teleport(s.x, s.z, s.yaw);
          g.cam.snapNext = true;
          window.__calCar = c;
          return { x: c.x, z: c.z, d: Math.hypot(c.x - s.x, c.z - s.z) };
        });
        await T.frames(3);
        await T.ev((c) => window.__ap.walk({ kind: 'point', x: c.x, z: c.z, r: 3.6 }), car);
        await T.until(() => window.__ap.foot === null, 60000);
        const w = await T.ev(() => window.__ap.walkResult());
        await T.ev(() => __game.enterCar(window.__calCar));
        await T.frames(2);
        const d = await drive(T, { end: 'tongatonga', endEdges: [[[1, 3], [2, 3]], [[2, 2], [2, 3]]], vEnd: 12 });
        T.log('tonga', JSON.stringify({ w, d }));
        check(d.t != null && !d.fail, 'tonga: arrived');
        const tref = w.t + 0.5 + d.t;
        out.grisfestTonga = tref;
        row('tonga', 'grisfest s6 dance floor -> car at the gate -> tongatonga', `walk ${w.walked} m + ${fmtNodes(d.plan)}`, tref.toFixed(1), ceil5(tref * 1.2), `walk ${w.t.toFixed(1)} s + 0.5 s getting in + drive ${d.t.toFixed(1)} s; impacts ${d.impacts}, blocked ${d.blocked}s`);
      }
    }

    // ---- grisfest race: Gabbe's night bus (RACE_SWEEP='cruise:maxSpeed:accel:steer;…' tries settings)
    if (want('race')) {
      const sweep = process.env.RACE_SWEEP ? process.env.RACE_SWEEP.split(';') : [null];
      for (const set of sweep) for (let k = 0; k < +(process.env.RACE_RUNS || 1); k++) {
        await boot(T, 11);
        if (set) await T.ev(async (s) => { const [cr, mx, ac, sr] = s.split(':').map(Number); const t = (await import('/src/game/missions/island.js')).TUNING.nattbuss; t.cruise = cr; t.spec = { maxSpeed: mx, accel: ac, steer: sr || t.spec.steer }; }, set);
        await T.startMission();
        // Stage 3: the race, from its own start spot (the kind places the player's car).
        await T.ev(carSetup(), { type: process.env.RACE_CAR || 'sedan', x: 0, z: 0, yaw: 0 });
        await T.ev(() => { const g = __game, ms = g.missions; ms.stageI = 2; ms.startStage(); const st = ms.stage, o = (window.__calOpp = { car: st.opp, path: st.opp.ai.path, d: 0, t: 0, x: st.opp.x, z: st.opp.z }); g.onFrame((dt) => { if (ms.stage !== st || st.countdown > 0) return; o.t += dt; o.d += Math.hypot(o.car.x - o.x, o.car.z - o.z); o.x = o.car.x; o.z = o.car.z; }); });
        await T.frames(3);
        const rinfo = await T.ev(() => { const st = __game.missions.stage; return { type: __game.playerCar.type, opp: st.opp.spec.maxSpeed, cruise: st.o.cruise }; });
        const rr = await drive(T, { nodes: [[3, 3], [4, 3], [4, 2], [4, 1], [3, 1], [2, 1]], end: { x: -80, z: -200 }, vEnd: 40, ignore: 'nattbuss' });
        const race = await T.ev(() => {
          // The bus's remaining route (its own lane path from its progress index) and its average speed.
          const g = __game, o = window.__calOpp, c = o.car, p = o.path;
          p.ensure(100000);
          const pts = p.pts;
          let left = Math.hypot(pts[p.idx].x - c.x, pts[p.idx].z - c.z);
          for (let k = p.idx; k < pts.length - 1; k++) left += Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].z - pts[k].z);
          return { left, failed: g.missions.state === 'failed', busV: c.speed, busAvg: o.d / Math.max(1, o.t), busD: o.d };
        });
        T.log('race', JSON.stringify({ rinfo, rr, race }));
        if (want('race')) {
          const tp = rr.t - 3.5;   // minus the countdown
          const margin = race.failed ? `LOST (player ${Math.hypot(rr.x + 80, rr.z + 200).toFixed(0)} m from the finish)` : `bus ${race.left.toFixed(0)} m short of the finish ≈ ${(race.left / race.busAvg).toFixed(1)} s behind at its average ${race.busAvg.toFixed(1)} m/s`;
          row('race', `grisfest s3 night-bus race (bus cruise ${rinfo.cruise}, maxSpeed ${rinfo.opp}; player ${rinfo.type})`, 'start lane 3,3>4,3 t 6; cps 4,3>4,2>4,1>3,1; finish (-80,-200)', tp.toFixed(1), '—', `player ${tp.toFixed(1)} s after KÖR!; ${margin}; impacts ${rr.impacts}, blocked ${rr.blocked}s`);
        }
      }
    }

    // ---- julafton: round up the four guests from the patio (walk to the hire car, then drive) --
    if (want('guests')) {
      await boot(T, 12);
      await T.ev(async () => { (await import('/src/game/missions/island.js')).TIMERS.julaftonGuests = 600; });
      await T.startMission();
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
      for (const q of best.o) {
        const pos = await T.ev((k) => { const e = __game.missions.stage.list.find((x) => x.key === k); return { x: e.x, z: e.z }; }, q.key);
        const r = await drive(T, { end: pos, endEdges: EDGES[q.key], vEnd: 7, until: { npc: q.key } });
        legs.push(`${q.key} ${r.t?.toFixed(1)} s (${fmtNodes(r.plan)})`);
        check(r.t != null && !r.fail, `guests: reached ${q.key}`);
      }
      await T.until(() => __game.missions.stageI !== 0 || __game.missions.state !== 'running', 30000);
      const t1 = await T.ev(() => window.__ap.t);
      const tref = t1 - t0;
      out.julaftonGuests = tref;
      row('guests', 'julafton s1 patio -> hyrbil -> four guests', `walk ${w.walked} m, then ${best.o.map((q) => q.key).join(' > ')}`, tref.toFixed(1), ceil5(tref * 1.2), `walk ${w.t.toFixed(1)} s; ${legs.join('; ')}`);
    }

    // ---- fleeing rabbits on foot: the friskotek beach balls and the Fataga sheep ----------------
    for (const [id, mission, stage, key, what] of [['balls', 6, 0, 'friskotekBalls', 'friskotek s1 six fleeing beach balls'], ['sheep', 10, 4, 'fatagaSheep', 'fataga s5 six fleeing sheep']]) {
      if (!want(id)) continue;
      const runs = +(process.env.FOOT_RUNS || 3), ts = [];
      for (let k = 0; k < runs; k++) {
        await boot(T, mission);
        if (stage) await jumpTo(T, stage, { fn: () => { const g = __game; if (g.playerCar) g.exitCar(true); const s = window.__lm('fatagaBus'); g.player.teleport(s.x, s.z - 3, Math.PI); g.cam.snapNext = true; return true; } });
        else await T.startMission();
        await T.ev(() => window.__ap.walk({ kind: 'list' }));
        await T.until(() => window.__ap.foot === null, 200000);
        const w = await T.ev(() => window.__ap.walkResult());
        const left = await T.ev(() => (__game.missions.stage?.list || []).filter((r) => r.alive).length);
        T.log(id, 'run', k, JSON.stringify(w), 'left', left);
        ts.push(w.t);
      }
      // §8: "+1.5 s per target, or measured when targets flee" – fleeing targets use the measured
      // chase alone (the slowest run; the spawns and flight paths are random), no per-target
      // allowance on top. The shipped timer takes the worst run over all calibration runs.
      const tref = Math.max(...ts);
      out[key] = tref;
      row(id, `${what} (on foot, measured)`, 'nearest-first sprint chase', tref.toFixed(1), ceil5(tref * 1.25), `runs ${ts.map((t) => t.toFixed(1)).join(' / ')} s (T_ref = slowest run)`);
    }

    // ---- follows: no timer; check the routes on the stub grid and the distance band ------------
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
      const band = await T.ev(() => window.__ap.tailStats?.());
      const res = await T.ev(() => ({ state: __game.missions.state, stage: __game.missions.stageI }));
      T.log(id, JSON.stringify({ info, r, band, res }));
      check(r.t != null && !r.fail, `${id}: the follow completed`);
      check(r.band && r.band.dMax < info.maxDist && (!info.minDist || r.band.dMin > info.minDist), `${id}: the tail stayed inside the band`);
      row(id, `${id} (cruise ${info.cruise}, maxDist ${info.maxDist}${info.minDist ? `, minDist ${info.minDist}` : ''})`, 'the quarry\'s own route', r.t.toFixed(1), '—', `tail at ${gap} m stayed ${r.band.dMin}–${r.band.dMax} m; ${r.driven} m driven, impacts ${r.impacts}`);
    }

    // ---- summary --------------------------------------------------------------------------------
    console.log('[t] CAL TABLE id | stage | route | T_ref s | timer s | notes');
    for (const r of rows) console.log(`[t] CAL TABLE ${r.id} | ${r.what} | ${r.route} | ${r.tRef} | ${r.timer} | ${r.note}`);
    T.log('CAL JSON', JSON.stringify(out));
    // Compare with the shipped timers (src/game/missions/island.js TIMERS): a timer below T_ref
    // means a clean run cannot finish; below 1.1 × T_ref it is tighter than §8 asks.
    await boot(T, 5);
    const shipped = await T.ev(async () => (await import('/src/game/missions/island.js')).TIMERS);
    const onFoot = ['friskotekBalls', 'fatagaSheep', 'grisfestFlowers', 'grisfestPlates'];
    for (const [k, t] of Object.entries(out)) {
      const want = ceil5(t * (onFoot.includes(k) ? 1.25 : 1.2));
      const cur = shipped[k];
      T.log(`CAL CHECK ${k}: T_ref ${t.toFixed(1)} -> ${want} s; shipped ${cur} s ${cur >= want ? 'OK' : cur >= t * 1.1 ? '(tighter than suggested)' : 'TOO TIGHT'}`);
      // Deterministic stages must fit; the chases (random flee routes / spawns) only warn.
      if (!['bodegaJeep', 'bodegaHome', 'friskotekBalls', 'fatagaSheep'].includes(k)) check(cur >= t, `${k}: shipped timer ${cur} s is below T_ref ${t.toFixed(1)} s`);
    }
  },
};
