// Garderoben och bergsprängaren i rum 107 (free roam, DESIGN §10.36; feature 67): klader, kladshots.
//   klader:    at index 5 (free roam, the suit): "Byt kläder" at room 107's wardrobe with the suit and
//              the Arlanda coat in it. E: frozen, the coat on the hanger, the shot; then a white flash,
//              the coat (islandOutfit and the save), the suit on the hanger, "Det måste vara värmen.",
//              the doors shut, Stig turned to the shot, the chase camera back after `show` s. E again:
//              the suit and Ole's "Du kan ikke gå sånn her nede! …" on the radio. A mission start in
//              the coat: the story's suit at the talk, the coat back when the mission is off. At index
//              6 the hawaii shirt too (Stig's "skrikig?" and Ole's "sterke farger"), no Rio; in a
//              pursuit no "Byt kläder" (Skjortbytet's hideout in the shirt as before, none in the coat);
//              after the hideout the way back is Skjortbytet's. A reload keeps the pick. After the end
//              (index 13) the Rio jacket and Ole's "Og så Rio!", SunTrip-butiken's layer off over it.
//              A mission start mid-change: the change broken off, the doors shut, the shot let go.
//              The boombox: before the samba unlock "Bergsprängaren" and Ole's "Kvarts og digital.",
//              no tune, again after `gap` s; after it "Spela samba" (Ole's "Ja, det er fint! Samba!"),
//              "Stäng av sambaen" back to sol, and the next samba with "Hører du? Samba.". The flight
//              level: inert.
//   kladshots: the wardrobe open with each of the four on the hanger, Stig changing in the shot, Stig
//              in each outfit turned to the shot after the flash, the chase camera after it, Stig in
//              the coat on the patio and in the Rio jacket at the pool.
import { check } from '../lib.mjs';

const ID = 'rum107:garderob', HIDE = 'hideout:rum107Garderob', BACK = 'garderob:rum107Garderob';
const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? (it.type === 'it' ? it.it.id : it.type) : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
const toasts = (T) => T.ev(() => [...document.querySelectorAll('#toasts .toast')].map((t) => t.textContent));
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
const hang = (T) => T.ev(() => {
  const w = window.__wardrobe;
  return { open: w.open.visible, hang: Object.entries(w.hang).filter(([, m]) => m.visible).map(([k]) => k).join() };
});
const state = (T) => T.ev(() => {
  const g = __game, r = g.room107;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('charter-and-run-v1'))?.outfit ?? null; } catch (e) { /* none */ }
  return { outfit: g.player.outfit, island: g.islandOutfit, saved, swap: !!r.swap, frozen: +g.frozenT.toFixed(2),
    cine: !!g.cam.cine, last: r.last, list: r.outfits().join() };
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
const setup = async (T, q) => {
  await T.fresh(q);
  await T.ev(async () => { window.__wardrobe = (await import('/src/world/blocks/hotels.js')).WARDROBE; __game.day.run = false; });
  await resetSaid(T);
};
// E at the wardrobe and the change to its end (the shot let go).
async function change(T) {
  await T.tap('KeyE');
  await T.until(() => __game.room107.last?.done === true, 5000);
  await T.until(() => !__game.room107.swap, 5000);
  await T.frames(3);
}
const pursuit = async (T) => {
  await T.ev(() => {
    const s = __game.shame;
    s.v = 0; s.add(100);
    s.pursuers.forEach((c, k) => { c.ai = null; c.place(-250 + k * 12, -250, 0); c.vx = c.vz = 0; });
    s.forced = true;
    s.ensureOfficer(-18, 26);
  });
  await T.frames(4);
};
const endPursuit = (T) => T.ev(() => { const s = __game.shame; if (s.pursuit) { s.v = 0; s.endPursuit(true); } s.forced = false; s.hideOfficer(); });

