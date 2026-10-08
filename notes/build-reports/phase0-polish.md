# Phase 0 polish hand-off (commit 00180c9 "Phase 0 polish before Phase 1", tag `phase0` moved from 1876234)

This is the last change to the frozen files before the 11 Phase 1 packages branch. All 8 owner-none findings were checked before fixing. All were real, and each is fixed.

## Files changed
- `src/world/collision.js`: the `segmentBlocked` early-out bound.
- `src/gfx.js`: `signMesh` with `double`.
- `src/input.js`: new `padPressed(action)`.
- `src/main.js`: `restoreAmbience` (flight), `inCutaway`, pad resume, the flight `aerial` camera, `syncIdleAnim` called every frame, and posed NPCs no longer wave, turn or chatter.
- `src/game/missions/runner.js`: `idleAnim` (`idlePose`, `syncIdleAnim`), and the `outroPlace.stig` yaw.
- `tools/lib.mjs`: `startMission` waits for the player to get up.
- `tools/scenarios/core.mjs`: `story` expects `MISSIONS.length`; `api` has a new polish block.
- `tools/fixtures/full-missions.js`: buss17 gets `idleAnim`; grisfest stage 5 gets the `gris` outfit on its `startCue`.
- `DESIGN.md`: §3, §5.6, §8.6, §8.12, §9.3, §9.4 (def, items 3, 5 and 6, new item 11), §10.4, §14.3, §14.4, §14.7, plus "Changelog (Phase 0 polish)".

## Done
1. **segmentBlocked** (real; reproduced in node).
   - Case: a 17.5 m segment has 22 samples. A far block at sample 15 is found first; the near block sits at sample 14.
   - In floating point, `(15/22)*22` floors to 14, so the old code returned 15/22, one sample (0.8 m) too far.
   - The hit is now tracked as an integer sample index, and the bound is `bestS - 1`, which is exact.
   - The `api` scenario asserts `seg === 14/22`.
2. **Double-sided signs** (real).
   - `{ double: true }` now adds a child plane with the same material, turned π about Y. Both planes are FrontSide, so they cannot z-fight, and the child follows the parent's transform.
   - Callers need no change, so block owners C1, C2, D1 and D2 do nothing.
   - Probe shots of the gate sign `ARLANDA UTRIKES` read correctly from front and back (`sign_front.png`, `sign_back.png`).
3. **Cabin ambience leaking after a failed or aborted flight mission** (real).
   - Before: `restoreAmbience` only re-applied the palette.
   - Now, in the flight level, it does `cabin.setPhase(levelDef.phaseForIndex(index), { instant: true })` with no hold, then `setSeatbelt(false, { chime: false })`, then `hud.setMapSource(cabin.mapSource(phase))`.
   - `fail()` and `abort()` already called it. `retry()` re-applies the mission's ambient cues on top.
   - `api` test: a held takeoff plus the belt on, then `restoreAmbience()`, gives `cruise`, hold false and belt off. Ten frames later it is still `cruise`.
4. **`idleAnim`** (real need: §8.6 Berra asleep).
   - The def gets `idleAnim: { key: flag | [flags] }`.
   - `runner.syncIdleAnim()` is called by main.js every frame. While the runner is idle with this mission current, in its own level, it holds those flags. It clears exactly the flags it set, on `begin()` (before the intro) or when the mission changes.
   - `runner.idlePose(key)` marks posed NPCs, and they skip wave, turn-to-player and chatter.
   - Documented in §9.4 (def and item 11) and §8.6.
   - `api` test: pose set, then cleared.
5. **main.js**:
   - `game.inCutaway` getter = `!!this._cutPrev`. It is true from `cutTo` (cue `cut`, scene `cam`, outroCam spec) until `endCut` or `endCinematic`. Documented in §14.3 for shame.js (WP-H). `api` asserts true, then false.
   - Pad Start resumes: while paused, the loop polls `input.padPressed('pause')` and calls `pause(false)`. Keyboard Esc/P still only pause, because pointer lock cannot be re-taken from a key press. Documented in §3.
   - The `aerial` camera in flight now sits at 0.17 × (420 up, 260 back), about 84 m, inside the gate fog (near 40, far 300). The island is unchanged. `aerial_flight.png` shows the gate set and cabin.
6. **startMission after M[3]** (real, and worse than reported).
   - The player is not just 'down'. The auto trolley in cruise re-bowls him at the galley every time he gets up, which is A1 gameplay working as designed (§5.8).
   - The harness now teleports a 'down' or 'flung' player to the approach spot (out of the aisle), waits up to 8 s for state `normal`, then does the usual warps and E.
   - Before the fix, the story log showed "player still down" plus one retry. After it, the story log has zero retry lines.
