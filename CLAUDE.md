# Charter & Run

*Sällskapsresan* (1980) × Simpsons Hit & Run, in plain three.js ES modules (no build step), built
on the Bigmouth & Run engine. Two levels, 13 missions. `DESIGN.md` is the design bible and the
module contracts: it wins over `notes/`, and every change to a contract, a literal or a timer
goes into it (plus a line in its changelog). README.md has the player-facing overview (Swedish)
and the code map.

**Build status: Phases 0–3 are done (tag `phase3`).** Phase 3 was the QA loop: three rounds of
critics, serial fixers, gates and (round 3) adversarial verifiers and repairs (tags `phase3-r1`,
`phase3-r2`, `phase3`). `HANDOFF.md` is the hand-off for whoever continues: the state at `phase3`,
the binding user decisions (player car ×1.2, tight measured timers), the workflow lessons, the
**known issues** (§4) and the gotchas. Read it before changing anything. Every fixer's report is in
`notes/build-reports/` (Phase 3: `phase3-r{1,2,3}-<group>.md`); DESIGN's "Changelog (Phase 3)"
opens with a summary of the rounds and the timer changes.

## Running and checking changes

- The game is on port **8840** (`make run` / `npm start`). The user starts it themselves: never
  run `make run` or `npm start`, never open a browser or window.
- Verify headlessly: `PORT=<port> OUT=<dir> node tools/shot.mjs <scenarios>` (serves the game
  itself, headless Chrome on the real GPU; default port **8841**, screenshots in `out/`). It
  prints `RESULT: PASS` or `RESULT: FAIL (reasons)` and exits non-zero on FAIL. One run at a
  time when RAM is tight (`free -g`; wait under 4 GB available) and check the disk (`df -h /`, it
  holds /tmp): a full disk shows as WebGL shader errors, `ERR_INSUFFICIENT_RESOURCES` or `ENOSPC`
  (`TMPDIR=/dev/shm` and an OUT there work round it; re-run before calling a FAIL a regression).
  `montage a.png b.png … -tile 3x3 -geometry 640x360+4+4 sheet.png` makes contact sheets; look at
  the shots with the Read tool.
- `story` plays every mission via debug warps and must end with `[t] done -> #13 idle`, no
  `scenario failed`, `no errors` and **`RESULT: PASS`** (the story prints `no errors` even after
  a failure; only the RESULT line counts). Run it after touching missions, stage kinds, drivers,
  seating, the cabin or the car/character physics. A clean run takes about 190 s.
  `FROM=n TO=m` plays mission indices n..m-1; `SHOTS=1` saves key-scene shots.
- Scenarios (`node tools/shot.mjs` lists them; names are unique across `tools/scenarios/*.mjs`):
  - core: `start walk aerial drive traffic title talk missions views transition levels api story`
  - flight [cabin]: `gate cabin trolley turbulence panic flightshots`
  - scenery: `phases sceneryPeek flightseq dc8`
  - island: `smash foot propsheet riocard endcard islandstats islandtour`
  - cast: `castsheet cars heads` · meter/UI: `ui skandal carbust` (`carbust`: SKANDAL's gain and
    delay and the in-car bust rules, DESIGN §7.2) · `perf` (fails below 45 fps)
  - free roam: `pintura dalasheet` (the paint shop at Gasolina, DESIGN §7.2), `berra` (Bärra hem
    Berra after the grisfest, DESIGN §10.6), `glide` (Jag kan flyga, the glide after julafton,
    DESIGN §10.7), `simhopp` (Siv och Majsan sätter poäng, the diving judges at Flamenco's pool,
    DESIGN §10.8), `tuta` (Tutan som folk reagerar på, the horn in free roam, DESIGN §10.9),
    `dygn dygnGiver` (Dygnet runt, the island's clock, Ole's watch and the nap in room 107, DESIGN
    §10.10; the clock holds at 15:00 in test mode unless a test sets `__game.day.run`), `super8
    filmkvall` (Lite film., Herr Storch filming the tricks, his viewfinder, the stills and the film
    night after the end, DESIGN §10.11), `eslov eslovlopp` (Heja Eslöv!, the rollerskier training
    on the Eslöv lane, his answer to the horn and Eslövloppet round the tomato fields, DESIGN
    §10.12; `eslovlopp` measures the race's timer with calibrate's walker, `ESLOV_RUNS`), `grodorna
    grodtakt` (Små grodorna i poolen, the pool fest after the end: the ring in Flamenco's shallow end,
    the porter, Stig in the ring and the hop counter, DESIGN §10.13), `artig` (Förlåt, förlåt!,
    Stig's sorry after a kick, a knock-down, a broken thing or a carjacking, and the driver's "Nej.",
    DESIGN §10.14), `grisar` (Grisarna ramlar av grisbilen, the unlocked grisbil's pigs tumbling off,
    the catch on foot and by creeping, Lasse's refusal and the delivery to the farm's pen, DESIGN
    §10.15)
  - `fullstory kinds` (the literal DESIGN §8 missions in `tools/fixtures/full-missions.js`, and
    stage-kind checks; keep the fixture in step with §8)
  - `calibrate calibflight` (slow timer and FLYGRÄDSLA calibration; env vars in DESIGN §16.4)
