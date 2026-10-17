// Stig på löpande band – sortera tomater i packhuset (free roam, DESIGN §10.49; feature 109): packhus,
// packhusbalans.
//   packhus: at index 8 between missions, by day, the foreman in his cap on the packing shed's yard and
//         nothing of the belt (not built); 6 m off he waves and calls "¡Señor! Vi behöver folk till
//         skiftet!", at him the prompt "E Ta ett skift". E: the black fade, then the belt, its bins, two
//         workers and the foreman by its end, Stig behind it at his spot facing the camera (inDialog), the
//         camera cut, the foreman's "Röda i ROJOS, …" and Stig's "Jag är van vid kvalitetskontroll.", the
//         card SORTERA TOMATER · Tomat 0 / 40 · Lådor 0 · TAPPADE 0 / 8 and the keys' line; W does not move
//         him. With the belt held: A on a red in the zone throws it into ROJOS, S a rotten one into the
//         bucket, D a green one into VERDES; A on a green one bounces it out of ROJOS onto the ground (one
//         dropped, "Den är grön, señor!"); a key with nothing in the zone does nothing. Five reds: the
//         stamp, the label on the crate, "Kontrollerad av G17.", the crate on its stack and a new one on
//         the bin. A tomato let past the zone drops onto the pile. The foreman's two hurries; the belt's
//         speed rises from 0.75 to 1.9 m/s. A whole shift (the autopilot): 100 pta, the stamp KONTROLLERAD
//         AV G17, "¡Muy bien, señor! Hundra pesetas.", Stig's G17 line, the card with NYTT REKORD!,
//         records.packhus saved; the fade, and the belt, bins and workers gone, Stig beside the foreman
//         with the prompt again, the coins only the pay. Siv at the pool: "Spänn av, Stig-Helmer. Du är
//         ledig." once. A second shift let go: TOMATRAS (eight dropped): the belt's tomatoes rolling off,
//         Stig's arms out with two in his hands and "Ursäkta… ett ögonblick bara…", the foreman's lines, no
//         pay, the card with the record. Q: "Redan trött, señor?". The call again: "¡Señor! Ett skift
//         till?". A kick bowls the foreman over (SKANDAL), no prompt until he is back on his spot. By night
//         nobody on the yard and no prompt. No prompt in a car, in a pursuit or in a mission; a mission
//         start mid-shift takes the belt away at once (`last.kind` 'gone'); start() by hand in a mission
//         does nothing. Shots `packhus_gard`, `_prompt`, `_intro`, `_sortera`, `_fel`, `_lada`, `_fort`,
//         `_stampel`, `_klart`, `_efter`, `_siv`, `_ras`, `_natt`.
//   packhusbalans: the shift's balance with the autopilot (`PACKHUS_RUNS` shifts a model, default 3): the
//         reaction from a tomato's being the front one in the zone to the key, and a share of wrong keys.
//         A quick clean player (0.3 s) and a slow clean one (0.55 s) finish every shift; 15 % wrong keys
//         at 0.45 s still finish most; a careless one (30 % wrong) brings the pile down (logged, the last
//         two as information).
import { check } from '../lib.mjs';

const raf = (T, fn, timeout = 20000, ...args) => T.page.waitForFunction(fn, { timeout, polling: 'raf' }, ...args);

async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js');
    window.__said = []; window.__toasts = []; window.__fades = [];
    const fade = hud.fade.bind(hud);
    hud.fade = (on) => { window.__fades.push([!!on, __game.packhus.sc?.phase ?? null]); return fade(on); };
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t === g.packhus.boss ? 'boss' : t?.key || 'x', text]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text.replace(/<[^>]+>/g, '')); return toast(text, ...a); };
    window.__hud = hud;
  });
}
const clearSpies = (T) => T.ev(() => { window.__said = []; window.__toasts = []; });
const said = (T) => T.ev(() => window.__said.map(([w, t]) => `${w}: ${t}`));

