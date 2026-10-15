// Åk bagageband – the baggage belt carries Stig (free roam, DESIGN §10.16; feature 25): bagage.
//   bagage: at index 5 (free roam before buss17, Lasse at the airport) Stig jumps from the hall floor
//           onto CINTA 2's belt and is carried round its middle at the ring's own spin (radius and
//           height kept, facing turned with it); the session's first ride brings "Min väska har inte
//           kommit."; the centre island does not turn; standing still 2.5 s he sits down on the
//           nearest bag (facing out, on its lid) and turns with it exactly; a full turn (about 19.6 s
//           of game time) gives "Ett varv på bagagebandet!" and Lasse's "Den dyker upp. Det gör de
//           alltid." on the radio; the second "Två varv…", the third "Tre varv…" and his "Den här
//           väskan ska till Las Palmas."; Space hops him off the bag onto the belt (the ride goes on),
//           E steps him off the belt onto the floor (the ride ends); R from a bag stands him up on the
//           road; a second ride has no sigh and Lasse says nothing again; in a running mission the
//           belt carries nobody. Then at index 13 (after julafton): the sigh is "Det är faktiskt rätt
//           rogivande." and the first turn brings no Lasse.
import { check } from '../lib.mjs';

const PI = Math.PI, TAU = 2 * PI;
const wrap = (a) => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
// The belt and the player in polar form round its middle.
const st = (T) => T.ev(() => {
  const g = __game, b = g.belt, B = b.spec, p = g.player;
  return {
    t: g.time, ring: g.time * B.spin, a: Math.atan2(p.x - B.x, p.z - B.z), r: Math.hypot(p.x - B.x, p.z - B.z), y: p.y, yaw: p.yaw,
    state: p.state, onBelt: b.onBelt, riding: b.riding, laps: b.laps, angle: b.angle, seated: b.seated, bag: b.seat?.bag ?? null,
    top: B.top, spin: B.spin, prompt: document.getElementById('prompt')?.textContent ?? null,
  };
});
const events = (T) => T.ev(() => __game.belt.events.map((e) => ({ ...e, t: +e.t.toFixed(2) })));
const clearEvents = (T) => T.ev(() => { __game.belt.events.length = 0; });
// Stig on the hall floor `r` m from the belt's middle at angle `a`, facing it, the camera behind him.
async function onFloor(T, a, r, cam = 0) {
  await T.ev((a, r, cam) => {
    const g = __game, B = g.belt.spec, p = g.player;
    if (g.playerCar) g.exitCar(true);
    g.belt.release(false);
    p.state = 'normal';
    p.teleport(B.x + Math.sin(a) * r, B.z + Math.cos(a) * r, a + Math.PI);
    p.vx = p.vz = p.vy = 0;
    g.cam.yaw = a + Math.PI + cam; g.cam.snapNext = true;
  }, a, r, cam);
  await T.frames(6);
}
// Stig standing on the belt at angle a, radius r (no teleport snap: the belt's top set by hand).
async function onBelt(T, a, r, cam = 0) {
  await T.ev((a, r, cam) => {
    const g = __game, B = g.belt.spec, p = g.player;
    g.belt.release(false);
    p.state = 'normal';
    p.x = B.x + Math.sin(a) * r; p.z = B.z + Math.cos(a) * r; p.y = B.top; p.yaw = a;
    p.vx = p.vz = p.vy = 0; p.onGround = true;
    g.cam.yaw = a + Math.PI + cam; g.cam.snapNext = true;
  }, a, r, cam);
  await T.frames(4);
}
// The camera in front of him (he faces out when he sits), a little off to one side.
const faceCam = (T, off = 0.5) => T.ev((off) => { const g = __game; g.cam.yaw = g.player.yaw + Math.PI + off; g.cam.snapNext = true; }, off);

