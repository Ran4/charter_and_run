# Charter & Run: hand-off to the next orchestrator (Phases 0–3)

Written 2026-10-04, at the end of the design stage. You are taking over an **orchestrator** role:
you plan and run the build with multi-agent workflows, you verify their results, and you report
to the user. You do not hand-write the game yourself.

The user writes in Swedish; answer in Swedish. Specs, code and comments stay in English, and every
player-facing string is Swedish (Ole speaks Norwegian).

---

## 0. TL;DR

- **Goal.** Build *Charter & Run*, a Simpsons: Hit & Run-style three.js browser game based on the
  1980 film *Sällskapsresan*.
  - The user's brief: *"Stig-Helmer är flygrädd, så första nivån är själva flygresan. Resten handlar
    om att överleva gruppresan på Kanarieöarna med Ole Bramserud."*
- **Where.** The project folder is
  `/home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan/`.
  - It is a fresh copy of the finished game `../bigmouth_and_run/`.
  - **`src/` is still 100 % Bigmouth. No game code has been written yet.**
- **The spec is done.** `DESIGN.md` (≈245 KB, 3,140 lines) is the design bible and the set of
  module contracts. It was synthesised from three competing designs and three judges, then
  reviewed three ways. All 69 review findings are applied; its changelog is at the end of the file.
  **Read it in full before doing anything.** It wins over everything in `notes/`.
- **Your job.** Run Phase 0 (spine), Phase 1 (11 parallel packages), Phase 2 (integration) and
  Phase 3 (QA). The steps are in DESIGN.md §15 and the test plan in §16.
- **First, ask the user the questions in §2 below**, one round with `AskUserQuestion`. Commits in
  particular need a yes.

---

## 1. Where things stand

### 1.1 Done

| what | where |
|---|---|
| Copy of bigmouth (no `.git`, no `out/`), `node_modules` included | the project folder |
| Ports changed: game 8840, harness default 8841 | `Makefile`, `package.json`, `tools/shot.mjs` |
| `tools/shot.mjs` honours `OUT=dir` and `PORT=n` for parallel runs | `tools/shot.mjs:11-15` |
| Local git repo, branch `main`, one baseline commit `09cc093` ("Copy bigmouth_and_run as the base…"). No remote. | `.git/` |
| Research, in Swedish, sourced and marked "(osäkert)" where unsure: plot scene by scene, characters and looks, setting (Gran Canaria 1979), the flight (DC-8, cabin, crew) | `notes/research-{plot,characters,setting,flight}.md` |
| Engine maps (English, file:line precise) | `notes/engine-{gfx-input-audio,world,actors,game,tests-and-content}.md` |
| Three full designs (film / gameplay / build lens) | `notes/design-{A-film,B-gameplay,C-build}.md` |
| Three judges (fan, lead, critic). They only saw truncated A and B. | `notes/judgments.md` |
| **The design bible and contracts** | **`DESIGN.md`** |

`DESIGN.md`, `notes/` and `HANDOFF.md` are **untracked**; `git status` shows `?? DESIGN.md ?? notes/`.
Phase 0 is specified to commit them (DESIGN §15.0–15.1).

### 1.2 Not done

- Any change under `src/`, `tools/` (beyond the PORT/OUT line), `index.html`, `style.css`,
  `README.md` or the project `CLAUDE.md` (it still says Bigmouth and port 8790).
- **`../CLAUDE.md` still says the latest game is `bigmouth_and_run/`.** Phase 2 updates it (§4.6).

### 1.3 What the game is (one paragraph; the details are in DESIGN)

There are 13 missions over two levels:

- **Level 1, "Flygresan"** (missions 0–4): a compact Arlanda gate, then a cut-away DC-8
  ("Sol-Viking", SE-SOL). It is built as a separate small world at x = +3000, with the outside
  scenery animated past a stationary cabin.
  - Missions: `gate`, `ombord`, `juice`, `sprit`, `landning`.
  - The meter is **FLYGRÄDSLA**, which can tip into **PANIK**. Hold J for the mantra *"Jag kan
    flyga, jag är inte rädd"*; hold Space to brace in turbulence. The trolley is an AI car that
    bowls you over.
- **Level 2, "Nueva Estocolmo"** (missions 5–12): the engine's 7×7 town grid rethemed as a SunTrip
  resort on Gran Canaria at Christmas 1979.
  - Missions: `buss17`, `friskotek`, `asnan`, `bodega`, `ropavieja`, `fataga` (P1, cut first),
    `grisfest`, `julafton`.
  - The meter is **SKANDAL**, which brings the Guardia Civil and a **¡MULTA!**.
