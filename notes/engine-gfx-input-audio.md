# Engine map: gfx, input, audio, util, index.html, style.css

Scope: `index.html`, `style.css`, `src/gfx.js`, `src/input.js`, `src/audio.js`, `src/util.js` in
`charter_and_run__sallskapsresan/`. All six files are still byte-identical to `bigmouth_and_run/`.
So far the copy differs only in ports: Makefile/package.json serve on **8840**, and `tools/shot.mjs`
uses `PORT` 8841 and honours `OUT=dir`. `CLAUDE.md` still says 8790 and is stale. The
`package.json` `test` script points at a `tools/test.mjs` that does not exist; use `make test` or
`node tools/shot.mjs story`.
Stack: three **0.186.1** from `node_modules` via the importmap (`index.html:12-14`), plain ES
modules, no build step.

---

## 0. TL;DR for the port

- **Keep:** the engine parts as they are. That covers the renderer, toon gradient, outlines, `GeoBuilder`, `PRIM`, `mat()`,
  `textCanvas/signMesh`, the input action layer, the audio graph, `tone/noise`, the engine/skid/horn
  channels and all of util.js.
- **Re-skin:** the sky, fog and body-background colours (three places that must match), the CSS palette and
  title card, the controls text (Swedish), the music tune, `shameBell`, the jingle set and the MAT entries
  that are Bigmouth-only (`ghost`).
- **Must change for Swedish text (outside these files):**
  - The dialogue blip regex `/[a-z]/i` (`hud.js:206`) skips å/ä/ö. Use `/\p{L}/u`.
  - The speedo shows MPH (`hud.js:28,134`, `*2.237`). Use km/h (`*3.6`).
  - `html lang="en"` becomes `sv`.
  - The fonts are fine. I checked the cmap of the Luckiest Guy latin woff2 today and it has
    å ä ö Å Ä Ö æ ø Æ Ø é ü € – — … « ». Nunito's latin subset covers Latin-1.
- **Flight level (level 1) traps in this engine:**
  - The sun shadow will darken a closed cabin.
  - `tickSky` pins the clouds to y=0, so the 150-290 m cloud band cannot be put below the plane without editing it.
  - The sky material is not reachable at runtime.
  - `main.updateAudio()` silences `audio.engine` every frame you are not in a car, so the cabin drone needs its own channel.

  See section 10.

---

## 1. Module coupling

| consumer | gfx.js | input.js | audio.js | util.js |
|---|---|---|---|---|
| main.js | `THREE, initGfx, renderer, scene, camera, followSun, tickSky` (l.4) | `input` (l.5; also stored as `game.input`, l.68) | `audio` (l.6) | `clamp, dist, yawTo, pick, mulberry32` (l.23) |
| world/town.js | `THREE, GeoBuilder, toonMesh, signMesh, MAT, mat, PRIM, makeWedge, textCanvas` | | | `mulberry32, pick` |
| world/props.js | `THREE, GeoBuilder, MAT, outlineGeometry, outlineMat, mat` | | | |
| actors/models.js | `THREE, GeoBuilder, toonMesh, MAT, mat, PRIM` | | | `mulberry32, pick` |
| actors/car.js | `THREE, GeoBuilder, toonMesh, MAT, mat, PRIM` | | | `clamp, damp, pick` |
| actors/pickups.js | `THREE, GeoBuilder, toonMesh, MAT, outlineGeometry, outlineMat, mat, PRIM` | | | `yawTo` |
| game/hud.js | `THREE, camera` | via `game.input` (l.210) | `audio` (talk) | |
| game/missions.js | | via `g.input` (l.638-639) | `audio` | `dist, yawTo, pick` |
| game/shame.js | | | `audio` | `yawTo, pick` |
| game/fx.js | `THREE, MAT, toonGradient` | | | |
| game/markers.js | `THREE, GeoBuilder, toonMesh, MAT, outlineMat` | | | |
| game/camera.js | `THREE` | | | `clamp, damp, dampAngle` |

- Nothing outside gfx.js imports `sun` or `hemi`. They are exported and ready for per-level lighting.
- `renderer`, `scene`, `camera`, `sun` and `hemi` are `export let` live bindings
  that `initGfx` assigns (`gfx.js:5`), and `MAT` is filled by `initGfx → initMaterials`. Any
  module-top-level code that touches them gets `undefined`, so build only inside init functions.
  `PRIM`, `makeWedge` and `mat()` are safe at import time (`fixOutward(PRIM.prism())` runs at
  module load, `gfx.js:197`).
- **Boot order (main.js:74-141):**
  1. `initGfx(#app)` and `input.init(renderer.domElement)`.
  2. `hud.init()` and `fx.init(scene)`.
  3. Wait for the **Luckiest Guy** font load, giving up after 2.5 s (l.81). It is needed before any `textCanvas` sign is built.
  4. `buildTown`, then cars, peds and characters.
  5. Portraits (l.129-132).
  6. Start the rAF loop, set `window.__ready = true`, enable `#play`.
- **Frame loop (main.js:674-685):**
  1. `input.poll()`
  2. `update(dt)` (or `idleTitle(dt)` before Play)
  3. `renderer.render(scene, camera)`
  4. `input.endFrame()`
  5. `window.__frame++`

  `update` calls `followSun(f.x, f.z)` and `tickSky(time, camera.position)` every frame (l.718-719,
  and l.693-694 on the title).

