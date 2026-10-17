// Hytt två! – ring efter en bil (free roam, DESIGN §10.43; feature 80): hytt.
//   hytt: at index 9 between missions, on foot at booth 2 of the phone pavilion in Centro Nórdico:
//         the prompt "E Ring efter bil"; E stands Stig at the door, cuts to the booth, the telefonist
//         calls "Hytt två!" and the menu HYTT TVÅ · VILKEN BIL? lists the hire car and bus 17 at
//         25 pta (the grisbil only once unlocked; never the Guardia jeep, the night bus, José's car or
//         a golf cart) while Stig stands still; W/S choose (and wrap), Q hangs up with nothing paid and
//         nothing moved. E rings: Stig orders, the named car itself goes to the first free spot of the
//         car park behind the camera (out of its view), "Señor, betala!", 25 pta, "Tack så mycket!",
//         then Stig steps back turned to it with the camera behind him and the toast. A dented car comes
//         repaired (the same car), bus 17 takes the next spot, a wrecked grisbil comes back as one new
//         car (the wreck gone) with "Den luktar lite.", a delivered grisbil's bed stays empty, Ole pays
//         when the purse is short, and with every spot taken the telefonist says so and nothing is
//         paid. No prompt in a car, in a pursuit or in a mission. At index 5 a called bus 17 is back
//         in its bay at the airport when Lasse's mission starts (getInCar's atHome).
import { check } from '../lib.mjs';

const PRICE = 25;

async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js');
    window.__said = []; window.__toasts = [];
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.key || 'x', text]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text.replace(/<[^>]+>/g, '')); return toast(text, ...a); };
    window.__hud = hud;
  });
}
const clearSpies = (T) => T.ev(() => { window.__said = []; window.__toasts = []; });
// Stig on foot just south of booth 2, facing it, the camera behind him.
async function atBooth(T) {
  await T.ev(() => {
    const g = __game, s = g.hytt.stand();
    if (g.playerCar) g.exitCar(true);
    g.player.state = 'normal';
    g.debugWarp(s.x, s.z + 0.6, s.yaw);
    g.cam.yaw = s.yaw; g.cam.snapNext = true;
  });
  await T.frames(10);
}
const st = (T) => T.ev(() => {
  const g = __game, H = g.hytt, m = document.getElementById('menu'), p = g.player;
  const it = g.nearestInteractable();
  return { menu: !!H.menu, sel: H.menu?.sel ?? null, rows: H.menu?.rows.map((r) => r.name) ?? null, call: !!H.call, last: H.last, calls: H.calls,
    shown: m.classList.contains('show'), title: m.querySelector('.mn-title').textContent, rowText: [...m.querySelectorAll('.mn-row')].map((r) => r.textContent),
    selText: m.querySelector('.mn-row.sel')?.textContent || null, keys: m.querySelector('.mn-keys').textContent, note: m.querySelector('.mn-note').textContent,
    prompt: window.__hud._prompt || '', near: it?.type === 'it' ? it.it.id : it?.type || null, inDialog: g.inDialog, cine: !!g.cam.cine,
    coins: g.coins, ms: g.missions.state, x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3) };
});
// A named car: { same (as window.__ref[name]), x, z, yaw, hp, full, dead, in (g.cars), n (cars of that name), spot (the spot it is on) }.
const carOf = (T, name) => T.ev((name) => {
  const g = __game, c = g.named[name];
  const spot = ['hyttBil1', 'hyttBil2', 'hyttBil3'].find((k) => { const l = window.__lm(k); return c && Math.hypot(c.x - l.x, c.z - l.z) < 0.05 && Math.abs(c.yaw - l.yaw) < 1e-6; }) || null;
  return c && { same: (window.__ref ||= {})[name] === c, x: +c.x.toFixed(2), z: +c.z.toFixed(2), yaw: +c.yaw.toFixed(3), hp: c.hp, full: c.hp === c.spec.hp, dead: c.dead,
    in: g.cars.includes(c), n: g.cars.filter((k) => k.name === name).length, spot, pigs: c.pigs?.map((q) => q.in) };
}, name);
const keep = (T, name) => T.ev((name) => { (window.__ref ||= {})[name] = __game.named[name]; }, name);
// Is any corner of the named car's box in the camera's view (in front of it and inside the frame)?
const inView = (T, name) => T.ev(async (name) => {
  const { camera, THREE } = await import('/src/gfx.js'), c = __game.named[name], s = c.spec;
  camera.updateMatrixWorld();
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx, v = new THREE.Vector3();
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const y of [0, c.height]) {
    v.set(c.x + rx * a * s.wid / 2 + fx * b * s.len / 2, c.y + y, c.z + rz * a * s.wid / 2 + fz * b * s.len / 2);
    const q = v.clone().applyMatrix4(camera.matrixWorldInverse);
    if (q.z >= 0) continue;   // behind the eye
    v.project(camera);
    if (Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1) return true;
  }
  return false;
}, name);
// Open the menu (E at the booth) and pick row `name` with S presses.
async function openMenu(T) {
  await atBooth(T);
  await T.tap('KeyE');
  await T.frames(6);
}
async function choose(T, name) {
  for (let k = 0; k < 4; k++) {
    const r = await st(T);
    if (r.rows[r.sel] === name) return;
    await T.tap('KeyS');
  }
  throw new Error('check failed: no row ' + name);
}
// The whole call for `name`: E, then the end (Stig free again). Returns [the state at the move, the end].
async function call(T, name) {
  await openMenu(T);
  await choose(T, name);
  await T.tap('KeyE');
  await T.until(() => ['moved', 'full'].includes(__game.hytt.last?.kind), 10000);
  const atMove = { ...(await st(T)), seen: await T.ev(() => __game.hytt.last.kind === 'moved') ? await inView(T, name) : null };
  await T.until(() => !__game.hytt.call, 10000);
  await T.frames(8);
  return [atMove, await st(T)];
}

