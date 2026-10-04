// Island scenarios (WP-B): smash, foot (DESIGN §16.4).
import { check } from '../lib.mjs';

export const SCENARIOS = {
  // Ram the nearest Correos box with the hyrbil, then a pedestrian: SKANDAL rose, coins burst.
  async smash(T) {
    await T.fresh('&mission=6');
    const r = await T.ev(() => {
      const g = __game, car = g.named.hyrbil;
      g.enterCar(car);
      let best = null, bd = 1e9;
      for (const p of window.__props) if (p.alive && p.type === 'correos') { const d = Math.hypot(p.x - car.x, p.z - car.z); if (d < bd && d > 10) { bd = d; best = p; } }
      let ok = null;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = best.x - dx * 14, z = best.z - dz * 14;
        if (g.spotFree(x, z)) { ok = { x, z, yaw: Math.atan2(dx, dz) }; break; }
      }
      car.place(ok.x, ok.z, ok.yaw);
      window.__target = best;
      return { prop: [best.x.toFixed(1), best.z.toFixed(1)], from: ok };
    });
    T.log('target', JSON.stringify(r));
    await T.frames(5);
    await T.shot('smash_0');
    await T.hold(['KeyW'], 1600);
    await T.frames(10);
    await T.shot('smash_1');
    const st = await T.ev(() => ({ alive: window.__target.alive, v: __game.shame.v }));
    T.log('correos alive?', st.alive, 'skandal', st.v.toFixed(1));
    check(!st.alive && st.v > 0, 'the Correos box broke and SKANDAL rose');
  },

  // On foot: jump onto a parked car roof, double jump.
  async foot(T) {
    await T.fresh('&mission=6');
    const r = await T.ev(() => { const g = __game, c = g.named.hyrbil; g.player.teleport(c.x, c.z); g.player.y = c.y + c.height + 1.5; g.player.onGround = false; return c.y + c.height; });
    await T.frames(30);
    T.log('roof top', r.toFixed(2), 'player y', (await T.ev(() => __game.player.y)).toFixed(2));
    await T.shot('foot_roof');
    await T.ev(() => { const g = __game, b = window.__lm('plaza'); g.player.teleport(b.x + 8, b.z + 8); });
    await T.frames(5);
    let top = 0;
    await T.tap('Space');
    for (let k = 0; k < 12; k++) { await T.frames(1); top = Math.max(top, await T.ev(() => __game.player.y)); }
    await T.tap('Space');
    for (let k = 0; k < 40; k++) { await T.frames(1); top = Math.max(top, await T.ev(() => __game.player.y)); }
    T.log('double jump apex', top.toFixed(2));
    check(top > 2, 'double jump');
  },
};
