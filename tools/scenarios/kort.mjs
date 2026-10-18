// "Kan du ta ett kort på oss?" – turistparet vid fyren (free roam, DESIGN §10.51; feature 110): kort, kortshots.
//   kort: before asnan no couple; at index 8 the couple at the lighthouse's plaza (the camera on his belly),
//         her question within 9 m, his wave, the prompt "E Ta ett kort" within 2.6 m (the keeper's door
//         keeps its own); E: his "Bara att knäppa. Den har motor!", the camera into Stig's hands, the
//         viewfinder (`inDialog`, Stig unseen, the frame 3:2 at its view), the keys and the reading; W/S/A/D
//         walk him (never past the leash), V and the right button turn the camera on end; at the compass
//         rose lying no picture holds both, on end it does; Space: "Säg… omelett.", the snap, the frozen
//         picture with BRA KORT!, the couple comes for the camera, 100 pta, "Å, vad fint det blir i
//         albumet!", the toast, records.kort, they walk off and the next couple waits at the dunes. There
//         on end close by only one dune: "BARA EN DYN!", 10 pta and "Jaa… tack ska du ha."; lying from the
//         boardwalk both. At LA MEDINA a picture without them is no picture ("Men… vi kom ju inte med!",
//         the view goes on), and from 30 m they are a speck: 10 pta. Given back unused: "Ingen bild?
//         Nåja.", no pay, they wait on. From the water's edge lying: the lantern, the couple a speck. A
//         knock ends the view; no prompt in a car, in a pursuit or at night; a mission start mid-view ends
//         it and hides the couple, none in the mission, back after it.
//   kortshots: the couple at each spot, Stig with their camera at his eye and held out, the man's camera
//         on his belly, the viewfinder lying and on end at each spot, the frozen picture, the thanks.
import { check } from '../lib.mjs';

async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js');
    window.__said = []; window.__toasts = [];
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.def?.name || t?.key || 'x', text]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text.replace(/<[^>]+>/g, '')); return toast(text, ...a); };
    window.__hud = hud;
  });
}
const clear = (T) => T.ev(() => { window.__said = []; window.__toasts = []; });
const said = (T) => T.ev(() => window.__said.map((x) => x[1]));
const toasts = (T) => T.ev(() => window.__toasts.slice());

const st = (T) => T.ev(() => {
  const g = __game, K = g.kort, p = g.player, s = K.sc, it = g.nearestInteractable(), e = document.getElementById('kort');
  return {
    state: K.state, at: K.at, phase: s?.phase ?? null, hog: s?.hog ?? null, read: s?.read ? { ...s.read } : null, last: K.last, rec: { ...K.rec }, coins: g.coins,
    near: it?.type === 'it' ? it.it.id : it?.type || null, prompt: window.__hud?._prompt || '',
    inDialog: g.inDialog, scope: g.cam.scope ? { fov: +g.cam.scope.fov.toFixed(2), yaw: +g.cam.scope.yaw.toFixed(3), pitch: +g.cam.scope.pitch.toFixed(3) } : null,
    camFov: +g.cam.fov.toFixed(1), visible: p.root.visible, foto: p.anim.foto, ms: g.missions.state,
    x: +p.x.toFixed(2), z: +p.z.toFixed(2), eye: { x: +g.cam.pos.x.toFixed(2), y: +g.cam.pos.y.toFixed(2), z: +g.cam.pos.z.toFixed(2) },
    pair: K.pair ? K.pair.map((c) => ({ x: +c.x.toFixed(2), z: +c.z.toFixed(2), state: c.state, foto: c.anim.foto, wave: c.anim.wave, vis: c.root.visible })) : null,
    overlay: e.classList.contains('show') ? {
      hog: e.classList.contains('hog'), frozen: e.classList.contains('frozen'), fw: parseFloat(e.style.getPropertyValue('--fw')), fh: parseFloat(e.style.getPropertyValue('--fh')),
      keys: e.querySelector('.ko-keys').textContent, par: e.querySelector('.ko-par').textContent, sub: e.querySelector('.ko-sub').textContent,
      parOk: e.querySelector('.ko-par').classList.contains('ok'), subOk: e.querySelector('.ko-sub').classList.contains('ok'),
      line: e.querySelector('.ko-line').textContent, stamp: e.querySelector('.ko-stamp').textContent, still: (e.querySelector('.ko-still').getAttribute('src') || '').slice(0, 22),
    } : null,
  };
});

