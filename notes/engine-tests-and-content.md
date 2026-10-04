# Charter & Run: engine, test driver and Bigmouth content map

Read-only map of `charter_and_run__sallskapsresan/` as copied from `bigmouth_and_run/`
(git commit `09cc093 Copy bigmouth_and_run as the base for Charter & Run`). All `file:line`
references are to that state. Its purpose is to let the rewrite into *Charter & Run* (Sällskapsresan:
level 1 = the flight, then the Canary Islands group trip with Ole Bramserud, Swedish UI, Norwegian Ole)
be planned file by file.

## 0. Key facts first

- **The copy is byte-identical to Bigmouth except for the ports.** `src/`, `index.html`, `style.css`,
  `README.md` and `CLAUDE.md` are unchanged. The only edits are `Makefile:1` (`PORT ?= 8840`, was 8790),
  `package.json:6` (`start` on 8840), `tools/shot.mjs:15` (default `PORT` 8841, was 8791) and
  `tools/shot.mjs:11-12` (new `OUT` env var).
- **Tooling gotcha in this environment:** the rtk hook rewrites `cat`, and its output **strips JS
  comments**, which shifts every line number (`cat tools/shot.mjs` shows 455 lines, the file has 488).
  Use the Read tool or `rtk proxy cat -n` when you need line numbers. Two more rtk quirks: its `grep`
  rejects BRE `\|` (use `grep -E 'a|b'`), and its `cat` with several files can fail with
  `rtk: No such file or directory`.
- **Stale docs:** `README.md:11` and `CLAUDE.md:8` still say port 8790 (now 8840). `package.json:7` has
  `"test": "node tools/test.mjs"`, a file that does not exist; `make test` (`Makefile:28-29`) is the
  real test entry point (`node tools/shot.mjs story`).
- **The success criterion for `story` is hard-wired to Bigmouth's 7 missions** (`CLAUDE.md:11`:
  "must end with `#7 idle` and `no errors`"). `#7` is `MISSIONS.length`. Change the doc and the
  `M[]` scripts together with the mission list.
- **`shot.mjs` always exits 0**, even when scenarios fail. A scenario that times out or throws prints
  `scenario failed: <msg>` (`shot.mjs:484`), and that is **not** counted in the final `N errors` /
  `no errors` line (only page `console.error` and uncaught `pageerror` are counted, `shot.mjs:37-41`).
  So check the log for three things, not one (see §1.3).

---

## 1. Running and verifying

### 1.1 Commands

```sh
cd charter_and_run__sallskapsresan
make serve                       # python3 http.server on 127.0.0.1:8840 (no browser)
make run                         # same plus xdg-open (do NOT use for agents: opens a window)
node tools/shot.mjs story        # whole story headless, screenshots in out/
FROM=4 node tools/shot.mjs story # start at mission index 4 (the 5th mission), reloads with &mission=4
node tools/shot.mjs start views drive talk smash foot chaos traffic race flee wizard title
```

Env vars read by `tools/shot.mjs`:

| var | default | effect |
|---|---|---|
| `PORT` | 8841 (`:15`) | port of the driver's built-in static server (binds 127.0.0.1) |
| `OUT` | `<root>/out` (`:12`) | screenshot dir, `path.resolve`d against the **cwd**, created if missing |
| `W`, `H` | 1280, 720 (`:14`) | viewport and window size |
| `QUERY` | `''` (`:45`) | extra URL params appended after `?test=1&fresh=1`, e.g. `QUERY='&mission=3'` |
| `FROM` | 0 (`:133`) | `story` only: first mission index to play; reloads with `&mission=FROM` |

`ROOT` is derived from the script path (`:10`), so the driver can be run from any cwd.

### 1.2 Running in parallel

Each `node tools/shot.mjs` process starts its own HTTP server and its own headless Chrome
(`/usr/bin/google-chrome`, ANGLE over GL, real GPU, no window, `:30-33`). Parallel runs need:

- a **distinct `PORT`**: `server.listen` has no error handler, so a busy port crashes the process with
  `EADDRINUSE` before any scenario runs;
- a **distinct `OUT`**: screenshot names are fixed (`m1_done.png`, `view_birch.png`, ...) and would
  overwrite each other.

Different ports are also different localStorage origins, so saves cannot leak between runs (and
`fresh=1` ignores saved progress on load anyway, though the game still writes saves).
Defaults do not collide: `make serve` 8840, driver 8841, Bigmouth 8790/8791.

```sh
PORT=8851 OUT=/tmp/x/story node tools/shot.mjs story      > /tmp/x/story.log 2>&1 &
PORT=8852 OUT=/tmp/x/views node tools/shot.mjs views title > /tmp/x/views.log 2>&1 &
```

GPU contention slows frame rate but every wait is frame- or condition-based with generous timeouts.

### 1.3 What "passing" means

A story run passes only when **all three** hold:

1. a line `[t] done -> #<N> idle stage <k>  coins <c>`, where `N === MISSIONS.length` (today `#7`);
2. no line starting `scenario failed:` (a `waitForFunction` timeout lands here, and the run then skips
   the rest of the scenario);
3. the last line is `no errors`.

Also look out for `never became ready: <loading text>`: init threw, and the loading div shows
`Something broke: <message>` (`main.js:1121-1125`). The driver does not stop on it.

```sh
node tools/shot.mjs story 2>&1 | tee story.log
grep -q "\[t\] done -> #7 idle" story.log && ! grep -q "scenario failed" story.log && tail -1 story.log | grep -qx "no errors" && echo PASS
```

### 1.4 Baseline (the unmodified copy, run while writing this)

Three runs on the unmodified copy, each with its own `PORT` and an `OUT` in a scratch dir:

| run | result | wall time |
|---|---|---|
| full `story` #1 | missions 1-5 passed (`[t] done -> #5 idle stage 2  coins 500`), then `scenario failed: Waiting failed: 90000ms exceeded` inside M[5]'s `startMission` (no `[t] started` line, so `until(state === 'running')` timed out). **The last line still said `no errors`.** | 227 s (includes the 90 s timeout) |
| `FROM=5 story` | pass: `[t] done -> #7 idle stage 4  coins 505`, `no errors` | 43 s |
| full `story` #2 | pass: `[t] done -> #7 idle stage 4  coins 1003`, `no errors` | 179 s |

So the baseline passes, but **`story` is flaky at the start of a mission whose giver has to be
relocated**. The likely cause, from reading the code: `MissionRunner.complete()` sets
`state = 'idle'` in a promise continuation *after* the frame (`missions.js:611`), and the new giver
is only moved to `cur.at` by `placeNpcs()` in the **next** frame's `syncAll` (`main.js:950`,
`:655`). If `waitIdle` resolves in that gap, `startMission` reads the giver's **old** position
(`shot.mjs:112`), warps there and presses E more than 3.4 m from the giver, and then waits 90 s.
Only givers whose `HOMES` spot differs from their mission's `at` are affected: Duke (home
`birch` −4.8/1.8, giver at `birch` 0/0) for M[5], and Maurice (home `birch`, giver at `pizza`)
for M[6]. Andrew, Steve, Jay and Jessi have `HOMES` equal to their `at`, which is why M[1]-M[4]
never hit this.

Fixes for the rewrite (pick one or more):

- in the driver, `await frames(3)` at the top of `startMission` before reading the giver, or
  re-read after the warp and re-warp when the distance is over 3 m;
- in the game, call `g.placeNpcs()` right after `this.state = 'idle'` in `complete()`;
- in content, give each giver a `HOMES` entry equal to its mission's `at` landmark with offset 0/0.

---

## 2. `tools/shot.mjs` in detail

### 2.1 Harness

