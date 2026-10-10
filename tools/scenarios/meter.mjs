// Meter and UI scenarios (WP-H; DESIGN §16.4): ui, skandal.
//   ui:      long Swedish strings in toasts/banners/objective/prompt; a glyph check (åäöæø on a
//            banner and on a world sign); dialogue portrait rings with a Norwegian line; both big
//            maps with collision-free labels; the pause card; FLYGRÄDSLA hot (vignette) and PANIK;
//            every tune and trad cue actually sounds.
//   skandal: two guardia cars; the officer walks (never inside a wall), routes round a building,
//            the stuck rule teleports him; a bust fines 20 % with ¡MULTA! and a 3 s freeze; the
//            Herr Storch witness rule; the porter bribe (hideout); PANIK deferred during a cutaway.
import { check } from '../lib.mjs';

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
};
