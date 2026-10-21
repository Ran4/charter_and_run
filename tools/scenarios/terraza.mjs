// Takterrassen på La Medina vaknar (free roam, DESIGN §10.59; feature 122): terraza, terrazashots.
//   terraza: at index 9 between missions. The world: the roof pool's water floor (x [9.4, 13.6], z [−8.2,
//            4.2] block-local, top 6.02, a pool), its coping a step, the board's step (6.55) and bounce
//            pad (6.82), the counter before TERRAZA · BAR (a floor at 7.07, the bartender's aisle walled to
//            8.5), the three sun loungers (the third placed last), the tanks' four coins; the island's
//            fixed coins within 260 with Stig off the roof. Up the courtyard stairs on foot (real W): the
//            terrace with six guests at the tables and the bartender, the tanks' coins out, the brochure
//            line read out once and its reply; the two old loungers' dozing bathers, none on Stig's. The
//            bartender's greeting once a visit, the next one on the next. The tanks' coins: none from the
//            roof's floor with a jump, two from a tank's top, the stash taken in off the roof and only the
//            untaken put out again. The board: a walking hop off it and a sprinting one both splash in the
//            roof pool (high over the roof first), the bartender's "¡Olé!", a stomp in the air a
//            cannonball; a plain jump in the pool splashes, walking in it does not. The nap: no prompt at
//            night; E at Stig's lounger by day: lying on it, "Bara en liten stund.", the letterbox, "Zzz…",
//            the black and the clock 1.5 h on, back red, his head up and "Oj… Det blev visst en lång
//            stund.", on his feet before the lounger with "Aj!" and the toast, free roam. Burnt: an
//            outfit change keeps the red, the bartender's line about it once, standing still against
//            someone nothing, walking into a pedestrian "Aj!" (not again within 1.6 s, never in a
//            dialogue), a car's knock "Aj!"; a night and a
//            morning heal it. A mission start: the burn off, the guests, the bartender and the coins
//            gone, no prompt; one mid-nap ends it with Stig on his feet; after it (abort)
//            all back. At night nobody up there.
//   terrazashots: the stairs' top with the brochure line, the terrace from above, the bartender behind his
//            counter, the hop high over the roof, the splash, the nap (lying, dozing, waking red), Stig red
//            before the lounger, the bartender's line at the burn, an "Aj!" in the street, the minimap.
import { check } from '../lib.mjs';

const OX = -160, OZ = -80;   // block (1,2)'s centre: local (lx, lz) is world (OX + lx, OZ + lz)
const BURN = 0xf0705a;

