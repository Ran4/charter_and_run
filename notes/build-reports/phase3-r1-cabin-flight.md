# Phase 3 · round 1 · fixer "cabin-flight"

Area: cabin/camera/fx (WP-A1) and flight scenery (WP-A2). Files touched: `src/world/cabin.js`,
`src/world/flightScenery.js`, `src/game/camera.js` (`frame`/`frameOne` and the new `openFloor`
flag), `src/main.js` (the `openFloor` flag, the island chatter gate, the mantra auto-bubble, and
`say`/`saying`: the last is one function outside the plan's listed main.js lines, the smallest
place to know whose bubble is up), `tools/scenarios/flight.mjs`, `README.md`, `DESIGN.md`, and,
for the re-measured sprit timer (binding rule: code, §8 table and fixture together), one literal
each in `src/game/missions/flight.js` and `tools/fixtures/full-missions.js`. Port
8870; shots and logs in `<scratchpad>/out-p3-r1-cabin-flight/` (ad-hoc scripts there, not in the
repo: `heads.mjs` head-occlusion probe, `flstory.mjs` = the flight critic's story shot script plus
a bubble audit, `gateframes.mjs` gate framings from three arrival sides, `spawn.mjs` the game's
first talk, `arch.mjs`).

Tree at start: clean (no orphaned work from an earlier fixer).

## Items

