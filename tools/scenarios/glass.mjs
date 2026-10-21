// Glass till Majsan innan den smälter (free roam, DESIGN §10.61; feature 126): glass, glasskal.
//   glass:    at index 10 (fataga waiting, Majsan its giver at the pool) the HELADOS kiosk's prompt "Köp en
//             glass (25 pta)" by day, none at night, none in a car; E with 100 pta: −25, the window's
//             "¡Un helado de fresa! ¡Gracias, señor!" and Stig's "Den är till en… bekant.", the cone in his
//             left hand (`carrying.glass`, `anim.glass`, glassK 1), the card "Glass till Majsan" with no
//             timer, the guide at Majsan. It melts: glassK falling with the game clock, pink spots on the
//             ground behind him, "Den smälter ju!" at half; in a car hidden and melting on; all gone, the
//             plop, the toast and "Typiskt.", the bare cone (glassK 0, no scoop shown) and the card's
//             "Bara struten kvar.". Walking up to Majsan (a real key press) plays the handover with no E,
//             before her giver's talk: the bare cone's "Den var hel när jag köpte den…" / "Det är tanken
//             som räknas, Stig.", the cone in her hand. A fresh one brought in time: the first set's lines
//             in order, the toast "Glassen kom fram – n % kvar. Nytt rekord!", `records.glass`, her eating
//             it down over 10 s, then her hand empty and her giver's talk back; the second time the
//             second set. R drops it ("Stig tappade glassen.", a splat); with Majsan hidden no sale; a
//             mission start takes the ice cream, her cone and the spots at once. Shots on the way.
//   glasskal: calibrate's walker from the kiosk's spot (after E) to Majsan at home at index 8 (GLASS_RUNS,
//             default 3): every run there with ice cream left, and the house rule's on-foot timer
//             (ceil(1.25 × (median + 0.5))) equal to GLASS.meltSecs (DESIGN §8 "Timers and difficulty").
import { check } from '../lib.mjs';
import { installAutopilot } from './calibrate.mjs';

const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? (it.type === 'it' ? it.it.id : it.type) : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js');
    window.__said = []; window.__toasts = [];
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.key || (t?.height === 1.9 ? 'kiosk' : 'x'), text]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(String(text).replace(/<[^>]+>/g, '')); return toast(text, ...a); };
  });
}
const said = (T) => T.ev(() => window.__said.map(([w, s]) => `${w}: ${s}`));
const toasts = (T) => T.ev(() => window.__toasts.slice());
const clearLog = (T) => T.ev(() => { window.__said.length = 0; window.__toasts.length = 0; });
const st = (T) => T.ev(() => {
  const g = __game, G = g.glass, p = g.player, n = g.npc('majsan'), pr = p.model.props.glasstrut, sc = pr?.userData.scoops;
  const card = document.getElementById('objective'), timer = card.querySelector('.obj-timer');
  return {
    k: +G.k.toFixed(3), holding: G.holding, carrying: g.carrying ? { ...g.carrying } : null, arm: p.anim.glass, armK: p.anim.glassK != null ? +p.anim.glassK.toFixed(3) : null,
    cone: !!pr?.visible, scoops: sc ? sc.map((s) => s.mesh.visible) : null, spots: G.spots.filter((s) => s.mesh.visible).length,
    scene: G.scene?.kind || null, eatT: +G.eatT.toFixed(2), counts: { ...G.counts }, last: G.last, target: G.target(), objective: G.objective(),
    card: card.classList.contains('show') ? card.querySelector('.obj-title').textContent + ' · ' + card.querySelector('.obj-text').textContent + (timer.style.display === 'none' ? '' : ' · ' + timer.textContent) : null,
    coins: g.coins, rec: g.records.glass ?? null,
    m: { x: +n.x.toFixed(2), z: +n.z.toFixed(2), arm: n.anim.glass, k: n.anim.glassK != null ? +n.anim.glassK.toFixed(3) : null, posed: g.npcPosed('majsan'), cone: !!n.model.props.glasstrut?.visible },
    px: +p.x.toFixed(2), pz: +p.z.toFixed(2), car: !!g.playerCar, ms: g.missions.state, idx: g.missions.index,
  };
});
// Stig at the kiosk's spot facing its window, the camera behind him.
async function atKiosk(T) {
  await T.ev(() => {
    const g = __game, a = g.glass.cfg.at;
    if (g.playerCar) g.exitCar(true);
    g.player.state = 'normal';
    g.debugWarp(a[0], a[1], a[2]);
    g.player.vx = g.player.vz = 0;
    g.cam.yaw = a[2]; g.cam.snapNext = true;
  });
  await T.frames(8);
}
// Stig `d` m from Majsan on her line from the pool's middle side, facing her.
async function byMajsan(T, d) {
  await T.ev((d) => {
    const g = __game, n = g.npc('majsan'), p = g.player;
    const x = n.x - 0.35 * d, z = n.z + 0.94 * d, yaw = Math.atan2(n.x - x, n.z - z);
    g.debugWarp(x, z, yaw);
    p.vx = p.vz = 0;
    g.cam.yaw = yaw; g.cam.snapNext = true;
  }, d);
  await T.frames(6);
}
// A side shot of Stig and Majsan.
async function twoShot(T) {
  await T.ev(() => {
    const g = __game, p = g.player, n = g.npc('majsan'), mx = (p.x + n.x) / 2, mz = (p.z + n.z) / 2;
    const dx = n.x - p.x, dz = n.z - p.z, d = Math.hypot(dx, dz) || 1, sx = -dz / d, sz = dx / d;
    g.cam.cutTo({ x: mx + sx * 3.2, y: 1.9, z: mz + sz * 3.2 }, { x: mx, y: 1.3, z: mz });
  });
  await T.frames(4);
}
async function buy(T) {
  await atKiosk(T);
  await T.tap('KeyE');
  await T.until(() => __game.glass.holding, 4000);
}

