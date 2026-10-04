// Pedestrians stroll the sidewalk loops around blocks, sometimes cross the street, dive out of
// the way of speeding cars, and complain loudly when you knock them over.

import { Character } from './character.js';
import { randomPed } from './models.js';
import { pedLoops } from '../world/town.js';
import { N } from '../world/layout.js';
import { mulberry32, pick, yawTo } from '../util.js';

const r = mulberry32(99);

export class Ped {
  constructor(scene, loop) {
    this.char = new Character(randomPed(r));
    this.loop = loop;
    const k0 = (r() * 4) | 0;
    this.dir = r() < 0.5 ? 1 : -1;
    const t = r();
    const [ax, az] = loop.pts[k0], [bx, bz] = loop.pts[(k0 + 1) % 4];
    this.char.teleport(ax + (bx - ax) * t, az + (bz - az) * t);
    this.walk = 1.2 + r() * 0.7;
    this.k = this.dir > 0 ? (k0 + 1) % 4 : k0;   // index of the corner we're walking to
    this.target = loop.pts[this.k];
    this.panicT = 0;
    this.idleT = 0;
    this.crossing = false;
    scene.add(this.char.root);
  }

  nextTarget() {
    this.k = (this.k + this.dir + 4) % 4;
    this.target = this.loop.pts[this.k];
  }

  // At a corner, maybe hop across to the neighbouring block's matching corner.
  maybeCross() {
    if (r() > 0.25) return false;
    const L = this.loop;
    const [x, z] = this.target;
    const cx = x < (L.pts[0][0] + L.pts[1][0]) / 2 ? -1 : 1, cz = z < (L.pts[0][1] + L.pts[2][1]) / 2 ? -1 : 1;
    const horizontal = r() < 0.5;
    const ni = L.i + (horizontal ? cx : 0), nj = L.j + (horizontal ? 0 : cz);
    if (ni < 0 || nj < 0 || ni >= N || nj >= N) return false;
    const nl = pedLoops.find((p) => p.i === ni && p.j === nj);
    if (!nl) return false;
    // Matching corner on the other side.
    let best = 0, bd = Infinity;
    nl.pts.forEach(([px, pz], idx) => { const d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = idx; } });
    this.loop = nl;
    this.k = best;
    this.target = nl.pts[best];
    this.crossing = true;
    return true;
  }

  update(dt, game) {
    const c = this.char;
    if (c.state !== 'normal') { c.wishX = c.wishZ = 0; return; }
    if (this.idleT > 0) { this.idleT -= dt; c.wishX = c.wishZ = 0; return; }
    // Dive away from a fast car heading at us.
    if (this.panicT <= 0) {
      const threat = game.carThreat(c.x, c.z);
      if (threat) {
        this.panicT = 1.4;
        c.jump(6.5);
        c.wishX = threat.dx * 6; c.wishZ = threat.dz * 6;
        c.vx = c.wishX; c.vz = c.wishZ;
        if (r() < 0.5) game.say(c, pick(['Whoa!', 'Watch it!', 'AAAH!', 'Slow down!', 'Jeez!']), 1.2);
        return;
      }
    } else {
      this.panicT -= dt;
      if (this.panicT > 0.6) return;
    }
    const [tx, tz] = this.target;
    const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
    if (d < 0.8) {
      if (this.crossing) this.crossing = false;
      else if (!this.maybeCross()) this.nextTarget();
      if (r() < 0.08) this.idleT = 2 + r() * 3;
      return;
    }
    const sp = this.crossing ? this.walk * 1.6 : this.walk;
    c.wishX = (dx / d) * sp; c.wishZ = (dz / d) * sp;
    c.yaw = yawTo(dx, dz);
  }
}

export function spawnPeds(scene, n) {
  const out = [];
  const loops = pedLoops.slice();
  for (let k = 0; k < n; k++) {
    const loop = loops[(r() * loops.length) | 0];
    out.push(new Ped(scene, loop));
  }
  return out;
}
