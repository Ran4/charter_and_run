// Lapplisan Majsan – "Ursäkta, är det din bil?" (free roam, DESIGN §10.17; feature 20).
//   lapplisa: at index 8 (free roam): the sidewalk test (layout.js sidewalkAt: the asphalt, the
//             square before La Medina and Flamenco's lot are not sidewalk); a street car left on the
//             sidewalk of block (2,2): no SKANDAL, after `delay` s Majsan comes round a corner out of
//             the camera's view, writes (anim.ticket), the slip on the windscreen, "Ursäkta, är det
//             din bil?", Stig's "Nej.", "Okej, grabbar!", the black fade, the car gone; she walks off
//             and goes home unseen; a car standing on the road at the kerb gets nothing; the hire car
//             on the sidewalk: "Den är… hyrd.", Stig in again before the tow keeps it and its slip, she
//             goes; left there again, towed home to its bay; the hire car driven into a Flamenco bay
//             straight: Majsan's praise, Siv's "Spänn av, Majsan. Du är ledig.", +50 pta and the toast
//             the first time, nothing within the 90 s, none the second time, none for a crooked car or
//             one only got into and out of; a mission start mid-walk sends her home, takes the slips
//             off and ends it all; at index 9 (Majsan an extra of ropavieja) nothing comes.
//   lappfilm: at index 7: Angerud's white hire car (locked) on the sidewalk outside Centro La Medina
//             while he stands at Viking Bar; driving past does nothing; on foot within 12 m the film's
//             first meeting plays (the dialogue's lines in order, the GRÚA truck with the car on its
//             hook, Angerud running out, the talk), then free roam again: the car and the truck gone,
//             `lappFilm` saved, Angerud's chatter the muttering, Majsan off home; the car does not come
//             back; a mission start gives Angerud his own chatter back. At index 13 (after the end,
//             Angerud in hospital) no car.
import { check } from '../lib.mjs';

const PI = Math.PI;
// Every line said through game.say since the last reset, as [speaker, text]: 'stig', an NPC key, '?'.
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || '?', text]);
      return o(t, text, secs);
    };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const lastK = (T) => T.ev(() => __game.lapp.last?.kind ?? null);
const majsan = (T) => T.ev(() => { const m = __game.npc('majsan'); return { x: +m.x.toFixed(2), z: +m.z.toFixed(2), busy: m.busy, spot: m.spot, ours: __game.lapp.owns('majsan'), ticket: !!m.anim.ticket }; });
// Stig at the wheel of `car` (a street car by id, or a named one), the car placed at (x, z, yaw),
// then out of it (exitCar puts him beside it), standing at (sx, sz) facing yaw `sy` with the camera.
async function park(T, sel, x, z, yaw, sx, sz, sy) {
  const id = await T.ev((sel, x, z, yaw) => {
    const g = __game;
    const car = typeof sel === 'string' ? g.named[sel] : sel === -1 ? g.cars.find((c) => c.traffic && !c.spec.bus && !c.spec.tall && !c.dead) : g.cars.find((c) => c.id === sel);
    if (g.playerCar !== car) { if (g.playerCar) g.exitCar(true); g.enterCar(car); }
    car.place(x, z, yaw);
    return car.id;
  }, sel, x, z, yaw);
  await T.frames(4);
  await T.ev((sx, sz, sy) => {
    const g = __game, p = g.player;
    g.exitCar(true);
    p.teleport(sx, sz, sy);
    p.vx = p.vz = 0;
    g.cam.yaw = sy; g.cam.snapNext = true;
  }, sx, sz, sy);
  await T.frames(4);
  return id;
}
const carInfo = (T, id) => T.ev((id) => {
  const g = __game, c = g.cars.find((o) => o.id === id);
  return c ? { in: true, x: +c.x.toFixed(2), z: +c.z.toFixed(2), yaw: +c.yaw.toFixed(3), slip: !!c.lappSlip, wheels: g.lapp.wheelsOn(c).n } : { in: false };
}, id);
// A still camera for the shots (the chase eye sits in his head under this block's balconies), and back.
const look = (T, fx, fy, fz, tx, ty, tz) => T.ev((a) => __game.cam.cutTo({ x: a[0], y: a[1], z: a[2] }, { x: a[3], y: a[4], z: a[5] }), [fx, fy, fz, tx, ty, tz]);
const unlook = (T) => T.ev(() => { const g = __game; g.cam.release(); g.cam.snapNext = true; });
// Fade: the frame sees the black fade on at some point within `ms`.
const sawFade = (T, ms) => T.until(() => document.getElementById('fade').classList.contains('on'), ms).then(() => true, () => false);

