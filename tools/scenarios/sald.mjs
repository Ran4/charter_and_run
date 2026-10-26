// Bungalowen är såld (feature 138; DESIGN §10.3, §6.3 (5,0), §8.13 "After the outro"): sald.
//   sald: after the end (index 13) but before the `bodega` unlock the SE VENDE board at Angerud's show
//         bungalow is bare and the seller at his table says his show lines; julafton's unlock lays the
//         band VENDIDO · SÅLD across the board (both faces, just off the board's planes, inside its
//         edges, rising to the right) and gives the seller only the three new lines (all three heard,
//         never a show line), his home unchanged; a reload from the save does the same; a fresh game
//         at index 12 (julafton to come) has no band and the show lines. Shots: the corner from the
//         road before and after, Stig at the seller's table with the sold line in his bubble and the
//         band beyond, the board's back from the plot, the corner in the evening.
import { check } from '../lib.mjs';

const PI = Math.PI;
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || 'ped', text]);
      return o(t, text, secs);
    };
  }
  window.__said = [];
});
const saidBy = (T, who) => T.ev((who) => window.__said.filter(([w]) => w === who).map(([, t]) => t), who);
// The band: shown, its world box, its two faces' world z and normal z, and how its text runs on each
// face as that face's viewer reads it (`rise` > 0: up to the right).
const band = (T) => T.ev(async () => {
  const { THREE } = await import('/src/gfx.js');
  const m = __game.scene.getObjectByName('bungalowSold');
  if (!m) return null;
  m.updateWorldMatrix(true, true);
  const b = new THREE.Box3().setFromObject(m), back = m.getObjectByName('signBack'), v = new THREE.Vector3();
  const r = (x) => +x.toFixed(3);
  const face = (o) => ({ z: r(o.getWorldPosition(v).z), nz: r(new THREE.Vector3(0, 0, 1).transformDirection(o.matrixWorld).z),
    rise: r(new THREE.Vector3(1, 0, 0).transformDirection(o.matrixWorld).y) });
  return { vis: m.visible, min: [r(b.min.x), r(b.min.y), r(b.min.z)], max: [r(b.max.x), r(b.max.y), r(b.max.z)],
    front: face(m), back: back ? face(back) : null };
});
const lines = (T) => T.ev(async () => {
  const g = __game, I = await import('/src/content/island.js');
  return { now: g.chatterOverrides.saljare ?? I.CHATTER.saljare, over: g.chatterOverrides.saljare ?? null,
    sold: I.BUNGALOW_SOLD.saljare, show: I.CHATTER.saljare, home: (g.homeOverrides.saljare ?? g.levelDef.homes(g).saljare) };
});
const stand = (T, x, z, yaw) => T.ev((x, z, yaw) => {
  const g = __game, p = g.player;
  if (g.playerCar) g.exitCar(true);
  p.teleport(x, z, yaw); p.vx = p.vz = 0;
  g.cam.yaw = yaw; g.cam.snapNext = true;
}, x, z, yaw);
const look = (T, pos, at) => T.ev((p, a) => __game.cam.cutTo({ x: p[0], y: p[1], z: p[2] }, { x: a[0], y: a[1], z: a[2] }), pos, at);
const release = (T) => T.ev(() => __game.cam.release());
// Stig a few steps from the seller (who turns to him), until every line of `want` is said or `ms`.
async function listen(T, C, want, ms) {
  await stand(T, C.x - 2.5, C.z + 22 + 3.2, PI * 0.8);
  await resetSaid(T);
  await T.until((want) => want.every((t) => window.__said.some(([w, s]) => w === 'saljare' && s === t)), ms, want).catch(() => {});
  return saidBy(T, 'saljare');
}

