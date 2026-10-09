# Phase 3 · round 1 · repair 2

Input: gate 2 (`p3-r1-gate2.md`): B1 (the sheep walker gave up, `calibrate` FAIL one run in two),
B2 (the balls timer 33 rests on 72 runs whose logs were lost), notes N1 (jeep 40 vs "ceil(1.2 ×
32.5)"), N3 (flowers 41 vs 42), N4 (plates checked like a random stage on 2 runs), N5 (default
sample sizes), and the playtest critic's playtest-10 (plates). Worktree `wt-repair2`, branch
`p3-r1-repair2` from `d9451f8`; port 8879; logs, probes and shots in
`<scratchpad>/out-p3-r1-repair2/` (`batches.txt` lists every harness batch with its exit code;
each batch's `.meta` has the start/end time, HEAD, the dirty files and the sha1 of
`calibrate.mjs` it ran on). Every raw time is in the repo now: `notes/calibration-samples.md`.

## Verdicts

| item | verdict | numbers (final pools: `node tools/pool.mjs`) |
|---|---|---|
| 1 raw-sample ledger | **done**: `notes/calibration-samples.md` + `tools/pool.mjs`; DESIGN §8 rule | gate 2's raw times seeded; lost samples listed, never pooled |
| 2 B1 sheep stall | **fixed at the walker** (three defects: pacing, straight-line progress, A* failing round large obstacles); the old walker's samples do not pool with the new | 0 stuck, 0 falls, 0 wedges in every final-walker run (44 balls, 32 sheep, 32 flowers, 20 plates, 12 Tonga walks) |
| 3 B2 balls | **33 → 24** | n 44, median 13.73, p75 15.59, T_ref 18.59, range 22–25 |
| 4 sheep | **42 → 27** | n 32, median 15.90, p75 18.53, T_ref 21.53, range 25–31 |
| 4 flowers | **42 → 26** | n 32, median 16.18, p75 17.79, T_ref 20.29, range 25–28 |
| 5 N1 jeep | **40 → 42** | n 83 usable (4 lost trucks, 1 wedge excluded), median 28.38, p75 34.45, ceil(1.2 × 34.45 = 41.34), range 37–48 |
| 6 N4 + playtest-10 plates | **deterministic stage; 45 → 33** | n 20, 20.77–21.03 s, median 20.77, T_ref 25.77, range 33–33 |
| 7 N5 defaults | **docs**: the default run is a regression check; pools hold the big samples | default run ≈ 33 min; raising it to pool sizes would pass an hour |
| (walker side effect) Tonga, julafton guests | **23 → 19, 87 → 81** (re-measured, 8 runs each, + the check runs) | Tonga n 12, walk + drive median 15.28, + 0.5 → T_ref 15.78; guests n 11, median 67.40 |

## B1: why the walker "got stuck", and what changed

