// Stunthopp med G17-stämpel (feature 40, DESIGN §10.27): his car's jumps judged in free roam.
//   stunthopp:  the plank off the bygge's 1st floor over the road to the dream plane, driven by a
//               route follower up the ramp, round onto the 3 m strip and off the plank: LUFTTID in
//               the air with the mantra, KONTROLLERAD AV G17, the card, +100 pta and the record;
//               his arms out by the plane; again (no pay), a new record (+25), the save and a
//               reload; a parked car under the flight (UNDERKÄND in the air, judged once) and in
//               the run-out (UNDERKÄND after the landing).
//   stuntzoner: the yellow ramp (onto the big ramp and off it: two flights, one jump), too slow
//               (into the big ramp's side: UNDERKÄND), a hop too small to count, a garage deck,
//               nothing with a mission running, GODKÄND before fataga, the flight level inert.
import { check } from '../lib.mjs';

const SAVE = 'charter-and-run-v1';

// Page side: a route follower for the player's car (it sits in car.ai, which main.js steps right
// after the input write, as calibrate's autopilot does): pure pursuit `look` m ahead along the
// route. pts: [{ x, z, v }] world points, v the target speed (m/s) on the segment into the point; a
// last v of 0 parks. Every step's state goes into __apState.log.
const installAp = (T) => T.ev(() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  window.__ap = (pts, o = {}) => {
    const g = __game, car = g.playerCar;
    const ap = { i: 1, log: [] };
    car.ai = {
      update() {
        const c = car.ctrl;
        c.park = false; c.handbrake = false;
        let a = pts[ap.i - 1], b = pts[ap.i];
        let L = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / L, uz = (b.z - a.z) / L;
        let s = (car.x - a.x) * ux + (car.z - a.z) * uz;
        while (s > L && ap.i < pts.length - 1) {
          ap.i++; a = pts[ap.i - 1]; b = pts[ap.i];
          L = Math.hypot(b.x - a.x, b.z - a.z); ux = (b.x - a.x) / L; uz = (b.z - a.z) / L;
          s = (car.x - a.x) * ux + (car.z - a.z) * uz;
        }
        const v = car.forwardSpeed, look = Math.max(o.look ?? 2.2, Math.abs(v) * 0.3);
        let rest = look + s, j = ap.i, tx = a.x, tz = a.z;
        for (;;) {
          const p0 = pts[j - 1], p1 = pts[j], l = Math.hypot(p1.x - p0.x, p1.z - p0.z);
          if (rest <= l || j === pts.length - 1) { const f = rest / l; tx = p0.x + (p1.x - p0.x) * f; tz = p0.z + (p1.z - p0.z) * f; break; }
          rest -= l; j++;
        }
        let e = Math.atan2(tx - car.x, tz - car.z) - car.yaw; e = Math.atan2(Math.sin(e), Math.cos(e));
        const Ld = Math.hypot(tx - car.x, tz - car.z), ang = Math.atan(car.spec.len * 0.62 * 2 * Math.sin(e) / Math.max(0.5, Ld));
        c.steer = clamp(-ang / (car.spec.steer / (1 + Math.abs(v) / 15)), -1, 1);
        const vt = b.v;
        if (vt === 0 && v < 0.8) { c.throttle = 0; c.brake = 0; c.park = true; }
        else if (v < vt - 0.3) { c.throttle = 1; c.brake = 0; }
        else if (v > vt + 0.4) { c.throttle = 0; c.brake = clamp((v - vt) * 0.35, 0.1, 1); }
        else { c.throttle = 0.35; c.brake = 0; }
        ap.log.push([+g.time.toFixed(2), +car.x.toFixed(2), +car.z.toFixed(2), +car.y.toFixed(2), +v.toFixed(1), car.air ? 1 : 0]);
      },
    };
    window.__apState = ap;
  };
});
const said = (T) => T.ev(() => window.__said.slice());
const wrapSay = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || '?', text, +g.time.toFixed(2)]);
      return o(t, text, secs);
    };
  }
  window.__said = [];
});
// Nobody in the way: the pedestrians and traffic near the bygge and the dream plane sent away, and
// both held still where they are (the level's `sim` flags for this page: no traffic recycled onto
// the west road the route crosses or the road the plank jump lands on).
const clear = (T) => T.ev(() => {
  const g = __game, near = (x, z) => Math.abs(x - 190) < 110 && Math.abs(z + 160) < 90;
  for (const ped of g.peds) if (near(ped.char.x, ped.char.z)) ped.char.teleport(ped.char.x - 420, ped.char.z + 300);
  for (const c of g.cars) if (c.traffic && near(c.x, c.z)) c.place(c.x - 420, c.z + 300, c.yaw);
  g.levelDef.sim.traffic = false;
  g.levelDef.sim.peds = false;
});
// Every SKANDAL add, with where it came from (a jump adds none).
const watchShame = (T) => T.ev(() => {
  const g = __game, sh = g.shame, o = sh.add.bind(sh);
  window.__sh = [];
  sh.add = (n, ...a) => { window.__sh.push([+g.time.toFixed(2), n, new Error().stack.split('\n').slice(2, 5).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\/src\//, '')).join(' < ')]); return o(n, ...a); };
});
async function setup(T, query) {
  await T.fresh(query);
  await watchShame(T);
  await installAp(T);
  await wrapSay(T);
  await clear(T);
}
// Into the hire car at pts[0], facing pts[1], and off along the route; returns g.time at the start.
async function drive(T, pts) {
  await T.ev((pts) => {
    const g = __game;
    if (!g.playerCar) g.enterCar(g.named.hyrbil || g.ensureNamedCar('hyrbil'));
    const c = g.playerCar, [a, b] = pts;
    c.repair();
    c.place(a.x, a.z, Math.atan2(b.x - a.x, b.z - a.z));
    g.cam.yaw = c.yaw; g.cam.snapNext = true;
  }, pts);
  await T.frames(5);
  return T.ev((pts) => { const t = __game.time; __ap(pts); return t; }, pts);
}
const P = (list) => list.map(([x, z, v]) => ({ x, z, v }));
// The plank route: in from the west road along the big ramp's south edge (z -164.6), up it at
// 9 m/s, 3.5 m/s round the S onto the strip at z -161.4 (two 5.6 m arcs), then flat out over the
// plank, and braking in the run-out on the dream plane's lot.
function plankRoute() {
  const R = 5.6, z0 = -164.6, z1 = -161.4, vT = 3.5, th = Math.acos(1 - (z1 - z0) / (2 * R));
  const pts = [[112, z0, 9], [150, z0, 9], [153.5, z0, vT]];
  for (let i = 1; i <= 10; i++) { const f = (i / 10) * th; pts.push([154 + R * Math.sin(f), z0 + R * (1 - Math.cos(f)), vT]); }
  const cx = 154 + 2 * R * Math.sin(th);
  for (let i = 9; i >= 0; i--) { const f = (i / 10) * th; pts.push([cx - R * Math.sin(f), z1 - R * (1 - Math.cos(f)), vT]); }
  pts.push([cx + 1, z1, 30], [197, z1, 30], [209, z1, 10], [216, z1, 0]);
  return P(pts);
}
// The yellow ramp from inside the yard (the hoarding closes the street side), north up its 8 m.
const yellowRoute = (v) => P([[144, -131, v], [144, -150, v], [144, -175, v], [144, -186, 0]]);
const verdict = (T, t0, ms = 30000) => T.until((t0) => (__game.stunts.last?.t ?? -1) > t0, ms, t0).then(() => T.ev(() => __game.stunts.last));
const hud = (T) => T.ev(() => {
  const b = document.getElementById('banner'), s = document.getElementById('score');
  return { banner: b.querySelector('.banner-main').textContent, bcls: b.className, score: s.querySelector('.score-main').textContent, sub: s.querySelector('.score-sub').textContent, scoreOn: s.classList.contains('show'), record: s.classList.contains('record') };
});
const stop = (T) => T.ev(() => { const c = __game.playerCar; if (c) { c.ai = null; c.ctrl.throttle = 0; c.ctrl.brake = 0; c.ctrl.park = true; } });
const stopped = (T) => T.until(() => __game.playerCar && __game.playerCar.speed < 0.5, 10000);

export const SCENARIOS = {
  async stunthopp(T) {
    await setup(T, '&mission=11');
    await T.ev((k) => localStorage.removeItem(k), SAVE);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island' && __game.stunts.live), 'free roam on the island (after fataga)');
    const cfg = await T.ev(() => __game.stunts.cfg);
    const mantra = await T.ev(async () => (await import('/src/strings.js')).S.mantraLine);
    const plank = await T.ev(() => window.__lm('stunt_planka'));
    check(Math.hypot(plank.x - 182, plank.z + 161.4) < 0.01, 'stunt_planka at the 1st floor\'s east end (182, −161.4)');
    const gh = await T.ev(async () => { const C = await import('/src/world/collision.js'); return [181.9, 179.4, 182.3].map((x) => +C.groundAt(x, -161.4, 6, 0.6).toFixed(2)); });
    T.log('plank ground', JSON.stringify(gh));
    check(Math.abs(gh[0] - 4.42) < 0.05 && Math.abs(gh[1] - 3.6) < 0.1 && gh[2] < 0.2, 'the plank rises from the deck (3.55) to 4.45 at its end; past it the drop to the ground');

    // 1. Off the plank: LUFTTID in the air, the mantra, then the stamp.
    const c0 = await T.ev(() => __game.coins), sh0 = await T.ev(() => __game.shame.v);
    let t0 = await drive(T, plankRoute());
    await T.until(() => { const c = __game.playerCar; return c && c.x > 174.5 && c.y > 3.4; }, 30000);
    await T.shot('stunt_planka_remsan');
    await T.until(() => { const c = __game.playerCar; return c && c.air && c.airT > 0.38; }, 30000);
    await T.shot('stunt_planka_luft');
    let h = await hud(T);
    const air = await T.ev(() => { const c = __game.playerCar; return { x: c.x, y: c.y, z: c.z, v: c.speed, from: c.airFrom, zone: __game.stunts.jump?.zone?.id }; });
    T.log('in the air', JSON.stringify(air), JSON.stringify(h));
    check(air.zone === 'planka' && air.from.y > 4.3 && Math.abs(air.from.x - 182) < 0.6, `off the plank's end (${JSON.stringify(air.from)})`);
    check(h.scoreOn && /^LUFTTID 0,[3-9] S$/.test(h.score) && !h.sub, `LUFTTID on the result line in the air (${h.score})`);
    let s = await said(T);
    check(s.some(([w, l, t]) => w === 'stig' && l === mantra && t > t0), `the mantra in a bubble in the air (${JSON.stringify(s)})`);
    let L = await verdict(T, t0);
    await T.sleep(250);
    await T.shot('stunt_planka_stampel');
    h = await hud(T);
    T.log('plank 1', JSON.stringify(L), JSON.stringify(h));
    check(L.kind === 'pass' && L.id === 'planka' && L.flights === 1, 'the plank jump passes');
    check(L.air > 0.85 && L.air < 1.05 && L.dist > 14.5 && L.dist < 20, `about 0.9 s and 16 m (${L.air} s, ${L.dist} m)`);
    check(L.stamp === 'KONTROLLERAD AV G17' && h.banner === 'KONTROLLERAD AV G17' && /\bstamp\b/.test(h.bcls) && /\bshow\b/.test(h.bcls) && !/fail/.test(h.bcls), `the stamp KONTROLLERAD AV G17 (${h.bcls})`);
    const m = Math.round(L.dist);
    check(h.score === `LUFTTID ${L.air.toFixed(1).replace('.', ',')} S · ${m} M · +100 PTA` && h.sub === 'NYTT REKORD: BYGGET – DRÖMPLANET' && h.record, `the card: ${h.score} / ${h.sub}`);
    check(L.pay === 100 && L.record && (await T.ev(() => __game.coins)) === c0 + 100, 'the first pass pays 100 pta');
    check((await T.ev(() => __game.records.stunts?.planka)) === L.dist, 'the record is its distance');
    check((await T.ev(() => __game.shame.v)) === sh0, `no SKANDAL for a jump (${JSON.stringify(await T.ev(() => window.__sh))})`);
    await T.sleep(700);
    s = await said(T);
    check(s.some(([w, l, t]) => w === 'stig' && l === cfg.dreamLine.g17 && t >= L.t), `Stig: "${cfg.dreamLine.g17}" (${JSON.stringify(s)})`);
    await stopped(T);
    const car = await T.ev(() => { const c = __game.playerCar; return { x: +c.x.toFixed(1), z: +c.z.toFixed(1), hp: Math.round(c.hp) }; });
    T.log('stopped', JSON.stringify(car));
    check(car.x > 205 && car.x < 222 && car.hp > 80, 'stopped on the dream plane\'s lot, a few hp off for the hard landing');

    // 2. Out by the plane: his arms out to it.
    await stop(T);
    await T.ev(() => __game.exitCar());
    await T.frames(6);
    const arms = await T.ev(() => { const p = __game.player, k = window.__lm('pryl_kamera'); return { wings: !!p.anim.wings, yaw: p.yaw, want: Math.atan2(k.x - p.x, k.z - p.z) }; });
    await T.ev(() => { const g = __game, c = g.named.hyrbil; c.place(c.x - 10, c.z + 6, c.yaw); g.cam.yaw = g.player.yaw - 0.35; g.cam.snapNext = true; });
    await T.sleep(400);
    await T.shot('stunt_dromplanet');
    check(arms.wings && Math.abs(Math.atan2(Math.sin(arms.yaw - arms.want), Math.cos(arms.yaw - arms.want))) < 0.05, 'out of the car by the plane: arms out, facing it');
    await T.sleep(3000);
    check(!(await T.ev(() => __game.player.anim.wings)), 'the arms down after 3 s');

    // 3. Again: passed, but no pay without a record.
    await clear(T);
    let c1 = await T.ev(() => __game.coins);
    t0 = await drive(T, plankRoute());
    L = await verdict(T, t0);
    h = await hud(T);
    T.log('plank 2', JSON.stringify(L), JSON.stringify(h));
    check(L.kind === 'pass' && L.id === 'planka', 'the plank again: passed');
    if (L.record) check(L.pay === 25, 'a record pays 25');
    else check(L.pay === 0 && h.score === `LUFTTID ${L.air.toFixed(1).replace('.', ',')} S · ${Math.round(L.dist)} M` && h.sub === `BYGGET – DRÖMPLANET · REKORD ${m} M` && !h.record, `no pay, the card shows the record (${h.score} / ${h.sub})`);
    check((await T.ev(() => __game.coins)) === c1 + L.pay, 'the purse');

    // 4. A new record: 25 pta (the best set back to 10 m).
    await stopped(T);
    await T.ev(() => { __game.records.stunts.planka = 10; });
    await clear(T);
    c1 = await T.ev(() => __game.coins);
    t0 = await drive(T, plankRoute());
    L = await verdict(T, t0);
    h = await hud(T);
    T.log('plank record', JSON.stringify(L), JSON.stringify(h));
    check(L.record && L.pay === 25 && L.best === 10 && (await T.ev(() => __game.coins)) === c1 + 25, 'a new record pays 25 pta');
    check(h.score.endsWith(' · +25 PTA') && h.sub === 'NYTT REKORD: BYGGET – DRÖMPLANET', 'the card says so');

    // 5. Saved (v 1) and back after a reload.
    const sv = await T.ev((k) => { __game.save(); return JSON.parse(localStorage.getItem(k)); }, SAVE);
    T.log('save', JSON.stringify(sv.records));
    check(sv.v === 1 && sv.records.stunts.planka === L.dist, 'records.stunts in the save, v 1');
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1&mission=11`, { waitUntil: 'load' });
    await T.until(() => window.__ready === true, 120000);
    await T.frames(10);
    check((await T.ev(() => __game.records.stunts?.planka)) === L.dist, 'a reload keeps the record');
    await T.ev((k) => localStorage.removeItem(k), SAVE);

    // 6. A parked car under the flight: hit in the air, UNDERKÄND, and the rest of that flight is no
    // second jump.
    await installAp(T);
    await wrapSay(T);
    await clear(T);
    const parked = await T.ev(() => {
      const g = __game, c = g.cars.find((c) => !c.traffic && !c.name && !c.dead && !c.locked && !c.ai && c.spec.len < 5 && Math.hypot(c.x - 160, c.z + 160) > 40);
      c.place(197.5, -161.4, 0); c.ctrl.park = true;
      return g.cars.indexOf(c);
    });
    t0 = await drive(T, plankRoute());
    const mid = await verdict(T, t0);
    T.log('mid-air', JSON.stringify(mid));
    check(mid.kind === 'fail' && mid.reason === 'krock' && mid.flights === 0 && mid.air > 0.5, 'into a car under the flight: UNDERKÄND in the air');
    await T.sleep(3000);
    check((await T.ev(() => __game.stunts.last.t)) === mid.t, 'the rest of that flight is not judged again');
    await stopped(T);

    // 7. A parked car in the run-out: UNDERKÄND after the landing, no pay.
    await clear(T);
    await T.ev((i) => { const c = __game.cars[i]; c.repair(); c.place(205, -161.4, 0); c.ctrl.park = true; }, parked);
    c1 = await T.ev(() => __game.coins);
    t0 = await drive(T, plankRoute());
    L = await verdict(T, t0);
    await T.sleep(200);
    await T.shot('stunt_underkand');
    h = await hud(T);
    T.log('crash', JSON.stringify(L), JSON.stringify(h));
    check(L.kind === 'fail' && L.reason === 'krock' && L.id === 'planka' && L.flights === 1 && L.stamp === 'UNDERKÄND', 'into the parked car after landing: UNDERKÄND');
    check(h.banner === 'UNDERKÄND' && /\bfail\b/.test(h.bcls) && h.score.startsWith('LUFTTID ') && h.sub === 'BYGGET – DRÖMPLANET' && !h.record, `the fail stamp and card (${h.score} / ${h.sub})`);
    check((await T.ev(() => __game.coins)) === c1, 'no pay');
    await T.sleep(800);
    s = await said(T);
    const fails = s.filter(([w, l]) => w === 'stig' && l === cfg.failLine);
    check(fails.length === 1 && fails[0][2] >= mid.t && fails[0][2] < L.t, `Stig's "${cfg.failLine}" once: after the first UNDERKÄND, not again within ${cfg.failGap} s (${JSON.stringify(s)})`);
    await stop(T);
  },

  async stuntzoner(T) {
    await setup(T, '&mission=11');
    // 1. The yellow ramp at 20 m/s: onto the big ramp and off its far side, one jump of two flights.
    const c0 = await T.ev(() => __game.coins);
    let t0 = await drive(T, yellowRoute(25));
    await T.until(() => { const c = __game.playerCar; return c && c.air && c.airT > 0.2; }, 20000);
    await T.shot('stunt_gula_luft');
    let L = await verdict(T, t0);
    await T.sleep(250);
    await T.shot('stunt_gula_stampel');
    T.log('yellow', JSON.stringify(L));
    check(L.kind === 'pass' && L.id === 'gula' && L.flights === 2 && L.pay === 100, 'the yellow ramp: two flights, one jump, +100');
    check(L.air > 0.7 && L.dist > 14, `about 0.8 s and 17 m (${L.air} s, ${L.dist} m)`);
    check((await T.ev(() => __game.coins)) === c0 + 100, 'paid');
    // 2. Too slow (16 m/s): short of the big ramp, into its side: UNDERKÄND.
    await stopped(T);
    t0 = await drive(T, yellowRoute(16));
    L = await verdict(T, t0);
    T.log('yellow slow', JSON.stringify(L));
    check(L.kind === 'fail' && L.reason === 'krock' && L.id === 'gula', 'too slow: into the big ramp\'s side, UNDERKÄND');
    // 3. A hop at 6 m/s: 0.5 s but under 6 m, no verdict, the line taken down.
    const before = await T.ev(() => __game.stunts.last.t);
    t0 = await drive(T, yellowRoute(6));
    await T.until(() => { const c = __game.playerCar; return c && c.air; }, 20000);
    await T.until(() => { const c = __game.playerCar; return c && !c.air; }, 5000);
    await T.sleep(1500);
    let r = await T.ev(() => ({ t: __game.stunts.last.t, jump: !!__game.stunts.jump, score: document.getElementById('score').classList.contains('show') }));
    const hop = await T.ev(() => __apState.log.filter((q) => q[5]).length);
    T.log('hop', JSON.stringify(r), 'air steps', hop);
    check(hop > 0 && r.t === before && !r.jump && !r.score, 'a hop under 6 m: no verdict, no line');
    await stop(T);

    // 4. A garage deck: off deck 1's front edge at 14 m/s.
    r = await T.ev(async () => {
      const g = __game, m = await import('/src/world/town.js'), f = m.frameRamps[0], d = f.deck, c = Math.cos(f.yaw), s = Math.sin(f.yaw);
      const wx = (lx, lz) => d.x + lx * c + lz * s, wz = (lx, lz) => d.z - lx * s + lz * c;
      const pc = g.playerCar;
      pc.repair();
      pc.x = wx(0, -d.d / 2 + 3); pc.z = wz(0, -d.d / 2 + 3); pc.y = f.top; pc.air = false; pc.vy = 0;
      pc.yaw = f.yaw + Math.PI; pc.updateObb();
      pc.vx = Math.sin(pc.yaw) * 14; pc.vz = Math.cos(pc.yaw) * 14;
      g.cam.yaw = pc.yaw; g.cam.snapNext = true;
      return { t: g.time };
    });
    L = await verdict(T, r.t, 8000);
    T.log('garage', JSON.stringify(L));
    check(L.kind === 'pass' && L.id === 'garage' && L.pay === 100 && L.air > 0.5 && L.dist > 6, 'off a garage deck: Garagedäcket, +100');
    await T.sleep(300);
    await T.shot('stunt_garage');

    // 5. With a mission running: nothing.
    await T.startMission();
    await installAp(T);
    await clear(T);
    const last = await T.ev(() => __game.stunts.last.t);
    t0 = await drive(T, yellowRoute(25));
    await T.until(() => { const c = __game.playerCar; return c && c.air && c.airT > 0.3; }, 20000);
    r = await T.ev(() => ({ live: __game.stunts.live, jump: !!__game.stunts.jump, score: document.getElementById('score').classList.contains('show') }));
    await T.sleep(2500);
    r.t = await T.ev(() => __game.stunts.last.t);
    T.log('mission', await T.state(), JSON.stringify(r));
    check(!r.live && !r.jump && !r.score && r.t === last, 'a mission running: no counter, no verdict');
    await stop(T);

    // 6. Before fataga (index 9): GODKÄND.
    await setup(T, '&mission=9');
    t0 = await drive(T, yellowRoute(25));
    L = await verdict(T, t0);
    await T.sleep(250);
    await T.shot('stunt_godkand');
    const h = await hud(T);
    T.log('before fataga', JSON.stringify(L), JSON.stringify(h));
    check(L.kind === 'pass' && L.stamp === 'GODKÄND' && h.banner === 'GODKÄND', 'before fataga the stamp says GODKÄND');
    await stop(T);

    // 7. The flight level: inert.
    await T.fresh('&mission=1');
    r = await T.ev(() => ({ live: __game.stunts.live, jump: __game.stunts.jump }));
    check(!r.live && !r.jump, 'the flight level: inert');
  },
};
