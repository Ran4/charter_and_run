// Rakt genom fruktståndet (free roam, DESIGN §10.19; feature 28): frukt.
//   frukt: at index 9 (free roam, after asnan): the five fruit stalls are `frutas` props with the
//          stall's solid (kind 'stall', top 2.55, the FRUTAS board on the first); a kick and a car at
//          3 m/s leave a stall standing (the car stopped at its counter); his car at 11 m/s goes
//          through: fruit-coloured debris and awning flaps, the board gone with it, +10.8 SKANDAL
//          (3 × 1.2 × gain 3), coins, the seller beside the wreck and out of the car's way with
//          "¡Mis tomates!", Stig's "Oj… förlåt… jag ersätter naturligtvis!" 0.5 s after, the souvenir
//          seller's "Jävla smålänningar!" about 1.4 s after; the seller gone after 4 s. A second
//          stall within 60 s: the seller there, no second swear. An AI car breaks none. A broken
//          stall does not come back with him near or with a car in its footprint, and does with
//          neither. A mission start brings all five back and moves a car out of a footprint; in the
//          mission a stall is a wall at 11 m/s. At index 6 (before asnan) no swear.
import { check } from '../lib.mjs';

const PI = Math.PI;
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
const sh = (T) => T.ev(() => +__game.shame.v.toFixed(2));
const stalls = (T) => T.ev(() => __game.stands.stalls.map((p) => ({ i: __props.indexOf(p), x: p.x, z: p.z, yaw: p.yaw, alive: p.alive, kind: p.block.kind, top: p.block.top, sign: !!p.sign, signUp: !!p.sign?.visible })));
// Nobody but the cast within 45 m of (x, z) (pedestrians walk into the shots and under the car).
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
    g.kickT = 0;
  }, x, z, yaw, cam);
  await T.frames(8);
}
// His car (a small hire-car type, entered on the spot) at (x, z) facing yaw, at rest.
const drive = (T, x, z, yaw, cam = 0) => T.ev((x, z, yaw, cam) => {
  const g = __game, p = g.player;
  let car = g.playerCar;
  if (!car) {
    car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && !c.spec.pigs && c.spec.len < 5);
    car.place(p.x + 3, p.z, 0);
    g.enterCar(car);
  }
  car.place(x, z, yaw);
  car.vx = car.vz = 0;
  g.cam.yaw = yaw + cam; g.cam.snapNext = true;
  return __game.cars.indexOf(car);
}, x, z, yaw, cam);
const go = (T, v) => T.ev((v) => { const c = __game.playerCar; c.vx = Math.sin(c.yaw) * v; c.vz = Math.cos(c.yaw) * v; }, v);
const brake = (T) => T.ev(() => { const c = __game.playerCar; c.vx *= 0.15; c.vz *= 0.15; });
const forceSorry = (T) => T.ev(() => { const g = __game, s = g.sorry; g.unsay(g.player); s.lastT = -Infinity; s.first = true; });

// His car `back` m out from stall st's middle, in direction `dir` (0 = its facing, PI/2 = its left
// side...), driven straight at it at v m/s.
async function ram(T, st, v, back = 9, cam = 0, dir = 0) {
  const a = st.yaw + dir, fx = Math.sin(a), fz = Math.cos(a);
  await drive(T, st.x + fx * back, st.z + fz * back, a + PI, cam);
  await T.frames(4);
  await go(T, v);
}

