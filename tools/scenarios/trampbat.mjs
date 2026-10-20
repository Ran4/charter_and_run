// Hyr en trampbåt (free roam, DESIGN §10.57; feature 120): trampbat trampbatshots.
//   trampbat: at index 9 between missions E at the PATINES · TRAMPBÅTAR sign (from either side, not from
//             4 m off; shut while the SKANDAL meter is up): "E Hyr trampbåt – 200 pta"; with an empty purse
//             Ole pays, with 500 pta 200 go; the fade, Stig at the pedals of a `trampbat` at the water's
//             edge (96, 301.8) with Ole's double beside him (seated, full size; the real Ole where he was),
//             the speedo "Trampbåt", the samba, "Trå, Stig-Helmer! Trå!" and Stig's answer. Held W tops out
//             at 1.9–2.0 m/s (7 km/h), it glides on after W, no engine, skid or horn (H is nothing). Out
//             past the bound wall (z 314–324): past the buoy line the Rio exchange once with Ole waving,
//             further out the statistics. Its water: never past z 352, x ±250 or onto the beach (z 301.8);
//             a buoy stops it. The chase eye is never pulled in at sea (8 m behind it inside the wall's
//             band). The raft: Ole's "Se der!…", its eight coins (+200 pta) and "Åtte mynter. Da gikk turen
//             i null!". The minimap is the sea's blue beyond its canvas. E at sea: the toast, still in it;
//             R: back at the rental's water's edge. At the water's edge "E Kliv i land": Stig on the sand
//             facing inland, his thanks and Ole's line, the music back, Ole pedalling the boat back to the
//             rental (no prompt at it), gone once out of view. A forced exit at sea: a splash, "Usch, vad
//             blött." and Stig on the sand; a pursuit, a warp and a mission start end the ride the same way
//             (the boat and Ole gone); in the mission no prompt at the sign, after it (Q) the rental again;
//             after the end (index 13) the rental too.
//   trampbatshots: the sign and the boats on the sand, Stig and Ole at sea from the side and the front,
//             the view back over the beach and the town, the sunset with Ole's Rio line, the raft with its
//             coins, the boat on its way back with Ole, the big map at sea.
import { check } from '../lib.mjs';

const PI = Math.PI;

