# Engine map: src/game/{hud,camera,fx,markers,shame}.js

Read-only mapping of the Bigmouth & Run engine for the conversion to **Charter & Run**. All
line refs are to the files as copied (untouched) into `charter_and_run__sallskapsresan/`.
Tooling note: the shell's `rtk` hook rewrites `cat`/`grep` output (it strips comments and
renumbers lines). For exact line numbers, use the Read tool or `/usr/bin/grep -n`.

Legend: **ENGINE** = keep as is (maybe parametrise). **CONTENT** = Bigmouth-specific, replace.

---

## 0. Module coupling at a glance

```
main.js ──imports──> hud {hud, renderPortrait}, fx, CamRig, Shame, {Bang, Beacon, GuideArrow}
missions.js ───────> hud, fx; reaches g.shame.* and g.cam.snapNext via the game object

hud.js     -> gfx {THREE, camera}, world/layout {MAP,N,P,HALF,RHW,rc,BOUND},
              world/collision {blocks,BOX,CIRCLE}, audio (talk blips)
camera.js  -> gfx {THREE}, world/collision {segmentBlocked}, util {clamp,damp,dampAngle}
fx.js      -> gfx {THREE, MAT(unused), toonGradient}
markers.js -> gfx {THREE, GeoBuilder, toonMesh, MAT(unused), outlineMat(unused)}
shame.js   -> actors/car {Car}, actors/drivers {AIDriver}, actors/character {Character},
              actors/models {CHARS}, world/layout {nodeX,nodeZ,NN,LANE,nearestNode,neighbors},
              audio, hud, fx, util {yawTo,pick}
```

The tight couplings that matter for a new map (the airplane cabin):
- **hud.js is hard-wired to the town grid**: `buildBaseMap` reads `layout.MAP/N/P/HALF/RHW`,
  `collision.blocks`. `drawMinimap` and `toggleBigMap` use the module constants
  `MAP_SCALE`/`MAP_EXT`/`HALF`.
- **shame.js pursuit is hard-wired to the road graph** (`nearestNode`, `neighbors`, `NN`) and to
  cars (hearses driven by `AIDriver` in `'chase'` mode, which plans on the same road graph).
- **camera.js collision** uses `segmentBlocked`, which works on any `collision.blocks`. That
  part is reusable inside a cabin, with the caveats in section 2.

Init order in `main.js` (lines 79–132): `hud.init()` → `fx.init(scene)` → `buildTown` →
`hud.buildBaseMap()` (needs `blocks` populated, so it must run after the world is built) → ...
→ `new Bang/Beacon/GuideArrow(scene)`, `new Shame(this)`, `new MissionRunner(this)`,
`new CamRig(camera)` → `hud.portraits[key] = renderPortrait(renderer, model)` for every cast
member, the player (`nick`) and the wizard (`shame`).

Per-frame order in `main.update` (main.js:698–725): hooks (`onFrame` fns, which include the
dialogue typewriter) → one-shots → fixed steps → `syncAll` → `missions.update` →
`missions.updateFailed` → **`shame.update(dt)`** → pickups → props → **`fx.tick(dt)`** → town →
**`updateMarkers()`** → **`cam.update(...)`** → sun/sky → **`updateHud()`** (objective, speedo,
prompt, minimap every 2nd frame, big map every 10th frame while open, `tickBubbles`) → audio.

---

## 1. HUD (`src/game/hud.js`)

`export const hud` is a singleton object. `export function renderPortrait(renderer, model, R)`.
The DOM is created by `hud.init()` as one `innerHTML` blob inside `<div id="hud">` from
index.html (hud.js:22–36). All styling is in `style.css:21–118`. Title and pause screens are
**not** in hud.js. They are static HTML in `index.html`, and main.js toggles them.

### 1.1 DOM elements created by `init()` (hud.js:20–59)

| id / class | purpose | hard-coded English text (CONTENT) |
|---|---|---|
| `#coins` `.coin-icon` `#coin-n` | coin counter top-left | — |
| `#collect` | collectible pickup card | — |
| `#shame` `.shame-label` `.shame-bar` `.shame-fill` `.shame-ticks` | the meter, top-right | `SHAME`; CSS adds ` · RUN!` in pursuit (style.css:37) |
| `#objective` `.obj-title` `.obj-text` `.obj-timer` `.obj-bar` `.obj-bar-fill` `.obj-bar-label` | mission card, top-centre | — |
| `#minimap-wrap` `canvas#minimap` (220×220) `.mm-n` | round minimap, bottom-left | `N` |
| `#speedo` `.sp-num` `.sp-unit` `.sp-hp` `.sp-hp-fill` `.sp-name` | car speed/HP, bottom-right | `MPH` |
| `#prompt` | "E Talk to …" pill | — |
| `#toasts` | stacked toasts, right | — |
| `#banner` `.banner-main` `.banner-sub` | big centre banner | — |
| `#bubbles` | world-anchored speech bubbles | — |
| `#letterbox` `.lb-top` `.lb-bot` | cinematic bars (9vh) | — |
| `#dialog` `.dlg-portrait img` `.dlg-name` `.dlg-text` `.dlg-next` | dialogue box | `E ▸` |
| `#flash` | full-screen colour flash | — |
| `#bigmap` canvas (760×760) `.bm-legend` | M-key full map | `M to close · ! mission · ● record · ● mosquito` |

