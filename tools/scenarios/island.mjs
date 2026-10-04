// Island scenarios (WP-B, DESIGN §16.4): smash, foot (+ the frame ramp), plus the WP-B look checks propsheet (every
// §6.8 prop in a row), riocard (the Rio end card from rioCam) and islandtour (streets, residential
// blocks, outskirts, sea).
import { check } from '../lib.mjs';

const ISLAND = '&mission=6';
const PROPS = ['papelera', 'correos', 'vykort', 'dusch', 'parasoll', 'solstol', 'palmkruka', 'mur', 'tomatlada', 'tunna',
  'bank', 'kon', 'bagagevagn', 'automat', 'gaspump', 'butano', 'julgran', 'tallrikar', 'resvaska', 'glasskylt'];

// Put the camera at `pos` looking at `look` (world), with the player out of the way.
async function camAt(T, pos, look, hidePlayer = true) {
  await T.ev((pos, look, hide) => {
    const g = __game;
    if (hide) {   // park the player 6 m behind the camera, out of the shot
      const dx = look.x - pos.x, dz = look.z - pos.z, l = Math.hypot(dx, dz) || 1;
      g.player.teleport(pos.x - (dx / l) * 6, pos.z - (dz / l) * 6);
    }
    g.cam.cutTo(pos, look);
  }, pos, look, hidePlayer);
  await T.frames(12);
}

