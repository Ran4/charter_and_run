// Mikrofonen på scenen – Stig reads Lasse's announcements (free roam, DESIGN §10.30; feature 44):
// mikrofon, utrop.
//   mikrofon: the table (every line in MIKROFON tagged in the file, no ä or ö in Ole's); at index 9
//             (ropavieja: Siv the giver, Majsan her extra) on the SunTrip stage: "E Läs ett utrop" at
//             the mic and not from the lawn in front of the stage; E: the chime, Stig turned to the
//             terrace, the camera behind him, "Ni bör inte dricka vattnet.", the three guests at the
//             terrace tables lift their glasses and spit (yell, a line each); no E in the cooldown; E:
//             the grisfest, six tourists and the free gang (Fru Storch, Ole, Robban, Berra, Herr
//             Storch; not Siv or Majsan) held (npcPosed, not the horn's), at their spots on the lawn
//             with a cheer, then in order Robban's Benidorm, Fru Storch's coffee, Stig's "Ja.", Ole's
//             "Norsk, da?", Stig's "Ja."; no chatter from Affe or Gabbe meanwhile; E: "Klockan är tre
//             spansk tid…" at 15:00 and Ole's lost watch, with the watch found his own line; the hour
//             in words; E: friskoteket, the crowd slumped and off, the guests slumped and up again, a
//             tourist's and Berra's lines; the gang home and free again, the tourists hidden; E: "Hajar
//             i poolen!", the bathers on the pool's loungers up and running away from it flailing,
//             their cries, Lasse's "Ring kliniken!" and Stig's answer, the loungers empty; with the fin
//             squashed the turn skips the shark. Walking off in the question time drops Stig's
//             answers. A mission start with the crowd on the lawn takes it all away (the gang home or
//             the mission's). Shots mikrofon_*.
//   utrop:    the three ways in (west, east, south) walked from their outermost start to a spot; at
//             index 6 (friskotek: Lasse the giver on the lawn with his extras, Berra and Robban fried)
//             a crowd of tourists only, no question time; the guests at the terrace by day and evening,
//             not at night (after a cut); no prompt in a SKANDAL pursuit, in a car or off the stage;
//             after the end (the pool fest's hours) none of its dancers in the crowd; the flight level
//             inert.
import fs from 'fs';
import path from 'path';
import { check, ROOT } from '../lib.mjs';