| lines | what |
|---|---|
| 17-28 | Static file server over `ROOT`. Directory requests (or anything missing) fall back to `<path>/index.html`, else 404. MIME table covers html/js/mjs/css/json/png only (add `.svg`, `.wav`, `.woff2` and so on here if the new game loads such files). |
| 30-35 | Puppeteer `headless: true`, flags `--use-gl=angle --use-angle=gl --enable-gpu --ignore-gpu-blocklist --autoplay-policy=no-user-gesture-required`, `deviceScaleFactor: 1`. |
| 36-41 | Console capture: prints page `error`, `warning` and any message starting with `[t]`; **only `error` and `pageerror` are counted** in `errors[]`. Page warnings are printed, not counted. |
| 43-49 | `fresh(query)`: `goto /index.html?test=1&fresh=1${QUERY}${query}`, waits ≤120 s for `window.__ready === true`. On timeout it logs `never became ready` and **continues**. |
| 51-58 | helpers: `sleep(ms)`, `frames(n)` (waits for `window.__frame` to advance n, 60 s timeout), `shot(name)` (3 frames, then `OUT/name.png`), `ev(fn, ...args)` = `page.evaluate`, `hold(keys, ms)`, `tap(key)` (down, 2 frames, up, 1 frame), `fps()`. |
| 480-488 | main: for each CLI arg, look up `SCENARIOS[name]` (unknown names print `unknown scenario`), call `fresh()`, run inside try/catch (`scenario failed:`), then print the error count, close the browser and the server. Every scenario starts from a **fresh page load**, but the browser and error count are shared across the scenarios of one invocation. |

### 2.2 What the game exposes for tests (engine, keep)

URL params read in `src/main.js`:

- `?test` (`TEST`, `:28`) turns on: `autoDialog = TEST` (`:71`, dialogue auto-advances in
  `hud.runDialog`, `hud.js:214`); `start()` called right after init (`:140`), so the title is skipped;
  no pointer lock (`:149`); `pause()` is a no-op and `KeyP` is ignored (`:154`, `:730`); the
  "Talk to Maurice" start toast is suppressed (`:150`).
- `?fresh` skips loading the save (`:624`). Saving still happens (`:724`, every 30 s, and on mission
  complete and collectibles).
- `?mission=N` sets `missions.index` (`:623`, `:634`).

Window globals (`main.js:1116-1120`, plus `:137`, `:684`):

| global | what |
|---|---|
| `window.__game` | the `Game` instance (see §3.4 for the fields scenarios touch) |
| `window.__lm(name)` | `layout.lm`: landmark `{x, z, yaw}`; **throws** `unknown landmark X` |
| `window.__props` | `props.js` runtime prop list (`{type, x, z, alive, def, ...}`) |
| `window.__stats()` | `{calls, tris, geos, textures, cars}` from `renderer.info` |
| `window.__ready` | set `true` at the end of `Game.init` (`:137`), before `start()` |
| `window.__frame` | frame counter, bumped every rAF (`:684`) |

`Game.debugWarp(x, z, yaw)` (`main.js:352-356`) moves the player's car (`Car.place`) or the player
(`Character.teleport`). Both **snap to ground-level floors only** (`groundAt(x, z, 0.2, 0.6)`) and
zero velocity, so a warped car arrives at speed 0, which satisfies the `speed <= 4` checks in
`pickup`/`dropoff`. You cannot warp onto a roof or an elevated floor this way.

`input._press/_release` (`input.js:103-104`) exist as test hooks but are unused; scenarios drive
real Puppeteer keyboard events.

### 2.3 Scenario catalogue and what each depends on

Everything in the "depends on" column is Bigmouth content that will break when renamed.

| scenario | lines | does | depends on (content) |
|---|---|---|---|
| `start` | 61-66 | 30 frames, fps, `__stats`, `start.png` | none |
| `views` | 67-74 | teleports to 15 landmarks, `view_<lm>.png` each | landmark list at `:68`: `birch gloub school mall pizza park gas cinema glaser jay steve cemetery construct tower field` (the same keys as `MAP_LABELS`) |
| `aerial` | 75-79 | `__game.aerial = true` top-down shot | none |
| `drive` | 80-94 | teleports beside `named.birchWagon`, taps E, drives W/WD/W | named car `birchWagon` |
| `walk` | 95-104 | walk, jump, kick | none |
| `story` | 106-252 | plays every mission (§2.4) | everything in §2.4 |
| `m3` | 255-273 | `fresh('&mission=2')`, starts Coach Steve's mission, logs van AI | NPC `steve` is giver of mission index 2; `stage.car` (follow kind) |
| `chaos` | 276-300 | wagon swerving, then `shame.add(100)`, hearses, exits car, wizard on foot | `named.birchWagon`, `shame.{v,add,hearses,wizard,pursuit}` |
| `smash` | 303-346 | rams the nearest mailbox and then a ped; checks shame and coins | `named.birchWagon`, prop type `mailbox` must exist, `g.spotFree`, `g.peds[0]` |
| `traffic` | 349-369 | 60 s of traffic, reports stuck cars, `traffic_aerial.png`, M for `bigmap.png` | none (engine) |
| `foot` | 372-402 | trampoline bounce, kicks `mosquitoes[0]`, lands on a parked sedan roof, double jump in the park | landmarks `jayTramp`, `park`; `g.mosquitoes`, `g.got.records`, `g.got.mosquitoes`; an unnamed non-traffic `sedan` parked car must exist (else TypeError) |
| `race` | 405-422 | `fresh('&mission=4')`, starts the race and idles until the opponent wins | NPC `jessi` is giver of mission index 4; `stage.{opp,cps,oi}` |
| `flee` | 425-438 | `fresh('&mission=5')`, logs the flee AI for 40 s | NPC `duke` is giver of index 5; `named.birchWagon`; `stage.{car,t,text}` |
| `wizard` | 441-451 | `shame.add(100)`, sprint, screenshot of the floating wizard | `shame.wizard` |
| `cruise` | 454-460 | puts an `AIDriver` on the player's wagon (dynamic `import('./src/actors/drivers.js')`), 6 shots | `named.birchWagon`, landmark `birchDrive`, **hard-coded `z = -40 + 2.75`** (= `rc(3) + LANE`, the road in front of the Birches) |
| `title` | 462-467 | loads **without** `test=1`, screenshot of the title card | none |
| `talk` | 469-477 | `autoDialog = false`, walks up to `npc('maurice')`, taps E, then Space twice | `maurice` must be the **mission-0 giver**: `nearestInteractable` only offers "talk" for the current giver (`main.js:775-778`) |

### 2.4 The `story` scenario

Local helpers (`:107-131`, all reusable as-is):

- `until(fn, timeout = 90000)`: `waitForFunction` at 100 ms polling.
- `warp(x, z, yaw)` = `__game.debugWarp`.
- `L(name)` = `__lm(name)` (throws on unknown).
- `state()` = `` `#${m.index} ${m.state} stage ${m.stageI ?? '-'} ${m.stage?.sub || m.stage?.text || ''}` ``.
- `startMission()`: reads `__game.npc(__game.missions.current.giver)`, exits the car if in one,
  warps to giver +1.2/+1.2, taps `KeyE` (interact radius is 3.4 m, `main.js:777`), waits ≤90 s for
  `missions.state === 'running'` (the intro dialogue auto-plays meanwhile), logs `[t] started`.
- `anyCar()`: if not in a car, enters the nearest car with `!locked && !dead && !ai` (so parked
  cars only; traffic has `ai`). **If none exists, `enterCar(null)` throws** and the scenario fails.
- `waitIdle(idx)`: waits ≤90 s for `state === 'idle' && index === idx`, which covers the mission's
  remaining stages **plus** `complete()` (1.6 s wait plus the auto-played outro dialogue), then logs
  `[t] done -> ...`.
