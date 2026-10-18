// Traktorn med släpkärran (feature 121, DESIGN §10.54): the farmer's tractor by the tomato fields'
// tool hut on (1,0), the farmer running after it, the rows' jolts and the åksjuka, the honking queue,
// the fetch home, the mission lock. `traktor` checks it; `traktorshots` shoots it for review.
import fs from 'fs';
import path from 'path';
import { check, ROOT } from '../lib.mjs';

const C0 = { x: -160, z: -240 };                       // block (1,0)'s centre
const W = (lx, lz) => ({ x: C0.x + lx, z: C0.z + lz });

async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js'), { audio } = await import('/src/audio.js');
    window.__said = []; window.__toasts = []; window.__au = { diesel: 0 };
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t === g.traktor.farmer ? 'bonde' : t?.key || 'x', text, +g.time.toFixed(2)]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text); return toast(text, ...a); };
    const engine = audio.engine.bind(audio);
    audio.engine = (on, r, l, el, di) => { if (on && di) window.__au.diesel++; return engine(on, r, l, el, di); };
    window.__hud = hud;
  });
}
const said = (T) => T.ev(() => window.__said.slice());
const st = (T) => T.ev(() => {
  const g = __game, t = g.traktor, f = t.farmer, c = g.named.traktor, p = g.player, d = window.__lm('traktorBod');
  const tail = c ? t.tail(c, 0.4) : null;
  return {
    mode: t.mode, fs: f.state, fv: f.root.visible, fx: +f.x.toFixed(2), fz: +f.z.toFixed(2), fsp: +f.speed.toFixed(2),
    fTail: tail ? +Math.hypot(f.x - tail.x, f.z - tail.z).toFixed(2) : null, fDoor: +Math.hypot(f.x - d.x, f.z - d.z).toFixed(2),
    near: +t.near.toFixed(2), sprint: f.anim.sprint, oath: f.anim.oath, extras: t.extras.length,
    in: g.playerCar === c && !!c, car: g.playerCar?.name || null, cx: c ? +c.x.toFixed(2) : null, cz: c ? +c.z.toFixed(2) : null, cyaw: c ? +c.yaw.toFixed(2) : null,
    v: c ? +c.speed.toFixed(2) : null, home: c ? +Math.hypot(c.x - c.home.x, c.z - c.home.z).toFixed(2) : null,
    bumps: t.bumps, honks: t.honks, spills: t.spills, fetched: t.fetched, takes: t.takes, chases: t.chases, joltMax: +t.joltMax.toFixed(3), puffs: t.puffs,
    last: t.last, prompt: window.__hud?._prompt || '', num: document.querySelector('#speedo .sp-num')?.textContent, name: document.querySelector('#speedo .sp-name')?.textContent,
    ms: g.missions.state, px: +p.x.toFixed(2), pz: +p.z.toFixed(2), shame: g.shame.v,
  };
});
const kinds = (T) => T.ev(() => __game.traktor.log.map((e) => e.kind));
// Stig on foot beside the tractor's left (+x local) side, facing it.
async function besideTractor(T) {
  await T.ev(() => {
    const g = __game, c = g.named.traktor;
    if (g.playerCar) g.exitCar(true);
    g.player.state = 'normal';
    const lx = Math.cos(c.yaw), lz = -Math.sin(c.yaw);
    g.player.teleport(c.x + lx * 1.7, c.z + lz * 1.7, c.yaw - Math.PI / 2);
    g.cam.yaw = c.yaw - Math.PI / 2; g.cam.snapNext = true;
  });
  await T.frames(8);
}
// Hold W (and `turn` while fn says so) for up to ms, recording the top forward speed.
async function drive(T, ms, { turn = null, until = null } = {}) {
  await T.ev(() => {
    const g = __game, r = (window.__run = { max: 0 });
    window.__runFn && g.offFrame(window.__runFn);
    window.__runFn = () => { const c = g.playerCar; if (c) r.max = Math.max(r.max, c.forwardSpeed); };
    g.onFrame(window.__runFn);
  });
  const keys = ['KeyW', ...(turn ? [turn] : [])];
  for (const k of keys) await T.page.keyboard.down(k);
  if (until) await T.until(until, ms).catch(() => {});
  else await T.sleep(ms);
  for (const k of keys) await T.page.keyboard.up(k);
  return T.ev(() => { __game.offFrame(window.__runFn); window.__runFn = null; return +window.__run.max.toFixed(2); });
}
async function brake(T) {
  await T.page.keyboard.down('KeyS');
  await T.until(() => !__game.playerCar || __game.playerCar.forwardSpeed < 0.4, 6000).catch(() => {});
  await T.page.keyboard.up('KeyS');
  await T.frames(4);
}

