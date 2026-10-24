// Prata med gänget – E talks to the gang (free roam, DESIGN §10.28; feature 39): prata.
//   prata: the table (2–4 lines an exchange, its speakers the person, Stig or a `with`, known missions
//          in the windows, nothing for Angerud after the end, no ä or ö in Ole's lines, no line a
//          chatter line, a source tag on every line in the file); who can be talked to at every island
//          index (5–13), and every exchange playable somewhere; at index 9 by Ole under the pergola:
//          "E Prata med Ole", E (a real key) plays the Rio exchange in order, Stig turned to him, no
//          prompt, no chatter and no inDialog while it runs, the neighbours quiet after it; E again the
//          donkey, then Rio again; the watch with the clock's times once the klocka is found; the
//          morning one only at 08:00; Robban's customs with Berra's answer; walking off stops it; a
//          mission start takes its bubbles down; Siv, the giver, keeps her talk; at index 12 Majsan's
//          julfest at the pool and no chat with Ole (the giver); after the end Berra's "Ska du ha?" at
//          the bodega, Lasse's oath with the oath pose, Ole's mantra with the wings, no Angerud; the
//          flight level inert. Shots prata_*.
import fs from 'fs';
import path from 'path';
import { check, ROOT } from '../lib.mjs';

// Every line said through game.say since the last reset, as [speaker key, text, game time].
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.key || '?', text, +g.time.toFixed(2)]); return o(t, text, secs); };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
// Stig on foot `d` m from `key` on a free spot at their height (not in the pool), facing them, the
// camera turned `cam` rad off his back; `avoid`: a key to keep more than 3.6 m from (a giver).
async function by(T, key, { d = 1.7, cam = 0.75, avoid = null } = {}) {
  const ok = await T.ev(async (key, d, cam, avoid) => {
    const g = __game, n = g.npc(key), p = g.player, C = await import('/src/world/collision.js');
    if (g.playerCar) g.exitCar(true);
    const av = avoid ? g.npc(avoid) : null;
    for (let k = 0; k < 24; k++) {
      const a = n.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 12);
      const x = n.x + Math.sin(a) * d, z = n.z + Math.cos(a) * d;
      const gy = C.groundAt(x, z, n.y + 0.2, 0.45);
      if (!g.spotFree(x, z, n.y) || Math.abs(gy - n.y) > 0.25 || C.waterAt(x, z, gy)) continue;
      if (av && Math.hypot(av.x - x, av.z - z) < 3.6) continue;
      // Nobody else of the cast within 2.2 m (Majsan's sun cream, 1.8 m, is an interactable).
      if (Object.values(g.npcs).some((m) => m !== n && m.state !== 'hidden' && Math.hypot(m.x - x, m.z - z) < 2.2)) continue;
      p.state = 'normal';
      g.debugWarp(x, z, Math.atan2(n.x - x, n.z - z));
      p.vx = p.vz = 0;
      g.cam.yaw = p.yaw + cam; g.cam.snapNext = true;
      return true;
    }
    return false;
  }, key, d, cam, avoid);
  check(ok, `a spot by ${key}`);
  await T.frames(6);
}
// The chase camera turned round Stig to where it stands furthest from him (a narrow alley squeezes it).
async function roomyCam(T) {
  let best = null;
  for (const off of [0, 0.5, -0.5, 0.9, -0.9, 1.4, -1.4, 2.2, -2.2]) {
    await T.ev((off) => { const g = __game; g.cam.yaw = g.player.yaw + off; g.cam.snapNext = true; }, off);
    await T.frames(3);
    const d = await T.ev(async () => { const { camera } = await import('/src/gfx.js'), p = __game.player; return Math.hypot(camera.position.x - p.x, camera.position.z - p.z); });
    if (!best || d > best.d + 0.05) best = { off, d };
  }
  await T.ev((off) => { const g = __game; g.cam.yaw = g.player.yaw + off; g.cam.snapNext = true; }, best.off);
  await T.frames(3);
}
const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? { type: it.type, who: it.who?.key ?? null } : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt')?.textContent || '');
const chatLast = (T) => T.ev(() => __game.chat.last && JSON.parse(JSON.stringify(__game.chat.last)));
// E on the person nearest, then the chain to its end (or `ms`).
async function talk(T, ms = 20000) {
  await T.tap('KeyE');
  check(await T.ev(() => __game.chat.busy), 'E starts a talk');
  await T.until(() => !__game.chat.busy, ms);
  return chatLast(T);
}
const linesOf = (T, key, id) => T.ev((key, id) => __game.chat.cfg.people[key].find((e) => e.id === id).lines.map(([w, t]) => [w, t]), key, id);

