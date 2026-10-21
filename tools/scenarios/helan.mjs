// Helan går från balkongen (free roam, DESIGN §10.63; feature 134): helan, helanshots, helanklipp.
//   helan:      at index 6 (friskotek waiting, Affe and Gabbe its extras) between missions. By day (the
//               held test clock's 15:00) no party and no song. The balconies it may take: the 1st and 2nd
//               floors' units with no resident, awning or potted plant, in many blocks. At 20:30 the
//               evening picks one, but the real Affe in view is not taken (and no party) until Stig looks
//               away; then the real Affe and Gabbe hidden (ours), the four doubles perched on the balcony
//               (Affe's accordion, Gabbe's congas, a guest's cup) under the garland. The song: nothing
//               200 m off; at 60 m near / d, from the balcony's side of the camera and the other side
//               turned round, muffled; at 40 m the tune hardly ducked; under it level 1, the layer
//               sounding on its own 104 bpm bars (every note on a sixteenth), the tune ducked to 0.2. Under the balcony on foot the first
//               exchange in order ("Skål, grannen! Kom upp!", "Det känns fånigt att gå upp…", "Här,
//               grannen – till en sangria!"), the napkin falling to his feet, 50 pta and the toast; away
//               and back the second ("Kom upp, grannen! Det finns sangria!", "Jag är skraj att de ska…")
//               with no napkin. At a round's start the sung line, at its end "Skål!" and once an evening
//               Affe's sigh. The music off: no song, the minimap's dot; on again: no dot. In a car × 0.55.
//               A mission start ends it at once, Affe and Gabbe back at the friskotek's places (its
//               extras) once black, the clock at nine; after the abort no party by day. The next evening
//               a balcony in another block. The hours over: the party stays while its balcony is in
//               view, goes when it is not, and the real ones come back. Before buss17 is done (index 5)
//               none.
//   helanshots: the street under the balcony with the exchange's bubbles, the balcony close up, the napkin
//               falling and at his feet, the garland from down the street, the minimap's dot with the
//               music off, a second evening's balcony.
//   helanklipp: the game's output and the party's layer alone recorded under the balcony, 40 m and 100 m off
//               (`HELAN_SECS` s each, 12 by default) as WAVs in OUT, for listening.
import fs from 'fs';
import path from 'path';
import { check } from '../lib.mjs';

