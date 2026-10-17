// Smörj in Majsans rygg (free roam, DESIGN §10.26; feature 35): solkram.
//   solkram: at index 10 (fataga waiting, Majsan its giver at the pool) the talk, no SOLKRÄM; at index 11
//            beside Majsan the prompt "Smörj in ryggen", not by night, not with Siv off her spot. E: the
//            film's pair (once ever) in a dialogue, then she turns her back, Stig behind her with his
//            hands on her shoulders, the meter's card (SOLKRÄM, the bar, the green field, the marker), the
//            letterbox off, the bottle on the deck. Held E (a real key) fills it at 1/secs a second,
//            Stig rubbing; let go in the stripe: 7, Siv's card and "Giraffen, då? Sju.", the record and
//            the save; the scene's end: the camera back, the sisters free, `sjuPoang` with Siv's new
//            chatter. Then 6, 5 (the field narrower each try, the record kept), early ("Var det allt?"),
//            held to the end (over: the shot from behind, the cream running, Stig flailing, Siv's –1,
//            back to the front shot for her line) and no hold at all (Majsan gives up). A reload keeps
//            the record, the unlock and the once-marker (no film pair again). After the end the pool
//            fest's ring has the sisters by day; in the morning before it they are back. The flight
//            level: inert.
import { check } from '../lib.mjs';

const SAVE = 'charter-and-run-v1';
const hooks = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || '?', text]);
      return o(t, text, secs);
    };
    const d = g.dialog.bind(g);
    g.dialog = (lines) => { window.__dlg.push(...lines.map((l) => [l[0], l[1]])); return d(lines); };
  }
  window.__said = [];
  window.__dlg = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const dlg = (T) => T.ev(() => window.__dlg.slice());
const clear = (T) => T.ev(() => { window.__said = []; window.__dlg = []; });
const st = (T) => T.ev(() => {
  const s = __game.solkram;
  return { phase: s.phase, fill: +s.fill.toFixed(3), zone: s.zone && s.zone.map((v) => +v.toFixed(4)), mid: s.mid, tries: s.tries, restT: s.restT, last: s.last };
});
const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? (it.type === 'it' ? it.it.id : it.type) : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
const card = (T) => T.ev(() => {
  const o = document.getElementById('objective');
  return { show: o.classList.contains('show'), title: o.querySelector('.obj-title').textContent, text: o.querySelector('.obj-text').textContent,
    label: o.querySelector('.obj-bar-label').textContent, zone: o.querySelector('.obj-zone').style.display === 'block', marker: o.querySelector('.obj-marker').style.display === 'block',
    lb: document.getElementById('letterbox').classList.contains('on') };
});
const score = (T) => T.ev(() => { const e = document.getElementById('score'); return { show: e.classList.contains('show'), main: e.querySelector('.score-main').textContent, sub: e.querySelector('.score-sub').textContent }; });
const toasts = (T) => T.ev(() => [...document.querySelectorAll('#toasts .toast')].map((t) => t.textContent));
// Stig 1.2 m west of Majsan, facing her, the camera behind him.
async function byMajsan(T) {
  await T.ev(() => {
    const g = __game, m = g.npc('majsan'), p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.teleport(m.x - 1.2, m.z, Math.PI / 2);
    p.vx = p.vz = 0;
    g.cam.yaw = Math.PI / 2; g.cam.snapNext = true;
  });
  await T.frames(8);
}
// E from beside her; the intro's dialogue auto-advances (test mode); on to the meter.
async function ask(T) {
  await T.until(() => !__game.solkram.phase && __game.solkram.restT <= 0 && __game.solkram.canUse(), 20000);
  await clear(T);
  await T.tap('KeyE');
  await T.until(() => __game.solkram.phase === 'ready', 20000);
  await T.frames(3);
}
// Hold E (a real key), then let go at fill `at(s)` (set in the frame E goes up: one frame's fill is
// about 0.007, the stripe 0.044 wide).
async function holdTo(T, at) {
  await T.page.keyboard.down('KeyE');
  await T.until(() => __game.solkram.phase === 'hold', 5000);
  await T.ev((at) => { const g = __game, s = g.solkram; s.fill = new Function('s', `return ${at}`)(s); g.input._release('KeyE'); }, at);
  await T.page.keyboard.up('KeyE');
  await T.until(() => __game.solkram.phase === 'result', 5000);
  await T.frames(2);
}
const done = (T) => T.until(() => !__game.solkram.phase, 20000);

