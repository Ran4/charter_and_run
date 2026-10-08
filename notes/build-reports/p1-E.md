# Phase 1 · WP-E · Cast & vehicles: hand-off

Worktree `/home/ran/src/html/everything_and_run/.wt/charter-E`, branch `p1-E`, commits `c63b8b3` (WIP) and
`7df393b` (final), both on top of `phase0`. Port 8865.
Screenshots are in `/tmp/claude-1000/-home-ran-src-html-everything-and-run-charter-and-run--sallskapsresan/25b591af-d9e9-4102-8669-08768ad2e553/scratchpad/out-E/`.

## Files changed (all owned)
- `src/actors/models.js`: rewritten. CHARS looks, outfits, the new def fields, the anim flags, held props, randomPed, the busts.
- `src/actors/car.js`: geometry rewritten (physics unchanged). Adds liveries and decals, the `colors` palette and `seatY()`/`fitSeats()`.
- `src/actors/pickups.js`: real COLLECT_KINDS meshes (7 pryl variants) and the Rabbit meshes. Coin and Collectible logic unchanged.
- `src/actors/peds.js`: tourists shout in Swedish, locals in Spanish.
- `src/actors/character.js`: adds the `anim.yell` default. Everything else was already in place from Phase 0.
- `tools/scenarios/cast.mjs`: the `castsheet` and `cars` scenarios.

## Done

### Cast (§2.1, §2.2)
All 33 CHARS keys have the §2.1 look. Every §2.2 outfit is done.
- **Stig ("Giraffen")**: tall and thin, with a long neck and legs. He has the swoop hair, a cowlick tuft, a mustache, round brown glasses and a long nose.
  - `arlanda`: long brown coat, scarf, tweed flat cap, red mittens.
  - `kostym`: suit, shirt V, red tie.
  - `hawaii`: red floral shirt, baggy shorts, white socks.
  - `rio`: white dinner jacket and bow tie.
- **Ole**: wide, with a belly. Curly red-brown fringe around a bald top, sideburns, a big mustache, gold pilot frames.
  - `arlanda`: trilby, beige coat, giant boombox.
  - `flyg`: white polo.
  - `sol`: yellow check shirt and aviator shades.
  - `gris`: red-and-white stripes.
  - `rio`: white jacket, bow tie, shades.
- **Majsan**: pageboy hair with bangs, blue dress with white dots, a cardigan on the plane, a white hair flower on the island.
- **Siv**: bun, red floral dress, pink top.
- **Berra**: half-long hair, walrus mustache, big tinted glasses with the pupils visible through them, plain blue tee with no slogan, denim vest. At the gate he wears a striped cowichan cardigan; on the island he adds a white cap.
- **Everyone else**: Robban, Angerud, Levander, Lasse (`jul`: tomte hat), Affe, Gabbe, José, mamma, pappa, Carmencita, the Storch couple, the porter, the stewardesses, the captain, the guard, Guardia Civil and the rest all follow §2.1.
- **Audit fix**: Ole `sol` has `print: [0xc8902a, 0xfff0b0], printStyle: 'check'`. A def check in `castsheet` asserts that every print is an array.

### New def fields (§14.6)
- **`hat`**: `trilby`, `pilot`, `tricorn` (with the flat back wall), `bucket`, `sunhat`, `tomte`, `scarf` and `cap`. `cap` takes `capStyle: 'flat'`, and every kind takes a `hatC` colour.
- **Other fields**: `dress` (a cone skirt; `pinafore` makes the dress cover the torso) and `shades`. `beard`, `tuft`, `tie`, `bowtie`, `vest`, `hairFlower` and hair `page`.
- **`print`**: confetti, dots, floral or check, drawn on the torso surface and on skirts.
- **`held`**: camera, boombox, accordion (the bellows pump), congas (they drum), cup, mirror, broom (it sweeps), giraffe, butterKnife, knacke and handbag.

