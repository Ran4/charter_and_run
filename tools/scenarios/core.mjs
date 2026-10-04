// Core scenarios (Phase 0; Phase 2 owns them): start walk aerial drive traffic title talk missions
// views transition story, plus `levels` (the game boots into both levels).
import { check } from '../lib.mjs';
import { M_FLIGHT } from '../story/flight.mjs';
import { M_ISLAND } from '../story/island.mjs';

const ISLAND = '&mission=6';

export const SCENARIOS = {
  async start(T) {
    await T.frames(30);
    T.log('fps ~', await T.fps());
    T.log('stats', JSON.stringify(await T.ev(() => window.__stats())));
    T.log('level', await T.ev(() => `${__game.level} phase=${__game.cabin.phase} player=${__game.player.x.toFixed(1)},${__game.player.z.toFixed(1)}`));
    await T.shot('start');
  },

  async walk(T) {
    // Flight (gate lounge): walk, Space = hold, J = mantra.
    await T.hold(['KeyW'], 1200);
    await T.shot('walk_0');
    await T.tap('Space');
    await T.frames(8);
    await T.shot('walk_hold');
    await T.page.keyboard.down('KeyJ');
    await T.frames(30);
    T.log('mantra', await T.ev(() => `on=${__game.mantraOn} wings=${__game.player.anim.wings}`));
    await T.shot('walk_mantra');
    await T.page.keyboard.up('KeyJ');
    // Island: walk, jump, kick.
    await T.fresh(ISLAND);
    await T.hold(['KeyW'], 1200);
    await T.shot('walk_island');
    await T.tap('Space');
    await T.frames(8);
    await T.shot('walk_jump');
    await T.tap('KeyJ');
    await T.frames(6);
    await T.shot('walk_kick');
  },

  async aerial(T) {
    await T.fresh(ISLAND);
    await T.ev(() => { __game.aerial = true; });
    await T.frames(10);
    await T.shot('aerial');
    await T.fresh();
    await T.ev(() => { __game.aerial = true; });
    await T.frames(10);
    await T.shot('aerial_flight');
  },

  async drive(T) {
    await T.fresh(ISLAND);
    await T.ev(() => { const g = __game, c = g.named.hyrbil, p = g.player; const e = g.exitSpot(c, 1); p.teleport(e.x, e.z, c.yaw); });
    await T.frames(5);
    await T.tap('KeyE');
    await T.frames(10);
    const inCar = await T.ev(() => __game.playerCar?.name || null);
    T.log('in car', inCar);
    check(inCar === 'hyrbil', 'player is in the hyrbil');
    await T.shot('drive_0');
    await T.hold(['KeyW'], 1500);
    await T.shot('drive_1');
    await T.hold(['KeyW', 'KeyD'], 1200);
    await T.shot('drive_2');
    await T.hold(['KeyW'], 2500);
    T.log('car', JSON.stringify(await T.ev(() => { const c = __game.playerCar; return { x: c.x.toFixed(1), z: c.z.toFixed(1), v: c.speed.toFixed(1), hp: c.hp.toFixed(0) }; })));
    await T.shot('drive_3');
  },

  // Let traffic run for a minute and report cars that have stopped moving.
  async traffic(T) {
    await T.fresh(ISLAND);
    const snap = () => T.ev(() => __game.cars.filter((c) => c.traffic && !c.dead).map((c) => ({ id: c.id, x: c.x, z: c.z, v: c.speed, bus: !!c.spec.bus })));
    await T.sleep(30000);
    const b = await snap();
    await T.sleep(30000);
    const c = await snap();
    let stuck = 0;
    for (const q of c) {
      const p = b.find((o) => o.id === q.id);
      if (p && Math.hypot(p.x - q.x, p.z - q.z) < 5) { stuck++; T.log('stuck car at', q.x.toFixed(0), q.z.toFixed(0), 'v', q.v.toFixed(1)); }
    }
    const buses = c.filter((q) => q.bus).length;
    T.log('traffic cars', c.length, 'stuck', stuck, 'buses', buses, 'avg speed', (c.reduce((s, q) => s + q.v, 0) / c.length).toFixed(1));
    T.log('fps', await T.fps());
    await T.ev(() => { __game.aerial = true; });
    await T.frames(5);
    await T.shot('traffic_aerial');
    await T.ev(() => { __game.aerial = false; });
    await T.tap('KeyM');
    await T.frames(12);
    await T.shot('bigmap');
    check(buses <= 1, 'at most one bus in traffic');
    check(stuck <= 2, 'at most two stuck cars');
  },

  // The title card: a fresh save orbits the cabin (gate phase, snow); mission 6 orbits Flamenco.
  async title(T) {
    for (const [q, name, level] of [['', 'title', 'flight'], [ISLAND, 'title_island', 'island']]) {
      await T.page.goto(`http://127.0.0.1:${T.port}/index.html?fresh=1${q}`, { waitUntil: 'load' });
      await T.page.waitForFunction('window.__ready === true', { timeout: 120000 });
      await T.sleep(1500);
      const lv = await T.ev(() => __game.level);
      T.log('title level', lv);
      check(lv === level, `title boots into ${level}`);
      await T.shot(name);
    }
  },

  async talk(T) {
    await T.ev(() => { const g = __game; g.autoDialog = false; const s = g.approachSpot('gateQueue'); g.debugWarp(s.x, s.z, s.yaw); });
    await T.frames(5);
    await T.tap('KeyE');
    await T.frames(40);
    check(await T.ev(() => __game.missions.state === 'intro'), 'talking to Ole starts the intro');
    await T.shot('talk_0');
    await T.tap('Space'); await T.frames(10); await T.tap('Space'); await T.frames(30);
    await T.shot('talk_1');
  },

  // Every mission boots in its level with its giver near `at`; mission 1 has the cast seated;
  // data checks over every mission def.
  async missions(T) {
    const n = await T.ev(() => __game.missions.count);
    for (let k = 0; k < n; k++) {
      await T.fresh(`&mission=${k}`);
      const r = await T.ev(() => {
        const g = __game, d = g.missions.current, giver = g.npc(d.giver), at = window.__lm(d.at);
        return { level: g.level, want: g.levelFor(g.missions.index), id: d.id, giver: d.giver, hidden: giver.state === 'hidden', d: Math.hypot(giver.x - at.x, giver.z - at.z) };
      });
      T.log(`mission ${k} ${r.id}: level ${r.level} giver ${r.giver} ${r.d.toFixed(1)} m from at`);
      check(r.level === r.want, `mission ${k} boots in ${r.want}`);
      check(!r.hidden && r.d < 40, `mission ${k} giver ${r.giver} visible within 40 m of at`);
      if (k === 1) {
        const s = await T.ev(() => ({ ole: __game.cabin.seatOf(__game.npc('ole')), majsan: __game.cabin.seatOf(__game.npc('majsan')) }));
        T.log('ombord seats', JSON.stringify(s));
        check(s.ole === '14A' && s.majsan === '16E', 'ombord: Ole in 14A and Majsan in 16E from the start');
      }
    }
    // Data checks: every key resolves, every far checkpoint has retryAt.
    const bad = await T.ev(() => {
      const g = __game, out = [];
      const keyOk = (k) => k === 'stig' || !!g.npc(k);
      for (const d of window.__missions()) {
        const keys = [d.giver, ...(d.extra || []).map((e) => (Array.isArray(e) ? e[0] : e)), ...Object.keys(d.outroPlace || {}),
          ...[...(d.intro || []), ...(d.outro || [])].map((l) => l[0])];
        d.stages.forEach((f, i) => {
          const o = f().o || {};
          keys.push(...Object.keys(o.place || {}), ...(o.frame || []), ...Object.keys(o.findAt || {}), ...Object.keys(o.standAt || {}), ...Object.keys(o.sendTo || {}));
          if (o.who) keys.push(...(Array.isArray(o.who) ? o.who : [o.who]));
          if (o.duet) keys.push(o.duet);
          if (o.checkpoint && !o.retryAt) {
            const at = window.__lm(d.at), to = o.to || o.at || o.near;
            const l = typeof to === 'string' ? window.__lm(to) : null;
            if (l && Math.hypot(l.x - at.x, l.z - at.z) > 60) out.push(`${d.id} stage ${i}: checkpoint > 60 m from at without retryAt`);
          }
        });
        for (const k of keys) if (k && !keyOk(k)) out.push(`${d.id}: unknown character '${k}'`);
      }
      return out;
    });
    for (const b of bad) T.log('data:', b);
    check(!bad.length, 'mission data checks');
  },

  // Every island map-label landmark (or VIEWS=a,b), one shot each from 14 m out / 6 m up.
  async views(T) {
    await T.fresh(ISLAND);
    const list = process.env.VIEWS ? process.env.VIEWS.split(',') : await T.ev(() => __game.levelDef.labels().map((l) => l[1]));
    for (const l of list) {
      const ok = await T.ev((l) => {
        const g = __game;
        if (!window.__lm || !(() => { try { return window.__lm(l); } catch (e) { return null; } })()) return false;
        const m = window.__lm(l);
        g.player.teleport(m.x, m.z, m.yaw);
        g.cutTo({ at: l, dist: 14, height: 6 });
        return true;
      }, l);
      if (!ok) { T.log('views: missing landmark', l); continue; }
      await T.frames(20);
      await T.shot('view_' + l);
      await T.ev(() => __game.endCut());
    }
  },

  // The handover: play mission 4 (landning) and arrive at the airport on the island.
  async transition(T) {
    await T.fresh('&mission=4');
    await M_FLIGHT[4](T);
    const r = await T.ev(() => {
      const g = __game, a = window.__lm('airport'), l = g.npc('lasse');
      return { level: g.level, dp: Math.hypot(g.player.x - a.x, g.player.z - a.z), dl: Math.hypot(l.x - a.x, l.z - a.z), outfit: g.player.outfit };
    });
    T.log('transition', JSON.stringify(r));
    await T.shot('transition');
    check(r.level === 'island', 'level is island after landning');
    check(r.dp < 20, 'player within 20 m of the airport');
    check(r.dl < 20, 'Lasse waits at the airport');
  },

  // Exit criterion of Phase 0a: the game boots into both levels at the right place.
  async levels(T) {
    // Mission 0: the gate.
    await T.fresh('&mission=0');
    const a = await T.ev(() => {
      const g = __game, p = g.player, s = window.__lm('gateStart');
      const homes = g.levelDef.homes(g), out = [];
      for (const [k, h] of Object.entries(homes)) {
        const n = g.npc(k);
        if (h === null) { if (n.state !== 'hidden') out.push(`${k} should be hidden`); continue; }
        if (!Array.isArray(h)) continue;
        const at = k === g.missions.current.giver ? g.lmOffset(g.missions.current.at, 0, 0) : g.lmOffset(h[0], h[1], h[2]);
        const d = Math.hypot(n.x - at.x, n.z - at.z);
        if (n.state === 'hidden' || d > 1.5) out.push(`${k} ${n.state} ${d.toFixed(1)} m from home`);
      }
      return { level: g.level, phase: g.cabin.phase, d: Math.hypot(p.x - s.x, p.z - s.z), inside: g.cabin.inside(p.x, p.z), out, outfit: p.outfit };
    });
    T.log('mission 0', JSON.stringify(a));
    await T.shot('level_gate');
    check(a.level === 'flight' && a.phase === 'gate', 'mission 0: flight level, phase gate');
    check(a.d < 3 && a.inside, 'mission 0: player near gateStart, inside the flight bounds');
    check(!a.out.length, 'mission 0: cast per HOMES.gate');
    // Mission 3: the cabin in cruise, Ole in 14A.
    await T.fresh('&mission=3');
    const b = await T.ev(() => {
      const g = __game, p = g.player, ole = g.npc('ole'), s = g.cabin.seats['14A'];
      const v = new (ole.root.position.constructor)();
      ole.root.getWorldPosition(v);
      return { level: g.level, phase: g.cabin.phase, inCabin: g.cabin.inCabin(p.x, p.z), seat: g.cabin.seatOf(ole), dRoot: Math.hypot(v.x - s.x, v.z - s.z), camY: g.cam.cam.position.y };
    });
    T.log('mission 3', JSON.stringify(b));
    await T.shot('level_cabin');
    check(b.level === 'flight' && b.phase === 'cruise', 'mission 3: flight level, phase cruise');
    check(b.inCabin, 'mission 3: player in the cabin');
    check(b.seat === '14A' && b.dRoot < 0.5, 'mission 3: Ole seated in 14A');
    // Mission 6: the island near Hotel Flamenco.
    await T.fresh(ISLAND);
    const c = await T.ev(() => {
      const g = __game, p = g.player, f = window.__lm('flamenco');
      return { level: g.level, d: Math.hypot(p.x - f.x, p.z - f.z), outfit: p.outfit };
    });
    T.log('mission 6', JSON.stringify(c));
    await T.shot('level_island');
    check(c.level === 'island' && c.d < 10, 'mission 6: island, near flamenco');
  },

  // The whole story via debug warps (FROM / TO env: start at / stop before a mission index).
  async story(T) {
    const M = [...M_FLIGHT, ...M_ISLAND];
    const from = +(process.env.FROM || 0);
    const to = process.env.TO !== undefined ? +process.env.TO : M.length;
    if (from) await T.fresh(`&mission=${from}`);
    try {
      for (let k = from; k < to; k++) await M[k](T);
    } finally {
      T.story = { expect: to, index: await T.ev(() => __game.missions.index) };
    }
  },
};