async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js'), { audio } = await import('/src/audio.js');
    window.__said = []; window.__toasts = []; window.__au = { engineOn: 0, hornOn: 0, skid: 0, splash: 0 };
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.key || 'x', text]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text); return toast(text, ...a); };
    const engine = audio.engine.bind(audio), horn = audio.horn.bind(audio), skid = audio.skid.bind(audio), splash = audio.splash.bind(audio);
    audio.engine = (on, ...a) => { if (on) window.__au.engineOn++; return engine(on, ...a); };
    audio.horn = (on) => { if (on) window.__au.hornOn++; return horn(on); };
    audio.skid = (k) => { if (k > 0) window.__au.skid++; return skid(k); };
    audio.splash = (k) => { window.__au.splash++; return splash(k); };
    window.__hud = hud; window.__audio = audio;
  });
}
const st = (T) => T.ev(() => {
  const g = __game, B = g.trampbat, c = g.playerCar, o = B.ole;
  return {
    car: c?.type || null, x: c ? +c.x.toFixed(2) : +g.player.x.toFixed(2), z: c ? +c.z.toFixed(2) : +g.player.z.toFixed(2), yaw: c ? +c.yaw.toFixed(2) : +g.player.yaw.toFixed(2),
    v: c ? +c.speed.toFixed(2) : null, fwd: c ? +c.forwardSpeed.toFixed(2) : null, y: c ? +c.y.toFixed(3) : +g.player.y.toFixed(3),
    boat: !!B.boat, inCars: !!B.boat && g.cars.includes(B.boat), ride: !!B.ride, back: !!B.back, busy: B.busy,
    ole: o ? { state: o.state, car: o.car === B.boat && !!o.car, wave: !!o.anim.wave } : null,
    coins: g.coins, left: B.coinsLeft, prompt: window.__hud._prompt || '', tune: window.__audio.tune, ms: g.missions.state, last: B.last,
    num: document.querySelector('#speedo .sp-num')?.textContent, name: document.querySelector('#speedo .sp-name')?.textContent,
    p: { state: g.player.state, x: +g.player.x.toFixed(2), z: +g.player.z.toFixed(2), yaw: +g.player.yaw.toFixed(2) },
  };
});
// Stig on foot at (x, z) facing yaw, the camera behind him.
async function stand(T, x, z, yaw) {
  await T.ev((x, z, yaw) => { const g = __game; if (g.playerCar) g.exitCar(true); g.player.state = 'normal'; g.player.teleport(x, z, yaw); g.cam.yaw = yaw; g.cam.snapNext = true; }, x, z, yaw);
  await T.frames(8);
}
// Rent a boat with `coins` in the purse: E at the sign, until he is in it and the fade is over.
async function rent(T, coins) {
  const L = await T.L('trampbat');
  await T.ev((n) => { const g = __game; g.coins = n; window.__hud.setCoins(n); }, coins);
  await stand(T, L.x, L.z - 1.4, 0);
  await T.tap('KeyE');
  await T.until(() => __game.playerCar?.type === 'trampbat' && !__game.inDialog && !__game.trampbat.busy, 10000);
  await T.frames(4);
}
// The boat at (x, z) facing yaw, still, the camera behind it.
async function put(T, x, z, yaw) {
  await T.ev((x, z, yaw) => { const g = __game, c = g.playerCar; c.place(x, z, yaw); c.vx = c.vz = c.w = 0; g.cam.yaw = yaw; g.cam.snapNext = true; }, x, z, yaw);
  await T.frames(4);
}
// Hold `keys` for `ms`, recording the highest forward speed and the boat's extremes.
async function drive(T, keys, ms) {
  await T.ev(() => {
    const g = __game, r = (window.__run = { max: 0, zMin: 1e9, zMax: -1e9, xMin: 1e9, xMax: -1e9, eye: 1e9, eyeZ: null, wave: false });
    window.__runFn && g.offFrame(window.__runFn);
    window.__runFn = () => {
      const c = g.playerCar;
      if (!c) return;
      r.max = Math.max(r.max, c.forwardSpeed);
      r.zMin = Math.min(r.zMin, c.z); r.zMax = Math.max(r.zMax, c.z); r.xMin = Math.min(r.xMin, c.x); r.xMax = Math.max(r.xMax, c.x);
      if (g.trampbat.ole?.anim.wave) r.wave = true;
    };
    g.onFrame(window.__runFn);
  });
  await T.hold(keys, ms);
  return T.ev(() => { __game.offFrame(window.__runFn); window.__runFn = null; const r = window.__run; return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(2) : v])); });
}
const said = (T) => T.ev(() => window.__said.slice());

