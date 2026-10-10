# Phase 3, round 2, fixer `voices-ui-cast`

Repo: /home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan (main), port 8870.
Start: `2a19d7e`, tree clean. Scratch output (probes, logs, shots):
`<scratchpad>/out-p3-r2-fix-voices-ui-cast/`:
- `probe.mjs` (`TAG=before` / `TAG=after`, shots in `before/` and `after/`): `fit` (a seated Stig
  and Ole in every car type, head top against the roof), `van` (player in a van, the ice-cream van
  and the Guardia jeep, chase and side), `sedan` (Stig and Ole in a sedan and a hatch), `bubble`
  (tail tip against the head top on foot at the island and the gate, seated in 14B, in a car),
  `toastbanner` (the casthud probe plus an UPPDRAG KLART! banner over three radio toasts), `barks`
  (Ole, the porter, Josés mamma, the souvenir seller, Berra, Fru Storch, José and a tourist and a
  local pedestrian, each kicked, run over and getting up 40 times), `reboard` (Ole in asnan's
  market drive, Berra in the bodega drive), `timer`, `cup`, `pigs`.
- `pigs.mjs`: the grisbil pigs' extents against the rails and the bed-rider slots, per layout.
- Sheets: `sheet_bubbles.png`, `crop_bubbles.png`, `sheet_toasts.png`, `sheet_cup.png`,
  `crop_cup.png`, `c2.png`, `sheet_pigs.png`, `sheet_van.png`, `sheet_vanchase.png`,
  `sheet_sedan.png`, `sheet_cast.png`, `sheet_ui.png`.
- Check runs: `cast/`, `ui/`, `cabin/`, `full/`, `story/`, `storyshots/` with their `.log`.

All seven items were verified first, with a probe before the change and the same probe after it.
All seven are fixed; none was rejected or deferred.

## Items

**1. film-1 · off-brand · fixed.** Barks are now picked by speaker.
- **Verified:** `barks` (before). Ole, the porter, Josés mamma and the souvenir seller all drew
  from the same Swedish tables:
  - kicked: "Va fan, Stig-Helmer!" and "Var inte så typiskt svensk.";
  - run over: "Det är sista gången jag åker med SunTrip!" and "Och ändå har vi betalat
    bränsletillägg!";
  - getting up: "Det måste vara värmen.";
  - re-boarding: Ole said "Lämna mig aldrig igen!".
  Local pedestrians drew from the same OUCH table as the tourists.
- **Fix:** `Game.bark(ch, kind)` in main.js picks the table:
  - `BARKS[kind].ole` for Ole;
  - `.local` for `LOCAL_CAST` and for `randomPed` locals (`def.local`);
  - `.sv` for everyone else.
  The four call sites use it (`onCharHit`, `onGetUp`, `areaHit` for pedestrians and NPCs, and the
  carjack). `reboard` gives Ole `S.neverLeaveOle`, "Ikke kjør fra meg igjen!".
- **Ole's new tables** (`content/island.js`) are bokmål and in his cheerful, unflappable voice.
  They contain no names, because he also barks at the gate before the two have met (§14.10).
  - `OUCH_OLE`: "Au! Hva i all verden…", "Oi! Se deg for, da!", "Det gikk bra, det!", "Au, au…
    Godt jeg tok B-vitaminene mine i dag." (his vitamins, `research-characters.md` §2.2).
  - `GETUP_OLE`: "Tenk ikke mer på det." `[F*]`, "Ingen fare. Jeg har reisesyketabletter." `[F*]`
    (the bus line, extended), "Sånn ja! Helt normalt.".
  - `NPC_KICKED_OLE`: "Au!", "Au! Hva er det med deg?", "Ta det rolig, kompis!", "Oi! Er det
    sånn man gjør i Sverige?".
- **The local tables** are Spanish exclamations a Swedish player understands (§1.3, like the
  locals' "¡Cuidado!" in §6.7):
  - `OUCH_LOCAL`: "¡Ay, mi madre!", "¡Ay, ay, ay!", "¡Turistas!", "¡Cuidado!";
  - `GETUP_LOCAL`: "¡Madre mía…!", "Suecos…", "Nada, nada.";
  - `CARJACK_LOCAL`: "¡Ladrón!", "¡Mi coche!", "¡Policía!";
  - `NPC_KICKED_LOCAL`: "¡Ay!", "¡Señor, por favor!", "¡Loco!", "¡Basta!".
  Every new line is `[N]`, apart from Ole's two `[F*]` lines.
- **Beyond the critic's proposal:**
  - **José is in `LOCAL_CAST`.** He has the Spanish red ring and is a mamma's boy. His scripted
    lines stay Swedish.
  - **The tourist tables lost their Spanish lines.** "¡Ay, mi madre!", "Turister!" and "¡Ladrón!"
    were mixed into them; they now belong to the locals.
  - **The tourists' "Va fan, Stig-Helmer!"** became "Va fan håller du på med?". Strangers (Sulan,
    the security guard, Fru Storch) and the gate crowd, who bark before anyone has met Stig, called
    him by name.
