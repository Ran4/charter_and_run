// Fin hund… – the watchdogs in the bungalow gardens and the farmyard on vischan (free roam, DESIGN
// §10.21; feature 31): hund.
//   hund: after the end, 12 bungalow dogs (the 7 trampoline lots first) and Chispa at the farm, each
//         in its own lot, out of sight (hidden) beyond 75 m. On Bobi's sidewalk he barks from inside
//         the wall; through the gate he rushes and stands barking 1.3 m off ("Fin hund… fin hund…",
//         hands up); back out through the gate he stays in, barks after him and goes home. On the
//         trampoline behind the house (round the house to it): "Snälla hund… sitt!", the mantra with
//         the arms out, then the owner's whistle "¡Bobi! Hit!" from the door, home, "Tack… tack så
//         mycket!", and 40 s of calm (in again: no rush). Up the farm tank's ramp: Chispa round the
//         tank below him; a car roof in Tango's drive is up too; Kasper's owner calls after
//         `groundCall` on the ground. A kick or a stomp at a dog does nothing to it and adds no
//         SKANDAL. A mission start (ropavieja's idle) puts every dog away and his hands down, and the
//         flight level has none.
import { check } from '../lib.mjs';

// A dog's and Stig's state (lot-local: the street at z 0, the lot back to +z).
const st = (T, i) => T.ev((i) => {
  const g = __game, d = g.dogs.dogs[i], p = g.player, [lx, lz] = d.lot.local(d.x, d.z), [px, pz] = d.lot.local(p.x, p.z);
  return { name: d.name, mode: d.mode, on: d.on, vis: d.root.visible, dl: [+lx.toFixed(2), +lz.toFixed(2)], dy: +(d.y - d.base).toFixed(2),
    pl: [+px.toFixed(2), +pz.toFixed(2)], py: +p.y.toFixed(2), d: +Math.hypot(d.x - p.x, d.z - p.z).toFixed(2), calm: +d.calm.toFixed(1),
    pose: p.anim.placate || 0, up: g.dogs.up(d), shame: +g.shame.v.toFixed(2), ev: g.dogs.events.slice(-3).map((e) => `${e.name}:${e.kind}`) };
}, i);
const idx = (T, name) => T.ev((n) => __game.dogs.dogs.findIndex((d) => d.name === n), name);
// Every line said from here: [who, text] (stig | a dog's name | 'owner').
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      const who = t === g.player ? 'stig' : t?.def?.name ?? (g.dogs.dogs?.some((d) => d.lot.anchor === t) ? 'owner' : typeof t === 'string' ? t : t?.key);
      window.__said.push([who, text]);
      return o(t, text, secs);
    };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
// Stand him at lot-local (lx, lz) of dog i facing `ly` (0: into the lot, away from the street).
const put = (T, i, lx, lz, ly = 0) => T.ev(([i, lx, lz, ly]) => {
  const g = __game, L = g.dogs.dogs[i].lot, [x, z] = L.world(lx, lz), yaw = L.home.yaw + Math.PI + ly;
  g.debugWarp(x, z, yaw); g.cam.yaw = yaw; g.cam.snapNext = true;
}, [i, lx, lz, ly]);
// A cut from beside both (lot-local eye and look-at).
const frame = (T, i, eye, at) => T.ev(([i, eye, at]) => {
  const g = __game, L = g.dogs.dogs[i].lot, [ex, ez] = L.world(eye[0], eye[2]), [ax, az] = L.world(at[0], at[2]);
  g.cam.cutTo({ x: ex, y: eye[1], z: ez }, { x: ax, y: at[1], z: az });
}, [i, eye, at]);
// A cut from the side of dog i and Stig: `k` m off the middle of the line between them (on the
// street's side), `h` m up, looking at `lh` m over the middle.
const side = (T, i, k = 4.5, h = 1.9, lh = 1.0) => T.ev(([i, k, h, lh]) => {
  const g = __game, d = g.dogs.dogs[i], p = g.player, L = d.lot, [ax, az] = L.local(d.x, d.z), [bx, bz] = L.local(p.x, p.z);
  const mx = (ax + bx) / 2, mz = (az + bz) / 2, l = Math.hypot(bx - ax, bz - az) || 1;
  let nx = -(bz - az) / l, nz = (bx - ax) / l;
  if (nz > 0) { nx = -nx; nz = -nz; }
  const [ex, ez] = L.world(mx + nx * k, mz + nz * k), [cx, cz] = L.world(mx, mz);
  g.cam.cutTo({ x: ex, y: h, z: ez }, { x: cx, y: lh, z: cz });
}, [i, k, h, lh]);
const release = (T) => T.ev(() => __game.cam.release());

