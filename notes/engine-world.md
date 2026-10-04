# Engine map: the world (layout, collision, town, props)

How `src/world/` works in the Bigmouth & Run copy, what else depends on it, and what needs to
change to turn it into Charter & Run. This is a read-only map: no game files were changed.
Line numbers are for `src/world/*.js` as copied. World coordinates and counts come from
running `buildTown()` + `finalizeProps()` in node with a stubbed `document`.

---

## 0. Short version

- **`collision.js` is generic engine code.** It knows nothing about the town except through
  `baseGround()`, which comes from layout. Its spatial hash works for |x|, |z| < 65 536 m.
- **`layout.js` combines engine code with Bridgeton content.** The grid maths, road graph,
  routing and landmark registry are engine code. `MAP` is content. The grid size (`P`, `N`) is
  also hard-coded in other modules (see §7).
- **`town.js` is mostly content.** `Frame`, the small helpers, `streets()`, `outskirts()`,
  `addPedLoops()` and the `buildTown()` loop are engine code worth keeping. The houses, the 11
  whole-block builders, every sign text and every colour are Bigmouth content.
- **`props.js` splits cleanly.** Instancing, breaking, respawn and debris are engine code. The
  `TYPES` table is content, but three type names are special-cased elsewhere (§5.4).
- **A second world at x=+3000, such as the aeroplane cabin, works for physics and rendering
  without engine changes.** About ten gameplay helpers assume the town and must be guarded
  for that level (§8). The two strict rules: keep the cabin floor at ground level
  (`CURB` = 0.15, or a solid with top ≤ 0.6), and build its props before `finalizeProps()`.

---

## 1. `layout.js`: grid, road graph, landmarks (143 lines)

### 1.1 Constants (all exported)

| name | value | meaning |
|---|---|---|
| `P` | 80 | road pitch, centre line to centre line |
| `N` | 7 | blocks per side (so 8 roads each way) |
| `HALF` | 280 | `P*N/2`; road centre lines run from -280 to +280 |
| `RHW` | 5.5 | asphalt half-width |
| `SW` | 3.5 | sidewalk width |
| `LANE` | 2.75 | lane centre offset from the road centre (right-hand traffic) |
| `CURB` | 0.15 | height of everything that is not asphalt |
| `EDGE` | 289 | `HALF+RHW+SW`, outer edge of the outer sidewalk |
| `BOUND` | 314 | `HALF+34`, where the invisible `'bound'` walls are (built in town.js) |
| `NN` | 8 | `N+1`, nodes per side of the road graph |

Road centre lines are at `rc(k) = k*P - HALF`, which gives x or z = -280, -200, -120, -40, 40,
120, 200, 280.
Block `(i,j)` lies between `rc(i)` and `rc(i+1)`, so its centre is `rc(i)+40`:
i/j 0..6 map to -240, -160, -80, 0, 80, 160, 240. **Block (3,3), the park, is at the origin.**
The block interior (inside the sidewalk) is `rc(i)+9 .. rc(i+1)-9`, which is **W = 62 m square**.

### 1.2 Functions

```js
rc(i) -> number                       // road centre coordinate of road index i (0..N)
blockInterior(i, j) -> {x0,x1,z0,z1}  // lawn rectangle inside the sidewalks
blockAt(x, z) -> {i,j} | null         // null off-grid (no callers outside layout)
isRoad(x, z) -> bool                  // within RHW of a road centre line, inside the grid only
baseGround(x, z) -> 0 | CURB          // 0 on asphalt, CURB everywhere else, including off-grid
blockType(i, j) -> MAP[j][i]          // no callers; town.js reads MAP directly
```

`offAxis()` (l.26) returns `Infinity` outside `±(HALF+RHW)`. So **off the grid `isRoad` is
false and `baseGround` is `CURB`: an infinite invisible floor at y=0.15 that covers the whole
plane.**

### 1.3 `MAP` (l.40-48): indexed `MAP[j][i]`, j=0 is north (-z), i=0 is west (-x)

```
          i=0 (-240)  1 (-160)  2 (-80)   3 (0)     4 (80)    5 (160)    6 (240)
j=0 -240  res         res       res       tower     school    field      res
j=1 -160  steve       res       cinema    glaser    res       res        res
j=2  -80  res         res       mall      shops     res       jay        res
j=3    0  res         birch     res       park      gas       res        res
j=4   80  res         res       gloub     res       res       res        construct
j=5  160  res         res       res       res       res       res        res
j=6  240  res         res       res       res       res       cemetery   res
```

Block types and their builders in `town.js`: `res`, plus the residential variants `birch`,
`gloub`, `jay` and `steve`, each a residential block with one special lot, and the whole-block
types `school`, `field`, `tower`, `cinema`, `glaser`, `mall`, `shops`, `park`, `gas`,
`construct` and `cemetery`. **An unknown string builds an empty block** (sidewalk slab only,
no error) and gets the default lawn colour on the minimap.

### 1.4 Road graph (l.52-135)

- Node id = `j*NN + i` for i, j in 0..7, at intersection `(rc(i), rc(j))`. That makes 64 nodes,
  ids 0..63.
- `nodeId(i,j)`, `nodeI(id)`, `nodeJ(id)`, `nodeX(id)`, `nodeZ(id)` convert between ids,
  indices and world coordinates.
- `neighbors(id) -> id[]` gives the 4-neighbourhood, clipped at the edge. **The graph is
  implicit**: no adjacency data exists, and edges come from i/j arithmetic.
- `nearestNode(x,z) -> id` rounds and clamps to the grid, so it always returns an edge node
  for far-away points.
