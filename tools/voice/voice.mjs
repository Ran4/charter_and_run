// The voice clips (DESIGN §12.4, features/implemented/roster.md): every line in
// src/content/script.js's allLines() spoken by its role's ElevenLabs voice, made ahead of time and
// checked in. The game never calls the API; it reads assets/voice/index.json and plays
// assets/voice/<who>/<hash>.mp3. Copied from the Saab game's tools/voice/voice.mjs and adapted:
// three languages (a role's `lang` in cast.json: sv, no or es; a Spanish role says its Swedish
// subtitle in Spanish, the line's `tts` in lines.json), no children, no Voice Design.
//
//   node tools/voice/voice.mjs [--dry] [--who a,b] [--part p] [--limit n] [--max chars] [--all] [--prune]
//        what is missing (in scope) gets made, heard by a local recogniser for its language, retaken
//        up to twice, processed and written to the manifest. --dry: only say what would be made and
//        what it would cost. --part p: only the lines whose part starts with p (scope or not: a new
//        feature's lines, `feature:<name>`). --all ignores cast.json's scope. --prune removes clips
//        no line uses. Nothing is made past --max characters (default 25 000).
//   node tools/voice/voice.mjs check         no requests: lines without a clip, orphans; exit 1 if
//                                             anything in scope is missing (a test can run it)
//   node tools/voice/voice.mjs reprocess [--who a,b]   redo trimming, loudness, lip curves from .cache
//   node tools/voice/voice.mjs qc [--all]    listen again to the takes in use (free): qc.json
//   node tools/voice/voice.mjs hear [--who a,b]   listen to the clips as the game plays them (free)
//   node tools/voice/voice.mjs manifest      just rewrite assets/voice/index.json
//   node tools/voice/voice.mjs cast <who> [--search n]
//        auditions: each candidate in cast.json says the role's preview text (paid), measured, for the
//        review page (make voice-review). A voice already auditioned for another role is copied.
//   node tools/voice/voice.mjs choose <who> <voice_id | none>
//
// The files: tools/voice/cast.json (the roles: voice, language, settings, candidates, scope),
// lines.json (direction per line: { who: { text: { tts, lang, retake, takes, skip, locked, hash,
// note, lufs } } }: `tts` what the voice says instead of the subtitle, `takes` n clips said in turn
// for a line said often, `skip` not voiced), qc.json (what the recogniser heard, per clip),
// .cache/voice/ (raw takes and auditions: not checked in).
// A clip's name is a hash of who, the spoken text, the language, the voice, model, settings, the
// retake and the take number, and its seed comes from the same hash: change any of it and the clip
// is missing (made next run) and the old one is an orphan. The API key is read from .env
// (ELEVENLABS_API_KEY) and only ever goes into a request header. Any API error stops the run; a
// network blip gets one more try.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scriptLines } from './script.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'tools/voice');
const CONF = path.join(DIR, 'cast.json'), LINES = path.join(DIR, 'lines.json'), QCF = path.join(DIR, 'qc.json');
const CACHE = path.join(ROOT, '.cache/voice'), RAW = path.join(CACHE, 'raw'), CASTDIR = path.join(CACHE, 'cast');
const OUT = path.join(ROOT, 'assets/voice'), MANIFEST = path.join(OUT, 'index.json');
const API = 'https://api.elevenlabs.io';
const WORKERS = 2;                 // the plan allows three requests at a time
const TP = -1.5, KBPS = 64, SR = 44100, FPS = 30;
const RETAKES = 2;                 // automatic retakes of a take the recogniser rejects
const LIP = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';   // 64 mouth levels

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] != null && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const cmd = args[0] && !args[0].startsWith('--') ? args[0] : 'gen';
const readJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const writeJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1) + '\n'); };
const conf = readJson(CONF);
const direction = readJson(LINES, {});
const saveConf = () => fs.writeFileSync(CONF, JSON.stringify(conf, null, 2) + '\n');
const saveLines = () => fs.writeFileSync(LINES, JSON.stringify(sorted(direction), null, 1) + '\n');
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex');
const rel = (f) => path.relative(ROOT, f);
// (keys sorted: two features adding lines at once touch different lines of the file)
function sorted(o) { const out = {}; for (const k of Object.keys(o).sort()) out[k] = o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? sorted(o[k]) : o[k]; return out; }

// ---------------------------------------------------------------------------------------------
// The API

