# Phase 3 · round 3 · second post-gate repair `repair2-island-staging`

Start HEAD `bf50e87`, clean tree, branch `main`. Port 8870. Probes, logs and shots are in
`<scratchpad>/out-p3-r3-repair2-island-staging/` (below: `OUT/…`; `<scratchpad>` is this batch's,
`…/9db49231-…/scratchpad`). The probe is a copy of verifier 2's `vcands.mjs` + `v2scen.mjs` `paint`
(the real paint drive: calibrate's autopilot on the shipped route, ts 1, traffic on; `FAILD=18`
runs the stage's own timer out near the bar). `v2scen.mjs` gained a `QUIT=1` branch: Q instead of
E on the fail screen, then Angerud's state and spot. The before measurement is verifier 2's `pf`
on 4887ede (`out-p3-r3-verify2-repair-island-staging/pf`); nothing between 4887ede and the start
HEAD touches the runner or asnan.

**Environment.** The disk (`/`) is full: 55–60 MB available for the whole run (another
workload's caches, not this project). My first `pf` run lost the WebGL context half way (63
`Shader Error 1282` after the retry's drive; its fail-screen part is valid and is the "after" in
the sheet, `OUT/pf_ctxlost*`), and the first `QUIT` run died on `ENOSPC`. Every run after that
used `TMPDIR` and `OUT` on `/dev/shm/r2stg` (Chrome's 134 MB profile no longer on the disk) and
copied the logs and the shots below into `OUT`. An orphaned headless Chrome from 06:11 (pid
3096227, not this agent's) still holds a 134 MB profile in `/tmp/puppeteer_dev_chrome_profile-DaPzlg`.

## Items

### S1 · low (r3v2-staging-1) · fixed

**Verified.** asnan's paint drive (stage 9, index 8, the checkpoint) hides Angerud with
`startCue: { hide: ['angerud'] }`, which is not `hiddenBy: 'mission'`. `fail()` →
`cleanupMission()` → `placeNpcs(true)` shows everyone with a home, so the moment the timer ran out
17 m from the bar he stood at his door (−178, −63), `normal`, 23 m from the lens beside Carmencita,
under "Tiden är ute!" (verifier 2's `pf`: +600 and +1200 ms on screen, no occluder).

**Fix** (runner.js `fail()`, the verifier's proposal). Right after `cleanupMission()`:
`for (const k of def.stages[this.cpI]().startCue?.hide || []) g.hideNpc(k);`
- Same frame as the placement (synchronous), so he is never drawn.
- The stage is resolved from its factory as `retry()` already does (`cp = def.stages[this.cpI]()`
  and the `ambient()` loop): the factories only build the stage object, no side effects.
- `hideNpc` sets `busy`; the failed state never runs the idle `placeNpcs()`, so he stays put.
- E: `retry()` → `startStage` re-applies the cue (hidden again; nothing changes there).
- Q: `abort()` from `failed` skips `cleanupMission()` and its `placeNpcs(true)` puts him home
  (`normal`, not busy).
- Why not move his island home off the bar front: the bar door is his place in the film and in
  the idle world (the giver two-shot and the outro use it), and the runner rule is general: the fail
  screen now shows what the retry will.

**Audit of the other missions.** asnan stage 9 is the only stage with a `startCue.hide` (grep of
`startCue` in flight.js and island.js; the kinds only copy `startCue` from their options). A
mission whose `cpI` is still 0 uses stage 0's `startCue`: none has a `hide`. The other `hide`s
are dialogue-line cues (grisfest's reception outro `hide: ['siv']`, julafton's "Ut! Ut!") and
`hideForMission` riders (`hiddenBy: 'mission'`, removed with their car and shown on a fail as
before). So no other fail screen changes.

**Evidence.**

| Run | Fail screen +0 / 150 / 600 / 1200 ms | After E (retry) | Second drive | Walk-up / banner +50…1450 ms | After Q |
|---|---|---|---|---|---|
| verifier 2 `pf` (before) | `normal`, in frame 22.7–24.8 m from the lens (a palm trunk over him at +150) | hidden | 14.88 s, clean | hidden | — |
| `OUT/pf_ctxlost` (after) | hidden (timer out at 17.4 m) | hidden | (context lost) | — | — |
| `OUT/pf2` (after) | hidden (timer out at 17.9 m) | hidden, car at (62, −62), yaw 0, Ole seated | 14.88 s, 0 impacts | hidden (parked at the door: out of the car, then the banner) | — |
| `OUT/pq` (after, `QUIT=1`) | hidden (timer out at 17.7 m) | — | — | — | `normal`, visible, not busy, (−178, −63), 2.24 m from `vikingbar`, runner `idle`, index 7 |

- Shots: `OUT/crop_fail_before_after.png` (the bar door at +600/+1200 ms: before, Angerud beside
  Carmencita; after, Carmencita alone), `OUT/sheet_fail_before_after.jpg` (full frames),
  `OUT/crop_quit.png` (fail screen hidden, then home at the door after Q).
- Outro lines after the retry (`OUT/pf2.log`): Stig 58 px, facing −0.02; Carmencita 49 px; Angerud
  52 px, 0.99 from his own line, as before.

**Timer.** None involved (the fail screen only; the drive and its route are untouched; both
drives 14.88 s against 19).

## Checks

| Check | Result |
|---|---|
| `node --check src/game/missions/runner.js` | ok |
| `pf2` (`FAILD=18`, E retry, the drive to the end, the outro), `OUT/pf2.log` | `failed once true`, `done #8 idle`, no errors |
| `pq` (`FAILD=18`, Q), `OUT/pq.log` | no errors |
| `kinds missions fullstory endcard` (`OUT/sc.log`; `kinds` covers checkpoint retries with `retryCar`) | no errors, **RESULT: PASS** |
| full `story` (`OUT/story.log`, 189 s) | `[t] done -> #13 idle`, no `scenario failed`, no errors, **RESULT: PASS** |

## Timers

None changed. The ledger and the fixture are untouched (no stage data changed).

## Follow-ups / known issues

- The disk is full (above): the next agents' harness runs need `TMPDIR` on `/dev/shm` (or space
  freed) or Chrome loses its WebGL context / the run dies on `ENOSPC`.
- After Q he is back at the door in view; that is his idle home and the give-up state (asnan to
  restart), as the brief asks.
