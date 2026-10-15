// Grisfest varje torsdag – 800 pesetas (free roam, DESIGN §10.18; feature 21).
//   torsdag:     at index 11 no host prompt; at index 12 (after the grisfest) Stig at the gate gets the
//                exchange ("Är det torsdag i dag?" / "Här är det alltid torsdag, señor. …"), E with too
//                few pesetas the host's refusal (nothing paid, no evening); E with 2 000: 800 paid, the
//                black fade, the watch on to 21:00 and held there, the night palette, the vals, the band
//                of three on the stage, the five tourists and the cast on and round the floor (no Ole
//                before julafton is done, no Angerud), Stig on the drive; the host walks his round with
//                a cup and offers sangria; Fru Storch's coffee question (no reply without Ole); a kicked
//                tourist goes back to her place; E on a solo tourist: his line, she turns her back, "Jag
//                är skraj att de ska nobba.", Majsan comes, the two-shot, the invitation, the dance;
//                standing still by Majsan he dances, a step away he stops; out of the gate: the morning
//                after (08:00, the clock running), everyone home, the band gone, the tune back.
//   torsdagOle:  after the end (index 13 with julafton's unlock): Ole dances in his grisfest shirt and
//                answers Fru Storch ("Norsk, da?"), "Heia Norge!"; then a mission start mid-evening
//                (at index 12, julafton): everything off at once, the clock's morning cut, the intro.
import { check } from '../lib.mjs';

const PI = Math.PI;
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || 'ped', text]);
      return o(t, text, secs);
    };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const inOrder = (s, want) => {
  const idx = want.map(([w, t]) => s.findIndex(([a, b]) => a === w && b === t));
  return idx.every((k, i) => k >= 0 && (i === 0 || k > idx[i - 1]));
};
const st = (T) => T.ev(() => {
  const g = __game, P = g.party, p = g.player;
  return {
    on: P.on, busy: P.busy, held: Object.keys(P.held).sort(), extras: P.extras.length, last: P.last, invited: P.invited,
    h: +g.day.h.toFixed(3), hold: g.day.hold, sky: g.sky,
    coins: g.coins, p: { x: +p.x.toFixed(2), z: +p.z.toFixed(2), dance: !!p.anim.dance }, inDialog: g.inDialog,
  };
});
const tune = (T) => T.ev(async () => (await import('/src/audio.js')).audio.tune);
const prompt = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it?.type === 'it' ? it.it.id : it?.type ?? null; });
const stand = (T, x, z, yaw) => T.ev((x, z, yaw) => { const g = __game, p = g.player; if (g.playerCar) g.exitCar(true); p.teleport(x, z, yaw); p.vx = p.vz = 0; g.cam.yaw = yaw; g.cam.snapNext = true; }, x, z, yaw);
const npcAt = (T, k) => T.ev((k) => { const n = __game.npc(k); return { x: +n.x.toFixed(2), z: +n.z.toFixed(2), busy: n.busy, spot: n.spot, dance: !!n.anim.dance, outfit: n.outfit ?? null, vis: n.root.visible }; }, k);
const homeOf = (T, k) => T.ev((k) => { const g = __game, h = g.homeOverrides[k] ?? g.levelDef.homes(g)[k]; return g.lmOffset(h[0], h[1], h[2]); }, k);
const near = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
// The floor's point (dx, dz): dansgolv faces yaw 0.
const F = (dx, dz) => ({ x: -80 + dx, z: -240 + dz });

async function payAtGate(T, coins) {
  await T.ev((c) => { const g = __game; g.coins = c; }, coins);
  await stand(T, -83, -212, PI);
  await T.frames(5);
  await T.tap('KeyE');
}

