// Stage kinds, part 1 (DESIGN §9.2): getInCar goto pickup dropoff follow rabbits race destroy
// grab scene, plus the helpers every kind shares (common options, positions, radio and overhear
// sequencers, rider busts). Frozen after Phase 0 (owner none): Phase-1 agents change behaviour only
// through options and report kind bugs under CONTRACT CHANGES.
//
// Every factory copies the common options (COMMON) from its options onto the stage it returns,
// and keeps the options themselves as `stage.o` (tests and the `missions` data checks read them).
// Stage timers run on unscaled seconds (the runner passes unscaled dt); kinds that follow the cabin
// clock (timeline, mantra, fearRate) scale by g.timeScale themselves.

import { lm, nodeX, nodeZ, LANE, findPath, nearestNode, laneSpot, nodeRef, N } from '../../../world/layout.js';
import { AIDriver, LanePath, startNodes } from '../../../actors/drivers.js';
import { Rabbit, Collectible } from '../../../actors/pickups.js';
import { Character } from '../../../actors/character.js';
import { METERS } from '../../../meters.js';
import { audio } from '../../../audio.js';
import { hud } from '../../hud.js';
import { fx } from '../../fx.js';
import { S, fmt } from '../../../strings.js';
import { dist, yawTo } from '../../../util.js';

// ---------------------------------------------------------------------------------------------
// Shared helpers

export const COMMON = ['checkpoint', 'panicFails', 'lockMeter', 'shame', 'oleBarks', 'timedCues', 'startCue', 'doneCue', 'retryAt'];
export function common(o, stage) {
  for (const k of COMMON) if (o[k] !== undefined) stage[k] = o[k];
  stage.o = o;
  return stage;
}

// A position: landmark name | { x, z, yaw? } | lane spot { lane: [[i1, j1], [i2, j2]], t }.
export const at = (p) => (typeof p === 'string' ? lm(p) : p && p.lane ? laneSpot(p.lane[0], p.lane[1], p.t ?? 12) : p);

// Seconds a scripted bubble / overheard line stays up (halved in test mode).
export const lineSecs = (g, text) => Math.max(1.8, 1 + String(text).length * 0.055) * (g.testMode ? 0.5 : 1);

// Hide an NPC for the rest of the mission (cleanupMission shows it again, then placeNpcs(true)).
export function hideForMission(g, key) {
  const n = g.npcs[key];
  if (!n) return;
  g.hideNpc(key);
  n.hiddenBy = 'mission';
}

// Decorative rider busts on a car (DESIGN §14.3 addRider). Slots: the bed of a pickup, the windows
// of a bus, else the rear seat. Every rider is listed in m.data.riders and removed at mission end.
export function addRiders(g, m, car, keys, { hide = false } = {}) {
  const out = [];
  for (const key of keys || []) {
    const slot = car.spec.bed ? 'bed' : car.spec.bus ? `window${car.riders.length + 1}` : 'rear';
    const r = { key, car, obj: g.addRider(key, car, slot) };
    out.push(r);
    (m.data.riders ||= []).push(r);
    if (hide) hideForMission(g, key);
  }
  if (!m.data.ridersCleanup) {
    m.data.ridersCleanup = true;
    m.items.push(() => { for (const r of (m.data.riders || []).slice()) removeRider(m, r); });
  }
  return out;
}
export function removeRider(m, r) {
  r.car.tilt.remove(r.obj);
  r.car.riders = (r.car.riders || []).filter((o) => o !== r.obj);
  if (m.data.riders) m.data.riders = m.data.riders.filter((x) => x !== r);
}

// Seat a character in a car for the mission (busy, so idle placement leaves them alone).
function seatIn(g, key, car, side) {
  const n = g.npc(key);
  if (!n || !car) return null;
  if (n.car === car) return n;
  g.unseatAny(n);
  n.state = 'normal';
  n.root.visible = true;
  g.seat(n, car, side);
  n.busy = true;
  return n;
}

// A left-behind passenger hops back in when the player's car stops beside them (< 10 m, < 5 m/s).
function reboard(g, n) {
  const c = g.playerCar;
  if (!c || !n || n.car === c) return;
  const px = n.car ? n.car.x : n.x, pz = n.car ? n.car.z : n.z;
  if (dist(c.x, c.z, px, pz) < 10 && c.speed < 5 && n.state !== 'flung' && n.state !== 'down') {
    g.seat(n, c, -1);
    n.busy = true;
    audio.door();
    g.say(n, S.neverLeave, 1.6);
  }
}

