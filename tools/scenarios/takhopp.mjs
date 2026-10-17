// Hoppet mellan hotelltaken – the jump between the hotel roofs (free roam, DESIGN §10.29; feature 41):
// takhopp.
//   takhopp: after the end the two roofs in (4,4)'s north row are floors at 21.09 (the slabs' 99 m
//            solids dead, the gap's palms stopped at 8 m); E at SOL DE INVIERNO's lobby (TA TRAPPAN
//            UPP) fades him up beside the lift room, facing the gap, out of breath with "Sju
//            våningar…"; the coin line to the west edge and a running jump over the gap: the arms out
//            and the mantra over it, down on ATLÁNTICO's roof with the coins on the way; the view by
//            the brochure's sign ("Nu har jag havsutsikt." once a visit) and the stash; TA TRAPPAN NER
//            on ATLÁNTICO puts him at its lobby; off ATLÁNTICO's west edge into the pool next door: a
//            belly flop (and with J the cannonball). A pursuit shuts the stairs. Between missions
//            (ropavieja's idle) the roofs are there too; a mission start with him up there puts him at
//            the lobby without a fall, and in the mission the world is as before (every slab solid to
//            99, no roof floor, the palms to 99, no prompt).
import { check } from '../lib.mjs';

const FLOOR = 21.09;
const st = (T) => T.ev(() => {
  const g = __game, p = g.player, R = g.roofs;
  return { px: +p.x.toFixed(2), py: +p.y.toFixed(2), pz: +p.z.toFixed(2), yaw: +p.yaw.toFixed(2), pst: p.state, onGround: p.onGround,
    leap: p.anim.leap, bomb: p.anim.bomb, slump: p.anim.slump, dive: R.dive && { ...R.dive }, on: R.on, busy: R.busy, last: R.last,
    climbs: R.climbs, mantras: R.mantras, coins: g.coins, state: g.missions.state,
    prompt: document.getElementById('prompt')?.textContent || '' };
});
const said = (T) => T.ev(() => window.__said.slice());
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g); g.say = (t, text, secs) => { window.__said.push(text); return o(t, text, secs); };
    const w = g.waterSplash.bind(g); g.waterSplash = (x, z, v, bomb) => { w(x, z, v, bomb); window.__splash = { v: +v.toFixed(1), bomb, x: +x.toFixed(2), z: +z.toFixed(2) }; };
    const l = g.onLand.bind(g); g.onLand = (ch, v, y) => { if (ch === g.player) window.__lands.push(+v.toFixed(1)); return l(ch, v, y); };
    window.__lands = [];
  }
  window.__said = [];
  window.__splash = null;
});
// On a roof by hand (debugWarp snaps to the ground): at (x, z) facing yaw, the camera behind him.
const onRoof = (T, x, z, yaw) => T.ev((x, z, yaw, y) => {
  const g = __game, p = g.player;
  p.state = 'normal'; p.x = x; p.z = z; p.y = y; p.yaw = yaw;
  p.vx = p.vz = p.vy = 0; p.wishX = p.wishZ = 0; p.onGround = true; g.jumps = 0;
  g.cam.yaw = yaw; g.cam.snapNext = true;
}, x, z, yaw, FLOOR);
// A frame hook that keeps the camera (so W) aimed at (tx, tz), and once his x is under jumpX jumps as
// Space does (with the double jump `dbl` s later if set) and with J (the stomp) `stompAt` m under the
// roof; held W + Shift until `done` is true in the page.
async function run(T, tx, tz, { jumpX = null, dbl = null, stompAt = null, done, timeout = 12000 } = {}) {
  await T.ev((tx, tz, jumpX, dbl, stompAt, floor) => {
    const g = __game, p = g.player;
    window.__run = { jumped: null, stomped: false };
    window.__hook = () => {
      g.cam.yaw = Math.atan2(tx - p.x, tz - p.z);
      const r = window.__run;
      if (jumpX != null && r.jumped == null && p.onGround && p.x < jumpX) { p.jump(8.6); g.jumps = 1; r.jumped = { x: +p.x.toFixed(2), t: g.time }; }
      if (dbl != null && r.jumped && g.jumps === 1 && g.time - r.jumped.t >= dbl) { p.vy = 8.0; g.jumps = 2; }
      if (stompAt != null && !r.stomped && !p.onGround && p.y < floor - stompAt) { r.stomped = true; g.stomp(); }
    };
    g.onFrame(window.__hook);
  }, tx, tz, jumpX, dbl, stompAt, FLOOR);
  await T.page.keyboard.down('ShiftLeft');
  await T.page.keyboard.down('KeyW');
  try { await T.until(done, timeout); }
  finally {
    await T.page.keyboard.up('KeyW');
    await T.page.keyboard.up('ShiftLeft');
    await T.ev(() => { __game.offFrame(window.__hook); });
  }
  return T.ev(() => window.__run);
}
const blocksNear = (T) => T.ev(async () => {
  const C = await import('/src/world/collision.js');
  return C.queryBlocks(70, 50, 112, 70, []).filter((b) => b.kind === 'building' || b.kind === 'roof' || b.kind === 'tree')
    .map((b) => ({ kind: b.kind, top: +b.top.toFixed(2), x: +(b.x ?? (b.minX + b.maxX) / 2).toFixed(2), z: +(b.z ?? (b.minZ + b.maxZ) / 2).toFixed(2) }));
});

