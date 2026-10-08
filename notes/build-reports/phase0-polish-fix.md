# Phase 0 polish — fix for the failed independent check (d: fullstory)

Commit 35e9e40 "Phase 0 fix: follow/race routes send abandoned named cars home"; `phase0` tag moved to it (HEAD == phase0, clean tree).

## Root cause
The check's guess ("followCar exits right away") was wrong. Instrumented followCar showed it
ran for its full 120 s timeout: the fataga excursion bus (follow stage 2) drove its route and stopped at about
(-93, -202), nose against **buss17**. The player had left buss17 in a lane in an earlier mission (the story's `anyCar`
picks the nearest car, so which car gets left where depends on timing, which is why the failure was intermittent:
2 of 3 full-chain runs failed). `clearRoute` (src/game/missions/kinds/core.js) removes abandoned cars from a route
at init but skipped **every** named car (`c.name`), so the bus pushed against bus 17 for ever. In the shipped game
the same thing would soft-lock a follow or race whenever the player leaves the rental car, the pig truck or bus 17 on its route.

## Files changed
- src/game/missions/kinds/core.js: `clearRoute` now handles a named car that has a `home` (a parked car from the
  world data), is not the player's, is not locked, has no AI and no driver, is not traffic, and stands on the route.
  If it is more than 3 m from its home it goes back there (`c.place(home)`). Named cars without a home (this mission's
  own cars) are still skipped. Unnamed abandoned cars are removed as before. This applies to follow and race (both call clearRoute).
- tools/scenarios/kinds.mjs: a new regression check in `kinds`. At mission index 10 it builds a synthetic follow with the
  fataga bus route, places buss17 in a lane of that route (laneSpot [2,1]->[1,1]) and starts the mission, then checks that
  buss17 is back at its parking spot. Verified to FAIL without the fix ("388 m -> 388.2 m") and PASS with it.
- tools/story/common.mjs: followCar logs `follow: ended at once` (with the reason) or `follow: timed out after` so
  this kind of failure says what happened. The 'over' value now carries a reason string.

## Done / P1 left / cut
- Done: the fix above, the regression check, all checks re-run on PORT=8850, the commit, and the tag.
- P1 left: none.
- Cut: none.

## Self-check (PORT=8850, logs in scratchpad/out-fix/)
- `TO=11 DEBUG_FOLLOW=1 node tools/shot.mjs fullstory` before the fix: reproduced it (`follow: timed out after 120000 ms`, bus blocked by `bus/buss17` at -103,-202) — fsfull2.log
- `node tools/shot.mjs kinds` without the fix (stashed): `RESULT: FAIL (kinds: check failed: follow: buss17 abandoned on the route goes back to its parking spot (388 m -> 388.2 m))` — kinds-nofix.log
- `node tools/shot.mjs kinds` with the fix: `no errors` / `RESULT: PASS` — kinds.log
- `node tools/shot.mjs fullstory api levels`: `[t] done -> #13 idle stage 5  coins 7575` / `no errors` / `RESULT: PASS` — fapi.log
- `node tools/shot.mjs story`: `[t] done -> #13 idle stage 3  coins 7650` / 0 "scenario failed" / `no errors` / `RESULT: PASS` — story.log
- `node --check` on every .js/.mjs under src/ and tools/: 0 failures of 59.
- `git rev-parse phase0^{commit} HEAD`: both 35e9e40aab61feb9018b043a88aecad0eef16212; `git status --short`: 0 lines.

## CONTRACT CHANGES
- `clearRoute` (internal to kinds/core.js, frozen after Phase 0) changes behaviour: when a follow or race stage
  starts, an abandoned named parked car (one with `car.home`) standing on its route is moved back to its parking spot.
  No public API or option changed.

## Screenshots
/tmp/claude-1000/-home-ran-src-html-everything-and-run-charter-and-run--sallskapsresan/25b591af-d9e9-4102-8669-08768ad2e553/scratchpad/out-fix/