// Radio lines fired in order: [who, text, cue?] (cue.gap = seconds after the previous line; any
// other cue field is applied with the line) or a plain string spoken by `who`.
export class RadioSeq {
  constructor(lines, { first = 6, gap = [9, 13], who = null } = {}) {
    this.lines = lines || [];
    this.i = 0;
    this.who = who;
    this.gap = gap;
    this.t = this.delay(0, first);
  }
  delay(i, dflt) {
    const l = this.lines[i];
    const c = Array.isArray(l) ? l[2] : null;
    if (c && c.gap != null) return c.gap;
    return dflt ?? this.gap[0] + Math.random() * (this.gap[1] - this.gap[0]);
  }
  get done() { return this.i >= this.lines.length; }
  tick(g, dt) {
    if (this.done) return;
    this.t -= dt;
    if (this.t > 0) return;
    const l = this.lines[this.i++];
    const [who, text, cue] = Array.isArray(l) ? l : [this.who, l, null];
    if (cue) { const { gap, ...rest } = cue; if (Object.keys(rest).length) g.cue(rest); }
    g.radio(who, text);
    if (!this.done) this.t = this.delay(this.i);
  }
}

// An overheard exchange (goto.overhear): when the player comes within `r` of `at`, the lines play
// once as world bubbles on the speakers (or radio toasts with `radio: true`). A speaker who is
// absent, hidden or far from `at` speaks from an anchor built on the landmark.
export class Overhear {
  constructor(spec) {
    this.s = spec;
    this.l = at(spec.at);
    this.state = 'wait';   // wait | playing | done
    this.i = 0;
    this.t = 0;
  }
  get playing() { return this.state === 'playing'; }
  anchor(g, who) {
    const n = g.npc(who), l = this.l;
    if (n && n.state !== 'hidden' && dist(n.x, n.z, l.x, l.z) < Math.max(this.s.r, 12)) return n;
    return { x: l.x, y: g.groundAt(l.x, l.z), z: l.z, height: 1.9 };
  }
  tick(g, dt) {
    if (this.state === 'done') return;
    if (this.state === 'wait') {
      const f = g.focus();
      if (dist(f.x, f.z, this.l.x, this.l.z) >= this.s.r) return;
      this.state = 'playing';
      this.t = 0;
    }
    this.t -= dt;
    if (this.t > 0) return;
    const lines = this.s.lines || [];
    if (this.i >= lines.length) { this.state = 'done'; return; }
    const [who, text, cue] = lines[this.i++];
    if (cue) g.cue(cue);
    const secs = lineSecs(g, text);
    if (this.s.radio) g.radio(who, text);
    else g.say(this.anchor(g, who), text, secs);
    this.t = secs;
  }
}

// ÅKSJUKA (`smooth`, bar 0 -> 100 fails) and SKICK (`fragile`, bar 100 -> 0 fails) for goto
// (invented, DESIGN §9.2). Reads the player's car each frame; teleports never count.
export class RideMeter {
  constructor(kind, spec) {
    this.kind = kind;
    this.spec = spec || {};
    this.v = kind === 'smooth' ? 0 : 100;
    this.prev = null;
  }
  get failed() { return this.kind === 'smooth' ? this.v >= 100 : this.v <= 0; }
  tick(g, dt) {
    const c = g.playerCar;
    if (!c || dt <= 0) { this.prev = null; return; }
    const p = this.prev;
    this.prev = { car: c, x: c.x, z: c.z, vx: c.vx, vz: c.vz, air: c.air };
    if (!p || p.car !== c) return;
    const moved = dist(c.x, c.z, p.x, p.z);
    if (moved > Math.max(c.speed, Math.hypot(p.vx, p.vz)) * dt + 2) return;   // a teleport
    const dvx = c.vx - p.vx, dvz = c.vz - p.vz, dv = Math.hypot(dvx, dvz);
    const impact = dv > 3 ? dv : 0;                                             // a bump in one frame
    const fwd = c.forwardSpeed;
    const lat = Math.abs(fwd * (c.w || 0));
    const along = (dvx * Math.sin(c.yaw) + dvz * Math.cos(c.yaw)) / dt;
    const brake = !impact && fwd > 0.5 ? -along : 0;
    const landed = p.air && !c.air;
    if (this.kind === 'smooth') {
      this.v += Math.max(0, lat - 6) * 1.2 * dt;
      if (brake > 14) this.v += 8 * dt;
      if (impact > 3) this.v += impact * 2;
      if (landed) this.v += 15;
      this.v -= 3 * dt;
    } else {
      if (impact > 4) this.v -= impact * 3;
      if (landed) this.v -= 15;
    }
    this.v = Math.max(0, Math.min(100, this.v));
  }
  obj() {
    const smooth = this.kind === 'smooth';
    const v = this.v / 100;
    return { bar: v, barLabel: this.spec.label || '', barColor: smooth ? (v > 0.7 ? '#ff4a3a' : '#8fd35f') : (v < 0.3 ? '#ff4a3a' : '#5fd35f') };
  }
}

