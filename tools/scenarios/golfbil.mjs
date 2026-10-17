// Golfbilen – pip-pip! (free roam, DESIGN §10.40; feature 74): golfbil.
//   golfbil: at index 9 between missions the two golf carts stand on their spots by the clubhouse
//            (named, the toy type, unlocked, no wall left where the boxes stood); E at one: the
//            prompt, Stig at the wheel full size under the roof, the speedo "Golfbilen"; held W on the
//            fairway tops out at 6.0–6.6 m/s (the speedo 21–24 km/h), the motor a hum; H is a pip-pip
//            (again while held), never the two-tone horn, and the island hears it; into a bunker:
//            braked to 1.6 m/s, sand off the rear wheels, "Jag pliktar ett slag."; into the pond: a
//            splash, braked to 0.9 m/s, "Oj… ett vattenhinder."; a wreck steams, comes back on its
//            spot only once Stig is 60 m off. A mission start puts a moved golf cart back on its spot;
//            in the mission no prompt, E gives "Golfbilen är för långsam – ta en riktig bil." and no
//            seat, a debug seat in one is undone at once, and `retryCar` never hands one back. After
//            the mission (Q) E gets in again.
import { check } from '../lib.mjs';

const PI = Math.PI;
const BLOCKED = 'Golfbilen är för långsam – ta en riktig bil.';

// Spies: every line said (game.say), every toast (hud.toast), and the audio calls the golf cart
// makes or must not make (pipHorn, horn on, engine's `electric`, splash).
async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js'), { audio } = await import('/src/audio.js');
    window.__said = []; window.__toasts = []; window.__au = { pip: 0, hornOn: 0, electric: 0, splash: 0 };
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.key || 'x', text]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text); return toast(text, ...a); };
    const pip = audio.pipHorn.bind(audio), horn = audio.horn.bind(audio), engine = audio.engine.bind(audio), splash = audio.splash.bind(audio);
    audio.pipHorn = () => { window.__au.pip++; return pip(); };
    audio.horn = (on) => { if (on) window.__au.hornOn++; return horn(on); };
    audio.engine = (on, r, l, el) => { if (on && el) window.__au.electric++; return engine(on, r, l, el); };
    audio.splash = (k) => { window.__au.splash++; return splash(k); };
    window.__hud = hud;
  });
}
// Block-local (lx, lz) of the golf block (4,0) in world coordinates (from the pond at (−10, −6)).
const W = (T, lx, lz) => T.ev((lx, lz) => { const p = __game.golf.course.pond; return { x: p.x + 10 + lx, z: p.z + 6 + lz }; }, lx, lz);
// The player at the wheel of golf cart `name` at (x, z) facing yaw, standing still, camera behind.
async function seat(T, name, x, z, yaw) {
  await T.ev((name, x, z, yaw) => {
    const g = __game, car = g.named[name];
    if (g.playerCar !== car) { if (g.playerCar) g.exitCar(true); g.player.state = 'normal'; g.enterCar(car); }
    car.place(x, z, yaw);
    car.vx = car.vz = 0;
    g.cam.yaw = yaw; g.cam.snapNext = true;
  }, name, x, z, yaw);
  await T.frames(6);
}
const st = (T) => T.ev(() => {
  const g = __game, G = g.golf, c = g.playerCar;
  return { car: c?.name || null, v: c ? +c.speed.toFixed(2) : null, fwd: c ? +c.forwardSpeed.toFixed(2) : null, surf: G.surf, sand: G.sand, pond: G.pond, pips: G.pips, last: G.last,
    num: document.querySelector('#speedo .sp-num')?.textContent, name: document.querySelector('#speedo .sp-name')?.textContent, prompt: window.__hud._prompt || '',
    ms: g.missions.state, shame: g.shame.v };
});
// Hold W for `ms`, recording the highest forward speed and the speed on each surface.
async function drive(T, ms) {
  await T.ev(() => {
    const g = __game, r = (window.__run = { max: 0, sandMax: 0, pondMax: 0, sandEnd: null, pondEnd: null });
    window.__runFn && g.offFrame(window.__runFn);
    window.__runFn = () => {
      const c = g.playerCar;
      if (!c) return;
      r.max = Math.max(r.max, c.forwardSpeed);
      if (g.golf.surf === 'sand') { if (g.golf.inT > 0.6) r.sandMax = Math.max(r.sandMax, c.speed); r.sandEnd = c.speed; }
      if (g.golf.surf === 'pond') { if (g.golf.inT > 0.6) r.pondMax = Math.max(r.pondMax, c.speed); r.pondEnd = c.speed; }
    };
    g.onFrame(window.__runFn);
  });
  await T.hold(['KeyW'], ms);
  return T.ev(() => { __game.offFrame(window.__runFn); window.__runFn = null; const r = window.__run; return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? v : +v.toFixed(2)])); });
}

