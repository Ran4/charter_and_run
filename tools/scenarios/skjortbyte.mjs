// Skjortbytet (free roam, DESIGN §7.2; feature 36): skjortbyte, garderob.
//   skjortbyte: at index 6 (free roam, the hawaii shirt): no prompt at room 107's wardrobe without a
//               pursuit. In a pursuit on foot: "Byt till kostymen" (priority over everything), a
//               friend marker on the map, the shirt taunt among the shouts. E: frozen `secs` s, the
//               wardrobe open with the suit, Stig's line; then the suit (not saved), no pursuit, no
//               fine, the banner, its own cooldown; the officer (40 m off: from an end of the walk out
//               of view) walks onto the patio, "¿Dónde está el de la camisa?", Stig's "Buenas tardes.",
//               on past him and out of sight, Ole's radio. Saved as hawaii; a new pursuit in the suit:
//               no hideout, no shirt taunt. Back: "Byt till hawaiiskjortan", "Är den inte lite
//               skrikig?", the shirt, Ole's "sterke farger". The cooldown. Close behind (the officer on
//               the walk 6 m off): busted in the wardrobe, still in the shirt, the doors shut. Under
//               SunTrip-butiken's dotted shirt: no hideout. 20 m behind with a clear line: he makes
//               it and the officer walks past from where he was. A mission start puts the shirt back
//               on. Before buss17 (index 5, the suit): no prompt either way. The flight level: inert.
//   garderob:   shots: the wardrobe shut, open with the suit and Stig changing, open with the shirt,
//               the officer on the patio and Stig in the suit seen from the room, Stig back in the
//               shirt.
import { check } from '../lib.mjs';

const ID = 'hideout:rum107Garderob', BACK = 'garderob:rum107Garderob';
const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? (it.type === 'it' ? it.it.id : it.type) : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
const toasts = (T) => T.ev(() => [...document.querySelectorAll('#toasts .toast')].map((t) => t.textContent));
const banner = (T) => T.ev(() => document.getElementById('banner').classList.contains('show') ? document.querySelector('.banner-main').textContent : '');
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      window.__said.push([t === g.player ? 'stig' : t?.key || '?', text, +g.time.toFixed(2)]);
      return o(t, text, secs);
    };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.map((s) => `${s[0]}: ${s[1]}`));
const wardrobe = (T) => T.ev(() => {
  const w = window.__wardrobe;
  return { open: w.open.visible, hang: Object.entries(w.hang).filter(([, m]) => m.visible).map(([k]) => k).join() };
});
const state = (T) => T.ev(() => {
  const g = __game, s = g.shame, o = s.officer, c = s.closet;
  return { outfit: g.player.outfit, island: g.islandOutfit, pursuit: s.pursuit, v: +s.v.toFixed(1), coins: g.coins, t: +c.t.toFixed(1),
    frozen: +g.frozenT.toFixed(2), swap: !!c.swap, walk: c.walk?.phase || null, last: c.last?.kind || null,
    officer: o && o.state !== 'hidden' ? [+o.x.toFixed(1), +o.z.toFixed(1)] : null };
});
// Stig on landmark `name`, facing its yaw, the camera behind him.
async function at(T, name, cam = 0) {
  await T.ev((name, cam) => {
    const g = __game, l = window.__lm(name), p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.teleport(l.x, l.z, l.yaw);
    p.vx = p.vz = 0;
    g.cam.yaw = l.yaw + cam; g.cam.snapNext = true;
  }, name, cam);
  await T.frames(8);
}
// A pursuit on foot with the Land Rovers parked far off; the officer at (x, z) (null: where he spawns).
async function pursuit(T, x, z) {
  await T.ev(() => {
    const s = __game.shame;
    s.v = 0; s.add(100);
    s.pursuers.forEach((c, k) => { c.ai = null; c.place(-250 + k * 12, -250, 0); c.vx = c.vz = 0; });
    s.forced = true;
  });
  await T.frames(4);
  if (x != null) await T.ev((x, z) => { const s = __game.shame; s.ensureOfficer(x, z); }, x, z);
  await T.frames(2);
}
const endPursuit = (T) => T.ev(() => { const s = __game.shame; if (s.pursuit) { s.v = 0; s.endPursuit(true); } s.forced = false; });
const setup = async (T, q) => {
  await T.fresh(q);
  await T.ev(async () => { window.__wardrobe = (await import('/src/world/blocks/hotels.js')).WARDROBE; });
  await resetSaid(T);
};

