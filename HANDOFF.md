# Charter & Run: hand-off to the next orchestrator (Phase 3, QA)

Written 2026-10-08, after Phase 2. You are taking over an **orchestrator** role: you plan and
run the QA loop with multi-agent workflows, verify the results yourself, and report to the
user. You do not hand-write the game yourself; small orchestration fixes (a config line, a note)
are fine.

The user writes in Swedish; answer in Swedish. Specs, code and comments stay in English; every
player-facing string is Swedish, and Ole speaks Norwegian bokmål.

This file replaces the Phase 0–3 hand-off of 2026-10-04 (it is in git history at `8f96395`).

---

## 0. TL;DR

- **The game is built, integrated and green.** All 13 missions play through:
  - The headless story ends at `[t] done -> #13 idle`, `no errors`, `RESULT: PASS`.
  - The Phase 2 gate saw 3 green runs in a row, every scenario passed, and `perf` held 60 fps
    everywhere.
- **Your job: Phase 3, the QA loop** (DESIGN §15.4):
  - Screenshot critics and a film critic report problems ranked by severity and owner area.
  - Fixers apply the fixes serially on `main`.
  - At most three rounds. The last one ends with three green `story` runs.
  - Then write the final Swedish report to the user (§6).
- **The backlog to start from** is §4 below. Every item in it is known; do not rediscover it.
- **Nothing needs asking before you start.** The user has already decided everything relevant
  (§2). Commits on `main` are allowed. Never push; there is no remote.

---

## 1. Where things stand

### 1.1 Repo and tags

Project folder: `/home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan/`.
It is its own local git repo, on branch `main`, with no remote.

| tag | commit | what |
|---|---|---|
| `phase0a`, `phase0` | 35e9e40 | the spine: level system, Game API, 18 stage kinds, runner, harness |
| `phase2-merged` | 175b26c | the 11 Phase-1 branches merged (E B C1 C2 D1 D2 A2 A1 H F G) |
| `phase2-contracts` | 98b5a67 | all Phase-1 contract changes applied, Rio end card wired |
| `phase2-balance` | 9be5dc5 | timers re-measured on the merged world; race, pursuit, haggle and fear tuned |
| `phase2-docs` | 295477d | README, CLAUDE.md, Makefile and package.json |
| `phase2` | c30b0ff | gate fix 1: closed race course, calibrate race outcome, jeep and home timers |

The commit after `phase2` adds this file, `notes/build-reports/` and a pointer in
`CLAUDE.md`. Use `git log --oneline` for the full history.

**Phase 1 worktrees and branches.**
- The branches `p1-A1 … p1-H` are merged. Their worktrees are in
  `/home/ran/src/html/everything_and_run/.wt/charter-<WP>`.
- Leave them alone. Don't run the game from them.
- The final report asks the user whether to remove them (§6).
- `.git/info/exclude` lists `node_modules`, because each worktree holds an untracked symlink.

### 1.2 Verified at hand-off

- `PORT=8870 node tools/shot.mjs story`, run by the orchestrator:
  - output: `[t] done -> #12 idle …`, then `[t] done -> #13 idle stage 5 coins 7775`, then
    `no errors`, then `RESULT: PASS`
  - about 190 s
- Contact sheet, reviewed by eye. All of these render correctly, with HUD, minimap and Swedish
  text:
  - the gate (security arch)
  - the cabin while climbing and with the trolley serving, cut away with the wings outside
  - Hotel Flamenco
  - the airport (AEROPUERTO DE GANDO)
  - Viking Bar
  - the grisfest gate
  - the Rio end card
- The Phase 2 gate (independent agent):
  - All 11 branches are merged and the tree is clean. `node --check` passes on all 61 files.
  - 3 × story PASS.
  - Every scenario passes: `start walk aerial drive traffic title talk missions gate cabin
    trolley turbulence panic phases views smash foot castsheet cars ui skandal transition api
    levels fullstory kinds calibrate` plus `endcard islandtour`.
  - `PLAYER_BOOST` is 1.2.
  - Island drive timers are 1.19–1.23 × the measured clean T_ref.
  - Docs are updated, including the `../CLAUDE.md` pointer.

### 1.3 Where to read

- **`CLAUDE.md`** (project): how to run and check, every scenario name, and the conventions that
  bite. Read it first.
- **`DESIGN.md`**: the design bible and module contracts, about 250 KB. Phase 3 critics and fixers
  read the sections for their area. Its changelogs at the end list every deviation from Phases
  0–2. It wins over `notes/`.