export const SCENARIOS = {
  async takhopp(T) {
    // 0. Free roam after the end: the roofs are floors, the slabs' 99 m solids out, the palms at 8 m.
    await T.fresh('&mission=13');
    await resetSaid(T);
    const geo = await T.ev(async () => {
      const { ROOF_JUMP: J } = await import('/src/world/town.js');
      const C = await import('/src/world/collision.js');
      const fl = (x, z) => +C.groundAt(x, z, 25, 0.45).toFixed(2);
      return { live: J.live(), names: [J.roofs.atl?.name, J.roofs.sol?.name], floors: [J.roofs.atl?.floor, J.roofs.sol?.floor],
        gap: J.gap && { x0: +J.gap.x0.toFixed(2), x1: +J.gap.x1.toFixed(2), z0: +J.gap.z0.toFixed(2), z1: +J.gap.z1.toFixed(2) },
        coins: J.coins.length, atl: fl(80, 60), sol: fl(100, 60), gapFloor: fl(90.2, 60), lift: fl(104.97, 63.76),
        spots: ['takSolTopp', 'takAtlTopp', 'takUtsikt'].map((n) => { const l = __lm(n); return fl(l.x, l.z); }) };
    });
    T.log('roofs', JSON.stringify(geo));
    check(geo.live && geo.names[0] === 'HOTEL ATLÁNTICO' && geo.names[1] === 'APARTAMENTOS SOL DE INVIERNO', `the pair, live after the end (${JSON.stringify(geo.names)})`);
    check(geo.floors.every((f) => f === FLOOR) && geo.atl === FLOOR && geo.sol === FLOOR && geo.spots.every((f) => f === FLOOR), `both roofs floors at 21.09, the roof spots on them (${JSON.stringify(geo)})`);
    check(geo.gap && Math.abs(geo.gap.x1 - geo.gap.x0 - 3.68) < 0.02 && geo.gapFloor < 1, `the 3.7 m gap, no floor in it (${JSON.stringify(geo.gap)})`);
    check(geo.lift > 22.9 && geo.coins === 17, `the lift room a wall up there, 17 coins (${geo.lift}, ${geo.coins})`);
    let near = await blocksNear(T);
    const trees = near.filter((b) => b.kind === 'tree' && b.x > 88 && b.x < 92.5);
    check(trees.length === 2 && trees.every((b) => b.top === 8), `the gap's two palms stop at 8 m (${JSON.stringify(trees)})`);
    check(!near.some((b) => b.kind === 'building' && b.top === 99 && b.x > 75 && b.x < 105 && b.z < 66), 'no 99 m slab solid under the roofs');

    // 1. The pair from the street, then SOL DE INVIERNO's lobby: TA TRAPPAN UPP under ASCENSOR AVERIADO.
    await T.ev(() => { const g = __game; g.debugWarp(96, 44, 0); g.cam.cutTo({ x: 87, y: 15, z: 18 }, { x: 90, y: 15, z: 60 }); g.cam.snapNext = true; });
    await T.frames(12);
    await T.shot('takhopp_paret');
    await T.ev(() => { const g = __game; g.cam.cutTo({ x: 102.2, y: 2.6, z: 50.4 }, { x: 100.67, y: 1.6, z: 55.3 }); });
    await T.frames(8);
    await T.shot('takhopp_ascensor');
    await T.ev(() => __game.cam.release());
    await T.ev(() => { const g = __game, l = __lm('takSolLobby'); g.debugWarp(l.x, l.z, l.yaw); g.cam.yaw = l.yaw; g.cam.snapNext = true; });
    await T.frames(8);
    let r = await st(T);
    T.log('at the lobby', JSON.stringify(r));
    check(r.prompt.includes('Ta trappan upp'), `the lobby's prompt (${r.prompt})`);
    const coins0 = r.coins;
    await T.tap('KeyE');
    await T.frames(3);
    check(await T.ev(() => document.getElementById('fade')?.classList.contains('on')), 'the stairs fade to black');
    await T.until(() => !__game.roofs.busy && __game.player.y > 20, 6000);
    await T.frames(4);
    r = await st(T);
    T.log('on the roof', JSON.stringify(r));
    const top = await T.L('takSolTopp');
    check(r.climbs === 1 && r.py === FLOOR && r.onGround && r.on === 'sol' && Math.abs(r.yaw + Math.PI / 2) < 0.05 && Math.hypot(r.px - top.x, r.pz - top.z) < 0.05,
      `up on SOL DE INVIERNO's roof by the lift room, facing the gap (${JSON.stringify(r)})`);
    check(r.slump && (await said(T)).includes('Sju våningar…'), 'out of breath: "Sju våningar…"');
    check(r.coins === coins0, `no coin within the magnet's reach where the stairs put him (${r.coins - coins0} pta)`);
    check(r.prompt.includes('Ta trappan ner'), `the roof door's prompt (${r.prompt})`);
    await T.shot('takhopp_uppe');
    await T.frames(10);

    // 2. Along the coins and over the gap with a running jump: the arms out and the mantra over it.
    await resetSaid(T);
    const gap = geo.gap;
    let flight = null;
    const jr = await run(T, 80, 59.53, {
      jumpX: gap.x1 + 1.2,
      done: () => { const p = __game.player, R = __game.roofs; return (R.dive && p.x < 90.6) || (p.onGround && p.x < 88); },
    });
    flight = await st(T);
    await T.page.screenshot({ path: `${T.out}/takhopp_glipan.png` });
    T.log('over the gap', JSON.stringify(flight), 'jump', JSON.stringify(jr));
    check(jr.jumped && jr.jumped.x > gap.x1 && flight.dive?.gap && flight.leap && flight.py > FLOOR, `in the air over the gap, arms out (${JSON.stringify(flight)})`);
    await T.until(() => __game.player.onGround && !__game.roofs.dive, 6000);
    await T.frames(6);
    r = await st(T);
    let s = await said(T);
    T.log('across', JSON.stringify(r), 'said', JSON.stringify(s));
    check(s.includes('Jag kan flyga, jag är inte rädd.') && r.mantras === 1, 'the mantra over the gap');
    check(r.on === 'atl' && r.py === FLOOR && r.px < gap.x0 && r.last?.gap && r.last.kind === 'roof' && !r.leap, `down on ATLÁNTICO's roof, the arms in (${JSON.stringify(r.last)})`);
    check(r.coins - coins0 >= 11 * 25, `the coin line and the three over the gap (${r.coins - coins0} pta)`);
    await T.shot('takhopp_atlantico');

    // 3. The view by the brochure's sign: "Nu har jag havsutsikt." once a visit, and the stash.
    await resetSaid(T);
    const c1 = r.coins;
    const v = await T.L('takUtsikt');
    await run(T, v.x, v.z, { done: () => { const p = __game.player, l = __lm('takUtsikt'); return Math.hypot(p.x - l.x, p.z - l.z) < 1.0; } });
    await T.frames(10);
    await T.ev((yaw) => { const g = __game; g.player.yaw = yaw; g.cam.yaw = yaw; g.cam.snapNext = true; }, v.yaw);
    await T.frames(6);
    r = await st(T);
    s = await said(T);
    T.log('the view', JSON.stringify(r), 'said', JSON.stringify(s));
    check(s.filter((t) => t === 'Nu har jag havsutsikt.').length === 1 && r.on === 'atl', `"Nu har jag havsutsikt." (${JSON.stringify(s)})`);
    check(r.coins - c1 >= 4 * 25, `the stash by the south edge (${r.coins - c1} pta)`);
    await T.shot('takhopp_utsikt');
    await T.ev(() => __game.setSky('sunset'));
    await T.frames(10);
    await T.shot('takhopp_kvallssol');
    await T.ev(() => __game.setSky('day'));
    await onRoof(T, v.x - 3, v.z - 3, Math.PI);
    await T.frames(10);
    await onRoof(T, v.x, v.z, 0);
    await T.frames(10);
    check((await said(T)).filter((t) => t === 'Nu har jag havsutsikt.').length === 1, 'once a visit');

    // 4. TA TRAPPAN NER on ATLÁNTICO: at its lobby, turned away from the door.
    const at = await T.L('takAtlTopp');
    await onRoof(T, at.x, at.z, Math.PI);
    await T.frames(6);
    r = await st(T);
    check(r.prompt.includes('Ta trappan ner'), `ATLÁNTICO's roof door (${r.prompt})`);
    await T.tap('KeyE');
    await T.until(() => !__game.roofs.busy && __game.player.y < 1, 6000);
    await T.frames(4);
    r = await st(T);
    const al = await T.L('takAtlLobby');
    T.log('down at ATLÁNTICO', JSON.stringify(r));
    check(Math.abs(r.px - al.x) < 0.05 && Math.abs(al.z - r.pz - 2.8) < 0.05 && r.py < 0.3 && r.on === null && Math.abs(Math.abs(r.yaw) - Math.PI) < 0.05 && r.climbs === 2, `at ATLÁNTICO's lobby, facing out (${JSON.stringify(r)})`);
    check(!r.prompt.includes('Ta trappan'), `no stairs up from ATLÁNTICO's lobby (${r.prompt})`);
    await T.frames(10);
    await T.shot('takhopp_nere');
    await resetSaid(T);
    await onRoof(T, v.x, v.z, 0);
    await T.frames(6);
    check((await said(T)).includes('Nu har jag havsutsikt.'), 'the view line again on a new visit');

    // 5. Off ATLÁNTICO's west edge into the pool next door: the arms out, the mantra, a belly flop.
    await onRoof(T, 74, 62, -Math.PI / 2);
    await T.frames(6);
    await resetSaid(T);
    let fall = null;
    await run(T, 30, 62, { done: () => { const p = __game.player; return !__game.roofs.dive ? false : p.y < 12; } });
    fall = await st(T);
    await T.page.screenshot({ path: `${T.out}/takhopp_fall.png` });
    await T.until(() => __game.player.onGround || __game.player.state !== 'normal', 6000);
    await T.frames(2);
    r = await st(T);
    const sp = await T.ev(() => window.__splash);
    s = await said(T);
    T.log('into the pool', JSON.stringify(r.last), 'falling', JSON.stringify(fall), 'splash', JSON.stringify(sp), 'said', JSON.stringify(s));
    check(fall.leap && !fall.bomb && fall.dive && !fall.dive.gap, `arms out on the way down (${JSON.stringify(fall)})`);
    check(s.includes('Jag kan flyga, jag är inte rädd.'), 'the mantra off the edge');
    check(r.last?.kind === 'magplask' && r.last.x > 53.9 && r.last.x < 64.8 && r.last.v > 28 && r.pst === 'down', `a belly flop in the pool (${JSON.stringify(r.last)}, ${r.pst})`);
    check(sp && !sp.bomb && sp.v > 28, `the splash (${JSON.stringify(sp)})`);
    await T.shot('takhopp_plask');
    await T.until(() => __game.player.state === 'normal', 5000);

    // 6. With J on the way down: the cannonball.
    await onRoof(T, 74, 63, -Math.PI / 2);
    await T.frames(6);
    await resetSaid(T);
    await T.ev(() => { window.__lastT = __game.roofs.last?.t; });
    await run(T, 30, 63, { stompAt: 3, done: () => { const p = __game.player, l = __game.roofs.last; return l && l.t !== window.__lastT && (p.onGround || p.state !== 'normal'); } });
    await T.frames(2);
    r = await st(T);
    const sp2 = await T.ev(() => window.__splash);
    T.log('cannonball', JSON.stringify(r.last), JSON.stringify(sp2));
    check(r.last?.kind === 'bomb' && r.pst === 'normal' && sp2?.bomb, `a cannonball, no flop (${JSON.stringify(r.last)}, ${JSON.stringify(sp2)})`);

    // 7. A pursuit shuts the stairs.
    await T.ev(() => { const g = __game, l = __lm('takSolLobby'); g.debugWarp(l.x, l.z, l.yaw); });
    await T.frames(4);
    check((await st(T)).prompt.includes('Ta trappan upp'), 'the stairs before the pursuit');
    await T.ev(() => { __game.shame.v = 100; __game.shame.startPursuit(); });
    await T.frames(4);
    r = await st(T);
    check(!r.prompt.includes('Ta trappan'), `no stairs in a pursuit (${r.prompt})`);
    await T.ev(() => __game.shame.endPursuit(false));

    // 8. Between missions (ropavieja's idle): the roofs; a mission start with him up there.
    await T.fresh('&mission=9');
    await resetSaid(T);
    await T.ev(() => { const g = __game, l = __lm('takSolLobby'); g.debugWarp(l.x, l.z, l.yaw); g.cam.yaw = l.yaw; g.cam.snapNext = true; });
    await T.frames(6);
    await T.tap('KeyE');
    await T.until(() => !__game.roofs.busy && __game.player.y > 20, 6000);
    await T.frames(4);
    check((await st(T)).on === 'sol', 'up on SOL DE INVIERNO before ropavieja');
    // The roofs go with any state but idle. A real start's intro stands him by the giver at once, so
    // the state alone first (the runner's 'intro' does nothing by itself): he is put down at the
    // lobby, with no fall.
    await T.ev(() => {
      const R = __game.roofs, put = R.put.bind(R);
      window.__puts = [];
      R.put = (name, up) => { window.__puts.push({ name, up, state: __game.missions.state }); return put(name, up); };
      window.__lands = [];
      __game.missions.state = 'intro';
    });
    await T.frames(5);
    r = await st(T);
    let lands = await T.ev(() => window.__lands.slice()), puts = await T.ev(() => window.__puts.slice());
    const sl = await T.L('takSolLobby');
    T.log('not idle up there', JSON.stringify(r), 'landings', JSON.stringify(lands), 'puts', JSON.stringify(puts));
    check(puts.length === 1 && puts[0].name === 'takSolLobby' && !puts[0].up && puts[0].state === 'intro', `put down at SOL DE INVIERNO's lobby (${JSON.stringify(puts)})`);
    check(r.py < 0.3 && r.pst === 'normal' && r.onGround && !lands.length && Math.abs(r.px - sl.x) < 0.05 && Math.abs(sl.z - r.pz - 2.8) < 0.05, `out of the lobby without a fall (${JSON.stringify(r)})`);
    await T.ev(() => { __game.missions.state = 'idle'; });
    await T.frames(3);
    // And the real start, from up there again.
    await onRoof(T, 98, 60, -Math.PI / 2);
    await T.frames(4);
    await T.ev(() => { window.__lands = []; __game.missions.begin(); });
    await T.until(() => __game.missions.state !== 'idle', 4000);
    await T.frames(5);
    r = await st(T);
    lands = await T.ev(() => window.__lands.slice());
    T.log('mission start up there', JSON.stringify(r), 'landings', JSON.stringify(lands));
    // (The mission's intro then stands him where its scene wants him.)
    check(r.py < 0.3 && r.pst === 'normal' && r.onGround && !lands.length && r.on === null, `down off the roof without a fall (${JSON.stringify(r)})`);
    near = await blocksNear(T);
    const gone = await T.ev(async () => {
      const C = await import('/src/world/collision.js');
      return { roof: +C.groundAt(100, 60, 25, 0.45).toFixed(2), prompt: __game.nearestInteractable()?.it?.id ?? null };
    });
    T.log('in the mission', JSON.stringify(gone), JSON.stringify(near));
    check(!near.some((b) => b.kind === 'roof') && near.filter((b) => b.kind === 'building').every((b) => b.top === 99), 'every slab solid to 99, nothing on the roofs');
    check(near.filter((b) => b.kind === 'tree').every((b) => b.top === 99), 'the palms to 99 again');
    check(gone.roof < 1 && !String(gone.prompt).startsWith('takhopp'), `no roof floor, no stairs (${JSON.stringify(gone)})`);
  },
};
