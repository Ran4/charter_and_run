// Guaguan – åk buss och snacka fotboll (free roam, DESIGN §10.53; game/guagua.js).
//   guagua: at index 9, by the Plaza's PARADA GUAGUA: the prompt "E Vänta på guaguan"; E: Stig at the
//     kerb looking up the road, the cut to the sidewalk behind him, the card and "Q Sluta vänta"; a green
//     guagua set off out of the camera's view behind its stop, locked, `noEnter`, the driver's bust at the
//     wheel, two riders and Ole's bust at his window; it stops with its door by the bench on the near
//     lane, the chase camera back behind Stig, the driver's "¡Buenas! Ska señor med?", the prompt "E Kliv
//     på guaguan" (a traffic guagua's is "E Ta bilen"); E: in through the door to the passenger seat, 10
//     pta and "Diez pesetas, señor.", the chase camera on the bus, the card "Nästa hållplats: Casa Lola"
//     and the keys; R does nothing; the film's football talk (Ole's "Las Palmas! …", Stig's "Hammarby är
//     också ett bra lag.", the driver's "Bajen… Hammarby… Bajen…"); S and W choose the stop; the fade,
//     Stig on his feet at Casa Lola facing the bus's way, the bus at its stop, "¡Hasta luego, señor!",
//     "Tack så mycket!", the bus off and taken away out of sight; `records.guagua` 1; a second ride from
//     there with the driver's own lines and no Ole, E off early at the stop chosen; no SKANDAL, no coin
//     on the way. Shots `guagua_prompt`, `guagua_vantar`, `guagua_kommer`, `guagua_dorren`,
//     `guagua_ombord`, `guagua_lasPalmas`, `guagua_hammarby`, `guagua_bajen`, `guagua_framme`,
//     `guagua_akerivag`, `guagua_andra`.
//   guaguaKant: the film's ride from Casa Lola, whose route passes Hotel Flamenco: no Ole at the window and
//     the driver's own Las Palmas line; Q while waiting: the camera back, the bus driving on by and away;
//     walking off from the door: "¡Vámonos!" and the bus goes; a car on the stop: "Det står en bil på
//     hållplatsen.", no bus; no prompt at the wheel of a car or in a pursuit; a debug warp mid-ride: off
//     the bus on his feet, the bus gone; a mission start mid-ride: off the bus, no card, in the mission no
//     prompt and `start()` refuses, after it the prompt again.
//   guaguaLinje: every one of the 13 stops: the bus out of view when it sets off, stopped with its door
//     within 1 m of the bench, a ride of the default length moving it on (no corner jam), the arrival at
//     the next stop in the loop. Shots `guagua_linje_<key>_vantar`, `_dorren`, `_ombord`.
import { check } from '../lib.mjs';

const G_BACK = [0, 8, 16];   // GUAGUA.backOff