- `finish` (`:130`) is dead code; it uses `arguments` inside an arrow function.

`FROM` (`:133-134`): reloads with `&mission=FROM`, then runs `M[FROM..]`. `M[k]` plays mission index
`k` and ends with `waitIdle(k + 1)`. The loop is `for (k = from; k < M.length; k++)` (`:251`).

Per-mission scripts:

| M[k] | lines | Bigmouth mission (`id`, giver @ `at`) | script | relies on |
|---|---|---|---|---|
| 0 | 137-145 | `wake`, maurice @ `birch` | start; `enterCar(named.birchWagon)`; until `stageI>=1`; warp 4 m ahead of `lm('gloub')` along its yaw; `waitIdle(1)`; `m1_done.png` | named car `birchWagon`; stage 0 = `getInCar`, stage 1 = `goto 'gloub'` radius 11 |
| 1 | 148-163 | `latebell`, andrew @ `gloub` | start; anyCar; until `stageI>=1`; warp to `npc('andrew')`+3/+3; until `stageI>=2`; logs andrew aboard; `m2_pickup.png`; warp `lm('school')`; `waitIdle(2)` | key `andrew`; `pickup` then `goto` (passenger, 70 s timer) then `dropoff`, both at `school` |
| 2 | 167-184 | `lostcoach`, steve @ `schoolLot` | start; anyCar; until `stageI>=1`; read `stage.car`; warp beside it; sleep 6 s; `m3_follow.png`; up to 40× warp 12 m behind `stage.car` every 1.5 s until the stage changes; `waitIdle(3)` | `follow` kind's `stage.car`; follow only starts when the player is in a car within 40 m; done when the AI has arrived and `d < 35` |
| 3 | 187-198 | `rabbits`, jay @ `jay` | start (on foot); `m4_rabbits.png`; **exactly 6×** warp onto the first alive `stage.list[]` item, 4 frames each; until `stageI>=1`; warp `lm('jay')`; `waitIdle(4)` | `rabbits` kind's `stage.list[].{alive,x,z}`; **count must be ≤ 6**; `goto 'jay'` radius 4.5 |
| 4 | 202-215 | `race`, jessi (+connie) @ `glaser` | start; anyCar; until `stageI>=1`; sleep 6 s (3.5 s countdown with car frozen); `m5_race.png`; up to 8× warp to `stage.cps[stage.pi]` keeping `playerCar.yaw`, 5 frames each; `waitIdle(5)` | `race` kind's `stage.{cps,pi,opp,oi}`; 4 checkpoints + finish = 5 ≤ 8; `g.playerCar` must exist |
| 5 | 218-232 | `hearse`, duke @ `birch` | start; anyCar; until `stageI>=1`; sleep 4 s; `m6_hearse.png`; `stage.car.damage(999, __game)`; until `stageI>=2`; warp onto `stage.item`; `waitIdle(6)`; logs `named.muscle` | `destroy` kind's `stage.car` (writes `m.data.wreck`), `grab` kind's `stage.item`; `unlock: 'muscle'` |
| 6 | 235-250 | `dance`, maurice @ `pizza` | start; anyCar; until `stageI>=1`; sleep 3 s (forced pursuit); logs `shame.pursuit`, hearse count; warp to `npc('andrew')` (pickup at `mall`); until `stageI>=2`; sleep 2.5 s; `m7_chase.png`; warp `lm('gym')`; `waitIdle(7)`; `m7_done.png` | `stage.shame` forces a pursuit; `bustFails: true`, so a hearse ram during the sleeps would fail the mission and stall the run until the 90 s timeout (not seen in 3 runs). The observed flake is the giver-relocation race in `startMission` (§1.4), which can hit M[5] and M[6]. |

What a rewrite must keep in sync:

1. `M.length` = `MISSIONS.length`, and `waitIdle(k + 1)` in each.
2. Every `L('<landmark>')` and `npc('<key>')` used by a script.
3. The **stage-kind field names** the scripts read: `stage.car` (follow, destroy), `stage.list`
   (rabbits), `stage.cps/pi/opp/oi` (race), `stage.item` (grab), `stage.sub/text` (all). If you add
   new stage kinds, give them a field the script can warp to.
4. Anything on foot (like the flight level) can use the M[3] pattern: start, then warp onto
   targets, then `goto`.
5. Each mission's intro and outro must auto-play inside the 90 s windows. Auto-dialogue takes about
   `(len + 30) / 55` s per line (`hud.js:200-214`), so a 7-line intro is about 12 s.
6. Update `CLAUDE.md:11` (`#7 idle`), `README.md:18` (`?mission=N (0-6)`) and `README.md:82-83`
   (`seven missions`, `FROM=4 ... mission 5`).
7. Fix the giver-relocation race in `startMission` (§1.4) when rewriting it. Otherwise any mission
   whose giver's `HOMES` spot differs from its `at` can flake.

---

## 3. Engine architecture (keep)

### 3.1 Module map

| file | role | exports |
|---|---|---|
| `src/main.js` | `Game` class: init, fixed 60 Hz step, input routing, seats, events, save, NPC placement, pickups, HUD feed. Mixed engine and content. | none (sets `window.__*`) |
| `src/gfx.js` | renderer, camera (fov 62), sun/hemi light, fog, toon materials, inverted-hull outlines, `GeoBuilder`, sky dome and clouds, canvas text | `THREE, renderer, scene, camera, sun, hemi, MAT, initGfx, followSun, toonGradient, outlineMat, outlineGeometry, toonMesh, mat, PRIM, makeWedge, GeoBuilder, textCanvas, signMesh, tickSky` |
| `src/input.js` | keyboard/mouse/gamepad to actions (`KEYS` `:8-22`, `PAD` `:24`) | `input` |
| `src/audio.js` | WebAudio synth sfx, engine drone, skid, horn, jingles, `shameBell`, walking-bass music loop | `audio` |
| `src/util.js` | math helpers, `mulberry32`, `pick`, `yawTo` | `TAU clamp lerp damp wrapAngle angleDiff dampAngle mulberry32 pick randRange dist2 dist fwdX fwdZ yawTo` |
| `src/world/layout.js` | grid constants, `MAP` of block types, road graph, BFS, `routeAim`, `landmarks`/`lm` | `P N HALF RHW SW LANE CURB EDGE BOUND rc blockInterior blockAt isRoad baseGround MAP blockType NN nodeId nodeI nodeJ nodeX nodeZ neighbors nearestNode findPath cellCorners routeAim landmarks lm` |
| `src/world/collision.js` | 2D footprints (BOX/CIRCLE/RAMP) with top height in a 16 m spatial hash; ground height; SAT | `BOX CIRCLE RAMP blocks addBlock box circle ramp queryBlocks contains topAt groundInfo groundAt circleVsBlock obbVsBlock obbVsObb circleVsObb segmentBlocked` |
| `src/world/town.js` | builds every block (content), fills `landmarks`, `parkedCars`, `pedLoops` | `parkedCars pedLoops animated lamps bouncers buildTown tickTown` |
| `src/world/props.js` | instanced breakable props, debris, respawn after 75-115 s when >70 m away | `placeProp finalizeProps spawnDebris breakProp tickProps propsNear props` |
| `src/actors/models.js` | procedural character models (kid/adult/monster/ghost/wizard), animation, random peds, traffic busts | `CHARS buildCharacter animateCharacter randomPed buildBust` |
| `src/actors/character.js` | on-foot physics, fling/down states, trampolines (`kind 'bounce'`), car roofs | `STEP Character` |
| `src/actors/car.js` | car models and arcade physics; player car ×2 speed (`:205-207`); car/car impulses | `CAR_TYPES Car collideCars` |
| `src/actors/drivers.js` | lane paths over the road graph, `AIDriver` modes `traffic | route | chase | flee` | `LanePath startNodes pathTo AIDriver` |
| `src/actors/peds.js` | sidewalk-loop pedestrians, dive away from cars | `Ped spawnPeds` |
| `src/actors/pickups.js` | instanced coins (pool 500), `Collectible` (record or mosquito mesh), `Rabbit` | `coins initCoins placeCoin burstCoins tickCoins Collectible Rabbit` |
| `src/game/missions.js` | stage kinds (module-private), `MISSIONS` (content), `MissionRunner` | `MISSIONS MissionRunner` |
| `src/game/shame.js` | wanted meter: pursuit by 2 hearses, wizard on foot, busted = −50 coins | `Shame` |
| `src/game/hud.js` | DOM HUD, minimap, big map, dialogue, banners, toasts, bubbles, portraits | `hud renderPortrait` |
| `src/game/camera.js` | third-person rig, car chase cam, wall pull-in, `frame(a, b)` cinematics | `CamRig` |
| `src/game/fx.js` | instanced particles and skid marks | `fx` (methods `smoke fire explosion dust sparkle sparks shame splash skid tick`) |
| `src/game/markers.js` | `Bang` (giver "!"), `Beacon` (objective beam), `GuideArrow` | `Bang Beacon GuideArrow` |

