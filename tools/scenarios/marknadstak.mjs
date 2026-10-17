// Pesetas på marknadstaken – the coin trail over the market's awnings (free roam, DESIGN §10.46;
// feature 92): marknadstak, marknadstakFore.
//   marknadstak: after asnan (index 8). The second ¡SALTA! bounce shade in the lane between rows A and
//                A2 (bounce, top 1.45), the donkey stand's roof (2.9), the trail's 26 coins (minY 2) and,
//                with Stig 25 m off, the roof's four (minY 2.5, tagged). From the ground, a jump under
//                row A or in front of the donkey stand takes none, nor does a car under them. Then the
//                route as a player runs it (W + Shift, Space; a frame hook turns the camera): onto the
//                shade and the bounce, row A west to east, the double jump over the middle aisle, over
//                the lane to A2, the gap to the lone fruit stall and the double jump to the donkey
//                stand's roof: every coin of the trail and the roof's, then "Jävla smålänningar!" from
//                the seller and Stig's "Förlåt, förlåt…". Up there again: "¡No, no, no!", not again
//                within 8 s on the same visit or the next; in a mission nothing.
//   marknadstakFore: before asnan (index 6). No coins on the roof; on it the seller's "¡No, no, no!",
//                no swear; the trail's coins are there.
import { check } from '../lib.mjs';

const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || '?', text, +g.time.toFixed(2)]);
      return o(t, text, secs);
    };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const clearPeds = (T, x, z) => T.ev((x, z) => {
  __game.peds.forEach((ped) => { if (Math.hypot(ped.char.x - x, ped.char.z - z) < 60) ped.char.teleport(x + 300, z + 300); });
}, x, z);
// The market's frame: local (lx, lz) -> world, from the donkey stand's roof (local (6, -1.75)).
const world = async (T) => T.ev(async () => {
  const M = (await import('/src/world/blocks/centre.js')).MARKET, r = M.roof, p = M.pad;
  return { ox: (r.minX + r.maxX) / 2 - 6, oz: (r.minZ + r.maxZ) / 2 + 1.75,
    roof: { minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, top: r.top, kind: r.kind },
    pad: { minX: p.minX, maxX: p.maxX, minZ: p.minZ, maxZ: p.maxZ, top: p.top, kind: p.kind },
    coins: M.coins.length, roofCoins: M.roofCoins.length };
});
const coinState = (T) => T.ev(async () => {
  const { coins } = await import('/src/actors/pickups.js');
  const M = (await import('/src/world/blocks/centre.js')).MARKET;
  const at = (x, y, z) => coins.find((c) => c.fixed && Math.abs(c.x - x) < 0.01 && Math.abs(c.y - y) < 0.01 && Math.abs(c.z - z) < 0.01);
  const trail = M.coins.map(([x, y, z]) => at(x, y, z));
  const roof = __game.awnings.roofCoins || [];
  return {
    trail: trail.filter((c) => c && c.active).length, trailMinY: [...new Set(trail.filter(Boolean).map((c) => c.minY))],
    roof: roof.filter((c) => c.active && c.tag === 'asnetak').length, roofMinY: [...new Set(roof.map((c) => c.minY))], left: __game.awnings.left,
    purse: __game.coins,
  };
});
// Stand him at (x, y, z) facing yaw, the camera behind him (by hand: debugWarp snaps to the ground).
const put = (T, x, y, z, yaw) => T.ev((x, y, z, yaw) => {
  const g = __game, p = g.player;
  if (g.playerCar) g.exitCar(true);
  p.state = 'normal'; p.x = x; p.z = z; p.y = y; p.yaw = yaw;
  p.vx = p.vz = p.vy = 0; p.wishX = p.wishZ = 0; p.onGround = true; g.jumps = 0;
  g.cam.yaw = yaw; g.cam.snapNext = true;
}, x, y, z, yaw);

// For a shot: Stig turned to the street, the camera in front of the stand looking north at him, so the
// seller under the awning's edge is in view below him (from behind, the awning hides the seller).
const front = (T) => T.ev(() => {
  const g = __game, p = g.player;
  p.yaw = 0; g.cam.yaw = Math.PI; g.cam.pitch = 0.4; g.cam.snapNext = true;
});

