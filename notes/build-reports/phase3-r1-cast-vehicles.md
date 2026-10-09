# Phase 3 · round 1 · fixer "cast-vehicles"

Area: cast/vehicles (WP-E). Files touched: `src/actors/models.js`, `src/actors/car.js`,
`src/main.js` (`addRider` only), `src/content/flight.js` (`LEVEL_OUTFITS_GATE` only),
`tools/scenarios/cast.mjs`, `DESIGN.md`. Port 8870; shots and logs in
`<scratchpad>/out-p3-r1-cast-vehicles/` (ad-hoc script `adhoc_cv.mjs` there, not in the repo).

Tree at start: clean (no orphaned work from an earlier fixer).

## Items

| id | verdict | how / why |
|---|---|---|
| cast-1 | **fixed** | Reproduced (heads inside the bus roof in the critic's shots; code: `seatY` + 0.9, `roofY` Infinity). `car.js`: `seatY()` wheelR·0.95 + **0.55** for buses, `roofY()` = roof underside (− 0.22 slab) − 0.08 for buses too. Measured in bus 17: seatY 1.025, roofY 2.375; Stig k 0.813, Ole k 0.994, Majsan/Siv/Fru Storch busts k 1 (heads 2.24–2.33), Herr Storch 0.988, Gabbe in a bus k 0.868; every head top ≤ 2.375. The bus interior went down with them (floor y0 + 0.47, seat backs y0 + 0.52, was 0.35 higher; steering wheel at the sill, was + 0.15) so the busts don't sit in the floor, the seat backs don't reach their chins and the driver's face is above the wheel. Non-bus cars unchanged (same formulas). Shots: `ad/cv_bus_left/front/high/chase`, `ad3/cv_bus_front`, `cv_nightbus_*`, `cv_guagua_front`. |
| cast-2 | **fixed** | Reproduced by code (`CHARS[defKey]`). `main.addRider` uses `this.npc(defKey)?.def` first (the def `Character.setDef` keeps, i.e. the current outfit), then `CHARS`, then a random ped. Robban rides in his navy shirt and cap, Berra keeps his cap (`ad/cv_grisbil_rear34`, `cv_hyrbil_*`), Majsan her flower. |
| cast-4 | **fixed** | Reproduced (`ad2_portier_mirror`: gold back). `poseFlags` mirror: ry −0.3 (was 0.75π): the glass faces forward, a little out to his right. Checked close (`ad/cv_portier_mirror*`) and in the story cut (`st56/isl_buss17_momento`): the pale glass shows. island-missions restages the gag (BL-4.2-3). |
| cast-11 | **fixed** | Reproduced (floral yellow jacket from behind). In `printParts`, under a `suit` the print is six small dots on the V's front face (tipped back like the V box) in the print colours that differ from the V's (Lasse: white on orange). Lasse's def unchanged. Same treatment for a `vest` (the vest's front opening): Herr Storch's flowers showed through his vest once the prints lost their outline (`crop_storch.png`), now his vest is plain. |
| cast-10 | **fixed** | Verified against `notes/research-characters.md` :108, :157, :377, :449. The models.js comment now names only Stig's arlanda scarf and Fru Storch's white dress as invented; DESIGN §2.2 says the same. Lasse's jul shorts got the white hem (`shortsHem`). |
| cast-8 | **fixed** | Stig `arlanda`: `hands` 0xf4f0e6 + `mittenBand` 0x9a3a2a (a red band round each white mitten, the Nordic pattern; new arm-builder field). |
| cast-9 | **fixed** | `PROP_GEO.boombox`: body 0x2a2a30, cones 0x1d1d22 with a chrome rim ring, chrome centres kept, the cassette deck silver (0x8a8f99, was dark grey, so it reads on the black body). |
| cast-12 | **fixed** | Ole `gris` + `chain`; Robban `flyg` `collar` 0x1f2f6a, `sol` `collar` 0xffd23f + a white cap with a blue peak (new cap field `peakC` 0x2a4fa0, my reading of "vitblå keps"; a pale-blue cap would read as white at game scale); Angerud base `suit` 0x8ab0d8 (blue shirt in the V) with `sol` keeping a white V; new Angerud `arlanda` outfit (camel `coat`, `hat:'fur'` 0x5a3a22: a new round fur-hat style, since `bucket` has a brim and reads as a bucket hat) and `angerud: 'arlanda'` in `LEVEL_OUTFITS_GATE`. Seen at the gate desk in the `gate` scenario. |
| cast-3 | **fixed** | Reproduced (outline scribbles round every petal/dot, pearl skirt dots). `torsoParts` takes a print builder; `buildCharacter` adds the prints as a second mesh with no outline and no shadow (one extra draw call on printed models only); skirt dots are flat discs lying on the round cone (radius from the cone's own taper). `buildBust` (car busts) does the same; `buildBustGeo` (the cabin's and the Rio boat's merged busts) keeps them merged, as before. Triangles (castsheet): Stig hawaii 17.8k → 13.8k, Gabbe 22.0k → 17.9k, ped avg 10.1k → 10.3k. `perf` stays 60 fps everywhere. |
| cast-5 | **fixed** | Reproduced (`ad3_back_1`). Curly/curlyLong: a tilted dome cap and a nape sphere under the curls; hairline clear of the eyes (`heads_peds`, `cv_lasse_close`); backs and sides covered (`cv_back_1`, `cv_side_curly`). |
| cast-7 | **fixed** | New `skirtPrint` field (dress dots use `skirtPrint ?? print`). Siv: `print` [white, red] on the pink top, `skirtPrint` [pink, white] on the red dress; her `flyg` clears both (unchanged flight look). |
| BL-4.4-E1 | **fixed** | Reproduced (`cast_flags_2`, the giraffe off the left edge, perspective of a prop held in front). `castsheet` frames the anim-flag rows at `dist` 8.6 (was 7.2); the giraffe is whole. |

None rejected, none deferred.

## Checks (all on port 8870)

- `node tools/shot.mjs castsheet cars heads endcard riocard` → `def checks ok`, `no errors`,
  **RESULT: PASS** (`sc/`).
- `node tools/shot.mjs cars` again after the last car.js change (steering wheel) → **RESULT: PASS** (`sc2/`).
- `FROM=5 TO=6 SHOTS=1 node tools/shot.mjs story` → `done -> #6`, `no errors`, **RESULT: PASS**
  (`st56/`: heads in the bus 17 windows, nothing through the roof; the mirror's glass in the Momento cut).
- `node tools/shot.mjs gate perf` → **RESULT: PASS** (perf worst: cabin gate 60 fps, render 7.6 ms;
  island 60 fps everywhere).
- Full `node tools/shot.mjs story` (before the wheel tweak) → `[t] done -> #13 idle`, `no errors`,
  **RESULT: PASS** (`story1.log`).
- Full `node tools/shot.mjs story` on the final code → `[t] done -> #13 idle stage 5  coins 7775`,
  no `scenario failed`, `no errors`, **RESULT: PASS** (`story2.log`).
- Ad-hoc `adhoc_cv.mjs` (bus/rider/mirror/print/back/detail shots, bus fit numbers) → `no errors`.

## Timers

None changed. No route, car physics, stage start or world collider changed (the bus's seats,
floor and wheel are visual geometry inside the body; seat heights and model looks only).

## Follow-ups for other areas

- island-missions (BL-4.2-3, Momento restage): the mirror's glass now faces the porter's forward
  and slightly to his right (−0.3 rad); in the current `flamencoBalcony` cut the glass shows but the
  porter is small in frame.
- HANDOFF §4.4 E (orchestrator): the "small look inventions are unlabelled" backlog line lists three
  sourced looks; only Stig's arlanda scarf and Fru Storch's white dress are inventions (now in
  DESIGN §2.2 and the models.js comment).
- cast (not ranked by the critic, left as is): the grisbil's rear pigs poke their snouts through the
  rear rail; Stig's hair pokes ~7 cm through the white van's roof (fitScale is clamped at 0.72, he
  would need ~0.62).
