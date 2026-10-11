# Phase 3 · round 3 · post-gate repair `repair-flight`

Start HEAD `ea6c96a`, clean tree, branch `main`. Port 8870. Probes, logs and shots are in
`<scratchpad>/out-p3-r3-repair-flight/`. The probes are the flight-flow verifier's `v.mjs` (plus a
part `gateretryreal`), `v2.mjs`, `v3.mjs`, `v4.mjs`, `v5.mjs` and the fixer's `ff.mjs`, together with:
- `cmp.mjs`: the verifier's human walks, with three `via` rules computed on the same frames;
- `griddiff.py`: the verifier's grids, before against after.

The before logs are the verifier's, on the same HEAD (`out-p3-r3-verify-flight-flow/`), and `before/cmp.log`.

## Items

### RF-1 · bug (regressions REG-1 and REG-2; r3flight-3 and R2 partial) · fixed

**Rule.** `via` (missions/flight.js) now has an **over-the-furniture pass**. It works in three steps:
1. As before, the guide aims at the furthest chain point he is on his way to, with a clear line from hip height.
2. When no such point is in clear sight, it aims at the furthest point he is nearer than the point before it is. Here the line only has to be clear of what stands above head height (feet + 2.0 m: walls, doors, the toilet blocks; not benches, counters or seat backs).
3. Only when he is on his way to none does it fall back to the first point. This is the PANIK case.