export const SCENARIOS = {
  async golfbil(T) {
    await T.fresh('&mission=9');
    await spies(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam on the island');

    // 1. The two golf carts on their spots, real cars now.
    const carts = await T.ev(() => ['golfbil1', 'golfbil2'].map((n) => {
      const g = __game, c = g.named[n];
      return c && { n, type: c.type, toy: !!c.spec.toy, locked: !!c.locked, inCars: g.cars.includes(c), x: +c.x.toFixed(2), z: +c.z.toFixed(2), yaw: +c.yaw.toFixed(2), color: c.color.toString(16), home: !!c.home, last: g.cars.indexOf(c) >= g.cars.length - 25 };
    }));
    T.log('carts', JSON.stringify(carts));
    const o1 = await W(T, -14, 14.4), o2 = await W(T, -14, 11.6);
    check(carts.every((c) => c && c.type === 'golfbil' && c.toy && !c.locked && c.inCars && c.home), 'both golf carts are named, unlocked toy cars');
    check(Math.hypot(carts[0].x - o1.x, carts[0].z - o1.z) < 0.3 && Math.hypot(carts[1].x - o2.x, carts[1].z - o2.z) < 0.3, `on the boxes' old spots (${JSON.stringify([o1, o2])})`);
    check(Math.abs(carts[0].x - 66) < 1 && Math.abs(carts[0].z + 225.6) < 1, 'golfbil1 at about (66, −226)');
    // The first free small car a test or a scan finds is never one (the toys spawn last).
    const first = await T.ev(() => __game.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && !c.spec.pigs && c.spec.len < 5)?.type);
    check(first && first !== 'golfbil', `the first free small car is not a golf cart (${first})`);
    // No wall where the boxes stood: the ground is the course (no solid over the kerb) beside them.
    const wall = await T.ev(async () => { const C = await import('/src/world/collision.js'), g = __game, c = g.named.golfbil1; return C.queryBlocks(c.x - 1.5, c.z - 1, c.x + 1.5, c.z + 1, []).filter((b) => b.kind === 'cart').length; });
    check(wall === 0, `no 'cart' solid left (${wall})`);

    // A still of the two by the clubhouse, from the fairway.
    const look = await W(T, -14, 13), from = await W(T, -3.5, 8.5);
    await T.ev((from, look) => { const g = __game; g.player.teleport(from.x + 30, from.z, 0); g.cam.cutTo({ x: from.x, y: 2.4, z: from.z }, { x: look.x, y: 1.1, z: look.z }); }, from, look);
    await T.frames(20);
    await T.shot('golfbil_parked');
    await T.ev(() => __game.cam.release());

    // 2. E at golfbil1 from its left (north) side: the prompt, Stig at the wheel, the speedo.
    await T.ev(() => { const g = __game, c = g.named.golfbil1; g.player.teleport(c.x, c.z - 1.15, 0); g.cam.yaw = 0; g.cam.snapNext = true; });
    await T.frames(10);
    let r = await st(T);
    const near = await T.ev(() => { const it = __game.nearestInteractable(); return it?.type === 'car' ? it.car.name : it?.type; });
    check(near === 'golfbil1', `the nearest interactable is golfbil1 (${near})`);
    check(/Kliv in/.test(r.prompt), `the prompt "Kliv in" (${r.prompt})`);
    await T.tap('KeyE');
    await T.frames(6);
    r = await st(T);
    check(r.car === 'golfbil1', `in golfbil1 (${r.car})`);
    check(r.name === 'Golfbilen', `the speedo says Golfbilen (${r.name})`);
    const fit = await T.ev(() => { const g = __game, p = g.player, c = g.playerCar, m = p.model, k = p.root.scale.x; return { k: +k.toFixed(3), head: +(p.root.position.y + m.headTop * k).toFixed(3), roof: +c.roofY().toFixed(3), seat: +c.seatY().toFixed(3) }; });
    T.log('seat', JSON.stringify(fit));
    check(fit.k === 1 && fit.head < fit.roof, `Stig full size under the roof (${JSON.stringify(fit)})`);
    // Stills of him in it: from the side and from the front three-quarter.
    await seat(T, 'golfbil1', (await W(T, 4, 2)).x, (await W(T, 4, 2)).z, PI / 2);
    await T.ev(() => { const g = __game, c = g.playerCar; g.cam.cutTo({ x: c.x + 0.2, y: 1.5, z: c.z - 4.2 }, { x: c.x, y: 1.0, z: c.z }); });
    await T.frames(16);
    await T.shot('golfbil_side');
    await T.ev(() => { const g = __game, c = g.playerCar; g.cam.cutTo({ x: c.x + 3.4, y: 1.9, z: c.z - 2.4 }, { x: c.x, y: 0.9, z: c.z }); });
    await T.frames(10);
    await T.shot('golfbil_front');
    await T.ev(() => { const g = __game, c = g.playerCar; g.cam.cutTo({ x: c.x - 3.6, y: 2.2, z: c.z + 2.2 }, { x: c.x, y: 0.9, z: c.z }); });
    await T.frames(10);
    await T.shot('golfbil_rear');
    await T.ev(() => __game.cam.release());

    // 3. Top speed: local x 20, north from z 8 (clear of bunkers and palms) for 4.5 s.
    let p = await W(T, 20, 8);
    await seat(T, 'golfbil1', p.x, p.z, PI);
    let d = await drive(T, 2600);
    await T.shot('golfbil_drive');
    d = { ...d, ...(await drive(T, 1800)) };
    r = await st(T);
    T.log('top speed', JSON.stringify(d), 'speedo', r.num);
    check(d.max >= 6.0 && d.max <= 6.62, `tops out at 6.0–6.6 m/s (${d.max})`);
    check(+r.num >= 21 && +r.num <= 24, `the speedo reads 21–24 km/h (${r.num})`);
    check(await T.ev(() => window.__au.electric > 0), 'the motor is the electric hum');

    // 4. The horn: a pip-pip, again while held; never the two-tone horn; the island hears it.
    await T.ev(() => { window.__au.pip = 0; window.__au.hornOn = 0; });
    await T.tap('KeyH');
    r = await st(T);
    const honk = await T.ev(() => !!__game.honk.last && __game.time - __game.honk.last.t < 1);
    check(r.pips === 1 && (await T.ev(() => window.__au.pip)) === 1, `one tap, one pip-pip (${r.pips})`);
    check(honk, 'the island heard the horn (honk.press)');
    await T.hold(['KeyH'], 1100);
    const au = await T.ev(() => window.__au);
    T.log('horn', JSON.stringify(au));
    check(au.pip >= 3 && au.pip <= 5, `held 1.1 s: pip-pips every 0.45 s (${au.pip})`);
    check(au.hornOn === 0, 'never the two-tone horn');

    // 5. A bunker: from local (6, 4) north into the one at (6, −4).
    p = await W(T, 6, 4);
    await seat(T, 'golfbil1', p.x, p.z, PI);
    await T.ev(() => { window.__said = []; });
    d = await drive(T, 2300);
    r = await st(T);
    T.log('bunker', JSON.stringify(d), JSON.stringify(r.last), r.surf);
    check(r.sand === 1, `into a bunker (${r.sand})`);
    check(d.sandMax > 0 && d.sandMax <= 1.7 && d.max > 4.5, `braked from ${d.max} to 1.6 m/s in the sand (${d.sandMax})`);
    await T.hold(['KeyW'], 400);
    await T.shot('golfbil_bunker');
    let said = await T.ev(() => window.__said.slice());
    check(said.some(([w, t]) => w === 'stig' && t === 'Jag pliktar ett slag.'), `"Jag pliktar ett slag." (${JSON.stringify(said)})`);
    const sprays = await T.ev(() => __game.golf.sprays);
    check(sprays >= 10, `sand flying off the rear wheels (${sprays} sprays)`);
    // Out and in again at once: no second line inside 12 s.
    p = await W(T, 6, 4);
    await seat(T, 'golfbil1', p.x, p.z, PI);
    await T.ev(() => { window.__said = []; });
    await drive(T, 2300);
    said = await T.ev(() => window.__said.slice());
    r = await st(T);
    check(r.sand === 2 && !said.some(([w]) => w === 'stig'), `a second bunker within 12 s: no line (${JSON.stringify(said)})`);

    // 6. The pond: from local (−10, 4) north into it.
    p = await W(T, -10, 4);
    await seat(T, 'golfbil1', p.x, p.z, PI);
    await T.ev(() => { window.__said = []; window.__au.splash = 0; });
    d = await drive(T, 2200);
    r = await st(T);
    T.log('pond', JSON.stringify(d), JSON.stringify(r.last), r.surf);
    check(r.pond === 1 && (await T.ev(() => window.__au.splash)) >= 1, `into the pond with a splash (${r.pond})`);
    check(d.pondMax > 0 && d.pondMax <= 0.95, `braked to 0.9 m/s in the water (${d.pondMax})`);
    await T.hold(['KeyW'], 300);
    await T.shot('golfbil_pond');
    said = await T.ev(() => window.__said.slice());
    check(said.some(([w, t]) => w === 'stig' && t === 'Oj… ett vattenhinder.'), `"Oj… ett vattenhinder." (${JSON.stringify(said)})`);

    // 7. A wreck: steam, no fire, no SKANDAL; back on its spot once Stig is 60 m off.
    await T.ev(() => { const g = __game; g.exitCar(true); });
    await T.frames(4);
    const shame0 = (await st(T)).shame;
    const wreck = await T.ev(() => { const g = __game, c = g.named.golfbil2; window.__wreck = c; c.damage(999, g); return { dead: c.dead, burn: c.burn, steam: c.steamT > 0, id: c.id }; });
    await T.frames(30);
    r = await st(T);
    check(wreck.dead && !wreck.burn && wreck.steam, `a wreck steams, no fire (${JSON.stringify(wreck)})`);
    check(r.shame <= shame0, `no SKANDAL for it (${shame0} → ${r.shame})`);
    check(await T.ev(() => __game.named.golfbil2 === window.__wreck), 'not back while Stig is near');
    await T.ev(() => { const g = __game, b = window.__lm('bungalow'); g.debugWarp(b.x, b.z, 0); });
    await T.frames(10);
    const back = await T.ev(() => { const g = __game, c = g.named.golfbil2; return { fresh: c !== window.__wreck, dead: c.dead, gone: !g.cars.includes(window.__wreck), d: +Math.hypot(c.x - c.home.x, c.z - c.home.z).toFixed(2), last: g.golf.last }; });
    check(back.fresh && !back.dead && back.gone && back.d < 0.3, `a whole golfbil2 back on its spot (${JSON.stringify(back)})`);

    // 8. A mission start puts a moved golf cart back on its spot.
    p = await W(T, 0, 0);
    await seat(T, 'golfbil1', p.x, p.z, 0);
    await T.ev(() => __game.exitCar(true));
    await T.frames(4);
    await T.startMission();
    r = await st(T);
    const home = await T.ev(() => { const c = __game.named.golfbil1; return +Math.hypot(c.x - c.home.x, c.z - c.home.z).toFixed(2); });
    check(home < 0.3 && r.last?.kind === 'home', `golfbil1 back on its spot at the mission start (${home}, ${JSON.stringify(r.last)})`);

    // 9. In the mission: no prompt, E refused with the toast, no seat.
    await T.ev(() => { const g = __game, c = g.named.golfbil1; g.player.teleport(c.x, c.z - 1.15, 0); g.cam.yaw = 0; g.cam.snapNext = true; window.__toasts = []; });
    await T.frames(10);
    r = await st(T);
    const nearM = await T.ev(() => { const it = __game.nearestInteractable(); return it?.type === 'car' ? it.car.name : it?.type; });
    check(r.ms === 'running' && nearM === 'golfbil1' && r.prompt === '', `in the mission no prompt at the golf cart (${r.ms}, ${nearM}, "${r.prompt}")`);
    await T.tap('KeyE');
    await T.frames(4);
    r = await st(T);
    const toasts = await T.ev(() => window.__toasts.slice());
    check(!r.car && toasts.includes(BLOCKED), `E refused with the toast (${r.car}, ${JSON.stringify(toasts)})`);
    await T.shot('golfbil_mission');
    // A debug seat in one is undone at once.
    await T.ev(() => { const g = __game, c = g.named.golfbil1; g.seat(g.player, c, 1); g.playerCar = c; c.ctrl.park = false; });
    await T.frames(4);
    r = await st(T);
    check(!r.car && r.last?.kind === 'out', `put out of it in a mission (${r.car}, ${JSON.stringify(r.last)})`);
    // retryCar without a type never hands a golf cart back.
    const rc = await T.ev(async () => {
      const K = await import('/src/game/missions/kinds/core.js'), g = __game;
      const car = K.retryCar(g, { cars: [] }, { at: 'golf' }, g.named.golfbil1);
      return { type: car.type, mine: g.playerCar === car };
    });
    check(rc.type !== 'golfbil' && rc.mine, `retryCar gives a spare, not the golf cart (${JSON.stringify(rc)})`);
    await T.ev(() => __game.exitCar(true));

    // 10. After the mission (Q gives up) E gets in again.
    await T.ev(() => __game.missions.abort());
    await T.frames(4);
    await T.ev(() => { const g = __game, c = g.named.golfbil1; g.player.state = 'normal'; g.player.teleport(c.x, c.z - 1.15, 0); });
    await T.frames(8);
    await T.tap('KeyE');
    await T.frames(6);
    r = await st(T);
    check(r.ms === 'idle' && r.car === 'golfbil1', `free roam again: in golfbil1 (${r.ms}, ${r.car})`);
  },
};