// Stig on foot `back` m south of the foreman's spot, facing him, the camera behind him.
async function atBoss(T, back = 1.6, dx = 0) {
  await T.ev((back, dx) => {
    const g = __game, s = g.packhus.bossSpot();
    if (g.playerCar) g.exitCar(true);
    g.player.state = 'normal';
    g.debugWarp(s.x + dx, s.z + back, Math.PI);
    g.cam.yaw = Math.PI; g.cam.snapNext = true;
  }, back, dx);
  await T.frames(8);
}
const st = (T) => T.ev(() => {
  const g = __game, P = g.packhus, s = P.sc, p = g.player, b = P.boss, sp = P.bossSpot(), it = g.nearestInteractable();
  const card = document.getElementById('objective'), on = card.classList.contains('show');
  return {
    phase: s?.phase ?? null, built: P.built, belt: !!P.root?.visible, workers: (P.workers || []).filter((w) => w.root.visible).length,
    shown: P.shown, bossVis: b.root.visible, bossD: +Math.hypot(b.x - sp.x, b.z - sp.z).toFixed(2), bossSt: b.state, wave: !!b.anim.wave,
    near: it?.type === 'it' ? it.it.id : it?.type || null, prompt: window.__hud._prompt || '', inDialog: g.inDialog, cine: !!g.cam.cine,
    card: on ? { title: card.querySelector('.obj-title').textContent, text: card.querySelector('.obj-text').textContent, bar: card.querySelector('.obj-bar-label').textContent } : null,
    x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), sort: p.anim.sort || null, coins: g.coins, ms: g.missions.state,
    v: s?.v != null ? +s.v.toFixed(3) : null, vAt: s?.spawned != null ? [P.speedAt((s.spawned - 1) / P.cfg.count), P.speedAt(s.spawned / P.cfg.count)].map((v) => +v.toFixed(3)) : null, spawned: s?.spawned, sorted: s?.sorted, dropped: s?.dropped, filled: s?.filled, wrong: s?.wrong,
    toms: s?.toms ? s.toms.reduce((a, t) => { a[t.st] = (a[t.st] || 0) + 1; return a; }, {}) : null, last: P.last, best: g.records.packhus ?? null,
  };
});
// The frontmost tomato in the zone, waiting there (the belt held).
async function inZone(T) {
  await raf(T, () => !!__game.packhus.inZone(), 30000);
  await T.ev(() => { __game.packhus.sc.hold = true; });
  await T.frames(2);
  return T.ev(() => { const t = __game.packhus.inZone(); return { kind: t.kind, id: t.id, x: +t.x.toFixed(2) }; });
}
const tom = (T, id) => T.ev((id) => { const t = __game.packhus.sc.toms.find((q) => q.id === id); return t && { st: t.st, kind: t.kind, crate: t.crate ? t.crate.kind : null, x: +t.x.toFixed(2), y: +t.y.toFixed(2), z: +t.z.toFixed(2) }; }, id);
// E at the foreman, through the fade to the intro.
async function shift(T) {
  await atBoss(T);
  await T.tap('KeyE');
  await raf(T, () => __game.packhus.sc?.phase === 'intro', 10000);
}