**Why not the verifier's fix.** I measured the verifier's proposal on the same walks first (keep the last frame's index when a point is "on" but blocked; `before/cmp.log`):
- It fixes the cabin legroom.
- Walking to the GATE 8 desk or along the bench's north side, it kept the queue's arrow on the ladies' door (28.8, 18.4), behind him, all the way to the desk.
- Walking west from the men's door, it kept the arrow on the men's door: the same as r3.

The furniture pass gives the lounge in all four queue walks (desk, north side, bench face, west from the door) and needs no state.

**Two variants dropped:**
- A guard "skip a point whose predecessor is in sight". It kept rows 2–3 aimed at row 1, and row 3 is a stower dodge row, so I dropped it.
- `pass` in the furniture pass. Within 1.5 m of `herrtoaGang`, it aimed the dash over the middle bench's end. The dash's arrow-follower clipped the bench and took 3.8 s instead of 3.6, so `pass` counts only in the first step.

**Human walks** (`cmp.log`, `v2.log`, `v5.log`):
- Ombord row 12 legroom (0.87, −0.84): now `cabinRow14` (was row 1).
- Row 15 behind 14B (1.3, −3.09): now 14B. From there E offers 14B.
- Row 8 legroom: now `cabinRow14` (was row 1).
- Queue, the desk walk: the aim flips to the lounge at (24.2, 20.8) and holds to the desk (was the men's door).
- Queue, the north-side walk: flips at (25.1, 20.1) to the lounge.
- The `v5` spots deskside and benchEnd: both aim at the lounge.

**Grids** (`v1.log` against the verifier's, `griddiff.py`):

| stage | cells that changed | now aims at | before |
|---|---|---|---|
| ombord seat dash | 98 seat-row and legroom cells | `cabinRow14` | row 1 |
| ombord seat dash | 1 cell, row 15 behind 14B | 14B | row 1 |
| landning [1] | 2 cells in row 15 | 14B | `cabinRow14` |
| gate queue | 56 cells, north of the back bench row and south of the middle row | the lounge | the men's door |
| gate dash | 31 cells between the middle and back bench rows | the men's door, over the back bench (the r2 aim) | back past the middle bench's end |

- In ombord, row 1 is now the aim only forward of row 1: 12 cells, down from 111.
- Boarding is unchanged.

**PANIK** (`dashpanic`, 3 spots): after the PANIK the target is `herrtoaGang` (27.9, 12.2), as before.

**Arrow-followers** (`ff.log`) all keep their times:
- dash: 3.6 s, fear 94, aims identical to HEAD (3 of 3);
- ombord seat dash: 3.1 s (2 of 2);
- queue: 5.7–6.5 s (5 of 5);
- boarding: 3.9–4.9 s (6 of 6);
- landning 14B: 0.9 / 1.2 / 2.2 s (6 of 6), and 0.4 s from the retry (2 of 2).

**Shots.** `sheet_rf1.png`: the verifier's `rs_row13`, `rs_row15deep`, `q5_deskside` and `q5_benchEnd` on top, mine below. Now the ring sits at row 14 / 14B beside him, and the lounge ring shows over the bench.

**Timers.** No timer moves: the `calibflight` autopilots walk their own waypoints.

**Known issue.** Where he is on his way to no chain point, the queue still aims at the men's door. That covers the lounge's north end (z ≥ 23–25), its south end (z ≤ 9) and the column by the window wall (x 15). Fixing it needs a route-aware guide, which would be a redesign. It is in DESIGN §8.1 [6].

**DESIGN:** §8.1 [3] (the rule and the measurements), §8.1 [6], §8.2 [0], changelog.

### RF-2 · ugly (r3flight-2 partial) · fixed

**Change.** `cabin.bestSeat` now lets the stage's seat reach 2.0 m when it is level with its row (`|seat.z − p.z| < 0.6`); elsewhere the reach stays 1.6 m. The seat interactable's `r` goes from 1.6 to 2.0.

The verifier's proposal alone would not have worked: `bestInteractable` drops anything beyond `it.r`. From the D half of the aisle, 14B is 1.7–1.8 m off, so with `r` still 1.6 there would have been no "Sätt dig" prompt at all. `bestSeat` still limits every other seat to 0.8 m.

**Evidence** (`v3.log`, `v4.log`):
- Juice [0], aisle at row 14: E offers 14B at x 0.45 to −0.4 and every facing, 32 of 32. Before, x ≤ −0.2 offered 14D.
- The verifier's D-half cycle (x −0.3 / −0.2): the first E now seats him in 14B, and the call-button prompt and gag follow (the stage advances to s1). Before, it alternated 14D / aisle.
- Landning [2], standing up from 14B: E seats him in 14B again.

`v3`'s `land2` warps into landning [2] at row 16, two rows away, and offers 16D. Real play never gets there: stage 2 starts seated in 14B, and its retry goes back to stage 1.

**Check.** `cabin` now checks it: in juice [0], 14B is the prompt from x −0.3 / −0.2 / 0.25, and E from x −0.3 seats him in 14B.

**DESIGN:** §5.10, §16.4 `cabin`, changelog.

### RF-3 · bug vs contract (r3flight-4 retry half) · fixed

**Change.** A new common stage option, `retryFear` (runner.js, kinds/core.js `COMMON`), set only on the gate statistics checkpoint (flight.js, DESIGN §8.1 [2], the fixture):
- When the stage first starts in a run of the mission, the runner records `shame.v` in `cpFear[stageI]`. Its retries keep that value, and `begin()` resets it.
- A retry from that checkpoint adds the value back with `shame.add`, on the fresh `m` before the stage starts.

This restores the first attempt's value ("Bomber" plus the arch, ≈ 22) rather than adding a fixed 22, so a retry matches whatever the first attempt really had. First attempts do not change.

**Evidence:**

| run | first dash start | retried dash start | notes |
|---|---|---|---|
| real play, 20 chars/s (`v_gateretryreal.log`) | 70.2 | 70.3 | was 48.1 at HEAD; the dawdler panics in the retried dash as well |
| the verifier's warped `gateretry` (no arch) | 58.0 | 58.3 | was 48.1 |
| `calibflight` dawdler retry, default | 70.1 | 70.4 | new check |
| `calibflight` dawdler retry, 20 chars/s | 70.2 | 70.0 | new check |

`sheet_rf3.png` shows the retried dash before and after: now the heartbeat vignette is on and the meter is hot.

**DESIGN:** §8.1 [2], §9.2 (the type and the normative list), §9.4 item 3, §16.4 `calibflight`, changelog.

## Checks (final code)

- `node --check` on every changed file: OK.
- `gate cabin panic trolley kinds missions`: no errors, **RESULT: PASS**.
- `calibflight` (full, default env): **RESULT: PASS**.
  - gate: 3.6 s → 6, walk 5.12; start 70.3 → 95.7.
  - Dawdler PANIK at 5.2 s; its retry 70.4 against 70.1.
  - ombord: 3.1 s → 7, walk 4.4.
  - landning: 7.6 s → 12, and 3.2 s → 5.
  - Careful players never panic; careless players panic in missions 1, 2 and 5.
- `FLIGHT=gate DIALOG_CPS=20 calibflight`: **RESULT: PASS**.
  - Start 70.3 → sprint 95.8, walk 99.6.
  - Dawdler PANIK at 5.2 s; retry 70.0 against 70.2.
- `fullstory`: `[t] done -> #13 idle`, no errors, **RESULT: PASS**.
- `story`: `[t] done -> #13 idle`, no `scenario failed`, no errors, **RESULT: PASS**.
- Sprit: the full `calibflight` run's 5 sweeps (7.40, 6.70, 6.90, 6.93, 6.80) are in the ledger as `r3rf-C`.
  - Pool `sweeper-r2fm/b69c64e`: n 76, median 7.36, p75 7.60 → **13** (90 % range 13–13).
  - Quoted in: §8 table, §8.4, flight.js header, ledger summary.
- Shots looked at: `sheet_rf1.png`, `sheet_rf3.png`, `before/cmp_q_desk.png`.

## Timers changed

None. Gate 6, ombord 7, sprit 13, landning 12 / 5 all hold.

## Follow-ups and known issues

- **Queue guide, no chain point "on".** In the lounge's north end (z ≥ 23–25), south end (z ≤ 9) and the window column (x 15), the queue arrow still points at the men's door, the chain's first point. Before r3 it pointed straight at the lounge.
- **Door corner of row 1.** In row 1's legroom by the door (z < 12.6, reached on a diagonal from the door), the seat dash's arrow now points aft over row 1's C seat, as r2's index did. A human steps into the aisle there. An arrow-follower from the intro spot never enters that corner, because it heads for row 1 at z > 12.6.
- **Gate walker margin** (unchanged, the verifier's note). The walker arrives 0.2–0.4 under PANIK. By design the careful player sprints.
