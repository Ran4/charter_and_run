// Strandvolley mot Berra och Robban (free roam, DESIGN §10.50; feature 111): volley, volleyshots.
//   volley: at index 9 between missions, the court's live ball at its rest spot (no fixed ball left, the
//           boardwalk short of the court); "E Spela volley" at it. E: the fade, then Stig, Ole, Berra and
//           Robban on their marks, the ball on the sand before Stig, the board STIG & OLE 0–0 BERRA &
//           ROBBAN · FÖRST TILL 5, the keys, Berra's and Ole's intro. A real J serves it over the net. A
//           played match (an autopilot in Stig's place: to where the ball comes down, the kick in time):
//           points to both sides, the reasons on the board, Ole's set for Stig, the thirst lines, the end
//           at five (banner, records.volley, Berra and Robban off towards the bar, Ole free); no coins, no
//           SKANDAL. A lost match (Stig idle): "E Revansch!", E starts it again at 0–0; Q gives up ("Då går
//           vi till baren då."). Walking off the court ends a match. A mission start mid-match: everyone
//           home, the ball back, the board off. No prompt while Ole is the idle mission's giver (index 7)
//           or Stig is in a car. Out of a match the ball rolls when kicked and is back once Stig is away.
//   volleyshots: the court before, the start, a rally (the landing ring), their lob, the end banner.
import { check } from '../lib.mjs';

async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js');
    window.__said = []; window.__toasts = [];
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.key || 'x', text]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text.replace(/<[^>]+>/g, '')); return toast(text, ...a); };
    window.__hud = hud;
  });
}
// The autopilot in Stig's place: it walks (5.4 m/s) to where the ball comes down and kicks in time, aimed
// up to `spread`° off straight; `skill` of its kicks are in time (the rest 0.5 s early: a whiff).
async function bot(T, on, skill = 0.9, spread = 25) {
  await T.ev(({ on, skill, spread }) => {
    const g = __game, V = g.volley;
    if (!window.__vbot) {
      window.__vbot = { on: false, skill: 1, spread: 0, kicks: 0, whiffs: 0, early: false, off: 0, seen: null };
      g.onFrame((dt) => {
        const B = window.__vbot, p = g.player, b = V.b;
        if (!B.on || !V.playing || g.frozenT > 0 || p.state !== 'normal') return;
        if (V.touch !== B.seen) { B.seen = V.touch; B.off = (Math.random() * 2 - 1) * B.spread * Math.PI / 180; B.early = Math.random() > B.skill; }
        let aim = null;
        if (V.mode === 'serve' && V.next === 'us' && !b.held) aim = { x: b.x, z: b.z, t: 0 };
        else if (V.mode === 'rally' && V.plan?.side === 'us' && V.plan.chaser !== 'ole' && !V.plan.leave && !b.landed && V.touch?.who !== 'stig') {
          const q = V.predict(p.y + 0.9) || V.predict(V.F.y + V.cfg.ball.r);
          if (q) aim = q;
        }
        if (!aim) return;
        const c = V.c(aim.x, aim.z), s = V.w(c.u, c.v - V.cfg.kick.ahead), d = Math.hypot(s.x - p.x, s.z - p.z), step = Math.min(d, 5.4 * dt);
        if (d > 1e-3) { p.x += (s.x - p.x) / d * step; p.z += (s.z - p.z) / d * step; }
        p.yaw = V.F.yaw + B.off;
        // The kick: J's own path (main.handleOneShots) when the ball is about to be in reach.
        const fire = V.mode === 'serve' ? d < 0.3 : aim.t < (B.early ? 0.55 : 0.09) && d < 0.6;
        if (fire && g.kickT <= 0) {
          p.anim.kick = 1; g.kickT = 0.6; g.kickHitT = 0.11; V.swing(); B.kicks++;
          if (B.early && V.mode !== 'serve') B.whiffs++;
        }
      });
    }
    Object.assign(window.__vbot, { on, skill, spread });
  }, { on, skill, spread });
}
const st = (T) => T.ev(() => {
  const g = __game, V = g.volley, p = g.player, e = document.getElementById('volley'), it = g.nearestInteractable();
  const at = (k) => { const n = k === 'stig' ? p : g.npcs[k], q = V.c(n.x, n.z); return { u: +q.u.toFixed(2), v: +q.v.toFixed(2), d: +Math.hypot(q.u, q.v).toFixed(1) }; };
  const bq = V.c(V.b.x, V.b.z);
  return {
    mode: V.mode, score: V.score.slice(), next: V.next, thirst: V.thirst, playing: V.playing, walk: !!V.walk, held: Object.keys(V.held),
    ball: { u: +bq.u.toFixed(2), v: +bq.v.toFixed(2), y: +V.b.y.toFixed(2), held: V.b.held, rest: V.atRest(), landed: V.b.landed },
    near: it?.type === 'it' ? it.it.id : it?.type || null, prompt: window.__hud._prompt || '',
    board: e.classList.contains('show') ? e.textContent : null, why: e.classList.contains('why'),
    stig: at('stig'), ole: at('ole'), berra: at('berra'), robban: at('robban'),
    posed: ['ole', 'berra', 'robban'].map((k) => g.npcPosed(k)), busy: ['ole', 'berra', 'robban'].map((k) => g.npcs[k].busy),
    coins: g.coins, shame: g.shame.v, ms: g.missions.state, idx: g.missions.index, rec: g.records.volley || null,
    frozen: g.frozenT, last: V.last, log: V.log.slice(), inDialog: g.inDialog,
  };
});
// Stig on foot at court [u, v], facing the net.
async function onCourt(T, u, v) {
  await T.ev(({ u, v }) => {
    const g = __game, V = g.volley, q = V.w(u, v);
    if (g.playerCar) g.exitCar(true);
    g.debugWarp(q.x, q.z, V.F.yaw);
    g.cam.yaw = V.F.yaw;
  }, { u, v });
  await T.frames(6);
}
// The same without debugWarp (which ends a match or the rematch's wait).
async function standAt(T, u, v) {
  await T.ev(({ u, v }) => { const g = __game, V = g.volley, q = V.w(u, v); g.player.teleport(q.x, q.z, V.F.yaw); g.cam.yaw = V.F.yaw; g.cam.snapNext = true; }, { u, v });
  await T.frames(6);
}
async function playOut(T, label, ms = 150000) {
  await T.until(() => __game.volley.mode === 'end' || !__game.volley.playing, ms);
  const r = await st(T);
  T.log(label, JSON.stringify({ score: r.score, mode: r.mode, log: r.log.map((x) => `${x.team[0]}:${x.why}`).join(' '), bot: await T.ev(() => window.__vbot) }));
  return r;
}