The gate's stall (sheep run 2 of R1) did not recur in 12 old-walker sheep chases traced every
0.1 s (`probe-sheep-trace.mjs`, 17.1–41.8 s, none stuck) nor in 12 cold-start re-enactments at the
tomato-field wall (`probe-wall.mjs`: Stig on the road side with a live sheep across the wall, and
at the gate's stuck spot; old walker 5.7–10.6 s, none stuck). It needs the chase's history. What
the traces did show are three walker defects, each able to produce that give-up, and all three are
fixed in `tools/scenarios/calibrate.mjs` (the game is unchanged):

1. **Pacing (the big one).** The route index `k` advanced only when the walker came within
   0.7 m of the next cell. Aiming ahead it often passed a cell further off (the first cell of a
   plan lies up to 1.06 m from the start), so `k` stayed behind, the aim window (k+1…k+10) fell
   behind it and the walker ran back and forth round the window's end, yaw flipping by π every
   ~0.6 s, until a re-plan or the 2 s stall rule. Positions confirm it: run 1 of the probe
   shuttled between (−219.9, −211.2) and (−218.9, −209.7) for 2 s with a sheep 7–8 m away, then
   again for 2 s at t 10.3–12.3. Over the 12 traces the yaw-flip episodes cover roughly 40 % of
   the walking time (a crude measure). It also explains plates: the same fixed 12-stack tour walked
   200 m in 30.3 s on the old walker and 146 m in 20.8 s on the final one. Now `k` moves on to the
   nearest of the next cells the body can walk straight to; never past a jump cell it has not
   stood on.
2. **Progress was the straight line to the target.** "Stuck" was 12 s without getting 1 m
   closer in a straight line; the stall re-plan (an `avoid` on the next route cell, jumps off) was
   2 s of the same, but only if no re-plan had happened for 2 s. So a detour round the 52 m
   tomato-field wall counted as no progress, the stall rule fired on good routes towards a target
   that stood still, and it never fired while a target kept moving, however long the walker paced.
   Now progress is measured along the route (net metres gained on it, per route; pacing adds
   nothing): 12 s without 1 m of it is stuck, as is 30 s without getting 1 m closer to the target
   along the route (going round in circles); the stall re-plan fires after 2 s without route
   progress, at most once per 2 s.
3. **A* round large obstacles failed** (found while measuring the fixed walker, which got stuck in
   1 of 24 flowers runs, and its next version in the first of 3, both against Hotel Flamenco: in
   room 107 and in a corner behind the hotel). `footPath` kept its costs in a Float32Array and compared float64 sums with them, so two
   equal grid paths whose sums differed in the last bits rounded apart and "bettered" each other:
   every cell was expanded 3–4 times. Round the 52 m hotel, 160000 expansions of a 48000-cell box
   ran out before the pool deck; the part path led to the cell nearest the target, against the
   hotel's back wall, and the walker walked into it (`probe-fp.mjs`: north side → pool deck,
   `reached false` after 160000 expansions; each leg round the east end alone plans fine). Now the
   costs are float64 and only a real improvement counts: 4057 expansions, 7 ms, reached. Also
   (correct, but not the fix on their own, tested one at a time): diagonals cost exactly √2, a
   jump cell is ordered by its full cost, and the cap counts fresh expansions only. Where the body
   ends up in a spot the grid cannot leave at all (the 0.75 m strip between a bed and the wall in
   room 107, a corner behind the hotel: `boxed`, no cell next to the start can be entered), the
   walker backs out along its own trail to a point the grid can plan from (`wedges` in the walk
   result). Re-enacted (`probe-replan.mjs`, a re-plan forced inside the strip): old walker STUCK
   twice with exactly calB's report (p (−15.4, 0.15, −21.1), t (−4.9, −30.6), route 1); final
   walker 6.7 s, `wedges 1`, twice (and 3 of 3 on the version just before the A* fix).

Two smaller changes go with it: the walker re-plans at once when its target changes (it ran on
towards the one just caught for up to 0.6 s), and keeps its target until another is 1 m nearer
(no switching between two about as near; with the immediate re-plan it would re-plan every frame).

**Not a cheat**: it still only holds W + Shift and turns the camera; no teleports, no walking
through anything. It is a better player than the old one, so it is faster: the old walker's
measurements carried its pacing and its failed searches. **Pooling (item 1's rule):** this changes
the walker's behaviour in every ordinary chase, so the gate's samples (`walker-r1r1`) and my first
two versions (`walker-r1r2a`, `walker-r1r2b`) do not pool with the final walker (`walker-r1r2`):
all three are kept in the ledger as their own pools, and every on-foot timer below comes from
`walker-r1r2` samples only.

## Items in detail

**1. The ledger** (`notes/calibration-samples.md`, new; `tools/pool.mjs`, new). One table per
random stage (balls, sheep, flowers, jeep, sprit) and the plates; one row per sample: id, date,
code (commit + "uncommitted: …" with the sha1 of `calibrate.mjs`), pool, env, n, every raw time in
run order (two decimals, from the `… run k` lines) and every excluded run with its reason. An
"Autopilot versions" table names each walker/chase/sweeper version a pool is keyed on. Seeded with
gate 2's raw times (`c2-calibrate.log`, `c3-calibrate-rerun.log`, `c4-balls12.log`,
`c1-calibflight.log`, all on d9451f8: balls 20, sheep 6 + the stuck run, flowers 8, plates 4, jeep
22 + 1 wedged + 1 lost truck, sprit 5). Lost samples (Phase 2, world-town, island-flow, gate 1,
repair 1: e.g. the 72 balls runs behind 33 and the 98 chases behind 40) are rows marked `lost`
with what was reported; the tool never pools them. `node tools/pool.mjs [stage]` prints each pool
(n, min–max, median, p75, T_ref, the rule's timer, the 90 % range from `timerRange`), marks the
stage's `Current pool` and fails if a row's n does not match its times or a current pool has no
samples. It reproduces gate 2's numbers from the ledger (balls 20 runs: median 22.44, p75 29.40 →
41, 34–47). DESIGN §8 "Timers and difficulty": a random stage's timer is the rule on the pooled
samples in the ledger; pool only samples on the same stage and autopilot code (a change to either
starts a new pool). Also §14's file table, §16.4, README, CLAUDE.md (one line each).

