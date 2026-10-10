# Phase 3, round 2, fixer `island-staging`

Repo: /home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan (main), port 8870.
Start: `61bbcea`, tree clean. Scratch output (probes, logs, shots):
`<scratchpad>/out-p3-r2-fix-island-staging/`:
- `audit.mjs`: the staging critic's line audit, unchanged.
- `probe.mjs` + `scen.mjs`: the audit pump with real-arrival scenarios. The scenarios are
  `frisk` (three sides), `bodegaIn` (five sides round Berra), `vischan*` (a hatch at the track
  mouth, a bus, a hatch at the far end), `tonga*` (buss17, a hatch and a sedan stopped in the
  lot and on the plaza; `*Before` rebuilds HEAD's scene without the decorator), `paintA`/`paintB`
  (the critic's drive-in and on-foot knäcke grabs) and `fataga`. Frames are tagged by scenario and
  run.
- `geo.mjs`: top-down shots with marker posts.
- `cands.mjs`: candidate fixed cameras while a line is held.
- Runs: `base/` (the audit of missions 5–12 on 61bbcea), `after/` (the same audit on the fixes),
  `p1`–`p5` (probes), `c1`, `c2` (vischan camera candidates), `cal1`–`cal3` (balls),
  `fol/` (`CAL=follow`).

Baseline first, as asked: the line audit on today's HEAD (after spine's `frame` and haggle
changes). It ran missions 5–12 with the repo's story scripts: 193 lines, `[t] done -> #13 idle`,
no errors (`base/audit.jsonl`). Every before/after number below is base → after on the same
harness, unless it says a probe.

All seven items were verified first on HEAD. Six are fixed; the optional spine root cause of
item 1 is left out (see there). Two fixes go past the critics' proposals: the vischan scene
(item 5), which is a reverse angle with the car parked by a decorator, and the Tonga Tonga car
(item 7), which uses the same decorator.

## Items

### staging-1 · ugly · fixed — asnan paint scene, "Och blommor där."
Before (`base`, m07 065): Stig BACK (−1), OCC car:hatch. That is the seated two-shot the line
returned to after the shop cut. Real arrivals (`p4`, `paintA` drive-in, `paintB` on foot):
the critic's empty frames.
Fix (the critic's smallest): Stig's line drops `cut: null`, so the FERRETERÍA · PINTURAS cut holds
through both lines and `scene` ends it. §8.8 now says both lines play over the shop.
After: both lines frame the shop front from every arrival (`p4/lines/paintA1_m07_019/020`,
`paintB1_*`). They are voices over a cutaway, like the bodega and telefon cutaways, so the
audit's OFFSCREEN there is by design. No `exitCar`: the timed SKICK drive still starts with Ole
aboard and the player at the wheel.
The spine root cause (`frame` with car-seated people) is not done: optional, and moot now. No
scene left frames a car-seated pair (asnan's was the only one).

### staging-2 · ugly · fixed — bodega outro, Stig in front of Berra
Before (`base/lines/m08_080`): Stig's back fills the right half of the `bodega` cut, and only
Berra's cap and one eye show. The drive ends at `flamencoBack`, 14 m away, so the runner's 8 m
rule teleports him 2 m in front of Berra.
Fix (the critic's verified offset): `outroPlace.stig: ['bodega', -3.4, -1.4, π/2]`.
After (`after/lines/m08_080…082`): Berra and Robban are in full view facing the lens (0.98).
Stig stands at the right, side-on, facing them. The later Berra–Stig two-shot ("Den måste ligga
nånstans") goes from Berra 0.17 to 1.0 facing, both in profile.

### staging-7 · ugly · fixed — friskotek intro
Before (`base`, m06 028 and 030): Siv 0.21 with occ1 by Ole. Fru Storch is OFFSCREEN with her
BACK to the lens (−1), 3.9 m away, 189 px.
Fix: the critic's cut and placements on Siv's line, `cut: { at: 'friskotek', dist: 6, height:
2.4 }`, held to the end of the intro. One change: **Ole is placed too**, at `['friskotek', 3.6,
2.0, −2.6]` beside the Storchs. In the critic's shot he was still on his `extra` spot (−1.5, 3),
0.6 m behind Stig, his head right behind Stig's.
After (`after`, and `p4` from three arrival sides, all the same): Siv 0.95 at 57 px, Lasse 1.0,
Fru Storch 0.94 at 48 px. Everyone is in frame and Stig's oath arm is still up.
**Timer:** the balls start from Stig's placed spot (−11.0, −69.4). Before, he stood wherever he
talked to Lasse, and `calibrate` used the approach spot. Lasse, the sisters, the Storchs and Ole
also stand elsewhere during the chase. That is a new stage pool (ledger rule). Re-measured: see
Checks.

### staging-9 · ugly · fixed — fataga outro
Before (`base`, m10 118–120): the two-shot followed the arrival. Majsan was 3.7 m from the lens
at 132 px, at the left edge on her own line, and Siv was out of the shot.
Fix: the critic's `outroCam: { at: 'fatagaFold', dist: −7, height: 2.3 }` and placements. Stig
moved to `[2.6, 1.0, −1.3]` instead of the critic's `[2.6, 1.6, −2.2]`. The critic's spot was
the nearest to the lens, at the frame's edge, with his back half turned (the critic's own note);
dx 2.2 alone still left him large and turned away (`after`).
After: Pappa 0.98, Mamma 1.0, Majsan 0.97 (69 px). The sisters are on the left, and Stig is in
3/4 at the right, turned to the group (`p5`).

### staging-11 · ugly · fixed (different fix for the vischan scene) — bodega vischan scene and intro
**Intro.** Before (`base`, m08 073–077): Berra occ2 by Robban on all four of his lines, with
Robban 3.5 m from the lens.
Fix: the first intro line places Robban at `['flamencoBar', 1.4, −1.0]` = (17.0, 13.4). That is
behind Berra's shoulder at the counter (counter x ≥ 17.6, no stool at that z).
After: none of Berra's lines is occluded, from the story's arrival (`after`) and from five sides
round Berra, 0°, ±70° and ±110° (`p3`, `bodegaIn`). Robban's own line was unoccluded every time
(0.27–1.0). A first try at (17.0, 12.9) left Robban behind Berra from −110° (`p1`).

**Vischan.** Before (`base`, m08 078/079): Stig BACK (−0.97), and Berra 0.21 with OCC by Robban
(4 of 5 rays). The car stops anywhere within the dropoff's 9 m of `vischan`, which `geo/` shows
is the 6 m gravel track between the tomato rows. So any fixed camera on the track could find the
car between it and the people.
Fix:
- The three stand on the track by the `CAMINO SIN ASFALTAR` sign (Stig beside it, facing Berra;
  Berra in profile; Robban behind Berra's shoulder).
- The fixed cut comes from the new anchor `vischanCam` (−234.3, −137.3, yaw −0.14), up the track,
  looking back at the road the pig truck comes along.
- `frame`/`exitCar` are dropped (`place` exits the car).
- A new stage decorator `parkCar(stage, spot)` in missions/island.js parks the player's car first
  on the track behind the camera, at (−234, −143), nose to the road. Unnamed parked cars there
  make room. So the shot never depends on where he stopped.

I chose the reverse angle over the critic's "camera on the verge, car behind them" after
candidates (`c1`, forward). From the south the sign was a half-cut board at the frame's edge,
since the only camera spot short of the road is 2 m from it. The reverse shot (`c2`) reads the
sign and sets up the hitch-hike.
After (`after`, `p2` with a hatch at the mouth, a bus, a hatch at the far end): Stig 0.68 at
81 px, Berra 0.5 at 77 px, no occluder, Robban visible. The car parks behind the camera in every
case.
**The follow is untouched.** The truck spawns on its lane spot as before. Its tail starts once
the player is back in a car within 40 m of it: from the parked car that is 42.6 m (drive 3 m),
where a stop at the far end of the dropoff radius was already ≈ 44 m. `CAL=follow` (fixed start,
see Checks) stays in band.

### spine follow-up · ugly · fixed — Tonga Tonga street shot blocked by the player's car
Before: spine's audit shows buss17 parked on the camera spot, 5 of 5 rays and 26 of 35 near-lens
samples on the bus. `p5` `tongaBusBefore` rebuilds HEAD's scene without the decorator, with
buss17 stopped in the lot inside the 10 m radius: see Checks.
Fix: the same decorator, `parkCar(stage, ['tongatonga', −10, −10, 0])`, parks the car in the lot
at (−136, −52), nose to the street. That is 4 m east of the slumped Berra the next stage picks up,
and behind the camera, which stands in the same lot.
After (`p2`, buss17 at the camera spot, a hatch in the lot, a sedan on the plaza): Ole 0.97,
Robban and Stig 0.11, no occluder and nothing near the lens. The car is at (−136, −52) every
time; the pickup, the drive home and the carry follow, all untimed.

### film-4 · factual · fixed — tags
Tag-only (no text, no timer), in island.js, the fixture and DESIGN §8:
- "Kan ni dela rum?" `[F](t)` → `[F*](t)`: shortened, since the subtitle opens "Jag undrar om".
- "Till brudparet…" `[F]` → `[F](t)`.
- The vischan radio: `[F*]` → `[F*](t)` and `[F]` → `[F](t)`.
- Siv's "Han heter José…" and "Äkta spansk restaurang…" `[F*]` → `[F*](t)`.
- "Nej, bara de inte går på tur…" `[F]` → `[F](t)`.
- "Alla är välkomna på julfesten…" `[F*]` → `[F*](t)`.
- §8.13 "After the outro": the bodega chatter `[F]` → `[F*]` (relocated), as in §14.10 and the code.

The eight island titles carry `// title [F*]` (all film words) except "Julafton bland palmerna",
which is `// title [N]`. §1.4 now says all thirteen titles are tagged. I checked the research
references (research-plot §7.3, §7.4, §7.11, §7.13 item 4, §6 #9 and the julfest line).

## Checks

- `node --check` on island.js, landmarks-island.js and the fixture: ok.
- Line audit, missions 5–12: base (61bbcea) and after both have 193 lines, `[t] done -> #13
  idle`, no errors. The only changes are the lines above, plus noise on one dance line ("Får jag
  lov…", 0.46 → −0.1, as in spine's run).
- Probes `p1`–`p5`: no errors. The Tonga before, without the decorator (`p5`): buss17 in the lot
  gives OCC car:buss17 and NEAR 26/35 on all three lines, matching spine's figures. A hatch there
  did not block the shot (the camera is 2.6 m up). After (`p2`): clear with all three cars.
- **friskotek balls re-measured** (new pool `walker-r1r2/r2-island-staging` in
  `notes/calibration-samples.md`; the walker and `calibrate.mjs` are unchanged).
  - Three runs of `CAL=balls FOOT_RUNS=12`, 36 runs, 5.98–20.83 s, no falls or wedges.
  - Batch checks: the first gave 24, with the shipped 24 inside (RESULT: PASS); the second 21,
    outside its 20–23 range (PASS); the third 25, inside (PASS).
  - Pooled (`node tools/pool.mjs friskotekBalls`): median 13.59, p75 15.29, T_ref 18.29, timer
    **23** (was 24, 90 % range 22–24). Slack 34 % at p75.
  - Updated in island.js `TIMERS`, the §8 table and §8.7 literal, the fixture and the ledger.
- `CAL=follow calibrate`: grisbil 21.6–43 m, José 22.3–29.6 m, bus 21.8–25 m, all in band,
  **RESULT: PASS**.
- `fullstory kinds missions`: `[t] done -> #13 idle stage 5`, `no errors`, **RESULT: PASS**.
- `SHOTS=1 story` (the full story): `[t] done -> #13 idle stage 5  coins 7775`, no `scenario
  failed`, `no errors`, **RESULT: PASS**. Shots looked at: `isl_friskotek_oath`,
  `isl_friskotek_balls` (the chase starts in the group), `isl_bodega_grisbil` (after the vischan
  scene, the car up the track nose to the road), `isl_bodega_benidorm`, `isl_grisfest_tonga` and
  `isl_asnan_vikingbar`.

## Follow-ups

- island staging (next round): in the Tonga Tonga street shot, Robban asks "Kan du hjälpa mig bära
  hem Berra?" but Berra, slumped at `tongaLot`, is behind the camera. That was so before this
  round too.
- spine (optional, low): `frame(a, b)` for two people seated in one car still frames their
  standing heights. No scene uses it any more; a future one would need the car-side framing
  staging-1 proposed.
- The haggle's "Til markedet!" and the vischan "Ditåt!" bubbles under the first dialogue line
  remain harness-only (the story warps straight from the pickup into the scene), as the critic
  noted.
