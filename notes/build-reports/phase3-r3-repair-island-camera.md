# Phase 3 · round 3 · repair `repair-island-camera` (step 3/4 of the post-gate repairs)

Start HEAD `5b996be` (repair-island-staging), clean tree, branch `main`. Port 8870. Probes, logs and
shots are in `<scratchpad>/out-p3-r3-repair-island-camera/` (below `OUT/`; `<scratchpad>` is this
session's, `/tmp/claude-1000/…/9db49231-…/scratchpad`):
- copied probes: the island-camera verifier's `v.mjs` (`rotsweep`, `rot`, `closeshots`, `arrive`,
  `outwalks`, `dbg`, `dbg2`) and `probe.mjs`; the island-camera fixer's `jit2.mjs`, `jsum.py`,
  `jcmp.py`, `sweepnear.mjs`; the r3 island critic's `shots.mjs` (with a `SETTLE` option and the
  eye's distance logged);
- new: `rscmp.py` (rotation sweeps side by side on the spots they share, leaving out the 9 straw-parasol
  "mid" spots that put him inside the pole, eye 0.25 m every frame on every run), `arrcmp.py` (walk-in
  logs side by side), `dbg.mjs` (settled eye at 32 yaws with the slide's internals), `walkdump.mjs`
  (one walk, every frame), `sweepnear2.mjs` (close samples tagged with the slide and the ceiling over
  the eye). `dbg.mjs` and `walkdump.mjs` read a temporary `window.__camdbg` line in camera.js that was
  removed before the final runs;
- `ref/`: the verifier's `rs0`/`rs1` rotation sweeps (302d4c2 and HEAD; camera.js is unchanged from
  08c1104 to 5b996be) and the fixer's `fin3` ceiling jitter (HEAD);
- `head/`: a `git archive` of 5b996be for the before shots; `fin/` the final code's runs (`rs`, `jit`,
  `arr`, `ow`, `close`, `close16`); `rs2`/`rs3` the intermediate sweeps; `scen/`, `story/`;
