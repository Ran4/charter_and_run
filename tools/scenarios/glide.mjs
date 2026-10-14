// Jag kan flyga – the glide (free roam after julafton, DESIGN §10.7; feature 3): glide.
//   glide: before the unlock J in the air is the stomp, held or not, and no toast; with `bodega`
//          the first jump shows the unlock toast (once); a quick J in the air still stomps; from the
//          dream plane's wing (jump, double jump, hold J) he glides out at about 2.4 m/s down and 5 m/s
//          on, about 12 m, the mantra in his bubble, then rolls onto his back and gets up; off the
//          wingtip straight at the palm he goes round the trunk, never held there; from Flamenco's
//          diving board (the bounce and a double jump) over the pool into the shallow end, a splash,
//          Lasse's line on the radio (only the first time ever), Ole's shout when he is near; the
//          held direction turns him a little; nothing in a mission, in a car or while carrying.
import { check } from '../lib.mjs';

const st = (T) => T.ev(() => {
  const g = __game, p = g.player, G = g.glide;
  return { on: G.on, pend: G.pendT, st: p.state, y: +p.y.toFixed(2), vy: +p.vy.toFixed(2), x: +p.x.toFixed(2), z: +p.z.toFixed(2),
    ground: p.onGround, stomping: g.stomping, wings: p.anim.wings, glide: p.anim.glide, last: G.last, unl: [...g.unlocked] };
});
const toasts = (T) => T.ev(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '));
const bubbles = (T) => T.ev(() => [...document.querySelectorAll('.bubble')].filter((b) => b.style.display !== 'none').map((b) => b.textContent).join(' | '));
// Put him at (x, z) on a floor `y` m up (the wing; debugWarp only snaps to ground-level floors),
// facing `yaw`, the camera behind him (camYaw).
const place = (T, x, z, y, yaw, camYaw = yaw) => T.ev((x, z, y, yaw, camYaw) => {
  const g = __game, p = g.player;
  if (g.playerCar) g.exitCar(true);
  p.state = 'normal';
  p.teleport(x, z, yaw);
  if (y != null) { p.y = y; p.onGround = false; }
  p.vx = p.vz = p.vy = 0;
  g.jumps = 0;   // a fresh placement (lifted off before the step that resets it after a landing)
  g.cam.yaw = camYaw; g.cam.snapNext = true;
}, x, z, y, yaw, camYaw);
// Jump (or not: already rising off the board; `run`: W held from the jump on, as a run-up), the
// double jump at the top and J held at once, as a player does, until he lands (or `ms`). Returns
// the glide record with `peak`, his highest point since the jump.
async function jumpGlide(T, { jump = true, run = false, ms = 12000, during } = {}) {
  await T.ev(() => {
    const g = __game, P = window.__peak = { y: g.player.y };
    if (!window.__peakFn) { window.__peakFn = () => { window.__peak.y = Math.max(window.__peak.y, __game.player.y); }; g.onFrame(window.__peakFn); }
    return P;
  });
  if (run) await T.page.keyboard.down('KeyW');
  try {
    if (jump) await T.tap('Space');
    await T.until(() => __game.player.vy < 0.6, 4000);
    await T.tap('Space');
    await T.page.keyboard.down('KeyJ');
    try {
      await T.until(() => __game.glide.on, 2000);
      if (during) await during();
      await T.until(() => !__game.glide.on, ms);
    } finally { await T.page.keyboard.up('KeyJ'); }
  } finally { if (run) await T.page.keyboard.up('KeyW'); }
  return T.ev(() => ({ ...__game.glide.last, peak: +window.__peak.y.toFixed(2) }));
}

export const SCENARIOS = {
  async glide(T) {
    // 0. Before the unlock: J in the air stomps at once, held or not; no glide, no toast.
    await T.fresh('&mission=13');
    let L = await T.L('flamencoDeck');
    await place(T, L.x + 6, L.z + 4, null, Math.PI / 2);
    await T.frames(10);
    await T.tap('Space');
    await T.until(() => __game.player.vy < 2, 3000);
    await T.page.keyboard.down('KeyJ');
    await T.frames(3);
    let r = await st(T);
    check(r.stomping && !r.on && r.pend == null, `before the unlock J in the air stomps at once (${JSON.stringify(r)})`);
    await T.frames(30);
    await T.page.keyboard.up('KeyJ');
    r = await st(T);
    check(!r.on && !r.wings && !r.unl.includes('glid'), 'no glide and no unlock before julafton');
    check(!(await toasts(T)).includes('Jag kan flyga'), 'no glide toast before julafton');

    // 1. Julafton's unlock; the first jump shows the toast, once.
    await T.ev(() => { const g = __game; g.unlock('bodega'); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    await T.frames(30);
    check(!(await toasts(T)).includes('Jag kan flyga'), 'the glide toast waits for the first jump');
    await T.tap('Space');
    await T.until(() => __game.unlocked.has('glid'), 3000);
    const tt = await toasts(T);
    T.log('toast', tt);
    check(tt.includes('Upplåst: Jag kan flyga – håll J i luften'), `the unlock toast on the first jump (${tt})`);
    await T.until(() => __game.player.onGround, 4000);
    await T.ev(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
    await T.tap('Space');
    await T.frames(30);
    check(!(await toasts(T)).includes('Jag kan flyga'), 'the unlock toast only once');
    await T.until(() => __game.player.onGround, 4000);

    // 2. A quick J in the air still stomps (on the release, well inside `tap`).
    await T.frames(10);
    await T.tap('Space');
    await T.until(() => __game.player.vy < 3, 3000);
    const t0 = await T.ev(() => performance.now());
    await T.tap('KeyJ');
    await T.until(() => __game.stomping || __game.player.onGround, 2000);
    r = await st(T);
    const lag = (await T.ev(() => performance.now())) - t0;
    T.log('stomp', JSON.stringify(r), `after ${lag.toFixed(0)} ms`);
    check(r.stomping && !r.on && r.vy < -10, 'a quick J in the air is the stomp');
    await T.until(() => __game.player.onGround && !__game.stomping, 3000);

    // 3. The dream plane's left wing (block (6,1) local (-14, -2), top 3.0), out over the lot (+z).
    const W = await T.ev(() => { const l = window.__lm('dromplan'); return { x: l.x - 14, z: l.z - 22 }; });
    T.log('wing at', JSON.stringify(W));
    await place(T, W.x, W.z, 3.0, 0, 0);
    await T.frames(20);
    r = await st(T);
    check(r.ground && Math.abs(r.y - 3.0) < 0.05, `standing on the wing (${JSON.stringify(r)})`);
    L = await jumpGlide(T, {
      during: async () => {
        await T.frames(40);
        const g = await st(T);
        T.log('mid-glide', JSON.stringify(g));
        check(g.wings && g.glide && Math.abs(g.vy + 2.4) < 0.15, `wings out and sinking at 2.4 m/s (vy ${g.vy})`);
        const b = await bubbles(T);
        check(b.includes('Jag kan flyga, jag är inte rädd.'), `the mantra in his bubble (${b})`);
        await T.ev(() => { __game.cam.yaw = 2.2; });
        await T.frames(12);
        await T.shot('glide_wing');
      },
    });
    T.log('wing glide', JSON.stringify(L));
    check(L.landed && L.peak > 5.4 && L.peak < 6.2, `the wing's jump and double jump reach about 5.7 m (${L.peak})`);
    check(L.dist > 10 && L.dist < 15, `about 12 m from the wing (${L.dist})`);
    r = await st(T);
    check(r.st === 'down' && !r.wings, `he rolls on landing (${r.st})`);
    await T.frames(8);
    await T.shot('glide_roll');
    await T.until(() => __game.player.state === 'normal', 3000);
    const daze = await T.ev(() => __game.glide.dazeT);
    check(daze > 0, 'up again, dazed');

    // 4. Off the wingtip straight at the palm (local (-24, -2)): round the trunk, never held there.
    const palm = { x: W.x - 10, z: W.z };
    await place(T, W.x - 2.5, W.z, 3.0, -Math.PI / 2, -Math.PI / 2);
    await T.frames(20);
    await T.ev((px, pz) => {
      window.__palm = { t: 0, max: 0, last: null };
      const g = __game;
      const fn = (dt) => { const p = g.player, P = window.__palm; if (g.glide.on && Math.hypot(p.x - px, p.z - pz) < 1.0) { P.t += dt; P.max = Math.max(P.max, P.t); } else P.t = 0; };
      g.onFrame(fn);
    }, palm.x, palm.z);
    L = await jumpGlide(T, { run: true });
    const P = await T.ev(() => window.__palm);
    T.log('palm glide', JSON.stringify(L), 'near the trunk', JSON.stringify(P));
    check(L.landed && P.max < 1.0 && L.x1 < palm.x - 0.5, `the palm does not hold him (${P.max.toFixed(2)} s at the trunk, landed at x ${L.x1})`);
    await T.until(() => __game.player.state === 'normal', 3000);

    // 4b. A wall head-on (the hangar's west side, block (6,1) local x 15, from 6 m off at 10 m up):
    // a moment against it, then he lets go and drops (no glide down the wall to the ground).
    const hx = W.x + 14 + 15, hz = W.z + 2 - 23;
    await place(T, hx - 6, hz, 10, Math.PI / 2, Math.PI / 2);
    await T.frames(1);
    await T.page.keyboard.down('KeyJ');
    try {
      await T.until(() => __game.glide.on, 2000);
      await T.until(() => !__game.glide.on, 8000);
    } finally { await T.page.keyboard.up('KeyJ'); }
    L = await T.ev(() => __game.glide.last);
    T.log('wall glide', JSON.stringify(L));
    check(!L.landed && L.x1 > hx - 0.5 && L.y1 > 3 && L.secs < 3, `against a wall he lets go up there (${JSON.stringify(L)})`);
    await T.until(() => __game.player.onGround, 4000);

    // 5. Flamenco's diving board (bounce top 0.97 at (-14.1, 7)) out over the pool to the shallow end.
    await T.ev(() => { document.querySelectorAll('.toast').forEach((t) => t.remove()); __game.npc('ole').chatT = 99; });
    const board = { x: -14.6, z: 7 };
    const oleD = await T.ev((x, z) => { const o = __game.npc('ole'); return Math.hypot(o.x - x, o.z - z); }, board.x + 8, board.z);
    await place(T, board.x, board.z, 2.4, Math.PI / 2, Math.PI / 2);
    await T.until(() => __game.player.vy > 10, 3000);   // the bounce
    let oleHeard = '';
    L = await jumpGlide(T, { jump: false,
      during: async () => {
        await T.frames(30);
        await T.ev(() => { __game.cam.yaw = Math.PI / 2 + 2.3; });
        await T.frames(10);
        oleHeard = await bubbles(T);
        await T.shot('glide_pool');
      },
    });
    T.log('pool glide', JSON.stringify(L), 'Ole', oleD.toFixed(1), 'm', oleHeard);
    check(L.landed && L.water && L.pool, 'down in the pool');
    check(L.peak > 6.6 && L.dist > 13, `the bounce and double jump reach about 7 m and glide about 15 m (${L.peak}, ${L.dist})`);
    check(L.x1 > -7 && L.x1 < 6, `in the shallow end (x ${L.x1})`);
    await T.frames(4);
    await T.shot('glide_splash');
    const radio = await toasts(T);
    T.log('radio', radio);
    check(radio.includes('Från fjärde våningen? Ner i poolen? Ring kliniken.'), 'Lasse on the radio the first time');
    check(await T.ev(() => __game.unlocked.has('glidPlask')), 'Lasse\'s line is remembered (saved unlocks)');
    if (oleD < 16) check(oleHeard.includes('Det er flyging!'), `Ole shouts when he is near (${oleHeard})`);
    await T.until(() => __game.player.state === 'normal', 3000);

    // 6. Again: no second radio line.
    await T.ev(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
    await place(T, board.x, board.z, 2.4, Math.PI / 2, Math.PI / 2);
    await T.until(() => __game.player.vy > 10, 3000);
    L = await jumpGlide(T, { jump: false });
    await T.frames(30);
    check(L.water && !(await toasts(T)).includes('Ring kliniken'), 'Lasse only once');
    await T.until(() => __game.player.state === 'normal', 3000);

    // 7. The held direction turns him, a little: D (camera behind) bends the line to his right.
    await place(T, W.x, W.z, 3.0, 0, 0);
    await T.frames(20);
    try { L = await jumpGlide(T, { during: () => T.page.keyboard.down('KeyD') }); } finally { await T.page.keyboard.up('KeyD'); }
    const dx = L.x1 - L.x0, dz = L.z1 - L.z0;
    T.log('turning glide', JSON.stringify(L));
    check(dx < -2 && dz > 2, `D turns the glide to his right (−x) without spinning him round (${dx.toFixed(1)}, ${dz.toFixed(1)})`);
    await T.until(() => __game.player.state === 'normal', 3000);

    // 8. Not while carrying, not in a car, not in a mission.
    await T.ev(() => { __game.carrying = { who: 'test' }; });
    check(!(await T.ev(() => __game.glide.allowed())), 'no glide while carrying');
    await T.ev(() => { __game.carrying = null; });
    await T.anyCar();
    check(!(await T.ev(() => __game.glide.allowed())), 'no glide in a car');
    await T.ev(() => __game.exitCar(true));
    await T.fresh('&mission=12');
    await T.ev(() => { __game.unlocked.add('bodega'); });
    await T.startMission();
    await T.until(() => __game.missions.state === 'running', 20000);
    await T.ev(() => { const g = __game; if (g.playerCar) g.exitCar(true); });
    await T.frames(10);
    await T.tap('Space');
    await T.until(() => __game.player.vy < 2, 3000);
    await T.page.keyboard.down('KeyJ');
    await T.frames(30);
    r = await st(T);
    await T.page.keyboard.up('KeyJ');
    check(!r.on && !r.wings, `no glide in a mission (${JSON.stringify(r)})`);
  },
};
