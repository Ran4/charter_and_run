# Phase 3, round 1, fixer `world-town`

Repo: /home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan (main), port 8870.
Start: `7f9f07d` (after spine), tree clean. Scratch output (shots, logs, ad-hoc probes):
`<scratchpad>/out-p3-r1-world-town/` — `probe.mjs` (before/after shots of every visual item,
`pre/` and `post/`), `stairs.mjs` (La Medina stairs entry), contact sheets `sheet-pre-*.png` /
`sheet-post-*.png`, `self/` (self-check scenarios), `cal*.log`, `story.log`.

All 13 items were verified first (a before shot, a code read or a walk probe). 13 fixed, none
rejected, none deferred. Four fixes differ from the triage's proposal (islandA-7, BL-4.3-C1a,
islandB-8, islandA-5 pool bar; see below). The spine follow-up for this group (the SunTrip office
awning and pool-bar thatch ceilings) is islandA-5.

## Items

### islandA-4 · bug · fixed — Centro Nórdico shop row
Verified: `pre_cita_*`, islandA's `ad_phone.png` ("KONDI…", "…STANC…"); the wings are solid boxes
over x ±11…29 from z −8, so SOUVENIRS (x −28…−18) and FARMACIA (18…28) were inside them and the
cross stood on the east wing's roof.

Fix (centre.js `cita`):
- Canopy and fascia trimmed to the courtyard (x ±11); the posts at x ±14.4/±20.2/±26 (inside the
  wings) are gone, ±2.8/±8.6 stay.
- Shop row: `SVENSKT KAFFE · KONDITORI` (x −11…−4) and `ESTANCO · TABACOS` (4…11), each 7 m with
  its door at the outer side; ENTRADA keeps x −4…4. The estanco's T on the canopy stays at x 6.6.
- `SOUVENIRS · REGALOS` on the west wing's courtyard face (`face(f, 'E', −11, −3.5)`, 3.8 m, posters
  in the window, the existing postcard rack in front). `FARMACIA` on the east wing's courtyard face
  (`face(f, 'W', 11, 8.8)`, 6 m), its lit green cross on a steel bracket square to the wall at the
  courtyard mouth end, so it reads from the car park and the `cita` view.
- DESIGN §6.3 keeps all eight shop names; the cell notes where they now are.

Shots: `post_cita_row`, `post_cita_row2`, `post_cita_mouth`, `post_cita_street`, `self/view_cita`.

### islandA-7 · bug · fixed (different from the proposal) — La Medina stair balustrade
Verified: `probe.mjs` stairs walk, before: on the stairs at local (2.08, −7.8) y 2.06, then 0.7 s
south → (1.66, −3.99) y 0.15 (fell into the courtyard).

The proposed full-length wall collider (`CURB + 1.1 … TOP + 1.1` from x 6.5) would have closed the
only way onto the stairs: the flight's foot is 0.5 m from the east wing (too narrow for a 0.32 m
character), and `stairs.mjs` shows the player gets on from the courtyard over the bottom ~1 m only
(start at x 6: up to y 6; starts at x 4 and 2 walk along the side of the flight). Today he walks
through the bottom of the visible balustrade to do that.

Fix: the balustrade (visual and collider) starts above the bottom three steps (x ≤ 5.0, stair line
0.80 m), with a newel post (and pole collider) at its foot:
`ramp(…, f.yaw − HP, 0.2, xs − x1, hs + 1.1, TOP + 1.1, 'wall')`.

After (`probe.mjs`): stepping south on the stairs stops at local z −7.16, y 2.24 (stays on);
walking up reaches y 6.0 on the west wing roof; walking down reaches y 0.15 at x 6.55.

### islandA-2 · bug · fixed — centre camera ceilings
Verified with `probe.mjs` chase shots at pitch 0.3–0.75 (`sheet-pre-ceil1/2.png`): above the
Centro Nórdico canopy, the La Medina and plaza arcades, the church portico and the Gasolina shop
canopy the eye went over the roof (player hidden); in the pump canopy the frame was uniform grey;
under the Casa Lola pergola the eye sat among beams and leaves. The workshop bay was already fine
(the back wall pulls the eye in), registered anyway.

