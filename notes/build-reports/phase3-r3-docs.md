# Phase 3 · round 3 · last step `docs` (the docs match the code)

Start HEAD `9b4044d` (r3 ledger2), clean tree, branch `main`. Port 8870 (one check run). OUT
`<scratchpad>/out-p3-r3-docs/` (`<scratchpad>` is this batch's, `…/9db49231-…/scratchpad`). No game
code, timer, fixture or ledger change; the only code-file edit is a comment in
`src/game/missions/flight.js`.

Sources: the r3 completeness critic's doc gaps D1–D12 (`p3-r3-completeness.md` §2, written at
ea6c96a, each re-checked at 9b4044d), the deduplicated known issues at ea6c96a
(`p3-known-issues.md`), the follow-ups of every r3 report after ea6c96a (flight-trolley, repair-*,
ledger, repair2-*, ledger2), r3 gate 2 §7, review 2, the verify2 reports and the two verify3
reports, with the orchestrator's verify3 triage (camera residuals become known issues).

## Items

### docs-1 · CLAUDE.md · fixed
- Build status: "Phases 0–3 are done (tag `phase3`)", what Phase 3 was, what HANDOFF.md now is (the
  state at `phase3`, decisions, workflow lessons, known issues §4, gotchas), and the reports line
  names `phase3-r{1,2,3}-<group>.md` and the changelog summary (completeness D1, D2).
- Tags: `phase2-docs`, `phase3-r1`, `phase3-r2`, `phase3` added (D3).
- Conventions that bite, Phase 3's (D12): camera ceilings by sight line, `underOnly` prop ceilings
  and the side slide (camera changes judged with sweep probes); the ledger's pool rule (same stage,
  world, actors, autopilot; every run, gates' and verifiers' too) and the boundary pools; flight-level
  `via` guides and `faceGuide` (check with an arrow-follower); no `trolley: false`, use
  `trolley: 'park'`, retries re-apply ambient cues; `retryFear`, `outroHide` and `fail()`'s re-hide.
  "Running and checking" gains the disk check and the `TMPDIR=/dev/shm` workaround.
- Every identifier named was checked in the code (`this.slide`/`slideT`/`wedged` in camera.js,
  `parkTrolley()` in cabin.js, `faceGuide()`, `cpFear`/`retryFear`, `outroHide` in runner.js,
  `underOnly` in collision.js, `routeAim: false` in level.js).

### docs-2 · HANDOFF.md · fixed (rewritten as the post-Phase-3 hand-off)
- Title, intro and TL;DR: Phase 3 done, what to read first (§2, §4, §5), the ledger and boundary
  pools, the two open questions for the user (D4 :1, :3, :15–28).
- §1.1 tags table complete (`phase0a` is f4fa9c0, not 35e9e40 as the old table implied; `phase3-r1`
  45eaead, `phase3-r2` 90775a7, `phase3`), the `p3-r1-repair2` branch noted (D4 :39–49).
- §1.2 what was verified at the end (r3 gate 2's runs, the later steps' checks, verifier 3's reruns;
  the three green stories before the tag are the orchestrator's).
- §1.3 where to read: the ledger, every Phase 3 report by group, and that the critics'/gates'/
  verifiers' reports lived in the /tmp scratchpad (D4 :91–95).
- §2 binding decisions kept word for word.
- §3 workflow: the old rules kept, the timing updated, and Phase 3's lessons added: serial fixers with
  a common and a group brief, adversarial verifiers, gates and diff reviews, the ledger, boundary
  pools flipping, RAM/GPU/disk sharing (the 2026-10-11 disk-full window and its workaround), probes as
  evidence, the `rtk` hook. §3.2 describes the round as Phase 3 ran it; §3.3 the ports used.
- §4 replaced by the **known issues at `phase3`** (D4 :207–315): deduplicated from
  `p3-known-issues.md` and every later report, each with severity (low / minor / info / unsure), where
  and what. Dropped as fixed by later commits: row 1's door corner (bf50e87), the jeep's rounding
  edge (now 41 at p75 34.05, n 130), Angerud's pop-in on the fail screen (cd39361). Updated: the
  playtest numbers against today's timers (balls 23, sheep 28, flowers 26), pursuit balance (7 of 9
  clean escapes over the last three default runs), the camera residue after b014460 (fold NW pocket
  0.34–0.97 m and the 0.44 m walk-in turn, the notice-board gap's shoulder cuts at untested speeds and
  pitches and its 0.57–0.64 m pull-in at pitch 0, the side hold's 1.1–1.3 m, fold_mid's fast reverse
  flick, RC-3, the SUPERMERCADO drop), the tooling list (the checks the repo gained). Added: the queue
  guide where no chain point is "on", R late in the dash, the (17–18, 13.5) follower, the ombord
  legroom ring, the boundary pools, the traffic jam (171.6 s), the Viking Bar banner-wait camera, the
  jeep paragraph's unstick split. §4.9 lists the old backlog as done and the rejected-with-reason
  items.