When `#letterbox.on` is set, the CSS hides `#coins`, `#shame`, `#minimap-wrap`, `#speedo`
(style.css:96).

### 1.2 Methods (all on `hud`)

| method | signature / data | notes |
|---|---|---|
| `init()` | — | builds DOM, caches elements. ENGINE (relabel strings). |
| `buildBaseMap()` | — | draws the static town map once into the module-level `baseMap` canvas. **CONTENT-coupled** (see 1.4). |
| `setCoins(n)` | number | ENGINE |
| `bumpCoins()` | — | restarts the `.bump` CSS animation. ENGINE |
| `setShame(v, pursuit)` | v: 0..100, pursuit: bool | width %, class `hot` when `v > 70`, class `pursuit`. Called **every frame** from `Shame.update` (shame.js:171). ENGINE (rename for the new meter). |
| `setObjective(o)` | `null` or `{title, text, timer?, bar?, barColor?, barLabel?}` | timer is seconds, shown `m:ss`, class `urgent` < 10 s. bar is 0..1 (clamped). Uses `textContent`, so no HTML. Fed each frame from `missions.objective()`, which returns `{title: def.title, text: stage.sub \|\| stage.text, ...stage.obj(g)}` (missions.js:556–560). ENGINE |
| `setSpeedo(car)` | `null` or a Car | reads `car.forwardSpeed` (m/s × 2.237 → MPH), `car.hp / car.spec.hp`, `car.name` → `niceCarName` (hud.js:363, CONTENT: Bigmouth car names), else `car.spec.name`. For Swedish use km/h (× 3.6) and change `MPH`. |
| `setPrompt(html)` | string, `''` hides | `innerHTML`, so HTML is allowed (`<b>E</b> …`). Skips DOM writes when the value is unchanged. ENGINE |
| `toast(html, cls='')` | | `innerHTML`; fades at 2.2 s, removed at 2.8 s (hud.js:149–153). `cls='radio'` is used by `game.radio(who, text)` (main.js:574), which prepends `<img class="radio-face" src=portraits[who]>`. ENGINE |
| `showBanner(main, sub='', cls='', ms=2600)` | | `textContent`. `ms=0` means sticky until `hideBanner()`. The `cls` values styled in CSS are `mission` `bad` `good` `shame` `count` (style.css:80–84). ENGINE; rename `shame` class with the meter. |
| `hideBanner()` | | |
| `flashColor(color, ms=400)` | CSS colour | **`ms` is ignored**: duration is the CSS `flash` animation (0.6 s). |
| `showCollect(html)` | | card for 3.5 s. Used with `.rec-icon`/`.mos-icon` spans (CONTENT). |
| `letterbox(on)` | bool | |
| `runDialog(lines, game)` | async; `lines: [{who, text}]` | see 1.3 |
| `say(target, text, secs=2)` | target is any `{x, y, z, height?}` (live object, read each frame) | world-anchored bubble at `y + (height‖2) + 0.6`. Expiry uses `performance.now()` (wall clock, keeps counting while paused). `game.say` wraps it (main.js:573). ENGINE |
| `tickBubbles()` | | projects through the `camera` imported from gfx; hides bubbles off-screen or behind the camera. Called from `updateHud`. |
| `drawMinimap(px, pz, camYaw, playerYaw, markers, route)` | see 1.4 | called every 2nd frame (main.js:1055–1058) |
| `toggleBigMap(on, game)` | | see 1.4; main.js:729 toggles it, main.js:1059 redraws every 10th frame |
| `portraits` | `{ [who]: dataURL }` | filled by main.js:129–132 |
| `dialogActive` | bool | set by runDialog. Nothing else reads it (main uses its own `inDialog`). |

### 1.3 Dialogue runner (`runDialog`, hud.js:181–222)

- Input: `lines = [{who, text}]`. The game-level wrapper `game.dialog(lines)` takes **tuples**
  `[[who, text], …]` and sets `game.inDialog` (main.js:581–585). Missions use the tuple form
  (`def.intro`, `def.outro`).
- **What it needs from `game`:** `charDef(who) → {name, kind, voice}` (`CHARS[who]`),
  `setTalker(who|null)` (drives mouth animation via `p.anim.talk = talker === 'nick'` in
  syncAll), `input.pressed('skip')` (Space/E/Enter/Mouse0, pad 0/3, input.js:19/24),
  `autoDialog` (true in `?test=1`), `onFrame(fn)` / `offFrame(fn)`.
- Typewriter at 55 chars/s. A talk blip (`audio.talk(def.voice || 300)`) plays on every 2nd
  char that matches `/[a-z]/i`. **Gotcha for Swedish/Norwegian:** `å ä ö æ ø` don't match, so
  they make no blip. Use `/\p{L}/u`.
- Skip: the first press completes the line, the second press advances. In auto mode it
  advances about 0.55 s after the line completes (`acc > text.length + 30`).
- It runs on `game.onFrame` hooks, which only tick inside `game.update()` (started and not
  paused). **Dialogue cannot advance before `start()`, and freezes while paused.**
- Portrait: `img.src = hud.portraits[who] || ''`. The ring colour is hard-coded at hud.js:188:
  `who === 'nick'` → blue, `kind === 'monster'` → purple, `kind === 'wizard'` → dark purple,
  else yellow. **CONTENT**: change `'nick'` to the player key (e.g. `stig`) and drop or rename
  the kinds.