- `findPath(a, b, blocked=null) -> id[]` is a BFS with shuffled neighbour order, so equal-length
  routes are picked at random. `blocked` is a `Set` of node ids, but **no caller passes it**.
  It returns `[a]` if the target is unreachable.
- `cellCorners(x,z) -> [4 ids]` gives the corners of the clamped cell that holds the point.
- `routeAim(x,z,tx,tz) -> {x,z,nodes}` is used by the guide arrow and the minimap route line.
  If the target is closer than 45 m it aims straight at it. Otherwise it picks the best corner
  of the current cell, walks a Manhattan staircase (`manhattanPath`, which goes along the axis
  you are already lined up with first) and skips nodes closer than 14 m. **It ignores
  `blocked`.**

Who consumes the graph:
- `drivers.js` `LanePath` builds lane polylines along node edges: `M`=8.5 m turn-in,
  quadratic Bezier corners, wide U-turns. `startNodes`, `pathTo` and flee mode, which picks
  random ids via `(N+1)*(N+1)` (l.164).
- `main.js` `spawnTrafficCar` picks random node pairs (l.201).
- `shame.js` `startPursuit` scans every id `< NN*NN` for intersections 70-150 m from the
  focus (l.57).
- `missions.js` uses `findPath`, `nearestNode`, `nodeId` and `rc`, with hard-coded node indices
  (§7).

### 1.5 Landmark registry (l.137-143)

```js
export const landmarks = {};             // name -> { x, z, yaw }
export function lm(name)                 // throws Error('unknown landmark ' + name)
```

It is only written by `Frame.mark()` in town.js (l.53). Nothing stops another module writing
`landmarks.foo = {x,z,yaw}` directly. **Yaw is the direction a person standing at the
landmark faces** (forward = (sin yaw, cos yaw)), usually towards the street or approach.

---

## 2. Landmarks: definitions and consumers

World coordinates are rounded. Yaw: 0 faces +z (south), π faces -z (north), π/2 faces +x,
-π/2 (≈4.7) faces -x.

| name | town.js | world (x, z) | yaw | block | used by |
|---|---|---|---|---|---|
| `birch` | 282 | (-160.8, -26.4) | π | (1,3) birch | main.js:30 HOMES maurice/duke; :31 MAP_LABELS; :122 **player start**; :689 **title-screen orbit**; missions.js:350 `wake.at`, :457/:466 `hearse.at`/grab; shot.mjs:68 views |
| `birchGarage` | 283 | (-154.5, -18.7) | 0 | (1,3) | main.js:270 recordSpots (record on garage roof) |
| `birchDrive` | 285 | (-154.5, -25.4) | π | (1,3) | main.js:607 spawnMuscle; shot.mjs:457 |
| `gloub` | 291 | (-80.9, 106.4) | 0 | (2,4) gloub | HOMES andrew; MAP_LABELS; missions.js:362, 371, 379 |
| `gloubDrive` | 292 | (-74.7, 105.4) | 0 | (2,4) | *unused* |
| `jayTramp` | 299 | (133.6, -74.5) | π/2 | (5,2) jay | main.js:270 recordSpots; shot.mjs:373, 377 |
| `jay` | 306 | (132.0, -78.5) | -π/2 | (5,2) jay | HOMES jay; MAP_LABELS; missions.js:414, 423, 424 |
| `steve` | 317 | (-243.1, -132.4) | 0 | (0,1) steve | MAP_LABELS only |
| `gym` | 339 | (102.0, -238.5) | 0 | (4,0) school | missions.js:484, 485 |
| `school` | 354 | (74.0, -238.0) | 0 | (4,0) | MAP_LABELS; missions.js:381, 384 |
| `schoolLot` | 366 | (72.0, -222.0) | π | (4,0) | HOMES steve; missions.js:393 |
| `field` | 401 | (160.0, -234.0) | 0 | (5,0) | MAP_LABELS |
| `tower` | 429 | (-6.0, -244.0) | 0 | (3,0) | MAP_LABELS |
| `cinema` | 451 | (-80.0, -162.0) | 0 | (2,1) | MAP_LABELS |
| `glaser` | 476 | (-9.0, -157.0) | 0 | (3,1) | HOMES jessi/connie; MAP_LABELS; missions.js:433 |
| `mall` | 493 | (-80.0, -83.0) | 0 | (2,2) | MAP_LABELS; missions.js:483 |
| `mallLot` | 499 | (-80.0, -60.0) | π | (2,2) | *unused* |
| `pizza` | 530 | (-21.5, -90.0) | 0 | (3,2) shops | MAP_LABELS; missions.js:474 |
| `gazebo` | 570 | (-14.0, -7.5) | 0 | (3,3) park | *unused* |
| `park` | 589 | (0.0, -6.0) | 0 | (3,3) | MAP_LABELS; missions.js:402; shot.mjs:394 |
| `pond` | 590 | (0.0, 14.0) | 0 | (3,3) | *unused* |
| `gas` | 621 | (84.0, 16.0) | 0 | (4,3) | MAP_LABELS |
| `construct` | 661 | (214.0, 80.0) | π/2 | (6,4) | MAP_LABELS |
| `cemetery` | 678 | (160.0, 214.0) | π | (5,6) | MAP_LABELS |
| `crypt` | 679 | (160.0, 255.0) | π | (5,6) | *unused* |

**Hard failure points when renaming:**
- `MAP_LABELS` (main.js:31) is read as `landmarks[key].x`, which throws a `TypeError` on a
  missing key when the big map opens.
- `HOMES` (main.js:30) goes through `lm()`, which throws in `placeNpcs`.
- Every mission `at`, `to` and `near` goes through `missions.js:13`
  `at = p => typeof p === 'string' ? lm(p) : p`. **Mission data can also take raw `{x,z,yaw}`
  objects instead of names**, which helps for cabin positions.
