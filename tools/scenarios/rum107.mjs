// Rum 107 fylls med resans minnen (free roam, DESIGN §10.25; feature 38): rum107, troferum.
//   rum107:   at index 9 (free roam): the room is bare (no gadget, fin or julafton keepsake shown); E at
//             the shelf ("Kontrollera hyllan") with nothing found is "Inget att kontrollera.", the
//             collect card 0/7 · 0/7 and Ole's "Hylla er tom…" on the radio. Four gadgets and three fins
//             (collected the real way, `collect`) show at once, each gadget in its own place on the shelf
//             and three fins in the pile; E: "Kontrollerad av G17." and Ole's "Fire av sju! Snart er
//             hylla full.", then no prompt for `gap` s. Before the unlocks the giraffe has no prompt
//             (the nap's by Stig's bed as before) and the boombox no samba (feature 67: "Bergsprängaren",
//             klader.mjs). All seven: the samba unlock; the boombox's "Spela samba" sets the island tune
//             to samba (saved), Ole's "Ja, det er fint! Samba!", and while it plays "Stäng av sambaen"
//             (feature 67). After the bodega unlock (julafton) the suitcase, the
//             giraffe and the knäcke pack show; E at the giraffe: he holds it ("Precis en sån har jag
//             önskat mig."), the bed's is hidden, and it is back after holdSecs, or at once 3 m off; the
//             nap still answers beside his bed. A full shelf: "Alle sju! Nå er hylla full.". The save
//             and a reload dress the room; a mission start: none of the three, a held giraffe put back.
//             The flight level: inert.
//   troferum: the room from the patio (rum107Cam, as buss17's havsutsikt cut and julafton's knock
//             cut frame it) bare, mid-trip (four gadgets, three fins) and after julafton (all of it),
//             a close shot of the shelf, the pile and the beds, Stig at the shelf, Stig holding the
//             giraffe, and the nap after julafton (the giraffe beside him on the bed).
import { check } from '../lib.mjs';

const MID = ['klocka', 'kalkylator', 'kamera', 'pung'];
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || '?', text, +g.time.toFixed(2)]);
      return o(t, text, secs);
    };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.map((s) => s[1]));
