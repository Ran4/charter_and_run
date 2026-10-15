// Lapplisan Majsan – "Ursäkta, är det din bil?" (free roam; feature 20, DESIGN §10.17). Majsan is a
// traffic warden at home in Stockholm, and on the island she cannot leave it be:
//  (1) a car Stig leaves on the sidewalk brings her round the nearest corner; she writes a ticket for
//      its windscreen, asks him "Ursäkta, är det din bil?" ("Nej.", and it is true: he took it off the
//      street; the hire car's "Den är… hyrd."), and unless he drives off first, "Okej, grabbar!", a
//      fade, and the car is gone (a named one back in its bay at Flamenco);
//  (2) between missions Angerud's white hire car stands on the sidewalk outside Centro La Medina, and
//      the first time Stig walks past it the film's first meeting plays as a short scene, with the
//      GRÚA truck and Angerud's outburst; he mutters about honest motorists until the next mission;
//  (3) a car he leaves straight in one of Flamenco's painted bays gets her praise over the hedge, and
//      Siv's "Spänn av, Majsan. Du är ledig.".
// Only on the island with no mission running (`missions.state === 'idle'`); a mission start or the
// other level ends all of it at once (Majsan and Angerud home, Angerud's car, the truck and the
// tickets gone), so no mission, timer or calibration pool sees any of it. Config: LAPPLISA
// (content/island.js). Owned by Game as `lapp`: main.js calls `update` once a frame and asks
// `posed(key)` in syncAll; honk.free asks `owns(key)`, so the other free-roam modules leave her be.

import { LAPPLISA } from '../content/index.js';
import { THREE, GeoBuilder, toonMesh, signMesh, camera } from '../gfx.js';
import { Car } from '../actors/car.js';
import { randomPed } from '../actors/models.js';
import { sidewalkAt, lm, RHW, EDGE } from '../world/layout.js';
import { segmentBlocked } from '../world/collision.js';
import { flamencoBays } from '../world/blocks/hotels.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt, pta } from '../strings.js';
import { dist, yawTo, dampAngle, clamp } from '../util.js';

const MARK = 'lapplisa';
const _v = new THREE.Vector3();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// The yellow ticket under the wiper: a slip on the windscreen's foot on the driver's side
// (car-local, so it rides along if he drives off with it).
let slipGeo = null;
function slipMesh(car) {
  if (!slipGeo) {
    const g = new GeoBuilder();
    g.box(0xf7d84a, 0, 0, 0, 0.26, 0.17, 0.014);
    for (const [y, w] of [[0.035, 0.18], [0, 0.2], [-0.035, 0.12]]) g.box(0x1d1426, 0, y, 0.008, w, 0.012, 0.002);
    slipGeo = g.build();
  }
  const m = toonMesh(slipGeo, { outline: 0.008, cast: false });
  const s = car.spec, top = s.wheelR * 0.95 + s.bodyH;
  if (s.tall || !s.cabin) m.position.set(s.wid * 0.22, top - 0.3, s.len / 2 + 0.03);
  else {
    // On the glass (carBody: centre top + cabinH/2 at z1 − 0.15, leaning back 0.35 rad), low down.
    const ch = s.cabinH, z1 = s.cabin[1] * s.len, h = -0.22 * ch;
    m.position.set(s.wid * 0.22, top + ch / 2 + h, z1 - 0.15 - h * Math.tan(0.35) + 0.04);
    m.rotation.x = -0.35;
  }
  return m;
}

// The tow truck of the film scene: a Flakbil in orange with GRÚA on the bed's sides and a board on
// the cab roof (no firm's name, §1.5), a driver in it, a boom over the tailgate.
function buildTruck(cfg) {
  const car = new Car(cfg.type, { color: cfg.color });
  const s = car.spec, top = s.wheelR * 0.95 + s.bodyH, opts = { bg: '#f7c31b', fg: '#1d1426', border: '#1d1426', scale: 0.8 };
  for (const side of [1, -1]) {
    const m = signMesh(cfg.sign, 1.4, 0.34, opts);
    m.position.set(side * (s.wid / 2 + 0.012), top + 0.2, -s.len * 0.28);
    m.rotation.y = side * Math.PI / 2;
    car.tilt.add(m);
  }
  const roof = signMesh(cfg.sign, 1.3, 0.38, { ...opts, double: true });
  roof.position.set(0, top + s.cabinH + 0.36, s.cabin[0] * s.len + 0.3);
  car.tilt.add(roof);
  const g = new GeoBuilder();
  g.box(0x2a2a30, 0, top + 0.95, -s.len / 2 + 0.15, 0.12, 1.5, 0.12, 0, -0.5);
  g.box(0x2a2a30, 0, top + 1.55, -s.len / 2 - 0.25, 0.1, 0.1, 0.9);
  g.box(0x8a8f99, 0, top + 0.9, -s.len / 2 - 0.7, 0.03, 1.2, 0.03);
  car.tilt.add(toonMesh(g.build(), { outline: 0.02 }));
  car.locked = true;
  car.noEnter = true;
  return car;
}

