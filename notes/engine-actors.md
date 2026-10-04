# Engine map: actors (`src/actors/*`)

Scope: `car.js` (420 lines), `character.js` (163), `drivers.js` (246), `peds.js` (97),
`models.js` (491), `pickups.js` (241) in `charter_and_run__sallskapsresan/`. The folder is
still an unmodified copy of Bigmouth & Run. Refs like `car.js:206` point into `src/actors/`;
`main.js:NNN`, `hud.js:NNN` and so on point to the code that uses the actors. Units: metres,
seconds, m/s, radians. Yaw convention: forward = (sin yaw, cos yaw), right = (-cos yaw, sin yaw)
= local -X. Positive steer turns right, which makes yaw smaller. Drivers sit on local +X.

---

## 0. Read these first

1. **`maxSpeed` slows acceleration down but does not cap speed** (`car.js:215-216`).
   `vf += accel*thr*Math.max(0.08, 1 - vf/maxSpeed)*dt`. Above maxSpeed the push stays at 8 % of
   `accel`, and only the quadratic drag (`car.js:229`) holds it back. Every stock car levels off
   close to its maxSpeed (I simulated it: the sedan reaches 29.5 against 31). A slow vehicle does
   not. With a trolley spec of maxSpeed 1.6 and accel 3, holding throttle gives 3.5 m/s after 10 s,
   7.6 m/s after 30 s and 14 m/s after 2 min. As the player car it reaches 28 m/s. **Any slow
   vehicle needs a real cap.**
2. **The player's car runs at 2x** (`car.js:205-207`): top speed and acceleration x2, reverse
   and brake impulses x2, drag /2. This applies whenever `game.playerCar === this`, and no spec
   can turn it off. The sedan's 31 m/s becomes 62 m/s (223 km/h).
3. **Ground snapping only finds floors up to 0.8 m.** `Car.place` (`car.js:193`) and
   `Character` ctor/`teleport` (`character.js:18,39`) call `groundAt(x, z, 0.2, 0.6)`. Build an
   aircraft cabin floor at ground level and show the altitude with visuals only.
4. **There are no ceilings.** A solid is a 2D footprint plus a top height (`world/collision.js`).
   A jump (8.6 m/s, apex about 1.5 m), a double jump, or a flung body goes straight through a
   cabin ceiling mesh.
5. **AIDriver only works on the square-grid road graph** (`drivers.js:5`). On a road network
   that is not a grid, a dead end breaks `wander`: it pushes an `undefined` node and aims at NaN
   (`drivers.js:29-38`). An edge shorter than 2·M = 17 m produces a lane segment that runs
   backwards. The `flee` mode samples node ids as `0..(N+1)²-1` (`drivers.js:164`).
6. **Ped loops must be axis-aligned 4-corner rectangles with grid `{i, j}`** (`peds.js:16-22,
   31, 40-44`).
7. **Dead or unused hooks**:
   - `state = 'hidden'` is never set anywhere.
   - `invulnerable` is never set on a car or a character.
   - `Character.floats` (`character.js:30`) is never read.
   - `Car.seatWorld()` (`car.js:184`) is never called.
   - `st.yell` / `st.cheer` / `st.look` in `animateCharacter` are never driven by game code.
8. **Seat geometry is copied in four places** that disagree slightly:
   - `car.js:186` (`seatWorld`, unused)
   - `main.js:178-179` (`addBust`)
   - `main.js:296-297` (`seat`)
   - the seats and steering wheel drawn in `buildCarModel` (`car.js:85-89`)
9. **English or Big Mouth text inside actors**:
   - ped panic shouts, `peds.js:68`
   - `CAR_TYPES[*].name`, shown on the speedo via `hud.js:139`
   - `CHARS[*].name`
   - the speedo shows mph (`hud.js:134`, ×2.237). For km/h use ×3.6.
10. **A drinks trolley can work as a `Car`.** It needs about ten small, contained engine changes
    (see §2.8). The airplane aisle also needs its own AI path, because LanePath is grid-only.

---

## 1. Module graph and the `game` contract

| module | imports | exports | used by |
|---|---|---|---|
| `car.js` | gfx (`THREE, GeoBuilder, toonMesh, MAT, mat, PRIM`), collision (`queryBlocks, obbVsBlock, obbVsObb, groundAt, topAt, RAMP`), util, `game/fx.js` as `FX` | `CAR_TYPES`, `Car`, `collideCars` | main.js, shame.js (`new Car('hearse')`) |
| `character.js` | models (`buildCharacter, animateCharacter`), collision (`queryBlocks, circleVsBlock, groundAt, groundInfo, topAt, RAMP`), util | `STEP` (=0.45 step height), `Character` | main.js, peds.js, shame.js |
| `drivers.js` | layout (`LANE, nodeX, nodeZ, neighbors, nearestNode, findPath, N`; `P, nodeI, nodeJ` imported but unused), util | `LanePath`, `startNodes`, `pathTo`, `AIDriver` | main.js, missions.js, shame.js, tools/shot.mjs |
| `peds.js` | character, models (`randomPed`), town (`pedLoops`), layout (`N`), util | `Ped`, `spawnPeds` | main.js |
| `models.js` | gfx, `three/addons/utils/BufferGeometryUtils.js` (`mergeVertices`), util | `CHARS`, `buildCharacter`, `animateCharacter`, `randomPed`, `buildBust` | main.js, character.js, peds.js, shame.js, hud.js (`renderPortrait` takes a model) |
| `pickups.js` | gfx (`outlineGeometry, outlineMat` for the instanced coins), collision, layout (`CURB`, unused) | `coins`, `initCoins`, `placeCoin`, `burstCoins`, `tickCoins`, `Collectible`, `Rabbit` | main.js, missions.js |

Name clash: `character.js` exports `STEP = 0.45`, a step height. `main.js:25` has its own
`STEP = 1/60`, the fixed timestep. They are unrelated.

**Duck-typed `game` hooks the actors call** (all implemented on `Game` in main.js):

| caller | hook | guarded? |
|---|---|---|
| `Car.step` | `game.playerCar` (2x boost); `game.onCarLanded(car, impact)` (`car.js:259`) | `game &&` / `game?.` |
| `Car.collideStatic` | `game.breakProp(propRef, vx, vz, car)` (`car.js:301`) | `&& game` |
| `Car.resolveStatic` | `game.onCarImpact(car, null, impact, cx, cz, block)` (`car.js:328`) | `&& game` |
| `Car.damage` | `game.onCarDestroyed(car)` (`car.js:346`) | `game?.` |
| `collideCars` | `game.onCarImpact(a, b, impact, cx, cz)` (`car.js:412`) | `game?.` |
| `Character.step` | `game.carRoofAt(x, z, ytop)` (`character.js:97`), **called whenever game is truthy, not optional**; `onLand(ch, v)`, `onBounce(ch)`, `onBodyBounce(ch)`, `onGetUp(ch)` | `game?.` except carRoofAt |
| `AIDriver.update` | `game.obstacleAhead(car, range)` returns `{dist, isPlayer}` or null (`drivers.js:209`); `game.onHonk(car)` | **unguarded.** `game` is required unless `avoid:false` |
| `Ped.update` | `game.carThreat(x, z)` returns `{dx, dz}` or null; `game.say(char, text, secs)` | unguarded |
| `tickCoins` | `game.collectCoin(coin)` | unguarded |

