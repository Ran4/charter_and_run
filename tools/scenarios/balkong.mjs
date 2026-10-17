// Balkongerna lever (free roam, DESIGN §10.42; feature 77): balkong, balkongshots.
//   balkong:      at index 6 (free roam, the clock held at 15:00, siesta): the 52 slabs' balcony rows
//                 exported (a spot a unit and floor, on the balcony's floor); the residents drawn from
//                 their own seed (a señora, the mirror tourist, Swedes); at most `max` bodies, on the
//                 occupied balconies nearest Stig, placed by hand on the spot (never stepped, never in
//                 allChars). In front of a slab: the Swedes wave, one calls "Hallå där nere! Är du också
//                 från Sverige?", the mirror tourist (the mirror pose) asks "Kallar ni det här för
//                 havsutsikt?". His horn in a car before the señora's balcony: "¡Silencio! ¡Siesta!", her
//                 broom up, a slipper on an arc onto the car's roof, off it and down beside the car, Stig's
//                 "Förlåt!", the Swedes laugh; no SKANDAL, no pursuit, nobody flung. On foot a smashed pot
//                 by the entrance: the slipper on his head (his squash). Not at siesta (10:00): the horn
//                 makes the Swedes wave, the señora says nothing. His car left with its wheels on the
//                 sidewalk: "Här nere parkerar de hursomhelst." from a neighbour; left on the road: no
//                 line. At night (02:00) nobody on the balconies; a mission start takes every resident and
//                 slipper away; the flight level has none.
//   balkongshots: the same street as pictures: the residents from across the street, the slipper in
//                 the air, the parked car's line, and a contact sheet of the poses up close.
import { check } from '../lib.mjs';

const PI = Math.PI;

async function spies(T) {
  await T.ev(() => {
    const g = __game;
    window.__said = [];
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.res ? 'res:' + t.res.rec?.role : t?.key || 'x', text, +g.time.toFixed(2)]); return say(t, text, secs); };
  });
}
const said = (T) => T.ev(() => window.__said.slice());
const clearSaid = (T) => T.ev(() => { window.__said.length = 0; });
const cfg = (T) => T.ev(async () => (await import('/src/content/index.js')).BALKONG);

