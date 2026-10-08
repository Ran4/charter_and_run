// AI at the wheel. Every AI car follows a lane path built over the road graph with pure pursuit;
// modes differ in how they choose the next road: wandering traffic, a scripted route, a chase,
// running away.

import { LANE, P, nodeX, nodeZ, neighbors, nearestNode, findPath, nodeI, nodeJ, N } from '../world/layout.js';
import { clamp, angleDiff, yawTo } from '../util.js';

const TURN_M = 8.5; // how far from an intersection's centre a lane path starts its turn
// Buses (len 10.5, steer 0.52) turn no tighter than a radius of about 12 m, but a lane path's left
// turn has a radius of M + LANE (11.25 m at 8.5): they swung wide into the far kerb and the wall of
// the grisfest farm at (3,1)->(2,1). Their paths start turning further out (left radius 13.75 m).
// Right turns (radius M - LANE) stay too tight for a bus, so mission routes give buses left turns
// only; a traffic guagua can still clip a corner turning right.
const TURN_M_BUS = 11;

function dirOf(a, b) {
  const dx = nodeX(b) - nodeX(a), dz = nodeZ(b) - nodeZ(a), l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
}

export class LanePath {
  constructor(nodes, opts = {}) {
    this.nodes = nodes.slice();
    this.pts = [];
    this.built = 0;
    this.idx = 0;
    this.wander = !!opts.wander;
    this.endPoint = opts.endPoint || null; // final [x,z] beyond the last node
    this.finished = false;
  }
  ensure(n = 14) {
    while (this.pts.length - this.idx < n) {
      if (this.wander && this.nodes.length - this.built < 3) {
        const last = this.nodes[this.nodes.length - 1], prev = this.nodes[this.nodes.length - 2];
        const opts = neighbors(last).filter((m) => m !== prev);
        // Prefer going straight a bit more often than turning.
        const [dx, dz] = prev !== undefined ? dirOf(prev, last) : [0, 0];
        const weighted = [];
        for (const m of opts) {
          const [ex, ez] = dirOf(last, m);
          weighted.push(m);
          if (ex * dx + ez * dz > 0.9) weighted.push(m, m);
        }
        this.nodes.push(weighted[(Math.random() * weighted.length) | 0]);
      }
      if (this.built >= this.nodes.length - 1) {
        if (this.endPoint && !this._endAdded) { this.pts.push({ x: this.endPoint[0], z: this.endPoint[1], end: true }); this._endAdded = true; }
        break;
      }
      this.buildEdge(this.built++);
    }
    // Drop points we've long passed.
    if (this.idx > 40) { this.pts.splice(0, 30); this.idx -= 30; }
  }
  buildEdge(k) {
    const M = this.turnM ?? TURN_M;
    const A = this.nodes[k], B = this.nodes[k + 1], C = this.nodes[k + 2];
    const [dx, dz] = dirOf(A, B), rx = -dz, rz = dx;
    const ax = nodeX(A), az = nodeZ(A), bx = nodeX(B), bz = nodeZ(B);
    const sx = ax + dx * M + rx * LANE, sz = az + dz * M + rz * LANE;
    const ex = bx - dx * M + rx * LANE, ez = bz - dz * M + rz * LANE;
    const len = Math.hypot(ex - sx, ez - sz), n = Math.max(1, Math.round(len / 6));
    for (let i = 0; i <= n; i++) this.pts.push({ x: sx + (ex - sx) * (i / n), z: sz + (ez - sz) * (i / n) });
    if (C === undefined) return;
    const [d2x, d2z] = dirOf(B, C), r2x = -d2z, r2z = d2x;
    const dot = dx * d2x + dz * d2z;
    if (dot > 0.9) return; // straight on: the next edge starts where this one ends
    if (dot < -0.9) {
      // U-turn: swing wide through the intersection.
      this.pts.push({ x: bx + dx * 3 + rx * LANE, z: bz + dz * 3 + rz * LANE, turn: true });
      this.pts.push({ x: bx + dx * 4, z: bz + dz * 4, turn: true });
      this.pts.push({ x: bx + dx * 3 - rx * LANE, z: bz + dz * 3 - rz * LANE, turn: true });
      return;
    }
    const cx = bx + (rx + r2x) * LANE, cz = bz + (rz + r2z) * LANE;
    const xx = bx + d2x * M + r2x * LANE, xz = bz + d2z * M + r2z * LANE;
    for (let i = 1; i < 6; i++) {
      const t = i / 6, u = 1 - t;
      this.pts.push({ x: u * u * ex + 2 * u * t * cx + t * t * xx, z: u * u * ez + 2 * u * t * cz + t * t * xz, turn: true });
    }
  }
}

