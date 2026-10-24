// The voiced script as the tools see it: src/content/script.js's allLines() with the mission
// sources and the speakers' keys read from disk (the mission files and models.js import three, so
// they are read rather than imported). Used by tools/voice/voice.mjs and the `vstory` scenario.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const MISSION_FILES = ['src/game/missions/flight.js', 'src/game/missions/island.js'];

// CHARS' keys (models.js: `  key: A({ name: ...`).
export function speakerKeys() {
  const src = fs.readFileSync(path.join(ROOT, 'src/actors/models.js'), 'utf8');
  const a = src.indexOf('export const CHARS = {'), b = src.indexOf('\n};', a);
  return [...src.slice(a, b).matchAll(/^ {2}(\w+): A\(\{/gm)].map((m) => m[1]);
}

// [{ who, text, part }], fresh from disk every call (a changed script needs no restart).
export async function scriptLines() {
  const mod = await import(pathToFileURL(path.join(ROOT, 'src/content/script.js')).href + '?t=' + Date.now());
  const missions = Object.fromEntries(MISSION_FILES.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
  return mod.allLines({ missions, speakers: [...speakerKeys(), 'guardia2'] });
}