async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js');
    window.__said = []; window.__toasts = [];
    const say = g.say.bind(g);
    g.say = (t, text, secs) => {
      const who = t === g.player ? 'stig' : t?.key || (g.cars.some((c) => c.guaguaAnchor === t) ? 'chofer' : g.cars.some((c) => c.oleAnchor === t) ? 'ole' : 'x');
      window.__said.push([who, text, +g.time.toFixed(2)]);
      return say(t, text, secs);
    };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text.replace(/<[^>]+>/g, '')); return toast(text, ...a); };
    window.__hud = hud;
    window.__shame = [];
    const add = g.shame.add.bind(g.shame);
    g.shame.add = (n, ...a) => { if (n > 0) window.__shame.push([+n.toFixed(2), g.guagua.sc?.phase || null]); return add(n, ...a); };
  });
}
const said = (T) => T.ev(() => window.__said.slice());
const st = (T) => T.ev(() => {
  const g = __game, G = g.guagua, sc = G.sc, p = g.player, car = sc?.car || null, it = g.nearestInteractable();
  const card = document.getElementById('objective');
  return {
    phase: sc?.phase || null, last: G.last, rides: G.rides, away: G.away.length, rec: g.records.guagua || 0, dest: sc?.dest?.key || null,
    near: it?.type === 'it' ? it.it.id : it?.type || null, prompt: window.__hud._prompt || '',
    card: card.classList.contains('show') ? card.querySelector('.obj-title')?.textContent + ' | ' + card.querySelector('.obj-text')?.textContent : null,
    inDialog: g.inDialog, cine: !!g.cam.cine, ms: g.missions.state, shame: +g.shame.v.toFixed(1), coins: g.coins,
    p: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), state: p.state, inBus: !!car && p.car === car, inScene: p.root.parent === g.scene, side: p.seatSide },
    car: car && { x: +car.x.toFixed(2), z: +car.z.toFixed(2), yaw: +car.yaw.toFixed(3), v: +car.speed.toFixed(2), hp: car.hp, locked: car.locked, noEnter: car.noEnter, ai: !!car.ai, type: car.type,
      bust: !!car.driverBust, riders: car.riders.length, ole: car.riders.some((r) => r.userData.riderKey === 'ole') },
    buses: g.cars.filter((c) => c.guagua).length, playerCar: !!g.playerCar,
  };
});
const stopOf = (T, key) => T.ev((k) => { const s = __game.guagua.stops.find((q) => q.key === k); return s && { key: s.key, x: s.x, z: s.z, yaw: s.yaw, yb: s.yb, d: s.d, f: s.f, lane: s.lane, name: s.name }; }, key);
// Stig on foot at the stop's waiting place, facing the road, the camera behind him.
async function atStop(T, key) {
  await T.ev((k) => {
    const g = __game, G = g.guagua, s = G.stops.find((q) => q.key === k), w = G.at(s, G.cfg.wait[0], G.cfg.wait[1]);
    if (g.playerCar) g.exitCar(true);
    g.debugWarp(w.x, w.z, Math.atan2(s.f.x, s.f.z));
    g.cam.yaw = s.yb; g.cam.snapNext = true;
  }, key);
  await T.frames(10);
}
const inView = (T) => T.ev(() => { const c = __game.guagua.car; return !!c && __game.guagua.inView(c); });
const waitPhase = (T, ph, ms = 60000) => T.until((ph) => (__game.guagua.sc?.phase || null) === ph, ms, ph);
// The bus's door against the bench: along (the bus's way) and out (towards the road), m.
const doorOff = (T) => T.ev(() => {
  const G = __game.guagua, sc = G.sc, s = sc.stop, car = sc.car, q = G.busSpot(s);
  const dx = car.x - q.x, dz = car.z - q.z;
  return { along: +(dx * s.d.x + dz * s.d.z).toFixed(2), out: +(dx * s.f.x + dz * s.f.z).toFixed(2), yaw: +Math.abs(Math.atan2(Math.sin(car.yaw - s.yb), Math.cos(car.yaw - s.yb))).toFixed(3) };
});

