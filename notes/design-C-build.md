# Charter & Run: game design, focused on what this engine can build

*Fan-made Hit & Run-style game based on* Sällskapsresan *(1980). It is built on the Bigmouth & Run engine copy in `charter_and_run__sallskapsresan/`. Player-facing text is Swedish and Ole speaks Norwegian. Internal ids stay ASCII.*

**How dialogue lines are marked in this document:**
- **[F]** is a line verified in the research (subtitles, Wikiquote or the Norwegian subtitles).
- **[F~]** is a film line that has been shortened, or rendered in Norwegian or Spanish by us.
- **[N]** is new and written for the game. An [N] line must never be presented as a film quote in the README or anywhere else.

---

## 0. TL;DR: the ten decisions that make this buildable

1. **One static world and two "levels".** The aircraft is a separate set at **x = +3000**, built at init after `buildTown` and before `finalizeProps`. The island is the existing **7×7 grid** with new content. A level is a configuration (palette, music, meter, camera profile, minimap source, NPC homes, movement rules), not a scene switch. Nothing in collision or rendering needs to change for this, as the world map §8 shows.
2. **The cabin floor is at ground level** (y = `CURB` 0.15, so no floor solid is needed). Altitude, takeoff, clouds and landing are **purely visual**: an `outside` group animated around a stationary cabin.
3. **The cabin is a cut-away dollhouse.**
   - There is no visible roof. The ceiling is a down-facing plane, which is invisible from above.
   - The camera gets an **interior profile**: steep pitch of 0.72–1.1 and **no wall pull-in**.
   - The whole DC-8 exterior is visible around the cabin (wings, four engines, tail fin with the SunTrip sun), with clouds streaming past below.
   - This avoids every narrow-tube camera problem in camera.js and still reads clearly as "inside a plane".
4. **The player walks in level 1 and cannot drive a vehicle there.**
   - The drinks trolley is a **`Car` that the player cannot enter**, driven by a ten-line duck-typed mini-AI.
   - It needs three small guarded edits in `car.js`: the `s.build` early return, `s.noWheels`, and the existing `glass` null guard.
   - The existing `carsVsPeople` push-out gives trolley-versus-player blocking for free.
   - A player-driven trolley is a P2 stretch goal (§4.4).
5. **The meter stays `game.shame` / class `Shame` internally** to avoid renaming it across main.js and missions.js, and gains `configure(cfg)` with two modes:
   - `panic`: the flight's **FLYGRÄDSLA**. At 100 it causes a panic attack, which fails the mission or sends you back to your seat. No pursuit.
   - `pursuit`: the island's **SKANDAL**. Guardia Civil chases you in green Santana Land Rovers plus an officer on foot. "Busted" means **¡MULTA!**, a 50-peseta fine.
6. **Level-1 interaction runs through a generic interactables registry** (sit and stand, toilet, galley juice, call button). The mantra **"Jag kan flyga, jag är inte rädd"** replaces kick in the flight: hold J or the mouse button, and the arms go out like wings.
7. **The minimap gets a map source** (`hud.setMapSource`). The town keeps its current base map. The cabin gets a 12 px/m plan drawn generically from its collision blocks. The guide arrow works in the cabin unchanged, because every target is under 45 m away, so `routeAim` aims straight.
8. **There are 11 missions in all.** Four flight missions (F1–F4) are all on foot and use only `goto`, a new `collect`, `sit`, `interact`, `carry` and `mantra`. Seven island missions (I1–I7) reuse `getInCar`, `goto`, `pickup`, `follow`, `rabbits`, `race`, `destroy` and `grab`, with small option extensions.
9. **All content tables move out of main.js into `src/content.js`** in phase 0. These are HOMES, MAP_LABELS, CHATTER, OUCH, collectible spots and unlocks. Content agents then never touch main.js, and parallel work stays conflict-free.
10. **Testing.**
    - The `story` scenario must end with **`#11 idle`**, contain no `scenario failed`, and finish with `no errors`.
    - `startMission` gets the giver-relocation race fix (wait 3 frames, warp to the `at` landmark, then re-check).
    - In `?test=1` mode the cabin sequences run at 3× speed.

---

## 1. Concept and tone

