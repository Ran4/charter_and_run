# P1 G hand-off: island missions (DESIGN §8.6–8.13), island content, measured timers

Worktree `/home/ran/src/html/everything_and_run/.wt/charter-G`, branch `p1-G`, commit `b5e9c37` ("P1 G: …"). PORT 8867.

## Files changed (all owned)
- `src/game/missions/island.js`: the full mission sheets, plus `TIMERS`, `TUNING`, `withOppSpec` and `sturdyRam`.
- `src/content/island.js`: island content. CHATTER is extended and NAMED_CARS gains two mission cars.
- `tools/story/island.mjs`: the full story for M[5..12]. `SHOTS=1` also saves screenshots of the key scenes.
- `tools/scenarios/calibrate.mjs` (new): scenario `calibrate`, the headless autopilot and the timer table.

## Done
- **§8.6–8.13 in full.** Every line, speaker, tag, cue and stage literal is in. I checked that the string literals match `tools/fixtures/full-missions.js` exactly: no literal missing, none changed.
  - Factual traps checked against DESIGN and the research notes:
    - José's line is "Jag ska inte bort, jag ska hem."
    - "Momento." is the porter's line.
    - "Finns det svenskt kaffe…" is Fru Storch's line.
    - Ole does the haggling.
    - Berra tells Robban.
    - Tonga Tonga comes before "Bärra hem Berra".
    - The room-113 heart attack stays off-screen.
    - Every Ole line is in bokmål.
  - The fixes from the audit:
    - Ole's `gris` outfit sits on grisfest stage 5's `startCue`.
    - buss17 has `idleAnim: { berra: 'slump' }`.
    - grisfest carry is the P1 version. fataga is kept (P1).
- **Island content.**
  - HOMES, labels, COLLECTIBLES, UNLOCKS and outfits are as in §2.3, §10 and §11.6.
  - CHATTER gets about 25 more barks, all tagged. Film lines are `[F*]`, ours are `[N]`, and none are song lyrics.
  - NAMED_CARS gains `grisbilFollow: 'Grisbilen'` and `utflyktsbuss: 'Utflyktsbussen'`.
- **Timers are measured, per §8 "Timers and difficulty"** (table below).
  - `calibrate` drives the player's own car with an autopilot that sits in `car.ai`, so main.js steps it right after the input write. Conditions: PLAYER_BOOST 1.2, `&ts=1`, traffic on.
  - The autopilot follows lane lines with wider corner fillets than the lane path (R 9 m right, R 13 m left). It uses pure pursuit and a curvature/braking speed profile, and overtakes slow traffic on clear straights.
  - `smooth` mode keeps lateral acceleration ≤ 5.2 m/s² and braking ≤ 9 m/s². `fragile` mode counts impacts.
  - Other modes: a chase mode (road route, then ramming inside 35 m with back-off), a tail mode, and an on-foot mode (W+Shift through the input module, camera yaw steering, wall avoidance).
  - Each case enters its stage directly (runner `stageI` + `startStage`) with the player placed where a human would be.
- **Races, chases and follows are tuned tight.**
  - Night-bus race: a clean run wins by about 3 s, and one crash loses it.
  - Jeep: catchable only by ramming in a direct line.
  - Follows: cruise is 13–15 and the band is 14–55 m. The autopilot's tail stayed inside the band on all three routes.
- **Staging polish.** All of it is data in my file (see CONTRACT CHANGES 4).

## P1 left / cut
- Nothing cut. fataga (P1), the carry of Berra (P1) and every outfit cue are shipped.
- These run on the **stub world**, so Phase 2 must re-run `calibrate` on the merged world (§15.3 step 5):
  - Some drive legs leave the road into blocks: playa, vikingbar, tongatonga, the julafton guests, flamencoDrive.
  - The on-foot chases assume open ground.

## Self-checks (my final runs; PORT=8867, OUT=scratchpad/out-G)
- `for x in $(git ls-files '*.js' '*.mjs'); do node --check $x; done` → `node --check fails=0 count=59`. calibrate.mjs was checked separately and passes.
- `FROM=5 node tools/shot.mjs story` → `[t] done -> #13 idle stage 5  coins 5825` · `no errors` · `RESULT: PASS`
- `TO=5 node tools/shot.mjs story` → `[t] done -> #5 idle stage 3  coins 1750` · `no errors` · `RESULT: PASS`
- `node tools/shot.mjs calibrate` (full, about 16 min) → every `CAL CHECK … OK` except the jeep row (see the note below the timer table) · `RESULT: PASS`
- `node tools/shot.mjs missions api` → `missions` printed no data problems · api `[t] save {"v":1,"mission":6,…}` · `no errors` · `RESULT: PASS`
- `SHOTS=1 FROM=5 node tools/shot.mjs story` → `RESULT: PASS`. Screenshots are `isl_*.png`; contact sheets are `sheetA/B/C/D.png`.
- Ownership check: it prints only `node_modules`, the orchestrator's untracked symlink, which other packages also reported. None of my files are outside `G.txt`.