// Remove parked (unlocked, unnamed, AI-less) cars standing on a spot before a mission car goes there.
function clearSpot(g, car, r = 7) {
  for (const c of g.cars.slice()) {
    if (c === car || c.locked || c === g.playerCar || c.name || c.ai) continue;
    if (Math.hypot(c.x - car.x, c.z - car.z) < r) g.removeCar(c);
  }
}

// Abandoned cars (unlocked, unnamed, no driver, no AI, not the player's) standing in the lanes of
// a mission route are removed at init: a route car would otherwise wait behind them for ever (e.g.
// the car the player left on the road when he took over the pig truck).
function clearRoute(g, nodes, end, except = []) {
  const path = new LanePath(nodes, { endPoint: end });
  path.ensure(100000);
  for (const c of g.cars.slice()) {
    if (except.includes(c) || c === g.playerCar || c.locked || c.name || c.ai || c.driver || c.traffic) continue;
    if (path.pts.some((q) => Math.hypot(q.x - c.x, q.z - c.z) < 3.5)) g.removeCar(c);
  }
}

// ---------------------------------------------------------------------------------------------
// getInCar: car? (named, recreated if wrecked) · missionCar? (a car in m.cars) · passenger? ·
// rider? / riders? · hideRiders? · any = true · say?

export const getInCar = (o = {}) => common(o, {
  text: o.text || S.getInCar,
  init(g, m) {
    this.car = null;
    if (o.car) {
      this.car = g.ensureNamedCar(o.car);
      if (this.car && this.car.locked) {
        const c = this.car;
        c.locked = false;
        m.items.push(() => { if (c !== g.playerCar) c.locked = true; });
      }
    }
    if (o.missionCar) {
      const c = (this.car = m.cars.find((x) => x.name === o.missionCar) || null);
      if (c) {
        // Hand the mission car over: AI off, unlocked, the driver steps out to the roadside.
        c.ai = null;
        c.locked = false;
        c.noEnter = false;
        c.ctrl.park = true;
        if (c.driverBust) { c.tilt.remove(c.driverBust); c.driverBust = null; }
        const d = c.driver;
        if (d && d !== g.player) {
          const e = g.exitSpot(c, 1);
          g.unseat(d, e.x, e.z);
          d.busy = true;
        }
      }
    }
    this.setup(g, m);
    if (o.say) g.say(g.npc(o.say[0]), o.say[1], o.say[2] ?? 2.6);
  },
  setup(g, m) {
    const c = this.car;
    if (!c) return;
    if (o.passenger) seatIn(g, o.passenger, c, -1);
    const keys = [...(o.rider ? [o.rider] : []), ...(o.riders || [])];
    if (keys.length) addRiders(g, m, c, keys, { hide: !!o.hideRiders });
  },
  target(g) { return this.car && g.playerCar !== this.car && !(g.playerCar && o.any !== false) ? { x: this.car.x, z: this.car.z, r: 3.5 } : null; },
  update(g, m) {
    // A wrecked named car comes back (parked at its spot) with its passenger and riders.
    if (o.car && this.car && this.car.dead && g.playerCar !== this.car) {
      this.car = g.ensureNamedCar(o.car);
      this.setup(g, m);
    }
    const pc = g.playerCar;
    if (!pc) return;
    if (o.any === false && this.car && pc !== this.car) return;
    if (o.passenger) { const n = g.npc(o.passenger); if (n && n.car !== pc) seatIn(g, o.passenger, pc, -1); }
    return 'done';
  },
});

// ---------------------------------------------------------------------------------------------
// goto: to · radius = 7 · timer? · failText · inCar? · onFoot? · passenger? · stop? · smooth? ·
// fragile? · fearRate? · radio? · overhear? · awaitOverhear = false