// Stig on the roof's floor at block-local (lx, lz) facing yaw, the camera behind him.
const up = (T, lx, lz, yaw, y = 6.0) => T.ev((x, z, yaw, y) => {
  const g = __game, p = g.player;
  g.debugWarp(x, z, yaw); p.y = y; p.vy = 0; p.onGround = true; g.jumps = 0; g.cam.yaw = yaw; g.cam.snapNext = true;
}, OX + lx, OZ + lz, yaw, y);
const st = (T) => T.ev(() => {
  const g = __game, R = g.terraza, p = g.player;
  return { up: R.up, guests: R.guests?.filter((d) => d.on).length ?? 0, bar: !!R.bartender, stash: R.stash.length, left: R.coinsLeft, burnt: R.burnt, worn: R.worn,
    sc: !!R.sc, skin: p.def.skin, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(2), pst: p.state, inD: g.inDialog,
    coins: g.coins, splashes: R.splashes, oles: R.oles, ajs: R.ajs, greets: R.greets, naps: R.naps, h: +g.day.h.toFixed(2), ms: g.missions.state,
    prompt: window.__hud?._prompt || '', last: R.last };
});
const spies = (T) => T.ev(async () => {
  const g = __game;
  window.__said = [];
  window.__toasts = [];
  if (!window.__spied) {
    window.__spied = true;
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t === g.terraza.bartender ? 'barman' : t?.key || (g.terraza.guests?.some((d) => d.ch === t) ? 'guest' : '?'), text]); return o(t, text, secs); };
    const { hud } = await import('/src/game/hud.js');
    const tt = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(String(text)); return tt(text, ...a); };
    window.__hud = hud;
    const { audio } = await import('/src/audio.js');
    window.__au = { splash: 0 };
    const sp = audio.splash.bind(audio);
    audio.splash = (k) => { window.__au.splash++; return sp(k); };
  }
});
const said = (T) => T.ev(() => window.__said.slice());
const clear = (T) => T.ev(() => { window.__said.length = 0; window.__toasts.length = 0; });
const fixedCoins = (T) => T.ev(async () => { const P = await import('/src/actors/pickups.js'); return P.coins.filter((c) => c.active && c.fixed && c.x < 2000).length; });
// A hop off the board: from `back` m north of the step, W (and Shift), Space at once; until he lands hard.
async function hop(T, { sprint = false, back = 2.0, stomp = false } = {}) {
  await up(T, 11.5, -10.5 - back, 0);
  await T.ev(() => { window.__lands = []; });
  await T.frames(6);
  if (sprint) await T.page.keyboard.down('ShiftLeft');
  await T.page.keyboard.down('KeyW');
  let maxY = 0;
  try {
    await T.tap('Space');
    await T.until(() => __game.player.vy > 12, 4000);   // the bounce
    if (stomp) { await T.until(() => __game.player.vy < 0, 3000); await T.tap('KeyJ'); }
    await T.until(() => window.__lands.some((l) => l.v > 10), 6000);
    maxY = await T.ev(() => window.__maxY);
  } finally {
    await T.page.keyboard.up('KeyW');
    if (sprint) await T.page.keyboard.up('ShiftLeft');
  }
  const L = await T.ev(() => window.__lands.slice());
  return { L, maxY, hard: L.find((l) => l.v > 10) };
}

