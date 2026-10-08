# Phase 2, step 3: balance pass (DESIGN §15.3 step 5, §8 "Timers and difficulty")

Branch main, tag `phase2-balance`. Two commits:
- **774cd84** (attempt 1): the method, the tool rework and the tuning. That agent was stopped
  by an account usage limit before its exit run.
- **9be5dc5** (attempt 2, the finishing commit): checked everything on the committed code, found and
  fixed two game bugs and five tool bugs, re-measured, and ran the exit criteria.

## Summary of the balance (both attempts)

- **Measurement:** every timed stage was measured on the merged world, with a reworked
  `calibrate` (island) and a new `calibflight` (flight).
- **Where the numbers live:** the mission files (`TIMERS`, `HAGGLE`, `TUNING`), the §8 literals,
  the fullstory fixture, and the table in DESIGN §8 "Timers and difficulty".
- **Rules** (DESIGN §8):
  - **Statistic:** the median of the clean runs for deterministic stages. Random stages (fleeing
    targets, random spawns and stacks, the jeep's flee route) use the 75th percentile,
    interpolated.
  - **On foot:** the measured run plus 0.5 s per target, for a human's reaction and aim. The
    timer is ×1.2 driving and ×1.25 on foot.
  - **Rounding:** up to a whole second.
    - **This deviates from the task text** ("rounded up to 5 s"). It was kept on purpose: with
      5 s steps the binding user rule cannot be met on short stages. That rule says a clean run
      keeps about 15–20 % of the time. Examples: the gate dash 5.1 → 10 (50 % left), vischan
      30.6 → 35 (27 %).
  - **Distance-dependent timer:** `goto.timer` may be `(g, m) => seconds`. Bodega stage 10 uses
    `homeTimer(wreck)`, so its timer follows the distance from wherever the jeep died.
- **Night-bus race:**
  - The bus starts in its own lane and the player beside it, noses level. Before, the bus's lane
    path merged a 10.5 m bus into the player's car at "KÖR!".
  - The grid starts 14 m past the junction.
  - The rubber band only acts at the extremes.
  - `nattbuss` is cruise 31, maxSpeed 35, accel 12.
- **SKANDAL:**
  - New settings: `vehicleMaxSpeed` 33, `spawnDist` [40, 80], `catchUp` [70, 1.3], `bands`
    [[70, 3], [35, 1]].
  - Chasers brake less for bends.
  - Land Rovers now spawn on the streets (attempt 2, below).
- **Haggle:** zones 0.30/0.23/0.17, speeds 0.7/0.95/1.2.
- **Flight:**
  - The gate dash has `fearRate` 5 and a 6 s timer.
  - Bottles roll out from under the serving trolley, so none is stuck out of reach.

## Attempt 2: what was wrong and what changed

### Game bugs (fixed at the root)

1. **SKANDAL usually had one pursuer, sometimes none.**
   - Land Rovers spawned only at junctions. On the 80 m grid, the 40–80 m ring outside the
     forward cone often held one junction, sometimes none.
   - A new spawn log in `calibrate` showed `spawn: [67]`, a single Land Rover, from the test
     start: 8 escapes in 8 runs. In two exit runs nobody spawned at all, and the pursuit decayed
     to an "escape" after 6.7 s.
   - Fix (shame.js `startPursuit`): Land Rovers spawn on any street, 12 m past a junction or
     mid-block, in the right-hand lane, heading towards the player, at least 30 m apart. They
     never spawn in the cone ahead of a moving player.
   - `calibrate` now logs the spawn distances and fails a pursuit that spawned nobody.
2. **Rabbits could spawn behind walls.**
   - A Fataga sheep spawned on the far side of the 2.55 m tomato-field wall: 14 m from the
     player, about 50 m round.
   - Fix: `rabbits` (balls, sheep, flowers) now spawns only on spots reachable on foot from
     `near`, via a new `game.footReach(cx, cz, R)`:
     - a 0.5 m flood fill, with a 0.4 m body (the player is 0.36) and the 0.45 m step;
     - it takes 6–9 ms once per stage.
   - `game.freeSpot` takes an optional `ok(x, z)` filter.
   - About 92–96 % of free spots stay eligible. DESIGN §9.2 and §14.3 are updated.

### Tool bugs (measurements were wrong because of them)

3. **Committed timers did not match the committed code.** The deterministic drives repeat to
   within ±0.5 s, so attempt 1 had measured some stages before later changes in the same pass.
   - buss17: 42.7 → 44.8 s (timer 52 → 54).
   - Tonga: 18.0 → 19.0 s (timer 22 → 23).
4. **"p75" was a worst case.** `pct()` used the nearest rank `floor(q·n)`, which is the slowest
   run for n = 4 (the default `FOOT_RUNS`). Both calibrate.mjs and calibflight.mjs now
   interpolate linearly.
5. **The race's injected crash could block the bus** (see Races). This made the exit check
   flaky; it now spins out into the left lane.
6. **The on-foot walker** stalled, which inflated times, or reported reachable targets as stuck.
   - It dropped a jump cell from 0.5 m away and walked into the wall. It now keeps a jump cell
     until it stands on it.
   - **Line of sight:** it used `collision.segmentBlocked`, which samples a bare line every
     0.8 m and stepped through Hotel Flamenco's 0.22 m patio dividers. Three lines 0.3 m apart
     also missed a 0.12 m pole at the pool bar. It now sweeps a 0.38 m body every 0.1 m.
   - **Search area:** its A* stayed within 14 m of the start/target box, so it could not route
     round the 52 m hotel. It now widens to 45 m when the target is not reached.
   - **After a stall:** it avoids cells it stalled at, and plans without jumps.
   - All on-foot stages were then re-measured fresh, 12 runs each.
7. **Plates are random** (stacks spawn at random in the dance-floor area), so they now use the
   75th percentile as well. Their median and p75 are both 30.3 s.

## Timer table

Slack is (timer − clean time) / timer. For random stages it is measured at p75.

| stage | route | T_ref (n runs) | timer (Phase 1) | slack |
|---|---|---|---|---|
| 8.1 gate [3] toilet dash | gateOle → round the ladies' room → herrtoa; sprint 3.6 s (walk 5.0) | 4.1 (3.6 + 0.5) | **6** (10) | 40 % sprint, 16 % walk |
| 8.2 ombord [0] find 14B | cabinDoor → 14B past 3 stowers (E each); sprint 2.9 s (walk 4.2) | 4.9 (2.9 + 4 × 0.5) | **7** (15) | 58 % / 40 % |
| 8.4 sprit [0] bottles | sprint after the nearest, trolley dodges, Space in turbulence | 19.6 (p75 17.1 of 12 + 2.5; bimodal 4–7 s or ≈ 17 s) | **25** (35) | 32 % |
| 8.5 landning [0] round-up | row 16 → José → Berra → Herr Storch (walk) | 9.1 (7.6 + 1.5; both orders) | **12** (20) | 37 % |
| 8.5 landning [1] back to 14B | from the far end (Berra) | 3.7 (3.2 + 0.5) | **5** (10) | 36 % |
| 8.6 buss17 s2 | busBay → flamencoDrive, ÅKSJUKA, stop | 45.0 (median of 10 clean in 4 sets, 44.4–47.0) | **54** (60) | 17 % |
| 8.7 friskotek s1 | six fleeing beach balls | 24.9 (p75 21.9 of 12 + 3; median 18.6) | **32** (20) | 32 % |
| 8.8 asnan s9 | Centro Nórdico lot → vikingbar, SKICK | 15.5 (9 clean) | **19** (20) | 18 % |
| 8.9 bodega s4 | playa → vischan | 25.4 (median of 8 clean in 3 sets, 25.4–29.5) | **31** (35) | 18 % |
| 8.9 bodega s9 jeep | farm gate, road-route chase | 33.2 (p75 of 20 chases; median 27.3; 8 autopilot wedges excluded) | **40** (45) | 17 % |
| 8.9 bodega s10 home | wreck → flamencoBack | 6.3 + d/28.6 (11 clean, 6 spots) | **homeTimer** 16–33 | 13–19 % incl. a 3 s turn |
| 8.11 fataga s5 | six fleeing sheep | 33.3 (p75 30.3 of 12 + 3; median 25.1) | **42** (25) | 28 % |
| 8.12 grisfest s1 | five flowers round Hotel Flamenco | 33.6 (p75 31.1 of 12 + 2.5; median 27.5) | **42** (30) | 26 % |
| 8.12 grisfest s4 | ten plate stacks (kick, random) | 35.3 (p75 30.3 of 10 + 5) | **45** (35) | 33 % |
| 8.12 grisfest s6 | dance floor → car → tongatonga | 19.0 (walk 6.4 + 0.5 + drive 12.1; 4 clean) | **23** (30) | 17 % |
| 8.13 julafton s1 | patio → hire car → four guests | 72.5 (median of 3 clean in 3 sets: 72.1/72.5/73.3) | **87** (80) | 17 % |

- **Drives** leave 17–18 % on a clean run.
- **On foot** the slack is above 20 % by design. The 0.5 s per target is a human's reaction, not
  slack, and × 1.25 is the on-foot rule.
- **The flight's short stages** lose precision, because 1 s is the smallest step.
- **Random stages** are timed at their 75th percentile, so about a quarter of clean attempts
  with unlucky spawns need a second go.
- **The home timer** was checked three times. The fresh fits are 5.6 + d/35.2, 4.2 + d/30.8 and
  3.5 + d/29.9, all faster than the shipped fit. With the 3 s turn at the wreck, the shipped
  `homeTimer` leaves 13–19 %, so it was kept.

## Races, chases, pursuit, haggle

- **Night-bus race** (`calibrate` `race`). A clean race is won by a few seconds; one crash (a
  dead stop at 165 m, 1 s to recover) loses it.

  | runs | clean | one crash |
  |---|---|---|
  | Attempt 1 | won by 2.0 s (3 of 3) | lost by 2–6 s (3 of 3) |
  | Attempt 2 | won 13 of 14: by 0.9–2.0 s, once 5.7 s (traffic held up the bus). The loss sat 18 s behind the bus without overtaking (autopilot). | old injection: lost 9 of 10; new: lost 4 of 4 (2.2–5.3 s) |

  - **The one crash that won:** the old injection put the car "3.5 m to the right", which for a
    car that had moved into the right lane is the bus's lane. The bus shunted it and lost time
    itself, and the final exit run's check failed.
  - **The fix:** the race crash now spins out into the left lane (`crashSide: 'left'`).

  Settings tried along the way, as cruise:maxSpeed:
  - 26:31: clean runs stuck behind the bus.
  - 28:33, with the old mid-range rubber band: a crashed run also won.
  - 32:35: clean won by only 1.7 s.
- **Guardia jeep:** cruise 20, damageScale 4, the truck takes half damage.
  - 28 chases: 20 usable (15–71 s, median 27 s), 8 autopilot wedges.
  - The timer is at p75, so following the jeep round every block instead of cutting it off
    runs out of time.
- **Follows:** the tails stayed inside the bands.

  | quarry | measured distance | band |
  |---|---|---|
  | Grisbil | 20.2–26.4 m | max 55 |
  | José | 22.3–39 m | 14–55 |
  | Excursion bus | 21.7–25.1 m | max 55 |

- **SKANDAL escape** (a ×1.2 sedan fleeing at full speed to far intersections), with two Land
  Rovers on the street (spawn distances e.g. [67, 78], [40, 80], [57, 78]):

  | driving | escaped | busted |
  |---|---|---|
  | Clean | 4 of 5, after 37–42 s (≈ 1 000 m flat out) | 1, at 22 s |
  | One crash (1 s at the kerb) | 4 of 5, after 38–50 s (once with a Land Rover 18 m behind) | 1, at 16 s |

  - **Escaping is possible but hard.** It takes about 40 s of flawless full-speed driving, on a
    route chosen away from both cars.
  - **Before:** Phase 1 escapes took exactly 11.1 s. With junction-only spawns, 8 escapes in 8
    runs, and twice a free escape after 6.7 s.
- **Haggle**, modelled as a player who aims at the zone middle with a Gaussian timing error σ:

  | σ | new values: wins | Phase 1 values: wins |
  |---|---|---|
  | 25 ms | 97 % | 90 % |
  | 40 ms | 80 % | 66 % |
  | 60 ms | 53–54 % | 39 % |

## FLYGRÄDSLA (`calibflight`, careful vs careless; attempt 1, unchanged code)

| mission | careful player | careless player |
|---|---|---|
| 1, gate | A sprinter arrives at 94 and a walker at 98; neither panics. | A dawdler (2 s idle, then walking) panics at 5.5 s. |
| 2, ombord | J at 70: peaks at 75. | Never presses J: panics at t 21.5 of the takeoff; the mission fails. |
| 5, landning | J from the start of the approach: peaks at 18–20. | J only after the shaking: panics at t 24. |
| 4, sprit | Never panics (12-run re-check in attempt 2: 0 panics). | Not measured. |

## Autopilot and tools

### Attempt 1

- **Phase 1 autopilot bugs fixed:**
  - The lane checks used the wrong reference: `lat - off` instead of `lat`.
  - It only overtook cars slower than its current speed.
  - `ignore: 'nattbuss'` let it ram the race bus.
- **On foot:**
  - Grid A* with the 0.45 m step and jumps.
  - Stuck detection.
- **Driving:**
  - Lead-ins out of car parks.
  - A* for the car's footprint off the road.
  - J-turn reversing.
  - Long-vehicle turning radius.
- **Crash injection** for races and pursuits.
- **New calibrate cases:** `home`, `pursuit`, `haggle`.
- **New scenario `calibflight`.**

### Attempt 2

- **Statistics:** interpolated percentiles.
- **Race crash injection:** spins out into the left lane.
- **Walker:**
  - Keeps jump cells until it stands on them.
  - Body-sweep line of sight.
  - Wider A* on failure.
  - Avoids cells it stalled at.
  - No jumps after a stall.
- **Pursuit:** spawn logging, with a check that someone spawned.
- **Plates:** use p75.

## Known limits

- **Jeep chases:** the autopilot still wedges on a house in about 1 chase in 4. Those runs are
  reported as `wedged` and excluded.
- **Small default run counts:** a default `calibrate` run uses `FOOT_RUNS` 4 and `JEEP_RUNS` 6,
  so it is noisy on random stages. Those stages only warn; the table's numbers come from 12 runs
  on foot and 20 chases. Example: an exit run's flowers p75 of 4 runs was 34.9 s, against a
  33.6 s p75 of 12.
- **Race overtaking:** the race autopilot sometimes stays behind the bus. One clean run in 14
  lost that way; the check needs a majority of clean wins.
- **The one-crash pursuit** is not much harder than a clean one. The injected crash is at 250 m,
  before the Land Rovers close in.
- **buss17:** the bus autopilot corners gently (maxLat 3.5 of the 6 m/s² ÅKSJUKA limit). A
  bolder human could gain a little slack.
- **Thin walls in the game itself:** `collision.segmentBlocked` (game code) still samples every
  0.8 m. The camera and the on-foot Guardia officer use it, so thin walls can fool the officer's
  line of sight. His stuck rule covers that. It was not changed, because core.mjs asserts its
  exact output.
- **Exit-run noise:** an exit run logged `Failed to load resource: net::ERR_CERT_VERIFIER_CHANGED`,
  an external resource in the headless browser and not the game. It did not recur.

## Exit run

All on the final code; the only edit after the exit runs was re-wrapping one comment in main.js, followed by `node --check`. Logs are in the scratchpad: `story-final.log` and `calfull-final2.log`.

- **`node --check`** on every tracked .js/.mjs: clean.
- **`PORT=8870 OUT=…/out-p2 node tools/shot.mjs story`:** ends with `[t] done -> #13 idle`, `no
  errors`, `RESULT: PASS`.
- **`PORT=8870 OUT=…/out-p2 node tools/shot.mjs calibrate fullstory`:** `RESULT: PASS`.
  - fullstory ends with `#13 idle`, `no errors`.
  - Every deterministic shipped timer is ≥ its T_ref. Random stages warn only.
  - The single default-size samples, against the shipped timers:

    | stage | T_ref this run | shipped timer |
    |---|---|---|
    | buss17 | 44.9 | 54 |
    | asnan | 16.2 | 19 |
    | vischan | 25.4 | 31 |
    | jeep | 26.4 | 40 |
    | flowers | 31.7 | 42 |
    | plates | 39.0 | 45 |
    | Tonga | 19.0 | 23 |
    | guests | 72.1 | 87 |
    | balls | 24.4 | 32 |
    | sheep | 31.2 | 42 |

  - **Race:** clean runs won by 1.9 s, plus one non-clean clean-mode run with 2 impacts that
    lost; one crash lost by 2.3 and 2.2 s.
  - **Pursuit:** clean escaped 3 of 3 (38–39 s); with one crash 1 of 3 escaped and 2 were busted.
  - **Follows:** inside their bands.
  - **Haggle:** 97 / 80 / 54 %.
- **Earlier runs in this attempt** that failed, and what came of them:
  - The pursuit spawn bug.
  - The fataga, terrace and pool-bar stalls.
  - The race-crash flake.

  Each was fixed as described above, then re-measured.
- **The previous agent's runs** (`calibflight` FLYGRÄDSLA cases, race sweep, haggle model) were
  not redone except where noted. The `calibflight` bottle stage was re-run: 12 runs, PASS.