- §5 gotchas: the stale "`main.camNear` hides markers within 3 m" (D4 :353) replaced by the rules in
  DESIGN §5.3 as the code has them (main.js:50 `camNear`; flight "!" 5.5 m; the Beacon's arrow hidden
  in the flight level; `nearFade` 8 → 4 m in the cabin; the "!" within 3 m of the player; the
  GuideArrow only by `camNear`); the `updateMarkers` overwrite, `via`, `trolley: 'park'` added.
- §6 kept as the definition of done, with a "Met at `phase3`" line.

### docs-3 · DESIGN.md changelog summary and the remaining doc gaps · fixed
- "Changelog (Phase 3)" opens with a summary: rounds r1 / r2 / r3 (tags, groups, what each fixed in
  a few lines) and every Phase 3 timer change from `phase2` to `phase3` with its reasons (sprit
  25 → 13, jeep 42 → 41, balls 32 → 23, sheep 42 → 28, flowers 42 → 26, plates 45 → 33, Tonga 23 → 19,
  julafton 87 → 81; the unchanged ones; the boundary pools). Each step checked against its changelog
  line and the `phase2` tag's §8 table.
- Every r3 commit has its changelog lines (ded3575, 69f4f33, 302d4c2, 08c1104, ea6c96a, e458d7e,
  5b996be, 6d5b919, 4887ede, b014460, bf50e87, cd39361, 9b4044d): checked; nothing missing.
- D5, D6 (jeep, plates, Tonga pool counts): **already fixed** by r3 ledger and ledger2. `node
  tools/pool.mjs` at 9b4044d reproduces every CURRENT pool, and island.js TIMERS and the §8 table say
  the same n and medians (jeep n 130 / 28.00 / 34.05 → 41; plates n 44; Tonga n 20; julafton n 17).
- D8: the flight.js FLYGRÄDSLA header comment now says ombord's careless PANIK at t 21.7 (was
  21.5), landning's held-J peaks by reading pace (~18–20 at 55 chars/s, ~25–27 at 20), the walker's
  99.3–99.6, the `retryFear` retry and the sprit peaks of the last gate. Comment only.
- D9: §8 "FLYGRÄDSLA" labels its Phase 2 numbers as superseded and the Phase 3 r3 set as current,
  and adds the retried start (70.0–70.5 for 70.1–70.2) and the r3 gates' walkers (99.3–99.6).
- D10: the header line no longer says `src/` is an unchanged Bigmouth copy.
- D11: §15.4 gets an outcome paragraph (how the rounds ran, the tags, where the summary, the reports
  and the known issues are).
- Stale camNear wording: DESIGN §5.3 already matched the code; the stale line was HANDOFF's (docs-2).
- Changelog: three `r3 docs:` lines.

### docs-4 · README.md · fixed
- Controls: the flight cell of R says what the code does (level.js `resetSpot`): in the cabin back
  into the aisle at the same row; in the terminal the lounge; during the toilet dash the lounge or
  Ole's spot, never nearer the toilet, else "Inte härifrån!" (D7).
- A short paragraph on the guide markers (the yellow arrow over his head, the beam, the ring, the map
  star; the flight level's arrow round benches and seat rows; timed stages turning him and the camera)
  and the turbulence prompt (TURBULENS!, "Håll i dig!" before the seat prompts).
- The timers paragraph: measured with an autopilot (DESIGN §8), 0.5 s per target on foot, and the
  fail screen's E (retry from the last checkpoint, "Försök igen!") / Q (give up, take the mission
  again from its giver), as `S.retryPrompt` says.
- Cast: the telephonist ("Hytt två!", a voice with a portrait).
- Code map: `tools/pool.mjs`, `HANDOFF.md`, `notes/calibration-samples.md`, `notes/build-reports/`,
  and `pct`/`timerRange` in tools/lib.mjs.
- The mission table lists no timers, so nothing there moved.

### docs-5 · scenario names and paths · checked, nothing missing
- `node tools/shot.mjs` lists 40 scenarios; CLAUDE.md names the same 40 (13 core, 6 flight, 4
  scenery, 7 island, 3 cast, 2 meter/UI, `perf`, `fullstory kinds`, `calibrate calibflight`).
- Every file path in CLAUDE.md, HANDOFF.md and README.md exists (a script over the three files plus a
  hand check of the globbed and relative ones: `../CLAUDE.md`, the three sibling folders,
  `../.wt/charter-*`, `notes/research-plot.md:45`, `phase2-{…}.md`, `phase3-r{1,2,3}-*.md`). The only
  name not yet on disk was this report.

## Checks

| check | result |
|---|---|
| `node --check src/game/missions/flight.js` | ok |
| `PORT=8870 node tools/shot.mjs missions kinds` (`OUT/mk.log`; 15 GB available, 150 GB disk free) | `no errors`, **RESULT: PASS** |
| `node tools/pool.mjs` | every CURRENT pool's timer = the shipped one (read-only) |
| scenario names, file paths | all exist |
| the diff, read end to end | done |

No calibration run (sampling is closed), no `story` (no game code changed).

## Timers

None changed.

## Follow-ups / known issues

All in HANDOFF.md §4. For the orchestrator: tag `phase3` after the three green `story` runs; the
final Swedish report can take its known-issues section from HANDOFF §4 and its timer story from the
changelog summary. The common fixer brief still calls DESIGN "~250 KB"; it is about 500 KB now.