**2. B1** (above): the walker is fixed (`walker-r1r2`); the gate's samples do not pool with it.
Every run on the final walker (44 balls, 32 sheep, 32 flowers, 20 plates, 12 Tonga walks) is
clean: falls 0, never stuck, `wedges` 0.

**3. B2, the balls**: three runs of `CAL=balls FOOT_RUNS=12` (r2-F1, r2-F2, r2-F3: 36 runs on the
final walker, logs `calF1.log`, `calF2.log`, `calF3.log`; on their own 22, 23 and 24), pooled with
the two default check runs' 4 each (r2-C, r2-D): n 44, 5.98–19.80 s, median 13.73, **p75 15.59** →
T_ref 18.59 → ceil(1.25 × 18.59 = 23.24) = **24** (90 % range 22–25). The old walker's 20 gate runs
pool to 41 (34–47) and its lost 72 claimed 33: neither measured the fixed walker.

**4. Sheep and flowers**: two runs of 12 each (r2-F1, r2-F2) and the check runs' 4 + 4. Sheep:
n 32, 5.92–27.77 s, median 15.90, **p75 18.53** → T_ref 21.53 → ceil(26.91) = **27** (range 25–31).
Flowers: n 32, 5.18–21.25 s, median 16.18, **p75 17.79** → T_ref 20.29 → ceil(25.36) = **26** (range
25–28). Gate 2's N3 (flowers 42 vs 41) is moot: the old walker's 8 flowers runs pool to 41, but they
carry its pacing and its failed searches round the hotel.

**5. N1, the jeep** (the chase autopilot is unchanged, so the gate's 22 pool with mine): two runs of
`CAL=jeep JEEP_RUNS=20` (r2-j1 on clean d9451f8, r2-j2), 19 usable each (one lost truck each), and
the two check runs' 12 and 11 (one lost truck). n 83 usable, 8.08–89.51 s, median 28.38, **p75
34.45** → ceil(1.2 × 34.45 = 41.34) = **42** (90 % range 37–48). This p75 is noisy: the six samples'
own p75 run 29.7–43.0, and the pool gave 45 at 60 chases, 43 at 72 and 42 at 83; I set the timer from
the pool each time, as the rule says, the last time after the final check run (the jeep check in
`calibrate` only warns, and `story`/`fullstory` wreck the jeep at once, so the literal does not
touch a check; both were re-run on the final tree anyway). The tail is the chases where the truck had
to back out: 54 with no unstick have a median of 26.0 s, the 8 with two or more 47.0 s (max 89.5).

**6. N4 + playtest-10, the plates**: the 12 stacks are a fixed layout (`nature.js`: three per table,
two tables under each pergola). `calibrate` treats them as deterministic: T_ref = the median + 0.5 s
× 10, `PLATE_RUNS` (default 6), no bootstrap range, checked like a deterministic stage (shipped ≥
T_ref), out of the random-stage list. With the fixed walker every run takes the same tour: 20 runs
20.77–21.03 s (the old walker: 30.33, one 37.95; the first fixed version: 22.43 ×8). Median **20.77**
→ T_ref 25.77 → ceil(32.21) = **33** (range 33–33). §8's table row says "fixed layout" instead of
"random spawns", and the stage is timed at the median. The shipped 45 does not stay: the median rule
gives 33, because the old walker's 30.3 s tour included about 8 s of pacing (200 m walked for a
146 m tour).

