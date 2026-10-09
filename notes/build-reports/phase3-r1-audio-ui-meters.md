# Phase 3 · round 1 · fixer `audio-ui-meters`

Port 8870, OUT `<scratchpad>/out-p3-r1-audio-ui-meters/`. Tree clean at start (after f2c2a23).
Every item was reproduced first (critic shots, code read, ad-hoc scripts `adhoc.mjs`, `dbg1-4.mjs`
in OUT, not in the repo).

## Items

| id | result | how |
|---|---|---|
| hud-1 | fixed | `hud.toast(text, cls, secs)`: up `min(7, max(2.4, 1 + 0.06·chars))` s (99-char PANIK toast 6.9 s, was 2.2 s); a 4th live toast fades the oldest. RadioSeq gaps checked: buss17's tour lines (gap 8–9 s) never overlap; the 2–3 s exchanges stack 2–3, within the cap. |
| hud-3 | fixed | `#objective.show ~ #toasts { top: 196px }`. Measured on grisfest stage 0's real radio line: objective bottom 144 px, toast top 196 px at 1280×720 and 1024×576 (was 7×40 / 115×40 px overlap). |
| hud-10 | fixed | `startPursuit` stores `shame.tuneBefore` (a mission tune, else null); `endPursuit` restores it, else `g.levelTune()` read at the end. Checked in page: vals → skandal → vals; sol → skandal → samba (samba chosen meanwhile). grisfest `onEnd` uses `g.levelTune()`. |
| hud-11 | fixed | `pta()` in the ¡MULTA! sub ("1 500"), `completeSub` ("+2 000 pesetas") and the Ole-pays toast. |
| flight-10 | fixed (other placement) | The title card shows while the intro plays, but in the **top letterbox bar** (cls `mission intro`: one line, top 4.5vh, main `clamp(22px, 5vh, 40px)`, no tilt), not at 18 %: in the intro two-shots the faces sit at 20–38 % of the height, so 18 % would cover them. 3.2 s, plus the `start` jingle; hidden when the intro ends if still up. A def without an intro gets the old banner after the talk for 1.4 s (none exists). No stage timer touched. Shots: `talk_0`, `a_intro_m0`, `a_stage0_m0`, story `isl_buss17_intro`, `isl_friskotek_balls` (no banner over the timed stage). |
| staging-20 | fixed | `hud.hideBanner()` right before the outro dialogue (`a_outro_first`: no banner on the first outro line). |
| hud-6 | fixed | `.bubble` wraps at 300 px (`width: max-content; max-width: 300px`, centred); `tickBubbles` clamps x to the screen (8 px), keeps the top ≥ 96 px (coins/meter row) and below a shown objective card it overlaps, and hides a stacked bubble with no room above until the ones below end. The length floor is in `game.say` (not `hud.say`) so `sayEnd`/`saying()` stay true: `max(secs, (1 + 0.045·chars) × (test ? 0.5 : 1))`. Shots `a_bubble_wrap`, `a_bubble_edge`, `ui_panik` ("Lite film." now under the heart). Also covers cabin-flight's follow-up (stacked-bubble top clamp). |
| hud-4 | fixed | Bribe: the porter's line first (1 + 0.045 s/char, halved in test mode), then banner + flash + jingle (not if a new pursuit started). Bust: ¡MULTA! 1.8 s, then "¡Documentación!" 1.2 s while the officer lingers. Measured: line 1.81 s after the bust, banner gone. |
| hud-5 | fixed | `#banner { width: max-content; max-width: 94vw }`: the end-card quote and the glyph sub are one line (`endcard_rio`, `ui_glyphs`). `hideBanner()` now drops only `show`, so a banner fades where it stood (the intro card would otherwise slide down across the faces while fading). |
| hud-7 | fixed | `body:has(#letterbox.on) #objective.show { transform: translate(-50%, -220%) }`; haggle talk measured: card bottom −92 px (`a_haggle_letterbox`). |
| playtest-15 | fixed | `panicFailText: 'Stig-Helmer fick panik! Håll J: ”Jag kan flyga, jag är inte rädd.”'` `// [N] · the mantra [F]` (quotes as on the title card). `panic` still matches `/fick panik/`. |
| hud-8 | fixed | `layoutLabels(c, items, Sz, marks)`: the giver's "!" and the objective star are 13 px obstacles (cost ×4 like dots); their spots in 8 px steps are in the layout key. Gate map: SÄKERHETSKONTROLL now below its dot, clear of the "!" (`crop_gate_cmp.png`); ui label checks 23 / 5 labels, 0 problems. |
| BL-4.4-H1 | fixed | `upper()` (`toLocaleUpperCase('sv')`) in hud.js for banner mains (mission titles), the objective title, the dialogue name and big-map labels; uppercase literals for the title subtitle `SÄLLSKAPSRESAN`, pause buttons (`FORTSÄTT`, `MUSIK: PÅ/AV/SAMBA`, `LJUD: PÅ/AV`, `RADERA RESAN`, in index.html and strings.js), keycaps `WASD / PILAR` `MUS` `SHIFT` `SPACE` `J / KLICK` `ESC` and the `<b>SPACE</b>` prompt. No CSS text-transform. The coins' `pta` is left (its Luckiest Guy glyphs read as caps, `crop_coins.png`). |

