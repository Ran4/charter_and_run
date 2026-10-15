// Små grodorna i poolen – the pool fest after the end (free roam, DESIGN §10.13; feature 8): grodorna, grodtakt.
//   grodorna: no fest before the end or without julafton's unlock; with it Lasse wears his Santa outfit
//             and he, Affe, Gabbe and Fru Storch live on Flamenco's pool deck (Herr Storch on the beach);
//             Stig on the deck calls the party: the seven wade to their places in the ring (waist-deep,
//             posed, not to be bowled over), the session's exchange at the edge, a set of two rounds of
//             Små grodorna on the audio clock and a pause; the ring hops on every other beat with the
//             routine's arms (the musicians play); the porter steps out, says his line, shakes his head
//             and goes back; E at the gap puts Stig in the ring (stiff, wading, the counter), E takes him
//             out onto the coping and a step does too; no SKANDAL; out of the hours no visit; leaving
//             the deck they walk home and are free with their spots back; julafton's unlock gone
//             (out of free roam) and they are home at once.
//   grodtakt: the hop counter: eight hops on the ring's beat (real key events) bring the cheer, Ole's
//             "Heia Norge!" and Lasse's coin (once a visit); off the beat the ring laughs and the row is
//             gone; a ring hop missed breaks the row; the gap between two rounds counts the next beat 0;
//             with the music off the beat is the game's clock; the diving judges take the sisters out of
//             the ring and the fest takes them back once they are home.
import { check } from '../lib.mjs';