// Stig on foot at the couple's landmark + (dx, dz) in its block's axes, facing the couple.
async function stand(T, lmName, dx, dz) {
  await T.ev(({ lmName, dx, dz }) => {
    const g = __game, L = window.__lm(lmName), p = g.player;
    if (g.playerCar) g.exitCar(true);
    if (g.kort.busy) g.kort.end('warp');
    p.state = 'normal';
    g.debugWarp(L.x + dx, L.z + dz, Math.atan2(-dx, -dz));
    g.cam.yaw = Math.atan2(-dx, -dz); g.cam.pitch = 0.3; g.cam.snapNext = true;
  }, { lmName, dx, dz });
  await T.frames(8);
}
// In the viewfinder: Stig at the landmark + (dx, dz), the view on end or lying, aimed at the world point
// q (or the couple's middle at head height), `up` rad above it.
async function frameAt(T, lmName, dx, dz, hog, q = null, up = 0) {
  await T.ev(({ lmName, dx, dz, hog, q, up }) => {
    const g = __game, K = g.kort, L = window.__lm(lmName), p = g.player;
    p.x = L.x + dx; p.z = L.z + dz; p.vx = p.vz = 0;
    const s = K.sc;
    s.hog = hog;
    const t = q || { x: L.x, y: 2.0, z: L.z }, e = K.eye(s);
    s.yaw = Math.atan2(t.x - p.x, t.z - p.z);
    const e2 = K.eye(s);
    s.pitch = Math.atan2(t.y - e2.y, Math.hypot(t.x - e2.x, t.z - e2.z)) + up;
    K.aim();
    s.read = K.judge();
  }, { lmName, dx, dz, hog, q, up });
  await T.frames(4);
}
async function takeCamera(T) {
  await T.tap('KeyE');
  await T.until(() => __game.kort.sc?.phase === 'view', 10000);
  await T.frames(3);
}
// Space, then the frozen picture.
async function snap(T) {
  await T.tap('Space');
  await T.until(() => __game.kort.sc?.phase === 'still', 10000);
  await T.frames(4);
}
async function waitFree(T) {
  await T.until(() => !__game.kort.sc, 20000);
  await T.frames(2);
}

