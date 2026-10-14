// Tutan som folk reagerar på – the horn the island hears (free roam, DESIGN §10.9; feature 5): tuta.
//   tuta: H in a car on the SunTrip street: a pedestrian ahead hops aside with a dodge shout, one
//         behind stays put, Lasse answers "Hä-pååre!", waves and turns to Stig, Ole behind the hotel
//         does not, Stig says sorry the first time; no SKANDAL; within the cooldowns nobody answers or
//         hops twice and Stig says sorry once. Pulled up on the west street, Ole answers with his car
//         statistics (bokmål) and waves. Berra and Robban answer "Ra-tara-tara!" and Stig: "Det var
//         inte så jag menade!"; Angerud raises his arm about the platschef; the grisbil grunts (a
//         "NÖFF! NÖFF!" over its bed, again while H is held) and Berra and Robban answer with their
//         lift's lines; a dialogue drops the answers not yet said; in a mission the horn is only a
//         sound (no hop, no answer, no `hornAt`).
import { check } from '../lib.mjs';

const PI = Math.PI;
// Every line said through game.say since the last reset, as [speaker, text].
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([typeof t === 'string' ? t : (t === g.player ? 'stig' : t.key || (t.car ? 'bed' : 'ped')), text]); return o(t, text, secs); };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const has = (s, who, text) => s.some(([w, t]) => w === who && t === text);
// The player in a car (a free small one, or the first of `type`) at (x, z) facing yaw, the chase
// camera behind it (turned by `cam` rad).
async function drive(T, x, z, yaw, type = null, cam = 0) {
  await T.ev((x, z, yaw, type, cam) => {
    const g = __game, p = g.player;
    if (!g.playerCar || (type && g.playerCar.type !== type)) {
      if (g.playerCar) g.exitCar(true);
      p.state = 'normal';
      const car = type ? g.cars.find((c) => c.type === type && !c.dead) : g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && !c.spec.pigs && c.spec.len < 5);
      car.place(p.x + 3, p.z, yaw);
      g.enterCar(car);
    }
    const c = g.playerCar;
    c.place(x, z, yaw);
    c.vx = c.vz = 0;
    g.cam.yaw = yaw + Math.PI + cam; g.cam.snapNext = true;
  }, x, z, yaw, type, cam);
  await T.frames(8);
}
// Pedestrian k stood still at `along` m ahead of the car and `lat` m to its right (`keep`: his
// horn cooldown kept).
const plantPed = (T, k, along, lat, keep = false) => T.ev((k, along, lat, keep) => {
  const g = __game, c = g.playerCar, ped = g.peds[k], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  ped.char.state = 'normal';
  ped.char.teleport(c.x + fx * along - fz * lat, c.z + fz * along + fx * lat);
  ped.char.vx = ped.char.vz = 0;
  ped.idleT = 30; ped.panicT = 0; ped.startled = null;
  if (!keep) ped.honkedAt = undefined;
}, k, along, lat, keep);
// Pedestrian k against the car: its distance from the car's line (+ right), ahead, height, state.
const pedAt = (T, k) => T.ev((k) => {
  const g = __game, c = g.playerCar, ped = g.peds[k], ch = ped.char, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const dx = ch.x - c.x, dz = ch.z - c.z;
  return { lat: +(dx * -fz + dz * fx).toFixed(2), along: +(dx * fx + dz * fz).toFixed(2), y: +ch.y.toFixed(2), vy: +ch.vy.toFixed(2), startled: !!ped.startled, honked: ped.honkedAt ?? null, state: ch.state };
}, k);
// Everyone else at least 30 m from (x, z), so only the planted pedestrians 0 and 1 count.
const clearPeds = (T, x, z) => T.ev((x, z) => {
  __game.peds.forEach((ped, k) => { if (k > 1 && Math.hypot(ped.char.x - x, ped.char.z - z) < 30) ped.char.teleport(x + 200, z + 200); });
}, x, z);
const st = (T) => T.ev(() => {
  const g = __game, H = g.honk;
  return { last: H.last, hornAt: g.hornAt, queue: H.queue.length, react: Object.fromEntries(Object.entries(H.react).map(([k, r]) => [k, r.flag])),
    shame: g.shame.v, pursuit: !!g.shame.pursuing, ms: g.missions.state };
});
// How far (rad) each of `keys` faces off the player, and whether he waves.
const looks = (T, keys) => T.ev((keys) => Object.fromEntries(keys.map((k) => {
  const g = __game, n = g.npc(k), p = g.player, d = Math.atan2(p.x - n.x, p.z - n.z) - n.yaw;
  return [k, { wave: n.anim.wave, oath: n.anim.oath, face: Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) }];
})), keys);
// Sample `looks` every 100 ms for `ms`: did each wave, and how close to him did each turn; a shot
// at `shotAt` ms.
async function watch(T, keys, ms, shot = null, shotAt = 1200) {
  const seen = Object.fromEntries(keys.map((k) => [k, { wave: false, oath: false, face: 9 }]));
  let shotDone = !shot;
  for (let t = 0; t < ms; t += 100) {
    await T.sleep(100);
    const l = await looks(T, keys);
    for (const k of keys) { seen[k].wave ||= l[k].wave; seen[k].oath ||= l[k].oath; seen[k].face = Math.min(seen[k].face, +l[k].face.toFixed(2)); }
    if (!shotDone && t >= shotAt) { shotDone = true; await T.shot(shot); }
  }
  return seen;
}

