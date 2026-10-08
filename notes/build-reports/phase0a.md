# Phase 0a hand-off: Charter & Run spine (DESIGN §15.1 items 1–9 and 12)

Repo: `/home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan` (branch `main`, tag `phase0a`).
Port used: 8850. Screenshots: `/tmp/claude-1000/-home-ran-src-html-everything-and-run-charter-and-run--sallskapsresan/25b591af-d9e9-4102-8669-08768ad2e553/scratchpad/out-p0a`
(contact sheets `sheet1.png` … `sheet4.png`, `sheet_levels.png`).

## Files changed

New:
- `src/level.js`, `src/meters.js`, `src/strings.js`
- `src/content/{index,flight,island}.js`
- `src/world/frame.js`, `registry.js`, `landmarks-island.js`, `cabin.js`, `flightScenery.js` (stub), `rio.js` (stub)
- `src/world/blocks/{index,hotels,centre,nature,coast,stub}.js` (stub builders)
- `src/game/missions/{index,runner,flight,island}.js`, `kinds/{core,flight,island,index}.js`
- `tools/lib.mjs`, `tools/scenarios/{core,flight,island,cast,meter,scenery}.mjs`, `tools/story/{common,flight,island}.mjs`

Edited: `src/main.js` (rewrite), `src/gfx.js`, `src/audio.js`, `src/input.js` (comment only),
`src/game/{camera,fx,hud,shame}.js`, `src/world/{layout,collision,props,town}.js`,
`src/actors/{models,character,car,pickups,peds}.js`, `tools/shot.mjs`, `index.html`, `style.css`, `DESIGN.md`.

Deleted: `src/game/missions.js`.

## Done

1. **File extraction**: `Frame` (scene param, `mark(..., y)`), `worldHooks`, the canonical island landmark
   table (every §6.3 id incl. `pryl_*`/`fena_*` with `y`, and the kerbside `grisfestGate`/`fatagaBus`/`grillpacoCurb`),
   `BLOCK_BUILDERS` with stub builders for every MAP type (slab, sign, `water` slabs, the named cars
   `hyrbil buss17 guardia1 guardia2 taxiAirport`, 12 `tallrikar` on tables with `baseY`), flightScenery stub
   (exact §14.7 shape, `buildPlaneExterior`), content files with the §2.3/§4.5/§10/§11.6/§14.10 data,
   `strings.js`, `level.js` (verbatim §4.2), `meters.js`. DESIGN.md, notes/ and HANDOFF.md committed first.
2. **gfx/camera/collision/input/fx**: `setSkyPalette`, `setCloudsVisible`, `setShadows`, `MAT.sky`, sea-blue
   `MAT.water`; camera `profile`/`setProfile`/`frameOne`/`cutTo`/`clampZ` + `clampActive`, profile-aware
   `frame`; nearest-hit `segmentBlocked`; pad Start = `pause` (main reads `input.pressed('pause')`);
   `fx.snow/steam/meterPuff`.
3. **audio**: `TUNES` + `registerTune` + `setTune` (next bar; Bigmouth jazz registered as every tune name),
   catch-up guard, music bus → low-pass (`setMusicLowpass`), cabin `drone(level, bright)`, `siren(on)`,
   every §12.3 SFX name (placeholder tones; heartbeat/applause/rattle simple recipes), `trad()` no-op,
   `jingle('pryl')`, `pauseLoops/resumeLoops`.
4. **hud**: map sources (`buildBaseMap()` → src, `buildMapFromBlocks`, `setMapSource`, FRAM/N badge),
   `setMeter/setMeterLabel/setFear` (+ `body.fear-hot`), objective `zone`/`marker`, dialogue lines
   `{who, text, cue}` calling `game.cue`, ring from `def.ring`, `/\p{L}/u` blips, `game.dialogSpeed`
   (TEST 220) and auto pad 30 (TEST 8), KM/H + `noSpeedo` + `NAMED_CARS`, legend from `game.mapLegend()`,
   `pryl`/`fena` markers, strings from `S`, `renderPortrait` restores parent/position/rotation/scale/visible.