- Name: `def?.name || who`. Text uses `textContent` (no HTML). Line breaks are not rendered.
- Cinematic framing is separate: `game.cinematic(a, b)` = `cam.frame(a, b)` +
  `hud.letterbox(true)` + `inDialog = true`. `game.endCinematic()` undoes it (main.js:586–587).
  `missions.begin()` runs cinematic → dialog → endCinematic → banner (missions.js:511–526).

### 1.4 Minimap and big map, and showing a different map (airplane cabin)

**Base map** (`buildBaseMap`, hud.js:62–100): one offscreen canvas, `size = ceil(2*MAP_EXT*MAP_SCALE)`
with `MAP_SCALE = 1.6 px/m` and `MAP_EXT = BOUND + 20 = 334 m` (HALF=280, BOUND=314), so
1069×1069 px. World→canvas is `W(v) = (v + MAP_EXT) * MAP_SCALE`. The canvas x axis is world x,
the canvas y axis is world z (+z is down, so "north" = −z). It draws:
1. Grass fill `#6fae4f`, then the asphalt square over `±(HALF+RHW)`.
2. For each grid cell `MAP[j][i]`: a sidewalk square plus a coloured lot. The `colors` table at
   hud.js:72 is keyed by **Bigmouth block types** (CONTENT).
3. Every `collision.blocks` entry with `shape===BOX` and `kind ∈ {building, garage, marquee}`
   as a filled and stroked rect. Every `CIRCLE` with `kind==='water'` as a blue disc. This
   part is generic: any level that registers BOX blocks with those kinds is drawn
   automatically.
4. Dashed yellow centre lines on every road (`rc(k)`), which are grid-specific.

**`drawMinimap(px, pz, camYaw, playerYaw, markers, route)`** (hud.js:250–301):
- A circular clip on the 220 px canvas, with R = 110. Rotation is `camYaw + π`, so camera
  forward points up. The map is drawn at `zoom = 1.25 px/m`, giving about 88 m view radius.
- The base map is placed with `drawImage(baseMap, -(px+MAP_EXT)*MAP_SCALE, -(pz+MAP_EXT)*MAP_SCALE)`
  under `scale(zoom/MAP_SCALE)`.
- Overlays use their own scale `k = zoom` (px per world metre), independent of `MAP_SCALE`.
  - `route`: `[[x,z],…]` polyline from the player (yellow), from `routeAim` nodes plus the
    target (main.js:1037–1040).
  - `markers`: `[{type, x, z, edge?}]`. Markers beyond `R-12` px are hidden unless `edge:true`,
    which clamps them to the rim.
  - Player arrow is rotated by `-(playerYaw - camYaw)`. The `N` badge orbits the rim.
- Marker types drawn by `drawMarker` (hud.js:335–361): `mission` (yellow ! disc), `objective`
  (yellow star), `enemy` (purple dot, white rim), `friend` (teal dot), `record` (red dot,
  CONTENT), `mosquito` (green dot, CONTENT), `item` (white dot). Unknown types draw nothing.
- Marker list source: `game.mapMarkers(all)` (main.js:996–1014). It contains the mission giver
  while idle, the `missions.target()` (objective, or enemy/friend when `follow`), the stage's
  `markers()`, live hearses (`enemy`), and, when `!all`, records/mosquitoes within 45 m.

**`toggleBigMap(on, game)`** (hud.js:303–332): crops the base map to `E = HALF + 16` (±296 m)
onto 760 px. It draws `game.mapMarkers(true)` at 1.3× and the player arrow from `game.focus()`
(`{x,z,yaw}`). Labels come from `game.mapLabels() → [[name, x, z]]` (main.js:31 `MAP_LABELS`
plus `landmarks`, CONTENT). The legend is rebuilt from
`game.got.records.size`/`game.got.mosquitoes.size` "/7" (hud.js:331, **CONTENT, and it will
throw if `game.got.records` is removed**).

**Can it show an airplane cabin? Yes, with a small refactor.** As written it cannot, because:
- the base map is fixed to the town extents (`MAP_EXT`, `HALF`) and the grid draw;
- `zoom = 1.25 px/m` would make a ~4 m wide, ~35 m long cabin 5 px wide. A cabin needs about
  8–10 px/m (110 px radius ≈ 11–14 m);
- the big-map crop `E = HALF + 16` is hard-coded;
- the town base map is upscaled with `drawImage`, so a zoomed-in town would blur. A cabin
  needs its own canvas at its own px/m.

Suggested minimal API (ENGINE change, roughly 20 lines):

```js
// a "map source"; one per level
{ canvas, scale /*px per m on canvas*/, x0, z0 /*world coords of canvas pixel (0,0)*/,
  zoom /*minimap px per m*/, bg /*fill outside canvas*/, crop:{x0,z0,x1,z1} /*big map*/,
  north: 'N' | 'FRAM' | '' }
hud.setMapSource(src)                // replace module-level baseMap/MAP_SCALE/MAP_EXT use
hud.buildBaseMap() -> src            // town (existing code, returns a source)
hud.buildMapFromBlocks(bounds, opts) // generic: fill + every BOX block → works for a cabin
```