export const SCENARIOS = {
  async tuta(T) {
    // 0. Free roam before ropavieja (no mission running): Lasse at SunTrip, Ole under Flamenco's pergola,
    //    Berra and Robban at Flamenco's bar, Angerud at the Viking Bar.
    await T.fresh('&mission=9');
    await resetSaid(T);
    const pos = await T.ev(() => Object.fromEntries(['lasse', 'ole', 'berra', 'robban', 'angerud'].map((k) => [k, { x: __game.npc(k).x, z: __game.npc(k).z, st: __game.npc(k).state }])));
    T.log('cast', JSON.stringify(pos));
    check(await T.ev(() => __game.missions.state === 'idle'), 'free roam');

    // 1. The SunTrip street (z = −40, between SunTrip and Flamenco), the car in the east lane (the
    //    north one) facing east, 6 m short of Lasse; a pedestrian 10 m ahead on the far (SunTrip)
    //    sidewalk, one 8 m behind on the near one. Ole, 31 m off under the pergola, is behind the hotel.
    const X = pos.lasse.x - 6, Z = -40 + 2.75;
    await drive(T, X, Z, PI / 2, null, -0.55);
    await clearPeds(T, X, Z);
    await plantPed(T, 0, 10, -9);
    await plantPed(T, 1, -8, 4.5);
    await T.frames(10);
    const p0 = await pedAt(T, 0), b0 = await pedAt(T, 1);
    let r = await st(T);
    const shame0 = r.shame;
    check(r.hornAt == null && r.last == null, 'no horn yet');
    await T.tap('KeyH');
    r = await st(T);
    T.log('press 1', JSON.stringify(r.last));
    check(r.hornAt && Math.abs(r.hornAt.x - X) < 1 && !r.hornAt.pigs, `hornAt is the press (${JSON.stringify(r.hornAt)})`);
    let pa = await pedAt(T, 0), pb = await pedAt(T, 1);
    check(pa.honked === r.last.t && pa.startled && pb.honked == null, `the pedestrian ahead is startled, not the one behind (${JSON.stringify([pa, pb])})`);
    let rep = Object.fromEntries(r.last.replies);
    check(rep.lasse === 'Hä-pååre!', `Lasse answers (${JSON.stringify(r.last.replies)})`);
    check(!rep.ole, 'Ole behind the hotel does not');
    check(r.last.stig.length === 1 && r.last.stig[0] === 'Förlåt! Jag kom åt tutan!', 'Stig says sorry the first time');
    // The hop: off to the side, away from the car's line, while Lasse waves.
    const seen = await watch(T, ['lasse'], 1400, 'tuta_suntrip', 1000);
    const p1 = await pedAt(T, 0), b1 = await pedAt(T, 1);
    T.log('ped ahead', JSON.stringify(p0), '->', JSON.stringify(p1), 'behind', JSON.stringify(b0), '->', JSON.stringify(b1), 'lasse', JSON.stringify(seen.lasse));
    check(p1.lat < p0.lat - 1.2, `the pedestrian ahead hops away from the car's line (lat ${p0.lat} -> ${p1.lat})`);
    check(Math.abs(b1.y - b0.y) < 0.05 && Math.hypot(b1.lat - b0.lat, b1.along - b0.along) < 0.3 && !b1.startled, 'the pedestrian behind stays put');
    check(seen.lasse.wave && seen.lasse.face < 0.5, `Lasse waves and turns to Stig (${JSON.stringify(seen.lasse)})`);
    let s = await said(T);
    T.log('said', JSON.stringify(s));
    check(has(s, 'lasse', 'Hä-pååre!') && has(s, 'stig', 'Förlåt! Jag kom åt tutan!'), 'Lasse and the sorry are said');
    check(s.some(([w, t]) => w === 'ped' && ['Akta!', 'Hallå där!', 'Herre jävlar!', '¡Cuidado!', '¡Turistas!'].includes(t)), 'the nearest pedestrian shouts a dodge shout');
    r = await st(T);
    check(r.shame === shame0 && !r.pursuit, `no SKANDAL (${shame0} -> ${r.shame})`);
    await T.sleep(400);
    check(!(await looks(T, ['lasse'])).lasse.wave, 'the wave comes down');

    // 2. Again within the cooldowns: no answer from Lasse, no second sorry. Pedestrian 1 put 8 m
    //    ahead on the near sidewalk hops (a jump: y over the sidewalk); put back there at once, he
    //    stays put on the next press (3 s each), and hops again after it.
    await resetSaid(T);
    await plantPed(T, 1, 8, 4.5);
    await T.frames(5);
    const j0 = await pedAt(T, 1);
    await T.tap('KeyH');
    r = await st(T);
    T.log('press 2', JSON.stringify(r.last));
    check(!r.last.replies.some(([k]) => k === 'lasse'), 'Lasse does not answer again within 8 s');
    check(!r.last.stig.length, 'Stig says sorry only once');
    pb = await pedAt(T, 1);
    check(pb.honked === r.last.t, `the pedestrian ahead is startled (${JSON.stringify(pb)})`);
    const t2 = r.last.t;
    let jy = j0.y;
    for (let k = 0; k < 12; k++) { await T.sleep(60); jy = Math.max(jy, (await pedAt(T, 1)).y); }
    T.log('jump', j0.y, '->', jy);
    check(jy > j0.y + 0.4, `the hop is a jump (${j0.y} -> ${jy})`);
    await T.sleep(400);
    await plantPed(T, 1, 8, 4.5, true);
    await T.frames(5);
    await T.tap('KeyH');
    r = await st(T);
    pb = await pedAt(T, 1);
    check(pb.honked === t2 && !pb.startled, `no second hop within 3 s (${JSON.stringify(pb)})`);
    await T.sleep(2600);
    await plantPed(T, 1, 8, 4.5, true);
    await T.frames(5);
    await T.tap('KeyH');
    r = await st(T);
    pb = await pedAt(T, 1);
    check(pb.honked === r.last.t && pb.startled, `after 3 s he hops again (${JSON.stringify(pb)})`);

    // 3. Pulled up on the west street by the pool garden, facing Ole: his car statistics and a wave.
    await resetSaid(T);
    await drive(T, -40 + 2.75, pos.ole.z + 5, Math.atan2(pos.ole.x + 40 - 2.75, -5));
    await T.tap('KeyH');
    r = await st(T);
    T.log('press 3', JSON.stringify(r.last));
    rep = Object.fromEntries(r.last.replies);
    check(rep.ole === 'Det er farligere å kjøre bil enn å fly.', `Ole answers with his car statistics (${JSON.stringify(r.last.replies)})`);
    check(!r.last.stig.length, 'no second sorry');
    const so = await watch(T, ['ole'], 1600, 'tuta_ole', 900);
    check(so.ole.wave && so.ole.face < 0.5, `Ole waves and turns to Stig (${JSON.stringify(so.ole)})`);
    s = await said(T);
    check(has(s, 'ole', 'Det er farligere å kjøre bil enn å fly.'), 'said');

    // 4. Berra and Robban at the bar, from the north street: "Ra-tara-tara!" both, and Stig red-faced.
    await resetSaid(T);
    const bx = (pos.berra.x + pos.robban.x) / 2;
    await drive(T, bx, 40 - 2.75, PI);
    await T.tap('KeyH');
    r = await st(T);
    T.log('press 4', JSON.stringify(r.last));
    rep = Object.fromEntries(r.last.replies);
    check(rep.berra === 'Ra-tara-tara!' && rep.robban === 'Ra-tara-tara!', `Berra and Robban whistle back (${JSON.stringify(r.last.replies)})`);
    check(r.last.stig.length === 1 && r.last.stig[0] === 'Det var inte så jag menade!', `Stig: not like that (${JSON.stringify(r.last.stig)})`);
    await T.sleep(1700);
    await T.shot('tuta_berra');
    await T.sleep(1500);
    s = await said(T);
    T.log('said', JSON.stringify(s));
    check(has(s, 'berra', 'Ra-tara-tara!') && has(s, 'stig', 'Det var inte så jag menade!'), 'said');
    check(s.findIndex(([w]) => w === 'berra') < s.findIndex(([w]) => w === 'stig'), 'Stig after Berra');

    // 5. Angerud at the Viking Bar: the platschef, an arm raised and lowered.
    await resetSaid(T);
    await drive(T, -200 + 2.75, pos.angerud.z, PI / 2);
    await T.tap('KeyH');
    r = await st(T);
    T.log('press 5', JSON.stringify(r.last));
    check(Object.fromEntries(r.last.replies).angerud === 'Jag ska tala med platschefen!', `Angerud answers (${JSON.stringify(r.last.replies)})`);
    const sa = await watch(T, ['angerud'], 1400, 'tuta_angerud', 800);
    check(sa.angerud.oath && sa.angerud.face < 0.5, `Angerud raises his arm and turns to Stig (${JSON.stringify(sa.angerud)})`);
    await T.sleep(1200);
    check(!(await looks(T, ['angerud'])).angerud.oath, 'and lowers it');

    // 6. The grisbil grunts: the bubble over its bed, Berra and Robban with their lift's lines.
    await resetSaid(T);
    await T.ev(() => { const g = __game; g.unlock('grisbil'); g.honk.answered = {}; document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    await drive(T, bx, 40 - 2.75, PI, 'grisbil');
    check(await T.ev(() => !!__game.playerCar?.spec.pigs), 'in the grisbil');
    await T.tap('KeyH');
    r = await st(T);
    T.log('press 6', JSON.stringify(r.last));
    check(r.last.pigs && r.hornAt.pigs, 'a grisbil press');
    rep = Object.fromEntries(r.last.replies);
    check(rep.berra === 'Skit i det. Vi slipper gå.' && rep.robban === 'Fan, de luktar.', `the lift's lines (${JSON.stringify(r.last.replies)})`);
    check(!r.last.stig.length, 'no tease reply to a grunt');
    await T.shot('tuta_noff');
    await T.sleep(1100);
    await T.shot('tuta_grisbil');
    s = await said(T);
    T.log('said', JSON.stringify(s));
    check(has(s, 'bed', 'NÖFF! NÖFF!'), 'the grunt bubble over the bed');
    // H held: the grunt again every 0.75 s (oinkT jumps back up to 0.75 at each one).
    await T.sleep(800);
    const grunts = [];
    await T.page.keyboard.down('KeyH');
    try {
      let prev = await T.ev(() => __game.honk.oinkT);
      const t0 = Date.now();
      while (Date.now() - t0 < 2000) {
        await T.sleep(50);
        const o = await T.ev(() => __game.honk.oinkT);
        if (o > prev + 0.3) grunts.push(+((Date.now() - t0) / 1000).toFixed(2));
        prev = o;
      }
    } finally { await T.page.keyboard.up('KeyH'); }
    T.log('grunts while held (s)', JSON.stringify(grunts));
    check(grunts.length >= 2, `the grunt repeats while H is held (${JSON.stringify(grunts)})`);
    // The next one, Robban's other lift line.
    await T.ev(() => { __game.honk.answered = {}; });
    await T.tap('KeyH');
    r = await st(T);
    check(Object.fromEntries(r.last.replies).robban === 'Snacka om grisfest.', `Robban's other line next (${JSON.stringify(r.last.replies)})`);

    // 7. A dialogue drops the answers not yet said.
    await T.sleep(2500);
    await resetSaid(T);
    await T.ev(() => { __game.honk.answered = {}; });
    await T.tap('KeyH');
    await T.ev(() => { __game.inDialog = true; });
    await T.frames(3);
    r = await st(T);
    check(r.last.replies.length && r.queue === 0 && !Object.keys(r.react).length, `a dialogue drops the queue (${r.queue})`);
    await T.sleep(1300);
    await T.ev(() => { __game.inDialog = false; });
    s = await said(T);
    check(!s.some(([w]) => w === 'berra' || w === 'robban'), `nothing said over the dialogue (${JSON.stringify(s)})`);

    // 8. In a mission the horn is only a sound: no hop, no answer, no hornAt.
    await T.startMission();
    await resetSaid(T);
    await drive(T, X, Z, PI / 2);
    await T.ev(() => { __game.honk.answered = {}; });
    await clearPeds(T, X, Z);
    await plantPed(T, 0, 10, -9);
    await T.frames(5);
    const before = await st(T), m0 = await pedAt(T, 0);
    await T.tap('KeyH');
    await T.sleep(1500);
    r = await st(T);
    const m1 = await pedAt(T, 0);
    s = await said(T);
    T.log('in a mission', JSON.stringify({ ms: r.ms, m0, m1, s }));
    check(r.ms === 'running', 'a mission runs');
    check(JSON.stringify(r.hornAt) === JSON.stringify(before.hornAt) && JSON.stringify(r.last) === JSON.stringify(before.last), 'no horn event in a mission');
    check(!m1.startled && Math.abs(m1.y - m0.y) < 0.05 && Math.abs(m1.lat - m0.lat) < 0.3, `no hop in a mission (${JSON.stringify(m0)} -> ${JSON.stringify(m1)})`);
    check(!s.some(([w]) => ['lasse', 'stig'].includes(w)), `no answers in a mission (${JSON.stringify(s)})`);
  },
};
