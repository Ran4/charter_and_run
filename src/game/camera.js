// Third-person camera: free mouse-look on foot, a chase cam in cars that swings in behind the
// direction of travel, pulled in when a wall gets between it and you. A level can set a profile
// (the cabin's steep dollhouse view: no pull-in, clamped pitch, eye z clamped inside the cabin).
//   profile = { pivotH, dist, pitchMin, pitchMax, pitch0, noPull, fov, cineSide, cineUp, clampZ?,
//               clampPitch? (max pitch while z-clamped; beyond it the camera looks further ahead) }

import { THREE } from '../gfx.js';
import { segmentBlocked, ceilingHit, ceilingOver, discPush } from '../world/collision.js';
import { clamp, damp, dampAngle } from '../util.js';

// The chase eye's nearest distance to the pivot when a solid pulls it in (Bigmouth's 1.6 m floor),
// and the steepest it climbs. A longer arm lifts the eye above awnings without a camera ceiling.
const ARM = 1.6, CAP = 1.25;
// The eye stays EYE_R off every solid's face. Under a low ceiling with less than SIDE of room behind
// him (a capped climb, or a capped eye 1.6–2.6 m out), it slides sideways to SIDE from the pivot, at
// most 0.6 m above it, instead of sitting just over his head or against his back. The slide eases
// out at SLIDE_K per second and in at SLIDE_IN (faster: the eye starts out close over his head); the
// other side has to offer SLIDE_HYST more room to swap, or more room than this side once this side
// has collapsed (0.3 m or less, or SLIDE_CUT less than the slide). A swap is a cut.
const EYE_R = 0.45, SIDE = 2.6, SLIDE_K = 6, SLIDE_IN = 12, SLIDE_HYST = 0.5, SLIDE_CUT = 0.5;
const _ch = {}, _dp = {};

// A dialogue eye d m from (x, z) along (nx, nz), at height y: that side if its sight line is clear,
// else the other side; if both are blocked, the side with more room, 0.45 m short of the solid (not
// less than 1.6 m out). Until Phase 3 the flip never checked the second side, and a two-shot of
// speakers 13 m apart put the camera inside a house on both sides (fataga).
function clearSide(x, z, nx, nz, d, y) {
  const seg = (s, step) => segmentBlocked(x, z, x + s * nx * d, z + s * nz * d, y, 'prop', step);
  if (seg(1) < 0) return { x: x + nx * d, z: z + nz * d };
  if (seg(-1) < 0) return { x: x - nx * d, z: z - nz * d };
  const h1 = seg(1, 0.25), h2 = seg(-1, 0.25);   // fine samples: the eye must end up outside
  const s = h2 > h1 ? -1 : 1, k = Math.max(1.6, Math.max(h1, h2) * d - 0.45);
  return { x: x + s * nx * k, z: z + s * nz * k };
}

export class CamRig {
  constructor(cam) {
    this.cam = cam;
    this.yaw = Math.PI;
    this.pitch = 0.3;
    this.dist = 6;
    this.manualT = 0;
    this.pos = new THREE.Vector3(0, 10, 10);
    this.look = new THREE.Vector3();
    this.shake = 0;
    this.fov = 62;
    this.cine = null; // { pos, look } for dialogue framing and cutaways
    this.snapNext = true;
    this.slide = 0;           // the side slide's lateral offset (m, + = his right; §14.5)
    this.lpx = this.lpy = this.lpz = null;   // last frame's pivot (the slide's cut-in test)
    this.profile = null;
    this.clampActive = false; // set each frame by main: flight level && cabin.inCabin(focus)
    this.openFloor = false;   // set each frame by main: the gate lounge, where dialogue is framed
                              // as Bigmouth's (from the side, eye level) despite the profile
  }

  setProfile(p) {
    this.profile = p || null;
    if (p) this.pitch = p.pitch0 ?? this.pitch;
    else this.pitch = clamp(this.pitch, -0.25, 1.15);
    this.snapNext = true;
  }

