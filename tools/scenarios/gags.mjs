// Gags på E – Ole's flash and Angerud's Viking special (free roam, DESIGN §10.32; feature 47): gags,
// gagshots.
//   gags:     at index 9 (free roam) the bag's prompt "Titta på Oles kameraväska" at gagKamera with Ole
//             at home under the pergola (none 2.5 m off, none with Ole away). E: the letterbox, Ole's
//             six lines and Stig's two in order, the shots `two` then `ole`, Ole at his mark and held
//             (posed) with `camShow`, then `film` on "Si omelett!"; after the last line a white flash
//             and the shutter. Then everything back: Ole where he stood (busy and spot as before), his
//             poses off, Stig at gagKamera facing the bag, no letterbox, no cutaway, +100 pta, the
//             collect card "Gags 1/2", the save `gags: ['kamera']`, the legend "Gags 1/2". No prompt
//             for `rest` s; E again plays it again for nothing. The Viking gag the same way: Angerud's
//             order, Stig's with the cup held out, Carmencita gone in and Stig's cup up under the lamp
//             (`lamp` shot) for "Om man vill ha lite mer juice…?", Angerud's "Undrar hur länge man ska
//             stå här."; both back where they stood, +100, "Gags 2/2". The chase camera after each
//             scene: the eye behind Stig, clear of every solid, and a 24-step sweep round him at the end
//             mark logged (the nearest the eye comes to his head, any eye in a solid). No prompt in a
//             pursuit or once a mission starts; at index 7 (Ole the giver at `flamenco`) the bag's gag
//             plays and Ole is back on the giver's spot with his talk. A reload keeps 2/2. After the end
//             (index 13, Angerud in hospital): the bag's gag only. The flight level: inert.
//   gagshots: each line of both scenes as the player sees it (dialogue held), the bag and the lamp
//             up close, the prompts, the flash's white frame and the collect card, and a contact sheet
//             of the chase camera's sweep at both end marks. With SHOTS unset only the scene shots.
import { check } from '../lib.mjs';

const PI = Math.PI;
const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? (it.type === 'it' ? it.it.id : it.type) : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
const cfgOf = (T) => T.ev(() => JSON.parse(JSON.stringify(__game.gags.cfg)));
// Stig on landmark `name` (offset dx left, dz forward), facing its yaw, the camera behind him.
async function at(T, name, dx = 0, dz = 0) {
  await T.ev((name, dx, dz) => {
    const g = __game, q = g.lmOffset(name, dx, dz), p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.teleport(q.x, q.z, q.yaw);
    g.cam.yaw = q.yaw; g.cam.snapNext = true;
  }, name, dx, dz);
  await T.frames(6);
}
// Records every line as it starts (who, text, the poses and places, the shot, the letterbox), the
// flashes and the shutter.
const watch = (T) => T.ev(async () => {
  const g = __game;
  window.__gag = { lines: [], flash: [], shutter: 0 };
  if (window.__gagWrapped) return;
  window.__gagWrapped = true;
  const { hud } = await import('/src/game/hud.js');
  const { audio } = await import('/src/audio.js');
  const d = g.dialog.bind(g);
  const flags = (ch) => ['camShow', 'film', 'cupHeld', 'cupUp'].filter((f) => ch.anim[f]);
  g.dialog = (lines) => {
    window.__gag.lines.push({
      who: lines[0][0], text: lines[0][1], letterbox: document.getElementById('letterbox').classList.contains('on'), inDialog: g.inDialog,
      stig: { flags: flags(g.player), x: +g.player.x.toFixed(2), z: +g.player.z.toFixed(2), yaw: +g.player.yaw.toFixed(2) },
      npcs: Object.fromEntries(['ole', 'angerud', 'carmencita'].map((k) => {
        const n = g.npc(k);
        return [k, { flags: flags(n), vis: n.root.visible && n.state !== 'hidden', x: +n.x.toFixed(2), z: +n.z.toFixed(2), yaw: +n.yaw.toFixed(2), posed: g.npcPosed(k) }];
      })),
      shot: g.gags.last?.shots.at(-1),
    });
    return d(lines);
  };
  const f = hud.flashColor.bind(hud);
  hud.flashColor = (c, ms) => { window.__gag.flash.push(c); return f(c, ms); };
  const s = audio.shutter.bind(audio);
  audio.shutter = () => { window.__gag.shutter++; return s(); };
});
const npcAt = (T, k) => T.ev((k) => { const n = __game.npc(k); return { x: +n.x.toFixed(3), z: +n.z.toFixed(3), yaw: +n.yaw.toFixed(3), busy: n.busy, spot: n.spot, state: n.state, vis: n.root.visible }; }, k);
const mark = (T, name, m) => T.ev((name, m) => { const q = __game.lmOffset(name, m[0], m[1]); return { x: +q.x.toFixed(2), z: +q.z.toFixed(2) }; }, name, m);
// E and the whole scene.
async function play(T) {
  await T.tap('KeyE');
  await T.until(() => !!__game.gags.run, 3000);
  await T.until(() => !__game.gags.run, 40000);
  await T.frames(4);
}
// The chase camera now (the eye vs Stig's head and the solids round it), and a sweep of `n` yaws
// round him from his facing (6 frames each); the camera's yaw put back after.
const camNow = (T) => T.ev(async () => {
  const { camera } = await import('/src/gfx.js');
  const C = await import('/src/world/collision.js');
  const g = __game, p = g.player, e = camera.position, hy = p.y + p.height * 0.85;
  const out = [];
  C.queryBlocks(e.x - 0.5, e.z - 0.5, e.x + 0.5, e.z + 0.5, out);
  const inside = out.filter((b) => C.contains(b, e.x, e.z) && C.topAt(b, e.x, e.z) > e.y && e.y > (b.bottom ?? -1)).map((b) => b.kind);
  return { d: +Math.hypot(e.x - p.x, e.y - hy, e.z - p.z).toFixed(2), y: +e.y.toFixed(2), inside, cine: !!g.cam.cine };
});
async function sweep(T, n = 24) {
  const yaw0 = await T.ev(() => __game.cam.yaw);
  const rows = [];
  for (let k = 0; k < n; k++) {
    await T.ev((y) => { __game.cam.yaw = y; }, yaw0 + (k / n) * 2 * PI);
    await T.frames(6);
    rows.push({ k, ...(await camNow(T)) });
  }
  await T.ev((y) => { __game.cam.yaw = y; __game.cam.snapNext = true; }, yaw0);
  await T.frames(4);
  return rows;
}
const coins = (T) => T.ev(() => __game.coins);
const saved = (T) => T.ev(() => JSON.parse(localStorage.getItem('charter-and-run-v1') || 'null')?.gags ?? null);

