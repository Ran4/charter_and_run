// Meta från piren (free roam, DESIGN §10.45; feature 107): meta.
//   meta: at index 9 between missions, the rod in its holder on the green harbour light at the pier's
//         end and the FÅNGST card (0/4, four ???) within 14 m of the spot, none far off. On foot by it
//         the prompt "E Meta"; E stands Stig on the spot facing the basin with the rod in his hand (the
//         holder's empty), cuts the camera and casts: the float lands on the water ahead with the line
//         to it, the prompt "Vänta tills flötet dyker… Q Lägg ner spöt", W does not move him; the dive
//         (the float under the water) after 2.2–5.5 s with "E Dra upp!"; E in the window hooks the catch,
//         which comes up out of the water: the camera recuts to his face, the first fish with his arms
//         spread and "Det är ungefär så här stort.", "Fångst: en fisk!", Fisk ×1 on the card, the fish
//         back into the water and Stig free on the spot with the rod back in its holder and the camera
//         behind him; the second fish "Simma hem nu, lilla vän.". E too early: "För tidigt…", "Tom
//         krok.", nothing counted; no E in the window: "Den slapp.", "Tom krok."; Q in the wait: the rod
//         down, no line. The shoe, the fin (never the Hajfenor set's collect) and the pack with "En
//         julklapp. Den är inte till mig."; the fourth kind brings "Alla fyra!", Stig's line and ALLA
//         FYRA! on the card, once. records.fiske in the save. The draw: the pack on the pity-th hook of
//         a session while it is not on the card, else the weights (4000 draws). A cast by night. No prompt in a car, in a
//         pursuit or in a mission (no card there, start() by hand nothing); a mission start mid-cast puts
//         the rod back and clears the float; after the mission the prompt again. Shots `meta_prompt`,
//         `_kast`, `_vantar`, `_napp`, `_fisk`, `_sko`, `_fena`, `_knacke`, `_kort`, `_tom`, `_natt`.
import { check } from '../lib.mjs';

const KINDS = ['fisk', 'sko', 'fena', 'knacke'];
// Every frame (the window is half a second): the dive, the show.
const raf = (T, fn, timeout = 20000) => T.page.waitForFunction(fn, { timeout, polling: 'raf' });

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
// Stig on foot 1 m behind the spot, facing the basin, the camera behind him.
async function atSpot(T, back = 1.0) {
  await T.ev((back) => {
    const g = __game, s = window.__lm('fiske');
    if (g.playerCar) g.exitCar(true);
    g.player.state = 'normal';
    g.debugWarp(s.x - Math.sin(s.yaw) * back, s.z - Math.cos(s.yaw) * back, s.yaw);
    g.cam.yaw = s.yaw; g.cam.snapNext = true;
  }, back);
  await T.frames(10);
}
const st = (T) => T.ev(() => {
  const g = __game, F = g.fiske, p = g.player, s = window.__lm('fiske'), card = document.getElementById('fangst');
  const it = g.nearestInteractable(), rodProp = p.model.props.metspo;
  return {
    phase: F.sc?.phase ?? null, kind: F.sc?.kind ?? null, last: F.last, tally: { ...g.records.fiske },
    prompt: window.__hud._prompt || '', near: it?.type === 'it' ? it.it.id : it?.type || null,
    inDialog: g.inDialog, cine: !!g.cam.cine, cineX: g.cam.cine ? +g.cam.cine.pos.x.toFixed(2) : null, fish: p.anim.fish || null,
    rodHeld: !!rodProp?.visible && !!p.anim.fish, rodHolder: F.rod.visible,
    float: F.float.visible ? { x: +F.float.position.x.toFixed(2), y: +F.float.position.y.toFixed(3), z: +F.float.position.z.toFixed(2) } : null,
    line: F.line.visible, catchShown: KINDS_ON(F),
    card: card.classList.contains('show') ? { title: card.querySelector('.fg-title').textContent, count: card.querySelector('.fg-count').textContent,
      rows: [...card.querySelectorAll('.fg-row')].map((r) => r.textContent), all: card.querySelector('.fg-all').textContent } : null,
    ms: g.missions.state, x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), d: +Math.hypot(p.x - s.x, p.z - s.z).toFixed(2),
  };
  function KINDS_ON(F) { return Object.entries(F.catches).filter(([, m]) => m.visible).map(([k]) => k); }
});
const said = (T) => T.ev(() => window.__said.slice());
const toasts = (T) => T.ev(() => window.__toasts.slice());
// E at the rod, then the cast to the water.
async function cast(T) {
  await atSpot(T);
  await T.tap('KeyE');
  await raf(T, () => __game.fiske.sc?.phase === 'wait', 10000);
}
// A whole catch of `kind`: the dive, E, the show (returns the state there), the end (returns it too).
async function landCatch(T, kind, shot) {
  await clearSpies(T);
  await cast(T);
  await T.ev((k) => { __game.fiske.next = k; }, kind);
  await raf(T, () => __game.fiske.sc?.phase === 'bite', 10000);
  await T.tap('KeyE');
  await raf(T, () => __game.fiske.sc?.phase === 'show' && __game.fiske.sc.t > 0.7, 10000);
  const show = await st(T);
  if (shot) await T.shot(shot);
  await raf(T, () => !__game.fiske.sc, 15000);
  await T.frames(4);
  return [show, await st(T)];
}