## Timers (`calibrate`, stub world)
| mission / stage | route | T_ref s | timer s |
|---|---|---|---|
| buss17 s2 busBay→flamencoDrive (ÅKSJUKA, stop; maxLat 3.4) | 7,1>6,1>5,1>4,1>3,1>3,2>3,3>3,4, 533 m | 47.5 (max of runs 43.3–47.5) | **60** |
| asnan s9 supermercado→vikingbar (SKICK, 0 impacts) | 4,2>4,3>3,3>2,3>1,3, 256 m | 14.1 | **20** |
| bodega s4 playa→vischan | 4,7>…>4,2>3,2>2,2>1,2>0,2, 666 m | 27.5 (runs 25.0–27.5) | **35** |
| bodega s9 wreck the Guardia jeep (cruise 20, damageScale 4) | chase from the farm gate in the grisbil | 34.7 (p90 of 9 non-wedged chases: 12–41 s) | **45** |
| bodega s10 wreck spot→flamencoBack | worst of 4 spots incl. far SE corner (270,277) | 24.3 | **30** |
| grisfest s1 five static flowers (on foot) | formula NN/8.8+1.5×5, p75 of 300 spawns (measured runs 9.7–18 s) | 23.0 | **30** |
| grisfest s3 night-bus race | 3,3>4,3>4,2>4,1>3,1>(-80,-200), 348 m | player 15.5–18.1 s | — (the bus finishes ≈ 3 s behind) |
| grisfest s4 ten plate stacks (on foot) | formula: NN 91 m/8.8 + 1.5×10 | 25.3 | **35** |
| grisfest s6 dance floor→car at the gate→tongatonga | walk 58 m, then 3,1>2,1>2,2>2,3 | 21.5–23.8 | **30** |
| julafton s1 patio→hyrbil→four guests | majsan>fruStorch>berra>herrStorch | 62.1 | **75** |
| friskotek s1 six fleeing beach balls (on foot) | measured chase, max run + 1.5 s × 6 | 23.2 | **30** |
| fataga s5 six fleeing sheep (on foot) | measured chase, max run + 1.5 s × 6 | 22.0 | **30** |
| follows: grisbil / José / bus (no timer) | each quarry's own route | 20.4 / 20.6 / 24.4 | — (tail 21–28 / 23–38 / 21–25 m) |

**Note on the jeep row.** In the final full run, one jeep run took 196.7 s for only 373 m. The autopilot wedged itself on a residential house at (-25,45) while the jeep drove round the block. That is an autopilot artefact, not part of the chase. I then changed calibrate.mjs to report such runs as "wedged, excluded" (average under 6 m/s). Only that reporting logic changed; I did not re-run calibrate afterwards.

## CONTRACT CHANGES (for the integrator; all are data in my files unless a patch is named)
1. **grisfest race route (§8.12 stage 3).** Changed from `start {lane [[3,3],[3,2]], t 14}`, checkpoints `[[3,2],[4,2],[4,1],[3,1]]` to `start {lane [[3,3],[4,3]], t 6}`, checkpoints `[[4,3],[4,2],[4,1],[3,1]]`, finish `{x:-80, z:-200}`.
   - New route: east behind Flamenco past Pepes Bodega, left up x 40, left along the farm road. About 350 m, two left turns.
   - **Why:** a 10.5 m bus cannot take the grid's right-turn lanes (radius 5.75 m against the bus's 11.4 m minimum turning radius). A probe showed it wedged on the far kerb at (-22,-127).
   - DESIGN §8.12 text and `tools/fixtures/full-missions.js` should follow.
2. **Race opponent spec.** The bus gets `TUNING.nattbuss = { cruise 26, spec { maxSpeed 31, accel 11, steer 0.9 } }` through the `withOppSpec` wrapper, which runs after the kind's init and sets a copy of `opp.spec`.
   - Proposed patch, `kinds/core.js` race init after spawning `opp`: `if (o.oppSpec) opp.spec = { ...opp.spec, ...o.oppSpec };`.
   - Engine note (E/frozen): AI buses on lane paths cannot make right turns at junctions. This affects the traffic `guagua` too. Suggest a larger turn radius for `spec.bus` in `LanePath` right turns, or bus `steer` ≈ 0.85.