- sheets: `sheet_close_before_after.png` (left: HEAD's frames with the eye under 1 m from the
  verifier's `closeshots`; right: the nearest frame of the same turn on the final code, under 1.7 m),
  `sheet_foldN_dbg.png` (the fold pocket), `sheet_rc3.png` (rows `tonga_arcade`, `st_lawn_wing`,
  `st_lawn_wing_p07`; columns r2, HEAD, final), `sheet_scen.png`.

## Items

- **RC-1 · ugly, regression · fixed** — camera.js, the side slide (§14.5). Verified first: the
  verifier's mechanism holds (`close1.log`/`close2.log`; `dbg.mjs` at the fold): the eased offset passed
  through 0 when the hysteresis swapped sides (lagE: 2.51 → 1.66 → 1.19 → 0.84 …) or when the room clamp
  cut it (porch: 2.49 → 0.02 in a frame) and the other side then grew from 0. Fix, the verifier's
  proposal plus one case it did not cover:
  1. A swap of sides is a cut: when the target's sign differs from the slide's, the slide is set to the
     target and the eye snaps (`snap = true`). Easing stays for growth and decay within one side
     (the walk fix).
  2. The kept side also gives way when it has collapsed and the other side has more room: its room
     0.3 m or less, or the clamp cutting the slide by more than `SLIDE_CUT` 0.5 m this frame.
  3. Wedged (the verifier's reg-2, the fold's crag 1 west end): with the eye 0.1 m or more behind the
     pivot and both sides of it blocked (the slid eye would stay nearer than `ARM`), neither side was
     usable; the slide is then measured from the pivot itself (beside him), straight to the side with
     more room, when that takes the eye further out. At `foldN` (`dbg.mjs`, 32 headings) this turns 3
     of the 5 headings with the eye under 1 m into a 2.6 m side view; that spot's frames under 1 m in
     the rotation sweep 29 → 15.
  Evidence, the verifier's `rotsweep` (one turn at 16 px/frame, every frame logged) on the 456 spots
  the runs share: frames with the eye within 1.0 m of his head 302d4c2 **1** (1 spot) · HEAD **1212**
  (291 spots) · final **15** (1 spot); spots under 0.7 m 0 · 185 · **1**; frames within 1.5 m 2463 ·
  4265 · **1686**; one-frame jumps over 1 m 2669 · 1571 · **1871** (the swaps are cuts now, still
  fewer than 302d4c2); min distance 0.80 · 0.26 · 0.37. The 42 newer café-parasol spots (HEAD only):
  under 1 m 4 → 0. The only spot left is `eN [-260.0,-268.4]`, the fold pocket (known issue below).
  `closeshots` on the verifier's 13 spots plus lagE, lagW, lagS, foldN, thatch: no frame under 1 m but
  foldN's (0.97 m); the nearest frames per turn (`close16`, under 1.7 m) show him whole or a
  three-quarter view (`sheet_close_before_after.png`). The walk fix stands, `jit2` on the final code:
  ceilings 672 walks, jumps over 1 m **1** (the SUPERMERCADO drop, as on HEAD), over 0.5 m 12 (12),
  sideways jumps **0** walks (0), frames within 1.5 m 1048 in 37 walks (1053 in 37); streets 96 walks:
  no jump over 1 m, no sideways jump, max 0.56 (as HEAD). Walk-ins (`arrive`, 68): identical to HEAD
  except `arcadecafe_y90` (RC-2). Walk-outs (`outwalks`, 292): eye inside a slab 216 frames in 107
  walks, 0 close frames (as base and HEAD).
- **RC-2 · ugly, minor · fixed** — camera.js. `walkdump` showed it is not a pole: he starts with the
  eye on the 1.6 m climb straight over him (a pole behind), and 5 frames in he walks under a
  `parasoll` prop whose `underOnly` canopy starts to cap the eye: it drops 1.3 m and the slide then
  eased in from 0 (0.52 m, 0.90 m). Fix: a slide that starts as the eye is cut in by more than 1 m
  relative to him (new `cam.lpx/lpy/lpz`, last frame's pivot) starts at its target. The jump is
  measured relative to him: an absolute test fired at the SunTrip balcony rows (`c66`/`c67 alongS`,
  `c105 along*`), where a collision push moves him 1 m in one frame, and turned their eased slide into
  4 new sideways jumps. Evidence: `arcadecafe_y90` min 0.52 → **1.47** m (the climb he starts in;
  302d4c2 1.40), frames within 1.5 m 9 → 5; the rotation sweep's 18 straw-parasol edge spots (one
  frame at 0.75 m each with the swap fix alone, `rs2`) → none.
- **RC-3 · check · not covered by RC-1, numbers reported (known issue)** — re-shot on the final code
  (`shots.mjs`, settled 30 frames; `sheet_rc3.png`): `tonga_arcade` eye 1.72 m from his head, the
  same spot on r2, HEAD and final: under La Medina's arcade the ceiling is at 3.6 m, 1.35 m above the
  eye, so the eye is neither capped nor near a ceiling; it is the plain 1.6 m `ARM` pull-in, his back
  1.5 m from the wall, the player whole with his hair at the frame's top edge. `st_lawn_wing` 2.15 m,
  the player whole; at pitch 0.7 the slide gives a three-quarter view (2.46 m; r2 looked down over his
  head). `sweepnear` (the critic's blocks, settled rig): low eyes (< 2.6 m) within 1.8 m of the head
  58 / 129 / 61 / 10 / 89 / 63 (HEAD 58 / 131 / 65 / 10 / 91 / 63), median 1.58–1.75 m; 0, 0, 0, 0, 1, 0
  of them have a ceiling within 0.5 m above the eye. So the close band is Bigmouth's 1.6 m arm with
  his back to a wall, outside the slide's trigger by design; making the slide act there would be a
  redesign of the generic pull-in, not this round.

Timers: no collider, route, stage or autopilot changed; the camera offset does not move the walker
(it steers the camera yaw, not the eye offset). No re-measure, no ledger entry, the fixture is
untouched.

## Checks

- `node --check src/game/camera.js`.
- Rotation sweep, ceiling and street jitter, walk-ins, walk-outs, freeze frames on the final code
  (numbers above; `fin/`).
- `walk drive aerial views islandtour smash foot skandal perf` (`scen.log`): `no errors`,
  **RESULT: PASS** (skandal "round the building: reached 4.7 m (direct) inWall 0"; perf worst
  `island plaza` 60 fps, update 1.89 ms).
- `story` (`story.log`): `[t] done -> #13 idle stage 5  coins 7800`, no `scenario failed`,
  `no errors`, **RESULT: PASS**.
- Not run: `fullstory kinds missions` (no mission data or stage kind touched), `calibrate` (no
  timed route touched).

## Follow-ups and known issues

- The fold's NW pocket (local (−20, −27.94): the back wall 0.36 m north, crag 1's west end 0.9 m
  east). Looking SW (about 30° of yaw), every spot behind him or beside him is within 0.5 m of a
  solid, from the eye and from the pivot alike, so the eye sits 0.37–0.97 m from his head. On 302d4c2
  it stood inside the rock. Only a view from in front of him would do; not a chase-camera rule.
- The close band outside the trigger (RC-3): the generic 1.6 m `ARM` with his back to a wall
  (`tonga_arcade`, the `sweepnear` counts above), unchanged since r2.
- Turning the camera now cuts from one shoulder to the other where the r3 code eased through his
  head: one-frame jumps over 1 m in the rotation sweep 1571 → 1871 (302d4c2 2669).
- Unchanged from HEAD: the 1.03 m SUPERMERCADO drop (a pole and the cap on one frame); the walk-outs'
  216 eye-in-slab frames (the same on 302d4c2); `st_row`'s eye straight over his head on the climb
  when he stands in the balcony row's corner (the same on 302d4c2).
