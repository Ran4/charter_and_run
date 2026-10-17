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

**Feature 25 (Åk bagageband, 2026-10-15) touches no pool.** It changed the collision in Gando's
arrivals hall (coast.js: the carousel's one floor at CURB + 0.8 split into the belt at CURB + 0.64,
the centre island's own stepped floor and the sign's post as a pole) and added a carry after the
player's step that runs only with `missions.state === 'idle'` (DESIGN §10.16). No pooled stage plays
in the hall (Eslövloppet, the one free-roam pool, starts on the Eslöv lane in block (0,1) and runs
round the tomato fields, not through Gando's block (6,0)), and no autopilot passes it, so every pool
below stands and no timer changed.

**Feature 28 (Rakt genom fruktståndet, 2026-10-15) touches no pool.** It made the market's five fruit
stalls (block (2,1)) `frutas` props whose solid is the stall's (kind `'stall'`, the same footprints and
tops; the lone stall at (18.5, −7.75) 3.5 m deep instead of 4, its back 0.5 m further south, inside
the market), breakable only by the player's car with `missions.state === 'idle'` and all five standing
again at every mission start (DESIGN §10.19). car.js now knows a prop by its block's `ref` and meets it
as a wall when `game.breakProp` refuses; for every other prop the smash is what it was, and kicks
(`areaHit`) skip only the fruit stalls. No pooled stage plays in the market's interior (julafton's
guests stop Majsan at its south entrance, the Guardia jeep flees by the streets), and no stage can
break a stall, so every pool below stands and no timer changed.

**Feature 24 (Från fjärde våningen, 2026-10-16) touches no pool.** It put a 10 m diving tower on the
strip between Flamenco's hedge and the pool's deep end (block (3,3), x [−17.4, −13.4], z [2.12, 4.8]
with its board). That strip is inside `grisfestFlowers`' spawn ring (within 40 m of `flamenco`), and
`julaftonGuests`' walk passes west of the hedge. So the tower's solids are live only on the island with
`missions.state === 'idle'` (each block's `dead` is a getter, DESIGN §10.20): in every mission state
`queryBlocks`, `groundAt`, `spotFree`, `freeSpot`, `footReach` and calibrate's walker meet the strip as
before (checked by scenario `hopptorn`: in a running mission no tower solid, the floor at 0.15, the
spot free and in `footReach` from `flamenco`). The tower's geometry draws no random numbers, so the
rest of the world builds as before. Any other hard landing in water now splashes instead of raising
dust (`game.waterSplash`, a look only). Every pool below stands and no timer changed.

**Feature 31 (Fin hund…, 2026-10-17) touches no pool.** It added watchdogs in 12 bungalowR lots and in
the finca's yard on vischan (block (0,1), block-local x [−30.1, −2.6], z [−30.1, −14.8]), live only on
the island with `missions.state === 'idle'` (DESIGN §10.21): in every mission state they are hidden
and act on nothing, so no mission stage, its world or its actors change. town.js and nature.js only
export the lots' data (the trampoline's place is the draw it always was), so the world builds as
before. Eslövloppet, the one free-roam pool, runs on the roads round block (0,1), 4.5 m outside the
yard's canes: Chispa can come no nearer than the inside of the canes (solid, 2.4 m), never touches
Stig there and says nothing for him; only her bark bubbles and sound reach the run. Its walker ran on
this feature's tree (`f31-1` below) as in its pool, so the rows join it; every pool stands and no
timer changed.

**Feature 32 (Badgäster på solstolarna, 2026-10-17) touches no pool.** Its bathers on the sun loungers
and Berra and Robban asleep on two Flamenco loungers exist only on the island with
`missions.state === 'idle'` (DESIGN §10.22): any other state hides every bather and sends the two
home at once in their own outfit, before a mission's intro is framed. No world geometry, prop, solid,
landmark a stage uses, car or timer changed; the new Character state `lying` and `fling`'s `flip` are
used by nobody else, and the bathers off their loungers (the only new people in `allChars` and
`areaHit`) exist only in free roam. Scenario `badgaster` checks that a mission start leaves no bather
and that none is made in the mission; `stekt` that the two stand at their homes, unchanged, at a
mission start. Every pool below stands and no timer changed.