export const SCENARIOS = {
  async packhus(T) {
    await T.fresh('&mission=8');
    await spies(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island' && __game.day.isDay()), 'free roam on the island, by day');
    const coins0 = await T.ev(() => __game.coins);

    // 1. The foreman on the yard, nothing of the belt; he waves and calls; the prompt at him.
    await atBoss(T, 14);
    let r = await st(T);
    check(r.shown && r.bossVis && r.bossD < 0.2 && !r.built && !r.belt && r.workers === 0, `the foreman on his spot, no belt (${JSON.stringify(r)})`);
    await clearSpies(T);
    await atBoss(T, 6, 2);
    await T.frames(10);
    r = await st(T);
    let lines = await said(T);
    check(r.wave && lines.includes('boss: ¡Señor! Vi behöver folk till skiftet!'), `6 m off he waves and calls (${r.wave}, ${lines})`);
    check(r.near !== 'packhus', `no prompt 6 m off (${r.near})`);
    await T.shot('packhus_gard');
    await atBoss(T, 1.6, 1);
    r = await st(T);
    T.log('at the foreman', JSON.stringify(r));
    check(r.near === 'packhus' && /Ta ett skift/.test(r.prompt) && !r.wave, `the prompt "E Ta ett skift" at him (${r.near}, "${r.prompt}")`);
    await T.shot('packhus_prompt');

    // 2. E: the fade, then the belt, the workers, Stig behind the belt, the cut, the intro.
    await clearSpies(T);
    await T.tap('KeyE');
    r = await st(T);
    check(r.inDialog && r.phase !== null, `E: the shift begins (${r.phase})`);
    await T.ev(() => { __game.packhus.sc.next = ['rojo', 'podrido', 'verde', 'verde', 'rojo', 'rojo', 'rojo', 'rojo', 'rojo', 'verde', 'rojo']; });
    await raf(T, () => __game.packhus.sc?.phase === 'intro', 10000);
    await T.frames(4);
    const fades = await T.ev(() => window.__fades.slice());
    check(JSON.stringify(fades) === '[[true,"in"],[false,"intro"]]', `behind a black fade (${JSON.stringify(fades)})`);
    r = await st(T);
    const spot = await T.ev(() => { const P = __game.packhus, s = P.at(P.cfg.stig.at), b = P.at(P.cfg.boss.shiftAt); return { x: s.x, z: s.z, bx: b.x, bz: b.z }; });
    T.log('intro', JSON.stringify(r));
    check(r.belt && r.workers === 2 && r.cine && r.inDialog && Math.hypot(r.x - spot.x, r.z - spot.z) < 0.05 && Math.abs(r.yaw) < 0.01,
      `the belt, two workers, the cut, Stig at the belt facing the camera (${JSON.stringify(r)})`);
    const bossAt = await T.ev(() => { const b = __game.packhus.boss; return { x: b.x, z: b.z }; });
    check(Math.hypot(bossAt.x - spot.bx, bossAt.z - spot.bz) < 0.1, `the foreman by the belt's end (${JSON.stringify(bossAt)})`);
    check(r.card && r.card.title === 'SORTERA TOMATER' && r.card.text === 'Tomat 0 / 40 · Lådor 0' && r.card.bar === 'TAPPADE 0 / 8', `the card (${JSON.stringify(r.card)})`);
    check(/Röda/.test(r.prompt) && /Ruttna/.test(r.prompt) && /Gröna/.test(r.prompt) && /Sluta/.test(r.prompt), `the keys' line ("${r.prompt}")`);
    await raf(T, () => __game.packhus.sc?.t > 2.2, 10000);
    lines = await said(T);
    check(lines.includes('boss: Röda i ROJOS, gröna i VERDES, ruttna i hinken. ¡Vamos!') && lines.includes('stig: Jag är van vid kvalitetskontroll.'), `the intro's lines (${lines})`);
    await T.shot('packhus_intro');
    await T.hold(['KeyW'], 400);
    r = await st(T);
    check(Math.hypot(r.x - spot.x, r.z - spot.z) < 0.05, `W does not move him (${r.x}, ${r.z})`);

    // 3. The keys, the belt held: A a red into ROJOS, S a rotten one into the bucket, D a green one into VERDES.
    await raf(T, () => __game.packhus.sc?.phase === 'run', 10000);
    let z = await inZone(T);
    check(z.kind === 'rojo', `the first tomato in the zone is the forced red (${JSON.stringify(z)})`);
    await T.tap('KeyA');
    r = await st(T);
    check(r.sort === 'R', `A: Stig throws to his right (${r.sort})`);
    await raf(T, () => __game.packhus.sc.toms[0].st === 'box', 5000);
    let t = await tom(T, z.id);
    check(t.st === 'box' && t.crate === 'rojo', `A: the red in ROJOS (${JSON.stringify(t)})`);
    await T.shot('packhus_sortera');
    await T.ev(() => { __game.packhus.sc.hold = false; });
    z = await inZone(T);
    await T.tap('KeyS');
    await raf(T, (id) => __game.packhus.sc.toms.find((q) => q.id === id).st === 'gone', 5000, z.id);
    check(z.kind === 'podrido', `S: the rotten one into the bucket (${JSON.stringify(z)})`);
    await T.ev(() => { __game.packhus.sc.hold = false; });
    z = await inZone(T);
    await T.tap('KeyD');
    await raf(T, (id) => __game.packhus.sc.toms.find((q) => q.id === id).st === 'box', 5000, z.id);
    t = await tom(T, z.id);
    check(z.kind === 'verde' && t.crate === 'verde', `D: the green one into VERDES (${JSON.stringify(t)})`);
    r = await st(T);
    check(r.sorted === 3 && r.dropped === 0 && r.card.text === 'Tomat 3 / 40 · Lådor 0', `three sorted, none dropped (${JSON.stringify(r.card)})`);
    // A wrong key: A on a green one bounces it out of ROJOS onto the ground.
    await clearSpies(T);
    await T.ev(() => { __game.packhus.sc.hold = false; });
    z = await inZone(T);
    await T.tap('KeyA');
    await raf(T, (id) => __game.packhus.sc.toms.find((q) => q.id === id).st === 'ground', 5000, z.id);
    t = await tom(T, z.id);
    r = await st(T);
    lines = await said(T);
    check(z.kind === 'verde' && r.dropped === 1 && r.wrong === 1 && r.card.bar === 'TAPPADE 1 / 8' && lines.includes('boss: Den är grön, señor!'),
      `a wrong key: on the ground, one dropped, "Den är grön, señor!" (${JSON.stringify(t)}, ${r.card.bar}, ${lines})`);
    await T.shot('packhus_fel');
    // A key with nothing in the zone does nothing.
    await T.ev(() => { const P = __game.packhus; P.sc.hold = false; });
    await raf(T, () => !__game.packhus.inZone(), 10000);
    await T.ev(() => { __game.packhus.sc.hold = true; });
    const before = await st(T);
    await T.tap('KeyA');
    await T.frames(4);
    r = await st(T);
    check(r.sorted === before.sorted && r.dropped === before.dropped, `a key with an empty zone does nothing (${r.sorted}, ${r.dropped})`);

    // 4. Five reds: the stamp, the label, "Kontrollerad av G17.", the crate on its stack, a new one.
    await clearSpies(T);
    await T.ev(() => { const P = __game.packhus; P.sc.hold = false; P.auto = { react: 0.2 }; });
    await raf(T, () => __game.packhus.sc.filled >= 1, 30000);
    await T.ev(() => { __game.packhus.auto = null; });
    await raf(T, () => { const C = __game.packhus.crates.filter((c) => c.used && c.kind === 'rojo'); return C.some((c) => c.st === 'stack') && C.some((c) => c.st === 'bin' && c.pop >= 1); }, 10000);
    const crates = await T.ev(() => __game.packhus.crates.filter((c) => c.used).map((c) => ({ kind: c.kind, st: c.st, n: c.n, label: c.lab.visible, x: +c.mesh.position.x.toFixed(2), s: +c.mesh.scale.x.toFixed(2) })));
    lines = await said(T);
    T.log('crates', JSON.stringify(crates));
    const full = crates.find((c) => c.kind === 'rojo' && c.label);
    check(full && full.st === 'stack' && full.n === 5 && Math.abs(full.x - -2.9) < 0.01, `the full crate stamped and on its stack (${JSON.stringify(full)})`);
    check(crates.some((c) => c.kind === 'rojo' && c.st === 'bin' && !c.label && c.s > 0.99), 'a new crate on ROJOS');
    check(lines.includes('stig: Kontrollerad av G17.'), `"Kontrollerad av G17." (${lines})`);
    r = await st(T);
    check(r.card.text === `Tomat ${r.sorted + r.dropped} / 40 · Lådor 1`, `Lådor 1 on the card (${r.card.text})`);
    await T.shot('packhus_lada');

    // 5. A tomato let past the zone drops onto the pile.
    const d0 = r.dropped;
    await raf(T, (d) => __game.packhus.sc.dropped > d, 30000, d0);
    await raf(T, () => __game.packhus.sc.toms.some((q) => q.st === 'pile'), 5000);
    r = await st(T);
    check(r.dropped === d0 + 1 && r.toms.pile === 1, `let past: onto the pile (${JSON.stringify(r.toms)})`);

    // 6. Faster: the autopilot to the end of the shift; the foreman's two hurries, the speed.
    await T.ev(() => { __game.packhus.auto = { react: 0.3 }; });
    await raf(T, () => __game.packhus.sc.spawned >= 30, 90000);
    r = await st(T);
    // The speed follows the tomatoes come on (this frame's, before or after a spawn), here 1.58–1.61 m/s.
    check(r.v >= r.vAt[0] && r.v <= r.vAt[1] && r.v > 1.5, `the belt faster (${r.v} m/s at ${r.spawned}, ${r.vAt})`);
    await T.shot('packhus_fort');
    await raf(T, () => __game.packhus.sc.phase === 'end', 90000);
    await T.frames(6);
    r = await st(T);
    lines = await said(T);
    T.log('done', JSON.stringify(r.last), lines);
    check(lines.includes('boss: ¡Más rápido, señor!') && lines.includes('boss: Fortare, señor! ¡Rápido!'), `the foreman's two hurries (${lines})`);
    check(r.last.kind === 'done' && r.last.pay === 100 && r.coins === coins0 + 100 && r.last.record && r.best === r.last.boxes && r.last.boxes >= 4,
      `a whole shift: 100 pta, the record (${JSON.stringify(r.last)}, coins ${r.coins})`);
    const banner = await T.ev(() => { const b = document.getElementById('banner'); return { cls: b.className, text: b.querySelector('.banner-main').textContent }; });
    check(/stamp/.test(banner.cls) && banner.text === 'KONTROLLERAD AV G17', `the stamp (${JSON.stringify(banner)})`);
    await T.shot('packhus_stampel');
    const score = await T.ev(() => { const e = document.getElementById('score'); return { on: e.classList.contains('show'), main: e.querySelector('.score-main').textContent, sub: e.querySelector('.score-sub').textContent }; });
    check(score.on && score.main === `SKIFTET KLART · ${r.last.boxes} LÅDOR · 100 PTA` && score.sub === 'NYTT REKORD!', `the card (${JSON.stringify(score)})`);
    await raf(T, () => __game.packhus.sc?.t > 1.6, 10000);
    lines = await said(T);
    check(lines.includes('boss: ¡Muy bien, señor! Hundra pesetas.') && lines.includes("stig: Om det står 'Kontrollerad av G17' på lådan, så är det jag."), `the lines (${lines})`);
    await T.shot('packhus_klart');
    const saved = await T.ev(() => JSON.parse(localStorage.getItem('charter-and-run-v1')).records.packhus);
    check(saved === r.last.boxes, `records.packhus saved (${saved})`);

    // 7. The fade, and back on the yard: nothing of the belt, Stig beside the foreman, the prompt again.
    await raf(T, () => !__game.packhus.sc, 20000);
    await T.frames(10);
    r = await st(T);
    T.log('after', JSON.stringify(r));
    const after = await T.ev(() => { const P = __game.packhus; return P.at(P.cfg.after.at); });
    check(!r.belt && r.workers === 0 && !r.inDialog && !r.cine && Math.hypot(r.x - after.x, r.z - after.z) < 0.05 && r.bossD < 0.2 && r.near === 'packhus',
      `back on the yard, the belt gone, the prompt again (${JSON.stringify(r)})`);
    check(r.coins === coins0 + 100, `the coins: only the pay (${r.coins - coins0})`);
    await T.shot('packhus_efter');

    // 8. Siv at the pool, once.
    await clearSpies(T);
    await T.ev(() => { const g = __game, n = g.npc('siv'); g.debugWarp(n.x + 6, n.z, -Math.PI / 2); });
    await T.frames(10);
    await T.ev(() => { const g = __game, n = g.npc('siv'); g.debugWarp(n.x + 2.5, n.z, -Math.PI / 2); g.cam.yaw = -Math.PI / 2 + 0.7; g.cam.snapNext = true; });
    await T.until(() => window.__said.some(([w, t]) => w === 'siv' && /Stig-Helmer/.test(t)), 20000).catch(() => {});
    await T.frames(6);
    lines = await said(T);
    check(lines.filter((l) => l === 'siv: Spänn av, Stig-Helmer. Du är ledig.').length === 1, `Siv's "Spänn av, Stig-Helmer. Du är ledig." (${lines})`);
    await T.shot('packhus_siv');
    await T.ev(() => { const g = __game, n = g.npc('siv'); g.debugWarp(n.x + 12, n.z, -Math.PI / 2); });
    await T.frames(6);
    await T.ev(() => { const g = __game, n = g.npc('siv'); g.debugWarp(n.x + 2.5, n.z, -Math.PI / 2); });
    await T.frames(20);
    lines = await said(T);
    check(lines.filter((l) => /Stig-Helmer. Du är ledig/.test(l)).length === 1, `only once (${lines})`);

    // 9. A shift let go: TOMATRAS.
    await clearSpies(T);
    await T.ev(() => { __game.packhus.callT = -Infinity; });
    await atBoss(T, 6);
    await T.frames(10);
    lines = await said(T);
    check(lines.includes('boss: ¡Señor! Ett skift till?'), `the call again (${lines})`);
    await shift(T);
    await raf(T, () => __game.packhus.sc?.phase === 'run', 10000);
    await T.ev(() => { __game.packhus.auto = { react: 0.2 }; });
    await raf(T, () => __game.packhus.sc.filled >= 1 && __game.packhus.sc.toms.every((q) => q.st !== 'fly'), 60000);
    await T.ev(() => { __game.packhus.auto = null; });
    await raf(T, () => __game.packhus.sc.dropped >= 6, 60000);
    await raf(T, () => __game.packhus.sc.phase === 'end', 60000);
    await T.frames(12);
    r = await st(T);
    T.log('ras', JSON.stringify(r));
    const held = await T.ev(() => { const g = __game; return { placate: g.player.anim.placate, held: g.packhus.sc.toms.filter((q) => q.st === 'held').length }; });
    check(r.last.kind === 'ras' && r.dropped === 8 && r.last.pay === 0 && r.coins === coins0 + 100 && (r.toms.roll || 0) > 0 && !r.toms.belt && !r.toms.pile,
      `TOMATRAS: eight on the ground, everything rolling, no pay (${JSON.stringify(r)})`);
    check(held.placate === 2 && held.held === 2, `Stig's arms out with two in his hands (${JSON.stringify(held)})`);
    await raf(T, () => __game.packhus.sc?.t > 2.6, 10000);
    lines = await said(T);
    check(lines.includes('stig: Ursäkta… ett ögonblick bara…') && lines.includes('boss: ¡Ay, ay, ay! Tomaterna, señor!') && lines.includes('boss: Ingen fara, señor. Mañana igen?'),
      `the lines (${lines})`);
    const score2 = await T.ev(() => { const e = document.getElementById('score'); return { main: e.querySelector('.score-main').textContent, sub: e.querySelector('.score-sub').textContent }; });
    const best = await T.ev(() => __game.records.packhus);
    check(/^TOMATRAS · \d+ LÅD(A|OR)$/.test(score2.main) && (r.last.record ? score2.sub === 'NYTT REKORD!' : score2.sub === `REKORD: ${best} LÅDOR`), `the card (${JSON.stringify(score2)})`);
    await T.shot('packhus_ras');
    await raf(T, () => !__game.packhus.sc, 20000);

    // 10. Q ends a shift.
    await clearSpies(T);
    await shift(T);
    await raf(T, () => __game.packhus.sc?.phase === 'run', 10000);
    await T.tap('KeyQ');
    r = await st(T);
    lines = await said(T);
    check(r.last.kind === 'quit' && r.last.pay === 0 && lines.includes('boss: Redan trött, señor?'), `Q: "Redan trött, señor?" (${JSON.stringify(r.last)}, ${lines})`);
    await raf(T, () => !__game.packhus.sc, 20000);
    await T.frames(4);
    r = await st(T);
    check(!r.inDialog && !r.belt && r.coins === coins0 + 100, `free after Q (${r.inDialog}, ${r.coins})`);

    // 11. A kick bowls the foreman over; the prompt only once he is back on his spot.
    const v0 = await T.ev(() => __game.shame.v);
    await atBoss(T, 0.9);
    await T.tap('KeyJ');
    await T.frames(10);
    r = await st(T);
    const v1 = await T.ev(() => __game.shame.v);
    check(r.bossSt !== 'normal' && v1 > v0 && r.near !== 'packhus', `a kick: the foreman down, SKANDAL (${r.bossSt}, ${v0} -> ${v1}, ${r.near})`);
    await T.ev(() => { const g = __game, s = g.packhus.bossSpot(); g.debugWarp(s.x - 2.5, s.z + 2.5, Math.PI); });
    await T.until(() => __game.packhus.boss.state === 'normal' && Math.hypot(__game.packhus.boss.x - __game.packhus.bossSpot().x, __game.packhus.boss.z - __game.packhus.bossSpot().z) < 0.2, 20000);
    await T.ev(() => { __game.shame.v = 0; });
    await atBoss(T);
    r = await st(T);
    check(r.near === 'packhus', `back on his spot: the prompt (${r.near})`);

    // 12. By night nobody on the yard and no prompt.
    await T.ev(() => { const g = __game, s = g.packhus.bossSpot(); g.debugWarp(s.x + 120, s.z + 40, 0); g.day.set(22.5); });
    await T.frames(10);
    await atBoss(T);
    r = await st(T);
    check(!r.shown && !r.bossVis && r.near !== 'packhus', `by night nobody on the yard (${r.shown}, ${r.near})`);
    await T.shot('packhus_natt');
    await T.ev(() => { const g = __game, s = g.packhus.bossSpot(); g.day.set(15); g.debugWarp(s.x + 120, s.z + 40, 0); });
    await T.frames(6);
    await atBoss(T);
    r = await st(T);
    check(r.shown && r.near === 'packhus', `by day again (${r.shown}, ${r.near})`);

    // 13. No prompt in a car or a pursuit; a mission start mid-shift; nothing in a mission.
    await T.ev(() => { const g = __game, s = g.packhus.bossSpot(), c = g.ensureNamedCar('hyrbil'); c.place(s.x - 3, s.z + 3, 0); g.enterCar(c); });
    await T.frames(6);
    r = await st(T);
    check(r.near !== 'packhus' && !/Ta ett skift/.test(r.prompt), `no prompt at the wheel (${r.near}, "${r.prompt}")`);
    await T.ev(() => { const g = __game; g.exitCar(true); const c = g.named.hyrbil; c.place(c.home.x, c.home.z, c.home.yaw); });
    await atBoss(T);
    await T.ev(() => { const s = __game.shame; s.v = 0; s.add(100, { force: true }); });
    await T.frames(4);
    r = await st(T);
    const pur = await T.ev(() => __game.shame.pursuit);
    check(pur && r.near !== 'packhus', `no prompt in a pursuit (${pur}, ${r.near})`);
    await T.ev(() => { const s = __game.shame; if (s.pursuit) { s.v = 0; s.endPursuit(true); } s.forced = false; });
    await T.frames(4);
    await shift(T);
    await raf(T, () => __game.packhus.sc?.phase === 'run' && __game.packhus.sc.spawned >= 2, 15000);
    await T.ev(() => { __game.missions.begin(); });
    await T.frames(6);
    r = await st(T);
    T.log('mission mid-shift', JSON.stringify(r));
    check(r.ms !== 'idle' && r.phase === null && r.last.kind === 'gone' && !r.belt && r.workers === 0 && !r.shown && !r.sort,
      `a mission start mid-shift: the belt gone at once, the foreman too (${JSON.stringify(r)})`);
    await T.until(() => __game.missions.state === 'running', 60000);
    await atBoss(T);
    r = await st(T);
    check(r.ms === 'running' && !r.shown && r.near !== 'packhus' && !/Ta ett skift/.test(r.prompt), `in the mission nobody and no prompt (${r.ms}, ${r.shown}, ${r.near})`);
    await T.ev(() => __game.packhus.start());
    r = await st(T);
    check(r.phase === null && !r.belt, 'and no shift by hand');
    await T.ev(() => __game.missions.abort());
    await T.frames(4);
    await T.ev(() => { const g = __game, s = g.packhus.bossSpot(); g.debugWarp(s.x + 120, s.z + 40, 0); });
    await T.frames(6);
    await atBoss(T);
    r = await st(T);
    check(r.ms === 'idle' && r.shown && r.near === 'packhus', `after the mission (Q) the foreman and the prompt again (${r.ms}, ${r.near})`);
  },

  // The balance, modelled: the autopilot's reaction (s from a tomato's being the front one in the zone)
  // and its share of wrong keys.
  async packhusbalans(T) {
    await T.fresh('&mission=8');
    const runs = +(process.env.PACKHUS_RUNS || 3);
    const models = [
      { name: 'quick clean', react: 0.3, wrong: 0, want: 'all' },
      { name: 'slow clean', react: 0.55, wrong: 0, want: 'all' },
      { name: 'quick, 15 % wrong', react: 0.45, wrong: 0.15, want: 'most' },
      { name: 'careless, 30 % wrong', react: 0.45, wrong: 0.3, want: null },
      { name: 'too slow', react: 0.75, wrong: 0, want: null },
    ];
    for (const m of models) {
      const res = [];
      for (let k = 0; k < runs; k++) {
        await T.ev(() => { const g = __game, s = g.packhus.bossSpot(); g.debugWarp(s.x, s.z + 1.6, Math.PI); });
        await T.frames(6);
        await T.ev((m) => { const P = __game.packhus; P.auto = { react: m.react, wrong: m.wrong }; P.start(); }, m);
        await T.until(() => __game.packhus.last && __game.packhus.last.ended && !__game.packhus.sc, 180000).catch(() => {});
        const l = await T.ev(() => { const P = __game.packhus, l = P.last; P.last = null; return l; });
        res.push(l);
      }
      const done = res.filter((l) => l?.kind === 'done').length;
      T.log(`balance ${m.name} (react ${m.react}, wrong ${m.wrong}): ${done}/${runs} whole shifts; boxes ${res.map((l) => l?.boxes).join(' ')}; dropped ${res.map((l) => l?.dropped).join(' ')}; handled ${res.map((l) => (l?.sorted ?? 0) + (l?.dropped ?? 0)).join(' ')}`);
      if (m.want === 'all') check(done === runs, `${m.name}: every shift whole (${done}/${runs})`);
      if (m.want === 'most') check(done * 2 >= runs, `${m.name}: most shifts whole (${done}/${runs})`);
    }
    await T.ev(() => { __game.packhus.auto = null; });
  },
};
