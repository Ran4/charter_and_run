// Vi liftar – tummen upp på vischan (free roam, DESIGN §10.47; game/hitch.js).
//   lifta: at index 9, E by the CAMINO SIN ASFALTAR sign: the prompt, the thumb, a grisbil from out of
//     the shot that stops with its tail just past him, the cut across the road, his question and the
//     farmer's answer, the hop up into the bed, standing on the truck's tilt, the chase camera on the
//     truck, the card and the ÅKSJUKA bar, the keys, the pig's grunt and "Det luktar lite… lantligt.";
//     R does nothing in the bed; leaning against the pull (the probe's lean) all the way to the back of
//     Hotel Flamenco: he steps down on flamencoBack, "Jättefint! Tack.", the farmer's "¡Adiós,
//     señor!", the truck drives off and is taken away out of sight; no SKANDAL, no pay. Shots
//     `lifta_prompt`, `lifta_tumme`, `lifta_kommer`, `lifta_fraga`, `lifta_hopp`, `lifta_flaket`,
//     `lifta_kurva`, `lifta_framme`, `lifta_adios`.
//   liftaFall: at the packing shed: no lean, ÅKSJUKA past half ("Jag har lite anlag för åksjuka."),
//     full in the second turn: he tumbles off, the truck drives on with the farmer's adiós, he gets up;
//     walking off the spot lets the truck drive past (`cancel`); E right after the ride starts steps
//     him down (slow), E at speed is a jump (a tumble); a hold on A all the way costs (he falls on a
//     straight); a debug warp takes him off; a traffic car into the truck shakes him (the jolt) and
//     leaves it whole; a mission start mid-ride: off the truck on his feet, the truck gone, no card;
//     in the mission no prompt at the spot, and after it the prompt again; no SKANDAL from any of it.
//     Shots `lifta_packhus_tumme`, `lifta_packhus`, `lifta_lutar`, `lifta_ramlar`, `lifta_liggande`.
import { check } from '../lib.mjs';

async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js'), { input } = await import('/src/input.js');
    window.__said = []; window.__toasts = [];
    const say = g.say.bind(g);
    g.say = (t, text, secs) => {
      const who = t === g.player ? 'stig' : t?.key || (t && t === g.hitch.car?.hitchAnchor ? 'bonde' : t && g.cars.some((c) => c.hitchAnchor === t) ? 'bonde' : t && g.cars.some((c) => c.pigAnchor === t) ? 'gris' : 'x');
      window.__said.push([who, text, +g.time.toFixed(2)]);
      return say(t, text, secs);
    };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text.replace(/<[^>]+>/g, '')); return toast(text, ...a); };
    window.__hud = hud;
    // Every SKANDAL add, with what was going on (the hitch's phase, and the caller).
    window.__shame = [];
    const add = g.shame.add.bind(g.shame);
    g.shame.add = (n, ...a) => { if (n > 0) window.__shame.push([+n.toFixed(2), g.hitch.sc?.phase || null, (new Error().stack.split('\n')[2] || '').trim().slice(0, 90)]); return add(n, ...a); };
    // The lean the test plays (`window.__lean`): 'none', 'ideal' (cancels the pull), 'A' (held), or
    // a number; the real keys when null.
    const steer0 = input.steer.bind(input);
    window.__lean = null;
    input.steer = () => {
      const pol = window.__lean, sc = g.hitch.sc;
      if (pol == null) return steer0();
      if (!sc || sc.phase !== 'ride' || pol === 'none') return 0;
      if (pol === 'ideal') return Math.max(-1, Math.min(1, -sc.push / g.hitch.cfg.lean.aRef));
      if (pol === 'A') return -1;
      return pol;
    };
  });
}
const clearSpies = (T) => T.ev(() => { window.__said = []; window.__toasts = []; });
const said = (T) => T.ev(() => window.__said.slice());
const st = (T) => T.ev(() => {
  const g = __game, H = g.hitch, sc = H.sc, p = g.player, car = sc?.car || null, it = g.nearestInteractable();
  const card = document.getElementById('objective');
  return {
    phase: sc?.phase || null, meter: sc ? +sc.meter.toFixed(1) : null, last: H.last, rides: H.rides, falls: H.falls, away: H.away.length,
    near: it?.type === 'it' ? it.it.id : it?.type || null, prompt: window.__hud._prompt || '',
    card: card.classList.contains('show') ? card.querySelector('.obj-title')?.textContent + ' | ' + card.querySelector('.obj-text')?.textContent : null,
    bar: card.classList.contains('show') && card.querySelector('.obj-bar')?.style.display !== 'none' ? card.querySelector('.obj-bar-label')?.textContent : null,
    inDialog: g.inDialog, cine: !!g.cam.cine, ms: g.missions.state, shame: +g.shame.v.toFixed(1), coins: g.coins,
    p: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), state: p.state, onTilt: !!car && p.root.parent === car.tilt, inScene: p.root.parent === g.scene,
      thumb: !!p.anim.thumb, ride: !!p.anim.ride, lean: +(p.anim.rideLean || 0).toFixed(3) },
    car: car && { x: +car.x.toFixed(2), z: +car.z.toFixed(2), yaw: +car.yaw.toFixed(3), v: +car.speed.toFixed(2), hp: car.hp, full: car.hp === car.spec.hp, dead: car.dead, in: g.cars.includes(car),
      locked: car.locked, noEnter: car.noEnter, ai: !!car.ai, pigs: car.pigs.filter((q) => q.in).length, type: car.type },
    hitchCars: g.cars.filter((c) => c.hitch).length,
  };
});
async function atSpot(T, id) {
  await T.ev((id) => {
    const g = __game, l = window.__lm(id === 'vischan' ? 'liftaVischan' : 'liftaPackhus');
    if (g.playerCar) g.exitCar(true);
    g.debugWarp(l.x, l.z + 0.5, l.yaw + Math.PI);
    g.cam.yaw = l.yaw; g.cam.snapNext = true;
  }, id);
  await T.frames(10);
}
const inView = (T) => T.ev(async () => {
  const { camera } = await import('/src/gfx.js'), car = __game.hitch.car;
  camera.updateMatrixWorld();
  return !!car && __game.hitch.inView(car);
});
async function hitch(T, id) {
  await atSpot(T, id);
  await T.tap('KeyE');
  await T.frames(3);
}
const waitPhase = (T, ph, ms = 60000) => T.until((ph) => (__game.hitch.sc?.phase || null) === ph, ms, ph);

