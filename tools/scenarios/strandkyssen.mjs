// Strandkyssen i bränningen – Stig's daydream in the surf (free roam, DESIGN §10.33; feature 57):
// strandkyssen, strandefter.
//   strandkyssen: the table (every line in STRANDKYSSEN tagged in the file); at index 7 (asnan: Ole the
//             giver, Siv free at home) the towel at the water's edge below Flamenco (its mesh, no
//             collider); "E Lägg dig i vattenbrynet" within 1.5 m of it, not 2.5 m off, not in a car or a
//             SKANDAL pursuit; E: Stig lying on the towel at once, the letterbox and the scene; the white
//             wash; the dream: the sunset palette, the soft picture, the vignette and DAGDRÖM, the waltz,
//             Majsan's double lying beside him in each other's arms (the real Majsan unmoved and free),
//             the foam washing over their legs, "Då kanske vi ses…" from the double; the camera rising
//             away before the wake; the white flash: the clock's palette, the music and the picture back,
//             the double gone, Stig alone on his back; the wave over him with three splashes; "Blött.";
//             up beside the towel, dripping, free roam again with the camera behind him. The second
//             dream: Siv on the sand, "Giraffen, då? Fyra." laughing, posed (no horn, no chatter), then
//             home once he is off (more than 40 m from the camera). The third: nobody on the sand. A fifth at night: the
//             night palette back and no Siv. A mission start mid-dream ends it all at once, and the
//             mission runs with a clear picture. Shots strandkyssen_*, strandsiv_*, strandnatt_*.
//   strandefter: after the end (index 13): the wake has Majsan herself on the sand, "Vill du dansa med
//             mig?", Stig's "Ja.", she dances on after the scene, then home once he is off; with Majsan not
//             free (held) nobody comes; the flight level: no towel prompt.
import fs from 'fs';
import path from 'path';
import { check, ROOT } from '../lib.mjs';

const atTowel = (T, back = 1.2) => T.ev((back) => {
  const g = __game, t = g.dream.T;
  if (g.playerCar) g.exitCar(true);
  g.player.state = 'normal';
  g.debugWarp(t.x, t.z - back, t.yaw);
  g.cam.yaw = t.yaw; g.cam.pitch = 0.3; g.cam.snapNext = true;
}, back);
const sceneAt = (T, t) => T.until((t) => !__game.dream.sc || __game.dream.sc.t >= t, 30000, t);
const done = (T) => T.until(() => !__game.dream.sc, 30000);
// Every line said through game.say since the last reset: [speaker key ('double': Majsan of the dream), text].
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t === g.dream.double ? 'double' : t?.key || '?', text]); return o(t, text, secs); };
  }
  window.__said = [];
});
const allSaid = (T) => T.ev(() => window.__said.slice());
const st = (T) => T.ev(() => {
  const g = __game, d = g.dream, p = g.player, M = g.npc('majsan'), D = d.double, f = d.foam;
  return {
    sc: d.sc ? +d.sc.t.toFixed(2) : null, dream: !!d.sc?.dream, wake: !!d.sc?.wake, variant: d.sc?.variant ?? null, dreams: d.dreams,
    pst: p.state, lean: p.liePose ? +p.liePose.lean.toFixed(2) : null, px: +p.x.toFixed(2), pz: +p.z.toFixed(2), py: +p.y.toFixed(2), yaw: +p.yaw.toFixed(2),
    sky: g.sky, tune: (window.__audioTune ? window.__audioTune() : null), inDialog: g.inDialog,
    letterbox: document.getElementById('letterbox').classList.contains('on'),
    bodyDream: document.body.classList.contains('dream'), dreamShow: document.getElementById('dream').classList.contains('show'),
    title: document.querySelector('#dream .dr-title').textContent, wash: +getComputedStyle(document.getElementById('dreamwash')).opacity,
    filter: getComputedStyle(document.querySelector('#app canvas')).filter,
    double: D ? { st: D.state, vis: D.root.visible, x: +D.x.toFixed(2), z: +D.z.toFixed(2), roll: D.liePose?.roll ?? null } : null,
    majsan: { x: +M.x.toFixed(2), z: +M.z.toFixed(2), st: M.state, busy: M.busy, spot: M.spot },
    foam: { vis: f.visible, z: +f.position.z.toFixed(2), sy: +f.scale.y.toFixed(2) },
    cine: !!g.cam.cine, camY: +g.cam.pos.y.toFixed(2),
    prompt: document.getElementById('prompt')?.textContent || '', it: g.nearestInteractable()?.it?.id ?? null,
    last: d.last && JSON.parse(JSON.stringify(d.last)), state: g.missions.state,
  };
});

