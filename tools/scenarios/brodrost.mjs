// Kontrollerad av G17 (free roam, DESIGN §10.24; feature 33): brodrost, rostar.
//   brodrost: at index 9 (free roam): the pool bar's toaster prompts "Kontrollera brödrosten" from its
//             front; E starts a try (the objective card with the pale-to-burnt bar, its zone and the
//             marker, the prompt "Upp med brödet!"); E early is "Blekt. Underkänd." (pale bread, the
//             toast, nothing collected); left to the end it burns on its own ("Det här hade aldrig gått
//             igenom på lagret.", black bread, a sister's "Bara de inte är ingenjörer." from the pool
//             deck); E in the golden field (a real key press) passes it: "Gyllenbrun. Godkänd!", +250,
//             1/7, the label on, golden bread up, no prompt, no minimap marker; the next try's sweep is
//             × 0.92. A try is off 3 m away and at a mission start (no prompt, no markers in it); at
//             index 8 Berra's talk at the bar does not hide the toaster's prompt at its front. All
//             seven: the set's 1000 and Majsan on the radio; the save keeps them (v 1) and a reload
//             shows them labelled; a v 1 save without the set loads with none. The flight level: inert.
//   rostar:   every toaster on its landmark (on its top, facing its yaw), reachable from its front
//             with the toaster's prompt (nothing else's), a shot of each coming up to it and a close
//             one, asnan's cut to the FERRETERÍA front, the pool bar's in its three looks.
import { check } from '../lib.mjs';

const PI = Math.PI;
const IDS = ['ferreteria', 'poolbar', 'marknad', 'portier', 'supermercado', 'grillpaco', 'hittegods'];
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
const said = (T) => T.ev(() => window.__said.slice());
// The toaster `id`: { x, y, z, yaw, alive, marked, bread, up, lever, label, visible }.
const toaster = (T, id) => T.ev((id) => {
  const g = __game, c = g.collectibles.brodrostar.find((q) => q.id === id), t = c.mesh.userData.toaster;
  return { id, x: c.x, y: c.y, z: c.z, yaw: c.mesh.rotation.y, alive: c.alive, marked: c.marked, visible: c.mesh.visible,
    bread: t.bread.children.find((s) => s.visible)?.name, up: +(t.bread.position.y / 0.1).toFixed(2), lever: +t.lever.position.y.toFixed(3), label: t.label.visible };
}, id);
// Stig `d` m in front of toaster `id`, facing it, the camera behind him (turned `cam` rad).
async function front(T, id, d = 0.9, cam = 0) {
  await T.ev((id, d, cam) => {
    const g = __game, c = g.collectibles.brodrostar.find((q) => q.id === id), a = c.mesh.rotation.y, p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.teleport(c.x + Math.sin(a) * d, c.z + Math.cos(a) * d, a + Math.PI);
    p.vx = p.vz = 0;
    g.cam.yaw = a + Math.PI + cam; g.cam.snapNext = true;
    __game.peds.forEach((ped) => { if (Math.hypot(ped.char.x - c.x, ped.char.z - c.z) < 30) ped.char.teleport(c.x + 300, c.z + 300); });
  }, id, d, cam);
  await T.frames(10);
}
const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? (it.type === 'it' ? it.it.id : it.type) : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
const card = (T) => T.ev(() => {
  const o = document.getElementById('objective');
  return { show: o.classList.contains('show'), title: o.querySelector('.obj-title').textContent, text: o.querySelector('.obj-text').textContent,
    bar: o.querySelector('.obj-bar').style.display !== 'none', zone: o.querySelector('.obj-zone').style.display === 'block', marker: o.querySelector('.obj-marker').style.display === 'block' };
});
const active = (T) => T.ev(() => { const a = __game.toasters.active; return a ? { id: a.c.id, mk: +a.mk.toFixed(3), zone: a.zone, secs: +a.secs.toFixed(3) } : null; });
const last = (T) => T.ev(() => __game.toasters.last);
// Toaster markers on the minimap (at toaster `id` only, if given).
const rostMarkers = (T, id) => T.ev((id) => {
  const c = id && __game.collectibles.brodrostar.find((q) => q.id === id);
  return __game.mapMarkers(false).filter((m) => m.type === 'rost' && (!c || Math.hypot(m.x - c.x, m.z - c.z) < 0.01)).length;
}, id);
const toasts = (T) => T.ev(() => [...document.querySelectorAll('#toasts .toast')].map((t) => t.textContent));
// Wait out the pop (restSecs) before the next E.
const rest = (T) => T.until(() => __game.toasters.restT <= 0, 5000);
// Pass toaster `id` without timing it by hand: start, the marker in its field, E.
const pass = (T, id) => T.ev((id) => {
  const g = __game, t = g.toasters, c = g.collectibles.brodrostar.find((q) => q.id === id);
  t.restT = 0;
  t.press(c);
  t.active.mk = (t.active.zone[0] + t.active.zone[1]) / 2;
  t.press(c);
  return t.last.kind;
}, id);