export const SCENARIOS = {
  async lifta(T) {
    await T.fresh('&mission=9');
    await spies(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam on the island');
    const coins0 = await T.ev(() => __game.coins);

    await atSpot(T, 'vischan');
    let r = await st(T);
    check(r.near === 'lifta-vischan' && /Lifta/.test(r.prompt), `the prompt "E Lifta" by the sign (${r.near}, "${r.prompt}")`);
    await T.shot('lifta_prompt');

    await T.tap('KeyE');
    await T.frames(3);
    r = await st(T);
    T.log('waiting', JSON.stringify(r));
    const l = await T.L('liftaVischan');
    check(r.phase === 'wait' && Math.hypot(r.p.x - l.x, r.p.z - l.z) < 0.05 && Math.abs(r.p.yaw - l.yaw) < 0.01 && r.p.thumb, `Stig on the spot facing the road, thumb out (${JSON.stringify(r.p)})`);
    check(r.card === 'LIFTA | Tummen upp – vänta på en bil.' && !r.bar, `the card (${r.card})`);
    check(r.car && r.car.type === 'grisbil' && r.car.locked && r.car.noEnter && r.car.ai && r.car.pigs === 3 && r.hitchCars === 1, `a grisbil, locked, three pigs in the bed (${JSON.stringify(r.car)})`);
    const bust = await T.ev(() => { const c = __game.hitch.car; return !!c.driverBust; });
    check(bust, 'the farmer at the wheel');
    check(!(await inView(T)) && Math.hypot(r.car.x - l.x, r.car.z - l.z) > 70, `it sets off out of the shot, up the road (${r.car.x}, ${r.car.z})`);
    await T.shot('lifta_tumme');
    await T.until(() => { const c = __game.hitch.car; return c && Math.abs(c.x - window.__lm('liftaVischan').x) < 22; }, 30000);
    await T.shot('lifta_kommer');

    await waitPhase(T, 'stop', 40000);
    await T.frames(2);
    r = await st(T);
    T.log('stopped', JSON.stringify(r));
    // The tail 0.6 m past him (along the lane, west), on the lane next to him.
    const tail = await T.ev(() => { const c = __game.hitch.car, l = window.__lm('liftaVischan'); return +((l.x - c.x) - c.spec.len / 2).toFixed(2); });
    check(r.car.v < 0.3 && Math.abs(tail - 0.6) < 1.0 && Math.abs(r.car.z - (l.z + 4.05)) < 0.6, `the truck stops with its tail just past him (${tail} m, z ${r.car.z})`);
    check(r.inDialog && r.cine && !r.p.thumb, 'the cut across the road, Stig held');
    await T.until(() => window.__said.some(([w, t]) => w === 'bonde' && /Hoppa upp bak/.test(t)), 10000);
    await T.frames(10);
    let s = await said(T);
    check(s.some(([w, t]) => w === 'stig' && t === 'Ursäkta… skulle jag möjligen kunna få åka med en bit?'), `Stig asks (${JSON.stringify(s)})`);
    check(s.some(([w, t]) => w === 'bonde' && t === 'Till stan, señor? Hoppa upp bak!'), 'the farmer answers');
    await T.shot('lifta_fraga');

    await waitPhase(T, 'climb', 10000);
    await T.frames(12);
    r = await st(T);
    check(r.p.state === 'seated' && r.p.ride && r.p.y > 0.5, `mid-hop, up off the kerb (${JSON.stringify(r.p)})`);
    await T.shot('lifta_hopp');
    await waitPhase(T, 'ride', 10000);
    await T.ev(() => { window.__lean = 'ideal'; });
    await T.frames(30);
    r = await st(T);
    T.log('riding', JSON.stringify(r));
    const bed = await T.ev(() => { const H = __game.hitch, w = H.bedWorld(H.car, {}), p = __game.player; return +Math.hypot(w.x - p.x, w.z - p.z).toFixed(3); });
    check(r.p.onTilt && r.p.state === 'seated' && r.p.ride && bed < 0.01, `standing in the bed on the truck (${JSON.stringify(r.p)}, ${bed})`);
    check(!r.inDialog && !r.cine && r.car.ai, 'the chase camera, the truck driving');
    check(r.card === 'LIFTA TILL STAN | Håll dig kvar på flaket!' && r.bar === 'ÅKSJUKA', `the card and the ÅKSJUKA bar (${r.card}, ${r.bar})`);
    check(/Luta dig/.test(r.prompt) && /Hoppa av/.test(r.prompt), `the keys (${r.prompt})`);
    s = await said(T);
    check(s.some(([w, t]) => w === 'gris' && t === 'NÖFF!'), 'a pig grunts');
    const camOnTruck = await T.ev(async () => { const { camera } = await import('/src/gfx.js'), c = __game.hitch.car; return +Math.hypot(camera.position.x - c.x, camera.position.z - c.z).toFixed(1); });
    check(camOnTruck > 6 && camOnTruck < 14, `the camera behind the truck (${camOnTruck} m)`);
    await T.shot('lifta_flaket');

    // R does nothing in the bed.
    const before = await st(T);
    await T.tap('KeyR');
    await T.frames(4);
    r = await st(T);
    check(r.phase === 'ride' && r.p.onTilt, 'R does nothing on the truck');
    const toasts = await T.ev(() => window.__toasts.slice());
    check(!toasts.some((t) => /väg|vägen|Tillbaka/i.test(t)) || before.phase === 'ride', 'no reset toast');

    await T.until(() => window.__said.some(([w, t]) => w === 'stig' && t === 'Det luktar lite… lantligt.'), 10000);
    // The first turn, at the west edge: a moment unbalanced for the tip, then the lean again.
    await T.until(() => Math.abs(__game.hitch.sc?.push || 0) > 3, 20000);
    await T.ev(() => { window.__lean = 'none'; });
    await T.frames(30);
    r = await st(T);
    check(Math.abs(r.p.lean) > 0.15, `unbalanced in the turn he tips (${r.p.lean} rad)`);
    await T.shot('lifta_kurva');
    await T.ev(() => { window.__lean = 'ideal'; });

    await waitPhase(T, 'off', 60000);
    await T.until(() => !__game.hitch.sc, 5000);
    await T.frames(3);
    r = await st(T);
    T.log('arrived', JSON.stringify(r));
    const drop = await T.L('flamencoBack');
    check(r.last.kind === 'off' && r.rides === 1 && r.falls === 0, `all the way (${JSON.stringify(r.last)})`);
    check(Math.hypot(r.p.x - drop.x, r.p.z - drop.z) < 0.3 && r.p.state === 'normal' && r.p.inScene && !r.p.ride && !r.inDialog, `on his feet at the back of Hotel Flamenco (${JSON.stringify(r.p)})`);
    check(r.last.peak < 60, `leaning, ÅKSJUKA kept low (peak ${r.last.peak})`);
    s = await said(T);
    check(s.some(([w, t]) => w === 'stig' && t === 'Jättefint! Tack.'), 'his thanks');
    await T.shot('lifta_framme');
    await T.until(() => window.__said.some(([w, t]) => w === 'bonde' && t === '¡Adiós, señor!'), 6000);
    await T.frames(6);
    await T.shot('lifta_adios');
    r = await st(T);
    check(r.shame === 0 && r.coins === coins0, `no SKANDAL, no pay (${r.shame}, ${r.coins})`);
    check(r.away === 1 && r.hitchCars === 1, 'the truck waits a moment');
    await T.until(() => __game.cars.some((c) => c.hitch && c.speed > 3), 8000);
    T.log('the truck drives off');
    // Taken away once out of sight: turn the camera away and walk off.
    await T.ev(() => { const g = __game; g.cam.yaw += Math.PI; g.cam.snapNext = true; });
    await T.until(() => !__game.cars.some((c) => c.hitch) && !__game.hitch.away.length, 40000);
    r = await st(T);
    check(r.hitchCars === 0 && !r.phase, 'the truck gone out of sight');
    await atSpot(T, 'vischan');
    r = await st(T);
    check(r.near === 'lifta-vischan', 'the prompt again');
  },

  async liftaFall(T) {
    await T.fresh('&mission=9');
    await spies(T);
    await T.ev(() => { window.__lean = 'none'; });

    // No lean: half way the line, then off in a turn.
    await hitch(T, 'packhus');
    let r = await st(T);
    check(r.phase === 'wait' && r.near !== 'lifta-packhus', `waiting at the packing shed (${r.phase}, ${r.near})`);
    await T.frames(20);
    await T.shot('lifta_packhus_tumme');
    await waitPhase(T, 'stop', 40000);
    await T.frames(30);
    await T.shot('lifta_packhus');
    await waitPhase(T, 'ride', 15000);
    await T.until(() => (__game.hitch.sc?.meter || 0) > 40 && Math.abs(__game.hitch.sc?.push || 0) > 3, 30000);
    await T.shot('lifta_lutar');
    await T.until(() => !__game.hitch.sc, 40000);
    await T.frames(8);
    r = await st(T);
    T.log('fell', JSON.stringify(r));
    let s = await said(T);
    check(r.last.kind === 'fall' && r.falls === 1 && r.rides === 0, `he falls off (${JSON.stringify(r.last)})`);
    check(s.some(([w, t]) => w === 'stig' && t === 'Jag har lite anlag för åksjuka.'), 'past half his line');
    check(['flung', 'down'].includes(r.p.state) && r.p.inScene && !r.p.ride, `tumbling (${r.p.state})`);
    check(!r.card || !/LIFTA/.test(r.card), `no card (${r.card})`);
    await T.shot('lifta_ramlar');
    await T.until(() => __game.player.state === 'down', 5000);
    await T.frames(10);
    await T.shot('lifta_liggande');
    await T.until(() => __game.player.state === 'normal', 8000);
    await T.until(() => window.__said.some(([w, t]) => w === 'bonde' && t === '¡Adiós, señor!'), 4000);
    r = await st(T);
    check(r.away === 1 && r.shame === 0, `the truck drives on, no SKANDAL (${r.away}, ${r.shame})`);
    const moving = await T.ev(() => __game.hitch.away[0]?.car.speed > 3);
    check(moving, 'the truck drives on');

    // Walking off the spot: the truck drives past.
    await hitch(T, 'packhus');
    await T.hold(['KeyW'], 700);
    await T.frames(3);
    r = await st(T);
    check(!r.phase && r.last.kind === 'cancel' && r.last.why === 'walk' && !r.p.thumb, `walked off: no hitch (${JSON.stringify(r.last)})`);
    // Up the road out of sight it is taken away at once; in sight it drives on by, never stopping.
    const goes = await T.ev(() => { const g = __game, c = g.cars.find((k) => k.hitch); return !c || (!!c.ai && c.ai.path.wander); });
    check(goes, 'the truck goes on by (or, out of sight, away)');
    await T.ev(() => { const H = __game.hitch; H.reset('test'); });

    // E right as the ride starts (slow): a step down, his thanks.
    await clearSpies(T);
    await hitch(T, 'vischan');
    await waitPhase(T, 'ride', 40000);
    await T.tap('KeyE');
    await T.until(() => !__game.hitch.sc, 5000);
    await T.frames(3);
    r = await st(T);
    s = await said(T);
    check(r.last.kind === 'step' && r.p.state === 'normal' && r.p.inScene && s.some(([w, t]) => w === 'stig' && t === 'Jättefint! Tack.'), `E slow: steps down (${JSON.stringify(r.last)}, ${r.p.state})`);
    await T.ev(() => __game.hitch.reset('test'));

    // E at speed: a jump, a tumble.
    await hitch(T, 'vischan');
    await waitPhase(T, 'ride', 40000);
    await T.until(() => (__game.hitch.car?.speed || 0) > 6, 10000);
    await T.tap('KeyE');
    await T.frames(3);
    r = await st(T);
    check(r.last.kind === 'jump' && r.p.state === 'flung', `E at speed: a jump off (${JSON.stringify(r.last)}, ${r.p.state})`);
    await T.until(() => __game.player.state === 'normal', 8000);
    await T.ev(() => __game.hitch.reset('test'));

    // A held A all the way: his own lean on the straight costs, he falls before the first turn is over.
    await hitch(T, 'packhus');
    await waitPhase(T, 'ride', 40000);
    await T.ev(() => { window.__lean = 'A'; });
    await T.until(() => !__game.hitch.sc, 30000);
    r = await st(T);
    check(r.last.kind === 'fall' && r.last.ride < 22, `a lean held all the way: he falls (${JSON.stringify(r.last)})`);
    await T.ev(() => { window.__lean = 'ideal'; });
    await T.until(() => __game.player.state === 'normal', 8000);
    await T.ev(() => __game.hitch.reset('test'));

    // A debug warp takes him off and the truck away.
    await hitch(T, 'vischan');
    await waitPhase(T, 'ride', 40000);
    await T.frames(20);
    const wl = await T.L('flamencoDeck');
    await T.warp(wl.x, wl.z, 0);
    await T.frames(3);
    r = await st(T);
    check(!r.phase && r.last.kind === 'warp' && r.p.state === 'normal' && r.p.inScene && r.hitchCars === 0 && Math.hypot(r.p.x - wl.x, r.p.z - wl.z) < 0.5, `a warp: off the truck, it gone (${JSON.stringify(r)})`);

    // A traffic car into the truck: the jolt, the truck whole.
    await hitch(T, 'vischan');
    await waitPhase(T, 'ride', 40000);
    await T.until(() => (__game.hitch.car?.speed || 0) > 8, 10000);
    const hit = await T.ev(() => {
      const g = __game, H = g.hitch, c = H.car, m0 = H.sc.meter;
      // A traffic hatch from its right side at 14 m/s into its middle.
      const t = g.spawnTrafficCar(Math.random, null), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx;
      t.place(c.x + rx * 3.2 + fx * 0.5, c.z + rz * 3.2 + fz * 0.5, Math.atan2(-rx, -rz));
      t.vx = -rx * 14 + c.vx; t.vz = -rz * 14 + c.vz;
      window.__m0 = m0;
      return { m0: +m0.toFixed(1) };
    });
    await T.frames(6);
    r = await st(T);
    T.log('knock', JSON.stringify(hit), r.meter, JSON.stringify(r.car), r.phase);
    check((r.phase === 'ride' ? r.meter : 100) > hit.m0 + 10 && r.car && r.car.full && !r.car.dead, `the knock shakes him, the truck whole (${hit.m0} -> ${r.meter}, hp ${r.car?.hp})`);
    await T.ev(() => __game.hitch.reset('test'));

    const adds = await T.ev(() => window.__shame.slice());
    T.log('SKANDAL adds', JSON.stringify(adds));
    check(!adds.some(([, ph]) => ph), `no SKANDAL while hitching (${JSON.stringify(adds)})`);

    // A mission start mid-ride: off the truck on his feet, the truck gone.
    await T.ev(() => { window.__lean = 'ideal'; });
    await hitch(T, 'packhus');
    await waitPhase(T, 'ride', 40000);
    await T.frames(30);
    await T.ev(() => { __game.missions.begin(); });
    await T.frames(6);
    r = await st(T);
    T.log('mission mid-ride', JSON.stringify(r));
    check(r.ms !== 'idle' && !r.phase && r.last.kind === 'gone' && r.p.state === 'normal' && r.p.inScene && !r.p.ride && r.hitchCars === 0 && (!r.card || !/LIFTA/.test(r.card)),
      `a mission start: off the truck, it gone (${JSON.stringify(r)})`);
    await T.until(() => __game.missions.state === 'running', 60000);
    await atSpot(T, 'packhus');
    r = await st(T);
    check(r.near !== 'lifta-packhus' && !/Lifta/.test(r.prompt), `in the mission no prompt (${r.near}, "${r.prompt}")`);
    await T.ev(() => __game.hitch.start(__game.hitch.cfg.spots[1]));
    r = await st(T);
    check(!r.phase && r.hitchCars === 0, 'and no hitch by hand');
    await T.ev(() => __game.missions.abort());
    await T.frames(4);
    await atSpot(T, 'packhus');
    r = await st(T);
    check(r.ms === 'idle' && r.near === 'lifta-packhus', `after the mission the prompt again (${r.ms}, ${r.near})`);
  },
};