export const goto = (o) => common(o, {
  text: o.text,
  init(g) {
    this.t = o.timer ?? null;
    this.dest = at(o.to);
    this.radio = o.radio ? new RadioSeq(o.radio) : null;
    this.over = (o.overhear || []).map((s) => new Overhear(s));
    this.ride = o.smooth ? new RideMeter('smooth', o.smooth) : o.fragile ? new RideMeter('fragile', o.fragile) : null;
  },
  get destName() { return o.to; },
  target() { return { x: this.dest.x, z: this.dest.z, r: o.radius ?? 7 }; },
  obj() { return { timer: this.t, ...(this.ride ? this.ride.obj() : {}) }; },
  update(g, m, dt) {
    if (this.t != null) {
      this.t -= dt;
      if (this.t <= 0) return { fail: o.failText || S.outOfTime };
    }
    if (o.fearRate) g.shame.add(o.fearRate * dt * g.timeScale);
    this.radio?.tick(g, dt);
    for (const v of this.over) v.tick(g, dt);
    if (this.ride) {
      this.ride.tick(g, dt);
      if (this.ride.failed) return { fail: this.ride.spec.failText || o.failText || S.outOfTime };
    }
    this.sub = null;
    if (o.inCar && !g.playerCar) { this.sub = S.backInCar; return; }
    if (o.onFoot && g.playerCar) { this.sub = S.exitCar; return; }
    if (o.passenger) {
      const p = g.npc(o.passenger);
      if (!g.playerCar || p.car !== g.playerCar) {
        this.sub = fmt('goBackFor', { name: p.def.name });
        reboard(g, p);
        return;
      }
    }
    const f = g.focus();
    if (dist(f.x, f.z, this.dest.x, this.dest.z) >= (o.radius ?? 7)) return;
    if (o.stop && f.speed >= 2) { this.sub = S.stopCar; return; }
    if (o.awaitOverhear && this.over.some((v) => v.playing)) return;
    return 'done';
  },
  // Show the passenger as the target when they've been left behind.
  altTarget(g) {
    if (o.passenger) {
      const p = g.npc(o.passenger);
      if (!g.playerCar || p.car !== g.playerCar) return p.car ? { x: p.car.x, z: p.car.z, r: 4 } : { x: p.x, z: p.z, r: 4 };
    }
    return null;
  },
});

// ---------------------------------------------------------------------------------------------
// pickup: who · name · at · hello? · rider? (bust beside the passenger) · hideRiders? · text?

export const pickup = (o) => common(o, {
  text: o.text || fmt('pickUp', { name: o.name }),
  init(g, m) {
    const n = (this.npc = g.npc(o.who));
    if (!(g.playerCar && n.car === g.playerCar)) g.placeNpc(o.who, o.at);
    n.busy = true;
    if (o.rider && o.hideRiders) hideForMission(g, o.rider);
  },
  target() { return this.npc.car ? null : { x: this.npc.x, z: this.npc.z, r: 4 }; },
  update(g, m) {
    this.sub = null;
    const c = g.playerCar;
    if (!c) { this.sub = S.getInCar; return; }
    if (this.npc.car !== c) {
      if (dist(c.x, c.z, this.npc.x, this.npc.z) >= 9) return;
      if (c.speed > 4) { this.sub = S.slowDown; return; }
      g.seat(this.npc, c, -1);
      this.npc.busy = true;
      audio.door();
      g.say(this.npc, o.hello || S.goGoGo, 1.6);
    }
    if (o.rider) addRiders(g, m, c, [o.rider], { hide: true });
    return 'done';
  },
});

// ---------------------------------------------------------------------------------------------
// dropoff: who · at · riderOff? (remove the rider bust, show the rider NPC beside) · text

export const dropoff = (o) => common(o, {
  text: o.text,
  init(g) { this.dest = at(o.at); this.npc = g.npc(o.who); },
  target() { return { x: this.dest.x, z: this.dest.z, r: 6 }; },
  altTarget(g) {
    const n = this.npc;
    if (n.car && n.car === g.playerCar) return null;
    return n.car ? { x: n.car.x, z: n.car.z, r: 4 } : { x: n.x, z: n.z, r: 4 };
  },
  update(g, m) {
    const n = this.npc;
    this.sub = null;
    const c = g.playerCar;
    if (!c || n.car !== c) {
      this.sub = c ? fmt('goBackFor', { name: n.def.name }) : S.backInCar;
      reboard(g, n);
      return;
    }
    if (dist(c.x, c.z, this.dest.x, this.dest.z) >= 9) return;
    if (c.speed > 4) { this.sub = S.stopCar; return; }
    const out = g.exitSpot(c, -1);
    g.unseat(n, out.x, out.z);
    n.yaw = yawTo(this.dest.x - n.x, this.dest.z - n.z);
    n.busy = true;
    if (o.riderOff) {
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      let k = 0;
      for (const r of (m.data.riders || []).filter((x) => x.car === c)) {
        removeRider(m, r);
        const rn = g.npcs[r.key];
        if (!rn) continue;
        const sx = out.x - fx * 1.2 * ++k, sz = out.z - fz * 1.2 * k;
        const s = g.spotFree(sx, sz) ? { x: sx, z: sz } : g.freeSpot(out.x, out.z, 1, 3);
        g.unseatAny(rn);
        rn.state = 'normal';
        rn.hiddenBy = null;
        rn.root.visible = true;
        rn.teleport(s.x, s.z, n.yaw);
        rn.busy = true;
      }
    }
    audio.door();
    return 'done';
  },
});