| id | verdict | how / why |
|---|---|---|
| flight-1 | **fixed** | Reproduced: a 9 × 9 ray grid over each seated head (`heads.mjs`) found the PSU slab (y 2.09) in front of Ole, Majsan, José (aisle view) and Majsan (16E/16F two-shot), the rail (y 2.11) in front of Siv; shots show the cream plank over every B/E head and the black rail line down Ole's face. `cabin.js`: the rail is gone (the wall already has the cream rack lip at x 2.42–2.45); the service units are one merged mesh of down-facing 0.36 × 0.1 planes (`downMat`, y 2.06), like the racks; the lamps went with them; only the 5 cm orange call button over 14B stays a solid (the objective says "knappen ovanför"; `call14` unchanged). The `cabin` scenario's old check aimed at the chin (n.y + 0.95) and passed with the bug; the triage's n.y + 0.92·height is above a seated head (seated n.y is the cushion), so the new check casts the same 9 × 9 grid over the head mesh from the row-14 aisle view and the 14A/14B and 16E/16F two-shots and fails on any sample covered by cabin geometry over head height inside the walls (cut-away walls excluded). It fails on the old cabin.js (`oldcabin/`: "ole's head is clear of the overhead (aisle: 2 of 13 samples behind y2.09…)") and passes on the new one. §5.3, §16.4. |
| staging-6 | **fixed** | Reproduced from the staging audit (`'Akta tårna!'` inDialog in the landning intro, `'Juice, whisky?'` inDialog in missions 2–4). `stepTrolley`: right after `halt`, the trolley halts while `inDialog`, `inCutaway`, or the runner is in `intro`/`outro`/`failed` (the triage's inDialog/inCutaway plus the 1.6 s gap before an outro, where a stop's 1.6 s bubble hung over the first outro line, and the fail screen). No serving, bubble, bowling or wait countdown meanwhile. `trolley` scenario PASS (bowl, dodge, waits, stower, modes); the flight story with a bubble audit (`fl/`, 21 bubbles) has none in a dialogue, intro or outro. Sprit re-measured (it now starts with the trolley at the park): timer 25 → 22 (see Timers). §5.8. |
| filmFlight-6 | **fixed** | Verified against `notes/research-plot.md:218-219` and HANDOFF §5.5. cabin.js header comment, README "Vad är påhittat?" (new line + the toilet sentence) and DESIGN §1.6 now name the on-board toilet hideout and the galley self-serve juice. |
| staging-18 | **fixed** (bark: narrower than proposed) | Reproduced (audit: chatter with state `outro`; shots: bark over the landning outro, 5–6 bubbles). Cabin chatter: runner `idle` and no dialogue, plus a shared 5 s cooldown (a member due during it skips his turn). Island/gate standing chatter (main.js): `state === 'idle'`. Ole's bark: its timer runs only outside dialogue, in `idle` or an `oleBarks` stage, and a due bark waits while **Ole's own** bubble is up (`game.saying(ole)`), so it never replaces his scripted takeoff line mid-sentence. The proposal also held it during any timeline bubble: the takeoff's bubbles cover t 10–23.6, which would push the bark (+8, due at t ≈ 10) past "Titta, solen!" (−30) and the measured careless-player panic in the takeoff (§8, binding) would go; so it still stacks beside Stig's "Vad är det för ljud?" at t 10 (in character) and Ole's next line replaces it. The mantra auto-bubble goes straight to `hud.say` and waits while any other bubble is up (`game.sayEnd`): it covered the timeline lines and replaced Stig's own "Annars…?!". An aisle walker's "Ursäkta!" is not said in a dialogue (two in the juice outro). The HUD top clamp is hud-6's. §5.9, §5.12, §14.10. |
| flight-6 | **fixed** (4 of the 5 mission-1 scenes; the pocket intro keeps the dollhouse) | Reproduced (hat tops in every mission-1 scene, the sign across Stig at the arch). `camera.js`: `frame`/`frameOne` use the Bigmouth framing when `cam.openFloor` (main, every frame: phase `gate`, focus lx > 14) with `cine.open` → fov 50. Checked with `gateframes.mjs` from three arrival sides: the statistics scene, the arch (kontrollant, Stig in the arch, Ole behind), Berra in the men's room and the bodega tip all show faces at eye level. Two refinements: (1) the 3 m wide landside pocket (lx > 34.5, z < 10.5; the spawn is at lx 35.0) keeps the dollhouse: from the real spawn the side shot stood across the security counters with the arch post over Stig (`spawn/spawn_now`), from the south-east through the arch with the beam over Ole (`gf_B_intro`); (2) two speakers < 0.3 m apart (the story harness warps the player onto Ole's landmark) had a zero side vector, so the eye was in their heads: they are now framed from in front of the first (both modes). §5.3, §14.5. |
| flight-8 | **fixed** | Reproduced (flakes on the toilets' tiles). `stepSnow`: no height test over the bridge and lounge rects; the cabin keeps y < 2.7 (as the triage proposed). `gate_toilet`, `gate_ladies`, `gate_lounge`: clean floors. §5.6. |
| flight-9 | **fixed** (both galley signs) | Reproduced (`NASSYB ERKAB`). Both galley signs turn every frame to the side the camera is on (`rotation.y = camZ > sign z ? 0 : π`; YXZ keeps the up-tilt): `FRÄMRE BYSSAN` was edge-on (a white line) from the eye behind it at the cabin door. `cabin_end_galleyBack`, `fs_stowers`: both read. §5.3. |
| BL-4.3-A2a | **fixed** | Code read: the 70 lumps are in the static `snowfield`, only `runwayTile` scrolls. The lumps are now their own `drifts` mesh, shown in phase `gate` only; the runway tile has 10 low drifts per tile between the plough banks and the forest (|x| 50–78, none at the turn-off), outline-free like the gate's, which scroll with it. The swap happens at the gate → takeoff cut, where the gate set and the runway swap anyway. `peek_takeoff_*`, `phase_takeoff_out`, `seq_a*`. §5.6. |

None rejected, none of the items deferred.

Follow-up from world-town for this area (camera.js, climbing chase eye under a low ceiling with
the player's back to a wall): **deferred** to round 2. It is the on-foot chase rig on the island
(spine's ARM/CAP climb), not the plan's `frame`/`frameOne` branch; sliding the capped climb
sideways or keeping a minimum eye-to-head distance changes every on-foot shot near walls under
roofs and needs spine's eyes-in-solid sweep re-run.

## Checks (all on port 8870)

- `node tools/shot.mjs cabin` with the new head check against the **old** cabin.js (the check
  must catch the bug) → **RESULT: FAIL** (cabin: ole's head is clear of the overhead (aisle: 2 of
  13 samples behind y2.09…)) (`oldcabin/`).
- `node tools/shot.mjs gate cabin trolley turbulence panic flightshots` (first pass) →
  `no errors`, **RESULT: PASS** (`s1/`; sheet `sheet_s1.png`: no planks or rail, both galley
  signs read, no snow in the toilets, the ladies' room or the lounge).
- `PEEK=takeoff:0.5,takeoff:6,takeoff:10.5,climb:2,climb:3.5,approach:2 node tools/shot.mjs phases
  flightseq sceneryPeek` (first pass) → `fps cruise 60`, `no errors`, **RESULT: PASS** (`s2/`).
- `FROM=0 TO=5 SHOTS=1 node tools/shot.mjs story` → `done -> #5`, `landed on the island`,
  `no errors`, **RESULT: PASS** (`st05/`; the flight story has no SHOTS, so the key scenes were
  shot with `flstory.mjs 0 5` → `fl/`, `no errors`, bubble audit: 21 bubbles, none in a dialogue,
  intro or outro; sheets `sheet_fl1.png`, `sheet_fl2.png`).
- `gateframes.mjs` (three arrival sides; `gf/`, sheets `sheet_gfA.png`, `sheet_gfB.png`),
  `spawn.mjs` (`spawn/`), `arch.mjs` → `no errors` (ad-hoc, no RESULT line).
- `SPRIT_RUNS=12 node tools/shot.mjs calibflight` (every case) → `no errors`, **RESULT: PASS**
  (`calf.log`): gate sprint 94.1, walk 97.7, dawdler panics at 5.5; ombord careful max 75.2, walk
  74.4, careless panics at t 21.5; landning careful 17.9 / reverse 19.7, careless panics at t 24.2
  (all as in §8); sprit below.
- Cross-check (not committed): `calibflight` sprit with each run talking at a different point of
  the trolley's loop → **RESULT: PASS** (`calf2.log`).
- Final code: `PEEK=takeoff:0.5,takeoff:6,takeoff:10.5,climb:2 node tools/shot.mjs gate cabin
  trolley turbulence panic flightshots phases flightseq sceneryPeek missions fullstory` →
  `fps cruise 60`, fullstory `done -> #13 idle`, `no errors`, **RESULT: PASS** (`s3.log`, sheet
  `sheet_s3.png`).
- `node tools/shot.mjs story` (with the pocket boundary at lx 35) → `[t] done -> #13 idle stage 5
  coins 7850`, no `scenario failed`, `no errors`, **RESULT: PASS** (`story1.log`). The spawn turned
  out to stand at lx 35.0, on that boundary (`spawn2/`), so the boundary moved to 34.5:
  `spawn.mjs` again → the first talk gets the dollhouse, `no errors` (`sheet_spawn2.png`).
- Final code: `node tools/shot.mjs gate story` → gate passes, `[t] done -> #13 idle stage 5  coins
  7775`, no `scenario failed`, `no errors`, **RESULT: PASS** (`story2.log`).

## Timers

- **8.4 sprit [0]: 25 → 22 s** (flight.js `timer: 22` — one literal in the flight-missions file —,
  the fixture and the §8 table and §8.4). staging-6 freezes the trolley through the sprit intro;
  before, it rolled on from the park to about row 3 while the intro ran, so the stage started with
  it there. `SPRIT_RUNS=12 calibflight` on the final code: runs 3.8 / 4.0 / 29.2 / 8.8 / 8.5 /
  29.8 / 4.0 / 4.1 / 9.8 / 4.2 / 28.2 / 4.2 s, all clean (bowled 0, falls 0), median 6.3,
  **p75 14.4** → T_ref 14.4 + 5 × 0.5 = 16.9 → ceil(1.25 × 16.9) = **22** (Phase 2: p75 17.1 →
  19.6 → 25). Still bimodal: the three 28–30 s runs dodge into a row at t 4.5 and wait about 17 s
  for the trolley, which now starts at the park (z 15.6), to roll past.
- Cross-check: the harness always talks to the stewardess at once, so the trolley stands at one
  point of its loop. A variant that spread 12 runs over the loop (talking 0–56 s after the load;
  not committed) put it at z 13 … −4.4 and gave runs 4.6 – 17.0 s, no 28–30 s mode, **p75 14.9** →
  T_ref 17.4 → 22 as well (6 clean runs alone: p75 15.3 → 23). Its runs with the trolley at z −1.2
  or further aft were not clean: the autopilot walked into a serving (stopped) trolley and was bowled 1–6
  times, because it only dodges a moving one; and the trolley's real loop is longer than the 59 s
  assumed (it reached only z −4.4).
- No other timer touched. Ombord's careful/careless and landning's balance were re-run and match
  §8 (Ole's bark still lands at t ≈ 10 of the takeoff).

## Follow-ups for other areas

- flight-missions / difficulty pass (sprit, `tools/scenarios/calibflight.mjs`): the sprit
  measurement samples one trolley position (the harness talks at once after the load; the intro
  now freezes the trolley at the park). Spreading the runs over the trolley's loop gives a fairer
  p75 but needs the autopilot to dodge a serving (stopped) trolley too, and a measured loop length
  (> 59 s). The stage is bimodal (4–10 s or 28–30 s): its p75 sits between the modes.
- audio-ui-meters (hud-6): the stacked-bubble top clamp is still yours; the cabin now never has
  more than one chatter bubble per 5 s, but a bark, a walker's "Ursäkta!" and the trolley can still
  stack in free play.
- spine / camera (world-town's follow-up, deferred here): the climbing on-foot chase eye under a
  low camera ceiling with the player's back to a wall (`office_back`) ends 0.6 m over his head.
  It is the island chase rig (ARM/CAP), not the dialogue framing this round touched; a sideways
  slide or a minimum eye-to-head distance needs spine's eyes-in-solid sweep re-run.
- spine / camera (Bigmouth `frame`, both levels): `clearSide` tests only the line from the
  speakers' midpoint to the eye, not the eye's sight lines to each speaker, and characters are not
  obstacles: at the gate a seated lounge passenger's head can fill a corner of a two-shot
  (`gf_C_terror.png`), and in the landside pocket the eye stood across the counters with the arch
  post over Stig (why the pocket keeps the dollhouse).
- staging / camera (round 2): the mission-1 intro in the 3 m wide landside pocket still uses the
  dollhouse (hat tops, both speakers visible). A side two-shot has no room there; an
  over-the-shoulder or along-the-pocket framing would need its own rule.
- island-missions / staging: the story harness warps the player onto a scene's landmark, often
  the spot of the NPC he talks to; `frame` now handles speakers < 0.3 m apart (from in front of
  the first), but such shots are still closer than a player's.
