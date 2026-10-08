# Phase 3, round 1, fixer `spine`

Repo: /home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan (main), port 8870.
Start: `5322f34`, tree clean. Scratch output (shots, logs, ad-hoc probes):
`<scratchpad>/out-p3-r1-spine/`.

All 14 items were verified first (code read, shot or an ad-hoc probe) and fixed. None rejected,
none deferred. Two fixes differ from the triage's proposal (playtest-8, staging-17; see below).

## Items

### playtest-2 · bug · fixed — `retryCar`
Verified by code read: `retry()` exits the car, teleports the player on foot and `startMission`
creates a fresh `m` (the mission cars are gone; the old car stays where the mission failed).

Fix:
- New common option `retryCar: { at, type?, name?, passenger?, rider?, park? }` (`COMMON` in
  kinds/core.js; exported `retryCar(g, m, rc, prev)` there, next to `clearSpot`/`seatIn`/`addRiders`
  which it uses).
- `runner.fail()` stores `lastCar = g.playerCar` before `cleanupMission`. `retry()` takes
  `prev = g.playerCar || lastCar` and calls `startMission(cpI, before)`. `before(m)` runs on the
  fresh `m` before `startStage()`, so the stage's init already sees the car
  (`destroy.playerDamageScale` reads `g.playerCar` at init).
- Without `type`: the last car if it is alive, unlocked and still in `g.cars` (repaired), else a
  spare `hatch` that the player keeps (popped from `m.cars`, as `race` does). With `type`: a new
  mission car named `name`, removed at the mission's end like the car it stands in for (bodega's
  `grisbilFollow`).
- The car is placed at `at` (landmark, `{x, z, yaw}` or lane spot), unnamed parked cars on the
  spot are cleared, the `passenger` is seated (busy) and the `rider` added as a bust (NPC hidden).
  The player takes the wheel facing `at`'s yaw. With `park: true` the player stays on foot at
  `retryAt` and the car is parked (for grisfest's dance-floor checkpoints before the Tonga drive).
- `tools/lib.mjs` `missionDataProblems` resolves `retryCar.at`, `passenger` and `rider`. This is a
  one-line change outside my file list: the data checks promise that every landmark and character
  a mission references resolves.
- New `kinds` checks (synthetic bodega defs):
  - the reused last car (damaged, then repaired) waits at the spot with Berra seated;
  - a typed `grisbil`/`grisbilFollow` mission car with Berra and the Robban bust is entered before
    `destroy`'s init (`ramCar` is the new car, damage scale 0.3);
  - `park`: the player is on foot at `retryAt`, and a spare hatch is parked at the spot.
- Note for island-missions: pick a spot without a named parked car. `clearSpot` leaves named cars
  alone, and a spare placed on `hyrbil` at `flamencoDrive` got pushed 1 m (seen while writing the
  check). The calibrate Tonga start `{ x: -86, z: -202.75, yaw: -π/2 }` and `grisfestGate` are
  free.

### islandA-1 · bug · fixed — the chase eye never ends up inside a solid
Verified: islandA's probe3 sweep (2.4–8.9 % of standable spots × 8 headings put the eye in a solid)
and the solid-blue `ad_office_back` frame.

Fix:
- camera.js: the pull-in samples the sight line every 0.25 m (`segmentBlocked(…, 'prop', 0.25)`;
  collision.js takes a new `step` parameter, default 0.8, so the `api` 22-sample assertion holds).
  The eye stops 0.45 m (level) short of the first inside sample.
- Below the old 1.6 m floor (`ARM`), the eye now **climbs** on a 1.6 m arm
  (`pitch = acos(room / 1.6)`) instead of going into the wall. Past `CAP` 1.25 rad it stays at that
  angle, moves in over the head and looks further ahead (the cabin `clampPitch` trick).

Tuning by eye:
- The triage's `d = max(0.5, free)` and a shorter arm put the camera 0.5–0.6 m from the head: a hat
  filling the frame (`sheet-cam1.png`).
- A 2.0 m arm lifted the eye above the SunTrip office awning, which has no camera ceiling: a cream
  frame (`sheet-cam3.png`).
- 1.6 m keeps Bigmouth's distance. The eye stays under that awning (`sheet-cam2.png`, high-angle
  view of the head).

