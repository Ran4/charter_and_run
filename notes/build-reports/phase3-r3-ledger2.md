# Phase 3 · round 3 · last repair `ledger2`

Start HEAD `cd39361`, clean tree, branch `main`. Port 8870. Logs are in
`<scratchpad>/out-p3-r3-ledger2/` (below: `OUT/…`; `<scratchpad>` is this batch's,
`…/9db49231-…/scratchpad`). Gate 2's logs are in `<scratchpad>/out-p3-r3-gate2/`. As the brief
asked, this step made **no calibration run**. Every new row comes from a log that already existed.
The only harness runs were the checks at the end, on the final tree.

## Items

### ledger2-1 · gate 2's raw runs · fixed

Gate 2's section 3 is now in `notes/calibration-samples.md`, one row per stage:
- `r3g2-D` is its default `calibrate`.
- `r3g2-C` is its default `calibflight`.
- Both ran on 4887ede (clean) on 2026-10-11. Times have two decimals (julafton one, as logged) and are
  in run order.

I checked every time against the `… run k` lines of `out-p3-r3-gate2/calibrate.log` and
`calibflight.log`. Tonga's times are the walk plus the drive: 3.8999 + 11.3995 = 15.30, and
3.8998 + 14.1327 = 18.03.

| stage | n | raw times | excluded / notes |
|---|---|---|---|
| bodegaJeep | 11 | 39.15 20.60 38.88 31.73 14.92 14.98 27.35 34.08 30.35 14.18 30.57 | Run 5 is out: **the truck was lost** (at 48.71 s, 823 m driven, 3 unsticks). This is not a wedge, though its `CAL TABLE` said "wedged" (ledger2-6). Runs 0, 9 and 11 had one unstick each, and none wedged. |
| friskotekBalls | 4 | 10.05 12.32 11.67 9.78 | falls 0, wedges 0 |
| fatagaSheep | 4 | 23.10 15.90 23.12 18.07 | falls 0, wedges 0 |
| grisfestFlowers | 4 | 16.97 19.33 11.27 12.90 | falls 0, wedges 0 |
| grisfestPlates | 6 | 20.77 20.77 21.03 20.87 20.77 20.77 | falls 0, wedges 0 |
| grisfestTonga | 2 | 15.30 18.03 | Traffic held the drives 1.0 s and 5.5 s. No impact, so both are clean by the stage's rule, as in g2-R1 and r2-C. |
| julaftonGuests | 2 | 67.9 68.5 | No impact. Run 1's Majsan leg was held 1.4 s. |
| sprit[0] (`r3g2-C`) | 5 | 7.82 7.32 6.42 6.70 7.50 | No panic, bowled 0, falls 0, FLYGRÄDSLA peaks 13.7–17.2. |

### ledger2-2 · repair2-flight's raw runs (and one more) · fixed

**`r3rf2-C`.** This is repair2-flight's default `calibflight`:
- Code: b014460 plus the uncommitted repair2-flight change, which is bf50e87's tree.
- Sprit: 7.40 7.40 7.12 7.00 7.60. None excluded: no panic, bowled 0, falls 0, peaks 15.2–16.7.
- Checked against `out-p3-r3-repair2-flight/calib.log`.

The other repair2 reports list no raw run:
- repair2-island-camera: "no re-measure, no `calibrate`, no ledger entry".
- repair2-island-staging: the paint drive is a fixed drive, which has no pool.

**`r3v2-C`.** This one is outside the brief's list. I searched this batch's OUT dirs for logs with
pooled-stage run lines. One more run turned up:
- The verify2 of r3 repair-flight ran a default `calibflight` (`out-p3-r3-verify2-repair-flight/calib.log`).
- Its report says it ran read-only on HEAD 4887ede.
- Sprit: 6.80 7.20 7.72 7.40 6.90. No panic, bowled 0, falls 0, peaks 14.7–16.9.

