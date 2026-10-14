// Siv och Majsan sätter poäng – the sisters judge his dives (free roam, DESIGN §10.8; feature 4): simhopp.
//   simhopp: the first bounce on Flamenco's diving board brings Stig's "Mina ögon tål inte klor." and the
//            sisters walk to the pool's edge; a plain hop into the pool is a swan dive (arms out on the way
//            down; Siv 4, Majsan 10, the plane's lines), a double jump a somersault (Siv's nine, a new
//            record), a stomp a belly flop (Siv's minus point, Stig face down, "…Minuspoäng?", Majsan
//            laughing); the cards, the result line and the saved record; Siv's tease after three tens; no
//            line again within 20 s; a hop back onto the board or a glide is not judged; idle, they walk
//            home and are free again; as a mission's giver and extra (ropavieja) they judge from their
//            place without walking, and away as buss17's extras they are not called; a mission start sends
//            them home at once, and in a mission the board is only a trampoline.
import { check } from '../lib.mjs';

const PI = Math.PI;
const st = (T) => T.ev(() => {
  const g = __game, J = g.judges, p = g.player, n = (k) => g.npc(k);
  const sis = (k) => ({ x: +n(k).x.toFixed(2), z: +n(k).z.toFixed(2), busy: n(k).busy, spot: n(k).spot, card: n(k).anim.card ?? null, laugh: n(k).anim.laugh, yaw: +n(k).yaw.toFixed(2) });
  return { visit: J.visit, hop: J.hop, out: Object.keys(J.out), last: J.last, swan: p.anim.swan, pst: p.state, flopped: p.flopped,
    px: +p.x.toFixed(2), pz: +p.z.toFixed(2), py: +p.y.toFixed(2), siv: sis('siv'), majsan: sis('majsan'), records: g.records,
    score: document.getElementById('score').classList.contains('show') ? document.getElementById('score').textContent : '' };
});
// Every line said through game.say since the last reset, in order.
const said = (T) => T.ev(() => window.__said.slice());
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) { const o = g.say.bind(g); g.say = (t, text, secs) => { window.__said.push(text); return o(t, text, secs); }; }
  window.__said = [];
});
// Him 2.4 m up over the board's west half, facing along it out over the pool, the camera behind him.
const place = (T, B, dx = -0.5, camYaw = PI / 2) => T.ev((x, z, camYaw) => {
  const g = __game, p = g.player;
  if (g.playerCar) g.exitCar(true);
  p.state = 'normal';
  p.teleport(x, z, Math.PI / 2);
  p.y = 2.4; p.onGround = false;
  p.vx = p.vz = p.vy = 0;
  g.jumps = 1;
  g.cam.yaw = camYaw; g.cam.snapNext = true;
}, B.x + dx, B.z, camYaw);
// One hop off the board: W held from the bounce (out over the deep end), at the top a double jump
// (`double`) or a stomp (`stomp`), until he is down. Returns { swan } (the arms out on the way down).
async function hop(T, B, { keys = ['KeyW'], double = false, stomp = false, shot = null } = {}) {
  await place(T, B);
  await T.until(() => __game.player.vy > 10, 3000);   // the bounce
  for (const k of keys) await T.page.keyboard.down(k);
  let swan = null;
  try {
    await T.until(() => __game.player.vy < 0.6, 4000);
    if (double) { await T.tap('Space'); await T.until(() => __game.player.vy < -2, 4000); }
    else if (stomp) await T.tap('KeyJ');
    else await T.until(() => __game.player.vy < -3, 3000);
    if (!stomp) { swan = await T.ev(() => __game.player.anim.swan); if (shot) await T.shot(shot); }
    await T.until(() => __game.player.onGround || __game.player.state !== 'normal', 6000);
  } finally { for (const k of keys) await T.page.keyboard.up(k); }
  return { swan };
}
const near = (s, q, r = 0.6) => Math.hypot(s.x - q.x, s.z - q.z) < r;

