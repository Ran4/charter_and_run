// Kyrkfrid i Templo Ecuménico (free roam, DESIGN §7.2; feature 60): kyrkfrid, kyrkshots.
//   kyrkfrid:  at index 6 (free roam): no prompt at the church door without a pursuit. In one on foot
//              (the officer 12 m off on the plaza): "Sök skydd i kyrkan" (priority over everything)
//              and a friend marker on the map. E: frozen at the door facing it, the doorway open, the
//              pursuit on; `enterSecs` later Stig hidden, the plaza shot (a cut), the card KYRKFRID /
//              Guardia Civil väntar utanför, both Land Rovers parked at their street stops with their
//              lamps (no bust, no chase), the meter sinking but held at `floor` until the sign is read.
//              The officer walks to the sign (within 1 m of its spot): "Es una iglesia…", "Det… är… en…
//              kyr-ka.", the head scratched (`scratch`); then they give up: the pursuit over, the meter
//              0, no fine, no escape banner, its own cooldown, the shout "De där svenskarna är
//              heltokiga!"; Stig peeks out of the doorway, steps out (the cut over, no freeze), "Hoppas
//              vi inte får användning för det.", the banner KYRKFRID, and the officer gets into the east
//              Land Rover, which drive off as traffic. The said lines in order, once each. The
//              cooldown: no prompt in a new pursuit (the porter's untouched), the prompt again at 0.
//              The officer 2.5 m behind: busted at the door, fined, Stig outside. The officer 80 m off
//              (out of view): he comes on from the plaza's south edge, behind the shot. A mission start
//              while they wait: all of it gone (Stig back in the doorway, no cut, no card, the Land
//              Rovers removed, the officer hidden). In a mission with a pursuit: no prompt. The flight
//              level: no church.
//   kyrkshots: shots: the prompt with the officer coming, Stig into the dark doorway, the plaza shot as
//              the officer walks in, the sign read out, spelt out, the head scratched, the shout, the
//              peek, the step out, his line and the Land Rovers at the street, the banner; a close shot
//              of the scratch.
import { check } from '../lib.mjs';

const ID = 'kyrka:kyrkaPuerta';
const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? (it.type === 'it' ? it.it.id : it.type) : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
const banner = (T) => T.ev(() => document.getElementById('banner').classList.contains('show') ? document.querySelector('.banner-main').textContent : '');
const objective = (T) => T.ev(() => document.getElementById('objective').classList.contains('show') ? document.getElementById('objective').textContent : '');
const state = (T) => T.ev(() => {
  const g = __game, s = g.shame, o = s.officer, c = s.church, p = g.player;
  return { phase: c.s?.phase || null, read: c.s?.read || null, last: c.last?.kind || null, pursuit: s.pursuit, v: +s.v.toFixed(1), t: +c.t.toFixed(1),
    coins: g.coins, p: [p.state, +p.x.toFixed(2), +p.z.toFixed(2)], yaw: +p.yaw.toFixed(3), frozen: +g.frozenT.toFixed(2), cut: g.inCutaway,
    held: c.held.map((h) => [+h.car.x.toFixed(1), +h.car.z.toFixed(1), h.placed]), walk: c.walk?.then || null, door: !!c.mesh?.visible,
    scratch: !!o?.anim.scratch, officer: o && o.state !== 'hidden' ? [+o.x.toFixed(1), +o.z.toFixed(1)] : null };
});
// Stig `dx`, `dz` from landmark `name` (its left, forward), facing its yaw, the camera behind him.
async function at(T, name, cam = 0, dx = 0, dz = 0) {
  await T.ev((name, cam, dx, dz) => {
    const g = __game, l = g.lmOffset(name, dx, dz), p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.root.visible = true;
    p.teleport(l.x, l.z, l.yaw);
    p.vx = p.vz = 0;
    g.cam.yaw = l.yaw + cam; g.cam.snapNext = true;
  }, name, cam, dx, dz);
  await T.frames(8);
}
// A pursuit on foot; the officer `dz` m out from the door (null: where he spawns).
async function pursuit(T, dz = null, dx = -1) {
  await T.ev(() => { const s = __game.shame; s.v = 0; s.add(100); });
  await T.frames(4);
  if (dz != null) await T.ev((dx, dz) => { const g = __game, q = g.lmOffset('kyrkaPuerta', dx, dz); g.shame.ensureOfficer(q.x, q.z); }, dx, dz);
  await T.frames(2);
}
const endPursuit = (T) => T.ev(() => { const s = __game.shame; if (s.pursuit) { s.v = 0; s.endPursuit(true); } s.forced = false; });
const setup = async (T, q) => {
  await T.fresh(q);
  await T.ev(() => { window.__cfg = __game.shame.church.cfg; });
};
const cfgOf = (T) => T.ev(() => JSON.parse(JSON.stringify(__game.shame.church.cfg)));
const spot = (T, d) => T.ev((d) => { const q = __game.lmOffset('kyrkaPuerta', d[0], d[1]); return [+q.x.toFixed(2), +q.z.toFixed(2)]; }, d);
const said = (T) => T.ev(() => __game.shame.church.said.map((s) => `${s[0]}: ${s[1]}`));