### Anim flags
Every flag in §14.6 has a pose: `wings`, `cupUp`, `push`, `planeSeat`, `hold`, `flail`, `oath`, `dance`, `laugh`, `slump`, `shoeOff`, `mirror`, `film`, `giraffe`, `butterKnife` and `carryOver`.
- **`hold`**: knees bent, arms braced.
- **`dance`**: a 1979 disco point.
- **`laugh`**: holds the belly, mouth open.
- **`slump`**: asleep on his feet, or lolling when seated or carried.
- **`shoeOff`**: stands on one leg in a grey wool sock, shoe in hand.
- **`mirror`**: the hand mirror is held far out to the side.
- **`film`**: the Super 8 at the eye, lens cap on.
- **`giraffe`**: the plastic giraffe held up.
- **`butterKnife`**: knife plus knäcke pack.
- **`carryOver`**: hands up at the shoulders.
- **Held items vs flags**: held items are posed before the flags and placed after them, so a prop always sits in the final hand position. In a plane seat, a hand that holds something keeps it.

### Peds (§6.7)
- No kids; scale .94–1.08.
- 70 % Swedish tourists:
  - the three §6.7 skins and loud 1970s shirts, 30 % Hawaiian;
  - shorts 55 % with white socks, a sunhat or bucket hat 35 %, a camera 10 %;
  - shades or glasses, and 1979 mustaches;
  - about half the women wear sundresses.
- 30 % locals: the two §6.7 skins. Waiters wear a white shirt and black trousers, sometimes a vest or bow tie; women wear a black dress, sometimes with a handbag.
- `randomPed(r, { flight: true })`: tourists only, in brown/orange travel clothes (long sleeves, no shorts or hats).

### Busts
- `buildBustGeo` and `buildBust` share the torso and head code with the full body, at fewer segments. Busts now have hats, glasses, ties and prints, and their arms rest forward.
- In the plane, a random ped's bust takes its sun hat off.
- A merged cabin bust is about 3.5 k triangles; it was 5.2 k before I trimmed the segments.

### Cars (§6.6)
- All types have 1979 bodies with chrome bumpers, round lamps, grilles, plates and wheel-arch shadows.
  - The hatch has a sloping rear pillar; the wagon has a long roof with a rack and no wood panelling.
  - The van is white or beige, with an open cab and a box behind it.
- **SunTrip bus**:
  - white, with yellow and orange bands;
  - the sun with rays plus "SunTrip" on both sides, in reading order from either side;
  - "17" on the front destination box, "SunTrip" on the back, no stop sign;
  - open window band with glass and orange seat backs, so window riders show;
  - open cab with the driver visible.
- **Guagua**: green with a cream band, "GUAGUA" on the front and sides.
- **Taxi**: cream body, roof box with TAXI front and back, a green LIBRE lamp, a red door line.
- **Guardia Civil Land Rover**: spare wheel on the bonnet, upright windscreen, open sides so the officer bust shows, white hard top, blue lamp, white door band lettered GUARDIA CIVIL.
- **Grisbil**: rust-coloured pickup with a slatted wooden rack and three pink pigs. The pigs stand at the front and back of the bed, leaving `addRider` 'bed' slots free.
- **Glassbil**: pink waves, a serving hatch with a striped awning, the giant cone, HELADOS boards.
- Text is drawn on shared, lit canvas-texture planes (one texture per text) and is hidden when a car burns.
- Physics numbers and `PLAYER_BOOST = 1.2` are unchanged.

### Collectibles and rabbits
- **The seven prylar**, chosen by COLLECTIBLES id:
  - `klocka`: watch with LED digits;
  - `poolpen`: pen with bubbles;
  - `kalkylator`: calculator with an alarm bell;
  - `kniv`: Swiss knife;
  - `kamera`: camera with a flash cube;
  - `glasogon`: swimming goggles;
  - `pung`: money pouch.
- **Mission items**:
  - `fena`: inflatable fin on a ripple ring, swept back along its direction of travel;
  - `flaska`: rolling bottle;
  - `juice`: cup on a tray;
  - `knacke`: SPORT-KNÄCKE pack with a printed label;
  - `asna`: donkey painted like a dalahäst;
  - `vaska`: suitcase with stickers;
  - `giraff`: plastic giraffe.
- **Rabbits**:
  - `badboll`: 6-gore beach ball;
  - `faar`: woolly sheep;
  - `blomma`: a clump of flowers, 1.2 m tall;
  - `gris`: piglet.
- Geometry is shared per kind and variant.

### Performance
- Head and neck are now one mesh, which saves two draw calls per character.
- Sphere segment counts scale with size, and print petals are hexagonal discs.
- Triangles per model, outlines included:

  | model | before | after |
  |---|---|---|
  | Stig (hawaii) | 30 k | ~17.5 k |
  | Gabbe | 39 k | ~22 k |
  | average ped | 15.9 k | ~10 k |
  | cabin bust | 5.2 k | 3.5 k (no outline) |