export const SCENARIOS = {
  async simhopp(T) {
    // 0. Free roam after the end, no unlocks (?fresh): the sisters at home by the pool.
    await T.fresh('&mission=13');
    await resetSaid(T);
    const B = await T.L('flamencoBoard');
    const cfg = await T.ev(() => { const { spots, kinds, stayOut, again } = __game.judges.cfg; return { spots, kinds, stayOut, again }; });
    const edge = await T.ev((s) => ({ siv: __game.lmOffset('flamencoBoard', ...s.siv), majsan: __game.lmOffset('flamencoBoard', ...s.majsan) }), cfg.spots);
    let r = await st(T);
    const home = { siv: r.siv, majsan: r.majsan };
    T.log('board', JSON.stringify(B), 'home', JSON.stringify(home), 'edge', JSON.stringify(edge));
    check(!r.visit && !r.out.length && !r.siv.busy && !r.majsan.busy, `no visit before a bounce (${JSON.stringify(r)})`);

    // 1. The first hop: the call, the walk to the edge, a swan dive into the deep end.
    let h = await hop(T, B, { shot: 'simhopp_svan' });
    r = await st(T);
    T.log('swan dive', JSON.stringify(r.last), 'at', r.px, r.pz, 'swan', h.swan);
    check(h.swan === true, 'a plain hop spreads his arms on the way down');
    check(r.visit && r.out.length === 2 && r.siv.spot === 'poolJudges' && r.majsan.busy, `the bounce calls both sisters (${JSON.stringify(r)})`);
    check(r.last?.kind === 'svanhopp' && r.last.siv === 4 && r.last.majsan === 10 && r.last.sum === 14 && r.last.record, `a swan dive: 4 + 10 = 14, a record (${JSON.stringify(r.last)})`);
    check(r.siv.card === '4' && r.majsan.card === '10', `the cards 4 and 10 (${r.siv.card}, ${r.majsan.card})`);
    check(r.score.includes('SVANHOPP! 4 + 10 = 14 P') && r.score.includes('NYTT REKORD!'), `the result line (${r.score})`);
    check(r.records.simhopp === 14, 'the record is 14');
    check(!r.swan, 'the arms come down in the water');
    await T.frames(20);
    await T.shot('simhopp_svan_kort');
    await T.until(() => __game.judges.lines.length === 0, 8000);
    await T.frames(10);
    let s = await said(T);
    T.log('said', JSON.stringify(s));
    for (const l of ['Mina ögon tål inte klor.', 'Giraffen, då? Fyra.', 'Mindre än pizza-racern?', 'Tio!']) check(s.includes(l), `said: ${l}`);
    check(s.indexOf('Giraffen, då? Fyra.') < s.indexOf('Mindre än pizza-racern?') && s.indexOf('Mindre än pizza-racern?') < s.indexOf('Tio!'), 'Siv, then Majsan, then her ten');
    await T.until(() => __game.player.state === 'normal', 4000);
    await T.until((e) => { const g = __game; return ['siv', 'majsan'].every((k) => Math.hypot(g.npc(k).x - e[k].x, g.npc(k).z - e[k].z) < 0.4); }, 8000, edge);
    r = await st(T);
    check(r.siv.card == null && r.majsan.card == null, 'the cards come down');
    T.log('at the edge', JSON.stringify({ siv: r.siv, majsan: r.majsan }));

    // 2. On the board again, no keys: he lands back on the board (a bounce, no verdict).
    await resetSaid(T);
    await place(T, B);
    await T.until(() => __game.player.vy > 10, 3000);
    await T.until(() => __game.player.vy < -3, 3000);
    check(!(await T.ev(() => __game.player.anim.swan)), 'no swan arms over the board');
    await T.shot('simhopp_brada');
    await T.until(() => __game.player.vy > 10, 4000);   // the second bounce: he came down on the board
    r = await st(T);
    check(r.last.kind === 'svanhopp' && r.last.sum === 14 && r.hop === true, `a hop back onto the board is not judged (${JSON.stringify(r)})`);
    check(!(await said(T)).includes('Mina ögon tål inte klor.'), 'the call is once a visit');

    // 3. A double jump: a somersault, Siv's nine, a new record.
    h = await hop(T, B, { double: true });
    r = await st(T);
    T.log('somersault', JSON.stringify(r.last), 'at', r.px, r.pz);
    check(h.swan === false, 'no swan arms after a double jump');
    check(r.last?.kind === 'volt' && r.last.siv === 9 && r.last.sum === 19 && r.last.record && r.records.simhopp === 19, `a somersault: 9 + 10 = 19, a record (${JSON.stringify(r.last)})`);
    check(r.score.includes('VOLT! 9 + 10 = 19 P') && r.score.includes('NYTT REKORD!'), `the result line (${r.score})`);
    await T.ev(() => { const g = __game, s = g.npc('siv'); g.cam.yaw = Math.atan2(s.x - g.player.x, s.z - g.player.z); g.cam.snapNext = true; });
    await T.frames(25);
    await T.shot('simhopp_volt');
    await T.until(() => __game.judges.lines.length === 0, 8000);
    s = await said(T);
    // Majsan's "Tio!" from the swan dive is still inside its 20 s: the card says it.
    check(s.includes('Majsan, en niopoängare!') && s.filter((l) => l === 'Tio!').length <= 1, `the somersault's lines (${JSON.stringify(s)})`);
    const saved = await T.ev(() => JSON.parse(localStorage.getItem('charter-and-run-v1') || 'null')?.records?.simhopp);
    check(saved === 19, `the record is saved (${saved})`);

    // 4. A stomp: the belly flop; minus points, face down, "…Minuspoäng?", Majsan laughs; Siv's tease
    //    (her third ten this visit).
    await T.until(() => __game.player.state === 'normal', 4000);
    await resetSaid(T);
    h = await hop(T, B, { stomp: true });
    r = await st(T);
    T.log('belly flop', JSON.stringify(r.last), 'state', r.pst, r.flopped);
    check(r.last?.kind === 'magplask' && r.last.siv === -1 && r.last.sum === 9 && !r.last.record, `a belly flop: –1 + 10 = 9, no record (${JSON.stringify(r.last)})`);
    check(r.pst === 'down' && r.flopped, 'he lies face down in the water');
    check(r.siv.card === '–1' && r.majsan.laugh, `Siv's minus card and Majsan laughing (${r.siv.card}, ${r.majsan.laugh})`);
    check(r.score.includes('MAGPLASK! –1 + 10 = 9 P') && r.score.includes('REKORD 19 P'), `the result line (${r.score})`);
    await T.frames(6);
    await T.shot('simhopp_magplask');
    await T.until(() => __game.judges.lines.length === 0, 10000);
    await T.frames(10);
    s = await said(T);
    T.log('said', JSON.stringify(s));
    check(s.includes('Han är så bortkommen. Det blir minuspoäng.') && s.includes('…Minuspoäng?'), 'the belly flop lines');
    check(s.includes('Så att du vågar stöta på giraffen.'), "Siv's tease after Majsan's third ten");
    r = await st(T);
    check(r.pst === 'normal' && !r.flopped, 'he is up again');

    // 5. Two swan dives in a row: both judged (cards, result line), but "Fyra." at most once in 20 s,
    //    and the tease only once a visit.
    await resetSaid(T);
    for (let k = 0; k < 2; k++) {
      await hop(T, B);
      await T.frames(5);
      r = await st(T);
      check(r.last.kind === 'svanhopp' && r.siv.card === '4' && r.score.includes('SVANHOPP!'), `swan dive ${k + 1} is judged`);
      await T.sleep(3500);
    }
    s = await said(T);
    T.log('said in two dives', JSON.stringify(s));
    check(s.filter((l) => l === 'Giraffen, då? Fyra.').length <= 1 && s.filter((l) => l === 'Tio!').length <= 1, 'no line twice within 20 s');
    check(!s.includes('Så att du vågar stöta på giraffen.'), 'the tease is once a visit');

    // 6. Left alone, they walk home and are free again (placeNpcs' spot back).
    await T.ev(() => { const J = __game.judges; J.idleT = J.cfg.stayOut + 1; });
    await T.until((h) => { const g = __game; return ['siv', 'majsan'].every((k) => Math.hypot(g.npc(k).x - h[k].x, g.npc(k).z - h[k].z) < 0.5 && !g.npc(k).busy); }, 12000, home);
    r = await st(T);
    T.log('home again', JSON.stringify({ siv: r.siv, majsan: r.majsan, out: r.out, visit: r.visit }));
    check(!r.visit && !r.out.length && r.siv.spot === home.siv.spot && r.majsan.spot === home.majsan.spot, 'free at home, their spots back');

    // 7. A glide off the board (with julafton's unlock) is not judged.
    await T.ev(() => { __game.unlock('bodega'); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    await T.until(() => __game.player.state === 'normal' && __game.player.onGround, 4000);
    const before = (await st(T)).last;
    await place(T, B);
    await T.until(() => __game.player.vy > 10, 3000);
    await T.page.keyboard.down('KeyW');
    try {
      await T.until(() => __game.player.vy < 0.6, 4000);
      await T.page.keyboard.down('KeyJ');
      try {
        await T.until(() => __game.glide.on, 2000);
        await T.until(() => !__game.glide.on, 12000);
      } finally { await T.page.keyboard.up('KeyJ'); }
    } finally { await T.page.keyboard.up('KeyW'); }
    r = await st(T);
    const gl = await T.ev(() => __game.glide.last);
    T.log('glide', JSON.stringify(gl));
    check(gl.water && JSON.stringify(r.last) === JSON.stringify(before) && !r.hop, `a glide into the pool is not judged (${JSON.stringify(r.last)})`);

    // 8. As ropavieja's giver and extra the sisters judge from their place, only turning.
    await T.fresh('&mission=9');
    await resetSaid(T);
    r = await st(T);
    const pin = { siv: r.siv, majsan: r.majsan };
    h = await hop(T, B);
    r = await st(T);
    T.log('pinned', JSON.stringify(r.last), JSON.stringify({ siv: r.siv, majsan: r.majsan }));
    check(r.last?.kind === 'svanhopp' && r.siv.card === '4' && r.majsan.card === '10', 'the giver and the extra judge');
    check(!r.out.length && near(r.siv, pin.siv, 0.3) && near(r.majsan, pin.majsan, 0.3) && !r.siv.busy, 'they do not walk');
    await T.frames(40);
    await T.shot('simhopp_ropavieja');
    r = await st(T);
    const faces = (k) => { const n = r[k], d = Math.atan2(r.px - n.x, r.pz - n.z) - n.yaw; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); };
    check(faces('siv') < 0.35 && faces('majsan') < 0.35, `they turn to him (${faces('siv').toFixed(2)}, ${faces('majsan').toFixed(2)})`);

    // 9. A mission start while they stand at the edge: home at once, cards down. In the mission the
    //    board is only a trampoline.
    await T.fresh('&mission=11');
    await resetSaid(T);
    r = await st(T);
    const home2 = { siv: r.siv, majsan: r.majsan };
    await hop(T, B);
    await T.until((e) => { const g = __game; return ['siv', 'majsan'].every((k) => Math.hypot(g.npc(k).x - e[k].x, g.npc(k).z - e[k].z) < 1.5); }, 8000, edge);
    check((await st(T)).out.length === 2, 'out at the edge');
    await T.until(() => __game.player.state === 'normal', 4000);
    await T.startMission();
    r = await st(T);
    T.log('mission start', JSON.stringify({ siv: r.siv, majsan: r.majsan, visit: r.visit, out: r.out, score: r.score }));
    check(!r.visit && !r.out.length && r.siv.card == null && r.majsan.card == null && !r.score, 'a mission start ends the visit');
    check(!near(r.siv, edge.siv, 2) && !near(r.majsan, edge.majsan, 2), 'and they are away from the edge');
    check(near(r.siv, home2.siv, 0.5) || r.siv.spot !== 'poolJudges', 'Siv home (or placed by the mission)');
    const lastBefore = r.last;
    await place(T, B);
    await T.until(() => __game.player.vy > 10, 3000);
    r = await st(T);
    check(!r.hop && !r.visit, 'in a mission the board is only a trampoline');
    check(JSON.stringify(r.last) === JSON.stringify(lastBefore), 'and nothing is judged');

    // 10. Before buss17 the sisters wait at the airport as its extras: the board is only a trampoline.
    await T.fresh('&mission=5');
    await resetSaid(T);
    await T.frames(10);
    await hop(T, B);
    r = await st(T);
    T.log('buss17 idle', JSON.stringify({ siv: r.siv, majsan: r.majsan, visit: r.visit, last: r.last }));
    check(!r.visit && !r.out.length && r.last == null && !(await said(T)).includes('Mina ögon tål inte klor.'), 'no call and no verdict without the sisters');
  },
};