// One dream from E to free roam, with checks along the way; returns what it saw.
async function dream(T, { shots = null, visitor = null } = {}) {
  await atTowel(T);
  await T.frames(8);
  const before = await st(T);
  await resetSaid(T);
  await T.tap('KeyE');
  const seen = { before, lie: await st(T) };
  if (shots) await T.shot(`${shots}_1_ligger`);
  await sceneAt(T, 1.2);
  seen.wash = await st(T);
  await sceneAt(T, 2.6);
  seen.dream = await st(T);
  if (shots) await T.shot(`${shots}_2_drom`);
  await sceneAt(T, 4.2);
  seen.whisper = await st(T);
  if (shots) await T.shot(`${shots}_3_viskar`);
  await sceneAt(T, 9.3);
  seen.away = await st(T);
  if (shots) await T.shot(`${shots}_4_bort`);
  await sceneAt(T, 10.3);
  seen.wake = await st(T);
  if (shots) await T.shot(`${shots}_5_vaknar`);
  await sceneAt(T, 11.3);
  seen.wave = await st(T);
  if (shots) await T.shot(`${shots}_6_vagen`);
  await sceneAt(T, 12.9);
  seen.blott = await st(T);
  if (shots) await T.shot(`${shots}_7_blott`);
  for (const [k, t] of (visitor || []).entries()) {
    await sceneAt(T, t);
    if (shots) await T.shot(`${shots}_8_besok${k + 1}`);
  }
  await done(T);
  await T.frames(6);
  seen.after = await st(T);
  if (shots) await T.shot(`${shots}_9_efter`);
  seen.said = await allSaid(T);
  return seen;
}

function checkDream(s, label) {
  const { before, lie, wash, dream: d, whisper, away, wake, wave, blott, after } = s;
  T_log(label, 'before', JSON.stringify({ sky: before.sky, tune: before.tune, majsan: before.majsan }));
  check(lie.pst === 'lying' && lie.sc != null && lie.inDialog && lie.letterbox, `${label}: lying on the towel at once (${JSON.stringify(lie)})`);
  check(wash.wash > 0.5 && !wash.dream, `${label}: the white wash before the dream (${wash.wash})`);
  check(d.dream && d.sky === 'sunset' && d.bodyDream && d.dreamShow && d.title === 'DAGDRÖM' && d.filter.includes('blur') && d.tune === 'vals', `${label}: the dream (${JSON.stringify({ sky: d.sky, body: d.bodyDream, title: d.title, tune: d.tune, filter: d.filter })})`);
  check(d.double?.st === 'lying' && d.double.vis && Math.abs(d.double.x - (d.px + 0.62)) < 0.05 && d.lean === -1.57, `${label}: Majsan's double lying beside him, he flat on his back (${JSON.stringify(d.double)}, ${d.lean})`);
  check(JSON.stringify(d.majsan) === JSON.stringify(before.majsan) && JSON.stringify(whisper.majsan) === JSON.stringify(before.majsan), `${label}: the real Majsan unmoved (${JSON.stringify(d.majsan)})`);
  check(d.foam.vis && d.foam.z > 302 && d.foam.z < 306, `${label}: the foam washing at their legs (${JSON.stringify(d.foam)})`);
  check(away.camY > d.camY + 1.2 && away.dream, `${label}: the camera rising away before the wake (${d.camY} -> ${away.camY})`);
  check(!wake.dream && wake.wake && wake.sky === before.sky && !wake.bodyDream && !wake.dreamShow && wake.tune === before.tune && !wake.double.vis && wake.double.st === 'hidden',
    `${label}: the wake: palette, picture, music back, the double gone (${JSON.stringify({ sky: wake.sky, tune: wake.tune, body: wake.bodyDream, double: wake.double })})`);
  check(wake.pst === 'lying' && wave.foam.vis, `${label}: alone on his back, the wave coming (${wake.pst}, ${JSON.stringify(wave.foam)})`);
  check(blott.last.splash === 3, `${label}: three splashes as the wave went over him (${blott.last.splash})`);
  check(after.pst === 'normal' && !after.inDialog && !after.letterbox && !after.cine && after.sc === null && after.last.ended === 'done' && after.sky === before.sky && after.tune === before.tune,
    `${label}: free roam again (${JSON.stringify({ pst: after.pst, inDialog: after.inDialog, letterbox: after.letterbox, cine: after.cine, ended: after.last.ended })})`);
  check(Math.hypot(after.px - (before.px + 0.6), after.pz - (before.pz + 1.2 - 1.7)) < 0.2 && after.py < 0.3, `${label}: up beside the towel (${after.px}, ${after.pz})`);
  check(s.said[0]?.[0] === 'double' && s.said[0][1] === 'Då kanske vi ses…' && s.said.some(([w, t]) => w === 'stig' && t === 'Blött.'), `${label}: the whisper and "Blött." (${JSON.stringify(s.said)})`);
}
let T_log = () => {};