export const SCENARIOS = {
  async kyrkfrid(T) {
    await setup(T, '&mission=6');
    const cfg = await cfgOf(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam on the island at index 6');

    // 1. No pursuit: no prompt.
    await at(T, 'kyrkaPuerta', Math.PI);
    let r = { near: await near(T), door: (await state(T)).door };
    T.log('no pursuit', JSON.stringify(r));
    check(r.near !== ID && !r.door, 'no prompt at the church door without a pursuit, the door shut');

    // 2. A pursuit, the officer 12 m off: the prompt, the marker.
    const coins0 = await T.ev(() => { __game.addCoins(2000 - __game.coins); return __game.coins; });
    await pursuit(T, 12);
    r = { near: await near(T), prompt: await prompt(T),
      marker: await T.ev(() => { const l = window.__lm('kyrkaPuerta'); return __game.mapMarkers().some((m) => m.type === 'friend' && Math.hypot(m.x - l.x, m.z - l.z) < 0.1); }) };
    T.log('pursuit', JSON.stringify(r));
    check(r.near === ID && /Sök skydd i kyrkan/.test(r.prompt), 'the church prompt in a pursuit');
    check(r.marker, 'a friend marker at the church door on the map');
    await at(T, 'kyrkaPuerta', Math.PI, 0, 2.5);
    check(await near(T) !== ID, `no prompt ${cfg.r + 0.7} m from the door`);
    await at(T, 'kyrkaPuerta', Math.PI);

    // 3. E: frozen at the door, facing it, the doorway open, the pursuit on.
    await T.tap('KeyE');
    await T.frames(2);
    r = await state(T);
    T.log('enter', JSON.stringify(r));
    check(r.phase === 'enter' && r.frozen > 0 && r.pursuit && r.door && r.p[0] === 'normal', 'entering: frozen, the doorway open, the pursuit on');
    check(Math.abs(Math.abs(r.yaw) - Math.PI) < 0.05, `he faces the door (${r.yaw})`);
    check(await near(T) !== ID, 'no second prompt at the door');

    // 4. In: hidden, the shot, the card, the Land Rovers parked at the street with their lamps.
    await T.until(() => __game.shame.church.last?.kind === 'in', 3000);
    await T.frames(3);
    r = { ...(await state(T)), obj: await objective(T), lamps: await T.ev(() => __game.shame.church.held.every((h) => h.lamp.parent && h.car.sirenLamp === h.lamp)) };
    const stops = [await spot(T, cfg.stops[0]), await spot(T, cfg.stops[1])];
    T.log('in', JSON.stringify(r), JSON.stringify(stops));
    check(r.phase === 'wait' && r.p[0] === 'hidden' && r.cut && r.pursuit && !r.door, 'in the church: hidden, the plaza shot, the door shut, the pursuit on');
    check(/KYRKFRID/i.test(r.obj) && r.obj.includes(cfg.card.text), `the card: ${r.obj}`);
    check(r.held.length === 2 && r.lamps, 'both Land Rovers held, with their lamps');
    check(r.held.every((h) => !h[2] || stops.some((s) => Math.abs(h[1] - s[1]) < 0.6 && Math.abs(h[0] - s[0]) < 15)), 'the Land Rovers out of the shot on the street in front of the church');
    check(await T.ev(() => __game.shame.church.held.every((h) => h.placed || __game.shame.church.inShot(h.car.x, h.car.z))), 'the others stopped where they were, in the shot');
    const v1 = r.v, held1 = r.held;
    await T.sleep(1500);
    r = await state(T);
    check(r.v < v1 && r.v >= cfg.floor && r.pursuit && r.p[0] === 'hidden' && r.coins === coins0, `the meter sinking, no bust (${v1} -> ${r.v})`);
    check(r.held.every((h, k) => Math.hypot(h[0] - held1[k][0], h[1] - held1[k][1]) < 3), 'the Land Rovers wait where they stopped');

    // 5. The sign: read out, spelt out, the head scratched; the meter held at the floor till then.
    await T.until(() => __game.shame.church.last?.kind === 'read', 12000);
    const read = await spot(T, cfg.read);
    r = await state(T);
    T.log('read', JSON.stringify(r));
    check(r.officer && Math.hypot(r.officer[0] - read[0], r.officer[1] - read[1]) < 1, `the officer at the sign (${r.officer} vs ${read})`);
    check((await said(T)).includes(`officer: ${cfg.readLine}`), 'the officer: "Es una iglesia…"');
    await T.until(() => __game.shame.church.last?.kind === 'spell', 5000);
    check((await said(T)).includes(`officer: ${cfg.spell}`), 'the officer: "Det… är… en… kyr-ka."');
    await T.until(() => __game.shame.church.last?.kind === 'scratch', 5000);
    r = await state(T);
    check(r.scratch && r.pursuit && r.v >= cfg.floor, 'he scratches his head, the pursuit still on');

    // 6. They give up: no pursuit, no fine, no escape banner, the cooldown, the shout.
    await T.until(() => __game.shame.church.last?.kind === 'giveUp', 8000);
    r = { ...(await state(T)), banner: await banner(T), obj: await objective(T) };
    T.log('giveUp', JSON.stringify(r));
    check(!r.pursuit && r.v === 0 && r.coins === coins0 && r.t > cfg.cooldown - 2, 'given up: no pursuit, the meter 0, no fine, the cooldown');
    check(!/TYSTAD/i.test(r.banner), `no escape banner (${r.banner})`);
    check(!r.obj.includes(cfg.card.text), 'the card gone');
    check(!r.scratch && r.walk === 'board' && r.officer, 'the officer off to his Land Rover');
    check((await said(T)).includes(`officer: ${cfg.shout}`), 'the officer: "De där svenskarna är heltokiga!"');
    check(r.p[0] === 'hidden' && r.cut, 'Stig still inside');

    // 7. The peek, the step out, the line, the banner.
    await T.until(() => __game.shame.church.last?.kind === 'peek', 4000);
    const door = await spot(T, cfg.door), out = await spot(T, cfg.out);
    r = await state(T);
    T.log('peek', JSON.stringify(r));
    check(r.p[0] === 'normal' && Math.hypot(r.p[1] - door[0], r.p[2] - door[1]) < 0.1 && r.door && r.cut && r.frozen > 0, 'Stig peeks out of the doorway, still in the shot');
    check(Math.abs(r.yaw) < 0.05, 'facing out');
    await T.until(() => __game.shame.church.last?.kind === 'out', 5000);
    r = { ...(await state(T)), camYaw: await T.ev(() => +__game.cam.yaw.toFixed(3)) };
    T.log('out', JSON.stringify(r));
    check(r.phase === null && !r.cut && !r.door && Math.hypot(r.p[1] - out[0], r.p[2] - out[1]) < 0.1 && Math.abs(r.camYaw) < 0.05, 'out: the shot over, the door shut, the chase camera behind him');
    await T.frames(3);
    check((await state(T)).frozen === 0, 'no freeze once out');
    await T.until(() => __game.shame.church.last?.kind === 'line', 3000);
    check((await said(T)).includes(`stig: ${cfg.line}`), 'Stig: "Hoppas vi inte får användning för det."');
    await T.until(() => __game.shame.church.last?.kind === 'banner' || __game.shame.church.last?.kind === 'board', 8000);
    await T.until((b) => document.querySelector('.banner-main').textContent === b, 8000, cfg.banner[0]);
    check((await T.ev(() => document.querySelector('.banner-sub').textContent)) === cfg.banner[1], 'the banner KYRKFRID / Guardia Civil gav upp');

    // 8. The officer into the east Land Rover; they drive off as traffic.
    await T.until(() => !__game.shame.church.held.length, 12000);
    r = { ...(await state(T)), leaving: await T.ev(() => __game.shame.leaving.filter((l) => l.car.ai?.mode === 'traffic').length) };
    T.log('board', JSON.stringify(r));
    check(!r.officer && r.leaving >= 2, 'the officer gone, the Land Rovers leaving as traffic');
    const s = await said(T);
    T.log('said', JSON.stringify(s));
    check(JSON.stringify(s) === JSON.stringify([`officer: ${cfg.readLine}`, `officer: ${cfg.spell}`, `officer: ${cfg.shout}`, `stig: ${cfg.line}`]), 'the lines in order, once each');

    // 9. The cooldown: no prompt in a new pursuit; the porter's untouched; the prompt at 0.
    await at(T, 'kyrkaPuerta', Math.PI);
    await pursuit(T, 20);
    r = { near: await near(T), t: await T.ev(() => __game.shame.church.t), porter: await T.ev(() => __game.shame.hideoutT) };
    T.log('cooldown', JSON.stringify(r));
    check(r.near !== ID && r.t > 0 && r.porter <= 0, 'no church inside its cooldown, the porter\'s cooldown untouched');
    await T.ev(() => { __game.shame.church.t = 0; });
    await T.frames(2);
    check(await near(T) === ID, 'the church again after the cooldown');

    // 10. The officer close behind: busted at the door.
    await T.ev(() => { __game.shame.church.said.length = 0; });
    await T.ev(() => { const g = __game, q = g.lmOffset('kyrkaPuerta', 0, 3.5); g.shame.ensureOfficer(q.x, q.z); });
    await T.tap('KeyE');
    await T.until(() => !__game.shame.pursuit, 3000);
    await T.frames(2);
    r = await state(T);
    T.log('busted', JSON.stringify(r));
    check(r.last === 'busted' && r.phase === null && r.p[0] === 'normal' && !r.door && r.coins < coins0 && !r.cut, 'busted at the door: fined, Stig outside, the door shut');
    await T.until(() => __game.frozenT <= 0, 5000);

    // 10b. 8.5 m behind (placed and E in one frame): he gets in; then stopped by hand.
    await at(T, 'kyrkaPuerta', Math.PI);
    await pursuit(T, null);
    await T.ev(() => {
      const g = __game, c = g.shame.church, q = g.lmOffset('kyrkaPuerta', 0, 8.5);
      g.shame.ensureOfficer(q.x, q.z); c.t = 0; c.enter();
    });
    await T.until(() => ['in', 'busted'].includes(__game.shame.church.last?.kind), 3000);
    r = await state(T);
    T.log('8.5 m', JSON.stringify(r));
    check(r.last === 'in' && r.p[0] === 'hidden' && r.coins === 1600, 'from 8.5 m behind he gets in');
    await T.ev(() => { const g = __game, s = g.shame; s.church.stop(); s.v = 0; s.endPursuit(true); s.officerLinger = 0; s.hideOfficer(); });
    await T.frames(3);
    r = await state(T);
    check(r.phase === null && r.p[0] === 'normal' && !r.cut && r.held.length === 0, 'stopped: Stig out, the shot over');

    // 11. The officer far off: on from the plaza's south edge, behind the shot.
    await T.ev(() => { const g = __game; g.shame.officerLinger = 0; g.shame.hideOfficer(); });
    await at(T, 'kyrkaPuerta', Math.PI);
    await pursuit(T, null);
    // E and the slam in one go with him 78 m off (a pursuit's own far rule would bring him behind
    // Stig meanwhile).
    await T.ev(() => {
      const g = __game, c = g.shame.church, q = g.lmOffset('kyrkaPuerta', 70, 30);
      c.t = 0; c.enter(); g.shame.ensureOfficer(q.x, q.z); c.inside(c.s);
    });
    await T.frames(1);
    const entry = await spot(T, cfg.entry);
    r = await state(T);
    T.log('far', JSON.stringify(r), JSON.stringify(entry));
    check(r.officer && Math.hypot(r.officer[0] - entry[0], r.officer[1] - entry[1]) < 2.5, 'the far officer comes on from the plaza\'s south edge');
    check(await T.ev(() => !__game.shame.church.inShot(__game.shame.officer.x, __game.shame.officer.z)), 'his start out of the shot');
    await T.until(() => __game.shame.church.last?.kind === 'read', cfg.comeSecs * 1000 + 2000);
    r = await state(T);
    check(r.officer && Math.hypot(r.officer[0] - read[0], r.officer[1] - read[1]) < 1, 'and reaches the sign');

    // 12. A mission start while they wait: all of it gone.
    await T.ev(() => __game.missions.begin());
    await T.frames(4);
    r = { ...(await state(T)), obj: await objective(T), cars: await T.ev(() => __game.cars.filter((c) => c.sirenLamp?.visible).length),
      chase: await T.ev(() => __game.shame.pursuers.filter((c) => !c.dead && c.ai?.mode === 'chase' && __game.cars.includes(c)).length) };
    T.log('mission start', JSON.stringify(r));
    check(r.phase === null && r.p[0] === 'normal' && !r.door && r.held.length === 0 && !r.obj.includes(cfg.card.text) && r.cars === 0, 'a mission start ends the scene: Stig out, no card, no lamps');
    check(!r.pursuit || r.chase === 2, 'the pursuit, still on, has its Land Rovers chasing again');
    await T.until(() => __game.missions.state === 'running', 20000);
    check(await T.ev(() => !__game.inCutaway), 'the plaza shot over once the mission runs');
    await at(T, 'kyrkaPuerta', Math.PI);
    await pursuit(T, 20);
    r = { near: await near(T), live: await T.ev(() => __game.shame.church.canUse()) };
    T.log('in a mission', JSON.stringify(r));
    check(r.near !== ID && !r.live, 'no church in a mission, pursuit or not');
    await endPursuit(T);
    await T.ev(() => __game.missions.abort());

    // 13. The flight level: no church.
    await setup(T, '&mission=2');
    r = await T.ev(() => ({ cfg: !!__game.shame.church.cfg, it: __game.interactables.some((i) => String(i.id).startsWith('kyrka:')) }));
    check(!r.cfg && !r.it, 'the flight level: no church');
  },

  async kyrkshots(T) {
    await setup(T, '&mission=6');
    await at(T, 'kyrkaPuerta', Math.PI, 0.6, 0.8);
    await pursuit(T, 10);
    await T.ev(() => { __game.shame.caughtT = 4; });   // no bust while the pursuit's banner shows
    await T.sleep(2800);
    await at(T, 'kyrkaPuerta', Math.PI, 0.3, 0.3);
    await T.ev(() => { const g = __game, q = g.lmOffset('kyrkaPuerta', -1.5, 11); g.shame.ensureOfficer(q.x, q.z); });
    await T.sleep(400);
    await T.shot('kyrkfrid_1_prompt');
    await T.tap('KeyE');
    await T.sleep(450);
    await T.shot('kyrkfrid_2_in');
    await T.until(() => __game.shame.church.last?.kind === 'in', 3000);
    await T.sleep(1000);
    await T.shot('kyrkfrid_3_vaktar');
    await T.until(() => __game.shame.church.last?.kind === 'read', 12000);
    await T.sleep(500);
    await T.shot('kyrkfrid_4_es_una_iglesia');
    await T.until(() => __game.shame.church.last?.kind === 'spell', 5000);
    await T.sleep(600);
    await T.shot('kyrkfrid_5_stavar');
    await T.until(() => __game.shame.church.last?.kind === 'scratch', 5000);
    await T.sleep(800);
    await T.shot('kyrkfrid_6_kliar');
    // The scratch close up: the shot moved in for one frame pair.
    await T.ev(() => { const g = __game, o = g.shame.officer; g.cam.cutTo({ x: o.x + 1.6, y: o.y + 2.0, z: o.z + 2.4 }, { x: o.x, y: o.y + 1.8, z: o.z }); });
    await T.sleep(150);
    await T.shot('kyrkfrid_6b_kliar_nara');
    await T.ev(() => __game.cutTo(window.__cfg.cam));
    await T.until(() => __game.shame.church.last?.kind === 'giveUp', 8000);
    await T.sleep(300);
    await T.shot('kyrkfrid_7_heltokiga');
    await T.until(() => __game.shame.church.last?.kind === 'peek', 4000);
    await T.sleep(500);
    await T.shot('kyrkfrid_8_kikar');
    await T.until(() => __game.shame.church.last?.kind === 'line', 5000);
    await T.sleep(700);
    await T.shot('kyrkfrid_9_hoppas');
    await T.until(() => __game.shame.church.last?.kind === 'banner', 6000);
    await T.sleep(500);
    await T.shot('kyrkfrid_10_banderoll');
    await T.until(() => !__game.shame.church.held.length, 12000);
    await T.sleep(1500);
    await T.shot('kyrkfrid_11_jeeparna_kor');
  },
};
