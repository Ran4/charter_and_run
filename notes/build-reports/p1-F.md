# P1 F hand-off: Flight missions (DESIGN §8.1–8.5) and flight content

Worktree `/home/ran/src/html/everything_and_run/.wt/charter-F`, branch `p1-F`, commit `719def4` ("P1 F: flight missions §8.1-8.5, flight content, story script").
Port 8866. Screenshots: `/tmp/claude-1000/-home-ran-src-html-everything-and-run-charter-and-run--sallskapsresan/25b591af-d9e9-4102-8669-08768ad2e553/scratchpad/out-F/`
(`shots/sheet_gate.png`, `shots/sheet_ombord_juice.png`, `shots/sheet_sprit_landning.png`, `probe/sheet_probe.png`, calibration shots in `calib/`).
Scratch tools I used (not shipped): `scratchpad/calibF/{calib,shots,probe,probe2}.mjs`. `calib.mjs` is a timeScale-1 autopilot: it walks the player through the real collision geometry by waypoints, excuses the stowers, dodges the trolley into dodge rows, holds Space in turbulence and J when hot.

## Files changed (all owned)

- `src/game/missions/flight.js`: `FLIGHT_MISSIONS`, the full §8.1–8.5 sheets.
- `src/content/flight.js`: `HOMES_GATE`, `HOMES_FLIGHT`, `MAP_LABELS_FLIGHT`, `CHATTER_FLIGHT`, `OLE_STATS`, `LEVEL_OUTFITS_GATE`, `LEVEL_OUTFITS_FLIGHT`.
- `tools/story/flight.mjs`: `M_FLIGHT` (M[0..4]) per §16.3, with beat assertions.

## Done

- **Missions 1–5.** Every stage, line, cue and source tag of §8.1–8.5 is in, starting from the Phase 0b fixture. Each line was checked against `research-{plot,characters,flight}.md`:
  - Ole's lines are the SUB-NO bokmål where it exists, and every Ole line is Norwegian.
  - José/Siv are in the right order, and the points scene is on the plane.
  - Berra tells Robban the bodega tip.
  - No brands, and real names appear only inside film quotes.
- **Tag fixes against the research:**
  - The ombord t 14 line → `[F*]`. Its "Ellers…" is ours, because SUB-NO stops at "få fart".
  - Herr Storch "Lite film." → `[F*](t)`. The speaker is interpreted in research-plot §5.4.
  - Siv "Bara de inte är ingenjörer." → `[F*](t)`.
- **Staging:**
  - Berra now comes into the men's room. §8.1 had `dz −1.5`, which put him outside in the lounge, behind the wall, 6 m from the camera framing.
  - The row-6 "varm middag" exchange (all four lines, incl. `pax` on a real passenger bust) plays when the trolley stands at row 6 and Angerud is on screen. It is built with a small stage decorator in the mission file (`withTick`), so the kinds are untouched. The fixture used two timed lines instead.
  - The sprit outro moves Stig to row 14 next to Ole (`outroPlace.stig` + `outroCam ['ole','stig']`): "front galley, then back at row 14".
  - Bubble durations in the takeoff timeline no longer overlap at timeScale 1.
- **Timers** calibrated by measurement (table below).
- **FLYGRÄDSLA balance** measured (table below). A careful player never panics. A careless one panics in missions 1, 2 and 5.
- **Short retries** (§8 "fail → retry is the normal loop"):
  - a checkpoint on the gate statistics scene (`retryAt: 'gateOle'`), because a failed dash replays the statistics, which rebuild its fear;
  - a checkpoint on the takeoff (`retryAt: 'cabinRow14'`);
  - a checkpoint on landning's seat stage (with `startCue: { seatbelt: true }` so the sign is lit on a retry).
  - All three were verified by probes: fail → E → the right stage, the right spot, Ole beside him / sign lit → complete.
- **Content:**
  - homes, labels and outfits exactly as §2.3 / §4.5 / §11.6;
  - CHATTER_FLIGHT extended with verified relocated lines, all `[F*]`, (t) where the speaker is unknown;
  - OLE_STATS gains two `[N]` bokmål barks.

## P1 left / cut