Fix: `Frame.ceiling` (block-local) as proposed: in `arcade()` (both La Medina arcades and the plaza
north row; under = the roof slab), `cita` (x ±11, under 3.5 = fascia bottom, top 4.1), Casa Lola
(under 2.9), `kyrka` portico (4.0/4.8), `bensin` pump canopy (5.0/6.0), shop canopy (3.4/3.7),
workshop bays (4.0/5.0). Eye heights after (`probe.mjs` log): canopy 3.2, arcades 3.3 / 4.1, Casa
Lola 2.6, portico 3.7, pump canopy 4.7, shop canopy 3.1. Shots `sheet-post-ceil1/2.png`: the player
is in frame under every roof. DESIGN §14.3 "Registered" list updated.

### islandA-5 · ugly · fixed (pool-bar footprint differs) — hotel camera ceilings
Verified: `pre_office_walk_p6` (eye above the awning, player hidden), `pre_poolbar_walk` (thatch
fills half the frame).

Fix (hotels.js):
- SunTrip office awning: `f.ceiling(−14.5, 22.0, 14.2, 3.2, C + 2.45, C + 3.4)` (under = the
  valance bottom, the awning's lowest edge; eye 2.3).
- Pool bar: `f.ceiling(18.35, 12, 3.3, 10.2, C + 2.15, C + 4.5)`: the thatch's real front edge
  (x 16.7) to the kiosk wall (x 20), so the counter and the bartender's aisle are covered; under =
  the sign board's bottom edge (eye 2.0). The proposal's footprint (x 15.75…19.05) started 1 m in
  front of the roof and stopped short of the aisle.

Known limit (camera rig, not geometry): with the player's back pressed to the SunTrip shop window
(`office_back`), spine's climbing eye is capped by the awning ceiling at 0.6 m over the head, a
close top-down view of his shoulders (`sheet-office-back.png`; before: the top of his head from
1.5 m). See follow-ups.

### islandA-9 · off-brand · fixed
`BIERSTUBE · ÖL · BIER` → `CERVECERÍA · ÖL` (centre.js, `[N]` kept).

### filmIsland-2 · off-brand · fixed
`APARTAMENTOS TAMARINDO` → `APARTAMENTOS SOL DE INVIERNO` (town.js HOTELS rotation, DESIGN §6.5).
The sign texture shrinks the longer name to fit; the slab sign width is unchanged.

### islandB-8 · off-brand · fixed (different spot)
Verified: `pre_party_cam`, `pre_duet_cam` (no tree in either; the camera geometry in
main.js `cutTo`: PARTY_CAM at (−3, 4.15, 29) looking north, about ±40° horizontally at fov 50).

The proposed (7.6, 14.6) is at 36° (the frame's right edge, behind the near parasol) and outside the
duet camera. Moved the party `julgran` to (2.2, 16.0) instead: 22° right of PARTY_CAM's axis, clear
of Siv (16° in the group shot), of the pool coping (z ≤ 13.3) and of the sunbed at x 3.4 (0.35 m
gap), and at 30° in the sunset duet's `outroCam`. Shots `post_party_cam`, `post_duet_cam`; story
`isl_julafton_party` / `isl_julafton_duet` below.

### islandB-7 · ugly · fixed — night street lamps
Verified: `pre_night_road` (grey lanterns at night).

Fix (town.js): `export const nightGlow = new GeoBuilder()`; `lamp()` adds a warm box just outside
each lantern pane and over each star centre; `buildTown` ends with `nightLights()`, one
`MeshBasicMaterial` mesh whose `onBeforeRender` sets the draw range by the sky (`top` r + g + b <
0.8, the hotels' `nightMesh` gate), one draw call for all ~210 lamps. Block builders run inside
`buildTown`, so world-outskirts can add the coast lamps with `TOWN.nightGlow.box(...)` in world
coordinates (coast.js already imports `* as TOWN`). Shot `post_night_road` (lanterns and star lit),
`post_day_street` (unchanged by day). DESIGN §13.3.

### BL-4.3-C1a · ugly · fixed (closed rooms only)
Verified: staging's `m05_029_portier.png` and `pre_rooms_*`: "111" sat just left of the 113 opening,
"105" just left of 107's.

Fix: a closed room's number is centred on the wall above its own glass door (y C + 2.95, between
the lintel and the band under the first balconies). Open rooms (107, 113) keep their right-hand
pier: the space above their opening is the 0.15 m of terracotta band left under the balcony slab
(C + 3.6), too small for the plate. With the neighbours' numbers centred over their own doors, the
pier plate reads as the open room's. Shots `post_rooms_east/west`.

### BL-4.3-C2a · ugly · fixed
Verified: islandA's `view_guardia.png` (mast through the plaque).

Fix: the mast, its base, collider, pole and flag slices moved to x 4.6 (`MX`), beside the path; the
round paving moved with it (r 2.2, touching the path edge), clear of guardia2 (z ≤ 10.3) and the
lanterns. `self/view_guardia.png`: the `CASA CUARTEL / GUARDIA CIVIL` plaque is clear. The dark gate
leaf in the corner of that shot is the open gate seen by the harness's 14 m camera, which stands
outside the compound wall; left as is.

### islandA-8 · ugly · fixed
Verified by footprint: the bench at (6.6, −12) yaw −π/2 spans x 6.25…6.95, entirely on the stage
(x −7…7, top C + 0.4), its seat at plank level. Moved to (8.4, −12): x 8.05…8.75, 1.05 m clear of
the stage, a walkable gap (the proposal's 7.9 left 0.55 m, narrower than a character). Shots
`post_stage_bench*`. Timer re-measured below.

### BL-4.3-B4 · ugly · fixed
Verified: `pre_west_stub_air` (the outer sidewalk ring ran across the road mouth).

Fix (town.js `ground`): the west outer sidewalk piece is cut at z −45.5…−34.5 and the stub's asphalt
runs from the road edge (x −285.5) out, at CURB like the collision ground there (`isRoad` is false
beyond x −285.5), i.e. a kerb-high step from the road as at every sidewalk. The welcome sign
(x −300, z −59…−49) and the per-block ped loops are not affected. Shots `post_west_stub_air/low`,
`self/tour_welcome`.

### BL-4.3-B6 · ugly · fixed
Verified: no `placeProp`/`f.prop` in src or tools uses any of the 17 old keys (the quoted names
that exist are collision kinds: `'crate'`, `'bench'`, `'cart'`, `'hay'`, `'fence'`); `TYPES` is only
read by `placeProp`, `finalizeProps` and the `propsheet` scenario, whose list has §6.8 keys only.
Deleted `OLD`, `OLD_FLAGS` and the merge loop (props.js −92 lines). DESIGN §6.8 updated.

## Checks

All on the final code unless noted (port 8870, OUT `<scratchpad>/out-p3-r1-world-town/…`).

- `VIEWS=guardia,suntrip,cita,kasbah,plaza,bensin,kyrka,flamenco,flamencoPool views islandtour
  islandstats propsheet walk smash`: RESULT: PASS (`self.log`; contact sheets `sheet-self-views.png`,
  `sheet-self-tour.png`). islandstats: town 999k triangles, town outline 847k.
- `perf`: RESULT: PASS. Worst view island marknad 60 fps (update 1.37 + render 6.94 ms, 845 calls);
  every view 60 fps. The night glow is one more draw call (6216 triangles), drawn only after dark.
- `probe.mjs` (ad hoc, before `pre/` and after `post/`): ceilings, Centro Nórdico, stairs walk,
  room numbers, party/duet cameras, bench, west stub, night street: `no errors`; eye heights and
  stair positions as quoted above.
- `stairs.mjs` (ad hoc, before): how the player gets onto the La Medina stairs; `no errors`.
- `sky.mjs` (ad hoc): sky `top` r + g + b: day 1.007, sunset 0.472, night 0.063, so the lamps glow
  at sunset and night only (`sheet-sky.png`); `no errors`.
- `CAL=balls calibrate` (bench moved): 4 runs RESULT: PASS (p75 23.6); 12 runs RESULT: FAIL, a
  walker flake: run 11 was knocked flat by a car in the SunTrip car park, 35 m from the bench
  (`cal/balls_stuck_11.png`; "the chase did not get stuck"), the other 11 runs complete; 12 more
  runs RESULT: PASS (p75 26.5). Control with the bench at its old spot, 12 runs: RESULT: PASS
  (p75 26.8). See Timers.
- Full story `SHOTS=1 PORT=8870 node tools/shot.mjs story` on the final code (hotels.js restored to
  the 8.4 bench after the control, verified by grep): `[t] done -> #13 idle`, no `scenario failed`,
  `no errors`, **RESULT: PASS** (`story.log`). Key shots `sheet-story.png`: the party tree in
  `isl_julafton_party` and `isl_julafton_duet`.

## Timers

None changed. The only change on a timed path is the SunTrip bench (friskotek s1 balls; it moved
from on the stage to the terrace edge, off the ball lawn proper). Measured on the final code and
as a control with the bench at its old spot, same everything else:

| set | runs | p75 | median | T_ref (p75 + 3) | formula timer |
|---|---|---|---|---|---|
| bench at 8.4 (final) | 27 (4 + 11 + 12) | 25.6 | 21.8 | 28.6 | 36 |
| bench at 6.6 (control) | 12 | 26.8 | 21.6 | 29.8 | 38 |
| all | 39 | 26.4 | 21.8 | 29.4 | 37 |
| Phase 2 (DESIGN §8) | 12 | 21.9 | 18.6 | 24.9 | 32 (shipped) |

The bench has no measurable effect (the control is if anything slower), so the shipped 32 s stays
and §8 / the fixture are unchanged. The drift from Phase 2 predates this group (follow-up below).
At the shipped 32 s a p75 run (26.4 s) keeps 17.5 % of the time, a median run 32 %.

## Follow-ups for other groups

- playtest/difficulty (island-missions, friskotek s1 `TIMERS.friskotekBalls`): 39 usable runs this
  round measure p75 ≈ 26.4 s (median 21.8) against Phase 2's p75 21.9 (median 18.6) that the shipped 32 s
  comes from; the formula now gives 36–38. Not caused by world-town (control above); something
  between the Phase 2 balance step and `7f9f07d` made the chase slower, or the Phase 2 sample was
  lucky. Re-decide in the difficulty pass (DESIGN §8 row 8.7, fixture line 274).
- calibrate harness (tools): a car knocked the walker flat in the SunTrip car park in 1 of 40 ball
  runs (`cal/balls_stuck_11.png`), which fails the whole `calibrate` with "the chase did not get
  stuck". A knocked-down player should be waited out (or the run retried) instead.
- cabin/camera (camera.js): under a low camera ceiling the climbing eye of spine's tight-spot rule
  is capped at `under − 0.3`, i.e. 0.6 m over the head with his back to the SunTrip shop window
  (`sheet-office-back.png`, a close top-down view of the shoulders). Consider letting a capped
  climb slide the eye sideways along the wall or keep a minimum eye-to-head distance.
- world-outskirts (islandB-7-coast): use `TOWN.nightGlow.box(color, x, y, z, w, h, d, ry)` (world
  coordinates, while the coast builder runs inside `buildTown`; coast.js already imports
  `* as TOWN`) for the quay lamps, floodlight faces and harbour light; enclose each lit face by a
  cm so it does not z-fight the toon mesh.
- island-staging: `isl_grisfest_tonga` still frames from inside the La Medina arcade (islandA-3);
  the arcade now has a camera ceiling, which only affects the on-foot chase eye, not scene cams.