- shot.mjs `views` (l.68) has a hard-coded list of 15 names.

**Named parked cars** are a second string-ID registry, fed by `Frame.car(..., {name})`:
- `birchWagon` (town.js:281): missions.js:361; shot.mjs:81, 139, 277, 305, 432, 455
- `martySedan` (290), `steveVan` (311), `schoolBus` (364), `glaserHatch` (478): display names
  only, in `hud.js:364 niceCarName()`
- Unnamed: an extra `bus` (365) and an `icecream` truck (537).

---

## 3. `collision.js`: 2.5D static solids (286 lines, all engine code)

### 3.1 Data model

A solid is a 2D footprint plus a **single absolute top height**. It is an infinite extrusion
from -∞ up to `top`. There are no ceilings and no overhangs. Whether a solid is a floor or a
wall depends on who asks:

- **Floor:** `top <= y + step`. Characters use step `STEP` = 0.45 (character.js:8). Cars use
  0.6. Coins use 0.3.
- **Wall:** anything higher than that.

```js
BOX = 0, CIRCLE = 1, RAMP = 2
// common fields: shape, top, kind, ref, dead, noFloor?, bx0/bx1/bz0/bz1 (AABB), _s (query stamp)
BOX:    { minX, maxX, minZ, maxZ }
CIRCLE: { x, z, r }
RAMP:   { x, z, fx, fz, hx, hz, h0, h1 }   // oriented box; height h0 at the back edge, h1 at the front
```

### 3.2 API

```js
addBlock(b) -> b                                      // computes AABB, inserts into hash + `blocks`
box(minX, minZ, maxX, maxZ, top, kind='solid', ref=null) -> b   // min/max may come in either order
circle(x, z, r, top, kind='solid', ref=null) -> b
ramp(x, z, yaw, width, length, h0, h1, kind='ramp') -> b        // rises along yaw; top = max(h0,h1)
blocks                                                // array of every solid ever added (hud reads it)
queryBlocks(minX, minZ, maxX, maxZ, out) -> out       // AABB query, dedup via global stamp, skips dead
contains(b, x, z) -> bool
topAt(b, x, z) -> height                              // ramp: interpolated along its axis, clamped
groundAt(x, z, y, step) -> height                     // max(baseGround, highest floor with top<=y+step)
groundInfo.block                                      // block giving the last groundAt result (null = bare ground)
circleVsBlock(x, z, r, b, out) -> bool                // out.nx/nz push dir, depth, cx/cz contact
obbVsBlock(o, b, out) -> bool                         // car OBB vs BOX/RAMP (SAT, 4 axes) or CIRCLE
obbVsObb(a, b, out) -> bool                           // car vs car, SAT + contact at the mid of the deepest features
circleVsObb(x, z, r, o, out) -> bool                  // person vs car (no contact point)
segmentBlocked(ax, az, bx, bz, y, ignoreKind='prop') -> t | -1  // camera pull-in, cine framing
```

An OBB is `{ x, z, fx, fz, hx, hz }`, with forward (fx,fz), half-width hx and half-length hz.
There is **no remove API.** To disable a solid, set `b.dead = true`; to revive it, set it back.
`b.noFloor = true` excludes a block from `groundAt` but it still acts as a wall. Only the cinema
marquee uses it (town.js:444).

### 3.3 Spatial hash and its assumptions

- `CELL = 16`, `key = (cx+4096)*8192 + (cz+4096)` (l.13). The hash is correct for cell indices
  -4096..4095, which is **±65 536 m**. Nothing else in the file assumes the town.
- `groundAt` reads only the cell under (x,z). That is correct because `addBlock` inserts each
  solid into every cell its AABB overlaps.
- The only coupling to the town is `baseGround()` from layout.js (l.85), which gives 0 or CURB.
  Off the grid, the ground is CURB.
- **Tops are absolute world heights.** A wall with top 99 on a floor raised to 120 becomes a
  floor. Any elevated level must offset every top.
- `segmentBlocked` samples every 0.8 m and returns the first hit *in hash order*, which is not
  necessarily the nearest hit. Thin walls (< 0.8 m) can slip between samples, so make walls
  thick in collision even if they look thin. The camera casts at `min(pivot, cam)+0.3`, about
  2 m above the focus (camera.js:63), so low furniture never blocks the camera.
- Tunnelling: cars move about 0.5 m per 60 Hz step at top speed, so keep solid walls ≥ 0.5 m
  thick.

### 3.4 `kind` strings and who reads them

| kind | made by | read by |
|---|---|---|
| `'building'` | `Frame.solid` default | hud.js:80 minimap (rooftop fill) |
| `'garage'`, `'marquee'` | house garage, cinema | hud.js:80 minimap |
| `'water'` | park pond circle | hud.js:86 minimap (blue) |
| `'bounce'` | trampolines (town.js:212) | **character.js:105**: landing on it launches vy=15.5 (the game logic sits in the kind) |
| `'prop'` | props.js:128/132 (`ref` = prop) | **car.js:297** (smash if speed > `ref.def.minSpeed ?? 3`); collision.js:274 (camera ignores props) |
| `'bound'` | outskirts walls | nothing special (top 99) |
| `'tree'`, `'pole'`, `'solid'`, `'shed'`, `'pool'`, `'deck'`, `'platform'`, `'step'`, `'slide'`, `'ramp'`, `'bleacher'`, `'junk'`, `'pipes'`, `'trailer'` | town.js | descriptive only |

Totals: 1366 town solids plus 2154 prop solids, 3520 blocks in all. The largest coordinate of
any solid is 344.

---