// Node sequence for a car to start on: the intersection behind it and the one it's heading to.
export function startNodes(car) {
  const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
  const n0 = nearestNode(car.x, car.z);
  const tx = nodeX(n0) - car.x, tz = nodeZ(n0) - car.z;
  if (tx * fx + tz * fz > 4) {
    // Heading towards n0: the node behind is the neighbour in the opposite direction.
    let best = null, bd = -Infinity;
    for (const m of neighbors(n0)) { const [dx, dz] = dirOf(m, n0); const s = dx * fx + dz * fz; if (s > bd) { bd = s; best = m; } }
    return [best, n0];
  }
  let best = null, bd = -Infinity;
  for (const m of neighbors(n0)) { const [dx, dz] = dirOf(n0, m); const s = dx * fx + dz * fz; if (s > bd) { bd = s; best = m; } }
  return [n0, best];
}

export function pathTo(car, targetNode, endPoint = null) {
  const [a, b] = startNodes(car);
  const rest = findPath(b, targetNode);
  return new LanePath([a, ...rest], { endPoint });
}

// ---------------------------------------------------------------------------------------------

export class AIDriver {
  constructor(car, opts = {}) {
    this.car = car;
    this.mode = opts.mode || 'traffic';
    this.cruise = opts.cruise ?? 10 + Math.random() * 3;
    this.path = opts.path || null;
    this.stuckT = 0;
    this.reverseT = 0;
    this.blockedT = 0;
    this.ignoreT = 0;
    this.honkT = 0;
    this.target = opts.target || null;   // for chase: () => {x,z,vx,vz}
    this.replanT = 0;
    this.aggressive = !!opts.aggressive;
    this.avoid = opts.avoid ?? true;
    this.wobble = opts.wobble || 0;
    this.rubber = opts.rubber || null;    // () => speed multiplier
    this.onArrive = opts.onArrive || null;
    this.arrived = false;
    this.t = Math.random() * 10;
    if (!this.path && this.mode === 'traffic') this.setPath(new LanePath(startNodes(car), { wander: true }));
    else if (this.path) this.setPath(this.path);
  }

  // Take a new path and skip whatever part of it is already behind us.
  setPath(path) {
    const car = this.car, fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    if (car.spec.bus && path.built === 0) path.turnM ??= TURN_M_BUS;
    path.ensure();
    while (path.idx < path.pts.length - 1) {
      const q = path.pts[path.idx];
      if ((q.x - car.x) * fx + (q.z - car.z) * fz < 1) path.idx++;
      else break;
    }
    this.path = path;
    this.arrived = false;
  }

  update(dt, game) {
    const car = this.car;
    const c = car.ctrl;
    c.park = false;
    this.t += dt;
    if (car.dead) { c.throttle = 0; c.brake = 0; c.park = true; return; }
    const speed = car.speed;
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);

    // Chasers re-plan towards their quarry and go straight for it once close.
    let direct = null;
    if (this.mode === 'chase' && this.target) {
      const t = this.target();
      const d = Math.hypot(t.x - car.x, t.z - car.z);
      this.replanT -= dt;
      if (d < 38) direct = { x: t.x + (t.vx || 0) * 0.4, z: t.z + (t.vz || 0) * 0.4 };
      else if (this.replanT <= 0 || !this.path || this.path.idx >= this.path.pts.length - 2) {
        this.replanT = 2.5;
        this.setPath(pathTo(car, nearestNode(t.x, t.z), [t.x, t.z]));
      }
    }
    if (this.mode === 'flee' && (!this.path || this.path.idx >= this.path.pts.length - 3)) {
      const t = this.target ? this.target() : { x: 0, z: 0 };
      // Pick the intersection furthest from the pursuer among a few random ones.
      let best = null, bd = -1;
      for (let k = 0; k < 6; k++) {
        const n = (Math.random() * (N + 1) * (N + 1)) | 0;
        const d = Math.hypot(nodeX(n) - t.x, nodeZ(n) - t.z) + Math.hypot(nodeX(n) - car.x, nodeZ(n) - car.z) * 0.3;
        if (d > bd) { bd = d; best = n; }
      }
      this.setPath(pathTo(car, best));
    }