const toasts = (T) => T.ev(() => [...document.querySelectorAll('#toasts .toast')].map((t) => t.textContent));
const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? (it.type === 'it' ? it.it.id : it.type) : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
// What the room shows: the gadgets on the shelf, the fins in the pile, the julafton keepsakes.
const room = (T) => T.ev(() => {
  const w = __game.room107.world;
  return {
    gadgets: Object.entries(w.gadgets).filter(([, m]) => m.visible).map(([id]) => id),
    fins: w.fins.filter((m) => m.visible).length,
    after: Object.entries(w.after).filter(([, m]) => m.visible).map(([k]) => k),
  };
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
const collect = (T, set, ids) => T.ev((set, ids) => {
  const g = __game;
  for (const c of g.collectibles[set]) if (!ids || ids.includes(c.id)) g.collect(set, c);
}, set, ids);
// The patio camera of buss17's havsutsikt line (dist 5.5) or julafton's knock (7.5).
const patio = (T, dist = 5.5) => T.ev((dist) => { __game.cutTo({ at: 'rum107Cam', dist, height: 2.1 }); }, dist);

export const SCENARIOS = {
  async rum107(T) {
    await T.fresh('&mission=9');
    await resetSaid(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');
    const cfg = await T.ev(() => JSON.parse(JSON.stringify(__game.room107.cfg)));
    let r = await room(T);
    T.log('bare', JSON.stringify(r));
    check(!r.gadgets.length && !r.fins && !r.after.length, 'a fresh save: the room is bare');
    const ws = await T.ev(() => { const w = __game.room107.world; return { g: Object.keys(w.gadgets).length, f: w.fins.length, a: Object.keys(w.after).sort().join() }; });
    check(ws.g === 7 && ws.f === 7 && ws.a === 'giraff,knacke,vaska', `the keepsakes built (${JSON.stringify(ws)})`);

    // 1. The shelf with nothing found.
    await at(T, 'rum107Hylla');
    r = { near: await near(T), prompt: await prompt(T) };
    T.log('shelf prompt', JSON.stringify(r));
    check(r.near === 'rum107:hylla' && /Kontrollera hyllan/.test(r.prompt), 'the shelf\'s prompt');
    await T.tap('KeyE');
    await T.frames(4);
    r = { collect: await T.ev(() => document.getElementById('collect').textContent), last: await T.ev(() => __game.room107.last), yaw: await T.ev(() => +__game.player.yaw.toFixed(3)) };
    await T.sleep(1400);
    r.said = await said(T);
    r.toasts = await toasts(T);
    T.log('empty shelf', JSON.stringify(r));
    check(r.said.includes(cfg.shelf.empty) && /Oles prylar\s*0\/7/.test(r.collect) && /Hajfenor\s*0\/7/.test(r.collect), 'empty: "Inget att kontrollera.", the card 0/7 · 0/7');
    check(r.toasts.some((t) => t.includes(cfg.shelf.none)), 'Ole: "Hylla er tom…"');
    check(Math.abs(Math.abs(r.yaw) - Math.PI) < 0.01, 'he faces the shelf');

    // 2. Mid-trip: four gadgets, three fins.
    await collect(T, 'prylar', MID);
    await collect(T, 'fenor', ['fena_flamenco', 'fena_suntrip', 'fena_plaza']);
    r = await room(T);
    T.log('mid', JSON.stringify(r));
    check(JSON.stringify(r.gadgets) === JSON.stringify(MID) && r.fins === 3 && !r.after.length, 'four gadgets on the shelf, three fins in the pile');
    // Each gadget in its own place on the shelf (0.5 m apart, a gap for the missing), on its top.
    const pos = await T.ev(() => Object.entries(__game.room107.world.gadgets).map(([id, m]) => {
      m.geometry.computeBoundingBox();
      m.updateMatrixWorld(true);
      const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);   // the mesh (its outline 1–2 cm wider)
      return [id, +m.position.x.toFixed(2), +b.min.y.toFixed(3), +b.max.y.toFixed(3)];
    }));
    T.log('gadget places', JSON.stringify(pos));
    check(pos.every(([, x], k) => Math.abs(x - pos[0][1] - k * 0.5) < 0.25), 'seven places along the shelf');
    check(pos.every(([, , y0, y1]) => Math.abs(y0 - 2.75) < 0.03 && y1 < 3.3), 'standing on the shelf (2.75), under 3.3');
    await at(T, 'rum107Hylla');
    check(await near(T) !== 'rum107:hylla', `no prompt for gap s after a check (${await near(T)})`);
    await T.until(() => __game.room107.restT <= 0, 8000);
    await T.ev(() => { window.__said = []; });
    check(await near(T) === 'rum107:hylla', 'the prompt again after gap s');
    await T.tap('KeyE');
    await T.sleep(1400);
    r = { said: await said(T), toasts: await toasts(T), collect: await T.ev(() => document.getElementById('collect').textContent) };
    T.log('mid shelf', JSON.stringify(r));
    check(r.said.includes(cfg.shelf.line) && /Oles prylar\s*4\/7/.test(r.collect) && /Hajfenor\s*3\/7/.test(r.collect), '"Kontrollerad av G17.", the card 4/7 · 3/7');
    check(r.toasts.some((t) => t.includes('Fire av sju! Snart er hylla full.')), 'Ole: "Fire av sju! Snart er hylla full."');

    // 3. Before the unlocks: no giraffe, no boombox; the nap at his bed's foot as before.
    await at(T, 'rum107Giraff');
    r = { giraffe: await near(T) };
    await at(T, 'rum107Radio');
    r.radio = await near(T);
    r.radioPrompt = await prompt(T);
    T.log('locked', JSON.stringify(r));
    check(r.giraffe === 'kvarta' && r.radio === 'rum107:radio' && !/Spela samba/.test(r.radioPrompt), 'before the unlocks: the nap by the bed\'s head, no samba at the boombox (feature 67: "Bergsprängaren")');

    // 4. All seven: the samba unlock; the boombox.
    await collect(T, 'prylar');
    await T.until(() => __game.unlocked.has('samba'), 5000);
    await T.sleep(3000);   // the set's radio lines go by
    await at(T, 'rum107Radio');
    r = { near: await near(T), prompt: await prompt(T), tune: await T.ev(() => __game.islandTune) };
    check(r.near === 'rum107:radio' && /Spela samba/.test(r.prompt) && r.tune === 'sol', `the boombox after the unlock (${JSON.stringify(r)})`);
    await T.tap('KeyE');
    await T.frames(6);
    r = { tune: await T.ev(() => __game.islandTune), playing: await T.ev(() => __game.levelTune()), saved: await T.ev(() => JSON.parse(localStorage.getItem('charter-and-run-v1')).tune), toasts: await toasts(T), near: await near(T), prompt: await prompt(T) };
    T.log('samba', JSON.stringify(r));
    check(r.tune === 'samba' && r.playing === 'samba' && r.saved === 'samba', 'the samba plays and is saved');
    check(r.toasts.some((t) => t.includes(cfg.radio.line)) && r.near === 'rum107:radio' && /Stäng av sambaen/.test(r.prompt), 'Ole: "Ja, det er fint! Samba!"; while it plays "Stäng av sambaen" (feature 67)');
    // The pause menu's tune back to sol: the prompt again.
    await T.ev(() => __game.setIslandTune('sol'));
    await T.frames(3);
    check(await near(T) === 'rum107:radio', 'the prompt again with the sol tune');

    // 5. After julafton: the suitcase, the giraffe, the knäcke pack.
    await T.ev(() => __game.unlock('bodega'));
    await T.frames(3);
    r = await room(T);
    T.log('after', JSON.stringify(r));
    check(r.after.length === 3 && r.gadgets.length === 7 && r.fins === 3, 'after julafton: all of it');
    await at(T, 'rum107Giraff');
    await T.ev(() => { window.__said = []; });
    r = { near: await near(T), prompt: await prompt(T) };
    check(r.near === 'rum107:giraff' && /Ta upp giraffen/.test(r.prompt), `the giraffe's prompt (${JSON.stringify(r)})`);
    await T.tap('KeyE');
    await T.frames(4);
    r = { held: await T.ev(() => __game.player.anim.giraffe), bed: (await room(T)).after.includes('giraff'), said: await said(T), near: await near(T) };
    T.log('giraffe', JSON.stringify(r));
    check(r.held && !r.bed && r.said.includes(cfg.giraffe.line), 'he holds it up ("Precis en sån…"), the bed\'s hidden');
    r.prompt = await prompt(T);
    check(r.near === 'rum107:giraff' && /Ställ tillbaka giraffen/.test(r.prompt), `while he holds it: "Ställ tillbaka giraffen" (${r.prompt})`);
    await T.until(() => !__game.player.anim.giraffe, 10000);
    r = { bed: (await room(T)).after.includes('giraff'), held: await T.ev(() => __game.room107.world.held) };
    check(r.bed && !r.held, 'back on the bed after holdSecs');
    await T.tap('KeyE');
    await T.frames(3);
    check(await T.ev(() => __game.player.anim.giraffe), 'held again');
    await T.ev(() => { const p = __game.player; p.teleport(p.x + 2.2, p.z + 2.2, 0); });
    await T.frames(4);
    r = { held: await T.ev(() => __game.player.anim.giraffe), bed: (await room(T)).after.includes('giraff') };
    check(!r.held && r.bed, `put back 3 m off (${JSON.stringify(r)})`);
    await at(T, 'rum107Giraff');
    await T.tap('KeyE');
    await T.frames(3);
    check(await T.ev(() => __game.player.anim.giraffe), 'held again');
    await T.tap('KeyE');
    await T.frames(3);
    r = { held: await T.ev(() => __game.player.anim.giraffe), bed: (await room(T)).after.includes('giraff'), near: await near(T) };
    check(!r.held && r.bed && r.near === 'rum107:giraff', `put back with E (${JSON.stringify(r)})`);
    // The nap beside his bed still answers.
    await T.ev(() => { const p = __game.player; p.teleport(-18.9, -20.4, -Math.PI / 2); });
    await T.frames(4);
    check(await near(T) === 'kvarta', `the nap beside Stig's bed (${await near(T)})`);

    // 6. A full shelf.
    await T.until(() => __game.room107.restT <= 0, 8000);
    await at(T, 'rum107Hylla');
    await T.tap('KeyE');
    await T.sleep(1400);
    check((await toasts(T)).some((t) => t.includes(cfg.shelf.full)), 'Ole: "Alle sju! Nå er hylla full."');

    // 7. The save dresses the room after a reload.
    await T.ev(() => __game.save());
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1`, { waitUntil: 'load' });
    await T.until(() => window.__ready === true, 120000);
    await T.frames(10);
    r = await room(T);
    T.log('reload', JSON.stringify(r));
    check(r.gadgets.length === 7 && r.fins === 3 && r.after.length === 3, 'a reload: the room as it was');
    await T.ev(() => localStorage.removeItem('charter-and-run-v1'));

    // 8. A mission start: none of the three; a held giraffe goes back.
    await T.fresh('&mission=12');
    await T.ev(() => { const g = __game; g.unlock('bodega'); g.unlock('samba'); });
    await at(T, 'rum107Giraff');
    await T.tap('KeyE');
    await T.frames(3);
    check(await T.ev(() => __game.player.anim.giraffe), 'holding it at index 12');
    await T.ev(() => __game.missions.begin());
    await T.until(() => __game.missions.state !== 'idle', 5000);
    await T.frames(5);
    r = await T.ev(() => { const g = __game, ids = ['rum107:hylla', 'rum107:giraff', 'rum107:radio'];
      return { usable: g.interactables.filter((i) => ids.includes(i.id) && i.enabled(g)).map((i) => i.id), held: g.player.anim.giraffe, bed: g.room107.world.after.giraff.visible }; });
    T.log('mission', JSON.stringify(r));
    check(!r.usable.length && !r.held && r.bed, 'a mission start: none usable, the giraffe back on the bed');

    // 9. The flight level: inert.
    await T.fresh('&mission=1');
    r = await T.ev(() => ({ live: __game.room107.live, usable: __game.interactables.filter((i) => /^rum107:/.test(i.id) && i.enabled(__game)).length }));
    check(!r.live && !r.usable, 'the flight level: inert');
  },

  async troferum(T) {
    await T.fresh('&mission=13');
    await T.ev(() => { __game.day.run = false; });
    const hide = () => T.ev(() => { const p = __game.player; p.teleport(-30, -40, 0); });
    // Bare, as buss17's cut frames it.
    await hide();
    await patio(T, 5.5);
    await T.frames(8);
    await T.shot('troferum_1_bar');
    await T.ev(() => __game.endCut());
    // Mid-trip: four gadgets and three fins (julafton's knock cut, dist 7.5, and the havsutsikt one).
    await collect(T, 'prylar', MID);
    await collect(T, 'fenor', ['fena_flamenco', 'fena_suntrip', 'fena_plaza']);
    await T.sleep(2500);
    await patio(T, 7.5);
    await T.frames(8);
    await T.shot('troferum_2_mitt_knack');
    await patio(T, 5.5);
    await T.frames(8);
    await T.shot('troferum_3_mitt');
    await T.ev(() => __game.endCut());
    // Stig at the shelf checking it (the chase camera behind him).
    await at(T, 'rum107Hylla');
    await T.tap('KeyE');
    await T.sleep(1600);
    await T.shot('troferum_4_hyllan');
    // After julafton: all of it.
    await collect(T, 'prylar');
    await collect(T, 'fenor');
    await T.ev(() => __game.unlock('bodega'));
    await T.sleep(3000);
    await hide();
    await patio(T, 5.5);
    await T.frames(8);
    await T.shot('troferum_5_julafton');
    await T.ev(() => __game.endCut());
    // Close: the shelf, the pile and the giraffe, the suitcase and the pack.
    const look = (from, to) => T.ev((from, to) => { __game.cam.cutTo({ x: from[0], y: from[1], z: from[2] }, { x: to[0], y: to[1], z: to[2] }); }, from, to);
    await look([-18, 2.3, -17.6], [-18, 2.8, -21.4]);
    await T.frames(8);
    await T.shot('troferum_6_hylla_nara');
    await look([-18.3, 1.8, -17.2], [-20.0, 0.6, -19.9]);
    await T.frames(8);
    await T.shot('troferum_7_fenor_giraff');
    await look([-17.4, 1.6, -17.4], [-15.9, 0.5, -19.3]);
    await T.frames(8);
    await T.shot('troferum_8_vaska_knacke');
    await T.ev(() => __game.cam.release());
    // Stig with the giraffe.
    await at(T, 'rum107Giraff', 0.6);
    await T.tap('KeyE');
    await T.sleep(700);
    await T.shot('troferum_9_giraffen');
    await T.until(() => !__game.player.anim.giraffe, 10000);
    // The nap after julafton: the giraffe beside him on the bed.
    await T.ev(() => { const p = __game.player; p.teleport(-18.85, -20.4, -Math.PI / 2); });
    await T.frames(4);
    await T.ev(() => { __game.day.nap(); });
    await T.until(() => __game.day.napping && !__game.day.over, 20000);
    await T.sleep(300);
    await T.shot('troferum_10_tupplur');
    await T.until(() => !__game.day.busy, 30000);
  },
};