In `drawMinimap` replace `-(px+MAP_EXT)*MAP_SCALE` with `-(px - x0)*scale`, replace
`zoom/MAP_SCALE` with `zoom/scale`, and use `k = zoom`. In `toggleBigMap` use `src.crop`. Make
the legend text a game callback (`game.mapLegend()`). A cabin drawn from its collision blocks
(fuselage walls, seat rows as BOX blocks of some kind such as `'seat'`, galley, toilets) will
render with the existing block loop once the `kind` filter includes those kinds.

Note also: `routeAim` (layout.js:108) returns a direct line if the target is < 45 m away,
otherwise it routes via **town road nodes**. In a cabin, keep targets < 45 m away or bypass
`routeAim` (set `route=[[tx,tz]]`, arrow yaw = `yawTo(target)`). Alternatively, hide
`#minimap-wrap` in the flight level.

### 1.5 `renderPortrait(renderer, model, R=0.3)` (hud.js:368–404)

- Needs `model.root` (Object3D), `model.head` (Object3D), and `model.def.kind`/`.scale`. `R` is
  unused.
- Temporarily reparents `model.root` into a private scene. Lights are hemisphere and
  directional. The camera is FOV 28, placed at head + (0.25, 0.05, dist), where dist is 1.7,
  2.1 for `wizard`, 2.6 for `monster`, times `def.scale`. Output is a 160×160 render target,
  flipped, returned as a PNG data URL.
- **Gotcha:** it sets `model.root.position = 0` and rotation y to 0.35 and does **not** restore
  them. That is fine for Characters re-synced each frame. Static models would be left at the
  origin.
- Every `who` that appears in dialogue or radio needs `hud.portraits[who]`; otherwise the image
  is blank. Main does this for `HOMES` keys plus `nick` plus `shame` (main.js:129–132).

### 1.6 Strings to localise (Swedish; Ole speaks Norwegian)

hud.js:25 `SHAME`, :28 `MPH`, :34 `E ▸`, :36 and :331 the legend, :27 `N`, :364 car names.
style.css:37 `" · RUN!"`. All banner and toast strings live in main.js, missions.js and
shame.js. The font is Luckiest Guy (Google Fonts, latin subset). Check that `åäöæø` render,
including on the canvas (`17px "Luckiest Guy"` at hud.js:323, 340).

---

## 2. Camera rig (`src/game/camera.js`, `export class CamRig`)

### 2.1 State (constructor, camera.js:9–21)

`cam` (the three PerspectiveCamera from gfx: fov 62, near **0.25**, far 1800, gfx.js:18),
`yaw = π`, `pitch = 0.3`, `dist = 6` (**unused**, distance is recomputed every frame),
`manualT` (seconds of "user is steering, don't auto-recentre"), `pos`, `look` (Vector3),
`shake` (0..~1.2), `fov`, `cine` (`null` or `{pos, look}`), `snapNext` (teleport camera on the
next update).

External writers: `cam.yaw`/`cam.pitch` at spawn (main.js:121–122), `cam.snapNext = true`
after warps, resets and retries (main.js:355, 761; missions.js:650; shot.mjs:70), and
`cam.shake` on impacts and stomps (main.js:505, 514, 555).

### 2.2 `update(dt, focus, look, cars = [])` (camera.js:23–101)

- `focus` = `game.focus()` spread with `{autoTurn, lookBack}`:
  `{x, y, z, yaw, car|null, speed, height?, autoTurn, lookBack}`. main.js:716 always passes
  **`autoTurn: false`**, so on foot the camera never recentres by itself.
- `look` = mouse delta `{x, y}` or `null` (main passes `null` while `inDialog`).
- `cars` = for the "don't sit inside another car" fix.

Logic:
1. **Cinematic** (`this.cine`): exponential lerp of pos (k=4) and look (k=5), fov → 50, then
   return. There is **no wall collision and no shake** in this branch.
2. **Mouse look**: `yaw -= clamp(dx,±250)*0.0024`, `pitch = clamp(pitch + clamp(dy,±250)*0.002, -0.25, 1.15)`,
   `manualT = 1.8`.
3. **In a car**: when not manual, yaw damps toward the velocity heading (k 3.2 above 1 m/s,
   otherwise 1.2) or the car yaw when reversing, and pitch damps to 0.22. `lookBack` sets
   yaw to `want + π`. `pivotH = car.height + 0.9`,
   `dist = 5.2 + 0.75*len + min(4, 0.1*speed)`, `lead = min(3, 0.12*speed)`,
   `fov = 62 + min(14, 0.4*speed)`.
4. **On foot**: `pivotH = 1.55`, `dist = 6`, `fov = 62`. The optional autoTurn recentres at
   k=0.9 when speed > 3.
5. Spherical offset: pivot `P = (x, y+pivotH, z)`. The camera wants
   `P - fwd(yaw)*cos(pitch)*d`, with height `P.y + sin(pitch)*d`.
6. **Wall pull-in**: `hit = segmentBlocked(px,pz, tx,tz, min(py,ty)+0.3)`. If `hit >= 0`,
   `d = max(1.6, hit*d - 0.6)`. Final y = `max(focus.y + 0.6, py + sp*d)`.
7. Smoothing: damp xz at k=10 (car) or 14 (foot), y at 0.7k. **If there was a hit, snap
   immediately**, so a wall can never slip between camera and player during the lag.
8. Look-at = pivot + fwd*lead, y −0.2 (+0.1 on foot).
9. Roof-ride: if the camera is inside another car's OBB (+0.6 m), lift y to that car's roof
   + 0.7.