export const SCENARIOS = {
  async kort(T) {
    // 0. Before asnan: nobody.
    await T.fresh('&mission=7');
    await T.frames(10);
    let r = await st(T);
    check(r.state === 'off' && !r.pair, `no couple before asnan (${r.state})`);
    await stand(T, 'kortFyren', 0, 2.0);
    r = await st(T);
    check(r.near !== 'kort', `no prompt before asnan (${r.near})`);

    // 1. After asnan: the couple at the lighthouse, his camera on his belly.
    await T.fresh('&mission=8');
    await spies(T);
    await T.frames(10);
    r = await st(T);
    T.log('start', JSON.stringify(r));
    const L0 = await T.L('kortFyren');
    check(r.state === 'wait' && r.at === 0 && r.pair.every((c) => c.state === 'normal') && r.pair[0].foto === 'belly' && !r.pair[1].foto,
      `the couple at the lighthouse, his camera on his belly (${JSON.stringify(r.pair)})`);
    check(r.pair.every((c) => Math.hypot(c.x - L0.x, c.z - L0.z) < 0.6), 'both on their places');
    // Her question within 9 m, his wave; no prompt at 3.5 m, the prompt at 2 m.
    await stand(T, 'kortFyren', 0, 6);
    await T.frames(20);
    r = await st(T);
    let s = await said(T);
    check(s.includes('Ursäkta… kan du ta ett kort på oss? Fyren ska vara med!') && r.pair[0].wave, `her question and his wave (${JSON.stringify(s)}, ${r.pair[0].wave})`);
    check(r.near !== 'kort', `no prompt 6 m off (${r.near})`);
    await T.shot('kort_fraga');
    await stand(T, 'kortFyren', 0, 3.4);
    r = await st(T);
    check(r.near !== 'kort', `no prompt 3.4 m off (${r.near})`);
    await stand(T, 'kortFyren', 0, 2.0);
    r = await st(T);
    check(r.near === 'kort' && /Ta ett kort/.test(r.prompt), `the prompt "E Ta ett kort" 2 m off (${r.near}, "${r.prompt}")`);
    // The keeper's door keeps its own prompt.
    await T.ev(() => { const L = window.__lm('fyrDorr'); __game.debugWarp(L.x, L.z + 0.3, Math.PI); });
    await T.frames(6);
    r = await st(T);
    check(r.near === 'fyren:upp', `the keeper's door still "Gå upp i fyren" (${r.near})`);

    // 2. E: his line, the camera into Stig's hands, the viewfinder.
    await stand(T, 'kortFyren', 0, 2.0);
    await clear(T);
    await T.tap('KeyE');
    await T.frames(4);
    r = await st(T);
    s = await said(T);
    check(r.phase === 'hand' && r.inDialog && r.pair[0].foto === 'give' && s.includes('Bara att knäppa. Den har motor!'),
      `E: he hands it over (${r.phase}, ${r.pair[0].foto}, ${JSON.stringify(s)})`);
    await T.until(() => __game.player.anim.foto === 'eye', 5000);
    r = await st(T);
    check(!r.pair[0].foto && r.foto === 'eye', `the camera in Stig's hands (${r.pair[0].foto}, ${r.foto})`);
    await T.until(() => __game.kort.sc?.phase === 'view', 5000);
    await T.frames(3);
    r = await st(T);
    T.log('view', JSON.stringify(r));
    const fovL = await T.ev(() => __game.kort.frame(false).fov), fovH = await T.ev(() => __game.kort.frame(true).fov);
    check(r.scope && Math.abs(r.scope.fov - fovL) < 0.01 && Math.abs(r.camFov - fovL) < 0.2 && !r.visible && r.inDialog,
      `the viewfinder: the scope at the lying frame's view (${r.scope?.fov} vs ${fovL.toFixed(2)}), Stig unseen`);
    check(r.overlay && !r.overlay.hog && Math.abs(r.overlay.fw / r.overlay.fh - 1.5) < 0.01 && /Sikta/.test(r.overlay.keys) && /Högkant/.test(r.overlay.keys) && /Knäpp/.test(r.overlay.keys),
      `the overlay: a 3:2 frame and the keys (${JSON.stringify(r.overlay)})`);
    check(r.overlay.par === 'PARET ✓' && r.overlay.parOk && r.overlay.sub === 'FYREN: BARA FOTEN' && !r.overlay.subOk, `close by: the couple, the tower's foot (${r.overlay.par} | ${r.overlay.sub})`);
    check(r.prompt === '' || !/Ta ett kort/.test(r.prompt), 'no prompt in the view');
    // The frame holds the lens: 72° along its long side, lying and on end.
    const lens = await T.ev(() => {
      const K = __game.kort, deg = (F, n) => 2 * Math.atan(n * Math.tan(F.fov / 2 * Math.PI / 180)) * 180 / Math.PI;
      const a = K.frame(false), b = K.frame(true);
      return { lw: deg(a, a.nx * a.W / a.H), lh: deg(a, a.ny), hw: deg(b, b.nx * b.W / b.H), hh: deg(b, b.ny) };
    });
    check(Math.abs(lens.lw - 76) < 0.1 && Math.abs(lens.hh - 76) < 0.1 && Math.abs(lens.lh - lens.hw) < 0.1, `the lens: 76° along the long side (${JSON.stringify(lens)})`);
    await T.shot('kort_sokare_nara');

    // 3. W/S/A/D walk him, the eye with him; the leash.
    const z0 = r.z, x0 = r.x;
    await T.hold(['KeyS'], 1200);
    r = await st(T);
    check(r.z - z0 > 1.2 && Math.abs(r.x - x0) < 0.2 && r.phase === 'view', `S: back from them (${z0} → ${r.z})`);
    check(Math.abs(r.eye.z - (r.z - 0.3)) < 0.35 && Math.abs(r.eye.y - 2.35) < 0.05, `the eye at his, the camera before his face (${JSON.stringify(r.eye)})`);
    const z1 = r.z;
    await T.hold(['KeyW'], 600);
    r = await st(T);
    check(r.z < z1 - 0.5, `W: towards them (${z1} → ${r.z})`);
    await T.hold(['KeyA'], 600);
    const r2 = await st(T);
    check(Math.abs(r2.x - r.x) > 0.5 && Math.abs(r2.z - r.z) < 0.2, `A: sideways (${r.x} → ${r2.x})`);
    await T.ev(() => { const p = __game.player, L = window.__lm('kortFyren'); p.x = L.x; p.z = L.z + 47.8; });
    await T.hold(['KeyS'], 1500);
    r = await st(T);
    check(Math.hypot(r.x - L0.x, r.z - L0.z) < 48.3, `the leash: no further than 48 m (${Math.hypot(r.x - L0.x, r.z - L0.z).toFixed(2)})`);
    // 4. V and the right button turn it on end and back.
    await T.tap('KeyV');
    await T.frames(3);
    r = await st(T);
    check(r.hog && r.overlay.hog && Math.abs(r.overlay.fh / r.overlay.fw - 1.5) < 0.01 && Math.abs(r.scope.fov - fovH) < 0.01 && /Liggande/.test(r.overlay.keys),
      `V: on end (${JSON.stringify(r.overlay)}, ${r.scope.fov} vs ${fovH.toFixed(2)})`);
    await T.page.mouse.click(640, 360, { button: 'right' });
    await T.frames(3);
    r = await st(T);
    check(!r.hog && !r.overlay.hog, `the right button: lying again (${r.hog})`);

    // 5. At the compass rose: lying, never both; on end both. From the water's edge lying: a speck.
    const top = await T.ev(() => { const K = __game.kort; return K.world(0, K.cfg.spots[0].pts[0]); });
    const rose = { dx: 1.6, dz: 11.6 };
    await frameAt(T, 'kortFyren', rose.dx, rose.dz, false);
    r = await st(T);
    check(r.read.par === 'ok' && r.read.sub === 'part', `the rose, lying, at them: the tower's foot (${JSON.stringify(r.read)})`);
    await T.shot('kort_rosen_liggande');
    let best = null;
    for (let up = 0; up <= 1.2; up += 0.05) {
      const q = await T.ev((up) => { const K = __game.kort; K.sc.pitch = up; K.sc.hog = false; K.aim(); return K.judge(); }, up);
      if (q.kind === 'bra') best = up;
    }
    check(best == null, `the rose, lying: no pitch holds both (${best})`);
    const good = [];
    for (let up = 0; up <= 1.2; up += 0.025) {
      const q = await T.ev((up) => { const K = __game.kort; K.sc.pitch = up; K.sc.hog = true; K.aim(); return K.judge(); }, up);
      if (q.kind === 'bra') good.push(+up.toFixed(3));
    }
    T.log('rose on end, good pitches', JSON.stringify(good));
    check(good.length > 0, `the rose, on end: a pitch holds both (${good})`);
    best = (good[0] + good[good.length - 1]) / 2;
    await T.ev(() => { const K = __game.kort, p = __game.player, L = window.__lm('kortFyren'); p.x = L.x; p.z = L.z + 36; K.sc.yaw = Math.PI; K.sc.hog = false; });
    let far = null;
    for (let up = 0; up <= 1.0; up += 0.02) {
      const q = await T.ev((up) => { const K = __game.kort; K.sc.pitch = up; K.aim(); return K.judge(); }, up);
      if (q.sub === 'ok' && q.heads === 2) { far = q; break; }
    }
    T.log('water edge', JSON.stringify(far));
    check(far && far.kind === 'liten' && far.par === 'liten', `from the water's edge, lying: the lantern in, the couple a speck (${JSON.stringify(far)})`);
    await T.frames(3);
    await T.shot('kort_strandkant');
    // On end at the rose, aimed between them and the lantern: the good picture.
    await frameAt(T, 'kortFyren', rose.dx, rose.dz, true);
    await T.ev((pitch) => { const K = __game.kort; K.sc.pitch = pitch; K.aim(); K.sc.read = K.judge(); }, best);
    await T.frames(3);
    r = await st(T);
    T.log('rose on end', JSON.stringify(r.read));
    check(r.read.kind === 'bra' && r.overlay.par === 'PARET ✓' && r.overlay.sub === 'FYREN ✓' && r.overlay.subOk, `on end at the rose: both (${JSON.stringify(r.read)})`);
    await T.shot('kort_rosen_hogkant');

    // 6. Space: "Säg… omelett.", the snap, the frozen picture.
    await clear(T);
    let c0 = r.coins;
    await T.tap('Space');
    await T.frames(3);
    r = await st(T);
    check(r.phase === 'view' && /Säg… omelett\./.test(r.overlay.line) && /Stig-Helmer/.test(r.overlay.line), `Space: his "Säg… omelett." (${r.overlay.line})`);
    await T.until(() => __game.kort.sc?.phase === 'still', 5000);
    await T.frames(4);
    r = await st(T);
    T.log('still', JSON.stringify(r.overlay));
    check(r.overlay.frozen && r.overlay.stamp === 'BRA KORT!' && r.overlay.still.startsWith('data:image/jpeg'), `the frozen picture, BRA KORT! (${JSON.stringify(r.overlay)})`);
    check(r.coins === c0 && r.rec.kort === 0, 'no pay yet');
    await T.shot('kort_bild_bra');
    await T.until(() => __game.kort.sc?.phase === 'back', 5000);
    await T.frames(3);
    r = await st(T);
    check(!r.scope && !r.overlay && r.visible && r.foto === 'give' && Math.abs(r.camFov - 62) < 1, `the camera down, held out to them (${r.foto}, ${r.camFov})`);
    await T.until(() => __game.kort.sc?.phase === 'thanks', 10000);
    await T.frames(6);
    r = await st(T);
    s = await said(T);
    let to = await toasts(T);
    check(r.coins === c0 + 100 && s.includes('Å, vad fint det blir i albumet!') && to.some((x) => /Dricks från turistparet: 100 pta/.test(x)),
      `the thanks: 100 pta, her line, the toast (${r.coins}, ${JSON.stringify(s)}, ${JSON.stringify(to)})`);
    check(r.pair[0].foto === 'belly' && !r.foto && Math.hypot(r.pair[0].x - r.x, r.pair[0].z - r.z) < 2.2, `he has it back, beside Stig (${JSON.stringify(r.pair[0])})`);
    await T.shot('kort_tack');
    await waitFree(T);
    r = await st(T);
    to = await toasts(T);
    check(!r.inDialog && r.state === 'leave' && r.rec.next === 1 && r.rec.bra === 1 && r.rec.kort === 1 && r.last.kind === 'bra' && r.last.pay === 100,
      `free; they walk off, the next at the dunes (${JSON.stringify(r.rec)}, ${r.state})`);
    check(to.some((x) => /Ett nytt par vill ha ett kort vid dynerna\./.test(x)), `the toast for the next (${JSON.stringify(to)})`);
    const saved = await T.ev(() => JSON.parse(localStorage.getItem('charter-and-run-v1')).records.kort);
    check(saved && saved.next === 1 && saved.bra === 1, `saved (${JSON.stringify(saved)})`);
    // They walk off along the plaza; gone out of view, and the next couple is at the dunes.
    await T.frames(90);
    r = await st(T);
    check(r.pair[0].x > L0.x + 3, `walking off east (${JSON.stringify(r.pair[0])})`);
    await stand(T, 'kortDyner', 0, 30);
    await T.until(() => __game.kort.at === 1 && __game.kort.state === 'wait', 20000);
    r = await st(T);
    check(r.pair[0].foto === 'belly', 'the next couple at the dunes');

    // 7. The dunes: on end close by only one dune; lying from the boardwalk both. On end snapped.
    await stand(T, 'kortDyner', 0, 2.0);
    await takeCamera(T);
    await frameAt(T, 'kortDyner', 0, 6, false);
    r = await st(T);
    check(r.read.par === 'ok' && r.read.sub !== 'ok', `the dunes, lying, 6 m: not both dunes (${JSON.stringify(r.read)})`);
    await frameAt(T, 'kortDyner', 0, 11, false);
    r = await st(T);
    check(r.read.kind === 'bra' && r.overlay.sub === 'DYNERNA ✓', `the dunes, lying, 11 m: both (${JSON.stringify(r.read)})`);
    await T.shot('kort_dyner_liggande');
    await frameAt(T, 'kortDyner', 0, 11, true);
    r = await st(T);
    check(r.read.kind === 'kapad' && r.read.sub !== 'ok', `the dunes, on end: not both (${JSON.stringify(r.read)}, ${r.overlay.sub})`);
    await T.ev(() => { const K = __game.kort; K.sc.yaw += 0.33; K.aim(); K.sc.read = K.judge(); });
    await T.frames(3);
    r = await st(T);
    check(r.read.kind === 'kapad' && r.read.sub === 'part' && r.overlay.sub === 'DYNERNA: BARA EN DYN', `on end, turned: one dune (${JSON.stringify(r.read)})`);
    await T.shot('kort_dyner_hogkant');
    await clear(T);
    c0 = r.coins;
    await snap(T);
    r = await st(T);
    check(r.overlay.stamp === 'BARA EN DYN!', `the stamp (${r.overlay.stamp})`);
    await waitFree(T);
    r = await st(T);
    s = await said(T);
    check(r.coins === c0 + 10 && s.includes('Jaa… tack ska du ha.') && r.rec.next === 2 && r.rec.bra === 1 && r.rec.kort === 2 && r.last.kind === 'kapad',
      `bara en dyn: 10 pta, "Jaa… tack ska du ha." (${r.coins}, ${JSON.stringify(s)}, ${JSON.stringify(r.rec)})`);

    // 8. LA MEDINA: without them no picture, they ask again; from 30 m a speck.
    await stand(T, 'kortMedina', 0, -30);
    await T.until(() => __game.kort.at === 2 && __game.kort.state === 'wait', 20000);
    await stand(T, 'kortMedina', 0, 2.0);
    await takeCamera(T);
    await frameAt(T, 'kortMedina', 0, 10, false);
    await T.shot('kort_medina_nara');
    r = await st(T);
    check(r.read.par === 'ok' && r.read.sub !== 'ok', `LA MEDINA from 10 m: half the gate (${JSON.stringify(r.read)})`);
    await frameAt(T, 'kortMedina', 0, 9.5, false, null, 0.2);
    r = await st(T);
    T.log('medina 9.5 up', JSON.stringify(r.read));
    await frameAt(T, 'kortMedina', 0, 12, false, null, 0.24);
    r = await st(T);
    T.log('medina 12', JSON.stringify(r.read));
    check(r.read.kind === 'bra' && r.overlay.sub === 'PORTEN ✓', `LA MEDINA lying from 12 m: the whole gate (${JSON.stringify(r.read)})`);
    await T.shot('kort_medina_liggande');
    await T.ev(() => { const K = __game.kort; K.sc.yaw += 1.4; K.aim(); });
    await T.frames(2);
    await clear(T);
    c0 = r.coins;
    await snap(T);
    r = await st(T);
    check(r.overlay.stamp === 'PARET KOM INTE MED!' && r.last.kind === 'miss', `the miss's stamp (${r.overlay.stamp})`);
    await T.until(() => __game.kort.sc?.phase === 'view', 5000);
    await T.frames(3);
    r = await st(T);
    check(r.phase === 'view' && /Men… vi kom ju inte med!/.test(r.overlay.line) && /Hon/.test(r.overlay.line) && r.coins === c0 && r.rec.kort === 2,
      `the view goes on, her line, no pay (${r.overlay.line}, ${r.coins})`);
    await frameAt(T, 'kortMedina', 0, 30, false, null, 0.25);
    r = await st(T);
    T.log('medina 30', JSON.stringify(r.read));
    check(r.read.kind === 'liten' && r.overlay.par === 'PARET: PYTTESMÅTT', `from 30 m: a speck (${JSON.stringify(r.read)})`);
    await T.shot('kort_medina_liten');
    await clear(T);
    await snap(T);
    r = await st(T);
    check(r.overlay.stamp === 'PYTTESMÅTT PAR!', `the stamp (${r.overlay.stamp})`);
    await T.until(() => __game.kort.sc?.phase === 'back', 5000);
    await T.frames(2);
    await T.shot('kort_hamtar');
    await waitFree(T);
    r = await st(T);
    s = await said(T);
    check(r.coins === c0 + 10 && s.includes('Jaha… vi syns väl. Någonstans där nere.') && r.rec.next === 0 && r.rec.kort === 3 && r.last.kind === 'liten',
      `a speck: 10 pta and his line (${r.coins}, ${JSON.stringify(s)}, ${JSON.stringify(r.rec)})`);
    check(Math.hypot(r.pair[0].x - r.x, r.pair[0].z - r.z) < 2.6, `they came for it (the fade put them before him) (${JSON.stringify(r.pair[0])})`);

    // 9. Given back unused: no pay, they wait on at their places.
    await stand(T, 'kortFyren', 0, 30);
    await T.until(() => __game.kort.at === 0 && __game.kort.state === 'wait', 20000);
    await stand(T, 'kortFyren', 0, 2.0);
    await takeCamera(T);
    await T.hold(['KeyS'], 800);
    await clear(T);
    c0 = (await st(T)).coins;
    await T.tap('KeyE');
    await T.frames(3);
    r = await st(T);
    check(r.phase === 'back' && !r.scope && !r.overlay, `E in the view: the camera down (${r.phase})`);
    await waitFree(T);
    r = await st(T);
    s = await said(T);
    check(s.includes('Ingen bild? Nåja.') && r.coins === c0 && r.rec.kort === 3 && r.state === 'wait' && r.last.kind === 'abort' && !r.inDialog,
      `given back: "Ingen bild? Nåja.", no pay, they wait (${JSON.stringify(s)}, ${r.coins}, ${r.state})`);
    await T.until(() => __game.kort.canUse() || __game.kort.pair.every((c, k) => { const q = __game.kort.place(k); return Math.hypot(c.x - q.x, c.z - q.z) < 1.2; }), 10000);
    await stand(T, 'kortFyren', 0, 2.0);
    r = await st(T);
    check(r.near === 'kort', `back on their places, the prompt again (${r.near})`);

    // 10. A knock ends the view.
    await takeCamera(T);
    await T.ev(() => __game.player.fling(4, 5, 0));
    await T.frames(4);
    r = await st(T);
    check(!r.phase && r.last.kind === 'knock' && !r.scope && !r.overlay && r.visible && !r.foto && !r.inDialog && r.pair[0].foto === 'belly',
      `a knock: the view down at once, his camera back (${JSON.stringify(r.last)})`);
    await T.until(() => __game.player.state === 'normal', 8000);

    // 11. No prompt in a car, in a pursuit or at night.
    await T.ev(() => { const g = __game, L = window.__lm('kortFyren'), c = g.ensureNamedCar('hyrbil'); c.place(L.x + 8, L.z + 10, 0); g.enterCar(c); });
    await T.frames(4);
    await T.ev(() => { const L = window.__lm('kortFyren'); __game.playerCar.place(L.x + 3, L.z + 3.5, Math.PI / 2); });
    await T.frames(6);
    r = await st(T);
    check(r.near !== 'kort', `no prompt at the wheel (${r.near})`);
    await T.ev(() => { const g = __game; g.exitCar(true); const c = g.named.hyrbil; c.place(c.home.x, c.home.z, c.home.yaw); });
    await stand(T, 'kortFyren', 0, 2.0);
    await T.ev(() => { const s = __game.shame; s.v = 0; s.add(100, { force: true }); });
    await T.frames(4);
    r = await st(T);
    const pur = await T.ev(() => __game.shame.pursuit);
    check(pur && r.near !== 'kort', `no prompt in a pursuit (${pur}, ${r.near})`);
    await T.ev(() => { const s = __game.shame; if (s.pursuit) { s.v = 0; s.endPursuit(true); } s.forced = false; });
    await T.ev(() => __game.day.set(23));
    await stand(T, 'kortFyren', 0, 2.0);
    r = await st(T);
    check(r.near !== 'kort', `no prompt at night (${r.near})`);
    await stand(T, 'kortDyner', 0, 30);
    await T.frames(10);
    r = await st(T);
    check(r.state === 'off', `at night, out of sight, they go (${r.state})`);
    await T.ev(() => __game.day.set(15));
    await T.frames(10);
    r = await st(T);
    check(r.state === 'wait' && r.at === 0, `by day again (${r.state}, ${r.at})`);

    // 12. A mission start mid-view: down at once, the couple gone; none in the mission; back after it.
    await stand(T, 'kortFyren', 0, 2.0);
    await takeCamera(T);
    await T.ev(() => { __game.missions.begin(); });
    await T.frames(6);
    r = await st(T);
    T.log('mission mid-view', JSON.stringify(r));
    check(r.ms !== 'idle' && !r.phase && r.last.kind === 'gone' && !r.scope && !r.overlay && r.visible && !r.foto && r.state === 'off' && r.pair.every((c) => c.state === 'hidden' && !c.vis),
      `a mission start mid-view: down at once, the couple gone (${JSON.stringify(r)})`);
    await T.until(() => __game.missions.state === 'running', 60000);
    await stand(T, 'kortFyren', 0, 2.0);
    r = await st(T);
    check(r.state === 'off' && r.near !== 'kort', `in the mission nobody, no prompt (${r.state}, ${r.near})`);
    await T.ev(() => __game.kort.start());
    r = await st(T);
    check(!r.phase && !r.scope, 'and no view by hand');
    await T.ev(() => __game.missions.abort());
    await T.frames(4);
    await stand(T, 'kortFyren', 0, 30);
    await T.until(() => __game.kort.state === 'wait', 10000).catch(() => {});
    r = await st(T);
    check(r.ms === 'idle' && r.state === 'wait' && r.at === 0, `after the mission they are back (${r.ms}, ${r.state})`);
  },

  async kortshots(T) {
    await T.fresh('&mission=9');
    await spies(T);
    await T.frames(10);
    // The couple at the lighthouse, his camera on his belly up close.
    await stand(T, 'kortFyren', 1.5, 7);
    await T.frames(30);
    await T.shot('kort_par_fyren');
    await T.ev(() => {
      const g = __game, K = g.kort, [han] = K.pair;
      g.inDialog = true;
      g.cam.cutTo({ x: han.x + 0.9, y: han.y + 1.7, z: han.z + 1.7 }, { x: han.x, y: han.y + 1.25, z: han.z });
    });
    await T.frames(30);
    await T.shot('kort_mage');
    // Stig with their camera at his eye and held out, from the side.
    for (const [pose, name] of [['eye', 'kort_stig_oga'], ['give', 'kort_stig_ger']]) {
      await T.ev((pose) => {
        const g = __game, L = window.__lm('kortFyren'), p = g.player;
        p.x = L.x + 0.3; p.z = L.z + 3.2; p.yaw = Math.PI; p.anim.foto = pose; g.inDialog = true;
        g.kort.pair[0].anim.foto = pose === 'give' ? false : 'belly';
        g.cam.cutTo({ x: L.x + 4.2, y: 2.2, z: L.z + 3.0 }, { x: L.x + 0.3, y: 1.7, z: L.z + 2.4 });
      }, pose);
      await T.frames(30);
      await T.shot(name);
    }
    await T.ev(() => { const g = __game; g.player.anim.foto = false; g.kort.pair[0].anim.foto = 'belly'; g.inDialog = false; g.cam.release(); });
    // The viewfinder at the lighthouse: close by lying, at the rose on end.
    await stand(T, 'kortFyren', 0, 2.0);
    await takeCamera(T);
    await frameAt(T, 'kortFyren', 0, 2.4, false);
    await T.shot('kort_sokare_fyr_nara');
    await frameAt(T, 'kortFyren', 1.6, 11.6, true, null, 0.62);
    await T.shot('kort_sokare_fyr_hogkant');
    await T.tap('KeyE');
    await waitFree(T);
    // The dunes and LA MEDINA, each lying and on end.
    for (const [lmName, i, d, up] of [['kortDyner', 1, 11, 0.04], ['kortMedina', 2, 13, 0.26]]) {
      await T.ev((i) => { const K = __game.kort; K.rec.next = i; K.hide(); }, i);
      await stand(T, lmName, 0, 40);
      await T.until((i) => __game.kort.at === i && __game.kort.state === 'wait', 20000, i);
      await stand(T, lmName, 1.5, 7);
      await T.frames(30);
      await T.shot(`kort_par_${lmName}`);
      await stand(T, lmName, 0, 2.0);
      await takeCamera(T);
      await frameAt(T, lmName, 0, d, false, null, up);
      await T.shot(`kort_sokare_${lmName}_liggande`);
      await frameAt(T, lmName, 0, d, true, null, up);
      await T.shot(`kort_sokare_${lmName}_hogkant`);
      await T.tap('KeyE');
      await waitFree(T);
    }
  },
};
