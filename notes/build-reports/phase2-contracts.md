# Phase 2 step 2: contract changes, integration gaps, and the Rio end card

Repo: `charter_and_run__sallskapsresan`, branch `main`. Starts from tag `phase2-merged` (175b26c).
DESIGN.md has a "Changelog (Phase 2)" entry for this step, and every section listed below is updated.

## 1. Rio end card (§11.7, P1)

`game.playEndCard()` in `src/main.js` now plays the real end card. It used to show only the banner.
1. It clears SKANDAL, takes Stig out of any car, freezes input (`inDialog`), turns the letterbox on and flashes white.
2. It switches the sky to `sunset` and the tune to `samba`.
3. Stig and Ole change into their `rio` outfits. Stig's is not saved.
4. Stig, Majsan, Ole and Siv are placed on the yacht's aft deck at `rioBoat`. Each one is turned to face `rioCam`.
5. The camera cuts to `rioCam` and the banner shows `RIO…?` with the film's opening card.
6. After 6.6 s it flashes white again and puts the island back: sky, home set, outfits, and the player at `approachSpot('flamencoPool')`. The letterbox goes off, then the `NUEVA ESTOCOLMO KLARAT!` banner and the `complete` jingle play.
- New scenario `endcard` in `tools/scenarios/island.mjs` asserts both halves.
- Screenshots I looked at: `scratchpad/out-p2/c/endcard_rio.png` (the four on deck facing the camera, Sugarloaf, banner) and `endcard_back.png` (the Flamenco pool in hawaii clothes, completion banner).

## 2. Contract changes, item by item

### Phase 0 polish notes
- `inCutaway`, `restoreAmbience` reset, `idleAnim`, 4th-element place yaw, `padPressed`, `signBack`, `segmentBlocked`: these were already in effect, and I confirmed them. buss17 has `idleAnim: { berra: 'slump' }`. `shame.inScene` uses `inCutaway`.
- **`cabin.stopTurbulence()`**: added, and `restoreAmbience()` calls it. A turbulence running when a flight mission fails no longer keeps shaking (§5.7, §14.7).
- **Auto trolley re-bowling a downed player**: already fixed by A1, and I confirmed it. The trolley waits for a downed or flung player up to 2 m ahead, then gives 1.2 s of grace after he gets up. Now documented in §5.8.

### E
1. Cabin peds: every `randomPed` in cabin.js now passes `{ flight: true }`. That covers the lounge, the newsstand vendor, the cabin busts, the walkers and the stowers.
2. and 5. Seat fit for every car.
   - `Car.seatY()` returns wheelR·0.95 + 0.2 for ordinary cars, +0.36 for vans and the jeep, and +0.9 for buses.
   - New `Car.roofY()` and `Car.fitScale(h, base)`.
   - `main.addBust` uses `car.seatY()` and `fitScale(userData.h)`. So does `addRider`, except in the open `bed` slot.
   - `main.seat` puts the hips at seatY + 0.12 and scales the character about the hips by `fitScale(headTop − legLen)`. `unseat` already reset the scale to 1.
   - Deleted `Car.fitSeats`, `fitBust`, `fitChar` and the call in `Car.sync`.
   - Decision: no Bigmouth head-through-roof look, not even for the player. Checked in the `cars` scenario: heads sit under the roofs of the hatch, sedan, taxi, wagon, pickup, grisbil, van, jeep and ice-cream van. DESIGN §6.6 "Occupants" documents it.
3. API additions: already in effect, and I confirmed them. Documented in §14.6 (randomPed flight/local, `userData.h`, handbag, look fields, car flags hatch/wagon/colors, decals, build extras, `pryl.build(id)`).
4. Content-only, so nothing to do.
- Behaviour change (random ped draw order): documented in §14.6.

### B
- `frameRamps`, `bouncers`, `RIO_X`, the sea layout, block ground and the D2 sea-decor zones are documented in §6.4 and §14.7. The scenario names are unique: `shot.mjs` refuses duplicates, and the full list loads.
- The Rio wiring follows B's suggestion. The only change is that the cast is turned to face the camera.

### C1
- `flamenco` yaw is now π and `suntrip` yaw is now π, both in `landmarks-island.js`. I deleted the `f.mark` lines in hotels.js and updated DESIGN §6.3.
- Ole's HOMES entry is `['flamenco', 2, 1, 0]`. `placeNpcs` now honours an optional 4th tuple element, an absolute yaw (§2.3, §4.5). Ole idles facing the pool. As a giver at `flamenco` he faces the approach spot, as before.
- The rum113 yaw π was already applied by G.

