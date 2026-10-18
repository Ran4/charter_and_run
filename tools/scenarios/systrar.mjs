// Systrarnas balkong (free roam, DESIGN §10.55; feature 117): systrar, systrarshots.
//   systrar: at index 10 (fataga waiting) and 12 (after the grisfest) nothing on 105's patio; at index 11
//            the sisters at the pool with the pool's features as before, and by night nothing either. Stig
//            walking onto 105's patio (a real key press) by day: the cut, the sisters perched on the
//            balcony above 105 (no physics, posed, no kick bark), the ask's lines in order with Majsan
//            waving, then the errand's card and the beacon at the nearer shop. Siv's reminder when he comes
//            back by without the bottle. The pool bar (E, 250 pta, the bartender's line, Stig's), the coffee's
//            E beside it as before; a fall breaks the bottle; the supermercado (150 pta, the voice from the
//            door; Ole pays when the purse is short); the bottle rides along hidden in a car. E under the
//            balcony: the basket down on the towel, the bottle in, up, Siv's bottle, the delivery's lines,
//            the wave afterwards and again on the next pass. A car left by the west gable: Majsan's line and
//            Siv's answer, none from a neighbour. The grisfest's talk with the bottle in hand; its start
//            sends the sisters home to the pool on the ground and takes the bottle.
//   systrarshots: the ask's shot on every line, the shops with their prompts, the bottle in his hand, the
//            basket's way down and up, the delivery's lines, Majsan's wave from the patio, the deck and the
//            street, the parking exchange.
import { check } from '../lib.mjs';

const KEYS = ['siv', 'majsan'];
const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? (it.type === 'it' ? it.it.id : it.type) : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
const dlg = (T) => T.ev(() => { const d = document.getElementById('dialog'); return d.classList.contains('show') ? d.querySelector('.dlg-name').textContent + ': ' + (d.querySelector('.dlg-text').textContent + (d.querySelector('.dlg-text').dataset.rest || '')) : null; });
const toasts = (T) => T.ev(() => [...document.querySelectorAll('#toasts .toast')].map((t) => t.textContent));
const resetLog = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || (t.height === 2.2 ? 'shop' : '?'), text]); return o(t, text, secs); };
    const d = g.dialog.bind(g);
    g.dialog = (lines) => { window.__dlg.push(...lines.map(([w, t]) => [w, t])); return d(lines); };
    const r = g.radio.bind(g);
    g.radio = (who, text) => { window.__radio.push([who, text]); return r(who, text); };
  }
  window.__said = []; window.__dlg = []; window.__radio = [];
});
const log = (T) => T.ev(() => ({ said: window.__said.slice(), dlg: window.__dlg.slice(), radio: window.__radio.slice() }));
const st = (T) => T.ev(() => {
  const g = __game, s = g.sisters, p = g.player, o = {};
  for (const k of ['siv', 'majsan']) {
    const n = g.npc(k);
    o[k] = { x: +n.x.toFixed(2), y: +n.y.toFixed(2), z: +n.z.toFixed(2), yaw: +n.yaw.toFixed(2), perched: !!n.perched, busy: !!n.busy, spot: n.spot, state: n.state,
      wave: !!n.anim.wave, cup: n.anim.cupHeld, whisky: n.anim.whisky, push: !!n.anim.push, posed: g.npcPosed(k), honk: g.honk.free(k), chat: g.chat.free(k) };
  }
  return { phase: s.phase, up: s.up, holding: s.holding, carrying: g.carrying ? { ...g.carrying } : null, arm: p.anim.whisky, basket: s.basketY, bottle: s.bottle.visible,
    target: s.target(), card: s.objective(), counts: { ...s.counts }, last: s.last, coins: g.coins, dialog: g.inDialog, cut: !!g.cam.cine, idx: g.missions.index, ms: g.missions.state,
    px: +p.x.toFixed(2), pz: +p.z.toFixed(2), ...o };
});
// Stig on foot at (x, z) facing yaw, the camera behind him; nothing held, nobody's bubble up.
async function stand(T, x, z, yaw, cam = 0) {
  await T.ev((x, z, yaw, cam) => {
    const g = __game, p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.teleport(x, z, yaw);
    p.vx = p.vz = 0;
    g.cam.yaw = yaw + cam; g.cam.snapNext = true;
  }, x, z, yaw, cam);
  await T.frames(6);
}
// Walk him onto 105's patio from the deck's path south of it (a real key press): the ask.
async function walkIn(T) {
  await stand(T, -21.65, -6.4, Math.PI);
  await T.hold(['KeyW'], 900);
  await T.until(() => __game.sisters.phase != null || __game.player.z < -12, 5000).catch(() => {});
}
const atSpot = (T, name, d = 0) => T.ev((name, d) => {
  const g = __game, l = window.__lm(name), p = g.player;
  if (g.playerCar) g.exitCar(true);
  p.state = 'normal';
  p.teleport(l.x - Math.sin(l.yaw) * d, l.z - Math.cos(l.yaw) * d, l.yaw);
  p.vx = p.vz = 0;
  g.cam.yaw = l.yaw; g.cam.snapNext = true;
}, name, d);
async function ask(T) {
  await walkIn(T);
  await T.until(() => __game.sisters.phase === 'errand', 30000);
  await T.frames(3);
}
async function buyAt(T, name) {
  await atSpot(T, name);
  await T.frames(6);
  await T.tap('KeyE');
  await T.until(() => __game.sisters.holding, 4000);
  await T.frames(3);
}
async function deliver(T) {
  await atSpot(T, 'balkongKorg');
  await T.frames(6);
  await T.tap('KeyE');
  await T.until(() => __game.sisters.phase === 'done' && !__game.inDialog, 40000);
  await T.frames(3);
}