### 3.2 Init order (`main.js:74-141`) and per-frame order (`:674-725`)

Init: `initGfx`, `input.init`, `hud.init`, `fx.init`, font load (≤2.5 s), `buildTown` (fills
`landmarks`, `parkedCars`, `pedLoops`), `finalizeProps`, `initCoins`, `hud.buildBaseMap` (reads
`collision.blocks`, so it must run after `buildTown`), `placeWorldCoins`, parked cars from `parkedCars`
(named ones into `this.named[name]`), `spawnTraffic(22)`, `spawnPeds(34)`, one `Character` per `HOMES`
key into `this.npcs`, player `Character(CHARS.nick)`, records and mosquitoes, markers, `Shame`,
`MissionRunner`, `CamRig`, `load()`, `placeNpcs(true)`, player start at `lm('birch')`, portraits
(every HOMES key plus `nick` plus `shame`), `applySaveToWorld`, then `__ready = true`, then
`start()` in test mode.

Frame: hooks (dialogue, `wait`), `handleOneShots` (once per frame: mute, map, pause, reset, exit car,
jump, kick, interact), fixed steps (≤4 per frame: player intent, AI, cars, car pairs, people,
`carsVsPeople`), `syncAll` (visibility culling: cars 320 m, peds 190 m; NPC face-player, wave, chatter;
ghost bob; `placeNpcs` while idle), `missions.update`, `missions.updateFailed`, `shame.update`,
`tickPickups`, `tickProps`, `fx.tick`, `tickTown`, `updateMarkers`, camera, sun, sky, HUD, audio,
`recycleTraffic` (keeps ≥20 traffic cars), autosave every 30 s.

### 3.3 Data contracts

**Landmarks** (`layout.js:138-143`): `landmarks[name] = {x, z, yaw}`, written only by
`Frame.mark(name, lx, lz, ly)` in `town.js:53`. Yaw convention: forward = `(sin yaw, cos yaw)`.
A landmark's yaw is the direction an NPC standing there faces. Landmarks must not sit inside a
building footprint (teleport snaps to ground-level floors only).

**HOMES** (`main.js:30`): `key: [landmarkName, dx, dz]`, where dx = metres to the landmark's left
(local +X) and dz = metres forward (`main.js:663-665`). Only keys listed here get an NPC `Character`
and a portrait. `placeNpcs` (`:649-669`) moves the current mission's giver to `cur.at` (offset 0) and
`cur.extra` NPCs to `cur.at` (keeping their offsets). It doesn't move NPCs within 50 m of the player
unless the mission needs them.

**Parked cars** (`town.js:19`, `:54`): `{type, x, z, yaw, color?, name?}`. A `name` makes it
`game.named[name]`, recreatable with `ensureNamedCar(name)` (`main.js:221-232`).

**Character def** (`models.js:8-18`, also `randomPed` `:459-468`):
`{name, kind: 'kid'|'adult'|'monster'|'ghost'|'wizard', scale, voice(Hz), ...look}`.

- kid/adult/ghost look fields: `skin, hair ('swoop' 'curly' 'curlyLong' 'slick' 'balding' 'bun' 'long' 'afro' 'short' 'cap'), hairC, shirt, stripe, pants, shorts, shoes, nose ('button' 'small' 'big' 'pointy' 'long'), ears:'big', brows, freckles, glasses, mustache, whistle, cape, wide, longSleeves, headR, mouthW`.
- monster: `fur, fur2, horn, noseC, eyeC, beard, bigHair, earrings, lashes`.
- wizard: `robe, robe2, skin`.

`kind` is read in many engine places: collision radius (`character.js:20`), floating
(`character.js:30`), seated scale (`main.js:300`), car busts (`main.js:180-189`), ghost bob
(`main.js:942`), portrait background (`hud.js:188`) and camera distance (`hud.js:384`), and the model
builders (`models.js:144-147`). `name` is shown in dialogue, radio toasts, "Talk to X" and the stage
texts `Go back for X`, `You lost X`, `X won the race`.

**Car type** (`car.js:9-18`): `{name, len, wid, bodyH, cabinH, wheelR, maxSpeed, accel, grip, steer, mass, hp, cabin:[z0,z1], color?}`
plus model flags `wood, hearse, muscle, bus, icecream, bed, tall`, which pick geometry in
`buildCarModel` (`car.js:24-103`). `spec.name` shows on the speedo (`hud.js:139`). Car runtime flags
used by game logic: `traffic, locked, isTarget, isHearse, dead, ai, name, home, driver,
passengers, driverBust, damageScale, invulnerable`.

**Prop type** (`props.js:7-93`): `{r | w,d, top, coins, shame, minSpeed?, color, build(g)}`. Types:
`mailbox trashcan hydrant newsbox flamingo gnome fence woodfence cone crate bench cart pump vending barrel hay tombstone`.
`main.js:493-494` special-cases `hydrant` (splash) and `pump` (explosion).

**Mission def** (`missions.js:348-495`):
`{id, title, giver, at, reward, extra?: [keys], unlock?: 'muscle', bustFails?: bool, intro: [[who, text]], stages: [() => stage], outro: [[who, text]]}`.
`who` is a `CHARS` key. `'nick'` is the player; `'shame'` works in dialogue without being an NPC.

**Stage interface** (runner `:536-565`): `{text, sub?, shame?: true, init(g, m), update(g, m, dt) -> 'done' | {fail: string} | undefined, target(g) -> {x, z, r, follow?, checkpoint?} | null, altTarget?(g), obj?(g) -> {timer?, bar?, barLabel?, barColor?}, markers?(g) -> [{type, x, z, edge}], cleanup?(g, m)}`.
`m = {def, cars: [], items: [cleanupFn], data: {}}`. `m.cars` are removed and `m.items` run on
mission end. A stage with `shame: true` forces a pursuit (`shame.forced`).

**Stage kinds** (module-private factories in `missions.js`; engine, reuse them):