export const SCENARIOS = {
  async torsdag(T) {
    // 0. Before the grisfest is done: no prompt at the host.
    await T.fresh('&mission=11');
    await T.frames(20);
    await stand(T, -83, -212, PI);
    await T.frames(10);
    check((await prompt(T)) !== 'grisfest:pay', 'no pay prompt at index 11');

    await T.fresh('&mission=12');
    await T.frames(20);
    const cfg = await T.ev(() => JSON.parse(JSON.stringify(__game.party.cfg)));
    await resetSaid(T);
    // 1. The gate exchange as Stig comes up to the host.
    await stand(T, -83, -205, PI);
    await T.frames(5);
    await stand(T, -83, -209.5, PI);
    await T.sleep(1600);
    await T.shot('torsdag_gate');
    await T.sleep(1200);
    let s = await said(T);
    check(inOrder(s, cfg.greet.map(([, w, t]) => [w, t])), `the gate exchange in order (${JSON.stringify(s)})`);
    await stand(T, -83, -212, PI);
    await T.frames(5);
    check((await prompt(T)) === 'grisfest:pay', 'the pay prompt by the host');
    const ptext = await T.ev(() => document.getElementById('prompt')?.textContent || '');
    T.log('prompt', ptext);
    check(/Betala grisfesten \(800 pta\)/.test(ptext), 'prompt "Betala grisfesten (800 pta)"');

    // 2. Too few pesetas: the refusal, nothing paid.
    await resetSaid(T);
    await payAtGate(T, 650);
    await T.sleep(400);
    s = await said(T);
    let r = await st(T);
    check(s.some(([w, t]) => w === 'varden' && t === cfg.short), 'the host refuses: "Åttahundra, señor. Inte en peseta mindre."');
    check(r.coins === 650 && !r.on, 'nothing paid, no evening');

    // 3. 2 000 pesetas: paid, the evening.
    const h0 = r.h;
    await resetSaid(T);
    await payAtGate(T, 2000);
    await T.until(() => document.getElementById('fade').classList.contains('on'), 3000);
    await T.until(() => __game.party.last?.kind === 'evening', 15000);
    r = await st(T);
    T.log('evening', JSON.stringify(r));
    check(r.coins === 1200, `800 paid (${r.coins})`);
    check(r.h === 21 && r.hold && r.sky === 'night', `21:00 held, night (${h0} -> ${r.h}, ${r.sky})`);
    check((await tune(T)) === 'vals', 'the vals plays');
    const want = ['berra', 'fruStorch', 'herrStorch', 'majsan', 'robban', 'siv', 'varden'];
    check(JSON.stringify(r.held) === JSON.stringify(want), `the cast without Ole or Angerud (${r.held})`);
    check(r.extras === cfg.band.length + cfg.tourists.length, `band and tourists out (${r.extras})`);
    const ext = await T.ev(() => __game.party.cast.map((e) => ({ x: +e.ch.x.toFixed(2), y: +e.ch.y.toFixed(2), z: +e.ch.z.toFixed(2), vis: e.ch.root.visible, held: e.ch.def.held ?? null, dance: !!e.ch.anim.dance })));
    T.log('extras', JSON.stringify(ext));
    check(ext.slice(0, 3).every((e) => Math.abs(e.y - 1.0) < 0.05 && e.vis), 'the band stands on the bandstand (1.0)');
    check(ext[0].held === 'accordion' && ext[2].held === 'congas', 'accordion and congas');
    check(ext.slice(3).every((e) => Math.abs(e.y - 0.4) < 0.05 && e.dance), 'the tourists dance on the floor (0.4)');
    check(near(r.p, F(0, 20), 0.6), `Stig on the gravel drive (${JSON.stringify(r.p)})`);
    for (const k of ['berra', 'siv', 'robban']) check((await npcAt(T, k)).dance, `${k} dances`);
    check(!(await npcAt(T, 'majsan')).dance, 'Majsan watches from the edge');
    const ang = await npcAt(T, 'angerud');
    check(!near(ang, F(0, 0), 60), 'no Angerud at the farm');
    await T.sleep(500);
    await T.shot('torsdag_evening');
    // The clock stands still (even when it runs).
    await T.ev(() => { __game.day.run = true; });
    await T.sleep(2500);
    check((await st(T)).h === 21, 'the clock held at 21:00');
    await T.ev(() => { __game.day.run = false; });
    // A wide look at the floor and the band from the drive's end, raised.
    await T.ev(() => __game.cam.cutTo({ x: -80 + 9, y: 7.5, z: -240 + 17 }, { x: -80, y: 1.2, z: -240 - 8 }));
    await T.sleep(600);
    await T.shot('torsdag_floor');
    await T.ev(() => { __game.cam.cutTo({ x: -80 + 1.5, y: 3.2, z: -240 - 10 }, { x: -80, y: 2.0, z: -240 - 19 }); });
    await T.sleep(400);
    await T.shot('torsdag_band');
    await T.ev(() => { __game.cam.release(); __game.cam.snapNext = true; });

    // 4. The host's round with the cup, the sangria line.
    const v0 = await npcAt(T, 'varden');
    const cup = await T.ev(() => !!__game.npc('varden').anim.cupHeld);
    check(cup, 'the host holds a cup');
    await resetSaid(T);
    await stand(T, -80 - 9.0 + 1.5, -240 + 3, -PI / 2);
    await T.sleep(9000);
    const v1 = await npcAt(T, 'varden');
    s = await said(T);
    T.log('host', JSON.stringify({ v0, v1, s }));
    check(!near(v0, v1, 0.5), 'the host walks his round');
    check(s.some(([w, t]) => w === 'varden' && t === cfg.sangria.line), '"Sangrian, grabbar."');

    // 5. Fru Storch's question at the long table (no Ole: no reply); Stig by the host's west end is
    // within its reach already.
    const fs = await npcAt(T, 'fruStorch');
    await stand(T, fs.x + 5, fs.z + 3, -PI / 2);
    await T.until(() => __game.party.coffee, 4000);
    await T.sleep(2600);
    s = await said(T);
    check(s.filter(([w]) => w === 'fruStorch').length === 1, 'asked once an evening');
    check(s.some(([w, t]) => w === 'fruStorch' && t === cfg.coffee.ask[1]), '"Finns det svenskt kaffe på grisfesten?"');
    check(!s.some(([, t]) => t === cfg.coffee.reply[1]), 'no "Norsk, da?" without Ole');

    // 6. A kicked tourist flies, gets up and goes back to her place.
    const t0 = await T.ev(() => { const e = __game.party.cast[4]; return { x: e.x, z: e.z }; });
    await T.ev((t0) => { const g = __game; g.areaHit(t0.x - 0.6, t0.z, 0.4, 1.0, 1, 0, false); }, t0);
    await T.frames(3);
    const flung = await T.ev(() => __game.party.cast[4].ch.state);
    await T.until(() => { const e = __game.party.cast[4]; return e.ch.state === 'normal' && Math.hypot(e.ch.x - e.x, e.ch.z - e.z) < 0.4; }, 20000);
    check(flung === 'flung', `the kick bowls her over (${flung})`);
    check(true, 'she is back at her place');

    // 7. The invitation.
    await resetSaid(T);
    const tq = await T.ev(() => { const e = __game.party.cast.find((c) => c.solo); return { x: e.ch.x, z: e.ch.z, i: __game.party.cast.indexOf(e) }; });
    await stand(T, tq.x - 1.2, tq.z + 0.6, Math.atan2(1.2, -0.6));
    await T.frames(5);
    check((await prompt(T)) === 'grisfest:ask', 'the ask prompt by a solo tourist');
    const ptext2 = await T.ev(() => document.getElementById('prompt')?.textContent || '');
    check(/Bjud upp/.test(ptext2), `prompt "Bjud upp" (${ptext2})`);
    const yaw0 = await T.ev((i) => __game.party.cast[i].ch.yaw, tq.i);
    await T.tap('KeyE');
    await T.until(() => __game.party.last?.step === 'away', 5000);
    await T.sleep(700);
    const away = await T.ev((i) => { const g = __game, ch = g.party.cast[i].ch, p = g.player; const f = Math.sin(ch.yaw) * (p.x - ch.x) + Math.cos(ch.yaw) * (p.z - ch.z); return { f, yaw: ch.yaw }; }, tq.i);
    T.log('away', JSON.stringify({ yaw0, away }));
    check(away.f < 0, 'she turns her back on him');
    await T.shot('torsdag_nobbad');
    await T.until(() => __game.party.last?.step === 'invite', 6000);
    await T.sleep(150);
    await T.shot('torsdag_invite');
    T.log('pair', JSON.stringify(await T.ev(() => __game.party.last.pair)));
    const m = await npcAt(T, 'majsan');
    r = await st(T);
    check(near(m, r.p, 1.4), `Majsan in front of him (${JSON.stringify(m)} vs ${JSON.stringify(r.p)})`);
    await T.until(() => __game.party.last?.step === 'dance', 15000);
    await T.sleep(300);
    r = await st(T);
    check(r.p.dance && (await npcAt(T, 'majsan')).dance && r.invited, 'Stig and Majsan dance');
    await T.shot('torsdag_dance');
    s = await said(T);
    check(inOrder(s, [['stig', cfg.ask.line], ['stig', cfg.ask.scared]]), `his line, then "Jag är skraj att de ska nobba." (${JSON.stringify(s)})`);
    await T.until(() => __game.party.last?.step === 'done', 10000);
    await T.frames(10);
    check((await st(T)).p.dance, 'standing still by her he dances on');
    check((await prompt(T)) !== 'grisfest:ask', 'no ask prompt after the invitation');
    await T.hold(['KeyS'], 700);
    await T.frames(5);
    check(!(await st(T)).p.dance, 'a step away and he stops');

    // 8. Out of the gate: the morning after.
    await stand(T, -80, -207.5, 0);
    await T.until(() => __game.party.last?.kind === 'morning', 15000);
    await T.until(() => !__game.inDialog, 5000);
    r = await st(T);
    T.log('morning', JSON.stringify(r));
    check(!r.on && r.h === cfg.morning && !r.hold && r.sky === 'day', `the morning after at 08:00, the clock free (${r.h}, ${r.sky})`);
    check(!r.held.length && !r.extras, 'nobody held, the band and the tourists gone');
    check((await tune(T)) === 'sol', 'the island tune again');
    for (const k of ['majsan', 'siv', 'fruStorch', 'herrStorch']) {
      const n = await npcAt(T, k), hq = await homeOf(T, k);
      check(near(n, hq, 1) && !n.busy && !n.dance, `${k} at home, free`);
    }
    // Berra and Robban: home, or the Berra job's nap again (it waits during the evening).
    const bj = await T.ev(() => ({ shown: __game.berraJob.shown, phase: __game.berraJob.phase }));
    for (const k of ['berra', 'robban']) {
      const n = await npcAt(T, k), hq = await homeOf(T, k);
      check((near(n, hq, 1) && !n.busy) || bj.shown, `${k} home or napping again (${JSON.stringify({ n, bj })})`);
      check(n.spot !== 'grisfestFree' && !n.dance, `${k} not ours`);
    }
    check(near(await npcAt(T, 'varden'), await homeOf(T, 'varden'), 1), 'the host back at his post');
    await T.sleep(300);
    await T.shot('torsdag_morning');
  },

  async torsdagOle(T) {
    // After the end: Ole at the evening in his grisfest shirt.
    await T.fresh('&mission=13');
    await T.frames(20);
    await T.ev(() => { const g = __game; g.player.teleport(-80, -190, Math.PI); g.unlock('bodega'); g.placeNpcs(true); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    await T.frames(10);
    const cfg = await T.ev(() => JSON.parse(JSON.stringify(__game.party.cfg)));
    await resetSaid(T);
    await payAtGate(T, 900);
    await T.until(() => __game.party.last?.kind === 'evening', 15000);
    let r = await st(T);
    T.log('evening', JSON.stringify(r));
    check(r.held.includes('ole'), 'Ole at the evening');
    check(!r.held.includes('angerud'), 'no Angerud');
    const ole = await npcAt(T, 'ole');
    check(ole.outfit === 'gris' && ole.dance, `Ole dances in his grisfest shirt (${ole.outfit})`);
    await T.ev(() => __game.cam.cutTo({ x: -80 + 2, y: 3.0, z: -240 + 10 }, { x: -80, y: 1.3, z: -240 + 1 }));
    await T.sleep(500);
    await T.shot('torsdag_ole');
    await T.ev(() => { __game.cam.release(); __game.cam.snapNext = true; });
    // Fru Storch asks, Ole answers; "Heia Norge!" near him.
    const fs = await npcAt(T, 'fruStorch');
    await stand(T, fs.x + 5, fs.z + 3, -PI / 2);
    await T.until(() => __game.party.coffee, 4000);
    await T.sleep(3200);
    await stand(T, ole.x, ole.z + 3, PI);
    await T.sleep(12000);
    let s = await said(T);
    T.log('said', JSON.stringify(s));
    check(inOrder(s, [cfg.coffee.ask, cfg.coffee.reply]), '"Finns det svenskt kaffe på grisfesten?" / "Norsk, da?"');
    check(s.some(([w, t]) => w === 'ole' && t === cfg.heia.line), '"Heia Norge!"');
    await stand(T, -80, -207.5, 0);
    await T.until(() => __game.party.last?.kind === 'morning', 15000);
    await T.until(() => !__game.inDialog, 5000);
    const o2 = await npcAt(T, 'ole');
    check(o2.outfit !== 'gris', `Ole's shirt off again (${o2.outfit})`);

    // A mission start mid-evening (index 12, julafton): all off at once, the morning cut, the intro.
    await T.fresh('&mission=12');
    await T.frames(20);
    await payAtGate(T, 900);
    await T.until(() => __game.party.last?.kind === 'evening', 15000);
    // The state two frames after the talk starts, read in the page.
    r = await T.ev(() => new Promise((res) => {
      const g = __game, P = g.party;
      g.missions.begin();
      requestAnimationFrame(() => requestAnimationFrame(() => res({ on: P.on, held: Object.keys(P.held), extras: P.extras.length, hold: g.day.hold, state: g.missions.state })));
    }));
    T.log('mission start', JSON.stringify(r));
    check(!r.on && !r.held.length && !r.extras && !r.hold, 'a mission start ends the evening at once');
    await T.until(() => __game.missions.state === 'running', 60000);
    r = await st(T);
    check(r.sky === 'day' && r.h >= 7 && r.h < 19, `the mission starts by day (${r.h}, ${r.sky})`);
    check((await tune(T)) !== 'vals', 'no vals in the mission');
  },
};