---

## 2. src/gfx.js (317 lines)

### 2.1 Exports
`THREE`, `renderer`, `scene`, `camera`, `sun`, `hemi`, `MAT`, `initGfx(container)`, `followSun(x,z)`,
`toonGradient()`, `outlineMat(t, color)`, `outlineGeometry(geo)`, `toonMesh(geo, opts)`, `mat(...)`,
`PRIM`, `makeWedge()`, `GeoBuilder`, `textCanvas(...)`, `signMesh(...)`, `tickSky(t, camPos)`.

### 2.2 Renderer and camera (`initGfx`, l.9-39)
- `WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false })`.
  There is **no `alpha`**, so the canvas is opaque. Pixel ratio is capped at 2. There is no explicit tone mapping
  (`NoToneMapping`) and the output colour space is three's default sRGB. ColorManagement is on, so hex colours are
  treated as sRGB and converted to linear.
- `shadowMap.enabled = true`, `PCFShadowMap`.
- `PerspectiveCamera(62°, aspect, near 0.25, far 1800)`. The resize listener updates aspect and size.
  The debug aerial view in main.js:717 sets `fov = 50` and never restores it.

### 2.3 Lights and shadows
- `hemi = HemisphereLight(sky 0xd8ecff, ground 0x8a7656, 1.45)` (l.20).
- `sun = DirectionalLight(0xfff0d6, 2.5)`, castShadow, 2048² map (l.22-29). The ortho shadow camera is
  **±75 m**, near 10, far 420, with bias -0.0004 and normalBias 0.05.
- `SUN_OFFSET = (70, 130, 45)` (l.7) sets the light direction, which comes from +X +Z, high.
- `followSun(x, z)` (l.44-49) recentres the shadow frustum on the focus point and snaps it to texels
  (`texel = 150/2048`) so shadows don't crawl. **If you change the frustum size, change the `150` too.**

### 2.4 Fog, sky dome and clouds
- `scene.fog = new THREE.Fog(0xcbe7f6, 220, 760)` (l.31) is linear fog.
- The sky (`addSky`, l.273-287) is a `ShaderMaterial` on a back-face sphere of radius 1000 that follows the camera
  (`onBeforeRender`). It uses `gl_Position = p.xyww` so it always sits at the far plane, with `renderOrder -10` and no fog.
  - Uniforms: `top` 0x3d8fe0 and `horizon` 0xcbe7f6. The gradient is `mix(horizon, top, pow(clamp(vP.y*1.5,0,1), .75))`,
    and everything below the horizon is horizon colour.
  - **The sky material is a local variable, so you cannot recolour it at runtime.** Stash it (for example
    `MAT._sky = mat`) if levels need different skies.
- **Three colours must match:**
  - the fog colour (`gfx.js:31`)
  - the sky `horizon` (`gfx.js:275`)
  - the page background `html, body { background: #cbe7f6 }` (`style.css:13`)
- Clouds (l.289-309):
  - 22 clusters of 4-7 flattened spheres built with one `GeoBuilder` into a single mesh. They sit on a ring of
    radius 620-840 m at **y 150-290 (absolute)**, use a seeded LCG (`seed = 7`) and have `fog: false`.
  - The outline is `outlineMat(0.6, 0x6f9ccc)` with `.fog = false`. That mutates a *shared cached* material,
    so anyone else asking for `(0.6, 0x6f9ccc)` gets one with fog disabled.
  - The group is stored as `MAT._clouds`, a hack that uses MAT as a global stash.
  - `tickSky(t, camPos)` (l.312-317) sets `rotation.y = t*0.004` and **`position = (camPos.x, 0, camPos.z)`**,
    which resets y to 0 every frame.
  - The clouds use their own toon material. `MAT.cloud` is unused.

