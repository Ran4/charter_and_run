# Phase 3 · round 3 · fixer `flight-look`

Start HEAD `ded3575` (fixer 1/4 flight-flow), clean tree, branch `main`. Port 8870. Probes, logs and
shots in `<scratchpad>/out-p3-r3-fix-flight-look/`:
- `fl.mjs` (`markers`: beacon, beam and guide arrow at every flight stage start and up the aisle,
  distances and screen boxes; `turb`: the warning and the prompt in sprit, the juice carry and idle;
  `post`: camera and facing offsets from the guide when a timed stage starts after a dialogue),
  `before/` (HEAD) and `after/`;
- `stork.mjs` (gate [7]: `MODE=cands` candidate stagings with the staging critic's line measure,
  `MODE=real` every line after real arrivals: the queue's guide from the men's room, and warps
  north, south, west and east of the cluster), `cands/`, `cands2/`, `real_before/`, `real_after/`;
- `board.mjs` (boarding arrow-follower from Stig's new spot), `hud.mjs` (stacked bubbles' tails;
  toasts vs the speedo under UPPDRAG KLART!), run against a `git archive HEAD` copy for `hud_before/`;
- sheets `sheet_markers1/2.png`, `sheet_turb_post.png`, `sheet_cands1/2.png`, `sheet_stork.png`,
  `sheet_bubbles_zoom.png`, `sheet_storyshots.png`.

## Items

