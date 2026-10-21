// Utflykt med Lasse – åk med SunTrip-bussen till Fataga (free roam, DESIGN §10.58; game/utflykt.js).
//   utflykt: at index 10 (fataga not done) no prompt on the office's sidewalk; at index 11 "E Åk på utflykt
//     till Fataga – 50 pta" there; E: held, the cut from the road (Stig at the kerb, Lasse and the office
//     behind him), Lasse's "Hä-pååre! …" bubble, 50 pta; the fade: SunTrip's bus at the office's stop on the
//     eastbound lane, locked, `noEnter`, invulnerable, Affe's bust at the wheel and five tourists at the
//     windows, Stig its passenger (side −1, never `playerCar`), the chase camera on the bus, the card
//     "Nästa hållplats: Gando"; R does nothing; the whole loop driven for real: Gando (in the lane, never on
//     bus 17's bay), Grisfesten, Fataga, each stopped within 1 m of its spot, the leg's and the stop's lines
//     (Affe, Lasse on the radio, Stig's åksjuka, the tourist's "Stackars människor som lever så här."); at
//     Fataga E off onto the sidewalk, the card "Tillbaka till bussen!" with the two minutes, Lasse's line, no
//     door prompt far off, "E Kliv på bussen" at the door, back on, Lasse's "Alla med? Då kör vi!", on soon;
//     home at the office: Stig off by himself on the sidewalk, "Tack för i dag, allihop!", "Tack så mycket!",
//     `records.utflykt` 1, the bus off and taken away out of sight; no SKANDAL, no coin on the way. Shots
//     `utflykt_prompt`, `_kontoret`, `_ombord`, `_gando`, `_grisfesten`, `_fataga`, `_fataga_av`, `_dorren`,
//     `_hem`, `_karta`.
//   utflyktKvar: off at Gando (the bus on without him, Affe's "Hej då, Olsson!", Stig free there); the bus
//     through Fataga with him aboard ("Ingen som vill titta på dukar? …"); off at Fataga and not back in
//     time: Lasse's "Bussen har redan gått!" and Stig's "Jag stod bara och tittade på dukarna."; a car on the
//     bus's spot at the office: the toast, no trip; no prompt at the wheel or in a pursuit; a debug warp
//     mid-ride: off the bus on his feet, the bus gone; a mission start mid-ride: off the bus, the bus gone,
//     no card, no prompt in the mission and `call()` refuses; traffic queued behind the parked bus waits.
//     Shots `utflykt_kvar_gando`, `_missad`.
import { check } from '../lib.mjs';

