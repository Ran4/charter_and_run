# Phase 2, step 5: docs

Commit `295477d` on main, tagged `phase2-docs`. Not pushed.

## What changed

- **README.md** is rewritten. The player-facing overview is in Swedish:
  - premise
  - how to run: `make run` → http://127.0.0.1:8840, which the user starts themselves; also `make serve`, `NOOPEN`, `?fresh`, `?mission=N` and the save key
  - a controls table with a column for each level (island on foot, island in a car, gate/cabin), plus the gamepad
  - cast
  - the 13 missions: title, giver and a one-line description each, plus the tight-timer note
  - Oles prylar, hajfenor, pesetas, SKANDAL (Guardia, ¡MULTA!, porter bribe, the Storch witness) and the unlocks
  - the DESIGN §1.6 invented list, in Swedish
  - the §1.4 source-tag table
  - credits: the film's full title; Grisfestvärden and Städerskan; no real people's names outside film quotes (§1.5); music is synthesised plus public-domain trad tunes
  - disclaimer: a fan game; SunTrip and the signs are fictional; no affiliation
- **README.md**, continued: the code map and the headless-test commands are in English, matching the old README. They cover every scenario, `FROM`/`TO` and the `RESULT:` line.
- **CLAUDE.md** (project):
  - Title Charter & Run. Port 8840, and never run `make run`/`npm start`. Harness default 8841, `PORT`/`OUT`.
  - The story must end `[t] done -> #13 idle` with `RESULT: PASS`. Also `FROM`/`TO`/`SHOTS`, the scenario list grouped by module, and the test mode and test hooks.
  - Kept Bigmouth conventions: yaw, CURB and solids, GeoBuilder, teleport snapping, `fx` shadowing, one-shot inputs.
  - New conventions:
    - camera ceilings
    - the canonical landmark table
    - the level system and the cabin at x = 3000 (`CABIN_X`), with flightScenery as the only writer of pitch
    - `PLAYER_BOOST` 1.2 and `oppSpec`
    - the tight-timer rule (measure, never pad)
    - AI buses turn left only
    - source tags and language rules
    - Ole pays
    - frozen-file history
    - the `p1-<WP>` worktrees: leave them alone; tags; never push
- **Makefile**: the run message says "Charter & Run on …", and the `test` comment says 13 missions. `make -n test` gives `node tools/shot.mjs story`.
- **package.json**: `name: charter-and-run`, a new description, and `test` → `node tools/shot.mjs story` (it was the nonexistent `tools/test.mjs`). In **package-lock.json**, `name` is changed in both places.
- **src/world/blocks/stub.js** is deleted. Nothing imported it, and DESIGN §14.1 said to delete it once unused.
- **DESIGN.md**: the §14.1 rows for stub.js and the docs are updated, and a "Docs (§15.3 step 6)" entry is added to the Changelog (Phase 2).
- **../CLAUDE.md**: re-read right before editing. It still said `bigmouth_and_run/`, so only that pointer changed, to `charter_and_run__sallskapsresan/`. That folder is not a git repo, so this change is not in any commit.

## Checks

- `node --check` passes on every .js/.mjs file under src/ and tools/ (fails=0).
- `PORT=8870 node tools/shot.mjs start title levels views` → `no errors`, `RESULT: PASS`.
- `PORT=8870 node tools/shot.mjs story` → `[t] done -> #13 idle stage 5  coins 7825`, no `scenario failed`, `no errors`, `RESULT: PASS`.
- Logs are in scratchpad/p2/s5/ (sanity.log, story.log) and the shots in scratchpad/out-p2/s5.

## Open items (not docs)

- `src/world/props.js` still holds the old Bigmouth prop types as `OLD` aliases (mailbox, trashcan, …). The comment says "until Phase 2 removes them". Nothing places them. I left them because removing them is a code cleanup, not a docs change; Phase 3 can do it.
- Comments in camera.js, level.js, audio.js and car.js still say "Bigmouth" where they describe engine heritage. That is accurate and was left as is.