Verification:
- `probe-cam.mjs` runs the real `CamRig.update` in a scratch rig over islandA's nine blocks ×
  8 headings: 0 eyes in a solid in every block (was 299–623 per block).
- `smash_0` no longer has a trunk across the car. `skandal_multa`'s bush (kind `prop`) stays
  see-through, by design.
- `view_suntrip` (a `views` cutaway, not the chase eye) shows no palm in front any more: nothing to
  pass on to world-town.

### hud-2 · bug · fixed
Verified: runner.js:258 `|| this.failT > 15` → `abort()`. The fail screen now waits for E or Q
(runner comment, DESIGN §9.4 item 3). The cost-once part stays dropped (plan).

### playtest-8 · bug · fixed (smaller string change than proposed)
Verified by code read: only a dead named `o.car` is recreated. A dead `missionCar` blocks the stage,
which has no timer and cannot be aborted while running.

Fix: `getInCar.update` fails when its `missionCar` is dead and the player is not in it. The fail
text reuses the existing `wreckedRide` string, with the name of the driver the car was handed over
from: "Du kvaddade Grisbondens bil!". Without a driver it falls back to `S.wrecked` "KVADDAD!".

No new string in strings.js (the kind stays generic, not "grisbilen"); DESIGN §11.5 row amended.
New `kinds` check (a synthetic mission car with Grisbonden driving, wrecked → that fail text).

### playtest-6 · bug · fixed
Verified by code read (no direction test in follow.update). Fix as proposed: `trailed` turns true
once the player is behind the quarry (`(f − c) · forward < 0`) and at least `minDist` back, and
only then does closeness count (`update` and the bar's "FÖR NÄRA!").

New `kinds` check: parked 9 m in front of José facing him for 3 s, close on 10 of 10 samples, the
stage still runs. The existing "too close for too long fails" check stays green.

### playtest-10 · ugly · fixed
`follow.obj()` returns `{}` until the tail starts. New `kinds` check: no bar before the start.

### staging-5 · bug · fixed
`scene` init: without `place`/`exitCar`, a player's car is `place`d at its own spot (velocity
zeroed) before the framing.

New `kinds` check: a car entered at 12 m/s moves 0.21 m over 40 frames after the scene starts.
The negative control with the line removed moved 3.4 m and failed the check.

### staging-17 · bug · fixed (different mechanism from the proposal)
Applying all pending `sendTo` at the collect stage's cleanup would teleport the **last** guest
the moment he is touched, because the stage ends on that touch. In landning it would also drop the
seating of the last guest (the next stage is `sit`, so `stage !== this`).

Fix in kinds/flight.js:
- `bubbles()` waits in a frame hook. As soon as a dialogue or cutaway starts, it takes the live
  bubble down that frame (an already expired empty line replaces it) and plays no more lines.
- `touched()` then skips the late `sendTo`/`seatOnTouch`: the scene has placed the guest itself.
- Without a scene, nothing changes.

Checks:
- New `kinds` check (Berra touched, then a scene places him at the pool): after 3.5 s he is
  21.8 m from the pool bar, and no bubbles are left.
- `FROM=12 TO=13 SHOTS=1 story`: Berra and Robban are both in the party group shot (the baseline
  had Berra at the bar).

### playtest-9 · bug · fixed
`getInCar.atHome`: at init a named car the player is not in goes back to its `home` spot. Set on
buss17 stage 0 (island.js:102) and in the fixture. DESIGN §8.6 and §9.2 updated. New `kinds` check
(bus moved 150 m away is back on its bay at init).

### hud-9 · bug · fixed (code read)
Verified: `pause()` refreshed only `#music`; N (main.js:1353) never touched `#sound`. `pause()` now
also sets `#sound` from `audio.muted`. `pause()` returns early under `?test=1`, so the harness
cannot exercise it. DESIGN §11.3 updated.

