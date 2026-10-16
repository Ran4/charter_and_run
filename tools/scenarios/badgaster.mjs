// Badgäster på solstolarna (free roam, DESIGN §10.22; feature 32): badgaster, stekt.
//   badgaster: at index 6 (free roam): bodies only on taken sun loungers, at most `max`, none on
//              Berra's or Robban's; on the main beach the nearest taken loungers have one. The burn:
//              a bather lain long turns pink, then lobster red, rebuilt only once out of view (not in
//              view and near). A kick at an empty lounger and at a taken one give the same SKANDAL;
//              the bather goes off backwards over the backrest (a somersault about his own axis, his
//              speed along the lounger's facing) with an OUCH bark, gets up with a GETUP bark, stands
//              and goes once unseen; never a hit (no onCharHit, no "hit" sorry). His car at 10 m/s
//              through a taken lounger: the lounger's SKANDAL only, the bather off along the car. The
//              lounger back after its smash: someone new, pale. At night nobody; the next morning a
//              new crowd. A mission start takes every bather away at once; the flight level has none.
//   stekt:     at index 6 Berra and Robban lie lobster red (outfit `stekt`) asleep on their two
//              pool-deck loungers and snore; E on Berra: Stig's line, Berra lifts his head with "Fem
//              minuter till…", Robban's "Fan, vad jag är törstig…" in his sleep. A kick at Berra's
//              lounger: off it, asleep on the ground, no complaint; the lounger back and nobody
//              looking, on it again. A mission start: both home at once, standing, in their own skin.
//              Index 7 has them; 5 and 8 do not.
import { check } from '../lib.mjs';

const PI = Math.PI;
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || (t.bather ? 'bather' : '?'), text, +g.time.toFixed(2)]);
      return o(t, text, secs);
    };
    // Every car hit on a bather (none must come from a smashed lounger).
    const h = g.onCharHit.bind(g);
    window.__hits = [];
    g.onCharHit = (ch, car, sp) => { if (ch.bather) window.__hits.push(+g.time.toFixed(2)); return h(ch, car, sp); };
  }
  window.__said = [];
  window.__hits.length = 0;
});
const said = (T) => T.ev(() => window.__said.slice());
const sh = (T) => T.ev(() => +__game.shame.v.toFixed(3));
const lines = (T) => T.ev(async () => { const C = await import('/src/content/index.js'); return { OUCH: C.OUCH, GETUP: C.GETUP, B: C.BATHERS }; });

