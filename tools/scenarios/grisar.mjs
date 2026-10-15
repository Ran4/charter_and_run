// Grisarna ramlar av grisbilen – the grisbil's pigs tumble off (free roam, DESIGN §10.15; feature 15).
//   grisar: at index 9 (free roam) in the unlocked grisbil: three pigs in the bed and the objective
//           to take them home; normal driving (full throttle, a gentle weave, corners at 10–22 m/s
//           off the throttle) drops none; a full stop from top speed tips the back right one over
//           the side ("skid"): Stig's "Oj! Grisen!", it lands, lies, shakes itself with "NÖFF!" and
//           trots off; no SKANDAL; the objective, the guide and a minimap marker follow it; a
//           standing grisbil does not take it, rolling the bed up to it slowly does (it hops in); a
//           car coming at a loose pig makes it skip aside, never under the car; on foot it trots
//           away slower than his walk, he lifts it over his head ("Förlåt, lilla gris. Upp med
//           dig.", walking only), R drops it, at the bed it hops in and his hands are free; on the
//           SunTrip street Stig asks Lasse to take it and Lasse refuses, once a minute; a drop from
//           2 m ("land") and a wall at 12 m/s ("crash") tip one each, two jolts inside the gap one,
//           weaker ones none; the way from the farm's gravel drive to the pen is clear; with a pig
//           missing the grisbonde says so; with all three, stopped by the pen: over the fence, his
//           thanks, 100 pta and Stig's "Jag har lite anlag för åksjuka." (pigs fell on the way), the
//           three stay in the pen, no second delivery from an empty bed; the bed fills at Flamenco
//           once Stig is 30 m off; a clean trip pays 250 and no sigh; a mission start puts a loose
//           pig back and empties the pen, and no jolt tips one in a mission.
import { check } from '../lib.mjs';

const PI = Math.PI;
// The unlocked grisbil at (x, z) facing yaw, Stig at the wheel, the camera behind it (turned `cam`).
async function inTruck(T, x, z, yaw, cam = 0) {
  await T.ev((x, z, yaw, cam) => {
    const g = __game, p = g.player;
    if (!g.named.grisbil) g.unlock('grisbil');
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const car = g.named.grisbil;
    if (g.playerCar && g.playerCar !== car) g.exitCar(true);
    if (!g.playerCar) { p.state = 'normal'; car.place(x, z, yaw); g.enterCar(car); }
    car.place(x, z, yaw);
    car.vx = car.vz = car.vy = car.w = 0;
    g.cam.yaw = yaw + Math.PI + cam; g.cam.snapNext = true;
  }, x, z, yaw, cam);
  await T.frames(8);
}
// Stig on foot at (x, z) facing yaw, the camera turned `cam` off his back.
async function onFoot(T, x, z, yaw, cam = 0) {
  await T.ev((x, z, yaw, cam) => {
    const g = __game, p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.teleport(x, z, yaw);
    p.vx = p.vz = 0;
    g.cam.yaw = yaw + cam; g.cam.snapNext = true;
  }, x, z, yaw, cam);
  await T.frames(6);
}
// No traffic within r m of (x, z) (the recycler respawns them 120 m from the player).
const clearTraffic = (T, x, z, r = 140) => T.ev((x, z, r) => {
  const g = __game;
  for (const c of g.cars.slice()) if (c.traffic && Math.hypot(c.x - x, c.z - z) < r) g.removeCar(c);
}, x, z, r);
const pigState = (T) => T.ev(() => {
  const g = __game, car = g.named.grisbil, s = g.pigs;
  return {
    bed: car ? car.pigs.map((p) => p.in) : null,
    shown: car ? car.pigs.map((p) => p.mesh.visible) : null,
    loose: s.loose.map((p) => ({ mode: p.mode, slot: p.slot, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) })),
    pen: s.pen.map((p) => ({ mode: p.mode, x: +p.x.toFixed(2), z: +p.z.toFixed(2) })),
    falls: s.falls, last: s.last, delivered: s.delivered, carry: !!s.carry, paid: s.paid,
  };
});
// A known start: the bed full, no loose pigs, the gap over, nothing said, no SKANDAL.
const fresh = (T) => T.ev(() => {
  const g = __game, s = g.pigs;
  s.fill(g.named.grisbil);
  for (const pig of s.pen) pig.remove();
  s.pen = []; s.queue.length = 0; s.gapT = 0; s.skidT = 0; s.busy = false; s.face = null;
  g.unsay(g.player);
  g.shame.clear();
});
// Every line said through game.say since the last reset, as [speaker, text]: 'stig', an NPC key,
// 'pig' for a pig, '?' for anything else.
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || (g.pigs.loose.includes(t) || g.pigs.pen.includes(t) ? 'pig' : '?'), text]);
      return o(t, text, secs);
    };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