- **Collectibles and money:** 7 of Ole's gadgets ("Oles prylar"), 7 shark fins ("hajfenor"), and
  pesetas.
- **The ending:** Stig and Majsan say the mantra together, then the Rio end card.

The story test must end at `[t] done -> #13 idle` with `RESULT: PASS`.

---

## 2. Decisions to get from the user before Phase 0

Ask all of these in one `AskUserQuestion` call; the recommended option goes first.

1. **Local git commits and worktrees.** The plan has Phase 0 commit and tag (`phase0a`,
   `phase0`), and has each Phase-1 agent work in its own worktree on branch `p1-<WP>`, with the
   integrator merging. The user's standing rule is "commit only when asked". I already made the
   one baseline commit `09cc093` in this brand-new, local-only repo; mention it.
   - **Recommendation: allow local commits, never push.** That is the only clean way for 11
     agents to each run headless tests without seeing each other's half-edits.
   - Fallback (DESIGN §15.0): sandbox copies, then copy back only the owned files.
2. **11 parallel Phase-1 agents** (A1 A2 B C1 C2 D1 D2 E F G H) instead of the original 8.
   Recommendation: yes.
   - The machine has 20 CPUs and an RTX 4070, so the workflow concurrency cap is 16.
   - **But only about 9 GB of RAM is free**, because the user runs other sessions. Stagger the
     heavy headless-Chrome self-checks (see §3.3).
3. **Bodega stage 9, the Guardia-jeep chase** (DESIGN §8.9). You ram a fleeing Guardia jeep into
   the ditch. It is invented, the wreck steams instead of exploding, and it adds no SKANDAL.
   Is that tone OK? Fallback: a plain timed drive home.
4. **Invented stand-in names for real businesses:** CASA LOLA (for Grill Paco), LA MEDINA (for
   Kasbah), CENTRO NÓRDICO (for CITA), HOTEL LAS GAVIOTAS, BUNGALOWS LOS CACTUS, APARTAMENTOS
   VIENTO SUR and HOTEL MAR AZUL. Approve, or let the user rename them.
5. *(optional)* **Splitting G** (island missions) into G + G2. The default is no split, because G
   is data-only now that the stage kinds are frozen. It must be decided **before** Phase 0, since
   Phase 0 would have to create `island2.js`.

Your own call, no need to ask: run Phase 0 as **two sequential agents** (0a, then 0b), not one
agent with an internal checkpoint (§3.2).

---

## 3. How to run the build

### 3.1 Rules for every workflow you write

- **Point agents at files; don't paste file contents into prompts.** Pasting the research and
  three designs (≈350 KB) into one prompt truncated the input of all three judges: they each saw
  only the tail of designs A and B. Say "read DESIGN.md §5 and §14.7 in full" instead, by
  **absolute path** in the main tree:
  `/home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan/DESIGN.md`.
- **Agents write deliverables to files and return a short report.** A workflow agent's return
  value is only its **last** assistant text message. Two designers wrote their design over two
  messages, and the returned value held only the second half.
  - The full texts were recovered from the transcripts with a small script: read
    `subagents/workflows/<run>/agent-*.jsonl`, keep the assistant `text` blocks, and match agents
    by `agent-*.meta.json` → `description`.
  - Use `schema` for anything you need to branch on: pass/fail, findings, contract changes.
- **The hand-off report** at the end of every build agent follows DESIGN §15.0:
  - files changed
  - done / P1 left / cut
  - the self-check commands with their last output lines
  - **CONTRACT CHANGES**
  - the screenshots path

  Ask for it through a schema so you can merge contract changes mechanically.
- **Verify, don't trust.** After each phase, run the exit check yourself (one `story` run, its
  `RESULT:` line, a contact sheet of screenshots) before starting the next phase.
- **Timing.** The research and design workflow took about 70 minutes; the design-bible workflow
  took about 85 minutes (one synthesis agent, three reviewers, one reviser). Plan for long runs,
  and use `ScheduleWakeup` fallbacks of 30–40 minutes instead of polling.

### 3.2 Phase 0: the spine (serial; DESIGN §15.1)

Exit criterion: every contract in DESIGN exists and works **on stub content**, the game boots into
both levels, and the story passes through 13 placeholder missions.

