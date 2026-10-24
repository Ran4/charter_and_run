// The voices (DESIGN §12.4, features/implemented/roster.md §9; src/voice.js): voice, vstory.
//   voice   a made-up manifest (out/voicetest/: tones of known length, a lip curve with a closure, a
//           clip that won't load): a dialogue line waits for its clip (autoDialog 0.4 s more) and its
//           text types in step with it; a bubble never talks over a main line; radio queues behind the
//           dialogue and its toast goes up when it is said and stays while it is; the same speaker
//           waits for himself; a clip that won't load is no voice (the beeps of before, no error); the
//           mouth follows the clip and shuts on the closure; the music ducks under speech and comes
//           back; the pause holds a line where it is; the voices off: play() is null.
//   vstory  the whole story with the voices on (the real manifest; FROM / TO work): `story`, then what
//           the sibling project measured: lines asked, said, dropped; cut off (more than 0.25 s
//           unsaid; goal under 5 %); two voices at once (over 0.3 s; goal 0); radio toasts gone before
//           their line was said (goal 0); and every line said that is not in allLines()
//           (src/content/script.js; goal 0). A scenario failure, or a check, fails the run.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { check, ROOT } from '../lib.mjs';
import { SCENARIOS as CORE } from './core.mjs';

// A mono 16-bit wav: a voice-ish tone (150 Hz and harmonics) with an envelope, `secs` long, silent
// in `gaps`.
function wav(file, secs, gaps = []) {
  const sr = 22050, n = Math.floor(sr * secs), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / sr, gap = gaps.some(([a, z]) => t >= a && t < z);
    const v = gap ? 0 : 0.3 * Math.min(1, t / 0.03, (secs - t) / 0.05) * (Math.sin(2 * Math.PI * 150 * t) + 0.5 * Math.sin(2 * Math.PI * 300 * t) + 0.3 * Math.sin(2 * Math.PI * 450 * t));
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32000), 44 + i * 2);
  }
  fs.writeFileSync(file, b);
}

// What voice.js logged (every voiced line asked for) and noted (every line said with the voices
// on), measured against the goals, and the lines said that the script doesn't know.
async function measure(T, label) {
  const { scriptLines } = await import(pathToFileURL(path.join(ROOT, 'tools/voice/script.mjs')).href);
  const known = new Set((await scriptLines()).map((l) => l.who + '\0' + l.text));
  const r = await T.ev(() => {
    const V = window.__voice, L = V.log.filter((x) => x.t0 != null);
    const cut = L.filter((x) => x.cut > 0.25);
    let overlap = 0; const pairs = [];
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j], o = Math.min(a.t1 ?? 1e9, b.t1 ?? 1e9) - Math.max(a.t0, b.t0);
      if (o > 0.3) { overlap++; pairs.push(`${a.who}:${a.text.slice(0, 24)} / ${b.who}:${b.text.slice(0, 24)}`); }
    }
    const radio = L.filter((x) => x.toastGone != null), gone = radio.filter((x) => x.toastGone && x.cut <= 0.25);
    const said = V.said.map((s) => ({ who: s.who, text: s.text, ctx: s.ctx }));
    return {
      asked: V.log.length, played: L.length, dropped: V.log.filter((x) => x.dropped).length, cut: cut.length,
      cutList: cut.slice(0, 12).map((x) => `${x.who} "${x.text.slice(0, 30)}" ${x.cut.toFixed(2)}s`), overlap, pairs: pairs.slice(0, 6),
      radio: radio.length, gone: gone.length, said, failed: [...V.failed],
    };
  });
  // (a line said by nobody's voice - a passer-by, the pool of version 2 - is counted, not failed)
  const outside = r.said.filter((s) => s.who && !known.has(s.who + '\0' + s.text));
  const nobody = r.said.filter((s) => !s.who);
  const uniq = (a) => [...new Map(a.map((s) => [s.who + '\0' + s.text, s])).values()];
  const pct = r.played ? (100 * r.cut / r.played).toFixed(1) : '0';
  T.log(`${label}: ${r.said.length} lines said, ${r.asked} with a clip asked for, ${r.played} voiced, ${r.dropped} dropped; cut off ${r.cut} (${pct} %); two at once ${r.overlap}; radio toasts gone early ${r.gone} of ${r.radio}; not in allLines() ${uniq(outside).length}; by no voice ${uniq(nobody).length}; clips that would not load ${r.failed.length}`);
  if (r.cutList.length) T.log('cut:', r.cutList.join(' | '));
  if (r.pairs.length) T.log('overlaps:', r.pairs.join(' | '));
  for (const s of uniq(nobody).slice(0, 12)) T.log(`by no voice [${s.ctx || '-'}]: "${s.text}"`);
  const bad = [];
  if (r.played && r.cut / r.played >= 0.05) bad.push(`${pct} % of the lines cut off (goal under 5 %)`);
  if (r.overlap) bad.push(`two voices at once ${r.overlap} times`);
  if (r.gone) bad.push(`${r.gone} radio toasts gone before their line was said`);
  if (r.failed.length) bad.push(`clips that would not load: ${r.failed.slice(0, 4).join(', ')}`);
  for (const s of uniq(outside).slice(0, 20)) bad.push(`said but not in allLines() [${s.ctx || '-'}]: ${s.who} "${s.text}"`);
  for (const b of bad) T.log('CHECK FAILED', b);
  check(!bad.length, `${label}: ${bad.slice(0, 3).join('; ')}`);
  return r;
}

