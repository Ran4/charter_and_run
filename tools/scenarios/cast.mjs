// Cast and vehicle scenarios (WP-E): castsheet, cars (DESIGN §16.4).
// Phase 0a ships a plain castsheet (every CAST key in a row on the island).

export const SCENARIOS = {
  async castsheet(T) {
    await T.fresh('&mission=6');
    await T.ev(() => {
      const g = __game, f = window.__lm('plaza');
      const keys = Object.keys(g.npcs);
      keys.forEach((k, i) => g.placeNpc(k, 'plaza', (i - keys.length / 2) * 1.3, 4, Math.PI));
      g.player.teleport(f.x, f.z + 12, Math.PI);
      g.cutTo({ at: { x: f.x, z: f.z + 4, yaw: 0 }, dist: -14, height: 4 });
    });
    await T.frames(20);
    await T.shot('castsheet');
  },
};