## 4. `town.js`: building Bridgeton (825 lines)

### 4.1 Exports and consumers

| export | content | consumer |
|---|---|---|
| `buildTown(scene)` | builds everything | main.js:84 (before `finalizeProps`) |
| `tickTown(t)` | runs `animated[].tick(t)` | main.js:714 (in `update`, not on the title screen) |
| `parkedCars` | `{type, x, z, yaw, color?, name?}`, 100 entries | main.js:91 spawns `Car`s, sets `car.home`, fills `named[name]`; main.js:224 `ensureNamedCar` respawns from it |
| `pedLoops` | `{i, j, pts:[[x0,z0],[x1,z0],[x1,z1],[x0,z1]]}`, 49 | peds.js: spawning, plus crossing to the neighbouring block's loop by `(i±1, j±1)`, bounded by `N` |
| `animated` | `{tick(t)}`, 4 (school flag, 3 ducks) | `tickTown` |
| `lamps` | `{x, z}`, 297 | **nothing** (dead export) |
| `bouncers` | trampoline blocks, 76 | **nothing** (the bounce works through `kind`) |

### 4.2 Build pipeline (`buildTown`, l.775-821)

1. `scene = sc`. This module-level variable is used by `Frame.sign()`, the school flag, the
   water-tower band and the ducks.
2. `streets(F, S)` → one pair of meshes.
3. For each block (i,j): new `S` (outlined) and `F` (flat) `GeoBuilder`s and
   `new Frame(S, F, blockCentreX, blockCentreZ, 0)`, then `switch (MAP[j][i])` (l.795).
4. `outskirts(S)` → one pair of meshes.
5. `addPedLoops()`.

`add(S, F)` (l.777): `S` becomes `toonMesh(..., {outline: 0.045})` (merged, vertex-coloured,
with an inverted-hull outline). `F` becomes a plain `Mesh(MAT.toon)` with `receiveShadow` and
no outline. So **each block costs about 3 draw calls**, plus one per sign.

The RNG is `mulberry32(20171229)`, and `R(a,b)` and `pick(arr, rnd)` use it. All houses depend
on build order, so any change to `MAP` or the build order reshuffles every house.

### 4.3 `Frame` (l.29-63): local authoring frame. Not exported; export it or move it to its own module for reuse.

`new Frame(S, F, ox, oz, yaw=0)`: `wx(lx,lz) = ox + lx*cos + lz*sin`, `wz = oz - lx*sin + lz*cos`.
Local +z is forward (sin yaw, cos yaw) and local +x is the world "left" of that forward, which
matches CLAUDE.md. With yaw 0, local = world offset.

```js
box(color, lx, y0, lz, w, h, d, ly=0, G=S)          // standing on y0
boxC(color, lx, y, lz, w, h, d, ly=0, rx=0, rz=0, G=S)  // centred at y
sphere(color, lx, y, lz, sx, sy=sx, sz=sx, ly=0, G=S)
cyl(color, lx, y, lz, r, h, n=12, rx=0, rz=0, G=S)  // centred at y; ry is the frame yaw, no ly param
cone(color, lx, y, lz, r, h, n=12, G=S)             // unrotated
ico(color, lx, y, lz, s, G=S)                       // random spin
roof(color, lx, y0, lz, w, h, d, ly=0)              // gable prism, ridge along local x
flat(color, lx, lz, w, d, y=CURB+0.02, ly=0)        // 6 cm slab into F, top surface at y
solid(lx, lz, w, d, top=99, kind='building', ly=0) -> block   // AXIS-ALIGNED only (yaw a multiple of 90°)
circ(lx, lz, r, top=99, kind='solid') -> block
prop(type, lx, lz, ly=0)                            // placeProp
mark(name, lx, lz, ly=0)                            // landmarks[name] = {x, z, yaw: frame.yaw+ly}
car(type, lx, lz, ly, extra={})                     // parkedCars.push; ly HAS NO DEFAULT (omit it and yaw is NaN)
sign(text, lx, y, lz, w, h, ly=0, opts={}) -> Mesh  // y = centre height; adds to scene directly
tree(lx, lz, s=1, kind='round'|'pine'|'dead')
```

For a rotated solid that is not a multiple of 90°, use
`ramp(x, z, yaw, w, l, top, top, kind)`, which gives a flat oriented box. The minimap only
draws `BOX` buildings.

### 4.4 `sign()` and text rendering (gfx.js:239-269)

- `signMesh(text, w, h, opts)` returns a `PlaneGeometry(w,h)` with a `MeshBasicMaterial`
  (unlit, so it ignores the toon lighting) and a `CanvasTexture`. It is **one mesh, one
  texture and one draw call per sign**, not merged.
- **The front faces local +z of the sign's yaw.** Lot frames face the street at -z, so house
  signs pass `ly = Math.PI`.
- `textCanvas` options:
  - `bg`: default `'#fff8e6'`; `null` makes the material `transparent`.
  - `fg`
  - `border`: default `'#1d1426'`; `null` for none.
  - `font`: default `"Luckiest Guy", Impact`.
  - `scale`: text height as a fraction of the canvas height. Default 0.62.
  - `ppm`: pixels per metre, default 96. The canvas is capped at 2048 px wide.
  - `stroke`: colour of the text outline.
  - `borderW`
  - `double`: `DoubleSide`.
- `'\n'` splits lines, and the text shrinks to fit 90 % of the width.
- Text is baked at build time, which is why main.js:81 waits for the Luckiest Guy font
  (2.5 s timeout) before `buildTown`.
- Luckiest Guy only ships Google's "latin" subset (U+0000-00FF). That subset covers
  Å Ä Ö Æ Ø, so Swedish and Norwegian text should render. Check this with a screenshot.
