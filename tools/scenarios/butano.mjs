// Butaneron och gasolbilen (feature 143, DESIGN §10.65): the gas truck's lap from GASOLINA's BUTANO rack
// round the bungalows of (5,4), a house's stop (the spanner, the call, the resident's swap), Stig taken
// for a customer and his bottle (burst by R, stowed in a car), the carjacking, the bottles thrown off by
// knocks and a wreck, the new lap out of sight, a mission start. `butano` checks it; `butanoshots` shoots
// it for review.
import fs from 'fs';
import path from 'path';
import { check, ROOT } from '../lib.mjs';

async function spies(T) {
  await T.ev(async () => {
    const g = __game, b = g.butano, { hud } = await import('/src/game/hud.js'), { audio } = await import('/src/audio.js');
    window.__said = []; window.__toasts = []; window.__au = { clonk: 0, pop: 0 };
    const say = g.say.bind(g);
    g.say = (t, text, secs, o) => {
      const who = t === g.player ? 'stig' : t === b.man ? 'man' : t === b.cab ? 'cab' : b.out.some((r) => r.ch === t) ? 'res' : t?.key || 'x';
      window.__said.push([who, text, +g.time.toFixed(2)]);
      return say(t, text, secs, o);
    };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(String(text).replace(/<[^>]+>/g, '')); return toast(text, ...a); };
    const clonk = audio.clonk.bind(audio), pop = audio.gasPop.bind(audio);
    audio.clonk = (v) => { window.__au.clonk++; return clonk(v); };
    audio.gasPop = (v) => { window.__au.pop++; return pop(v); };
  });
}
const said = (T) => T.ev(() => window.__said.slice());
const kinds = (T) => T.ev(() => __game.butano.log.map((e) => e.kind));
const logOf = (T, kind) => T.ev((k) => __game.butano.log.filter((e) => e.kind === k), kind);
const until = (T, fn, ms, ...a) => T.until(fn, ms, ...a).then(() => true, () => false);
const st = (T) => T.ev(() => {
  const g = __game, b = g.butano, c = b.car, m = b.man, p = g.player;
  return {
    phase: b.phase, next: b.next, step: b.sc?.step || null, n: { ...b.n },
    car: c ? { x: +c.x.toFixed(2), z: +c.z.toFixed(2), yaw: +c.yaw.toFixed(3), v: +c.speed.toFixed(2), dead: c.dead, inCars: g.cars.includes(c), bottles: c.bottles.filter(Boolean).length, bust: !!c.driverBust } : null,
    man: m.state === 'hidden' ? null : { x: +m.x.toFixed(2), z: +m.z.toFixed(2), state: m.state, anim: m.anim.butano, mode: b.manMode },
    out: b.out.map((r) => ({ k: r.s.k, step: r.step, x: +r.ch.x.toFixed(2), z: +r.ch.z.toFixed(2) })),
    carry: !!g.carrying?.butano, arm: p.anim.butano, cap: g.speedCap, coins: g.coins, shame: +g.shame.v.toFixed(2), rec: g.records.butano || 0,
    in: !!c && g.playerCar === c, ms: g.missions.state, px: +p.x.toFixed(2), pz: +p.z.toFixed(2),
    card: document.getElementById('objective').classList.contains('show') ? document.querySelector('#objective .obj-title').textContent + ' · ' + document.querySelector('#objective .obj-text').textContent : null,
  };
});
// Stig on foot at (x, z) facing yaw, the camera behind him.
async function standAt(T, x, z, yaw) {
  await T.ev((x, z, yaw) => {
    const g = __game;
    if (g.playerCar) g.exitCar(true);
    g.player.state = 'normal';
    g.debugWarp(x, z, yaw);
    g.cam.yaw = yaw; g.cam.snapNext = true;
  }, x, z, yaw);
  await T.frames(4);
}
// A car-local spot of route stop k's parked truck (x left, z forward), in the world.
const stopLocal = (T, k, lx, lz) => T.ev((k, lx, lz) => {
  const s = __game.butano.route[k], c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
  return { x: s.x + lx * c + lz * sn, z: s.z - lx * sn + lz * c, yaw: s.yaw };
}, k, lx, lz);

