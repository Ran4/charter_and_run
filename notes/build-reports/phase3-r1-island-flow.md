# Phase 3 · round 1 · fixer "island-flow"

Area: the island missions' flow (WP-G): checkpoints, retries, hints, palettes, timers. Files touched:
`src/game/missions/island.js`, `tools/fixtures/full-missions.js`, `tools/scenarios/calibrate.mjs`
(the jeep chase autopilot), `DESIGN.md`, and one file **outside the group's list**:
`src/game/missions/runner.js` (spine's; `lastCar` tracking, 4 lines, see playtest-3). Port 8870;
ad-hoc scripts, shots and logs in `<scratchpad>/out-p3-r1-island-flow/` (not in the repo):
`probe1.mjs` (retry spots, parked cars), `retry.mjs` (every new checkpoint on the shipped missions:
fail, E, check where the player, the car and the passengers end up; shots in `retry/`,
`sheet-retry.png`), `dusk.mjs` (the grisfest dusk palette at the hotel, `sheet-dusk.png`), the
calibrate logs `jeep0.log` (baseline, old autopilot), `jeep1.log`, `jeep2.log`, and `self.log`,
`story.log` (+ `story/`, `sheet-story.png`).

Tree at start: clean (no orphaned work from an earlier fixer).

## Items

| id | verdict | how / why |
|---|---|---|
| playtest-1 | **fixed** | Reproduced by reading: no bodega stage had `checkpoint`, so a failed jeep chase or drive home retried from stage 0 at `flamencoBar`. The `destroy` stage (stage 9) now has `checkpoint: true, retryAt: 'grisfestGate', retryCar: { at: 'grisfestGate', type: 'grisbil', name: 'grisbilFollow', passenger: 'berra', rider: 'robban' }` (spine's typed `retryCar`). A failed home drive retries the chase too (cpI stays 8). `retry.mjs`: after a home failure 60 m from the wreck the retry is at stage 8, a fresh `grisbilFollow` mission car at the gate (0 m), Berra seated, Robban hidden and riding as a bust, a fresh jeep and the full timer (`retry/bodega_retry.png`). §8.9, fixture. |
| playtest-3 | **fixed** (wider than proposed) | Reproduced by reading: the last checkpoint was the dance; a failed Tonga drive or carry retried at the dance floor with the car wherever it was. Now the plates, the dance scene **and the Tonga drive** (a checkpoint of its own, so a failed drive does not replay the seven-line dance) carry `retryAt: 'dansgolv', retryCar: TONGA_CAR` = `{ at: { x: -86, z: -202.75, yaw: -PI/2 }, park: true }` (the calibrate Tonga start), and the carry is a checkpoint retrying in the aisle of the Flamenco lot, `retryAt: { x: -24, z: 16, yaw: -PI/2 }` (`approachSpot` puts him at (−25.5, 16) facing the hedge gap). Not `flamencoDrive`: that is the hire car's bay, its approach spot is blocked by the car, so `approachSpot` returned the landmark itself, inside the hyrbil (`probe1.mjs`). **Runner change (outside my files):** `retryCar` without `type` reused "the car the player had when the mission failed", which is none when the plates fail (he is on foot), so a spare hatch was spawned on the spot; `clearSpot` leaves named cars alone, and the player very likely raced in the hire car, which stands right there at the finish: the spare would stand on top of it. `runner.lastCar` is now the car he last drove in the mission (updated every running frame, set by `fail()` only if he is in a car, reset in `begin()`/`abort()`, kept across a retry, and the retry's car becomes it). `retry.mjs`: the plates retry leaves him on foot at the dance floor with the hyrbil parked at the Tonga start (one car there, no spare), at night; a second plates failure keeps the same car; a Tonga failure 120 m away retries at the dance floor (cpI 5, no dance replay) with the car back at the start, night, Ole in `gris`; a carry failure retries in the lot aisle with Berra on the shoulders (`retry/grisfest_*_retry.png`). The `kinds` retry checks (night + plates at dansgolv; retryCar reused / typed / park) still pass. §8.12, §9.4 item 3, fixture. |
| playtest-4 | **fixed** | Reproduced by reading (no checkpoint; a retry re-paid the 200 haggle). The SKICK drive (stage 9) has `checkpoint: true, retryAt: 'supermercado', retryCar: { at: { ...lm('supermercado'), yaw: 0 }, passenger: 'ole' }` (the calibrate start: Centro Nórdico lot (62, −62) facing the street). `retry.mjs`: a failure 80 m away in a damaged car retries in the lot, the same car repaired, yaw 0, Ole aboard, SKICK full (`retry/asnan_retry.png`). The fixture imports `lm`. §8.8, fixture. |
| playtest-5 | **fixed** (other spot) | Reproduced by reading. The sheep stage has `checkpoint: true, retryAt: { x: -240, z: -208.5, yaw: 0 }`: `approachSpot` puts the player at (−240, −207) facing the village, exactly where `calibrate` starts the sheep chase. Not `fataga` (the village square, 16 m nearer the herd than the measured start: an easier retry than the timer assumes) and not `fatagaBus` (its approach spot is on the asphalt at the kerb of the lane, ground 0 vs 0.15: `retry.mjs`). `retry.mjs`: the retry is on foot at (−240, −207), y 0.15 (`retry/fataga_retry.png`). §8.11, fixture. |
| BL-4.1-1 | **fixed** (autopilot + re-measure, timer 42 → **37**) | Reproduced: baseline `CAL=jeep` on the old code wedged 3 of 5 chases (two 150 s timeouts at (−35, 173) and (−205, −91), one 120 s run of 340 m; `jeep0.log`, stopped after 5). Cause: the chase re-builds its route controller every 1.2 s and the unstick state lived in that controller, so the stuck timer reset and every reverse was cut short after ≤ 0.3 s; the truck pushed and backed off in place. Fix (`calibrate.mjs`): `makeController(car, path, ust)` keeps the unstick state in the chase's own `st`; a repeat within 6 s backs up longer (1, 1.6, 2.2 … 3 s) with the wheel the other way each time; after backing out the chase follows the road for 2.5 s before ramming across a corner again; a wedged run gets a shot (`jeep_wedged_k`), results log `unsticks`. Two runs of `CAL=jeep JEEP_RUNS=20` on the fixed code: **40 of 40 usable, none wedged** (6 needed one unstick). p75 28.7 (median 22.6) and 31.6 (median 28.3); pooled 40: 9.1–39.3 s, median 26.9, **p75 30.6 → ceil(1.2 × 30.6) = 37**. Phase 2's longer tail (53–124 s chases) was largely time spent stuck. `TIMERS.bodegaJeep` 37, §8 table + "Races and chases", §8.9 literal, fixture. |
| playtest-19 | **fixed** | The fixture imports `homeTimer` from `src/game/missions/island.js` and uses `timer: (g, m) => homeTimer(m.data.wreck)` (it had 30). `fullstory` passes through it. |
| islandB-9 | **fixed** | Reproduced by reading (getInCar cued `night` at the hotel). Stage 2 `startCue: { sky: 'sunset', music: 'vals' }`, the race `startCue: { sky: 'night' }` (music not repeated: `setTune` of the playing tune is a no-op and the retry re-applies stage 2's). `retry.mjs`: sunset at stage 2, night at the race, night after every grisfest retry; `dusk.mjs` shows a warm dusk over the lot and the pool deck (`sheet-dusk.png`); the story's "night sky after stage 2 startCue" check and the `kinds` night retry pass. §8.12, §13.3 (the sunset row names the grisfest dusk), fixture. |
| playtest-11 | **fixed** | Text `Samla ihop gästerna till julfesten – ta bilen!` [N] (no re-measure: the timer is measured by car). §8.13, fixture. |
| playtest-17 | **fixed** | Text `Porslinskross! Sparka sönder tallrikarna (J) medan bandet spelar` [N] (J/Mouse0/K is `attack`; only `areaHit` from a kick or stomp breaks a stack). It wraps to two lines on the objective card (`story/isl_grisfest_plates.png`). §8.12, fixture. |

## Follow-ups handled

- (spine) retryCar for grisfest (`park` at the Tonga start) and bodega (typed `grisbil` at
  `grisfestGate`): done as advised; no named parked car near either spot (`probe1.mjs`), and the
  hire car case at the finish is handled by the `lastCar` change above.
- (world-town) `TIMERS.friskotekBalls`: **not changed** (see Follow-ups): the drift predates this
  round's world changes and its cause is unknown; it needs its own decision.

## Checks (all on the final code)

- `missions kinds fullstory` (one run, `self.log`): `fixture data checks` pass, the retry checks log
  `retry {"i":3,"sky":"night",…,"d":1.5}`, `retryCar reused/typed/park` all true; fullstory
  `[t] done -> #13 idle`, `no errors`, **RESULT: PASS**.
- `retry.mjs` (ad hoc, shipped missions): 11 checks, `no errors`, **RESULT: PASS**.
- `CAL=jeep JEEP_RUNS=20 calibrate` ×2 (fixed autopilot): **RESULT: PASS** both
  (`CAL CHECK bodegaJeep: T_ref 28.7 -> 35`, `T_ref 31.6 -> 38`; pooled 37). Baseline on the old
  autopilot (`JEEP_RUNS=8`, stopped after 5 chases, 3 wedged): no RESULT line (stopped).
- `CAL=tonga` not run: the retry spots are exactly the calibrate Tonga start (the car) and
  `approachSpot('dansgolv')` (the walk start), so the measured start did not change.
- Full story `SHOTS=1 PORT=8870 node tools/shot.mjs story` (`story.log`): `[t] done -> #13 idle`,
  no `scenario failed`, `no errors`, **RESULT: PASS**. Looked at `sheet-story.png` (race at night,
  the plates text, the dance, Tonga, the carry, the bodega chase with the 37 s timer, fataga).

## Timers

- `bodegaJeep` (§8.9 s9): **42 → 37**. T_ref 30.6 s = p75 of 40 chases in two `JEEP_RUNS=20` runs
  on the fixed chase autopilot (median 26.9; single runs 28.7 / 31.6). Code, §8 table, §8.9 literal,
  fixture.
- No other timer changed. No route, car or stage start moved on a timed path: every retry spot is
  the calibrate start of its stage (asnan lot yaw 0, the jeep gate, the Fataga pavement, the Tonga
  car and walk start).

## Follow-ups for other areas

- difficulty pass / orchestrator (`TIMERS.friskotekBalls`, from world-town): 39 runs this round give
  p75 ≈ 26.4 s (formula 36–38) against the shipped 32 (Phase 2: p75 21.9 of 12). Left unchanged:
  the cause predates world-town's changes and is not found; a timer below its measured formula
  breaks the binding rule, so it needs a decision (find the cause, or re-measure and set 37).
- calibrate harness (balls/sheep walker, outside my "jeep autopilot" scope): a car knocking the
  walker flat fails the whole `calibrate` ("the chase did not get stuck", world-town's
  `cal/balls_stuck_11.png`); the walker should wait out a down player or retry the run.
- spine (runner.js): I changed `lastCar` (above) in spine's file; DESIGN §9.4 item 3 describes it.
- orchestrator (HANDOFF §4.1): the jeep backlog item is done (autopilot fixed, 37 s); the
  "bodega home timer" item (BL-4.1-2, deferred) can stay deferred: the wrecks still spread over the
  whole map (d up to ≈ 600 m) and `homeTimer` follows the distance.
- island-staging / round 2 (unchanged here): after a grisfest retry from the dance floor the
  objective while on foot reads "Tillbaka in i bilen!" with the arrow on Tonga Tonga, not on the
  parked car 36 m away (the `goto` kind's `altTarget` only knows a passenger). Same as the normal
  flow after the dance; a hint arrow to the car would help both.
