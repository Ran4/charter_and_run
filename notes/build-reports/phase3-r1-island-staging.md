# Phase 3 · round 1 · fixer "island-staging"

Area: the island missions' scenes, staging and film text (WP-G content, indices 5–12). Files touched:
`src/game/missions/island.js`, `src/content/island.js` (tags only), `src/actors/models.js` (the new
portrait-only `telefonist` CHARS entry only), `src/main.js` (`RADIO_ONLY` only),
`src/world/landmarks-island.js` (three new cut anchors only), `tools/fixtures/full-missions.js`,
`tools/story/island.mjs` (two arrival warps), `DESIGN.md`. No file outside the group's list.
Port 8870; scripts, shots and logs in `<scratchpad>/out-p3-r1-island-staging/` (ad-hoc, not in the
repo): `audit.mjs` (the staging critic's line-by-line audit, copied: plays the story 5–12 with
`autoDialog` off, measures every speaker and shoots every line), `sx.mjs` + `sx-exps.mjs` (one scene
at a time with in-page def mutations and camera candidates). Audit runs: `base/` (HEAD before my
work), `a1/` (first pass), `a2/` (final staging); `sx/` the candidates.

Tree at start: clean (no orphaned work from an earlier fixer).

## Items

| id | verdict | how / why |
|---|---|---|
| staging-1 | **fixed** (own staging) | Reproduced (`base/lines/m10_115..117`: Mamma 16–21 m out, a wide shot; after spine's camera work no longer inside a house). The critic's place-only fix (`a1`) put Siv and Majsan in front of Mamma from one side of the two-shot (`a1/lines/m10_116`, Mamma's head behind Majsan; the critic's own `fatagafix_08` shows the same). Now a fixed shot from the square: new cut anchor `dukarCam` (= `fatagaDukar` turned round), `cam: { at: 'dukarCam', dist: 7.5, height: 2.1 }`, no `frame`; Mamma faces the camera with the tablecloths behind her, Fru Storch and the sisters either side, half turned to her (`a2/lines/m10_115`, `m10_116`). §6.3, §8.11, fixture. |
| staging-2 | **fixed** | Reproduced (`base/lines/m11_137`: the arcade pillar). As proposed: `cam: { at: 'tongatonga', dist: 6, height: 2.6 }`, `frame` dropped, the group in front of the sign. In the story the car was warped onto the landmark and stood in the middle of the street shot (`a1/lines/m11_137`); a player arrives from the street and the goto ends at the 10 m radius, behind this camera, so the story now arrives 9.5 m short of the club (`a2/lines/m11_137`, `shots/isl_grisfest_tonga.png`). §8.12, fixture. |
| staging-8 | **fixed** (own row) | Reproduced (`base/lines/m11_129..135`: 46–57 px, backs). Stig is placed at `dansgolv` (−0.2, 1.6), the calibrate Tonga start `approachSpot('dansgolv')` within 0.2 m, so `grisfestTonga` keeps its T_ref (no re-measure). With only Stig added, Ole stood behind Stig from one side (`a1/lines/m11_131`); now a row across the floor (Ole, Stig facing Majsan, Siv) that the two-shot sees in profile from either side (`a2/lines/m11_132`, `shots/isl_grisfest_dance.png`). §8.12, fixture. |
| staging-9 | **fixed** | Reproduced (Berra/Robban/Ole 62–87 m away). As proposed: everyone who speaks in one group shot, `outroCam: { at: 'friskotek', dist: 6, height: 2.4 }` (`a1/lines/m06_034`, `m06_042`, `m06_045`; `shots/isl_friskotek_hepaare.png`). §8.7, fixture. |
| staging-3 | **fixed** (plus placement) | Reproduced. The group-shot cut on "Invalido." at `{ at: 'airport', dist: -10, height: 3.2 }` (the critic's cand0; −12/3.6 was smaller). In that shot Stig stood between the camera and Lasse (`a1` audit: Lasse HEAD-OCC by Stig, Stig's back), so the same cue places Lasse and Stig half turned to each other and the camera and Robban towards the camera and Berra (`a2/lines/m05_001..013`: every speaker in, none occluded). §8.6, fixture. |
| staging-7 | **fixed** (higher camera) | Reproduced (backs, Stig in shot). Placement as proposed (both face the street, Stig moved out). The 4.5/2.0 cut was blocked by the player's car at the door (`a1/lines/m07_068`); candidates with a car 3 m out (`sx/vik1_08_*`): `{ dist: 6.5, height: 3.4 }` sees over it. The story now parks 6 m short of the door, inside the 7 m radius, as a player does (`shots/isl_asnan_vikingbar.png`). §8.8, fixture. |
| staging-10 | **fixed** | As proposed (everyone at the fold; `a1/lines/m10_119`, `m10_120`: Mamma and Majsan in shot). The two-shot's side still follows the arrival, so Majsan can stand in the foreground at the frame edge; every speaker is visible. §8.11, fixture. |
| staging-11 | **fixed** | As proposed, Ole at (−1.4, 4.4) (`a2/lines/m05_014`: Ole beside Lasse, not behind Stig). §8.6, fixture. |
| filmIsland-1 | **fixed** | Checked research-plot §7.12 ("Hytt två", said in English by the station clerk) and §8.3 (the Spaniards say "heltokiga"). New portrait-only `telefonist` ("Telefonisten", ES skin) in CHARS and `RADIO_ONLY`; "Hytt två!" is his; "De där svenskarna är heltokiga!" is the porter's, who now stands at the side of the party shot beside the pool-deck tree (at his desk he was 39 m from the camera; a first spot at (−5.5, 3) was inside the tree; `a2/lines/m12_177`). The grisfest radio "Vad skickliga de är!" keeps `pax`. §2.1, §2.3, §14.2, App. A, §8.9, §8.13, fixture. |
| filmIsland-4 | **fixed** | "Vi kan be resepsjonen sette blomster på rommet deres." in code, §8.12, fixture. |
| filmIsland-6 | **fixed** | Checked each against research-plot §7.2/§7.9/§7.11/§7.12/§8.1 and research-characters (SUB-NO has only "Jeg gir deg to hundre."). Retagged as proposed; mirrored in §8.6/§8.8/§8.9/§8.12 and the fixture comments. |
| filmIsland-7 | **fixed** | §1.4: relocated film lines are `[F*]`. Six pickup barks and `complete` → `[F*]`, Herr Storch's "Lite film." → `[F*](t)` (as CHATTER_FLIGHT), Lasse's fenor line → `[F*]`. §10.1, §14.10. |
| BL-4.2-3 | **fixed** (restaged, larger than proposed) | Reproduced (`base/lines/m05_017`, `m05_018`: room 113, the porter alone). New cut anchor `rum107Cam` (= `flamencoPatio` turned round). From "havsutsikt" on, the outro plays in room 107 (`{ at: 'rum107Cam', dist: 5.5, height: 2.1 }`, held to the end): Stig in the doorway, the porter beside him with the mirror up on "Momento.", Ole inside at his boombox; the porter goes back to the desk on Ole's line. research-plot §7.3 puts "Ole möblerar för bergsprängaren" and the clothes talk in the room, so the rest of the outro belongs there (`sx/mom2_*`, `a2/lines/m05_017..022`, `shots/isl_buss17_momento.png`, `isl_buss17_outro.png`: the hawaii shirt goes on in the room). The mirror's glass reads as the pale-blue disc held out to the camera. §6.3, §8.6, fixture. |
| BL-4.2-2c | **fixed** (own camera) | Reproduced (porter HEAD-OCC by Angerud ×3). The proposed `{ at: 'flamencoRecepcion', dist: -6 }` would look 2 m ahead at the floor (cutTo looks at `at + forward·4`), so a new anchor `recepcionCam` (= `flamencoRecepcion` turned round) with `{ dist: 7.5, height: 2.0 }`: the camera south of the porch, the fascia above the frame, the garland baubles a band at the top; side-on placement as proposed (`sx/porterP1_*`, `a2/lines/m11_139..144`, `shots/isl_grisfest_porter.png`). §6.3, §8.12, fixture. |
| BL-4.2-1 | **fixed** (cut) | Reproduced (`base/lines/m12_158`, `m12_160`). A placement alone depends on where the player pressed E (the two-shot's side), so the knock line cuts to room 107's patio (`{ at: 'rum107Cam', dist: 7.5, height: 2.1 }`, held to the end of the intro) and places Ole, Stig (on his approach spot, the collect start the calibrate assumes: no re-measure) and the man from the airport facing him (`sx/hitteH2_*`, `a2/lines/m12_157..164`, `shots/isl_julafton_hammarby.png`). §8.13, fixture. |
| staging-13 | **fixed** (plus a cut change) | As proposed: Mamma yaw 0, the cut `{ at: 'grillpacoMamma', dist: 5, height: 1.9 }` (`a2/lines/m09_102`). Siv was outside that cut on her own line (`a1` audit SPEAKER-OFFSCREEN); a wider cut showed a pergola post (`sx/mam1_10_siv_cand0`), so the `cut: null` moved from José's reply to Siv's line (back to the José/Siv two-shot; `a2/lines/m09_103`). §8.10, fixture. |
| staging-14 | **fixed** | As proposed (`a1/lines/m09_106`, `a2/lines/m08_092`, `m08_093`: the sisters face the cut). §8.9, §8.10, fixture. |
| staging-24 | **fixed** | Julafton outro: the Rio four (`a2/lines/m12_193`: Ole in shot for "Og så Rio!"). Grisfest warm nights: `hide: ['siv']` on that cue instead of a spot away from the deck (placeNpcs(true) brings her back after the mission; `a2/lines/m11_146`). §8.12, §8.13, fixture. |
| staging-22 | **fixed** | As proposed (`a2/lines/m11_145`: Angerud on his 113 patio). §8.12, fixture. |
| staging-19 | **fixed** | As proposed (`a2/lines/m08_083`: Angerud at booth 2). §8.9, fixture. |
| staging-21 | **fixed** (partly) | `exitCar: true`: Stig steps out and is in shot (`a2/lines/m08_078`; seated, the car roof was the speaker). The follow after it starts once he is back in a car (`follow` shows "Hoppa in i en bil" until then; the story's `followCar` re-enters, story PASS). Left: the two-shot still comes from behind the car (the side the chase camera was on), so Stig shows his back, and Robban, dropped beside Berra, can hide Berra's head (`a2` audit HEAD-OCC robban). The drop-off spots are dynamic (exit spots of wherever the car stopped within 9 m), so a fixed fix needs placed people and a fixed camera clear of the car: round 2. §8.9, fixture. |
| filmIsland-8 | **fixed** | As proposed (`a2/lines/m12_190`: "SIVAN …" with the caption). §8.13, fixture. |

## Follow-ups handled

- (spine) 'Heia Norge!' shows no dancers: fixed (staging-8).
- (world-town) the Tonga camera in the La Medina arcade: fixed (staging-2).
- (cast-vehicles) the Momento restage with the turned mirror: done (BL-4.2-3).
- (audio-ui-meters) the samba unlock toast `<b>Musik: samba</b>` vs the pause button's
  `MUSIK: SAMBA`: **rejected**. The toast is Nunito, where sentence case is the house style; the
  pause button is uppercase because all Luckiest Guy text is (audio-ui-meters' own r1 rule).
- (cabin-flight, flight-missions) the story warps onto NPC landmarks: for the two island scenes
  where that put a car in the shot (Tonga Tonga, Viking Bar) the story now arrives as a player does.

## Checks (all on the final code)

- `PORT=8870 node tools/shot.mjs fullstory kinds missions transition` → `RESULT: PASS` (fullstory
  plays the updated fixture to `done -> #13`; kinds incl. "checkpoint retry re-applies night + vals
  and revives plates at dansgolv"; missions data checks clean: the new speaker and anchors resolve).
- `FROM=5 SHOTS=1 PORT=8870 node tools/shot.mjs story` → `[t] done -> #13 idle`, `no errors`,
  `RESULT: PASS`; 27 key-scene shots in `shots/`, sheets `sheet-story-a.png`, `sheet-story-b.png`.
- Staging audit 5–12 (`a2/audit.json`, 193 lines): every restaged speaker on screen and unoccluded;
  remaining flags are outside this group (haggle, paint scene, friskotek intro, see below) or by
  design (voices without bodies: `telefonist`, `levander`, Lasse's PA; the bodega cutaway).
- Full story: `PORT=8870 node tools/shot.mjs story` → `[t] done -> #13 idle stage 5`, no `scenario
  failed`, `no errors`, `RESULT: PASS`.

## Timers

None changed, no re-measure. The two scene placements that set a timed stage's start keep the
calibrate assumption: the dance scene's Stig spot is `approachSpot('dansgolv')` within 0.2 m (the
calibrate Tonga start, T_ref 19.0), and the julafton knock cue puts Stig exactly on
`approachSpot('flamencoPatio')` (the guests round-up start, T_ref 72.4).

## Follow-ups for other areas

- spine / island staging (round 2): the haggle talks frame the seller from behind (`a2` audit:
  souvenir BACK −0.82…−0.84 on all seven of his lines, `base` the same), and Ole's pickup bubble
  "Til markedet!" is still up on the first haggle line.
- island staging (round 2): bodega vischan scene, see staging-21 (Stig's back, Robban can hide
  Berra); a fixed composition needs the three placed and a camera clear of the stopped car.
- island staging (round 2): friskotek intro, Fru Storch's "Vi heter faktiskt Storch, inte Stork." is
  said off screen with her back 3.9 m from the giver two-shot's lens (`a2/lines/m06_030`); a cut to the
  group on Lasse's "Finns det en familjen Stork här?" would fix it (the friskotek outro's 6/2.4 group
  camera is a starting point).
- island staging (round 2): the asnan paint scene ("Och blommor där."): Stig's head is behind the
  car roof in the seated two-shot (`a2` audit HEAD-OCC car:hatch); Ole is 34 m from the FERRETERÍA
  cut by design.
- island staging: the fataga outro's two-shot side still follows the arrival (Majsan can stand in
  the foreground at the frame edge); a fixed `outroCam` would need a fold-side anchor.