// The route as a player runs it: legs of { to: [x, z] world, sprint, jump: { axis, past, dir }, dbl,
// next }. A frame hook aims the camera (so W) at the leg's `to` and holds Shift as `sprint` says; once his
// `axis` coordinate is past `past` (in the `dir` sense) on the ground it presses Space, and with `dbl` a
// second Space once he is falling (the double jump at the top). A leg ends `next`: 'bounce' (the shade
// threw him up), 'land' (on his feet after the jump), or within 0.7 m of `to`. Space and Shift are the
// game's own input (input._press), the jumps its own handleOneShots.
async function route(T, legs, timeout = 60000) {
  await T.ev(async (legs) => {
    const g = __game, p = g.player, I = (await import('/src/input.js')).input;
    const r = window.__route = { i: 0, log: [], jumped: false, dbl: false, air: false, done: false, fail: null, rel: [] };
    I._press('KeyW');
    window.__hook = () => {
      for (const k of r.rel) I._release(k);
      r.rel.length = 0;
      if (r.done) return;
      const L = legs[r.i];
      if (!L) { r.done = true; I._release('KeyW'); I._release('ShiftLeft'); return; }
      g.cam.yaw = Math.atan2(L.to[0] - p.x, L.to[1] - p.z);
      if (L.sprint) I._press('ShiftLeft'); else I._release('ShiftLeft');
      const at = { x: p.x, z: p.z };
      if (L.jump && !r.jumped && p.onGround && (L.jump.dir > 0 ? at[L.jump.axis] >= L.jump.past : at[L.jump.axis] <= L.jump.past)) {
        I._press('Space'); r.rel.push('Space'); r.jumped = true; r.air = false;
        r.log.push(['jump', r.i, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]);
      } else if (L.dbl && r.jumped && !r.dbl && !p.onGround && p.vy < 0.5) {
        I._press('Space'); r.rel.push('Space'); r.dbl = true;
        r.log.push(['dbl', r.i, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]);
      }
      if (!p.onGround) r.air = true;
      const near = Math.hypot(L.to[0] - p.x, L.to[1] - p.z) < 0.7;
      const end = L.next === 'bounce' ? p.vy > 10 : L.next === 'land' ? (r.jumped || !L.jump) && r.air && p.onGround : near;
      if (end) {
        r.log.push([L.name, r.i, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]);
        r.i++; r.jumped = false; r.dbl = false; r.air = false;
      }
      if (p.onGround && p.y < 1 && L.high) { r.fail = `fell at leg ${L.name} (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`; r.done = true; I._release('KeyW'); I._release('ShiftLeft'); }
    };
    g.onFrame(window.__hook);
  }, legs);
  try { await T.until(() => window.__route.done, timeout); }
  finally {
    await T.ev(async () => {
      const I = (await import('/src/input.js')).input;
      I._release('KeyW'); I._release('ShiftLeft'); I._release('Space');
      __game.offFrame(window.__hook);
    });
  }
  return T.ev(() => ({ fail: window.__route.fail, i: window.__route.i, log: window.__route.log }));
}