10. Shake: random jitter of amplitude `0.35*shake`, decays 2.5/s. Then lookAt, fov, and
    `updateProjectionMatrix` every frame.

`segmentBlocked(ax,az,bx,bz,y,ignoreKind='prop')` (collision.js:274–286) is **2D**. It samples
the segment every 0.8 m against block footprints, skips blocks with `top < y` and blocks of
`kind === ignoreKind`, and returns the first `t ∈ [0,1]` or `-1`. Gotchas:
- **It returns the first hit of the first block in query order, not the nearest hit.** With
  many blocks close together (a cabin) the camera can be pulled to the wrong distance. Fix by
  taking the min `t` over all blocks.
- There is **no ceiling or roof concept**. Blocks are footprints with a top, so nothing stops
  the camera rising through a roof.
- With 0.8 m sampling, thin walls (< 0.8 m) can be stepped over at long distances. In practice
  d ≤ 13 m gives ≥ 16 samples, which is fine for walls ≥ 0.3 m but only roughly so.

### 2.3 `frame(a, b)` and `release()` (camera.js:104–120)

`frame` sets `cine` to a side-on two-shot of a and b (`{x,y,z,height?}`): perpendicular
distance `d = max(4.5, 1.6*l + 2.5)`, preferring the side the camera is already on. If
`segmentBlocked(…, 1.5)` hits, it flips to the other side **without checking that side**.
Height is `max(a.y,b.y) + top*0.75 + 0.6`. `release()` sets `cine = null`, and the normal rig
then damps back from wherever `pos` is (smooth).

### 2.4 Would it work inside a narrow airplane cabin? Not as is.

Assume a cabin roughly 3.5–5 m wide, ceiling about 2.2–2.4 m, aisle about 0.6–0.9 m, seats
about 1.1–1.2 m tall.

| problem | cause | what to change |
|---|---|---|
| Camera goes through the ceiling | pitch up to 1.15 at d = 6 puts it about 5.5 m above the pivot. There is no ceiling test. | Add a `cam.bounds = {ceilY, floorY}` or interior mode: clamp `want.y ≤ ceilY - 0.25`, pitch to about [−0.05, 0.45]. |
| Camera ends up outside the fuselage when turned sideways | the minimum pull-in is **1.6 m** (`max(1.6, …)`). In a 0.8 m aisle that is beyond the wall. | In interior mode use min ≈ 0.35–0.5 m and `hit*d - 0.25`. Also fix `segmentBlocked` to return the nearest hit. |
| Distance and FOV too large | `dist = 6`, `pivotH = 1.55` | Interior profile: `dist ≈ 2.6–3.2`, `pivotH ≈ 1.45`, `fov ≈ 70`. |
| Dialogue two-shot lands outside the plane | `frame` uses d ≥ 4.5 m perpendicular, and both sides are blocked | Interior `frame`: place the camera **along the aisle axis** (in front of or behind the pair) and pull in to the hit distance with `segmentBlocked`. Or give missions a scripted `cine = {pos, look}`. |
| Seats vs camera | the sample height `min(py,ty)+0.3` ≈ 1.85 m+, so blocks with top < that (seats) are ignored. That is good: the camera passes over seat backs. | Keep seat tops below about 1.6 m, or give them a kind passed as `ignoreKind`. |
| Wall meshes occlude the view at close range | the outer shell sits right behind the camera | Use `side: FrontSide` inward-facing walls (invisible from outside), or fade or hide wall segments between camera and player. A simpler alternative is a **cut-away cabin** (no roof mesh) with a high, steep fixed camera: `pitch ≈ 0.9`, `yaw` locked to the aisle. |
| Yaw freedom is pointless in a tube | — | Optionally lock yaw to `aisleYaw ± 0.6` in the interior profile. |
| Shake | fine as is: use `cam.shake` for **turbulence** (it already decays). Turbulence of `cam.shake = 0.4–0.8` plus a cabin tilt looks right. | — |

Recommended implementation: add `this.profile = null | {pivotH, dist, minDist, pullPad, ceilY,
pitchMin, pitchMax, fov, yawLock?:{center, range}}` and branch at the "on foot" block
(camera.js:56–62) and around the pull-in (camera.js:68–71). Pass `cars = []` in the cabin. The
town code path is then untouched.

---

## 3. Particles (`src/game/fx.js`, `export const fx`) — ENGINE

- One `InstancedMesh` of `MAX = 700` icospheres (r 0.5, detail 1), with `MeshToonMaterial`
  and `toonGradient()` (toon-lit, so it reacts to scene lighting) plus per-instance colour. It
  is a ring buffer: `next++ % MAX`, so the oldest particle is overwritten. `frustumCulled = false`.
- Particle: `{life, max, x,y,z, vx,vy,vz, s0, s1, rot, drag, grav}`. In `tick(dt)`
  (fx.js:95–111) velocity is multiplied by `exp(-drag*dt)` on **all** axes, `vy -= grav*dt`,
  and the scale is a linear `s0→s1` that shrinks to 0 over the last 25% of life. There is no
  collision. `tick` loops all 700 every frame.
- `init(scene)` must run before any spawn (main.js:80). It also creates the skid-mark mesh.

