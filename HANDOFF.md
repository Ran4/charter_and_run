# Charter & Run: hand-off after Phase 3 (QA done)

Written 2026-10-11, at the end of Phase 3 (tag `phase3`). For whoever continues: an orchestrator
planning more work with multi-agent workflows, or an agent fixing one of the known issues in §4.
An orchestrator plans, runs and verifies agents and reports to the user; it does not hand-write
the game (small orchestration fixes, a config line or a note, are fine).

The user writes in Swedish; answer in Swedish. Specs, code and comments stay in English; every
player-facing string is Swedish, and Ole speaks Norwegian bokmål.

Earlier hand-offs are in git history: the Phase 2 → 3 hand-off (this file at `phase3-r2`, written
2026-10-08 in `5322f34`) and the Phase 0–3 plan of 2026-10-04 (`8f96395`).

---

## 0. TL;DR

- **The game is built, QA'd and green.** Both levels and all 13 missions play through; the headless
  story ends at `[t] done -> #13 idle`, `no errors`, `RESULT: PASS`. Phase 3's last full gate passed
  every scenario plus `calibrate` and `calibflight`, and the tag `phase3` follows three green
  `story` runs in a row (§1.2, §6).
- **Phase 3 ran three QA rounds** (r1, r2, r3) of critics → serial fixers → gate, with adversarial
  verifiers and two repair rounds in r3. DESIGN's "Changelog (Phase 3)" opens with a summary of
  every round and of every timer change; the fixers' reports are in `notes/build-reports/`.
- **Read first, in this order:** §2 (the user's binding decisions: they still hold), §4 (the known
  issues: none blocks a mission; know them before you "discover" them), §5 (gotchas), then
  `CLAUDE.md` and the DESIGN sections for your area.
- **Timers come from the ledger.** A random stage's timer is the rule applied to its pool in
  `notes/calibration-samples.md`; `node tools/pool.mjs` re-derives every one. Phase 3's sampling
  closed on 2026-10-11 with every run pooled; the balls, sheep and flowers pools sit on a rounding
  boundary, so the next default `calibrate` run may move one of them by a second, by the rule.
