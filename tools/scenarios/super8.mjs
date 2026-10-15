// Lite film. – herr Storchs semesterfilm (free roam, DESIGN §10.11; feature 6): super8, filmkvall.
//   super8:   before the end (index 9). A double jump 16 m off on the beach: Herr Storch notices, trots
//             over the sand to 5 m from Stig, lifts the camera ("Lite film."), walks home and is free
//             again at his own spot; a second trick inside 30 s is let pass; a trick within 7 m he films
//             from where he stands; a kicked sunbed near him adds no SKANDAL (the lens-cap toast) and he
//             films it; Stig on the paseo: he stops at the sand's edge, never on the paseo or a road; E
//             by him ("Titta i kameran") is his viewfinder: I KAMERAN, DAG 4, a black gate and his
//             satisfied line, for 4.5 s, then the play again; a mission's start finds him at home at once
//             (he was trotting); as friskotek's extra (index 6) he films from his place.
//   filmkvall: after the end (index 13, the `bodega` unlock). A kicked sunbed near him counts (the
//             evidence toast); each filming keeps a still from his eye (several takes when Stig is in the
//             air, the best kept), saved under its own key and loaded again on a reload; home again he
//             offers "Vill du se min film?" and E is "Se filmen": the film night (seven black days,
//             "Blir'e inge film?", the julafton stills, "Lite film."), after which E is the viewfinder
//             again: JULAFTON, the island through his lens in pale colours.
import fs from 'node:fs';
import path from 'node:path';
import { check } from '../lib.mjs';

