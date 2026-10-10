# Phase 3 · round 3 · fixer `island-staging`

Start HEAD `69f4f33` (fixer 2/4 flight-look), clean tree, branch `main`. Port 8870. Probes, logs
and shots in `<scratchpad>/out-p3-r3-fix-island-staging/`:
- `crit/` (the staging critic's `audit.mjs`, `cands.mjs`, `scen.mjs`, `compare.mjs`, copied);
- `a1/` (the line audit on the final code, missions 5–12: 193 lines, `audit.jsonl`, one JPEG per
  line) and `compare_base_fix.txt` (against the critic's baseline `out-p3-r3-staging/a1`);
- `s7/ s9/ s10/ s11/` (`runsides.sh`: real E presses from six arrival sides each);
- `probe.mjs` with `probe.log` and `probe/` (parts `geom`, `staff`, `realend`, `grisfollow`);
- sheets `sheet_fixed_lines.jpg`, `sheet_storyshots.jpg`, `probe/sheet_probe.png`.

## Items

- **r3staging-1 · ugly · fixed** — ropavieja and fataga pool intros: the first line places the
  three and cuts to a fixed pool shot, `POOL_INTRO_CAM = { at: 'flamencoPool', dist: 5.5, height:
  2.1 }`, held to the end of the intro (`begin()` ends the cut). Ropavieja on Siv's first line:
  siv (0.2, 0.5, π/4), majsan (1.3, 1.1, π/5), stig (−1.3, 0.5, −π/4); fataga on Stig's first line,
  the sisters swapped. The critic applied the cue on the second line; on the first line the whole
  intro is covered. Audit: Majsan's three lines 61 px, facing 0.91 (were BACK −0.89 / behind Siv),
  Siv 68–69 px 0.73; fataga Siv 63 px 0.91 (was BACK −0.89/−0.95 or behind Majsan), Majsan 67 px
  0.73, Stig 77–78 px 0.84; no occluder, nothing within 1.5 m. Six arrival sides each (`s9`, `s10`):
  the same numbers on every side. Stage 0 is an untimed `getInCar`. §8.10, §8.11, fixture.
- **r3staging-2 · ugly · fixed** — the Viking Bar outro is one `outroCam: { at: 'vikingbar', dist:
  6.5, height: 3.4 }` shot; `outroPlace` puts Stig side-on to Carmencita (0.9, 1.3, yaw 1.75) on
  Angerud's later spot, line 1 hides Angerud (his home is the bar), his first line places him there
  and Stig out of the shot, and the last line's `cut: null` is gone (the critic's `v7b`). Audit: Stig
  58 px facing −0.06 (profile; was three-quarters from behind), no Angerud among the others on the
  first two lines; Angerud 51 px 0.99, Carmencita 50 px 1.0, all in the VIKING BAR frame. §8.8,
  fixture.
- **r3staging-3 · ugly · fixed** — José's "…mamma följde med?" cut `{ at: 'grillpaco', dist: −7,
  height: 2.2 }`, Mamma's `outroPlace` yaw π (faces the table). Audit: José x 640, 62 px, facing
  1.0 (was x 88, 60 px, −0.81); Siv at x 775, Mamma at x 203 10.3 m; no occluder. Siv's next line
  keeps `cut: null`. §8.10, fixture.
- **r3staging-4 · ugly · fixed** — asnan and grisfest intros: a fixed porch shot from the pool deck,
  `PORCH_INTRO_CAM = { at: 'flamenco', dist: 6, height: 2.2 }`, on the first line. Asnan: ole
  (0.8, 0.4, 1.07), stig (−0.8, 0.4, −1.07): Stig 73 px, Ole 64 px, both facing 0.59. Grisfest: stig
  (0, 1.5, −1.07), ole (1.6, 1.4, 1.07): Ole 55–56 px 0.65, Stig 62 px 0.48. Six arrival sides each
  (`s7`, `s11`: 0, ±30, 90, 180, 270; side 0 is the straight walk from the spawn): identical, no
  NEAR on any line (the critic measured NEAR ×5–10 from side 0). **Flowers timer checked:**
  `geom` probe: `approachSpot('flamenco')` = `lmOffset('flamenco', 0, 1.5)` = (−4, −9.5), free;
  `calibrate` (`T.startMission`) warps to that spot and talks from it, so the measured start is
  unchanged and the flowers pool (n 28, timer 23) stands; a real player now always starts the
  flowers from the measured spot (before: wherever he talked from within 3.4 m). The optional porch
  post collider was not added (see follow-ups). §8.8, §8.12, fixture.
- **r3staging-5 · ugly · fixed** — room 113: Siv at `['rum113', 0.9, 3.0, π]`. Audit: x 563,
  46 px, facing 1.0, no occluder (was occ1 behind Angerud's head). §8.13 stage 4, fixture.
- **r3staging-6 · ugly · fixed** — new landmark `tongaSlump` (block (1,2) at (16.3, 17.4), yaw 0.5)
  = `tongatonga` offset (−2.3, 0.6), world (−143.7, −62.6): free ground, no solid (`geom`). Used
  by the Tonga scene's `place` and the `pickup` (which places its NPC at `at`). Audit: Berra in the
  frame of both lines about him, x 949–952, 6.9 m, slumped at the right of the group; Robban's line
  unchanged (57 px, 0.11). The parked car is 13.1 m from him; the pickup, the drive home and the
  carry are untimed, so no timer moves. §8.12 stages 7–8, §6.3 table, Appendix A, fixture.
- **r3text-2 · ugly · fixed** — runner.complete: when the end card follows (`pendingEndCard` on
  the last mission) the unlock is `g.unlock(name, { holdToast: true })` (applied and saved before
  the card, as before; a reload during the card keeps it) and the runner shows the returned toast
  after `playEndCard()`; `playEndCard` also starts with `hud.clearToasts()`. `realend` probe (the
  real `complete()` path): no toast at +0.3 and +1.8 s into the card (was the bodega toast across
  the wheelhouse), and "Pepes Bodega har öppnat – på baksidan av hotellet." under
  `NUEVA ESTOCOLMO KLARAT!` back at the pool, still up 2 s later (`probe/realend_back.png`). The
  §8.13 "After the outro" text already put the unlock after the card. §9.4 item 8, §10.3, §11.7,
  §14.3 API line.
- **r3text-4 · ugly · fixed** — `playEndCard` turns every `ANIM_FLAGS` pose off on the four it
  places (character.js's list, imported). `realend`: at the card's start Stig and Majsan still had
  `wings` on (the bug reproduced in the probe), at +0.3 s all four are off; `realend_a.png` shows
  the four arms down. §11.7.
- **r3text-3 · off-brand · fixed** — content/island.js `STAFF_CAST = ['lasse', 'affe', 'gabbe',
  'saljare']` and `OUCH_STAFF = ['Aj!' [N], 'Hoppsan!' [N], 'Det ingår inte i mina åtaganden!'
  [F*]]` as `BARKS.ouch.staff`; `Game.bark` picks Ole, local, staff (where the kind has a table),
  then Swedish. `staff` probe (missions 6 and 9, 60 draws per kind): the four draw only the staff
  run-over lines; their get-up and kicked barks stay the tourists' (no complaint in them); every
  other key and both pedestrian kinds unchanged. §14.10.
- **r3play-1 · bug · fixed** (a different `retryCar` than the critic's) — the bodega follow (s7)
  is a checkpoint: `retryAt: 'vischan', retryCar: { at: { x: −234, z: −143, yaw: 0 } }`
  (`VISCHAN_CAR`, the `parkCar` spot `VISCHAN_PARK = ['vischan', 0, 7, 0]` in world coordinates),
  **at the wheel**, not `park: true`: on foot the retry turns him to the stage's guide, which for a
  follow is the truck — from the vischan approach spot the aim is node (0,2), 111° from the car,
  so the car would be behind him. `grisfollow` probe (real flow to the follow): lose the truck →
  "Du tappade bort Grisbonden!" → E: stage 8:6 (cp 6), in his car (repaired) at (−234, −143) yaw
  0, camera yaw 0, the truck on its lane spot (−268, −117.3) with both busts, Berra and Robban
  hidden, tail not started (it starts within 40 m, as on the first attempt). Then the tail to the
  gate, the truck wrecked before getting in → "Du kvaddade Grisbonden…" → E: the same follow
  retry (was the 31 s vischan drive from the beach); after a second tail the jeep stage starts as
  normal (cp 8). `missions` data checks pass (`retryAt` set). Untimed stage: no timer. §8.9, fixture.

## Timers

None changed. The only timed stage whose start the round touches is grisfest's flowers, and its
placed start is `calibrate`'s start (above); no ledger samples were needed.

## Checks (final code)

- `node --check` on every changed js file: OK.
- `fullstory kinds missions endcard riocard`: `[t] done -> #13 idle`, no errors, **RESULT: PASS**.
- `api talk ui`: no errors, **RESULT: PASS**.
- `SHOTS=1 story`: `[t] done -> #13 idle stage 5 coins 7800`, no `scenario failed`, no errors,
  **RESULT: PASS** (`sheet_storyshots.jpg`: Viking Bar, José, Tonga, room 113, duet, vischan).
