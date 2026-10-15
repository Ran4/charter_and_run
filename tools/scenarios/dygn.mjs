// Dygnet runt – the island's clock, its evenings and the nap in room 107 (free roam, DESIGN §10.10;
// feature 30): dygn.
//   dygn: in test mode the clock holds at 15:00 (day palette, no writes); run, it goes an hour a
//         minute by day and twice as fast at night (× timeScale); the sky at noon, the sunset, the
//         dusk of 20:10 (between sunset and night, the night lights and the lighthouse lit), night,
//         dawn and morning; Ole's watch under the pesetas once found (20:10 SPANSK TID, 21:10 norsk ·
//         21:10 svensk), the collectibles card under it; the bed's "Kvarta en stund" (not in a
//         pursuit, a car or a mission): black, the clock to the next part of the day, Stig on his
//         back on his bed, Ole beside it with his calculator up and the PIP, "Zzz…", Stig up at the
//         bed's foot, the toast; Ole stays by the bed until Stig is 50 m off; with Ole as the waiting
//         mission's giver he is back at his place after the nap; a mission talked to at night starts
//         the next morning (NÄSTA MORGON, 09:00, day palette) and the clock stands still while it
//         runs; an abort hands the sky back; the grisfest's MORGONEN EFTER sets 08:00; the chatter
//         lines with a time of day.
import { check } from '../lib.mjs';

const PI = Math.PI;
// Every line said through game.say since the last reset, as [speaker, text].
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    window.__said = [];
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([typeof t === 'string' ? t : (t === g.player ? 'stig' : t.key || 'ped'), text]); return o(t, text, secs); };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const has = (s, who, text) => s.some(([w, t]) => w === who && t === text);
// The clock and what the world shows: the sky top's linear r + g + b, fog, sun, the town's night
// glow drawn (its draw range after the last render), the lighthouse lantern shown.
const sky = (T) => T.ev(() => {
  const g = __game, sc = g.scene, top = sc.children.find((o) => o.material?.uniforms?.top)?.material.uniforms.top.value;
  const glow = sc.getObjectByName('nightGlow');
  let lantern = null;
  sc.traverse((o) => { if (o.isMesh && o.geometry?.type === 'CylinderGeometry' && o.geometry.parameters.radiusTop === 1.64 && o.material?.color?.getHex() === 0xfff0b0) lantern = o; });
  return { h: +g.day.h.toFixed(4), sky: g.sky, top: top ? +(top.r + top.g + top.b).toFixed(3) : null, fogNear: Math.round(sc.fog.near), sunI: +sc.children.find((o) => o.isDirectionalLight).intensity.toFixed(2),
    glow: glow ? glow.geometry.drawRange.count > 0 : null, lantern: lantern ? lantern.visible : null, lit: g.day.lit() };
});
const setH = async (T, h) => { await T.ev((h) => __game.day.set(h), h); await T.frames(4); };
const clockText = (T) => T.ev(() => {
  const e = document.getElementById('klocka'), r = e.getBoundingClientRect();
  return { show: e.classList.contains('show'), over: e.classList.contains('over'), main: e.querySelector('.k-main').textContent, zone: e.querySelector('.k-zone').textContent, sub: e.querySelector('.k-sub').textContent, opacity: getComputedStyle(e).opacity, rect: [r.left, r.top, r.right, r.bottom].map(Math.round) };
});
// The player on foot at (x, z) facing yaw, the camera behind him.
const stand = (T, x, z, yaw) => T.ev((x, z, yaw) => {
  const g = __game;
  if (g.playerCar) g.exitCar(true);
  g.player.state = 'normal';
  g.player.teleport(x, z, yaw);
  g.cam.yaw = yaw; g.cam.snapNext = true;
}, x, z, yaw);
const prompt = (T) => T.ev(() => document.getElementById('prompt').textContent);
const oleAt = (T) => T.ev(() => { const n = __game.npcs.ole; return { x: +n.x.toFixed(2), z: +n.z.toFixed(2), busy: n.busy, calc: n.anim.calc, state: n.state }; });

