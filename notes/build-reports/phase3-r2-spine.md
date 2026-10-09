# Phase 3, round 2, fixer `spine`

Repo: /home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan (main), port 8870.
Start: `d9451f8`, tree clean. Scratch output (probes, logs, shots):
`<scratchpad>/out-p3-r2-fix-spine/` (`spine.mjs` = my probes, run as `TAG=before` on d9451f8 and
`TAG=after`; `audit.mjs` = the staging critic's line audit with a flag for the new `frame` branch;
`outro_*.mjs` = the flight critic's jet-bridge walk with measurements; `base/` = a `git archive` of
d9451f8 for A/B runs).

All nine items were verified first (code read plus a probe on d9451f8) and fixed. None rejected,
none deferred. Two fixes differ from the critics' proposals (playtest-2, flight-6; see below).
No timer, route, car or world geometry changed, so no re-measurement was needed apart from the
race check islandB-1 asked for. I did not touch `calibrate.mjs`, island.js `TIMERS`, the fixture,
the §8 timer rows or `notes/calibration-samples.md` (repair 2's files).

## Items

### islandB-1 · bug · fixed — a frozen player car reversed
Verified: main.js set `brake 1` while frozen, which car.js reads as reverse below 0.5 m/s.
Probe on d9451f8 (hire car, 1.5 s): standing → 4.2 m back at 19.8 km/h; at 20 m/s → stopped, then
11.8 km/h backwards; rolling back at 6 m/s → 40.9 km/h backwards. The same for `freezeCar`,
`frozenT` and `inDialog`. Race countdown: the car went x −22.7 → −29.9 at 28 km/h reverse by 1.7 s.

Fix (main.js `fixedStep`): frozen → `brake = forwardSpeed > 0.5 ? 1 : 0`, throttle 0, steer 0,
handbrake on. The strong brake still stops a moving car, and the handbrake (plus coasting, 7.2 m/s²)
brings it to rest and holds it. After: standing 0.00 m; 20 m/s → stopped in 5.7 m; −6 m/s →
stopped in 2.4 m; the race car stays at x −23.0 through the countdown (0 km/h).

Race margin: `calibrate`'s autopilot already parked the car during the countdown ("brake at
standstill means reverse", calibrate.mjs:305), so the measured balance never had the backward
start; only real players did. `CAL=race RACE_RUNS=4 calibrate` on the fixed code: 4 clean runs won by 2.0 / 1.7 / 2.0 / 2.0 s
and 4 one-crash runs lost by 2.2–2.3 s, no impacts (DESIGN: 1.7–2.0 and 2.2–2.4), RESULT: PASS.
So §8 "Races and chases" stands; no rebalancing. DESIGN §14.3 documents the frozen-car rule.

### playtest-2 · bug · fixed — R in the cabin was a free teleport to 14B
Verified (probe on d9451f8): ombord s0 from the door (0.8, 13.2), R → (0.25, −2.1) with "E Sätt
dig", E → seated in 14B, next stage. Landning s1 from the rear galley, R + E, seated. Also found:
in the terminal R → `gateLounge`, which is 2.5 m nearer `herrtoa` than `gateOle`, where the 6 s
toilet dash starts (R moved him (23, 10.3) → (22, 17.5)), and `gateLounge` is itself the target of
the queue goto.

Fix (level.js `resetSpot`, main.js `resetPlayer`): instead of the critic's "R does nothing while a
timed stage runs", R keeps its job ("Tillbaka i gången!") but never moves the player toward a goal:
- In the cabin: back into the aisle at the same row, the free spot on the centre line nearest his z
  within 2 m. This only moves him sideways, so it is no shortcut, and it still unsticks a player
  wedged between seats (which a do-nothing R would not).
- In the terminal: `gateLounge`, unless the lounge is nearer the running stage's target than he
  is; then `resetSpot` returns `null` and R does nothing.
- `resetPlayer()` returns whether it moved him, and only then does R spill a carry.

After: ombord R → (0, 13.2), E does nothing; landning R in the galley aisle stays at z −16.1; the
toilet dash R is ignored; wedged at row 10 A-side (1.7, 1.88) → (0, 1.88). DESIGN §3 R row, §4.3 R
row, README controls table.

### casthud-2 + playtest-6 · ugly · fixed — the retry banner covered the start of a stage
Verified: `retry()` showed `def.title` / "Försök igen!" mid-screen for 2 s (box 388–890 × 220–303
px in ombord, still up at +1.7 s with the timer at 0:05).

Fix (runner.js `retry`): `hud.toast(S.retryToast)` with the `start` jingle; no banner (the
objective card names the mission). `S.retrySub` → `S.retryToast`. After: at +0.2/0.9/1.7 s no
banner is shown; the toast sits in the right column (1135–1255 × 196–238 px). DESIGN §9.4 item 3,
§11.5.

### playtest-7 · bug · fixed — `goto` with `inCar` never pointed at the car
Verified: asnan s5 on foot: target Ole (−75.4, −159.6) 1.8 m away, car at (−77, −134). Grisfest
Tonga retry: target the club (−146, −62), parked car at (−86, −202.8).

Fix (kinds/core.js `goto.altTarget`): on foot with `inCar` or a `passenger`, the target is
`missions.lastCar` while it is alive and in `g.cars` (r 3.5). In a car, the left-behind passenger
as before. After: asnan s5 on foot → the car (−77, −134); in the car → Ole (who reboards); Tonga
retry → the car (−86, −202.8). DESIGN §9.2 goto row.

### staging-4 · ugly · fixed — the haggle seller had his back to the lens
Fix (kinds/island.js `haggle.talk`): before `g.cinematic`, the seller and the other speaker
(partner, else the player) turn to face each other, as `runner.begin()` turns the giver.
Line audit (story arrival): souvenir −0.82…−0.84 → 0.15–0.16 on all 7 lines, Ole 0.56…−0.22 →
0.15–0.18 on all 6. My own probe from another arrival side, measured once the camera has
arrived: both 0.14–0.16 on all 13 lines. (Readings taken while the cine camera is still flying
in from the gameplay camera, ~1 s, are not meaningful; the audit holds each line until it
settles.) DESIGN §9.2 haggle staging.

### casthud-1 · ugly · fixed — Berra stuck out of Stig's face
Verified: Berra's bounding-box centre 1.26 m in front of Stig, his feet in Stig's head
(`rotation.set(0, yaw + π/2, π/2)`; XYZ Euler applies the z roll first, so the body ran along
Stig's forward).

Fix (kinds/flight.js `carry`): `rotation.set(0, p.yaw, π/2)` (body along Stig's right), the root
(feet) half Berra's height to Stig's left, y = `p.y + p.height`. After: the centre is 0.23 m
forward and 0.15 m right of Stig, at y 2.16–3.16 over Stig's head (1.92–2.73). Looked at from
the side, front, back and the chase cam (walking): he lies across Stig's raised hands; from behind
his legs hang on one side and his head on the other. No DESIGN literal.

### flight-6 · ugly · fixed — the giver's "!" and beam in the cabin
Verified (probe, juice idle, Ole in 14A): player at row 10 → the "!" was visible 4.1 m from the
eye (a huge clipped blob); landning, Stig in 14B → the "!" at 4.7 m plus the beam wedge (opacity
0.16, eye 2.7 m from Majsan horizontally); seated beside Ole → the beam at 0.16 from 4.6 m.

Fix (main.js `updateMarkers`, markers.js `Bang.fadeBeam`): the "!" hides within 5.5 m of the
camera in the flight level (3 m on the island). The distance is measured from the un-bobbed spot,
so the ±0.2 m bob no longer flickers it across the line. The beam fades out between 8 and 4 m of
horizontal distance from the eye while the giver is in the cabin; I chose fading over the
critic's plain hide. After: row 10 → no "!", no beam; landning 14B → none; seated beside Ole →
beam 0.024 (barely visible); row 6 (7.2 m) → "!" shown, beam 0.09; facing aft from row 10
(10 m) → "!" and full beam. DESIGN §5.3.

### flight-3 (a) · ugly · fixed — `frame`'s dollhouse for two speakers in a line
Fix (camera.js `frame`): in the dollhouse branch, when both face the same way (|Σ facing| > 1.2)
and that facing runs along the line between them within 35°, frame from in front along it, as the
< 0.3 m case does.

Line audit (the staging critic's `audit.mjs`, all 13 missions, instrumented to flag the frames
this branch takes): 280 lines, no errors, and **no line takes the new branch**. A line-by-line
diff against the critic's baseline (`a1`, same HEAD) shows only:
- the intended haggle changes;
- the asnan 151/152 street shots and Tonga Tonga 223–225, which depend on which car the story's
  `anyCar()` grabbed (buss17 in this run). They are harness variance, see the follow-ups;
- noise on the dance lines.

The real jet-bridge walk (the flight critic's `probe2.mjs outro`, A/B on d9451f8): the outro's
speakers now face the lens. Before: Stig −0.18, Majsan 0.62, Siv 0.66, eye out over the bridge
wall. After: 0.97 / 1.0 / 0.98, eye in front at the door. The composition is still steep, with the
door frame across the middle and Stig seen from above, so the restaging (b) remains for
flight-missions. DESIGN §5.3.

### casthud-5 + islandB-6 · ugly · fixed — the Rio end card
Fix (main.js `playEndCard`): deck offsets Stig (0.76, 1.83), Majsan (0.45, 2.46), Ole (0, 3.35),
Siv (−0.31, 3.98). This is islandB's row at one depth across rioCam's view, with the couples 0.7 m
apart and 1 m between the couples. Before: heads at x 629 / 544 / 502 / 408 (Stig, Majsan, Ole,
Siv), Majsan 42 px from Ole and 2.1 m behind him. After: x 644 / 585 / 505 / 447, depths
9.25–9.56 m, and no chest covered by another cast member. Left to right: Siv, Ole, Majsan, Stig.
`endcard riocard` pass. DESIGN §11.7 literal.

## Checks

- `node --check` on every changed file: ok.
- `kinds missions fullstory endcard riocard cabin gate talk`: `no errors`, **RESULT: PASS**.
- `CAL=race RACE_RUNS=4 calibrate`: clean won by 1.7–2.0 s, one crash lost by 2.2–2.3 s, **RESULT: PASS**
  (a first attempt died on a puppeteer "detached Frame" right after boot; the rerun was clean).
- Line audit (280 lines) as above; probes `spine.mjs` before/after as above.
- `SHOTS=1 story`: `[t] done -> #13 idle stage 5 coins 7750`, no `scenario failed`, `no errors`,
  **RESULT: PASS**. Shots looked at: the race start (the car level with the bus at "KÖR!", 0 km/h),
  the carry, the haggle (both in profile), the gate outro, Tonga Tonga.

## Follow-ups for other groups

- **island-missions / staging**: the Tonga Tonga street shot (`cam: { at: 'tongatonga', dist 6,
  height 2.6 }`) is fully covered when the player's car is a bus parked where the camera stands
  (the story's `anyCar()` took buss17 in one audit run: 5 of 5 rays and 26 of 35 near-lens samples
  hit the bus). The same holds for any car parked there by a player who stops short of the club.
  The scene should move the player's car out of that street spot (or pick a camera side clear of
  it). The asnan street lines 151/152 ("Og så maler vi den rød", "Och blommor där") frame shop
  fronts with nobody in shot in both runs. That is staging's existing finding, not changed here.
- **flight-missions**: the jet-bridge outro is now framed from in front (the faces show), but the
  eye is steep and the door frame crosses the middle; the restaging (flight-3 b, Stig placed and
  turned to the sisters) will use the side two-shot instead, since their facings will then be
  opposed.
