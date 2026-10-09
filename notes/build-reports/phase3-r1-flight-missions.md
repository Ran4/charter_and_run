# Phase 3 · round 1 · fixer "flight-missions"

Area: the flight missions (WP-F content, indices 0–4). Files touched: `src/game/missions/flight.js`,
`src/content/flight.js`, `src/world/cabin.js` (one LANDMARKS entry, `row22Cam`),
`src/actors/models.js` (Ole's `flygRadio` outfit, and one seated branch in `heldPose`'s `boombox`
case: outside the plan's "outfit only", see flight-5), `tools/fixtures/full-missions.js`,
`tools/story/flight.mjs` (SHOTS support), `DESIGN.md`. Port 8870; shots and logs in
`<scratchpad>/out-p3-r1-flight-missions/` (ad-hoc scripts there, not in the repo: `fmcheck.mjs`
plays M[0..4] and shoots every changed scene plus a landning stage-0 retry, `archprobe*.mjs` camera
and cast positions at "Kolla terroristen!" with candidate Berra spots, `boxprobe.mjs` Ole seated
with the boombox).

Tree at start: clean (no orphaned work from an earlier fixer).

## Items

| id | verdict | how / why |
|---|---|---|
| flight-2 | **fixed** | Reproduced (code: hud.runDialog fires a line's cue as the line starts; baseline shot `m00_022_berra` empty). The `place` cue left "Nej, vem fan gör det?" and became the men's-room scene's `doneCue` (Berra goes to the lounge when the scene ends, at the camera cut). `fl_gate_vemfan.png`: Berra in shot for the punchline. §8.1, fixture. |
| flight-5 | **fixed** (plus a seated pose) | Reproduced (no `held` in `flyg`). Ole outfit `flygRadio` = `flyg` + `held: 'boombox'`, set by a cue on the sprit outro's first line (Berra's, which cuts to row 22, so the swap is off screen); `placeNpcs(true)` after the mission gives him `flyg` again (checked: `outfit flyg` once idle). Seated, the boombox hung from his hand into 14B's seat cushion (`box/box_a_close.png`: only the handle showed), so `heldPose` got a seated branch: the box lies on his lap across his thighs, speakers to the front, his right hand on it (`box_b_close.png`, and in the outro frame `fl_sprit_kvarts.png`). Only Ole's `arlanda` (standing) and `flygRadio` hold a boombox; `castsheet` PASS. §2.2, §8.4, fixture. |
| filmFlight-3 | **fixed** | Verified (bark at gateQueue idle; random `OLE_STATS`). `Det blir nok litt luftlommer underveis. Helt normalt!` [N] and `Concorde flyr tre ganger så fort som en geværkule!` [F*], as proposed; the other six lines work on the ground. §14.10 (with a note that the flight tables play at the gate too). |
| playtest-7 | **fixed** (text only) | Verified (`sprintSecs: 1.0`, one fail text). Objective `Bär juicen till 14B – gå, spring inte!` [N]. No per-cause fail text: the objective now says it before the run and on every retry, and a `sprintText` option would be a change to spine's kinds/flight.js for little gain. §8.3, fixture. |
| playtest-14 | **fixed** | Reproduced with `fmcheck.mjs`: seatbelt first play `true`, after the fail `false`, retry (no intro) now `true` (before the fix the stage-0 `startCue` never lit it). Stage 0 `startCue` adds `seatbelt: true`; a no-op on first play (the chime only plays off → on). The round-up's T_ref was measured with the sign lit, so no timer change. §8.5, fixture. |
| flight-3 | **fixed** | Verified (`timeline` bar = t / secs). `barLabel: 'STARTEN'` (`fl_ombord_takeoff.png`). §8.2, fixture. |
| filmFlight-1 | **fixed** (differently) | Verified against research-plot.md:209. The cup goes up on Ole's "Ja." (`anim cupUp`, 6 s). The proposal also kept a 1 s `cupUp` on the press; shot with it (`c1/`), the press's off-timer fired after "Ja." had raised the cup and dropped it under "Nei…!" (test-mode lines are quicker than 1 s; a fast reader too). The press now plays only the `pling` (in the film Ole presses the button). `fl_juice_cup.png`: arm up on "Nei…!". §8.3, fixture. |
| filmFlight-2 | **fixed** | Verified (`CHATTER_FLIGHT` plays at the gate desk and in the cabin before takeoff). The line is gone from `CHATTER_FLIGHT.angerud`; the trolley's row-6 stop (cabin.js) and mission 3's `rowSixComplaint` keep it. §14.10. |
| filmFlight-4 | **fixed** | Verified against research-plot.md:162, :195, :200. `(t)` on "Vad ska de göra?", "Vad är det för ljud?" (t 10) and "Hva er det for et merke du har?". With this, the HANDOFF §4.5 "lines lacking (t)" item is closed (the takeoff and Concorde lines were tagged in Phase 2). §8.1, §8.2, fixture. |
| filmFlight-5 | **fixed** | Verified (research-characters.md:173, research-plot.md:168). Retagged `[F*]`: Ole's "Kræsj." (our bokmål echo) and Berra's "Robban! Sulan har varit…" ("Robban!" kept: it shows the player whom Berra tells, a §5.5 film trap). §8.1, fixture. |
| playtest-18 | **fixed** (current numbers) | The header was stale twice over: cabin-flight re-measured sprit this round. It now reads "bottles p75 14.4 s of 12 runs + 2.5 -> 22 (Phase 3 r1 …)", matching §8's table (the triage's "17.1 … -> 25" is the Phase 2 value). |
| staging-15 | **fixed** (plus the sprit intro) | Reproduced (baseline shots `m03_034`, `m04_009/010`, `m03_030`). Cabin landmark `row22Cam: [0, -9.2, π]`; `ROW22 = { at: 'row22Cam', dist: 0, height: 3.6 }` as the `cut` on Berra's line in the sprit outro and the landning outro, `cut: null` on the next line not at row 22 (Stig's, Ole's; Robban's landning answer stays in the cut). The item's "what" also named the sprit intro (Berra cut off at the frame edge, back turned): his "Ta det vackert…" cuts there too, `cut: null` on the stewardess's next line. Shots `fl_sprit_berra`, `fl_sprit_nykter`, `fl_landning_tomater`, `fl_landning_skarpning`: both faces from the front. §5.5, §8.4, §8.5, fixture. |
| staging-25 | **fixed** (another spot) | Reproduced. The proposed spot (`gateArch` −1.2, −2.6 = local (35.6, 3.8)) hides Berra behind Stig in the arch's side two-shot (`archprobe`: camera at (27.3, 11.0) looking south-east; Berra at −41°, Stig at −47°). Probed three more spots with the story's arch position and a real player's landside one (34.15, 5.3, the dollhouse frame): `gateArch` −0.4, −2.8 = (35.8, 4.6) shows his face right of the arch post in the side shot and at the top right of the dollhouse shot, and stays 1.5 m off the walk from Ole to the arch (−1.2/−2.6 and 0.6/−2.5 would stand in it). Stage 0 `startCue` places him there; stage 5 moves him on. Not on the toilet-dash route (z 11.8 → 26), so no calibflight. `fl_gate_terrorist.png`. §8.1, fixture. |
| playtest-16 | **fixed** | Verified (`promptSit` "E Sätt dig"). `Gå till Ole vid gate 8` [N]. §8.1, fixture. |

