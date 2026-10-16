// Från fjärde våningen – the 10 m diving tower at Flamenco's deep end (free roam, DESIGN §10.20;
// feature 24): hopptorn.
//   hopptorn: after the end, the tower is solid with its platform at 9.95; E at the ladder's foot
//             (KLÄTTRA UPP) fades him up onto the platform facing the board, the railing holds him
//             there; off the board his arms go out with the mantra and, without J, he comes down flat
//             in the deep end: a belly flop, the splash, Lasse's whole line on the radio once, "Oj." when
//             he is up; with J it is the cannonball (no flop, the camera shaken, no second radio
//             line); E up there (KLÄTTRA NER) puts him at the foot. After julafton a glide off the
//             tower is the glide's, not a dive, and the glide's radio line waits for another session
//             (the tower's said it). At ropavieja's idle the tower is there too; a mission start with
//             him up there brings him down without a fall, and the tower's solids are gone for the
//             mission (the same world as before: floors, free spots, footReach; no E prompt; he walks
//             through where it stands).
import { check } from '../lib.mjs';

const st = (T) => T.ev(() => {
  const g = __game, p = g.player, W = g.tower;
  return { px: +p.x.toFixed(2), py: +p.y.toFixed(2), pz: +p.z.toFixed(2), yaw: +p.yaw.toFixed(2), pst: p.state, flopped: p.flopped,
    onGround: p.onGround, leap: p.anim.leap, bomb: p.anim.bomb, dive: !!W.dive, fromTop: W.fromTop, busy: W.busy, last: W.last,
    climbs: W.climbs, radioSaid: W.radioSaid, shake: +g.cam.shake.toFixed(2), state: g.missions.state,
    prompt: document.getElementById('prompt')?.textContent || '' };
});
const said = (T) => T.ev(() => window.__said.slice());
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g); g.say = (t, text, secs) => { window.__said.push(text); return o(t, text, secs); };
    const r = g.radio.bind(g); g.radio = (who, text) => { window.__radio.push(`${who}: ${text}`); return r(who, text); };
    const w = g.waterSplash.bind(g); g.waterSplash = (x, z, v, bomb) => { w(x, z, v, bomb); window.__splash = { v: +v.toFixed(1), bomb, shake: +g.cam.shake.toFixed(2) }; };
    const l = g.onLand.bind(g); g.onLand = (ch, v, y) => { if (ch === g.player) window.__lands.push(+v.toFixed(1)); return l(ch, v, y); };
    window.__radio = []; window.__lands = [];
  }
  window.__said = [];
});
const radios = (T) => T.ev(() => window.__radio.slice());
// At the ladder's foot facing it (the camera behind him), then E: up on the platform.
async function climbUp(T) {
  await T.ev(() => { const g = __game, l = __lm('hopptorn'); g.debugWarp(l.x, l.z, l.yaw); g.cam.yaw = l.yaw; g.cam.snapNext = true; });
  await T.frames(4);
  await T.until(() => __game.nearestInteractable()?.it?.id === 'hopptorn:upp', 4000);
  await T.tap('KeyE');
  await T.until(() => !__game.tower.busy && __game.player.y > 9, 6000);
  await T.frames(4);
}
// Off the end of the board with W held (J at `jAt` m under the top for the cannonball, or held for a
// glide), until he is down. Returns { leap, bomb } as seen on the way down.
async function dive(T, { j = null, shot = null } = {}) {
  await T.page.keyboard.down('KeyW');
  let seen = {};
  try {
    await T.until(() => __game.tower.dive || __game.glide.on, 6000);
    if (j === 'tap') { await T.until(() => __game.player.y < 8.5, 3000); await T.tap('KeyJ'); }
    if (j === 'hold') {
      await T.page.keyboard.down('KeyJ');
      try { await T.until(() => __game.glide.on, 3000); await T.until(() => !__game.glide.on, 15000); } finally { await T.page.keyboard.up('KeyJ'); }
    } else {
      await T.until(() => __game.player.y < 5.5, 4000);
      seen = await T.ev(() => ({ leap: __game.player.anim.leap, bomb: __game.player.anim.bomb, y: +__game.player.y.toFixed(2) }));
      if (shot) await T.shot(shot);
      await T.until(() => __game.player.onGround || __game.player.state !== 'normal', 6000);
    }
  } finally { await T.page.keyboard.up('KeyW'); }
  return seen;
}

