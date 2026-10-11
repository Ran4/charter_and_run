# Phase 3 · round 3 · second post-gate repair `repair2-flight`

Start HEAD `b014460`, clean tree, branch `main`. Port 8870. Probes, logs and shots are in
`<scratchpad>/out-p3-r3-repair2-flight/` (the session scratchpad of this repair batch). Probes:
- `rf2.mjs` (mine, from verifier 2's `vf.mjs`): arrow-followers and aim grids. Every rule is computed
  page-side on the same start, so the before rule stays measurable on the new code:
  - `game`, what the game returns;
  - `old`, e458d7e's rule (hip pass, furniture pass, first point);
  - `r3`, ea6c96a's rule;
  - `proj`, the fix as a candidate;
  - `adv`, `proj` with the leg point moved 0.8 m along the leg.
- Copied unchanged: verifier 2's `v.mjs` (`grid`, `cabgrid`), `griddiff.py` and `vs.mjs` (with a
  door-corner shot and a dash reset-spot shot added), and repair-flight's `ff.mjs`.

**Environment.** The root filesystem was full (84–111 MB free), and `/tmp` is on it. With
`--disable-dev-shm-usage`, Chrome keeps its shared memory in `TMPDIR`, so every harness run failed
with `net::ERR_INSUFFICIENT_RESOURCES` and never became ready.
- Every run here used `TMPDIR=/dev/shm`. No files were deleted.
- The long harness runs wrote their screenshots to `/dev/shm/rf2-repair2-flight/`, and their logs were
  copied to the OUT dir.
- The ledger step after this one and the final gate will meet the same failure. Use `TMPDIR=/dev/shm`
  until the disk has room again.

## Items

### F1 · low · fixed: ombord seat dash, the forward rows' A/B legroom stalls (verifier 2 regression 1)

**Verified first.** On HEAD, `rf2` `old` reproduces verifier 2's numbers exactly:
- the 32 cells: mean 2.41 s, 6 stalls;
- the 12 dodge cells: mean 2.28 s, 3 stalls.

How a follower stalls: aimed over the seat backs straight at row 14, it walks into the seat back ahead,
slides along it slowly (little sideways pull), and catches on its aisle end. The cushions are steppable
(top 0.55 against y 0.15 + 0.45), so only the 0.12 m seat backs are walls. My legroom survey (below) found
13 of 72 cells stalling. The worst cell is row 1's door corner: 7.43 s.

**Rule** (`via`, missions/flight.js). When the over-the-furniture pass picks a waypoint (not the stage's
own target), the arrow first aims at the nearest point of the leg into that waypoint (the segment from the
point before it). Two conditions: that point must be more than 0.3 m off, and in clear sight from his hip.
Otherwise the aim stays the waypoint, as before.
- In a seat row's legroom the leg point is the aisle beside him, at (≈0.0–0.2, his z).
- Once his centre is in the aisle, the hip line to row 14 clears and the first pass takes over.

**Candidates measured** on the same starts (`f_m1_cand.log`):

| rule | 32 cells | 12 dodge cells |
|---|---|---|
| `old` | mean 2.41 s, 6 stalls | mean 2.28 s, 3 stalls |
| `proj` | **mean 1.58 s, 0 stalls** | **1.45 s, 0 stalls** |
| `adv` (0.8 m along) | 1.64 s, 0 stalls | 1.54 s, 0 stalls |

- `adv` is slower from row 3 and row 5's B column.
- Verifier 2's proposal, (0.25, his z) in the cabin when |x| > 0.45, gives the same aim in the cabin. The
  leg point is its general form, needs no cabin test, and also covers F2.

**Grid** (`grid_after.log`: the cabin at 0.2 × 0.25 m, `old` against `game`):
- 528 legroom cells of rows 1–12, both sides, change from `cabinRow14` to the aisle beside him.
- The rest of the grid is unchanged: the aisle, row 15 behind 14B (still 14B), the cells aft of row 14
  (the leg point would be `cabinRow14` itself) and the cells forward of row 1 (row 1).
- On verifier 2's grid (`v1.log`, `griddiff_v1.txt`), 52 of the 98 `cabinRow14` cells now aim at the
  aisle beside them. The aim is row 1 in 12 cells and 14B in 6, as before.
- `game` equals `proj` on every cell of both grids.

**Arrow-followers on the final code** (ts 1, E on every "Ursäkta!", timer and meter held):

| survey | before (`old`) | after |
|---|---|---|
| verifier 2's 32 cells (`f_after.log`) | 2.41 s mean, 6 stalls ≥ 1 s | **1.58 s, 0** |
| verifier 2's 12 dodge cells | 2.28 s, 3 | **1.45 s, 0** |
| (1.4, 8) / (1.4, 10) / (1.4, 12.5) | 4.22 / 5.28 / 6.30 s | 2.07 / 2.47 / 2.95 s |
| row 3's C legroom (1.0, 10.31) | 4.30 s | 2.45 s |
| (1.2, 9) / (1.2, 7.6) | 4.37 / 3.92 s | 2.23 / 1.97 s |
| legroom survey, 72 cells (`f_legroom.log`) | 3.05 s, 13 stalls, max 7.43 | **1.74 s, 0, max 3.08** |

- The 72-cell survey covers seat columns x ±1.0 / ±1.5 / ±2.0 in rows 1–12, including row 1's door
  corner at z 12.45. No cell is slower.
- From the aft legroom, cells keep their times: (1.4, −4) 0.85 s and (0.8, −10) 2.45 s, unchanged.

**Door corner of row 1** (the known issue): it is fixed, not just no worse.
- The arrow now points into the aisle beside him.
- Followers: (1.0 / 1.5 / 2.0, 12.45) went from 5.17 / 6.53 / 7.43 s, with 2.0–2.5 s stalls, to
  2.87 / 2.97 / 3.07 s.