7. **The story's expected index** (real): without `TO` it now reads `window.__missions().length` (§16.1). A missing script throws `story: no story script for mission index k`. `fullstory` is unchanged: its expected count is the fixture length, which is its contract.
8. **Docs**:
   - §9.3 `place` row and §9.4 `outroPlace`: optional 4th element = absolute world yaw. The runner now honours it for `outroPlace.stig` instead of turning the player to the speaker.
   - §8.12 stage 5 and §10.4: Ole's `gris` outfit is on the stage `startCue`. The fixture is updated to match: the cue is moved off the dialogue line.
   - §5.6 and §9.4 item 3: `setPhase(name, { instant: true })` on a chained phase jumps to its end state and the next tick chains on; use `{ instant, hold }` to park there. A checkpoint retry drops `hold`.
   - §9.4 item 6: the new flight restore.
   - "Changelog (Phase 0 polish)" added.

## P1 left / cut
- None of the 8 items is left or cut.
- **Note for A1 (not fixed, since cabin.js is A1's file):**
  - A mission-started `cabin.turbulence(...)` that is still running when the mission fails keeps shaking after `restoreAmbience`. When it ends, it restores the belt to its `beltBefore` value. A public `cabin.stopTurbulence()` that `restoreAmbience` could call would close this. (main.js must not touch `_turb`.)
  - The auto trolley re-bowls a player lying in the aisle each time he gets up. The 2 s cooldown is shorter than the 1.6–2.4 s down time plus the walk-away time. Consider a longer cooldown, or not bowling within ~1 s of getting up.
- The placeholder `src/game/missions/island.js` buss17 (WP-G) does not set `idleAnim`. G should copy it from the fixture.

## Self-checks (my final runs, PORT=8850, OUT=scratchpad/out-polish)
- `for x in $(git ls-files '*.js' '*.mjs'); do node --check $x; done` → `node --check fails=0 count=59`
- `PORT=8850 OUT=… node tools/shot.mjs story` (second run, after the lib fix) → `[t] done -> #13 idle stage 3  coins 7900` / `no errors` / `RESULT: PASS` (exit 0; 0 retry, still or failed lines)
- `PORT=8850 OUT=… node tools/shot.mjs fullstory kinds api levels missions` → `[t] done -> #13 idle stage 5  coins 7650` (fullstory) / `[t] polish {"inCut":true,"outCut":true,"amb":true,"posed":true,"unposed":true,"seg":0.6363636363636364,"sign":true}` / `no errors` / `RESULT: PASS` (exit 0)
- Earlier: `api aerial` → `RESULT: PASS`. Probes `out-polish/probe-sign.mjs` and `probe-down.mjs` → `no errors`.

## CONTRACT CHANGES (all written into DESIGN.md)
- New: `game.inCutaway -> bool` (§14.3).
- Changed: `game.restoreAmbience()` in flight now also resets the cabin: phaseForIndex, instant, no hold, seatbelt off, map source (§9.4 item 6, §14.3).
- New mission def field `idleAnim?: { key: flag | [flags] }`, plus runner `syncIdleAnim()` / `idlePose(key)` (§9.4 def and item 11).
- `place` / `outroPlace` tuples: optional 4th element, absolute yaw. `outroPlace.stig` with a yaw keeps it (§9.3, §9.4 item 5).
- New `input.padPressed(action)`; pad Start resumes from pause (§3).
- `gfx.signMesh(…, { double: true })` returns a Mesh with one child back plane (§14.4).
- `segmentBlocked` exact to the sample (§14.7).
- Documented semantics: `setPhase` instant on a chained phase chains on at the next tick, and a retry drops `hold` (§5.6, §9.4 item 3).
- §8.12 stage 5: `startCue: { outfit: { who: 'ole', name: 'gris' } }` (§10.4). §8.6: `idleAnim: { berra: 'slump' }`.
- Harness: `T.startMission()` waits for `normal` (moving a downed player to the approach spot first). `story` expects `MISSIONS.length` (§16.1).
- No proposed patches to other owners' files beyond the two A1 notes above.

## Screenshots
`/tmp/claude-1000/-home-ran-src-html-everything-and-run-charter-and-run--sallskapsresan/25b591af-d9e9-4102-8669-08768ad2e553/scratchpad/out-polish/`
- `sheet_polish.png`: sign_front, sign_back, aerial_flight.
- The story, fullstory, kinds, api and missions shots are in the same folder.