const PI = Math.PI;
// The fest's state, the dancers and Stig.
const st = (T) => T.ev(() => {
  const g = __game, F = g.fest, p = g.player, o = {};
  for (const k of [...F.keys, 'portier', 'herrStorch']) {
    const n = g.npc(k);
    o[k] = { x: +n.x.toFixed(2), z: +n.z.toFixed(2), spot: n.spot, busy: n.busy, wade: +n.wade.toFixed(2), outfit: n.outfit ?? null, groda: n.anim.groda, hop: +n.anim.hop.toFixed(3),
      cheer: n.anim.cheer, laugh: n.anim.laugh, inv: !!n.invulnerable, posed: F.posed(k), look: +(n.anim.look || 0).toFixed(2), yaw: +n.yaw.toFixed(2) };
  }
  const tk = document.getElementById('takt');
  return { phase: F.phase, visit: F.visit, joined: F.joined, held: Object.keys(F.held).sort(), streak: F.streak, stats: { ...F.stats }, last: F.last, paid: F.paid,
    round: F.round && { n: F.round.n, t: +(F.now() - F.round.t0).toFixed(3), game: F.round.game, t0: F.round.t0 }, porter: !!F.porterO,
    p: { x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), wade: +p.wade.toFixed(2), groda: p.anim.groda, state: p.state }, coins: g.coins, shame: g.shame.v,
    takt: tk.classList.contains('show') ? tk.textContent : '', taktCls: tk.className, prompt: document.getElementById('prompt').textContent, o };
});
const said = (T) => T.ev(() => window.__said.slice());
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) { const o = g.say.bind(g); g.say = (t, text, secs) => { window.__said.push(text); return o(t, text, secs); }; }
  window.__said = [];
});
// After the end: julafton's unlock and its forced placement (as the runner's complete() does).
const afterEnd = (T) => T.ev(() => { const g = __game; g.unlock('bodega'); g.placeNpcs(true); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
const near = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
// In the page: the dancers' hop and arms in the first frame of any round whose beat is in [b0, b1)
// and whose time since the last even beat is in [s0, s1] s.
const sample = (T, b0, b1, s0, s1) => T.ev((b0, b1, s0, s1) => new Promise((res) => {
  const F = __game.fest;
  const step = () => {
    if (F.phase === 'round') {
      const t = F.now() - F.round.t0, b = t / F.beat, s = t - 2 * F.beat * Math.floor(b / 2);
      if (b >= b0 && b < b1 && s >= s0 && s <= s1) {
        const o = { b: +b.toFixed(2), s: +s.toFixed(3) };
        for (const k of F.keys) { const n = __game.npc(k); o[k] = { hop: +n.anim.hop.toFixed(3), groda: n.anim.groda }; }
        res(o);
        return;
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), b0, b1, s0, s1);
// Stig on foot at (x, z) facing yaw, the camera behind him.
const stand = (T, x, z, yaw, turn = 0) => T.ev((x, z, yaw, turn) => { const g = __game; if (g.playerCar) g.exitCar(true); g.player.state = 'normal'; g.debugWarp(x, z, yaw); g.cam.yaw = yaw + turn; g.cam.snapNext = true; }, x, z, yaw, turn);
// In the page: Space pressed `n` times, each `off` s after one of the ring's hop beats (from the next
// one on, skipping `skip` beats after the first press), as real key events; resolves with the beats.
const press = (T, n, off = 0, skip = 0) => T.ev((n, off, skip) => new Promise((res) => {
  const F = __game.fest, out = [];
  let lastKey = null, gapAfter = null, up = false, first = true;
  const step = () => {
    if (up) { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); up = false; }
    if (out.length >= n) { res(out); return; }
    if (F.phase === 'round' || F.phase === 'gap') {
      const beat = F.beat, r = F.round, t = F.now() - r.t0;
      const next = F.phase === 'gap' ? { key: `${r.n + 1}:0`, at: F.nextAt - r.t0 } : null;
      const k = 2 * Math.floor((t - off) / (2 * beat)), key = `${r.n}:${k}`;
      const cand = next && t - off >= next.at - 0.001 ? next : k >= 0 && k <= F.info.beats - 2 ? { key, at: k * beat } : null;
      if (first) lastKey = cand?.key ?? null;   // only beats still to come
      else if (cand && cand.key !== lastKey && t - off - cand.at < 0.05) {
        lastKey = cand.key;
        if (gapAfter != null && gapAfter > 0) gapAfter--;
        else {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
          up = true;
          out.push(cand.key);
          if (gapAfter == null && skip) gapAfter = skip;
        }
      }
    }
    if (F.phase === 'round' || F.phase === 'gap') first = false;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), n, off, skip);

export const SCENARIOS = {
  async grodorna(T) {
    // 0. Before the end (the grisfest idle, index 11): no fest at the pool, Lasse at SunTrip in his suit.
    await T.fresh('&mission=11');
    await T.frames(30);
    let r = await st(T);
    T.log('index 11', JSON.stringify({ visit: r.visit, lasse: r.o.lasse }));
    check(!r.visit && !r.held.length && r.o.lasse.outfit === 'sol' && !near(r.o.lasse, await T.L('flamencoRing'), 40), 'no fest before the end');
    // After the end without julafton's unlock (a fresh save at index 13): no fest either.
    await T.fresh('&mission=13');
    await T.frames(30);
    r = await st(T);
    check(!r.visit && !r.held.length, `no fest without the unlock (${JSON.stringify({ visit: r.visit, held: r.held })})`);

    // 1. Julafton's unlock: Lasse in his Santa outfit, the four at their new homes on the pool deck.
    await resetSaid(T);
    await T.ev(() => { __game.player.teleport(-60, -60, 0); });   // off the deck while they are placed
    await afterEnd(T);
    const C = await T.L('flamencoRing');
    const cfg = await T.ev(() => { const c = __game.fest.cfg; return JSON.parse(JSON.stringify(c)); });
    const homes = await T.ev(() => { const g = __game, o = {}; for (const k of ['lasse', 'affe', 'gabbe', 'fruStorch', 'herrStorch', 'siv', 'majsan', 'ole', 'portier']) { const h = g.homeOverrides[k] ?? g.levelDef.homes(g)[k]; o[k] = g.lmOffset(h[0], h[1], h[2]); } return o; });
    r = await st(T);
    T.log('homes', JSON.stringify(homes));
    check(r.o.lasse.outfit === 'jul', 'Lasse keeps his Santa outfit after the end');
    for (const k of ['lasse', 'affe', 'gabbe', 'fruStorch']) check(near(r.o[k], homes[k], 0.5) && near(homes[k], C, 16), `${k} lives on the pool deck (${JSON.stringify(r.o[k])})`);
    check(!near(r.o.herrStorch, C, 100), 'Herr Storch stays on the beach');
    check(!r.visit, 'no visit with Stig off the deck');

    // 2. Out of the hours no visit (the free-roam clock at 23.30).
    await T.ev(() => { __game.day.h = 23.5; });
    const deck = await T.ev(() => __game.lmOffset('flamencoDeck', 0, 1.5));
    await stand(T, deck.x, deck.z, PI);
    await T.frames(30);
    r = await st(T);
    check(!r.visit, 'no visit outside the hours');
    await T.ev(() => { __game.day.h = 15; });

    // 3. Stig on the deck (its south-east corner, looking over the ring): the call, the wade, the ring.
    await stand(T, C.x + 4.2, C.z + 5.4, Math.atan2(-4.2, -5.4), 0.4);
    await T.until(() => __game.fest.visit, 5000);
    r = await st(T);
    T.log('call', JSON.stringify({ held: r.held, phase: r.phase }));
    check(JSON.stringify(r.held) === JSON.stringify([...cfg.ring, cfg.leader].sort()), `all seven are called (${r.held})`);
    for (const k of r.held) check(r.o[k].spot === 'poolFest' && r.o[k].busy && r.o[k].inv && r.o[k].posed, `${k} is ours, invulnerable and posed`);
    await T.frames(40);
    await T.shot('grodorna_vadar');
    await T.until(() => __game.fest.phase !== 'form', 20000);
    await T.sleep(900);   // the last one in turns to the middle
    r = await st(T);
    const slots = await T.ev(() => { const F = __game.fest, o = {}; F.cfg.ring.forEach((k, i) => { o[k] = F.slot(i + 1); }); o[F.leader] = F.centre; return o; });
    for (const k of r.held) check(near(r.o[k], slots[k], 0.4) && Math.abs(r.o[k].wade - cfg.wade) < 0.01, `${k} waist-deep in the ring (${JSON.stringify(r.o[k])})`);
    const faceIn = (k) => { const n = r.o[k], s = slots[k], d = s.yaw - n.yaw; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); };
    check(cfg.ring.every((k) => faceIn(k) < 0.3), `the ring faces the middle (${cfg.ring.map((k) => faceIn(k).toFixed(2))})`);
    // The session's exchange at the edge (Stig within askR of the gap): in order, once.
    await T.until(() => window.__said.includes('Det är väl typiskt svenskt att ha julfest bland palmerna.'), 12000);
    let s = await said(T);
    const ask = cfg.ask.map(([, , text]) => text);
    check(ask.every((l) => s.includes(l)) && s.indexOf(ask[0]) < s.indexOf(ask[1]) && s.indexOf(ask[1]) < s.indexOf(ask[2]), `the exchange in order (${s})`);

    // 4. The round: on the audio clock, the hop on even beats, the routine's arms, the musicians.
    await T.until(() => __game.fest.phase === 'round', 15000);
    r = await st(T);
    check(r.round.n === 1 && r.round.game === false, `round 1 on the audio clock (${JSON.stringify(r.round)})`);
    const beat = await T.ev(() => __game.fest.beat);
    // Sampled in the page: 0.17–0.22 s after an even beat (in the air) and 0.55–0.75 s (down), in the
    // tails (beats 0–7), the ears (8–11) and the chorus (16–31, the higher hop).
    // The porter steps out, says his line, shakes his head, goes back and is free again.
    await T.until((l) => window.__said.includes(l), 15000, cfg.porter.line);
    r = await st(T);
    const pq = { x: C.x + cfg.porter.at[0], z: C.z + cfg.porter.at[1] };
    check(near(r.o.portier, pq, 0.5) && r.o.portier.posed, `the porter on the deck (${JSON.stringify(r.o.portier)})`);
    await T.until(() => Math.abs(__game.npc('portier').anim.look) > 0.1, 3000);
    await T.shot('grodorna_portier');
    await T.until(() => !__game.fest.porterO, 30000);
    r = await st(T);
    check(near(r.o.portier, homes.portier, 0.5) && !r.o.portier.busy && r.o.portier.spot === 'flamencoRecepcion:0:0' && r.o.portier.look === 0, `the porter home, free (${JSON.stringify(r.o.portier)})`);

    let a = await sample(T, 0, 8, 0.17, 0.22);
    T.log('hop up', JSON.stringify(a));
    check(a.majsan.hop > 0.15 && a.majsan.groda === 2 && a.affe.hop > 0.15 && a.affe.groda === false, 'in the air on the beat, hands behind (tails); Affe hops and plays');
    a = await sample(T, 0, 32, 0.55, 0.75);
    check(a.majsan.hop === 0 && a.ole.hop === 0, `down between the hops (${JSON.stringify(a)})`);
    a = await sample(T, 8, 12, 0.17, 0.22);
    check(a.siv.groda === 1 && a.lasse.groda === 1 && a.siv.hop < cfg.hop.h + 0.01, `ears on beats 8–11 (${JSON.stringify(a)})`);
    a = await sample(T, 16, 32, 0.17, 0.22);
    check(a.siv.groda === 1 && a.siv.hop > cfg.hop.h + 0.03, `the chorus hops higher (${JSON.stringify(a)})`);
    await sample(T, 16, 32, 0.16, 0.2);
    await T.shot('grodorna_ring');
    // 5. Stig on the edge, dry; E at the gap from the coping: in the ring, stiff, waist-deep.
    const out = await T.ev(() => __game.fest.outSpot);
    await stand(T, out.x, out.z, out.yaw);
    await T.frames(20);
    r = await st(T);
    check(r.p.wade === 0 && r.prompt.includes('Dansa med'), `on the coping: dry, the prompt (${r.prompt})`);
    check(await T.ev(() => __game.fest.gapMark.visible), 'the gap is marked on the water');
    await T.shot('grodorna_kanten');
    await T.tap('KeyE');
    await T.frames(30);
    r = await st(T);
    const gap = await T.ev(() => __game.fest.gap);
    check(r.joined && near(r.p, gap, 0.2) && r.p.groda === 3 && r.p.wade > 0.45, `in the ring at the gap (${JSON.stringify(r.p)})`);
    check(r.takt === 'I TAKT 0 / 8' && r.prompt.includes('Kliv ur ringen'), `the counter and the prompt (${r.takt}, ${r.prompt})`);
    // J does nothing in the ring (no kick, no stomp); a hop is a real small jump.
    await T.tap('KeyJ');
    await T.frames(5);
    check(await T.ev(() => __game.kickT <= 0 && __game.player.anim.kick === 0), 'no kick in the ring');
    // E: out onto the coping, dry again.
    await T.tap('KeyE');
    await T.frames(40);
    r = await st(T);
    check(!r.joined && near(r.p, out, 0.2) && r.p.wade === 0 && r.p.groda === false && !r.takt, `E takes him out onto the coping (${JSON.stringify(r.p)})`);
    // In again, and a step takes him out.
    await T.tap('KeyE');
    await T.frames(10);
    check((await st(T)).joined, 'in again');
    await T.hold(['KeyA'], 300);
    await T.frames(30);
    r = await st(T);
    check(!r.joined && r.p.groda === false && r.p.wade < 0.1, `a step out of the ring leaves it (${JSON.stringify(r.p)})`);
    check(r.shame === 0, 'no SKANDAL from the dance');
    s = await said(T);
    check(s.filter((l) => l === ask[0]).length === 1, 'the exchange once a session');

    // 6. The set: round 2 two beats after round 1, then the pause, then round 1 again.
    await T.until(() => __game.fest.phase === 'pause', 40000);
    await T.until(() => __game.fest.phase === 'round', 20000);
    const r1 = (await st(T)).round;
    await T.until(() => __game.fest.phase === 'round' && __game.fest.round.n === 2, 30000);
    r = await st(T);
    const gapS = r.round.t0 - r1.t0, want = (cfg.gapBeats + 32) * beat;
    T.log('round 2 after', gapS.toFixed(3), 'want', want.toFixed(3));
    check(Math.abs(gapS - want) < 0.06, `round 2 starts two beats after round 1 (${gapS.toFixed(3)} s, want ${want.toFixed(3)})`);
    await T.until(() => __game.fest.phase === 'pause', 20000);
    r = await st(T);
    check(r.o.ole.hop === 0 && r.o.ole.groda === false, 'still in the pause');
    const pauseT0 = await T.ev(() => performance.now());
    await T.until(() => __game.fest.phase === 'round', 20000);
    const pauseS = ((await T.ev(() => performance.now())) - pauseT0) / 1000;
    T.log('pause', pauseS.toFixed(2));
    check(Math.abs(pauseS - cfg.pauseSecs) < 0.8, `the pause is ${cfg.pauseSecs} s (${pauseS.toFixed(2)})`);
    check(await T.ev(() => __game.honk.free('ole') === false), 'a dancer does not answer the horn');

    // 7. Off the deck: they walk home and are free with their spots back; Stig dry.
    const homeSpots = await T.ev(() => { const g = __game, o = {}; for (const k of g.fest.keys) { const h = g.homeOverrides[k] ?? g.levelDef.homes(g)[k]; o[k] = `${h[0]}:${h[1]}:${h[2]}`; } return o; });
    await stand(T, C.x + 45, C.z, 0);
    await T.until(() => !__game.fest.visit, 3000);
    await T.until(() => !Object.keys(__game.fest.held).length, 25000);
    r = await st(T);
    T.log('home again', JSON.stringify(Object.fromEntries(Object.entries(r.o).map(([k, v]) => [k, `${v.x},${v.z} ${v.spot} ${v.busy}`]))));
    for (const k of cfg.ring.concat(cfg.leader)) {
      check(near(r.o[k], homes[k], 0.5) && !r.o[k].busy && r.o[k].spot === homeSpots[k] && r.o[k].wade === 0 && !r.o[k].inv, `${k} home, free (${JSON.stringify(r.o[k])})`);
    }
    // Back on the deck (a new visit) and julafton's unlock gone (out of free roam): home at once.
    await stand(T, deck.x, deck.z, PI);
    await T.until((h) => __game.fest.visit && __game.fest.held.ole && Math.hypot(__game.npc('ole').x - h.x, __game.npc('ole').z - h.z) > 3, 15000, homes.ole);
    await T.ev(() => { __game.unlocked.delete('bodega'); });
    await T.frames(5);
    r = await st(T);
    check(!r.visit && !r.held.length, 'out of free roam the visit is over at once');
    check(near(r.o.ole, homes.ole, 0.3) && !r.o.ole.busy && r.o.ole.wade === 0, `Ole home at once (${JSON.stringify(r.o.ole)})`);
  },

  async grodtakt(T) {
    await T.fresh('&mission=13');
    await resetSaid(T);
    await T.ev(() => { __game.player.teleport(-60, -60, 0); });
    await afterEnd(T);
    const cfg = await T.ev(() => JSON.parse(JSON.stringify(__game.fest.cfg)));
    const out = await T.ev(() => __game.fest.outSpot);
    await stand(T, out.x, out.z, out.yaw);
    await T.until(() => __game.fest.canJoin(), 30000);
    await T.tap('KeyE');
    await T.until(() => __game.fest.phase === 'round', 20000);
    let r = await st(T);
    check(r.joined, 'in the ring');
    const coins0 = r.coins;

    // 1. Eight hops on the beat: the cheer, Ole, Lasse's coin.
    let keys = await press(T, 6, 0.02);
    keys = keys.concat(await press(T, 1, 0.02));   // the seventh, shot in the air
    await T.until(() => __game.player.vy < 1 && !__game.player.onGround, 2000);
    await T.page.screenshot({ path: `${T.out}/grodorna_hopp.png` });
    r = await st(T);
    T.log('seven', keys.join(' '), JSON.stringify(r.stats), r.takt, JSON.stringify(r.last));
    check(r.streak === 7 && r.stats.hits === 7 && r.takt === 'I TAKT 7 / 8', `seven in a row (${r.streak}, ${r.takt})`);
    await T.until(() => __game.player.onGround, 2000);
    await T.shot('grodorna_takt');
    keys = await press(T, 1, 0.02);
    await T.frames(2);
    r = await st(T);
    T.log('eight', keys.join(' '), JSON.stringify(r.stats), JSON.stringify(r.last), r.takt, r.taktCls);
    check(r.stats.goals === 1 && r.last.kind === 'goal' && r.last.paid && r.paid, `eight: the goal, paid (${JSON.stringify(r.last)})`);
    check(r.takt === 'I TAKT 8 / 8' && r.taktCls.includes('goal'), `the counter shows 8 / 8 (${r.takt} ${r.taktCls})`);
    check(cfg.ring.filter((k) => r.o[k].cheer).length === cfg.ring.length, 'the ring cheers');
    check(r.coins === coins0 + cfg.pay, `Lasse's coin (${r.coins - coins0})`);
    await T.frames(20);
    await T.shot('grodorna_jubel');
    await T.until((l) => window.__said.includes(l), 5000, cfg.payLine);
    let s = await said(T);
    check(s.includes(cfg.cheer[1]) && s.indexOf(cfg.cheer[1]) < s.indexOf(cfg.payLine), `Ole's "Heia Norge!", then Lasse (${s})`);
    check(s.includes(cfg.join.line), 'Stig counts himself in');
    check(await T.ev((t) => [...document.querySelectorAll('.toast')].some((e) => e.textContent.includes(t)), `Lasse gav dig ${cfg.pay} pta.`), 'the coin toast');

    // 2. Off the beat (half a hop later): the ring laughs, the row is gone.
    await press(T, 2, 0.02);
    keys = await press(T, 1, 0.45);
    await T.frames(2);
    r = await st(T);
    T.log('off', keys, JSON.stringify(r.last), r.takt, JSON.stringify(r.stats));
    check(r.last.ok === false && Math.abs(r.last.off) > cfg.window && r.streak === 0 && r.stats.misses === 1, `off the beat: a miss (${JSON.stringify(r.last)})`);
    check(r.takt === 'OTAKT!' && r.taktCls.includes('miss'), `OTAKT! (${r.takt})`);
    const laughing = cfg.ring.filter((k) => r.o[k].laugh);
    check(laughing.length === 2 && laughing.includes('majsan') && laughing.includes('ole'), `the two nearest laugh (${laughing})`);
    await T.shot('grodorna_otakt');

    // 3. A ring hop missed breaks a row: one in, skip one, then one.
    const br0 = (await st(T)).stats.breaks;
    keys = await press(T, 2, 0.02, 1);
    r = await st(T);
    T.log('skip', keys.join(' '), JSON.stringify(r.stats), r.streak);
    check(r.stats.breaks === br0 + 1 && r.streak === 1, `a missed beat breaks the row (${JSON.stringify(r.stats)}, streak ${r.streak})`);

    // 4. Across the gap between the rounds: the row goes on (beat 0 of round 2 counts); a second
    //    eight in the visit: the cheer, but no second coin.
    await T.until(() => __game.fest.phase === 'pause', 40000);
    await T.until(() => __game.fest.phase === 'round' && __game.fest.round.n === 1 && (__game.fest.now() - __game.fest.round.t0) / __game.fest.beat > 22, 40000);
    const c1 = (await st(T)).coins;
    keys = await press(T, 8, 0.02);
    r = await st(T);
    T.log('over the gap', keys.join(' '), JSON.stringify(r.stats), JSON.stringify(r.last));
    check(keys.includes('2:0') && keys.some((k) => k.startsWith('1:')), `the eight span the gap (${keys})`);
    check(r.stats.goals === 2 && r.last.kind === 'goal' && !r.last.paid && r.coins === c1, `a second eight: no second coin (${JSON.stringify(r.last)})`);

    // 5. The music off: the rounds go on without the melody (no new cue), on the audio clock, and
    //    the beat is judged; with no audio clock at all (a suspended context) on the game's.
    await T.ev(() => import('/src/audio.js').then((m) => { m.audio.setMusic(false); window.__tradAt = m.audio.tradAt; }));
    await T.until(() => __game.fest.phase === 'pause', 30000);
    await T.until(() => __game.fest.phase === 'round', 20000);
    r = await st(T);
    const cue = await T.ev(() => import('/src/audio.js').then((m) => m.audio.tradAt === window.__tradAt));
    check(cue && r.round.game === false, `with the music off no melody, the audio clock (${JSON.stringify(r.round)})`);
    let h0 = r.stats.hits;
    keys = await press(T, 3, 0.02);
    r = await st(T);
    check(r.stats.hits === h0 + 3 && r.streak === 3, `judged with the music off (${JSON.stringify(r.stats)})`);
    await T.ev(() => import('/src/audio.js').then((m) => { window.__clock = m.audio.clock; m.audio.clock = () => null; }));
    await T.until(() => __game.fest.phase === 'gap' || __game.fest.phase === 'pause', 30000);
    await T.until(() => __game.fest.phase === 'round', 20000);
    r = await st(T);
    check(r.round.game === true, `with no audio clock the round is on the game clock (${JSON.stringify(r.round)})`);
    h0 = r.stats.hits;
    const s0 = r.streak;
    keys = await press(T, 3, 0.02);
    r = await st(T);
    check(r.stats.hits === h0 + 3 && r.streak === (r.round.n === 2 ? s0 + 3 : 3), `judged on the game clock (${JSON.stringify(r.stats)}, streak ${r.streak})`);
    await T.ev(() => import('/src/audio.js').then((m) => { m.audio.clock = window.__clock; m.audio.setMusic(true); }));

    // 6. The diving judges take the sisters out of the ring; home again, the fest takes them back.
    await T.hold(['KeyS'], 300);
    await T.frames(10);
    check(!(await st(T)).joined, 'out of the ring');
    const B = await T.L('flamencoBoard');
    await T.ev((x, z) => { const g = __game, p = g.player; p.state = 'normal'; p.teleport(x, z, Math.PI / 2); p.y = 2.4; p.onGround = false; p.vx = p.vz = p.vy = 0; g.jumps = 1; g.cam.yaw = Math.PI / 2; g.cam.snapNext = true; }, B.x - 0.5, B.z);
    await T.until(() => __game.player.vy > 10, 3000);
    await T.page.keyboard.down('KeyW');
    try { await T.until(() => __game.player.onGround && __game.player.vy <= 0 && __game.player.y < 0.5, 8000); } finally { await T.page.keyboard.up('KeyW'); }
    r = await st(T);
    const J = await T.ev(() => ({ out: Object.keys(__game.judges.out), last: __game.judges.last }));
    T.log('judges', JSON.stringify(J), JSON.stringify(r.held), r.o.siv.spot, r.o.majsan.spot);
    check(J.out.length === 2 && r.o.siv.spot === 'poolJudges' && r.o.majsan.spot === 'poolJudges' && !r.held.includes('siv') && !r.held.includes('majsan'), 'the judges take the sisters out of the ring');
    check(J.last?.kind === 'svanhopp', `the dive is judged (${JSON.stringify(J.last)})`);
    await T.ev(() => { const Jd = __game.judges; Jd.idleT = Jd.cfg.stayOut + 1; });
    await T.until(() => __game.fest.held.siv && __game.fest.held.majsan, 30000);
    await T.until(() => __game.fest.held.siv.at && __game.fest.held.majsan.at, 30000);
    r = await st(T);
    check(r.o.siv.spot === 'poolFest' && r.o.majsan.wade > 0.45, 'back in the ring');
  },
};