export const SCENARIOS = {
  async lapplisa(T) {
    await T.fresh('&mission=8');
    await T.frames(20);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island' && __game.lapp.free('majsan')), 'free roam, Majsan free');
    const cfg = await T.ev(() => { const c = __game.lapp.cfg; return { delay: c.delay, ask: c.ask, no: c.no, noHyrbil: c.noHyrbil, tow: c.tow, praise: c.praise, reply: c.praiseReply, pay: c.praisePay, every: c.praiseEvery }; });

    // 0. What is sidewalk.
    const sideTest = await T.ev(async () => {
      const m = await import('/src/world/layout.js');
      const f = (x, z) => !!m.sidewalkAt(x, z);
      return { road: f(-80, -42), walk: f(-80, -47.4), kerbIn: f(-80, -48.9), lot: f(-26, 22), square: f(-160, -55), outer: f(100, 287), stub: f(-287, -40), sand: f(100, 295) };
    });
    T.log('sidewalk', JSON.stringify(sideTest));
    check(!sideTest.road && sideTest.walk && sideTest.kerbIn && !sideTest.lot && !sideTest.square && sideTest.outer && !sideTest.stub && !sideTest.sand, 'sidewalkAt: the band beside the roads only');

    // 1. A street car on block (2,2)'s south sidewalk, Stig beside it looking at it.
    await resetSaid(T);
    await T.ev(() => __game.shame.clear());
    const id1 = await park(T, -1, -100, -47.4, PI / 2, -94, -46.6, PI / 2 - 0.15);
    let ci = await carInfo(T, id1);
    T.log('car 1', JSON.stringify(ci));
    check(ci.wheels === 4, 'all four wheels on the sidewalk');
    const v0 = await T.ev(() => __game.shame.v);
    const t0 = await T.ev(() => __game.time);
    await T.until(() => __game.lapp.last?.kind === 'come', 30000);
    const come = await T.ev(() => ({ ...__game.lapp.last, now: __game.time, p: { x: __game.player.x, z: __game.player.z } }));
    T.log('come', JSON.stringify(come));
    check(come.t - t0 >= cfg.delay - 0.2, `she comes after the ${cfg.delay} s (${(come.t - t0).toFixed(2)})`);
    check(Math.hypot(come.spawn.x - come.p.x, come.spawn.z - come.p.z) >= 12, 'she appears at least 12 m from Stig');
    check(come.path === 3, `round a corner: the corner, the car's end, beside it (${come.path} legs)`);
    await look(T, -96.5, 2.6, -39.5, -104, 1.0, -48.5);
    await T.sleep(3200);
    await T.shot('lapp_come');
    await T.until(() => __game.lapp.gag?.phase === 'write', 40000);
    check((await majsan(T)).ticket, 'she writes on her pad');
    await T.sleep(600);
    await T.shot('lapp_write');
    await T.until(() => __game.lapp.last?.kind === 'ticket', 10000);
    ci = await carInfo(T, id1);
    check(ci.slip, 'the slip on the windscreen');
    await T.sleep(400);
    await T.shot('lapp_ask');
    await T.until(() => __game.lapp.gag?.phase === 'tow', 15000);
    await T.sleep(250);
    await T.shot('lapp_okej');
    const faded = await sawFade(T, 4000);
    await T.until(() => __game.lapp.last?.kind === 'tow', 8000);
    let s = await said(T);
    T.log('said 1', JSON.stringify(s));
    const order = [['majsan', cfg.ask], ['stig', cfg.no], ['majsan', cfg.tow]].map(([w, t]) => s.findIndex(([a, b]) => a === w && b === t));
    check(order.every((k, i) => k >= 0 && (i === 0 || k > order[i - 1])), `ask, "Nej.", "Okej, grabbar!" in order (${order})`);
    check(faded, 'the black fade');
    ci = await carInfo(T, id1);
    check(!ci.in, 'the street car is gone');
    check((await T.ev(() => __game.shame.v)) <= v0 + 0.01, 'no SKANDAL for any of it (the carjacking\'s only sinks)');
    await T.until(() => !document.getElementById('fade').classList.contains('on') && !__game.inDialog, 5000);
    await T.sleep(800);
    await T.shot('lapp_gone');
    await unlook(T);
    // She walks off and is home once nobody sees her.
    await T.ev(() => { const g = __game; g.player.yaw = Math.PI / 2; g.cam.yaw = Math.PI / 2; });   // away from her corner (west)
    await T.until(() => !__game.lapp.owns('majsan'), 40000);
    const home = await T.ev(() => { const g = __game, m = g.npc('majsan'), q = g.lmOffset('flamencoPool', -2, 0); return { d: Math.hypot(m.x - q.x, m.z - q.z), busy: m.busy }; });
    T.log('home', JSON.stringify(home));
    check(home.d < 1 && !home.busy, 'Majsan home at the pool, free again');

    // 2. A car on the road at the kerb (no wheel on the sidewalk) gets nothing.
    await resetSaid(T);
    const id2 = await park(T, -1, -100, -43.2, PI / 2, -94, -46.6, PI / 2);
    ci = await carInfo(T, id2);
    check(ci.wheels === 0, 'on the road');
    await T.sleep(9000);
    check((await lastK(T)) === 'tow' && !(await T.ev(() => __game.lapp.gag)), 'nothing comes for a car on the road');

    // 3. Two wheels up on the kerb: that counts. And the hire car's answer; Stig in again keeps it.
    await resetSaid(T);
    const hy = await T.ev(() => { const c = __game.named.hyrbil; return { id: c.id, home: c.home }; });
    await park(T, 'hyrbil', -100, -45.2, PI / 2, -94, -46.6, PI / 2);
    ci = await carInfo(T, hy.id);
    T.log('hyrbil', JSON.stringify(ci));
    check(ci.wheels === 2, 'two wheels on the kerb');
    await T.until(() => __game.lapp.last?.kind === 'ticket', 45000);
    await T.until(() => __game.lapp.gag?.phase === 'asked', 5000);
    await look(T, -96.5, 2.6, -39.5, -101, 1.0, -47.5);
    await T.sleep(1600);
    s = await said(T);
    check(s.some(([w, t]) => w === 'stig' && t === cfg.noHyrbil) && !s.some(([w, t]) => w === 'stig' && t === cfg.no), `the hire car: "${cfg.noHyrbil}"`);
    await T.shot('lapp_hyrd');
    await unlook(T);
    await T.ev(() => { const g = __game; g.enterCar(g.named.hyrbil); });
    await T.frames(10);
    const drove = await T.ev(() => ({ last: __game.lapp.last, gag: !!__game.lapp.gag }));
    T.log('drove', JSON.stringify(drove));
    check(drove.last.kind === 'drove' && !drove.gag, 'in again before the tow: no tow');
    await T.ev(() => { const c = __game.named.hyrbil; c.place(c.x + 20, c.z + 4.5, c.yaw); });   // off the kerb, onto the road
    await T.sleep(5000);
    ci = await carInfo(T, hy.id);
    check(ci.in && ci.slip, 'the hire car his, with the slip still on it');
    await T.ev(() => { const g = __game, c = g.playerCar, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); g.cam.cutTo({ x: c.x + fx * 5 + fz * 1.5, y: 1.9, z: c.z + fz * 5 - fx * 1.5 }, { x: c.x + fx * 0.6, y: 1.2, z: c.z + fz * 0.6 }); });
    await T.frames(5);
    await T.shot('lapp_slip');
    await unlook(T);

    // 4. Left on the sidewalk again: towed home to its bay.
    await T.until(() => !__game.lapp.owns('majsan'), 40000);
    await park(T, 'hyrbil', -100, -47.4, PI / 2, -94, -46.6, PI / 2);
    await T.until(() => __game.lapp.last?.kind === 'tow', 60000);
    const tw = await T.ev(() => { const c = __game.named.hyrbil, h = c.home; return { last: __game.lapp.last, d: Math.hypot(c.x - h.x, c.z - h.z), yaw: c.yaw, hy: h.yaw, slip: !!c.lappSlip, in: __game.cars.includes(c) }; });
    T.log('tow home', JSON.stringify(tw));
    check(tw.in && tw.last.home && tw.d < 0.3 && Math.abs(Math.sin(tw.yaw - tw.hy)) < 0.01 && !tw.slip, 'the hire car back in its bay, slip off');

    // 5. Flamenco's bays: the hire car driven in straight, a car got into and out of, a crooked car.
    await T.until(() => !__game.lapp.owns('majsan') && !__game.inDialog, 40000);
    await T.ev(() => { const g = __game, m = g.npc('majsan'); if (m.busy === false) { const q = g.lmOffset('flamencoPool', -2, 0); m.teleport(q.x, q.z, m.yaw); } });
    const bays = await T.ev(async () => (await import('/src/world/blocks/hotels.js')).flamencoBays.map((b) => ({ ...b })));
    T.log('bays', JSON.stringify(bays));
    check(bays.length === 8, 'eight painted bays');
    const hb = bays.find((b) => Math.hypot(b.x - hy.home.x, b.z - hy.home.z) < 0.5);
    check(!!hb, 'the hire car\'s home is a bay');
    // Got into and out of where it stands: no praise.
    await resetSaid(T);
    await T.ev(() => { const g = __game; g.enterCar(g.named.hyrbil); });
    await T.frames(5);
    await T.ev(() => __game.exitCar(true));
    await T.sleep(3000);
    s = await said(T);
    check(!s.some(([w, t]) => t === cfg.praise), 'no praise for a car that has not moved');
    // Driven in from the lot's aisle (8 m out) and left: Stig beside it, the camera to the pool.
    const bayPark = async (yawOff) => {
      await resetSaid(T);
      await T.ev((x, z) => { const g = __game, c = g.named.hyrbil; if (g.playerCar !== c) g.enterCar(c); c.place(x, z, Math.PI); }, hb.x, hb.z - 8);
      await T.frames(4);
      await T.ev((x, z, y) => __game.named.hyrbil.place(x, z, y), hb.x, hb.z, hb.yaw + yawOff);
      await T.frames(4);
      await T.ev((x, z) => { const g = __game; g.exitCar(true); g.player.teleport(x, z, Math.PI / 2); g.cam.yaw = Math.PI / 2 + 0.35; g.cam.snapNext = true; }, hb.x + 2.6, hb.z - 3.2);
    };
    const coins0 = await T.ev(() => __game.coins);
    await bayPark(PI + 0.05);
    await T.until(() => __game.lapp.last?.kind === 'praise', 6000);
    check(await T.ev(() => [...document.querySelectorAll('#toasts .toast')].some((e) => /Snyggt parkerat/.test(e.textContent))), 'the toast');
    await T.sleep(800);
    await T.shot('lapp_praise');
    await T.sleep(2600);
    s = await said(T);
    const pr = await T.ev(() => __game.lapp.last);
    T.log('praise', JSON.stringify(s), JSON.stringify(pr));
    check(s.some(([w, t]) => w === 'majsan' && t === cfg.praise), 'Majsan: "Där ser man…"');
    check(s.some(([w, t]) => w === 'siv' && t === cfg.reply), 'Siv: "Spänn av, Majsan. Du är ledig."');
    const coins1 = await T.ev(() => __game.coins);
    check(pr.pay === cfg.pay && coins1 - coins0 >= cfg.pay, `+${cfg.pay} pta the first time (${coins1 - coins0})`);
    await T.shot('lapp_praise_reply');
    // Again at once: nothing within the 90 s.
    await bayPark(0);
    await T.sleep(2500);
    s = await said(T);
    check(!s.some(([w, t]) => t === cfg.praise), `no praise within ${cfg.every} s`);
    // With the clock past it: a crooked car (0.5 rad) nothing, a straight one (nose in) the praise, no pay.
    await T.ev(() => { __game.lapp.praiseT = -Infinity; });
    await bayPark(0.5);
    await T.sleep(2500);
    s = await said(T);
    check(!s.some(([w, t]) => t === cfg.praise), 'no praise for a crooked car');
    const coins2 = await T.ev(() => __game.coins), tp = await T.ev(() => __game.lapp.last.t);
    await bayPark(0);
    await T.until((tp) => __game.lapp.last?.kind === 'praise' && __game.lapp.last.t > tp, 6000, tp);
    check((await T.ev(() => __game.lapp.last.pay)) === 0 && (await T.ev(() => __game.coins)) - coins2 < cfg.pay, 'the praise again (nose in), no second pay');
    await T.ev((x, z) => { const g = __game; g.player.teleport(x, z, 0); }, -94, -46.6);

    // 6. A mission start mid-walk: Majsan home, the slips off, nothing left.
    const id6 = await park(T, -1, -100, -47.4, PI / 2, -94, -46.6, PI / 2);
    await T.until(() => __game.lapp.last?.kind === 'ticket', 45000);
    check((await carInfo(T, id6)).slip, 'a slip on it');
    await T.startMission();
    await T.frames(10);
    const end = await T.ev((id) => {
      const g = __game, l = g.lapp, c = g.cars.find((o) => o.id === id), m = g.npc('majsan');
      return { state: g.missions.state, ours: Object.keys(l.out), gag: !!l.gag, slip: !!c?.lappSlip, tickets: l.tickets.size, mspot: m.spot, held: !!l.held };
    }, id6);
    T.log('mission start', JSON.stringify(end));
    check(end.state !== 'idle' && !end.ours.length && !end.gag && !end.slip && !end.tickets && end.mspot !== 'lapplisa' && !end.held, 'a mission start ends it all');

    // 7. At index 9 Majsan is ropavieja's extra: nothing comes.
    await T.fresh('&mission=9');
    await T.frames(20);
    await resetSaid(T);
    await park(T, -1, -100, -47.4, PI / 2, -94, -46.6, PI / 2);
    await T.sleep(14000);
    check(!(await T.ev(() => __game.lapp.last)) && !(await T.ev(() => __game.lapp.owns('majsan'))), 'not while she is the waiting mission\'s');
  },

  async lappfilm(T) {
    await T.fresh('&mission=7');
    await T.frames(20);
    const st = await T.ev(() => {
      const g = __game, l = g.lapp, L = __lm('angerudBil'), c = l.aCar;
      return { aIn: l.aIn, inCars: g.cars.includes(c), locked: c?.locked, d: c && Math.hypot(c.x - L.x, c.z - L.z), wheels: c && l.wheelsOn(c).n, home: l.angerudHome() };
    });
    T.log('angerud car', JSON.stringify(st));
    check(st.aIn && st.inCars && st.locked && st.d < 0.3 && st.wheels === 4 && st.home, 'Angerud\'s hire car on the sidewalk, locked, while he is at Viking Bar');
    const L = await T.L('angerudBil');
    // Driving past: nothing.
    await T.ev((x, z) => { const g = __game, c = g.cars.find((o) => o.traffic && !o.spec.bus && !o.spec.tall); g.enterCar(c); c.place(x, z, -Math.PI / 2); }, L.x + 2, L.z + 5);
    await T.sleep(2500);
    check(!(await T.ev(() => __game.lapp.scene)), 'not from a car');
    // Out of it 30 m off, in one step (on foot within 12 m the scene would start).
    await T.ev((x, z) => { const g = __game, c = g.playerCar; g.exitCar(true); c.place(c.x + 40, c.z, c.yaw); g.player.teleport(x, z, -Math.PI / 2); g.cam.yaw = -Math.PI / 2; g.cam.snapNext = true; }, L.x + 30, L.z);
    await T.frames(5);
    // Record the dialogue, typed slowly enough to catch each line in a shot.
    await T.ev(() => {
      const g = __game;
      g.dialogSpeed = 30;
      window.__dlg = [];
      const o = g.dialog.bind(g);
      g.dialog = (lines) => { for (const [w, t] of lines) window.__dlg.push([w, t]); return o(lines); };
    });
    await T.shot('lapp_film_before');
    // On foot past it.
    await T.ev((x, z) => { const g = __game; g.player.teleport(x, z, -Math.PI / 2); }, L.x + 9, L.z - 0.3);
    await T.until(() => __game.lapp.scene, 5000);
    const shotAt = async (re, name) => {
      const ok = await T.until((src) => new RegExp(src).test(document.querySelector('#dialog .dlg-text')?.textContent || '') && document.getElementById('dialog').classList.contains('show'), 30000, re).then(() => true, () => false);
      if (ok) { await T.sleep(120); await T.shot(name); }
      return ok;
    };
    check(await shotAt('din bil', 'lapp_film_ask'), 'the question in the dialogue');
    await shotAt('^Nej', 'lapp_film_nej');
    await shotAt('grabbar', 'lapp_film_okej');
    check(await shotAt('helvete', 'lapp_film_helvete'), 'Angerud runs out');
    const tow = await T.ev(() => { const g = __game, l = g.lapp; return { truck: g.cars.includes(l.truck), lift: l.aCar.lift, carIn: g.cars.includes(l.aCar), ang: l.owns('angerud') }; });
    T.log('tableau', JSON.stringify(tow));
    check(tow.truck && tow.lift > 0.1 && tow.carIn && tow.ang, 'the GRÚA truck with his car on the hook');
    const angPos = () => T.ev(() => { const a = __game.npc('angerud'), o = __game.lapp.out.angerud; return { x: +a.x.toFixed(2), z: +a.z.toFixed(2), st: a.state, arrived: o?.arrived, wish: [+a.wishX.toFixed(2), +a.wishZ.toFixed(2)] }; });
    T.log('angerud at helvete', JSON.stringify(await angPos()));
    await shotAt('Hederliga', 'lapp_film_hederliga');
    await shotAt('förmyndar', 'lapp_film_formyndar');
    T.log('angerud at förmyndar', JSON.stringify(await angPos()));
    check(await shotAt('jobbigt', 'lapp_film_jobbigt'), 'Stig asks her');
    await shotAt('mitt jobb', 'lapp_film_jobb');
    await T.until(() => !__game.lapp.scene && !__game.inDialog, 20000);
    await T.sleep(500);
    await T.shot('lapp_film_after');
    const after = await T.ev(() => {
      const g = __game, l = g.lapp;
      return { dlg: window.__dlg, aIn: l.aIn, carIn: g.cars.includes(l.aCar), truck: g.cars.includes(l.truck), saved: g.unlocked.has('lappFilm'), mutter: g.chatterOverrides.angerud, ang: { busy: g.npc('angerud').busy, home: l.angerudHome() }, letterbox: document.getElementById('letterbox').classList.contains('on') };
    });
    T.log('after', JSON.stringify(after));
    const want = [['majsan', 'Ursäkta, är det din bil?'], ['stig', 'Nej.'], ['majsan', 'Okej, grabbar!'], ['angerud', 'Vad i helvete tar ni er till?'],
      ['angerud', 'Hederliga bilister ger ni er på, men få hyfs på ungdomen klarar ni inte!'], ['angerud', 'Förbannade förmyndarmentalitet!'],
      ['stig', 'Är det inte jobbigt när alla skäller?'], ['majsan', 'Jo, jag gör ju bara mitt jobb.']];
    check(JSON.stringify(after.dlg) === JSON.stringify(want), 'the film\'s lines in order');
    check(!after.aIn && !after.carIn && !after.truck && after.saved && !after.letterbox, 'the car and the truck gone, the scene saved, free roam again');
    check(Array.isArray(after.mutter) && after.mutter.some((t) => /Hederliga bilister/.test(t)), 'Angerud mutters about honest motorists');
    check(!after.ang.busy && after.ang.home, 'Angerud back at his bar');
    // Stig can walk again.
    const p0 = await T.ev(() => ({ x: __game.player.x, z: __game.player.z }));
    await T.hold(['KeyW'], 600);
    const p1 = await T.ev(() => ({ x: __game.player.x, z: __game.player.z }));
    check(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 1, 'Stig walks again');
    // Majsan goes home out of sight; the car does not come back.
    await T.ev(() => { const g = __game; g.cam.yaw = g.player.yaw; });
    await T.until(() => !__game.lapp.owns('majsan'), 40000);
    await T.ev((x, z) => { const g = __game; g.player.teleport(x, z, Math.PI / 2); g.cam.yaw = Math.PI / 2; g.cam.snapNext = true; }, L.x - 60, L.z);
    await T.sleep(3000);
    await T.ev((x, z) => { const g = __game; g.player.teleport(x, z, -Math.PI / 2); }, L.x + 8, L.z);
    await T.sleep(2000);
    check(!(await T.ev(() => __game.lapp.aIn || __game.lapp.scene)), 'once: no car, no scene again');
    // A mission start: his own chatter again.
    await T.startMission();
    await T.frames(10);
    check(await T.ev(() => __game.missions.state !== 'idle' && __game.chatterOverrides.angerud === undefined && !__game.lapp.held), 'a mission start ends the muttering');

    // Before the scene, a mission start takes the car away; after the end Angerud is gone and so is it.
    await T.fresh('&mission=8');
    await T.frames(20);
    check(await T.ev(() => __game.lapp.aIn), 'the car between missions (index 8)');
    await T.startMission();
    await T.frames(10);
    check(await T.ev(() => !__game.lapp.aIn && !__game.cars.includes(__game.lapp.aCar)), 'a mission start takes the car away');
    // After the end (julafton's `bodega` unlock: Angerud in hospital, his home null): no car.
    await T.fresh('&mission=13');
    await T.ev(() => __game.unlock('bodega'));
    await T.frames(60);
    await T.ev(() => { const g = __game; g.cam.yaw += Math.PI; });
    await T.frames(20);
    check(await T.ev(() => !__game.lapp.aIn && __game.npc('angerud').state === 'hidden'), 'after the end: no Angerud, no car');
  },
};
