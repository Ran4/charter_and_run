# P1 H hand-off: audio, UI, meters (DESIGN §11, §12, §13.4, §7 polish)

Worktree `/home/ran/src/html/everything_and_run/.wt/charter-H`, branch `p1-H` (from tag `phase0`).
Commits: `1c77430` and `f14f922` ("P1 H: …"). Port 8868.
Screenshots: `/tmp/claude-1000/-home-ran-src-html-everything-and-run-charter-and-run--sallskapsresan/25b591af-d9e9-4102-8669-08768ad2e553/scratchpad/out-H`
(contact sheets `sheet_H_ui.png` and `sheet_H_skandal.png`).

## Files changed (all owned)
- `src/audio.js`: rewritten. It has every tune, the trad cues, the SFX recipes, the drone, the siren and a test hook.
- `src/game/shame.js`: PANIK deferral (dialogue **or cutaway**), officer route steering, unstick sidestep, porter-bribe hideout, witness toast polish, bust radio, siren distance, PANIK visuals.
- `src/game/hud.js`: big-map label layout without collisions, a cartouche, the cabin big map turned so the nose points up, meter visuals with caching, `hud.panic()`, the vignette, siren lights, portrait ring through `--ring`, the minimap hidden during dialogue, a centred rim badge, no per-frame allocation in `tickBubbles`.
- `style.css`: rewritten with the §13.4 tokens. Covers the title card, the pause card, the HUD, the meters, and the banner classes `mission good bad count skandal multa fear`.
- `index.html`: the §11.1 title (Shrikhand logo with an `&` on a spinning sun disc, subtitle, line, tagline, controls card in two columns, fine print) and the §11.3 pause.
- `src/strings.js`: added `mapTitleIsland`, `mapTitleFlight`, `mapTitleGate`, `noMap` (§5.11 fallback), `morningAfter`, `morningAfterSub`, `endCardMain`, `endCardSub` [F].
- `src/meters.js`: `skandal.bustRadio`, `hideouts[0].cooldown: 60`, `witnessToast.say: 'Lite film.'` [F*].
- `tools/scenarios/meter.mjs`: new scenarios `ui` and `skandal`.

## Done

