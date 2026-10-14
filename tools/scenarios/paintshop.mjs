// The free-roam paint shop at Gasolina (DESIGN §7.2 "Paint shop"; feature 1, "Coche folcloristico
// nativo"): pintura, dalasheet.
//   pintura:   the drive-by route is clear of props and solids, the moved parked hatch stands free;
//              no paint without a pursuit; Ole's tip on the first free-roam pursuit (once); no paint
//              with a Land Rover within 35 m; told to stop while rolling in; a paint job (−1000 pta,
//              the pursuit over, the cooldown, the scene with Ole's and Stig's lines in a cutaway,
//              the car red with the dalahäst dress and repaired, Ole back home, the banner, the
//              wet-paint SKICK card, the Land Rover's "En målad bil…?", the paint dries);
//              the painted car is known next time; no second car inside the cooldown; not without
//              the money; ruined wet paint starts a new pursuit; no bus; nothing while a mission runs.
//   dalasheet: the dress on every paintable body (sedan, hatch, wagon, van, pickup), side and front.
import { check } from '../lib.mjs';

const ISLAND = '&mission=6';
const RED = 0xb8202a;

// In the page: a new car of `type` at a `pintura` offset, the player at its wheel.
const newCar = (T, type, dx, dz, yaw) => T.ev((type, dx, dz, yaw) => {
  const g = __game, q = g.lmOffset('pintura', dx, dz);
  if (g.playerCar) g.exitCar(true);
  const c = new window.__Car(type, { color: 0x8fb3c9 });
  c.place(q.x, q.z, yaw);
  g.addCar(c);
  g.enterCar(c);
  window.__pc = c;
  return c.id;
}, type, dx, dz, yaw);
// Keep the pursuit on and the Land Rovers parked far away (or one of them `near` m from the zone).
const park = (T, near = 0) => T.ev((near) => {
  const s = __game.shame, z = window.__lm('pintura');
  s.forced = true;
  s.pursuers.forEach((c, k) => { c.ai = null; if (k === 0 && near) c.place(z.x + near, z.z, 0); else c.place(-250 + k * 12, -250, 0); c.vx = c.vz = 0; });
}, near);