export const SCENARIOS = {
  async meta(T) {
    await T.fresh('&mission=9');
    await spies(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam on the island');

    // 1. The card near the pier's end only; the prompt by the rod.
    let r = await st(T);
    check(!r.card, `no FÅNGST card far from the pier (${JSON.stringify(r.card)})`);
    await atSpot(T, 9);
    r = await st(T);
    check(r.card && r.card.title === 'FÅNGST' && r.card.count === '0/4' && r.card.rows.every((t) => t === '???') && r.card.rows.length === 4 && !r.card.all,
      `the card within 14 m: FÅNGST 0/4, four ??? (${JSON.stringify(r.card)})`);
    check(r.near !== 'fiske' && r.rodHolder, `no prompt 9 m off, the rod in its holder (${r.near}, ${r.rodHolder})`);
    await atSpot(T);
    r = await st(T);
    T.log('at the rod', JSON.stringify(r));
    check(r.near === 'fiske' && /Meta/.test(r.prompt), `the prompt "E Meta" by the rod (${r.near}, "${r.prompt}")`);
    await T.shot('meta_prompt');

    // 2. E: the cast.
    await T.tap('KeyE');
    await T.frames(8);
    r = await st(T);
    T.log('cast', JSON.stringify(r));
    check(r.phase === 'cast' && r.inDialog && r.cine && r.fish === 'cast' && r.rodHeld && !r.rodHolder && r.d < 0.05 && Math.abs(r.yaw - Math.PI / 2) < 0.01 && r.prompt === '',
      `E: Stig on the spot facing the basin with the rod, the holder empty, the camera cut, no prompt (${JSON.stringify(r)})`);
    await T.shot('meta_kast');
    await raf(T, () => __game.fiske.sc?.phase === 'wait', 10000);
    await T.frames(20);
    r = await st(T);
    const land = await T.ev(() => { const L = __game.fiske.sc.land; return { x: L.x, z: L.z }; });
    T.log('wait', JSON.stringify(r), JSON.stringify(land));
    check(r.float && Math.hypot(r.float.x - land.x, r.float.z - land.z) < 0.15 && r.float.y > 0.12 && r.float.y < 0.24 && r.line,
      `the float on the water ahead, the line to it (${JSON.stringify(r.float)})`);
    check(land.x - r.x > 4 && Math.abs(land.z - r.z) < 0.1, `4.6 m out over the basin (${JSON.stringify(land)})`);
    check(/Vänta tills flötet dyker/.test(r.prompt) && /Lägg ner spöt/.test(r.prompt), `the wait's hint ("${r.prompt}")`);
    await T.shot('meta_vantar');
    await T.hold(['KeyW'], 500);
    const r2 = await st(T);
    check(r2.d < 0.05, `W does not move him (${r2.d} m)`);
    await raf(T, () => __game.fiske.sc?.phase === 'bite' && __game.fiske.sc.t > 0.08, 10000);
    r = await st(T);
    check(r.float && r.float.y < 0.12 && /Dra upp/.test(r.prompt), `the dive: the float under, "E Dra upp!" (${JSON.stringify(r.float)}, "${r.prompt}")`);
    await T.shot('meta_napp');

    // 3. E in the window: the first fish, "Det är ungefär så här stort."
    await T.ev(() => { __game.fiske.next = 'fisk'; });
    const cutBefore = r.cineX;
    await T.tap('KeyE');
    r = await st(T);
    check(['reel', 'show'].includes(r.phase) && r.catchShown.includes('fisk') && !r.float, `E: the fish on the line, the float gone (${r.phase}, ${r.catchShown})`);
    await raf(T, () => __game.fiske.sc?.phase === 'show' && __game.fiske.sc.t > 0.7, 10000);
    r = await st(T);
    let s = await said(T), ts = await toasts(T);
    T.log('show', JSON.stringify(r), JSON.stringify(s), JSON.stringify(ts));
    check(r.fish === 'size' && r.cineX !== cutBefore && s.some(([w, t]) => w === 'stig' && t === 'Det är ungefär så här stort.') && ts.includes('Fångst: en fisk!'),
      `the show: arms spread, the camera recut, the size line, the toast (${r.fish}, ${JSON.stringify(s)}, ${JSON.stringify(ts)})`);
    check(r.tally.fisk === 1 && r.card.count === '1/4' && r.card.rows[0] === 'Fisk×1', `Fisk ×1 on the card (${JSON.stringify(r.tally)}, ${JSON.stringify(r.card)})`);
    await T.shot('meta_fisk');
    await raf(T, () => !__game.fiske.sc, 15000);
    await T.frames(4);
    r = await st(T);
    T.log('end', JSON.stringify(r));
    check(!r.inDialog && !r.cine && !r.fish && r.rodHolder && !r.float && !r.line && r.catchShown.length === 0 && r.d < 0.05 && r.last.kind === 'fisk',
      `free on the spot, the rod back in its holder, nothing left on the water (${JSON.stringify(r)})`);
    check(r.near === 'fiske' && /Meta/.test(r.prompt), `"E Meta" again (${r.near}, "${r.prompt}")`);

    // 4. The second fish: the next line.
    let [sh] = await landCatch(T, 'fisk');
    s = await said(T);
    check(sh.fish === 'show' && s.some(([w, t]) => w === 'stig' && t === 'Simma hem nu, lilla vän.') && sh.tally.fisk === 2, `the second fish's line, ×2 (${sh.fish}, ${JSON.stringify(s)})`);

    // 5. Too early, too late, Q: an empty hook, nothing counted.
    const t0 = JSON.stringify(sh.tally);
    await clearSpies(T);
    await cast(T);
    await T.frames(3);
    await T.tap('KeyE');
    r = await st(T);
    s = await said(T); ts = await toasts(T);
    check(r.last.kind === 'early' && s.some(([w, t]) => w === 'stig' && t === 'För tidigt…') && ts.includes('Tom krok.') && r.catchShown.length === 0,
      `E before the dive: "För tidigt…", "Tom krok." (${JSON.stringify(r.last)}, ${JSON.stringify(s)}, ${JSON.stringify(ts)})`);
    await T.shot('meta_tom');
    await raf(T, () => !__game.fiske.sc, 10000);
    await clearSpies(T);
    await cast(T);
    await raf(T, () => __game.fiske.sc?.phase === 'bite', 10000);
    await raf(T, () => __game.fiske.sc?.phase !== 'bite', 5000);
    r = await st(T);
    s = await said(T); ts = await toasts(T);
    check(r.last.kind === 'late' && s.some(([w, t]) => w === 'stig' && t === 'Den slapp.') && ts.includes('Tom krok.'), `no E in the window: "Den slapp.", "Tom krok." (${JSON.stringify(r.last)}, ${JSON.stringify(s)})`);
    await raf(T, () => !__game.fiske.sc, 10000);
    await clearSpies(T);
    await cast(T);
    await T.tap('KeyQ');
    r = await st(T);
    s = await said(T);
    check(r.last.kind === 'quit' && !s.some(([w]) => w === 'stig'), `Q in the wait: the rod down, no line (${JSON.stringify(r.last)}, ${JSON.stringify(s)})`);
    await raf(T, () => !__game.fiske.sc, 10000);
    await T.frames(4);
    r = await st(T);
    check(JSON.stringify(r.tally) === t0 && !r.inDialog && r.rodHolder, `nothing counted, free again (${JSON.stringify(r.tally)})`);

    // 6. The shoe, the fin (no collect), the pack; the fourth kind once.
    const fen0 = await T.ev(() => [...__game.collected.fenor].join(','));
    [sh] = await landCatch(T, 'sko', 'meta_sko');
    s = await said(T); ts = await toasts(T);
    check(s.some(([w, t]) => w === 'stig' && t === 'Någon har visst fått ta av sig skon.') && ts.includes('Fångst: en gammal sko.') && sh.tally.sko === 1, `the shoe (${JSON.stringify(s)})`);
    [sh] = await landCatch(T, 'fena', 'meta_fena');
    s = await said(T); ts = await toasts(T);
    const fen1 = await T.ev(() => [...__game.collected.fenor].join(','));
    check(s.some(([w, t]) => w === 'stig' && t === 'Haj!… Nej. Plast.') && ts.includes('Fångst: en hajfena… av plast.') && sh.tally.fena === 1, `the fin (${JSON.stringify(s)})`);
    check(fen1 === fen0 && !ts.some((t) => /Hajfenor/.test(t)), `the fin is never the Hajfenor set's collect ("${fen0}" → "${fen1}")`);
    check(!sh.last.all && sh.card.count === '3/4' && sh.card.rows[3] === '???', `3/4, the pack still ??? (${JSON.stringify(sh.card)})`);
    [sh] = await landCatch(T, 'knacke', 'meta_knacke');
    s = await said(T); ts = await toasts(T);
    T.log('pack', JSON.stringify(sh), JSON.stringify(s), JSON.stringify(ts));
    check(s.some(([w, t]) => w === 'stig' && t === 'En julklapp. Den är inte till mig.') && ts.includes('Fångst: ett blött SPORT-KNÄCKE-paket. Tomt.'), `the pack: the customs' line (${JSON.stringify(s)})`);
    check(sh.last.all && ts.some((t) => /^Alla fyra!/.test(t)) && sh.card.count === '4/4' && sh.card.all === 'ALLA FYRA!', `all four: the toast, ALLA FYRA! on the card (${JSON.stringify(sh.card)}, ${JSON.stringify(ts)})`);
    s = await said(T);
    check(s.some(([w, t]) => w === 'stig' && t === 'Nu finns det inget mer kvar i hela hamnen.'), `Stig's line after his own (${JSON.stringify(s)})`);
    await atSpot(T, 3);
    await T.shot('meta_kort');
    [sh] = await landCatch(T, 'knacke');
    ts = await toasts(T);
    check(!sh.last.all && !ts.some((t) => /^Alla fyra!/.test(t)) && sh.tally.knacke === 2, `a second pack: no "Alla fyra!" again (${JSON.stringify(ts)})`);

    // 7. The save.
    const saved = await T.ev(() => { __game.save(); return JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /charter|save/i.test(k)) || '{}')).records?.fiske; });
    check(saved && KINDS.every((k) => saved[k] === sh.tally[k]), `records.fiske in the save (${JSON.stringify(saved)})`);

    // 8. The draw: the pity rule, the weights.
    const draw = await T.ev(() => {
      const F = __game.fiske, keep = { ...__game.records.fiske }, since = F.since;
      __game.records.fiske = { fisk: 3 };
      F.since = F.cfg.pity - 1;
      const pity = F.pick();
      F.since = F.cfg.pity - 2;
      const before = [];
      for (let k = 0; k < 200; k++) before.push(F.pick());
      __game.records.fiske = keep;
      const n = { fisk: 0, sko: 0, fena: 0, knacke: 0 };
      for (let k = 0; k < 4000; k++) n[F.pick()]++;
      F.since = since;
      return { pity, early: before.filter((k) => k === 'knacke').length, n };
    });
    T.log('draw', JSON.stringify(draw));
    check(draw.pity === 'knacke', `the pack on the pity-th hook while it is not on the card (${draw.pity})`);
    const w = await T.ev(() => __game.fiske.cfg.weights);
    check(KINDS.every((k) => Math.abs(draw.n[k] / 4000 - w[k]) < 0.025) && draw.n.knacke > 120 && draw.n.knacke < 380, `the weights (${JSON.stringify(draw.n)})`);

    // 9. By night: the float and the line under the lit harbour light.
    await T.ev(() => __game.day.set(22.5));
    await T.frames(6);
    await cast(T);
    await T.frames(20);
    r = await st(T);
    check(r.float && r.line, `a cast by night (${JSON.stringify(r.float)})`);
    await T.shot('meta_natt');
    await T.tap('KeyQ');
    await raf(T, () => !__game.fiske.sc, 10000);
    await T.ev(() => __game.day.set(15));
    await T.frames(6);

    // 10. No prompt in a car, in a pursuit or in a mission; a mission start mid-cast.
    await T.ev(() => { const g = __game, s = window.__lm('fiske'), c = g.ensureNamedCar('hyrbil'); c.place(s.x - 40, s.z - 30, 0); g.enterCar(c); });
    await T.frames(4);
    await T.ev(() => { const s = window.__lm('fiske'); __game.playerCar.place(s.x - 4, s.z, Math.PI / 2); });
    await T.frames(6);
    r = await st(T);
    check(r.near !== 'fiske' && !/Meta/.test(r.prompt), `no prompt at the wheel (${r.near}, "${r.prompt}")`);
    await T.ev(() => { const g = __game; g.exitCar(true); const c = g.named.hyrbil; c.place(c.home.x, c.home.z, c.home.yaw); });
    await atSpot(T);
    await T.ev(() => { const s = __game.shame; s.v = 0; s.add(100); });
    await T.frames(4);
    r = await st(T);
    const pur = await T.ev(() => __game.shame.pursuit);
    check(pur && r.near !== 'fiske', `no prompt in a pursuit (${pur}, ${r.near})`);
    await T.ev(() => { const s = __game.shame; if (s.pursuit) { s.v = 0; s.endPursuit(true); } s.forced = false; });
    await T.frames(4);
    await cast(T);
    await T.ev(() => { __game.missions.begin(); });
    await T.frames(6);
    r = await st(T);
    T.log('mission mid-cast', JSON.stringify(r));
    check(r.ms !== 'idle' && !r.phase && r.last.kind === 'gone' && r.rodHolder && !r.float && !r.line && !r.fish && !r.card,
      `a mission start mid-cast: the rod back, the float gone, no card (${JSON.stringify(r)})`);
    await T.until(() => __game.missions.state === 'running', 60000);
    await atSpot(T);
    r = await st(T);
    check(r.ms === 'running' && r.near !== 'fiske' && !/Meta/.test(r.prompt) && !r.card, `in the mission no prompt and no card (${r.ms}, ${r.near}, "${r.prompt}")`);
    await T.ev(() => __game.fiske.start());
    r = await st(T);
    check(!r.phase && !r.inDialog, 'and no cast by hand');
    await T.ev(() => __game.missions.abort());
    await T.frames(4);
    await atSpot(T);
    r = await st(T);
    check(r.ms === 'idle' && r.near === 'fiske' && r.card, `after the mission (Q) the prompt and the card again (${r.ms}, ${r.near})`);
  },
};