// The bathers: every body on its lounger (where lieOn puts the hips), and the loungers missed.
const snap = (T) => T.ev(() => {
  const g = __game, b = g.bathers, f = g.focus(), c = b.cfg;
  const d = (x, z) => +Math.hypot(x - f.x, z - f.z).toFixed(2);
  const lying = b.lying.map((ch) => {
    const r = ch.bather.rec, p = r.p;
    return {
      i: r.i, d: d(p.x, p.z), stage: ch.bather.stage, skin: ch.def.skin, state: ch.state, taken: r.occ, alive: p.alive, reserved: b.reserved(r),
      onBed: ch.state === 'lying' && Math.hypot(ch.x - p.x, ch.z - p.z) < 0.6 && Math.abs(ch.y - (p.baseY + 0.395 + 0.08 * ch.model.s)) < 0.02,
      stektBed: !!b.beds && (p === b.beds.berra || p === b.beds.robban),
    };
  });
  const missed = b.recs.filter((r) => !r.ch && r.occ && r.p.alive && !b.reserved(r) && d(r.p.x, r.p.z) < c.r).map((r) => ({ i: r.i, d: d(r.p.x, r.p.z) }));
  return { count: b.count, made: b.made, lying, missed, loose: b.loose.map((ch) => ({ state: ch.state, x: +ch.x.toFixed(2), z: +ch.z.toFixed(2) })) };
});
// Nobody but the cast within 45 m of (x, z) (pedestrians walk into the shots and in front of the car).
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
// Lounger `i` taken (lain `age` s) or not, or every lounger within `R` m of (x, z) untaken but these.
const take = (T, list, x, z, R) => T.ev((list, x, z, R) => {
  const g = __game, b = g.bathers;
  for (const r of b.recs) if (Math.hypot(r.p.x - x, r.p.z - z) < R) r.occ = false;
  for (const [i, age, arms] of list) { const r = b.recs[i]; r.occ = true; r.since = g.time - age; if (arms) r.look.arms = arms; }
}, list, x, z, R);
// The beach lounger nearest (x, z).
const bedAt = (T, x, z) => T.ev((x, z) => {
  const b = __game.bathers;
  const r = b.recs.reduce((a, q) => (!a || Math.hypot(q.p.x - x, q.p.z - z) < Math.hypot(a.p.x - x, a.p.z - z) ? q : a), null);
  return { i: r.i, x: r.p.x, z: r.p.z, yaw: r.p.yaw };
}, x, z);
const recOf = (T, i) => T.ev((i) => { const r = __game.bathers.recs[i], ch = r.ch; return { n: r.n, occ: r.occ, seed: r.seed, alive: r.p.alive, stage: __game.bathers.stage(r), ch: ch ? { stage: ch.bather.stage, skin: ch.def.skin, state: ch.state } : null }; }, i);
// A crossing 100 m and more from the beach rows and Flamenco's deck: every body there released (out
// 48 m), and their loungers may come back (tickProps: 70 m).
const away = (T) => stand(T, 40, 120, PI);
const cut = (T, from, to) => T.ev((a, b) => __game.cam.cutTo(a, b), from, to);
const release = (T) => T.ev(() => __game.cam.release());
// His car (a small hire-car type, entered on the spot) at (x, z) facing yaw, at rest.
const drive = (T, x, z, yaw) => T.ev((x, z, yaw) => {
  const g = __game, p = g.player;
  let car = g.playerCar;
  if (!car) {
    car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && !c.spec.pigs && c.spec.len < 5);
    car.place(p.x + 3, p.z, 0);
    g.enterCar(car);
  }
  car.place(x, z, yaw);
  car.vx = car.vz = 0;
  g.cam.yaw = yaw; g.cam.snapNext = true;
}, x, z, yaw);
const go = (T, v) => T.ev((v) => { const c = __game.playerCar; c.vx = Math.sin(c.yaw) * v; c.vz = Math.cos(c.yaw) * v; }, v);
const brake = (T) => T.ev(() => { const c = __game.playerCar; c.vx *= 0.1; c.vz *= 0.1; });
const startFriskotek = async (T) => {
  await T.ev(() => { const g = __game, s = g.approachSpot(g.missions.current.at); if (g.playerCar) g.exitCar(true); g.debugWarp(s.x, s.z, s.yaw); });
  await T.frames(3);
  await T.ev(() => {
    const g = __game, n = g.npc(g.missions.current.giver), p = g.player;
    if (Math.hypot(n.x - p.x, n.z - p.z) > 3) { const s = g.freeSpot(n.x, n.z, 1.2, 2.2); g.debugWarp(s.x, s.z, Math.atan2(n.x - s.x, n.z - s.z)); }
  });
  await T.frames(3);
  await T.tap('KeyE');
  await T.until(() => __game.missions.state !== 'idle', 4000);
};

