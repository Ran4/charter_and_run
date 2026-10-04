// Stage kinds, part 1 (DESIGN §9): the Bigmouth kinds (getInCar goto pickup dropoff follow
// rabbits race destroy grab) and `scene`. Frozen after Phase 0 (owner none); Phase-1 agents change
// behaviour only through options and report kind bugs under CONTRACT CHANGES.
// Phase 0a: moved from Bigmouth's missions.js with the renames the engine needs; Phase 0b
// implements every §9.2 option.
//
// Every factory copies the common options (COMMON) from its options onto the stage it returns,
// and keeps the options themselves as `stage.o` (tests read them).

import { lm, nodeId, nodeX, nodeZ, LANE, findPath, nearestNode, laneSpot, nodeRef } from '../../../world/layout.js';
import { AIDriver, LanePath, startNodes } from '../../../actors/drivers.js';
import { Rabbit, Collectible } from '../../../actors/pickups.js';
import { audio } from '../../../audio.js';
import { hud } from '../../hud.js';
import { fx } from '../../fx.js';
import { S, fmt } from '../../../strings.js';
import { dist, yawTo } from '../../../util.js';

export const COMMON = ['checkpoint', 'panicFails', 'lockMeter', 'shame', 'oleBarks', 'timedCues', 'startCue', 'doneCue', 'retryAt'];
export function common(o, stage) {
  for (const k of COMMON) if (o[k] !== undefined) stage[k] = o[k];
  stage.o = o;
  return stage;
}

// A position: landmark name | { x, z, yaw? } | lane spot { lane: [[i1, j1], [i2, j2]], t }.
export const at = (p) => (typeof p === 'string' ? lm(p) : p && p.lane ? laneSpot(p.lane[0], p.lane[1], p.t ?? 12) : p);

export const getInCar = (o = {}) => common(o, {
  text: o.text || S.getInCar,
  init(g, m) {
    if (o.car) this.car = g.ensureNamedCar(o.car);
    if (o.missionCar) this.car = m.cars.find((c) => c.name === o.missionCar) || null;
    if (o.say) g.say(g.npc(o.say[0]), o.say[1], o.say[2] ?? 2.6);
  },
  target(g) { return this.car && !g.playerCar ? { x: this.car.x, z: this.car.z, r: 3.5 } : null; },
  update(g) {
    if (g.playerCar && (!this.car || g.playerCar === this.car || o.any !== false)) return 'done';
  },
});

export const goto = (o) => common(o, {
  text: o.text,
  init(g) { this.t = o.timer ?? null; this.dest = at(o.to); this.radioI = 0; this.radioT = 6; },
  get destName() { return o.to; },
  target() { return { x: this.dest.x, z: this.dest.z, r: o.radius || 7 }; },
  obj() { return { timer: this.t }; },
  update(g, m, dt) {
    if (this.t != null) {
      this.t -= dt;
      if (this.t <= 0) return { fail: o.failText || S.outOfTime };
    }
    if (o.radio && this.radioI < o.radio.length) {
      this.radioT -= dt;
      if (this.radioT <= 0) { g.radio(o.radio[this.radioI][0], o.radio[this.radioI][1]); this.radioI++; this.radioT = 9 + Math.random() * 4; }
    }
    this.sub = null;
    if (o.inCar && !g.playerCar) { this.sub = S.backInCar; return; }
    if (o.onFoot && g.playerCar) { this.sub = S.exitCar; return; }
    if (o.passenger) {
      const p = g.npc(o.passenger);
      if (!g.playerCar || p.car !== g.playerCar) {
        this.sub = fmt('goBackFor', { name: p.def.name });
        // Swing by them (on foot or in another car) and they hop back in.
        const c = g.playerCar;
        const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
        if (c && dist(c.x, c.z, px, pz) < 10 && c.speed < 5 && p.state !== 'flung' && p.state !== 'down') {
          g.seat(p, c, -1);
          audio.door();
          g.say(p, S.neverLeave, 1.6);
        }
        return;
      }
    }
    const f = g.focus();
    if (dist(f.x, f.z, this.dest.x, this.dest.z) < (o.radius || 7)) return 'done';
  },
  // Show the passenger as the target when they've been left behind.
  altTarget(g) {
    if (o.passenger) { const p = g.npc(o.passenger); if (!g.playerCar || p.car !== g.playerCar) return p.car ? { x: p.car.x, z: p.car.z, r: 4 } : { x: p.x, z: p.z, r: 4 }; }
    return null;
  },
});