> *"Svenskarna reser inte till någonting... dom reser från någonting."* [F] (the film's opening title card, used as the title-screen tagline)

**What it is.** In December 1979, the brödrostkontrollant (toaster inspector) **Stig-Helmer Olsson** takes his first trip abroad: SunTrip's Christmas charter to **Nueva Estocolmo** on Gran Canaria. He is afraid of flying and has only Dr Levander's mantra to hold onto. Without knowing it, he carries a "julklapp" (Christmas present) stuffed with 50,000 kronor of black money. Beside him in row 14 sits the gadget-mad Norwegian **Ole Bramserud**, who quotes air-crash statistics to calm him down.

- **Level 1, "Flygresan"**, is the flight itself, from the snowy Arlanda apron to landing in "soldis och 22 grader".
- **Level 2, "Nueva Estocolmo"**, is about surviving the package trip: SunTrip's guides, Pepes Bodega, the grisfest, the painted donkey, José's mother, and Gösta Angerud's increasingly desperate hunt for his money.

**Tone.**
- Warm, dry and Tati-inspired, like the film. The comedy comes from embarrassment, bureaucracy and tourists, not from cruelty.
- The Hit & Run chaos (crashes, Guardia Civil) is slapstick in cel-shaded 1980 colours: orange seats, butano-orange gas bottles, sunburn and Hawaiian shirts.
- Swear words appear only where the film has them ("fan", "jävla").
- Berra's T-shirt text is **not** reproduced.
- Angerud's heart attack happens off-screen ("fördes till sjukhus").

**Rules for using sources** (from the research):
- Never ship an [N] line as a quote.
- Avoid real brands: no Scanair, SAS, Wasa or Björn Borg. The pack is "SPORT-KNÄCKE". The plane is the fictional SunTrip DC-8 "Sol-Viking", registration SE-SOL.
- No real songs. The welcome song melody ("Freight Train") and "Feliz" are not used. Only traditional public-domain tunes are hinted at ("Små grodorna", "Hej tomtegubbar").
- Hammarby appears only as green-and-white stripes, with no logo.
- The grisfest host is unnamed ("Grisfestvärden") because "Gris-Antonio" was a real person.

**What is invented for the game, and the team must know it:**
- Turbulence (it is not in the film).
- Panic as a mechanic.
- The juice-fetching, bottle-collecting and seat-the-passengers tasks.
- The Guardia Civil pursuit.
- Angerud stealing the suitcase in the finale.

---

## 2. Player character and companions (the cast)

Every human is `kind: 'adult'`. New definition fields are listed in §12.4. `ring` is the dialogue portrait ring colour and replaces the hard-coded `'nick'` check at `hud.js:188`.

| key | name (shown) | role | look (def summary) | voice Hz | flight (seat/home) | island (HOMES) |
|---|---|---|---|---|---|---|
| `stig` | Stig-Helmer | **player** | scale 1.12 (tall "Giraffen"), dark hair `swoop` + `tuft` (cowlick), dark `mustache`, round brown `glasses`. **Outfit `flyg`:** dark brown suit (`shirt` brown, `longSleeves`, `tie` 0x7a2a2a). **Outfit `sol`** (borrowed from Ole after landing; the film says he borrows Ole's clothes at the airport): Hawaiian `print`, oversized `shorts` with white socks | 250 | 14B (middle) | (player) |
| `ole` | Ole Bramserud | companion, main giver | `wide` 1.3, `balding` red-brown hair, big red-brown mustache, aviator `shades` on the island. **Flyg:** white polo. **Sol:** yellow checked shirt | 270 | 14A (window) | `flamenco` +3/+1 |
| `majsan` | Majsan | love interest, also afraid of flying | `hair:'page'` red-brown with bangs. Blue floral `dress` | 330 | 16E | `flamencoPool` −2/0 |
| `siv` | Sivan | Majsan's sister, hands out points | `hair:'bun'` auburn, red `dress` | 350 | 16F | `flamencoPool` +2/0 |
| `berra` | Berra | hunts for alcohol | thin, `hair:'long'` brown, walrus mustache, big tinted `glasses`. Blue T-shirt (no text) + denim vest | 220 | 22C | `flamencoBar` 0/0 |
| `robban` | Robban | Berra's mate from Gothenburg | `wide` 1.25, `balding`, glasses. Orange T-shirt (flyg), dark blue (sol) | 240 | 22D | `flamencoBar` +1.6/0 |
| `angerud` | Gösta Angerud | antagonist | `wide` 1.35, `balding` grey-brown. Flyg: dark suit with red tie. Sol: light blue suit + `shades` | 200 | 6C | `vikingbar` +2/+1 |
| `lasse` | Lasse Lundberg | SunTrip guide, island giver | athletic, dark `curly`, tanned, **sun-yellow suit** | 300 | hidden | `suntrip` 0/0 |
| `jose` | José | the "pizza-racern" | `slick` black hair, heavy mustache, royal-blue satin shirt | 280 | 16D (beside Siv) | `cita` 0/0 |
| `mamma` | Josés mamma | | grey `bun`, glasses, black `dress` | 380 | hidden | `grillpaco` 0/0 |
| `carmencita` | Carmencita | Viking Bar | short black hair, black dress, red scarf (`stripe`) | 360 | hidden | `vikingbar` −2/0 |
| `storch` | Herr Storch | newlywed from Mjölby | curly light-brown hair, dark floral shirt, suede waistcoat, `camera` (Super 8) | 290 | 10A | `playa` 0/0 |
| `vardinna` | Flygvärdinnan | flight giver | turquoise sleeveless `dress` over white blouse, blonde `bun` | 360 | standing `galleyBack` | hidden |

**Radio and portrait-only defs** have no NPC instance and get a throwaway Character for the portrait, like `shame` in Bigmouth:
- `kapten`: pilot hat, grey.
- `saljare`: souvenir seller.
- `hittegods`: airport clerk.
- `levander`: white coat, dark parted hair.
- `varden`: grisfest host.

**Pursuer def:** `guardia` has a green uniform (`shirt`/`pants` 0x3d5a3a, `longSleeves`), black `hat:'tricorn'`, a mustache and voice 210.

**NPC visibility rule (contract).** NPCs are global Characters. `HOMES` is per level (`HOMES.flight`, `HOMES.island`). An NPC with no home in the current level gets `busy = true`, `state = 'hidden'` and `root.visible = false`. A flight home that is a seat id ("14A") is seated through `cabin.seatCharacter` and also marked `busy` (so `placeNpcs` skips it, as at `main.js:653`).

---

## 3. Controls

The physical keys are unchanged. Level config turns verbs on and off.

| action | island | flight |
|---|---|---|
| WASD / left stick | walk / drive | walk (walk 3.4 m/s, Shift 5.0) |
| mouse / right stick | camera | camera (pitch limited, §4.2) |
| Space / A | jump, double jump, handbrake | **off**. Toast "Man hoppar inte i ett flygplan." [N] (shown once) |
| J / click / X | kick (stomp in the air) | **hold = "Jag kan flyga, jag är inte rädd"**: wings pose, wish 0, fear −25/s, a bubble every 2.5 s |
| E / F / Enter / Y | talk, get in/out, steal a car | talk, **sit/stand**, use (toilet, juice, call button) |
| M / Tab | map | cabin plan |
| R | unstick (back to the road) | back to the aisle at row 14 |
| H, N, Esc/P | horn, mute, pause | same (no horn) |

---

## 4. Level 1: "Flygresan"

### 4.1 The space: placement, dimensions, collision

**Placement.** `CABIN_X = 3000`, cabin centred on z = 0. The nose points **+z**, so yaw 0 means "forward" and seated passengers face +z.

Why x = 3000 is safe:
- The town ends at ±490 (hills).
- Camera far is 1800, so the town is beyond the far plane.
- The collision hash is valid to ±65 km.
- `baseGround` is `CURB` everywhere off-grid, so the floor at 0.15 exists without any solid.

**Rule for island content.** Island geometry stays inside |x|, |z| < 1500. In particular the sea plane stops at ±1300, so it never shows under the plane.

**Interior plan (world x = 3000 + local x):**

```
 z=+15.5  ═══════ cockpit door (locked wall, sign "BESÄTTNING") ═══════
 z 12..15 │ WC  WC (left, x<-0.6)  │ aisle │ FRÄMRE BYSSAN (right counter, top 1.0) │  curtain at z=12
 z=+11.0  │ row 1   A B C │ 1.1 m │ D E F │      ← trolley parks behind curtain at z=+12.0
   ...    │ rows 2..12, (no row 13!), 14..24 at 1.0 m pitch                            
 z=-11.0  │ row 24                                                                   
 z -11.6..-14.5 │ WC (left) │ BAKRE BYSSAN (both sides) │ boarding door (left, z=-12.5, closed)
```

**Geometry rules:**
- **Rows.** 23 rows: 1–12 and 14–24. `rowZ(idx) = 11.0 − idx·1.0`, with idx 0..22 skipping 13.
  - **Row 13 does not exist** (true of Scanair's DC-8-62 seat map, per the research).
  - The overhead bin labels jump from 12 to 14. Passing that point shows the toast "Rad 13 finns inte!" [N].
- **Width.** Interior half-width is 2.45. Seat x positions are A −2.0, B −1.4, C −0.85, D +0.85, E +1.4, F +2.0. The aisle is |x| < 0.55, so 1.1 m wide.
- **Scale.** About 1.25× a real DC-8 cabin, so toon characters (adult about 2.1 m) fit. A ceiling plane at y 2.6 that Stig-Helmer's tuft almost brushes is a deliberate "Giraffen" joke.

**Collision** (all `box()` calls; tops are absolute):

| solid | footprint (local) | top | kind | why |
|---|---|---|---|---|
| outer side walls | x ∈ [−3.45, −2.45] and [2.45, 3.45], full length | 99 | `bound` | ≥1 m thick (tunnelling, camera samples) |
| end walls / cockpit partition | z ∈ [15.5, 16.5] and [−15.5, −14.5] | 99 | `bound` | |
| seat back, per row and side | x ∈ [−2.45, −0.55] (and mirror), z ∈ [rowZ−0.45, rowZ−0.25] | **1.25** | `seat` | wall for characters (step 0.45) **and** for the trolley (car skip ≤ y+0.6) |
| seat cushion, per row and side | x as above, z ∈ [rowZ−0.25, rowZ+0.2] | **0.55** | `cushion` | floor you can step onto (0.15+0.45 ≥ 0.55) |
| front galley counter | x ∈ [0.6, 2.45], z ∈ [12.3, 15.3] | 1.0 | `galley` | |
| toilet cubicles | 1.2 × 1.2 boxes, with the door side open as a 0.8 m gap | 99 | `toilet` | |
| rear galley counters | both sides, z ∈ [−14.5, −11.8] | 1.0 | `galley` | |

- **Leg room.** Between one row's cushion and the next row's back there are 0.8 m. A character circle (r = 0.36) fits, so **you can step out of the aisle into an empty aisle seat to let the trolley past**. Aisle seats C/D are mostly left empty for this; passenger busts sit only in A, B, E and F.
- **No props in the cabin.** Kicks are disabled in the flight, so nothing needs to be breakable. Mission items are `Collectible`s, which avoids the "props render at y = 0.15" trap.
- **Coins.** About 30 fixed coins (`placeCoin`) sit in the aisle and the galleys: "Någon har tappat sina pesetas".

**Visual build** (cabin.js, the same `GeoBuilder`/`toonMesh` pattern as town.js):
- **Shell** in one `S` (outlined) and one `F` (flat) builder, so about 3 draw calls in total. It contains:
  - seats: orange `#D2601F` with cream antimacassars `#F2EFE6`
  - cream walls `#E6DCC4` with sky-coloured window panes (opaque vertex colour, so no glass sorting)
  - open hat racks `#D8CDB4` at y 2.0–2.3 over the seats only (not over the aisle)
  - petrol curtains `#1F4F55` at both galleys
  - a red lit sign over the front curtain
  - tray tables `#9A9A92`
- **Ceiling.** A single `PlaneGeometry` at y 2.6 facing **down** (`FrontSide`), with `outline: 0` and `cast: false`. From above it is back-face culled and invisible. Nothing in the cabin casts a roof shadow, so the sun lights the interior.
- **Seat signs.** Instead of 23 `signMesh` draw calls, use one `textCanvas` strip per side on the bin edge showing all row numbers ("…11 12 14 15…").
- **FASTEN SEAT BELT / NO SMOKING signs.** Two small `signMesh` planes per galley whose material colour is toggled (lit or unlit) by `setSeatbelt()`. The signs are in English, as the research suggests.
- **About 65 passenger busts** merged into **one** static mesh. This needs `models.js` to export `headParts`, or a `buildBustGeo(def)` that returns a geometry. The busts use `randomPed` with a 1979 palette (brown, orange and beige 70s clothes). Seated cast members are full Characters.

**Exterior (the `outside` group, also cabin.js):**
- **Fuselage belly.** A half-cylinder (r = 3.0) under the floor along z ±15.5. The cut wall tops get a cream rim strip.
- **Nose and tail.**
  - Nose cone from z 15.5 to 22 with cockpit windows. It has its own roof, since no one goes in.
  - Tail cone to z −24 and a vertical fin 7 m tall.
  - The fin carries an orange sun disc `#F07A1E` with "SUNTRIP" on both sides (signMesh, `double`) and a red cap.
- **Wings and engines.**
  - Low wings at y ≈ −1.0, root from z −2 to +6, swept 30°, tips at x ±20.
  - Four engine pods hang under the wings at x ±7 and ±13.
- **Livery.** White top, metal belly `#B8BEC6` and a dark-blue cheat line `#1B2F6B`. "SOL-VIKING" goes on the nose.
- **Shared builder.** `buildPlaneExterior(g, opts)` is exported, so the island can park **the same plane** at the airport, outside the bound wall at (240, −335).

### 4.2 Camera inside the narrow cabin

`CamRig` gains `profile`. With `profile === null` the island behaves exactly as today. The cabin profile is:

```js
CAM_CABIN = { pivotH: 1.5, dist: 6.5, pitchMin: 0.72, pitchMax: 1.1, pitch0: 0.9,
              noPull: true, fov: 58, cineSide: 2.0, cineUp: 3.6 }
```

- **Why it works.**
  - At pitch ≥ 0.72 and dist 6.5, the camera sits ≥ 4.3 m above the pivot, so about 6 m above the floor and well above the 2.6 m wall tops.
  - Even when yawed fully sideways, the line of sight to the player crosses the wall plane at about 4.3 m height, so **no wall can occlude**. That is why the pull-in (`segmentBlocked`, min 1.6 m) is switched off (`noPull`).
  - The ceiling is invisible from above and the hat racks are thin shelves at the sides.
- **Free yaw is allowed.** No yaw lock is needed.
- **Pitch is clamped** to [pitchMin, pitchMax] in both the mouse branch and the on-foot branch. At level entry it is snapped to `pitch0`.
- **Cinematics.** `frame(a, b)` with a profile places the camera **inside the cabin footprint, high up**: `pos = mid + perp·min(d, cineSide) + up·cineUp`, looking at the head height of the pair. It does not do the 4.5 m sideways two-shot, which would put the camera behind a wall.
- **Shake** (`cam.shake`) is reused for turbulence.
- **Markers.**
  - The GuideArrow (about 3.8 m) and the Beacon arrow (4.5 m) sit above the invisible ceiling and are therefore visible from the camera. No change is needed.
  - The Bang "!" over a seated giver is at `ch.y + height + 0.9`, so seated characters must have `ch.y` set to the cushion height.

### 4.3 Flight phases: exterior animation (the plane never moves)

`cabin.setPhase(name, {instant})` drives a small state machine. Each phase sets a palette through `gfx.setSkyPalette` and moves groups inside `outside`.

**What moves:**
- **ground**: apron, runway, sea and island, as separate subgroups.
- **deck**: about 120 instanced cloud puffs, toon white, wrapping inside a box of x ±600, z ±700.
- **pitch**: `outside.rotation.x` rotates the *world* around the cabin, so the interior stays level while the view outside tilts.

The town's own sky clouds (`MAT._clouds`) are hidden for the whole flight level. Phase lengths are in seconds at 1×; `?test=1` runs everything at `timeScale = 3`.

| phase | length | sky top / horizon (= fog = body bg) | fog near–far | light | what moves | cues |
|---|---|---|---|---|---|---|
| `gate` | until F1 stage 4 | `0x8e99a6` / `0xc7ccd2` | 30–260 | hemi 1.2, sun 0.6 | snowy apron disc (r 600) at y −3.5, a brown-orange terminal box at x +70, snow heaps; `fx.snow` (new preset) about 20 flakes/s around the camera; grey cloud puffs at y +50..90 | |
| `takeoff` | 12 | same | same | | the runway strip (400 m, edge lights, wraps) scrolls −z, accelerating 0→70 m/s; at t = 8 pitch eases to −0.12 rad; at t = 9 the ground starts dropping | t = 10: **DUNS** (`audio.thud` + `crash(0.3)`, fear +15, shake 0.4) plus scripted bubbles (§7, F1) |
| `climb` | 8 | blend to whiteout `0xe8ecf0` | **4–45** for 3 s | | puffs sweep down past the cabin to y −25; snow off; pitch eases back to −0.04 | at the end: Majsan's bubble "Titta, solen!" [F] plus **applause** |
| `cruise` | open | `0x2a7fd8` / `0xdcefff` | 180–900 | hemi 1.45, sun 2.8 | the deck at y −30..−12 scrolls −z at 55 m/s; pitch 0 | random idle turbulence every 60–90 s (if not in a mission) |
| `approach` | 14 | same → `0xf2e4c4` | 120–800 | | the deck rises past the cabin (2 s whiteout); then a sea disc (r 1200, y −90, `0x1c7fb8`) and ochre island domes ahead at z +900 slide closer; pitch +0.04 | turbulence 0.7 during it; drone up |
| `landing` | 6 | island palette | 220–760 | island light | the runway subgroup rises to y −3.5 under the plane, palms beside it | touchdown: thud plus shake 0.6; **reverse thrust** (drone filter open for 3 s) |
| `landed` | | island palette | | | static runway, sea on the left, terminal | applause |

Each flight mission's **first stage `init`** calls `cabin.setPhase(required, {instant: true})`, so retries and `?mission=N` loads always start from the right sky:
- F1: `gate`
- F2 and F3: `cruise`
- F4: `cruise`, then it drives `approach`, `landing` and `landed` itself

### 4.4 The trolley (the cabin's "traffic")

**What it is.** `CAR_TYPES.trolley` is a spec merged in by cabin.js at import time:

```js
CAR_TYPES.trolley = { name: 'Serveringsvagn', len: 0.85, wid: 0.45, bodyH: 0.95, cabinH: 0, wheelR: 0.06,
  maxSpeed: 1.6, accel: 3, grip: 16, steer: 0.35, mass: 80, hp: 999, color: 0xc8ccd2,
  tall: true, noWheels: true, build: buildTrolley };   // buildTrolley returns { geo, glass: null }
```

**Engine edits in `car.js`:**
1. In `buildCarModel`, first line: `if (s.build) return s.build(s, color);`
2. Wrap the wheel loop in `if (!spec.noWheels)`.
3. Glass is already null-guarded (`car.js:134`), so no change.

**Runtime behaviour:**
- **Spawn.** `new Car('trolley', {x: 3000, z: 12.0, yaw: Math.PI})`, then `place()`. Set `locked = true` and `noEnter = true` (`nearestInteractable` must skip `noEnter`) and add it with `game.addCar`. It is never `traffic`.
- **Mini-AI:** `car.ai = { update(dt) { … } }`.
  - Target speed 1.1 m/s, with a 3 s stop at every fourth row, where the stewardess bubble says "Juice, whisky?" [F~].
  - Throttle 0.6 when below target and brake 0.5 when above. **Steer 0**, and `trolley.x` is damped kinematically toward the aisle centre.
  - The P-control never holds throttle above `maxSpeed`, so the "soft cap" bug cannot happen.
  - At z < −11.0 it is `place()`d back to z = +12.0 behind the front curtain, so it always drives forward.
- **Pusher.** The stewardess Character (`vardinna` while she is not a giver, otherwise a cabin-owned extra stewardess) is glued 0.9 m behind it. Each frame cabin.js sets her x/z/yaw directly and sets a new `anim.push` pose.
- **Player contact.** `carsVsPeople` pushes the player out (closing speed is far below the 4.5 m/s fling threshold). cabin.js additionally detects contact (distance < 1.0 while the trolley is moving) with a 1.5 s cooldown. On contact: fear +10, bubble "Akta tårna!" [N], and `game.bumpedT = 0.3`, which the `carry` stage reads.
- **Test hooks:** `cabin.stopTrolley()` / `cabin.startTrolley()`.

**P2 stretch: driving the trolley.** Only if everything else ships. It needs:
- `spec.noBoost` (car.js:206)
- a hard cap at `vf ≥ maxSpeed` (car.js:215)
- a `pushed` seat branch in `main.seat`, plus the `push` anim
- `spec.camDist` / `spec.camH`
- a hidden speedo

These are about 10 contained edits (see the actors map §2.8). Cut it first.

### 4.5 Turbulence (invented; it is not in the film)

`cabin.turbulence(strength 0..1, secs)`:
- The seatbelt chime "pling-plong" plays and `setSeatbelt(true)` lights the sign 2 s before.
- During the turbulence:
  - `cam.shake = 0.5·strength` is refreshed every 0.3 s.
  - `outside.rotation.z` wobbles ±0.03·strength.
  - Cabin rattle: `audio.noise(0.3, 0.15, 300)` every 0.4 s.
  - The drone gets +30 %.
  - A standing player gets a random lateral wish nudge of ±1.2 m/s.
  - The trolley jitters ±0.05 m in x.
- The sign switches off 3 s after the turbulence ends.

Turbulence is scripted in F2 (strength 0.4) and F4 (0.7 during `approach`), and plays randomly when idle in cruise.

### 4.6 The FLYGRÄDSLA meter (`Shame.configure(METERS.flygradsla)`, mode `panic`)

**Sources:**

| source | amount |
|---|---|
| gear "DUNS" | +15 once |
| takeoff roll while not doing the mantra | +2/s for 10 s |
| standing (not seated, not hidden) while the **seatbelt sign is lit** | +3/s |
| trolley contact | +10 (1.5 s cooldown) |
| **Ole's statistics** | +6 per line. When the player is within 4 m of Ole and no mission is running, every 20 s Ole says a line from `OLE_STATS` (lines below). |
| sprinting | +1/s |

`OLE_STATS` (shown as bubbles):
- "Du vet vel at det er femti prosent sjanse å overleve en flyulykke?" [F]
- "Det er farligere å kjøre bil enn å fly." [F]
- "Man regner mellom to og fem millioner flytimer pr. kræsj." [F]
- "Leste du om en sånn jumbopilot som gjorde en looping? To ganger." [F]
- "Det her er bare luftlommer, Stig-Helmer. Helt normalt!" [N]

**Relief:**

| relief | amount |
|---|---|
| idle decay after 4 s without an offence | −2/s |
| seated | −6/s |
| **mantra held** | −25/s (allowed seated or standing) |
| galley juice (interactable, 30 s cooldown) | −30 |
| toilet: `hidden` for 4 s (bubble "Jag kan flyga, jag är inte rädd…" [F]) | −50 |

- **Heartbeat.** Above 70 a heartbeat thump plays (`tone(55, .15, 'sine', .25)` twice every 0.8 s) and the meter gets the `.hot` CSS class.
- **At 100, PANIK!**
  - Banner **"PANIK!"** with sub "Jag kan flyga... jag kan flyga..." [F~], plus a white flash, shake 1.2 and a heartbeat burst.
  - If a mission is running, it **fails** with "Stig-Helmer fick panik!" (all flight missions have `bustFails: true`; `onBusted` uses `cfg.bustedFailText`). Retry teleports to the mission's `at` landmark.
  - If no mission is running, the player is seated in **14B** with the toast "Flygvärdinnan följde dig tillbaka till din plats." [N] and v = 50.
  - No coins are lost and no pursuit happens.
- **Story-test safety.** A seated player can never reach 100 from the scripted sources: the takeoff peak is about 50 while the seat removes 6/s.

### 4.7 Interactables in the cabin (new generic registry, §12.2)

| id | where | prompt | effect |
|---|---|---|---|
| `seat:<id>` | every empty seat within 1.0 m (aisle-side reach) | **E Sätt dig** / **E Res dig** | `game.sitPlayer(seatId)` / `standPlayer()` |
| `toilet:front`, `toilet:back` | the door gaps | **E Lås in dig** | hidden for 4 s, relief, flush noise |
| `juice` | front and rear galley counter | **E Ta en juice** | fear −30, `audio.pickup()`, 30 s cooldown |
| `call:14` | over 14B (only during F2) | **E Tryck på knappen** | "pling" plus the F2 gag |

### 4.8 HUD in the flight

- **Meter.** Labelled **FLYGRÄDSLA**, with a cold-blue-to-red fill (`#shame.fear`).
- **Speedo** hidden (no player car).
- **Minimap.** `hud.setMapSource(cabin.mapSource())`:
  - a 12 px/m plan generated from the cabin's blocks: seat backs orange, cushions light orange, galleys grey, walls cream, background `#2a3442`
  - zoom 9 px/m, so the 110 px radius shows about 12 m
  - the rim badge reads **"FRAM"** instead of N and points along +z
- **Big map.** Cropped to the cabin. Labels: "Cockpit", "Främre byssan", "Rad 14", "Bakre byssan", "Toaletter".
- **Guide arrow and route.** Unchanged, since every target is under 45 m away.

### 4.9 Handover to the island

This is triggered when `missions.complete()` of F4 finishes (`index` becomes 4). main.js sees `MISSIONS[index].level !== game.level` and runs `game.transitionTo('island')`:

1. `letterbox(true)` and a white flash. Banner **"LAS PALMAS"** with sub "Soldis och 22 grader varmt." [F~ captain].
2. `cabin.unseatAll()`: every NPC gets `busy = false` and `state = 'normal'`. The trolley gets `ai = null` and `dead`-parked. cabin.js stops ticking its exterior.
3. `game.setLevel('island')`:
   - island palette
   - `MAT._clouds.visible = true`
   - tune `sol`
   - meter `configure(METERS.skandal)` with v = 0
   - `cam.profile = null`
   - map source back to town
   - movement and verbs re-enabled
   - player outfit `sol` through `player.setDef(CHARS.stig, 'sol')` (cut: keep the suit)
4. Teleport the player to `lm('airport')`, then `cam.snapNext`, `placeNpcs(true)`, `save()`.
5. Toast: "Nytt uppdrag: hitta **Lasse** vid flygplatsen."

**On load,** `game.level = MISSIONS[min(index, n−1)].level`. Then `setLevel` runs before `__ready`, and the cabin phase is derived as `gate` for index 0, otherwise `cruise`. The title-screen orbit and the player spawn come from the level config.

---

## 5. The island: Nueva Estocolmo

### 5.1 Why keep the 7×7 grid

The constants stay the same: P = 80, N = 7, HALF = 280, BOUND = 314. Keeping them preserves:
- `drivers.js` traffic, chase and flee
- `peds.js` loops
- `routeAim`, the minimap base map, `resetToRoad`, `freeSpot` and `shame.startPursuit`
- every stage kind
- the shot.mjs patterns

There is also an in-fiction reason. The real Playa del Inglés and San Agustín were planned in the 1960s as a near-grid of lägenhetshotell (apartment hotels) and bungalows. The grid is the honest look.

**Compass:** north (−z) is inland (mountains, tomato fields, airport) and south (+z) is the sea.

### 5.2 MAP (`MAP[j][i]`, block centres at −240 … +240)

```
           i=0 (-240)  1 (-160)   2 (-80)    3 (0)        4 (80)     5 (160)    6 (240)
j=0 -240   fataga      tomat      bungalow   grisfest     tomat      bungalow   flygplats
j=1 -160   bungalow    tomt       lagenhet   kasbah       lagenhet   golf       lagenhet
j=2  -80   bungalow    lagenhet   cita       suntrip      lagenhet   marknad    bungalow
j=3    0   bungalow    kyrka      lagenhet   flamenco     bensin     lagenhet   guardia
j=4   80   dyner       lagenhet   plaza      lagenhet     lagenhet   bungalow   lagenhet
j=5  160   dyner       bungalow   lagenhet   lagenhet     lagenhet   lagenhet   bungalow
j=6  240   fyren       playa      playa      playa        playa      hamn       playa
```

- **Hotel Flamenco is at the origin** (block 3,3, where Bigmouth's park was). It is home base, and every drive starts from the centre.
- `bungalow` and `lagenhet` are both `residential()` with a style parameter. They replace Bigmouth's `res` (§5.4).

### 5.3 Block builders and landmarks

Every builder is `fn(f, W, ctx)` with f at the block centre, yaw 0 and local ±31, as today. A landmark yaw is the direction a person standing there faces. Landmarks are never inside a solid.

| type | builder (new file) | content | landmarks (id: local x,z / yaw) | named cars |
|---|---|---|---|---|
| `flamenco` | `blocks/hotels.js` `hotelFlamenco` | 7-storey white slab along the north edge (z −31..−14) with balcony rows and terracotta accents; reception porch facing south; pool deck south with a walkable shallow pool (§5.4); poolbar with straw parasols; **Pepes Bodega**: a small whitewashed shop with a green door on the **back (north) side**, sign `PEPES BODEGA · VINOS · RON`. It is visible on the minimap but nobody notices it until the finale. | `flamenco` (0, −10 / 0), `flamencoPool` (0, 12 / π), `flamencoBar` (14, 6 / −π/2), `flamencoDrive` (−20, 26 / 0), `bodega` (8, −35 / π, on the north sidewalk) | `hyrbil` (white SEAT 131) at `flamencoDrive`. Default `getInCar` car and test car. |
| `suntrip` | `hotels.js` `hotelSunTrip` | lower U-shaped hotel; welcome **stage** with a SunTrip sun backdrop, accordion and congas as props; pool; **friskoteket** lawn | `suntrip` (0, 8 / π), `scen` (0, −6 / 0), `friskotek` (−14, 14 / 0) | `buss17` (SunTrip coach) parked on the east side |
| `kasbah` | `blocks/town.js` `kasbah` | two-level nightlife centre: arcade, stairs (ramp), roof terrace; neon signs `VIKING BAR`, `TONGA TONGA` (disco with a mirror ball), `FANTASY BAR` | `kasbah` (0, 20 / 0), `vikingbar` (−16, 18 / 0), `tongatonga` (14, 18 / 0) | |
| `cita` | `town.js` `cita` | strip mall (Bigmouth `shops` reworked); signs `FERRETERÍA`, `FARMACIA`, `ESTANCO`, `TELÉFONOS`, `SOUVENIRS`, `SVENSKT KAFFE` | `cita` (0, 20 / 0), `ferreteria` (−18, 18 / 0), `telefon` (18, 18 / 0) | |
| `plaza` | `town.js` `plaza` | park builder reworked: palms, fountain (shallow walkable pool), restaurant terraces; **Grill Paco** sign `GRILL PACO · COMIDA CANARIA` | `plaza` (0, 0 / 0), `grillpaco` (20, 22 / π) | |
| `marknad` | `town.js` `marknad` | rows of striped stall awnings; souvenir stand with donkey figures | `marknad` (0, 20 / 0), `asnestand` (6, 2 / π) | |
| `kyrka` | `town.js` `kyrka` | modernist white church (rationalist, flat planes, bell slab) | `kyrka` (0, 18 / 0) | |
| `bensin` | `town.js` `bensin` | gas-station builder reworked (`DISA` sign, `GASOLINA`, prices in pesetas); `pump` props keep the explosion | `bensin` (0, 16 / 0) | |
| `guardia` | `town.js` `cuartel` | yellow-ochre barracks, flag mast (red-yellow-red), `CASA CUARTEL · TODO POR LA PATRIA`; two parked green Land Rovers (`guardia`, locked) | `guardia` (0, 20 / 0) | |
| `tomt` | `blocks/nature.js` `tomt` | construction builder reworked: half-built bungalows, crane, ramps, girder deck; sign `SE VENDE · BUNGALOWS` | `tomt` (0, 20 / 0) | |
| `golf` | `nature.js` `golf` | green fairway, sand bunkers, a **pond** (`water` circle) and flag; small clubhouse | `golf` (0, 22 / 0) | |
| `tomat` | `nature.js` `tomatfalt` | rows of low tomato bushes (one merged mesh), packing shed (`EMPAQUETADO`), tomato-crate props; road-side **rollerskier** (static Character, shout "Heja Eslöv!") | `vischan` (0, 26 / 0, on block (1,0) only), `packhus` (on block (4,0)) | |
| `grisfest` | `nature.js` `grisgard` | farm: long tables under string lights, spit-roast, bandstand, piglets in a pen, gate on the north road | `grisfest` (0, −26 / π) | |
| `fataga` | `nature.js` `fataga` | white village houses, tile roofs, narrow lanes, date palms; a **sheep flock** (Rabbit behaviour with a sheep mesh, purely decorative); tablecloth stall | `fataga` (0, 18 / 0) | |
| `flygplats` | `nature.js` `gando` | low terminal with an open arrivals canopy, **baggage carousel** (an animated ring of suitcases), `HITTEGODS / OBJETOS PERDIDOS` desk, bus bay. **The parked DC-8 sits outside the bound wall** at (240, −335) using `buildPlaneExterior`. | `airport` (0, 18 / 0), `hittegods` (−14, 4 / 0), `bagageband` (6, 0 / 0) | `taxi` (Mercedes, locked prop car) |
| `dyner` | `nature.js` `dyner` | large sand dunes (ramps), a palm grove, the lagoon pond | `dyner` (0, 0 / 0) | |
| `fyren` | `nature.js` `fyren` | **Faro de Maspalomas**: 55 m grey-blue stone tower (the tallest landmark, visible from everywhere), keeper's house, dunes | `fyren` (0, 10 / 0) | |
| `playa` | `blocks/beach.js` `playa` | sand, sunbed rows (`solstol` props), parasols, ice-cream kiosk, lifeguard tower, towels on sunbeds | `playa` (on block (3,6): 0, 20 / π) | |
| `hamn` | `beach.js` `hamn` | small marina: walkable basin (`water` box), pier, moored boats; the **epilogue boat "RIO"** (deck solid with top 0.55) | `hamn` (0, 0 / 0), `riobat` (0, 22 / π) | |

**Residential (`bungalow` / `lagenhet`).** This replaces `house()`. The lot logic and `residential()` stay.
- `bungalow` lots: one-storey whitewashed cube (solid top 99) with a flat or terracotta roof, a garden wall (`mur` props instead of `woodfence`), sometimes a small pool, a bougainvillea bush, and `butano` bottles by the door.
- `lagenhet` lots: 2 of the 3 lots per side become a 4–7 storey slab (solid top 99) with balcony stripes and coloured awnings; the third is a **half-finished concrete frame** with a crane. That matches the uncontrolled-1970s-building research and gives climbable ramps.
- Trampolines (`bounce`) are kept, at about 1 in 8 lots, as "studsmatta" (trampoline) in hotel yards.
- The seeded RNG is kept.

### 5.4 Edges, sea, set dressing

- **`streets()`.** Asphalt and sidewalks stay. The grass ring becomes **ochre volcanic sand `#c9a26b`**. Lamps become Spanish double-arm street lamps. Hydrants and newsboxes become `vykort` (postcard racks) and `papelera` (bins).
- **`outskirts()`:**
  - **North and east:** red-ochre mountain domes ("Monte Rojo", `#a5532f` / `#c27a45`), cacti and agaves instead of trees.
  - **West:** sand dunes.
  - **South:** a sand strip from z 289 to 314, then the **sea plane** (`MAT.water` `#1c7fb8`) from z 300 to 1300 and x ±1300, at y −0.25. The bound wall at z 314 stays, so the sea cannot be entered.
  - **Welcome sign** at the west entrance: `BIENVENIDOS A NUEVA ESTOCOLMO · VÄLKOMMEN!`
- **Shallow pools.** A flat blue slab at CURB+0.02 plus a collision `box(…, CURB, 'water')`, which is a floor so you can walk and drive through it ("Tre meter djupt i ena änden, en meter i den andra – barnvänlig." [F] is a sign by the Flamenco pool). `hud.buildBaseMap` draws BOX blocks of kind `water` in blue.
- **Christmas dressing:** a plastic Christmas tree with tinsel in the Flamenco lobby, plus `FELIZ NAVIDAD` / `GOD JUL` banners.

**Prop types** (`props.js` `TYPES`). Hard-coded names are replaced by flags: `def.debris`, `def.splash`, `def.explode`.

| keep (retinted) | replace | new |
|---|---|---|
| trashcan→`papelera`, bench, cone, crate, barrel, cart, vending (`KAS` drinks machine), pump (`explode`), hydrant (`splash`) | mailbox→`vykort` (r 0.35, top 1.6), woodfence→`mur` (2.5×0.3, top 1.1, `debris: 9`), flamingo→`parasoll` (r 0.25, top 2.2), gnome→`palmkruka` (r 0.4, top 1.4), hay→`tomatlada` (1.2×0.8, top 0.9), tombstone→`solstol` (0.7×1.9, top **0.8** so cars smash it rather than drive over it) | `butano` (orange gas bottle, r 0.22, top 0.8, `explode: small`), `glasskylt` (ice-cream board, 0.8×0.2, top 1.3) |

`fence` is never placed; drop it. Car-smashable props must have top > 0.75 (actors map §5.3).

### 5.5 Vehicles (`CAR_TYPES`: Swedish names on the speedo; physics unchanged)

| key | shown name | notes |
|---|---|---|
| sedan | SEAT 131 | |
| hatch | SEAT 127 | the most common traffic car |
| wagon | Renault 12 | drop the `wood` flag |
| van | Skåpbil | |
| pickup | Flakbil | |
| bus | SunTrip-buss | white with an orange stripe and the sun; a new `school:false` flag skips the yellow paint and stop sign |
| icecream | Glassbil | kept; fits the beach |
| `guardia` (new; replaces hearse as the pursuer) | Guardia Civil | `tall`, len 4.2, wid 1.9, bodyH 1.45, colour `0x2e5e3e`; flag `guardia` adds a white roof, a blue lamp and a white door band; maxSpeed 30 |
| `taxi` (new) | Taxi | sedan + flag `taxi`: cream `0xe8dcb8`, roof `TAXI` box with a green LIBRE lamp |
| `grisbil` (new, **the unlock**) | Grisbilen | pickup + flag `pigs` (pink pig blobs in the bed), maxSpeed 34, accel 14 |
| `trolley` (cabin) | Serveringsvagn | §4.4 |

- **Traffic mix:** hatch ×3, sedan ×2, wagon, van, taxi, pickup, at most one bus, rare icecream.
- **Hearse code** stays in car.js, unused.
- **`muscle` unlock** is replaced by `grisbil`. The generic `UNLOCKS` table is in §8.

### 5.6 Pedestrians

`randomPed` palette with **0 % kids, mostly adults**:
- **Skins:** sunburn `0xf2b8a0`, `0xe89a7a`, `0xf6d3c0`; locals `0xc99a6e`, `0xa8774f`.
- **Shirts:** loud (Hawaiian `print` 30 %).
- **Shorts** 55 % with white socks.
- **Hats:** `sunhat` or `bucket` 35 %.

Panic shouts (`peds.js:68`): "Akta!", "Va fan!", "Turister!", "¡Cuidado!", "Jag ringer reseledaren!" [N]

---

## 6. The SKANDAL meter and Guardia Civil (island)

The mechanics are the existing Shame lifecycle with this config:

```js
METERS.skandal = { mode: 'pursuit', label: 'SKANDAL', cls: 'skandal',
  vehicle: 'guardia', vehicleCount: 2, pursuerDef: 'guardia', pursuerHover: 0, pursuerPhysics: 'walk',
  onFootSpeed: 7.4, penalty: 50, decayIdle: 5, grace: 4, bands: [[42, 9], [22, 3]],
  siren: true,
  taunts: ['¡Alto! ¡Guardia Civil!', '¡Documentación, por favor!', '¡Estos suecos están locos!',
           '¡Usted! ¡El de la camisa!', '¡Turistas!'],
  bannerStart:  ['¡GUARDIA CIVIL!', 'Nu blev det skandal'],
  bannerCaught: ['¡MULTA!', 'Guardia Civil tog {n} pesetas i böter', 'Du har inga pesetas kvar att förlora'],
  bannerEscape: ['SKANDALEN TYSTAD', 'Guardia Civil gav upp'],
  bustedFailText: 'Guardia Civil tog dig!' };
```

The Spanish taunts are [N]. "Estos suecos están locos" nods to the film's "De där svenskarna är heltokiga!" [F].

- **Offences:** the current amounts in main.js are kept (carjack 8, props by `def.shame`, bumps, wreck 12, people 14/18, kicks 9/2).
- **Pursuit:** at 100, two Land Rovers spawn on road nodes 70–150 m away (the existing code) and a siren plays (two-tone, §10).
- **The officer on foot** steps with **real collision** (`pursuerPhysics: 'walk'`): `wishX/Z` toward the player plus `step(min(dt, 1/30))`. Buildings block him, which is both funnier and fairer than the floating wizard. Sprint (8.8) outruns him (7.4).
- **Busted** means **¡MULTA!**: −min(coins, 50) pesetas, flash, `onBusted` (fails only missions with `bustFails`).
- `locked` is set `true` during cinematics and the I1 bus intro.

The flight equivalent is FLYGRÄDSLA (§4.6): a panic event, not a pursuit.

---

## 7. Missions in order

**Format:** id · Swedish title · giver @ `at` · reward. The level is `flight` for F1–F4 and `island` for I1–I7.

- New kinds and extensions are defined in §12.3.
- Dialogue tuples may carry an optional third element `cue`: `{sfx, fear, shake, applause, phase}`. `game.cue(c)` runs it when the line starts.
- All flight missions have `bustFails: true`.

### F1 · `ombord` · "Rad 13 finns inte" · `vardinna` @ `galleyBack` · 100 pta

**Intro:**
- Värdinnan: "God morgon och välkommen ombord på SunTrip." [N]
- Värdinnan: "Plats 14B? Längst fram, efter rad tolv." [N]
- Stig-Helmer: "Efter rad tolv kommer väl rad tretton?" [N]
- Värdinnan: "Inte hos oss." [N]
- Värdinnan: "Och se till att handbagaget kommer upp på hyllorna. Gången ska vara fri." [N]

**Stages:**
1. `collect({kind: 'bag', items: 4 spots in the aisle, rows 22–8, text: 'Lägg upp handbagaget', barLabel: 'VÄSKOR', timer: 60})`. Touching a bag makes it fly up into the bin. When Ole's **bergsprängare** (boombox) is collected, Ole's bubble says "Ja, men dyr!" [F].
2. `goto({to: 'cabinRow14', radius: 1.3, text: 'Hitta plats 14B'})`.
3. `sit({seat: '14B', text: 'Sätt dig på 14B'})`.
4. Inline stage **"Överlev starten"**:
   - `init`: `setPhase('takeoff')`, then `setSeatbelt(true)`, and the toast "Håll **J** – Jag kan flyga, jag är inte rädd".
   - `update`: done when `cabin.phase === 'cruise'`.
   - Scripted bubbles at the DUNS:
     - Stig: "Vad är det för ljud?" [F]
     - Ole: "Landingshjulene som går opp. Hydraulikk, vet du." [F~]
     - Ole: "Så flyet ikke skal stoppe, men få fart. Ellers…" [F~]
     - Stig: "Ellers…?" [N]

**Outro** (cruise, seated):
- Majsan: "Titta, solen!" [F] `{applause}`
- Ole: "Bramserud, Ole." [F]
- Stig-Helmer: "Stig-Helmer Olsson." [N]
- Ole: "Du vet vel at det er femti prosent sjanse å overleve en flyulykke?" [F]
- Stig-Helmer: "…Femtio?" [N]
- Ole: "Det er farligere å kjøre bil enn å fly." [F]

### F2 · `juice` · "Mer juice" · `ole` (seated 14A) @ `cabinRow14` · 150 pta

**Intro:**
- Värdinnan: "Var så god." [F]
- Stig-Helmer: "Tack." [F]
- Stig-Helmer: "Om man vill ha lite mer juice…" [F]
- Ole: "Ja, da trykker du der oppe." [F~]

**Stages:**
1. `interact({at: 'call14', prompt: 'Tryck på knappen', text: 'Tryck på knappen ovanför 14B'})`. On use:
   - a "pling" sound
   - Stig's `cupUp` pose for 2.5 s (he holds the mug up to the panel)
   - Ole's bubble "Nei…!" [F] while laughing
   - Ole: "Så… så kommer flyvertinnen. Juice, whisky." [F~]
2. `goto({to: 'galleyBack', radius: 1.4, text: 'Värdinnan är upptagen – hämta juicen själv i bakre byssan'})`.
   - `init` starts the trolley and `turbulence(0.4, 8)`.
   - Angerud's bubble from row 6: "Kallar ni det här 'varm middag'?" [F]
3. `carry({item: 'juice', to: 'cabinRow14', radius: 1.2, text: 'Bär juicen till 14B utan att spilla', failText: 'Du spillde juicen!'})`.
   - It fails if `game.bumpedT > 0`, if the player is flung, or if the player sprints for more than 1 s.

**Outro:**
- Kapten (radio): "Mina damer och herrar, det är kapten. Vi flyger just nu ut över Atlanten." [F]
- Kapten: "Vädret i Las Palmas är bra – soldis och 22 grader varmt." [F]
- Kapten: "Jag kan även meddela att Stenmark ligger trea efter första åket." [F] `{applause}`
- Ole: "Min drøm er å fly med Concorde fra Paris til Rio. 2 300 km i timen. Det er flyging!" [F]
- Stig-Helmer: "Kanarieöarna är inte så dumt heller." [F]
- Ole: "Det får duge." [F~]

### F3 · `sprit` · "Medhavd sprit" · `vardinna` @ `galleyFront` · 150 pta

**Intro:**
- Värdinnan: "Det är förbjudet att dricka medhavd sprit." [F]
- Värdinnan: "Två herrar längst bak har gömt flaskor överallt. Kan du hjälpa mig?" [N]
- Stig-Helmer: "Jag tål inte starksprit." [F]
- Värdinnan: "Då är du rätt man." [N]

**Stages:**
1. `collect({kind: 'flaska', items: 5 spots (rear toilet, row 22 cushion, a hat-rack end that can be reached from a cushion, the rear galley, row 18 C-seat), timer: 75, text: 'Samla in de gömda flaskorna', barLabel: 'FLASKOR'})`.
   - PA radio midway: "Herr Storch ombedes kontakta kabinpersonalen." [F]
   - When the player is near row 22:
     - Berra's bubble: "Ra-tara-tara…" [F]
     - On a pickup there: "Ta det vackert, vi har varit ute och flugit förr." [F]
2. `goto({to: 'galleyFront', radius: 1.4, text: 'Lämna flaskorna till värdinnan'})`.

**Outro:**
- Värdinnan: "Tar man det inte lugnt med spriten kan det bli problem att komma in i Spanien." [F~]
- Berra: "Ja, vad fan, man var ju nykter i morse, men nu börjar det ordna upp sig!" [F]
- Robban: "Pepes Bodega, Berra. Glöm aldrig det!" [F~]
- Berra: "80-procentig rom på vinflaskor. Plomberat och klart." [F~]

### F4 · `landning` · "Inflygning Las Palmas" · `majsan` (seated 16E) @ `cabinRow16` · 200 pta

**Intro** (Stig overhears the sisters):
- Siv: "Pizza-racern, då? Han får fem poäng." [F]
- Siv: "Giraffen, då? Fyra." [F]
- Majsan: "Mindre än pizza-racern?" [F]
- Siv: "Han är så bortkommen. Det blir minuspoäng." [F]
- Majsan: "Åh – hej! Gruvar du dig också för landningen?" [N]
- Stig-Helmer: "Jag kan flyga, jag är inte rädd." [F]
- Majsan: "Visa mig hur man gör, då." [N]

**Stages:**
1. `collect({who: ['storch', 'jose', 'berra'], text: 'Fäst säkerhetsbältet! Få alla stående att sätta sig', barLabel: 'STÅENDE', timer: 60})`.
   - `init`: `setSeatbelt(true)`. The three NPCs are unseated and placed standing in the aisle or toilet queue.
   - Touching one calls `cabin.seatCharacter(npc, home seat)`.
   - Lines when touched:
     - Storch: "Jag filmar bara molnen!" [N]
     - José: "Vad skönt att komma bort!" [F] / Siv: "Jag ska inte bort, jag ska hem." [F]. Here José speaks, then Siv answers off-screen; the order is swapped from the film.
2. `sit({seat: '14B'})`.
3. `mantra({secs: 8, text: 'Inflygning! Håll J: Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA'})`.
   - `init`: `setPhase('approach')` and turbulence 0.7.
   - On completion: `setPhase('landing')`.

**Outro** (`landed`):
- `{applause}`
- Berra: "Om de kraschar, kastar man tomater på piloterna?" [F~] (the speaker is uncertain in the sources; we give the line to Berra)
- Robban: "Nej, skärpning nu, Berra, annars får vi ena jävla problem här." [F]
- Ole: "Morn, Kanariøyene!" [N]

**Then the handover** (§4.9).

### I1 · `buss17` · "Buss nummer 17" · `lasse` @ `airport` · 250 pta

**Intro:**
- Stig-Helmer: "Min väska har inte kommit." [F]
- Lasse: "Hjärtligt välkomna till Nueva Estocolmo och SunTrip!" [F]
- Lasse: "Väskan dyker upp. Det gör de alltid." [N]
- Lasse: "Affe skulle ta transfern, men han hade natturen i natt." [F~]
- Lasse: "Du har väl körkort? SunTrips buss nummer 17 står där borta!" [F~ + N]
- Ole: "Jeg har reisesyketabletter, om du trenger." [F]

**Stages:**
1. `getInCar({car: 'buss17', text: 'Hoppa in i buss nummer 17'})`.
2. `goto({to: 'flamenco', inCar: true, radius: 12, timer: 100, failText: 'Gästerna missade välkomstdrinken!', text: 'Kör gruppen till Hotell Flamenco'})`, with these radio lines:
   - Lasse: "Klockan är tre spansk tid – alltså en timme tidigare än svensk tid." [F]
   - Lasse: "Ni bör inte dricka vattnet." [F]
   - Lasse: "Grisfesten är på torsdag och kostar 800 pesetas. Några frågor?" [F]
   - Storch: "Finns det svenskt kaffe på hotellet?" [F] (Fru Storch's line, voiced by the Storch NPC)
   - Ole: "Norsk, da?" [F]

**Outro:**
- Lasse: "Det har dessvärre uppstått ett litet problem på grund av överbokning. Olsson, Stig-Helmer… och Bramserud, Ole… Kan ni dela rum?" [F]
- Stig-Helmer: "Ja…" [F]
- Stig-Helmer: "Kallar ni det här för havsutsikt?" [F] (speaker uncertain)
- Lasse: "Momento." [F]

### I2 · `friskotek` · "Plocka kulor!" · `lasse` @ `friskotek` · 250 pta (on foot)

**Intro:**
- Lasse: "Jag heter Lasse och har hand om SunTrips friskotek. Friskoteket börjar halv tio varje morgon." [F]
- Lasse: "Sträck upp höger hand, lägg vänster hand på hjärtat och säg efter mig: Jag lovar att bli en sundare och friskare människa under semestern." [F]
- Stig-Helmer: "Jag lovar att bli en sundare och…" [F~]
- Lasse: "Men vinden har tagit badbollarna!" [N]

**Stages:**
1. `rabbits({mesh: 'badboll', count: 6, near: 'friskotek', timer: 75, text: 'Plocka kulor! Plocka med höger… plocka med vänster!', barLabel: 'KULOR'})`. The text is [F].
2. `goto({to: 'friskotek', radius: 5, text: 'Lämna bollarna till Lasse'})`.

**Outro:**
- Berra (from the bar): "Fan… Herr Ober? De har inte öppnat än. Klockan är ju snart tio." [F]
- Robban: "Ska vi inte käka frukost först?" [F]
- Berra: "Det gör vi här. Bacon och ägglikör." [F]
- Lasse: "Hej på dig!" [F]

### I3 · `bodega` · "Pepes Bodega" · `berra` @ `flamencoBar` · 300 pta · `unlock: 'grisbil'`

**Intro:**
- Berra: "Ska vi ta Pepes Bodega idag eller ska vi sola?" [F]
- Robban: "Men va fan, vi kan väl ta det lite lugnt! Vi har ju semester!" [F]
- Berra: "Vi är på södra Gran Canaria och havet är där, va. Då måste bodegan ligga ditåt." [F]
- Berra: "Ska du ha?" [F]
- Stig-Helmer: "Nej tack, jag tål inte starksprit." [F]
- Berra: "Nej, vem fan gör det?" [F]

**Stages:**
1. `pickup({who: 'berra', name: 'Berra', at: 'flamencoBar'})`.
2. `goto({to: 'playa', inCar: true, passenger: 'berra', radius: 14, text: 'Kör ner mot havet'})`. Radio Berra: "Ingen bodega här. Då ligger den åt andra hållet." [N]
3. `goto({to: 'vischan', inCar: true, passenger: 'berra', radius: 14, text: 'Leta inåt land'})`, with radio lines:
   - Berra: "Heja Eslöv!" [F] (as you pass the rollerskier)
   - Berra: "Det här är ju rena vischan." [F]
   - Berra: "Fan, vad jag är törstig." [F]
4. `follow({who: 'robban', type: 'grisbil', carName: 'grisbilen', start: road by (1,1), via: 3–4 nodes, to: 'grisfest', maxDist: 60, cruise: 11, text: 'Följ grisbilen – Robban har liftat!'})`. Radio lines:
   - Berra: "Fan, de luktar." [F]
   - Robban (radio): "Skit i det. Vi slipper gå." [F]

**Outro** (at the farm):
- Berra: "Snacka om grisfest." [F]
- Robban: "Ja, herre jävlar, minns du Benidorm? Snacka om grisfest!" [F]
- Berra: "Var jag med där? Hade jag kul?" [F]
- Grisfestvärden: "¡Grisfest el jueves! 800 pesetas!" [N]

### I4 · `asnan` · "Caballo folklorístico" · `ole` @ `flamenco` · 300 pta

**Intro:**
- Stig-Helmer: "Det var julmat – i julklappen. Och väskan är borta." [F~]
- Ole: "Tenk ikke mer på det. Vi fikser en ny julegave." [F]
- Stig-Helmer: "Undrar vad dalahäst heter på spanska." [F]
- Ole: "Cabalho folkloristico…" [F]
- Ole: "Det fikser vi. Vi fikser alt!" [F]

**Stages:**
1. `pickup({who: 'ole', name: 'Ole', at: 'flamenco'})`.
2. `goto({to: 'marknad', inCar: true, passenger: 'ole', radius: 10})`. Radio haggling:
   - Säljaren: "500 pesetas." [F]
   - Ole: "Jeg gir deg to hundre." [F]
   - Ole: "To hundre er siste bud." [F]
   - Säljaren: "Jävla smålänningar!" [F]
3. `grab({at: 'asnestand', mesh: 'asna', text: 'Ta åsnan'})`.
4. `goto({to: 'ferreteria', passenger: 'ole', inCar: true, timer: 60, text: 'Köp röd färg'})`. Radio:
   - Ole: "Og så maler vi den rød." [F~]
   - Stig: "Och blommor där." [F]
5. `goto({to: 'vikingbar', passenger: 'ole', inCar: true, timer: 70, text: 'Lämna paketet på Viking Bar'})`.

**Outro:**
- Stig-Helmer: "Ett paket till… mostern. God jul, moster." [F~]
- (cutaway, Angerud): "Buenas dias, lilla vikingen. Har paketet kommit?" [F]
- Carmencita: "Han var lång, mörkhårig… hade glasögon och mustasch." [F]
- Angerud: "Då är det grönt." [F]

### I5 · `ropavieja` · "Gamla kläder" · `majsan` @ `flamencoPool` · 350 pta · extra `siv`

**Intro:**
- Siv: "Han heter José. Och han jobbar inte på pizzeria. Datatekniker." [F]
- Siv: "Äkta spansk restaurang, klockan sju." [F~]
- Majsan: "Ta pepparn. Om han blir närgången." [F~]
- Majsan: "Stig-Helmer, kan inte du hålla ett öga på dem? Diskret." [N]

**Stages:**
1. `getInCar({})`.
2. `follow({who: 'jose', type: 'hatch', color: 0x2a4fa8, start: by 'cita', via: [nodeId(1,2), nodeId(1,4), nodeId(2,5)], to: 'grillpaco', maxDist: 70, **minDist: 14**, minText: 'José såg dig!', cruise: 10, text: 'Följ José – men inte för nära'})`. Radio José: "Jag ska bjuda dig på ett ställe som inga turister kommer till." [F]

**Outro** (the mother sits at the next table, home `grillpaco`):
- José: "Kanarisk specialitet! Ropa vieja – gamla kläder." [F]
- Siv: "Vad sa du?" [F]
- José: "Gamla kläder. Det är ungefär som pyttipanna." [F]
- José: "Är det säkert att det inte gör nåt att mamma följde med?" [F]
- Mamma: "¡Nada de suecas!" [F~]
- Siv: "Gissa vem han hade med sig. Morsan!" [F~]

### I6 · `grisfest` · "Grisfesten" · `ole` @ `flamenco` · 400 pta · extra `majsan` (at the farm)

**Intro:**
- Ole: "Skal du ha B-vitaminer? Bra for leveren. Grisefest, vet du. Ta to." [F]
- Ole: "Fikser du ikke damer på grisefesten, da er det slutt." [F]
- Lasse (radio): "Bussen till grisfesten går nu!" [N]
- Ole: "Bussen gikk uten oss! I kveld setter vi inn støtet!" [N + F]

**Stages:**
1. `getInCar({})`. The `grisbil` is suggested.
2. `race({who: 'lasse', passenger: 'ole', type: 'bus', carName: 'grisfestbussen', cruise: 17, start: road west of Flamenco heading north, checkpoints: [[4,2],[6,2],[6,0],[4,0]], finish: {x: 0, z: rc(0)}, text: 'Hinn före bussen till grisfesten!'})`. The route is a starting point; tune it in playtest.

**Outro** (at the farm):
- Ole: "Det er bare å spørre: Skal vi danse!" [F]
- Ole: "Voulez-vous danse avec moi? Fransk." [F]
- Stig-Helmer: "Jag är skraj att de ska nobba." [F]
- Majsan: "Vill du dansa med mig?" [F]
- Stig-Helmer: "Får jag lov…" [F]
- Ole: "Heia Norge!" [F]

### I7 · `julafton` · "Julafton bland palmerna" · `ole` @ `flamenco` · 500 pta · `bustFails: true`

**Intro:**
- Ole: "Morn, gutten min!" [F]
- Ole: "Feliz navidad." [F]
- Stig-Helmer: "Vad sa du?" [F]
- Ole: "Det betyr god jul på spansk." [F~]
- Lasse (radio): "Stig-Helmer! Flygplatsen ringde – din väska har kommit!" [N]

**Stages:**
1. `goto({to: 'airport', radius: 10, text: 'Hämta väskan på flygplatsen'})`.
2. `grab({at: 'hittegods', mesh: 'resvaska', text: 'Ta väskan'})`. Radio:
   - Hittegods: "Hammarby…?" [F]
   - Stig: "Ja!" [F]
   - Hittegods: "Hittelön." [F]
   - Stig: "Tack så mycket." [F]
   - Then: "Angerud tog knäckebrödspaketet!" [N]
3. `destroy({type: 'sedan', color: 0xf4f4f0, carName: 'angerudsFlykt', driver: 'angerud', timer: 60, cruise: 20, text: 'Stoppa Angeruds hyrbil!', barLabel: 'HYRBILEN'})`. Radio Angerud: "Det är sista gången jag åker med SunTrip!" [F]
4. `grab({mesh: 'knacke', text: 'Ta paketet!'})`. It spawns at `m.data.wreck`.
5. `goto({to: 'flamencoPool', radius: 8, timer: 90, shame: true, text: 'Till julfesten vid poolen – Guardia Civil är efter dig!'})`. Radio from the answering machine:
   - Levander: "Detta är dr Levanders automatiska telefonsvarare. Solariet, flygrädslekliniken, bantningen och örtshopen är stängda över jul." [F]

**Outro** (the Christmas party):
- Lasse: "Hej tomtegubbar, slå i glasen! Skål och god jul!" [F]
- Ole: "Ta av lokket! Objektivlokket. Må ta av det, vet du." [F]
- Ole: "Har du filmet sånn lenge?" [F]
- Storch: "Hela veckan." [F]
- Ole: "Det var synd. Det blir ikke noe film da." [F]
- Storch: "Blir'e inge film?" [F]
- Berra: "Robban! Jag hittade Pepes Bodega! Det ligger på baksidan av hotellet." [F]
- Robban: "Och vi som har letat igenom hela jävla Nueva Estocolmo!" [F]
- Majsan: "Jag har köpt en julklapp till dig." [F] (a plastic giraffe)
- Stig-Helmer: "Precis en sån har jag önskat mig." [F] (speaker interpreted)
- Ole: "Femti tusen… Rio, Stig-Helmer. Stranda, jentene og samba!" [N + F]

**Epilogue** (cinematic):
- `cam.frame` on `riobat`, with Stig, Majsan, Ole and Siv teleported onto the boat deck.
- Banner **"FELIZ!"** with sub "Epilog: Rio de Janeiro… ungefär." [N]
- The original samba tune plays. The game-complete toast follows.

---

## 8. Collectibles, currency and unlocks

- **Currency: pesetas (PTA).**
  - The existing coin pool is used with the HUD label "PTA".
  - The cabin has about 30 fixed coins.
  - The island keeps the sidewalk lines, plus arcs on the `tomt` ramps, the `dyner` dunes and the Flamenco pool ramp.
  - Mission rewards are listed in §7.
- **Set A: Oles prylar (7)**
  - Static pickups with a light beam (today's `record` path, with a mesh per id).
  - Each pickup triggers `radio('ole', line)`.
  - Completing the set gives +250 PTA and unlocks the **samba tune** (pause-menu toggle "Musik: samba").

  | # | gadget | spot | Ole's line |
  |---|---|---|---|
  | 1 | quartz watch | top of the `tomt` girder deck | "Digital og analog. Spansk, norsk, svensk tid, kronometer – og så klokke." [F] |
  | 2 | Pool Pen | Kasbah roof terrace (stairs ramp) | "Penn som skriver under vannet!" [F] |
  | 3 | calculator | foot of the lighthouse | "Med vekkerklokke!" [F~] |
  | 4 | Swiss army knife | Fataga square | "Saks – uten skrutrekker. Uunnværlig!" [F] |
  | 5 | camera | golf flag | "Kamera. Skjerpe. Smil." [F] |
  | 6 | swimming goggles | end of the harbour pier | "Mot klor." [F] |
  | 7 | waterproof money pouch | airport baggage carousel | "Å ha penger i når man svømmer." [F~] |

  On completing the set: "Vi fikser alt!" [F]
- **Set B: Hajfenor (7)**
  - Inflatable shark fins circling (the `mosquito` motion with a fin mesh: circle radius 1.2, y 0.3) in walkable shallow water. Kick or stomp pops them with a squeak plus `fx.splash`.
  - Spots: Flamenco pool, SunTrip pool, plaza fountain, golf pond, harbour basin, beach shallows on (3,6), and the `kyrka` fountain.
  - Completion: `radio('lasse', 'Hajar i poolen? Delirium – ring kliniken.')` [F] and +250 PTA.
- **Unlocks** (generic `UNLOCKS` table in content.js, replacing `spawnMuscle`):

  ```js
  UNLOCKS = { grisbil: { type: 'grisbil', at: 'flamencoDrive', side: 4, name: 'grisbil',
    toast: 'Upplåst: <b>Grisbilen</b> – parkerad vid Hotell Flamenco' } }
  ```

- **Save.** Key `charter-and-run-v1`. Contents: `{mission, coins, prylar: [ids], fenor: [ids], unlocked: [...], tune}`.

---

## 9. Title screen, pause and HUD text

**Title screen:**
- `index.html` gets `lang="sv"` and `<title>Charter & Run</title>`.
- `h1`: `<span class="t1">CHARTER</span><span class="amp">&amp;</span><span class="t2">RUN</span>`. `.t1` is sun yellow and `.t2` is SunTrip orange.
- Tagline: *"Svenskarna reser inte till någonting… dom reser från någonting."* [F]
- Buttons: **Spela** / "Laddar…".
- Controls card: the two-column list in §3, both levels in one card.
- Fine print: "Ett fan-gjort hyllningsspel till en svensk filmklassiker. Inte associerat med någon – allra minst SunTrip, som inte finns." [N]
- The background is the live 3D orbit:
  - a fresh save orbits the cabin from above (snow, gate phase), radius 22, height 14
  - an island save orbits `flamenco`
  - The title gradient is sunset orange→turquoise `radial-gradient(#f7a21b55, #1c7fb8cc)`.

**Pause:** "Paus", "Fortsätt", "Musik: på/av/samba", "Ljud: på/av", "Radera sparat". Confirm: "Radera allt och börja om?".

**Loading text:** "Bygger Nueva Estocolmo…", "Tankar bussarna…", "Väcker reseledarna…", "Ritar mustascher…".

**HUD:**

| element | text |
|---|---|
| meter label | `FLYGRÄDSLA` / `SKANDAL` (CSS suffix in pursuit: " · SPRING!") |
| speedo unit | `KM/H` (×3.6) |
| dialogue next hint | `E ▸` |
| big-map legend | "M stänger · ! uppdrag · ● Oles prylar n/7 · ● hajfenor n/7" (from the callback `game.mapLegend()`) |
| stage strings | translated, for example "Hoppa in i en bil", "Tiden är ute!", "Kör tillbaka efter ${name}!", "${name} vann!", "UPPDRAG KLART!", "UPPDRAG MISSLYCKAT", "<b>E</b> Försök igen · <b>Q</b> Ge upp" |
| prompts | "E Prata med ${name}", "E Kliv in", "E Ta bilen", "E Sätt dig", "E Res dig" |

**Fixes for Swedish text:**
- Dialogue blip regex becomes `/\p{L}/u`.
- Banner literals are written in upper case in the source ("UPPDRAG KLART!").

---

## 10. Music and sound (all synthesised; no real melodies)

**Tunes** (a table in audio.js; `audio.setTune(name)` switches at the next bar):
- **`flyg`**: 92 bpm muzak bossa. Soft sine-pad chords Dmaj7–Bm7–Em7–A7, brushed hi-hat, a sine "chime" melody every 8 bars.
- **`sol`**: 116 bpm charter schlager in A minor with the Andalusian cadence Am–G–F–E.
  - "Accordion" lead: square + sawtooth detuned, 5 Hz vibrato, playing an original 8-bar phrase.
  - Conga voice: `tone(220→170, .12, 'sine')` alternating with 330→250.
  - Walking-bass voice from the existing code.
- **`samba`** (unlocked): 100 bpm. Surdo (`tone 60→45`), tamborim (high noise ticks), agogô (two square tones).
- **Pursuit:** music ducked to 0.5 plus a **two-tone siren** (650/500 Hz square, alternating every 0.45 s).

**New channel: `audio.drone(level, brightness)`.**
- A persistent looped noise buffer through a lowpass at 300–900 Hz, plus a 45 Hz saw at low gain.
- Used for the cabin hum, the takeoff roar and reverse thrust.
- Silenced by `pause()` and by `setLevel('island')`.
- It must **not** be touched by `main.updateAudio()`, which zeroes `engine` every frame.

**New sound effects:**

| sound | how |
|---|---|
| `chime()` (seatbelt "pling-plong") | `tone(659, .5, 'sine', .1)` + `tone(523, .8, 'sine', .1, null, .4)` |
| `pling()` | call button |
| `applause(secs = 2)` | about 60 short bandpassed noise bursts at random times; used on every **mission complete**, a running gag from the film's three applause moments |
| `heartbeat()` | 55 Hz double thump |
| `flush()` | toilet |
| `squeak()` | a fin popping |
| `oink()` | grisbil horn; P2 |

**Jingles:**
- `complete` = applause + an arpeggio
- the I7 final jingle is the opening phrase of the traditional "Små grodorna" (public domain)
- `record` is replaced by `pryl`

**Bigmouth leftovers:** `shameBell` becomes the siren. Remove the "Duke" comments.

---

## 11. Visual style and palette

**Cel-shaded toon** (unchanged ramp and outlines). Colour dramaturgy: grey snow → orange cabin → blue sky → white-and-ochre island → orange sunset at the julfest.

| group | tokens |
|---|---|
| cabin | seat `#D2601F`, antimacassar `#F2EFE6`, wall `#E6DCC4`, rack `#D8CDB4`, curtain `#1F4F55`, stewardess `#1E9AA0`, tray `#9A9A92`, sign red `#E0342A` |
| plane | white `#F4F4F0`, cheat line `#1B2F6B`, sun `#F07A1E`, belly `#B8BEC6`, fin cap `#C8202A` |
| island sky | top `0x2a86e0`, horizon/fog/body `0xf2e4c4`, sun `0xffe7b8` at 2.9, hemi ground `0xa08060` |
| island world | whitewash `#f4efe6`, terracotta `#c0623a`, ochre `#c9a26b`, Monte Rojo `#a5532f`, bougainvillea `#c2307a`, palm `#3f7a3a`, butano `#f07a1e`, sea `#1c7fb8`, sand `#e8cf98`, SunTrip yellow `#f7c31b` |
| CSS tokens | `--ink #1d1426`, `--cream #fff8e6` and `--yellow #ffd23f` are kept; `--purple`/`--pink` are replaced by `--sun #f7a21b`, `--orange #e8641e`, `--sea #1c7fb8`, `--teal #1e9aa0`; the minimap grass `#6fae4f` becomes sand `#d9bf86` |

**Keep in sync:** fog colour = sky horizon = `body` background. `gfx.setSkyPalette` does all three at once.

---

## 12. Architecture: files, contracts, new APIs

### 12.1 New and changed files

| file | status | contents |
|---|---|---|
| `src/content.js` | **new (phase 0)** | `HOMES = {flight, island}`, `MAP_LABELS = {flight, island}`, `CHATTER`, `OUCH`, `GETUP`, `CARJACK`, `OLE_STATS`, `PRYL_SPOTS`, `FEN_SPOTS`, `UNLOCKS`, `RADIO_ONLY` (portrait-only keys). main.js imports everything from here. |
| `src/level.js` | **new (phase 0)** | `LEVELS`, `METERS`, `CAM_CABIN` |
| `src/world/frame.js` | **new (phase 0)** | `Frame` extracted from town.js; constructor `(S, F, ox, oz, yaw, scene)` |
| `src/world/cabin.js` | **new** | §4 |
| `src/world/blocks/{hotels,town,nature,beach}.js` + `blocks/index.js` | **new** | `BLOCK_BUILDERS = {type: fn(f, W, ctx)}` |
| `src/world/town.js` | rewrite | streets, outskirts, residential with styles, dispatch through `BLOCK_BUILDERS` |
| `src/world/layout.js` | edit | `MAP` only |
| `src/world/props.js` | edit | `TYPES` (§5.4), the flags `debris`, `splash`, `explode`, and `registerPropType` |
| `src/game/missions.js` | split | `missions/kinds.js` (engine stage kinds + new kinds), `missions/flight.js`, `missions/island.js`, `missions/runner.js`; `MISSIONS = [...FLIGHT, ...ISLAND]` |
| `src/game/shame.js` | edit | `configure`, panic mode, `relieve`, pursuer physics, string config |
| `src/game/hud.js`, `camera.js`, `src/gfx.js`, `src/audio.js` | edit | §12.2 |
| `src/actors/models.js`, `car.js`, `pickups.js`, `peds.js` | edit | §12.4 |
| `src/main.js` | edit | §12.2 wiring |
| `index.html`, `style.css` | edit | §9, §11 |
| `tools/shot.mjs` | edit | §14 |
| `README.md`, `CLAUDE.md`, `Makefile`, `package.json`, `../CLAUDE.md` | edit | docs, port 8840, `#11 idle`, latest-game pointer |

### 12.2 Engine APIs added in phase 0 (signatures are the contract)

```js
// gfx.js
export function setSkyPalette({ top, horizon, fogNear, fogFar }) // sky uniforms (stash the sky mat), scene.fog, document.body bg
export function setCloudsVisible(on)                              // MAT._clouds.visible

// camera.js
cam.profile = null | { pivotH, dist, pitchMin, pitchMax, pitch0, noPull, fov, cineSide, cineUp }
// on-foot branch + pitch clamp + pull-in skip + frame() variant read it; null = today's behaviour

// hud.js
hud.setMapSource(src)        // src = { canvas, scale, x0, z0, zoom, crop: {x0,z0,x1,z1}, north: 'N'|'FRAM' }
hud.buildBaseMap() -> src    // town (existing code, returns a source); also draws BOX kind 'water' blue
hud.buildMapFromBlocks(bounds, { scale, bg, kinds: { [kind]: css } }) -> src
hud.setMeter(v, hot, pursuit)  // = setShame renamed; setMeterLabel(text, cls)
// legend from game.mapLegend(); portrait ring from def.ring; /\p{L}/u blips; KM/H

// audio.js
audio.setTune(name); audio.drone(level, bright); audio.chime(); audio.pling(); audio.applause(secs);
audio.heartbeat(); audio.flush(); audio.squeak(); audio.siren(on)
// + catch-up-burst fix in the scheduler

// shame.js (game.shame keeps its name)
shame.configure(cfg)         // METERS.* ; resets v, ends pursuit
shame.relieve(n)             // v = max(0, v - n)
// panic mode: at 100 → cfg banner/flash, missions.onBusted?.() if running, else game.onPanicIdle()

// main.js (Game)
game.level; game.levelDef; game.setLevel(name); game.transitionTo(name)
game.cue({ sfx, fear, shake, applause, phase })       // dialogue third element
game.addInteractable({ x, z, r, prompt, enabled?(g), use(g) }) -> removeFn   // checked in nearestInteractable
game.sitPlayer(seatId); game.standPlayer()            // via game.cabin
game.cabin                                            // set after buildCabin
game.bumpedT                                          // >0 for 0.3 s after trolley contact
game.mapLegend(); game.onPanicIdle()
// level-aware: walk/sprint speeds, jump/kick/mantra gating, resetToRoad, title orbit, spawn, HOMES,
// cleanupMission NPC list = Object.keys(npcs), noEnter cars skipped, seated NPCs keep ch.y
// dialog lines: [who, text, cue?] → hud.runDialog calls game.cue(line.cue) when a line starts
```

### 12.3 Stage kinds (`missions/kinds.js`)

**Existing kinds** (unchanged API, Swedish defaults): `getInCar`, `goto`, `pickup`, `dropoff`, `follow`, `rabbits`, `race`, `destroy`, `grab`.

**Extensions to existing kinds:**
- `rabbits.mesh`
- `grab.mesh`
- `follow.minDist` / `minText`
- `destroy.driver` (instead of `CHARS.shame`)
- `follow.type` may be any car type, including `grisbil`

**New kinds.** Every stage exposes the fields `shot.mjs` warps to.

| kind | options | done / fail | test field |
|---|---|---|---|
| `collect` | `items: [{x,z}]` or `who: [keys]`, `kind` (Collectible mesh), `radius = 1.0`, `timer?`, `barLabel`, `text`, `onTouch?(g, item)` | all touched / timer | `stage.list[] {x, z, alive}` |
| `sit` | `seat`, `text` | `game.player.seatId === seat` | `stage.seat {x, z}` |
| `interact` | `at` (landmark or `{x,z}`), `prompt`, `use(g, m)`, `text` | after `use` resolves | `stage.at {x, z}` |
| `carry` | `item` (mesh shown above the head), `to`, `radius`, `failText`, `text` | arrival / bumped, flung or sprinted | `stage.to {x, z}` |
| `mantra` | `secs`, `text`, `barLabel` | cumulative seconds with `attack` held / panic fails through the meter | `stage.secs` |

### 12.4 Actor contracts

- **`models.js` CHARS** keys: §2, plus radio-only keys and `guardia`.
- **New def fields:**
  - `hat: 'tricorn' | 'trilby' | 'pilot' | 'sunhat' | 'bucket' | 'santa'`
  - `dress: color` (cone skirt from waist to knee)
  - `shades: color` (filled lenses)
  - `beard: color`
  - `print: [c1, c2, c3]` (merged confetti spheres on the torso)
  - `tuft: true`
  - `tie: color`
  - `camera: true` (Super 8 box at the chest)
  - `hair: 'page'`
  - `ring: css`
  - `outfits: { flyg: {...}, sol: {...} }`, shallow-merged over the def
- **New anim flags:**
  - `wings`: arms straight out sideways
  - `cupUp`: right arm up and forward
  - `push`: both arms forward at waist height
  - `planeSeat`: when seated in the plane, arms on the armrests instead of the steering wheel
- **Exports:** `buildBustGeo(def) -> BufferGeometry`, for the merged passengers.
- **`Character.setDef(def, outfit)`:** rebuilds the model under the same scene parent and keeps the transform. P1, cuttable.
- **`car.js`:**
  - the types in §5.5
  - flags `guardia`, `taxi`, `pigs`, `school`
  - the `s.build` early return and `noWheels`
- **`pickups.js`:**
  - `COLLECT_KINDS = { pryl, fena, bag, flaska, juice, asna, knacke, resvaska }`, each `{ build(id) -> Object3D, motion: 'spin'|'circle'|'bob'|'none', beam }`
  - `Rabbit(scene, x, z, {mesh})` with `badboll` and `faar` (sheep)
- **`peds.js`:** Swedish and Spanish shouts.

### 12.5 Cabin API (`world/cabin.js`)

```js
export const CABIN_X = 3000;
export function buildPlaneExterior(g, { gear = true } = {})   // reused at the airport
export function buildCabin(scene) -> cabin   // registers landmarks + collision + coins; call before finalizeProps
cabin = {
  seats: { '14B': { x, z, y: 0.55, yaw: 0, row: 14, letter: 'B', taken: null }, ... },
  bounds: { x0, z0, x1, z1 }, phase, timeScale,
  setPhase(name, { instant } = {}), setSeatbelt(on), seatbelt, turbulence(strength, secs),
  seatCharacter(ch, seatId), unseatCharacter(ch, x?, z?), unseatAll(),
  trolley, startTrolley(), stopTrolley(),
  tick(dt, t, game),            // exterior, trolley AI, stewardess, fear sources, Ole stats barks, snow
  mapSource(),                  // via hud.buildMapFromBlocks
};
// Landmarks (ASCII): cabinCentre, cabinRow14, cabinRow16, cabinRow22, galleyFront, galleyBack,
//   toiletFront, toiletBack, call14, cabinDoor. Aisle-side spots, yaw 0 (facing the nose).
```

---

## 13. Build plan: who builds what, in parallel

### Phase 0: spine (one agent, serial, about 600 lines)

1. Extract `content.js` and `world/frame.js`.
2. Add `level.js` with `LEVELS`, `METERS` and `CAM_CABIN` as in this document.
3. Implement every API in §12.2:
   - gfx and camera profile
   - hud map source, meter and strings plumbing
   - audio drone, `setTune` with the existing tune as `sol`, and the new sound effects as simple placeholders
   - `shame.configure` / panic / `relieve`
   - interactables, `setLevel`, `transitionTo`, cue support in dialogue
   - the three `car.js` guards
   - `registerPropType`
   - stage kinds `collect`, `sit`, `interact`, `carry`, `mantra` plus the option extensions
4. **Stub `buildCabin`.** A 6 × 30 m box with walls and 3 seat rows exposing the full API, so missions and tests can run before the real cabin exists.
5. Fix the `startMission` race in shot.mjs.

**Exit criteria:** the unchanged Bigmouth `story` still passes, and `?mission=0` with a one-stage stub flight mission runs in the stub cabin.

### Phase 1: content (six agents in parallel; each owns its files only)

| agent | owns | depends on (phase-0 contracts) |
|---|---|---|
| **A. Cabin** | `world/cabin.js` (real build, exterior, phases, trolley, turbulence, fear sources), the `fx.snow` preset | cabin API §12.5, `CAR_TYPES` merge, `setSkyPalette`, `cam.shake`, `shame.add/relieve`, `buildBustGeo` (it may first stub busts with boxes until C lands) |
| **B1. Island base** | `layout.js` MAP, `town.js` (streets, outskirts with sea and mountains, residential styles), `props.js` TYPES | `Frame`, `BLOCK_BUILDERS` names from §5.3 |
| **B2. Island landmarks** | `world/blocks/*.js` | `Frame`, the landmark table in §5.3 (**names are the contract**), `buildPlaneExterior` (until A lands, use a placeholder box) |
| **C. Cast and vehicles** | `models.js`, `car.js` types and flags, `pickups.js` kinds, `peds.js` | def fields §12.4 |
| **D. Missions and story test** | `missions/flight.js`, `missions/island.js`, `content.js` (CHATTER, OLE_STATS, spots, UNLOCKS), `tools/shot.mjs` | stage kinds, landmarks §5.3 + §12.5, CHARS keys §2 |
| **E. Audio and UI** | `audio.js` tunes and sound effects, `index.html`, `style.css`, the hud.js string tables | §9, §10, §11 |

### Phase 2: integration (one agent, serial)

1. Wire it together and tune palettes, timers and race routes.
2. Run the full `story` (11 missions).
3. Screenshot review: the cabin in every phase, Swedish glyphs on signs, the minimap in both levels.
4. Update the docs and the parent CLAUDE.md pointer (`charter_and_run__sallskapsresan/` is now the latest game).

### Priority (what to cut first if time runs out)

- **P0:**
  - cabin and phases (gate, takeoff, climb, cruise, approach, landed)
  - camera profile
  - FLYGRÄDSLA / panic
  - interactables and mantra
  - F1–F4, the handover, I1–I7
  - the SKANDAL pursuit
  - collectibles A and B
  - Swedish UI
  - the `sol` and `flyg` tunes
- **P1:**
  - trolley with the stewardess
  - cabin minimap plan
  - outfit swap
  - grisbil unlock
  - the plane parked at the airport
  - samba unlock
  - Rio epilogue boat
  - applause on every completion
- **P2:**
  - player-driven trolley
  - oink horn
  - sheep flock in Fataga
  - Concorde fly-over in the epilogue

---

## 14. Test plan (`tools/shot.mjs`, PORT/OUT per agent)

**`story` (11 scripts M[0..10], each ending in `waitIdle(k+1)`).** Final line `#11 idle`; no `scenario failed`; last line `no errors`.

`startMission`:
1. `await frames(3)`.
2. Exit the car if in one.
3. Warp to `lm(current.at)` moved 1.5 m along the landmark's yaw.
4. `frames(3)`.
5. If the giver is more than 3 m away, warp next to the giver.
6. Tap E.

Flight scripts:

| script | steps |
|---|---|
| M0 | `collect` warps over `stage.list` → warp to `stage.to` → warp to the row-14 aisle and tap E (sit) → wait for `cabin.phase === 'cruise'` (3× speed) |
| M1 | `__game.cabin.stopTrolley()` first → `interact` (warp to `stage.at`, tap E) → `goto` warp → `carry` warp |
| M2 | `collect` warps → `goto` |
| M3 | touch the `collect` NPCs (warp onto each) → sit → `hold(['KeyJ'], 9000)` → `waitIdle(4)`; then log `__game.level === 'island'` |

Island scripts follow the Bigmouth patterns:
- `rabbits` uses ≤ 6 warps.
- `race` warps checkpoint by checkpoint.
- `destroy` uses `stage.car.damage(999)`.
- `grab` warps onto `stage.item`.
- `follow` warps 12 m behind the car until the stage changes. For I5 that is **at least 20 m behind**, because of `minDist`.

**New scenarios:**

| scenario | does |
|---|---|
| `cabin` | screenshots of `gate`/`climb`/`cruise`/`approach`/`landed`; walks into each wall for 2 s and asserts the player is inside `bounds`; asserts `camera.position.y > 4` |
| `trolley` | 40 s: the trolley loops, the player stands in the aisle and is pushed, no NaN, fear rose |
| `panic` | `__game.shame.add(100)` in flight while idle → player seated in 14B |
| `transition` | `FROM=3` → after F4 the level is `island` and the player is within 20 m of the airport |
| `views` | the island landmark list from §5.3 |

`drive`, `chaos`, `smash` and `cruise` use `named.hyrbil` and the `vykort` prop. Delete `talk` or point it at `vardinna` (the mission-0 giver).

---

## 15. Risks and how they are mitigated

| # | risk | mitigation |
|---|---|---|
| 1 | Camera inside a 1.1 m aisle: clipping, the pull-in min 1.6 m, ceilings | Cut-away dollhouse plus the interior profile (steep pitch, no pull-in, high cinematic). Ceiling is a down-facing plane. Verified by the `cabin` scenario screenshot (§4.2). |
| 2 | "Altitude" with floors that cannot go above 0.8 m and no ceilings | The cabin stays at ground level; all motion is in the `outside` group. Jump is disabled in the flight. |
| 3 | Content leaking between worlds (sea under the plane, town clouds in the cabin) | Island geometry stays inside ±1500. `setCloudsVisible(false)` in the flight. Flight fog far is ≤ 900. |
| 4 | NPCs live in both worlds | Per-level `HOMES`; `busy` + seated or hidden; `unseatAll` at handover; `placeNpcs(true)`. |
| 5 | Props or coins placed after `finalizeProps` are silently dropped | The cabin is built before `finalizeProps` and has no props. The init-order assertion runs in phase 0. |
| 6 | Trolley physics (soft cap, broken tall model, wheel swap) | AI-only throttle with no player boost; custom `build`, `noWheels`; kinematic x-centring. The player-driven version is P2. |
| 7 | main.js merge conflicts across six agents | Content moved to `content.js`/`level.js`; main.js is touched only in phases 0 and 2. |
| 8 | Story flake (giver relocation race, seen at baseline) | The `startMission` fix (§14). In tests, the trolley stops and timeScale is 3. |
| 9 | Panic killing the automated run | Seated scripted sources peak around 50; tests stay seated in risky stages. |
| 10 | Swedish and Norwegian glyphs on canvas signs and banners | Luckiest Guy latin subset includes åäöæø (checked). Screenshot check in phase 2. The blip regex is fixed. |
| 11 | Mission count and runtime (11 missions) | Flight missions are short and use warps; island missions reuse proven kinds; a 90 s per-mission budget. |
| 12 | Tone and legal: real brands, real people, songs | Only fictional SunTrip, Sol-Viking and SPORT-KNÄCKE. An unnamed grisfest host, no T-shirt slogan, no film melodies. [N] lines stay labelled in docs. Turbulence and the Guardia chase are acknowledged as invented. |
| 13 | Uncertain facts used as story beats | Speakers of the tomato line and "havsutsikt" are marked as uncertain. Siv's surname uses the dialogue form "Åman". Gating, retries and saves do not depend on any uncertain fact. |
| 14 | Performance | Cabin about 10 draw calls plus 8 seated NPCs. Busts are merged. Cloud deck is one InstancedMesh. Snow uses the existing fx pool (700). The town is culled by distance and the far plane while in the cabin. |
| 15 | Outfit swap (`setDef`) breaking references | It keeps the `Character` object and only swaps `model`/`root` under the same parent. If it causes trouble, cut it to P2 and keep the suit. |