**Feature 52 (Uppför fyren, 2026-10-17) touches no pool.** It changed Faro de Maspalomas' solids in
block (0,6) (DESIGN §10.35): the tower's circle (r 3.4 round (−240, 232)) stops at the gallery floor,
51.3, instead of 99, and the lantern (r 1.75) and a ring of 20 railing walls (r 3.12, top 99) were
added inside that footprint. From the ground and the keeper's roof terrace (4.0) the tower is a wall as
before, and every new block lies inside its old footprint, so `queryBlocks`, `groundAt`, `spotFree`,
`freeSpot`, `footReach`, the cars and calibrate's walker meet the same walls at street level (checked
by scenario `fyren`). No mission stage, route or pooled stage's world is near the lighthouse (its
landmark is only a map label), and its geometry draws no random numbers, so the world builds as
before. The climb moves the free-roam clock (§10.10), which every mission start already sets to the
day palette. Every pool below stands and no timer changed.

**Feature 67 (Garderoben och bergsprängaren i rum 107, 2026-10-17) touches no pool.** Room 107's
wardrobe changes Stig's free-roam outfit only with `missions.state === 'idle'` (DESIGN §10.36), and in
a mission he wears the story's outfit as before (main.js `islandWear()`: `kostym` up to index 5,
`hawaii` after; `runner.begin` puts it on before the talk), so every stage sees the same actor; outfits
change colours and details, never size. The wardrobe's two new hanger meshes are hidden, without a
collider, and draw no random numbers; the suit's hanger only changed colour. No route, stage, car,
autopilot or timer changed (scenario `klader` checks the mission start and the runner going idle).
Every pool below stands.

**Feature 74 (Golfbilen – pip-pip!, 2026-10-17) touches no pool.** It replaced the two golf-cart boxes
and their wall by the clubhouse in block (4,0) (`'cart'`, 2.2 × 1.2, top C + 2.2, at world (66,
−225.6) and (66, −228.4)) with two parked cars of the new toy type `golfbil` (2.4 × 1.3) on the same
spots (DESIGN §10.40). They spawn after every other parked car, so every other car keeps its id and its
place in `game.cars`, and their geometry draws no random numbers, so the world builds as before. No
mission stage, route or pooled stage plays in the golf block (its landmarks are a map label and the fin
`fena_golf`), and the carts stand about 25 m from the nearest road's centre line, out of every route,
traffic spawn and walker. A golf cart can be driven only with `missions.state === 'idle'`: in a mission
`enterCar` refuses it, `getInCar` and `retryCar` never take one, the harness's `anyCar` skips them,
and a mission start puts both back on their spots. `story` and `fullstory` passed on the feature's
tree. Every pool below stands and no timer changed.

**Feature 76 (Båtturen med PALOMA, 2026-10-17) touches no pool.** It broke PALOMA, the excursion boat
in the marina's basin (block (5,6), world (176.6, 254)), out of the marina's shared boat mesh into a mesh
of her own with the same geometry and outline, her name board a child (DESIGN §10.41). Her collider is
the same block in the same place in the collision list ([174.98, 248.6]–[178.22, 259.4], top 0.7), the
count of blocks is unchanged, and her geometry draws no random numbers, so the world builds as before.
She leaves her mooring only during the boat trip, which runs only with `missions.state === 'idle'` (a
mission start puts her back at once). No mission stage, route or pooled stage plays in the marina block
(its landmarks are a map label, `fena_hamn` and `pryl_glasogon`). `story` and `fullstory` passed on the
feature's tree. Every pool below stands and no timer changed.

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

## `eslovLopp` · §10.12 · Eslövloppet, once round the tomato fields (free roam, feature 7) · on foot: timer = ceil(1.25 × (median + 5 × 0.5))