const MARK = 'helanGar';
const audioUp = (T) => T.ev(async () => {
  window.__audio = (await import('/src/audio.js')).audio;
  window.__hud = (await import('/src/game/hud.js')).hud;
  window.__ground = (await import('/src/world/collision.js')).groundAt;
  return window.__audio.ready && window.__audio.level().state === 'running';
});
async function spies(T) {
  await T.ev(() => {
    const g = __game, H = g.helan, hud = window.__hud;
    window.__said = []; window.__toasts = [];
    const who = (t) => (t === g.player ? 'stig' : Object.entries(H.bodies || {}).find(([, ch]) => ch === t)?.[0] || 'x');
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([who(t), text]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(String(text).replace(/<[^>]+>/g, '')); return toast(text, ...a); };
  });
}
const said = (T) => T.ev(() => window.__said.filter(([w]) => w !== 'x').map(([w, s]) => `${w}: ${s}`));
const toasts = (T) => T.ev(() => window.__toasts.slice());
const clearLog = (T) => T.ev(() => { window.__said.length = 0; window.__toasts.length = 0; });
const st = (T) => T.ev((MARK) => {
  const g = __game, H = g.helan, a = window.__audio, B = H.bodies, r3 = (v) => +(+v).toFixed(3);
  const real = (k) => { const n = g.npc(k); return { state: n.state, vis: n.root.visible, spot: n.spot, mine: n.spot === MARK, x: r3(n.x), z: r3(n.z) }; };
  return {
    on: H.on, evening: H.evening, held: { ...H.held }, block: H.spot?.block ?? null, lot: H.spot?.lot.id ?? null, fl: H.spot?.spot.fl ?? null,
    d: r3(H.d), level: r3(H.level), side: r3(H.side), out: r3(H.out), duck: H.musicDuck, hz: Math.round(H.hz),
    counts: { ...H.counts }, last: H.last, coins: g.coins, h: r3(g.day.h), ms: g.missions.state, idx: g.missions.index,
    bodies: B && Object.fromEntries(Object.entries(B).map(([k, ch]) => [k, { vis: ch.root.visible, state: ch.state, perched: !!ch.perched, y: r3(ch.y), held: ch.def.held || null, cup: ch.anim.cupHeld }])),
    garland: !!H.garland?.visible, affe: real('affe'), gabbe: real('gabbe'), mix: r3(g.ljud.mix),
    fest: a.festState(), layer: a.ambState()?.layers.fest, napkin: H.napkin && { phase: H.napkin.phase, to: H.napkin.to },
    markers: g.mapMarkers(false).filter((m) => m.type === 'fest'),
  };
}, MARK);
// Stig on foot at tonight's balcony: `out` m towards the street from its line, `k` × its width along it,
// facing the balcony (or `yaw`), the camera behind him.
const under = (T, out = 8, k = 0, yaw = null) => T.ev((out, k, yaw) => {
  const g = __game, H = g.helan, p = H.at(k, out), y = yaw ?? Math.atan2(H.spot.x - p.x, H.spot.z - p.z);
  if (g.playerCar) g.exitCar(true);
  g.cam.release();
  g.player.state = 'normal';
  g.debugWarp(p.x, p.z, y); g.cam.yaw = y; g.cam.snapNext = true;
}, out, k, yaw);
// Stig on foot at (x, z) facing yaw.
const at = (T, x, z, yaw = 0) => T.ev((x, z, yaw) => {
  const g = __game;
  if (g.playerCar) g.exitCar(true);
  g.cam.release();
  g.player.state = 'normal';
  g.debugWarp(x, z, yaw); g.cam.yaw = yaw; g.cam.snapNext = true;
}, x, z, yaw);
// The beach facing the sea: away from every balcony and from the friskotek, nothing of them in view.
const away = (T) => at(T, 40, 290, Math.PI);
// The peak RMS of the `fest` layer and of master over `ms`.
const peaks = (T, ms) => T.ev(async (ms) => {
  const out = { fest: 0, master: 0 };
  for (let t = 0; t < ms; t += 100) {
    out.fest = Math.max(out.fest, window.__audio.ambState().layers.fest.rms);
    out.master = Math.max(out.master, window.__audio.level().rms);
    await new Promise((r) => setTimeout(r, 100));
  }
  return { fest: +out.fest.toFixed(4), master: +out.master.toFixed(4) };
}, ms);
const evening = (T, h = 20.5) => T.ev((h) => { __game.day.set(h); }, h);
// A fixed camera at tonight's balcony: at (k, out) `hg` m over the ground there, looking at (lk, lout, lh).
const cam = (T, k, out, hg, lk = 0, lout = 0, lh = 1.3) => T.ev((a) => {
  const g = __game, H = g.helan, c = H.at(a.k, a.out), gy = window.__ground(c.x, c.z, 0.2, 0.6);
  g.cam.cutTo({ x: c.x, y: gy + a.hg, z: c.z }, H.at(a.lk, a.lout, a.lh));
}, { k, out, hg, lk, lout, lh });