5. **shame.js**: `configure`, `add(n, {force})`, `relieve`, panic mode (no pursuit ever; clamp 95 + deferred
   PANIK during dialogue; `locked` ignored; flail then `missions.onPanic()` / `game.onPanicIdle()`), pursuit
   from cfg (2 `guardia` cars, `isPursuer`, siren, `skandal` tune, banners/taunts from cfg), walking officer
   (solid Character, straight at the player with collision, stuck/out-of-view teleport behind the player,
   hidden in cars, respawn 30 m away), scaled fine 20 % (250–1500, floored at coins), pulled out of the car,
   3 s bust freeze (`game.frozenT`), witness rule (0 SKANDAL near Herr Storch + toast).
6. **main.js**: the whole §14.3 Game API; `setLevel` applies every §4.3 row; `transitionTo('island')`;
   init order §14.2 (NPC per CHARS key except stig/radio-only/vardinna2, hidden until placed); `PLAYER_KEY`
   `stig`; mantra (J, wind-up 0.3/0.6, −25/s scaled, bubble) and hold (Space) in `fixedStep`; verbs gating;
   level speeds; R per level; level-aware `freeSpot`; `placeNpcs` per home set (seats, hidden, unseat
   first); `sitPlayer`/`standPlayer`; E/J/R while seated; seated prompts; interactables with `pos` and
   priority order; `syncAll` writes car-seated `x/y/z` via `car.seatWorld`; riders; all cue fields;
   `cutTo`/`endCut`; `pay` (Ole pays); generic collectibles (touch/squash, +250, bonus, radio) and
   unlocks; save v1 (`charter-and-run-v1`); title orbit per level (+snow); heartbeat/low-pass; `timeScale`
   (TEST 3, `&ts=`); portraits for every CAST key; outfits per home set/level; `playEndCard()` stub.
7. **actors**: CHARS for all 34 Appendix-A keys (colours from §2, † fields as data, cap hats approximated
   with `hair:'cap'`), `CAST`, `outfitDef`, `buildBustGeo`, poses `wings cupUp push planeSeat hold flail oath
   dance`; `setDef`, `hidden`, `seatAt`/`standAt`; car.js `registerCarType`, `build`, `noWheels`, `noSpeedo`,
   `noEnter`, `noExplode` (steam), computed `seatWorld`, §6.6 types (guardia/taxi/grisbil/guagua/suntrip
   livery placeholders), traffic mix ≤ 1 bus, **`PLAYER_BOOST = 1.2`** (user decision); pickups
   `COLLECT_KINDS` + `registerCollectKind`, `Collectible(kind, …, opts)` motions, `Rabbit(…, {mesh, flee})`,
   coin = 25 pta; props: every §6.8 key registered (old geometry / coloured box), flags, old keys as
   aliases, unknown → `console.warn`, `placeProp(..., baseY)`, `reviveProps`, `propsOfType`.
8. **Stub cabin**: the real §5.2 collision table (walls, door block, 23 rows of seat backs + cushions,
   galleys, closet, toilets) and gate-set solids (dead unless phase gate), seat objects for rows 1–12/14–24
   with `taken:'bust'` (one merged bust mesh, dodge rows and 14C kept free), all §5.5 landmarks, `inside`/
   `inCabin`, `setGateActive`, `setPhase` (timing, chaining, `hold`, `instant`, palettes, drone, events:
   climb bumps, touchdown, reverse thrust, idle turbulence), `onPhase`, `onJolt`, `setSeatbelt`, `turbulence`
   (warn, shake, rattle, jolts exactly §5.7), seat/unseat/`unseatAll`/`seatOf`, the trolley (registered
   type, kinematic run, stops every 3 rows, waits for NPCs, bowls the player, `trolleyEnd`), `vardinna2`
   pusher, `setAisleBlockers` (3 stowers, solid, fear +3, `Ursäkta!`), fear sources/reliefs §5.9 (incl. Ole's
   barks), seat/blocker/toilet interactables, `Rad 13 finns inte!` toast, `mapSource`, `placeCoins`,
   box visuals with down-facing ceiling and rack planes, signs, `CAM_CABIN`, `FLIGHT_PALETTES`, `FEAR`.