export const SCENARIOS = {
  async klader(T) {
    await setup(T, '&mission=5');
    const cfg = await T.ev(() => JSON.parse(JSON.stringify(__game.room107.cfg)));
    const W = cfg.wardrobe;
    let r = await state(T);
    T.log('index 5', JSON.stringify(r));
    check(r.outfit === 'kostym' && r.island === 'kostym' && r.list === 'kostym,arlanda', 'index 5: the suit, the wardrobe holds the suit and the coat');

    // 1. The prompt; E: the coat on the hanger, frozen, the shot.
    await at(T, 'rum107Garderob');
    r = { near: await near(T), prompt: await prompt(T) };
    T.log('prompt', JSON.stringify(r));
    check(r.near === ID && /Byt kläder/.test(r.prompt), 'the wardrobe\'s prompt "Byt kläder"');
    await T.ev(() => __game.cam.yaw += 0.7);
    await T.tap('KeyE');
    await T.frames(2);
    r = { ...(await state(T)), w: await hang(T), yaw: await T.ev(() => +__game.player.yaw.toFixed(3)), near: await near(T) };
    T.log('changing', JSON.stringify(r));
    check(r.swap && r.frozen > W.secs && r.cine && r.w.open && r.w.hang === 'arlanda' && r.outfit === 'kostym', 'changing: frozen, the shot, the coat on the hanger');
    check(Math.abs(r.yaw + Math.PI / 2) < 0.01 && r.near !== ID, 'he faces the wardrobe; no prompt while he changes');
    await T.until(() => __game.room107.last?.done === true, 5000);
    await T.frames(2);
    r = { ...(await state(T)), w: await hang(T), said: await said(T), flash: await T.ev(() => getComputedStyle(document.getElementById('flash') || document.body).opacity) };
    T.log('done', JSON.stringify(r));
    check(r.outfit === 'arlanda' && r.island === 'arlanda' && r.saved === 'arlanda', 'the coat on, his island outfit, saved');
    check(r.w.open && r.w.hang === 'kostym' && r.said.includes(`stig: ${W.lines.arlanda.say}`), 'the suit on the hanger; "Det måste vara värmen."');
    const facing = await T.ev(() => { const g = __game, p = g.player, e = g.room107.shot().eye; return +Math.abs(Math.atan2(Math.sin(p.yaw - Math.atan2(e.x - p.x, e.z - p.z)), Math.cos(p.yaw - Math.atan2(e.x - p.x, e.z - p.z)))).toFixed(3); });
    check(facing < 0.01, `turned to the shot (${facing})`);
    await T.until(() => !__game.room107.swap, 5000);
    await T.frames(3);
    r = { ...(await state(T)), w: await hang(T), near: await near(T), camYaw: await T.ev(() => +__game.cam.yaw.toFixed(3)) };
    T.log('after', JSON.stringify(r));
    check(!r.cine && !r.w.open && r.near === ID, 'the shot let go, the doors shut, the prompt again');
    const want = await T.ev(() => { const s = __game.room107.shot(); return +Math.atan2(s.look.x - s.eye.x, s.look.z - s.eye.z).toFixed(3); });
    check(Math.abs(r.camYaw - want) < 0.01, `the chase camera looks the shot's way (${r.camYaw} vs ${want})`);

    // 2. Back to the suit: Ole on the radio.
    await T.ev(() => { window.__said = []; });
    await change(T);
    await T.sleep(400);
    r = { ...(await state(T)), toasts: await toasts(T) };
    T.log('suit', JSON.stringify(r));
    check(r.outfit === 'kostym' && r.saved === 'kostym' && r.toasts.some((t) => t.includes(W.lines.kostym.radio[1])), 'the suit again; Ole: "Du kan ikke gå sånn her nede! …"');

    // 3. A mission start in the coat: the story's suit at the talk; the coat back when it is off.
    await at(T, 'rum107Garderob');
    await change(T);
    check((await state(T)).outfit === 'arlanda', 'the coat again');
    await T.ev(() => __game.missions.begin());
    await T.until(() => __game.missions.state !== 'idle', 5000);
    await T.frames(3);
    r = { ...(await state(T)), usable: await T.ev(() => __game.interactables.find((i) => i.id === 'rum107:garderob').enabled(__game)) };
    T.log('mission', JSON.stringify(r));
    check(r.outfit === 'kostym' && r.island === 'arlanda' && !r.usable, 'a mission start: the story\'s suit, the pick kept, no wardrobe');
    await T.until(() => __game.missions.state === 'running', 30000);
    await T.ev(() => __game.missions.abort());
    await T.frames(4);
    r = await state(T);
    T.log('mission off', JSON.stringify(r));
    check(r.outfit === 'arlanda', 'the mission off: the coat back on');

    // 4. A mission start mid-change: broken off, the doors shut, the shot let go.
    await at(T, 'rum107Garderob');
    await T.tap('KeyE');
    await T.frames(2);
    check((await state(T)).swap, 'changing again');
    await T.ev(() => __game.missions.begin());
    await T.until(() => __game.missions.state !== 'idle', 5000);
    await T.frames(4);
    r = { ...(await state(T)), w: await hang(T), shot: await T.ev(() => { const c = __game.cam.cine, e = __game.room107.shot().eye; return !!c && Math.hypot(c.pos.x - e.x, c.pos.z - e.z) < 0.01; }) };
    T.log('mid-change', JSON.stringify(r));
    check(!r.swap && !r.w.open && r.outfit === 'kostym' && r.island === 'arlanda' && !r.shot && !r.frozen, 'broken off: the doors shut, its freeze off, the suit for the mission, the shot gone');
    await T.until(() => __game.missions.state === 'running', 30000);
    await T.ev(() => __game.missions.abort());
    await T.frames(4);

    // 5. The boombox before the samba unlock.
    await at(T, 'rum107Radio');
    r = { near: await near(T), prompt: await prompt(T) };
    check(r.near === 'rum107:radio' && /Bergsprängaren/.test(r.prompt), `locked: "Bergsprängaren" (${JSON.stringify(r)})`);
    await T.tap('KeyE');
    await T.frames(4);
    r = { toasts: await toasts(T), tune: await T.ev(() => __game.islandTune), near: await near(T) };
    T.log('locked', JSON.stringify(r));
    check(r.toasts.some((t) => t.includes(cfg.radio.quartz)) && r.tune === 'sol' && r.near !== 'rum107:radio', 'Ole: "Kvarts og digital."; no samba, no prompt for gap s');
    await T.until(() => __game.room107.radioT <= 0, 5000);
    check(await near(T) === 'rum107:radio', 'the prompt again after gap s');

    // 6. Unlocked: the samba, off, and on again with Ole's other line.
    await T.ev(() => __game.unlock('samba'));
    await T.sleep(2500);
    await at(T, 'rum107Radio');
    check(/Spela samba/.test(await prompt(T)), 'unlocked: "Spela samba"');
    await T.tap('KeyE');
    await T.frames(4);
    r = { tune: await T.ev(() => __game.levelTune()), toasts: await toasts(T), prompt: await prompt(T) };
    T.log('samba', JSON.stringify(r));
    check(r.tune === 'samba' && r.toasts.some((t) => t.includes(cfg.radio.line)) && /Stäng av sambaen/.test(r.prompt), 'the samba, "Ja, det er fint! Samba!", then "Stäng av sambaen"');
    await T.tap('KeyE');
    await T.frames(4);
    r = { tune: await T.ev(() => __game.levelTune()), saved: await T.ev(() => JSON.parse(localStorage.getItem('charter-and-run-v1')).tune), prompt: await prompt(T) };
    T.log('off', JSON.stringify(r));
    check(r.tune === 'sol' && r.saved === 'sol' && /Spela samba/.test(r.prompt), 'back to sol (saved), "Spela samba" again');
    await T.tap('KeyE');
    await T.frames(4);
    r = { tune: await T.ev(() => __game.levelTune()), last: await T.ev(() => __game.room107.last) };
    check(r.tune === 'samba' && r.last.line === cfg.radio.again, `the next samba: "Hører du? Samba." (${JSON.stringify(r)})`);
    await T.ev(() => __game.setIslandTune('sol'));

    // 7. Index 6: the hawaii shirt too, no Rio; its lines.
    await setup(T, '&mission=6');
    r = await state(T);
    check(r.outfit === 'hawaii' && r.list === 'kostym,arlanda,hawaii', `index 6: the shirt, three in the wardrobe (${r.list})`);
    await at(T, 'rum107Garderob');
    await change(T);
    check((await state(T)).outfit === 'kostym', 'from the shirt round to the suit (no Rio yet)');
    await change(T);
    await T.ev(() => { window.__said = []; });
    await change(T);
    await T.sleep(400);
    r = { ...(await state(T)), said: await said(T), toasts: await toasts(T) };
    T.log('hawaii', JSON.stringify(r));
    check(r.outfit === 'hawaii' && r.said.includes(`stig: ${W.lines.hawaii.say}`) && r.toasts.some((t) => t.includes(W.lines.hawaii.radio[1])), 'the shirt: "Är den inte lite skrikig?" and Ole\'s "sterke farger"');

    // 8. A pursuit: no "Byt kläder"; Skjortbytet's hideout in the shirt, none in the coat.
    await pursuit(T);
    await at(T, 'rum107Garderob');
    r = { near: await near(T) };
    check(r.near === HIDE, `in the shirt in a pursuit: Skjortbytet's hideout (${r.near})`);
    await T.tap('KeyE');
    await T.until(() => __game.shame.closet.last?.kind === 'done', 6000);
    await T.until(() => !__game.shame.closet.walk, 40000);
    await endPursuit(T);
    await T.frames(4);
    await at(T, 'rum107Garderob');
    r = { ...(await state(T)), near: await near(T) };
    T.log('after the hideout', JSON.stringify(r));
    check(r.outfit === 'kostym' && r.island === 'hawaii' && r.near === BACK, 'in Skjortbytet\'s suit: its way back, not "Byt kläder"');
    await T.tap('KeyE');
    await T.until(() => __game.shame.closet.last?.kind === 'done', 6000);
    await T.until(() => !__game.shame.closet.swap && __game.frozenT <= 0, 6000);
    await T.frames(3);
    check(await near(T) === ID, 'back in the shirt: "Byt kläder" again');
    await change(T);
    await change(T);
    check((await state(T)).outfit === 'arlanda', 'the coat');
    await T.ev(() => { __game.shame.closet.t = 0; });
    await pursuit(T);
    await at(T, 'rum107Garderob');
    r = { near: await near(T), taunts: await T.ev(() => __game.shame.closet.taunts(__game.shame.cfg.taunts)) };
    T.log('coat pursuit', JSON.stringify(r));
    check(![ID, HIDE, BACK].includes(r.near) && !r.taunts.includes('¡Usted! ¡El de la camisa!'), 'in the coat in a pursuit: no wardrobe at all, no shirt taunt');
    await endPursuit(T);
    await T.frames(4);

    // 9. A reload keeps the pick.
    await T.ev(() => __game.save());
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1`, { waitUntil: 'load' });
    await T.until(() => window.__ready === true, 120000);
    await T.frames(10);
    r = await T.ev(() => ({ outfit: __game.player.outfit, island: __game.islandOutfit, index: __game.missions.index, state: __game.missions.state }));
    T.log('reload', JSON.stringify(r));
    check(r.outfit === 'arlanda' && r.island === 'arlanda' && r.index === 6 && r.state === 'idle', 'a reload: the coat again');
    await T.ev(() => localStorage.removeItem('charter-and-run-v1'));

    // 10. After the end: the Rio jacket, Ole's line, no SunTrip-butiken layer over it.
    await setup(T, '&mission=13');
    await T.ev(() => { const g = __game; g.shop.owned.add('hatt'); g.shop.refresh(); });
    await T.frames(3);
    r = await state(T);
    check(r.list === 'kostym,arlanda,hawaii,rio' && await T.ev(() => __game.shop.worn === 'hatt'), `after the end: all four (${r.list}), the hat on`);
    await at(T, 'rum107Garderob');
    await change(T);
    await T.sleep(400);
    r = { ...(await state(T)), toasts: await toasts(T), worn: await T.ev(() => __game.shop.worn), hat: await T.ev(() => __game.player.def.hat ?? null) };
    T.log('rio', JSON.stringify(r));
    check(r.outfit === 'rio' && r.saved === 'rio' && r.toasts.some((t) => t.includes(W.lines.rio.radio[1])), 'the Rio jacket (saved); Ole: "Og så Rio! …"');
    check(r.worn === '' && r.hat !== 'bucket', 'no SunTrip hat over the Rio jacket');
    await change(T);
    r = { ...(await state(T)), worn: await T.ev(() => __game.shop.worn) };
    check(r.outfit === 'kostym' && r.worn === 'hatt', 'round to the suit, the hat on again');

    // 11. The flight level: inert.
    await setup(T, '&mission=2');
    r = await T.ev(() => ({ live: __game.room107.live, usable: __game.interactables.filter((i) => /^rum107:/.test(i.id) && i.enabled(__game)).length, outfit: __game.player.outfit }));
    check(!r.live && !r.usable && r.outfit === 'kostym', `the flight level: inert (${JSON.stringify(r)})`);
  },

  async kladshots(T) {
    await setup(T, '&mission=13');
    await at(T, 'rum107Garderob', 0.7);
    await T.shot('klader_1_stig');
    // Each of the four on the hanger, Stig changing (the shot), and in it after the flash.
    for (const k of [2, 3, 4, 5]) {
      await T.tap('KeyE');
      await T.sleep(250);
      await T.shot(`klader_${k}_byte`);
      await T.until(() => __game.room107.last?.done === true, 5000);
      await T.sleep(450);
      await T.shot(`klader_${k}_${await T.ev(() => __game.player.outfit)}`);
      await T.until(() => !__game.room107.swap, 5000);
      await T.frames(4);
    }
    await T.shot('klader_6_jaktkamera');
    // The coat on the patio and the Rio jacket at the pool.
    for (let k = 0; k < 4 && await T.ev(() => __game.islandOutfit !== 'arlanda'); k++) await change(T);
    await at(T, 'flamencoPatio', Math.PI);
    await T.shot('klader_7_rocken_uteplatsen');
    await at(T, 'rum107Garderob');
    while (await T.ev(() => __game.islandOutfit !== 'rio')) await change(T);
    await T.ev(() => { const g = __game, s = g.approachSpot('flamencoPool'); g.player.teleport(s.x, s.z, s.yaw + Math.PI); g.cam.yaw = s.yaw; g.cam.snapNext = true; });
    await T.frames(8);
    await T.shot('klader_8_rio_poolen');
  },
};