  update(dt, focus, look, cars = []) {
    const cam = this.cam;
    const pf = this.profile;
    if (this.cine) {
      if (this.snapNext) { this.pos.copy(this.cine.pos); this.look.copy(this.cine.look); this.snapNext = false; }
      this.pos.lerp(this.cine.pos, 1 - Math.exp(-4 * dt));
      this.look.lerp(this.cine.look, 1 - Math.exp(-5 * dt));
      cam.position.copy(this.pos);
      cam.lookAt(this.look);
      this.fov = damp(this.fov, pf && !this.cine.open ? pf.fov : 50, 4, dt);
      cam.fov = this.fov; cam.updateProjectionMatrix();
      return;
    }
    const pMin = pf && !focus.car ? pf.pitchMin : -0.25, pMax = pf && !focus.car ? pf.pitchMax : 1.15;
    if (look && (Math.abs(look.x) > 0.1 || Math.abs(look.y) > 0.1)) {
      // Clamp: some browsers deliver a huge jump on the first pointer-locked move.
      this.yaw -= clamp(look.x, -250, 250) * 0.0024;
      this.pitch = clamp(this.pitch + clamp(look.y, -250, 250) * 0.002, pMin, pMax);
      this.manualT = 1.8;
    }
    this.manualT -= dt;
    let pivotH, dist, lead = 0;
    if (focus.car) {
      const car = focus.car, sp = car.speed;
      const vyaw = sp > 3 ? Math.atan2(car.vx, car.vz) : car.yaw;
      const reversing = car.forwardSpeed < -2;
      const want = reversing ? car.yaw : vyaw;
      if (this.manualT <= 0) {
        this.yaw = dampAngle(this.yaw, want, sp > 1 ? 3.2 : 1.2, dt);
        this.pitch = damp(this.pitch, 0.22, 2, dt);
      }
      if (focus.lookBack) this.yaw = want + Math.PI;
      pivotH = car.height + 0.9;
      dist = 5.2 + car.spec.len * 0.75 + Math.min(4, sp * 0.1);
      lead = Math.min(3, sp * 0.12);
      this.fov = damp(this.fov, 62 + Math.min(14, sp * 0.4), 3, dt);
    } else {
      pivotH = pf ? pf.pivotH : 1.55;
      dist = pf ? pf.dist : 6.0;
      this.pitch = clamp(this.pitch, pMin, pMax);
      this.fov = damp(this.fov, pf ? pf.fov : 62, 3, dt);
      // Ease in behind the player when they run and leave the mouse alone.
      if (this.manualT <= 0 && focus.speed > 3 && focus.autoTurn) this.yaw = dampAngle(this.yaw, focus.yaw, 0.9, dt);
    }
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const px = focus.x, py = focus.y + pivotH, pz = focus.z;
    // Last frame's pivot: the side slide measures the eye's jump relative to him (§14.5).
    const lpx = this.lpx ?? px, lpy = this.lpy ?? py, lpz = this.lpz ?? pz;
    this.lpx = px; this.lpy = py; this.lpz = pz;
    let pitch = this.pitch;
    let d = dist;
    let hit = -1;
    let h = null, ahead = 0;
    // Pull in if a solid is in the way (not with a noPull profile: its eye is above every wall).
    // The sight line is sampled every 0.25 m (0.8 m missed palm trunks and poles) and the eye stops
    // 0.45 m (level) short of the first sample inside a solid, but not closer than ARM: with less
    // room (his back to a wall) the eye climbs on the ARM instead; past CAP it moves in over his
    // head at that angle and looks further ahead (as the cabin clamp below). Never inside the wall:
    // the old 1.6 m floor put it there (a one-colour frame at 2–9 % of the spots in a block).
    const pull = !(pf && pf.noPull && !focus.car);
    if (pull) {
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const tx = px - fx * cp * d, tz = pz - fz * cp * d, ty = py + sp * d;
      hit = segmentBlocked(px, pz, tx, tz, Math.min(py, ty) + 0.3, 'prop', 0.25);
      if (hit >= 0) {
        const room = hit * cp * d - 0.45;   // level room behind the pivot
        if (room >= cp * ARM) d = room / cp;
        else {
          d = ARM;
          pitch = Math.acos(clamp(room / d, 0, 1));
          if (pitch > CAP) { pitch = CAP; h = Math.max(0.05, room); ahead = d * Math.cos(pitch) - h; }
        }
      }
    }
    h ??= Math.cos(pitch) * d;
    // Cabin: keep the eye's z inside the cabin; steepen the pitch to keep the distance. Past
    // `clampPitch` the view would turn into a straight-down shot (and lookAt degenerates at 90°),
    // so the eye stays at the clamp and the camera looks further ahead instead: the sight line
    // keeps that angle and the player slides down the frame, with more of the cabin ahead in view.
    if (pf && pf.clampZ && this.clampActive && !focus.car && Math.abs(fz) > 1e-3) {
      const ez = pz - fz * h;
      const cz = clamp(ez, pf.clampZ[0], pf.clampZ[1]);
      if (cz !== ez) {
        h = Math.max(0, (pz - cz) / fz);
        pitch = Math.acos(clamp(h / d, 0, 1));
        const cap = pf.clampPitch ?? 1.5;
        if (pitch > cap) { ahead = d * Math.cos(cap) - h; pitch = cap; }
      }
    }
    lead += ahead;
    const want = new THREE.Vector3(px - fx * h, Math.max(focus.y + 0.6, py + Math.sin(pitch) * d), pz - fz * h);
    let snap = hit >= 0;
    // Camera ceilings (pergolas, canopies, balcony rows; §14.7): the eye never enters one, and never
    // looks at the player through one. On foot it stays below the underside when the sight line from
    // the pivot would pass through it (in among the slats or the slab, or above them looking down at
    // the roof); a ceiling the line passes under (the eye out in the open, the player just under the
    // edge) leaves the eye where it is. A car's eye stops 0.45 m short of it instead, as at a wall,
    // unless that leaves no room behind the car or the car is under it.
    let capped = false;
    if (focus.car || !pf) {
      for (let pass = 0; pass < 2 && ceilingHit(px, py, pz, want.x, want.y, want.z, focus.y + 0.5, _ch); pass++) {
        const c = _ch.first, k = _ch.t * h - EYE_R;
        if (focus.car && pass === 0 && k > focus.car.spec.len * 0.5 + 2 && !(px > c.minX && px < c.maxX && pz > c.minZ && pz < c.maxZ)) {
          want.set(px - fx * k, py + (want.y - py) * k / h, pz - fz * k);
          snap = true;
          break;
        }
        const y = Math.max(focus.y + 0.6, _ch.low.under - 0.3);
        if (y >= want.y) break;
        want.y = y;
        capped = true;
      }
      // His back to a wall under a low ceiling: the climb is capped there, and the eye would sit just
      // over his head (a close top-down view of his shoulders) or, a little further out, against his
      // back. Slide it along the wall instead, to look past his shoulder from the side with more room
      // (the side it is on, unless the other has SLIDE_HYST more or this one collapses). The slide is
      // a lateral offset that eases towards its target within one side (SIDE from the pivot when he
      // is backed up, nothing from SIDE out or away from the ceiling), swaps sides in a cut and is cut
      // to the room each side has this frame: until r3 it was all or nothing, and walking out from
      // under a porch the eye jumped 2.2–2.7 m in one frame.
      if (!focus.car && !pf) {
        let eh = Math.hypot(want.x - px, want.z - pz);
        const ys = Math.min(want.y, py + 0.6), ey = ys - py, d0 = (want.y - py) ** 2 + eh * eh;
        let near = false;
        if (d0 < SIDE * SIDE) {
          const c = capped ? null : ceilingOver(want.x, want.z, want.y, 0.3);
          near = capped || (!!c && c.under - want.y < 0.5);
        }
        if (this.snapNext) this.slide = 0;
        if (near || this.slide !== 0) {
          const y = Math.min(py, ys) + 0.3, reach = SIDE + EYE_R;
          const roomOn = (x, z, s) => {
            const t = segmentBlocked(x, z, x - fz * s * reach, z + fx * s * reach, y, 'prop', 0.25);
            return t < 0 ? SIDE : Math.max(0, t * reach - EYE_R);
          };
          let right = roomOn(want.x, want.z, 1), left = roomOn(want.x, want.z, -1);
          let target = 0, wedged = false;
          if (near && eh > 0.1) {
            // Wedged: little room behind him and little to either side of the eye (his back in a
            // corner, as at the back of the fold between its wall and a crag's end), so the slid eye
            // would stay nearer than ARM. Slide from beside him instead when that takes it further,
            // straight to the side with more room.
            const L = Math.sqrt(Math.max(0, SIDE * SIDE - ey * ey - eh * eh)), best = Math.min(L, Math.max(right, left));
            if (eh * eh + best * best < ARM * ARM) {
              const L0 = Math.sqrt(Math.max(0, SIDE * SIDE - ey * ey));
              const r0 = Math.min(L0, roomOn(px, pz, 1)), l0 = Math.min(L0, roomOn(px, pz, -1)), b0 = Math.max(r0, l0);
              if (b0 > 0.3 && b0 * b0 > eh * eh + best * best) {
                want.x = px; want.z = pz; eh = 0; right = r0; left = l0; wedged = true;
                target = r0 >= l0 ? r0 : -l0;
              }
            }
          }
          if (near && !wedged) {
            const L = Math.sqrt(Math.max(0, SIDE * SIDE - ey * ey - eh * eh));
            const r = Math.min(L, right), l = Math.min(L, left);
            let s;
            if (this.slide !== 0) {
              // Keep the side unless the other has SLIDE_HYST more room, or more than this side once
              // this side has collapsed: a post or the turn into the wall cut it to 0.3 m or less, or
              // by more than SLIDE_CUT this frame (the clamp below would drop the eye towards his head).
              s = Math.sign(this.slide);
              const keep = s > 0 ? r : l, other = s > 0 ? l : r, cut = Math.abs(this.slide) - (s > 0 ? right : left);
              if (other - keep > SLIDE_HYST || (other > keep && (keep <= 0.3 || cut > SLIDE_CUT))) s = -s;
            } else if (Math.abs(r - l) > 0.05) s = r > l ? 1 : -1;
            else s = (this.pos.x - px) * -fz + (this.pos.z - pz) * fx < 0 ? -1 : 1;
            const room = s > 0 ? r : l;
            if (room > 0.3) target = s * room;
          }
          if (wedged || target * this.slide < 0) {
            // A swap of sides is a cut, eye and all: eased, the offset passed through 0 and the eye
            // through his head (r3: 1212 frames under 1 m in one camera turn at 456 spots, from 1).
            this.slide = target;
            snap = true;
          } else {
            // A slide that starts as the eye is cut in by more than 1 m relative to him (a pole pulls
            // it in as the camera turns, or a canopy starts to cap it and drops it) starts at its
            // target: the eye jumps anyway, and eased in, it sat over his head for a frame or two.
            const jx = this.pos.x - lpx - (want.x - px), jz = this.pos.z - lpz - (want.z - pz);
            const cutIn = this.slide === 0 && snap && jx * jx + Math.max(0, this.pos.y - lpy - (want.y - py)) ** 2 + jz * jz > 1;
            const grow = Math.abs(target) > Math.abs(this.slide);
            this.slide = this.snapNext || cutIn ? target : damp(this.slide, target, grow ? SLIDE_IN : SLIDE_K, dt);
          }
          this.slide = clamp(this.slide, -left, right);
          if (Math.abs(this.slide) < 0.01 && target === 0) this.slide = 0;
          const sl = this.slide;
          want.x += -fz * sl; want.z += fx * sl;
          // Down to `ys` only as far as the slide keeps the eye no nearer the pivot than it was.
          want.y = Math.min(want.y, Math.max(ys, py + Math.sqrt(Math.max(0, d0 - sl * sl - eh * eh))));
        }
      }
    }
    if (focus.car || pf) this.slide = 0;
    // Keep the eye EYE_R off every solid's face, not only along the sight line: met at a slant, the
    // 0.45 m stand-off along the line left it 0.05–0.3 m from the wall, inside the façade relief
    // (piers, bands, window boxes). Push it out; if a solid then stands between it and the pivot (a
    // corner), pull it in along the sight line until the disc is clear.
    if (pull && discPush(want.x, want.z, EYE_R, want.y - 0.3, _dp)) {
      snap = true;
      const nx = want.x + _dp.x, nz = want.z + _dp.z, y = Math.min(py, want.y) + 0.3;
      if (segmentBlocked(px, pz, nx, nz, y, 'prop', 0.25) < 0) { want.x = nx; want.z = nz; }
      else {
        const ex = want.x - px, ez = want.z - pz, l = Math.hypot(ex, ez);
        let k = l;
        while (k > 0.1 && discPush(px + ex * k / l, pz + ez * k / l, EYE_R, want.y - 0.3, _dp)) k -= 0.1;
        k = Math.max(0.05, k) / (l || 1);
        want.x = px + ex * k; want.z = pz + ez * k;
      }
    }
    if (this.snapNext) { this.pos.copy(want); this.snapNext = false; }
    else {
      const k = focus.car ? 10 : 14;
      this.pos.x = damp(this.pos.x, want.x, k, dt);
      this.pos.y = damp(this.pos.y, want.y, k * 0.7, dt);
      this.pos.z = damp(this.pos.z, want.z, k, dt);
      // Never lag so far behind that a wall slips between us. Only down, in height: a ceiling that
      // stops capping (he walks out from under it, his back to a wall) lets the eye rise smoothly.
      if (snap) { this.pos.x = want.x; this.pos.z = want.z; if (want.y < this.pos.y) this.pos.y = want.y; }
    }
    this.look.set(px + fx * lead, py - 0.2 + (focus.car ? 0 : 0.1), pz + fz * lead);
    // Never sit inside another car: ride up over its roof instead.
    for (const c of cars) {
      if (c === focus.car || Math.abs(c.x - this.pos.x) > c.radius + 1 || Math.abs(c.z - this.pos.z) > c.radius + 1) continue;
      const dx = this.pos.x - c.x, dz = this.pos.z - c.z, cfx = Math.sin(c.yaw), cfz = Math.cos(c.yaw);
      if (Math.abs(dx * cfx + dz * cfz) < c.spec.len / 2 + 0.6 && Math.abs(dx * -cfz + dz * cfx) < c.spec.wid / 2 + 0.6) {
        this.pos.y = Math.max(this.pos.y, c.y + c.height + 0.7);
      }
    }
    cam.position.copy(this.pos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.35;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
      cam.position.z += (Math.random() - 0.5) * s;
    }
    cam.lookAt(this.look);
    cam.fov = this.fov;
    cam.updateProjectionMatrix();
  }