// ---------------------------------------------------------------------------------------------
// follow: type · color? · carName? · driver (who) · passenger? · riders? · hideRiders? · start ·
// via · to (kerbside) · maxDist · minDist? · minGrace = 2 · minText? · cruise = 12 · wobble? ·
// arriveDist = 35 · radio?

export const follow = (o) => common(o, {
  text: o.text,
  minDist: o.minDist ?? null,
  init(g, m) {
    const s = at(o.start);
    const car = (this.car = g.spawnMissionCar(m, o.type, s.x, s.z, s.yaw ?? o.yaw ?? 0, { color: o.color, name: o.carName }));
    clearSpot(g, car);
    car.locked = true;
    const dk = o.driver || o.who;
    this.npc = g.npcs[dk] ? seatIn(g, dk, car, 1) : null;
    if (!this.npc) car.bust = g.addBust(g.charDef(dk) || g.charDef('pax'), car);
    this.name = (this.npc?.def || g.charDef(dk))?.name || dk;
    if (o.passenger) seatIn(g, o.passenger, car, -1);
    this.riders = o.riders?.length ? addRiders(g, m, car, o.riders, { hide: !!o.hideRiders }) : [];
    this.m = m;
    // Route: start -> via nodes (shortest paths between them) -> endPoint = to. No nearestNode(to).
    const end = at(o.to);
    const nodes = startNodes(car);
    for (const v of (o.via || []).map(nodeRef)) nodes.push(...findPath(nodes[nodes.length - 1], v).slice(1));
    clearRoute(g, nodes, [end.x, end.z], [car]);
    this.ai = car.ai = new AIDriver(car, { mode: 'route', path: new LanePath(nodes, { endPoint: [end.x, end.z] }), cruise: 0, wobble: o.wobble || 0, onArrive: () => { this.arrived = true; } });
    this.arrived = false;
    this.lose = 0;
    this.close = 0;
    this.radio = o.radio ? new RadioSeq(o.radio, { first: 8, gap: [10, 10], who: dk }) : null;
    this.started = false;
  },
  target() { return { x: this.car.x, z: this.car.z, r: 0, follow: true }; },
  obj(g) {
    const f = g.focus();
    const d = dist(f.x, f.z, this.car.x, this.car.z), mx = o.maxDist;
    const bar = 1 - Math.min(1, d / mx);
    const tooClose = o.minDist != null && d < o.minDist;
    const losing = d > mx * 0.75;
    const out = { bar, barLabel: tooClose ? S.tooClose : losing ? S.losing : S.distance, barColor: tooClose || losing ? '#ff4a3a' : '#5fd35f' };
    if (o.minDist != null) { out.zone = [0, 1 - o.minDist / mx]; out.marker = bar; }
    return out;
  },
  update(g, m, dt) {
    if (this.car.dead) return { fail: fmt('wreckedRide', { name: this.name }) };
    const f = g.focus();
    const d = dist(f.x, f.z, this.car.x, this.car.z);
    if (!this.started) {
      this.sub = g.playerCar ? null : S.getInCar;
      if (g.playerCar && d < 40) { this.started = true; this.ai.cruise = o.cruise ?? 12; }
      return;
    }
    this.sub = null;
    this.radio?.tick(g, dt);
    if (this.arrived && d < (o.arriveDist ?? 35)) return 'done';
    if (d > o.maxDist) { this.lose += dt; if (this.lose > 3) return { fail: fmt('lost', { name: this.name }) }; }
    else this.lose = Math.max(0, this.lose - dt);
    if (o.minDist != null && d < o.minDist) {
      this.close += dt;
      this.sub = o.minText || S.tooClose;
      if (this.close > (o.minGrace ?? 2)) return { fail: o.minText || S.tooClose };
    } else this.close = 0;
  },
  cleanup() {
    this.car.ai = null;
    this.car.ctrl.park = true;
    for (const r of this.riders) removeRider(this.m, r);
    this.riders = [];
  },
});

// ---------------------------------------------------------------------------------------------
// rabbits: mesh = 'badboll' · count (<= 6 for the test) · near · rMin = 18 · rMax = 55 ·
// flee = true · timer · barLabel · gotText · failText · radio? · onFoot?

