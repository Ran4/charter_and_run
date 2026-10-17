// Fåglarna som lyfter – och storken i La Charca (free roam, DESIGN §10.31; feature 43): faglar, storken.
//   faglar:  at index 6 (free roam): the four flocks (15 pigeons round the plaza's fountain, 8 gulls
//            at HELADOS · GLASS, 9 on the marina's pier, the two herons of La Charca where nature.js had
//            them and the stork) on their spots, none a solid; standing still among the pigeons lifts
//            none; a sprint in from the south lifts the near ones first (cause `foot`) while the far
//            side pecks on, then their neighbours, "Oj! Förlåt, förlåt!" with his hands up (and down
//            again); they circle and every one lands back on its spot after about half a minute; a
//            pedestrian and a traffic car among them lift none; his car along the beach at speed lifts
//            the kiosk's gulls (`car`) and never comes within 6 m of one still on the ground; at the
//            quay a standing car lifts none, the horn lifts the pier's gulls (`horn`); a mission
//            start puts every bird back on its spot at once, and in the mission a sprint among the
//            pigeons lifts none; the flight level runs none.
//   storken: at index 7 the Storches on the beach at playa: the stork lifts with the herons and flies
//            east to the beach (the herons circle the lagoon), lands 1.8 m beyond Fru Storch facing
//            her; Stig walking up: "Oj, en stork!", Fru Storch's correction, `records.stork` saved,
//            Herr Storch filming it (posed), then home to its spot. A second trip left unvisited flies
//            home without a word; a third: "Oj, en stork!" and the filming but no correction; a
//            mission start then puts it home and the camera down. After the end (Fru Storch at the
//            pool fest) it circles with the herons instead.
import { check } from '../lib.mjs';

const W = (b, lx, lz) => ({ x: -240 + 80 * b[0] + lx, z: -240 + 80 * b[1] + lz });
const states = (T) => T.ev(() => Object.fromEntries(__game.birds.flocks.map((f) => [f.id, f.birds.map((b) => b.st[0]).join('')])));
const hookSay = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push(`${t === g.player ? 'stig' : t?.key ?? '?'}: ${text}`); return o(t, text, secs); };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const allHome = (T, id) => T.ev((id) => __game.birds.flocks.find((f) => f.id === id).birds.every((b) => b.st === 'ground'), id);

