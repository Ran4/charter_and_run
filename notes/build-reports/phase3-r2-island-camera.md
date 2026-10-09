# Phase 3, round 2, fixer `island-camera`

Repo: /home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan (main), port 8870.
Start: `23f0ae5` (after the r2 spine commit), tree clean. Scratch output:
`<scratchpad>/out-p3-r2-fix-island-camera/` (below `OUT/`): `base/` = a `git archive` of 23f0ae5 for
the before runs, `runall.sh` (the islandA critic's `sweep.mjs`/`carsweep.mjs`/`shots.mjs`/`carback.mjs`/
`misc.mjs bus` and the islandB critic's `pergola.mjs`/`pergola2.mjs`, all through `probe.mjs`, with
`REPO` selectable), `eyeprobe.mjs` (first hit through a 5×3 grid of the frame), `table.py` (the table
below). Runs: `before/` (23f0ae5), `a1`–`a3` (iterations), `a4` (final Flamenco re-sweep), `fin/` (the
final sweep JSON), sheets `sheetA`–`sheetI.png`.

All seven items were verified first (the critics' shots re-taken on 23f0ae5, plus the sweep: same
numbers as islandA's at d9451f8) and fixed. None rejected or deferred. Timers: no timed route, car or
autopilot changed. The only collider change is the eight 0.6 × 0.32 m terracotta piers on Hotel
Flamenco's south façade (z −14…−13.69); no mission places anyone there and no calibrated route runs
along the first 0.3 m of that façade, so nothing was re-measured. I did not touch repair 2's files.

## The rig (camera.js; collision.js `ceilingHit`, `discPush`)

- **Ceilings count by the sight line** (`ceilingHit`): each ceiling is a box (footprint + 0.3 m,
  from under − 0.3 to top). The eye is capped at the lowest hit's under − 0.3 when the line from the
  pivot to the eye passes through one: the eye is in it, or the roof is between the eye and the
  player. Before, any eye within 1.5 m of a footprint or a player under one was capped (below
  top + 2), which also capped eyes out in the open. In cars too (until now never): the car's eye stops
  0.45 m short of the first ceiling on the line, as at a wall, when that leaves > len/2 + 2 m and the
  car is not under it; otherwise it is capped as on foot.
- **Stand-off disc** (4b): after the pull-in the eye is pushed out of every solid within 0.45 m
  (`discPush`, two passes for corners); if that puts a solid between eye and pivot, the eye is pulled
  in along the line until the disc is clear. Before, the 0.45 m was along the line, so at a slant the
  eye ended 0.05–0.3 m off the wall, inside façade relief.
- **Side slide** (4a): when a ceiling caps a climbed eye (nearer the pivot than `ARM` − 0.05), the eye
  slides along the wall (side with more room, or the side it is on) to `SIDE` 2.6 m from the pivot,
  down to 0.6 m above the pivot only as far as that keeps it no nearer than before. Tried 1.5 and
  2.0 m first: at those distances he filled the frame in profile (`sheetD.png`); 2.6 m gives a
  three-quarter view with the way ahead (`sheetE.png`).
- Every pull-in, push or slide snaps the eye (the old `hit >= 0` snap, extended).

## Items

### islandA-1 · ugly · fixed — hotel overhangs without ceilings
Ceilings (hotels.js): the whole pool-bar thatch (x 16.7–25.3, z 6.9–17.1, under C + 2.45 = fringe; the
counter strip at C + 2.15 stays); Flamenco's south strip from the open rooms' back wall to the balcony
edge (x ±26.15, z −21.5…−12.65: rooms 107/113, piers, band, balconies; under C + 3.45, top the roof);
the north galleries (z −28.25…−27, under C + 3.6) and the back door's canopy; every straw parasol
(2.8 m square, under C + 2.14); SunTrip's four courtyard balcony rows (1.25 m, under C + 3.0, top the
roof). Also: Flamenco's piers are solid (the eye stood behind one in room 107's doorway:
`patio_slab_p03`, all terracotta at 0.16–0.38 m in `eyeprobe`), the back-wall air-con units 0.4 m deep
(the capped gallery eye 0.45 m off the wall met their 0.5 m).
Evidence (eye before → after): `bar_north_eave` (22.5, 3.22, 7.8) all ink → (19.97, 2.3, 7.55) the
player by the vending machine; `room107_out_p07` 4.78 (in the slab, grey) → 3.3 (in the room, looking
out); `room107_in_p07` 5.57 (dark blue) → 3.3 (the beds); `patio_slab_p03` ink → the player on the
patio; `st_backwing`/`st_westwing`/`st_terrace_east` (in a balcony / head from above) → 2.85 under the
balcony or slid; `fl_palapa`/`st_palapa` ink/straw → 1.99 under the straw; `car_back_nw` (car at
`flamencoBack`) grey (−0.08, 4.69, −27.58) → the car in frame (−1.37, 4.29, −28.87). Sheets
`OUT/sheetA–C.png` (before/after pairs), `sheetE.png`, `sheetF.png`.