**Simulation order** (`main.js:792-838`, fixed 60 Hz, at most 4 substeps per frame):

1. player intent written into `playerCar.ctrl` or `player.wishX/Z`
2. kick hit
3. `car.ai.update(h, game)` for every car (824)
4. `car.step(h, game)` for every car (825)
5. `collideCars` over all pairs, O(n²) (827)
6. `player.step` (only when not in a car)
7. per ped: `ped.update` → `ped.char.step`
8. NPCs: wish set to zero, then `step` (seated NPCs skipped)
9. `carsVsPeople()` (837)

Rendering runs per frame in `syncAll` (`main.js:912`): `car.sync(dt)` for cars within 320 m of
the camera, `char.sync(dt)` for peds within 190 m (the rest are hidden but still simulated),
and every NPC.

---

## 2. `car.js`: vehicles

### 2.1 `CAR_TYPES` (`car.js:9-19`) plus derived numbers

Derived: height = `wheelR*.95 + bodyH (+ cabinH + .13 if not tall)`; radius =
`hypot(wid,len)/2`; steering wheelbase = `len*.62`; axle z = `±(len/2 - wheelR - (bus?1.2:.38))`.

| key | name (EN) | len | wid | bodyH | cabinH | wheelR | maxSpeed m/s (km/h) | accel | grip | steer | mass | hp | flags | height | radius |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sedan | Sedan | 4.5 | 1.9 | .62 | .68 | .36 | 31 (112) | 12 | 9.5 | .60 | 1400 | 100 | cabin [-.30,.12] | 1.77 | 2.44 |
| hatch | Hatchback | 3.9 | 1.8 | .62 | .70 | .34 | 30 (108) | 13 | 10.5 | .64 | 1100 | 85 | cabin [-.44,.10] | 1.77 | 2.15 |
| wagon | Family Wagon | 4.9 | 1.95 | .62 | .72 | .37 | 30 (108) | 11.5 | 9.2 | .60 | 1500 | 115 | cabin [-.46,.12], `wood` | 1.82 | 2.64 |
| van | Van | 5.0 | 2.05 | 1.5 | 0 | .38 | 26 (94) | 9.5 | 8.2 | .58 | 2100 | 140 | `tall` | 1.86 | 2.70 |
| pickup | Pickup | 5.1 | 2.0 | .75 | .75 | .42 | 29 (104) | 11 | 8.6 | .58 | 1900 | 130 | cabin [-.05,.20], `bed` | 2.03 | 2.74 |
| hearse | Hearse | 5.8 | 2.0 | .62 | .82 | .38 | 33 (119) | 12.5 | 9.2 | .56 | 2000 | 150 | cabin [-.47,.08], color 0x1d1426, `hearse` | 1.93 | 3.07 |
| muscle | Hormone Rocket | 4.7 | 2.0 | .56 | .58 | .40 | 41 (148) | 17 | 10.5 | .62 | 1500 | 120 | cabin [-.25,.05], color 0xd8321e, `muscle` | 1.65 | 2.55 |
| bus | School Bus | 10.5 | 2.5 | 2.2 | 0 | .50 | 21 (76) | 6.5 | 7.5 | .52 | 7000 | 300 | color 0xf2c12e, `tall`, `bus` | 2.68 | 5.40 |
| icecream | Ice Cream Truck | 5.4 | 2.1 | 1.7 | 0 | .40 | 24 (86) | 8.5 | 8 | .56 | 2300 | 140 | color 0xfafafa, `tall`, `icecream` | 2.08 | 2.90 |

As the player car, double these speeds. `COLORS` (`car.js:20`) holds 12 random paint colours,
used when neither `opts.color` nor `spec.color` is set.

### 2.2 Spec fields (all read straight from `car.spec`)

| field | meaning / where used |
|---|---|
| `name` | display name: HUD speedo when `car.name` is unset (`hud.js:139`), plus the `niceCarName` map at `hud.js:364` |
| `len`, `wid` | OBB half extents `hz=len/2`, `hx=wid/2` (`car.js:157`); radius; inertia `mass*(len²+wid²)/12`; wheelbase `len*.62` for steering (`car.js:235`); pitch probes ±`len*.35` (`car.js:366`); also obstacle tests, camera distance and exit spots in main.js and camera.js |
| `bodyH` | body box height above `y0 = wheelR*.95` |
| `cabinH` | height of the open cabin (pillars and roof). Use 0 for `tall` |
| `cabin: [c0, c1]` | cabin rear and front as **fractions of len** (rear negative). Required unless `tall` |
| `wheelR` | wheel radius, which also sets ride height (`y0`) and wheel spin rate |
| `maxSpeed` | soft speed knee in m/s (see §0.1). Also chase-AI direct speed `maxSpeed*.95` (`drivers.js:174`) and reverse limit `maxSpeed*.35` (`car.js:222`) |
| `accel` | forward acceleration in m/s² at zero speed |
| `grip` | lateral-velocity decay rate `vr *= exp(-grip*dt)`. Drops to 1.7 under handbrake (drift) |
| `steer` | max steer angle in rad, reduced with speed: `steer/(1+|v|/15)` |
| `mass` | impulse response (walls, car-car) and damage share |
| `hp` | health. Smoke below 35, dark smoke below 15, wreck at 0 |
| `color` | fixed paint (overrides the random pick) |
| `tall` | boxy van/bus body, driver at `z = len/2-1.6`, height has no cabin |
| `wood`, `bed`, `hearse`, `muscle`, `bus`, `icecream` | **content flags.** Each adds its own geometry in `buildCarModel`. `bus` also moves the axles 1.2 m inward (`car.js:138`) and gets 8 windows per side |

`new Car(type, {spec})` shallow-merges overrides: `this.spec = {...CAR_TYPES[type], ...opts.spec}`
(`car.js:120`). `car.spec` is a per-instance copy, so changing it at runtime is safe.
`shame.js:69` does `car.spec.maxSpeed = 28` and `CAR_TYPES` is unaffected.

### 2.3 How a car model is built

`buildCarModel(s, color)` (`car.js:24-103`) returns `{geo, glass}`. All primitives go through one
`GeoBuilder` (vertex colours, merged into one BufferGeometry). Glass goes into a second builder.

- `y0 = wheelR*.95` (body bottom), `top = y0 + bodyH`. Colour helpers: `dark = shade(color,.7)`,
  `trim 0x2a2a30`, `chrome 0xd8dce0`.
