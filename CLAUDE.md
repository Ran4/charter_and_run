# Charter & Run

*Sällskapsresan* (1980) × Simpsons Hit & Run, in plain three.js ES modules (no build step), built
on the Bigmouth & Run engine. Two levels, 13 missions. `DESIGN.md` is the design bible and the
module contracts: it wins over `notes/`, and every change to a contract, a literal or a timer
goes into it (plus a line in its changelog). README.md has the player-facing overview (Swedish)
and the code map.

**Build status: Phases 0–2 are done (tag `phase2`), Phase 3 (the QA loop) is next.** `HANDOFF.md`
is the orchestrator hand-off: the current state, the Phase 3 plan, the known-issue backlog, the
binding user decisions (player car ×1.2, tight measured timers) and the gotchas. Read it before
continuing the build. The agents' reports from Phases 0–2 are in `notes/build-reports/`.

## Running and checking changes

- The game is on port **8840** (`make run` / `npm start`). The user starts it themselves: never
  run `make run` or `npm start`, never open a browser or window.
- Verify headlessly: `PORT=<port> OUT=<dir> node tools/shot.mjs <scenarios>` (serves the game
  itself, headless Chrome on the real GPU; default port **8841**, screenshots in `out/`). It
  prints `RESULT: PASS` or `RESULT: FAIL (reasons)` and exits non-zero on FAIL. One run at a
  time when RAM is tight (`free -g`). `montage a.png b.png … -tile 3x3 -geometry 640x360+4+4
  sheet.png` makes contact sheets; look at the shots with the Read tool.
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
  - cast: `castsheet cars heads` · meter/UI: `ui skandal` · `perf` (fails below 45 fps)
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
  `Frame.ceiling`) keep the on-foot eye under pergolas.
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
  are branched per level (§4.3); new code at x = 3000 must not call them directly. The cabin is stationary; `flightScenery.js` moves the outside past it and is the only
  writer of the airframe pitch.
- **The player's car runs at `PLAYER_BOOST` 1.2** (car.js), not Bigmouth's ×2. AI cars never
  get it; a race opponent that must keep up gets a spec through `race.oppSpec`.
- **Timers are tight and measured** (DESIGN §8 "Timers and difficulty", a binding user rule): a
  clean run on a sensible route keeps about 15–20 % of the time. Drives: ceil(1.2 × T_ref), on
  foot: ceil(1.25 × T_ref) (+0.5 s per target), random stages at the 75th percentile, rounded up
  to a whole second. Re-measure with `calibrate`/`calibflight` after changing a route, a car or
  the world; never pad a timer to make a test pass, and update the §8 table and the fixture. A
  random stage's raw run times go into `notes/calibration-samples.md` (pool only runs on the same
  stage and autopilot code); `node tools/pool.mjs` derives its timer. Logs in a scratchpad are lost.
- AI buses (steer 0.9, lane-path turns from 11 m) turn left fine but are too wide for right
  turns: mission bus routes turn left only.
- Every scripted line in `src/content/*.js` and `src/game/missions/*.js` carries a source tag
  comment (`// [F]`, `[F*]`, `[N]`, `(t)`; DESIGN §1.4). Player-facing text is Swedish, Ole
  speaks Norwegian bokmål, no real brands or businesses (§1.5).
- `game.pay(n)` never soft-locks: Ole pays when the purse is short (not fines or the PANIK fee).
- **Frozen-file history.** In Phase 1 eleven packages worked in parallel with disjoint file
  ownership (DESIGN §14.1); `main.js`, `level.js`, `content/index.js` and the stage kinds
  (`game/missions/kinds/*`) were frozen. That is why some features are reached through options
  and hooks (`worldHooks`, kind options, `addInteractable`) instead of edits to those files. The
  freeze is over: since Phase 2 any file may change, but the DESIGN contract changes with it.
- **Worktrees.** The Phase 1 branches `p1-<WP>` have worktrees in
  `../.wt/charter-<WP>` (A1 A2 B C1 C2 D1 D2 E F G H). They are merged history: leave them
  alone, don't edit or delete them, and don't run the game from them. Tags: `phase0a`,
  `phase0`, `phase2-merged`, `phase2-contracts`, `phase2-balance`, `phase2`. Commits are local
  only (no remote, never push).
