# Phase 3 · round 3 · post-gate repair `ledger`

Start HEAD `6d5b919`, clean tree, branch `main`. Port 8870. Logs, shots and the probe are in
`<scratchpad>/out-p3-r3-ledger/` (below: `OUT/…`); the gate's logs are in
`<scratchpad>/out-p3-r3-gate1/`. Every measurement ran after the three repair commits, on the final
game code. The tree was dirty only in the ledger for the flowers batches. For the default
`calibrate` and `calibflight` runs it also carried this step's timer literals; `calibrate` raises
every timer it measures, so a literal does not change a measured run.

## Items

### ledger-1 · the gate's raw runs · fixed

Every time in r3 gate 1's section 3 is now in `notes/calibration-samples.md` as one row per stage:
- `r3g1-D` is the default `calibrate` run (2026-10-10); `r3g1-C` is the default `calibflight` run
  (2026-10-11).
- All rows ran on `ea6c96a`, two decimals, in run order.
- I checked each time against `out-p3-r3-gate1/calibrate.log` and `calibflight.log`.
- The only run left out is julafton's run 0: 71.2 s with one impact on the Herr Storch leg, so not
  clean.
- The jeep row lists its unsticks: run 1 one, run 6 two, run 9 one, run 10 two. None wedged and
  none lost the truck.

The sample-id list names `r3g1` and `r3l`. A paragraph under it explains the pool decision.

**Pool decisions.** The repair commits after ea6c96a are e458d7e (repair-flight), 5b996be
(repair-island-staging) and 6d5b919 (repair-island-camera). I read their diffs
(`git diff ea6c96a..6d5b919`):

| commit | what it changes |
|---|---|
| e458d7e | flight: the `via` guides (gate, ombord, landning), the seat reach (cabin.js `bestSeat`, interactable r 2.0), the gate's `retryFear` (runner, core.js COMMON) |
| 5b996be | island: asnan's paint drive hides Angerud, plus the `outroHide` field; julafton's party porter moves to dx −6 |
| 6d5b919 | camera.js only. No change to `cam.yaw`; the slide moves only the eye. |

How each stage's rows were pooled:
- **friskotekBalls and fatagaSheep** go to `walker-r1r2/r3-island-camera`.
  - Both pools started on island-camera's world (the notice board, the crags).
  - ea6c96a is that world plus flight-trolley, which is flight only.
  - No repair touches friskotek, Fataga or the walker.
  - The walker sets the camera yaw itself (calibrate.mjs:856), and movement follows `cam.yaw` (main.js:1511).
- **grisfestFlowers** goes to a new pool, `walker-r1r2/r3-island-staging` (ledger-2).
- **bodegaJeep** stays in `chase-r1if/d9451f8`.
  - The chase autopilot and the bodega mission are unchanged since d9451f8.
  - r3's world changes are either off the roads (Fataga's crags behind the village, the friskotek
    board) or not solids (signs, string lights, camera ceilings).
  - The parasoll's collider top went from 2.2 to 2.55. Both heights are a wall for a car.
  - r2 kept this pool through r2's world changes in the same way (`r2g1-D`).
- **sprit[0]** stays in `sweeper-r2fm/b69c64e`.
  - The sprit stage has no `via` guide.
  - The sweeper follows no guide and never sits.
  - `retryFear` is on the gate only.
  - This is r3rf-C's precedent.
- **grisfestPlates, grisfestTonga and julaftonGuests** stay in `walker-r1r2/d9451f8`.
  - No r3 commit touches the dance floor, the Tonga drive or the guests stage.
  - `tongaSlump` and the porter belong to the scenes after those stages.
  - The facing turn after a dialogue does not move a walker that sets its own yaw.
  - The gate and this step reproduce the same times: plates 20.77–21.03, Tonga 3.90 + 11.38,
    julafton 67.0–67.4.

### ledger-2 · grisfestFlowers needs a new pool · fixed: timer 23 → **26**

**Why a new pool.** 302d4c2 changed the grisfest intro:
- It places Stig on `approachSpot('flamenco')` (−4, −9.5), where `calibrate` already started.
- It places Ole 1.6 m beside him at (−5.6, −9.4). On ca2a3a6 Ole stood on the landmark (−4, −8),
  1.5 m in front of Stig.
- 69f4f33 turns Stig to the guide when the intro ends.

The ledger's rule counts the actors as stage code, with r2's friskotek intro as the precedent. So
these samples start a new pool, `walker-r1r2/r3-island-staging`.