export const SCENARIOS = {
  async helan(T) {
    await T.fresh('&mission=6');
    check(await audioUp(T), 'the audio context runs');
    await spies(T);
    let r;

    // 0. By day: no party, no song.
    await T.frames(10);
    r = await st(T);
    check(r.idx === 6 && r.ms === 'idle' && r.h === 15 && !r.on && r.evening === 0 && r.out === 0 && r.affe.vis && r.gabbe.vis, `by day no party (${JSON.stringify({ on: r.on, ev: r.evening, out: r.out, affe: r.affe })})`);
    const cands = await T.ev(() => {
      const H = __game.helan, c = H.candidates(), recs = new Set(__game.residents.recs.map((q) => q.spot));
      return { n: c.length, blocks: new Set(c.map((q) => q.block)).size, bad: c.filter((q) => ![1, 2].includes(q.spot.fl) || q.spot.awning || q.spot.plant || recs.has(q.spot)).length };
    });
    T.log('balconies', JSON.stringify(cands));
    check(cands.n > 50 && cands.blocks >= 8 && cands.bad === 0, `the balconies a party may take (${JSON.stringify(cands)})`);

    // 1. 20:30 with the real Affe in view: tonight's balcony picked, but nobody taken and no party.
    await T.ev(() => {
      const g = __game, n = g.npc('affe'), y = -Math.PI / 2;
      g.debugWarp(n.x + 6, n.z, y); g.cam.yaw = y; g.cam.pitch = 0.2; g.cam.snapNext = true;
    });
    await T.sleep(1800);   // past the warp's cut
    await evening(T);
    await T.frames(40);
    r = await st(T);
    T.log('evening, Affe in view', JSON.stringify({ ev: r.evening, lot: r.lot, fl: r.fl, on: r.on, held: r.held, affe: r.affe }));
    check(r.evening === 1 && r.lot && !r.on && !r.held.affe && r.affe.vis && !r.affe.mine, `Affe in view is not taken (${JSON.stringify({ ev: r.evening, on: r.on, held: r.held, affe: r.affe })})`);
    const ev1 = r.block;

    // 2. Stig looks away: the real ones hidden, the doubles on the balcony under the garland.
    await away(T);
    await T.until(() => __game.helan.on, 15000).catch(() => {});
    await T.frames(5);
    r = await st(T);
    T.log('party', JSON.stringify({ on: r.on, held: r.held, affe: r.affe, gabbe: r.gabbe, bodies: r.bodies, garland: r.garland }));
    check(r.on && r.held.affe && r.held.gabbe && r.affe.state === 'hidden' && !r.affe.vis && r.affe.mine && r.gabbe.state === 'hidden' && r.gabbe.mine, `the real Affe and Gabbe hidden (${JSON.stringify({ a: r.affe, g: r.gabbe })})`);
    const spotY = await T.ev(() => __game.helan.spot.y);
    check(Object.values(r.bodies).every((b) => b.vis && b.perched && Math.abs(b.y - spotY) < 0.01) && r.bodies.affe.held === 'accordion' && r.bodies.gabbe.held === 'congas' && r.bodies.a.cup === 'low' && r.garland,
      `the four on the balcony, the garland (${JSON.stringify(r.bodies)})`);

    // 3. The song: none 200 m off; near / d at 60 m from the balcony's side; level 1 under it.
    await T.ev(() => { const g = __game, s = g.helan.spot, x = s.x > 0 ? s.x - 230 : s.x + 230; g.debugWarp(x, Math.max(-250, Math.min(250, s.z)), 0); g.cam.snapNext = true; });
    await T.frames(20);
    r = await st(T);
    check(r.d > 150 && r.level === 0 && r.out === 0 && r.duck === 1, `200 m off nothing (${JSON.stringify({ d: r.d, level: r.level, duck: r.duck })})`);
    // 60 m out in front, turned to the street's one side and then the other.
    const side = [];
    for (const turn of [Math.PI / 2, -Math.PI / 2]) {
      await T.ev((turn) => {
        const g = __game, H = g.helan, p = H.at(0, 60), y = Math.atan2(H.spot.x - p.x, H.spot.z - p.z) + turn;
        g.debugWarp(p.x, p.z, y); g.cam.yaw = y; g.cam.snapNext = true;
      }, turn);
      await T.frames(20);
      r = await st(T);
      const dir = await T.ev(() => { const g = __game, H = g.helan, f = g.focus(), d = Math.hypot(H.spot.x - f.x, H.spot.z - f.z), J = g.ljud.right; return +(((H.spot.x - f.x) / d) * J.x + ((H.spot.z - f.z) / d) * J.z).toFixed(3); });
      side.push({ d: r.d, level: r.level, side: r.side, dir, hz: r.hz });
    }
    T.log('60 m', JSON.stringify(side));
    check(side.every((q) => Math.abs(q.level - 14 / q.d) < 0.02 && Math.sign(q.side) === Math.sign(q.dir) && Math.abs(q.side) > 0.4 && q.hz < 4000) && Math.sign(side[0].side) !== Math.sign(side[1].side),
      `60 m off: near / d, from its side, muffled (${JSON.stringify(side)})`);
    // 40 m out the tune is hardly down: only near it.
    await under(T, 40);
    await T.frames(20);
    r = await st(T);
    check(Math.abs(r.level - 14 / 40) < 0.02 && r.duck >= 0.85, `40 m off the tune hardly ducked (${JSON.stringify({ level: r.level, duck: r.duck })})`);
    await under(T, 8);
    await T.sleep(3200);
    const p8 = await peaks(T, 2500);
    r = await st(T);
    T.log('under it', JSON.stringify({ d: r.d, level: r.level, out: r.out, duck: r.duck, hz: r.hz, fest: r.fest, layer: r.layer, peaks: p8 }));
    check(r.level === 1 && r.out === 1 && r.duck === 0.2 && r.hz > 6000 && r.fest.on && r.fest.log.bars >= 2 && r.fest.log.offGrid === 0 && p8.fest > 0.005,
      `under it: the song on its bars, sounding, the tune ducked (${JSON.stringify({ level: r.level, duck: r.duck, fest: r.fest, peaks: p8 })})`);
    const beat = await T.ev(() => window.__audio.festPos()?.beat);
    check(Math.abs(beat - 60 / 104) < 1e-6, `104 bpm (${beat})`);

    // 4. The first exchange and the napkin with 50 pta.
    await T.until(() => __game.helan.counts.pick > 0, 15000).catch(() => {});
    await T.frames(5);
    r = await st(T);
    let s = await said(T);
    const tt = await toasts(T);
    T.log('first', JSON.stringify({ said: s, toasts: tt, counts: r.counts, coins: r.coins, last: r.last }));
    const first = ['a: Skål, grannen! Kom upp!', 'stig: Det känns fånigt att gå upp…', 'b: Här, grannen – till en sangria!'];
    const order = first.map((l) => s.indexOf(l));
    check(order.every((i, n) => i >= 0 && (n === 0 || i > order[n - 1])) && r.counts.first === 1 && r.counts.drop === 1 && r.counts.pick === 1 && r.coins === 50 && tt.includes('En servett med 50 pta – till en sangria.'),
      `the first exchange in order, the napkin and 50 pta (${JSON.stringify({ s, tt, coins: r.coins })})`);

    // 5. Away and back: the second, no napkin.
    await clearLog(T);
    await under(T, 42);
    await T.frames(10);
    await under(T, 8);
    await T.sleep(3500);
    r = await st(T);
    s = await said(T);
    T.log('again', JSON.stringify({ s, counts: r.counts, coins: r.coins }));
    check(s.includes('b: Kom upp, grannen! Det finns sangria!') && s.includes('stig: Jag är skraj att de ska…') && s.indexOf('b: Kom upp, grannen! Det finns sangria!') < s.indexOf('stig: Jag är skraj att de ska…')
      && r.counts.again === 1 && r.counts.drop === 1 && r.coins === 50, `the second exchange, no napkin (${JSON.stringify({ s, c: r.counts })})`);

    // 6. A round from its start: the sung line; at its end "Skål!", and Affe's sigh once an evening.
    await clearLog(T);
    await T.ev(() => window.__audio.festStart(3));
    await T.until(() => __game.helan.counts.sung > 0, 4000).catch(() => {});
    await T.until(() => __game.helan.counts.sigh > 0, 26000).catch(() => {});
    r = await st(T);
    s = await said(T);
    T.log('a round', JSON.stringify({ s, counts: r.counts, log: r.fest.log }));
    check(s.some((l) => /: ♪ Helan går, sjung hopp faderallan lallan lej… ♪$/.test(l)) && s.includes('a: Skål!') && s.includes('affe: Jag har haft två grisfester i veckan.')
      && s.indexOf('a: Skål!') < s.indexOf('affe: Jag har haft två grisfester i veckan.') && r.fest.log.rounds >= 1 && r.fest.log.skal >= 1 && r.fest.log.sung > 0, `the sung line, Skål! and the sigh (${JSON.stringify(s)})`);

    // 7. The music off: no song, the minimap's dot; on again: none.
    await T.ev(() => window.__audio.setMusic(false));
    await T.frames(15);
    r = await st(T);
    const sx = await T.ev(() => __game.helan.spot.x);
    check(r.out === 0 && !r.fest.on && r.markers.length === 1 && Math.abs(r.markers[0].x - sx) < 0.01 && r.duck === 1, `music off: no song, the dot (${JSON.stringify({ out: r.out, fest: r.fest.on, m: r.markers })})`);
    await T.ev(() => window.__audio.setMusic(true));
    await T.frames(15);
    r = await st(T);
    check(r.out === 1 && r.fest.on && r.markers.length === 0, `music on: the song, no dot (${JSON.stringify({ out: r.out, m: r.markers })})`);

    // 8. In a car × 0.55.
    await T.anyCar();
    await T.ev(() => { const g = __game, H = g.helan, p = H.at(0, 8); g.playerCar.place(p.x, p.z, H.spot.yaw); });
    await T.frames(15);
    r = await st(T);
    check(Math.abs(r.out - 0.55 * r.level) < 0.01 && r.mix === 0.55, `in a car × 0.55 (${JSON.stringify({ out: r.out, level: r.level, mix: r.mix })})`);
    await T.ev(() => __game.exitCar(true));

    // 9. A mission start ends it at once; Affe and Gabbe at the friskotek's places once black.
    await T.startMission();
    r = await st(T);
    const places = await T.ev(() => {
      const g = __game, q = (dx, dz) => g.lmOffset('friskotek', dx, dz);
      return { affe: q(-4, -6), gabbe: q(4, -6) };
    });
    T.log('mission', JSON.stringify({ on: r.on, held: r.held, affe: r.affe, gabbe: r.gabbe, places, h: r.h, garland: r.garland, out: r.out, counts: r.counts }));
    check(!r.on && !Object.keys(r.held).length && !r.garland && r.out === 0 && r.h === 9, `a mission start: no party, the clock at nine (${JSON.stringify({ on: r.on, held: r.held, h: r.h })})`);
    check(['affe', 'gabbe'].every((k) => r[k].vis && r[k].state === 'normal' && !r[k].mine && Math.hypot(r[k].x - places[k].x, r[k].z - places[k].z) < 0.6),
      `Affe and Gabbe at the friskotek's places (${JSON.stringify({ a: r.affe, g: r.gabbe, places })})`);
    await T.ev(() => __game.missions.abort());
    await T.until(() => __game.missions.state === 'idle', 8000);
    await T.frames(30);
    r = await st(T);
    check(!r.on && r.h === 9 && r.affe.vis, `after the abort, by day, no party (${JSON.stringify({ on: r.on, h: r.h })})`);

    // 10. The next evening: another block.
    await away(T);
    await T.sleep(1500);
    await evening(T);
    await T.until(() => __game.helan.on, 15000).catch(() => {});
    r = await st(T);
    T.log('evening 2', JSON.stringify({ ev: r.evening, block: r.block, ev1, lot: r.lot, fl: r.fl }));
    check(r.on && r.evening === 2 && r.block !== ev1, `the next evening another block (${ev1} -> ${r.block})`);

    // 11. The hours over: on while its balcony is in view, gone when it is not; the real ones back.
    await under(T, 14);
    await cam(T, 0, 16, 1.6);
    await T.sleep(1600);
    await evening(T, 2.5);
    await T.frames(30);
    r = await st(T);
    check(r.on && Object.values(r.bodies).every((b) => b.vis), `past two, in view: still on (${r.on})`);
    await T.ev(() => { const g = __game; g.cam.release(); g.cam.yaw += Math.PI; g.cam.snapNext = true; });
    await T.until(() => !__game.helan.on, 8000).catch(() => {});
    await away(T);   // the real ones' places out of view too
    await T.sleep(1600);
    r = await st(T);
    T.log('hours over', JSON.stringify({ on: r.on, held: r.held, affe: r.affe, gabbe: r.gabbe, last: r.last, garland: r.garland, counts: r.counts }));
    check(!r.on && !r.garland && !Object.keys(r.held).length && r.affe.vis && !r.affe.mine && r.gabbe.vis && !r.gabbe.mine && r.counts.release >= 4,
      `the hours over: gone out of view, the real ones back (${JSON.stringify({ on: r.on, held: r.held, a: r.affe, g: r.gabbe })})`);

    // 12. Before buss17 is done (index 5): no party in the evening.
    await T.fresh('&mission=5');
    await audioUp(T);
    await away(T);
    await T.sleep(1500);
    await evening(T, 21);
    await T.sleep(2500);
    r = await st(T);
    check(r.idx === 5 && !r.on && !Object.keys(r.held).length && r.out === 0, `index 5: none (${JSON.stringify({ idx: r.idx, on: r.on, held: r.held })})`);
  },

  async helanshots(T) {
    await T.fresh('&mission=6');
    await audioUp(T);
    await away(T);
    await T.sleep(1500);
    await evening(T, 20.75);
    await T.until(() => __game.helan.on, 15000);
    // The street under the balcony: Stig before it, the camera low behind him looking up; the guests'
    // call, his answer, the napkin's line.
    await under(T, 6.5, -0.1);
    await cam(T, -0.5, 11.5, 1.2, 0, 2, 0.6);
    await T.sleep(1000);
    await T.shot('helan_gatan');
    await T.sleep(1700);
    await T.shot('helan_gatan2');
    await T.ev(() => { const g = __game, H = g.helan; g.cam.cutTo(H.at(0.05, 5.5, 1.6), H.at(0, 0, 1.3)); });
    await T.until(() => !!__game.helan.napkin, 6000).catch(() => {});
    await T.shot('helan_balkong');
    // The napkin on its way down, as he sees it: from beside his head, looking up at it.
    await T.until(() => (__game.helan.napkin?.t ?? 0) > 1.1, 4000).catch(() => {});
    await T.ev(() => {
      const g = __game, H = g.helan, N = H.napkin, m = N.mesh.position, p = g.player;
      g.cam.cutTo({ x: p.x + N.side.x * 0.9 + H.spot.ox * 1.2, y: p.y + 1.5, z: p.z + N.side.z * 0.9 + H.spot.oz * 1.2 }, { x: m.x, y: m.y + 0.6, z: m.z });
    });
    await T.shot('helan_servett');
    await T.until(() => __game.helan.counts.pick > 0, 6000).catch(() => {});
    await cam(T, -0.5, 11.5, 1.2, 0, 2, 0.6);
    await T.frames(10);
    await T.shot('helan_servett2');
    // From across the street, along it: the garland.
    await cam(T, -5, 14, 1.7, 0, 0, 1.4);
    await T.sleep(700);
    await T.shot('helan_avstand');
    // The music off: the minimap's dot, Stig 36 m down the street.
    await T.ev(() => window.__audio.setMusic(false));
    const far = await T.ev(() => { const H = __game.helan, p = H.at(-9, 11), q = H.at(0, 11); return [p.x, p.z, Math.atan2(q.x - p.x, q.z - p.z)]; });
    await at(T, ...far);
    await T.sleep(800);
    await T.shot('helan_karta');
    await T.ev(() => window.__audio.setMusic(true));
    // A second evening's balcony.
    await away(T);
    await T.sleep(1500);
    await evening(T, 9);
    await T.frames(20);
    await evening(T, 21.5);
    await T.until(() => __game.helan.on && __game.helan.evening === 2, 15000);
    await under(T, 7, 0.1);
    await cam(T, -0.7, 12, 1.3, 0, 2, 0.8);
    await T.sleep(1000);
    await T.shot('helan_kvall2');
  },

  async helanklipp(T) {
    const secs = +(process.env.HELAN_SECS || 12);
    await T.fresh('&mission=7&ts=1');
    await audioUp(T);
    await away(T);
    await T.sleep(1500);
    await evening(T, 21);
    await T.until(() => __game.helan.on, 15000);
    for (const [name, out] of [['under', 8], ['40m', 40], ['100m', 100]]) {
      await under(T, out);
      await T.sleep(2500);
      // Master (what the player hears, before the compressor) and the soundscape's channel alone (here
      // the party's layer) at the same time.
      const [b1, b2] = await T.ev(async (secs) => {
        const { master, ambient } = window.__audio.ambNodes(), ctx = master.context, n = Math.round(secs * ctx.sampleRate);
        const ch = [0, 1, 2, 3].map(() => new Float32Array(n));
        let k = 0;
        const merger = ctx.createChannelMerger(4), s1 = ctx.createChannelSplitter(2), s2 = ctx.createChannelSplitter(2);
        master.connect(s1); ambient.connect(s2);
        s1.connect(merger, 0, 0); s1.connect(merger, 1, 1); s2.connect(merger, 0, 2); s2.connect(merger, 1, 3);
        const sp = ctx.createScriptProcessor(4096, 4, 1), sink = ctx.createGain();
        sink.gain.value = 0;
        await new Promise((done) => {
          sp.onaudioprocess = (e) => {
            const m = Math.min(e.inputBuffer.length, n - k);
            for (let c = 0; c < 4; c++) ch[c].set(e.inputBuffer.getChannelData(c).subarray(0, m), k);
            k += m;
            if (k >= n) done();
          };
          merger.connect(sp); sp.connect(sink).connect(ctx.destination);
        });
        master.disconnect(s1); ambient.disconnect(s2); sp.disconnect(); merger.disconnect();
        const wav = (L, R) => {
          const pcm = new Int16Array(n * 2);
          for (let i = 0; i < n; i++) { pcm[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
          const head = new DataView(new ArrayBuffer(44)), sr = ctx.sampleRate;
          const s = (o, t) => { for (let i = 0; i < t.length; i++) head.setUint8(o + i, t.charCodeAt(i)); };
          s(0, 'RIFF'); head.setUint32(4, 36 + pcm.byteLength, true); s(8, 'WAVE'); s(12, 'fmt ');
          head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 2, true); head.setUint32(24, sr, true);
          head.setUint32(28, sr * 4, true); head.setUint16(32, 4, true); head.setUint16(34, 16, true); s(36, 'data'); head.setUint32(40, pcm.byteLength, true);
          const bytes = new Uint8Array(44 + pcm.byteLength);
          bytes.set(new Uint8Array(head.buffer), 0); bytes.set(new Uint8Array(pcm.buffer), 44);
          let bin = '';
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
          return btoa(bin);
        };
        return [wav(ch[0], ch[1]), wav(ch[2], ch[3])];
      }, secs);
      const file = path.join(T.out, `helan_${name}`);
      fs.writeFileSync(file + '.wav', Buffer.from(b1, 'base64'));
      fs.writeFileSync(file + '_fest.wav', Buffer.from(b2, 'base64'));
      T.log('recorded', file + '.wav', '+ _fest.wav');
    }
  },
};
