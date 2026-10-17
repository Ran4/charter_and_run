// Poolbaren öppnar – svenskt kaffe ger fart (free roam, DESIGN §10.44; feature 84): kaffe, kaffestorch.
//   kaffe:      before friskoteket is done (index 6) BAR PISCINA is shut: no bartender, no prompt, the
//               sprint 8.8. After it (index 7) the bartender stands behind the counter by the percolator;
//               at the counter's north end the prompt "Köp svenskt kaffe (40 pta)"; E with 0 pta: his
//               head shaken, "¡No, señor!" and "Jag har bara kronor…", nothing paid. With 100 pta: −40,
//               "¡Gracias, señor!", the cup in Stig's hand, "Äntligen riktigt bryggkaffe.", the box
//               SVENSKT KAFFE · SPRINT +20 % · 0:30 under the meter, the sprint 10.56 m/s (8.8 × 1.2) and
//               the walk unchanged; E again is "Påtår": the 30 s again, no more speed. The coffee goes
//               cold after 30 s (box and cup gone, sprint 8.8). Never in a pursuit, never in Eslövloppet
//               (no factor, the coffee ends at its start). A mission start ends it at once (no box, no
//               cup, no prompt; the sprint 8.8 in the mission). At index 8 Berra at the bar (the bodega's
//               giver) raises his glass: "Ska du ha?" / "Nej tack, jag tål inte starksprit." / "Nej, vem
//               fan gör det?", not again within 120 s; at the coffee's spot E buys (not the giver's talk);
//               the G17 toaster at the counter's south end keeps its own E.
//   kaffestorch: with the cup, E at Fru Storch on the beach: her "Finns det svenskt kaffe på hotellet?",
//               his "Ja." with the cup held out, the cup in her hands, 50 pta and the toast, the coffee
//               over; without coffee no prompt there. Then calibrate's walker runs from the counter to her
//               with the coffee (KAFFE_RUNS, default 3): every run there with the cup still warm, and
//               the walker's median T_ref against the house rule's on-foot timer (ceil(1.25 × T_ref +
//               0.5)), which must not be above the coffee's 30 s (DESIGN §8 "Timers and difficulty").
import { check } from '../lib.mjs';
import { installAutopilot } from './calibrate.mjs';

const PI = Math.PI;

// Spies: every line said (game.say) and every toast (hud.toast).
async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js');
    window.__said = []; window.__toasts = [];
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.key || 'x', text, +g.time.toFixed(2)]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text); return toast(text, ...a); };
    window.__hud = hud;
  });
}
const said = (T) => T.ev(() => window.__said.map(([w, s]) => `${w}: ${s}`));
const clearSaid = (T) => T.ev(() => { window.__said.length = 0; window.__toasts.length = 0; });
// Stig at the coffee's spot facing the counter, the camera behind him.
async function atBar(T) {
  await T.ev(() => {
    const g = __game, l = window.__lm('poolbarKaffe');
    if (g.playerCar) g.exitCar(true);
    g.player.state = 'normal';
    g.player.teleport(l.x, l.z, l.yaw);
    g.player.vx = g.player.vz = 0;
    g.cam.yaw = l.yaw; g.cam.snapNext = true;
  });
  await T.frames(8);
}
const st = (T) => T.ev(() => {
  const g = __game, B = g.bar, p = g.player, n = g.npc('camarero'), it = g.nearestInteractable(), box = document.getElementById('kaffe');
  return {
    t: +B.t.toFixed(2), k: B.sprintK(), cup: p.anim.cupHeld, coins: g.coins, ms: g.missions.state, idx: g.missions.index,
    near: it?.type === 'it' ? it.it.id : it?.type || null, prompt: window.__hud?._prompt || '',
    box: box.classList.contains('show') ? box.textContent : null, low: box.classList.contains('low'),
    barman: n && { st: n.state, vis: n.root.visible, x: +n.x.toFixed(2), z: +n.z.toFixed(2), cup: n.anim.cupHeld, posed: g.npcPosed('camarero') },
    scene: B.scene?.kind || null, last: B.last, ended: B.ended, bought: B.bought, refills: B.refills, refused: B.refused,
  };
});
// Hold W (and Shift) for `ms` facing `yaw`: the highest wished-for and real speeds on the ground.
async function run(T, yaw, ms, sprint = true) {
  await T.ev((yaw) => {
    const g = __game, r = (window.__run = { wish: 0, v: 0 });
    g.cam.yaw = yaw; g.player.yaw = yaw;
    window.__runFn && g.offFrame(window.__runFn);
    window.__runFn = () => { const p = g.player; if (!p.onGround) return; r.wish = Math.max(r.wish, Math.hypot(p.wishX, p.wishZ)); r.v = Math.max(r.v, Math.hypot(p.vx, p.vz)); };
    g.onFrame(window.__runFn);
  }, yaw);
  await T.hold(sprint ? ['ShiftLeft', 'KeyW'] : ['KeyW'], ms);
  return T.ev(() => { __game.offFrame(window.__runFn); window.__runFn = null; const r = window.__run; return { wish: +r.wish.toFixed(2), v: +r.v.toFixed(2) }; });
}
// An open stretch of the pool deck south of the bar, running west.
async function toDeck(T) {
  await T.ev(() => { const g = __game, y = -Math.PI / 2; if (g.playerCar) g.exitCar(true); g.player.teleport(14, 28.5, y); g.player.vx = g.player.vz = 0; g.cam.yaw = y; g.cam.snapNext = true; });
  await T.frames(6);
}

