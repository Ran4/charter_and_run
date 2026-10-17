// Låna Guardia-jeepen – the borrowed Guardia jeep (free roam, DESIGN §10.34; feature 51): guardiajeep,
// jeepsiren.
//   guardiajeep: the table (every line in GUARDIA_JEEP tagged in the file); at index 8 (before the
//             bodega) both jeeps at the Casa Cuartel locked ("Den är upptagen!", no prompt); the bodega's
//             unlock (UNLOCKS.grisbil) and its toast: guardia1 open, guardia2 still locked; at its bay
//             "E Låna jeepen", 25 m off "E Kliv in"; E at the bay: Stig's "Jag lånar den bara en liten
//             stund…", 1.2 s later SKANDAL at the top and the pursuit, the speedo's "Guardia-jeepen";
//             shaken off (the escape): his, the toast; in again at the bay: no SKANDAL; busted in it
//             (a later pursuit): the officer's "Ursäkta, är det din bil?" instead of "¡Documentación!",
//             Stig's "Nej.", the fade, the jeep back in its bay, the toast, no bust radio, no longer his;
//             the loan again and busted on foot 90 m from the jeep: the tow without the fade; the loan
//             bribed off at the porter: his; wrecked and cleared away: a new one in its bay once he is
//             off; a mission start: locked, "Den är upptagen!".
//   jeepsiren: at index 9, the jeep his: a traffic car 18 m ahead in his lane drives on (the control);
//             H held: the siren (no horn, no `hornAt`), the blue lamp on and off, the screen's corners,
//             the car slows under 5 m/s and keeps about 1.2 m to the right, Stig's "Oj… de släpper fram
//             mig!" the first time; let go: siren, lamp and corners off, back in its lane; in a pursuit
//             H gives no way; Angerud at his bar door shouts about honest motorists, once in 40 s; at
//             night (a shot); another car's H is the horn; in a mission the jeep is locked and H is no
//             siren.
import fs from 'fs';
import path from 'path';
import { check, ROOT } from '../lib.mjs';

