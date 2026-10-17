// Charter & Run — glue: builds the world (island + flight set), runs the fixed-step simulation,
// routes input to the player or their car, applies the level system (DESIGN §4) and exposes the
// Game API every module codes against (DESIGN §14.3). Frozen after Phase 0 (Phase 2 only).

import { THREE, initGfx, renderer, scene, camera, followSun, tickSky, setSkyPalette, setCloudsVisible, setShadows, setNightLights } from './gfx.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { buildTown, parkedCars, tickTown } from './world/town.js';
import { finalizeProps, tickProps, breakProp, propsNear, props as allProps } from './world/props.js';
import { lm, landmarks, routeAim, N, P, HALF, LANE, nodeX, nodeZ, neighbors, blockInterior } from './world/layout.js';
import { groundAt, queryBlocks, contains, circleVsObb, circleVsBlock, topAt, waterAt } from './world/collision.js';
import { worldHooks } from './world/registry.js';
import { buildCabin, CABIN_X } from './world/cabin.js';
import { buildRioCard } from './world/rio.js';
import { Car, collideCars } from './actors/car.js';
import { Character, ANIM_FLAGS } from './actors/character.js';
import { CHARS, CAST, buildBust, buildCharacter, randomPed, outfitDef } from './actors/models.js';
import { AIDriver } from './actors/drivers.js';
import { spawnPeds } from './actors/peds.js';
import { initCoins, placeCoin, burstCoins, tickCoins, Collectible } from './actors/pickups.js';
import { fx } from './game/fx.js';
import { hud, renderPortrait } from './game/hud.js';
import { CamRig } from './game/camera.js';
import { Shame } from './game/shame.js';
import { BerraJob } from './game/berraJob.js';
import { Glide } from './game/glide.js';
import { PoolJudges } from './game/poolJudges.js';
import { DiveTower } from './game/diveTower.js';
import { Honk } from './game/honk.js';
import { DayClock } from './game/dayClock.js';
import { Eslov } from './game/eslov.js';
import { StorchFilm } from './game/storchFilm.js';
import { PoolFest } from './game/poolFest.js';
import { StigSorry } from './game/stigSorry.js';
import { PigTruck } from './game/pigTruck.js';
import { BaggageBelt } from './game/baggageBelt.js';
import { Lapplisa } from './game/lapplisa.js';
import { GrisfestFree } from './game/grisfestFree.js';
import { FruitStands } from './game/fruitStands.js';
import { Dogs } from './game/dogs.js';
import { Bathers } from './game/bathers.js';
import { SuntripShop } from './game/suntripShop.js';
import { Toasters } from './game/toasters.js';
import { Stunts } from './game/stunts.js';
import { Room107 } from './game/room107.js';
import { Solkram } from './game/solkram.js';
import { GangTalk } from './game/gangTalk.js';
import { RoofJump } from './game/roofJump.js';
import { Mic } from './game/mic.js';
import { Birds } from './game/birds.js';
import { Gags } from './game/gags.js';
import { BeachDream } from './game/beachDream.js';
import { GuardiaJeep } from './game/guardiaJeep.js';
import { MissionRunner, MISSIONS } from './game/missions/index.js';
import { Bang, Beacon, GuideArrow } from './game/markers.js';
import { LEVELS, ISLAND_PALETTES } from './level.js';
import { METERS } from './meters.js';
import { S, fmt, pta } from './strings.js';
import { CHATTER, CHATTER_FLIGHT, BARKS, LOCAL_CAST, STAFF_CAST, COLLECTIBLES, UNLOCKS } from './content/index.js';
import { clamp, dist, yawTo, pick, mulberry32, lerp } from './util.js';

const STEP = 1 / 60;
const SAVE_KEY = 'charter-and-run-v1';
const PLAYER_KEY = 'stig';
const RADIO_ONLY = ['levander', 'kapten', 'pa', 'guardia', 'pax', 'telefonist'];
const CABIN_OWNED = ['vardinna2'];
// Public-domain traditional one-shot cues (§12.1): `music`/`sfx` cues with these names play
// audio.trad(name) over the current tune instead of switching it.
const TRAD = ['smaGrodorna', 'hejTomtegubbar', 'helanGar'];
// `sfx` cues with a jingle name play audio.jingle(name) (§12.3; e.g. julafton's `sfx: 'pryl'`).
const JINGLES = ['start', 'complete', 'fail', 'pryl'];
const params = new URLSearchParams(location.search);
const TEST = params.has('test');
const TRAFFIC_MIX = ['hatch', 'hatch', 'hatch', 'hatch', 'sedan', 'sedan', 'wagon', 'van', 'taxi', 'pickup', 'guagua', 'icecream'];