export const SCENARIOS = {
  async solkram(T) {
    // 1. Before the end of fataga: Majsan is its giver at the pool; the talk, no meter.
    await T.fresh('&mission=10');
    await byMajsan(T);
    let r = { near: await near(T), canUse: await T.ev(() => __game.solkram.canUse()), live: await T.ev(() => __game.solkram.live) };
    T.log('index 10', JSON.stringify(r));
    check(r.near === 'talk' && !r.canUse && !r.live, 'fataga waiting: the giver\'s talk, no SOLKRÄM');

    // 2. After fataga: the prompt; not by night, not with Siv off her spot.
    await T.fresh('&mission=11');
    await hooks(T);
    const cfg = await T.ev(() => JSON.parse(JSON.stringify(__game.solkram.cfg)));
    await byMajsan(T);
    r = { near: await near(T), prompt: await prompt(T), idle: await T.ev(() => __game.missions.state) };
    T.log('index 11', JSON.stringify(r));
    check(r.idle === 'idle' && r.near === 'solkram' && /Smörj in ryggen/.test(r.prompt), 'free roam after fataga: "Smörj in ryggen" by Majsan');
    await T.shot('solkram_0_prompt');
    await T.ev(() => __game.day.set(22));
    r = { canUse: await T.ev(() => __game.solkram.canUse()), near: await near(T) };
    await T.ev(() => __game.day.set(15));
    check(!r.canUse && r.near !== 'solkram', 'not by night');
    await T.ev(() => { const s = __game.npc('siv'); s.teleport(s.x - 4, s.z + 3, 0); });
    await T.frames(3);
    r = { canUse: await T.ev(() => __game.solkram.canUse()) };
    await T.ev(() => { const g = __game, s = g.npc('siv'), q = g.lmOffset('flamencoPool', 2, 0); s.teleport(q.x, q.z, s.yaw); });
    await T.frames(3);
    check(!r.canUse && await T.ev(() => __game.solkram.canUse()), 'not with Siv off her spot; back on it, yes');

    // 3. The first time: the film's pair, then the meter.
    await ask(T);
    r = { dlg: await dlg(T), s: await st(T), card: await card(T), prompt: await prompt(T),
      stage: await T.ev(() => {
        const g = __game, p = g.player, M = g.npc('majsan'), V = g.npc('siv'), s = g.solkram;
        p.root.updateMatrixWorld(true); M.root.updateMatrixWorld(true);
        const V3 = p.root.position.constructor;
        return { d: +Math.hypot(p.x - M.x, p.z - M.z).toFixed(3), py: +p.yaw.toFixed(3), my: +M.yaw.toFixed(3), rub: p.anim.rub, busy: [M.busy, V.busy],
          once: g.unlocked.has(s.cfg.onceKey), bottle: s.bottle.visible, dlgOn: g.inDialog,
          // Stig's hands against her shoulders: [height over her shoulder pivot, behind her centre]
          hands: p.model.arms.map((a, i) => {
            const h = a.localToWorld(new V3(0, -0.8, 0)), sh = M.model.arms[i].localToWorld(new V3());
            return [+(h.y - sh.y).toFixed(3), +((M.x - h.x) * Math.sin(M.yaw) + (M.z - h.z) * Math.cos(M.yaw)).toFixed(3)];
          }) };
      }) };
    T.log('ready', JSON.stringify(r));
    check(JSON.stringify(r.dlg.slice(0, 2)) === JSON.stringify(cfg.ask.slice(0, 2)), 'the film\'s pair first, Majsan\'s');
    check(r.stage.once && r.s.phase === 'ready' && r.s.tries === 1, 'the once-marker; the meter on, try 1');
    check(Math.abs(r.stage.d - cfg.stage.back) < 0.02 && Math.abs(r.stage.py - cfg.stage.yaw) < 0.01 && Math.abs(r.stage.my - cfg.stage.yaw) < 0.01,
      'her back to him, Stig `back` m behind her, facing her');
    check(r.stage.rub === 1 && r.stage.busy.every(Boolean) && r.stage.bottle && r.stage.dlgOn, 'his hands on her shoulders, the sisters held, the bottle, still a scene');
    check(r.stage.hands.every(([dy, b]) => dy > 0 && dy < 0.2 && b > 0.03 && b < 0.2), 'the hands rest on her shoulders (not in her)');
    const w1 = r.s.zone[1] - r.s.zone[0];
    check(Math.abs(w1 - cfg.zone.w0) < 1e-3 && r.s.mid >= cfg.zone.at[0] && r.s.mid <= cfg.zone.at[1], 'the field: w0 wide, its middle in `at`');
    check(r.card.show && /SOLKRÄM/i.test(r.card.title) && r.card.text === cfg.text && r.card.label === cfg.barLabel && r.card.zone && r.card.marker && !r.card.lb,
      'the card: SOLKRÄM, the bar, the field, the marker; no letterbox');
    check(r.prompt === '', 'no prompt during the scene');
    await T.shot('solkram_1_ready');

    // 4. Held (a real key): it fills at 1/secs a second, he rubs; let go in the stripe: 7.
    await T.page.keyboard.down('KeyE');
    await T.until(() => __game.solkram.phase === 'hold', 5000);
    const t0 = await T.ev(() => performance.now());
    await T.sleep(600);
    r = await T.ev((t0) => ({ fill: __game.solkram.fill, secs: (performance.now() - t0) / 1000, rub: __game.player.anim.rub }), t0);
    r.card = await card(T);
    T.log('hold', JSON.stringify(r));
    check(r.fill > 0.6 * r.secs / cfg.secs && r.fill < 1.3 * (r.secs + 0.1) / cfg.secs && r.rub === 2, 'the fill rises at 1/secs a second, Stig rubbing');
    check(r.card.text === cfg.textHold || r.card.text === cfg.textZone, 'the card: hold on');
    await T.shot('solkram_1b_hold');
    await T.ev(() => { const g = __game, s = g.solkram; s.fill = s.mid; g.input._release('KeyE'); });
    await T.page.keyboard.up('KeyE');
    await T.until(() => __game.solkram.phase === 'result', 5000);
    await T.frames(3);
    r = { s: await st(T), card: await T.ev(() => __game.npc('siv').anim.card), score: await score(T), lb: (await card(T)).lb, rec: await T.ev(() => __game.records.solkram),
      saved: await T.ev((k) => JSON.parse(localStorage.getItem(k)).records, SAVE) };
    T.log('7', JSON.stringify(r));
    check(r.s.last.kind === 7 && r.s.last.points === 7 && r.s.last.record, 'in the stripe: 7, a record');
    check(r.card === '7' && /SOLKRÄM 7 P/.test(r.score.main) && /NYTT REKORD/.test(r.score.sub) && r.lb, 'Siv\'s 7 card, the score, the letterbox');
    check(r.rec === 7 && r.saved.solkram === 7, 'records.solkram 7, saved');
    await T.sleep(2100);
    await T.shot('solkram_2_sju');
    await done(T);
    await T.frames(5);
    r = { said: await said(T), toasts: await toasts(T),
      after: await T.ev((k) => { const g = __game, s = g.solkram, p = g.player; return { dlg: g.inDialog, cine: !!g.cam.cine, lb: document.getElementById('letterbox').classList.contains('on'),
        busy: [g.npc('majsan').busy, g.npc('siv').busy], rub: p.anim.rub, bottle: s.bottle.visible, unlocked: g.unlocked.has('sjuPoang'), chatter: g.chatterOverrides.siv,
        saved: JSON.parse(localStorage.getItem(k)).unlocked }; }, SAVE) };
    T.log('7 done', JSON.stringify(r));
    check(JSON.stringify(r.said) === JSON.stringify(cfg.kinds[7].lines.map(([, w, t]) => [w, t])), 'the 7\'s lines: Majsan, Siv, Majsan');
    check(!r.after.dlg && !r.after.cine && !r.after.lb && !r.after.busy[0] && !r.after.busy[1] && !r.after.rub && !r.after.bottle, 'the end: camera back, the sisters free, no pose, no bottle');
    check(r.after.unlocked && r.after.chatter?.[0] === 'Sju poäng till Giraffen. Mer än pizza-racern!' && r.toasts.some((t) => t.includes('Sju poäng')), 'sjuPoang: Siv\'s new chatter and the toast');
    check(r.after.saved.includes('sjuPoang') && r.after.saved.includes(cfg.onceKey), 'saved: the unlock and the once-marker');
    await T.shot('solkram_3_after');

    // 5. Again: one of ours (not the film's pair), the field narrower; 6 keeps the record 7.
    await ask(T);
    r = { dlg: await dlg(T), s: await st(T) };
    T.log('again', JSON.stringify(r.dlg));
    check(!r.dlg.some(([, t]) => t === cfg.ask[0][1]) && cfg.again.some((a) => JSON.stringify(a) === JSON.stringify(r.dlg)), 'the second ask is one of `again`');
    check(Math.abs(r.s.zone[1] - r.s.zone[0] - cfg.zone.w0 * cfg.zone.shrink) < 1e-3, 'try 2: the field × shrink');
    await holdTo(T, 's.mid + 0.04');
    r = { s: await st(T), card: await T.ev(() => __game.npc('siv').anim.card), score: await score(T), rec: await T.ev(() => __game.records.solkram) };
    T.log('6', JSON.stringify(r));
    check(r.s.last.kind === 6 && !r.s.last.record && r.card === '6' && r.rec === 7 && /REKORD 7 P/.test(r.score.sub), '6: Siv\'s 6, the record stays 7');
    await done(T);
    check((await said(T)).some(([w, t]) => w === 'siv' && t === 'Sex, tycker jag.'), '"Sex, tycker jag."');

    // 6. At the field's edge: 5.
    await ask(T);
    await holdTo(T, 's.zone[0] + 0.005');
    r = { s: await st(T), card: await T.ev(() => __game.npc('siv').anim.card) };
    T.log('5', JSON.stringify(r));
    check(r.s.last.kind === 5 && r.card === '5', 'the field\'s edge: 5');
    await done(T);
    check((await said(T)).some(([w, t]) => w === 'siv' && t === 'Giraffen, då? Fem.'), '"Giraffen, då? Fem."');

    // 7. Short of it: early, no card.
    await ask(T);
    await T.ev(() => __game.solkram.cardDown());
    await holdTo(T, 's.zone[0] - 0.05');
    r = { s: await st(T), card: await T.ev(() => __game.npc('siv').anim.card), score: await score(T) };
    T.log('early', JSON.stringify(r));
    check(r.s.last.kind === 'early' && r.s.last.points === null && r.card == null && /FÖR LITE/.test(r.score.main), 'early: no points, no card, "FÖR LITE!"');
    await done(T);
    check(JSON.stringify(await said(T)) === JSON.stringify(cfg.kinds.early.lines.map(([, w, t]) => [w, t])), '"Var det allt?"');

    // 8. Held to the end: over, from behind, the cream running; back to the front for Siv's minus.
    await ask(T);
    await T.page.keyboard.down('KeyE');
    await T.until(() => __game.solkram.phase === 'result', 6000);
    await T.page.keyboard.up('KeyE');
    await T.frames(3);
    r = { s: await st(T), score: await score(T),
      v: await T.ev(() => { const g = __game, s = g.solkram, p = g.player, M = g.npc('majsan'), V = g.npc('siv'), c = g.cam.cine;
        const fx = Math.sin(M.yaw), fz = Math.cos(M.yaw);
        return { card: V.anim.card, laugh: V.anim.laugh, flail: p.anim.flail, rub: p.anim.rub, d: +Math.hypot(p.x - M.x, p.z - M.z).toFixed(3), drip: s.dripT >= 0,
          behind: (c.pos.x - M.x) * fx + (c.pos.z - M.z) * fz < 0, rec: g.records.solkram }; }) };
    T.log('over', JSON.stringify(r));
    check(r.s.last.kind === 'over' && r.s.last.points === -1 && r.s.last.fill === 1, 'held to the end: over, at 1');
    check(r.v.card === '–1' && r.v.laugh && r.v.flail && !r.v.rub && r.v.drip && r.v.behind, 'over: Siv\'s –1 and laugh, Stig flailing, the cream running, the shot from behind');
    check(Math.abs(r.v.d - cfg.stage.back - cfg.stage.overStep) < 0.02 && r.v.rec === 7 && /FÖR MYCKET/.test(r.score.main), 'Stig a step back; the record stays; "FÖR MYCKET!"');
    await T.sleep(1100);
    r = await T.ev(() => __game.solkram.drops.filter((d) => d.visible).length);
    check(r === 3, 'three drops run down her back');
    await T.shot('solkram_4_over');
    await T.until(() => __game.solkram.frontAt == null || !__game.solkram.phase, 6000);
    await T.sleep(500);
    r = await T.ev(() => { const g = __game, M = g.npc('majsan'), c = g.cam.cine; return !!c && (c.pos.x - M.x) * Math.sin(M.yaw) + (c.pos.z - M.z) * Math.cos(M.yaw) > 0; });
    check(r, 'back to the front shot for Siv');
    await T.shot('solkram_5_minus');
    await done(T);
    r = { said: await said(T), flail: await T.ev(() => __game.player.anim.flail), cream: await T.ev(() => __game.solkram.drops.some((d) => d.visible) || __game.solkram.dab.visible) };
    check(JSON.stringify(r.said) === JSON.stringify(cfg.kinds.over.lines.map(([, w, t]) => [w, t])) && !r.flail && !r.cream, 'over\'s lines; the flail and the cream gone after');

    // 9. No hold at all: she gives up.
    await ask(T);
    await T.ev(() => { __game.solkram.waitT = __game.solkram.cfg.readySecs - 0.05; });
    await T.until(() => __game.solkram.phase === 'result', 3000);
    check((await st(T)).last.kind === 'giveUp', 'no hold: she gives up');
    await done(T);
    check(JSON.stringify(await said(T)) === JSON.stringify(cfg.giveUp.map(([, w, t]) => [w, t])), '"Jaha. Då får jag väl göra det själv."');
    const tries = (await st(T)).tries;
    check(tries === 6, `six tries this session (${tries})`);

    // 9b. A mission start with Siv's card still up: the card down, the mission's intro untouched.
    await T.ev(() => { const g = __game; g.solkram.cardT = 5; g.npc('siv').anim.card = '5'; const s = g.approachSpot(g.missions.current.at); g.debugWarp(s.x, s.z, s.yaw); });
    await T.frames(5);
    await T.ev(() => { const g = __game, n = g.npc(g.missions.current.giver), p = g.player; if (Math.hypot(n.x - p.x, n.z - p.z) > 3) { const s = g.freeSpot(n.x, n.z, 1.2, 2.2); g.debugWarp(s.x, s.z, Math.atan2(n.x - s.x, n.z - s.z)); } });
    await T.frames(3);
    await T.tap('KeyE');
    await T.until(() => __game.missions.state !== 'idle', 5000);
    await T.frames(10);
    r = await T.ev(() => { const g = __game; return { state: g.missions.state, cine: !!g.cam.cine, dlg: g.inDialog, card: g.npc('siv').anim.card, cardT: g.solkram.cardT }; });
    T.log('mission start', JSON.stringify(r));
    check(r.state === 'intro' && r.cine && r.dlg && r.card == null && r.cardT === 0, 'a mission start: Siv\'s card down, the intro\'s cinematic kept');

    // 10. A reload keeps the record, the unlock, the once-marker: the ask is one of ours.
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1`, { waitUntil: 'load' });
    await T.until(() => window.__ready === true, 120000);
    await T.frames(10);
    await hooks(T);
    r = await T.ev(() => { const g = __game; return { idx: g.missions.index, rec: g.records.solkram, un: g.unlocked.has('sjuPoang'), ch: g.chatterOverrides.siv?.[0] }; });
    T.log('reload', JSON.stringify(r));
    check(r.idx === 11 && r.rec === 7 && r.un && !!r.ch, 'a reload: the record 7, sjuPoang and Siv\'s chatter');
    await byMajsan(T);
    await ask(T);
    r = await dlg(T);
    check(!r.some(([, t]) => t === cfg.ask[0][1]), 'after a reload the film\'s pair is not said again');
    await T.ev(() => { __game.solkram.waitT = 99; });
    await done(T);
    await T.ev((k) => localStorage.removeItem(k), SAVE);

    // 11. After the end: the pool fest's ring has the sisters by day; in the morning before it they are home.
    await T.fresh('&mission=13');
    await T.ev(() => { const g = __game; g.unlock('bodega'); g.placeNpcs(true); });
    await byMajsan(T);
    await T.until(() => __game.fest.posed('majsan'), 10000).catch(() => {});
    r = { canUse: await T.ev(() => __game.solkram.canUse()), fest: await T.ev(() => __game.fest.posed('majsan')) };
    T.log('after the end, 15:00', JSON.stringify(r));
    check(!r.canUse && r.fest, 'after the end by day: the ring has her');
    await T.ev(() => __game.day.set(8));
    await T.until(() => !__game.fest.posed('majsan') && !__game.fest.posed('siv'), 20000);
    await T.frames(10);
    await byMajsan(T);
    r = { canUse: await T.ev(() => __game.solkram.canUse()), near: await near(T) };
    T.log('after the end, 08:00', JSON.stringify(r));
    check(r.canUse && r.near === 'solkram', 'after the end at 08:00: the sisters home, SOLKRÄM');
    await T.ev((k) => localStorage.removeItem(k), SAVE);

    // 12. The flight level: inert.
    await T.fresh('&mission=1');
    r = await T.ev(() => ({ live: __game.solkram.live, canUse: __game.solkram.canUse(), card: __game.solkram.objective() }));
    check(!r.live && !r.canUse && !r.card, 'the flight level: inert');
  },
};