### 2.5 Materials: `MAT` (l.61-72)
| key | material | used by |
|---|---|---|
| `toon` | `MeshToonMaterial({ vertexColors, gradientMap })`. **The default for everything** | toonMesh default, props, pickups, car, models, town:780 |
| `burnt` | toon, vertexColors, `color 0x3a3236` (darkens) | car.js:342 (wrecks) |
| `ghost` | toon, vertexColors, transparent 0.62, no depthWrite | models.js:137 (Duke's ghost). Bigmouth content |
| `glass` | toon `0xbfe6ff`, transparent 0.32, DoubleSide, no depthWrite | car.js:132 (as a plain Mesh with no outline, renderOrder 2) |
| `cloud` | toon white, fog:false | **unused** |
| `water` | toon `0x46b4e6` | **unused** (worth reusing for the sea or a pool) |
| `white` | toon white | **unused** |
| `mouth` | `MeshBasicMaterial({ vertexColors })`, unlit | models.js (mouths) |
| `beam` | basic `0xffd23f`, 0.28 alpha, DoubleSide | **unused** (markers.js makes its own beams) |

fx.js and props.js debris make their own `MeshToonMaterial({ gradientMap: toonGradient() })` for
instanced colours.

### 2.6 Toon ramp
`toonGradient()` (l.52-59) returns a shared `DataTexture` built from `[105, 175, 232, 255]` (RedFormat, Nearest).
That gives four light bands, the darkest at about 41 %. Every toon material shares it.

### 2.7 Inverted-hull outlines (l.74-118)
- `outlineMat(t, color = 0x1d1426)` returns a `MeshBasicMaterial({ color, side: BackSide })`, cached per
  `t:color`. Its `onBeforeCompile` replaces `#include <begin_vertex>` with
  `transformed = position + normal * uOutline * clamp(viewDepth * 0.035, 1.0, 4.0)`.
  - This pushes the vertex out in **local units**. The push is the base thickness up to about 28.6 m from the
    camera, then grows to 4× by about 114 m so distant lines don't vanish.
  - `USE_INSTANCING` is handled only for the depth estimate.
  - The colour `0x1d1426` matches CSS `--ink`.
- `outlineGeometry(geo)` keeps **only the position (and index)** and runs
  `mergeVertices(g, 1e-3)` then `computeVertexNormals()`. The smoothed normals stop the hull from cracking at hard
  edges. Colours, UVs and normals are dropped.
- `toonMesh(geo, { outline = 0.04, cast = true, receive = true, material = MAT.toon })` returns a
  `Mesh` with an outline child named `'outline'` that neither casts nor receives shadows. Pass `outline: 0` to skip it.
  **Do not outline transparent meshes**, because the opaque hull shows through.
- Outline thicknesses in use:
  - 0.04 by default
  - 0.035 for car bodies (car.js:129)
  - 0.03 for props
  - 0.6 for clouds
- **Instanced outlines (props.js:115-118):**
  `om = new InstancedMesh(outlineGeometry(geo), outlineMat(0.03), n); om.instanceMatrix = im.instanceMatrix;`.
  This shares the instance matrices with the toon `InstancedMesh`.

### 2.8 Transform helper and primitives
- `mat(x=0, y=0, z=0, rx=0, ry=0, rz=0, sx=1, sy=1, sz=1)` (l.124-126) returns a `Matrix4`, with Euler order **'YXZ'**
  (yaw, then pitch, then roll).
- `PRIM` (l.129-139) holds lazily cached unit geometries. All are **unit size (diameter 1, height 1), centred**,
  except where noted.
  - `box()` is 1×1×1.
  - `sphere(w=14, h=10)` has radius 0.5.
  - `dome()` is a hemisphere with radius 0.5 and its base at y=0.
  - `cyl(n=12)` has radius 0.5 and height 1.
  - `cone(n=12)` has radius 0.5 and height 1.
  - `ico(d=1)` has radius 0.5.
  - `torus()` has R 0.5 and tube 0.12.
  - `capsule()` has radius 0.5 and length 1, so its total height is 2.
  - `prism()` is a gable roof with a 1×1 base on y=0 and the ridge along X at y=1 (l.141-157, normals fixed by `fixOutward`).
- `makeWedge()` (l.160-176) is a ramp with a 1×1 base on y=0 whose height goes from 0 at z=-0.5 to 1 at z=+0.5,
  so it rises toward local +Z. That matches the collision ramps, which "rise along their yaw". It is cached as `prim.wedge`.
- `fixOutward(g)` (l.179-196) flips triangles that face the centroid. It only works on convex shapes.

### 2.9 `GeoBuilder` API (l.200-234)
It merges coloured primitives into **one indexed BufferGeometry with per-vertex colour**, which means one draw call
(plus one for the outline). Every method returns `this` and can be chained.

| method | signature | notes |
|---|---|---|
| `add` | `add(geo, color, m?)` | Copies the position and **normal** (both required) and the index (it synthesises one if the geometry is non-indexed). Applies Matrix4 `m` and fills `color` (any `THREE.Color.set` input: hex number, CSS string). **UVs are dropped.** Use it for `PRIM.dome/torus/capsule/prism`, `makeWedge()` and custom geometry. |
| `box` | `box(color, x, y, z, w, h, d, ry=0, rx=0, rz=0)` | Centred on the point. **The rotation argument order is ry, rx, rz. Every other method uses rx, ry, rz.** |
| `boxB` | `boxB(color, x, y0, z, w, h, d, ry=0)` | Stands on `y0`. Yaw only. |
| `sphere` | `sphere(color, x, y, z, sx, sy=sx, sz=sx, rx=0, ry=0, rz=0, seg?)` | `sx/sy/sz` are **diameters**. `seg` picks `PRIM.sphere(seg, max(6, seg*0.7))`. |
| `cyl` | `cyl(color, x, y, z, r, h, n=12, rx=0, ry=0, rz=0)` | **radius** `r`, centred vertically |
| `cone` | `cone(color, x, y, z, r, h, n=12, rx=0, ry=0, rz=0)` | radius `r`, centred, tip at +h/2 |
| `ico` | `ico(color, x, y, z, s, d=1, ry=0)` | `s` is the diameter (uniform) |
| `build` | `build()` | Returns `mergeGeometries(parts, false)` with its bounding sphere and box, or **`null` if empty**. |
| `empty` | getter | `parts.length === 0` |

Typical use is `const g = new GeoBuilder(); g.boxB(0xffffff, 0,0,0, 4,3,4).cyl(...); scene.add(toonMesh(g.build()))`.
Characters and cars use several builders, one per animated part, each passed through `toonMesh`.

### 2.10 Canvas text (l.239-268)
- `textCanvas(text, w, h, { bg='#fff8e6', fg='#1d1426', border='#1d1426', font='"Luckiest Guy", Impact, sans-serif', scale=0.62, ppm=96, stroke=null, borderW=0.05 })`
  returns a `<canvas>`. `w` and `h` are in metres at 96 px/m, with the width capped at 2048 px.
  - `\n` gives multiple lines.
  - Text is auto-shrunk to 90 % of the width.
  - Pass `bg: null` or `border: null` to turn the background or border off.
- `signMesh(text, w, h, opts)` returns a `Mesh(PlaneGeometry(w,h), MeshBasicMaterial({ map, transparent: !opts.bg }))`
  (unlit, fogged, single-sided unless `opts.double`).
  - **Gotcha:** if you leave out `bg`, the canvas still gets the default cream background but the material is
    flagged transparent. Pass `bg` explicitly for opaque signs.
  - Used for town signs (town.js:56,358,424,758), all in Bigmouth text.

### 2.11 Keep vs replace in gfx.js
- **Keep:** everything structural.
- **Re-tune for the Canaries:**
  - the sky `top` and `horizon`, fog colour and near/far, and the body background
  - `hemi` colours (a sandy or volcanic ground colour), and `sun` colour and intensity
  - cloud density and height
- **Bigmouth-only:** `MAT.ghost`, and the comment on l.237 about the "water tower, marquees".
- **Optional new hooks worth adding:**
  - `setSkyPalette({ top, horizon, fogNear, fogFar })` (needs the sky material stashed)
  - a cloud altitude argument for `tickSky`

---

## 3. Portrait hooks (in hud.js and main.js; they drive the gfx renderer)

- `renderPortrait(renderer, model, R = 0.3)` is at **hud.js:368-404**. `R` is unused. What it does:
  1. Builds a private scene with `HemisphereLight(0xffffff, 0x9a8a7a, 2.2)` and a `DirectionalLight(0xffffff, 2.2)` at (1,2,3).
  2. **Temporarily re-parents `model.root`** into it and sets `model.root.position = 0` and `rotation = (0, 0.35, 0)`.
  3. Frames `model.head`'s world position with a 28° camera at distance `kind === 'monster' ? 2.6 : kind === 'wizard' ? 2.1 : 1.7`, times `def.scale`.
  4. Renders to a 160×160 sRGB render target and reads the pixels back.
  5. Flips Y into a canvas and returns a **PNG data URL**.
  6. Re-attaches the root to its old parent.
- **Side effects:**
  - The root's position and rotation are *not restored*, so the character must be re-synced each frame. Live
    `Character`s are.
  - It leaves `renderer.setClearColor(0x000000, 0)`. That is harmless while the sky dome covers the screen, but
    a level with no sky shows **black**, so set `scene.background` or a clear colour in that case.
- **Model contract:** `model.root` (Object3D), `model.head` (Object3D), `model.def.kind`, `model.def.scale`.
  Outlines come along because they are children of the meshes.
- **Callers:** main.js:129-132 fills `hud.portraits[key]` for every key in `HOMES` plus `nick` and `shame`. A throwaway
  `Character(CHARS.shame)` is built just for its portrait.
- **Consumers:**
  - The dialogue `img.src = hud.portraits[line.who]` (hud.js:187). The circle background colour is chosen at
    hud.js:188 by `who === 'nick'` or the kind `monster`/`wizard`, which is **Bigmouth logic to replace** (for
    example Stig-Helmer, Ole and the guide).
  - Radio toasts `<img class="radio-face">` (main.js:575).
- **Dialogue lines** are `{ who, text }`. Text types out at 55 chars/s. `audio.talk(def.voice)` blips on every second
  letter that matches `/[a-z]/i` (**change this to `/\p{L}/u` for åäö**). `skip` completes the line, a second press advances.
- **CSS:** `.dlg-portrait` is a 108 px circle, `.radio-face` is 38 px.

---

## 4. src/input.js (107 lines)

The action table. Pad indices follow the W3C standard mapping: 0 A, 1 B, 2 X, 3 Y, 6 LT, 7 RT, 8 Back, 9 Start,
10 L3, 11 R3.

| action | keys (`e.code`) | pad buttons | consumed by |
|---|---|---|---|
| `jump` | Space | 0 | main.js:739 (`pressed`) |
| `attack` | KeyJ, Mouse0, KeyK | 2 | main.js:743 |
| `interact` | KeyE, KeyF, Enter | 3 | main.js:735,747; missions.js:638 (retry) |
| `sprint` | ShiftLeft/Right | 1 | main.js:808 (`down`) |
| `handbrake` | Space | 0 | main.js:798 (`down`) |
| `horn` | KeyH | 10 | main.js:1068 (`down`) |
| `pause` | Escape, KeyP | 9 | **unused**. Escape pauses through pointer-lock loss (`onUnlock`, main.js:78). P is read raw with `keyPressed('KeyP')` (main.js:730). **Gamepad Start does nothing.** |
| `map` | KeyM, Tab | 8 | main.js:729 |
| `camReset` | KeyC | none | **unused** |
| `lookBack` | KeyB | 11 | main.js:716 (`down`) |
| `skip` | Space, KeyE, Enter, Mouse0 | 0, 3 | hud.js:210 (dialogue) |
| `mute` | KeyN | none | main.js:728 |
| `reset` | KeyR | none | main.js:732 (unstick) |
| raw | `keyPressed('KeyQ')` | | missions.js:639 (abort a failed mission) |

Movement is hard-coded outside `KEYS`:
- `moveX()` is D/→ minus A/←, plus stick axis 0.
- `moveY()` is W/↑ minus S/↓, minus stick axis 1.
- `throttle()` is the max of W/↑ and RT (`padNow[7]`). The `padAxes[1] < -0.5 && !padNow.length` branch can never be
  true while a pad is connected, so it is dead.
- `brake()` is the max of S/↓ and LT (`padNow[6]`).
- `steer()` is `moveX()`.
- `look()` returns `{x: mouseDX + rightStickX*14, y: mouseDY + rightStickY*10}`, accumulated per frame. The pad part is
  **frame-rate dependent**.

API (`input` object):
- `init(canvas)` (l.31-55) installs the listeners:
  - keydown: `preventDefault` for Space, Tab and the arrows; `pressed` only on non-repeat.
  - keyup, `blur` (clears `down`), and mousemove (deltas only while locked).
  - canvas mousedown: if `wantLock && !locked` the first click **only requests lock** and does not count as an attack.
  - contextmenu is blocked.
  - `pointerlockchange` calls `onUnlock`.
- `lock()` calls `requestPointerLock({ unadjustedMovement: true })` and falls back to the plain call. `unlock()`.
  `wantLock` and `locked` are flags.
- `poll()` takes the first connected gamepad, applies a 0.15 axis deadzone, and keeps the previous buttons for edge detection.
- `down(action)` and `pressed(action)` check keyboard OR pad, with a pad threshold of 0.5. `key(code)` and `keyPressed(code)` are raw.
- `endFrame()` clears `pressed` and the mouse deltas. It is called after render, so **`pressed` is true for the whole
  frame**. One-shots belong in `handleOneShots` (once per frame), not in `fixedStep` (60 Hz × n).
- `_press(code)` and `_release(code)` are test hooks. They are **unused**, because shot.mjs drives real
  `page.keyboard` events.

Gotchas:
- Space is jump, handbrake and skip at once, and E is interact and skip. Dialogue blocks other one-shots through
  `game.inDialog` (main.js:731), so a Space that skips a line does not also jump.
- Keys go by physical `e.code`, so a Swedish layout works for WASD. **On-screen hints must name the keys**, and
  KeyM/KeyN/KeyB sit in the same places.
- Test mode (`?test=1`) never locks the pointer, so `look()` is 0 there.

Keep the whole file. Possible additions: map the gamepad `pause` action, and add level-specific actions (for example
`buckle`/`vomitbag` for the flight), either reusing existing ones or adding to `KEYS`/`PAD`.

---

## 5. src/audio.js (201 lines)

Everything is synthesised (WebAudio, no samples). `audio` is a singleton.

**Graph** (`init`, l.19-48):

```
oscillators/noise → sfx(gain 1) ─┐
musicBus(gain 0.32) ─────────────┴→ master(0.7, or 0 when muted) → DynamicsCompressor(threshold -14) → destination
eng:  sawtooth o1 + square o2 → lowpass(Q 4) → eng.g → sfx      (always running, gain 0 when idle)
skid: looping noise → bandpass 1700 Hz Q6 → skid.g → sfx         (always running, gain 0 when idle)
noiseBuf: 1 s of white noise, mono (makeNoise, l.7-12)
```

- `init()` has to run from a user gesture. `game.start()` is the Play click (main.js:148). The headless driver gets
  away without one because of `--autoplay-policy=no-user-gesture-required`.
- It is idempotent and resumes a suspended context. It starts the music if `musicOn`.
- **Every method is a no-op until `init()`.**
- Neither `muted` nor `musicOn` is persisted.

**API**

| member | signature | behaviour |
|---|---|---|
| `muted`, `musicOn`, `ready` | fields / getter | `ready` is `!!ctx` (unused) |
| `init()` | | see above |
| `setMuted(m)` | bool | master gain goes to 0 or 0.7 (τ 0.05) |
| `setMusic(on)` | bool | musicBus goes to 0 or 0.32. Starts the scheduler if it was never started. |
| `duckMusic(amount)` | 0..1 | musicBus = `0.32*amount` (τ 0.3). Called **every frame** by main.js:1084 (0.5 during pursuit). |
| `engine(on, revs, load)` | revs ≈0..1.05 (car.js:247), load = throttle 0..1 | o1 at `38+revs*95` Hz, o2 at half that +1.5, lowpass at `260+revs*900+load*600`, gain `0.035+load*0.04` |
| `skid(amount)` | 0..1 | skid gain `min(0.16, amount*0.16)` |
| `tone(freq, dur, type='square', vol=0.12, slideTo=null, delay=0)` | Hz, s | 10 ms exponential attack, exponential decay to `dur`, optional exponential pitch slide. **`vol` and `slideTo` must be > 0** (exponential ramps). |
| `noise(dur, vol=0.2, freq=1000, type='lowpass', delay=0, q=1)` | | filtered burst from `noiseBuf` at a random offset of 0-0.5 s. **The buffer is not looped, so bursts are capped at about 0.5 s.** |
| `coin()`, `jump()`, `kick()`, `smash()`, `crash(i=1)`, `thud()`, `boing()`, `ouch()`, `splash()`, `door()`, `pickup()`, `squash()`, `checkpoint()`, `tick()` | | presets built from tone and noise (l.101-115). `splash()` is unused. |
| `talk(pitch)` | Hz (character `voice`, 110-540) | 55 ms triangle blip, ±18 % pitch jitter |
| `horn(on)` | held | G4 and B4 square pair (392 + 494 Hz) at gain 0.07. It is created on press and stopped on release, and has to be called with `false` to stop. |
| `jingle(kind)` | `'start' \| 'complete' \| 'fail' \| 'record'` | arpeggios of `[Hz, delay]` (l.130-139). `fail` uses sawtooth notes of 0.3 s. Unknown kinds are a no-op. |
| `shameBell()` | | Bigmouth pursuit bell: 98/196/293 Hz tolling twice |

**Music: how the current tune is composed** (`startMusic`, l.151-175):
- **Tempo and loop:** 132 bpm (`beat = 60/bpm`), 4/4. `prog` is a **4-bar loop of 4-note MIDI chords**:
  `[48,52,55,57] C6`, `[53,57,60,62] F6`, `[48,52,55,58] C7`, `[55,59,62,53] G7`.
- **Bass (walking):** beat `b` of each bar plays `chord[b] - 12`, which walks the chord tones an octave down
  (C2-E2-G2-A2 …). Voice `bassNote(f, t, d)`: triangle wave, 600 Hz lowpass, peak 0.5, length `0.9*beat`.
- **Brushes:**
  - every beat on the swung off-beat `t + 0.66*beat` at 0.04
  - on beats 2 and 4 (`b % 2 === 1`) at 0.07
  - voice `brush(t, v)`: highpassed noise at 5 kHz, 0.12 s decay
- **Keys:** on every second bar, `chord.slice(1)` plus 12 semitones is stabbed together at `beat 1.66` (the swung "and"
  of 2). Voice `keyStab(f, t, v=0.15)`: sine, peak `v*0.5`, 0.35 s decay.
- **Scheduler:** `setInterval(…, 200 ms)` with a **0.6 s lookahead**. It schedules whole bars from `next` (absolute
  `ctx.currentTime`) and keeps going forever. `music` holds the interval id. There is **no stop function and no way
  to change the tune**.

**Writing a new tune.** Keep the `mtof` lookahead scheduler and the voices. Replace `bpm`, `prog` and the per-beat
pattern, and add voices as small functions that all connect to `musicBus` with their own envelopes. To get one tune
per level (the flight versus Gran Canaria), turn the constants into a table and read `tune` at the top of each bar:

```js
const TUNES = {
  // sketch only: straight-eighths "charter schlager" in A minor, Andalusian cadence Am–G–F–E
  sol:   { bpm: 116, swing: 0.5, prog: [[45,57,60,64], [43,55,59,62], [41,53,57,60], [40,52,56,59]] },
  flyg:  { bpm: 92,  swing: 0.5, prog: [...] },   // calmer, for the flight
};
let tune = TUNES.sol;
export function setTune(name) { tune = TUNES[name] || tune; }  // takes effect on the next bar
// in the scheduler: const { bpm, swing, prog } = tune; const beat = 60 / bpm; … offbeat at t + swing*beat
```

**Audio gotchas**
- **Catch-up burst.** While `musicOn` is false the interval returns early but `next` stays where it was. Turning
  music back on, or the tab being throttled in the background, then schedules every missed bar at once and they
  fire immediately. Fix it inside the interval, before the `while`:
  `if (next < ctx.currentTime) next = ctx.currentTime + 0.05;`.
- Bus level 0.32 is hard-coded in three places (l.30, 57, 60).
- **`engine` is car-only in practice.** `main.updateAudio()` (l.1063-1085) calls `audio.engine(false,…)`,
  `skid(0)` and `horn(false)` **every frame** when the player is not driving, and so do `pause()` (l.157-159) and
  `exitCar` (l.394-396). A cabin or jet drone therefore needs its own persistent channel, built like `skid`: a looped
  `noiseBuf` through a lowpass at about 300-500 Hz, plus a low oscillator, with a `drone(level)` setter.
  Pause has to silence it as well.
- `talk()` is called once per two letters by hud.js and 8× by radio toasts (main.js:576).

**Keep vs replace:**
- **Keep:** the graph, `tone`, `noise`, `engine`, `skid`, `horn`, `talk`, the presets and the scheduler skeleton.
- **Replace:** the music content (the comment on l.150 is about "the Duke"), `shameBell` (rename or repurpose for
  Ole's whistle or a cabin alarm), and the jingle `record` kind (Duke's record pickup).
- **Add:** a seatbelt "pling-plong" (for example `tone(659,.5,'sine',.1)` followed by `tone(523,.8,'sine',.1,null,.4)`),
  the cabin drone, and per-level tunes.

---

## 6. src/util.js (33 lines). Pure engine, keep it as is.

| export | signature | notes |
|---|---|---|
| `TAU` | `2π` | |
| `clamp(v, a, b)`, `lerp(a, b, t)` | | |
| `damp(a, b, k, dt)` | | frame-rate independent exponential approach, `1-exp(-k dt)` |
| `wrapAngle(a)` | → (-π, π] | |
| `angleDiff(a, b)` | `wrapAngle(b - a)` | |
| `dampAngle(a, b, k, dt)` | | shortest-arc damp |
| `mulberry32(seed)` | → `() => [0,1)` | seeded RNG (town, peds, models) |
| `pick(arr, r=Math.random)` | | |
| `randRange(a, b, r)` | | unused externally |
| `dist2(ax, az, bx, bz)`, `dist(...)` | | **XZ plane only** |
| `fwdX(yaw)=sin`, `fwdZ(yaw)=cos`, `yawTo(dx, dz)=atan2(dx, dz)` | | the yaw convention: forward is (sin, cos) for +Z-facing models |

---

## 7. index.html (62 lines)

- `lang="en"` (change it to `sv`). `<title>Bigmouth & Run</title>`. Fonts: Google Fonts **Luckiest Guy** and **Nunito
  600/800/900** (l.10). The CSS also asks for weight 700 (`.toast`, `.controls`), which the browser fills with 800.
- The importmap maps `three` and `three/addons/` to `./node_modules/three/...` (l.12-14). That needs an HTTP server and
  a local `npm install`.
- **The DOM contract the JS relies on:**

| id / selector | used at | role |
|---|---|---|
| `#app` | main.js:75 `initGfx(...)` | canvas container |
| `#hud` | hud.js:20 `hud.init()` replaces its innerHTML | every in-game overlay (section 9) |
| `#title` (+`.title-card`, `h1 > .t1 .amp .t2`, `.tag`, `.controls`, `.fine`) | main.js:146 adds `.gone` | title overlay drawn over the live 3D "idle orbit" (main.js:687-696 orbits `lm('birch')`, so **change the orbit target**) |
| `#play` | main.js:139 (enabled when ready), 1128 (click → `game.start()`) | starts with `disabled` |
| `#loading` | main.js:1110-1114 (`setLoading` text / `.done`), 1123 (error text); tools/shot.mjs:47 | loading text, currently English ("Building Bridgeton…" and similar) in main.js:82,89,99,127 |
| `#pause` (+`.pause-card`, `.row`) | main.js:156 toggles `.show` | pause overlay |
| `#resume` | main.js:1129 | |
| `#music` / `#sound` | main.js:1131 / 1132 | the label is rewritten in JS as `Music: on/off` / `Sound: on/off` (**English strings live in main.js**) |
| `#reset` | main.js:1130 | `confirm('Erase your progress and start over?')` (English, main.js) |
| `body.playing` | main.js:147 | makes the HUD visible |

- Bigmouth content to replace:
  - the title, h1 words (`BIGMOUTH` `&` `RUN`) and tagline
  - both controls lists (English, and mentioning kick, stomp and steal cars)
  - the fine print
  - the pause heading "Paused" and the button labels

  The `h1` uses three spans: `.t1` (yellow jiggle), `.amp` (spinning cream "&") and `.t2` (pink jiggle). For example
  `<span class="t1">CHARTER</span><span class="amp">&amp;</span><span class="t2">RUN</span>`.

---

## 8. style.css (156 lines)

- **Tokens** (`:root`, l.1-11): `--ink #1d1426` (also the outline colour), `--purple #8a3ab8`, `--purple-hi #c89aff`,
  `--pink #ff5aa0`, `--yellow #ffd23f`, `--teal #2fb8a8` (unused), `--cream #fff8e6`, `--display` (Luckiest Guy →
  Impact) and `--body` (Nunito). The purple and pink are the Big Mouth palette. For the Canaries you could use ocean
  blue, sun orange or charter-tour orange, and keep `--ink`, `--cream` and `--yellow`.
- **Base** (l.12-18): `html, body` has a background of `#cbe7f6` (**must match the fog and the sky horizon**) and
  `overflow: hidden`. `#app` and its canvas are fixed full-screen. `#hud` is fixed with `pointer-events: none` (so HUD
  elements can't be clicked) and has `opacity: 0` unless `body.playing`. `.outlined` is a text-stroke helper.
- **Sections** (in file order; there is no z-index, so DOM order decides stacking: `#app` < `#hud` < `#title` < `#pause`):
  - l.20-39 **coins & shame**: `#coins` (+`.bump`), `.coin-icon`, `#collect` (+`.show`), `.rec-icon`, `.mos-icon`
    (Bigmouth collectibles), `#shame` (+`.hot`, `.pursuit` with `::after " · RUN!"`), `.shame-label/-bar/-fill/-ticks`
  - l.41-50 **objective**: `#objective` (+`.show`, slides down), `.obj-title/-text/-timer` (+`.urgent`), `.obj-bar`,
    `-fill`, `-label`
  - l.52-62 **minimap & speedo**: `#minimap-wrap` 220², `#minimap`, `.mm-n`, `#speedo` (+`.show`), `.sp-num/-unit/-hp/-hp-fill/-name`
  - l.64-97 **prompts, toasts, banners**:
    - `#prompt` (+`.show`; `b` is a yellow keycap)
    - `#toasts`, `.toast` (+`.out`, `.radio`), `.radio-face`, `.bang`
    - `#banner` (+`.show` and one of `.mission .bad .good .shame .count`), `.banner-main/-sub`
    - `#bubbles`/`.bubble`
    - `#letterbox` (+`.on`, 9 vh bars; `body:has(#letterbox.on)` hides coins, shame, minimap and speedo)
  - l.99-108 **dialogue**: `#dialog` (+`.show`), `.dlg-portrait` (108 px circle) with its `img`, `.dlg-body/-name/-text/-next`
  - l.110-118 `#flash` (+`.go`), `#bigmap` (+`.show`; the canvas background `#6fae4f` is grass), `.bm-legend`,
    `.lg-y/.lg-r/.lg-g`
  - l.120-149 **title & pause**:
    - `#title` (pink-to-purple radial gradient over the 3D view, `.gone` fades it out)
    - `.title-card`, `h1`/`h1 span`, `.t1/.t2/.amp` (jiggle and spin keyframes), `.tag`
    - `.btn` (+`.big`, `.danger`, `:disabled`), `#loading` (+`.done`), `.controls` (two-column grid, `b` yellow), `.fine`
    - `#pause` (+`.show`), `.pause-card` (purple), `.row`
  - l.151-156 `@media (max-width: 700px)` scales down the minimap, shame, coins and banner.
- **Bigmouth-specific to rename or restyle:** `#shame` (the meter itself is the generic Hit & Run "heat" meter, so a
  Charter equivalent could be "PINSAMT" or an Ole-irritation meter), `.rec-icon`, `.mos-icon`, `#banner.shame`, the
  `.lg-*` legend semantics, the title gradient colours and the `.pause-card` purple.

---

## 9. HUD DOM (made by `hud.init()`, hud.js:21-36, not in index.html)

These are the ids the CSS styles. JS keeps references to them.
- `#coins > .coin-icon + #coin-n`
- `#collect`
- `#shame > .shame-label + .shame-bar > .shame-fill + .shame-ticks`
- `#objective > .obj-title, .obj-text, .obj-timer, .obj-bar > .obj-bar-fill + .obj-bar-label`
- `#minimap-wrap > canvas#minimap[220²] + .mm-n`
- `#speedo > .sp-num, .sp-unit("MPH"), .sp-hp > .sp-hp-fill, .sp-name`
- `#prompt`, `#toasts`
- `#banner > .banner-main + .banner-sub`
- `#bubbles`
- `#letterbox > .lb-top + .lb-bot`
- `#dialog > .dlg-portrait > img, .dlg-body > .dlg-name + .dlg-text, .dlg-next("E ▸")`
- `#flash`
- `#bigmap > canvas[760²] + .bm-legend` (English legend: "mission · record · mosquito")

State classes that JS toggles: `.bump`, `.show`, `.hot` (shame > 70), `.pursuit`, `.urgent` (timer < 10 s), `.out`,
`.on`, `.go`, `.gone`, `.done`, `body.playing`, and the banner kinds `mission|bad|good|shame|count`.

HUD calls:
- `hud.showBanner(main, sub, cls, ms=2600)`
- `hud.toast(html, cls)`
- `hud.setPrompt(html)`
- `hud.setObjective({ title, text, timer?, bar?, barColor?, barLabel? })`
- `hud.flashColor(css)`
- `hud.letterbox(on)`
- `hud.showCollect(html)`
- `hud.say(target, text, secs)`, which draws speech bubbles projected through the gfx `camera`

---

## 10. Engine notes for the flight level and for the Canaries

- **Cabin lighting.** The sun shadow (±75 m frustum, from above at +X+Z) shades everything under a fuselage roof
  down to the darkest toon band (about 41 %). Options:
  - build the roof with `toonMesh(geo, { cast: false })`
  - raise `hemi.intensity` and lower `sun.intensity` while on the plane (both are exported)
  - set `sun.castShadow = false` for that level

  Window glass is `MAT.glass`. Don't outline it.
- **Sky and clouds in flight.** Clouds sit at y 150-290 around the camera and `tickSky` forces the group's y to 0. For
  "above the clouds", either put the cabin at y ≈ 300+, or change `tickSky` to take an altitude offset
  (`MAT._clouds.position.y = cloudY`). Below the horizon the sky is a flat horizon colour, which reads as haze. Add a
  large `MAT.water` plane for the sea far below.
- **Fog** 220-760 is irrelevant inside a cabin but matters when looking out of the windows. You can set
  `scene.fog.near/far/color` per level (keep the sky horizon in sync).
- **Turbulence.** camera.js already has `cam.shake` (main.js:514 bumps it). A cabin "rattle" sound is
  `audio.noise(0.3, 0.15, 300)`, and a drone needs the new persistent channel described in section 5.
- **Camera near plane** 0.25 m is fine for an aisle about 0.5 m wide. Camera collision against cabin walls lives in
  camera.js, which is outside this map.
- **Canaries palette suggestions.**
  - sky `top` about `0x2a86e0`, a warm hazy horizon of about `0xf2e4c4` (mirrored in the fog and the body background)
  - `sun` about `0xffe7b8` at 2.8-3.0, `hemi` ground `0xa08060` (volcanic sand)
  - the unused `MAT.water` for the sea and pool

---

## 11. Bigmouth strings and assets inside these six files (checklist)

- index.html:
  - l.2 `lang="en"`, l.5 title
  - l.22-23 h1 and tagline
  - l.26-35 and l.49-56 controls (English, with Bigmouth verbs)
  - l.36 fine print
  - l.42-48 pause labels
- style.css:
  - l.3-5 purple and pink tokens
  - l.20-39 shame and collectible icons (`.rec-icon` vinyl, `.mos-icon` mosquito)
  - l.83 `#banner.shame`
  - l.116 bigmap grass
  - l.122 title gradient
  - l.146 pause-card purple
- gfx.js:
  - sky and fog colours (l.31, 275)
  - `MAT.ghost` (l.65)
  - comment l.237
- audio.js:
  - comments l.1-2, l.150
  - `startMusic` content (l.151-175)
  - `shameBell` (l.140-147)
  - `jingle.record` (l.135)
- input.js and util.js: none.