export const SCENARIOS = {
  async pintura(T) {
    await T.fresh(ISLAND);
    await T.ev(async () => {
      window.__Car = (await import('/src/actors/car.js')).Car;
      const g = __game, r0 = g.radio.bind(g);
      window.__tips = 0;
      window.__toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | ');
      g.radio = (who, text) => { if (String(text).includes('verkstedet ved Gasolina')) window.__tips++; r0(who, text); };
    });
    // 0. The Land Rover's drive-by route: no live prop within 2.5 m of a leg, no solid across a leg
    // or 1.2 m to either side of it (a car's wall: top above 0.15 + 0.6).
    let r = await T.ev(async () => {
      const C = await import('/src/world/collision.js'), g = __game;
      const pts = (await import('/src/game/paintshop.js')).DRIVE_BY.map(([dx, dz]) => g.lmOffset('pintura', dx, dz));
      const bad = [];
      for (let k = 0; k + 1 < pts.length; k++) {
        const a = pts[k], b = pts[k + 1], l = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / l, nz = (b.x - a.x) / l;
        for (const o of [0, 1.2, -1.2]) if (C.segmentBlocked(a.x + nx * o, a.z + nz * o, b.x + nx * o, b.z + nz * o, 0.75) >= 0) bad.push(`solid on leg ${k} (${o})`);
        for (const p of window.__props) {
          if (!p.alive) continue;
          const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / (l * l)));
          const d = Math.hypot(p.x - (a.x + (b.x - a.x) * t), p.z - (a.z + (b.z - a.z) * t));
          if (d < 2.5) bad.push(`${p.def?.name || p.type || 'prop'} at (${(p.x - g.lmOffset('pintura').x + 11.25).toFixed(1)}, ${(p.z - g.lmOffset('pintura').z - 8).toFixed(1)}) ${d.toFixed(1)} m from leg ${k}`);
        }
      }
      return bad;
    });
    T.log('drive-by route', r.length ? r.join(', ') : 'clear');
    check(!r.length, 'the drive-by route is clear of props and solids');
    // The yellow hatch moved out of the painted car's way stands free (a parked car inside a solid
    // is pushed out by its first steps).
    r = await T.ev(() => { const z = window.__lm('pintura'), c = __game.cars.find((c) => c.color === 0xc8a03a && Math.hypot(c.x - z.x - 18.25, c.z - z.z + 12) < 3); return c ? Math.hypot(c.x - z.x - 18.25, c.z - z.z + 12) : null; });
    T.log('the yellow hatch by the gable moved', r);
    check(r != null && r < 0.05, 'the parked hatch by the workshop gable stands free');
    // 1. A hatch in the zone, dented, 3000 pta: nothing without a pursuit.
    await T.ev(() => __game.addCoins(3000 - __game.coins));
    await newCar(T, 'hatch', 0, 0, 0);
    await T.ev(() => { window.__pc.hp = 40; });
    await T.sleep(1800);
    r = await T.ev(() => ({ busy: __game.shame.paint.busy, painted: !!window.__pc.painted }));
    check(!r.busy && !r.painted, 'no paint job without a pursuit');
    // 2. Out of the zone, a pursuit: Ole's tip on the radio once the banner has gone.
    await T.ev(() => { const g = __game, q = g.lmOffset('pintura', 6.75, 14); window.__pc.place(q.x, q.z, Math.PI); g.shame.add(100); });
    await park(T);
    await T.until(() => window.__tips > 0, 8000).catch(() => {});
    r = await T.ev(() => ({ tips: window.__tips, pursuit: __game.shame.pursuit, toasts: [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '), marker: __game.mapMarkers().some((m) => m.type === 'friend') }));
    T.log('tip', JSON.stringify(r));
    check(r.pursuit && r.tips === 1 && r.toasts.includes('verkstedet ved Gasolina') && r.marker, "Ole's tip on the first pursuit, the paint shop on the minimap");
    await T.shot('pintura_tip');
    // 3. A Land Rover 20 m from the zone: no paint, a toast.
    await park(T, 20);
    await T.ev(() => { const z = window.__lm('pintura'); window.__pc.place(z.x, z.z, Math.PI); });
    await T.sleep(1800);
    r = await T.ev(() => ({ busy: __game.shame.paint.busy, painted: !!window.__pc.painted, toasts: window.__toasts() }));
    T.log('seen', JSON.stringify(r));
    check(!r.busy && !r.painted && r.toasts.includes('Guardia Civil ser dig'), 'no paint with a Land Rover within 35 m');
    // 4. The Land Rover gone: the paint job starts after a second's stop.
    // (Test-mode dialogue types at 220 characters a second: slowed so the shots catch each line.)
    const purse = await T.ev(() => { __game.dialogSpeed = 20; return __game.coins; });
    const oleHome = await T.ev(() => { const o = __game.npc('ole'); return { x: o.x, z: o.z }; });
    await park(T);
    // Still rolling into the box: told to stop; stopped for a second, painted.
    await T.ev(() => { window.__pc.vz = -3; });
    await T.until(() => window.__toasts().includes('Stanna i den gula rutan'), 3000);
    await T.until(() => __game.shame.paint.busy, 6000);
    r = await T.ev(() => { const g = __game, s = g.shame; return { coins: g.coins, pursuit: s.pursuit, v: s.v, cd: s.hideoutT, cut: g.inCutaway, dlg: g.inDialog }; });
    T.log('paint starts', JSON.stringify(r));
    check(r.coins === purse - 1000 && !r.pursuit && r.v === 0 && r.cd > 50 && r.cut && r.dlg, 'paint: −1000 pta, the pursuit over at once, the cooldown, a cutaway scene');
    await T.until(() => document.querySelector('.dlg-text')?.textContent.includes('maler vi den rød'), 6000);
    r = await T.ev(() => { const g = __game, o = g.npc('ole'), z = window.__lm('pintura'), c = window.__pc; return { ole: Math.hypot(o.x - z.x, o.z - z.z), stig: Math.hypot(g.player.x - z.x, g.player.z - z.z), inBay: c.z - z.z, colour: c.color.toString(16) }; });
    T.log('scene', JSON.stringify(r));
    check(r.ole < 4 && r.stig < 4 && r.inBay < -4 && r.colour !== RED.toString(16), 'scene: Ole and Stig by the car in the bay, not painted yet');
    await T.shot('pintura_scene');
    await T.until(() => document.querySelector('.dlg-text')?.textContent.includes('blommor där'), 6000);
    await T.shot('pintura_scene2');
    await T.until(() => !__game.shame.paint.busy, 10000);
    await T.ev(() => { __game.dialogSpeed = 220; });
    await T.frames(6);
    r = await T.ev((home) => {
      const g = __game, c = window.__pc, o = g.npc('ole'), z = window.__lm('pintura');
      return {
        inCar: g.playerCar === c, painted: !!c.painted, colour: c.color, dala: !!c.dala && c.dala.visible, hp: c.hp === c.spec.hp, out: Math.hypot(c.x - z.x, c.z - z.z),
        ole: Math.hypot(o.x - home.x, o.z - home.z), cut: g.inCutaway, dlg: g.inDialog, pursuit: g.shame.pursuit,
        banner: document.querySelector('.banner-main').textContent, sub: document.querySelector('.banner-sub').textContent,
        card: document.getElementById('objective')?.innerText.replace(/\s+/g, ' ') || '',
      };
    }, oleHome);
    T.log('painted', JSON.stringify(r));
    check(r.inCar && r.painted && r.colour === RED && r.dala && r.hp && r.out < 0.5 && r.ole < 0.5 && !r.cut && !r.dlg && !r.pursuit, 'painted: red, the dalahäst dress, repaired, rolled out with Stig at the wheel, Ole back home');
    check(r.banner === 'COCHE FOLCLORISTICO NATIVO' && r.sub.includes('känner inte igen') && r.card.includes('VÅT FÄRG') && r.card.includes('SKICK'), 'the banner and the wet-paint card');
    await T.shot('pintura_reveal');
    await T.until(() => [...document.querySelectorAll('.bubble')].some((b) => b.textContent.includes('En målad bil')), 10000);
    r = await T.ev(() => { const g = __game, j = g.cars.find((c) => c.type === 'guardia' && !c.isPursuer && !c.name && c.ai); return j ? Math.hypot(j.x - g.playerCar.x, j.z - g.playerCar.z).toFixed(1) : null; });
    T.log('drive-by bubble, Land Rover at', r, 'm');
    await T.shot('pintura_driveby');
    // 5. The paint dries (12 s).
    await T.until(() => !__game.shame.paint.wet, 16000);
    r = await T.ev(() => ({ toasts: window.__toasts(), card: document.getElementById('objective').classList.contains('show') }));
    T.log('dry', JSON.stringify(r));
    check(r.toasts.includes('Färgen har torkat') && !r.card, 'the paint dries: a toast, the card gone');
    // 6. A second pursuit: no second tip; the painted car is known.
    const purse2 = await T.ev(() => __game.coins);
    await T.ev(() => { const g = __game, q = g.lmOffset('pintura', 6.75, 14); window.__pc.place(q.x, q.z, Math.PI); g.shame.add(100); });
    await park(T);
    await T.ev(() => { const z = window.__lm('pintura'); window.__pc.place(z.x, z.z, Math.PI); });
    await T.sleep(1800);
    r = await T.ev(() => ({ busy: __game.shame.paint.busy, tips: window.__tips, toasts: window.__toasts(), coins: __game.coins, marker: __game.mapMarkers().some((m) => m.type === 'friend') }));
    T.log('known', JSON.stringify(r));
    check(!r.busy && r.tips === 1 && r.toasts.includes('känner igen dalahästen') && r.coins >= purse2 && !r.marker, 'the painted car is known; the tip came once');
    // 7. Another car inside the cooldown: busy; out of money: no; then a second paint job.
    await newCar(T, 'sedan', 0, 0, Math.PI);
    await T.sleep(1800);
    r = await T.ev(() => ({ busy: __game.shame.paint.busy, toasts: window.__toasts() }));
    T.log('cooldown', JSON.stringify(r));
    check(!r.busy && r.toasts.includes('upptagen'), 'no second paint job inside the cooldown');
    await T.ev(() => { const g = __game; g.shame.hideoutT = 0; g.addCoins(500 - g.coins); });
    await T.sleep(1800);
    r = await T.ev(() => ({ busy: __game.shame.paint.busy, toasts: window.__toasts(), coins: __game.coins }));
    T.log('poor', JSON.stringify(r));
    check(!r.busy && /kostar 1\s000 pta/.test(r.toasts) && r.coins === 500, 'not without the money (Ole does not pay)');
    await T.ev(() => __game.addCoins(1500));
    await T.until(() => __game.shame.paint.busy, 4000);
    await T.until(() => !__game.shame.paint.busy, 12000);
    await T.frames(6);
    // 8. Ruined wet paint: a hard knock with SKICK low, and they know the car again.
    r = await T.ev(() => { const g = __game, c = window.__pc, w = g.shame.paint.wet; if (!w) return null; w.ride.v = 20; c.vz = -14; return { coins: g.coins, painted: c.painted }; });
    T.log('second paint job', JSON.stringify(r));
    check(r && r.coins === 1000 && r.painted, 'a second car painted, wet');
    await T.until(() => __game.shame.pursuit, 5000);
    r = await T.ev(() => ({ wet: !!__game.shame.paint.wet, toasts: window.__toasts() }));
    T.log('ruined', JSON.stringify(r));
    check(!r.wet && r.toasts.includes('Färgen blev förstörd'), 'ruined wet paint: a new pursuit');
    await T.shot('pintura_ruined');
    // 9. No bus.
    await park(T);
    await T.ev(() => { __game.shame.hideoutT = 0; __game.addCoins(2000); });
    await newCar(T, 'guagua', 0, 0, Math.PI / 2);
    await T.sleep(1800);
    r = await T.ev(() => ({ busy: __game.shame.paint.busy, toasts: window.__toasts() }));
    T.log('bus', JSON.stringify(r));
    check(!r.busy && r.toasts.includes('kan inte målas'), 'a bus cannot be painted');
    // 10. Nothing while a mission runs (a mission's chase or wreck is never fixed here).
    await T.ev(() => __game.shame.clear());
    await T.startMission();
    await T.ev(() => { __game.timeScale = 1; });   // the balls' timer must not run out under the checks
    await newCar(T, 'hatch', 0, 0, Math.PI);
    await T.ev(() => { const s = __game.shame; s.hideoutT = 0; s.add(100, { force: true }); });
    await park(T);
    await T.sleep(2000);
    r = await T.ev(() => ({ state: __game.missions.state, pursuit: __game.shame.pursuit, busy: __game.shame.paint.busy, painted: !!window.__pc.painted, marker: __game.mapMarkers().some((m) => m.type === 'friend') }));
    T.log('mission running', JSON.stringify(r));
    check(r.state === 'running' && r.pursuit && !r.busy && !r.painted && !r.marker, 'no paint shop while a mission runs');
  },

  async dalasheet(T) {
    await T.fresh(ISLAND);
    // A row of painted cars on Gasolina's lot (block-local z 20, facing +x), seen from the south
    // side, from the front right and from above.
    await T.ev(async () => {
      const { Car } = await import('/src/actors/car.js'), g = __game, z = window.__lm('pintura');
      const B = { x: z.x - 11.25, z: z.z + 8 };
      window.__B = B;
      window.__sheet = ['sedan', 'hatch', 'wagon', 'van', 'pickup'].map((type, k) => {
        const c = new Car(type, { color: 0x8fb3c9 });
        c.place(B.x - 12 + k * 6, B.z + 20, Math.PI / 2);
        g.addCar(c);
        c.repaint(0xb8202a, { dala: true });
        return c;
      });
      g.debugWarp(B.x - 20, B.z + 8, 0);
    });
    await T.frames(10);
    for (const [name, lx, lz, yaw, d, h] of [['dala_side', 0, 20, Math.PI, 14, 2], ['dala_left', 0, 20, 0, 9, 1.8], ['dala_front', 6, 20, -2.2, 9, 3], ['dala_top', 0, 20, Math.PI, 7, 9]]) {
      await T.ev((lx, lz, yaw, d, h) => { const g = __game, B = window.__B; g.cutTo({ at: { x: B.x + lx, z: B.z + lz, yaw }, dist: d, height: h }); g.cam.snapNext = true; }, lx, lz, yaw, d, h);
      await T.frames(8);
      await T.shot(name);
    }
    const r = await T.ev(() => window.__sheet.map((c) => `${c.type}:${c.dala ? c.dala.geometry.attributes.position.count : 0}`).join(' '));
    T.log('dress vertices', r);
    check(!r.includes(':0'), 'every paintable body has the dress');
    await T.ev(() => __game.endCut());
  },
};
