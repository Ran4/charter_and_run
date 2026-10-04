## JUDGE fan

# Judgement: Charter & Run, designs A, B and C

The input cut off two of the designs. Design A's flight missions M1–M8 and cast section are missing, and so are Design B's §1–7.7 (cast, flight level and plane missions). I judged those parts from what survived: their test plans, work-package tables and risk lists. I checked the engine claims against `src/` and `notes/engine-*.md`.

## Scores

| Design | Fidelity to film | Fun | Buildability | Coherence | Sum |
|---|---|---|---|---|---|
| **A** (film lens) | **9** | 7 | 6 | 8 | 30 |
| **B** (gameplay lens) | 8 | **9** | 5 | 7 | 29 |
| **C** (build lens) | 6 | 6 | **9** | 8 | 29 |

**Short verdict, as a Swedish fan who loved Hit & Run:**
- **B** is the one I would most want to play. Every mission has a real mechanic, and the film's gags turn into gameplay: carrying Berra home ("Bärra hem Berra"), haggling the donkey down to 200 pesetas, the travel-sickness bar on bus 17, and bribing the hotel porter with 500 pesetas to drop your SKANDAL.
- **A** has the funniest script and the most faithful order of events.
- **C** is the one that will actually ship.

The best game is B's missions, played on A's script and film order, built on C's engine plan.

---

## Per-design notes

### A: film lens
**Strengths**
- The most disciplined source tagging: [F], [F*], [F-no], [N], and (t) for uncertain speaker.
- Level 1 includes Arlanda, where many of the top-quoted lines are: "Kolla terroristen", the toilets and "fyra P:na".
- Island missions follow the film's order of events.
- The bodega mission ends on the PEPES BODEGA sign in frame while nobody notices it, and the julafton mission pays it off.
- Good small touches: "Helan går" playing faintly on the first night, and Lasse's in-world punishment "Friskotek i morgon bitti".

**Weaknesses**
- The gameplay is mostly cutscene stages plus `rabbits`, which is used for about six "catch N things" stages (dog, balls, sheep, bottles, flowers…). It gets repetitive.
- The heart attack becomes a playable ambulance drive. That is a tonal risk and has no basis in the film.
- The grisfest is cost-gated at 800 pta with no fallback, so it can soft-lock.
- The Concorde-model collectibles are weaker than shark fins.
- Mantra on a new V key.

### B: gameplay lens
**Strengths**
- Each mission states its fun hook, and new mechanics are built directly on film beats:
  - the `smooth` ÅKSJUKA bar on bus 17;
  - `tail` behind Lasse at the friskotek;
  - `haggle`, plus a `fragile` wet-paint donkey delivery;
  - following the pig truck while piglets fall off;
  - the porcelain-smash stage;
  - a sneak-and-carry of Berra past the porter, while the Angerud/Carmencita "500 pesetas… det här är ju min fru" scene distracts him;
  - a finale chase to the plane, ending with Stig and Majsan saying the mantra together at the stairs.
- The meter design is the strongest: SKANDAL, Guardia Civil, two hideouts, a witness multiplier, and the "No soft locks: Ole pays" rule.
- The shop and wardrobe are extra fun on top.

**Weaknesses**
- Too much is P0: the player-driven trolley, plus `brace`, `rounds`, `sneak`, `haggle`, `tail`, `smash` and `PathWalker`, plus 13 missions and 3 bonus missions.
- The low-pitch interior camera is fragile.
- The José race rests on a scene moved off the plane.
- Destroying mamma's SEAT has a tone problem: you ram an old mother's car.

### C: build lens
**Strengths**
- The best engineering by a wide margin:
  - Everything is a level config at x=3000, with the cabin floor at CURB.
  - The cabin is a cut-away dollhouse with a steep camera that does no pull-in, and the camera maths checks out.
  - Flight phases are pure visuals in an `outside` group, and `setPhase(..., {instant})` on stage init makes retries safe.
  - The trolley is AI-only, with three guarded `car.js` edits. Duck-typed `car.ai` works because main.js calls `c.ai.update(h, this)` at main.js:824.
  - The flight meter panics instead of starting a pursuit.
  - There is an interactables registry, and content moves out into `content.js` so parallel agents don't collide.
  - Phase 0 delivers a stub cabin first.
  - The test plan is concrete.
- The juice gag becomes an interactive `interact` with a `cupUp` pose, and the sisters' points scene is correctly placed on the plane.

**Weaknesses**
- Fidelity holes:
  - Arlanda is skipped entirely.
  - Fan-list #1 "Bärra hem Berra", #3 "Invalido" and #4 "Måtte djävulen ta alla fruntimmer" are missing.
  - "Kolla terroristen" and the fyra P:na scene are missing.
  - Angerud's comeuppance is missing: the plot sold to someone else and the heart attack.
  - The night scene where Stig gives the mantra to Majsan is missing.
- The flight missions are chores (bags, bottles, seating passengers).
- The finale invents a "car steals the packet" chase.

---

## What the synthesis should take

### From C (engine and level-1 build: take almost all of it)
- **Phase-0 spine:**
  - extract `content.js`, `level.js` and `world/frame.js`;
  - the API signatures in §12.2;
  - a stub `buildCabin` with the full API;
  - fix `startMission` (wait 3 frames, then re-warp);
  - merge order and file ownership per agent.
- **Cabin:**
  - at x=3000, floor at CURB, cut-away with a down-facing ceiling plane;
  - camera profile `CAM_CABIN`: pitch 0.72–1.1, dist 6.5, `noPull`, plus the interior `frame()` variant;
  - Rad 13 missing from the seat map;
  - passengers merged into one bust mesh.
- **Flight phases** as an `outside` state machine: gate → takeoff (DUNS at t=10, "annars…") → climb whiteout → "Titta, solen!" with applause → cruise → approach → landing → landed. Disable jump in the cabin.
- **AI-only trolley** using `noEnter` and `bumpedT`, with the stewardess glued behind it.
- **FLYGRÄDSLA in `panic` mode:** use C's table of fear sources and relief, the `OLE_STATS` barks and the heartbeat. No pursuit in the plane.
- **Interactables:** sit/stand, toilet hide, galley juice, call button.
- **F2 juice gag**: the `interact` with the `cupUp` pose, followed by `carry`.
- **F4 landing:**
  - the sisters' points scene, kept on the plane where the film has it;
  - seating the standing passengers;
  - the landing mantra;
  - the tomato line given to Berra;
  - Robban's "skärpning nu".
- **Handover:** LAS PALMAS banner, `unseatAll`, `setLevel`, `placeNpcs(true)`.
- **Island:**
  - the MAP with Hotel Flamenco at the origin and Pepes Bodega on its back side from the start;
  - the geography: Fataga to the NW, airport to the NE, fyren to the SW, sea to the south;
  - prop flags `debris`/`splash`/`explode` instead of hard-coded type names;
  - `METERS` config objects.
- **I5 José tail with `minDist`** ("Följ José – men inte för nära"). It replaces B's destroy-mamma stage.
- **Applause SFX on every mission complete.**
- **Dialogue `cue` element**, the save key, and the test scenarios `cabin`, `trolley`, `panic` and `transition`, with timeScale 3 in tests.

### From A (story, script and fan service)
- **A compact Arlanda prologue as flight mission 1**, cuttable down to the gate only:
  - check-in: "Rökare eller icke-rökare? / No smoking", "Ja, men dyr!";
  - the metal-detector beep, the shoe and "Kolla terroristen!";
  - Ole's crash statistics at the gate (Stig and Ole meet here in the film);
  - the herrtoalett mantra with Berra's "Ska du ha? / tål inte starksprit";
  - the damtoalett fyra P:na as an outro;
  - Sulan's Pepes Bodega tip as chatter.
- **The film-order mission chain**, with A's dialogue sheets and source tags as the master script.
- **M9 bodega beats:**
  - "…havet är där, va. Då måste bodegan ligga ditåt";
  - "rena vischan";
  - the Eslöv roller-skier scene;
  - "Fan, de luktar / Skit i det, vi slipper gå";
  - the PEPES BODEGA sign framed with nobody noticing, then lit with a map label after julafton.