export const SCENARIOS = {
  async butano(T) {
    await T.fresh('&mission=9');
    await spies(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island' && __game.day.h === 15), 'free roam on the island at 15:00');
    const C = await T.ev(() => JSON.parse(JSON.stringify({ ...__game.butano.cfg, man: null })));

    // 0. Every line in BUTANERO carries a source tag on its line in content/island.js.
    const src = fs.readFileSync(path.join(ROOT, 'src/content/island.js'), 'utf8').split('\n');
    const lines = [C.call, C.buy.local, C.buy.tourist, C.thanks, C.offer.ask, C.offer.yes, C.offer.thanks, C.offer.after, C.offer.toast, C.popLine, ...C.robbed, C.title, C.text];
    const untagged = lines.filter((s) => !src.some((l) => l.includes(`'${s}'`) && /\/\/ \[(N|F\*?)\]/.test(l)));
    check(!untagged.length, `every BUTANERO line tagged (${JSON.stringify(untagged)})`);

    // 1. Out at the start where nobody sees it: one truck of the type `butanero`, named, never traffic,
    //    twelve bottles in the bed, the butanero at its wheel; the lap's three houses and the depot.
    check(await until(T, () => !!__game.butano.phase, 5000), 'the truck is out');
    const p0 = await T.ev(() => ({ x: __game.player.x, z: __game.player.z }));
    const sp = (await logOf(T, 'spawn'))[0];
    let r = await st(T);
    T.log('start', JSON.stringify(sp), JSON.stringify(r));
    check(Math.hypot(sp.x - p0.x, sp.z - p0.z) >= C.spawnR, `spawned ${C.spawnR} m off at least (${JSON.stringify(sp)})`);
    const car0 = await T.ev(() => { const g = __game, c = g.butano.car; return { type: c.type, name: c.name, traffic: !!c.traffic, n: g.cars.filter((o) => o.type === 'butanero').length, spec: c.spec.name, bottles: c.bottles.length, color: c.color.toString(16) }; });
    check(car0.type === 'butanero' && car0.name === 'butanero' && !car0.traffic && car0.n === 1 && car0.bottles === 12 && r.car.bust, `one named truck, not traffic, 12 bottles, the butanero at the wheel (${JSON.stringify(car0)})`);
    const route = await T.ev(() => __game.butano.route.map((s) => ({ kind: s.kind, who: s.who, lot: !!s.lot, x: +s.x.toFixed(2), z: +s.z.toFixed(2), yaw: +s.yaw.toFixed(2), i: s.i })));
    T.log('route', JSON.stringify(route));
    check(route.length === 4 && route.slice(0, 3).every((s) => s.kind === 'house' && s.lot) && route[3].kind === 'depot' && route.every((s, i) => !i || s.i > route[i - 1].i), `three houses matched to their lots in lap order, then the depot (${JSON.stringify(route)})`);

    // 2. A house: the truck stops with its bed by the gate; the butanero out at the bed, the spanner and
    //    the call; the resident (a local at house 0) out, the swap, home through the door; the truck on.
    const s0 = route[0];
    await standAt(T, s0.x + 6.5, s0.z - 3, -Math.PI / 2);
    await T.ev(() => { window.__said.length = 0; window.__au.clonk = 0; __game.butano.jump(0, 40); });
    check(await until(T, () => __game.butano.log.some((e) => e.kind === 'arrive' && e.stop === 0), 25000), 'arrives at house 0');
    const arr = (await logOf(T, 'arrive')).find((e) => e.stop === 0);
    check(Math.hypot(arr.x - s0.x, arr.z - s0.z) < 1 && Math.abs(arr.yaw - s0.yaw) < 0.08, `parked on its spot (${JSON.stringify(arr)})`);
    check(await until(T, () => __game.butano.sc?.step === 'call', 6000), 'the butanero at the bed');
    r = await st(T);
    const bed = await stopLocal(T, 0, -1.6, -1.4);
    check(r.man && Math.hypot(r.man.x - bed.x, r.man.z - bed.z) < 0.5 && !r.car.bust, `out of the cab, at the bed's side (${JSON.stringify(r.man)}, ${JSON.stringify(bed)})`);
    check(await until(T, () => window.__au.clonk >= 3, 4000), 'the spanner clonks on a bottle');
    let s = await said(T);
    check(s.some(([w, t]) => w === 'man' && t === C.call), `"${C.call}" (${JSON.stringify(s)})`);
    check(await until(T, () => __game.butano.log.some((e) => e.kind === 'come' && e.stop === 0), 5000), 'the resident comes out at the first visit');
    check(await until(T, () => __game.butano.log.some((e) => e.kind === 'swap' && e.stop === 0), 25000), 'the resident at the truck');
    r = await st(T);
    T.log('swap', JSON.stringify(r.out), JSON.stringify(r.man));
    check(await until(T, () => __game.butano.n.served >= 1, 5000), 'served');
    s = await said(T);
    const iAsk = s.findIndex(([w, t]) => w === 'res' && t === C.buy.local), iThanks = s.findIndex(([w, t]) => w === 'man' && t === C.thanks);
    check(iAsk >= 0 && iThanks > iAsk, `"${C.buy.local}", then "${C.thanks}" (${JSON.stringify(s)})`);
    check(await until(T, () => __game.butano.log.some((e) => e.kind === 'depart' && e.from === 0), 10000), 'on to the next house');
    check(await until(T, () => __game.butano.log.some((e) => e.kind === 'home' && e.stop === 0), 30000), 'the resident home through the door');
    r = await st(T);
    check(!r.out.some((o) => o.k === 0), `the resident in (${JSON.stringify(r)})`);

    // 3. Stig taken for a customer at house 1: the bottle held out, his "yes", 150 pta, the toast, the
    //    bottle in his arms at walk speed, the thanks and his sigh; once a stop.
    await T.ev(() => __game.butano.jump(1, 40));   // (the truck off house 1, where it may stand by now)
    const cust = await stopLocal(T, 1, -2.6, -1.4);
    await standAt(T, cust.x, cust.z, cust.yaw + Math.PI / 2);
    await T.ev(() => { window.__said.length = 0; window.__toasts.length = 0; __game.coins = 400; });
    check(await until(T, () => __game.butano.log.some((e) => e.kind === 'offer'), 30000), 'the butanero offers Stig a bottle');
    s = await said(T);
    check(s.some(([w, t]) => w === 'man' && t === C.offer.ask), `"${C.offer.ask}" (${JSON.stringify(s)})`);
    check(await until(T, () => __game.butano.log.some((e) => e.kind === 'sold'), 4000), 'Stig buys it');
    await T.frames(4);
    r = await st(T);
    const walk = await T.ev(() => __game.levelDef.speeds.walk);
    const toasts = await T.ev(() => window.__toasts.slice());
    const sold = (await logOf(T, 'sold'))[0];
    T.log('sold', JSON.stringify(sold), JSON.stringify(r), JSON.stringify(toasts));
    check(sold.paid === 150 && r.carry && r.arm === 'carry' && r.cap === walk && r.rec === 1, `150 pta paid, the bottle in his arms at walk speed, counted (${JSON.stringify(r)})`);
    check(toasts.includes('En gasolflaska: 150 pta.'), `the toast (${JSON.stringify(toasts)})`);
    check(await until(T, (a, b) => window.__said.some(([w, t]) => w === 'man' && t === a) && window.__said.some(([w, t]) => w === 'stig' && t === b), 6000, C.offer.thanks, C.offer.after), 'the thanks and his sigh');
    s = await said(T);
    const iYes = s.findIndex(([w, t]) => w === 'stig' && t === C.offer.yes);
    check(iYes >= 0 && iYes < s.findIndex(([w, t]) => w === 'stig' && t === C.offer.after), `"${C.offer.yes}" before "${C.offer.after}" (${JSON.stringify(s)})`);
    // No sprint with it.
    await T.page.keyboard.down('ShiftLeft');
    await T.page.keyboard.down('KeyS');
    await T.sleep(900);
    const v = await T.ev(() => Math.hypot(__game.player.vx, __game.player.vz));
    await T.page.keyboard.up('KeyS');
    await T.page.keyboard.up('ShiftLeft');
    check(v <= walk + 0.05, `no sprint with the bottle (${v.toFixed(2)} ≤ ${walk})`);
    await T.sleep(4000);
    check((await logOf(T, 'offer')).length === 1, 'one offer a stop');

    // 4. R bursts his bottle: sparks and the bang, no coins and no SKANDAL; "Oj då.".
    r = await st(T);
    const shame0 = r.shame;
    await T.ev(() => { window.__au.pop = 0; });
    await T.tap('KeyR');
    check(await until(T, () => __game.butano.log.some((e) => e.kind === 'burst'), 3000), 'R bursts it');
    await T.frames(3);
    r = await st(T);
    const pop = (await logOf(T, 'pop')).slice(-1)[0];
    check(!r.carry && !r.arm && r.cap === null && pop?.why === 'stig' && (await T.ev(() => window.__au.pop)) === 1 && r.shame <= shame0, `gone with a bang, no SKANDAL (${JSON.stringify(r)}, ${JSON.stringify(pop)})`);
    check(await until(T, (a) => window.__said.some(([w, t]) => w === 'stig' && t === a), 3000, C.popLine), `"${C.popLine}"`);

    // 5. A bottle stowed in a car he gets into.
    await T.ev(async () => {
      const g = __game, { Car } = await import('/src/actors/car.js'), c = new Car('hatch');
      c.place(g.player.x + 2.5, g.player.z, g.player.yaw);
      g.addCar(c);
      window.__hatch = c;
      g.butano.sell();
    });
    await T.frames(4);
    check((await st(T)).carry, 'a second bottle in his arms');
    await T.ev(() => __game.enterCar(window.__hatch));
    await T.frames(4);
    r = await st(T);
    check(!r.carry && !r.arm && (await kinds(T)).includes('stowed'), `stowed in the car (${JSON.stringify(r)})`);
    await T.ev(() => { const g = __game; g.exitCar(true); g.removeCar(window.__hatch); });

    // 6. At the depot, the butanero at the wheel: E is a carjacking. He tumbles out himself, Stig asks
    //    whether it is his and he shouts after his truck; the card counts the bottles.
    await T.ev(() => { const b = __game.butano; b.release('test'); b.spawn(0); });
    r = await st(T);
    check(r.phase === 'stop' && r.step === 'wait' && r.car.bust && Math.abs(r.car.x - 66) < 0.2, `at the depot, loaded (${JSON.stringify(r.car)})`);
    await standAt(T, r.car.x - 0.3, r.car.z - 2.1, 0);
    const prompt = await T.ev(() => { const it = __game.nearestInteractable(); return it?.type === 'car' && it.car === __game.butano.car; });
    check(prompt, 'E at the truck is its');
    await T.ev(() => { window.__said.length = 0; });
    await until(T, () => !__game.saying(__game.player), 4000);   // (his sorry waits for his own line)
    const shameJ = (await st(T)).shame;
    await T.tap('KeyE');
    await T.frames(6);
    r = await st(T);
    const speedo = await T.ev(() => document.querySelector('#speedo .sp-name')?.textContent);
    check(r.in && r.phase === 'taken' && r.man && r.man.mode === 'robbed' && r.shame >= shameJ + 7.9 && speedo === 'Gasolbilen', `carjacked: Stig at the wheel, the butanero out, SKANDAL (${JSON.stringify(r)}, ${speedo})`);
    check(await until(T, () => window.__said.some(([w, t]) => w === 'stig' && t === 'Ursäkta, är det din bil?'), 3000), 'Stig asks whether it is his');
    check(await until(T, (a) => window.__said.some(([w, t]) => w === 'man' && t === a), 6000, C.robbed[0]), `"${C.robbed[0]}"`);
    r = await st(T);
    check(r.card === 'GASOLBILEN · Flaskor på flaket: 12 av 12. Kör försiktigt!', `the card (${r.card})`);

    // 7. A crash into a car ahead throws bottles off the back; each bursts where it lands, with coins
    //    and SKANDAL. A landing throws one; a soft knock none.
    await T.ev(async () => {
      const g = __game, { Car } = await import('/src/actors/car.js'), c = new Car('hatch'), t = g.butano.car;
      c.place(t.x + 16, t.z, t.yaw);
      g.addCar(c);
      window.__hatch = c;
    });
    const shameC = (await st(T)).shame;
    await T.ev(() => { window.__au.pop = 0; });
    await T.page.keyboard.down('KeyW');
    const hit = await until(T, () => __game.butano.n.thrown > 0, 6000);
    await T.page.keyboard.up('KeyW');
    await T.page.keyboard.down('KeyS');
    await T.sleep(800);
    await T.page.keyboard.up('KeyS');
    const thr = await logOf(T, 'throw');
    T.log('crash', JSON.stringify(thr));
    check(hit && thr[0].why === 'jolt' && thr[0].impact >= C.jolt.crash, `the crash throws a bottle (${JSON.stringify(thr)})`);
    check(await until(T, () => __game.butano.loose.length === 0 && __game.butano.log.some((e) => e.kind === 'pop' && e.why === 'jolt'), 5000), 'it bursts where it lands');
    r = await st(T);
    const pops = (await logOf(T, 'pop')).filter((e) => e.why === 'jolt').length;
    check(r.shame >= shameC + C.pop.shame * pops && (await T.ev(() => window.__au.pop)) === pops && r.car.bottles === 12 - thr.length, `SKANDAL and the bang for each (${pops}, ${JSON.stringify(r)})`);
    check(r.card === `GASOLBILEN · Flaskor på flaket: ${12 - thr.length} av 12. Kör försiktigt!`, `the card counts down (${r.card})`);
    const n0 = (await st(T)).n.thrown;
    await T.ev(() => { const g = __game; g.onCarImpact(g.playerCar, null, 4, g.playerCar.x, g.playerCar.z); });
    await T.sleep(700);
    check((await st(T)).n.thrown === n0, 'a soft knock throws none');
    await T.ev(() => { const g = __game; g.onCarLanded(g.playerCar, 7); });
    check((await st(T)).n.thrown === n0 + 1, 'a hard landing throws one');
    await T.ev(() => { const g = __game; g.removeCar(window.__hatch); });

    // 8. A wreck throws the rest up; they burst with coins, no SKANDAL of theirs.
    await T.sleep(800);
    await T.ev(() => { const g = __game; g.butano.car.damage(999, g); });
    await T.frames(3);
    r = await st(T);
    check(r.car.dead && r.car.bottles === 0 && (await kinds(T)).includes('wreck') && !r.in, `wrecked: every bottle off (${JSON.stringify(r.car)})`);
    check(await until(T, () => __game.butano.loose.length === 0, 8000), 'all burst');
    check((await logOf(T, 'pop')).filter((e) => e.why === 'wreck').length >= 8, 'the wreck\'s bottles burst');

    // 9. Far away and out of sight: the wreck goes, and a new lap starts where nobody sees it, whole.
    await standAt(T, -200, 160, 0);
    check(await until(T, () => __game.butano.log.some((e) => e.kind === 'reset'), 12000), 'the wreck goes');
    check(await until(T, () => __game.butano.phase === 'drive' || __game.butano.phase === 'stop', 12000), 'a new lap');
    r = await st(T);
    check(!r.car.dead && r.car.bottles === 12 && r.car.bust && r.car.inCars, `whole again, the butanero at the wheel (${JSON.stringify(r.car)})`);
    const sp2 = (await logOf(T, 'spawn')).slice(-1)[0];
    check(Math.hypot(sp2.x + 200, sp2.z - 160) >= C.spawnR, `out of sight (${JSON.stringify(sp2)})`);

    // 10. A mission start takes it all away; no truck in the mission.
    await T.ev(() => { __game.butano.sell(); });
    await T.frames(3);
    await T.startMission();
    r = await st(T);
    check(!r.car.inCars && !r.man && !r.out.length && !r.carry && r.phase === null, `gone in the mission (${JSON.stringify(r)})`);
    await T.sleep(3000);
    check((await st(T)).phase === null, 'not back in the mission');
    T.log('kinds', JSON.stringify(await kinds(T)));
    T.log('n', JSON.stringify((await st(T)).n));
  },

  async butanoshots(T) {
    await T.fresh('&mission=9');
    await T.frames(20);
    const shot = async (name, eye, look) => {
      await T.ev((e, l) => { const g = __game; g.cam.cutTo({ x: e[0], y: e[1], z: e[2] }, { x: l[0], y: l[1], z: l[2] }); g.cam.snapNext = true; }, eye, look);
      await T.frames(4);
      await T.shot(name);
    };
    // The truck at the depot before the BUTANO rack.
    await T.ev(() => { const g = __game, b = g.butano; g.debugWarp(50, 20, Math.PI); b.release('shot'); b.spawn(0); b.sc.t0 = g.time + 60; });
    await T.frames(10);
    await shot('butano_depot', [78, 3.0, -3], [66.5, 1.2, -7.5]);
    await shot('butano_flak', [70.5, 4.6, -1.2], [65.5, 1.4, -6]);
    // A house: the call and the spanner, the resident's swap.
    const s0 = await T.ev(() => { const s = __game.butano.route[0]; return { x: s.x, z: s.z }; });
    await T.ev((x, z) => { const g = __game; g.debugWarp(x + 7, z + 9, 0); g.butano.jump(0, 30); }, s0.x, s0.z);
    await T.until(() => __game.butano.sc?.step === 'call', 30000);
    await T.until(() => __game.butano.man.anim.butano === 'knock' && __game.butano.man.anim.butanoK > 0.4, 6000).catch(() => {});
    await shot('butano_knack', [s0.x - 6.5, 2.6, s0.z + 3], [s0.x - 1.5, 1.3, s0.z - 1.4]);
    await T.until(() => __game.butano.sc?.step === 'swap', 30000);
    await T.sleep(1600);
    await shot('butano_byte', [s0.x - 7, 2.4, s0.z - 5.5], [s0.x - 2.4, 1.2, s0.z - 1.2]);
    // Stig taken for a customer at house 2 (BUNGALOWS LOS CACTUS).
    const s2 = await T.ev(() => { const s = __game.butano.route[2], c = Math.cos(s.yaw), sn = Math.sin(s.yaw); return { x: s.x, z: s.z, yaw: s.yaw, cx: s.x - 2.6 * c - 1.4 * sn, cz: s.z + 2.6 * sn - 1.4 * c }; });
    await T.ev((p) => { const g = __game; g.coins = 400; g.debugWarp(p.cx, p.cz, p.yaw + Math.PI / 2); g.butano.jump(2, 30); }, s2);
    await T.until(() => __game.butano.log.some((e) => e.kind === 'offer'), 40000);
    await T.sleep(400);
    await shot('butano_kund', [s2.cx + 3.5, 2.2, s2.cz - 3.2], [s2.cx - 0.6, 1.3, s2.cz + 0.3]);
    await T.until(() => __game.butano.log.some((e) => e.kind === 'sold'), 4000);
    await T.sleep(2600);
    await T.ev(() => __game.cam.release());
    await T.frames(6);
    await T.shot('butano_bar');
    await shot('butano_cactus', [s2.x - 1.5, 3.6, s2.z - 14], [s2.x + 4, 1.4, s2.z + 3]);
    // The carjacking at the depot, the shouts.
    await T.ev(() => { const g = __game, b = g.butano; b.endCarry('gone'); b.release('shot'); b.spawn(0); g.debugWarp(65.7, -8.1, 0); });
    await T.frames(6);
    await T.tap('KeyE');
    await T.until(() => __game.butano.log.some((e) => e.kind === 'shout'), 6000);
    await T.sleep(300);
    await shot('butano_kapad', [72, 3, -12], [65, 1.2, -7]);
    // A bottle off the bed in the air, then its burst.
    await T.ev(() => { const g = __game; g.cam.release(); g.butano.throwOff(g.playerCar, 'jolt', 9); });
    await T.sleep(250);
    await shot('butano_flyger', [74, 3.4, 2], [66, 1.6, -6]);
    await T.until(() => __game.butano.loose.length === 0, 4000);
    await T.frames(2);
    await T.shot('butano_smaller');
  },
};
