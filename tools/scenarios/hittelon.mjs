// Hittelön – de borttappade väskorna (free roam, DESIGN §10.52; feature 116): hittelon, hittelonshots.
//   hittelon: at index 9 (free roam) six suitcases stand on their landmarks with their beams, on the
//             minimap within 45 m; no prompt at the counter without one. Walking into one (a real key
//             press) lifts it onto his head: Angerud's tip in Stig's mouth, `carrying`, `carryOver`, walk
//             speed even sprinting, the card and the beacon at the counter, its marker gone. In a car it
//             rides along hidden (his arms down) and is back on his head on foot. A fall drops it at his
//             feet, lifted again with the bag's own line; R spills it where he stood; another carry
//             taking over drops it at his feet. At the counter (the
//             clerk at his post) "E Lämna in väskan": the bag on the counter and the exchange in order,
//             +100 pta at "Hittelön." with the toast, the card 1/6, the save; hidden clerk, no prompt. A
//             mission start sends a carried bag home and hides them all (no markers, no pickup) until idle.
//             All six: 6 × 100 + the set's 1000 and Angerud on the radio, the legend 6/6; a reload keeps
//             them handed in (v 1), a v 1 save without the set loads with none. The flight level: inert.
//   hittelonshots: every lost suitcase on its spot from 4 m before its label and from the chase camera
//             coming up to it, Stig with one on his head (behind, side, walking, in a car), the counter
//             at Gando with the prompt and every line of the exchange.
import { check } from '../lib.mjs';

const IDS = ['hangar', 'bygge', 'packhus', 'tomater', 'grisfest', 'golf'];
const bag = (T, id) => T.ev((id) => {
  const b = __game.collectibles.vaskor.find((q) => q.id === id), m = b.mesh;
  return { id, x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), alive: b.alive, held: !!b.held, visible: m.visible,
    mx: +m.position.x.toFixed(2), my: +m.position.y.toFixed(2), mz: +m.position.z.toFixed(2), beam: m.getObjectByName('beam')?.visible };
}, id);
// Stig `d` m before bag `id`'s label (where it lies now), facing it, the camera behind him (turned `cam` rad), nobody near.
async function before(T, id, d = 4, cam = 0) {
  await T.ev((id, d, cam) => {
    const g = __game, b = g.collectibles.vaskor.find((q) => q.id === id), a = b.home.yaw, p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.teleport(b.x + Math.sin(a) * d, b.z + Math.cos(a) * d, a + Math.PI);
    p.vx = p.vz = 0;
    g.cam.yaw = a + Math.PI + cam; g.cam.snapNext = true;
    g.peds.forEach((ped) => { if (Math.hypot(ped.char.x - b.x, ped.char.z - b.z) < 30) ped.char.teleport(b.x + 300, b.z + 300); });
  }, id, d, cam);
  await T.frames(12);
}
// Lift bag `id` the way a player does: walk him into it.
async function lift(T, id) {
  await before(T, id, 2.2);
  await T.hold(['KeyW'], 700);
  await T.until(() => !!__game.bags.bag, 4000).catch(() => {});
  await T.frames(5);
}
const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? (it.type === 'it' ? it.it.id : it.type) : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
const dlg = (T) => T.ev(() => { const d = document.getElementById('dialog'); return d.classList.contains('show') ? d.querySelector('.dlg-name').textContent + ': ' + (d.querySelector('.dlg-text').textContent + (d.querySelector('.dlg-text').dataset.rest || '')) : null; });

