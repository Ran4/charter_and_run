// Pools the raw calibration samples of notes/calibration-samples.md (DESIGN §8 "Timers and
// difficulty"): per stage and pool, n, median, the stage's percentile, T_ref, the rule's timer and
// its 90 % bootstrap range (timerRange in lib.mjs). A random stage's shipped timer is this output
// for the stage's current pool, so anyone can re-derive it from the ledger.
//   node tools/pool.mjs [stageKey …]
// The ledger: one `## \`stageKey\` …` section per stage, a line `Current pool: \`name\`` (the pool
// the shipped timer comes from; marked CURRENT below), and a table whose rows are samples:
// | sample | date | code | pool | env | n | raw times (s, run order) | excluded (reason) |
// Rows with the same pool cell pool together; a row whose times cell starts with "lost" (a sample
// whose raw times are gone) is listed but never pooled. The n cell must match the count of times.
import fs from 'fs';
import path from 'path';
import { ROOT, pct, timerRange } from './lib.mjs';

// The rule per stage (§8): T_ref = the q-quantile of the measured runs + `extra` (0.5 s per target
// on foot), timer = ceil(mult × T_ref). Plates are a fixed layout: the median.
export const RULES = {
  friskotekBalls: { q: 0.75, extra: 3, mult: 1.25 },
  fatagaSheep: { q: 0.75, extra: 3, mult: 1.25 },
  grisfestFlowers: { q: 0.75, extra: 2.5, mult: 1.25 },
  grisfestPlates: { q: 0.5, extra: 5, mult: 1.25 },
  bodegaJeep: { q: 0.75, extra: 0, mult: 1.2 },
  'sprit[0]': { q: 0.75, extra: 2.5, mult: 1.25 },
  // Deterministic stages with an on-foot leg, re-measured over several runs: the median; Tonga's run
  // time is the walk + the drive, + 0.5 s for the one target (the car).
  grisfestTonga: { q: 0.5, extra: 0.5, mult: 1.2 },
  julaftonGuests: { q: 0.5, extra: 0, mult: 1.2 },
  eslovLopp: { q: 0.5, extra: 2.5, mult: 1.25 },   // feature 7: Eslövloppet (free roam, DESIGN §10.12)
};

export function readLedger(file = path.join(ROOT, 'notes', 'calibration-samples.md')) {
  const rows = [], problems = [], current = {};
  let stage = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const h = line.match(/^## `([^`]+)`/);
    if (h) { stage = h[1]; continue; }
    if (/^## /.test(line)) { stage = null; continue; }
    const cp = stage && line.match(/^Current pool: `([^`]+)`/);
    if (cp) current[stage] = cp[1];
    if (!stage || !line.startsWith('|')) continue;
    const c = line.split('|').slice(1, -1).map((s) => s.trim());
    if (c.length < 8 || c[0] === 'sample' || /^-+$/.test(c[0].replace(/:/g, ''))) continue;
    const ts = /^lost\b/i.test(c[6]) ? [] : (c[6].match(/\d+(?:\.\d+)?/g) || []).map(Number);
    const row = { stage, id: c[0].replace(/\*/g, ''), date: c[1], code: c[2], pool: c[3].replace(/`/g, ''), env: c[4], n: c[5], ts, excluded: c[7] };
    if (ts.length && +row.n !== ts.length) problems.push(`${stage} ${row.id}: n ${row.n} but ${ts.length} times`);
    rows.push(row);
  }
  return { rows, problems, current };
}

export function poolStats(stage, ts) {
  const r = RULES[stage];
  const s = ts.slice().sort((a, b) => a - b);
  const toTimer = (p) => Math.ceil(r.mult * (p + r.extra));
  const p = pct(s, r.q);
  return { n: s.length, median: pct(s, 0.5), p75: pct(s, 0.75), q: r.q, tRef: p + r.extra, timer: toTimer(p), range: timerRange(s, toTimer, { q: r.q }), min: s[0], max: s[s.length - 1] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const { rows, problems, current } = readLedger();
  const only = process.argv.slice(2);
  const pools = new Map();
  for (const row of rows) {
    if (only.length && !only.includes(row.stage)) continue;
    if (!row.ts.length) continue;
    if (!RULES[row.stage]) { problems.push(`${row.stage}: no rule in tools/pool.mjs`); continue; }
    const k = `${row.stage}\u0000${row.pool}`;
    if (!pools.has(k)) pools.set(k, { stage: row.stage, pool: row.pool, ids: [], ts: [] });
    const p = pools.get(k);
    p.ids.push(row.id); p.ts.push(...row.ts);
  }
  const f2 = (v) => v.toFixed(2);
  for (const p of pools.values()) {
    const s = poolStats(p.stage, p.ts), r = RULES[p.stage];
    const stat = s.q === 0.5 ? `median ${f2(s.median)}` : `median ${f2(s.median)}, p75 ${f2(s.p75)}`;
    console.log(`${current[p.stage] === p.pool ? 'CURRENT ' : ''}${p.stage} · pool ${p.pool} · n ${s.n} (${p.ids.join(', ')}) · ${f2(s.min)}–${f2(s.max)} s · ${stat} · T_ref ${f2(s.tRef)} (${s.q === 0.5 ? 'median' : 'p75'} + ${r.extra}) · timer ceil(${r.mult} × ${f2(s.tRef)}) = ${s.timer} · 90 % range ${s.range ? `${s.range[0]}–${s.range[1]}` : '-'}`);
  }
  for (const [st, pl] of Object.entries(current)) if (![...pools.values()].some((q) => q.stage === st && q.pool === pl) && (!only.length || only.includes(st))) problems.push(`${st}: current pool ${pl} has no samples`);
  for (const m of problems) console.log('PROBLEM', m);
  process.exit(problems.length ? 1 : 0);
}