**What changed and what did not.** `OUT/probe-flowers.mjs` ran on the final tree and on a
`git archive` of ca2a3a6 (`OUT/old-ca2a3a6` is in the scratchpad, not the repo). Each run did 3
`startMission` passes and 4000 simulated spawn layouts.

| | ca2a3a6 (old pool's code) | final tree |
|---|---|---|
| Stig at the stage start | (−4, −9.5), yaw 0 | (−4, −9.5), facing the guide |
| Ole at the stage start | (−4, −8) | (−5.6, −9.4) |
| Reachable spawn cells in the 8–40 m ring | 15137 | 15137 |
| Straight-line nearest-first tour, median / p75 | 120.8 / 139.9 m | 120.5 / 138.5 m |

So the start spot, the world and the spawn rule are the same. Only the actors and the facing
changed.

**Measured on the final code.** 44 runs in total, none excluded, falls 0, wedges 0:
- `r3g1-D`: the gate's 4 runs, `17.15 16.17 18.92 9.97`. No repair commit touches grisfest.
- `r3l-F1`, `F2`, `F3`: three batches of `CAL=flowers FOOT_RUNS=12`. Each passed: `OUT/fl1.log`,
  `fl2.log`, `fl3.log`.
- `r3l-D`: the default run's 4 runs (`OUT/calD.log`).

| pool size | p75 | T_ref | timer | 90 % range |
|---|---|---|---|---|
| 16 | 18.52 | | 27 | 24–28 |
| 28 | 18.30 | | 27 | 25–27 |
| 40 | 18.305 | 20.805 | 27 | 25–27 |
| **44** | **18.24** | **20.74** | **26** | **25–27** |

At n 44 the pool runs 6.53–23.85 s with median 16.22, and ceil(1.25 × 20.74 = 25.93) = **26**.
That is the shipped timer.

**Not an autopilot artefact.**
- The walker covers its route at the same speed in every pool: 8.1–8.7 m/s over the walked
  distance, 5–7 plans a run. The one slower run is r3l-F3 run 8, 7.7 m/s with 7 plans.
- The new pool matches the round-1 world's pool `walker-r1r2/d9451f8` (median 16.18, p75 17.79 → 26).
  Mann–Whitney z is 0.0 over the 44 runs.
- The round-2 pool `walker-r1r2/46a0938` behind the shipped 23 had median 13.32. Its z is 1.9
  against this pool and −1.8 against the round-1 pool. It ran on the same world and spawns.
- So the 23 most likely came from 28 short runs, not from a change in the game.

**Updated:** island.js `TIMERS.grisfestFlowers` and its comment, the fixture (§8.12 s1), the
DESIGN §8 table row, the §8.12 stage literal and the intro's note, the ledger's paragraph and its
Current-pool line, and the changelog.

### ledger-3 · stale pool text · fixed (and two timers re-set by the rule)

I re-synced every summary with `node tools/pool.mjs` after ledger-1, ledger-2 and ledger-4:
- the ledger's Current-pool lines (Tonga's and julafton's now carry their numbers);
- the DESIGN §8 table rows;
- the jeep paragraph of "Races and chases";
- the island.js TIMERS comments;
- the flight.js header.

The jeep, plates, Tonga and julafton counts that the gate (N2) and completeness (docs gaps 5–6)
flagged are all current now.

With the new rows, two CURRENT pools changed their timer, so each was re-set everywhere (code,
§8 table, §8.x literal, fixture):
- **fatagaSheep 28 → 27.** n 44, p75 18.40 → ceil(1.25 × 21.40 = 26.75), range 26–29. Island-camera's
  36 runs and those plus the gate's 4 gave 28; this step's default 4 (13.42 17.80 17.25 14.43) took
  it to 27.
- **bodegaJeep 42 → 41.** n 119, median 27.98, p75 34.05 → ceil(1.2 × 34.05 = 40.86), range 37–44.
  At n 83 and at n 107 (with the gate's 12) it gave 42. This step's 12 chases (p75 28.52) took it
  to 41.

### ledger-4 · calibrate + calibflight on the final code · fixed

Both default runs passed. Their runs are in the ledger as `r3l-D` and `r3l-C`, and the summaries
reflect them.

`calibrate` (`OUT/calD.log`, **RESULT: PASS**, no errors):

| stage | runs |
|---|---|
| jeep | 30.15 23.93 27.02 17.18 27.98 35.57 20.12 18.13 16.60 21.82 30.17 20.67 (none wedged or lost; run 5 one unstick) |
| balls | 16.57 13.73 13.32 12.68 |
| sheep | 13.42 17.80 17.25 14.43 |
| flowers | 14.87 12.97 10.08 17.62 |
| plates | 20.78 20.77 20.77 20.77 20.78 20.77 |
| Tonga | 15.28 15.28 |
| julafton | 67.1 67.4 (both clean) |

`calibflight` (`OUT/calC.log`, **RESULT: PASS**, no errors):
- sprit 7.22 7.60 7.40 7.20 7.32; no panic, bowled 0, falls 0, peaks 15.7–16.7. The pool is n 86,
  median 7.31, p75 7.60 → still 13.
- gate 70.1 → 95.6 sprint, walk 99.4, dawdler PANIK at 5.2 s, retry at fear 70 (first attempt 70.2).
- ombord 3.1 → 7; careless PANIK at t 21.7.
- landning 7.6 → 12 and 3.2 → 5; careless PANIK at t 24.2.

Its CAL CHECK lines are single-sample checks, not the measurement. The n 4 and n 12 samples put
the jeep, flowers and sheep "OUTSIDE" on the low side; pooled, they give the timers above.

## Timers before → after

| stage | before | after | current pool (n) |
|---|---|---|---|
| friskotekBalls | 24 | 24 | `walker-r1r2/r3-island-camera` (36 → 44) |
| fatagaSheep | 28 | **27** | `walker-r1r2/r3-island-camera` (36 → 44) |
| grisfestFlowers | 23 | **26** | `walker-r1r2/r3-island-staging` (new, 44); was `walker-r1r2/46a0938` (28) |
| bodegaJeep | 42 | **41** | `chase-r1if/d9451f8` (83 quoted, 95 in the ledger → 119) |
| sprit[0] | 13 | 13 | `sweeper-r2fm/b69c64e` (76 → 86) |
| grisfestPlates | 33 | 33 | `walker-r1r2/d9451f8` (20 quoted, 26 in the ledger → 38) |
| grisfestTonga | 19 | 19 | `walker-r1r2/d9451f8` (12 quoted, 14 in the ledger → 18) |
| julaftonGuests | 81 | 81 | `walker-r1r2/d9451f8` (11 quoted, 12 in the ledger → 15) |

`node tools/pool.mjs` (`OUT/pool.log`, exit 0, no PROBLEM) reproduces every shipped timer: island.js
TIMERS, the flight.js literal, the §8 table, the §8.x literals and the fixture.

## Checks

| check | result |
|---|---|
| `node --check` on island.js, flight.js, the fixture, tools/pool.mjs | ok |
| `CAL=flowers FOOT_RUNS=12 calibrate` ×3 (`OUT/fl1–3.log`) | **RESULT: PASS** ×3 |
| `calibrate`, default env (`OUT/calD.log`) | no errors, **RESULT: PASS** |
| `calibflight`, default env (`OUT/calC.log`) | no errors, **RESULT: PASS** |
| `fullstory kinds missions` (`OUT/fk.log`) | `done -> #13 idle`, no errors, **RESULT: PASS** |
| `story`, full (`OUT/story.log`) | `[t] done -> #13 idle stage 5  coins 7800`, 0 `scenario failed`, no errors, **RESULT: PASS** |
| `node tools/pool.mjs` | every CURRENT pool's timer = the shipped one; exit 0 |

## Follow-ups / known issues (for the final report)

- **The flowers pool sits on a boundary.** At n 40 it gave 27 and at n 44 it gives 26 (range
  25–27). One more default run can flip it, as it flipped the sheep (28 → 27) and the jeep
  (42 → 41) here. Each flip is the rule on the pool, not a padded value.
- **asnan CAL CHECK "tighter than measured" (T_ref 16.9 → 21 vs 19).** Two of the three runs were
  held by traffic, for 3.6 s and 4.4 s. The unheld run, 15.47 s, matches every unheld run since
  (gate 15.47 ×3, repair-island-staging 15.5 ×2). This is traffic noise, like the gate's N3 for
  vischan, and I took no action.
- **buss17 run 2: 214.6 s, held 171.6 s by traffic.** `calibrate` counts it as clean because it had
  no impact. The median of 3 is still 44.8 → 54. A traffic jam on the bus route is worth a look in
  the traffic code: it is not timer data.
- **SKANDAL pursuit: one "clean driving" run was busted at 15.5 s.** The other clean runs escaped in
  41.7 and 39.3 s; the gate had 3 of 3. The one-crash runs escaped 3 of 3. No repair commit touches
  shame.js. Noise or a rare officer catch, for the SKANDAL balance notes.