A deterministic course (four fixed checkpoints, radius 6, and the line at the ESLÖV sign, on the
roads round block (0,1)), so the rule is the median. Not a mission stage (no §8 table row, no
fixture): DESIGN §10.12 and `ESLOV.race.timer` quote it. Measured by scenario `eslovlopp` in free
roam at index 9 with `&ts=1`: calibrate's walker (`walker-r1r2`, `installAutopilot` imported from
the unchanged `calibrate.mjs`) runs from the start line, each frame heading for the race's current
target (a checkpoint's middle, then 1.2 m past the line) and switching as soon as the race takes a
checkpoint, as a player follows the arrow; the race's clock is raised to 600 s, so the skier stands
by the start and does not touch the run. Times are the race's own clock (`eslov.last.t`: `game.time`
from `KÖR!` to the line). Sample ids: `f7` feature 7 (`-1` its first probe, `-8` its batch, `-F1`…`-F6`
the default runs on the final tree). The stage code was uncommitted on 1b3b561 (feature 7's commit is
the first with it).

Current pool: `walker-r1r2/1b3b561`: n 36, median 28.18 → T_ref 30.68 → timer ceil(1.25 × 30.68) = **39** (90 % range 39–39).

| sample | date | code | pool | env | n | raw times (s, run order) | excluded (reason) |
|---|---|---|---|---|---|---|---|
| f7-1 | 2026-10-15 | 1b3b561 + uncommitted: feature 7 (`src/game/eslov.js`, `ESLOV`, models.js, main.js, honk.js, `tools/scenarios/eslov.mjs`) | `walker-r1r2/1b3b561` | ESLOV_RUNS=1 | 1 | 28.18 | none (falls 0) |
| f7-8 | 2026-10-15 | 1b3b561 + uncommitted: feature 7, as f7-1 (the timer literal 43 → 39 and the skier's resting turn changed during the batch; neither touches the run) | `walker-r1r2/1b3b561` | ESLOV_RUNS=8 | 8 | 28.20 28.18 28.18 28.18 28.20 28.18 28.18 28.18 | none (falls 0) |
| f7-F1 | 2026-10-15 | 1b3b561 + uncommitted: feature 7, the final tree (its commit) | `walker-r1r2/1b3b561` | default (ESLOV_RUNS=3) | 3 | 28.18 28.18 28.18 | none (falls 0; the invocation logged one console error, its text not kept, RESULT FAIL; not seen again in F2–F6) |
| f7-F2 | 2026-10-15 | 1b3b561 + uncommitted: feature 7, the final tree (its commit) | `walker-r1r2/1b3b561` | default (ESLOV_RUNS=3) | 3 | 28.18 28.18 28.18 | none (falls 0) |
| f7-F3 | 2026-10-15 | 1b3b561 + uncommitted: feature 7, the final tree (its commit) | `walker-r1r2/1b3b561` | default (ESLOV_RUNS=3) | 3 | 28.18 28.18 28.18 | none (falls 0) |
| f7-F4 | 2026-10-15 | 1b3b561 + uncommitted: feature 7, the final tree (its commit) | `walker-r1r2/1b3b561` | default (ESLOV_RUNS=3) | 3 | 28.18 28.18 28.18 | none (falls 0) |
| f7-F5 | 2026-10-15 | 1b3b561 + uncommitted: feature 7, the final tree (its commit) | `walker-r1r2/1b3b561` | default (ESLOV_RUNS=3) | 3 | 28.18 28.18 28.18 | none (falls 0) |
| f7-F6 | 2026-10-15 | 1b3b561 + uncommitted: feature 7, the final tree (its commit) | `walker-r1r2/1b3b561` | default (ESLOV_RUNS=3) | 3 | 28.18 28.18 28.18 | none (falls 0) |
| f31-1 | 2026-10-17 | bf18146 + uncommitted: feature 31's code (`src/game/dogs.js`, `DOGS`, town.js `dogLots`, nature.js `FARM_YARD`, the `placate` pose, `audio.woof`/`whistle`, main.js), its final code; the race, the walker and the course unchanged; Chispa in the yard by the course | `walker-r1r2/1b3b561` | default (ESLOV_RUNS=3) | 3 | 28.18 28.18 28.18 | none (falls 0) |
| f69-1 | 2026-10-17 | f494e34 + uncommitted: feature 69's code (`src/game/streetRace.js`, `GATLOPP`, main.js); the race, the walker and the course unchanged (feature 69's banners show only in its own races) | `walker-r1r2/1b3b561` | default (ESLOV_RUNS=3) | 3 | lost (the scenario passed; its log was filtered to the RESULT lines) | – |
| f69-2 | 2026-10-17 | f494e34 + uncommitted: feature 69, the final tree (its commit, but for the docs' last lines) | `walker-r1r2/1b3b561` | default (ESLOV_RUNS=3) | 3 | 28.18 28.20 28.18 | none (falls 0; CAL CHECK OK, 90 % range 39–39) |
| f71-2 | 2026-10-17 | 292e730 + uncommitted: feature 71's code (`src/game/rollerskis.js`, `SKIDOR`, eslov.js's `lent`/`comeBack`/`walkTo`, models.js's ski poses, main.js, nature.js's kerb cuts in paint); the race, the walker and the course unchanged (the walker's `enterRace` waits for him skiing: at index 9 E at his rest is the loan) | `walker-r1r2/1b3b561` | default (ESLOV_RUNS=3) | 3 | 28.18 28.18 28.18 | none (falls 0; CAL CHECK OK, 90 % range 39–39) |

## `eslovRundan` · §10.39 · Eslövrundan on the borrowed rollerskis (free roam, feature 71) · i dag = ceil(1.2 × median clean run); pers = ceil((median clean + median one fall) / 2)

The skier's two times in Eslövrundan, Eslövloppet's course (§10.12) ridden on his skis. Not a
mission stage (no §8 table row, no fixture): DESIGN §10.39 and `SKIDOR.trial.times` quote them. A
deterministic course and a deterministic pilot, so the rule is the median. Today's time (`times[1]`)
is a drive's timer on the clean runs, the pool below (`node tools/pool.mjs eslovRundan`). His best
(`times[0]`) is a race's (§8 "Races and chases": a clean run wins by a few seconds, one fall loses
it): ceil((T_ref + T_1) / 2), from this pool's median and the one-fall runs' in the next section
(not read by `pool.mjs`). Measured by scenario `eslovrundankal` in free roam at index 9 with
`&ts=1`, the trial's cap raised to 600 s: the ski pilot (`skipilot`, `installSkiPilot` in
tools/scenarios/skidor.mjs) holds only a heading for the stick and rides a racing line round the
crossings' inner corners (arcs of 8 and 9.5 m at √(7.2 × r), braking at 2.8 m/s² by ploughing on the
straights). Times are the trial's own clock (`skis.last.t`: `game.time` from `KÖR!` to the line). A run
knocked over by anything but its forced falls (`knocks`) is excluded. Sample ids: `f71` feature 71
(`-1` the first `eslovrundankal` batch, `-G` the pilot runs inside `eslovrundan`). The code was
uncommitted on 292e730 (feature 71's commit is the first with it).

Current pool: `skipilot/292e730`: n 4, median 28.62 → today's time ceil(1.2 × 28.62) = **35**; with T_1 32.97 his best ceil((28.62 + 32.97) / 2) = **31**.

| sample | date | code | pool | env | n | raw times (s, run order) | excluded (reason) |
|---|---|---|---|---|---|---|---|
| f71-t | 2026-10-17 | 292e730 + uncommitted: feature 71's draft skis (accel 2.4, plough 2.2, 6.5 m/s² sideways) and its first pilot (the roads' middles, 6.6 m/s corners) | `skipilot-draft/292e730` | `eslovrundan` and a trace | 3 | lost (34.20 clean; 34.08 and 34.12 with a fall off the kerb at the lane's mouth, from the scenario's log lines) | superseded: the skis' numbers and the pilot changed; not pooled |
| f71-p | 2026-10-17 | 292e730 + uncommitted: feature 71, the final skis and pilot (a trace run, `skidpilot`, removed) | `skipilot/292e730` | trace | 1 | lost (the trace crossed the line at about 28.6 s; its result line was filtered out) | – |
| f71-1 | 2026-10-17 | 292e730 + uncommitted: feature 71, the final skis and pilot (times still 30 / 36 placeholders in the content; the run does not read them) | `skipilot/292e730` | ESLOVRUNDAN_RUNS=3 | 3 | 28.62 28.63 28.62 | none (falls 0, knocks 0) |
| f71-G1 | 2026-10-17 | 292e730 + uncommitted: feature 71, the shipped times 31 / 35 | `skipilot/292e730` | `eslovrundan` (its clean run) | 1 | 28.62 | none (falls 0) |