// Is a marker point (position p raised by dy) within r m of the camera? Markers that close fill
// the lens (the cabin's z-clamped eye sits 2.5 m above the seats), so they hide.
const _near = new THREE.Vector3();
function camNear(p, dy, r = 3) { return camera.position.distanceTo(_near.set(p.x, p.y + dy, p.z)) < r; }
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
    this.closure = null; // a race's closed course (missions/kinds/core.js closeCourse; drivers.js)
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
    this.testMode = TEST;
    this.autoDialog = TEST;
    this.dialogSpeed = TEST ? 220 : 55;
    this.timeScale = TEST ? (params.has('ts') ? +params.get('ts') : 3) : 1;
    this.level = null;
    this.levelDef = null;
    this.collected = Object.fromEntries(Object.keys(COLLECTIBLES).map((k) => [k, new Set()]));   // prylar, fenor, brodrostar (§10.1)
    this.unlocked = new Set();
    this.records = {};            // free-roam bests, saved: `simhopp` (the diving judges' best total, §10.8)
    this.homeOverrides = {};
    this.outfitOverrides = {};    // UNLOCKS[name].outfit: merged over the island's outfit set (Lasse's Santa outfit after the end, §10.13)
    this.chatterOverrides = {};   // UNLOCKS[name].chatter: free-roam chatter that replaces CHATTER[key] (island)
    this.witnessOverride = null;  // UNLOCKS[name].witness: merged over the witness rule's config on the island (§10.11)
    this.interactables = [];
    this.holding = false;
    this.mantraOn = false;
    this.mantraMode = false;
    this.mantraHeldT = 0;
    this.mantraWindUp = 0.3;
    this.mantraSayT = 0;
    this.carrying = null;
    this.speedCap = null;   // m/s cap on the player's walk/sprint (carry stages)
    this.bumpedT = 0;
    this.frozenT = 0;
    this.islandOutfit = 'kostym';
    this.islandTune = 'sol';     // 'sol' | 'samba' (§10.3 samba unlock, §10.5 save `tune`)
    // Player anim flags the engine itself drives; it clears only what it set, so a cue's timed
    // pose on the player (e.g. `wings` in the grisfest/julafton outros) survives (§9.3 anim).
    this.mantraPose = false;
    this.holdPose = false;
    this.flailPose = false;
    this.sky = 'day';
    this.pendingEndCard = false;
    this.collectibles = {};
  }

  async init() {
    initGfx(document.getElementById('app'));
    this.scene = scene;
    input.init(renderer.domElement);
    input.onUnlock = () => { if (this.started && !TEST) this.pause(true); };
    hud.init();
    fx.init(scene);
    try { await Promise.race([document.fonts.load('40px "Luckiest Guy"'), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* fall back to Impact */ }
    setLoading(S.loading[1]);
    await frame();
    buildTown(scene);
    this.cabin = buildCabin(scene, this);
    buildRioCard(scene);
    finalizeProps(scene);
    initCoins(scene);
    hud.buildBaseMap();
    this.placeWorldCoins();
    this.cabin.placeCoins();
    setLoading(S.loading[2]);
    await frame();
    for (const pc of parkedCars) this.spawnParked(pc);
    this.spawnTraffic(20);
    setLoading(S.loading[3]);
    await frame();
    this.peds = spawnPeds(scene, 34);
    for (const key of Object.keys(CHARS)) {
      if (key === PLAYER_KEY || RADIO_ONLY.includes(key) || CABIN_OWNED.includes(key)) continue;
      const c = new Character(CHARS[key]);
      c.key = key;
      c.outfit = null;
      c.state = 'hidden';
      c.busy = true;
      scene.add(c.root);
      c.root.visible = false;
      this.npcs[key] = c;
    }
    this.player = new Character(CHARS[PLAYER_KEY]);
    this.player.key = PLAYER_KEY;
    this.player.outfit = null;
    scene.add(this.player.root);
    this.buildCollectibles();
    this.bang = new Bang(scene);
    this.beacon = new Beacon(scene);
    this.arrow = new GuideArrow(scene);
    this.shame = new Shame(this);
    this.missions = new MissionRunner(this);
    this.berraJob = new BerraJob(this);   // free roam after the grisfest (§10.6)
    this.glide = new Glide(this);         // free roam after julafton (§10.7)
    this.judges = new PoolJudges(this);   // free roam: the sisters judge his dives (§10.8)
    this.tower = new DiveTower(this);     // free roam: the 10 m diving tower at Flamenco's pool (§10.20)
    this.honk = new Honk(this);           // free roam: the island hears the horn (§10.9)
    this.hornAt = null;                   // the last free-roam horn press: { x, z, yaw, t, pigs }
    this.day = new DayClock(this);        // free roam: the island's clock, evenings, the nap (§10.10)
    this.film = new StorchFilm(this);     // free roam: Herr Storch films his tricks, the film night (§10.11)
    this.eslov = new Eslov(this);         // free roam: the rollerskier trains, the horn, Eslövloppet (§10.12)
    this.fest = new PoolFest(this);       // free roam after the end: Små grodorna in Flamenco's pool (§10.13)
    this.sorry = new StigSorry(this);     // free roam: Stig says sorry for what he does (§10.14)
    this.pigs = new PigTruck(this);       // free roam: the grisbil's pigs tumble off, the pen at the farm (§10.15)
    this.belt = new BaggageBelt(this);    // free roam: the baggage belt at Gando carries Stig (§10.16)
    this.lapp = new Lapplisa(this);       // free roam: Majsan tickets a car on the sidewalk, Angerud's tow (§10.17)
    this.party = new GrisfestFree(this);  // free roam after the grisfest: 800 pesetas at the farm's gate, the evening (§10.18)
    this.stands = new FruitStands(this);  // free roam: his car goes through the market's fruit stalls (§10.19)
    this.dogs = new Dogs(this);           // free roam: the watchdogs in the bungalow gardens and at the farm (§10.21)
    this.bathers = new Bathers(this);     // free roam: tourists on the sun loungers, Berra and Robban fried (§10.22)
    this.shop = new SuntripShop(this);    // free roam: SunTrip-butiken on the office porch, its add-ons and his look (§10.23)
    this.toasters = new Toasters(this);   // free roam: the G17 toasters' timing game (§10.24)
    this.room107 = new Room107(this);     // free roam: room 107's keepsake shelf, the giraffe and the boombox (§10.25)
    this.solkram = new Solkram(this);     // free roam: the SOLKRÄM meter at Majsan's back by the pool (§10.26)
    this.stunts = new Stunts(this);       // free roam: his car's jumps judged, the G17 stamp (§10.27)
    this.chat = new GangTalk(this);       // free roam: E talks to the gang, and Stig answers (§10.28)
    this.roofs = new RoofJump(this);      // free roam: the stairs up SOL DE INVIERNO, the jump to HOTEL ATLÁNTICO's roof (§10.29)
    this.mic = new Mic(this);             // free roam: Stig reads Lasse's announcements at the SunTrip stage's mic (§10.30)
    this.birds = new Birds(this);         // free roam: the flocks that lift, the stork in La Charca (§10.31)
    this.gags = new Gags(this);           // free roam: E at Ole's camera bag and Viking Bar's lamp, two film gags (§10.32)
    this.dream = new BeachDream(this);    // free roam: the towel at the water's edge, Stig's daydream in the surf (§10.33)
    this.jeep = new GuardiaJeep(this);    // free roam after the bodega: the borrowed Guardia jeep, its siren on H (§10.34)
    this.sirenYield = null;               // the jeep's siren the traffic gives way to: { x, z, fx, fz, r, … } (drivers.js)
    this.cam = new CamRig(camera);
    this.load();
    this.cabin.onPhase(() => { if (this.level === 'flight') hud.setMapSource(this.cabin.mapSource(this.cabin.phase)); });
    this.setLevel(this.levelFor(this.missions.index), { instant: true });
    this.placeNpcs(true);
    this.spawnPlayer();
    setLoading(S.loading[5]);
    await frame();
    this.renderPortraits();
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
    audio.setTune(this.levelTune());
    if (!TEST) { input.wantLock = true; input.lock(); }
    if (this.missions.index === 0 && !TEST) setTimeout(() => hud.toast(S.firstStart), 1200);
  }

  pause(on) {
    if (TEST) return;
    this.paused = on;
    document.getElementById('pause').classList.toggle('show', on);
    audio.engine(false, 0, 0);
    audio.skid(0);
    audio.horn(false);
    if (on) audio.pauseLoops(); else audio.resumeLoops();
    if (on) {
      const b = document.getElementById('music'); if (b) b.textContent = this.musicLabel();
      // N mutes without touching the button: show the real state.
      const sb = document.getElementById('sound'); if (sb) sb.textContent = audio.muted ? S.soundBtnOff : S.soundBtnOn;
    }
    if (!on) { input.wantLock = true; input.lock(); this.last = performance.now(); }
  }

  // ------------------------------------------------------------------------------------------
  // Levels (DESIGN §4)

  levelFor(index) { return MISSIONS[Math.min(index, MISSIONS.length - 1)].level; }

  // Applies every row of the §4.3 table.
  setLevel(name, { index = this.missions.index, instant = true } = {}) {
    const def = LEVELS[name];
    this.level = name;
    this.levelDef = def;
    this.shame.configure(METERS[def.meter]);
    this.cam.setProfile(def.camProfile);
    setCloudsVisible(def.clouds);
    setShadows(def.shadows);
    for (const c of this.cars) if (c.traffic && !def.sim.traffic) c.root.visible = false;
    for (const p of this.peds) if (!def.sim.peds) p.char.root.visible = false;
    audio.setTune(this.levelTune());
    this.mantraMode = false;
    this.holding = false;
    if (name === 'flight') {
      this.cabin.setPhase(def.phaseForIndex(index), { instant: true });
      hud.setMapSource(this.cabin.mapSource(this.cabin.phase));
    } else {
      this.cabin.unseatAll();
      audio.drone(0, 0);
      this.setSky(def.palette || 'day');
      hud.setMapSource(hud.townMap);
    }
    this.applyOutfits();
    this.placeNpcs(true);
  }

  async transitionTo(name) {
    hud.letterbox(true);
    hud.flashColor('rgba(255,255,255,0.95)');
    hud.showBanner(S.transitionMain, S.transitionSub, 'mission', 3200);
    this.cabin.unseatAll();
    this.cabin.parkTrolley();
    if (this.playerCar) this.exitCar(true);
    this.player.state = 'normal';
    this.setLevel(name, { index: this.missions.index });
    const l = lm(name === 'island' ? 'airport' : this.levelDef.spawn(this, this.missions.index));
    this.player.teleport(l.x + Math.sin(l.yaw) * 2, l.z + Math.cos(l.yaw) * 2, l.yaw + Math.PI);
    this.cam.yaw = l.yaw + Math.PI;
    this.cam.snapNext = true;
    this.placeNpcs(true);
    this.save();
    await this.wait(1.2);
    hud.letterbox(false);
    if (name === 'island') hud.toast(S.transitionToast);
  }

  // After a mission fails or is aborted: the level's ambient state for the current mission index.
  // Flight: a running turbulence stops, the cabin goes back to phaseForIndex(index) instantly with
  // no hold (which stops a mission's phase chain, held or not) and the seatbelt sign off; then
  // palette and map follow.
  restoreAmbience() {
    if (this.level === 'flight') {
      const cab = this.cabin;
      cab.stopTurbulence();
      cab.setPhase(this.levelDef.phaseForIndex(this.missions.index), { instant: true });
      cab.setSeatbelt(false, { chime: false });
      hud.setMapSource(cab.mapSource(cab.phase));
    } else {
      this.setSky(this.levelDef.palette || 'day');
      this.day.resync();   // the free-roam clock's palette at the next free-roam frame (§10.10)
    }
    audio.setTune(this.levelTune());
    this.mantraMode = false;
  }

  // The current level's ambient tune: the flight's `muzak`, the island's `sol` or (after the samba
  // unlock, chosen in the pause menu) `samba`. Everything that reverts the music uses this.
  levelTune() { return this.level === 'island' ? this.islandTune : this.levelDef?.tune || 'sol'; }
  // Choose the island tune ('sol' | 'samba'); switches now if the island's ambient tune is playing
  // (never over a pursuit's `skandal` or a mission's music cue). Persisted in the save.
  setIslandTune(name) {
    const prev = this.levelTune();
    this.islandTune = name === 'samba' ? 'samba' : 'sol';
    if (this.level === 'island' && audio.tune === prev) audio.setTune(this.islandTune);
    this.save();
  }
  musicLabel() { return !audio.musicOn ? S.musicOff : this.islandTune === 'samba' ? S.musicSamba : S.musicOn; }
  // Pause-menu Musik button: på → samba (once unlocked) → av → på (§11.3).
  cycleMusic() {
    if (!audio.musicOn) { if (this.islandTune !== 'sol') this.setIslandTune('sol'); audio.setMusic(true); }
    else if (this.islandTune !== 'samba' && this.unlocked.has('samba')) this.setIslandTune('samba');
    else audio.setMusic(false);
    return this.musicLabel();
  }

  // A named island palette at once (missions' `sky` cues, the end card). The night lights go back
  // to following the sky; the free-roam clock forces them only while it blends (§10.10, §13.3).
  setSky(name) {
    if (!ISLAND_PALETTES[name]) return;
    this.sky = name;
    setNightLights(null);
    if (this.level === 'island') setSkyPalette(ISLAND_PALETTES[name]);
  }

  // Where to stand to face a landmark: 1.5 m along its yaw, facing back, if that is free ground at
  // the landmark's level; otherwise the landmark itself, facing its yaw (cabin aisle spots that
  // face into a seat row).
  approachSpot(name) {
    const l = typeof name === 'string' ? lm(name) : name;
    const fx = Math.sin(l.yaw || 0), fz = Math.cos(l.yaw || 0);
    const x = l.x + fx * 1.5, z = l.z + fz * 1.5;
    if (this.spotFree(x, z) && this.levelDef.inBounds(x, z, this) && Math.abs(this.groundAt(x, z) - this.groundAt(l.x, l.z)) < 0.1) return { x, z, yaw: (l.yaw || 0) + Math.PI };
    return { x: l.x, z: l.z, yaw: l.yaw || 0 };
  }

  spawnPlayer() {
    const i = this.missions.index;
    const name = i >= MISSIONS.length ? 'flamencoDeck' : this.levelDef.spawn(this, i);
    const s = this.approachSpot(name);
    this.player.state = 'normal';
    this.player.teleport(s.x, s.z, s.yaw);
    this.cam.yaw = s.yaw;
    this.cam.snapNext = true;
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

  spawnParked(pc) {
    const car = new Car(pc.type, { color: pc.color, name: pc.name });
    car.place(pc.x, pc.z, pc.yaw);
    car.home = pc;
    if (pc.locked) car.locked = true;
    this.addCar(car);
    if (pc.name) this.named[pc.name] = car;
    return car;
  }

  // A driver bust (traffic, mission cars): sits in the driver's seat.
  addBust(def, car) {
    const s = car.spec;
    const z = s.tall ? s.len / 2 - 1.6 : -0.05;
    const obj = buildBust(def);
    obj.position.set(s.wid * 0.22, car.seatY(), z);
    obj.scale.setScalar(car.fitScale(obj.userData.h || 1.25));
    car.tilt.add(obj);
    car.driverBust = obj;
    return obj;
  }

  // Decorative rider busts (riders cannot be real passengers: one passenger seat per car). A cast
  // key rides in the outfit its character wears now (Character.setDef keeps it in def).
  addRider(defKey, car, slot = 'rear') {
    const s = car.spec;
    const def = typeof defKey === 'string' ? (this.npc(defKey)?.def || CHARS[defKey] || randomPed()) : defKey;
    const obj = buildBust(def);
    const top = s.wheelR * 0.95 + s.bodyH, seatY = car.seatY();
    // Bed riders stand in the open load bed (no roof); window and rear riders sit like the driver.
    if (slot === 'bed') obj.position.set(((car.riders.length % 2) ? -1 : 1) * 0.4, top, -s.len * 0.3);
    else if (slot.startsWith('window')) {
      const k = +slot.slice(6) || 1;
      obj.position.set((k % 2 ? 1 : -1) * (s.wid / 2 - 0.55), seatY, s.len / 2 - 2.6 - Math.ceil(k / 2) * 1.7);
    } else obj.position.set(((car.riders.length % 2) ? 1 : -1) * s.wid * 0.22, seatY, s.tall ? s.len / 2 - 3.2 : -0.95);
    if (slot !== 'bed') obj.scale.setScalar(car.fitScale(obj.userData.h || 1.25));
    if (typeof defKey === 'string') obj.userData.riderKey = defKey;
    car.tilt.add(obj);
    car.riders.push(obj);
    return obj;
  }
  removeRiders(car) {
    for (const o of car.riders || []) car.tilt.remove(o);
    car.riders = [];
  }
  // A character who is placed or shown in person leaves its rider bust behind (never twice).
  removeRiderOf(key) {
    for (const c of this.cars) {
      if (!c.riders?.length) continue;
      const mine = c.riders.filter((o) => o.userData.riderKey === key);
      if (!mine.length) continue;
      for (const o of mine) c.tilt.remove(o);
      c.riders = c.riders.filter((o) => !mine.includes(o));
    }
  }

  spawnTraffic(n) {
    for (let k = 0; k < n; k++) this.spawnTrafficCar(Math.random, null);
  }
  spawnTrafficCar(r = Math.random, awayFrom = null) {
    for (let tries = 0; tries < 30; tries++) {
      const a = (r() * (N + 1) * (N + 1)) | 0;
      const nb = neighbors(a);
      const b = nb[(r() * nb.length) | 0];
      // Never next to a junction of a closed course (a race).
      if (this.closure && (this.closure.nodes.has(a) || this.closure.nodes.has(b))) continue;
      const dx = nodeX(b) - nodeX(a), dz = nodeZ(b) - nodeZ(a), l = Math.hypot(dx, dz);
      const t = 12 + r() * (l - 24);
      const x = nodeX(a) + (dx / l) * t + (-dz / l) * LANE, z = nodeZ(a) + (dz / l) * t + (dx / l) * LANE;
      if (awayFrom && dist(x, z, awayFrom.x, awayFrom.z) < 120) continue;
      if (this.cars.some((c) => dist(c.x, c.z, x, z) < 14)) continue;
      const type = pick(TRAFFIC_MIX, r);
      const car = new Car(type);
      if (car.spec.bus && this.cars.some((c) => c.spec.bus && c.traffic)) continue;
      car.place(x, z, yawTo(dx, dz));
      car.traffic = true;
      this.addBust(randomPed(r), car);
      car.ai = new AIDriver(car, { mode: 'traffic', cruise: car.spec.bus ? 9 : 10 + r() * 4 });
      if (this.levelDef && !this.levelDef.sim.traffic) car.root.visible = false;
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
    return this.spawnParked(pc);
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
        placeCoin(x, 0.15 + 0.75, z);
      }
    }
  }

  buildCollectibles() {
    for (const [setName, set] of Object.entries(COLLECTIBLES)) {
      this.collected[setName] ??= new Set();
      this.collectibles[setName] = set.items.map((it) => {
        const l = landmarks[it.lm];
        if (!l) { console.warn('collectible: missing landmark', it.lm); return null; }
        const y = l.y ?? groundAt(l.x, l.z, 0.2, 0.6) + 1.2;
        // A standing one (motion 'none': the G17 toasters) faces its landmark's yaw.
        const c = new Collectible(scene, set.kind, it.id, l.x, y, l.z, { motion: set.motion, beam: set.beam, yaw: set.motion === 'none' ? l.yaw : undefined });
        c.set = setName;
        c.item = it;
        return c;
      }).filter(Boolean);
    }
  }

  // ------------------------------------------------------------------------------------------
  // Car seats

  seat(ch, car, side) {
    if (ch.car) this.unseat(ch);
    if (ch.seatId) this.cabin.unseatCharacter(ch);
    const s = car.spec;
    ch.state = 'seated';
    ch.car = car;
    ch.vx = ch.vz = ch.vy = 0;
    car.tilt.add(ch.root);
    // Hips 0.12 above the seat; shrunk (about the hips) only as far as the roof needs. Who is still
    // taller than the room at fitScale's 0.72 floor sits lower by the rest (Stig: his cowlick stood
    // 7 cm out of a van's roof, 1 cm out of the Guardia jeep's), so no head passes roofY.
    const m = ch.model, h = m.headTop - m.legLen;
    let hips = car.seatY() + 0.12;
    const k = car.fitScale(h, hips);
    hips -= Math.max(0, h * k - (car.roofY() - hips));
    const z = s.tall ? s.len / 2 - 1.6 : -0.05;
    ch.root.scale.setScalar(k);
    ch.root.position.set(side * s.wid * 0.22, hips - m.legLen * k, z + 0.12);
    ch.root.rotation.set(0, 0, 0);
    ch.root.visible = true;
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

  // Off whatever they sit in: a car or a plane seat.
  unseatAny(ch) {
    if (ch.car) this.unseat(ch);
    if (ch.seatId) this.cabin.unseatCharacter(ch);
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
  // A random free ground spot rMin..rMax from (cx, cz), inside the current level's bounds;
  // `ok(x, z)` (optional) filters further, e.g. footReach below.
  freeSpot(cx, cz, rMin, rMax, ok = null) {
    const inB = this.levelDef ? this.levelDef.inBounds : () => true;
    for (let k = 0; k < 60; k++) {
      const a = Math.random() * Math.PI * 2, r = rMin + Math.random() * (rMax - rMin);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (!inB(x, z, this)) continue;
      if (ok && !ok(x, z)) continue;
      if (this.spotFree(x, z, 0.15) && groundAt(x, z, 1, 0.5) < 0.5) return { x, z };
    }
    return { x: cx, z: cz };
  }
  groundAt(x, z) { return groundAt(x, z, 0.2, 0.6); }
  // Where can someone on foot get to from (cx, cz) without leaving the square of half-size R?
  // A flood fill over a 0.5 m grid with a 0.4 m body (the player is 0.36: a gap he only just fits
  // through does not count) and the 0.45 m step (no jumps), so thin walls block it. Returns
  // (x, z) => bool. Used for spawning `rabbits` targets: until Phase 2 a Fataga sheep could spawn
  // behind the 2.55 m tomato-field wall, 14 m from the player and 50 m round.
  footReach(cx, cz, R) {
    const S = 0.5, half = Math.ceil(R / S), n = 2 * half + 1;
    const h = new Float32Array(n * n).fill(NaN), list = [], hit = {}, q = [];
    const X = (i) => cx + (i - half) * S, Z = (j) => cz + (j - half) * S;
    const enter = (i, j, from) => {
      const x = X(i), z = Z(j);
      queryBlocks(x - 0.45, z - 0.45, x + 0.45, z + 0.45, list);
      for (const b of list) if (!b.dead && topAt(b, x, z) > from + 0.45 && circleVsBlock(x, z, 0.4, b, hit)) return NaN;
      return groundAt(x, z, from, 0.45);
    };
    const s0 = half * n + half;
    h[s0] = groundAt(cx, cz, 0.2, 0.6);
    q.push(s0);
    for (let k = 0; k < q.length; k++) {
      const c = q[k], ci = c % n, cj = (c / n) | 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
        const nI = nj * n + ni;
        if (!Number.isNaN(h[nI])) continue;
        const v = enter(ni, nj, h[c]);
        if (Number.isNaN(v)) continue;
        h[nI] = v;
        q.push(nI);
      }
    }
    return (x, z) => {
      const i = Math.round((x - cx) / S) + half, j = Math.round((z - cz) / S) + half;
      return i >= 0 && j >= 0 && i < n && j < n && !Number.isNaN(h[j * n + i]);
    };
  }

  // Test/debug helper: move whatever the player is controlling (stands up first if seated).
  debugWarp(x, z, yaw = 0) {
    if (this.player.seatId) this.standPlayer();
    if (this.playerCar) this.playerCar.place(x, z, yaw);
    else this.player.teleport(x, z, yaw);
    this.cam.snapNext = true;
  }

  enterCar(car) {
    if (!car || car.dead) return;
    if (!this.levelDef.verbs.enterCars || car.noEnter) { if (this.level === 'flight') hud.toast(S.noCars); return; }
    if (car.locked) { hud.toast(S.carBusy); return; }
    if (this.player.seatId) this.standPlayer();
    this.jeep.onEnter(car);   // the Guardia jeep at the barracks: the loan, SKANDAL (§10.34)
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
        // In free roam Stig asks whether it is his car, and a Swedish driver may answer "Nej."
        // instead of complaining (§10.14).
        if (!this.sorry.carjack(ped.char)) this.say(ped.char, this.bark(ped.char, 'carjack'), 2);
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
  // Plane seats (§5.10)

  sitPlayer(seatId) {
    if (this.playerCar) return false;
    const p = this.player;
    if (p.state !== 'normal' && p.state !== 'seated') return false;
    return this.cabin.seatCharacter(p, seatId);
  }
  standPlayer() {
    if (this.player.seatId) this.cabin.unseatCharacter(this.player);
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
      const ov = o.vx * fx + o.vz * fz;
      if (ov > car.forwardSpeed + 1.5) continue;
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
    if (this.levelDef.sim.peds) for (const p of this.peds) out.push(p.char);
    for (const k in this.npcs) out.push(this.npcs[k]);
    out.push(...this.party.extras);   // the grisfest's band and tourists (§10.18)
    out.push(...this.bathers.loose);  // bathers off their loungers (§10.22)
    out.push(...this.mic.extras);     // the tourists come to hear Stig at the SunTrip stage (§10.30)
    return out;
  }

  npc(key) {
    if (key === PLAYER_KEY) return this.player;
    if (key === 'vardinna2') return this.cabin.pusher;
    return this.npcs[key];
  }
  charDef(key) { return CHARS[key]; }

  // ------------------------------------------------------------------------------------------
  // NPCs (§4.5)

  // A landmark offset: dx = metres to its left (local +X), dz = metres forward.
  lmOffset(name, dx = 0, dz = 0) {
    const p = typeof name === 'string' ? lm(name) : name;
    const fx = Math.sin(p.yaw || 0), fz = Math.cos(p.yaw || 0);
    return { x: p.x + fz * dx + fx * dz, z: p.z - fx * dx + fz * dz, yaw: p.yaw || 0 };
  }

  placeNpc(key, lmName, dx = 0, dz = 0, yaw) {
    const q = this.lmOffset(lmName, dx, dz);
    if (key === PLAYER_KEY) {
      if (this.playerCar) this.exitCar(true);
      this.standPlayer();
      this.player.state = 'normal';
      this.player.teleport(q.x, q.z, yaw ?? q.yaw);
      this.cam.snapNext = true;
      return;
    }
    const n = this.npcs[key];
    if (!n) { console.warn('placeNpc: unknown key', key); return; }
    this.unseatAny(n);
    this.removeRiderOf(key);
    n.state = 'normal';
    n.root.visible = true;
    n.teleport(q.x, q.z, yaw ?? q.yaw);
    n.busy = true;
    n.spot = null;
  }
  hideNpc(key) {
    const n = this.npcs[key];
    if (!n) return;
    this.unseatAny(n);
    n.state = 'hidden';
    n.root.visible = false;
    n.busy = true;
  }
  showNpc(key) {
    const n = this.npcs[key];
    if (!n) return;
    this.removeRiderOf(key);
    if (n.state === 'hidden') n.state = 'normal';
    n.root.visible = true;
    n.busy = true;
  }

  // Everyone to their place in the current home set; the idle mission's giver to `at` (a giver
  // whose home is a plane seat stays seated), its `extra` around `at`. Busy NPCs are skipped
  // unless forced. A forced placement also re-applies the home set's outfits (§10.4), so the
  // outfit set follows missions.index (gate -> flight without a level change) and cue outfits
  // revert when a mission ends; not during the outro, which still shows the mission's costumes.
  placeNpcs(force = false) {
    if (!this.levelDef) return;
    if (force && this.missions.state !== 'outro') this.applyOutfits();
    const set = this.levelDef.homes(this);
    const ms = this.missions;
    const cur = ms.state === 'idle' && ms.current && ms.current.level === this.level ? ms.current : null;
    for (const key of Object.keys(this.npcs)) {
      const n = this.npcs[key];
      if (!force && (n.busy || n.car)) continue;
      let home = set[key] ?? null;
      // An unlock's home override; `null` hides the NPC (Angerud after the end, UNLOCKS.bodega).
      if (this.level === 'island' && key in this.homeOverrides) home = this.homeOverrides[key];
      let needed = false;
      if (cur) {
        if (cur.giver === key) { needed = true; if (!(home && home.seat)) home = [cur.at, 0, 0]; }
        const ex = cur.extra?.find((e) => e === key || (Array.isArray(e) && e[0] === key));
        if (ex) {
          needed = true;
          home = Array.isArray(ex) ? [cur.at, ex[1], ex[2]] : [cur.at, Array.isArray(home) ? home[1] : 0, Array.isArray(home) ? home[2] : 0];
        }
      }
      if (home === null) {
        if (n.state !== 'hidden' || n.car || n.seatId) this.hideNpc(key);
        n.busy = true;
        continue;
      }
      if (home.seat) {
        if (n.seatId !== home.seat) { this.unseatAny(n); n.state = 'normal'; this.cabin.seatCharacter(n, home.seat); }
        n.busy = true;
        continue;
      }
      const [where, dx, dz, hy] = home;   // optional 4th element: an absolute world yaw (§4.5)
      const id = `${where}:${dx}:${dz}`;
      if (!force) {
        if (n.spot === id && n.state === 'normal' && dist(n.x, n.z, n.homeX, n.homeZ) < 6) continue;
        if (n.state !== 'normal') continue;
        // Don't pop people around in front of the player unless they're needed for a mission.
        if (!needed && dist(n.x, n.z, this.player.x, this.player.z) < 50) continue;
      }
      if (!landmarks[where]) { console.warn('placeNpcs: missing landmark', where); continue; }
      this.unseatAny(n);
      const q = this.lmOffset(where, dx, dz);
      n.state = 'normal';
      n.root.visible = true;
      n.homeX = q.x; n.homeZ = q.z;
      n.teleport(q.x, q.z, hy ?? q.yaw);
      n.spot = id;
      n.busy = false;
    }
  }

  // ------------------------------------------------------------------------------------------
  // Outfits (§2.2, §10.4)

  applyOutfits() {
    const set = this.level === 'island' ? { ...this.levelDef.outfits(this), ...this.outfitOverrides } : this.levelDef.outfits(this);
    for (const key of Object.keys(this.npcs)) {
      const want = set[key] ?? null;
      if ((this.npcs[key].outfit ?? null) !== want) this.setNpcOutfit(key, want);
    }
    const p = this.level === 'flight' ? (set.stig ?? 'kostym') : this.islandOutfit;
    if ((this.player.outfit ?? null) !== p) this.setPlayerOutfit(p, { persist: false });
  }
  setNpcOutfit(key, name) {
    const n = key === 'vardinna2' ? this.cabin.pusher : this.npcs[key];
    if (!n) return;
    n.setDef(outfitDef(key, name));
    n.outfit = name ?? null;
    if (this.portraitsReady) hud.portraits[key] = renderPortrait(renderer, n.model);
  }
  // In free roam on the island what he bought at SunTrip-butiken is a layer over it (§10.23,
  // `shop.dress`; never over `rio`).
  setPlayerOutfit(name, { persist = true } = {}) {
    const p = this.player;
    p.setDef(this.shop ? this.shop.dress(outfitDef(PLAYER_KEY, name), name) : outfitDef(PLAYER_KEY, name));
    p.outfit = name ?? null;
    if (persist && this.level === 'island') this.islandOutfit = name;
    if (this.portraitsReady) hud.portraits[PLAYER_KEY] = renderPortrait(renderer, p.model);
  }

  renderPortraits() {
    for (const key of CAST) {
      let model = key === PLAYER_KEY ? this.player.model : this.npc(key)?.model;
      let tmp = null;
      if (!model) { tmp = buildCharacter(outfitDef(key, null)); model = tmp; }
      hud.portraits[key] = renderPortrait(renderer, model);
    }
    this.portraitsReady = true;
  }

  // ------------------------------------------------------------------------------------------
  // Events

  // A car drives through a prop; the player's own gets Stig's sorry in free roam (§10.14). A fruit
  // stall breaks only under his car in free roam (`stands.canBreak`; else null and car.js meets the
  // wall), its seller and the souvenir seller's swear after it (§10.19). Returns the prop if it broke.
  breakProp(p, vx, vz, car) {
    const stall = p.type === 'frutas';
    if (stall && !this.stands.canBreak(car)) return null;
    const b = breakProp(p, vx, vz, this);
    if (b && car && car === this.playerCar) this.sorry.offence(p.def.explode ? 'boom' : stall ? 'stand' : 'prop');
    if (b && stall) this.stands.onBroken(p, car);
    return b;
  }
  // A taken sun lounger throws its bather off (§10.22): no SKANDAL beyond the lounger's own.
  onPropBroken(p, vx, vz) {
    audio.smash();
    if (p.def.coins) burstCoins(p.x, 0.4, p.z, p.def.coins, vx, vz);
    this.shame.add(p.def.shame * (this.playerCar ? 1.2 : 0.7));
    this.bathers.onPropBroken(p, vx, vz);
    if (p.def.splash) for (let k = 0; k < 6; k++) fx.splash(p.x, p.z);
    if (p.def.explode === 'big') fx.explosion(p.x, 0.5, p.z);
    else if (p.def.explode === 'small') { fx.sparks(p.x, 0.6, p.z, 10); fx.smoke(p.x, 0.6, p.z, true); }
  }

  onCarImpact(a, b, impact, cx, cz) {
    const pc = this.playerCar;
    // His car hit something. On foot (pc null) a car meeting a wall (b null) is not his: until feature
    // 36 it counted, so a Land Rover's wall hits rammed him from afar (two = busted, §7.2 `carBust`).
    const involved = !!pc && (a === pc || b === pc);
    const f = this.focus();
    const near = dist(cx, cz, f.x, f.z) < 60;
    if (near) audio.crash(Math.min(1, impact / 18) * (involved ? 1 : 0.5));
    if (impact > 6 && near) fx.sparks(cx, 0.8, cz, Math.min(14, impact | 0));
    if (involved) {
      this.cam.shake = Math.min(1.2, this.cam.shake + impact * 0.05);
      const other = a === pc ? b : a;
      if (other) {
        if (other.isPursuer) this.shame.onRam(other, impact);
        else if (!other.isTarget && !other.locked) this.shame.add(Math.min(9, impact * 0.55));
      }
      this.pigs.jolt(pc, 'crash', impact);   // the grisbil's pigs tumble off in free roam (§10.15)
      this.stunts.onImpact();                // a jump in the air or just landed: UNDERKÄND (§10.27)
    }
  }
  // Every landing of every car, soft ones too (car.js; the stunt jumps' judge, §10.27).
  onCarAirEnd(car, impact) { this.stunts.onLand(car, impact); }
  onCarLanded(car, impact) {
    if (car === this.playerCar) { audio.thud(); this.cam.shake = Math.min(1, this.cam.shake + impact * 0.03); }
    fx.dust(car.x, car.z, 6);
    this.pigs.jolt(car, 'land', impact);
  }
  onCarDestroyed(car) {
    const f = this.focus();
    if (dist(car.x, car.z, f.x, f.z) < 80) audio.crash(1);
    burstCoins(car.x, 1, car.z, 8);
    if (car === this.playerCar) {
      const c = car;
      this.stunts.onWreck();   // a jump under way: UNDERKÄND after KVADDAD! (§10.27)
      for (const p of car.passengers.slice()) { this.unseat(p); p.fling((Math.random() - 0.5) * 6, 6, (Math.random() - 0.5) * 6); }
      this.exitCar(true);
      this.player.fling(-Math.sin(c.yaw) * 3 + (Math.random() - 0.5) * 4, 7, -Math.cos(c.yaw) * 3);
      hud.showBanner(S.wrecked, '', 'bad', 1600);
    } else {
      for (const p of [car.driver, ...car.passengers]) if (p) { this.unseat(p); p.fling((Math.random() - 0.5) * 6, 6, (Math.random() - 0.5) * 6); }
      if (car.driverBust) { car.tilt.remove(car.driverBust); car.driverBust = null; }
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
    if (byPlayer) { this.shame.add(ch.key ? 14 : 18); this.sorry.offence('hit'); }
    if (Math.random() < 0.8) this.say(ch, this.bark(ch, 'ouch'), 1.6);
  }
  // A bather off his lounger always mutters (§10.22).
  onGetUp(ch) {
    if (this.bathers.onGetUp(ch)) return;
    if (ch !== this.player && Math.random() < 0.35 && dist(ch.x, ch.z, this.player.x, this.player.z) < 30) this.say(ch, this.bark(ch, 'getUp'), 1.8);
  }
  // A bark from the speaker's own table (§14.10): Ole's Norwegian one, the local one for the Spanish
  // cast and the local pedestrians, SunTrip staff's where the kind has one, else the Swedish
  // tourists'. kind: ouch | getUp | kicked | carjack.
  bark(ch, kind) {
    const t = BARKS[kind];
    return pick((ch.key === 'ole' && t.ole) || ((ch.def?.local || LOCAL_CAST.includes(ch.key)) && t.local) || (STAFF_CAST.includes(ch.key) && t.staff) || t.sv);
  }
  onBodyBounce(ch) { if (dist(ch.x, ch.z, this.focus().x, this.focus().z) < 40) audio.thud(); }
  // A trampoline under the player (b: its block): the boing, and Flamenco's board to the judges (§10.8);
  // a bounce is a trick for Herr Storch's camera (§10.11).
  onBounce(ch, b) {
    if (ch !== this.player) return;
    audio.boing();
    this.judges.onBounce(b);
    this.film.trick('studs');
  }
  // J in the air (§3): slam down; the landing (onLand) breaks props, bowls people over, dents cars.
  stomp() { this.player.vy = -18; this.stomping = true; audio.kick(); }
  // y: the floor he lands on. A dive off the 10 m tower into the water (§10.20), a fall off the hotel
  // roofs into the pool next door (§10.29) and a hop off Flamenco's board into the pool (judged, §10.8)
  // splash instead of the dust, and so does any other
  // hard landing in water (waterSplash); they read `stomping` (the cannonball, the belly flop) before
  // it is cleared, as does Herr Storch's camera (a stomp or a long drop is a trick, §10.11).
  onLand(ch, v, y) {
    if (ch !== this.player) return;
    const dove = this.tower.onLand(v, y), roofDove = this.roofs.onLand(v, y), judged = this.judges.onLand(y);
    let wet = dove || roofDove || judged;
    this.film.onLand(y, this.stomping);
    if (!wet && !ch.standingOn && waterAt(ch.x, ch.z, y)) { this.waterSplash(ch.x, ch.z, v, this.stomping); wet = true; }
    if (this.stomping) {
      this.stomping = false;
      audio.crash(0.4);
      this.cam.shake = Math.max(this.cam.shake, 0.6);
      if (!wet) fx.dust(ch.x, ch.z, 12, ch.y + 0.2);
      this.areaHit(ch.x, ch.z, ch.y, 2.6, 0, 0, true);
    } else if (!wet) fx.dust(ch.x, ch.z, 3, ch.y + 0.1);
  }
  // Water thrown up where he lands hard (v m/s, over 6) in a pool or a pond, for the dust: the drops
  // and the sound grow with v (about 22 off the 10 m tower), and a stomp's is a cannonball, a column
  // of water and a boom with the camera shaken (§10.20). Built once for every hard landing in water;
  // the judged hops and the glide keep their own.
  waterSplash(x, z, v, bomb = false) {
    const k = clamp((v - 6) / 16, 0, 1);
    fx.splash(x, z, Math.round(16 + 34 * k), 3 + 3.5 * k, 4 + k);
    if (bomb) {
      fx.splash(x, z, Math.round(30 + 50 * k), 1.4 + k, 7 + 3 * k);
      this.cam.shake = Math.max(this.cam.shake, 0.6 + 0.8 * k);
    }
    audio.splash(bomb ? 1 + k : k);
  }
  onHonk(car) {
    const f = this.focus();
    if (dist(car.x, car.z, f.x, f.z) < 40) { audio.tone(330, 0.25, 'square', 0.05); audio.tone(415, 0.25, 'square', 0.04); }
  }

  // ------------------------------------------------------------------------------------------
  // Money (§10.2)

  collectCoin(c) {
    this.coins += c.value;
    hud.setCoins(this.coins);
    hud.bumpCoins();
    audio.coin();
  }
  addCoins(n) { this.coins = Math.max(0, this.coins + n); hud.setCoins(this.coins); hud.bumpCoins(); }
  // No soft locks: if the purse is short, Ole pays (nothing is deducted).
  async pay(n) {
    if (this.coins >= n) { this.addCoins(-n); return true; }
    this.radio('ole', S.olePaysRadio);
    hud.toast(fmt('olePays', { n: pta(n) }));
    return true;
  }

  // ------------------------------------------------------------------------------------------
  // Talking, cues, cinematics (§9.3)

  // `saying(t)`: t's bubble is still up; `sayEnd`: when the last bubble said ends (hud's clock).
  // A long line stays up long enough to read (1 s + 0.045 s a character; halved in test mode, like
  // the stage kinds' lineSecs): a 97-character chatter line no longer goes after 2.6 s.
  // An empty line or secs <= 0 is not a line: it takes t's bubble down (unsay), never an empty pill
  // held up by that minimum.
  say(target, text, secs = 2) {
    const t = typeof target === 'string' ? this.npc(target) : target;
    if (!t) return;
    if (!text || secs <= 0) { this.unsay(t); return; }
    secs = Math.max(secs, (1 + String(text).length * 0.045) * (this.testMode ? 0.5 : 1));
    hud.say(t, text, secs);
    t.sayEnd = performance.now() + secs * 1000;
    this.sayEnd = Math.max(this.sayEnd || 0, t.sayEnd);
  }
  // Takes t's bubble down at once (a line cut by a dialogue or cutaway). The cut line no longer
  // counts as said: `saying(t)` is false and `sayEnd` falls back to the bubbles still up, so it does
  // not hold the mantra auto-bubble back either.
  unsay(target) {
    const t = typeof target === 'string' ? this.npc(target) : target;
    if (!t) return;
    const now = performance.now(), rest = hud.unsay(t);
    if ((t.sayEnd ?? 0) > now) t.sayEnd = now;
    if ((this.sayEnd || 0) > now) this.sayEnd = Math.max(now, rest);
  }
  saying(t) { return performance.now() < (t?.sayEnd ?? 0); }
  radio(who, text) {
    hud.toast(`<img class="radio-face" src="${hud.portraits[who] || ''}"><b>${CHARS[who]?.name || who}:</b> ${text}`, 'radio');
    for (let k = 0; k < 8; k++) setTimeout(() => audio.talk(CHARS[who]?.voice || 300), k * 70);
  }
  setTalker(who) { this.talker = who; }

  async dialog(lines) {
    this.inDialog = true;
    await hud.runDialog(lines.map(([who, text, cue]) => ({ who, text, cue })), this);
    this.inDialog = false;
  }

  cue(c) {
    if (!c) return;
    const cab = this.cabin;
    if (c.pa) audio.dingdong();
    if (c.say) this.say(this.npc(c.say[0]), c.say[1], c.say[2] ?? 2.6);
    if (c.radio) this.radio(c.radio[0], c.radio[1]);
    if (c.sfx) {
      if (JINGLES.includes(c.sfx)) audio.jingle(c.sfx);
      else if (typeof audio[c.sfx] === 'function') audio[c.sfx]();
      else if (TRAD.includes(c.sfx)) audio.trad(c.sfx);
      else console.warn('cue: unknown sfx', c.sfx);
    }
    if (c.fear) { this.shame.add(c.fear, { force: true }); this.interruptMantra(); }
    if (c.relieve) this.shame.relieve(c.relieve);
    if (c.shake) this.cam.shake = Math.max(this.cam.shake, c.shake);
    if (c.applause) audio.applause(c.applause);
    if (c.phase !== undefined) { const [n, o] = Array.isArray(c.phase) ? c.phase : [c.phase, {}]; cab.setPhase(n, o || {}); }
    if (c.seatbelt !== undefined) cab.setSeatbelt(c.seatbelt);
    if (c.turbulence) cab.turbulence(...c.turbulence);
    if (c.trolley !== undefined) { if (c.trolley === 'park') cab.parkTrolley(); else if (c.trolley) cab.startTrolley(); else cab.stopTrolley(); }
    if (c.blockers !== undefined) cab.setAisleBlockers(!!c.blockers);
    if (c.outfit) { if (c.outfit.who === PLAYER_KEY) this.setPlayerOutfit(c.outfit.name); else this.setNpcOutfit(c.outfit.who, c.outfit.name); }
    if (c.music) {
      if (typeof c.music === 'string') { if (TRAD.includes(c.music)) audio.trad(c.music); else audio.setTune(c.music); }
      else { const prev = audio.tune; audio.setTune(c.music.tune); if (c.music.secs) this.wait(c.music.secs).then(() => audio.setTune(prev)); }
    }
    if (c.sky) this.setSky(c.sky);
    if (c.place) for (const [k, v] of Object.entries(c.place)) this.placeNpc(k, ...v);
    if (c.hide) for (const k of c.hide) this.hideNpc(k);
    if (c.show) for (const k of c.show) this.showNpc(k);
    if (c.anim) {
      const who = Array.isArray(c.anim.who) ? c.anim.who : [c.anim.who];
      for (const k of who) { const n = this.npc(k); if (n) n.anim[c.anim.flag] = true; }
      this.wait(c.anim.secs ?? 2).then(() => { for (const k of who) { const n = this.npc(k); if (n) n.anim[c.anim.flag] = false; } });
    }
    if (c.coins) this.addCoins(c.coins);
    if (c.pay) this.pay(c.pay);
    if (c.flash) hud.flashColor(c.flash === 'white' ? 'rgba(255,255,255,0.85)' : c.flash);
    if (c.banner) hud.showBanner(c.banner[0], c.banner[1] || '', c.banner[2] || '', 2600);
    if (c.toast) hud.toast(c.toast);
    if (c.cut !== undefined) { if (c.cut === null) this.endCut(); else this.cutTo(c.cut); }
    if (c.unlock) this.unlock(c.unlock);
    if (c.sparkle) { const p = this.player; fx.sparkle(p.x, p.y + 1.6, p.z, 0xffd23f, 30); }
    if (c.endCard) this.pendingEndCard = true;
  }

  // True while a cutaway camera (cutTo, a `cut` cue, a scene's `cam`, a cutTo outroCam) is active.
  get inCutaway() { return !!this._cutPrev; }
  cinematic(a, b) { this.cam.frame(a, b); hud.letterbox(true); this.inDialog = true; }
  cinematicOne(a) { this.cam.frameOne(a); hud.letterbox(true); this.inDialog = true; }
  endCinematic() { this._cutPrev = null; this.cam.release(); hud.letterbox(false); this.inDialog = false; }
  // Cutaway camera without moving the player: spec = landmark name | { at, dist = 9, height = 4 }.
  // The camera stands behind the landmark and looks the way it faces.
  cutTo(spec) {
    if (spec == null) { this.endCut(); return; }
    const s = typeof spec === 'string' ? { at: spec } : spec;
    const l = typeof s.at === 'string' ? lm(s.at) : s.at;
    const d = s.dist ?? 9, h = s.height ?? 4;
    const fx = Math.sin(l.yaw || 0), fz = Math.cos(l.yaw || 0);
    const gy = this.groundAt(l.x, l.z);
    if (this._cutPrev === undefined || this._cutPrev === null) this._cutPrev = this.cam.cine ? { pos: this.cam.cine.pos.clone(), look: this.cam.cine.look.clone() } : 'none';
    this.cam.cutTo({ x: l.x - fx * d, y: gy + h, z: l.z - fz * d }, { x: l.x + fx * 4, y: gy + 1.4, z: l.z + fz * 4 });
  }
  endCut() {
    if (!this._cutPrev) return;
    if (this._cutPrev === 'none') this.cam.release();
    else { this.cam.cine = this._cutPrev; this.cam.snapNext = true; }
    this._cutPrev = null;
  }
  onFrame(fn) { this.hooks.push(fn); }
  offFrame(fn) { this.hooks = this.hooks.filter((h) => h !== fn); }
  wait(secs) {
    return new Promise((resolve) => {
      let t = 0;
      const fn = (dt) => { t += dt; if (t >= secs) { this.offFrame(fn); resolve(); } };
      this.onFrame(fn);
    });
  }

  // ------------------------------------------------------------------------------------------
  // Meter hooks, mantra

  // FLYGRÄDSLA hit 100 outside a panicFails stage: back to the seat (or the gate), -50 pta.
  onPanicIdle() {
    const def = this.levelDef, p = this.player;
    const inCabin = this.cabin.inCabin(p.x, p.z);
    const home = def.panicHome ? def.panicHome(this) : null;
    hud.flashColor('rgba(255,255,255,0.9)');
    if (this.playerCar) this.exitCar(true);
    if (home?.seat) {
      if (p.seatId !== home.seat) {
        this.standPlayer();
        p.state = 'normal';
        if (!this.sitPlayer(home.seat)) { const s = this.approachSpot('cabinRow14'); p.teleport(s.x, s.z, s.yaw); }
      }
    } else if (home?.lm) {
      this.standPlayer();
      p.state = 'normal';
      const s = this.approachSpot(home.lm);
      p.teleport(s.x, s.z, s.yaw);
    }
    const fee = Math.min(this.coins, this.shame.cfg.panicFee ?? 50);
    this.coins -= fee;
    hud.setCoins(this.coins);
    hud.toast(inCabin ? S.panicIdle : S.panicIdleGate);
    this.shame.v = this.shame.cfg.panicResetTo ?? 40;
    this.bumpedT = 0.4;
    this.cam.snapNext = true;
  }

  // A jolt or a fear cue breaks a held mantra: the wind-up restarts (0.6 s instead of 0.3 s).
  interruptMantra() {
    if (this.mantraHeldT > 0 || this.mantraOn) { this.mantraHeldT = 0; this.mantraOn = false; this.mantraWindUp = 0.6; }
  }

  // ------------------------------------------------------------------------------------------
  // Unlocks, end card (§10.3, §11.7)

  // `holdToast`: the toast is not shown but returned (null when there is none, or it is not the
  // first unlock), for the caller to show later: the runner holds julafton's until the end card is
  // over (§11.7).
  unlock(name, { holdToast = false } = {}) {
    if (!UNLOCKS[name]) { this.unlocked.add(name); return null; }
    const first = !this.unlocked.has(name);
    this.unlocked.add(name);
    this.applyUnlock(name);
    this.dressRoom107();
    const toast = (first && UNLOCKS[name].toast) || null;
    if (toast && !holdToast) hud.toast(toast);
    this.save();
    return holdToast ? toast : null;
  }
  applyUnlock(name) {
    const u = UNLOCKS[name];
    if (!u) return;
    if (u.car) {
      const c = u.car;
      if (!this.named[c.name] || !this.cars.includes(this.named[c.name])) {
        const q = this.lmOffset(c.at, c.dx ?? 0, c.dz ?? 0);
        const pc = { type: c.type, x: q.x, z: q.z, yaw: q.yaw, name: c.name };
        if (!parkedCars.find((p) => p.name === c.name)) parkedCars.push(pc);
        this.spawnParked(pc);
      }
    }
    if (u.hook) worldHooks[u.hook]?.(true);
    if (u.home) Object.assign(this.homeOverrides, u.home);
    if (u.outfit) Object.assign(this.outfitOverrides, u.outfit);   // worn from the next forced placement (placeNpcs(true))
    if (u.chatter) Object.assign(this.chatterOverrides, u.chatter);
    if (u.witness) this.witnessOverride = u.witness;
    // u.tune: offered by the pause-menu Musik button once unlocked (cycleMusic); never auto-played.
  }
  // Rum 107's keepsakes (feature 38, §10.25): the room shows what is collected and unlocked
  // (hotels.js roomKeepsakes) after a pickup, an unlock and a load.
  dressRoom107() { worldHooks.rum107?.(this.collected, this.unlocked); }
  // The Rio end card (§11.7; set built by rio.js at x = -3000, landmarks rioBoat/rioCam): a white
  // flash, then Stig (outfit rio), Majsan, Ole (rio) and Siv on the yacht's aft deck at sunset to
  // the samba, the film's opening card as the banner; another flash, back to the island at the
  // Flamenco pool in ordinary clothes, the completion banner, and free roam continues.
  async playEndCard() {
    const white = 'rgba(255,255,255,0.95)';
    this.shame.clear();
    if (this.playerCar) this.exitCar(true);
    this.inDialog = true;
    hud.letterbox(true);
    hud.clearToasts();   // nothing from the island lies over the card (the runner holds the unlock's toast)
    hud.flashColor(white);
    const b = lm('rioBoat'), c = lm('rioCam');
    this.setSky('sunset');
    audio.setTune('samba');
    this.setPlayerOutfit('rio', { persist: false });
    this.setNpcOutfit('ole', 'rio');
    // Aft deck (|dx| <= 1.4, dz 1..5 from rioBoat; teleport snaps to the deck at 0.55), everyone
    // turned towards rioCam: one row across its view at one depth, the couples side by side (0.7 m,
    // 1 m between them; left to right Siv, Ole, Majsan, Stig). Majsan stood half behind Ole.
    // Arms down: the outro's poses (the duet's 6 s `wings`) end here, not on their cue's clock, which
    // still ran when a player read on, and Majsan's arm lay across Ole on the deck (Phase 3 r3).
    for (const [k, dx, dz] of [[PLAYER_KEY, 0.76, 1.83], ['majsan', 0.45, 2.46], ['ole', 0, 3.35], ['siv', -0.31, 3.98]]) {
      const q = this.lmOffset(b, dx, dz);
      this.placeNpc(k, 'rioBoat', dx, dz, yawTo(c.x - q.x, c.z - q.z));
      for (const f of ANIM_FLAGS) this.npc(k).anim[f] = false;
    }
    this.endCut();
    this.cam.cutTo({ x: c.x, y: 3.2, z: c.z }, { x: b.x, y: 2.3, z: b.z + 1.5 });
    this.cam.snapNext = true;
    hud.showBanner(S.endCardMain, S.endCardSub, 'mission endcard', 6000);
    await this.wait(6.6);
    hud.flashColor(white);
    this.cam.release();
    this.setSky(this.levelDef.palette || 'day');
    this.placeNpcs(true);   // home set and home outfits (Ole back in 'sol')
    this.applyOutfits();    // the player's island outfit
    const s = this.approachSpot('flamencoPool');
    this.player.state = 'normal';
    this.player.teleport(s.x, s.z, s.yaw);
    this.cam.yaw = s.yaw;
    this.cam.snapNext = true;
    audio.setTune(this.levelTune());
    hud.letterbox(false);
    this.inDialog = false;
    hud.showBanner(S.gameComplete, S.gameCompleteSub, 'good', 5000);
    audio.jingle('complete');
  }

  // ------------------------------------------------------------------------------------------
  // Interactables (§14.3)

  // { id, x, z, y = 0.15, pos?(g) -> { x, z, y? }, r = 1.2, prompt, priority = 0, whileSeated = false,
  //   enabled?(g), use(g) } -> remove(). The caller's object is kept (its methods may use `this`).
  addInteractable(it) {
    const defaults = { y: 0.15, r: 1.2, priority: 0, whileSeated: false };
    for (const [k, v] of Object.entries(defaults)) if (it[k] === undefined) it[k] = v;
    this.interactables.push(it);
    return () => { const i = this.interactables.indexOf(it); if (i >= 0) this.interactables.splice(i, 1); };
  }

  bestInteractable(filter) {
    const p = this.player;
    let best = null, bp = -Infinity, bd = Infinity;
    for (const it of this.interactables) {
      if (!filter(it)) continue;
      const q = it.pos ? it.pos(this) : it;
      if (!q) continue;
      if (it.enabled && !it.enabled(this)) continue;
      const d = dist(q.x, q.z, p.x, p.z);
      if (d > it.r || Math.abs((q.y ?? it.y ?? 0.15) - p.y) > 2.5) continue;
      const pr = it.priority || 0;
      if (pr > bp || (pr === bp && d < bd)) { best = it; bp = pr; bd = d; }
    }
    return best;
  }

  nearestInteractable() {
    const p = this.player;
    if (this.playerCar) return null;
    const ms = this.missions;
    if (p.state === 'seated' && p.seatId) {
      const it = this.bestInteractable((i) => i.whileSeated);
      if (it) return { type: 'it', it };
      const st = ms.state === 'running' ? ms.stage : null;
      if (st && (st.lockSeat || st.o?.lockSeat)) return null;
      return { type: 'stand' };
    }
    if (p.state !== 'normal') return null;
    const top = this.bestInteractable((i) => !i.whileSeated && (i.priority || 0) >= 100);
    if (top) return { type: 'it', it: top };
    // Not with Berra on his shoulders (§10.6): the carry would follow him into the mission.
    if (ms.state === 'idle' && ms.current && ms.current.level === this.level && !this.carrying) {
      const g = this.npcs[ms.current.giver];
      if (g && g.state !== 'hidden' && dist(g.x, g.z, p.x, p.z) < 3.4 && Math.abs(g.y - p.y) < 2) return { type: 'talk', who: g };
    }
    const it = this.bestInteractable((i) => !i.whileSeated);
    if (it) return { type: 'it', it };
    // Someone in the gang to talk to (free roam, §10.28): after every interactable, before the cars.
    const who = this.chat.nearest();
    if (who) return { type: 'chat', who };
    if (!this.levelDef.verbs.enterCars || this.carrying?.who) return null;
    let best = null, bd = 2.2;
    for (const c of this.cars) {
      if (c.dead || c.noEnter || Math.abs(c.x - p.x) > 8 || Math.abs(c.z - p.z) > 8) continue;
      if (p.y > c.y + c.height - 0.3) continue;
      const h = {};
      if (circleVsObb(p.x, p.z, 1.9, c.obb, h)) {
        const d = 1.9 - h.depth;
        if (d < bd) { bd = d; best = { type: 'car', car: c }; }
      }
    }
    return best;
  }

  interact() {
    const it = this.nearestInteractable();
    if (!it) return;
    if (it.type === 'talk') this.missions.begin();
    else if (it.type === 'chat') this.chat.start(it.who);
    else if (it.type === 'car') this.enterCar(it.car);
    else if (it.type === 'it') it.it.use?.(this);
    else if (it.type === 'stand') this.standPlayer();
  }

  // ------------------------------------------------------------------------------------------
  // Save (§10.5)

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, mission: this.missions.index, coins: this.coins,
        collected: Object.fromEntries(Object.entries(this.collected).map(([k, ids]) => [k, [...ids]])),
        unlocked: [...this.unlocked], outfit: this.islandOutfit, tune: this.islandTune, records: this.records,
        shop: this.shop.saveData(), gags: this.gags.saveData(),
      }));
    } catch (e) { /* private mode: progress just won't persist */ }
  }
  load() {
    if (!params.has('fresh')) {
      try {
        const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
        if (s && s.v === 1) {
          this.missions.index = Math.min(MISSIONS.length, s.mission || 0);
          this.coins = s.coins || 0;
          // Every set in COLLECTIBLES; a save from before a set has none of it (still v 1).
          for (const k of Object.keys(COLLECTIBLES)) this.collected[k] = new Set(s.collected?.[k] || []);
          this.unlocked = new Set(s.unlocked || []);
          this.records = { ...s.records };
          this.islandOutfit = s.outfit || 'kostym';
          this.islandTune = s.tune === 'samba' && this.unlocked.has('samba') ? 'samba' : 'sol';
          this.shop.loadData(s.shop);   // SunTrip-butiken's purchases and the Trapp Trull account (§10.23)
          this.gags.loadData(s.gags);   // the gags played (§10.32)
        }
      } catch (e) { /* corrupt save: start fresh */ }
    }
    if (params.has('mission')) this.missions.index = Math.max(0, Math.min(MISSIONS.length, +params.get('mission')));
    // Booting straight into a mission past buss17 means the hawaii shirt is already on.
    if (params.has('mission') && this.missions.index > 5) this.islandOutfit = 'hawaii';
  }
  applySaveToWorld() {
    for (const [setName, list] of Object.entries(this.collectibles)) {
      for (const c of list) if (this.collected[setName]?.has(c.id)) { if (COLLECTIBLES[setName].keep) c.mark(); else c.remove(); }
    }
    for (const u of this.unlocked) this.applyUnlock(u);
    this.dressRoom107();
    if (this.homeOverrides && Object.keys(this.homeOverrides).length) this.placeNpcs(true);
  }
  resetSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    this.film.forget();   // Herr Storch's stills (their own key, §10.5)
    location.href = location.pathname;
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
    else if (input.padPressed('pause')) this.pause(false);   // pad Start toggles the pause card
    renderer.render(scene, camera);
    if (this.film?.grabNow) this.film.grab();   // Herr Storch's still, in this frame's buffer (§10.11)
    input.endFrame();
    this.frame++;
    window.__frame = this.frame;
  }

  idleTitle(dt) {
    this.time += dt;
    const o = this.levelDef.titleOrbit;
    const c = o.lm ? lm(o.lm) : o;
    const a = this.time * 0.08;
    camera.position.set(c.x + Math.sin(a) * o.r, o.h, c.z + Math.cos(a) * o.r);
    camera.lookAt(c.x, 2, c.z);
    followSun(c.x, c.z);
    tickSky(this.time, camera.position);
    if (this.level === 'flight' && this.cabin.phase === 'gate') {
      for (let k = 0; k < 2; k++) fx.snow(c.x + (Math.random() - 0.5) * 60, 14, c.z + (Math.random() - 0.5) * 60);
    }
    fx.tick(dt);
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
    this.missions.syncIdleAnim();
    this.shame.update(dt);
    this.berraJob.update(dt);
    this.glide.update(dt);
    this.judges.update(dt);
    this.tower.update(dt);
    this.honk.update(dt);
    this.day.update(dt);
    this.film.update(dt);
    this.eslov.update(dt);
    this.fest.update(dt);
    this.sorry.update(dt);
    this.pigs.update(dt);
    this.belt.update(dt);
    this.lapp.update(dt);
    this.party.update(dt);
    this.stands.update(dt);
    this.dogs.update(dt);
    this.bathers.update(dt);
    this.shop.update(dt);
    this.toasters.update(dt);
    this.room107.update(dt);
    this.solkram.update(dt);
    this.stunts.update(dt);
    this.chat.update(dt);
    this.roofs.update(dt);
    this.mic.update(dt);
    this.birds.update(dt);
    this.dream.update(dt);
    this.jeep.update(dt);
    if (this.level === 'flight') this.cabin.tick(dt * this.timeScale, this.time, this);
    this.bumpedT = Math.max(0, this.bumpedT - dt);
    this.frozenT = Math.max(0, this.frozenT - dt);
    this.tickPickups(dt);
    const f = this.focus();
    tickProps(dt, f.x, f.z);
    fx.tick(dt);
    tickTown(this.time);
    this.updateMarkers();
    this.cam.clampActive = this.level === 'flight' && this.cabin.inCabin(f.x, f.z);
    // The open gate lounge (past the jet bridge): dialogue framing without the dollhouse (§5.3).
    // Not in the 3 m wide landside pocket: there the side shot stood across the security counters,
    // with the arch post or beam over a speaker.
    const flx = f.x - CABIN_X;
    this.cam.openFloor = this.level === 'flight' && this.cabin.phase === 'gate' && flx > 14 && !(flx > 34.5 && f.z < 10.5);
    this.cam.update(dt, { ...f, autoTurn: false, lookBack: input.down('lookBack') }, this.inDialog ? null : input.look(), this.cars);
    // Debug overview. The flight level's fog ends at 300 m (gate), so the camera comes in to ~85 m.
    if (this.aerial) { const k = this.level === 'flight' ? 0.17 : 1; camera.position.set(f.x, 420 * k, f.z + 260 * k); camera.lookAt(f.x, 0, f.z); camera.fov = 50; camera.updateProjectionMatrix(); }
    followSun(f.x, f.z);
    tickSky(this.time, camera.position);
    this.updateHud();
    this.updateAudio(dt);
    if (this.levelDef.sim.traffic) this.recycleTraffic(dt);
    this.saveT = (this.saveT || 0) + dt;
    if (this.saveT > 30) { this.saveT = 0; this.save(); }
  }

  stageLocksSeat() {
    const st = this.missions.state === 'running' ? this.missions.stage : null;
    return !!(st && (st.lockSeat || st.o?.lockSeat));
  }

  handleOneShots() {
    if (input.pressed('mute')) { audio.setMuted(!audio.muted); hud.toast(audio.muted ? S.soundOff : S.soundOn); }
    if (input.pressed('map')) { this.bigMap = !this.bigMap; hud.toggleBigMap(this.bigMap, this); }
    if (input.pressed('pause') && !TEST) { this.pause(true); return; }
    if (this.inDialog || this.missions.state === 'failed') return;
    const p = this.player;
    if (input.pressed('reset')) {
      // Never while busted-frozen or flailing (§14.3 frozenT, §5.9).
      if (this.frozenT > 0 || this.shame.panicT > 0) return;
      this.belt.release(false);   // off his bag on the baggage belt first (§10.16)
      if (p.seatId) { if (this.stageLocksSeat()) return; this.standPlayer(); }
      // A reset spills a carry: R is never a free teleport to a carry goal.
      if (this.resetPlayer() && this.carrying) this.bumpedT = 0.4;
      return;
    }
    if (this.playerCar) {
      // The horn as an event in free roam (§10.9); updateAudio plays it everywhere. In the borrowed
      // Guardia jeep H is its siren instead (§10.34).
      if (input.pressed('horn') && !this.jeep.hasSiren(this.playerCar)) this.honk.press();
      if (input.pressed('interact')) this.exitCar();
      return;
    }
    if (this.frozenT > 0 || this.shame.panicT > 0) return;
    // On a bag on the baggage belt (§10.16): Space hops off the bag, E steps off the belt.
    if (this.belt.seated) {
      if (input.pressed('jump')) this.belt.standUp('hop');
      else if (input.pressed('interact')) this.belt.standUp('off');
      return;
    }
    if (p.state === 'seated' && p.seatId) {
      if (input.pressed('interact')) this.interact();
      return;
    }
    if (p.state !== 'normal') return;
    // In the pool fest's ring (§10.13): Space is a hop on the beat, E steps out; no kick or stomp.
    if (this.fest.joined) {
      if (input.pressed('jump')) this.fest.hop();
      if (input.pressed('interact')) this.interact();
      return;
    }
    const verbs = this.levelDef.verbs;
    if (input.pressed('jump')) {
      if (verbs.jump) {
        if (p.onGround) { p.jump(8.6); this.jumps = 1; audio.jump(); }
        else if (this.jumps < 2) { p.vy = 8.0; this.jumps = 2; audio.jump(); this.spinT = 0.4; this.film.trick('volt'); }
      } else if (verbs.hold && !this.spaceToastShown) { this.spaceToastShown = true; hud.toast(S.spaceFirst); }
    }
    if (input.pressed('attack') && verbs.kick && !this.mantraMode && this.kickT <= 0) {
      // After julafton the glide takes the air press: a quick release still stomps (§10.7).
      if (!p.onGround && p.y > groundAt(p.x, p.z, p.y, 0.45) + 0.8) { if (!this.glide.press()) this.stomp(); }
      else { p.anim.kick = 1; this.kickT = 0.38; this.kickHitT = 0.11; audio.kick(); }
    }
    if (input.pressed('interact')) this.interact();
  }

  // R: back to the road (island) or the level's reset spot (flight, §3). False when R does nothing
  // (the terminal on a timed stage, when every spot is nearer its target than he is: a toast says so).
  resetPlayer() {
    const def = this.levelDef;
    if (def.resetSpot) {
      const spot = def.resetSpot(this);
      if (!spot) { hud.toast(S.resetNone); return false; }
      const s = typeof spot === 'string' ? this.approachSpot(spot) : spot;
      if (this.playerCar) this.exitCar(true);
      this.player.state = 'normal';
      this.player.teleport(s.x, s.z, s.yaw);
      this.cam.snapNext = true;
      hud.toast(S.resetFlight);
      return true;
    }
    const f = this.focus();
    const i = Math.round((f.x + HALF) / P), j = Math.round((f.z + HALF) / P);
    const rx = clamp(i, 0, N) * P - HALF, rz = clamp(j, 0, N) * P - HALF;
    let x, z, yaw;
    // Right-hand lanes: heading +z keeps to -x, heading +x keeps to +z.
    if (Math.abs(f.x - rx) < Math.abs(f.z - rz)) { x = rx - LANE; z = clamp(f.z, -HALF, HALF); yaw = 0; }
    else { x = clamp(f.x, -HALF, HALF); z = rz + LANE; yaw = Math.PI / 2; }
    if (this.playerCar) { this.playerCar.place(x, z, yaw); }
    else this.player.teleport(x, z, yaw);
    this.cam.snapNext = true;
    hud.toast(S.reset);
    return true;
  }

  fixedStep(h) {
    const p = this.player, def = this.levelDef, verbs = def.verbs;
    const frozen = this.inDialog || this.missions.state === 'failed' || this.frozenT > 0 || this.shame.panicT > 0;
    // Mantra (J held): flight, or the island during a mantra stage. Works seated too.
    const canMantra = (verbs.mantra || this.mantraMode) && !this.playerCar && !frozen && (p.state === 'normal' || (p.state === 'seated' && p.seatId));
    if (canMantra && input.down('attack')) {
      this.mantraHeldT += h * this.timeScale;
      p.anim.wings = true;
      this.mantraPose = true;
      if (this.mantraHeldT >= this.mantraWindUp) {
        this.mantraOn = true;
        if (this.shame.mode === 'panic') this.shame.relieve(25 * h * this.timeScale);
        // The auto-bubble waits while any other bubble is up (straight to hud, so it does not
        // count itself): it covered the takeoff's scripted lines and replaced Stig's own.
        this.mantraSayT -= h;
        if (this.mantraSayT <= 0 && performance.now() >= (this.sayEnd || 0)) { this.mantraSayT = 2.5; hud.say(p, S.mantraLine, 2.2); }
      }
    } else {
      if (this.mantraHeldT > 0 || this.mantraOn) this.mantraWindUp = 0.3;
      this.mantraHeldT = 0;
      this.mantraOn = false;
      this.mantraSayT = 0;
      if (this.mantraPose) { p.anim.wings = false; this.mantraPose = false; }
    }
    // HÅLL I DIG (Space held, flight): grab a seat back, stop moving.
    this.holding = verbs.hold && !this.playerCar && p.state === 'normal' && !frozen && input.down('jump');
    if (this.holding !== this.holdPose) p.anim.hold = this.holdPose = this.holding;
    const flail = this.shame.panicT > 0;
    if (flail !== this.flailPose) p.anim.flail = this.flailPose = flail;
    // Player intent.
    if (this.playerCar) {
      const c = this.playerCar.ctrl;
      // Frozen: brake only while rolling forward (car.js reads brake below 0.5 m/s as reverse, and
      // a frozen car crept back to −0.35 × top speed: 22 m back from the race grid), then the
      // handbrake brings it to rest and holds it.
      if (frozen || this.freezeCar) { c.throttle = 0; c.brake = this.playerCar.forwardSpeed > 0.5 ? 1 : 0; c.steer = 0; c.handbrake = true; }
      else { c.throttle = input.throttle(); c.brake = input.brake(); c.steer = input.steer(); c.handbrake = input.down('handbrake'); }
      c.park = false;
    } else if (p.state === 'normal') {
      // In the pool fest's ring he stands in his place (a step out leaves it: fest.update).
      if (frozen || this.holding || p.anim.wings || this.fest.joined) { p.wishX = p.wishZ = 0; p.anim.sprint = false; }
      else {
        const mx = input.moveX(), my = input.moveY();
        const fx = Math.sin(this.cam.yaw), fz = Math.cos(this.cam.yaw);
        let wx = fx * my + -fz * mx, wz = fz * my + fx * mx;
        const l = Math.hypot(wx, wz);
        if (l > 1) { wx /= l; wz /= l; }
        const sprint = input.down('sprint') && !this.speedCap;
        const sp = Math.min(sprint ? def.speeds.sprint : def.speeds.walk, this.speedCap ?? Infinity);
        p.wishX = wx * sp; p.wishZ = wz * sp;
        p.anim.sprint = sprint && l > 0.1;
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

    const simTraffic = def.sim.traffic;
    for (const c of this.cars) if (c.ai && (simTraffic || !c.traffic)) c.ai.update(h, this);
    for (const c of this.cars) if (simTraffic || !c.traffic) c.step(h, this);
    const cars = this.cars;
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) collideCars(cars[i], cars[j], this);
    // People. The glide (§10.7) steers and eases his fall around his step.
    this.glide.step(h);
    if (!this.playerCar) p.step(h, this);
    this.glide.after(h);
    this.belt.carry(h);   // standing on the baggage belt, it carries him (§10.16)
    if (def.sim.peds) for (const ped of this.peds) { ped.update(h, this); ped.char.step(h, this); }
    for (const k in this.npcs) {
      const n = this.npcs[k];
      if (n.state === 'seated' || n.state === 'hidden') continue;
      // A free-roam module may walk an NPC: `n.steer(h)` -> { x, z } m/s (berraJob: Robban follows).
      const w = n.steer?.(h);
      n.wishX = w ? w.x : 0; n.wishZ = w ? w.z : 0;
      n.step(h, this);
    }
    this.party.step(h);   // the grisfest's band and tourists (§10.18)
    this.bathers.step(h); // bathers off their loungers (§10.22)
    this.mic.step(h);     // the tourists at the SunTrip stage (§10.30)
    this.carsVsPeople();
  }

  // Kicks and stomps: break props, bowl people over, squash shark fins, dent cars. Stig says sorry
  // once a kick, however many it bowls over or breaks (§10.14).
  areaHit(x, z, y, r, dx, dz, stomp) {
    let broke = null, bowled = false;
    // A fruit stall is the car's only (`carOnly`, §10.19).
    for (const prop of propsNear(x, z, r)) { if (prop.def.carOnly) continue; const b = breakProp(prop, dx * 8, dz * 8, this); if (b && !broke?.def.explode) broke = b; }
    // Pedestrians, the grisfest's band and tourists (§10.18), bathers off their loungers (§10.22) and
    // the tourists at the SunTrip stage (§10.30).
    const people = (this.levelDef.sim.peds ? this.peds.map((ped) => ped.char) : []).concat(this.party.extras, this.bathers.loose, this.mic.extras);
    for (const c of people) {
      if (c.state !== 'normal' || Math.abs(c.y - y) > 1.6 || dist(c.x, c.z, x, z) > r + 0.4) continue;
      c.fling(dx * 7 + (c.x - x) * 2, 5, dz * 7 + (c.z - z) * 2);
      this.shame.add(9);
      audio.ouch();
      this.say(c, this.bark(c, 'ouch'), 1.5);
      bowled = true;
    }
    for (const k in this.npcs) {
      const n = this.npcs[k];
      if (n.state !== 'normal' || dist(n.x, n.z, x, z) > r + 0.6) continue;
      this.say(n, this.bark(n, 'kicked'), 1.4);
      bowled = true;
    }
    for (const [setName, list] of Object.entries(this.collectibles)) {
      if (COLLECTIBLES[setName].pickup !== 'squash') continue;
      for (const c of list) {
        if (!c.alive) continue;
        const mp = c.mesh.position;
        if (Math.hypot(mp.x - x, mp.z - z) < r + 1.4 && Math.abs(mp.y - (y + 0.5)) < 2.2) this.collect(setName, c);
      }
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
    this.sorry.offence(broke?.def.explode ? 'boom' : bowled ? 'kick' : broke ? 'prop' : null);
  }

  carsVsPeople() {
    const hit = {};
    const chars = this.allChars();
    for (const ch of chars) {
      // A body lying on a sun lounger (§10.22) is the lounger's: the car meets that.
      if (ch.state === 'seated' || ch.state === 'hidden' || ch.state === 'lying' || ch.solid === false) continue;
      for (const car of this.cars) {
        if (Math.abs(car.x - ch.x) > car.radius + 1 || Math.abs(car.z - ch.z) > car.radius + 1) continue;
        if (ch.y > car.y + car.height - 0.3) continue;
        if (!circleVsObb(ch.x, ch.z, ch.r, car.obb, hit)) continue;
        // Only the car's own speed into the person knocks him over (n points from the car to him).
        // Bigmouth's relative speed flung anyone who walked (5.4 m/s) or sprinted (8.8) into a parked
        // car, or sprinted (5.2) into the stopped trolley, as if run over; he is pushed out instead.
        const closing = car.vx * hit.nx + car.vz * hit.nz;
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

  // An NPC held in a pose of its own: §9.4 idleAnim (e.g. Berra asleep), or held by the free-roam
  // Berra job (§10.6), the diving judges at the pool's edge (§10.8), Herr Storch's filming (§10.11),
  // the rollerskier's laps (§10.12), the pool fest's dancers and porter (§10.13), Majsan on her round
  // with the ticket pad or Angerud in the tow scene (§10.17), the grisfest's evening (§10.18), the
  // souvenir seller swearing at a smashed fruit stall (§10.19), the crowd at the SunTrip stage
  // (§10.30), Herr Storch filming the stork (§10.31), someone in a gag's scene (§10.32) or Siv or
  // Majsan on the sand by Stig's towel (§10.33). syncAll gives such an NPC no wave, turn or chatter, and
  // the gang's talk leaves them be (§10.28).
  npcPosed(k) {
    return !!this.missions.idlePose(k) || this.berraJob.posed(k) || this.judges.posed(k) || this.film.posed(k) || this.eslov.posed(k) || this.fest.posed(k) || this.lapp.posed(k) || this.party.posed(k)
      || this.stands.posed(k) || !!this.mic?.posed(k) || this.birds.posed(k) || !!this.gags?.posed(k) || !!this.dream?.posed(k);
  }

  syncAll(dt, title) {
    const cx = camera.position.x, cz = camera.position.z;
    const def = this.levelDef;
    for (const c of this.cars) {
      if (c.traffic && !def.sim.traffic) { c.root.visible = false; continue; }
      const d2 = (c.x - cx) ** 2 + (c.z - cz) ** 2;
      c.root.visible = d2 < 320 * 320;
      if (c.root.visible) c.sync(dt);
      // Car-seated characters report where they really are (framing, bubbles, distances).
      for (const ch of [c.driver, ...c.passengers]) {
        if (!ch || ch.car !== c) continue;
        const w = c.seatWorld(ch.seatSide || 1);
        ch.x = w.x; ch.y = w.y; ch.z = w.z; ch.yaw = c.yaw;
      }
    }
    for (const ped of this.peds) {
      const c = ped.char;
      if (!def.sim.peds) { c.root.visible = false; continue; }
      const d2 = (c.x - cx) ** 2 + (c.z - cz) ** 2;
      c.root.visible = d2 < 190 * 190;
      if (c.root.visible) c.sync(dt);
    }
    const talker = this.talker;
    const chatter = this.level === 'flight' ? CHATTER_FLIGHT : CHATTER;
    const ms = this.missions;
    for (const k in this.npcs) {
      const n = this.npcs[k];
      if (n.state === 'hidden') { n.root.visible = false; continue; }
      const near = dist(n.x, n.z, this.player.x, this.player.z);
      n.anim.talk = talker === k;
      const giver = ms.state === 'idle' && ms.current?.giver === k && ms.current.level === this.level;
      // Posed (npcPosed): no wave, turn or chatter; Robban waves Stig over to the sleeping Berra as a
      // giver does. An answer to the horn waves from further off (§10.9); the rollerskier waves his
      // pole while he skis (§10.12).
      const posed = this.npcPosed(k);
      n.anim.wave = (((giver || this.berraJob.waving(k)) && near < 9 || this.honk.waving(k)) && !posed || this.eslov.waving(k)) && !this.inDialog && n.state === 'normal';
      if (n.state === 'normal' && !posed && near < 10 && !this.inDialog) n.yaw += Math.atan2(Math.sin(yawTo(this.player.x - n.x, this.player.z - n.z) - n.yaw), Math.cos(yawTo(this.player.x - n.x, this.player.z - n.z) - n.yaw)) * Math.min(1, dt * 3);
      // Free play only: not in the gap before an outro (bubbles stacked over its first line).
      const lines = (this.level === 'island' && this.chatterOverrides[k]) || chatter[k];
      // Not while Stig talks with the gang (§10.28).
      if (near < 9 && n.state === 'normal' && !posed && !this.inDialog && ms.state === 'idle' && lines && !this.chat.busy) {
        n.chatT = (n.chatT ?? 2 + Math.random() * 3) - dt;
        if (n.chatT <= 0) {
          n.chatT = 7 + Math.random() * 6;
          // A line tied to a time of day only within its hours (the free-roam clock, §10.10).
          const now = this.level === 'island' ? lines.filter((l) => this.day.lineOk(l)) : lines;
          if (now.length) this.say(n, pick(now), 2.6);
        }
      }
      n.sync(dt);
    }
    if (!title) {
      const p = this.player;
      p.anim.talk = talker === PLAYER_KEY;
      if (this.spinT > 0) { this.spinT -= dt; p.anim.spin = (1 - this.spinT / 0.4) * Math.PI * 2; } else p.anim.spin = 0;
      p.sync(dt);
      if (ms.state === 'idle') this.placeNpcs();
    }
  }

  tickPickups(dt) {
    const f = this.focus();
    const col = this.playerCar ? { x: f.x, y: f.y, z: f.z, r: 2.2 } : { x: f.x, y: f.y, z: f.z, r: 0.7 };
    tickCoins(dt, this.time, col, this);
    for (const [setName, list] of Object.entries(this.collectibles)) {
      const set = COLLECTIBLES[setName];
      for (const c of list) {
        if (!c.alive) continue;
        if (Math.abs(c.x - f.x) > 200 || Math.abs(c.z - f.z) > 200) continue;
        c.tick(this.time, dt);
        const mp = c.mesh.position;
        const d = dist(mp.x, mp.z, f.x, f.z);
        if (set.pickup === 'touch') {
          if (d < (this.playerCar ? 2.6 : 1.4) && Math.abs(mp.y - (f.y + 1)) < 1.8) this.collect(setName, c);
        } else if (set.pickup === 'squash' && this.playerCar && d < 2.8 && mp.y < f.y + this.playerCar.height + 1.2) this.collect(setName, c);
        // 'inspect' (the G17 toasters): game/toasters.js collects one that passes.
      }
    }
  }

  // A collectible picked up (or a fin squashed, a toaster passed): +250 pta, HUD, radio, set bonus,
  // save. A `keep` set's one stays where it stands, marked (the G17 toasters' label); the set's
  // `splash` and `sparkle` colour are its effects.
  collect(setName, c) {
    if (!c.alive) return;
    const set = COLLECTIBLES[setName];
    const mp = c.mesh.position;
    if (set.keep) c.mark(); else c.remove();
    this.collected[setName].add(c.id);
    this.dressRoom107();
    const n = this.collected[setName].size, total = set.items.length;
    this.addCoins(250);
    if (set.jingle === 'pryl') audio.jingle('pryl'); else audio[set.jingle]?.();
    if (set.splash) fx.splash(mp.x, mp.z);
    fx.sparkle(mp.x, mp.y + (set.keep ? 0.3 : 0), mp.z, set.sparkle ?? 0xf07a1e, 20);
    hud.showCollect(`<span class="${set.icon}"></span> ${set.label} <b>${n}/${total}</b>`);
    if (c.item?.line) this.radio('ole', c.item.line);
    if (n === 1 && set.first) setTimeout(() => this.radio(set.first[0], set.first[1]), 1800);
    if (n === total) {
      this.addCoins(set.bonus || 0);
      if (set.complete) setTimeout(() => this.radio(set.complete[0], set.complete[1]), 2400);
      if (set.completeUnlock) this.unlock(set.completeUnlock);
    }
    this.save();
  }

  // ------------------------------------------------------------------------------------------
  // Map

  mapMarkers(all = false) {
    const out = [];
    const ms = this.missions;
    if (ms.state === 'idle' && ms.current && ms.current.level === this.level) {
      const g = this.npcs[ms.current.giver];
      if (g) out.push({ type: 'mission', x: g.x, z: g.z, edge: true });
    }
    const t = ms.target() || this.berraJob.target() || this.eslov.target() || this.pigs.target();
    if (t && !t.follow) out.push({ type: 'objective', x: t.x, z: t.z, edge: true });
    if (t && t.follow) out.push({ type: ms.stage?.car?.isTarget ? 'enemy' : 'friend', x: t.x, z: t.z, edge: true });
    out.push(...ms.markers());
    for (const h of this.shame.pursuers) if (!h.dead) out.push({ type: 'enemy', x: h.x, z: h.z, edge: true });
    out.push(...this.shame.paint.markers());
    out.push(...this.shame.closet.markers());
    out.push(...this.berraJob.markers());
    out.push(...this.eslov.markers());
    out.push(...this.pigs.markers());
    const o = this.shame.officer;
    if (o && o.state !== 'hidden' && this.shame.pursuit) out.push({ type: 'enemy', x: o.x, z: o.z, edge: true });
    if (!all) {
      const f = this.focus();
      for (const [setName, list] of Object.entries(this.collectibles)) {
        const { marker: type, idle } = COLLECTIBLES[setName];
        if (idle && ms.state !== 'idle') continue;   // only while they can be used (the G17 toasters)
        for (const c of list) if (c.alive && dist(c.x, c.z, f.x, f.z) < 45) out.push({ type, x: c.x, z: c.z });
      }
    }
    return out;
  }
  mapLabels() {
    const out = [];
    for (const [name, key, opts] of this.levelDef.labels()) {
      if (opts?.phase && this.cabin.phase !== opts.phase) continue;
      if (opts?.unlock && !this.unlocked.has(opts.unlock)) continue;
      const l = landmarks[key];
      if (!l) { if (!this._labelWarned?.has(key)) { (this._labelWarned ||= new Set()).add(key); console.warn('map label: missing landmark', key); } continue; }
      out.push([name, l.x, l.z]);
    }
    return out;
  }
  mapLegend() {
    const base = `${S.legendClose} · <span class="lg-y">!</span> ${S.legendMission.replace(/^!\s*/, '')}`;
    if (this.level === 'flight') return base;
    const parts = Object.entries(COLLECTIBLES).map(([k, set]) => `<span class="lg-${set.marker}">●</span> ${set.label} <b>${this.collected[k].size}/${set.items.length}</b>`);
    // The gags played (§10.32): no marker on the map, so no dot.
    parts.push(`${this.gags.cfg.label} <b>${this.gags.count}/${this.gags.total}</b>`);
    return [base, ...parts].join(' · ');
  }

  updateMarkers() {
    const ms = this.missions;
    const f = this.focus();
    let target = null;
    // A beam on a spot inside the cabin fades out between 8 and 4 m (horizontal) from the eye: that
    // near, the giver's (Phase 3 r2) and the objective's (r3) laid a yellow wedge over a third of the
    // frame (ombord's seat dash started 3.5 m from its first waypoint's beam).
    const nearFade = (x, z) => (this.cabin.inCabin(x, z) ? clamp((dist(camera.position.x, camera.position.z, x, z) - 4) / 4, 0, 1) : 1);
    // Not over Ole by the bed in the nap (§10.10).
    if (ms.state === 'idle' && ms.current && ms.current.level === this.level && this.npcs[ms.current.giver] && !this.day.napping) {
      const g = this.npcs[ms.current.giver];
      this.bang.show(true);
      const by = g.y + g.height + 0.9;
      this.bang.set(g.x, by, g.z, this.time);
      // A camera right on top of the giver (cabin aisle, z-clamped eye 2.5 m above the seats) would
      // get the "!" across the lens: hide it within 3 m of the camera (5.5 m in the flight level,
      // where the eye 3–5 m from a seated giver showed it as a huge clipped blob in a corner; from
      // the un-bobbed spot, so the ±0.2 m bob cannot flicker it across the line), and once the
      // player is within 3 m of the giver (the steep cabin eye put it over Stig; the talk prompt
      // names the giver then).
      this.bang.root.children[0].visible = !camNear({ x: g.x, y: by, z: g.z }, 0.88, this.level === 'flight' ? 5.5 : 3) && dist(g.x, g.z, f.x, f.z) > 3;
      this.bang.fadeBeam(nearFade(g.x, g.z));
      if (dist(g.x, g.z, f.x, f.z) > 25) target = { x: g.x, z: g.z };
    } else this.bang.show(false);
    // Or the free-roam Berra job's (§10.6), Eslövloppet's (§10.12), the grisbil's pigs' (§10.15).
    const t = ms.target() || this.berraJob.target() || this.eslov.target() || this.pigs.target();
    if (t) {
      target = t;
      const y = t.follow ? groundAt(t.x, t.z, 0.2, 0.6) + 2.5 : groundAt(t.x, t.z, 0.2, 0.6);
      if (t.follow) this.beacon.hide();
      else {
        this.beacon.set(t.x, y, t.z, this.time, t.r || 3.2);
        // Its arrow bobs 4.5 m up, to be seen over cars and hedges. Under the flight level's steep eye
        // (4.3 m or more above the pivot, looking 41–63° down) it was above the frame, or within about
        // 7 m a clipped yellow block over 10–25 % of it at the top edge: hidden there (the ring, the
        // beam, the guide arrow and the minimap star find the spot).
        this.beacon.arrow.visible = this.level !== 'flight' && !camNear(this.beacon.root.position, this.beacon.arrow.position.y + 0.5);
        this.beacon.fadeBeam(nearFade(t.x, t.z));
      }
    } else this.beacon.hide();
    this.route = null;
    if (target && !this.inDialog) {
      const aim = this.levelDef.routeAim ? routeAim(f.x, f.z, target.x, target.z) : { x: target.x, z: target.z, nodes: [] };
      const top = this.playerCar ? f.y + this.playerCar.height + 1.8 : f.y + this.player.height + 1.5;
      this.arrow.set(f.x, top, f.z, yawTo(aim.x - f.x, aim.z - f.z), this.time);
      // A camera pulled in close (cabin aisle, a downed player) would get the arrow across the lens.
      if (camNear(this.arrow.mesh.position, 0)) this.arrow.hide();
      this.route = [...aim.nodes.map((n) => [nodeX(n), nodeZ(n)]), [target.x, target.z]];
    } else this.arrow.hide();
  }

  updateHud() {
    // No mission running: the SOLKRÄM meter (§10.26; first, as its scene holds him), the paint
    // shop's wet-paint card (§7.2), the Berra job's (§10.6), Eslövloppet's (§10.12), the grisbil's
    // pigs' (§10.15) or a G17 toaster's scale (§10.24), if any.
    hud.setObjective(this.missions.objective() || this.solkram.objective() || this.shame.paint.objective() || this.berraJob.objective() || this.eslov.objective()
      || this.pigs.objective() || this.toasters.objective());
    hud.setSpeedo(this.playerCar);
    if (this.missions.state !== 'failed') {
      let prompt = '';
      const p = this.player;
      if (!this.inDialog && !this.playerCar && (p.state === 'normal' || (p.state === 'seated' && p.seatId)) && !(this.shame.panicT > 0)) {
        const it = this.nearestInteractable();
        // Standing in turbulence without holding on, `Håll i dig!` wins over the seat and toilet
        // prompts (Phase 3 r3: the "E Sätt dig" of every free seat he passed in the aisle replaced it
        // through the sprit sweep's shaking); E still uses the nearest interactable.
        const hold = this.level === 'flight' && this.cabin.turbulent && p.state === 'normal' && !this.holding;
        if (it?.type === 'talk' || it?.type === 'chat') prompt = fmt('promptTalk', { name: it.who.def.name });
        else if (hold) prompt = S.promptHold;
        else if (it?.type === 'car') prompt = it.car.locked ? '' : this.jeep.prompt(it.car) || (it.car.driverBust ? S.promptSteal : S.promptGetIn);
        else if (it?.type === 'it') prompt = it.it.prompt || '';
        else if (it?.type === 'stand') prompt = S.promptStand;
      }
      if (this.belt.seated && !this.inDialog) prompt = this.belt.cfg.prompt;
      hud.setPrompt(prompt);
    }
    if (this.frame % 2 === 0) {
      const f = this.focus();
      hud.drawMinimap(f.x, f.z, this.cam.yaw, this.playerCar ? this.playerCar.yaw : this.player.yaw, this.mapMarkers(false), this.route);
    }
    if (this.bigMap && this.frame % 10 === 0) hud.toggleBigMap(true, this);
    hud.tickBubbles();
  }

  updateAudio(dt) {
    const c = this.playerCar;
    if (c && !c.dead) {
      audio.engine(true, c.revs, c.ctrl.throttle);
      audio.skid(c.air ? 0 : c.skidAmt);
      // The grisbil grunts instead (honk.update, §10.9); the borrowed Guardia jeep's H is its siren (§10.34).
      audio.horn(input.down('horn') && !c.spec.pigs && !this.jeep.hasSiren(c));
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
    // FLYGRÄDSLA >= hot: music low-pass 4000 -> 600 Hz and a heartbeat every 0.8 s.
    const sh = this.shame;
    if (sh.mode === 'panic' && sh.v >= (sh.cfg.hot ?? 70)) {
      audio.setMusicLowpass(lerp(4000, 600, clamp((sh.v - 70) / 30, 0, 1)));
      this.heartT = (this.heartT || 0) - dt;
      if (this.heartT <= 0) { this.heartT = 0.8; audio.heartbeat(); }
    } else if (this.lowpassOn !== false) { audio.setMusicLowpass(null); this.heartT = 0; }
    this.lowpassOn = sh.mode === 'panic' && sh.v >= (sh.cfg.hot ?? 70);
    audio.duckMusic(sh.pursuit ? 0.5 : 1);
    // The siren (§7.2, §10.34): a pursuit's (shame.js turns it on and off and sets its loudness by the
    // nearest pursuer), or the borrowed Guardia jeep's while H is held, at full loudness.
    audio.siren((sh.pursuit && !!sh.cfg.siren) || this.jeep.sirenOn);
    if (this.jeep.sirenOn) audio.sirenNear(0);
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
window.__missions = () => MISSIONS;
window.__stats = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, textures: renderer.info.memory.textures, cars: game.cars.length });
setLoading(S.loading[0]);
game.init().catch((e) => {
  console.error(e);
  const el = document.getElementById('loading');
  if (el) el.textContent = S.fatal + e.message;
});

// Title and pause screen buttons.
document.getElementById('play').addEventListener('click', () => game.start());
document.getElementById('resume').addEventListener('click', () => game.pause(false));
document.getElementById('reset').addEventListener('click', () => { if (confirm(S.eraseConfirm)) game.resetSave(); });
document.getElementById('music').addEventListener('click', (e) => { e.target.textContent = game.cycleMusic(); });
document.getElementById('sound').addEventListener('click', (e) => { audio.setMuted(!audio.muted); e.target.textContent = audio.muted ? S.soundBtnOff : S.soundBtnOn; });
