// Shared story helper (Phase 0 placeholders): start the mission, then hop to whatever the running
// stage points at (goto destinations) until the mission is over, then wait for idle at k + 1.
export function generic(k) {
  return async (T) => {
    await T.startMission();
    for (let n = 0; n < 60; n++) {
      const s = await T.ev(() => {
        const m = __game.missions;
        if (m.state !== 'running') return 'over';
        const d = m.stage?.dest;
        return d ? { x: d.x, z: d.z, yaw: d.yaw ?? 0, inCar: !!m.stage.o?.inCar } : null;
      });
      if (s === 'over') break;
      if (s) {
        if (s.inCar) await T.anyCar();
        await T.warp(s.x, s.z, s.yaw);
      }
      await T.frames(8);
    }
    await T.waitIdle(k + 1);
  };
}
