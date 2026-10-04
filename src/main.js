// Bigmouth & Run — glue: builds the world, runs the fixed-step simulation, routes input to the
// player or their car, and wires up missions, shame, pickups and the HUD.

import { THREE, initGfx, renderer, scene, camera, followSun, tickSky } from './gfx.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { buildTown, parkedCars, tickTown } from './world/town.js';
import { finalizeProps, tickProps, breakProp, propsNear, props as allProps } from './world/props.js';
import { lm, landmarks, routeAim, rc, N, LANE, RHW, CURB, nodeX, nodeZ, neighbors, blockInterior, BOUND, isRoad } from './world/layout.js';
import { groundAt, queryBlocks, contains, circleVsObb } from './world/collision.js';
import { Car, collideCars } from './actors/car.js';
import { Character } from './actors/character.js';
import { CHARS, buildBust, buildCharacter, randomPed } from './actors/models.js';
import { AIDriver } from './actors/drivers.js';
import { spawnPeds } from './actors/peds.js';
import { initCoins, placeCoin, burstCoins, tickCoins, Collectible } from './actors/pickups.js';
import { fx } from './game/fx.js';
import { hud, renderPortrait } from './game/hud.js';
import { CamRig } from './game/camera.js';
import { Shame } from './game/shame.js';
import { MissionRunner, MISSIONS } from './game/missions.js';
import { Bang, Beacon, GuideArrow } from './game/markers.js';
import { clamp, dist, yawTo, pick, mulberry32 } from './util.js';

const STEP = 1 / 60;
const SAVE_KEY = 'bigmouth-and-run-v1';
const params = new URLSearchParams(location.search);
const TEST = params.has('test');

const HOMES = { maurice: ['birch', 2.2, 0], andrew: ['gloub', 0, 0], steve: ['schoolLot', 0, 0], jay: ['jay', 0, 0], jessi: ['glaser', 0, 0], connie: ['glaser', 1.6, 0.8], duke: ['birch', -4.8, 1.8] };
const MAP_LABELS = [['Birches', 'birch'], ['Gloubermans', 'gloub'], ['Middle School', 'school'], ['Galleria', 'mall'], ['Teenage Pizza', 'pizza'], ['Park', 'park'], ["Gas 'n' Gas", 'gas'], ['Cineplex', 'cinema'], ['Glaser Apts', 'glaser'], ["Jay's", 'jay'], ["Coach's", 'steve'], ['Cemetery', 'cemetery'], ['Construction', 'construct'], ['Water Tower', 'tower'], ['Football Field', 'field']];
const OUCH = ['Ow!', 'Hey!', 'My spine!', 'Rude!', "I'm calling your mom!", 'Ugh, teens!', 'My hip!', 'Why?!'];
const GETUP = ['I hate this town.', 'My back...', 'Kids these days!', 'Ow ow ow.', "I'm fine. I'm FINE."];
const CARJACK = ['Hey! My car!', 'That kid stole my car!', 'Not again!', 'I just washed it!'];
const CHATTER = {
  maurice: ["Nicky! Let's go knock over a mailbox!", "You smell that? That's PUBERTY, baby!", 'Do it. Whatever it is. DO IT.', "I'm proud of you and I don't even know why."],
  andrew: ['I think I have a fever. Or feelings. Same thing?', 'Why is my voice doing that?', "My dad's gonna kill me. Again."],
  steve: ['Coach Steve! That\'s me!', 'I found a penny. Best day.', 'Dodgeball is a lifestyle, Nick.'],
  jay: ['Pick a card. Any card. Not that one.', 'I can make your dignity disappear.', 'Abracadabra, baby.'],
  jessi: ['Ugh. Everything is so much.', "Don't talk to me, I'm brooding.", 'Do you ever just want to scream into a lake?'],
  connie: ['Feel the RAGE, honey!', "Mmm, I love a sulky teen.", "Somebody's getting moody!"],
  duke: ['Mm, swing it, young man.', 'In my day, we just had jazz.', 'It don\'t mean a thing if it ain\'t got that swing.'],
};

function blockCenter(i, j) { const b = blockInterior(i, j); return { x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 }; }

class Game {
  constructor() {
    this.cars = [];
    this.named = {};
    this.npcs = {};
    this.peds = [];
    this.coins = 0;
    this.time = 0;
    this.frame = 0;
    this.acc = 0;
    this.hooks = [];
    this.paused = false;
    this.started = false;
    this.playerCar = null;
    this.jumps = 0;
    this.kickT = 0;
    this.kickHitT = -1;
    this.stomping = false;
    this.freezeCar = false;
    this.inDialog = false;
    this.talker = null;
    this.input = input;
    this.got = { records: new Set(), mosquitoes: new Set() };
    this.unlocked = new Set();
    this.autoDialog = TEST;
  }