export const pickup = (o) => common(o, {
  text: o.text || fmt('pickUp', { name: o.name }),
  init(g) {
    const n = (this.npc = g.npc(o.who));
    const p = at(o.at);
    g.placeNpc(o.who, o.at);
    n.busy = true;
  },
  target(g) { return { x: this.npc.x, z: this.npc.z, r: 4 }; },
  update(g) {
    this.sub = null;
    if (!g.playerCar) { this.sub = S.getInCar; return; }
    const c = g.playerCar;
    if (dist(c.x, c.z, this.npc.x, this.npc.z) < 9) {
      if (c.speed > 4) { this.sub = S.slowDown; return; }
      g.seat(this.npc, c, -1);
      audio.door();
      g.say(this.npc, o.hello || S.goGoGo, 1.6);
      return 'done';
    }
  },
});

export const dropoff = (o) => common(o, {
  text: o.text,
  init(g) { this.dest = at(o.at); this.npc = g.npc(o.who); },
  target() { return { x: this.dest.x, z: this.dest.z, r: 6 }; },
  update(g) {
    const n = this.npc;
    if (!g.playerCar || n.car !== g.playerCar) return 'done';
    const c = g.playerCar;
    if (dist(c.x, c.z, this.dest.x, this.dest.z) < 9) {
      if (c.speed > 4) { this.sub = S.stopCar; return; }
      const out = g.exitSpot(c, -1);
      g.unseat(n, out.x, out.z);
      n.yaw = yawTo(this.dest.x - n.x, this.dest.z - n.z);
      audio.door();
      return 'done';
    }
  },
  cleanup(g) { this.npc.busy = false; },
});

export const follow = (o) => common(o, {
  text: o.text,
  init(g, m) {
    const s = at(o.start);
    const car = (this.car = g.spawnMissionCar(m, o.type, s.x, s.z, o.yaw ?? s.yaw, { color: o.color, name: o.carName }));
    // Clear anything parked on top of the spot.
    for (const c of g.cars) if (c !== car && !c.locked && c !== g.playerCar && Math.hypot(c.x - car.x, c.z - car.z) < 7) g.removeCar(c);
    car.locked = true;
    this.npc = g.npc(o.driver || o.who);
    g.seat(this.npc, car, 1);
    const end = at(o.to);
    const nodes = [];
    let [a, b] = startNodes(car);
    nodes.push(a, b);
    // The route ends at `to` (kerbside); no extra nearestNode(to) (DESIGN §9.2).
    for (const v of (o.via || []).map(nodeRef)) {
      const p = findPath(nodes[nodes.length - 1], v);
      nodes.push(...p.slice(1));
    }
    this.ai = car.ai = new AIDriver(car, { mode: 'route', path: new LanePath(nodes, { endPoint: [end.x, end.z] }), cruise: 0, wobble: o.wobble || 0, onArrive: () => { this.arrived = true; } });
    this.lose = 0;
    this.radioI = 0; this.radioT = 8;
    this.started = false;
  },
  target() { return { x: this.car.x, z: this.car.z, r: 0, follow: true }; },
  obj(g) {
    const f = g.focus();
    const d = dist(f.x, f.z, this.car.x, this.car.z);
    return { bar: 1 - Math.min(1, d / o.maxDist), barLabel: d > o.maxDist * 0.75 ? S.losing : S.distance, barColor: d > o.maxDist * 0.75 ? '#ff4a3a' : '#5fd35f' };
  },
  update(g, m, dt) {
    if (this.car.dead) return { fail: fmt('wreckedRide', { name: this.npc.def.name }) };
    const f = g.focus();
    const d = dist(f.x, f.z, this.car.x, this.car.z);
    if (!this.started) {
      this.sub = g.playerCar ? null : S.getInCar;
      if (g.playerCar && d < 40) { this.started = true; this.ai.cruise = o.cruise || 12; }
      return;
    }
    if (o.radio && this.radioI < o.radio.length) {
      this.radioT -= dt;
      if (this.radioT <= 0) { const l = o.radio[this.radioI]; if (Array.isArray(l)) g.radio(l[0], l[1]); else g.radio(o.driver || o.who, l); this.radioI++; this.radioT = 10; }
    }
    if (d > o.maxDist) { this.lose += dt; if (this.lose > 3) return { fail: fmt('lost', { name: this.npc.def.name }) }; }
    else this.lose = Math.max(0, this.lose - dt);
    if (this.arrived && d < (o.arriveDist ?? 35)) return 'done';
  },
  cleanup(g) { this.car.ai = null; this.car.ctrl.park = true; },
});

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
    this.t = o.timer;
    this.got = 0;
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
    this.t -= dt;
    if (this.t <= 0) return { fail: o.failText || S.outOfTime };
    const f = g.focus();
    for (const r of this.list) {
      if (!r.alive) continue;
      r.update(dt, f.x, f.z);
      if (dist(f.x, f.z, r.x, r.z) < (g.playerCar ? 2.8 : 1.4) && Math.abs(f.y - r.y) < 2) {
        r.remove(g.scene);
        this.got++;
        audio.pickup();
        fx.sparkle(r.x, r.y + 0.5, r.z, 0xffffff, 16);
        hud.toast(`${o.gotText || ''} ${this.got}/${o.count}`.trim());
      }
    }
    if (this.got >= o.count) return 'done';
  },
});

