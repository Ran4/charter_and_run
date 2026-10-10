# Phase 3 · round 3 · fixer `island-camera`

Start HEAD `302d4c2` (fixer 3/4 island-staging), clean tree, branch `main`. Port 8870. Probes, logs
and shots in `<scratchpad>/out-p3-r3-fix-island-camera/` (below `OUT/`):
- `base/` = a `git archive` of 302d4c2 (with `node_modules` linked) for the before runs (`REPO=`);
- the r3 island critic's probes, copied: `probe.mjs`, `sweep.mjs`, `carsweep.mjs`, `sweepnear.mjs`,
  `crag.mjs` (widened to ±4.5 m round each crag's circle), `popshots.mjs`, `table.py`;
  `jit2.mjs` = the critic's `jitter.mjs` + the rig's `slide` and a per-walk count of frames with the
  eye within 1.5 m of the head, parasols' "out" walks (which start inside the pole) skipped and every
  6th `parasoll` prop canopy only (most stand in beach rows); `jcmp.py` / `jsum.py` compare runs;
- `head/` = the critic's sweep and car sweep on 90775a7 (camera, collision and the island blocks are
  unchanged from there to 302d4c2), the before for `table.py`; `jbase/` = `jit2` on `base/` (stopped
  after 242 walks for time; the critic's full `jitter-ceil.json` on the same code is the jump
  baseline); `fin/` (jitter street, sweep, sweepnear), `fin2/car` (car sweep), `fin3/jit` (jitter
  ceilings) on the final code;
- `myshots.mjs` with `ms_base/`, `ms_new/`, `ms_new2/` and the sheets `sheet_fold_a.png`,
  `sheet_crag_n2.png`, `sheet_plaza_n1.png`, `sheet_crop_plaza.png`, `sheet_notice_a.png`,
  `sheet_par_plaza_w1.png`, `sheet_par_arcade.png`, `sheet_marknad_s.png`, `sheet_casalola.png`
  (left before, right after); bursts `pops_base/`, `pops_new2/`, `sheet_pops_*.png`,
  `sheet_pops2_*.png` (top before, bottom after);