| kind | lines | options | needs a car? |
|---|---|---|---|
| `getInCar` | 18-27 | `car?` (named car, recreated if wrecked), `text?`. Any car completes it (`o.any !== false`). | yes |
| `goto` | 29-68 | `to` (landmark or `{x,z}`), `radius=7`, `timer?`, `failText?`, `radio?: [[who,text]]`, `inCar?`, `passenger?` (key; re-seats them if left behind), `text` | no, unless `inCar`/`passenger` |
| `pickup` | 70-92 | `who`, `name`, `at`, `hello?`, `text?` (teleports the NPC to `at`, sets `busy`) | yes |
| `dropoff` | 94-112 | `who`, `at`, `text` | yes |
| `follow` | 114-161 | `who, type, color?, carName?, start{x,z}, yaw?, to, via:[nodeIds], maxDist, cruise=12, wobble?, text, radio?: [text]` | yes |
| `rabbits` | 163-202 | `count, near, timer, text` (spawns `Rabbit`s 18-55 m from `near`; bar label `RABBITS n/m`) | no, works on foot |
| `race` | 204-288 | `who, passenger?, type, color?, carName?, cruise, start{x,z,offZ,yaw}, checkpoints:[[i,j]], finish{x,z}, text` (rubber-banding) | yes (spawns a spare hatch) |
| `destroy` | 290-321 | `type, carName?, timer, cruise=20, damageScale=1.5, barLabel?, text, failText?` (flee AI; driver bust is `CHARS.shame`) | yes |
| `grab` | 323-343 | `at`, `text` (spawns a big `Collectible('record')` at `m.data.wreck` or `at`) | no |

**MissionRunner** states: `idle → intro → running → outro → idle`, or `running → failed`, then
**E** retries (teleport to `lm(def.at)`) or **Q** (or 15 s) aborts (`:621-662`). `index` is the next
mission to offer; `current = MISSIONS[index]`. `complete()` (`:586-619`): cleanup, `shame.v = 0`,
banner, reward, `wait(1.6)`, brings the first non-`nick` outro speaker that is an NPC next to the
player, outro, `index++`, unlock, `save()`, then either the game-complete banner or a "new mission"
toast.

**Game API used by stages and shame** (keep these names or update every caller):
`ensureNamedCar, playerCar, radio(who, text), npc(key), charDef(key), seat(ch, car, side ±1), unseat(ch, x?, z?), say(target, text, secs), focus(), focusTarget(), exitSpot(car, side), spawnMissionCar(m, type, x, z, yaw, opts), cars, removeCar, freeSpot(cx, cz, rMin, rMax), groundAt(x, z), scene, time, enterCar, exitCar(force), freezeCar, addBust(def, car), shame, player, cinematic(a, b), endCinematic(), dialog(lines), wait(secs), addCoins(n), unlock(what), save(), input, cam`.

**Save** (`main.js:26`, `:617-644`): localStorage key `bigmouth-and-run-v1`, JSON
`{mission, coins, records: [ids], mosquitoes: [ids], unlocked: [strings]}`. `load` clamps
`mission ≤ MISSIONS.length`.

**Map markers** (`main.js:996-1015`, drawn in `hud.js:335-361`): types
`mission objective enemy friend record mosquito item`. `mapLabels()` maps `MAP_LABELS` to landmark
positions.

### 3.4 `__game` fields the scenarios touch

`debugWarp, player{x,y,z,yaw,state,onGround,teleport}, playerCar{x,z,yaw,speed,hp,type,place,vx,vz,w,height}, cars[], named{birchWagon,muscle}, npc(key), enterCar, exitCar, missions{index,state,stageI,stage,current}, coins, cam{yaw,pitch,snapNext}, aerial, shame{v,add,pursuit,hearses,wizard}, mosquitoes[], got{records,mosquitoes}, peds[], spotFree, focus(), autoDialog`.

### 3.5 Cross-file string keys (the coupling graph)

- `layout.MAP` block-type strings (`layout.js:40-48`) feed the `buildTown` switch (`town.js:795-811`)
  and `hud.buildBaseMap` colours (`hud.js:72`).
- `town.js` `f.mark(...)` landmark names feed `main.js` HOMES (`:30`), `MAP_LABELS` (`:31`), start
  position (`:122`), title orbit (`:689`), `recordSpots` (`:270`), `spawnMuscle` (`:607`), mission
  `at/to/near`, and `shot.mjs` (`:68`, `:141`, `:160`, `:195`, `:246`, `:373`, `:377`, `:394`, `:457`).
- `town.js` named parked cars feed `main.js` `named[...]`, mission `getInCar({car})`,
  `hud.niceCarName` (`hud.js:364`) and `shot.mjs` (`named.birchWagon` at `:81`, `:139`, `:277`, `:305`,
  `:432`, `:455`).
- `CHARS` keys feed `HOMES`, `CHATTER`, `MISSIONS` (giver/extra/who/passenger/intro/outro/radio),
  `missions.js:579` (hard-coded cleanup list), `main.js:968-969` (`radio('duke', ...)`), portraits,
  and `shot.mjs` `npc(...)`.
- Collectible kinds `'record'`/`'mosquito'` feed `got.records/got.mosquitoes`, the save, HUD
  legend, marker types, CSS icons, the `jingle('record')` sound, and `grab` (uses a `'record'` mesh).
- The `'muscle'` unlock string feeds `missions.js:457`, `main.js:600` and `:639`, car type `muscle`,
  and `shot.mjs:231`.

---

## 4. Bigmouth content inventory (replace), file by file

### 4.1 `index.html`

| line | content |
|---|---|
| 2 | `<html lang="en">`, change to `sv` |
| 5 | `<title>Bigmouth & Run</title>` |
| 10 | Google Fonts `Luckiest Guy` + `Nunito` (keep or retheme) |
| 22 | `<h1><span class="t1">BIGMOUTH</span><span class="amp">&amp;</span><span class="t2">RUN</span></h1>` |
| 23 | tagline `Puberty is a hit and run. Bridgeton is about to find out.` |
| 24-25 | `Play`, `Loading…` |
| 26-35 | controls card (English): `move / drive`, `look`, `sprint`, `jump (twice!) · handbrake`, `kick · in the air: stomp`, `talk · get in / out · steal cars`, `map · H horn · N mute`, `unstick · Esc pause` |
| 36 | `A fan-made tribute. Not affiliated with anyone with a real lawyer.` |
| 42-48 | `Paused`, `Resume`, `Music: on`, `Sound: on`, `Erase progress` |
| 49-56 | pause controls list |

Element ids (`title`, `play`, `loading`, `pause`, `resume`, `music`, `sound`, `reset`, `app`,
`hud`) are engine (`main.js:146`, `:156`, `:1110`, `:1128-1132`). Keep them.

### 4.2 `style.css` (theme only)

- `:1-10` palette (`--purple`, `--purple-hi`, `--pink` are the Bigmouth "shame/puberty" theme) and fonts.
- `:27` `.rec-icon` (vinyl record) and `:28` `.mos-icon` (mosquito), used by the collect toasts.
- `:30-37` `#shame` meter styling; **`:37` has text in CSS**: `content: " · RUN!"` (translate it).
- `:83` `#banner.shame` class used by shame banners.
- `:122` `#title` pink/purple gradient; `:127-129` `.t1/.t2/.amp` title colours.
- `:118` `.lg-r` / `.lg-g` legend colours for records and mosquitoes.

### 4.3 Repo docs and config

- `README.md`: everything (title, premise, characters, `?mission=N (0-6)`, seven missions,
  collectibles, code-map comments, scenario examples, `FROM=4 ... mission 5`, disclaimer). Port 8790
  is stale.
- `CLAUDE.md:1-3` title; `:8` port 8790 is stale (8840); `:11` `#7 idle`.
- `Makefile:19` `echo "Bigmouth & Run on $(URL)"`; `:27` comment `all seven missions`.
- `package.json:2` `"name": "bigmouth-and-run"`; `:4` description; `:7` broken `test` script.
- `../CLAUDE.md` (the parent folder) says "latest created game (currently: `bigmouth_and_run/`) <- UPDATE THIS WHENEVER WE MAKE A NEW GAME!". Point it at `charter_and_run__sallskapsresan/` when this game is done.

### 4.4 `src/main.js`