| function | signature | look |
|---|---|---|
| `spawn` | `(x,y,z,color,{vx=0,vy=0,vz=0,s0=.5,s1=1.5,life=1,drag=1.5,grav=0})` | base primitive. **grav defaults to 0**, so particles float. |
| `smoke` | `(x,y,z,dark=false)` | grey puff rising 2–3 m/s, life 1.4 |
| `fire` | `(x,y,z)` | yellow/orange shrinking puff, life 0.6 |
| `explosion` | `(x,y,z)` | 26 fireballs + 14 dark smoke |
| `dust` | `(x,z,n=3,y=0.3)` | tan puffs |
| `sparkle` | `(x,y,z,color=0xffd23f,n=10)` | small, ballistic (grav 9). Pickups, mission items. |
| `sparks` | `(x,y,z,n=8)` | tiny, fast, grav 20. Impacts. |
| `shame` | `(x,y,z,n=12)` | purple ring puff (0x8a3ab8/0xc89aff). **CONTENT**: rename or recolour for the new meter. |
| `splash` | `(x,z)` | water at fixed `y=0.3` (hydrants). Useful for pool or sea. |
| `skid` | `(x,z,yaw,w=0.28)` | 900-quad ring buffer of dark quads at fixed **y = 0.035** (ground level only) |

Callers: main.js (props, impacts, landing, pickups, skids at 1075–1076), missions.js:196 and
339 (`sparkle`), shame.js:101 and 133 (`shame`). **Gotcha** from CLAUDE.md: a local
`const fx = Math.sin(...)` easily shadows the module (car.js imports it as `FX`, main.js uses
`fx_`).

Cheap new presets for Sällskapsresan, all via `spawn`: airsick or "spya" green puffs, sweat
drops (blue, grav 9), sangria or drink splash (red `splash` variant with a y param), sand kicks
(dust recoloured), sun glints (white `sparkle`), cigarette smoke (`smoke` small).

---

## 4. World markers (`src/game/markers.js`) — ENGINE

All three are built from `GeoBuilder` and `toonMesh` with an outline, so they are cel-shaded
like the world.

| class | ctor | per-frame | geometry / gotchas |
|---|---|---|---|
| `Bang` | `(scene, color=0xffd23f)` | `set(x,y,z,t)` bobs ±0.2 and spins at 2 rad/s; `show(bool)` | "!" glyph plus a **60 m tall** translucent beam (r 0.9, centred at y=30). It starts visible. main.js:1021–1026 puts it at `giver.y + giver.height + 0.9` while the mission is idle. |
| `Beacon` | `(scene, color=0xffd23f)` | `set(x,y,z,t,radius=3.2)` makes it visible; `hide()` | **120 m** beam (r 1.6), ground torus scaled `radius/3.2` at y 0.4, spinning arrow at **y = 4.5 ±0.5**. main.js:1027–1033 places it at `missions.target()` (`{x,z,r,follow?,checkpoint?}`), hidden when `follow`. |
| `GuideArrow` | `(scene)` | `set(x,y,z,yaw,t)`; `hide()` | flat yellow arrow, scale 0.62, renderOrder 5. Yaw is smoothed **0.2 per frame** (frame-rate dependent). main.js:1036–1041 puts it at `player.y + height + 1.5` (car: roof + 1.8), pointing at `routeAim(...)`. |

Cabin issues: the Beacon arrow at 4.5 m and the GuideArrow at about 3.1 m sit **above a 2.3 m
ceiling** and would be invisible or clipped. The beams are fine because they are depth-tested.
Add a height parameter (`Beacon.set(..., arrowY)`) or an interior flag, and lower the guide
arrow to about head + 0.5 (or hide it in the cabin). Colours are generic yellow. Unused
imports: `MAT`, `outlineMat`.

---

## 5. The Shame system (`src/game/shame.js`, `export class Shame`) — becomes the new meter

### 5.1 State (constructor, shame.js:25–37)

| field | meaning |
|---|---|
| `game` | the Game (main.js) |
| `v` | meter 0..100 |
| `pursuit` | bool: hearses and the wizard are active |
| `hearses` | Car[] chasing now |
| `wizard` | Character or null: the on-foot pursuer |
| `sinceOffense` | seconds since the last `add()`, starting at 99 |
| `locked` | when true, `add()` is ignored. **Nothing ever sets it true.** missions.js:542 only sets it false. It is free to use, e.g. to freeze the meter during cutscenes or the flight intro. |
| `forced` | when true, pursuit starts and never decays (mission stages with `shame: true`) |
| `tauntT` | countdown to the next taunt bubble (starts at 3) |
| `caughtT` | grace after busting (2.2 s) so you can't be busted twice |
| `leaving` | `[{car, t}]`: ex-pursuers driving away before removal |

### 5.2 Filling: `add(amount)` (shame.js:39–44)

Ignored when `locked` or `amount <= 0`. Otherwise `v = min(100, v+amount)` and
`sinceOffense = 0`. If `v >= 100` and not in pursuit, it calls `startPursuit()`. During a
pursuit, `add` refills the meter and so delays escape.

**Every caller (main.js), so the offence economy is visible in one place:**