- **Tall branch** (`car.js:29-51`):
  - main box `W × bodyH × (L-.5)`, shifted back 0.25
  - lower cab nose of 1.6 m at `cabZ = L/2-1.3`
  - roof lip, door-pillar trims, raked windscreen glass at `L/2-.55`
  - `bus`: 8 windows per side at 1.05 m pitch, a black stripe, a red stop sign
  - otherwise: one side window of `L*.45`
  - `icecream`: a cone and a scoop on the roof, plus a pink stripe
  - **Assumes L ≥ about 3 m.** Smaller and the boxes poke out (§2.8).
- **Car branch** (`car.js:52-90`):
  - full-length lower body
  - hood panel over the front 40 %
  - A-pillars (raked -0.35) at `z1=c1*L`, C-pillars at `z0=c0*L`
  - roof slab from z0 to z1
  - front and rear glass
  - flag extras: `wood` side panels; `hearse` closed rear sides, purple curtains and chrome strip;
    `bed` pickup bed; `muscle` stripes, scoop and spoiler
  - two seats at x = ±`W*.22`, z = -0.1
  - steering-wheel torus at x = +`W*.22`, z = `z1-.55`, on the driver side (+X)
- **Always added** (`car.js:91-101`): bumpers (`W+.06` wide), headlights and taillights at
  `±(W/2-.3)`, grille. Hearse gets a roof box.
- Wheels (`car.js:105-113, 136-147`):
  - one shared unit wheel geometry (tyre r=1, rim, hub)
  - each wheel is a `toonMesh` scaled `(0.36, wr, wr)` in a pivot `Group` at
    `(±(wid/2-.02), wr, ±axleZ)`
  - `wheels[] = {piv, mesh, front}`
  - `sync` spins `mesh.rotation.x` and steers the front `piv.rotation.y = -steerAngle`
- Scene graph: `root` (position x,y,z; `rotation.y = yaw`) → `tilt` (pitch, roll, landing bump)
  → body `toonMesh(geo, outline .035)`, glass `Mesh(MAT.glass)` with `renderOrder 2`, 4 wheel
  pivots. **Seated Characters and driver busts are added to `car.tilt`** (`main.js:190, 295`).
- Draw calls per car: body + outline + glass + 4×(wheel + outline) = 11. A bust adds 3.
- Wreck: `body.material = MAT.burnt`. `repair()` restores `MAT.toon`.

### 2.4 `Car` instance API (`car.js:118-383`)

```js
new Car(type, { spec?, name?, color?, x?, z?, yaw? })   // y starts at 0.15; call place() to ground it
car.place(x, z, yaw)        // zero velocity, snap to ground (floors <= 0.8 m only)
car.step(dt, game)          // physics (fixed step)
car.sync(dt)                // visuals: root/tilt transform, pitch from ground slope, roll, wheels
car.damage(amount, game)    // honours car.invulnerable and car.damageScale
car.repair()
car.updateObb()
car.speed                   // |v|
car.forwardSpeed            // v · forward
car.seatWorld(side, out)    // unused; disagrees with main.js seat()
```

Fields:

| group | fields |
|---|---|
| identity | `type`, `id`, `name`, `color`, `spec` |
| pose and motion | `x, y, z, yaw, vx, vy, vz, w` (yaw rate), `steerAngle`, `air`, `pitch`, `roll`, `bump` |
| health | `hp`, `dead`, `burn` |
| mass | `mass`, `inertia` |
| collision | `obb {x,z,fx,fz,hx,hz}`, `radius`, `height` |
| occupants and control | `driver`, `passengers[]`, `ai` (any object with `update(dt, game)`) |
| controls | `ctrl {throttle 0..1, brake 0..1, steer -1..1, handbrake, park}`, with `park:true` by default |
| audio and FX | `wheelSpin`, `revs` (0..~1, engine audio), `skidAmt` (0..1), `smokeT`, `lastHit` (unused) |

Fields that main.js, missions.js and shame.js attach to cars:

| field | meaning |
|---|---|
| `locked` | can't enter; skipped by recycling and by the mission spot-clear |
| `traffic` | ambient traffic. Recycled; counts for shame |
| `home` | parked-car record |
| `driverBust` | the bust Object3D; entering a car with one is a carjack |
| `bust` | |
| `isTarget`, `isHearse` | |
| `damageScale`, `invulnerable` | |
| `deadT` | |

### 2.5 `Car.step` physics (`car.js:198-289`)

Speeds are split into forward `vf` and lateral `vr` along the car axes.

| phase | behaviour | constant |
|---|---|---|
| throttle | when moving backwards (vf < -0.5): brake towards 0 at 24·boost. Otherwise `vf += accel·thr·max(.08, 1-vf/maxSpeed)·dt` | soft cap, §0.1 |
| brake | when moving forward (vf > .5): `-24·boost·brk`. Otherwise reverse at `.6·accel` up to `-.35·maxSpeed` | |
| coast | no input: `-2.2 m/s²` | hard-coded |
| handbrake | extra `-5 m/s²`, grip → 1.7, yaw target ×1.5, yaw damping 4 | |
| no driver/AI or `park` | roll-out friction 9 m/s² (6 when dead) | `driven = !dead && (driver \|\| ai)` |
| drag | `vf -= vf·|vf|·(.0011/boost)·dt` | |
| steering | `maxSteer = steer/(1+|vf|/15)`; `steerAngle` damped at rate 12; `targetW = -vf·tan(steerAngle)/(len·.62)`; `w` damped at rate 8 | bicycle model, **cannot turn on the spot** |
| in the air | no control; `w *= exp(-.6dt)`; gravity 22 | |
| ground | `gh = groundAt(x,z,y,0.6)`. If ground drops > .35 below → airborne, keeping vy. Otherwise `vy = clamp((gh-y)/dt, -6, 12)`. This is how ramps launch cars | step height **0.6 hard-coded** |
| landing | impact > 4 → bump plus `onCarLanded`; > 13 → `damage((i-13)·2.5)` | |
| skid | burnout (thr > .9, vf < 3, handbrake), hard brake above 8 m/s, or `|vr| > 3` | main.js turns this into skid marks and sound |

### 2.6 Collisions and damage

- **Static** (`collideStatic`, `car.js:291-311`):
  - query blocks in the radius AABB
  - **skip any block whose top ≤ y+0.6** (`car.js:296`). This check runs before the prop check,
    so props and seats lower than 0.6 m are driven through or over
  - `prop` blocks break when speed > `ref.def.minSpeed ?? 3`; the car keeps 92 % of its speed
  - otherwise `obbVsBlock` → `resolveStatic`: positional push (max 1.5), rigid-body impulse with
    restitution .22 at the contact point (lever ×.7), tangential friction .12
  - impact > 2.5 → `onCarImpact`; > 5 → `damage((i-5)·2)`
- **Car vs car** (`collideCars`, `car.js:391-420`):
  - radius early-out
  - vertical overlap test (`a.y > b.y+b.height-.3` → no hit, so one car can sit on another)
  - SAT `obbVsObb`, push split by mass, impulse restitution .3
  - impact > 2 → `onCarImpact`; > 4 → each car takes `(i-4)·1.6·(other mass share)·2`