// Hold the player's car at `v` m/s along its heading (a frame hook; off with steady(T, null)).
const steady = (T, v) => T.ev((v) => {
  const g = __game;
  if (window.__steady) g.offFrame(window.__steady);
  window.__steady = null;
  if (v == null) return;
  window.__steady = () => { const c = g.playerCar; if (!c) return; c.vx = Math.sin(c.yaw) * v; c.vz = Math.cos(c.yaw) * v; c.w = 0; };
  g.onFrame(window.__steady);
}, v);
// Pin loose pig i (a long pause), at (x, z) if given.
const pinPig = (T, i, x, z) => T.ev((i, x, z) => {
  const pig = __game.pigs.loose[i];
  if (x != null) { pig.x = x; pig.z = z; pig.y = pig.ground(); pig.home = { x, z }; }
  pig.mode = 'roam'; pig.t = 30; pig.speed = 0; pig.roll = 0; pig.vx = pig.vz = pig.vy = 0;
}, i, x, z);
const tip = (T, why = 'test') => T.ev((why) => { const g = __game; g.pigs.gapT = 0; return g.pigs.tip(g.named.grisbil, why); }, why);

export const SCENARIOS = {
  async grisar(T) {
    await T.fresh('&mission=9');
    await resetSaid(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');
    const cfg = await T.ev(() => { const c = __game.pigs.cfg; return { fall: c.fall, oink: c.oink, pickup: c.pickup, ask: c.ask, refuse: c.refuse, thanks: c.thanks, missing: c.missing, sick: c.sick, pay: c.pay, cleanPay: c.cleanPay, looseText: c.looseText, carryText: c.carryText, homeText: c.homeText }; });
    const lx = -40 - 2.75;   // the x = -40 road's northbound lane
    await clearTraffic(T, lx, -60, 200);

    // 0. Three pigs in the bed, their own meshes; the objective to take them home.
    await inTruck(T, lx, -190, 0);
    let s = await pigState(T);
    T.log('start', JSON.stringify(s));
    check(s.bed.every(Boolean) && s.shown.every(Boolean) && !s.loose.length, 'three pigs in the bed');
    check((await T.ev(() => __game.pigs.objective()?.text)) === cfg.homeText, 'the objective: drive them home');
    const zone = await T.L('grisfalla');
    const tg = await T.ev(() => __game.pigs.target());
    check(tg && Math.hypot(tg.x - zone.x, tg.z - zone.z) < 0.1 && tg.r === 6, `the target is the pen's zone (${JSON.stringify(tg)})`);

    // 1. Normal driving drops none: full throttle, a gentle weave, corners off the throttle.
    await T.hold(['KeyW'], 3000);
    await T.page.keyboard.down('KeyW');
    await T.hold(['KeyA'], 300);
    await T.sleep(250);
    await T.hold(['KeyD'], 300);
    await T.page.keyboard.up('KeyW');
    for (const v of [10, 16, 22]) {
      await T.ev((v) => { const c = __game.playerCar; c.place(-42.75, -140, 0); c.vz = v; c.vx = 0; }, v);
      await T.frames(2);
      await T.hold(['KeyD'], 1100);
    }
    s = await pigState(T);
    check(s.falls === 0 && s.bed.every(Boolean), `no pig falls in normal driving (${JSON.stringify(s)})`);

    // 2. A full stop from top speed: the back right pig over the side.
    await fresh(T);
    await inTruck(T, lx, -190, 0, 0.5);
    await resetSaid(T);
    await T.hold(['KeyW'], 3600);
    const v0 = await T.ev(() => __game.playerCar.speed);
    await T.page.keyboard.down('KeyS');
    await T.until(() => __game.pigs.loose.length > 0, 3000).catch(() => {});
    await T.sleep(120);
    await T.shot('grisar_tvarnit');
    await T.page.keyboard.up('KeyS');
    s = await pigState(T);
    T.log('tvarnit from', v0.toFixed(1), JSON.stringify(s));
    check(s.loose.length === 1 && s.loose[0].slot === 1 && s.last.why === 'skid', 'a full stop tips the back right pig');
    check(JSON.stringify(s.bed) === '[true,false,true]' && JSON.stringify(s.shown) === '[true,false,true]', 'its place in the bed is empty');
    await T.until(() => __game.pigs.loose[0]?.mode === 'shake', 4000);
    await T.shot('grisar_noff');
    await T.until(() => ['trot', 'roam'].includes(__game.pigs.loose[0]?.mode), 4000);
    let sd = await said(T);
    T.log('said', JSON.stringify(sd));
    check(sd.some(([w, t]) => w === 'stig' && t === cfg.fall), `Stig: "${cfg.fall}"`);
    check(sd.some(([w, t]) => w === 'pig' && t === cfg.oink), `the pig: "${cfg.oink}"`);
    check((await T.ev(() => __game.shame.v)) === 0, 'no SKANDAL');
    check((await T.ev(() => __game.pigs.objective()?.text)) === cfg.looseText, 'the objective: catch it');
    check(await T.ev(() => { const t = __game.pigs.target(), p = __game.pigs.loose[0]; return !!t && t.follow && Math.hypot(t.x - p.x, t.z - p.z) < 0.01; }), 'the guide follows the pig');
    check((await T.ev(() => __game.pigs.markers().length)) === 1, 'a minimap marker on it');

    // 3. A standing grisbil does not take it; rolling the bed up to it slowly does.
    const truck = await T.ev(() => { const c = __game.playerCar; c.place(c.x, c.z, 0); return { x: c.x, z: c.z }; });
    await pinPig(T, 0, truck.x + 1.7, truck.z - 1.4);   // beside the bed, on the left
    await T.sleep(800);
    check((await pigState(T)).loose.length === 1, 'a standing grisbil does not take it');
    await pinPig(T, 0, truck.x + 1.7, truck.z + 6);
    await steady(T, 2.2);
    await T.until(() => __game.pigs.loose[0]?.mode === 'hop', 6000);
    await T.sleep(150);
    await T.shot('grisar_krypkor');
    await T.until(() => !__game.pigs.loose.length, 3000);
    await steady(T, null);
    s = await pigState(T);
    check(s.bed.every(Boolean) && s.shown.every(Boolean), `it hopped back into the bed (${JSON.stringify(s)})`);

    // 4. A car coming at a loose pig: it skips aside, never under the car.
    await T.ev(() => { const c = __game.playerCar; c.place(-42.75, -100, 0); });
    await T.frames(3);
    check(await tip(T), 'a pig off (by hand)');
    await T.until(() => ['trot', 'roam'].includes(__game.pigs.loose[0]?.mode), 5000);
    const tz = await T.ev(() => __game.playerCar.z);
    await pinPig(T, 0, -42.75 + 0.3, tz + 20);
    await T.ev(() => {
      const g = __game;
      window.__skip = { skipped: false, under: 0 };
      window.__skipHook = () => {
        const pig = g.pigs.loose[0], c = g.playerCar;
        if (!pig || !c) return;
        if (pig.mode === 'skip') window.__skip.skipped = true;
        const dx = pig.x - c.x, dz = pig.z - c.z, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
        if (Math.abs(dx * fx + dz * fz) < c.spec.len / 2 - 0.2 && Math.abs(dx * -fz + dz * fx) < c.spec.wid / 2 - 0.2 && pig.y < c.y + 1) window.__skip.under++;
      };
      g.onFrame(window.__skipHook);
    });
    await steady(T, 12);
    await T.sleep(2600);
    await steady(T, null);
    await T.ev(() => { __game.offFrame(window.__skipHook); const c = __game.playerCar; c.vx = c.vz = 0; });
    const sk = await T.ev(() => window.__skip);
    T.log('skip', JSON.stringify(sk), JSON.stringify(await pigState(T)));
    check(sk.skipped && sk.under === 0, 'it skips aside and is never under the car');

    // 5. On foot: it trots away from him, slower than his walk; he lifts it over his head.
    await T.until(() => ['trot', 'roam'].includes(__game.pigs.loose[0]?.mode), 4000);
    await resetSaid(T);
    const pz = await T.ev(() => { const p = __game.pigs.loose[0]; return { x: p.x, z: p.z }; });
    await onFoot(T, pz.x - 4, pz.z, PI / 2);
    await pinPig(T, 0, pz.x, pz.z);
    await T.ev(() => { __game.pigs.loose[0].t = 0; });
    await T.page.keyboard.down('KeyW');
    await T.until(() => __game.pigs.loose[0]?.mode === 'trot' || __game.pigs.carry, 3000);
    await T.until(() => __game.pigs.carry, 8000);
    await T.page.keyboard.up('KeyW');
    await T.sleep(300);
    await T.ev(() => { const g = __game; g.cam.yaw = g.player.yaw + 2.4; g.cam.snapNext = true; });
    await T.sleep(200);
    await T.shot('grisar_bar');
    s = await pigState(T);
    const carry = await T.ev(() => { const g = __game; return { carrying: g.carrying?.who, cap: g.speedCap, pose: g.player.anim.carryOver, walk: g.levelDef.speeds.walk }; });
    sd = await said(T);
    T.log('carry', JSON.stringify(carry), JSON.stringify(sd));
    check(s.carry && s.loose[0].mode === 'carried' && carry.carrying === 'gris' && carry.pose && carry.cap === carry.walk, 'over his head, walking only');
    check(sd.some(([w, t]) => w === 'stig' && t === cfg.pickup[0]), `Stig: "${cfg.pickup[0]}"`);
    check((await T.ev(() => __game.pigs.objective()?.text)) === cfg.carryText, 'the objective: carry it to the bed');
    // R drops it; he lifts it again.
    await T.tap('KeyR');
    await T.frames(2);
    check(['fly', 'down'].includes((await pigState(T)).loose[0]?.mode) && !(await T.ev(() => __game.carrying)), 'R drops it');
    await T.until(() => ['trot', 'roam', 'down', 'shake'].includes(__game.pigs.loose[0]?.mode), 4000);
    await T.ev(() => { const g = __game, pig = g.pigs.loose[0], p = g.player; p.teleport(pig.x - 0.6, pig.z, Math.PI / 2); });
    await T.until(() => __game.pigs.carry, 3000);
    // To the bed: it hops in when he reaches it.
    const bed = await T.ev(() => { const c = __game.named.grisbil, b = __game.pigs.bed(c); return { x: b.x, z: b.z }; });
    await onFoot(T, bed.x + 6, bed.z, -PI / 2);
    check(await T.ev(() => !!__game.pigs.carry), 'still carrying after the warp');
    await T.page.keyboard.down('KeyW');
    await T.until(() => !__game.pigs.carry, 6000);
    await T.page.keyboard.up('KeyW');
    await T.sleep(100);
    await T.shot('grisar_tillbaka');
    await T.until(() => !__game.pigs.loose.length, 3000);
    s = await pigState(T);
    const after = await T.ev(() => ({ carrying: __game.carrying, cap: __game.speedCap, pose: __game.player.anim.carryOver }));
    check(s.bed.every(Boolean) && !after.carrying && after.cap == null && !after.pose, `back in the bed, his hands free (${JSON.stringify(after)})`);

    // 6. Lasse: "Lasse! Kan du ta den där?" – "Det ingår inte i mina åtaganden."
    await fresh(T);
    const lasse = await T.ev(() => { const n = __game.npc('lasse'); return { x: n.x, z: n.z, free: __game.honk.free('lasse') }; });
    T.log('lasse', JSON.stringify(lasse));
    check(lasse.free, 'Lasse is free');
    await clearTraffic(T, lasse.x, lasse.z, 150);
    // The street in front of the SunTrip office (z = -40), the truck stopped in its lane.
    await inTruck(T, lasse.x - 4, -40 - 2.75, -PI / 2);
    check(await tip(T), 'a pig off by the SunTrip office');
    await T.until(() => ['trot', 'roam'].includes(__game.pigs.loose[0]?.mode), 5000);
    await resetSaid(T);
    await T.ev(() => { __game.pigs.asked = -Infinity; });
    const lp = await T.ev(() => { const p = __game.pigs.loose[0]; return { x: p.x, z: p.z }; });
    await onFoot(T, lp.x, lp.z - 5, 0, PI - 0.5);
    await pinPig(T, 0, lp.x, lp.z);
    await T.until(() => window.__said.some(([w]) => w === 'lasse'), 4000).catch(() => {});
    await T.sleep(400);
    await T.shot('grisar_lasse');
    sd = await said(T);
    T.log('lasse said', JSON.stringify(sd));
    const ia = sd.findIndex(([w, t]) => w === 'stig' && t === cfg.ask), ir = sd.findIndex(([w, t]) => w === 'lasse' && t === cfg.refuse);
    check(ia >= 0 && ir > ia, 'Stig asks Lasse, Lasse refuses');
    await resetSaid(T);
    await T.sleep(1500);
    check(!(await said(T)).some(([, t]) => t === cfg.ask), 'no second ask within the minute');

    // 7. A drop from 2 m and the farm's wall at 12 m/s tip one each; two jolts inside the gap one.
    await fresh(T);
    await clearTraffic(T, lx, -150, 200);
    await inTruck(T, lx, -150, 0);
    await T.ev(() => { const c = __game.playerCar; c.y += 2.2; c.air = true; c.vy = 0; });
    await T.until(() => __game.pigs.loose.length > 0, 3000).catch(() => {});
    s = await pigState(T);
    T.log('land', JSON.stringify(s.last));
    check(s.loose.length === 1 && s.last.why === 'land' && s.last.impact >= 6, 'a hard landing tips one');
    await fresh(T);
    // South of the farm's wall (local z 30.6, world -209.4) on the z = -200 road, nose to the wall.
    await clearTraffic(T, -65, -200, 200);
    await inTruck(T, -65, -199, PI);
    await steady(T, 12);
    await T.until(() => __game.pigs.loose.length > 0, 4000).catch(() => {});
    await steady(T, null);
    await T.ev(() => { const c = __game.playerCar; c.vx = c.vz = 0; });
    s = await pigState(T);
    T.log('crash', JSON.stringify(s.last), JSON.stringify(await T.ev(() => { const c = __game.playerCar; return { x: c.x, z: c.z }; })));
    check(s.loose.length === 1 && s.last.why === 'crash' && s.last.impact >= 7, 'a crash tips one');
    await fresh(T);
    const two = await T.ev(() => { const g = __game, c = g.playerCar; g.pigs.jolt(c, 'crash', 9); g.pigs.jolt(c, 'land', 9); return g.pigs.loose.length; });
    check(two === 1, 'two jolts inside the gap: one pig');
    await T.ev(() => { __game.pigs.gapT = 0; });
    const weak = await T.ev(() => { const g = __game, c = g.playerCar; g.pigs.jolt(c, 'crash', 6.5); g.pigs.jolt(c, 'land', 5.5); return g.pigs.loose.length; });
    check(weak === 1, 'a crash under 7 or a landing under 6 tips none');

    // 8. The farm. The way from the gravel drive to the pen is clear for the grisbil.
    await fresh(T);
    const farm = await T.ev(() => { const g = __game; return { a: g.lmOffset('grisfalla', 0, -9), b: __lm('grisfalla') }; });
    await clearTraffic(T, farm.b.x, farm.b.z, 200);
    await inTruck(T, farm.a.x, farm.a.z, -PI / 2, 0.4);
    // A pig off on the drive first (a full bed would be delivered at once in the zone).
    check(await tip(T), 'a pig off on the drive');
    await T.ev(() => { const g = __game; window.__hits = 0; const o = g.onCarImpact.bind(g); window.__oi = o; g.onCarImpact = (a, b, i, x, z) => { window.__hits++; return o(a, b, i, x, z); }; });
    await steady(T, 5);
    await T.until(() => { const c = __game.playerCar, z = __lm('grisfalla'); return Math.hypot(c.x - z.x, c.z - z.z) < 1.5; }, 5000).catch(() => {});
    await steady(T, null);
    const hits = await T.ev(() => { __game.onCarImpact = window.__oi; const c = __game.playerCar; c.vx = c.vz = 0; return window.__hits; });
    const atZone = await T.ev(() => { const c = __game.playerCar, z = __lm('grisfalla'); return Math.hypot(c.x - z.x, c.z - z.z); });
    T.log('drive in', hits, atZone.toFixed(2));
    check(hits === 0 && atZone < 1.5, 'the gravel drive to the pen is clear');
    // With a pig missing: the grisbonde counts them, no delivery.
    await resetSaid(T);
    await T.ev(() => { __game.pigs.missingT = -Infinity; });
    await T.sleep(700);
    sd = await said(T);
    s = await pigState(T);
    check(sd.some(([w, t]) => w === 'grisbonde' && t === cfg.missing) && !s.delivered, `the grisbonde: "${cfg.missing}", no delivery (${JSON.stringify(sd)})`);
    // All three, stopped in the zone: over the fence.
    await T.ev(() => { const g = __game, s = g.pigs; for (const pig of s.loose.slice()) s.dropPig(pig); });
    const coins0 = await T.ev(() => __game.coins);
    await resetSaid(T);
    await T.ev(() => { const g = __game, c = g.playerCar; g.cam.yaw = c.yaw + Math.PI + 0.9; g.cam.snapNext = true; g.named.grisbil.setPig(1, true); });
    await T.until(() => __game.pigs.pen.length >= 2, 3000);
    await T.sleep(250);
    await T.shot('grisar_fallan');
    await T.until(() => __game.pigs.paid, 5000);
    await T.sleep(300);
    await T.shot('grisar_tack');
    await T.sleep(1600);
    await T.shot('grisar_aksjuka');
    s = await pigState(T);
    sd = await said(T);
    const coins1 = await T.ev(() => __game.coins);
    T.log('delivered', JSON.stringify(s), JSON.stringify(sd), coins0, coins1);
    check(s.delivered && s.bed.every((b) => !b) && s.pen.length === 3, 'the bed is empty, three in the pen');
    check(s.paid.pay === cfg.pay && !s.paid.clean && coins1 - coins0 === cfg.pay, `${cfg.pay} pta (a pig fell on the way)`);
    check(sd.some(([w, t]) => w === 'grisbonde' && t === cfg.thanks), `the grisbonde: "${cfg.thanks}"`);
    check(sd.some(([w, t]) => w === 'stig' && t === cfg.sick), `Stig: "${cfg.sick}"`);
    const bonde = await T.ev(() => { const g = __game, n = g.npc('grisbonde'), q = g.lmOffset('grisfalla', ...g.pigs.cfg.bonde.path.at(-1)); return { d: Math.hypot(n.x - q.x, n.z - q.z), walk: !!g.pigs.walk }; });
    T.log('grisbonde', JSON.stringify(bonde));
    check(bonde.d < 1.2, 'the grisbonde walked over to the pen');
    check(!(await T.ev(() => __game.pigs.objective())) && !(await T.ev(() => __game.pigs.target())), 'no objective with an empty bed');
    await T.sleep(3000);
    const inPen = await T.ev(() => { const c = __lm('grisfallaIn'); return __game.pigs.pen.map((p) => [p.mode, +(p.x - c.x).toFixed(2), +(p.z - c.z).toFixed(2)]); });
    T.log('pen', JSON.stringify(inPen));
    check(inPen.every(([m, dx, dz]) => m === 'pen' && Math.abs(dx) < 3.1 && Math.abs(dz) < 2.6), 'the delivered pigs wander inside the pen');
    await T.shot('grisar_fallan2');
    await T.ev(() => { const c = __game.playerCar; c.place(c.x + 0.5, c.z, c.yaw); });
    await T.sleep(400);
    check((await pigState(T)).paid.t === s.paid.t, 'no second delivery from an empty bed');

    // 9. The empty bed fills at Flamenco once Stig is 30 m off.
    const bay = await T.ev(() => __game.pigs.bay());
    await inTruck(T, bay.x, bay.z, bay.yaw);
    await T.ev(() => __game.exitCar(true));
    await T.sleep(400);
    check((await pigState(T)).delivered, 'still empty with Stig beside it');
    await T.ev((b) => { __game.player.teleport(b.x + 35, b.z, 0); }, bay);
    await T.until(() => !__game.pigs.delivered, 3000).catch(() => {});
    s = await pigState(T);
    check(!s.delivered && s.bed.every(Boolean) && s.shown.every(Boolean) && s.falls === 0, 'three new pigs at Flamenco');

    // 10. A clean trip pays 250 and brings no sigh.
    await resetSaid(T);
    await inTruck(T, farm.b.x, farm.b.z, -PI / 2);
    await T.until(() => __game.pigs.paid?.clean && !__game.pigs.busy, 6000);
    await T.sleep(2200);
    s = await pigState(T);
    sd = await said(T);
    check(s.paid.pay === cfg.cleanPay && !sd.some(([, t]) => t === cfg.sick), `a clean trip: ${cfg.cleanPay} pta, no sigh`);
    check(s.pen.length === 3, 'the pen holds the last delivery\'s three');

    // 11. In a mission the pigs are off: a start puts a loose one back and empties the pen, and no
    // jolt tips one.
    await T.ev(() => { const g = __game, s = g.pigs; s.fill(g.named.grisbil); s.gapT = 0; });
    await T.ev(() => { const c = __game.playerCar; c.place(-42.75, -150, 0); });
    await T.frames(2);
    check(await tip(T), 'a pig off before the mission');
    await T.ev(() => __game.exitCar(true));
    await T.startMission();
    await T.frames(5);
    s = await pigState(T);
    check(!s.loose.length && s.bed.every(Boolean) && !s.pen.length, `a mission start: the pig back in the bed, the pen empty (${JSON.stringify(s)})`);
    const inMission = await T.ev(() => { const g = __game, c = g.named.grisbil; g.enterCar(c); g.pigs.gapT = 0; g.pigs.jolt(c, 'crash', 20); g.pigs.jolt(c, 'land', 20); return g.playerCar === c ? g.pigs.loose.length : -1; });
    check(inMission === 0, 'no pig falls in a mission');
  },
};