// The nap from the foot of the bed: E, then until it is over (shots on the way when `name`).
async function nap(T, name = null) {
  await stand(T, -19.6, -18.6, PI);
  await T.frames(6);
  const pr = await prompt(T);
  await resetSaid(T);
  await T.tap('KeyE');
  await T.until(() => __game.day.napping, 5000);
  let mid = null;
  if (name) {
    await T.until(() => __game.day.spinH != null, 5000);
    await T.sleep(300);
    mid = { spin: await clockText(T), banner: await T.ev(() => document.querySelector('#banner .banner-main').textContent) };
    await T.shot(name + '_svart');
    await T.until(() => __game.npcs.ole.anim.calc || !__game.day.napping, 15000);
    await T.sleep(500);
    mid = { ...mid, player: await T.ev(() => { const p = __game.player; return { state: p.state, y: +p.y.toFixed(2), x: +p.x.toFixed(2), z: +p.z.toFixed(2), letterbox: document.getElementById('letterbox').classList.contains('on') }; }), ole: await oleAt(T) };
    await T.shot(name);
  }
  await T.until(() => !__game.day.napping, 20000);
  await T.frames(4);
  return { prompt: pr, mid, said: await said(T), last: await T.ev(() => __game.day.last) };
}

export const SCENARIOS = {
  async dygn(T) {
    // Ropavieja waits (giver Siv at the pool, Majsan its extra): Ole is not needed by it.
    await T.fresh('&mission=9');
    await T.frames(10);

    // --- Test mode holds the clock at 15:00, and nothing is written over the day palette.
    const s0 = await sky(T);
    await T.sleep(1500);
    const s1 = await sky(T);
    T.log('held', JSON.stringify(s0), JSON.stringify(s1));
    check(s0.h === 15 && s1.h === 15 && !(await T.ev(() => __game.day.run)), 'test mode: the clock holds at 15:00');
    check(s1.sky === 'day' && s1.top > 1 && s1.fogNear === 220 && s1.glow === false && s1.lantern === false, 'test mode: the day palette, no night lights');

    // --- Running: an hour a minute by day, two at night (× timeScale 3).
    const rate = async (h0) => {
      await setH(T, h0);
      const a = await T.ev(() => { const g = __game; g.day.run = true; return { h: g.day.h, t: g.time }; });
      await T.sleep(2500);
      const b = await T.ev(() => { const g = __game; g.day.run = false; return { h: g.day.h, t: g.time, ts: g.timeScale }; });
      return +(((b.h - a.h + 24) % 24) / ((b.t - a.t) * b.ts) * 3600).toFixed(1);   // clock hours per hour of scaled time
    };
    const dayRate = await rate(11), nightRate = await rate(23);
    T.log('rate', dayRate, nightRate);
    check(Math.abs(dayRate - 60) < 3, `by day an hour a minute (${dayRate} h per scaled hour, 60 expected)`);
    check(Math.abs(nightRate - 120) < 6, `at night twice as fast (${nightRate}, 120 expected)`);

    // --- The sky through the day (a running clock writes the blend; set() writes it at once).
    const at = {};
    for (const h of [12, 19.4, 19.75, 20.1667, 21, 23, 6.25, 6.75, 8]) { await setH(T, h); at[h] = await sky(T); }
    T.log('sky', JSON.stringify(at));
    check(at[12].sky === 'day' && at[12].top > 1 && !at[12].glow && !at[12].lantern, '12:00 day, unlit');
    check(at[19.4].top < 1 && at[19.4].top > 0.472 && !at[19.4].glow && !at[19.4].lantern, '19:24 day gliding into the sunset, still unlit');
    check(Math.abs(at[19.75].top - 0.472) < 0.01 && at[19.75].sky === 'sunset' && !at[19.75].glow, '19:45 the sunset palette, unlit');
    check(at[20.1667].top < 0.472 && at[20.1667].top > 0.063 && at[20.1667].glow && at[20.1667].lantern && at[20.1667].sky === 'night', '20:10 dusk between sunset and night, the night lights and the lighthouse lit');
    check(at[21].fogNear === 120 && at[21].glow && at[21].lantern && at[23].sky === 'night', '21:00 and 23:00 night, lit');
    check(at[6.25].top > 0.063 && at[6.25].top < 1 && at[6.25].glow, '06:15 dawn, still lit');
    check(at[6.75].top > at[6.25].top && !at[6.75].glow && !at[6.75].lantern, '06:45 lighter, the lights off');
    check(at[8].sky === 'day' && at[8].fogNear === 220 && !at[8].glow, '08:00 day');

    // --- Ole's watch: hidden until found, then under the pesetas with the collectibles card below.
    await setH(T, 20.1667);
    const c0 = await clockText(T);
    await T.ev(() => { __game.collected.prylar.add('klocka'); });
    await T.frames(4);
    const c1 = await clockText(T);
    await T.ev(() => { const e = document.getElementById('collect'); e.innerHTML = '<span class="pryl-icon"></span> Oles prylar <b>1/7</b>'; e.classList.add('show'); });
    await T.sleep(700);
    const col = await T.ev(() => { const r = document.getElementById('collect').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); });
    await T.shot('dygn_hud');
    T.log('clock', JSON.stringify(c0), JSON.stringify(c1), JSON.stringify(col));
    check(!c0.show && c1.show, 'the watch shows the clock only once found');
    check(c1.main === '20:10' && c1.zone === 'SPANSK TID' && c1.sub === '21:10 norsk · 21:10 svensk', 'the clock: 20:10 SPANSK TID, 21:10 norsk · 21:10 svensk');
    check(col[1] >= c1.rect[3], 'the collectibles card sits under the clock');
    // The beach at dusk, looking west along it to the lighthouse (feature image 2).
    {
      const p = await T.L('playa'), f = await T.L('fyren');
      const yaw = Math.atan2(f.x - p.x, f.z - p.z);
      await stand(T, p.x + 6, p.z - 2, yaw);
      await T.ev(() => document.getElementById('collect').classList.remove('show'));
      await T.frames(30);
      await T.shot('dygn_strand_2010');
      await setH(T, 19.5);
      await T.frames(20);
      await T.shot('dygn_strand_1930');
      await setH(T, 23);
      await T.frames(20);
      await T.shot('dygn_strand_2300');
      await setH(T, 6.4);
      await T.frames(20);
      await T.shot('dygn_strand_0624');
    }
    // The pool and the hotel at dusk and at night.
    {
      const l = await T.L('flamencoPool');
      await stand(T, l.x, l.z + 6, PI);
      await setH(T, 20.25);
      await T.frames(30);
      await T.shot('dygn_flamenco_2015');
      const pz = await T.L('plaza');
      await stand(T, pz.x, pz.z + 10, PI);
      await setH(T, 22);
      await T.frames(30);
      await T.shot('dygn_plaza_2200');
      await T.ev(() => { const g = __game; g.aerial = true; });
      await T.frames(20);
      await T.shot('dygn_aerial_2200');
      await T.ev(() => { const g = __game; g.aerial = false; g.cam.snapNext = true; });
    }

    // --- The room by day, then the nap: 15:00 → kvällen (20:00).
    await setH(T, 15);
    await stand(T, -18, -14.5, PI);
    await T.frames(20);
    await T.shot('dygn_rum107_dag');
    const n1 = await nap(T, 'dygn_nap_kvall');
    const after = await T.ev(() => { const g = __game, p = g.player; return { h: g.day.h, sky: g.sky, state: p.state, x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), yaw: +p.yaw.toFixed(2), inDialog: g.inDialog, letterbox: document.getElementById('letterbox').classList.contains('on'), toasts: [...document.querySelectorAll('#toasts .toast')].map((t) => t.textContent) }; });
    const ole1 = await oleAt(T);
    T.log('nap1', JSON.stringify(n1), JSON.stringify(after), JSON.stringify(ole1));
    check(n1.prompt.includes('Kvarta en stund'), `the bed's prompt: "${n1.prompt}"`);
    check(n1.last?.kind === 'nap' && n1.last.from === 15 && n1.last.to === 20 && n1.last.part === 'kvällen' && n1.last.ole && n1.last.pips === 2, 'the nap: 15:00 to 20:00 (kvällen), Ole there, two PIPs');
    check(n1.mid?.player.state === 'down' && n1.mid.player.y > 0.6 && Math.abs(n1.mid.player.x + 19.75) < 0.1 && n1.mid.player.letterbox, 'Stig on his back on his bed, letterboxed');
    check(n1.mid?.ole.calc && Math.abs(n1.mid.ole.x + 18.75) < 0.3 && Math.abs(n1.mid.ole.z + 20.55) < 0.3, 'Ole at the head of the bed with his calculator up');
    check(n1.mid?.spin.show && n1.mid.spin.over && n1.mid.spin.opacity === '1' && n1.mid.banner === 'ZZZ…', 'in the dark: the banner ZZZ… and Ole\'s watch spinning on over the fade');
    check(has(n1.said, 'ole', 'PIP-PIP-PIP! Kalkulator – med vekkerklokke!') && n1.said.filter(([w, t]) => w === 'stig' && t === 'Zzz…').length === 2, 'Ole: "PIP-PIP-PIP! Kalkulator – med vekkerklokke!", Stig "Zzz…" twice');
    check(!has(n1.said, 'ole', 'Morn, gutten min!'), 'not julafton\'s "Morn, gutten min!"');
    check(after.h === 20 && after.state === 'normal' && Math.abs(after.y - 0.15) < 0.05 && Math.abs(after.z + 18.8) < 0.3 && !after.inDialog && !after.letterbox, 'Stig up at the foot of the bed, free again at 20:00');
    check(after.toasts.includes('Stig kvartade till kvällen.'), 'the toast: "Stig kvartade till kvällen."');
    check(!ole1.busy && Math.abs(ole1.x + 18.75) < 0.5, 'Ole let go but still by the bed (Stig is near)');
    await T.frames(30);
    await T.shot('dygn_rum107_efter');
    // From the patio at dusk, the clock up.
    await stand(T, -18, -9, PI);
    await T.frames(20);
    await T.shot('dygn_patio_2000');
    // 50 m off, Ole goes home (placeNpcs never pops anyone in front of him).
    await stand(T, -18, 60, 0);
    await T.frames(10);
    const ole2 = await oleAt(T);
    T.log('ole home', JSON.stringify(ole2));
    check(Math.hypot(ole2.x + 6, ole2.z + 9) < 1, 'Ole back at his place under the pergola once Stig is 50 m off');

    // --- Next naps: 20:00 → natten (23:00, his warm-night line), 23:00 → morgonen (08:00).
    const n2 = await nap(T, 'dygn_nap_natt');
    check(n2.last?.to === 23 && n2.last.part === 'natten' && has(n2.said, 'stig', 'Vad härligt det är med de här varma nätterna…'), 'the nap at 20:00 wakes at 23:00 (natten) with his warm-night line');
    const n3 = await nap(T);
    check(n3.last?.to === 8 && n3.last.part === 'morgonen' && (await T.ev(() => __game.sky)) === 'day', 'the nap at 23:00 wakes at 08:00 (morgonen), day');

    // --- No nap in a pursuit, in a car or with a mission running.
    await setH(T, 15);
    await stand(T, -19.6, -18.6, PI);
    await T.frames(4);
    const blocked = await T.ev(() => {
      const g = __game, out = { free: g.day.canNap() };
      g.shame.startPursuit(); out.pursuit = g.day.canNap(); g.shame.endPursuit(false); g.shame.clear();
      const car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && c.spec.len < 5);
      g.enterCar(car); out.car = g.day.canNap(); g.exitCar(true);
      g.player.teleport(-19.6, -18.6, Math.PI);
      return out;
    });
    T.log('blocked', JSON.stringify(blocked));
    check(blocked.free && !blocked.pursuit && !blocked.car, 'the bed: yes on foot, no in a pursuit, no in a car');

    // --- Chatter tied to the time of day (only while the clock runs).
    const lines = await T.ev(() => {
      const d = __game.day, ok = (h, t) => { d.h = h; return d.lineOk(t); };
      d.run = true;
      const r = { natt15: ok(15, 'Natturen går klockan nio!'), natt18: ok(18, 'Natturen går klockan nio!'), frisk8: ok(8, 'Friskoteket börjar halv tio varje morgon.'), frisk15: ok(15, 'Friskoteket börjar halv tio varje morgon.'), tre15: ok(15, 'Klockan är tre spansk tid.'), tre22: ok(22, 'Klockan är tre spansk tid.'), other: ok(3, 'Hä-pååre!') };
      d.run = false; r.held = ok(3, 'Natturen går klockan nio!');
      d.set(15);
      return r;
    });
    T.log('chatter', JSON.stringify(lines));
    check(!lines.natt15 && lines.natt18 && lines.frisk8 && !lines.frisk15 && lines.tre15 && !lines.tre22 && lines.other && lines.held, 'Gabbe\'s night tour in the evening, Lasse\'s friskotek in the morning and his three o\'clock in the afternoon');

    // --- A mission at night starts the next morning; the clock stands still while it runs; an
    // abort hands the sky back.
    await setH(T, 22.5);
    await T.ev(() => { const g = __game; g.day.run = true; });
    await resetSaid(T);
    const seen = T.until(() => document.querySelector('#banner .banner-main').textContent === 'NÄSTA MORGON' && document.getElementById('fade').classList.contains('on'), 20000).then(() => true, () => false);
    await T.startMission();
    const sawBanner = await seen;
    await T.until(() => __game.missions.state === 'running', 30000);
    const m0 = await sky(T);
    await T.sleep(2000);
    const m1 = await sky(T);
    const last = await T.ev(() => __game.day.last);
    T.log('morning', sawBanner, JSON.stringify(last), JSON.stringify(m0), JSON.stringify(m1));
    check(sawBanner && last?.kind === 'morning' && last.from > 22.4 && last.to === 9, 'a mission talked to at 22:30: black, NÄSTA MORGON, the clock to 09:00');
    check(m0.sky === 'day' && m0.top > 1 && !m0.glow && !m0.lantern && m0.fogNear === 220, 'the mission runs in the day palette, unlit');
    check(m0.h === 9 && m1.h === 9, 'the clock stands still while the mission runs');
    await T.ev(() => { const g = __game; g.missions.abort(); });
    await T.frames(6);
    const ab = await sky(T);
    check(ab.sky === 'day' && ab.h > 9 - 1e-6 && ab.h < 9.2, 'after an abort: free roam again at 09:00, day');
    await T.ev(() => { __game.day.run = false; });

    // --- The grisfest's MORGONEN EFTER: the clock to eight.
    await setH(T, 15);
    const gris = await T.ev(() => { const g = __game, d = window.__missions().find((m) => m.id === 'grisfest'); d.onEnd(g, 'complete'); return { h: g.day.h, sky: g.sky }; });
    check(gris.h === 8 && gris.sky === 'day', 'grisfest onEnd: MORGONEN EFTER sets the clock to 08:00, day');
  },

  // With Ole the waiting mission's giver (asnan, at `flamenco`) a nap ends in the dark and he is back
  // at the giver's place, not by the bed.
  async dygnGiver(T) {
    await T.fresh('&mission=7');
    await T.frames(10);
    const n = await nap(T);
    const o = await oleAt(T), at = await T.L('flamenco');
    T.log('giver nap', JSON.stringify(n.last), JSON.stringify(o));
    check(n.last?.kind === 'nap' && n.last.ole, 'the nap with Ole as the giver');
    check(Math.hypot(o.x - at.x, o.z - at.z) < 1.5, 'Ole back at his giver place after the nap');
  },
};