- No per-frame allocations: props are created lazily, once per character, and temporary vectors are module-level.

## P1 left
- Nothing from the WP-E row is left undone.
- Number plates carry a dark bar, not real `GC-1234-A` lettering (§6.6 lists the lettering as optional P2).

## Cut
- Nothing.

## Self-checks (worktree, PORT=8865, OUT=scratchpad/out-E)
- `node --check` on all 59 tracked .js/.mjs files: no failures.
- `node tools/shot.mjs castsheet cars walk drive` (log `out-E/selfcheck1.log`):
  - `[t] def checks ok`: all 33 keys × every outfit × every flag build and animate with no NaN, every print is an array, heights are sane, 300 random peds are all adults at scale .94–1.08;
  - `[t] car types sedan hatch wagon van pickup bus guagua icecream taxi guardia grisbil trolley`;
  - `[t] in car hyrbil`;
  - last lines `no errors` / `RESULT: PASS`.
- `node tools/shot.mjs api` (log `out-E/selfcheck2.log`): `[t] save {"v":1,"mission":6,…}` / `no errors` / `RESULT: PASS`.
- **Ownership check**: it prints only `node_modules`. That is the untracked `node_modules` symlink the orchestrator created; `.gitignore`'s `node_modules/` pattern doesn't match a symlink. None of my changes are outside the owned list.

## CONTRACT CHANGES

1. **`src/world/cabin.js` (A1)**: the plane should carry Swedish travellers, not island locals in shorts and sun hats.
   - Line ~231 (bust passengers): `buildBustGeo(randomPed(rnd))` → `buildBustGeo(randomPed(rnd, { flight: true }))`.
   - Line ~396 (aisle blockers): `{ ...randomPed(r), kind: 'adult', scale: 1 }` → `{ ...randomPed(r, { flight: true }), kind: 'adult', scale: 1 }`.
   - Until then, `buildBustGeo` drops a random ped's sun hat or bucket hat. Locals and shorts still appear.
   - Side effect: `randomPed` draws a different number of random values than in Phase 0, so which seats hold busts changes. Cast seats, 14C and the dodge-row C/D seats are still never busts.
2. **`src/main.js` (Phase 2)**: put busts and characters on the cab seats of the van, ice-cream van and Guardia jeep.
   - **Why**: today `addBust`, `addRider` and `seat` place busts and characters at `wheelR*0.95 + 0.9` in every `tall` car, so in those three their heads go through the roof.
   - **Workaround in my files**: `Car.sync` calls `fitSeats()`. It moves busts once, and seated characters every frame, down onto `car.seatY()`. It also shrinks a bust that would still poke through the roof (to no less than 0.72).
   - **Proposed patch**:
     - In `addBust`, `seat`, and `addRider`'s `rear`/`window` slots, use `const seatY = car.seatY();`.
     - In `addBust`, also apply `obj.scale.setScalar(Math.min(1, Math.max(0.72, (s.wheelR*0.95 + s.bodyH - 0.08 - seatY) / obj.userData.h)))` for `s.tall && !s.bus`.
     - Then delete `Car.fitSeats`/`fitBust` and the call in `Car.sync`.
   - Buses and ordinary cars keep their current seat heights.
3. **API additions** (all additive):
   - **models.js**:
     - `randomPed(r, { flight })`; ped defs carry `local: bool`, which `peds.js` uses to pick the shout language.
     - `buildBust()` sets `root.userData.h` (its height).
     - New `held` value `'handbag'` (Josés mamma).
     - New look fields beyond §14.6, documented in the models.js header: `legK armK neckK curlySides thin lashes stache sideburns glassesBig lens aviator shadesF capStyle printStyle stripes sash scarf apron belly collar suit coat epaulets badge chain belt pinafore baggy legsC hands`.
     - Phase 0 approximations replaced: Carmencita's `stripe` is now `scarf`, Städerskan's is now `apron`, the Grisfestvärd's is now `sash`. The `hair: 'cap'` hacks are now real `hat: 'cap'`.
   - **car.js**:
     - Spec flags `hatch`, `wagon` (geometry only) and `colors` (the random palette; the van uses white/beige).
     - `Car.decals[]` (text planes, hidden on burn).
     - `Car.seatY()`.
     - A custom `build()` may also return `extras` (Object3Ds added to `tilt`).
   - **pickups.js**: `COLLECT_KINDS.pryl.build(id)` picks the gadget by the `COLLECTIBLES.prylar` item id. An unknown id (e.g. a `grab` quest item) gets the watch.