### C2
- `plaza` is now (0, 6.8, π) in the table, and I deleted the `f.mark` in centre.js. Runtime positions are unchanged, because the override already applied at runtime. So cast.mjs (a studio 60 m up) and island.mjs (`foot`'s plaza +8,+8) keep their framing.
- The note that collision kind `'prop'` is reserved is now in §14.7.
- `.gitignore`: `node_modules/` changed to `node_modules`.

### D1
- No contract changes.
- The tallrikar plate-stack restyle was B's job. B restyled it to three slim stacks. Whether it still reads as a pillar is left to Phase 3.

### D2
- B's outskirts tree loop now also skips the whole Gando apron rectangle (x 172…308, z −388…−290).
- The coast's dependencies on other modules' exports are all still present.

### A2
- **Pitch has one owner now**: flightScenery (positive = nose up).
  - I deleted cabin.js's two `scenery.rotation.x` writes.
  - DESIGN §5.6 now says takeoff +0.12 (t 8–9.5), approach −0.03, climb eases 0.12 → 0.05, and cruise eases to 0.
- `PLANE_GROUND_Y`, `buildPlaneExterior({ cutaway })`, the `phaseT` getter and the `onBeforeRender` chaining note are in §5.6 and §14.7.

### A1
- `clampPitch` (§5.3), the gate solids (§5.2), walkers / `taken` / `unseatAll` / `seatCharacter` (§5.12, §14.7), the setSeatbelt semantics (§5.7), trolley mode ownership and wait (§5.8), the juice spots and FEAR juice (§5.9, §5.10), and `fx.spill` / `fx.wisp` (§14.8) are all documented.
- The stub-ground note is obsolete: A2 owns the pitch.

### H
- The audio, hud, shame, meters and strings additions are documented in §7.1 and §14.8.
- `.gitignore` is done (see C2).

### F
- Every §8.1–8.5 change is in the DESIGN literals and the `fullstory` fixture:
  - gate stage 2 gets a checkpoint with retryAt gateOle;
  - the dash timer is 10 s with fearRate 3;
  - Berra's spot is `['herrtoaDoor', 0, 2.2, 1.25]`;
  - the ombord seat timer is 15 s, and the takeoff gets a checkpoint with retryAt cabinRow14;
  - the takeoff event numbers and bubble durations;
  - the sprit timer is 35 s, plus outroPlace/outroCam;
  - landning stage 0 is 20 s and stage 1 is 10 s with a checkpoint and the seatbelt startCue;
  - the approach turbulence is [0.75, 14].
- The row-6 wrapper is noted in the §8.3 prose. The fixture keeps the timedCues form.
- §14.10 CHATTER_FLIGHT and OLE_STATS follow the shipped content.

### G
1. The race route is in DESIGN §8.12, its prose, and the fixture.
2. `race.oppSpec` is a kind option in core.js (my patch). island.js uses it, and `withOppSpec` is deleted.
3. `destroy.playerDamageScale` is a kind option (cleanup restores the old value). island.js uses `TUNING.jeep.playerDamageScale` 0.5, and `sturdyRam` is deleted.
4. Staging is summarised in a new DESIGN subsection after §8, "Shipped staging beyond the literals". The fixture keeps the bare literals.
5. Follow tuning and 6. TIMERS are written into the §8 literals and the fixture. §8 "Timers and difficulty" now lists the shipped values and states the fleeing-target rule (6b).
7. `grisfestGate` stays at (−80, −204). I confirmed this and documented why the Phase 0a z ≈ −195.5 idea is not needed.
8. `calibrate` and story `SHOTS=1` are in §16.4.
9. The fixture is updated (see F and G 1, 5, 6).

## 3. Reviewer gaps fixed (minor, integration or cheap)

| gap | fix |
|---|---|
| takeoff pitch written twice with opposite signs | one owner (A2); DESIGN sign fixed |
| two snow systems | removed A1's cabin `fx.snow` emitter; A2's point snow covers gate and takeoff |
| turbulence survives a failed flight mission | `cabin.stopTurbulence()` in `restoreAmbience()` |
| trolley re-bowls a downed player | already fixed by A1 (waits, plus 1.2 s grace); confirmed and documented |
| A2 phase-boundary snaps | cruise pitch eases 0.05 → 0 and the puffs fade in over 2 s; climb altitude starts at 32.4 |
| A1: standing jolts never interrupt the mantra | `g.interruptMantra()` on every standing jolt |
| A1: "Juice, whisky?" only at 60 % of stops | now at every stop (§5.8) |
| flamenco / plaza yaw effects on other scenes | table folded in; Ole's idle yaw; runtime positions unchanged, so the scenarios keep their framing |
| English / German words on C2 signs | `CAMBIO · VÄXLING`; `MISA 10.00 / GUDSTJÄNST 11.30` |
| 'Turister!' in DODGE_ES | locals now shout `¡Turistas!`; `Herre jävlar` tagged [F*] in DESIGN |
| heads through car roofs (E) | seat fit for all cars (above) |
| Storch witness toast during cutscenes | only when `!shame.inScene` |
| Lasse's bust radio line after a failed mission | free-roam busts only |
| bubbles overlapping (F, H) | `hud.say`: one bubble per speaker, overlapping bubbles stack upwards; the `bubbles()` helper waits each line's full time |
| F tags | cabin Storch PA [F] with the false comment removed; (t) on t 11.5 / t 14 and the Concorde exchange; stale gate[3] comment fixed |
| Robban's "Pepes Bodega" bark plays before its set-up | removed from CHATTER_FLIGHT (still in the island CHATTER) |
| E: flyg dress dots on cardigans | `print: null` in the majsan/siv flyg outfits |
| E: Lasse has no shirt print | floral print on the base shirt (`print: null` in jul) |
| E: invented look details not marked | comment above CHARS |
| B: frame columns walk-through | `f.circ(x, z, 0.25, top, 'pole')` per column |
| D2: trees on the apron | tree-band exclusion rectangle |
| D1: golf bands hidden | bands at CURB+0.035, above the fairway discs |
| D1: water discs 1 mm apart | 4–5 mm |
| D1: crags and rocks over the north ped loop | moved to z ≈ −29 with z extent ≤ 2.6 (reach ≈ −31.6; loop at −32.6) |
| D1: unlabelled invented signs | [N] tags on SANGRÍA · VINO, SOLAR · SE VENDE, OBRA, and the depth marks |
| C1: pool-sign wording | DESIGN now records the shipped three-line wording |
| H: meter middle stops | recorded in DESIGN §13.4 as shipped |
| bust triangle budget (~80 × 3.2k) | not touched: A2 measured the cabin at about 60 fps (vsync cap) after the merge, so the frame time does not suffer |

## 4. Left for later

### For the §15.3 step 5 balance pass (re-measure on the merged world)
- F's timers leave more slack than the 15–20 % target: dash 5.0 of 10 s, seat 4.4 of 15 s, round-up 7.6 of 20 s. The reviewer suggests ombord[0] at 10 s.
- G's island timers were measured on the stub world. Re-run `calibrate`. In particular:
  - buss17Drive came from the worst run, which had an impact. Clean runs suggest 55 s.
  - The jeep timer needs a check of ceil5(1.2 × p75) against a human median.
  - The night-bus race is forgiving: a run with 2 impacts still won. Try `TUNING.nattbuss.cruise` 27–28.
- Engine (G), partly fixed: AI buses now steer with `aiSteer` 0.9, and their lane paths turn from 11 m out (see section 5). The race still has its own `oppSpec` steer of 0.9, so it is unchanged in practice, but its path is about 1 m longer per left turn. Re-check it in the race calibration. A right turn is still tight for a bus (radius M − LANE = 8.25 m). Mission bus routes turn left only, but a traffic guagua can still clip a corner when it turns right.

### Phase 3 QA (minor, not integration)
- Staging and framing:
  - hittegods is hidden behind Stig in the julafton intro.
  - The camera sits behind the heads for "Hä-pååre", the haggle and the grisfest porter outro.
  - "Momento." shows the porter without the balcony.
  - The "Heia Norge!" dancers are small in frame.
- C1:
  - With `flamenco` at yaw π, the island spawn camera sits under the pergola: slats fill the top quarter, and Stig stands between the camera and Ole (C1 review `spawn7.png`). The view of the pool is fine. A Phase 3 option is a spawn landmark of its own.
  - A closed room's number sits beside the next room's opening.
  - About 50 sign meshes, so there is a draw-call cost.
- C2: in the guardia view, the flag mast hides the plaque, and the gate leaves fill a corner.
- B:
  - `dusch` and `tomatlada` props are not placed.
  - Street palms stand 0.95 m from the kerb: the chase cam can end up inside a trunk, and the palm fills half of `view_suntrip`.
  - The west entrance stub does not join the perimeter road.
  - Check that the tallrikar stacks no longer read as pillars.
- D1: the dunes read small, and the D1 blocks have no Christmas or Swedish dressing.
- D2:
  - Towels lie beside the sunbeds, not on them.
  - The airport canopy pops with no hysteresis.
  - The coast blocks are the heaviest geometry.
- A2:
  - The drift lumps stay still during the takeoff roll.
  - Debug cameras inside a cloud lump see a blue outline.
  - `phases` does not shoot the takeoff at t ≈ 10 through cabin.setPhase. `flightseq` does cover the chain.
- A1: in `trolley_waits`, a GuideArrow covers the aisle-facing camera.
- E: in `cast_flags_2` the giraffe prop is cut off by the studio framing.
- H:
  - The toast column overlaps a wide objective card.
  - The porter's bubble covers the hideout banner.
  - Luckiest Guy lowercase glyphs show in mixed-case strings.
  - Nobody has listened to the three trad melodies by ear.
- Rio card: the "orchestra" busts on the wheelhouse roof are mostly behind the banner subtitle.
- Cabin busts are about 3.2k triangles each. I left them alone, because the cabin holds about 60 fps.

## 5. Story flake found and fixed at the root (AI buses)

The first full `story` run of this step failed in mission 10 (`fataga`). The `follow` timed out after 120 s.
- With `DEBUG_FOLLOW=1 FROM=10 TO=11 story`, the excursion bus overshoots its left turn (3,1)→(2,1) to z ≈ −207. That is 4.5 m past its lane. There it wedges against D1's grisfest farm wall at x −49.4 / z −209.4 (I probed the collision blocks with `scratchpad/p2/corner.mjs`).
- Car physics gives the cause. The bus has wb = 6.5 and steer 0.52, and the max steer is scaled by speed, so its turning radius is ≈ 12 m standing still and ≈ 17 m at 6.5 m/s. The lane path's left-turn Bezier has an apex radius of ≈ 8 m.
- The merge-step story passed only because of timing luck (traffic, approach speed).
- Fix:
  - `BUS.aiSteer = 0.9` (car.js): an AI-driven bus steers like G's tuned night bus, and the player's bus keeps 0.52.
  - An AI bus's `LanePath` starts its turns 11 m out instead of 8.5 (drivers.js).
  - Turning `TURN_M_BUS` on alone did not fix it (the second diagnostic run still wedged). With `aiSteer` the bus takes the corner cleanly: (−42.6, −200.5) → (−56.5, −203.5) on its lane. Diagnostic logs: `scratchpad/p2/fataga{,2,3}.log`.
- DESIGN §6.6 ("AI buses"), §14.1 (drivers.js row) and the changelog are updated.

## 6. Verification (PORT 8870; logs in `scratchpad/p2/*.log`, shots in `scratchpad/out-p2/` and `out-p2/c/`)
- `node --check` passes on every tracked .js/.mjs file.
- `story` at the tagged HEAD: `[t] done -> #13 idle stage 5 coins 7825`, `no errors`, `RESULT: PASS` (`p2/story2.log`).
  - The first story run of this step failed in fataga (see section 5). It passed again after the fix.
- `fullstory kinds traffic` after the bus fix: fullstory `done -> #13 idle` (it plays the Rio end card through the fixture's `endCard` cue), kinds PASS, traffic 20 cars / 0 stuck / 1 bus / 60 fps; RESULT: PASS (`p2/fullkinds2.log`).
  - Earlier, before the bus fix, `fullstory kinds` also passed (`p2/fullkinds.log`).
- `api levels missions transition title` at the tagged HEAD: `no errors`, `RESULT: PASS` (`p2/core2.log`). They also passed before the bus fix (`p2/core.log`, `p2/missions.log`).
- `gate cabin trolley turbulence panic phases flightseq` PASS (`p2/flightscen.log`). The turbulence test shows the belt sign going back off afterwards, and trolley mode reverts to auto after an abort.
- `foot drive endcard` PASS (`p2/island.log`). In `foot`, the frame-deck walk still works with the new column colliders.
- `cars` PASS. I looked at the contact sheet `out-p2/cars/sheet.png` and crops: driver heads sit under the roofs.
- Screenshots I looked at:
  - `endcard_rio.png` and `endcard_back.png`;
  - `cars/sheet.png` and `crop_sf.png`;
  - `c/sheet_flight.png` (gate snow from A2 only; cabin phases);
  - `c/sheet_seq.png` (takeoff to cruise: no ground in the cabin, no stacked bubbles);
  - `c/drive_0.png` (Stig sits inside the hire car; from the high chase camera he shows only through the open side and the windscreen).

## 7. Commits and tag
- `db68829` Phase 2 contracts: apply Phase 1 contract changes, fix integration gaps, wire the Rio end card.
- `98b5a67` Phase 2 contracts: AI buses steer 0.9 and turn wider (fataga story flake); DESIGN API notes.
- Tag `phase2-contracts` is on `98b5a67`.