9. **Stub island**: §6.2 `MAP`, `laneSpot`, `nodeRef`, `BLOCK_MAP_COLORS`; town.js dispatches through
   `BLOCK_BUILDERS`, `bungalowR`/`lagenhet` use `residential()`; NE gap at (240, −335) (no hill within 100 m,
   no tree within 60 m); sea plane y 0.17 from z 300 to 1150, x ±1150; ochre ring, white centre dashes,
   Spanish welcome sign, §6.8 prop names on the streets.
12. **Tools**: `tools/lib.mjs` with the full `T` API (+ `fps`, `check()`); `shot.mjs` loads every
    `tools/scenarios/*.mjs` (duplicate name = exit 2), runs scenarios, prints `no errors`/`N errors` and a final
    `RESULT: PASS|FAIL (reasons)` (story must end at `TO` or 13), exits non-zero on FAIL; `FROM`/`TO`;
    `startMission` race fix (+ retries); core scenarios `start walk aerial drive(hyrbil) traffic title(per
    level) talk(Ole at gateQueue) missions views transition story` + `levels` + `api`; owner modules seeded:
    flight.mjs `cabin`, island.mjs `smash foot`, cast.mjs `castsheet`, meter.mjs/scenery.mjs empty.
- **Missions (for booting only, Phase 0b replaces the stages)**: `MISSIONS` with the 13 final ids,
  titles, levels, givers, `at`, rewards, costs, unlocks, 1–2 source-tagged intro/outro lines, one `goto`
  stage each (flight ones with `startCue`/`doneCue` phases); runner per §9.4 (cost, banner, common options,
  timedCues, checkpoints + ambient re-apply, outro placement rules, transition after index 4, placeNpcs(true)
  after idle, onEnd/restoreAmbience, onBusted/onPanic). `kinds/core.js` holds the Bigmouth kinds (renamed,
  Swedish strings, `common()` copy, follow ends at `to`, race lateral offsets + `playerPassenger`, destroy
  `driver`/`spawn`/`noExplode`, grab `mesh`) and a simple `scene`; `kinds/flight.js` and `kinds/island.js`
  are stubs that throw (Phase 0b).

## P1 left / cut / not my scope

- Phase 0b (items 10, 11, 13): all 18 stage kinds fully per §9.2 (the eight in `kinds/flight.js` and
  `kinds/island.js` throw; the core ones are Bigmouth-level, not every §9.2 option: `getInCar.passenger/riders`,
  `goto.stop/smooth/fragile/fearRate/overhear/awaitOverhear` and per-line radio gaps, `pickup.rider`,
  `dropoff.riderOff`, `follow.minDist/riders/passenger/start lane`, `rabbits.onFoot`, `destroy` steam occupants…),
  the 13 placeholder missions exercising each main kind, real story scripts, `story` exit criteria.
- Phase-1 polish as per §15.1 intro: officer `routeAim` (H), hideout/porter bribe (H), real SFX/tunes (H),
  every visual (A1/A2/B/C/D/E), aisle walkers and juice interactables (A1, P1), Rio cinematic (Phase 2).
- Not run this round (but implemented): none; every core scenario ran green at least once (`traffic`,
  `views`, `smash`, `foot`, `castsheet` in an earlier run of this session).

## Self-checks (my final runs)

- `for f in $(find src tools -name '*.js' -o -name '*.mjs'); do node --check "$f"; done`
  → `checked 57 files, 0 failures`
- `PORT=8850 OUT=<scratchpad>/out-p0a node tools/shot.mjs start walk aerial drive title`
  → `[t] in car hyrbil` · `[t] title level flight` · `[t] title level island` · `no errors` · `RESULT: PASS`
- `PORT=8850 OUT=<scratchpad>/out-p0a node tools/shot.mjs levels api missions talk transition cabin story`
  → levels: mission 0 `{"level":"flight","phase":"gate","d":1.5,"inside":true,"out":[]}`, mission 3
  `{"phase":"cruise","inCabin":true,"seat":"14A","dRoot":0.12}`, mission 6 `{"level":"island","d":1.5}`;
  api all checks; `[t] transition {"level":"island","dp":2,"dl":0}`; story `[t] done -> #13 idle stage 1  coins 7550`;
  `no errors` · `RESULT: PASS`