- `cal1.log`–`cal3.log` (`CAL=balls,sheep FOOT_RUNS=12` ×3), `calp.log` (`CAL=pursuit`),
  `crag_base.log`, `crag_new.log`, `crags.mjs` (the north edge's colliders), `officer.mjs` with
  `off_base.log` / `off_new*.log` (the SKANDAL officer traced round the Fataga house), `sk_*.log`,
  `scen.log` / `scen2.log`, `story.log`, `fs.log`.

## Items

All seven items were verified first on 302d4c2 (the critic's spots re-shot from `base/`, the
jitter walks on `base/`, the crag probe) and fixed; none rejected or deferred. Two of them changed a
timed stage's world (the crags: sheep; the notice board: balls), so both stages got a new pool
(`walker-r1r2/r3-island-camera`, 36 runs each on the final world, `notes/calibration-samples.md`).

- **r3island-1 · ugly · fixed** — camera.js, the side slide (§14.5). It was all or nothing (only for
  a capped eye nearer than `ARM` − 0.05, snapped in one frame) and every frame with a wall behind
  snapped the eye to its target, so walking out from under a porch the eye jumped from the slid
  profile to just behind his head. Now: the slide's target is the lateral offset that takes the eye
  to `SIDE` 2.6 m from the pivot whenever a ceiling caps the eye or hangs within 0.5 m above it
  (`ceilingOver`, grown 0.3) and the eye is nearer than `SIDE` — so a capped eye 1.6–2.6 m out also
  moves off his back; `cam.slide` eases towards it, out at `SLIDE_K` 6/s and in at `SLIDE_IN` 12/s
  (at 6/s the eye lingered over his head when he walked in under a balcony row, `sheet_pops_st_row`
  vs `sheet_pops2_st_row`), keeps its side unless the other side has `SLIDE_HYST` 0.5 m more room,
  and is cut every frame to the room each side has (tested at 0.25 m with the 0.45 m stand-off, as
  before), so the eased offset never puts the eye into a wall. The y snap is down only: a ceiling
  that stops capping lets the eye rise at the damped 9.8/s (a pull-in still snaps x/z, and the cap
  still snaps the eye down). The critic's three points (continuous trigger, damped offset in the rig,
  hysteresis) are all in; I kept the full `SIDE` target over the whole band instead of scaling it
  down from `ARM` to `SIDE` (the slid eye then always ends `SIDE` out, which is the point).
  Evidence, `jit2` (real input, ts 1) under every island ceiling: one-frame jumps > 1 m in 140 of
  604 walks (critic's run on the same code) → **1** (a 1.03 m *downward* cap snap under the
  SUPERMERCADO awning at the frame a pole pulls the eye in; identical in the critic's run, not the
  slide), lateral jumps > 0.5 m 139 walks → **0**, the largest remaining move 0.67 m (the first
  ease-in frame plus a cap drop); frames with the eye within 1.5 m of the head 532 in 68 walks → 406
  in 17 (the 242 walks `jbase` and `fin3` share; the rest are the generic `ARM` climbs with his back
  flush to a wall under the plaza arcade's 4.4 m roof, the same before). Sidewalks (96 walks): no
  move over 0.56 m before or after. Bursts: the reception porch (`sheet_pops2_porch`: before,
  profile → shirt filling the frame with the head cut → behind; after, profile → a swing round
  his shoulder → behind with the head in), the lagenhet entrance and the SunTrip balcony row the
  same. The new parasol ceilings' walks (68): no jump over 0.53 m.
- **r3island-2 · ugly · fixed** — nature.js, Fataga's six north crags. Each is `PRIM.ico(0)` scaled
  (sx 5–8, sy 3–5.5, sz 2.4) and turned by `ry`: its footprint is a hexagon with flat ends at
  ±0.425·sx (|z| ≤ 0.263·sz) and peaks at ±0.425·sz in the middle. Besides `rock()`'s r 1.0 circle
  (the waist), each now gets an oriented box (`ramp` with h0 = h1 = the circle's top, kind `rock`)
  0.85·sx long and 0.53·sz wide along its long axis: the hexagon but for two thin wedges ≤ 0.3 m
  deep (under the characters' 0.32–0.36 m radius). Positions, sizes and `rnd()` order unchanged (the
  critic's "move k = 0, 1 behind the fold wall" would have put them on the sidewalk loop at −32.6).
  `crag.mjs`: rendered rock > 1 m tall outside any solid 2.8–5.5 m² per crag, up to 3.05 m from the
  circle's centre → 0.6–1.3 m² of slivers. Shots `sheet_fold_a.png`: under the fold shelter the frame
  was rock or ink with no player (c_fold_a/b/c) → the player under the shelter, the rock beside him.
  Sweep Fataga: eye inside a mesh 17 → 3, player hidden 172 → 82 (cars 65 → 52). The sheep stage
  plays here: `CAL=balls,sheep FOOT_RUNS=12` ×3 on the final code, 36 sheep runs 10.22–29.52 s,
  median 15.82, p75 18.80 → T_ref 21.80 → **28** (was 27; range 25–29). §8 table, §8.11 s5,
  island.js, fixture, ledger.
- **r3island-3 · ugly · fixed** — centre.js, the plaza north row: each shop's name is a 3.5 × 0.8 m
  `board` on the arcade's front (z 2.52, in front of the band) above its arch's crown (4.09), y
  4.1–4.9, two lines where needed (`CAFETERÍA\nEL SOL`, `HELADERÍA\nLA PALMERA`,
  `CORREOS\nTELÉGRAFOS`, `BANCO\nCAMBIO`, `PELUQUERÍA`), ochre backing; the wall signs are gone.
  `sheet_plaza_n1.png` / `sheet_crop_plaza.png`: every name reads whole from the chase camera at 6 m
  and from across the plaza (was "CAF…", "…MERA", "…CAMBIO"). §6.3.
- **r3island-4 · ugly · fixed** — hotels.js: the notice board is a solid (x −21.66…−21.54, z
  2.9…5.1, top C + 2.45, kind `sign`), the critic's first fix. `sheet_notice_a.png`: the board
  filling the frame (c_notice_a) → the player in front of the eye (a close view: he stands in the
  1.3 m gap between the board and the wing); he can no longer walk through it. Balls lawn: 36 new
  runs 7.20–20.93 s, median 13.40, p75 15.56 → T_ref 18.56 → **24** (unchanged; range 22–25). §8
  table, island.js comment, ledger.
- **r3island-5 · ugly · fixed** — ceilings over every café parasol (`cafeTable` with `parasol`:
  2.9 m square, under y0 + 2.34 = the rim, top y0 + 3.0; La Medina's courtyard, Bar Svenska and
  upper terrace, El Patio) and every standing `parasoll` prop (props.js `canopy: [1.15, 2.07, 2.6]`,
  registered in `finalizeProps` with the prop's `block`, skipped while it is smashed). Two
  differences from the critic's fix: (a) the prop's canopy hung at 1.72–2.2, through his head, so
  no camera position showed his head under it (shots `ms_new/par_arcade`, `par_deck`: eye capped
  at 1.57, head hidden by the rim); the canopy is raised to a 2.07 rim (pole 2.25, top 2.55,
  footprint unchanged); (b) the prop ceilings are `underOnly` (they count only with him under one,
  or the eye in one): with the plain sight-line rule a walk past a beach row would pump the eye
  down and up every few metres. The café parasols use the sight-line rule like the r2 straw
  parasols (El Patio hid him from behind the canopy, not only under it). `sheet_par_plaza_w1.png`:
  El Patio and La Medina's yellow/blue parasols hid him (c_plaza_w1–3, c_medina_w1–2) → visible under
  the rim; `sheet_par_arcade.png`: the arcade café table and the Flamenco deck → visible, head in
  the canopy's shadow. Sweep: La Medina hidden 115 → 53, plaza 111 → 71. A first version let cars
  ignore all parasols (`foot`); the car sweep's hidden rose 6 → 27 (Flamenco) and 9 → 31 (SunTrip),
  cars on the decks under straw parasols, so it was dropped: cars treat parasols as r2 did.
- **r3island-6 · ugly · fixed** — centre.js: `MERCADILLO · MARKNAD` at y 4.4 (3.85–4.95; legs and
  pole colliders where they were). `sheet_marknad_s.png`: only his legs below the board → the player
  whole under it. Sweep Marknad hidden 43 → 35.
- **r3island-7 · ugly · fixed** — centre.js: Casa Lola's lights hang from the cross beams'
  underside (3.08) with sag 0.15 (lowest bulb 2.72, was 2.44), the pergola ceiling's under 2.9 →
  2.72 (cap 2.42, was 2.6). `sheet_casalola.png` (casalola_in, casalola_in2): a big bulb on his
  head → the bulbs in a line at the top of the frame, his head clear. §6.3, §14.7.
- **consequence of r3island-2 · fixed** — shame.js `planOfficer`: with the crags solid, `skandal`'s
  "behind a building" check failed every run (twice on the final world, passing on `base/`):
  `officer.mjs` traced him out to the north kerb, from where crag 2 stood between him and the
  player, so he needed about 10 s (on 302d4c2 he took about 7 s by walking through the rock). Two
  changes: one box between them is rounded by its corners 0.8 m out (`cornerDetour`: one or two
  corners along its faces, the shortest path with every leg clear, string-pulled), and the street
  route's kerb point moves up to 16 m along the street to the nearest one that sees the player. Now
  he rounds the house in 4 s (`reached 5.0 m (direct)`), the stuck-teleport step still teleports.
  §7.2.

## Checks

- `node --check` on every changed file; `node tools/pool.mjs` (no problems).
- `CAL=balls,sheep FOOT_RUNS=12 calibrate` ×3 on the final world (`cal1–3.log`): each **RESULT:
  PASS**; falls 0, wedges 0, nothing excluded. Pools: balls n 36 → 24 (22–25), sheep n 36 → 28
  (25–29).
- `jit2` ceilings (`fin3/`, final code, 672 walks under 190 ceilings, `no errors`) and streets
  (`fin/`, 96 walks); the sweep, car sweep and close-band sweep (`fin/`, `fin2/`) — numbers above
  and in the DESIGN changelog. Sweep on foot (16 blocks): eye in a collider 0 → 0, eye inside a
  mesh 94 → 78, player hidden 1004 → 805, eye < 1 m 1 → 2 (one sample at the Casa Lola corner,
  0.98 m); cars 0 → 0, 34 → 34, 456 → 426, eye < 2 m 89 → 89; eyes within 1.8 m of the head (six
  blocks) 2869 → 2787.
- `skandal ui walk drive aerial views islandtour smash foot perf propsheet` (`scen2.log`): `no
  errors`, **RESULT: PASS** (perf worst `island plaza` 60 fps, update 1.63 ms). The earlier run with
  `skandal` failing is `scen.log`.
- `CAL=pursuit calibrate`: **RESULT: PASS**.
- `fullstory kinds missions`: `no errors`, **RESULT: PASS**.
- `story` (final code): `[t] done -> #13 idle stage 5  coins 7775`, no `scenario failed`, `no
  errors`, **RESULT: PASS**.

## Follow-ups and known issues

- The 1.03 m downward snap when a pole pulls the eye in on the same frame as a ceiling starts to cap
  it (the SUPERMERCADO awning walk; unchanged from 302d4c2). A downward snap keeps the eye out of
  the slab; easing it would let the slab cover him for a few frames. Known issue.
- Eyes close to his head that are not under a ceiling: his back flush to a wall with the eye on the
  `ARM` climb (the plaza arcade's 4.4 m roof, the start of the critic's `st_row` burst: straight over
  his head). The slide only acts under a low ceiling; elsewhere this is Bigmouth's climb.
- The notice board leaves a 1.3 m gap to the SunTrip wing; standing in it, the eye is close
  (`ms_new/notice_a`). A corner, not a route.
- The officer's `cornerDetour` rounds one box; two buildings in a row still go by the streets.
- Two small `standSign`s elsewhere have pole colliders only (e.g. the market's `LUNES A SÁBADO` board
  at 1.3–1.9 m): the player walks through the board. Not reported; not touched.
- For the docs/final report: fataga sheep 27 → 28 (pool `walker-r1r2/r3-island-camera`); balls stays
  24 on a new pool.