export const SCENARIOS = {
  async trampbat(T) {
    await T.fresh('&mission=9');
    await spies(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam on the island');
    const L = await T.L('trampbat'), V = await T.L('trampbatVatten');
    check(Math.abs(L.x - 98) < 0.01 && Math.abs(L.z - 255) < 0.01 && Math.abs(V.x - 96) < 0.01 && Math.abs(V.z - 301.8) < 0.01, `the sign at (98, 255), the water's edge at (96, 301.8) (${JSON.stringify([L, V])})`);

    // 1. The sign: the prompt from either side, not from 4 m off; shut while the SKANDAL meter is up.
    await stand(T, L.x - 1, L.z - 1.6, 0);
    let r = await st(T);
    check(r.prompt === '<b>E</b> Hyr trampbåt – 200 pta', `the prompt on the north side ("${r.prompt}")`);
    await stand(T, L.x + 1.5, L.z + 1.6, PI);
    r = await st(T);
    check(r.prompt === '<b>E</b> Hyr trampbåt – 200 pta', `the prompt on the south side ("${r.prompt}")`);
    await stand(T, L.x, L.z - 4.2, 0);
    r = await st(T);
    check(r.prompt === '', `no prompt 4.2 m off ("${r.prompt}")`);
    await stand(T, L.x, L.z - 1.4, 0);
    await T.ev(() => { __game.shame.v = 30; });
    await T.frames(4);
    r = await st(T);
    check(r.prompt === '', `no prompt with SKANDAL on the meter ("${r.prompt}")`);
    await T.tap('KeyE');
    await T.frames(30);
    r = await st(T);
    check(!r.car && !r.boat && !r.busy, 'E does nothing with the meter up');
    await T.ev(() => { __game.shame.v = 0; });

    // 2. Rent with an empty purse: Ole pays; the fade; Stig at the pedals at the water's edge, Ole beside him.
    await T.ev(() => { window.__said = []; window.__toasts = []; });
    await rent(T, 0);
    r = await st(T);
    T.log('rented', JSON.stringify(r));
    let toasts = await T.ev(() => window.__toasts.slice());
    check(r.car === 'trampbat' && r.coins === 0 && toasts.some((t) => /Ole betalade 200/.test(t)), `in the boat, Ole paid (${r.car}, ${r.coins}, ${JSON.stringify(toasts)})`);
    check(Math.abs(r.x - 96) < 0.2 && Math.abs(r.z - 301.8) < 0.2 && Math.abs(r.yaw) < 0.05 && Math.abs(r.y - 0.15) < 0.001, `at the water's edge facing the sea (${r.x}, ${r.z}, ${r.yaw}, y ${r.y})`);
    check(r.ole?.state === 'seated' && r.ole.car && r.inCars, `Ole's double seated in it (${JSON.stringify(r.ole)})`);
    const real = await T.ev(() => { const g = __game, o = g.npcs.ole, d = g.trampbat.ole; return { other: o !== d, x: +o.x.toFixed(1), z: +o.z.toFixed(1), side: d.seatSide, k: g.player.root.scale.x, ok: d.root.scale.x }; });
    check(real.other && real.z < 200 && real.side === -1 && real.k === 1 && real.ok === 1, `the real Ole stays where he was; both full size (${JSON.stringify(real)})`);
    check(r.name === 'Trampbåt' && r.tune === 'samba', `the speedo "Trampbåt", the samba (${r.name}, ${r.tune})`);
    await T.until(() => window.__said.filter(([w]) => w === 'stig').length >= 1, 8000);
    let s = await said(T);
    check(s.some(([w, t]) => w === 'ole' && t === 'Trå, Stig-Helmer! Trå!') && s.some(([w, t]) => w === 'stig' && t === 'Jag trampar, jag trampar…'), `the start lines (${JSON.stringify(s)})`);

    // 3. Top speed, the glide, no engine, skid or horn.
    await T.ev(() => { window.__au.engineOn = 0; window.__au.hornOn = 0; window.__au.skid = 0; });
    let d = await drive(T, ['KeyW'], 5200);
    r = await st(T);
    T.log('top', JSON.stringify(d), r.num);
    check(d.max >= 1.9 && d.max <= 2.0 && r.num === '7', `tops out at 1.9–2.0 m/s, the speedo 7 (${d.max}, ${r.num})`);
    const z0 = r.z;
    await T.sleep(2500);
    r = await st(T);
    check(r.z - z0 > 2.2, `it glides on after W (${(r.z - z0).toFixed(2)} m in 2.5 s)`);
    await T.ev(() => { window.__honk0 = __game.honk.last; });
    await T.tap('KeyH');
    await T.hold(['KeyW', 'KeyA', 'Space'], 1500);
    const au = await T.ev(() => ({ ...window.__au, honk: __game.honk.last !== window.__honk0 }));
    check(au.engineOn === 0 && au.hornOn === 0 && au.skid === 0 && !au.honk, `no engine, horn, skid or honk event (${JSON.stringify(au)})`);

    // 4. Out past the bound wall: the Rio exchange past the buoy line, once, with Ole waving; then the statistics.
    await put(T, 96, 309, 0);
    await T.ev(() => { window.__said = []; });
    d = await drive(T, ['KeyW'], 10500);
    await T.until(() => window.__said.some(([, t]) => /reise dit/.test(t)), 8000).catch(() => {});
    s = await said(T);
    T.log('rio', JSON.stringify(d), JSON.stringify(s));
    check(d.zMax > 324.5, `past the bound wall (z ${d.zMax})`);
    const rio = s.filter(([, t]) => /Rio|reise dit/.test(t));
    check(rio.length === 3 && rio[0][0] === 'ole' && rio[0][1] === 'Tenk å sitte her i desember. Det er som i Rio.' && rio[1][0] === 'stig' && rio[1][1] === 'Har du varit i Rio?' && rio[2][0] === 'ole' && rio[2][1] === 'Nei, men jeg skal reise dit.', `the Rio exchange in order (${JSON.stringify(rio)})`);
    check(d.wave, 'Ole waves at his Rio line');
    await put(T, 96, 330, 0);
    await drive(T, ['KeyW'], 4000);
    await T.until(() => window.__said.some(([, t]) => /tilbake|tillbaka/.test(t)), 12000);
    s = await said(T);
    check(s.filter(([, t]) => /Rio/.test(t)).length === 2, `the Rio exchange only once a ride (${JSON.stringify(s)})`);
    check(s.some(([w, t]) => w === 'ole' && t.startsWith('Farlige saker.')) && s.some(([w, t]) => w === 'stig' && t === 'Vi kanske ska trampa tillbaka nu.'), `the statistics further out (${JSON.stringify(s)})`);

    // 5. The chase eye at sea is never pulled in: the boat at z 327 facing the sea, the eye inside the wall's band.
    await put(T, 40, 327, 0);
    await T.frames(40);
    const eye = await T.ev(() => { const g = __game, c = g.playerCar, p = g.cam.pos; return { z: +p.z.toFixed(2), d: +Math.hypot(p.x - c.x, p.z - c.z).toFixed(2) }; });
    check(eye.d > 6.5 && eye.z > 314 && eye.z < 324, `the eye ${eye.d} m behind it at z ${eye.z} (in the wall's band)`);
    // The minimap past its canvas's edge is the sea's blue.
    await put(T, 0, 350, 0);
    await T.frames(12);
    const px = await T.ev(() => { const cv = document.getElementById('minimap'); const x = cv.getContext('2d').getImageData(cv.width / 2, cv.height * 0.2, 1, 1).data; return [x[0], x[1], x[2]]; });
    check(px[2] > 150 && px[0] < 80, `the minimap ahead at sea is blue (${px})`);

    // 6. Its water: never past z 352, x ±250, onto the beach; a buoy stops it.
    await put(T, 0, 346, 0);
    d = await drive(T, ['KeyW'], 5000);
    check(d.zMax <= 352.01, `never past z 352 (${d.zMax})`);
    await put(T, 244, 330, PI / 2);
    d = await drive(T, ['KeyW'], 5000);
    check(d.xMax <= 250.01, `never past x 250 (${d.xMax})`);
    await put(T, -244, 330, -PI / 2);
    d = await drive(T, ['KeyW'], 5000);
    check(d.xMin >= -250.01, `never past x −250 (${d.xMin})`);
    await put(T, 60, 307, PI);
    d = await drive(T, ['KeyW'], 5000);
    r = await st(T);
    check(d.zMin >= 301.79 && r.prompt === '<b>E</b> Kliv i land', `never onto the beach (z ${d.zMin}), "E Kliv i land" (${r.prompt})`);
    await put(T, 2, 311.5, 0);
    d = await drive(T, ['KeyW'], 4000);
    check(d.zMax < 317.6 - 1.6, `a buoy stops it (z ${d.zMax})`);

    // 7. E at sea: the toast, still in it; R: back at the rental's water's edge.
    await put(T, 20, 320, 0);
    await T.ev(() => { window.__toasts = []; });
    await T.tap('KeyE');
    await T.frames(4);
    r = await st(T);
    toasts = await T.ev(() => window.__toasts.slice());
    check(r.car === 'trampbat' && toasts.includes('Trampa in till stranden för att kliva i land.'), `E at sea: the toast, still in it (${r.car}, ${JSON.stringify(toasts)})`);
    await T.tap('KeyR');
    await T.frames(4);
    r = await st(T);
    toasts = await T.ev(() => window.__toasts.slice());
    check(r.car === 'trampbat' && Math.abs(r.x - 96) < 0.2 && Math.abs(r.z - 301.8) < 0.2 && toasts.includes('Trampbåten tillbaka vid uthyrningen.'), `R: back at the rental's water's edge (${r.x}, ${r.z}, ${JSON.stringify(toasts)})`);

    // 8. The raft: Ole's line, its eight coins (+200 pta), "Da gikk turen i null!".
    await put(T, -10, 338, PI);
    await T.ev(() => { window.__said = []; });
    const c0 = (await st(T)).coins;
    d = await drive(T, ['KeyW'], 7000);
    await T.until(() => window.__said.some(([, t]) => /i null/.test(t)), 8000).catch(() => {});
    r = await st(T);
    s = await said(T);
    T.log('raft', JSON.stringify(d), r.coins, r.left, JSON.stringify(s));
    check(d.zMin > 326.1 + 1.0, `the raft stops it (z ${d.zMin})`);
    check(r.left === 0 && r.coins - c0 === 200, `its eight coins taken (+${r.coins - c0} pta, ${r.left} left)`);
    check(s.some(([w, t]) => w === 'ole' && t === 'Se der! Noen har glemt pengene sine på flåten.') && s.some(([w, t]) => w === 'ole' && t === 'Åtte mynter. Da gikk turen i null!'), `Ole at the raft (${JSON.stringify(s)})`);

    // 9. Ashore at the water's edge: Stig on the sand facing inland, the lines, the music back; Ole pedals
    //    the boat back (no prompt at it) and it goes once out of view.
    await put(T, 50, 304.5, PI);
    await drive(T, ['KeyW'], 3000);
    await T.ev(() => { window.__said = []; });
    await T.tap('KeyE');
    await T.frames(6);
    r = await st(T);
    T.log('land', JSON.stringify(r));
    check(!r.car && r.p.state === 'normal' && Math.abs(r.p.z - 299.5) < 0.05 && Math.abs(r.p.x - 50) < 1.3 && Math.abs(Math.abs(r.p.yaw) - PI) < 0.05, `Stig on the sand facing inland (${JSON.stringify(r.p)})`);
    check(r.boat && r.back && r.ole?.car && r.tune !== 'samba', `the boat with Ole goes back, the music back (${r.boat}, ${r.back}, ${r.tune})`);
    await T.until(() => window.__said.length >= 2, 6000);
    s = await said(T);
    check(s[0]?.[0] === 'stig' && s[0][1] === 'Tack för turen.' && s[1]?.[0] === 'ole' && s[1][1] === 'Jeg trår den tilbake til utleien, jeg.', `the lines ashore (${JSON.stringify(s)})`);
    const near = await T.ev(() => { const g = __game, b = g.trampbat.boat; g.player.teleport(b.x, b.z - 2.6, 0); return null; });
    await T.frames(6);
    r = await st(T);
    check(r.prompt === '' && (await T.ev(() => __game.nearestInteractable()?.type !== 'car')), `no prompt at the boat on its way back ("${r.prompt}")`);
    // Stig turned to the sea, watching it: Ole backs off the beach and pedals east; up the beach, turned
    // inland (the camera's back to it), it goes.
    await stand(T, 50, 299.5, 0);
    const moved = await T.until(() => (__game.trampbat.boat?.x ?? 0) > 54, 16000).then(() => true, () => false);
    const bx = await T.ev(() => { const b = __game.trampbat.boat; return b && { x: +b.x.toFixed(2), z: +b.z.toFixed(2), yaw: +b.yaw.toFixed(2) }; });
    check(moved, `Ole pedals it east to the rental (${JSON.stringify(bx)})`);
    await stand(T, 50, 288, PI);
    await T.sleep(800);
    r = await st(T);
    check(!r.boat && r.ole?.state === 'hidden' && r.last?.kind === 'home', `gone once out of view (${r.boat}, ${JSON.stringify(r.last)})`);
    check(await T.ev(() => !__game.cars.some((c) => c.type === 'trampbat')), 'no pedal boat left in the cars');

    // 10. Rent with 500 pta: 200 go. A forced exit at sea: a splash, "Usch, vad blött." and on the sand.
    await T.ev(() => { window.__said = []; window.__toasts = []; window.__au.splash = 0; });
    await rent(T, 500);
    r = await st(T);
    check(r.coins === 300, `500 − 200 = 300 pta (${r.coins})`);
    await put(T, 10, 334, 0);
    await T.ev(() => __game.exitCar(true));
    await T.frames(6);
    r = await st(T);
    s = await said(T);
    const sp = await T.ev(() => window.__au.splash);
    check(!r.boat && r.p.state === 'normal' && Math.abs(r.p.z - 299.5) < 0.05 && sp >= 1 && s.some(([w, t]) => w === 'stig' && t === 'Usch, vad blött.'), `wet, back on the sand (${JSON.stringify(r.p)}, splash ${sp}, ${JSON.stringify(s)})`);

    // 11. A pursuit at sea: Stig on the sand, the boat gone.
    await rent(T, 500);
    await put(T, -40, 330, 0);
    await T.ev(() => { const s = __game.shame; s.v = 99.9; s.add(50, { force: true }); });
    await T.frames(10);
    r = await st(T);
    T.log('pursuit', JSON.stringify(r.last), await T.ev(() => __game.shame.pursuit));
    check(!r.boat && !r.car && r.p.z < 300 && r.last?.kind === 'ashore' && r.last.why === 'pursuit', `a pursuit: ashore (${JSON.stringify(r.p)}, ${JSON.stringify(r.last)})`);
    await T.ev(() => __game.shame.clear());
    await T.frames(10);

    // 12. A warp: on foot where it goes, the boat gone.
    await rent(T, 500);
    await put(T, 30, 330, 0);
    await T.ev(() => { const l = window.__lm('flamencoDeck'); __game.debugWarp(l.x, l.z, 0); });
    await T.frames(6);
    r = await st(T);
    check(!r.boat && !r.car && r.p.z < 50, `a warp: on foot at the deck, the boat gone (${JSON.stringify(r.p)})`);

    // 13. A mission start in the boat: on the sand, the boat gone; no prompt at the sign in the mission.
    await rent(T, 500);
    await put(T, 30, 330, 0);
    await T.ev(() => { __game.missions.begin(); });
    await T.until(() => __game.missions.state !== 'idle' && !__game.trampbat.boat, 6000);
    await T.frames(4);
    r = await st(T);
    check(!r.boat && !r.car && r.p.z < 300.1 && r.ms !== 'idle', `a mission start: ashore, the boat gone (${JSON.stringify(r.p)}, ${r.ms})`);
    await T.until(() => __game.missions.state === 'running', 30000).catch(() => {});
    await stand(T, L.x, L.z - 1.4, 0);
    r = await st(T);
    check(r.prompt === '' && !(await T.ev(() => __game.trampbat.canRent())), `no prompt at the sign in a mission ("${r.prompt}")`);
    await T.ev(() => __game.missions.abort());
    await T.frames(6);
    await stand(T, L.x, L.z - 1.4, 0);
    r = await st(T);
    check(r.ms === 'idle' && r.prompt === '<b>E</b> Hyr trampbåt – 200 pta', `after the mission (Q) the rental again (${r.ms}, "${r.prompt}")`);

    // 14. After the end the rental is open too.
    await T.fresh('&mission=13');
    await spies(T);
    await rent(T, 0);
    r = await st(T);
    check(r.ms === 'idle' && r.car === 'trampbat' && r.ole?.state === 'seated', `after the end: in the boat with Ole (${r.ms}, ${r.car})`);
  },

  async trampbatshots(T) {
    await T.fresh('&mission=9');
    const L = await T.L('trampbat');
    const cut = (eye, look) => T.ev((e, l) => __game.cam.cutTo({ x: e[0], y: e[1], z: e[2] }, { x: l[0], y: l[1], z: l[2] }), eye, look);
    // The sign and the boats on the sand.
    await T.ev((L) => { const g = __game; g.player.teleport(L.x - 3, L.z - 4, 0.6); }, L);
    await cut([L.x - 10, 3.2, L.z - 9], [L.x - 2, 1.4, L.z + 5]);
    await T.frames(20);
    await T.shot('tb_rental');
    await T.ev(() => __game.cam.release());
    await T.ev((L) => { const g = __game; g.coins = 500; g.player.teleport(L.x, L.z - 1.4, 0); g.cam.yaw = 0; g.cam.snapNext = true; }, L);
    await T.frames(6);
    await T.tap('KeyE');
    await T.until(() => __game.playerCar?.type === 'trampbat' && !__game.trampbat.busy, 10000);
    const put = (x, z, yaw) => T.ev((x, z, yaw) => { const g = __game, c = g.playerCar; c.place(x, z, yaw); c.vx = c.vz = c.w = 0; g.cam.yaw = yaw; g.cam.snapNext = true; }, x, z, yaw);
    await T.frames(30);
    await T.shot('tb_launch');
    // At sea, from the side and the front.
    await put(60, 326, -PI / 2);
    await T.ev(() => { const c = __game.playerCar; c.vx = -Math.sin(c.yaw) * -1.8; c.vz = 0; });
    await cut([60, 1.6, 330.5], [60, 0.9, 326]);
    await T.frames(20);
    await T.shot('tb_side');
    await cut([55.4, 1.9, 327.6], [60, 0.9, 326]);
    await T.frames(10);
    await T.shot('tb_front');
    await T.ev(() => __game.cam.release());
    // The view back over the beach and the town (the chase camera, the boat turned to land).
    await put(20, 345, PI);
    await T.frames(40);
    await T.shot('tb_viewback');
    // The sunset with Ole's Rio line.
    await put(-30, 330, 0.3);
    await cut([-27.2, 1.7, 335.5], [-30, 1.2, 330]);
    await T.frames(20);
    await T.ev(() => { const g = __game, B = g.trampbat; g.setSky('sunset'); B.ev = []; g.unsay(g.player); g.say(B.ole, 'Tenk å sitte her i desember. Det er som i Rio.', 6); B.waveT = 6; });
    await T.frames(30);
    await T.shot('tb_sunset');
    await T.ev(() => { const g = __game; g.cam.release(); g.setSky('day'); });
    // The raft with its coins.
    await put(-10, 333, PI);
    await cut([-4, 3.0, 331], [-10, 0.6, 324]);
    await T.frames(20);
    await T.shot('tb_raft');
    await T.ev(() => __game.cam.release());
    // The big map at sea.
    await put(-10, 345, 0);
    await T.ev(async () => { const g = __game, { hud } = await import('/src/game/hud.js'); g.bigMap = true; hud.toggleBigMap(true, g); });
    await T.frames(6);
    await T.shot('tb_bigmap');
    await T.ev(async () => { const g = __game, { hud } = await import('/src/game/hud.js'); g.bigMap = false; hud.toggleBigMap(false, g); });
    // Ashore, the boat on its way back with Ole.
    await put(70, 302.2, PI);
    await T.frames(4);
    await T.tap('KeyE');
    await T.frames(6);
    await T.ev(() => { __game.cam.yaw = Math.PI / 2 + 0.5; });
    await T.sleep(2600);
    await T.shot('tb_back');
  },
};
