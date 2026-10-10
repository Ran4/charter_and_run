# Phase 3, round 2, fixer `island-flow`

Repo: /home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan (main), port 8870.
Start: `a79c8cb`, tree clean. Scratch output (probes, logs, shots):
`<scratchpad>/out-p3-r2-fix-island-flow/`:
- `radio.mjs`: the playtest critic's `p6_radio.mjs` plus each radio line's time and the
  overhear's start time (`radio.log`).
- `flow.mjs`: the new checkpoints (asnan haggle, bodega vischan), the grisfest hire car and its
  race retry, the post-game bodega (`flow.log`, `flow/`, `sheet_flow.png`).
- `arrow.mjs`: the naive arrow-follower (`p5_arrow.mjs`, as the flight-missions fixer ran it)
  (`arrow.log`).
- `officer.mjs`: the SKANDAL officer from spawns with a building in between (`officer*.log`).
- `eslov.mjs`: the rollerskier seen from the vischan road (`sheet_eslov.png`).
- Check runs: `calf/`, `cal/`, `calhatch/`, `sk1`–`sk3/`, `story1113/`, `fullstory/`, `kinds/`,
  `story/` with their `.log`.

All seven items were verified first (the critics' probes and logs, and a code read) and fixed.
None was rejected or deferred. Three fixes go past the critics' proposals:
- Item 1: the rollerskier moved to where the drive passes him, rather than only re-anchoring the
  overhear.
- Item 3: the race's retry also races in the hire car.
- Item 6: the officer check needs a 10 s window, not 4 s.

## Items

### playtest-3 · bug · fixed — film radio lines no successful run heard
- **buss17.** The twelve gaps were re-spaced to 3 · 5 · 5.5 · 3.5 · 4 · 2 · 1.5 · 1.5 · 3 · 3 · 2.5 · 2.5,
  so the lines run from 3 s to 37 s. They used to run from 4 s to 63.5 s against a clean drive of
  45 s; a bold driver takes about 42 s.
  - Every toast stays up for its full reading time (2.4–5.8 s by length), with at most three at
    once, so none is pushed out early.
  - Probe, autopilot drive: 12 of 12 heard at 44.8 s ×2, at 3, 8, 13.5, 17, 21, 23, 24.5, 26.1,
    29.1, 32.1, 34.6 and 37.1 s. Before: 8 of 12.
- **Follows (grisbil, José).** Lines 2 and 3 carry `{ gap: 4.5 }`, so the lines come at 8, 12.5 and
  17 s. The follow's default spacing put the third line at 28 s, and the tail takes about 21 s.
  - I used 4.5 rather than the critic's 5 / 6, to keep 3.5 s of margin.
  - Probe: 3 of 3 heard in each, the tails 20.5 / 20.6 s.
- **Eslöv overhear.** The critic proposed anchoring the overhear at the lane mouth. I moved the
  rollerskier there instead.
  - The `eslov` NPC's home *is* `eslovVag`. Moving the landmark to the lane's south end,
    (27.5, 24, yaw 0) facing the z −120 road, makes the gag visible: he stands by the
    `ESLÖV 3 900 KM` sign where the car passes (`sheet_eslov.png`). He used to be mid-lane, 33 m
    from the route.
  - The overhear radius went from 25 to 40. Probe: it starts 2.8 s and 4.6 s before the stop, and
    both lines play, 2 of 2 (closest approach 13.3 m). Before: it never started.
  - The car route is untouched. `CAL=vischan`: 25.4 s ×3 → timer 31, unchanged.
- §8.6, §8.9, §8.10, §6.3 and the fixture are updated; no timer changed.

### playtest-5 · bug · fixed — no checkpoint on the haggle or the vischan drive
- **Haggle.** `checkpoint: true, retryAt: 'asnestand'`. Probe after three misses and E:
  - the player is on foot at the stall (1.6 m from it), and `lastCar` is still the sedan parked at
    the market;
  - Ole steps up 2.1 m from the stall (`bringPartner`) and the bid phase starts;
  - no pesetas are paid.
- **Vischan drive.** `checkpoint: true, retryAt: 'playa', retryCar: { at: { x: 0, z: 236, yaw: 0 },
  passenger: 'berra', rider: 'robban' }`, which is the calibrate start. Probe: the drive failed far
  away, then E.
  - The player's car is at (0, 236, yaw 0) with Berra beside him and Robban as a bust.
  - The timer reads 30.8, and the overhear is reset.
  - Shot: `flow/vischan_retry.png`.
- §8.8, §8.9 and the fixture are updated. `missions` data checks pass.

### playtest-9 · bug · fixed — the grisfest race accepted any car
- Stage 2 is now `getInCar({ car: 'hyrbil', any: false, atHome: true, text: 'Hoppa in i hyrbilen –
  det börjar skymma', … })`. The hire car is the sedan the race was measured with.
  - Probe: in bus 17 with the hire car left at (−150, 40), the stage stays on 1. The hire car is
    back on its bay (−26, 22) with the arrow on it (`flow/grisfest_s1_bus.png`). Getting into it
    starts the race.
- I added `retryCar: { at: <the race start> }` to the race checkpoint. A retry now races in the hire
  car again (repaired, moved onto the grid by the kind) rather than in the kind's spare hatch.
  - Probe: failed race, then E. The player is back in "Hyrbilen" beside the bus, with Ole aboard
    and the night sky.
- The race itself is unchanged.
  - `CAL=race` (sedan): clean runs won by 2.0 and 1.6 s; with one crash, lost by 2.3 and 2.5 s.
  - `CAL=race RACE_CAR=hatch`, the fallback when the hire car is wrecked: clean runs won by 2.8 s
    ×2; with one crash, lost by 1.1 s ×2.
- Updated: §8 "Races and chases", §8.12, the fixture, README (mission 12 row), and the story
  scripts. `story`, `fullstory` and the `kinds` checkpoint test now enter `hyrbil`. `story` also
  checks that the race runs in the hire car.

### film-2 · factual · fixed — Angerud at the Viking Bar after the end; Berra and Robban's chatter
- **main.js:**
  - `placeNpcs` now tests `key in homeOverrides`, so a `null` override hides the NPC. A falsy
    override used to be ignored.
  - A new `chatterOverrides`, filled by `applyUnlock` from `UNLOCKS[name].chatter` (so loaded saves
    get it too), replaces CHATTER on the island.
- **`UNLOCKS.bodega`** gets `angerud: null` and chatter for the pair:
  - berra: "Robban! Jag hittade Pepes Bodega!" `[F*]`
  - robban: "Pepes Bodega. Glöm aldrig det, du." `[F*]`
- Probe (`?mission=13` + `unlock('bodega')`):
  - Angerud is `hidden`.
  - At the bodega, the chatter heard is exactly those two lines.
  - At the Viking Bar, only Carmencita speaks.
- §8.13 "After the outro" and §10.3 are updated.

### islandB-2 · bug · tools · fixed — `FROM=11 TO=13 SHOTS=1 story` failed
- **Slow dialogue.** Every island mission script now calls `slow(T)`; the flight scripts already
  did. A `FROM` reload resets the dialogue speed.
- **`shotWhen(T, name, text, { before })`** gives up once the running mission reaches stage
  `before`, so a missed line never holds the script while a timed stage's clock runs. Uses:
  - island: the intro shots (`before: 0`) and "Heia Norge!" (`before: 5`, the 19 s Tonga drive);
  - flight (the same rule): the ombord, sprit and landning intros (`before: 0`) and the gate
    statistics (`before: 3`, the 6 s dash).
- `FROM=11 TO=13 SHOTS=1 story`: every shot saved (dance, Tonga and Hammarby included),
  `done -> #13 idle`, **RESULT: PASS**.

### casthud-8 · bug · tools · fixed — `skandal` failed about one run in three
- The probe (`officer.mjs`) spawned the officer 22–32 m away with a building in between.
  - From the market's street side he closes 3 m in 0.6–2.3 s.
  - From inside the market block he first walks out round a corner: the straight-line distance
    *grows* to 31 m, he closes 3 m only after 5.3 and 6.7 s, and he reaches the player at 8–9 s.
  - So the critic's ~4 s window would still fail sometimes.
- The check now polls up to 10 s and needs 3 m of closing with no stuck teleport. It is stricter on
  that point: the old check ignored teleports.
  - It samples inside-a-solid for at least the old 1.5 s, and for every poll after that.
  - It logs the time taken.
- No game change. §16.4 is updated.

### flight-missions follow-up (r2) · bug · fixed — ombord's seat dash guide
- The stage is now `via(sit(…), ['cabinRow1', 'cabinRow14'], 0.5)`.
  - `cabinRow1` is a new cabin landmark at (0, 12.6) in the aisle at row 1 (§5.5, Appendix A).
  - This is exactly the `calibflight` route: (0, 12.6), then (0.1, −1.5), then the seat.
- `via` now takes a pass radius (default 1.5, the gate's).
  - At 1.5 m the row-1 waypoint is passed from (1.1, 13.3). The arrow to row 14 then crosses row 1's
    C seat, so the aisle uses 0.5.
- The stowers are fine. The follower walks into each one, gets "Ursäkta!", presses E and goes on
  down the aisle.
- Arrow-follower: it sits in 14B after 3.1 s, 2 of 2. Before: it stuck on row 1 for the whole 7 s.
- `FLIGHT=ombord calibflight`:
  - sprint 3.12 s, walk 4.40 s → timer 7, unchanged;
  - careful players peak at 75.7 / 74.6 with no panic, and the careless one panics at 21.7;
  - **RESULT: PASS**.
- §8.1 [3] (the pass radius) and §8.2 [0] are updated.

## Checks
- `node --check` on every changed file: ok.
- Probes: `radio.mjs`, `flow.mjs`, `arrow.mjs`, `officer.mjs`, `eslov.mjs`, as above.
- `skandal` ×3: **RESULT: PASS** ×3, run on the final 5 s and 10 s versions of the check.
- `FROM=11 TO=13 SHOTS=1 story`: `done -> #13 idle`, `no errors`, **RESULT: PASS**.
- `CAL=vischan,follow,race calibrate`: `no errors`, **RESULT: PASS**.
  - vischan 25.4 s ×3, `CAL CHECK … 31 s OK`.
  - Race: as above.
  - Follows in band: grisbil 20.3–36.4 m, José 22.4–29.6 m, bus 21.7–25 m.
- `CAL=race RACE_CAR=hatch calibrate`: **RESULT: PASS**.
- `FLIGHT=ombord calibflight`: **RESULT: PASS**.
- `fullstory kinds missions`:
  - fullstory reached `done -> #13 idle`, and the missions data checks passed.
  - kinds failed at first. Its checkpoint-retry test still took `anyCar()` at grisfest stage 1, and
    that stage now wants the hire car. After the fix (`enterNamed('hyrbil')`), `kinds` alone:
    **RESULT: PASS** (the night retry, plates intact, retryCar reuse / typed / park).
- `story` (full, final code): `[t] done -> #13 idle stage 5 coins 7850`, no `scenario failed`,
  `no errors`, **RESULT: PASS**.
- Shots looked at: `sheet_flow.png` (haggle retry, vischan retry, grisfest in the bus and the race
  retry), `sheet_story1113.png` (race in Hyrbilen, Heia Norge, Tonga, Hammarby), `sheet_eslov.png`.

No random-stage sample was taken: vischan, the race and the follows are not pooled stages. The
ledger is untouched.

## Follow-ups for other groups
- **flight-missions:** the arrow-follower from `approachSpot('gateOle')` (not a real dash start:
  the statistics scene places Stig at (25.0, 11.6)) failed the gate dash once. It stuck at
  (31.4, 25.4) inside the men's room, 2.2 m from `herrtoa`, on something near the basins. From the
  placed start it arrives in 3.9 s, 2 of 2. Worth a look only if anything ever starts the dash
  elsewhere.
- **bodega:** a failed pig-truck follow now retries from the vischan checkpoint, which replays the
  timed vischan drive, the dropoff and the hitch scene. Before, it replayed the whole mission. The
  follow could get its own checkpoint (the truck's lane-spot start, the car behind it).
- **grisfest:** `atHome` places the hire car on its bay without clearing it. A named car the player
  parked exactly there would be overlapped; this is rare, and buss17's `atHome` shares it.