export class Lapplisa {
  constructor(game, cfg = LAPPLISA) {
    this.g = game;
    this.cfg = cfg;
    this.out = {};          // key -> { spot, path, i, arrived, face, leaving, ... }: NPCs we hold (MARK)
    this.queue = [];        // [{ at, fn }] (g.time)
    this.prev = null;       // g.playerCar last frame
    this.inAt = null;       // where he got into it: { car, x, z, far (the furthest it has been from there) }
    this.left = null;       // the car he last left: { car, t, wait, praised }
    this.gag = null;        // the ticket: { car, phase, t, asked, name }
    this.tickets = new Set();   // cars with a slip on the windscreen
    this.aCar = null;       // Angerud's hire car (made once, in the world while `aIn`)
    this.aIn = false;
    this.aT = 0;            // the next look at whether it should be there (twice a second)
    this.truck = null;      // the GRÚA truck (film scene only)
    this.scene = false;     // the film scene is playing
    this.towing = false;    // the tow's fade is playing
    this.muttering = false; // Angerud's chatter is ours until the next mission
    this.praiseT = -Infinity;
    this.stuck = 0;         // for tests: walks that had to hop a waypoint
    this.last = null;       // for tests: the last event { kind, t, ... }
  }

  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle'; }
  // Nothing new starts in a dialogue, the nap or the morning cut, the pool fest's ring or a pursuit.
  get calm() { const g = this.g; return !g.inDialog && !g.day.busy && !g.fest.joined && !g.shame.pursuit; }
  later(secs, fn) { this.queue.push({ at: this.g.time + secs, fn }); }

  // ---------------------------------------------------------------------------------------------
  // The people

