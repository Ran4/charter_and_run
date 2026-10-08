# Phase 3, round 1, fixer `world-outskirts`

Repo: /home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan (main), port 8870.
Start: `439da1d` (after world-town), tree clean. Scratch output (shots, logs, ad-hoc probes):
`<scratchpad>/out-p3-r1-world-outskirts/`:
- `probe.mjs`: before/after shots of every visual item (`pre/`, `post/`, `post2/` to `post4/`, sheets
  `sheet1-3.png` in `pre/` and `post/`).
- `canopy.mjs`: Gando roof visibility flips (`pre/`, `post3/`).
- `dynercand.mjs`: candidate `dyner` spots (`cand/`).
- `dunedrive.mjs`: car drive-over at the dunes (`dune/`).
- `self*/`, `self*.log`: self-checks. `story*.log`, `story2/`: the full story with key-scene shots.

All 12 items were checked first (a before shot, a probe or a code read). 11 fixed, none rejected,
1 deferred (BL-4.3-D1a, optional). Two fixes differ from the triage's proposal (`dyner` in
islandB-11, the beam in islandB-4). The world-town follow-up for this group is islandB-7-coast.

## Items

### islandB-2 · bug · fixed — bygge: invisible wall under the 2nd-floor slab
Verified: `probe.mjs` puts the player on the 1st floor (local (−4, −10), y 3.6) and walks him east.
He stops at local x 1.64, y 3.55 in open space (`pre/bygge_l1_wall`, `pre/bygge_l1_cam`). The 2nd
floor's `solid(12, −10.5, 20, 15, S2)` runs from the ground up; the engine has no overhangs.

Fix (nature.js `bygge`): the storey is closed the way the 3rd floor already was.
- The ground floor's brick loop became a local `infill(y0, faces)`. The ground-floor output is
  unchanged.
- Under the slab: a dark core `f.box(0x3a342e, 12, S1, −10.5, 19.4, S2 − S1 − 0.35, 14.4)`, brick
  infill along x 2 (z −18…−3) and z −3 (x 2…22), and corner columns at (2, −3), (2, −18) and
  (22, −3).
- The ramp to the 2nd floor arrives at x 2, z −16…−12. The brick there sits inside the wedge's
  tall end.

After: he still stops at x 1.64, now in front of the brick wall (`post/bygge_l1_cam`,
`post/bygge_sw`, `post/bygge_se`, `self/view_bygge`). No collider changed. `pryl_klocka` is
reached as before (story PASS).

### islandB-11 · bug · fixed (different from the proposal for `dyner`) — views camera
Verified (`pre/view_dyner`, `pre/view_bagageband`): the board hides the player and no dune shows.
The bagageband camera stands inside the terminal (black and cream bands).

- `bagageband` (6, 0, 0) → **(6, 11, π)**, as proposed. A person stands south of the carousel and
  faces it. The camera is on the forecourt and the canopy hides (`self/view_bagageband`).
- `dyner`: the proposed (0, 0, π) put the views camera (0, 14) inside the crown of the boardwalk
  palm at (2.2, 12): fronds over the top and a trunk down the right edge (`post/view_dyner`).
  `dynercand.mjs` shot 11 candidates (`cand/`). Every on-axis spot hits a boardwalk palm.
  **(0, 0, π − 0.4)** is clean: the arch reads, the person faces it, the dune slopes are on both
  sides (`self/view_dyner`). The position, and so the map label "Dynerna", is unchanged.
- Neither landmark is used by a mission or by calibrate. `busBay` was left alone.
- DESIGN §6.3 rows updated.

### islandB-12 · factual · fixed — `GOTEMBURGO`
coast.js arrivals board (`post/sign_board`).

### filmIsland-10 · factual · fixed — `ESLÖV 3 900 KM`
Haversine Eslöv (55.84 N, 13.30 E) to Maspalomas (27.76 N, 15.59 W) ≈ 3 877 km. The tag comment
says so (`post/sign_eslov`).