### §12 Music and sound
**Tunes** (`registerTune`; `setTune` switches at the next bar). All original material:
- `muzak`: 92 bpm bossa, Dmaj7–Bm7–Em7–A7. Sine pad, bossa bass, triangle comping, rim clave, brushed hats, and a sine chime phrase in bars 0–1 and 4–5 of every 8.
- `sol`: 116 bpm, A minor Andalusian cadence Am–G–F–E. An original 8-bar accordion phrase (detuned square pair, 5 Hz tremolo, low-passed), off-beat accordion chords, timple triangle arpeggios, congas (220→170 / 330→250), root–fifth bass. The lead rests 8 bars in every 32.
- `skandal`: 132 bpm 2/4 paso doble, Am Am E7 E7 Am Dm E7 E7. Bass on 1, filtered-saw brass stabs on 2, a brass fanfare lead, and a snare roll into the turnaround.
- `vals`: 3/4 at 150 bpm, C–G7–G7–C / F–C–G7–C. Oom-pah-pah with an accordion lead.
- `jul`: `sol` re-voiced in A major (A–E7/G#–F#m–E, melody mapped C→C#, F→F#, G→G#), with sleigh bells on every eighth.
- `samba`: 100 bpm, Dm7–G7–Cmaj7–A7. Surdo (60→45 Hz) strong on 2 and 4, tamborim 16ths, agogô hi/lo, cavaquinho chops, bass, and a whistle-like lead in 4 of every 8 bars.

**Trad cues** (`audio.trad(name, {vol})`): `smaGrodorna`, `hejTomtegubbar`, `helanGar` (faint, vol 0.55 by default).
- Each is an accordion melody with an oom-pah under it, on its own bus.
- The music bus ducks to 0.3 while one plays and then recovers.
- A trad cue respects the mute and the music toggle, and returns its length.
- **The melodies are written from memory. Someone with a musical ear should check them in Phase 3.** They are PD tunes, so any faithful variant is legal; the only risk is a wrong note.

**SFX**: every §12.3 recipe, as specified:
- `chime`: 659 then 523 Hz sine, plus a faint octave.
- `pling`: 1300 Hz.
- `dingdong`.
- `beep`: 880 Hz square ×3.
- `applause(secs)`: about 30 claps per second, swelling then thinning out.
- `heartbeat`: lub-dub with a pitch drop.
- `rattle`: plus clinks.
- `flush`: a sweep 2 kHz → 300 Hz over 1.2 s.
- `squeak`: 900 → 1400 Hz.
- `laugh`: 8 formant bursts.
- `knock`, `slap`, `doorSlam`.
- `ambulance`: 960/770 Hz fading in and out over 4 s.
- `baa`: 420 → 300 Hz with vibrato.
- `oink`.
- Jingles `start`, `complete`, `fail`, `pryl` polished. New helper `sweep()`.

**Drone**:
- Noise through a low-pass 300→900 Hz, with a slow LFO.
- A 45 Hz saw through its own low-pass.
- A faint turbine whine that rises with `bright`.
- Gain `level·0.08`.

**Siren**:
- Two-tone 650/500 Hz square alternating every 0.45 s, scheduled on the audio clock, low-passed with a slight vibrato.
- Gain 0.05. New `audio.sirenNear(d)` drops it to 0.02 when every pursuer is far away; shame.js calls it.

**Per-frame safety**:
- `duckMusic`, `setMusicLowpass` and `setMeter`/`setFear` only touch Web Audio or the DOM when the value changes.
- `setTune(current)` cancels a pending switch.

**Test hook**: `audio.level()` returns `{ rms, state, tune }` (analyser on master).

### §11 / §13.4 UI
- **Title**: brochure card (cream, ink border, stripe header in terracotta/orange/sun, tag "SunTrip · Julresa 1979 · Nueva Estocolmo"), logo `CHARTER & RUN` in Shrikhand on one line, Luckiest Guy subtitle *Sällskapsresan*, the line, the [F] tagline, SPELA / Laddar…, the controls card in two columns with keycaps, the fine print. The background is the halftone dot grid over `radial-gradient(#f7a21b55, #1c7fb8cc)`.
- **Pause**: `--sea` card with a Shrikhand "Paus".
- **HUD**:
  - Pesetas coin.
  - Meter with an icon: FLYGRÄDSLA has a beating heart whose rate follows `--fear`; SKANDAL has a Guardia lamp that flashes in a pursuit.
  - The fill gradient is stretched over the whole bar, so its colour says the value. The hot zone is hatched; `¡ALTO!` is the pursuit suffix.
  - Objective and dialogue cards carry the brochure stripe. Prompt keycaps, toasts (`radio`, `witness` with a camera icon), and the `.mm-n` pill (N/FRAM).
- **Meter visuals**:
  - FLYGRÄDSLA vignette: opacity rises from 45 % fear, plus a heartbeat pulse layer at ≥ 70 (`body.fear-hot`).
  - PANIK: `hud.panic(secs)` turns on `body.panik`, which gives tunnel vision, a shaking banner and an over-saturated canvas.
  - Pursuit: `body.pursuit` flashes blue lamps in the top corners, alternating with the siren.
  - ¡MULTA!: banner cls `multa`, a red double-border rubber stamp over a lined fine ticket.
  - `skandal` banner in red and gold; `fear` banner in red with a wobble.
- **Big map**: greedy label placement with no overlaps. The most crowded labels go first. Each label tries a ring of spots around its landmark, avoids other dots and the canvas edge, and falls back to a 14 px font. A label set off its landmark gets a leader line to the dot. The layout is cached per label set. Markers and the player are drawn over the labels. A cartouche shows `NUEVA ESTOCOLMO · GRAN CANARIA` / `SOL-VIKING SE-SOL` / `ARLANDA · GATE 8`. The cabin (FRAM) map is turned half a turn so the nose points up.
  - Result: island 23 labels and flight 5 labels, 0 overlaps.
  - This fixes VIKING BAR/TONGA TONGA, MARKNAD/TEMPLO, HOTELL SUNTRIP/CENTRO NÓRDICO and BUNGALOWEN.
- **Dialogue**: the ring colour comes from the `--ring` CSS variable, set from `def.ring`, and changes per speaker. The minimap, speedo and prompt fade out while someone talks (`body.in-dialog`), because the dialogue box sits over the minimap.

### §7 polish (shame.js)
- **PANIK deferral** now holds while `g.inDialog || g.inCutaway` (`shame.inScene`). This fixes the audit finding. The scenario checks: under `cutTo`, v is clamped at 95, deferred, and there is no PANIK for 30 frames; after `endCut`, PANIK fires.
- **Officer `routeAim` steering**:
  - He walks straight at the player when the line between them is clear (`segmentBlocked`).
  - Otherwise he follows a route: the visible corner of his own cell → a staircase of intersections → the kerb point nearest the player → the player. The route is string-pulled to the furthest visible waypoint and replanned 4 times a second, with no per-frame allocation.
  - An unstick sidestep (less than 0.5 m of progress in 1 s → 0.8 s along the wall, alternating sides) sits under the Phase 0 stuck teleport, which is kept as the safety net.
- **Siren polish**: see §12 above. `sirenNear()` is called every pursuit frame.
- **Porter-bribe hideout (P1)**:
  - A priority-100 interactable at `flamencoRecepcion` (r 2.6), registered by `configure()`. It is enabled only during a pursuit, on foot, not frozen, and outside the cooldown.
  - E pays through `game.pay(500)` (Ole pays if the purse is short) and clears the meter.
  - It ends the pursuit without the escape banner. The porter's bubble shows the [F*] line, followed by the `PORTIERN TITTADE BORT` banner, a coin sound and the complete jingle.
  - Cooldown 60 s.
- **Witness toast (P1)**: cls `witness`. Herr Storch says "Lite film." [F*] and gets the `film` anim flag for 2.4 s. The offence still adds 0 inside the cooldown.
- **Bust**: `multa` banner and `audio.slap()`. P1 flavour: radio `lasse` "Friskotek i morgon bitti, Olsson!" [N] after the freeze, island only (`METERS.skandal.bustRadio`).

## P1 left / cut
- Nothing cut.
- The tune "feel" is not verified by ear; nothing can be heard headless. What was verified: every tune and every trad cue produces signal (RMS > 0.004, AudioContext running), and the actual playing tune switches to the requested name. Phase 3 should listen once, especially to the three trad melodies, which are written from memory.

## Self-checks (my last runs, PORT=8868, OUT=out-H)
- `node --check` on every tracked `.js`/`.mjs` in the worktree → no failures (printed only `checked`).
- `node tools/shot.mjs title ui skandal` → last lines:
  - ui: `[t] island labels 23 []` · `[t] tunes rms {"muzak":"0.018 running/muzak","sol":"0.035 running/sol","skandal":"0.020 running/skandal","vals":"0.023 running/vals","jul":"0.033 running/jul","samba":"0.026 running/samba"}` · `[t] trad {"smaGrodorna":"14.9s 0.058","hejTomtegubbar":"13.4s 0.068","helanGar":"18.9s 0.056"}` · `[t] flight labels 5 []` · `[t] panik {"panic":true,"cls":true,"banner":"PANIK!"}`
  - skandal: `[t] officer walk 29.6 -> 18.6 direct inWall 0` · `[t] round the building: reached 5.1 m (direct) inWall 0` · `[t] stuck officer at 40 m -> teleported true` · `[t] bust {"coins":1600,…,"main":"¡MULTA!","sub":"Guardia Civil tog 400 pesetas i böter","cls":"show multa"…}` · `[t] witness {"v":10,"toast":"Ingen fara: linsskyddet sitter på.","film":true}` · `[t] bribed {"pursuit":false,"coins":1100,"v":0,"main":"PORTIERN TITTADE BORT","cd":59.8}` · `[t] cutaway {"v":95,"panic":false,"deferred":true,"cut":true} panic during cut false` · `[t] PANIK fired after the cutaway`
  - `no errors` · `RESULT: PASS`
- `node tools/shot.mjs api` → `[t] bust {"coins":1600,"frozen":true}` · `[t] save {…}` · `no errors` · `RESULT: PASS`
- Regression check, run once: `node tools/shot.mjs story` (with `ui`) → `[t] done -> #13 idle stage 3  coins 7675` · `no errors` · `RESULT: PASS`
- Ownership check prints only `node_modules`, like the other packages. That is the orchestrator's untracked symlink: `.gitignore`'s `node_modules/` does not match a symlink. It is not committed, and no other path falls outside H.txt.

## CONTRACT CHANGES (all additive)
1. **audio.js**:
   - New `audio.sirenNear(d)`.
   - New `audio.trad(name, { vol })`, which returns its length in seconds.
   - New `audio.sweep(dur, vol, f0, f1, type, q, delay)`.
   - New `audio.level()` (test hook).
   - New export `TRAD_NAMES`.
   - Tune `bar()` also gets `API.snare/accordion/chime/pad/conga/pluck/brass/surdo/agogo/sleigh/flute`.
   - `setTune(name)` with the current tune now cancels a pending switch, which makes `music: { tune, secs }` reverts exact.
2. **hud.js**:
   - New `hud.panic(secs)`.
   - New `hud.labelLayout` (read by `ui`).
   - New `body` classes `pursuit`, `panik`, `in-dialog`.
   - Banner classes `multa` and `fear`; toast class `witness`.
   - New HUD elements `#vignette`, `#sirenlights`, `#panik`.
3. **shame.js**: new getter `shame.inScene`, `hideoutT`, `steer` and `teleports` (debug counter). The hideout interactable id is `hideout:<lm>`.
4. **meters.js**: `skandal.bustRadio`, `hideouts[].cooldown`, `witnessToast.say`.
5. **strings.js**: new keys `mapTitleIsland mapTitleFlight mapTitleGate noMap morningAfter morningAfterSub endCardMain endCardSub`. A1 can use `S.noMap` for the §5.11 fallback; Phase 2 can use the end-card keys for the Rio card.
6. **Proposed, not applied (frozen file)**: `.gitignore` `node_modules/` → `node_modules`, so the worktree symlink is ignored and the ownership check prints nothing. C2 proposed the same.
7. **Note for Phase 2 (main.js, frozen)**: `pause()` returns early in test mode, so the `ui` scenario shows `#pause` by hand. Nothing to change.

## Notes for next agents
- The officer test in `skandal` parks the Land Rovers and sets `shame.forced = true`. Without that, the chase cars run the on-foot player over and the test becomes non-deterministic.
- The big-map label layout is cached on the label set plus the crop. A landmark that moves after the first map open, for example when a Phase 2 merge changes the landmark table, gets a new layout automatically because the key includes the coordinates.
- Big-map labels are drawn at 17 px, or 14 px when crowded, on the 760 px canvas. With the merged real blocks the anchors stay the same (landmarks), so the layout should stay collision-free. `ui` asserts it.
