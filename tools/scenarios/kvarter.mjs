// Kvarteren tänds – adventsstjärnor och tända fönster (free roam, DESIGN §10.64; feature 140): kvarter.
//   kvarter: the residential blocks' lit windows and the advent stars' glow, all in town.js's one
//            nightGlow mesh: what was lit (LIT_STATS: the 52 slabs and 48 bungalows, about half the
//            balcony windows, a few blue television panes, the lobbies, every star), the mesh unlit by
//            day (test mode's 15:00) and lit at dusk and night (the island's clock, §10.10), no new
//            mesh or draw call; the shots: the street under HOTEL ATLÁNTICO (the feature's image 2/3),
//            the town from above towards Hotel Flamenco (image 1), a bungalow street, Flamenco's
//            ground-floor row with its four stars and none in 107, the same street at dusk and by day.
import { check } from '../lib.mjs';

const PI = Math.PI;
// The night glow mesh: drawn after the last render, its triangles, and how many there are of it.
const glow = (T) => T.ev(() => {
  const sc = __game.scene, m = sc.getObjectByName('nightGlow');
  let meshes = 0;
  sc.traverse((o) => { if (o.name === 'nightGlow') meshes++; });
  return { drawn: m.geometry.drawRange.count > 0, tris: m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3, meshes, sky: __game.sky, h: __game.day.h };
});
const setH = async (T, h) => { await T.ev((h) => __game.day.set(h), h); await T.frames(4); };
// A fixed camera: the chase camera's update stops until `free(T)`, and the eye stands at `eye`
// looking at `at` (the player parked out of the way at `stand`).
const pose = (T, eye, at, fov = 60) => T.ev(async (eye, at, fov) => {
  const g = __game, { camera } = await import('/src/gfx.js');
  if (!g.cam._kvUpdate) { g.cam._kvUpdate = g.cam.update; g.cam.update = () => {}; }
  camera.position.set(...eye); camera.lookAt(...at); camera.fov = fov; camera.updateProjectionMatrix();
}, eye, at, fov);
const free = (T) => T.ev(() => { const g = __game; if (g.cam._kvUpdate) { g.cam.update = g.cam._kvUpdate; delete g.cam._kvUpdate; } g.cam.snapNext = true; });

export const SCENARIOS = {
  async kvarter(T) {
    await T.fresh('&mission=9');
    await T.frames(10);

    // --- What was lit: every slab and bungalow lot, the shares.
    const st = await T.ev(async () => ({ ...(await import('/src/world/town.js')).LIT_STATS }));
    T.log('lit', JSON.stringify(st), 'share', (st.panes / st.windows).toFixed(3), 'tv', (st.tv / st.panes).toFixed(3));
    check(st.slabs === 52 && st.bungalows === 48, `all 52 slabs and 48 bungalows (${st.slabs}, ${st.bungalows})`);
    check(st.panes / st.windows > 0.4 && st.panes / st.windows < 0.55, `about half the windows lit (${st.panes}/${st.windows})`);
    check(st.tv > 0 && st.tv / st.panes < 0.15, `a few blue television panes (${st.tv})`);
    check(st.lobbies > 30 && st.lobbies < 52, `most lobbies lit (${st.lobbies})`);
    check(st.stars > 30, `the advent stars glow (${st.stars})`);

    // --- By day (test mode's 15:00) nothing is drawn; at dusk and at night all of it, in one mesh.
    const day = await glow(T);
    await setH(T, 20.1667);
    const dusk = await glow(T);
    await setH(T, 22);
    const night = await glow(T);
    T.log('glow', JSON.stringify({ day, dusk, night }));
    check(day.h === 15 && day.sky === 'day' && !day.drawn, '15:00: day, the windows dark');
    check(dusk.drawn && night.drawn && night.sky === 'night', 'dusk and night: lit');
    check(night.meshes === 1 && day.meshes === 1, 'no new mesh: the lights are in the one night glow');

    // --- Shots. The street under HOTEL ATLÁNTICO (the feature's image 2), looking up at its front.
    const atl = await T.ev(async () => { const r = (await import('/src/world/town.js')).ROOF_JUMP.roofs.atl; return { x: (r.minX + r.maxX) / 2, z0: r.minZ, x0: r.minX }; });
    const street = { eye: [atl.x - 11, 1.7, atl.z0 - 17.5], at: [atl.x + 2, 15, atl.z0 + 2] };
    await T.ev((x, z) => { const g = __game; g.player.teleport(x, z, 0); }, atl.x - 30, atl.z0 - 13);
    await pose(T, street.eye, street.at);
    await T.frames(20);
    await T.shot('kvarter_gata');
    // The town from above towards Hotel Flamenco (image 1).
    await pose(T, [atl.x - 20, 34, atl.z0 + 40], [5, 6, -10], 55);
    await T.frames(10);
    await T.shot('kvarter_stan');
    // A bungalow street: (3,5)'s north side (its lots face north, frame yaw 0), the middle lot's
    // front and the next one's from the street.
    const bung = await T.ev(async () => {
      const { blockInterior } = await import('/src/world/layout.js'), { dogLots } = await import('/src/world/town.js'), b = blockInterior(3, 5);
      const l = dogLots.filter((o) => o.yaw === 0 && Math.abs(o.oz - b.z0) < 0.1 && o.ox > b.x0 && o.ox < b.x1).sort((a, c) => a.ox - c.ox)[1];
      return { x: l.ox + l.house[0], z: l.oz, front: l.house[1] - l.house[3] / 2 };
    });
    await pose(T, [bung.x - 9, 1.8, bung.z - 5.5], [bung.x + 8, 1.6, bung.z + bung.front]);
    await T.frames(10);
    await T.shot('kvarter_bungalow');
    // Hotel Flamenco's ground floor from the pool deck: 105, 107 (no star), 109.
    await pose(T, [-16.5, 2.4, -3.5], [-16.5, 1.6, -14.2]);
    await T.frames(10);
    await T.shot('kvarter_flamenco');
    // The street at dusk and by day.
    await setH(T, 20.1667);
    await pose(T, street.eye, street.at);
    await T.frames(10);
    await T.shot('kvarter_skymning');
    await setH(T, 15);
    await T.frames(10);
    await T.shot('kvarter_dag');
    await free(T);
    await T.frames(4);
    check(!(await glow(T)).drawn, 'back at 15:00 the windows are dark again');
  },
};
