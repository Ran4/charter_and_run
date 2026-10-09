# Phase 3, round 2, fixer `flight-missions`

Repo: /home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan (main), port 8870.
Start: `5ff11c4`, tree clean. Scratch output (probes, logs, shots):
`<scratchpad>/out-p3-r2-fix-flight-missions/` (`probe.mjs` + `scen.mjs` = the staging critic's line
audit with real-arrival scenarios and page-only candidate patches added: `ombordReal`, `landReal`,
`ombordCand`, `bridgeCand`; `ray.mjs` = what crosses the ombord aft shot; `p5_arrow.mjs` = the
playtest critic's naive arrow-follower, also from the placed dash start; `before/` = HEAD,
`after1/`, `after2/` = the fixes; `c1`–`c4`, `b1`, `b2` = candidates).

All nine items were verified first on HEAD (shots/probe) and fixed; none rejected or deferred.
Three fixes differ from the critics' proposals: the ombord intro (item 2), the bridge outro (item
3) and the dash guide (item 7); see below.

## Items

### staging-5 + flight-1 · ugly · fixed — the gate intro in the landside pocket
Before (`before/lines/m00_001…005`, real spawn, E at once): TOPDOWN 56–59°, two hat tops.
Fix (staging's verified recipe, moved 0.5 m east): the first intro line's cue places Ole and Stig
side by side across the pocket (`gateQueue` dz 1.2 / −0.2, facing each other) and cuts to the new
landmark `queueCam` (36.1, 1.2, yaw 0, height 2.0), held to the end of the intro. The critic's
spots put Stig at lx 34.9, 0.45 m inside the tray counter (it ends at 35.0; radius 0.36), so both
moved 0.5 m east and the camera with them. After (`after1/lines/r000…r004`): both in profile at
eye level, 66–75 px, facing 0.13, nothing near the lens, the arch sign at the right.

### flight-2 · ugly · fixed (different fix) — the ombord intro
Before (`before/lines/m01_001…008`, from the door and from row 1): TOPDOWN 55–58°, her back,
Stig's hair under the door frame (OCC). The critic's idea (Stig in the aisle at row 1, a camera
looking forward from row 2) fails: the galley curtain rail runs across the cabin at y 2.24, which
is head height for the 2.59 m Stig, so from any aft eye-level camera it crossed both faces
(`c1`, `c2`; `ray.mjs` found it). A camera forward of the rail looking aft sees the parked trolley
(`c1` O4). Fix: stage it forward of the rail at the open door: she by the coat closet, Stig just
in, facing each other along the cabin and turned 20° to the lens (`cabinDoor` offsets), and a
cut from the new `doorCam` (−1.2, 14.2, yaw π/2, height 2.0) over the galley worktop, looking
across with the door and the jet bridge between them (`c4` O13). After: 126–146 px, facing 0.55,
no occluder. The seat dash now starts at (1.6, 13.55): re-measured (below), timer unchanged.

### staging-8 + flight-3(b) · ugly · fixed (different fix) — the jet-bridge outro
Spine's `frame` fix had turned the faces to the lens, but the shot was still steep and Stig was
behind the door wall (before: TOPDOWN 54/70, OCC world). Staging suggested moving the scene to the
gate desk; that would teleport Stig 17 m back after he has boarded, and leave him in the lounge for
mission 2. Instead: on the bridge, Stig and Majsan face each other across the tube, Siv between
them 1.2 m further up, all turned a little to an eye-level camera at the plane end looking up the
bridge to the `GATE 8` sign (new `bridgeCam` (3.7, 14.7, yaw π/2, height 1.9), `outroPlace`
offsets from `bridge`; `bridgeQueue1/2` removed, nothing else used them). Candidates `b1` (terminal
end looking at the door: small, Siv on Majsan) and `b2`. After (real walk down the bridge,
`after1/lines/r034…r036`): Majsan 118 px, Stig 141 px, Siv 86 px, facing 0.51/0.51/0.88, no occluder.

### staging-3 · ugly · fixed — the gate statistics on a real arrival
Before (walk from the arch side to Ole, `before/lines/m00_008`): NEAR npc:jose (his head across the
bottom of the frame). Fix (staging's verified recipe): `place: { stig: ['gateOle', -2.0, 0.2, -1.47] }`
(the calibflight dash start, (25.0, 11.6)) and `cam: { at: 'statsCam', dist: 0, height: 1.9 }`,
new landmark `statsCam` (24.0, 6.8, yaw 0). After (`after1/lines/r007…r015`): Ole 71 px facing 0.7,
Stig 84 px in profile (0.1), nothing near the lens, José only in the background. Dash re-measured:
unchanged (below).

### staging-6 · ugly · fixed — the landning stewardess off screen
Before: OFFSCREEN, 16 m behind the lens. Fix (staging's recipe): `cut: { at: 'galleyCam', dist: 0,
height: 3.6 }` on her line, new landmark `galleyCam` (0, 8.6, yaw 0). After: in frame, 69 px,
facing 0.96. The cut showed three cabin coins along the aisle (the line's first at z 11.6, the
front galley's (−0.3, 14.2) and (0.3, 15.6)); they moved, as cabin-flight did for `row22Cam` (§5.2),
to the free side of dodge rows 8, 18 and 20 (not row 12: the coin magnet reaches 3.4 m, and the
`panic` checks count coins in 14B). After the move (`after2/lines/r052…`): no coin in the cut.

### staging-12 · ugly · fixed — Stig never turned to Berra in the men's room
Before (real walk-in): both faced the same way, Stig's back to Berra. Fix (staging's recipe):
`stig: ['herrtoa', 0, 0, -1.9]` in the scene's `place`. After (real walk-in, `after1/lines/r016…r021`):
Berra 0.26, Stig 0.28, in profile facing each other, 96–110 px.

### playtest-1 · bug · fixed (different fix) — the gate dash's guide arrow into the wall
Before: an arrow-follower failed 2 of 2, pinned on the men's door jamb (playtest `p5`). A single
corridor waypoint (the critic's proposal) was not enough: from the dash start every straight line
north-east crosses the middle bench row, and the follower slid along it and ran out of fear-time
(`arrow` first run). Fix: a stage decorator `via(st, ['herrtoaGang', 'herrtoaDoor'])` in
missions/flight.js: the target (beacon and arrow) leads past the bench row's east end (new landmark
`herrtoaGang` (27.9, 12.2)), then to the men's door, then in; a waypoint is passed within 1.5 m or
once the player is nearer the next point than it is. The waypoint carries the stage's own target
as `goal`, and level.js `resetSpot` judges R against it (otherwise R in the terminal would have
moved him to the lounge, nearer the men's room). After: from the placed dash start the follower
arrives in 3.90 / 3.92 s at fear 97 (2 of 2). `FLIGHT=gate,ombord calibflight`: gate sprint 3.6 s,
walk 5.11 s, fear 68.9 → 94.4, dawdler panics at 5.5 s: unchanged, timer 6.

### playtest-4 + flight-4 · bug · fixed — the dead turbulence cues
Verified: sprit's cue sat at 20 s against the 11 s timer; landning's round-up cue at 12 s fired
on the frame its 12 s timer failed (timed cues run on scaled stage time, the timers on real time,
so only test mode saw either). Fix, as playtest proposed:
- **Sprit**: `timedCues: [[1.5, { turbulence: [0.5, 3] }], [8, PA]]`: warned at 1.5 s, shaking
  3.0–6.0 s, three jolts that kick the bottles, so every sweep meets it. First the `calibflight`
  sweeper was changed to hold Space only once the shaking starts (`cabin.turbulent` also covers
  the 1.5 s warning, where a held player stands still). Then `FLIGHT=sprit SPRIT_RUNS=36
  calibflight`: 36 clean sweeps (no panic, none bowled, no fall), 5.5–7.8 s, median 7.4, p75 7.6
  → T_ref 10.1 → timer **13** (was 11; `CALF CHECK`: 90 % range 13–13). FLYGRÄDSLA for the careful
  sweeper peaks 12.0–17.1 (mean 15.9), far from 70. Updated: flight.js (timer, cue, stage comment,
  header comment incl. the FLYGRÄDSLA note), the §8 table row, §8.4 (literal; the "Open" note
  replaced), the §8 FLYGRÄDSLA paragraph, §16.4 (sweeper), the fixture, README's sprit line.
- **Landning**: the round-up cue is dropped (the approach is the mission's turbulence); comment,
  §8.5 literal and fixture. No re-measure needed for the drop: the clean round-up (7.6 s) never
  reached the cue; the final `calibflight` confirms 7.6 / 6.9 s, timer 12.

### film-5 · factual · fixed — tags
Ole's "Eneste svenske byene jeg kjenner til…" `[F]` → `[F](t)` (code, §8.2, fixture). The five
flight titles carry `// title [F*]` (Jag kan flyga…, Mer juice, Medhavd sprit) or `// title [N]`
(Rad 13 finns inte, Inflygning Las Palmas), in code and fixture; §1.4 says so. The header
comment's stale sprit timer is replaced.

## Checks

- `node --check` on every changed file: ok.
- `gate cabin flightshots`: `no errors`, **RESULT: PASS**.
- `fullstory kinds missions`: `[t] done -> #13 idle stage 5`, `no errors`, **RESULT: PASS** (the data
  checks resolve every new landmark through `cut`, `cam`, `outroCam` and `place`).
- `FLIGHT=gate,ombord calibflight`: gate sprint 3.6 s, walk 5.11 s, fear 68.9 → 94.4, dawdler
  PANIK at 5.5 s (timer 6, unchanged); ombord from the new door spot sprint 3.10 s, walk 4.40 s →
  T_ref 5.1, timer 7 (unchanged; §8 table updated: 3.1 + 4 × 0.5, 56 % / 37 %), careful peak 75.6,
  careless PANIK at 21.7; **RESULT: PASS**.
- `FLIGHT=sprit SPRIT_RUNS=36 calibflight`: as above, **RESULT: PASS**.
- `calibflight` (full, default env, at the end): every row matches the shipped timer (gate 6,
  ombord 7, sprit 13 "shipped 13 s OK; 90 % range 12–13 (n 5) inside", landning 12 / 5, round-up
  7.6 / 6.9 s, back 1.3 / 3.2 s); careful players never panic, careless ones do in missions 1, 2
  and 5; **RESULT: PASS**.
- Line audit (staging's `audit.mjs`, story missions 0–4, 87 lines, `no errors`): every mission-1
  line, the ombord intro and the landning stewardess are in frame with no TOPDOWN, OCC, BACK or
  OFFSCREEN flag; the story's warp arrivals give the same numbers as the real arrivals. The flags
  left are the seated cabin dollhouse two-shots and the bodiless PA voices (by design, §5.3).
- Real-arrival probe (`after2/`, `probe.mjs SCEN=gate,ombordReal,landReal`): as listed per item.
- Naive arrow-follower (`p5_arrow.mjs`): from the placed dash start 3.90 / 3.92 s, arrives.
- Film critic's `tags.mjs`: no untagged line in missions/flight.js; `drift.mjs`: identical to the
  critic's baseline (no new code/fixture/DESIGN drift).
- `SHOTS=1 story`: `[t] done -> #13 idle stage 5  coins 7725`, no `scenario failed`, `no errors`,
  **RESULT: PASS**. (A first run died at island mission #9's start on a puppeteer "Attempted to use
  detached Frame" with 6 GB free, a harness flake spine also met; the rerun was clean.) Shots looked
  at: gate intro, statistics, men's room, bridge outro, ombord intro, landning (`sheet_story.jpg`).

## Samples

Sprit bottle sweep (`calibflight` sprit, timeScale 1, timer disabled by the autopilot; seconds,
FLYGRÄDSLA peak in brackets). Sweeper: the r1-repair sweeper (waits in the aisle 2.4 m from a
moving trolley, 1.7 m from a stopped one; steps into a free row only in turbulence) plus the r2
change: Space held only while the turbulence shakes, not through its warning. Every run clean (no
panic, never bowled, no fall).

1. `FLIGHT=sprit SPRIT_RUNS=36`, code: 5ff11c4 + this group's uncommitted changes, stage literal
   `timedCues [[1.5, {turbulence: [0.5, 3]}], [8, PA]]` (timer field still 11; the autopilot sets
   the stage timer to 400 s). Two cabin-coin moves landed mid-sample (coins only add money; no
   effect on the sweep). 36 runs: 7.62 (16.8) 7.62 (16.7) 7.5 (16.4) 6.9 (15) 6.7 (14.5) 7.22 (15.7)
   7.02 (15.2) 7.4 (16.2) 6.9 (14.9) 7 (15.2) 6.9 (15) 7.6 (16.7) 7.4 (16.2) 7.8 (17.1) 7 (15.2)
   7.12 (15.5) 7 (15.2) 7.4 (16.2) 7.4 (16.1) 7 (15.3) 7.6 (16.7) 7.2 (15.7) 7.5 (16.4) 7.4 (16.2)
   7.6 (16.7) 7.6 (16.7) 7.42 (16.2) 7.5 (16.5) 7.6 (16.7) 7.7 (16.9) 7.62 (16.8) 5.5 (12)
   5.72 (12.3) 7.6 (16.8) 7.6 (16.7) 7.72 (17). Median 7.4, p75 7.6 → T_ref 10.1 → timer 13
   (90 % range 13–13).
2. Full `calibflight` (default `SPRIT_RUNS` 5) on the final code (timer 13): 7.0 (15.2) 6.5 (13.9)
   5.7 (12.2) 7.2 (15.7) 7.2 (15.7). p75 7.2 → 13 at that n; 90 % range 12–13; shipped 13 inside.

Earlier sprit samples (the 48 runs behind timer 11, r1 repair) had no turbulence in the stage and
do not pool with these.

## Follow-ups for other groups

- **spine / flight (new, not fixed)**: ombord's 7 s seat dash has the same guide problem in the
  cabin. The arrow aims straight at 14B, and an arrow-follower (playtest `p5_arrow.mjs`, which also
  presses E on "Ursäkta") sticks on the row-1 seats at (1.4–1.5, 12.4) for the whole 7 s and fails
  2 of 2. It did so on HEAD from (0.8, 13.2) and does from the new door spot (1.6, 13.55); not a
  regression. The same `via` decorator with an aisle waypoint at row 1 (then `cabinRow14`) would
  fix it; the stowers in the aisle need a check.
- **island-missions (film-4)**: §1.4 now gives the title tag format (`// title [F*]` / `// title [N]`);
  the island titles are still untagged.
- **spine (optional)**: staging-12's general alternative (a `scene` with `frame` turns an unplaced
  standing player to `frame[0]`) is still open; the men's room is fixed with data.
- **harness**: the first story run's "detached Frame" at the start of ropavieja (island #9) with
  6 GB free.