export const SCENARIOS = {
  async glass(T) {
    await T.fresh('&mission=10');
    await spies(T);
    await T.ev(() => { __game.coins = 0; __game.addCoins(100); });
    // 1. The kiosk: the prompt by day, none at night, none in a car.
    await atKiosk(T);
    let s = await st(T), pr = await prompt(T);
    T.log('kiosk', await near(T), pr, JSON.stringify(s.m));
    check(s.idx === 10 && s.ms === 'idle', `fataga waiting (${s.idx} ${s.ms})`);
    check((await near(T)) === 'glass' && /Köp en glass \(25 pta\)/.test(pr), `the prompt "Köp en glass (25 pta)" (${pr})`);
    const eye = await T.ev(() => { const c = __game.cam.cam?.position || __game.cam.camera?.position; return c ? [+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)] : null; });
    T.log('eye at the kiosk', JSON.stringify(eye));
    await T.shot('glass_kiosk');
    await T.ev(() => __game.day.set(22));
    await T.frames(3);
    check((await near(T)) !== 'glass', `no sale at night (${await near(T)})`);
    await T.ev(() => __game.day.set(15));
    await T.ev(() => { const n = __game.npc('majsan'); n.state = 'hidden'; });
    await T.frames(3);
    check((await near(T)) !== 'glass', 'no sale with Majsan away');
    await T.ev(() => { const n = __game.npc('majsan'); n.state = 'normal'; n.root.visible = true; });
    await T.frames(3);

    // 2. E: −25, the lines, the cone in his left hand, the card, the guide.
    await T.tap('KeyE');
    await T.until(() => __game.glass.holding, 4000);
    await T.until(() => window.__said.length >= 2, 6000).catch(() => {});
    s = await st(T);
    let lines = await said(T);
    T.log('bought', JSON.stringify(s), JSON.stringify(lines));
    check(s.coins === 75 && s.last.paid === 25, `25 pta paid (${s.coins})`);
    check(s.carrying?.glass && s.arm === true && s.armK > 0.9 && s.cone && s.scoops?.every(Boolean), `the whole ice cream in his hand (${JSON.stringify(s)})`);
    check(lines[0] === 'kiosk: ¡Un helado de fresa! ¡Gracias, señor!' && lines[1] === 'stig: Den är till en… bekant.', `the window's line and Stig's (${lines})`);
    check(/GLASS TILL MAJSAN/i.test(s.card || '') && /Ge den till Majsan innan den smälter/.test(s.card) && !/\d:\d\d/.test(s.card), `the card, no countdown (${s.card})`);
    check(s.target?.follow && Math.abs(s.target.x - s.m.x) < 0.01, `the guide at Majsan (${JSON.stringify(s.target)})`);
    check((await near(T)) !== 'glass', 'no second sale with one in his hand');
    await T.ev(() => { const g = __game, p = g.player; g.cam.cutTo({ x: p.x - 2.1, y: 1.75, z: p.z + 0.9 }, { x: p.x - 0.2, y: 1.3, z: p.z - 0.3 }); });
    await T.frames(4);
    await T.shot('glass_kopt');
    await T.ev(() => __game.cam.release());

    // 3. Melting as he walks: the clock, the spots, the half line; in a car hidden and melting on.
    await T.ev(() => { const g = __game, y = Math.PI / 2; g.debugWarp(-31, 232, y); g.cam.yaw = y; g.cam.snapNext = true; });
    await T.frames(4);
    s = await st(T);
    const k0 = s.k, t0 = await T.ev(() => __game.time);
    await T.hold(['ShiftLeft', 'KeyW'], 1600);
    s = await st(T);
    const t1 = await T.ev(() => __game.time);
    const rate = (k0 - s.k) / (t1 - t0);
    T.log('melt', JSON.stringify({ k0, k: s.k, dt: t1 - t0, rate, spots: s.spots }));
    const melt = await T.ev(() => __game.glass.cfg.meltSecs);
    check(melt === 31 && Math.abs(1 / rate - melt) < 1, `it melts in ${melt} s (${(1 / rate).toFixed(1)} s)`);
    check(s.spots >= 2, `pink spots behind him (${s.spots})`);
    await T.ev(() => { const g = __game, p = g.player; g.cam.cutTo({ x: p.x + 2.6, y: 2.3, z: p.z - 2.4 }, { x: p.x - 2.6, y: 0.4, z: p.z }); });
    await T.frames(4);
    await T.shot('glass_droppar');
    await T.ev(() => __game.cam.release());
    await T.ev(() => { __game.glass.k = 0.52; });
    await T.until(() => __game.glass.counts.half === 1, 6000);
    await T.sleep(300);
    lines = await said(T);
    check(lines.includes('stig: Den smälter ju!'), `"Den smälter ju!" at half (${lines})`);
    s = await st(T);
    check(!s.scoops[1] && s.scoops[0], `the top scoop gone first (${s.scoops})`);
    await T.ev(() => { const g = __game, p = g.player; g.cam.cutTo({ x: p.x + 1.1, y: 1.75, z: p.z - 2.3 }, { x: p.x, y: 1.3, z: p.z }); });
    await T.frames(4);
    await T.shot('glass_halv');
    await T.ev(() => __game.cam.release());
    await T.anyCar();
    s = await st(T);
    const kc = s.k;
    await T.sleep(1200);
    const s2 = await st(T);
    T.log('car', JSON.stringify({ k: kc, k2: s2.k, arm: s2.arm, cone: s2.cone, car: s2.car }));
    check(s2.car && !s2.arm && !s2.cone && s2.holding && s2.k < kc, `hidden in the car and melting on (${JSON.stringify(s2)})`);
    await T.ev(() => __game.exitCar(true));
    await T.frames(6);
    s = await st(T);
    check(!s.car && s.arm === true && s.cone && s.holding, `back in his hand on foot (${JSON.stringify(s)})`);

    // 4. All gone: the plop, the toast, "Typiskt.", the bare cone and the card.
    await clearLog(T);
    await T.ev(() => { __game.glass.k = 0.02; });
    await T.until(() => __game.glass.counts.melt === 1, 6000);
    await T.sleep(1000);
    s = await st(T);
    lines = await said(T);
    const ts = await toasts(T);
    T.log('melted', JSON.stringify(s), JSON.stringify(lines), JSON.stringify(ts));
    check(s.k === 0 && s.holding && s.arm === true && s.armK === 0 && s.cone && s.scoops.every((v) => !v), `the bare cone in his hand (${JSON.stringify(s)})`);
    check(ts.includes('Glassen smälte. Bara struten kvar.') && lines.includes('stig: Typiskt.'), `the toast and "Typiskt." (${ts} ${lines})`);
    check(/Bara struten kvar/.test(s.card || ''), `the card's bare cone (${s.card})`);
    await T.ev(() => { const g = __game, p = g.player, y = p.yaw, fx = Math.sin(y), fz = Math.cos(y); g.cam.cutTo({ x: p.x + fx * 1.6 + fz * 1.2, y: 1.75, z: p.z + fz * 1.6 - fx * 1.2 }, { x: p.x, y: 1.25, z: p.z }); });
    await T.frames(4);
    await T.shot('glass_struten');
    await T.ev(() => __game.cam.release());

    // 5. Walking up to Majsan with the bare cone: the handover by itself, before her giver's talk.
    await clearLog(T);
    await byMajsan(T, 4.2);
    await T.holdUntil('KeyW', () => !!__game.glass.scene || __game.missions.state !== 'idle', 4000);
    s = await st(T);
    T.log('strut', JSON.stringify(s));
    check(s.scene === 'strut' && s.ms === 'idle' && s.m.posed, `the bare cone's handover, not the mission (${s.scene} ${s.ms})`);
    check((await near(T)) !== 'talk', `no giver's talk during the handover (${await near(T)})`);
    await T.until(() => __game.glass.counts.strut === 1, 5000);
    await T.sleep(400);
    await twoShot(T);
    await T.shot('glass_tanken');
    await T.until(() => !__game.glass.scene, 8000);
    await T.ev(() => __game.cam.release());
    s = await st(T);
    lines = await said(T);
    T.log('strut done', JSON.stringify(s), JSON.stringify(lines));
    let want = ['stig: Den var hel när jag köpte den…', 'majsan: Det är tanken som räknas, Stig.'];
    let order = want.map((w) => lines.indexOf(w));
    check(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), `the bare cone's lines in order (${lines})`);
    check(!s.holding && !s.carrying && !s.arm && s.m.arm === 'eat' && s.m.k === 0 && s.m.cone && s.rec == null, `the bare cone in her hand, no record (${JSON.stringify(s)})`);
    check(!(await toasts(T)).some((t) => /kom fram/.test(t)), 'no share toast for the bare cone');

    // 6. One brought in time: the first set, the share toast and the record; she eats it.
    await T.until(() => __game.glass.eatT <= 0, 15000);
    await clearLog(T);
    await buy(T);
    await T.ev(() => { __game.glass.k = 0.8; });
    await byMajsan(T, 2.8);
    s = await st(T);
    check(!s.scene && s.holding && (await near(T)) !== 'talk', `with her ice cream in his hand no talk with her 2.8 m off (${await near(T)} ${s.scene})`);
    await byMajsan(T, 4.2);
    await T.holdUntil('KeyW', () => !!__game.glass.scene, 4000);
    await T.until(() => __game.glass.counts.give === 1, 5000);
    await T.sleep(500);
    await twoShot(T);
    await T.shot('glass_gullig');
    await T.until(() => !__game.glass.scene, 8000);
    s = await st(T);
    lines = await said(T);
    let tt = await toasts(T);
    T.log('give', JSON.stringify(s), JSON.stringify(lines), JSON.stringify(tt));
    want = ['stig: Jag köpte en glass… till dig.', 'majsan: Till mig? Vad gullig du är, Stig-Helmer!', 'stig: Det var så lite.'];
    order = want.map((w) => lines.indexOf(w));
    check(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), `the first set's lines in order (${lines})`);
    const pct = s.last.pct;
    check(pct >= 70 && pct <= 80 && s.rec === pct && tt.some((t) => t === `Glassen kom fram – ${pct} % kvar. Nytt rekord!`), `the share and the record (${pct} ${s.rec} ${tt})`);
    check(s.m.arm === 'eat' && s.m.k > 0 && s.m.k < pct / 100, `she eats it (${JSON.stringify(s.m)})`);
    await T.sleep(800);
    await T.shot('glass_ater');
    await T.until(() => __game.glass.eatT <= 0, 15000);
    await T.frames(3);
    s = await st(T);
    check(!s.m.arm && !s.m.cone && !s.m.posed, `her hand empty after it (${JSON.stringify(s.m)})`);
    await byMajsan(T, 2.6);
    check((await near(T)) === 'talk', `her giver's talk back (${await near(T)})`);

    // 7. The second time: the second set (no record when it is lower).
    await clearLog(T);
    await buy(T);
    await T.ev(() => { __game.glass.k = 0.3; __game.glass.halfSaid = true; });
    await byMajsan(T, 4.2);
    await T.holdUntil('KeyW', () => !!__game.glass.scene, 4000);
    await T.until(() => __game.glass.counts.give === 2, 5000);
    await T.until(() => !__game.glass.scene, 8000);
    lines = await said(T);
    tt = await toasts(T);
    s = await st(T);
    T.log('give 2', JSON.stringify(lines), JSON.stringify(tt), s.rec);
    check(lines.includes('majsan: Igen? Du skämmer bort mig, Stig-Helmer.') && lines.includes('stig: Det är ju så varmt här nere.'), `the second set (${lines})`);
    check(s.rec === pct && tt.some((t) => /^Glassen kom fram – \d+ % kvar\.$/.test(t)), `no record below it (${s.rec} ${tt})`);

    // 8. R drops it; a mission start takes it all.
    await T.until(() => __game.glass.eatT <= 0, 15000);
    await clearLog(T);
    await buy(T);
    await T.ev(() => { const g = __game; g.cam.yaw = 0; g.player.yaw = 0; });
    await T.hold(['KeyW'], 500);
    const was = await T.ev(() => ({ x: __game.player.x, z: __game.player.z }));
    await T.tap('KeyR');
    await T.frames(6);
    s = await st(T);
    tt = await toasts(T);
    T.log('R', JSON.stringify(s), JSON.stringify(tt));
    check(!s.holding && !s.carrying && !s.arm && s.counts.drop === 1 && tt.includes('Stig tappade glassen.'), `R dropped it (${JSON.stringify(s)} ${tt})`);
    check(Math.hypot(s.last.x - was.x, s.last.z - was.z) < 1.5, `the splat where he stood, not on the road (${JSON.stringify(was)} ${s.last.x},${s.last.z})`);
    await buy(T);
    await T.ev(() => { __game.glass.k = 0.6; });
    await byMajsan(T, 6);
    s = await st(T);
    check(s.holding && s.spots > 0, `one in hand, spots out (${s.spots})`);
    await T.ev(() => __game.missions.begin());
    await T.until(() => __game.missions.state !== 'idle', 4000);
    await T.frames(4);
    s = await st(T);
    T.log('mission', JSON.stringify(s));
    check(!s.holding && !s.carrying && !s.arm && !s.cone && s.spots === 0 && !s.m.arm && s.last.kind === 'home' && s.last.why === 'mission', `the mission start took it all (${JSON.stringify(s)})`);
    check(!s.objective && !s.target, 'no card or guide in the mission');

    // 9. After the end (julafton's unlock): coming onto Flamenco's pool deck with her ice cream, the pool
    //    fest's ring forms without Majsan, and the handover plays there.
    await T.fresh('&mission=13');
    await spies(T);
    await T.ev(() => { const g = __game; g.player.teleport(-60, -60, 0); g.unlock('bodega'); g.placeNpcs(true); g.coins = 100; });
    await T.frames(10);
    await buy(T);
    await T.ev(() => { __game.glass.k = 0.9; });
    const C = await T.L('flamencoRing');
    await T.ev((C) => { const g = __game, y = Math.atan2(-4.2, -5.4); g.debugWarp(C.x + 4.2, C.z + 5.4, y); g.cam.yaw = y; g.cam.snapNext = true; }, C);
    await T.until(() => __game.fest.visit, 6000).catch(() => {});
    await T.sleep(1500);
    let f = await T.ev(() => ({ visit: __game.fest.visit, held: Object.keys(__game.fest.held) }));
    s = await st(T);
    T.log('fest', JSON.stringify(f), JSON.stringify(s.m));
    check(f.visit && f.held.length >= 3 && !f.held.includes('majsan'), `the ring forms without Majsan (${JSON.stringify(f)})`);
    await byMajsan(T, 4.2);
    await T.holdUntil('KeyW', () => !!__game.glass.scene, 5000);
    await T.until(() => __game.glass.counts.give === 1, 5000);
    s = await st(T);
    check(s.m.arm === 'eat' && s.last.pct >= 80, `the handover on the deck after the end (${JSON.stringify(s.last)})`);
  },

  async glasskal(T) {
    await T.fresh('&mission=8');
    const m = await T.ev(() => { const g = __game, n = g.npc('majsan'); return { x: +n.x.toFixed(2), z: +n.z.toFixed(2), spot: n.spot }; });
    T.log('majsan at', JSON.stringify(m));
    await T.ev(installAutopilot);
    const runs = [], N = +(process.env.GLASS_RUNS || 3), melt = await T.ev(() => __game.glass.cfg.meltSecs);
    for (let k = 0; k < N; k++) {
      await T.ev(() => { const g = __game; g.coins = 400; });
      await atKiosk(T);
      await T.tap('KeyE');
      await T.until(() => __game.glass.holding, 4000);
      const t0 = await T.ev(() => __game.time);
      await T.ev(() => { const g = __game, n = g.npc('majsan'), p = g.player; const d = Math.hypot(n.x - p.x, n.z - p.z); window.__ap.walk({ kind: 'point', x: n.x - ((n.x - p.x) / d) * 1.4, z: n.z - ((n.z - p.z) / d) * 1.4, r: 0.6 }); });
      const ok = await T.until(() => !!__game.glass.scene || !__game.glass.holding, 120000).then(() => true, () => false);
      const r = await T.ev((t0) => { const g = __game, G = g.glass, wr = window.__ap.walkResult(); window.__ap.foot = null; return { t: +(g.time - t0).toFixed(2), left: G.scene ? +(G.last.k * G.cfg.meltSecs).toFixed(2) : 0, ok: G.scene?.kind === 'give', falls: wr?.falls ?? null, walked: wr?.walked ?? null }; }, t0);
      runs.push(r);
      T.log('run', k, JSON.stringify(r), ok);
      await T.until(() => !__game.glass.scene && __game.glass.eatT <= 0, 20000).catch(() => {});
      await T.ev(() => { const g = __game; g.glass.eatT = 0; });
    }
    // DESIGN §8: on foot T_ref = the run's median + 0.5 s per target, timer = ceil(1.25 × T_ref).
    const ts = runs.map((r) => r.t).sort((a, b) => a - b), med = ts.length % 2 ? ts[(ts.length - 1) / 2] : (ts[ts.length / 2 - 1] + ts[ts.length / 2]) / 2;
    const tRef = med + 0.5, timer = Math.ceil(1.25 * tRef);
    T.log(`CAL glassMajsan | the ice cream from the HELADOS kiosk to Majsan at the pool (on foot) | walker, from the cone in his hand to the handover | T_ref ${tRef.toFixed(2)} | timer ${timer} (meltSecs ${melt}) | median of ${runs.length} runs + 0.5 s × 1: ${runs.map((r) => `${r.t.toFixed(2)}${r.falls ? '*' : ''} (${r.walked} m; ${r.left} s left)`).join(' ')}`);
    check(runs.every((r) => r.ok && r.left > 0), `every run there with ice cream left (${JSON.stringify(runs)})`);
    check(timer === melt, `the house rule's on-foot timer ${timer} = meltSecs ${melt}`);
  },
};