const resetLog = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || '?', text]); return o(t, text, secs); };
    const d = g.dialog.bind(g);
    g.dialog = (lines) => { window.__dlg.push(...lines.map(([w, t, c]) => [w, t, c?.coins ?? null])); return d(lines); };
    const r = g.radio.bind(g);
    g.radio = (who, text) => { window.__radio.push([who, text]); return r(who, text); };
  }
  window.__said = []; window.__dlg = []; window.__radio = [];
});
const log = (T) => T.ev(() => ({ said: window.__said.slice(), dlg: window.__dlg.slice(), radio: window.__radio.slice() }));
const state = (T) => T.ev(() => {
  const g = __game, b = g.bags, p = g.player;
  return { bag: b.bag?.id ?? null, carrying: g.carrying ? { ...g.carrying } : null, arms: !!p.anim.carryOver, cap: g.speedCap, busy: b.busy,
    target: b.target(), card: b.objective()?.title ?? null, last: b.last, coins: g.coins, n: g.collected.vaskor.size, inCar: !!g.playerCar };
});
const markers = (T, id) => T.ev((id) => {
  const g = __game, b = id && g.collectibles.vaskor.find((q) => q.id === id);
  return g.mapMarkers(false).filter((m) => m.type === 'vaska' && (!b || Math.hypot(m.x - b.x, m.z - b.z) < 0.01)).length;
}, id);
const toasts = (T) => T.ev(() => [...document.querySelectorAll('#toasts .toast')].map((t) => t.textContent));
// Stig at the counter's E spot with bag `id` on his head (lifted the module's way), the camera behind.
async function toCounter(T, id) {
  await T.ev((id) => {
    const g = __game, b = g.collectibles.vaskor.find((q) => q.id === id), l = window.__lm('hittegodsLamna'), p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    if (!g.bags.bag) { p.teleport(b.x, b.z + 0.6, 0); g.bags.lift(b); }
    p.teleport(l.x, l.z + 0.2, l.yaw);
    p.vx = p.vz = 0;
    g.cam.yaw = l.yaw; g.cam.snapNext = true;
  }, id);
  await T.frames(8);
}
// Hand bag `id` in without the keys (the exchange plays out by itself in test mode).
async function handIn(T, id) {
  await toCounter(T, id);
  await T.ev(() => __game.bags.handOver());
  await T.until(() => !__game.bags.busy && !__game.inDialog, 20000);
  await T.frames(3);
}