- Nothing in my scope is left open. The cabin and gate visuals belong to A1/A2/E (the screenshots show stub geometry), so the staging was judged on positions, framing, bubbles and HUD.
- `tools/fixtures/full-missions.js` (owner none) now lags behind the shipped data (timers, fear numbers, checkpoints, Berra's spot). It is a contract test and still passes as it is. Phase 2 may sync it.

## Timer calibration (§8 "Timers and difficulty"; on foot: T_ref = measured clean path time + 1.5 s per target; timer = T_ref × 1.25, rounded up to 5 s)

| mission/stage | route | measured (autopilot, timeScale 1) | T_ref | timer (was) |
|---|---|---|---|---|
| gate [3] toilet dash | gateOle → around the ladies' room → men's room door → herrtoa (r 1.8), ~18 m | walk 5.0 s, sprint 3.6 s, naive straight-at-marker sliding along walls 7.0 s | 5.0 + 1.5 = 6.5 | **10 s** (15) |
| ombord [0] find 14B | cabinDoor approach spot → aisle past 3 stowers (E each) → 14B, ~17 m | walk 4.4 s incl. 3 excuses | 4.4 + 4×1.5 = 10.4 | **15 s** (25) |
| sprit [0] 5 rolling bottles | galleyBack, sweep forward chasing the nearest bottle, 1 trolley dodge into a dodge row, Space in turbulence | sprint, 7 runs: 5.7 / 11.2 / 13.2 / 15.4 / 15.5 / 16.1 / 28.0 s (28.0 = a run past the t 20 turbulence); median 15.4 | 15.4 + 5×1.5 = 22.9 (→ 28.6 → 30) | **35 s** (75): one 5 s step up for the random bottle motion, so the unlucky 28 s run still fits |
| landning [0] round-up | row 16 → José (−9.2) → Berra (−14.4) → Herr Storch (3.4), touch r 1.0 (nearest neighbour) | walk 7.6 s (reverse order 6.9 s) | 7.6 + 3×1.5 = 12.1 | **20 s** (50) |
| landning [1] back to 14B | worst sensible start (Berra, reverse order) → 14B | 3.5 s (from Herr Storch 1.5 s) | 3.5 + 1.5 = 5.0 | **10 s** (20) |

Stages with no timer: gate 0, 1, 2 and 4–8; ombord 1 (scripted, 27 s); all of juice; sprit 1; landning 2.
Walking speed (3.6) was used where sprinting adds fear the stage punishes (the seat search before the panicFails takeoff, the round-up before the approach) and sprint speed (5.2) for the bottles. For the dash both speeds give 10 s.

## FLYGRÄDSLA balance (timeScale 1, dialogue at 55 chars/s; "careful" = Space in turbulence, J at ≥ 70; "careless" = never J)

| mission | measured | change |
|---|---|---|
| 1 gate | Fear at the dash start is 68.8. The decay between the arch and the statistics eats ~12, so DESIGN's ≈70 is right. With fearRate 2 nobody could panic inside the timer: dawdle 9 s → 90.7. With **fearRate 3**: dawdle 9 s → 99.7 and PANIK just before the 10 s timeout; a straight walk arrives at ~88, sprint ~87, naive ~94. | §8.1 dash `fearRate 2 → 3` |
| 2 ombord | Careless with a perfect 4.4 s seat run → PANIK at t 23 → mission failed (before the change: max 98.6, no PANIK, so it depended on Ole's bark timing). Careful peak 74.6. | DUNS `fear 15 → 20`, "Annars…?!" `fear 5 → 8` |
| 5 landning | Careless (no J while the approach shakes, J afterwards) with a perfect round-up → PANIK → failed (before the change: peak 77.6, no PANIK). Careful peak 18.2. | approach `turbulence [0.7, 10] → [0.75, 14]` |

## Self-checks (my final runs, PORT=8866, OUT=scratchpad/out-F)

- `for x in $(git ls-files '*.js' '*.mjs'); do node --check "$x"; done` → `node --check count=59 fails=0`
- `TO=5 node tools/shot.mjs story` (run 1) → `[t] done -> #5 idle stage 3  coins 1750` · `[t] landed on the island {"level":"island","d":2}` · `no errors` · `RESULT: PASS`
- `TO=5 node tools/shot.mjs story` (run 2) → `[t] done -> #5 idle stage 3  coins 1750` · `no errors` · `RESULT: PASS`
- `node tools/shot.mjs api missions` → api all checks; missions 0–12 with the giver at `at`, `ombord seats {"ole":"14A","majsan":"16E"}`, data checks clean · `no errors` · `RESULT: PASS`
- Probes (scratch):
  - The gate dash fails at 10.0 s ("Du hann inte fram…"). The retry goes to stage 2 with Ole 1.5 m away. Berra stands at (31.2, 25.2), 2.4 m from Stig.
  - The row-6 complaint plays.
  - The ombord and landning PANIK → retry → complete.
  - All `no errors`.
- Ownership check: it prints only `node_modules`. That is the orchestrator-created symlink, which `.gitignore`'s `node_modules/` (directory pattern) does not match. None of my files are outside `owned/F.txt`.

## CONTRACT CHANGES (proposed DESIGN edits; the data is already in my files)

1. **§8.1 gate**
   - stage [3]: `timer 15 → 10`, `fearRate 2 → 3`.
   - stage [2]: add `checkpoint: true, retryAt: 'gateOle'`.
   - stage [5]: `place: { berra: ['herrtoaDoor', 0, 2.2, 1.25] }` (was `['herrtoaDoor', 0, -1.5]`, which is outside the men's room behind the wall).
2. **§8.2 ombord**
   - stage [0]: `timer 25 → 15`.
   - stage [1]: add `checkpoint: true, retryAt: 'cabinRow14'`.
   - stage [1] timeline events:
     - t 10 `fear 15 → 20`, say secs 1.5;
     - t 11.5 say secs 2.4;
     - t 14 say secs 3.4 and tag `[F] → [F*]`;
     - t 17.5 `fear 5 → 8`.
3. **§8.3 juice** stage [1]: the row-6 exchange (4 lines) is triggered by the trolley standing at row 6 with Angerud on screen. It is a stage decorator in `missions/flight.js`, not `timedCues`. `pax` speaks from a bust seat across the aisle.
4. **§8.4 sprit**
   - stage [0]: `timer 75 → 35`.
   - add `outroPlace: { stig: ['cabinRow14', 0, 0] }, outroCam: ['ole', 'stig']`.
5. **§8.5 landning**
   - stage [0]: `timer 50 → 20`. Herr Storch's "Lite film." tag → `[F*](t)`.
   - stage [1]: `timer 20 → 10`, add `checkpoint: true, startCue: { seatbelt: true }`.
   - stage [2]: `turbulence: [0.75, 14]`.
6. **§14.10**
   - `CHATTER_FLIGHT` additions:
     - ole: 'Ja, men dyr!', 'Min drøm er å fly med Concorde fra Paris til Rio.';
     - angerud: 'Jag har inte fått resan gratis.' `[F*](t)`;
     - robban: 'Pepes Bodega. Glöm aldrig det, du.';
     - siv: 'Vilket gäng man har hamnat i!' `[F*](t)`.
   - Tag fixes: siv 'Bara de inte är ingenjörer.' → `[F*](t)`; herrStorch → `[F*](t)`.
   - `OLE_STATS` + 'Statistisk sett er det tryggest å sitte bakerst. Eller var det fremst?' `[N]`, 'Hører du den lyden? Helt normalt. Tror jeg.' `[N]`.
7. **Proposed for H / Phase 2 (not my files)**
   - Bubbles stack on top of each other. In the takeoff, the mantra's auto-bubble (main.js, every 2.5 s), Ole's `oleBarks` bark (cabin.js) and the scripted lines overlap over 14A/14B (`shots/o02_duns.png`, `o03_solen.png`).
   - Patch sketch for `hud.js say()`: before pushing, remove any live item whose `target` is the same object (one bubble per speaker). Then, in `tickBubbles`, nudge a bubble up by its height when its screen rect overlaps an earlier one.
   - Optional: main.js skips the mantra bubble while the player has a live bubble, and `cabin.stepFear` skips a bark while Ole has one.
8. **Phase 2 housekeeping**
   - `.gitignore`: add `node_modules` without the slash, so symlinked worktree `node_modules` are ignored and the ownership check prints nothing.
   - `tools/fixtures/full-missions.js` may be synced to the shipped flight data (see P1 left).