- **Agent 0a** (port 8850, effort high) covers §15.1 items 1–9 and 12:
  - file extraction
  - the gfx, camera, collision, input, fx and audio APIs
  - hud, shame.js modes, main.js and the Game API (§14.3)
  - the actors' minimal contracts
  - the stub cabin, which already has the **real** collision, seat map and landmarks
  - the stub island
  - the harness (`tools/lib.mjs`, scenario modules, `RESULT:` line, `FROM`/`TO`)

  Exit: `node --check` passes on every file; `start walk aerial drive title` pass; commit and tag
  `phase0a`.
- **Agent 0b** (port 8850) covers items 10, 11 and 13:
  - all 18 stage kinds and the runner (§9)
  - the 13 placeholder missions plus the story scripts
  - the exit criteria: `PORT=8850 node tools/shot.mjs story` gives `#13 idle`, no `scenario
    failed`, `no errors` and `RESULT: PASS`; `missions title views transition` pass; commit and tag
    `phase0`
- **Then verify it yourself:**
  - Read the diff summary and run `story` once.
  - Check that `main.js`, `level.js`, `content/index.js` and `game/missions/kinds/*` match DESIGN
    §14, because **they are frozen after Phase 0**.
  - Fix gaps with a follow-up agent before Phase 1. A missing API found in Phase 1 stalls up to 11
    agents.
- In the Phase-0 prompt, say that it must update DESIGN.md itself (and list the change in its
  report) if it has to deviate from a signature.

### 3.3 Phase 1: 11 packages in parallel (DESIGN §15.2)

- **One `agent()` per package**, inside a `pipeline()`:
  `build → verify-ownership → self-check report`.
- **Each prompt gives:**
  - the package's row from the §15.2 table
  - the DESIGN sections it must read (its own § plus §1, §14, Appendix A)
  - its owned files
  - its port and `OUT=<scratchpad>/out-<WP>`
  - the worktree command
  - "edit only owned files"
  - its self-check
  - the hand-off schema
- **Worktree setup** (if commits are approved):
  1. `git worktree add /home/ran/src/html/everything_and_run/.wt/charter-<WP> -b p1-<WP> phase0`
  2. Symlink `node_modules` into the worktree.
  3. Before the agent finishes, run
     `git diff --name-only phase0 | grep -v -f owned.txt`. The output must be empty.
- **Don't use the Workflow `isolation: 'worktree'` option.** The repo is the project folder, not
  the session's cwd. Have the agent create its worktree itself, as DESIGN §15.0 says.
- **RAM.** Every self-check launches its own headless Chrome and server, and only about 9 GB was
  free at hand-off. Either:
  - tell agents to run their heavy self-checks (`story`, `views`) at most once or twice, and
    `node --check` plus single short scenarios in between, or
  - split Phase 1 into two waves: geometry first (A1 A2 B C1 C2 D1 D2 E), then data, UI and audio
    (F G H).

  Check `free -g` before launching.
- **A light verify agent per package** can then diff the branch against its owned-files list and
  spot-check the screenshots against DESIGN. That catches "edited a frozen file" before
  integration.
- **The packages:**
  - A1 · cabin interior, trolley, turbulence, fear
  - A2 · flight scenery and airframe
  - B · island base (streets, props, residential, Rio card)
  - C1 · hotels (Flamenco with Pepes Bodega, SunTrip)
  - C2 · town centre
  - D1 · nature (farm, Fataga, golf, dunes)
  - D2 · coast (airport with the parked DC-8, lighthouse, beach, harbour)
  - E · cast and vehicles
  - F · flight missions and content
  - G · island missions and content
  - H · audio, UI, meters

### 3.4 Phase 2: integration (serial, port 8870; DESIGN §15.3)

- Merge in the order **E → B → C1 → C2 → D1 → D2 → A2 → A1 → H → F → G**. After each merge run
  `node --check` and `start title`.
- Apply every CONTRACT CHANGE, from all reports, everywhere.
- **Three `story` runs in a row**, all with `RESULT: PASS`. Fix flakes at the root, never by
  loosening the check.
- Run every scenario in §15.3 step 4, then the balance pass and the docs.
- **Docs to update:** README (including the list of invented mechanics from §1.6), the project
  `CLAUDE.md`, `Makefile`/`package.json` (`name: charter-and-run`, `test` → story), and
  **`../CLAUDE.md`'s "latest created game" pointer** (§4.6).