- **M7 "Hepåre"**: Angerud's röka from room 113, which sets up "Hälsa från mig, då. Hej på dig". Fold it into the friskotek outro per A's own cut list.
- **M10 Fataga** as a P1 mission:
  - the pool small talk with Majsan as the intro (G17, sunscreen on her back);
  - following the excursion bus to Lasse's PA tour lines;
  - mamma's "skock får";
  - Siv's "satsa på Ole".
- **M11 grisfest prelude**:
  - Ole's vitamins and blomster dialogue;
  - flower picking (`rabbits`, `flee:false`);
  - night palette, with cleanup restoring the day sky.
- **M12 chaos-scene lines** ("Limpio!", the seller, the family, the cleaner's "Stör jag?", "Gösta, ska du inte med…", "Ut! Ut!") as a cinematic.
- **Locations:** the DC-7 "drömplan" landmark at Bahía Feliz, also used by B. C does not have it.
- **Title, cues and rules:**
  - the title text, "Julen 1979. Stig-Helmer är flygrädd.", and the loading lines;
  - the "Helan går" cue;
  - the music rule: Små grodorna, Hej tomtegubbar and Helan går are the only melodies allowed (traditional).
- **Busted flavour line** layered on B's Guardia: Lasse, "Friskotek i morgon bitti."

### From B (island missions and systems)
- **I5 `buss17`**:
  - the ÅKSJUKA smoothness bar;
  - Lasse's arrival speech over the radio;
  - "Finns det svenskt kaffe… / Ja / Norsk da? / Ja";
  - Angerud's broken-down rental car by the road;
  - the overbooking and "havsutsikt" outro (but give "Momento" to the porter).
- **I6 `friskotek`**:
  - the outfit swap in the room, which is where the subtitles put it;
  - the sprint to the welcome meeting;
  - the oath cinematic;
  - `tail` behind Lasse with "Plocka kulor!" and jump cues.
  - Fallback: C's beach-ball `rabbits`.
- **I7 `asnan`**:
  - the `haggle` timing game: Ole's "To hundre er siste bud", the seller's "Jävla smålänningar!";
  - painting the donkey;
  - `fragile` delivery under the SKICK bar;
  - the Viking Bar outro with Angerud.
- **I9 pig truck** with piglets falling off. It ends on Angerud's "hittelön" hint scene: "Aj! Det ska jag göra."
- **I10 outro payoff**: mamma turns up by taxi anyway.
- **I11 grisfest structure**:
  - the porslinskross `smash`;
  - the dance cinematic, where Majsan asks him to dance;
  - **sneak-carry Berra** with the porter/Angerud distraction window;
  - from the balcony, "Måtte djävulen ta alla fruntimmer!";
  - the night mantra and the brown-beans exchange.
- **I12 finale**:
  - all the julfest payoffs: the Storch lens cap, the plastic giraffe, Pepes Bodega found, the knäckebröd opened with a butter knife;
  - a forced chase to the DC-8 with Angerud's rental car and a Guardia Land Rover;
  - the bungalow seller on the apron ("sålt tomten") and "Ut! Ut!", with the heart attack off-screen;
  - **Stig and Majsan saying the mantra together at the stairs**;
  - the Rio end card.
- **The SKANDAL meter:**
  - Guardia Civil Land Rovers plus a walking officer;
  - the witness multiplier;
  - hideouts: bribe the porter for 500 pta, or hide at the SunTrip office ("Hepåre!");
  - the busted line "Pass, pesetas, piral… nej, inte piral.";
  - the rule that Ole pays whenever the player is short of money.
- **Collectibles:** Oles prylar on climbable spots, plus **Hajfenor** in the pools ("Hajar i poolen? Delirium – ring kliniken"). Drop A's Concorde models.
- **Economy and extras:**
  - coins worth 25 pta;
  - the props table: parasoll, solstol, exploding butano, correos, vykort, julgran, tallrikar; all must be taller than 0.75;
  - stage `checkpoint`s;
  - B's music table: fear-driven lowpass on `flyg`, `skandal` paso doble, `gris` oom-pah, `rio` samba.
- **P1/P2 extras:**
  - P1: the Bungalowkungens bilar shop, with "Välkommen i det gröna!" and a buyable Guardia jeep that halves SKANDAL gain;
  - P1: the player-driven **Serveringsvagnen** service round (serve Angerud "varm middag": "…995. Sista minuten");
  - P2: Eslöv time trials.

### Proposed merged mission list (12; story test passes at `#12 idle`)

| # | id | Built from | Core mechanic | Must-have film beats |
|---|---|---|---|---|
| 1 | `arlanda` | A (compact) | `goto`/`interact` chain; fear rises at the gate; toilet mantra (hold J) | No smoking, Kolla terroristen, crash stats, tål inte starksprit, fyra P:na |
| 2 | `ombord` | C F1 | stow bags, find 14B, survive the takeoff | Rad 13, DUNS/"annars…", Titta solen + applause |
| 3 | `juice` | C F2 (+ B trolley at P1) | call-button `interact` and `carry`; P1 player-driven trolley round | juice gag, varm middag/995, medhavd sprit, Stenmark PA |
| 4 | `landning` | C F3+F4 | collect Berra's bottles and seat the standing passengers; landing mantra | the points scene, tomatoes, skärpning nu; post-landing cinematic: Invalido, "väskan har inte kommit" |
| 5 | `buss17` | B I5 | coach with the ÅKSJUKA bar | Lasse's speech, svenskt/norskt kaffe, overbooking, Momento (porter) |
| 6 | `friskotek` | B I6 + A M7 outro | outfit swap, sprint, `tail` | oath, Plocka kulor, Hepåre exchange |
| 7 | `asnan` | B I7 | `haggle` + `fragile` | Caballo folcloristico, smålänningar, Viking Bar card |
| 8 | `bodega` | B I9 + A M9 | follow the pig truck, thirst timer | ditåt, vischan, Heja Eslöv, Benidorm, hidden sign, hittelön hint |
| 9 | `ropavieja` | C I5 + B outro | `follow` with `minDist` | Ropa vieja, mamma follows anyway, satsa på Ole |
| 10 | `fataga` (P1) | A M10 | follow the excursion bus; sheep | Lasse's guide lines, skock får, svärmor |
| 11 | `grisfest` | B I11 + A M11 prelude | flowers → smash → dance → sneak-carry | blomster, Heia Norge, Bärra hem Berra, 500 pesetas, Måtte djävulen, mantra to Majsan, bruna bönor |
| 12 | `julafton` | B I12 + A chaos lines | suitcase grab → julfest cinematic → forced chase → mantra at the stairs | lens cap, giraffe, bodega found, 50 000 in the knäckebröd, tomten såld, Rio card |

### Drop or defer
- **A:**
  - the playable heart-attack drive (stages 7–8 of M12);
  - Concorde collectibles (keep Concorde only as Ole's line);
  - the V key (hold J instead);
  - the cost gate without a fallback;
  - the Rio card placed at x=3000;
  - the security dog as a `rabbits` catch. Keep "Fin hund" as a scene.
- **B:**
  - the destroy-mamma's-SEAT stage;
  - the player trolley at P0 (move to P1);
  - the José race and the relocated points scene (cut, or keep as an optional side race);
  - the low-pitch camera profile;
  - outfits beyond kostym, hawaii, rio and bucket;
  - the aisle-chase PANIK pursuit (P2);
  - the full song verse as bubbles;
  - the plane name "Gurli Viking";
  - Ole speaking Swedish.
- **C:**
  - the airport-only start with no Arlanda;
  - the finale where Angerud steals the packet and you destroy his car;
  - the island-harbour "RIO" boat epilogue (use the Copacabana card);
  - the DISA and KAS signs;
  - "Hej på dig!" with no setup.

---

## Factual errors (checked against the research)

1. **C, F4.** C swaps "Vad skönt att komma bort!" and "Jag ska inte bort, jag ska hem." between the speakers. Siv says the first line. José answers with the second, because he is flying *home* for Christmas. Swapped, the joke makes no sense. B has it right.
2. **C, I1.** "Momento." is given to Lasse. The hotel porter says it, while he shows the sea view with a mirror.
3. **C, §2.** C says "the film says he borrows Ole's clothes at the airport". The clothes scene ("Du kan ikke gå sånn her nede… Shorts" / "Är den inte lite skrikig?") is in the hotel room, at about 0:47 in the subtitles. SFDb only says he is wearing Ole's clothes.
4. **B, I9.** "Sulan har varit på Pepes Bodega…" is given to Robban. Berra says it to Robban, at Arlanda.
5. **B, I5 and I12.** Ole speaks Swedish ("Det betyder 'god jul' på spanska", "Kallar ni det här för havsutsikt?"). That breaks the brief, which has Ole speaking Norwegian. A and C correctly use "Det betyr 'god jul' på spansk".
6. **A, M11.** Stig is given "Vi kan be receptionen sätta en blomster i deras rum". The research marks "blomster" as Ole's Norwegian word, and the order of the flower exchange is unverified. Give the line to Ole or tag it (t).
7. **All three designs: "Du… gillar du bruna bönor?" / "Jag avskyr bruna bönor."** The research contradicts itself: plot §8.1 has Stig asking, while characters §2.1 and §2.3 have Majsan asking. Keeping Majsan as the asker reads well (she is testing him against Sture), but tag it (t).
8. **B and C: "Hittelön." / "Tack så mycket."** Both are presented as firm [F] with Stig thanking. The speakers are unverified. The airport man may well say both lines: he asks for the reward, then thanks Stig for it. Tag (t).
9. **A, M12 chaos scene.** Mamma ("Ni har dragit skam…") and Carmencita ("Det är inte han. Den andre!") are attributed without (t). The research only says "Josés familj rusar in".
10. **C, I4.** Stig says "God jul, moster." That is the text on the card, which Angerud reads at Viking Bar.
11. **C, I3.** The "Ska du ha?" exchange is moved from the Arlanda men's toilet, where it follows Stig's "Jag håller på med yoga…", to the poolbar, which loses its setup. C also gives "Fan, vad jag är törstig" to Berra, while Wikiquote has Robban as the thirsty one.
12. **C, I2.** "Hej på dig!" is used with no setup. It only works as Lasse's brush-off of Angerud's "Vet du om att jag känner ägaren?".
13. **C, F1.** "Plats 14B? Längst fram, efter rad tolv." Row 14 is mid-cabin, not at the front. C also calls its cabin "about 1.25× a real DC-8". Its interior is 4.9 m wide against the real 3.51 m, so it is 1.4×.
14. **B, I8.** The points scene ("Pizza-racern… fem poäng / Giraffen… fyra") is on the plane in the film. B moves it to the pool. C places it correctly.
15. **Angerud's heart attack.** In the film it happens in his hotel room during the julfest chaos, and he is taken to hospital off-screen. A's playable drive and B's apron setting are both inventions; A's carries the tonal risk.
16. **Breaking their own rules on brands and names.**
    - C uses DISA (petrol sign) and KAS (vending machine), both real brands.
    - B names the plane after Gurli Åberg, Lasse Åberg's mother and a real private person.
17. **B, I6.** B shows the whole first verse of the SunTrip song. Keep lyrics to one or two spoken lines.
18. **C's ending.** C puts the "RIO" boat in the island's own harbour. The film's ending is a boat outside Copacabana in Rio. A's and B's end cards are faithful.

## Engine impossibilities and traps

1. **`race.passenger` seats the passenger in the opponent's car** (`missions.js:221`, `g.seat(this.pass, opp, -1)`).
   - C's I6 says "Bussen gikk uten oss!" but `passenger:'ole'` puts Ole inside Lasse's bus.
   - B's I8 wants "Ole som kartleser" in the player's car, which race cannot do.
   - A's M11 sits Ole in Gabbe's bus.
   - Fix: add a `playerPassenger` option, or rewrite the intros.
2. **`rabbits` spawns 18–55 m out through `freeSpot`** (`missions.js:169`). `freeSpot` rejects any spot with |x| or |z| > BOUND−5 and then falls back to the centre (`main.js:340-347`). At x=3000, every rabbit spawns on one point. This affects A's dog and bottles and B's plane rabbits until `rMin`/`rMax` and level bounds are added. C avoids it with fixed-spot `collect`.
3. **B's grisfest `smash` cannot be retried.** Props cannot be spawned at runtime; they must exist before `finalizeProps`. They respawn only after 75–115 s, and only while the player is more than 70 m away (`props.js:184-195`). A retry resumes at the farm checkpoint with the plates still broken, so the stage cannot be won. Fix: a `reviveProps(type, area)` API, or plate stacks that are pre-placed and kept inert until the stage starts.
4. **Flight sets can see each other.** A's Arlanda hall and apron, and B's gate lounge and jet bridge, share x=3000 with the cut-away cabin. With a steep camera and cruise fog far at about 900 m, they stay visible next to and below the "flying" plane. Hide those groups and mark their collision `dead` by phase, or separate them by more than 1 km with flight fog shorter than the gap. C's gate is only a visual disc in the `outside` group, so C is fine.
5. **C's open hat racks** (y 2.0–2.3, spanning the seat blocks) are opaque from above. At pitch 0.72–1.1 they cover the seat rows and hide Ole at 14A, the call-button gag and the seated cast. Make them down-facing only, like the ceiling, or narrow shelves along the walls.
6. **C's leg room is too tight.** Cushion plus legroom is 0.8 m, against a character circle 0.72 m across: 4 cm of slack. Ducking into a row to let the trolley pass will jitter and clip. Use a seat pitch of at least 1.1 m or thinner seat backs.
7. **B's interior camera.** `segmentBlocked` takes a single `ignoreKind` (`collision.js:274`). B ignores the `bound` walls and lets pitch drop to 0.3, so the camera can end up outside the fuselage, behind visible wall meshes. Use C's steep camera profile with no pull-in.
8. **B's player-driven trolley at P0 needs about ten engine changes.**
   - `maxSpeed` is not a hard cap (`car.js:215-216`).
   - The player's car gets a 2× boost (`car.js:205-207`).
   - The wheels swap axles (`car.js:138/143`).
   - Step height is fixed at 0.6 (`car.js:250/296/367`).
   - It also needs a seat pose and fling settings.
   - Make it P1, behind C's AI-only trolley.
9. **No ceilings.** The double jump (8.6 then 8.0 m/s, `main.js:739-741`) pokes through an invisible ceiling. Disable jump and stomp in the flight level. C does this; A and B don't say.
10. **The walking Guardia officer has no pathfinding** (B and C). With real collision he wedges on the first hotel wall. Add wall-slide steering and re-spawn him behind the player when he has been stuck for more than 3 s.
11. **A's 800-pta grisfest gate can soft-lock.** Money also drains through busted fines, PANIK −25 and FRISKOTEKET −250, and there is no fallback. Adopt B's rule that Ole pays.
12. **A's Rio card at (3000, 1200)** is 1.2 km from the flight set, inside the camera's far plane of 1800 m. Put it at x=−3000.
13. **C's parked DC-8 at (240, −335)** sits in today's tree ring (295–344 m, trees with colliders) and across the bound wall at 314. The outskirts rewrite has to clear that sector.
14. **One passenger seat per car.** A's `pickup.also` and B's extra riders can only be decorative busts. Both designs acknowledge this.
15. **Dead hooks.** `shame.locked` and `state='hidden'` are never set anywhere in the engine today, and all three designs depend on them. Wire them in phase 0.
16. **Story-test windows.** `waitIdle` allows 90 s for the remaining stages plus the outro, and auto-dialogue runs at about (len+30)/55 s per line. A's M12 and B's I11/I12 carry 20+ cinematic lines on top of their timers. Add a test-mode dialogue speed-up; C's timeScale 3 only speeds up the cabin phases.

---

## JUDGE lead

# Charter & Run: engineering-lead review of designs A, B and C

**Input caveat.** Designs A and B reached me truncated:
- **A** starts partway through M9 (of 12), so its level-1 missions M0–M3 are missing.
- **B** starts at §7.7, so its flight missions and flight mechanics are missing.

I judged their level 1 from their test plans, work packages and risk tables. I checked every engine claim below against the code in `charter_and_run__sallskapsresan/src` and the `notes/engine-*.md` files.

## 1. Scores

| Design | Film fidelity | Fun | Buildable in this engine | Coherence | Sum |
|---|---|---|---|---|---|
| **A** (film lens) | **9** | 7 | 6 | 8 | 30 |
| **B** (gameplay lens) | 7 | **9** | **3** | 6 | 25 |
| **C** (build lens) | 6 | 6 | **9** | **9** | 30 |

**A** has the most faithful script:
- It covers nearly every film thread: Arlanda, the röka and hepåre scene, the golf and bungalow, the donkey, the bodega odyssey via the pig truck and "Heja Eslöv", Fataga, the grisfest with the porter and "Måtte djävulen", and the Christmas-Eve chaos in room 113.
- It marks uncertain speakers with (t).
- Mechanically it mostly reuses existing stage kinds, but it is big: 19 block builders, about 30 characters, 12 missions, a two-passenger `also`, and an Arlanda terminal hall on top of the cabin.
- Its WP-A owns all of `main.js` as one serial package, which makes it the bottleneck.

**B** is the most fun on paper:
- The bus with an ÅKSJUKA (motion sickness) bar, a haggling timing game, a "fragile" donkey delivery, the porter bribe as a hideout, and a mantra bookend at the plane stairs.
- But it needs about 8 new stage kinds (brace, rounds, sneak, haggle, tail, smash, carry, mantra), a new PathWalker actor, a Meter rename and refactor, and a player-driven trolley that touches about 10 places in `car.js`/`main.js`. It also adds stealth cones, a shop, a 7-outfit wardrobe and bonus time trials.
- It cannot ship in one push.
- Some content breaks its own rules: "Gurli Viking", and ramming José's mother's car.

**C** has the right skeleton:
- One serial spine phase.
- `content.js` and `level.js` are extracted so parallel agents never share `main.js`.
- The cabin stays at ground level while the outside scenery is animated around it.
- The cabin camera has a steep pitch and no pull-in.
- The trolley is AI-only, behind 3 guarded `car.js` edits.
- The existing `Shame` class is kept and gets a `configure()` with panic and pursuit modes.
- It has P0/P1/P2 priorities and a stub cabin, so mission and test work can start on day one.

Its weakness is content: a thin island with 7 missions, three real speaker errors, and an invented finale that drops Angerud's payoff.

**Verdict:** build on C's architecture and level 1, use A's island script and dialogue, and add a few of B's cheap mechanic options.

## 2. What the synthesis should take

### From C (the base)
- **Phase plan.** Phase 0 is serial and covers:
  - extracting `content.js`, `level.js` and `world/frame.js`
  - every API in C §12.2
  - a stub cabin
  - the `startMission` race fix
  
  Phase 1 runs 6 agents in parallel, each owning its own files. Phase 2 is serial integration.
- **Cabin spec (§4.1):**
  - Rows 1–12 and 14–24, with no row 13.
  - Cushions with top 0.55 work as floors. Seat backs with top 1.25 are walls to both people and the trolley.
  - The outer walls are `bound` boxes at least 1 m thick, with top 99.
  - The ceiling is a plane that faces down, so it is invisible from above.
- **Camera profile `CAM_CABIN`:** pitch from 0.72 to 1.1, `noPull`, and a cinematic shot taken high up inside the cabin footprint.
- **Flight phases** (`gate`, `takeoff`, `climb`, `cruise`, `approach`, `landing`, `landed`):
  - The plane never moves; the outside scenery moves around it.
  - Each mission's first stage calls `setPhase(x, {instant: true})`, so retries and `?mission=N` start from the right sky.
- **FLYGRÄDSLA (fear of flying) meter in `panic` mode:** no pursuit, and a seated player cannot reach 100 from the scripted sources, which keeps the story test safe.
- **Interactables registry:** sit/stand, toilet, juice, call button.
- **AI-only trolley:** a `Car` with an inline `ai.update`, the `s.build` early return and `noWheels`.
- **Handover `transitionTo('island')`.** On load, the level is derived from the mission index.
- **Missions F1–F4** with the fixes in §4. F2 (the juice scene) is the heart of level 1.
- **Island map:** the 7×7 grid with Hotel Flamenco at the origin and Pepes Bodega on its north side, the back of the hotel. All three designs agree on that placement, which matches the film.
- **I5 `ropavieja`:** follow José with `minDist`, so the player has to stay out of sight.
- **Test plan:** `startMission` steps, and the `cabin`, `trolley`, `panic` and `transition` scenarios.

### From A (content and polish)
- **Dialogue tables** for every island mission that overlaps with another design. They are the most accurate and carry (t) markers. Fix them per §4.
- **M10 `fataga`:** `follow` the excursion bus, then `rabbits` sheep, with Josés mamma's line "skock får". It is cheap and true to the film. P1.
- **M11 `grisfest` skeleton:**
  1. `rabbits` flowers with `flee:false`.
  2. Race the night bus.
  3. Dance scene.
  4. "Bärra hem Berra" pickup at Tonga Tonga.
  5. Drive to Flamenco.
  
  The outro is Majsan's "gruvar mig för flygresan", Stig's mantra, the porter's "500 pesetas", and "Måtte djävulen". Also take A's rule that mission `cleanup` restores the `island` sky and tune.
- **M12 stages 1–3:** destroy the `bagagebil` (baggage tractor) to rescue the suitcase, then the "Hittelön" exchange. After the party scene, take A's **room-113 chaos cutscene**: Limpio, the plot already sold, the Rodriguez family, "Ut! Ut!".
- **"Hepåre":** fold A's M6 exchange (fetching Angerud's röka) into another mission's outro. It is number 9 on the fans' top-ten list.
- **Sky palettes:** A's per-phase palettes (`arlanda`, `clouds`, `above`, `descent`, `island`, `night`), merged into C's phase table.
- **Music:** A's tune table (`muzak`, `sol`, `vals`, `jul`, `samba`). Only public-domain traditional tunes: "Små grodorna", "Hej tomtegubbar", "Helan går".
- **UI text:** A's full Swedish HUD string table, title-screen text and loading lines.
- **Tests:** `addCoins(3000)` at story start, so missions with an entry cost can start under `FROM=`.
- **Cut list:** A's cut order.

### From B (cheap options only)
- **`goto` options:**
  - `smooth` with the ÅKSJUKA bar, for buss17.
  - `fragile` with the SKICK bar, for the wet-painted donkey.
  
  Each is about 30 lines on an existing kind.
- **Fear drives a music lowpass**, plus a heartbeat above 80.
- **SKANDAL meter with the Guardia Civil**, which C also uses:
  - Porter bribe ("Muta portiern", 500 pta) as a safe zone (P1).
  - "Herr Storch filming nearby" toast "Ingen fara: linsskyddet sitter på."
- **No soft locks:** when the player can't afford an entry cost, Ole pays.
- **Givers:** each giver's `HOMES` entry equals its mission's `at`.
- **Props list** with the rule top > 0.75 so cars smash them (`parasoll`, `solstol`, `butano` explodes, `vykort`, `julgran`, `tallrikar`).
- **Hajfenor (shark fins), 7 in the pools.** B and C proposed them independently, and they come from Lasse's line "Hajar i poolen? Delirium – ring kliniken" and the stills.
- **Cutaways:**
  - Angerud hints at "hittelön" to a sunburned Stig at the pool ("Aj! Det ska jag göra.").
  - Angerud calls Levander and gets the answering machine, then Levander phones back from Åre.
- **Thematic bookend:** Majsan dreads the flight home and Stig says "Jag kan flyga, jag är inte rädd." Do it as the finale outro, not as B's island stage that switches the meter.
- **Haggling minigame** at P1, with C's radio-only haggling as the fallback.

### Proposed final run (12 missions, C's budget plus one)

**Level 1, Flygresan:**
- F1 `ombord`
- F2 `juice`
- F3 `sprit`
- F4 `landning` (all per C)

**Island:**
- I1 `buss17` (C, plus B's `smooth`, plus the porter's "Momento")
- I2 `friskotek` (rabbits beach balls, plus the outfit swap at P1, plus the hepåre outro)
- I3 `asnan` (C, plus B's `fragile`)
- I4 `bodega` (C, plus A's camera beat on the bodega sign, plus B's hittelön cutaway; unlocks the `grisbil`)
- I5 `ropavieja` (C, plus the Levander answering-machine cutaway)
- I6 `fataga` (A; P1)
- I7 `grisfest` (A)
- I8 `julafton`:
  1. A's stages 1–3.
  2. Party payoffs: lens cap, giraffe, Pepes Bodega, the 50,000 kr.
  3. Room-113 chaos, with the heart attack off-screen and an ambulance siren.
  4. Optional `goto` with `shame:true` to the harbour.
  5. C's Rio boat at `hamn`, with the mantra bookend.

## 3. What to drop

- **From B:**
  - the player-driven trolley and the `brace`, `rounds`, `sneak`/`carry`, `tail` and PathWalker mechanics (`tail` at P2 at best)
  - the in-plane pursuit by a crew member
  - renaming Shame to Meter
  - the car shop and the buyable Guardia Land Rover
  - the 7-outfit wardrobe (keep `flyg`, `sol`, `rio`)
  - the bonus Eslöv trials
  - the José race (P2)
  - I10, ramming the mother's SEAT (tone)
  - the heart attack on the airport apron
  - the name "Gurli Viking"
- **From A:**
  - The full Arlanda terminal (check-in, security, baggage belt, sniffer-dog rabbit). The brief says level 1 is "själva flygresan" (the flight itself). Keep Arlanda's lines as gate and cabin dialogue.
  - The Rio card at x=3000.
  - The Concorde-model collectibles (use the hajfenor instead).
  - The Lasse/SunTrip-van pursuit (use the Guardia Civil instead).
  - Driving the heart-attack victim to the clinic on a timer.
  - The two-passenger `also` (Robban becomes a decorative bust).
  - A separate V key for the mantra (hold J, as B and C do).
  - M7 `bungalowen` as its own mission.
  - Cutting the 19 block builders down to about 12.
- **From C:**
  - Angerud stealing the crispbread packet.
  - The single Storch NPC (add Fru Storch).
  - The DISA, KAS and FANTASY BAR signs.
  - Placing cabin coins before `initCoins`.

## 4. Factual errors against the research

| Design | Error | Correct per research |
|---|---|---|
| **C** F4 | José says "Vad skönt att komma bort!" and Siv answers "Jag ska inte bort, jag ska hem." C calls this an order swap, but it swaps the speakers. | José (who lives in Sweden) is the one going *home*. Siv is going away. |
| **C** cast, I1 | There is no Fru Storch. Herr Storch voices "Finns det svenskt kaffe på hotellet?" | It is Fru Storch's line [WQ]. She also has "Storch, inte Stork" and "bränsletillägg". |
| **C** I1 outro | "Momento." is given to Lasse. | It is the hotel porter's line (§7.3). |
| **C** cast | Says Stig borrows Ole's clothes "at the airport". | The dialogue ("Du kan inte gå runt så där här nere…") is in the hotel room (§7.5). SFDb only summarises it. |
| **C** F1 | "Titta, solen!" is given to Majsan and tagged [F]. | The speaker is not identified in any source. |
| **C** F1 | Ole's crash statistics and the first introduction happen in the cabin, tagged as film lines. | They happen at the Arlanda gate. Label them as relocated. |
| **C** F3, I4 | "Plomberat och klart" goes to Berra; "God jul, moster" goes to Stig. | Sulan says the first. The second is the card Angerud reads. |
| **C** I7 | Angerud steals the packet, and the plot sale, room chaos and heart attack are dropped. | This invents a new event and loses the payoff of Angerud's whole thread. |
| **C** §1 vs §5 | Bans real brands, then uses DISA, KAS and the "Fantasy" bar. | These are real Canarian and Spanish brands and a real Kasbah bar. |
| **C** §4.1 | "About 1.25× a real DC-8 cabin." | 4.9 m against 3.51 m is about 1.4×. |
| **C** F2 | The captain's announcement comes after the juice scene. | In the film it comes first (about 28:26 against 29:28). Harmless. |
| **B** I7 | Stig says "Hur mycket?" and "200?". | Ole does the haggling ("Ole prutar som en smålänning"). |
| **B** I9 | Robban says "Sulan har varit på Pepes Bodega…". | Berra says it to Robban. |
| **B** I11 | The Tonga Tonga invitation comes after "Bärra hem Berra". | The film runs grisfest, then Tonga Tonga, then carrying Berra home. |
| **B** I12 | The heart attack and "sålt tomten" happen on the airport apron, and the gang flies off on Christmas Eve. | Both happen in Angerud's room 113. No departure is shown, only Rio. These are unlabeled inventions. |
| **B** I5 | "Kallar ni det här för havsutsikt?" is given to Ole as fact. | The speaker is unknown. |
| **B** I10 | José's mother drives a SEAT and gets rammed. | She just comes along to the restaurant and sits at the next table. |
| **B** | Plane named "Gurli Viking". | Gurli Åberg is Lasse Åberg's real mother [IMDb trivia]. This breaks B's own no-real-people rule. |
| **A** M10 | José's "Ropa vieja… pyttipanna" is said by Siv and tagged [F]. | Should be [F~], a retelling. |
| **A** M11 | Splits the "blomster" exchange so Stig says the receptionist line. | The research ties the Norwegian word "blomster" to Ole, and SUB-NO gives the melon line to Ole. Mark (t). |
| **A, B** M11 / I11 | Majsan asks "Du… gillar du bruna bönor?" | The research contradicts itself: plot §8.1 says Stig asks. Mark (t). |
| **A** M11, M12 | "Får jag lov…" to Stig, "Hej tomtegubbar…" to Lasse, and "Det är inte han. Den andre!" to Carmencita, without (t). | No source names these speakers. |
| **A** M12 | The suitcase is recovered at the airport. | In the film an airport man brings it to the hotel door. Fine as [N], but "Hittelön" belongs at the door. |
| **A** Rio card | "The four characters in white jackets." | Only Stig-Helmer and Ole wear white dinner jackets. The sisters are "uppklädda" (dressed up). |

## 5. Engine traps and impossibilities (checked in code)

Coverage key: **yes** = the design handles it, **no** = it misses it, **?** = in the part I did not receive.

| # | Trap | Evidence | A | B | C | Fix |
|---|---|---|---|---|---|---|
| 1 | **Outro speaker relocation.** `complete()` teleports the first outro speaker next to the player if `!n.car`. A seated cabin NPC is not in a `Car`, so it gets pulled out of its seat. With trap 2's fallback it lands exactly on the player, and the push-apart is skipped when `d ≤ 0.001`. | missions.js:596–604, main.js:903 | no | no | no | Skip `busy`/seated speakers and use a level-aware `freeSpot`. |
| 2 | **`freeSpot` falls back to its centre** whenever \|x\| > 309. Rabbits, `grab`, and trap 1 then all spawn at one point. | main.js:340–348; missions.js:169, 327 | yes | yes | **no** (`collect` avoids it, `grab` and the outro don't) | Per-level bounds. |
| 3 | **Coins before `initCoins` are dropped silently.** `placeCoin` before `initCoins` does nothing, and `initCoins` runs *after* `finalizeProps`. C says to register cabin coins before `finalizeProps`. The pool is 500 coins, shared by fixed and burst coins. | pickups.js:12–48; main.js:85–88 | ? | ? | **wrong** | Place cabin coins after `initCoins`. Budget the fixed-coin count. |
| 4 | **`placeNpcs(force)` teleports every NPC that is not busy and not in a car**, which includes seated plane passengers. | main.js:649–670 | yes | yes | yes | `busy = true` for plane-seated NPCs. |
| 5 | **Seated characters never update their root.** `sync()` returns before positioning, so bubbles and the "!" marker go wherever x/y/z points. | character.js:150 | yes | yes | yes | Set root and x/y/z by hand. |
| 6 | **Camera in the cabin:** the two-shot sits at least 4.5 m to the side (behind a wall), the pull-in floor is 1.6 m, and `segmentBlocked` returns the *first* block in query order, not the nearest hit. | camera.js:70, 104–115; collision.js:274–286 | yes | yes | yes (`noPull`) | C's profile and cinematic variant. |
| 7 | **Global fog fogs the cabin.** A's `clouds` (5/60) and C's whiteout (4–45 m) also wash out the interior: the player is about 7 m from the camera and the cabin is 30 m long. | gfx.js:31 | no | ? | no | Turn fog off on interior materials, or fake the whiteout with cloud puffs and window colour. |
| 8 | **C contradicts itself:** the wings and fin live in the `outside` group, but `outside.rotation.x` is used to pitch the world, so the wings would tilt off the fuselage. | C §4.1 vs §4.3 | – | – | **bug** | Split a static `airframe` group from an animated `scenery` group. |
| 9 | **Car speed and step:** top speed is a soft cap (throttle keeps adding at least 8 %), the player's car gets 2×, and the 0.6 step lets a trolley climb onto the 0.55 cushions. | car.js:206, 216, 250 | ? | yes | yes (AI only, centred) | Keep the trolley AI-only. |
| 10 | **All passengers share one seat** (side −1, same position), so two real passengers overlap. | main.js:289–306 | yes | yes | yes | Decorative rear busts. |
| 11 | **Pursuit at x=3000:** `add()` auto-starts a pursuit at 100, `forced` restarts it every frame, and no road nodes lie 70–150 m away, so you get a silent pursuit with only the floating Wizard on foot. | shame.js:43, 57–62, 148 | yes | yes | yes | Panic mode must branch before `startPursuit`. |
| 12 | **A walking pursuer snags.** Going straight at the player with wall sliding gets stuck behind buildings, so the chase becomes trivial to escape on foot. | shame.js:110–127; character.js `collideWalls` | ? | no | no | Steer the officer with `routeAim`, and teleport him closer when he is stuck out of view. |
| 13 | **Props must exist before `finalizeProps`** (InstancedMesh). Cars drive over any prop with top ≤ 0.75. | props.js:107; car.js `collideStatic` | yes | yes | yes | — |
| 14 | **Hard-coded Bigmouth names:** 21 `'nick'` references across main.js, hud.js and missions.js; the chatter fallback `'Hey Nick.'`; the `cleanupMission` NPC list; the bust text; "BRIDGETON COMPLETE!". | main.js:940; missions.js:579, 625, 664 | ? | partial | partial | One `PLAYER_KEY` plus a string pass. |
| 15 | **Portraits** are rendered once, only for `HOMES` keys plus `nick` and `shame`. C's per-level `HOMES = {flight, island}` breaks that loop. Radio-only speakers and outfit swaps need renders, and `renderPortrait` leaves the model root at the origin. | main.js:129 | partial | partial | partial | Iterate over the cast list. Re-render after `setDef`. |
| 16 | **`updateAudio` zeroes the engine sound every frame on foot**, so a cabin drone needs its own channel. | main.js:1063–1080 | yes | yes | yes | — |
| 17 | **`tickSky` pins the town clouds at y=0** around the camera, so they show around the plane. | gfx.js:312–316 | yes | yes | yes (hide) | — |
| 18 | **Town-only helpers:** R-reset uses a hard-coded 280/80; the title orbits `birch`; the base map covers ±334 m; `routeAim` routes beyond 45 m via town nodes. A's Arlanda hall plus jetway plus cabin would send the guide arrow toward the town. | main.js:689, 751; hud.js:14; layout.js `routeAim` | partial | yes | yes | Keep every flight target under 45 m apart. |
| 19 | **Sunken pools are impossible**: nothing can sit below the base ground. A is right. B's rim basin and C's flat floor both work. | collision.js `groundAt`, layout.js `baseGround` | yes | yes | yes | — |
| 20 | **Night palette leak:** `fail()` doesn't restore the sky or tune, and `abort()` does no cleanup at all. | missions.js:610–660 | yes | no | n/a | Mission `cleanup` hook. |
| 21 | **Music scheduler** plays all missed bars at once after a stall. | audio.js:161 | yes | yes | yes | — |
| 22 | **Talk blips** use `/[a-z]/i`, so å, ä, ö, æ, ø stay silent. | hud.js:206 | yes | yes | yes | `/\p{L}/u` |
| 23 | **Story pass check:** `story` prints `no errors` even after `scenario failed`, and the giver race at shot.mjs:112 can flake it. | tools/shot.mjs | yes | yes | yes | Check both strings. |
| 24 | **Rio card in the flight sky:** A's card at (3000, 1200) is 1,200 m from the cabin, inside the 1,800 m far plane, so it shows as fogged silhouettes. | gfx.js:18 | **bug** | – | – | C's harbour boat. |
| 25 | **Leg-room gap:** C's gap between seat backs is 0.8 m against a body 0.72 m wide. Stepping out of the aisle to let the trolley pass is legal but fiddly. | C §4.1 | – | – | risk | Make the trolley wait when blocked, rather than requiring the player to dodge. |

**Other design-level risks:**
- Entry costs can soft-lock the player after fines. Fix with B's "Ole pays" rule.
- Test-mode auto-mantra never exercises the panic-fail path. Add C's `panic` scenario.
- Change the save key from Bigmouth's, and update the parent `../CLAUDE.md` "latest game" pointer (all three include this).

---

## JUDGE critic

# Critique of the three Charter & Run designs

The input was truncated. Design A starts partway through its M9 Bodega mission, so its flight missions M1–M4 and its §1–§6 are missing. Design B starts partway through §7.7, so its plane missions and plane mechanics are missing. I judged those parts from each design's test plan, work packages and risk tables. I checked the engine claims against the source in `charter_and_run__sallskapsresan/src/` and cite file and line numbers where it matters.

## Scores

| | Fidelity to the film | Fun | Buildability in the engine | Coherence | **Total /40** |
|---|---|---|---|---|---|
| **A (film lens)** | **9** | 7 | 6 | 7 | **29** |
| **B (gameplay lens)** | 8 | **9** | 4 | 7 | **28** |
| **C (build lens)** | 6 | 6 | **9** | **8** | **29** |

**Why these scores:**
- **Design A** has the best film fidelity. It has the densest set of correctly sourced lines, and its marking ([F], [F*], [F-no], (t), [N]) is careful. Its julafton payoff covers the lens cap, the plastic giraffe, Pepes Bodega, the money, the chaos in Angerud's room with the cleaning lady, the seller and Carmencita's family, and then Rio. Its Bodega odyssey runs ditåt → vischan → Eslöv → grisbil → Benidorm. Its grisfest has the vitamins, the flowers, the dance, Heia Norge, Tonga Tonga, "Bärra hem Berra", the receptionist and the balcony.
- **Design B** has the most fun mechanics. It uses many new stage kinds and a drivable trolley, so it is the hardest to build.
- **Design C** is the only design whose engine claims hold up when checked:
  - `CURB` 0.15 (`layout.js:10`)
  - `STEP` 0.45 (`character.js:8`)
  - camera far plane 1800 (`gfx.js:18`)
  - the `'nick'` check (`hud.js:188`)
  - the glass null guard (`car.js:131`)
  - `placeNpcs` skipping `busy` (`main.js:653`)

  C's island story is thin, though. It drops several of the top-10 fan quotes, Fru Storch, and the Angerud payoff.

## What the final synthesis should take

### From C: the backbone, and most of level 1

- **Architecture:**
  - Phase-0 spine: `content.js` and `level.js`, the APIs in §12.2, and `Shame.configure` with `panic` and `pursuit` modes while keeping the `game.shame` name.
  - Per-level `HOMES`, with hidden or seated NPCs.
  - `hud.setMapSource` and the generic interactables registry.
  - The stub cabin, so missions and tests can run before the real cabin exists.
- **Cabin:**
  - Placed at x = 3000 with the floor at CURB.
  - **Cut-away dollhouse.** The ceiling is a down-facing plane. The camera profile uses pitch 0.72–1.1 with no pull-in. The numbers check out against `camera.js:69–70`, where the pull-in has a 1.6 m minimum and must be switched off.
  - The collision table: seat back top 1.25, cushion top 0.55, walls at least 1 m thick, empty aisle seats as pull-ins to let the trolley past, and no props in the cabin.
  - Row 13 missing, as on the real Scanair DC-8-62 seat map.
- **Flight phases** run as animation of an `outside` group around a stationary cabin. Each mission's `init` snaps the sky to its required phase, so retries always start in the right state.
- **Trolley** is a `Car` the player cannot enter, driven by a mini-AI. It needs only three guarded `car.js` edits. The player-driven trolley stays P2 at most.
- **FLYGRÄDSLA meter.** Use C's source table, including the `OLE_STATS` barks taken from the film's crash statistics, its relief table, and its panic behaviour: no pursuit, and the player is sent back to seat 14B.
- **Flight missions to keep:**
  - **F1:** the takeoff thud plus Ole's "Hydraulikk… Ellers…" followed by "Titta, solen!" and applause.
  - **F2:** the juice interact with the `cupUp` pose, then the captain's Stenmark announcement and the Concorde dream.
  - **F3:** "Medhavd sprit", collecting the hidden bottles, with Stig-Helmer's "jag tål inte starksprit" turned into a joke about being the right man for the job.
  - **F4:** the sisters' points scene, the seatbelt round-up, mantra on approach, then landing with applause and the tomato line.
- **Island mission I5:** José tailed with `minDist`, so the player must not get too close. This replaces B's destroy-the-mother's-car mission.
- **Island layout:**
  - The 7×7 MAP with Hotel Flamenco at the origin and Pepes Bodega on its back (north) side, in view on the minimap all game.
  - The prop rename table.
  - The rule that car-smashable props must have top > 0.75.
  - The parked DC-8 outside the bound wall, reusing `buildPlaneExterior`.
- **Brands and people:**
  - Fictional SunTrip and "Sol-Viking" livery, and "SPORT-KNÄCKE" for the crispbread pack.
  - An unnamed grisfest host, because "Gris-Antonio" was a real person.
- **Tests:**
  - `timeScale` 3 in `?test=1`.
  - The `startMission` race fix.
  - New scenarios `cabin`, `trolley`, `panic` and `transition`.

### From A: the island story content, and a short Arlanda opener

- **Arlanda, as one compact mission at the gate and jet bridge** (not a whole terminal). The research treats Arlanda as the prelude to the flight. It holds the best fear-of-flying material: Ole's crash statistics and looping story, "Bomber…?!", the toilet mantra, and Berra's "Ska du ha? / tål inte starksprit / vem fan gör det?". C drops all of it. B also has a gate lounge and jet bridge (its WP B), so the set is shared.
- **M9 Bodega odyssey:** bodega1 → vischan → "Heja Eslöv!" → lifting with the grisbil → the Benidorm outro, with the camera briefly framing the PEPES BODEGA sign that nobody notices. Fix the hitchhiking logic first (error A4 below).
- **M10 Fataga:** follow the excursion bus, Lasse's real guide lines, the mother's "skock får" line, then catching sheep for Josés pappa. That last part nods to the actor being a real Canarian shepherd. **Cut it first** if time runs short.
- **M11 grisfest:**
  - Intro with the vitamins and the flowers. Fix the speaker error first (error A1 below).
  - Flower picking.
  - Dance coaching, "Vill du dansa med mig?", "Heia Norge!".
  - Tonga Tonga.
  - "Bärra hem Berra" as a pickup and dropoff.
  - Outro: "varma nätterna" and the mantra reversal, brown beans, the receptionist's 500-peseta scene, and the balcony.
- **M12 julafton party and chaos.** This is the only design that pays off every running gag in film order: the lens cap, "Precis en sån har jag önskat mig", the Bodega reveal, the money in the crispbread, and the room chaos (the cleaning lady's "Limpio!", the seller who sold the plot, the family's "Ni har dragit skam över vår familj!", Angerud's "Ut! Ut!").
- **Smaller pieces:**
  - The "Julen 1979. Stig-Helmer är flygrädd." title line.
  - The "Helan går" cue on the first night.
  - The music table: `muzak` with a tinnitus layer above 70 % fear, `sol`, `vals`, `jul`, `samba`.
  - The money flow: pesetas, a cost gate on the grisfest (800 pta, as in the film), and "1 KR = 17 PTA".
  - The rule that real names (Stenmark, Swahn, Falk, Uggla) appear only inside quoted film lines.

### From B: the mechanics that are cheap and research-grounded

- **The bus mission (merge B's I5 into C's I1):**
  - A `smooth` option on `goto` with an ÅKSJUKA bar. It is one option, not a new stage kind.
  - Lasse's verbatim welcome speech as radio, ending on "Norsk da?" / "Ja.".
  - The porter's "Momento" mirror gag for the sea view.
- **The welcome meeting before friskoteket:** the oath with the right hand raised, the Storch telegram, and "Storch, inte Stork". Keep C's cheap `rabbits` for the gym balls. B's `tail` jog is P2.
- **The donkey mission:**
  - `haggle`: one new kind using a marker and zone on the objective bar.
  - A `fragile` option on `goto` for the wet paint ("Kör försiktigt – färgen är våt!").
  - The Viking Bar outro.
  - Add A's supermercado stop. The film has them hunt for the same crispbread pack.
- **Angerud cutaways:** the "Hytt två" phone booth, Levander's answering machine, Levander from Åre ("En målad åsna…?"), and the poolside hittelön speech ending "Aj! Det ska jag göra." This is the best version of the Angerud thread in any design, and C lacks it.
- **Porcelain smashing at the grisfest:** a `smash` kind that counts broken `tallrikar` props. It is cheap and film-backed ("Vad skickliga de är!").
- **SKANDAL details:**
  - Herr Storch filming nearby does not raise the meter, with the toast "Ingen fara: linsskyddet sitter på.".
  - The **porter bribe hideout** at 500 pta, which is the film's own line.
- **Kinder car destruction:** `noExplode`, where a wrecked car stops in a cloud of steam. Apply it to every `destroy` target driven by a named character. `Car.damage` always explodes and burns the car (`car.js:338–346`).
- **Ending beat:** Stig-Helmer and Majsan do the mantra together with their arms out, then the Rio card. This closes the brief's fear-of-flying arc, and the research supports it ("två röster" before "Rio…?"). Do it as a short scene, **without** B's invented chase to the plane or the scene on the apron.
- **P2:** the Eslöv time trials, using `race` with no opponent. They need code, because `race` calls `g.npc(o.who)` unconditionally (`missions.js:217`).

## What to drop

- **Driving Angerud to the clinic (A M12 stages 7–8).** It is a timed mission with a fail state around a heart attack. Keep the infarction off-screen, as B and C do.
- **A's baggage-truck destruction.** The truck explodes with the suitcase full of 50,000 kr on board, and then the clerk asks for his finder's fee and Stig-Helmer thanks him. Use C's structure (`hittegods` → `grab`) instead.
- **A's 250-pta friskoteket fee and A's Lasse-as-pursuer.** Turning the cheerful guide into the enforcer goes against his character. Use C's Guardia config instead, with the ¡MULTA! fine of 50 pta.
- **A's Berra T-shirt text "cut off on a market sign".** Drop it completely, as B and C do.
- **From B:**
  - The `destroy` mission against Josés mamma's SEAT. Ramming an old woman's car is the worst tonal choice in any design.
  - "Kontant, utan kvitto", a stereotype of corrupt Spanish police.
  - The welcome song lyrics shown as on-screen bubbles. They are four lines of a copyrighted film song; keep them to a short spoken quote.
  - The player-driven trolley, which needs about 10 engine edits.
  - The `brace`, `rounds` and `sneak` kinds inside the cabin (vision cones in a 1.1 m aisle).
  - The PathWalker, unless something else needs it.
  - The car shop and seven outfits. Keep `kostym`, `hawaii` and `rio`.
  - The I8 José race, which re-triggers the plane's points scene at the pool.
- **From C:**
  - The swapped José/Siv lines (error C1 below).
  - Fru Storch's removal. Restore `fruStorch`: she has the film's subtitle line, the "Storch, inte Stork" gag and "bränsletillägg".
  - The epilogue that presents the local harbour as Rio. A's separate Rio card is better. Keep it cuttable, with the end banner as the fallback.

## Factual errors

These are checked against the research.

### Design A

1. **M11 intro, flower speakers swapped.** A gives Stig-Helmer "Vi kan be receptionen sätta en blomster i deras rum", then has him ask "Men blommor… Gör man så i Norge?" about his own idea. The research says "blomster" is Ole's Norwegian word. The question "Gör man så i Norge?" only makes sense if Ole made the suggestion.
2. **M10 intro, José's line moved to Siv.** "Ropa vieja… pyttipanna" is José's line, given to Siv as a retelling. It is marked, but it is unnecessary; use a cutaway or have José say it.
3. **M11 outro, Carmencita missing.** The receptionist scene needs Carmencita present ("Det här är ju min fru"), but she is not in M11's `extra` list.
4. **M9 stage 4, hitchhiking logic.** Berra and Robban are already riding in Stig-Helmer's car when Berra says "Jag går inte en meter till. Vi liftar." Either drop them on foot first (they walk), or turn the line into "Vi liftar med grisbilen" and switch cars.
5. **M12, unmarked speakers.** "Hej tomtegubbar… Skål och god jul!" is given to Lasse, and "Det är inte han. Den andre!" to Carmencita. The sources do not name either speaker, so both should be marked (t).

### Design B

1. **I9, Sulan's tip given to the wrong person.** "Sulan har varit på Pepes Bodega. De häller 80-procentig rom…" goes to Robban. The research is explicit: **Berra says it to Robban.**
2. **I8, points scene relocated.** The sisters' points scene ("Pizza-racern… fem poäng / Giraffen… fyra") happens on the plane, right after takeoff. B moves it to the pool.
3. **I10, contradiction about the mother.** In the mission, the mother follows in her own SEAT and later arrives by taxi. The outro then reuses "Gissa vem han hade med sig… Morsan!", which says José brought her. The film agrees with the outro.
4. **I11, outro out of order.** B puts the Tonga Tonga invite *after* carrying Berra home and after the balcony scene. In the film, Tonga Tonga comes first, then "Bärra hem Berra", then Angerud and Carmencita.
5. **I12, chaos relocated and trimmed.** Angerud's chaos moves to the apron. The seller "strolls over" there, and the cleaning lady and Josés family are dropped. The film sets this in Angerud's hotel room.
6. **The busted bubble "Pass, pesetas, piral…".** Stig-Helmer was not in the women's toilet, so he cannot know that line.
7. **"Passing Angerud's smoking hyrbil".** This rests on a research guess that is explicitly marked "ren gissning (osäkert)".
8. **"Gurli Viking".** Gurli Åberg is Lasse Åberg's real mother. Using her name breaks B's own "no real-person names" rule.
9. **Ole says "Kallar ni det här för havsutsikt?"** The research does not name the speaker of that line.

### Design C

1. **F4, José and Siv swapped. This is a real error.** C has José say "Vad skönt att komma bort!" and Siv answer "Jag ska inte bort, jag ska hem." It is the other way round: **José is the one going home** to Spain for Christmas. C notes that it swapped the order, but the swap inverts the meaning, because Siv is a Swede on holiday.
2. **I1, "Momento." given to Lasse.** The research says the hotel porter shows the sea view.
3. **I1, Fru Storch's line given to Herr Storch.** "Finns det svenskt kaffe på hotellet?" goes to Herr Storch. It is Fru Storch's line and the film's subtitle line. C removes Fru Storch from the cast entirely.
4. **Speaker marking.** "Titta, solen!" (to Majsan) and "Nei…!" (to Ole) are marked as plain [F]. The sources do not name either speaker, so both should be (t).
5. **F3, "Ra-tara-tara…" triggered by Stig-Helmer.** It fires when the player comes near row 22. In the film, Berra and Robban say it at the flight attendant's behind.
6. **I4, haggle timing.** The haggling radio lines play during the drive, before the player has reached the market.
7. **Cast and quotes cut.** C cuts Kolla terroristen, Invalido, Bärra hem Berra, Måtte djävulen, Tonga Tonga, Carmencita and the Viking Bar night, the bungalow and golf thread, and the infarction payoff. That is four of the fan top-10 lines (#1, #3, #4, #5). The brief's "surviving the group trip" loses most of its film texture.

## Things that do not work in the engine

These are checked against `src/game/missions.js` and `src/main.js`.

1. **`race.passenger` seats the NPC in the opponent's car.** The code is `g.seat(this.pass, opp, -1)` (`missions.js:219`), as with Connie in Jessi's car.
   - **A M11:** Ole would ride in Gabbe's bus.
   - **C I6:** Ole would ride in Lasse's bus, which contradicts C's own line "Bussen gikk uten oss!".
   - **Fix:** add `playerPassenger`, or use `goto` with `passenger` and a timer.
2. **`race.start` must include `offZ`.** The engine reads `s.z + s.offZ` (`missions.js:209–211`).
   - B I8's start `{x:10, z:rc(5)+LANE, yaw:π/2}` has no `offZ`, which gives NaN positions.
   - A and C leave their start positions unspecified.
3. **`race` with no `who` crashes** (`g.npc(undefined)`). B's Eslöv time trials need new code for this.
4. **`rabbits` spawns through `freeSpot(c, 18, 55)`**, which rejects |x| or |z| > BOUND−5 and falls back to the centre point (`main.js:340–347`).
   - In the cabin at x = 3000, every item would stack on one spot.
   - A's terminal dog and cabin bottles depend on its level-bounds guard.
   - C's fixed-spot `collect` kind is the right tool here.
5. **`destroy` always spawns 70–130 m away on a random road node, always uses the `shame` bust, and always explodes** (`missions.js:290–316`, `car.js:338–346`).
   - A's "stop the baggage truck at the airport" will not start at the airport.
   - A's baggage truck, C's Angerud hyrbil and B's SEAT all need a `driver` option and `noExplode`.
6. **`follow` makes `who` the driver** (`g.seat(npc, car, 1)`) **and voices every radio line as `who`.**
   - C I3: Robban ends up driving the pig truck he hitchhiked on.
   - A M10: the radio lines are written for Lasse while Affe drives.
   - **Fix:** per-line speakers and a separate driver option.
7. **One passenger position per car.** Every `side = -1` passenger is placed at the same spot (`main.js:289–305`). A's `pickup.also` with two riders needs the rear offset that A itself flags as a risk.
8. **`placeNpcs` moves every `extra` NPC to `cur.at` with its home offset** (`main.js:648–657`). A M12 lists 12 extras at `flamencoRum`, so they pile up at one landmark, possibly inside solids. Spawn scene-only NPCs in the stage `init` instead of using `extra`.
9. **The island has no interiors.** `flamencoRum`, `rum113` and the reception must be exterior porch or patio spots. All three designs use them as if they were rooms.
10. **B's pool rim, top 0.8.** It is above `STEP` 0.45, so climbing out needs a jump. That is acceptable, but say it in the mission text. C's flat water slab, which acts as a floor, is simpler.

## Gaps in the brief

- **Level 1 is the flight itself.** All three designs satisfy this. Only A starts at Arlanda, and that works if the Arlanda part stays short and set at the gate.
- **Turbulence, panic and fear as a mechanic are invented.** The research states this. Only C labels it in the design. The README must not present them as film content.
- **No design has a flight home.** Neither does the film. B's mantra at the plane stairs, kept as a short beat in the synthesis, is the only place the fear arc pays off at the end.
- **Angerud searching Stig-Helmer's room during the grisfest** ("Buenas noches, señor") is in the film and no design uses it. It would make a good grounded cutaway, or a reason for the finale's chase over the package.

## Recommended mission list for the synthesis (12)

| # | mission | built from |
|---|---|---|
| 1 | Gate | A's Arlanda opener, compressed into one mission |
| 2 | Juice | C's F2 |
| 3 | Medhavd sprit | C's F3 |
| 4 | Inflygning | C's F4, with the José/Siv lines in the right order |
| 5 | Buss 17 | C's I1 plus B's ÅKSJUKA bar and Momento mirror |
| 6 | Friskotek | C's I2 plus B's welcome meeting |
| 7 | Åsnan | B's haggle and fragile drive, A's knäckebröd stop, then B's Angerud cutaways |
| 8 | Pepes Bodega | A's odyssey, with the logic fixed |
| 9 | Ropa vieja | C's tail with B's outro |
| 10 | Fataga | A's mission; cut first |
| 11 | Grisfesten | A's mission, with B's porcelain smash and the race passenger fixed |
| 12 | Julafton | C's suitcase, destroy (`noExplode`) and grab, Guardia pursuit to the party, A's party and chaos script, the mantra duet, then Rio |