| offence | amount | line |
|---|---|---|
| carjack (stealing an occupied car) | +8 | main.js:373 |
| breaking a prop | `prop.def.shame` (0–2, props.js:9–51) × 1.2 in car / 0.7 on foot | main.js:492 |
| player car rams a non-hearse, non-target, unlocked car | `min(9, impact*0.55)` | main.js:509 |
| player car rams a **hearse** | `shame.onRam(other, impact)` → busted | main.js:508 |
| wrecking a traffic or unnamed parked car | +12 | main.js:532 |
| hitting a person with the player car | +14 named NPC (`ch.key`) / +18 pedestrian | main.js:542 |
| kick or stomp on a pedestrian | +9 each | main.js:847 |
| kick or stomp on a traffic car | +2 | main.js:868 |
| debug and tests | `__game.shame.add(100)` | tools/shot.mjs:288, 442 |

### 5.3 Decay: `update(dt)` (shame.js:137–172), called every frame from main.js:709

- Always: `sinceOffense += dt`, `caughtT` counts down, and `leaving` cars are removed when
  `t ≤ 0` or (`t < 20` and > 120 m from focus) (shame.js:141–146).
- **Not in pursuit:** if `forced`, set `v=100` and `startPursuit()`. Otherwise, after
  **4 s** clean, decay **5/s**.
- **In pursuit:** `near` = distance to the closest live hearse or the wizard.
  - When not forced: decay **9/s** if near > 42 m, **3/s** if 22–42 m, **0** if closer. An
    extra **12/s** applies if every hearse is dead and there is no wizard. At `v ≤ 0`,
    `endPursuit(false)` (escaped).
  - When forced: no decay, so the pursuit only ends through busted, mission complete, or fail.
  - Then `wizardChase(dt)` and taunts: every 4–7 s, if near < 40, a bubble from `TAUNTS`
    (shame.js:15–22, CONTENT) via `game.say(src, text, 2.2)`. For a hearse the target is
    `{x,y,z,height:2.6}`.
- Ends with `hud.setShame(this.v, this.pursuit)` every frame.

### 5.4 Pursuit start: `startPursuit()` (shame.js:46–75)

`pursuit = true`, `v = 100`, `audio.shameBell()`, banner `SHAAAME!` with class `shame`, purple
flash. **Hearse spawn needs the town road graph**:
- it collects road nodes (`NN*NN` grid) 70–150 m from `game.focus()` and takes 2 at random;
- each car is offset 12 m along the edge to `neighbors(id)[0]`, plus `LANE` sideways;
- `new Car('hearse', …)`, `place`, `isHearse = true`, `spec.maxSpeed = 28` (spec is a per-car
  copy, car.js:120, so this is safe), `ai = new AIDriver(car, {mode:'chase', target: () =>
  game.focusTarget(), cruise: 26, aggressive: true, avoid: false})`;
- `car.bust = game.addBust(CHARS.shame, car)`, which puts a mini wizard in the driver seat
  (main.js:175–193), then `game.addCar(car)`.
- `n0` (shame.js:55) is computed but unused.

`AIDriver` chase (drivers.js:149–158) aims directly at the target when < 38 m away (with
velocity lead), otherwise it re-plans every 2.5 s with `pathTo(nearestNode(target))`. That is
the road graph again.

### 5.5 On-foot pursuer: `wizardChase(dt)` (shame.js:110–135)

- Runs only while `pursuit`. If the player is in a car, the wizard is removed and the function
  returns.
- On first need it spawns `new Character(CHARS.shame)` at a live hearse's position, or at
  `player + (30, 30)` (about 42 m away), with `solid = false`. **That builds a new character
  mesh each time.**
- It moves in a **straight line through everything** at **7.4 m/s**. Player speeds are 5.4
  run and 8.8 sprint (main.js:809), so only sprinting outruns it. It eases toward
  `player.y + 0.4`, sets `yaw`/`vx`/`vz` for animation, toggles `anim.talk`, calls `sync(dt)`,
  and emits purple `fx.shame` puffs.
- **Busted** when `d < 1.4` and `caughtT ≤ 0`.

### 5.6 Busted: `busted()` (shame.js:93–107)

- Coins `-= min(coins, 50)`, then `hud.setCoins`, `v = 0`, `caughtT = 2.2`.
- 30 `fx.shame` particles at the player, a purple flash, banner `SHAMED!` with the coins lost
  (or `You have nothing left to lose`), and the bell.
- `endPursuit(true)`, then **`game.missions.onBusted?.()`**, which fails the running mission
  only if `def.bustFails` (missions.js:664–666; only "The Big Dance" sets it, missions.js:474).
- Triggers: the wizard touching you (shame.js:134), or a hearse ramming your car with
  impact > 1.5 during pursuit (`onRam`, shame.js:175–177, from main.js:508).

### 5.7 End and clear

- `endPursuit(caught)` (shame.js:77–91): `pursuit = forced = false`. Live hearses switch to
  traffic AI (cruise 14) and leave after 25 s, dead ones after 12 s. The wizard is removed
  from the scene. If not caught, the banner `SHAME SHAKEN` (class `good`) and the `complete`
  jingle play.
- `clear()` (shame.js:179–185): immediately removes all hearses, leaving cars and the wizard,
  and resets `pursuit/forced/v`. It does **not** reset `sinceOffense/tauntT/caughtT`. Called
  by `missions.fail()`.

### 5.8 Hooks used by main.js and missions.js (the "meter contract")