export const SCENARIOS = {
  async marknadstak(T) {
    await T.fresh('&mission=8');
    await resetSaid(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.missions.index === 8 && __game.level === 'island'), 'free roam after asnan');
    const W = await world(T);
    T.log('market', JSON.stringify(W));
    const X = (lx) => W.ox + lx, Z = (lz) => W.oz + lz;
    check(W.pad.kind === 'bounce' && W.pad.top === 1.45 && Math.abs((W.pad.minX + W.pad.maxX) / 2 - X(-24.5)) < 0.01 && Math.abs((W.pad.minZ + W.pad.maxZ) / 2 - Z(-21)) < 0.01,
      'the bounce shade in the lane between rows A and A2 (bounce, top 1.45)');
    check(W.roof.top === 2.9 && W.roof.kind === 'stall', 'the donkey stand\'s roof: the floor at 2.9');
    check(W.coins === 26 && W.roofCoins === 4, `26 trail coins, 4 on the roof (${W.coins}, ${W.roofCoins})`);
    await clearPeds(T, X(0), Z(-10));
    let C = await coinState(T);
    T.log('coins', JSON.stringify(C));
    check(C.trail === 26 && C.trailMinY.length === 1 && C.trailMinY[0] === 2.5, 'the trail placed, minY 2.5');
    check(C.roof === 4 && C.left === 4 && C.roofMinY[0] === 2.5, 'after asnan, with him off, the roof\'s four (minY 2.5)');

    // From the ground: a jump under row A (in the lane) and in front of the donkey stand takes nothing.
    const c0 = C.purse;
    for (const [lx, lz, yaw] of [[-12.5, -23.1, Math.PI], [6.8, 0.6, Math.PI], [-24.5, -18.9, Math.PI]]) {
      await put(T, X(lx), 0.15, Z(lz), yaw);
      await T.frames(3);
      await T.tap('Space');
      await T.sleep(700);
    }
    C = await coinState(T);
    check(C.purse === c0 && C.trail === 26 && C.roof === 4, `jumps from the ground take no coin (${JSON.stringify(C)})`);
    await T.anyCar();
    await T.ev((x, z) => { const c = __game.playerCar; c.place(x, z, Math.PI / 2); c.vx = c.vz = 0; }, X(12.5), Z(-21));
    await T.frames(20);
    await T.ev((x, z) => { const c = __game.playerCar; c.place(x, z, Math.PI / 2); c.vx = c.vz = 0; }, X(12.5), Z(-5.0));
    await T.frames(20);
    C = await coinState(T);
    check(C.purse === c0 && C.trail === 26 && C.roof === 4, `nor a car under them (${JSON.stringify(C)})`);
    await T.ev(() => __game.exitCar(true));

    // The route.
    await resetSaid(T);
    await put(T, X(-30.5), 0.15, Z(-22.0), Math.PI / 2);
    await T.frames(5);
    const c1 = (await coinState(T)).purse;
    await T.shot('marknadstak_start');
    const legs = [
      { name: 'shade', to: [X(-24.5), Z(-21.1)], sprint: false, jump: { axis: 'x', past: X(-27.1), dir: 1 }, next: 'bounce' },
      { name: 'up', to: [X(-24.5), Z(-25.0)], sprint: false, next: 'land' },
      { name: 'rowA', to: [X(-5.6), Z(-25.25)], sprint: true, high: true },
      { name: 'aisle', to: [X(6.5), Z(-25.25)], sprint: true, jump: { axis: 'x', past: X(-4.7), dir: 1 }, dbl: true, next: 'land', high: true },
      { name: 'rowA east', to: [X(11.6), Z(-25.6)], sprint: true, high: true },
      { name: 'turn', to: [X(12.5), Z(-26.6)], sprint: false, high: true },
      { name: 'lane', to: [X(12.5), Z(-16.5)], sprint: true, jump: { axis: 'z', past: Z(-23.9), dir: 1 }, next: 'land', high: true },
      { name: 'A2', to: [X(18.5), Z(-17.9)], sprint: false, jump: { axis: 'x', past: X(14.6), dir: 1 }, high: true },
      { name: 'gap', to: [X(18.5), Z(-7.5)], sprint: true, jump: { axis: 'z', past: Z(-15.25), dir: 1 }, next: 'land', high: true },
      { name: 'fruit', to: [X(20.3), Z(-8.8)], sprint: false, high: true },
      { name: 'to the roof', to: [X(9.0), Z(-2.0)], sprint: true, jump: { axis: 'x', past: X(17.2), dir: -1 }, dbl: true, next: 'land', high: true },
      { name: 'roof', to: [X(5.0), Z(-0.5)], sprint: false, high: true },
    ];
    const R = await route(T, legs);
    T.log('route', JSON.stringify(R));
    const end = await T.ev(() => { const p = __game.player; return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) }; });
    T.log('end', JSON.stringify(end));
    check(!R.fail && R.i === legs.length, `the route run through (${R.fail || 'leg ' + R.i})`);
    check(Math.abs(end.y - 2.9) < 0.01, 'on the donkey stand\'s roof');
    await T.until(() => window.__said.some(([w, l]) => l === 'Jävla smålänningar!'), 8000).catch(() => {});
    await front(T);
    await T.frames(2);
    await T.shot('marknadstak_svordom');
    await T.until(() => window.__said.some(([w, l]) => l === 'Förlåt, förlåt…'), 8000).catch(() => {});
    await T.frames(2);
    await T.shot('marknadstak_forlat');
    C = await coinState(T);
    T.log('coins after', JSON.stringify(C));
    check(C.trail === 0 && C.roof === 0 && C.left === 0 && C.purse === c1 + 30 * 25, `every coin taken: ${C.purse - c1} pta`);
    const s = await said(T);
    T.log('said', JSON.stringify(s));
    const sw = s.find(([w, l]) => w === 'souvenir' && l === 'Jävla smålänningar!'), so = s.find(([w, l]) => w === 'stig' && l === 'Förlåt, förlåt…');
    check(!!sw && !!so && so[2] > sw[2], `the swear, then Stig's sorry (${JSON.stringify(s)})`);
    check(!s.some(([w, l]) => l === '¡No, no, no!'), 'no "¡No, no, no!" while the roof\'s coins were up');
    const A = await T.ev(() => ({ ...__game.awnings.counts, last: __game.awnings.last }));
    T.log('awnings', JSON.stringify(A));
    check(A.swear === 1 && A.sorry === 1, 'one swear, one sorry');

    // Up there again, the roof's coins gone: "¡No, no, no!", once a visit and at most every 8 s.
    await T.sleep(2500);
    await resetSaid(T);
    const nos = async () => (await said(T)).filter(([w, l]) => w === 'souvenir' && l === '¡No, no, no!');
    await put(T, X(6.5), 0.15, Z(4.5), Math.PI);
    await T.frames(6);
    await put(T, X(5.0), 2.9, Z(-0.4), 0);
    await front(T);
    await T.frames(6);
    let n = await nos();
    check(n.length === 1, `on his roof again: "¡No, no, no!" (${JSON.stringify(await said(T))})`);
    await T.shot('marknadstak_nonono');
    await T.tap('Space');
    await T.sleep(700);
    check((await nos()).length === 1, 'a jump on the roof is the same visit');
    await put(T, X(6.5), 0.15, Z(4.5), Math.PI);
    await T.frames(6);
    await put(T, X(8.5), 2.9, Z(-2.6), Math.PI);
    await T.frames(6);
    check((await nos()).length === 1, 'a new visit within 8 s: no second one');
    await put(T, X(6.5), 0.15, Z(4.5), Math.PI);
    await T.ev(() => { __game.awnings.noT -= 9; });
    await T.frames(6);
    await put(T, X(8.5), 2.9, Z(-2.6), Math.PI);
    await T.frames(6);
    n = await nos();
    check(n.length === 2, `8 s on, a new visit: again (${n.length})`);

    // In a mission: nothing.
    await T.sleep(1500);
    await T.startMission();
    await resetSaid(T);
    await put(T, X(6.5), 0.15, Z(4.5), Math.PI);
    await T.frames(6);
    await put(T, X(8.5), 2.9, Z(-2.6), Math.PI);
    await T.sleep(800);
    const m = await said(T);
    T.log('in a mission', await T.state(), JSON.stringify(m));
    check(!m.some(([w]) => w === 'souvenir'), 'in a mission the seller says nothing');
  },

  async marknadstakFore(T) {
    await T.fresh('&mission=6');
    await resetSaid(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.missions.index === 6), 'free roam before asnan');
    const W = await world(T);
    const X = (lx) => W.ox + lx, Z = (lz) => W.oz + lz;
    await clearPeds(T, X(0), Z(-10));
    let C = await coinState(T);
    T.log('coins', JSON.stringify(C));
    check(C.trail === 26 && C.roof === 0 && C.left === 0, 'the trail is there, the roof\'s coins are not');
    await put(T, X(19.5), 2.55, Z(-8.0), -Math.PI / 2 - 0.5);
    await T.frames(4);
    const legs = [
      { name: 'to the roof', to: [X(8.0), Z(-2.0)], sprint: true, jump: { axis: 'x', past: X(17.2), dir: -1 }, dbl: true, next: 'land', high: true },
    ];
    const R = await route(T, legs, 20000);
    T.log('jump', JSON.stringify(R));
    check(!R.fail && R.i === 1 && Math.abs(await T.ev(() => __game.player.y) - 2.9) < 0.01, 'from the lone fruit stall onto the donkey stand\'s roof');
    await front(T);
    await T.sleep(350);
    await T.shot('marknadstak_fore');
    await T.sleep(1200);
    const s = await said(T);
    T.log('said', JSON.stringify(s));
    check(s.some(([w, l]) => w === 'souvenir' && l === '¡No, no, no!'), 'before asnan: "¡No, no, no!"');
    check(!s.some(([w, l]) => l === 'Jävla smålänningar!' || l === 'Förlåt, förlåt…'), 'no swear, no sorry');

    // The roof's coins wait until he is 25 m off (here with `from` lowered for the test).
    await T.ev(() => { const a = __game.awnings; a.cfg = { ...a.cfg, from: 6 }; });
    await T.frames(10);
    check((await coinState(T)).left === 0, 'not placed with him on the roof');
    await put(T, X(6), 0.15, Z(28), 0);
    await T.frames(10);
    C = await coinState(T);
    check(C.left === 4 && C.roof === 4, `placed with him 30 m off (${JSON.stringify(C)})`);

    // Two looks: the shade from the lane, and the trail ahead from row A's FRUTAS stall.
    await put(T, X(-18.0), 0.15, Z(-19.4), -Math.PI / 2);
    await T.ev(() => { __game.cam.pitch = 0.18; });
    await T.frames(8);
    await T.shot('marknadstak_studsmarkis');
    await put(T, X(-26.4), 2.55, Z(-23.8), Math.PI / 2);
    await T.ev(() => { __game.cam.pitch = 0.25; __game.cam.yaw = Math.PI / 2 - 0.2; });
    await T.frames(8);
    await T.shot('marknadstak_spar');
  },
};