export const SCENARIOS = {
  async bagage(T) {
    await T.fresh('&mission=5');
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam at index 5');
    const cfg = await T.ev(() => __game.belt.cfg);
    const spec = await T.ev(() => { const B = __game.belt.spec; return { x: B.x, z: B.z, top: B.top, r0: B.r0, r1: B.r1, spin: B.spin, bags: B.bags.length, block: B.block?.kind }; });
    T.log('belt', JSON.stringify(spec));
    check(spec.block === 'carousel' && spec.bags === 13 && Math.abs(spec.top - 0.79) < 1e-6, 'the belt: a carousel floor at 0.79 with 13 bags (the skis left out)');
    // Nobody at the airport to talk into a mission by accident: Lasse (buss17's giver) stays at `airport`.

    // 1. From the floor, a jump onto the belt: he lands on it and it carries him.
    const A0 = 2.3;   // south-east of the middle, towards the forecourt
    await onFloor(T, A0, 3.8);
    await T.tap('Space');
    await T.hold(['KeyW'], 300);   // a step forwards in the air, onto the belt (not over it)
    await T.until(() => __game.player.onGround && Math.hypot(__game.player.vx, __game.player.vz) < 0.2, 3000).catch(() => {});
    await T.frames(2);
    let s0 = await st(T);
    T.log('landed', JSON.stringify(s0));
    check(s0.onBelt && s0.riding && Math.abs(s0.y - s0.top) < 0.02 && s0.r > 1.9 && s0.r < 3.3, 'he jumped onto the belt and stands on it');
    const cam0 = await T.ev(() => __game.cam.yaw);
    await T.sleep(1500);
    let s1 = await st(T);
    const cam1 = await T.ev(() => __game.cam.yaw);
    check(Math.abs(wrap(cam1 - cam0)) < 1e-6, `the follow camera does not turn with him (${cam0.toFixed(3)} -> ${cam1.toFixed(3)})`);
    const turned = wrap(s1.a - s0.a), want = (s1.t - s0.t) * s0.spin;
    T.log('carried', turned.toFixed(3), 'want', want.toFixed(3), 'r', s0.r.toFixed(3), '->', s1.r.toFixed(3), 'yaw turned', wrap(s1.yaw - s0.yaw).toFixed(3));
    check(Math.abs(turned - want) < 0.03, `the belt carries him at its spin (${turned.toFixed(3)} rad vs ${want.toFixed(3)})`);
    check(Math.abs(s1.r - s0.r) < 0.01 && Math.abs(s1.y - s0.top) < 0.02, 'at the same radius and height');
    check(Math.abs(wrap(s1.yaw - s0.yaw) - want) < 0.03, 'his facing turns with it');
    let ev = await events(T);
    T.log('events', JSON.stringify(ev));
    check(ev.some((e) => e.what === 'board' && e.text === cfg.board[0]), `the session's first ride: "${cfg.board[0]}"`);
    await faceCam(T, 0.9);
    await T.shot('bagage_star');

    // 2. The centre island stands still.
    await T.ev(() => { const g = __game, B = g.belt.spec, p = g.player; g.belt.end(); p.x = B.x + 1.1; p.z = B.z; p.y = 0.15 + 1.03; p.vx = p.vz = p.vy = 0; });
    await T.frames(30);
    const i0 = await st(T);
    await T.sleep(1000);
    const i1 = await st(T);
    T.log('island', JSON.stringify({ a0: i0.a, a1: i1.a, r: i1.r, y: i1.y, onBelt: i1.onBelt }));
    check(!i1.onBelt && Math.abs(wrap(i1.a - i0.a)) < 0.005 && Math.abs(i1.y - 1.18) < 0.02, 'on the centre island he is not carried (floor 1.18)');

    // 3. Standing still on the belt he sits down on the nearest bag and turns with it.
    await clearEvents(T);
    await onBelt(T, A0, 2.8);
    const t0 = (await st(T)).t;
    await T.until(() => __game.belt.seated, 6000).catch(() => {});
    let s2 = await st(T);
    T.log('sat', JSON.stringify(s2), 'after', (s2.t - t0).toFixed(2));
    check(s2.seated && s2.state === 'seated' && s2.t - t0 > 2.3 && s2.t - t0 < 3.2, `he sits down after standing still ${cfg.sitAfter} s (${(s2.t - t0).toFixed(2)})`);
    await T.sleep(600);
    s2 = await st(T);
    const bag = s2.bag;
    const off = wrap(s2.a - (bag.a + s2.ring));
    T.log('on bag', JSON.stringify(bag), 'angle off', off.toFixed(4), 'r', s2.r.toFixed(3), 'y', s2.y.toFixed(3), 'yaw-a', wrap(s2.yaw - s2.a).toFixed(3));
    check(Math.abs(off) < 0.002 && Math.abs(s2.r - (bag.out - cfg.seatIn)) < 0.01 && Math.abs(s2.y - bag.top) < 0.01, 'on the bag\'s lid, at its place in the ring');
    check(Math.abs(wrap(s2.yaw - s2.a)) < 0.01, 'facing out');
    check(/Kliv av bandet/.test(s2.prompt || ''), `the prompt "${cfg.prompt}" (${s2.prompt})`);
    await faceCam(T, 0.45);
    await T.shot('bagage_sitter');
    await T.ev(() => { const g = __game; g.cam.yaw = g.player.yaw + Math.PI / 2 + 0.25; g.cam.snapNext = true; });
    await T.shot('bagage_sitter_sida');

    // 4. A full turn: the toast and Lasse on the radio; the bag keeps him.
    const lapAt = await T.ev(() => { const b = __game.belt; return __game.time + (Math.PI * 2 - b.angle) / b.spec.spin; });
    T.log('lap 1 due at', lapAt.toFixed(2));
    await T.until(() => __game.belt.laps >= 1, 30000);
    let s3 = await st(T);
    T.log('lap 1 at', s3.t.toFixed(2));
    check(Math.abs(s3.t - lapAt) < 0.2, 'the first turn on time');
    await T.sleep(1500);
    await faceCam(T, 0.45);
    await T.shot('bagage_varv');
    s3 = await st(T);
    ev = await events(T);
    T.log('events', JSON.stringify(ev));
    check(ev.some((e) => e.what === 'lap' && e.n === 1 && e.text === cfg.laps[0]), `"${cfg.laps[0]}"`);
    const lasse = ev.find((e) => e.what === 'lasse');
    const lap1 = ev.find((e) => e.what === 'lap' && e.n === 1);
    check(lasse && lasse.text === cfg.lasse[1] && lasse.t - lap1.t > 1.0 && lasse.t - lap1.t < 1.6, `Lasse on the radio ${cfg.lasseAt} s later`);
    const toasts = await T.ev(() => [...document.querySelectorAll('#toasts > *, .toast')].map((e) => e.textContent));
    T.log('toasts', JSON.stringify(toasts));
    check(toasts.some((t) => t.includes(cfg.laps[0])) && toasts.some((t) => t.includes(cfg.lasse[1])), 'both on screen');
    check(Math.abs(wrap(s3.a - (s3.bag.a + s3.ring))) < 0.002 && s3.seated, 'still on his bag');

    // 5. The second and third turns: "Två varv…", "Tre varv…" and the luggage line.
    await T.until(() => __game.belt.laps >= 3, 50000);
    await T.sleep(cfg.luggageAt * 1000 + 300);
    await faceCam(T, 0.6);
    await T.shot('bagage_las_palmas');
    ev = await events(T);
    T.log('events', JSON.stringify(ev));
    check(ev.some((e) => e.what === 'lap' && e.n === 2 && e.text === cfg.laps[1]) && ev.some((e) => e.what === 'lap' && e.n === 3 && e.text === cfg.laps[2]), 'the second and third turns');
    const lug = ev.find((e) => e.what === 'luggage'), lap3 = ev.find((e) => e.what === 'lap' && e.n === 3);
    check(lug && lug.text === cfg.luggage && lug.t - lap3.t > 0.4 && lug.t - lap3.t < 1.0, `after the third: "${cfg.luggage}"`);
    check(ev.filter((e) => e.what === 'lasse').length === 1, 'Lasse once');

    // 6. Space hops him off the bag; he lands on the belt and the ride goes on.
    const laps3 = (await st(T)).laps;
    await T.tap('Space');
    let s4 = await st(T);
    T.log('hop', JSON.stringify(s4));
    check(!s4.seated && s4.state === 'normal', 'Space: off the bag');
    await T.until(() => __game.belt.onBelt, 3000).catch(() => {});
    s4 = await st(T);
    check(s4.onBelt && s4.riding && s4.laps === laps3, 'back on the belt, the ride goes on');

    // 7. Down again, then E: off the belt onto the floor; the ride ends.
    await T.until(() => __game.belt.seated, 6000);
    await T.sleep(400);
    await T.tap('KeyE');
    await T.frames(10);
    let s5 = await st(T);
    T.log('off', JSON.stringify(s5));
    check(!s5.seated && s5.state === 'normal' && Math.abs(s5.r - cfg.offR) < 0.3 && s5.y < 0.2 && !s5.riding && s5.laps === 0, 'E: off the belt onto the hall floor, the ride over');
    await T.sleep(800);
    s5 = await st(T);
    check(!s5.onBelt && Math.abs(s5.r - cfg.offR) < 0.3, 'and not carried there');
    await faceCam(T, 0.3);
    await T.shot('bagage_av');

    // 8. A second ride: no sigh again. Down on a bag, then R: up on the road.
    await clearEvents(T);
    await onBelt(T, A0 + 1, 2.8);
    await T.until(() => __game.belt.seated, 6000);
    ev = await events(T);
    check(!ev.some((e) => e.what === 'board'), 'no sigh on the second ride');
    await T.tap('KeyR');
    await T.frames(10);
    const s6 = await st(T);
    T.log('reset', JSON.stringify(s6));
    check(!s6.seated && s6.state === 'normal' && s6.r > 5, 'R from a bag: up and back on the road');

    // 9. In a running mission the belt carries nobody.
    await T.startMission();
    await T.until(() => !__game.inDialog, 30000).catch(() => {});
    await onBelt(T, A0, 2.8);
    const m0 = await st(T);
    await T.sleep(1200);
    const m1 = await st(T);
    T.log('mission', await T.state(), JSON.stringify({ a0: m0.a, a1: m1.a, riding: m1.riding }));
    check(Math.abs(wrap(m1.a - m0.a)) < 0.005 && !m1.riding && !m1.seated, 'in a mission the belt carries nobody');

    // 10. After julafton: "Det är faktiskt rätt rogivande.", and no Lasse after the first turn.
    await T.fresh('&mission=13');
    check(await T.ev(() => __game.missions.state === 'idle' && __game.belt.bagBack), 'free roam after julafton');
    await onBelt(T, A0, 2.8);
    await T.until(() => __game.belt.events.some((e) => e.what === 'board'), 4000).catch(() => {});
    ev = await events(T);
    T.log('after julafton', JSON.stringify(ev));
    check(ev.some((e) => e.what === 'board' && e.text === cfg.board[1]), `"${cfg.board[1]}"`);
    await T.until(() => __game.belt.seated, 6000);
    await faceCam(T, 0.5);
    await T.shot('bagage_efter_jul');
    // Skip ahead to just before the first turn (its timing is checked above).
    await T.ev(() => { __game.belt.angle = Math.PI * 2 - 0.15; });
    await T.until(() => __game.belt.laps >= 1, 5000);
    await T.sleep((cfg.lasseAt + 0.6) * 1000);
    ev = await events(T);
    check(ev.some((e) => e.what === 'lap' && e.n === 1) && !ev.some((e) => e.what === 'lasse'), 'the first turn, and no Lasse after julafton');
  },
};
