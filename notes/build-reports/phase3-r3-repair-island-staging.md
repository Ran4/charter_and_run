# Phase 3 · round 3 · post-gate repair `repair-island-staging`

Start HEAD `e458d7e`, clean tree, branch `main`. Port 8870. Probes, logs and shots are in
`<scratchpad>/out-p3-r3-repair-island-staging/` (below: `OUT/…`). The probes are copies of:
- the island-staging verifier's `vcands.mjs` and `vscen.mjs`. Its `viking` part gained a `RETRY=1` branch, which fails the paint drive, retries it and logs Angerud's state.
- the staging critic's line audit (`audit.mjs`, `compare.mjs`).

The before measurements are the verifier's, on `ea6c96a` (`out-p3-r3-verify-island-staging/`: `a1`, `vk1`, `vk2`). Only flight code changed between that commit and the start HEAD.

## Items

### RS-1 · ugly (r3staging-2 partial) · fixed

**Verified.** Angerud's island home is `['vikingbar', 2.0, 1.0]`, 1.1 m from Stig's outro spot.
- A `hide` cue (`hideNpc`) is not `hiddenBy: 'mission'`. In `complete()`, both `cleanupMission()` and the next `placeNpcs(true)` show every NPC with a home again. Both run before the 1.6 s banner wait.
- So the first outro line's `hide` came after the banner, and the walk-up had no hide at all.
- The verifier's `vk2` shows him on screen during the walk (10.7 m from the lens) and beside Stig and Carmencita under UPPDRAG KLART!.

**Fix.** It has two parts, plus a data check.
1. **The walk-up.** The paint drive, stage 9, is the checkpoint. It now has `startCue: { hide: ['angerud'] }`.
   - I chose stage 9 rather than the critic's stage 10. At stage 10's start the car is parked within 7 m of the bar, facing it, so he would vanish in view.
   - At stage 9's start he is hidden in the Centro Nórdico lot, three blocks away.
   - A retry from this checkpoint runs `startStage`, which hides him again. On the fail screen `fail()` puts everyone home.
2. **The banner.** A new def field `outroHide: [key]` (runner.js `complete()`): its keys are hidden right after `complete()`'s `placeNpcs(true)`, in the same frame.
   - asnan sets `outroHide: ['angerud']`.
   - His own line's `place` shows him again, and the idle `placeNpcs(true)` after the outro sends him home.
   - The first outro line's `hide` is removed, since the field covers it.
3. **The data check.** `missionDataProblems` resolves `outroHide` keys.

**Evidence.** The probe ran at ts 1 and logged Angerud's state at each step.

| Run | Park | Drive start | Fail screen | After retry | Walk (2 samples) | Arrival | Banner |
|---|---|---|---|---|---|---|---|
| `OUT/vk1` | 0,6 (the verifier's vk1) | hidden | (no fail) | (no fail) | hidden | hidden | hidden |
| `OUT/vk2` | −6,4 (the verifier's vk2) | hidden | normal | hidden | hidden | hidden | hidden |

- **Shots:** `OUT/sheet_viking_after.jpg` shows the walk and the banner for both parks with no Angerud. Compare the verifier's `sheet_viking.jpg`, where he stands right of Stig.
- **Outro lines:** unchanged in both runs and in the audit. Stig is 58 px, facing −0.06. Angerud is 51 px, facing 0.99, and appears on his own line (`OUT/story/isl_asnan_vikingbar.png`).

**Timer.** No change. He stood 2.2 m from `vikingbar` and the drive ends at 7 m, so the car can never reach him during the timed stage. I checked anyway with `CAL=asnan RUNS=3 calibrate`:
- runs of 15.5, 18.2 and 15.5 s;
- T_ref 15.5 → 19, as shipped;
- the car ends 7.6 m from his home spot;
- **RESULT: PASS** (`OUT/cal.log`).

**Other users of Angerud then.** I found none:
- no bark or stage of asnan needs him;
- the next mission (bodega) starts from the idle `placeNpcs(true)`, which shows him at home;
- the retry is covered above.

### RS-2 · ugly (regression from 08c1104's parasol canopy) · fixed

**Verified.** The verifier's audit on HEAD has the porter's party line at OCC 3/5 (`world:Mesh`, the parasol canopy edge across his face).

**Fix.** In julafton's party `place`, the porter moves to `['flamencoPool', -6, 0.5, -PI / 4]` (was −7). This is in island.js, the fixture (§8.13 stage 3) and DESIGN.
- The party is an untimed `scene`.
- The porter is not a target of the timed `collect` (julaftonGuests) or on its route.
- He keeps the spot through room 113 and the mantra. The outro's `placeNpcs(true)` sends him home.
- So no timer is involved.

**Evidence.** The line audit after the fix gives 35 px, facing 0.95, x 1015, no occluder and nothing near the lens (`OUT/a1/lines/m12_132_portier.jpg`).
- He stands left of the parasol, beside the Christmas tree, with his face clear.
- Before/after sheet: `OUT/sheet_portier_before_after.jpg`. The story's party shot is `OUT/story/isl_julafton_party.png`.

## Checks

| Check | Result |
|---|---|
| `node --check` on island.js, runner.js, tools/lib.mjs, the fixture | ok |
| Line audit, missions 7–12 (`OUT/a1`, 148 lines, `done -> #13 idle`, no errors) against the verifier's `a1` (`OUT/compare_before_after.txt`) | **WORSE: none**. BETTER: the porter's line (−4.0) and the two paint lines (only their off-screen speakers' measurement varies). No new BACK, NEAR or OCC flag. |
| `missions fullstory kinds endcard` (`OUT/sc.log`) | no errors, **RESULT: PASS** |
| `CAL=asnan RUNS=3 calibrate` (`OUT/cal.log`) | T_ref 15.5 → 19 as shipped, **RESULT: PASS** |
| `SHOTS=1 story`, full (`OUT/story.log`) | `[t] done -> #13 idle`, no `scenario failed`, no errors, **RESULT: PASS** |

## Timers

None changed. The ledger is untouched (asnanPaint is a fixed-route drive, not a pool).

## Follow-ups / known issues

These are not new and were left as they are:
- The paint scene's two lines play over the FERRETERÍA cut with both speakers off screen, by design (§8.8 stage 8). The audit lists them as its worst lines.
- The paint scene's `doneCue` toast ("Åsnan är nu en dalahäst. Nästan.") is still up during the walk-up in the probe at ts 1. That is a probe artefact: the debug warps skip the 15 s drive.
- Other outros that hide someone on a later line (e.g. the reception outro's `hide: ['siv']`) are mid-outro hides and are not affected. `outroHide` is there if a banner-wait leak like asnan's turns up elsewhere.
