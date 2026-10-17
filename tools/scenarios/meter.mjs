// Meter and UI scenarios (WP-H; DESIGN §16.4): ui, skandal, carbust, snackrutor.
//   ui:      long Swedish strings in toasts/banners/objective/prompt; a glyph check (åäöæø on a
//            banner and on a world sign); dialogue portrait rings with a Norwegian line; both big
//            maps with collision-free labels; the pause card; FLYGRÄDSLA hot (vignette) and PANIK;
//            every tune and trad cue actually sounds.
//   skandal: two guardia cars; the officer walks (never inside a wall), routes round a building,
//            the stuck rule teleports him; a bust fines 20 % with ¡MULTA! and a 3 s freeze; the
//            Herr Storch witness rule; the porter bribe (hideout); PANIK deferred during a cutaway.
//   carbust: the user's SKANDAL balance (feature SKANDAL, DESIGN §7.2): an offence adds 3×, the
//            meter holds 10 s before it sinks; in a car real rams by a launched Land Rover: one
//            is no bust (a shove's several impacts are one ram), the invisible clock runs out after
//            14 s, a ram after that only restarts it, a second ram inside it busts; standing with a
//            Land Rover 15 m off is no bust, 6 m off busts after 4 s; in the paint shop's box with
//            one 20 m off no bust (and no paint), 6 m off a bust after 4 s.
//   snackrutor: the speech boxes with the longest scripted line (a [who, text] line in src/content or
//            src/game) at the run's size (W, H): the dialogue box as tall at its first letter as at
//            its last, three lines tall at least (a one-line line gives the same box), the portrait
//            and the text inside it, on screen; the radio toast and a speech bubble with the same
//            line, their text inside them, on screen.
import fs from 'fs';
import path from 'path';
import { check, ROOT } from '../lib.mjs';

const ISLAND = '&mission=6';

// In the page: is (x, z) inside a solid block taller than a step above y?
async function insideSolid(T) {
  return T.ev(async () => {
    const C = await import('/src/world/collision.js');
    const o = __game.shame.officer;
    if (!o || o.state === 'hidden') return false;
    return C.queryBlocks(o.x - 0.3, o.z - 0.3, o.x + 0.3, o.z + 0.3, []).some((b) => b.kind !== 'prop' && b.kind !== 'water' && b.top > o.y + 0.5 && C.contains(b, o.x, o.z));
  });
}

// Overlap check of the big map's label layout (hud.labelLayout).
const labelProblems = () => {
  const L = (window.__hud?.labelLayout || []).filter(Boolean), out = [];
  for (let i = 0; i < L.length; i++) {
    if (!L[i].ok) out.push(`off-canvas or forced: ${L[i].name}`);
    for (let j = i + 1; j < L.length; j++) {
      const a = L[i].r, b = L[j].r;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 2 && oy > 2) out.push(`${L[i].name} / ${L[j].name}`);
    }
  }
  return { n: L.length, problems: out };
};

// The longest scripted line: every dialogue, radio, overhear and cue line is a ['who', 'text'] tuple.
function longestLine() {
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
  walk(path.join(ROOT, 'src', 'content')); walk(path.join(ROOT, 'src', 'game'));
  let best = null;
  for (const f of files) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\[\s*'(\w+)',\s*'((?:\\.|[^'\\\n])*)'/g)) {
      const text = m[2].replace(/\\(.)/g, '$1');
      if (!best || text.length > best[1].length) best = [m[1], text, path.relative(ROOT, f)];
    }
  }
  return best;
}

// The dialogue box's layout in the page: its rect, the portrait's and the text's (the text's counts
// the untyped rest, which holds its place).
const dialogBox = () => {
  const d = document.getElementById('dialog'), r = d.getBoundingClientRect(), t = d.querySelector('.dlg-text');
  const p = d.querySelector('.dlg-portrait').getBoundingClientRect(), tr = t.getBoundingClientRect();
  return { h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right, pTop: p.top, pBottom: p.bottom, pLeft: p.left, tTop: tr.top, tBottom: tr.bottom, tRight: tr.right,
    lines: Math.round(tr.height / parseFloat(getComputedStyle(t).lineHeight)), wide: t.scrollWidth > t.clientWidth + 1, W: innerWidth, H: innerHeight };
};
// A box's text inside it (a Range over its contents: a bubble's tail is its ::after, outside it) and
// the box on screen.
const boxProblems = (sel) => {
  const all = document.querySelectorAll(sel), e = all[all.length - 1];
  if (!e) return ['none shown'];
  const r = e.getBoundingClientRect(), out = [], rg = document.createRange();
  rg.selectNodeContents(e);
  const t = rg.getBoundingClientRect(), bw = parseFloat(getComputedStyle(e).borderTopWidth);
  if (t.left < r.left + bw - 0.5 || t.right > r.right - bw + 0.5 || t.top < r.top + bw - 0.5 || t.bottom > r.bottom - bw + 0.5) out.push(`text outside the box (${t.left.toFixed(0)},${t.top.toFixed(0)}–${t.right.toFixed(0)},${t.bottom.toFixed(0)} in ${r.left.toFixed(0)},${r.top.toFixed(0)}–${r.right.toFixed(0)},${r.bottom.toFixed(0)})`);
  if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) out.push(`off screen (${r.left.toFixed(0)},${r.top.toFixed(0)}–${r.right.toFixed(0)},${r.bottom.toFixed(0)})`);
  return out;
};

