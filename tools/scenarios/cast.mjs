// Cast and vehicle scenarios (WP-E, DESIGN §16.4): castsheet, cars.
//   castsheet: every CAST key in its base look, every outfit, every anim flag (on Stig and on the
//              characters who use it in the missions), held items, random peds (island + flight),
//              seated busts, and a sheet of the dialogue portraits.
//   cars:      every CAR_TYPES type from two sides (with driver busts), close-ups of the special
//              liveries, every COLLECT_KINDS mesh (all 7 pryl variants) and every Rabbit mesh.
//   heads:     a light check of the faces: one head per hair style and hat, plus the portraits.
// Everything is posed on a "photo studio" (floor + backdrop) built 60 m above the plaza, with a
// fixed cutaway camera; the HUD is hidden for the shots. Models are animated by a frame hook.
import { check } from '../lib.mjs';

const ISLAND = '&mission=6';

// Installed in the page: window.__cs (the studio).
async function installStudio() {
  if (window.__cs) return true;
  const g = __game;
  const G = await import('/src/gfx.js');
  const M = await import('/src/actors/models.js');
  const C = await import('/src/actors/car.js');
  const P = await import('/src/actors/pickups.js');
  const { THREE } = G;
  const f = window.__lm('plaza');
  g.player.teleport(f.x, f.z, 0);
  const O = { x: f.x, y: g.groundAt(f.x, f.z) + 60, z: f.z };
  const fg = new G.GeoBuilder();
  fg.box(0xe8dcc0, 0, -0.1, 0, 120, 0.2, 60);
  fg.box(0xf4ecd8, 0, 10, -9, 120, 20, 0.4);
  fg.box(0xd8c8a4, 0, 0.6, -8.7, 120, 1.2, 0.2);
  const studio = G.toonMesh(fg.build(), { outline: 0 });
  studio.position.set(O.x, O.y, O.z);
  g.scene.add(studio);
  const root = new THREE.Group();
  g.scene.add(root);
  // HUD off for clean shots; name labels on top.
  const css = document.createElement('style');
  css.textContent = 'body > *:not(#app):not(.cs-keep) { display: none !important; }';
  document.head.appendChild(css);
  const labels = document.createElement('div');
  labels.className = 'cs-keep';
  labels.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;font:bold 13px Nunito, sans-serif;color:#1d1426';
  document.body.appendChild(labels);
  const items = [];
  const v = new THREE.Vector3();
  const cs = {
    O, M, C, P, G, THREE, items, root,
    clear() { for (const it of items) { root.remove(it.obj); it.dispose?.(); } items.length = 0; labels.innerHTML = ''; },
    char(def, x, z, yaw = 0, flags = {}, label = '') {
      const m = M.buildCharacter(def);
      const st = { speed: 0, air: false, vy: 0, kick: 0, talk: false, seated: false, flung: false, down: false, t: Math.random() * 6, spin: 0, look: 0, wave: false, cheer: false, sprint: false, ...flags };
      let y = O.y;
      if (st.seated) {
        const seat = new G.GeoBuilder();
        seat.box(0xd2601f, 0, 0.25, -0.05, 0.62, 0.5, 0.6);
        seat.box(0xd2601f, 0, 0.75, -0.38, 0.62, 1.0, 0.16);
        seat.box(0xf2efe6, 0, 1.12, -0.36, 0.5, 0.26, 0.18);
        const sm = G.toonMesh(seat.build(), { outline: 0.02 });
        sm.position.set(O.x + x, O.y, O.z + z);
        sm.rotation.y = yaw;
        root.add(sm);
        items.push({ obj: sm });
        y = O.y + 0.6 - m.legLen;
      }
      m.root.position.set(O.x + x, y, O.z + z);
      m.root.rotation.y = yaw;
      root.add(m.root);
      items.push({ obj: m.root, m, st, label, x, z });
      return m;
    },
    obj(o, x, y, z, yaw = 0, label = '') { o.position.set(O.x + x, O.y + y, O.z + z); o.rotation.y = yaw; root.add(o); items.push({ obj: o, label, x, z, y }); return o; },
    cam(x, y, z, lx, ly, lz) { g.cam.cutTo({ x: O.x + x, y: O.y + y, z: O.z + z }, { x: O.x + lx, y: O.y + ly, z: O.z + lz }); },
    labels(dy = -0.25) {
      labels.innerHTML = '';
      const cam = G.camera;
      cam.updateMatrixWorld();
      for (const it of items) {
        if (!it.label) continue;
        v.set(O.x + it.x, O.y + (it.y ?? 0) + dy, O.z + it.z).project(cam);
        const d = document.createElement('div');
        d.textContent = it.label;
        d.style.cssText = `position:absolute;left:${((v.x + 1) / 2) * innerWidth}px;top:${((1 - v.y) / 2) * innerHeight}px;transform:translate(-50%,0);background:#fff8e6cc;padding:0 4px;border-radius:4px;white-space:nowrap`;
        labels.appendChild(d);
      }
    },
  };
  g.onFrame((dt) => {
    for (const it of items) if (it.m) { it.st.t += dt; M.animateCharacter(it.m, it.st, dt); }
    g.player.wishX = g.player.wishZ = 0;
  });
  window.__cs = cs;
  return true;
}

