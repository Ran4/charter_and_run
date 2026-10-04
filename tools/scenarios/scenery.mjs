// Flight scenery scenarios (WP-A2, DESIGN §5.6, §16.4).
//   phases    every flight phase frozen at t = 0.5·len (open phases at 6 s): one shot from the default
//             cabin camera and one from outside the plane; airframe rules (nothing above y 3 within
//             7 m aft of the rear wall, parts containing the camera hidden), off when the camera is far.
//   flightseq the animated chains takeoff -> climb -> cruise and approach -> landing -> landed, seated
//             in 14B, a shot every ~2 game seconds (looks at the transitions and whiteouts).
//   dc8       the closed buildPlaneExterior() DC-8 parked where the Gando block puts it (240, -335).
import { check } from '../lib.mjs';

const LEN = { takeoff: 12, climb: 8, approach: 14, landing: 6 };
const MID = { gate: 6, takeoff: 6, climb: 3.6, cruise: 6, approach: 7, landing: 3, landed: 6 };
// Outside camera per phase, plane-local [eye], [look at].
const OUTSIDE = {
  gate: [[-36, 15, 50], [6, -1.5, 4]],
  takeoff: [[-34, 5, -42], [0, -1, 4]],
  climb: [[-42, 10, 26], [0, 0, -2]],
  cruise: [[-40, 16, 38], [0, -2, -4]],
  approach: [[44, 16, 46], [-30, -12, -10]],
  landing: [[-38, 3, -36], [0, -2, 6]],
  landed: [[46, 13, 46], [-40, -2, -6]],
};

// Park the cabin (and its scenery) at phase ph, time t: start it animated a little earlier so
// particles and snow are flowing, then freeze game time (timeScale 0) for the shots.
async function parkAt(T, ph, t) {
  const t0 = Math.max(0, t - 0.8);
  await T.ev((ph, t0) => {
    const g = __game, c = g.cabin;
    g.timeScale = 1;
    c.setPhase(ph, { hold: true });
    c.phaseT = t0;
    c._fired = { drone: true, 'bump1.5': true, bump4: true, 'bump6.5': true, touch: true, rev: true };
    c.scenery.setPhaseVisual(ph, t0);
  }, ph, t0);
  await T.sleep(800);
  return T.ev(() => { const g = __game; g.timeScale = 0; return { t: +g.cabin.scenery.phaseT.toFixed(2), cabinT: +g.cabin.phaseT.toFixed(2), phase: g.cabin.phase }; });
}