### staging-16 · ugly · fixed
`haggle.talk()` frames seller + partner while the partner is standing in the open (not hidden, not
in a car), else seller + player. Story shot `isl_asnan_haggle`: Ole and the seller in profile, with
Ole's face visible. The baseline had Stig's head in the lens and Ole hidden.

### flight-4 · ugly · fixed
The giver "!" also hides while the player is within 3 m of the giver, in both levels (the talk
prompt shows from 3.4 m). `fs_stowers`, `fs_door_bridge` and `gate_arch`: the beam stays and the
big "!" is gone. DESIGN §5.3 amended.

### islandB-1-cam · ugly · fixed
camera.js `clearSide()` serves both `frame()` and `frameOne()`:
- the preferred side if its sight line is clear, else the other side (both unchanged, 0.8 m
  samples);
- if both are blocked, the side with more room (0.25 m samples), with the eye 0.45 m short of the
  solid and at least 1.6 m out.

islandB's `p2_mamma_fru` probe: the shot went from inside a house to the open village square
(`cmp-fataga.png`). The scene's staging itself belongs to island-missions.

### islandB-10 · ugly · fixed
- `ISLAND_PALETTES` have `sunDir`: day and night `[70, 130, 45]`, sunset `[-105, 60, 60]` (WSW,
  ≈ 26°).
- `setSkyPalette` sets `SUN_OFFSET` from it.

Shots:
- julafton duet (`cmp-jul.png`): long shadows pointing ENE, away from the sunset, with no
  frustum clipping visible.
- `endcard_rio`: the faces are still lit.

DESIGN §13.3 and §14.4 updated.

## Checks (all on the final code unless noted)

- `kinds`: RESULT: PASS (twice). One run in between failed: in the `park` check a spare car placed
  next to the x = −80 road had been nudged 0.6 m by a car within 3 frames, and the check wanted
  0.5 m. The spot checks now allow 1.5 m and pick the nearest car (they compare against a car left
  150 m away). Three isolated runs of the retryCar section and the final `kinds api` passed.
- `api missions talk walk`: RESULT: PASS
- `smash foot skandal`: RESULT: PASS
- `gate flightshots endcard`: RESULT: PASS
- `fullstory`: RESULT: PASS (`done -> #13 idle`)
- `FROM=12 TO=13 SHOTS=1 story`: RESULT: PASS
- `VIEWS=suntrip views`: RESULT: PASS
- `CAL=follow calibrate`: RESULT: PASS. All three tails stayed in band:
  - grisbil 21.2–27.1 m (maxDist 55);
  - José 22.3–29.6 m (minDist 14, maxDist 55);
  - Fataga bus 21.7–25 m.
- Full story `SHOTS=1 PORT=8870 node tools/shot.mjs story`: `[t] done -> #13 idle`, no
  `scenario failed`, `no errors`, RESULT: PASS.
- Final `kinds api`: RESULT: PASS.
- Final full story `PORT=8870 node tools/shot.mjs story` (game code identical to the commit):
  `[t] done -> #13 idle`, no `scenario failed`, `no errors`, RESULT: PASS.

## Timers

None changed. No route, car, stage start or world geometry on a timed path moved. The follow
calibration was re-run as asked (no timer).

## Follow-ups for other groups

- island-missions (playtest-1, -3, -4): `retryCar` is ready, contract in DESIGN §9.4 item 3.
  - Use `park: true` for grisfest's plates/dance checkpoints, so the player stays on the dance floor
    with the car waiting at the Tonga start.
  - Choose spots without a named parked car.
- world-town (islandA-5): until the SunTrip office awning and the pool-bar thatch register camera
  ceilings, a raised eye can still sit above or in them. The pull-in arm stays at 1.6 m for that
  reason.
- island-staging: the grisfest "Heia Norge!" story shot shows no dancers (unchanged from the
  baseline; backlog §4.2).
- audio-ui-meters: the collect toasts "GÄSTER n/4" stack over the julafton party in the story
  (test timing; hud-6 territory).
