# Phase 0b hand-off: Charter & Run, all stage kinds, runner, placeholder missions (DESIGN §15.1 items 10, 11, 13)

Repo: `/home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan` (branch `main`, tag `phase0`, built on `phase0a`).
Port 8850. Screenshots: `/tmp/claude-1000/-home-ran-src-html-everything-and-run-charter-and-run--sallskapsresan/25b591af-d9e9-4102-8669-08768ad2e553/scratchpad/out-p0b`
(contact sheets `sheet_cabin.png` (every flight phase plus the night retry), `sheet_kinds.png` and `objbars.png` (haggle zone and marker, follow distance band, ÅKSJUKA bar), `sheet_final.png` (titles, transition, gate, cabin, trolley bowl)).

## Files changed (since `phase0a`)

- `src/game/missions/kinds/core.js`: all of getInCar goto pickup dropoff follow rabbits race destroy grab scene, plus the shared helpers (`COMMON`/`common`, `at`, `lineSecs`, `hideForMission`, `addRiders`/`removeRider`, `RadioSeq`, `Overhear`, `RideMeter`, route clearing).
- `src/game/missions/kinds/flight.js`: collect sit interact carry mantra timeline (stubs replaced).
- `src/game/missions/kinds/island.js`: haggle smash (stubs replaced).
- `src/game/missions/runner.js`: `cleanupMission` also resets `speedCap`, the player's pose flags and `hiddenBy`, and ends with `placeNpcs(true)`.
- `src/main.js`: `game.speedCap` (walk/sprint cap); no car prompt while carrying a person; cue `sfx`/`music` accept jingle and trad names; rider busts are tagged per character and `removeRiderOf(key)` runs from `placeNpc`/`showNpc`.
- `src/game/hud.js`: objective `zone`/`marker` were never visible (inline `display:''` fell back to the CSS `display:none`), so they now use `display:'block'`.
- `src/actors/pickups.js`: a `Rabbit` at distance 0 from the player no longer turns NaN.
- `src/strings.js`: `promptBid`.
- `src/game/missions/flight.js`, `island.js`: the placeholder missions (item 11).
- `tools/story/common.mjs` (helpers), `tools/story/flight.mjs`, `tools/story/island.mjs`: story scripts (§16.3).
- `tools/lib.mjs`: `missionDataProblems` (in-page mission data checker); `tools/scenarios/core.mjs`: `missions` uses it.
- New: `tools/fixtures/full-missions.js` (the 13 §8 missions transcribed literally), `tools/scenarios/kinds.mjs` (`fullstory`, `kinds`).
- `DESIGN.md`: the §9.2 rows and behaviour notes, §9.3, §14.1, §14.3 and §16.4 entries, and a "Changelog (Phase 0b)" section.

## Done

- **Item 10, the kinds.** All 18 kinds are implemented with every §9.2 option and default, and every kind keeps its §9.2 test fields. Round-1 fixes:
  - Every factory copies `startCue`/`timedCues`/`doneCue` (and the rest of `COMMON`) from the fixed key list and keeps `stage.o`.
  - Kind cues: `useCue` (interact), `fillCue` (mantra; its `phase` is applied only while the cabin is still in the start phase), `events` (timeline).
  - `lockSeat`: no "Res dig" and R is ignored, both via `stage.lockSeat`.
  - `goto`: `awaitOverhear`, overhear anchors (an absent, hidden or far speaker talks from the landmark), `radio: true` overhears, and per-line radio `{gap, ...cue}`.
  - `follow`: the route ends at `to` (no `nearestNode`). It also has `minDist`/`minGrace`/`minText` with a green band on the bar, `passenger`, `riders`, `hideRiders` and lane `start`.
  - `race`: lateral offsets, `playerPassenger`, `oppPassenger`, `radio`.
  - `haggle`: played on foot, with a priority-100 bid ('<b>E</b> Bjud!'). In test mode zones are 0.6 and speeds ×0.5.
  - `scene` exit rules: with `place` or `exitCar` the player leaves the car; with `frame` only, characters stay seated.
  - `smooth` (ÅKSJUKA) and `fragile` (SKICK) follow the §9.2 formulas; teleports never count.
  - `destroy`: `noExplode` leaves a steaming wreck and two officers step out shaking their fists; the default spawn is 70–130 m away.
  - `collect` roll motion: aisle clamp, reflection at +12.5/−16, ±1.5 m/s per `onJolt`.
  - `carry`: `bumped`/`fall`/`sprintSecs` failures and `walkSpeed`.
  - `mantra`: `mantraMode`, `duet`, `waitPhase`. `smash`: `reviveProps` at init.