## Eslövrundan's falls · §10.39 · the ski pilot with forced falls (free roam, feature 71) · not a pool

The runs behind `T_1` and `T_2` (§10.39): the pilot of `eslovRundan` above falls once (`skis.fall('kerb')`)
halfway along the straight before the west road's crossing (the z −200 road at 13.2 m/s), or twice
(and halfway along the z −120 road). The down time is random (1.6–2.4 s, `Character`), so the runs
spread. T_1 is the median of the one-fall runs, which sets his best (above); T_2 must lie above
today's time (two falls are third). Not read by `tools/pool.mjs` (no stage key).

| sample | date | code | env | one fall (s, run order) | two falls (s, run order) | excluded (reason) |
|---|---|---|---|---|---|---|
| f71-1 | 2026-10-17 | as `eslovRundan` f71-1 | ESLOVRUNDAN_RUNS=3 | 33.52 32.82 32.97 | 37.95 37.78 38.35 | none (knocks = falls in every run) |
| f71-G1 | 2026-10-17 | as `eslovRundan` f71-G1 | `eslovrundan` | 33.27 | 37.97 | none |

## Gatlopp · §10.38 · José's street races (free roam, feature 69) · race margins, not a timer

Not a timer and not a pool (`tools/pool.mjs` has no rule for it; this section's header has no stage
key, so it is not read): the rule is §8 "Races and chases", a clean race won by a few seconds and one
crash lost. Measured by scenario `gatloppkal` (and the autopilot wins inside `gatlopp`) in free roam at
index 10 with `&ts=1`: calibrate's autopilot (`installAutopilot` from the unchanged `calibrate.mjs`)
drives the hire car (a sedan, ×1.2) from the grid (`gatlopp.startRace(k)`, the countdown), out of the
left lane (`startOff` −5.5), on the course's road route (`ROUTES` in tools/scenarios/gatlopp.mjs) at
full speed (`vEnd` 40); a crash run stops dead in the left lane at 45 % of the route and needs 1 s
(calibrate's race crash). The margin: won, José's lane path left at the race's end over his average
speed since KÖR!; lost, Stig's distance to the finish at 30 m/s. `imp` = the autopilot's impacts (a
speed change over 3 m/s in a frame); `contact` = car-car impacts over 3 between the two racers (the
`onCarImpact` log). José's spec is `cruise:maxSpeed:accel:steer`. Sample ids: `f69` feature 69 (`-t`
the first trials, `-s` the tuning sweeps, `-F` the default runs on the final tree, `-G` the autopilot
wins inside `gatlopp`). Every run of the feature's work is here, the tuning sweeps' too; the code was
uncommitted on f494e34 throughout (feature 69's commit is the first with it).

| sample | date | code | course | José | env | runs: clean (margin s, race s) · one crash (margin s) | notes |
|---|---|---|---|---|---|---|---|
| f69-t1 | 2026-10-17 | f494e34 + uncommitted: feature 69's first draft (the grid eastbound at x 70, lineX 73; course 1 then round SunTrip and Centro Nórdico, 491 m, its first corner 50 m off) | 1 (old) | 31:35:13:0.75 | GATLOPP_RACE=1 GATLOPP_RUNS=1 | clean +0.7 (22.32; imp 1, contact at all four corners) · crash −2.5 | superseded course and grid |
| f69-t2 | 2026-10-17 | f494e34 + uncommitted: the westbound grid (t 28, lineX 89), course 1 round Hotel Flamenco and the gas station | 1 | 31:35:13:0.75 | GATLOPP_RACE=1 GATLOPP_RUNS=2 | clean +1.3 (21.98; imp 1), +1.4 (21.82; imp 1), both a contact at the first corner · crash −1.7, −1.6 | the hatch's own accel: side by side into the corner |
| f69-s1 | 2026-10-17 | as f69-t2 | 1 | 31:35:10 · 31:35:11 · 33:36:10 | GATLOPP_RACE=1 GATLOPP_RUNS=1, sweep | 31:35:10 clean +2.6 (21.10) · crash −1.1; 31:35:11 +1.7 (21.95; a contact 4.0 at the first corner, imp 0) · −1.5; 33:36:10 +1.9 (21.10) · −1.4 | tuning |
| f69-s2 | 2026-10-17 | as f69-t2, courses 2 and 3 on the westbound grid | 2, 3 | 31:35:10 · 33:36:10 · 33:37:10 | GATLOPP_RACE=2,3 GATLOPP_RUNS=1, sweep | course 2: +1.9 (22.60; imp 1, contacts at both rights) · −2.9; +1.8 (22.68; imp 2) · −3.2; +1.2 (22.87; imp 2) · −3.6. Course 3: +2.6 (26.28; imp 1) · −2.1; +2.0 (26.32; imp 1) · −2.9; +1.7 (26.35; imp 1) · −2.9 | José ran into Stig braking for the first right |
| f69-s3 | 2026-10-17 | as f69-s2 | 2 | 33:37:8 · 34:37:8 · 34:38:7 | GATLOPP_RACE=2 GATLOPP_RUNS=1, sweep | +2.1 (22.58; a contact 4.5 at the second right, imp 0) · −3.6; +2.1 (22.58; the same) · −3.7; +2.9 (22.60) · −3.0 | tuning; 33:37:8 shipped |
| f69-s4 | 2026-10-17 | as f69-s2 | 3 | 33:37:8 · 33:36:8 | GATLOPP_RACE=3 GATLOPP_RUNS=1, sweep | +2.7 (26.28) · −1.5; +2.9 (26.35) · −1.3 | tuning |
| f69-s5 | 2026-10-17 | as f69-s2 | 3 | 34:38:8 · 35:38:8 · 34:38:9 | GATLOPP_RACE=3 GATLOPP_RUNS=1, sweep | +2.3 (26.27) · −1.9; +2.1 (26.28) · −2.0; +1.7 (26.40; imp 1, contacts at the first right) · −2.9 | tuning; 35:38:8 shipped |
| f69-s6 | 2026-10-17 | as f69-s2 | 1 | 34:37:10 · 35:37:10 · 35:38:9 | GATLOPP_RACE=1 GATLOPP_RUNS=1, sweep | +1.6 (21.30) · −1.6; +1.5 (21.13) · −1.5; +1.8 (21.10) · −1.5 | tuning; 34:37:10 shipped |
| f69-G1 | 2026-10-17 | f494e34 + uncommitted: the shipped specs, the module while its scenario was written (six `gatlopp` invocations that reached the races) | 1, 2, 3 | shipped | `gatlopp` (clean only) | course 1 +1.7 (21.13) ×6; course 2 +2.1 (22.58) ×4; course 3 +1.7 (26.67), +1.7 (26.60), +1.7 (26.60), +2.1 (26.27) | a seventh invocation's three wins (it passed) were filtered out of its log: lost |
| f69-F1 | 2026-10-17 | f494e34 + uncommitted: feature 69's final code (the docs still being written) | 1, 2, 3 | shipped: 34:37:10 · 33:37:8 · 35:38:8 (steer 0.75) | default (GATLOPP_RUNS=2) | course 1: clean +1.6 (21.30), +1.7 (21.13) · crash −1.5, −1.5. Course 2: +2.1 (22.58), +2.1 (22.58; each a contact 4.5 at the second right, imp 0) · −3.6, −3.6. Course 3: +2.1 (26.27), +2.1 (26.28) · −2.2, −2.0 | none (imp 0 in all 12) |
| f69-G2 | 2026-10-17 | f494e34 + uncommitted: feature 69, the final tree | 1, 2, 3 | shipped | `gatlopp` (clean only) | course 1 +1.7 (21.13); course 2 +2.1 (22.58; a contact 4.5 at the second right, imp 0); course 3 +2.1 (26.27) | none |