export const SCENARIOS = {
  async skjortbyte(T) {
    await setup(T, '&mission=6');
    const cfg = await T.ev(() => JSON.parse(JSON.stringify(__game.shame.closet.cfg)));
    let r = await state(T);
    T.log('start', JSON.stringify(r));
    check(r.outfit === 'hawaii' && r.island === 'hawaii' && await T.ev(() => __game.missions.state === 'idle'), 'free roam at index 6 in the shirt');
    check(JSON.stringify(await wardrobe(T)) === '{"open":false,"hang":""}', 'the wardrobe shut');

    // 0. On foot a Land Rover meeting a wall is no ram (main.onCarImpact): until feature 36 its wall
    // hits counted as rams on him, and two inside 14 s busted him from afar.
    await T.ev(() => {
      const g = __game, s = g.shame, a = g.approachSpot('marknad');
      g.debugWarp(a.x, a.z, a.yaw);
      window.__rams = 0;
      const o = s.onRam.bind(s); s.onRam = (car, imp) => { window.__rams++; o(car, imp); };
      s.v = 0; s.add(100); s.forced = true;
      s.caughtT = 999;   // the officer may not end it
    });
    await T.sleep(9000);
    r = await T.ev(() => { const s = __game.shame; return { rams: window.__rams, ramT: s.ramT, pursuit: s.pursuit, cars: s.pursuers.map((c) => +Math.hypot(c.x - __game.player.x, c.z - __game.player.z).toFixed(0)) }; });
    T.log('on foot, Land Rovers chasing', JSON.stringify(r));
    check(r.rams === 0 && r.ramT === 0 && r.pursuit, 'on foot: no rams from the Land Rovers\' wall hits');
    await T.ev(() => { const s = __game.shame; s.caughtT = 0; s.clear(); window.__said = []; });

    // 1. No pursuit: no prompt.
    await at(T, 'rum107Garderob');
    r = { near: await near(T) };
    T.log('no pursuit', JSON.stringify(r));
    check(r.near !== ID && r.near !== BACK, 'no prompt at the wardrobe without a pursuit');

    // 2. A pursuit, the officer 40 m off on the pool deck: the prompt, the marker, the shirt taunt.
    const coins0 = await T.ev(() => { __game.addCoins(2000 - __game.coins); return __game.coins; });
    await pursuit(T, -18, 26);
    r = { near: await near(T), prompt: await prompt(T),
      marker: await T.ev(() => { const l = window.__lm('rum107Garderob'); return __game.mapMarkers().some((m) => m.type === 'friend' && Math.hypot(m.x - l.x, m.z - l.z) < 0.1); }),
      taunts: await T.ev(() => __game.shame.closet.taunts(__game.shame.cfg.taunts)) };
    T.log('pursuit', JSON.stringify(r));
    check(r.near === ID && /Byt till kostymen/.test(r.prompt), 'the hideout prompt in a pursuit');
    check(r.marker, 'a friend marker at the wardrobe on the map');
    check(r.taunts.includes(cfg.taunt), 'the shirt taunt while the shirt shows');

    // 3. E: frozen, the wardrobe open with the suit, his line.
    await T.tap('KeyE');
    await T.frames(3);
    r = { ...(await state(T)), w: await wardrobe(T), said: await said(T), yaw: await T.ev(() => +__game.player.yaw.toFixed(3)) };
    T.log('changing', JSON.stringify(r));
    check(r.swap && r.frozen > 2 && r.pursuit && r.w.open && r.w.hang === 'kostym', 'changing: frozen, the wardrobe open with the suit, the pursuit on');
    check(r.said.includes(`stig: ${cfg.line}`), 'Stig: "De letar ju efter skjortan… inte efter mig."');
    check(Math.abs(r.yaw + Math.PI / 2) < 0.01, 'he faces the wardrobe');
    check(await near(T) !== ID, 'no second prompt while he changes');
    await T.until(() => __game.shame.closet.last?.kind === 'done', 5000);
    r = { ...(await state(T)), w: await wardrobe(T) };
    T.log('done', JSON.stringify(r));
    check(r.outfit === 'kostym' && r.island === 'hawaii' && !r.pursuit && r.v === 0 && r.coins === coins0 && r.t > 55, 'the suit (not saved), no pursuit, no fine, the cooldown');
    check(r.w.open && r.w.hang === 'hawaii', 'the shirt hangs in the wardrobe');
    check(r.officer && r.walk === 'come', 'the officer on his way');
    await T.until((b) => document.querySelector('.banner-main').textContent === b, 3000, cfg.banner[0].toUpperCase());
    await T.sleep(900);
    check(JSON.stringify(await wardrobe(T)) === '{"open":false,"hang":""}', 'the wardrobe shut after the change');

    // 4. The officer walks past: onto the patio, his line, Stig's, out of sight, Ole's radio.
    await T.until(() => __game.shame.closet.last?.kind === 'look', 15000);
    r = { ...(await state(T)), said: await said(T), look: await T.ev(() => { const g = __game, q = g.lmOffset('flamencoPatio', 0.5, -0.4), o = g.shame.officer; return +Math.hypot(o.x - q.x, o.z - q.z).toFixed(2); }) };
    T.log('look', JSON.stringify(r));
    check(r.walk === 'look' && r.look < 1 && r.said.includes(`guardiaOfficer: ${cfg.passBy.line}`), 'the officer on the patio: "¿Dónde está el de la camisa?"');
    r = await T.ev(() => ({ scene: __game.shame.closet.walk?.scene, dlg: __game.inDialog, cut: __game.inCutaway }));
    check(r.scene && r.dlg && r.cut, `Stig in the room: the scene from the patio (${JSON.stringify(r)})`);
    await T.until(() => __game.shame.closet.last?.kind === 'reply', 4000);
    check((await said(T)).includes(`stig: ${cfg.passBy.reply}`), 'Stig: "Buenas tardes."');
    await T.until(() => __game.shame.closet.walk?.phase === 'leave', 5000);
    r = await T.ev(() => ({ dlg: __game.inDialog, cut: __game.inCutaway, frozen: __game.frozenT }));
    check(!r.dlg && !r.cut, `the scene over when he walks on (${JSON.stringify(r)})`);
    check(await near(T) !== BACK, 'no back prompt while the officer is still about');
    await T.until(() => !__game.shame.closet.walk, 16000);
    r = { ...(await state(T)), toasts: await toasts(T) };
    T.log('gone', JSON.stringify(r));
    check(r.last === 'gone' && !r.officer && !r.pursuit, 'the officer walked on and out of sight');
    check(r.toasts.some((t) => t.includes(cfg.radio[1])), 'Ole on the radio: "Du kan ikke gå sånn her nede! …"');
    check((await said(T)).filter((s) => s.startsWith('guardiaOfficer') && !s.includes('¡')).length === 1, 'the officer said one line only after the change');

    // 5. Not saved: the save keeps the shirt.
    await T.ev(() => __game.save());
    r = await T.ev(() => JSON.parse(localStorage.getItem('charter-and-run-v1')).outfit);
    check(r === 'hawaii', `the save keeps the shirt (${r})`);

    // 6. A new pursuit in the suit: no hideout, no shirt taunt, no marker; then over.
    await pursuit(T, -18, 26);
    await at(T, 'rum107Garderob');
    r = { near: await near(T), taunts: await T.ev(() => __game.shame.closet.taunts(__game.shame.cfg.taunts)), markers: await T.ev(() => __game.shame.closet.markers().length) };
    T.log('suit pursuit', JSON.stringify(r));
    check(r.near !== ID && r.near !== BACK && !r.taunts.includes(cfg.taunt) && r.taunts.length === 4 && !r.markers, 'in the suit: no hideout, no back, no shirt taunt, no marker');
    await endPursuit(T);
    await T.frames(4);

    // 7. Back to the shirt.
    await T.ev(() => { window.__said = []; });
    r = { near: await near(T), prompt: await prompt(T) };
    T.log('back prompt', JSON.stringify(r));
    check(r.near === BACK && /Byt till hawaiiskjortan/.test(r.prompt), 'the back prompt in the suit, no pursuit');
    await T.tap('KeyE');
    await T.frames(3);
    r = { ...(await state(T)), w: await wardrobe(T), said: await said(T) };
    T.log('back', JSON.stringify(r));
    check(r.swap && r.frozen > 1 && r.w.hang === 'hawaii' && r.said.includes(`stig: ${cfg.back.line}`), 'back: frozen, the shirt in the wardrobe, "Är den inte lite skrikig?"');
    await T.until(() => __game.shame.closet.last?.kind === 'done', 4000);
    await T.sleep(1200);
    r = { ...(await state(T)), toasts: await toasts(T), w: await wardrobe(T) };
    T.log('back done', JSON.stringify(r));
    check(r.outfit === 'hawaii' && r.island === 'hawaii' && !r.w.open, 'back in the shirt, the wardrobe shut');
    check(r.toasts.some((t) => t.includes(cfg.back.radio[1])), 'Ole on the radio: "Du skal ha sterke farger, du som er mørk."');
    check(await near(T) !== BACK, 'no back prompt in the shirt');

    // 8. The cooldown: in the shirt again, but no hideout for `cooldown` s.
    await pursuit(T, -18, 26);
    r = { near: await near(T), t: await T.ev(() => __game.shame.closet.t) };
    T.log('cooldown', JSON.stringify(r));
    check(r.near !== ID && r.t > 0, 'no hideout inside its cooldown');
    check(await T.ev(() => __game.shame.hideoutT <= 0), 'the porter\'s cooldown untouched');
    await T.ev(() => { __game.shame.closet.t = 0; });
    await T.frames(2);
    check(await near(T) === ID, 'the hideout again after the cooldown');

    // 9. Close behind: the officer on the walk in front of the patio (about 6 m): busted in there.
    await T.ev(() => { const g = __game, q = g.lmOffset('flamencoPatio', 0.5, 1.6); g.shame.ensureOfficer(q.x, q.z); });
    const coins1 = await T.ev(() => __game.coins);
    await T.tap('KeyE');
    await T.until(() => __game.shame.closet.last?.kind === 'busted', 4000);
    await T.frames(3);
    r = { ...(await state(T)), w: await wardrobe(T), caught: await T.ev(() => __game.shame.caughtT > 0) };
    T.log('busted', JSON.stringify(r), 'fine', coins1 - r.coins);
    check(r.outfit === 'hawaii' && !r.pursuit && r.caught && !r.w.open && !r.swap && r.coins < coins1, 'caught while changing: busted, fined, still in the shirt, the doors shut');
    await T.until(() => __game.frozenT <= 0, 5000);

    // 10. Under SunTrip-butiken's dotted shirt the hawaii shirt does not show: no hideout.
    await T.ev(() => { const g = __game; g.shame.closet.t = 0; g.shame.caughtT = 0; g.shop.owned.add('skjorta'); g.shop.refresh(); });
    await T.frames(3);
    check(await T.ev(() => __game.shop.worn === 'skjorta' && __game.player.outfit === 'hawaii'), 'the dotted shirt on over the hawaii shirt');
    await pursuit(T, -18, 26);
    await at(T, 'rum107Garderob');
    r = { near: await near(T), taunts: await T.ev(() => __game.shame.closet.taunts(__game.shame.cfg.taunts)) };
    T.log('dotted', JSON.stringify(r));
    check(r.near !== ID && !r.taunts.includes(cfg.taunt), 'under the dotted shirt: no hideout, no shirt taunt');
    await endPursuit(T);
    await T.ev(() => { const g = __game; g.shop.owned.delete('skjorta'); g.shop.refresh(); });
    await T.frames(3);
    await pursuit(T, -18, 26);
    await at(T, 'rum107Garderob');
    check(await near(T) === ID, 'without it: the hideout again');

    // 11. About 21 m behind, coming from the pool deck: he makes it, and the officer walks on from
    // where he was (the walk's `from`).
    // Placed and E in the same frame: a frame or two of his run before E is a metre each.
    r = await T.ev(() => { const g = __game, s = g.shame, p = g.player; s.ensureOfficer(-20, 5); g.interact(); return +Math.hypot(s.officer.x - p.x, s.officer.z - p.z).toFixed(1); });
    T.log('officer at', r, 'm');
    await T.until(() => ['done', 'busted'].includes(__game.shame.closet.last?.kind), 5000);
    r = { ...(await state(T)), from: await T.ev(() => __game.shame.closet.walk?.from) };
    T.log('21 m', JSON.stringify(r));
    check(r.last === 'done' && r.outfit === 'kostym' && !r.pursuit && r.officer && r.walk === 'come', 'from 21 m behind he makes it; the officer comes on');
    const fromHim = await T.ev(() => { const o = __game.shame.officer, l = window.__lm('rum107Garderob'); return +Math.hypot(o.x - l.x, o.z - l.z).toFixed(1); });
    T.log('officer from', fromHim, 'm of the wardrobe');
    check(r.from === 'him' && fromHim < 12, 'he walks on from where he was (not from an end)');
    await T.until(() => __game.shame.closet.last?.kind === 'look', 12000);

    await T.until(() => __game.shame.closet.walk?.phase === 'leave', 8000);

    // 12. A mission start while the officer walks off puts the shirt back on and ends the walk.
    r = await state(T);
    check(r.outfit === 'kostym' && r.walk === 'leave' && r.officer, `still in the suit, the officer walking off (${JSON.stringify(r)})`);
    await T.startMission();
    r = await state(T);
    T.log('mission', JSON.stringify(r));
    check(r.outfit === 'hawaii' && !r.walk && !r.officer, 'a mission start: the shirt back on, the officer gone');
    check(await T.ev(() => __game.shame.closet.canHide() === false && __game.shame.closet.canBack() === false), 'no wardrobe in a mission');

    // 13. Before buss17 (index 5): in the suit he came in, a pursuit: neither prompt, no shirt taunt.
    await setup(T, '&mission=5');
    r = await state(T);
    check(r.outfit === 'kostym' && r.island === 'kostym', `index 5: the suit (${JSON.stringify(r)})`);
    await at(T, 'rum107Garderob');
    check(![ID, BACK].includes(await near(T)), 'index 5, no pursuit: no prompt');
    await pursuit(T, -18, 26);
    r = { near: await near(T), taunts: await T.ev(() => __game.shame.closet.taunts(__game.shame.cfg.taunts)) };
    T.log('index 5', JSON.stringify(r));
    check(r.near !== ID && r.near !== BACK && !r.taunts.includes(cfg.taunt), 'index 5 in a pursuit: no prompt, no shirt taunt');
    await endPursuit(T);

    // 14. The flight level: no wardrobe.
    await setup(T, '&mission=2');
    r = await T.ev(() => ({ cfg: !!__game.shame.closet.cfg, its: __game.interactables.filter((i) => /rum107Garderob/.test(i.id)).length }));
    T.log('flight', JSON.stringify(r));
    check(!r.cfg && !r.its, 'the flight level: no wardrobe hideout');
  },

  async garderob(T) {
    await setup(T, '&mission=6');
    // The wardrobe from the patio and from inside the room.
    await T.ev(() => { __game.cutTo({ at: 'rum107Cam', dist: 5.5, height: 2.1 }); });
    await T.frames(10);
    await T.shot('garderob_shut');
    await T.ev(() => __game.endCut());
    await at(T, 'rum107Garderob', Math.PI * 0.25);
    await T.shot('garderob_stig');
    await pursuit(T, -18, 26);
    await T.sleep(2700);   // the ¡GUARDIA CIVIL! banner goes by
    await T.ev(() => { const s = __game.shame; s.ensureOfficer(-18, 26); s.officer.trail.length = 0; });
    await T.tap('KeyE');
    await T.sleep(700);
    await T.shot('garderob_byte');
    await T.ev(() => { __game.cutTo({ at: 'rum107Cam', dist: 5.5, height: 2.1 }); });
    await T.frames(6);
    await T.shot('garderob_byte_patio');
    await T.ev(() => __game.endCut());
    await T.until(() => __game.shame.closet.last?.kind === 'done', 5000);
    await T.frames(2);
    await T.shot('garderob_klar');
    await T.until(() => __game.shame.closet.last?.kind === 'look', 15000);
    await T.sleep(500);
    await T.shot('garderob_tittar');
    await T.until(() => __game.shame.closet.last?.kind === 'reply', 4000);
    await T.sleep(300);
    await T.shot('garderob_buenas');
    await T.until(() => __game.shame.closet.walk?.phase === 'leave', 5000);
    await T.sleep(1500);
    await T.shot('garderob_forbi');
    await T.until(() => !__game.shame.closet.walk, 16000);
    await T.shot('garderob_radio');
    await T.ev(() => { __game.shame.closet.t = 0; });
    await at(T, 'rum107Garderob', Math.PI * 0.25);
    await T.tap('KeyE');
    await T.sleep(500);
    await T.shot('garderob_tillbaka');
    await T.until(() => __game.shame.closet.last?.kind === 'done', 4000);
    await T.sleep(1500);
    await T.shot('garderob_skjortan');
  },
};