export const SCENARIOS = {
  async strandkyssen(T) {
    T_log = (...a) => T.log(...a);
    await T.fresh('&mission=7');
    await T.ev(async () => { window.__audioMod = (await import('/src/audio.js')).audio; window.__audioTune = () => window.__audioMod.tune; });

    // ---- 1. The table: every line tagged.
    const texts = await T.ev(() => { const c = __game.dream.cfg; return [c.prompt, c.title, c.whisper[1], c.blott, c.siv.line[1], c.after.line[1], c.after.answer]; });
    const src = fs.readFileSync(path.join(ROOT, 'src/content/island.js'), 'utf8');
    const block = src.slice(src.indexOf('export const STRANDKYSSEN'), src.indexOf('\n};\n', src.indexOf('export const STRANDKYSSEN')));
    const bad = [];
    for (const text of texts) {
      const row = block.split('\n').find((l) => l.includes(`'${text}'`));
      if (!row) bad.push(`not in the block: ${text}`);
      else if (!/\/\/ \[(F\*?|N)\]/.test(row)) bad.push(`untagged: ${text}`);
    }
    check(!bad.length, `STRANDKYSSEN's lines tagged (${bad.join(' · ')})`);

    // ---- 2. The towel and the prompt.
    const towel = await T.ev(() => { const g = __game, d = g.dream, t = d.T, m = d.towel; return { x: t.x, z: t.z, mx: m.position.x, mz: m.position.z, vis: m.visible, inScene: !!m.parent, free: g.spotFree(t.x, t.z) && g.spotFree(t.x, t.z + 0.8) }; });
    T.log('towel', JSON.stringify(towel));
    check(towel.x === -30 && towel.z === 300.9 && towel.vis && towel.inScene && towel.mx === -30 && towel.free, `the towel at the water's edge, no collider (${JSON.stringify(towel)})`);
    await atTowel(T, 2.6);
    await T.frames(6);
    let r = await st(T);
    check(r.it !== 'strandkyssen' && !r.prompt.includes('vattenbrynet'), `no prompt 2.6 m off (${r.it})`);
    await atTowel(T);
    await T.frames(6);
    r = await st(T);
    check(r.it === 'strandkyssen' && r.prompt.includes('Lägg dig i vattenbrynet'), `the prompt by the towel (${r.prompt})`);
    await T.shot('strandkyssen_0_handduk');
    await T.ev(() => { __game.shame.v = 100; __game.shame.startPursuit(); });
    await T.frames(4);
    r = await st(T);
    check(r.it !== 'strandkyssen', `no prompt in a pursuit (${r.it})`);
    await T.ev(() => __game.shame.endPursuit(false));
    await T.frames(4);
    await T.anyCar();
    check(await T.ev(() => !__game.dream.canUse()), 'no dream in a car');
    await T.ev(() => { const g = __game, c = g.playerCar, t = g.dream.T; g.exitCar(true); c.place(t.x + 60, t.z - 12, c.yaw); });
    await T.frames(4);

    // ---- 3. The first dream: nobody on the sand.
    let s = await dream(T, { shots: 'strandkyssen' });
    checkDream(s, 'dream 1');
    check(s.blott.variant === null && s.after.last.visitor === null, `dream 1: nobody on the sand (${s.blott.variant})`);
    const drip = await T.ev(() => __game.dream.dripUntil > __game.time);
    check(drip, 'dripping after the wave');

    // ---- 4. The second dream: Siv on the sand.
    const sivHome = await T.ev(() => { const n = __game.npc('siv'); return { x: n.x, z: n.z }; });
    s = await dream(T, { shots: 'strandsiv', visitor: [14.0, 15.6] });
    checkDream(s, 'dream 2');
    T.log('dream 2', JSON.stringify(s.after.last), JSON.stringify(s.said));
    check(s.after.last.variant === 'siv' && s.after.last.visitor === 'siv', `dream 2: Siv on the sand (${JSON.stringify(s.after.last)})`);
    check(s.said.some(([w, t]) => w === 'siv' && t === 'Giraffen, då? Fyra.'), 'Siv\'s score');
    const siv = await T.ev(() => { const g = __game, n = g.npc('siv'), d = g.dream; return { x: n.x, z: n.z, busy: n.busy, spot: n.spot, posed: g.npcPosed('siv'), honk: g.honk.free('siv'), laugh: n.anim.laugh, d: Math.hypot(n.x - d.T.x, n.z - d.T.z) }; });
    T.log('siv on the sand', JSON.stringify(siv));
    check(siv.posed && !siv.honk && siv.busy && siv.spot === 'strand' && siv.d < 4, `Siv on the sand, posed (${JSON.stringify(siv)})`);
    // She stays a little in view, then goes home once he is off (the camera more than popR from her).
    await T.sleep(2500);
    check(await T.ev(() => !!__game.dream.vis), 'Siv stays a little');
    await T.ev(() => { const g = __game, t = g.dream.T; g.debugWarp(t.x + 48, t.z - 6, Math.PI / 2); g.cam.yaw = Math.PI / 2; g.cam.snapNext = true; });
    await T.until(() => !__game.dream.vis, 15000);
    const sivAfter = await T.ev(() => { const g = __game, n = g.npc('siv'); return { x: +n.x.toFixed(2), z: +n.z.toFixed(2), busy: n.busy, spot: n.spot, posed: g.npcPosed('siv') }; });
    T.log('siv home', JSON.stringify(sivAfter), JSON.stringify(sivHome));
    check(Math.hypot(sivAfter.x - sivHome.x, sivAfter.z - sivHome.z) < 0.1 && !sivAfter.busy && !sivAfter.posed, `Siv home once he is off (${JSON.stringify(sivAfter)})`);

    // ---- 5. The third: nobody. A fifth at night: the night palette back, no Siv.
    s = await dream(T);
    check(s.after.last.variant === null, `dream 3: nobody on the sand (${s.after.last.variant})`);
    await T.ev(() => { const g = __game; g.dream.dreams = 4; g.day.set(1); });
    await T.frames(6);
    s = await dream(T, { shots: 'strandnatt' });
    T.log('night', s.before.sky, s.dream.sky, s.wake.sky, s.after.last.variant);
    check(s.before.sky === 'night' && s.dream.sky === 'sunset' && s.wake.sky === 'night' && s.after.sky === 'night' && s.after.last.variant === null, `at night: the night back, no Siv (${s.wake.sky}, ${s.after.last.variant})`);
    await T.ev(() => __game.day.set(15));
    await T.frames(6);

    // ---- 6. A mission start mid-dream ends it all at once.
    await atTowel(T);
    await T.frames(6);
    await T.tap('KeyE');
    await sceneAt(T, 3.2);
    r = await st(T);
    check(r.dream && r.sky === 'sunset', 'in the dream');
    await T.ev(() => __game.missions.begin());
    await T.frames(4);
    r = await st(T);
    T.log('mission start', JSON.stringify({ sc: r.sc, sky: r.sky, tune: r.tune, body: r.bodyDream, double: r.double, pst: r.pst, state: r.state, ended: r.last.ended, foam: r.foam.vis }));
    check(r.sc === null && r.last.ended === 'reset' && r.sky !== 'sunset' && r.tune !== 'vals' && !r.bodyDream && !r.dreamShow && !r.double.vis && r.pst === 'normal' && !r.foam.vis && r.state !== 'idle',
      `a mission start ends the dream (${JSON.stringify(r)})`);
    await T.until(() => __game.missions.state === 'running', 60000);
    r = await st(T);
    check(!r.inDialog && !r.bodyDream && r.wash < 0.05, `the mission runs with a clear picture (${r.wash})`);
  },

  async strandefter(T) {
    T_log = (...a) => T.log(...a);
    await T.fresh('&mission=13');
    await T.ev(async () => { window.__audioMod = (await import('/src/audio.js')).audio; window.__audioTune = () => window.__audioMod.tune; });
    await T.ev(() => { __game.unlock('bodega'); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    await T.frames(6);

    // ---- 1. After the end: Majsan herself on the sand.
    const home = await T.ev(() => { const g = __game, h = g.dream.homeOf('majsan'), q = g.lmOffset(h[0], h[1], h[2]); return { x: q.x, z: q.z }; });
    const s = await dream(T, { shots: 'strandefter', visitor: [14.6, 16.4] });
    checkDream(s, 'after the end');
    T.log('after', JSON.stringify(s.after.last), JSON.stringify(s.said));
    check(s.after.last.variant === 'after' && s.after.last.visitor === 'majsan', `Majsan on the sand (${JSON.stringify(s.after.last)})`);
    const lines = s.said.map(([w, t]) => `${w}: ${t}`);
    const iAsk = lines.indexOf('majsan: Vill du dansa med mig?'), iJa = lines.indexOf('stig: Ja.');
    check(iAsk > 0 && iJa > iAsk, `her invitation, his answer (${JSON.stringify(lines)})`);
    let m = await T.ev(() => { const g = __game, n = g.npc('majsan'), d = g.dream; return { dance: n.anim.dance, posed: g.npcPosed('majsan'), spot: n.spot, d: Math.hypot(n.x - d.T.x, n.z - d.T.z) }; });
    check(m.dance && m.posed && m.spot === 'strand' && m.d < 4, `she dances on the sand (${JSON.stringify(m)})`);
    await T.shot('strandefter_dans');
    await T.sleep(1500);
    check(await T.ev(() => !!__game.dream.vis), 'she stays a little');
    await T.ev(() => { const g = __game, t = g.dream.T; g.debugWarp(t.x + 48, t.z - 6, Math.PI / 2); g.cam.yaw = Math.PI / 2; g.cam.snapNext = true; });
    await T.until(() => !__game.dream.vis, 15000);
    m = await T.ev(() => { const g = __game, n = g.npc('majsan'); return { x: n.x, z: n.z, dance: n.anim.dance, busy: n.busy, posed: g.npcPosed('majsan') }; });
    T.log('majsan home', JSON.stringify(m), JSON.stringify(home));
    check(Math.hypot(m.x - home.x, m.z - home.z) < 0.1 && !m.dance && !m.busy && !m.posed, `Majsan home once he is off (${JSON.stringify(m)})`);

    // ---- 2. Majsan held by someone else: nobody comes.
    await T.ev(() => { __game.npc('majsan').busy = true; });
    const s2 = await dream(T);
    check(s2.after.last.variant === null && Math.hypot(s2.after.majsan.x - home.x, s2.after.majsan.z - home.z) < 0.5, `Majsan not free: nobody on the sand (${s2.after.last.variant})`);
    await T.ev(() => { __game.npc('majsan').busy = false; });

    // ---- 3. The flight level: no towel.
    await T.fresh('&mission=2');
    await T.frames(10);
    const fl = await T.ev(() => { const g = __game; return { live: g.dream.live, can: g.dream.canUse(), level: g.level }; });
    check(fl.level === 'flight' && !fl.live && !fl.can, `the flight level: no towel (${JSON.stringify(fl)})`);
  },
};