export const rabbits = (o) => common(o, {
  text: o.text,
  init(g, m) {
    const c = at(o.near);
    this.list = [];
    for (let k = 0; k < o.count; k++) {
      const p = g.freeSpot(c.x, c.z, o.rMin ?? 18, o.rMax ?? 55);
      const r = new Rabbit(g.scene, p.x, p.z, { mesh: o.mesh || 'badboll', flee: o.flee !== false });
      this.list.push(r);
      m.items.push(() => r.remove(g.scene));
    }
    this.t = o.timer ?? null;
    this.got = 0;
    this.radio = o.radio ? new RadioSeq(o.radio) : null;
  },
  target(g) {
    const f = g.focus();
    let best = null, bd = Infinity;
    for (const r of this.list) if (r.alive) { const d = dist(f.x, f.z, r.x, r.z); if (d < bd) { bd = d; best = r; } }
    return best ? { x: best.x, z: best.z, r: 0 } : null;
  },
  markers() { return this.list.filter((r) => r.alive).map((r) => ({ type: 'item', x: r.x, z: r.z, edge: true })); },
  obj() { return { timer: this.t, bar: this.got / o.count, barLabel: `${o.barLabel || ''} ${this.got}/${o.count}`.trim(), barColor: '#ffffff' }; },
  update(g, m, dt) {
    if (this.t != null) {
      this.t -= dt;
      if (this.t <= 0) return { fail: o.failText || S.outOfTime };
    }
    this.radio?.tick(g, dt);
    const f = g.focus();
    this.sub = o.onFoot && g.playerCar ? S.exitCar : null;
    const canCatch = !(o.onFoot && g.playerCar);
    for (const r of this.list) {
      if (!r.alive) continue;
      // Catch first, then let it hop (a rabbit you stand on is caught, not flung away).
      const caught = canCatch && dist(f.x, f.z, r.x, r.z) < (g.playerCar ? 2.8 : 1.4) && Math.abs(f.y - r.y) < 2;
      if (!caught) { r.update(dt, f.x, f.z); continue; }
      r.remove(g.scene);
      this.got++;
      audio.pickup();
      fx.sparkle(r.x, r.y + 0.5, r.z, 0xffffff, 16);
      hud.toast(`${o.gotText || ''} ${this.got}/${o.count}`.trim());
    }
    if (this.got >= o.count) return 'done';
  },
});

// ---------------------------------------------------------------------------------------------
// race: who · type · color? · carName? · cruise · start (lane spot / {x, z, yaw}) ·
// checkpoints [[i, j]] · finish {x, z} · playerPassenger? · oppPassenger? · radio?
// The player goes on the start spot, the opponent on the lane to its left: spot - r·2·LANE with
// r = (-cos yaw, sin yaw), i.e. lateral to yaw, never along world z.