| who | uses |
|---|---|
| main.js:116 | `new Shame(this)` |
| main.js:709 | `shame.update(dt)` every frame |
| main.js (5.2) | `shame.add(n)`, `shame.onRam(car, impact)` |
| main.js:1007 | `shame.hearses` (live ones → minimap `enemy` markers) |
| main.js:1084 | `shame.pursuit` → `audio.duckMusic(0.5)` |
| missions.js:541–542 `startStage` | `shame.forced = !!stage.shame`; `if (stage.shame) shame.locked = false` |
| missions.js:577 `cleanupMission` | `shame.forced = false` (the pursuit continues and then decays normally) |
| missions.js:590–591 `complete` | `if (shame.pursuit) shame.endPursuit(true)`; `shame.v = 0` |
| missions.js:628 `fail` | `shame.clear()` |
| missions.js:664 | `onBusted()`, called from `Shame.busted` |
| missions.js:307 | a `destroy` stage puts `g.charDef('shame')` in a target hearse (CONTENT, unrelated to the meter) |
| missions.js:483–485 | stages spread with `shame: true` (forced pursuit) |
| tools/shot.mjs `chaos`, `wizard` scenarios | read `shame.v/pursuit/hearses/wizard`, call `shame.add(100)`. Update these when renaming. |
| what Shame needs from game | `focus()`, `focusTarget()`, `addBust(def, car)`, `addCar`, `removeCar`, `scene`, `player`, `playerCar`, `coins`, `missions.onBusted`, `say(target, text, secs)` |

### 5.9 Engine vs content inside shame.js

- **ENGINE:** the meter maths (add, decay, 4 s grace, near-distance decay bands, forced and
  locked flags), the pursuit lifecycle (start → leaving → cleanup), the on-foot straight-line
  pursuer, the busted grace timer, the `onBusted` mission hook, and the HUD feed.
- **CONTENT:** `TAUNTS`, banner strings, the `'hearse'` car type, `CHARS.shame` (pursuer
  model, bust and portrait), `fx.shame` colours, `audio.shameBell`, the 50-coin penalty, the
  `SHAME` label and CSS colours (`style.css:30–37`, `--purple-hi`), and "wizard" naming.

### 5.10 Turning it into a different meter: engineering notes

1. **Parametrise rather than rewrite.** Give the constructor a config:
   `{label, bannerStart:[main,sub], bannerCaught:[…], bannerEscape:[…], taunts:[…],
   pursuerChar: 'ole', vehicleType: 'tourbus' | null, vehicleCount: 2, onFootSpeed: 7.4,
   penalty: (g) => …, decayIdle: 5, graceSecs: 4, bands: [[42, 9], [22, 3]]}`.
   Then rename `hud.setShame` → `hud.setMeter(v, hot, label?)` and the CSS ids
   `#shame`/`.shame-*`. Keep the public surface (`add`, `update`, `pursuit`, `forced`,
   `locked`, `clear`, `endPursuit`, `onRam`, `v`) so main.js and missions.js need only a
   rename.
2. **Flight level (no roads, no cars):** `startPursuit` must not try to spawn vehicles. With
   the cabin far from town, no node is within 70–150 m, so zero hearses spawn and only the
   wizard runs. That wizard spawns at `player + (30, 30)`, **outside the fuselage**, and flies
   through the walls. Add a per-level `pursuit mode: 'vehicles' | 'onfoot' | 'none'` and a
   `spawnAt()` callback (for example the far end of the aisle, the cockpit door or the
   toilet). Alternatively make the flight meter non-pursuit: at 100 it triggers a "panic
   attack" event (camera shake, flash, inverted or slowed controls, an air-hostess or
   Ole intervention) instead of a chase. `update` already allows that: replace the body of
   `startPursuit`/`wizardChase`.
3. If the on-foot pursuer must respect cabin walls, `wizard.solid = false` plus manual xz
   integration skips all collision. Give it `wishX/wishZ` and let `Character.step` move it,
   like NPCs (main.js:835), or clamp to the aisle line.
4. The offence sources (5.2) are scattered through main.js. For a new meter (e.g. "embarrass
   the group" or "disobey Ole's schedule"), grep `shame.add(` in main.js and re-weight. New
   positive sources (missed group activity, sunburn, Ole catching you) are just `add()` calls
   from mission stages or main.
5. Keep the per-frame `hud.setShame` call at the end of `update` (or its renamed version). The
   CSS transitions (`width 0.25s`) assume frequent updates.
6. `endPursuit(true)` from `missions.complete()` silences the "escaped" banner. Keep that
   contract if missions keep the same call.

---

## 6. Quick "keep / replace" checklist

| file | keep (ENGINE) | replace / parametrise (CONTENT) |
|---|---|---|
| hud.js | everything except below | `SHAME`, `MPH`, `N`, `E ▸`, legend text and `got.records/mosquitoes` (331), `colors` by block type (72), centre lines and grid draw (73–78, 91–99), `niceCarName` (363–365), the `'nick'` and `kind` portrait colours (188), `drawMarker` `record`/`mosquito` types, the `/[a-z]/i` blip regex, the fixed town extents in `drawMinimap`/`toggleBigMap` |
| camera.js | all of it for the island | add an interior profile (ceiling, small min pull-in, short dist, aisle yaw lock), an interior-safe `frame()`, nearest-hit `segmentBlocked` |
| fx.js | all | `shame()` preset name and colour, add new presets |
| markers.js | all | heights for interior use (Beacon arrow 4.5 m, GuideArrow offset set in main.js) |
| shame.js | meter maths and pursuit lifecycle | taunts, banners, hearse/wizard/`CHARS.shame`, penalty, road-graph spawn (unusable in the cabin) |