export const SCENARIOS = {
  async faglar(T) {
    await T.fresh('&mission=6');
    await hookSay(T);
    // 0. The flocks, on their spots; the herons where the dunes block drew them; no solid.
    const geo = await T.ev(() => {
      const B = __game.birds, g = __game;
      return {
        live: B.live,
        flocks: B.flocks.map((f) => [f.id, f.birds.length, [...new Set(f.birds.map((b) => b.kind))].join('+')]),
        herons: B.flocks.find((f) => f.id === 'charca').birds.filter((b) => b.kind === 'hager').map((b) => [+b.x.toFixed(2), +b.z.toFixed(2), +b.y.toFixed(2)]),
        free: B.all.every((b) => b.perch || g.spotFree(b.home.x, b.home.z)),
        stork: [B.stork.st, +B.stork.b.x.toFixed(1), +B.stork.b.z.toFixed(1)],
      };
    });
    T.log('flocks', JSON.stringify(geo));
    check(geo.live, 'live in free roam');
    check(JSON.stringify(geo.flocks) === JSON.stringify([['plaza', 15, 'duva'], ['kiosk', 8, 'mas'], ['piren', 9, 'mas'], ['charca', 3, 'hager+stork']]), `the four flocks (${JSON.stringify(geo.flocks)})`);
    check(JSON.stringify(geo.herons) === JSON.stringify([[-255, 169.5, 0.15], [-249, 179, 0.15]]), `the herons where nature.js had them (${JSON.stringify(geo.herons)})`);
    check(geo.free, 'no bird is a solid (every ground spot free)');
    for (const [name, b, eye, at, y] of [['faglar_plaza', [2, 3], [9, 14], [0, 2], 3.2], ['faglar_kiosk', [3, 6], [-13, -6], [-19, -16], 3.4],
      ['faglar_piren', [5, 6], [6, 6], [12, 20], 3.6], ['faglar_charca', [0, 5], [-2, 4], [-12, 14], 2.6]]) {
      const e = W(b, ...eye), a = W(b, ...at);
      await T.ev((e, a, y) => { const g = __game; g.debugWarp(e.x + 40, e.z, 0); g.cam.cutTo({ x: e.x, y, z: e.z }, { x: a.x, y: 0.9, z: a.z }); g.cam.snapNext = true; }, e, a, y);
      await T.frames(10);
      await T.shot(name);
    }
    await T.ev(() => __game.cam.release());

    // 1. Standing still 2.5 m from a pigeon lifts none.
    const pz = W([2, 3], 0, 0);
    await T.ev(() => { const g = __game, b = g.birds.flocks[0].birds[4]; g.debugWarp(b.home.x + 2.5, b.home.z, -Math.PI / 2); });
    await T.sleep(2500);
    let ev = await T.ev(() => __game.birds.events.length);
    check(ev === 0, `standing still among them lifts none (${ev} lifts)`);

    // 2. A sprint in from the south: the near ones first, the far side pecks on, then the rest of the
    //    near side; his sorry with his hands up.
    await T.ev((p) => { const g = __game; g.debugWarp(p.x + 5.5, p.z + 22, Math.PI); g.cam.yaw = Math.PI; g.cam.snapNext = true; }, pz);
    await T.frames(10);
    await T.ev((p) => { __game.cam.cutTo({ x: p.x + 9, y: 2.4, z: p.z + 14 }, { x: p.x + 3, y: 2.2, z: p.z + 3 }); }, pz);
    await T.page.keyboard.down('ShiftLeft'); await T.page.keyboard.down('KeyW');
    try {
      await T.until(() => __game.birds.events.length > 0, 6000);
      const first = await T.ev(() => ({ ev: __game.birds.events[0], far: __game.birds.flocks[0].birds.filter((b) => b.home.z < -3).map((b) => b.st), pz: +__game.player.z.toFixed(1) }));
      T.log('first lift', JSON.stringify(first));
      check(first.ev.flock === 'plaza' && first.ev.cause === 'foot', `the first lift his, on foot (${JSON.stringify(first.ev)})`);
      check(first.far.every((s) => s === 'ground'), 'the far side pecks on');
      await T.sleep(300);
      await T.shot('faglar_lyfter');
      await T.sleep(500);
    } finally { await T.page.keyboard.up('KeyW'); await T.page.keyboard.up('ShiftLeft'); }
    await T.shot('faglar_lyfter2');
    const pose = await T.ev(() => __game.player.anim.placate);
    await T.sleep(400);
    await T.shot('faglar_lyfter3');
    let s = await said(T), st = await states(T);
    T.log('said', JSON.stringify(s), 'placate', pose, 'states', JSON.stringify(st));
    check(s.includes('stig: Oj! Förlåt, förlåt!'), 'his sorry among the pigeons');
    check(pose === 1, 'his hands up');
    check((st.plaza.match(/f/g) || []).length >= 6, `the near side up (${st.plaza})`);
    check(st.kiosk === 'gggggggg' && st.piren === 'ggggggggg', 'the other flocks untouched');
    await T.until(() => !__game.player.anim.placate, 3000);

    // 3. Away 14 m and still: they circle, then every one lands on its spot (about half a minute).
    await T.ev((p) => { const g = __game; g.cam.release(); g.debugWarp(p.x, p.z + 14, Math.PI); g.cam.yaw = Math.PI; g.cam.snapNext = true; }, pz);
    const t0 = await T.ev(() => __game.birds.events[0].t);
    await T.sleep(3500);
    await T.ev((p) => { __game.cam.cutTo({ x: p.x + 12, y: 1.6, z: p.z + 14 }, { x: p.x, y: 6, z: p.z }); }, pz);
    await T.frames(6);
    await T.shot('faglar_cirklar');
    await T.until(() => __game.birds.flocks[0].birds.every((b) => b.st === 'ground'), 80000);
    const back = await T.ev(() => ({ t: __game.time, off: Math.max(...__game.birds.flocks[0].birds.map((b) => Math.hypot(b.x - b.home.x, b.z - b.home.z, b.y - b.home.y))) }));
    T.log('all down after', (back.t - t0).toFixed(1), 's, max off', back.off);
    check(back.t - t0 > 22 && back.t - t0 < 70, `back on their spots after about half a minute (${(back.t - t0).toFixed(1)} s)`);
    check(back.off <= 1.01, `each on its own spot, within its steps round it (${back.off.toFixed(2)} m)`);
    await T.shot('faglar_landat');
    await T.ev(() => __game.cam.release());

    // 4. A pedestrian and a traffic car among them: none lifts.
    ev = await T.ev(() => __game.birds.events.length);
    await T.ev((p) => {
      const g = __game, ped = g.peds[0].char, car = g.cars.find((c) => c.traffic);
      g.debugWarp(p.x, p.z + 28, Math.PI);
      ped.teleport(p.x + 5.5, p.z + 5.5, 0);
      if (car) car.place(p.x - 7, p.z + 2.6, 0);
    }, pz);
    await T.sleep(2500);
    let ev2 = await T.ev(() => __game.birds.events.length);
    check(ev2 === ev, `a pedestrian or traffic among them lifts none (${ev2 - ev})`);

    // 5. His car west along the beach past HELADOS · GLASS, through the gulls' spots on the sand: they
    //    lift (car) before it reaches them.
    await T.anyCar();
    const k0 = W([3, 6], 20, -14);
    await T.ev((k) => {
      const g = __game, c = g.playerCar;
      c.place(k.x, k.z, -Math.PI / 2); c.vx = c.vz = 0;
      g.cam.snapNext = true;
      window.__near = Infinity;
      g.hooks.push(() => {
        const c = g.playerCar;
        if (!c || c.speed < 3) return;
        for (const b of g.birds.flocks[1].birds) if (b.st === 'ground') window.__near = Math.min(window.__near, Math.hypot(b.x - c.x, b.z - c.z));
      });
    }, k0);
    await T.frames(10);
    T.log('car placed', await T.ev(() => { const c = __game.playerCar; return [c.x.toFixed(1), c.z.toFixed(1), c.yaw.toFixed(2), c.speed.toFixed(1), c.spec.name || c.type]; }));
    ev = await T.ev(() => __game.birds.events.length);
    await T.page.keyboard.down('KeyW');
    try {
      await T.until(() => __game.birds.events.some((e) => e.flock === 'kiosk'), 12000);
      T.log('kiosk lift', await T.ev(() => { const c = __game.playerCar; return [c.x.toFixed(1), c.z.toFixed(1), c.yaw.toFixed(2), c.speed.toFixed(1)]; }), JSON.stringify(await T.ev(() => __game.birds.events.slice(-3))));
      await T.sleep(500);
      await T.shot('faglar_bil');
      await T.until(() => __game.playerCar.x < -28, 8000).catch(async (e) => { T.log('car at', await T.ev(() => { const c = __game.playerCar; return [c.x.toFixed(1), c.z.toFixed(1), c.yaw.toFixed(2), c.speed.toFixed(1)]; })); throw e; });
    } finally { await T.page.keyboard.up('KeyW'); }
    const car = await T.ev(() => ({ near: +window.__near.toFixed(2), ev: __game.birds.events.filter((e) => e.flock === 'kiosk'), st: __game.birds.flocks[1].birds.map((b) => b.st[0]).join(''), v: +__game.playerCar.speed.toFixed(1) }));
    T.log('car', JSON.stringify(car));
    check(car.ev[0].cause === 'car', 'the gulls lift for his car');
    check(car.near > 6, `no gull still on the ground near the moving car (${car.near} m)`);
    check(car.st.replace(/[^g]/g, '').length <= 2, `the sand gulls up (${car.st})`);

    // 6. At the quay, standing in the car: none; the horn lifts the pier's gulls.
    const q = W([5, 6], 4, -6);
    await T.ev((q) => { const g = __game, c = g.playerCar; c.place(q.x, q.z, 0); c.vx = c.vz = 0; g.cam.snapNext = true; }, q);
    await T.sleep(1500);
    ev = await T.ev(() => __game.birds.events.filter((e) => e.flock === 'piren').length);
    check(ev === 0, 'a standing car lifts none');
    await T.ev((q) => { __game.cam.cutTo({ x: q.x - 6, y: 2.4, z: q.z + 4 }, { x: q.x + 8, y: 3, z: q.z + 22 }); }, q);
    await T.tap('KeyH');
    await T.until(() => __game.birds.events.some((e) => e.flock === 'piren'), 3000);
    await T.sleep(700);
    await T.shot('faglar_tuta');
    await T.sleep(1500);
    const horn = await T.ev(() => ({ ev: __game.birds.events.filter((e) => e.flock === 'piren'), st: __game.birds.flocks[2].birds.map((b) => b.st[0]).join('') }));
    T.log('horn', JSON.stringify(horn));
    check(horn.ev[0].cause === 'horn', 'the horn lifts them');
    check(!horn.st.includes('g'), `the whole pier up (${horn.st})`);
    await T.ev(() => { const g = __game; g.cam.release(); g.exitCar(true); });

    // 7. The pigeons up again, then a mission start: every bird on its spot at once, and in the mission
    //    a sprint among the pigeons lifts none.
    await T.ev((p) => { const g = __game; g.debugWarp(p.x + 5.5, p.z + 18, Math.PI); g.cam.yaw = Math.PI; g.cam.snapNext = true; }, pz);
    await T.frames(5);
    ev = await T.ev(() => __game.birds.events.length);
    await T.hold(['ShiftLeft', 'KeyW'], 1800);
    check(await T.ev((n) => __game.birds.events.length > n, ev), 'the pigeons up again');
    await T.startMission();
    const rest = await T.ev(() => { const B = __game.birds; return { live: B.live, ground: B.all.every((b) => b.st === 'ground' && Math.hypot(b.x - b.home.x, b.z - b.home.z, b.y - b.home.y) < 1e-6), stork: B.stork.st }; });
    T.log('mission', await T.state(), JSON.stringify(rest));
    check(!rest.live && rest.ground && rest.stork === 'home', 'a mission start: every bird on its spot');
    ev = await T.ev(() => __game.birds.events.length);
    await T.ev((p) => { const g = __game; g.debugWarp(p.x + 5.5, p.z + 18, Math.PI); g.cam.yaw = Math.PI; g.cam.snapNext = true; }, pz);
    await T.frames(5);
    await T.hold(['ShiftLeft', 'KeyW'], 1800);
    ev2 = await T.ev(() => __game.birds.events.length);
    st = await states(T);
    check(ev2 === ev && st.plaza === 'ggggggggggggggg', `none lifts in the mission (${st.plaza})`);
    await T.shot('faglar_uppdrag');

    // 8. The flight level: nothing runs.
    await T.fresh('&mission=2');
    await T.sleep(1500);
    const fl = await T.ev(() => ({ live: __game.birds.live, ev: __game.birds.events.length }));
    check(!fl.live && fl.ev === 0, 'the flight level runs none');
  },

  async storken(T) {
    // At index 6 (the friskotek) the Storches are the mission's extras; at 7 they are on the beach.
    await T.fresh('&mission=7');
    await hookSay(T);
    const ok = await T.ev(() => { const B = __game.birds; return { pair: !!B.pair(), st: B.stork.st, rec: __game.records.stork ?? null }; });
    T.log('start', JSON.stringify(ok));
    check(ok.pair && ok.st === 'home' && ok.rec === null, `the Storches on the beach, the stork home (${JSON.stringify(ok)})`);
    const S = () => T.ev(() => { const S = __game.birds.stork, b = S.b; return { st: S.st, bst: b.st, x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), trips: S.trips, scenes: S.scenes }; });
    // Scare it: a sprint at the lagoon from the east shore.
    const scare = async () => {
      await T.ev(() => { const g = __game, b = g.birds.stork.b; g.debugWarp(b.home.x + 14, b.home.z, -Math.PI / 2); g.cam.yaw = -Math.PI / 2; g.cam.snapNext = true; });
      await T.frames(5);
      await T.page.keyboard.down('ShiftLeft'); await T.page.keyboard.down('KeyW');
      try { await T.until(() => __game.birds.stork.st !== 'home', 5000); } finally { await T.page.keyboard.up('KeyW'); await T.page.keyboard.up('ShiftLeft'); }
    };
    const toBeach = async () => {
      // Wait for it out of sight of the beach, 30 m west of where it lands.
      await T.ev(() => { const g = __game, to = g.birds.stork.to; g.debugWarp(to.x - 30, to.z - 6, Math.PI / 2); g.cam.yaw = Math.PI / 2; g.cam.snapNext = true; });
      await T.until(() => __game.birds.stork.st === 'beach', 60000);
    };

    // 1. The first trip: the herons circle, the stork flies east along the coast.
    await scare();
    await T.sleep(1500);
    let r = await S();
    const herons = await T.ev(() => __game.birds.flocks[3].birds.filter((b) => b.kind === 'hager').map((b) => b.st));
    T.log('up', JSON.stringify(r), 'herons', herons, JSON.stringify(await T.ev(() => __game.birds.events)));
    check(r.st === 'out' && r.trips === 1, 'the stork on its way to the beach');
    check(herons.every((s) => s === 'fly'), 'the herons circle the lagoon');
    await T.until(() => { const S = __game.birds.stork; return S.s > S.path.len * 0.45; }, 30000);
    await T.ev(() => { const g = __game, b = g.birds.stork.b; g.cam.cutTo({ x: b.x + 6, y: b.y - 3, z: b.z + 16 }, { x: b.x + 4, y: b.y, z: b.z }); });
    await T.frames(4);
    await T.shot('storken_flyger');
    await T.ev(() => __game.cam.release());
    await toBeach();
    const land = await T.ev(() => {
      const g = __game, b = g.birds.stork.b, h = g.npc('herrStorch'), f = g.npc('fruStorch');
      return { fru: +Math.hypot(b.x - f.homeX, b.z - f.homeZ).toFixed(2), herr: +Math.hypot(b.x - h.homeX, b.z - h.homeZ).toFixed(2), face: +Math.abs(Math.atan2(Math.sin(Math.atan2(f.x - b.x, f.z - b.z) - b.yaw), Math.cos(Math.atan2(f.x - b.x, f.z - b.z) - b.yaw))).toFixed(2), y: +b.y.toFixed(2), t: g.time };
    });
    T.log('landed', JSON.stringify(land));
    check(Math.abs(land.fru - 1.8) < 0.1 && land.herr > land.fru, `beside Fru Storch, beyond her from her husband (${JSON.stringify(land)})`);
    check(land.face < 0.3, 'facing her');
    await T.ev(() => { const g = __game, b = g.birds.stork.b, f = g.npc('fruStorch'); g.cam.cutTo({ x: b.x - 3, y: 1.9, z: b.z - 7 }, { x: (b.x + f.x) / 2, y: 1.0, z: (b.z + f.z) / 2 }); });
    await T.frames(6);
    await T.shot('storken_landat');

    // 2. Stig walks up: the scene.
    await T.ev(() => { const g = __game, b = g.birds.stork.b; g.debugWarp(b.x - 9, b.z - 3, Math.PI / 2); });
    await T.until(() => __game.birds.stork.st === 'scene', 5000);
    await T.until(() => window.__said.some((l) => l.startsWith('fruStorch: Vi heter')), 6000);
    await T.frames(6);
    await T.shot('storken_rattelse');
    await T.until(() => __game.npc('herrStorch').anim.film, 6000);
    const film = await T.ev(() => ({ posed: __game.npcPosed('herrStorch'), rec: __game.records.stork, saved: JSON.parse(localStorage.getItem('charter-and-run-v1') || '{}').records?.stork ?? null }));
    await T.ev(() => { const g = __game, b = g.birds.stork.b, h = g.npc('herrStorch'); g.cam.cutTo({ x: h.x + 2.5, y: 1.8, z: h.z - 5 }, { x: (b.x + h.x) / 2, y: 1.2, z: (b.z + h.z) / 2 }); });
    await T.frames(6);
    await T.shot('storken_filmar');
    let s = await said(T);
    T.log('said', JSON.stringify(s), JSON.stringify(film));
    check(s[0] === 'stig: Oj, en stork!' && s[1] === 'fruStorch: Vi heter faktiskt Storch, inte Stork.', 'Stig, then her correction');
    check(film.posed && film.rec === true && film.saved === true, 'Herr Storch filming it, the correction saved');
    await T.until(() => __game.birds.stork.st === 'back', 9000);
    check(!(await T.ev(() => __game.npc('herrStorch').anim.film)), 'the camera down when it goes');
    await T.ev(() => __game.cam.release());
    await T.until(() => __game.birds.stork.st === 'home', 60000);
    r = await T.ev(() => { const b = __game.birds.stork.b; return { st: b.st, off: Math.hypot(b.x - b.home.x, b.z - b.home.z, b.y - b.home.y) }; });
    check(r.st === 'ground' && r.off < 0.01, `home on its spot (${JSON.stringify(r)})`);

    // 3. A trip nobody follows: home after `waitSecs` without a word (4 s here).
    await T.ev(() => { __game.birds.stork.nextT = 0; __game.birds.cfg.stork._w = __game.birds.cfg.stork.waitSecs; __game.birds.cfg.stork.waitSecs = 4; });
    await hookSay(T);
    await scare();
    await toBeach();
    await T.until(() => __game.birds.stork.st === 'back', 8000);
    s = await said(T);
    check(!s.some((l) => /stork/i.test(l.split(": ").slice(1).join(": "))), `unvisited, no scene (${JSON.stringify(s)})`);
    await T.ev(() => { __game.birds.cfg.stork.waitSecs = __game.birds.cfg.stork._w; delete __game.birds.cfg.stork._w; });
    await T.until(() => __game.birds.stork.st === 'home', 60000);

    // 4. Again, followed: no correction this time, still the filming; a mission start puts it home.
    await T.ev(() => { __game.birds.stork.nextT = 0; });
    await hookSay(T);
    await scare();
    await toBeach();
    await T.ev(() => { const g = __game, b = g.birds.stork.b; g.debugWarp(b.x - 9, b.z - 3, Math.PI / 2); });
    await T.until(() => __game.npc('herrStorch').anim.film, 9000);
    s = await said(T);
    T.log('again', JSON.stringify(s));
    check(s.includes('stig: Oj, en stork!') && !s.some((l) => l.startsWith('fruStorch: Vi heter')), 'no correction the second time');
    await T.startMission();
    r = await T.ev(() => { const g = __game, B = g.birds, b = B.stork.b; return { st: B.stork.st, off: Math.hypot(b.x - b.home.x, b.z - b.home.z), film: g.npc('herrStorch').anim.film, posed: g.npcPosed('herrStorch') }; });
    T.log('mission', JSON.stringify(r));
    check(r.st === 'home' && r.off < 1e-6 && !r.film && !r.posed, 'a mission start: the stork home, the camera down');

    // 5. After the end Fru Storch is at the pool fest: the stork circles with the herons instead.
    await T.fresh('&mission=13');
    await T.ev(() => { __game.unlock('bodega'); });
    await T.frames(10);
    await T.ev(() => { const g = __game, b = g.birds.stork.b; g.debugWarp(b.home.x + 14, b.home.z, -Math.PI / 2); g.cam.yaw = -Math.PI / 2; g.cam.snapNext = true; });
    await T.frames(5);
    check(!(await T.ev(() => __game.birds.pair())), 'no pair on the beach after the end');
    await T.hold(['ShiftLeft', 'KeyW'], 1800);
    await T.sleep(500);
    r = await S();
    T.log('after the end', JSON.stringify(r));
    check(r.st === 'home' && r.bst === 'fly' && r.trips === 0, 'it circles the lagoon with the herons');
  },
};