export const SCENARIOS = {
  async prata(T) {
    // ---- 1. The table, in the page and in the file.
    await T.fresh('&mission=9');
    await resetSaid(T);
    let r = await T.ev(async () => {
      const g = __game, c = g.chat.cfg, C = await import('/src/content/index.js'), out = { bad: [], count: 0, people: 0 };
      const chatter = new Set();
      for (const t of [C.CHATTER, C.CHATTER_FLIGHT, ...Object.values(C.UNLOCKS).map((u) => u.chatter || {})]) for (const l of Object.values(t)) for (const s of l) chatter.add(s);
      for (const [key, list] of Object.entries(c.people)) {
        out.people++;
        const ids = new Set();
        for (const ex of list) {
          out.count++;
          const w = g.chat.win.get(ex), who = new Set(['stig', key, ...(ex.with || [])]);
          if (ids.has(ex.id)) out.bad.push(`${key}.${ex.id}: id twice`);
          ids.add(ex.id);
          if (ex.lines.length < 2 || ex.lines.length > 4) out.bad.push(`${key}.${ex.id}: ${ex.lines.length} lines`);
          if (!(w[0] >= 5 && w[1] >= w[0] && w[1] <= 13)) out.bad.push(`${key}.${ex.id}: window ${w}`);
          if (key === 'angerud' && w[1] >= 13) out.bad.push(`${key}.${ex.id}: after the end`);
          for (const [s, text, o] of ex.lines) {
            if (!who.has(s)) out.bad.push(`${key}.${ex.id}: speaker ${s}`);
            if (chatter.has(text)) out.bad.push(`${key}.${ex.id}: chatter line "${text}"`);
            if (s === 'ole' && /[äöÄÖ]/.test(text)) out.bad.push(`${key}.${ex.id}: Swedish letters in Ole's "${text}"`);
            if (o?.anim && !(o.anim in g.player.anim)) out.bad.push(`${key}.${ex.id}: anim ${o.anim}`);
          }
        }
      }
      return out;
    });
    T.log('table', JSON.stringify(r));
    check(!r.bad.length && r.people >= 12 && r.count >= 30, `TALK_ISLAND (${r.bad.join(' · ')})`);
    // Every scripted line in the block carries a source tag.
    const src = fs.readFileSync(path.join(ROOT, 'src/content/island.js'), 'utf8');
    const block = src.slice(src.indexOf('export const TALK_ISLAND'), src.indexOf('\n};\n', src.indexOf('export const TALK_ISLAND')));
    const lineRows = block.split('\n').filter((l) => /^\s*\['[a-zA-Z]+', '/.test(l));
    const untagged = lineRows.filter((l) => !/\/\/ (\[F\*?\]|\[N\])/.test(l));
    T.log('tagged lines', lineRows.length, 'untagged', untagged.length);
    check(lineRows.length === (await T.ev(() => Object.values(__game.chat.cfg.people).flat().reduce((a, e) => a + e.lines.length, 0))) && !untagged.length,
      `a source tag on every line (${untagged.slice(0, 3).join(' | ')})`);

    // ---- 2. Who can be talked to at each index, and every exchange somewhere. (The clock at 08:00
    // and at 15:00, Ole's watch found in a second pass.)
    const seen = new Set(), table = {};
    for (let i = 5; i <= 13; i++) {
      await T.fresh(`&mission=${i}`);
      if (i === 13) await T.ev(() => { const g = __game; g.unlock('bodega'); g.placeNpcs(true); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
      await T.frames(10);
      const row = {};
      for (const [h, klocka] of [[15, false], [8, false], [15, true]]) {
        await T.ev((h, klocka) => { const g = __game; g.day.h = h; if (klocka) g.collected.prylar.add('klocka'); else g.collected.prylar.delete('klocka'); }, h, klocka);
        // Out of its hours the pool fest after the end sends its dancers home (on foot).
        await T.frames(6);
        await T.until(() => !Object.keys(__game.fest.held).length, 40000).catch(() => {});
        await T.frames(4);
        const got = await T.ev(() => {
          const g = __game, out = {};
          for (const key of Object.keys(g.chat.cfg.people)) if (g.chat.free(key)) out[key] = g.chat.options(key).map((ex) => ex.id);
          return out;
        });
        for (const [k, ids] of Object.entries(got)) row[k] = [...new Set([...(row[k] || []), ...ids])];
      }
      await T.ev(() => { const g = __game; g.day.h = 15; g.collected.prylar.delete('klocka'); });
      table[i] = row;
      for (const [k, ids] of Object.entries(row)) for (const id of ids) seen.add(`${k}.${id}`);
      T.log(`index ${i}`, JSON.stringify(row));
    }
    const all = await T.ev(() => Object.entries(__game.chat.cfg.people).flatMap(([k, l]) => l.map((e) => `${k}.${e.id}`)));
    const never = all.filter((x) => !seen.has(x));
    check(!never.length, `every exchange can play somewhere (never: ${never.join(', ')})`);
    check(table[9].ole?.includes('rio') && !table[12].ole && !table[13].angerud && table[13].berra?.includes('skaduha'), 'Ole at 9 (Rio), not at 12 (the giver), no Angerud and Berra at the bodega after the end');
    check(!table[5].lasse && !table[6].lasse && table[5].ole?.includes('rio'), 'Lasse (the giver) at 5 and 6 none; the gang at the airport');
    check(table[12].majsan?.includes('julfest') && !table[11].majsan?.includes('julfest'), 'Majsan\'s julfest only between the grisfest and julafton');

    // ---- 3. Index 9, Ole under the pergola.
    await T.fresh('&mission=9');
    await resetSaid(T);
    await by(T, 'ole', { avoid: 'siv' });
    r = await near(T);
    check(r?.type === 'chat' && r.who === 'ole', `the nearest is a talk with Ole (${JSON.stringify(r)})`);
    let pr = await prompt(T);
    check(pr === 'E Prata med Ole', `the prompt "${pr}"`);
    await T.shot('prata_1_prompt');
    // E (a real key): the Rio exchange, its lines in order, Ole and Stig.
    await resetSaid(T);
    await T.tap('KeyE');
    r = await T.ev(() => { const g = __game, n = g.npc('ole'), p = g.player; return { busy: g.chat.busy, dialog: g.inDialog, near: g.nearestInteractable()?.type ?? null, yawOff: Math.abs(Math.atan2(Math.sin(Math.atan2(n.x - p.x, n.z - p.z) - p.yaw), Math.cos(Math.atan2(n.x - p.x, n.z - p.z) - p.yaw))) }; });
    T.log('started', JSON.stringify(r));
    check(r.busy && !r.dialog && r.near !== 'chat' && r.yawOff < 0.05, 'E starts it: Stig turned to Ole, no inDialog, no talk prompt while it runs');
    await T.until(() => __game.chat.last?.lines.length >= 2, 10000);
    await T.shot('prata_2_rio');
    pr = await prompt(T);
    check(pr === '', `no prompt during the talk ("${pr}")`);
    await T.until(() => !__game.chat.busy, 20000);
    let last = await chatLast(T);
    let want = await linesOf(T, 'ole', 'rio');
    let s = await said(T);
    T.log('rio', JSON.stringify(last), 'said', JSON.stringify(s));
    check(last.id === 'rio' && last.ended === 'done' && JSON.stringify(last.lines) === JSON.stringify(want), 'the Rio exchange, every line in order');
    check(s.length === want.length && s.every(([w, t], k) => w === want[k][0] && t === want[k][1]), `nothing else said during it (no chatter: ${JSON.stringify(s)})`);
    const gaps = s.slice(1).map((x, k) => x[2] - s[k][2]);
    check(gaps.every((d) => d >= 2.2 && d < 6), `a line at a time (${gaps.map((d) => d.toFixed(2))})`);
    r = await T.ev(() => { const g = __game, p = g.player; return Object.values(g.npcs).filter((n) => Math.hypot(n.x - p.x, n.z - p.z) < 9).map((n) => +(n.chatT ?? 0).toFixed(1)); });
    check(r.length && r.every((t) => t >= 3), `the neighbours quiet a while after it (${r})`);
    // E again: the donkey; again: Rio (the watch not found, so not in the round).
    last = await talk(T);
    check(last.id === 'asna' && last.lines.length === 4 && last.lines[1][0] === 'ole', `E again: the donkey (${last.id})`);
    last = await talk(T);
    check(last.id === 'rio', `and round to Rio again (${last.id})`);
    // The watch found: its exchange with the clock's times.
    await T.ev(() => { const g = __game; g.collected.prylar.add('klocka'); g.chat.lastId.ole = 'asna'; });
    last = await talk(T);
    T.log('klokka', JSON.stringify(last));
    // (the times in words to the half hour, so that the line can be voiced: 15:00 is "Tre", Ole's
    // "Fyra" an hour on; src/content/script.js clockLine)
    check(last.id === 'klokka' && last.lines[3][1] === 'Tre spansk tid. Fyra norsk och svensk.', `the watch with the times (${last.lines[3]?.[1]})`);
    // The morning one only in the morning.
    r = await T.ev(() => { const g = __game, a = g.chat.options('ole').map((e) => e.id); g.day.h = 8; const b = g.chat.options('ole').map((e) => e.id); g.day.h = 15; return { a, b }; });
    check(!r.a.includes('morn') && r.b.includes('morn'), `"Morn, gutten min!" at 08:00, not at 15:00 (${JSON.stringify(r)})`);
    // Walking off stops it, with the rest unsaid.
    await by(T, 'ole', { avoid: 'siv' });
    await T.tap('KeyE');
    await T.until(() => __game.chat.last?.lines.length >= 1, 5000);
    await T.ev(() => { const g = __game, p = g.player, n = g.npc('ole'); g.debugWarp(n.x + 9, n.z, 0); });
    await T.frames(5);
    last = await chatLast(T);
    await T.sleep(1500);
    r = await chatLast(T);
    check(last.ended === 'left' && r.lines.length === last.lines.length && !(await T.ev(() => __game.chat.busy)), `walking off stops it (${last.ended}, ${last.lines.length} lines)`);
    // Robban's customs, Berra answering.
    await by(T, 'robban', { d: 1.5 });
    r = await near(T);
    check(r?.who === 'robban', `by Robban (${JSON.stringify(r)})`);
    await resetSaid(T);
    last = await talk(T);
    s = await said(T);
    check(last.id === 'tullen' && s.some(([w, t]) => w === 'berra' && t === 'Va? Var jag med där?'), `Robban's customs, Berra's answer (${JSON.stringify(s)})`);
    // Siv, the giver, keeps her talk.
    await T.ev(() => { const g = __game, n = g.npc('siv'), p = g.player; g.debugWarp(n.x + Math.sin(n.yaw) * 1.6, n.z + Math.cos(n.yaw) * 1.6, n.yaw + Math.PI); });
    await T.frames(5);
    r = await near(T);
    check(r?.type === 'talk' && r.who === 'siv', `the giver's talk wins (${JSON.stringify(r)})`);
    // A mission start mid-talk: the chain stops and its bubble comes down.
    await by(T, 'ole', { avoid: 'siv' });
    await T.tap('KeyE');
    await T.until(() => __game.chat.last?.lines.length >= 1, 5000);
    await T.ev(() => __game.missions.begin());
    await T.frames(4);
    r = await T.ev(() => { const g = __game; return { busy: g.chat.busy, ended: g.chat.last.ended, ole: g.saying(g.npc('ole')) || g.saying(g.player) && g.chat.last.lines.at(-1)[0] === 'stig' }; });
    T.log('mission start', JSON.stringify(r));
    check(!r.busy && r.ended === 'free roam' && !r.ole, 'a mission start stops it and takes its bubble down');

    // ---- 4. Index 12: Majsan's julfest at the decorated pool; Ole is the giver.
    await T.fresh('&mission=12');
    await resetSaid(T);
    // Close by, her sun cream's E (an interactable, §10.26) wins; a step further off, the talk.
    await by(T, 'majsan', { d: 1.4, cam: 0.9 });
    r = await T.ev(() => __game.nearestInteractable()?.it?.id ?? null);
    check(r === 'solkram', `within 1.8 m of Majsan her sun cream (${r})`);
    await by(T, 'majsan', { d: 2.5, cam: 0.9 });
    check((await near(T))?.who === 'majsan', 'by Majsan at the pool');
    await T.tap('KeyE');
    await T.until(() => __game.chat.last?.lines.length >= 3, 15000);
    await T.shot('prata_3_julfest');
    await T.until(() => !__game.chat.busy, 15000);
    last = await chatLast(T);
    want = await linesOf(T, 'majsan', 'julfest');
    check(last.id === 'julfest' && JSON.stringify(last.lines) === JSON.stringify(want), `Majsan's julfest (${last.id})`);
    await T.ev(() => { const g = __game, n = g.npc('ole'); g.debugWarp(n.x + 2.0, n.z + 1.0, 0); });
    await T.frames(4);
    r = await T.ev(() => ({ free: __game.chat.free('ole'), near: __game.nearestInteractable()?.type ?? null }));
    check(!r.free && r.near !== 'chat', `no talk with Ole, the giver (${JSON.stringify(r)})`);

    // ---- 5. After the end.
    await T.fresh('&mission=13');
    await T.ev(() => { const g = __game; g.unlock('bodega'); g.placeNpcs(true); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    await T.frames(10);
    await resetSaid(T);
    // At 15:00 on the deck the pool fest has the SunTrip lot in its ring: no talk with them.
    await by(T, 'lasse', { d: 1.6 });
    await T.until(() => __game.fest.posed('lasse'), 15000);
    r = await T.ev(() => ['lasse', 'ole', 'majsan', 'siv', 'affe', 'gabbe', 'fruStorch'].filter((k) => __game.fest.posed(k) && __game.chat.free(k)));
    check(!r.length && (await near(T))?.type !== 'chat', `the pool fest's dancers are not to be talked to (${r})`);
    // Berra and Robban at the bodega: the Berra job's next nap held off (it takes them as soon as
    // nobody sees them go).
    await T.ev(() => { const j = __game.berraJob; j.release(); j.phase = 'nap'; j.napT = 1e9; });
    await T.frames(4);
    await by(T, 'berra', { d: 1.5, cam: 0.9 });
    await roomyCam(T);
    check((await near(T))?.who === 'berra', 'by Berra at the bodega');
    await T.tap('KeyE');
    await T.until(() => __game.chat.last?.lines.length >= 2, 10000);
    await T.shot('prata_4_bodega');
    await T.until(() => !__game.chat.busy, 15000);
    last = await chatLast(T);
    check(last.id === 'skaduha' && last.lines.map((l) => l[1]).join(' / ') === 'Ska du ha? / Nej tack, jag tål inte starksprit. / Nej, vem fan gör det?', `"Ska du ha?" at the bodega (${JSON.stringify(last.lines)})`);
    r = await T.ev(() => ({ hidden: __game.npc('angerud').state === 'hidden', free: __game.chat.free('angerud'), opts: __game.chat.options('angerud').length }));
    check(r.hidden && !r.free && !r.opts, `no Angerud after the end (${JSON.stringify(r)})`);
    // In the morning, out of the fest's hours: Lasse's oath, the pose on Stig while his line is up.
    await T.ev(() => { __game.day.h = 8; });
    await T.until(() => !Object.keys(__game.fest.held).length && __game.chat.free('lasse'), 40000);
    await by(T, 'lasse', { d: 1.6, cam: 1.0 });
    r = await near(T);
    check(r?.who === 'lasse', `by Lasse at the pool (${JSON.stringify(r)})`);
    await T.tap('KeyE');
    await T.until(() => __game.chat.last?.lines.length >= 2, 10000);
    await T.frames(3);
    r = await T.ev(() => __game.player.anim.oath);
    await T.shot('prata_5_eden');
    await T.until(() => !__game.chat.busy, 15000);
    last = await chatLast(T);
    const after = await T.ev(() => __game.player.anim.oath);
    check(last.id === 'eden' && r === true && after === false, `the oath with its pose (${last.id}, ${r} -> ${after})`);
    // Ole's mantra with the wings.
    await by(T, 'ole', { d: 1.7, cam: 0.9 });
    await T.ev(() => { __game.chat.lastId.ole = 'morn'; });   // at 08:00 the morning one comes first
    r = await T.ev(() => __game.chat.nextFor('ole')?.id);
    check(r === 'concorde', `Ole's after-the-end exchange is next (${r})`);
    await T.tap('KeyE');
    await T.until(() => __game.chat.last?.lines.length >= 2, 10000);
    await T.frames(3);
    r = await T.ev(() => __game.player.anim.wings);
    await T.shot('prata_6_concorde');
    await T.until(() => !__game.chat.busy, 15000);
    check(r === true && !(await T.ev(() => __game.player.anim.wings)), 'the mantra with the wings, and the arms down after it');

    // ---- 6. The flight level: nothing.
    await T.fresh('&mission=2');
    await T.frames(10);
    r = await T.ev(() => { const g = __game, n = g.npc('ole'); g.debugWarp(n.x, n.z + 1.0, Math.PI); return { lvl: g.level }; });
    await T.frames(4);
    r = await T.ev(() => ({ lvl: __game.level, chat: __game.chat.nearest(), any: Object.keys(__game.chat.cfg.people).some((k) => __game.chat.options(k).length && __game.chat.free(k) && __game.chat.active()) }));
    check(r.lvl === 'flight' && !r.chat && !r.any, `the flight level inert (${JSON.stringify(r)})`);
  },
};
