# Phase 3 · round 1 · repair 1

Input: the gate (`p3-r1-gate1.md`: castsheet FAIL; balls, jeep and sprit timers off their
literals) and the diff review (`p3-r1-review1.md`: one blocking regression, the empty collect
bubble). Port 8870; logs, shots and ad-hoc scripts in `<scratchpad>/out-p3-r1-repair1/` (not in
the repo): `poolr.mjs` (pools calibration runs from logs and prints the bootstrap range),
`calrun*.sh` (the serial batches). Tree at start: clean, HEAD `03db6b6`.

## Items

| id | verdict | how |
|---|---|---|
| review-1 (empty collect bubble) | **fixed** | `game.unsay(target)` / `hud.unsay(target)` take a speaker's bubble down at once; `kinds/flight.js` `bubbles()` calls `g.unsay(n)` when a dialogue or cutaway starts (it said `''` for −1 s, which dba05b9's minimum reading time turned into a 1 s empty pill, 0.5 s in test mode). `game.say` with an empty text or `secs <= 0` is an unsay too. `unsay` also clears the speaker's `sayEnd` and pulls `game.sayEnd` back to the bubbles still up, so the cut line no longer holds the mantra auto-bubble back. New `kinds` assertion, sampled page-side 3 frames into the scene: no bubble over Berra or Stig, no empty `.bubble`, `saying` false. **Proven both ways:** on the old code it fails (`{"scene":true,"live":[""],"empty":1,"saying":true}`), on the fix it passes (`kinds-old2.log`, `kinds.log`). DESIGN §9.2, §14 Game API, hud contract. |
| F1 castsheet 33 keys | **fixed** | `cast.mjs` expects 34 (`telefonist`, 7caa8f9); DESIGN §17 row 19 says 34; the review's indentation nit at `cast.mjs:192` fixed in passing. `castsheet`: RESULT: PASS. |
| F4 sprit 18 vs 22 | **fixed at the root: an autopilot artefact** (timer 22 → **11**) | `DEBUG_SPRIT=1` (new trace) showed the bimodal stage was the sweeper, not the bottles: on a moving trolley within 4.5 m it backed 3 m into the nearest free row (row 8) and stood there until the trolley had passed 1.6 m beyond it, i.e. behind the serve stops at rows 3, 6 and 9, up to 18 s, while the last bottle rolled right past it (27.7 s run: the bottle passed row 8 at t 9.8; the 9–12 s runs were the same wait cut short by a bottle rolling past on its side). collect's roll rule pushes every bottle at or beyond the trolley out towards the player, so a sensible player waits in the aisle out of the trolley's reach. The sweeper now does that (2.4 m from a moving trolley, 1.7 m from a stopped one; it takes any bottle on its side first) and steps into a free row only in turbulence (Space held: it cannot back off). New check: every run clean (never bowled, never falls). 48 runs on the final sweeper: 3.8–6.4 s, median 4.9, p75 6.0 → T_ref 8.5 → **11** (90 % range 11–11); the 12-run check on the final code: `CALF CHECK sprit[0]: timer 11 s; shipped 11 s OK`. Old sweeper, 32 runs pooled: 90 % range of the timer 18–39, which is why no sample agreed with another. flight.js, fixture, §8 table, §8.4, FLYGRÄDSLA note (sprit peaks ≈ 5). |
| F3 jeep 42 vs 37 | **fixed** (timer 37 → **40**) | Sampling variance (single runs of 20: p75 28.7, 31.6, 34.2, 34.1, 30.4 on the same code). Pooled 98 usable chases (island-flow 40, the gate 20, mine 38; 2 of my 40 lost the truck after 2–3 unsticks, excluded as before): median 27.8, p75 32.5 → ceil(1.2 × 32.5) = **40**, 90 % range 37–42. island.js `TIMERS.bodegaJeep`, fixture, §8 table, "Races and chases", §8.9. |
| F2 balls 31 vs 32 | **fixed at the root: a game bug + a walker artefact** (timer 32 → **33**) | See "The balls" below. |

### Harness change behind all three timers

