# Phase 3 · round 3 · fixer `flight-trolley`

Start HEAD `08c1104` (fixer 4/4 island-camera), clean tree, branch `main`. Port 8870. Probes, logs
and shots in `<scratchpad>/out-p3-r3-fix-flight-trolley/`:
- `probe.mjs` (`repro`: landning with the auto trolley caught by the intro between row 16 and José,
  then the calibflight round-up autopilot, nearest first, and a retry; `fwd`: the trolley between row
  16 and Herr Storch, forward first; `galley`: the intro at slow typing, the row-16 shot, the
  galleyCam cut and stage 0's first frame; `retry`: the 14B dash failed and retried. `FAST=1` sets
  the auto trolley off 1 m before the window instead of waiting a minute for it);
- `before_repro_*.png` (HEAD), `after_*.png`, `norunnerfix_retry_start.png` (the runner change
  reverted for one run), `sheet_after.png`;
- `calib-before/` (`FLIGHT=landning/careful,landning/reverse` on HEAD with the new trolley log),
  `calib.log` and `calib2.log` (full `calibflight` after), `calib-careless/`, `group.log`,
  `fullstory.log`, `story.log`.

## Item

- **r3user-1 · bug (blocks the mission) · fixed** — flight.js, cabin.js, main.js, runner.js.
  **Verified first.** The orchestrator's read holds: landning stage 0's `startCue: { trolley: false }`
  → main.js `cue` → `cabin.stopTrolley()` halts the trolley wherever it stands, and only `'auto'`
  mode re-parks it. From mission index 2 the auto trolley runs the aisle in cruise; the landning
  intro's dialogue halts it mid-aisle and the stage freezes it there for the whole run. Probe
  (`repro`, HEAD): the auto trolley caught by the talk on its way to row 19, at z −6.49 with the
  pusher at −5.59; the round-up autopilot (José first) stood at z −4.91 for the full 12 s,
  `STÅENDE 0/3`, failed; the retry from stage 0 re-applied the cue, same spot, failed again
  (`before_repro_4s.png`: Stig against the pusher, the trolley behind her). Between z 3.4 and −14.4
  trolley and pusher wall off Herr Storch or José and Berra (the 0.45 m trolley and the firm pusher
  fill the aisle; seat backs stop a detour through the rows), and stage 1 (14B, 5 s) inherits it.
  **Fix.** A new `cabin.parkTrolley()` = `stopTrolley()` at `trolleyPark` (0, 16.2) with the
  serving/wait/grace state cleared, as the cue value `trolley: 'park'`. Landning's stage 0
  `startCue` parks it (any start, retries included) and so does the intro's last line, the
  stewardess's galleyCam cut: the hard cut from the row-16 shot hides the move, and the shot then
  shows the trolley at home in the galley behind her, with its pusher at the cockpit door
  (`after_galley_2_cut.png`; `after_galley_1_row16.png` has it at z −5.76 one line earlier). The
  front galley is clear of every route, target and cut of the mission (the round-up runs z 3.4 to
  −14.4, the 14B dash z −2 ± 2.6, the outro cuts look aft from row 22 or frame Stig at 14B).
  `transitionTo` now uses the same call (it did stop + place by hand). Why park and not "keep it
  running": a running trolley in the round-up halts for good behind the standing passengers
  (`_someoneAhead`, any NPC within 1.2 m ahead in the aisle), which is the same wall.
  After (`probe.mjs` FAST, same autopilot): nearest first done in 7.8 s, forward first in 6.9 s,
  14B in 1.3 s, the trolley at 16.20 `stop` throughout.
  **Retry (found in the audit).** `runner.retry()` re-applied the ambient cue fields of the stages
  before the checkpoint before `startMission`, under the failed run's `m`; a manual trolley mode
  belongs to the run that set it, so it fell back to auto on the next tick. HEAD lost landning's
  `trolley: false` that way (by the same mechanism the frozen trolley went back to auto in the
  retried 14B dash and set off aft from wherever it stood); with only the park fix, the re-parked
  trolley set off from the galley, 16.19 → 12.05 in 4 s (`norunnerfix` run). Now the ambient
  fields go in startMission's `before` (fresh `m`, after the teleport, ahead of a `retryCar`): the
  retried dash keeps it at 16.20 `stop`
  (`after_retry_start.png`). The other ambient fields do not depend on the order (the phase at the
  teleport is already the ambient one after `restoreAmbience` in every flight mission; sky, music,
  outfits and stowers do not touch the teleport); `kinds` (grisfest night + `vals` + plates on a
  retry) and `fullstory` pass. §9.4 item 3 rewritten.
  **Timers: unchanged.** `calibflight` now logs where the trolley stands for the round-up. On HEAD
  the shipped measurement had it frozen at z 15.70 `stop` (the auto trolley had run 0.5 m from the
  park before the talk), i.e. in the front galley, out of every route: round-up 7.62 s (nearest
  first) / 6.9 s (forward first), back to 14B 1.3 / 3.2 s, the shipped 12 and 5. After the fix
  (16.20, parked) the full run gives the same (below). No ledger entry for landning: its timers
  are deterministic autopilot times, not pools.
  **Checks added** to `trolley`: landning started with the auto trolley aft of row 16 (caught at
  z −5.68 when the intro starts) has it at 16.2 `stop` in the round-up, and a stage-1 checkpoint
  retry keeps it there, `stop`, not running.