export const SCENARIOS = {
  async ui(T) {
    await T.fresh(ISLAND);
    await T.ev(async () => { window.__hud = (await import('/src/game/hud.js')).hud; window.__S = await import('/src/strings.js'); });
    await T.frames(20);
    // --- long Swedish strings everywhere at once ---
    await T.ev(() => {
      const g = __game, h = __hud, { S, fmt } = __S;
      h.toast(S.panicIdle);
      h.toast(fmt('olePays', { n: 800 }));
      g.radio('ole', 'Det er farligere å kjøre bil enn å fly.');
      // main.updateHud() rewrites the objective and the prompt every frame: feed it ours.
      const obj = { title: 'Uppdrag 12 av 13 · Grisfesten', text: 'Kör Majsan, Sivan och Stig-Helmer upp till grisfesten innan bussen går – och glöm inte blommorna!', timer: 42, bar: 0.62, barLabel: 'SKICK' };
      window.__keep = { objective: g.missions.objective, near: g.nearestInteractable };
      g.missions.objective = () => obj;
      g.nearestInteractable = () => ({ type: 'it', it: { prompt: '<b>E</b> Muta portiern (500 pta)' } });
      h.showBanner('PORTIERN TITTADE BORT', 'Skandalen är som bortblåst', 'good', 0);
    });
    await T.frames(30);
    await T.shot('ui_hud');
    // --- glyphs: a banner and a world sign ---
    await T.ev(async () => {
      const g = __game, h = __hud, p = g.player;
      g.missions.objective = window.__keep.objective; g.nearestInteractable = window.__keep.near;
      h.showBanner('ÅÄÖ ÆØ ¡OLÉ! ¿QUÉ?', 'Smörgåsbord · blåbærsyltetøy · ¡Josito! · señor – nästan…', 'mission', 0);
      const { signMesh } = await import('/src/gfx.js');
      const s = signMesh('HÄR ÄR DET FÆRDIG\nÅÄÖ åäö Ææ Øø éíñ ¡¿', 6, 2.2, { bg: '#fff8e6' });
      const yaw = g.cam.yaw;
      s.position.set(p.x + Math.sin(yaw) * 6, p.y + 2.2, p.z + Math.cos(yaw) * 6);
      s.visible = false;
      s.rotation.y = yaw + Math.PI;
      g.scene.add(s);
      window.__glyphSign = s;
    });
    await T.frames(20);
    await T.shot('ui_glyphs');
    await T.ev(() => { __hud.hideBanner(); window.__glyphSign.visible = true; });
    await T.frames(20);
    await T.shot('ui_glyphs_sign');
    const fonts = await T.ev(() => ({ lucky: document.fonts.check('20px "Luckiest Guy"', 'ÅÄÖæø'), nunito: document.fonts.check('900 20px Nunito', 'åäöæø'), shrikhand: document.fonts.check('20px Shrikhand', '&') }));
    T.log('fonts', JSON.stringify(fonts));
    await T.ev(() => { __hud.hideBanner(); __game.scene.remove(window.__glyphSign); });
    // --- dialogue: portrait rings, a Norwegian line ---
    const lines = [['ole', 'Du vet vel at det er 50 prosent sjanse å overleve en flyulykke.'], ['stig', 'Jag kan flyga, jag är inte rädd.']];
    await T.ev((ls) => { const g = __game; g.autoDialog = false; window.__dlgDone = false; g.dialog(ls).then(() => { window.__dlgDone = true; }); }, lines);
    await T.until((t) => document.querySelector('.dlg-text').textContent === t, 15000, lines[0][1]);
    let r = await T.ev(() => ({ ring: getComputedStyle(document.getElementById('dialog')).getPropertyValue('--ring').trim(), want: __game.charDef('ole').ring, name: document.querySelector('.dlg-name').textContent, img: (document.querySelector('.dlg-portrait img').src || '').length }));
    T.log('dialog ole', JSON.stringify(r));
    check(r.ring === r.want && r.img > 100, 'dialogue portrait + ring colour from def.ring');
    await T.shot('ui_dialog_ole');
    await T.tap('Space');
    await T.until((t) => document.querySelector('.dlg-text').textContent === t, 15000, lines[1][1]);
    r = await T.ev(() => ({ ring: getComputedStyle(document.getElementById('dialog')).getPropertyValue('--ring').trim(), want: __game.charDef('stig').ring }));
    check(r.ring === r.want, 'ring follows the speaker');
    await T.shot('ui_dialog_stig');
    await T.tap('Space');
    await T.until(() => window.__dlgDone === true, 5000);
    await T.ev(() => { __game.autoDialog = true; });
    // --- big map, island ---
    await T.tap('KeyM');
    await T.frames(15);
    r = await T.ev(labelProblems);
    T.log('island labels', r.n, JSON.stringify(r.problems));
    check(r.n >= 15 && r.problems.length === 0, 'island big-map labels laid out without collisions');
    await T.shot('ui_bigmap_island');
    await T.tap('KeyM');
    // --- pause card (pause() is a no-op in test mode: show the card by hand) ---
    await T.ev(() => { const g = __game; document.getElementById('music').textContent = g.musicLabel(); document.getElementById('pause').classList.add('show'); });
    await T.frames(5);
    await T.shot('ui_pause');
    await T.ev(() => document.getElementById('pause').classList.remove('show'));
    // --- every tune and trad cue sounds ---
    const tunes = {};
    for (const name of ['muzak', 'sol', 'skandal', 'vals', 'jul', 'samba']) {
      await T.ev((n) => window.__audio || import('/src/audio.js').then((m) => { window.__audio = m.audio; }), null);
      await T.ev((n) => window.__audio.setTune(n), name);
      await T.until((n) => window.__audio.level().tune === n, 6000, name).catch(() => {});
      let peak = 0, st = '';
      for (let k = 0; k < 8; k++) { await T.sleep(220); const l = await T.ev(() => window.__audio.level()); peak = Math.max(peak, l.rms); st = `${l.state}/${l.tune}`; }
      tunes[name] = `${peak.toFixed(3)} ${st}`;
    }
    T.log('tunes rms', JSON.stringify(tunes));
    const audioOn = await T.ev(() => window.__audio.level().state === 'running');
    if (audioOn) check(Object.entries(tunes).every(([n, v]) => +v.split(' ')[0] > 0.004 && v.endsWith('/' + n)), 'every tune plays (rms > 0.004)');
    const trad = {};
    for (const name of ['smaGrodorna', 'hejTomtegubbar', 'helanGar']) {
      const len = await T.ev((n) => window.__audio.trad(n), name);
      let peak = 0;
      for (let k = 0; k < 6; k++) { await T.sleep(200); peak = Math.max(peak, (await T.ev(() => window.__audio.level())).rms); }
      trad[name] = `${(+len).toFixed(1)}s ${peak.toFixed(3)}`;
    }
    T.log('trad', JSON.stringify(trad));
    if (audioOn) check(Object.values(trad).every((v) => parseFloat(v) > 5), 'trad cues have length');
    const sfx = await T.ev(() => {
      const a = window.__audio, out = [];
      for (const n of ['chime', 'pling', 'dingdong', 'beep', 'applause', 'heartbeat', 'rattle', 'flush', 'squeak', 'laugh', 'knock', 'slap', 'doorSlam', 'ambulance', 'baa', 'oink', 'thud', 'crash', 'coin', 'pickup', 'splash']) { try { a[n](); } catch (e) { out.push(n + ': ' + e.message); } }
      for (const j of ['start', 'complete', 'fail', 'pryl']) a.jingle(j);
      a.siren(true); a.sirenNear(30); a.siren(false); a.drone(0.5, 0.5); a.drone(0, 0);
      return out;
    });
    check(sfx.length === 0, 'every §12.3 sound effect runs: ' + sfx.join(', '));
    // --- flight: FLYGRÄDSLA hot (vignette), big map, PANIK ---
    await T.fresh('&mission=2');
    await T.ev(async () => { window.__hud = (await import('/src/game/hud.js')).hud; });
    await T.ev(() => { const g = __game; g.shame.add(84, { force: true }); });
    await T.frames(20);
    r = await T.ev(() => ({ hot: document.body.classList.contains('fear-hot'), vig: +getComputedStyle(document.getElementById('vignette')).opacity, label: document.querySelector('.shame-label').textContent }));
    T.log('fear hot', JSON.stringify(r));
    check(r.hot && r.vig > 0.3 && r.label === 'FLYGRÄDSLA', 'fear-hot vignette at >= 70');
    await T.shot('ui_fear_hot');
    await T.tap('KeyM');
    await T.frames(15);
    r = await T.ev(labelProblems);
    T.log('flight labels', r.n, JSON.stringify(r.problems));
    check(r.n >= 5 && r.problems.length === 0, 'flight big-map labels laid out without collisions');
    await T.shot('ui_bigmap_flight');
    await T.tap('KeyM');
    await T.ev(() => __game.shame.add(30, { force: true }));
    await T.frames(12);
    r = await T.ev(() => ({ panic: __game.shame.panicT > 0, cls: document.body.classList.contains('panik'), banner: document.querySelector('.banner-main').textContent }));
    T.log('panik', JSON.stringify(r));
    check(r.panic && r.cls && r.banner === 'PANIK!', 'PANIK: banner + tunnel vision');
    await T.shot('ui_panik');
    await T.until(() => __game.shame.panicT <= 0 && !document.body.classList.contains('panik'), 10000);
  },

  async skandal(T) {
    await T.fresh(ISLAND);
    await T.ev(async () => { window.__hud = (await import('/src/game/hud.js')).hud; });
    // A road intersection near the middle, away from Herr Storch.
    let r = await T.ev(() => {
      const g = __game, s = g.npc('herrStorch');
      g.addCoins(2000 - g.coins);
      const L = window.__lm;
      const spot = L('marknad');
      const a = g.approachSpot('marknad');
      g.debugWarp(a.x, a.z, a.yaw);
      return { storch: Math.hypot(s.x - a.x, s.z - a.z).toFixed(0), at: [a.x.toFixed(0), a.z.toFixed(0)], spot: !!spot };
    });
    T.log('start', JSON.stringify(r));
    await T.anyCar();
    await T.ev(() => __game.shame.add(100));
    await T.frames(20);
    r = await T.ev(() => { const s = __game.shame; return { pursuit: s.pursuit, cars: s.pursuers.filter((c) => c.type === 'guardia').length, officer: !!s.officer && s.officer.state !== 'hidden', lights: document.body.classList.contains('pursuit') }; });
    T.log('pursuit', JSON.stringify(r));
    check(r.pursuit && r.cars === 2 && !r.officer && r.lights, 'SKANDAL 100: two guardia cars, no officer while in a car, siren lights');
    await T.shot('skandal_pursuit');
    // Keep the pursuit going and the Land Rovers out of the way for the officer tests.
    const park = () => T.ev(() => { const s = __game.shame; s.forced = true; s.pursuers.forEach((c, k) => { c.ai = null; c.place(-250 + k * 12, -250, 0); c.vx = c.vz = 0; }); });
    await park();
    await T.ev(() => __game.exitCar(true));
    await T.frames(10);
    // 1. He walks at the player and never stands inside a wall. Polled for up to 10 s: when his random
    // 22–32 m spawn has a building in between he first walks out to a block corner (planOfficer), and
    // the straight-line distance barely drops in the first 1.5 s (the old window failed ~1 run in 3)
    // or grows: from inside the market block he closed 3 m only after 5.3–6.7 s and reached the
    // player at 8–9 s (Phase 3 r2). He must close 3 m by walking (no stuck teleport).
    r = await T.ev(() => { const g = __game, o = g.shame.officer, p = g.player; g.shame.teleports = 0; return { vis: !!o && o.state !== 'hidden', d: Math.hypot(o.x - p.x, o.z - p.z) }; });
    check(r.vis, 'officer appears when the player is on foot');
    const d0 = r.d;
    let inWall = 0;
    const t0 = Date.now();
    for (let k = 0; k < 66; k++) {
      await T.sleep(150);
      if (await insideSolid(T)) inWall++;
      r = await T.ev(() => { const g = __game, s = g.shame, o = s.officer, p = g.player; s.caughtT = 99; return { d: Math.hypot(o.x - p.x, o.z - p.z), mode: s.steer.mode, tp: s.teleports }; });
      if (r.d < d0 - 3 && k >= 9) break;   // at least the old 1.5 s of inside-a-solid samples
    }
    T.log('officer walk', d0.toFixed(1), '->', r.d.toFixed(1), r.mode, `after ${((Date.now() - t0) / 1000).toFixed(1)} s`, 'inWall', inWall, 'teleports', r.tp);
    check(inWall === 0 && r.d < d0 - 3 && !r.tp, 'the officer closes in and never stands inside a solid');
    await T.shot('skandal_officer');
    // 2. A building between them: he routes round it (or the stuck rule moves him).
    r = await T.ev(async () => {
      const g = __game, C = await import('/src/world/collision.js'), p = g.player;
      const list = C.queryBlocks(p.x - 160, p.z - 160, p.x + 160, p.z + 160, []).filter((b) => b.shape === C.BOX && b.kind === 'building' && b.maxX - b.minX > 8 && b.maxZ - b.minZ > 8 && b.maxX - b.minX < 40 && b.maxZ - b.minZ < 40);
      for (const b of list) {
        const cz = (b.minZ + b.maxZ) / 2, ax = b.minX - 3, bx = b.maxX + 3;
        if (!g.spotFree(ax, cz) || !g.spotFree(bx, cz) || g.groundAt(ax, cz) > 0.5 || g.groundAt(bx, cz) > 0.5) continue;
        if (C.segmentBlocked(ax, cz, bx, cz, 0.6) < 0) continue;
        g.debugWarp(ax, cz, -Math.PI / 2);
        const o = g.shame.officer; o.teleport(bx, cz); o.trail.length = 0; o.trail.push({ x: bx, z: cz, t: o.age });
        g.shame.teleports = 0; g.shame.steer.t = 0;
        return { b: [b.minX.toFixed(0), b.minZ.toFixed(0), b.maxX.toFixed(0), b.maxZ.toFixed(0)], d: bx - ax };
      }
      return null;
    });
    T.log('behind building', JSON.stringify(r));
    if (r) {
      let got = null;
      for (let k = 0; k < 40 && !got; k++) {
        await T.sleep(200);
        if (await insideSolid(T)) inWall++;
        got = await T.ev(() => { const g = __game, s = g.shame, o = s.officer, p = g.player; s.caughtT = 99; const d = Math.hypot(o.x - p.x, o.z - p.z); return d < 6 ? `reached ${d.toFixed(1)} m (${s.steer.mode})` : s.teleports > 0 ? 'teleported' : null; });
      }
      T.log('round the building:', got, 'inWall', inWall);
      check(got && inWall === 0, 'blocked behind a building: he gets round it within 8 s (route or stuck teleport)');
      await T.shot('skandal_round');
    }
    // 3. The stuck rule: an officer who cannot move, out of view, is teleported within 6 s.
    r = await T.ev(() => {
      const g = __game, s = g.shame, o = s.officer, p = g.player;
      s.cfg._speed = s.cfg.onFootSpeed; s.cfg.onFootSpeed = 0;
      const yaw = g.cam.yaw, q = g.freeSpot(p.x - Math.sin(yaw) * 40, p.z - Math.cos(yaw) * 40, 0, 6);
      o.teleport(q.x, q.z); o.trail.length = 0; o.trail.push({ x: q.x, z: q.z, t: o.age });
      s.teleports = 0;
      return Math.hypot(q.x - p.x, q.z - p.z).toFixed(0);
    });
    const tp = await T.until(() => __game.shame.teleports > 0, 6000).then(() => true, () => false);
    await T.ev(() => { const s = __game.shame; s.cfg.onFootSpeed = s.cfg._speed; delete s.cfg._speed; });
    T.log('stuck officer at', r, 'm -> teleported', tp);
    check(tp, 'a stuck officer out of view is teleported within 6 s');
    // 4. The bust: 20 % of 2000 = 400, ¡MULTA!, frozen ~3 s.
    await T.ev(() => { const g = __game, s = g.shame, o = s.officer, p = g.player; s.caughtT = 0; o.teleport(p.x + 1, p.z); });
    await T.until(() => !__game.shame.pursuit, 5000);
    await T.frames(8);
    r = await T.ev(() => ({ coins: __game.coins, frozen: __game.frozenT, main: document.querySelector('.banner-main').textContent, sub: document.querySelector('.banner-sub').textContent, cls: document.getElementById('banner').className, x: __game.player.x, z: __game.player.z }));
    T.log('bust', JSON.stringify(r));
    check(r.coins === 1600 && r.frozen > 2 && r.main === '¡MULTA!' && r.sub.includes('400') && r.cls.includes('multa'), 'busted: -400 pta, ¡MULTA!, frozen');
    await T.shot('skandal_multa');
    await T.hold(['KeyW'], 800);
    const moved = await T.ev((a) => Math.hypot(__game.player.x - a.x, __game.player.z - a.z), { x: r.x, z: r.z });
    check(moved < 0.2, 'frozen after the bust (W does nothing)');
    await T.until(() => __game.frozenT <= 0, 6000);
    // 5. The witness rule: an offence near Herr Storch adds nothing.
    r = await T.ev(() => {
      const g = __game, s = g.shame, n = g.npc('herrStorch');
      const q = g.freeSpot(n.x, n.z, 3, 6); g.debugWarp(q.x, q.z, 0);
      s.v = 10; s.witnessT = 0; s.add(9);
      const toast = [...document.querySelectorAll('.toast.witness')].map((t) => t.textContent).join('|');
      return { v: s.v, toast, film: !!n.anim.film };
    });
    T.log('witness', JSON.stringify(r));
    check(r.v === 10 && r.toast.includes('linsskyddet'), 'witness rule: 0 SKANDAL near Herr Storch + toast');
    await T.frames(10);
    await T.shot('skandal_witness');
    // 6. The porter bribe: E at the reception during a pursuit ends it for 500 pta.
    r = await T.ev(() => {
      const g = __game, s = g.shame;
      const far = window.__lm('plaza'); g.debugWarp(far.x + 3, far.z + 3, 0);
      s.v = 0; s.add(100);
      s.pursuers.forEach((c, k) => { c.ai = null; c.place(-250 + k * 12, -250, 0); });
      s.forced = true;
      const a = g.approachSpot('flamencoRecepcion'); g.debugWarp(a.x, a.z, a.yaw);
      return { pursuit: s.pursuit, coins: g.coins };
    });
    await T.frames(5);
    const before = r.coins;
    r = await T.ev(() => { const g = __game, it = g.nearestInteractable(); return { id: it?.it?.id, prompt: document.getElementById('prompt').innerText }; });
    T.log('hideout prompt', JSON.stringify(r));
    check(r.id === 'hideout:flamencoRecepcion' && r.prompt.includes('Muta portiern'), 'hideout prompt at the reception during a pursuit');
    await T.ev(() => { __game.shame.officer && (__game.shame.caughtT = 99); __game.interact(); });
    await T.frames(10);
    // The porter's [F*] line first, then the banner (drawn over bubbles, it hid the line).
    const bribeBanner = () => document.getElementById('banner').classList.contains('show') && document.querySelector('.banner-main').textContent === 'PORTIERN TITTADE BORT';
    r = await T.ev(() => [...document.querySelectorAll('.bubble')].some((b) => b.textContent.includes('500 pesetas')));
    const early = await T.ev(bribeBanner);
    T.log('bribe line', r, 'banner yet', early);
    check(r && !early, 'bribe: the porter says his line before the banner');
    await T.until(bribeBanner, 6000);
    r = await T.ev(() => ({ pursuit: __game.shame.pursuit, coins: __game.coins, v: __game.shame.v, main: document.querySelector('.banner-main').textContent, cd: __game.shame.hideoutT }));
    T.log('bribed', JSON.stringify(r));
    check(!r.pursuit && r.coins === before - 500 && r.v === 0 && r.main === 'PORTIERN TITTADE BORT' && r.cd > 50, 'bribe: pursuit over, -500 pta, cooldown');
    await T.shot('skandal_hideout');
    r = await T.ev(() => { const g = __game, s = g.shame; s.add(100); const it = g.nearestInteractable(); const id = it?.it?.id; s.clear(); return id; });
    check(r !== 'hideout:flamencoRecepcion', 'no second bribe inside the cooldown');
    // 7. PANIK is deferred while a cutaway camera is up (§5.9; game.inCutaway).
    await T.fresh('&mission=2');
    r = await T.ev(() => { const g = __game, s = g.shame; g.cutTo('galleyFront'); s.add(100, { force: true }); return { v: s.v, panic: s.panicT > 0, deferred: s.deferred, cut: g.inCutaway }; });
    await T.frames(30);
    const still = await T.ev(() => __game.shame.panicT > 0);
    T.log('cutaway', JSON.stringify(r), 'panic during cut', still);
    check(r.cut && r.v === 95 && !r.panic && r.deferred && !still, 'PANIK deferred during a cutaway');
    await T.ev(() => __game.endCut());
    await T.until(() => __game.shame.panicT > 0, 3000);
    T.log('PANIK fired after the cutaway');
    await T.shot('skandal_deferred_panik');
    await T.until(() => __game.shame.panicT <= 0, 10000);
  },

  async carbust(T) {
    await T.fresh(ISLAND);
    await T.ev(async () => { window.__Car = (await import('/src/actors/car.js')).Car; });
    // 1. Gain and the idle delay, on foot on the z = 40 road's pavement, away from Herr Storch.
    let r = await T.ev(() => {
      const g = __game, s = g.shame, n = g.npc('herrStorch');
      g.addCoins(5000 - g.coins);
      g.debugWarp(-40, 47, Math.PI / 2);
      s.v = 0; s.add(9);
      return { v: s.v, storch: Math.round(Math.hypot(n.x + 40, n.z - 47)), cfg: { gain: s.cfg.gain, idleDelay: s.cfg.idleDelay, carBust: s.cfg.carBust } };
    });
    T.log('gain', JSON.stringify(r));
    check(r.v === 27 && r.storch > 25, 'an offence adds 3 × its amount (a kicked pedestrian, 9 → 27)');
    let t0 = Date.now(), held = null;
    while (Date.now() - t0 < 13000) {
      await T.sleep(100);
      const v = await T.ev(() => __game.shame.v);
      if (v < 27) { held = (Date.now() - t0) / 1000; break; }
    }
    T.log('the meter held', held, 's before it sank');
    check(held !== null && held > 9.5 && held < 11, 'the meter waits 10 s before it sinks');
    await T.ev(() => { __game.shame.v = 0; });

    // A pursuit in a new hatch with both Land Rovers parked out of the way (no decay: forced).
    const stand = (x, z, yaw) => T.ev((x, z, yaw) => {
      const g = __game, c = window.__pc;
      c.place(x, z, yaw); c.vx = c.vz = 0; c.w = 0;
      if (g.playerCar !== c) g.enterCar(c);
    }, x, z, yaw);
    const pursue = async (x, z, yaw) => {
      await T.until(() => !(__game.frozenT > 0), 8000);
      await T.ev((x, z) => {
        const g = __game, c = new window.__Car('hatch', { color: 0x8fb3c9 });
        if (window.__pc) g.removeCar(window.__pc);
        c.place(x, z, 0); g.addCar(c); window.__pc = c;
      }, x, z);
      await stand(x, z, yaw);
      await T.frames(5);
      await T.ev(() => {
        const s = __game.shame;
        s.add(100);
        s.forced = true;
        s.pursuers.forEach((c, k) => { c.ai = null; c.place(-250 + k * 12, -250, 0); c.vx = c.vz = 0; });
        window.__rams = 0;
        if (!s.__onRam) { s.__onRam = s.onRam; s.onRam = (car, imp) => { window.__rams++; s.__onRam(car, imp); }; }
        // When the bust came, in page time (screenshots and polling add latency on the Node side).
        if (!s.__busted) { s.__busted = s.busted; s.busted = () => { window.__bustAt = performance.now(); s.__busted(); }; }
      });
      await T.frames(5);
    };
    // A real ram: Land Rover 0 launched at 14 m/s at the stopped car's tail from 8 m behind.
    const ram = async () => {
      await stand(-40, 42.75, Math.PI / 2);
      const n0 = await T.ev(() => window.__rams);
      await T.ev(() => { const h = __game.shame.pursuers[0]; h.place(-48, 42.75, Math.PI / 2); h.vx = 14; h.vz = 0; h.w = 0; });
      await T.until((n) => window.__rams > n || !__game.shame.pursuit, 4000, n0);
      await T.sleep(500);
      return T.ev(() => {
        const g = __game, s = g.shame, h = s.pursuers[0];
        const out = { pursuit: s.pursuit, ramT: +s.ramT.toFixed(1), impacts: window.__rams, coins: g.coins, inCar: !!g.playerCar };
        if (h) { h.place(-250, -250, 0); h.vx = h.vz = 0; }
        return out;
      });
    };

    // 2. Rams: one is no bust, the clock runs out after 14 s, a ram after that only restarts it, a
    // second ram inside it busts.
    await pursue(-40, 42.75, Math.PI / 2);
    r = await ram();
    T.log('ram 1', JSON.stringify(r));
    check(r.pursuit && r.inCar && r.ramT > 12 && r.coins === 5000, 'one ram: no bust, the invisible 14 s clock starts');
    await T.shot('carbust_ram1');
    t0 = Date.now();
    await T.until(() => __game.shame.ramT <= 0, 17000);
    const clock = (Date.now() - t0) / 1000 + 0.5;
    T.log('ram clock ran out after', clock.toFixed(1), 's');
    check(clock > 13 && clock < 15.5, 'the ram clock runs out after 14 s');
    r = await ram();
    T.log('ram 2 (after the clock)', JSON.stringify(r));
    check(r.pursuit && r.inCar && r.ramT > 12, 'a ram after the clock ran out only restarts it');
    await T.sleep(2500);
    r = await ram();
    T.log('ram 3 (inside the clock)', JSON.stringify(r));
    check(!r.pursuit && !r.inCar && r.coins === 4000, 'a second ram within 14 s: busted (out of the car, −20 %)');
    await T.shot('carbust_ram2_multa');

    // A shove reports an impact on several steps: contacts less than 1 s apart are one ram.
    await pursue(-40, 42.75, Math.PI / 2);
    r = await T.ev(() => { const s = __game.shame, h = s.pursuers[0]; s.onRam(h, 5); s.onRam(h, 4); s.onRam(h, 3); const out = { pursuit: s.pursuit, ramT: s.ramT }; s.resetCarBust(); return out; });
    T.log('one shove, three impacts', JSON.stringify(r));
    check(r.pursuit && r.ramT === 14, 'three impacts in one shove are one ram');

    // 3. Standing still: a Land Rover 15 m off is no bust; 6 m off, a bust after 4 s.
    await T.ev(() => { const h = __game.shame.pursuers[0]; h.place(-55, 42.75, Math.PI / 2); h.vx = h.vz = 0; });
    await T.sleep(5500);
    r = await T.ev(() => { const s = __game.shame; return { pursuit: s.pursuit, stopT: s.stopT, inCar: !!__game.playerCar }; });
    T.log('Land Rover 15 m off', JSON.stringify(r));
    check(r.pursuit && r.inCar && r.stopT === 0, 'standing with a Land Rover 15 m off: no bust');
    await T.ev(() => { const h = __game.shame.pursuers[0]; h.place(-46, 42.75, Math.PI / 2); h.vx = h.vz = 0; window.__placedAt = performance.now(); });
    await T.sleep(3000);
    const early = await T.ev(() => __game.shame.pursuit);
    await T.shot('carbust_stand');
    await T.until(() => !__game.shame.pursuit, 4000);
    const standT = await T.ev(() => (window.__bustAt - window.__placedAt) / 1000);
    r = await T.ev(() => ({ coins: __game.coins, inCar: !!__game.playerCar, main: document.querySelector('.banner-main').textContent }));
    T.log('Land Rover 6 m off: busted after', standT.toFixed(1), 's', JSON.stringify(r));
    check(early && standT > 3.9 && standT < 4.6 && !r.inCar && r.main === '¡MULTA!', 'standing with a Land Rover 6 m off: busted after 4 s');
    await T.frames(6);
    await T.shot('carbust_stand_multa');

    // 4. The paint shop's box: a Land Rover 20 m off (the `seen` toast) is no bust and no paint;
    // 6 m off, a bust after 4 s and still no paint.
    // The pursuit starts outside the box (pintura's own approach spot); then the Land Rover and
    // the car go in place in one frame, so the shop never sees the box clear.
    const out = await T.ev(() => __game.lmOffset('pintura', 6.75, 14));
    await pursue(out.x, out.z, Math.PI);
    await T.ev(() => {
      const g = __game, z = window.__lm('pintura'), h = g.shame.pursuers[0], c = window.__pc;
      g.addCoins(3000 - g.coins);
      h.place(z.x + 20, z.z, 0); h.vx = h.vz = 0;
      c.place(z.x, z.z, Math.PI); c.vx = c.vz = 0; c.w = 0;
    });
    await T.sleep(1500);
    const toasts = await T.ev(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '));
    await T.sleep(4000);
    r = await T.ev(() => { const g = __game, s = g.shame; return { pursuit: s.pursuit, inCar: !!g.playerCar, busy: s.paint.busy, painted: !!window.__pc.painted, stopT: s.stopT }; });
    T.log('paint box, Land Rover 20 m off', JSON.stringify(r), toasts);
    check(r.pursuit && r.inCar && !r.busy && !r.painted && r.stopT === 0 && toasts.includes('Guardia Civil ser dig'), 'stopped in the paint box with a Land Rover 20 m off: no bust, no paint');
    await T.shot('carbust_paint_seen');
    // 6 m in front of the box, on the drive-by's forecourt line (clear of props and solids).
    await T.ev(() => { const q = __game.lmOffset('pintura', 0.75, 6), h = __game.shame.pursuers[0]; h.place(q.x, q.z, Math.PI / 2); h.vx = h.vz = 0; window.__placedAt = performance.now(); });
    await T.until(() => !__game.shame.pursuit, 6000);
    const paintT = await T.ev(() => (window.__bustAt - window.__placedAt) / 1000);
    r = await T.ev(() => { const g = __game; return { coins: g.coins, inCar: !!g.playerCar, busy: g.shame.paint.busy, painted: !!window.__pc.painted }; });
    T.log('paint box, Land Rover 6 m off: busted after', paintT.toFixed(1), 's', JSON.stringify(r));
    check(paintT > 3.9 && paintT < 4.6 && !r.inCar && !r.busy && !r.painted && r.coins === 2400, 'stopped in the paint box with a Land Rover 6 m off: busted after 4 s, no paint');
    await T.frames(6);
    await T.shot('carbust_paint_multa');
  },

  async snackrutor(T) {
    const [who, text, file] = longestLine();
    T.log(`longest line (${text.length} chars, ${who}, ${file}): ${text}`);
    check(text.length >= 100, 'found the longest scripted line');
    await T.fresh(ISLAND);
    // --- the dialogue box: a one-line line, then the longest typed slowly, its height every frame ---
    const short = 'Ja.';
    await T.ev((ls) => { const g = __game; g.autoDialog = false; window.__dlgDone = false; g.dialog(ls).then(() => { window.__dlgDone = true; }); }, [['stig', short], [who, text]]);
    await T.until((t) => document.querySelector('.dlg-text').textContent === t, 15000, short);
    await T.sleep(600);   // the box's slide in (0.35 s, real time)
    const a = await T.ev(dialogBox);
    T.log('dialog, one line', JSON.stringify(a));
    await T.shot('snack_dialog_kort');
    await T.ev((line) => {
      const g = __game;
      window.__dlgSpeed = g.dialogSpeed;
      g.dialogSpeed = 12;
      window.__dlgLog = [];   // [typed, box height] every frame of the longest line ('Ja.' is no prefix of it)
      window.__dlgRec = () => { const d = document.getElementById('dialog'), t = d.querySelector('.dlg-text'); if (line.startsWith(t.textContent)) window.__dlgLog.push([t.textContent.length, d.offsetHeight]); };
      g.onFrame(window.__dlgRec);
    }, text);
    await T.tap('Space');
    await T.until((n) => document.querySelector('.dlg-text').textContent.length >= n, 60000, Math.floor(text.length * 0.45));
    await T.shot('snack_dialog_halv');
    const half = await T.ev(dialogBox);
    await T.until((t) => document.querySelector('.dlg-text').textContent === t, 90000, text);
    await T.frames(3);
    const b = await T.ev(dialogBox);
    const log = await T.ev(() => { __game.offFrame(window.__dlgRec); __game.dialogSpeed = window.__dlgSpeed; return window.__dlgLog; });
    T.log('dialog, longest', JSON.stringify(b));
    await T.shot('snack_dialog_lang');
    const hs = log.map((e) => e[1]), h0 = Math.min(...hs), h1 = Math.max(...hs);
    T.log(`typing: ${log.length} frames, typed ${log[0]?.[0]}..${log[log.length - 1]?.[0]}, box ${h0}..${h1} px`);
    check(log.length > 20 && log[0][0] <= 2 && h1 - h0 < 1 && Math.abs(half.h - b.h) < 1, 'the box is as tall at the first letter as at the last (no growth mid-line)');
    check(a.lines >= 3 && (b.lines > 3 || Math.abs(a.h - b.h) < 1), `three text lines at least: a one-line line gives the longest's box when it fits in three (${a.lines}, ${b.lines} lines)`);
    for (const [k, r] of [['one line', a], ['longest', b]]) {
      check(r.pTop >= r.top + 4 && r.pBottom <= r.bottom - 4, `${k}: the portrait inside the box`);
      check(r.tTop >= r.top + 4 && r.tBottom <= r.bottom - 4 && r.tRight <= r.right - 4 && !r.wide, `${k}: the text inside the box`);
      check(r.top >= 0 && r.bottom <= r.H && r.left >= 0 && r.right <= r.W, `${k}: the box on screen`);
    }
    await T.tap('Space');
    await T.until(() => window.__dlgDone === true, 5000);
    await T.ev(() => { __game.autoDialog = true; });
    // --- the radio toast ---
    await T.ev((l) => __game.radio(l[0], l[1]), [who, text]);
    await T.sleep(500);
    let p = await T.ev(boxProblems, '.toast.radio');
    T.log('radio', JSON.stringify(p));
    check(!p.length, 'radio: the text inside the toast, on screen');
    await T.shot('snack_radio');
    // --- a speech bubble (over Stig) ---
    await T.ev((t) => __game.say(__game.player, t, 8), text);
    await T.frames(10);
    p = await T.ev(boxProblems, '.bubble');
    T.log('bubble', JSON.stringify(p));
    check(!p.length, 'bubble: the text inside the bubble, on screen');
    await T.shot('snack_bubble');
  },
};