4. **For F/G (content, no code change)**:
   - `held` is a def/outfit field. To make a character hold something for one scene, give it an outfit with `held: 'giraffe'`, or use the `giraffe` / `butterKnife` / `film` / `mirror` / `shoeOff` anim flags, which bring their own props.
   - Ole's `rio` outfit, Lasse's `jul` and Stig's `rio` exist as §2.2 describes.

## Notes for the next agents
- `castsheet` and `cars` build a "photo studio" 60 m above the plaza, with a floor, a backdrop, a fixed cutaway camera, the HUD hidden and DOM name labels. Any scenario can reuse it: call `installStudio` in the page, then `window.__cs.char(def, x, z, yaw, flags, label)`, `.obj(...)`, `.cam(...)` and `.labels()`.
- `castsheet` also writes:
  - `cast_portraits.png`: every `hud.portraits` entry on one sheet;
  - `cast_cabin.png`: the cabin in cruise at row 16;
  - `cast_busts.png`: busts in a row.
- In the cabin, Stig's longer legs (`legK` 1.12) are angled down in plane seats (`planeSeat`: legs at −1.18 rad instead of −1.45), so his feet stay off the seat in front.
- Characters seated in ordinary cars still stick their heads through the roof. That is the Bigmouth look, and the seat heights in main.js are unchanged.

---

## Repair round 1

Commit `ca90ed6` on `p1-E` (on top of `7df393b`). Screenshots: `out-E/` (the round-0 shots moved to `out-E/prev-r0/`);
the face iterations are in `scratchpad/e-r1/s1` and `s2`.

### Files changed (all owned)
- `src/actors/models.js`: hairlines, caps, headscarf, tricorn, Stig's proportions, ped shorts, the bust hat rule.
- `src/actors/car.js`: `fitSeats` no longer allocates (new helper `fitChar`).
- `tools/scenarios/cast.mjs`: framing, the items shots, the new `heads` scenario, `portraits()` helper.

### Fixed
- **MAJOR: hair hid the eyes.** The cause was not only `bun`/`page`. Every dome hairstyle (`swoop`, `page`, `bun`, `long`, `slick`, `short`) had its front rim at 0.17–0.25 R, across the eye whites (up to 0.45 R).
  - All six domes now tip back by `HAIR_TILT = -0.62` rad, which puts the hairline at about 0.65 R in front and 0.5–0.55 R at the outer eye corner. I checked this numerically (rim height per hairstyle, and that the dome still covers every head point above the rim).
  - The `page` fringe moved up to 0.78 R and got thinner (sy .3), so the bangs end above the brows. The `swoop` and `slick` fringes also moved up.
  - Peaked caps (`hat:'cap'`) had the same fault: the peak sat at eye height and hid the eyes of hittegods, kontrollant, eslov and Berra `sol`. The cap is now tipped back with the peak at 0.7 R. The headscarf (städerskan) is also tipped further back.
  - `cast_portraits.png` shows eyes on all 33 portraits. The black eye-outline scribbles are gone.
- **The tricorn read as a beret.** It now has a flat back wall with a straight top edge and rounded corners (2.5 R wide, up to 1.75 R). It rises clearly above the crown in the front, three-quarter and side views (`heads_guardia.png`).
- **Stig** now uses the §2.1 values: scale 1.12 and wide .85.
- **Shorts rate.** The 55 % now applies to island tourists who are not in a dress. A sundress already shows the legs, so about 43 % of all tourists wear shorts.
- **Hats through car roofs (partial).** In `bustBuilder` (shared by `buildBustGeo` and `buildBust`), a random ped's bust drops its sunhat or bucket hat. Traffic drivers in ordinary cars no longer push brims through the roof. Heads still go through it; see contract change 5.
- **`Car.fitSeats`** loops over the passengers and then the driver, with no per-frame `concat`.
- **Studio framing.**
  - `row()` frames a short row as a row of five, so `cast_base_4` shows pax head to toe.
  - Items are now four shots with labels on the floor under each object: `items_prylar`, `items_kinds`, `items_rabbits`, and `items_close` (a close-up of SPORT-KNÄCKE and the dalahäst åsna).
  - The old `items.png` is gone.