export const SCENARIOS = {
  async hund(T) {
    // 0. Free roam after the end: the dogs and their lots.
    await T.fresh('&mission=13');
    await T.frames(10);
    const all = await T.ev(() => {
      const g = __game, f = g.focus();
      return g.dogs.dogs.map((d) => {
        const [lx, lz] = d.lot.local(d.x, d.z);
        return { name: d.name, look: d.def.look, farm: d.lot.farm, tramp: !!d.lot.tramp, inLot: d.lot.inside(lx, lz), far: Math.hypot(d.lot.home.x - f.x, d.lot.home.z - f.z) > 75, vis: d.root.visible };
      });
    });
    T.log('dogs', JSON.stringify(all.map((d) => `${d.name}/${d.look}${d.farm ? '/farm' : d.tramp ? '/tramp' : ''}${d.vis ? '/vis' : ''}`)));
    check(all.length === 13 && all.filter((d) => d.farm).length === 1 && new Set(all.map((d) => d.name)).size === 13, `12 bungalow dogs and the farm's (${all.length})`);
    check(all.filter((d) => d.tramp).length === 7, 'the 7 trampoline lots keep a dog');
    check(all.every((d) => d.inLot), 'every dog lies in its own lot');
    check(all.every((d) => !d.far || !d.vis), 'the dogs far off are put away');

    // Where most dogs are awake at once (within 75 m), the frame rate.
    const busy = await T.ev(() => {
      const g = __game, D = g.dogs.dogs, n = (d) => D.filter((e) => Math.hypot(e.lot.home.x - d.lot.home.x, e.lot.home.z - d.lot.home.z) <= 70).length;
      const d = D.reduce((a, b) => (n(b) > n(a) ? b : a)), L = d.lot, [x, z] = L.world(L.doorL[0] + 0.8, -1.6);
      g.debugWarp(x, z, L.home.yaw + Math.PI); g.cam.yaw = L.home.yaw + Math.PI; g.cam.snapNext = true;
      return { name: d.name, n: n(d) };
    });
    await T.sleep(1500);
    const fps = +(await T.fps());
    const awake = await T.ev(() => __game.dogs.dogs.filter((d) => d.root.visible).length);
    T.log('busiest', JSON.stringify(busy), 'awake', awake, 'fps', fps);
    check(awake >= 2 && fps >= 45, `${awake} dogs awake at ${busy.name}'s, ${fps} fps`);

    // 1. Bobi's sidewalk: he barks from inside the wall.
    const bobi = await idx(T, 'Bobi');
    await resetSaid(T);
    await put(T, bobi, (await T.ev((i) => __game.dogs.dogs[i].lot.doorL[0], bobi)) + 0.8, -1.6);
    await T.sleep(1600);
    let r = await st(T, bobi);
    T.log('sidewalk', JSON.stringify(r));
    check(r.on && r.vis && r.mode === 'alert' && r.dl[1] >= 1.3 && r.dl[1] < 3, `Bobi at the inside of the wall, barking (${JSON.stringify(r)})`);
    check((await said(T)).some(([w, t]) => w === 'Bobi' && t === 'VOFF! VOFF!'), 'VOFF! VOFF!');
    await frame(T, bobi, [7, 2.2, -5], [0, 0.8, 2.5]);
    await T.frames(6);
    await T.shot('hund_trottoar');
    await release(T);

    // 2. In through the gate: he rushes and stands barking a step off; "Fin hund… fin hund…", hands up.
    await T.ev((i) => { const g = __game; g.cam.yaw = g.player.yaw; g.cam.snapNext = true; }, bobi);
    await T.hold(['KeyW'], 1100);
    await T.until((i) => { const d = __game.dogs.dogs[i]; return d.mode === 'bay'; }, 5000, bobi);
    await T.sleep(500);
    r = await st(T, bobi);
    let s = await said(T);
    T.log('in the lot', JSON.stringify(r), JSON.stringify(s.filter(([w]) => w === 'stig')));
    check(r.mode === 'bay' && r.d > 1.1 && r.d < 1.8 && r.pose === 1, `he stands barking a step off, his hands up (${JSON.stringify(r)})`);
    check(s.some(([w, t]) => w === 'stig' && t === 'Fin hund… fin hund…'), '"Fin hund… fin hund…"');
    await side(T, bobi, 4.6, 1.8, 1.05);
    await T.frames(6);
    await T.shot('hund_fin');
    await release(T);
    // He cannot walk through it.
    await T.ev((i) => { const g = __game, d = g.dogs.dogs[i], p = g.player; g.cam.yaw = Math.atan2(d.x - p.x, d.z - p.z); }, bobi);
    await T.hold(['KeyW'], 700);
    r = await st(T, bobi);
    check(r.d > 0.6, `the dog stands its ground (${r.d})`);

    // 3. Back out through the gate: it stays in, barks after him, goes home.
    await put(T, bobi, (await T.ev((i) => __game.dogs.dogs[i].lot.doorL[0], bobi)), -1.6, Math.PI);
    let minZ = 99;
    for (let k = 0; k < 12; k++) { await T.sleep(400); r = await st(T, bobi); minZ = Math.min(minZ, r.dl[1]); }
    T.log('out again', JSON.stringify(r), 'min lz', minZ);
    check(minZ >= 1.3 && (r.mode === 'rest' || r.mode === 'home' || r.mode === 'alert') && r.pose === 0, `it never left its lot, his hands down (${JSON.stringify(r)})`);
    check((await T.ev(() => __game.dogs.events.map((e) => e.kind))).includes('back'), 'it barked after him at the edge');

    // 4. The trampoline behind the house: round the house to it, the lines, the mantra, the call.
    await resetSaid(T);
    await T.ev((i) => { const g = __game, L = g.dogs.dogs[i].lot, [x, z] = L.world(L.tramp[0], L.tramp[1]); g.player.teleport(x, z, L.home.yaw); g.player.y = 1.2; }, bobi);
    let sawRear = false, sawMantraPose = false, rTramp = null, shotTramp = false;
    for (let k = 0; k < 40; k++) {
      await T.sleep(300);
      r = await st(T, bobi);
      sawMantraPose ||= r.pose === 2;
      if (r.mode === 'bay' && !rTramp) {
        rTramp = r;
        await frame(T, bobi, [r.pl[0] + 7.5, 4.6, r.pl[1] - 5.5], [(r.dl[0] + r.pl[0]) / 2 - 0.3, 2.6, (r.dl[1] + r.pl[1]) / 2 - 0.8]);
      }
      sawRear ||= await T.ev((i) => __game.dogs.dogs[i].rear > 0.3, bobi);
      if (rTramp && sawMantraPose && !shotTramp) {
        // Him on the way down through the frame, arms out, the dog rearing under him.
        await T.until(() => { const p = __game.player; return p.vy < 0 && p.y > 2.2 && p.y < 3.6; }, 3000).catch(() => {});
        await T.shot('hund_studsmatta');
        shotTramp = true;
      }
      if (r.mode === 'called') break;
    }
    T.log('trampoline', JSON.stringify(rTramp), 'rear', sawRear, 'mantra pose', sawMantraPose);
    check(rTramp && rTramp.up && rTramp.d < 3.6, `round the house to the trampoline, under him (${JSON.stringify(rTramp)})`);
    check(sawRear && sawMantraPose, 'it rears up at him; his arms out for the mantra');
    await T.frames(4);
    await T.shot('hund_visslar');
    await release(T);
    await T.sleep(2600);
    s = await said(T);
    T.log('said', JSON.stringify(s.filter(([w]) => w !== 'Bobi')));
    const stig = s.filter(([w]) => w === 'stig').map(([, t]) => t);
    check(stig[0] === 'Snälla hund… sitt!' && stig.includes('Jag kan flyga, jag är inte rädd.'), `"Snälla hund… sitt!", then the mantra (${JSON.stringify(stig)})`);
    check(s.some(([w, t]) => w === 'owner' && t === '¡Bobi! Hit!'), 'the owner calls from the house: "¡Bobi! Hit!"');
    check(stig.includes('Tack… tack så mycket!'), '"Tack… tack så mycket!"');
    r = await st(T, bobi);
    check(r.calm > 30 && r.pose === 0, `home and calm (${JSON.stringify(r)})`);
    // In again during the calm: no rush.
    await put(T, bobi, (await T.ev((i) => __game.dogs.dogs[i].lot.doorL[0], bobi)) + 0.8, 3);
    await T.sleep(1500);
    r = await st(T, bobi);
    check(r.mode === 'rest' || r.mode === 'called', `no rush while calm (${r.mode})`);

    // 5. The farm: up the tank's ramp, Chispa round the tank below him.
    const chispa = await idx(T, 'Chispa');
    await resetSaid(T);
    await T.ev(() => { const g = __game, [x, z] = [-240 - 16, -160 - 26]; g.debugWarp(x, z, Math.PI / 2); g.cam.yaw = Math.PI / 2; g.cam.snapNext = true; });
    await T.sleep(400);
    await T.hold(['KeyW'], 1400);
    await T.frames(10);
    r = await st(T, chispa);
    T.log('tank', JSON.stringify(r));
    check(r.py > 1.9 && r.up, `up on the tank's rim (${JSON.stringify(r)})`);
    await T.until((i) => __game.dogs.dogs[i].mode === 'bay', 8000, chispa);
    await T.sleep(1200);
    r = await st(T, chispa);
    T.log('chispa', JSON.stringify(r));
    check(r.mode === 'bay' && r.dy < 0.3 && r.d < 5, `Chispa below him (${JSON.stringify(r)})`);
    await T.until(() => __game.player.anim.placate === 2, 9000);
    await frame(T, chispa, [-4.5, 3.4, -16.5], [-8.5, 1.4, -24]);
    await T.frames(6);
    await T.shot('hund_gard');
    await release(T);
    check((await said(T)).some(([w, t]) => w === 'Chispa' && t === '¡Guau! ¡Guau!'), '¡Guau! ¡Guau!');
    await T.until((i) => __game.dogs.dogs[i].mode === 'called', 9000, chispa);
    check((await said(T)).some(([w, t]) => w === 'owner' && t === '¡Chispa! ¡Ven aquí!'), '"¡Chispa! ¡Ven aquí!"');

    // 6. A car roof in Tango's drive is up too.
    const tango = await idx(T, 'Tango');
    const roof = await T.ev((i) => {
      const g = __game, d = g.dogs.dogs[i], L = d.lot, car = g.cars.find((c) => { const [lx, lz] = L.local(c.x, c.z); return L.inside(lx, lz) || Math.abs(lx) < L.x1 + 1 && lz > -1 && lz < 8; });
      if (!car) return null;
      const p = g.player;
      g.debugWarp(car.x, car.z, car.yaw);
      p.y = car.y + car.height; p.vy = 0;
      return { top: +(car.y + car.height).toFixed(2) };
    }, tango);
    T.log('roof', JSON.stringify(roof));
    check(!!roof, 'a car in Tango\'s drive');
    await T.sleep(2500);
    r = await st(T, tango);
    T.log('tango', JSON.stringify(r));
    check(r.up && (r.mode === 'bay' || r.mode === 'rush') && r.py > 1.2, `on the roof, out of Tango's reach (${JSON.stringify(r)})`);
    await frame(T, tango, [r.pl[0] - 2.5, 2.7, -5], [(r.pl[0] + r.dl[0]) / 2, 1.4, r.pl[1]]);
    await T.frames(6);
    await T.shot('hund_biltak');
    await release(T);

    // 7. Kasper: on the ground the owner calls after `groundCall` (shortened for the test); a kick and
    //    a stomp at him do nothing to him and add no SKANDAL.
    const kasper = await idx(T, 'Kasper');
    const gc = await T.ev(() => { const c = __game.dogs.cfg, v = c.groundCall; c.groundCall = 4; return v; });
    try {
      await put(T, kasper, (await T.ev((i) => __game.dogs.dogs[i].lot.doorL[0], kasper)) + 0.8, 3);
      await T.until((i) => __game.dogs.dogs[i].mode === 'bay', 6000, kasper);
      const before = await st(T, kasper);
      await T.ev((i) => { const g = __game, d = g.dogs.dogs[i], p = g.player; p.yaw = Math.atan2(d.x - p.x, d.z - p.z); }, kasper);
      await T.tap('KeyJ');
      await T.sleep(400);
      await T.ev(() => { const p = __game.player; p.vy = 6; p.onGround = false; });
      await T.frames(8);
      await T.tap('KeyJ');
      await T.sleep(600);
      const after = await st(T, kasper);
      T.log('kick', JSON.stringify(before), JSON.stringify(after));
      check(after.shame <= before.shame && (after.mode === 'bay' || after.mode === 'rush' || after.mode === 'called'), `a kick and a stomp: nothing (${before.shame} → ${after.shame}, ${after.mode})`);
      await T.until((i) => __game.dogs.dogs[i].mode === 'called', 6000, kasper);
    } finally { await T.ev((v) => { __game.dogs.cfg.groundCall = v; }, gc); }
    r = await st(T, kasper);
    check(r.mode === 'called' && r.calm > 30, `Kasper called home after his time on the ground (${r.mode})`);
    await side(T, kasper, 5, 2.0, 1.2);
    await T.frames(6);
    await T.shot('hund_kasper');
    await release(T);
    // The poodle close up (Bijou: the portrait's breed).
    const bijou = await idx(T, 'Bijou');
    await put(T, bijou, (await T.ev((i) => __game.dogs.dogs[i].lot.doorL[0], bijou)) + 0.8, -1.6);
    await T.sleep(1500);
    await T.ev((i) => { const g = __game, d = g.dogs.dogs[i]; g.cam.cutTo({ x: d.x + Math.sin(d.yaw) * 2.2 + Math.cos(d.yaw) * 1.2, y: 1.0, z: d.z + Math.cos(d.yaw) * 2.2 - Math.sin(d.yaw) * 1.2 }, { x: d.x, y: 0.4, z: d.z }); }, bijou);
    await T.frames(6);
    await T.shot('hund_pudel');
    await release(T);

    // 8. Between missions (ropavieja's idle) the dogs are there; a mission start puts them away.
    await T.fresh('&mission=9');
    await T.frames(10);
    const pirre = await idx(T, 'Pirre');
    await put(T, pirre, (await T.ev((i) => __game.dogs.dogs[i].lot.doorL[0], pirre)) + 0.8, 3);
    await T.until((i) => __game.dogs.dogs[i].mode === 'bay', 6000, pirre);
    check((await st(T, pirre)).pose === 1, 'Pirre at him before ropavieja');
    await T.ev(() => __game.missions.begin());
    await T.until(() => __game.missions.state !== 'idle', 4000);
    await T.frames(5);
    const gone = await T.ev(() => ({ vis: __game.dogs.dogs.filter((d) => d.root.visible).length, pose: __game.player.anim.placate || 0, held: __game.dogs.held }));
    T.log('mission start', JSON.stringify(gone));
    check(gone.vis === 0 && gone.pose === 0 && !gone.held, `a mission start puts every dog away (${JSON.stringify(gone)})`);
    // The flight level has none.
    await T.fresh('&mission=0');
    await T.frames(10);
    const fl = await T.ev(() => ({ built: !!__game.dogs.dogs, vis: (__game.dogs.dogs || []).filter((d) => d.root.visible).length }));
    check(fl.vis === 0, `no dogs in the flight level (${JSON.stringify(fl)})`);
  },
};
