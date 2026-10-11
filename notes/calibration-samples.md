# Calibration samples: the raw-sample ledger

A random stage's timer (DESIGN §8 "Timers and difficulty") is the rule applied to the **pooled
samples in this file**: the 75th percentile of every run in the stage's current pool (the median
for the plates, a fixed layout), plus 0.5 s per target on foot, × 1.2 (drives) or × 1.25 (on foot), rounded up to a whole second. The table
row and the stage literal quote the pool's n and p75; anyone can re-derive them:

```sh
node tools/pool.mjs                 # every pool: n, median, p75, T_ref, timer, 90 % range
node tools/pool.mjs friskotekBalls  # one stage
```

Why this file exists: Phase 3 r1 repair 1 shipped the balls timer (33) from 72 runs whose logs
were in a scratchpad lost on a reboot. Gate 2 could not reproduce them (its 20 runs pooled to 41)
and could not check them either. A timer whose runs nobody can see is a guess.

## Rules

- **Every raw time goes in.** One row per sample (one `calibrate` / `calibflight` invocation, or
  one batch of a probe): the date, the code it ran on (the commit, plus `uncommitted: …` if the
  tree was dirty), the pool, the env, n and **every** run's time in run order, two decimals, from
  the `… run k` lines of the log. Runs left out are listed with the reason (a wedged jeep, a lost
  truck, a walker that got stuck); they are never silently dropped.
- **Pool only like with like.** Samples pool when they ran the same stage code (the mission
  definition, the stage kind, the world the stage plays in, the actors it uses) and the same
  autopilot code (the walker, the chase, the sweeper). A change to either starts a new pool. A pool
  is named `<autopilot version>/<first commit>`; the versions are below.