- Other text in the world: the school flag (l.358, `double: true`), the water-tower band
  (l.424, a `CylinderGeometry` with `textCanvas`) and the welcome sign (l.758).

### 4.5 Residential blocks

- `residential(bi, bj, b, S, F, special={})` (l.239) splits the block into 6 lots, 3 facing
  each of two opposite streets. The lot size is `LW = W/3 ≈ 20.7` by `LD = W/2 = 31`.
- `ew` defaults to `(bi+bj)%2===1`. With `ew` false, lots face the north and south streets;
  with `ew` true, they face west and east.
- The lot index is `side*3 + k`. Side 0 is north (or west), side 1 is south (or east).
- `special.lots[idx](f, LW, LD)` replaces a house.
- Back fences are `woodfence` props (1596 instances).
- Lot frame: street at local z=0, lot runs back to +z.
- `house(f, LW, LD, o)` (l.107) takes options `stories, w, d, wall, roof, door, garageSide,
  shift, front, roofH, doorX, noGarage, noTree, noYard, noCar`. It returns
  `{hx, gx, front, hw, hd, gs, dx, H}`.
- What a house places:
  - Body solid: top 99, kind `building`.
  - Garage: top CURB+3.2, kind `garage`, climbable.
  - Always a `mailbox` prop; sometimes `flamingo`, `gnome` or `trashcan`.
  - A parked car 36 % of the time.
  - In the back yard: a trampoline (`bounce` r=1.8, top CURB+0.85), a `shed`, a swingset
    (no collider) or a `pool` (top CURB+0.65).
- Special lots: `birchHouse` (l.274, lot 1), `gloubHouse` (288, lot 4), `jayHouse` (295, ew,
  lot 1) and `steveHouse` (309, lot 4). Each places marks, a named car and a name sign.

### 4.6 Whole-block builders: `fn(f, W)` with f at the block centre, yaw 0, local coordinates ±31

| type | fn (lines) | landmarks | notable solids | props | signs (Bigmouth text) |
|---|---|---|---|---|---|
| school | `school` 324-373 | school, gym, schoolLot | 2 buildings, portico columns | trashcan ×2, vending | GYM, BRIDGETON MIDDLE SCHOOL, flag ★★★ (animated) |
| field | `footballField` 375-402 | field | stepped bleachers (5 solids), goalposts | – | BOBCATS 0 · GUESTS 0 |
| tower | `waterTower` 404-433 | tower | 4 legs | bench ×2 | BRIDGETON band (cylinder) |
| cinema | `cinema` 435-452 | cinema | building, marquee (`noFloor`) | newsbox, trashcan | NOW SHOWING…, CINEPLEX |
| glaser | `apartments` 454-482 | glaser | 2 wings | trashcan ×2 | GLASER APTS; car glaserHatch |
| mall | `mall` 484-500 | mall, mallLot | building, 3 lamps | cart ×6, trashcan ×2 | BRIDGETON GALLERIA |
| shops | `shops` 502-538 | pizza | one strip-mall solid | newsbox ×2, bench, trashcan, vending | 5 shop names; icecream car |
| park | `park` 540-591 | gazebo, park, pond | pond `water` circle, gazebo deck, climbable slide (ramp), dirt car jump (ramp) | bench ×3, trashcan | – (3 animated ducks) |
| gas | `gasStation` 593-622 | gas | canopy posts, mini-mart | pump ×4, vending, trashcan, newsbox | GAS 'N' GAS, MINI MART…, prices |
| construct | `construction` 624-662 | construct | 4 ramps, girder deck + ramp, crane, pipes, trailer | crate ×6, barrel ×5, cone ×10, hay ×2 | KEEP OUT · HARD HATS |
| cemetery | `cemetery` 664-680 | cemetery, crypt | crypt | tombstone ×30 | SHAME |

### 4.7 Streets, outskirts, ped loops

- **`streets(F, S)`** (l.684):
  - Ground: an asphalt slab with its top at y=0, size `2*(HALF+RHW+0.5)`, and per-block
    sidewalk slabs with their top at CURB.
  - Grass ring out to **`far = 900`**, with its top at CURB. Beyond ±900 there is no ground
    mesh at all.
  - Outer sidewalk strip, double yellow centre dashes, crosswalks on every approach.
  - 6 lamps per block (`lamp()`, a `'pole'` circle with r=0.16).
  - Hydrant, newsbox and trashcan props from modular patterns (l.730-733).
  - There are no curb ramps; cars step 0.6, which is more than CURB.
- **`outskirts(S)`** (l.737):
  - 200 trees in the band from `EDGE+6` to about `BOUND+30`.
  - 40 hill spheres at radius `BOUND+90..150`, y=-20.
  - **4 `'bound'` boxes** (top 99, 10 m thick) at ±`BOUND`. The world is a square around the
    origin.
  - Welcome sign at (-293.5, 3.55, -240), facing +x.
- **`addPedLoops()`** (l.767): one rectangle per block, inset `RHW + SW*0.55` = 7.425 from the
  road centres.

---

## 5. `props.js`: breakable street furniture (222 lines)

### 5.1 Types (l.7-93)

`r` means a circle footprint, `w×d` an axis-aligned box. `minSpeed` defaults to 3 m/s, read in
car.js:300. Counts are the instances placed in Bridgeton.