- Shot `vs_om_doorcorner`.

**Beside a stower** (rows 3, 8, 12), the aisle point is where the stower stands, and "Ursäkta!" is the
prompt there (`vs.log`).

**Shots** (`sheet_vs.png`):
- Top row: verifier 2's before shots, with the beacon far aft over the seat rows.
- Middle row: mine. The camera turned to the guide faces the aisle, with the ring beside him.
- Bottom row: the door corner and the dash's R spot.

**What must keep** (`ff.log`, on the final code):
- ombord's seat dash from the intro: 3.1 s, 2 of 2;
- 14B offered: `juice0`, 5 spots;
- PANIK case: after it, the aim is `herrtoaGang`.

### F2 · low · fixed: gate dash, the wedge between the middle and back bench rows (verifier 2 regression 2)

**Verified first.** `rf2` `old` from the 31 cells: mean 3.83 s, and (23, 17) takes **7.08 s**, against
3.70 s with r3's rule. Two things make it matter more than "one start":
- R in the dash (`resetSpot`) puts him at (22, 17.5), in that strip (`ff.log` `reset dash corridor`).
- That spot took 3.93 s on `old`.

**Fix.** F1's rule covers it, with no terminal-specific code. Between the bench rows the leg
`herrtoaGang` → `herrtoaDoor` is the corridor, so the arrow aims east along the gap at (≈28.0–28.4, his z).
By about x 27 the hip line to the men's door clears past the back bench's east end.

**Grid** (terminal at 0.5 m):
- 116 cells change, all between the bench rows: x 18–26.5, z 14–18.5.
- On verifier 2's 1 m grid, exactly its 31 cells change.
- The queue (stage 6), boarding (stage 8) and landning [1] grids are unchanged: 0 cells.

**Followers** (`f_s3_cand.log`, `f_after.log`, `f_s3_reset.log`):

| | `old` | after | `r3` |
|---|---|---|---|
| 31 cells, mean | 3.83 s | **3.13 s** | 3.66 s |
| (23, 17) | 7.08 s | **2.98 s** | 3.70 s |
| (22, 17.5), the R spot | 3.93 s | **3.13 s** | |
| worst cell | 7.08 s | 3.85 s | |

- Every cell is faster than with both older rules. There are 0 stalls.
- Shot `vs_dash_23_17`: the arrow points east along the gap, where it used to point NE across the back
  bench.

## Checks (final code)

**Syntax and scenarios**
- `node --check src/game/missions/flight.js`: OK.
- `gate cabin trolley panic flightshots kinds missions`: no errors, **RESULT: PASS** (`scen.log`).

**`calibflight`** (default env): **RESULT: PASS** (`calib.log`).

| stage | measured | timer |
|---|---|---|
| gate | 3.6 s; walk 5.12; fear 70.2 → 95.7 (walk 70.1 → 99.3) | 6 |
| ombord | 3.12 / 3.10 s; walk 4.42 | 7 |
| sprit | 7.40 / 7.40 / 7.12 / 7.00 / 7.60 s | 13 (the CHECK is consistent) |
| landning round-up | 7.6 / 6.9 s | 12 |
| landning back to 14B | 1.30 / 3.22 s | 5 |

- Gate: the dawdler panics at 5.2 s, and its retry starts at 70.4 (first attempt 70.1).
- ombord: the careless player panics at t 21.7.
- landning: the careless player panics at t 24.2.

**`ff.mjs`** (repair-flight's followers): every time as in repair-flight's report.

| follower | time | runs |
|---|---|---|
| dash | 3.62 s, fear 94–95 | 3 of 3 |
| ombord seat dash | 3.1 s | 2 of 2 |
| queue | 5.7–6.5 s | 5 of 5 |
| boarding | 3.9–4.92 s | 6 of 6 |
| landning 14B | 0.9 / 2.2 / 1.2 s | 6 of 6 |
| landning retry | 0.4 s | 2 of 2 |

- `dashpanic`: `herrtoaGang`.
- `juice0`: 14B.
- `reset`: unchanged.

**`story`**: `[t] done -> #13 idle`, no `scenario failed`, no errors, **RESULT: PASS** (`story.log`).

**Shots looked at:** `sheet_vs.png` and `vs_om_row4B.png`.

## Timers changed

None. The arrow is a guide, and the `calibflight` autopilots walk their own waypoints. Gate 6, ombord 7,
landning 12 / 5 and sprit 13 all hold on the final code.

## Raw runs for the ledger (not added here; the ledger step adds them)

- **Id:** `r3rf2-C`.
- **Code:** this commit (`Phase 3 r3 repair2-flight`, parent b014460). The sprit stage, its sweeper and
  the cabin are unchanged; only `via` changes, and no sprit stage uses it.
- **Run:** `calibflight`, default env (SPRIT_RUNS=5).
- **Sprit sweeps, in run order:** 7.40, 7.40, 7.12, 7.00, 7.60.
- **Exclusions:** none. No panic, bowled 0, falls 0, and FLYGRÄDSLA peaks at 15.2–16.7.

## Follow-ups and known issues

- **Queue, no chain point "on"** (DESIGN §8.1 [6]): unchanged and still a known issue. This rule applies
  only when the furniture pass picks a waypoint, and nowhere on the queue's grid does it.
  - Still affected: the lounge's north end (z ≥ 23–25), its south end (z ≤ 9) and the window column (x 15).
  - There the queue arrow still aims at the men's door.
- **Gate walker margin** (0.2–0.4 under PANIK): unchanged and by design.
- **Disk full** (environment, above): later harness runs need `TMPDIR=/dev/shm`.