export const SCENARIOS = {
  async gags(T) {
    await T.fresh('&mission=9');
    const cfg = await cfgOf(T);
    const K = cfg.list.find((x) => x.id === 'kamera'), V = cfg.list.find((x) => x.id === 'viking');
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');
    await watch(T);

    // 1. The bag: the prompt, none 2.5 m off, none with Ole away.
    await at(T, 'gagKamera');
    let r = { near: await near(T), prompt: await prompt(T), ole: await npcAt(T, 'ole') };
    T.log('bag', JSON.stringify(r));
    check(r.near === 'gag:kamera' && /Titta på Oles kameraväska/.test(r.prompt), 'the bag\'s prompt');
    await at(T, 'gagKamera', 0, -2.5);
    check(await near(T) !== 'gag:kamera', 'none 2.5 m off');
    await T.ev(() => __game.hideNpc('ole'));
    await at(T, 'gagKamera');
    check(await near(T) !== 'gag:kamera', 'none with Ole away');
    await T.ev(() => __game.placeNpcs(true));
    await at(T, 'gagKamera');
    check(await near(T) === 'gag:kamera', 'the prompt with Ole home again');

    // 2. E: the scene.
    const ole0 = await npcAt(T, 'ole'), c0 = await coins(T);
    await play(T);
    r = await T.ev(() => window.__gag);
    T.log('kamera lines', JSON.stringify(r.lines.map((l) => [l.who, l.text, l.shot, l.npcs.ole.flags.join('+'), l.npcs.ole.posed, l.letterbox])));
    T.log('kamera flash', JSON.stringify(r.flash), 'shutter', r.shutter);
    check(JSON.stringify(r.lines.map((l) => [l.who, l.text])) === JSON.stringify(K.lines.map((l) => [l[0], l[1]])), 'the lines in order');
    check(r.lines.every((l) => l.letterbox && l.inDialog), 'letterbox and a dialogue all through');
    check(r.lines.slice(0, 5).every((l) => l.shot === 'two' && l.npcs.ole.flags.join() === 'camShow') && r.lines[5].shot === 'ole' && r.lines[5].npcs.ole.flags.join() === 'film', 'the two-shot with the camera shown, then Ole\'s shot with the camera up');
    check(r.lines.every((l) => l.npcs.ole.posed), 'Ole held (posed) all through');
    const om = await mark(T, 'gagKamera', K.marks.ole), sm = await mark(T, 'gagKamera', K.marks.stig);
    check(Math.hypot(r.lines[0].npcs.ole.x - om.x, r.lines[0].npcs.ole.z - om.z) < 0.05 && Math.hypot(r.lines[0].stig.x - sm.x, r.lines[0].stig.z - sm.z) < 0.05, 'Ole and Stig on their marks');
    check(r.flash.some((c) => /255,\s*255,\s*255/.test(c)) && r.shutter === 1, 'the white flash and the shutter after "Si omelett!"');
    const rest = await near(T);
    const ole1 = await npcAt(T, 'ole');
    r = { rest,
      ole: ole1, oleFlags: await T.ev(() => ['camShow', 'film'].filter((f) => __game.npc('ole').anim[f])), posed: await T.ev(() => __game.npcPosed('ole')),
      stig: await T.ev(() => { const p = __game.player, l = __lm('gagKamera'); return { d: +Math.hypot(p.x - l.x, p.z - l.z).toFixed(2), yaw: +p.yaw.toFixed(3) }; }),
      letterbox: await T.ev(() => document.getElementById('letterbox').classList.contains('on')), inDialog: await T.ev(() => __game.inDialog), cut: await T.ev(() => !!__game.cam.cine),
      coins: (await coins(T)) - c0, card: await T.ev(() => document.getElementById('collect').textContent), saved: await saved(T),
      legend: await T.ev(() => __game.mapLegend()), last: await T.ev(() => __game.gags.last),
    };
    T.log('kamera after', JSON.stringify(r));
    check(r.ole.x === ole0.x && r.ole.z === ole0.z && r.ole.busy === ole0.busy && r.ole.spot === ole0.spot && !r.oleFlags.length && !r.posed, 'Ole back where he stood, poses off');
    check(r.stig.d < 0.05 && Math.abs(r.stig.yaw + PI / 2) < 0.01, 'Stig at gagKamera facing the bag');
    check(!r.letterbox && !r.inDialog && !r.cut, 'no letterbox, dialogue or cutaway');
    check(r.rest !== 'gag:kamera', 'no prompt straight after');
    check(r.coins === cfg.pay && /Gags\s*1\/2/.test(r.card) && JSON.stringify(r.saved) === '["kamera"]' && /Gags <b>1\/2<\/b>/.test(r.legend), '+100, the card and the legend "Gags 1/2", saved');
    let cam = await camNow(T);
    T.log('kamera camera', JSON.stringify(cam));
    check(!cam.cine && cam.d > 1.5 && !cam.inside.length, `the chase eye behind him, clear (${JSON.stringify(cam)})`);
    let sw = await sweep(T);
    T.log('kamera sweep', JSON.stringify(sw.map((s) => [s.k, s.d, s.y, s.inside.join('+')])));
    T.log('kamera sweep min', Math.min(...sw.map((s) => s.d)), 'inside', sw.filter((s) => s.inside.length).length);
    check(!sw.some((s) => s.inside.length), 'no eye in a solid round the bag');
    // Rest (checked straight after the scene, above), then again for nothing.
    await T.until(() => __game.time >= __game.gags.restUntil, 8000);
    await T.frames(3);
    check(await near(T) === 'gag:kamera', 'the prompt again after rest');
    const c1 = await coins(T);
    await watch(T);
    await play(T);
    r = { lines: (await T.ev(() => window.__gag.lines)).length, coins: (await coins(T)) - c1, count: await T.ev(() => __game.gags.count), first: await T.ev(() => __game.gags.last.first) };
    T.log('kamera again', JSON.stringify(r));
    check(r.lines === K.lines.length && r.coins === 0 && r.count === 1 && !r.first, 'again: the whole scene, no pay, still 1/2');

    // 3. Viking Bar's lamp.
    await T.until(() => __game.time >= __game.gags.restUntil, 8000);
    await at(T, 'gagViking');
    const ang0 = await npcAt(T, 'angerud'), car0 = await npcAt(T, 'carmencita');
    r = { near: await near(T), prompt: await prompt(T) };
    T.log('lamp', JSON.stringify(r));
    check(r.near === 'gag:viking' && /Beställ en juice/.test(r.prompt), 'the lamp\'s prompt');
    const c2 = await coins(T);
    await watch(T);
    await play(T);
    r = await T.ev(() => window.__gag);
    T.log('viking lines', JSON.stringify(r.lines.map((l) => [l.who, l.text, l.shot, l.stig.flags.join('+'), l.stig.yaw, l.npcs.carmencita.vis, l.npcs.angerud.posed])));
    check(JSON.stringify(r.lines.map((l) => [l.who, l.text])) === JSON.stringify(V.lines.map((l) => [l[0], l[1]])), 'the lines in order');
    check(r.lines[0].shot === 'bar' && r.lines[1].shot === 'bar' && r.lines[2].shot === 'lamp' && r.lines[3].shot === 'lamp', 'the bar shot, then the lamp shot');
    check(!r.lines[0].stig.flags.length && r.lines[1].stig.flags.join() === 'cupHeld' && r.lines[2].stig.flags.sort().join() === 'cupHeld,cupUp' && r.lines[3].stig.flags.length === 2, 'the cup held out for his order, up under the lamp after');
    check(r.lines[0].npcs.carmencita.vis && r.lines[1].npcs.carmencita.vis && !r.lines[2].npcs.carmencita.vis && !r.lines[3].npcs.carmencita.vis, 'Carmencita takes the orders and goes in');
    check(Math.abs(Math.abs(r.lines[2].stig.yaw) - PI) < 0.01 && r.lines.every((l) => l.npcs.angerud.posed && l.letterbox), 'Stig turned to the lamp; Angerud held; the letterbox');
    check(!r.flash.length && r.shutter === 0, 'no flash at the bar');
    r = {
      ang: await npcAt(T, 'angerud'), car: await npcAt(T, 'carmencita'), stigFlags: await T.ev(() => ['cupHeld', 'cupUp'].filter((f) => __game.player.anim[f])),
      stig: await T.ev(() => { const p = __game.player, l = __lm('gagViking'); return { d: +Math.hypot(p.x - l.x, p.z - l.z).toFixed(2), yaw: +p.yaw.toFixed(3) }; }),
      coins: (await coins(T)) - c2, card: await T.ev(() => document.getElementById('collect').textContent), saved: await saved(T), legend: await T.ev(() => __game.mapLegend()),
    };
    T.log('viking after', JSON.stringify(r));
    // (Not the yaw: an NPC near Stig turns to him, syncAll.)
    const same = (a, b) => a.x === b.x && a.z === b.z && a.busy === b.busy && a.spot === b.spot && a.state === 'normal' && a.vis;
    check(same(r.ang, ang0) && same(r.car, car0), 'Angerud and Carmencita back where they stood');
    check(!r.stigFlags.length && r.stig.d < 0.05 && Math.abs(Math.abs(r.stig.yaw) - PI) < 0.01, 'Stig at gagViking facing the lamp, the cup down');
    check(r.coins === cfg.pay && /Gags\s*2\/2/.test(r.card) && JSON.stringify(r.saved) === '["kamera","viking"]' && /Gags <b>2\/2<\/b>/.test(r.legend), '+100, "Gags 2/2", saved');
    cam = await camNow(T);
    T.log('viking camera', JSON.stringify(cam));
    check(!cam.cine && cam.d > 1.5 && !cam.inside.length, `the chase eye behind him, clear (${JSON.stringify(cam)})`);
    sw = await sweep(T);
    T.log('viking sweep', JSON.stringify(sw.map((s) => [s.k, s.d, s.y, s.inside.join('+')])));
    T.log('viking sweep min', Math.min(...sw.map((s) => s.d)), 'inside', sw.filter((s) => s.inside.length).length);
    check(!sw.some((s) => s.inside.length), 'no eye in a solid round the lamp');

    // 4. No prompt in a pursuit, nor once a mission starts.
    await T.until(() => __game.time >= __game.gags.restUntil, 8000);
    await T.ev(() => { __game.shame.v = 100; __game.shame.startPursuit(); });
    await at(T, 'gagViking');
    r = { near: await near(T) };
    await T.ev(() => __game.shame.endPursuit(false));
    await T.ev(() => { __game.shame.v = 0; });
    await T.frames(3);
    r.after = await near(T);
    T.log('pursuit', JSON.stringify(r));
    check(r.near !== 'gag:viking' && r.after === 'gag:viking', 'none in a pursuit, back after it');
    await T.ev(() => __game.missions.begin());
    await T.until(() => __game.missions.state !== 'idle', 5000);
    await at(T, 'gagKamera');
    r = { near: await near(T), can: await T.ev(() => __game.gags.cfg.list.some((x) => __game.gags.canPlay(x))) };
    T.log('mission', JSON.stringify(r));
    check(r.near !== 'gag:kamera' && !r.can, 'none in a mission');

    // 5. A reload keeps 2/2.
    await T.ev(() => __game.save());
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1`, { waitUntil: 'load' });
    await T.until(() => window.__ready === true, 120000);
    await T.frames(10);
    r = { count: await T.ev(() => __game.gags.count), legend: await T.ev(() => __game.mapLegend()) };
    T.log('reload', JSON.stringify(r));
    check(r.count === 2 && /Gags <b>2\/2<\/b>/.test(r.legend), 'the save keeps both');

    // 6. Index 7: Ole is asnan's giver at `flamenco`; the bag's gag plays, and he is back with his talk.
    await T.fresh('&mission=7');
    await watch(T);
    const g0 = await npcAt(T, 'ole');
    await at(T, 'gagKamera');
    check(await near(T) === 'gag:kamera', 'the bag\'s prompt with Ole as the giver');
    await play(T);
    const g1 = await npcAt(T, 'ole');
    await T.ev(() => { const g = __game, n = g.npc('ole'), p = g.player; p.teleport(n.x + 1.5, n.z + 1.5, 0); });
    await T.frames(4);
    r = { g0, g1, near: await near(T), lines: (await T.ev(() => window.__gag.lines)).length };
    T.log('giver', JSON.stringify(r));
    check(g1.x === g0.x && g1.z === g0.z && g1.busy === g0.busy && r.lines === K.lines.length && r.near === 'talk', 'Ole back on the giver\'s spot, his talk');

    // 7. After the end: Angerud in hospital, so only the bag's gag.
    await T.fresh('&mission=13');
    await T.ev(() => { __game.unlock('bodega'); __game.placeNpcs(true); });
    await T.frames(5);
    await at(T, 'gagViking');
    r = { lamp: await near(T), angerud: await T.ev(() => __game.npc('angerud').state) };
    await at(T, 'gagKamera');
    r.bag = await near(T);
    T.log('after the end', JSON.stringify(r));
    check(r.angerud === 'hidden' && r.lamp !== 'gag:viking' && r.bag === 'gag:kamera', 'after the end: the bag only');

    // 8. The flight level: inert.
    await T.fresh('&mission=2');
    r = await T.ev(() => ({ live: __game.gags.live, can: __game.gags.cfg.list.some((x) => __game.gags.canPlay(x)) }));
    T.log('flight', JSON.stringify(r));
    check(!r.live && !r.can, 'the flight level: inert');
  },

  async gagshots(T) {
    await T.fresh('&mission=9');
    const cfg = await cfgOf(T);
    // The bag and the lamp up close, with the prompts.
    await at(T, 'gagKamera', 0, 0.2);
    await T.shot('gag_bag_prompt');
    await at(T, 'gagKamera', 1.4, -0.4);
    await T.ev(() => { const g = __game, l = __lm('gagKamera'); g.inDialog = true; g.cam.cutTo({ x: l.x + 0.4, y: 1.7, z: l.z + 1.2 }, { x: l.x - 0.7, y: 1.25, z: l.z }); g.cam.snapNext = true; });
    await T.frames(6);
    await T.shot('gag_bag_close');
    await T.ev(() => __game.endCinematic());
    await at(T, 'gagViking');
    await T.shot('gag_lamp_prompt');
    // Each line as the player sees it: the dialogue held, Space to go on.
    for (const id of ['kamera', 'viking']) {
      const gag = cfg.list.find((x) => x.id === id);
      await T.until(() => __game.time >= __game.gags.restUntil, 8000);
      await at(T, gag.lm);
      await T.ev(() => { __game.autoDialog = false; });
      await T.tap('KeyE');
      await T.until(() => !!__game.gags.run, 3000);
      for (let k = 0; k < gag.lines.length; k++) {
        await T.sleep(900);
        await T.shot(`gag_${id}_${k}`);
        await T.tap('Space');   // the line is out by now: one press goes on
        await T.frames(2);
      }
      await T.ev(() => { __game.autoDialog = true; });
      if (id === 'kamera') { await T.frames(2); await T.shot('gag_kamera_flash'); }
      await T.until(() => !__game.gags.run, 20000);
      await T.frames(8);
      await T.shot(`gag_${id}_after`);
    }
    if (!process.env.SHOTS) return;
    // The chase camera's sweep at both end marks, 8 yaws each.
    for (const name of ['gagKamera', 'gagViking']) {
      await at(T, name);
      const y0 = await T.ev(() => __game.cam.yaw);
      for (let k = 0; k < 8; k++) {
        await T.ev((y) => { __game.cam.yaw = y; }, y0 + (k / 8) * 2 * PI);
        await T.frames(10);
        await T.shot(`gag_sweep_${name}_${k}`);
      }
    }
  },
};
