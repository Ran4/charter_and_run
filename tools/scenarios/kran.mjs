// Åk med byggkranen – the building site's tower crane (free roam, DESIGN §10.56; feature 118): kran,
// kranshots.
//   kran: after the end (idle) the crane's parts, the slab's four coins (the island's fixed coins within
//         260) and its corner columns; from the 2nd floor the coins stay up there. The cycle from the
//         rest on the yard: Stig walks onto the pallet (real W), it lifts him (a ride), over 3 m his arms
//         go out and he says the mantra, every mantra.every s; on the way over the frame the pallet
//         swings and he stays put on it, a hop comes down on it; down on the slab he walks off north:
//         the four coins and Angerud's pitch as a toast, once a visit; off the north edge a thud (on his
//         belly, the camera shaken, up with "Jag är inte rädd."); off the slab's south edge to the 2nd
//         floor no thud; off the pallet at 17.6 m a thud, with J held the glide's landing instead. Stig
//         waiting by the yard cuts the rest on the slab short. Nobody else rides it. A pursuit sends
//         the pallet home and holds it there, Stig on it stays on the ground, after it the cycle again.
//         Between missions before the end (index 12): up on the slab, a mission's state puts him down by
//         the yard without a fall; in the mission the pallet is no floor.
//   kranshots: the crane from the street with the pallet up, from the gate, Stig on the pallet from the
//         side at the cruise height, over the frame, the slab from above, the view over Angerud's plot.
import { check } from '../lib.mjs';

const MANTRA = 'Jag kan flyga, jag är inte rädd.';

const st = (T) => T.ev(() => {
  const g = __game, K = g.crane, p = g.player;
  return { move: K.name, t: +K.move.t.toFixed(2), T: +K.move.T.toFixed(2), y: +K.y.toFixed(2), px: +K.px.toFixed(2), pz: +K.pz.toFixed(2),
    sway: +Math.hypot(K.sx, K.sz).toFixed(2), floor: K.floor, homing: K.homing,
    x: +p.x.toFixed(2), py: +p.y.toFixed(2), z: +p.z.toFixed(2), dx: +(p.x - K.px).toFixed(2), dz: +(p.z - K.pz).toFixed(2), pst: p.state,
    onGround: p.onGround, aboard: p.standingOn === K.ride, placate: p.anim.placate, flopped: p.flopped,
    on: K.on, riding: K.riding, rides: K.rides, mantras: K.mantras, thuds: K.thuds, views: K.views, putDowns: K.putDowns, last: K.last,
    coins: g.coins, state: g.missions.state };
});
const said = (T) => T.ev(() => window.__said.slice());
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g); g.say = (t, text, secs) => { window.__said.push(text); return o(t, text, secs); };
    const l = g.onLand.bind(g); g.onLand = (ch, v, y) => { if (ch === g.player) window.__lands.push(+v.toFixed(1)); return l(ch, v, y); };
    const ht = window.__hud = window.__hud || {};
    window.__toasts = [];
    import('/src/game/hud.js').then(({ hud }) => { const t = hud.toast.bind(hud); hud.toast = (text, ...a) => { window.__toasts.push(String(text)); return t(text, ...a); }; ht.ok = true; });
  }
  window.__said = [];
  window.__lands = [];
  window.__toasts = [];
});
// Stig on the pallet by hand, `ox`, `oz` from its middle, the camera behind him facing yaw.
const onPallet = (T, ox = 0, oz = 0, yaw = 0) => T.ev((ox, oz, yaw) => {
  const g = __game, K = g.crane, p = g.player;
  p.state = 'normal'; p.x = K.px + ox; p.z = K.pz + oz; p.y = K.y + 0.42; p.yaw = yaw;
  p.vx = p.vz = p.vy = 0; p.wishX = p.wishZ = 0; p.onGround = true; g.jumps = 0;
  g.cam.yaw = yaw; g.cam.snapNext = true;
}, ox, oz, yaw);
// Held W (and Shift) with the camera kept on (tx, tz) until `done` holds in the page.
async function walk(T, tx, tz, done, { sprint = false, timeout = 8000 } = {}) {
  await T.ev((tx, tz) => { const g = __game, p = g.player; window.__hook = () => { g.cam.yaw = Math.atan2(tx - p.x, tz - p.z); }; g.onFrame(window.__hook); }, tx, tz);
  if (sprint) await T.page.keyboard.down('ShiftLeft');
  await T.page.keyboard.down('KeyW');
  try { await T.until(done, timeout); }
  finally {
    await T.page.keyboard.up('KeyW');
    if (sprint) await T.page.keyboard.up('ShiftLeft');
    await T.ev(() => __game.offFrame(window.__hook));
  }
}
const info = (T) => T.ev(async () => {
  const { CRANE } = await import('/src/world/blocks/nature.js');
  return { mast: CRANE.mast, p0: CRANE.p0, p1: CRANE.p1, slab: { ...CRANE.slab, block: null }, coins: CRANE.coins, meshes: !!CRANE.meshes };
});