- **Car vs people** lives in `main.js:873-910` (`carsVsPeople`):
  - closing speed > **4.5 m/s** (hard-coded, 883) flings a `normal` character with
    `(car.v·1.05 + n·3, 4.5 + speed·.22)`, and the car keeps 94 % of its speed
  - slower contact pushes the person out by position only; the car feels nothing
- Wreck (`damage`, `car.js:334-348`): hp ≤ 0 → `dead`, `burn=6` s of fire, burnt material,
  explosion, pop-up `vy=6`, random spin, `onCarDestroyed`. main.js ejects and flings occupants,
  bursts 8 coins, adds shame.

### 2.7 Adding a car type (checklist)

1. Add an entry to `CAR_TYPES` with `name, len, wid, bodyH, cabinH, wheelR, maxSpeed, accel,
   grip, steer, mass, hp`, plus `tall:true` **or** `cabin:[c0,c1]`, and an optional `color`.
2. For a new look, add a flag and a branch in `buildCarModel`. For anything outside normal car
   proportions, add an early return to a custom builder **before** the bumper and light block,
   e.g. `if (s.build) return s.build(s, color)`. The builder must return `{geo, glass|null}`.
3. Spawning:
   - traffic mix: list at `main.js:209`
   - parked: `town.js` frame helper `f.car(type, lx, lz, ly, {color, name})` (`town.js:54`),
     which fills `parkedCars`
   - missions: `g.spawnMissionCar(m, type, x, z, yaw, opts)` (`main.js:234`)
4. Display name: Swedish `spec.name`, and `niceCarName` in `hud.js:364` for named cars.
5. If the vehicle is not a car:
   - engine and skid audio in `main.js:1063-1086`
   - speedo in `hud.js:131`
   - chase-cam distance and height in `camera.js:52-53` (`car.height+.9`, `5.2+len*.75`)

### 2.8 Can an airplane drinks trolley pushed down a 1.5 m aisle work as a `Car`?

**Yes, and it is the cheapest route.** The Car code already provides OBB collision against walls,
props and people, `ctrl` plus input, the chase camera, enter/exit with E, the HUD, car-on-car
impulses, and AI hooks. The pieces that break are all in one-line places.

Proposed spec (my numbers, tested with a re-implementation of `car.js:209-247`):

```js
trolley: { name: 'Serveringsvagn', len: 0.85, wid: 0.42, bodyH: 0.95, cabinH: 0, wheelR: 0.06,
  maxSpeed: 1.6, accel: 3, grip: 16, steer: 0.35, mass: 80, hp: 60, color: 0xc8ccd2,
  tall: true, trolley: true /* + the new knobs below */ }
```

Simulated: 1.37 m/s after 1 s, 90 % of maxSpeed in 1.2 s, coasts to a stop in 0.8 s, full-lock
turn radius 1.7 m. That is too wide to U-turn in a 1.5 m aisle, but the trolley can reverse at
`.35·maxSpeed`. OBB half-width 0.21 leaves 0.54 m on each side.

What breaks today, and the fix:

| # | problem | where | fix |
|---|---|---|---|
| 1 | no real top speed (reaches 14 m/s after 2 min, 28 as the player) | `car.js:215-216` | stop thrust once `vf >= maxSpeed`: `t > 0 ? Math.max(.08, t) : 0`, or a `s.hardCap` flag |
| 2 | player 2x boost (3.2 m/s and 48 m/s² brakes) | `car.js:206` | `&& !s.noBoost` |
| 3 | tall-branch model is broken below about 3 m: cab box at `L/2-1.3`, main box `L-.5` long. Car branch: two 0.55 m seats in a 0.42 m body. Bumpers and lamps always added | `car.js:29-101` | custom `buildTrolley` with an early return (box with drawers, top tray with cans and cups, push bar at the rear, no glass) |
| 4 | wheels: axle z = `.425-.06-.38 = -0.015`, so front and rear axles **swap places**; tyre width fixed at 0.27 m (`scale.x .36`) on x = ±0.19, so the wheels overlap | `car.js:138, 143` | `s.wheelZ ?? …`, `s.wheelX ?? …`, `s.wheelW ?? .36` |
| 5 | drives over anything below 0.6 m (seat cushions, bags) and climbs 0.6 m floors | `car.js:250, 296, 367` | `s.stepH ?? 0.6` (use about 0.1 for the trolley). Or make seat-row colliders taller than `floor+0.6`, e.g. the seat back at 1.1 |
| 6 | the driver is seated inside, legs forward at -1.45, at `side*wid*.22` | `main.js:289-306`; `character.js:142-150`; `models.js:398-403` | trolley branch in `seat()`: root at `(0, 0, -len/2-.35)` in `car.tilt`. In `Character.sync`, if `car.spec.pushed`, set `a.seated=false`, `a.speed=car.speed`, `a.push=true`. Add `st.push` to the ground branch of `animateCharacter` (arms about `(-1.3,0,∓.15)`) |
| 7 | car engine drone, skid marks, burnout smoke, car horn | `main.js:1063-1086`; `car.js:217,221,231` | `spec.silent`, or `audio:'trolley'` (squeaky wheel via `audio.tone`). Skip skid FX |
| 8 | can't knock people over (needs 4.5 m/s closing), and when it does the fling is huge | `main.js:883-886` | `car.spec.flingSpeed ?? 4.5` and a fling scale |
| 9 | camera 5.8 m behind at 1.9 m height. Walls pull it in to 1.6 m minimum; seat rows (below 1.85 m) don't. Nothing keeps it under a ceiling | `camera.js:52-53, 66-70` | `spec.camDist/camH`, plus a per-level ceiling clamp |
| 10 | speedo shows mph and an hp bar | `hud.js:131-140` | hide for trolleys, or km/h |

Things that already work without changes:

- `obstacleAhead` and car-vs-car use `spec.len/wid`.
- `exitSpot` falls back to front or back when the sides are blocked (`main.js:327`). But
  `spotFree` ignores blocks lower than `y+.5`, so you can step out onto a seat cushion.