export const SCENARIOS = {
  async voice(T) {
    const dir = path.join(ROOT, 'out/voicetest');
    fs.mkdirSync(dir, { recursive: true });
    wav(path.join(dir, 'a.wav'), 1.5, [[0.6, 0.75]]);
    wav(path.join(dir, 'b.wav'), 1.0);
    wav(path.join(dir, 'c.wav'), 2.0);
    // (a clip that is there but won't decode: no 404 in the console, the same fallback)
    fs.writeFileSync(path.join(dir, 'broken.mp3'), Buffer.from('not an mp3 at all'.repeat(40)));
    // The lip curve: open, shut for frames 18-22 (an "m"), open again. (assets/voice/ + f: the made-up
    // clips are served from out/voicetest/.)
    const lip = 'z'.repeat(18) + '0'.repeat(5) + 'z'.repeat(22), f = (n) => `../../out/voicetest/${n}`;
    const A = 'Ursäkta, är det här kön?', B = 'Det går nog bra.', C = 'Jeg har regnet på det. Det er helt trygt.';
    const m = {
      _fps: 30,
      stig: { [A]: { f: f('a.wav'), d: 1.5, t: [...A].map((_, i) => Math.round(i * 150 / A.length)), lip } },
      ole: { [C]: { f: f('c.wav'), d: 2.0, lip: 'z'.repeat(60) }, [B]: { f: f('b.wav'), d: 1.0, lip: 'z'.repeat(30) } },
      lasse: { [B]: { f: f('b.wav'), d: 1.0, lip: 'z'.repeat(30) } },
      siv: { 'Stig-Helmer!': { f: f('broken.mp3'), d: 1.2 } },
    };
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(m));
    try {
      await T.fresh('&voice&voicemanifest=out/voicetest/index.json');
      await T.until(() => window.__voice?.manifest && window.__voice.enabled, 30000);
      await T.frames(10);
      // 1. A dialogue line waits for its clip (+0.4 s), and its text types in step with it.
      const d1 = await T.ev(async (A) => {
        const g = __game, t0 = performance.now(), typed = [];
        const el = document.querySelector('#dialog .dlg-text');
        const tick = () => { if (g.inDialog) { typed.push([(performance.now() - t0) / 1000, el.textContent.length]); requestAnimationFrame(tick); } };
        const p = g.dialog([['stig', A], ['ole', 'Det går nog bra.']]);
        requestAnimationFrame(tick);
        await p;
        const at = (s) => typed.filter(([t]) => t <= s).pop()?.[1] ?? 0;
        return { took: (performance.now() - t0) / 1000, half: at(0.75), full: at(1.45) };
      }, A);
      T.log(`dialogue of 1.5 s + 1.0 s clips took ${d1.took.toFixed(2)} s; typed at 0.75 s ${d1.half} of ${A.length}, at 1.45 s ${d1.full}`);
      check(d1.took >= 2.5, `a dialogue line didn't wait for its clip (${d1.took.toFixed(2)} s)`);
      check(d1.half > 4 && d1.half < A.length - 2, `the text did not type in step with the voice (${d1.half} of ${A.length} at 0.75 s)`);
      // 2. A bubble during a dialogue line waits (or is dropped); radio queues behind it and its toast
      // goes up when it is said.
      const d2 = await T.ev(async ([B, C]) => {
        const g = __game, V = window.__voice, n = g.npc('ole');
        V.log.length = 0;
        const p = g.dialog([['ole', C]]);
        await new Promise((ok) => setTimeout(ok, 300));
        g.say(g.player, 'Ursäkta, är det här kön?', 1.5);
        const toasts0 = document.querySelectorAll('.toast.radio').length;
        g.radio('lasse', B);
        const toasts1 = document.querySelectorAll('.toast.radio').length;
        await p;
        await V.waitQuiet(0.2, 8);
        return { toastEarly: toasts1 - toasts0, ole: !!n, log: V.log.map((r) => ({ who: r.who, slot: r.slot, t0: r.t0, t1: r.t1, dropped: r.dropped, cut: r.cut, toastGone: r.toastGone })) };
      }, [B, C]);
      const main = d2.log.find((r) => r.slot === 'main' && r.who === 'ole');
      check(main && main.t1 - main.t0 >= 1.9, `the dialogue line was cut off (${main && (main.t1 - main.t0).toFixed(2)} s of 2.0)`);
      for (const r of d2.log.filter((r) => r !== main)) check(r.t0 == null || r.t0 >= main.t1 - 0.05, `${r.who}'s ${r.slot} line started over the dialogue`);
      const radio = d2.log.find((r) => r.who === 'lasse');
      check(!d2.toastEarly, 'the radio toast went up before its line was said');
      check(radio && !radio.dropped && radio.toastGone === false, `the radio line was not said after the dialogue with its toast up (${JSON.stringify(radio)})`);
      T.log('bubble and radio during a dialogue:', JSON.stringify(d2.log.map((r) => `${r.who}/${r.slot} ${r.dropped ? 'dropped' : (r.t0 - main.t0).toFixed(2) + 's'}`)));
      // 3. The same speaker waits for himself: two bubbles from Ole in a row.
      const d3 = await T.ev(async ([B, C]) => {
        const g = __game, V = window.__voice, n = g.npc('ole');
        V.log.length = 0;
        g.say(n, C, 2);
        await new Promise((ok) => setTimeout(ok, 400));
        g.say(n, B, 2);
        await V.waitQuiet(0.2, 8);
        return V.log.map((r) => ({ t0: r.t0, t1: r.t1, dropped: r.dropped }));
      }, [B, C]);
      T.log('the same speaker twice:', JSON.stringify(d3.map((r) => (r.dropped ? 'dropped' : `${r.t0.toFixed(2)}-${r.t1.toFixed(2)}`))));
      check(!d3[1] || d3[1].dropped || d3[1].t0 >= d3[0].t1 - 0.05, 'the same speaker talked over himself');
      // 4. A clip that won't load: no voice, the beeps of before.
      const d4 = await T.ev(async () => {
        const g = __game, V = window.__voice, Au = (await import('/src/audio.js')).audio;
        let beeps = 0; const orig = Au.talk; Au.talk = (...a) => { beeps++; return orig.apply(Au, a); };
        V.prefetch([['siv', 'Stig-Helmer!']]);
        await new Promise((ok) => setTimeout(ok, 600));
        await g.dialog([['siv', 'Stig-Helmer!']]);
        Au.talk = orig;
        return { beeps, failed: [...V.failed] };
      });
      T.log('a clip that would not load:', JSON.stringify(d4));
      check(d4.failed.length && d4.beeps, 'a clip that would not load was not beeped');
      // 5. The mouth follows the clip and shuts on the closure (frames 18-22 of the lip curve).
      const d5 = await T.ev(async (A) => {
        const g = __game, V = window.__voice, p = g.player;
        const u = V.play('stig', A, { slot: 'bubble', mode: 'world', at: p, ch: p });
        const out = [];
        await new Promise((ok) => { const f = () => { if (u.state === 'done') return ok(); if (u.t0 != null && u.src) out.push([+(V.now() - u.t0).toFixed(3), p.anim.mouth, p.anim.talk, +(p.model?.mouth?.scale.y ?? 0).toFixed(3)]); requestAnimationFrame(f); }; f(); });
        await new Promise((ok) => setTimeout(ok, 100));
        return { out, after: p.anim.mouth };
      }, A);
      const open = d5.out.filter(([t, mo]) => t > 0.1 && t < 0.5 && mo > 0.8).length, shut = d5.out.filter(([t, mo]) => t > 0.62 && t < 0.72 && mo === 0).length;
      const sy = d5.out.filter(([t]) => t > 0.1 && t < 1.3).map((x) => x[3]);
      T.log(`mouth: ${d5.out.length} samples, open ${open}, shut on the closure ${shut}, scale ${Math.min(...sy).toFixed(2)}..${Math.max(...sy).toFixed(2)}, talk ${d5.out.filter((x) => x[2]).length}, after ${d5.after}`);
      check(open && shut, 'the mouth did not follow the lip curve');
      check(Math.max(...sy) - Math.min(...sy) > 0.3, 'the mouth did not move with the voice');
      check(d5.after == null, 'the mouth still driven after the line');
      // 6. The music ducks under speech and comes back.
      const d6 = await T.ev(async (A) => {
        const Au = (await import('/src/audio.js')).audio, V = window.__voice, g = __game;
        // (back from the last line first: 0.6 s)
        for (let k = 0; k < 30 && Au.duckLevel < 0.97; k++) await new Promise((ok) => setTimeout(ok, 100));
        const before = Au.duckLevel;
        g.say(g.player, A, 1.5);
        await new Promise((ok) => setTimeout(ok, 500));
        const during = Au.duckLevel;
        await V.waitQuiet(0.2, 6);
        await new Promise((ok) => setTimeout(ok, 1500));
        return { before, during, after: Au.duckLevel };
      }, A);
      T.log('the music under speech:', JSON.stringify(d6));
      check(d6.before > 0.9 && d6.during < 0.6 && d6.after > 0.9, 'the music did not duck under speech and come back');
      // 7. The pause holds a line where it is, and it goes on afterwards.
      const d7 = await T.ev(async (C) => {
        const V = window.__voice, g = __game;
        V.log.length = 0;
        const u = V.play('ole', C, { slot: 'bubble', mode: 'world', at: g.npc('ole') });
        await new Promise((ok) => setTimeout(ok, 700));
        V.pause(true);
        const left0 = u.left();
        await new Promise((ok) => setTimeout(ok, 1500));
        const left1 = u.left(), stateP = u.state;
        V.pause(false);
        await u.ended;
        return { left0, left1, stateP, cut: V.log[0].cut, took: V.log[0].t1 - V.log[0].t0 };
      }, C);
      T.log('paused:', JSON.stringify(d7));
      check(d7.stateP === 'playing' && Math.abs(d7.left0 - d7.left1) < 0.1 && d7.cut < 0.1, 'the pause did not hold the line where it was');
      // 8. The voices off: play() is null.
      const d8 = await T.ev(() => { const V = window.__voice; V.setEnabled(false); const u = V.play('ole', 'Det går nog bra.', {}); V.setEnabled(true); return u === null; });
      check(d8, 'the voices off still played');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  async vstory(T) {
    // (story's own reloads keep the voices on)
    process.env.QUERY = (process.env.QUERY || '') + '&voice';
    if (!process.env.FROM) await T.fresh();
    await T.until(() => window.__voice?.manifest && window.__voice.enabled, 30000);
    let err = null;
    try { await CORE.story(T); } catch (e) { err = e; }
    await measure(T, 'story with voices');
    if (err) throw err;
  },
};