// A row of characters, then a shot. list: [{ def | key, outfit?, flags?, label?, yaw? }].
async function row(T, name, list, { gap = 1.7, dist = 0, h = 1.6, look = 1.05, yaw = 0 } = {}) {
  // Frame the whole row (the cutaway camera settles at fov 50); a short row is framed like one of
  // five, so a lone character is still seen head to toe.
  const span = Math.max(list.length - 1, dist ? 0 : 4);
  dist = Math.max(dist, (span * gap / 2 + 1.0) / (Math.tan(25 * Math.PI / 180) * 16 / 9));
  await T.ev((list, gap, dist, h, look, yaw) => {
    const cs = window.__cs;
    cs.clear();
    const n = list.length;
    list.forEach((e, i) => {
      const def = e.def || cs.M.outfitDef(e.key, e.outfit || null);
      cs.char(def, (i - (n - 1) / 2) * gap, 0, e.yaw ?? yaw, e.flags || {}, e.label ?? (e.key ? e.key + (e.outfit ? ' · ' + e.outfit : '') : ''));
    });
    cs.cam(0, h, dist, 0, look, 0);
  }, list, gap, dist, h, look, yaw);
  await T.frames(36);
  await T.ev(() => window.__cs.labels());
  await T.shot(name);
}

// The dialogue portraits (hud.portraits) on one sheet.
async function portraits(T) {
  await T.ev(async () => {
    const { hud } = await import('/src/game/hud.js');
    window.__cs.clear();
    const sheet = document.createElement('div');
    sheet.id = 'portraitSheet';
    sheet.className = 'cs-keep';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:60;background:#2a86e0;display:flex;flex-wrap:wrap;align-content:flex-start;gap:4px;padding:6px;visibility:visible';
    for (const k of window.__cs.M.CAST) {
      const c = hud.portraits[k];
      if (!c) continue;
      const w = document.createElement('div');
      w.style.cssText = 'width:140px;text-align:center;font:bold 11px Nunito, sans-serif;color:#fff8e6';
      const img = new Image(); img.src = c; img.style.cssText = 'width:110px;height:110px;border-radius:50%;background:#fff8e6';
      w.appendChild(img); w.appendChild(document.createTextNode(k));
      sheet.appendChild(w);
    }
    document.body.appendChild(sheet);
  });
  await T.frames(4);
  await T.shot('cast_portraits');
  await T.ev(() => document.getElementById('portraitSheet')?.remove());
}

const FLAGS = ['wings', 'cupUp', 'cupHeld', 'push', 'hold', 'flail', 'oath', 'dance', 'laugh', 'slump', 'shoeOff', 'mirror', 'film', 'giraffe', 'butterKnife', 'carryOver'];