`tools/lib.mjs` now has `pct` and `timerRange(ts, toTimer)`: a fixed-seed bootstrap (2000
resamples) of the timer that a sample supports, 90 % range. `calibrate`'s `CAL CHECK` (jeep, balls,
sheep, flowers, plates) and `calibflight`'s new `CALF CHECK sprit[0]` print whether the shipped
timer is inside the sample's range ("inside (consistent)" / "OUTSIDE (disagrees)"). Nothing that
passed or failed before changes; it tells a gate whether a mismatch is sampling noise. DESIGN §8
states the rule: a random stage's timer is the formula on a pooled sample (its `n` in the table),
and a stage whose runs split into clusters is first checked for an autopilot artefact.

### The balls

The gate's balls sample (12 runs, p75 21.6 → 31) was the low end of this round's samples: the old
walker's batches gave 31, 34, 34, 37 (world-town, the gate), 40, 36, 37 (mine), 72 runs pooled
→ 36 (90 % range 34–38). My third batch hit the `calibrate` failure world-town had seen: "the
chase did not get stuck" at (15.9, −59), the same spot as world-town's (15.9, −58.6), with Stig
lying flat beside a parked car in the SunTrip car park (`balls3/balls_stuck_9.png`).

- **Game bug** (main.js `carsVsPeople`, from the Bigmouth base): a car knocked a person over when
  the *relative* speed exceeded 4.5 m/s, so walking (island 5.4 m/s) or sprinting (8.8) into a
  parked car flung Stig as if run over (and sprinting, 5.2, into the stopped trolley, a kinematic
  car with v = 0). A probe (deleted) sprinted and walked into a parked hatch: `down` both times on
  the old rule, standing against the car both times on the new one. Now only the car's own speed
  into the person counts; slower contact pushes him out. §14 "main.js carsVsPeople".
- **Walker artefact** (`calibrate`): it planned round static solids only, so it ran into parked
  cars between it and a ball and was knocked flat (and, once that is fixed, would press against
  the car). It now plans round stopped cars (under 1.5 m/s, within 30 m) in the A* and the
  straight-line test, as a player walks round a parked car; car-footprint routes are unchanged.
  Walk results log `falls` (knock-overs).
- **Effect**: 72 runs on the final code (walker round stopped cars, the new car rule): median 19.5,
  p75 23.1 + 3 → T_ref 26.1 → ceil(1.25 × 26.1) = **33** (90 % range 31–35). 12 more runs with the
  new walker and the old car rule (0 knock-overs) give 33 too. The old walker's 84 runs this round
  (median 22.1, p75 25.9 → 37) were 2.9 s slower at the median (Mann-Whitney z 3.3): the time went on
  running into and round parked cars in the SunTrip car park beside the friskotek lawn. That was
  world-town's "drift", not the world change. island.js `TIMERS.friskotekBalls`, fixture, §8 table,
  §8.7, changelog.

## Checks (final code unless noted)

The session running this repair died before its final checks; the orchestrator ran them on the
uncommitted tree (HEAD `03db6b6` + this diff), ports 8870–8872:

- `node --check` on every `src/**/*.js` and `tools/**/*.{mjs,js}`: clean.
- `castsheet kinds missions api`: RESULT: PASS. `kinds` logs
  `collect cut at the scene start {"scene":true,"live":[],"empty":0,"saying":false}`.
- `story`: `[t] done -> #13 idle stage 5 coins 7725`, `no errors`, RESULT: PASS.
- `fullstory`: `[t] done -> #13 idle stage 5 coins 7825`, `no errors`, RESULT: PASS.
- `calibrate` / `calibflight` for balls, jeep and sprit: the samples quoted above (logs in the dead
  session's scratchpad, lost on reboot). The round 1 re-gate runs both in full.

## Follow-ups (next round)

- flight-missions (§8.4 "Open"): the sprit timer is now 11 s and its turbulence cue fires at 20 s,
  so the sweep has no turbulence. Move the cue inside the stage and re-measure
  (`FLIGHT=sprit SPRIT_RUNS=36 calibflight`), or drop the turbulence from the mission's "Fun" and
  README.
- calibrate (balls, sheep, flowers): the walker now plans round stopped cars; sheep and flowers were
  not re-measured with it (no parked cars near Fataga or the Flamenco flower spots were seen in the
  failing runs). The re-gate's `calibrate` checks them against their bootstrap ranges.