| type | footprint | top | coins | shame | minSpeed | placed |
|---|---|---|---|---|---|---|
| mailbox | r 0.32 | 1.30 | 2 | 1 | (3) | 228 |
| trashcan | r 0.38 | 1.05 | 1 | 1 | (3) | 98 |
| hydrant | r 0.30 | 0.85 | 3 | 2 | 6 | 33 |
| newsbox | 0.55×0.5 | 1.15 | 3 | 1 | (3) | 14 |
| flamingo | r 0.25 | 1.00 | 1 | 1 | (3) | 61 |
| gnome | r 0.25 | 0.65 | 2 | 1 | (3) | 50 |
| fence | 2.5×0.16 | 1.35 | 0 | 1 | 2 | **0 (never placed)** |
| woodfence | 2.5×0.16 | 1.80 | 0 | 1 | 2 | 1596 |
| cone | r 0.28 | 0.75 | 1 | 0 | 1 | 10 |
| crate | 1.2×1.2 | 1.20 | 2 | 0 | 5 | 7 |
| bench | 1.9×0.7 | 0.55 | 1 | 1 | 4 | 6 |
| cart | r 0.45 | 1.00 | 1 | 0 | 1 | 6 |
| pump | 0.9×0.6 | 1.90 | 12 | 6 | 5 | 4 |
| vending | 1.0×0.8 | 2.00 | 8 | 2 | 6 | 3 |
| barrel | r 0.42 | 1.05 | 2 | 0 | 4 | 6 |
| hay | 1.6×1.0 | 1.00 | 1 | 0 | 5 | 2 |
| tombstone | 1.0×0.35 | 1.25 | 2 | 3 | 5 | 30 |

Each def has the shape `{ r | (w,d), top, coins, shame, minSpeed?, color (debris tint), build(g: GeoBuilder) }`.
The model is authored at the origin standing on y=0, with +z as the front.

### 5.2 Lifecycle and API

```js
placeProp(type, x, z, yaw=0)        // queues {type, x, z, yaw}; no y parameter
finalizeProps(scene)                // ONE call: per type, an InstancedMesh(MAT.toon) + an outline
                                    // InstancedMesh sharing instanceMatrix, a collision block per
                                    // prop ('prop', ref=prop), a 160-chunk debris InstancedMesh;
                                    // then clears the queue
props                               // runtime list: {type,x,z,yaw,def,idx,alive,respawn,block}
breakProp(p, vx=0, vz=0, game=null) -> p | null   // alive=false, block.dead=true,
                                    // respawn 75-115 s, hide instance, 7 debris (9 for fences),
                                    // game.onPropBroken(p, vx, vz)
tickProps(dt, px, pz)               // respawn only when the focus is >70 m away; debris physics
spawnDebris(x, y, z, color, n, vx=0, vz=0, power=1)
propsNear(x, z, r) -> props[]       // alive props whose radius overlaps; IGNORES HEIGHT
```

Payout happens in `main.js:489 onPropBroken`:
- `audio.smash()`
- `burstCoins(p.x, 0.4, p.z, def.coins, vx, vz)`
- `shame.add(def.shame × (in a car 1.2 : on foot 0.7))`

Break triggers:
- A car hits it at speed > `minSpeed` (car.js:297-303). Below that speed the prop acts as a
  wall.
- A kick or stomp: `areaHit` → `propsNear(x, z, 1.0)` (main.js:842). This ignores `minSpeed`
  and height.

### 5.3 Prop gotchas

- **Props placed after `finalizeProps()` are silently dropped.** `placements.length = 0` runs
  at the end. Calling `finalizeProps` a second time replaces `meshes[type]` and breaks the
  instance indices of existing props. So every world (town and cabin) must be built before
  main.js:85.
- **Props always render at y=0.15** (`p.baseY ?? 0.15`, l.154). `baseY` is never set, and
  `placeProp` has no y. Collision `top` is absolute, so a prop on a raised floor would look and
  collide wrong. Supporting that needs a `baseY` argument plus `top + baseY - 0.15`.
- Debris bounces on a hard-coded floor at y=0.15 (l.209).
- **Cars only collide with props whose `top > car.y + 0.6`.** A car on the curb is at y=0.15,
  so props with top ≤ 0.75 (bench 0.55, gnome 0.65, cone 0.75) are *driven over as floors*
  rather than smashed. A new breakable prop should have `top > 0.75`. (Derived from
  car.js:296, not play-tested.)
- Fences turn only in multiples of 90° (l.127). Box footprints swap w and d when yawed.
- Each type costs 2 draw calls (mesh plus outline), whatever the number of instances.
- **Respawn needs the focus more than 70 m away.** In a cabin shorter than 70 m, broken props
  stay broken for the whole level, which may be what you want.

### 5.4 Type names hard-coded outside the `TYPES` table

- `'fence'` and `'woodfence'`: debris count (props.js:186)
- `'hydrant'`: water splash fx (main.js:493)
- `'pump'`: explosion fx (main.js:494)
- `'mailbox'`: the shot.mjs `smash` scenario (l.309) looks for one

---

## 6. Coupling: who imports what from `world/`

| importer | layout.js | collision.js | town.js | props.js |
|---|---|---|---|---|
| main.js | `lm, landmarks, routeAim, rc, N, LANE, RHW*, CURB, nodeX, nodeZ, neighbors, blockInterior, BOUND, isRoad*` | `groundAt, queryBlocks, contains, circleVsObb` | `buildTown, parkedCars, tickTown` | `finalizeProps, tickProps, breakProp, propsNear, props` |
| missions.js | `lm, nodeId, nodeX, nodeZ, rc, LANE, RHW*, findPath, nearestNode` | – | – | – |
| drivers.js | `LANE, P*, nodeX, nodeZ, neighbors, nearestNode, findPath, nodeI*, nodeJ*, N` | – | – | – |
| shame.js | `nodeX, nodeZ, NN, LANE, nearestNode, neighbors` | – | – | – |
| hud.js | `MAP, N, P, HALF, RHW, rc, BOUND` | `blocks, BOX, CIRCLE` | – | – |
| peds.js | `N` | – | `pedLoops` | – |
| pickups.js | `CURB` | `groundAt, queryBlocks, circleVsBlock, topAt, RAMP` | – | – |
| character.js | – | `queryBlocks, circleVsBlock, groundAt, groundInfo, topAt, RAMP` | – | – |
| car.js | – | `queryBlocks, obbVsBlock, obbVsObb, groundAt, topAt, RAMP` | – | – |
| camera.js | – | `segmentBlocked` | – | – |
| town.js | `P, N, HALF, RHW, SW, CURB, EDGE, BOUND, rc, blockInterior, MAP, landmarks` | `box, circle, ramp` | – | `placeProp` |
| props.js | – | `box, circle` | – | – |

