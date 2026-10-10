# Phase 3 · round 3 · fixer `flight-flow`

Start HEAD `90775a7` (tag `phase3-r2`), clean tree, branch `main`. Port 8870. Probes, logs and shots
in `<scratchpad>/out-p3-r3-fix-flight-flow/` (`ff.mjs` arrow-follower parts, `retry.mjs`, the flight
critic's `rp.mjs` part `gatefear`, `list.mjs`).

## Items

- **r3flight-1 · bug · fixed** — landning [1] "Tillbaka till 14B" is `via(sit(…), ['cabinRow14'],
  0.5)`: up or down the aisle to row 14, then into 14B (the `calibflight` route). The critic's
  arrow-follower (`ff.mjs` part `land1`, from Herr Storch, José and Berra, 2 runs each) now sits in
  0.9 / 1.2 / 2.2 s, 6 of 6 (before: 6 of 6 failed, wedged on row 11 or row 16). From the
  checkpoint retry at row 16 (`landretry`) it sits in 0.4 s, 2 of 2. No timer change: `calibflight`
  still measures 3.2 s from Berra, 1.3 s from Herr Storch → 5. §8.5 [1] has a Guide line.
- **r3flight-2 · bug · fixed** — `interact` puts `seat: o.seat` on the stage and `mantra` puts
  `seat: o.seated` (as `timeline` does), so `cabin.bestSeat` gives the stage's seat its +10 and
  1.6 m reach. Juice [0] from the aisle at row 14 (`juice0`, five spots/facings): prompt "E Sätt
  dig", best seat **14B** (before 14C); E sits in 14B, the next E presses the call button and the
  gag plays. Landning [2] standing in the aisle: best 14B. §5.10, §9.2, §8.3, §8.5.
- **r3flight-3 · bug · fixed** — gate [6] queue `via(goto(…), ['herrtoaDoor', 'damtoaDoor'])` (out of
  the men's door, down the corridor past the ladies' door; from the door straight at the lounge
  also crossed the back bench row, so one waypoint was not enough), gate [8] boarding `via(goto(…),
  ['bridgeMouth'])` with the new landmark `bridgeMouth` (15.5, 14.7) in front of the bridge opening
  (§5.5, Appendix A). Arrow-follower: the queue from the Berra scene's spot and four spots round the
  men's room (its south-west corner among them) arrives in 5.7–6.5 s, 5 of 5; boarding from the
  queue's end, the cluster, north of the back bench row, north of the desk, the lounge's east end
  and its south side boards in 3.9–4.9 s, 6 of 6 (before: pinned 60 s each). Untimed stages.
- **r3flight-4 · bug · fixed** — shame.js: in panic mode the idle decay and its `sinceOffense` clock
  pause while `inScene` (dialogue, cinematic or cut). The critic's `gatefear` at 20 chars/s: dash
  start **70.2** (was 57.7), sprinter arrives at 95.2 (84.7), walker 99.8 (91.2), the dawdler
  **panics** (did not); at 12 chars/s the start is 70.4 (was 25). `calibflight` got `DIALOG_CPS`
  (default 55): at 55 the gate is 70.1 → sprint 95.6 / walk 99.4 / dawdler PANIK at 5.2 s; at 20 it
  is 70.3 → 95.8 / 99.4 / PANIK at 5.2 s; ombord, sprit and landning keep their careful/careless
  results (both runs **RESULT: PASS**). §5.9 Relief table, §8 FLYGRÄDSLA paragraph, §8.1 [3],
  §16.4, flight.js header.
- **R2 · non-blocking · fixed** — `via` no longer keeps a forward-only index: every frame it aims at
  the furthest point of its chain the player is on his way to (nearer it than the point before it
  is, or within `pass` of that point) **with a clear line to it** (`segmentBlocked` at hip height,
  0.1 m steps). After a PANIK in the corridor sends Stig to Ole (`dashpanic`) the target is the
  corridor waypoint again (27.9, 12.2), not the men's door. The clear line also fixed what a plain
  re-derivation broke: the "nearer" rule skipped the queue's men's door from the room's south
  corner, and a first per-waypoint version flipped the beacon between the lounge and the men's door
  while the follower waited at the lounge for the overhear (a tie; the backward search is stable).
  Dash follower 3.6 s 3 of 3 (fear 94–95), ombord seat dash 3.1 s 2 of 2, unchanged. §8.1 [3].
- **R3 · non-blocking · fixed** — level.js `resetSpot` in the terminal: an untimed stage always goes
  to the lounge (R is the flight level's only unstick, and an untimed stage has nothing to gain);
  the timed toilet dash goes to the lounge's or Ole's approach spot, whichever is not nearer the men's
  room than he is, else nothing with the new toast `Inte härifrån!` (`S.resetNone`). Probe `reset`:
  dash start → Ole's spot (16.7 → 18.9 m from the goal), corridor → the lounge (7.6 → 14.3 m), the
  far south-west → nothing + toast, queue / boarding / to Ole → the lounge. The duplicate comment
  above `resetPlayer` is gone. §3, §4.2 note, §4.3, §11.5, README.
- **R4 + N7 · wording · fixed** — the sprit pool is n 56 now (fm1 36, fm2 5, r2g1-C 5 and this
  round's r3ff-C 5 + r3ff-R 5, all on the same stage and sweeper code): median 7.40, p75 7.60 → 13,
  range 13–13 (`node tools/pool.mjs`). §8 table, §8.4, flight.js header and the ledger's summary
  line (it still said n 41). `calibflight`'s ombord row reads "the intro's spot at the front door
  (1.6, 13.55) -> 14B …".
- **r3play-2 · bug · fixed** — runner.retry sets `cam.yaw` to the spot's yaw, then, on foot, turns
  the player and the camera to the started stage's guide (the arrow's aim: `routeAim` on the island,
  straight in the flight level); a scene keeps the spot's yaw. The critic's `cam.yaw = spot.yaw`
  alone was not enough: the spots face their landmark, and `retry.mjs` (fail, turn the camera 135°
  on the fail screen, E) found the guide off the spot's yaw by 127° (ombord seat dash: the cockpit
  door), 180° (sprit: the rear galley), 90° / 127° (landning round-up / 14B dash: row 16's seats)
  and 171° (grisfest Tonga: away from the car). After: 0° between camera, player and guide on
  13 on-foot retries: ombord 0 and 1, juice 1 (4°: the trolley moves), sprit 0, landning 0 and 1,
  friskotek 0, fataga 4, grisfest 0, 3, 5 and 9, julafton 0. The gate's statistics retry (a scene) starts the dash with
  the camera on the spot's yaw, 79° off the first waypoint (was wherever it was). Retries at the
  wheel (`retryCar` without `park`) keep the car's yaw. §9.4 item 3, §8.11 note.

## Checks (final code)

- `node --check` on every changed file: OK.
- `gate cabin flightshots panic turbulence trolley missions`: no errors, **RESULT: PASS**.
- `fullstory kinds`: `[t] done -> #13 idle`, no errors, **RESULT: PASS**.
- `calibflight` (full, default env): every row at the shipped timer (gate 3.6 → 6, ombord 3.1 → 7,
  sprit p75 7.7 of 5 → 13, CALF CHECK inside 13–13, landning 7.6 → 12 and 3.2 → 5), **RESULT: PASS**.
- `DIALOG_CPS=20 calibflight` (full): the same timers, CALF CHECK sprit inside 12–13, **RESULT: PASS**.
- `story`: `[t] done -> #13 idle`, no `scenario failed`, no errors, **RESULT: PASS**.
- Shots looked at: `sheet_ff.png` (queue/board/landning starts, juice's 14B prompt and the call
  button after E), `sheet_retry.png` (before/after retries: ombord, sprit, landning, Tonga, fataga).

## Follow-ups and known issues

- A timed stage that starts right after a scene keeps the camera from before the scene: the first
  gate dash starts with the camera the player had walking from the arch (west, ~168° from the
  route), and the Tonga drive after the dance faces the dancers (r3play-2's related note). Not
  fixed (it needs a rule for the camera at a scene's end); known issue.
- The gate walker arrives at 99.4, 0.6 under PANIK, at any reading pace now (the instant reader
  was already there). By design the careful player is the sprinter ("fort!"); a slower walk
  panics, which a careless player should.
- The ledger has two new sprit samples (r3ff-C, r3ff-R); the timer stays 13.
- r3flight-5, -6 and -7 (Stork staging, the turbulence banner/prompt, the stage beacon in the
  cabin) belong to other groups.