export const SCENARIOS = {
  async volley(T) {
    await T.fresh('&mission=9');
    await spies(T);
    let r = await st(T);
    check(r.ms === 'idle' && r.idx === 9, `free roam at index 9 (${r.ms} ${r.idx})`);
    check(r.ball.rest && !r.mode, `the ball at its rest spot, no match (${JSON.stringify(r.ball)})`);
    const coins0 = r.coins;

    // 1. The prompt at the ball; not from a car.
    await onCourt(T, 1.2, -2.6);
    r = await st(T);
    T.log('at the ball', JSON.stringify({ near: r.near, prompt: r.prompt }));
    check(r.near === 'volley' && /Spela volley/.test(r.prompt), `"E Spela volley" at the ball (${r.near}, "${r.prompt}")`);
    await T.shot('volley_prompt');

    // 2. E: the fade, then everyone on their marks.
    await T.tap('KeyE');
    r = await st(T);
    check(r.mode === 'fade' && r.frozen > 0 && r.posed.every(Boolean), `E: the fade, Stig held, the three ours (${JSON.stringify(r)})`);
    await T.until(() => __game.volley.mode === 'serve', 5000);
    await T.frames(4);
    r = await st(T);
    T.log('placed', JSON.stringify(r));
    const mk = { stig: [1.0, -2.8], ole: [-2.2, -2.0], berra: [1.9, 2.3], robban: [-2.0, 2.6] };
    for (const [k, [u, v]] of Object.entries(mk)) check(Math.hypot(r[k].u - u, r[k].v - v) < 0.6, `${k} on his mark (${JSON.stringify(r[k])} vs ${u}, ${v})`);
    check(r.ball.v < 0 && Math.abs(r.ball.u - 1.0) < 0.3 && Math.abs(r.ball.v + 1.9) < 0.3, `the ball on the sand before Stig (${JSON.stringify(r.ball)})`);
    check(r.board && /STIG & OLE/.test(r.board) && /BERRA & ROBBAN/.test(r.board) && /0–0/.test(r.board.replace(/\s/g, '')) && /FÖRST TILL 5/.test(r.board),
      `the board STIG & OLE 0–0 BERRA & ROBBAN · FÖRST TILL 5 ("${r.board}")`);
    check(/Sparka/.test(r.prompt) && /Ge upp/.test(r.prompt), `the keys in the prompt ("${r.prompt}")`);
    await T.sleep(2600);
    let said = await T.ev(() => window.__said.map(([w, t]) => `${w}: ${t}`));
    check(said.some((l) => /^berra: En match/.test(l)) && said.some((l) => /^ole: Nå tar vi dem/.test(l)), `the intro (${said.join(' | ')})`);
    await T.shot('volley_start');

    // 3. A real J serves the ball over the net.
    await T.ev(() => { const g = __game, V = g.volley, p = g.player, q = V.c(V.b.x, V.b.z), s = V.w(q.u, q.v - 0.6); p.teleport(s.x, s.z, V.F.yaw); });
    await T.frames(2);
    await T.tap('KeyJ');
    await T.frames(4);
    r = await st(T);
    T.log('served', JSON.stringify({ mode: r.mode, ball: r.ball, last: r.last }));
    check(r.mode === 'rally' && r.last?.kind === 'kick' && r.last.who === 'stig', `J: the serve, a rally (${JSON.stringify(r.last)})`);
    const crossed = await T.until(() => { const V = __game.volley; return V.c(V.b.x, V.b.z).v > 0.3 || V.mode !== 'rally'; }, 4000).then(() => true, () => false);
    r = await st(T);
    check(crossed && (r.ball.v > 0 || r.log.length), `over the net (${JSON.stringify(r.ball)} ${JSON.stringify(r.log)})`);

    // 4. The autopilot plays the match out.
    await bot(T, true, 0.92, 20);
    r = await playOut(T, 'match 1', 300000);
    check(r.mode === 'end' && Math.max(...r.score) === 5, `first to five (${r.score})`);
    const whys = new Set(r.log.map((x) => x.why));
    check(r.log.length >= 5 && r.log.length <= 9, `5–9 points (${r.log.length})`);
    said = await T.ev(() => window.__said.map(([w, t]) => `${w}: ${t}`));
    T.log('said', said.join(' | '));
    T.log('reasons', [...whys].join(' '));
    const won = r.score[0] === 5;
    check(r.rec && (won ? r.rec.won === 1 : r.rec.lost === 1), `records.volley (${JSON.stringify(r.rec)})`);
    if (r.log.length >= 3) check(said.some((l) => /^robban: Jag är törstig, Berra\./.test(l)) && said.some((l) => /^berra: Du har ingen karaktär alls, Robban\./.test(l)), 'the first thirst pair after the 2nd point');
    await T.shot('volley_end');
    check(r.coins === coins0 && r.shame === 0, `no pay, no SKANDAL (${r.coins} vs ${coins0}, ${r.shame})`);
    await bot(T, false);

    // 5. After the end: won, they walk off; lost, the rematch waits.
    await T.until(() => __game.volley.mode !== 'end', 8000);
    r = await st(T);
    said = await T.ev(() => window.__said.map(([w, t]) => `${w}: ${t}`));
    if (won) {
      check(!r.mode && r.walk && said.some((l) => /^berra: Nu går vi till baren, Robban\./.test(l)), `won: off to the bar (${JSON.stringify(r)})`);
      await T.until(() => !__game.volley.walk, 40000);
      r = await st(T);
      check(!r.posed.some(Boolean) && r.berra.v < -20 && r.robban.v < -20, `Berra and Robban up by the paseo, free (${JSON.stringify(r)})`);
    } else check(r.mode === 'rematch', `lost: the rematch (${r.mode})`);

    // 6. A lost match (Stig idle): "E Revansch!", E plays again, Q gives up.
    if (won) {
      await T.until(() => __game.volley.canStart(), 30000).catch(() => {});
      await T.ev(() => { const V = __game.volley; if (!V.inCourt(V.b.x, V.b.z, 1)) V.home(); });
      const b = await T.ev(() => { const V = __game.volley, q = V.c(V.b.x, V.b.z); return [q.u, q.v]; });
      await onCourt(T, b[0], b[1] - 1.2);
      r = await st(T);
      check(r.near === 'volley', `the prompt again after they have left (${r.near}, ${JSON.stringify(r.posed)})`);
      await T.tap('KeyE');
      await T.until(() => __game.volley.mode === 'serve', 5000);
      await T.ev(() => { const g = __game, V = g.volley, p = g.player, q = V.c(V.b.x, V.b.z), s = V.w(q.u, q.v - 0.6); p.teleport(s.x, s.z, V.F.yaw); });
      await T.frames(2);
      await T.tap('KeyJ');
      r = await playOut(T, 'match 2 (idle)', 300000);
      check(r.score[1] === 5, `Stig idle: Berra and Robban win (${r.score})`);
      await T.until(() => __game.volley.mode === 'rematch', 8000);
    }
    r = await st(T);
    check(r.mode === 'rematch' && (await T.ev(() => __game.records.volley.lost)) >= 1, `the rematch after a loss (${r.mode})`);
    await standAt(T, 0, -2);
    r = await st(T);
    check(r.near === 'volley' && /Revansch/.test(r.prompt), `"E Revansch!" (${r.near}, "${r.prompt}")`);
    await T.shot('volley_revansch');
    await T.tap('KeyE');
    await T.until(() => __game.volley.mode === 'serve', 5000);
    r = await st(T);
    check(r.score[0] === 0 && r.score[1] === 0 && r.board && /0–0/.test(r.board.replace(/\s/g, '')), `the rematch at 0–0 (${r.score})`);
    await T.ev(() => { window.__said = []; });
    await T.tap('KeyQ');
    await T.frames(30);
    r = await st(T);
    said = await T.ev(() => window.__said.map(([w, t]) => `${w}: ${t}`));
    check(!r.mode && r.walk && r.last.kind === 'abort' && r.last.why === 'quit' && !r.board, `Q: given up, the board off (${JSON.stringify(r.last)})`);
    check(said.some((l) => /^berra: Då går vi till baren då\./.test(l)), `Berra's line (${said.join(' | ')})`);
    check(!r.posed[0] && !r.busy[0], `Ole free (${r.posed} ${r.busy})`);
    await T.until(() => !__game.volley.walk, 40000);

    // 7. Walking off the court ends a match.
    await T.ev(() => { const V = __game.volley; V.home(); for (const k of ['ole', 'berra', 'robban']) { const n = __game.npcs[k]; n.busy = false; } });
    await onCourt(T, 1.2, -2.6);
    await T.until(() => __game.volley.canStart(), 10000);
    await T.tap('KeyE');
    await T.until(() => __game.volley.mode === 'serve', 5000);
    await T.ev(() => { const g = __game, V = g.volley, q = V.w(0, -16); g.player.teleport(q.x, q.z, V.F.yaw + Math.PI); });
    await T.until(() => !__game.volley.mode, 5000);
    r = await st(T);
    check(r.last.kind === 'abort' && r.last.why === 'leave', `off the court: the match off (${JSON.stringify(r.last)})`);
    await T.until(() => !__game.volley.walk, 40000);

    // 8. A mission start mid-match: everyone home, the ball back, the board off.
    await T.ev(() => { const V = __game.volley; V.home(); });
    await onCourt(T, 1.2, -2.6);
    await T.until(() => __game.volley.canStart(), 10000);
    await T.tap('KeyE');
    await T.until(() => __game.volley.mode === 'serve', 5000);
    await T.ev(() => { const g = __game, V = g.volley, p = g.player, q = V.c(V.b.x, V.b.z), s = V.w(q.u, q.v - 0.6); p.teleport(s.x, s.z, V.F.yaw); });
    await T.frames(2);
    await T.tap('KeyJ');
    await T.frames(20);
    await T.ev(() => __game.missions.begin());
    await T.frames(4);
    r = await st(T);
    T.log('mission start', JSON.stringify(r));
    check(!r.mode && !r.walk && r.held.length === 0 && r.ball.rest && !r.board && r.last.kind === 'gone', `a mission start: all off, the ball back (${JSON.stringify(r)})`);
    const home = await T.ev(() => ['ole', 'berra', 'robban'].map((k) => { const n = __game.npcs[k]; return [k, n.steer ? 'steer' : '', +Math.hypot(n.x - __game.volley.F.x, n.z - __game.volley.F.z).toFixed(0)]; }));
    check(home.every(([, s, d]) => !s && d > 40), `everyone off the court, home (${JSON.stringify(home)})`);
    T.log('result', await T.ev(() => document.querySelector('#hud') ? 'ok' : ''));
  },

  // Index 7: Ole is asnan's giver, no match; out of a match the ball rolls and comes back.
  async volleyfree(T) {
    await T.fresh('&mission=7');
    await spies(T);
    await onCourt(T, 1.2, -2.6);
    let r = await st(T);
    check(r.near !== 'volley', `no match while Ole has a mission to give (${r.near})`);
    // A kick moves it.
    await T.ev(() => { const V = __game.volley, p = __game.player, q = V.c(V.b.x, V.b.z), s = V.w(q.u, q.v - 0.6); p.teleport(s.x, s.z, V.F.yaw); });
    await T.frames(2);
    await T.tap('KeyJ');
    await T.frames(40);
    r = await st(T);
    T.log('kicked', JSON.stringify(r.ball));
    check(!r.ball.rest && r.ball.v > -1.0, `a free kick sends it on (${JSON.stringify(r.ball)})`);
    // A car pushes it.
    await T.until(() => __game.volley.b.landed && Math.hypot(__game.volley.b.vx, __game.volley.b.vz) < 0.01, 10000).catch(() => {});
    await T.ev(() => { const g = __game, V = g.volley, b = V.b, q = V.c(b.x, b.z), s = V.w(q.u + 0.2, q.v - 6); g.debugWarp(s.x, s.z, V.F.yaw); });
    await T.anyCar();
    await T.ev(() => { const g = __game, V = g.volley, b = V.b, q = V.c(b.x, b.z), s = V.w(q.u, q.v - 6); g.playerCar.place(s.x, s.z, V.F.yaw); g.playerCar.vx = Math.sin(V.F.yaw) * 6; g.playerCar.vz = Math.cos(V.F.yaw) * 6; });
    const b0 = await T.ev(() => ({ ...__game.volley.b }));
    await T.holdUntil('KeyW', () => { const V = __game.volley; return Math.hypot(V.b.vx, V.b.vz) > 2; }, 6000).catch(() => {});
    const b1 = await T.ev(() => ({ ...__game.volley.b }));
    T.log('car', JSON.stringify({ b0: [b0.x, b0.z], b1: [b1.x, b1.z, b1.vx, b1.vz] }));
    check(Math.hypot(b1.vx, b1.vz) > 2 || Math.hypot(b1.x - b0.x, b1.z - b0.z) > 1, 'the car knocks the ball on');
    await T.ev(() => __game.exitCar(true));
    // Away: back on the court.
    await T.ev(() => { const V = __game.volley, q = V.w(0, -60); __game.debugWarp(q.x, q.z, 0); });
    await T.frames(10);
    r = await st(T);
    check(r.ball.rest, `back at its rest spot once Stig is away (${JSON.stringify(r.ball)})`);
    // From a car: no prompt.
    await onCourt(T, 1.2, -2.6);
    r = await st(T);
    check(r.near !== 'volley', `still no match at index 7 (${r.near})`);
  },

  async volleyshots(T) {
    await T.fresh('&mission=9');
    await T.ev(() => { const g = __game, V = g.volley, q = V.w(-1, -9.5); g.debugWarp(q.x, q.z, V.F.yaw); g.cam.yaw = V.F.yaw; g.cam.pitch = 0.32; });
    await T.frames(20);
    await T.shot('volley_court');
    await T.ev(() => { const g = __game, V = g.volley, q = V.w(1.2, -2.6); g.debugWarp(q.x, q.z, V.F.yaw); g.cam.yaw = V.F.yaw; });
    await T.frames(6);
    await T.tap('KeyE');
    await T.until(() => __game.volley.mode === 'serve', 5000);
    await T.sleep(800);
    await T.shot('volley_shot_start');
    await bot(T, true, 0.92, 20);
    await T.until(() => { const V = __game.volley; return V.mode === 'rally' && V.plan?.side === 'them' && V.b.vy < 0; }, 20000);
    await T.shot('volley_shot_over');
    await T.until(() => { const V = __game.volley; return V.mode === 'rally' && V.touch?.team === 'them' && !V.b.landed && V.b.vy > 0; }, 30000);
    await T.frames(6);
    await T.shot('volley_shot_lob');
    await T.until(() => { const V = __game.volley; return V.mode === 'point'; }, 30000);
    await T.frames(10);
    await T.shot('volley_shot_point');
    await T.until(() => __game.volley.mode === 'end', 300000);
    await T.sleep(600);
    await T.shot('volley_shot_end');
  },
};