`*` marks names that are imported but not used in that file.
Test hooks: `window.__lm = lm`, `window.__props = props` (main.js:1118-1119).

---

## 7. Hard-coded town knowledge outside `world/` (change these when `MAP`, `P` or `N` change)

- **main.js:753-758 `resetToRoad()` (the R key)** hard-codes `80` and `280` instead of `P` and
  `HALF`, and clamps to the grid.
- main.js:344 `freeSpot()` rejects |x| or |z| > `BOUND-5`. It is used by missions.js:169 and
  :327 (rabbits, wreck items) and :601.
- main.js:45 `blockCenter(i,j)` is used with specific block indices:
  - `placeWorldCoins` (l.255-265): construct (6,4), park (3,3), field (5,0)
  - `recordSpots` (l.268-279): field, construct, cinema (2,1), park, cemetery (5,6), plus
    `birchGarage` and `jayTramp`
  - `mosquitoSpots` (l.281-284): (3,0), (4,3), (2,2), (5,6), (5,0), (3,3), (3,2)
  - The offsets are tuned to Bigmouth geometry, such as the bleachers and decks.
- main.js:30 `HOMES`, :31 `MAP_LABELS`, :122 start position, :689 title orbit, :607 muscle car
  at `rc(3)+LANE`.
- missions.js:
  - :402: `start {x: rc(4)+34, z: rc(1)+LANE+0.4}` and
    `via: [nodeId(5,1), nodeId(6,2), nodeId(5,4), nodeId(4,4)]`
  - :444-446: race `start`/`finish` at `rc(3)+30`/`rc(3)+32`, `rc(2)`; plus the
    `checkpoints [[i,j]...]`
  - :301: flee fallback `nearestNode(f.x+90, f.z)`
- hud.js:
  - :14 `MAP_EXT = BOUND+20`. The minimap base canvas covers only ±334 m.
  - :71 the asphalt rectangle comes from `HALF`.
  - :72 the `colors` table is keyed by `MAP` type strings.
  - :94-98 the centre lines come from `N`.
  - :309 the big map is cropped to `HALF+16`.
  - :364 `niceCarName` table.
- shot.mjs: `views` landmark list (l.68), `birchWagon` in 6 scenarios, `jayTramp`, `park`,
  `birchDrive`, the literal `-40 + 2.75` (= `rc(3)+LANE`, l.457), and the `'mailbox'` type
  (l.309).
- Loading text "Building Bridgeton…" (main.js:82).

---

## 8. Can a second, separate world (the aeroplane cabin) live at x=+3000?

**Yes.** Nothing in collision, rendering or physics breaks. Several gameplay helpers assume the
player is in the town and need a level check.

### 8.1 What works unchanged

- **Collision:** the hash is global. x=3000 is cell 187, well inside the ±4096-cell key range,
  and there is no extents table.
- **Floor:** `baseGround` is CURB off the grid, so the cabin floor at y=0.15 works with no
  floor solid. `groundAt`, ramps, `'bounce'`, car roofs, OBB SAT, `circleVsBlock` and
  `segmentBlocked` are all position-agnostic.
- **Isolation:**
  - Camera far = 1800 and `Fog(220, 760)`, so the town (2700+ m away) is invisible.
  - The grass ring stops at ±900, so the cabin floats in sky. The sky dome uses
    `clamp(vP.y*1.5)`, so below the horizon is the horizon colour.
  - The sky dome and clouds follow the camera (gfx.js:286, 312).
  - The shadow frustum (±75 m) follows the focus (`followSun`).

  Together this is a ready-made "in the air" backdrop. For a sense of motion, add a few cloud
  puffs below window height that slide backwards via an `animated` tick.
- **Precision:** float32 at 3000 m is about 0.25 mm. Fine.
- **Missions:** `at()` accepts raw `{x,z,yaw}`, and `lm()` works for any registered landmark.
  NPC placement (`placeNpcs`) and `teleport` work anywhere.

### 8.2 What breaks or misbehaves in the cabin, with fixes

1. **Floors above about 0.8 m are a trap.** `teleport()` and `Car.place()` snap with
   `groundAt(x,z,0.2,0.6)` (character.js:39, car.js:193). Wall tops are absolute (§3.3). Keep
   the cabin floor at CURB. Use raised steps (aisle, galley) of ≤ 0.6 only. Seats can be
   floors (top ≤ 0.6) or walls.
2. **Nothing encloses the cabin.** The invisible floor is infinite. Wrap the cabin in thick
   `box(..., 99, 'bound')` walls (≥ 1 m thick, for the camera ray samples and tunnelling).
3. **There are no ceilings.** The camera rises freely (pitch up to 1.15, 6 m back,
   camera.js:37-65), and `segmentBlocked` only pulls the camera in horizontally, to at least
   1.6 m. Options:
   - Leave the roof off (a "dollhouse" cutaway).
   - Use a ceiling plane that faces down only, with `FrontSide` and no outline hull, so it is
     invisible from above.
   - Add a cabin camera mode with a shorter `dist` and capped pitch.

   A 4 m wide cabin will keep the camera pulled in against the walls.