export const race = (o) => common(o, {
  text: o.text,
  init(g, m) {
    // Player on the start spot, the opponent on the lane to its left: offsets are lateral to yaw.
    const s = at(o.start);
    const rx = -Math.cos(s.yaw), rz = Math.sin(s.yaw);
    if (!g.playerCar) {
      const spare = g.spawnMissionCar(m, 'hatch', s.x, s.z, s.yaw);
      m.cars.pop(); // the player keeps this one
      g.enterCar(spare);
    }
    const pc = g.playerCar;
    pc.place(s.x, s.z, s.yaw);
    const opp = (this.opp = g.spawnMissionCar(m, o.type, s.x - rx * 2 * LANE, s.z - rz * 2 * LANE, s.yaw, { color: o.color, name: o.carName }));
    opp.locked = true;
    this.npc = g.npc(o.who);
    g.seat(this.npc, opp, 1);
    if (o.oppPassenger) { this.pass = g.npc(o.oppPassenger); g.seat(this.pass, opp, -1); }
    if (o.playerPassenger) { this.pp = g.npc(o.playerPassenger); g.seat(this.pp, pc, -1); }
    this.cps = o.checkpoints.map(([i, j]) => ({ x: nodeX(nodeId(i, j)), z: nodeZ(nodeId(i, j)) }));
    this.cps.push(o.finish);
    const nodes = [];
    const [a, b] = startNodes(opp);
    nodes.push(a, b);
    for (const [i, j] of o.checkpoints) nodes.push(...findPath(nodes[nodes.length - 1], nodeId(i, j)).slice(1));
    nodes.push(...findPath(nodes[nodes.length - 1], nearestNode(o.finish.x, o.finish.z)).slice(1));
    this.ai = opp.ai = new AIDriver(opp, {
      mode: 'route', path: new LanePath(nodes, { endPoint: [o.finish.x, o.finish.z] }), cruise: 0, avoid: false,
      rubber: () => this.rubber,
    });
    this.rubber = 1;
    this.pi = 0; this.oi = 0;
    this.countdown = 3.5;
    this.lastCount = 4;
    g.freezeCar = true;
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
        else { hud.showBanner(S.go, '', 'count', 900); audio.checkpoint(); g.freezeCar = false; this.ai.cruise = o.cruise; }
      }
      if (this.countdown <= 0) { g.freezeCar = false; this.ai.cruise = o.cruise; }
      return;
    }
    if (this.opp.dead) return 'done';
    const f = g.focus();
    if (!g.playerCar) this.sub = S.backInCar;
    else this.sub = null;
    const c = this.cps[this.pi];
    if (c && dist(f.x, f.z, c.x, c.z) < 11) {
      this.pi++;
      audio.checkpoint();
      if (this.pi >= this.cps.length) return 'done';
    }
    const oc = this.cps[this.oi];
    if (oc && dist(this.opp.x, this.opp.z, oc.x, oc.z) < 13) {
      this.oi++;
      if (this.oi >= this.cps.length) return { fail: fmt('won', { name: this.npc.def.name }) };
    }
    // Keep it close: Jessi eases off when she's far ahead and pushes when far behind.
    const gap = (this.oi - this.pi) * 200 + (dist(f.x, f.z, this.cps[Math.min(this.pi, this.cps.length - 1)].x, this.cps[Math.min(this.pi, this.cps.length - 1)].z) - dist(this.opp.x, this.opp.z, this.cps[Math.min(this.oi, this.cps.length - 1)].x, this.cps[Math.min(this.oi, this.cps.length - 1)].z));
    this.rubber = gap > 60 ? 0.82 : gap < -60 ? 1.12 : 1;
  },
  cleanup(g) { g.freezeCar = false; this.opp.ai = null; this.opp.ctrl.park = true; },
});