export const race = (o) => common(o, {
  text: o.text,
  init(g, m) {
    const s = at(o.start);
    const rx = -Math.cos(s.yaw), rz = Math.sin(s.yaw);
    if (!g.playerCar) {
      const spare = g.spawnMissionCar(m, 'hatch', s.x, s.z, s.yaw);
      m.cars.pop(); // the player keeps this one
      g.enterCar(spare);
    }
    const pc = g.playerCar;
    pc.place(s.x, s.z, s.yaw);
    clearSpot(g, pc, 8);
    const opp = (this.opp = g.spawnMissionCar(m, o.type, s.x - rx * 2 * LANE, s.z - rz * 2 * LANE, s.yaw, { color: o.color, name: o.carName }));
    clearSpot(g, opp, 8);
    opp.locked = true;
    this.npc = g.npcs[o.who] ? seatIn(g, o.who, opp, 1) : null;
    if (!this.npc) opp.bust = g.addBust(g.charDef(o.who) || g.charDef('pax'), opp);
    this.name = (this.npc?.def || g.charDef(o.who))?.name || o.who;
    if (o.oppPassenger || o.passenger) seatIn(g, o.oppPassenger || o.passenger, opp, -1);
    if (o.playerPassenger) seatIn(g, o.playerPassenger, pc, -1);
    const fin = at(o.finish);
    this.cps = o.checkpoints.map((n) => { const id = nodeRef(n); return { x: nodeX(id), z: nodeZ(id) }; });
    this.cps.push({ x: fin.x, z: fin.z });
    const nodes = startNodes(opp);
    for (const n of o.checkpoints) nodes.push(...findPath(nodes[nodes.length - 1], nodeRef(n)).slice(1));
    nodes.push(...findPath(nodes[nodes.length - 1], nearestNode(fin.x, fin.z)).slice(1));
    clearRoute(g, nodes, [fin.x, fin.z], [opp, pc]);
    this.ai = opp.ai = new AIDriver(opp, {
      mode: 'route', path: new LanePath(nodes, { endPoint: [fin.x, fin.z] }), cruise: 0, avoid: false,
      rubber: () => this.rubber,
    });
    this.rubber = 1;
    this.pi = 0; this.oi = 0;
    this.countdown = 3.5;
    this.lastCount = 4;
    this.radio = o.radio ? new RadioSeq(o.radio, { first: 5, who: o.who }) : null;
    g.freezeCar = true;
    g.cam.snapNext = true;
  },
  target() { const c = this.cps[Math.min(this.pi, this.cps.length - 1)]; return { x: c.x, z: c.z, r: 10, checkpoint: true }; },
  markers() {
    const out = [{ type: 'enemy', x: this.opp.x, z: this.opp.z, edge: true }];
    const n = this.cps[this.pi + 1];
    if (n) out.push({ type: 'item', x: n.x, z: n.z, edge: false });
    return out;
  },
  obj(g) {
    const ahead = this.place(g) === 1;
    return { bar: this.pi / this.cps.length, barLabel: fmt(ahead ? 'race1' : 'race2', { i: this.pi, n: this.cps.length }), barColor: ahead ? '#5fd35f' : '#ff8a3a' };
  },
  place(g) {
    const f = g.focus();
    if (this.pi !== this.oi) return this.pi > this.oi ? 1 : 2;
    const c = this.cps[Math.min(this.pi, this.cps.length - 1)];
    return dist(f.x, f.z, c.x, c.z) <= dist(this.opp.x, this.opp.z, c.x, c.z) ? 1 : 2;
  },
  update(g, m, dt) {
    if (this.countdown > 0) {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      if (n !== this.lastCount && n >= 0) {
        this.lastCount = n;
        if (n > 0) { hud.showBanner(String(n), '', 'count', 900); audio.tick(); }
        else { hud.showBanner(S.go, '', 'count', 900); audio.checkpoint(); }
      }
      if (this.countdown <= 0) { g.freezeCar = false; this.ai.cruise = o.cruise; }
      return;
    }
    this.radio?.tick(g, dt);
    if (this.opp.dead) return 'done';
    const f = g.focus();
    this.sub = g.playerCar ? null : S.backInCar;
    const c = this.cps[this.pi];
    if (c && dist(f.x, f.z, c.x, c.z) < 11) {
      this.pi++;
      audio.checkpoint();
      if (this.pi >= this.cps.length) return 'done';
    }
    const oc = this.cps[this.oi];
    if (oc && dist(this.opp.x, this.opp.z, oc.x, oc.z) < 13) {
      this.oi++;
      if (this.oi >= this.cps.length) return { fail: fmt('won', { name: this.name }) };
    }
    // Rubber band: the opponent eases off when far ahead and pushes when far behind.
    const cp = (i) => this.cps[Math.min(i, this.cps.length - 1)];
    const gap = (this.oi - this.pi) * 200 + (dist(f.x, f.z, cp(this.pi).x, cp(this.pi).z) - dist(this.opp.x, this.opp.z, cp(this.oi).x, cp(this.oi).z));
    this.rubber = gap > 60 ? 0.82 : gap < -60 ? 1.12 : 1;
  },
  cleanup(g) { g.freezeCar = false; this.opp.ai = null; this.opp.ctrl.park = true; },
});

// ---------------------------------------------------------------------------------------------
// destroy: type · carName? · driver = 'guardia' (bust def key) · spawn? (default: a road node
// 70–130 m away) · timer · cruise = 20 · damageScale = 1.5 · noExplode = false (wreck stops in
// steam, two occupants step out shaking their fists) · barLabel = 'MÅL' · failText