// The showcase slab: one with a señora, the mirror tourist and a Swede, nearest (x, z).
const pickLot = (T, x, z) => T.ev((x, z) => {
  const R = __game.residents;
  R.recs ??= R.build();
  const by = new Map();
  for (const r of R.recs) { if (!by.has(r.lot)) by.set(r.lot, []); by.get(r.lot).push(r); }
  let best = null, bd = 1e9;
  for (const [lot, rs] of by) {
    const roles = new Set(rs.map((r) => r.role));
    if (!roles.has('senora') || !roles.has('mirror') || !roles.has('sv')) continue;
    const d = Math.hypot(lot.x - x, lot.z - z);
    if (d < bd) { bd = d; best = lot; }
  }
  return { id: best.id, x: best.x, z: best.z, yaw: best.yaw, w: best.w, floors: best.floors, recs: by.get(best).map((r) => ({ i: r.i, role: r.role, fl: r.spot.fl, u: r.spot.u, x: r.spot.x, y: r.spot.y, z: r.spot.z })) };
}, x, z);
// A point `out` m out from the lot's balcony line (towards the street) and `side` m along it (to the
// street-facer's left).
const at = (L, out, side = 0) => {
  const nx = Math.sin(L.yaw), nz = Math.cos(L.yaw);
  return { x: L.x + nx * out + nz * side, z: L.z + nz * out - nx * side };
};
// The sidewalk in front of the slab: `in` (its inner edge) and `kerb`, in metres out from the balcony
// line (layout.sidewalkAt along the façade's normal).
const kerbOf = (T, L) => T.ev(async (L) => {
  const { sidewalkAt } = await import('/src/world/layout.js');
  const nx = Math.sin(L.yaw), nz = Math.cos(L.yaw);
  let inner = null;
  for (let d = 0; d < 20; d += 0.05) {
    const on = !!sidewalkAt(L.x + nx * d, L.z + nz * d);
    if (on && inner == null) inner = d;
    if (!on && inner != null) return { in: +inner.toFixed(2), kerb: +d.toFixed(2) };
  }
  return null;
}, L);
const clearPeds = (T, x, z) => T.ev((x, z) => {
  __game.peds.forEach((ped) => { if (Math.hypot(ped.char.x - x, ped.char.z - z) < 45) ped.char.teleport(x + 300, z + 300); });
}, x, z);
async function stand(T, x, z, yaw, cam = 0) {
  await T.ev((x, z, yaw, cam) => {
    const g = __game, p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.teleport(x, z, yaw);
    p.vx = p.vz = 0;
    g.cam.yaw = yaw + cam; g.cam.snapNext = true;
  }, x, z, yaw, cam);
  await T.frames(8);
}
// His car (a small hire-car type, entered on the spot) at (x, z) facing yaw, at rest.
const drive = (T, x, z, yaw) => T.ev((x, z, yaw) => {
  const g = __game, p = g.player;
  let car = g.playerCar;
  if (!car) {
    car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && !c.spec.pigs && !c.spec.toy && c.spec.len < 5 && !c.name);
    car.place(x, z, yaw);   // where it is to stand first: on its old spot it could smash a pot (SKANDAL)
    p.teleport(x + Math.cos(yaw) * 2, z - Math.sin(yaw) * 2, yaw);
    g.enterCar(car);
  }
  car.place(x, z, yaw);
  car.vx = car.vz = 0;
  g.cam.yaw = yaw; g.cam.snapNext = true;
  return car.id ?? g.cars.indexOf(car);
}, x, z, yaw);
const snap = (T) => T.ev(() => {
  const g = __game, R = g.residents;
  return { bodies: R.snapshot(), made: R.made, spare: R.spare.length, counts: { ...R.counts }, last: R.last, shoes: R.shoes.map((s) => ({ phase: s.phase, y: +s.mesh.position.y.toFixed(2) })), on: R.on };
});
const waitLast = (T, kind, ms = 6000) => T.until((k) => __game.residents.last?.kind === k, ms, kind).then(() => true, () => false);
const frame = (T, L, out, up, lookUp) => T.ev((a, b) => __game.cam.cutTo(a, b), { ...at(L, out), y: up }, { ...at(L, 0), y: lookUp });
const release = (T) => T.ev(() => __game.cam.release());

async function setup(T) {
  await T.fresh('&mission=6');
  await spies(T);
  await T.sleep(1200);
  check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');
  // The north row of block (4,4), seen from the north street (z 40) in the idea's pictures.
  const L = await pickLot(T, 33, 46);
  L.sw = await kerbOf(T, L);
  T.log('lot', L.id, 'w', L.w.toFixed(1), 'floors', L.floors, 'sidewalk', JSON.stringify(L.sw), JSON.stringify(L.recs.map((r) => [r.role, r.fl, r.u])));
  check(!!L.sw, 'the sidewalk in front of the slab');
  return L;
}