- Breakable props with `minSpeed ≤ 3`, if they are taller than the step (#5).
- `carRoofAt` lets the player stand on the trolley top (height = `.057+.95`).
- Pitch and roll on the flat floor.

**AI trolley (flight attendant pushing towards you)**: `LanePath` cannot describe an aisle,
because it builds points from grid nodes (`drivers.js:49-74`). Hand `AIDriver` a duck-typed path
instead:

```js
const aisle = { pts: [{x,z}, …], idx: 0, nodes: [0, 1], built: 1, wander: false, ensure() {} };
car.ai = new AIDriver(car, { mode: 'route', path: aisle, cruise: 1.2, onArrive: () => … });
```

Then parametrize the constants that assume road scale:

- point reached at 4 m (`drivers.js:182`, `16`)
- look-ahead `4.5+.45v` (`185`)
- slow-down at 30 m and **arrival at 7 m** (`197-198`). In route mode it stops dead 7 m short
  of the end (`205`)
- obstacle stand-off `(dist-5)*.7` (`211`). It stops 5 m from the player
- unstick reverse only fires when `targetSpeed > 3` (`232`), so it never fires at trolley speed

Also, `obstacleAhead` (`main.js:413-443`) checks cars, the on-foot player and peds, but **not
named NPCs** (`this.npcs`).

**Alternative (not recommended)**: the player walks, with a trolley mesh parented to
`player.root` and the wish speed capped. You lose OBB collision (a character is a circle of
r = .36, so a 0.85 m trolley would clip into seats), people-pushing, and the camera and HUD.

---

## 3. `character.js`: a walking body

```js
new Character(def, { x?, z?, y?, yaw? })   // builds model = buildCharacter(def); root = model.root (caller adds to scene)
ch.teleport(x, z, yaw?)   // snap to floors <= 0.8 m, zero velocity, onGround
ch.jump(v = 8.2)          // only from 'normal'; does NOT check onGround (main.js does)
ch.fling(vx, vy, vz)      // returns false if seated/hidden/invulnerable; else 'flung', spin ±8..16 rad/s
ch.step(dt, game)         // fixed step
ch.sync(dt)               // anim + root transform (render step)
ch.speed
```

Fields:

| field | meaning |
|---|---|
| `def`, `model`, `root` | definition, model and its root Object3D |
| `x, y, z, yaw, vx, vy, vz` | pose and velocity |
| `wishX, wishZ` | the velocity the body tries to reach |
| `faceWish` | turn towards the wish direction at rate 12 |
| `r` | radius: monster .55, `kind === 'adult'` .36, **anything else .32** (ghost included) |
| `state` | see table below |
| `onGround`, `timer` | |
| `anim` | see §4.4 |
| `car`, `seatSide` | set by main.js seat() |
| `spin`, `spinRate`, `bounces` | flung tumbling |
| `height` | `model.height`, the head-top |
| `floats` | unused |
| `solid` | false = cars ignore it (`main.js:877`) |
| `standingOn` | car whose roof the character is on |
| `invulnerable` | read, never set |
| fields added by main.js | `key`, `busy`, `homeX/Z`, `spot`, `chatT` |

**States** (`character.js:21`):

| state | entered by | `step` | `sync` | cars (`carsVsPeople`) |
|---|---|---|---|---|
| `normal` | default; `down` timer runs out (`onGetUp`); `unseat` | locomotion (below) | root at x,y,z with yaw | flung if closing > 4.5, else pushed |
| `flung` | `fling()` | ballistic, gravity 24. Walls bounce (`collideWalls(true)`, normal velocity removed ×1.5). Ground probe uses step .3. **One bounce** if impact > 4 (vy·-.35, horizontal ×.5, `onBodyBounce`), then `down` for 1.6–2.4 s | `root.rotation.x = spin`, pivot raised to 40 % of height | pushed only |
| `down` | landing while flung | count down `timer` → `normal` | lying flat (`rot.x = -π/2`, +0.25 y) | pushed |
| `seated` | `main.js seat()` sets it directly | **nothing** | animation only. **Root is NOT positioned**: the caller parents it, normally to `car.tilt` | skipped |
| `hidden` | **nothing in the codebase sets it** | nothing | root still positioned and visible | skipped |

Normal locomotion (`character.js:86-119`):

- velocity moves towards the wish at 42 m/s² on the ground, 14 in the air; gravity 24
- `collideWalls(false)` against blocks with top > y + **STEP 0.45** (circle-vs-block push-out,
  normal velocity removed)
- ground = max(`groundAt(…, 0.45)`, `game.carRoofAt` = car roofs)
- landing with vy < -6 → squash plus `onLand`
- block kind `bounce` → vy 15.5 plus `onBounce` (trampoline)
- snaps down steps < .3 when walking off an edge
- rides along on a car roof (`standingOn.vx/vz`)

Speeds set by main.js: walk 5.4, sprint 8.8, jump 8.6, double jump 8.0, stomp -18.

For the plane:

- **Passengers sitting in plane seats (not in a car)**: `state='seated'`, add the root to the
  scene, set `root.position` by hand (hip height = seat + .12 → `root.y = seatY + .12 - legLen`,
  the same as `main.js:298`).
- Also set `ch.x/y/z` to the seat. `hud.say` reads `target.x/y/z/height` (`hud.js:237-238`), and
  a seated character's x/y/z never update.
- `hidden` (frozen, never hit) works for "Stig-Helmer hides in the toilet" if you also set
  `root.visible=false`.
- Turbulence: call `fling()` on standing passengers, or nudge `vx/vz`.
- There is no ceiling check: add `if (y + height > ceil) vy = min(vy, 0)` in `step` if the
  cabin needs one.

---

## 4. `models.js`: procedural characters

### 4.1 `CHARS` schema (`models.js:8-18`)

Every value is a plain field read by the builders; there is no validation. Colours are hex numbers.

| field | kinds | effect |
|---|---|---|
| `name` | all | display name (dialog, HUD, radio `CHARS[who].name`). **Seeds the `curly`/`curlyLong` hair RNG** (`name.length*7`) |
| `kind` | — | `'kid'` (default proportions), `'adult'`, `'ghost'` (adult proportions, transparent), `'monster'`, `'wizard'`. An unknown kind gets kid proportions |
| `scale` | all | uniform size (default 1) |
| `voice` | all | talk-blip pitch in Hz for `audio.talk` (main.js radio and dialog). Adults about 200–350, kids 380–540, monsters 110–230 |
| `skin` | human, ghost, wizard | head, neck, hands, bare forearms and legs |
| `hair` | human | `swoop`, `curly`, `curlyLong`, `slick`, `balding`, `bun`, `long`, `afro`, `short`, `cap`; undefined = bald (`models.js:64-117`) |
| `hairC` | human | hair colour |
| `brows` | human | eyebrow colour (no brows if falsy) |
| `nose` | human | `button`, `small` (default), `big`, `pointy`, `long` (`models.js:47`) |
| `ears` | human | `'big'` = 1.6× |
| `glasses` | human | frame colour → two torus rings plus a bridge (`models.js:56-59`). Round only |
| `mustache` | human | colour |
| `freckles` | human | bool |
| `shirt` | human, ghost | torso and upper arms |
| `stripe` | human | one chest band colour (at 55 % of torso height) |
| `pants` | human | hip band plus legs, or shorts tubes |
| `shorts` | human | bool: bare legs (skin), short pant tubes, white socks |
| `longSleeves` | human | bool: forearms in shirt colour instead of skin |
| `shoes` | human | shoe colour |
| `cape` | human | colour → flat cape on the back |
| `whistle` | human | coach whistle plus lanyard. If adult, also a white collar |
| `wide` | human | torso width and depth multiplier (belly). Default 1 |
| `headR` | human | override head radius (default adult .25 / kid .29, ×scale) |
| `mouthW` | human | mouth width multiplier |
| `fur, fur2, horn, noseC, eyeC, beard, bigHair, earrings, lashes` | monster | Big Mouth hormone-monster look |
| `robe, robe2` | wizard | robe and hood colours (the wizard also uses `skin`) |

The current entries are Big Mouth content: `nick` (player), `andrew`, `jessi`, `jay`, `steve`,
`maurice`, `connie`, `duke` (ghost), `shame` (wizard).

### 4.2 Build pipeline (`buildCharacter`, `models.js:131-229`)

Returns a model object `m`:

| field | content |
|---|---|
| `def` | the definition |
| `root` | Group |
| `body` | Group (squash, bob, hover) |
| `hips`, `neck` | Groups |
| `head` | Mesh (has the `mouth` child) |
| `mouth` | Mesh, MAT.mouth, unlit; `scale.y` is the open amount |
| `arms[2]`, `legs[2]` | pivot Groups. The wizard's `legs` is `[]` |
| `meshes[]` | |
| `phase`, `squash`, `talkT` | animation state |
| `headTop` = `height` | head-top height |
| `legLen`, `armLen` | |
| `hunch` | monster only |
| `floaty` | wizard only |

- Proportions (human), with s = scale:
  - adult: legs .86, torso .66×.5×.3, arms .66, head R .25 → **height ≈ 2.10·s**
  - kid: legs .52, torso .5×.42×.27, arms .48, R .29 → **≈ 1.69·s**
  - monster ≈ 2.47·s, wizard ≈ 2.45·s
- Parts:
  - torso capsule in shirt colour, pant band, optional stripe, whistle, ghost tie, cape → `hips`
  - neck cylinder plus head (`headParts`: head sphere, ears, nose, eyes and pupils, brows,
    freckles, glasses, mustache, hair) on a `neck` pivot
  - mouth mesh at `(0,-.5R,.8R)`
  - arms: upper capsule in shirt colour, forearm in sleeve colour, hand sphere
  - legs: capsule plus shoe; or shorts plus socks; ghost gets a cone instead of legs
- Each part is `toonMesh(geo, {outline: .022})`, about 6 meshes plus outlines plus the mouth per
  character (about 13 draw calls).
- `kind` special cases:

  | kind | handled at |
  |---|---|
  | `ghost` | `models.js:137-138` (material and outline), `147, 162, 165, 200, 214`; `main.js:942` (hover is done in main.js, not here) |
  | `monster` | `buildMonster` `models.js:231-312` (fur icosahedra `FUR`, horns, snout, fangs, tail); `character.js:20` (radius); `main.js:180, 300` (seat scale); `hud.js:188, 384` (portrait) |
  | `wizard` | `buildWizard` `314-375` (cone robe, staff with orb, floats, no legs); `main.js:180, 184`; `hud.js:188, 384`; `shame.js` (the chasing wizard) |

- Private helpers that are not exported (export them if you need them): `headParts`, `hair`,
  `mouthGeo`, `furGeo`, `buildMonster`, `buildWizard`.

### 4.3 `randomPed(r = Math.random)` (`models.js:459-468`)

Returns a human def:

| field | value |
|---|---|
| `name` | `'ped'` |
| `kind` | `'adult'` 60 % / `'kid'` 40 % |
| `scale` | adult .94–1.08, kid .86–1.0 |
| `skin` | from `PED_SKIN` |
| `hair` | from `HAIRS` (`short` weighted ×2) |
| `hairC`, `brows` | from `PED_HAIR` |
| `shirt` | from `PED_SHIRT` |
| `pants` | from `PED_PANTS` |
| `shoes` | one of 4 |
| `nose` | one of 5 |
| `glasses` | 20 % |
| `wide` | adult .9–1.35 |
| `shorts` | 15 % |
| `longSleeves` | 40 % |
| `voice` | adult 200–350, kid 380–500 |

The palettes are `models.js:453-457`. Content: replace them with a 1980 charter-tourist palette
(sunburn skins, loud shirts, white shorts and socks) and probably fewer kids on a Canary package
trip.

### 4.4 `animateCharacter(m, st, dt)` (`models.js:381-448`)

`st` is `Character.anim`: `{speed, air, vy, kick, talk, seated, flung, down, t, spin, look, wave,
cheer, sprint}`, plus `yell` (read but never present). Branches are checked in this order:

1. `m.floaty` (wizard): hover bob, arms raised (talk = staff wave)
2. `seated`: legs -1.45 (forward), arms -1.15 (holding the wheel)
3. `flung`: flailing limbs
4. `down`: spread-eagle
5. `air`: legs tucked, arms up; `st.spin` turns the body (double jump)
6. ground:
   - walk cycle, phase rate ×2.4 for adults (`legLen > .7`) and ×3.4 otherwise, bob, hunch,
     sprint lean
   - `wave` (right arm), `kick` (0..1 pose), `cheer` (both arms up, hop)

After the branch, in every state: `neck.rotation.y = st.look`. Mouth: talk flaps
`.35–1.3`, flung or yell = 1.1, rest .32. Squash: `m.squash` decays at rate 4 (landing and
trampoline).

To add a pose (e.g. a white-knuckle flygrädd armrest grip with trembling, or `push` for the
trolley), add the flag to `Character.anim` (`character.js:26`) and a branch or override here.

### 4.5 `buildBust(d)` (`models.js:471-491`)

Builds a cheap driver: torso capsule, two forward arms, head (`headParts`) merged into one
`toonMesh`, plus a mouth mesh in `root.userData.mouth`. The mouth never animates. Origin is the
torso bottom.

- Uses adult proportions only when `kind === 'adult'`, otherwise kid proportions (ghost too).
- Ignores `headR`, `wide` for depth, and the legs.
- `addBust` (`main.js:175-193`) uses a 0.72-scaled full `buildCharacter` for monster and
  wizard instead.
- About 3 draw calls. **This is the natural fit for rows of airplane passengers.** Seats hide
  the missing legs.
- For about 100 passengers, export `headParts` and merge every bust into one static
  `GeoBuilder`.

### 4.6 Fields a Sällskapsresan cast will probably need (not supported yet)

- glasses shape and size (`glasses` draws only small round rings)
- sunglasses (filled lenses)
- a hat slot on top of hair (sun hat, captain or stewardess cap; today `hair:'cap'` replaces
  the hair)
- dress or skirt (cone over the legs; copy the ghost-leg cone or the wizard robe)
- beard for humans (only monsters have `beard`)
- shirt print (`stripe` is a single band)
- swimwear works today: `shirt: <skin>` plus `shorts:true`

Every human cast member should be `kind:'adult'`. The monster, ghost and wizard builders can stay
as engine code but are only needed if the design reuses them, e.g. the wizard for a
Shame-Wizard-style pursuer.

---

## 5. `drivers.js`: AI at the wheel

### 5.1 `LanePath(nodes, {wander?, endPoint?: [x,z]})` (`drivers.js:15-75`)

- `nodes`: road-graph node ids. `pts`: `{x, z, turn?, end?}` built lazily. `idx`: current point.
  `built`: edges built so far.
- `ensure(n=14)` keeps at least n points ahead.
  - In `wander` mode it extends `nodes` by picking a neighbour of the last node, never the
    previous node. Going straight gets weight 3, a turn weight 1.
  - Adds `endPoint` after the last node.
  - Every 30 points it drops the oldest 30.
- `buildEdge(k)` handles edge A→B with C next:
  - points every about 6 m from `A + d·M` to `B - d·M`, offset `LANE` (2.75) to the **right**
    (right-hand traffic, which matches Spain)
  - then at B: straight on (dot > .9) adds nothing; U-turn (dot < -.9) swings wide with 3 points;
    otherwise a quadratic Bézier with 5 points and control point `B + (r+r2)·LANE`, built for
    90° corners
  - `M = 8.5` (`drivers.js:8`): the turn starts 8.5 m before the intersection centre

### 5.2 Helpers

- `startNodes(car)` returns `[behind, ahead]`: the nearest node, plus the neighbour best lined up
  with the car's heading. Works anywhere, even off-road; the car then drives at the lane.
- `pathTo(car, targetNode, endPoint?)` returns
  `new LanePath([a, ...findPath(b, target)], {endPoint})`.

### 5.3 `new AIDriver(car, opts)` (`drivers.js:101-246`)

Assign it to `car.ai`. `main.js` calls `car.ai.update(h, game)` every fixed step. Entering a car
sets `car.ai = null` (`main.js:375`).

| opt | default | meaning |
|---|---|---|
| `mode` | `'traffic'` | `traffic`, `route`, `chase`, `flee` |
| `cruise` | 10–13 random | target speed in m/s (route missions start at 0, then set it) |
| `path` | null; traffic builds `LanePath(startNodes, {wander:true})` | any object with the LanePath shape (`pts, idx, nodes, built, wander, ensure()`) |
| `target` | null | `() => ({x, z, vx?, vz?})`: the quarry for chase, the threat for flee |
| `aggressive` | false | chase: full throttle when aimed within .3 rad |
| `avoid` | true | brake for `game.obstacleAhead` |
| `wobble` | 0 | sinusoidal steer noise (`sin(1.7t)·wobble`). Useful for a drunk driver |
| `rubber` | null | `() => multiplier` on target speed (race rubber-banding) |
| `onArrive` | null | called once within 7 m of the final point (non-wander paths) |

**Modes:**

| mode | behaviour |
|---|---|
| traffic | endless wander |
| route | follows its path; slows within 30 m (`max(2, d·.5)`); arrives at 7 m (`onArrive`), then targetSpeed 0 |
| chase | within 38 m: aims straight at `target + v·0.4 s` at `spec.maxSpeed·.95`, ignoring lanes. Otherwise replans every 2.5 s, or at the end of the path, with `pathTo(nearestNode(target), [tx,tz])` |
| flee | near the end of the path, samples 6 random node ids and picks the one that maximises `dist(pursuer) + .3·dist(self)` |

**Common driving logic** (`drivers.js:171-244`):

- skips points already reached (< 4 m, or behind and < 10 m)
- pure-pursuit aim at the first point beyond `4.5 + .45·speed`
- bend slow-down of up to 62 % (compares the heading with the point 3 further on)
- `rubber` multiplier
- obstacle stand-off `targetSpeed ≤ (dist-5)·.7`
- honks when the player blocks for more than 1.2 s; after 3.5 s blocked it ignores obstacles for
  1.6 s and pushes through
- steering `clamp(-err·2.4)` plus wobble
- unstick: if stuck 1.3 s with throttle and targetSpeed > 3, reverse 1.1 s with the wheel turned
  the other way
- throttle is P-control `(target-fwd)·.45` in [.25,1]; brake `(fwd-target)·.18`; .15 to hold speed
- lifts off the throttle when `|err| > 1.2` above 8 m/s
- a dead car parks

### 5.4 Road-graph contract (what a new map's `layout.js` must provide or keep)

Exports: `LANE`, `nodeX(id)`, `nodeZ(id)`, `neighbors(id) → id[]`, `nearestNode(x,z) → id`,
`findPath(a, b) → id[]` (both ends included; returns `[a]` if unreachable; BFS with shuffled
neighbours, so it ignores edge length), and `N` (only used by flee, which assumes ids
`0..(N+1)²-1` are all valid).

Implicit assumptions:

- every node has ≥ 2 neighbours (no dead ends: §0.5)
- edges ≥ about 17 m (≥ 24 m for `spawnTrafficCar`, `main.js:205`)
- turns of about 90°
- one lane each way
- no intersection rules

Other grid users outside actors that move together with any layout change:

- `main.js:199-219` spawnTrafficCar
- `main.js:751-764` resetToRoad (hard-coded 80 and 280)
- `layout.routeAim/cellCorners/manhattanPath` (GPS arrow)
- `shame.js:46-75` (`startPursuit`: hearse spawn loops over `NN*NN`)
- `peds.js` (pedLoops, below)

For a Canary resort town:

- Keep the grid: everything works.
- Go organic: add a dead-end fallback in `ensure` (allow `prev` when nothing else is left; the
  U-turn code already exists), Dijkstra in `findPath`, and replace flee's id sampling with
  "random element of a node list".

---

## 6. `peds.js`: pedestrians

- RNG: one module-level `mulberry32(99)` (`peds.js:10`) shared by spawning **and** runtime
  decisions. It is deterministic only for a fixed call order.
- `new Ped(scene, loop)`:
  - `char = new Character(randomPed(r))`, added to the scene
  - starts at a random point on a random side of `loop`
  - `dir` ±1, `walk` speed 1.2–1.9 m/s
  - `k` = index of the corner it is heading to
- `update(dt, game)` (wish velocity only; main.js then calls `ped.char.step`):
  - Does nothing unless `normal`. Idles for `idleT`.
  - **Panic**: if `game.carThreat(x,z)` (any car ≥ 7 m/s within 30 m whose path crosses the ped)
    → jump 6.5 and dive 6 m/s sideways, 50 % chance of an **English** shout (`peds.js:68`). Then
    1.4 s of panic, with the first .8 s uncontrolled.
  - Walking: head to the corner. Within .8 m, 25 % chance to `maybeCross` to the matching corner
    of a neighbouring block's loop (`i±1` or `j±1`, bounds `N`) at 1.6× speed; otherwise go on to
    the next corner. 8 % chance to idle 2–5 s.
- `spawnPeds(scene, n)` puts n peds on random loops from `pedLoops`. main.js spawns 34
  (`main.js:101`).
- **Loop format** (built in `town.js:767-773`): `{i, j, pts: [[x0,z0],[x1,z0],[x1,z1],[x0,z1]]}`.
  - exactly 4 points (`% 4`)
  - `maybeCross` takes x and z midpoints from `pts[0..2]`, so the loop must be an axis-aligned
    rectangle in that order
- Peds avoid neither each other nor walls. Only main.js pushes the player out of them and cars
  out of everyone.
- Aisle use (e.g. flight attendants or passengers going to the toilet):
  - `new Ped(scene, {i:-1, j:-1, pts:[…4 points of a thin rectangle along the aisle…]})`. With
    `i=j=-1`, `maybeCross` always fails, so the ped paces up and down.
  - Better: let `spawnPeds(scene, n, loops = pedLoops)` take the loops, add `loop.noCross`, and
    use `% loop.pts.length` for n-gon loops.

---

## 7. `pickups.js`

**Coins** (`pickups.js:12-102`):

- Pool: `MAXC = 500` records in the exported `coins` array:
  `{active, fixed, x,y,z, vx,vy,vz, life, settle, value}`.
- Drawing: one `InstancedMesh` (gold disc) plus an instanced outline that shares the instance
  matrix. Hidden coins get a zero-scale matrix.
- API:

  | function | behaviour |
  |---|---|
  | `initCoins(scene)` | once |
  | `placeCoin(x, y, z)` | fixed, bobbing, infinite life |
  | `burstCoins(x, y, z, n, vx?, vz?)` | loose: 25 s life, gravity 20, bounce, wall push-out, settle 0.45 above ground. Recycles the oldest loose coin when the pool is full |
  | `tickCoins(dt, t, collector, game)` | `collector = {x, y, z, r}` (main.js passes r .7 on foot, 2.2 in a car) |

- Magnet radius `r+3` (|dy| < 3.5); collected at `r+.6` (|dy| < 2.2) → `game.collectCoin(c)`.
  Loose coins can only be magnetised after .6 s or once settled.
- Engine. Content: the colours and value (pesetas?), plus the HUD wording in main.js and hud.js.

**`Collectible(scene, kind, id, x, y, z)`** (`pickups.js:115-146`):

- `kind === 'record'`: spinning vinyl record plus a translucent light beam
- **any other kind**: an animated "anxiety mosquito" that flies a figure-8 around (x,y,z) and
  flaps `children[1..2]`
- Fields `kind, id, x, y, z, alive, mesh, ph`; methods `tick(t, dt)` and `remove()` (hides it).
  Pickup and squash rules live in main.js (`tickPickups 954-981`, `areaHit 841-871`,
  `squash 983-994`) and missions.js:328.
- To add kinds, replace the two ternaries with a table: `{geo builder, motion: 'spin'|'fly'}`.

**`Rabbit(scene, x, z)`** (`pickups.js:177-241`):

- Hopping critter. `update(dt, px, pz)`:
  - player within 7 m → flee in fast 5.2 m/s hops
  - otherwise random 2.5 m/s hops, pulled back home when more than 12 m away
  - ±.6 rad wiggle
  - blocked by blocks taller than y+.5 (it reverses)
  - squash and stretch in the air
- `remove(scene)`. Used only by the `rabbits` mission factory (`missions.js:163-202`), which does
  the catching (1.4 m on foot, 2.8 m in a car).
- The behaviour is reusable for any runaway critter or item; only the mesh is content.

---

## 8. Engine (keep) vs Big Mouth content (replace)

| file | keep (engine) | replace or remove (content) |
|---|---|---|
| car.js | `Car` physics, collision, damage, sync; `collideCars`; wheel rig; `buildCarModel` skeleton (tall and car branches, bumpers) | `CAR_TYPES` names (EN → SV) and the type mix; flags `hearse` (tied to shame.js `isHearse`), `muscle` (unlock in main.js), `icecream`, `bus` look (yellow school bus → tour coach); `COLORS` |
| character.js | all of it | the `kind` checks for monster, wizard and ghost (`r`, `floats`) only if those kinds go |
| drivers.js | all of it (grid-bound, §5.4) | — |
| peds.js | all of it | the shout strings at `peds.js:68` → Swedish |
| models.js | `buildCharacter` (human), `headParts`/`hair`/`mouthGeo`, `animateCharacter`, `randomPed` mechanics, `buildBust` | every `CHARS` entry; `PED_*` palettes; the monster, wizard and ghost builders (optional); comment headers ("Bridgetonians") |
| pickups.js | coin pool, `Collectible` shell, `Rabbit` behaviour | record and mosquito meshes, rabbit mesh, header comment |

**Renaming checklist when CHARS keys change** (the keys are looked up as strings):

- main.js:
  - `HOMES` (30), `CHATTER` (37-45)
  - `CHARS.nick` (108), `player.key='nick'` (109)
  - portraits (129-132), `npc()` (482)
  - radio name and voice (575-576)
  - `'Ow, Nick!'` (854)
- hud.js:188 (`line.who === 'nick'`)
- shame.js:71, 120 (`CHARS.shame`)
- missions.js: `who`, `giver`, `passenger`, `extra`, `charDef('shame')` (307)
- tools/shot.mjs: `npc('andrew'|'steve'|'jessi'|'duke'|'maurice')`, `named.birchWagon`, `named.muscle`

Named cars: `town.js` parkedCars `name`, `hud.js:364`, `main.js` `named.*`, shot.mjs.

---

## 9. More gotchas

- Car-car collision is O(n²) over all cars every fixed step (`main.js:827`). With about 22
  traffic cars plus parked cars this is fine; it won't stay fine with hundreds.
- `new Car(type, {x, z, yaw})` does not ground the car (`y = 0.15`). Always call `place()`
  afterwards (`shame.js:66-67` does both).
- `car.ctrl.park` is true by default. AIDriver clears it every update, and main.js sets it when
  the player leaves.
- Parked cars with no driver and no AI feel 9 m/s² roll-out friction. A car with only a seated
  NPC driver and no AI also counts as "driven" but stays parked until `park=false`.
- A car's `height` counts the cabin roof, so characters can stand on roofs (`carRoofAt`) and the
  camera rides over cars (`camera.js:83-89`).
- Seated characters and busts are children of `car.tilt`, so they inherit pitch and roll.
  `unseat` re-adds them to the scene and teleports them to `exitSpot`.
- `obstacleAhead` ignores oncoming `traffic` cars (heading dot < -.7) and cars pulling away
  faster than us.
- `fling()` works on an already flung or downed body (only seated, hidden and invulnerable
  refuse), but `carsVsPeople` only flings `normal` characters.
- `buildBust` pushes an already merged head geometry into `g.parts` (`models.js:482`). That
  works because `GeoBuilder.build` merges with matching attributes (position, normal, color,
  index).
- The ghost's hover is done in `main.js:942` (NPC loop only), not in Character or models.
- The rabbit and the mosquito Collectible are animated by whoever owns them (missions.js and
  main.js), not by a global tick.