export const SCENARIOS = {
  async frukt(T) {
    await T.fresh('&mission=9');
    await resetSaid(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');
    const cfg = await T.ev(() => ({ ...__game.stands.cfg, vendor: null, stand: __game.sorry.cfg.stand }));
    let S = await stalls(T);
    T.log('stalls', JSON.stringify(S));
    check(S.length === 5 && S.every((s) => s.alive && s.kind === 'stall' && s.top === 2.55), 'five fruit stalls, the stall\'s solid (kind stall, top 2.55)');
    check(S.filter((s) => s.sign && s.signUp).length === 1, 'one carries the FRUTAS board');
    const near = (x, z) => S.reduce((b, s) => (!b || Math.hypot(s.x - x, s.z - z) < Math.hypot(b.x - x, b.z - z) ? s : b), null);
    const C = near(-73.5, -150), L = near(-61.5, -168), W = near(-104.5, -185);
    check(Math.hypot(C.x + 73.5, C.z + 150.25) < 0.01 && Math.hypot(L.x + 61.5, L.z + 167.75) < 0.01 && W.sign, 'rad C at (−73.5, −150.25), the lone one at (−61.5, −167.75), FRUTAS on rad A\'s west');
    await clearPeds(T, -70, -165);

    // 0. The row: rad C's stall from the south, Stig on foot.
    await stand(T, C.x - 2, C.z + 9, PI - 0.2, 0.35);
    await T.shot('frukt_rad');
    await stand(T, W.x - 6, W.z + 4.5, Math.atan2(6, -4.5), 0.3);
    await T.shot('frukt_frutas');

    // 1. A kick at the counter: it stands.
    await stand(T, C.x, C.z + 1.75 + 0.55, PI);
    let v0 = await sh(T);
    await T.tap('KeyJ'); await T.sleep(400);
    S = await stalls(T);
    check(S.find((s) => s.i === C.i).alive && (await sh(T)) === v0, 'a kick leaves it standing (no SKANDAL)');

    // 2. His car at 3 m/s: a wall, the car held at the counter.
    await ram(T, C, 3, 8, 0.6);
    await T.sleep(2500);
    const slow = await T.ev((i) => { const c = __game.playerCar; return { alive: __props[i].alive, z: c.z, v: Math.hypot(c.vx, c.vz) }; }, C.i);
    T.log('slow', JSON.stringify(slow));
    check(slow.alive && slow.z > C.z + 1.75 && slow.v < 1, `at 3 m/s it stands and stops the car (${JSON.stringify(slow)})`);

    // 3. At 11 m/s: through it.
    await T.ev(() => __game.shame.clear());
    await resetSaid(T);
    await forceSorry(T);
    v0 = await sh(T);
    const c0 = await T.ev(() => __game.coins);
    await ram(T, C, 11, 9, PI - 0.75);
    await T.until((i) => !__props[i].alive, 3000, C.i).catch(() => {});
    const t0 = await T.ev(() => __game.time);
    check(!(await T.ev((i) => __props[i].alive, C.i)), 'his car at 11 m/s goes through');
    await T.sleep(150);
    await T.shot('frukt_krasch');
    const hit = await T.ev(() => { const g = __game, c = g.playerCar, l = g.stands.last, v = g.stands.vendor; return { car: { x: c.x, z: c.z, vx: c.vx, vz: c.vz }, last: l, vendor: v && { up: v.state !== 'hidden' && v.root.visible, flail: v.anim.flail } }; });
    T.log('hit', JSON.stringify(hit));
    check(hit.vendor?.up && hit.vendor.flail, 'the seller is up beside the wreck, flailing');
    {
      const { car, last } = hit, sp = Math.hypot(car.vx, car.vz) || 1, dx = last.vendor.x - car.x, dz = last.vendor.z - car.z;
      const ahead = (dx * car.vx + dz * car.vz) / sp, side = Math.abs(dx * car.vz - dz * car.vx) / sp;
      check(ahead < 0 || side > 2.4, `not in the car's way (ahead ${ahead.toFixed(2)}, side ${side.toFixed(2)})`);
      check(Math.hypot(last.vendor.x - C.x, last.vendor.z - C.z) < 4.5, 'beside the wreck');
    }
    await brake(T);
    await T.sleep(500);
    await T.shot('frukt_mis_tomates');
    await T.sleep(700);
    await T.shot('frukt_smalanningar');
    let s = await said(T);
    T.log('crash lines', JSON.stringify(s), 't0', t0);
    const vline = s.find(([w, l]) => w === 'frutera' && l === cfg.vendorLine);
    const stig = s.find(([w, l]) => w === 'stig' && l === cfg.stand[0]);
    const swear = s.find(([w, l]) => w === 'souvenir' && l === cfg.swearLine);
    check(!!vline && !!stig && !!swear, `"¡Mis tomates!", Stig's sorry and the swear (${JSON.stringify(s)})`);
    if (vline && stig && swear) {
      check(stig[2] - vline[2] > 0.35 && stig[2] - vline[2] < 0.75, `the sorry ${(stig[2] - vline[2]).toFixed(2)} s after her cry`);
      check(swear[2] - vline[2] > 1.25 && swear[2] - vline[2] < 1.6, `the swear ${(swear[2] - vline[2]).toFixed(2)} s after`);
    }
    const dv = +((await sh(T)) - v0).toFixed(2);
    check(Math.abs(dv - 10.8) < 0.01, `SKANDAL +${dv} (3 × 1.2 × gain 3 = 10.8)`);
    await T.sleep(1500);
    const c1 = await T.ev(() => __game.coins);
    T.log('coins', c0, '->', c1);
    await T.sleep(1600);
    check(await T.ev(() => __game.stands.vendor.state === 'hidden' && !__game.stands.vendor.root.visible), 'the seller gone after 4 s');

    // 4. The FRUTAS board goes with its stall; an AI car breaks none.
    await T.ev(() => __game.shame.clear());
    const ai = await T.ev((i) => {
      const g = __game, p = __props[i], car = g.cars.find((c) => c.traffic && !c.dead);
      const r = g.breakProp(p, 5, 0, car);
      return { r: !!r, alive: p.alive };
    }, W.i);
    check(!ai.r && ai.alive, 'an AI car does not break one');
    await resetSaid(T);
    await forceSorry(T);
    await ram(T, W, 12, 10, 0, -PI / 2);   // from the west, along rad A: the alley in front is 5 m
    await T.until((i) => !__props[i].alive, 3000, W.i).catch(() => {});
    await T.sleep(200);
    await brake(T);
    const wb = await T.ev((i) => ({ alive: __props[i].alive, sign: __props[i].sign.visible }), W.i);
    check(!wb.alive && !wb.sign, `FRUTAS: the stall and its board gone (${JSON.stringify(wb)})`);
    await T.sleep(600);
    await T.shot('frukt_frutas_krasch');
    s = await said(T);
    T.log('frutas lines', JSON.stringify(s));
    check(!s.some(([w]) => w === 'souvenir'), 'the souvenir seller 40 m off: no swear');

    // 5. The lone stall, within the 60 s gap: the seller there, no second swear.
    await resetSaid(T);
    await T.sleep(1000);
    await ram(T, L, 11, 9, PI - 0.75);
    await T.until((i) => !__props[i].alive, 3000, L.i).catch(() => {});
    await T.sleep(150);
    await brake(T);
    const l2 = await T.ev(() => __game.stands.last);
    check(Math.hypot(l2.vendor.x - L.x, l2.vendor.z - L.z) < 4.5, 'the seller beside the second wreck');
    await T.sleep(1600);
    s = await said(T);
    T.log('second', JSON.stringify(s));
    check(s.some(([w, l]) => w === 'frutera' && l === cfg.vendorLine) && !s.some(([w]) => w === 'souvenir'), `her cry, no second swear (${JSON.stringify(s)})`);

    // 6. The comeback: not with him near, not with a car in the footprint.
    const back = await T.ev((i) => { const p = __props[i]; p.respawn = 0; return p.alive; }, C.i);
    await T.frames(10);
    check(!back && !(await T.ev((i) => __props[i].alive, C.i)), 'not back with him near');
    const parked = await T.ev((i) => {
      const g = __game, p = __props[i], car = g.playerCar;
      g.exitCar(true);
      car.place(p.x + 0.6, p.z, 0.3);
      g.player.teleport(p.x + 150, p.z + 20);
      p.respawn = 0;
      return g.cars.indexOf(car);
    }, C.i);
    await T.frames(20);
    check(!(await T.ev((i) => __props[i].alive, C.i)), 'not back with a car in its footprint');
    await T.ev((k, i) => { const p = __props[i]; __game.cars[k].place(p.x + 8, p.z + 9, 0.3); }, parked, C.i);
    await T.sleep(900);   // held at 0.5 s while the car stood in it
    check(await T.ev((i) => __props[i].alive, C.i), 'back when he is 70 m off and the footprint clear');

    // 7. A mission start: all five back, a car in a footprint moved out of it.
    S = await stalls(T);
    T.log('before the mission', JSON.stringify(S.map((s) => s.alive)));
    check(S.filter((s) => !s.alive).length === 2, 'two still broken (FRUTAS and the lone one)');
    await T.ev((k, i) => { const p = __props[i]; __game.cars[k].place(p.x - 0.5, p.z + 0.4, 1.2); }, parked, L.i);
    await T.startMission();
    await T.until(() => __game.missions.state === 'running', 60000).catch(() => {});
    S = await stalls(T);
    const out = await T.ev((k, i) => { const c = __game.cars[k], b = __props[i].block; return { x: c.x, z: c.z, inside: c.x > b.minX - 0.8 && c.x < b.maxX + 0.8 && c.z > b.minZ - 0.8 && c.z < b.maxZ + 0.8 }; }, parked, L.i);
    T.log('mission', await T.state(), JSON.stringify(S.map((s) => s.alive)), JSON.stringify(out));
    check(S.every((s) => s.alive) && S.find((s) => s.i === W.i).signUp, 'a mission start: all five stand, the FRUTAS board up');
    check(!out.inside, 'the car in the lone stall\'s footprint moved out');

    // 8. In the mission a stall is a wall.
    await T.ev(() => __game.shame.clear());
    await resetSaid(T);
    await ram(T, C, 11, 9, 0.6);
    await T.sleep(1500);
    const wall = await T.ev((i) => { const c = __game.playerCar, p = __props[i]; return { alive: p.alive, z: c.z, state: __game.missions.state }; }, C.i);
    T.log('in a mission', JSON.stringify(wall));
    check(wall.alive && wall.z > C.z + 1.75, `in a mission the car stops at the counter (${JSON.stringify(wall)})`);
    check(!(await said(T)).some(([w]) => w === 'frutera'), 'no seller in a mission');
    await T.shot('frukt_uppdrag');
  },

  // Before asnan the souvenir seller does not swear (index 6, friskotek waiting).
  async fruktFore(T) {
    await T.fresh('&mission=6');
    await resetSaid(T);
    const cfg = await T.ev(() => ({ ...__game.stands.cfg, vendor: null }));
    const S = await stalls(T);
    const C = S.reduce((b, s) => (!b || Math.hypot(s.x + 73.5, s.z + 150) < Math.hypot(b.x + 73.5, b.z + 150) ? s : b), null);
    await clearPeds(T, C.x, C.z);
    await forceSorry(T);
    await ram(T, C, 11, 9, PI - 0.75);
    await T.until((i) => !__props[i].alive, 3000, C.i).catch(() => {});
    await brake(T);
    await T.sleep(1800);
    const s = await said(T);
    T.log('before asnan', JSON.stringify(s));
    check(!(await T.ev((i) => __props[i].alive, C.i)), 'it breaks before asnan too');
    const sd = await T.ev((x, z) => { const n = __game.npc('souvenir'); return n.state === 'normal' && n.root.visible ? Math.hypot(n.x - x, n.z - z) : null; }, C.x, C.z);
    check(sd != null && sd <= cfg.swearR, `the souvenir seller at his stand, ${sd?.toFixed(1)} m off`);
    check(s.some(([w, l]) => w === 'frutera' && l === cfg.vendorLine) && !s.some(([w]) => w === 'souvenir'), `her cry, no swear before asnan (${JSON.stringify(s)})`);
  },
};