- **Evidence:** `barks` (after). Ole now says only the Norwegian lines, the Spanish cast and the
    local pedestrians only the Spanish ones, and Berra and Fru Storch the Swedish ones. In
    `reboard`, Ole says "Ikke kjør fra meg igjen!" and Berra "Lämna mig aldrig igen!". Shot:
    `after/bark_ole_kicked.png`.
- **DESIGN:** §1.4, §6.7, §11.5, §14.1, §14.3, §14.9, §14.10.

**2. casthud-3 · ugly · fixed.** The toast column moves under a wide banner while it shows.
- **Verified:** `toastbanner` (before). ¡GUARDIA CIVIL! covered both radio toasts by ~3 880 px²
  each, and UPPDRAG KLART! covered two of three by ~4 660 px².
- **Fix:**
  - `hud.showBanner` compares the banner's layout box (not affected by the pop-in transform)
    with the column's left edge. If the banner reaches the column, it gets cls `wide` and sets
    `--banner-drop` on `#hud`: half the banner's height, plus its tilt's reach, plus 12 px. The
    `intro` card in the top bar is never `wide`.
  - CSS: `#hud:has(#banner.show.wide) #toasts { top: calc(32% + var(--banner-drop)) }`, and
    `40 %` while the objective card shows, with `transition: top 0.25s`. The column goes back up
    when the banner fades.
- **Why not CSS alone:** the critic's `:has` rule would also move the column under narrow banners.
  This way the column moves only when the banner really reaches it, and only as far as needed.
  A `:has` on the classes still follows the objective card coming and going while a banner is up.
- **Evidence:** `toastbanner` (after): overlaps 0 / 0 and 0 / 0 / 0, and the column is back at
  196 px after the banner. Sheet `sheet_toasts.png`; `ui/ui_hud.png` and `ui/ui_glyphs.png` show
  the toasts under the banner.
- **Note:** at 1280×720 a third toast under UPPDRAG KLART! ends at y 578. With the speedo up
  (top 565), that is a 13 px overlap for the banner's 2.6 s.
- **DESIGN:** §11.4, §11.7.

**3. casthud-4 · ugly · fixed.** Speech bubbles now anchor at the real head top.
- **Verified:** `bubble` (before). The tail tip stood well above Stig's head:
  | where | gap |
  |---|---|
  | on foot, island | 55 px |
  | on foot, gate | 39 px |
  | seated in 14B | 113 px |
  | seated in a sedan | 134 px |
