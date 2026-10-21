// Liv på torget – siesta och paseo (free roam, DESIGN §10.62; feature 135): torg, torgshots.
//   torg:      at index 9 (free roam, the clock held at 15:00: the siesta). The places: nine vendors, six
//              plaza seats (four on its benches, two on the fountain's rim), three on the church square's
//              benches, its standing pair, eight paseo walkers; 27 covers (22 stalls and the five fruit
//              stalls; not stall K or the souvenir stand). At the siesta every cover is down with its
//              SIESTA board, the two dozing vendors sit slumped on their crates before their stalls and no
//              vendor stands; the souvenir seller is out. At 10:00 the covers roll up and the nine vendors
//              stand at their spots; Stig on foot in front of one: a call (his own or a generic one), the
//              next vendor at once nothing (the gap), later one again. A kick bowls a vendor over (SKANDAL
//              as a pedestrian's) and he walks back to his spot; his car knocks one over. The bells at 13:00
//              (the clock running): the peal, the toast, the covers rolling down one after another, the
//              vendors gone unseen and the two dozers on their crates. The plaza at 15:00: six sitters
//              seated; a kick knocks a rim sitter off (SKANDAL), he gets up and sits down again; a kick at
//              a bench sitter smashes the bench, throws both sitters off (no SKANDAL of theirs) and they
//              are put away unseen; his car knocks a bench sitter off (no bench broken: cars ride over
//              it). The paseo at 19:30: eight walkers in pairs on their radii, going round clockwise; a
//              bench sitter's "Suecos…" at Stig. The church at 11:00: three seated, the pair standing,
//              "¡Buenos días!"; at 14:00 "¡Buenas tardes!". The souvenir seller's giraffe: nothing before
//              julafton; after it his line with the giraffe up, Stig's own up with "Tack, jag har redan
//              en.", both down; not again that visit. At night (02:00) the covers' CERRADO · STÄNGT and
//              nobody. A mission start: every body, cover and crate away at once and nothing in the mission.
//   torgshots: the idea's pictures: the market from the south at the siesta and open, its hours board, a dozing vendor,
//              the covers' boards, the giraffe exchange, the plaza's sitters, the paseo in the sunset, the
//              church's locals and the night market.
import { check } from '../lib.mjs';

const PI = Math.PI;
const B = (i, j) => ({ x: -280 + 40 + 80 * i, z: -280 + 40 + 80 * j });   // landmarks-island.js blockCentre
const M = B(2, 1), P = B(2, 3), K = B(3, 1);

