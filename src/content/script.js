// The voiced script (DESIGN §12.4, features/implemented/roster.md §5): every line said aloud, who
// says it and the part of the game it belongs to. tools/voice/voice.mjs voices it (a clip per
// speaker and text, assets/voice/) and the `vstory` scenario checks that the game says nothing a
// mission needs outside it. Pure: it imports only the data files (which import nothing), so Node
// imports it as it is.
//
//   allLines({ missions, speakers }) -> [{ who, text, part }]   (no duplicates: one per who + text)
//     missions: { name: source text } of src/game/missions/*.js (they import the stage kinds and
//       three, so they are read, not imported: missionLines below); speakers: the role keys a mission
//       tuple may start with (CHARS' keys, models.js). tools/voice/script.mjs passes both.
//   part: 'mission:<id>' (a mission's own lines), 'mission' (the stage kinds' shared lines),
//     'mantra', 'talk' (Prata med gänget, §10.28), 'skandal' (§7.2); after them, from
//     scriptFeatures.js, 'feature:<name>' (the free-roam features' tables), 'chatter' and 'barks'.
//     tools/voice/cast.json's `scope` says which are voiced: all but the chatter, the barks and two
//     features, for the speakers with a role (the rest is version 2, features/roster_v2.md). A new
//     table adds its generator to scriptFeatures.js with the part 'feature:<name>' (CLAUDE.md "Voices").
//   A line whose text is built while the game runs is listed in every form it takes (the clock in
//   Stig's answer: clockLine).
//
// Who says what is written out per table below; a speaker is a role key (CHARS), or 'guardia2', the
// second officer's voice (two voices take turns among the Guardia Civil, voice.voiceFor).

import { TALK_ISLAND, MIKROFON } from './island.js';
import { METERS } from '../meters.js';
import { S } from '../strings.js';
import { featureLines } from './scriptFeatures.js';

// The Guardia Civil's lines are said by both officers' voices.
const GUARDIA = ['guardia', 'guardia2'];

// The island's clock as an official reads it (§10.30, mic.js): "tre", "halv fyra" (a quarter past to
// a quarter to), "fyra". h: hours, fractional.
export function clockWords(h) {
  const w = (n) => MIKROFON.hours[((n % 12) + 12) % 12];
  const H = Math.floor(h), m = Math.floor((h - H) * 60 + 1e-6);
  if (m < 15) return w(H);
  return m < 45 ? MIKROFON.half.replace('{h}', w(H + 1)) : w(H + 1);
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Stig's answer with the watch (TALK_ISLAND ole `klokka`): the Spanish time and the Norwegian (=
// Swedish) one, an hour later, in words, each opening its sentence. Every form it takes: 12 hours
// and 12 halves.
export const clockLine = (text, h) => text.replace('{es}', cap(clockWords(h))).replace('{no}', cap(clockWords(h + 1)));
const clockForms = (text) => Array.from({ length: 24 }, (_, k) => clockLine(text, k * 0.5));

// A mission source's spoken tuples: ['who', 'text', ...] whose first element is a speaker (a quoted
// key, or a bare one: flight.js's `pax` anchor), and pickup({ who, ..., hello }). Each goes to the
// mission whose `id:` comes last before it ('mission' before the first). Lines built from variables
// are not seen here; the `vstory` scenario reports any line a mission says outside allLines().
const LIT = String.raw`'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\x60(?:[^\x60\\$]|\\.)*\x60`;
const unquote = (lit) => lit.slice(1, -1).replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t' }[c] ?? c));
export function missionLines(src, speakers) {
  const known = new Set(speakers), ids = [];
  for (const m of src.matchAll(/\bid:\s*'([\w-]+)',\s*title:/g)) ids.push([m.index, m[1]]);
  const partAt = (i) => { let p = 'mission'; for (const [at, id] of ids) if (at < i) p = 'mission:' + id; return p; };
  const out = [];
  for (const m of src.matchAll(new RegExp(String.raw`\[\s*'?(\w+)'?\s*,\s*(${LIT})`, 'g'))) {
    // (not a list of keys or landmarks: frame: ['majsan', 'stig'], hide: ['jose', 'mamma'])
    const text = unquote(m[2]);
    if (known.has(m[1]) && !/^[a-z_]\w*$/.test(text)) out.push({ who: m[1], text, part: partAt(m.index) });
  }
  for (const m of src.matchAll(new RegExp(String.raw`pickup\(\{\s*who:\s*'(\w+)'[^}]*?hello:\s*(${LIT})`, 'g'))) {
    out.push({ who: m[1], text: unquote(m[2]), part: partAt(m.index) });
  }
  return out;
}

function* tables(missionSrc) {
  // The stage kinds' own lines (kinds/core.js): a passenger left behind hops back in (reboard: Ole in
  // Norwegian, anyone else in Swedish), a pickup with no `hello` of its own; Ole paying when the
  // purse is short (Game.pay, a mission's cost).
  const passengers = new Set([...missionSrc.matchAll(/passenger:\s*'(\w+)'/g)].map((m) => m[1]));
  for (const k of passengers) yield [k, k === 'ole' ? S.neverLeaveOle : S.neverLeave, 'mission'];
  for (const m of missionSrc.matchAll(/pickup\(\{\s*who:\s*'(\w+)'([^}]*)\}/g)) if (!/hello:/.test(m[2])) yield [m[1], S.goGoGo, 'mission'];
  yield ['ole', S.olePaysRadio, 'mission'];
  // J held: the mantra's bubble (main.js; FLYGRÄDSLA and the mantra stages).
  yield ['stig', S.mantraLine, 'mantra'];
  // Prata med gänget (§10.28): each exchange's lines as listed, the clock line in every form.
  for (const list of Object.values(TALK_ISLAND.people)) {
    for (const ex of list) for (const [who, text] of ex.lines) {
      if (text.includes('{es}')) for (const t of clockForms(text)) yield [who, t, 'talk'];
      else yield [who, text, 'talk'];
    }
  }
  // SKANDAL (§7.2, shame.js): the officers' taunts and their "¡Documentación!" at a bust (the
  // wrecked jeep's two officers, kinds/core.js, shout the first two taunts), Lasse's radio after a
  // bust, the porter's bribe, Herr Storch "filming" a witness.
  const k = METERS.skandal;
  for (const t of [...k.taunts, k.bustLine]) for (const g of GUARDIA) yield [g, t, 'skandal'];
  yield [k.bustRadio[0], k.bustRadio[1], 'skandal'];
  const porter = k.hideouts.find((h) => Array.isArray(h.line));
  if (porter) yield [porter.line[0], porter.line[1], 'skandal'];
  yield [k.witnessToast.who, k.witnessToast.say, 'skandal'];
}

export function allLines({ missions = {}, speakers = [] } = {}) {
  const seen = new Set(), out = [];
  const add = (who, text, part) => {
    const key = who + '\0' + text;
    if (!text || seen.has(key)) return;
    seen.add(key);
    out.push({ who, text, part });
  };
  for (const src of Object.values(missions)) for (const l of missionLines(src, speakers)) add(l.who, l.text, l.part);
  for (const [who, text, part] of tables(Object.values(missions).join('\n'))) add(who, text, part);
  // The free-roam features, the chatter and the barks (a line listed above keeps its part). An
  // officer's line is said by whichever of the two officers' voices he has.
  for (const [who, text, part] of featureLines()) for (const w of who === 'guardia' ? GUARDIA : [who]) add(w, text, part);
  return out;
}