export const SCENARIOS = {
  async kran(T) {
    // 0. After the end: the crane, the slab's coins and columns, the cycle at its start.
    await T.fresh('&mission=13');
    await resetSaid(T);
    const C = await info(T);
    const geo = await T.ev(async () => {
      const P = await import('/src/actors/pickups.js'), Co = await import('/src/world/collision.js');
      const fixed = P.coins.filter((c) => c.active && c.fixed && c.x < 2000);
      const slab = fixed.filter((c) => c.x > 172 && c.x < 182 && c.z > -178 && c.z < -168).map((c) => ({ x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2), minY: +c.minY.toFixed(2) }));
      const posts = Co.queryBlocks(171, -179, 183, -167, []).filter((b) => b.kind === 'post').map((b) => ({ x: b.x, z: b.z, top: +b.top.toFixed(2) }));
      const K = __game.crane;
      const ped = __game.peds[0]?.char;
      return { fixed: fixed.length, slab, posts, move: K.name, live: K.live, floor: K.floor, y: K.y,
        npc: K.platformAt(__game.npcs.ole, K.px, K.pz, K.y + 1), ped: ped ? K.platformAt(ped, K.px, K.pz, K.y + 1) : null };
    });
    T.log('crane', JSON.stringify(C), JSON.stringify(geo));
    check(C.meshes && C.mast.x === 186 && C.mast.z === -184 && C.p0.x === 187 && C.p0.z === -166.5 && C.p1.x === 177 && C.p1.z === -173 && C.p1.y === 10.35, `the crane at (186, −184), P0 on the yard, P1 on the slab (${JSON.stringify(C)})`);
    check(geo.fixed <= 260, `the island's fixed coins within 260 (${geo.fixed})`);
    check(geo.slab.length === 4 && geo.slab.every((c) => c.y === 11.1 && c.minY === 10.1 && c.z === -176.9), `four coins along the slab's north edge, minY 10.1 (${JSON.stringify(geo.slab)})`);
    check(geo.posts.length === 4 && geo.posts.every((b) => b.top === 12.75), `the 4th floor's four corner columns solid (${JSON.stringify(geo.posts)})`);
    check(geo.move === 'rest0' && geo.live && geo.floor && Math.abs(geo.y - 0.15) < 1e-6, `the pallet on the yard at the start, a floor (${JSON.stringify(geo)})`);
    check(geo.npc === null && geo.ped === null, 'nobody but Stig stands on it');

    // 1. From the 2nd floor beside the 3rd the coins stay up there (minY), jumps and all.
    await T.ev(() => { const g = __game, p = g.player; g.debugWarp(171.4, -176.9, Math.PI / 2); p.y = 6.95; p.onGround = true; });
    await T.frames(10);
    let r = await st(T);
    check(Math.abs(r.py - 6.95) < 0.05, `on the 2nd floor by the 3rd (${r.py})`);
    const c0 = r.coins;
    for (let k = 0; k < 2; k++) { await T.tap('Space'); await T.frames(14); await T.tap('Space'); await T.sleep(900); }
    r = await st(T);
    check(r.coins === c0, `no slab coin from the 2nd floor (${r.coins - c0} pta)`);

    // 2. The rest on the yard: he walks onto the pallet (real W).
    await T.ev(() => { const g = __game, l = __lm('kranFot'); g.debugWarp(l.x, l.z, l.yaw); g.cam.yaw = l.yaw; g.cam.snapNext = true; g.crane.jump('rest0'); });
    await T.frames(8);
    await T.shot('kran_0_vantar');
    await walk(T, 187, -166.5, () => { const g = __game, p = g.player; return p.standingOn === g.crane.ride && Math.hypot(p.x - g.crane.px, p.z - g.crane.pz) < 0.5; });
    await T.frames(4);
    r = await st(T);
    T.log('on the pallet', JSON.stringify(r));
    check(r.aboard && r.on === 'pallet' && Math.abs(r.py - (r.y + 0.42)) < 0.02 && r.move === 'rest0' && !r.riding, `on the pallet on the yard, a step up (${JSON.stringify(r)})`);
    await T.shot('kran_1_pa');

    // 3. Up: the ride, his arms out and the mantra over 3 m.
    await T.ev(() => { const m = __game.crane.move; m.t = Math.max(m.t, m.T - 0.5); });
    await T.until(() => __game.crane.name === 'up0', 3000);
    await T.until(() => __game.crane.y > 1.2, 6000);
    r = await st(T);
    check(r.riding && r.rides === 1 && r.aboard && !r.placate && !(await said(T)).includes(MANTRA), `riding, low: no arms, no mantra yet (${JSON.stringify(r)})`);
    await T.until(() => __game.crane.y > 3.6, 6000);
    await T.frames(3);
    r = await st(T);
    let s = await said(T);
    check(r.placate === 2 && r.mantras === 1 && s.filter((l) => l === MANTRA).length === 1, `arms out and the mantra over 3 m (${JSON.stringify(r)}, ${JSON.stringify(s)})`);
    await T.until(() => __game.crane.name === 'out', 12000);
    r = await st(T);
    check(r.aboard && Math.abs(r.py - 18.02) < 0.05 && r.mantras >= 2, `at the cruise height, 17.6 m under the pallet (${JSON.stringify(r)})`);
    await T.shot('kran_2_uppe');

    // 4. Over the frame: the pallet swings, he stays put on it; a hop comes down on it.
    const a = await st(T);
    await T.sleep(1500);
    let b = await st(T);
    T.log('slewing', JSON.stringify(a), JSON.stringify(b));
    check(b.aboard && b.sway > 0.2 && Math.hypot(b.dx - a.dx, b.dz - a.dz) < 0.06 && Math.hypot(b.px - a.px, b.pz - a.pz) > 2, `the pallet swings (${b.sway} m) and carries him, his place on it kept`);
    await T.ev(() => { window.__lands = []; });
    await T.tap('Space');
    await T.frames(6);
    const air = await st(T);
    await T.until(() => __game.player.onGround, 3000);
    await T.frames(2);
    b = await st(T);
    T.log('hop', JSON.stringify(air), JSON.stringify(b));
    check(!air.onGround && air.aboard && b.aboard && b.on === 'pallet' && b.thuds === 0 && Math.hypot(b.dx - a.dx, b.dz - a.dz) < 0.25, `a hop on the moving pallet comes down on it (${JSON.stringify(b)})`);
    await T.shot('kran_3_over');

    // 5. Down on the slab, off north: the four coins and the pitch as a toast, once a visit.
    await T.until(() => __game.crane.name === 'rest1', 20000);
    await T.frames(3);
    r = await st(T);
    T.log('on the slab', JSON.stringify(r));
    check(r.aboard && Math.abs(r.y - 10.35) < 0.01 && r.placate !== 2 && Math.hypot(r.px - 177, r.pz + 173) < 0.8, `set down on the slab, his arms in (${JSON.stringify(r)})`);
    const coinsUp = r.coins, mantras = r.mantras;
    await T.shot('kran_4_platta');
    await walk(T, 177, -176.6, () => __game.player.z < -176.2);
    await T.until((c) => __game.coins >= c + 100, 4000, coinsUp).catch(() => {});
    await T.frames(4);
    r = await st(T);
    let toasts = await T.ev(() => window.__toasts.slice());
    T.log('north edge', JSON.stringify(r), JSON.stringify(toasts), 'sling', await T.ev(() => __game.crane && import('/src/world/blocks/nature.js').then((m) => m.CRANE.meshes.sling.visible)));
    check(r.on === 'slab' && r.coins - coinsUp === 100 && r.views === 1 && toasts.includes('Högsta svenska standard och bra läge.') && r.mantras === mantras,
      `the slab's four coins (+${r.coins - coinsUp} pta) and the pitch as a toast, no mantra (${JSON.stringify(toasts)})`);
    await T.shot('kran_5_utsikt');
    await walk(T, 177, -170, () => __game.player.z > -171);
    await walk(T, 177, -176.6, () => __game.player.z < -176.2);
    r = await st(T);
    check(r.views === 1, `once a visit (${r.views})`);

    // 6. Off the north edge to the ground: a thud, up with his line.
    await resetSaid(T);
    await walk(T, 177, -182, () => !__game.player.onGround && __game.player.z < -178);
    await T.until(() => __game.player.state !== 'normal' || __game.player.onGround, 4000);
    await T.frames(2);
    r = await st(T);
    T.log('fell off the slab', JSON.stringify(r));
    check(r.thuds === 1 && r.pst === 'down' && r.flopped && r.last && Math.abs(r.last.drop - 10.2) < 0.1 && r.py < 0.2, `a thud on the ground, on his belly (${JSON.stringify(r)})`);
    await T.shot('kran_6_duns');
    await T.until(() => __game.player.state === 'normal', 4000);
    await T.sleep(700);
    s = await said(T);
    check(s.includes('Jag är inte rädd.'), `up with "Jag är inte rädd." (${JSON.stringify(s)})`);

    // 7. Off the slab's south edge to the 2nd floor (3.4 m): no thud.
    await T.ev(() => { const g = __game, p = g.player; p.x = 177; p.z = -170; p.y = 10.35; p.vy = 0; p.onGround = true; g.cam.yaw = 0; g.cam.snapNext = true; });
    await T.frames(6);
    check((await st(T)).on === 'slab', 'back on the slab');
    await walk(T, 177, -164, () => __game.player.onGround && __game.player.z > -167.5 && __game.player.y < 8);
    await T.frames(4);
    r = await st(T);
    check(r.thuds === 1 && r.pst === 'normal' && Math.abs(r.py - 6.95) < 0.05, `down on the 2nd floor, no thud (${JSON.stringify(r)})`);

    // 8. Off the pallet at the cruise height: a thud; with J held the glide's landing instead.
    await T.ev(() => __game.crane.jump('out'));
    await onPallet(T, 0, 0, Math.PI / 2);
    await T.frames(10);
    check((await st(T)).aboard, 'on the pallet up there');
    await walk(T, 210, -166.5, () => !__game.player.onGround && __game.player.standingOn !== __game.crane.ride);
    await T.until(() => __game.player.state !== 'normal' || __game.player.onGround, 5000);
    await T.frames(2);
    r = await st(T);
    T.log('off the pallet', JSON.stringify(r));
    check(r.thuds === 2 && r.pst === 'down' && r.last.drop > 17 && r.last.v > 25, `a thud from 17.6 m (${JSON.stringify(r.last)})`);
    await T.until(() => __game.player.state === 'normal', 4000);
    await T.ev(() => { __game.unlocked.add('bodega'); __game.crane.jump('out'); });   // the glide's unlock (julafton)
    await onPallet(T, 0, 0, Math.PI / 2);
    await T.frames(10);
    await walk(T, 210, -166.5, () => !__game.player.onGround && __game.player.standingOn !== __game.crane.ride);
    await T.page.keyboard.down('KeyJ');
    await T.until(() => __game.glide.on, 3000).catch(() => {});
    const gl = await T.ev(() => __game.glide.on);
    await T.until(() => __game.player.onGround || __game.player.state !== 'normal', 15000);
    await T.page.keyboard.up('KeyJ');
    await T.frames(3);
    r = await st(T);
    T.log('glide off the pallet', gl, JSON.stringify(r), JSON.stringify(await T.ev(() => __game.glide.last)));
    check(gl && r.thuds === 2, `the glide off the pallet, no thud (${gl}, ${r.thuds})`);
    await T.until(() => __game.player.state === 'normal', 6000);

    // 9. Stig waiting on the yard cuts the rest on the slab short.
    await T.ev(() => { const g = __game, l = __lm('kranFot'); g.debugWarp(l.x, l.z, l.yaw); g.crane.jump('rest1'); });
    await T.until(() => __game.crane.name === 'up1', 4000);
    r = await st(T);
    check(r.move === 'up1', 'the rest on the slab cut short for him');

    // 10. A pursuit: the pallet home to the yard and held there; after it the cycle again.
    await T.ev(() => { __game.crane.jump('out'); const m = __game.crane.move; m.t = m.T * 0.5; });
    await T.frames(3);
    // Forced (no escape by distance), with nobody chasing him (the Land Rovers gone, the officer kept
    // off): only the crane's answer is tested.
    await T.ev(() => {
      const g = __game, sh = g.shame;
      window.__chase = sh.officerChase; sh.officerChase = () => {};
      sh.v = 100; sh.startPursuit(); sh.forced = true;
      for (const h of sh.pursuers) g.removeCar(h);
      sh.pursuers = [];
      window.__moves = []; window.__mv = () => { const n = __game.crane.name; if (window.__moves[window.__moves.length - 1] !== n) window.__moves.push(n); }; __game.onFrame(window.__mv); });
    await T.until(() => __game.crane.name === 'hold', 25000);
    await T.frames(2);   // the move hook runs at the start of a frame
    r = await st(T);
    let moves = await T.ev(() => window.__moves.slice());
    T.log('pursuit', JSON.stringify(moves), JSON.stringify(r));
    check(r.homing && moves.filter((m, i) => i || m !== 'out').join(',') === 'back,down0,hold' && Math.abs(r.y - 0.15) < 1e-6 && Math.hypot(r.px - 187, r.pz + 166.5) < 0.9, `home to the yard and held (${moves})`);
    await T.ev(() => { const g = __game, p = g.player; g.debugWarp(185, -166.5, Math.PI / 2); });
    await walk(T, 187, -166.5, () => __game.player.standingOn === __game.crane.ride && Math.abs(__game.player.x - __game.crane.px) < 0.5);
    await T.sleep(2500);
    r = await st(T);
    check(r.move === 'hold' && r.aboard && r.py < 0.6, `on it in the pursuit: it stays on the ground (${JSON.stringify(r)})`);
    check(await T.ev(() => __game.shame.pursuit), 'still in the pursuit');
    await T.ev(() => { const sh = __game.shame; sh.endPursuit(false); sh.officerChase = window.__chase; sh.clear(); });
    await T.frames(4);
    r = await st(T);
    await T.ev(() => __game.offFrame(window.__mv));
    check(!r.homing && r.move === 'rest0', `after it the cycle again from the yard (${JSON.stringify(r)})`);

    // 11. Between missions before the end: up on the slab, a mission's state puts him down by the yard.
    await T.fresh('&mission=12');
    await resetSaid(T);
    await T.ev(() => { const g = __game, p = g.player; p.x = 177; p.z = -174; p.y = 10.35; p.vx = p.vz = p.vy = 0; p.onGround = true; g.cam.snapNext = true; g.crane.jump('rest0'); });
    await T.frames(8);
    r = await st(T);
    check(r.on === 'slab' && r.floor && r.state === 'idle', `on the slab before julafton (${JSON.stringify(r)})`);
    await T.ev(() => { __game.missions.state = 'intro'; });
    await T.frames(5);
    r = await st(T);
    const foot = await T.L('kranFot');
    let lands = await T.ev(() => window.__lands.slice());
    T.log('not idle up there', JSON.stringify(r), JSON.stringify(lands));
    check(r.putDowns === 1 && r.py < 0.3 && r.onGround && !lands.length && Math.hypot(r.x - foot.x, r.z - foot.z) < 0.05 && !r.floor, `put down by the yard, no fall, the pallet no floor (${JSON.stringify(r)})`);
    await T.ev(() => { __game.missions.state = 'idle'; });
    await T.frames(3);
    // In the real mission the pallet is no floor for him.
    await T.ev(() => __game.missions.begin());
    await T.until(() => __game.missions.state !== 'idle', 4000);
    await T.frames(5);
    const inMission = await T.ev(() => { const K = __game.crane; return { floor: K.floor, hit: K.platformAt(__game.player, K.px, K.pz, K.y + 1) }; });
    check(!inMission.floor && inMission.hit === null, `in the mission the pallet is no floor (${JSON.stringify(inMission)})`);
  },

  async kranshots(T) {
    await T.fresh('&mission=13');
    const cut = (eye, look) => T.ev((e, l) => { __game.cam.cutTo({ x: e[0], y: e[1], z: e[2] }, { x: l[0], y: l[1], z: l[2] }); }, eye, look);
    // The crane from the east street, the pallet on its way up, and from the gate.
    await T.ev(() => { const g = __game, l = __lm('kranFot'); g.debugWarp(l.x, l.z, l.yaw); g.crane.jump('up0'); const m = g.crane.move; m.t = m.T * 0.6; });
    await T.frames(4);
    await cut([214, 6, -150], [186, 16, -176]);
    await T.frames(10);
    await T.shot('kranshots_gatan');
    await T.ev(() => __game.cam.release());
    await T.ev(() => { const g = __game, l = __lm('bygge'); g.debugWarp(l.x, l.z, l.yaw); g.cam.yaw = l.yaw; g.cam.snapNext = true; g.crane.jump('down0'); const m = g.crane.move; m.t = m.T * 0.7; });
    await T.frames(4);
    await cut([158, 4.5, -126], [182, 7, -166]);
    await T.frames(10);
    await T.shot('kranshots_grinden');
    await T.ev(() => __game.cam.release());
    // Stig on the pallet at the cruise height, from the side, and in the chase camera over the frame.
    await T.ev(() => __game.crane.jump('out'));
    await onPallet(T, -0.3, 0, Math.PI * 1.25);
    await T.frames(30);
    const k = await T.ev(() => ({ x: __game.crane.px, y: __game.crane.y, z: __game.crane.pz }));
    await cut([k.x + 7, k.y + 3, k.z + 5], [k.x, k.y + 1.6, k.z]);
    await T.frames(8);
    await T.shot('kranshots_sidan');
    await T.ev(() => __game.cam.release());
    await T.frames(40);
    await T.shot('kranshots_over');
    // Down on the slab: from above, and the view over Angerud's plot from its north edge.
    await T.until(() => __game.crane.name === 'rest1', 20000);
    await cut([168, 22, -160], [177, 10.5, -173]);
    await T.frames(8);
    await T.shot('kranshots_plattan');
    await T.ev(() => __game.cam.release());
    await T.ev(() => { const g = __game, p = g.player; p.x = 177; p.z = -176.4; p.y = 10.35; p.vy = 0; p.onGround = true; p.yaw = Math.PI; g.cam.yaw = Math.PI; g.cam.snapNext = true; });
    await T.frames(30);
    await T.shot('kranshots_utsikt');
  },
};