- **The timer comes from the stage's current pool**, i.e. the one on the code that ships. The `CAL
  CHECK` / `CALF CHECK` of a new run says whether one sample agrees with the shipped timer; it is
  not the measurement.
- **Lost samples** (raw times gone) are listed with what was reported, marked `lost`, and never
  pooled: `tools/pool.mjs` skips a row whose times cell starts with "lost".
- A deterministic stage measured over several runs keeps its samples here too, and its rule is the
  median: the plates (a fixed layout, only the tour order could vary) and the two stages whose
  on-foot leg the walker fix shortened (grisfest Tonga, julafton guests).

## Autopilot versions

| version | what | code |
|---|---|---|
| `walker-r1r1` | The on-foot A* walker of Phase 3 r1 repair 1: plans round static solids and stopped cars (< 1.5 m/s, within 30 m); progress = the straight-line distance to the target (12 s without 1 m of it: stuck; 2 s without it and no re-plan for 2 s: re-plan with an `avoid` on the next route cell, jumps off); re-plans every 0.6 s while the target moves, a new target included; target = the nearest by the straight line. | `tools/scenarios/calibrate.mjs` at d9451f8 |
| `walker-r1r2a` | Phase 3 r1 repair 2, first version (superseded, not the shipping pool): as `walker-r1r1`, but it tracks its place on the route (k moves on to the nearest of the next cells it can walk straight to: the old walker paced back and forth for 2–3 s at a time when it passed a cell further than 0.7 m off, ~40 % of a sheep chase in 12 traced runs); progress is measured along the route (12 s without 1 m of net progress: stuck; 30 s without getting 1 m closer to the target along the route: stuck; 2 s without route progress: the stall re-plan, at most once per 2 s); re-plans at once on a new target; keeps its target until another is 1 m nearer. Two flowers runs in 24 got stuck against Hotel Flamenco (in room 107; in a corner behind the hotel), both from the A* defect fixed in `walker-r1r2`. | `tools/scenarios/calibrate.mjs` sha1 ec3dce2b1f23 (uncommitted) |
| `walker-r1r2b` | Phase 3 r1 repair 2, second version (superseded after 3 runs): `walker-r1r2a` + when A* returned no route it backed out to the last spot where it stood with 0.4 m clearance. Its first run got stuck in a corner behind Hotel Flamenco (the A* defect again) and the batch was stopped. | `tools/scenarios/calibrate.mjs` sha1 a2227eec2596 (uncommitted) |
| `walker-r1r2` | Phase 3 r1 repair 2, final: `walker-r1r2a` with a working A* round large obstacles (`footPath` kept its costs in a Float32Array and compared float64 sums with them, so equal grid paths "bettered" each other by rounding and every cell was expanded 3–4 times; round the 52 m hotel 160000 expansions ran out before the pool deck and the part path led into the hotel's back wall; now float64 costs, a real improvement only, exact √2 diagonals, a jump ordered by its full cost, stale heap entries not counted: north side → pool deck in 4057 expansions), and when no cell next to the start can be entered it backs out along its own trail to a point the grid can plan from (`wedges` in the walk result). | `tools/scenarios/calibrate.mjs` sha1 c38aefef4b7e (measured); committed in "Phase 3 r1 repair 2" as sha1 f671042a7dfe, which differs from it only in comments; r3 ledger2 changed only the `CAL TABLE` label of a lost truck (no autopilot code) |
| `chase-r1if` | The jeep chase autopilot of Phase 3 r1 island-flow: the unstick state lives in the chase, a repeat within 6 s backs up longer with the wheel the other way, 2.5 s of road after backing out. A chase averaging < 6 m/s is wedged (excluded); a run without the truck at the end lost it (excluded). | `tools/scenarios/calibrate.mjs` since 03db6b6 (unchanged at d9451f8; r3 ledger2 changed only the `CAL TABLE` label of a lost truck, "truck lost" where it said "wedged") |
| `sweeper-r1r1` | The `calibflight` sprit sweeper of Phase 3 r1 repair 1: sprints after the nearest bottle on its side, waits in the aisle 2.4 m from a moving trolley (1.7 m from a stopped one), steps into a row only in turbulence. | `tools/scenarios/calibflight.mjs` at d9451f8 |
| `sweeper-r2fm` | Phase 3 r2 flight-missions: `sweeper-r1r1`, but it holds Space only while the turbulence shakes (not through its 1.5 s warning); the stage now has its turbulence inside the sweep (warned at 1.5 s, shaking 3–6 s), so this is a new stage and a new pool. | `tools/scenarios/calibflight.mjs` at b69c64e |

Sample ids: `p2` Phase 2, `r2g1` r2 gate 1 (`D` default `calibrate`, `F` its flowers run, `C` default `calibflight`), `orc` the orchestrator, `fm` r2 flight-missions, `is` r2 island-staging, `wt` r1 world-town, `if` r1 island-flow, `g1` r1 gate 1, `r1` r1 repair
1, `g2` r1 gate 2 (`R1`/`R2`: its two default-env `calibrate` runs, `X`: its extra balls run),
`r2` r1 repair 2, `r3ff` r3 flight-flow, `r3fl` r3 flight-look, `r3ic` r3 island-camera, `r3ft` r3 flight-trolley, `r3rf` r3 repair-flight,
`r3g1` r3 gate 1 (`D` default `calibrate`, `C` default `calibflight`), `r3l` r3 ledger (`F1`–`F3` its
flowers batches, `D` and `C` its default runs on the final code), `r3g2` r3 gate 2 (`D`, `C` as for
`r3g1`), `r3v2` the r3 verify2 of repair-flight (`C` its default `calibflight`), `r3rf2` r3
repair2-flight (`C`).

r3 gate 1 ran on ea6c96a. The three repair commits after it (e458d7e, 5b996be, 6d5b919) change
none of these stages' code, world, actors or autopilots: the flight's `via` guides (gate, ombord,
landning; the sprit sweep has none and its sweeper follows no guide), the stage seat's reach and the
gate's `retryFear`; asnan's Angerud hidden from its paint drive (a fixed drive, no pool) and
julafton's party porter (the scene after the guests stage); the camera's side slide (the autopilots
set the camera's yaw themselves, and the slide moves only the eye). So each of its rows joins the
pool its stage was in on ea6c96a; for the flowers that is a new one (below).

r3 gate 2 and the verify2 of repair-flight ran on 4887ede (clean), which differs from 6d5b919 only in
timer literals and docs (`calibrate` raises every timer it measures). The three commits after it
change none of these stages' code, world, actors or autopilots: b014460 is camera.js only (the side
slide's hold and cut rules; `cam.yaw` is untouched, and the walker sets it itself, calibrate.mjs:856);
bf50e87 is `via` in missions/flight.js (the arrow's leg point on the gate, queue, boarding, ombord and
landning [1] guides; the sprit sweep has no `via`, and the sweeper follows no guide); cd39361 is
runner.js `fail()` re-hiding the checkpoint stage's `startCue` hides on the fail screen (asnan stage 9
only; no pooled stage has a hide, and a calibration run with its timer raised does not fail). So each
row of r3 gate 2 (`r3g2-D`, `r3g2-C`), of the verifier (`r3v2-C`) and of repair2-flight (`r3rf2-C`,
on bf50e87's tree) joins the pool its stage is in now. r3 ledger2 changed only the `CAL TABLE`
label of a lost truck in `calibrate.mjs` (no autopilot code).

**Phase 3's sampling closed on 2026-10-11 (r3 ledger2).** Every raw run made up to here is in the
tables below, pooled by the rules above, and every shipped timer is its current pool's rule. The
sheep and balls pools sit on a rounding boundary (sheep 28 → 27 → 28 with two default runs of
n 4), so the orchestrator stopped adding default runs before the tag rather than let the last one
decide. The pools stay open: every future run goes in, and a timer follows its pool.

## `friskotekBalls` · §8.7 s1 · six fleeing beach balls · on foot: timer = ceil(1.25 × (p75 + 6 × 0.5))

Phase 3 r2 island-staging placed everyone for the intro's group shot (Stig, Lasse, the sisters, the
Storchs, Ole), so the chase starts from Stig's placed spot (−11.0, −69.4) with the cast standing
elsewhere: a new stage, a new pool (named after that fixer's commit). The rows above it ran the old
intro (Stig on the approach spot) and do not pool with it.

Phase 3 r3 island-camera made the notice board on the lawn's west edge solid (x −21.66…−21.54,
z 2.9…5.1 in the block; only its posts were): the lawn's world changed, a new pool.

Current pool: `walker-r1r2/r3-island-camera`: n 48, median 13.32, p75 15.34 → T_ref 18.34 → timer ceil(1.25 × 18.34) = **23** (90 % range 22–25). At n 44 (through r3 ledger's default run) p75 15.56 → T_ref 18.56 → 24; r3 gate 2's default run (10.05 12.32 11.67 9.78) took it to 23.

| sample | date | code | pool | env | n | raw times (s, run order) | excluded (reason) |
|---|---|---|---|---|---|---|---|
| p2 | Phase 2 | Phase 2 balance | — | FOOT_RUNS=12 | 12 | lost (reported: p75 21.9 → 32) | — |
| wt, g1, r1 | 2026-10-09 | r1 world-town's, gate 1's and repair 1's trees (up to 03db6b6) | — | several | 84 | lost (r1 repair's pool of the old walker over r1 world-town, gate 1 and r1 repair batches: median 22.1, p75 25.9 → 37) | — |
| r1 | 2026-10-09 | 03db6b6 + uncommitted: r1 repair 1 | — | FOOT_RUNS=12 batches | 72 | lost (reported: median 19.5, p75 23.1 → 33, range 31–35; the basis of the shipped 33; gate 2 could not reproduce it) | — |
| r1 | 2026-10-09 | 03db6b6 + uncommitted: r1 repair 1 walker, old car rule | — | FOOT_RUNS=12 | 12 | lost (reported: gives 33, 0 knock-overs) | — |
| g2-R1 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (FOOT_RUNS=4) | 4 | 37.18 30.68 13.20 26.38 | none (falls 0) |
| g2-R2 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (FOOT_RUNS=4) | 4 | 34.30 15.38 21.07 26.48 | none (falls 0) |
| g2-X | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | CAL=balls FOOT_RUNS=12 | 12 | 14.48 13.08 35.75 21.22 23.27 21.60 27.08 30.07 29.17 19.92 13.25 17.88 | none (falls 0) |
| r2-A | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 ec3dce2b1f23; tools and docs only, no game file) | `walker-r1r2a/d9451f8` | CAL=flowers,plates,balls,sheep FOOT_RUNS=12 PLATE_RUNS=8 | 12 | 12.08 14.12 14.08 8.12 8.13 12.25 14.78 10.90 11.10 14.37 13.88 14.88 | none (falls 0, wedges 0) |
| r2-F1 | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 c38aefef4b7e; tools and docs only, no game file) | `walker-r1r2/d9451f8` | CAL=flowers,plates,balls,sheep FOOT_RUNS=12 PLATE_RUNS=8 | 12 | 11.10 12.08 15.40 12.92 15.70 16.38 13.95 14.33 13.00 8.77 13.95 13.47 | none (falls 0, wedges 0) |
| r2-F2 | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 c38aefef4b7e; tools and docs only, no game file) | `walker-r1r2/d9451f8` | CAL=flowers,balls,sheep FOOT_RUNS=12 | 12 | 11.83 14.08 16.22 9.53 16.55 8.70 14.63 10.07 13.00 8.15 5.98 17.02 | none (falls 0, wedges 0) |
| r2-F3 | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 c38aefef4b7e; tools and docs only, no game file) | `walker-r1r2/d9451f8` | CAL=balls FOOT_RUNS=12 | 12 | 16.30 19.80 9.67 18.50 15.55 12.40 11.48 11.52 15.83 14.03 13.63 14.08 | none (falls 0, wedges 0) |
| r2-C | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file; and the timers of this repair in island.js) | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 10.92 12.08 12.95 16.33 | none (falls 0, wedges 0) |
| r2-D | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file) and the final timers (the commit's tree) | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 14.00 16.62 13.82 12.55 | none (falls 0, wedges 0) |
| is-1 | 2026-10-10 | 61bbcea + uncommitted: r2 island-staging (the friskotek intro's placements; `calibrate.mjs` sha1 f671042a7dfe, unchanged) | `walker-r1r2/r2-island-staging` | CAL=balls FOOT_RUNS=12 | 12 | 14.60 15.25 9.00 15.88 16.18 12.60 13.55 11.53 15.40 12.10 16.03 13.63 | none (falls 0, wedges 0) |
| is-2 | 2026-10-10 | 61bbcea + uncommitted: r2 island-staging (the friskotek intro's placements; `calibrate.mjs` sha1 f671042a7dfe, unchanged) | `walker-r1r2/r2-island-staging` | CAL=balls FOOT_RUNS=12 | 12 | 13.07 11.02 13.87 11.48 13.18 15.95 11.18 12.75 9.50 10.22 12.58 15.03 | none (falls 0, wedges 0) |
| is-3 | 2026-10-10 | 61bbcea + uncommitted: r2 island-staging (the friskotek intro's placements; `calibrate.mjs` sha1 f671042a7dfe, unchanged) | `walker-r1r2/r2-island-staging` | CAL=balls FOOT_RUNS=12 | 12 | 18.63 11.62 15.22 13.87 14.53 10.73 17.20 5.98 14.28 16.08 20.83 11.65 | none (falls 0, wedges 0) |
| r2g1-D | 2026-10-10 | ca2a3a6 | `walker-r1r2/r2-island-staging` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 15.45 9.82 15.53 12.65 | none (falls 0, wedges 0) |
| r3ic-1 | 2026-10-10 | 302d4c2 + uncommitted: r3 island-camera (the Fataga crags' box colliders and the friskotek notice board's solid; `calibrate.mjs` sha1 f671042a7dfe, unchanged) | `walker-r1r2/r3-island-camera` | CAL=balls,sheep FOOT_RUNS=12 | 12 | 9.68 17.58 15.82 10.70 7.20 13.33 19.73 12.40 12.93 11.77 15.30 15.47 | none (falls 0, wedges 0) |
| r3ic-2 | 2026-10-10 | 302d4c2 + uncommitted: r3 island-camera (the Fataga crags' box colliders and the friskotek notice board's solid; `calibrate.mjs` sha1 f671042a7dfe, unchanged) | `walker-r1r2/r3-island-camera` | CAL=balls,sheep FOOT_RUNS=12 | 12 | 20.93 17.07 12.97 13.15 16.60 13.23 16.37 11.17 9.58 14.52 14.68 16.23 | none (falls 0, wedges 0) |
| r3ic-3 | 2026-10-10 | 302d4c2 + uncommitted: r3 island-camera (the Fataga crags' box colliders and the friskotek notice board's solid; `calibrate.mjs` sha1 f671042a7dfe, unchanged) | `walker-r1r2/r3-island-camera` | CAL=balls,sheep FOOT_RUNS=12 | 12 | 11.68 12.43 15.05 13.22 16.75 10.50 13.73 14.78 12.40 13.47 14.57 12.50 | none (falls 0, wedges 0) |
| r3g1-D | 2026-10-10 | ea6c96a | `walker-r1r2/r3-island-camera` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 14.48 12.85 16.78 13.95 | none (falls 0, wedges 0) |
| r3l-D | 2026-10-11 | 6d5b919 + uncommitted: this step's flowers timer 27 (island.js, the fixture) and docs; no stage or autopilot change | `walker-r1r2/r3-island-camera` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 16.57 13.73 13.32 12.68 | none (falls 0, wedges 0) |
| r3g2-D | 2026-10-11 | 4887ede | `walker-r1r2/r3-island-camera` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 10.05 12.32 11.67 9.78 | none (falls 0, wedges 0) |

## `fatagaSheep` · §8.11 s5 · six fleeing sheep · on foot: timer = ceil(1.25 × (p75 + 6 × 0.5))

Phase 3 r3 island-camera gave Fataga's six north crags box colliders along their long axis (the
1 m circle let the player 2–3 m into the rock; the sheep run there): the village's world changed, a
new pool. The previous one, `walker-r1r2/d9451f8`, ended at n 36 (p75 18.36 → 27).

Current pool: `walker-r1r2/r3-island-camera`: n 48, median 16.32, p75 18.80 → T_ref 21.80 → timer ceil(1.25 × 21.80) = **28** (90 % range 26–30). Island-camera's 36 alone and with r3 gate 1's 4 gave p75 18.80 → 28; r3 ledger's default run took it to 27 (n 44, p75 18.40), r3 gate 2's back to 28.

| sample | date | code | pool | env | n | raw times (s, run order) | excluded (reason) |
|---|---|---|---|---|---|---|---|
| p2 | Phase 2 | Phase 2 balance | — | FOOT_RUNS=12 | 12 | lost (reported: median 25.1, p75 30.3 → 42; the basis of the shipped 42) | — |
| g2-R1 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (FOOT_RUNS=4) | 2 | 28.87 20.15 | run 2: the walker gave up, "stuck" at (−216.8, −190.1) with the last sheep at (−255.9, −182.4) (finding B1; the calibrate run stopped there, run 3 never ran) |
| g2-R2 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (FOOT_RUNS=4) | 4 | 28.58 21.40 21.63 32.18 | none (falls 0) |
| r2-p | 2026-10-09 | d9451f8 (the walker of d9451f8; the tree had uncommitted tool and doc edits only) | `walker-r1r1/d9451f8` | probe-sheep-trace (calibrate's sheep setup, a walker trace every 0.1 s), RUNS=12 | 12 | 19.47 27.68 41.78 18.78 27.45 20.07 26.73 18.53 17.07 25.28 24.98 28.03 | none (falls 0) |
| r2-p2 | 2026-10-09 | d9451f8 + uncommitted: this repair's first walker (as sha1 ec3dce2b1f23 but for two comments) | `walker-r1r2a/d9451f8` | probe-sheep-trace (calibrate's sheep setup, a walker trace every 0.1 s), RUNS=6 | 6 | 9.23 11.10 15.55 14.15 16.03 18.97 | none (falls 0) |
| r2-A | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 ec3dce2b1f23; tools and docs only, no game file) | `walker-r1r2a/d9451f8` | CAL=flowers,plates,balls,sheep FOOT_RUNS=12 PLATE_RUNS=8 | 12 | 13.27 27.88 19.68 12.53 16.28 18.82 13.65 11.93 31.42 19.38 15.77 15.08 | none (falls 0, wedges 0) |
| r2-F1 | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 c38aefef4b7e; tools and docs only, no game file) | `walker-r1r2/d9451f8` | CAL=flowers,plates,balls,sheep FOOT_RUNS=12 PLATE_RUNS=8 | 12 | 23.72 16.32 17.42 15.77 18.35 14.97 25.38 14.23 15.12 9.48 17.30 24.00 | none (falls 0, wedges 0) |
| r2-F2 | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 c38aefef4b7e; tools and docs only, no game file) | `walker-r1r2/d9451f8` | CAL=flowers,balls,sheep FOOT_RUNS=12 | 12 | 19.05 9.80 15.48 11.03 14.88 5.92 21.45 18.03 13.60 15.00 11.45 19.78 | none (falls 0, wedges 0) |
| r2-C | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file; and the timers of this repair in island.js) | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 21.33 14.03 16.43 11.27 | none (falls 0, wedges 0) |
| r2-D | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file) and the final timers (the commit's tree) | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 27.77 16.90 15.90 15.90 | none (falls 0, wedges 0) |
| r2g1-D | 2026-10-10 | ca2a3a6 | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 18.37 15.00 12.93 15.62 | none (falls 0, wedges 0) |
| r3ic-1 | 2026-10-10 | 302d4c2 + uncommitted: r3 island-camera (the Fataga crags' box colliders and the friskotek notice board's solid; `calibrate.mjs` sha1 f671042a7dfe, unchanged) | `walker-r1r2/r3-island-camera` | CAL=balls,sheep FOOT_RUNS=12 | 12 | 12.43 16.17 13.38 14.08 17.17 12.68 15.80 15.55 15.53 17.52 15.78 18.75 | none (falls 0, wedges 0) |
| r3ic-2 | 2026-10-10 | 302d4c2 + uncommitted: r3 island-camera (the Fataga crags' box colliders and the friskotek notice board's solid; `calibrate.mjs` sha1 f671042a7dfe, unchanged) | `walker-r1r2/r3-island-camera` | CAL=balls,sheep FOOT_RUNS=12 | 12 | 16.67 20.20 15.25 13.58 19.53 15.83 14.27 22.95 20.88 16.47 14.18 19.60 | none (falls 0, wedges 0) |
| r3ic-3 | 2026-10-10 | 302d4c2 + uncommitted: r3 island-camera (the Fataga crags' box colliders and the friskotek notice board's solid; `calibrate.mjs` sha1 f671042a7dfe, unchanged) | `walker-r1r2/r3-island-camera` | CAL=balls,sheep FOOT_RUNS=12 | 12 | 12.60 18.97 12.98 17.57 14.53 16.90 29.52 23.87 10.22 13.18 11.22 27.07 | none (falls 0, wedges 0) |
| r3g1-D | 2026-10-10 | ea6c96a | `walker-r1r2/r3-island-camera` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 25.22 18.28 14.27 18.28 | none (falls 0, wedges 0) |
| r3l-D | 2026-10-11 | 6d5b919 + uncommitted: this step's flowers timer 27 (island.js, the fixture) and docs; no stage or autopilot change | `walker-r1r2/r3-island-camera` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 13.42 17.80 17.25 14.43 | none (falls 0, wedges 0) |
| r3g2-D | 2026-10-11 | 4887ede | `walker-r1r2/r3-island-camera` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 23.10 15.90 23.12 18.07 | none (falls 0, wedges 0) |

## `grisfestFlowers` · §8.12 s1 · five static flowers, random spawns · on foot: timer = ceil(1.25 × (p75 + 5 × 0.5))

Phase 3 r3 island-staging (302d4c2) gave the grisfest intro a porch shot that places Stig on
`approachSpot('flamenco')` (−4, −9.5), where `calibrate` already started the flowers, and Ole 1.6 m
beside him at (−5.6, −9.4) (he stood on the landmark, (−4, −8), 1.5 m in front of him); r3 flight-look
turns Stig to the guide when the intro ends. The start spot, the world and the spawns are unchanged (a
probe on ca2a3a6 and on 6d5b919: the same start, the same 15137 reachable cells in the spawn ring, and
the straight-line nearest-first tour over 4000 simulated layouts has the same median, 120.8 / 120.5 m),
but the actors round the start are not: by the rule (r2's friskotek intro is the precedent) a new
pool, `walker-r1r2/r3-island-staging`. r3 gate 1's 4 runs on ea6c96a (no later commit touches
grisfest) start it, outside the shipped 23's range (24–27); r3 ledger's three batches and its default
run on the final code complete it. Its times sit with the round-1 world's pool (`walker-r1r2/d9451f8`,
median 16.18, p75 17.79 → 26; Mann–Whitney z 0.0 against this pool's 44 runs), not with
`walker-r1r2/46a0938` (median 13.32; z 1.9 against this pool, −1.8 against the round-1 one): the
walker's speed is the same in all three (8.1–8.7 m/s over the walked distance, one new run 7.7; 5–7
plans a run, no wedge), so they differ in the layouts' tour lengths, and the 46a0938 pool's 28 runs were the short
side of them. The rows of `walker-r1r2/46a0938` and before ran the old intro.

Current pool: `walker-r1r2/r3-island-staging`: n 48, median 16.22, p75 18.24 → T_ref 20.74 → timer ceil(1.25 × 20.74) = **26** (90 % range 25–27). At n 40 (before r3 ledger's default run) p75 18.305 → T_ref 20.805 → 27; at n 44 as now.

| sample | date | code | pool | env | n | raw times (s, run order) | excluded (reason) |
|---|---|---|---|---|---|---|---|
| p2 | Phase 2 | Phase 2 balance | — | FOOT_RUNS=12 | 12 | lost (reported: median 27.5, p75 31.1 → 42; the basis of the shipped 42) | — |
| g2-R1 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (FOOT_RUNS=4) | 4 | 17.53 30.33 24.20 26.32 | none (falls 0) |
| g2-R2 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (FOOT_RUNS=4) | 4 | 23.28 29.37 20.47 29.93 | none (falls 0) |
| r2-A | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 ec3dce2b1f23; tools and docs only, no game file) | `walker-r1r2a/d9451f8` | CAL=flowers,plates,balls,sheep FOOT_RUNS=12 PLATE_RUNS=8 | 12 | 12.23 12.07 18.05 9.50 16.93 8.35 16.20 14.20 24.83 20.10 27.02 23.53 | none (falls 0, wedges 0) |
| r2-B | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 ec3dce2b1f23; tools and docs only, no game file) | `walker-r1r2a/d9451f8` | CAL=flowers,balls,sheep FOOT_RUNS=12 | 11 | 13.50 13.78 16.83 16.23 8.72 14.13 10.45 15.10 18.37 19.67 25.78 | run 6: stuck {"p":[-15.4,0.15,-21.1],"t":[-4.9,0.15,-30.6],"route":1,"why":"no progress 12 s"} (falls 0, wedges 0) |
| r2-F1v | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 a2227eec2596; tools and docs only, no game file) | `walker-r1r2b/d9451f8` | CAL=flowers,plates,balls,sheep FOOT_RUNS=12 PLATE_RUNS=8 (stopped after 3 flowers runs) | 2 | 17.60 24.05 | run 0: stuck {"p":[3.6,0.15,-27.4],"t":[6.6,0.15,5.8],"route":1,"why":"no progress 12 s"}: in the corner between the hotel's back wall and its north wing, after an A* search round the hotel ran out (falls 0, wedges 0) |
| r2-F1 | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 c38aefef4b7e; tools and docs only, no game file) | `walker-r1r2/d9451f8` | CAL=flowers,plates,balls,sheep FOOT_RUNS=12 PLATE_RUNS=8 | 12 | 17.65 8.00 12.32 17.37 5.18 16.58 13.62 10.63 17.75 15.73 12.30 19.72 | none (falls 0, wedges 0) |
| r2-F2 | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 c38aefef4b7e; tools and docs only, no game file) | `walker-r1r2/d9451f8` | CAL=flowers,balls,sheep FOOT_RUNS=12 | 12 | 19.63 19.23 9.32 19.92 16.50 17.90 15.68 14.33 14.65 16.87 21.25 17.12 | none (falls 0, wedges 0) |
| r2-C | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file; and the timers of this repair in island.js) | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 17.27 15.85 14.30 10.92 | none (falls 0, wedges 0) |
| r2-D | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file) and the final timers (the commit's tree) | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 19.20 15.27 19.83 12.02 | none (falls 0, wedges 0) |
| r2g1-F | 2026-10-10 | ca2a3a6 | `walker-r1r2/46a0938` | CAL=flowers FOOT_RUNS=12 | 12 | 10.92 13.42 12.28 19.62 13.72 16.48 14.58 12.12 15.28 20.63 21.28 15.28 | none (falls 0, wedges 0) |
| r2g1-D | 2026-10-10 | ca2a3a6 | `walker-r1r2/46a0938` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 13.10 17.97 11.53 11.70 | none (falls 0, wedges 0) |
| orc-F | 2026-10-10 | ca2a3a6 | `walker-r1r2/46a0938` | CAL=flowers FOOT_RUNS=12 | 12 | 12.72 11.73 13.23 11.50 12.63 17.03 15.50 9.65 11.88 10.52 16.42 15.03 | none (falls 0, wedges 0) |
| r3g1-D | 2026-10-10 | ea6c96a | `walker-r1r2/r3-island-staging` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 17.15 16.17 18.92 9.97 | none (falls 0, wedges 0) |
| r3l-F1 | 2026-10-11 | 6d5b919 (the tree dirty only in this ledger) | `walker-r1r2/r3-island-staging` | CAL=flowers FOOT_RUNS=12 | 12 | 15.13 12.15 14.05 19.77 15.93 20.15 19.08 12.53 6.53 11.78 18.38 18.28 | none (falls 0, wedges 0) |
| r3l-F2 | 2026-10-11 | 6d5b919 (the tree dirty only in this ledger) | `walker-r1r2/r3-island-staging` | CAL=flowers FOOT_RUNS=12 | 12 | 13.03 17.90 15.55 18.40 17.85 21.23 9.87 17.02 18.23 16.27 12.65 14.35 | none (falls 0, wedges 0) |
| r3l-F3 | 2026-10-11 | 6d5b919 (the tree dirty only in this ledger) | `walker-r1r2/r3-island-staging` | CAL=flowers FOOT_RUNS=12 | 12 | 19.45 15.63 8.35 13.98 16.35 19.88 16.53 12.17 23.85 18.17 7.85 16.63 | none (falls 0, wedges 0) |
| r3l-D | 2026-10-11 | 6d5b919 + uncommitted: this step's flowers timer 27 (island.js, the fixture) and docs; no stage or autopilot change | `walker-r1r2/r3-island-staging` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 14.87 12.97 10.08 17.62 | none (falls 0, wedges 0) |
| r3g2-D | 2026-10-11 | 4887ede | `walker-r1r2/r3-island-staging` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 4 | 16.97 19.33 11.27 12.90 | none (falls 0, wedges 0) |

## `bodegaJeep` · §8.9 s9 · wreck the fleeing Guardia jeep · drive: timer = ceil(1.2 × p75)

Current pool: `chase-r1if/d9451f8`: n 130, median 28.00, p75 34.05 → T_ref 34.05 → timer ceil(1.2 × 34.05) = **41** (90 % range 38–43). At n 83 (r1 repair 2) and n 107 (with r3 gate 1) it gave 42, at n 119 (r3 ledger) 41.

| sample | date | code | pool | env | n | raw times (s, run order) | excluded (reason) |
|---|---|---|---|---|---|---|---|
| p2 | Phase 2 gate | Phase 2 (old chase) | — | JEEP_RUNS=20 + | 35 | lost (reported: p75 34.4 → 42; 15 wedges excluded) | — |
| if | 2026-10-09 | 7caa8f9 + uncommitted: r1 island-flow | — | JEEP_RUNS=20 ×2 | 40 | lost (reported: median 26.9, p75 30.6 → 37; single runs' p75 28.7 and 31.6; none wedged) | — |
| g1 | 2026-10-09 | 03db6b6 | — | JEEP_RUNS=20 | 20 | lost (reported: p75 34.2) | — |
| r1 | 2026-10-09 | 03db6b6 + uncommitted: r1 repair 1 | — | JEEP_RUNS=20 ×2 | 38 | lost (reported: p75 34.1 and 30.4; with the above, 98 pooled: median 27.8, p75 32.5 → 40, the shipped 40) | 2 lost the truck after 2–3 unsticks |
| g2-R1 | 2026-10-09 | d9451f8 | `chase-r1if/d9451f8` | default (JEEP_RUNS=12) | 11 | 65.15 28.57 25.90 20.87 15.02 44.28 20.17 29.48 34.12 40.32 39.32 | run 11: 93.55 s, wedged (463 m driven, 4.9 m/s, 18 unsticks) |
| g2-R2 | 2026-10-09 | d9451f8 | `chase-r1if/d9451f8` | default (JEEP_RUNS=12) | 11 | 22.58 36.28 28.95 21.77 28.38 12.43 29.37 30.57 37.88 22.37 29.12 | run 2: 54.38 s, the truck was lost (887 m driven, 4 unsticks) |
| r2-j1 | 2026-10-09 | d9451f8 (clean) | `chase-r1if/d9451f8` | CAL=jeep JEEP_RUNS=20 | 19 | 89.51 20.00 49.43 46.56 86.11 45.86 19.32 26.02 34.77 39.07 28.85 40.12 20.22 26.00 17.32 16.15 31.02 21.07 24.42 | run 11: the truck was lost ("car lost", 607 m driven, 4 unsticks) |
| r2-j2 | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 ec3dce2b1f23; tools and docs only, no game file) | `chase-r1if/d9451f8` | CAL=jeep JEEP_RUNS=20 | 19 | 28.02 21.48 73.80 39.72 29.28 25.60 21.17 29.12 25.55 30.12 26.02 28.17 26.40 27.58 17.98 27.80 30.83 20.80 44.13 | run 5: - s, the truck was lost (car lost, 2494 m driven, 3 unsticks) |
| r2-C | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file; and the timers of this repair in island.js) | `chase-r1if/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 12 | 25.28 18.13 39.95 54.60 27.95 14.55 33.38 24.72 28.98 29.60 20.02 8.08 | none |
| r2-D | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file) and the final timers (the commit's tree) | `chase-r1if/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 11 | 28.82 20.00 31.48 33.62 14.98 17.82 35.17 32.40 44.66 20.25 27.10 | run 3: - s, the truck was lost (car lost, 863 m driven, 2 unsticks) |
| r2g1-D | 2026-10-10 | ca2a3a6 | `chase-r1if/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 12 | 17.77 28.40 21.60 30.25 49.53 33.55 33.77 21.48 17.98 35.60 35.60 37.25 | none (none wedged, none lost the truck; runs 10 and 11 one unstick each) |
| r3g1-D | 2026-10-10 | ea6c96a | `chase-r1if/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 12 | 14.05 35.60 10.07 24.68 27.37 25.95 45.55 22.33 8.48 33.98 36.72 8.83 | none (none wedged, none lost the truck; runs 1 and 9 one unstick each, runs 6 and 10 two) |
| r3l-D | 2026-10-11 | 6d5b919 + uncommitted: this step's flowers timer 27 (island.js, the fixture) and docs; no stage or autopilot change | `chase-r1if/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 12 | 30.15 23.93 27.02 17.18 27.98 35.57 20.12 18.13 16.60 21.82 30.17 20.67 | none (none wedged, none lost the truck; run 5 one unstick) |
| r3g2-D | 2026-10-11 | 4887ede | `chase-r1if/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 11 | 39.15 20.60 38.88 31.73 14.92 14.98 27.35 34.08 30.35 14.18 30.57 | run 5: the truck was lost (at 48.71 s, 823 m driven, 3 unsticks; its `CAL TABLE` said "wedged", a label r3 ledger2 fixed); none wedged; runs 0, 9 and 11 one unstick each |

## `sprit[0]` · §8.4 s0 · five rolling bottles in the cabin · on foot: timer = ceil(1.25 × (p75 + 5 × 0.5))

Phase 3 r2 flight-missions moved the turbulence inside the sweep and changed the sweeper
(`sweeper-r2fm`): a new pool. The shipped **13** comes from `sweeper-r2fm/b69c64e` (36 + 5 runs;
r2 gate, r3 flight-flow, r3 flight-look, r3 flight-trolley, r3 repair-flight, r3 gate 1, r3 ledger,
r3 gate 2, the verify2 of r3 repair-flight and r3 repair2-flight added 5 + 10 + 5 + 10 + 5 + 5 + 5
+ 5 + 5 + 5 on the same stage and sweeper code, and it stays 13).
The rows above it (timer 11, no turbulence in the sweep) do not pool with it.

Current pool: `sweeper-r2fm/b69c64e`: n 101 (fm1 36, fm2 5, r2g1-C 5, r3ff-C 5, r3ff-R 5, r3fl-C 5, r3ft-C1 5, r3ft-C2 5, r3rf-C 5, r3g1-C 5, r3l-C 5, r3g2-C 5, r3v2-C 5, r3rf2-C 5), median 7.32, p75 7.60 → T_ref 10.10 → timer ceil(1.25 × 10.10) = **13** (90 % range 13–13).

| sample | date | code | pool | env | n | raw times (s, run order) | excluded (reason) |
|---|---|---|---|---|---|---|---|
| p2 | Phase 2 | Phase 2 (old sweeper) | — | | | lost (reported: 17.1 → 25) | — |
| r1 | 2026-10-09 | 03db6b6 + uncommitted: r1 repair 1, old sweeper | — | SPRIT_RUNS batches | 32 | lost (reported: bimodal, 4–12 s or 28–30 s; 90 % range of the timer 18–39) | — |
| r1 | 2026-10-09 | 03db6b6 + uncommitted: r1 repair 1 | — | SPRIT_RUNS batches | 48 | lost (reported: 3.8–6.4 s, median 4.9, p75 6.0 → 11, range 11–11; the basis of the shipped 11) | — |
| g2-c1 | 2026-10-09 | d9451f8 | `sweeper-r1r1/d9451f8` | calibflight default | 5 | 4.30 4.32 4.82 5.82 3.80 | none (bowled 0, falls 0) |
| fm1 | 2026-10-10 | 5ff11c4 + uncommitted: r2 flight-missions (the shipped stage literal but timer 11; the autopilot disables the timer) | `sweeper-r2fm/b69c64e` | FLIGHT=sprit SPRIT_RUNS=36 | 36 | 7.62 7.62 7.50 6.90 6.70 7.22 7.02 7.40 6.90 7.00 6.90 7.60 7.40 7.80 7.00 7.12 7.00 7.40 7.40 7.00 7.60 7.20 7.50 7.40 7.60 7.60 7.42 7.50 7.60 7.70 7.62 5.50 5.72 7.60 7.60 7.72 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 12–17) |
| fm2 | 2026-10-10 | b69c64e | `sweeper-r2fm/b69c64e` | calibflight default | 5 | 7.00 6.50 5.70 7.20 7.20 | none |
| r2g1-C | 2026-10-10 | ca2a3a6 | `sweeper-r2fm/b69c64e` | calibflight default (SPRIT_RUNS=5) | 5 | 7.00 7.60 7.60 7.30 7.70 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 15.2–16.9) |
| r3ff-C | 2026-10-10 | 90775a7 + uncommitted: r3 flight-flow (the stage and the sweeper unchanged; FLYGRÄDSLA's idle decay paused in scenes, the `via` guide, retry facing) | `sweeper-r2fm/b69c64e` | calibflight default (SPRIT_RUNS=5) | 5 | 7.22 7.70 7.22 7.30 7.70 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 15.7–17.0) |
| r3ff-R | 2026-10-10 | as r3ff-C | `sweeper-r2fm/b69c64e` | calibflight DIALOG_CPS=20 (SPRIT_RUNS=5) | 5 | 7.70 7.10 7.70 7.60 7.00 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 15.3–17.0) |
| r3fl-C | 2026-10-10 | ded3575 + uncommitted: r3 flight-look (the stage and the sweeper unchanged; the beacon arrow and beam, the TURBULENS! toast and the hold prompt, the camera turned to the guide after the intro) | `sweeper-r2fm/b69c64e` | calibflight default (SPRIT_RUNS=5) | 5 | 7.60 6.40 6.12 7.62 7.60 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 13.0–16.7) |
| r3ft-C1 | 2026-10-10 | 08c1104 + uncommitted: r3 flight-trolley (the stage and the sweeper unchanged; landning parks the trolley, the retry's ambient cues on the fresh run) | `sweeper-r2fm/b69c64e` | calibflight default (SPRIT_RUNS=5) | 5 | 7.22 7.42 7.72 5.40 6.70 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 10.8–16.9) |
| r3ft-C2 | 2026-10-10 | as r3ft-C1 | `sweeper-r2fm/b69c64e` | calibflight default (SPRIT_RUNS=5) | 5 | 7.32 7.00 7.42 6.90 7.70 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 14.9–17.0) |
| r3rf-C | 2026-10-11 | ea6c96a + uncommitted: r3 repair-flight (the stage and the sweeper unchanged; the `via` guide's over-the-furniture pass, the stage seat's reach across its row, the gate statistics' `retryFear`) | `sweeper-r2fm/b69c64e` | calibflight default (SPRIT_RUNS=5) | 5 | 7.40 6.70 6.90 6.93 6.80 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 14.4–16.2) |
| r3g1-C | 2026-10-11 | ea6c96a | `sweeper-r2fm/b69c64e` | calibflight default (SPRIT_RUNS=5) | 5 | 6.90 6.62 7.52 7.10 5.40 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 11.8–16.4) |
| r3l-C | 2026-10-11 | 6d5b919 + uncommitted: this step's island timers (jeep 41, sheep 27, flowers 26: island.js, the fixture) and docs; the stage and the sweeper unchanged | `sweeper-r2fm/b69c64e` | calibflight default (SPRIT_RUNS=5) | 5 | 7.22 7.60 7.40 7.20 7.32 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 15.7–16.7) |
| r3g2-C | 2026-10-11 | 4887ede | `sweeper-r2fm/b69c64e` | calibflight default (SPRIT_RUNS=5) | 5 | 7.82 7.32 6.42 6.70 7.50 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 13.7–17.2) |
| r3v2-C | 2026-10-11 | 4887ede (the verify2 of r3 repair-flight, read-only) | `sweeper-r2fm/b69c64e` | calibflight default (SPRIT_RUNS=5) | 5 | 6.80 7.20 7.72 7.40 6.90 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 14.7–16.9) |
| r3rf2-C | 2026-10-11 | b014460 + uncommitted: r3 repair2-flight (bf50e87's tree; the stage and the sweeper unchanged; the `via` guide's leg point) | `sweeper-r2fm/b69c64e` | calibflight default (SPRIT_RUNS=5) | 5 | 7.40 7.40 7.12 7.00 7.60 | none (no panic, bowled 0, falls 0; FLYGRÄDSLA peaks 15.2–16.7) |

## `grisfestPlates` · §8.12 s4 · ten of the twelve plate stacks · on foot: timer = ceil(1.25 × (median + 10 × 0.5))

A deterministic stage (the stacks are a fixed layout, three per table under the two pergolas,
`world/blocks/nature.js`); runs differ only in the walker's tour order, so the rule is the median.
Kept here because it is measured over several runs.

Current pool: `walker-r1r2/d9451f8`: n 44, median 20.77 → T_ref 25.77 → timer ceil(1.25 × 25.77) = **33** (90 % range 33–33).

| sample | date | code | pool | env | n | raw times (s, run order) | excluded (reason) |
|---|---|---|---|---|---|---|---|
| p2 | Phase 2 | Phase 2 balance | — | | 10 | lost (reported: median 30.3, p75 30.3 → 45 as a random stage; the shipped 45) | — |
| g2-R1 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (2 runs) | 2 | 30.35 30.33 | none (falls 0) |
| g2-R2 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (2 runs) | 2 | 37.95 30.33 | none (falls 0) |
| r2-A | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 ec3dce2b1f23; tools and docs only, no game file) | `walker-r1r2a/d9451f8` | CAL=flowers,plates,balls,sheep FOOT_RUNS=12 PLATE_RUNS=8 | 8 | 22.43 22.43 22.43 22.43 22.43 22.43 22.43 22.43 | none (falls 0, wedges 0) |
| r2-F1 | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 c38aefef4b7e; tools and docs only, no game file) | `walker-r1r2/d9451f8` | CAL=flowers,plates,balls,sheep FOOT_RUNS=12 PLATE_RUNS=8 | 8 | 20.77 20.77 20.77 20.77 20.77 20.77 20.77 20.77 | none (falls 0, wedges 0) |
| r2-C | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file; and the timers of this repair in island.js) | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 6 | 20.78 20.77 20.77 20.77 20.77 20.77 | none (falls 0, wedges 0) |
| r2-D | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file) and the final timers (the commit's tree) | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 6 | 21.03 20.77 20.78 20.77 20.77 20.77 | none (falls 0, wedges 0) |
| r2g1-D | 2026-10-10 | ca2a3a6 | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 6 | 20.77 20.77 20.77 20.77 20.77 20.77 | none (falls 0, wedges 0) |
| r3g1-D | 2026-10-10 | ea6c96a | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 6 | 20.78 21.03 20.77 20.85 21.02 20.78 | none (falls 0, wedges 0) |
| r3l-D | 2026-10-11 | 6d5b919 + uncommitted: this step's flowers timer 27 (island.js, the fixture) and docs; no stage or autopilot change | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 6 | 20.78 20.77 20.77 20.77 20.78 20.77 | none (falls 0, wedges 0) |
| r3g2-D | 2026-10-11 | 4887ede | `walker-r1r2/d9451f8` | default (FOOT_RUNS=4, JEEP_RUNS=12, PLATE_RUNS=6) | 6 | 20.77 20.77 21.03 20.87 20.77 20.77 | none (falls 0, wedges 0) |

## `grisfestTonga` · §8.12 s6 · dance floor on foot to the car, then the drive to Tonga Tonga · drive: timer = ceil(1.2 × (median of walk + drive + 0.5))

A deterministic stage, re-measured over several runs because the fixed walker shortened its walk
(33 m in 3.9 s, the old walker 44–45 m in 6.3–6.5 s). Times are the walk + the drive of clean runs.

Current pool: `walker-r1r2/d9451f8`: n 20, median 15.28 → T_ref 15.78 → timer ceil(1.2 × 15.78) = **19** (90 % range 19–19).

| sample | date | code | pool | env | n | raw times (s, run order) | excluded (reason) |
|---|---|---|---|---|---|---|---|
| g2-R1 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (RUNS=3: 2 runs) | 2 | 18.57 19.95 | none (run 1 held by traffic 3.9 s) |
| g2-R2 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (RUNS=3: 2 runs) | 2 | 18.42 18.57 | none |
| r2-C | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file; and the timers of this repair in island.js) | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 2 | 16.93 15.28 | none (run 0 held by traffic 1 s) |
| r2-TG | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file; and the timers of this repair in island.js) | `walker-r1r2/d9451f8` | CAL=tonga,guests RUNS=9 | 8 | 15.28 15.28 15.28 15.28 15.43 15.47 15.28 15.28 | none (all clean) |
| r2-D | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file) and the final timers (the commit's tree) | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 2 | 15.28 15.28 | none |
| r2g1-D | 2026-10-10 | ca2a3a6 | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 2 | 15.28 15.28 | none (walk 3.90 + drive 11.38 each, no impact) |
| r3g1-D | 2026-10-10 | ea6c96a | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 2 | 15.33 15.30 | none (walk 3.95 + drive 11.38, walk 3.90 + drive 11.40; no impact) |
| r3l-D | 2026-10-11 | 6d5b919 + uncommitted: this step's flowers timer 27 (island.js, the fixture) and docs; no stage or autopilot change | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 2 | 15.28 15.28 | none (walk 3.90 + drive 11.38 each, no impact) |
| r3g2-D | 2026-10-11 | 4887ede | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 2 | 15.30 18.03 | none (walk 3.90 + drive 11.40, held 1.0 s by traffic; walk 3.90 + drive 14.13, held 5.5 s by traffic; no impact) |

## `julaftonGuests` · §8.13 s1 · patio on foot to the hire car, then the four guests by car · drive: timer = ceil(1.2 × median)

A deterministic stage, re-measured because the fixed walker shortened its walk to the hire car (30 m
in 3.5 s, the old walker 50 m in 8.3–8.4 s; the drive legs are unchanged). Times as logged (one
decimal), clean runs only (no impact).

Current pool: `walker-r1r2/d9451f8`: n 17, median 67.40 → T_ref 67.40 → timer ceil(1.2 × 67.40) = **81** (90 % range 81–82).

| sample | date | code | pool | env | n | raw times (s, run order) | excluded (reason) |
|---|---|---|---|---|---|---|---|
| g2-R1 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (RUNS=3: 2 runs) | 2 | 74.7 72.3 | none |
| g2-R2 | 2026-10-09 | d9451f8 | `walker-r1r1/d9451f8` | default (RUNS=3: 2 runs) | 2 | 72.6 72.3 | none |
| r2-C | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file; and the timers of this repair in island.js) | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 2 | 67.1 81.7 | none (run 1 held by traffic 14.5 s on the first leg; clean) |
| r2-TG | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file; and the timers of this repair in island.js) | `walker-r1r2/d9451f8` | CAL=tonga,guests RUNS=9 | 7 | 68.6 68.6 67.2 67.4 67.0 67.1 68.4 | run 0: 69.1 s, 2 impacts (not clean) |
| r2-D | 2026-10-09 | d9451f8 + uncommitted: this repair's `calibrate.mjs` (sha1 f671042a7dfe, the committed file) and the final timers (the commit's tree) | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 2 | 67.7 67.3 | none |
| r2g1-D | 2026-10-10 | ca2a3a6 | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 1 | 67.1 | run 0: 73.2 s, 1 impact (Herr Storch leg held 10.7 s; not clean) |
| r3g1-D | 2026-10-10 | ea6c96a | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 1 | 67.0 | run 0: 71.2 s, 1 impact (the Herr Storch leg, 21.2 s, held 1.8 s; not clean) |
| r3l-D | 2026-10-11 | 6d5b919 + uncommitted: this step's flowers timer 27 (island.js, the fixture) and docs; no stage or autopilot change | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 2 | 67.1 67.4 | none (no impact) |
| r3g2-D | 2026-10-11 | 4887ede | `walker-r1r2/d9451f8` | default (RUNS=3: 2 runs) | 2 | 67.9 68.5 | none (no impact; run 1's Majsan leg held 1.4 s) |
