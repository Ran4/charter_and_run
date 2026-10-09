# Phase 3 · round 2 · fixer `cabin-flight`

Start HEAD `0e68a56` (after the spine, island-camera and world fixers). Port 8870, OUT
`<scratchpad>/out-p3-r2-fix-cabin-flight/` (below: `OUT/`). Probe `OUT/probe.mjs` (parts `signs arch
row22 snaps snow row6 clouds`; it reuses the flight critic's probe2/probe3 set-ups and the film
critic's barkprobe), run on the start HEAD into `OUT/before/` and on the fix into `OUT/after/` and
`OUT/after2/` (the toilet signs' final spot). Sheets `OUT/sheet_*.png`.

## Items

- **flight-5 · ugly · fixed.** Every hanging cabin sign turns about the vertical to face the
  render camera: both galley signs, both `SPÄNN FAST BÄLTET / RÖKNING FÖRBJUDEN` signs, both
  `TOALETT` signs. This replaces the galley signs' two-way flip in `stepAmbient`. It runs in a
  chained `scene.onBeforeRender` (cabin.js), not in `tick`, so a dialogue cut is right on its
  first frame and the signs face whatever camera renders. three has already updated the matrices
  at that point, so each sign calls `updateMatrixWorld(true)`. The Euler order YXZ keeps the
  up-tilt. The turn takes the sign's own facing or its reverse, whichever is nearer the camera.
  Three placements had to change so that the turning signs never cut into anything:
  - `FRÄMRE BYSSAN` rises from y 2.35 to 2.4, so it clears the curtain rail at 2.24 when turned
    across.
  - `BAKRE BYSSAN` hung 10 cm off the rear wall: turned, half of it went through the wall. It moved
    to z −18.45 (−18.9 before) and its turn is capped at ±0.6 rad (back edge ≥ z −18.93).
  - The UPPTAGET lamps sat at y 2.12 on the door wall, below its 2.3 m top, so a turning lamp would
    cut into the wall. Each lamp now hangs under its `TOALETT` sign as a child (0.4 m wide, was
    0.6). The pair hangs at x ±0.8, 0.2 m off the door wall (was ±0.98 / ±0.97).
  - The wall signs (`BESÄTTNING`, `NÖDUTGÅNG`, `RÖKARE`) stay fixed.

  Evidence (`OUT/sheet_before_signs.png` → `sheet_after_signs.png`, `sheet_after2_signs.png`):
  - The side cameras over the front and rear show the belt signs face-on, not as red strips.
  - In the sprit intro (`after/after_sign_sprit_forbjudet.png`) both TOALETT signs read the right
    way round; the starboard one read "TTELAOT" upside down before.
  - From the z-clamped rear eye and in the `row22Cam` cut (`OUT/crop_row22_signs.png`) the two
    TOALETT/UPPTAGET pairs read beside the belt sign.

  DESIGN §5.3.
- **flight-7 · ugly · fixed.** A phase change without `instant` now blends the palette instead of
  jumping (`applyPalette(secs)`, `stepPalette` in `cabin.tick`). It eases from what is on screen to
  the new phase's sky, fog, light and window colours: 1.5 s into climb, 2 s otherwise, smoothstep,
  colours in linear space. `instant` snaps, as do level switches, `restoreAmbience`, retries and
  `applyPalette()` with no argument. The `phases` test (`scenery.mjs` `parkAt`) calls
  `applyPalette()` after its non-instant `setPhase`, so its shots keep the phase's own palette.

  RMSE between the frame 0.1 s before and the frame just after each boundary (same probe as the
  critic, palette parked first):

  | boundary | camera | before | after |
  |---|---|---|---|
  | takeoff → climb | cabin | 0.148 | 0.075 |
  | takeoff → climb | outside | 0.206 | 0.103 |
  | climb → cruise | cabin | 0.096 | 0.033 |
  | climb → cruise | outside | 0.147 | 0.031 |

  The critic's comparison, a frame of steady motion (landing → landed), measured 0.071 / 0.039.
  What remains at takeoff → climb is the scenery's own change (the puffs start and the ground
  drops). Sequence: `OUT/sheet_snaps_after.png`. DESIGN §5.6.
- **flight-8 · ugly · fixed.** Snow is culled over the cabin rect (x ±3.6, z −27…18.6) at any
  height, not only below y 2.7, as over the bridge and the lounge. Evidence: `OUT/sheet_snow.png`.
  The flake over the aisle at takeoff 1.8 s is gone. From outside, the column over the plane joins
  the snow-free block over the terminal. DESIGN §5.6.
- **flight-10 + staging-10 · ugly · fixed (flight-10's fix).** The bust loop no longer adds busts
  at the east end of the front chair row (z0 6.6, k ≥ 10, x ≥ 26). The other busts keep their
  random draws, so they look as before. Both arch lines were checked, landside at lx 34.2 and at
  the story spot: the corner shows empty orange shells and no other bust replaces the face
  (`OUT/after/after_arch_*`, `OUT/story5/fl_gate_shoe.png`, `fl_gate_terrorist.png`).
  staging-10's airside cut was therefore not needed. DESIGN §5.2 (gate visuals).
- **flight-11 · ugly · fixed.** The clock's ink rim (r 0.33, z 0…0.03) is behind the skin face (r 0.3,
  z 0.02…0.05). Two ink hands (GGF, unoutlined) show 9.05. Evidence: `OUT/sheet_clock.png`
  (black disc → clock face). DESIGN §5.2.
- **flight-12 · ugly · fixed.** The aisle coin line stops at z −10.0 (13 coins). The coins at
  −11.8 and −13.6 moved to the leg room of the unused dodge rows 3 (starboard) and 18 (port), so
  the total stays 24 (`cabin` PASS). The `row22Cam` cut with the dialogue box hidden shows the
  aisle empty to the bottom edge (`OUT/after2/after2_row22_nobox.png`). DESIGN §5.2.
- **film-3 · bug · fixed.** New `cabin.skipRowSixBark()`, which sets `_angerudDone`.
  `rowSixComplaint` (juice stage 2) calls it from its first frame, so the stage owns the line.
  barkprobe, before: "Kallar ni det här 'varm middag'?" at 17.96, then the full complaint at 18.32.
  After: only the full complaint and its follow-up (`OUT/before.log`, `OUT/after.log` `row-6 lines`).
  The bark still resets on the next entry into cruise. DESIGN §5.12, §8.3, §14 cabin API.
- **islandB-7 · off-brand · fixed.** New optional palette field `cloudRim`: `setSkyPalette` sets
  the colour of the town clouds' own outline material (`MAT.cloudRim`). Values are `day` 0x6f9ccc
  (unchanged), `night` 0x101433 and `sunset` 0xa0605a. Evidence: `OUT/sheet_clouds.png`: night
  clouds have a dark ink line instead of a cyan glow, sunset clouds a warm rim instead of blue.
  `OUT/sheet_rio.png` shows the Rio card and the wide Rio shot before and after. DESIGN §13.3, §14.4.

## Checks

- `node --check` on cabin.js, flightScenery.js, gfx.js, level.js, missions/flight.js and
  tools/scenarios/scenery.mjs.
- `gate cabin flightshots flightseq phases panic turbulence trolley sceneryPeek dc8 perf` →
  `no errors`, **RESULT: PASS**. All perf views are at 60 fps (`OUT/run1.log`).
- `riocard endcard` → `no errors`, **RESULT: PASS** (`OUT/run2.log`).
- `missions` → `no errors`, **RESULT: PASS** (`OUT/run3.log`).
- `story` → `[t] done -> #13 idle`, no `scenario failed`, `no errors`, **RESULT: PASS**
  (`OUT/story.log`).
- `FROM=0 TO=5 SHOTS=1 story` → `landed on the island`, **RESULT: PASS**. Its flight shots
  (`OUT/sheet_story5.png`) show the arch lines clean, the clock and the turned signs.

## Follow-ups (other groups)

- **flight-2 (ombord intro staging).** The front belt sign now faces the camera. In the story's
  ombord intro it reads, but it lies over Stig's legs and torso, where before it was an edge-on red
  strip over his body (`OUT/story5/fl_ombord_intro.png`). The flight critic's `doorCam` staging
  would take the camera off that line.
- **Title orbit.** `main.idleTitle` still emits `fx.snow` at the title. It is the second snow
  system that §5.6 says was removed, and it is not culled over the cabin. It shows only on the title
  orbit.
- **flightseq.** It starts from mission 2 (cruise) and sets `takeoff` without `instant`, so its first
  frames blend from the cruise palette into `gate`. A real takeoff comes from `gate`, which has the
  same palette, so this happens only in the test.
- The climb's pinkish tint (`seq_a05–a07`) was there before this round, in the critic's shots too.
  It is not palette blending.
