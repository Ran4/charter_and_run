# Phase 3 · round 3 · repair `repair2-island-camera` (step 1/5 of the last repair steps)

Start HEAD `4887ede` (r3 ledger), clean tree, branch `main`. Port 8870. Probes, logs and shots are in
`<scratchpad>/out-p3-r3-repair2-island-camera/` (below `OUT/`; `<scratchpad>` is this session's,
`/tmp/claude-1000/…/9db49231-…/scratchpad`). Only `src/game/camera.js` changed, with DESIGN §14.5 and
the changelog.

Probes:
- copied from verifier 2's OUT: `v2.mjs` (`rotsweep2`, `rotlist`, `walkturn`, `strafe`,
  `strafeshot`; `analyse2`: bounces = a > 1 m relative eye jump followed within 8 frames by a roughly
  opposite one, swaps = slide sign changes, rapid = two swaps within 15 frames), `cmp2.py`, `v.mjs`
  (`arrive`), `jit2.mjs`, `jsum.py`, `jcmp.py`, `arrcmp.py`, `probe.mjs`;
- new: `d2.mjs` (one turn or walk, every frame with the slide's internals), `var.mjs` (A/B of rule
  variants in one browser: `vturn`, `vstrafe`, `vsweep`), `vcmp.py`, `vdiff.py`, `fmt.py`, `jit2v.mjs`,
  `seq.mjs` (frame-by-frame shots of one turn: the game is paused after camera update k). `d2`, `var`
  and `jit2v` read a temporary `globalThis.__camopt` / `__camdbg` switch that turned every rule on and
  off; it is not in the commit (kept as `OUT/camera.debug.js`; `OUT/dbgtree/` is 4887ede with it);
- `head/`: `git archive 4887ede` for the before shots and HEAD's slow turns.

HEAD below means verifier 2's runs on 4887ede (`rsA`, `rsB`, `slA`, `rlA`, `wtA`, `sfA`, `jit`, `arr`,
`arr2A`: camera.js is byte-identical) and base = 302d4c2 (`rsD`, `slB`, `rlB`, `wtB`, `sfB`, `arr2B`),
compared with the same scripts; "final" is this commit's camera.js (`OUT/rs`, `rl`, `rl6`, `rsB`, `sl`,
`wt`, `sf`, `jit`, `arr`, `arr2`). Base has no slide state, so its swaps and rapid swaps are 0 by
construction; flicks (bounces) are the comparable number.

## Items

- **C1 · wedge flicker at fold_mid · fixed** — verified first (`d2` at (−260, −266.7), 16 px/frame):
  the room right of the eye fell 2.37 → 0.96 in 0.25 m samples while the eye's base moved with the
  pull-in, so `eh² + best² < ARM²` held on frames 8 and 10 and failed on 9 and 11: four cuts in four
  frames (2.58 / 1.43 / 2.58 / 1.66 of slide), as the verifier said. The verifier's band alone (stay
  wedged until the slid eye would be `ARM` + 0.3 out) fixed the fast turn but the wedged side then
  flipped on `r0 >= l0` (a 5 m cut, frame 15), and on a slow, steep turn the band was still crossed
  twice, because the pull-in's steps moved the eye's base by more than 0.3 m. Final rule: once wedged
  it stays so for `SLIDE_HOLD` 0.3 s (`cam.wedgeT`) and then until the slid eye would be `ARM` + 0.3 m
  out, and the wedged side is kept unless the other has `SLIDE_HYST` more room or this one 0.3 m or
  less. The verifier's other proposal (2 frames before entering) was worse: 16 new flicks at the fold's NW
  pocket, where the wedge is needed, and 2 rapid swaps at fold_mid (`OUT/v1`). Evidence (flicks at fold_mid):
  named-spot turns (`rotlist`, 6 turns) HEAD 18 → **1** (base 0); full sweep 4 → 1; slow, steep sweep
  3 → **0**; slow turns the other way (`rl6`, 6 px/frame) 6 → **0**. The one left is the fast turn at
  pitch 0.3: a cut out to the side view and, 8 frames later, the swap to the other shoulder (not back),
  `sheet_fold_mid.jpg` (top HEAD, frames 7–11, 15, 16: close behind / side / close / side / close;
  bottom final: one side view held through frame 15, then the left shoulder).