- **r3flight-7 + r3text-1 · ugly · fixed** — main.js `updateMarkers`, markers.js. The objective
  Beacon's beam fades between 8 and 4 m of horizontal eye distance while the target is inside the
  cabin (`Beacon.fadeBeam`, the r2 rule of the giver's beam; one `nearFade` for both), and the
  Beacon's arrow is hidden in the whole flight level. Measured before: the arrow bobs 4.5 m up, and
  under the flight level's steep eye it was above the frame at every gate and cabin stage start
  beyond ~7 m (gate [1] [3] [6] [8], up the aisle at 15/12/9 m) and nearer a block clipped by the
  top edge over 90 000–227 000 px² (10–25 % of 1280×720: ombord's dash start and retry, juice,
  sprit, landning). The beam at ombord's dash start was 3.5 m from the eye (0.22 opacity, ~40 % of
  the frame); after 5.9 m → 0.105 (the camera now faces the guide), retry 5.0 m → 0.057, juice
  0.026–0.068, sprit 0.087, landning [1] 0. **The GuideArrow is not hidden** (a different fix from
  the critics'): it is 3.9–4.8 m from the eye everywhere in the flight level, so a 5.5 m rule hides
  it in the whole level, and it is the only marker that points at a target off screen. The
  "clipped yellow block" both critics attributed to it is the Beacon's arrow: r3text's
  `arrows_nobeaconarrow` set `beacon.arrow.visible = false` for one frame, and `updateMarkers` set it
  back before the screenshot (my screen boxes: the block is the Beacon arrow's, the guide arrow sits
  at the top centre, partly under the objective card, unchanged). Island unchanged (the arrow shows
  there). §5.3.
- **r3flight-6 · ugly · fixed** — cabin.js, main.js `updateHud`, style.css. While a mission stage
  runs, the turbulence warning is a toast `TURBULENS!` (cls `alert`: Luckiest Guy, red, red left
  edge) instead of the mid-screen banner; idle turbulence keeps the banner. `Håll i dig!` now comes
  before the seat/toilet/car prompts while the cabin shakes and he stands without holding on (only
  a giver's talk prompt is first; E still uses the nearest interactable). Before/after: sprit
  (aisle by row 15) banner over Stig and the aisle → toast at the right; juice carry prompt "E Sätt
  dig" → "SPACE Håll i dig!"; idle → banner, as before (`sheet_turb_post.png`). §5.7 step 1, §11.4.
- **r3flight-5 · ugly · fixed** — flight.js gate [7], cabin.js landmark `loungeCam` (24.4, 13.8,
  yaw −0.6), fixture. Berra, Robban and Sulan stand in an arc (each turned halfway between the lens
  and the group's middle), Stig side-on at the left turned to them, cut `{ at: 'loungeCam', dist: 0,
  height: 1.9 }` from south-east of the cluster, with the gate desk and Herr/Fru Storch behind them
  (9 candidates tried: `cands*/`; the critic's south-east idea, k5). Before (real arrivals): the
  queue's guide walked the follower into the middle of the cluster, and the open-floor two-shot
  looked across the security area with the speakers 29–34 px at the frame's edges, Berra behind the
  kontrollant (`real_before/`); the critic's run had Stig in front of Sulan. After: every arrival
  (queue guide, north, south, west, east) gives the same frame on all 12 lines: Robban 91 px, Berra
  86 px, Sulan 126 px, facing 0.62–1.0, no occluder (`real_after/`, `sheet_stork.png`). Boarding
  from Stig's spot with the arrow-follower: walk 6.25 s, sprint 4.37 s, never stuck (it passes
  between Robban and Berra). §8.1 [7], §5.5, Appendix A.
- **voices-ui-cast follow-ups · ugly · fixed** — hud.js `tickBubbles`, style.css. (a) A bubble
  stacked above another (or held on screen at an edge) gets cls `lead` and a longer slanted tail
  (`--tx --tl --ta`) from its bottom edge to where a plain tail ends over its speaker's head; older
  bubbles are on top (z-index inside `#bubbles`, now `isolation: isolate`, so the banner's
  z-index 2 still wins) and the tail runs behind the bubble below. Before (HEAD copy): the stacked
  bubble's tail tip was 72 px (on foot), 43 px (14A/14B) and 48 px (sedan) above Ole's head, pointing
  into Stig's bubble; after: 9 px, as every plain tail (`hud_*/`, `sheet_bubbles_zoom.png`, and the
  takeoff's "Landingshjulene…" over "Vad är det för ljud?" in the story shots). (b) Under a wide
  banner with the speedo up only the newest two live toasts show (CSS `:nth-last-child(n+3 of
  .toast:not(.out))`, Chrome 143 / Firefox 156 support it); the rest come back after the banner.
  Before: three 2–3-line radio toasts under UPPDRAG KLART! ended at y 598, 35 px into the speedo
  (top 563; r2 measured 13 px with shorter ones); after: two shown, 0 px, three again after. §11.4,
  §14.8 HUD additions.
- **flight-flow follow-up (r3) · ugly · fixed** — runner.js. `faceGuide()` (the retry's code, now
  shared) and `faceTimedGuide()`: a **timed** stage that starts after the intro (`begin`) or after a
  stage that played a framed dialogue (`g.inDialog` seen while it ran: a scene, interact lines)
  turns him and the camera to its guide on foot; a car or an untimed stage keeps the camera.
  Offsets (camera vs guide) before → after: gate dash 168° → 0, ombord seat dash 121° → 0, sprit
  90° → 0, landning round-up 89° → 0, friskotek 93° → 0, grisfest flowers 179° → 0, julafton 46°
  → 0, fataga sheep 43° → 10°, Tonga 160° → 26° (the last two: `routeAim` along the road vs the
  straight line my probe measures). The gate's statistics retry (a scene) now also starts the dash
  facing the guide (flight-flow noted 79° off). Untimed stages after scenes (gate queue, boarding)
  keep the camera, as the brief scoped it. §9.4 items 2–3.

## Timers

No timer changed. Only yaws change at a stage start, never a position, and the walk follows the
camera (`fixedStep` wish vector), which every autopilot sets itself. `calibflight` (full, default
env) on the final code: gate 3.6 → 6 (fear 70.2 → 95.7, walk 5.1, dawdler PANIK at 5.2 s), ombord
3.1 → 7, sprit 7.6/6.4/6.12/7.62/7.6 (CALF CHECK inside 12–13), landning 7.6 → 12 and 3.2 → 5,
**RESULT: PASS**. Its five sprit sweeps are in the ledger (`r3fl-C`; same stage and sweeper code):
pool `sweeper-r2fm/b69c64e` n 61, median 7.40, p75 7.60 → **13** (90 % range 13–13); §8 table,
§8.4, flight.js header and the ledger summary say n 61.

## Checks (final code)

- `node --check` on every changed js file: OK.
- `gate cabin flightshots turbulence trolley ui talk`: no errors, **RESULT: PASS**.
- `fullstory kinds missions`: `[t] done -> #13 idle`, no errors, **RESULT: PASS**.
- `panic skandal api levels transition`: no errors, **RESULT: PASS**.
- `calibflight`: **RESULT: PASS** (above).
- `FROM=0 TO=5 SHOTS=1 story`: `done -> #5`, no errors, **RESULT: PASS** (`sheet_storyshots.png`:
  the new Stork staging in `fl_gate_swahn` / `fl_gate_bodega`, no beacon block in the cabin shots).
- `story`: `[t] done -> #13 idle`, no `scenario failed`, no errors, **RESULT: PASS**.

## Follow-ups and known issues

- The GuideArrow in the flight level sits at the top centre, partly under the objective card
  (3.9–4.8 m from the eye; it has since Phase 0). Kept as the only off-screen direction cue; a lower
  flight-level placement would be a design change, not a round-3 fix.
- Untimed stages that start after a scene keep the camera's yaw (gate queue after Berra's scene,
  boarding after the Stork scene); the guide arrow shows the way.
- The Beacon's beam in the gate lounge stays at full opacity (the giver's beam rule is cabin-only
  too); no finding reported a lounge wedge.
- For critics' probes: a marker's `visible` set from outside is overwritten by `updateMarkers` on
  the next frame; hide it for a shot with a per-frame hook (`g.onFrame`), not once.