export const SCENARIOS = {
  async phases(T) {
    await T.fresh('&mission=2');
    await T.ev(() => { const g = __game; g.cabin.stopTrolley(); });
    const stats = [];
    for (const ph of ['gate', 'takeoff', 'climb', 'cruise', 'approach', 'landing', 'landed']) {
      const r = await parkAt(T, ph, MID[ph]);
      T.log('phase', ph, JSON.stringify(r));
      check(r.phase === ph, `cabin stays in ${ph}`);
      check(Math.abs(r.t - Math.min(MID[ph], LEN[ph] ?? 99)) < 0.4, `scenery clock near ${MID[ph]} in ${ph}`);
      // Default cabin camera: standing in the aisle by row 10 (over the wing), facing the nose.
      await T.ev(() => { const g = __game, s = window.__lm('cabinRow10'); if (g.player.seatId) g.standPlayer(); g.debugWarp(s.x, s.z - 0.4, 0); g.cam.yaw = 0; g.cam.snapNext = true; });
      await T.frames(6);
      await T.shot('phase_' + ph + '_cabin');
      stats.push([ph, await T.ev(() => window.__stats())]);
      // From outside the plane.
      await T.ev(([e, l]) => { __game.cam.cutTo({ x: 3000 + e[0], y: e[1], z: e[2] }, { x: 3000 + l[0], y: l[1], z: l[2] }); }, OUTSIDE[ph]);
      await T.frames(4);
      await T.shot('phase_' + ph + '_out');
      await T.ev(() => __game.cam.release());
    }
    for (const [ph, s] of stats) T.log('stats', ph, JSON.stringify(s));

    // Gate: on the jet bridge looking at the plane (bridge, door, apron below), and from the lounge.
    await parkAt(T, 'gate', 6);
    await T.ev(() => { const g = __game, s = window.__lm('bridge'); g.debugWarp(s.x + 3, s.z, -Math.PI / 2); g.cam.yaw = -Math.PI / 2; g.cam.snapNext = true; });
    await T.frames(6);
    await T.shot('phase_gate_bridge');
    await T.ev(() => { const g = __game, s = window.__lm('gateDesk'); g.debugWarp(s.x + 1, s.z - 6, -Math.PI / 2); g.cam.yaw = -Math.PI / 2 - 0.4; g.cam.snapNext = true; });
    await T.frames(6);
    await T.shot('phase_gate_lounge');

    // Airframe rules (DESIGN §5.3): nothing higher than y 3 within 7 m aft of the rear wall (z -20).
    const geo = await T.ev(() => {
      const af = __game.cabin.scenery.airframe, out = { maxZhigh: -99, parts: [] };
      for (const m of af.children) {
        if (!m.isMesh || !m.geometry?.attributes?.position || m.isInstancedMesh) continue;
        const p = m.geometry.attributes.position.array;
        for (let i = 0; i < p.length; i += 3) if (p[i + 1] > 3 && p[i + 2] < -19 && p[i + 2] > out.maxZhigh) out.maxZhigh = p[i + 2];
        out.parts.push(m.name);
      }
      return out;
    });
    T.log('airframe', JSON.stringify(geo));
    check(geo.maxZhigh <= -26.9, 'no airframe part above y 3 within 7 m aft of the rear wall');

    // A camera inside a part's bounding box hides that part; far away the whole set is off.
    const hide = await T.ev(async () => {
      const g = __game, P = g.cabin.scenery.airframe.userData.parts, wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      g.cam.cutTo({ x: 3000, y: 3.6, z: 23 }, { x: 3000, y: 1, z: 10 }); await wait(); await wait();
      const inNose = P.nose.visible;
      g.cam.cutTo({ x: 3000 + 30, y: 10, z: 40 }, { x: 3000, y: 0, z: 0 }); await wait(); await wait();
      const outNose = P.nose.visible;
      g.cam.cutTo({ x: 0, y: 60, z: 0 }, { x: 10, y: 0, z: 10 }); await wait(); await wait();
      const far = g.cabin.scenery.airframe.visible || g.cabin.scenery.scenery.visible;
      g.cam.release(); g.cam.snapNext = true;
      for (let k = 0; k < 60 && !g.cabin.scenery.airframe.visible; k++) await wait();
      return { inNose, outNose, far, back: g.cabin.scenery.airframe.visible };
    });
    T.log('hide', JSON.stringify(hide));
    check(!hide.inNose && hide.outNose, 'nose hidden only while the camera is inside it');
    check(!hide.far && hide.back, 'flight set off while the camera is far from the plane');

    // Galley back, camera toward the nose: no airframe mesh between camera and player.
    const ray = await T.ev(async () => {
      const g = __game, s = window.__lm('galleyBack');
      g.timeScale = 1; g.cabin.setPhase('cruise', { instant: true });
      g.debugWarp(s.x, s.z, 0); g.cam.yaw = 0; g.cam.snapNext = true;
      await new Promise((r) => setTimeout(r, 400));
      const { THREE } = await import('/src/gfx.js');
      const cam = g.cam.cam, p = g.player, from = cam.position.clone(), to = new THREE.Vector3(p.x, p.y + 1.2, p.z);
      const dir = to.clone().sub(from), d = dir.length();
      const rc = new THREE.Raycaster(from, dir.normalize(), 0.1, d - 0.3);
      const hits = rc.intersectObjects(g.cabin.scenery.airframe.children.filter((m) => m.isMesh && m.visible && !m.isInstancedMesh && !m.isPoints), true).map((h) => h.object.name || h.object.parent?.name);
      return { camZ: +from.z.toFixed(2), camY: +from.y.toFixed(2), hits };
    });
    T.log('galleyBack ray', JSON.stringify(ray));
    check(ray.hits.length === 0, 'no airframe between camera and player at galleyBack');
    await T.shot('phase_galleyback');
    T.log('fps cruise', await T.fps());
  },

  // Ad-hoc look: PEEK="climb:3.5,approach:2" -> cabin and outside shots at those phase times.
  async sceneryPeek(T) {
    await T.fresh('&mission=2');
    await T.ev(() => __game.cabin.stopTrolley());
    for (const item of (process.env.PEEK || 'climb:3.5,approach:2').split(',')) {
      const [ph, ts] = item.split(':'), t = +ts;
      const r = await parkAt(T, ph, t);
      T.log('peek', ph, JSON.stringify(r));
      await T.ev(() => { const g = __game, s = window.__lm('cabinRow10'); if (g.player.seatId) g.standPlayer(); g.debugWarp(s.x, s.z - 0.4, 0.4); g.cam.yaw = 0.4; g.cam.snapNext = true; });
      await T.frames(6);
      await T.shot(`peek_${ph}_${ts}_cabin`);
      await T.ev(([e, l]) => { __game.cam.cutTo({ x: 3000 + e[0], y: e[1], z: e[2] }, { x: 3000 + l[0], y: l[1], z: l[2] }); }, OUTSIDE[ph]);
      await T.frames(4);
      await T.shot(`peek_${ph}_${ts}_out`);
      await T.ev(() => __game.cam.release());
    }
  },

  async flightseq(T) {
    await T.fresh('&mission=2');
    await T.ev(() => { const g = __game; g.cabin.stopTrolley(); g.sitPlayer('14B'); g.cam.yaw = 0.5; });
    await T.ev(() => __game.cabin.setPhase('takeoff'));
    for (let k = 0; k < 12; k++) {
      await T.sleep(620);
      const r = await T.ev(() => `${__game.cabin.phase} ${__game.cabin.phaseT.toFixed(1)}`);
      await T.shot(`seq_a${String(k).padStart(2, '0')}`);
      T.log('seq', k, r);
    }
    await T.ev(() => __game.cabin.setPhase('approach'));
    for (let k = 0; k < 11; k++) {
      await T.sleep(620);
      const r = await T.ev(() => `${__game.cabin.phase} ${__game.cabin.phaseT.toFixed(1)}`);
      await T.shot(`seq_b${String(k).padStart(2, '0')}`);
      T.log('seq', k, r);
    }
  },

  async dc8(T) {
    await T.fresh('&mission=6');
    const r = await T.ev(async () => {
      const { THREE, scene } = await import('/src/gfx.js');
      const { buildPlaneExterior, PLANE_GROUND_Y } = await import('/src/world/flightScenery.js');
      const grp = buildPlaneExterior(new THREE.Group(), { gear: true });
      grp.position.set(240, 0.15 - PLANE_GROUND_Y, -335);
      grp.rotation.y = 0.6;
      scene.add(grp);
      __game.cam.cutTo({ x: 240 + 42, y: 16, z: -335 + 46 }, { x: 240, y: 3, z: -335 });
      return { parts: Object.keys(grp.userData.parts) };
    });
    T.log('dc8', JSON.stringify(r));
    await T.frames(8);
    await T.shot('dc8_parked');
    await T.ev(() => __game.cam.cutTo({ x: 240 - 30, y: 4, z: -335 - 40 }, { x: 240, y: 4, z: -335 }));
    await T.frames(6);
    await T.shot('dc8_parked_rear');
  },
};