- **New scenario `heads`.** It is light (about 30 s): close-ups of faces for every hairstyle and hat, female peds, the tricorn from three angles, and the portrait sheet. Use it after touching heads instead of the full `castsheet`.

### Self-checks (worktree, PORT=8865, OUT=out-E)
- `node --check` on all tracked .js/.mjs files: no failures.
- `node tools/shot.mjs castsheet cars walk drive` (`out-E/selfcheck1.log`): `[t] def checks ok`, `[t] car types sedan hatch wagon van pickup bus guagua icecream taxi guardia grisbil trolley`, `[t] in car hyrbil`, then `no errors` / `RESULT: PASS`.
- `node tools/shot.mjs api` (`out-E/selfcheck2.log`): `[t] save {"v":1,"mission":6,…}` / `no errors` / `RESULT: PASS`.
- **Ownership check**: it prints only `node_modules`, the orchestrator's untracked symlink, as in round 0.

### Contract changes this round
- **New:** CONTRACT CHANGE 5, the Phase 2 seat fit for ordinary cars (below).
- **Behaviour changes in owned files:**
  - `randomPed` draws its random numbers in a different order (because of the shorts change), so the seeded ped sequences differ again.
  - `buildBust` now also drops a random ped's sunhat or bucket hat.

## CONTRACT CHANGES (all rounds, current)
1. **`src/world/cabin.js` (A1)**: the plane should carry Swedish travellers.
   - Line ~231: `buildBustGeo(randomPed(rnd))` → `buildBustGeo(randomPed(rnd, { flight: true }))`.
   - Line ~396: `{ ...randomPed(r), kind: 'adult', scale: 1 }` → `{ ...randomPed(r, { flight: true }), kind: 'adult', scale: 1 }`.
   - Bust seat choice depends on the random sequence. Cast seats, 14C and the dodge-row C/D seats are still never busts.
2. **`src/main.js` (Phase 2)**: use `car.seatY()` for tall cars.
   - In `addBust`, `seat`, and `addRider`'s `rear`/`window` slots: `const seatY = car.seatY();`.
   - In `addBust`, for `s.tall && !s.bus`: `obj.scale.setScalar(Math.min(1, Math.max(0.72, (s.wheelR*0.95 + s.bodyH - 0.08 - seatY) / obj.userData.h)))`.
   - Then delete `Car.fitSeats`/`fitBust`/`fitChar` and the call in `Car.sync`.
3. **API additions (additive)**:
   - **models.js**:
     - `randomPed(r, { flight })` and ped `local: bool`.
     - `buildBust().userData.h`.
     - `held: 'handbag'`.
     - Extra look fields, listed in the models.js header.
     - Carmencita `scarf`, Städerskan `apron`, Grisfestvärd `sash`, and real `hat:'cap'` replace the Phase 0 hacks.
   - **car.js**:
     - Spec flags `hatch`, `wagon` and `colors`.
     - `Car.decals[]` and `Car.seatY()`.
     - A custom `build()` may return `extras`.
   - **pickups.js**: `COLLECT_KINDS.pryl.build(id)` picks the gadget by its prylar id (the watch as fallback).
4. **For F/G (content only)**: use `held` in an outfit, or the `giraffe`/`butterKnife`/`film`/`mirror`/`shoeOff` anim flags, which bring their own props.
5. **NEW, Phase 2, `src/main.js` + `src/actors/car.js`**: seat fit for ordinary cars.
   - **Problem**: busts and seated characters in sedan, hatch, taxi, wagon and pickup still put their heads through the roof. Busts sit at `wheelR*0.95 + bodyH`, and a bust is about 1.25 m tall against a cabin roof at `wheelR*0.95 + bodyH + cabinH` (about 1.64 for the hatch).
   - **Proposal**: change `car.seatY()` for low cars to `wheelR*0.95 + 0.2`, and apply the same bust-scale rule with `roof = wheelR*0.95 + bodyH + cabinH - 0.08` (scale about 0.83). In `seat()`, place the character at `seatY + 0.12 - legLen`.
   - **Decide first**: it is a visual call whether to keep the Bigmouth head-through-roof look for the player.