- **Open with the user** (§6): will they listen to the music and play a level by hand? (The Phase 1
  worktrees and `p1-*` branches were removed on 2026-10-12, at the user's yes.)
- Commits on `main` are allowed. The remote is `origin` (`git@github.com:Ran4/charter_and_run.git`);
  push only when the user asks.

---

## 1. Where things stand

### 1.1 Repo and tags

Project folder: `/home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan/`.
It is its own git repo, on branch `main`, with the remote `origin` =
`git@github.com:Ran4/charter_and_run.git` (SSH, set 2026-10-14).

| tag | commit | what |
|---|---|---|
| `phase0a` | f4fa9c0 | Phase 0a: player boost ×1.2, the `api` smoke scenario, contract notes |
| `phase0` | 35e9e40 | the spine: level system, Game API, 18 stage kinds, runner, harness |
| `phase2-merged` | 175b26c | the 11 Phase-1 branches merged (E B C1 C2 D1 D2 A2 A1 H F G) |
| `phase2-contracts` | 98b5a67 | all Phase-1 contract changes applied, Rio end card wired |
| `phase2-balance` | 9be5dc5 | timers re-measured on the merged world; race, pursuit, haggle and fear tuned |
| `phase2-docs` | 295477d | README, CLAUDE.md, Makefile and package.json |
| `phase2` | c30b0ff | gate fix 1: closed race course, calibrate race outcome, jeep and home timers |
| `phase3-r1` | 45eaead | QA round 1: 9 fixer groups, repair 1, repair 2 (the ledger, the fixed walker) |
| `phase3-r2` | 90775a7 | QA round 2: 8 fixer groups (64 findings), gate PASS, review clean |
| `phase3` | the final docs commit | QA round 3: 5 fixer groups, 2 repair rounds, 2 ledger steps, docs; gate 3 PASS, review 3 clean, `story` ×3 |

`git log --oneline phase3-r2..phase3` lists round 3's commits; `git log --oneline` the full history.

**Phase 1 worktrees and branches: removed.**
- The branches `p1-A1 … p1-H` were merged in Phase 2 (`phase2-merged`). On 2026-10-12, with the
  user's yes, their worktrees in `/home/ran/src/html/everything_and_run/.wt/charter-<WP>` were
  removed (`git worktree remove`) and the branches deleted (`git branch -d`); their commits stay in
  main's history. `main` is the only branch. `../.wt/saab_work` belongs to another project.
- `.git/info/exclude` lists `node_modules` (the worktrees held an untracked symlink to it).
- Round 1's repair 2 ran on a branch `p3-r1-repair2` (merged as 61bbcea, branch since deleted);
  every other Phase 3 step committed straight to `main`.

### 1.2 Verified at the end of Phase 3

- **Phase 3 r3 gate 2** (an independent read-only agent, on 4887ede, port 8878): **GATE PASS** on
  the first run of everything.
  - `node --check` on all 62 source and tool files.
  - `SHOTS=1 story` (581 s) and a plain `story` (189 s): `[t] done -> #13 idle`, no `scenario
    failed`, `no errors`, `RESULT: PASS`.
  - Every scenario in CLAUDE.md passed, `perf` at 59.5 fps or better in every row.
  - `calibflight` (406 s) and `calibrate` (1989 s) PASS; every shipped timer matched its pool in the
    code, the DESIGN §8 table, the §8.x literal and the fixture.
  - Contact sheets by eye: the cabin in every flight phase, every island landmark (24 `view_*`), the
    night grisfest, the sunset mantra, the end card, the HUD and dialogue with å ä ö æ ø.
- **After gate 2** the last repair steps (b014460, bf50e87, cd39361, 9b4044d) each re-ran their
  scenarios and a full `story` (PASS). Verifier 3 re-ran the camera and flight repairs on snapshots
  (`walk drive aerial views islandtour smash foot skandal perf`, `gate cabin trolley panic
  flightshots kinds missions`, `calibflight`, `story`: all PASS).
- **Phase 3 r3 gate 3** (on 5e972ab, after the docs step, port 8878): **GATE PASS**, and diff
  review 3 **CLEAN**. Every scenario in CLAUDE.md, `calibrate` and `calibflight` on their
  deterministic subsets (sampling closed; no commit after 4887ede touches a pooled stage),
  `node tools/pool.mjs` against every shipped timer, the visual list, and the docs against the code.
- **The orchestrator** ran `PORT=8870 story` three times in a row on 5e972ab (2026-10-11, about
  190 s each): `[t] done -> #13 idle`, no `scenario failed`, `no errors`, `RESULT: PASS` all three.
  The tag `phase3` is on the docs-only commit after it (review 3's wording nits, these lines).

### 1.3 Where to read

- **`CLAUDE.md`** (project): how to run and check, every scenario name, and the conventions that
  bite, Phase 3's included. Read it first.
- **`DESIGN.md`**: the design bible and module contracts, about 500 KB; read the sections for your
  area, not the whole file. It wins over `notes/`. Its changelogs at the end list every change
  since the first design; "Changelog (Phase 3)" starts with a summary of the three rounds and every
  timer change, then one line per change, prefixed with its round and group.
- **`README.md`**: the player-facing overview in Swedish, the controls, the code map and the test
  commands.
- **`notes/calibration-samples.md`**: the raw-sample ledger. Its Rules say what pools with what; its
  tables hold every calibration run Phase 3 made, gates' and verifiers' included.
- **`notes/build-reports/`**: every fixer's and repair step's report (the critics', gates',
  reviewers' and verifiers' findings are folded into §4).
  - Phases 0–2: `phase0a.md`, `phase0b.md`, `phase0-polish*.md`, `p1-<WP>.md` (one per package),
    `phase1-integration-input.md`, `phase2-{merge,contracts,balance,stability,docs}.md`.
  - Phase 3: `phase3-r1-<group>.md` (spine, world-town, world-outskirts, cast-vehicles,
    cabin-flight, audio-ui-meters, flight-missions, island-staging, island-flow, repair1, repair2),
    `phase3-r2-<group>.md` (spine, island-camera, world, cabin-flight, flight-missions,
    island-staging, island-flow, voices-ui-cast), `phase3-r3-<group>.md` (flight-flow, flight-look,
    island-staging, island-camera, flight-trolley, repair-flight, repair-island-staging,
    repair-island-camera, ledger, repair2-island-camera, repair2-flight, repair2-island-staging,
    ledger2, docs). Each has one entry per item (verdict, how, evidence), its checks and its
    follow-ups.
  - The critics', gates', reviewers' and verifiers' reports and their probe scripts lived in the
    Phase 3 session's scratchpad under /tmp, which is not kept. Everything still open from them is
    in §4.
- **`notes/research-*.md`**: film research in Swedish, sourced and marked "(osäkert)" where unsure.
  This is the film critic's reference.
- **`notes/engine-*.md`**: maps of the Bigmouth engine from before Phase 0. Trust the code over
  them.

---

## 2. Binding user decisions (do not re-ask)

- **Commits.** Local commits, tags and worktrees are allowed. Push to `origin` only when the user
  asks (2026-10-14; before that there was no remote and the rule was never push).
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

## 3. How the work is run

### 3.1 Workflow rules (learned in Phases 0–3)

- **Point agents at files. Don't paste file contents into prompts.** Give paths in the main tree
  by absolute path, for example "read DESIGN.md §6.3 in full".
- **Agents write their deliverables to files and return a short report through a `schema`.**
  An agent's return value is only its *last* message. Have critics write
  `<scratchpad>/reports/p3-<critic>.md` as well as returning the structured list.
- **Verify, don't trust.** After each round, run one `story` yourself (`RESULT:` line) and look at
  a contact sheet before you start the next round.
- **Independent checker agents work.** Every phase had a read-only checker or reviewer that re-ran
  the exit criteria and read every hunk. They caught real bugs: Phase 2's gate found a calibrate
  race-outcome bug and a jeep timer measured on too few runs; Phase 3's gates and reviews found
  stale literals, a lost-log timer and docs drift.
- **Usage limits.** A weekly usage limit stopped Phase 2 mid-step on 2026-10-05, and the work
  resumed on 2026-10-07.
  - Resume with `Workflow({scriptPath, resumeFromRunId})`. Completed agents come back from
    cache.
  - First check `git log` for work the interrupted agent already committed.
  - Restart that step as a **continuation**: put a note in its prompt saying what is already
    committed. Don't restart it from scratch.
- **Timing.** Phase 0 took 2 h 40 min. Phase 1 took 5 h, with 11 packages in a pool of 8.
  Phase 2 took about 16 h wall time (4 h before the limit, 12 h after). Phase 3 took about three
  and a half days of wall time (2026-10-08 to 10-11): round 1's fixers and repairs about a day (its
  repair 2 ran beside round 2), round 3 with its two repair rounds about 29 h. Measurement
  (`calibrate` about 35 min by default, calibration batches, sweep probes) dominates; plan for it.
  Don't poll; wait for the workflow notification.

**Added in Phase 3:**
- **Serial fixers on `main`, one brief each.** Each fixer got a common brief (verify first, measure
  timers, checks before the commit, one commit, a report) and a group brief (its items with the
  critics' evidence, its files, its scenarios, a port and an OUT dir). They ran one at a time on the
  shared tree: no merge work, and each could rely on a clean tree. Worktrees were not worth it
  (round 1's repair 2 ran on a branch beside round 2 and needed a merge commit).
- **Adversarial verifiers.** In round 3 every fixer and every repair got an independent read-only
  verifier that re-measured its claims on `git archive` snapshots (the commit, its parent, the
  round's base) and looked for regressions nearby, at speeds, pitches and spots the fixer had not
  tried. They found a real regression after most steps (the furniture pass stalling ombord's
  seat dash, the side slide passing the eye through his head, Angerud popping in on the fail
  screen), which is why round 3 needed two repair rounds. Budget a repair round per gate.
- **Gates and diff reviews.** A gate runs every scenario, `calibrate`, `calibflight` and the contact
  sheets on a clean tree; a reviewer reads every hunk. Both keep catching stale prose: pool counts,
  medians and "unchanged" claims that a later commit made false.
- **The ledger.** Every raw calibration time goes into `notes/calibration-samples.md` with its
  commit, autopilot version and exclusions: the fixers', the gates' and the verifiers' runs. Pools
  join only runs on the same stage, world, actors and autopilot code, so a placement that moves a
  stage's start starts a new pool. `node tools/pool.mjs` re-derives every timer; a gate checks that
  it matches the code, the §8 table, the §8.x literal and the fixture. Logs in a scratchpad are lost:
  round 1's repair shipped a timer from 72 runs whose logs were gone, and the next gate could not
  check it. Ask verifiers to list their calibration runs under "Raw runs for the ledger" too.
- **Boundary pools flip.** A pool whose p75 sits near a rounding boundary moves by a second with each
  small default sample: the sheep went 28 → 27 → 28 and the balls 24 → 23 over round 3's last two
  default runs. Each flip is the rule, not padding. Close sampling before a tag and say so in the
  ledger (done on 2026-10-11).
- **RAM, GPU and disk are shared.** The user's Firefox and another project's headless runs share
  the machine. One harness run at a time per agent, `free -g` first (wait under 4 GB available),
  `df -h /` first (it holds /tmp). A real-time-bounded check (`calibflight`'s 90 s wait for the
  careless landning PANIK) fails under starvation: re-run that part alone before calling it a
  regression. On 2026-10-11 the root disk filled up for hours: headless Chrome then logged WebGL
  shader-validation errors, `ERR_INSUFFICIENT_RESOURCES` or `ENOSPC`, and a story failed on console
  errors. `TMPDIR=/dev/shm` with an OUT under /dev/shm (copied back) and
  `__GL_SHADER_DISK_CACHE=0` worked round it.
- **Probes are the evidence.** Critics and fixers wrote measuring probes (arrow-followers for the
  guides, the staging line audit, the chase-camera sweeps and rotation/strafe/jitter walks,
  real-input retry and fail probes). They made "fixed" checkable, and verifiers re-used them. They
  are not in the repo (§4.8); copy them into the agent's OUT dir and name them in its report.
- **The `rtk` hook** rewrites Bash (§5 item 1). Every brief repeats it.

### 3.2 Round structure (as Phase 3 ran it; DESIGN §15.4)

1. **Critics.** Read-only, in parallel, each on its own port (8871–8879) with its own
   `OUT=<scratchpad>/out-p3-<critic>`.
   - Each builds contact sheets of its area (`montage … -tile 3x3 -geometry 640x360+4+4`), looks at
     them with the Read tool, reads the relevant code and DESIGN sections, and measures where it can
     (a probe beats a screenshot).
   - Each returns a ranked list through a schema:
     `{severity: bug|ugly|off-brand|factual, area/owner, file, what, evidence, fix}`.
   - Phase 3's critics: **flight** (title, gate, cabin in every phase, trolley, turbulence, PANIK);
     **island A/B** (`views`, `islandtour`, `smash foot`, the night grisfest, the sunset mantra);
     **cast and cars**; **HUD and UI**; **dialogue staging** (`SHOTS=1 story`, the line audit);
     **film/text** (every scripted line against `notes/research-*.md` and DESIGN §1.3–§1.6);
     **playtest / difficulty** (mission flow, and a human model against the on-foot timers).
   - Run at most 3–4 Chrome-heavy critics at once (§3.1 RAM).
2. **Dedupe and triage.** Merge duplicates, drop anything that contradicts DESIGN or a user
   decision, group the rest by owner area, and write one brief per group.
3. **Fixers**, serially on `main` (§3.1). Each verifies every item first, rejects the wrong ones with
   a reason, fixes the rest, re-runs its scenarios and the full `story`, updates DESIGN (contract,
   literals, §8 table, changelog line `r<N> <group>:`) and the fixture, writes its report and commits
   once.
4. **Verifiers** (round 3), one per fixer, read-only on snapshots (§3.1).
5. **Gate and review.** An independent read-only checker runs the full `story` and every scenario,
   `calibrate` and `calibflight`; each run must end with `RESULT: PASS`. A reviewer reads the diff.
   Repairs close their findings; a ledger step pools every raw run the round made.
6. Tag the round `phase3-r<N>`. The last round ends with three green `story` runs in a row, then the
   tag `phase3`.

### 3.3 Ports

- Game: 8840 (the user's). Harness default: 8841.
- Phase 3: 8870 for fixers and repairs; 8871–8879 for critics, gates, reviews and verifiers (e.g.
  r3 gate 2 on 8878, review 2 on 8876, the last verifiers on 8877 and 8879).
- Sibling projects use 8790/8791 and 8810/8811. Don't touch them (§5 item 3).

---

## 4. Known issues at `phase3`

Deduplicated from every Phase 3 report (fixers, gates, reviews, verifiers, the round-3 critics and
playtest) and checked against the code at the tag. None blocks a mission; "unsure" marks what
could not be settled from the code. Severity: **low** (a player can meet it, it costs little),
**minor** (rare, off-route or cosmetic), **info** (balance or design information, not a defect).
Where: file or DESIGN section; numbers are from the named report.

### 4.1 Unsure

- **low, unsure** · kinds/core.js `getInCar` (`atHome`) — places the car on its bay without clearing
  it, so a car the player parked exactly there is overlapped (grisfest's hire car, buss17's bus).
  Nobody has checked whether the two can jam (r2 island-flow).
- **low, unsure** · missions/flight.js `via`, gate [3] — the dash restarted from Ole's spot (after a
  PANIK, or R from the start or the lounge). The aim from there is right (`herrtoaGang`, checked by
  the r3 verifiers), but no arrow-follower has walked the dash from Ole's spot since r2, when one
  stuck at the men's-room basins 2.2 m from `herrtoa`.

### 4.2 Gameplay and balance

- **info** · on-foot timers against a human (a modelled player: calibrate's walker with a player's
  limits; the r3 playtest on 90775a7, re-run by the orchestrator on 9b4044d with the shipped timers
  balls 23, sheep 28, flowers 26, plates 33, sprit 13). The "competent" model (0.3 s reactions,
  300°/s turns, W only, sprinting) made **160 of 162** (round 3: 101 of 102); its two misses were
  over by 1.2 s (flowers) and 0.5 s (sheep) on layouts where the walker itself needed 24.7 / 25.4 s.
  Slack at its p75: balls 23 %, sheep 30 %, flowers 24 %, plates 31 %, sprit 39 %. The "slow" model
  (0.35–0.55 s, 150°/s, about a gamepad stick) made flowers 18 of 22 (p75 7 % slack: still the
  hardest), balls 20 of 22, sheep 21 of 22 (10 of 10 with the real start camera); round 3 had 6/10,
  8/10, 9/10. The balls improved despite 24 → 23 because timed stages now start facing their guide
  (69f4f33), worth about 3 s to a slow player. The 0.5 s per target holds (paired overhead
  competent +1.6–2.6 s, slow +3.6–4.8 s per stage). The first sheep attempt starts where the bus tail
  ends, up to 30–38 m east of the measured start (a retry starts at the measured spot).
- **info** · DESIGN §8 table, ledger — the balls (23, 90 % range 22–25), sheep (28, 26–30) and
  flowers (26, 25–27) pools sit on a rounding boundary; one n 4 default run can flip one by a
  second. Sampling closed on 2026-10-11; a later flip is the rule working, not a regression.
- **info** · gate [3], DESIGN §8 "FLYGRÄDSLA" — a careful player who walks the dash arrives at
  99.3–99.6, 0.4–0.7 under PANIK (by design the careful player sprints: the objective says
  "fort!"). R in the dash after about 1.5 s sends him back to the lounge, about 14 m, and the dash's
  fear then PANIKs at about 4.5 s (r3 verify3-flight).
- **minor** · runner, §9.4 item 2 — an untimed stage that starts after a scene keeps the camera from
  before the scene (the gate queue after Berra's scene, boarding after the Stork scene); only timed
  stages turn to the guide. The guide arrow shows the way.
- **minor** · bodega, §8.9 stage 7 — first attempt, after the vischan scene, on foot: the arrow
  points at the pig truck, not at his parked car 11.6 m ahead in view. An on-foot `altTarget` for
  `follow` would change the kind for every follow.
- **minor** · shame.js `planOfficer` — the SKANDAL officer's `cornerDetour` rounds one building
  only; with two in a row he goes by the streets. His spawn has no line-of-sight preference: from
  behind a block he took 5–9 s to close in (`skandal` polls 10 s).
- **info** · §7.2 "Balance" — pursuit: the last three default `calibrate` runs had 7 of 9 clean
  escapes (one clean run busted at 15.5 s, one at 27.8 s); with one crash 3 of 3 (r3 ledger) and
  1 of 3 (r3 gate 2). Only "a clean escape is possible" is checked. Since feature SKANDAL
  (2026-10-14) a ram is no longer a bust by itself (DESIGN §7.2 `carBust`): clean 6 of 6, one
  crash 5 of 6.
- **info** · §8 "Timers and difficulty" — `homeTimer` at the far corner (d ≈ 587 m) is 1.12 × the
  drive + 3 s: a line in d cannot follow every route (documented).
- **minor** · drivers.js (traffic) — traffic can jam a road. One `calibrate` buss17 run was held
  171.6 s (counted clean: no impact), a home drive 75.8 s on the z ≈ 282 road; deterministic drives
  swing 1–15 s with traffic. Worth a look in the traffic code; not timer data.
- **info** · §6.6, drivers.js — AI buses cannot turn right (turn radius 8.25 m), so mission bus routes
  turn left only, and a traffic guagua can clip a corner on a right turn.
- **info** · `calibrate` buss17 — the bus autopilot corners gently (3.5 of the 6 m/s² ÅKSJUKA limit),
  so a bold human gets a little more slack than the rule assumes.
- **info** · sprit, §5.8 — the moving trolley can hold him at the rear galley for up to about 12 s
  behind an aisle walker it waits for: bounded, a designed obstacle (r3 flight-trolley).

### 4.3 Flight guides and markers

- **minor** · gate [6] queue, §8.1 [6] — where he is on his way to no chain point (the lounge's north
  end z ≥ 23–25, its south end z ≤ 9, the window column x 15) the arrow aims at the men's door, a
  detour that still ends at the lounge (57 of 60 arrow-followers arrive, 3 pin on the north wall at
  (23.6, 28)). Untimed. A cheap "look over low obstacles" rule pinned 12 of 60: a better guide needs
  route knowledge.
- **minor** · gate [3] — arrow-followers from (17–18, 13.5), south-west of the middle bench, take
  7.1 s (aim `herrtoaGang`); off the dash's route (r3 verify3-flight).
- **minor** · ombord [0] — in a seat row's legroom the ring (r 1.0) sits 0.9–1.6 m away at the
  aisle and overlaps Stig, and the minimap star sits on him for 0.5–0.7 s until he steps out
  (cosmetic; the arrow points into the aisle).
- **minor** · markers, §5.3 — in the flight level the GuideArrow sits at the top centre, partly under
  the objective card; kept, as the only off-screen direction cue there. The objective Beacon's beam
  in the gate lounge stays at full opacity (its fade is cabin-only); no critic reported a wedge.

### 4.4 Island chase camera (§14.5; no further camera round)

- **low** · Fataga, the fold's NW pocket (block-local (−20, −27.94): the back wall 0.36 m north, crag
  1's west end 0.9 m east) — looking SW over about 30° of yaw, every spot behind or beside him is
  within 0.5 m of a solid, so the eye sits 0.34–0.97 m from his head (15 frames within 1 m per fast
  turn, 39 per slow one); walking in and then turning reaches 0.44 m (0.69 before b014460's wedge
  hold). A fix needs a new rule (fade or hide the player mesh near the eye). On 302d4c2 the eye stood
  inside the rock.
- **low** · friskotek, the 1.3 m slot between the notice board and the SunTrip wing (block 3,2,
  local (−22.2, 4)) — at turn speeds and pitches outside the tested set the eye still cuts from
  shoulder to shoulder within 15 frames (9 of 18 default-pitch turns, 6 of 16 walk-in turns; the
  wedge's side choice has no hold); at pitch 0 it pulls in to 0.57–0.64 m (his shirt; also before);
  it goes in and out as the sight line crosses the board's posts. A side spot 12 m from the balls'
  mat, not a route.
- **minor** · camera.js side hold — the eye now stays 1.1–1.3 m behind his shoulder more often (the
  notice gap; the bungalow awning in fast level turns, min 1.08 m; a lagenhet entrance, min 1.18 m).
  On a fast reverse turn at fold_mid it cuts out to the side view and then to the other shoulder 8–10
  frames later.
- **minor** · camera.js — the close band outside the slide's trigger: the generic 1.6 m `ARM` with
  his back to a wall (`tonga_arcade`, 1.72 m under La Medina's 3.6 m arcade).
- **minor** · the SUPERMERCADO awning — the eye drops 1.03 m in one frame when a pole pulls it in
  under the cap. Turning the camera under ceilings cuts shoulder to shoulder where r3's first slide
  eased through his head: one-frame jumps over 1 m in the rotation sweep 1863 (08c1104 1571,
  302d4c2 2666).
- **minor** · the r3 island-camera sweep (16 blocks, on 08c1104) — the player hidden in 805 on-foot
  and 426 car samples, the eye inside a mesh in 78; the La Medina and plaza arcade arches hang below
  the arcade ceiling's underside near the front; with his back flush to a wall under the plaza
  arcade's 4.4 m roof the eye climbs to just over his head; one Casa Lola corner sample at 0.98 m;
  in the SunTrip balcony row's corner (`st_row`) the eye is straight over his head on the climb.
- **minor** · bus 17 — near-side palm fronds brush the eye a frame before it passes under a road
  banner.
- **minor** · asnan, the Viking Bar door — during the UPPDRAG KLART! wait, with the camera turned to
  the street, the eye can sit inside the bar's arcade, framed by a pillar and a lamp (r3 verify2 of
  repair-island-staging).

### 4.5 Other visual

- **minor** · centre.js `standSign` — small stand signs have pole colliders only, so he walks through
  the board (the market's `LUNES A SÁBADO`, 1.3–1.9 m).
- **minor** · hotels.js `flamencoPorch` — the reception porch's west post (≈ −9.45, −6.45) has no
  collider; he walks through it. `frame`'s side check sees only colliders, and characters are not
  obstacles.
- **minor** · julafton end — the held bodega unlock toast shows under the 5 s completion banner, in
  the wide-banner toast column at 1280×720.
- **minor** · main.js title orbit — still emits `fx.snow`, not culled over the cabin (title only).
- **minor** · nature.js dunes — the walkable dunes read small (1.4–2.6 m); taller ones need longer
  ridges or another car collider. Visual-only big dunes stand beyond the west bound.
- **minor** · line audit — framing kept by design: asnan's paint lines over the FERRETERÍA cut (Ole
  34 m away), Lasse's PA line (no body), the bodega cutaway in the party scene; the mantra
  auto-bubble shows over "Hur mår du?" for about 1 s.
- **minor** · bodega handover — when it fails within about 1 s, the grisbonde's "Ta bilen, señor…"
  bubble can still be up over the retry (seen in a probe only).
- **minor, latent** · main.js `anim` cues — an `anim` cue's off-timer clears the flag
  unconditionally, so a second cue on the same flag is cut short. No shipped overlap shows it.
- **unsure, never re-checked**: the tallrikar stacks' look; whether Fataga's crags overhang the
  sidewalk (they have box colliders now); the inner water discs only 1 mm above the sea disc; the
  pinkish tint in the climb (`seq_a05–a07`), which r2 says is not palette blending.
- **info** · perf (60 fps everywhere) — about 50 sign meshes (draw calls), the coast blocks as the
  heaviest static geometry, cabin busts of about 3.2k triangles each.

### 4.6 Text

- **info** · the drift check (code vs fixture vs DESIGN §8) has two accepted differences: the knäcke
  line's two tags, and the `rowSixComplaint` bubbles, in §8.3 but not in the fixture.
- **info** · DESIGN §8 "Races and chases" — the jeep paragraph's unstick split ("54 with no unstick
  … the 8 with two or more 47.0 s") is an older analysis of a subset; not every ledger row records
  unsticks, so `pool.mjs` cannot re-derive it.

### 4.7 Needs the user

- Nobody has listened to the music or the trad melodies (Små grodorna, Hej tomtegubbar, Helan går);
  headless runs cannot judge them.
- Play by hand: the on-foot timers (only modelled so far, §4.2), the gate dash's fear, and the feel
  of the side-sliding chase camera under porches and balconies.

### 4.8 Tooling

- **minor** · the evidence for round 3's fixes came from scratchpad probes that are not in the repo:
  the arrow-followers for the guides, the retry and scene facing, the side-slide rotation, strafe
  and jitter walks, the staging line audit, `realend` (the real `complete()` → unlock → end-card
  path), `grisfollow` (the bodega follow retry), the fail-screen probes. The repo gained checks in
  `trolley` (park and retry), `cabin` (14B from the aisle), `calibflight` (`DIALOG_CPS`, the trolley
  log, the dawdler's retry) and the `missions` data check (`outroHide`). `endcard` calls
  `playEndCard()` without the unlock.
- **minor** · `calibflight` waits 90 s of real time for the careless landning PANIK; starved of RAM,
  game time stretches past that and the check fails.
- **info** · the default `calibrate` takes medians of 2–3 runs, which traffic can sway, so `CAL
  CHECK` prints "(tighter than measured)" as noise (Tonga, asnan, julafton held by traffic); small
  default samples sit at the top of their ranges.
- **info** · the story harness warps onto scene landmarks, so its key-scene shots are closer than a
  real arrival; the bubbles "Til markedet!" and "Ditåt!" under a first line appear only in the
  harness. The `views` shot of `hittegods` stands behind the booth (a harness yaw). `flightseq`
  starts from cruise and blends into `gate` in its first frames.
- **unsure** · a story run once hit a "detached Frame" at the start of ropavieja with 6 GB free
  (r2); not seen since.
- **info** · a marker's `visible` set from outside is overwritten by `updateMarkers` on the next
  frame: probes must hide a marker every frame.

### 4.9 Fixed or answered in Phase 3 (for reference)

- **The Phase 2 → 3 backlog** (this file's old §4) is done: the jeep autopilot and timer, the asnan
  comment; all of the staging list (julafton's `hittegods`, "Hä-pååre", the haggle, the porter
  outro, "Momento.", "Heia Norge!", cabin bubble stacking, the `ui_hud` toasts, props across the
  camera); the world lists B, C1, C2, D1, D2 and A2 (placed `dusch` and `tomatlada`, frame-column
  colliders, the west stub, prop aliases, room numbers, the fascia, the flag mast, `solstol`,
  Christmas dressing, mowing bands, sign tags, towels, the canopy pop, drift lumps, phase snaps);
  A1, E and H (jolts interrupt the mantra, "Juice, whisky?" at every stop, uppercase text, the bust
  radio only in free roam, the meter gradients); the Storch witness toast, the Rio busts, the `(t)`
  tags.
- **The user's hand-play bug** (the trolley walling off landning's round-up) is fixed (r3
  flight-trolley: `trolley: 'park'`).
- **Rejected or done differently, with a reason:** the samba unlock toast stays in sentence case
  (the Nunito house style); Fataga's crags were not moved behind the fold wall (that put them on the
  sidewalk loop); the side slide targets the full `SIDE` distance; the GuideArrow is not hidden in the
  flight level (the "clipped block" was the Beacon's arrow); the bodega follow retries at the wheel,
  not parked; on-foot slack above 20 % is by design (the 0.5 s per target and × 1.25).

---

## 5. Gotchas

1. **The `rtk` hook rewrites Bash.**
   - Its `cat`/`grep` output strips comments and adds summaries.
   - `cd x; cmd` sometimes fails, and `ls | tail` can print "(empty)".
   - Use `rtk proxy <cmd>`, `/usr/bin/grep -n`, the Read tool, absolute paths and `git -C`. Tell
     agents the same.
2. **Never open a window or browser for the user, and never run `make run` or `npm start`.**
   - Use only headless `node tools/shot.mjs`, with `PORT` and `OUT` set per agent.
   - **RAM and disk are the bottleneck** (§3.1). The user's Firefox often uses about 14 GB, leaving
     3–9 GB free; with about 2 GB free headless Chrome timed out. Check `free -g` and `df -h /`
     before heavy runs.
3. **Sibling projects** (`../nothing_and_run__seinfeld`, `../saab_and_run__en_man_som_heter_ove`,
   `../bigmouth_and_run`) belong to other sessions. Don't touch them.
4. **`../CLAUDE.md` is shared with other sessions and is not in any git repo.**
   - Its "latest created game" pointer says `charter_and_run__sallskapsresan/`.
   - Re-read it before any edit, and keep other sessions' changes.
5. **Film traps** (right in DESIGN; don't let fixers reintroduce them):
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
6. **Engine traps.** CLAUDE.md lists them; the ones that bite first:
   - The level system puts the cabin at x = 3000, so town helpers must not be called there.
   - `flightScenery.js` is the only writer of the airframe pitch.
   - Camera ceilings (`collision.ceiling`, `Frame.ceiling`) keep the chase eye under pergolas and
     canopies; they count by the sight line, and prop ceilings are `underOnly` (DESIGN §14.7).
   - Markers near the camera (DESIGN §5.3): `main.camNear` hides a marker shape within 3 m of the
     camera; in the flight level the giver's "!" hides within 5.5 m and the objective Beacon's
     arrow is hidden in the whole level, and in the cabin the giver's and the objective's beams fade
     out from 8 to 4 m of eye distance (`nearFade`). The giver's "!" also hides within 3 m of the
     player. The GuideArrow hides only within 3 m of the camera.
   - A marker's `visible` set from outside is overwritten by `updateMarkers` the next frame.
   - `goto.timer` may be a function (`homeTimer`).
   - The flight level aims markers straight (`routeAim: false`): a stage that crosses furniture
     needs a `via` guide, and a guide is checked with an arrow-follower.
   - No stage uses `trolley: false`; use `trolley: 'park'`.
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

**Met at `phase3`** (2026-10-11): r3 gate 2 passed every scenario, `calibrate`, `calibflight` and
the contact sheets (§1.2); the docs step (`phase3-r3-docs.md`) brought DESIGN, README, CLAUDE.md and
this file in step with the code; the orchestrator's three green `story` runs come before the tag.

**Final report to the user, in Swedish.** Cover:
- what is in the game, and what was cut or left as P1/P2 (DESIGN §15.5)
- how to play: `make run`, then http://127.0.0.1:8840, which the user starts themselves; controls
  are in README
- known issues (§4)
- the commits, tags and branches created
- two questions:
  - May the Phase 1 worktrees (`../.wt/charter-*`) and the `p1-*` branches be removed? (Answered
    yes on 2026-10-12; removed.)
  - Will the user listen to the music and the trad melodies, and play one level by hand, to check
    the feel? Headless runs can't judge either.