- Test mode is `?test=1` (no title, no pointer lock, dialogue auto-advances, `timeScale` 3,
  `&ts=n` overrides). `?fresh` skips the save, `?mission=N` starts at index N (0–12).
  `window.__game`, `__lm(name)`, `__props`, `__missions()`, `__stats()` are exposed.

## Conventions that bite

- Yaw: forward = (sin yaw, cos yaw), matching three's `rotation.y` on +Z-facing models.
  Right = (-cos yaw, sin yaw) = local -X. Positive steer turns right, which *decreases* yaw.
  Drivers sit on the car's left (+X local).
- Everything off the asphalt is at `CURB` (0.15). Solids are footprints with a top height:
  a wall if `top > y + step`, a floor otherwise (characters step 0.45, cars 0.6). Ramps are
  oriented boxes whose top rises along their yaw. Camera ceilings (`collision.ceiling`,
  `Frame.ceiling`) keep the chase eye under pergolas and canopies: they count by the sight line
  from the pivot, prop ceilings (parasols) are `underOnly`, and under a low ceiling the on-foot eye
  slides sideways (`cam.slide`: hold, swap as a cut, wedge; DESIGN §14.5). Camera changes are
  judged with sweep probes, not single shots; the remaining camera residue is a known issue.
- Static geometry goes through `GeoBuilder` (vertex colours, merged per block) and gets an
  inverted-hull outline from `toonMesh`. Keep new materials to a minimum.
