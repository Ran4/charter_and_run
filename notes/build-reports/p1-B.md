# Phase 1 WP-B hand-off: Island base (DESIGN §6.2, §6.4–§6.8, Rio card §6.3/§11.7)

Worktree `/home/ran/src/html/everything_and_run/.wt/charter-B`, branch `p1-B`, commits
`2b2c3d6` (base) and `5392532` (polish), both on top of tag `phase0`.

## Files changed (all owned)

- `src/world/town.js`: rewritten. Ground, streets, outskirts, residential blocks, signs, ped loops.
- `src/world/props.js`: new `build()` looks for every §6.8 key; the old Bigmouth keys are unchanged aliases.
- `src/world/rio.js`: the Rio end card at x = −3000.
- `src/world/layout.js`: `BLOCK_MAP_COLORS` tuned. `MAP` is unchanged.
- `tools/scenarios/island.mjs`: `smash` and `foot` extended. New scenarios: `propsheet`, `riocard`, `islandtour`, `islandstats`.

## Done

**Streets (§6.4).**
- Asphalt grid with white centre dashes and zebra crossings.
- Each block gets a sidewalk ring at CURB. Inside it is an interior fill 4 cm lower, so the block builders' own ground (CURB + 0.01 and up) never sits coplanar with mine.
- Spanish double-arm iron lamps (two hanging lanterns), four per block plus the promenade. Every other lamp carries a gold Christmas star.
- Canary palms (fat ringed trunk, pineapple crown, two tiers of arching fronds, orange dates). About one in four has a red and gold tinsel spiral.
- Sidewalk furniture uses `correos`, `papelera`, `vykort`, `bank` and `palmkruka`. Rural blocks get agaves and bins.
- Guagua stops: a green shelter with a bench and a `PARADA / GUAGUA` sign. The glass back panel is solid.
- `GOD JUL · FELIZ NAVIDAD` banners cross three roads: z 40 at x 0, x −40 at z 0, and z −120 at x 0. Each hangs on two poles with a bead garland.
- A beach promenade of palms and lamps runs along the outer south sidewalk.
- No palm or bus stop stands on the 14 m sight line of any island landmark. This keeps Pepes Bodega in plain view across the road, and it keeps `views` clean.

**Outskirts (§6.4).**
- Ground ring: ochre volcanic sand `#c9a26b` round the town, and beach sand `#e8cf98` from z 289 to 300.
- Shoreline: a foam line at z 300–301.2, then two shades of shallows to z 330. The `MAT.water` sea plane (`#1c7fb8`) runs from z 330 to 1150, x ±1150. Everything is at y 0.17, and the flat pieces abut instead of overlapping, so nothing z-fights. Walking from z 300 to the bound at 314 still reads as wading.
- North and east, Monte Rojo: big red/ochre domes behind low-poly terraced mesas in alternating strata, red foothill boulders, and cardón and agave in the playable band, with circle colliders.
- West: Maspalomas-style dune ridges and palm groves. Mountains are kept out of the west, except far north-west.
- South-east: red rocks run into the sea.
- Six boats bob on the sea (`animated`).
- NE DC-8 sector around (240, −335): no dome, mesa or foothill within 100 m, measured edge to edge, and nothing over 1 m within 60 m. It is open flat sand (`tour_ne` shot).
- A west entrance road stub at z −40 ends in a red and white barrier at x −311, just inside the bound wall. Beside it stands the welcome sign: two whitewashed pillars, a sun with rays, and `BIENVENIDOS A / NUEVA ESTOCOLMO / VÄLKOMMEN!` on both sides, flanked by tinsel palms and bougainvillea.
- The bound walls are unchanged.

**Residential (§6.5).** `residential()` keeps its seeded layout: three lots per street side, back walls down the middle, and `ew` alternation.

- `bungalowR` lots:
  - The house is a one-storey whitewashed cube (solid top 99) with a flat roof (parapet, water tank, TV aerial) or a terracotta roof.
  - Green, blue or brown wooden shutters, a coloured door and sills; back windows and a back door.
  - Sometimes an arcaded porch you can walk under.
  - Bougainvillea climbs a front corner. One or two `butano` bottles stand by the door.
  - The garden has a palm or an agave, red rocks, a tiled terrace round the house and a dry lawn.
  - The front garden wall is made of `mur` props with a gate gap. Some lots also have a driveway gap with a parked car.
  - Side-street garden walls run along the block edges, and garden dividers separate the lots.
  - The back yard holds a walkable shallow pool (water floor at CURB, kind `water`), a laundry line or sunbeds.
  - About 1 lot in 8 (7 in all) has a trampoline (`bounce`).
  - One corner of each block has a `BUNGALOWS / LOS CACTUS` sign wall.