### islandA-2 · ugly · fixed — `lagenhet` balconies and entrance canopy
town.js `slabLot`: ceilings under the entrance canopy (C + 2.65), the first balcony row (front − 1.46…
front, under C + fh − 0.2 = the fins' bottom, top the roof) and the café awning (C + 2.5).
`lag44_front`, `lag44_front2`, `lag22_front`: balcony interiors, no player → the player under the
balcony row (eye 2.5–2.55). Sweep (4,4) 100 → 9 inside, 417 → 82 hidden; (2,2) 57 → 3, 230 → 51.

### islandA-3 · ugly · fixed — Centro Nórdico awnings, Casa Lola eave
centre.js: SUPERMERCADO and FERRETERÍA awnings (x ±(11.3…28.7), z 12–13.4, under 2.74 = the valance
bottom; the critic's 3.0 was the canvas, not the valance). Casa Lola's eave bougainvillea sits at
3.33–3.57 (r 0.3–0.45), above the pergola's 2.6 cap and west of the name board (was 2.0–2.8 m, where
the capped eye met it). `cita_awning_w/e`: canvas only → the player along the shop row (eye 2.44);
`casalola_front`: dark → the player, slid along the house front. Sweep (4,2) 8 → 3, 112 → 23.

### islandA-4 · ugly · fixed — the rig: capped climb, slanted stand-off, cars
(a) side slide; (b) stand-off disc (+ the solid piers); (c) ceilings in the car rig — see "The rig".
`office_back` (head and shoulders from above, eye 0.6 m over the head) → slid 2.5 m along the office
front; `bar_aisle` (shirt fills the frame, eye 0.35 m from the head) → slid along the aisle. Spine's
r1 eyes-in-solid check (the sweep's "eye in collider" column): 0 in every block on foot and in cars
(was 2 on foot, 10 in cars). The car sweep's "eye < 2 m from the head" column rose 0 → 88: almost all
are ARM-climbed eyes that the disc moved 0.05–0.15 m nearer across the 2.0 m threshold (e.g. (3,3)
(23, 29): dh 1.95). Nine are cars parked among the grisfest pergola posts and one flush under the
pool-bar thatch, where the eye is now capped just over the roof (dh 0.3–1.1) instead of inside the
vines/thatch; cars do not get there in play.

### islandA-7 · ugly · fixed — bus eye through the road banners
town.js `banners`: h 6.2 → 8.4 (the banner 7.8–9.2 m, poles and garland with it; colliders
unchanged). The buss17 chase eye stays at 6.69–6.87 m through the run; `bus_banner_59`: full-frame
"NAVIDAD" → the bus on the road (`sheetF.png`). `tour_street` shows the banner high over the road.

### islandA-9 · ugly · fixed — reception fascia fills the frame
`HOTEL FLAMENCO · RECEPCIÓN` stands on a terracotta panel above the fascia (C + 3.98–4.58); the
Christmas garland runs across the fascia's face (it hung under it, where the capped eye met it: 6 of
the 11 remaining Flamenco eye-inside samples). With the sight-line rule the eye outside on the open
side is no longer capped (`porch_fascia` 2.95 → 3.47). `porch_fascia`: "OTEL FLAMENCO · RECEPC…"
across the top → plain fascia with the garland; `porch_fascia_p06` the same (`sheetI.png`).
`view_flamenco` reads the name whole over the pergola.

### islandB-3 · ugly · fixed — nature/coast overhangs
nature.js: the grisfest pergolas (x ±16 ± 6.6, z −7…9, under C + 2.95, top C + 3.9), the Fataga fold
shelter (C + 2.2), the golf veranda (C + 3.0), the show bungalow's door awning (C + 2.42); coast.js:
the marina's reed terrace (C + 2.7). `p2_kick_w1/w2/e/e2` (night plates stage) 3.47 in the vines →
2.8 under the beams; `perg_table_w` dark → the player at the table; `perg_aisle_e` (on a bench) 3.92
over the slats → 2.8; `hamn_terrace` slats → 2.55 under the reeds; `crag_lane_far_w` (only his hair
over the shelter roof) → 2.05 under it (`sheetG.png`); `bung_awning` stripes → the player by the pool.
Sweep grisfest 128 → 7 inside, 207 → 106 hidden; hamn 11 → 2, 276 → 77; Fataga 27 → 17, 284 → 172.

## Sweep (islandA critic's `sweep.mjs` / `carsweep.mjs`, real `CamRig.update`, before = 23f0ae5)

On foot: spots on a 2.5 m grid × 8 headings × pitch 0.3/0.7. Cars: 3 m grid × 8 headings, pitch 0.22.
"Inside" = the eye inside rendered geometry, "hidden" = head and chest occluded by static meshes.
Flamenco's on-foot row is from the final run after the garland move (`a4`); the rest from `a3`.


on foot: before → after

| block | samples | eye in collider | eye inside a mesh | player hidden | eye < 1 m (foot) / 2 m (car) from head |
|---|---|---|---|---|---|
| (3,3) Flamenco | 11152 | 0 → 0 | 60 → 5 | 297 → 21 | 6 → 0 |
| (3,2) SunTrip | 10816 | 0 → 0 | 194 → 3 | 348 → 17 | 0 → 0 |
| (1,2) La Medina | 8000 | 0 → 0 | 14 → 11 | 120 → 115 | 0 → 0 |
| (4,2) Centro Nórdico | 8592 | 0 → 0 | 8 → 3 | 112 → 23 | 0 → 0 |
| (2,3) Plaza | 9856 | 2 → 0 | 62 → 19 | 128 → 119 | 0 → 0 |
| (2,1) Marknad | 11824 | 0 → 0 | 0 → 0 | 97 → 43 | 0 → 0 |
| (3,1) Kyrka | 11648 | 0 → 0 | 2 → 0 | 32 → 25 | 0 → 0 |
| (4,3) Gasolina | 12016 | 0 → 0 | 4 → 3 | 25 → 25 | 0 → 0 |
| (5,3) Guardia | 9792 | 0 → 0 | 8 → 6 | 21 → 20 | 0 → 1 |
| (2,2) lagenhet | 10128 | 0 → 0 | 57 → 3 | 230 → 51 | 0 → 0 |
| (4,4) lagenhet | 10464 | 0 → 0 | 100 → 9 | 417 → 82 | 0 → 0 |
| (0,0) Fataga | 9712 | 0 → 0 | 27 → 17 | 284 → 172 | 0 → 0 |
| (2,0) grisfest | 11808 | 0 → 0 | 128 → 7 | 207 → 106 | 0 → 0 |
| (4,0) golf | 12944 | 0 → 0 | 10 → 2 | 59 → 41 | 0 → 0 |
| (5,0) bungalow | 12336 | 0 → 0 | 8 → 5 | 88 → 71 | 0 → 0 |
| (5,6) hamn | 11696 | 0 → 0 | 11 → 2 | 276 → 77 | 0 → 0 |
| all | | 2 → 0 | 693 → 95 | 2741 → 1008 | 6 → 1 |

car: before → after

| block | samples | eye in collider | eye inside a mesh | player hidden | eye < 1 m (foot) / 2 m (car) from head |
|---|---|---|---|---|---|
| (3,3) Flamenco | 4376 | 0 → 0 | 54 → 3 | 183 → 6 | 0 → 12 |
| (3,2) SunTrip | 4160 | 0 → 0 | 8 → 1 | 154 → 9 | 0 → 13 |
| (1,2) La Medina | 3232 | 0 → 0 | 12 → 0 | 44 → 30 | 0 → 3 |
| (4,2) Centro Nórdico | 3376 | 0 → 0 | 8 → 1 | 21 → 12 | 0 → 1 |
| (2,3) Plaza | 3624 | 1 → 0 | 47 → 13 | 62 → 32 | 0 → 3 |
| (2,1) Marknad | 4208 | 1 → 0 | 1 → 1 | 45 → 45 | 0 → 2 |
| (3,1) Kyrka | 4648 | 3 → 0 | 6 → 1 | 37 → 6 | 0 → 3 |
| (4,3) Gasolina | 4928 | 0 → 0 | 26 → 7 | 41 → 14 | 0 → 2 |
| (5,3) Guardia | 3584 | 1 → 0 | 2 → 2 | 63 → 62 | 0 → 1 |
| (2,2) lagenhet | 3952 | 1 → 0 | 7 → 0 | 79 → 13 | 0 → 10 |
| (4,4) lagenhet | 4072 | 0 → 0 | 6 → 0 | 95 → 14 | 0 → 5 |
| (0,0) Fataga | 3576 | 3 → 0 | 50 → 2 | 70 → 65 | 0 → 3 |
| (2,0) grisfest | 4384 | 0 → 0 | 9 → 2 | 81 → 47 | 0 → 20 |
| (4,0) golf | 5376 | 0 → 0 | 6 → 0 | 16 → 15 | 0 → 2 |
| (5,0) bungalow | 4872 | 0 → 0 | 1 → 1 | 26 → 26 | 0 → 2 |
| (5,6) hamn | 4968 | 0 → 0 | 7 → 1 | 85 → 60 | 0 → 6 |
| all | | 10 → 0 | 250 → 35 | 1102 → 456 | 0 → 88 |

Remaining on foot: La Medina (11) and the plaza (19) are arch spandrels and shop-front relief under
the arcades (no ceiling below an arch's spring; a few samples each); Fataga's 172 hidden are the crags
and house corners in the lanes (not overhangs).

## Checks

- `node --check` on every changed file: ok.
- `walk drive aerial views islandtour smash foot skandal`: `no errors`, **RESULT: PASS**.
- `api perf`: **RESULT: PASS** (worst `island high` 60 fps, update 1.36 ms).
- `story`: `[t] done -> #13 idle stage 5 coins 7775`, no `scenario failed`, `no errors`, **RESULT: PASS**.
- Sweeps and probes as above (all `no errors`). No mission data or stage kind changed, so no
  `fullstory kinds missions`.

## Follow-ups for other groups

- **island-base / hotels**: the SunTrip friskotek notice board (x −21.6, z 3.1–4.9) has collider posts
  but no board: a slid eye can end behind it (10 sweep samples). A board collider is on the balls
  lawn's edge, so it needs a `CAL=balls` re-measure; not done here.
- **centre**: La Medina's and the plaza's arcade arches hang below the arcade ceiling's underside near
  the front plane; a few eye-inside samples remain there.
- **staging / cutaways**: none of this touches `frame`/`frameOne`/cuts.
- islandA-7's side note (the near-side palm fronds brushing the bus eye a frame before the banner) is
  not addressed.
