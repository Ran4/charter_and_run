# Phase 3 · round 2 · fixer `world`

Start HEAD `46a0938` (after the spine and island-camera fixers). Port 8870, OUT
`<scratchpad>/out-p3-r2-fix-world/` (below: `OUT/`; probe `OUT/after.mjs`, shots `OUT/a1..a3/`,
sheets `OUT/sheet_*.png`, the critics' before-shots in `OUT/before_A.png`, `OUT/before_B.png`).

## Items

- **islandA-5 · ugly · centre · fixed.** The plaza's west row (x −29…−19, from z −17) stands on
  the north row's west end. The north row's arcade now has 12 arches from x −18.6 to 28.6 (span
  3.93 m, was 14 × 4 m from −28), its cream floor starts at −19, and the upper windows sit over the
  new arch centres (12 per floor; the two that were in the west row's roof are gone). The five shops
  are re-laid inside the free span, each sign centred in an arch (`mid(k)`): `CAFETERÍA EL SOL`
  (arch 1, w 8), `HELADERÍA LA PALMERA` (3, 7.6), `CORREOS · TELÉGRAFOS` (5, 7.4), `BANCO · CAMBIO`
  (7, 7.4), `PELUQUERÍA` (10, 7). This differs from the critic's u values: with them the café sign's
  centre stood behind a column, so only "…EL SOL" showed. The café tables and parasols moved to
  (−17, −11.4), (−13.6, −11), (−10.2, −11.6), clear of the Christmas tree at (−6.5, −11.6) and the
  lantern at (−9.6, −9.6). Evidence: `OUT/sheet_plaza2.png` (the NW corner: the arcade ends at the
  west row's wall, the café sign reads through its arch, three tables in front), against
  `OUT/before_A.png` (the arch sliced by the cream wall, the sign sliver). No timed on-foot stage
  reaches the plaza (flowers spawn ≤ 40 m from `flamenco` and end at the x −40 road; balls at the
  friskotek, sheep at Fataga), so nothing needs re-measuring. DESIGN §6.3 plaza cell.
- **islandA-6 · ugly · hotels · fixed.** New `parkingSign(f, lx, lz, name)` in hotels.js: the post
  stops under the plate (C + 1.87), a 1.26 × 1.16 steel backing, and on each face a 1.2 × 0.8 `P`
  plate (scale 0.9) over a 1.2 × 0.3 name strip (ppm 192, border 0.12). The collider (pole circle)
  is unchanged. Used for `HOTEL FLAMENCO` and `SUNTRIP`. Evidence: `OUT/a1/cut_psign_flamenco.png`,
  `cut_psign_flamenco_back.png`, `cut_psign_suntrip.png`, `cut_psign_suntrip_side.png`
  (`OUT/sheet_signs.png`): big P, the name whole on both faces, no post through either.
- **islandA-8 · off-brand · centre · fixed.** `'ES UNA IGLESIA\nDET ÄR EN KYRKA.'` (`[F*]` kept);
  §6.3 kyrka literal, and §1.3 now says in-world signs (drawn by `textCanvas` in Luckiest Guy) are
  uppercase. `OUT/a1/cut_kyrka_sign.png`.
- **islandA-10 · off-brand · centre · fixed.** `TASCA LOS AMIGOS` (`[N]`, the row's existing tag).
  I picked *tasca* over the critic's *taberna* because it is the everyday Canarian word for a small
  bar and is two letters shorter on the 3.2 m board. §1.3 gains the rule "in-world signs are
  Spanish or Swedish". `OUT/a1/cut_tasca.png`.
- **islandB-4 · ugly · nature · fixed (visual only).** town.js `outskirts()` builds two rows of big
  hip-roof dunes beyond the west bound, opposite the dyner blocks. They use nature.js's `duneGeo`
  (now exported, with its tones `DUNE_WIND`/`DUNE_LEE`).
  - Front row: 5 dunes, crests 7.5–10.5 m, lee base at x ≤ −318.
  - Back row: 4 dunes, crests 13–17 m, crest at x ≈ −410.
  - Centres z 40…256, crests run north–south, turned ±0.1–0.4, the slip faces (lee tone) towards
    the town; Dl = 1.5 h, Dw = 3.2 h.
  - No colliders. The outer rounded dunes and the beyond-bound palms skip x > −480, z 10…300, so
    nothing is buried in them. This shifts the outskirts RNG for what follows: the headland rocks,
    foam dashes and boats are all decor beyond the bound.
  - I tried three layouts. Short crests read as a regular row of pyramids from above; long crests
    read as flat embankments from the road. The kept one has medium crests, varied turns and a
    staggered front.
  - Evidence: `OUT/sheet_dunes3.png`, against the critic's `OUT/before_B.png` and
    `out-p3-r2-islandB/probe/d_dune_*`. In `d_dune_road_w`/`_sw` (the west road) big tan slip faces
    with pale hip ends stand over the road. `d_dune_foot_w` and `d_dune_boardwalk_w` (the boardwalk)
    show the big dunes rising behind the 2.6 m ones. `d_dune_plaza` shows them on the horizon from
    the town. `islandstats`: town 992k tris. `perf`: worst 60 fps.
  - DESIGN §6.3 dyner cell, §6.4 West.
- **islandB-5 · ugly · island-base · fixed.** rio.js: the five busts stand in one row across the end
  card's view (screen right (0.447, −0.894)), 0.7 m apart round (0, −2.2) on the wheelhouse roof.
  Left to right: guitar (its neck points out of the row), drum, trumpet, maracas, accordion.
  - The maracas are held before the chest (roof + 0.57, ±0.17 m, with handles).
  - First try, critic's order (trumpet, maracas, guitar, drum, accordion): the guitar's neck covered
    a maraca. Second try: a roof-rail post covered the red maraca. Hence the reorder; the drum
    takes the post.
  - Evidence: `OUT/crop_rio_after3.png` (all five faces and instruments), `OUT/run1/endcard_rio.png`.
    Before: `out-p3-r2-islandB/crop_busts.png`, three visible.
  - DESIGN §6.3 Rio paragraph.

## Checks

- `node --check` on centre.js, hotels.js, nature.js, town.js, rio.js: OK.
- `views islandtour propsheet islandstats riocard endcard` (`OUT/run1.log`, shots `OUT/run1/`,
  `OUT/sheet_run1.png`): **RESULT: PASS**.
- `perf` (`OUT/perf.log`): worst `island marknad` 60 fps, **RESULT: PASS**.
- `story` (`OUT/story.log`): `[t] done -> #13 idle stage 5  coins 7800`, no `scenario failed`,
  `no errors`, **RESULT: PASS**.
- Probe `OUT/after.mjs` (three runs, `OUT/a1..a3`): no errors.

## Follow-ups

- None for timers: the only collider changes are the three plaza café tables (inside the plaza,
  on no timed route). The parking-sign post collider is unchanged, and the dunes have none.
- The north row's shop signs hang at 3.62 m behind the arcade (spring 2.25, crown ≈ 4.1), so each
  long name still loses its ends behind the spandrels from most angles. Centring them in arches is
  the most a re-lay can do; hanging them on the arcade's band would need a new sign row.
