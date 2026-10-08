# Phase 2, step 4: all scenarios, three green story runs, performance

Repo: /home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan (main)
Commit: `1a592e0`, tagged `phase2`. The worktrees and sibling folders were not touched.

## Result

The exit criteria are met.

- **Every scenario passed** (RESULT: PASS, no errors) on the final code. 39 module scenarios plus the new `perf`, run in 6 batches:
  - r1: start walk aerial drive traffic title talk missions gate cabin trolley turbulence panic
  - r2: phases flightshots flightseq sceneryPeek dc8 views smash foot ui skandal transition api levels
  - r3: castsheet cars heads propsheet riocard endcard islandstats islandtour perf
  - r3b: endcard riocard, re-run after the end-card banner change
  - r4: fullstory kinds (fullstory ends `done -> #13 idle`)
  - r5: calibrate calibflight (default run counts)
- **Three consecutive green `story` runs** on commit 1a592e0. Each took about 190 s. None printed "scenario failed". The final lines:

```
== story1
[t] done -> #13 idle stage 5  coins 7775
no errors
RESULT: PASS
== story2
[t] done -> #13 idle stage 5  coins 7850
no errors
RESULT: PASS
== story3
[t] done -> #13 idle stage 5  coins 7825
no errors
RESULT: PASS
```

There was no flake, so the three-in-a-row count never had to restart.

## Visible problems found on the contact sheets, and the fixes

1. **The island spawn camera sat among the pergola slats.** This was the first frame of every island load from mission 6 on, and of `walk_island`, `level_island`, the `ui_*` shots and `api_pursuit`.
   - Cause: `level.spawn` returned `flamenco` (−4, −8, π). `approachSpot` then put Stig at (−4, −9.5) under Hotel Flamenco's reception pergola, and the chase eye ended up at slat height.
   - Fix: a new landmark `flamencoDeck` (−4, −2.5, 0). The player now starts on the pool deck at (−4, −1), facing the porch, with the camera over the pool. The same spawn is used after the game is complete. `levels` still checks that the spawn is within 10 m of `flamenco` (it is 7 m).
2. **Walking under that pergola, or jumping there, put the eye among the slats or above the roof.**
   - Fix: new camera ceilings: `collision.ceiling` / `ceilingOver`, plus `Frame.ceiling`. This is not collision; nothing collides with them.
   - On foot with no profile, `CamRig.update` keeps the eye 0.3 m under the underside of a registered ceiling. This applies when the eye's footprint (grown by 1.5 m) or the player is under it.
   - Only the Flamenco reception pergola is registered (underside C+3.1, the fascia).
   - Checked on `walk_island`, `walk_jump`, `walk_kick` and `skandal_hideout`: the eye now looks in under the fascia.
