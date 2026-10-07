// Performance check (DESIGN §16.4 `perf`): frame rate and frame cost in the cabin in every flight
// phase and in the busiest island views.
//   fps     frames counted over 2 s of real play (requestAnimationFrame is capped at the display
//           rate, 60 here, so this shows a drop but not the headroom)
//   update  mean ms of game.update per frame (simulation, AI, particles, HUD), measured over 2 s
//   render  mean ms of one renderer.render forced to finish on the GPU (a 1-pixel readPixels after
//           each of 12 renders), i.e. the real draw cost of the view
//   calls / tris from renderer.info of the last frame
// Fails when a view drops below 45 fps or would (update + render > 1000/45 ms).
import { check } from '../lib.mjs';

const FLOOR_FPS = 45;
const PHASES = ['gate', 'takeoff', 'climb', 'cruise', 'approach', 'landing', 'landed'];

// In the page: time game.update for `ms` and count frames; then time synced renders.
async function measure(T, label) {
  const r = await T.ev(async (ms) => {
    const g = __game;
    const { renderer, scene, camera } = await import('/src/gfx.js');
    const orig = g.update;
    let sum = 0, n = 0;
    g.update = function (dt) { const t0 = performance.now(); orig.call(this, dt); sum += performance.now() - t0; n++; };
    const f0 = window.__frame, t0 = performance.now();
    await new Promise((res) => setTimeout(res, ms));
    const fps = (window.__frame - f0) / ((performance.now() - t0) / 1000);
    g.update = orig;
    const gl = renderer.getContext(), px = new Uint8Array(4);
    renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const k = 12, r0 = performance.now();
    for (let i = 0; i < k; i++) { renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
    const render = (performance.now() - r0) / k;
    const info = renderer.info.render;
    return { fps: +fps.toFixed(1), update: +(sum / Math.max(1, n)).toFixed(2), render: +render.toFixed(2), calls: info.calls, tris: Math.round(info.triangles / 1000) + 'k' };
  }, 2000);
  T.log('perf', label, JSON.stringify(r));
  return { label, ...r };
}

export const SCENARIOS = {
  async perf(T) {
    const out = [];
    // Cabin, seated in 14B with the aisle camera, every phase running (not frozen).
    await T.fresh('&mission=2');
    await T.ev(() => { const g = __game; g.cabin.stopTrolley(); g.sitPlayer('14B'); g.cam.yaw = 0.5; g.cam.snapNext = true; });
    for (const ph of PHASES) {
      await T.ev((ph) => __game.cabin.setPhase(ph, { hold: true }), ph);
      await T.sleep(1200);
      out.push(await measure(T, 'cabin ' + ph));
    }
    // Standing in the aisle at row 10, cruise (more of the cabin in view).
    await T.ev(() => { const g = __game, s = window.__lm('cabinRow10'); g.standPlayer(); g.debugWarp(s.x, s.z - 0.4, 0.4); g.cam.yaw = 0.4; g.cam.snapNext = true; g.cabin.setPhase('cruise', { hold: true }); });
    await T.sleep(1200);
    out.push(await measure(T, 'cabin aisle cruise'));
    // The gate (the terminal plus the parked plane with its full cabin).
    await T.fresh('&mission=0');
    await T.sleep(800);
    out.push(await measure(T, 'gate spawn'));

    // Island: the spawn, the plaza and the market on foot, a drive through the centre with
    // traffic, and the high view over the whole town.
    await T.fresh('&mission=6');
    await T.sleep(800);
    out.push(await measure(T, 'island spawn'));
    for (const name of ['plaza', 'marknad', 'kasbah']) {
      await T.ev((n) => { const g = __game, s = g.approachSpot(n); g.player.teleport(s.x, s.z, s.yaw); g.cam.yaw = s.yaw; g.cam.snapNext = true; }, name);
      await T.sleep(1000);
      out.push(await measure(T, 'island ' + name));
    }
    await T.ev(() => { const g = __game, car = g.named.hyrbil; g.enterCar(car); car.place(-40, 60, Math.PI); g.cam.yaw = Math.PI; g.cam.snapNext = true; });
    await T.frames(3);
    await T.page.keyboard.down('w');
    try { await T.sleep(1500); out.push(await measure(T, 'island drive centre')); } finally { await T.page.keyboard.up('w'); }
    await T.ev(() => __game.cam.cutTo({ x: -60, y: 120, z: 380 }, { x: 0, y: 0, z: 0 }));
    await T.sleep(800);
    out.push(await measure(T, 'island high'));
    await T.ev(() => __game.cam.release());

    const slow = out.filter((m) => m.fps < FLOOR_FPS || m.update + m.render > 1000 / FLOOR_FPS);
    T.log('perf worst', JSON.stringify(out.reduce((a, b) => (b.update + b.render > a.update + a.render ? b : a))));
    check(!slow.length, `below ${FLOOR_FPS} fps: ${slow.map((m) => `${m.label} ${m.fps} fps, ${(m.update + m.render).toFixed(1)} ms`).join('; ')}`);
  },
};