- **C2 · side ping-pong at the notice-board gap (+ review 2 R2) · fixed** — verified (`d2` at
  (−22.2, −76)): the eye cut in to the right shoulder (0.96 m of room) and one frame later swapped to the
  left by `SLIDE_HYST` (the left side's room went 0 → 2.6 m as the pull-in moved the eye's base), then
  the left collapsed 11 frames later and it swapped back; the 3.8–5.0 m cuts 4 frames apart in the
  verifier's freeze log are the same pattern. Fix (both of the verifier's and review 2's proposals,
  measured): a side is held `SLIDE_HOLD` 0.3 s (`cam.slideT`, from when the slide took it) before the
  other may take over with `SLIDE_HYST` more; sooner only when this side has collapsed: 0.3 m or less,
  or cut this frame by more than `SLIDE_CUT` (now 0.2 m, one room sample; was 0.5) so far that the slid
  eye comes within new `NEAR` 1.2 m (level) of the pivot, with `SLIDE_HYST`/2 more room on the other
  side. Rejected variants (`OUT/v4`–`v6`): the hold alone left the eye 0.80–0.94 m from his head at the
  bungalow awning's end (c129, the side held while the turn cut it); a hold overridden on a predicted
  eye distance missed the disc push (0.84 m at the notice board); the urgent cut at `ARM` (1.6) or 1.35
  brought the ping-pong back (rapid 5); zeroing the slide when the eye goes far out (to stop the slid
  far eye meeting the board) brought it back too (rapid 7). Evidence, final vs HEAD (base):
  - `rotlist` 114 turns: rapid swaps 7 at 5 → **0**, flicks 61 → **41** (33), one-frame jumps > 1 m
    358 → 333, eye within 1 m 146 → 136 frames (foldN only; base 0);
  - full rotation sweep, 507 spots, 16 px/frame, pitch 0.3 (456 shared with base): eye within 1 m
    **15 at 1 spot** (the fold's NW pocket, unchanged; base 1), one-frame jumps > 1 m 1876 → **1867**
    (2666; the fixer's 1871), flicks 42 at 25 → **33 at 23** (37 at 27), rapid 0, within 1.5 m 1692 →
    1741 (2465); all 498 non-pole spots: 15 at 1, jumps 1958 → 1945, flicks 56 → 47;
  - reverse sweep (−16 px, 253 spots): within 1 m 0 → 0, jumps 990 → 988, flicks 15 → 14, rapid 0;
  - slow, steep sweep (6 px, pitch 0.7, 67 spots): within 1 m 39 at 1 → 39 at 1 (the pocket), jumps
    188 → 185, flicks 13 → 10 (11), rapid 0;
  - `sheet_notice.jpg` (frames 12, 13, 17, 18, 21, 24; top HEAD, bottom final): HEAD's left-shoulder
    eye stands behind the board with him hidden behind its sign (13, 17, 21); the final eye stays on his
    right, him whole, 1.16–1.26 m from his head (closer: the trade of the hold).
- **C3 · strafe residual · fixed** — verified (`d2`, verifier's `ssA.log`): at the lagenhet canopies
  and La Medina the slide was 0.01 / −0.16 when the eye was cut in, so `slide === 0` missed; at the
  bungalow awning the cap dropped the eye 0.95 m and the slide eased in with the eye 0.72 m from his
  head. Fix: the cut-in start tests `|slide| < 0.3`, and a growing slide whose eased eye would come
  within new `CLOSE` 1.0 m of the pivot where its target's would not goes straight to its target. The
  verifier proposed ~1.2 m: measured, that turned the eased slide into 2.6 m sideways cuts in the
  ceiling `jitter` walks (the SunTrip balcony rows c66/c67 and the porch at (−64, −239), eye 1.1–1.2 m
  over his head; 4 jumps over 1 m and 2 sideways walks in 254), so it is 1.0. Evidence: `strafe` 184
  walks, eye within 1 m 6 frames at 5 walks → **0** (base 0), min 0.72 → **1.11** m (1.37), within
  1.5 m 414 → 327 (332), jumps > 1 m 313 → 314; walk + turn 376 walks: within 1 m 0 → 0, jumps 660 →
  653, flicks 127 → 124 (144), rapid 0; `sheet_strafe.jpg` (each walk's nearest frame; top HEAD: over
  his head at the awning, him hidden by a parasol at the lagenhet canopy, his shirt at La Medina 0.99 m;
  bottom final: 1.20, 2.59, 1.50 m).

Acceptance, on the final code:
- the walk fix kept: `jit2` 672 ceiling walks: jumps > 1 m **1** (the SUPERMERCADO 1.03 m, as HEAD),
  > 0.5 m 12 (12), sideways-jump walks **0** (0), within 1.5 m 1054 frames in 37 walks (1058 in 37).
  The run's last JSON write hit a full disk (ENOSPC, the machine's disk, not this OUT): the first 600
  walks were recovered from the truncated file and the remaining ceilings re-run (`FROMC=161`,
  `jit2/`); merged `jit/jit-final.json`, all 672 matched to HEAD's;
- RC-2's café walk-in `arcadecafe_y90` **1.47 m** (as HEAD; base 1.40); the 68 walk-ins identical to
  HEAD but one frame within 1.5 m (50 → 51); the 16 café-table walk-ins identical (min 1.32, eye
  within 1 m 0). (A first walk-in run while the disk was full logged WebGL shader-validation errors with
  the same numbers; re-run clean, 0 errors.)

Timers: no collider, route, stage or autopilot changed, and the camera offset does not steer the
walker (it follows the camera yaw, not the eye): no re-measure, no `calibrate`, no ledger entry, the
fixture is untouched.

## Checks

- `node --check src/game/camera.js`.
- `walk drive aerial views islandtour smash foot skandal perf` (`scen.log`): `no errors`, **RESULT:
  PASS** (skandal "round the building: reached 4.7 m (direct) inWall 0"; perf worst `island spawn` 59
  fps). A first run with the disk full logged 323 WebGL shader-validation errors from the first scene
  on (`scen_diskfull.log`, stopped); a walk-only retry was clean, and the full run above used
  `__GL_SHADER_DISK_CACHE=0` (the NVIDIA shader disk cache off for this process; the game unchanged).
- `story` (`story.log`): `[t] done -> #13 idle stage 5  coins 7725`, no `scenario failed`, `no
  errors`, **RESULT: PASS**. A first run in the same disk-full window completed every mission (done ->
  #13 idle, no scenario failed) but logged 1308 WebGL shader-validation errors (`story_gpufail1.log`,
  RESULT: FAIL on console errors); the re-run a few minutes later was clean.
- Not run: `fullstory kinds missions` (no mission data or stage kind touched), `calibrate` (no timed
  route touched).
- Shots looked at: `sheet_fold_mid.jpg`, `sheet_notice.jpg`, `sheet_strafe.jpg`, `sheet_scen.jpg`.

Raw runs on the final code (OUT): `rs/` (507 spots), `rl/` (114 turns), `rl6/` + `rl6H/` (38 slow
turns, final and HEAD), `rsB/`, `sl/`, `wt/`, `sf/`, `jit/` + `jit2/`, `arr.log`, `arr2.log`, `seqA/`,
`seqB/`, `ssA/`, `ssB/`, `scen/`, `story/`. The first acceptance pass, before the wedge hold
(`old1/`), and the variant A/B runs (`v1`–`v8`, `dbg*`) are kept for reference.

## Follow-ups and known issues

- The fold's NW pocket (local (−20, −27.94)): unchanged, 15 frames within 1 m per fast turn and 39
  per slow one, min 0.34 m (his shirt and shoulder). Every spot behind or beside him is within 0.5 m of
  a solid; verifier 2's suggestion (fade or hide the player mesh within ~0.8 m of the eye) is a new
  rendering rule, not this round.
- The notice-board gap: the eye still goes in and out as the sight line crosses the board's posts
  (flicks 18 in 6 turns there, base 8: the far eye keeps the easing slide and the stand-off push snaps
  it), and the right shoulder is now kept 1.16–1.26 m from his head. On a slow turn the other way
  (6 px/frame, not in the verifier's set) the eye can still take the other side (cut in from far out,
  or at the hold's end) 8–11 frames before that side collapses: 2 rapid pairs in 38 slow turns (HEAD
  0 there; HEAD 7 / final 0 in the verifier's 114).
- Fold_mid's remaining fast-turn flick (side view, then the other shoulder 8 frames later).
- Unchanged: the close band outside the trigger (RC-3, `tonga_arcade`), the 1.03 m SUPERMERCADO drop.
- Environment: the machine's disk was full (4 MB–300 MB free) from about 17:40 on, filled by other
  processes; headless Chrome then logged WebGL shader-validation errors and `ERR_INSUFFICIENT_RESOURCES`.
  Agents running checks later may see the same; re-run before reading a FAIL as a regression.