async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js');
    window.__said = []; window.__toasts = [];
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.torg ? `${t.torg.kind}:${t.torg.i}` : t?.key || 'x', text, +g.time.toFixed(2)]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(String(text).replace(/<[^>]+>/g, '')); return toast(text, ...a); };
  });
}
const said = (T) => T.ev(() => window.__said.slice());
const toasts = (T) => T.ev(() => window.__toasts.slice());
const clearLog = (T) => T.ev(() => { window.__said.length = 0; window.__toasts.length = 0; });
const cfg = (T) => T.ev(async () => (await import('/src/content/index.js')).TORG);
const clearPeds = (T) => T.ev((pts) => {
  __game.peds.forEach((ped) => { if (pts.some(([x, z]) => Math.hypot(ped.char.x - x, ped.char.z - z) < 90)) ped.char.teleport(250, 250); });
}, [[M.x, M.z], [P.x, P.z], [K.x, K.z]]);
async function stand(T, x, z, yaw, cam = 0) {
  await T.ev((x, z, yaw, cam) => {
    const g = __game, p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    g.debugWarp(x, z, yaw);
    p.vx = p.vz = 0;
    g.cam.yaw = yaw + cam; g.cam.snapNext = true;
  }, x, z, yaw, cam);
  await T.frames(8);
}
// Somewhere else first (a cut when he comes back: bodies may pop in view for a moment).
async function cutTo(T, x, z, yaw, cam = 0) {
  await stand(T, x + 40, z + 40, yaw);
  await stand(T, x, z, yaw, cam);
}
const frame = (T, eye, at) => T.ev((a, b) => __game.cam.cutTo(a, b), eye, at);
const release = (T) => T.ev(() => { const g = __game; g.cam.release(); g.cam.snapNext = true; });
const look = (T, yaw) => T.ev((yaw) => { const g = __game; g.cam.yaw = yaw; g.cam.snapNext = true; }, yaw);
const sh = (T) => T.ev(() => +__game.shame.v.toFixed(2));
const st = (T) => T.ev(() => {
  const t = __game.torg;
  return { shown: t.snapshot(), counts: { ...t.counts }, last: t.last, covers: t.covers?.map((c) => ({ k: +c.k.toFixed(2), vis: c.mesh.visible, si: c.sign?.siesta.visible ?? null, cl: c.sign?.closed.visible ?? null })), on: t.on, gir: t.gir };
});
const rec = (T, i) => T.ev((i) => { const r = __game.torg.recs[i]; return { i, kind: r.kind, group: r.group, x: r.x, z: r.z, yaw: r.yaw, seat: r.seat && { x: r.seat.x, z: r.seat.z, y: r.seat.y, yaw: r.seat.yaw, front: r.seat.front, prop: !!r.seat.prop }, as: r.as, state: r.ch?.state ?? null }; }, i);
const body = (T, i) => T.ev((i) => { const r = __game.torg.recs[i], ch = r.ch; return ch && { as: r.as, state: ch.state, x: +ch.x.toFixed(2), z: +ch.z.toFixed(2), y: +ch.y.toFixed(2), stale: r.stale, slump: !!ch.anim.slump }; }, i);
const setHour = (T, h) => T.ev((h) => __game.day.set(h), h);
const byKind = (s, k, as) => s.shown.filter((b) => b.kind === k && (!as || b.as === as));
// His car (a small hire car, entered on the spot) at (x, z) facing yaw, at rest.
const drive = (T, x, z, yaw) => T.ev((x, z, yaw) => {
  const g = __game, p = g.player;
  let car = g.playerCar;
  if (!car) {
    car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && !c.spec.pigs && !c.spec.toy && c.spec.len < 5 && !c.name);
    car.place(x, z, yaw);
    p.teleport(x + Math.cos(yaw) * 2, z - Math.sin(yaw) * 2, yaw);
    g.enterCar(car);
  }
  car.place(x, z, yaw);
  car.vx = car.vz = 0;
  g.cam.yaw = yaw; g.cam.snapNext = true;
}, x, z, yaw);
const go = (T, v) => T.ev((v) => { const c = __game.playerCar; c.vx = Math.sin(c.yaw) * v; c.vz = Math.cos(c.yaw) * v; }, v);
const brake = (T) => T.ev(() => { const c = __game.playerCar; if (c) { c.vx *= 0.1; c.vz *= 0.1; c.ctrl.throttle = 0; } });

async function setup(T, index = 9) {
  await T.fresh(`&mission=${index}`);
  await spies(T);
  await T.sleep(1200);
  check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');
  await clearPeds(T);
}