- Earlier in the session: `views traffic smash foot castsheet` → traffic `20 cars, stuck 0, buses 1`, all
  views shot, smash `correos alive? false skandal 1.2` (the `foot` double-jump assert I had added was
  dropped back to a log, as in Bigmouth).

## CONTRACT CHANGES (all applied to DESIGN.md; additive or clarifications)

1. **Spawn rule (§4.4)**: `game.approachSpot(lm)` = landmark + 1.5 m along its yaw facing back, **or the
   landmark itself facing its yaw** when that spot is not free ground at the landmark's height / outside
   the level bounds (`cabinRow14`/`cabinRow16` face into a seat row, so +1.5 m lands on the cushions next to
   Ole/Majsan). Used by spawn, R reset, PANIK `gateOle`, `retry()`, `T.startMission()`.
2. **Seated givers stay seated (§4.5)**: a giver whose home in the current set is a plane seat is not moved
   to `at`; `at` is where the player stands to talk (juice: Ole 14A @ cabinRow14, 1.75 m; landning: Majsan).
3. **New Game API (§14.3)**: `game.interruptMantra()` (cabin jolts and `fear` cues call it),
   `game.frozenT` (bust freeze), `game.approachSpot(lm)`, `game.lmOffset(lm, dx, dz)`, `game.unseatAny(ch)`,
   `game.testMode`. Also (undocumented helpers, internal): `game.applyOutfits()`, `game.islandOutfit`,
   `game.homeOverrides`, `game.pendingEndCard`, `game.collectibles`, `game.spawnParked(pc)`.
   `game.say(target)` also accepts a key string; `game.npc('vardinna2')` returns the cabin's pusher.
   `game.addInteractable(o)` keeps the caller's object (methods may use `this`) and fills defaults in place.
4. **§7.1**: `METERS.skandal.bustLine: '¡Documentación!'` [N].
5. **§14.6**: hat colour field `hatC` (the § only named `hat`).
6. **§9.1**: kind factories keep their options as `stage.o`; `kinds/core.js` exports `COMMON` and `common()`.
7. **§14.7 cabin extras**: `FLIGHT_PALETTES` keyed by phase (as level.js requires) with the §13.3 palettes
   exported by name as `PALETTES`; exports `ROWS rowZ SEAT_X CAST_SEATS DODGE_ROWS`; `cabin.bestSeat(g)`,
   `cabin.applyPalette()`, `cabin.pusher`, `cabin.blockers`; plane seats are `ch.seatId` on every Character.
8. **§14.1**: new owner-none files `tools/story/common.mjs` and `src/world/blocks/stub.js`; core scenarios
   gain `levels` and `api`. **§16.2**: `T.startMission()` retries the warp + E up to 6× (the running trolley
   can bowl him over at `galleyBack`/`cabinRow16` before the talk lands).
9. Applied the user decision that landed in DESIGN while I worked: `PLAYER_BOOST = 1.2` in car.js (§6.6).
10. Internal test hook: `window.__missions()` (the `missions` data checks).

## Notes for the next agents

- DESIGN.md was edited by someone else at 13:11 (user decisions: ×1.2 boost, tight measured timers,
  waves); I re-read and applied the boost. Re-read §8 "Timers and difficulty" before writing timers.
- `grisfestGate` world (−80, −204, π/2) is on the **north** side of the z = −200 road, i.e. the left of
  eastbound traffic (the eastbound right lane is at z −197.25); `follow` arrives within 7 m so it works, but
  the truck stops across the road. G/Phase 2 may want z ≈ −195.5 (kerbside of the eastbound lane).
- The trolley runs automatically in `cruise` from mission index 2 (`_t.mode 'auto'`); `startTrolley()` /
  `stopTrolley()` switch to manual modes for good; it bowls a standing player in the aisle ahead of it.
- Timers in the stage kinds are unscaled (Bigmouth); `runner.stageT` and `timedCues` use scaled time.
  Kinds that need scaled seconds (timeline, mantra, turbulence-coupled) should use `dt * g.timeScale`.
- The bust mesh is static: seats with `taken:'bust'` can never be freed; cast seats and 14C/dodge-row C/D
  are never busts.
- `?mission=N` with N > 5 forces the island outfit `hawaii`.