| line(s) | content | notes |
|---|---|---|
| 1-2 | header comment "Bigmouth & Run" | |
| 26 | `SAVE_KEY = 'bigmouth-and-run-v1'` | rename, e.g. `charter-and-run-v1` |
| 30 | `HOMES` for maurice, andrew, steve, jay, jessi, connie, duke, with landmarks birch, gloub, schoolLot, jay, glaser | defines which NPCs exist |
| 31 | `MAP_LABELS` (15 English place names to landmark keys) | big-map labels |
| 32 | `OUCH` ped hit lines (`"I'm calling your mom!"`, `'Ugh, teens!'`...) | |
| 33 | `GETUP` lines | |
| 34 | `CARJACK` lines | |
| 35-43 | `CHATTER` per NPC key | |
| 82, 89, 99, 127 | loading texts `Building Bridgeton…`, `Gassing up the cars…`, `Waking up the neighbours…`, `Drawing big mouths…` | |
| 108-109 | player `CHARS.nick`, `key = 'nick'` | player key |
| 111-112 | `records` and `mosquitoes` `Collectible`s from `recordSpots()`/`mosquitoSpots()` | |
| 121-126 | start pose: 5 m in front of `lm('birch')`, facing the house | |
| 129-132 | portraits: HOMES keys, `nick`, and `shame` (temporary wizard `Character`) | |
| 150 | start toast `Talk to <b>Maurice</b> on the lawn ...` | |
| 209 | traffic type mix incl. `'icecream'`, `'bus'` (only one traffic bus allowed, `:210`) | |
| 242-266 | `placeWorldCoins`: sidewalk lines (generic), plus arcs at grid blocks (6,4) construction ramps, (3,3) park jump, (5,0) bleachers, construction deck | block coordinates are map-specific |
| 268-280 | `recordSpots()`: 7 spots at blocks (5,0), (6,4), (2,1), (3,3), (5,6), `birchGarage` roof, `jayTramp` (+6 m, needs the trampoline) | |
| 281-284 | `mosquitoSpots()`: 7 spots by block | |
| 359 | toast `"That one's busy!"` | |
| 371 | carjack `say(pick(CARJACK))` | |
| 482 | `npc(key)` maps `'nick'` to the player | |
| 526 | banner `WRECKED!` | |
| 598-612 | `unlock('muscle')`: toast `Unlocked: <b>Maurice's Hormone Rocket</b> — parked outside the Birches'`; `spawnMuscle` at `lm('birchDrive')` and `rc(3) + LANE + 0.6` | |
| 617-640 | save/load/apply: `records`, `mosquitoes`, `unlocked` | |
| 689 | title-screen camera orbits `lm('birch')` | |
| 728 | toasts `Sound off` / `Sound on` | |
| 762 | toast `Back on the road!` | |
| 854 | NPC kicked lines `['Hey!', 'Rude!', 'Ow, Nick!', 'Why?!']` | |
| 940 | fallback chatter `'Hey Nick.'` | |
| 942 | ghost (`kind 'ghost'`) hover bob | Duke |
| 947 | `talker === 'nick'` | |
| 958-971 | records: `Duke's Lost Record n/7`, `radio('duke', 'All seven! ...')` + 250 coins, `radio('duke', 'One of my records! ...')` | 7 hard-coded |
| 978 | mosquito buzz sfx near mosquitoes | |
| 983-994 | `squash`: `Anxiety Mosquito squashed n/7`, `All the Anxiety Mosquitoes are gone. You feel... calm? +250 coins` | 7 hard-coded |
| 1010-1011 | minimap markers `record`/`mosquito` within 45 m | |
| 1050-1051 | prompts `<b>E</b> Talk to ${name}`, `Steal car`, `Get in` | |
| 1124 | `Something broke: ` | |
| 1130 | `confirm('Erase your progress and start over?')` | |
| 1131-1132 | `Music: on/off`, `Sound: on/off` | |

### 4.5 `src/game/missions.js`

- `:1-2` header comment ("seven missions around Bridgeton").
- Generic English stage strings (translate; they are engine defaults):
  `:19` `Get in a car` · `:37` `Out of time!` · `:44` `Get back in a car!` · `:48` `` `Go back for ${name}!` `` ·
  `:55` `Never leave me again!` · `:71` `` `Pick up ${o.name}` `` · `:82` `Get in a car!` ·
  `:85` `Slow down to pick them up!` · `:88` `Go go go!` · `:103` `Stop the car!` ·
  `:141` `LOSING HIM!` / `DISTANCE` · `:144` `` `You wrecked ${name}'s ride!` `` · `:148` `Get in a car!` ·
  `:156` `` `You lost ${name}!` `` · `:184` `` `RABBITS ${got}/${count}` `` · `:187` `The rabbits got away!` ·
  `:197` `` `Got a rabbit! ${got}/${count}` `` · `:248` `1ST · CHECKPOINT` / `2ND · CHECKPOINT` ·
  `:262-263` `GO!` · `:270` `Get back in a car!` · `:281` `` `${name} won the race!` `` · `:314` `TARGET` ·
  `:318` `It got away!` · `:319` `Get in a car!`.
- Content baked into stage kinds: `:283` comment about Jessi; `:307` destroy target driver bust is
  `g.charDef('shame')`; `:328` grab spawns a `'record'` mesh; `rabbits` uses `Rabbit` (white bunnies).
- `:348-495` **`MISSIONS`**, all seven (ids `wake latebell lostcoach rabbits race hearse dance`), with
  every title, intro and outro line, stage texts, radio lines, the givers maurice/andrew/steve/jay/
  jessi/duke/maurice, `at` = birch/gloub/schoolLot/jay/glaser/birch/pizza, and destinations gloub,
  school, park, jay, mall, gym. Mission-specific data: follow `start: {x: rc(4) + 34, z: rc(1) + LANE + 0.4}`
  and `via` node ids (`:402`); race start/checkpoints `[[6,2],[6,5],[2,5],[2,2]]`/finish (`:444-446`);
  car names `steveVan2`, `jessiRacer`, `wizardHearse`; `unlock: 'muscle'`; `bustFails: true`.
- Runner strings: `:523` `` `Mission ${i} of ${n}` `` · `:592` `MISSION COMPLETE!`, `` `+${reward} coins` `` ·
  `:614` `BRIDGETON COMPLETE!` / `You survived puberty. For now.` · `:617` `` `New mission: find <b>${name}</b> ...` `` ·
  `:626` `MISSION FAILED` · `:637` `<b>E</b> Retry mission · <b>Q</b> Give up` · `:652` `Try again!` ·
  `:665` `The Shame Wizard caught you!`.
- **`:579` hard-coded NPC key list** `['andrew', 'steve', 'jessi', 'connie', 'jay', 'maurice', 'duke']`
  in `cleanupMission`. It must match the new HOMES keys exactly: a missing key makes `n.car` throw
  (TypeError on undefined).
- `:597` outro speaker selection skips `'nick'`.

### 4.6 `src/game/shame.js` (the wanted meter: mechanic is engine, theme is content)

- `:1-3` comments; `:15-22` `TAUNTS` (`'SHAAAAME!'`, `'I know what you did, Nicholas!'`, ...).
- `:51` banner `SHAAAME!` / `The Shame Wizard is coming for you`; `:88` `SHAME SHAKEN` / `You gave the Wizard the slip`;
  `:103` `SHAMED!` / `` `The Shame Wizard took ${lost} coins` `` / `You have nothing left to lose`.
- `:66` pursuers are car type `'hearse'` (`car.isHearse` is read by `main.js:508`); `:69` speed 28;
  `:71` and `:120` use `CHARS.shame` (bust in hearses, floating on-foot chaser).
