// Flight scenarios (WP-A1): gate, cabin, trolley, turbulence, panic (DESIGN §16.4).
// Phase 0a ships `cabin` (one shot per phase, walls hold, the camera stays above the walls).
import { check } from '../lib.mjs';

export const SCENARIOS = {
  async cabin(T) {
    await T.fresh('&mission=2');
    for (const ph of ['gate', 'takeoff', 'climb', 'cruise', 'approach', 'landing', 'landed']) {
      await T.ev((ph) => __game.cabin.setPhase(ph, { instant: true, hold: true }), ph);
      await T.frames(10);
      await T.shot('cabin_' + ph);
    }
    // Walk into each cabin wall for 2 s: still inside.
    for (const [yaw, key] of [[Math.PI / 2, 'port'], [-Math.PI / 2, 'starboard'], [0, 'nose'], [Math.PI, 'tail']]) {
      await T.ev((yaw) => { const g = __game; g.cabin.setPhase('cruise', { instant: true }); const s = window.__lm('cabinCentre'); g.debugWarp(s.x, s.z - 0.6, yaw); g.cam.yaw = yaw; }, yaw);
      await T.hold(['KeyW'], 2000);
      const r = await T.ev(() => { const g = __game, p = g.player; return { inside: g.cabin.inCabin(p.x, p.z), camY: g.cam.cam.position.y, x: p.x.toFixed(2), z: p.z.toFixed(2) }; });
      T.log('wall', key, JSON.stringify(r));
      check(r.inside, `still inside after walking ${key}`);
      check(r.camY > 4, 'camera above the walls');
    }
    await T.shot('cabin_walls');
  },
};