- `lagenhet` blocks: two of the three lots per side are 4–7 storey slabs (solid top 99):
  - Balcony slabs, glass bands and white or accent balcony fronts.
  - Vertical concrete fins, striped awnings, towels over the balustrades, potted plants, the odd advent star in a window.
  - A coloured stair tower at the back corner.
  - A glass lobby with an entrance canopy.
  - On the roof: parapet, lift room, tanks, aerial and the hotel sign on posts, cycling through `HOTEL LAS GAVIOTAS`, `APARTAMENTOS SOL`, `APARTAMENTOS VIENTO SUR`, `HOTEL MAR AZUL`, `HOTEL ATLÁNTICO` and `APARTAMENTOS TAMARINDO`.
  - The forecourt has bougainvillea planters and `palmkruka`, sometimes a parked car, and about a third of slabs have a ground-floor café terrace.
- The third lot is one of two things:
  - A half-finished concrete frame. Ramp 1 climbs to deck 1 (top CURB + 3.3), and ramp 2 on deck 1 climbs to deck 2 (CURB + 6.4). It has rebar, brick infill, a cement mixer, a sand pile, `kon` cones, a barrier and an `OBRA / PROHIBIDO EL PASO` sign.
  - A pool courtyard: a big shallow pool, rows of `solstol` and `parasoll`, palms, and a straw-roofed `BAR` hut.
- Ped loops are unchanged.

**Props (§6.8).** Every key has its own look. Spheres are low-poly icosahedra because props are instanced by the hundred.

| type | look |
|---|---|
| `papelera` | green basket on a post |
| `correos` | yellow pillar box: dome, slot, post-horn badge |
| `vykort` | spinning postcard rack |
| `dusch` | beach shower on a tiled foot |
| `parasoll` | orange and cream striped canopy (8 cone slices) |
| `solstol` | sunbed with a SunTrip-yellow towel |
| `palmkruka` | terracotta pot with a fan palm |
| `mur` | whitewash wall with plinth, breeze-block holes and terracotta coping |
| `tomatlada` | two slatted crates, full of tomatoes |
| `tunna` | hooped bodega barrel |
| `bank` | cast-iron and slat bench |
| `kon` | traffic cone |
| `bagagevagn` | luggage trolley with a suitcase |
| `automat` | REFRESCOS machine: lit header, bottle window |
| `gaspump` | white and red 1970s pump with a globe |
| `butano` | orange bottle with a collar and valve |
| `julgran` | plastic tree in a red bucket: tinsel, baubles, star |
| `tallrikar` | three blue-rimmed plate stacks |
| `resvaska` | strapped suitcase and vanity case |
| `glasskylt` | A-board with an ice-cream cone |

- Footprint, top, coins, shame, minSpeed and flags are exactly §6.8. The car-smashable tops are all above 0.75; `bank` (0.55) is driven over as specified.
- `def.color` is the debris colour. It is paper for `vykort`, tomato red for `tomatlada`, gold for `julgran` and yellow towel for `solstol`.

**BLOCK_MAP_COLORS.** All 23 types are tuned: whitewash, warm sand, field greens, beach sand and marina blue.

**Rio card (P1, `buildRioCard`).**
- Bay: a circle of radius 400 at y −0.8. It sits below the deck so the yacht shows a real freeboard; nobody leaves the deck.
- Yacht `MAJSAN`:
  - Hull and bow: white hull with a raised bow, navy boot-top, blue sheer stripe, portholes.
  - Deck: teak deck with its solid top at 0.55, as specified (box x ±2, z −6..6.8).
  - Railings: rails round the aft deck, with solid `rail` boxes so nobody steps off.
  - Wheelhouse: forward at z −4.2..−0.6, solid, with a lifebuoy.
  - Stern: a Swedish flag on the flagstaff.
  - The band: five busts (`buildBustGeo` + `randomPed`) with trumpet, maracas, guitar, conga and an accordion, on the wheelhouse roof facing `rioCam`.
- Copacabana, framed from `rioCam`:
  - A crescent beach in 11 slices, each turned to the curve, with parasols.
  - The black and white wave mosaic promenade: one canvas texture, merged into one mesh.
  - Palms, the avenue, and a row of white and pastel high-rises.
  - Green hills behind, the Sugarloaf with Morro da Urca and a red cable car, and sailboats in the bay.
- Landmarks: `rioBoat` (−3000, 0, 0) and `rioCam` (−2991, 6, yaw toward the boat), exactly as specified.

## P1 left / cut

- Nothing left from the package. The Rio cinematic itself (`game.playEndCard`) is Phase 2 work in main.js; see the notes below.

## Self-checks (my last runs, on the final commit `5392532`)

- `for f in $(find src tools -name '*.js' -o -name '*.mjs'); do node --check "$f"; done` → no failures.
- `PORT=8862 OUT=<scratchpad>/out-B node tools/shot.mjs views traffic smash foot title`
  - views: 23 landmark shots, none missing.
  - `[t] traffic cars 20 stuck 0 buses 1 avg speed 12.1` · `[t] fps 60`
  - `[t] correos alive? false skandal 1.2` · `[t] ped hit {"v":19.2,"state":"flung","coins":50}`
  - `[t] trampoline apex 5.88` · `[t] fin kicked fena_flamenco 0 -> 1` · `[t] frame deck {"n":13,"top":3.45} player y 3.45` · `[t] roof top 1.92 player y 1.92`
  - `[t] title level flight` · `[t] title level island`
  - `no errors` · `RESULT: PASS`