export const SCENARIOS = {
  async guagua(T) {
    await T.fresh('&mission=9');
    await spies(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam on the island');
    const n = await T.ev(() => __game.guagua.stops.length);
    check(n === 13, `13 PARADA GUAGUA stops (${n})`);
    await T.ev(() => { __game.coins = 200; });
    const coins0 = 200;

    // A traffic guagua beside him is still a car to take ("Ta bilen").
    const steal = await T.ev(async () => {
      const g = __game, { Car } = await import('/src/actors/car.js'), p = g.player;
      const c = new Car('guagua');
      c.place(-150, 37.25, -Math.PI / 2);   // on the z 40 road's westbound lane
      g.addCar(c);
      g.addBust(g.charDef('pax'), c);
      c.traffic = true;
      const fx = -Math.cos(c.yaw), fz = Math.sin(c.yaw);
      p.teleport(c.x + fx * 2.3, c.z + fz * 2.3, p.yaw);
      await new Promise((res) => setTimeout(res, 300));
      const out = window.__hud._prompt;
      g.removeCar(c);
      return out;
    });
    check(/Ta bilen/.test(steal), `a traffic guagua's prompt is "E Ta bilen" (${steal})`);
    const plaza = await stopOf(T, '2,3,2');
    await atStop(T, '2,3,2');
    let r = await st(T);
    check(r.near === 'guagua-2,3,2' && /Vänta på guaguan/.test(r.prompt), `the prompt "E Vänta på guaguan" at the Plaza's stop (${r.near}, "${r.prompt}")`);
    await T.shot('guagua_prompt');

    await T.tap('KeyE');
    await T.frames(4);
    r = await st(T);
    T.log('waiting', JSON.stringify(r));
    check(r.phase === 'wait' && r.inDialog && r.cine, `waiting, held, the cut (${r.phase}, ${r.inDialog}, ${r.cine})`);
    check(r.card === 'GUAGUAN | Vänta vid hållplatsen.' && /Sluta vänta/.test(r.prompt), `the card and the keys (${r.card}, "${r.prompt}")`);
    check(r.car && r.car.type === 'guagua' && r.car.locked && r.car.noEnter && r.car.ai && r.car.bust && r.car.riders === 3 && r.car.ole && r.buses === 1,
      `a guagua, locked, the driver, two riders and Ole at the window (${JSON.stringify(r.car)})`);
    check(!(await inView(T)), 'it sets off out of the camera\'s view');
    const d0 = Math.hypot(r.car.x - plaza.x, r.car.z - plaza.z);
    check(d0 > 30, `up the road behind its stop (${d0.toFixed(1)} m)`);
    await T.shot('guagua_vantar');
    await T.until(() => { const c = __game.guagua.car; return c && __game.guagua.inView(c); }, 30000);
    await T.frames(8);
    await T.shot('guagua_kommer');

    await waitPhase(T, 'door', 30000);
    await T.frames(3);
    r = await st(T);
    const off = await doorOff(T);
    T.log('stopped', JSON.stringify(r), JSON.stringify(off));
    check(r.car.v < 0.3 && Math.abs(off.along) < 1.0 && Math.abs(off.out) < 0.6 && off.yaw < 0.06, `stopped with its door by the bench, on the near lane (${JSON.stringify(off)})`);
    check(!r.inDialog && !r.cine, 'the camera back behind Stig, free');
    check(r.near === 'guagua-door' && /Kliv på guaguan/.test(r.prompt), `the prompt "E Kliv på guaguan" (${r.near}, "${r.prompt}")`);
    let s = await said(T);
    check(s.some(([w, t]) => w === 'chofer' && t === '¡Buenas! Ska señor med?'), `the driver's hello (${JSON.stringify(s)})`);
    await T.shot('guagua_dorren');

    await T.frames(6);

    await T.tap('KeyE');
    await waitPhase(T, 'ride', 10000);
    await T.frames(6);
    r = await st(T);
    T.log('aboard', JSON.stringify(r));
    check(r.p.inBus && r.p.state === 'seated' && r.p.side === -1 && !r.playerCar, `seated in the bus as its passenger (${JSON.stringify(r.p)})`);
    check(r.coins === coins0 - 10, `the fare, 10 pta (${r.coins})`);
    check(r.card === 'GUAGUAN | Nästa hållplats: Casa Lola' && /Välj hållplats/.test(r.prompt), `the card and the keys (${r.card}, "${r.prompt}")`);
    const camD = await T.ev(async () => { const { camera } = await import('/src/gfx.js'); const c = __game.guagua.car; return Math.hypot(camera.position.x - c.x, camera.position.z - c.z); });
    check(camD > 5 && camD < 22, `the chase camera on the bus (${camD.toFixed(1)} m)`);
    await T.shot('guagua_ombord');
    const pr = await T.ev(() => ({ x: __game.player.x, z: __game.player.z }));
    await T.tap('KeyR');
    await T.frames(4);
    r = await st(T);
    check(r.p.inBus, 'R does nothing in the bus');
    void pr;

    await T.until(() => window.__said.some(([w]) => w === 'ole'), 20000);
    await T.frames(6);
    await T.shot('guagua_lasPalmas');
    await T.until(() => window.__said.some(([w, t]) => w === 'stig' && /Hammarby/.test(t)), 20000);
    await T.frames(6);
    await T.shot('guagua_hammarby');
    await T.until(() => window.__said.some(([w, t]) => w === 'chofer' && /Bajen/.test(t)), 20000);
    await T.frames(6);
    await T.shot('guagua_bajen');
    s = await said(T);
    check(s.some(([w, t]) => w === 'ole' && t === 'Las Palmas! Bra fotballag… Øverste divisjon!'), 'Ole at his window: "Las Palmas! Bra fotballag… Øverste divisjon!"');
    check(s.some(([w, t]) => w === 'stig' && t === 'Hammarby är också ett bra lag.'), 'Stig: "Hammarby är också ett bra lag."');
    check(s.some(([w, t]) => w === 'chofer' && t === 'Bajen… Hammarby… Bajen…'), 'the driver: "Bajen… Hammarby… Bajen…"');
    check(s.some(([w, t]) => w === 'chofer' && t === 'Diez pesetas, señor.'), 'the driver: "Diez pesetas, señor."');

    // S and W choose the stop.
    await T.tap('KeyS');
    r = await st(T);
    check(r.dest === '3,5,2' && /Avenida del Mar/.test(r.card), `S: the next stop on (${r.dest}, ${r.card})`);
    await T.tap('KeyW');
    r = await st(T);
    check(r.dest === '2,4,0' && /Casa Lola/.test(r.card), `W: back (${r.dest}, ${r.card})`);

    await T.until(() => __game.guagua.last?.kind === 'arrive', 30000);
    await T.frames(2);
    r = await st(T);
    T.log('arrived', JSON.stringify(r));
    const lola = await stopOf(T, '2,4,0');
    const w = await T.ev(() => { const G = __game.guagua, s = G.stops.find((q) => q.key === '2,4,0'); return G.at(s, G.cfg.wait[0], G.cfg.wait[1]); });
    check(r.last.dest === '2,4,0' && r.last.why === 'end' && r.last.done && r.last.bus, `arrived at Casa Lola with the bus, the talk heard (${JSON.stringify(r.last)})`);
    check(Math.hypot(r.p.x - w.x, r.p.z - w.z) < 0.3 && r.p.state === 'normal' && r.p.inScene && Math.abs(Math.atan2(Math.sin(r.p.yaw - lola.yb), Math.cos(r.p.yaw - lola.yb))) < 0.05,
      `Stig on his feet at the stop, facing the bus's way (${JSON.stringify(r.p)})`);
    check(r.rec === 1 && r.rides === 1 && !r.phase, `records.guagua 1 (${r.rec})`);
    check(r.last.ride > 11 && r.last.ride < 13.5, `a ride of about 12 s (${r.last.ride})`);
    const bus = await T.ev(() => {
      const c = __game.cars.find((q) => q.guagua), G = __game.guagua, s = G.stops.find((q) => q.key === '2,4,0'), b = G.busSpot(s);
      return c && { along: +((c.x - b.x) * s.d.x + (c.z - b.z) * s.d.z).toFixed(2), out: +((c.x - b.x) * s.f.x + (c.z - b.z) * s.f.z).toFixed(2) };
    });
    check(bus && G_BACK.some((k) => Math.abs(bus.along + k) < 0.3) && Math.abs(bus.out) < 0.3, `the bus at Casa Lola's stop, or just short of a car there (${JSON.stringify(bus)})`);
    await T.until(() => !__game.inDialog, 10000);
    await T.until(() => window.__said.some(([w, t]) => w === 'stig' && t === 'Tack så mycket!'), 10000);
    await T.frames(4);
    await T.shot('guagua_framme');
    s = await said(T);
    check(s.some(([w, t]) => w === 'chofer' && t === '¡Hasta luego, señor!'), 'the driver: "¡Hasta luego, señor!"');
    await T.until(() => { const c = __game.cars.find((q) => q.guagua); return c && c.speed > 3; }, 15000);
    await T.frames(20);
    await T.shot('guagua_akerivag');
    await T.until(() => !__game.cars.some((q) => q.guagua), 60000);
    T.log('the bus taken away out of sight');

    // A second ride: the driver's own lines, no Ole; E off at once at the stop chosen.
    await T.ev(() => { window.__said = []; });
    await atStop(T, '2,4,0');
    await T.tap('KeyE');
    await waitPhase(T, 'door', 30000);
    r = await st(T);
    check(!r.car.ole, 'no Ole on a later ride');
    await T.frames(4);
    await T.tap('KeyE');
    await waitPhase(T, 'ride', 10000);
    await T.until(() => window.__said.some(([w, t]) => w === 'chofer' && /Guaguan går när den går/.test(t)), 20000);
    await T.frames(6);
    await T.shot('guagua_andra');
    await T.tap('KeyS');
    r = await st(T);
    check(r.dest === '3,6,0', `S: Playa, the stop after Avenida del Mar (${r.dest})`);
    await T.tap('KeyE');
    await T.until(() => __game.guagua.last?.kind === 'arrive', 10000);
    r = await st(T);
    T.log('second', JSON.stringify(r.last));
    check(r.last.dest === '3,6,0' && r.last.why === 'skip' && r.rec === 1, `E: off at Playa at once; the later ride's lines not all heard, records.guagua still 1 (${JSON.stringify(r.last)}, ${r.rec})`);
    const adds = await T.ev(() => window.__shame);
    check(!adds.some(([, ph]) => ph), `no SKANDAL from any of it (${JSON.stringify(adds)})`);
  },

  async guaguaKant(T) {
    await T.fresh('&mission=9');
    await spies(T);
    let r, s;

    // 1. The film's ride from Casa Lola: its route passes Hotel Flamenco, where Ole stands: no bust, the
    //    driver's Las Palmas line. A debug warp mid-ride takes him off and the bus away.
    await atStop(T, '2,4,0');
    await T.tap('KeyE');
    await T.frames(3);
    r = await st(T);
    check(r.phase === 'wait' && r.last.film && !r.last.ole && !r.car.ole && r.car.riders === 2, `the film's ride with no Ole at the window (${JSON.stringify(r.last)}, ${JSON.stringify(r.car)})`);
    await waitPhase(T, 'door', 30000);
    await T.frames(3);
    await T.tap('KeyE');
    await waitPhase(T, 'ride', 10000);
    await T.until(() => window.__said.some(([w, t]) => /Las Palmas/.test(t)), 20000);
    s = await said(T);
    check(s.some(([w, t]) => w === 'chofer' && t === '¡Las Palmas! Bra fotbollslag… Högsta divisionen!') && !s.some(([w]) => w === 'ole'), `the driver's Las Palmas line (${JSON.stringify(s)})`);
    await T.frames(6);
    await T.shot('guagua_kant_utanOle');
    await T.ev(() => { const g = __game, p = g.player; g.debugWarp(p.x + 20, p.z - 10, 0); });
    await T.frames(4);
    r = await st(T);
    T.log('warp mid-ride', JSON.stringify(r));
    check(!r.phase && r.last.kind === 'warp' && r.p.state === 'normal' && r.p.inScene && !r.p.inBus && r.buses === 0 && !r.card && !r.inDialog,
      `a debug warp: off the bus on his feet, the bus gone (${JSON.stringify(r)})`);
    check(r.rec === 0, `the film's ride not counted (${r.rec})`);

    // 2. Q while waiting: the camera back on him, the bus drives on by and is taken away.
    await atStop(T, '2,3,2');
    await T.tap('KeyE');
    await T.frames(20);
    await T.tap('KeyQ');
    await T.frames(3);
    r = await st(T);
    check(!r.phase && r.last.kind === 'cancel' && r.last.why === 'quit' && !r.inDialog && !r.cine && r.away === 1, `Q: no wait, the camera back (${JSON.stringify(r)})`);
    await T.until(() => !__game.cars.some((q) => q.guagua), 60000);
    T.log('the bus driven by and away');

    // 3. Walking off from the door: "¡Vámonos!" and the bus goes without him.
    await atStop(T, '2,3,2');
    await T.until(() => __game.guagua.canUse() && !__game.guagua.leaving(__game.guagua.stops[0]), 20000);
    await T.tap('KeyE');
    await waitPhase(T, 'door', 30000);
    await T.ev(() => { const p = __game.player, s = __game.guagua.sc.stop; p.teleport(p.x - s.d.x * 20, p.z - s.d.z * 20, p.yaw); });
    await T.frames(4);
    r = await st(T);
    s = await said(T);
    check(!r.phase && r.last.kind === 'leave' && s.some(([w, t]) => w === 'chofer' && t === '¡Vámonos!'), `walked off: "¡Vámonos!", the bus leaves (${JSON.stringify(r.last)})`);
    await T.until(() => !__game.cars.some((q) => q.guagua), 60000);

    // 4. A car on the stop: no wait, the toast.
    await T.ev(async () => {
      const g = __game, G = g.guagua, { Car } = await import('/src/actors/car.js'), st = G.stops.find((q) => q.key === '2,3,2'), b = G.busSpot(st);
      const c = new Car('sedan'); c.place(b.x, b.z, b.yaw); g.addCar(c); window.__blocker = c;
    });
    await atStop(T, '2,3,2');
    await T.tap('KeyE');
    await T.frames(3);
    r = await st(T);
    const toasts = await T.ev(() => window.__toasts.slice());
    check(!r.phase && r.last.kind === 'blocked' && r.buses === 0 && toasts.includes('Det står en bil på hållplatsen.'), `a car on the stop: the toast, no bus (${JSON.stringify(r.last)}, ${JSON.stringify(toasts)})`);
    await T.ev(() => { __game.removeCar(window.__blocker); });

    // 4b. A car standing on the lane just short of the stop: the bus held up behind it opens its door
    //     where it stands, and he can still get on.
    await T.ev(async () => {
      const g = __game, G = g.guagua, { Car } = await import('/src/actors/car.js'), st = G.stops.find((q) => q.key === '2,3,2'), b = G.busSpot(st);
      const c = new Car('van'); c.place(b.x - st.d.x * 13, b.z - st.d.z * 13, b.yaw); c.locked = true; g.addCar(c); window.__blocker = c;
    });
    await atStop(T, '2,3,2');
    await T.tap('KeyE');
    await waitPhase(T, 'door', 40000);
    r = await st(T);
    const off2 = await doorOff(T);
    T.log('held up', JSON.stringify(off2), JSON.stringify(r.p));
    check(r.near === 'guagua-door' || off2.along < -1, `held up short of the stop, the door open (${JSON.stringify(off2)})`);
    await T.shot('guagua_kant_kö');
    await T.ev(() => { const G = __game.guagua, q = G.doorSpot(), p = __game.player; p.teleport(q.x - G.sc.stop.f.x * 1.2, q.z - G.sc.stop.f.z * 1.2, p.yaw); });
    await T.frames(4);
    r = await st(T);
    check(r.phase === 'door' && r.near === 'guagua-door', `walked to its door: "E Kliv på guaguan" (${r.phase}, ${r.near})`);
    await T.ev(() => { __game.guagua.reset('test'); __game.removeCar(window.__blocker); });
    await T.frames(4);

    // 5. No prompt at the wheel of a car or in a pursuit.
    await atStop(T, '2,3,2');
    await T.ev(async () => { const g = __game, { Car } = await import('/src/actors/car.js'), p = g.player; const c = new Car('sedan'); c.place(p.x, p.z, p.yaw); g.addCar(c); g.enterCar(c); window.__mine = c; });
    await T.frames(4);
    r = await st(T);
    check(r.playerCar && !/guaguan/.test(r.prompt) && !(await T.ev(() => __game.guagua.canUse())), `no prompt at the wheel (${r.near}, "${r.prompt}")`);
    await T.ev(() => { const g = __game; g.exitCar(true); g.removeCar(window.__mine); });
    await atStop(T, '2,3,2');
    await T.ev(() => { const s = __game.shame; s.v = 0; s.add(100); });
    await T.frames(4);
    r = await st(T);
    const pur = await T.ev(() => __game.shame.pursuit);
    check(pur && r.near !== 'guagua-2,3,2' && !(await T.ev(() => __game.guagua.canUse())), `no prompt in a pursuit (${pur}, ${r.near})`);
    await T.ev(() => { const s = __game.shame; if (s.pursuit) { s.v = 0; s.endPursuit(true); } s.forced = false; });
    await T.frames(4);
    await atStop(T, '2,3,2');
    r = await st(T);
    check(r.near === 'guagua-2,3,2', `after it the prompt again (${r.near})`);

    // 6. A mission start mid-ride: off the bus on his feet, the bus gone, no card; in the mission no prompt.
    await T.tap('KeyE');
    await waitPhase(T, 'door', 30000);
    await T.frames(3);
    await T.tap('KeyE');
    await waitPhase(T, 'ride', 10000);
    await T.frames(30);
    await T.ev(() => { __game.missions.begin(); });
    await T.frames(6);
    r = await st(T);
    T.log('mission mid-ride', JSON.stringify(r));
    check(r.ms !== 'idle' && !r.phase && r.last.kind === 'gone' && r.p.state === 'normal' && r.p.inScene && !r.p.inBus && r.buses === 0 && (!r.card || !/GUAGUAN/.test(r.card)),
      `a mission start: off the bus, it gone (${JSON.stringify(r)})`);
    await T.until(() => __game.missions.state === 'running', 60000);
    await atStop(T, '2,3,2');
    r = await st(T);
    check(r.near !== 'guagua-2,3,2' && !/guaguan/.test(r.prompt), `in the mission no prompt (${r.near}, "${r.prompt}")`);
    await T.ev(() => __game.guagua.start(__game.guagua.stops[0]));
    r = await st(T);
    check(!r.phase && r.buses === 0, 'and no wait by hand');
    await T.ev(() => __game.missions.abort());
    await T.frames(4);
    await atStop(T, '2,3,2');
    r = await st(T);
    check(r.ms === 'idle' && r.near === 'guagua-2,3,2', `after the mission the prompt again (${r.ms}, ${r.near})`);
    const adds = await T.ev(() => window.__shame);
    check(!adds.some(([, ph]) => ph), `no SKANDAL while waiting or riding (${JSON.stringify(adds)})`);
  },

  // Every stop: the bus out of view at its start, its door by the bench, a ride that moves it on, the
  // arrival at the next stop in the loop (records.guagua set: the shorter later rides).
  async guaguaLinje(T) {
    await T.fresh('&mission=9');
    await spies(T);
    await T.ev(() => { __game.records.guagua = 1; });
    const keys = await T.ev(() => __game.guagua.stops.map((s) => s.key));
    const rows = [];
    for (const key of keys) {
      await T.ev(() => { const g = __game, G = g.guagua; for (const a of G.away.slice()) g.removeCar(a.car); G.away.length = 0; });
      await atStop(T, key);
      await T.tap('KeyE');
      await T.frames(3);
      let r = await st(T);
      if (r.phase !== 'wait') { rows.push({ key, fail: `no wait (${JSON.stringify(r.last)})` }); continue; }
      const seen0 = await inView(T);
      const d0 = await T.ev(() => { const G = __game.guagua, c = G.car, s = G.sc.s; return +Math.hypot(c.x - s.x, c.z - s.z).toFixed(1); });
      await T.until(() => { const c = __game.guagua.car, s = __game.guagua.sc?.s; return !c || !s || Math.hypot(c.x - s.x, c.z - s.z) < 14; }, 30000);
      await T.shot(`guagua_linje_${key.replace(/,/g, '')}_vantar`);
      const ok = await waitPhase(T, 'door', 30000).then(() => true, () => false);
      if (!ok) { rows.push({ key, seen0, d0, fail: `never stopped (${JSON.stringify(await st(T))})` }); await T.ev(() => __game.guagua.reset('test')); continue; }
      const off = await doorOff(T);
      await T.frames(3);
      await T.shot(`guagua_linje_${key.replace(/,/g, '')}_dorren`);
      await T.tap('KeyE');
      await waitPhase(T, 'ride', 10000);
      const a = await T.ev(() => { const c = __game.guagua.car; return { x: c.x, z: c.z }; });
      await T.until(() => (__game.guagua.sc?.t ?? 99) > 6, 20000);
      await T.shot(`guagua_linje_${key.replace(/,/g, '')}_ombord`);
      await T.until(() => __game.guagua.last?.kind === 'fade', 20000);
      const f = await T.ev(() => __game.guagua.last);
      await T.until(() => __game.guagua.last?.kind === 'arrive', 10000);
      const arr = await T.ev(() => __game.guagua.last);
      const moved = +Math.hypot(f.x - a.x, f.z - a.z).toFixed(1);
      rows.push({ key, seen0, d0, off, moved, dest: arr.dest, bus: arr.bus });
      await T.until(() => !__game.inDialog, 10000);
    }
    T.log('stops', JSON.stringify(rows));
    for (const row of rows) {
      check(!row.fail, `${row.key}: ${row.fail}`);
      check(!row.seen0 && row.d0 > 30, `${row.key}: the bus sets off out of view, ${row.d0} m off`);
      check(Math.abs(row.off.along) < 1.0 && Math.abs(row.off.out) < 0.6 && row.off.yaw < 0.08, `${row.key}: its door by the bench (${JSON.stringify(row.off)})`);
      check(row.moved > 40, `${row.key}: the ride moves it on (${row.moved} m)`);
      const k = keys.indexOf(row.key);
      check(row.dest === keys[(k + 1) % keys.length] && row.bus, `${row.key}: off at the next stop with the bus there (${row.dest}, ${row.bus})`);
    }
  },
};