- `teleport`/`place` snap to ground-level floors only (`groundAt(x, z, 0.2, 0.6)`), never
  roofs; landmarks must not sit inside a building footprint. Island landmarks live in one table,
  `src/world/landmarks-island.js` (block builders don't override them).
- The module `fx` (particles) is easy to shadow with a local `const fx = Math.sin(...)`.
  car.js imports it as `FX` for that reason.
- One-shot inputs (jump, kick, E) are handled once per frame in `handleOneShots`, continuous
  ones in `fixedStep` (60 Hz). `input.pressed` stays true for the whole frame.
- **Levels are configurations, not scenes** (`src/level.js`, DESIGN §4). One static world:
  the island grid around the origin and the gate set + DC-8 cabin at **x = 3000**
  (`CABIN_X`, local lx = x − 3000). `setLevel` switches spawn, camera profile, meter mode
  (FLYGRÄDSLA `panic` / SKANDAL `pursuit`), palettes and `sim` flags (no traffic or peds in the
  flight level). Town helpers (`freeSpot` with its ±309 bounds, R reset, `routeAim`, pursuit)
  are branched per level (§4.3); new code at x = 3000 must not call them directly. The cabin is
  stationary; `flightScenery.js` moves the outside past it and is the only writer of the airframe
  pitch.
- **The player's car runs at `PLAYER_BOOST` 1.2** (car.js), not Bigmouth's ×2. AI cars never
  get it; a race opponent that must keep up gets a spec through `race.oppSpec`.
- **Timers are tight and measured** (DESIGN §8 "Timers and difficulty", a binding user rule): a
  clean run on a sensible route keeps about 15–20 % of the time. Drives: ceil(1.2 × T_ref), on
  foot: ceil(1.25 × T_ref) (+0.5 s per target), random stages at the 75th percentile, rounded up
  to a whole second. Re-measure with `calibrate`/`calibflight` after changing a route, a car or
  the world; never pad a timer to make a test pass, and update the §8 table and the fixture. A
  random stage's raw run times go into `notes/calibration-samples.md` (pool only runs on the same
  stage, world, actors and autopilot code; a change to any starts a new pool); `node tools/pool.mjs`
  derives its timer. Every run goes in, a gate's or a verifier's too; logs in a scratchpad are
  lost. The balls, sheep and flowers pools sit on a rounding boundary: one more default run can move
  a timer by a second, which is the rule working, not a regression.
- AI buses (steer 0.9, lane-path turns from 11 m) turn left fine but are too wide for right
  turns: mission bus routes turn left only.
- Every scripted line in `src/content/*.js` and `src/game/missions/*.js` carries a source tag
  comment (`// [F]`, `[F*]`, `[N]`, `(t)`; DESIGN §1.4). Player-facing text is Swedish, Ole
  speaks Norwegian bokmål, no real brands or businesses (§1.5).
- `game.pay(n)` never soft-locks: Ole pays when the purse is short (not fines or the PANIK fee).
- **Flight-level guides.** Markers and the guide arrow aim straight there (`routeAim: false`), so a
  stage whose straight line crosses seats, benches or walls is wrapped in `via(stage, [landmarks],
  pass)` (missions/flight.js, DESIGN §8.1 [3]). A timed stage that starts after the intro or a
  dialogue, and every on-foot retry, turn player and camera to the guide (`runner.faceGuide()`).
  Check a guide with an arrow-follower probe, not by eye.
- **Trolley cues.** No stage uses `trolley: false` (it froze the trolley mid-aisle and walled off
  landning's round-up); `trolley: 'park'` sends it to the front galley (`cabin.parkTrolley`). A
  checkpoint retry re-applies the ambient cues on the retried run's fresh `m`.
- **Retries and hides.** `retryFear` (common stage option) gives a retry the meter the stage first
  started at; the def field `outroHide` keeps NPCs hidden after `complete()`'s `placeNpcs(true)`;
  `fail()` re-hides the checkpoint stage's `startCue.hide` keys (DESIGN §9.2, §9.4).
- **Frozen-file history.** In Phase 1 eleven packages worked in parallel with disjoint file
  ownership (DESIGN §14.1); `main.js`, `level.js`, `content/index.js` and the stage kinds
  (`game/missions/kinds/*`) were frozen. That is why some features are reached through options
  and hooks (`worldHooks`, kind options, `addInteractable`) instead of edits to those files. The
  freeze is over: since Phase 2 any file may change, but the DESIGN contract changes with it.
- **Branches and tags.** Only `main`. The Phase 1 branches `p1-<WP>` and their worktrees in
  `../.wt/charter-<WP>` were merged in Phase 2 and removed on 2026-10-12 at the user's request (their
  commits are in main's history; `../.wt/saab_work` belongs to another project). Tags: `phase0a`,
  `phase0`, `phase2-merged`, `phase2-contracts`, `phase2-balance`, `phase2-docs`, `phase2`,
  `phase3-r1`, `phase3-r2`, `phase3`. The remote is `origin` =
  `git@github.com:Ran4/charter_and_run.git` (SSH, set 2026-10-14); push only when the user asks.