const PI = Math.PI;
const st = (T) => T.ev(() => {
  const g = __game, F = g.film, n = g.npc('herrStorch'), p = g.player;
  return { st: F.st, view: F.view, last: F.last, lastView: F.lastView, x: +n.x.toFixed(2), z: +n.z.toFixed(2), busy: n.busy, spot: n.spot,
    film: n.anim.film, state: n.state, px: +p.x.toFixed(2), pz: +p.z.toFixed(2), py: +p.y.toFixed(2), shame: +g.shame.v.toFixed(2),
    stills: F.stills.length, seen: F.seen, inDialog: g.inDialog, cine: !!g.cam.cine, ms: g.missions.state, nextT: F.nextT, t: g.time,
    prompt: document.getElementById('prompt').innerText };
});
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) { const o = g.say.bind(g); g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t.key || 'ped', text]); return o(t, text, secs); }; }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const toasts = (T) => T.ev(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '));
// Stig on foot at (x, z) facing yaw, the chase camera behind him; the trick cooldown cleared.
const stand = (T, x, z, yaw, cam = 0) => T.ev((x, z, yaw, cam) => {
  const g = __game, p = g.player;
  if (g.playerCar) g.exitCar(true);
  g.debugWarp(x, z, yaw);
  p.vx = p.vz = p.vy = 0;
  g.cam.yaw = yaw + cam; g.cam.snapNext = true;
  g.film.nextT = 0;
}, x, z, yaw, cam);
// A double jump in place (Space, then Space again on the way up).
async function volt(T) {
  await T.tap('Space');
  await T.until(() => __game.player.vy < 3, 3000);
  await T.tap('Space');
}
// Sample Herr Storch every 100 ms until `done` (his state null) or `ms`: the furthest he got from
// home, his nearest to Stig while filming, the lowest z, and the states he went through.
async function follow(T, ms, shots = {}) {
  const seen = { states: [], minZ: 1e9, maxZ: -1e9, filmD: null, filmAt: null, filmed: false };
  for (let t = 0; t < ms; t += 100) {
    const r = await T.ev(() => { const g = __game, F = g.film, n = g.npc('herrStorch'), p = g.player; return { st: F.st, x: n.x, z: n.z, d: Math.hypot(n.x - p.x, n.z - p.z), film: n.anim.film }; });
    if (seen.states[seen.states.length - 1] !== r.st) seen.states.push(r.st);
    seen.minZ = Math.min(seen.minZ, r.z); seen.maxZ = Math.max(seen.maxZ, r.z);
    if (r.st === 'film' && r.film) { seen.filmed = true; if (seen.filmD == null) { seen.filmD = +r.d.toFixed(2); seen.filmAt = { x: +r.x.toFixed(2), z: +r.z.toFixed(2) }; } }
    for (const [k, name] of Object.entries(shots)) if (r.st === k && !shots['_' + k]) { shots['_' + k] = true; await T.shot(name); }
    if (t > 300 && r.st === null) break;
    await T.sleep(100);
  }
  return seen;
}
const vf = (T) => T.ev(() => {
  const e = document.getElementById('viewfinder'), gate = e.querySelector('.vf-gate');
  return { show: e.classList.contains('show'), live: e.classList.contains('live'), title: e.querySelector('.vf-title').textContent,
    label: e.querySelector('.vf-label').textContent, line: e.querySelector('.vf-line').textContent, gateBg: getComputedStyle(gate).backgroundColor,
    bodyLive: document.body.classList.contains('film-live'), canvasFilter: getComputedStyle(document.querySelector('#app canvas')).filter };
});
const fn = (T) => T.ev(() => {
  const e = document.getElementById('filmnight');
  return { cls: e.className, week: [...e.querySelectorAll('.fn-week .fn-frame span')].map((s) => s.textContent), jul: e.querySelectorAll('.fn-jul img').length,
    l1: e.querySelector('.fn-l1')?.textContent, l2: e.querySelector('.fn-l2')?.textContent, title: e.querySelector('.fn-title')?.textContent };
});
// Kick the sunbed nearest to (x, z) for real: Stig 0.9 m off its long side, facing it, J.
async function kickSunbed(T, x, z) {
  const b = await T.ev((x, z) => {
    let best = null, bd = 1e9;
    for (const p of __props) { if (p.type !== 'solstol' || !p.alive) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
    return best && { x: best.x, z: best.z, i: __props.indexOf(best) };
  }, x, z);
  await stand(T, b.x - 0.95, b.z, PI / 2, -0.75);
  await T.frames(4);
  await T.tap('KeyJ');
  await T.until((i) => !__props[i].alive, 3000, b.i);
  return b;
}

export const SCENARIOS = {
  async super8(T) {
    await T.fresh('&mission=9');
    await resetSaid(T);
    const P = await T.L('playa');
    let r = await st(T);
    const home = { x: r.x, z: r.z, spot: r.spot };
    T.log('home', JSON.stringify(home), 'playa', JSON.stringify(P));
    check(Math.hypot(home.x - P.x, home.z - P.z) < 0.5 && !r.busy && r.st === null, `Herr Storch at home by the playa (${JSON.stringify(r)})`);

    // 1. A double jump on the boardwalk 16 m south of him: he trots over and films.
    await stand(T, P.x - 2, P.z + 16, PI, -0.65);
    await T.frames(10);
    await volt(T);
    r = await st(T);
    T.log('volt', JSON.stringify(r.last));
    check(r.last?.kind === 'volt' && r.st === 'notice' && r.spot === 'storchFilm', `the double jump is a trick he takes (${JSON.stringify(r)})`);
    let seen = await follow(T, 16000, { trot: 'super8_springer', film: 'super8_filmar' });
    r = await st(T);
    T.log('ran', JSON.stringify(seen), 'last', JSON.stringify(r.last), 'back at', r.x, r.z, r.spot);
    check(r.last.ran && seen.states.join(',').startsWith('notice,trot,film,home'), `notice, trot, film, home (${seen.states})`);
    check(seen.filmD != null && seen.filmD < 6.2 && seen.filmD > 3.5, `he films from about 5 m (${seen.filmD})`);
    check(Math.hypot(r.x - home.x, r.z - home.z) < 0.4 && r.spot === home.spot && !r.busy && r.st === null && !r.film, `home again, free (${JSON.stringify(r)})`);
    check((await said(T)).some(([w, t]) => w === 'herrStorch' && t === 'Lite film.'), 'he said "Lite film."');
    check(r.shame === 0 && r.stills === 0, 'no SKANDAL, no still before the end');

    // 2. Inside 30 s a second trick is let pass.
    const t0 = r.last.t;
    await T.ev(() => { __game.film.nextT = __game.time + 20; });
    await volt(T);
    await T.frames(10);
    r = await st(T);
    check(r.last.t === t0 && r.st === null, `a trick inside the 30 s is let pass (${JSON.stringify(r.last)})`);

    // 3. A trick within 7 m: he films from where he stands.
    await stand(T, home.x + 1.5, home.z + 4.5, PI, PI);
    await T.frames(10);
    await volt(T);
    seen = await follow(T, 8000);
    r = await st(T);
    T.log('near', JSON.stringify(seen), JSON.stringify(r.last));
    check(r.last.t !== t0 && !r.last.ran && r.last.filmed && Math.hypot(r.last.at.x - home.x, r.last.at.z - home.z) < 0.3, `near: filmed from his place (${JSON.stringify(r.last)})`);

    // 4. A kicked sunbed 10 m from him: no SKANDAL, the lens-cap toast, and he films it.
    await resetSaid(T);
    const b = await kickSunbed(T, home.x - 10, home.z - 2);
    await T.frames(5);
    r = await st(T);
    const ts = await toasts(T);
    T.log('kick', JSON.stringify(b), JSON.stringify(r.last), 'shame', r.shame, 'toasts', ts);
    check(r.shame === 0 && ts.includes('Ingen fara: linsskyddet sitter på.'), `the witness rule: 0 SKANDAL and the toast (${r.shame}, ${ts})`);
    check(r.last.kind === 'bus' && r.st != null, `he takes the kicked sunbed (${JSON.stringify(r.last)})`);
    seen = await follow(T, 12000, { film: 'super8_solstol' });
    check(seen.filmed, 'he filmed the kicked sunbed');

    // 5. Herr Storch near the beach's north edge, Stig on the road beyond the paseo: he goes no
    // further than the sand's edge.
    const sand = await T.ev(() => __game.film.sand);
    await T.ev((x, z) => { __game.npc('herrStorch').teleport(x, z, Math.PI); }, home.x - 3, sand.z0 + 6.5);
    await stand(T, home.x - 3, sand.z0 - 13.5, 0, 0);
    await T.frames(5);
    check(await T.ev(() => __game.film.trick('test')), 'a trick from the road');
    seen = await follow(T, 14000, { film: 'super8_kanten' });
    T.log('road', JSON.stringify(seen), 'sand', JSON.stringify(sand));
    check(seen.filmed && seen.minZ >= sand.z0 - 0.3, `he stops at the sand's edge (${seen.minZ} vs ${sand.z0})`);
    await T.ev(() => __game.placeNpcs(true));

    // 6. E by him: his viewfinder, black, DAG 4, his line; 4.5 s, then the play.
    await resetSaid(T);
    await stand(T, home.x - 1.4, home.z + 0.6, PI / 2, 0);
    await T.frames(8);
    r = await st(T);
    check(r.prompt.includes('Titta i kameran'), `the prompt (${r.prompt})`);
    await T.tap('KeyE');
    await T.frames(12);
    r = await st(T);
    let v = await vf(T);
    T.log('viewfinder', JSON.stringify(v), JSON.stringify(r.lastView));
    check(r.view === 'look' && r.inDialog && v.show && !v.live && v.title === 'I KAMERAN' && v.label === 'DAG 4', `the viewfinder (${JSON.stringify(v)})`);
    check(v.gateBg === 'rgb(5, 4, 3)' && !v.bodyLive && v.canvasFilter === 'none', `the picture is black: the lens cap (${v.gateBg}, ${v.canvasFilter})`);
    check(['Strålande ljus i dag.', 'Det här blir en fin semesterfilm.'].some((l) => v.line.includes(l)) && v.line.startsWith('Herr Storch:'), `his satisfied line (${v.line})`);
    await T.shot('super8_sokare');
    await T.until(() => __game.film.view === null, 8000);
    await T.frames(5);
    r = await st(T);
    v = await vf(T);
    check(!r.inDialog && !r.cine && !v.show && r.spot === home.spot && !r.busy && !r.film, `back to play (${JSON.stringify(r)})`);

    // 7. A mission's start finds him at home at once (he was trotting).
    await stand(T, P.x - 2, P.z + 16, PI, PI);
    await T.frames(10);
    await volt(T);
    await T.until(() => __game.film.st === 'trot', 3000);
    await T.sleep(600);
    r = await st(T);
    check(Math.hypot(r.x - home.x, r.z - home.z) > 0.8, `he has set off (${r.x}, ${r.z})`);
    await T.startMission();
    r = await st(T);
    T.log('mission', JSON.stringify(r));
    check(Math.hypot(r.x - home.x, r.z - home.z) < 0.3 && r.st === null && r.spot !== 'storchFilm' && !r.film, `at home when the mission starts (${JSON.stringify(r)})`);
    await stand(T, home.x + 1.5, home.z + 4.5, PI, PI);
    await volt(T);
    await T.frames(20);
    r = await st(T);
    check(r.st === null && Math.hypot(r.x - home.x, r.z - home.z) < 0.3, 'in a mission he takes no trick');

    // 8. As friskotek's extra (index 6) he films from his place.
    await T.fresh('&mission=6');
    r = await st(T);
    const fr = { x: r.x, z: r.z };
    const q = await T.ev((x, z) => __game.freeSpot(x, z, 0, 3), fr.x + 11, fr.z);
    await stand(T, q.x, q.z, Math.atan2(fr.x - q.x, fr.z - q.z), 0);
    await T.frames(10);
    await volt(T);
    seen = await follow(T, 8000);
    r = await st(T);
    T.log('friskotek', JSON.stringify(fr), JSON.stringify(r.last), JSON.stringify(seen));
    check(r.last?.filmed && !r.last.ran && Math.hypot(r.last.at.x - fr.x, r.last.at.z - fr.z) < 0.3, `pinned: he films from his place (${JSON.stringify(r.last)})`);
  },

  async filmkvall(T) {
    await T.fresh('&mission=13');
    await T.ev(() => { localStorage.removeItem('charter-and-run-film-v1'); __game.unlock('bodega'); __game.addCoins(2000); });
    await resetSaid(T);
    const P = await T.L('playa');
    let r = await st(T);
    const home = { x: r.x, z: r.z, spot: r.spot };
    check(await T.ev(() => !!__game.witnessOverride?.evidence), 'the bodega unlock turns the witness rule round');

    // 1. A kicked sunbed near him counts now: the evidence toast, SKANDAL, and he films it (a still).
    await kickSunbed(T, home.x - 10, home.z - 2);
    await T.frames(5);
    r = await st(T);
    const ts = await toasts(T);
    T.log('kick', JSON.stringify(r.last), 'shame', r.shame, ts);
    check(r.shame > 0 && ts.includes('Linsskyddet är av – nu finns det bevis!'), `the offence counts (${r.shame}, ${ts})`);
    let seen = await follow(T, 14000, { film: 'filmkvall_bevis' });
    r = await st(T);
    T.log('still 1', JSON.stringify(r.last), JSON.stringify(seen));
    check(seen.filmed && r.last.still && r.stills === 1, `a still of it (${JSON.stringify(r.last)})`);
    await T.ev(() => { const s = __game.shame; s.v = 0; if (s.pursuit) s.endPursuit(true); });

    // 2. A trick 5 m from him, Stig standing: he films at once (the first take), and a double jump
    // while he films brings higher takes; the highest is kept.
    await stand(T, home.x + 1.5, home.z + 5, PI, PI);
    await T.ev(() => { __game.cam.yaw = Math.PI / 2 + 0.6; __game.cam.snapNext = true; });
    await T.frames(10);
    check(await T.ev(() => __game.film.trick('test')), 'a trick 5 m off');
    await T.until(() => __game.film.shot?.n >= 1, 3000);
    await volt(T);
    seen = await follow(T, 9000);
    r = await st(T);
    T.log('still 2', JSON.stringify(r.last));
    check(r.last.still && r.last.grabs >= 2 && r.stills === 2, `the air takes, one still kept (${JSON.stringify(r.last)})`);
    const saved = await T.ev(() => JSON.parse(localStorage.getItem('charter-and-run-film-v1') || '[]'));
    check(saved.length === 2 && saved.every((s) => s.startsWith('data:image/jpeg')), `saved under its own key (${saved.length})`);
    for (const [k, s] of saved.entries()) fs.writeFileSync(path.join(T.out, `filmkvall_still${k + 1}.jpg`), Buffer.from(s.split(',')[1], 'base64'));

    // 3. Home again, near him: "Vill du se min film?", and E is "Se filmen".
    await resetSaid(T);
    await stand(T, home.x - 1.4, home.z + 0.6, PI / 2, 0);
    await T.ev(() => { __game.film.offerT = 0; });
    await T.frames(15);
    r = await st(T);
    const s = await said(T);
    T.log('offer', JSON.stringify(s), r.prompt);
    check(s.some(([w, t]) => w === 'herrStorch' && t === 'Vill du se min film?'), 'he offers his film');
    check(r.prompt.includes('Se filmen'), `the prompt (${r.prompt})`);

    // 4. The film night.
    await T.tap('KeyE');
    await T.sleep(2300);
    let f = await fn(T);
    T.log('night 1', JSON.stringify(f));
    check(f.cls.includes('show') && f.title === 'FILMKVÄLL' && f.week.join(',') === 'DAG 1,DAG 2,DAG 3,DAG 4,DAG 5,DAG 6,DAG 7' && f.jul === 2, `the night: the black week and two stills (${JSON.stringify(f)})`);
    check(f.cls.includes('l1') && f.l1.includes('Blir\'e inge film?') && !f.cls.includes('jul'), `his line over the black week (${f.cls})`);
    await T.shot('filmkvall_vecka');
    await T.until(() => document.getElementById('filmnight').classList.contains('l2'), 6000);
    await T.sleep(800);
    f = await fn(T);
    check(f.cls.includes('jul') && f.l2.includes('Lite film.'), `the julafton stills and "Lite film." (${f.cls})`);
    await T.shot('filmkvall_julafton');
    await T.until(() => __game.film.view === null, 9000);
    await T.frames(5);
    r = await st(T);
    check(!r.inDialog && r.seen === 2 && r.prompt.includes('Titta i kameran') && (await fn(T)).cls === '', `after the night: seen, the viewfinder again (${JSON.stringify(r)})`);

    // 5. The viewfinder after the end: JULAFTON, the island through his lens.
    await T.ev(() => { const g = __game; g.cam.yaw = 0.3; g.cam.snapNext = true; });
    await T.frames(10);
    await T.tap('KeyE');
    await T.frames(15);
    const v = await vf(T);
    T.log('live viewfinder', JSON.stringify(v));
    check(v.show && v.live && v.label === 'JULAFTON' && v.bodyLive && v.canvasFilter.includes('sepia') && v.line.includes('Nu blir\'e film!'), `the live viewfinder (${JSON.stringify(v)})`);
    check(v.gateBg === 'rgba(0, 0, 0, 0)', `the gate shows the picture (${v.gateBg})`);
    await T.shot('filmkvall_sokare');
    await T.until(() => __game.film.view === null, 8000);
    await T.frames(3);
    check(!(await vf(T)).bodyLive, 'the canvas filter is off again');

    // 6. A reload (no ?fresh): the stills come back from their own key.
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1&mission=13`, { waitUntil: 'load' });
    await T.page.waitForFunction('window.__ready === true', { timeout: 120000, polling: 250 });
    const n = await T.ev(() => __game.film.stills.length);
    check(n === 2, `the stills are loaded again (${n})`);
    await T.ev(() => { localStorage.clear(); });
  },
};