export const SCENARIOS = {
  async traktor(T) {
    await T.fresh('&mission=9');
    await spies(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam on the island');
    const C = await T.ev(() => { const c = __game.traktor.cfg; return JSON.parse(JSON.stringify({ ...c, farmer: null })); });

    // 0. Every line in TRAKTORN carries a source tag on its line in content/island.js.
    const src = fs.readFileSync(path.join(ROOT, 'src/content/island.js'), 'utf8').split('\n');
    const lines = [C.prompt, C.blocked, C.borrow, ...C.shouts, ...C.answers, C.giveUp, C.back, C.backStig, ...C.sick, ...C.honked];
    const untagged = lines.filter((s) => !src.some((l) => l.includes(`'${s}'`) && /\/\/ \[(N|F\*?)\]/.test(l)));
    check(!untagged.length, `every TRAKTORN line tagged (${JSON.stringify(untagged)})`);
    const sickTag = src.find((l) => l.includes(`'${C.sick[0]}'`));
    check(/\[F\*\]\(t\)/.test(sickTag), `the åksjuka line is [F*](t) (${sickTag?.trim()})`);

    // 1. The tractor: named, unlocked, the toy type, on its spot before the hut; spawned after every
    //    other parked car; the farmer in his hut.
    const car = await T.ev(() => {
      const g = __game, c = g.named.traktor, i = g.cars.indexOf(c);
      const later = g.cars.slice(0, i).filter((o) => o.home && !o.spec.toy && !o.traffic).length, after = g.cars.slice(i + 1).filter((o) => o.home && !o.spec.toy).length;
      return c && { type: c.type, toy: !!c.spec.toy, locked: !!c.locked, x: +c.x.toFixed(2), z: +c.z.toFixed(2), yaw: +c.yaw.toFixed(2), home: !!c.home, noExplode: c.noExplode, later, after, color: c.color.toString(16) };
    });
    T.log('tractor', JSON.stringify(car));
    const h0 = W(0.2, -16);
    check(car && car.type === 'traktor' && car.toy && !car.locked && car.home && car.noExplode, `the tractor is a named, unlocked toy car (${JSON.stringify(car)})`);
    check(Math.hypot(car.x - h0.x, car.z - h0.z) < 0.3 && Math.abs(car.yaw) < 0.01, `on its spot before the hut, facing down the track (${car.x}, ${car.z})`);
    check(car.after === 0, `no non-toy parked car spawns after it (${car.after})`);
    let r = await st(T);
    check(r.fs === 'hidden' && !r.fv && r.extras === 0 && r.mode === null, `the farmer in his hut (${JSON.stringify(r)})`);
    const spec = await T.ev(() => { const s = __game.named.traktor.spec; return { max: s.maxSpeed, gov: s.governed, diesel: s.diesel, bed: s.bed, open: s.open }; });
    check(spec.max === 4.2 && spec.gov && spec.diesel && spec.bed && spec.open, `the spec (${JSON.stringify(spec)})`);

    // 2. On foot at it: "Låna traktorn"; E: Stig at the wheel high up, full size; his line.
    await besideTractor(T);
    const near = await T.ev(() => { const it = __game.nearestInteractable(); return it?.type === 'car' ? it.car.name : it?.type; });
    r = await st(T);
    check(near === 'traktor' && r.prompt.includes('Låna traktorn'), `the prompt at the tractor (${near}, "${r.prompt}")`);
    await T.ev(() => { window.__said = []; });
    await T.tap('KeyE');
    await T.frames(6);
    r = await st(T);
    check(r.in && r.name === 'Traktorn', `at the wheel, "Traktorn" on the speedo (${r.car}, ${r.name})`);
    const fit = await T.ev(() => { const g = __game, p = g.player, c = g.playerCar, m = p.model, k = p.root.scale.x; return { k: +k.toFixed(3), hips: +(p.root.position.y + m.legLen * k).toFixed(3), head: +(p.root.position.y + m.headTop * k).toFixed(3), x: +p.root.position.x.toFixed(2), z: +p.root.position.z.toFixed(2), wy: +p.y.toFixed(2) }; });
    T.log('seat', JSON.stringify(fit));
    check(fit.k === 1 && Math.abs(fit.hips - 1.12) < 0.02 && fit.head > 2.5 && fit.x === 0, `Stig full size high up in the middle (${JSON.stringify(fit)})`);
    let s = await said(T);
    check(s.some(([w, t]) => w === 'stig' && t === C.borrow), `"${C.borrow}" (${JSON.stringify(s)})`);

    // 3. The farmer comes out of the door and shouts.
    await T.until(() => __game.traktor.mode === 'chase', 6000);
    r = await st(T);
    const out = await T.ev(() => __game.traktor.log.find((e) => e.kind === 'door'));
    const door = await T.L('traktorBod');
    check(out && Math.hypot(out.x - door.x, out.z - door.z) < 0.3 && r.fv && r.extras === 1, `the farmer out at the hut's door (${JSON.stringify(out)})`);
    s = await said(T);
    check(s.some(([w, t]) => w === 'bonde' && t === C.shouts[0]), `"${C.shouts[0]}" (${JSON.stringify(s)})`);
    const t0 = s.find(([w, t]) => w === 'stig' && t === C.borrow)[2], t1 = s.find(([w, t]) => w === 'bonde' && t === C.shouts[0])[2];
    check(t1 - t0 > 0.6 && t1 - t0 < 1.6, `he comes out about 0.9 s after Stig's line (${(t1 - t0).toFixed(2)})`);

    // 4. Down the track at full throttle: 18 km/h, the diesel; the farmer runs after it and never
    //    gets nearer than `keep` behind its tail; Stig answers him.
    let max = await drive(T, 4500);
    r = await st(T);
    T.log('down the track', max, JSON.stringify(r));
    check(max >= 4.8 && max <= 5.05, `tops out at about 5.04 m/s (${max})`);
    check(+r.num >= 17 && +r.num <= 18, `the speedo reads 18 km/h (${r.num})`);
    check(await T.ev(() => window.__au.diesel > 0), 'the motor is the diesel');
    check(r.puffs > 10, `the stack puffs (${r.puffs})`);
    check(r.mode === 'chase' && r.sprint && r.fsp > 3.5, `the farmer runs after it (${r.mode}, ${r.fsp})`);
    check(r.near >= C.keep - 0.6, `never nearer than keep behind the tail (${r.near})`);
    s = await said(T);
    check(s.some(([w, t]) => w === 'stig' && t === C.answers[0]), `Stig answers "${C.answers[0]}" (${JSON.stringify(s)})`);
    check(s.filter(([w]) => w === 'bonde').length >= 2, 'he shouts again');

    // 5. Right (west) into the rows and across them: jolts, leaves, Stig's åksjuka; into the canes:
    //    tomatoes off the trailer.
    await T.ev(() => { __game.traktor.joltMax = 0; window.__said = []; });
    max = await drive(T, 4000, { turn: 'KeyD', until: () => { const c = __game.playerCar; return c && Math.sin(c.yaw) < -0.97; } });
    r = await st(T);
    T.log('turned', JSON.stringify(r));
    check(r.cyaw < -1.2, `facing west (${r.cyaw})`);
    const b0 = r.bumps;
    await drive(T, 9000, { until: () => { const c = __game.playerCar; return c && c.x < -160 - 26.5 && c.speed < 1; } });
    r = await st(T);
    T.log('across the rows', JSON.stringify(r));
    check(r.bumps - b0 >= 12, `the rows jolt it (${r.bumps - b0} bumps)`);
    check(r.joltMax > 0.03, `a visible jolt (${r.joltMax} m)`);
    s = await said(T);
    check(s.some(([w, t]) => w === 'stig' && t === C.sick[0]), `"${C.sick[0]}" in the furrows (${JSON.stringify(s)})`);
    check(s.filter(([w, t]) => C.sick.includes(t)).length === 1, 'one åksjuka line in 14 s');
    check(r.spills >= 1, `tomatoes off the trailer at the canes (${r.spills}, ${JSON.stringify(r.last)})`);
    await T.shot('traktor_rows');

    // 6. Standing still: the farmer comes up and stops `keep` behind the tail; never at it.
    await brake(T);
    await T.sleep(2500);
    r = await st(T);
    T.log('standing', JSON.stringify(r));
    check(r.mode === 'chase' && r.fsp < 0.6 && r.fTail >= C.keep - 0.6 && r.fTail < C.keep + 1.2, `he stands about keep behind the tail (${r.fTail}, ${r.fsp})`);
    check(r.near >= C.keep - 0.6, `never nearer than keep in the chase (${r.near})`);
    await T.shot('traktor_standing');

    // 7. Out of it with him close: he comes to it, "¡Mi tractor! ¡Por fin!", Stig's thanks; he walks home.
    await T.ev(() => { window.__said = []; });
    await T.tap('KeyE');
    await T.frames(4);
    r = await st(T);
    check(!r.in && r.mode === 'back', `out: he comes for it (${r.mode})`);
    await T.until(() => __game.traktor.mode === 'home', 20000);
    s = await said(T);
    T.log('back', JSON.stringify(s));
    check(s.some(([w, t]) => w === 'bonde' && t === C.back) && s.some(([w, t]) => w === 'stig' && t === C.backStig), `"${C.back}" and "${C.backStig}" (${JSON.stringify(s)})`);
    check(s.findIndex(([w, t]) => t === C.back) < s.findIndex(([w, t]) => t === C.backStig), 'his line first');
    const d0 = (await st(T)).fDoor, g0 = await T.ev(() => __game.time);
    await T.sleep(2500);
    r = await st(T);
    const gt = (await T.ev(() => __game.time)) - g0, wv = (d0 - r.fDoor) / gt;
    check(r.mode === 'home' && wv > 0.9 && wv < 1.45, `he walks home at about 1.4 m/s (${d0} → ${r.fDoor} in ${gt.toFixed(2)} s)`);

    // 8. Stig far off: the farmer in, the tractor fetched home (nobody sees either).
    await T.ev(() => { const g = __game, l = window.__lm('flamenco'); g.debugWarp(l.x, l.z, 0); });
    await T.frames(20);
    r = await st(T);
    T.log('fetched', JSON.stringify(r), JSON.stringify(await kinds(T)));
    check(r.fs === 'hidden' && r.mode === null && r.extras === 0, `the farmer in (${r.mode}, ${r.fs})`);
    check(r.home < 0.3 && r.fetched === 1 && r.last.kind === 'fetch', `the tractor back on its spot (${r.home}, ${JSON.stringify(r.last)})`);

    // 9. Again: a long chase in circles; he never gets nearer than keep and gives up after maxSecs,
    //    with a raised fist and "¡Ay… suecos!", then walks home.
    await besideTractor(T);
    await T.ev(() => { window.__said = []; });
    await T.tap('KeyE');
    await T.until(() => __game.traktor.mode === 'chase', 6000);
    await drive(T, 4500);
    await drive(T, 30000, { turn: 'KeyA', until: () => __game.traktor.mode === 'sulk' });
    r = await st(T);
    s = await said(T);
    T.log('gave up', JSON.stringify(r), JSON.stringify(s));
    check(r.chases === 2 && r.mode === 'sulk' && r.oath, `he gives up with a raised fist (${r.mode}, ${r.oath})`);
    check(s.some(([w, t]) => w === 'bonde' && t === C.giveUp), `"${C.giveUp}"`);
    check(r.near >= C.keep - 0.6, `never nearer than keep in the circles (${r.near})`);
    const shouts = s.filter(([w]) => w === 'bonde').map(([, t]) => t);
    check(C.shouts.every((t) => shouts.includes(t)), `his shouts in turn (${JSON.stringify(shouts)})`);
    await T.shot('traktor_giveup');
    await T.until(() => __game.traktor.mode === 'home', 5000);
    await brake(T);

    // 10. The honking queue: on the z −200 road's eastbound lane with a traffic car behind it.
    await T.ev(async () => {
      const g = __game, { Car } = await import('/src/actors/car.js'), { AIDriver } = await import('/src/actors/drivers.js'), { randomPed } = await import('/src/actors/models.js');
      const c = g.playerCar;
      c.place(-178, -197.25, Math.PI / 2);
      for (const o of g.cars.slice()) if (o.traffic && Math.abs(o.z + 200) < 8 && o.x > -230 && o.x < -100) g.removeCar(o);
      const q = new Car('hatch');
      q.place(-196, -197.25, Math.PI / 2);
      q.traffic = true;
      g.addBust(randomPed(), q);
      q.ai = new AIDriver(q, { mode: 'traffic', cruise: 12 });
      g.addCar(q);
      window.__queue = q;
      g.cam.yaw = Math.PI / 2; g.cam.snapNext = true;
      window.__said = [];
    });
    await drive(T, 9000, { until: () => __game.traktor.honks > 0 && window.__said.some(([w]) => w === 'stig') });
    r = await st(T);
    s = await said(T);
    T.log('queue', JSON.stringify(r), JSON.stringify(s));
    check(r.honks >= 1, `the car behind honks (${r.honks})`);
    check(s.some(([w, t]) => w === 'stig' && t === C.honked[0]), `"${C.honked[0]}" (${JSON.stringify(s)})`);
    await T.shot('traktor_queue');
    await brake(T);

    // 11. A mission start: the tractor home, the farmer in; no prompt at it, E refused with the toast,
    //     a debug seat undone.
    await T.ev(() => { const g = __game; g.exitCar(true); });
    await T.frames(4);
    await T.startMission();
    r = await st(T);
    check(r.home < 0.3 && r.fs === 'hidden' && r.mode === null, `at the mission start the tractor home, the farmer in (${r.home}, ${r.fs})`);
    check((await kinds(T)).includes('home'), 'logged home');
    await besideTractor(T);
    await T.ev(() => { window.__toasts = []; });
    r = await st(T);
    const nearM = await T.ev(() => { const it = __game.nearestInteractable(); return it?.type === 'car' ? it.car.name : it?.type; });
    check(r.ms === 'running' && nearM === 'traktor' && r.prompt === '', `in the mission no prompt at the tractor (${r.ms}, ${nearM}, "${r.prompt}")`);
    await T.tap('KeyE');
    await T.frames(4);
    r = await st(T);
    const toasts = await T.ev(() => window.__toasts.slice());
    check(!r.in && toasts.includes(C.blocked), `E refused with the toast (${r.car}, ${JSON.stringify(toasts)})`);
    await T.shot('traktor_mission');
    await T.ev(() => { const g = __game, c = g.named.traktor; g.seat(g.player, c, 1); g.playerCar = c; c.ctrl.park = false; });
    await T.frames(4);
    r = await st(T);
    check(!r.in && r.last.kind === 'out', `put out of it in a mission (${r.car}, ${JSON.stringify(r.last)})`);
    const rc = await T.ev(async () => {
      const K = await import('/src/game/missions/kinds/core.js'), g = __game;
      const car = K.retryCar(g, { cars: [] }, { at: 'vischan' }, g.named.traktor);
      return { type: car.type, mine: g.playerCar === car };
    });
    check(rc.type !== 'traktor' && rc.mine, `retryCar gives a spare, not the tractor (${JSON.stringify(rc)})`);
    await T.ev(() => __game.exitCar(true));

    // 12. After the mission: a wreck steams and is back whole once Stig is far; E gets in again.
    await T.ev(() => __game.missions.abort());
    await T.frames(4);
    const wreck = await T.ev(() => { const g = __game, c = g.named.traktor; window.__wreck = c; c.damage(999, g); return { dead: c.dead, burn: c.burn, steam: c.steamT > 0 }; });
    check(wreck.dead && !wreck.burn && wreck.steam, `a wreck steams, no fire (${JSON.stringify(wreck)})`);
    await T.ev(() => { const g = __game, l = window.__lm('flamenco'); g.player.state = 'normal'; g.debugWarp(l.x, l.z, 0); });
    await T.frames(10);
    const back = await T.ev(() => { const g = __game, c = g.named.traktor; return { fresh: c !== window.__wreck, dead: c.dead, gone: !g.cars.includes(window.__wreck), d: +Math.hypot(c.x - c.home.x, c.z - c.home.z).toFixed(2), last: g.traktor.last }; });
    check(back.fresh && !back.dead && back.gone && back.d < 0.3 && back.last.wreck, `a whole tractor back on its spot (${JSON.stringify(back)})`);
    await besideTractor(T);
    await T.tap('KeyE');
    await T.frames(6);
    r = await st(T);
    check(r.ms === 'idle' && r.in, `free roam again: at the wheel (${r.ms}, ${r.car})`);
  },

  // Review shots: the tractor parked, seated, the farmer out and the chase, the rows, the queue.
  async traktorshots(T) {
    await T.fresh('&mission=9');
    const cut = async (name, eye, look) => {
      await T.ev((eye, look) => { const g = __game, c = g.named.traktor; const w = (v) => ({ x: c.x + v[0] * Math.cos(c.yaw) + v[2] * Math.sin(c.yaw), y: c.y + v[1], z: c.z - v[0] * Math.sin(c.yaw) + v[2] * Math.cos(c.yaw) }); g.cam.cutTo(w(eye), w(look)); }, eye, look);
      await T.frames(14);
      await T.shot(name);
    };
    const away = W(14, 20);
    await T.ev((a) => { const g = __game; g.player.teleport(a.x, a.z, 0); }, away);
    await T.frames(10);
    await cut('traktorshot_front', [3.6, 2.0, 6.0], [0, 1.0, 0]);
    await cut('traktorshot_side', [-7.5, 1.7, 0.2], [0, 1.0, 0]);
    await cut('traktorshot_rear', [3.0, 2.6, -6.5], [0, 0.9, -1.5]);
    await cut('traktorshot_hut', [-6, 3.2, 9], [0.5, 1.2, -6]);
    await T.ev(() => { const g = __game, c = g.named.traktor; g.cam.release(); const lx = Math.cos(c.yaw), lz = -Math.sin(c.yaw); g.player.teleport(c.x + lx * 1.7, c.z + lz * 1.7, c.yaw - Math.PI / 2); g.enterCar(c); });
    await T.frames(10);
    await cut('traktorshot_seated', [2.8, 2.3, 4.2], [0, 1.6, 0.3]);
    await T.until(() => __game.traktor.mode === 'chase', 6000);
    await T.frames(6);
    await cut('traktorshot_out', [5.5, 2.4, -1], [0.5, 1.2, -5]);
    await T.ev(() => __game.cam.release());
    await T.page.keyboard.down('KeyW');
    await T.sleep(2600);
    await T.shot('traktorshot_chase_cam');
    await T.page.keyboard.up('KeyW');
    await T.page.keyboard.down('KeyW');
    await T.sleep(600);
    await cut('traktorshot_chase', [-6, 2.0, 1.5], [0, 1.0, -4.5]);
    await T.page.keyboard.up('KeyW');
  },
};