async function spies(T) {
  await T.ev(async () => {
    const g = __game;
    window.__shame = [];
    const add = g.shame.add.bind(g.shame);
    g.shame.add = (n, ...a) => { if (n > 0) window.__shame.push([+n.toFixed(2), g.utflykt.sc?.phase || null]); return add(n, ...a); };
    const { hud } = await import('/src/game/hud.js');
    window.__hud = hud;
    window.__toasts = [];
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text.replace(/<[^>]+>/g, '')); return toast(text, ...a); };
  });
}
const st = (T) => T.ev(() => {
  const g = __game, U = g.utflykt, sc = U.sc, p = g.player, car = sc?.car || null, it = g.nearestInteractable();
  const card = document.getElementById('objective');
  const timer = card.querySelector('.obj-timer');
  return {
    phase: sc?.phase || null, at: sc?.at ?? null, next: sc?.next ?? null, aboard: sc?.aboard ?? null, last: U.last, trips: U.trips, rec: g.records.utflykt || 0,
    near: it?.type === 'it' ? it.it.id : it?.type || null, prompt: (window.__hud._prompt || '').replace(/<[^>]+>/g, ''),
    card: card.classList.contains('show') ? card.querySelector('.obj-title')?.textContent + ' | ' + card.querySelector('.obj-text')?.textContent : null,
    timer: card.classList.contains('show') && timer && timer.style.display !== 'none' ? timer.textContent : null,
    inDialog: g.inDialog, cine: !!g.cam.cine, ms: g.missions.state, shame: +g.shame.v.toFixed(1), coins: g.coins, time: +g.time.toFixed(2),
    p: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), state: p.state, inBus: !!car && p.car === car, side: p.seatSide, inScene: p.root.parent === g.scene },
    car: car && { x: +car.x.toFixed(2), z: +car.z.toFixed(2), yaw: +car.yaw.toFixed(3), v: +car.speed.toFixed(2), type: car.type, locked: car.locked, noEnter: car.noEnter, inv: !!car.invulnerable, ai: !!car.ai,
      bust: !!car.driverBust, riders: car.riders.length },
    buses: g.cars.filter((c) => c.utflykt).length, away: U.away.length, playerCar: !!g.playerCar,
    cam: car ? +Math.hypot(g.cam.cam.position.x - car.x, g.cam.cam.position.z - car.z).toFixed(1) : null,
  };
});
const said = (T) => T.ev(() => __game.utflykt.said.map(([w, t]) => [w, t]));
const has = (s, who, text) => s.some(([w, t]) => w === who && t === text);
const stopOf = (T, i) => T.ev((i) => { const s = __game.utflykt.stops[i]; return { key: s.key, x: s.x, z: s.z, yaw: s.yaw, fx: s.fx, fz: s.fz }; }, i);
// The parked bus against its stop's spot: along its way and across, m.
const offAt = (r, s) => ({ along: +((r.car.x - s.x) * s.fx + (r.car.z - s.z) * s.fz).toFixed(2), lat: +((r.car.x - s.x) * s.fz - (r.car.z - s.z) * s.fx).toFixed(2) });
const waitStop = (T, i, ms = 120000) => T.until((i) => { const sc = __game.utflykt.sc; return sc?.phase === 'stop' && sc.at === i && sc.car.speed < 0.3; }, ms, i);
async function atKerb(T) {
  await T.ev(() => {
    const g = __game, k = g.utflykt.spot;
    if (g.playerCar) g.exitCar(true);
    g.debugWarp(k.x, k.z, k.yaw);
    g.cam.yaw = k.yaw; g.cam.snapNext = true;
  });
  await T.frames(10);
}
// Book the trip and wait until the bus is under way with him in it.
async function board(T) {
  await atKerb(T);
  await T.tap('KeyE');
  await T.until(() => __game.utflykt.sc?.phase === 'ride' && !!__game.utflykt.sc.car?.ai, 20000);
  await T.frames(3);
}