Follow-ups handled in this area:
- spine: the GÄSTER n/4 toasts over the julafton party shot: `hud.runDialog` calls
  `hud.clearToasts()` at the start (story `isl_julafton_party`: no toasts).
- cabin-flight: stacked-bubble top clamp (hud-6).

Rejected: none. Deferred: none.

## Files outside the group's list (smallest changes)

- `tools/scenarios/meter.mjs` (skandal): the bribe banner now follows the porter's line, so the
  check waits for it (≤ 6 s) and first asserts the order (line shown, banner not yet). The
  assertions on pursuit, coins, meter and cooldown are unchanged.
- `tools/fixtures/full-missions.js`: grisfest `onEnd` `music: g.levelTune()`, in step with §8.12.

## Checks (all port 8870)

- `ui skandal` → `no errors`, **RESULT: PASS** (bribe line true, banner yet false; island labels 23 [], flight 5 []).
- `title endcard transition talk panic` → `no errors`, **RESULT: PASS**.
- `FROM=5 TO=7 SHOTS=1 story` → `[t] done -> #7 idle`, `no errors`, **RESULT: PASS**.
- `SHOTS=1 story` (full, final code) → `[t] done -> #13 idle stage 5 coins 7825`, no `scenario failed`, `no errors`, **RESULT: PASS**.
- `fullstory kinds` (fixture changed) → `no errors`, **RESULT: PASS**.
- `api missions` → `no errors`, **RESULT: PASS**.
- Ad-hoc: gate big map, intro card, bubble wrap/edge, toast cap (3 live of 5), tune restore, haggle
  letterbox, grisfest radio vs objective at 1280 and 1024, outro first line, bust line order.
- Contact sheets looked at: `sheet_ui.png`, `sheet_2.png`, `sheet_adhoc1.png`, `sheet_s57.png`,
  `st1-3.png` (story), `sheet_outro_bust.png`.

## Timers

None changed or re-measured (no route, car, stage start or world change; stage timers still start
at stage start, and the title card now runs during the intro).

## Follow-ups for other areas

- spine (runner.js `retry()`, outside my lines): the retry banner (`def.title` / `Försök igen!`,
  cls `mission`, 2 s, mid-screen) still covers the start of the checkpoint stage, the same problem
  as flight-10 on a retry (e.g. ombord's seat dash). Shorter, or a top placement.
- island content (`content/island.js:117`): the samba unlock toast says `<b>Musik: samba</b>`; the
  button now reads `MUSIK: SAMBA` (case only, Nunito toast).
- round 2 / hud critic: toasts now last up to 7 s, so a banner (z-index 2, 40 % with the objective
  shown) can cover the right end of a toast for up to 2.6 s; seen only in the `ui_hud` test state.
- cast/hud (minor): the player's bubble anchor is `height + 0.6` and Stig's `height` is 2.59 (hat),
  so with the close chase camera his bubble floats ~70 px above his head.