- **Item 10, the runner (§9.4).** All of it was already present from 0a and is verified here: cost, banner, checkpoints, a retry that re-applies the ambient cue fields with the phase always instant, `retryAt`, the outro placement rule, the transition after index 4, `placeNpcs(true)` after idle, `onEnd` + `restoreAmbience`, `onBusted`/`onPanic`.
- **Item 10, `game.cue`.** Every §9.3 / Appendix A field is handled. `sfx` and `music` also take trad names (→ `audio.trad`) and jingle names (→ `audio.jingle`, needed for julafton's `sfx: 'pryl'`).
- **Item 11.** Each placeholder mission has the final id, title, level, giver, at, reward, cost and unlock, 1–2 source-tagged intro/outro lines, and 1–4 stages that exercise its main kind exactly as item 11 lists (the stage literals are taken from §8). `tools/story/{flight,island}.mjs` drive them per §16.3.
- **Extra verification (not required by item 13).**
  - `fullstory` swaps the literal §8 missions into `MISSIONS` at runtime and plays all 13 (complete stage lists, every line and cue) to `#13 idle` with `RESULT: PASS`. It runs on the stub world.
  - `kinds` checks the options the story never fails on: fixture data checks, the haggle bid outranking a car, haggle maxMiss failing, follow minDist failing, smooth/fragile bars, carry spill, a checkpoint retry (night, plates revived, `dansgolv`, abort back to day), destroy default spawn, grab at a wreck, and scene `exitCar`.
- **Item 13.** All exit criteria pass in my final runs (below). Committed and tagged `phase0`.

## §8 completeness checklist (every literal in §8.1–8.13 against the frozen code)

Every item below is implemented and was exercised end to end by `fullstory` on the literal fixture. Items marked (k) are also checked by `kinds`.

| mission | kinds and options used | cue fields and helpers used |
|---|---|---|
| 8.1 gate | interact (at lm, radius, prompt, startCue phase instant, useCue, lines) · goto (startCue place; fearRate, timer, failText, radio with gap + fear cue; radio pa gap, overhear r 8, awaitOverhear) · scene (frame; place + frame) · mantra (at, radius, secs, barLabel) | fear, sfx beep/laugh, flash, anim (shoeOff), place (in a line), outfit (outro), outroPlace |
| 8.2 ombord | sit (seat, timer, failText, startCue phase+seatbelt+blockers, doneCue blockers) · timeline (seat, lockSeat (k), panicFails, oleBarks, secs, barLabel, events) | phase string, toast, sfx thud, fear, shake, say, applause, relieve, seatbelt false, outroCam 'player' |
| 8.3 juice | interact (call14 whileSeated + seat + useCue + lines; function at + enabled + checkpoint + startCue trolley) · carry (item juice, failOn bumped/sprintSecs, startCue turbulence with delay (k)) · sit (doneCue) | pa, applause, sfx pling, anim cupUp/laugh, relieve, sfx pickup; cabin.trolleyEnd / trolleyStopped |
| 8.4 sprit | collect (kind flaska, motion roll, items, radius, timer, barLabel, failText, startCue phase+trolley, timedCues radio+pa / turbulence) · goto | music {tune, secs}; cabin.onJolt |
| 8.5 landning | collect (who, standAt, seatOnTouch, lines with an anim cue, timedCues) · sit · mantra (seated, secs, panicFails, startCue phase hold + turbulence, fillCue phase, waitPhase) | pa + seatbelt, applause; transitionTo('island') |
| 8.6 buss17 | getInCar (car, any:false, passenger, riders, hideRiders, lockMeter) · goto (inCar, passenger, stop, timer, smooth (k), radio gaps) | anim slump (intro), cut lm / null, anim mirror, outfit + flash white + sfx helanGar (trad), outroPlace with stig |
| 8.7 friskotek | rabbits (mesh, count 6, near, rMin, rMax, timer, gotText, radio) · goto | anim oath, applause, toast |
| 8.8 asnan | getInCar · pickup (hello) · goto passenger · haggle (all options; misses (k)) · grab (at, mesh asna/knacke, say) · scene (frame only, in the car, cut cues, doneCue flash + toast) · goto fragile (k) · goto onFoot | cut, toast |
| 8.9 bodega | pickup (rider) · goto (radio, doneCue radio; overhear radio:true) · dropoff (riderOff) · scene (doneCue toast) · follow (grisbil, riders + hideRiders, lane start, via, kerbside to, wobble, radio) · getInCar (missionCar, passenger, rider, say) · destroy (lane spawn, noExplode, lockMeter, barLabel) · goto (timer) | cut, toast, place in a line, sfx slap; unlock grisbil |
| 8.10 ropavieja | follow (color, passenger, riders, minDist (k), minGrace, minText, cruise) · goto onFoot | outroCam [a, b], cut, place + toast + cut in one line |
| 8.11 fataga | pickup (rider) · follow (bus, driver affe) · scene (place 4 + frame; a placed rider leaves its bust) · rabbits faar | sfx baa |
| 8.12 grisfest | rabbits (flee:false, radio) · getInCar (startCue sky + music) · race (all options; checkpoint) · smash (count 10, onFoot, lockMeter, radio, checkpoint, retryAt; retry (k)) · scene (place, frame, checkpoint, retryAt, anim on several who) · goto (timer) · scene (anim option, music cue) · pickup (rider) · carry (who, walkSpeed, failOn fall) | cost 800 (Ole pays), onEnd banner/day/sol, outfit (ole gris), anim dance ×2 + applause, cut chain, anim wings |
| 8.13 julafton | collect (who, findAt, sendTo, inCar, radius, carRadius, timer, lines) · goto (startCue music jul + outfit lasse) · scene (place 8; music trad + applause; cut; sparkle + sfx pryl (jingle)) · scene (cam {at, dist, height}, place incl. stadare, hide) · mantra (duet, at, radius, startCue sky sunset + place + say) | sfx knock, place, toast, coins −25, pa, sfx doorSlam/ambulance, flash white, hide, endCard; cost 100, unlock bodega |

Cue fields used anywhere in §8, all handled in `game.cue`: say radio pa sfx fear relieve shake applause phase seatbelt turbulence trolley blockers outfit music sky place hide show anim coins pay flash banner toast cut unlock sparkle endCard.

## P1 left / cut / not my scope

- Nothing from items 10, 11 or 13 is left open.
- Not Phase-0 scope, unchanged from 0a: all visuals, real SFX and tunes (`audio.trad` is still a no-op, H), the officer's `routeAim` steering and hideouts (H), the Rio cinematic (Phase 2), timer calibration (F/G, Phase 2).

## Self-checks (my final runs)

- `for f in $(find src tools -name '*.js' -o -name '*.mjs'); do node --check "$f"; done` → `checked 59 files, 0 failures`
- `PORT=8850 OUT=<out-p0b> node tools/shot.mjs story` → `[t] done -> #13 idle stage 3  coins 7600` · `no errors` · `RESULT: PASS` (exit 0; no `scenario failed`)
- `PORT=8850 OUT=<out-p0b> node tools/shot.mjs missions title views transition cabin levels api`:
  - missions 0–12 boot in their level with the giver at `at`; `ombord seats {"ole":"14A","majsan":"16E"}`; data checks clean.
  - `title level flight` / `title level island`; `transition {"level":"island","dp":2,"dl":0}`; the cabin walls hold, with one shot per phase (looked at).
  - api: `panic idle {"coins":50,"v":40}`, `bust {"coins":1600,"frozen":true}`.
  - `no errors` · `RESULT: PASS` (exit 0).
- `PORT=8850 OUT=<out-p0b> node tools/shot.mjs fullstory` (all 13 literal §8 missions) → `[t] done -> #13 idle stage 5  coins 7650` · `no errors` · `RESULT: PASS`
- `PORT=8850 OUT=<out-p0b> node tools/shot.mjs kinds` → `retry {"i":3,"sky":"night","alive":12,"n":12,"d":1.5}`, `destroy spawn distance 117` · `no errors` · `RESULT: PASS`

## CONTRACT CHANGES (all written into DESIGN.md: §9.2 rows and behaviour notes, §9.3, §14.1, §14.3, §16.4, "Changelog (Phase 0b)")

1. `pickup.rider`: the rider NPC is hidden while it rides as a bust (implicit). `hideRiders` hides it already at init.
2. `follow.riders` busts are removed when the stage ends. `hideRiders` keeps the NPCs hidden until a later stage seats or places them, or the mission ends; §9.2 used to say "for the stage", but bodega stage 8 needs Robban still hidden.
3. `collect.carRadius` defaults to 4. `inCar: true` means touching from a car counts; `inCar: false` shows "Kliv ur bilen!".
4. `mantra.radius` defaults to 2.2.
5. Behaviour notes added:
   - haggle staging: the seller is placed at `at` (0, 1.2); the partner steps out beside the stall; start/hit/win are framed dialogues that pause the marker; miss plays as bubbles.
   - `smash.onFoot`: breaks from a car are revived and don't count.
   - `destroy.noExplode` crew; `carry.who` lift once on foot plus `speedCap`.
   - `getInCar`: locked named cars are unlocked for the mission; `missionCar` handover; with `any: true` the passenger moves into the player's chosen car.
   - `dropoff`: the player must fetch a left-behind passenger first, instead of Bigmouth's instant 'done'.
   - `follow`/`race`: abandoned cars are cleared off the route at init (fixes a real stall where the fataga bus waited behind the car left on the road in bodega).
   - Rider busts never double a character: `placeNpc`/`showNpc` remove that key's bust.
6. Game API: `game.removeRiderOf(key)` and `game.speedCap` (§14.3).
7. Cues: `sfx`/`music` accept trad names (→ `audio.trad`) and `sfx` accepts jingle names (→ `audio.jingle`) (§9.3).
8. `S.promptBid = '<b>E</b> Bjud!'` (strings.js, H owns it afterwards).
9. Runner: `cleanupMission()` ends with `placeNpcs(true)` (fail, abort and complete).
10. Harness:
    - `missionDataProblems` (tools/lib.mjs) checks every character key and landmark in def fields, stage options, lines and all cue fields, plus seat ids and the `retryAt` rule. The `missions` scenario uses it.
    - `tools/story/common.mjs` gains helpers: `untilStage warpLm footAt carBeside touchAll followCar breakAll raceCheckpoints haggleWin`. `followCar` prints diagnostics with `DEBUG_FOLLOW=1`.
    - New owner-none files: `tools/fixtures/full-missions.js` and `tools/scenarios/kinds.mjs` (scenarios `fullstory`, `kinds`).
11. Fixes outside the kinds files: hud.js objective zone/marker visibility (H owns it afterwards); pickups.js Rabbit NaN at distance 0 (E owns it afterwards).

## Notes for the next agents

- **F and G can start from `tools/fixtures/full-missions.js`.** It already holds every §8 literal working against the frozen kinds; `fullstory`'s `M_FULL` in `tools/scenarios/kinds.mjs` is a working §16.3 story for the full sheets. Copy into your owned files: `src/game/missions/*.js` and `tools/story/*.mjs`.
- One staging choice in the fixture: juice stage 2's row-6 complaints are `timedCues` with `say` cues.
- **Keep `fullstory` green from Phase 2 on.** If F/G change §8 data, the fixture can lag behind; it is a contract test, not the shipped content.
- **Timers and ticks.** Stage timers are unscaled seconds. `timeline`, `mantra` and `fearRate` scale by `g.timeScale` (3 in `?test=1`). The runner's `timedCues` run on scaled stage time.
- **The haggle bar pauses during dialogue.** Story scripts wait for `stage.inZone` and should keep a margin from the zone edges (see `haggleWin`).
- **AI route stalls.** Route AI waits behind obstacles, and only `follow`/`race` clear abandoned cars at init. A car the player leaves in the road *during* a follow can still block it. If a Phase-1 test stalls, check `DEBUG_FOLLOW=1` output (`ob`, `near`).
- **Unchanged from 0a:** `grisfestGate` is on the north side of the z = −200 road (§6 note).

---

# Phase 0 review fixes, round 1 (commit 1876234, tag `phase0` moved)

## Files changed
- `src/main.js` (frozen after this round), `src/game/shame.js` (WP-H), `src/world/cabin.js` (WP-A1: one additive getter), `DESIGN.md`.

## Done (all six findings were real; each one was reproduced and then fixed at the root)
1. **Outfits stuck after mission 0, and cue outfits never reverting** (blocker, game-api). `placeNpcs(force)` now calls `applyOutfits()` when `force` is set and the runner is not in `outro`. As a result:
   - The gate→flight set follows `missions.index` without a level change.
   - A cue outfit (Ole `gris`, Lasse `jul`) stays on through its mission's outro and reverts when the runner goes idle, fails or aborts.
   - A checkpoint retry re-applies `startCue`/`doneCue` outfits through AMBIENT.
   - Probe: after playing M0 → `{"idx":1,"ole":"flyg","berra":"flyg","stig":"kostym"}`. Cue `gris`, then abort → `afterAbort: "flyg"`.
2. **R reset** (major). The R branch returns early while `frozenT > 0` or `shame.panicT > 0`. While `carrying` it sets `bumpedT = 0.4` before teleporting, so the carry kind fails or spills on its next update.
   - Probe: juice carry + R → `failed stage 2` (it used to complete instantly).
   - Probe: frozen + R → position unchanged.
3. **Samba unlock unreachable** (major). Added to main.js:
   - `game.islandTune` ('sol' | 'samba').
   - `game.levelTune()`, now used by `setLevel`, `start`, `restoreAmbience` and `shame.endPursuit`.
   - `game.setIslandTune(name)`: switches now only if the island's ambient tune is playing, never over `skandal` or a mission music cue.
   - `game.musicLabel()` and `game.cycleMusic()`: the pause button cycles på → samba (once `unlocked.has('samba')`) → av → på. The label is refreshed when the pause menu opens.
   - Save writes `tune: islandTune`. Load reads it (samba only if unlocked).
   - Probe: labels på/av/på/samba/av/på, save `samba` then `sol`. A reload with a samba save → `islandTune: samba`, label `Musik: samba`.
4. **Player `wings` cue pose overwritten every fixed step** (blocker). fixedStep now tracks `mantraPose`/`holdPose`/`flailPose` and clears only the flags it set itself.
   - Probe: in dialogue `{"stig":true,"majsan":true}`. After the cue's 3 s → false.
   - Probe: mantra held → wings true. Released → false.
5. **main.js read the private `cabin._turb`** (major). Added the `cabin.turbulent` getter: true from the warning until the shaking ends, per §5.7 (so not during `delay` or the 3 s tail). main.js uses it for the hold prompt. Added to §14.7.
   - Probe timeline: `0T 1T×8 0T×5 0-…`, so the getter is narrower than `_turb`, as intended.
6. **Bust from a car ram left the officer at a stale spot with no bubble** (major). `busted()` now:
   - calls `endPursuit(true)` first;
   - then runs `ensureOfficer()` at 1.1 m in front of the player (or `freeSpot(p, 1, 2)` if that spot is blocked or out of bounds), faces him at the player, calls `o.sync(0)` and has him say `bustLine`;
   - sets `officerLinger`. The on-foot path goes through the same code, so the root is synced there too.
   - Probe: `rootDist 1.10`, bubbles `["¡Documentación!"]`. The officer is hidden again after the linger. Screenshot: `out-fix1/bust_from_car.png`.

## P1 left / cut
- Nothing cut. The pause-menu UI styling for the samba state belongs to WP-H. The Game API is in place.
- A note for F/G (now in DESIGN §10.4): put a mid-mission NPC outfit on a stage `startCue`, not on a dialogue line, so a checkpoint retry re-applies it.

## Self-check (PORT=8850, OUT=scratchpad/out-fix1)
- `node --check` on all 59 tracked .js/.mjs files → `node --check fails=0 count=59`
- `node tools/shot.mjs story` → `[t] done -> #13 idle stage 3  coins 7600` / `no errors` / `RESULT: PASS` (0 "scenario failed")
- `node tools/shot.mjs missions title views transition start walk aerial drive` → `saved drive_3` / `no errors` / `RESULT: PASS`
- Fix probes: `scratchpad/out-fix1/probe.mjs` and `probe2.mjs` → `no errors`

## CONTRACT CHANGES (DESIGN.md edited to match)
- §3 controls, `reset` row: R is ignored while `frozenT > 0` or during PANIK. While `carrying` it sets `bumpedT = 0.4` first.
- §9.3 `anim` cue: works on the player too. fixedStep clears only the poses it set itself.
- §10.4: `placeNpcs(true)` re-applies `levelDef.outfits(g)` except during `outro`. Cue outfits revert at mission end. Put NPC cue outfits on a stage `startCue`.
- §14.3 Game API: new `levelTune()`, `islandTune`, `setIslandTune(name)`, `cycleMusic()`, `musicLabel()`. `placeNpcs(force)` now also applies outfits. `frozenT` also blocks R.
- §14.7 cabin: new getter `turbulent -> bool` (A1 must keep it). main.js no longer reads `_turb`.

## Screenshots
`/tmp/claude-1000/-home-ran-src-html-everything-and-run-charter-and-run--sallskapsresan/25b591af-d9e9-4102-8669-08768ad2e553/scratchpad/out-fix1/` (`sheet_fix1.png` = bust_from_car, walk_hold, walk_mantra, transition, start, drive_2)