function apiKey() {
  const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const m = env.match(/^\s*(?:export\s+)?ELEVENLABS_API_KEY\s*=\s*["']?([^"'\s]+)/m);
  if (!m) throw new Error('.env has no ELEVENLABS_API_KEY');
  return m[1];
}
export class ApiError extends Error {}
export async function api(p, body, { method = 'POST', accept = 'application/json' } = {}) {
  let r;
  for (let tries = 0, busy = 0; ; tries++) {
    try {
      r = await fetch(API + p, { method, body: body && JSON.stringify(body), headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json', Accept: accept } });
    } catch (e) { if (tries) throw e; await new Promise((ok) => setTimeout(ok, 3000)); continue; }   // a network blip: once more
    // A Voice Library voice is added to the account by its first request: two at once for the same
    // new voice get 409 already_running (nothing made, nothing charged). Wait and ask again.
    if (r.status === 409 && busy < 3) { const t = await r.clone().text(); if (/already_running/.test(t)) { busy++; await new Promise((ok) => setTimeout(ok, 2500 * busy)); continue; } }
    break;
  }
  if (!r.ok) {
    let msg = await r.text();
    try { const d = JSON.parse(msg).detail; msg = typeof d === 'string' ? d : [d?.status, d?.message].filter(Boolean).join(': ') || JSON.stringify(d); } catch {}
    throw new ApiError(`HTTP ${r.status} ${p.split('?')[0]}: ${String(msg).slice(0, 300)}`);
  }
  const cost = r.headers.get('character-cost');
  return { r, cost: cost == null ? null : Number(cost) };
}

// ---------------------------------------------------------------------------------------------
// The plan: every line, its clip(s), whether it is in scope

// Lines a person should look at rather than a machine: nothing but punctuation (Siv's "…"),
// interjections, digits and abbreviations. Two words or fewer are never rejected automatically.
const INTERJ = /^(hm+|mm+|aj|oj|au|oi|jaha|jaså|jaja|nej|nei|ja|tja|äh|öh|sch|usch|uff|ay|uy|zzz)$/i;
const words = (t) => t.replace(/\[[^\]]*\]/g, ' ').split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}-]/gu, '')).filter(Boolean);
// Something to say: words, or an audio tag ("[sighs] …" for a line that is only "…").
const sayable = (t) => words(t).length > 0 || /\[[^\]]+\]/.test(t);
function humanFlags(text, spoken) {
  const f = [], w = words(spoken);
  if (!w.length) f.push('punctuation');
  else if (w.every((x) => INTERJ.test(x))) f.push('interjection');
  if (/\d/.test(spoken)) f.push('digits');
  if (/\b[A-ZÅÄÖ]{2,}\b/.test(spoken) && !/^[A-ZÅÄÖ]+[.!?]*$/.test(spoken)) f.push('caps');
  return f;
}
export const short = (spoken) => words(spoken).length <= 2 || words(spoken).every((x) => INTERJ.test(x));