const st = (T) => T.ev(() => {
  const g = __game, m = g.mic, p = g.player;
  return {
    last: m.last && JSON.parse(JSON.stringify(m.last)), said: m.said.slice(), busy: m.busy, live: m.live,
    crowd: m.crowd.map((x) => ({ key: x.key, st: x.st, x: +x.ch.x.toFixed(2), z: +x.ch.z.toFixed(2), sx: +x.spot.x.toFixed(2), sz: +x.spot.z.toFixed(2), cheer: x.ch.anim.cheer, slump: x.ch.anim.slump, entry: x.entry })),
    drinkers: (m.drinkers || []).map((d) => ({ on: d.on, st: d.ch?.state, cup: !!d.ch?.anim.cupHeld, yell: !!d.ch?.anim.yell, slump: !!d.ch?.anim.slump })),
    prompt: document.getElementById('prompt')?.textContent || '', it: g.nearestInteractable()?.it?.id ?? null,
    yaw: +p.yaw.toFixed(3), camYaw: +g.cam.yaw.toFixed(3), px: +p.x.toFixed(2), pz: +p.z.toFixed(2), state: g.missions.state,
  };
});
// Every line said through game.say since the last reset: [speaker key | '?', text].
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.key || '?', text]); return o(t, text, secs); };
  }
  window.__said = [];
});
const allSaid = (T) => T.ev(() => window.__said.slice());
// Stig at the mic, facing the lawn, the camera behind him.
const atMic = (T) => T.ev(() => {
  const g = __game, l = __lm('mikrofon');
  if (g.playerCar) g.exitCar(true);
  g.player.state = 'normal';
  g.debugWarp(l.x, l.z, l.yaw);
  g.cam.yaw = l.yaw; g.cam.snapNext = true;
});
const setNext = (T, id) => T.ev((id) => { const m = __game.mic; m.next = m.cfg.order.indexOf(id); }, id);
const idle = (T, ms = 45000) => T.until(() => !__game.mic.busy, ms);
const angle = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export const SCENARIOS = {
  async mikrofon(T) {
    await T.fresh('&mission=9');
    // ---- 1. The table: a source tag on every line, Ole in bokmål.
    const texts = await T.ev(() => {
      const c = __game.mic.cfg, out = [];
      out.push(['-', c.prompt]);
      for (const L of Object.values(c.lines)) out.push(['stig', L.text]);
      for (const t of c.terrace.spit) out.push(['guest', t]);
      for (const t of c.crowd.cheer) out.push(['tourist', t]);
      out.push(['robban', c.crowd.robban], ...c.crowd.qa, ['tourist', c.crowd.slump], ['berra', c.crowd.berraSlump]);
      out.push(['ole', c.klocka.ole], ['ole', c.klocka.oleLost], ['tourist', c.klocka.other]);
      for (const t of c.hajar.cries) out.push(['bather', t]);
      out.push(['lasse', c.hajar.lasse], ['stig', c.hajar.stig]);
      return out;
    });
    const src = fs.readFileSync(path.join(ROOT, 'src/content/island.js'), 'utf8');
    const block = src.slice(src.indexOf('export const MIKROFON'), src.indexOf('\n};\n', src.indexOf('export const MIKROFON')));
    const bad = [];
    for (const [who, text] of texts) {
      const row = block.split('\n').find((l) => l.includes(`'${text}'`));
      if (!row) bad.push(`not in the block: ${text}`);
      else if (!/(\/\/|\/\*) \[(F\*?|N)\]/.test(row)) bad.push(`untagged: ${text}`);
      if (who === 'ole' && /[äöÄÖ]/.test(text)) bad.push(`Swedish letters in Ole's "${text}"`);
    }
    T.log('lines', texts.length, 'bad', bad.length);
    check(texts.length >= 25 && !bad.length, `MIKROFON's lines (${bad.join(' · ')})`);
    const words = await T.ev(() => { const m = __game.mic; return [15, 15.2, 15.25, 15.6, 15.75, 0.1, 12, 13.5, 23.9].map((h) => m.clockWords(h)); });
    T.log('clock words', words.join(' / '));
    check(words.join('|') === 'tre|tre|halv fyra|halv fyra|fyra|tolv|tolv|halv två|tolv', `the hour in words (${words.join('|')})`);

    // ---- 2. The prompt: on the stage at the mic, not from the lawn in front of it.
    await resetSaid(T);
    await T.ev(() => { const g = __game, l = __lm('mikrofon'); g.debugWarp(l.x, l.z + 2.8, Math.PI); });
    await T.frames(8);
    let r = await st(T);
    check(r.it !== 'mic' && !r.prompt.includes('utrop'), `no mic from the lawn (${r.it}, ${r.prompt})`);
    await atMic(T);
    await T.frames(30);
    r = await st(T);
    T.log('at the mic', r.it, r.prompt, JSON.stringify(r.drinkers));
    check(r.it === 'mic' && r.prompt.includes('Läs ett utrop'), `the mic's prompt (${r.it}, ${r.prompt})`);
    check(r.drinkers.length === 3 && r.drinkers.every((d) => d.on && d.st === 'seated'), `three guests at the terrace (${JSON.stringify(r.drinkers)})`);
    await T.shot('mikrofon_1_prompt');

    // ---- 3. "Ni bör inte dricka vattnet.": the guests drink and spit.
    await T.tap('KeyE');
    await T.sleep(700);
    r = await st(T);
    const face = await T.ev(() => { const m = __game.mic, f = m.at(m.cfg.lines.vatten.face), p = __game.player; return Math.atan2(f.x - p.x, f.z - p.z); });
    T.log('vatten', JSON.stringify(r.last), JSON.stringify(r.drinkers), r.yaw, face);
    check(r.last?.id === 'vatten' && r.last.drinkers === 3, `the first announcement (${JSON.stringify(r.last)})`);
    check(angle(r.yaw, face) < 0.05, `Stig turned to the terrace (${r.yaw} vs ${face})`);
    check(r.drinkers.every((d) => d.cup), 'the guests lift their glasses at the chime');
    check(!r.prompt.includes('utrop'), 'no prompt while it plays');
    await T.until(() => __game.mic.said.filter((s) => s[0] === 'guest').length === 3, 8000);
    r = await st(T);
    await T.shot('mikrofon_2_vatten');
    const camOff = await T.ev(() => __game.mic.cfg.camOff);
    T.log('spat', JSON.stringify(r.said), JSON.stringify(r.drinkers), 'cam', r.camYaw, r.yaw + camOff);
    check(r.said[0][0] === 'stig' && r.said[0][1] === 'Ni bör inte dricka vattnet.', `his line first (${JSON.stringify(r.said[0])})`);
    check(r.drinkers.every((d) => !d.cup) && r.drinkers.some((d) => d.yell), `spat out (${JSON.stringify(r.drinkers)})`);
    check(angle(r.camYaw, r.yaw + camOff) < 0.1, `the camera behind him (${r.camYaw} vs ${r.yaw + camOff})`);
    // E in the cooldown does nothing.
    const t0 = r.last.t;
    await T.tap('KeyE');
    await T.frames(3);
    check((await st(T)).last.t === t0, 'no announcement in the cooldown');
    await idle(T);
    check((await st(T)).drinkers.every((d) => !d.yell), 'the yell over');

    // ---- 4. The grisfest: the crowd, the cheer, the question time.
    const expectGang = await T.ev(() => { const m = __game.mic; return m.cfg.crowd.gang.filter((k) => m.free(k)); });
    T.log('free gang', expectGang.join(' '));
    check(['fruStorch', 'ole', 'robban', 'berra', 'herrStorch'].every((k) => expectGang.includes(k)) && !expectGang.includes('siv') && !expectGang.includes('majsan'),
      `the free gang at index 9 (${expectGang})`);
    await resetSaid(T);
    await T.tap('KeyE');
    await T.frames(3);
    r = await st(T);
    T.log('grisfest', JSON.stringify(r.last));
    check(r.last.id === 'grisfest' && r.last.gang.join() === expectGang.join() && r.crowd.length === expectGang.length + 6, `the crowd called (${JSON.stringify(r.last)})`);
    r = await T.ev((keys) => { const g = __game; return keys.map((k) => [k, g.npcPosed(k), g.honk.free(k), g.npc(k).spot, g.npc(k).busy]); }, expectGang);
    check(r.every(([, posed, honk, spot, busy]) => posed && !honk && spot === 'mic' && busy), `the gang held (${JSON.stringify(r)})`);
    await T.sleep(5000);
    await T.shot('mikrofon_3_publiken');
    await T.until(() => __game.mic.crowd.every((m) => m.st === 'stand'), 20000);
    await T.sleep(400);
    r = await st(T);
    await T.shot('mikrofon_4_hurra');
    const off = r.crowd.map((m) => Math.hypot(m.x - m.sx, m.z - m.sz));
    T.log('arrived', JSON.stringify(off.map((d) => +d.toFixed(2))), 'cheer', r.crowd.filter((m) => m.cheer).length);
    check(Math.max(...off) < 0.8, `everyone at the spots (${off.map((d) => d.toFixed(2))})`);
    await T.until(() => __game.mic.said.some((s) => s[1] === 'Norsk, da?'), 30000);
    await T.sleep(300);
    await T.shot('mikrofon_5_norsk');
    await idle(T);
    r = await st(T);
    const order = r.said.map(([w, t]) => `${w}:${t}`);
    T.log('said', order.join(' | '));
    const want = ['stig:Grisfesten är på torsdag och kostar 800 pesetas. Några frågor?', 'robban:Ja, herre jävlar, minns du Benidorm? Snacka om grisfest!',
      'fruStorch:Finns det svenskt kaffe på hotellet?', 'stig:Ja.', 'ole:Norsk, da?', 'stig:Ja.'];
    const seq = order.filter((s) => !s.startsWith('tourist:'));
    check(seq.join('|') === want.join('|'), `the question time in order (${seq.join(' | ')})`);
    check(order.some((s) => s === 'tourist:Hurra!'), 'a cheer');
    const chatter = (await allSaid(T)).filter(([w]) => w === 'affe' || w === 'gabbe');
    check(!chatter.length, `no chatter from the band meanwhile (${JSON.stringify(chatter)})`);

    // ---- 5. The time: Ole's lost watch, then his own line once it is found.
    await T.tap('KeyE');
    await idle(T);
    r = await st(T);
    T.log('klocka', JSON.stringify(r.said));
    check(r.last.id === 'klocka' && r.said[0][1] === 'Klockan är tre spansk tid – alltså en timme tidigare än svensk tid.', `the time at 15:00 (${r.said[0]?.[1]})`);
    check(r.said[1]?.[0] === 'ole' && r.said[1][1].startsWith('Og norsk tid?'), `Ole's watch is lost (${JSON.stringify(r.said[1])})`);
    await T.ev(() => { const g = __game; g.collected.prylar.add('klocka'); g.day.h = 15.5; });
    await setNext(T, 'klocka');
    await T.tap('KeyE');
    await idle(T);
    r = await st(T);
    T.log('klocka 2', JSON.stringify(r.said));
    check(r.said[0][1].startsWith('Klockan är halv fyra spansk tid') && r.said[1]?.[1] === 'Digital, analog, spansk, norsk, svensk tid, kronometer, og så klokke.',
      `his watch found (${JSON.stringify(r.said)})`);
    await T.ev(() => { const g = __game; g.collected.prylar.delete('klocka'); g.day.h = 15; });

    // ---- 6. Friskoteket: the crowd sinks and goes, the terrace slumps; the gang home.
    const homes = await T.ev((keys) => {
      const g = __game, out = {};
      for (const k of keys) { const h = g.mic.homeOf(k), q = g.lmOffset(h[0], h[1], h[2]); out[k] = [q.x, q.z]; }
      return out;
    }, expectGang);
    await T.tap('KeyE');
    await T.sleep(2200);
    r = await st(T);
    await T.shot('mikrofon_6_friskotek');
    T.log('friskotek', JSON.stringify(r.crowd.map((m) => [m.key, m.st, m.slump])), JSON.stringify(r.drinkers));
    check(r.last.id === 'friskotek' && r.crowd.every((m) => m.st === 'leave' && m.slump), 'the crowd slumped, leaving');
    check(r.drinkers.every((d) => d.slump), 'the guests slumped');
    await idle(T);
    r = await st(T);
    T.log('friskotek said', JSON.stringify(r.said));
    check(r.said.some(([w, t]) => w === 'tourist' && t === 'Halv tio? På semestern?') && r.said.some(([w]) => w === 'berra'), `the slump lines (${JSON.stringify(r.said)})`);
    await T.until(() => __game.mic.drinkers.every((d) => !d.ch.anim.slump), 8000);
    // Stig goes off the lawn's view (to the office porch side), so the crowd may go.
    await T.until(() => !__game.mic.crowd.length, 90000);
    r = await T.ev((keys) => { const g = __game; return keys.map((k) => [k, g.npc(k).spot, g.npc(k).busy, !!g.npc(k).steer, g.npcPosed(k), +g.npc(k).x.toFixed(1), +g.npc(k).z.toFixed(1)]); }, expectGang);
    const tour = await T.ev(() => __game.mic.tourists.every((t) => t.state === 'hidden' && !t.root.visible) && !__game.mic.extras.length);
    T.log('gone', JSON.stringify(r));
    check(tour, 'the tourists hidden');
    check(r.every(([k, spot, busy, steer, posed, x, z]) => spot !== 'mic' && !busy && !steer && !posed && Math.hypot(x - homes[k][0], z - homes[k][1]) < 3),
      `the gang home and free (${JSON.stringify(r)})`);

    // ---- 7. "Hajar i poolen!": the bathers flee, Lasse waves it off.
    await T.ev(() => {
      const g = __game, b = g.bathers, q = g.mic.at(g.mic.cfg.hajar.at);
      for (const rec of b.recs) if (Math.hypot(rec.p.x - q.x, rec.p.z - q.z) < 11 && !b.reserved(rec)) rec.occ = true;
      g.debugWarp(q.x + 40, q.z, 0);   // a cut: bodies may lie down in view
    });
    await T.frames(6);
    await atMic(T);
    await T.until(() => { const g = __game, q = g.mic.at(g.mic.cfg.hajar.at); return g.bathers.lying.filter((c) => Math.hypot(c.bather.rec.p.x - q.x, c.bather.rec.p.z - q.z) < 11).length >= 4; }, 8000);
    await T.frames(10);
    r = await st(T);
    check(r.last.id === 'friskotek' && (await T.ev(() => __game.mic.nextId())) === 'hajar', 'the shark next');
    const lying = await T.ev(() => { const g = __game, q = g.mic.at(g.mic.cfg.hajar.at); return g.bathers.lying.filter((c) => Math.hypot(c.bather.rec.p.x - q.x, c.bather.rec.p.z - q.z) < 11).length; });
    await T.tap('KeyE');
    await T.until(() => __game.mic.last.scared > 0, 4000);
    const d0 = await T.ev(() => { const g = __game, q = g.mic.at(g.mic.cfg.hajar.at); return g.bathers.loose.map((c) => Math.hypot(c.x - q.x, c.z - q.z)); });
    await T.sleep(1500);
    await T.shot('mikrofon_7_hajar');
    const d1 = await T.ev(() => { const g = __game, q = g.mic.at(g.mic.cfg.hajar.at); return g.bathers.loose.map((c) => [Math.hypot(c.x - q.x, c.z - q.z), c.anim.flail, c.state]); });
    r = await st(T);
    T.log('hajar', lying, JSON.stringify(r.last), JSON.stringify(d0.map((d) => +d.toFixed(1))), JSON.stringify(d1.map(([d, f, s]) => [+d.toFixed(1), f, s])));
    check(r.last.id === 'hajar' && r.last.scared === lying && lying >= 4, `every bather up (${r.last.scared} of ${lying})`);
    check(d1.every(([d, f], i) => f && d > d0[i] + 3), 'they run from the pool, flailing');
    await idle(T);
    r = await st(T);
    T.log('hajar said', JSON.stringify(r.said));
    const hs = r.said.map(([w, t]) => `${w}:${t}`);
    check(hs[0] === 'stig:Hajar i poolen!' && hs.includes('bather:Hjälp!') && hs.includes('bather:En haj!'), `the warning and the cries (${hs.join(' | ')})`);
    check(hs.indexOf('lasse:Hajar i poolen igen? Ring kliniken!') > 0 && hs.at(-1) === 'stig:Men den är ju där…', `Lasse waves it off, Stig answers (${hs.join(' | ')})`);
    await T.sleep(2500);
    r = await T.ev(() => { const g = __game, q = g.mic.at(g.mic.cfg.hajar.at); return { flail: g.bathers.loose.some((c) => c.anim.flail), occ: g.bathers.recs.filter((x) => Math.hypot(x.p.x - q.x, x.p.z - q.z) < 11 && x.occ).length, lying: g.bathers.lying.filter((c) => Math.hypot(c.bather.rec.p.x - q.x, c.bather.rec.p.z - q.z) < 11).length }; });
    T.log('after the flight', JSON.stringify(r));
    check(!r.flail && r.lying === 0, `the flailing over, nobody back on the loungers (${JSON.stringify(r)})`);
    // The fin squashed: the turn skips the shark.
    await T.ev(() => { const g = __game; g.collected.fenor.add('fena_suntrip'); });
    await setNext(T, 'hajar');
    check((await T.ev(() => __game.mic.nextId())) === 'vatten', 'no shark warning without the fin');
    await T.ev(() => { const g = __game; g.collected.fenor.delete('fena_suntrip'); });

    // ---- 8. Walking off in the question time drops Stig's answers.
    await setNext(T, 'grisfest');
    await T.tap('KeyE');
    await T.until(() => __game.mic.said.some((s) => s[0] === 'fruStorch'), 40000);
    await T.ev(() => { const g = __game, l = __lm('mikrofon'); g.debugWarp(l.x - 16, l.z + 14, 0); });
    await idle(T);
    r = await st(T);
    T.log('walked off', JSON.stringify(r.said));
    check(!r.said.some(([w, t]) => t === 'Ja.' || t === 'Norsk, da?'), `no answers once he has gone (${JSON.stringify(r.said)})`);
    await atMic(T);
    await T.until(() => __game.mic.crowd.every((m) => m.st === 'stand'), 20000);

    // ---- 9. A mission start with the crowd on the lawn: all of it off at once.
    await T.ev(() => __game.missions.begin());
    await T.frames(6);
    r = await T.ev((keys) => {
      const g = __game, m = g.mic;
      return { crowd: m.crowd.length, extras: m.extras.length, tourists: m.tourists.every((t) => t.state === 'hidden'), drinkers: m.drinkers.every((d) => !d.on && !d.ch.root.visible),
        gang: keys.map((k) => [k, g.npc(k).spot, !!g.npc(k).steer, m.posed(k)]), live: m.live, it: g.nearestInteractable()?.it?.id ?? null };
    }, expectGang);
    T.log('mission start', JSON.stringify(r));
    check(!r.crowd && !r.extras && r.tourists && r.drinkers && !r.live && r.it !== 'mic', `nothing left in the mission (${JSON.stringify(r)})`);
    check(r.gang.every(([, spot, steer, posed]) => spot !== 'mic' && !steer && !posed), `the gang let go (${JSON.stringify(r.gang)})`);
  },

  async utrop(T) {
    // ---- 1. The three ways in, each from its outermost start to a spot on the lawn.
    await T.fresh('&mission=9');
    await atMic(T);
    await T.frames(20);
    for (const [entry, si] of [['w', 9], ['e', 8], ['s', 13]]) {
      const ok = await T.ev((entry, si) => {
        const g = __game, m = g.mic, c = m.cfg.crowd;
        m.ensureTourists();
        const ch = m.tourists[0], e = c.entries[entry], s = m.at(e.from[e.from.length - 1]), spot = m.at(c.spots[si]);
        ch.state = 'normal';
        ch.teleport(s.x, s.z, 0);
        ch.root.visible = true;
        m.crowd.push({ ch, key: null, si, spot, entry, path: m.pathIn(entry, spot), st: 'come', speed: c.walk, waitT: 0, stuckT: 0, cheerT: 0, slump: false, outT: 0 });
        m.extras = [ch];
        window.__walk = { t: g.time, skips: 0, n: m.crowd.at(-1).path.length };
        return true;
      }, entry, si);
      check(ok, 'a walker');
      await T.until(() => __game.mic.crowd[0]?.st === 'stand', 25000);
      const r = await T.ev(() => { const g = __game, x = g.mic.crowd[0]; return { secs: +(g.time - window.__walk.t).toFixed(1), off: +Math.hypot(x.ch.x - x.spot.x, x.ch.z - x.spot.z).toFixed(2) }; });
      T.log('way in', entry, JSON.stringify(r));
      check(r.off < 0.6 && r.secs < 20, `the way in from ${entry} (${JSON.stringify(r)})`);
      await T.ev(() => { const m = __game.mic; m.drop(m.crowd[0]); });
    }

    // ---- 2. The terrace: by day and evening, not at night (after a cut).
    for (const [h, want] of [[9, true], [22.5, true], [23.5, false], [5, false], [15, true]]) {
      await T.ev((h) => { const g = __game, l = __lm('mikrofon'); g.day.h = h; g.debugWarp(l.x + 60, l.z, 0); }, h);
      await T.frames(4);
      await atMic(T);
      await T.frames(8);
      const on = await T.ev(() => __game.mic.drinkers.filter((d) => d.on).length);
      T.log('terrace at', h, on);
      check(on === (want ? 3 : 0), `the terrace at ${h} (${on})`);
    }

    // ---- 3. No prompt in a pursuit or off the stage; then the prompt.
    await atMic(T);
    await T.frames(6);
    check((await st(T)).it === 'mic', 'the prompt on the stage');
    await T.ev(() => { __game.shame.v = 100; __game.shame.startPursuit(); });
    await T.frames(4);
    let r = await st(T);
    check(r.it !== 'mic' && !r.prompt.includes('utrop'), `no mic in a pursuit (${r.it})`);
    await T.ev(() => __game.shame.endPursuit(false));
    await T.frames(4);

    // ---- 4. Index 6 (friskotek): Lasse the giver on the lawn with his extras, Berra and Robban fried:
    // tourists only, no question time.
    await T.fresh('&mission=6');
    await atMic(T);
    await T.frames(20);
    await setNext(T, 'grisfest');
    await T.tap('KeyE');
    await T.frames(3);
    r = await st(T);
    T.log('index 6', JSON.stringify(r.last));
    check(r.last.id === 'grisfest' && !r.last.gang.length && r.crowd.length === 6, `tourists only at index 6 (${JSON.stringify(r.last)})`);
    await idle(T);
    r = await st(T);
    await T.shot('utrop_1_friskotek');
    T.log('index 6 said', JSON.stringify(r.said));
    check(!r.said.some(([w]) => w === 'fruStorch' || w === 'ole' || w === 'robban'), 'no question time');
    check(await T.ev(() => { const g = __game; return ['lasse', 'affe', 'gabbe', 'ole', 'siv', 'majsan', 'fruStorch', 'herrStorch'].every((k) => !g.mic.posed(k)); }), 'the giver and extras left be');

    // ---- 5. After the end, in the pool fest's hours: none of its dancers in the crowd.
    await T.fresh('&mission=13');
    await T.ev(() => { const g = __game; g.unlock('bodega'); g.placeNpcs(true); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    await T.frames(10);
    await atMic(T);
    await T.frames(20);
    await setNext(T, 'grisfest');
    await T.tap('KeyE');
    await T.frames(3);
    r = await T.ev(() => { const g = __game; return { gang: g.mic.last.gang, fest: Object.keys(g.fest.held) }; });
    T.log('after the end', JSON.stringify(r));
    check(r.gang.every((k) => !r.fest.includes(k)), `no dancer in the crowd (${JSON.stringify(r)})`);
    await idle(T);
    await T.shot('utrop_2_efter_slutet');

    // ---- 6. The flight level: inert.
    await T.fresh('&mission=2');
    await T.frames(20);
    r = await T.ev(() => { const g = __game, m = g.mic; return { live: m.live, drinkers: m.drinkers, crowd: m.crowd.length, it: g.nearestInteractable()?.it?.id ?? null }; });
    T.log('flight', JSON.stringify(r));
    check(!r.live && !r.drinkers && !r.crowd && r.it !== 'mic', 'the flight level inert');
  },
};