3. **destroy (bodega stage 9).**
   - Adds `damageScale: 4` (the default is 1.5): about four solid rams wreck the jeep.
   - The `sturdyRam` wrapper halves the player's grisbil damage during this stage and restores it on cleanup. Without it, the borrowed truck (hp 130) was often wrecked before the jeep (hp 160).
   - Proposed kind option: `destroy.playerDamageScale`.
4. **Staging (data only; DESIGN §8 literals to update).**
   - buss17 outro: on the "havsutsikt" line the porter stands under the balcony facing the cut camera (`flamencoBalcony` 0.6, 1.2, yaw 0); on Ole's next line he goes back to the desk.
   - julafton party: the scene uses `cam` = a group shot from the pool deck. Every guest gets yaw 0, Stig is placed in the group, and the bodega cut returns to the group shot instead of `null`.
   - julafton room 113: the `place` tuples get yaw π, so the cast faces the in-room camera (C1's note).
   - grisfest Tonga scene: `frame: ['robban','stig']`, and Stig is placed at `tongatonga` (0.4, 5.2, yaw 0).
   - grisfest and bodega outros: at the pool cut, Stig is placed at the pool facing his partner. In grisfest, Majsan is re-placed with yaw π/2.
   - The last line's `cut: null` is dropped in the grisfest, bodega and ropavieja outros, so the pool cut holds to the end. Before, the camera snapped back to a scene the speakers had left.
   - julafton outro: `outroPlace` puts Majsan and Stig side by side, `outroCam: {at 'flamencoPool', dist 7, height 2.4}`, and Majsan's own line carries a wings cue.
   - Kept as in DESIGN: the grisfest porter outro offsets, which C1 verified. Angerud's head crowds that shot, so it is a framing candidate for Phase 3.
5. **Follow tuning.**
   - grisbil: cruise 15, maxDist 55.
   - José: cruise 13, minDist 14, maxDist 55.
   - Excursion bus: cruise 14, maxDist 55.
6. **Timers.** The `TIMERS` table replaces the §8 placeholder timers (table above).
7. `grisfestGate` stays on the north side of z −200, as Phase 0 left it. It works: the truck pulls across into the farm gate.
8. **Harness.**
   - New scenario `calibrate`. Env: `CAL=id,…`, `RACE_SWEEP='cruise:max:accel:steer;…'`, `RACE_RUNS`, `JEEP='cruise:damageScale'`, `JEEP_RUNS`, `FOOT_RUNS`, `RACE_CAR`.
   - Ids: buss17 asnan vischan jeep home flowers plates tonga race guests balls sheep follow (or follow-grisbil/-jose/-buss).
   - It imports `/src/game/missions/island.js` in the page to override `TIMERS`/`TUNING` while measuring.
   - The story script supports `SHOTS=1`.
9. Untouched note: `tools/fixtures/full-missions.js` (owner none) still has the DESIGN race route and the placeholder timers. It is a contract test, so `fullstory` still passes on it.

## Screenshots
`/tmp/claude-1000/-home-ran-src-html-everything-and-run-charter-and-run--sallskapsresan/25b591af-d9e9-4102-8669-08768ad2e553/scratchpad/out-G/`
- `isl_*.png`: the key scenes of every island mission.
- `sheetA.png` to `sheetD.png`: contact sheets.
- `probe_*.png`: race, jeep and walk probes.
- Logs: `calibrate_final.log`, `story_from5.log`, `story_to5.log`, `api.log`.

## Repair round 1 (commit `2e78a55` on `p1-G`)

### Files changed (all owned)
- `tools/scenarios/calibrate.mjs`: completion race fixed; fleeing chases measured without the per-target allowance; `FOOT_RUNS` default 3.
- `src/game/missions/island.js`: `TIMERS` only (friskotekBalls, fatagaSheep, bodegaHome, julaftonGuests, comments).
- `src/content/island.js`: one source tag.

### Done
- **Major: calibrate `tonga: arrived` false failure.** New `ap.check()` is the single completion test. It counts a stage change (or mission end) as done *before* anything tests for a lost car. It is used by the frame hook, by `waitDone`'s poll and by `ap.result()`. `tEnd = ap.t` is exact from either caller, because our `onFrame` hook advances `ap.t` before `missions.update` runs. The Tonga scene's `place: { stig }` → `exitCar(true)` in the completing update no longer reads as "car lost". `until: { npc }` legs also end on a stage change. `CAL=tonga` alone and the full run both pass (car stops at (-137.5,-60.5), drive 13.9 s).
- **Minor: fleeing-target timers.** §8 says "+1.5 s per target, *or* measured when targets flee", so the chase now uses the slowest measured run alone. Over all 8 calibration chases each (builder 3, reviewer 2, this round 3): balls max 14.9 s → **friskotekBalls 20** (was 30); sheep max 16.3 s → **fatagaSheep 25** (was 30).
- Worst-run timers from this round's full run (traffic variance): bodegaHome T_ref 26.2 s from (270,277) → **35** (was 30); julaftonGuests T_ref 65.5 s → **80** (was 75); bodegaVischan 28.7 s still fits 35.
- **Minor: bark tag.** `berra 'Vi tar första bästa.'` is now `[F*](t)`, because the notes give the exchange as "Robban och Berra" without naming the speaker.
- **Not changed (Phase 2/3, as the reviewer suggested):**
  - The jeep timer spread. This round's chases were 32.2 / 25.3 s, both inside 45. Phase 2 should re-check with ceil5(1.2 × p75) against a human median.
  - Scene framing. I tried a yaw of π for the hittegods man. It does not help: Stig occludes him from the intro's framing camera. I reverted it, so it still needs a Phase 3 cut cam or offset. The same goes for the grisfest porter outro and buss17 "Momento.".

### Updated timer table (supersedes the rows above where they differ)
| key | T_ref s (worst over all runs) | timer s |
|---|---|---|
| buss17Drive | 47.5 (this round 45.0) | 60 |
| friskotekBalls | 14.9 (8 measured chases, no per-target allowance) | **20** |
| asnanPaint | 14.1 | 20 |
| bodegaVischan | 28.7 | 35 |
| bodegaJeep | 34.7 (p90; this round 32.2 / 25.3) | 45 |
| bodegaHome | 26.2 (far SE corner) | **35** |
| fatagaSheep | 16.3 (8 measured chases) | **25** |
| grisfestFlowers | 23.0 (formula p75; this round 22.3) | 30 |
| grisfestPlates | 25.3 (formula) | 35 |
| grisfestTonga | 21.5 | 30 |
| julaftonGuests | 65.5 | **80** |
| race | player 18.3 s with 3 impacts, bus 1.0 s behind (clean runs about 3 s) | — |
| follows | grisbil / José / bus: tails stayed 21–28 / 22–30 / 21–25 m inside the bands | — |

### Self-checks (this round; PORT=8867, OUT=scratchpad/out-G)
- `node --check` over all 60 tracked .js/.mjs files: no failures.
- `CAL=tonga node tools/shot.mjs calibrate` → `CAL CHECK grisfestTonga: T_ref 21.4 -> 30 s; shipped 30 s OK` · `no errors` · `RESULT: PASS`
- `node tools/shot.mjs calibrate` (full; `calibrate_r1.log`) → every `CAL CHECK` is OK or `(tighter than suggested)`; the two tighter ones (bodegaHome, julaftonGuests) were then raised to 35 and 80 · `no errors` · `RESULT: PASS`
- `SHOTS=1 FROM=5 node tools/shot.mjs story` (`story_from5_r1.log`) → `[t] done -> #13 idle stage 5  coins 5800` · `no errors` · `RESULT: PASS`
  - This ran before two data-only edits: the TIMERS numbers (the story warps, so it does not read them) and the revert of the hittegods yaw (back to the committed text).
- `TO=5 node tools/shot.mjs story` (`story_to5_r1.log`) → `[t] done -> #5 idle stage 3  coins 1750` · `landed on the island` · `no errors` · `RESULT: PASS`
- `node tools/shot.mjs api` → `[t] save {"v":1,"mission":6,…}` · `no errors` · `RESULT: PASS`
- Ownership check → prints only `node_modules`, the orchestrator's untracked symlink. None of my files fall outside `G.txt`.

### CONTRACT CHANGES this round
- Contract change 6 (TIMERS): friskotekBalls 20, fatagaSheep 25, bodegaHome 35, julaftonGuests 80. The rest are unchanged.
- §8 "Timers and difficulty" wording: the fleeing-target rule is applied as "measured slowest chase, × 1.25, no per-target allowance". DESIGN could say so explicitly.
- Harness: `FOOT_RUNS` defaults to 3. `__ap.check()` is the new page-side completion test.
- Contract changes 1–5 and 7–9 above are unchanged.