- Line audit (missions 5–12, 193 lines, no errors): `compare_base_fix.txt` against the critic's
  r3 baseline lists **no line worse**; better: Stig at the Viking Bar, Majsan's three intro lines,
  José's Mamma line; the remaining worst lines are by design (the paint lines over the FERRETERÍA
  cut, Lasse's PA line, the bodega cutaway in the party scene).
- Arrival sides: `s7`, `s9`, `s10`, `s11` (6 sides each), 144 lines, identical per line, no flags.
- Probes `geom staff realend grisfollow`: no errors.
- Text critic's `drift.mjs` / `tags.mjs`: only the known pre-existing diffs (the knäcke line's two
  tags, `rowSixComplaint`); no untagged new line.
- `story` (final code, last run before the commit): `[t] done -> #13 idle stage 5 coins 7775`, no
  `scenario failed`, no errors, **RESULT: PASS**.

## Follow-ups and known issues

- The reception porch's west post at about (−9.45, −6.45) has no collider (the critic's optional
  fix): the fixed intro shots make it moot for the two giver talks at `flamenco`, but `clearSide`
  still cannot see it for any other two-shot there, and the player walks through it. A world
  (collider) change, not done in the last round.
- The bodega follow's arrow still points at the truck while he is on foot after the vischan scene
  (first attempt; the car is 11.6 m ahead in view, the critic called it harmless). A `follow`
  `altTarget` to the car on foot would change the kind for all follows; left.
- In a probe that failed the handover 1 s after it began, the grisbonde's "Ta bilen, señor…" bubble
  was still up over the retry; in play the fail screen takes longer than the bubble.
- The held unlock toast shows with the 5 s completion banner (under it at 1280×720, the wide-banner
  column); it lasts about 4.1 s.