export const SCENARIOS = {
  async hytt(T) {
    await T.fresh('&mission=9');
    await spies(T);
    await T.ev(() => __game.addCoins(1000));
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam on the island');
    for (const n of ['hyrbil', 'buss17']) await keep(T, n);

    // 1. The prompt at booth 2; nothing at booth 1's far side.
    await atBooth(T);
    let r = await st(T);
    T.log('at booth', JSON.stringify(r));
    check(r.near === 'hytt' && /Ring efter bil/.test(r.prompt), `the prompt "E Ring efter bil" at booth 2 (${r.near}, "${r.prompt}")`);
    await T.shot('hytt_prompt');

    // 2. E: the menu, the cut, the telefonist; the hire car and bus 17 only (no grisbil yet).
    const hyr0 = await carOf(T, 'hyrbil');
    await T.tap('KeyE');
    await T.frames(6);
    r = await st(T);
    T.log('menu', JSON.stringify(r));
    check(r.menu && r.shown && r.inDialog && r.cine, `the menu is open, Stig held, the camera cut (${JSON.stringify(r)})`);
    check(JSON.stringify(r.rows) === '["hyrbil","buss17"]', `the hire car and bus 17, nothing else (${r.rows})`);
    check(r.title === 'HYTT TVÅ · VILKEN BIL?' && r.rowText[0] === 'Hyrbilen25 pta' && r.rowText[1] === 'SunTrips buss 1725 pta', `the title and the rows (${r.title}, ${r.rowText})`);
    check(r.note === 'Bilen väntar på parkeringen.' && r.keys === 'W/S välj · E ring · Q lägg på', `the note and the keys (${r.note} | ${r.keys})`);
    check(r.prompt === '' && r.sel === 0, `no prompt, the first row chosen (${r.prompt}, ${r.sel})`);
    let toasts = await T.ev(() => window.__toasts.slice());
    check(toasts.some((t) => t === 'Telefonisten: Hytt två!'), `the telefonist: "Hytt två!" (${JSON.stringify(toasts)})`);
    const stand = await T.ev(() => { const s = __game.hytt.stand(); return { x: +s.x.toFixed(2), z: +s.z.toFixed(2), yaw: +s.yaw.toFixed(3) }; });
    check(Math.hypot(r.x - stand.x, r.z - stand.z) < 0.05 && Math.abs(r.yaw - stand.yaw) < 0.01, `Stig at the door, facing it (${r.x}, ${r.z}, ${r.yaw} vs ${JSON.stringify(stand)})`);
    await T.shot('hytt_menu');

    // 3. W/S choose and wrap; Stig does not walk (held W).
    await T.tap('KeyS');
    r = await st(T);
    check(r.sel === 1 && r.selText === 'SunTrips buss 1725 pta', `S: bus 17 (${r.sel}, ${r.selText})`);
    await T.tap('KeyS');
    r = await st(T);
    check(r.sel === 0, `S again wraps to the hire car (${r.sel})`);
    await T.tap('ArrowUp');
    r = await st(T);
    check(r.sel === 1, `↑ wraps to bus 17 (${r.sel})`);
    await T.hold(['KeyW'], 600);
    const held = await st(T);
    check(Math.hypot(held.x - stand.x, held.z - stand.z) < 0.05 && held.menu, `held W: Stig stays at the booth (${held.x}, ${held.z})`);

    // 4. Q hangs up: nothing paid, nothing moved, back to free roam.
    await T.tap('KeyQ');
    await T.frames(4);
    r = await st(T);
    const hyr1 = await carOf(T, 'hyrbil');
    check(!r.menu && !r.shown && !r.inDialog && !r.cine && r.last?.kind === 'hangup', `Q: the menu shut, free roam (${JSON.stringify(r)})`);
    check(r.coins === 1000 && hyr1.x === hyr0.x && hyr1.z === hyr0.z, `nothing paid or moved (${r.coins}, ${JSON.stringify(hyr1)})`);

    // 5. Ring for the hire car: the order, the move out of view, the fare, the thanks, the reveal.
    await clearSpies(T);
    await openMenu(T);
    r = await st(T);
    check(r.sel === 0, `the menu opens on the hire car (${r.sel})`);
    await T.tap('KeyE');
    await T.frames(10);
    await T.shot('hytt_ring');
    await T.until(() => __game.hytt.last?.kind === 'moved', 10000);
    let seen = await inView(T, 'hyrbil');
    let hyr = await carOf(T, 'hyrbil');
    r = await st(T);
    T.log('moved', JSON.stringify(hyr), 'seen', seen, JSON.stringify(r.last));
    check(r.cine && r.inDialog, 'the camera still on the booth when the car moves');
    check(!seen, 'the car is moved out of the camera\'s view');
    check(hyr.same && hyr.spot === 'hyttBil1' && hyr.n === 1, `the hire car itself on the first spot (${JSON.stringify(hyr)})`);
    check(r.coins === 1000, `not paid before the telefonist asks (${r.coins})`);
    await T.until(() => __game.hytt.last?.kind === 'paid', 10000);
    await T.frames(6);
    await T.shot('hytt_pay');
    await T.until(() => !__game.hytt.call, 10000);
    await T.frames(10);
    r = await st(T);
    let said = await T.ev(() => window.__said.slice());
    toasts = await T.ev(() => window.__toasts.slice());
    T.log('end', JSON.stringify(r), JSON.stringify(said), JSON.stringify(toasts));
    check(said.some(([w, t]) => w === 'stig' && t === 'Ja, hej. Hyrbilen, tack.'), `Stig orders (${JSON.stringify(said)})`);
    check(toasts.includes('Telefonisten: Señor, betala!'), `"Señor, betala!" (${JSON.stringify(toasts)})`);
    check(r.coins === 1000 - PRICE && r.calls === 1, `25 pta paid (${r.coins})`);
    check(said.some(([w, t]) => w === 'stig' && t === 'Tack så mycket!'), `"Tack så mycket!" (${JSON.stringify(said)})`);
    check(toasts.includes('Hyrbilen står på parkeringen vid Centro Nórdico.'), `the toast names it (${JSON.stringify(toasts)})`);
    check(!r.inDialog && !r.cine && !r.menu, 'free roam again, the chase camera');
    const face = await T.ev(() => { const g = __game, p = g.player, c = g.named.hyrbil, a = Math.atan2(c.x - p.x, c.z - p.z); return Math.abs(Math.atan2(Math.sin(a - p.yaw), Math.cos(a - p.yaw))); });
    const camFace = await T.ev(() => { const g = __game; return Math.abs(Math.atan2(Math.sin(g.cam.yaw - g.player.yaw), Math.cos(g.cam.yaw - g.player.yaw))); });
    check(face < 0.05 && camFace < 0.05, `Stig turned to the car, the camera behind him (${face.toFixed(3)}, ${camFace.toFixed(3)})`);
    check(Math.hypot(r.x - stand.x, r.z - stand.z) > 3, `stepped back from the booth (${r.x}, ${r.z})`);
    await T.frames(30);
    check(await inView(T, 'hyrbil'), 'the car in the shot behind him');
    await T.shot('hytt_reveal');

    // 6. Ole pays when the purse is short.
    await T.ev(() => __game.addCoins(10 - __game.coins));
    await clearSpies(T);
    let [, e] = await call(T, 'hyrbil');
    toasts = await T.ev(() => window.__toasts.slice());
    check(e.coins === 10 && toasts.includes('Ole: Jeg spanderer!') && toasts.includes('Ole betalade 25 pta.'), `Ole pays (${e.coins}, ${JSON.stringify(toasts)})`);
    await T.ev(() => __game.addCoins(1000 - __game.coins));

    // 7. A dented hire car comes repaired, the same car.
    await T.ev(() => { const g = __game, c = g.named.hyrbil; c.place(c.home.x, c.home.z, c.home.yaw); c.damage(55, g); });
    hyr = await carOf(T, 'hyrbil');
    check(!hyr.full && !hyr.dead, `dented first (${hyr.hp})`);
    [, e] = await call(T, 'hyrbil');
    hyr = await carOf(T, 'hyrbil');
    check(hyr.same && hyr.full && hyr.spot === 'hyttBil1' && e.last.repaired === true, `repaired, the same car, on its spot (${JSON.stringify(hyr)}, ${JSON.stringify(e.last)})`);

    // 8. Bus 17 takes the next spot; the two footprints and the solids clear.
    [, e] = await call(T, 'buss17');
    const bus = await carOf(T, 'buss17');
    T.log('bus', JSON.stringify(bus));
    check(bus.same && bus.spot === 'hyttBil2', `bus 17 itself on the second spot (${JSON.stringify(bus)})`);
    const clear = await T.ev(async () => {
      const C = await import('/src/world/collision.js'), g = __game, out = [];
      for (const n of ['hyrbil', 'buss17']) {
        const c = g.named[n];
        for (const b of C.queryBlocks(c.x - 6, c.z - 6, c.x + 6, c.z + 6, [])) if (b.top > 0.75 && C.obbVsBlock(c.obb, b, {})) out.push(`${n}:${b.kind}`);
        for (const k of g.cars) if (k !== c && C.obbVsObb(c.obb, k.obb, {})) out.push(`${n}~${k.name || k.type}`);
      }
      return out;
    });
    check(clear.length === 0, `no wall or car under either (${clear})`);
    await T.ev(() => { const g = __game, b = g.named.buss17, p = g.player; g.cam.cutTo({ x: b.x - 16, y: 9, z: b.z - 14 }, { x: b.x - 2, y: 0.5, z: b.z + 1 }); });
    await T.frames(20);
    await T.shot('hytt_lot');
    await T.ev(() => __game.cam.release());

    // 9. The grisbil once unlocked; wrecked, it comes back new (the wreck gone) with "Den luktar lite.".
    await T.ev(() => { const g = __game; g.unlock('grisbil'); });
    await T.frames(4);
    await keep(T, 'grisbil');
    await T.ev(() => { const g = __game, c = g.named.grisbil; c.damage(999, g); });
    await T.frames(20);
    let gris = await carOf(T, 'grisbil');
    check(gris.dead, 'the grisbil wrecked');
    await clearSpies(T);
    await openMenu(T);
    r = await st(T);
    check(JSON.stringify(r.rows) === '["hyrbil","buss17","grisbil"]' && r.rowText[2] === 'Grisbilen25 pta', `the grisbil on the menu once unlocked (${r.rows})`);
    await T.shot('hytt_menu3');
    await T.tap('KeyQ');
    await T.frames(4);
    const [mv, end] = await call(T, 'grisbil');
    gris = await carOf(T, 'grisbil');
    const wreck = await T.ev(() => __game.cars.includes(window.__ref.grisbil));
    T.log('grisbil', JSON.stringify(gris), JSON.stringify(end.last), 'seen', mv.seen);
    check(!gris.same && !gris.dead && gris.full && !wreck && gris.n === 1, `a new grisbil, the wreck gone, one of that name (${JSON.stringify(gris)}, wreck ${wreck})`);
    check(gris.spot === 'hyttBil3' && end.last.fresh === true && mv.seen === false, `on the third spot, out of view when moved (${gris.spot}, ${mv.seen})`);
    check(gris.pigs.every(Boolean), `its bed full (${gris.pigs})`);
    await T.until(() => window.__said.some(([w, t]) => w === 'stig' && t === 'Den luktar lite.'), 5000);
    await T.frames(4);
    await T.shot('hytt_grisbil');

    // 10. A delivered grisbil, wrecked and called: its bed stays empty (and stays delivered).
    await T.ev(() => { const g = __game; g.pigs.delivered = true; for (let i = 0; i < 3; i++) g.named.grisbil.setPig(i, false); g.named.grisbil.damage(999, g); });
    await T.frames(10);
    await call(T, 'grisbil');
    await T.frames(20);
    gris = await carOf(T, 'grisbil');
    const deliv = await T.ev(() => __game.pigs.delivered);
    check(!gris.dead && gris.pigs.every((x) => !x) && deliv, `a delivered bed stays empty (${gris.pigs}, delivered ${deliv})`);

    // 11. Every spot taken by another car: the telefonist says so, nothing paid, Stig at the booth.
    await T.ev(() => {
      const g = __game, others = g.cars.filter((c) => c.home && !c.name && !c.traffic && !c.dead && !c.locked && c.root.visible && !c.spec.toy && !c.spec.bus && Math.abs(c.x) < 400).slice(0, 3);
      window.__parked = others.map((c) => [c, c.x, c.z, c.yaw]);
      for (const n of ['hyrbil', 'buss17', 'grisbil']) { const c = g.named[n]; c.place(c.home.x, c.home.z, c.home.yaw); }
      ['hyttBil1', 'hyttBil2', 'hyttBil3'].forEach((k, i) => { const l = window.__lm(k); others[i].place(l.x, l.z, l.yaw); });
    });
    await clearSpies(T);
    const c0 = (await st(T)).coins;
    const [fm, fe] = await call(T, 'hyrbil');
    toasts = await T.ev(() => window.__toasts.slice());
    hyr = await carOf(T, 'hyrbil');
    T.log('full', JSON.stringify(fe.last), JSON.stringify(toasts));
    check(fm.last.kind === 'full' && toasts.includes('Telefonisten: Ingen plats på parkeringen, señor!'), `"Ingen plats på parkeringen, señor!" (${JSON.stringify(toasts)})`);
    check(fe.coins === c0 && !hyr.spot && !fe.inDialog && Math.hypot(fe.x - stand.x, fe.z - stand.z) < 0.05, `nothing paid or moved, Stig at the booth (${fe.coins}, ${hyr.spot}, ${fe.x}, ${fe.z})`);
    await T.ev(() => { for (const [c, x, z, yaw] of window.__parked) c.place(x, z, yaw); });

    // 12. No prompt in a car, in a pursuit, or in a mission.
    await atBooth(T);
    await T.ev(() => { const g = __game, c = g.named.hyrbil, s = g.hytt.stand(); c.place(s.x + 3, s.z + 1, 0); g.enterCar(c); c.place(s.x, s.z + 0.5, Math.PI / 2); });
    await T.frames(6);
    r = await st(T);
    check(!r.near?.startsWith?.('hytt') && !/Ring efter bil/.test(r.prompt), `no phone in a car (${r.near}, "${r.prompt}")`);
    await T.ev(() => { const g = __game; g.exitCar(true); const c = g.named.hyrbil; c.place(c.home.x, c.home.z, c.home.yaw); });
    await atBooth(T);
    await T.ev(() => { const s = __game.shame; s.v = 0; s.add(100); });
    await T.frames(4);
    r = await st(T);
    const pur = await T.ev(() => __game.shame.pursuit);
    check(pur && r.near !== 'hytt', `no phone in a pursuit (${pur}, ${r.near})`);
    await T.ev(() => { const s = __game.shame; if (s.pursuit) { s.v = 0; s.endPursuit(true); } s.forced = false; });
    await T.frames(4);
    await atBooth(T);
    r = await st(T);
    check(r.near === 'hytt', `the prompt again after it (${r.near})`);
    await T.startMission();
    await atBooth(T);
    r = await st(T);
    check(r.ms === 'running' && r.near !== 'hytt' && !/Ring efter bil/.test(r.prompt), `no phone in a mission (${r.ms}, ${r.near}, "${r.prompt}")`);
    await T.ev(() => __game.hytt.open());
    r = await st(T);
    check(!r.menu, 'and no menu by hand');
    await T.ev(() => __game.missions.abort());
    await T.frames(4);
    await atBooth(T);
    r = await st(T);
    check(r.ms === 'idle' && r.near === 'hytt', `after the mission (Q) the phone again (${r.ms}, ${r.near})`);

    // 13. No shortcut: before buss17, a called bus 17 is back at the airport when Lasse's mission
    // starts (getInCar's atHome), as a moved one always was.
    await T.fresh('&mission=5');
    await spies(T);
    await keep(T, 'buss17');
    await call(T, 'buss17');
    let b = await carOf(T, 'buss17');
    check(b.same && b.spot === 'hyttBil1', `bus 17 called to the car park before its mission (${JSON.stringify(b)})`);
    await T.startMission();
    const home = await T.ev(() => { const c = __game.named.buss17; return +Math.hypot(c.x - c.home.x, c.z - c.home.z).toFixed(2); });
    r = await st(T);
    check(r.ms === 'running' && home < 0.3, `at the mission start it is back in its bay at the airport (${r.ms}, ${home} m)`);
  },
};