None rejected.

Follow-ups from earlier fixers this round, for this area:
- cabin-flight → flight-missions / difficulty pass (sprit measured at a single trolley position,
  bimodal): **deferred** to the difficulty pass. It is harness work in
  `tools/scenarios/calibflight.mjs` (not this group's file): the autopilot must also dodge a
  serving (stopped) trolley and the loop length must be measured before runs can be spread over the
  loop. The shipped 22 s follows the binding rule on the harness's start state, and cabin-flight's
  uncommitted spread variant gave 22 as well.

## Checks (all on port 8870)

- `fmcheck.mjs 0 5` (ad-hoc, first code) → `done -> #5 idle`, `no errors` (no RESULT line;
  `c1/`, sheets `sheet1–3.png`, `sheet_cup*.png`, `sheet_box.png`): found the cup race
  (filmFlight-1) and the hidden Berra (staging-25); landning `seatbelt: first play true failed false
  retry {"belt":true,"stageI":0}`.
- `archprobe*.mjs` (ad-hoc) → `no errors` (`arch/`, `arch4/`, `sheet_arch.png`, `sheet_arch4.png`).
- `boxprobe.mjs a|b` (ad-hoc) → `no errors` (`box/`, `sheet_box_a.png`, `sheet_box_b.png`).
- `FROM=0 TO=5 node tools/shot.mjs fullstory` → `done -> #5 idle`, `no errors`, **RESULT: PASS**
  (`fullstory.log`).
- `node tools/shot.mjs kinds missions` → `no errors`, **RESULT: PASS** (`sc1.log`; the data checks
  resolve `row22Cam` in the `cut` cues of the shipped missions and the fixture).
- `node tools/shot.mjs gate cabin` → `no errors`, **RESULT: PASS** (`sc2.log`).
- `FROM=0 TO=5 SHOTS=1 node tools/shot.mjs story` → `done -> #5 idle`, `landed on the island`,
  `no errors`, **RESULT: PASS** (`shots.log`; 21 `fl_*.png`, sheets `sheet_story1–3.png`).
- `node tools/shot.mjs castsheet` (after the `heldPose` change) → `no errors`, **RESULT: PASS**
  (`cast.log`).
- Final code: `node tools/shot.mjs story` → `[t] done -> #13 idle stage 5  coins 7900`, no
  `scenario failed`, `no errors`, **RESULT: PASS** (`story1.log`).

## Timers

None changed or re-measured. No route, car, stage start or world solid on a timed path moved:
Berra's new arch spot is landside, off the toilet-dash route; the landning round-up was measured
with the sign lit, which a retry now matches; the rest are texts, tags, cues and cameras.

## Follow-ups for other areas

- spine (main.js `cue.anim`): the off-timer of an `anim` cue clears the flag unconditionally, so a
  second cue on the same flag before the first's timer ends is cut short (the juice cup on the
  press and on "Ja."; avoided here by dropping the first). A per-flag token would let content
  overlap them.
- cabin/camera (as cabin-flight reported, `gf_C_terror`): the arch's side two-shot still has a
  seated lounge passenger's face filling the bottom-left corner (a bust at local (26.8, 7.2), 4 m
  from the lens; `fl_gate_shoe.png`, `fl_gate_terrorist.png`). And a real player presses E at the
  arch from the landside (lx ≈ 34.2): that gets the dollhouse with the `SÄKERHETSKONTROLL` sign
  slicing the frame (`arch4/arch_0.png`); the story warps onto the arch landmark and gets the side
  shot.
- cabin (coins): the `row22Cam` cut shows a pickup coin floating in the aisle between rows 21 and
  23 next to Robban (`fl_sprit_nykter.png`, `fl_landning_tomater.png`). Harmless, but a coin spot
  a row further forward or aft would keep the cut clean.
- orchestrator (HANDOFF §4.5): the "(t)" backlog item is done (filmFlight-4).
