// Shared story helpers (owner none; F and G import them). Every helper takes the harness T.
//   stageI(T) · untilStage(T, n) · lmSpot(T, name) · warpLm(T, name, { approach }) · footAt(T, name)
//   carBeside(T, key) · touchAll(T) · followCar(T, back) · breakAll(T) · raceCheckpoints(T) · haggleWin(T)
//   generic(k): the Phase-0a hop-to-goto placeholder (kept for quick experiments)

export const stageI = (T) => T.ev(() => __game.missions.stageI);

// Wait until the running mission reaches stage n (or is no longer running).
export async function untilStage(T, n, timeout = 90000) {
  await T.until((n) => __game.missions.state !== 'running' || __game.missions.stageI >= n, timeout, n);
  T.log('stage', await T.state());
}

export const lmSpot = (T, name) => T.ev((n) => window.__lm(n), name);

// Warp whatever the player controls onto a landmark (approach: the §4.4 spot in front of it).
export async function warpLm(T, name, { approach = false } = {}) {
  await T.ev((n, a) => { const g = __game, l = a ? g.approachSpot(n) : window.__lm(n); g.debugWarp(l.x, l.z, l.yaw || 0); }, name, approach);
  await T.frames(3);
}

// On foot at a landmark (gets out of the car first).
export async function footAt(T, name, opts) {
  await T.ev(() => { if (__game.playerCar) __game.exitCar(true); });
  await T.frames(2);
  await warpLm(T, name, opts);
}

// Bring the player's car to a stop beside an NPC (passenger pick-ups and re-boarding).
export async function carBeside(T, key) {
  await T.anyCar();
  await T.ev((k) => {
    const g = __game, n = g.npc(k), x = n.car ? n.car.x : n.x, z = n.car ? n.car.z : n.z;
    const s = g.freeSpot(x, z, 3.5, 6);
    g.debugWarp(s.x, s.z, g.playerCar ? g.playerCar.yaw : 0);
  }, key);
  await T.frames(6);
}

// Touch every live entry of stage.list (collect / rabbits / smash-free kinds), one warp each.
export async function touchAll(T, { tries = 12 } = {}) {
  const i0 = await stageI(T);
  for (let k = 0; k < tries; k++) {
    const p = await T.ev(() => {
      const st = __game.missions.stage;
      const e = st?.list?.find((x) => x.alive);
      if (!e) return null;
      return { x: e.px ?? e.x, z: e.pz ?? e.z };
    });
    if (!p || (await stageI(T)) !== i0) break;
    await T.warp(p.x, p.z, 0);
    await T.frames(6);
  }
}

// Tail the followed car `back` metres behind it until the stage changes.
export async function followCar(T, back = 12, timeout = 120000) {
  const i0 = await stageI(T);
  await T.anyCar();
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await T.ev((back) => {
      const g = __game, m = g.missions, c = m.stage?.car;
      if (m.state !== 'running' || !c) return 'over';
      g.debugWarp(c.x - Math.sin(c.yaw) * back, c.z - Math.cos(c.yaw) * back, c.yaw);
      return m.stageI;
    }, back);
    if (s === 'over' || s !== i0) break;
    await T.sleep(1500);
  }
  T.log('follow done', await T.state());
}

// smash: break every intact prop of the stage on foot until the stage is over.
export async function breakAll(T) {
  await T.ev(() => { if (__game.playerCar) __game.exitCar(true); });
  const i0 = await stageI(T);
  for (let k = 0; k < 20; k++) {
    const left = await T.ev(() => {
      const g = __game, st = g.missions.stage, p = st?.list?.find((q) => q.alive);
      if (!p) return false;
      g.debugWarp(p.x + 1.2, p.z, 0);
      g.breakProp(p, 0, 0);
      return true;
    });
    await T.frames(4);
    if (!left || (await stageI(T)) !== i0) break;
  }
}

// race: after the countdown, warp checkpoint by checkpoint (keeping the heading toward the next).
export async function raceCheckpoints(T) {
  await T.until(() => __game.missions.stage?.countdown <= 0, 20000);
  const i0 = await stageI(T);
  for (let k = 0; k < 20; k++) {
    const more = await T.ev(() => {
      const g = __game, st = g.missions.stage;
      if (!st?.cps || st.pi >= st.cps.length) return false;
      const c = st.cps[st.pi], n = st.cps[st.pi + 1] || c;
      g.debugWarp(c.x, c.z, Math.atan2(n.x - c.x, n.z - c.z) || (g.playerCar?.yaw ?? 0));
      return true;
    });
    await T.frames(5);
    if (!more || (await stageI(T)) !== i0) break;
  }
}

// haggle: E each time the marker sits well inside the green zone, until the stage is over.
export async function haggleWin(T) {
  const i0 = await stageI(T);
  for (let k = 0; k < 12; k++) {
    const ok = await T.until((i0) => {
      const m = __game.missions, st = m.stage;
      if (m.state !== 'running' || m.stageI !== i0) return true;
      return st.inZone && st.mk - st.zone[0] > 0.08 && st.zone[1] - st.mk > 0.08;
    }, 30000, i0).then(() => true, () => false);
    if (!ok || (await stageI(T)) !== i0 || !(await T.ev(() => __game.missions.state === 'running'))) break;
    const r0 = await T.ev(() => __game.missions.stage.round);
    await T.tap('KeyE');
    T.log('haggle bid', r0, '->', await T.ev(() => `${__game.missions.stage?.round} price ${__game.missions.stage?.price}`));
    await T.frames(4);
  }
}

// Phase-0a placeholder: hop to whatever goto destination the running stage points at.
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