## Audit (the rest)

- `trolley:` cues: juice [1] `true` (its own checkpoint `startCue`, applied under the retried run's
  `m` already; the trolley is the target: `trolleyEnd` is the end nearest the player, reachable
  past the pusher at 0.65 m of the 1.3 m radius), sprit [0] `true` (a designed moving obstacle,
  kept), landning [0] `false` → `'park'` (+ the intro line). No mission stage uses `false` any
  more (DESIGN §5.8 rule). `stopTrolley`/`startTrolley` in code: the cue and `transitionTo` (now
  `parkTrolley`); the rest are tests freezing it for shots.
- Checkpoints and retries: gate [2] and ombord [1] run in phase `gate` (auto: parked); juice [1]
  sets its own mode; landning [1] was the only checkpoint with a `trolley` field before it (fixed
  above).
- R in the cabin (`aisleSpot`) only steps back into the aisle at the same row, never along it, so
  it never helped past a trolley; with nothing frozen mid-aisle no stage needs it to.
- Stage by stage, can the trolley stand between the player and a required target for good?
  ombord [0]: parked at 16.2, forward of the door (14.7), the route runs aft — never. juice [1]:
  it is the target. juice [2]/[3]: he takes the juice at the end facing him, so the trolley is on
  his far side from 14B — never between. sprit [0] (13 s): moving, 3 s serving stops, re-parked
  at z −15.5 with a 6 s wait, and a bottle at or beyond it rolls out from under it towards him
  (collect's roll rule); sprit [1] (untimed, to the front galley): it may come down the aisle at
  him; he steps into a free row and it passes. landning [0]/[1]: parked now; [2] seated.
- `_someoneAhead`: the trolley waits only for non-player characters in the aisle within 1.2 m
  ahead (the player is bowled, then waited for while down plus 1.2 s of grace, then bowled again
  if he stays). Cast NPCs stand in the aisle in front of a running trolley only in landning's
  round-up (now parked), stowers only in ombord (phase `gate`, parked). Aisle walkers are active
  only in cruise with the sign off and never deadlock: one walking at the trolley dodges into a
  free row, or with no row in reach waits 6 s and squeezes past (`_walkerBlocked`). The longest
  case: a walker dwelling at the rear galley spot (z −16.3; 3–6 s, cut short when the sign lights
  and sends him home) halts the trolley at z −14.7, then waits 6 s for it and squeezes past, so
  about 12 s at most in front of sprit's start at the rear galley. Bounded, never permanent; no
  change.

## Checks

- `node --check` on every changed file: ok.
- `cabin trolley turbulence flightshots gate missions`: no errors, **RESULT: PASS** (`trolley`:
  `landning trolley {"caught":-5.68,"parked":{"z":16.2,"mode":"stop",…,"stage":0},"retried":{"z":16.2,"mode":"stop","running":false,"stage":1,…}}`).
- `fullstory kinds`: `done -> #13 idle`, no errors, **RESULT: PASS**.
- `calibflight` (full, default env), run twice. Run 2 (`calib2.log`): gate 3.62 → 6 (fear 70.1 →
  95.6, walk 5.12, dawdler PANIK at 5.2 s), ombord 3.1 → 7 (careless PANIK at 21.7), sprit
  7.3/7.0/7.4/6.9/7.7 (CALF CHECK inside 12–13), landning 7.6 / 6.92 → 12 and 1.3 / 3.2 → 5 with the
  trolley at 16.20 `stop` from start to end, careless PANIK at 24.2: no errors, **RESULT: PASS**.
  Run 1 (`calib.log`, the same rows and timers) ended **RESULT: FAIL** on one check: the careless
  landning had not panicked 90 s (real time) after sitting down, fear 91.9 and climbing, the mission
  still running. The panic comes at 24.2 s of game time in run 2 and in a separate
  `FLIGHT=landning/careless` re-run (PASS), and run 1 coincided with other agents' Chrome runs
  (2 GB free at one point; my first probe attempt then also timed out waiting a minute of game
  time): a starved frame rate stretched game time past the harness's 90 s real-time wait. Not a
  game change; nothing of this fixer touches the approach.
- Ledger: the 10 sprit sweeps of both runs are in `notes/calibration-samples.md` (r3ft-C1, r3ft-C2;
  same stage and sweeper code, pool `sweeper-r2fm/b69c64e` n 71, median 7.40, p75 7.60 → **13**,
  unchanged; DESIGN §8 table, §8.4 and the flight.js header say n 71).
- `story`: `[t] done -> #13 idle`, no `scenario failed`, no errors, **RESULT: PASS**.
- Shots looked at: `before_repro_4s.png` (Stig against the pusher of the frozen trolley),
  `sheet_after.png` (the row-16 intro shot with the trolley halted near row 16, the galleyCam cut
  with it parked behind the stewardess, stage 0's first frame and the round-up with the aisle clear,
  the HEAD block for comparison, the retried 14B dash).

## Follow-ups

- None for other groups. Known and kept: the moving trolley in sprit can make the player wait up to
  ~12 s at the rear galley behind a walker it is waiting for (above), by design a passing obstacle.