4. **`resetToRoad` (R)** teleports the player back into the town (hard-coded grid). Guard it,
   or make it reset to a cabin spawn.
5. **`freeSpot`** always fails at |x| > 309 and falls back to the centre point, so any mission
   stage that uses it (rabbit-style collectables, wreck drops) spawns everything at one point.
   Make the bounds level-aware.
6. **Routing:**
   - `routeAim` aims straight only below 45 m. Beyond that it routes via town nodes, because
     `nearestNode` clamps to grid edge node (7, j), so the guide arrow points towards Bridgeton.
     Keep cabin targets less than 45 m apart, or skip `routeAim` in the cabin.
   - The mission giver "bang" target appears when the player is more than 25 m away.
7. **Minimap and big map:** the base map covers only ±334 m. In the cabin the minimap shows
   flat green (#6fae4f) plus markers. The big map is cropped to the town, and cabin markers fall
   off-canvas. Hide both in the cabin or draw a cabin plan.
8. **Shame pursuit:** `startPursuit` finds no node 70-150 m away, so no hearses spawn (silently).
   Disable shame in the cabin or replace it with a cabin "threat" (a stewardess?).
9. **Props:** build the cabin, including its props, **before `finalizeProps()`**, which means
   at init. Props render at y=0.15, so a drinks trolley on the floor is fine and a glass on a
   tray table is not. Broken cabin props won't respawn while the player is inside.
   `propsNear` kicks ignore height.
10. **Background simulation:** traffic (22 cars), 34 peds and NPCs keep simulating in the
    town. That costs CPU only. `carThreat` and cars-vs-people find nothing near the cabin.
11. **Title screen** orbits `lm('birch')`, and the player start is `lm('birch')`. Point these
    at the cabin (or the gate) for level 1.

### 8.3 Suggested shape

- **New module:** `src/world/cabin.js`. Export `buildCabin(scene)` and call it from main.js
  after `buildTown` and before `finalizeProps`.
- **Frame:** reuse `Frame` by exporting it from town.js or moving it to `world/frame.js`. Note
  that `Frame.sign` uses town.js's module `scene`, which is set in `buildTown`.
- **Placement:** put a `Frame` at (3000, 0) with yaw 0 so local = world offset. Run the cabin
  along z: a narrow-body is about 3.5 m wide and 30 m long.
- **Landmarks:** register them with `landmarks.x = {...}` or `f.mark`, for example
  `cabinSeat`, `cabinAisle`, `galley`, `toilet`, `cockpitDoor`. Keep internal ids ASCII; only
  the player-facing text is Swedish or Norwegian.
- **Seat rows:** use box solids with top about 0.6 so they are walkable "steps". Their seat
  backs are separate thin walls with top about 1.4, plus thick outer walls with top 99.
- **Breakable props:** add new types such as `trolley` (drinks cart), `tray`, `bag` and
  `lifevest`. There are no cars in the cabin, so only kicks break them: `minSpeed` and the
  `top > 0.75` rule do not matter there.
- **Level flag:** add a level flag (`game.level = 'flight' | 'island'`) and use it to guard §8.2
  items 4-8 and 11.

---

## 9. Engine (keep) vs Bigmouth content (replace)

| file | keep as engine | replace or reskin as content |
|---|---|---|
| layout.js | constants mechanism, `rc`, `blockInterior`, `isRoad`/`baseGround`, the whole road graph and routing, the landmark registry | `MAP` (Gran Canaria resort: hotels, pool, beach strip, bodega, tourist office, disco, …), the "Bridgeton" comment; maybe retune `N`/`P` (then fix §7) |
| collision.js | everything | – |
| town.js | `Frame`, `tree`/`lamp`/`bush` helpers (palm variant wanted), `streets()` structure, `outskirts()` structure and `'bound'` walls, `addPedLoops`, `buildTown` loop/merge, exports, the trampoline `'bounce'` mechanic | palettes `WALLS/ROOFS/DOORS/LAWN` (US suburb → whitewash, terracotta, bougainvillea), `house()` (US house + garage + mailbox → bungalows/apartment hotels with balconies and pools), the 4 special lots, all 11 block builders, every sign string, the "WELCOME TO BRIDGETON" sign, the water-tower band, the grass ring/hills colours (→ sand/volcanic/sea) |
| props.js | instancing, `finalizeProps`, `breakProp`, respawn, debris, `propsNear`, `placeProp` | `TYPES`: drop gnome, flamingo?, tombstone, hay, pump (and its fx hook in main.js:494), US mailbox; add parasoll, solstol/sunbed, beach ball, resväska/luggage, souvenir stand, ice-cream sign, potted palm, drinks trolley; keep trashcan, bench, cone, crate, barrel, cart, vending |

**Gotchas for the content swap:**
- **Rename landmarks in step.** Change `HOMES`, `MAP_LABELS`, the missions and the shot.mjs
  `views` list in the same commit (§2).
- **`niceCarName` and car types:** car types are defined in car.js (sedan, hatch, wagon, van,
  pickup, hearse, muscle, bus, icecream). `Frame.car` passes the type string straight through.
- **Sign orientation:** a sign faces local +z. Lot-frame content faces local -z, so use
  `ly = π`.
- **Axis-aligned solids:** `Frame.solid` is axis-aligned only. Use `ramp(..., top, top)` for a
  rotated solid.
- **Run the story scenario after any rename:** `node tools/shot.mjs story` must still end with
  `#7 idle` and `no errors`.