export const SCENARIOS = {
  async kaffe(T) {
    // 0. Before friskoteket is done: the bar shut, nobody behind it, no prompt, the sprint as before.
    await T.fresh('&mission=6');
    await spies(T);
    await atBar(T);
    let s = await st(T);
    T.log('index 6', JSON.stringify(s));
    check(s.barman && s.barman.st === 'hidden' && !s.barman.vis, `no bartender before friskoteket (${JSON.stringify(s.barman)})`);
    check(s.near !== 'kaffe' && !/kaffe/i.test(s.prompt), `no coffee prompt (${s.near}, ${s.prompt})`);
    await T.shot('kaffe_stangd');
    await toDeck(T);
    let r = await run(T, -PI / 2, 900);
    T.log('sprint before', JSON.stringify(r));
    check(Math.abs(r.wish - 8.8) < 0.01, `the sprint is 8.8 (${r.wish})`);

    // 1. After it: the bartender behind the counter by the percolator, the prompt at the north end.
    await T.fresh('&mission=7');
    await spies(T);
    await atBar(T);
    s = await st(T);
    const home = await T.L('camarero');
    T.log('index 7', JSON.stringify(s), JSON.stringify(home));
    check(s.barman.st === 'normal' && s.barman.vis && Math.hypot(s.barman.x - home.x, s.barman.z - home.z) < 0.3, `the bartender at his place (${JSON.stringify(s.barman)})`);
    check(s.near === 'kaffe' && s.prompt.includes('Köp svenskt kaffe (40 pta)'), `the prompt "Köp svenskt kaffe (40 pta)" (${s.near}, ${s.prompt})`);
    const solid = await T.ev(async () => { const C = await import('/src/world/collision.js'), n = __game.npc('camarero'); return C.queryBlocks(n.x - 0.36, n.z - 0.36, n.x + 0.36, n.z + 0.36, []).filter((b) => b.top > 1 && C.circleVsBlock(n.x, n.z, 0.36, b, {})).map((b) => b.kind); });
    check(!solid.length, `the bartender stands in the aisle, in no solid (${solid})`);
    await T.ev(() => { const g = __game; g.cam.cutTo({ x: 13.5, y: 2.2, z: 4.5 }, { x: 18.6, y: 1.3, z: 9.8 }); });
    await T.frames(20);
    await T.shot('kaffe_oppen');
    await T.ev(() => __game.cam.release());
    await atBar(T);

    // 2. E with an empty purse: the head shaken, his answer, nothing paid and no coffee.
    await T.ev(() => { __game.coins = 0; });
    await T.tap('KeyE');
    await T.sleep(250);
    s = await st(T);
    const shake = await T.ev(() => Math.abs(__game.npc('camarero').anim.look));
    await T.shot('kaffe_nej');
    await T.until(() => !__game.bar.scene, 8000);
    let lines = await said(T);
    T.log('short', JSON.stringify(s), JSON.stringify(lines));
    check(s.last?.kind === 'short' && s.refused === 1 && s.t === 0 && s.coins === 0, `refused, nothing paid (${JSON.stringify(s.last)})`);
    check(lines.includes('camarero: ¡No, señor!') && lines.includes('stig: Jag har bara kronor…'), `"¡No, señor!" and "Jag har bara kronor…" (${lines})`);
    check(shake > 0.05 || s.barman.posed, `the bartender shakes his head (${shake})`);
    s = await st(T);
    check(!s.scene && !s.barman.posed && s.near === 'kaffe', `over: the prompt is back (${JSON.stringify(s)})`);

    // 3. With 100 pta: −40, the cup handed over, his line, the box and the sprint.
    await clearSaid(T);
    await T.ev(() => { const g = __game; g.coins = 100; });
    await atBar(T);
    await T.tap('KeyE');
    await T.sleep(150);
    s = await st(T);
    T.log('handing', JSON.stringify(s.barman));
    check(s.barman.cup === true && s.coins === 60, `the bartender holds the cup out, 60 pta left (${JSON.stringify(s)})`);
    await T.until(() => window.__said.some(([w]) => w === 'stig'), 6000);
    await T.frames(3);
    s = await st(T);
    await T.shot('kaffe_kopp');
    lines = await said(T);
    T.log('bought', JSON.stringify(s), JSON.stringify(lines));
    check(s.last?.kind === 'buy' && !s.last.refill && s.bought === 1, `bought (${JSON.stringify(s.last)})`);
    check(s.cup === 'low' && !s.barman.cup, `the cup in Stig's hand (${s.cup}, ${s.barman.cup})`);
    check(s.t > 28.5 && s.t <= 30, `30 s of coffee (${s.t})`);
    check(s.box && /SVENSKT KAFFE · SPRINT \+20 % · 0:(30|29)/.test(s.box), `the box (${s.box})`);
    check(lines.includes('camarero: ¡Gracias, señor!') && lines.includes('stig: Äntligen riktigt bryggkaffe.'), `the lines (${lines})`);
    await T.sleep(1200);
    await T.ev(() => { const g = __game, p = g.player; g.cam.cutTo({ x: 18.9, y: 1.95, z: 7.7 }, { x: p.x, y: 1.45, z: p.z }); });
    await T.frames(12);
    await T.shot('kaffe_bryggkaffe');
    await T.ev(() => __game.cam.release());
    await T.until(() => !__game.bar.scene, 8000);
    s = await st(T);
    check(!s.scene, `the purchase is over (${s.scene})`);
    await toDeck(T);
    r = await run(T, -PI / 2, 1100);
    T.log('sprint with coffee', JSON.stringify(r));
    check(Math.abs(r.wish - 8.8 * 1.2) < 0.01 && r.v > 10.4, `the sprint is 10.56 (${JSON.stringify(r)})`);
    await T.shot('kaffe_sprint');
    await toDeck(T);
    r = await run(T, -PI / 2, 700, false);
    check(Math.abs(r.wish - 5.4) < 0.01, `the walk is 5.4 (${r.wish})`);
    s = await st(T);
    check(s.cup === 'low', `running with the cup (${s.cup})`);

    // 4. A refill: "Påtår", the 30 s again, no more speed.
    await T.ev(() => { __game.bar.t = 12; });
    await atBar(T);
    s = await st(T);
    check(s.prompt.includes('Påtår (40 pta)'), `the prompt "Påtår (40 pta)" (${s.prompt})`);
    await clearSaid(T);
    await T.tap('KeyE');
    await T.until(() => window.__said.some(([w]) => w === 'stig'), 6000);
    await T.frames(3);
    s = await st(T);
    lines = await said(T);
    T.log('refill', JSON.stringify(s), JSON.stringify(lines));
    check(s.last.refill && s.refills === 1 && s.coins === 20 && s.t > 28.5, `a refill: 20 pta left, 30 s again (${JSON.stringify(s)})`);
    check(lines.includes('stig: Påtår. Precis som hemma.'), `"Påtår. Precis som hemma." (${lines})`);
    await T.until(() => !__game.bar.scene, 8000);
    await toDeck(T);
    r = await run(T, -PI / 2, 900);
    check(Math.abs(r.wish - 10.56) < 0.01, `still 10.56, no more (${r.wish})`);

    // 5. Cold: the last seconds pulse, then box and cup gone, the sprint 8.8.
    await T.ev(() => { __game.bar.t = 4; });
    await T.frames(4);
    s = await st(T);
    check(s.low && /0:04/.test(s.box), `the last seconds pulse (${s.box}, ${s.low})`);
    await T.shot('kaffe_sista');
    await T.until(() => __game.bar.t === 0, 9000);
    await T.frames(3);
    s = await st(T);
    T.log('cold', JSON.stringify(s));
    check(s.t === 0 && s.ended?.why === 'cold' && !s.box && !s.cup && s.k === 1, `cold: no box, no cup, the factor 1 (${JSON.stringify(s)})`);
    await toDeck(T);
    r = await run(T, -PI / 2, 900);
    check(Math.abs(r.wish - 8.8) < 0.01, `the sprint is 8.8 again (${r.wish})`);

    // 6. Never in a pursuit; Eslövloppet: no factor, and its start ends the coffee.
    await T.ev(() => { const g = __game; g.coins = 200; g.shame.v = 100; g.shame.startPursuit(); });
    await atBar(T);
    s = await st(T);
    check(s.near !== 'kaffe', `no coffee in a pursuit (${s.near})`);
    await T.ev(() => { const g = __game; g.shame.endPursuit(false); g.shame.clear(); });
    await T.frames(4);
    const race = await T.ev(() => {
      const g = __game, B = g.bar, e = g.eslov, was = e.race;
      B.t = 20;
      e.race = { fake: true };
      const k = B.sprintK();
      B.update(0.016);
      const out = { k, t: B.t, why: B.ended?.why };
      e.race = was;
      return out;
    });
    T.log('race', JSON.stringify(race));
    check(race.k === 1 && race.t === 0 && race.why === 'race', `Eslövloppet: no factor, the coffee ends (${JSON.stringify(race)})`);

    // 7. A mission start ends it at once; in the mission the sprint is 8.8 and there is no prompt.
    await atBar(T);
    await T.tap('KeyE');
    await T.until(() => __game.bar.t > 25, 4000);
    await T.until(() => !__game.bar.scene, 8000);
    await T.startMission();
    s = await st(T);
    T.log('mission', JSON.stringify(s));
    check(s.ms === 'running' && s.t === 0 && s.ended?.why === 'mission' && !s.box && !s.cup && s.k === 1, `a mission start ends it (${JSON.stringify(s)})`);
    await atBar(T);
    s = await st(T);
    check(s.near !== 'kaffe' && s.barman.vis, `no prompt in the mission, the bartender still there (${s.near})`);
    await toDeck(T);
    r = await run(T, -PI / 2, 900);
    check(Math.abs(r.wish - 8.8) < 0.01, `the sprint in the mission is 8.8 (${r.wish})`);

    // 8. Index 8: Berra (the bodega's giver) at the bar raises his glass, the men's room plays once.
    await T.fresh('&mission=8');
    await spies(T);
    await T.ev(() => { __game.coins = 200; });
    await atBar(T);
    s = await st(T);
    const giver = await T.ev(() => { const g = __game, b = g.npc('berra'), p = g.player; return { d: +Math.hypot(b.x - p.x, b.z - p.z).toFixed(2), giver: g.missions.current.giver }; });
    T.log('index 8', JSON.stringify(s), JSON.stringify(giver));
    check(s.near === 'kaffe' && giver.giver === 'berra', `at the spot E buys, not the giver's talk (${s.near}, ${JSON.stringify(giver)})`);
    await T.tap('KeyE');
    await T.until(() => __game.npc('berra').anim.cupHeld === true, 6000);
    await T.sleep(200);
    await T.ev(() => { const g = __game; g.cam.cutTo({ x: 12.4, y: 1.9, z: 10.9 }, { x: 16.6, y: 1.45, z: 10.2 }); });
    await T.frames(12);
    await T.shot('kaffe_skadu');
    await T.until(() => window.__said.some(([w, s]) => w === 'stig' && /starksprit/.test(s)), 6000);
    await T.sleep(300);
    await T.shot('kaffe_starksprit');
    await T.until(() => window.__said.some(([w, s]) => /vem fan/.test(s)), 6000);
    await T.sleep(300);
    await T.shot('kaffe_vemfan');
    await T.ev(() => __game.cam.release());
    await T.until(() => !__game.bar.scene, 8000);
    await T.frames(3);
    lines = await said(T);
    s = await st(T);
    const berra = await T.ev(() => { const g = __game, b = g.npc('berra'); return { cup: b.anim.cupHeld, posed: g.npcPosed('berra'), talks: g.bar.berraTalks }; });
    T.log('berra', JSON.stringify(lines), JSON.stringify(berra));
    const want = ['camarero: ¡Gracias, señor!', 'stig: Äntligen riktigt bryggkaffe.', 'berra: Ska du ha?', 'stig: Nej tack, jag tål inte starksprit.', 'berra: Nej, vem fan gör det?'];
    const order = want.map((w) => lines.indexOf(w));
    check(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), `the lines in order (${lines})`);
    check(!berra.cup && !berra.posed && berra.talks === 1 && !s.scene, `the glass down, Berra free again (${JSON.stringify(berra)})`);
    // A refill at once: no men's room again.
    await clearSaid(T);
    await atBar(T);
    await T.tap('KeyE');
    await T.until(() => __game.bar.refills === 1 && !__game.bar.scene, 9000);
    lines = await said(T);
    s = await st(T);
    check(s.refills === 1 && !lines.some((l) => /Ska du ha/.test(l)) && !s.last.berra, `not again within 120 s (${lines})`);

    // 9. The G17 toaster at the counter's south end keeps its E.
    const toast = await T.ev(() => {
      const g = __game, t = window.__lm('brodrost_poolbar'), c = g.collectibles.brodrostar.find((q) => q.id === 'poolbar');
      g.player.teleport(t.x + Math.sin(t.yaw) * 1.0, t.z + Math.cos(t.yaw) * 1.0, t.yaw + Math.PI);
      return { x: t.x, z: t.z, alive: c?.alive };
    });
    await T.frames(6);
    s = await st(T);
    T.log('toaster', JSON.stringify(toast), s.near);
    check(s.near === 'brodrost:poolbar', `the toaster's E at its front (${s.near})`);
  },

  async kaffestorch(T) {
    await T.fresh('&mission=9');
    await spies(T);
    await T.ev(() => { __game.coins = 0; __game.addCoins(400); });
    // 1. Without coffee: no prompt at Fru Storch.
    const fru = await T.ev(() => { const n = __game.npc('fruStorch'); return { x: n.x, z: n.z, st: n.state }; });
    await T.ev((f) => { const g = __game; g.player.teleport(f.x + 1.6, f.z - 0.3, -Math.PI / 2); g.cam.yaw = -Math.PI / 2; g.cam.snapNext = true; }, fru);
    await T.frames(8);
    let s = await st(T);
    T.log('no coffee', JSON.stringify(fru), s.near);
    check(s.near !== 'kaffe:storch', `no "Ge fru Storch kaffet" without coffee (${s.near})`);

    // 2. With the cup: her question, his "Ja.", the cup handed over, 50 pta, the coffee over.
    await T.ev(() => { const g = __game; g.bar.t = 18; g.bar.stigCup = 'low'; });
    await T.frames(4);
    s = await st(T);
    check(s.near === 'kaffe:storch' && /Ge fru Storch kaffet/.test(s.prompt), `the prompt "Ge fru Storch kaffet" (${s.near}, ${s.prompt})`);
    const c0 = s.coins;
    await T.tap('KeyE');
    await T.sleep(1500);
    s = await st(T);
    check(s.t > 17 && s.t <= 18, `the countdown stands still while he gives it (${s.t})`);
    await T.until(() => __game.player.anim.cupHeld === true, 4000);
    await T.ev(() => { const g = __game, p = g.player, n = g.npc('fruStorch'); const mx = (p.x + n.x) / 2, mz = (p.z + n.z) / 2; g.cam.cutTo({ x: mx - 0.6, y: 1.9, z: mz - 3.6 }, { x: mx, y: 1.4, z: mz }); });
    await T.frames(6);
    await T.shot('kaffe_ja');
    await T.until(() => __game.bar.delivered === 1, 4000);
    await T.sleep(900);
    await T.shot('kaffe_varmt');
    await T.ev(() => __game.cam.release());
    await T.until(() => !__game.bar.scene, 6000);
    s = await st(T);
    const lines = await said(T), toasts = await T.ev(() => window.__toasts);
    const her = await T.ev(() => { const g = __game, n = g.npc('fruStorch'); return { cup: n.anim.cupHeld, posed: g.npcPosed('fruStorch') }; });
    T.log('given', JSON.stringify(s), JSON.stringify(lines), JSON.stringify(toasts), JSON.stringify(her));
    const want = ['fruStorch: Finns det svenskt kaffe på hotellet?', 'stig: Ja.', 'fruStorch: Tack, snälla du! Och det är fortfarande varmt.'];
    const order = want.map((w) => lines.indexOf(w));
    check(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), `the lines in order (${lines})`);
    check(s.coins === c0 + 50 && toasts.some((t) => /Fru Storch betalar kaffet: 50 pta/.test(t)), `50 pta and the toast (${s.coins - c0}, ${toasts})`);
    check(s.t === 0 && s.ended?.why === 'given' && !s.cup && !s.box && s.k === 1, `the coffee went with the cup (${JSON.stringify(s)})`);
    check(her.cup === 'low' && !her.posed, `she holds the cup, free again (${JSON.stringify(her)})`);
    await T.until(() => !__game.npc('fruStorch').anim.cupHeld, 25000).catch(() => {});
    const later = await T.ev(() => __game.npc('fruStorch').anim.cupHeld);
    check(!later, `her cup gone after a while (${later})`);

    // 3. Calibrate's walker from the counter to her with the coffee: every run there with the cup warm.
    await T.ev(installAutopilot);
    const runs = [], N = +(process.env.KAFFE_RUNS || 3);
    for (let k = 0; k < N; k++) {
      await T.ev(() => { const g = __game; g.bar.t = 0; g.coins = 400; });
      await atBar(T);
      await T.tap('KeyE');
      await T.until(() => __game.bar.t > 0, 4000);
      const t0 = await T.ev(() => __game.time);
      await T.ev(() => { const g = __game, n = g.npc('fruStorch'), p = g.player; const d = Math.hypot(n.x - p.x, n.z - p.z); window.__ap.walk({ kind: 'point', x: n.x - ((n.x - p.x) / d) * 1.4, z: n.z - ((n.z - p.z) / d) * 1.4, r: 0.6 }); });
      const ok = await T.until(() => __game.nearestInteractable()?.it?.id === 'kaffe:storch' || __game.bar.t <= 0, 60000).then(() => true, () => false);
      const r = await T.ev((t0) => { const g = __game, wr = window.__ap.walkResult(); window.__ap.foot = null; return { t: +(g.time - t0).toFixed(2), left: +g.bar.t.toFixed(2), ok: g.nearestInteractable()?.it?.id === 'kaffe:storch', falls: wr?.falls ?? null, walked: wr?.walked ?? null }; }, t0);
      runs.push(r);
      T.log('run', k, JSON.stringify(r), ok);
      if (r.ok) { await T.tap('KeyE'); await T.until(() => !__game.bar.scene, 10000); }
    }
    // DESIGN §8: on foot T_ref = the run's median + 0.5 s per target, timer = ceil(1.25 × T_ref).
    const ts = runs.map((r) => r.t).sort((a, b) => a - b), med = ts.length % 2 ? ts[(ts.length - 1) / 2] : (ts[ts.length / 2 - 1] + ts[ts.length / 2]) / 2;
    const tRef = med + 0.5, timer = Math.ceil(1.25 * tRef);
    T.log(`CAL kaffeStorch | the cup from BAR PISCINA to Fru Storch on the beach (on foot, the coffee's sprint) | walker, from the cup in his hand to her E | T_ref ${tRef.toFixed(2)} | timer ${timer} (the coffee's 30 s) | median of ${runs.length} runs + 0.5 s × 1: ${runs.map((r) => `${r.t.toFixed(2)}${r.falls ? '*' : ''}`).join(' ')} s`);
    check(runs.every((r) => r.ok && r.left > 0), `every run there with the cup warm (${JSON.stringify(runs)})`);
    check(timer <= 30, `the house rule's on-foot timer ${timer} ≤ the coffee's 30 s`);
  },
};