export const SCENARIOS = {
  async badgaster(T) {
    await T.fresh('&mission=6');
    await resetSaid(T);
    const { OUCH, GETUP, B: cfg } = await lines(T);
    await T.sleep(1500);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');

    // 0. The spawn on Flamenco's deck.
    let S = await snap(T);
    T.log('spawn', S.count, 'made', S.made, JSON.stringify(S.lying.map((l) => [l.i, l.d, l.stage])));
    check(S.count > 0 && S.count <= cfg.max && S.made <= cfg.max, `bodies at the spawn (${S.count}, made ${S.made}, max ${cfg.max})`);
    check(S.lying.every((l) => l.onBed && l.taken && l.alive && !l.reserved && l.d < cfg.out), `each on a taken lounger, its hips on the seat (${JSON.stringify(S.lying)})`);
    check(!S.lying.some((l) => l.stektBed), 'none on Berra\'s or Robban\'s lounger');

    // 1. The main beach: the nearest taken loungers have a body.
    await clearPeds(T, 0, 245);
    await stand(T, 0, 236, 0);
    await T.sleep(1500);
    S = await snap(T);
    const far = Math.max(0, ...S.lying.map((l) => l.d));
    T.log('beach', S.count, JSON.stringify(S.lying.map((l) => [l.i, l.d, l.stage])), 'missed', JSON.stringify(S.missed));
    check(S.count >= 4 && S.lying.every((l) => l.onBed && l.taken && l.d < cfg.out), `the beach has bathers (${S.count})`);
    check(S.missed.every((m) => S.count === cfg.max && m.d > far - cfg.swap), `no taken lounger nearer than the bodies left empty (${JSON.stringify(S.missed)}, furthest body ${far})`);
    await T.shot('badgaster_strand');
    const dressMs = await T.ev(() => { const b = __game.bathers, ch = b.lying[0], t0 = performance.now(); b.dress(ch, ch.bather.rec); b.lay(ch, ch.bather.rec); return +(performance.now() - t0).toFixed(2); });
    T.log('one rebuilt body', dressMs, 'ms');

    // 2. The burn. Three loungers side by side in the row at z 250, everything else round them free.
    const L = [await bedAt(T, 9.4, 250.3), await bedAt(T, 12.6, 250.3), await bedAt(T, 16.6, 250.3)];
    await away(T);
    await take(T, L.map((l) => [l.i, 0, 'side']), 12.6, 250, 40);
    await stand(T, 12.8, 244.5, 0);
    await T.sleep(1600);   // past the cut's cutSecs
    let R = await Promise.all(L.map((l) => recOf(T, l.i)));
    check(R.every((r) => r.ch && r.ch.stage === 0 && cfg.skins[0].includes(r.ch.skin)), `three pale bathers (${JSON.stringify(R)})`);
    // In view and near: lain long enough, but no rebuild while he looks.
    await T.ev((i, s) => { const g = __game; g.bathers.recs[i].since = g.time - s; }, L[1].i, cfg.burn[0] + 2);
    await T.sleep(700);
    R[1] = await recOf(T, L[1].i);
    check(R[1].stage === 1 && R[1].ch.stage === 0, `pink by now, still pale while in view (${JSON.stringify(R[1])})`);
    // Looked away: pink.
    await T.ev(() => { const g = __game; g.cam.yaw += Math.PI; g.cam.snapNext = true; });
    await T.sleep(500);
    R[1] = await recOf(T, L[1].i);
    check(R[1].ch.stage === 1 && cfg.skins[1].includes(R[1].ch.skin), `pink once out of view (${JSON.stringify(R[1])})`);
    await T.ev((i, s) => { const g = __game; g.bathers.recs[i].since = g.time - s; }, L[2].i, cfg.burn[1] + 2);
    await T.sleep(500);
    R[2] = await recOf(T, L[2].i);
    check(R[2].ch.stage === 2 && cfg.skins[2].includes(R[2].ch.skin), `lobster red (${JSON.stringify(R[2])})`);
    await T.ev(() => { const g = __game; g.cam.yaw -= Math.PI; g.cam.snapNext = true; });
    await T.frames(6);
    await cut(T, { x: 12.8, y: 2.0, z: 246.2 }, { x: 12.8, y: 0.6, z: 250.6 });
    await T.sleep(300);
    await T.shot('badgaster_stadier');
    await release(T);

    // 3. A kick: the empty lounger (L[0] made free) and the taken one (L[2], lobster red).
    await T.ev((i) => { __game.bathers.recs[i].occ = false; }, L[0].i);
    await T.ev(() => { const g = __game; g.cam.yaw += Math.PI; g.cam.snapNext = true; });
    await T.sleep(400);
    check(!(await recOf(T, L[0].i)).ch, 'the free lounger has nobody');
    await stand(T, L[0].x, L[0].z - 1.6, 0);
    await T.ev(() => __game.shame.clear());
    let v0 = await sh(T);
    await T.tap('KeyJ'); await T.sleep(300);
    const dEmpty = (await sh(T)) - v0;
    check(!(await recOf(T, L[0].i)).alive && dEmpty > 0, `the empty lounger broken (+${dEmpty})`);
    await resetSaid(T);
    await stand(T, L[2].x, L[2].z - 1.6, 0, 0.5);
    await T.ev(() => __game.shame.clear());
    v0 = await sh(T);
    await T.tap('KeyJ');
    await T.sleep(120);
    const fly = await T.ev(() => { const b = __game.bathers, ch = b.loose[0]; return { last: b.last, n: b.loose.length, ch: ch && { state: ch.state, flip: ch.flip, vz: ch.vz, vy: ch.vy, spin: ch.spin, rate: ch.spinRate } }; });
    await T.shot('badgaster_kullerbytta');
    const dTaken = (await sh(T)) - v0;
    T.log('kick', JSON.stringify(fly), 'skandal empty', dEmpty, 'taken', dTaken);
    check(fly.last?.kind === 'flyoff' && fly.n === 1 && fly.ch.state === 'flung' && fly.ch.flip && fly.ch.rate < 0, `off backwards in a somersault (${JSON.stringify(fly)})`);
    check(fly.ch.vz > 2, `over the backrest, along the lounger's facing (vz ${fly.ch.vz})`);
    check(Math.abs(dTaken - dEmpty) < 0.05, `the same SKANDAL as an empty lounger (${dTaken} vs ${dEmpty})`);
    await T.until(() => __game.bathers.loose.some((c) => c.state === 'normal'), 6000);
    await T.sleep(300);
    let s = await said(T);
    T.log('kick lines', JSON.stringify(s));
    const ouch = s.find(([w, l]) => w === 'bather' && OUCH.includes(l)), up = s.find(([w, l]) => w === 'bather' && GETUP.includes(l));
    check(!!ouch && !!up && up[2] > ouch[2], `an OUCH bark off the lounger, a GETUP bark on his feet (${JSON.stringify(s)})`);
    check((await T.ev(() => window.__hits.length)) === 0 && (await T.ev(() => __game.sorry.last?.kind)) !== 'hit', 'never counted as a person hit');
    await T.shot('badgaster_upp');
    // He stands, and goes once unseen (here: him 30 m off, past seenR).
    await stand(T, L[2].x, L[2].z - 30, PI);
    await T.until(() => __game.bathers.loose.length === 0, 8000);

    // 4. His car at 10 m/s through a taken lounger (front row, nothing ahead of it but the next row).
    const C = await bedAt(T, 19.8, 240.3);
    await away(T);
    await take(T, [[C.i, 200, 'belly']], 19.8, 240.3, 4);
    await stand(T, C.x - 4, C.z - 7, 0.5);
    await T.sleep(600);
    check((await recOf(T, C.i)).ch?.state === 'lying', 'a bather on the lounger ahead of the car');
    await clearPeds(T, C.x, C.z);
    await resetSaid(T);
    await drive(T, C.x, C.z - 9, 0);
    await T.frames(4);
    await T.ev(() => __game.shame.clear());
    v0 = await sh(T);
    await go(T, 10);
    await T.until((i) => !__game.bathers.recs[i].p.alive, 3000, C.i);
    const dCar = (await sh(T)) - v0;
    const cf = await T.ev(() => { const b = __game.bathers, ch = b.loose[0]; return { last: b.last, ch: ch && { state: ch.state, flip: ch.flip, vz: +ch.vz.toFixed(2) } }; });
    await brake(T);
    await T.sleep(100);
    await T.shot('badgaster_bil');
    await T.sleep(3000);
    const shameK = await T.ev(() => __game.shame.cfg.gain ?? 1);
    T.log('car', JSON.stringify(cf), 'skandal', dCar, 'gain', shameK);
    check(cf.last?.kind === 'flyoff' && cf.last.car && cf.ch?.flip && cf.ch.vz > 5, `off along the car (${JSON.stringify(cf)})`);
    check(Math.abs(dCar - 1.2 * shameK) < 0.05, `the lounger's SKANDAL only (${dCar}, 1 × 1.2 × gain ${shameK})`);
    check((await T.ev(() => window.__hits.length)) === 0, 'never counted as a person hit');

    // 5. The lounger back after its smash (tickProps: him 70 m off): someone new, pale.
    const before = await recOf(T, L[2].i);
    await T.ev(() => { const g = __game; if (g.playerCar) g.exitCar(true); });
    await away(T);
    await T.ev((i) => { __game.bathers.recs[i].p.respawn = 0; }, L[2].i);
    await T.frames(6);
    const back = await recOf(T, L[2].i);
    T.log('respawn', JSON.stringify(before), '->', JSON.stringify(back));
    check(back.alive && back.occ && back.n === before.n + 1 && back.seed !== before.seed && back.stage === 0, `back with someone new on it (${JSON.stringify(back)})`);
    await stand(T, 12.8, 244.5, 0);
    await T.sleep(600);
    const nb = await recOf(T, L[2].i);
    check(nb.ch?.state === 'lying' && nb.ch.stage === 0 && cfg.skins[0].includes(nb.ch.skin), `a pale newcomer lies there (${JSON.stringify(nb)})`);

    // 6. Night: nobody; the next morning a new crowd.
    await stand(T, 0, 236, 0);
    await T.sleep(800);
    check((await snap(T)).count > 0, 'bathers by day');
    const d0 = await T.ev(() => __game.bathers.dayN);
    await T.ev(() => __game.day.set(22));
    await away(T);
    await stand(T, 0, 236, 0);
    await T.sleep(800);
    check((await snap(T)).count === 0, 'nobody at night');
    await T.ev(() => __game.day.set(10));
    await T.sleep(300);
    await away(T);
    await stand(T, 0, 236, 0);
    await T.sleep(800);
    const morn = await T.ev(() => { const b = __game.bathers; return { dayN: b.dayN, count: b.count, rolled: b.recs.filter((r) => r.day === b.dayN).length, n: b.recs.length }; });
    T.log('morning', JSON.stringify(morn));
    check(morn.dayN === d0 + 1 && morn.count > 0, `a new morning, a new crowd (${JSON.stringify(morn)})`);
    await T.ev(() => __game.day.set(15));

    // 7. A mission start takes every bather away at once (the SunTrip pool's too).
    await T.sleep(500);
    await startFriskotek(T);
    const gone = await T.ev(() => { const b = __game.bathers; return { state: __game.missions.state, count: b.count, shown: b.spare.filter((c) => c.root.visible || c.state !== 'hidden').length, made: b.made }; });
    T.log('mission start', JSON.stringify(gone));
    check(gone.count === 0 && gone.shown === 0, `none at the mission start (${JSON.stringify(gone)})`);
    await T.until(() => __game.missions.state === 'running', 30000);
    await T.sleep(500);
    check((await T.ev(() => __game.bathers.count)) === 0, 'none in the mission');

    // 8. The flight level has none.
    await T.fresh('&mission=2');
    await T.sleep(1000);
    check((await T.ev(() => __game.bathers.count + __game.bathers.made)) === 0, 'no bathers in the flight level');
  },

  async stekt(T) {
    await T.fresh('&mission=6');
    await resetSaid(T);
    const { B: cfg } = await lines(T);
    const w = cfg.stekt.wake;
    await T.sleep(1000);
    const pair = () => T.ev(async () => {
      const g = __game, b = g.bathers, M = await import('/src/actors/models.js');
      const one = (k) => {
        const n = g.npc(k), bed = b.beds?.[k];
        return { state: n.state, outfit: n.outfit, red: n.def.skin === M.STEKT_SKIN, slump: n.anim.slump, busy: n.busy, spot: n.spot, held: !!b.held[k], x: +n.x.toFixed(2), z: +n.z.toFixed(2),
          onBed: !!bed && n.state === 'lying' && Math.hypot(n.x - bed.x, n.z - bed.z) < 0.6, lift: n.liePose?.lift ?? null, timer: n.timer };
      };
      return { berra: one('berra'), robban: one('robban') };
    });
    let P = await pair();
    T.log('index 6', JSON.stringify(P));
    check(['berra', 'robban'].every((k) => P[k].held && P[k].onBed && P[k].outfit === 'stekt' && P[k].red && P[k].slump), `Berra and Robban lie lobster red, asleep, on their loungers (${JSON.stringify(P)})`);
    const bed = await T.ev(() => { const p = __game.bathers.beds.berra; return { x: p.x, z: p.z, yaw: p.yaw }; });

    // From BAR PISCINA, and close.
    await stand(T, bed.x - 0.8, bed.z - 1.65, 0);
    await cut(T, { x: 14.6, y: 2.4, z: 14.2 }, { x: 7.4, y: 0.6, z: 21.8 });
    await T.sleep(300);
    await T.shot('stekt_bar');
    await release(T);
    await T.sleep(9500);
    let s = await said(T);
    check(s.some(([k, l]) => k === 'berra' && cfg.stekt.snore.berra.includes(l)) && s.some(([k, l]) => k === 'robban' && cfg.stekt.snore.robban.includes(l)), `both snore (${JSON.stringify(s)})`);
    await cut(T, { x: 7.0, y: 1.9, z: 17.6 }, { x: 7.4, y: 0.7, z: 22.0 });
    await T.sleep(200);
    await T.shot('stekt');
    await release(T);

    // E: Stig's word, Berra's head up with five minutes more, Robban in his sleep.
    await stand(T, bed.x - 0.2, bed.z - 1.65, 0);
    const it = await T.ev(() => { const g = __game, n = g.nearestInteractable(); return n?.type === 'it' ? n.it.id : n?.type; });
    check(it === 'stekt:wake', `the E point on Berra (${it})`);
    await resetSaid(T);
    await T.tap('KeyE');
    await T.sleep((w.liftAt + 0.9) * 1000);
    P = await pair();
    await cut(T, { x: bed.x - 2.2, y: 1.6, z: bed.z - 2.4 }, { x: bed.x, y: 0.9, z: bed.z + 0.3 });
    await T.sleep(100);
    await T.shot('stekt_fem_minuter');
    await release(T);
    check(P.berra.lift > 0.6 && P.berra.state === 'lying', `Berra lifts his head (${P.berra.lift})`);
    await T.sleep((w.liftSecs + w.gap + 1) * 1000);
    s = await said(T);
    T.log('wake', JSON.stringify(s));
    const a = s.find(([k, l]) => k === 'stig' && l === w.stig), b = s.find(([k, l]) => k === 'berra' && l === w.berra), c = s.find(([k, l]) => k === 'robban' && l === w.robban);
    check(!!a && !!b && !!c && a[2] < b[2] && b[2] < c[2], `Stig, then Berra, then Robban (${JSON.stringify(s)})`);
    P = await pair();
    check(P.berra.lift < 0.1 && P.berra.state === 'lying', 'Berra back asleep');

    // A kick at Berra's lounger: off it, asleep on the ground, no complaint.
    await resetSaid(T);
    await stand(T, bed.x, bed.z - 1.6, 0);
    await T.tap('KeyJ');
    await T.sleep(150);
    P = await pair();
    check(P.berra.state === 'flung' && P.berra.held, `Berra off his lounger (${P.berra.state})`);
    await T.sleep(3000);
    P = await pair();
    await T.shot('stekt_sparkad');
    check(P.berra.state === 'down' && P.berra.timer > 100 && P.berra.held && P.berra.outfit === 'stekt', `asleep on the ground (${JSON.stringify(P.berra)})`);
    await T.sleep(7000);
    s = await said(T);
    T.log('kicked', JSON.stringify(s));
    check(s.every(([k, l]) => k !== 'berra' || cfg.stekt.snore.berra.includes(l)), 'no complaint from Berra');
    check(s.some(([k, l]) => k === 'berra' && cfg.stekt.snore.berra.includes(l)), 'he snores on, on the ground');
    // The lounger back (he was 70 m off) and nobody looking: on it again.
    await away(T);
    await T.ev(() => { __game.bathers.beds.berra.respawn = 0; });
    await T.sleep(600);
    P = await pair();
    check(P.berra.onBed && P.berra.held, `back on his lounger (${JSON.stringify(P.berra)})`);

    // A mission start: both home at once, standing, in their own skin.
    await startFriskotek(T);
    P = await pair();
    const home = await T.ev(() => { const g = __game, l = window.__lm('flamencoBar'); return ['berra', 'robban'].map((k) => +Math.hypot(g.npc(k).x - l.x, g.npc(k).z - l.z).toFixed(2)); });
    T.log('mission start', JSON.stringify(P), 'from the bar', home);
    check(['berra', 'robban'].every((k) => !P[k].held && P[k].state === 'normal' && P[k].outfit === 'sol' && !P[k].red && !P[k].slump && P[k].spot !== 'stekt'), `home, awake, in their own skin (${JSON.stringify(P)})`);
    check(home.every((d) => d < 2.5), `at the bar (${home})`);

    // Index 7 (asnan next) has them; 5 (buss17) and 8 (the bodega) do not.
    for (const [i, want] of [[7, true], [5, false], [8, false]]) {
      await T.fresh(`&mission=${i}`);
      await T.sleep(1000);
      P = await pair();
      T.log('index', i, JSON.stringify(P));
      check(['berra', 'robban'].every((k) => P[k].held === want && P[k].onBed === want && (P[k].outfit === 'stekt') === want), `index ${i}: ${want ? 'on their loungers' : 'not there'} (${JSON.stringify(P)})`);
    }
  },
};