  // The waiting mission's giver or one of its extras (placeNpcs takes them to its place).
  needed(key) {
    const cur = this.g.missions.current;
    return !!cur && cur.level === 'island' && (cur.giver === key || !!cur.extra?.some((e) => e === key || (Array.isArray(e) && e[0] === key)));
  }
  // Free to take: shown, standing, nobody's (not placed or held by a mission, the judges, the fest,
  // Herr Storch or the Berra job), not needed by the waiting mission.
  free(key) {
    const g = this.g, n = g.npc(key);
    return !!n && !this.out[key] && n.state === 'normal' && n.root.visible && !n.car && !n.seatId && !n.busy && !this.needed(key) && g.honk.free(key);
  }
  owns(key) { return !!this.out[key] && this.g.npc(key)?.spot === MARK; }
  // main.js syncAll: ours neither waves, turns to him by the 10 m rule nor chatters.
  posed(key) { return this.owns(key); }
  homeOf(key) {
    const g = this.g;
    let home = g.levelDef.homes(g)[key] ?? null;
    if (key in g.homeOverrides) home = g.homeOverrides[key];
    return home && !home.seat ? home : null;
  }
  atHome(key) {
    const h = this.homeOf(key), n = this.g.npc(key);
    if (!h || !n) return false;
    const q = this.g.lmOffset(h[0], h[1], h[2]);
    return dist(n.x, n.z, q.x, q.z) < this.cfg.homeR;
  }
  claim(key) {
    const n = this.g.npc(key);
    this.out[key] = { spot: n.spot, path: null, i: 0, arrived: false, face: null, speed: this.cfg.walk, chkT: 0, chkX: n.x, chkZ: n.z, hops: 0 };
    n.busy = true;
    n.spot = MARK;
    n.steer = this.out[key].fn = () => this.steer(key);
    return n;
  }
  // No longer ours: home at once (`home`), or left where she stands for placeNpcs (its 50 m rule).
  release(key, home = false) {
    const g = this.g, n = g.npc(key), o = this.out[key];
    if (!o) return;
    delete this.out[key];
    if (n.steer === o.fn) delete n.steer;
    n.anim.ticket = n.anim.oath = n.anim.yell = false;
    if (n.spot !== MARK) return;   // someone else placed her meanwhile
    const h = home ? this.homeOf(key) : null;
    if (h) g.placeNpc(key, h[0], h[1], h[2], h[3]);
    n.busy = false;
    n.spot = h ? null : o.spot;
  }
  walkTo(key, path, speed = this.cfg.walk) {
    const o = this.out[key], n = this.g.npc(key);
    Object.assign(o, { path, i: 0, arrived: !path.length, speed, chkT: 0, chkX: n.x, chkZ: n.z, hops: 0 });
  }
  // main.js fixedStep reads `npc.steer(h)`: along the path at `speed`, easing in at its end.
  steer(key) {
    const o = this.out[key], n = this.g.npc(key);
    if (!o?.path || o.arrived || n.state !== 'normal') return null;
    let q = o.path[o.i], d = dist(n.x, n.z, q.x, q.z);
    const last = o.i === o.path.length - 1;
    if (d < (last ? 0.25 : 0.6)) {
      if (last) { o.arrived = true; return null; }
      q = o.path[++o.i]; d = dist(n.x, n.z, q.x, q.z);
    }
    const sp = o.i === o.path.length - 1 ? Math.min(o.speed, 0.5 + d * 1.6) : o.speed;
    return { x: ((q.x - n.x) / d) * sp, z: ((q.z - n.z) / d) * sp };
  }
  // A walk that makes no headway for `stuckSecs` (a bus shelter, a café table on the sidewalk) hops
  // to its next waypoint, where nobody sees it (or on the second try anyway); held NPCs face `face`.
  walkers(dt) {
    const g = this.g, c = this.cfg;
    for (const key of Object.keys(this.out)) {
      const o = this.out[key], n = g.npc(key);
      if (o.path && !o.arrived && n.state === 'normal') {
        o.chkT += dt;
        if (o.chkT >= c.stuckSecs) {
          if (dist(n.x, n.z, o.chkX, o.chkZ) < 0.5 && (!this.seen(n.x, n.z) || ++o.hops >= 2)) {
            const q = o.path[o.i];
            n.teleport(q.x, q.z, n.yaw);
            this.stuck++;
            o.hops = 0;
          }
          o.chkT = 0; o.chkX = n.x; o.chkZ = n.z;
        }
      }
      if (o.face && (o.arrived || !o.path) && n.state === 'normal') {
        const f = typeof o.face === 'function' ? o.face() : o.face;
        if (f) n.yaw = dampAngle(n.yaw, yawTo(f.x - n.x, f.z - n.z), 8, dt);
      }
      if (o.leaving && (o.arrived || g.time - o.leaving > c.leaveMax)) {
        // Home at once round the corner, out of sight; still in view she walks on along the same
        // sidewalk (10 m, twice at most), and after `leaveMax` s she is left for placeNpcs.
        const end = o.path?.[o.path.length - 1], prev = o.path?.[o.path.length - 2] || o.from;
        if (!this.seen(n.x, n.z)) this.release(key, true);
        else if (g.time - o.leaving > c.leaveMax) this.release(key, false);
        else if (end && prev && (o.more ?? 0) < 2) {
          const d = dist(prev.x, prev.z, end.x, end.z) || 1, q = { x: end.x + ((end.x - prev.x) / d) * 10, z: end.z + ((end.z - prev.z) / d) * 10 };
          o.more = (o.more ?? 0) + 1;
          if (sidewalkAt(q.x, q.z) && g.spotFree(q.x, q.z)) { const more = o.more; this.walkTo(key, [q]); o.from = end; o.more = more; }
        }
      }
    }
  }