export const SCENARIOS = {
  async balkong(T) {
    const c = await cfg(T);
    const L = await setup(T);

    // 0. The balcony rows: 52 slabs, a spot a unit and floor on the balcony's floor (CURB + fl·2.9 + 0.02).
    const geo = await T.ev(async () => {
      const { balconyLots } = await import('/src/world/town.js');
      const { groundAt } = await import('/src/world/collision.js');
      let spots = 0, badY = 0, onGround = 0;
      for (const l of balconyLots) for (const s of l.spots) {
        spots++;
        if (Math.abs(s.y - (0.15 + s.fl * 2.9 + 0.02)) > 1e-6 || s.fl < 1 || s.fl >= l.floors) badY++;
        if (groundAt(s.x, s.z, s.y + 2, 0.6) > 0.2) onGround++;   // a spot over a solid would be inside the slab
      }
      const R = __game.residents, roles = {};
      for (const r of R.recs) roles[r.role] = (roles[r.role] || 0) + 1;
      return { lots: balconyLots.length, ids: new Set(balconyLots.map((l) => l.id)).size, spots, badY, onGround, recs: R.recs.length, roles };
    });
    T.log('geo', JSON.stringify(geo));
    check(geo.lots === 52 && geo.ids === 52, `52 slabs with balcony rows (${geo.lots})`);
    check(geo.badY === 0, `every spot on a balcony floor (${geo.badY} off)`);
    check(geo.onGround === 0, `no spot inside a solid (${geo.onGround})`);
    check(geo.recs >= 52 * c.perLot[0] && geo.recs <= 52 * c.perLot[1] && geo.roles.senora > 10 && geo.roles.mirror > 5 && geo.roles.sv > 52, `residents drawn (${JSON.stringify(geo.roles)})`);
    // The same draw again (its own seed, not the town's).
    const again = await T.ev(() => { const R = __game.residents, b = R.build(); return b.every((r, i) => r.role === R.recs[i].role && r.spot === R.recs[i].spot && r.seed === R.recs[i].seed); });
    check(again, 'the residents\' draw is fixed by its seed');

    // 1. On the sidewalk in front of the slab: bodies on the nearest occupied balconies.
    const p0 = at(L, (L.sw.in + L.sw.kerb) / 2, 3);
    await clearPeds(T, p0.x, p0.z);
    await stand(T, p0.x, p0.z, L.yaw + PI);
    await T.sleep(1500);
    let S = await snap(T);
    T.log('bodies', S.bodies.length, 'made', S.made, JSON.stringify(S.bodies.map((b) => [b.role, b.lot, b.fl, b.d])));
    check(S.bodies.length > 0 && S.bodies.length <= c.max && S.made <= c.max, `bodies near (${S.bodies.length}, made ${S.made})`);
    const mine = S.bodies.filter((b) => b.lot === L.id);
    check(mine.length === L.recs.length, `every resident of the slab has a body (${mine.length}/${L.recs.length})`);
    const placed = await T.ev(() => {
      const g = __game, R = g.residents, all = g.allChars();
      return R.bodies.map((ch) => {
        const s = ch.res.rec.spot;
        return { on: Math.hypot(ch.x - s.x, ch.z - s.z) < 1e-6 && Math.abs(ch.y - s.y) < 1e-6 && Math.abs(ch.root.position.y - s.y) < 1e-6, visible: ch.root.visible, state: ch.state, hit: all.includes(ch), held: ch.def.held || null, role: ch.res.rec.role, mirror: ch.anim.mirror };
      });
    });
    check(placed.every((b) => b.on && b.visible && b.state === 'normal'), `each body on its spot, shown (${JSON.stringify(placed.filter((b) => !b.on || !b.visible))})`);
    check(placed.every((b) => !b.hit), 'no resident among the characters cars and kicks can hit');
    check(placed.every((b) => (b.role === 'senora') === (b.held === 'broom') && (b.role === 'mirror') === (b.held === 'mirror') && b.mirror === (b.role === 'mirror')), `the señora's broom, the mirror tourist's mirror held out (${JSON.stringify(placed.map((b) => [b.role, b.held, b.mirror]))})`);
    // Their bodies stay where they are put: a second later, not one has moved.
    await T.sleep(1000);
    const still = await T.ev(() => __game.residents.bodies.every((ch) => { const s = ch.res.rec.spot; return Math.hypot(ch.x - s.x, ch.z - s.z) < 1e-6 && ch.y === s.y; }));
    check(still, 'never stepped: no body has fallen or moved off its balcony');

    // 2. The greeting: waves, the call down and the sea view (each the session's first: always).
    await T.until(() => __game.residents.counts.call > 0 && __game.residents.counts.sea > 0, 16000).catch(() => {});
    S = await snap(T);
    let L1 = await said(T);
    T.log('greet', JSON.stringify(S.counts), JSON.stringify(L1));
    check(S.counts.wave > 0, 'the Swedes wave at him');
    check(L1.some(([w, t]) => w === 'res:sv' && t === c.call), `a Swede calls "${c.call}"`);
    check(L1.some(([w, t]) => w === 'res:mirror' && t === c.sea), `the mirror tourist asks "${c.sea}"`);
    const calls = L1.filter(([w]) => w.startsWith('res:')).map((l) => l[2]);
    check(calls.length < 2 || calls[1] - calls[0] >= c.callEvery - 0.05, `at most a call every ${c.callEvery} s (${calls})`);
    // Turned to him (within turnMax of the façade): the Swedes in front.
    const turn = await T.ev(() => {
      const R = __game.residents, f = __game.focus();
      return R.bodies.filter((ch) => ch.res.rec.role === 'sv' && R.near(ch.res.rec, f.x, f.z) < 20).map((ch) => +Math.atan2(Math.sin(ch.yaw - ch.res.rec.lot.yaw), Math.cos(ch.yaw - ch.res.rec.lot.yaw)).toFixed(2));
    });
    T.log('turn', JSON.stringify(turn));
    check(turn.length && turn.every((a) => Math.abs(a) <= c.turnMax + 1e-6) && turn.some((a) => Math.abs(a) > 0.05), `the Swedes turned to him, at most ${c.turnMax} off the façade (${turn})`);

    // 3. At siesta (15:00, the held clock): his horn in a car before the señora's balcony.
    const sen = L.recs.find((r) => r.role === 'senora');
    const shame0 = await T.ev(() => __game.shame.v);
    const road = at(L, L.sw.kerb + 2.75, 0);
    await drive(T, road.x, road.z, L.yaw + PI / 2);
    await T.frames(10);
    await clearSaid(T);
    await T.tap('KeyH');
    check(await waitLast(T, 'yell', 3000), 'the señora yells at the horn');
    S = await snap(T);
    T.log('yell', JSON.stringify(S.last));
    check(S.last.i === sen.i && S.last.why === 'horn', `the slab's señora (${JSON.stringify(S.last)}, ${sen.i})`);
    const yellPose = await T.ev(() => { const ch = __game.residents.bodies.find((b) => b.res.rec.role === 'senora' && b.res.yellT > 0); return ch ? { yell: ch.anim.yell, oath: ch.anim.oath } : null; });
    check(yellPose?.yell && yellPose?.oath, 'her mouth wide, her broom up');
    check(await waitLast(T, 'throw', 3000), 'she throws a slipper');
    check(await waitLast(T, 'hit', 4000), 'the slipper comes down');
    S = await snap(T);
    check(S.last.car === true, 'on the car\'s roof');
    check(await waitLast(T, 'sorry', 3000), 'Stig says sorry');
    await T.sleep(1500);
    S = await snap(T);
    L1 = await said(T);
    T.log('siesta', JSON.stringify(S.counts), JSON.stringify(S.shoes), JSON.stringify(L1));
    check(L1.some(([w, t]) => w === 'res:senora' && t === c.yell), `"${c.yell}"`);
    check(L1.some(([w, t]) => w === 'stig' && t === c.sorry), `Stig: "${c.sorry}"`);
    check(S.counts.laugh > 0, 'the Swedes laugh');
    const car = await T.ev(() => { const c = __game.playerCar; return { x: c.x, z: c.z, yaw: c.yaw, wid: c.spec.wid }; });
    check(S.shoes.length === 1 && S.shoes[0].phase === 'rest' && S.shoes[0].y < 0.3, `the slipper lies on the ground (${JSON.stringify(S.shoes)})`);
    const off = await T.ev((car) => { const m = __game.residents.shoes[0].mesh.position; return Math.abs((m.x - car.x) * Math.cos(car.yaw) - (m.z - car.z) * Math.sin(car.yaw)); }, car);
    check(off > car.wid / 2, `beside the car, not under it (${off.toFixed(2)} m off its middle)`);
    const after = await T.ev(() => ({ shame: __game.shame.v, pursuit: !!__game.shame.pursuit, p: __game.player.state }));
    check(Math.abs(after.shame - shame0) < 1e-6 && !after.pursuit, `no SKANDAL (${shame0} -> ${after.shame}), no pursuit`);
    // A second press within `every` s: she does not throw again.
    await T.tap('KeyH');
    await T.sleep(800);
    S = await snap(T);
    check(S.counts.yell === 1, `at most every ${c.every} s (${S.counts.yell} yells)`);

    // 4. On foot at siesta, a pot by the entrance smashed: the slipper on his head.
    await T.sleep(c.every * 1000);
    const near = await T.ev(async (x, z) => {
      const P = await import('/src/world/props.js');
      const list = P.propsNear(x, z, 9).filter((p) => p.alive && !p.def.carOnly).map((p) => ({ type: p.type, x: p.x, z: p.z }));
      return list;
    }, L.x, L.z);
    T.log('props by the slab', JSON.stringify(near.map((p) => p.type)));
    const target = near.find((p) => p.type === 'palmkruka') || near[0];
    check(!!target, 'a prop to smash by the slab');
    await stand(T, target.x + Math.sin(L.yaw) * 1.4, target.z + Math.cos(L.yaw) * 1.4, L.yaw + PI);
    await clearSaid(T);
    await T.ev(async (x, z) => {
      const g = __game, P = await import('/src/world/props.js');
      const p = P.propsNear(x, z, 0.5).find((p) => p.alive);
      g.breakProp(p, 1, 0, null);
    }, target.x, target.z);
    check(await waitLast(T, 'hit', 6000), 'on foot: the slipper comes down');
    S = await snap(T);
    check(S.last.car === false, 'on his head');
    const sq = await T.ev(() => __game.player.model.squash);
    check(sq > 0, `his head squashed (${sq})`);
    check(await waitLast(T, 'sorry', 3000), 'Stig says sorry again');
    L1 = await said(T);
    check(L1.some(([w, t]) => w === 'res:senora' && t === c.yell), 'her yell at the smash');
    check(await T.ev(() => __game.player.state === 'normal'), 'he is not knocked over');

    // 5. Not siesta (10:00): the horn waves the Swedes, the señora is quiet.
    await T.sleep(c.every * 1000);
    await T.ev(() => __game.day.set(10));
    await drive(T, road.x, road.z, L.yaw + PI / 2);
    await T.frames(10);
    await clearSaid(T);
    const w0 = (await snap(T)).counts.wave, y0 = (await snap(T)).counts.yell;
    await T.tap('KeyH');
    await T.sleep(1500);
    S = await snap(T);
    L1 = await said(T);
    check(S.counts.yell === y0 && !L1.some(([w]) => w === 'res:senora'), 'no siesta: no yell');
    check(S.counts.wave > w0, `the horn waves the Swedes (${w0} -> ${S.counts.wave})`);
    await T.ev(() => __game.day.set(15));

    // 6. His car left with its wheels on the sidewalk: a neighbour's comment; on the road: none.
    const curb = at(L, L.sw.kerb - 0.2, -2);
    await drive(T, road.x + 0, road.z + 0, L.yaw + PI / 2);
    await T.ev((x, z, yaw) => { const c = __game.playerCar; c.place(x, z, yaw); c.vx = c.vz = 0; }, curb.x, curb.z, L.yaw + PI / 2 + 0.35);
    await T.frames(6);
    const wheels = await T.ev(() => __game.lapp.wheelsOn(__game.playerCar).n);
    await clearSaid(T);
    await T.ev(() => __game.exitCar());
    await T.sleep(1200);
    L1 = await said(T);
    S = await snap(T);
    T.log('park', wheels, JSON.stringify(S.last), JSON.stringify(L1));
    check(wheels >= c.park.wheels, `the car's wheels on the sidewalk (${wheels})`);
    check(L1.some(([w, t]) => w === 'res:sv' && t === c.park.line), `a Swede: "${c.park.line}"`);
    check(L1.filter(([w]) => w.startsWith('res:')).length === 1, 'one resident line at a time');
    await T.ev(() => { const g = __game; g.residents.parkT = -Infinity; });
    await drive(T, road.x, road.z, L.yaw + PI / 2);
    await T.frames(6);
    await clearSaid(T);
    await T.ev(() => __game.exitCar());
    await T.sleep(1200);
    L1 = await said(T);
    check(!L1.some(([, t]) => t === c.park.line), 'a car left on the road: no comment');

    // 7. Night (02:00): nobody on the balconies (after a cut).
    await T.ev(() => __game.day.set(2));
    await stand(T, p0.x + 40, p0.z + 40, 0);
    await stand(T, p0.x, p0.z, L.yaw + PI);
    await T.sleep(1500);
    S = await snap(T);
    check(S.bodies.length === 0, `nobody out at night (${S.bodies.length})`);
    await T.ev(() => __game.day.set(15));
    await stand(T, p0.x + 40, p0.z + 40, 0);
    await stand(T, p0.x, p0.z, L.yaw + PI);
    await T.sleep(1500);
    S = await snap(T);
    check(S.bodies.length > 0, 'out again by day');

    // 8. A mission start takes everyone away; the flight level has none.
    await T.startMission();
    S = await snap(T);
    const hidden = await T.ev(() => __game.residents.spare.every((ch) => !ch.root.visible && ch.state === 'hidden'));
    check(S.bodies.length === 0 && hidden && S.shoes.length === 0, `a mission: nobody on the balconies (${S.bodies.length}, spare hidden ${hidden})`);
    await T.fresh('&mission=1');
    await T.sleep(800);
    S = await snap(T);
    check(await T.ev(() => __game.level === 'flight') && S.bodies.length === 0 && S.made === 0, 'the flight level: none');
    T.log('balkong ok');
  },

  async balkongshots(T) {
    const L = await setup(T);
    const p0 = at(L, (L.sw.in + L.sw.kerb) / 2, 3);
    await clearPeds(T, p0.x, p0.z);
    // The residents from across the street.
    await stand(T, p0.x, p0.z, L.yaw + PI);
    await T.sleep(1500);
    await frame(T, L, 20, 2.2, 6.5);
    await T.sleep(1500);
    await T.shot('balk_street');
    await frame(T, L, 11, 3.5, 7.5);
    await T.sleep(400);
    await T.shot('balk_near');
    await release(T);
    // The horn, the slipper in the air (the game held while the shot is taken).
    const road = at(L, L.sw.kerb + 2.75, 0);
    await drive(T, road.x, road.z, L.yaw + PI / 2);
    await T.frames(10);
    await T.ev((a, b) => __game.cam.cutTo(a, b), { ...at(L, 19, -6), y: 3.2 }, { ...at(L, 4, 0), y: 5 });
    await T.sleep(500);
    await T.tap('KeyH');
    await T.until(() => { const s = __game.residents.shoes[0]; return s && s.phase === 'fly' && s.t > s.T * 0.7; }, 5000);
    await T.ev(() => { __game.paused = true; });
    T.log('slipper on screen', JSON.stringify(await T.ev(async () => { const { camera } = await import('/src/gfx.js'); const s = __game.residents.shoes[0], v = s.mesh.position.clone().project(camera); return { k: +(s.t / s.T).toFixed(2), px: [Math.round((v.x + 1) * 640), Math.round((1 - v.y) * 360)] }; })));
    await T.shot('balk_slipper');
    await T.ev(() => { __game.paused = false; });
    await T.until(() => __game.residents.last?.kind === 'sorry', 5000);
    await T.sleep(250);
    await T.ev(() => { __game.paused = true; });
    await T.shot('balk_sorry');
    await T.ev(() => { __game.paused = false; });
    await release(T);
    // The parked car's line.
    await T.sleep(1500);
    const curb = at(L, L.sw.kerb - 0.2, -2);
    await T.ev((x, z, yaw) => { const c = __game.playerCar; c.place(x, z, yaw); c.vx = c.vz = 0; }, curb.x, curb.z, L.yaw + PI / 2 + 0.35);
    await T.frames(6);
    await T.ev(() => __game.exitCar());
    await T.until(() => __game.residents.last?.kind === 'park', 4000).catch(() => {});
    await T.ev((a, b) => __game.cam.cutTo(a, b), { ...at(L, 18, 5), y: 2.6 }, { ...at(L, 4, -1), y: 3.5 });
    await T.sleep(300);
    await T.shot('balk_park');
    await release(T);
    T.log('balkongshots ok');
  },
};