    let aimX, aimZ, targetSpeed = this.cruise;
    if (direct) {
      aimX = direct.x; aimZ = direct.z;
      targetSpeed = car.spec.maxSpeed * 0.95;
    } else if (this.path) {
      const p = this.path;
      p.ensure();
      // Advance past points we've reached or overshot.
      while (p.idx < p.pts.length - 1) {
        const q = p.pts[p.idx];
        const dx = q.x - car.x, dz = q.z - car.z;
        if (dx * dx + dz * dz < 16 || (dx * fx + dz * fz < 0 && dx * dx + dz * dz < 100)) p.idx++;
        else break;
      }
      const look = 4.5 + speed * 0.45;
      let k = p.idx, q = p.pts[k];
      while (k < p.pts.length - 1 && Math.hypot(p.pts[k].x - car.x, p.pts[k].z - car.z) < look) q = p.pts[++k];
      if (!q) { c.throttle = 0; c.brake = 1; return; }
      aimX = q.x; aimZ = q.z;
      // Slow for bends: compare heading with a point further along.
      const far = p.pts[Math.min(p.pts.length - 1, k + 3)];
      const bend = Math.abs(angleDiff(car.yaw, yawTo(far.x - car.x, far.z - car.z)));
      // A chaser (the Guardia) brakes less for bends: at 38 % of cruise round every corner two
      // Land Rovers never got within 40 m of a fleeing ×1.2 car (Phase 2 balance).
      targetSpeed = this.cruise * (1 - Math.min(this.mode === 'chase' ? 0.45 : 0.62, bend * 0.75));
      const last = p.pts[p.pts.length - 1];
      if (!this.path.wander && p.built >= p.nodes.length - 1) {
        const dl = Math.hypot(last.x - car.x, last.z - car.z);
        if (dl < 30) targetSpeed = Math.min(targetSpeed, Math.max(2, dl * 0.5));
        if (dl < 7 && !this.arrived) { this.arrived = true; this.onArrive?.(this); }
      }
    } else {
      c.throttle = 0; c.brake = 1;
      return;
    }
    if (this.rubber) targetSpeed *= this.rubber();
    // A closed course (a race, game.closure): stop about 11 m short of a closed junction's centre
    // (the nose clear of the crossing road), braking at ≈ 5 m/s², and park there: the coasting
    // throttle below crept a held car on at 1.2 m/s into the junction.
    let hold = false, held = false;
    if (this.mode === 'traffic' && game.closure) {
      const n = nearestNode(car.x, car.z), dx = nodeX(n) - car.x, dz = nodeZ(n) - car.z, d = Math.hypot(dx, dz);
      if (d > 7 && d < 32 && dx * fx + dz * fz > 0.6 * d && game.closure.closed(n)) {
        targetSpeed = Math.min(targetSpeed, Math.sqrt(10 * Math.max(0, d - 11)));
        hold = targetSpeed < 0.5;
        held = true;
      }
    }
    if (this.arrived && this.mode === 'route') targetSpeed = 0;

    // Look out for things in front.
    if (this.avoid && this.ignoreT <= 0) {
      const obstacle = game.obstacleAhead(car, 4 + speed * 0.9);
      if (obstacle) {
        targetSpeed = Math.min(targetSpeed, Math.max(0, (obstacle.dist - 5) * 0.7));
        this.blockedT += dt;
        if (obstacle.isPlayer && this.blockedT > 1.2 && this.honkT <= 0) { this.honkT = 3; game.onHonk(car); }
        // (Not in a queue at a closed junction: pushing on would shove the car ahead into it.)
        if (this.blockedT > 3.5 && !held) { this.ignoreT = 1.6; this.blockedT = 0; }
      } else this.blockedT = 0;
    } else this.ignoreT -= dt;
    this.honkT -= dt;

    // Steering: pure pursuit towards the aim point.
    const desired = yawTo(aimX - car.x, aimZ - car.z);
    const err = angleDiff(car.yaw, desired);
    let steer = clamp(-err * 2.4, -1, 1);
    if (this.wobble) steer += Math.sin(this.t * 1.7) * this.wobble;

    // Unstick: if we've been pushing without moving, back up with the wheel turned.
    if (this.reverseT > 0) {
      this.reverseT -= dt;
      c.throttle = 0; c.brake = 1; c.steer = -steer; c.handbrake = false;
      return;
    }
    const fwd = car.forwardSpeed;
    if (c.throttle > 0.4 && Math.abs(fwd) < 1.0 && targetSpeed > 3) {
      this.stuckT += dt;
      if (this.stuckT > 1.3) { this.stuckT = 0; this.reverseT = 1.1; }
    } else this.stuckT = Math.max(0, this.stuckT - dt);

    c.steer = steer;
    c.handbrake = false;
    if (fwd < targetSpeed - 0.5) { c.throttle = clamp((targetSpeed - fwd) * 0.45, 0.25, 1); c.brake = 0; }
    else if (fwd > targetSpeed + 1.2) { c.throttle = 0; c.brake = clamp((fwd - targetSpeed) * 0.18, 0.1, 1); }
    else { c.throttle = 0.15; c.brake = 0; }
    // Big error at speed: lift off.
    if (Math.abs(err) > 1.2 && fwd > 8) { c.throttle = 0; c.brake = 0.5; }
    if (direct && this.aggressive && Math.abs(err) < 0.3) { c.throttle = 1; c.brake = 0; }
    if (hold) { c.throttle = 0; c.brake = fwd > 0.8 ? 1 : 0; c.park = fwd <= 0.8; }
  }
}