export const SCENARIOS = {
  async hopptorn(T) {
    // 0. Free roam after the end (no unlocks: J in the air is the stomp).
    await T.fresh('&mission=13');
    await resetSaid(T);
    const top = await T.ev(() => window.__game.tower && (window.__lm('hopptornTopp').y));
    const geo = await T.ev(async () => {
      const { DIVE_TOWER } = await import('/src/world/blocks/hotels.js');
      const C = await import('/src/world/collision.js'), l = __lm('hopptornTopp');
      return { top: DIVE_TOWER.top, n: DIVE_TOWER.blocks.length, live: DIVE_TOWER.blocks.every((b) => !b.dead),
        floor: +C.groundAt(l.x, l.z, 10, 0.45).toFixed(2), board: +C.groundAt(-13.6, 3.6, 10, 0.45).toFixed(2),
        free: __game.spotFree(-16.1, 3.6) };
    });
    T.log('tower', JSON.stringify(geo), 'top landmark', top);
    check(geo.n === 8 && geo.live && Math.abs(geo.top - 9.95) < 0.01, `the tower's 8 solids, live after the end (${JSON.stringify(geo)})`);
    check(geo.floor === 9.95 && geo.board === 9.95 && !geo.free, 'the platform and the board are floors at 9.95, the foot no free spot');

    // 1. The tower across the pool from its east end, then at the foot: KLÄTTRA UPP.
    await T.ev(() => { const g = __game; g.debugWarp(-2, 20, 0); g.cam.cutTo({ x: 5, y: 3, z: 6 }, { x: -16, y: 5, z: 3.6 }); g.cam.snapNext = true; });
    await T.frames(12);
    await T.shot('hopptorn_daeck');
    await T.ev(() => __game.cam.release());
    await T.ev(() => { const g = __game, l = __lm('hopptorn'); g.debugWarp(l.x, l.z, l.yaw); g.cam.yaw = l.yaw; g.cam.snapNext = true; });
    await T.frames(8);
    let r = await st(T);
    T.log('at the foot', JSON.stringify(r));
    check(r.prompt.includes('Klättra upp'), `the foot's prompt (${r.prompt})`);
    await T.shot('hopptorn_fot');
    await T.tap('KeyE');
    await T.frames(3);
    check(await T.ev(() => document.getElementById('fade')?.classList.contains('on')), 'the climb fades to black');
    await T.until(() => !__game.tower.busy && __game.player.y > 9, 6000);
    await T.frames(20);
    r = await st(T);
    T.log('on the platform', JSON.stringify(r));
    check(r.climbs === 1 && Math.abs(r.py - 9.95) < 0.02 && r.onGround && Math.abs(r.yaw - Math.PI / 2) < 0.05, `up on the platform facing the board (${JSON.stringify(r)})`);
    check(r.prompt.includes('Klättra ner') && r.fromTop, `the platform's prompt (${r.prompt})`);
    await T.shot('hopptorn_topp');

    // 2. The railing: west, north and south he stays up there.
    for (const k of ['KeyS', 'KeyA', 'KeyD']) {
      await T.hold([k], 1200);
      r = await st(T);
      check(r.py > 9.9 && r.onGround, `the railing holds him (${k}: ${r.px}, ${r.py}, ${r.pz})`);
    }

    // 3. Off the board: arms out, the mantra, a belly flop in the deep end; Lasse once; "Oj.".
    await climbUp(T);
    await resetSaid(T);
    let seen = await dive(T, { shot: 'hopptorn_fall' });
    r = await st(T);
    T.log('belly flop', JSON.stringify(r.last), 'seen', JSON.stringify(seen), 'state', r.pst, r.flopped);
    check(seen.leap && !seen.bomb, `arms out on the way down (${JSON.stringify(seen)})`);
    check(r.last?.kind === 'magplask' && r.last.x > -14 && r.last.x < 6 && r.last.z > 1.5 && r.last.z < 12.5 && r.last.v > 18, `into the pool, a belly flop (${JSON.stringify(r.last)})`);
    check(r.pst === 'down' && r.flopped && !r.leap, 'face down in the water, the arms in');
    await T.frames(4);
    await T.shot('hopptorn_magplask');
    await T.until(() => window.__radio.length > 0, 5000);
    await T.frames(6);
    await T.shot('hopptorn_lasse');
    await T.until(() => __game.player.state === 'normal', 5000);
    await T.frames(10);
    let s = await said(T), rad = await radios(T);
    T.log('said', JSON.stringify(s), 'radio', JSON.stringify(rad));
    check(s[0] === 'Jag kan flyga, jag är inte rädd.', 'the mantra off the tower');
    check(s.includes('Oj.'), '"Oj." when he is up');
    check(rad.length === 1 && rad[0] === 'lasse: Från fjärde våningen? Ner i poolen? Ring kliniken.', `Lasse's whole line (${JSON.stringify(rad)})`);

    // 4. The cannonball: J in the air; no flop, the camera shaken, no second radio line.
    await climbUp(T);
    await resetSaid(T);
    seen = await dive(T, { j: 'tap', shot: 'hopptorn_bombfall' });
    r = await st(T);
    T.log('cannonball', JSON.stringify(r.last), 'seen', JSON.stringify(seen), 'shake', r.shake);
    check(seen.bomb && !seen.leap, `the cannonball pose (${JSON.stringify(seen)})`);
    const sp = await T.ev(() => window.__splash);
    T.log('splash', JSON.stringify(sp));
    check(r.last?.kind === 'bomb' && r.pst === 'normal' && !r.flopped, `a cannonball, no flop (${JSON.stringify(r)})`);
    check(sp.bomb && sp.v > 24 && sp.shake >= 1.3, `the biggest splash, the camera shaken (${JSON.stringify(sp)})`);
    await T.frames(2);
    await T.shot('hopptorn_bomb');
    await T.sleep(2500);
    check((await radios(T)).length === 1, 'Lasse once a session');
    check(!(await said(T)).includes('Oj.'), 'no "Oj." after a cannonball');

    // 5. KLÄTTRA NER: at the foot, turned away from the ladder.
    await climbUp(T);
    await T.tap('KeyE');
    await T.until(() => !__game.tower.busy && __game.player.y < 1, 6000);
    r = await st(T);
    const foot = await T.L('hopptorn');
    T.log('down', JSON.stringify(r));
    check(Math.hypot(r.px - foot.x, r.pz - foot.z) < 0.1 && r.py < 0.2 && r.climbs === 5, `at the foot (${JSON.stringify(r)})`);

    // 6. After julafton the glide takes a dive over: no tower landing, and its radio line waits.
    await T.ev(() => { __game.unlock('bodega'); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    const before = (await st(T)).last;
    await climbUp(T);
    const speed = await T.ev(() => { const c = __game.glide.cfg, s = c.speed; c.speed = 3; return s; });   // down in the pool, not past it
    try { await dive(T, { j: 'hold' }); } finally { await T.ev((s) => { __game.glide.cfg.speed = s; }, speed); }
    await T.until(() => __game.player.state === 'normal' && __game.player.onGround, 6000);
    r = await st(T);
    const gl = await T.ev(() => ({ last: __game.glide.last, said: __game.glide.radioSaid, once: __game.unlocked.has('glidPlask') }));
    T.log('glide off the tower', JSON.stringify(gl));
    check(JSON.stringify(r.last) === JSON.stringify(before) && !r.dive, 'a glide is not a dive');
    check(gl.last?.landed && gl.last.y0 > 7 && gl.last.pool, `a glide off the tower into the pool (${JSON.stringify(gl.last)})`);
    check(!gl.said && !gl.once && (await radios(T)).length === 1, `the glide's radio line waits for another session (${JSON.stringify(gl)})`);

    // 7. Between missions (ropavieja's idle): the tower is there; a mission start with him up there.
    await T.fresh('&mission=9');
    await resetSaid(T);
    await climbUp(T);
    check((await st(T)).py > 9.9, 'up the tower before ropavieja');
    await T.ev(() => { window.__lands = []; __game.missions.begin(); });
    await T.until(() => __game.missions.state !== 'idle', 4000);
    await T.frames(5);
    r = await st(T);
    const gone = await T.ev(async () => {
      const C = await import('/src/world/collision.js'), q = C.queryBlocks(-18, 1.5, -13, 5.5, []);
      const reach = __game.footReach(__lm('flamenco').x, __lm('flamenco').z, 44);
      return { towers: q.filter((b) => b.kind === 'tower').length, floor: +C.groundAt(-16.1, 3.6, 10, 0.45).toFixed(2),
        free: __game.spotFree(-16.1, 3.6), reach: reach(-16.1, 3.6) && reach(-13.8, 3.6), prompt: __game.nearestInteractable()?.it?.id ?? null };
    });
    T.log('mission start up there', JSON.stringify(r), JSON.stringify(gone));
    const lands = await T.ev(() => window.__lands.slice());
    check(r.py < 0.2 && r.pst === 'normal' && !lands.length, `down from the tower without a fall (${JSON.stringify(r)}, landings ${JSON.stringify(lands)})`);
    check(gone.towers === 0 && gone.floor < 0.2 && gone.free && gone.reach && !gone.prompt?.startsWith('hopptorn'), `no tower for the mission (${JSON.stringify(gone)})`);
    await T.until(() => __game.missions.state === 'running', 60000);
    await T.ev(() => { const g = __game; g.debugWarp(-16.1, 1.2, 0); g.cam.yaw = 0; g.cam.snapNext = true; });
    await T.hold(['KeyW'], 900);
    r = await st(T);
    check(r.pz > 3.6, `in a mission he walks through where the tower stands (${r.pz})`);
  },
};