export const SCENARIOS = {
  async brodrost(T) {
    await T.fresh('&mission=9');
    await resetSaid(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');
    const cfg = await T.ev(() => ({ ...__game.toasters.cfg }));
    const list = await T.ev(() => __game.collectibles.brodrostar.map((c) => c.id));
    check(JSON.stringify(list) === JSON.stringify(IDS), `seven toasters (${list})`);
    await T.ev(() => { const l = window.__lm('golf'); __game.player.teleport(l.x, l.z, 0); });
    await T.frames(5);
    check(await rostMarkers(T) === 0, 'no toaster marker far off (at the golf)');

    // 1. The prompt at the pool bar's toaster.
    await front(T, 'poolbar');
    let r = { near: await near(T), prompt: await prompt(T), markers: await rostMarkers(T, 'poolbar'), t: await toaster(T, 'poolbar') };
    T.log('poolbar', JSON.stringify(r));
    check(r.near === 'brodrost:poolbar' && /Kontrollera brödrosten/.test(r.prompt), 'its prompt from the front');
    check(r.markers === 1 && r.t.alive && !r.t.label && r.t.bread === 'pale' && r.t.up === 1, 'a minimap marker; pale bread up, no label');
    await T.shot('brodrost_1_poolbar');

    // 2. Early: pale.
    const coins0 = await T.ev(() => __game.coins);
    await T.tap('KeyE');
    r = { a: await active(T), card: await card(T), prompt: await prompt(T), t: await toaster(T, 'poolbar') };
    T.log('try', JSON.stringify(r));
    check(r.a && r.a.id === 'poolbar' && Math.abs(r.a.secs - cfg.secs) < 1e-3, 'E starts a try (the first at secs)');
    check(r.card.show && /KONTROLLERAD AV G17/.test(r.card.title) && r.card.bar && r.card.zone && r.card.marker, 'the card: title, bar, zone, marker');
    check(/Upp med brödet/.test(r.prompt) && r.t.up === 0 && r.t.lever < 0.1, 'the prompt to pop; bread down, lever down');
    await T.sleep(250);
    await T.shot('brodrost_2_bar');
    check((await active(T)).mk < (await active(T)).zone[0], 'still pale');
    await T.tap('KeyE');
    r = { last: await last(T), t: await toaster(T, 'poolbar'), card: await card(T), coins: await T.ev(() => __game.coins), n: await T.ev(() => __game.collected.brodrostar.size) };
    await T.frames(20);
    r.said = (await said(T)).map((s) => s[1]);
    r.toasts = await toasts(T);
    T.log('pale', JSON.stringify(r));
    check(r.last.kind === 'pale' && r.t.bread === 'pale' && r.t.alive && !r.t.label && !r.card.show, 'pale: pale bread, no label, the card gone');
    check(r.said.includes(cfg.lines.pale) && r.toasts.some((t) => t.includes('För blekt')), 'pale: Stig\'s line and the toast');
    check(r.coins === coins0 && r.n === 0, 'pale: nothing collected');

    // 3. Left to the end: burnt, a sister's line from the pool deck.
    await rest(T);
    await T.ev(() => { window.__said = []; });
    await T.tap('KeyE');
    await T.until(() => !__game.toasters.active, 8000);
    r = { last: await last(T), t: await toaster(T, 'poolbar'), flail: await T.ev(() => __game.player.anim.flail) };
    await T.frames(6);
    await T.shot('brodrost_3_burnt');
    await T.sleep(1600);
    r.said = await said(T);
    r.toasts = await toasts(T);
    T.log('burnt', JSON.stringify(r));
    check(r.last.kind === 'burnt' && r.last.mk >= 1 && r.t.bread === 'burnt' && r.t.alive, 'burnt on its own at the end');
    check(r.flail && r.said.some((s) => s[0] === 'stig' && s[1] === cfg.lines.burnt) && r.toasts.some((t) => t.includes('Bränt! Underkänd.')), 'burnt: Stig flails, his line, the toast');
    check(r.said.some((s) => (s[0] === 'siv' || s[0] === 'majsan') && s[1] === cfg.sister.line), 'a sister: "Bara de inte är ingenjörer."');

    // 4. In the golden field, by a real key press.
    await rest(T);
    await T.ev(() => { window.__said = []; });
    await T.tap('KeyE');
    await T.until(() => { const a = __game.toasters.active; return a && a.mk >= a.zone[0] + 0.04; }, 8000);
    await T.tap('KeyE');
    r = { last: await last(T), t: await toaster(T, 'poolbar'), cheer: await T.ev(() => __game.player.anim.cheer), coins: await T.ev(() => __game.coins), n: await T.ev(() => __game.collected.brodrostar.size) };
    await T.frames(12);
    await T.shot('brodrost_4_ok');
    r.said = (await said(T)).map((s) => s[1]);
    r.collect = await T.ev(() => document.getElementById('collect').textContent);
    r.near = await near(T);
    r.markers = await rostMarkers(T, 'poolbar');
    T.log('ok', JSON.stringify(r));
    check(r.last.kind === 'ok' && r.last.mk >= r.last.zone[0] && r.last.mk <= r.last.zone[1], 'E in the field passes it');
    check(r.n === 1 && r.coins === coins0 + 250 && /G17-brödrostar\s*1\/7/.test(r.collect), '+250 and 1/7');
    check(r.t.marked && !r.t.alive && r.t.visible && r.t.label && r.t.bread === 'golden', 'it stays, labelled, golden bread');
    check(r.cheer && r.said.includes(cfg.lines.ok), 'Stig cheers: "Gyllenbrun. Godkänd!"');
    check(r.near !== 'brodrost:poolbar' && r.markers === 0, 'no prompt and no marker at a passed one');
    await T.ev(() => { const c = __game.collectibles.brodrostar.find((q) => q.id === 'poolbar'); __game.cam.cutTo({ x: c.x - 1.0, y: c.y + 0.45, z: c.z + 0.55 }, { x: c.x, y: c.y + 0.12, z: c.z }); });
    await T.frames(6);
    await T.shot('brodrost_5_label');
    await T.ev(() => __game.cam.release());

    // 5. The next one is faster; walking off calls a try off.
    await front(T, 'portier');
    check(await near(T) === 'brodrost:portier', 'the porter desk\'s toaster prompts');
    await T.tap('KeyE');
    r = { a: await active(T) };
    check(r.a && Math.abs(r.a.secs - cfg.secs * cfg.speedUp) < 1e-3, `the second sweep × speedUp (${r.a?.secs})`);
    await T.ev(() => { const p = __game.player; p.teleport(p.x, p.z + 4, 0); });
    await T.frames(5);
    r = { a: await active(T), t: await toaster(T, 'portier'), card: await card(T) };
    T.log('walk off', JSON.stringify(r));
    check(!r.a && r.t.up === 1 && r.t.lever > 0.15 && !r.card.show, 'off 4 m away: bread up, no card');

    // 6. A mission start calls a try off; no prompt, no markers in it.
    await front(T, 'portier');
    await T.tap('KeyE');
    check(!!(await active(T)), 'a try under way');
    await T.ev(() => __game.missions.begin());
    await T.until(() => __game.missions.state !== 'idle', 5000);
    await T.frames(5);
    r = { a: await active(T), live: await T.ev(() => __game.toasters.live), canUse: await T.ev(() => __game.collectibles.brodrostar.some((c) => __game.toasters.canUse(c))),
      markers: await T.ev(() => __game.mapMarkers(false).filter((m) => m.type === 'rost').length), t: await toaster(T, 'portier') };
    T.log('mission', JSON.stringify(r));
    check(!r.a && !r.live && !r.canUse && r.markers === 0 && r.t.up === 1, 'a mission start: the try off, none usable, no markers');

    // 7. Index 8: Berra at the bar is the giver; the toaster's prompt still shows at its front.
    await T.fresh('&mission=8');
    await front(T, 'poolbar');
    r = { near: await near(T), giver: await T.ev(() => { const g = __game, b = g.npc('berra'); return { at: [+b.x.toFixed(2), +b.z.toFixed(2)], d: +Math.hypot(b.x - g.player.x, b.z - g.player.z).toFixed(2) }; }) };
    T.log('index 8', JSON.stringify(r));
    check(r.near === 'brodrost:poolbar', 'at index 8 the toaster\'s prompt, not Berra\'s talk');

    // 8. All seven: the bonus and Majsan on the radio.
    await T.fresh('&mission=9');
    const c0 = await T.ev(() => __game.coins);
    for (const id of IDS) {
      await front(T, id);
      await rest(T);
      check(await near(T) === 'brodrost:' + id, `${id}: its prompt`);
      check(await pass(T, id) === 'ok', `${id}: passed`);
    }
    await T.sleep(3000);
    r = { coins: await T.ev(() => __game.coins), n: await T.ev(() => __game.collected.brodrostar.size), toasts: await toasts(T), legend: await T.ev(() => __game.mapLegend()) };
    T.log('7/7', JSON.stringify(r));
    check(r.n === 7 && r.coins === c0 + 7 * 250 + 1000, '7/7: 7 × 250 + 1000');
    check(r.toasts.some((t) => t.includes('Så det är du som är G17!')), 'Majsan on the radio');
    check(/G17-brödrostar <b>7\/7<\/b>/.test(r.legend), 'the big map\'s legend counts them');

    // 9. The save keeps them (v 1); a reload shows them labelled.
    const sv = await T.ev(() => { __game.save(); return JSON.parse(localStorage.getItem('charter-and-run-v1')); });
    T.log('save', JSON.stringify(sv.collected));
    check(sv.v === 1 && sv.collected.brodrostar.length === 7 && Array.isArray(sv.collected.prylar) && Array.isArray(sv.collected.fenor), 'saved, v 1');
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1`, { waitUntil: 'load' });
    await T.until(() => window.__ready === true, 120000);
    await T.frames(10);
    r = await T.ev(() => { const g = __game; return { n: g.collected.brodrostar.size, all: g.collectibles.brodrostar.every((c) => c.marked && !c.alive && c.mesh.visible && c.mesh.userData.toaster.label.visible) }; });
    T.log('reload', JSON.stringify(r));
    check(r.n === 7 && r.all, 'a reload: all seven labelled');
    // A v 1 save from before the set: none of it.
    await T.ev(() => { const s = JSON.parse(localStorage.getItem('charter-and-run-v1')); delete s.collected.brodrostar; localStorage.setItem('charter-and-run-v1', JSON.stringify(s)); });
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1`, { waitUntil: 'load' });
    await T.until(() => window.__ready === true, 120000);
    r = await T.ev(() => { const g = __game; return { n: g.collected.brodrostar.size, alive: g.collectibles.brodrostar.every((c) => c.alive && !c.mesh.userData.toaster.label.visible) }; });
    T.log('old save', JSON.stringify(r));
    check(r.n === 0 && r.alive, 'an older v 1 save: no toaster passed');
    await T.ev(() => localStorage.removeItem('charter-and-run-v1'));

    // 10. The flight level: inert.
    await T.fresh('&mission=1');
    r = await T.ev(() => ({ live: __game.toasters.live, canUse: __game.collectibles.brodrostar.some((c) => __game.toasters.canUse(c)), card: __game.toasters.objective() }));
    check(!r.live && !r.canUse && !r.card, 'the flight level: inert');
  },

  async rostar(T) {
    await T.fresh('&mission=13');
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam after the end');
    const out = [];
    for (const id of IDS) {
      const r = await T.ev((id) => {
        const g = __game, c = g.collectibles.brodrostar.find((q) => q.id === id), l = window.__lm('brodrost_' + id);
        return { id, lm: !!l, onLm: !!l && Math.hypot(c.x - l.x, c.z - l.z) < 1e-6 && Math.abs(c.y - l.y) < 1e-6, yaw: +(c.mesh.rotation.y - l.yaw).toFixed(4), x: +c.x.toFixed(2), y: c.y, z: +c.z.toFixed(2) };
      }, id);
      await front(T, id);
      r.near = await near(T);
      r.prompt = await prompt(T);
      r.stig = await T.ev(() => { const p = __game.player; return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]; });
      out.push(r);
      T.log(id, JSON.stringify(r));
      // Close, beside him (the chase eye behind him has him in front of it).
      await T.ev((id) => {
        const g = __game, c = g.collectibles.brodrostar.find((q) => q.id === id), a = c.mesh.rotation.y;
        const fx = Math.sin(a), fz = Math.cos(a), rx = -Math.cos(a), rz = Math.sin(a);
        g.cam.cutTo({ x: c.x + fx * 1.2 + rx * 1.1, y: c.y + 0.6, z: c.z + fz * 1.2 + rz * 1.1 }, { x: c.x, y: c.y + 0.1, z: c.z });
      }, id);
      await T.frames(6);
      await T.shot('rostar_' + id + '_nara');
      await T.ev(() => __game.cam.release());
      // Coming up to it, 3 m off, the camera a little round so he does not hide it.
      await front(T, id, 3, 0.5);
      await T.shot('rostar_' + id);
    }
    for (const r of out) {
      check(r.lm && r.onLm && Math.abs(r.yaw) < 1e-3, `${r.id}: on its landmark, facing its yaw`);
      check(r.near === 'brodrost:' + r.id && /Kontrollera brödrosten/.test(r.prompt), `${r.id}: its prompt from the front (${r.near})`);
    }
    // asnan's cut to the FERRETERÍA front ("Og så maler vi den rød."): the toaster on the crate in it.
    await T.ev(() => { const l = window.__lm('cita'); __game.player.teleport(l.x, l.z, 0); __game.cutTo('ferreteria'); });
    await T.frames(8);
    await T.shot('rostar_asnan_cut');
    await T.ev(() => __game.endCut());
    // The pool bar's in its three looks.
    for (const look of ['pale', 'burnt', 'golden']) {
      await T.ev((look) => {
        const g = __game, c = g.collectibles.brodrostar.find((q) => q.id === 'poolbar'), t = c.mesh.userData.toaster;
        for (const s of t.bread.children) s.visible = s.name === look;
        t.label.visible = look === 'golden';
        g.cam.cutTo({ x: c.x - 0.9, y: c.y + 0.4, z: c.z + 0.5 }, { x: c.x, y: c.y + 0.12, z: c.z });
      }, look);
      await T.frames(6);
      await T.shot('rostar_look_' + look);
    }
    await T.ev(() => __game.cam.release());
  },
};