- Mechanics worth knowing: meter `v` 0-100; at 100, `startPursuit` spawns 2 chasers 70-150 m away
  on road nodes; on foot a non-solid floating chaser moves at 7.4 m/s (sprint is 8.8); caught at
  1.4 m, or rammed with impact > 1.5, costs `min(coins, 50)`; decays when the player is more than
  22/42 m from the chasers; `forced` (mission stage `shame: true`) keeps it at 100.
  **`locked` is never set to `true` anywhere** (only reset at `missions.js:542`), so a mission that
  must not trigger pursuit (the flight?) has to set `g.shame.locked = true` itself.
- Shame amounts per offence live in `main.js` (`:373` carjack 8, `:492` props by `def.shame`,
  `:509` car bumps, `:532` wreck 12, `:542` running people over 14/18, `:847` kick ped 9, `:868` 2) and
  `props.js` `shame:` fields.

### 4.7 `src/game/hud.js`

| line | content |
|---|---|
| 25 | meter label `SHAME` |
| 28 | speedo unit `MPH`; `:134` converts with `* 2.237`. For km/h use `* 3.6` |
| 34 | dialogue next hint `E ▸` |
| 36 | big-map legend `M to close · ! mission · ● record · ● mosquito` |
| 72 | base-map colours keyed by `MAP` block types (`res school field tower cinema glaser mall shops park gas construct cemetery birch gloub jay steve`) |
| 188 | portrait background: `'nick'` blue, `kind monster` purple, `kind wizard` dark |
| 331 | big-map legend `Duke's records n/7 · Anxiety mosquitoes n/7` (7 hard-coded) |
| 353-356 | marker colours for `record`/`mosquito` |
| 364 | `niceCarName`: `birchWagon "Birches' Wagon"`, `martySedan "Marty's Sedan"`, `steveVan "Coach's Van"`, `glaserHatch "Glaser Hatchback"`, `schoolBus 'School Bus'` |
| 384 | portrait camera distance per `kind` |

Engine notes: `toast`, `setPrompt`, `showCollect` and `radio` use `innerHTML` (HTML allowed);
`showBanner`, objective and dialogue use `textContent`. Banner strings are uppercase in the source,
and no CSS `text-transform` is applied.

### 4.8 `src/actors/models.js`

- `:8-18` **`CHARS`**: `nick` (player), `andrew`, `jessi`, `jay`, `steve` (`'Coach Steve'`), `maurice`
  (monster), `connie` (monster), `duke` (`'Duke Ellington'`, ghost), `shame` (`'Shame Wizard'`, wizard).
- `:2`, `:451` comments; the builders `buildMonster` (`:231-312`, hormone monster) and `buildWizard`
  (`:314-375`) are Bigmouth-flavoured but reusable as body types (e.g. the wizard robe as a long
  dress or a priest). Kid/adult builders are generic. Hair styles, noses and so on are listed in §3.3.
- `:453-468` ped palettes and `randomPed` (generic; maybe more tourists and sunburn tones).

### 4.9 `src/actors/car.js`

- `:12` `wagon` `'Family Wagon'` (wood panels flag), `:15` `hearse` `'Hearse'` (purple trim,
  `hearse` model flag), `:16` `muscle` `'Hormone Rocket'`, `:17` `bus` `'School Bus'` (yellow),
  `:18` `icecream` `'Ice Cream Truck'`; the other names are English (`Sedan`, `Hatchback`, `Van`,
  `Pickup`). The names show on the speedo.
- Physics (`:118-383`, `collideCars`) is engine.

### 4.10 `src/actors/pickups.js`

- `:1-2` comment; `:105-113` record (vinyl) geometry; `:115-146` `Collectible(scene, kind, id, x, y, z)`:
  `kind === 'record'` gives a vinyl with a light beam, **anything else gives a mosquito mesh**
  (`:119`). Ticking differs by kind (`:131-140`).
- `:148-171` mosquito mesh; `:174-241` `Rabbit` (white bunny, flees within 7 m, wanders home).
- Coins (`:9-102`) are engine.

### 4.11 `src/actors/peds.js`

- `:68` dodge lines `['Whoa!', 'Watch it!', 'AAAH!', 'Slow down!', 'Jeez!']`. Everything else is engine.

### 4.12 `src/world/layout.js`

- `:1` comment "Bridgeton"; `:40-48` **`MAP`** (7×7 block types).
  Engine constants: `P = 80` road pitch, `N = 7`, `HALF = 280`, `RHW = 5.5`, `SW = 3.5`, `LANE = 2.75`,
  `CURB = 0.15`, `EDGE = 289`, `BOUND = 314`. Block interior is 62×62 m (`blockInterior`).
  Block (i, j) spans `x ∈ [rc(i), rc(i+1)]`, `j = 0` is north (−z).

### 4.13 `src/world/town.js` (almost all content)

Generic, reusable pieces: `Frame` (`:29-63`), `tree` (`:68-86`, kinds round/pine/dead), `lamp`,
`bush`, `house` (`:107-194`), `window_`, `trampoline`, `shed`, `swingset`, `pool`, `residential`
(`:239-269`), `streets` (`:684-735`), `outskirts` (`:737-764`), `addPedLoops`, `buildTown` dispatch
(`:775-821`).

Bigmouth-specific blocks, signs, landmarks and named cars:

| fn (lines) | block type | signs | landmarks (`f.mark`) | named parked cars |
|---|---|---|---|---|
| `birchHouse` 274-287 | `birch` (lot 1) | `THE BIRCHES` | `birch`, `birchGarage`, `birchDrive` | `birchWagon` (wagon) |
| `gloubHouse` 288-294 | `gloub` (lot 4) | `GLOUBERMAN` | `gloub`, `gloubDrive` | `martySedan` |
| `jayHouse` 295-308 | `jay` (lot 1) | `BILZERIAN` | `jayTramp`, `jay` | none |
| `steveHouse` 309-319 | `steve` (lot 4) | `COACH'S PLACE` | `steve` | `steveVan` |
| `school` 324-373 | `school` | `GYM`, `BRIDGETON MIDDLE SCHOOL`, flag `★ ★ ★` | `gym`, `school`, `schoolLot` | `schoolBus` (+ 1 unnamed bus) |
| `footballField` 375-402 | `field` | `BOBCATS 0 · GUESTS 0` | `field` | none |
| `waterTower` 404-433 | `tower` | band `BRIDGETON` | `tower` | none |
| `cinema` 435-452 | `cinema` | `NOW SHOWING: PUBERTY 2 · THE RETURN`, `CINEPLEX` | `cinema` | none |
| `apartments` 454-482 | `glaser` | `GLASER APTS` | `glaser` | `glaserHatch` |
| `mall` 484-500 | `mall` | `BRIDGETON GALLERIA` | `mall`, `mallLot` | none |
| `shops` 502-538 | `shops` | `TEENAGE PIZZA`, `SWEATY TOPIC`, `ZIT HAPPENS`, `FOREVER 13`, `HORMONE DEPOT` | `pizza` | ice-cream truck (unnamed) |
| `park` 540-591 | `park` | none | `gazebo`, `park`, `pond` | none |
| `gasStation` 593-622 | `gas` | `GAS 'N' GAS`, `MINI MART · SLUSHIES`, `REGULAR 3.99 / PREMIUM 4.49` | `gas` | none |
| `construction` 624-662 | `construct` | `KEEP OUT · HARD HATS` | `construct` | none |
| `cemetery` 664-680 | `cemetery` | `SHAME` (crypt) | `cemetery`, `crypt` | none |
| `outskirts` 757-763 | n/a | `WELCOME TO BRIDGETON\nPop. Puberty` | none | none |