  async init() {
    initGfx(document.getElementById('app'));
    this.scene = scene;
    input.init(renderer.domElement);
    input.onUnlock = () => { if (this.started && !TEST) this.pause(true); };
    hud.init();
    fx.init(scene);
    try { await Promise.race([document.fonts.load('40px "Luckiest Guy"'), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* fall back to Impact */ }
    setLoading('Building Bridgeton…');
    await frame();
    buildTown(scene);
    finalizeProps(scene);
    initCoins(scene);
    hud.buildBaseMap();
    this.placeWorldCoins();
    setLoading('Gassing up the cars…');
    await frame();
    for (const pc of parkedCars) {
      const car = new Car(pc.type, { color: pc.color, name: pc.name });
      car.place(pc.x, pc.z, pc.yaw);
      car.home = pc;
      this.addCar(car);
      if (pc.name) this.named[pc.name] = car;
    }
    this.spawnTraffic(22);
    setLoading('Waking up the neighbours…');
    await frame();
    this.peds = spawnPeds(scene, 34);
    for (const key of Object.keys(HOMES)) {
      const c = new Character(CHARS[key]);
      c.key = key;
      scene.add(c.root);
      this.npcs[key] = c;
    }
    this.player = new Character(CHARS.nick);
    this.player.key = 'nick';
    scene.add(this.player.root);
    this.records = this.recordSpots().map(([x, y, z], i) => new Collectible(scene, 'record', i, x, y, z));
    this.mosquitoes = this.mosquitoSpots().map(([x, y, z], i) => new Collectible(scene, 'mosquito', i, x, y, z));
    this.bang = new Bang(scene);
    this.beacon = new Beacon(scene);
    this.arrow = new GuideArrow(scene);
    this.shame = new Shame(this);
    this.missions = new MissionRunner(this);
    this.cam = new CamRig(camera);
    this.load();
    this.placeNpcs(true);
    // Start on the sidewalk in front of the Birches', looking at the house and Maurice.
    const b = lm('birch');
    const bfx = Math.sin(b.yaw), bfz = Math.cos(b.yaw);
    this.player.teleport(b.x + bfx * 5 - 2, b.z + bfz * 5, b.yaw + Math.PI);
    this.cam.yaw = b.yaw + Math.PI;
    this.cam.pitch = 0.28;
    setLoading('Drawing big mouths…');
    await frame();
    for (const key of Object.keys(HOMES)) hud.portraits[key] = renderPortrait(renderer, this.npcs[key].model);
    hud.portraits.nick = renderPortrait(renderer, this.player.model);
    const wiz = new Character(CHARS.shame);
    hud.portraits.shame = renderPortrait(renderer, wiz.model);
    this.applySaveToWorld();
    hud.setCoins(this.coins);
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    window.__ready = true;
    setLoading(null);
    document.getElementById('play').disabled = false;
    if (TEST) this.start();
  }

  start() {
    if (this.started) return;
    this.started = true;
    document.getElementById('title').classList.add('gone');
    document.body.classList.add('playing');
    audio.init();
    if (!TEST) { input.wantLock = true; input.lock(); }
    if (this.missions.index === 0 && !TEST) setTimeout(() => hud.toast('Talk to <b>Maurice</b> on the lawn <span class="bang">!</span> — press <b>E</b>'), 1200);
  }

  pause(on) {
    if (TEST) return;
    this.paused = on;
    document.getElementById('pause').classList.toggle('show', on);
    audio.engine(false, 0, 0);
    audio.skid(0);
    audio.horn(false);
    if (!on) { input.wantLock = true; input.lock(); this.last = performance.now(); }
  }

  // ------------------------------------------------------------------------------------------
  // World population

  addCar(car) { this.cars.push(car); scene.add(car.root); car.sync(0); return car; }
  removeCar(car) {
    const i = this.cars.indexOf(car);
    if (i >= 0) this.cars.splice(i, 1);
    if (car === this.playerCar) this.exitCar(true);
    for (const p of [car.driver, ...car.passengers]) if (p && p.car === car) this.unseat(p);
    scene.remove(car.root);
  }

  addBust(def, car) {
    let obj;
    const s = car.spec;
    const seatY = s.tall ? s.wheelR * 0.95 + 0.9 : s.wheelR * 0.95 + s.bodyH;
    const z = s.tall ? s.len / 2 - 1.6 : -0.05;
    if (def.kind === 'wizard' || def.kind === 'monster') {
      const m = buildCharacter(def);
      obj = m.root;
      obj.scale.setScalar(0.72);
      obj.position.set(s.wid * 0.22, seatY - (def.kind === 'wizard' ? 0.75 : 0.35), z);
      obj.userData.model = m;
    } else {
      obj = buildBust(def);
      obj.position.set(s.wid * 0.22, seatY, z);
    }
    car.tilt.add(obj);
    car.driverBust = obj;
    return obj;
  }

  spawnTraffic(n) {
    const r = Math.random;
    for (let k = 0; k < n; k++) this.spawnTrafficCar(r, null);
  }
  spawnTrafficCar(r = Math.random, awayFrom = null) {
    for (let tries = 0; tries < 30; tries++) {
      const a = (r() * (N + 1) * (N + 1)) | 0;
      const nb = neighbors(a);
      const b = nb[(r() * nb.length) | 0];
      const dx = nodeX(b) - nodeX(a), dz = nodeZ(b) - nodeZ(a), l = Math.hypot(dx, dz);
      const t = 12 + r() * (l - 24);
      const x = nodeX(a) + (dx / l) * t + (-dz / l) * LANE, z = nodeZ(a) + (dz / l) * t + (dx / l) * LANE;
      if (awayFrom && dist(x, z, awayFrom.x, awayFrom.z) < 120) continue;
      if (this.cars.some((c) => dist(c.x, c.z, x, z) < 14)) continue;
      const type = pick(['sedan', 'sedan', 'hatch', 'hatch', 'wagon', 'pickup', 'van', 'sedan', 'icecream', 'pickup', 'hatch', 'bus'], r);
      if (type === 'bus' && this.cars.some((c) => c.type === 'bus' && c.traffic)) continue;
      const car = new Car(type);
      car.place(x, z, yawTo(dx, dz));
      car.traffic = true;
      this.addBust(randomPed(r), car);
      car.ai = new AIDriver(car, { mode: 'traffic', cruise: type === 'bus' ? 9 : 10 + r() * 4 });
      return this.addCar(car);
    }
    return null;
  }

  ensureNamedCar(name) {
    let car = this.named[name];
    if (car && !car.dead && this.cars.includes(car)) return car;
    const pc = parkedCars.find((p) => p.name === name);
    if (!pc) return null;
    if (car) this.removeCar(car);
    car = new Car(pc.type, { color: pc.color, name: pc.name });
    car.place(pc.x, pc.z, pc.yaw);
    this.addCar(car);
    this.named[name] = car;
    return car;
  }

  spawnMissionCar(m, type, x, z, yaw, opts = {}) {
    const car = new Car(type, opts);
    car.place(x, z, yaw);
    this.addCar(car);
    m.cars.push(car);
    return car;
  }

  placeWorldCoins() {
    const r = mulberry32(42);
    // Lines along sidewalks.
    for (let k = 0; k < 26; k++) {
      const i = (r() * N) | 0, j = (r() * N) | 0;
      const b = blockInterior(i, j);
      const side = (r() * 4) | 0;
      const off = 1.6;
      for (let c = 0; c < 7; c++) {
        const t = 10 + c * 3.2 + r() * 0.3;
        const [x, z] = side === 0 ? [b.x0 + t, b.z0 - off] : side === 1 ? [b.x1 - t, b.z1 + off] : side === 2 ? [b.x0 - off, b.z0 + t] : [b.x1 + off, b.z1 - t];
        placeCoin(x, CURB + 0.75, z);
      }
    }
    // Arcs over the construction ramps and the park jump.
    const cs = blockCenter(6, 4);
    for (let c = 0; c < 9; c++) placeCoin(cs.x - 12 + 6 + c * 2.2, CURB + 2.6 + Math.sin((c / 8) * Math.PI) * 3.5, cs.z);
    const pk = blockCenter(3, 3);
    for (let c = 0; c < 7; c++) placeCoin(pk.x + 22, CURB + 2.2 + Math.sin((c / 6) * Math.PI) * 2.5, pk.z - 20 - c * 2.2);
    // A row up the bleachers.
    const fc = blockCenter(5, 0);
    for (let k = 0; k < 5; k++) placeCoin(fc.x + 22 + k * 1.1, CURB + 0.6 * (k + 1) + 0.8, fc.z - 6 + k * 3);
    // On the construction deck and atop the gazebo deck.
    for (let k = 0; k < 6; k++) placeCoin(cs.x + 3 + (k % 3) * 2.5, CURB + 3.2, cs.z - 2 + Math.floor(k / 3) * 4);
  }

  recordSpots() {
    const fc = blockCenter(5, 0), cs = blockCenter(6, 4), cn = blockCenter(2, 1), pk = blockCenter(3, 3), ce = blockCenter(5, 6);
    const bg = lm('birchGarage'), jt = lm('jayTramp');
    return [
      [fc.x + 26.4, CURB + 3.0 + 1.1, fc.z + 2],
      [cs.x + 6, CURB + 2.4 + 1.1, cs.z + 3],
      [cn.x + 8, CURB + 1.2, cn.z - 30],
      [pk.x - 15, CURB + 2.2 + 1.1, pk.z + 15],
      [ce.x + 3, CURB + 1.2, ce.z + 29.5],
      [bg.x, CURB + 3.2 + 1.0, bg.z],
      [jt.x, CURB + 6.0, jt.z],
    ];
  }
  mosquitoSpots() {
    const c = (i, j, dx, dz, y = 2.2) => { const b = blockCenter(i, j); return [b.x + dx, CURB + y, b.z + dz]; };
    return [c(3, 0, -4, -2), c(4, 3, 4, 0, 2.6), c(2, 2, 6, 14), c(5, 6, -10, 0), c(5, 0, 0, -4), c(3, 3, 2, 14), c(3, 2, 0, -28, 2.0)];
  }

  // ------------------------------------------------------------------------------------------
  // Seats

  seat(ch, car, side) {
    if (ch.car) this.unseat(ch);
    const s = car.spec;
    ch.state = 'seated';
    ch.car = car;
    ch.vx = ch.vz = ch.vy = 0;
    car.tilt.add(ch.root);
    const seatY = s.tall ? s.wheelR * 0.95 + 0.9 : s.wheelR * 0.95 + s.bodyH;
    const z = s.tall ? s.len / 2 - 1.6 : -0.05;
    ch.root.position.set(side * s.wid * 0.22, seatY + 0.12 - ch.model.legLen, z + 0.12);
    ch.root.rotation.set(0, 0, 0);
    if (ch.def.kind === 'monster') { ch.root.scale.setScalar(0.8); ch.root.position.y = seatY - 0.3; }
    if (side > 0) {
      car.driver = ch;
      if (car.driverBust) { car.tilt.remove(car.driverBust); car.driverBust = null; }
    } else car.passengers.push(ch);
    ch.seatSide = side;
  }

  unseat(ch, x, z) {
    const car = ch.car;
    if (car) {
      if (car.driver === ch) car.driver = null;
      car.passengers = car.passengers.filter((p) => p !== ch);
      if (x === undefined) { const e = this.exitSpot(car, ch.seatSide || 1); x = e.x; z = e.z; }
    }
    ch.car = null;
    ch.root.scale.setScalar(1);
    scene.add(ch.root);
    ch.state = 'normal';
    if (x !== undefined) ch.teleport(x, z, car ? car.yaw : ch.yaw);
  }

  // A clear spot beside a car to step out onto.
  exitSpot(car, side = 1) {
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    const lx = fz, lz = -fx; // the car's left (+x local)
    const w = car.spec.wid / 2 + 0.9, l = car.spec.len / 2 + 1.0;
    const tries = [[side * w, 0], [-side * w, 0], [0, l], [0, -l], [side * w, l * 0.6], [-side * w, -l * 0.6]];
    for (const [a, b] of tries) {
      const x = car.x + lx * a + fx * b, z = car.z + lz * a + fz * b;
      if (this.spotFree(x, z, car.y)) return { x, z };
    }
    return { x: car.x + lx * w, z: car.z + lz * w };
  }
  spotFree(x, z, y = 0.15) {
    const list = queryBlocks(x - 0.5, z - 0.5, x + 0.5, z + 0.5, []);
    for (const b of list) if (b.top > y + 0.5 && contains(b, x, z)) return false;
    for (const c of this.cars) if (circleVsObb(x, z, 0.4, c.obb, {})) return false;
    return true;
  }
  freeSpot(cx, cz, rMin, rMax) {
    for (let k = 0; k < 60; k++) {
      const a = Math.random() * Math.PI * 2, r = rMin + Math.random() * (rMax - rMin);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (Math.abs(x) > BOUND - 5 || Math.abs(z) > BOUND - 5) continue;
      if (this.spotFree(x, z, 0.15) && groundAt(x, z, 1, 0.5) < 0.5) return { x, z };
    }
    return { x: cx, z: cz };
  }
  groundAt(x, z) { return groundAt(x, z, 0.2, 0.6); }

  // Test/debug helper: move whatever the player is controlling.
  debugWarp(x, z, yaw = 0) {
    if (this.playerCar) this.playerCar.place(x, z, yaw);
    else this.player.teleport(x, z, yaw);
    this.cam.snapNext = true;
  }

  enterCar(car) {
    if (car.locked) { hud.toast("That one's busy!"); return; }
    if (car.dead) return;
    if (car.driverBust) {
      // Carjacking: the driver tumbles out and is not happy about it.
      car.tilt.remove(car.driverBust);
      car.driverBust = null;
      const ped = this.peds.reduce((best, p) => (!best || dist(p.char.x, p.char.z, this.player.x, this.player.z) > dist(best.char.x, best.char.z, this.player.x, this.player.z) ? p : best), null);
      if (ped && ped.char.state !== 'seated') {
        const e = this.exitSpot(car, 1);
        ped.char.teleport(e.x, e.z);
        ped.char.state = 'normal';
        ped.char.fling(Math.cos(car.yaw) * 4, 4, -Math.sin(car.yaw) * 4);
        this.say(ped.char, pick(CARJACK), 2);
      }
      this.shame.add(8);
    }
    car.ai = null;
    car.traffic = false;
    this.seat(this.player, car, 1);
    this.playerCar = car;
    car.ctrl.park = false;
    audio.door();
  }

  exitCar(force = false) {
    const car = this.playerCar;
    if (!car) return;
    const fast = car.speed > 7 && !force;
    const spot = this.exitSpot(car, 1);
    this.unseat(this.player, spot.x, spot.z);
    this.player.yaw = car.yaw;
    this.playerCar = null;
    car.ctrl.park = true;
    car.ctrl.throttle = 0;
    audio.door();
    audio.engine(false, 0, 0);
    audio.skid(0);
    audio.horn(false);
    if (fast) this.player.fling(car.vx * 0.55, 4, car.vz * 0.55);
  }

  // ------------------------------------------------------------------------------------------
  // Queries used by AI and physics

  focus() {
    if (this.playerCar) { const c = this.playerCar; return { x: c.x, y: c.y, z: c.z, yaw: c.yaw, car: c, speed: c.speed }; }
    const p = this.player;
    return { x: p.x, y: p.y, z: p.z, yaw: p.yaw, car: null, speed: p.speed, height: p.height };
  }
  focusTarget() {
    const o = this.playerCar || this.player;
    return { x: o.x, z: o.z, vx: o.vx, vz: o.vz };
  }

  obstacleAhead(car, range) {
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    const halfW = car.spec.wid / 2 + 0.6;
    let best = null;
    const test = (x, z, r, isPlayer) => {
      const dx = x - car.x, dz = z - car.z;
      const along = dx * fx + dz * fz - car.spec.len / 2 - r;
      if (along < -1.5 || along > range) return;
      const lat = Math.abs(dx * -fz + dz * fx);
      if (lat > halfW + r) return;
      const d = Math.max(0, along);
      if (!best || d < best.dist) best = { dist: d, isPlayer };
    };
    const R = range + 8;
    for (const o of this.cars) {
      if (o === car || Math.abs(o.x - car.x) > R || Math.abs(o.z - car.z) > R) continue;
      // Ignore cars pulling away from us faster than we're going.
      const ov = o.vx * fx + o.vz * fz;
      if (ov > car.forwardSpeed + 1.5) continue;
      // Ignore oncoming traffic in its own lane (heading the other way).
      if (o.traffic && Math.cos(o.yaw - car.yaw) < -0.7) continue;
      test(o.x, o.z, Math.min(o.spec.wid, o.spec.len) / 2, o === this.playerCar);
    }
    if (!this.playerCar && this.player.state === 'normal') test(this.player.x, this.player.z, 0.5, true);
    for (const p of this.peds) {
      const c = p.char;
      if (c.state !== 'normal' || Math.abs(c.x - car.x) > R || Math.abs(c.z - car.z) > R) continue;
      test(c.x, c.z, 0.4, false);
    }
    return best;
  }

  carThreat(x, z) {
    for (const c of this.cars) {
      const sp = c.speed;
      if (sp < 7) continue;
      const dx = x - c.x, dz = z - c.z;
      if (Math.abs(dx) > 30 || Math.abs(dz) > 30) continue;
      const vx = c.vx / sp, vz = c.vz / sp;
      const along = dx * vx + dz * vz, lat = dx * -vz + dz * vx;
      if (along > 0 && along < sp * 0.8 + 3 && Math.abs(lat) < 2.4) {
        const s = lat >= 0 ? 1 : -1;
        return { dx: -vz * s, dz: vx * s };
      }
    }
    return null;
  }

  carRoofAt(x, z, ytop) {
    let best = null;
    for (const c of this.cars) {
      if (Math.abs(c.x - x) > c.radius || Math.abs(c.z - z) > c.radius) continue;
      const dx = x - c.x, dz = z - c.z;
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      if (Math.abs(dx * fx + dz * fz) > c.spec.len / 2 || Math.abs(dx * -fz + dz * fx) > c.spec.wid / 2) continue;
      const top = c.y + c.height;
      if (top <= ytop && (!best || top > best.top)) best = { top, car: c };
    }
    return best;
  }

  allChars() {
    const out = [];
    if (!this.playerCar) out.push(this.player);
    for (const p of this.peds) out.push(p.char);
    for (const k in this.npcs) out.push(this.npcs[k]);
    return out;
  }

  npc(key) { return key === 'nick' ? this.player : this.npcs[key]; }
  charDef(key) { return CHARS[key]; }

  // ------------------------------------------------------------------------------------------
  // Events

  breakProp(p, vx, vz, car) { breakProp(p, vx, vz, this); }
  onPropBroken(p, vx, vz) {
    audio.smash();
    if (p.def.coins) burstCoins(p.x, 0.4, p.z, p.def.coins, vx, vz);
    this.shame.add(p.def.shame * (this.playerCar ? 1.2 : 0.7));
    if (p.type === 'hydrant') for (let k = 0; k < 6; k++) fx.splash(p.x, p.z);
    if (p.type === 'pump') fx.explosion(p.x, 0.5, p.z);
  }

  onCarImpact(a, b, impact, cx, cz) {
    const pc = this.playerCar;
    const involved = a === pc || b === pc;
    const f = this.focus();
    const near = dist(cx, cz, f.x, f.z) < 60;
    if (near) audio.crash(Math.min(1, impact / 18) * (involved ? 1 : 0.5));
    if (impact > 6 && near) fx.sparks(cx, 0.8, cz, Math.min(14, impact | 0));
    if (involved) {
      this.cam.shake = Math.min(1.2, this.cam.shake + impact * 0.05);
      const other = a === pc ? b : a;
      if (other) {
        if (other.isHearse) this.shame.onRam(other, impact);
        else if (!other.isTarget && !other.locked) this.shame.add(Math.min(9, impact * 0.55));
      }
    }
  }
  onCarLanded(car, impact) {
    if (car === this.playerCar) { audio.thud(); this.cam.shake = Math.min(1, this.cam.shake + impact * 0.03); }
    fx.dust(car.x, car.z, 6);
  }
  onCarDestroyed(car) {
    const f = this.focus();
    if (dist(car.x, car.z, f.x, f.z) < 80) audio.crash(1);
    burstCoins(car.x, 1, car.z, 8);
    if (car === this.playerCar) {
      const c = car;
      for (const p of car.passengers.slice()) { this.unseat(p); p.fling((Math.random() - 0.5) * 6, 6, (Math.random() - 0.5) * 6); }
      this.exitCar(true);
      this.player.fling(-Math.sin(c.yaw) * 3 + (Math.random() - 0.5) * 4, 7, -Math.cos(c.yaw) * 3);
      hud.showBanner('WRECKED!', '', 'bad', 1600);
    } else {
      for (const p of [car.driver, ...car.passengers]) if (p) { this.unseat(p); p.fling((Math.random() - 0.5) * 6, 6, (Math.random() - 0.5) * 6); }
      if (car.driverBust) {
        car.tilt.remove(car.driverBust); car.driverBust = null;
      }
      if (car.traffic || (car.home && !car.name)) this.shame.add(12);
      car.ai = null;
    }
    car.deadT = 0;
  }
  onCharHit(ch, car, speed) {
    const byPlayer = car === this.playerCar;
    audio.ouch();
    audio.thud();
    if (ch === this.player) { hud.flashColor('rgba(255,80,60,0.35)'); return; }
    if (byPlayer) this.shame.add(ch.key ? 14 : 18);
    if (Math.random() < 0.8) this.say(ch, pick(OUCH), 1.6);
  }
  onGetUp(ch) {
    if (ch !== this.player && Math.random() < 0.35 && dist(ch.x, ch.z, this.player.x, this.player.z) < 30) this.say(ch, pick(GETUP), 1.8);
  }
  onBodyBounce(ch) { if (dist(ch.x, ch.z, this.focus().x, this.focus().z) < 40) audio.thud(); }
  onBounce(ch) { if (ch === this.player) audio.boing(); }
  onLand(ch, v) {
    if (ch !== this.player) return;
    if (this.stomping) {
      this.stomping = false;
      audio.crash(0.4);
      this.cam.shake = 0.6;
      fx.dust(ch.x, ch.z, 12, ch.y + 0.2);
      this.areaHit(ch.x, ch.z, ch.y, 2.6, 0, 0, true);
    } else fx.dust(ch.x, ch.z, 3, ch.y + 0.1);
  }
  onHonk(car) {
    const f = this.focus();
    if (dist(car.x, car.z, f.x, f.z) < 40) { audio.tone(330, 0.25, 'square', 0.05); audio.tone(415, 0.25, 'square', 0.04); }
  }

  collectCoin(c) {
    this.coins += c.value;
    hud.setCoins(this.coins);
    hud.bumpCoins();
    audio.coin();
  }
  addCoins(n) { this.coins += n; hud.setCoins(this.coins); hud.bumpCoins(); }

  say(target, text, secs = 2) { hud.say(target, text, secs); }
  radio(who, text) {
    hud.toast(`<img class="radio-face" src="${hud.portraits[who] || ''}"><b>${CHARS[who]?.name || who}:</b> ${text}`, 'radio');
    for (let k = 0; k < 8; k++) setTimeout(() => audio.talk(CHARS[who]?.voice || 300), k * 70);
  }

  setTalker(who) { this.talker = who; }

  async dialog(lines) {
    this.inDialog = true;
    await hud.runDialog(lines.map(([who, text]) => ({ who, text })), this);
    this.inDialog = false;
  }
  cinematic(a, b) { this.cam.frame(a, b); hud.letterbox(true); this.inDialog = true; }
  endCinematic() { this.cam.release(); hud.letterbox(false); this.inDialog = false; }
  onFrame(fn) { this.hooks.push(fn); }
  offFrame(fn) { this.hooks = this.hooks.filter((h) => h !== fn); }
  wait(secs) {
    return new Promise((resolve) => {
      let t = 0;
      const fn = (dt) => { t += dt; if (t >= secs) { this.offFrame(fn); resolve(); } };
      this.onFrame(fn);
    });
  }

  unlock(what) {
    this.unlocked.add(what);
    if (what === 'muscle') {
      this.spawnMuscle();
      hud.toast("Unlocked: <b>Maurice's Hormone Rocket</b> — parked outside the Birches'");
    }
  }
  spawnMuscle() {
    if (this.named.muscle && this.cars.includes(this.named.muscle)) return;
    const d = lm('birchDrive');
    const car = new Car('muscle', { name: 'muscle' });
    car.place(d.x + 7, rc(3) + LANE + 0.6, Math.PI / 2);
    this.addCar(car);
    this.named.muscle = car;
  }

  // ------------------------------------------------------------------------------------------
  // Save

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ mission: this.missions.index, coins: this.coins, records: [...this.got.records], mosquitoes: [...this.got.mosquitoes], unlocked: [...this.unlocked] }));
    } catch (e) { /* private mode: progress just won't persist */ }
  }
  load() {
    if (params.has('mission')) this.missions.index = +params.get('mission');
    if (params.has('fresh')) return;
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!s) return;
      this.missions.index = Math.min(MISSIONS.length, s.mission || 0);
      this.coins = s.coins || 0;
      this.got.records = new Set(s.records || []);
      this.got.mosquitoes = new Set(s.mosquitoes || []);
      this.unlocked = new Set(s.unlocked || []);
    } catch (e) { /* corrupt save: start fresh */ }
    if (params.has('mission')) this.missions.index = +params.get('mission');
  }
  applySaveToWorld() {
    for (const r of this.records) if (this.got.records.has(r.id)) r.remove();
    for (const m of this.mosquitoes) if (this.got.mosquitoes.has(m.id)) m.remove();
    if (this.unlocked.has('muscle')) this.spawnMuscle();
  }
  resetSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  }

  // ------------------------------------------------------------------------------------------
  // NPCs stand at home, or wherever their mission is offered from.

  placeNpcs(force = false) {
    const cur = this.missions.state === 'idle' ? this.missions.current : null;
    for (const [key, [where, ox, oz]] of Object.entries(HOMES)) {
      const n = this.npcs[key];
      if (n.busy || n.car) continue;
      let spot = where, dx = ox, dz = oz;
      if (cur && cur.giver === key) { spot = cur.at; dx = 0; dz = 0; }
      if (cur && cur.extra?.includes(key)) { spot = cur.at; }
      const id = `${spot}:${dx}:${dz}`;
      if (n.spot === id && !force && n.state === 'normal' && dist(n.x, n.z, n.homeX, n.homeZ) < 6) continue;
      if (n.state !== 'normal' && !force) continue;
      // Don't pop people around in front of the player unless they're needed for a mission.
      const needed = cur && (cur.giver === key || cur.extra?.includes(key));
      if (!force && !needed && dist(n.x, n.z, this.player.x, this.player.z) < 50) continue;
      const p = lm(spot);
      const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
      n.homeX = p.x + fz * dx + fx * dz; n.homeZ = p.z - fx * dx + fz * dz;
      n.teleport(n.homeX, n.homeZ, p.yaw);
      n.spot = id;
    }
  }

  // ------------------------------------------------------------------------------------------
  // The loop

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    input.poll();
    if (this.started && !this.paused) this.update(dt);
    else if (!this.started) this.idleTitle(dt);
    renderer.render(scene, camera);
    input.endFrame();
    this.frame++;
    window.__frame = this.frame;
  }

  idleTitle(dt) {
    this.time += dt;
    const b = lm('birch');
    const a = this.time * 0.08;
    camera.position.set(b.x + Math.sin(a) * 40, 22, b.z + Math.cos(a) * 40);
    camera.lookAt(b.x, 2, b.z);
    followSun(b.x, b.z);
    tickSky(this.time, camera.position);
    this.syncAll(dt, true);
  }

  update(dt) {
    this.time += dt;
    for (const h of this.hooks.slice()) h(dt);
    this.handleOneShots();
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 4) { this.fixedStep(STEP); this.acc -= STEP; n++; }
    if (n === 4) this.acc = 0;
    this.syncAll(dt, false);
    this.missions.update(dt);
    this.missions.updateFailed(dt);
    this.shame.update(dt);
    this.tickPickups(dt);
    const f = this.focus();
    tickProps(dt, f.x, f.z);
    fx.tick(dt);
    tickTown(this.time);
    this.updateMarkers();
    this.cam.update(dt, { ...f, autoTurn: false, lookBack: input.down('lookBack') }, this.inDialog ? null : input.look(), this.cars);
    if (this.aerial) { camera.position.set(f.x, 420, f.z + 260); camera.lookAt(f.x, 0, f.z); camera.fov = 50; camera.updateProjectionMatrix(); }
    followSun(f.x, f.z);
    tickSky(this.time, camera.position);
    this.updateHud();
    this.updateAudio();
    this.recycleTraffic(dt);
    this.saveT = (this.saveT || 0) + dt;
    if (this.saveT > 30) { this.saveT = 0; this.save(); }
  }

  handleOneShots() {
    if (input.pressed('mute')) { audio.setMuted(!audio.muted); hud.toast(audio.muted ? 'Sound off' : 'Sound on'); }
    if (input.pressed('map')) { this.bigMap = !this.bigMap; hud.toggleBigMap(this.bigMap, this); }
    if (input.keyPressed('KeyP') && !TEST) { this.pause(true); return; }
    if (this.inDialog || this.missions.state === 'failed') return;
    if (input.pressed('reset')) { this.resetToRoad(); return; }
    const p = this.player;
    if (this.playerCar) {
      if (input.pressed('interact')) this.exitCar();
      return;
    }
    if (p.state !== 'normal') return;
    if (input.pressed('jump')) {
      if (p.onGround) { p.jump(8.6); this.jumps = 1; audio.jump(); }
      else if (this.jumps < 2) { p.vy = 8.0; this.jumps = 2; audio.jump(); this.spinT = 0.4; }
    }
    if (input.pressed('attack') && this.kickT <= 0) {
      if (!p.onGround && p.y > groundAt(p.x, p.z, p.y, 0.45) + 0.8) { p.vy = -18; this.stomping = true; audio.kick(); }
      else { p.anim.kick = 1; this.kickT = 0.38; this.kickHitT = 0.11; audio.kick(); }
    }
    if (input.pressed('interact')) this.interact();
  }

  // Stuck somewhere silly? R puts you (and your car) back on the nearest road.
  resetToRoad() {
    const f = this.focus();
    const i = Math.round((f.x + 280) / 80), j = Math.round((f.z + 280) / 80);
    const rx = clamp(i, 0, N) * 80 - 280, rz = clamp(j, 0, N) * 80 - 280;
    let x, z, yaw;
    // Right-hand lanes: heading +z keeps to -x, heading +x keeps to +z.
    if (Math.abs(f.x - rx) < Math.abs(f.z - rz)) { x = rx - LANE; z = clamp(f.z, -280, 280); yaw = 0; }
    else { x = clamp(f.x, -280, 280); z = rz + LANE; yaw = Math.PI / 2; }
    if (this.playerCar) { this.playerCar.place(x, z, yaw); }
    else this.player.teleport(x, z, yaw);
    this.cam.snapNext = true;
    hud.toast('Back on the road!');
  }

  interact() {
    const p = this.player;
    const it = this.nearestInteractable();
    if (!it) return;
    if (it.type === 'talk') this.missions.begin();
    else if (it.type === 'car') this.enterCar(it.car);
  }

  nearestInteractable() {
    const p = this.player;
    if (this.missions.state === 'idle' && this.missions.current) {
      const g = this.npcs[this.missions.current.giver];
      if (dist(g.x, g.z, p.x, p.z) < 3.4 && Math.abs(g.y - p.y) < 2) return { type: 'talk', who: g };
    }
    let best = null, bd = 2.2;
    for (const c of this.cars) {
      if (c.dead || Math.abs(c.x - p.x) > 8 || Math.abs(c.z - p.z) > 8) continue;
      if (p.y > c.y + c.height - 0.3) continue;
      const h = {};
      if (circleVsObb(p.x, p.z, 1.9, c.obb, h)) {
        const d = 1.9 - h.depth;
        if (d < bd) { bd = d; best = { type: 'car', car: c }; }
      }
    }
    return best;
  }

  fixedStep(h) {
    const p = this.player;
    // Player intent.
    if (this.playerCar) {
      const c = this.playerCar.ctrl;
      if (this.inDialog || this.freezeCar || this.missions.state === 'failed') { c.throttle = 0; c.brake = 1; c.steer = 0; c.handbrake = true; }
      else { c.throttle = input.throttle(); c.brake = input.brake(); c.steer = input.steer(); c.handbrake = input.down('handbrake'); }
      c.park = false;
    } else if (p.state === 'normal') {
      if (this.inDialog || this.missions.state === 'failed') { p.wishX = p.wishZ = 0; }
      else {
        const mx = input.moveX(), my = input.moveY();
        const fx = Math.sin(this.cam.yaw), fz = Math.cos(this.cam.yaw);
        let wx = fx * my + -fz * mx, wz = fz * my + fx * mx;
        const l = Math.hypot(wx, wz);
        if (l > 1) { wx /= l; wz /= l; }
        const sprint = input.down('sprint');
        const sp = sprint ? 8.8 : 5.4;
        p.wishX = wx * sp; p.wishZ = wz * sp;
        p.anim.sprint = sprint;
      }
      if (p.onGround && p.vy <= 0) this.jumps = 0;
    }
    if (this.kickHitT > 0) {
      this.kickHitT -= h;
      if (this.kickHitT <= 0) {
        const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
        this.areaHit(p.x + fx * 0.9, p.z + fz * 0.9, p.y, 1.0, fx, fz, false);
      }
    }
    this.kickT -= h;

    for (const c of this.cars) if (c.ai) c.ai.update(h, this);
    for (const c of this.cars) c.step(h, this);
    const cars = this.cars;
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) collideCars(cars[i], cars[j], this);
    // People.
    if (!this.playerCar) p.step(h, this);
    for (const ped of this.peds) { ped.update(h, this); ped.char.step(h, this); }
    for (const k in this.npcs) {
      const n = this.npcs[k];
      if (n.state === 'seated') continue;
      n.wishX = n.wishZ = 0;
      n.step(h, this);
    }
    this.carsVsPeople();
  }

  // Kicks and stomps: break props, bowl people over, squash mosquitoes, dent cars.
  areaHit(x, z, y, r, dx, dz, stomp) {
    for (const prop of propsNear(x, z, r)) breakProp(prop, dx * 8, dz * 8, this);
    for (const ped of this.peds) {
      const c = ped.char;
      if (c.state !== 'normal' || Math.abs(c.y - y) > 1.6 || dist(c.x, c.z, x, z) > r + 0.4) continue;
      c.fling(dx * 7 + (c.x - x) * 2, 5, dz * 7 + (c.z - z) * 2);
      this.shame.add(9);
      audio.ouch();
      this.say(c, pick(OUCH), 1.5);
    }
    for (const k in this.npcs) {
      const n = this.npcs[k];
      if (n.state !== 'normal' || dist(n.x, n.z, x, z) > r + 0.6) continue;
      this.say(n, pick(['Hey!', 'Rude!', 'Ow, Nick!', 'Why?!']), 1.4);
    }
    for (const m of this.mosquitoes) {
      if (!m.alive) continue;
      const mp = m.mesh.position;
      if (Math.hypot(mp.x - x, mp.z - z) < r + 1.4 && Math.abs(mp.y - (y + 1)) < 2.2) this.squash(m);
    }
    for (const c of this.cars) {
      if (Math.abs(c.x - x) > 6 || Math.abs(c.z - z) > 6) continue;
      if (circleVsObb(x, z, r, c.obb, {})) {
        c.damage(stomp ? 6 : 3, this);
        c.vx += dx * 1.5; c.vz += dz * 1.5;
        audio.crash(0.3);
        fx.sparks(x, y + 0.8, z, 5);
        if (c.traffic) this.shame.add(2);
      }
    }
  }

  carsVsPeople() {
    const hit = {};
    const chars = this.allChars();
    for (const ch of chars) {
      if (ch.state === 'seated' || ch.state === 'hidden' || ch.solid === false) continue;
      for (const car of this.cars) {
        if (Math.abs(car.x - ch.x) > car.radius + 1 || Math.abs(car.z - ch.z) > car.radius + 1) continue;
        if (ch.y > car.y + car.height - 0.3) continue;
        if (!circleVsObb(ch.x, ch.z, ch.r, car.obb, hit)) continue;
        const closing = (car.vx - ch.vx) * hit.nx + (car.vz - ch.vz) * hit.nz;
        if (closing > 4.5 && ch.state === 'normal' && !ch.invulnerable) {
          const sp = car.speed;
          ch.x += hit.nx * hit.depth; ch.z += hit.nz * hit.depth;
          if (ch.fling(car.vx * 1.05 + hit.nx * 3, 4.5 + sp * 0.22, car.vz * 1.05 + hit.nz * 3)) {
            car.vx *= 0.94; car.vz *= 0.94;
            this.onCharHit(ch, car, closing);
          }
        } else {
          ch.x += hit.nx * hit.depth; ch.z += hit.nz * hit.depth;
          const vn = ch.vx * hit.nx + ch.vz * hit.nz;
          if (vn < 0) { ch.vx -= hit.nx * vn; ch.vz -= hit.nz * vn; }
        }
      }
    }
    // Keep the player from walking through people.
    if (!this.playerCar) {
      const p = this.player;
      for (const ch of chars) {
        if (ch === p || ch.state !== 'normal') continue;
        const dx = p.x - ch.x, dz = p.z - ch.z, d = Math.hypot(dx, dz), R = p.r + ch.r;
        if (d < R && d > 0.001 && Math.abs(p.y - ch.y) < 1.2) {
          const push = (R - d) / 2;
          p.x += (dx / d) * push; p.z += (dz / d) * push;
          ch.x -= (dx / d) * push; ch.z -= (dz / d) * push;
        }
      }
    }
  }

  syncAll(dt, title) {
    const cx = camera.position.x, cz = camera.position.z;
    for (const c of this.cars) {
      const d2 = (c.x - cx) ** 2 + (c.z - cz) ** 2;
      c.root.visible = d2 < 320 * 320;
      if (c.root.visible) c.sync(dt);
      if (c.driverBust?.userData.model) {
        const m = c.driverBust.userData.model;
        m.arms[0]?.rotation.set(-1.1, 0, 0.2);
        m.arms[1]?.rotation.set(-1.1, 0, -0.2);
      }
    }
    const talker = this.talker;
    for (const ped of this.peds) {
      const c = ped.char;
      const d2 = (c.x - cx) ** 2 + (c.z - cz) ** 2;
      c.root.visible = d2 < 190 * 190;
      if (c.root.visible) c.sync(dt);
    }
    for (const k in this.npcs) {
      const n = this.npcs[k];
      const near = dist(n.x, n.z, this.player.x, this.player.z);
      n.anim.talk = talker === k;
      const giver = this.missions.state === 'idle' && this.missions.current?.giver === k;
      n.anim.wave = giver && near < 9 && !this.inDialog && n.state === 'normal';
      if (n.state === 'normal' && near < 10 && !this.inDialog) n.yaw += Math.atan2(Math.sin(yawTo(this.player.x - n.x, this.player.z - n.z) - n.yaw), Math.cos(yawTo(this.player.x - n.x, this.player.z - n.z) - n.yaw)) * Math.min(1, dt * 3);
      if (near < 9 && n.state === 'normal' && !this.inDialog && this.missions.state !== 'running') {
        n.chatT = (n.chatT ?? 2 + Math.random() * 3) - dt;
        if (n.chatT <= 0) { n.chatT = 7 + Math.random() * 6; this.say(n, pick(CHATTER[k] || ['Hey Nick.']), 2.6); }
      }
      if (n.def.kind === 'ghost' && n.state === 'normal') { n.y = groundAt(n.x, n.z, n.y + 1, 2) + 0.35 + Math.sin(this.time * 2) * 0.12; n.vy = 0; }
      n.sync(dt);
    }
    if (!title) {
      const p = this.player;
      p.anim.talk = talker === 'nick';
      if (this.spinT > 0) { this.spinT -= dt; p.anim.spin = (1 - this.spinT / 0.4) * Math.PI * 2; } else p.anim.spin = 0;
      p.sync(dt);
      if (this.missions.state === 'idle') this.placeNpcs();
    }
  }

  tickPickups(dt) {
    const f = this.focus();
    const col = this.playerCar ? { x: f.x, y: f.y, z: f.z, r: 2.2 } : { x: f.x, y: f.y, z: f.z, r: 0.7 };
    tickCoins(dt, this.time, col, this);
    for (const r of this.records) {
      if (!r.alive) continue;
      r.tick(this.time, dt);
      const mp = r.mesh.position;
      if (dist(mp.x, mp.z, f.x, f.z) < (this.playerCar ? 2.6 : 1.4) && Math.abs(mp.y - (f.y + 1)) < 1.8) {
        r.remove();
        this.got.records.add(r.id);
        audio.jingle('record');
        fx.sparkle(mp.x, mp.y, mp.z, 0xff5a6a, 20);
        hud.showCollect(`<span class="rec-icon"></span> Duke's Lost Record <b>${this.got.records.size}/7</b>`);
        if (this.got.records.size === 7) { this.radio('duke', 'All seven! You beautiful cat. That is the complete Ellington.'); this.addCoins(250); }
        else if (this.got.records.size === 1) this.radio('duke', 'One of my records! Find the other six and I shall be ever so grateful.');
        this.save();
      }
    }
    for (const m of this.mosquitoes) {
      if (!m.alive) continue;
      m.tick(this.time, dt);
      const mp = m.mesh.position;
      const d = dist(mp.x, mp.z, f.x, f.z);
      if (d < 18 && Math.random() < dt * 8) audio.tone(620 + Math.random() * 60, 0.08, 'sawtooth', 0.012 * (1 - d / 18));
      if (this.playerCar && d < 2.8 && mp.y < f.y + this.playerCar.height + 1.2) this.squash(m);
    }
  }

  squash(m) {
    if (!m.alive) return;
    const mp = m.mesh.position;
    m.remove();
    this.got.mosquitoes.add(m.id);
    audio.squash();
    fx.sparkle(mp.x, mp.y, mp.z, 0x7aa06a, 18);
    burstCoins(mp.x, mp.y - 0.5, mp.z, 6);
    hud.showCollect(`<span class="mos-icon"></span> Anxiety Mosquito squashed <b>${this.got.mosquitoes.size}/7</b>`);
    if (this.got.mosquitoes.size === 7) { hud.toast('All the Anxiety Mosquitoes are gone. You feel... calm? +250 coins'); this.addCoins(250); }
    this.save();
  }

  mapMarkers(all = false) {
    const out = [];
    const ms = this.missions;
    if (ms.state === 'idle' && ms.current) {
      const g = this.npcs[ms.current.giver];
      out.push({ type: 'mission', x: g.x, z: g.z, edge: true });
    }
    const t = ms.target();
    if (t && !t.follow) out.push({ type: 'objective', x: t.x, z: t.z, edge: true });
    if (t && t.follow) out.push({ type: ms.stage?.car?.isTarget ? 'enemy' : 'friend', x: t.x, z: t.z, edge: true });
    out.push(...ms.markers());
    for (const h of this.shame.hearses) if (!h.dead) out.push({ type: 'enemy', x: h.x, z: h.z, edge: true });
    if (!all) {
      const f = this.focus();
      for (const r of this.records) if (r.alive && dist(r.x, r.z, f.x, f.z) < 45) out.push({ type: 'record', x: r.x, z: r.z });
      for (const m of this.mosquitoes) if (m.alive && dist(m.x, m.z, f.x, f.z) < 45) out.push({ type: 'mosquito', x: m.x, z: m.z });
    }
    return out;
  }
  mapLabels() { return MAP_LABELS.map(([name, key]) => [name, landmarks[key].x, landmarks[key].z]); }

  updateMarkers() {
    const ms = this.missions;
    const f = this.focus();
    let target = null;
    if (ms.state === 'idle' && ms.current) {
      const g = this.npcs[ms.current.giver];
      this.bang.show(true);
      this.bang.set(g.x, g.y + g.height + 0.9, g.z, this.time);
      if (dist(g.x, g.z, f.x, f.z) > 25) target = { x: g.x, z: g.z };
    } else this.bang.show(false);
    const t = ms.target();
    if (t) {
      target = t;
      const y = t.follow ? groundAt(t.x, t.z, 0.2, 0.6) + 2.5 : groundAt(t.x, t.z, 0.2, 0.6);
      if (t.follow) this.beacon.hide();
      else this.beacon.set(t.x, y, t.z, this.time, t.r || 3.2);
    } else this.beacon.hide();
    this.route = null;
    if (target && !this.inDialog) {
      const aim = routeAim(f.x, f.z, target.x, target.z);
      const top = this.playerCar ? f.y + this.playerCar.height + 1.8 : f.y + this.player.height + 1.5;
      this.arrow.set(f.x, top, f.z, yawTo(aim.x - f.x, aim.z - f.z), this.time);
      this.route = [...aim.nodes.map((n) => [nodeX(n), nodeZ(n)]), [target.x, target.z]];
    } else this.arrow.hide();
  }

  updateHud() {
    hud.setObjective(this.missions.objective());
    hud.setSpeedo(this.playerCar);
    if (this.missions.state !== 'failed') {
      let prompt = '';
      if (!this.inDialog && !this.playerCar && this.player.state === 'normal') {
        const it = this.nearestInteractable();
        if (it?.type === 'talk') prompt = `<b>E</b> Talk to ${it.who.def.name}`;
        else if (it?.type === 'car') prompt = it.car.locked ? '' : it.car.driverBust ? '<b>E</b> Steal car' : '<b>E</b> Get in';
      }
      hud.setPrompt(prompt);
    }
    if (this.frame % 2 === 0) {
      const f = this.focus();
      hud.drawMinimap(f.x, f.z, this.cam.yaw, this.playerCar ? this.playerCar.yaw : this.player.yaw, this.mapMarkers(false), this.route);
    }
    if (this.bigMap && this.frame % 10 === 0) hud.toggleBigMap(true, this);
    hud.tickBubbles();
  }

  updateAudio() {
    const c = this.playerCar;
    if (c && !c.dead) {
      audio.engine(true, c.revs, c.ctrl.throttle);
      audio.skid(c.air ? 0 : c.skidAmt);
      audio.horn(input.down('horn'));
      if (c.skidAmt > 0.3 && !c.air) {
        this.skidT = (this.skidT || 0) - 1;
        if (this.skidT <= 0) {
          this.skidT = 2;
          const fx_ = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx_;
          const bz = -c.spec.len / 2 + c.spec.wheelR + 0.4, bx = c.spec.wid / 2 - 0.14;
          for (const s of [-1, 1]) fx.skid(c.x + fx_ * bz + rx * bx * s, c.z + fz * bz + rz * bx * s, c.yaw);
          if (Math.random() < 0.3) fx.smoke(c.x - fx_ * c.spec.len / 2, 0.3, c.z - fz * c.spec.len / 2);
        }
      }
    } else {
      audio.engine(false, 0, 0);
      audio.skid(0);
      audio.horn(false);
    }
    audio.duckMusic(this.shame.pursuit ? 0.5 : 1);
  }

  // Replace traffic that has been wrecked or wandered off far away.
  recycleTraffic(dt) {
    this.recycleT = (this.recycleT || 0) - dt;
    if (this.recycleT > 0) return;
    this.recycleT = 2;
    const f = this.focus();
    for (const c of this.cars.slice()) {
      if (c === this.playerCar || c.locked) continue;
      if (c.dead) {
        c.deadT = (c.deadT || 0) + 2;
        if (c.deadT > 20 && dist(c.x, c.z, f.x, f.z) > 60) {
          this.removeCar(c);
          if (c.traffic) this.spawnTrafficCar(Math.random, f);
        }
      }
    }
    const traffic = this.cars.filter((c) => c.traffic && !c.dead).length;
    if (traffic < 20) this.spawnTrafficCar(Math.random, f);
  }
}

function frame() { return new Promise((r) => requestAnimationFrame(() => r())); }
function setLoading(text) {
  const el = document.getElementById('loading');
  if (!el) return;
  if (text) el.textContent = text;
  else el.classList.add('done');
}

const game = new Game();
window.__game = game;
window.__lm = lm;
window.__props = allProps;
window.__stats = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, textures: renderer.info.memory.textures, cars: game.cars.length });
game.init().catch((e) => {
  console.error(e);
  const el = document.getElementById('loading');
  if (el) el.textContent = 'Something broke: ' + e.message;
});

// Title and pause screen buttons.
document.getElementById('play').addEventListener('click', () => game.start());
document.getElementById('resume').addEventListener('click', () => game.pause(false));
document.getElementById('reset').addEventListener('click', () => { if (confirm('Erase your progress and start over?')) game.resetSave(); });
document.getElementById('music').addEventListener('click', (e) => { audio.setMusic(!audio.musicOn); e.target.textContent = `Music: ${audio.musicOn ? 'on' : 'off'}`; });
document.getElementById('sound').addEventListener('click', (e) => { audio.setMuted(!audio.muted); e.target.textContent = `Sound: ${audio.muted ? 'off' : 'on'}`; });
