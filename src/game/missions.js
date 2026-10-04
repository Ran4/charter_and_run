// The story: seven missions around Bridgeton, each a short script of stages. A stage is a small
// object with init/update/cleanup, the text shown on the HUD, and where the objective is.

import { lm, nodeId, nodeX, nodeZ, rc, LANE, RHW, findPath, nearestNode } from '../world/layout.js';
import { Car } from '../actors/car.js';
import { AIDriver, LanePath, startNodes } from '../actors/drivers.js';
import { Rabbit, Collectible } from '../actors/pickups.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fx } from './fx.js';
import { dist, yawTo, pick } from '../util.js';

const at = (p) => (typeof p === 'string' ? lm(p) : p);

// ---------------------------------------------------------------------------------------------
// Stage kinds.

const getInCar = (o = {}) => ({
  text: o.text || 'Get in a car',
  init(g) {
    if (o.car) this.car = g.ensureNamedCar(o.car);
  },
  target(g) { return this.car && !g.playerCar ? { x: this.car.x, z: this.car.z, r: 3.5 } : null; },
  update(g) {
    if (g.playerCar && (!o.car || g.playerCar === this.car || o.any !== false)) return 'done';
  },
});

const goto = (o) => ({
  text: o.text,
  init(g) { this.t = o.timer ?? null; this.dest = at(o.to); this.radioI = 0; this.radioT = 6; },
  target() { return { x: this.dest.x, z: this.dest.z, r: o.radius || 7 }; },
  obj() { return { timer: this.t }; },
  update(g, m, dt) {
    if (this.t != null) {
      this.t -= dt;
      if (this.t <= 0) return { fail: o.failText || 'Out of time!' };
    }
    if (o.radio && this.radioI < o.radio.length) {
      this.radioT -= dt;
      if (this.radioT <= 0) { g.radio(o.radio[this.radioI][0], o.radio[this.radioI][1]); this.radioI++; this.radioT = 9 + Math.random() * 4; }
    }
    this.sub = null;
    if (o.inCar && !g.playerCar) { this.sub = 'Get back in a car!'; return; }
    if (o.passenger) {
      const p = g.npc(o.passenger);
      if (!g.playerCar || p.car !== g.playerCar) {
        this.sub = `Go back for ${p.def.name}!`;
        // Swing by them (on foot or in another car) and they hop back in.
        const c = g.playerCar;
        const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
        if (c && dist(c.x, c.z, px, pz) < 10 && c.speed < 5 && p.state !== 'flung' && p.state !== 'down') {
          g.seat(p, c, -1);
          audio.door();
          g.say(p, 'Never leave me again!', 1.6);
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

const pickup = (o) => ({
  text: o.text || `Pick up ${o.name}`,
  init(g) {
    const n = (this.npc = g.npc(o.who));
    const p = at(o.at);
    g.unseat(n);
    n.teleport(p.x, p.z, p.yaw ?? 0);
    n.busy = true;
  },
  target(g) { return { x: this.npc.x, z: this.npc.z, r: 4 }; },
  update(g) {
    this.sub = null;
    if (!g.playerCar) { this.sub = 'Get in a car!'; return; }
    const c = g.playerCar;
    if (dist(c.x, c.z, this.npc.x, this.npc.z) < 9) {
      if (c.speed > 4) { this.sub = 'Slow down to pick them up!'; return; }
      g.seat(this.npc, c, -1);
      audio.door();
      g.say(this.npc, o.hello || 'Go go go!', 1.6);
      return 'done';
    }
  },
});

const dropoff = (o) => ({
  text: o.text,
  init(g) { this.dest = at(o.at); this.npc = g.npc(o.who); },
  target() { return { x: this.dest.x, z: this.dest.z, r: 6 }; },
  update(g) {
    const n = this.npc;
    if (!g.playerCar || n.car !== g.playerCar) return 'done';
    const c = g.playerCar;
    if (dist(c.x, c.z, this.dest.x, this.dest.z) < 9) {
      if (c.speed > 4) { this.sub = 'Stop the car!'; return; }
      const out = g.exitSpot(c, -1);
      g.unseat(n, out.x, out.z);
      n.yaw = yawTo(this.dest.x - n.x, this.dest.z - n.z);
      audio.door();
      return 'done';
    }
  },
  cleanup(g) { this.npc.busy = false; },
});

const follow = (o) => ({
  text: o.text,
  init(g, m) {
    const s = at(o.start);
    const car = (this.car = g.spawnMissionCar(m, o.type, s.x, s.z, o.yaw ?? s.yaw, { color: o.color, name: o.carName }));
    // Clear anything parked on top of the spot.
    for (const c of g.cars) if (c !== car && !c.locked && c !== g.playerCar && Math.hypot(c.x - car.x, c.z - car.z) < 7) g.removeCar(c);
    car.locked = true;
    this.npc = g.npc(o.who);
    g.seat(this.npc, car, 1);
    const end = at(o.to);
    const nodes = [];
    let [a, b] = startNodes(car);
    nodes.push(a, b);
    for (const v of [...o.via, nearestNode(end.x, end.z)]) {
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
    return { bar: 1 - Math.min(1, d / o.maxDist), barLabel: d > o.maxDist * 0.75 ? 'LOSING HIM!' : 'DISTANCE', barColor: d > o.maxDist * 0.75 ? '#ff4a3a' : '#5fd35f' };
  },
  update(g, m, dt) {
    if (this.car.dead) return { fail: `You wrecked ${this.npc.def.name}'s ride!` };
    const f = g.focus();
    const d = dist(f.x, f.z, this.car.x, this.car.z);
    if (!this.started) {
      this.sub = g.playerCar ? null : 'Get in a car!';
      if (g.playerCar && d < 40) { this.started = true; this.ai.cruise = o.cruise || 12; }
      return;
    }
    if (o.radio && this.radioI < o.radio.length) {
      this.radioT -= dt;
      if (this.radioT <= 0) { g.radio(o.who, o.radio[this.radioI]); this.radioI++; this.radioT = 10; }
    }
    if (d > o.maxDist) { this.lose += dt; if (this.lose > 3) return { fail: `You lost ${this.npc.def.name}!` }; }
    else this.lose = Math.max(0, this.lose - dt);
    if (this.arrived && d < 35) return 'done';
  },
  cleanup(g) { this.car.ai = null; this.car.ctrl.park = true; },
});

const rabbits = (o) => ({
  text: o.text,
  init(g, m) {
    const c = at(o.near);
    this.list = [];
    for (let k = 0; k < o.count; k++) {
      const p = g.freeSpot(c.x, c.z, 18, 55);
      const r = new Rabbit(g.scene, p.x, p.z);
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
  obj() { return { timer: this.t, bar: this.got / o.count, barLabel: `RABBITS ${this.got}/${o.count}`, barColor: '#ffffff' }; },
  update(g, m, dt) {
    this.t -= dt;
    if (this.t <= 0) return { fail: 'The rabbits got away!' };
    const f = g.focus();
    for (const r of this.list) {
      if (!r.alive) continue;
      r.update(dt, f.x, f.z);
      if (dist(f.x, f.z, r.x, r.z) < (g.playerCar ? 2.8 : 1.4) && Math.abs(f.y - r.y) < 2) {
        r.remove(g.scene);
        this.got++;
        audio.pickup();
        fx.sparkle(r.x, r.y + 0.5, r.z, 0xffffff, 16);
        hud.toast(`Got a rabbit! ${this.got}/${o.count}`);
      }
    }
    if (this.got >= o.count) return 'done';
  },
});

const race = (o) => ({
  text: o.text,
  init(g, m) {
    const s = o.start;
    if (!g.playerCar) {
      const spare = g.spawnMissionCar(m, 'hatch', s.x, s.z + s.offZ, s.yaw);
      m.cars.pop(); // the player keeps this one
      g.enterCar(spare);
    }
    const pc = g.playerCar;
    pc.place(s.x, s.z + LANE * 0, s.yaw);
    pc.x = s.x; pc.z = s.z + s.offZ;
    pc.updateObb();
    const opp = (this.opp = g.spawnMissionCar(m, o.type, s.x, s.z - s.offZ, s.yaw, { color: o.color, name: o.carName }));
    opp.locked = true;
    this.npc = g.npc(o.who);
    g.seat(this.npc, opp, 1);
    if (o.passenger) { this.pass = g.npc(o.passenger); g.seat(this.pass, opp, -1); }
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
    return { bar: this.pi / this.cps.length, barLabel: ahead ? `1ST · CHECKPOINT ${this.pi}/${this.cps.length}` : `2ND · CHECKPOINT ${this.pi}/${this.cps.length}`, barColor: ahead ? '#5fd35f' : '#ff8a3a' };
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
        else { hud.showBanner('GO!', '', 'count', 900); audio.checkpoint(); g.freezeCar = false; this.ai.cruise = o.cruise; }
      }
      if (this.countdown <= 0) { g.freezeCar = false; this.ai.cruise = o.cruise; }
      return;
    }
    if (this.opp.dead) return 'done';
    const f = g.focus();
    if (!g.playerCar) this.sub = 'Get back in a car!';
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
      if (this.oi >= this.cps.length) return { fail: `${this.npc.def.name} won the race!` };
    }
    // Keep it close: Jessi eases off when she's far ahead and pushes when far behind.
    const gap = (this.oi - this.pi) * 200 + (dist(f.x, f.z, this.cps[Math.min(this.pi, this.cps.length - 1)].x, this.cps[Math.min(this.pi, this.cps.length - 1)].z) - dist(this.opp.x, this.opp.z, this.cps[Math.min(this.oi, this.cps.length - 1)].x, this.cps[Math.min(this.oi, this.cps.length - 1)].z));
    this.rubber = gap > 60 ? 0.82 : gap < -60 ? 1.12 : 1;
  },
  cleanup(g) { g.freezeCar = false; this.opp.ai = null; this.opp.ctrl.park = true; },
});

const destroy = (o) => ({
  text: o.text,
  init(g, m) {
    const f = g.focus();
    // Start the target a block or so away on a road.
    let best = null;
    for (let tries = 0; tries < 40 && !best; tries++) {
      const id = (Math.random() * 64) | 0;
      const d = dist(nodeX(id), nodeZ(id), f.x, f.z);
      if (d > 70 && d < 130) best = id;
    }
    best ??= nearestNode(f.x + 90, f.z);
    const x = nodeX(best) + 10, z = nodeZ(best) + LANE;
    const car = (this.car = g.spawnMissionCar(m, o.type, x, z, Math.PI / 2, { name: o.carName }));
    car.locked = true;
    car.damageScale = o.damageScale || 1.5;
    car.isTarget = true;
    car.bust = g.addBust(g.charDef('shame'), car);
    car.ai = new AIDriver(car, { mode: 'flee', target: () => g.focusTarget(), cruise: o.cruise || 20, avoid: false });
    this.t = o.timer;
    this.max = car.hp;
  },
  target() { return { x: this.car.x, z: this.car.z, r: 0, follow: true }; },
  markers() { return [{ type: 'enemy', x: this.car.x, z: this.car.z, edge: true }]; },
  obj() { return { timer: this.t, bar: this.car.hp / this.max, barLabel: o.barLabel || 'TARGET', barColor: '#a03ad8' }; },
  update(g, m, dt) {
    this.t -= dt;
    if (this.car.dead) { m.data.wreck = { x: this.car.x, z: this.car.z }; return 'done'; }
    if (this.t <= 0) return { fail: o.failText || 'It got away!' };
    this.sub = g.playerCar ? null : 'Get in a car!';
  },
});

const grab = (o) => ({
  text: o.text,
  init(g, m) {
    const w = m.data.wreck || at(o.at);
    const p = g.freeSpot(w.x, w.z, 3, 8);
    this.item = new Collectible(g.scene, 'record', 'quest', p.x, g.groundAt(p.x, p.z) + 1.2, p.z);
    this.item.mesh.scale.setScalar(1.8);
    m.items.push(() => g.scene.remove(this.item.mesh));
  },
  target() { return { x: this.item.x, z: this.item.z, r: 2.5 }; },
  update(g, m, dt) {
    this.item.tick(g.time, dt);
    const f = g.focus();
    if (dist(f.x, f.z, this.item.x, this.item.z) < 2.5) {
      this.item.remove();
      audio.jingle('record');
      fx.sparkle(this.item.x, this.item.y, this.item.z, 0xffd23f, 24);
      return 'done';
    }
  },
});

// ---------------------------------------------------------------------------------------------
// The missions.

export const MISSIONS = [
  {
    id: 'wake', title: 'Rise and Shine, Nicky Boy', giver: 'maurice', at: 'birch', reward: 50,
    intro: [
      ['maurice', "Nicky! Nick-a-roo! Wake up and smell the hormones, kid!"],
      ['nick', "Maurice? You're Andrew's hormone monster. Why are you on my lawn?"],
      ['maurice', "Andrew's still asleep, drooling on a pillow. I got time to kill, and you got a FACE full of potential."],
      ['nick', "That's... not a compliment, right?"],
      ['maurice', "See that wagon? Your parents' pride and joy. Take it. Drive it to Andrew's. LET'S GO, BABY!"],
      ['nick', "I'm thirteen! I can't drive!"],
      ['maurice', "And yet... you're gonna."],
    ],
    stages: [
      () => getInCar({ car: 'birchWagon', text: 'Get in the family wagon' }),
      () => goto({ to: 'gloub', radius: 11, text: "Drive to Andrew's house", inCar: true }),
    ],
    outro: [
      ['andrew', "Nick?! Is that your parents' station wagon? Are you DRIVING?"],
      ['nick', 'Maurice said it would be fine.'],
      ['andrew', 'Maurice once told me to eat a whole stick of butter like a popsicle, Nick!'],
    ],
  },
  {
    id: 'latebell', title: 'The Late Bell', giver: 'andrew', at: 'gloub', reward: 75,
    intro: [
      ['andrew', "Nick, it's 8:14. School starts at 8:15. I have a history test and I only memorized the wrong war."],
      ['nick', 'Which war?'],
      ['andrew', 'ALL OF THEM, NICK. Just drive. Fast. Like a fugitive.'],
    ],
    stages: [
      () => getInCar({ text: 'Get in a car' }),
      () => pickup({ who: 'andrew', name: 'Andrew', at: 'gloub', hello: 'Floor it!' }),
      () => goto({
        to: 'school', radius: 12, timer: 70, inCar: true, passenger: 'andrew', text: 'Get Andrew to school before the bell!', failText: 'The bell rang. Andrew is doomed.',
        radio: [['andrew', 'Is it normal to sweat this much? From my ELBOWS?'], ['andrew', 'I can feel my heartbeat in my teeth.'], ['andrew', 'If we die, tell my mom I love her. And that I broke the blender.']],
      }),
      () => dropoff({ who: 'andrew', at: 'school', text: 'Drop Andrew off' }),
    ],
    outro: [
      ['steve', 'Whoa whoa whoa! Boys! You are LATE!'],
      ['andrew', "The bell hasn't even rung yet!"],
      ['steve', "Then... I'm early? Coach Steve is never early. This is the best day of my life."],
    ],
  },
  {
    id: 'lostcoach', title: 'Coach Steve Is Lost', giver: 'steve', at: 'schoolLot', reward: 100,
    intro: [
      ['steve', 'Nick! Big emergency! I gotta drive the dodgeballs to the park, but I do not know where the park is.'],
      ['nick', "Coach, it's like four blocks away."],
      ['steve', "FOUR?! That's so many blocks! You follow me in case I get lost. If I start crying, that means I'm lost."],
    ],
    stages: [
      () => getInCar({ text: 'Get in a car' }),
      () => follow({
        who: 'steve', type: 'van', color: 0xe8e2d0, carName: 'steveVan2', start: { x: rc(4) + 34, z: rc(1) + LANE + 0.4 }, yaw: Math.PI / 2, to: 'park', via: [nodeId(5, 1), nodeId(6, 2), nodeId(5, 4), nodeId(4, 4)],
        maxDist: 70, cruise: 13, wobble: 0.12, text: "Follow Coach Steve. Don't lose him!",
        radio: ['Left! No, my OTHER left!', "Is this the park? This is a gas station. Gas station's not a park.", 'I can see trees! Parks have trees!'],
      }),
    ],
    outro: [
      ['steve', "We made it! I've never been to the park before. It's so... outside."],
      ['nick', 'You live, like, right over there.'],
      ['steve', 'Nick, I have a lot of feelings right now and I would like you to leave.'],
    ],
  },
  {
    id: 'rabbits', title: 'Abraca-dab-rabbits', giver: 'jay', at: 'jay', reward: 120,
    intro: [
      ['jay', 'Nick. My man. My magic show is in five minutes and my rabbits escaped.'],
      ['nick', 'How many rabbits?'],
      ['jay', 'Six. Garfunkel, Garfunkel, Garfunkel, Steve, Garfunkel and Lola.'],
      ['nick', '...Lola?'],
      ['jay', "Don't ask about Lola. Catch 'em before my brothers use 'em for target practice."],
    ],
    stages: [
      () => rabbits({ count: 6, near: 'jay', timer: 150, text: "Catch Jay's escaped rabbits" }),
      () => goto({ to: 'jay', radius: 4.5, text: 'Bring the rabbits back to Jay' }),
    ],
    outro: [
      ['jay', 'Ladies and gentlemen! For my first trick... SIX RABBITS! Ta-daaa!'],
      ['nick', "There's nobody here, Jay."],
      ['jay', "It's a practice crowd, Nick. Visualize it. And hey... you're my best friend. Don't tell anyone."],
    ],
  },
  {
    id: 'race', title: "Connie's Grand Prix", giver: 'jessi', at: 'glaser', reward: 150, extra: ['connie'],
    intro: [
      ['jessi', "Nick. My parents are a disaster, I'm a disaster, and my hormone monster says I need to 'let it out'."],
      ['connie', 'LET IT OUT, baby! Crush him! Leave him in the dust like a used tissue!'],
      ['nick', 'Can we maybe just talk about our feelings instead?'],
      ['jessi', 'This IS how I talk about my feelings. Race me. Loser buys the pizza.'],
    ],
    stages: [
      () => getInCar({ text: 'Get in a car' }),
      () => race({
        who: 'jessi', passenger: 'connie', type: 'hatch', color: 0xff6fb0, carName: 'jessiRacer', cruise: 25,
        start: { x: rc(3) + 30, z: rc(2), offZ: LANE, yaw: Math.PI / 2 },
        checkpoints: [[6, 2], [6, 5], [2, 5], [2, 2]],
        finish: { x: rc(3) + 32, z: rc(2) },
        text: 'Beat Jessi to the finish!',
      }),
    ],
    outro: [
      ['jessi', 'Ugh. Fine. You won. I feel weirdly... better?'],
      ['connie', "That's the RAGE, honey! Rage is self-care!"],
      ['nick', "I'm still buying the pizza, aren't I."],
    ],
  },
  {
    id: 'hearse', title: 'Hearse Case Scenario', giver: 'duke', at: 'birch', reward: 200, unlock: 'muscle',
    intro: [
      ['duke', 'Nicholas. A word. That pale, theatrical gentleman in the purple drapes has stolen my record collection.'],
      ['nick', 'The Shame Wizard took your records? Why?'],
      ['duke', "He called jazz 'shameful self-expression'. Then he drove off in that ghastly hearse. Run him off the road, young man. With swing."],
    ],
    stages: [
      () => getInCar({ text: 'Get in a car' }),
      () => destroy({ type: 'hearse', carName: 'wizardHearse', timer: 160, cruise: 21, damageScale: 1.7, barLabel: 'HEARSE', text: "Wreck the Shame Wizard's hearse!", failText: 'The hearse got away with the records!' }),
      () => grab({ at: 'birch', text: "Grab Duke's records" }),
    ],
    outro: [
      ['shame', 'You will regret this, Nicholas! Shame never dies! It just... carpools!'],
      ['duke', "Smooth as a muted trumpet. Take that red hot rod out front for a spin. I've cleared it with nobody."],
    ],
  },
  {
    id: 'dance', title: 'The Big Dance', giver: 'maurice', at: 'pizza', reward: 300, bustFails: true,
    intro: [
      ['maurice', "Nicky! Tonight's the school dance! The big one! And guess who's been keeping score all day?"],
      ['shame', 'Me. I have. You knocked over SO many mailboxes, Nicholas.'],
      ['maurice', "He's gonna hunt you down like a dog! Grab Andrew from the Galleria and get to the gym before the Wizard gets ya!"],
      ['nick', 'Why is everything today a car chase?!'],
    ],
    stages: [
      () => getInCar({ text: 'Get in a car' }),
      () => ({ ...pickup({ who: 'andrew', name: 'Andrew', at: 'mall', hello: 'Is that a HEARSE?!' }), shame: true }),
      () => ({ ...goto({ to: 'gym', radius: 10, timer: 85, inCar: true, passenger: 'andrew', text: 'Get to the dance! Lose the Shame Wizard!', radio: [['andrew', "There's a hearse behind us! Why is there ALWAYS a hearse?!"], ['andrew', 'I think I just sweated through my good shirt.']] }), shame: true }),
      () => ({ ...dropoff({ who: 'andrew', at: 'gym', text: 'Drop Andrew at the gym' }), shame: true }),
    ],
    outro: [
      ['andrew', "We made it! We're at the dance! I feel... incredible? Is this puberty? Am I a man now?"],
      ['nick', "You're sweating through your shirt again."],
      ['maurice', "Look at you two. Hormonal, sweaty, unstoppable. I've never been prouder."],
      ['shame', 'This is not over, Nicholas. There is always... next season.'],
      ['nick', 'Ugh.'],
    ],
  },
];

// ---------------------------------------------------------------------------------------------

export class MissionRunner {
  constructor(game) {
    this.g = game;
    this.index = 0;          // next mission to offer
    this.state = 'idle';     // idle | intro | running | outro | failed
    this.m = null;
    this.stage = null;
  }

  get current() { return MISSIONS[this.index] || null; }
  get active() { return this.state !== 'idle'; }

  async begin() {
    const g = this.g, def = this.current;
    if (!def || this.state !== 'idle') return;
    this.state = 'intro';
    const giver = g.npc(def.giver);
    g.player.wishX = g.player.wishZ = 0;
    g.player.vx = g.player.vz = 0;
    g.player.yaw = yawTo(giver.x - g.player.x, giver.z - g.player.z);
    giver.yaw = yawTo(g.player.x - giver.x, g.player.z - giver.z);
    g.cinematic(giver, g.player);
    await g.dialog(def.intro);
    g.endCinematic();
    hud.showBanner(def.title, `Mission ${this.index + 1} of ${MISSIONS.length}`, 'mission', 2800);
    audio.jingle('start');
    this.startMission();
  }

  startMission() {
    const def = this.current;
    this.m = { def, cars: [], items: [], data: {} };
    this.stageI = 0;
    this.state = 'running';
    this.startStage();
  }

  startStage() {
    const g = this.g;
    this.stage?.cleanup?.(g, this.m);
    this.stage = this.m.def.stages[this.stageI]();
    this.stage.init?.(g, this.m);
    g.shame.forced = !!this.stage.shame;
    if (this.stage.shame) g.shame.locked = false;
  }

  update(dt) {
    if (this.state !== 'running') return;
    const g = this.g;
    const r = this.stage.update(g, this.m, dt);
    if (r === 'done') {
      this.stageI++;
      if (this.stageI >= this.m.def.stages.length) this.complete();
      else { audio.checkpoint(); this.startStage(); }
    } else if (r && r.fail) this.fail(r.fail);
  }

  objective() {
    if (this.state !== 'running' || !this.stage) return null;
    const o = this.stage.obj?.(this.g) || {};
    return { title: this.m.def.title, text: this.stage.sub || this.stage.text, ...o };
  }
  target() {
    if (this.state !== 'running' || !this.stage) return null;
    return this.stage.altTarget?.(this.g) || this.stage.target?.(this.g) || null;
  }
  markers() { return this.state === 'running' ? this.stage?.markers?.(this.g) || [] : []; }

  cleanupMission() {
    const g = this.g;
    this.stage?.cleanup?.(g, this.m);
    this.stage = null;
    if (!this.m) return;
    for (const c of this.m.cars) {
      for (const p of [c.driver, ...c.passengers]) if (p && p !== g.player) g.unseat(p);
      g.removeCar(c);
    }
    for (const f of this.m.items) f();
    g.shame.forced = false;
    g.freezeCar = false;
    for (const k of ['andrew', 'steve', 'jessi', 'connie', 'jay', 'maurice', 'duke']) {
      const n = g.npc(k);
      if (n.car && n.car === g.playerCar) g.unseat(n, ...Object.values(g.exitSpot(n.car, -1)));
      n.busy = false;
    }
  }

  async complete() {
    const g = this.g, def = this.m.def;
    this.state = 'outro';
    this.cleanupMission();
    if (g.shame.pursuit) g.shame.endPursuit(true);
    g.shame.v = 0;
    hud.showBanner('MISSION COMPLETE!', `+${def.reward} coins`, 'good', 2400);
    audio.jingle('complete');
    g.addCoins(def.reward);
    await g.wait(1.6);
    // Bring the first speaker over for the wrap-up chat.
    const speaker = def.outro.map(([w]) => w).find((w) => w !== 'nick' && g.npc(w));
    const n = g.npc(speaker);
    if (n && !n.car) {
      const f = g.focus();
      const p = g.freeSpot(f.x, f.z, 2.5, 4);
      n.teleport(p.x, p.z, yawTo(f.x - p.x, f.z - p.z));
      if (g.playerCar) g.exitCar(true);
      g.cinematic(n, g.player);
    }
    await g.dialog(def.outro);
    g.endCinematic();
    this.index++;
    if (def.unlock) g.unlock(def.unlock);
    g.save();
    this.state = 'idle';
    this.m = null;
    if (this.index >= MISSIONS.length) {
      hud.showBanner('BRIDGETON COMPLETE!', 'You survived puberty. For now.', 'good', 5000);
      audio.jingle('complete');
    } else {
      hud.toast(`New mission: find <b>${g.charDef(this.current.giver).name}</b> <span class="bang">!</span>`);
    }
  }

  fail(reason) {
    const g = this.g;
    if (this.state !== 'running') return;
    this.state = 'failed';
    audio.jingle('fail');
    hud.showBanner('MISSION FAILED', reason, 'bad', 0);
    this.cleanupMission();
    g.shame.clear();
    this.failT = 0;
  }

  // While failed: E retries from the mission's start, moving on cancels.
  updateFailed(dt) {
    if (this.state !== 'failed') return;
    this.failT += dt;
    const g = this.g;
    hud.setPrompt(this.failT > 0.8 ? '<b>E</b> Retry mission &nbsp; · &nbsp; <b>Q</b> Give up' : '');
    if (this.failT > 0.8 && g.input.pressed('interact')) this.retry();
    else if (this.failT > 0.8 && (g.input.keyPressed('KeyQ') || this.failT > 15)) this.abort();
  }

  retry() {
    const g = this.g;
    hud.hideBanner();
    hud.setPrompt('');
    const def = this.current;
    const p = lm(def.at);
    if (g.playerCar) g.exitCar(true);
    g.player.teleport(p.x - Math.sin(p.yaw) * -2, p.z - Math.cos(p.yaw) * -2, p.yaw);
    g.cam.snapNext = true;
    g.player.state = 'normal';
    hud.showBanner(def.title, 'Try again!', 'mission', 2000);
    audio.jingle('start');
    this.startMission();
  }

  abort() {
    hud.hideBanner();
    hud.setPrompt('');
    this.state = 'idle';
    this.m = null;
  }

  onBusted() {
    if (this.state === 'running' && this.m.def.bustFails) this.fail('The Shame Wizard caught you!');
  }
}