export const SCENARIOS = {
  async terraza(T) {
    await T.fresh('&mission=9');
    await spies(T);
    await T.ev(() => {
      const g = __game, l = g.onLand.bind(g);
      window.__lands = []; window.__maxY = 0;
      g.onLand = (ch, v, y) => { if (ch === g.player) window.__lands.push({ x: +ch.x.toFixed(2), z: +ch.z.toFixed(2), y: +y.toFixed(2), v: +v.toFixed(1), bomb: !!g.stomping }); return l(ch, v, y); };
      g.onFrame(() => { window.__maxY = Math.max(window.__maxY, g.player.y); });
    });

    // 0. The world.
    const geo = await T.ev(async () => {
      const { MEDINA } = await import('/src/world/blocks/centre.js'), Co = await import('/src/world/collision.js'), Pr = await import('/src/world/props.js');
      const P = MEDINA.pool, b = MEDINA.board, q = (x, z, y, step = 0.45) => +Co.groundAt(x, z, y, step).toFixed(2);
      const sol = (n) => { const l = __lm(n); return Pr.propsOfType('solstol', { x: l.x, z: l.z, r: 0.3 })[0]; };
      const sols = ['terrazaSol1', 'terrazaSol2', 'terrazaSol3'].map((n) => { const p = sol(n); return p ? { i: Pr.props.indexOf(p), baseY: p.baseY, role: __game.terraza.role(p) } : null; });
      const last = Pr.props.filter((p) => p.type === 'solstol').pop();
      return { pool: { kind: P.kind, pool: P.pool, top: +P.top.toFixed(2), x0: +(P.minX + 160).toFixed(2), x1: +(P.maxX + 160).toFixed(2), z0: +(P.minZ + 80).toFixed(2), z1: +(P.maxZ + 80).toFixed(2) },
        water: !!Co.waterAt(-148.5, -82, 6.02), coping: q(-150.75, -82, 6.0), step: q(-148.5, -89.95, 6.2), board: { kind: b.kind, top: +b.top.toFixed(2) },
        counter: q(-177.95, -101, 7.0), aisle: q(-178.6, -101, 6.0, 3), chairs: MEDINA.chairs.length, coins: MEDINA.coins.map((c) => c.map((v) => +v.toFixed(2))), minY: +MEDINA.coinMinY.toFixed(2),
        sols, lastSol: last === sol('terrazaSol3') };
    });
    T.log('world', JSON.stringify(geo));
    check(geo.pool.kind === 'water' && geo.pool.pool && geo.pool.top === 6.02 && geo.pool.x0 === 9.4 && geo.pool.x1 === 13.6 && geo.pool.z0 === -8.2 && geo.pool.z1 === 4.2 && geo.water, `the roof pool's water floor (${JSON.stringify(geo.pool)})`);
    check(geo.coping === 6.16 && geo.step === 6.55 && geo.board.kind === 'bounce' && geo.board.top === 6.82, `the coping, the step and the bounce pad (${geo.coping}, ${geo.step}, ${JSON.stringify(geo.board)})`);
    check(geo.counter === 7.07 && geo.aisle === 8.5 && geo.chairs === 12, `the counter a floor at 7.07, the aisle walled to 8.5, twelve chairs (${geo.counter}, ${geo.aisle}, ${geo.chairs})`);
    check(geo.coins.length === 4 && geo.coins.every((c) => c[1] === 8.45) && geo.minY === 7.6, `four tank coins at 8.45, minY 7.6 (${JSON.stringify(geo.coins)}, ${geo.minY})`);
    check(geo.sols.every((s) => s && s.baseY === 6) && geo.sols[0].role === 'asleep' && geo.sols[1].role === 'asleep' && geo.sols[2].role === 'kept' && geo.lastSol, `three roof loungers, Stig's placed last (${JSON.stringify(geo.sols)})`);
    check(await fixedCoins(T) <= 260, `the island's fixed coins within 260 off the roof (${await fixedCoins(T)})`);

    // 1. Up the courtyard stairs on foot.
    await T.ev((x, z) => { const g = __game; g.debugWarp(x, z, -Math.PI / 2); g.cam.yaw = -Math.PI / 2; g.cam.snapNext = true; }, OX + 6.2, OZ - 7.8);
    await T.frames(6);
    let r = await st(T);
    check(!r.up && r.stash === 0 && r.y < 0.6, `at the stairs' foot: not up, no coins out (${JSON.stringify(r)})`);
    await T.page.keyboard.down('KeyW');
    try { await T.until((x) => __game.player.x < x && __game.player.y > 5.95, 12000, OX - 8); }
    finally { await T.page.keyboard.up('KeyW'); }
    await T.sleep(400);
    r = await st(T);
    T.log('up the stairs', JSON.stringify(r));
    check(r.up && r.y === 6 && r.stash === 4 && r.guests === 6 && r.bar, `up the stairs: on the roof (6.0), the coins out, six guests, the bartender (${JSON.stringify(r)})`);
    check(await fixedCoins(T) <= 264, 'four more fixed coins while he is up');
    await T.until(() => window.__said.some((s) => s[1] === 'Här uppe stämmer det ju.'), 8000);
    let s = await said(T);
    check(s.some((x) => x[0] === 'guest' && x[1] === 'Balkong med havsutsikt och kvällssol.') && s.findIndex((x) => x[1] === 'Balkong med havsutsikt och kvällssol.') < s.findIndex((x) => x[1] === 'Här uppe stämmer det ju.'), `the brochure line and its reply (${JSON.stringify(s)})`);
    const people = await T.ev(() => {
      const R = __game.terraza;
      return { guests: R.guests.map((d) => ({ st: d.ch.state, y: +d.ch.y.toFixed(2), cup: d.ch.anim.cupHeld })), bar: { st: R.barman.ch.state, perched: R.barman.ch.perched, y: R.barman.ch.y, local: !!R.barman.ch.def.local },
        lying: __game.bathers.lying.filter((c) => c.bather.rec.role).map((c) => ({ role: c.bather.rec.role, slump: c.anim.slump })), kept: __game.bathers.recs.filter((r) => r.role === 'kept').map((r) => ({ occ: r.occ, ch: !!r.ch })) };
    });
    T.log('people', JSON.stringify(people));
    check(people.guests.every((g) => g.st === 'seated' && g.y === 6.48) && people.guests.filter((g) => g.cup === 'low').length === 4, `six seated guests at 6.48, four with a glass (${JSON.stringify(people.guests)})`);
    check(people.bar.st === 'normal' && people.bar.perched && people.bar.y === 6 && people.bar.local, `the bartender behind the counter (${JSON.stringify(people.bar)})`);
    check(people.lying.length === 2 && people.lying.every((b) => b.role === 'asleep' && b.slump) && people.kept.length === 1 && !people.kept[0].occ && !people.kept[0].ch, `two dozing bathers, Stig's lounger free (${JSON.stringify(people)})`);
    await T.ev((x, z) => __game.debugWarp(x, z, Math.PI), OX, OZ + 22);
    await T.frames(6);
    r = await st(T);
    check(!r.up && r.stash === 0 && (await fixedCoins(T)) <= 260, `down in the street: not up, the coins taken in (${JSON.stringify(r)})`);

    // 2. The bartender's greeting once a visit, the next one on the next visit; no brochure again.
    await clear(T);
    await up(T, -14, -21, -Math.PI / 2);
    await T.page.keyboard.down('KeyW');
    try { await T.until((x) => __game.player.x < x, 5000, OX - 16.5); } finally { await T.page.keyboard.up('KeyW'); }
    await T.sleep(600);
    s = await said(T);
    check(s.filter((x) => x[0] === 'barman').length === 1 && s.some((x) => x[0] === 'barman' && x[1] === '¡Hola, señor! Välkommen upp på terrazan.') && !s.some((x) => x[1].startsWith('Balkong')), `the bartender's first greeting, no brochure again (${JSON.stringify(s)})`);
    await up(T, -12, -21, -Math.PI / 2);
    await T.sleep(300);
    await up(T, -16, -21, -Math.PI / 2);
    await T.sleep(1500);
    s = await said(T);
    check(s.filter((x) => x[0] === 'barman').length === 1, `not again in the same visit (${JSON.stringify(s)})`);
    await T.ev((x, z) => __game.debugWarp(x, z, Math.PI), OX, OZ + 22);
    await T.frames(4);
    await up(T, -16, -21, -Math.PI / 2);
    await T.sleep(600);
    s = await said(T);
    check(s.filter((x) => x[0] === 'barman').length === 2 && s.some((x) => x[1] === '¿Una cerveza, señor? Muy fría.'), `the next greeting on the next visit (${JSON.stringify(s)})`);
    check(!s.some((x) => x[1] === 'Momento.'), 'never the porter\'s "Momento."');

    // 3. The tanks' coins: not from the roof's floor, two from a tank's top; off the roof they go in.
    const c0 = (await st(T)).coins;
    await up(T, -3, -24.2, Math.PI);
    await T.frames(4);
    await T.tap('Space');
    await T.sleep(1200);
    r = await st(T);
    check(r.coins === c0 && r.stash === 4, `no tank coin from the roof's floor with a jump (${r.coins - c0} pta, ${r.stash} out)`);
    await up(T, -3, -25.5, Math.PI, 7.7);
    await T.sleep(1200);
    r = await st(T);
    check(r.coins === c0 + 50 && r.stash === 2 && r.left === 2, `two coins from the first tank's top (+${r.coins - c0} pta, ${r.stash} out)`);
    await T.ev((x, z) => __game.debugWarp(x, z, Math.PI), OX, OZ + 22);
    await T.frames(4);
    r = await st(T);
    check(r.stash === 0 && (await fixedCoins(T)) <= 260, `off the roof the stash taken in (${r.stash})`);
    await up(T, 0, -22, Math.PI);
    await T.frames(4);
    r = await st(T);
    check(r.stash === 2, `back up: only the two untaken out (${r.stash})`);

    // 4. The board: a walking hop and a sprinting one splash in the roof pool, high over the roof first.
    await clear(T);
    const au0 = await T.ev(() => window.__au.splash);
    await T.ev(() => { window.__maxY = 0; });
    let H = await hop(T);
    r = await st(T);
    T.log('walking hop', JSON.stringify(H));
    check(H.hard && H.hard.y === 6.02 && H.hard.x > OX + 9.4 && H.hard.x < OX + 13.6 && H.hard.z > OZ - 8.2 && H.hard.z < OZ + 4.2 && H.maxY > 11, `a walking hop lands in the roof pool after a flight over 11 m (${JSON.stringify(H)})`);
    check(r.splashes === 1 && (await T.ev(() => window.__au.splash)) > au0, `a splash (${r.splashes})`);
    await T.sleep(300);
    s = await said(T);
    check(s.some((x) => x[0] === 'barman' && x[1] === '¡Olé!'), `the bartender's "¡Olé!" (${JSON.stringify(s)})`);
    await T.sleep(5200);
    await T.ev(() => { window.__maxY = 0; });
    H = await hop(T, { sprint: true, back: 3 });
    T.log('sprinting hop', JSON.stringify(H));
    check(H.hard && H.hard.y === 6.02 && H.hard.z < OZ + 4.2, `a sprinting hop lands in the pool too (${JSON.stringify(H)})`);
    H = await hop(T, { stomp: true });
    const shake = await T.ev(() => __game.cam.shake);
    T.log('stomp hop', JSON.stringify(H), shake);
    check(H.hard && H.hard.bomb && H.hard.y === 6.02 && shake > 0.3, `a stomp in the flight: a cannonball in the pool (${JSON.stringify(H.hard)}, shake ${shake})`);
    // A plain jump in the pool splashes; walking in it does not.
    await up(T, 11.5, -2, 0, 6.02);
    await T.frames(6);
    const n0 = (await st(T)).splashes;
    await T.hold(['KeyW'], 600);
    await T.sleep(200);
    check((await st(T)).splashes === n0, 'walking in the pool, no splash');
    await T.tap('Space');
    await T.sleep(1100);
    check((await st(T)).splashes === n0 + 1, 'a jump in the pool splashes');

    // 5. The nap: no prompt at night; by day E at Stig's lounger.
    const L = await T.L('terrazaSol3');
    const toLounger = () => T.ev((x, z) => { const g = __game, p = g.player; g.debugWarp(x - 1.7, z, Math.PI / 2); p.y = 6.0; p.onGround = true; g.cam.yaw = Math.PI / 2; g.cam.snapNext = true; }, L.x, L.z);
    await T.ev(() => __game.day.set(21));
    await toLounger();
    await T.frames(6);
    r = await st(T);
    check(r.prompt === '' && !(await T.ev(() => __game.terraza.canNap())), `no nap at night ("${r.prompt}")`);
    await T.ev(() => { __game.day.set(15); __game.day.write(); });
    await toLounger();
    await T.frames(6);
    r = await st(T);
    check(r.prompt === '<b>E</b> Lägg dig en liten stund' && r.skin !== BURN, `the prompt by day, Stig not burnt ("${r.prompt}")`);
    await clear(T);
    await T.tap('KeyE');
    await T.frames(4);
    r = await st(T);
    const lie = await T.ev(() => { const p = __game.player; return { lie: !!p.liePose, y: +p.y.toFixed(2), lb: document.getElementById('letterbox')?.classList.contains('on') }; });
    T.log('lying', JSON.stringify(r), JSON.stringify(lie));
    check(r.pst === 'lying' && r.inD && r.sc && lie.lie && lie.lb && lie.y > 6.3 && lie.y < 6.7, `lying on his lounger, in a scene, the letterbox (${JSON.stringify(lie)})`);
    check((await said(T)).some((x) => x[0] === 'stig' && x[1] === 'Bara en liten stund.'), '"Bara en liten stund."');
    await T.until(() => __game.player.anim.eyesShut && __game.player.anim.slump, 5000);
    await T.until(() => __game.terraza.burnt, 8000);
    r = await st(T);
    check(r.pst === 'lying' && r.skin === BURN, `in the black the burn (${r.skin.toString(16)})`);
    await T.until(() => !__game.terraza.sc, 15000);
    r = await st(T);
    s = await said(T);
    const toasts = await T.ev(() => window.__toasts.slice());
    T.log('after the nap', JSON.stringify(r), JSON.stringify(s), JSON.stringify(toasts));
    const st0 = await T.ev((x, z) => { const p = __game.player; return { dx: +(p.x - (x - 1.7)).toFixed(2), dz: +(p.z - z).toFixed(2) }; }, L.x, L.z);
    check(r.pst === 'normal' && !r.inD && r.y === 6 && Math.abs(st0.dx) < 0.05 && Math.abs(st0.dz) < 0.05 && Math.abs(Math.sin(r.yaw) + 1) < 0.01, `on his feet before the lounger, facing back down it (${JSON.stringify(r)}, ${JSON.stringify(st0)})`);
    check(Math.abs(r.h - 16.5) < 0.02, `the clock 1.5 h on (${r.h})`);
    const order = ['Bara en liten stund.', 'Zzz…', 'Oj… Det blev visst en lång stund.', 'Aj!'].map((t) => s.findIndex((x) => x[0] === 'stig' && x[1] === t));
    check(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), `his lines in order (${JSON.stringify(order)})`);
    check(toasts.includes('Stig somnade i solen. Röd som en kokt kräfta – det svider till i morgon.') && r.burnt && r.worn && r.skin === BURN, `the toast, and burnt (${JSON.stringify(toasts)})`);

    // 6. Burnt: an outfit change keeps the red; the bartender's look; "Aj!" at a bump, a car's knock.
    await T.ev(() => __game.setPlayerOutfit('kostym'));
    check((await st(T)).skin === BURN, 'the suit on: still red');
    await T.ev(() => __game.setPlayerOutfit('hawaii'));
    await clear(T);
    await up(T, -15.5, -21, -Math.PI / 2);
    await T.sleep(600);
    s = await said(T);
    check(s.some((x) => x[0] === 'barman' && x[1] === '¡Ay, señor! Ni är röd som un tomate.'), `the bartender at the burn (${JSON.stringify(s)})`);
    // A pedestrian 0.9 m ahead of him, and he walks into her (held W): a bump at walking speed.
    const bump = async () => {
      await T.ev(() => { const g = __game, p = g.player, c = g.peds[0].char; c.state = 'normal'; c.x = p.x + Math.sin(p.yaw) * 0.9; c.z = p.z + Math.cos(p.yaw) * 0.9; c.y = p.y; c.vx = c.vz = 0; g.cam.yaw = p.yaw; });
      await T.hold(['KeyW'], 260);
    };
    // Stig still, 0.5 m from a standing NPC (overlapping): pushed apart, no bump.
    const standStill = () => T.ev(() => {
      const g = __game, n = Object.values(g.npcs).find((n) => n.state === 'normal' && n.root.visible && !n.steer && !n.perched && n.y < 1);
      g.debugWarp(n.x + 0.5, n.z, -Math.PI / 2);
      return n.key;
    });
    await T.ev((x, z) => __game.debugWarp(x, z, 0), OX - 34, OZ + 40);
    await T.sleep(1800);
    await clear(T);
    const still = await standStill();
    await T.frames(8);
    check(!(await said(T)).some((x) => x[1] === 'Aj!'), `standing still against someone (${still}): no "Aj!"`);
    await T.ev((x, z) => __game.debugWarp(x, z, 0), OX - 34, OZ + 40);
    await T.frames(4);
    await bump();
    await T.frames(3);
    s = await said(T);
    check(s.filter((x) => x[0] === 'stig' && x[1] === 'Aj!').length === 1, `a bump: "Aj!" (${JSON.stringify(s)})`);
    await bump();
    await T.frames(3);
    check((await said(T)).filter((x) => x[1] === 'Aj!').length === 1, 'not again within 1.6 s');
    await T.sleep(1800);
    await T.ev(() => { __game.inDialog = true; });
    await bump();
    await T.frames(3);
    await T.ev(() => { __game.inDialog = false; });
    check((await said(T)).filter((x) => x[1] === 'Aj!').length === 1, 'none in a dialogue');
    await T.sleep(1700);
    await T.ev(() => { const g = __game; g.onCharHit(g.player, g.named.hyrbil, 6); });
    check((await said(T)).filter((x) => x[1] === 'Aj!').length === 2, 'a car\'s knock: "Aj!"');
    // A night and a morning heal it.
    await T.ev(() => __game.day.set(22));
    await T.frames(4);
    check((await st(T)).burnt, 'still burnt at night');
    await T.ev(() => __game.day.set(9));
    await T.frames(4);
    r = await st(T);
    check(!r.burnt && !r.worn && r.skin !== BURN, `the morning heals it (${JSON.stringify(r)})`);
    await clear(T);
    await T.sleep(1700);
    await bump();
    await T.frames(3);
    check(!(await said(T)).some((x) => x[1] === 'Aj!'), 'healed: no "Aj!"');
    await T.ev(() => { __game.day.set(15); __game.day.write(); });

    // 7. A mission start: the burn off, everybody and the coins gone, no prompt; mid-nap the nap ends.
    await up(T, 14.3, -1.8, -Math.PI / 2);
    await T.frames(4);
    await T.ev(() => __game.terraza.burn());
    await T.frames(2);
    r = await st(T);
    check(r.worn && r.up && r.stash === 2 && r.guests === 6, `burnt and up there (${JSON.stringify(r)})`);
    await T.ev(() => __game.missions.begin());
    await T.until(() => __game.missions.state !== 'idle', 6000);
    await T.frames(3);
    r = await st(T);
    check(!r.burnt && !r.worn && r.skin !== BURN && r.guests === 0 && !r.bar && r.stash === 0 && (await fixedCoins(T)) <= 260, `a mission start: healed, nobody, no coins (${JSON.stringify(r)})`);
    await T.until(() => __game.missions.state === 'running', 30000).catch(() => {});
    await toLounger();
    await T.frames(6);
    r = await st(T);
    check(r.prompt === '' && r.guests === 0 && !(await T.ev(() => __game.terraza.canNap())), `in the mission: no prompt, nobody up there (${JSON.stringify(r)})`);
    await T.ev(() => __game.missions.abort());
    await T.frames(6);
    await toLounger();
    await T.sleep(400);
    r = await st(T);
    check(r.ms === 'idle' && r.prompt === '<b>E</b> Lägg dig en liten stund' && r.guests === 6 && r.bar && r.stash === 2, `after it (abort) all back (${JSON.stringify(r)})`);
    await T.tap('KeyE');
    await T.until(() => __game.player.anim.eyesShut, 5000);
    await T.ev(() => __game.missions.begin());
    await T.until(() => __game.missions.state !== 'idle', 6000);
    await T.frames(3);
    r = await st(T);
    check(!r.sc && r.pst === 'normal' && !r.worn && r.last.kind === 'napEnd' && r.last.why === 'reset', `a mission start mid-nap: the nap off, on his feet, no burn (${JSON.stringify(r)})`);
    await T.until(() => __game.missions.state === 'running', 30000).catch(() => {});
    await T.ev(() => __game.missions.abort());
    await T.frames(6);

    // 8. At night nobody up there (after a cut).
    await T.ev(() => __game.day.set(23.5));
    await T.ev((x, z) => __game.debugWarp(x, z, Math.PI), OX, OZ + 22);
    await T.frames(4);
    await up(T, -8.2, -7.8, -Math.PI / 2);
    await T.sleep(400);
    r = await st(T);
    const sleepers = await T.ev(() => __game.bathers.lying.filter((c) => c.bather.rec.role).length);
    check(r.guests === 0 && !r.bar && sleepers === 0, `at night nobody up there (${JSON.stringify(r)}, ${sleepers})`);
  },

  async terrazashots(T) {
    await T.fresh('&mission=9');
    await spies(T);
    // The stairs' top with the brochure line.
    await T.ev((x, z) => { const g = __game; g.debugWarp(x, z, -Math.PI / 2); g.cam.yaw = -Math.PI / 2; g.cam.snapNext = true; }, OX + 6.2, OZ - 7.8);
    await T.frames(4);
    await T.page.keyboard.down('KeyW');
    try { await T.until((x) => __game.player.x < x && __game.player.y > 5.95, 12000, OX - 7.6); } finally { await T.page.keyboard.up('KeyW'); }
    await T.ev(() => { __game.cam.yaw = -2.2; });
    await T.until(() => window.__said.some((s) => s[1].startsWith('Balkong')), 6000);
    await T.sleep(500);
    await T.shot('terraza_0_trappan');
    // The terrace from above, the bartender.
    await T.ev((x, z) => __game.cam.cutTo({ x: x - 2, y: 30, z: z + 26 }, { x, y: 6, z }), OX - 4, OZ - 9);
    await T.frames(10);
    await T.shot('terraza_1_ovanifran');
    await T.ev((x, z) => __game.cam.cutTo({ x: x + 5.2, y: 8.3, z: z - 3.4 }, { x, y: 7.4, z }), OX - 18.6, OZ - 21);
    await T.frames(10);
    await T.shot('terraza_2_bartendern');
    await T.ev(() => __game.cam.release());
    // The hop: high over the roof, the splash.
    await up(T, 11.5, -12.5, 0);
    await T.frames(6);
    await T.page.keyboard.down('KeyW');
    try {
      await T.tap('Space');
      await T.until(() => __game.player.vy > 12, 4000);
      await T.until(() => __game.player.vy < 1, 3000);
      await T.shot('terraza_3_hoppet');
      await T.until(() => __game.terraza.splashes > 0, 4000);
    } finally { await T.page.keyboard.up('KeyW'); }
    await T.frames(6);
    await T.shot('terraza_4_plask');
    // The nap.
    const L = await T.L('terrazaSol3');
    await T.ev((x, z) => { const g = __game, p = g.player; g.debugWarp(x - 1.7, z, Math.PI / 2); p.y = 6.0; p.onGround = true; g.cam.yaw = Math.PI / 2; g.cam.snapNext = true; }, L.x, L.z);
    await T.frames(8);
    await T.shot('terraza_5_prompt');
    await T.tap('KeyE');
    await T.sleep(900);
    await T.shot('terraza_6_ligger');
    await T.until(() => __game.player.anim.eyesShut, 5000);
    await T.sleep(500);
    await T.shot('terraza_7_somnar');
    await T.until(() => __game.player.liePose?.lift > 0.6, 15000);
    await T.sleep(300);
    await T.shot('terraza_8_vaknar');
    await T.until(() => !__game.terraza.sc, 15000);
    await T.ev(() => { __game.cam.yaw = Math.PI / 2; __game.cam.snapNext = true; });
    await T.frames(6);
    await T.shot('terraza_9_rod');
    // The bartender at the burn.
    await up(T, -15.2, -21.6, -Math.PI / 2 - 0.25);
    await T.sleep(700);
    await T.shot('terraza_10_tomate');
    // "Aj!" in the street.
    await T.ev((x, z) => __game.debugWarp(x, z, 0.6), OX - 34, OZ + 40);
    await T.sleep(1800);
    await T.ev(() => { const g = __game, p = g.player, c = g.peds[0].char; c.state = 'normal'; c.x = p.x + Math.sin(p.yaw) * 0.9; c.z = p.z + Math.cos(p.yaw) * 0.9; c.y = p.y; c.vx = c.vz = 0; g.cam.yaw = p.yaw; g.cam.snapNext = true; });
    await T.hold(['KeyW'], 260);
    await T.frames(4);
    await T.shot('terraza_11_aj');
    // The minimap with the pool, from the roof.
    await up(T, 11.5, -10, Math.PI);
    await T.frames(10);
    await T.shot('terraza_12_karta');
  },
};