// Every line said through game.say since the last reset: [speaker key, text].
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.key || '?', text]); return o(t, text, secs); };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const toasts = (T) => T.ev(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '));
const clearToasts = (T) => T.ev(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
const st = (T) => T.ev(() => {
  const g = __game, j = g.jeep, c = j.car(), b = j.bay(), s = g.shame;
  return {
    locked: c?.locked ?? null, other: g.named.guardia2.locked, inIt: !!c && g.playerCar === c, loan: j.loan, loanT: +j.loanT.toFixed(2),
    his: j.his(c), bust: !!j.bust, pursuit: s.pursuit, v: Math.round(s.v), atBay: !!c && Math.hypot(c.x - b.x, c.z - b.z) < 0.3,
    dark: document.getElementById('fade')?.classList.contains('on') ?? null, inDialog: g.inDialog,
    prompt: document.getElementById('prompt')?.textContent || '', last: j.last && { ...j.last }, state: g.missions.state,
    speedo: document.querySelector('#speedo .sp-name')?.textContent || '', main: document.querySelector('.banner-main')?.textContent || '',
  };
});
// Stig on foot `d` m from the jeep's driver side (local +x), facing it.
const besideJeep = (T, d = 2.0) => T.ev((d) => {
  const g = __game, c = g.jeep.car();
  if (g.playerCar) g.exitCar(true);
  g.player.state = 'normal';
  const x = c.x + Math.cos(c.yaw) * d, z = c.z - Math.sin(c.yaw) * d;
  g.debugWarp(x, z, c.yaw - Math.PI / 2);
  g.cam.yaw = c.yaw - Math.PI / 2; g.cam.snapNext = true;
}, d);
// Stig on foot in front of the jeep (between it and the gate), facing it: the view from the gate.
const frontOfJeep = (T) => T.ev(() => {
  const g = __game, c = g.jeep.car();
  if (g.playerCar) g.exitCar(true);
  g.player.state = 'normal';
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), x = c.x + fx * 3.4 + fz * 1.9, z = c.z + fz * 3.4 - fx * 1.9, yaw = Math.atan2(c.x - x, c.z - z);
  g.debugWarp(x, z, yaw);
  g.cam.yaw = yaw; g.cam.pitch = 0.22; g.cam.snapNext = true;
});
// The pursuit kept going with its jeeps parked far off (forced: no decay), the officer kept off.
const park = (T) => T.ev(() => { const s = __game.shame; s.pursuers.forEach((c, k) => { c.ai = null; c.place(-250 + k * 12, -250, 0); c.vx = c.vz = 0; }); });

export const SCENARIOS = {
  async guardiajeep(T) {
    await T.fresh('&mission=8');
    await T.ev(() => __game.addCoins(3000 - __game.coins));

    // ---- 1. The table: every line tagged.
    const texts = await T.ev(() => { const c = __game.jeep.cfg; return [c.prompt, c.borrow, c.open, c.his, c.ask, c.no, c.towToast, c.surprised, ...c.angerud.lines]; });
    const src = fs.readFileSync(path.join(ROOT, 'src/content/island.js'), 'utf8');
    const block = src.slice(src.indexOf('export const GUARDIA_JEEP'), src.indexOf('\n};\n', src.indexOf('export const GUARDIA_JEEP')));
    const bad = [];
    for (const text of texts) {
      const row = block.split('\n').find((l) => l.includes(`'${text}'`));
      if (!row) bad.push(`not in the block: ${text}`);
      else if (!/(\/\/|\/\*) \[(F\*?|N)\]/.test(row)) bad.push(`untagged: ${text}`);
    }
    check(!bad.length, `GUARDIA_JEEP's lines tagged (${bad.join(' · ')})`);
    check(!/land rover/i.test(texts.join(' ')), 'no "Land Rover" in the lines');

    // ---- 2. Before the bodega: locked.
    await besideJeep(T);
    await T.frames(6);
    let r = await st(T);
    T.log('before', JSON.stringify(r));
    check(r.locked && r.other && r.prompt === '' && r.atBay, `before the bodega both jeeps locked, no prompt (${JSON.stringify(r)})`);
    await clearToasts(T);
    await T.tap('KeyE');
    r = await st(T);
    check(!r.inIt && (await toasts(T)).includes('Den är upptagen!'), 'E: "Den är upptagen!"');

    // ---- 3. The bodega's unlock.
    await clearToasts(T);
    await T.ev(() => __game.unlock('grisbil'));
    await T.frames(4);
    const ut = await toasts(T);
    r = await st(T);
    T.log('unlock', ut, JSON.stringify(r));
    check(!r.locked && r.other && ut.includes('Grisbilen') && ut.includes('Vid Guardia Civils kasern står en jeep olåst'), `the unlock: guardia1 open, guardia2 locked, the toasts (${ut})`);
    check(r.prompt.includes('Låna jeepen'), `at its bay: "E Låna jeepen" (${r.prompt})`);
    await frontOfJeep(T);
    await T.frames(6);
    r = await st(T);
    check(r.prompt.includes('Låna jeepen'), `in front of it too (${r.prompt})`);
    await T.shot('guardiajeep_0_lana');
    // 25 m from its bay it is a car like any other.
    await T.ev(() => { const c = __game.jeep.car(); c.place(c.home.x, c.home.z + 25, 0); });
    await besideJeep(T);
    await T.frames(4);
    r = await st(T);
    check(r.prompt.includes('Kliv in') && !r.prompt.includes('Låna'), `25 m off: "E Kliv in" (${r.prompt})`);
    await T.ev(() => { const c = __game.jeep.car(); c.place(c.home.x, c.home.z, c.home.yaw); });

    // ---- 4. The loan.
    await besideJeep(T);
    await T.frames(4);
    await resetSaid(T);
    await T.tap('KeyE');
    r = await st(T);
    let s = await said(T);
    T.log('loan', JSON.stringify(r), JSON.stringify(s));
    check(r.inIt && r.loanT > 0.8 && !r.pursuit && s.some(([w, t]) => w === 'stig' && t === 'Jag lånar den bara en liten stund…'), `in: Stig's borrow line, no SKANDAL yet (${JSON.stringify(r)})`);
    await T.shot('guardiajeep_1_lanar');
    await T.until(() => __game.shame.pursuit, 4000);
    await T.frames(4);
    r = await st(T);
    T.log('pursuit', JSON.stringify(r));
    check(r.pursuit && r.v === 100 && r.loan && r.main === '¡GUARDIA CIVIL!' && r.speedo === 'Guardia-jeepen', `1.2 s later SKANDAL at the top, the pursuit, the speedo (${JSON.stringify(r)})`);
    await T.shot('guardiajeep_2_jakt');

    // ---- 5. Shaken off: his.
    await park(T);
    await clearToasts(T);
    await T.ev(() => { __game.shame.v = 0; });
    await T.until(() => !__game.shame.pursuit, 3000);
    await T.frames(3);
    r = await st(T);
    let ts = await toasts(T);
    T.log('escaped', JSON.stringify(r), ts);
    check(r.his && !r.loan && r.last.kind === 'his' && ts.includes('Guardia-jeepen är din') && r.main === 'SKANDALEN TYSTAD', `the escape: his, the toast (${ts})`);
    // Out and in again at the bay: no SKANDAL.
    await besideJeep(T);
    await T.frames(4);
    r = await st(T);
    check(r.prompt.includes('Kliv in'), `his: "E Kliv in" at the bay (${r.prompt})`);
    await T.tap('KeyE');
    await T.sleep(2000);
    r = await st(T);
    check(r.inIt && !r.pursuit && r.v === 0 && r.loanT === 0, `his: in again at the bay, no SKANDAL (${JSON.stringify(r)})`);

    // ---- 6. Busted in it (a later pursuit): the question, "Nej.", the tow.
    await T.ev(() => { const g = __game, c = g.playerCar; c.place(120 - 2.75, -20, 0); g.cam.yaw = Math.PI; g.cam.snapNext = true; });
    await T.frames(6);
    await T.ev(() => __game.shame.add(100));
    await T.frames(3);
    await park(T);
    await resetSaid(T);
    await clearToasts(T);
    await T.ev(() => { window.__bustT = performance.now(); __game.shame.busted(); });
    await T.until(() => window.__said.some(([, t]) => t === 'Ursäkta, är det din bil?'), 4000);
    const askT = await T.ev(() => (performance.now() - window.__bustT) / 1000);
    await T.frames(4);
    await T.shot('guardiajeep_3_fragan');
    await T.until(() => window.__said.some(([w, t]) => w === 'stig' && t === 'Nej.'), 4000);
    const noT = await T.ev(() => (performance.now() - window.__bustT) / 1000);
    await T.frames(4);
    await T.shot('guardiajeep_4_nej');
    await T.until(() => document.getElementById('fade')?.classList.contains('on'), 4000);
    r = await st(T);
    check(r.inDialog && r.bust, `the fade over the tow (${JSON.stringify(r)})`);
    await T.until(() => !__game.jeep.bust, 4000);
    await T.frames(4);
    r = await st(T);
    s = await said(T);
    ts = await toasts(T);
    T.log('bust', askT.toFixed(2), noT.toFixed(2), JSON.stringify(r), JSON.stringify(s), ts);
    check(askT > 1.5 && askT < 2.6 && noT > askT + 0.7 && noT < 3.8, `the question at 1.8 s, "Nej." at 2.9 s (${askT.toFixed(2)}, ${noT.toFixed(2)})`);
    check(s.some(([w, t]) => w === 'guardiaOfficer' && t === 'Ursäkta, är det din bil?') && !s.some(([, t]) => t === '¡Documentación!'), `the officer asks, no "¡Documentación!" (${JSON.stringify(s)})`);
    check(r.atBay && !r.his && !r.inIt && !r.dark && !r.inDialog && r.last.kind === 'tow' && r.last.dark && r.last.inCar && ts.includes('bärgad') && !ts.includes('Friskotek'), `towed back to its bay, not his, no bust radio (${JSON.stringify(r)}, ${ts})`);
    await T.until(() => __game.frozenT <= 0, 6000);
    await frontOfJeep(T);
    await T.frames(10);
    await T.shot('guardiajeep_5_barnad');
    r = await T.ev(() => __game.shame.officer?.state);
    check(r === 'hidden', `the officer gone after the tow (${r})`);

    // ---- 7. The loan again, busted on foot 90 m from the jeep: no fade.
    await besideJeep(T);
    await T.frames(4);
    r = await st(T);
    check(r.prompt.includes('Låna jeepen'), `after the tow the jeep is a loan again (${r.prompt})`);
    await T.tap('KeyE');
    await T.until(() => __game.shame.pursuit, 4000);
    await park(T);
    await T.ev(() => { const g = __game, c = g.playerCar; c.place(120 - 2.75, -20, 0); g.exitCar(true); g.debugWarp(120 - 2.75 - 90, -40 + 2.75, Math.PI / 2); });
    await T.frames(4);
    await resetSaid(T);
    await T.ev(() => __game.shame.busted());
    await T.until(() => !__game.jeep.bust, 8000);
    r = await st(T);
    s = await said(T);
    T.log('bust on foot', JSON.stringify(r), JSON.stringify(s));
    check(r.atBay && !r.his && r.last.kind === 'tow' && !r.last.dark && !r.last.inCar && s.some(([w, t]) => w === 'stig' && t === 'Nej.'), `busted on foot in the loan's pursuit: the scene, the tow without the fade (${JSON.stringify(r.last)})`);
    await T.until(() => __game.frozenT <= 0 && __game.shame.officer?.state === 'hidden', 6000);

    // ---- 8. The loan bribed off at the porter: his.
    await besideJeep(T);
    await T.frames(4);
    await T.tap('KeyE');
    await T.until(() => __game.shame.pursuit, 4000);
    await park(T);
    await clearToasts(T);
    await T.ev(() => { const g = __game; g.shame.forced = false; g.shame.hideoutT = 0; g.exitCar(true); const a = g.approachSpot('flamencoRecepcion'); g.debugWarp(a.x, a.z, a.yaw); });
    await T.frames(5);
    await T.ev(() => { const g = __game; if (g.shame.officer) g.shame.caughtT = 99; g.interact(); });
    await T.until(() => !__game.shame.pursuit, 6000);
    await T.frames(3);
    r = await st(T);
    ts = await toasts(T);
    T.log('bribed', JSON.stringify(r), ts);
    check(r.his && !r.loan && ts.includes('Guardia-jeepen är din'), `the porter bribed: his (${ts})`);

    // ---- 9. Wrecked and cleared away: a new one in its bay once he is off.
    const oldId = await T.ev(() => {
      const g = __game, c = g.jeep.car(), id = c.id;
      g.removeCar(c);
      const b = g.jeep.bay(); g.debugWarp(b.x - 120 + 2.75, b.z - 30, 0);
      return id;
    });
    await T.frames(6);
    const nu = await T.ev(() => { const g = __game, c = g.jeep.car(); return { id: c?.id, his: g.jeep.his(c), last: g.jeep.last.kind }; });
    r = await st(T);
    T.log('respawn', oldId, JSON.stringify(nu), JSON.stringify(r));
    check(nu.id && nu.id !== oldId && !nu.his && nu.last === 'respawn' && r.atBay && !r.locked, `a new jeep in its bay, open, not his (${JSON.stringify(nu)})`);

    // ---- 10. A mission start: locked as before.
    await T.startMission();
    await T.frames(4);
    r = await st(T);
    await besideJeep(T);
    await T.frames(4);
    await clearToasts(T);
    await T.tap('KeyE');
    const r2 = await st(T);
    ts = await toasts(T);
    T.log('mission', JSON.stringify(r), JSON.stringify(r2), ts);
    check(r.locked && r.state === 'running' && !r2.inIt && r2.prompt === '' && ts.includes('Den är upptagen!'), `in a mission the jeep is locked (${JSON.stringify(r2)})`);
  },

  async jeepsiren(T) {
    await T.fresh('&mission=9');
    await T.ev(async () => {
      window.__audio = (await import('/src/audio.js')).audio;
      window.__AI = (await import('/src/actors/drivers.js')).AIDriver;
      const g = __game;
      g.unlock('grisbil');
      document.querySelectorAll('.toast').forEach((t) => t.remove());
    });
    await T.frames(4);
    await T.ev(() => { const g = __game, c = g.jeep.car(); g.jeep.hisCar = c; c.place(c.x + 3, c.z, c.yaw); g.enterCar(c); });
    await T.frames(4);
    // The jeep on the z = −40 road heading east (+x keeps to +z), 12 m past the junction at x = −40;
    // a traffic car 18 m ahead in its lane; every other car more than 150 m off that stretch.
    const setup = () => T.ev(() => {
      const g = __game, j = g.playerCar, Z = -40 + 2.75;
      j.place(-28, Z, Math.PI / 2);
      j.vx = j.vz = 0;
      let t = g.__sirenCar;
      if (!t || !g.cars.includes(t)) t = g.__sirenCar = g.cars.find((c) => c.traffic && !c.dead && !c.spec.bus);
      for (const c of g.cars.slice()) if (c.traffic && c !== t && Math.abs(c.z - Z) < 40 && c.x > -120 && c.x < 120) g.removeCar(c);
      t.place(-10, Z, Math.PI / 2);
      t.ai = new window.__AI(t, { mode: 'traffic', cruise: 12 });
      g.cam.yaw = Math.PI / 2 + Math.PI; g.cam.pitch = 0.2; g.cam.snapNext = true;
      return t.id;
    });
    // The traffic car against its start line: across (+ right of the road's heading), ahead, speed.
    const tcar = () => T.ev(() => {
      const g = __game, t = g.__sirenCar, Z = -40 + 2.75;
      return { lat: +(t.z - Z).toFixed(2), x: +t.x.toFixed(1), speed: +t.speed.toFixed(1), k: +(t.ai.yieldK || 0).toFixed(2), sy: !!g.sirenYield };
    });
    const sir = () => T.ev(() => {
      const g = __game, c = g.playerCar, L = c?.sirenLamp;
      const sl = document.getElementById('sirenlights');
      return { on: g.jeep.sirenOn, audio: window.__audio.sirenOn, lamp: !!L && L.visible, body: document.body.classList.contains('siren'), corners: getComputedStyle(sl).display === 'block', hornAt: g.hornAt, honk: g.honk.last?.t ?? null };
    });

    // ---- 1. The control: no siren, the car drives on in its lane.
    await setup();
    await T.sleep(1600);
    const ctl = await tcar();
    T.log('control', JSON.stringify(ctl));
    check(ctl.speed > 6 && Math.abs(ctl.lat) < 0.35 && ctl.k === 0, `without the siren the car drives on in its lane (${JSON.stringify(ctl)})`);

    // ---- 2. H held: the siren, the lamp, the corners; the car gives way.
    await setup();
    await T.frames(2);
    await resetSaid(T);
    await T.page.keyboard.down('KeyH');
    const lamp = [];
    for (let k = 0; k < 8; k++) { await T.sleep(110); lamp.push((await sir()).lamp); }
    let r = await sir();
    await T.shot('jeepsiren_1_siren');
    await T.sleep(700);
    const y0 = await tcar();
    // Then the jeep kept 15 m behind it (as if he followed it) for 2.5 s.
    for (let k = 0; k < 25; k++) {
      await T.ev(() => { const g = __game, t = g.__sirenCar, j = g.playerCar; j.place(t.x - 15, -40 + 2.75, Math.PI / 2); });
      await T.sleep(100);
    }
    const y = await tcar();
    await T.shot('jeepsiren_2_vajer');
    await T.page.keyboard.up('KeyH');
    let s = await said(T);
    T.log('siren', JSON.stringify(r), JSON.stringify(lamp), JSON.stringify(y0), JSON.stringify(y), JSON.stringify(s));
    check(r.on && r.audio && r.body && r.corners && lamp.includes(true) && lamp.includes(false), `H: the siren, the lamp on and off, the corners (${JSON.stringify(r)}, ${JSON.stringify(lamp)})`);
    check(r.hornAt === null && r.honk === null, 'H in the jeep is no horn (no hornAt, no honk press)');
    check(y0.k > 0.9 && y0.speed < 6 && y0.lat > 0.4 && y0.sy, `the car ahead slows and moves to the right (${JSON.stringify(y0)})`);
    check(y.k > 0.9 && y.speed < 6 && y.lat > 1.0 && y.lat < 1.4, `followed, it keeps about 1.25 m to the right (${JSON.stringify(y)})`);
    check(s.some(([w, t]) => w === 'stig' && t === 'Oj… de släpper fram mig!'), `Stig surprised the first time (${JSON.stringify(s)})`);
    await T.frames(3);
    r = await sir();
    check(!r.on && !r.audio && !r.lamp && !r.body && !r.corners, `let go: siren, lamp and corners off (${JSON.stringify(r)})`);
    await T.sleep(2200);
    const back = await tcar();
    T.log('let go', JSON.stringify(back));
    check(back.k === 0 && Math.abs(back.lat) < 0.45 && back.speed > 6, `back in its lane and up to speed (${JSON.stringify(back)})`);
    // Not again: Stig's surprise is the session's first.
    await setup();
    await resetSaid(T);
    await T.hold(['KeyH'], 900);
    s = await said(T);
    check(!s.some(([, t]) => t === 'Oj… de släpper fram mig!'), 'the surprise once a session');

    // ---- 3. In a pursuit H gives no way.
    await setup();
    await T.ev(() => { const s = __game.shame; s.add(100); s.forced = true; });
    await T.frames(2);
    await park(T);
    await T.page.keyboard.down('KeyH');
    await T.sleep(900);
    const pu = await tcar();
    r = await sir();
    await T.page.keyboard.up('KeyH');
    T.log('pursuit', JSON.stringify(pu), JSON.stringify(r));
    check(!pu.sy && pu.k === 0 && r.audio, `in a pursuit the siren gives no way (${JSON.stringify(pu)})`);
    await T.ev(() => { __game.shame.clear(); window.__hud?.hideBanner?.(); document.getElementById('banner')?.classList.remove('show'); });
    await T.frames(3);

    // ---- 4. Angerud at Viking Bar.
    // The jeep in the lane of the road nearest to him, on his side, level with him.
    const at = await T.ev(() => {
      const g = __game, n = g.npc('angerud'), c = g.playerCar, L = 2.75, R = (v) => Math.round((v + 280) / 80) * 80 - 280;
      const rx = R(n.x), rz = R(n.z);
      let x, z, yaw;
      if (Math.abs(n.x - rx) < Math.abs(n.z - rz)) { x = n.x > rx ? rx + L : rx - L; z = n.z; yaw = n.x > rx ? Math.PI : 0; }
      else { z = n.z > rz ? rz + L : rz - L; x = n.x; yaw = n.z > rz ? Math.PI / 2 : -Math.PI / 2; }
      c.place(x, z, yaw);
      g.cam.yaw = Math.atan2(n.x - x, n.z - z); g.cam.pitch = 0.15; g.cam.snapNext = true;
      g.jeep.angerudT = -Infinity;
      return { x, z, d: +Math.hypot(n.x - x, n.z - z).toFixed(1) };
    });
    T.log('angerud at', JSON.stringify(at));
    await T.frames(4);
    await resetSaid(T);
    await T.page.keyboard.down('KeyH');
    await T.sleep(600);
    const a = await T.ev(() => ({ oath: __game.npc('angerud').anim.oath }));
    await T.shot('jeepsiren_3_angerud');
    await T.sleep(600);
    await T.page.keyboard.up('KeyH');
    s = await said(T);
    T.log('angerud', JSON.stringify(a), JSON.stringify(s));
    const lines = await T.ev(() => __game.jeep.cfg.angerud.lines);
    check(a.oath && s.filter(([w, t]) => w === 'angerud' && lines.includes(t)).length === 1, `Angerud about honest motorists, with his oath (${JSON.stringify(s)})`);
    await resetSaid(T);
    await T.hold(['KeyH'], 700);
    s = await said(T);
    check(!s.some(([w]) => w === 'angerud'), 'not again within 40 s');
    await T.sleep(1800);
    check(await T.ev(() => !__game.npc('angerud').anim.oath), 'his oath over');

    // ---- 5. At night (a shot of the lamp).
    await T.ev(() => { const g = __game, c = g.playerCar; g.day.set(23); c.place(-28, -40 + 2.75, Math.PI / 2); g.cam.yaw = -Math.PI / 2 + 0.5; g.cam.pitch = 0.2; g.cam.snapNext = true; });
    await T.frames(8);
    await T.page.keyboard.down('KeyH');
    for (let k = 0; k < 6 && !(await sir()).lamp; k++) await T.sleep(60);
    await T.shot('jeepsiren_4_natt');
    await T.page.keyboard.up('KeyH');
    await T.ev(() => __game.day.set(15));
    await T.frames(4);

    // ---- 6. Another car's H is the horn.
    await T.ev(() => {
      const g = __game, j = g.playerCar;
      g.exitCar(true);
      j.place(-60, 120, 0);
      const c = g.cars.find((o) => !o.locked && !o.dead && !o.ai && !o.noEnter && !o.traffic && !o.spec.pigs && !o.spec.guardia && o.spec.len < 5);
      c.place(-28, -40 + 2.75, Math.PI / 2);
      g.enterCar(c);
    });
    await T.frames(4);
    await T.hold(['KeyH'], 400);
    r = await sir();
    check(!r.on && !r.audio && r.honk !== null && r.hornAt !== null, `another car's H is the horn (${JSON.stringify(r)})`);

    // ---- 7. In a mission: locked, H no siren.
    await T.startMission();
    r = await T.ev(() => {
      const g = __game, c = g.jeep.car();
      g.enterCar(c);
      return { locked: c.locked, inIt: g.playerCar === c, siren: g.jeep.hasSiren(c), state: g.missions.state };
    });
    T.log('mission', JSON.stringify(r));
    check(r.locked && !r.inIt && !r.siren && r.state === 'running', `in a mission the jeep is locked and has no siren (${JSON.stringify(r)})`);
  },
};