export const SCENARIOS = {
  async torg(T) {
    const c = await cfg(T);
    await setup(T);

    // 0. The places.
    await stand(T, M.x, M.z + 26, PI);
    await T.sleep(600);
    const recs = await T.ev(() => { const t = __game.torg, n = {}; for (const r of t.recs) n[`${r.group}:${r.kind}`] = (n[`${r.group}:${r.kind}`] || 0) + 1; return { n, covers: t.covers.length, fruit: t.covers.filter((c) => c.prop).length, seatsFound: t.recs.filter((r) => r.kind === 'seat' && r.seat.prop).length }; });
    T.log('places', JSON.stringify(recs));
    check(recs.n['market:vendor'] === 9 && recs.n['plaza:seat'] === 6 && recs.n['kyrka:seat'] === 3 && recs.n['kyrka:stand'] === 2 && recs.n['plaza:walker'] === 8, 'nine vendors, six plaza seats, three church seats, the pair, eight walkers');
    check(recs.seatsFound === 7, `every bench seat on its bench (${recs.seatsFound} of 7)`);
    check(recs.covers === 27 && recs.fruit === 5, `27 covers, the five fruit stalls among them (${recs.covers}, ${recs.fruit})`);
    const K0 = await T.ev((M) => __game.torg.covers.filter((c) => Math.hypot(c.mesh.position.x - (M.x - 12), c.mesh.position.z - (M.z - 5.7)) < 1.5 || Math.hypot(c.mesh.position.x - (M.x + 6), c.mesh.position.z - M.z) < 2).length, M);
    check(K0 === 0, 'no cover on stall K or the souvenir stand');

    // 1. The siesta (15:00).
    await T.sleep(4500);
    let s = await st(T);
    T.log('siesta', JSON.stringify({ shown: s.shown.map((b) => [b.i, b.kind, b.as, b.state, b.slump]), covers: s.covers.map((x) => x.k).join('') }));
    check(s.covers.every((x) => x.k === 1 && x.vis), 'every cover down at the siesta');
    check(s.covers.filter((x) => x.si !== null).every((x) => x.si && !x.cl), 'the boards read SIESTA');
    const dozers = byKind(s, 'vendor');
    check(dozers.length === 2 && dozers.every((b) => b.as === 'doze' && b.state === 'seated' && b.slump && Math.abs(b.y - 0.60) < 0.01), `the two dozers on their crates (${JSON.stringify(dozers)})`);
    check(await T.ev(() => { const s = __game.npc('souvenir'); return s.state === 'normal' && s.root.visible; }), 'the souvenir seller is out');
    check(await T.ev(() => __game.torg.recs.filter((r) => r.crate).every((r) => r.crate.mesh.visible)), 'the crates are out');

    // 2. Open (10:00): the covers up, the vendors at their stalls.
    await setHour(T, 10);
    await cutTo(T, M.x, M.z + 2, PI);
    await T.sleep(5000);
    s = await st(T);
    T.log('open', JSON.stringify({ shown: byKind(s, 'vendor').map((b) => [b.i, b.as, b.state]), covers: s.covers.map((x) => x.k).join('') }));
    check(s.covers.every((x) => x.k === 0 && !x.vis), 'every cover rolled up');
    const vendors = byKind(s, 'vendor', 'stand');
    check(vendors.length === 9 && vendors.every((b) => b.state === 'normal'), `nine vendors standing (${vendors.length})`);
    for (const b of vendors) { const r = await rec(T, b.i); check(Math.hypot(b.x - r.x, b.z - r.z) < 0.3, `vendor ${b.i} at his spot`); }

    // 3. A call from the churros vendor (4), Stig on foot 3 m in front of him; the next at once nothing.
    const v4 = await rec(T, 4), v5 = await rec(T, 5), v0 = await rec(T, 0);
    await T.ev(() => { const t = __game.torg; t.first.market = true; t.lineT.market = -Infinity; for (const r of t.recs) r.visit = false; });
    await clearLog(T);
    await stand(T, v4.x - 0.3, v4.z + 3, PI);
    await T.until(() => __game.torg.last?.kind === 'call', 3000).catch(() => {});
    s = await st(T);
    let lines = await said(T);
    T.log('call', JSON.stringify(s.last), JSON.stringify(lines));
    check(s.last?.kind === 'call' && s.last.i === 4 && ['¡Churros!', ...c.calls].includes(s.last.text), 'the churros vendor calls');
    check(lines.some(([w, l]) => w === 'vendor:4' && l === s.last.text), 'as a bubble');
    await stand(T, v5.x + 0.3, v5.z + 3, PI);
    await T.sleep(700);
    check((await st(T)).counts.call === 1, 'the next vendor within the gap says nothing');
    await T.ev(() => { __game.torg.lineT.market = -Infinity; __game.torg.first.market = true; });
    await stand(T, v0.x, v0.z + 3, PI);
    await T.until(() => __game.torg.counts.call === 2, 3000).catch(() => {});
    check((await st(T)).counts.call === 2, 'after the gap the next one calls');

    // 4. A kick bowls a vendor over; he walks back to his spot. His car knocks one over.
    await T.ev(() => __game.shame.clear());
    await stand(T, v0.x, v0.z + 1.0, PI);
    let sh0 = await sh(T);
    await T.tap('KeyJ');
    await T.sleep(300);
    let b = await body(T, 0);
    const sh1 = await sh(T);
    T.log('kick vendor', JSON.stringify(b), sh0, '->', sh1);
    check(b.state === 'flung' || b.state === 'down', 'the vendor is bowled over');
    check(sh1 > sh0 + 5, `SKANDAL as a pedestrian's (${sh0} -> ${sh1})`);
    await stand(T, v0.x + 6, v0.z + 6, PI);
    await T.until((i) => { const r = __game.torg.recs[i], ch = r.ch; return ch.state === 'normal' && Math.hypot(ch.x - r.x, ch.z - r.z) < 0.3; }, 15000, 0).catch(() => {});
    b = await body(T, 0);
    const r0 = await rec(T, 0);
    check(b.state === 'normal' && Math.hypot(b.x - r0.x, b.z - r0.z) < 0.3, `back at his spot (${JSON.stringify(b)})`);
    await T.ev(() => __game.shame.clear());
    await drive(T, v4.x, v4.z + 11, PI);
    await T.frames(4);
    await go(T, 9);
    await T.until((i) => ['flung', 'down'].includes(__game.torg.recs[i].ch.state), 3000, 4).catch(() => {});
    b = await body(T, 4);
    T.log('car vendor', JSON.stringify(b), await sh(T));
    check(b.state === 'flung' || b.state === 'down', 'his car knocks a vendor over');
    await brake(T);
    await T.sleep(400);
    await T.ev(() => __game.exitCar(true));

    // 5. The bells at 13:00: the peal, the toast, the covers down, the vendors gone, the dozers dozing.
    await T.ev(() => __game.shame.clear());
    await setHour(T, 12.96);
    await stand(T, M.x, M.z + 2, PI);
    await clearLog(T);
    const bells0 = await T.ev(async () => (await import('/src/audio.js')).audio.bellLog || 0);
    await T.ev(() => { __game.day.run = true; });
    await T.until(() => __game.day.h >= 13.03, 15000).catch(() => {});
    await T.ev(() => { __game.day.run = false; });
    s = await st(T);
    const tl = await toasts(T), bells1 = await T.ev(async () => (await import('/src/audio.js')).audio.bellLog || 0);
    T.log('bells', JSON.stringify(s.last), JSON.stringify(tl), bells0, '->', bells1);
    check(s.counts.bells === 1 && s.last?.kind === 'bells' && s.last.hour === 13 && bells1 === bells0 + 1, 'the church peals once at 13:00');
    check(tl.includes(c.toasts[13]), 'the siesta toast in the market');
    await T.sleep(800);
    const mid = (await st(T)).covers.map((x) => x.k);
    check(mid.some((k) => k > 0) && mid.some((k) => k < 1), `the covers roll down one after another (${mid.join(',')})`);
    for (let k = 0; k < 4; k++) { await look(T, PI + PI * (k % 2)); await T.sleep(700); }
    await T.sleep(3500);
    s = await st(T);
    T.log('siesta again', JSON.stringify(byKind(s, 'vendor').map((x) => [x.i, x.as, x.state])), s.covers.map((x) => x.k).join(''));
    check(s.covers.every((x) => x.k === 1), 'every cover down');
    check(byKind(s, 'vendor').length === 2 && byKind(s, 'vendor', 'doze').length === 2, 'the vendors gone, the two dozers on their crates');

    // 6. The giraffe: not before julafton; after it the exchange, once a visit.
    const sv = await T.ev(() => { const n = __game.npc('souvenir'); return { x: n.x, z: n.z }; });
    await stand(T, sv.x, sv.z + 2.6, PI);
    await T.sleep(2500);
    check((await st(T)).counts.giraffe === 0, 'no giraffe before julafton');
    await T.ev(() => __game.unlocked.add('bodega'));
    await stand(T, sv.x, sv.z + 40, PI);
    await T.sleep(300);
    await clearLog(T);
    await stand(T, sv.x, sv.z + 2.6, PI);
    await T.until(() => !!__game.torg.gir, 3000).catch(() => {});
    const g0 = await T.ev(() => ({ gir: !!__game.torg.gir, seller: __game.npc('souvenir').anim.giraffe, posed: __game.npcPosed('souvenir') }));
    check(g0.gir && g0.seller && g0.posed, `the seller holds up a giraffe, posed (${JSON.stringify(g0)})`);
    await T.until(() => __game.player.anim.giraffe, 4000).catch(() => {});
    const g1 = await T.ev(() => ({ stig: __game.player.anim.giraffe, seller: __game.npc('souvenir').anim.giraffe }));
    check(g1.stig && g1.seller, 'Stig holds up his own');
    await T.until(() => !__game.torg.gir, 6000).catch(() => {});
    const g2 = await T.ev(() => ({ gir: !!__game.torg.gir, stig: __game.player.anim.giraffe, seller: __game.npc('souvenir').anim.giraffe }));
    lines = await said(T);
    T.log('giraffe', JSON.stringify(lines));
    check(!g2.gir && !g2.stig && !g2.seller, 'both giraffes down');
    const gl = lines.filter(([w, l]) => (w === 'souvenir' && l === c.giraffe.line) || (w === 'stig' && l === c.giraffe.stig));
    check(gl.length === 2 && gl[0][0] === 'souvenir' && gl[1][2] - gl[0][2] > 1.3 && gl[1][2] - gl[0][2] < 2.0, 'his line, Stig\'s 1.6 s later');
    await T.sleep(2000);
    check((await st(T)).counts.giraffe === 2, 'not again that visit');

    // 7. The plaza at 15:00: the sitters; a kick off the rim, back on it; a kick smashes a bench.
    await setHour(T, 15);
    await cutTo(T, P.x, P.z + 14, PI);
    await T.sleep(2000);
    s = await st(T);
    const seats = byKind(s, 'seat').filter((x) => x.group === 'plaza');
    T.log('plaza', JSON.stringify(seats.map((x) => [x.i, x.state, x.y])));
    check(seats.length === 6 && seats.every((x) => x.state === 'seated'), 'six seated on the plaza');
    const rim = await rec(T, 13);
    await T.ev(() => __game.shame.clear());
    {
      const fx = Math.sin(rim.seat.yaw), fz = Math.cos(rim.seat.yaw);
      await stand(T, rim.seat.x + fx * 1.15, rim.seat.z + fz * 1.15, rim.seat.yaw + PI);
    }
    sh0 = await sh(T);
    await T.tap('KeyJ');
    await T.sleep(300);
    s = await st(T);
    T.log('rim kick', JSON.stringify(s.last), sh0, '->', await sh(T));
    check(s.last?.kind === 'knock' && s.last.i === 13 && s.last.why === 'kick', 'the kick knocks the rim sitter off');
    check((await sh(T)) > sh0 + 5, 'SKANDAL as a pedestrian\'s');
    await stand(T, P.x + 14, P.z + 14, PI);
    await T.until(() => __game.torg.recs[13].ch.state === 'seated', 15000).catch(() => {});
    b = await body(T, 13);
    check(b.state === 'seated' && Math.abs(b.y - 0.58) < 0.01, `he sits down on the rim again (${JSON.stringify(b)})`);
    const e1 = await rec(T, 9);
    await T.ev(() => __game.shame.clear());
    {
      const fx = Math.sin(e1.seat.yaw), fz = Math.cos(e1.seat.yaw);
      await stand(T, e1.seat.x + fx * 1.3, e1.seat.z + fz * 1.3, e1.seat.yaw + PI);
    }
    await T.ev(() => { window.__knocks = []; const t = __game.torg, k = t.knock.bind(t); t.knock = (r, ...a) => { window.__knocks.push([r.i, a[3]]); return k(r, ...a); }; });
    await T.tap('KeyJ');
    await T.sleep(300);
    const kn = await T.ev(() => window.__knocks.slice());
    const benchDead = await T.ev((x, z) => !__props.find((p) => p.type === 'bank' && Math.hypot(p.x - x, p.z - z) < 0.5).alive, P.x + 8.6, P.z);
    T.log('bench kick', JSON.stringify(kn), 'dead', benchDead, 'shame', await sh(T));
    check(benchDead && kn.length === 2 && kn.every(([, why]) => why === 'bench'), 'the kick smashes the bench and throws both sitters off');
    check((await sh(T)) < 9, 'no SKANDAL of theirs (the bench\'s own only)');
    await stand(T, P.x + 14, P.z + 2, -PI / 2);
    await T.sleep(3500);
    await look(T, PI / 2);
    await T.sleep(500);
    s = await st(T);
    check(!s.shown.some((x) => x.i === 9 || x.i === 10), 'the two put away unseen (their bench gone)');
    // His car into the W bench's sitter (11): knocked off, the bench left standing (cars ride over it).
    const w = await rec(T, 11);
    await T.ev(() => __game.shame.clear());
    await drive(T, w.seat.x - 9, w.seat.z, PI / 2);
    await T.frames(4);
    await go(T, 9);
    await T.until(() => ['flung', 'down'].includes(__game.torg.recs[11].ch.state), 3000).catch(() => {});
    b = await body(T, 11);
    const wAlive = await T.ev((x, z) => __props.find((p) => p.type === 'bank' && Math.hypot(p.x - x, p.z - z) < 0.5).alive, P.x - 8.6, P.z);
    T.log('car sitter', JSON.stringify(b), 'bench alive', wAlive, 'shame', await sh(T));
    check(b.state === 'flung' || b.state === 'down', 'his car knocks the sitter off');
    check(wAlive && (await sh(T)) > 5, 'the bench stands; SKANDAL as a pedestrian\'s');
    await brake(T);
    await T.sleep(300);
    await T.ev(() => __game.exitCar(true));

    // 8. The paseo at 19:30: eight walkers round the fountain, clockwise; "Suecos…".
    await setHour(T, 19.5);
    await cutTo(T, P.x, P.z + 18, PI);
    await T.sleep(3000);
    const ang = (T) => T.ev((P) => __game.torg.snapshot().filter((b) => b.kind === 'walker').map((b) => ({ i: b.i, r: Math.hypot(b.x - P.x, b.z - P.z), a: Math.atan2(b.z - P.z, b.x - P.x), state: b.state })), P);
    const a0 = await ang(T);
    await T.sleep(2000);
    const a1 = await ang(T);
    T.log('paseo', JSON.stringify(a1.map((x) => [x.i, +x.r.toFixed(2), +x.a.toFixed(2)])));
    check(a1.length === 8 && a1.every((x) => x.state === 'normal'), 'eight walkers');
    check(a1.every((x) => x.r > 6.0 && x.r < 7.6), 'on their radii round the fountain');
    const moved = a1.filter((x) => { const y = a0.find((q) => q.i === x.i); const d = Math.atan2(Math.sin(x.a - y.a), Math.cos(x.a - y.a)); return d > 0.05; });
    check(moved.length >= 7, `going round (${moved.length} of 8 on)`);
    const wb = await rec(T, 11);
    await T.ev(() => { const t = __game.torg; t.first.suecos = true; t.lineT.suecos = -Infinity; for (const r of t.recs) r.visit = false; });
    await clearLog(T);
    await stand(T, wb.seat.x + 2.0, wb.seat.z + 1.5, -PI / 2);
    await T.until(() => __game.torg.counts.suecos > 0, 4000).catch(() => {});
    lines = await said(T);
    T.log('suecos', JSON.stringify(lines));
    check(lines.some(([w, l]) => w.startsWith('seat:') && l === c.suecos), 'a sitter mutters "Suecos…"');

    // 9. The church at 11:00 and 14:00.
    await setHour(T, 11);
    await cutTo(T, K.x + 3, K.z + 27, PI - 0.3);
    await T.sleep(1500);
    s = await st(T);
    check(s.shown.filter((x) => x.group === 'kyrka' && x.kind === 'seat' && x.state === 'seated').length === 3 && s.shown.filter((x) => x.kind === 'stand' && x.state === 'normal').length === 2, 'three seated and the pair on the church square');
    await clearLog(T);
    await stand(T, K.x + 11.2, K.z + 21.4, PI);
    await T.until(() => __game.torg.counts.greet > 0, 4000).catch(() => {});
    lines = await said(T);
    check(lines.some(([w, l]) => w.startsWith('stand:') && l === '¡Buenos días!'), `"¡Buenos días!" (${JSON.stringify(lines)})`);
    await setHour(T, 14);
    await stand(T, K.x + 11, K.z + 60, PI);
    await T.sleep(300);
    await T.ev(() => { __game.torg.lineT.greet = -Infinity; });
    await clearLog(T);
    await stand(T, K.x + 11.2, K.z + 21.4, PI);
    await T.until(() => __game.torg.counts.greet > 1, 4000).catch(() => {});
    lines = await said(T);
    check(lines.some(([, l]) => l === '¡Buenas tardes!'), `"¡Buenas tardes!" (${JSON.stringify(lines)})`);

    // 10. Night (02:00): CERRADO, nobody.
    await setHour(T, 2);
    await cutTo(T, M.x, M.z + 2, PI);
    await T.sleep(5000);
    s = await st(T);
    T.log('night', s.shown.length, s.covers.map((x) => x.k).join(''));
    check(s.covers.every((x) => x.k === 1) && s.covers.filter((x) => x.si !== null).every((x) => !x.si && x.cl), 'the covers down with CERRADO · STÄNGT');
    check(s.shown.length === 0, `nobody in the centre at night (${s.shown.length})`);

    // 11. A mission start: everything away at once.
    await setHour(T, 15);
    await cutTo(T, M.x, M.z + 2, PI);
    await T.sleep(4500);
    s = await st(T);
    check(s.shown.length >= 2 && s.covers.every((x) => x.k === 1), 'the siesta again before the mission');
    await T.startMission();
    s = await st(T);
    T.log('mission', s.on, s.shown.length, s.covers.map((x) => x.k).join(''));
    check(!s.on && s.shown.length === 0 && s.covers.every((x) => x.k === 0 && !x.vis), 'a mission start takes every body and cover away');
    check(await T.ev(() => __game.torg.recs.filter((r) => r.crate).every((r) => !r.crate.mesh.visible)), 'and the crates');
    await T.sleep(1500);
    s = await st(T);
    check(s.shown.length === 0 && s.covers.every((x) => !x.vis), 'nothing in the mission');
  },

  async torgshots(T) {
    await setup(T);
    await T.ev(() => { __game.autoDialog = true; });
    // The market from the south along the middle aisle at the siesta (the idea's picture 2).
    await cutTo(T, M.x + 1, M.z + 22, PI);
    await T.sleep(5000);
    await T.shot('torg_siesta');
    // The board by the south gate: the vendors' hours.
    await frame(T, { x: M.x + 12.5, y: 1.8, z: M.z + 32.6 }, { x: M.x + 12.5, y: 1.7, z: M.z + 29.6 });
    await T.sleep(400);
    await T.shot('torg_skylt');
    await release(T);
    // A dozer on his crate, close.
    const d = await rec(T, 6);
    await stand(T, d.x + 5, d.z + 6, PI);
    await frame(T, { x: d.x + 2.0, y: 1.5, z: d.z + 2.9 }, { x: d.x - 0.2, y: 0.8, z: d.z });
    await T.sleep(600);
    await T.shot('torg_dozer');
    await frame(T, { x: M.x + 1.5, y: 2.0, z: M.z - 22.6 }, { x: M.x - 9, y: 1.3, z: M.z - 18.6 });   // row A2's covers from the lane
    await T.sleep(600);
    await T.shot('torg_covers');
    await release(T);
    // The giraffe exchange after julafton.
    await T.ev(() => __game.unlocked.add('bodega'));
    const sv = await T.ev(() => { const n = __game.npc('souvenir'); return { x: n.x, z: n.z }; });
    await stand(T, sv.x - 2.0, sv.z + 1.7, 2.3, -0.9);
    await T.until(() => __game.player.anim.giraffe, 5000).catch(() => {});
    await T.sleep(400);
    await T.shot('torg_jirafa');
    // Open (10:00): the vendors.
    await T.ev(() => __game.day.set(10));
    await cutTo(T, M.x + 1, M.z + 22, PI);
    await T.sleep(5000);
    await T.shot('torg_open');
    await stand(T, M.x + 11.5, M.z + 17.5, 2.4, -0.4);
    await T.sleep(800);
    await T.shot('torg_churros');
    // The plaza by day (15:00): the sitters.
    await T.ev(() => __game.day.set(15));
    await cutTo(T, P.x + 3, P.z + 13, PI - 0.15);
    await T.sleep(2500);
    await T.shot('torg_plaza');
    await stand(T, P.x + 6.2, P.z - 2.6, 0.75, -0.5);
    await T.sleep(800);
    await T.shot('torg_bench');
    await stand(T, P.x + 2.0, P.z - 7.6, 0.47, 0.5);
    await T.sleep(800);
    await T.shot('torg_rim');
    // The paseo in the sunset (19:30).
    await T.ev(() => __game.day.set(19.5));
    await cutTo(T, P.x + 2, P.z + 15, PI);
    await T.sleep(3000);
    await T.shot('torg_paseo');
    await T.sleep(4000);
    await T.shot('torg_paseo2');
    // The church square (11:00).
    await T.ev(() => __game.day.set(11));
    await cutTo(T, K.x + 4, K.z + 26, PI - 0.3);
    await T.sleep(2500);
    await T.shot('torg_kyrka');
    // The night market (22:00).
    await T.ev(() => __game.day.set(22));
    await cutTo(T, M.x + 1, M.z + 22, PI);
    await T.sleep(5000);
    await T.shot('torg_natt');
  },
};