  // Frame two people talking. Bigmouth: from the side, at least 4.5 m out. With a profile: from
  // above and a little to the side (pos = mid + perp * min(d, cineSide) + up * cineUp), except on
  // an open floor (`openFloor`: the gate lounge), where the dollhouse shot showed hat tops and the
  // hanging signs cut across the speakers; there the Bigmouth framing applies (`cine.open`).
  frame(a, b) {
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
    // Two people on (nearly) one spot have no sides: frame from in front of the first. (The side
    // vector was zero there, and the side shot put the eye in their heads.)
    const apart = l > 0.3;
    let nx = apart ? -dz / l : Math.sin(a.yaw || 0), nz = apart ? dx / l : Math.cos(a.yaw || 0);
    const top = Math.max(a.height || 1.6, b.height || 1.6);
    const headY = Math.max(a.y, b.y) + top * 0.72;
    // Prefer the side the camera is already on.
    if (apart && (this.pos.x - mx) * nx + (this.pos.z - mz) * nz < 0) { nx = -nx; nz = -nz; }
    const pf = this.profile;
    if (pf && !this.openFloor) {
      // Dollhouse framing: from the side both are facing when they face the same way (seat-mates
      // in a row), so the shot sees faces, not seat backs and the tops of heads. When that facing
      // runs along the line between them (within 35°: one behind the other, as in the jet-bridge
      // queue), a side shot sees neither face: frame from in front along it, as for one spot.
      const sx = Math.sin(a.yaw || 0) + Math.sin(b.yaw || 0), sz = Math.cos(a.yaw || 0) + Math.cos(b.yaw || 0);
      const sl = Math.hypot(sx, sz);
      if (sl > 1.2) {
        if (apart && Math.abs(sx * dx + sz * dz) > 0.82 * sl * l) { nx = sx / sl; nz = sz / sl; }
        else if (sx * nx + sz * nz < 0) { nx = -nx; nz = -nz; }
      }
      const d = Math.min(Math.max(4.5, l * 1.6 + 2.5), pf.cineSide);
      this.cine = { pos: new THREE.Vector3(mx + nx * d, headY + pf.cineUp, mz + nz * d), look: new THREE.Vector3(mx, headY, mz) };
      return;
    }
    const p = clearSide(mx, mz, nx, nz, Math.max(4.5, l * 1.6 + 2.5), 1.5);
    this.cine = { pos: new THREE.Vector3(p.x, Math.max(a.y, b.y) + top * 0.75 + 0.6, p.z), look: new THREE.Vector3(mx, headY, mz), open: !!pf };
  }

  // Frame one character, from in front of them (both modes).
  frameOne(a) {
    const fx = Math.sin(a.yaw || 0), fz = Math.cos(a.yaw || 0);
    const top = a.height || 1.8;
    const headY = a.y + top * 0.8;
    const pf = this.profile;
    if (pf && !this.openFloor) {
      this.cine = { pos: new THREE.Vector3(a.x + fx * pf.cineSide, headY + pf.cineUp, a.z + fz * pf.cineSide), look: new THREE.Vector3(a.x, headY, a.z) };
      return;
    }
    const p = clearSide(a.x, a.z, fx, fz, 3.6, a.y + 1.4);
    this.cine = { pos: new THREE.Vector3(p.x, headY + 0.6, p.z), look: new THREE.Vector3(a.x, headY - 0.1, a.z), open: !!pf };
  }

  // A fixed cutaway: camera at pos looking at look ({x, y, z} each). release() returns.
  cutTo(pos, look) {
    this.cine = { pos: new THREE.Vector3(pos.x, pos.y, pos.z), look: new THREE.Vector3(look.x, look.y, look.z) };
    this.snapNext = true;
  }

  release() {
    if (!this.cine) return;
    // Resume behind wherever the cinematic camera ended up looking.
    this.cine = null;
  }
}