### filmIsland-9 · off-brand · fixed — sign tags
- nature.js: `SE VENDE · BUNGALOW / 4 RUM OCH KÖK` → `[F*]`. It is the seller's line, "Bungalow –
  fyra rum och kök." (research-plot.md:291), relocated to the sign.
- `[N]` added to `TOMATES · EXPORTACIÓN` (×2), `EMPAQUETADO`, `MANTELES · DUKAR`, `18` and
  `CAMPO DE GOLF`. The hoarding's `// §6.3` became `// [N] (§6.3)`.
- The header now says that real place names (FATAGA, DUNAS DE MASPALOMAS, LA CHARCA) carry no tag.
- coast.js needs no per-line tags. Its header already states the rule ("signs are [N] unless
  marked"), and no coast sign is film text.

### BL-4.3-D1b · off-brand · fixed — Christmas and charter-Sweden dressing in the nature blocks
Verified: none in tomat, grisfest, fataga, golf, bungalow, bygge or dyner (`pre/xmas_*`).

Added (§6.9), with no new solid where a timed stage runs:
- **Fataga**: tinsel baubles spiral up the square's palm by the entry lane (visual only). A
  `julgran` stands on the azotea of the corner house (16.75, 21) at (12.4, 17.9),
  `baseY = CURB + 4.0`. Its collider lies inside the house's (top 99), so the fatagaSheep spawns
  and flight paths see no change, and **no `CAL=sheep` is needed**. It shows from the square
  (`post4/xmas_fataga_tree`). A ground-level tree in the square would have needed a re-measure.
- **Golf**: a `julgran` by the clubhouse's east door, under the veranda (`self/view_golf`). The
  golf block is on no timed route.
- **Grisfest gate**: a garland of low-poly baubles along the arch and up its posts, and a
  `FELIZ NAVIDAD · GOD JUL` board on top of the crossbar (y 4.74–5.30). All visual, above the
  camera's path through the gate (`self/view_grisfest`).
- **Show bungalow**: two `SUNTRIP · JUL I SOLEN` posters on the plot wall, facing the road
  (`self/view_bungalow`).
- The baubles use a 6-segment sphere (`bauble`). Town triangles: 999k → 1003k.

### islandB-5 · ugly · fixed — `LLEGADAS · ANKOMST` sliced by the fascia stripe
Moved to `HALL_Z1 + 0.12`, 3 cm in front of the stripe's face. The opaque board covers the stripe
(`pre/` vs `post/sign_llegadas`).

### islandB-4 · ugly · fixed (tuned) — lighthouse beam
Verified: a grey tube with a round disc on its end (`pre/night_fyren`).
- Applied the proposal first: additive blending, vertex colours fading along x, `fog: false`,
  `DoubleSide`. The result was a solid white cone with a grey disc still on its end
  (`post/night_fyren`). Near and far walls added up, and the bright inside showed through the
  open end.
- Final: outer faces only (one layer; the inside never shows), 6 height segments, colour
  `(0.36, 0.32, 0.20) × (1 − x/140)²`. A soft warm beam that fades to nothing
  (`post3/night_fyren`, `post3/night_fyren2`). It still shows only at night.

### islandB-7-coast · ugly · fixed — coast lamps dark at night
This is the world-town follow-up. Added to `TOWN.nightGlow` through the Frame's builder argument:
- the quay lamps' globes (sphere 0.34 over 0.32);
- the green harbour light (0.37 over 0.35);
- Gando's two apron floodlight faces (2.12 × 0.62 × 0.04 enclosing 2.1 × 0.6 × 0.02).

Each glow is a centimetre larger than the face it covers, so they do not z-fight. Shots:
`crop_hamn.png` (before/after), `post3/night_flood`. They glow at night and sunset (sky top dark)
and are unchanged by day (`post3/day_hamn`).

### BL-4.3-D2a · ugly · fixed — towels on the sand in front of the sunbeds
Deleted the per-sunbed flat towel (coast.js `playa`). `solstol` carries its own SunTrip towel. The
scattered sand towels stay (`post/beach_rows`).
- The row loop no longer draws 4 `rnd()` values per pair. That shifts the later random decor of
  the beach blocks: parasol yaw, sombrilla colours, sand patches, scattered towels, the
  rock-pool pebbles.
- None of them is a collider that changes shape. The parasol collider is a circle.

### BL-4.3-D2b · ugly · fixed — canopy pop
Verified with `canopy.mjs` (`pre/`). Walking in and out, strafing along the edge, orbiting and a
car at the kerb each flip the roof at most once. A player shuffling back and forth outside the
hall, 2 m south of its edge, facing it, flipped it **8 times in 140 frames**.

Fix: the hysteresis as proposed. Once the roof is hidden, the camera box and the look-ray box
grow by 1.5 m. Same shuffle after: **0 flips**. Every other run is unchanged (`post3/`,
`view_airport`, `view_bagageband`).

### BL-4.3-D1a · ugly · deferred — the dunes read small
Measured with `dunedrive.mjs`, a sedan from the boardwalk west into the hip end of the (0,4) dune
at (−16.5, −17), then south up its windward face:
- at the shipped heights it crosses both ways (max y 2.75 and 2.55);
- with the big dunes at 3.6/3.3 (Dw/Dl kept) it stops dead at the hip end (y 0.15, speed 0.1). It
  stalls on the windward face at y 3.05, short of the 3.75 crest.

Cars test every collider piece under their bounding radius against 0.6 m. The hip-end length
`e` is capped at L/2 − 0.5 = 13 m, so 2.6 m is already the tallest end a car can climb
(slope 0.2). Taller dunes need longer ridges (L ≥ 37 m for 3.6 m) or a different collider. That
means re-laying the dune field (the block is 60 m with the boardwalk in the middle). It breaks
nature.js's "drive over from any side but the lee" and DESIGN §6.3's "large sand dunes (ramps)".
Skipped as the item allows. nature.js was restored (verified with `cmp`).

## Checks

All on the final code (port 8870, OUT `<scratchpad>/out-p3-r1-world-outskirts/…`):
- `VIEWS=dyner,bagageband,airport,hittegods,busBay,fyren,playa,hamn,fataga,bygge,golf,grisfest,bungalow
  views islandtour islandstats propsheet aerial perf`: **RESULT: PASS** (`self2.log`).
  - islandstats: town 1003k triangles, town outline 849k.
  - perf: every view 60 fps. The worst is island spawn (update 1.5 + render 7.05 ms, 966 calls).
  - Sheets from the same set before the bauble swap: `self/sheet-views1.png`,
    `self/sheet-views2.png`, `self/sheet-tour.png`.
- `FROM=11 TO=12 SHOTS=1 story` (grisfest, night): **RESULT: PASS**, `[t] done -> #12 idle`
  (`story11.log`, `story11/sheet.png`).
- Full story `PORT=8870 node tools/shot.mjs story`: **RESULT: PASS** (`story.log`, before the
  bauble swap). Again with `SHOTS=1` on the final code: `[t] done -> #13 idle`, no
  `scenario failed`, `no errors`, **RESULT: PASS** (`story2.log`, `story2/sheet.png`).
- Ad-hoc probes `probe.mjs`, `canopy.mjs`, `dynercand.mjs`, `dunedrive.mjs`: `no errors`.

## Timers

None changed, and no calibrate was needed. Nothing solid was added on a timed path:
- the bygge walls are visual, and the collider is unchanged;
- the Fataga tree's collider lies inside a house's;
- the golf tree is off every route;
- the dune heights are unchanged.

## Follow-ups for other groups

- island-base / views (landmarks-island.js `hittegods`): the views shot of `hittegods` stands behind
  the lost-and-found booth (`self/view_hittegods`; the yaw is the clerk's facing, south into the
  hall). The clerk reads well from the hall (islandB probe). If the definition-of-done sheet needs a
  front view, give `views` a per-landmark override rather than turning the clerk round.
- difficulty pass (D1a): bigger dunes need a dune-field redesign (longer ridges or a car rule for
  dune pieces), see above.