const settingsOf = (who) => ({ ...conf.settings, ...conf.roles[who]?.settings });
const langOf = (who, text) => direction[who]?.[text]?.lang || conf.roles[who]?.lang || conf.language || 'sv';
// tools/voice/lexicon.pls: aliases (<grapheme> -> <alias>, per language) applied to what the voice
// is asked to say.
const LEX = (() => {
  const f = path.join(DIR, 'lexicon.pls');
  if (!fs.existsSync(f)) return [];
  return [...fs.readFileSync(f, 'utf8').matchAll(/<lexeme(?:\s+lang="(\w+)")?>\s*<grapheme>([^<]+)<\/grapheme>\s*<alias>([^<]+)<\/alias>\s*<\/lexeme>/g)]
    .map(([, lang, g, a]) => [lang || null, new RegExp(`(?<![\\p{L}])${g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'gu'), a]);
})();
const alias = (t, lang) => LEX.reduce((s, [l, re, a]) => (!l || l === lang ? s.replace(re, a) : s), t);
// cast.json's scope: the parts of the script `make voice` makes (`parts`, less `not`), and only for a
// speaker with a role there (a passer-by of the pool waits for version 2: features/roster_v2.md).
const partIn = (part, list) => (list || []).some((p) => part === p || part.startsWith(p + ':'));
const inScope = (who, part) => !conf.scope || conf.scope.who?.includes(who) || (!!conf.roles[who] && partIn(part, conf.scope.parts) && !partIn(part, conf.scope.not));

export async function plan() {
  const out = [];
  for (const { who, text, part } of await scriptLines()) {
    const role = conf.roles[who] || null, d = direction[who]?.[text] || {};
    const lang = langOf(who, text), spoken = alias(d.tts || text, lang), id = role?.voice_id || null, take = d.retake || 0;
    // (a line said often has `takes` clips, said in turn: each its own hash and seed)
    for (let alt = 0; alt < Math.max(1, d.takes || 1); alt++) {
      const locked = d.locked && d.hash && !alt ? d.hash : null;
      const hash = locked || (id && sayable(spoken) && !d.skip ? sha([who, spoken, lang, id, conf.model, JSON.stringify(settingsOf(who)), ...(take ? [take] : []), ...(alt ? ['alt' + alt] : [])].join('\0')).slice(0, 12) : null);
      const file = hash && `${who}/${hash}.mp3`;
      out.push({ who, text, part, lang, spoken, id, take, alt, hash, file, inScope: inScope(who, part), skip: !!d.skip, have: !!file && fs.existsSync(path.join(OUT, file)), flags: humanFlags(text, spoken) });
    }
  }
  return out;
}

function table(list, credits = true) {
  const by = {};
  for (const l of list) { const b = (by[l.who] ||= { lines: 0, chars: 0 }); b.lines++; b.chars += l.spoken.length; }
  let n = 0, c = 0;
  for (const [who, b] of Object.entries(by).sort((a, b) => b[1].chars - a[1].chars)) {
    console.log(`  ${who.padEnd(11)} ${String(b.lines).padStart(4)} lines ${String(b.chars).padStart(6)} chars${credits ? ` ≈ ${Math.ceil(b.chars * conf.creditsPerChar)} credits` : ''}`);
    n += b.lines; c += b.chars;
  }
  console.log(`  ${'total'.padEnd(11)} ${String(n).padStart(4)} lines ${String(c).padStart(6)} chars${credits ? ` ≈ ${Math.ceil(c * conf.creditsPerChar)} credits (${conf.model}, ${conf.creditsPerChar}/char)` : ''}`);
  return c;
}

function orphans(lines) {
  const used = new Set(lines.filter((l) => l.file).map((l) => l.file)), out = [];
  for (const d of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) {
    const p = path.join(OUT, d);
    if (!fs.statSync(p).isDirectory()) continue;
    for (const f of fs.readdirSync(p)) if (!used.has(`${d}/${f}`)) out.push(`${d}/${f}`);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Processing a raw take: trim, level, limit, mono mp3; the lip curve and the per-character times

function decode(file) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
}
const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));
function rmsFrames(pcm, hop) {
  const out = [];
  for (let i = 0; i < pcm.length; i += hop) {
    let s = 0; const e = Math.min(pcm.length, i + hop);
    for (let k = i; k < e; k++) s += pcm[k] * pcm[k];
    out.push(Math.sqrt(s / Math.max(1, e - i)));
  }
  return out;
}
// Where the speech starts and ends: 10 ms frames over the threshold (45 dB under the loudest frame,
// and never below -60 dBFS), keeping a 40 ms breath before and 100 ms after.
function speechBounds(pcm) {
  const hop = SR / 100, f = rmsFrames(pcm, hop), peak = Math.max(...f.map(db));
  const thr = Math.max(peak - 45, -60);
  let a = f.findIndex((v) => db(v) > thr), b = f.length - 1 - [...f].reverse().findIndex((v) => db(v) > thr);
  if (a < 0) { a = 0; b = f.length - 1; }
  const dur = pcm.length / SR;
  return [Math.max(0, a / 100 - 0.04), Math.min(dur, (b + 1) / 100 + 0.1)];
}
function writeWav(file, pcm) {
  const b = Buffer.alloc(44 + pcm.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + pcm.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(pcm.length * 2, 40);
  for (let i = 0; i < pcm.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
}
// Integrated loudness (LUFS) of a wav; a clip under ~0.4 s can't be measured, so it is looped.
function lufsOf(wav) {
  const measure = (loop) => {
    const e = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-stream_loop', String(loop), '-i', wav, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    const i = Number(JSON.parse(e.slice(e.lastIndexOf('{'), e.lastIndexOf('}') + 1)).input_i);
    return Number.isFinite(i) && i > -70 ? i : null;
  };
  return measure(0) ?? measure(4);
}
// The mouth: loudness every 1/30 s mapped to 0..1 (opens at once, closes over ~80 ms), shut on m,
// b and p (from the character times: the lips meet there however loud the vowel around it is).
function lipCurve(pcm, gain, times) {
  const f = rmsFrames(pcm, SR / FPS).map((v) => db(v * gain));
  const out = [];
  let y = 0;
  const rel = Math.exp(-1 / FPS / 0.08);
  for (const d of f) { const x = Math.max(0, Math.min(1, (d + 48) / 34)); y = Math.max(x, y * rel); out.push(y); }
  for (const [ch, t0, t1] of times) if (/[mbpMBP]/.test(ch)) {
    const a = Math.floor(t0 * FPS), b = Math.max(a, Math.floor((t0 + (t1 - t0) * 0.6) * FPS));
    for (let k = a; k <= b && k < out.length; k++) if (k >= 0) out[k] = 0;
  }
  return out.map((v) => LIP[Math.round(v * 63)]).join('');
}
// Each character of the line as written (the subtitle) gets the time it is said, in 1/100 s: from
// the API's alignment, shifted by the trim. A `tts` text that differs (Spanish under a Swedish
// subtitle, a number in words) is mapped across in proportion, so the subtitle types out with the
// speech.
function charTimes(text, spoken, al, shift) {
  if (!al?.characters?.length) return null;
  const st = al.character_start_times_seconds, chars = al.characters.join('');
  const k = chars.indexOf(text);
  const at = (j) => Math.max(0, st[Math.min(st.length - 1, Math.max(0, j))] - shift);
  const out = [];
  for (let i = 0; i < text.length; i++) out.push(Math.round(100 * (k >= 0 ? at(k + i) : at(Math.round(i * (chars.length - 1) / Math.max(1, text.length - 1))))));
  return out;
}

const lufsTarget = (l) => direction[l.who]?.[l.text]?.lufs ?? conf.roles[l.who]?.lufs ?? conf.lufs ?? -20;
function processTake(l) {
  const raw = path.join(RAW, l.who, l.hash + '.mp3'), al = readJson(path.join(RAW, l.who, l.hash + '.json'), {}).alignment;
  const pcm = decode(raw);
  const [a, b] = speechBounds(pcm);
  const seg = pcm.subarray(Math.floor(a * SR), Math.floor(b * SR));
  // (in memory where there is a /dev/shm: nothing on a disk that may be full)
  const tmp = path.join(fs.existsSync('/dev/shm') ? '/dev/shm' : CACHE, `charter-voice-${process.pid}-${l.hash}.wav`);
  fs.mkdirSync(CACHE, { recursive: true });
  writeWav(tmp, seg);
  const i = lufsOf(tmp), gainDb = i == null ? 0 : lufsTarget(l) - i;
  const out = path.join(OUT, l.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-hide_banner', '-nostats', '-loglevel', 'error', '-y', '-i', tmp, '-af', `volume=${gainDb.toFixed(2)}dB,alimiter=limit=${(10 ** (TP / 20)).toFixed(3)}:level=0`,
    '-ar', String(SR), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', `${KBPS}k`, out]);
  fs.rmSync(tmp);
  if (!(fs.statSync(out).size > 0)) { fs.rmSync(out); throw new Error(`ffmpeg wrote nothing for ${l.file} (a full disk?)`); }
  const times = al ? al.characters.map((c, j) => [c, al.character_start_times_seconds[j] - a, al.character_end_times_seconds[j] - a]) : [];
  const meta = { f: `${l.who}/${l.hash}.mp3`, d: Math.round(seg.length / SR * 100) / 100, t: charTimes(l.text, l.spoken, al, a), lip: lipCurve(seg, 10 ** (gainDb / 20), times), lufs: i == null ? null : Math.round(i * 10) / 10 };
  writeJson(path.join(RAW, l.who, l.hash + '.meta.json'), meta);
  return meta;
}

// The manifest the game reads: { _fps, who: { text: clip | [clip, ...] } }, clip = { f, d, t, lip }
// (a line with `takes` has a list, said in turn). Built from the plan and each clip's metadata (from
// .cache, else the manifest it replaces). Written one clip to a line, sorted, so that two features
// adding clips at once merge in git; after a conflict, take either side and run `manifest`.
function writeManifest(lines) {
  const old = readJson(MANIFEST, {}), byFile = {};
  for (const [who, o] of Object.entries(old)) if (!who.startsWith('_')) for (const v of Object.values(o)) for (const m of [].concat(v)) byFile[m.f] = m;
  const m = {};
  for (const l of lines) {
    if (!l.have) continue;
    const meta = readJson(path.join(RAW, l.who, l.hash + '.meta.json'), null) || byFile[l.file];
    if (!meta) continue;
    const { lufs, ...keep } = meta;
    const o = (m[l.who] ||= {});
    o[l.text] = o[l.text] ? [].concat(o[l.text], keep) : keep;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const rows = [`{"_fps":${FPS}`];
  for (const who of Object.keys(m).sort()) {
    rows.push(`,${JSON.stringify(who)}:{`);
    Object.keys(m[who]).sort().forEach((t, k) => rows.push(`${k ? ',' : ''}${JSON.stringify(t)}:${JSON.stringify(m[who][t])}`));
    rows.push('}');
  }
  fs.writeFileSync(MANIFEST, rows.join('\n') + '\n}\n');
  return m;
}
// chars/s per role, the median over its clips (the pace check; the game works it out itself)
function tempoOf(man) {
  const out = {};
  for (const [who, o] of Object.entries(man)) {
    if (who.startsWith('_')) continue;
    const r = [];
    for (const [t, v] of Object.entries(o)) for (const c of [].concat(v)) if (c.d > 0.6) r.push(t.length / c.d);
    if (r.length) { r.sort((x, y) => x - y); out[who] = r[r.length >> 1]; }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Listening: tools/voice/analyze.py (faster-whisper per language, and Praat)

export function analyze(jobs) {
  if (!jobs.length) return [];
  const r = spawnSync('uv', ['run', '--quiet', path.join(DIR, 'analyze.py')], { input: jobs.map((j) => JSON.stringify(j)).join('\n') + '\n', encoding: 'utf8', maxBuffer: 1 << 26, cwd: ROOT });
  if (r.status !== 0) throw new Error('analyze.py failed: ' + (r.stderr || '').slice(-600));
  return r.stdout.trim().split('\n').filter(Boolean).map((s) => JSON.parse(s));
}
// A take is rejected when the recogniser heard other words (WER over 0.25), or when it is far too
// slow or fast for the role. Short lines and interjections are never rejected: they go to review.
function verdict(l, a, tempo) {
  const cps = l.spoken.replace(/\[[^\]]*\]\s*/g, '').length / Math.max(0.2, a.dur - 0.14);
  const flags = [];
  if (a.wer > 0.25) flags.push('words');
  if (tempo && (cps < tempo * 0.45 || cps > tempo * 2.2)) flags.push('pace');
  const isShort = short(l.spoken) || l.flags.length;
  return { cps: Math.round(cps * 10) / 10, flags, verdict: !flags.length && !(isShort && a.wer > 0) ? 'ok' : isShort ? 'review' : 'retake' };
}
const rawOf = (l) => path.join(RAW, l.who, l.hash + '.mp3');
const jobOf = (l, file = rawOf(l)) => ({ file, text: l.spoken, lang: l.lang });

// ---------------------------------------------------------------------------------------------
// Making clips

async function take(l, log) {
  const rawDir = path.join(RAW, l.who), raw = rawOf(l);
  if (fs.existsSync(raw)) { log(`${l.who} raw take already here (no request)`); return 0; }
  const body = { text: l.spoken, model_id: conf.model, language_code: l.lang, voice_settings: settingsOf(l.who), seed: parseInt(l.hash.slice(0, 8), 16) };
  const { r, cost } = await api(`/v1/text-to-speech/${l.id}/with-timestamps?output_format=mp3_44100_128`, body);
  const j = await r.json();
  fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(raw, Buffer.from(j.audio_base64, 'base64'));
  writeJson(path.join(rawDir, l.hash + '.json'), { who: l.who, text: l.text, spoken: l.spoken, lang: l.lang, voice: l.id, model: conf.model, take: l.take, alt: l.alt, cost, alignment: j.alignment, normalized: j.normalized_alignment });
  log(`${l.who} ${l.spoken.length} chars, cost ${cost ?? '?'}: ${l.spoken.slice(0, 64)}`);
  return cost ?? l.spoken.length * conf.creditsPerChar;
}

const same = (a, b) => a.who === b.who && a.text === b.text && a.alt === b.alt;

async function generate() {
  const max = Number(opt('--max', 25000)), only = opt('--who')?.split(','), limit = Number(opt('--limit', Infinity)), part = opt('--part');
  const dry = flag('--dry'), all = flag('--all') || !!part;
  let lines = await plan();
  const total = lines.reduce((s, l) => s + l.spoken.length, 0);
  console.log(`script: ${lines.length} clips' lines, ${total} chars; clips on disk ${lines.filter((l) => l.have).length}`);
  const want = (l) => (all || l.inScope) && (!part || l.part === part || l.part.startsWith(part + ':'));
  const scoped = lines.filter(want), outside = lines.filter((l) => !want(l));
  console.log(`in scope (${part ? `part ${part}` : all || !conf.scope ? 'everything' : `part ${conf.scope.parts.join(', ')}`}):`);
  table(scoped, false);
  if (outside.length) { console.log('outside the scope (they beep until the scope grows):'); table(outside, false); }
  const noVoice = scoped.filter((l) => !l.id && !l.skip && sayable(l.spoken));
  if (noVoice.length) { console.log('in scope but the role has no voice yet (cast.json):'); table(noVoice, false); }
  const skipped = scoped.filter((l) => l.skip);
  if (skipped.length) console.log(`not voiced by choice (lines.json "skip"): ${skipped.map((l) => `${l.who} "${l.text}"`).join(', ')}`);
  const silent = scoped.filter((l) => !sayable(l.spoken));
  if (silent.length) console.log(`nothing to say (punctuation only; give it a "tts" in lines.json to voice it): ${silent.map((l) => `${l.who} "${l.text}"`).join(', ')}`);
  let todo = scoped.filter((l) => l.id && l.hash && !l.have && (!only || only.includes(l.who)));
  if (only) todo = only.flatMap((w) => todo.filter((l) => l.who === w).slice(0, limit)); else todo = todo.slice(0, limit);
  console.log('to make now:');
  const chars = table(todo);
  const human = todo.filter((l) => l.flags.length);
  if (human.length) console.log(`for a person to check afterwards: ${human.map((l) => `${l.who} "${l.text}" (${l.flags.join(', ')})`).join('; ')}`);
  const orph = orphans(lines), prune = flag('--prune') && !dry;
  if (orph.length) console.log(`${orph.length} clips no line uses any more${prune ? ': removed' : ' (PRUNE=1 removes them)'}`);
  if (prune) for (const o of orph) fs.rmSync(path.join(OUT, o));
  if (dry) return;
  if (chars * conf.creditsPerChar > max) { console.log(`REFUSED: ${chars} chars is over the cap of ${max} (MAX=n). Nothing made.`); process.exitCode = 1; return; }
  if (!todo.length) { writeManifest(lines); console.log('nothing to make; manifest rewritten'); return; }

  const qc = readJson(QCF, {});
  let spent = 0, abort = null;
  const unmade = [];
  const tempo = tempoOf(readJson(MANIFEST, {}));
  for (let round = 0; round <= RETAKES && todo.length && !abort; round++) {
    if (round) console.log(`retakes, round ${round}: ${todo.length}`);
    const queue = [...todo];
    let n = 0;
    const worker = async () => {
      while (queue.length && !abort) {
        const l = queue.shift();
        if (spent > max) { abort ||= `cap of ${max} reached`; return; }
        try { const c = await take(l, (s) => console.log(`[${++n}/${todo.length}] ${s}`)); spent += c; } catch (e) { abort ||= e.message; }
      }
    };
    await Promise.all(Array.from({ length: WORKERS }, worker));
    // Listen to everything that came back, process what passed, retake what didn't. (A retake the
    // cap stopped falls back to its line's best take, below.)
    const got = todo.filter((l) => fs.existsSync(rawOf(l)));
    if (round) unmade.push(...todo.filter((l) => !fs.existsSync(rawOf(l))));
    // (a take already listened to - a run that died before processing it - isn't heard again)
    const known = (l) => qc[l.hash] && qc[l.hash].take === l.take && qc[l.hash].text === l.text && qc[l.hash].dur != null;
    const fresh = analyze(got.filter((l) => !known(l)).map((l) => jobOf(l)));
    const heard = got.map((l) => (known(l) ? qc[l.hash] : fresh.shift()));
    const again = [], keep = [];
    for (const [k, l] of got.entries()) {
      const a = heard[k], v = verdict(l, a, tempo[l.who]);
      qc[l.hash] = { who: l.who, text: l.text, take: l.take, alt: l.alt, lang: l.lang, heard: a.heard, wer: a.wer, f0: a.f0, cps: v.cps, flags: v.flags, verdict: v.verdict, dur: a.dur };
      // (a line with takes is retaken as a whole only for its first take; another take that is
      // rejected goes to review)
      if (v.verdict === 'retake' && !l.alt && l.take < RETAKES + (direction[l.who]?.[l.text]?.retakeBase || 0) && round < RETAKES) {
        const d = ((direction[l.who] ||= {})[l.text] ||= {});
        d.retake = (d.retake || 0) + 1; d.auto = true;
        again.push(l);
        console.log(`  rejected (${v.flags.join(', ')}; heard "${a.heard}"): ${l.who} "${l.text}" -> retake ${d.retake}`);
        continue;
      }
      if (v.verdict !== 'ok') console.log(`  for review (${v.flags.join(', ') || 'short line'}; heard "${a.heard}"): ${l.who} "${l.text}"`);
      keep.push(l);
    }
    // (what was heard and the retakes are written before the processing: a run that dies there,
    // a full disk say, doesn't lose them)
    writeJson(QCF, qc);
    if (again.length) saveLines();
    for (const l of keep) processTake(l);
    if (again.length) {
      const fresh = await plan();
      todo = again.map((l) => fresh.find((x) => same(x, l)));
    } else todo = [];
  }
  // A retake the cap stopped (in the round it hit, or planned for the next) falls back to the line's
  // best take so far: the one of this voice and text the recogniser liked best.
  const fallback = [...unmade, ...todo];
  for (const l of fallback) {
    const mine = ([h, q]) => { const r = readJson(path.join(RAW, l.who, h + '.json'), {}); return q.who === l.who && q.text === l.text && !q.alt && r.voice === l.id && r.spoken === l.spoken; };
    const best = Object.entries(qc).filter(mine).sort((a, b) => a[1].wer - b[1].wer)[0];
    if (!best) continue;
    const d = direction[l.who][l.text];
    if (best[1].take) d.retake = best[1].take; else delete d.retake;
    d.note = `retake ${l.take} not made (the cap); kept the take with WER ${best[1].wer}`;
  }
  if (fallback.length) {
    saveLines();
    const fresh = await plan();
    for (const l of fallback) { const f = fresh.find((x) => same(x, l)); if (f && fs.existsSync(rawOf(f))) processTake(f); }
  }
  writeJson(QCF, qc);
  lines = await plan();
  const m = writeManifest(lines);
  console.log(`credits spent this run: ${Math.round(spent)}; manifest: ${Object.values(m).reduce((s, o) => s + Object.values(o).reduce((t, v) => t + [].concat(v).length, 0), 0)} clips`);
  if (abort) { console.log('ABORTED:', abort); process.exitCode = 1; }
}

async function check() {
  const lines = await plan();
  const scoped = lines.filter((l) => l.inScope && !l.skip && sayable(l.spoken));
  const missing = scoped.filter((l) => !l.have);
  const man = readJson(MANIFEST, {});
  const unlisted = lines.filter((l) => l.have && ![].concat(man[l.who]?.[l.text] || []).some((c) => c.f === l.file));
  const orph = orphans(lines);
  console.log(`${lines.length} clips' lines; ${scoped.length} in scope and voiced; ${lines.filter((l) => l.have).length} clips`);
  if (missing.length) { console.log(`MISSING (${missing.length}):`); for (const l of missing) console.log(`  ${l.who} [${l.part}] ${l.id ? '' : '(no voice) '}"${l.text}"`); }
  if (unlisted.length) console.log(`not in the manifest (run: node tools/voice/voice.mjs manifest): ${unlisted.length}`);
  if (orph.length) console.log(`orphans (PRUNE=1 removes them): ${orph.join(', ')}`);
  const review = Object.values(readJson(QCF, {})).filter((q) => q.verdict !== 'ok' && lines.some((l) => l.have && l.who === q.who && l.text === q.text && l.take === q.take && (l.alt || 0) === (q.alt || 0)));
  if (review.length) console.log(`on the review list: ${review.length} (make voice-review)`);
  if (missing.length || unlisted.length) process.exitCode = 1;
  else console.log('voice-check ok');
}

// Listen again to the takes in use (no requests): qc.json's verdicts after a change to the check.
async function requalify() {
  const qc = readJson(QCF, {}), tempo = tempoOf(readJson(MANIFEST, {}));
  // (--all: every take in use; else only those with no verdict for this very take)
  const lines = (await plan()).filter((l) => l.hash && fs.existsSync(rawOf(l)) && (flag('--all') || !(qc[l.hash] && qc[l.hash].take === l.take && qc[l.hash].text === l.text)));
  const heard = analyze(lines.map((l) => jobOf(l)));
  for (const [k, l] of lines.entries()) {
    const a = heard[k], v = verdict(l, a, tempo[l.who]);
    qc[l.hash] = { who: l.who, text: l.text, take: l.take, alt: l.alt, lang: l.lang, heard: a.heard, wer: a.wer, f0: a.f0, cps: v.cps, flags: v.flags, verdict: v.verdict, dur: a.dur };
  }
  writeJson(QCF, qc);
  const n = (v) => lines.filter((l) => qc[l.hash].verdict === v).length;
  console.log(`listened to ${lines.length} takes: ok ${n('ok')}, review ${n('review')}, rejected ${n('retake')}`);
  for (const l of lines) if (qc[l.hash].verdict !== 'ok') console.log(`  ${qc[l.hash].verdict} (${qc[l.hash].flags.join(', ') || 'short line'}; heard "${qc[l.hash].heard}"): ${l.who} "${l.text}"`);
}

// Listen to the clips in use as the game plays them (assets/voice/: trimmed and levelled), per role:
// the pitch, and whether the recogniser still understands the longer lines. No requests, nothing
// written.
async function hear() {
  const only = opt('--who')?.split(','), qc = readJson(QCF, {});
  const lines = (await plan()).filter((l) => l.have && (!only || only.includes(l.who)));
  const got = analyze(lines.map((l) => jobOf(l, path.join(OUT, l.file))));
  const by = {};
  for (const [k, l] of lines.entries()) (by[l.who] ||= []).push({ l, a: got[k] });
  const q = (v, p) => { v = v.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[Math.round(p * (v.length - 1))] : null; };
  const mean = (v) => (v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length * 1000) / 1000 : null);
  for (const [who, r] of Object.entries(by)) {
    const f0 = r.map(({ a }) => a.f0), long = r.filter(({ l }) => !short(l.spoken));
    console.log(`${who.padEnd(14)} ${String(r.length).padStart(3)} clips  pitch ${q(f0, 0.5)} Hz (lines ${q(f0, 0.1)}-${q(f0, 0.9)})  understood ${long.filter(({ a }) => a.wer <= 0.25).length}/${long.length} longer lines, WER ${mean(long.map(({ a }) => a.wer))} (before the processing ${mean(long.map(({ l }) => qc[l.hash]?.wer).filter((x) => x != null))})`);
    for (const { l, a } of long) if (a.wer > 0.25) console.log(`    heard "${a.heard}" for "${l.spoken}" (WER ${a.wer})`);
  }
}

async function reprocess() {
  const lines = await plan(), only = opt('--who')?.split(',');
  let n = 0;
  for (const l of lines) if (l.hash && (!only || only.includes(l.who)) && fs.existsSync(rawOf(l))) { processTake(l); l.have = true; n++; }
  writeManifest(lines);
  console.log(`reprocessed ${n} clips`);
}

// ---------------------------------------------------------------------------------------------
// Casting

// The role's preview text: its previewText, else its own lines (in scope first), 140-230 chars,
// in the role's language (the `tts` of a Spanish role's lines).
async function previewText(who) {
  const role = conf.roles[who];
  if (role.previewText) return role.previewText;
  const own = (await plan()).filter((l) => l.who === who && !l.alt && sayable(l.spoken) && !short(l.spoken)).sort((a, b) => b.inScope - a.inScope);
  let t = '';
  for (const l of own) { if (t.length >= 140) break; if (t.length + l.spoken.length < 230) t += (t ? ' ' : '') + l.spoken; }
  return t;
}

async function searchLibrary(who, n) {
  const role = conf.roles[who], L = role.library || {}, lang = role.lang || conf.language;
  const q = new URLSearchParams({ page_size: '100', language: lang });
  if (L.gender) q.set('gender', L.gender);
  const { r } = await api('/v1/shared-voices?' + q, null, { method: 'GET' });
  const have = new Set((role.candidates || []).map((c) => c.voice_id));
  const ok = (await r.json()).voices.filter((v) => v.language === (L.native || lang) && v.rate === 1 && !have.has(v.voice_id) && (!L.age || L.age.includes(v.age)) && (!L.accent || L.accent.includes(v.accent)));
  const add = ok.slice(0, n).map((v) => ({ voice_id: v.voice_id, owner: v.public_owner_id, name: v.name.trim(), lang: v.language, accent: v.accent, age: v.age, gender: v.gender, notice_days: v.notice_period, about: (v.description || '').replace(/\s+/g, ' ').slice(0, 200) }));
  (role.candidates ||= []).push(...add);
  saveConf();
  console.log(`${who}: ${add.length} new Voice Library candidates: ${add.map((c) => c.name).join(', ') || 'none'}`);
}

async function cast(who) {
  const role = conf.roles[who];
  if (!role) throw new Error(`cast.json has no role ${who}`);
  if (opt('--search')) await searchLibrary(who, Number(opt('--search')));
  const text = await previewText(who), lang = role.lang || conf.language;
  if (text.length < 20) throw new Error(`${who}: no preview text (set previewText in cast.json)`);
  const dir = path.join(CASTDIR, who), idx = path.join(dir, 'index.json');
  fs.mkdirSync(dir, { recursive: true });
  const list = readJson(idx, []);
  let spent = 0;
  const elsewhere = (id) => {
    for (const d of fs.existsSync(CASTDIR) ? fs.readdirSync(CASTDIR) : []) {
      const x = d !== who && readJson(path.join(CASTDIR, d, 'index.json'), []).find((y) => y.id === id && y.kind === 'library');
      if (x && fs.existsSync(path.join(ROOT, x.file))) return { ...x, from: d };
    }
    return null;
  };
  for (const c of role.candidates || []) {
    if (c.audition === false) continue;   // (chosen on its free preview: no paid audition)
    const file = path.join(dir, c.voice_id + '.mp3');
    let entry = list.find((x) => x.id === c.voice_id && x.kind === 'library');
    if (!fs.existsSync(file)) {
      const src = elsewhere(c.voice_id);
      if (src) {
        fs.copyFileSync(path.join(ROOT, src.file), file);
        console.log(`${who}: ${c.name}: the audition made for ${src.from} (no request)`);
        if (!entry) list.push(entry = { id: c.voice_id, kind: 'library', name: c.name, accent: c.accent, age: c.age, lang, file: rel(file), text: src.text });
      } else {
        const { r, cost } = await api(`/v1/text-to-speech/${c.voice_id}?output_format=mp3_44100_128`, { text, model_id: conf.model, language_code: lang, voice_settings: conf.settings, seed: 1 }, { accept: 'audio/mpeg' });
        fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
        spent += cost ?? 0;
        console.log(`${who}: ${c.name} said ${text.length} chars (cost ${cost ?? '?'})`);
      }
    }
    if (!entry) list.push(entry = { id: c.voice_id, kind: 'library', name: c.name, accent: c.accent, age: c.age, lang, file: rel(file), text });
  }
  // Measure what isn't measured yet: what the recogniser heard, the pitch, the pace.
  const todo = list.filter((x) => x.wer == null);
  const res = analyze(todo.map((x) => ({ file: path.join(ROOT, x.file), text: x.text, lang: x.lang || lang })));
  for (const [k, x] of todo.entries()) { const a = res[k]; Object.assign(x, { heard: a.heard, wer: a.wer, f0: a.f0, f0lo: a.f0lo, f0hi: a.f0hi, dur: a.dur, cps: Math.round(x.text.length / a.dur * 10) / 10 }); }
  writeJson(idx, list);
  console.log(`${who}: ${list.length} candidates (credits spent ${spent}):`);
  for (const x of list) console.log(`  ${(x.id === role.voice_id ? '*' : ' ')} ${x.name.slice(0, 34).padEnd(34)} ${String(x.f0).padStart(6)} Hz (${x.f0lo}-${x.f0hi})  ${String(x.cps).padStart(5)} chars/s  WER ${x.wer}`);
}

async function choose(who, id) {
  const role = conf.roles[who];
  if (!role) throw new Error(`cast.json has no role ${who}`);
  if (id === 'none') Object.assign(role, { voice_id: null, name: null, source: null });
  else {
    const c = (role.candidates || []).find((x) => x.voice_id === id);
    Object.assign(role, { voice_id: id, name: c?.name || id, source: 'library' });
  }
  saveConf();
  console.log(`${who} -> ${role.voice_id} (${role.name}). Its clips are now missing: make voice DRY=1, then make voice.`);
}

const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  try {
    if (cmd === 'check') await check();
    else if (cmd === 'reprocess') await reprocess();
    else if (cmd === 'qc') await requalify();
    else if (cmd === 'hear') await hear();
    else if (cmd === 'manifest') { writeManifest(await plan()); console.log('manifest rewritten'); }
    else if (cmd === 'cast') await cast(args[1]);
    else if (cmd === 'choose') await choose(args[1], args[2]);
    else if (cmd === 'gen') await generate();
    else throw new Error('unknown command ' + cmd);
  } catch (e) { console.log(e instanceof ApiError ? 'ABORTED: ' + e.message : e.stack); process.exitCode = 1; }
}