- **Fix:** `tickBubbles` anchors at `root.localToWorld(0, model.headTop, 0)` (after
  `updateWorldMatrix`). That covers plane seats, car seats (scaled about the hips, and the lowered
  seat of item 6) and any lean. The tail tip stops `BUBBLE_GAP` 6 px above the head (tail
  `BUBBLE_TAIL` 11 px).
  - **Flung and fallen bodies** keep the steady `y + height`. A spinning head would drag the
    bubble round, and an "Aj!" said in the air would drop to the pavement on landing.
  - **Plain anchors** `{ x, y, z, height }` (overhear spots, the Guardia bust's taunt) use their
    own head height, without the old + 0.6 m.
- **Evidence:** `bubble` (after): Stig's gap is 5 / 2 / 5 / 6 px for the same four cases. The NPC
  gaps (39–51 px) are bubbles stacked above Stig's; they are not anchor errors. Sheets
  `sheet_bubbles.png` and `crop_bubbles.png`.
- **DESIGN:** §11.4.

**4. playtest-8 · ugly · fixed.** The objective timer rounds up.
- **Fix:** `c = max(0, ceil(t − 1e-6))`, shown as `m:ss`, `urgent` at `c <= 10`.
- **Evidence:** `timer`, `setObjective` fed fixed values.
  - Before: 6.0 → 0:06 only at exactly 6.0, so from the stage's first frame 5.999 / 5.01 → 0:05,
    and 0.6 / 0.01 → 0:00.
  - After: 6 / 5.999 / 5.01 → 0:06, 0.6 / 0.01 → 0:01, 0 → 0:00, 10 / 9.99 → 0:10 in red,
    10.2 → 0:11, 59.4 → 1:00.
- **Urgency:** it turns red at the same moment as before (t ≤ 10). It now reads 0:10 where it read
  0:09.
- **DESIGN:** §11.4.

**5. casthud-6 · ugly · fixed.** The grisbil's back two pigs are inside the rack.
- **Verified:** `pigs.mjs` with the shipped layout. The rear pigs reached z −2.67 / −2.70 against
  the rail at −2.42. They also overlapped the 0.3 m rider circles at −0.3 L.
- **Fix:** the back two pigs stand across the bed, snout to snout and a little apart: (−0.47,
  −0.41 L, π/2 − 0.12) and (0.47, −0.425 L, −π/2 − 0.12), both at scale 0.72.
  - In x they stay within −0.85…0.85, inside the side rails at ±0.90.
  - In z they stay within −2.39…−1.87, inside the rail and clear of the rider slots.
  - They do not intersect each other.
- **Why not the critic's options:** moving them to −0.37 L put their rumps in the rider slots.
  Turning them forward (ry ±0.4) left their tails out over the tailgate.
- **Evidence:** `before/` and `after/pigs_rear|top|side.png` (sheet `sheet_pigs.png`) and
  `cast/cars_grisbil.png`.
- **DESIGN:** §6.6 table.

**6. casthud-7 · ugly · fixed.** A seated character who is too tall sits lower.
- **Verified:** `fit` (before). At the 0.72 scale floor, Stig's head top stood above roofY in six
  car types:
  | car | above roofY | above the roof's top |
  |---|---|---|
  | van | 0.15 m | 7 cm (the slab is `top − 0.12 … top`) |
  | Guardia jeep | 0.20 m | 1 cm |
  | sedan, taxi | 0.19 m | inside the 0.13 m roof slab |
  | hatch | 0.17 m | inside the roof slab |
  | wagon | 0.15 m | inside the roof slab |
  The ice-cream van, the pickup, the grisbil and the buses already fit. Ole fits everywhere.
- **Fix:** in `main.seat`, a character who is still taller than the room at fitScale's 0.72
  floor sits lower by the rest: `hips −= max(0, h·k − (roofY − hips))`. The rule applies to every
  seated character, not only the player, so it also covers any tall NPC.
- **Why not the critic's options:** a lower clamp (0.62) would shrink Stig visibly. Moving the
  `tall` seat height would also move every driver bust in vans, the ice-cream van and the jeep.
- **The legs:** car-seat legs stick out almost level (−1.45 rad), so lowering the hips does not
  push the feet through the car's floor.
- **Evidence:** `fit` (after): every type is at or under roofY. Shots: `sheet_van.png` and
  `sheet_vanchase.png` (the black tuft on the van's roof is gone), and `sheet_sedan.png` (in a
  sedan and a hatch both heads sit in the window band).
- **DESIGN:** §6.6 "Occupants".

**7. flight-9 · ugly · fixed.** New anim flag `cupHeld`: the existing `cup` prop in the right
hand.
- **Pose:** seated, the arm goes up as with `cupUp`. Standing, the arm is held out at shoulder
  height (−1.65 rad).
- **Where it is used:**
  - the "Ja." cue in juice (`missions/flight.js`, the fixture, §8.3);
  - the trolley stewardess's serving stops (`cabin.stepPusher`, §5.8).
- **Where it is not:** `cupUp` stays the empty-handed arm of the luggage stowers. It also stays on
  the juice carry, where the carried juice is its own mesh.
- **Registered in:** `ANIM_FLAGS`, the held-item `busy` test, the runner's end-of-mission reset,
  `castsheet`'s flag rows, and a `vardinna2 cupHeld` figure in `cast_flags_story`.
- **Evidence:** `after/cup_stig.png`, `after/cup_trolley.png` (crops `crop_cup.png` and `c2.png`:
  a white cup with an orange juice top in her hand), and `storyshots/fl_juice_cup.png` (the cup on
  "Ja." in the story).
- **DESIGN:** §5.8, §8.3, §14.6, Appendix A.

## Checks

| run | result |
|---|---|
| `node --check` (all 13 changed js/mjs files) | ok |
| `castsheet cars heads` | `def checks ok`, no errors, **RESULT: PASS** |
| `ui skandal talk` | no errors, **RESULT: PASS** |
| `cabin trolley` | no errors, **RESULT: PASS** |
| `fullstory kinds missions` | `done -> #13 idle stage 5 coins 7750`, no errors, **RESULT: PASS** |
| `story` | `[t] done -> #13 idle stage 5 coins 7775`, no `scenario failed`, no errors, **RESULT: PASS** |
| `FROM=2 TO=3 SHOTS=1 story` | **RESULT: PASS** (the juice cup shot) |

No timer, route, stage, autopilot or timed world geometry changed, so there was nothing to
re-measure. The pigs and the seat height are not on a timed route.

## Follow-ups for other groups

- **Bubble stacking (hud).** When two speakers' bubbles overlap, the newer one stacks above the
  older, and its tail points at the bubble below rather than at its speaker. Examples: Ole beside
  Stig on foot, in 14A/14B, in a car. This is not new, but it shows more now that the bubbles sit
  close to the heads. A sideways nudge, or a tail aimed at the speaker, would read better.
- **Speedo (hud).** In a car, the third toast under a wide banner touches the speedo's top edge
  by 13 px at 1280×720 for the banner's 2.6 s (see item 2).