- `PORT=8862 OUT=<scratchpad>/out-B node tools/shot.mjs api` → `[t] save {...}` · `no errors` · `RESULT: PASS`
- Also green at the end: `islandtour`, `riocard`, `propsheet`, `islandstats`.
  - `islandstats` reports town static ≈ 540k triangles plus 490k outline, and props instanced, of which the `mur` walls are 1017 × 96 triangles.
- Ownership check output: the only line is `node_modules`. That is the untracked symlink created for the worktree, not a file of mine. `.gitignore` has `node_modules/` (directory form), so the symlink is not ignored, and I may not edit `.gitignore`.

## CONTRACT CHANGES (all additive; no landmark moved, no signature changed)

1. **New exports.**
   - `town.js`: `frameRamps` (`{ x, z, yaw, top, top2 }` = the foot of each half-built frame's ramp 1 and the deck heights; used by `foot`). It also still exports `bouncers` (now filled with the 'bounce' blocks), `lamps`, `animated`, `pedLoops`, `DC8_SPOT` and `parkedCars`.
   - `rio.js`: `RIO_X`.
2. **Sea layout (§6.4 detail).** The `MAT.water` plane now starts at z 330. z 300–330 is a vertex-coloured foam line plus a two-tone shallows strip at the same y 0.17, and the beach runs from z 289 to 300. No change is needed elsewhere: `hud.buildBaseMap` already paints the sea from z 294.5, and `fena_hav` at (0, 304) sits in the shallows.
3. **Block ground levels (§6.3 note for C1/C2/D1/D2).** Under every block interior there is now a fill at CURB − 0.04, with the sidewalk ring at CURB. Block builders should keep their ground at CURB + 0.01 or higher, as `stubBlock` does, and not exactly at CURB. Where a builder leaves ground uncovered, the fill shows 4 cm below the kerb.
4. **New scenarios** in `tools/scenarios/island.mjs`: `propsheet`, `riocard`, `islandtour`, `islandstats`. The integrator should confirm the names are unique after merging. `smash` now also rams a pedestrian, which is frozen in place because peds dive away from cars they see coming. `foot` now checks the trampoline, a fin kick and the frame ramp, as well as the roof and the double jump.
5. **Rio wiring suggestion for Phase 2 (`game.playEndCard`, main.js; not a change I made).**
   - `setSky('sunset')`.
   - Player: `player.teleport(rioBoat.x, rioBoat.z + 2, 0)`.
   - Cast: `placeNpc('majsan'|'ole'|'siv', 'rioBoat', dx, dz)` with `|dx| ≤ 1.4` and `dz` from 1 to 5. That is the open aft deck; teleport snaps onto the deck at 0.55.
   - Camera: `cam.cutTo({ x: rioCam.x, y: 3.2, z: rioCam.z }, { x: rioBoat.x, y: 1.8, z: rioBoat.z + 1 })`.
   - The `riocard` scenario does exactly this and its `rio_cam.png` is the framing.

## Notes for the next agents / integrator

- New invented, non-brand signs, all Swedish or Spanish:
  - Cafés: `CAFETERÍA · SVENSKT KAFFE`, `BAR · HÄR TALAS SVENSKA`, `KVÄLLSTIDNINGAR · PRENSA`, `SMÖRGÅSAR · BOCADILLOS`.
  - Others: `OBRA / PROHIBIDO EL PASO`, `PARADA / GUAGUA`, `BAR`, and the yacht name `MAJSAN`.
  - They are listed for the README's §1.6 invented-content list.
- Residential parked cars come from `f.car` (about 25). They spawn as normal parked `Car`s through `parkedCars`.
- The deck tops of the half-built frames use collision kind `garage`, so they show on the minimap as light boxes. Planters use kind `planter`, and the yacht rails use kind `rail`.
- Signs are batched into one mesh per texture, about 20 meshes in all. Street furniture is built into each block's own mesh so it culls with the block.

## Screenshots

`/tmp/claude-1000/-home-ran-src-html-everything-and-run-charter-and-run--sallskapsresan/25b591af-d9e9-4102-8669-08768ad2e553/scratchpad/out-B/`. The most useful files:

- Contact sheets: `sheet_tour.png`, `sheet_t2.png`, `sheet_t3.png`, `sheet_t4.png`, `sheet_a.png` (props and Rio), `sheet_views.png`, `sheet_smash.png`.
- Single shots: `tour_*.png`, `propsheet*.png`, `rio_cam.png`, `rio_wide.png`, `foot_*.png`, `bigmap.png`.
- Logs: `selfcheck-B.log` and `api-B.log` in the scratchpad.