  // Can the camera see (x, z) (a head at 1.5 m): within `seenR` m, inside the view and nothing tall
  // in between?
  seen(x, z) {
    if (dist(x, z, camera.position.x, camera.position.z) > this.cfg.seenR) return false;
    _v.set(x, 1.5, z).project(camera);
    if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) return false;
    return segmentBlocked(camera.position.x, camera.position.z, x, z, 1.5) < 0;
  }

  // ---------------------------------------------------------------------------------------------
  // The sidewalk

  // Wheels on the sidewalk (the four contact points, as car.js places them) and the sidewalk under
  // the first of them.
  wheelsOn(car) {
    const s = car.spec, wx = s.wid / 2 - 0.02, wz = s.len / 2 - s.wheelR - (s.bus ? 1.2 : 0.38);
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    let n = 0, sw = null;
    for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const q = sidewalkAt(car.x + fz * a * wx + fx * b * wz, car.z - fx * a * wx + fz * b * wz);
      if (q) { n++; sw ??= q; }
    }
    return { n, sw };
  }
  towable(car) {
    const g = this.g, s = car?.spec;
    return !!car && !car.dead && g.cars.includes(car) && !car.locked && !car.noEnter && !s.bus && !s.guardia
      && car !== this.aCar && car !== this.truck && !(s.pigs && (g.pigs.loose.length || g.pigs.carry));
  }
  // A point on the sidewalk's walking line (`ins` m in from the kerb): `a` along it, `o` m further
  // in (towards the block).
  line(sw, a, o = 0) {
    const w = sw.road + sw.side * (RHW + this.cfg.ins + o);
    return sw.along === 'x' ? { x: a, z: w } : { x: w, z: a };
  }
  // Her way off the sidewalk from (x, z): round its nearer corner (`cornerIn` m round it), or on the
  // outer ring `alongR` m along it away from Stig. [corner?, end], or null off the sidewalk.
  awayPath(x, z) {
    const c = this.cfg, sw = sidewalkAt(x, z);
    if (!sw) return null;
    const a0 = sw.along === 'x' ? x : z;
    if (sw.ring) {
      const lo = sw.lo + c.ins, hi = sw.hi - c.ins, end = a0 - lo < hi - a0 ? lo : hi;
      return [this.line(sw, end), this.line(sw, end, c.cornerIn)];
    }
    const p = this.g.player, dir = a0 >= (sw.along === 'x' ? p.x : p.z) ? 1 : -1;
    return [this.line(sw, clamp(a0 + dir * c.alongR, -EDGE + 2, EDGE - 2))];
  }
  // Where she comes from to `car` (sidewalk `sw`): round a corner of its block, or along it, the
  // nearest that nobody sees, free ground on the sidewalk, `minFromStig` m from him. { spawn, path }
  // ending beside the windscreen, or null (every way in is in view: try again later).
  comePlan(car, sw) {
    const g = this.g, c = this.cfg, p = g.player;
    const a0 = sw.along === 'x' ? car.x : car.z, lo = sw.lo + c.ins, hi = sw.hi - c.ins;
    const plans = [];
    if (sw.ring) for (const end of [lo, hi]) plans.push({ spawn: this.line(sw, end, c.cornerIn), via: [this.line(sw, end)], end, len: c.cornerIn + Math.abs(end - a0) });
    for (const d of [-1, 1]) {
      const end = clamp(a0 + d * c.alongR, lo + 1, hi - 1);
      if (Math.abs(end - a0) > 8) plans.push({ spawn: this.line(sw, end), via: [], end, len: Math.abs(end - a0) });
    }
    // Round a corner when one is near enough, the nearer first; along the sidewalk only otherwise.
    plans.sort((a, b) => (a.via.length && a.len <= c.cornerMax ? 0 : 1) - (b.via.length && b.len <= c.cornerMax ? 0 : 1) || a.len - b.len);
    for (const pl of plans) {
      const s = pl.spawn;
      if (pl.len > 50 || !sidewalkAt(s.x, s.z) || !g.spotFree(s.x, s.z) || dist(s.x, s.z, p.x, p.z) < c.minFromStig || this.seen(s.x, s.z)) continue;
      // Up to the car's near end on the line, then beside its windscreen.
      const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw), cs = sw.along === 'x' ? Math.abs(fx) : Math.abs(fz);
      const reach = cs * car.spec.len / 2 + (1 - cs) * car.spec.wid / 2 + 0.9;
      const near = this.line(sw, a0 + Math.sign(pl.end - a0 || 1) * reach);
      const st = this.standAt(car, near);
      return { spawn: s, path: [...pl.via, near, st.at], screen: st.screen };
    }
    return null;
  }
  // Beside the windscreen (either side, or before the nose): the free spot nearest `from`.
  standAt(car, from) {
    const g = this.g, s = car.spec, fx = Math.sin(car.yaw), fz = Math.cos(car.yaw), lx = fz, lz = -fx;
    const zf = s.tall || !s.cabin ? s.len / 2 - 0.6 : s.cabin[1] * s.len + 0.15, off = s.wid / 2 + 0.6;
    const screen = { x: car.x + fx * zf, z: car.z + fz * zf };
    const cands = [1, -1].map((k) => ({ x: screen.x + lx * off * k, z: screen.z + lz * off * k }));
    cands.push({ x: car.x + fx * (s.len / 2 + 0.7), z: car.z + fz * (s.len / 2 + 0.7) });
    const ok = cands.filter((q) => g.spotFree(q.x, q.z, 0.15)).sort((a, b) => dist(a.x, a.z, from.x, from.z) - dist(b.x, b.z, from.x, from.z));
    return { at: ok[0] || from, screen };
  }

  ticketOn(car) {
    if (car.lappSlip) return;
    car.lappSlip = slipMesh(car);
    car.tilt.add(car.lappSlip);
    this.tickets.add(car);
  }
  ticketOff(car) {
    if (car.lappSlip) car.tilt.remove(car.lappSlip);
    car.lappSlip = null;
    this.tickets.delete(car);
  }

  say(n, text, secs = this.cfg.secs) {
    this.g.say(n, text, secs);
    if (n !== this.g.player) n.chatT = 7 + Math.random() * 6;
  }

  // ---------------------------------------------------------------------------------------------
  // (1) The ticket and the tow

  // Every frame: the car he gets out of, and into.
  track() {
    const g = this.g, car = g.playerCar, i = this.inAt;
    if (car && i?.car === car) i.far = Math.max(i.far, dist(i.x, i.z, car.x, car.z));
    if (car !== this.prev) {
      if (car) {
        this.inAt = { car, x: car.x, z: car.z, far: 0 };
        if (this.left?.car === car) this.left = null;
        if (this.gag?.car === car) this.drivenOff();
      } else if (this.prev && g.cars.includes(this.prev)) {
        // Praise only for a car he has driven (not the hire car got into and out of in its bay).
        const moved = i?.car !== this.prev || i.far > 5;
        this.left = { car: this.prev, t: g.time, wait: 0, praised: !moved };
      }
      this.prev = car;
    }
  }

  // The car he left: praise in a bay; on the sidewalk the clock to Majsan.
  waiting(dt) {
    const g = this.g, c = this.cfg, l = this.left, p = g.player;
    if (!l || this.gag) return;
    const car = l.car;
    if (!this.towable(car)) { this.left = null; return; }
    if (!l.praised && car.speed < 0.3) { l.praised = true; this.praise(car); }
    const on = car.speed < c.still && this.wheelsOn(car).n >= c.wheels;
    if (!on) { l.wait = 0; return; }
    if (dist(p.x, p.z, car.x, car.z) > c.nearR || !this.calm) return;
    l.wait += dt;
    if (l.wait < c.delay) return;
    // Looked for twice a second: she leaves wherever she is unseen (never vanishing before his eyes,
    // nor from beside him at the pool) and comes where nobody sees her.
    if (g.time < (l.tryT ?? 0)) return;
    l.tryT = g.time + 0.5;
    const m = g.npc('majsan');
    if (!this.free('majsan') || this.seen(m.x, m.z) || dist(m.x, m.z, p.x, p.z) < 25) return;
    const plan = this.comePlan(car, this.wheelsOn(car).sw);
    if (!plan) return;
    this.claim('majsan');
    m.teleport(plan.spawn.x, plan.spawn.z, yawTo(plan.path[0].x - plan.spawn.x, plan.path[0].z - plan.spawn.z));
    m.vx = m.vz = 0;
    this.walkTo('majsan', plan.path);
    this.out.majsan.face = () => this.gag?.screen;
    this.gag = { car, phase: 'come', t: g.time, x: car.x, z: car.z, screen: plan.screen, asked: false, name: car.name || null };
    this.left = null;
    this.last = { kind: 'come', t: g.time, spawn: { x: +plan.spawn.x.toFixed(2), z: +plan.spawn.z.toFixed(2) }, path: plan.path.length, name: car.name || null };
  }

  gagStep(dt) {
    const g = this.g, c = this.cfg, G = this.gag, p = g.player;
    if (!G) return;
    const m = g.npc('majsan'), car = G.car;
    if (!this.owns('majsan') || !g.cars.includes(car) || car.dead || dist(car.x, car.z, G.x, G.z) > 3) { this.giveUp(); return; }
    // Knocked over, in a dialogue, a fade: the clock waits for her.
    if (m.state !== 'normal' || g.inDialog) { G.t += dt; return; }
    G.screen = this.standAt(car, m).screen;
    const since = g.time - G.t;
    if (G.phase === 'come') {
      if (this.out.majsan.arrived) { G.phase = 'write'; G.t = g.time; m.anim.ticket = true; }
    } else if (G.phase === 'write') {
      if (since < c.writeSecs) return;
      m.anim.ticket = false;
      this.ticketOn(car);
      this.last = { kind: 'ticket', t: g.time, name: G.name };
      G.phase = 'asked'; G.t = g.time;
      // He is there: she asks him, turned to him, and he answers truthfully.
      if (!g.playerCar && p.state === 'normal' && dist(p.x, p.z, m.x, m.z) < c.askR && !g.saying(p)) {
        G.asked = true;
        this.out.majsan.face = () => g.player;
        this.say(m, c.ask);
        const no = G.name === 'hyrbil' ? c.noHyrbil : c.no;
        this.later(c.askGap, () => { if (this.gag === G && !g.saying(p)) this.say(p, no, 1.8); });
        this.last.asked = true; this.last.no = no;
      }
    } else if (G.phase === 'asked') {
      if (since < c.towGap + (G.asked ? c.askGap : 0)) return;
      this.say(m, c.tow, 2);
      m.anim.oath = true;
      G.phase = 'tow'; G.t = g.time;
    } else if (G.phase === 'tow') {
      if (since < c.fadeAt) return;
      m.anim.oath = false;
      this.gag = null;
      this.tow(car).then(() => this.leave('majsan'));
    }
  }

  // He got back in before the tow: the car (and its slip) are his; she goes.
  drivenOff() {
    const G = this.gag;
    this.gag = null;
    if (this.last && G) this.last = { kind: 'drove', t: this.g.time, name: G.name, phase: G.phase };
    this.leave('majsan');
  }
  giveUp() { this.gag = null; this.leave('majsan'); }

  async tow(car) {
    const g = this.g, c = this.cfg, f = g.focus();
    if (!g.cars.includes(car) || car.dead || g.playerCar === car) return;
    const fade = dist(car.x, car.z, f.x, f.z) < c.seeR && !g.inDialog;
    if (fade) {
      this.towing = true;
      g.inDialog = true;
      hud.fade(true);
      await g.wait(c.fadeSecs);
    }
    if (g.cars.includes(car) && g.playerCar !== car) this.haul(car, fade);
    if (fade) {
      await g.wait(0.35);
      hud.fade(false);
      await g.wait(c.fadeSecs * 0.5);
      if (this.towing) g.inDialog = false;
      this.towing = false;
    }
  }
  // Off the street: a car from the traffic or a parked one goes; a named one (the hire car, the
  // grisbil) is back in its bay, as getInCar's `atHome` puts it.
  haul(car, fade) {
    const g = this.g;
    this.ticketOff(car);
    const home = !!(car.name && car.home);
    this.last = { kind: 'tow', t: g.time, name: car.name || null, home, fade };
    if (this.left?.car === car) this.left = null;
    if (home) { car.place(car.home.x, car.home.z, car.home.yaw); car.ai = null; car.ctrl.park = true; car.ctrl.throttle = 0; }
    else g.removeCar(car);
  }

  // Off round the nearer corner; home once out of sight there.
  leave(key) {
    const g = this.g, n = g.npc(key), o = this.out[key];
    if (!o) return;
    n.anim.ticket = n.anim.oath = false;
    o.face = null;
    const path = this.awayPath(n.x, n.z);
    o.leaving = g.time;
    o.from = { x: n.x, z: n.z };
    o.more = 0;
    if (path) this.walkTo(key, path); else { o.path = null; o.arrived = true; }
  }

  // ---------------------------------------------------------------------------------------------
  // (3) Flamenco's bays

  inBay(car) {
    for (const b of flamencoBays) {
      const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), dx = car.x - b.x, dz = car.z - b.z;
      if (Math.abs(dx * fx + dz * fz) > b.hd - 1 || Math.abs(dx * fz - dz * fx) > b.hw - 0.6) continue;
      const d = Math.abs(wrap(car.yaw - b.yaw));
      if (Math.min(d, Math.PI - d) <= this.cfg.bayYaw) return b;
    }
    return null;
  }
  praise(car) {
    const g = this.g, c = this.cfg, b = this.inBay(car);
    if (!b || g.time - this.praiseT < c.praiseEvery || !this.calm) return false;
    const m = g.npc('majsan');
    if (!this.free('majsan') || !this.atHome('majsan') || dist(m.x, m.z, car.x, car.z) > c.praiseR || g.saying(m)) return false;
    this.praiseT = g.time;
    this.say(m, c.praise, 2.8);
    this.later(c.replyGap, () => {
      const s = g.npc('siv');
      if (this.live && this.free('siv') && dist(s.x, s.z, m.x, m.z) < 8) { this.say(s, c.praiseReply, 2.6); if (this.last?.kind === 'praise') this.last.reply = true; }
    });
    let pay = 0;
    if (!g.unlocked.has(c.praiseKey)) {
      g.unlocked.add(c.praiseKey);
      pay = c.praisePay;
      g.addCoins(pay);
      audio.coin();
      hud.toast(fmt(c.paidToast, { n: pta(pay) }));
      g.save();
    }
    this.last = { kind: 'praise', t: g.time, bay: flamencoBays.indexOf(b), pay, reply: false };
    return true;
  }

  // ---------------------------------------------------------------------------------------------
  // (2) Angerud's hire car and the film's first meeting

  angerudHome() {
    const g = this.g, n = g.npc('angerud');
    return !!n && n.state === 'normal' && n.root.visible && !n.busy && this.atHome('angerud');
  }
  // In the world between missions while he is at Viking Bar and the scene is still to come; put
  // there or taken away only where nobody sees it.
  angerudCar() {
    const g = this.g, a = this.cfg.angerud;
    if (this.scene || g.time < this.aT) return;
    this.aT = g.time + 0.5;
    const want = !g.unlocked.has(a.onceKey) && this.angerudHome();
    const L = lm(a.lm);
    if (want && !this.aIn) {
      if (this.seen(L.x, L.z) || g.cars.some((o) => dist(o.x, o.z, L.x, L.z) < 4.5)) return;
      this.aCar ??= Object.assign(new Car(a.type, { color: a.color, name: 'angerudBil' }), { locked: true });
      this.aCar.lift = 0;
      this.aCar.place(L.x, L.z, L.yaw);
      this.aCar.ctrl.park = true;
      g.addCar(this.aCar);
      this.aIn = true;
    } else if (!want && this.aIn && !this.seen(this.aCar.x, this.aCar.z)) this.dropAngerudCar();
  }
  dropAngerudCar() {
    if (this.aIn) this.g.removeCar(this.aCar);
    this.aIn = false;
  }
  filmReady() {
    const g = this.g, p = g.player, car = this.aCar;
    return this.aIn && !this.scene && !this.gag && this.calm && !car.dead && !g.playerCar && !g.carrying && !(g.frozenT > 0)
      && p.state === 'normal' && p.onGround && dist(p.x, p.z, car.x, car.z) < this.cfg.angerud.r
      && this.free('majsan') && this.free('angerud') && this.angerudHome();
  }

  async film() {
    const g = this.g, c = this.cfg, a = c.angerud, f = c.film, p = g.player, car = this.aCar;
    const at = (dx, dz) => g.lmOffset(a.lm, dx, dz);
    const toward = (n, q) => yawTo(q.x - n.x, q.z - n.z);
    const put = (n, q, yaw) => { n.teleport(q.x, q.z, yaw); n.vx = n.vz = 0; };
    const cut = (from, fy, to, ty) => g.cam.cutTo({ x: from.x, y: fy, z: from.z }, { x: to.x, y: ty, z: to.z });
    const talk = async (lines) => { await g.dialog(lines); g.inDialog = true; };
    const black = async (on) => { hud.fade(on); await g.wait(c.fadeSecs); };
    this.scene = true;
    g.unlocked.add(a.onceKey);
    g.save();
    this.last = { kind: 'film', t: g.time, step: 'ask' };
    const M = this.claim('majsan'), A = this.claim('angerud');
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    hud.letterbox(true);
    // 1. Majsan writing at its nose, Stig stopped on the sidewalk beside her (the film's window).
    put(M, at(-0.9, 2.7), 0);
    M.yaw = toward(M, at(0, 1.2));
    M.anim.ticket = true;
    put(p, at(-0.4, 5.1), toward(p, M));
    cut(at(7.4, 3.9), 2.2, at(-0.7, 3.4), 1.2);
    await g.wait(1.0);
    this.ticketOn(car);
    M.anim.ticket = false;
    M.yaw = toward(M, p);
    await talk([['majsan', c.ask], ['stig', c.no], ['majsan', c.tow, { anim: { who: 'majsan', flag: 'oath', secs: 1.6 } }]]);
    // 2. In the black the truck has it on the hook out on the road; Angerud comes running out of the bar.
    this.last.step = 'tow';
    await black(true);
    M.anim.oath = false;
    const T = (this.truck ??= buildTruck(a.truck));
    if (!T.driverBust) g.addBust(randomPed(), T);
    const cq = at(4.3, -0.4), tq = at(4.3, 4.6);
    car.place(cq.x, cq.z, cq.yaw);
    car.lift = 0.16;
    T.place(tq.x, tq.z, tq.yaw);
    T.ctrl.park = true;
    if (!g.cars.includes(T)) g.addCar(T);
    // Majsan in the road at the gap between the two, Angerud from the bar to the car's tail (beside
    // the post box), Stig further along the sidewalk.
    const run = at(0.6, -3.2);
    put(M, at(6.1, 1.4), 0);
    put(p, at(-1.2, -6.2), 0);
    put(A, at(-8.0, 3.0), 0);
    A.yaw = toward(A, run);
    A.anim.oath = A.anim.yell = true;
    this.walkTo('angerud', [run], a.run);
    this.out.angerud.face = () => this.g.npc('majsan');
    this.out.majsan.face = () => this.g.npc('angerud');
    p.yaw = toward(p, run);
    cut(at(13.0, 1.5), 3.4, at(-0.5, 1.0), 1.2);
    await black(false);
    await talk(f.outburst.map((t) => ['angerud', t]));
    // 3. Gone, truck and car; Angerud back at his bar. Stig and Majsan on the sidewalk.
    this.last.step = 'talk';
    await black(true);
    A.anim.oath = A.anim.yell = false;
    this.release('angerud', true);
    g.removeCar(T);
    this.ticketOff(car);
    car.lift = 0;
    this.dropAngerudCar();
    put(M, at(-0.6, 1.0), 0);
    put(p, at(-0.6, 3.6), 0);
    M.yaw = toward(M, p);
    p.yaw = toward(p, M);
    this.out.majsan.face = () => this.g.player;
    g.cam.frame(M, p);
    g.cam.snapNext = true;
    await black(false);
    await talk([['stig', f.why], ['majsan', f.job]]);
    // Free roam again; she goes her way, he mutters.
    g.cam.release();
    g.cam.yaw = p.yaw;
    g.cam.snapNext = true;
    hud.letterbox(false);
    g.inDialog = false;
    this.scene = false;
    this.last.step = 'done';
    this.mutter();
    this.leave('majsan');
  }
  // Angerud's chatter is the outburst's until the next mission.
  mutter() {
    const g = this.g;
    if (!this.muttering) this.prevChatter = g.chatterOverrides.angerud;
    g.chatterOverrides.angerud = this.cfg.mutter;
    this.muttering = true;
  }

  // ---------------------------------------------------------------------------------------------

  update(dt) {
    const g = this.g;
    // Out of free roam the car he sits in is still followed, so the one he leaves after a mission
    // counts and one from before it does not.
    if (!this.live) { this.prev = g.playerCar; this.end(); return; }
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      q.fn();
    }
    this.track();
    this.angerudCar();
    if (this.filmReady()) { this.film(); return; }
    this.waiting(dt);
    this.gagStep(dt);
    this.walkers(dt);
  }

  // A mission (any state but idle) or the other level: all of it off at once. Majsan and Angerud
  // home, Angerud's car and the truck gone, the slips off, his chatter his own again.
  end() {
    const g = this.g;
    if (!this.held) return;
    this.queue.length = 0;
    this.gag = null;
    this.left = null;
    for (const key of Object.keys(this.out)) this.release(key, true);
    if (this.truck && g.cars.includes(this.truck)) g.removeCar(this.truck);
    if (this.aCar) this.aCar.lift = 0;
    this.dropAngerudCar();
    for (const car of [...this.tickets]) this.ticketOff(car);
    if (this.muttering) {
      if (this.prevChatter === undefined) delete g.chatterOverrides.angerud; else g.chatterOverrides.angerud = this.prevChatter;
      this.muttering = false;
    }
    if (this.towing) { hud.fade(false); this.towing = false; }
  }
  get held() {
    return this.queue.length || this.gag || this.left || this.aIn || this.tickets.size || this.muttering || this.towing || Object.keys(this.out).length
      || (this.truck && this.g.cars.includes(this.truck));
  }
}