- This is the step most likely to need several agents in sequence. Give the integrator a high
  effort setting, and if it runs out of context, follow up with "continue from the last green
  merge".

### 3.5 Phase 3: QA loop (DESIGN §15.4)

- **Screenshot critics** (read-only, ports 8871–8879). Each one builds contact sheets of one area
  with `montage … -tile 3x3` and returns a ranked list through a schema:
  `{severity: bug|ugly|off-brand|factual, owner WP, file, what, fix}`.
- **Use a film critic as well:** check the dialogue against `notes/research-*.md` and the [F]/(t)
  tags.
- **Fixers:** one per owner area, applied **serially on the main tree**, or in worktrees merged by
  the integrator. Each fixer re-runs its self-check and then the full story.
- At most three rounds. The last round ends with three green `story` runs.
- Then report to the user in Swedish: what is in, what was cut (P1/P2), how to play
  (`make run`, port 8840; the user starts it themselves), and the known issues.

---

## 4. Gotchas from this session

1. **The `rtk` hook rewrites Bash commands.**
   - Compound commands such as `cd x; cat a b` sometimes fail with
     `rtk: No such file or directory`.
   - Its `cat`/`grep` output strips comments and adds summaries.
   - Use `rtk proxy <cmd>` for raw output, or the Read tool when line numbers matter. Tell build
     agents the same (DESIGN §15.0 mentions it).
2. **Never open a window or browser for the user.**
   - Use only headless `node tools/shot.mjs <scenarios>`, with `PORT`/`OUT` per agent.
   - `make run` opens a browser, so never run it.
   - The harness uses `/usr/bin/google-chrome` headless on the real GPU.
3. **Sibling projects are being built right now by other sessions:**
   `../nothing_and_run__seinfeld/` (ports 8810/8811) and `../saab_and_run__en_man_som_heter_ove/`
   (still on 8790/8791). Don't touch them.
   - Our ports are 8840/8841, Phase 0 8850, Phase 1 8861–8869/8880/8881, Phase 2 8870, Phase 3
     8871–8879. None collide.
4. **`../CLAUDE.md` is shared with those sessions.**
   - When you update the "latest created game" pointer, re-read the file first.
   - If someone else has changed it meanwhile, keep their edit and put ours on top only if ours
     finished later. Otherwise tell the user.
5. **Factual traps the judges found** (already fixed in DESIGN; don't let agents reintroduce them):
   - José goes *home*, Siv goes *away*.
   - "Momento." is the porter's line.
   - "Finns det svenskt kaffe?" is Fru Storch's line.
   - Ole does the haggling.
   - Berra tells Robban about Sulan's tip.
   - The points scene is on the plane.
   - Tonga Tonga comes before "Bärra hem Berra".
   - The chaos and the heart attack happen in room 113, off-screen.
   - Ole always speaks Norwegian.
   - No "Gurli", no real brands.
   - The film has **no turbulence and no toilet scene on board**. Both are labelled as invented.
6. **Engine traps** are listed in DESIGN §17 and the judges' tables in `notes/judgments.md`. The
   ones that bite first:
   - `freeSpot`'s ±309 bounds
   - coins placed before `initCoins`
   - `placeNpcs` teleporting seated NPCs
   - global fog washing out the cabin
   - `race.passenger` sitting in the opponent's car
   - `destroy` always exploding and spawning at random
   - the story test printing `no errors` even after `scenario failed`. That is why the
     `RESULT: PASS` line exists.
7. **The user's global preferences** are in `~/.claude/CLAUDE.md`. The relevant ones:
   - Use `uv` for Python, never `pip`.
   - A message starting with `q` is a question: discuss it, don't implement it.
   - "ESPFEIT" means one subagent per feature, one at a time.
   - Bevy-specific rules don't apply here.

---

## 5. Definition of done

- `PORT=8870 node tools/shot.mjs story`, three times in a row:
  - `[t] done -> #13 idle`
  - no `scenario failed`
  - `no errors`
  - `RESULT: PASS`

  If `fataga` was cut, it is `#12 idle`, and the user must be told.
- Every scenario in DESIGN §15.3 step 4 passes.
- The QA contact sheets show the cabin readable in every flight phase and every island landmark.
- All player-facing text is Swedish, all of Ole's lines are Norwegian, and every scripted line in
  the content files carries a source tag.
- README, the project `CLAUDE.md` and `../CLAUDE.md` are updated.
- A final Swedish report to the user covering: what was built, what was cut, how to run it, and
  the commits and branches created.