The Rules say every raw time goes in, and the brief closes sampling "with every run made so far
pooled", so it is in. It does not move the timer: without it the pool is n 96 → 13, and with it
n 101 → 13 (range 13–13).

The other logs the search found are already in the ledger. The exceptions are the r3 playtest's
`[hm]` human-model runs, which use another autopilot and so cannot pool by the Rules.

The sample-id list now names `r3g2`, `r3v2` and `r3rf2`.

### ledger2-3 · pool membership · fixed (every row joins its stage's current pool)

I read every hunk of `git diff 4887ede..cd39361` (camera.js, missions/flight.js, runner.js and docs):

| commit | what changes | effect on the pools |
|---|---|---|
| b014460 repair2-island-camera | camera.js only: the side slide's `SLIDE_HOLD`, the collapse and cut rules, and the cut-in start | No `cam.yaw` line changes. The walker sets `cam.yaw` itself (calibrate.mjs:856), and movement follows the yaw, not the eye. |
| bf50e87 repair2-flight | `via` in missions/flight.js: the leg point when the furniture pass picks a waypoint | `via` wraps the gate dash, queue, boarding, ombord and landning [1] (flight.js:192/219/257/291/461). The sprit stage [0] is a plain `collect` with no `via`, and the sweeper follows no guide. |
| cd39361 repair2-island-staging | runner.js `fail()` re-hides the checkpoint stage's `startCue.hide` keys | Only asnan stage 9 has a `startCue.hide`, and that is a fixed drive with no pool. No pooled stage has one. A calibration run with its timer raised does not fail. |

Gate 2 and the verifier ran on 4887ede. It differs from 6d5b919 only in timer literals and docs, and
`calibrate` raises every timer it measures. So the stages were in their current pools then and still
are:

| stage | pool | why |
|---|---|---|
| friskotekBalls | `walker-r1r2/r3-island-camera` | lawn, walker and intro unchanged since the pool started |
| fatagaSheep | `walker-r1r2/r3-island-camera` | crags, walker and retry spot unchanged |
| grisfestFlowers | `walker-r1r2/r3-island-staging` | the porch intro (302d4c2) is unchanged; no later commit touches grisfest |
| bodegaJeep | `chase-r1if/d9451f8` | the chase autopilot and bodega are unchanged; no solid on the roads changed |
| sprit[0] | `sweeper-r2fm/b69c64e` | no `via` on the sweep, and the sweeper is unchanged (r3rf-C's precedent) |
| grisfestPlates, grisfestTonga, julaftonGuests | `walker-r1r2/d9451f8` | the dance floor, the Tonga drive and the guests stage are untouched by r3's commits |

No pooled stage changed after gate 2, so the brief's stop condition (item 7) does not apply. The
ledger now has this reasoning as a paragraph under the sample ids, next to r3 gate 1's.

My own tool change (ledger2-6) touches only the jeep row's label in the `CAL TABLE`, not autopilot
code. The autopilot-version table says so for `walker-r1r2` and `chase-r1if`, because the sha1 of
`calibrate.mjs` changes from f671042a7dfe.

### ledger2-4 · timers by the rule · fixed: balls 24 → **23**, sheep 27 → **28**

`node tools/pool.mjs` after the rows (`OUT/pool.log`, exit 0, no PROBLEM) confirms gate 2's what-if.
No sample was picked or dropped:

| stage | current pool | before (committed) | after ledger2 | timer |
|---|---|---|---|---|
| friskotekBalls | `walker-r1r2/r3-island-camera` | n 44, median 13.60, p75 15.56 → T_ref 18.56 → 24 (22–25) | n 48, median 13.32, p75 15.34 → T_ref 18.34 → ceil(22.93) = **23** (22–25) | **24 → 23** |
| fatagaSheep | `walker-r1r2/r3-island-camera` | n 44, median 16.00, p75 18.40 → 21.40 → 27 (26–29) | n 48, median 16.32, p75 18.80 → 21.80 → ceil(27.26) = **28** (26–30) | **27 → 28** |
| grisfestFlowers | `walker-r1r2/r3-island-staging` | n 44, p75 18.24 → 26 (25–27) | n 48, median 16.22, p75 18.24 → 26 (25–27) | 26 |
| bodegaJeep | `chase-r1if/d9451f8` | n 119, median 27.98, p75 34.05 → 41 (37–44) | n 130, median 28.00, p75 34.05 → 41 (38–43) | 41 |
| sprit[0] | `sweeper-r2fm/b69c64e` | n 86, median 7.31, p75 7.60 → 13 | n 101, median 7.32, p75 7.60 → 13 (13–13) | 13 |
| grisfestPlates | `walker-r1r2/d9451f8` | n 38, median 20.77 → 33 | n 44, median 20.77 → 33 | 33 |
| grisfestTonga | `walker-r1r2/d9451f8` | n 18, median 15.28 → 19 | n 20, median 15.28 → 19 | 19 |
| julaftonGuests | `walker-r1r2/d9451f8` | n 15, median 67.30 → 81 | n 17, median 67.40 → 81 (81–82) | 81 |

How each pool's timer moved over its samples, in row order (`OUT/stats.mjs`):
- Balls: 24 25 24 24 24 → **23**. Gate 2's four runs are all below the pool's median.
- Sheep: 25 27 28 28 27 → **28**.
- Flowers: 26 27 27 27 26 26.
- Jeep: … 42 42 41 41.

The two re-set timers were changed in every place together:
- island.js `TIMERS` and their comments;
- the DESIGN §8 table rows (T_ref, timer, slack: balls 35 → 33 %, sheep 32 → 33 %);
- the §8.7 s1 and §8.11 s5 stage literals;
- the fixture `tools/fixtures/full-missions.js` (lines 277 and 432);
- the ledger's Current-pool lines;
- the changelog.

`pool.mjs` now reproduces every shipped timer in the code (island.js TIMERS, flight.js `timer: 13`),
the §8 table, the §8.x literals and the fixture.

### ledger2-5 · stale text · fixed

Each summary was re-synced to `pool.mjs`:
- **§8.4 sprit paragraph** (gate 2 N2, review 2 R1). It said 76 sweeps, median 7.36. It now says 101
  sweeps, 5.4–7.8 s, median 7.32, p75 7.60 → 13, and lists every contributing sample through r3
  repair2-flight.
- **Julafton row** (§8 table). "Median of 15 clean runs: 67.0–68.6, and one held up 14.5 s by
  traffic, 81.7" read as 16 runs. It now says "67.4 (median of 17 clean runs, 67.0–81.7: all within
  67.0–68.6 but one held up 14.5 s by traffic, 81.7; …)". The island.js comment says "T_ref 67.4
  (median of 17 clean runs …)".
- **§8 table**:
  - balls: of 48, median 13.32, and the n 44 → 24 step;
  - sheep: of 48, median 16.32, and the n 44 → 27 step;
  - flowers: of 48, gate 2's 4 named;
  - jeep: 130 usable chases in 10 samples, 5 lost and 1 wedged excluded, median 28.00, and the
    119 → 41 step;
  - plates: 44;
  - Tonga: 20;
  - sprit: 101, median 7.32, the samples named.
- **"Races and chases" jeep paragraph**: 130 chases, median 28.00, range 38–43, ten samples, and
  "41 at 119–130".
- **island.js `TIMERS` comments**: balls, jeep, sheep, flowers, plates, Tonga, julafton.
- **flight.js header**: "bottles p75 7.60 s of 101 sweeps".
- **Ledger**:
  - every Current-pool line (balls and sheep with the step that moved them, the jeep's history);
  - the sprit paragraph's sample list;
  - the jeep row's exclusion wording.
- **Changelog lines**: left as written. They are history: each is true of its own commit.

### ledger2-6 · calibrate.mjs label for a lost truck · fixed

`tools/scenarios/calibrate.mjs` jeep case:
- A lost truck is pushed with `lost: true` and still `wedged: true`. So it stays excluded from `ok`,
  the p75 and `__jeepWrecks`, exactly as before.
- The `CAL TABLE` / `CAL jeep` row prints `- (truck lost, excluded)` for it and `(wedged, excluded)`
  for a real wedge (< 6 m/s).
- What is measured, kept or pooled does not change. The walker and chase code are untouched, which
  the autopilot table records.
- Checked:
  - `node --check`;
  - a read of every `wedged` use in the jeep case (nothing outside it reads the array);
  - the label expression run on its own in node on {kept, lost, wedged}. It prints `39.1 / - (truck
    lost, excluded) / 93.5 (wedged, excluded)`.
- I did not run `calibrate` (item 7), so the new label first prints in a real run the next time a
  truck is lost.

### ledger2-7 · sampling closed · fixed

There is a dated paragraph above the ledger's stage tables, after the pool decisions: "**Phase 3's
sampling closed on 2026-10-11 (r3 ledger2).**" It says:
- every raw run made up to here is pooled;
- the sheep and balls pools sit on a rounding boundary (sheep 28 → 27 → 28 over two n 4 default
  runs), so no further default run feeds them before the tag;
- the pools stay open: every future run goes in, and a timer follows its pool.

The DESIGN changelog has the same line.

## Timers before → after

| stage | before | after | current pool (n) |
|---|---|---|---|
| friskotekBalls | 24 | **23** | `walker-r1r2/r3-island-camera` (44 → 48) |
| fatagaSheep | 27 | **28** | `walker-r1r2/r3-island-camera` (44 → 48) |
| grisfestFlowers | 26 | 26 | `walker-r1r2/r3-island-staging` (44 → 48) |
| bodegaJeep | 41 | 41 | `chase-r1if/d9451f8` (119 → 130) |
| sprit[0] | 13 | 13 | `sweeper-r2fm/b69c64e` (86 → 101) |
| grisfestPlates | 33 | 33 | `walker-r1r2/d9451f8` (38 → 44) |
| grisfestTonga | 19 | 19 | `walker-r1r2/d9451f8` (18 → 20) |
| julaftonGuests | 81 | 81 | `walker-r1r2/d9451f8` (15 → 17) |

## Checks (final tree)

| check | result |
|---|---|
| `node --check`: island.js, flight.js, the fixture, calibrate.mjs, pool.mjs | ok |
| `node tools/pool.mjs` (`OUT/pool.log`) | exit 0, no PROBLEM; every CURRENT pool's timer equals the shipped one in code, §8 table, §8.x literal and fixture |
| `fullstory kinds missions` (`OUT/fk.log`) | `[t] done -> #13 idle stage 5  coins 7775`, no errors, **RESULT: PASS** |
| `story`, full (`OUT/story.log`) | `[t] done -> #13 idle stage 5  coins 7775`, 0 `scenario failed`, no errors, **RESULT: PASS** |

Calibration runs: none, by the brief. The disk had 151 GB free and 15–18 GB of RAM was available.
No `TMPDIR` workaround was needed.

## Follow-ups / known issues (for the final report)

- **Boundary pools.** Balls (23, range 22–25) and sheep (28, range 26–30) still sit where one n 4
  sample can flip them by a second. Flowers (26, range 25–27) is close too. The ledger now records
  that sampling closed here, so a post-tag run that flips one is the rule working, not a regression.
- **The jeep paragraph's unstick split** ("54 with no unstick … the 8 with two or more 47.0 s") is
  an older analysis of a subset. Not every row records unsticks, so `pool.mjs` cannot re-derive it.
  I left it as it was.
- **Verifier runs.** No verifier sample was in the ledger before; `r3v2-C` is the first. In a future
  round, verifiers should list their calibration runs under "Raw runs for the ledger", as the gates
  and fixers do, so the ledger step does not have to find them by searching the logs.
