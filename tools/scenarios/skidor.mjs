// Låna rullskidorna – åk fort på asfalt (free roam, DESIGN §10.39; feature 71): skidor, eslovrundan,
// eslovrundankal.
import { check, pct } from '../lib.mjs';

const st = (T) => T.ev(() => {
  const g = __game, p = g.player, k = g.skis, n = g.npc('eslov');
  return { on: k.on, v: +k.v.toFixed(2), yaw: +k.yaw.toFixed(2), surf: k.surf, mode: k.mode, fallen: k.fallen, state: p.state, x: +p.x.toFixed(2), z: +p.z.toFixed(2),
    ski: p.anim.ski, skier: { mode: g.eslov.mode, ski: n.anim.ski, x: +n.x.toFixed(2), z: +n.z.toFixed(2) } };
});
// A fixed camera `d` m from Stig at `ang` rad from his heading (0 = in front), `h` m up, looking at him.
const cut = (T, ang, d = 4.5, h = 1.6, at = null) => T.ev((ang, d, h, at) => {
  const g = __game, p = g.player, a = p.yaw + ang, c = at || { x: p.x, z: p.z };
  g.cam.cutTo({ x: c.x + Math.sin(a) * d, y: p.y + h, z: c.z + Math.cos(a) * d }, { x: c.x, y: p.y + 0.9, z: c.z });
}, ang, d, h, at);
const release = (T) => T.ev(() => { __game.cam.release(); __game.cam.snapNext = true; });
// Stig on the skis at (x, z) heading `yaw`, at speed v (the skis' own state, as after a run-up).
const place = (T, x, z, yaw, v = 0) => T.ev((x, z, yaw, v) => {
  const g = __game, p = g.player, k = g.skis;
  p.state = 'normal';
  p.teleport(x, z, yaw);
  k.yaw = yaw; k.v = k.vSet = v; k.px = p.x; k.pz = p.z; p.vx = Math.sin(yaw) * v; p.vz = Math.cos(yaw) * v;
  g.cam.yaw = yaw; g.cam.snapNext = true;
}, x, z, yaw, v);
// The keys the autopilot holds: a heading (world yaw), or null (none: he rolls).
const steer = (T, yaw) => T.ev((yaw) => { __game.skis.auto = yaw == null ? null : () => ({ yaw }); }, yaw);
const unsteer = (T) => T.ev(() => { __game.skis.auto = () => null; });
const keys = (T) => T.ev(() => { __game.skis.auto = null; });

const said0 = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([typeof t === 'string' ? t : (t === g.player ? 'stig' : t.key || 'ped'), text]); return o(t, text, secs); };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const has = (s, who, text) => s.some(([w, t]) => w === who && t === text);
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
// Until Stig is on his feet again after a fall (and the skis' fall is over).
async function upAgain(T) {
  const ok = await T.until(() => __game.player.state === 'normal' && !__game.skis.fallen, 15000).then(() => true, () => false);
  if (!ok) throw new Error(`never up again: ${JSON.stringify(await st(T))} ${JSON.stringify(await T.ev(() => ({ last: __game.skis.last, timer: __game.player.timer, y: __game.player.y, vy: __game.player.vy })))}`);
}

