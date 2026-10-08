# Phase 2, step 1: merge report

Repo: /home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan (main), tag `phase2-merged` = 175b26c.

## Result

All 11 Phase 1 branches are merged in the §15.3 order with `--no-ff`. There were no conflicts, because owned files are disjoint. The scenario list has no duplicate names after the merges (B's propsheet, riocard, islandstats and islandtour; A2's phases, sceneryPeek, flightseq and dc8; G's calibrate).

| merge | commit | node --check | start title |
|---|---|---|---|
| p1-E | a7e4ead | clean | PASS |
| p1-B | 6beb14f | clean | PASS |
| p1-C1 | 101d9aa | clean | PASS |
| p1-C2 | e01091c | clean | PASS |
| p1-D1 | d2f6b9c | clean | PASS |
| p1-D2 | b703d59 | clean | PASS |
| p1-A2 | a6061be | clean | PASS |
| p1-A1 | 996af0e | clean | PASS |
| p1-H | 303a9a9 | clean | PASS |
| p1-F | 5ad4ea6 | clean | PASS |
| p1-G | cca8ae5 | clean | PASS |
| fix + DESIGN changelog | 175b26c | clean | PASS |

Checks run after the last merge, all PASS with no console errors:
- `api levels`: PASS.
- `story`: `[t] done -> #13 idle stage 5 coins 7800`, RESULT: PASS. Log: scratchpad/p2/story1.log.
- `cabin flightseq`: PASS. This is the A1 cabin under A2's real airframe, every phase plus the takeoff-to-landed sequence.
- `views` (VIEWS=flamenco,suntrip,plaza,airport,bodega,grisfest,fyren) and `castsheet`: PASS.
- D2's probe shots `dc8`, `dc8_far`, `gando_3q`: PASS. The probe is copied to scratchpad/p2/d2probe.mjs, pointed at main.

## Visual check of the merged build (contact sheets in scratchpad/out-p2/)

- `sheet_cabin.png`: the cabin in every phase (gate, takeoff, climb, cruise, approach, landing, landed, cut-away, row 14). The A2 sky and ground show through the windows with the right colours, and nothing cuts through the cabin.
- `sheet_seq.png`: A2's flightseq run through the A1 cabin. No breakage.
- `d2/sheet.png`: the Gando airport with the parked DC-8 on A2's real airframe. It sits on its gear on the apron, D2's measurement worked, and no extra hull was added. **Fixed:** the fuselage belly showed striped shadow acne. In coast.js parkedDC8 the airframe meshes now have receiveShadow = false; they still cast onto the apron (`d2/d2_dc8.png` after the fix).
- `sheet_merged.png`: Hotel Flamenco, SunTrip, the plaza, the airport, Pepes Bodega, the Grisfest gate, the cast lineup, the cast busts and the cabin with busts. No merge-level breakage.

## Seen but left for later steps (not merge breakage)

- The `view_suntrip` shot has a street palm filling the left half of the frame. This is B's palm-near-kerb gap and a camera/staging issue.
- Integration-input contract changes are untouched, as §15.3 step 2 asks. The cabin.js scenery pitch write is harmless for now, because A2's tick wins every frame. Also untouched: the landmark table patches for flamenco/suntrip/plaza (already applied at runtime via f.mark), E's seatY/bust-fit, the .gitignore `node_modules`, the fixture update, and so on.
- DESIGN.md has a new "Changelog (Phase 2)" section that records the merge and the DC-8 shadow change.