**7. N5** (my call): the docs now say the default run (`FOOT_RUNS` 4, `JEEP_RUNS` 12, `PLATE_RUNS`
6) is a regression check and the pools hold the bigger samples (DESIGN §8, §16.4, the
calibrate.mjs header). Raising the defaults to the pool sizes (36/24/24 on foot, 40 chases) would
add roughly 25 min on foot and 15 min of jeep to a run that already takes about 33 min, well past
45 min, and one default run still would not pin a random timer down (that is what pooling is for).

**Timers changed** (each in `src/game/missions/island.js` `TIMERS` with its comment, the DESIGN §8
table row, the §8.x stage literal, "Races and chases" for the jeep,
`tools/fixtures/full-missions.js` and a "Changelog (Phase 3)" line `r1 repair 2:`): friskotekBalls
33 → **24**, fatagaSheep 42 → **27**, grisfestFlowers 42 → **26**, grisfestPlates 45 → **33**,
bodegaJeep 40 → **42**, and, because the walker also walks their on-foot legs, grisfestTonga 23 →
**19** and julaftonGuests 87 → **81** (both measured with `CAL=tonga,guests RUNS=9`, 8 runs each,
now in the ledger too). Sprit is untouched (round 2).

## Checks

All from the worktree, port 8879, one harness run at a time (`batches.txt`).

- `node --check` on every changed `.js`/`.mjs` (`src/game/missions/island.js`,
  `tools/fixtures/full-missions.js`, `tools/scenarios/calibrate.mjs`, `tools/pool.mjs`): clean.
- `node tools/pool.mjs`: exit 0 (no row whose n differs from its times, no empty current pool);
  every current pool gives the shipped timer (balls 24, sheep 27, flowers 26, jeep 42, plates 33,
  Tonga 19, guests 81).
- `calibrate.mjs`: every measurement ran on the code that ships. The final walker batches ran on
  sha1 c38aefef4b7e; the commit's file (f671042a7dfe) differs from it only in comments (diff with
  comments stripped: identical), and both check runs below ran on f671042a7dfe.
- **Final tree** (the commit):
  - `story`: `[t] done -> #13 idle stage 5 coins 7750`, no `scenario failed`, `no errors`,
    **RESULT: PASS** (188 s; also PASS on the tree before the last jeep literal, 189 s, and before the
    Tonga/guests/jeep changes, 190 s)
  - `fullstory kinds missions`: fullstory `[t] done -> #13 idle stage 5 coins 7825`, kinds `collect
    cut at the scene start {"scene":true,"live":[],"empty":0,"saying":false}`, missions; `no errors`,
    **RESULT: PASS** (339 s; PASS twice before as well, 329 s and 333 s)
- **Default-env `calibrate`, final** (`finCal.log`, 2064 s; the tree of the commit except the jeep
  literal, 43 then: its own 11 chases moved the pool to 42, and the jeep check only warns):
  **RESULT: PASS**, `no errors`. Race: clean runs won by 1.9 s (2 of 2), one crash lost by 2.2–2.3 s
  (2 of 2). Pursuit: clean escapes 3 of 3; one crash: busted 1 of 3. Haggle 96 / 79 / 54 %.

  ```
  CAL CHECK buss17Drive: T_ref 45.1 -> 55 s; shipped 54 s (slack 16 %) (tighter than measured)
  CAL CHECK asnanPaint: T_ref 15.5 -> 19 s; shipped 19 s (slack 19 %) OK
  CAL CHECK bodegaVischan: T_ref 25.4 -> 31 s; shipped 31 s (slack 18 %) OK
  CAL CHECK bodegaJeep: T_ref 33.0 -> 40 s; shipped 43 s (slack 23 %) LOOSER than measured; this sample's 90 % range 35–48 s (n 11): shipped inside (consistent)
  CAL CHECK grisfestFlowers: T_ref 21.9 -> 28 s; shipped 26 s (slack 16 %) (tighter than measured); this sample's 90 % range 23–28 s (n 4): shipped inside (consistent)
  CAL CHECK grisfestPlates: T_ref 25.8 -> 33 s; shipped 33 s (slack 22 %) OK
  CAL CHECK grisfestTonga: T_ref 15.8 -> 19 s; shipped 19 s (slack 17 %) OK
  CAL CHECK julaftonGuests: T_ref 67.5 -> 81 s; shipped 81 s (slack 17 %) OK
  CAL CHECK friskotekBalls: T_ref 17.7 -> 23 s; shipped 24 s (slack 26 %) LOOSER than measured; this sample's 90 % range 22–25 s (n 4): shipped inside (consistent)
  CAL CHECK fatagaSheep: T_ref 22.6 -> 29 s; shipped 27 s (slack 16 %) (tighter than measured); this sample's 90 % range 24–39 s (n 4): shipped inside (consistent)
  ```

  buss17's 45.1 is the median of 45.1 and a run held up by traffic (the unblocked runs: 44.8, as
  at gate 2; the route is unchanged). Every random stage's shipped timer is inside its sample's
  range; plates, Tonga and guests are OK.