export const SCENARIOS = {
  async castsheet(T) {
    await T.fresh(ISLAND);
    await T.ev(installStudio);
    const keys = await T.ev(() => window.__cs.M.CAST);
    const all = await T.ev(() => Object.keys(window.__cs.M.CHARS));
    // 35 since feature 84 (§10.44): the pool bar's bartender.
    check(all.length === 35 && keys.length === 35, `35 CHARS keys with portraits (got ${all.length}/${keys.length})`);
    // Every def builds and animates with every flag on, without throwing or NaN.
    const bad = await T.ev((flags) => {
      const { M } = window.__cs, out = [];
      for (const k of Object.keys(M.CHARS)) for (const o of [null, ...Object.keys(M.CHARS[k].outfits || {})]) {
        const d = M.outfitDef(k, o);
        if (d.print && !Array.isArray(d.print)) out.push(`${k}.${o}: print not an array`);
        const m = M.buildCharacter(d);
        for (const f of [...flags, 'seated', 'planeSeat']) {
          const st = { speed: 2, t: 1, kick: 0, [f]: true, seated: f === 'planeSeat' || f === 'seated' };
          M.animateCharacter(m, st, 1 / 60);
          m.root.updateMatrixWorld(true);
          let nan = false;
          m.root.traverse((o) => { if (!Number.isFinite(o.matrixWorld.elements[13])) nan = true; });
          if (nan) out.push(`${k}.${o}: NaN with ${f}`);
        }
        if (!(m.height > 1.5 && m.height < 3.2)) out.push(`${k}.${o}: height ${m.height}`);
      }
      for (let i = 0; i < 300; i++) { const p = M.randomPed(Math.random); if (p.kind !== 'adult' || p.scale < 0.94 || p.scale > 1.08) out.push('ped ' + JSON.stringify(p)); }
      // Triangle budget per model (body + outlines), logged.
      const tris = (m) => { let n = 0; m.root.traverse((o) => { if (o.geometry) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; };
      const rr = (() => { let a = 9; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
      let pedT = 0; for (let i = 0; i < 20; i++) pedT += tris(M.buildCharacter(M.randomPed(rr)));
      window.__castTris = { stig: tris(M.buildCharacter(M.outfitDef('stig', 'hawaii'))), ole: tris(M.buildCharacter(M.outfitDef('ole', 'sol'))), gabbe: tris(M.buildCharacter(M.CHARS.gabbe)), pedAvg: Math.round(pedT / 20), bust: M.buildBustGeo(M.randomPed(rr)).index.count / 3 };
      return out;
    }, FLAGS);
    T.log('def checks', bad.length ? bad.slice(0, 8).join(' | ') : 'ok');
    T.log('triangles', JSON.stringify(await T.ev(() => window.__castTris)));
    check(!bad.length, 'every def/outfit/flag builds and animates');
    // Base looks, 8 per shot.
    for (let i = 0; i < keys.length; i += 8) await row(T, `cast_base_${i / 8}`, keys.slice(i, i + 8).map((key) => ({ key })));
    // Outfits.
    const outfits = await T.ev(() => { const { M } = window.__cs; const o = []; for (const k of Object.keys(M.CHARS)) for (const n of Object.keys(M.CHARS[k].outfits || {})) o.push({ key: k, outfit: n }); return o; });
    for (let i = 0; i < outfits.length; i += 8) await row(T, `cast_outfits_${i / 8}`, outfits.slice(i, i + 8));
    // Anim flags on Stig (hawaii), then on the characters who use them in the missions.
    const flagRow = FLAGS.map((f) => ({ key: 'stig', outfit: 'hawaii', flags: { [f]: true }, label: f }));
    flagRow.push({ key: 'stig', outfit: 'kostym', flags: { seated: true, planeSeat: true }, label: 'planeSeat' });
    flagRow.push({ key: 'stig', outfit: 'kostym', flags: { speed: 3.2 }, label: 'walk' });
    flagRow.push({ key: 'stig', outfit: 'kostym', flags: { speed: 7, sprint: true }, label: 'sprint' });
    flagRow.push({ key: 'stig', outfit: 'kostym', flags: { talk: true }, label: 'talk' });
    flagRow.push({ key: 'stig', outfit: 'kostym', flags: { wave: true }, label: 'wave' });
    flagRow.push({ key: 'stig', outfit: 'kostym', flags: { cheer: true }, label: 'cheer' });
    flagRow.push({ key: 'stig', outfit: 'kostym', flags: { kick: 0.5 }, label: 'kick' });
    // A little wider than the row: held props (the giraffe) reach out past the end figures.
    for (let i = 0; i < flagRow.length; i += 6) await row(T, `cast_flags_${i / 6}`, flagRow.slice(i, i + 6), { gap: 2.0, dist: 8.6 });
    await row(T, 'cast_flags_story', [
      { key: 'stig', outfit: 'arlanda', flags: { shoeOff: true }, label: 'stig shoeOff' },
      { key: 'ole', outfit: 'flyg', flags: { laugh: true }, label: 'ole laugh' },
      { key: 'herrStorch', flags: { film: true }, label: 'storch film' },
      { key: 'portier', flags: { mirror: true }, label: 'portier mirror' },
      { key: 'berra', outfit: 'sol', flags: { slump: true }, label: 'berra slump' },
      { key: 'majsan', outfit: 'sol', flags: { dance: true }, label: 'majsan dance' },
      { key: 'vardinna2', flags: { push: true }, label: 'vardinna2 push' },
      { key: 'vardinna2', flags: { cupHeld: true }, label: 'vardinna2 cupHeld' },
    ], { gap: 1.9 });
    await row(T, 'cast_held', [
      { key: 'ole', outfit: 'arlanda', flags: { speed: 2.5 }, label: 'boombox (walking)' },
      { key: 'affe', label: 'accordion' }, { key: 'gabbe', label: 'congas' }, { key: 'herrStorch', flags: { speed: 2.5 }, label: 'camera' },
      { key: 'stadare', label: 'broom' }, { key: 'mamma', label: 'handbag' },
      { def: { ...await T.ev(() => window.__cs.M.CHARS.stig), held: 'cup' }, label: 'cup' },
      { def: { ...await T.ev(() => window.__cs.M.CHARS.stig), held: 'knacke' }, label: 'knacke' },
    ]);
    // Close-ups of the two leads in every outfit (faces).
    await row(T, 'cast_close_stig', ['arlanda', 'kostym', 'hawaii', 'rio'].map((o) => ({ key: 'stig', outfit: o })), { gap: 1.25, dist: 3.4, h: 2.0, look: 1.75 });
    await row(T, 'cast_close_ole', ['arlanda', 'flyg', 'sol', 'gris', 'rio'].map((o) => ({ key: 'ole', outfit: o })), { gap: 1.25, dist: 3.8, h: 1.8, look: 1.5 });
    // Random peds: island (70/30 tourists/locals) and the plane's travellers.
    const peds = await T.ev(() => { const { M } = window.__cs; const r = (s) => { let a = s; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; }; const rr = r(42), rf = r(7); return [Array.from({ length: 10 }, () => M.randomPed(rr)), Array.from({ length: 10 }, () => M.randomPed(rf, { flight: true }))]; });
    await row(T, 'cast_peds_island', peds[0].map((def) => ({ def, label: def.local ? 'local' : 'tourist', flags: { speed: def.local ? 0 : 1.5 } })), { gap: 1.35 });
    await row(T, 'cast_peds_flight', peds[1].map((def) => ({ def, label: 'pax' })), { gap: 1.35 });
    // Seated busts (buildBustGeo for the cabin, buildBust for car drivers).
    await T.ev(() => {
      const cs = window.__cs, { M, G } = cs;
      cs.clear();
      const keys = ['stig', 'ole', 'majsan', 'siv', 'berra', 'robban', 'angerud', 'jose', 'herrStorch', 'fruStorch'];
      keys.forEach((k, i) => {
        const geo = M.buildBustGeo(M.outfitDef(k, 'flyg'));
        const mesh = G.toonMesh(geo, { outline: 0.025 });
        cs.obj(mesh, (i - 4.5) * 1.1, 0.55, 0, 0, k);
      });
      let s = 3;
      const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < 10; i++) cs.obj(M.buildBust(M.randomPed(r)), (i - 4.5) * 1.1, 0.55, -2.4, 0, '');
      cs.cam(0, 2.4, 6.4, 0, 1.2, -1);
    });
    await T.frames(10);
    await T.ev(() => window.__cs.labels(0.3));
    await T.shot('cast_busts');
    await portraits(T);
    // In place: the cabin with the seated cast and the bust passengers (mission 2, cruise).
    await T.fresh('&mission=2');
    await T.ev(() => { const g = __game, l = window.__lm('cabinRow16'); g.cabin.setPhase('cruise', { instant: true }); g.debugWarp(l.x, l.z + 1.5, Math.PI); });
    await T.frames(40);
    await T.shot('cast_cabin');
  },

  async heads(T) {
    await T.fresh(ISLAND);
    await T.ev(installStudio);
    // One face per hair style (page, bun, swoop, long, slick, short, balding, curly, afro) and the hats.
    const close = { gap: 1.25, dist: 3.6, h: 1.75, look: 1.5 };
    await row(T, 'heads_0', ['majsan', 'siv', 'vardinna', 'vardinna2', 'pa', 'mamma'].map((key) => ({ key })), close);
    await row(T, 'heads_1', ['stig', 'berra', 'levander', 'robban', 'sulan', 'carmencita'].map((key) => ({ key })), close);
    await row(T, 'heads_2', ['pax', 'kapten', 'guardia', 'jose', 'ole', 'stadare'].map((key) => ({ key })), close);
    await row(T, 'heads_3', [{ key: 'hittegods' }, { key: 'kontrollant' }, { key: 'eslov' }, { key: 'berra', outfit: 'sol' }, { key: 'stig', outfit: 'arlanda' }, { key: 'ole', outfit: 'arlanda' }], close);
    const peds = await T.ev(() => {
      const { M } = window.__cs, out = [], seen = new Set();
      let a = 5; const r = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
      for (let i = 0; i < 400 && out.length < 6; i++) { const p = M.randomPed(r); const k = p.hair + (p.local ? 'L' : 'T'); if (p.lashes && !p.hat && !seen.has(k)) { seen.add(k); out.push(p); } }
      return out;
    });
    await row(T, 'heads_peds', peds.map((def) => ({ def, label: def.hair })), close);
    // The tricorn from the front and three-quarter.
    await row(T, 'heads_guardia', [0, 0.7, 1.5].map((yaw, i) => ({ key: 'guardia', yaw, label: ['front', '3/4', 'side'][i] })), close);
    await portraits(T);
  },

  async cars(T) {
    await T.fresh(ISLAND);
    await T.ev(installStudio);
    const types = await T.ev(() => Object.keys(window.__cs.C.CAR_TYPES));
    T.log('car types', types.join(' '));
    for (const k of ['sedan', 'hatch', 'wagon', 'van', 'pickup', 'bus', 'guagua', 'icecream', 'taxi', 'guardia', 'grisbil', 'trolley', 'golfbil', 'traktor']) check(types.includes(k), `car type ${k}`);
    // Two rows: small cars, then the tall ones; each from the front-left and the rear-right.
    // side: +1 = seen from the front-left, -1 = the cars turned round (seen from the rear-right).
    const lineup = async (name, list, gap, side, dist, h) => {
      await T.ev((list, gap, side, dist, h) => {
        const cs = window.__cs, g = __game;
        cs.clear();
        const total = list.reduce((a, k) => a + cs.C.CAR_TYPES[k].wid + gap, 0) - gap;
        let x = -total / 2;
        for (const k of list) {
          const car = new cs.C.Car(k);
          const w = cs.C.CAR_TYPES[k].wid;
          x += w / 2;
          car.x = cs.O.x + x; car.z = cs.O.z; car.y = cs.O.y; car.yaw = 0.55 + (side < 0 ? Math.PI : 0);
          car.root.position.set(car.x, car.y, car.z);
          car.root.rotation.y = car.yaw;
          if (k !== 'trolley') g.addBust(k === 'guardia' ? cs.M.CHARS.guardia : k === 'bus' ? cs.M.CHARS.lasse : k === 'grisbil' ? cs.M.CHARS.grisbonde : cs.M.randomPed(), car);
          cs.root.add(car.root);
          cs.items.push({ obj: car.root, label: k, x, z: 2.4, y: 0, car });
          x += w / 2 + gap;
        }
        const d = Math.max(dist, (total / 2 + 2.5) / (Math.tan(25 * Math.PI / 180) * 16 / 9) + 2);
        cs.cam(0, h, d, 0, 1.0, 0);
      }, list, gap, side, dist, h);
      await T.frames(36);
      await T.ev(() => { for (const it of window.__cs.items) it.car?.sync(1 / 60); window.__cs.labels(0); });
      await T.frames(3);
      await T.shot(name);
    };
    await lineup('cars_small_front', ['hatch', 'sedan', 'taxi', 'wagon', 'pickup', 'grisbil'], 2.2, 1, 15, 4.5);
    await lineup('cars_small_rear', ['hatch', 'sedan', 'taxi', 'wagon', 'pickup', 'grisbil'], 2.2, -1, 15, 4.5);
    await lineup('cars_tall_front', ['van', 'guardia', 'icecream', 'trolley'], 2.6, 1, 13, 4.0);
    await lineup('cars_tall_rear', ['van', 'guardia', 'icecream', 'trolley'], 2.6, -1, 13, 4.0);
    await lineup('cars_bus', ['bus', 'guagua'], 3.5, 1, 20, 5.5);
    await lineup('cars_bus_rear', ['bus', 'guagua'], 3.5, -1, 20, 5.5);
    // Close-ups.
    await lineup('cars_guardia', ['guardia'], 1, 1, 6.5, 2.8);
    await lineup('cars_grisbil', ['grisbil'], 1, -1, 7, 3.6);
    await lineup('cars_icecream', ['icecream', 'taxi'], 2, 1, 9, 3.0);
    await lineup('cars_golfbil', ['golfbil', 'hatch'], 2, 1, 8, 2.8);   // the golf cart (feature 74, §10.40) beside a small car
    await lineup('cars_traktor', ['traktor', 'hatch'], 2.2, 1, 10, 3.2);   // the tractor (feature 121, §10.54) beside a small car
    await lineup('cars_traktor_rear', ['traktor', 'hatch'], 2.2, -1, 10, 3.2);
    // Collectibles (every kind; all seven pryl variants) and rabbits: one row per group, each
    // label on the floor under its object, then a close-up of the two printed ones.
    const items = async (name, list, { gap = 1.7, h = 1.6, look = 0.6, dist = 0 } = {}) => {
      await T.ev((list, gap, h, look, dist) => {
        const cs = window.__cs, { P } = cs;
        cs.clear();
        const n = list.length;
        list.forEach((e, i) => {
          const x = (i - (n - 1) / 2) * gap;
          let mesh;
          if (e.rabbit) {
            const r = new P.Rabbit(cs.root, cs.O.x + x, cs.O.z, { mesh: e.rabbit, flee: false });
            r.y = cs.O.y; r.mesh.position.set(r.x, cs.O.y, r.z); r.update = () => {};
            mesh = r.mesh;
          } else {
            const c = new P.Collectible(cs.root, e.kind, e.id || 'x', cs.O.x + x, cs.O.y + (e.y ?? 0.6), cs.O.z, { motion: 'none', scale: e.scale || 1 });
            mesh = c.mesh;
          }
          mesh.rotation.y = e.yaw ?? 0.5;
          cs.items.push({ obj: mesh, label: e.label || e.id || e.kind || e.rabbit, x, z: 0.9, y: 0 });
        });
        const d = dist || ((n - 1) * gap / 2 + 1.2) / (Math.tan(25 * Math.PI / 180) * 16 / 9) + 1;
        cs.cam(0, h, d, 0, look, 0);
      }, list, gap, h, look, dist);
      await T.frames(36);
      await T.ev(() => window.__cs.labels(0));
      await T.shot(name);
    };
    await items('items_prylar', ['klocka', 'poolpen', 'kalkylator', 'kniv', 'kamera', 'glasogon', 'pung'].map((id) => ({ kind: 'pryl', id, y: 0.7 })), { gap: 1.5, h: 1.8, look: 0.8 });
    await items('items_kinds', ['fena', 'flaska', 'juice', 'knacke', 'asna', 'vaska', 'giraff'].map((kind) => ({
      kind, y: kind === 'fena' ? 0.35 : kind === 'flaska' ? 0.15 : 0.6, scale: kind === 'juice' || kind === 'flaska' ? 1.8 : 1, yaw: kind === 'flaska' ? Math.PI / 2 : 0.5,
    })), { gap: 1.7, h: 1.6, look: 0.6 });
    await items('items_rabbits', ['badboll', 'faar', 'blomma', 'gris'].map((rabbit) => ({ rabbit })), { gap: 2.2, h: 1.8, look: 0.7 });
    await items('items_close', [{ kind: 'knacke', y: 0.5, yaw: 0.25 }, { kind: 'asna', y: 0.6, yaw: 0.6 }], { gap: 1.3, h: 1.1, look: 0.7, dist: 2.6 });
    const st = await T.ev(() => window.__stats());
    T.log('stats', JSON.stringify(st));
  },
};