- **`README.md`**: the player-facing overview in Swedish, the code map and the test commands.
- **`notes/build-reports/`**: every agent's hand-off from Phases 0–2.
  - `phase0a.md`, `phase0b.md` and `phase0-polish*.md`.
  - `p1-<WP>.md`, one per package.
  - `phase1-integration-input.md`: all contract changes and reviewer gaps, collected.
  - `phase2-{merge,contracts,balance,stability,docs}.md`.
  - The **balance report** holds the full timer table and how it was measured.
- **`notes/research-*.md`**: film research in Swedish, sourced and marked "(osäkert)" where
  unsure. This is the film critic's reference.
- **`notes/engine-*.md`**: maps of the Bigmouth engine from before Phase 0. Trust the code over
  them.

---

## 2. Binding user decisions (do not re-ask)

- **Commits.** Local commits, tags and worktrees are allowed. Never push.
- **Bodega stage 9.** The Guardia-jeep chase stays. The jeep wreck steams instead of exploding,
  and the chase adds no SKANDAL.
- **Stand-in names** for real businesses are approved: CASA LOLA, LA MEDINA, CENTRO NÓRDICO,
  HOTEL LAS GAVIOTAS, BUNGALOWS LOS CACTUS, APARTAMENTOS VIENTO SUR, HOTEL MAR AZUL.
- **Player car speed.** `PLAYER_BOOST` = 1.2, not Bigmouth's ×2. The ×2 was a debugging
  speed-up.
- **Difficulty: tight, like Simpsons: Hit & Run.**
  - A clean run on a sensible route keeps about 15–20 % of the time. One big crash or a wrong
    turn fails it.
  - Timers are **measured, never guessed or padded**, per DESIGN §8 "Timers and difficulty".
    - Drive: `ceil(1.2 × T_ref)`.
    - On foot: `ceil(1.25 × T_ref)`, with 0.5 s per target added to T_ref.
    - Random stages use the 75th percentile.
    - Round up to whole seconds.
  - If QA changes a route, a car or the world, re-measure with `calibrate` / `calibflight`, then
    update the §8 table and the fixture `tools/fixtures/full-missions.js`.
  - Never make a test pass by loosening it.

---

## 3. How to run Phase 3

### 3.1 Workflow rules (learned in Phases 0–2)

- **Point agents at files. Don't paste file contents into prompts.** Give paths in the main tree
  by absolute path, for example "read DESIGN.md §6.3 in full".
- **Agents write their deliverables to files and return a short report through a `schema`.**
  An agent's return value is only its *last* message. Have critics write
  `<scratchpad>/reports/p3-<critic>.md` as well as returning the structured list.
- **Verify, don't trust.** After each round, run one `story` yourself (`RESULT:` line) and look at
  a contact sheet before you start the next round.
- **Independent checker agents work.** Every phase so far had a read-only checker or reviewer
  that re-ran the exit criteria. They caught real bugs: the gate's first run found a calibrate
  race-outcome bug and a jeep timer measured on too few runs.
- **Usage limits.** A weekly usage limit stopped Phase 2 mid-step on 2026-10-05, and the work
  resumed on 2026-10-07.
  - Resume with `Workflow({scriptPath, resumeFromRunId})`. Completed agents come back from
    cache.
  - First check `git log` for work the interrupted agent already committed.
  - Restart that step as a **continuation**: put a note in its prompt saying what is already
    committed. Don't restart it from scratch.
- **Timing.** Phase 0 took 2 h 40 min. Phase 1 took 5 h, with 11 packages in a pool of 8.
  Phase 2 took about 16 h wall time (4 h before the limit, 12 h after), mostly in
  measurement-heavy balance and stability runs. Plan for each QA round to take 3–5 h. Don't
  poll; wait for the workflow notification.

### 3.2 Round structure (DESIGN §15.4)