export const SCENARIOS = {
  // Ram the nearest Correos box with the hyrbil, then a pedestrian: SKANDAL rose, coins burst.
  async smash(T) {
    await T.fresh(ISLAND);
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
    const c0 = await T.ev(() => __game.coins);
    await T.hold(['KeyW'], 1600);
    await T.frames(10);
    await T.shot('smash_1');
    const st = await T.ev(() => ({ alive: window.__target.alive, v: __game.shame.v }));
    T.log('correos alive?', st.alive, 'skandal', st.v.toFixed(1));
    check(!st.alive && st.v > 0, 'the Correos box broke and SKANDAL rose');
    // Then a pedestrian: aim the car at the nearest ped on foot and drive into it.
    const v0 = st.v;
    const ped = await T.ev(() => {
      const g = __game, car = g.playerCar;
      let best = null, bd = 1e9, obj = null;
      for (const p of g.peds) { const c = p.char; if (c.state !== 'normal') continue; const d = Math.hypot(c.x - car.x, c.z - car.z); if (d < bd) { bd = d; best = c; obj = p; } }
      if (!best) return null;
      obj.panicT = 5;   // peds dive away from a car they see coming; this one is frozen in shock
      // A clean run at it on the z = 40 road heading east.
      car.place(-70, 42.75, Math.PI / 2);
      car.vx = 17; car.vz = 0;
      best.teleport(-63, 42.75);
      window.__ped = best;
      return { d: bd.toFixed(1) };
    });
    if (ped) {
      await T.hold(['KeyW'], 700);
      await T.frames(10);
      const after = await T.ev(() => ({ v: __game.shame.v, state: window.__ped.state, coins: __game.coins }));
      T.log('ped hit', JSON.stringify(after), 'coins before', c0);
      await T.shot('smash_2');
      check(after.v > v0 && after.state !== 'normal', 'hitting a pedestrian knocks them over and adds SKANDAL');
    }
  },

  // On foot: trampoline bounce, kick a shark fin, stand on a parked car roof, double jump.
  async foot(T) {
    await T.fresh(ISLAND);
    // Trampoline: drop onto the nearest 'bounce' block and watch the rebound.
    const tr = await T.ev(async () => {
      const m = await import('/src/world/town.js');
      const g = __game, p = g.player;
      const b = m.bouncers.slice().sort((a, c) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z))[0];
      if (!b) return null;
      p.teleport(b.x, b.z);
      p.y = b.top + 2;
      p.vy = 0; p.onGround = false;
      g.cam.snapNext = true;
      window.__bounce = b;
      return { x: b.x.toFixed(1), z: b.z.toFixed(1), n: m.bouncers.length };
    });
    check(tr, 'there is at least one trampoline');
    T.log('trampoline', JSON.stringify(tr));
    let apex = 0;
    for (let k = 0; k < 50; k++) { await T.frames(1); apex = Math.max(apex, await T.ev(() => __game.player.y)); }
    T.log('trampoline apex', apex.toFixed(2));
    await T.shot('foot_trampoline');
    check(apex > 4.5, 'the trampoline bounced the player up');
    // Kick a fin: stand beside the first fena collectible, facing it, and press K.
    const fin = await T.ev(() => {
      const g = __game, list = g.collectibles.fenor || [], c = list.find((q) => q.alive);
      if (!c) return null;
      const mp = c.mesh.position;
      g.player.teleport(mp.x - 0.9, mp.z, Math.PI / 2);
      g.cam.snapNext = true;
      return { id: c.id, before: g.collected.fenor.size };
    });
    if (fin) {
      await T.ev(() => { const g = __game, c = g.collectibles.fenor.find((q) => q.alive), mp = c.mesh.position; g.player.teleport(mp.x - 0.9, mp.z, Math.PI / 2); });
      await T.tap('KeyK');
      await T.frames(20);
      const after = await T.ev(() => __game.collected.fenor.size);
      T.log('fin kicked', fin.id, fin.before, '->', after);
      check(after > fin.before, 'kicking a shark fin collects it');
    }
    // Walk up the ramp of a half-built concrete frame onto its first deck.
    const fr = await T.ev(async () => {
      const m = await import('/src/world/town.js');
      const g = __game, f = m.frameRamps[0];
      if (!f) return null;
      g.player.teleport(f.x, f.z, f.yaw);
      g.cam.yaw = f.yaw;
      g.cam.snapNext = true;
      return { n: m.frameRamps.length, top: f.top };
    });
    check(fr, 'there is at least one half-built frame');
    await T.frames(3);
    await T.hold(['KeyW'], 2600);
    await T.frames(10);
    const fy = await T.ev(() => __game.player.y);
    T.log('frame deck', JSON.stringify(fr), 'player y', fy.toFixed(2));
    await T.shot('foot_frame');
    check(Math.abs(fy - fr.top) < 0.3, 'the ramp leads up onto the first deck');
    // Car roof.
    const r = await T.ev(() => { const g = __game, c = g.named.hyrbil; g.player.teleport(c.x, c.z); g.player.y = c.y + c.height + 1.5; g.player.onGround = false; return c.y + c.height; });
    await T.frames(30);
    const py = await T.ev(() => __game.player.y);
    T.log('roof top', r.toFixed(2), 'player y', py.toFixed(2));
    await T.shot('foot_roof');
    check(Math.abs(py - r) < 0.3, 'the player stands on the car roof');
    // Double jump on the plaza.
    await T.ev(() => { const g = __game, b = window.__lm('plaza'); g.player.teleport(b.x + 8, b.z + 8); });
    await T.frames(5);
    let top = 0;
    await T.tap('Space');
    for (let k = 0; k < 12; k++) { await T.frames(1); top = Math.max(top, await T.ev(() => __game.player.y)); }
    await T.tap('Space');
    for (let k = 0; k < 40; k++) { await T.frames(1); top = Math.max(top, await T.ev(() => __game.player.y)); }
    T.log('double jump apex', top.toFixed(2));
  },

  // Every §6.8 prop type in a row on the beach promenade, built straight from TYPES.
  async propsheet(T) {
    await T.fresh(ISLAND);
    await T.ev(async (names) => {
      const { TYPES } = await import('/src/world/props.js');
      const { GeoBuilder, toonMesh, scene } = await import('/src/gfx.js');
      window.__sheet = [];
      names.forEach((n, k) => {
        const g = new GeoBuilder();
        TYPES[n].build(g);
        const m = toonMesh(g.build(), { outline: 0.03 });
        const x = -19 + (k % 10) * 4.2, z = 292 + Math.floor(k / 10) * 4;
        m.position.set(x, 0.15, z);
        m.rotation.y = Math.PI + 0.35;
        scene.add(m);
        window.__sheet.push(m);
      });
    }, PROPS);
    await camAt(T, { x: 0, y: 7, z: 279 }, { x: 0, y: 0.8, z: 294 });
    await T.shot('propsheet');
    await camAt(T, { x: -4, y: 3.2, z: 287.5 }, { x: -12, y: 0.9, z: 294 });
    await T.shot('propsheet_l');
    await camAt(T, { x: 4, y: 3.2, z: 287.5 }, { x: 12, y: 0.9, z: 294 });
    await T.shot('propsheet_r');
  },

  // The Rio end card from rioCam (sunset palette), and from above.
  async riocard(T) {
    await T.fresh(ISLAND);
    const ok = await T.ev(() => {
      const g = __game, b = window.__lm('rioBoat'), c = window.__lm('rioCam');
      g.setSky('sunset');
      g.player.teleport(b.x, b.z + 2, 0);
      for (const [k, dx, dz] of [['majsan', -0.8, 2.2], ['ole', 1.0, 3.2], ['siv', -1.0, 4.0]]) g.placeNpc(k, 'rioBoat', dx, dz);
      g.cam.cutTo({ x: c.x, y: 3.2, z: c.z }, { x: b.x, y: 1.8, z: b.z + 1 });
      return { b, c, py: g.player.y };
    });
    T.log('rio', JSON.stringify(ok));
    await T.frames(20);
    await T.shot('rio_cam');
    await T.ev(() => { const b = window.__lm('rioBoat'); __game.cam.cutTo({ x: b.x + 60, y: 45, z: b.z + 70 }, { x: b.x - 120, y: 10, z: b.z - 90 }); });
    await T.frames(12);
    await T.shot('rio_wide');
    check(ok.py > 0.5 && ok.py < 0.7, 'the player stands on the yacht deck');
  },

  // The wired end card (§11.7, game.playEndCard): the Rio scene, then back at the Flamenco pool.
  async endcard(T) {
    await T.fresh(ISLAND);
    await T.ev(() => { window.__ec = 'run'; __game.playEndCard().then(() => { window.__ec = 'done'; }); });
    await T.frames(40);
    const rio = await T.ev(() => {
      const g = __game, b = window.__lm('rioBoat');
      return { dx: +(g.player.x - b.x).toFixed(2), py: +g.player.y.toFixed(2), stig: g.player.outfit, ole: g.npcs.ole.outfit, oleDx: +(g.npcs.ole.x - b.x).toFixed(2),
        sky: g.sky, letterbox: document.getElementById('letterbox').classList.contains('on'), banner: document.querySelector('#banner .banner-main').textContent, inDialog: g.inDialog };
    });
    T.log('rio', JSON.stringify(rio));
    await T.shot('endcard_rio');
    check(Math.abs(rio.dx) < 2 && rio.py > 0.5 && rio.py < 0.7, 'Stig stands on the Rio yacht deck');
    check(rio.stig === 'rio' && rio.ole === 'rio' && Math.abs(rio.oleDx) < 2, 'Stig and Ole in their rio outfits on board');
    check(rio.sky === 'sunset' && rio.letterbox && rio.inDialog && rio.banner === 'RIO…?', 'sunset, letterbox, frozen input, the RIO…? banner');
    await T.until(() => window.__ec === 'done', 30000);
    await T.frames(20);
    const back = await T.ev(() => {
      const g = __game, l = window.__lm('flamencoPool');
      return { d: +Math.hypot(g.player.x - l.x, g.player.z - l.z).toFixed(2), stig: g.player.outfit, ole: g.npcs.ole.outfit, sky: g.sky, inDialog: g.inDialog,
        letterbox: document.getElementById('letterbox').classList.contains('on'), banner: document.querySelector('#banner .banner-main').textContent };
    });
    T.log('back', JSON.stringify(back));
    await T.shot('endcard_back');
    check(back.d < 2.5 && back.stig !== 'rio' && back.ole !== 'rio' && back.sky !== 'sunset', 'back at the Flamenco pool in island clothes');
    check(!back.inDialog && !back.letterbox && back.banner === 'NUEVA ESTOCOLMO KLARAT!', 'free roam with the completion banner');
  },

  // Geometry budget: triangles of the static town meshes (by kind) and of the whole scene.
  async islandstats(T) {
    await T.fresh(ISLAND);
    const r = await T.ev(async () => {
      const { scene } = await import('/src/gfx.js');
      const out = {};
      const add = (k, n) => { out[k] = (out[k] || 0) + n; };
      scene.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
        const x = o.geometry.boundingSphere ? o.geometry.boundingSphere.center.x + o.position.x : o.position.x;
        const top = o.parent === scene || (o.name === 'outline' && o.parent?.parent === scene);
        const where = x < -2000 ? 'rio' : x > 2000 ? 'cabin' : 'town';
        const k = o.isInstancedMesh ? 'instanced' + (o.parent === scene ? '' : '_other') : !top ? 'actors' : o.name === 'signs' ? 'signs' : where + (o.name === 'outline' ? '_outline' : '');
        add(k, n);
        if (o.isInstancedMesh && o.material?.type !== 'MeshBasicMaterial') (out._inst ||= []).push([Math.round(n / 1000), o.count, (g.index ? g.index.count : g.attributes.position.count) / 3]);
      });
      out._inst = (out._inst || []).sort((a, b) => b[0] - a[0]).slice(0, 8).map((v) => v.join('/')).join(' ');
      for (const k in out) if (k[0] !== '_') out[k] = Math.round(out[k] / 1000) + 'k';
      return out;
    });
    T.log('triangles', JSON.stringify(r));
  },

  // Look round the island: residential blocks, streets, outskirts and the sea.
  async islandtour(T) {
    await T.fresh(ISLAND);
    const shots = [
      ['tour_lagenhet', { x: 100, y: 7, z: 37 }, { x: 70, y: 7, z: 64 }],           // (4,4) lagenhet
      ['tour_bungalow', { x: 182, y: 7, z: 128 }, { x: 160, y: 1, z: 80 }],         // (5,4) bungalowR
      ['tour_street', { x: -40, y: 3.5, z: 70 }, { x: -40, y: 2.5, z: 0 }],         // banner over x = -40
      ['tour_frame', { x: -150, y: 12, z: 210 }, { x: -80, y: 3, z: 160 }],         // (2,5) lagenhet
      ['tour_north', { x: 0, y: 30, z: -240 }, { x: 0, y: 30, z: -500 }],           // Monte Rojo
      ['tour_west', { x: -280, y: 14, z: -10 }, { x: -480, y: 0, z: -40 }],          // dunes, welcome sign
      ['tour_south', { x: 0, y: 6, z: 262 }, { x: 0, y: 2, z: 420 }],                // beach, sea, boats
      ['tour_ne', { x: 200, y: 25, z: -250 }, { x: 240, y: 0, z: -335 }],            // the DC-8 gap
      ['tour_high', { x: -60, y: 120, z: 380 }, { x: 0, y: 0, z: 0 }],               // over the town
      ['tour_welcome', { x: -282, y: 3.5, z: -36 }, { x: -300, y: 3, z: -54 }],        // welcome sign
      ['tour_walk', { x: 156, y: 2.0, z: 42.5 }, { x: 148, y: 1.5, z: 110 }],            // bungalow street, eye height
      ['tour_stop', { x: -140, y: 2.6, z: -118 }, { x: -150, y: 1.5, z: -111.5 }],     // a guagua stop, block (1,2)
    ];
    for (const [name, pos, look] of shots) {
      await camAt(T, pos, look);
      await T.shot(name);
      if (name === 'tour_high' || name === 'tour_walk') {
        const info = await T.ev(async () => { const { renderer } = await import('/src/gfx.js'); const r = renderer.info.render; return { calls: r.calls, tris: r.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures }; });
        T.log('render', name, JSON.stringify(info));
      }
    }
  },
};