export const destroy = (o) => common(o, {
  text: o.text,
  init(g, m) {
    let x, z, yaw = Math.PI / 2;
    if (o.spawn) ({ x, z, yaw = Math.PI / 2 } = at(o.spawn));
    else {
      const f = g.focus();
      let best = null;
      for (let tries = 0; tries < 40 && best === null; tries++) {
        const id = (Math.random() * (N + 1) * (N + 1)) | 0;
        const d = dist(nodeX(id), nodeZ(id), f.x, f.z);
        if (d > 70 && d < 130) best = id;
      }
      best ??= nearestNode(f.x + 90, f.z);
      x = nodeX(best) + 10; z = nodeZ(best) + LANE;
    }
    const car = (this.car = g.spawnMissionCar(m, o.type, x, z, yaw, { name: o.carName }));
    clearSpot(g, car);
    car.locked = true;
    car.damageScale = o.damageScale ?? 1.5;
    car.isTarget = true;
    car.noExplode = !!o.noExplode;
    this.driverDef = g.charDef(o.driver || 'guardia') || g.charDef('guardia');
    car.bust = g.addBust(this.driverDef, car);
    car.ai = new AIDriver(car, { mode: 'flee', target: () => g.focusTarget(), cruise: o.cruise ?? 20, avoid: false });
    this.t = o.timer ?? null;
    this.max = car.hp;
    this.m = m;
  },
  target() { return { x: this.car.x, z: this.car.z, r: 0, follow: true }; },
  markers() { return [{ type: 'enemy', x: this.car.x, z: this.car.z, edge: true }]; },
  obj() { return { timer: this.t, bar: this.car.hp / this.max, barLabel: o.barLabel || S.target, barColor: '#2e5e3e' }; },
  update(g, m, dt) {
    if (this.car.dead) {
      m.data.wreck = { x: this.car.x, z: this.car.z };
      if (o.noExplode) this.stepOut(g, m);
      return 'done';
    }
    if (this.t != null) {
      this.t -= dt;
      if (this.t <= 0) return { fail: o.failText || S.gotAway };
    }
    this.sub = g.playerCar ? null : S.getInCar;
  },
  // The wreck stops in steam and two officers climb out shaking their fists (they stay until the
  // mission ends).
  stepOut(g, m) {
    const car = this.car;
    car.ai = null;
    const taunts = METERS.skandal?.taunts || [];
    const crew = [];
    for (const side of [1, -1]) {
      const ch = new Character(this.driverDef);
      const e = g.exitSpot(car, side);
      ch.teleport(e.x, e.z, car.yaw);
      ch.anim.cheer = true;
      g.scene.add(ch.root);
      crew.push(ch);
    }
    const hook = (dt) => {
      const f = g.focus();
      for (const ch of crew) { ch.yaw = yawTo(f.x - ch.x, f.z - ch.z); ch.sync(dt); }
    };
    g.onFrame(hook);
    if (taunts.length) { g.say(crew[0], taunts[0], 2.4); if (taunts[1]) setTimeout(() => g.say(crew[1], taunts[1], 2.4), 900); }
    m.items.push(() => { g.offFrame(hook); for (const ch of crew) g.scene.remove(ch.root); });
  },
});

// ---------------------------------------------------------------------------------------------
// grab: at? (or m.data.wreck) · mesh = 'pryl' (any COLLECT_KINDS key) · scale = 1.8 · say? · gotText?

export const grab = (o) => common(o, {
  text: o.text,
  init(g, m) {
    const w = (o.at && at(o.at)) || m.data.wreck || g.focus();
    const p = g.freeSpot(w.x, w.z, 3, 8);
    this.item = new Collectible(g.scene, o.mesh || 'pryl', 'quest', p.x, g.groundAt(p.x, p.z) + 1.2, p.z, { scale: o.scale ?? 1.8 });
    if (o.say) g.say(g.npc(o.say[0]), o.say[1], o.say[2] ?? 2.6);
    const item = this.item;
    m.items.push(() => { item.remove(); g.scene.remove(item.mesh); });
  },
  target() { return this.item.alive ? { x: this.item.x, z: this.item.z, r: 2.5 } : null; },
  update(g, m, dt) {
    this.item.tick(g.time, dt);
    const f = g.focus();
    if (dist(f.x, f.z, this.item.x, this.item.z) < 2.5 && Math.abs(f.y - this.item.y) < 3) {
      this.item.remove();
      audio.jingle('pryl');
      fx.sparkle(this.item.x, this.item.y, this.item.z, 0xffd23f, 24);
      if (o.gotText) hud.toast(o.gotText);
      return 'done';
    }
  },
});

// ---------------------------------------------------------------------------------------------
// scene: lines [[who, text, cue?]] · frame? [a, b] · cam? {at, dist, height} · place? · anim?
// {key: flag} · exitCar?. Runs: (with place/exitCar: exitCar(true) first) -> place -> camera
// (frame, or cam, or the player alone) -> dialogue -> camera back; doneCue applies on 'done'.
// With `frame` only, car-seated characters stay seated (their x/y/z are live).

export const scene = (o) => common(o, {
  text: o.text || '',
  init(g, m) {
    this.done = false;
    (async () => {
      if (o.place || o.exitCar) g.exitCar(true);
      for (const [k, v] of Object.entries(o.place || {})) g.placeNpc(k, ...v);
      for (const [k, flag] of Object.entries(o.anim || {})) { const n = g.npc(k); if (n) n.anim[flag] = true; }
      if (o.frame) g.cinematic(g.npc(o.frame[0]), g.npc(o.frame[1]));
      else g.cinematicOne(g.player);
      if (o.cam) g.cutTo(o.cam);
      await g.dialog(o.lines || []);
      g.endCut();
      g.endCinematic();
      for (const [k, flag] of Object.entries(o.anim || {})) { const n = g.npc(k); if (n) n.anim[flag] = false; }
      if (g.missions.m === m) this.done = true;
    })();
  },
  target() { return null; },
  update() { if (this.done) return 'done'; },
});
