# Charter & Run: game design (gameplay-first)

*Design v1, 2026-10-04. Folder: `charter_and_run__sallskapsresan/`, built on the Bigmouth & Run engine. All player-facing text is Swedish. Ole speaks Norwegian (bokmål).*

**Quote legend.** «…» marks a line from the film, taken from the verified lists in the research (Swedish subtitle or Wikiquote form). Ole's «…» lines use the Norwegian subtitle's bokmål where it exists. A line in plain "…" is new game text written in the film's tone. A new line must never be credited as a film quote, whether in loading tips, credits or the README.

---

## 0. Pitch

Stig-Helmer Olsson, a toaster inspector, is afraid of flying. He is going on his first charter trip abroad: Christmas week 1979, Nueva Estocolmo, Gran Canaria. Next to him sits Ole Bramserud, a Norwegian who loves gadgets and knows the crash statistics by heart. In his suitcase is a "Christmas present" from Dr Levander that holds 50 000 smuggled kronor, though Stig-Helmer doesn't know it. **Level 1 is the flight itself.** It is a playable dollhouse DC-8: the roof is cut away, and the aisle works as a racetrack, a stealth corridor and a chase route. Your fear is a meter you manage with the mantra «Jag kan flyga, jag är inte rädd». **Level 2 is the island**, a sunny 7×7-block charter town with Christmas tinsel on the palms. There you drive tour bus 17, haggle for a donkey, race "pizza-racern", follow a pig truck, wreck mamma's SEAT, smash plates at the grisfest, and finally race the black money to the airport with Angerud on your bumper.

## 1. Design pillars

1. **Fear is a resource, not a cutscene.** On the plane the meter is always visible. You lower it with a verb that has a cost (the mantra roots you to the spot, arms out, and smacks the people next to you). When the meter maxes out, the plane's equivalent of a police chase begins.
2. **The aisle is a level.** It is 1.8 m wide and 45 m long. You can run it, push a trolley down it, sneak along it and hop over seat backs. Empty seats and toilets are the cover and the hideouts.
3. **Every famous gag becomes a verb.** Juice becomes a call button and a trolley. "Bärra hem Berra" becomes a carry-stealth stage. "Jävla smålänningar!" becomes a haggling minigame. "Hajar i poolen" becomes a collectible you stomp on. "Pepes Bodega" is a running hunt that pays off where it started.
4. **Ole is always in your ear.** He rides as a passenger, comments over the radio and gives most of the missions. His statistics raise your fear on the plane. On the island, "Vi fikser alt!" is the engine of the plot.
5. **Christmas in the sun.** Whitewashed hotels, plastic Christmas trees, Guardia Civil tricornes, orange butane bottles and sangria. The world's mood turns from grey to blue to a pig-party night and on to the Christmas Eve finale.

## 2. Concept and tone

