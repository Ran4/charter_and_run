// Headless driver: serves the game, loads it in headless Chrome (real GPU via ANGLE, no window),
// runs scenarios and saves screenshots.
//   PORT=8841 OUT=dir node tools/shot.mjs <scenario> [more scenarios...]
//   FROM=n TO=m (story: start at mission index n, stop before index m), VIEWS=a,b (views filter)
// Scenarios live in tools/scenarios/*.mjs (each exports SCENARIOS = { name: async (T) => {} });
// names must be unique across modules. The last line is RESULT: PASS | FAIL (reasons); the process
// exits non-zero on FAIL.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { launch, ROOT } from './lib.mjs';

// OUT=dir puts screenshots elsewhere (parallel runs must not share a dir or a PORT).
const OUT = process.env.OUT ? path.resolve(process.env.OUT) : path.join(ROOT, 'out');
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
const PORT = +(process.env.PORT || 8841);

const SCENARIOS = {};
const dir = path.join(ROOT, 'tools', 'scenarios');
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href);
  for (const [name, fn] of Object.entries(mod.SCENARIOS || {})) {
    if (SCENARIOS[name]) { console.log(`duplicate scenario name '${name}' in ${f}`); process.exit(2); }
    SCENARIOS[name] = fn;
  }
}

const names = process.argv.slice(2);
if (!names.length) { console.log('scenarios:', Object.keys(SCENARIOS).join(' ')); process.exit(0); }

const { T, errors, close } = await launch({ port: PORT, out: OUT, w: W, h: H });
const failed = [];
for (const name of names) {
  if (!SCENARIOS[name]) { console.log('unknown scenario', name); failed.push(`unknown scenario ${name}`); continue; }
  console.log('--', name);
  try {
    await T.fresh();
    await SCENARIOS[name](T);
  } catch (e) {
    console.log('scenario failed:', e.message);
    failed.push(`${name}: ${e.message.split('\n')[0].slice(0, 160)}`);
  }
}
console.log(errors.length ? `${errors.length} errors` : 'no errors');
const reasons = [...failed];
if (errors.length) reasons.push(`${errors.length} console errors`);
// The story must end on the expected mission index (all 13, or TO).
if (T.story) {
  const { expect, index } = T.story;
  if (index !== expect) reasons.push(`story ended at #${index}, expected #${expect}`);
}
console.log(`RESULT: ${reasons.length ? `FAIL (${reasons.join('; ')})` : 'PASS'}`);
await close();
process.exit(reasons.length ? 1 : 0);