- **Default-env `calibrate`, first** (`chkCal.log`, 1981 s, before the Tonga/guests/jeep changes):
  RESULT: PASS. It is what showed Tonga (16.6 → 20 vs 23) and guests (74.4 → 90 vs 87, one of two
  runs held up 14.5 s by traffic) moving, hence `calTG` (`CAL=tonga,guests RUNS=9`, RESULT: PASS).
  Its buss17 (47.3: one run held up 7.1 s) was traffic too.
- Measurement batches: `jeep20` (r2-j1), `jeep2` (r2-j2), `calF1`, `calF2`, `calF3`, `calTG`: all
  RESULT: PASS. Superseded or stopped (kept in the ledger): `calA` PASS and `calB` FAIL (the room 107
  stall) on `walker-r1r2a`; `calC` stopped by me; the first `calF1` on `walker-r1r2b` stopped after
  its stall (`void/`).
- Walker runs on the final walker: 44 balls, 32 sheep, 32 flowers, 20 plates and 12 Tonga walks,
  all clean (falls 0, never stuck, `wedges` 0); the 12 guests walks took 3.5 s each.

## Follow-ups

- **Playtest the on-foot stages by hand.** The fixed walker cut balls, sheep, flowers and plates by
  27–38 %. That is the rule applied to a walker that no longer paces, but it is a large difficulty
  change in one step; the next playtest should say whether a human makes balls in 24 s, sheep in
  27 s, flowers in 26 s and plates in 33 s on a good run.
- **Deterministic drives over two runs**: the default run's buss17 (49.7 s with a 7.1 s traffic
  hold-up, 44.8 s without; the route is gate 2's to the point) and julafton guests (67.1, and 81.7
  with a 14.5 s hold-up) show that a median of 2 runs is at traffic's mercy; `CAL CHECK` prints
  "(tighter than measured)" for them, which is traffic, not the timers. A deterministic drive's
  timer wants 8 runs (`RUNS=9`), as Tonga and guests got here.
- **The jeep's tail** comes from chases where the truck backs out of something (two or more
  unsticks: median 57 s against 26 s). If that is an autopilot artefact rather than what a player
  does, it is the next thing to fix in the chase (it would start a new pool).
- **Sprit**: round 2 changes the stage; its pool starts with that change (the ledger has the gate's
  5 runs and the lost 48).
- Probes (not in the repo): `probe-sheep-trace.mjs` (a walker trace every 0.1 s), `analyse.mjs`
  (pacing, stall re-plans), `probe-wall.mjs`, `probe-replan.mjs`, `probe-nook.mjs`, `probe-fp.mjs`
  (A* reach and expansions), `extract.mjs`/`rows.mjs` (log → ledger rows), `batch.sh`.
- Process note: once, stopping my own batch, I ran `pkill -f "tools/shot.mjs calibrate"`, a pattern
  that would also match another session's run. The only other `calibrate` running (the round 2
  fix-spine fixer's `CAL=race` on 8870) had started after it and kept running, and its previous run
  had finished; after that I killed by PID only.