export const SCENARIOS = {
  async utflykt(T) {
    await T.fresh('&mission=10');
    await spies(T);
    await atKerb(T);
    let r = await st(T);
    check(r.ms === 'idle' && r.near !== 'utflykt' && !/utflykt/.test(r.prompt), `index 10 (fataga not done): no prompt (${r.near}, "${r.prompt}")`);

    await T.fresh('&mission=11');
    await spies(T);
    await T.ev(() => { __game.coins = 200; });
    await atKerb(T);
    r = await st(T);
    check(r.near === 'utflykt' && r.prompt === 'E Åk på utflykt till Fataga – 50 pta', `the prompt on the office's sidewalk (${r.near}, "${r.prompt}")`);
    await T.shot('utflykt_prompt');

    await T.tap('KeyE');
    await T.frames(12);
    r = await st(T);
    T.log('call', JSON.stringify(r));
    check(r.phase === 'call' && r.inDialog && r.cine && r.last.lasse, `held, the cut, Lasse there (${r.phase}, ${r.inDialog}, ${r.cine}, ${JSON.stringify(r.last)})`);
    check(r.coins === 150, `50 pta (${r.coins})`);
    let s = await said(T);
    check(has(s, 'lasse', 'Hä-pååre! Femtio pesetas, så åker vi till Fataga.'), `Lasse's greeting (${JSON.stringify(s)})`);
    await T.shot('utflykt_kontoret');

    await T.until(() => __game.utflykt.sc?.phase === 'ride', 20000);
    await T.frames(4);
    r = await st(T);
    T.log('aboard', JSON.stringify(r));
    const s0 = await stopOf(T, 0);
    const o0 = offAt(r, s0);
    check(r.car && r.car.type === 'bus' && r.car.locked && r.car.noEnter && r.car.inv && r.car.bust && r.car.riders === 5 && r.buses === 1,
      `SunTrip's bus, locked, Affe at the wheel, five tourists (${JSON.stringify(r.car)})`);
    check(Math.abs(o0.along) < 0.6 && Math.abs(o0.lat) < 0.6 && Math.abs(r.car.yaw - Math.PI / 2) < 0.05, `at the office's stop on the eastbound lane (${JSON.stringify(o0)}, ${r.car.yaw})`);
    check(r.p.inBus && r.p.side === -1 && r.p.state === 'seated' && !r.playerCar && !r.inDialog && !r.cine, `Stig its passenger, free (${JSON.stringify(r.p)}, ${r.playerCar})`);
    check(r.card === 'UTFLYKT | Nästa hållplats: Gando', `the card (${r.card})`);
    check(r.cam > 4 && r.cam < 22, `the chase camera on the bus (${r.cam} m)`);
    await T.tap('KeyR');
    await T.frames(4);
    r = await st(T);
    check(r.p.inBus, 'R does nothing');
    await T.shot('utflykt_ombord');
    const coins0 = r.coins;

    // Gando.
    await T.until(() => __game.utflykt.sc?.car?.speed > 5, 15000);
    await waitStop(T, 1);
    await T.frames(5);
    r = await st(T);
    const s1 = await stopOf(T, 1), o1 = offAt(r, s1);
    T.log('gando', JSON.stringify(r), JSON.stringify(o1));
    const bay = await T.L('busBay');
    check(Math.abs(o1.along) < 1.0 && Math.abs(o1.lat) < 0.6, `stopped at Gando in the lane (${JSON.stringify(o1)})`);
    check(Math.hypot(r.car.x - bay.x, r.car.z - bay.z) > 10, `not on bus 17's bay (${Math.hypot(r.car.x - bay.x, r.car.z - bay.z).toFixed(1)} m)`);
    check(r.p.inBus && r.card === 'UTFLYKT | Hållplats: Gando' && r.prompt === 'E Kliv av', `aboard, the card and "E Kliv av" (${r.card}, "${r.prompt}")`);
    check(r.last.ride > 35 && r.last.ride < 70, `the leg from the office (${r.last.ride} s)`);
    await T.sleep(1500);
    s = await said(T);
    for (const [w, t] of [['affe', 'Då kör vi!'], ['lasse', 'Ni bör inte dricka vattnet.'], ['stig', 'Inte ens till tänderna?'], ['stig', 'Jag har lite anlag för åksjuka.'], ['lasse', 'Gando! Den som saknar en väska kan fråga på hittegodset.']]) {
      check(has(s, w, t), `${w}: "${t}"`);
    }
    await T.shot('utflykt_gando');

    // Grisfesten (he stays on).
    await waitStop(T, 2);
    await T.frames(5);
    r = await st(T);
    const s2 = await stopOf(T, 2), o2 = offAt(r, s2);
    T.log('grisfesten', JSON.stringify(r), JSON.stringify(o2));
    check(Math.abs(o2.along) < 1.0 && Math.abs(o2.lat) < 0.6 && r.p.inBus, `stopped at Grisfesten, him aboard (${JSON.stringify(o2)})`);
    await T.sleep(1500);
    s = await said(T);
    check(has(s, 'lasse', 'Grisfesten är på torsdag och kostar 800 pesetas.'), 'Lasse at the grisfest\'s gate');
    check(has(s, 'lasse', 'Till höger tomatfälten. Tomaterna härifrån åker ända hem till Sverige.'), 'the tomato fields');
    await T.shot('utflykt_grisfesten');

    // Fataga: off, the card, back on.
    await waitStop(T, 3);
    await T.frames(5);
    r = await st(T);
    const s3 = await stopOf(T, 3), o3 = offAt(r, s3);
    T.log('fataga', JSON.stringify(r), JSON.stringify(o3));
    check(Math.abs(o3.along) < 1.0 && Math.abs(o3.lat) < 0.6 && r.p.inBus, `stopped at Fataga (${JSON.stringify(o3)})`);
    check(r.coins === coins0, `no coin on the way out (${r.coins} vs ${coins0})`);
    await T.until(() => __game.utflykt.said.some(([w, t]) => w === 'turist' && t === 'Stackars människor som lever så här.'), 20000);
    s = await said(T);
    check(has(s, 'lasse', 'Fataga är en av de få ursprungliga byar som finns kvar på Gran Canaria.'), 'Lasse: Fataga');
    check(has(s, 'lasse', 'Om ni vill köpa deras broderade dukar, så pruta inte. Prutning och sånt kan ni hålla på med på marknaden.'), 'Lasse: the tablecloths');
    check(has(s, 'turist', 'Stackars människor som lever så här.'), 'the tourist\'s line');
    check(has(s, 'turist', 'Är det långt kvar?') && has(s, 'affe', 'Två minuter.'), 'the leg from Grisfesten');
    await T.shot('utflykt_fataga');
    await T.tap('KeyE');
    await T.frames(6);
    r = await st(T);
    T.log('off', JSON.stringify(r));
    check(r.phase === 'stop' && !r.aboard && r.p.state === 'normal' && r.p.inScene, `off the bus on his feet (${r.phase}, ${r.aboard}, ${r.p.state})`);
    check(Math.abs(r.p.z - (-206.15)) < 0.3 && Math.abs(r.p.x - (s3.x - 3.95)) < 0.4 && Math.abs(r.p.y - 0.15) < 0.05, `on the sidewalk at the door (${r.p.x}, ${r.p.y}, ${r.p.z})`);
    check(r.card === 'UTFLYKT | Tillbaka till bussen!' && (r.timer === '2:00' || r.timer === '1:59'), `the card and the two minutes (${r.card}, ${r.timer})`);
    s = await said(T);
    check(has(s, 'lasse', 'Bussen går om två minuter!'), 'Lasse: two minutes');
    await T.shot('utflykt_fataga_av');
    // Into the village (walked there: a debug warp ends the trip): no door prompt there; back to the
    // door: on again.
    const vil = await T.L('fataga');
    await T.ev((v) => { const g = __game; g.player.teleport(v.x, v.z + 4, Math.PI); g.cam.snapNext = true; }, vil);
    await T.frames(10);
    r = await st(T);
    check(r.near !== 'utflykt-door' && r.phase === 'stop', `no door prompt in the village, the bus waiting (${r.near})`);
    await T.sleep(1500);
    r = await st(T);
    check(r.timer && r.timer < '1:59' && r.timer > '1:40', `the time running (${r.timer})`);
    await T.ev(() => { const g = __game, U = g.utflykt, d = U.doorSpot(); g.player.teleport(d.x, d.z - 0.8, Math.PI / 2); g.cam.snapNext = true; });
    await T.frames(8);
    r = await st(T);
    check(r.near === 'utflykt-door' && r.prompt === 'E Kliv på bussen', `at the door "E Kliv på bussen" (${r.near}, "${r.prompt}")`);
    await T.shot('utflykt_dorren');
    await T.tap('KeyE');
    await T.until(() => __game.utflykt.sc?.phase === 'stop' && __game.utflykt.sc.aboard, 5000);
    await T.frames(3);
    r = await st(T);
    check(r.p.inBus && r.p.side === -1, 'back in his seat');
    const coins1 = r.coins;
    s = await said(T);
    check(has(s, 'lasse', 'Alla med? Då kör vi!'), 'Lasse: all aboard');
    await T.until(() => __game.utflykt.sc?.phase === 'ride', 6000);
    s = await said(T);
    check(!has(s, 'lasse', 'Ingen som vill titta på dukar? Då åker vi vidare.'), 'no "Ingen som vill …" after he was off');

    // Home.
    await T.until(() => __game.utflykt.sc?.phase === 'home', 120000);
    r = await st(T);
    check(r.p.inBus && r.coins === coins1, `no coin on the way home (${r.coins} vs ${coins1})`);
    await T.until(() => __game.utflykt.last?.kind === 'home', 6000);
    await T.frames(4);
    r = await st(T);
    T.log('home', JSON.stringify(r));
    check(!r.phase && r.p.state === 'normal' && r.p.inScene && r.rec === 1 && r.trips === 1, `off at home by himself, a loop counted (${r.p.state}, ${r.rec})`);
    check(Math.abs(r.p.x - (-14.05)) < 0.5 && Math.abs(r.p.z - (-33.85)) < 0.3, `on the sidewalk across from the office (${r.p.x}, ${r.p.z})`);
    check(r.card === null && r.prompt !== 'E Kliv av', `no card (${r.card})`);
    await T.shot('utflykt_hem');
    await T.sleep(3500);
    s = await said(T);
    check(has(s, 'lasse', 'Tack för i dag, allihop!') && has(s, 'stig', 'Tack så mycket!'), 'the thanks');
    check(has(s, 'lasse', 'Friskoteket börjar halv tio varje morgon.'), 'the leg home');
    const save = await T.ev(() => JSON.parse(localStorage.getItem('charter-and-run-v1') || 'null')?.records?.utflykt);
    check(save === 1, `saved (${save})`);
    await T.until(() => __game.utflykt.away.length === 0 && !__game.cars.some((c) => c.utflykt), 60000);
    r = await st(T);
    check(r.buses === 0, 'the bus gone out of sight');
    check(r.shame === 0 && (await T.ev(() => window.__shame.length)) === 0, 'no SKANDAL');
    await T.ev(() => { const g = __game; g.bigMap = true; });
    await T.shot('utflykt_karta');
  },

  async utflyktKvar(T) {
    await T.fresh('&mission=11');
    await spies(T);
    await T.ev(() => { __game.coins = 500; });

    // Off at Gando: the bus on without him.
    await board(T);
    check(await T.ev(() => __game.utflykt.jump(1, 20)), 'jumped before Gando');
    await waitStop(T, 1, 30000);
    await T.frames(3);
    await T.tap('KeyE');
    await T.frames(5);
    let r = await st(T);
    check(!r.aboard && r.p.state === 'normal' && r.card === null, `off at Gando, no card (${r.card})`);
    await T.until(() => !__game.utflykt.sc, 15000);
    r = await st(T);
    let s = await said(T);
    check(r.last.kind === 'left' && r.last.stop === 'gando' && has(s, 'affe', 'Hej då, Olsson!'), `the bus on without him (${JSON.stringify(r.last)})`);
    check(r.away === 1 && r.p.state === 'normal', 'free at Gando, the bus driving on');
    await T.frames(30);
    await T.shot('utflykt_kvar_gando');

    // Through Fataga aboard.
    await board(T);
    check(await T.ev(() => __game.utflykt.jump(3, 30)), 'jumped before Fataga');
    await waitStop(T, 3, 30000);
    await T.until(() => __game.utflykt.sc?.phase === 'ride' && __game.utflykt.sc.leg === 3, 25000);
    s = await said(T);
    check(has(s, 'lasse', 'Ingen som vill titta på dukar? Då åker vi vidare.'), 'on from Fataga with him aboard');
    await T.warp(-14, -47.4, 0);
    await T.frames(5);
    r = await st(T);
    check(!r.phase && r.buses === 0 && r.p.state === 'normal' && r.p.inScene && r.last.kind === 'warp', `a debug warp: off, the bus gone (${JSON.stringify(r.last)})`);

    // Off at Fataga, not back in time.
    await board(T);
    await T.ev(() => { __game.utflykt.stops[3].wait = 8; });
    check(await T.ev(() => __game.utflykt.jump(3, 30)), 'jumped before Fataga');
    await waitStop(T, 3, 30000);
    await T.tap('KeyE');
    await T.frames(5);
    r = await st(T);
    check(r.card === 'UTFLYKT | Tillbaka till bussen!' && r.timer, `the card (${r.card}, ${r.timer})`);
    await T.until(() => __game.utflykt.last?.kind === 'missed', 30000);
    await T.until(() => __game.utflykt.said.some(([w]) => w === 'stig'), 8000).catch(() => {});
    s = await said(T);
    r = await st(T);
    check(has(s, 'lasse', 'Bussen har redan gått!') && has(s, 'stig', 'Jag stod bara och tittade på dukarna.'), 'missed: Lasse and Stig');
    check(!r.phase && r.card === null && r.p.state === 'normal', 'free in Fataga, no card');
    await T.shot('utflykt_kvar_missad');
    await T.ev(() => { __game.utflykt.stops[3].wait = 120; });

    // Traffic behind the parked bus waits.
    await board(T);
    check(await T.ev(() => __game.utflykt.jump(2, 30)), 'jumped before Grisfesten');
    await waitStop(T, 2, 30000);
    const q = await T.ev(async () => {
      const g = __game, { Car } = await import('/src/actors/car.js'), { AIDriver, LanePath, startNodes } = await import('/src/actors/drivers.js');
      const bus = g.utflykt.car, c = new Car('hatch');
      c.place(bus.x + 13, bus.z, bus.yaw);
      g.addCar(c);
      c.ai = new AIDriver(c, { mode: 'traffic' });
      window.__q = c;
      return true;
    });
    check(q, 'a car behind the bus');
    await T.sleep(5000);
    r = await T.ev(() => { const c = window.__q, bus = __game.utflykt.car; return { gap: +Math.hypot(c.x - bus.x, c.z - bus.z).toFixed(2), hp: bus.hp, cHp: c.hp, phase: __game.utflykt.sc?.phase }; });
    T.log('queue', JSON.stringify(r));
    check(r.gap > 6.5, `it waits behind the bus, no shove (${r.gap} m)`);
    await T.ev(() => { __game.removeCar(window.__q); });

    // A mission start mid-ride.
    await T.until(() => __game.utflykt.sc?.phase === 'ride', 15000);
    await T.frames(20);
    await T.ev(() => { __game.missions.begin(); });
    await T.frames(6);
    r = await st(T);
    T.log('mission mid-ride', JSON.stringify(r));
    check(r.ms !== 'idle' && !r.phase && r.buses === 0 && r.away === 0 && r.p.state === 'normal' && r.p.inScene && !r.p.inBus && r.last.kind === 'gone' && !/UTFLYKT/.test(r.card || ''),
      `a mission start: off the bus on his feet, the bus gone, no card (${JSON.stringify(r)})`);
    await T.until(() => __game.missions.state === 'running', 60000);
    await atKerb(T);
    r = await st(T);
    check(r.near !== 'utflykt' && !/utflykt/.test(r.prompt), `no prompt in the mission (${r.near}, "${r.prompt}")`);
    await T.ev(() => __game.utflykt.call());
    await T.frames(3);
    check(!(await T.ev(() => !!__game.utflykt.sc)), 'call() refuses in a mission');
    await T.ev(() => __game.missions.abort());
    await T.frames(4);
    await atKerb(T);
    r = await st(T);
    check(r.ms === 'idle' && r.near === 'utflykt', `after the mission the prompt again (${r.ms}, ${r.near})`);
    const adds = await T.ev(() => window.__shame);
    check(!adds.some(([, ph]) => ph), `no SKANDAL on a trip (${JSON.stringify(adds)})`);
  },

  async utflyktSpar(T) {
    await T.fresh('&mission=11');
    await spies(T);
    // A car on the bus's spot at the office: the toast, no trip.
    await T.ev(async () => {
      const g = __game, { Car } = await import('/src/actors/car.js'), s = g.utflykt.stops[0];
      const c = new Car('van');
      c.place(s.x + 2, s.z, s.yaw);
      g.addCar(c);
      window.__van = c;
    });
    await atKerb(T);
    await T.tap('KeyE');
    await T.frames(5);
    let r = await st(T);
    const toasts = await T.ev(() => window.__toasts.slice());
    check(!r.phase && r.last?.kind === 'blocked' && toasts.includes('Det står en bil i vägen för bussen.'), `blocked: the toast, no trip (${JSON.stringify(r.last)})`);
    await T.ev(() => __game.removeCar(window.__van));

    // At the wheel of a car: no prompt.
    await T.ev(async () => {
      const g = __game, { Car } = await import('/src/actors/car.js'), k = g.utflykt.spot;
      const c = new Car('hatch');
      c.place(k.x, k.z + 1, Math.PI / 2);
      g.addCar(c);
      g.enterCar(c);
      window.__car = c;
    });
    await T.frames(6);
    r = await st(T);
    check(r.playerCar && !(await T.ev(() => __game.utflykt.canUse())), 'no trip from the wheel');
    await T.ev(() => { const g = __game; g.exitCar(true); g.removeCar(window.__car); });

    // In a pursuit: no prompt.
    await atKerb(T);
    await T.ev(() => { __game.shame.add(100, { force: true }); });
    await T.frames(6);
    r = await st(T);
    check(r.near !== 'utflykt' && !(await T.ev(() => __game.utflykt.canUse())), `no prompt in a pursuit (${r.near})`);
  },
};