export const destroy = (o) => common(o, {
  text: o.text,
  init(g, m) {
    let x, z, yaw = Math.PI / 2;
    if (o.spawn) ({ x, z, yaw } = at(o.spawn));
    else {
      // Start the target a block or so away on a road.
      const f = g.focus();
      let best = null;
      for (let tries = 0; tries < 40 && !best; tries++) {
        const id = (Math.random() * 64) | 0;
        const d = dist(nodeX(id), nodeZ(id), f.x, f.z);
        if (d > 70 && d < 130) best = id;
      }
      best ??= nearestNode(f.x + 90, f.z);
      x = nodeX(best) + 10; z = nodeZ(best) + LANE;
    }
    const car = (this.car = g.spawnMissionCar(m, o.type, x, z, yaw ?? Math.PI / 2, { name: o.carName }));
    car.locked = true;
    car.damageScale = o.damageScale || 1.5;
    car.isTarget = true;
    car.noExplode = !!o.noExplode;
    car.bust = g.addBust(g.charDef(o.driver || 'guardia'), car);
    car.ai = new AIDriver(car, { mode: 'flee', target: () => g.focusTarget(), cruise: o.cruise || 20, avoid: false });
    this.t = o.timer;
    this.max = car.hp;
  },
  target() { return { x: this.car.x, z: this.car.z, r: 0, follow: true }; },
  markers() { return [{ type: 'enemy', x: this.car.x, z: this.car.z, edge: true }]; },
  obj() { return { timer: this.t, bar: this.car.hp / this.max, barLabel: o.barLabel || S.target, barColor: '#2e5e3e' }; },
  update(g, m, dt) {
    this.t -= dt;
    if (this.car.dead) { m.data.wreck = { x: this.car.x, z: this.car.z }; return 'done'; }
    if (this.t <= 0) return { fail: o.failText || S.gotAway };
    this.sub = g.playerCar ? null : S.getInCar;
  },
});

export const grab = (o) => common(o, {
  text: o.text,
  init(g, m) {
    const w = m.data.wreck || at(o.at);
    const p = g.freeSpot(w.x, w.z, 3, 8);
    this.item = new Collectible(g.scene, o.mesh || 'pryl', 'quest', p.x, g.groundAt(p.x, p.z) + 1.2, p.z, { scale: o.scale ?? 1.8 });
    if (o.say) g.say(g.npc(o.say[0]), o.say[1], o.say[2] ?? 2.6);
    m.items.push(() => g.scene.remove(this.item.mesh));
  },
  target() { return { x: this.item.x, z: this.item.z, r: 2.5 }; },
  update(g, m, dt) {
    this.item.tick(g.time, dt);
    const f = g.focus();
    if (dist(f.x, f.z, this.item.x, this.item.z) < 2.5) {
      this.item.remove();
      audio.jingle('pryl');
      fx.sparkle(this.item.x, this.item.y, this.item.z, 0xffd23f, 24);
      return 'done';
    }
  },
});


// A dialogue scene: (exit the car with `place`/`exitCar`) -> place -> camera -> lines -> done.
export const scene = (o) => common(o, {
  text: o.text || '',
  init(g) {
    this.done = false;
    (async () => {
      if (o.place || o.exitCar) g.exitCar(true);
      for (const [k, v] of Object.entries(o.place || {})) g.placeNpc(k, ...v);
      for (const [k, flag] of Object.entries(o.anim || {})) { const n = g.npc(k); if (n) n.anim[flag] = true; }
      if (o.cam) g.cutTo(o.cam);
      else if (o.frame) g.cinematic(g.npc(o.frame[0]), g.npc(o.frame[1]));
      else g.cinematicOne(g.player);
      await g.dialog(o.lines || []);
      g.endCut();
      g.endCinematic();
      for (const [k, flag] of Object.entries(o.anim || {})) { const n = g.npc(k); if (n) n.anim[flag] = false; }
      this.done = true;
    })();
  },
  target() { return null; },
  update() { if (this.done) return 'done'; },
});