export const SCENARIOS = {
  async systrar(T) {
    // 0. Not at index 10 (fataga waits: Majsan its giver) nor 12 (after the grisfest).
    for (const i of [10, 12]) {
      await T.fresh(`&mission=${i}`);
      await T.frames(10);
      await walkIn(T);
      await T.frames(20);
      const r = await st(T);
      T.log(`index ${i}`, JSON.stringify({ phase: r.phase, up: r.up, siv: r.siv.perched, majsan: r.majsan.perched }));
      check(!r.phase && !r.up && !r.siv.perched && !r.majsan.perched, `index ${i}: nothing on 105's patio`);
    }

    // 1. Index 11: the sisters at the pool, free as before (the sun cream's prompt by Majsan).
    await T.fresh('&mission=11');
    await resetLog(T);
    await T.frames(10);
    const cfg = await T.ev(() => JSON.parse(JSON.stringify(__game.sisters.cfg)));
    let r = await st(T);
    const pool = await T.L('flamencoPool');
    check(r.idx === 11 && r.ms === 'idle' && !r.phase && !r.up, 'index 11 idle: no errand yet');
    check(KEYS.every((k) => !r[k].perched && !r[k].busy && r[k].honk && Math.hypot(r[k].x - pool.x, r[k].z - pool.z) < 3), 'the sisters at the pool, free');
    await T.ev(() => { const g = __game, m = g.npc('majsan'); g.player.teleport(m.x, m.z + 1.4, Math.PI); });
    await T.frames(6);
    check(await T.ev(() => __game.solkram.canUse()), 'the sun cream by Majsan as before');
    // By night: nothing on the patio.
    await T.ev(() => __game.day.set(22));
    await walkIn(T);
    await T.frames(15);
    r = await st(T);
    check(!r.phase && !r.up, 'not by night');
    await stand(T, -21.65, -2, Math.PI);   // off the patio first: by day there it would start at once
    await T.ev(() => __game.day.set(15));
    await T.frames(5);

    // 2. Onto the patio by day: the cut, the sisters on the balcony, the ask (held: Space goes on).
    await T.ev(() => { __game.autoDialog = false; });
    await walkIn(T);
    await T.until(() => __game.sisters.phase === 'ask', 5000);
    await T.frames(5);
    r = await st(T);
    const bal = await T.L('balkong105');
    T.log('ask', JSON.stringify(r));
    check(r.phase === 'ask' && r.up && r.dialog && r.cut && r.counts.ask === 1, 'walking onto the patio: the ask, held, the cut');
    for (const k of KEYS) {
      const want = await T.ev((k) => { const g = __game, c = g.sisters.cfg; return g.lmOffset(c.at, c.spots[k][0], c.spots[k][1]); }, k);
      check(r[k].perched && r[k].busy && r[k].spot === 'balkong105' && Math.abs(r[k].y - bal.y) < 0.01 && Math.hypot(r[k].x - want.x, r[k].z - want.z) < 0.01, `${k} on the balcony, perched`);
      check(r[k].posed && !r[k].honk && !r[k].chat, `${k} posed: no horn answer, no talk`);
    }
    check(r.siv.cup === 'low' && r.majsan.wave, 'Siv\'s glass, Majsan waving');
    check(!(await T.ev(() => __game.solkram.canUse())) && !(await T.ev(() => __game.judges.free('siv'))), 'the pool\'s features leave them be');
    for (let k = 0; k < cfg.ask.length; k++) { await T.sleep(500); await T.tap('Space'); await T.frames(2); }
    await T.ev(() => { __game.autoDialog = true; });
    await T.until(() => __game.sisters.phase === 'errand', 30000);
    await T.frames(3);
    r = await st(T);
    let L = await log(T);
    T.log('after the ask', JSON.stringify(r), JSON.stringify(L.dlg));
    check(JSON.stringify(L.dlg) === JSON.stringify(cfg.ask.map(([w, t]) => [w, t])), 'the ask\'s lines in order');
    check(!r.dialog && !r.cut && r.card?.title === cfg.title && r.card.text === cfg.buyText, 'free again, the card');
    const barL = await T.L('whiskyBar');
    check(r.target && Math.hypot(r.target.x - barL.x, r.target.z - barL.z) < 0.01, 'the beacon at the nearer shop (the pool bar)');
    // A second hour on the patio: still the one errand; their y held through a few seconds.
    await T.sleep(1500);
    r = await st(T);
    check(r.phase === 'errand' && r.siv.perched && Math.abs(r.siv.y - bal.y) < 0.01 && Math.abs(r.majsan.y - bal.y) < 0.01 && r.counts.ask === 1, 'they stay up (no fall), one ask');
    // A kick under the balcony: no bark from up there.
    await stand(T, -23.3, -12.2, Math.PI);
    await resetLog(T);
    await T.tap('KeyF');
    await T.frames(20);
    L = await log(T);
    check(!L.said.some(([w]) => w === 'siv' || w === 'majsan'), `no kick bark from the balcony (${JSON.stringify(L.said)})`);

    // 3. The reminder: away and back in front, no bottle.
    await stand(T, -23, 20, Math.PI);
    await T.frames(10);
    await resetLog(T);
    await stand(T, -23, -2, Math.PI);
    await T.frames(10);
    L = await log(T);
    r = await st(T);
    check(L.said.some(([w, t]) => w === 'siv' && t === cfg.remind) && r.counts.remind === 1, 'Siv\'s reminder');
    await stand(T, -23, -4, Math.PI);
    await T.frames(10);
    check((await st(T)).counts.remind === 1, 'once an approach');

    // 4. The pool bar: the prompt with its price, E, the lines, the bottle in his left hand.
    await atSpot(T, 'whiskyBar');
    await T.frames(6);
    let pr = await prompt(T);
    check(await near(T) === 'whisky:bar' && pr === 'E Köp en flaska whisky (250 pta)', `the bar's prompt "${pr}"`);
    await atSpot(T, 'poolbarKaffe');
    await T.frames(6);
    check(await near(T) === 'kaffe', 'the coffee\'s E beside it as before');
    await resetLog(T);
    await T.ev(() => { __game.coins = 1000; });
    await buyAt(T, 'whiskyBar');
    await T.sleep(1800);
    r = await st(T);
    L = await log(T);
    T.log('bar', JSON.stringify(r), JSON.stringify(L.said));
    check(r.holding && r.carrying?.whisky && r.arm === true && r.coins === 750 && r.last.kind === 'buy' && r.last.shop === 'bar', 'bought: 250 pta, the bottle in his hand');
    check(L.said.some(([w, t]) => w === 'camarero' && t === cfg.shops[1].lines[0][2]) && L.said.some(([w, t]) => w === 'stig' && t === cfg.shops[1].lines[1][2]), 'the bartender\'s line and Stig\'s');
    const korg = await T.L('balkongKorg');
    check(r.card.text === cfg.bringText && r.target && Math.hypot(r.target.x - korg.x, r.target.z - korg.z) < 0.01, 'the card and the beacon at the balcony');
    check(await near(T) !== 'whisky:bar', 'no second bottle');
    // A fall breaks it.
    await T.ev(() => { const p = __game.player; p.fling(2, 5, 0); });
    await T.frames(5);
    r = await st(T);
    check(!r.holding && !r.carrying && !r.arm && r.counts.broke === 1 && r.phase === 'errand', 'a fall breaks it, back to buying');
    check((await toasts(T)).some((t) => t.includes(cfg.broken)), 'the toast');
    await T.until(() => __game.player.state === 'normal', 8000);

    // 5. The supermercado, with an empty purse: Ole pays.
    await T.ev(() => { __game.coins = 0; });
    await resetLog(T);
    await buyAt(T, 'whiskySuper');
    await T.sleep(1800);
    r = await st(T);
    L = await log(T);
    T.log('super', JSON.stringify(r), JSON.stringify(L));
    check(r.holding && r.coins === 0 && r.last.shop === 'super' && L.radio.some(([w]) => w === 'ole'), 'bought at the supermercado, Ole paid');
    check(L.said.some(([w, t]) => w === 'shop' && t === cfg.shops[0].lines[0][2]) && L.said.some(([w, t]) => w === 'stig' && t === cfg.shops[0].lines[1][2]), 'the voice from the door and Stig\'s line');
    // In a car it rides along out of sight, and is back in his hand on foot.
    await T.anyCar();
    r = await st(T);
    check(r.holding && !r.arm, 'in a car: kept, out of sight');
    await T.ev(() => { __game.playerCar.place(-40, 12, Math.PI); });   // out of the parking zone by the gable
    await T.frames(5);
    await T.ev(() => __game.exitCar(true));
    await T.frames(5);
    r = await st(T);
    check(r.holding && r.arm === true, 'on foot: in his hand again');

    // 6. Under the balcony: the delivery.
    await atSpot(T, 'balkongKorg');
    await T.frames(6);
    pr = await prompt(T);
    check(await near(T) === 'whisky:korg' && pr === 'E Skicka upp whiskyn', `the prompt "${pr}"`);
    await resetLog(T);
    await T.tap('KeyE');
    await T.until(() => __game.sisters.phase === 'deliver', 3000);
    await T.sleep(1200);
    r = await st(T);
    check(r.dialog && r.cut && r.basket != null && r.basket > cfg.basketY + 0.3 && r.majsan.push, `the basket on its way down (${r.basket})`);
    await T.until(() => __game.sisters.bottle.visible, 8000);
    r = await st(T);
    check(!r.holding && !r.carrying && Math.abs(r.basket - cfg.basketY) < 0.05, `the bottle in the basket at the bottom (${r.basket})`);
    await T.until(() => __game.sisters.basketY == null, 8000);
    r = await st(T);
    check(r.siv.whisky === 'low' && !r.bottle, 'up: the bottle in Siv\'s hand');
    await T.until(() => __game.sisters.phase === 'done' && !__game.inDialog, 30000);
    await T.frames(3);
    r = await st(T);
    L = await log(T);
    T.log('delivered', JSON.stringify(r), JSON.stringify(L.dlg));
    check(JSON.stringify(L.dlg) === JSON.stringify(cfg.deliver.map(([w, t]) => [w, t])), 'the delivery\'s lines in order');
    check(r.phase === 'done' && r.counts.deliver === 1 && !r.card && !r.target && !r.cut && r.majsan.wave, 'done: no card, no beacon, Majsan waving');
    // The next pass: a wave again.
    await stand(T, -23, 20, Math.PI);
    await T.frames(20);
    const w0 = (await st(T)).counts.wave;
    await stand(T, -20, -4, Math.PI);
    await T.frames(5);
    r = await st(T);
    check(r.counts.wave === w0 + 1 && r.majsan.wave, 'Majsan waves on the next pass');

    // 7. A car left by the west gable: Majsan's line, Siv's answer; no neighbour's.
    check((await st(T)).counts.park === 0, 'no parking line for a car left south of the gable\'s zone');
    const parks0 = await T.ev(() => __game.residents.counts.park);
    await resetLog(T);
    await T.anyCar();
    await T.ev(() => { __game.playerCar.place(-29, -17, 0); });
    await T.frames(10);
    await T.ev(() => __game.exitCar(true));
    await T.sleep(3500);
    L = await log(T);
    r = await st(T);
    T.log('park', JSON.stringify(L.said), JSON.stringify(r.last));
    check(L.said.some(([w, t]) => w === 'majsan' && t === cfg.park.line) && L.said.some(([w, t]) => w === 'siv' && t === cfg.park.reply) && r.counts.park === 1, 'the parking exchange from the balcony');
    check(await T.ev(() => __game.residents.counts.park) === parks0, 'no neighbour\'s line');

    // 8. The grisfest's talk with a bottle in his hand; its start sends them home, the bottle gone.
    await T.ev(() => { const g = __game; g.sisters.phase = 'errand'; });
    await buyAt(T, 'whiskyBar');
    await T.ev(() => { const g = __game, s = g.approachSpot(g.missions.current.at); g.player.teleport(s.x, s.z, s.yaw); });
    await T.frames(6);
    check(await near(T) === 'talk', 'the giver\'s talk with the bottle in hand');
    await T.tap('KeyE');
    await T.until(() => __game.missions.state !== 'idle', 4000);
    await T.frames(5);
    r = await st(T);
    T.log('mission start', JSON.stringify(r));
    check(!r.phase && !r.up && !r.carrying && !r.arm, 'the errand over, the bottle gone');
    for (const k of KEYS) check(!r[k].perched && r[k].y < 0.5 && r[k].spot !== 'balkong105' && !r[k].whisky && !r[k].posed, `${k} home on the ground`);
    await T.until(() => __game.missions.state === 'running', 60000);
    await T.frames(30);
    r = await st(T);
    check(KEYS.every((k) => !r[k].perched && r[k].y < 0.5), 'in the mission: nobody on the balcony');
  },

  async systrarshots(T) {
    await T.fresh('&mission=11');
    await T.frames(10);
    await T.ev(() => { const g = __game; for (const ped of g.peds) if (Math.hypot(ped.char.x + 22, ped.char.z + 10) < 40) ped.char.teleport(ped.char.x + 200, ped.char.z); });
    await stand(T, -22.9, -2, Math.PI);
    await T.shot('systrar_0_before');
    // Each line as the player sees it: the dialogue held, Space to go on.
    await T.ev(() => { __game.autoDialog = false; });
    await walkIn(T);
    await T.until(() => __game.sisters.phase === 'ask', 5000);
    for (let i = 0; i < 3; i++) {
      await T.sleep(900);
      await T.shot(`systrar_1_ask${i}`);
      await T.tap('Space');
      await T.frames(2);
    }
    await T.ev(() => { __game.autoDialog = true; });
    await T.until(() => __game.sisters.phase === 'errand', 30000);
    await T.frames(10);
    await T.shot('systrar_2_card');
    await atSpot(T, 'whiskyBar', 0);
    await T.ev(() => { __game.cam.yaw += 0.6; });
    await T.frames(8);
    await T.shot('systrar_3_bar');
    await T.tap('KeyE');
    await T.sleep(700);
    await T.shot('systrar_3_bar_bought');
    // The bottle in his left hand, close: from his left front, then walking (the chase camera).
    await T.sleep(1500);
    await T.ev(() => {
      const g = __game, p = g.player, a = p.yaw + 0.9;
      g.cam.cutTo({ x: p.x + Math.sin(a) * 2.4, y: p.y + 1.5, z: p.z + Math.cos(a) * 2.4 }, { x: p.x, y: p.y + 1.1, z: p.z });
    });
    await T.frames(10);
    await T.shot('systrar_4_bottle_close');
    await T.ev(() => { const g = __game; g.cam.release(); g.cam.yaw = g.player.yaw + Math.PI * 0.35; g.cam.snapNext = true; });
    await T.frames(10);
    await T.shot('systrar_4_bottle_side');
    await atSpot(T, 'whiskySuper', 0);
    await T.frames(8);
    await T.shot('systrar_5_super');
    await atSpot(T, 'balkongKorg', 2.5);
    await T.frames(8);
    await T.shot('systrar_6_under');
    await atSpot(T, 'balkongKorg', 0);
    await T.frames(8);
    await T.tap('KeyE');
    await T.sleep(900);
    await T.shot('systrar_7_down1');
    await T.until(() => __game.sisters.bottle.visible, 8000);
    await T.shot('systrar_7_down2');
    await T.sleep(1300);
    await T.shot('systrar_7_up');
    await T.ev(() => { __game.autoDialog = false; });
    await T.until(() => document.querySelector('#dialog').classList.contains('show'), 8000);
    for (let i = 0; i < 3; i++) {
      await T.sleep(900);
      await T.shot(`systrar_8_deliver${i}`);
      await T.tap('Space');
      await T.frames(2);
    }
    await T.ev(() => { __game.autoDialog = true; });
    await T.until(() => __game.sisters.phase === 'done' && !__game.inDialog, 30000);
    await T.frames(10);
    await T.shot('systrar_9_after');
    // Siv with her glass and the bottle, close from the patio.
    await T.ev(() => { const g = __game, n = g.npc('siv'); g.cam.cutTo({ x: n.x + 1.2, y: n.y + 1.0, z: n.z + 3.2 }, { x: n.x, y: n.y + 1.2, z: n.z }); });
    await T.frames(10);
    await T.shot('systrar_9_siv');
    await T.ev(() => { const g = __game; g.cam.release(); g.cam.snapNext = true; });
    await stand(T, -23, 20, Math.PI);
    await T.frames(10);
    await stand(T, -12, 4, Math.PI + 0.4);
    await T.frames(12);
    await T.shot('systrar_10_wave_deck');
    await stand(T, -36, -8, Math.PI * 0.8);
    await T.frames(12);
    await T.shot('systrar_11_street');
  },
};