export const SCENARIOS = {
  async sald(T) {
    // 0. After the end, before the unlock: no band, the show lines.
    await T.fresh('&mission=13');
    await T.frames(20);
    const C = await T.ev(() => { const l = window.__lm('bungalow'); return { x: l.x, z: l.z - 22 }; });   // block (5,0)'s centre
    const S = { x: C.x + 18, z: C.z + 19 };   // the SE VENDE board's centre (front face +z, to the road)
    T.log('block', JSON.stringify(C), 'board', JSON.stringify(S));
    let b = await band(T), L = await lines(T);
    T.log('before', JSON.stringify(b));
    check(b && !b.vis, `no band before the unlock (${JSON.stringify(b)})`);
    check(L.over === null, 'the seller\'s show lines before the unlock');
    await stand(T, C.x - 2.5, C.z + 25.2, PI * 0.8);   // by the seller, out of the road shots
    await look(T, [S.x - 7, 1.7, S.z + 17], [S.x, 2.4, S.z]);
    await T.frames(20);
    await T.shot('sald_fore');
    await release(T);
    let s = await listen(T, C, [L.show[0], L.show[1]], 45000);
    T.log('show lines', JSON.stringify(s));
    check(s.length >= 2 && s.every((t) => L.show.includes(t)), `the seller says his show lines (${JSON.stringify(s)})`);

    // 1. Julafton's unlock (as the runner calls it): the band across the board, the new lines.
    await T.ev(() => { __game.unlock('bodega'); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    await T.frames(5);
    b = await band(T); L = await lines(T);
    T.log('after', JSON.stringify(b), JSON.stringify(L.home));
    check(b.vis, 'the band shows after the unlock');
    check(b.min[0] >= S.x - 3.5 && b.max[0] <= S.x + 3.5 && b.min[1] >= 1.5 && b.max[1] <= 3.7, `the band inside the board's edges (${JSON.stringify(b)})`);
    check(Math.abs(b.front.z - (S.z + 0.1)) < 0.01 && Math.abs(b.back.z - (S.z - 0.1)) < 0.01 && b.front.nz > 0.99 && b.back.nz < -0.99,
      `the band just off both faces, facing out (${JSON.stringify(b.front)}, ${JSON.stringify(b.back)})`);
    check(b.front.rise > 0.15 && b.front.rise < 0.3 && Math.abs(b.back.rise - b.front.rise) < 0.01, 'the band rises to the right from either side');
    check(JSON.stringify(L.now) === JSON.stringify(L.sold) && L.sold.length === 3, 'the seller\'s lines are the three new ones');
    check(JSON.stringify(L.home) === JSON.stringify(['bungalow', 0, 0]), `the seller's home unchanged (${JSON.stringify(L.home)})`);
    // The corner from the road, as one drives past the airport.
    await look(T, [S.x - 7, 1.7, S.z + 17], [S.x, 2.4, S.z]);
    await T.frames(20);
    await T.shot('sald_vag');
    await look(T, [S.x + 12, 1.7, S.z + 15], [S.x - 6, 2.0, S.z - 2]);
    await T.frames(20);
    await T.shot('sald_vag_ost');
    await release(T);
    s = await listen(T, C, L.sold, 120000);
    T.log('sold lines', JSON.stringify(s));
    check(L.sold.every((t) => s.includes(t)), `all three new lines heard (${JSON.stringify(s)})`);
    check(s.every((t) => L.sold.includes(t)), `never a show line after the unlock (${JSON.stringify(s)})`);
    // Stig at the table with the sold line in the seller's bubble, the band beyond (a cut from the road side).
    await T.ev(() => { window.__said = []; });
    await T.until((t) => window.__said.some(([w, x]) => w === 'saljare' && x === t), 90000, L.sold[0]);
    await look(T, [C.x - 1.5, 2.2, C.z + 30], [C.x + 3.2, 2.0, C.z + 20]);
    await T.shot('sald_saljare');
    // The board's back from the plot (the seller's side of the wall).
    await look(T, [S.x - 4, 2.6, S.z - 9], [S.x, 2.6, S.z]);
    await T.frames(10);
    await T.shot('sald_bak');
    // The corner in the evening.
    await T.ev(() => __game.day.set(19.6));
    await look(T, [S.x - 7, 1.7, S.z + 17], [S.x, 2.4, S.z]);
    await T.frames(30);
    await T.shot('sald_kvall');
    await release(T);

    // 2. The save keeps it: a reload shows the band and the new lines.
    await T.ev(() => __game.save());
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1`, { waitUntil: 'load' });
    await T.until(() => window.__ready === true, 120000);
    await T.frames(10);
    b = await band(T); L = await lines(T);
    T.log('reload', JSON.stringify(b), JSON.stringify(L.over));
    check(b.vis && JSON.stringify(L.over) === JSON.stringify(L.sold), 'a reload: the band and the new lines');
    await T.ev(() => localStorage.removeItem('charter-and-run-v1'));

    // 3. Before the end (index 12, julafton to come): nothing of it.
    await T.fresh('&mission=12');
    await T.frames(20);
    b = await band(T); L = await lines(T);
    check(!b.vis && L.over === null, 'index 12: no band, the show lines');
  },
};