// The skis' autopilot for Eslövrundan (§10.39; the measurement, §8 "Timers and difficulty"): it
// holds the keys a player would, a heading for the camera-relative stick, and nothing else. Its
// racing line: up the lane 2 m east of its middle, round the inner corner of each crossing on an arc
// (radius 8 m into and out of the 6 m lane, 9.5 m at the west road's crossings; each passes 1–3.5 m
// from the checkpoint there), along the roads between them, up the lane over the line. It aims
// `look` m ahead on the line. Its speed: on an arc at most √(`lat` × r) (`lat` 7.2, under the skis'
// 8 m/s²), braking for it at `ab` m/s² (under the plough's 3): above that curve it ploughs (the stick
// straight back, no steering) on a straight or rolls on an arc (the stick across, turning as hard as
// the skis let it), under it it poles. `fallAt` (an arc's index, 1–4): on the straight before that
// arc, halfway, it falls once (skis.fall('kerb')), for a fall's measured cost. Runs only while
// Eslövrundan's clock runs.
const installSkiPilot = (o) => {
  const g = __game, k = g.skis, l = window.__lm('eslovVag');
  const lat = o.lat ?? 7.2, ab = o.ab ?? 2.8, falls = new Set(o.fallAt ?? []);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  // Offsets from eslovVag: [cx, cz, r, θ from, θ to] (points c + r (cos θ, sin θ)).
  const arcs = [[-6, -55.5, 8, 0, -Math.PI / 2], [-58.5, -55, 9.5, -Math.PI / 2, -Math.PI], [-58.5, 7, 9.5, Math.PI, Math.PI / 2], [-6, 7.5, 8, Math.PI / 2, 0]];
  const P = [{ x: l.x, z: l.z - 6.5, v: Infinity, arc: 0 }];
  arcs.forEach(([cx, cz, r, a0, a1], n) => {
    for (let q = 0; q <= 9; q++) { const a = a0 + (a1 - a0) * q / 9; P.push({ x: l.x + cx + r * Math.cos(a), z: l.z + cz + r * Math.sin(a), v: Math.sqrt(lat * r), arc: n + 1, first: q === 0 }); }
  });
  P.push({ x: l.x + 2, z: l.z - 14, v: Infinity, arc: 0 });
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z));
  const at = (sv) => { let i = 1; while (i < P.length - 1 && cum[i] < sv) i++; const a = P[i - 1], b = P[i], f = Math.min(1, Math.max(0, (sv - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1))); return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f }; };
  const st = window.__skiPilot = { i: 1, fell: new Set(), falls: 0 };
  k.auto = (skis) => {
    const r = skis.trial, p = g.player;
    if (!r || r.t0 == null || p.state !== 'normal') return null;
    while (st.i < P.length - 1) {
      const a = P[st.i - 1], b = P[st.i], L = cum[st.i] - cum[st.i - 1];
      if (((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / L < L) break;
      st.i++;
    }
    const a = P[st.i - 1], b = P[st.i], L = cum[st.i] - cum[st.i - 1];
    const sNow = cum[st.i - 1] + Math.max(0, Math.min(L, ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / L));
    // The forced fall: halfway along the straight before arc n.
    if (b.first && falls.has(b.arc) && !st.fell.has(b.arc) && sNow > cum[st.i - 1] + L / 2) { st.fell.add(b.arc); st.falls++; skis.fall('kerb'); return null; }
    const T = at(sNow + Math.max(3, skis.v * 0.35)), aim = Math.atan2(T.x - p.x, T.z - p.z), err = wrap(aim - skis.yaw);
    let allowed = Infinity;
    for (let j = st.i; j < P.length && cum[j] - sNow < 45; j++) allowed = Math.min(allowed, Math.sqrt(P[j].v ** 2 + 2 * ab * Math.max(0, cum[j] - sNow)));
    const onArc = P[st.i].arc && !P[st.i].first;
    if (skis.v > allowed + 0.3 && !onArc && Math.abs(err) < 0.3) return { yaw: skis.yaw + Math.PI };
    if (skis.v > allowed) return Math.abs(err) > 0.08 ? { yaw: skis.yaw + Math.sign(err) * 1.5 } : null;
    return { yaw: aim };
  };
};
// On the skis at the start line, E: Eslövrundan's countdown; the pilot (if any) from KÖR!.
async function enterTrial(T, pilot = null) {
  const s0 = await T.ev(() => { const g = __game, k = g.skis, a = k.startSpot(); return a; });
  await T.ev((a) => { const g = __game, p = g.player, k = g.skis; p.state = 'normal'; p.teleport(a.x + 0.6, a.z + 0.8, Math.PI); k.yaw = Math.PI; k.v = k.vSet = 0; k.px = p.x; k.pz = p.z; g.cam.yaw = Math.PI; g.cam.snapNext = true; }, s0);
  if (pilot) await T.ev(installSkiPilot, pilot);
  await T.frames(4);
  const pr = await prompt(T);
  await T.tap('KeyE');
  await T.until(() => !!__game.skis.trial, 3000);
  return pr;
}
const trialDone = (T, after, timeout = 150000) => T.until((a) => __game.skis.last?.kind === 'trial' && __game.skis.last.at > a, timeout, after);
// Lend the skis at once (the skier at his rest, Stig beside him).
async function borrow(T) {
  const l = await T.L('eslovVag');
  await T.ev((x, z) => __game.debugWarp(x + 2.6, z + 1.5, -Math.PI / 2), l.x, l.z);
  await T.until(() => __game.eslov.mode === 'rest', 60000);
  await T.ev(() => { const g = __game, p = g.player, n = g.npc('eslov'); p.teleport(n.x + 1.8, n.z + 0.6, -Math.PI / 2); });
  await T.frames(3);
  await T.tap('KeyE');
  await T.until(() => __game.skis.on, 3000);
}

export const SCENARIOS = {
  async skidor(T) {
    // 0. Before Pepes Bodega (index 8): at his rest E is still "Heja Eslöv!", and no loan.
    await T.fresh('&mission=8');
    let l = await T.L('eslovVag');
    await T.ev((x, z) => __game.debugWarp(x + 2.2, z + 1, -Math.PI / 2), l.x, l.z);
    await T.until(() => __game.eslov.mode === 'rest', 60000);
    await T.frames(4);
    const p8 = await prompt(T);
    T.log('before the bodega', p8);
    check(p8 === 'E Heja Eslöv!' && !(await T.ev(() => __game.skis.canLend())), `no loan before the bodega (${p8})`);

    // 1. After it (index 9): Stig waiting at his place brings him back from the north leg, and he
    //    stays standing there.
    await T.fresh('&mission=9');
    l = await T.L('eslovVag');
    await T.ev((x, z) => __game.debugWarp(x + 30, z, 0), l.x, l.z);
    await T.until(() => { const e = __game.eslov; return e.mode === 'ski' && e.s > 8 && e.s < 30; }, 60000);
    await T.ev((x, z) => __game.debugWarp(x + 2.6, z + 1.5, -Math.PI / 2), l.x, l.z);
    const back0 = await T.ev(() => __game.time);
    await T.until(() => __game.eslov.mode === 'rest', 30000);
    const backT = await T.ev((t0) => __game.time - t0, back0);
    await T.sleep(8000);
    let s = await st(T);
    T.log('waiting', backT.toFixed(1), JSON.stringify(s));
    check(s.skier.mode === 'rest' && Math.hypot(s.skier.x - l.x, s.skier.z - l.z) < 1.6 && backT < 20, `he came back to his place and stays (${backT.toFixed(1)} s, ${JSON.stringify(s.skier)})`);

    // 2. The loan: E beside him at rest. Stig's ask, his yes, the hint; Stig on the skis with the
    //    bib, the skier without them at the lane's edge.
    await said0(T);
    await T.ev(() => { const g = __game, p = g.player, n = g.npc('eslov'); p.teleport(n.x + 1.8, n.z + 0.6, -Math.PI / 2); g.cam.yaw = p.yaw; g.cam.snapNext = true; });
    await T.frames(4);
    const p9 = await prompt(T);
    await T.tap('KeyE');
    await T.sleep(2200);
    let sd = await said(T);
    s = await st(T);
    const toast = await T.ev(() => [...document.querySelectorAll('#toasts .toast')].map((t) => t.textContent).join(' | '));
    T.log('lend', p9, JSON.stringify(sd), JSON.stringify(s), toast);
    check(p9 === 'E Får jag låna skidorna?', `the loan's prompt (${p9})`);
    check(has(sd, 'stig', 'Får jag… låna dem en liten stund?') && has(sd, 'eslov', 'Ta dem du. Men håll dig på asfalten.'), 'the ask and his yes');
    check(s.on && s.ski && !s.skier.ski && s.skier.mode === 'lent' && /broms finns inte/.test(toast), 'Stig on the skis, the skier without');
    const stand = await T.ev(() => { const n = __game.npc('eslov'); return { x: n.x, z: n.z }; });
    check(Math.hypot(stand.x - (l.x - 2.4), stand.z - (l.z + 0.4)) < 0.4, `he stands at the lane's edge (${JSON.stringify(stand)})`);
    await T.ev(() => { const g = __game, p = g.player, n = g.npc('eslov'); p.teleport(n.x + 1.6, n.z - 1.4, -2.2); g.cam.yaw = p.yaw; });
    await T.frames(5);
    await T.ev(() => { const g = __game, p = g.player, n = g.npc('eslov'), mx = (n.x + p.x) / 2, mz = (n.z + p.z) / 2; g.cam.cutTo({ x: mx + 4.4, y: p.y + 1.6, z: mz - 3.2 }, { x: mx, y: p.y + 1.0, z: mz }); });
    await T.shot('skidor_lan');
    await release(T);
    check(await T.ev(() => !__game.glide.allowed()), 'no glide on the skis');
    // The lane's kerb cut to the z −120 road (paint: its asphalt over the sidewalk).
    await T.ev((x, z) => { __game.cam.cutTo({ x: x + 7, y: 7, z: z + 15 }, { x, y: 0, z: z + 8 }); }, l.x, l.z);
    await T.shot('skidor_kantstensovergang');
    await release(T);

    // 3. Asphalt: the z -120 road east from x -270. Poling, the speed and how slow it comes; rolling;
    //    ploughing.
    await place(T, -265, -118, Math.PI / 2, 0);
    await steer(T, Math.PI / 2);
    const curve = [];
    for (let k = 0; k < 7; k++) { await T.sleep(1000); curve.push((await st(T)).v); }
    s = await st(T);
    T.log('pole', JSON.stringify(curve), JSON.stringify(s));
    check(curve[1] > 5 && curve[1] < 7.5 && Math.abs(s.v - 13.2) < 0.05 && s.mode === 'pole' && s.surf === 'asphalt', `poling up to 13.2 m/s at 3.2 m/s² (${curve})`);
    await T.ev(() => { __game.cam.snapNext = true; });
    await T.frames(20);
    await T.shot('skidor_fart');
    await unsteer(T);
    let v0 = (await st(T)).v, t0 = await T.ev(() => __game.time);
    await T.sleep(2000);
    s = await st(T);
    let dv = (v0 - s.v) / (await T.ev((t0) => __game.time - t0, t0));
    T.log('roll', v0, s.v, dv.toFixed(2), s.mode);
    check(dv > 0.3 && dv < 0.6 && s.mode === 'glide', `rolling slows at 0.45 m/s² (${dv.toFixed(2)})`);
    await steer(T, -Math.PI / 2);
    v0 = s.v; t0 = await T.ev(() => __game.time);
    await T.sleep(1500);
    s = await st(T);
    dv = (v0 - s.v) / (await T.ev((t0) => __game.time - t0, t0));
    T.log('plog', v0, s.v, dv.toFixed(2), s.mode, s.yaw);
    check(dv > 2.7 && dv < 3.4 && s.mode === 'wobble' && Math.abs(s.yaw - Math.PI / 2) < 0.05, `ploughing slows at about 3 m/s², straight on (${dv.toFixed(2)})`);

    // 4. Wide turns: at 13 m/s a quarter turn takes the road's width and more.
    await place(T, -265, -118, Math.PI / 2, 13.2);
    await steer(T, Math.PI);
    await T.sleep(1200);
    s = await st(T);
    T.log('turn', JSON.stringify(s));
    check(Math.abs(s.yaw - Math.PI / 2) > 0.5 && Math.abs(s.yaw - Math.PI / 2) < 0.9, `a wide turn at speed (yaw ${s.yaw})`);
    await unsteer(T);

    // 5. The sidewalk: he wobbles at 2.2 m/s, arms up.
    await place(T, -150, -127.3, Math.PI / 2, 0);
    await steer(T, Math.PI / 2);
    await T.sleep(2500);
    s = await st(T);
    T.log('kerb', JSON.stringify(s));
    check(s.surf === 'kerb' && s.v <= 2.2 && s.v > 1.9 && s.mode === 'wobble', `the sidewalk: a wobble at 2.2 m/s (${JSON.stringify(s)})`);
    await cut(T, 0.7, 4.2, 1.5);
    await T.shot('skidor_trottoar');
    await release(T);

    // 6. A kerb at speed: down, up again, the heat.
    await said0(T);
    await place(T, -150, -117, Math.PI, 10);
    await steer(T, Math.PI);
    await T.until(() => __game.skis.last?.kind === 'fall', 5000);
    let f = await T.ev(() => __game.skis.last);
    await T.until(() => __game.player.state === 'down', 5000);
    await cut(T, 1.6, 4.5, 1.4);
    await T.shot('skidor_kantsten');
    await release(T);
    await upAgain(T);
    sd = await said(T);
    T.log('kerb fall', JSON.stringify(f), JSON.stringify(sd));
    check(f.fall === 'kerb' && f.v > 7, `a fall off the kerb (${JSON.stringify(f)})`);
    check(has(sd, 'stig', 'Det måste vara värmen.') || has(sd, 'stig', 'Det är kombinationen av sol och…'), 'up again, the heat');
    // Slower than 7 m/s onto it: no fall, he slows to the wobble.
    await place(T, -140, -123, Math.PI, 6);
    await unsteer(T);
    await T.sleep(1800);
    s = await st(T);
    check(s.state === 'normal' && s.surf === 'kerb' && !s.fallen, `onto the kerb at 6 m/s: no fall (${JSON.stringify(s)})`);

    // 7. Sand: on his back, the skis in the air. "Jaha… de rullar visst inte på sand."
    await said0(T);
    await place(T, -80, 228, 0, 3);
    await steer(T, 0);
    await T.until(() => __game.player.state === 'down', 5000);
    f = await T.ev(() => __game.skis.last);
    await T.sleep(400);
    await T.ev(() => { const g = __game, p = g.player; g.cam.cutTo({ x: p.x + 4.2, y: p.y + 1.5, z: p.z + 1.2 }, { x: p.x, y: p.y + 0.4, z: p.z + 0.4 }); });
    await T.shot('skidor_sand');
    await release(T);
    await upAgain(T);
    sd = await said(T);
    T.log('sand', JSON.stringify(f), JSON.stringify(sd));
    check(f.fall === 'sand' && has(sd, 'stig', 'Jaha… de rullar visst inte på sand.'), 'sand: down, and his line');
    // On the sand he can only shuffle out, at 1 m/s, without falling again.
    await T.sleep(2500);
    s = await st(T);
    check(s.state === 'normal' && s.surf === 'sand' && s.v <= 1.0 && s.v > 0.8, `a shuffle on the sand (${JSON.stringify(s)})`);

    // 8. A parked car at speed: the wall rule.
    await unsteer(T);
    await T.ev(() => { const g = __game, car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && c.spec.len < 5); car.place(-150, -117.5, Math.PI / 2); car.vx = car.vz = 0; window.__car = car; });
    await place(T, -170, -117.5, Math.PI / 2, 10);
    await steer(T, Math.PI / 2);
    await T.until(() => __game.skis.last?.kind === 'fall' && __game.skis.last.t > __game.time - 3, 5000);
    f = await T.ev(() => __game.skis.last);
    T.log('car', JSON.stringify(f));
    check(f.fall === 'wall', `into a car: down (${JSON.stringify(f)})`);
    await upAgain(T);
    await T.ev(() => { window.__car.place(-190, -150, 0); });

    // 9. A person at speed: bowled over, SKANDAL, and he is down too.
    const sh0 = await T.ev(() => __game.shame.v);
    // A pedestrian held standing on the road ahead of him.
    await T.ev(() => {
      const g = __game, ped = g.peds.find((q) => q.char.state === 'normal');
      window.__ped = ped;
      const hold = () => { if (ped.char.state !== 'normal') { g.offFrame(hold); return; } ped.char.x = -137; ped.char.z = -117.5; ped.char.vx = ped.char.vz = 0; };
      g.onFrame(hold);
    });
    await place(T, -142, -117.5, Math.PI / 2, 9);
    await steer(T, Math.PI / 2);
    await T.until(() => __game.skis.last?.kind === 'fall' && __game.skis.last.fall === 'person', 5000);
    const ped = await T.ev(() => window.__ped.char.state);
    const sh1 = await T.ev(() => __game.shame.v);
    T.log('person', ped, sh0, sh1);
    check((ped === 'flung' || ped === 'down') && sh1 > sh0, `the pedestrian is bowled over, SKANDAL (${ped}, ${sh0} -> ${sh1})`);
    await upAgain(T);

    // 10. "Heja Eslöv!": a Swedish tourist by the road as he passes at speed; Stig puts him right.
    await said0(T);
    await T.ev(() => { __game.skis.hejaT = -Infinity; __game.skis.hejaBy.clear(); });   // someone above may have cheered
    await T.ev(() => {
      const g = __game, ped = g.peds.find((q) => !q.char.def.local && q.char.state === 'normal');
      window.__sv = ped;
      ped.char.teleport(-60, -126.5, 0);
      const hold = () => { if (ped.char.state !== 'normal' || g.player.x > -50) { g.offFrame(hold); return; } ped.char.x = -60; ped.char.z = -126.5; ped.char.vx = ped.char.vz = 0; };
      g.onFrame(hold);
    });
    await place(T, -90, -118, Math.PI / 2, 12);
    await steer(T, Math.PI / 2);
    await T.sleep(3800);
    sd = await said(T);
    T.log('heja', JSON.stringify(sd), JSON.stringify(await T.ev(() => __game.skis.last)));
    check(has(sd, 'ped', 'Heja Eslöv!') && has(sd, 'stig', 'Jag är från Stockholm, egentligen…'), 'a tourist cheers, Stig puts him right');
    // Berra too, by a road.
    await said0(T);
    await T.ev(() => { __game.skis.hejaT = -Infinity; });
    const berraWas = await T.ev(() => { const g = __game, b = g.npcs.berra, w = { x: b.x, z: b.z, yaw: b.yaw, busy: b.busy }; b.busy = true; b.teleport(-20, -126.5, Math.PI); return w; });
    await place(T, -45, -118, Math.PI / 2, 12);
    await steer(T, Math.PI / 2);
    await T.sleep(3500);
    sd = await said(T);
    await T.ev((w) => { const b = __game.npcs.berra; b.teleport(w.x, w.z, w.yaw); b.busy = w.busy; }, berraWas);
    T.log('berra', JSON.stringify(sd));
    check(has(sd, 'berra', 'Heja Eslöv!') && has(sd, 'stig', 'Jag är från Stockholm, egentligen…'), 'Berra cheers, Stig puts him right');
    await unsteer(T);
    await place(T, -10, -118, Math.PI / 2, 0);

    // 11. On the skis E is only theirs, a mission's giver and the cars: no talk with the gang.
    const chat = await T.ev(() => {
      const g = __game, out = {};
      for (const k of Object.keys(g.chat.cfg.people)) {
        const n = g.npcs[k];
        if (!n || n.state !== 'normal' || n.busy) continue;
        const p = g.player, k0 = g.skis;
        p.teleport(n.x + 1.4, n.z, -Math.PI / 2);
        k0.px = p.x; k0.pz = p.z;
        k0.on = false; const off = g.nearestInteractable()?.type ?? null;
        k0.on = true; const on = g.nearestInteractable()?.type ?? null;
        if (off === 'chat') return { who: k, off, on };
        out[k] = { off, on };
      }
      return out;
    });
    T.log('filter', JSON.stringify(chat));
    check(chat.off === 'chat' && chat.on !== 'chat', `no gang talk on the skis (${JSON.stringify(chat)})`);

    // 12. Back at the skier: E, Stig's thanks and his line on the sand; he has them on again.
    const l2 = await T.L('eslovVag');
    await T.ev(() => { const g = __game, p = g.player, n = g.npc('eslov'); p.teleport(n.x + 1.6, n.z - 0.4, -Math.PI / 2); g.skis.px = p.x; g.skis.pz = p.z; g.cam.yaw = p.yaw; g.cam.snapNext = true; });
    await said0(T);
    await T.frames(4);
    const pb = await prompt(T);
    await T.tap('KeyE');
    await T.sleep(1800);
    sd = await said(T);
    s = await st(T);
    T.log('back', pb, JSON.stringify(sd), JSON.stringify(s));
    check(pb === 'E Lämna tillbaka skidorna', `the prompt to give them back (${pb})`);
    check(has(sd, 'stig', 'Tack för lånet!') && has(sd, 'eslov', 'Sand är inget för rullskidor.'), 'his thanks and the skier\'s line about the sand');
    check(!s.on && !s.ski && s.skier.ski && s.skier.mode === 'rest' && (await T.ev(() => __game.player.faceWish)), 'Stig on foot, the skier with his skis');
    await T.until(() => __game.eslov.mode === 'ski', 30000).catch(() => {});
    await T.ev(() => { const p = __game.player; p.teleport(p.x + 25, p.z, 0); });
    await T.until(() => __game.eslov.mode === 'ski', 30000);

    // 13. They go back by themselves: into a car, a SKANDAL pursuit, a mission's start.
    async function lendAgain() {
      await T.ev((x, z) => __game.debugWarp(x + 2.6, z + 1.5, -Math.PI / 2), l2.x, l2.z);
      await T.until(() => __game.eslov.mode === 'rest', 40000);
      await T.ev(() => { const g = __game, p = g.player, n = g.npc('eslov'); p.teleport(n.x + 1.8, n.z + 0.6, -Math.PI / 2); });
      await T.frames(3);
      await T.tap('KeyE');
      await T.until(() => __game.skis.on, 3000);
    }
    await lendAgain();
    await T.ev(() => { const g = __game, p = g.player, car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && c.spec.len < 5); car.place(p.x + 3, p.z + 4, 0); window.__car = car; });
    await T.ev(() => __game.enterCar(window.__car));
    await T.frames(5);
    let k = await T.ev(() => ({ last: __game.skis.last, on: __game.skis.on, ski: __game.player.anim.ski, skier: __game.npc('eslov').anim.ski }));
    T.log('car', JSON.stringify(k));
    check(!k.on && !k.ski && k.skier && k.last.kind === 'back' && k.last.by === 'car', 'into a car: they are his again');
    await T.ev(() => { const g = __game, c = g.playerCar; g.exitCar(true); c.place(-196, -170, 0); });
    await lendAgain();
    await T.ev(() => __game.shame.startPursuit());
    await T.frames(5);
    k = await T.ev(() => ({ last: __game.skis.last, on: __game.skis.on }));
    check(!k.on && k.last.by === 'pursuit', `a pursuit: back (${JSON.stringify(k)})`);
    await T.ev(() => __game.shame.endPursuit(false));
    await T.until(() => !__game.shame.pursuit, 5000);
    await T.ev(() => { __game.shame.v = 0; });
    await lendAgain();
    await T.startMission();
    k = await T.ev(() => ({ last: __game.skis.last, on: __game.skis.on, ski: __game.player.anim.ski }));
    s = await st(T);
    T.log('mission', JSON.stringify(k), JSON.stringify(s));
    check(!k.on && !k.ski && k.last.by === 'mission', 'a mission: back');
    check(s.skier.ski && s.skier.mode === null && Math.hypot(s.skier.x - l2.x, s.skier.z - l2.z) < 0.3, `the skier at his place with them in the mission (${JSON.stringify(s.skier)})`);
  },

  async eslovrundan(T) {
    await T.fresh('&mission=9');
    await borrow(T);
    // 1. The prompt at the start line, the countdown, the card.
    let pr = await enterTrial(T, {});
    await T.until(() => __game.skis.trial?.placed && __game.skis.trial.count <= 2, 8000);
    await T.shot('rundan_nedrakning');
    await T.until(() => __game.skis.trial?.t0 != null, 6000);
    await T.sleep(2500);
    const card = await T.ev(() => ({ title: document.querySelector('.obj-title').textContent, text: document.querySelector('.obj-text').textContent, bar: document.querySelector('.obj-bar-label')?.textContent }));
    T.log('card', pr, JSON.stringify(card));
    check(pr === 'E Eslövrundan – ett varv på skidor', `the start line's prompt (${pr})`);
    check(card.title === 'ESLÖVRUNDAN' && /^Tid 0:0[1-3],\d · att slå: \d:\d\d,\d och \d:\d\d,\d$/.test(card.text) && card.bar === 'KONTROLL 0/5', `the card (${JSON.stringify(card)})`);
    await T.sleep(4000);
    await T.shot('rundan_aker');
    // 2. A clean run: first place, the prize, the record, the result list.
    const coins0 = await T.ev(() => __game.coins);
    let t0 = await T.ev(() => __game.time);
    await said0(T);
    await trialDone(T, t0 - 20);
    let r = await T.ev(() => __game.skis.last);
    await T.sleep(600);
    const list = await T.ev(() => ({ show: document.getElementById('results').classList.contains('show'), title: document.querySelector('.res-title').textContent,
      rows: [...document.querySelectorAll('.res-row')].map((e) => e.textContent), me: document.querySelector('.res-row.me')?.textContent, caption: document.querySelector('.res-caption').textContent,
      coins: __game.coins, rec: __game.records.eslovSkidor, falls: window.__skiPilot.falls }));
    T.log('clean', JSON.stringify(r), JSON.stringify(list));
    await T.shot('rundan_resultat');
    check(r.result === 'done' && r.place === 1 && r.falls === 0, `a clean run is first (${JSON.stringify(r)})`);
    check(list.show && list.title === 'ESLÖVRUNDAN · RESULTAT' && list.rows.length === 3 && /^1\.Stig-Helmer/.test(list.rows[0]) && list.caption === 'Stig-Helmer leder efter första åket.', `the result list (${JSON.stringify(list)})`);
    check(list.coins >= coins0 + 100 && list.rec === r.t, 'the prize and the record');
    const by = await T.ev((t) => __game.skis.cfg.trial.times[0] - t, r.t);
    T.log('won by', by.toFixed(2), 's');
    check(by > 1 && by < 4, `a clean run beats his best by a few seconds (${by.toFixed(2)} s)`);
    await T.sleep(1500);
    let sd = await said(T);
    check(has(sd, 'eslov', 'Där rök mitt pers! På mina egna skidor.'), `his line (${JSON.stringify(sd)})`);
    // 3. One fall: second, "efter andra åket"; two: third, "efter tredje åket".
    for (const [fallAt, place, cap0, line] of [[[2], 2, 'Stig-Helmer ligger tvåa efter andra åket.', 'Inte illa för en stockholmare!'],
      [[2, 4], 3, 'Stig-Helmer ligger trea efter tredje åket.', 'Nästa åk går bättre.']]) {
      await T.until(() => __game.skis.v < 0.5 && __game.player.state === 'normal', 20000);
      await enterTrial(T, { fallAt });
      t0 = await T.ev(() => __game.time);
      await said0(T);
      await trialDone(T, t0 - 1);
      r = await T.ev(() => __game.skis.last);
      const cap = await T.ev(() => document.querySelector('.res-caption').textContent);
      await T.sleep(1600);
      sd = await said(T);
      T.log('falls', fallAt.length, JSON.stringify(r), cap, JSON.stringify(sd));
      check(r.result === 'done' && r.place === place && r.falls === fallAt.length && cap === cap0, `${fallAt.length} fall(s): place ${place} (${JSON.stringify(r)} ${cap})`);
      check(has(sd, 'eslov', line), `his line (${JSON.stringify(sd)})`);
      if (place === 3) await T.shot('rundan_trea');
    }
    // 4. R ends it, and so does a car (the skis go back too).
    await T.until(() => __game.skis.v < 0.5 && __game.player.state === 'normal', 20000);
    await enterTrial(T);
    await T.until(() => __game.skis.trial?.t0 != null, 8000);
    await T.ev(() => { __game.skis.auto = () => ({ yaw: Math.PI }); });
    await T.sleep(1500);
    t0 = await T.ev(() => __game.time);
    await T.tap('KeyR');
    await trialDone(T, t0 - 0.5, 5000);
    r = await T.ev(() => __game.skis.last);
    check(r.result === 'abort', `R ends Eslövrundan (${JSON.stringify(r)})`);
    await T.ev(() => { __game.skis.auto = null; });
    await enterTrial(T);
    await T.until(() => __game.skis.trial?.t0 != null, 8000);
    t0 = await T.ev(() => __game.time);
    await T.ev(() => { const g = __game, p = g.player, car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && c.spec.len < 5); car.place(p.x + 2.5, p.z, 0); g.enterCar(car); });
    await T.frames(5);
    const k = await T.ev(() => ({ trial: __game.skis.trial, on: __game.skis.on, last: __game.skis.last }));
    check(!k.trial && !k.on && k.last.kind === 'back', `a car ends it and takes the skis back (${JSON.stringify(k)})`);
    check(await T.ev(() => !__game.skis.objective()), 'no card after it');
  },

  async eslovrundankal(T) {
    // The measurement (DESIGN §8 "Races and chases" and "Timers and difficulty", §10.39): the pilot
    // rides Eslövrundan ESLOVRUNDAN_RUNS times (default 3) clean, as many with one fall (halfway
    // along the z −200 road) and as many with two (and halfway along the z −120 road). T_ref = the
    // median clean run, T_1 and T_2 the medians with one and two falls. His best (`pers`) is a
    // race's: ceil((T_ref + T_1) / 2), so a clean run wins by a few seconds and one fall loses it;
    // today's (`i dag`) a drive's timer: ceil(1.2 × T_ref), a clean run keeps about 17 % of it, and
    // it must lie between T_1 and T_2 (one fall is second, two are third). A run knocked over by
    // anything else (traffic) does not count. The raw times go into notes/calibration-samples.md
    // (`eslovRundan`, a race's times, not a timer pool).
    const N = +(process.env.ESLOVRUNDAN_RUNS || 3);
    const kinds = { clean: [], one: [2], two: [2, 4] }, runs = { clean: [], one: [], two: [] };
    let shipped = null;
    for (const kind of Object.keys(kinds)) for (let n = 0; n < N; n++) {
      await T.fresh('&mission=9&ts=1');
      await borrow(T);
      shipped = await T.ev(() => __game.skis.cfg.trial.times.slice());
      await T.ev(() => { const g = __game, k = g.skis; k.cfg.trial.cap = 600; window.__knocks = 0; let was = 'normal'; g.onFrame(() => { const s = g.player.state; if (k.trial?.t0 != null && s === 'flung' && was !== 'flung') window.__knocks++; was = s; }); });
      await enterTrial(T, { fallAt: kinds[kind] });
      const t0 = await T.ev(() => __game.time);
      await trialDone(T, t0 - 1);
      const r = await T.ev(() => ({ ...__game.skis.last, knocks: window.__knocks }));
      r.clean = r.falls === kinds[kind].length && r.knocks === r.falls;
      T.log('eslovrundankal run', kind, n, JSON.stringify(r));
      check(r.result === 'done', `run ${kind} ${n}: done (${JSON.stringify(r)})`);
      runs[kind].push(r);
    }
    const med = (k) => { const ts = runs[k].filter((r) => r.clean).map((r) => r.t); return ts.length ? pct(ts, 0.5) : NaN; };
    const tRef = med('clean'), t1 = med('one'), t2 = med('two'), pers = Math.ceil((tRef + t1) / 2), idag = Math.ceil(1.2 * tRef);
    const raw = (k) => runs[k].map((r) => `${r.t.toFixed(2)}${r.clean ? '' : '*'}`).join(' ');
    T.log(`CAL eslovRundan | Eslövrundan on the skis (measured) | ski pilot | clean ${raw('clean')} → T_ref ${tRef.toFixed(2)} | one fall ${raw('one')} → T_1 ${t1.toFixed(2)} | two falls ${raw('two')} → T_2 ${t2.toFixed(2)} | pers ceil((T_ref + T_1) / 2) = ${pers}, i dag ceil(1.2 × T_ref) = ${idag}`);
    T.log(`CAL CHECK eslovRundan: shipped ${shipped.join(' ')}, this sample ${pers} ${idag}: ${shipped[0] === pers && shipped[1] === idag ? 'OK' : 'DIFFERS'}; clean wins by ${(pers - tRef).toFixed(1)} s, one fall loses by ${(t1 - pers).toFixed(1)} s and is second by ${(idag - t1).toFixed(1)} s, two falls third by ${(t2 - idag).toFixed(1)} s`);
    check(tRef < pers && pers < t1 && t1 < idag && idag < t2, 'the order: clean < pers < one fall < i dag < two falls');
  },
};