3. **A mission or fail banner overlapped the objective card's timer bar** (`ui_hud`: "PORTIERN TITTADE BORT" over the 0:42 bar). Fix: `#objective.show ~ #banner { top: 40% }`.
4. **A chatter bubble covered the `LAS PALMAS` banner** (`transition`). Fix: `#banner` gets z-index 2 inside `#hud`. `#hud` is now `isolation: isolate`, so the pause and title cards still cover the banner.
5. **A giant yellow shape filled a quarter of `trolley_waits`** (A1's open "GuideArrow" gap).
   - A probe showed it was not the GuideArrow but the giver "!" over Ole in 14A, 2.6 m from the z-clamped aisle eye.
   - Fix: `main.camNear`. The "!", the Beacon's arrow and the GuideArrow hide while their centre is within 3 m of the camera; the beams stay.
6. **The Rio end card's subtitle hid the orchestra busts on the wheelhouse roof.** Fix: the banner gets cls `endcard` (top 20 %). Verified in `endcard_rio`: the busts are visible.

The DESIGN.md sections updated are §5.3, §6.3 (landmark table), §4 level def (`spawn`), §11.7, §14.3 (collision API), §16.4 (`perf` row) and the Changelog (Phase 2) "Stability pass" entry.

## Performance (new scenario `perf`, tools/scenarios/perf.mjs)

For each view, the scenario measures:
- fps over 2 s of real play;
- the mean `game.update` ms;
- a GPU-synced `renderer.render` ms (12 renders, each followed by a 1-pixel `readPixels`).

It fails below 45 fps or above 22.2 ms per frame. The second run, on the final code:

| view | fps | update ms | render ms | calls | tris |
|---|---|---|---|---|---|
| cabin gate | 60 | 1.63 | 4.32 | 172 | 1123k |
| cabin takeoff | 60 | 1.47 | 5.13 | 165 | 1105k |
| cabin climb | 60 | 1.32 | 3.49 | 162 | 1199k |
| cabin cruise | 60 | 1.36 | 3.88 | 164 | 1211k |
| cabin approach | 60 | 1.29 | 3.80 | 170 | 1084k |
| cabin landing | 60 | 1.44 | 4.35 | 170 | 1084k |
| cabin landed | 60 | 1.30 | 3.80 | 170 | 1084k |
| cabin aisle cruise | 60 | 1.28 | 5.91 | 130 | 1193k |
| gate spawn | 60 | 1.25 | 4.52 | 56 | 408k |
| island spawn | 60 | 1.45 | 6.85 | 983 | 3037k |
| island plaza | 60 | 1.77 | 5.51 | 479 | 2530k |
| island marknad | 60 | 1.37 | 6.98 | 807 | 3272k |
| island kasbah | 60 | 1.67 | 5.99 | 420 | 2599k |
| island drive centre | 60 | 1.38 | 7.13 | 957 | 3202k |
| island high | 60 | 1.21 | 3.83 | 1060 | 3893k |

The worst frame is about 9 ms: render time varies ±2 ms between runs, and the first run's marknad was 1.5 + 7.5. That leaves 110+ fps of headroom on the RTX 4070, so no optimisation was done. The cabin busts (about 3.2k triangles each) are not a problem.

## Known issues, not fixed (staging and look, for Phase 3)

- `sceneryPeek` `peek_approach_2_out` is a solid blue frame. The debug outside-camera sits inside a cloud (A2's known gap). This is a debug scenario only; the in-game cabin camera never goes outside the plane.
- `skandal_multa` and `smash_0`: the test spots put a bush or a palm trunk across the camera. Bushes are props that `segmentBlocked` ignores. This is staging in those scenarios.
- `walk_island` / `walk_kick`: with the eye under the fascia, the "HOTEL FLAMENCO" fascia band fills the top quarter while Stig stands just inside the porch. It reads as a porch; acceptable.
- The open Phase 3 items from the earlier steps' lists still stand: the C1 room numbers, the C2 guardia mast, B's dusch and tomatlada, the palm-kerb distance, the D1 dunes, the D2 towels and canopy hysteresis, the cast_flags_2 giraffe, H's lowercase glyphs, and the julafton/haggle/grisfest camera staging.

## Logs and screenshots (scratchpad)

- First pass on the old code: `p2/s4/b1..b5.log`, `p2/s4/perf1.log`; shots in `out-p2/s4`, `s4b`, `s4c`, `s4d`, `s4e`. Contact sheets are `sheet*.png`, `s?.png`, `v?.png`, `u?-?.png` and `w?.png` in those folders.
- Final pass on 1a592e0: `p2/s4r/r1..r5.log`, `r3b.log`, `story1..3.log`; shots in `out-p2/s4r` (sheets `x1.png`, `f1.png`, `f2.png`).
- `sheet.sh` (scratchpad) is a montage helper: `sheet.sh out.png in…`.

## Gate fix 1

Commit `c30b0ff` on main. Tag `phase2` moved from 1a592e0 to it (`git tag -f phase2`), so the tag is now on HEAD, after the docs commit. Logs and shots are in `out-p2/gf1/` in the scratchpad.

### d. `calibrate` "race: one big crash loses the race"

The gate gave two root causes. Both are fixed, and a third problem turned up while fixing them.

1. **Counting.** `calibrate.mjs` used `won = !failed`, so a run whose car had been wrecked counted as a win while the bus was still racing. Now `won` is true only when the stage completed (`rr.t != null && !rr.fail`). The row prints `LOST (car lost)` for such a run.
2. **Cross traffic decided races.** I logged every car-car impact of the player's car and of the bus (who hit what, where, when). In 16 runs on open roads, 2 had a traffic car hit the player's car and the bus in the first junction 3.5 s after "KÖR!". The gate's runs had the same thing: a car wrecked at the second junction (impacts at (42,−118..−120)), and a crashed run that won after the bus was held up at the first junction. A clean run lost after sitting 15.6 s behind traffic.
   - **Fix: a closed course** (`closeCourse` in kinds/core.js, `game.closure`, drivers.js, main.js).
   - At race init it removes moving traffic within 7 m of the course (both lanes) or within 28 m of a course junction.
   - While the race runs, no traffic spawns on a road that touches a course junction.
   - A traffic car heading into a course junction brakes to a stop about 11 m short of the junction centre and parks. It waits there until both racers have been through that junction. The grid's own junction counts as already passed.
3. **Creep (found in the probe).** The first version still let traffic into the junctions. A held car's coasting throttle (0.15) crept it on at 1.2 m/s until it was inside 7 m, where the closure no longer applied. Held cars now brake and park. A car queued behind a held car no longer escalates to "ignore obstacles" after 3.5 s, which would have shoved the car in front into the junction.

**Results on the final code:**
- 12 clean races all won by 1.7–2.0 s.
- 12 one-crash races all lost by 2.2–2.4 s.
- No car-car impact in any of the 24 runs.
- Runs: `race8c.log` (8+8), `calfull1.log` (2+2), `calfull2.log` (2+2).
- The autopilot now also logs what held it up (`blockedBy`: traffic / parked / ped / the bus).

### e. Difficulty rule

**Jeep (bodega s9).** I re-measured with `JEEP_RUNS=20` (`homejeep.log`) and pooled that with the two default runs (12 each) and the gate's run, all on the same chase code: 35 usable chases.
- Times 6–124 s, median 24.5 s, **p75 34.4 s**. The timer is now **42** (was 40; ceil(1.2 × 34.4) = 42).
- The single runs' p75 swings a lot: 37.9 (15 chases), 33.9 (6), 27.7 (10) and 49.7 (4). That is why the default `JEEP_RUNS` is now 12.
- 15 chases were autopilot wedges and were excluded. Most stuck the truck at the Hotel Flamenco back-lot kerb, between a street tree at (−10, −33.6) and the bins at z −30, where its 1 s reverse cannot free it. The probe trace showed the jeep 300 m away and fleeing. This is an autopilot limit, not a game bug; it is a known issue below.

**Home (bodega s10).** All five fits since the balance pass give v 30–35 m/s, so the shipped 6.3 + d/28.6 came from older code.
- Re-measured with `HOME_RUNS=3` (new env var, default 2) over 6 spots × 3 = 18 drives, 12 of them clean: fit **4.9 + d/34.4**. The default runs gave 5.1 + d/35.4 and 4.8 + d/34.5.
- `HOME` is now `{ c: 7.9, v: 34.4 }` (the fit + 3 s turn), and the fallback `TIMERS.bodegaHome` is 30. homeTimer now runs 17–30 s.
- Each spot's clean drives sit within ±2 s of the line, because the routes differ: arriving from the east means a left turn across the road into the lot. So for a single spot the timer is 1.12–1.37 × its own drive + 3 s. The old fit gave 1.16–1.42. This is written down in DESIGN §8.

**Pooled checks of the deterministic drives the gate listed.**
- vischan: median of 8 clean over three runs = 25.8. The drive is 25.4 s unless traffic holds it up 1–1.5 s, and single runs give 25.4–26.2. ceil(1.2 × 25.8) = 31, the shipped value.
- julafton guests: median of 8 clean in 6 runs = 72.4 → 87, the shipped value.
- buss17 44.8 → 54, asnan 15.5 → 19, Tonga 19.0 → 23: all unchanged.

**Minor.** The asnan comment in island.js and DESIGN §8 now both say "median of 3 clean" (15.5–15.6 s).

### Re-run checks (PORT 8870, OUT `out-p2/gf1`)

| check | result |
|---|---|
| `node --check` on every tracked .js/.mjs | clean |
| `CAL=race RACE_RUNS=8 calibrate` (closed course) | PASS, 8/8 clean won, 8/8 crash lost, no impacts |
| `CAL=home,jeep JEEP_RUNS=20 HOME_RUNS=3 calibrate` | PASS |
| full `calibrate`, twice (`calfull1.log`, `calfull2.log`) | PASS, PASS |
| `story`, twice | `#13 idle`, no errors, PASS (both) |
| `fullstory kinds` (twice, after the fixture literals changed) | PASS, fullstory `#13 idle` |
| `start walk aerial drive traffic` | PASS |
| `skandal transition api levels` | PASS |
| race screenshots (`sheet_race.png`) | countdown, grid and course look normal |

### Known issues

- The `calibrate` chase autopilot wedges in about 30 % of jeep chases, mostly at the Flamenco back-lot kerb. It reverses for 1 s with the opposite wheel and cannot get out from between a tree and the bins. The excluded chases are probably long ones, so the p75 may be biased low. A smarter unstick (longer reverse, alternating wheel) would give a fuller sample.
- The random on-foot stages (balls, sheep, flowers) still swing ±25 % with the default 4 runs. The CAL CHECK lines only warn for them. The shipped values come from 12-run measurements.