export const SCENARIOS = {
  async hittelon(T) {
    await T.fresh('&mission=9');
    await resetLog(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');
    const cfg = await T.ev(() => JSON.parse(JSON.stringify(__game.bags.cfg)));
    const walk = await T.ev(() => __game.levelDef.speeds.walk);
    // 1. Six bags on their landmarks.
    for (const id of IDS) {
      const b = await bag(T, id), l = await T.L('vaska_' + id);
      check(b.alive && b.visible && b.beam && !b.held && Math.hypot(b.x - l.x, b.z - l.z) < 1e-6 && Math.abs(b.y - l.y) < 1e-6, `${id}: on its landmark, shown, its beam`);
    }
    await before(T, 'golf', 4, 0.6);
    check(await markers(T, 'golf') === 1 && await markers(T, 'hangar') === 0, 'a minimap marker within 45 m only');
    let r = await state(T);
    check(!r.bag && !r.carrying && !r.target && !r.card, 'nothing carried');
    // No prompt at the counter without a bag.
    await T.ev(() => { const g = __game, l = window.__lm('hittegodsLamna'); g.player.teleport(l.x, l.z, l.yaw); });
    await T.frames(5);
    check(await near(T) !== 'hittelon:lamna', 'no prompt at the counter without a bag');

    // 2. Walking into one lifts it.
    await lift(T, 'golf');
    r = { s: await state(T), b: await bag(T, 'golf'), log: await log(T) };
    T.log('lift', JSON.stringify(r));
    check(r.s.bag === 'golf' && r.s.carrying?.bag === 'golf' && r.s.carrying.item === 'vaska' && !r.s.carrying.who && r.s.arms, 'lifted: carrying, carryOver');
    check(r.s.cap === walk && r.s.card === cfg.title && r.s.target && Math.hypot(r.s.target.x - (await T.L(cfg.lm)).x, r.s.target.z - (await T.L(cfg.lm)).z) < 1e-6, 'walk speed, the card, the target at the counter');
    check(r.log.said.some(([w, t]) => w === 'stig' && t === cfg.pickFirst), 'the first lift: Angerud\'s tip in Stig\'s mouth');
    check(r.b.held && !r.b.beam && r.b.my > 1.8 && await markers(T, 'golf') === 0, 'over his head, no beam, no marker');
    const mk = await T.ev(() => __game.mapMarkers(false).filter((m) => m.type === 'objective').length);
    check(mk === 1, 'the objective star on the minimap');
    // Sprinting: still walk speed.
    await T.ev(() => { const g = __game; g.player.yaw = 0; g.cam.yaw = 0; g.cam.snapNext = true; });
    await T.page.keyboard.down('ShiftLeft');
    await T.page.keyboard.down('KeyW');
    await T.sleep(700);
    const sp = await T.ev(() => Math.hypot(__game.player.vx, __game.player.vz));
    await T.page.keyboard.up('KeyW');
    await T.page.keyboard.up('ShiftLeft');
    T.log('sprint speed', sp.toFixed(2), 'walk', walk);
    check(sp <= walk + 0.05, 'no sprint with a bag on his head');
    await T.frames(30);

    // 3. A car: it rides along hidden, his arms down; out again on his head.
    await T.anyCar();
    r = { s: await state(T), b: await bag(T, 'golf') };
    check(r.s.inCar && r.s.bag === 'golf' && !r.b.visible && !r.s.arms, 'in a car: the bag hidden, his arms down');
    await T.tap('KeyE');
    await T.frames(10);
    r = { s: await state(T), b: await bag(T, 'golf') };
    check(!r.s.inCar && r.s.bag === 'golf' && r.b.visible && r.s.arms, 'out of the car: on his head again');

    // 4. A fall drops it at his feet; lifted again with the bag's own line.
    await resetLog(T);
    const at = await T.ev(() => { const p = __game.player; p.fling(3, 4, 0); return { x: p.x, z: p.z }; });
    await T.frames(6);
    r = await state(T);
    check(!r.bag && !r.carrying && !r.arms && !r.cap && r.last?.kind === 'drop', 'flung: dropped');
    await T.until(() => !__game.collectibles.vaskor.find((q) => q.id === 'golf').falling, 4000);
    r = { b: await bag(T, 'golf'), p: await T.ev(() => ({ x: __game.player.x, z: __game.player.z })) };
    T.log('dropped', JSON.stringify(r), JSON.stringify(at));
    check(!r.b.held && r.b.beam && r.b.visible && Math.hypot(r.b.x - at.x, r.b.z - at.z) < 4 && r.b.y < 0.5, 'it lies on the ground near where he fell, its beam on');
    check(await markers(T, 'golf') === 1, 'its marker where it lies');
    await T.until(() => __game.player.state === 'normal', 8000);
    await T.frames(5);
    if (!(await state(T)).bag) await lift(T, 'golf');
    r = { s: await state(T), log: await log(T) };
    check(r.s.bag === 'golf' && r.log.said.some(([w, t]) => w === 'stig' && /golfbag/.test(t)), 'lifted again: its own line');

    // 5. R spills it where he stood.
    const stood = await T.ev(() => ({ x: __game.player.x, z: __game.player.z }));
    await T.tap('KeyR');
    await T.frames(4);
    await T.until(() => !__game.collectibles.vaskor.find((q) => q.id === 'golf').falling, 4000);
    r = { s: await state(T), b: await bag(T, 'golf'), p: await T.ev(() => ({ x: __game.player.x, z: __game.player.z })) };
    T.log('R', JSON.stringify(r), JSON.stringify(stood));
    check(!r.s.bag && Math.hypot(r.b.x - stood.x, r.b.z - stood.z) < 0.5, 'R: the bag stays where he stood');
    // Another carry taking over (as Robban's ask lifting Berra, §10.6): it falls at his feet.
    await before(T, 'golf', 3);
    await lift(T, 'golf');
    const was = await T.ev(() => { const g = __game; g.carrying = { who: 'berra', job: 'test' }; return { x: g.player.x, z: g.player.z }; });
    await T.frames(4);
    await T.until(() => !__game.collectibles.vaskor.find((q) => q.id === 'golf').falling, 4000);
    r = { s: await state(T), b: await bag(T, 'golf') };
    check(!r.s.bag && r.s.carrying?.who === 'berra' && r.s.last?.kind === 'drop' && Math.hypot(r.b.x - was.x, r.b.z - was.z) < 0.5, 'another carry: dropped at his feet, theirs kept');
    await T.ev(() => { const g = __game; g.carrying = null; g.player.teleport(g.player.x + 4, g.player.z, 0); });
    await T.frames(3);

    // 6. At the counter: the prompt, the exchange, the pay.
    await resetLog(T);
    await toCounter(T, 'golf');
    r = { near: await near(T), prompt: await prompt(T) };
    check(r.near === 'hittelon:lamna' && /Lämna in väskan/.test(r.prompt), 'the prompt at the counter with a bag');
    await T.ev(() => __game.hideNpc('hittegods'));
    await T.frames(3);
    check(await near(T) !== 'hittelon:lamna', 'no prompt with the clerk gone');
    await T.ev(() => __game.placeNpcs(true));
    await T.frames(3);
    check(await near(T) === 'hittelon:lamna', 'the clerk back: the prompt');
    const c0 = await T.ev(() => __game.coins);
    await T.tap('KeyE');
    await T.until(() => __game.bags.busy, 3000);
    r = { b: await bag(T, 'golf'), d: await T.L(cfg.disk) };
    check(r.b.visible && Math.hypot(r.b.mx - r.d.x, r.b.mz - r.d.z) < 1e-3 && Math.abs(r.b.my - r.d.y) < 1e-3, 'the bag on the counter');
    await T.until(() => window.__dlg.length >= 3 && __game.coins !== null, 10000);
    await T.until(() => !__game.bags.busy && !__game.inDialog, 20000);
    await T.frames(3);
    r = { s: await state(T), b: await bag(T, 'golf'), log: await log(T), toasts: await toasts(T), card: await T.ev(() => document.getElementById('collect').textContent) };
    T.log('handed', JSON.stringify(r));
    const want = cfg.lines.map(([w, t]) => w + ': ' + t);
    check(JSON.stringify(r.log.dlg.map(([w, t]) => w + ': ' + t)) === JSON.stringify(want), `the exchange in order (${r.log.dlg.map((l) => l[1]).join(' / ')})`);
    check(r.log.dlg[2][2] === cfg.pay && r.log.dlg.filter((l) => l[2] != null).length === 1, '"Hittelön." pays');
    check(r.s.coins === c0 + cfg.pay && r.s.n === 1, `+${cfg.pay} pta, 1 handed in`);
    check(r.toasts.some((t) => /Hittelön: \+100 pta/.test(t)), 'the toast');
    check(/Borttappade väskor\s*1\/6/.test(r.card), 'the card 1/6');
    check(!r.b.alive && !r.b.visible && !r.s.bag && !r.s.carrying && !r.s.arms && !r.s.cap, 'gone from the counter, his hands free');
    const sv = await T.ev(() => { __game.save(); return JSON.parse(localStorage.getItem('charter-and-run-v1')); });
    check(sv.v === 1 && JSON.stringify(sv.collected.vaskor) === '["golf"]', 'saved (v 1)');

    // 7. A mission start sends a carried bag home and hides them all.
    await T.ev(() => { const g = __game, b = g.collectibles.vaskor.find((q) => q.id === 'hangar'), p = g.player; p.teleport(b.x, b.z + 0.6, 0); g.bags.lift(b); });
    await T.frames(3);
    check((await state(T)).bag === 'hangar', 'carrying the hangar bag');
    await T.startMission();
    r = { s: await state(T), b: await bag(T, 'hangar'), all: await T.ev(() => __game.collectibles.vaskor.filter((b) => b.alive).every((b) => !b.mesh.visible)), mk: await T.ev(() => __game.mapMarkers(false).filter((m) => m.type === 'vaska').length) };
    T.log('mission', JSON.stringify(r));
    check(!r.s.bag && !r.s.carrying && !r.s.arms && r.b.x === (await T.ev(() => __game.collectibles.vaskor.find((q) => q.id === 'hangar').home.x)), 'a mission start: the bag home, his hands free');
    check(r.all && r.mk === 0 && !r.s.target, 'in a mission: all hidden, no markers, no target');
    await T.ev(() => { const g = __game, b = g.collectibles.vaskor.find((q) => q.id === 'bygge'); g.player.teleport(b.x, b.z + 0.5, 0); });
    await T.frames(10);
    check(!(await state(T)).bag, 'no pickup in a mission');

    // 8. All six (a new session from the save): the bonus, Angerud, the legend.
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1&mission=9`, { waitUntil: 'load' });
    await T.until(() => window.__ready === true, 120000);
    await T.frames(10);
    await resetLog(T);
    r = await T.ev(() => ({ n: __game.collected.vaskor.size, golf: __game.collectibles.vaskor.find((q) => q.id === 'golf').alive }));
    check(r.n === 1 && !r.golf, 'a reload: the golf bag still handed in');
    const c1 = await T.ev(() => __game.coins);
    for (const id of IDS.filter((i) => i !== 'golf')) await handIn(T, id);
    await T.sleep(3200);
    r = { s: await state(T), log: await log(T), legend: await T.ev(() => __game.mapLegend()) };
    T.log('6/6', JSON.stringify({ coins: r.s.coins, n: r.s.n, radio: r.log.radio }));
    check(r.s.n === 6 && r.s.coins === c1 + 5 * cfg.pay + 1000, '6/6: 5 × 100 + the set\'s 1000');
    check(r.log.radio.some(([w, t]) => w === 'angerud' && /lämnade in allihop/.test(t)), 'Angerud on the radio');
    check(/Borttappade väskor <b>6\/6<\/b>/.test(r.legend), 'the legend 6/6');
    // A v 1 save without the set loads with none.
    await T.ev(() => { const s = JSON.parse(localStorage.getItem('charter-and-run-v1')); delete s.collected.vaskor; localStorage.setItem('charter-and-run-v1', JSON.stringify(s)); });
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1&mission=9`, { waitUntil: 'load' });
    await T.until(() => window.__ready === true, 120000);
    await T.frames(10);
    r = await T.ev(() => ({ n: __game.collected.vaskor.size, alive: __game.collectibles.vaskor.every((b) => b.alive && b.mesh.visible) }));
    check(r.n === 0 && r.alive, 'a save without the set: none handed in, all six out');

    // 9. The flight level: inert.
    await T.fresh('&mission=0');
    r = await T.ev(() => ({ level: __game.level, shown: __game.collectibles.vaskor.some((b) => b.mesh.visible), live: __game.bags.live, mk: __game.mapMarkers(false).filter((m) => m.type === 'vaska').length }));
    check(r.level === 'flight' && !r.shown && !r.live && r.mk === 0, 'the flight level: hidden, inert');
  },
  async hittelonshots(T) {
    await T.fresh('&mission=9&ts=1');
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');
    const list = await T.ev(() => __game.collectibles.vaskor.map((c) => c.id));
    check(JSON.stringify(list) === JSON.stringify(IDS), `six bags (${list})`);
    for (const id of IDS) {
      T.log('bag', JSON.stringify(await bag(T, id)));
      await before(T, id, 3.2, 0.75);
      await T.shot(`hittelon_spot_${id}`);
      await before(T, id, 14, 0.25);
      await T.shot(`hittelon_far_${id}`);
    }
    // On his head, on the open green.
    await lift(T, 'golf');
    T.log('lifted', JSON.stringify(await T.ev(() => __game.bags.last)), JSON.stringify(await bag(T, 'golf')));
    for (const [name, turn] of [['back', 0], ['side', Math.PI / 2], ['front', Math.PI * 0.85]]) {
      await T.ev((turn) => { const g = __game, p = g.player; g.cam.yaw = p.yaw + turn; g.cam.snapNext = true; }, turn);
      await T.frames(8);
      await T.shot(`hittelon_carry_${name}`);
    }
    await T.ev(() => { const g = __game, p = g.player; g.cam.yaw = p.yaw; g.cam.snapNext = true; });
    await T.hold(['KeyW', 'KeyA'], 1200);
    await T.shot('hittelon_carry_walk');
    await T.anyCar();
    await T.frames(10);
    await T.shot('hittelon_carry_car');
    // At the counter, line by line.
    await T.ev(() => { const g = __game, l = window.__lm('hittegodsLamna'); if (g.playerCar) g.exitCar(true); g.player.teleport(l.x, l.z + 2.2, l.yaw); g.cam.yaw = l.yaw; g.cam.snapNext = true; g.autoDialog = false; });
    await T.frames(10);
    await T.hold(['KeyW'], 450);
    await T.frames(5);
    T.log('counter', await near(T), JSON.stringify(await prompt(T)));
    await T.shot('hittelon_counter_prompt');
    await T.tap('KeyE');
    for (let k = 0; k < 4; k++) {
      await T.until(() => { const d = document.getElementById('dialog'); return d.classList.contains('show') && d.querySelector('.dlg-text').dataset.rest === ''; }, 8000).catch(() => {});
      await T.sleep(300);
      T.log('line', k + 1, await dlg(T), 'coins', await T.ev(() => __game.coins));
      await T.shot(`hittelon_counter_line${k + 1}`);
      await T.tap('KeyE');
      await T.frames(4);
    }
    await T.until(() => !__game.inDialog, 15000);
    await T.ev(() => { __game.autoDialog = true; });
    await T.frames(10);
    await T.shot('hittelon_counter_after');
    T.log('after', JSON.stringify(await T.ev(() => ({ last: __game.bags.last, coins: __game.coins, n: __game.collected.vaskor.size }))));
  },
};