- **Tone:** affectionate 1980 Swedish charter-trip satire in cartoon Hit & Run form. The jokes come from embarrassment, bureaucracy, gadgets, the hunt for cheap booze and Swedes abroad. Violence stays cartoonish: people are flung over and get back up, cars smoke and explode with toon fire, and nobody dies. Angerud's heart attack happens off-screen and is resolved in one line.
- **Ending:** as in the film, the four of them end up in Rio. The film never says the money pays for it, and the game does not spell it out either.
- **The almanac joke:** the calendar is wrong on purpose, just as in the film. The gate board says ONSDAG 19 DEC, while Levander's note says "lördag".
- **Fictional brands only:** SunTrip (the film's own invention) and the "Gurli Viking" DC-8 with a sun on the fin. Do not use Scanair, Vingresor, Wasa or similar. Use "Sport-knäckebröd" with a generic tennis player on the pack.

## 3. Player and cast

The player is **Stig-Helmer** for the whole game. Companions travel as passengers or appear as NPC mission givers. The same `Character` instances are reused in both levels, and each level has its own `HOMES` map (§15).

| key | display name | role | look (def fields; *new field*) | voice Hz |
|---|---|---|---|---|
| `stig` | Stig-Helmer | player | adult, scale 1.12, *hair `virvel`* (cowlick) 0x2a1f1a, mustache, round brown glasses 0x6b4423. Outfits in §11 | 260 |
| `ole` | Ole | sidekick, main mission giver | wide 1.4, hair `balding` with curly red-brown sides 0xa0502a, big mustache, *sunglasses `aviator`*. Plane: white polo. Island: yellow *pattern `rutig`* short sleeves, beige trousers. Grisfest: red/white `stripe` | 230 |
| `majsan` | Majsan | love interest, giver | scale .95, *hair `page`* 0x8a3a22, *dress* 0x4a7ad8 *pattern `blommig`*, *hairFlower* white | 420 |
| `siv` | Siv | giver | hair `bun` 0x9a3a1e, *dress* 0xd8321e blommig | 440 |
| `angerud` | Gösta Angerud | antagonist | wide 1.35, `balding` ring, ruddy skin 0xf0b8a0, light-blue suit 0x8ab8e0, aviators | 190 |
| `levander` | Dr Levander | voice and phone only | white coat, slick dark side parting, big glasses (portrait-only Character) | 280 |
| `berra` | Berra | giver, rival | hair `long` 0x5a3a22, walrus mustache, *sunglasses `tinted`*. Plane: blue tee. Island: blue tee and white cap | 300 |
| `robban` | Robban | giver, rival | wide 1.25, thin `short` hair, glasses. Plane: orange tee. Island: navy tee and cap | 250 |
| `storch_m` | Herr Storch | gag NPC, giver | young, curly 0xb08a5a, dark flowered shirt, suede vest, *heldItem `super8`* | 330 |
| `storch_f` | Fru Storch | gag NPC | wide 1.2, short blond perm, glasses, cerise blouse, hairFlower | 470 |
| `lasse` | Lasse Lundberg | site manager and tour guide, giver | tanned 0xc8885a, dark curls, yellow suit 0xf2c12e (shirt and pants), Christmas Eve outfit: red with *hat `tomteluva`* | 310 |
| `affe` / `gabbe` | Affe / Gabbe | tour guides (accordion / congas) | yellow trousers, swirly shirts. Gabbe: *beard* red 0xb8502a | 290 / 220 |
| `jose` | José | race rival | slick black hair, mustache, royal-blue satin 0x2a3ad8 | 280 |
| `mamma` | Josés mamma | destroy-mission target | grey `bun`, glasses, black *dress* | 360 |
| `carmencita` | Carmencita | Viking Bar | short black hair, black dress, red neck `stripe` | 400 |
| `kabinchef` | Kabinchefen | plane pursuer | *dress* turquoise 0x1e9aa0 over a white blouse, blond `bun` | 380 |
| `vardinna` | Flygvärdinnan | plane NPC, guard | same uniform | 420 |
| `kapten` | Kaptenen | PA voice | portrait only, *hat `captain`* | 200 |
| `gurli` | Tant Gurli | seat 23D neighbour | old, grey perm, cardigan, *heldItem `handbag`* (a nod to Åberg's mother, who sat behind Stig-Helmer in the film) | 400 |
| `guardia` | Guardia Civil | island pursuer, patrols | green 0x3a5a2a, *hat `tricorne`* in black gloss, mustache | 220 |
| `portier` | Portiern | bribe hideout | white shirt, black vest, bow tie | 270 |
| `saljaren` | Bungalowkungen | car shop | white suit, blond, aviators | 300 |
| `eslov` | Rullskidåkaren | bonus giver | blue ski suit with a yellow "ESLÖV" stripe, cap | 340 |
| `hittegods` | Hittegodskillen | airport clerk | white shirt, cap | 300 |

All humans use `kind:'adult'`. The monster, ghost and wizard builders stay in the engine but are unused.

## 4. Controls

The engine's physical-key mapping is unchanged. The attack action is **context sensitive**.

| mode | move | J / click / pad X | Space / pad A | E / pad Y | other |
|---|---|---|---|---|---|
| On foot, island | WASD, Shift sprint | kick, stomp in the air | jump (×2) | talk, get in, steal | M map, H horn, R unstick, Esc pause |
| On foot, plane | same | **hold: "Jag kan flyga!"** (mantra, see §6.4); no kick | jump, used for seat-hopping | talk, sit, lock yourself in the toilet, call button | M cabin map |
| Seated (brace) | none | hold: mantra | none | none | none |
| Trolley | W push, S pull, A/D dodge | none | brake | step off | **H: trolley bell** (people step aside) |
| Car | engine default | none | handbrake | get out | H horn (samba horn when unlocked) |
| Haggling | none | none | none | **bid** | none |

---

## 5. Structure, pacing and difficulty curve

There are two levels, 13 story missions and three bonus time trials. A first playthrough takes about 60–75 minutes. Between missions you roam freely, and the next giver is marked with a "!".

| # | id | Swedish title | giver | core verb (new mechanic in **bold**) | time | diff 1–5 | reward pta |
|---|---|---|---|---|---|---|---|
| **Level 1: Flygresan** |||||||
| 0 | `gate` | Jag kan flyga, jag är inte rädd | ole | walk, **fear meter, mantra, sit, brace (takeoff)** | 4 min | 1 | 300 |
| 1 | `juice` | Juice, whisky | ole | **trolley vehicle, multi-stop deliveries (`rounds`)**, bell | 3 | 2 | 500 + time bonus |
| 2 | `sprit` | Medhavd sprit | berra | **sneak** (sight cones), seat-hop cover | 3 | 2.5 | 500 |
| 3 | `gupp` | Luftgropar | vardinna | catch rolling items with **rivals**, turbulence, PANIK and toilets | 2.5 | 3 | 600 |
| 4 | `landning` | Tomater på piloten | kabinchef | **checklist rounds** (talk/fetch), brace (landing) | 3.5 | 3 | 800 |
| **Level 2: Nueva Estocolmo** |||||||
| 5 | `buss17` | Buss nummer 17 | lasse | drive the coach, **ÅKSJUKA smoothness bar** | 4 | 2 | 800 |
| 6 | `friskotek` | Plocka kulor! | ole | timed run on foot, **tail on foot** (jog behind Lasse) | 4 | 1.5 | 600 |
| 7 | `asnan` | Caballo folcloristico nativo | ole | **haggle** timing minigame, **fragile cargo**, timed delivery | 5 | 2.5 | 1000 |
| 8 | `pizzaracern` | Pizza-racern | siv | race (checkpoints, rubber-band rival) | 4 | 3 | 1200 + car |
| 9 | `bodega` | Glöm aldrig det! | robban | follow (pig truck), two pickups, thirst timer | 5 | 3 | 1000 |
| 10 | `ropavieja` | Gamla kläder | siv | destroy (mamma's SEAT, **no explosion**), passenger | 4 | 3.5 | 1200 |
| 11 | `grisfest` | Snacka om grisfest | ole | night drive, **smash** (plate smashing), **carry-sneak** with a timed distraction | 7 | 4 | 1500 |
| 12 | `julafton` | Feliz navidad | ole | grab, Storch payoff, **forced pursuit by Angerud**, final mantra | 7 | 5 | 2500 |
| Bonus | `eslov1..3` | Heja Eslöv! | eslov | time trials (race with no opponent) | 1–2 each | 2–4 | 500 / 800 / 1200 |

**The curve.** The plane builds from tutorial to a chaos peak (`gupp`) to a checklist finale. The island starts easier again: driving a coach, then a stroll, then shopping. From there it climbs through race, follow and destroy to the night stealth set piece and the pursuit finale. Every mission introduces at most one new verb. The finale reuses verbs the player already knows, under pressure. Stage-level checkpoints (§15.3) mean that failing a late stage never replays a long run of earlier stages.

**Day cards.** At the start of a mission, the banner subtitle shows the day: Dag 1 for `buss17`; Dag 2 for `friskotek` and `asnan`; Dag 3 for `pizzaracern` and `bodega`; ONSDAG for `ropavieja` (the film's «…klockan sju på onsdag»); TORSDAG · GRISFEST for `grisfest`; JULAFTON for `julafton`.

---

## 6. Level 1: Flygresan

### 6.1 The space: Gate 8, the jet bridge and the "Gurli Viking" (cutaway DC-8)

All of this is one interior placed at world **x ≈ 3000**, built at init by `world/cabin.js` before `finalizeProps()`. The frame origin is (3000, 0) with yaw 0, so local coordinates equal world offsets. The nose points to **−z**. The floor sits at `CURB` (0.15). There is **no roof mesh**: it is a dollhouse cutaway. Visual walls stop at 2.1 m. Collision walls are thick `'bound'` boxes (1.2 m, top 99).

```
 nose z≈-32 ▲   (cutaway shell; cockpit door locked: "EJ TILLTRÄDE")
 z -28.5  ─────────────── cockpit wall ───────────────
 z -27..-24.5  [WC F1][WC F2]   |  aisle  |  [ FRÄMRE BYSSAN ]  trolley park, confiscation drawer
 z -23..-21    FRONT DOOR (left) ═══ jet bridge (west) to Gate 8
 z -20.0       row 1   A B C    | x -0.9..0.9 |  D E F
               rows 2-12        pitch 1.15 m
               (no row 13: placards read 12 then 14)
 z  -6.2       row 14  EMERGENCY EXIT, always empty
 z   4.15      row 23           |        |  [Gurli D][STIG E][OLE F]
 z  12.2       row 30  [Majsan?]... Berra 30C, Robban 30B   (smoking section rows 28-33)
 z  15.65      row 33
 z 17..20      [REAR GALLEY L]  |        | [REAR GALLEY R]   trolley for juice
 z 20..21.5    [WC B1][WC B2]   |        | [WC B3]
 z 22.5        aft wall; tail and fin with the SunTrip sun outside
```

**Seat maths.**
- Row z position: `zRow(r) = -20 + 1.15·(r<13 ? r-1 : r-2)`.
- Seat x positions: A −2.65, B −1.95, C −1.25, D 1.25, E 1.95, F 2.65.
- Aisle: x −0.9 to 0.9.

**Seat collision.**
- **Empty seat:** cushion `box` top 0.55, which you can step onto. Seat back is 0.18 deep at the +z edge with top 1.35, so a jump clears it.
- **Occupied seat:** a single box with top 1.9 (head height). It is a wall and cannot be hopped.
- About 20 % of seats are empty, placed to form four hop routes: all of row 14, 26A–C, 27D–F, 12D–F, 6A–C, plus the single seats 19A and 31F. Your own seat, 23E, is empty while you are standing.

**Exterior shell (visible because the roof is cut away).** Belly and lower fuselage, wings across rows 7–20 at y −0.3 with ±22 m span and four engine pods, a nose cone, and the tail fin with the SunTrip sun. It reads as an aeroplane floating in the sky.

**Gate 8, Arlanda Utrikes.**
- Location: local x −38..−20, z −34..−10. Contents:
  - gate desk "GATE 8 · LAS PALMAS 10.40"
  - rows of lounge chairs (top 1.0, which you can jump over)
  - a kiosk "TAX FREE · TOBAK"
  - **herrtoaletten** (one booth)
  - the **damtoaletten** door, closed, with groggparty laughter behind it
  - the departures board (the ONSDAG 19 DEC easter egg)
  - a window wall at x −20 that looks out at the plane
- **Jet bridge:** local x −20..−4.2, z −23.2..−20.8. A door solid at x −4.6 is `dead` during boarding and revived after takeoff.
- **Snowy apron:** a white ground slab of about 300×300 around everything, with a parked tug and fuel truck. Visible only in the `gate` phase.

**Passengers.** About 100 seated busts (`buildBust(randomPed())`) are merged into **one** static `GeoBuilder` mesh. Named cast members sit as full seated Characters:

| seat | who |
|---|---|
| 5D | Angerud |
| 9A | Majsan |
| 9B | Siv |
| 9C | José |
| 17E | Herr Storch |
| 17F | Fru Storch |
| 23D | Gurli |
| 23F | Ole |
| 30B | Robban |
| 30C | Berra |

Three standing passengers walk aisle loops.

**Cabin landmarks** (ASCII ids):

`gate`, `herrtoa`, `damtoa`, `gatedisk`, `brygga`, `seat23E`, `seatOle`, `rad5`, `rad9`, `rad17`, `rad30`, `rad31`, `rad13` (the gap between 12 and 14), `byssaFram`, `byssaBak`, `toaF1`, `toaF2`, `toaB1`–`toaB3`, `cockpit`.

### 6.2 Flight phases (visuals and audio)

The phase is driven by mission progress and stored in `game.flight.phase`.

| phase | when | sky / fog (top, horizon) | outside | audio |
|---|---|---|---|---|
| `gate` | P0 until boarding | 0x8a96a3 / 0xc9cfd6, fog 40–220 | snow apron, falling snow (`fx` white puffs, grav 1) | terminal murmur, PA |
| `takeoff` | P0 brace | same, then grey cloud fog 10–60 | ground group slides +z and speeds up, then hides | drone rises, rumble, **DUNS** |
| `cruise` | after «Titta, solen!» to P2 | 0x1f6fd6 / 0xbfe0ff | **cloud deck below** (`tickSky` altitude −40), slow drift | engine drone, `flyg` tune |
| `turb` | P3 | 0x3a6ab0 / 0x9ab8d8 | towering cumulus groups pass by | rattles, bumps |
| `approach` | P4 | 0x2a86e0 / 0xf0dcb0 (calima haze) | sea plane at y −60, island blob (ochre and red mound with white specks) passing | flaps rumble |

Needs: a `setSkyPalette({top, horizon, fogColor, fogNear, fogFar, sun, hemi})` that keeps the CSS body background in sync, and a cloud-altitude argument for `tickSky` (§15).

### 6.3 The plane's meter: **FLYGSKRÄCK**

The plane uses the same meter engine as the island (a configurable `Meter`, generalised from `Shame`), with this config.

**What raises it:**

| source | amount |
|---|---|
| Phase ambience | `turb` +0.6/s, `approach` +0.4/s |
| Standing while the FASTEN SEAT BELT sign is lit | +2/s |
| Turbulence bump (in `turb`, every 7–12 s) | +8, plus a sideways shove of 1.5 m/s on everyone standing |
| Ole's statistics (Ole within 6 m, every ~25 s while idle-chatting) | +10 |
| Scripted DUNS, touchdown, reverse thrust (brace) | +15 to +25 |
| Running into a standing passenger (>3 m/s) / being hit by a trolley | +5 / +10 |
| Spotted by crew carrying contraband (`sprit`) | +25 |
| Each landing on a seat while seat-hopping ("folk tittar") | +2 |

**What lowers it:**

| drain | amount |
|---|---|
| **Mantra** while standing still | −22/s, after a 0.6 s wind-up |
| Mantra while seated | −15/s |
| Sitting in your own seat 23E | −3/s |
| **Locked in a toilet** | −30/s |
| Juice (call-button delivery or trolley) | −25 at once |
| Idle decay after 4 s with no spike | −4/s |

**At 100: PANIK!**
- Banner «PANIK!» with subtitle "Kabinchefen är på väg". Purple-white flash, heartbeat, and the music low-passes.
- Stig-Helmer's controls get *panic wobble*: the wish direction is rotated by ±0.35 rad of noise, top speed rises ×1.15, and the mantra is disabled for 2 s.
- **Kabinchefen** spawns at the nearer galley and chases (§15.4 PathWalker):
  - She walks the aisle polyline at 6.2 m/s, slower than a sprint and faster than a walk.
  - If you stay inside a seat row for more than 3 s, she leaves the aisle and climbs in after you.
- From `gupp` onwards, a second stewardess comes from the other end (a pincer).
- Taunts (new lines): "Herr Olsson! Sätt er!", "Säkerhetsbältet, tack!", "Spring inte i gången!", "Kaptenen ser er, herr Olsson!".

**Escaping PANIK:**
- **Toilets are the plane's Pay'n'Spray.** Lock yourself in a free booth (`E`). The door light switches to UPPTAGET and the meter drains −30/s. The pursuit ends at 0 with the banner "LUGN IGEN" / «Jag kan flyga, jag är inte rädd». Kabinchefen knocks: "Ni kan inte sitta där hela resan, herr Olsson!"
- **One booth is always occupied** (Berra or another passenger, rotating every 40 s), so you have to know where the others are.
- **Or outrun her:** distance bands decay the meter at 9/s beyond 14 m and 3/s at 7–14 m. Seat-hopping through the empty-seat routes is the skill move.

**BUSTED (caught within 1.4 m):** banner "SÄTT DIG, HERR OLSSON!" with subtitle "Fastspänd på 23E · −100 pta (spilld juice)".
- Cut to Stig-Helmer seated and belted at 23E.
- Fear is set to 40, followed by a 2.2 s grace period.
- No plane mission uses `bustFails`; being reseated is already the punishment.

### 6.4 Plane verbs

- **Mantra (hold J).**
  - Pose: the new anim flag `wings`, with both arms straight out to the sides.
  - Each start shows a bubble «Jag kan flyga, jag är inte rädd.».
  - A soft sine chord pad plays while holding.
  - If you are moving it does nothing, and the prompt reads "Stå still!".
  - The arm span (±1.0 m) bumps standing Characters, who stumble and say "Aj!". When seated, the arms hit your neighbours (see brace).
- **Seat-hopping.** Jump apex ≈1.65 m clears seat backs (1.35) but not occupied seats (1.9).
- **Toilets.** Six booths: the gate has 1, the cabin front 2, the rear 3. Interior 1.05×1.2. `E` at the door locks you in: the player goes `hidden`, the camera holds outside the door, and `E` again leaves.
- **Call button (E at 23E).** It plays a "pling". In free roam a stewardess brings juice after 20 s (−25 fear, plus 25 pta of "dricks"? no, just calm).
- **Trolley ("Serveringsvagnen").** A `Car` type. Spec in §15.5.
- **Turbulence.** Camera shake 0.4–0.7, a sideways shove on standing Characters, and loose rolling items slide toward ±x.

### 6.5 Plane missions

#### P0 `gate`: "Jag kan flyga, jag är inte rädd"

Giver **ole** at `gate`. Reward 300. **Fun hook:** a tutorial that turns the film's mantra into the core verb, ending in a seated takeoff "boss" sequence.

**Intro** (at the gate; Ole has headphones and the boombox):
- ole: «Du vet vel at det er 50 % sjanse å overleve en flyulykke.»
- stig: "Femtio… procent?"
- ole: «Man regner mellom to og fem millioner flytimer pr kræsj.»
- stig: «Krasch?» — ole: "Kræsj."
- ole: «Leste du om en sånn jumbopilot som gjorde en looping?»
- stig: «Looping med en jumbo?» — ole: «Ja. To ganger.»
- stig: «Det går väl inte? Kan du se till mitt handbagage ett tag, jag måste…»

(FLYGSKRÄCK appears and jumps to 80.)

**Stages:**
1. `goto` `herrtoa`, radius 2, timer 45 s. Text: "Ta dig till herrtoaletten innan paniken tar dig". Fear rises +1/s. Radio from **levander** (memory voice):
   - «Sträck ut armarna – rakt ut åt sidorna. Slappna av. Slut ögonen.»
   - «Säg efter mig: Jag kan flyga, jag är inte rädd.»
2. `mantra` until fear ≤ 15. Text: "Håll **J**: Jag kan flyga!". Partway through, Berra walks in:
   - stig: «Jag håller på med yoga, avslappningsövningar. Isometrisk träning…»
   - berra: «Jaha… Ja, själv tar jag mig ett järn.» (he leaves)
   - `checkpoint`.
3. `goto` `gatedisk`, timer 40 s. PA: «Herr Stork ombedes kontakta informationen i avgångshallen.» Passing the ladies' room fires bubbles from inside:
   - siv: «Du har väl med dig dom fyra p:na? Pass, pesetas, p-piller, piljetter.»
   - majsan: «Jag har piral.»
   - siv: «Pass, pesetas, piral och piljetter.» … «…och prit.»
   - On arrival the sisters step out: majsan «Nämen… hejsan!» / stig «Jaså, vi kom på samma resa.» Siv, aside: «Jag dör! Såg du vad han stötte på dig? Han som såg ut som en giraff.»
   - Gate agent: «Rökare eller icke-rökare?» — stig: "Icke-rökare."
4. `goto` + `sit`: "Hitta plats 23E". The jet bridge leads into the plane. Row placards count up and skip 13. `E` to sit. `checkpoint`.
5. `brace` takeoff (§15.3), about 40 s:
   - t2: engines spool up, +1.5/s
   - t8: takeoff roll (ground slides away), +2/s
   - t14: rotate, cabin tilts 8°, +12
   - t18: **DUNS** +20. stig: «Vad är det för ljud?» ole: «Landingshjulene som går opp. Hydraulikk, vet du. De går opp sånn, og så lukker lemmene seg. Så flyet ikke skal stoppe, men få fart.»
   - t23: ole: "Ellers…" (a Norwegian adaptation of the subtitle's «…annars…»), +15
   - t26–34: four cloud bumps at +6 each
   - t36: «Titta, solen!». Applause, fear −100, phase switches to `cruise`.
   - Fail at fear 100: "PANIK! Stig-Helmer rusade mot toaletten." Retry restarts at this stage.

**Outro:** the seatbelt sign goes off.
- stig: «Hammarby. Känner du till Hammarby?»
- ole: «Eneste svenske byene jeg kjenner til er Stockholm og Göteborg og Malmö.»
- stig: «Det här är ett fotbollslag.»
- Toast: "Bältet av: fritt fram i gången."

#### P1 `juice`: "Juice, whisky"

Giver **ole** at `seatOle`. Reward 500, plus 10 pta per second left. **Fun hook:** the film's most famous gag, followed by a go-kart time attack down a 1.8 m aisle.

**Intro** (cinematic at 23E):
- stig: «Om man vill ha lite mer juice…»
- ole: «Ja, då trycker du där uppe.»
- (Stig-Helmer holds his mug up under the call-button panel and waits. Ole doubles over laughing.)
- ole: «Nej…!»
- ole: «Så… sen kommer flygvärdinnan. Juice, whisky.»
- vardinna: "Hela planet trycker på knappen samtidigt! Vagnen står i bakre byssan och jag har två händer."
- ole: "Stig-Helmer kjører vagnen. Han studerer til ingeniør!"

**Stages:**
1. `goto` `byssaBak` on foot.
2. `getInCar` with `car:'vagn'` (trolley, pre-aligned facing −z). Text: "Ta serveringsvagnen".
3. `rounds`: **6 lit call buttons** out of rows [3, 5, 8, 11, 16, 19, 22, 27, 31] (seeded).
   - Arrive within 1.2 m of the row's aisle point at speed < 0.6 m/s, then «Var så god.» / «Tack.».
   - Timer 120 s.
   - The trolley's `hp` is labelled **JUICE**: wall hits over 1.5 m/s cost −8, hitting a person −5. At 0 the mission fails with "Juicen är slut!".
   - **Row 5 (Angerud) must be served twice.** First visit: «Kallar ni det här 'varm middag'? Så ser det inte ut när jag flyger reguljärt.» / «Jag har inte fått resan gratis. Jag har betalat 3 000 för den.» Berra, from behind: «Jag betalade bara 995. Sista minuten.» Angerud: «Det fattades bara det…!» The button relights after 15 s.
   - **Obstacles:**
     - three aisle walkers, who step into their row if you ring the bell (`H`) when they are within 4 m
     - **Berra's legs** across the aisle at row 30 (a box with top 0.5); he pulls them in every 4 s as the stewardess passes, with «Ra-tara-tara…»
     - dropped bags (props, minSpeed 1.0)
   - Driving past row 9 triggers a bubble from siv: «Bara de inte är ingenjörer.»

**Outro:**
- vardinna: "Ni är nästan anställd, herr Olsson."
- stig: "Jag kan köra vagn, jag är inte rädd."

#### P2 `sprit`: "Medhavd sprit"

Giver **berra** at `rad30`. Reward 500. **Fun hook:** a small-scale echo of the main plot, smuggling something past "customs". Stealth in a tube where your cover is empty seats and toilets.

**Intro** (cinematic of the confiscation):
- vardinna: «Tack. Det är förbjudet att dricka medhavd sprit.» / «Tar du det inte lugnt med spriten, kan det bli problem att komma in i Spanien.»
- berra: «Ta det vackert, vi har varit ute och flugit förr.»
- (to Stig-Helmer) berra: "Giraffen! Flaskan ligger i främre byssans låda. Den är… medicinsk."
- berra: «Ska du ha?» (offering a sip as payment)
- stig: «Nej tack, jag tål inte starksprit.»
- berra: «Nej, vem fan gör det?»

**Stages:**
1. `sneak`:
   - item at `byssaFram`, home `rad30`, timer 150 s
   - **guards:**
     - kabinchef patrols the aisle from row 1 to 33, pausing 2–4 s at random rows ("serving")
     - vardinna stands in the front galley and turns every 5 s
     - both have a 0.45 rad half-angle cone and 6 m range, shown as ground decals and on the minimap
   - **hidden** when inside a seat row (|x| > 1.1 inside a row's z band) or locked in a toilet
   - while carrying, fear +3/s in the aisle (nerves), and the mantra can only be done while hidden
   - **spotted** with the bottle: «Det är förbjudet att dricka medhavd sprit!», the bottle goes back to the drawer, fear +25
2. `goto` `rad30` (hand over).

**Outro:**
- PA kapten: «Mina damer och herrar, det är kapten. Vi flyger just nu ut över Atlanten.» … «Jag kan även meddela att Stenmark ligger trea efter första åket.» (applause)
- robban: "Du är en hedersknyffel, Giraffen."
- stig: "Jag tog bara juice."

#### P3 `gupp`: "Luftgropar"

Giver **vardinna** at `byssaFram`. Reward 600. **Fun hook:** the plane's chaos peak, a scramble during turbulence against two drunk rivals. It is very likely to cause PANIK, which teaches the toilets under pressure.

**Intro:**
- PA kapten: «Vi beräknas landa om en timme och 35 minuter. Vädret i Las Palmas är bra – soldis och 22 grader varmt.» … "Det kan bli lite gupp nu. Jag tänder skylten för säkerhetsbältet."
- (BANG: the tax-free trolley tips over)
- vardinna: "Tullfria-vagnen! Miniatyrerna rullar överallt!"
- robban: "Fri sprit, Berra!"
- ole: "Det her er bare luftlommer, Stig-Helmer. Helt normalt!"

**Stages:**
1. `rabbits` with mesh `miniatyr` (mini bottle):
   - count 8, **need 6**, timer 90 s
   - flee radius 4, rolling speed 3.5
   - bounds are the cabin; turbulence shoves the bottles too
   - **rivals: berra and robban** PathWalk (3.2 m/s) to the nearest free bottle; a bottle they reach is gone ("Skål!")
   - fails if the bottles caught plus the bottles left are fewer than 6: "Berra och Robban drack upp tax-freen!"
   - the seatbelt sign is lit throughout, so standing costs +2/s
2. `goto` `byssaFram` (return them).

**Outro:**
- ole: «Min drøm er å fly med Concorde fra Paris til Rio. 2 300 km i timen. Det er flyging!»
- ole: «Tre ganger så fort som en geværkule.»
- stig: «Usch…»
- stig: «Kanarieöarna är inte så dumt heller.»
- ole: «Det får duga.» (a Norwegian rendering of the subtitle line)

#### P4 `landning`: "Tomater på piloten"

Giver **kabinchef** at `byssaFram`. Reward 800. **Fun hook:** a frantic any-order checklist before touchdown, then the landing brace.

**Intro:**
- kabinchef: "Inflygning! Alla på sina platser. Men någon har låst in sig på bakre toaletten, en bandspelare spelar samba på rad 31, och herr Storch är spårlöst försvunnen."
- PA: «Herr Storch ombedes kontakta kabinpersonalen.»
- ole (from far away): «Hører du? Samba.»

**Stages:**
1. `rounds`, any order, timer 150 s, phase `approach`:
   - (a) **knock** at `toaB2`. Berra comes out: "Ska vi inte landa snart?"
   - (b) **fetch** the boombox from `rad31` and bring it to `seatOle`. Ole: «Ja… Kvarts og digital. Level her, input, FM, tape, tape run.»
   - (c) **find Herr Storch**, who wanders while filming (PathWalker). Talk to him: fru storch «Vi heter faktiskt Storch, inte Stork.» Plant for later: the lens cap is visibly on the camera. Stig-Helmer: "Eh… ska inte…?" Storch: "Lite film."
   - (d) **sit** at 23E. `checkpoint`.
2. `brace` landing, about 35 s: flaps rumble, bumps, gear-down DUNS +15, touchdown +20, reverse thrust +25, then applause.

**Outro:**
- berra: «Om de kraschar, kastar de tomater på piloterna.»
- robban: «Nej, skärpning nu, Berra, annars får vi ena jävla problem här.»

#### Hand-over to the island (end of the P4 outro)

`game.enterLevel('island', 'ankomst')`:
1. Flash white and cut to the parked DC-8 (closed exterior model) at the Gando apron, block (6,0).
2. Cinematic beats:
   - Robban wheels a sleeping Berra past passport control: «Invalido.» / «Gracias.»
   - Baggage belt. stig: «Min väska har inte kommit.»
   - Wide shot of the suitcase thread: a toast with "Väskan: Reykjavik?"
3. Switch the meter config to SKANDAL, the sky to the `sol` palette, the music to `sol`, the minimap to the island source and `HOMES` to island. Save.
4. Banner "NIVÅ 2 · NUEVA ESTOCOLMO", subtitle "Gran Canaria, december 1979".
5. Stig-Helmer is **still in his suit** until Ole fixes that in `friskotek`.

The cabin stays in the world but becomes unreachable.

### 6.6 Coins and secrets in the cabin

- Coins: dropped pesetas trails along the aisle and in the empty rows. Each coin is 25 pta.
- **Rad 13** (a gag spot): at the gap between the placards for 12 and 14, `E` gives: "Här borde rad 13 vara. Det känns tryggare så." +1300 pta, once.
- More gag spots (optional): the PA microphone ("Mina damer och herrar…" in your own voice, then a red light), the barf bag, the window shade.

---

## 7. Level 2: Nueva Estocolmo

### 7.1 Map

Keep the engine grid (`P` 80, `N` 7, blocks 62 m, right-hand traffic like Spain), so traffic, routing, peds and pursuit all work unchanged. North (−z) is the barranco and the airport. South (+z) is the sea.

```
          i=0 x-240   1 -160     2 -80      3 0        4 80       5 160       6 240
j=0 z-240 fataga      barranco   grisfest   odling     odling     barranco    airport
j=1 z-160 barranco    bung       bung       bygge      bung       tomt        bung
j=2 z -80 bung        marknad    apts       kasbah     apts       bung        rocas
j=3 z   0 apts        apts       apts       plaza      apts       paco*       bahia*
j=4 z  80 golf        apts       bung       apts       suntrip    rocas       rocas
j=5 z 160 bung        apts       apts       flamenco   apts       rocas       rocas
j=6 z 240 dyner       playa      playa      playa      playa      playa       playa
```

`*` marks a special-lot variant of a generic block, like Bigmouth's `birch`. `paco` is an `apts` block with Grill Paco on a corner lot. `bahia` is a `bung` block with the DC-7 dream plane on a dirt lot.

Rough geography: Playa del Inglés is the centre and west, San Agustín (red cliffs) the east, Maspalomas dunes the south-west, Gando the north-east.

### 7.2 Outskirts (beyond the outer road)

- **South:** sand to z ≈ 300, then a sea plane (`MAT.water`, 0x2fb8c8) to the horizon. Between the waterline and the `BOUND` wall at 314 the player **wades**, with splash fx and a lower top speed.
- **North:** ochre and red barranco hills (recoloured hill spheres 0xb5652e / 0xc8553d), cardón cactus and agave.
- **West:** dunes continuing, plus palms (the tree helper gets a new kind, `palm`).
- **East:** a decorative **runway strip** with markings beyond the wall at (6,0), and sea further south.
- The welcome sign moves to the airport road: "BIENVENIDOS · NUEVA ESTOCOLMO · Här talas svenska".

### 7.3 Block types

Builders take `fn(f, W)` with f at the block centre, local ±31.

**Generic (reskins of engine code):**

| type | built from | contents |
|---|---|---|
| `bung` | `residential()`, `house()` reskinned | Six lots of low **whitewashed bungalows** with flat roofs, terracotta trim and bougainvillea. Parasols in yards and small pools (walkable basins, §7.8) replace sheds and trampolines. The US mailbox becomes a yellow **Correos** box. `butano` bottles at doors. |
| `rocas` | `bung` variant | Red-cliff palette, terraced (low ramps), sea-view pools. |
| `apts` | new `aptHotel()` | 2–3 **apartment hotels** of 5–8 storeys: merged boxes with **balcony rows** (a thin slab and rail per floor, plus 1–2 towels in random colours), pool and sunbeds between them, palms, a snack bar. One sign per hotel from a pool of names ("Apartamentos Sol", "Los Caracoles", "Las Arenas", "Bungalows Las Brisas"). |
| `playa` | new | Sand slab, **sunbed and parasol grids** (props), a kiosk "HELADOS · REFRESCOS", a lifeguard chair, pedal boats on the sand, towels on sunbeds. |
| `odling` | new | Tomato rows (low green hedges, which walls a car can drive through) and a **packhus** "EMPAQUETADO" shed with crates and a ramp. |
| `barranco` | new | Red rock outcrops as **natural jump ramps** (`ramp` solids), a dirt road, cacti, a goat pen. |

**Specials:**

| type | contents | landmarks |
|---|---|---|
| `airport` (6,0) | Terminal (ARRIVALS / LLEGADAS), **HITTEGODS** office (a wall of suitcase silhouettes), apron with the parked **DC-8 "Gurli Viking"** (closed exterior, mobile stairs), bus stop "BUSS 17", luggage carts, Angerud's broken-down **hyrbil** smoking on the access road (dressing for `buss17`) | `ankomst`, `hittegods`, `dc8` |
| `fataga` (0,0) | White village: small church with bell tower, plaza fountain, tablecloth stall, sheep pen with a wandering flock (Rabbit-behaviour decor; hitting one is +5 SKANDAL), date palms | `fataga`, `dukar` |
| `grisfest` (2,0) | **Antonio's farm**: courtyard with long tables, stage for "Las Peras", spit-roast, string lights, **plate stacks** (`tallrikar` props), barn | `grisfest`, `scenGris` |
| `bygge` (3,1) | Half-built hotel: concrete frame, **crane**, girder deck with ramp, rebar, cones and barrels, **stunt ramps** (keep Bigmouth's construction ramps) | `bygge`, `kran` |
| `tomt` (5,1) | Angerud's **show bungalow** with pool («Tre meter djupt i ena änden, en meter i den andra – barnvänlig»), "BUNGALOWKUNGEN" sales hut and **car lot (the shop)**, a **FERRETERÍA** hardware/paint shed | `tomt`, `bilfirma`, `farg` |
| `marknad` (1,2) | Market: rows of stalls (souvenir donkeys, sombreros, postcards, **plastic giraffes**), the **donkey seller**, the outfit stall | `marknad`, `asnor`, `kladstand` |
| `kasbah` (3,2) | Two-level shopping centre with Moorish arches; **Viking Bar** (horned-helmet sign), **TONGA TONGA** disco (tiki neon), "SVENSKT KAFFE · SMÖRGÅSAR", stairs to an upper terrace | `kasbah`, `viking`, `tonga` |
| `plaza` (3,3) | **Templo Ecuménico** (modernist church), telephone exchange "TELEFONOS" (booths, «Hytt två»), Guardia Civil post (green and white), Farmacia, Estanco, Supermercado, a giant plastic Christmas tree | `kyrka`, `telefon`, `guardia` |
| `suntrip` (4,4) | **Hotel SunTrip**: welcome stage with SunTrip banner, pool, the friskotek lawn, the **SunTrip office** (a hideout) | `suntrip`, `scen`, `friskotek`, `suntripKontor` |
| `flamenco` (3,5) | **Hotel Flamenco**: 7 storeys, entrance and **reception** on the north road (a bribe hideout), pool and **poolbar** on the beach side, Stig-Helmer and Ole's ground-floor patio room (`rum`: the wardrobe), Angerud's balcony on the 1st floor (dressing). **Pepes Bodega** sits in a hidden service alley on the east side behind crates and a shutter marked "CERRADO", which opens at Christmas Eve | `flamenco`, `reception`, `pool`, `poolbar`, `rum`, `balkong`, `bodega` |
| `golf` (0,4) | Fairway, flag green, **water hazard** (a `water` circle), sand bunkers, clubhouse | `golf`, `golfdamm` |
| `dyner` (0,6) | Sand dunes (soft ramps), **Faro de Maspalomas** (a ~55 m grey-blue stone tower with the keeper's house at its base), the **La Charca** lagoon (`water`), palm grove | `faro`, `dyner`, `charca` |
| lot `paco` in (5,3) | **GRILL PACO**: terrace tables, grill smoke | `paco` |
| lot `bahia` in (6,3) | The faded red **DC-7** propeller plane on a dirt lot, with the road sign "BAHÍA FELIZ" | `dc7` |

### 7.4 Landmark registry

These are the island `MAP_LABELS`, in Swedish:

| label | landmark |
|---|---|
| Aeropuerto (Gando) | `ankomst` |
| Hittegods | `hittegods` |
| Hotel Flamenco | `flamenco` |
| Hotel SunTrip | `suntrip` |
| Kasbah | `kasbah` |
| Viking Bar | `viking` |
| Tonga Tonga | `tonga` |
| Marknaden | `marknad` |
| Templo Ecuménico | `kyrka` |
| Grill Paco | `paco` |
| Fataga | `fataga` |
| Grisfesten (Antonios gård) | `grisfest` |
| Tomatodlingarna | an `odling` centre |
| Bygget | `bygge` |
| Bungalowkungen | `tomt` |
| Golfbanan | `golf` |
| Faro de Maspalomas | `faro` |
| Dynerna | `dyner` |
| Stranden | a central `playa` mark |
| Rocas Rojas | a `rocas` mark |
| Bahía Feliz | `dc7` |

**Pepes Bodega** is labelled only after its Christmas Eve reveal.

Player start in level 2 is in front of `flamenco`. The title orbit is covered in §12.

### 7.5 Set dressing

- **Christmas week:**
  - plastic trees in lobbies
  - tinsel spirals on palm trunks
  - "GOD JUL · FELIZ NAVIDAD" banners over roads
  - Santa figures on balconies
  - a crèche at the church
- **Charter Sweden:**
  - signs "SVENSKT KAFFE", "SMÖRGÅSAR", "HÄR TALAS SVENSKA", "KVÄLLSTIDNINGAR"
  - SunTrip posters "GRISFEST TORSDAG · 800 PTA"
  - towels left on sunbeds early in the morning (the German tourist gag)
- **Spain 1979:**
  - orange butane bottles at doors, butanero vans
  - Correos boxes, Farmacia green crosses, "ESTANCO"
  - Guardia Civil post
  - plates on cars: white `GC-1234-A` with black letters (a texture on car rear/front boxes is optional)
  - green "GUAGUA" public buses
- **Landscape:**
  - whitewashed concrete and terracotta
  - bougainvillea magenta, hibiscus
  - Canary palms, cardón cactus
  - red barrancos, tomato rows, the lighthouse, sand dunes

### 7.6 Vehicles

Re-themed `CAR_TYPES`. Speeds are the engine's (×2 as the player car).

| key | name (speedo) | base | look | where |
|---|---|---|---|---|
| `seat127` | SEAT 127 | hatch | small boxy hatch, period colours | traffic (most common) |
| `seat131` | SEAT 131 | sedan | | traffic |
| `taxi` | Mercedes-taxi | sedan | white, green roof light | traffic, shop |
| `renault` | Renault 4 | hatch recolour | | traffic |
| `furgon` | Butanobilen | pickup | orange bottles in the bed | traffic |
| `grisbil` | Grisbilen | pickup + *`cage` flag* | slatted cage, pink pigs | mission 9, shop |
| `landrover` | Guardia Civil | van + *`landrover` flag* | green Land Rover Santana, spare wheel on the bonnet, Guardia bust | pursuit, shop |
| `buss17` | SunTrips buss 17 | bus + *`coach` flag* | white, orange/yellow sun stripe, "17", decorative passenger busts in the windows | named car `buss17`, unlocked by mission 5 |
| `guagua` | Guagua | bus | green public bus | traffic (max 1) |
| `pizzaracer` | Pizza-racern | muscle reskin | red SEAT 124 Sport style with stripes, fast (the old "muscle" stats) | race rival, unlocked by mission 8 |
| `hyrbil` | Hyrbilen | hatch | white, permanent light smoke (low hp) | Angerud's; finale pursuer |
| `seat600` | SEAT 600 | hatch, smaller (len 3.3) | cream 600 | mamma (mission 10) |
| `glass` | Glassbilen | icecream | "HELADOS" | traffic, shop |
| `vagn` | Serveringsvagnen | **trolley** (§15.5) | grey steel cart with juice | plane only |

### 7.7 Pedestrians and ambient life

- **Palette** (`randomPed`):
  - Charter tourists (about 60 %): sunburn skins 0xf2a08a / 0xf5b8a0; loud shirts (hawaii, rutig); white shorts with **white socks**; bucket hats or caps; a camera on the belly (held item).
  - Germans with towels (about 10 %).
  - Locals (about 25 %): dark trousers, white shirts, black dresses.
  - Kids (about 5 %).
- **Shouts.** Dodge lines: «Herre jävlar!», "Akta dig!", "¡Cuidado!", "Hallå där!", "¡Turistas locos!".
  - OUCH: "Jag ska tala med platschefen!", "Är du inte riktigt klok?", "¡Ay, mi madre!", "Jag har betalat bränsletillägg för det här!".
  - GETUP: «Det måste vara värmen.», "Vi har ju semester…".
  - CARJACK: "Min hyrbil!", "¡Mi coche!", «Jag har betalat 3 000 för den.»
- **Ambient set pieces:**
  - **Guardia patrols:** 2 pairs on PathWalker loops at the plaza and the promenade. They act as witnesses (§8).
  - Lasse's friskotek group doing jumping jacks (cheer anim) on the SunTrip lawn.
  - Herr Storch wandering with his camera.
  - The sheep flock in Fataga.
  - Tomato trucks around `odling`.
  - Affe and Gabbe playing at the SunTrip stage.
  - Berra and Robban at the poolbar from mission 9 onwards.
- **NPC idle chatter (`CHATTER`):**
  - ole: «Samba er fine greier!», «Blomsterspråket er internasjonalt.», «Farlige saker. Der dør det mellom to og tre mennesker hver dag. Understrømm

er, solstikk og haier.»
  - lasse: «Friskoteket börjar halv tio varje morgon.», "Hepåre!" ([WQ] «Hä-pååre»)
  - berra: «Det är ju fan vad solen tar här nere, Robban.», «Rattarattara!»
  - robban: «Fan, vad jag är törstig.»
  - angerud: «Det är sista gången jag åker med SunTrip!», «Kriminaliteten har ökat sen Franco dog.»
  - siv: «Gud, vad han är söt!»
  - majsan: «Här nere parkerar de hursomhelst.»
  - storch_f: «Det var så kallt på rummet i natt, och ändå har vi betalat bränsletillägg.»
  - storch_m: "Lite film."
  - jose: «Jag ska inte bort, jag ska hem.»
  - mamma: «Inga svenskor!»

### 7.8 Props

Keep the engine mechanics. Every new breakable needs top > 0.75 so cars smash it instead of driving over it.

| type | footprint | top | coins | SKANDAL | minSpeed | notes |
|---|---|---|---|---|---|---|
| `parasoll` | r 0.25 | 2.2 | 1 | 1 | 3 | striped canopy |
| `solstol` | 0.7×1.9 | 0.8 | 1 | 1 | 3 | raised backrest; random towel colour |
| `butano` | r 0.3 | 0.85 | 3 | 6 | 3 | **explodes**; replaces the engine's `pump` special case |
| `correos` | r 0.32 | 1.3 | 2 | 1 | 3 | replaces `mailbox`; update the shot.mjs `smash` scenario |
| `vykort` | r 0.35 | 1.7 | 2 | 1 | 3 | postcard rack, paper debris |
| `palmkruka` | r 0.5 | 1.6 | 1 | 1 | 4 | potted palm |
| `julgran` | r 0.5 | 2.0 | 3 | 2 | 3 | plastic Christmas tree, tinsel debris |
| `tomatlada` | 1.2×1.2 | 1.2 | 2 | 0 | 5 | replaces `crate` |
| `tallrikar` | r 0.4 | 0.9 | 2 | 0 | 2 | plate stack (grisfest smash stage) |
| `resvaska` | 0.8×0.5 | 0.9 | 2 | 0 | 3 | airport luggage |
| keep | | | | | | `trashcan`, `bench`, `cone`, `barrel`, `cart` (luggage cart), `vending` ("REFRESCOS"), `hydrant`, `woodfence` → `mur` (low white wall, recoloured) |
| plane | | | | | | `vaska` (bag, r .3, top .8, minSpeed 1), `taxfree` (bag of bottles), `kudde` (pillow); render at floor level only |

**Pools** are walkable basins: rim solids top 0.8 (jump in; cars blocked), inner floor at base, water mesh at y 0.45 (`MAT.water`), splash fx while wading.

---

## 8. Island meter: **SKANDAL**

Same `Meter` engine, island config. HUD label "SKANDAL"; in pursuit the suffix is " · ¡ALTO!".

**What raises it** (re-weighted engine offences plus new ones):

| offence | +SKANDAL |
|---|---|
| breaking a prop | `def.shame` × (car 1.2 / foot 0.7) |
| hitting a tourist with a car / a named NPC | +18 / +14 |
| kicking a tourist | +9 |
| carjacking | +8 |
| wrecking a car | +12 |
| ramming a Guardia Land Rover outside a pursuit | +30 |
| hitting a sheep or pig | +5 |
| **witness multiplier:** a Guardia patrol within 25 m (a "!" flashes over their tricornes) | ×2 |
| Herr Storch filming nearby | ×1 (toast "Ingen fara: linsskyddet sitter på.") |

**Decay:** after 4 s without an offence, −5/s. During pursuit, by distance to the nearest pursuer: 9/s beyond 42 m, 3/s at 22–42 m, 0 closer. All pursuers wrecked: an extra −12/s.

**At 100: ¡ALTO!**
- Banner «¡ALTO!» / "Guardia Civil är efter dig". The two-tone siren starts and the music switches to `skandal`.
- **2 green Land Rovers** (`landrover`, maxSpeed 28, Guardia bust) spawn on road nodes 70–150 m away and chase via `AIDriver` chase.
- **On foot:** a Guardia officer runs after you at 7.4 m/s, so you can outsprint him at 8.8. Unlike Bigmouth's floating wizard, he **collides with walls** (Character.step with a direct wish and wall slide). Whistle sfx.
- Taunts (Spanish, short): "¡Alto!", "¡Documentación!", "¡Pasaporte, por favor!", "¡Turistas locos!", «De där svenskarna är heltokiga!» (the film line said by Spaniards at the Christmas party, here in Swedish because it is what Stig-Helmer hears).

**BUSTED** (rammed by a Land Rover with impact > 1.5, or the officer within 1.4 m):
- Banner "BÖTFÄLLD!" / "Guardia Civil tog 500 pesetas. Kontant, utan kvitto." (or "Du har inget kvar att förlora").
- −min(pesetas, 500), 2.2 s grace.
- Guardia bubble "¡Documentación!"; Stig-Helmer bubble "Pass, pesetas, piral… nej, inte piral."
- Missions with `bustFails` fail ("Guardia Civil tog dig!").

**Hideouts** (the island's toilets):
- **Hotel Flamenco reception:** prompt "**E** Muta portiern (500 pta)". Instant clear and pursuit end. Banner "PORTIERN TITTADE BORT". Portier bubble: «…för 500 pesetas kanske vi kommer överens.» If you can't afford it: "Portiern ser dig rakt i ögonen."
- **SunTrip office:** on foot, prompt "**E** Göm dig hos Lasse". Free, 120 s cooldown. Lasse bubble: "Han är med mig. Hepåre!"

**Mission overrides:** `stage.meter = {forced:true, vehicles:[['hyrbil',1,'angerud'],['landrover',1,'guardia']], onFoot:null}` for the finale. `stage.meter = {locked:true}` during the smash stage and cinematics.

---

## 9. Island missions

All missions: `at` is the giver's landmark, the giver gets a `HOMES` entry equal to `at` with offset 0/0 (this avoids the engine's giver-relocation race), and stages marked `checkpoint` are where a retry resumes.

### I5 `buss17`: "Buss nummer 17"

Giver **lasse** at `ankomst`. Extra: affe. Reward 800, unlocks `buss17`. **Fun hook:** you are suddenly driving a 10 m coach full of people with "anlag för åksjuka". Smooth driving is the skill, and Lasse's microphone speech is the soundtrack.

**Intro:**
- lasse: «SunTrips buss nummer 17 står där borta!»
- affe: «Va fan, jag hade ju natturen i natt!» (he climbs into the driver's seat and falls asleep on the horn)
- lasse: "Affe sover. Kan någon här köra buss?"
- ole: "Stig-Helmer! Han studerer til ingeniør, han."
- stig: «Jag har lite anlag för åksjuka.»
- ole: «Jeg har reisesyketabletter.»

**Stages:**
1. `getInCar` `buss17`.
2. `goto` `flamenco`, `inCar`, radius 9, timer 150 s, **`smooth`** bar "ÅKSJUKA":
   - rises with lateral acceleration (|yaw rate × speed| > 6 m/s²), hard braking (> 14 m/s²), impacts > 3 and airtime
   - decays 3/s when smooth
   - fail at 100: "Någon blev åksjuk i bussen!"
   - **radio during the drive** (lasse unless noted):
     - «Hjärtligt välkomna till Nueva Estocolmo och SunTrip.»
     - «Klockan är tre spansk tid – alltså en timme tidigare än svensk tid.»
     - «Ni bör inte dricka vattnet.»
     - «Grisfesten är på torsdag och kostar 800 pesetas. Några frågor?»
     - storch_f: «Finns det svenskt kaffe på hotellet?» — lasse: «Ja.» — ole: «Norsk da?» — lasse: «Ja.»
     - siv: «Majsan, en niopoängare!»
   - passing Angerud's smoking hyrbil on the access road: bubble «Det är sista gången jag åker med SunTrip!»
3. Stop at the entrance (speed < 2).

**Outro** (reception):
- portier: «Det har dessvärre uppstått ett litet problem på grund av överbokning. Jag undrar om Olsson, Stig Helmer… och Bramserud, Ole… Kan ni dela rum?»
- stig: «Ja…»
- ole: "Fint! Jeg tar vindusplassen. Igjen."
- (on the patio) ole: «Kallar ni det här för havsutsikt?» (said in Swedish by Ole to tease, film line) — portier: «Momento.» (holds a mirror out over the railing)

### I6 `friskotek`: "Plocka kulor!"

Giver **ole** at `rum`. Reward 600. **Fun hook:** a costume change, a sprint across the resort, then a jog where you must keep up with a tireless tour guide.

**Intro:**
- ole: «Du kan ikke gå sånn her nede! Den buksa og det slipset! … Shorts.»
- ole: «Du skal ha sterke farger, du som er mørk.»
- stig: «Är den inte lite skrikig?»
- (outfit swap to `hawaii`; the wardrobe at `rum` unlocks)
- ole: "Og nå: velkomstmøte! Lasse synger!"

**Stages:**
1. `goto` `scen` on foot, timer 40 s, text "Spring till välkomstmötet innan visan är slut!". Shortcuts over low walls and hedges.
2. Cinematic beat (no stage):
   - lyric bubbles: «Välkommen till våran ö, / sluta tänk på regn och snö. / Sola, bada och ha kul / med Suntrip över jul!»
   - lasse: «Vi befinner oss i höjd med Egypten och 500 mil hemifrån… som väl är.»
   - lasse: «Jag lovar att bli en sundare och friskare människa under semestern.» (the crowd repeats it)
   - telegram gag; storch_f: «Vi heter faktiskt Storch, inte Stork.»
   - lasse: "Och friskoteket börjar – nu!"
   - `checkpoint`
3. **`tail`** of lasse:
   - path from SunTrip, south to the promenade, west along the beach to x −120, then back to the Flamenco pool; about 500 m at 5.0 m/s
   - keep within 12 m; the bar "AVSTÅND" grows as you fall behind; fail beyond 25 m: "Lasse sprang ifrån dig!"
   - lasse calls «Plocka kulor! Plocka med höger… plocka med vänster…»; three "Hoppa!" cues where jumping within 1.5 s pays +100 pta
   - bubbles from the poolbar: berra «Kolla storken!»; siv «Gud, vad han är söt!»

**Outro:**
- lasse: «Friskoteket börjar halv tio varje morgon.»
- stig: "Varje… morgon?"
- ole (gadget show): «Digital, analog, spansk, norsk, svensk tid, kronometer, og så klokke.» … «Penn som skriver under vannet.»
- ole: "…Men hvor er den nå? Jeg har lånt bort halvparten av tingene mine!"
- toasts: "Hitta Oles prylar 0/7"; Lasse on the phone, heard over the radio: «Hajar i poolen? Delirium – ring kliniken.» → "Hajfenor 0/7".

### I7 `asnan`: "Caballo folcloristico nativo"

Giver **ole** at `rum`. Reward 1000. **Fun hook:** haggling as a timing game, then driving a wet-painted donkey across town without wrecking it.

**Intro:**
- stig: «Det var julmat – i julklappen.» (Levander's parcel was in the lost suitcase; Stig-Helmer remembers what was in it)
- ole: «Tenk ikke mer på det. Vi fikser en ny julegave.»
- stig: «Undrar vad dalahäst heter på spanska.»
- ole: «Caballo folcloristico nativo.»
- ole: «Det fikser vi. Vi fikser alt!»

**Stages:**
1. `goto` `marknad`, car allowed. Ole rides as passenger.
2. **`haggle`** at `asnor`:
   - start 500, goal 200
   - an oscillating marker on the objective bar; press **E** in the green zone; the zone narrows each round (30 % → 22 % → 15 %) and the marker speeds up
   - a hit lowers the price 500 → 400 → 300 → 200; a miss adds +50 and the seller shouts "¡No, no, no!"
   - 3 misses: fail "Säljaren stängde ståndet!"
   - lines: stig «Hur mycket?» — seller «500 pesetas.» — stig «200?»; per hit ole: «Jeg gir deg to hundre.» / «To hundre er siste bud.»; win: ole «Första, andra, tredje – 200 pesetas!» — seller «Jävla smålänningar!»
   - deducts 200 pta (if you have less, Ole pays: "Jeg spanderer.")
   - `checkpoint`
3. `goto` `farg` (Ferretería at the `tomt` block). Cinematic: ole «Och så målar vi den röd.» — stig «Och blommor där.» (red sparkle fx; the donkey mesh is swapped for the painted one)
4. `goto` `viking`, `inCar`, timer 75 s, **`fragile`** bar "SKICK":
   - impacts > 4 cost −(impact × 3); airtime landing −15
   - fail at 0: "Åsnan gick sönder!"
   - text "Kör försiktigt – färgen är våt!"
5. `goto` `viking`, on foot, radius 2.5 (hand the package to Carmencita).

**Outro** (then a cut to later):
- carmencita: "Ett paket till Viking Bar? Jag lägger det bakom disken."
- angerud: «Buenas dias, lilla vikingen. Har paketet kommit?»
- angerud (reads the card): «God jul, moster.»
- angerud: «Hur såg han som lämnade in det ut?»
- carmencita: «Han var lång, mörkhårig… hade glasögon och mustasch.»
- angerud: «Då är det grönt.»

### I8 `pizzaracern`: "Pizza-racern"

Giver **siv** at `pool`. Extra: majsan, jose. Reward 1200, unlocks the `pizzaracer` car. **Fun hook:** the island's main race, triggered by being rated a four.

**Intro:**
- siv: «Pizza-racern, då? Han får fem poäng.»
- majsan: «Sex, tycker jag.»
- siv: «Giraffen, då? Fyra.»
- majsan: «Mindre än pizza-racern?»
- siv: «Han är så bortkommen. Det blir minuspoäng.»
- ole: "Fire poeng?! Stig-Helmer, nå kjører du om kapp med pizza-racern!"
- jose: "Ni svenskar kör som mormor. Ett varv runt stan, sista man bjuder på sangria."
- ole: "Jeg kjører med. Som kartleser."

**Stages:**
1. `getInCar` (the race kind spawns a spare `seat127` beside the start).
2. `race` vs **jose** in `pizzaracer`:
   - cruise 24, rubber-banding
   - start `{x: 10, z: rc(5)+LANE, yaw: π/2}`
   - checkpoints `[[5,5],[5,2],[1,2],[1,5]]`, finish `{x: -10, z: rc(5)}` (about 1.1 km)
   - Ole radio: «Min drøm er å fly med Concorde fra Paris til Rio. 2 300 km i timen. Det er flyging!» / «Tre ganger så fort som en geværkule.» — stig «Usch…»
   - lose: "José vann racet!" (engine string)

**Outro:**
- siv: "Giraffen… sju poäng."
- majsan: "Åtta."
- jose (tosses the keys): "Låna den. Mamma får inte veta."
- Cut to the Angerud thread (Angerud in a telephone booth at `telefon`; the operator says «Hytt två»):
  - answering machine: «Detta är dr Levanders automatiska telefonsvarare. Solariet, flygrädslekliniken, bantningen och örtshopen är stängda över jul. Viktiga meddelanden kan lämnas till hotell Ambassadör i Åre.»
  - levander (later, from Åre): «En målad åsna…? Idén med paketet var idiotisk redan från början. Nu måste du få tillbaka pengarna.»
  - operator: «Señor, betala!»

### I9 `bodega`: "Glöm aldrig det!"

Giver **robban** at `poolbar`. Extra: berra. Reward 1000; the `grisbil` becomes buyable. **Fun hook:** following a swaying pig truck inland while piglets bail out onto the road.

**Intro:**
- berra: «Herr Ober? De har inte öppnat än.» … «Bacon och ägglikör.»
- robban: «Sulan har varit på Pepes Bodega. De häller 80-procentig rom på vinflaskor.»
- berra: «Pepes Bodega.» — robban: «Glöm aldrig det!»
- berra: «Vi är på södra Gran Canaria och havet är där, va. Då måste bodegan ligga ditåt.»
- robban: «Jag går inte en meter till. Vi liftar.»
- (they jump onto a passing pig truck) robban: «Fan, de luktar.» — berra: «Skit i det. Vi slipper gå.»
- ole: "De to kommer aldri hjem av seg selv. Følg etter grisebilen!"

**Stages:**
1. `getInCar`.
2. `follow` the `grisbil`:
   - route via `[nodeId(4,5), nodeId(4,3), nodeId(2,3), nodeId(2,1)]` to the farm entrance `{x: -80, z: rc(1)}`
   - cruise 13, wobble 0.15, maxDist 70, bar "TAPPAR DEM!"
   - every bump: 1–2 **piglets** hop off (Rabbit behaviour, pink); hitting one is +5 SKANDAL; they are decor
   - robban shouts «Snacka om grisfest.»
   - `checkpoint`
3. `pickup` robban at `grisfest` (berra rides along as a decorative rear bust, "invalido").
4. `goto` `poolbar`, `passenger: robban`, timer 100 s, bar "TÖRST" fills with time.
   - radio: robban «Fan, vad jag är törstig.» — berra «Du har ingen karaktär alls, Robban.»; robban «Minns du Benidorm? Snacka om grisfest!» — berra «Var jag med då? Hade jag kul?»
   - on the airport road the roller skier passes: berra «Heja Eslöv!» — robban «Herre jävlar!» (this unlocks the bonus giver `eslov` at `kyrka`)
5. Stop at `poolbar`.

**Outro:**
- berra: «Ska vi ta Pepes Bodega i dag?»
- robban: «Vi kan väl ta det lite lugnt?» … «Vi har ju semester!»
- (camera beat: the shuttered "…ODEGA" sign behind crates, 20 m away)
- Cut, the threat lands: Angerud comes up to a sunburned Stig-Helmer by the pool:
  - angerud: «Man måste ha mycket svenska pengar med sig hit… om man säger.» … «Men det är ju inte samma sak att hitta något som att stjäla.» … «För om man hittar något, så kan man få hittelön. Tänk på det.»
  - stig (gets a pat on the sunburn): «Aj! Det ska jag göra.»
  - siv: «Vad konstig han var!» — majsan: «Det är kombinationen av sol och…»

### I10 `ropavieja`: "Gamla kläder"

Giver **siv** at `pool`. Extra: majsan. Reward 1200. **Fun hook:** a destroy mission against a chaperoning mother, whose payoff is that she turns up anyway.

**Intro:**
- siv: «Han heter José. Och han jobbar inte på pizzeria.» — majsan: «Datatekniker.»
- siv: "Middag på äkta spansk restaurang klockan sju. Men hans morsa följer efter honom överallt i sin lilla SEAT."
- majsan: "Ta med pepparn. Om han blir närgången."
- ole (sulking): "Ja, ja. Jeg hjelper til."

**Stages:**
1. `getInCar`; siv rides as passenger for the whole mission (`passenger: siv`).
2. `destroy` `seat600` (driver: mamma):
   - flee AI, timer 90 s, damageScale 1.6, **`noExplode`**: at 0 hp the car stops in a cloud of steam, mamma climbs out shouting «¡Josito!», no fire, nobody flung
   - bar "MAMMAS SEAT"
   - siv radio during the chase: "Akta henne! Hon är någons mamma!"
   - `checkpoint`
3. `goto` `paco`, radius 8, timer 60 s.
4. Stop and drop off Siv.

**Outro** (on the terrace):
- jose: «Kanarisk specialitet! Ropa vieja – gamla kläder.»
- siv: «Vad sa du?» — jose: «Gamla kläder.» … «Det är ungefär som pyttipanna.»
- (a taxi pulls up; mamma gets out and sits at the next table)
- jose: «Är det säkert att det inte gör nåt att mamma följde med?»
- siv: «Vill hon inte sitta här?» — jose: «Nej, hon vill inte vara i vägen.»
- (later, by the pool) siv: «Jag fick användning för din peppar.» … «Gissa vem han hade med sig. … Morsan!»
- siv: «Jag ska satsa på Ole nu.» … «Jag har inga fördomar mot norrmän.»
- ole (overhearing, with flowers): «Blomsterspråket er internasjonalt.»

### I11 `grisfest`: "Snacka om grisfest"

Giver **ole** at `rum`. Extras: majsan, siv, berra, robban. Reward 1500. **Night mission** (sky palette `natt`). **Fun hook:** three set pieces (a dusk coach run, a plate-smashing frenzy, then carrying a passed-out Berra past the night porter during Angerud's scene).

**Intro:**
- ole: «Skal du ha B-vitaminer? Bra for leveren. Grisefest, vet du. Ta to.»
- ole: «Fikser du ikke damer på grisefesten, da er det slutt.»
- ole: «I kveld setter vi inn støtet!»

**Stages:**
1. `getInCar` `buss17` (Ole as passenger, the others as window busts).
2. `goto` `grisfest`, timer 120 s. The sky fades from dusk to night during the drive. Radio, gabbe (congas): "Gabbe kör nattur ikväll!"
3. Entry: −800 pta if you can afford it, otherwise "Ole spanderar". Cinematic: «Sangrian, grabbar.» `checkpoint`.
4. **`smash`** "Porslinskross!":
   - break 20 `tallrikar` stacks in 40 s by kicks or stomps; the meter is locked
   - Las Peras play the `gris` tune
   - spectators: «Vad skickliga de är!»
   - fail on time: "Bandet slutade spela."
5. Cinematic dance:
   - ole: «Neida, det er bare å spørre: Skal vi danse! … Voulez-vous danse avec moi? Fransk.»
   - stig: «Nej, det känns fånigt att bjuda upp.» … «Jag är skraj att de ska nobba.»
   - majsan: «Vill du dansa med mig?» — stig: «Får jag lov…»
   - ole solo dance, then: «Heia Norge!»
   - `checkpoint`
6. `goto` `flamenco` in the bus, night, timer 120 s. robban: «Kan du hjälpa mig bära hem Berra?» — stig: «Vilket snack! 'Bärra hem Berra!'»
7. **`sneak` with `carry: 'berra'`** from the hotel car park to Berra's door (`rum` patio row):
   - carrying means walk speed 3.2, no sprint or jump
   - guards:
     - **portier** in reception, a static cone sweeping the lobby path
     - a **Guardia night patrol** pair on the pool path
   - **distraction window:** when you enter the lobby zone, Angerud and Carmencita arrive. For about 15 s the porter's cone turns to them:
     - portier: «Det är förbjudet att ta med damer på rummet. Men för 500 pesetas kanske vi kommer överens.»
     - angerud: «500 pesetas…? Det här är ju min fru.»
     - portier: «Det tror jag inte.»
   - spotted by the porter: −500 pta and the carry continues; spotted by the Guardia: +40 SKANDAL and a restart from the car park
   - 3 spots: fail "Berra vaknade och började sjunga."

**Outro** (night, by the pool):
- from the balcony above, angerud: «Måtte djävulen ta alla fruntimmer!»
- majsan: «Vad härligt det är med de här varma nätterna. Snart ska man hem till slasket igen. Jag vill inte åka hem.» … «Jag gruvar mig lite för flygresan.»
- stig: «Jag kan flyga, jag är inte rädd.»
- majsan: «Nu skulle Levander se oss!»
- majsan: «Du… gillar du bruna bönor?» — stig: «Jag avskyr bruna bönor.»
- siv: «Majsan, ta med dig giraffen så går vi på Tonga Tonga.»
- ole: «Samba er fine greier!»
- (the night ends; banner "MORGONEN EFTER"; the palette returns to day)

### I12 `julafton`: "Feliz navidad"

Giver **ole** at `rum`. Reward 2500. **Fun hook:** the finale. Recover the suitcase, every running gag pays off at the pool, then a forced pursuit to the plane with Angerud in the rear-view mirror.

**Intro** (morning):
- ole: «Morn, gutten min!» — stig: «Morrn morrn.»
- ole: «Feliz navidad.» — stig: «Vad sa du?»
- ole: «Det betyder 'god jul' på spanska.» — stig: «Javisst, det är julafton i dag.»
- (the phone rings; the lost-property clerk) hittegods: «Hammarby…?» — stig: «Ja!» — hittegods: "Er väska står på hittegodset, señor. Vi stänger klockan tolv."

**Stages:**
1. `getInCar`.
2. `goto` `hittegods`, timer 120 s.
3. `grab` the suitcase (mesh `resvaska`). hittegods: «Hittelön.» — stig: «Tack så mycket.» `checkpoint`.
4. `goto` `pool`, timer 120 s (the Christmas party at noon).
5. Cinematic, the party (all gags pay off):
   - lasse (Santa hat), crowd: «Hej tomtegubbar slå i glasen…» / «Skål och god jul!»
   - storch payoff:
     - ole: «Ta av lokket! Objektivlokket. Må ta av det, vet du.»
     - ole: «Har du filmet sånn lenge?» — storch_m: «Hela veckan.»
     - ole: «Det var synd. Det blir ikke noe film da.»
     - storch_m: «Blir'e inge film?»
   - majsan: «Jag har köpt en julklapp till dig.» (a plastic giraffe)
   - stig: «Precis en sån har jag önskat mig.»
   - Pepes Bodega payoff (the shutter opens; map label added):
     - berra: «Robban! Jag hittade Pepes Bodega!» — robban: «Det var som fan! Var låg det?»
     - berra: «Det ligger på baksidan av hotellet.»
     - robban: «Och vi som har letat igenom hela jävla Nueva Estocolmo!»
   - the suitcase opens; Stig-Helmer cuts open the crispbread with a butter knife; banknotes fly (sparkle fx)
     - ole: "Femti… tusen…"
     - ole: «Og så Rio! Stranda, jentene og samba.»
     - majsan: "Vad väntar vi på?"
   - Angerud at the railing: "50 000…!"
   - `checkpoint`
6. `goto` `dc8`, `inCar`, `passenger: majsan`, timer 180 s ("Planet går 15.00"):
   - **forced pursuit:** `hyrbil` driven by angerud plus 1 Guardia Land Rover (the commotion attracts them)
   - `bustFails`: "Angerud tog väskan!"
   - radio, ole (from the taxi ahead with Siv): "Kjør, Stig-Helmer! Vi holder flyet!"
7. Cinematic on the apron:
   - Angerud's car skids up; the bungalow seller strolls over: «Jag var tvungen att sälja tomten i morse. De skrev på.»
   - angerud: «Ut! Ut!»
   - (he clutches his heart, sits down on the luggage cart; an ambulance siren approaches; it stays comic and off-screen)
8. `mantra` at the foot of the stairs, until fear ≤ 0 (the plane meter returns for this single stage). Majsan does the arms-out pose next to him.

**Outro:**
- stig and majsan: «Jag kan flyga, jag är inte rädd.»
- End card: "Rio de Janeiro. En båt på redden utanför Copacabana." The four sit in white dinner jackets and dresses, an orchestra plays for them alone (`rio` tune).
- Banner "RIO…?" / "Svenskarna reser inte till någonting… dom reser från någonting."
- Unlocks the `rio` outfit. Free roam continues on the island.

### Bonus `eslov1..3`: "Heja Eslöv!"

Giver **eslov** at `kyrka`, available after `bodega`. Time trials using `race` without an opponent, against a par time.
- intro: eslov: "Heja Eslöv!" — stig: «Herre jävlar!» (borrowing Berra's reply)
- **Kort** (inner loop round the plaza blocks, par 40 s, 500 pta)
- **Kusten** (the promenade loop, par 70 s, 800 pta)
- **Barrancon** (northern rock ramps with airtime, par 75 s, 1200 pta and the `eslov` outfit)

---

## 10. Collectibles and currency

### 10.1 Oles prylar (7, static)

Engine `record` behaviour: spin plus a light beam. Each pickup gives +250 pta and an Ole radio line. 7/7 gives +2500 pta, Ole's «Det fikser vi. Vi fikser alt!», and unlocks the **Samba horn** (H plays a short samba riff).

| # | gadget | where | how to reach it | Ole's line on pickup |
|---|---|---|---|---|
| 1 | Pool Pen | SunTrip pool floor (4,4) | jump into the basin | «Penn som skriver under vannet.» |
| 2 | Digital-analog watch | keeper's house roof, Faro (0,6) | crates to the roof | «Digital, analog, spansk, norsk, svensk tid, kronometer, og så klokke.» |
| 3 | Swiss army knife | top of the crane deck, `bygge` (3,1) | girder ramp, then a jump | «Swiss Army Knife. … Saks – uten skrutrekker.» |
| 4 | Japanese camera | DC-7 wing, Bahía Feliz (6,3) | jump onto a crate, then the wing | «Kamera. Skjerpe. Smil.» |
| 5 | Swimming goggles | top terrace pool, Rocas Rojas (6,5) | terrace ramps | «Mot klor.» |
| 6 | Calculator with alarm | Kasbah upper terrace (3,2) | stairs | «Uunnværlig!» |
| 7 | Samba cassette | Fataga plaza fountain (0,0) | long drive | «Hører du? Samba.» |

### 10.2 Hajfenor (7, moving)

Engine `mosquito` behaviour: a figure-8 path, here at pool-water height (y 0.55). Stomp or kick to collect. Each gives +250 pta and a Lasse radio line («Hajar i poolen? Delirium – ring kliniken.» for the first, then new variants such as "Hajar i poolen igen? Ring kliniken!"). 7/7 gives +2500 pta, Lasse's "Inga fler hajar. Berra lovar att sluta dricka. Till lunch.", and unlocks the **SunTrip-hatt** outfit.

Pools: Hotel Flamenco (3,5), Hotel SunTrip (4,4), Angerud's show bungalow (5,1), Rocas Rojas (6,4), Rocas Rojas (5,5), the golf water hazard (0,4), La Charca (0,6).

### 10.3 Currency: pesetas

- One coin = **25 pta**. The HUD reads "PTA".
- Sources:
  - street coin trails and ramp arcs (bygge, barrancos, the beach), cabin trails
  - prop bursts (`def.coins`)
  - mission rewards
  - collectibles
  - bonus trials
  - Rad 13
- Sinks:
  - busted fines (500 island / 100 plane)
  - the porter's bribe (500)
  - the donkey (200)
  - the grisfest ticket (800)
  - the shop
- **No soft locks:** Ole pays whenever a mission requires money you don't have.

---

## 11. Unlockables, shop and wardrobe

- **Missions:** `buss17` (I5), `pizzaracer` (I8), `grisbil` becomes buyable (I9), `rio` outfit (I12).
- **Bungalowkungens bilar** (shop at `bilfirma` on the `tomt` lot; the seller doubles as Hit & Run's Gil):
  - Each car stands on the lot as a named `locked` car with a price sign; prompt "**E** Köp Mercedes-taxi (3000 pta)".
  - Prices: Glassbilen 2000, Grisbilen 2500, Mercedes-taxi 3000, **Guardia Civil Land Rover 6000** (perk while driving it: SKANDAL gain ×0.5; "Ingen vågar anmäla en Guardia-jeep.").
  - Seller line: «Välkommen i det gröna!»
- **Outfits** (player def swap; the wardrobe prompt at `rum` is "**E** Byt kläder"; buy at the market `kladstand`):

| outfit | look | how |
|---|---|---|
| `arlanda` | *hat `keps`* in tweed, dark brown coat, light trousers | start |
| `kostym` | dark suit, *tie*, Hammarby badge dot | plane default |
| `hawaii` | red *pattern `hawaii`* shirt, oversized beige shorts, sandals | I6 |
| `bucket` | *hat `bucket`* with the SunTrip sun, light *pattern `prickig`* shirt | hajfenor 7/7 |
| `sombrero` | sombrero over the hawaii outfit | market, 1500 pta |
| `eslov` | blue ski suit with "ESLÖV" | bonus 3 |
| `rio` | white dinner jacket, *bowtie*, black trousers | ending |

---

## 12. Title screen, pause and HUD text

- **`index.html`:**
  - `lang="sv"`, `<title>Charter & Run</title>`
  - h1: `<span class="t1">CHARTER</span><span class="amp">&amp;</span><span class="t2">RUN</span>`, with the "&" as a spinning sun disc
  - tagline: «Svenskarna reser inte till någonting… dom reser från någonting.»
  - buttons: "Spela" / "Laddar…"
  - fine print: "Ett fan-gjort hyllningsspel till Sällskapsresan (1980). Inte anslutet till filmens upphovsmän. SunTrip finns inte. Bränsletillägg tillkommer."
- **Title orbit:** a slow circle round the cutaway plane at the snowy gate (gate palette) for new or plane saves; round the DC-8 on the Gando apron in the sun for island saves.
- **Controls card:**
  - WASD/pilar gå · kör
  - Mus titta
  - Shift spring
  - Mellanslag hoppa (två gånger!) · handbroms
  - J/klick sparka · i luften stampa · **på planet: håll för "Jag kan flyga!"**
  - E prata · kliv i/ur · sno bil
  - M karta · H tuta
  - N ljud av
  - R loss · Esc paus
- **Pause:** "Paus" / "Fortsätt" / "Musik: på|av" / "Ljud: på|av" / "Radera resan". Confirm: "Vill du radera resan och börja om på Arlanda?"
- **Loading:** "Packar resväskan…", "Tankar planet (bränsletillägg tillkommer)…", "Lägger handdukar på solstolarna…", "Målar en åsna…".
- **HUD:**
  - coins "PTA"; meter "FLYGSKRÄCK" / "SKANDAL" with " · PANIK!" / " · ¡ALTO!"; speedo "KM/H" (×3.6); trolley hp label "JUICE"
  - dialog "E ▸"; minimap "N"
  - big-map legend: "M stäng · ! uppdrag · ● Oles prylar n/7 · ● hajfenor n/7"; in the plane: "Kabinkarta"
  - prompts: "**E** Prata med Ole", "Kliv in", "Sno bilen", "**E** Sätt dig på 23E", "**E** Lås in dig", "**E** Muta portiern (500 pta)", "**J** håll: Jag kan flyga!", "Stå still!", "**E** Buda!"
  - car names: speedo shows the Swedish `spec.name`; `niceCarName` gets `buss17`, `pizzaracer`, `hyrbil`
- **Engine strings in Swedish:**

| English | Swedish |
|---|---|
| Get in a car | Kliv in i en bil |
| Out of time! | Tiden är ute! |
| Get back in a car! | Tillbaka in i bilen! |
| Go back for ${name}! | Åk tillbaka efter ${name}! |
| Never leave me again! | Lämna mig aldrig igen! |
| Pick up ${name} | Hämta ${name} |
| Slow down to pick them up! | Sakta ner så de kan kliva in! |
| Go go go! | Kör, kör, kör! |
| Stop the car! | Stanna bilen! |
| LOSING HIM! / DISTANCE | TAPPAR HONOM! / AVSTÅND |
| You wrecked ${name}'s ride! | Du kvaddade ${name}s bil! |
| You lost ${name}! | Du tappade bort ${name}! |
| 1ST · CHECKPOINT | 1:A · KONTROLL |
| GO! | KÖR! |
| ${name} won the race! | ${name} vann racet! |
| It got away! | Den kom undan! |
| Mission ${i} of ${n} | Uppdrag ${i} av ${n} |
| MISSION COMPLETE! | UPPDRAG KLART! |
| +${reward} coins | +${reward} pesetas |
| MISSION FAILED | UPPDRAG MISSLYCKAT |
| E Retry mission · Q Give up | **E** Försök igen · **Q** Ge upp |
| Try again! | Försök igen! |
| New mission: find X | Nytt uppdrag: leta upp **X**… |
| WRECKED! | KVADDAD! |
| Back on the road! | Tillbaka på vägen! |
| That one's busy! | Den är upptagen! |

  Banners are written as uppercase literals in the source.

---

## 13. Music and sound

**Rule:** original melodies only. No *Freight Train*, *Feliz*, Kostervalsen or Bengt Palmers themes. Traditional public-domain Christmas songs («Hej tomtegubbar», «Små grodorna») may appear as text in dialogue; their melodies are optional.

| tune | used for | bpm / meter | progression (MIDI roots) | voices |
|---|---|---|---|---|
| `flyg` | gate and cabin ("Nöjesresan" lounge) | 96, straight bossa | Dm9 G13 Cmaj7 A7b9 (`[50,53,57,60],[43,59,62,64],[48,52,55,59],[45,55,61,58]`) | sine keys, soft brushes, rimshot. **Fear drives a lowpass** (cutoff 4 kHz down to 600 Hz as fear goes 0 → 100); heartbeat above 80 |
| `panik` | plane pursuit | 132 | Am pedal, stabs | sawtooth stabs, fast hats |
| `sol` | island (charter schlager) | 116, straight | Am G F E (Andalusian cadence) | **accordion** (detuned square pair with tremolo), **congas** (pitched sine thumps 180/240 Hz), timple strum (short triangle arps) |
| `skandal` | island pursuit | 132, 2/4 paso-doble feel | Am E7 Am Dm E7 | brass stabs (filtered saw), snare rolls; siren and whistle sfx on top |
| `gris` | grisfest night | 168, 3/4 oom-pah | C G7 G7 C / F C G7 C | bass on 1, chords on 2 and 3, accordion lead |
| `jul` | Christmas Eve | 116 | `sol` in A major | plus sleigh-bell noise ticks |
| `rio` | ending | 100, samba | Dm7 G7 Cmaj7 A7 | surdo (low sine), agogo (two high sines), shaker |

Engine changes: a `TUNES` table read at each bar, `setTune(name)`, and the catch-up fix in the scheduler.

**SFX (synthesised):**
- seatbelt "pling" (a single 1300 Hz sine) and PA "ding-dong" (659 then 523 Hz)
- **cabin drone** on a new persistent channel (looped noise through a 400 Hz lowpass plus a 55 Hz sine; not silenced by `updateAudio`)
- **DUNS** (a 70 Hz thump plus noise)
- **applause** (dense short noise bursts over 2.5 s)
- turbulence rattle
- call-button pling
- trolley squeak (tone slides) and bell
- mantra pad
- toilet lock clack
- Guardia whistle (2.8 kHz trill) and two-tone siren
- pig squeal, plate crash, sheep bleat
- watch-alarm beep-beep for an Ole gadget pickup; bonk plus splash for a shark fin
- the samba horn

Voices are the engine's talk blips (pitch per character, §3). The blip regex changes to `/\p{L}/u`.

---

## 14. Visual style and palette

The cel-shaded toon look stays: four-band ramp, ink outlines 0x1d1426. The colour feel is a 1979 charter brochure.

| use | hex |
|---|---|
| SunTrip orange (sun, title) | `#F07A1E` |
| SunTrip yellow (Lasse, signs, coins) | `#FFD23F` |
| sea turquoise / stewardess | `#1E9AA0` |
| sky top / hazy horizon (day) | `#2A86E0` / `#F2E4C4` |
| whitewash | `#F4F1EA` |
| terracotta | `#C8553D` |
| volcanic ochre | `#B5652E` |
| bougainvillea | `#D63A8C` |
| palm green | `#3A8A3A` |
| cabin seat orange / headrest / wall / curtain | `#D2601F` / `#F2EFE6` / `#E6DCC4` / `#1F4F55` |
| Guardia green | `#3A5A2A` |
| night (grisfest) sky top / horizon | `#101A3A` / `#3A2A4A` (sun 0.6, hemi blue 0x6070b0) |

**CSS tokens:** keep `--ink`, `--cream`, `--yellow`. Replace purple and pink with `--sun #F07A1E`, `--sea #1E9AA0`, `--bougain #D63A8C`.
- Title gradient: a radial sunset from `--sun` to `--sea`.
- Meter fill: green → yellow → `--bougain` when hot.
- Pause card: `--sea`.
- Big-map background: sand `#E8D8A8`, not grass.
- `.rec-icon` / `.mos-icon` become `.pryl-icon` (a watch) and `.fen-icon` (a fin).

**Sign text** (Luckiest Guy): HOTEL FLAMENCO, SUNTRIP, VIKING BAR, TONGA TONGA, GRILL PACO, KASBAH, FERRETERÍA, BUNGALOWKUNGEN, HITTEGODS, LLEGADAS, EMPAQUETADO, BIENVENIDOS. Check the å/ä/ö/é/í glyphs with a screenshot.

---

## 15. Build plan for the agent team

### 15.1 Work packages

Packages A, B, D and E can start in parallel once A1 is merged.

| WP | scope | files | priority |
|---|---|---|---|
| **A1 Level core** | `game.level` (`'flight'`/`'island'`) and a per-level config table: sky palette, fog, sun/hemi, tune, meter config, camera profile, map source, `HOMES` (seated homes for the plane), start position, title orbit. `enterLevel(name, spawn)`. Guards for `resetToRoad` (plane: back to `seat23E`), `freeSpot` (level bounds), `routeAim` (cabin: straight line, or via `brygga` from the lounge), `startPursuit` spawn, minimap and big map. The save stores the mission index; the level and flight phase are derived from it | main.js, layout.js | P0 |
| **A2 gfx hooks** | `setSkyPalette`, stash the sky material, cloud altitude in `tickSky`, sea and island-blob groups, snow ground group | gfx.js | P0 |
| **A3 Camera interior profile** | `profile={pivotH:1.5, dist:4.0, pitch:.55, pitchMin:.3, pitchMax:1.0, minDist:1.2, bounds:{x0,x1,z0,z1}, ignoreKinds:['bound','seat'], yawLock:{center:π, range:.6}}`. Nearest-hit `segmentBlocked` taking a kind set. Interior `frame(a,b)`: above the midpoint, 3 m along the aisle, 3.5 m up | camera.js, collision.js | P0 |
| **A4 Meter** | `Shame` becomes `Meter(config)` (§6.3 and §8): passive rates, safe zones (toilet, bribe, SunTrip office), witness multiplier, pursuit modes (`vehicles`, `onFoot` walker with collisions or aisle walker), per-stage overrides `{forced, locked, vehicles}`, banners and taunts from config. `hud.setMeter(v, hot, label)` | shame.js → meter.js, hud.js | P0 |
| **A5 PathWalker** | Character steering along a polyline (loop, ping-pong, chase target, leave the aisle to grab), used by crew, rivals, patrols, the tail target and the Guardia | actors/walker.js | P0 |
| **B Cabin world** | `buildCabin(scene)`: gate lounge, jet bridge with door solid, cutaway fuselage and exterior parts, seats per §6.1, toilets with light signs, galleys, merged passenger busts, placards (with the 13 gag), landmarks. `buildDC8Exterior()` shared with the island apron | world/cabin.js, world/frame.js (export `Frame`) | P0 |
| **C Island world** | new `MAP`; generic builders (`bung`, `rocas`, `apts`, `playa`, `odling`, `barranco`), 12 specials and 2 special lots, outskirts (sea, wading zone, barranco hills, runway), palm tree kind, Christmas dressing, ped loops, named parked cars, `MAP_LABELS`, base-map colours | town.js, layout.js, hud.js | P0 |
| **D1 Models** | def fields `hat` (keps, trilby, bucket, sombrero, tricorne, captain, tomteluva, cap), `dress`, `sunglasses` (aviator, tinted), `beard`, `pattern` (hawaii, rutig, blommig, prickig as small coloured blobs on the torso), `tie` / `bowtie`, `heldItem` (super8, handbag, cup), hair `virvel` and `page`, `hairFlower`; anim flags `wings` (mantra) and `carried`; `CHARS`; ped palettes; outfit swap | models.js, character.js | P0 |
| **D2 Vehicles** | car types §7.6 (`landrover`, `cage`, `coach` flags), **trolley** (§15.5), `noExplode`, decorative rear riders, km/h | car.js, main.js | P0 |
| **E Stage kinds and missions** | new kinds and options (§15.3), 13 missions plus 3 bonus trials, stage checkpoints in the runner, the `cleanupMission` NPC list from `HOMES`, giver fix (call `placeNpcs` right after `state='idle'`) | missions.js | P0 |
| **F UI and audio** | Swedish strings, CSS theme, title and pause, minimap source for the cabin, sneak cones on the minimap, objective-bar zone and marker (haggle) and event ticks (brace), portrait ring colours (`stig` blue, crew turquoise, Guardia green, others yellow), tunes, drone channel, sfx | index.html, style.css, hud.js, audio.js | P0/P1 |
| **G Collectibles, shop, wardrobe** | prylar and fenor (`Collectible` kind table), coin value 25, shop lot, wardrobe, Rad 13, gag spots | pickups.js, main.js | P1 |
| **H Tests and docs** | rewrite shot.mjs (§15.6), README, CLAUDE.md (`#13 idle`, port 8840), package.json; update the parent `../CLAUDE.md` "latest created game" pointer | tools/, docs | P0 |

**Cut list if behind, cheapest first:** gag spots, bonus trials 2–3, the shop (give the cars as mission rewards instead), outfits beyond `kostym`/`hawaii`/`rio`, piglets in I9, P3 rivals (plain `rabbits`), the distraction window in I11 (a plain timed cone).

### 15.2 Engine contracts that must hold

- Build the cabin and its props **before** `finalizeProps()`. Plane props sit on the floor only.
- The cabin floor is `CURB`. Seat cushions top out at 0.55, seat backs at 1.35, occupied seats at 1.9, walls are `'bound'` boxes 1.2 m thick.
- Landmark ids stay ASCII. Mission `at`/`to` may be raw `{x,z,yaw}`.
- Seated NPCs: `state='seated'`, root placed by hand, and x/y/z set as well so `hud.say` bubbles land in the right place.
- One passenger seat per car. Extra riders are decorative busts (`addRider(def, car, 'rear')`).

### 15.3 Stage kinds

Every stage exposes data the test driver can warp to. A stage flagged `checkpoint: true` is where the runner's retry resumes.

| kind | params | done / fail | test hook |
|---|---|---|---|
| `goto` (+options) | existing, plus `sit:'seat23E'` (E to sit), `smooth:{label,fail}`, `fragile:{label}`, `onFoot` | as before; bar at 100 / 0 fails | `stage.to` |
| `mantra` | `until`, `text`, `seated?` | fear ≤ until | hold KeyJ |
| `brace` | `events:[[t, kind, fear, line?]]`, `neighbour:{drain:12, regen:6, penalty:20}` | end of script; fail at fear 100 | hold J. Test mode sets neighbour drain to 0 |
| `rounds` | `targets:[{at, need:'stop'\|'talk'\|'knock'\|'fetch'\|'sit', from?, who?, repeat?}]`, `timer?`, `vehicle?`, `hpLabel?` | all done; fail on timer or hp 0 | `stage.targets[i].{x,z,done}` |
| `sneak` | `item:{at}`, `home:{at}`, `guards:[{who, path, cone:.45, range:6, sweep?}]`, `hideRule:'rows'\|'zones'`, `carry?`, `distraction?:{zone, secs, guard}`, `onSpot:{fear?, skandal?, pta?, reset}`, `maxSpots?`, `timer?` | item reaches home | `stage.item`, `stage.home`; the test warps behind the guards |
| `haggle` | `who`, `start`, `goal`, `zones:[.3,.22,.15]`, `speeds`, `maxMiss:3` | price reaches goal | `stage.inZone` polled, then tap E |
| `tail` | `who`, `path`, `speed`, `maxDist`, `failDist`, `cues?` | walker reaches the end | `stage.walker` |
| `smash` | `type`, `count`, `timer`, `area` | broken ≥ count | `stage.list` (props) |
| `rabbits` (+options) | `mesh`, `bounds`, `fleeR`, `rivals:[keys]`, `need` | as before, plus the rival-loss rule | `stage.list` |
| `destroy` (+option) | `noExplode`, `driverChar` | as before | `stage.car` |
| `race` (+option) | no `who` means a time trial with `par` | | `stage.cps`, `stage.pi` |
| `grab` (+option) | `mesh` | | `stage.item` |

### 15.4 New actor: PathWalker

```js
new PathWalker(char, { path:[[x,z],…], mode:'loop'|'pingpong'|'once'|'chase',
  speed, target?:()=>({x,z}), aisle?:{x:0, halfW:.6}, leaveAisleAfter?:3, stops?:[{i, secs}] })
```
It sets the Character's `wishX/Z`; `Character.step` handles collisions. `obstacleAhead` should also see walkers and NPCs.

### 15.5 Trolley spec (car.js)

```js
vagn: { name:'Serveringsvagnen', len:.85, wid:.42, bodyH:.95, cabinH:0, wheelR:.06,
  maxSpeed:3.6, hardCap:true, noBoost:true, accel:4, grip:16, steer:.5, mass:80, hp:100,
  stepH:.1, wheelZ:.3, wheelX:.17, wheelW:.08, pushed:true, silent:true, audio:'trolley',
  flingSpeed:3.0, flingScale:.3, camDist:3.4, camH:2.0, hpLabel:'JUICE', build: buildTrolley }
```

Engine changes needed:
- **Hard top-speed cap:** stop applying throttle force once `vf >= maxSpeed`.
- **`noBoost`:** skip the player-car 2× boost for this vehicle.
- **Custom model:** an early `s.build` return in `buildCarModel`, before bumpers and lights.
- **Wheel overrides:** `wheelZ`, `wheelX` and `wheelW` replace the computed wheel positions.
- **`stepH`:** replaces the hard-coded 0.6 in `step`/`collideStatic`.
- **Pushed pose:** in `seat()`, a `pushed` vehicle places the player behind it, and `animateCharacter` gets a `push` pose.
- **Silent engine:** a squeak sound instead of the engine drone and skids.
- **Fling settings:** `flingSpeed` and `flingScale` replace the hard-coded values in `carsVsPeople`.
- **Camera:** `camDist` and `camH` override the chase-cam distance and height.
- **Speedo:** shows km/h and uses the `hpLabel` caption.
- **Bell:** `H` on the trolley calls `walker.stepAside()` for nearby walkers.

### 15.6 Tests (`tools/shot.mjs`)

- `story` gets 13 `M[k]` scripts, and the pass condition becomes `#13 idle`. Plane scripts:
  - warp to the targets
  - hold KeyJ through mantra and brace stages
  - drive the trolley by warping to each `stage.targets` point and waiting for speed 0
  - for `sneak`, warp onto the item and then home while the guard is at the far end
- Also: `startMission` should wait 3 frames before reading the giver, plus the in-game `placeNpcs` fix.
- New scenarios:
  - `cabin`: views of the gate, row 23, the galleys and a toilet
  - `trolley`
  - `panik`: `meter.add(100)` in the cabin, then check that the walker chases and a toilet clears it
  - `skandal`: island pursuit, bribe and bust
  - `views`: the island landmarks in `MAP_LABELS`
  - `title`
- Update `smash` to target `correos` and `drive` to use `named.buss17`.
- **Pass** requires all three: the `done -> #13 idle` line, no `scenario failed`, and `no errors` as the last line.

---

## 16. Risks

| risk | mitigation |
|---|---|
| **Interior camera** (clipping, disorientation in a 6 m wide cutaway) | Cutaway roof, a high and steep profile, lateral bounds clamp, yaw lock. Prototype it first with the `cabin` scenario screenshots before any mission work |
| Cabin at x = 3000 hitting town assumptions (`resetToRoad`, `freeSpot`, `routeAim`, minimap, pursuit spawn, title, start) | A1 guards every one; the `cabin` and `panik` scenarios exercise them |
| Trolley needs about 10 engine changes | All are contained knobs (§15.5). Fallback: an on-foot tray carry (`rounds` with walk speed capped at 3, spill on sprint or jump) |
| Brace minigames reading like cutscenes | Telegraphed icons, visible meters, real fail states, under 40 s; test mode is deterministic |
| Stealth readability (cones in a narrow tube) | Ground cone decals and minimap cones, generous hide rule (in a row = hidden), bubble on detection, no instant mission fail |
| Walkers and rolling items stuck between seats | Aisle-constrained walkers that leave the aisle only to grab; rabbits use a flee radius of 4 and are clamped to cabin bounds |
| Single passenger seat per car | Decorative rear riders; missions carry at most one real passenger |
| Model feature creep (hats, dresses, patterns) and draw calls | Patterns as a few merged blobs; plane passengers merged into one mesh; about 25 full Characters in all, the cast shared between levels |
| Night palette and sky hooks | One `setSkyPalette` used by both the plane phases and the grisfest, so it gets tested early |
| Swedish glyphs, uppercase literals, blip regex | Screenshot check of title, signs and banners; `/\p{L}/u` |
| Taste (alcohol, Berra's T-shirt, the heart attack) | Leave the T-shirt slogan off (plain blue tee); booze stays comic; the heart attack is off-screen and handled in one line |
| Real brands and people | SunTrip, Gurli Viking and Sport-knäckebröd only. No Scanair, Ving or Wasa, and no real-person name jokes (the Swahn/Falk/Uggla gate line is dropped) |
| Music copyright | Original tunes only (§13) |
| 13 missions is a lot of content | Data-driven stage kinds and the cut list in §15.1; plane missions are short and share one space |
| Flaky story test from the giver-relocation race | Fix in both the game and the driver (§15.6); giver `HOMES` entries equal their `at` |
| Save mid-flight | The level and phase come from the mission index; mid-flight saves spawn at `seat23E`, mission 0 at `gate` |