1. **Critics.** They are read-only and run in parallel. Each has its own port, 8871–8879, and its
   own `OUT=<scratchpad>/out-p3-<critic>`.
   - Each one builds contact sheets of its area (`montage … -tile 3x3 -geometry 640x360+4+4`),
     looks at them with the Read tool, and reads the relevant code and DESIGN sections.
   - Each returns a ranked list through a schema:
     `{severity: bug|ugly|off-brand|factual, area/owner, file, what, evidence, fix}`.
   - Suggested critics:
     - **flight**: title; the gate (arch, lounge, toilets, desk, jet bridge); the cabin in every
       phase (seated cast visible, the row-13 gag, windows, wings, clouds); trolley and
       turbulence; PANIK. Scenarios: `gate cabin flightshots flightseq phases panic turbulence
       trolley`.
     - **island A** (hotels and centre): `VIEWS=… views`, `islandtour`, `smash foot`.
     - **island B** (nature and coast): the same scenarios, other landmarks. Include the night
       grisfest (`?mission=11`) and the sunset mantra (julafton).
     - **cast and cars**: `castsheet cars heads`, plus in-scene sizes, clipping and outfits per
       mission.
     - **HUD and UI**: `ui skandal title`, meters, prompts, banners with å ä ö æ ø, the pause
       card, the big map, the end card (`endcard riocard`).
     - **dialogue staging**: every scene's camera framing, with `SHOTS=1 node tools/shot.mjs
       story` for key-scene shots; who is visible, and the portrait rings.
     - **film critic**: reads every scripted line in `src/content/*.js` and
       `src/game/missions/*.js` against `notes/research-*.md` and DESIGN §1.3–§1.6. It checks
       wording, speaker, the `[F]/[F*]/[N]/(t)` tags, that Ole speaks Norwegian, no real brands,
       and the factual traps in §5.4.
     - **playtest / difficulty** (optional): reads every mission flow for clarity: objective
       texts, markers, fail texts, whether a first-time player knows where to go. Checks the
       difficulty against §2 with `calibrate` / `calibflight` (both are slow; run them once).
   - Keep RAM in mind: run at most 3–4 Chrome-heavy critics at once (§5.2).
2. **Dedupe and triage.** You do this in plain workflow code, or yourself. Merge duplicate
   findings, drop anything that contradicts DESIGN or a user decision, and group the rest by
   owner area.
3. **Fixers.** One per owner area, **serially on `main`**.
   - Owner areas, with the files from DESIGN §14.1: cabin/camera/fx; flight scenery; island
     base; hotels; centre; nature; coast; cast/vehicles; flight missions; island missions;
     audio/UI/meters; spine.
   - Each fixer verifies every finding first and rejects the wrong ones with a reason. It then
     fixes the rest, re-runs its area's scenarios and the full `story`, updates DESIGN when a
     contract or literal changes, and commits.
   - Parallel fixers in worktrees are possible but not worth the merge work for QA-sized fixes.
4. **Gate.** An independent read-only checker runs the full `story` and every scenario. Each run
   must end with `RESULT: PASS`. Tag the round `phase3-r<N>`.
5. At most three rounds. **The last round ends with three green `story` runs in a row**, then the
   tag `phase3`.

### 3.3 Ports

- Game: 8840. Harness default: 8841.
- Phase 3: 8871–8879 for critics, 8870 for fixers. The Phase 2 gate used 8872.
- Sibling projects use 8790/8791 and 8810/8811. Don't touch them (§5.3).

---

## 4. Known-issue backlog (start Phase 3 from here)

Collected from the Phase 1 reviewers, the Phase 2 steps and the Phase 2 gate. None of these
blocks play; all are QA material. Owner areas follow DESIGN §14.1.

### 4.1 Timers and difficulty

- **Jeep chase (bodega stage 9).** The timer leans loose. Single-run p75 values ranged 27.7–49.7 s,
  and DESIGN's p75 over 35 chases is 34.4 s. The gate measured p75 27.4–31.0 s over 11–17 chases,
  so the shipped timer is 1.35–1.53 × those. The jeep autopilot wedges on a house in about 1 chase
  in 4 (those runs are excluded). Fix the autopilot, re-measure with `CAL=jeep JEEP_RUNS=20`, and
  decide.
- **Bodega home timer (`homeTimer`).** At the far corner (d 587 m) it is 1.12 × the drive + 3 s,
  which errs hard. That deviation is documented in §8.
- **On-foot slack.** On-foot stages keep more than 20 % slack by design (the 0.5 s per target and
  the 1.25 factor). The flight's short stages lose precision to 1 s rounding.
- **SKANDAL with one crash.** It is only somewhat harder than a clean run, because the injected
  crash at 250 m comes before the Land Rovers close in.
- **buss17.** The bus autopilot corners gently (3.5 of the 6 m/s² ÅKSJUKA limit), so a bold human
  gets a bit more slack.
- **asnan comment.** The comment in `island.js` TIMERS says "T_ref 15.5 (9 clean)" while DESIGN §8
  says "3 clean". Make them match.

### 4.2 Staging and cameras (missions, scenes)

- In the julafton intro, `hittegods` is hidden behind Stig.
- The camera sits behind the heads for "Hä-pååre", the haggle "Hvor mye?" and the grisfest porter
  outro.
- "Momento." does not show the balcony.
- The "Heia Norge!" dancers are small in frame.
- In the cabin cutaway, four chatter bubbles can stack at once. In the takeoff shots, the
  mantra auto-bubble and Ole's bark overlap the scripted lines.
- The `ui_hud` shot shows a flight toast on the island and a toast stack over the mission card.
  This is test state, but check the real toast/objective overlap at 1280×720.
- `skandal_multa` and `smash_0` put a bush or a palm trunk across the camera, because the
  camera's wall check ignores props.

### 4.3 World (B, C1, C2, D1, D2, A2)

- **B.**
  - `dusch` and `tomatlada` are never placed.
  - Street palms stand 0.95 m from the kerb, so the chase camera can end up inside a trunk, and
    a palm fills `view_suntrip`.
  - The concrete columns on the half-built frames have no colliders.
  - The west entrance stub doesn't join the road.
  - Check the tallrikar stacks' look.
  - Old Bigmouth prop aliases remain in `props.js`; delete them.
- **C1.**
  - A closed room's number sits beside the next room's doorway (105 shows next to the 107
    opening).
  - About 50 sign meshes, i.e. draw calls.
  - With the eye under the Flamenco fascia, the "HOTEL FLAMENCO" band fills the top quarter of
    the frame.
- **C2.**
  - In the guardia view the flag mast hides the CASA CUARTEL plaque.
  - The La Medina roof solstol props may still be placeholders.
  - The English and German sign words are already gone.
- **D1.**
  - The dunes read small (1.4–2.6 m against "large sand dunes").
  - No Christmas or charter-Sweden dressing (§6.9).
  - The golf mowing bands are hidden under the fairway.
  - Fataga crags overhang the sidewalk.
  - Some invented signs lack an `[N]` tag.
  - The inner water discs sit only 1 mm above the sea disc.
- **D2.**
  - Towels lie on the sand beside the sunbeds instead of on them.
  - The airport canopy pops in and out, with no hysteresis.
  - The coast blocks are the heaviest static geometry.
- **A2.**
  - The drift lumps stay still during the takeoff roll.
  - Debug cameras inside a cloud see a solid blue outline (`sceneryPeek peek_approach_2_out`).
  - Visuals snap at phase boundaries.
- **AI buses** can't make right turns (radius 8.25 m), so mission bus routes turn left only. A
  traffic guagua can clip a corner on a right turn.

### 4.4 Cabin, cast, UI, audio (A1, E, H)

- **A1.**
  - Jolts while the player stands never interrupt a held mantra (§5.9 says every jolt does).
  - The trolley's "Juice, whisky?" bubble plays at only about 60 % of stops.
  - `cabin.stopTurbulence()` exists (Phase 2), and `restoreAmbience` calls it.
- **E.**
  - The giraffe prop is cut off in `cast_flags_2`.
  - In the `flyg` outfit, Majsan's and Siv's dress-print dots render as pearl blobs on the
    cardigan.
  - Lasse has no shirt print.
  - Small look inventions are unlabelled: Lasse's jul shorts, Robban's sol dots, Fru Storch's
    white dress, Stig's arlanda scarf, Ole's arlanda coat.
  - Cabin busts are about 3.2k triangles each. Perf is fine at 60 fps, so this is only worth
    doing if cheap.
- **H.**
  - Mixed-case text shows Luckiest Guy's odd lowercase glyphs.
  - Nobody has listened to the trad melodies (Små grodorna, Hej tomtegubbar, Helan går) or the
    tunes. Headless runs can't judge music: **ask the user to listen** in the final report.
  - Lasse's bust radio line plays even after a bust has failed a mission.
  - The meter gradients have an extra colour stop compared with §13.4.
- **Storch witness toast.** It fired during the room-113 cutscene in Phase 1. `shame.js` now
  skips it while `inScene`; confirm it in the dialogue-staging pass.
- **Rio end card.** Check that the orchestra busts on the wheelhouse roof are visible after the
  Phase 2 banner move.

### 4.5 Film and text (F, G)

- Already fixed: the sprit PA tag (now `[F]`) and Robban's early "Glöm aldrig det" gate chatter.
- Still to check: some lines lack `(t)` where the research says the speaker is uncertain. These
  are the takeoff explanation at t 11.5 and t 14, and the Concorde outro.

No full film pass has been done on the merged game. The film critic should check every line
against the research, including the whole of §5.4 below.

---

## 5. Gotchas

1. **The `rtk` hook rewrites Bash.**
   - Its `cat`/`grep` output strips comments and adds summaries.
   - `cd x; cmd` sometimes fails, and `ls | tail` can print "(empty)".
   - Use `rtk proxy <cmd>`, `/usr/bin/grep -n`, the Read tool, absolute paths and `git -C`. Tell
     agents the same.
2. **Never open a window or browser for the user, and never run `make run` or `npm start`.**
   - Use only headless `node tools/shot.mjs`, with `PORT` and `OUT` set per agent.
   - **RAM is the bottleneck.** The user's Firefox often uses about 14 GB, leaving 3–9 GB free.
     With about 2 GB free, headless Chrome timed out. Check `free -g` before heavy runs.
3. **Sibling projects** (`../nothing_and_run__seinfeld`, `../saab_and_run__en_man_som_heter_ove`,
   `../bigmouth_and_run`) belong to other sessions. Don't touch them.
4. **`../CLAUDE.md` is shared with other sessions and is not in any git repo.**
   - Its "latest created game" pointer now says `charter_and_run__sallskapsresan/`.
   - Re-read it before any edit, and keep other sessions' changes.
5. **Film traps** (already right in DESIGN; don't let fixers reintroduce them):
   - José goes *home* and Siv goes *away*.
   - "Momento." is the porter's line.
   - "Finns det svenskt kaffe?" is Fru Storch's line.
   - Ole does the haggling, and Ole always speaks Norwegian.
   - Berra tells Robban about Sulan's tip.
   - The points scene is on the plane.
   - Tonga Tonga comes before "Bärra hem Berra".
   - The room-113 chaos and the heart attack are off-screen.
   - No "Gurli" and no real brands.
   - The film has **no turbulence and no toilet scene on board**; both are labelled invented
     (§1.6).
   - The title and end-card quote "Svenskarna reser inte till någonting… dom reser från
     någonting." is the film's opening card, `[F]` (`notes/research-plot.md:45`).
6. **Engine traps added in Phases 0–2.** CLAUDE.md lists them; the ones that bite first:
   - The level system puts the cabin at x = 3000, so town helpers must not be called there.
   - `flightScenery.js` is the only writer of the airframe pitch.
   - Camera ceilings (`collision.ceiling`, `Frame.ceiling`) keep the eye under pergolas.
   - `main.camNear` hides markers within 3 m of the camera.
   - `goto.timer` may be a function.
   - Keep the fixture `tools/fixtures/full-missions.js` in step with the §8 literals, so that
     `fullstory` stays a contract test.
   - `story` prints `no errors` even after `scenario failed`; only the `RESULT:` line counts.
7. **The user's global preferences** are in `~/.claude/CLAUDE.md`:
   - A message starting with `q` is a question: discuss it, don't implement it.
   - "ESPFEIT" means one subagent per feature, one at a time.
   - Use `uv` for Python, never pip.

---

## 6. Definition of done and final report

**Done** means all of the following:
- `PORT=8870 node tools/shot.mjs story` passes three times in a row, each run with
  `[t] done -> #13 idle`, no `scenario failed`, `no errors` and `RESULT: PASS`.
- Every scenario in CLAUDE.md passes. `calibrate` and `calibflight` pass at least once.
- The QA contact sheets show:
  - the cabin readable in every flight phase
  - every island landmark
  - the night grisfest
  - the sunset mantra
  - the end card
  - the HUD and dialogue with readable å ä ö æ ø
- All player-facing text is Swedish, and all of Ole's lines are Norwegian. Every scripted line
  carries a source tag, and the film critic's `factual` findings are fixed.
- DESIGN, README and CLAUDE.md match the code. There is a "Changelog (Phase 3)" in DESIGN.
- The tag `phase3` exists.

**Final report to the user, in Swedish.** Cover:
- what is in the game, and what was cut or left as P1/P2 (DESIGN §15.5)
- how to play: `make run`, then http://127.0.0.1:8840, which the user starts themselves; controls
  are in README
- known issues
- the commits, tags and branches created
- two questions:
  - May the Phase 1 worktrees (`../.wt/charter-*`) and the `p1-*` branches be removed?
  - Will the user listen to the music and the trad melodies, and play one level by hand, to check
    the feel? Headless runs can't judge either.