Unused landmarks (safe to drop): `gloubDrive`, `mallLot`, `gazebo`, `pond`, `crypt`. Named cars
used only by `hud.niceCarName`: `martySedan`, `steveVan`, `glaserHatch`, `schoolBus`.

`residential` lots: `special.lots[idx]` with `idx = side * 3 + k` (0-5), `ew` = streets east/west.
Houses use `rnd = mulberry32(20171229)` (`:10`), so the whole town is deterministic: changing the
order of `rnd()` calls changes every later house.

Map-specific constants hard-wired elsewhere: `main.js:257-265` (coin arcs at blocks (6,4), (3,3),
(5,0)), `main.js:268-284` (records and mosquitoes by block), `main.js:609` and `shot.mjs:457`
(`rc(3)` road), `missions.js:402` and `:444-446` (follow and race routes by grid node).

### 4.14 `src/audio.js`

- `:135` jingle `record`; `:140-147` `shameBell`; `:150-201` music: a swung 132 bpm walking-bass
  jazz loop ("the Duke would approve"). Replace it with something that fits Sällskapsresan (avoid
  reproducing real songs' melodies). The synth sfx (`:101-115`) are generic.

### 4.15 `src/game/fx.js`, `markers.js`, `camera.js`, `input.js`, `gfx.js`, `util.js`, `collision.js`, `props.js`, `character.js`, `drivers.js`

Engine. Only `fx.shame` (purple puffs, `fx.js:75-80`) carries theme colour. Prop types are generic
suburban furniture; new themed props (sunbeds, parasols, palm trees) can be added to `props.js`
`TYPES` (each type is one `InstancedMesh`).

### 4.16 `tools/shot.mjs` content references

`:68` views list · `:81`, `:139`, `:277`, `:305`, `:432`, `:455` `named.birchWagon` · `:136-250` story
`M[]` (§2.4) · `:155`, `:158`, `:241` `npc('andrew')` · `:231` `named.muscle` · `:246` `L('gym')` ·
`:256-257` mission 2 / `npc('steve')` · `:373`, `:377` `jayTramp` · `:381-386` `mosquitoes`,
`got.mosquitoes`, `got.records` · `:394` `park` · `:406-407` mission 4 / `npc('jessi')` ·
`:426-427` mission 5 / `npc('duke')` · `:457` `birchDrive` and `-40 + 2.75` · `:470` `npc('maurice')`.
Comments at `:136-234` name Bigmouth missions.

---

## 5. Rename checklist by key

| key / concept | every place it appears |
|---|---|
| player `nick` | `models.js:9`; `main.js:108-109, 130, 482, 854, 940, 947`; `hud.js:188`; `missions.js:597` + dialogue lines |
| NPC keys `maurice andrew steve jay jessi connie duke` | `models.js:10-16`; `main.js:30, 36-42, 968-969`; `missions.js:350-494` (giver/extra/who/passenger/dialogue), `:579`; `shot.mjs:155, 158, 241, 257, 407, 427, 470` |
| villain `shame` | `models.js:17`; `main.js:131-132`; `shame.js:71, 120`; `missions.js:307, 469, 477, 491`; theme strings in §4.6 |
| collectibles `records` / `mosquitoes` (7 each) | `main.js:69, 111-112, 268-284, 619, 630-631, 637-638, 958-994, 1010-1011`; `hud.js:36, 331, 353-356`; `pickups.js:105-171`; `style.css:27-28, 118`; `audio.js:135`; `shot.mjs:376, 381-386` |
| unlock `muscle` | `car.js:16`; `main.js:598-612, 639`; `missions.js:457`; `shot.mjs:231` |
| landmarks | §3.5 and §4.13; `shot.mjs` refs in §4.16 |
| named car `birchWagon` | `town.js:281`; `missions.js:361`; `hud.js:364`; `shot.mjs` (6 places) |
| save key | `main.js:26` |
| titles | `index.html:5, 22-23`; `README.md:1`; `CLAUDE.md:1`; `Makefile:19`; `package.json:2, 4`; `missions.js:614`; `main.js:1` |
| hazard/wanted meter "Shame" | `hud.js:25`; `style.css:30-37, 83`; `shame.js` (all strings); `missions.js:665`; car type `hearse` (`car.js:15`); `fx.shame`; `audio.shameBell` |

---

## 6. Engine constraints that matter for the Sällskapsresan brief

- **One static world, built once.** `buildTown` runs at init (`main.js:84`), and there is no level
  or scene switching. The flight (level 1) has to be either geometry somewhere in the same world that
  the player is teleported into, or a new mode the engine does not have yet.
- **There is no free space off the grid.** The grid spans ±280 (`HALF`). Sidewalk ends at 289
  (`EDGE`), random trees with colliders fill 295-344, invisible `bound` walls stand at ±314 (`BOUND`,
  `town.js:752-756`), and hill spheres (radius 140-220, centre y −20) are centred 424-487 m out
  (`town.js:747-751`). An aircraft cabin either takes a 62×62 m block (an `airport` block type) or
  needs the bounds moved.
- **No ceilings.** Collision is 2D footprints with a top height. A box is a wall if its top is above
  `y + step` and a floor otherwise; nothing can stop a jump from below. The camera pulls in only for
  walls between the pivot and the camera (`segmentBlocked`, min 1.6 m, `camera.js:68-70`), and it
  would sit inside a cabin ceiling or fuselage mesh. An interior wants a cut-away roof, a raised or
  fixed camera, or a camera mode for it.
- **Elevated floors and teleport:** `teleport`/`place`/`debugWarp` and `placeNpcs` always snap to
  ground-level floors (≤0.6 m). Anything standing on a raised floor (an airliner deck, a hotel
  balcony) must set `y` after teleporting.
- **Navigation assumes roads.** `routeAim` (`layout.js:108-123`) aims straight at targets closer than
  45 m and routes via road-grid intersections otherwise. The minimap and big map are drawn from the
  grid and `collision.blocks`. Interiors are fine if objectives stay within 45 m.
- **Missions without cars work:** `goto` (without `inCar`), `rabbits` (catch N fleeing things, timed;
  good for "catch the loose luggage" or similar), `grab`, dialogue and cinematics. `getInCar`,
  `pickup`, `dropoff`, `follow`, `race` and `destroy` need cars and roads.
- **Pursuit:** set `g.shame.locked = true` for missions where carnage must not start a pursuit
  (nothing sets it today). `bustFails` makes being caught fail the mission.
- **Character kinds:** a Norwegian Ole, Stig-Helmer and the rest fit `kid`/`adult`. `monster`,
  `ghost` and `wizard` are extra body types (furry, translucent, robed and floating). Add new looks via
  the def fields, or new hair/nose variants in `models.js:64-117`.
- **Swedish text:** speedo `MPH` to `KM/H` (`hud.js:28`, `:134` factor 3.6). `lang="sv"`. The display
  font Luckiest Guy (banners, signs via `textCanvas`, big-map labels) and Nunito are loaded from
  Google Fonts with an Impact fallback. Check å, ä and ö in a screenshot. Dialogue talk-blips only
  fire on `/[a-z]/i` (`hud.js:206`), so å/ä/ö are silent (cosmetic). Uppercase banner text is typed
  in the source (`'MISSION COMPLETE!'`), so Swedish banners need uppercase literals.
- **Determinism:** town layout and peds use seeded RNGs (`town.js:10`, `peds.js:10`, coins
  `main.js:243`). Traffic, `findPath` tie-breaks, the `destroy` target spawn and rabbits use
  `Math.random`. Story warps are robust to that.
- **CLAUDE.md conventions that bite** (still valid): yaw convention, `CURB` = 0.15, `GeoBuilder` +
  `toonMesh` for static geometry, keep materials few, never shadow the `fx` import, one-shot inputs
  in `handleOneShots`, continuous inputs in `fixedStep`.
