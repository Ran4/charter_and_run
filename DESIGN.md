# CHARTER & RUN — Design bible and module contracts

*Fan-made Simpsons: Hit & Run-style three.js game based on* Sällskapsresan *(1980). Folder:
`charter_and_run__sallskapsresan/`, built on a copy of the Bigmouth & Run engine (`src/`, reworked
since Phase 0: the changelogs at the end list every change).*

**Every agent reads this file first.** It is the single source of truth for names, keys, numbers,
file ownership and APIs. Where this file and a `notes/*.md` file disagree, this file wins. Where
this file is silent, keep the Bigmouth engine behaviour. If you must deviate from a contract
(a name, a signature, a landmark id), do not do it silently: write it in your hand-off report under
"CONTRACT CHANGES" so the integration agent can apply it everywhere.

Brief (the user's): *"Stig-Helmer är flygrädd, så första nivån är själva flygresan. Resten handlar
om att överleva gruppresan på Kanarieöarna med Ole Bramserud."*

Contents:
1. Concept, tone, rules · 2. Cast · 3. Controls · 4. Level system · 5. Level 1 "Flygresan" ·
6. The island · 7. SKANDAL + Guardia Civil · 8. Missions (13) · 9. Stage kinds + runner ·
10. Collectibles, currency, unlocks, outfits, save · 11. HUD/UI strings · 12. Music & sound ·
13. Visual style & palettes · 14. Architecture & engine APIs · 15. Build plan · 16. Test plan ·
17. Risks · Appendix A: canonical registries (all ids in one place)

### Choices this document settles (one line of why each)

Binding orchestrator decisions are applied as given. Where the three designs, the judges and the
decisions left something open, this file chose:

- **Gate = mission 1, entered at the security arch, giver Ole in the queue**: the film introduces
  Ole and his statistics at Arlanda; starting at the arch puts the beep gag first and keeps the
  gate set compact (in the flight level `routeAim` is bypassed: markers aim straight, §5.2).
- **Space = "håll i dig" in the plane** (not a new key): jump is disabled there anyway, and a held
  physical button makes turbulence a skill instead of a cutscene.
- **Trolley bowls you over (fling → down) instead of waiting politely**: the brief asks for traffic
  that bowls you over; seat pitch 1.2 m + walkable cushions make dodging into a row fair.
- **Points scene in mission 5 (landning), José/Siv lines in the right order**: binding decision +
  judges' factual fix; it also makes "…Fyra?" the comic motivation for the round-up.
- **Mission 4 giver is the stewardess (C's version), Berra stays seated**: helping confiscate keeps
  Stig-Helmer in character ("jag tål inte starksprit") and avoids a smuggling mission for Berra.
- **Juice mission = call-button gag → trolley fetch → turbulence carry**: the most famous gag stays
  verbatim as an interaction; the fetch adds the two invented mechanics where they are funniest.
- **Bodega hitch-hike logic**: Stig refuses the dirt road (his åksjuka from mission 6), drops them,
  they hitch the pig truck, the farmer lends Stig the truck: every film line now makes sense.
- **José's mother is a visible bust in his back seat**: "mamma comes anyway" without ramming an old
  lady's car, and it sets up "Gissa vem han hade med sig… Morsan!".
- **Julafton gameplay = rounding up the party guests** (Berra found behind the hotel): the decision
  lists only payoffs; a timed town-wide round-up is cheap, uses known verbs, and Berra's position
  sets up his own bodega line.
- **Heart attack = door slam + ambulance siren + one gentle caption**: off-screen per the brief; the
  caption avoids ambiguity without a joke.
- **SKANDAL officer walks with collision + `routeAim` + stuck teleport**; **fine scales with the
  purse (20 %, 250–1500 pta) and a bust costs 3 s**: judges' trap fix; review round 1 found a flat
  50 pta fine cheaper than any escape, which made the meter toothless.
- **Rio card at x = −3000**, built by WP-B: judge trap (x = +3000 sits inside the flight set's far
  plane); WP-B has the lightest geometry load.
- **`stig` outfit `arlanda` → `kostym` at boarding → `hawaii` at the end of buss17**: the clothes
  scene is in the hotel room (judge fix) and the decision says "hawaii after buss17".
- **METERS in `src/meters.js` owned by WP-H; fear-source numbers in `cabin.js` owned by WP-A1**: the
  two agents who tune them own them; `level.js` stays frozen after Phase 0.
- **Phase 1 isolation via git worktrees (or sandbox copies)**: the game folder is its own git repo;
  this is the only way 11 agents can each run headless tests without seeing each other's half-edits.
- **Stage kinds are frozen after Phase 0** (owner none): flight and island missions both use
  `goto`/`scene`/`collect`/`carry`/`mantra`, so no Phase-1 package may own a kinds file.

---

## 1. Concept, tone, rules

### 1.1 Pitch

December 1979. **Stig-Helmer Olsson**, a shy toaster inspector ("Kontrollerad av G17"), takes his
first trip abroad: SunTrip's Christmas charter to **Nueva Estocolmo**, a fictional resort town on
southern Gran Canaria. He is terrified of flying and has only Dr Levander's exercise to hold on to:
arms straight out, *"Jag kan flyga, jag är inte rädd."* Without knowing it he carries a "julklapp"
with 50 000 kronor of black money hidden in a crispbread packet. Next to him in row 14 sits the
gadget-mad Norwegian **Ole Bramserud**, who calms him down with air-crash statistics.

- **Level 1, "Flygresan"** (missions 1–5): a compact Arlanda gate (security arch, lounge, men's
  toilet, jet bridge) and then the flight itself in a cut-away DC-8, from snowy Arlanda through the
  clouds to "soldis och 22 grader". The meter is **FLYGRÄDSLA**; when it tops out Stig-Helmer gets
  **PANIK**.
- **Level 2, "Nueva Estocolmo"** (missions 6–13): open 7×7-block resort town. Survive the group
  trip: SunTrip's bus 17, the friskotek, the painted donkey, Berra and Robban's hunt for Pepes
  Bodega, José's dinner (and his mother), Fataga, the grisfest, and Christmas Eve by the pool. The
  meter is **SKANDAL**; at the top the **Guardia Civil** comes after you.
- The fear-of-flying arc closes on Christmas Eve: Stig-Helmer and Majsan say the mantra together,
  then an end card in Rio ("Rio…?").

### 1.2 Tone

- Warm, dry, Tati-flavoured, like the film. Comedy from embarrassment, bureaucracy, gadgets,
  Swedes abroad. Hit & Run chaos (crashes, Guardia) is cel-shaded slapstick: people tumble and get
  up, cars smoke, nobody dies.
- Exaggerate the gag, never the person. Stig-Helmer stays polite and bewildered.
- Swearing only where the film has it ("fan", "jävla", "herre jävlar", "Måtte djävulen…").
- **Angerud's heart attack is off-screen**: a door closes, an ambulance siren, one caption. No
  playable ambulance drive, no joke at his expense. No death or suicide jokes beyond the film's own
  lines (Ole's statistics are the film's).
- Berra's T-shirt slogan is **not** reproduced anywhere (plain blue tee).
- The Spanish family is the film's affectionate stereotype: no mock accents in text.

### 1.3 Language rules

- **All player-facing text is Swedish.** Banners are written UPPERCASE in the source literal
  (`'UPPDRAG KLART!'`); no CSS text-transform.
- **Everything set in Luckiest Guy is uppercase** (its lowercase glyphs are odd small caps:
  `GRISFeSTeN`). Literals are written uppercase (the title's `SÄLLSKAPSRESAN`, the pause buttons,
  the keycaps `SHIFT` `SPACE` `ESC` on the title, the pause card and in prompts); text that comes
  from data is uppercased where hud.js draws it (`toLocaleUpperCase('sv')`): banner mains (mission
  titles), the objective card's title, the dialogue name box and the big-map labels (Phase 3).
  In-world signs are drawn in Luckiest Guy too (`textCanvas`), so their literals are uppercase
  (Phase 3 r2: the church's `Det är en kyrka.` was the last mixed-case one).
- **In-world signs are Spanish or Swedish** (the resort's two languages), never English or
  German (Phase 3: `BIERSTUBE` → `CERVECERÍA · ÖL`; r2: `PUB LOS AMIGOS` → `TASCA LOS AMIGOS`).
- **Ole speaks Norwegian bokmål** in every line (use the Norwegian subtitle wording where it exists).
  Ole never speaks Swedish.
- José's family, the porter, the Guardia: Swedish "subtitle style" with Spanish words
  (`¡Josito!`, `Momento.`, `¡Alto!`).
- Internal ids are ASCII (`stig`, `flamencoPool`, `pryl_klocka`). Display names are Swedish.
- Glyphs in use: å ä ö Å Ä Ö æ ø Æ Ø é í ñ ¡ ¿ – … · ' (all in Luckiest Guy / Nunito Latin-1).

### 1.4 Source tags (mandatory in content files)

Every scripted line in `src/content/*.js` and `src/game/missions/*.js` carries a trailing comment:

| tag | meaning |
|---|---|
| `// [F]` | verified film line (Swedish subtitles, Wikiquote, or Norwegian subtitles for Ole), worded as in `notes/research-*.md` |
| `// [F*]` | film content adapted: shortened, rendered in Norwegian by us, or **relocated** to another scene/speaker context |
| `// [N]` | new line written for the game. **Never** present as a film quote (README, credits, loading tips) |
| `(t)` | appended to any tag when the speaker is our interpretation (sources don't say who speaks): `// [F](t)` |

Any film line used in a CHATTER / OUCH / GETUP / CARJACK / NPC_KICKED / OLE_STATS table (or their
`_OLE` / `_LOCAL` variants, §14.10), or as a
sign, outside its own film scene is `[F*]` (relocated), never plain `[F]`.

Mission titles (shown on banners and the objective card) carry one too, on the `title:` line:
`// title [F*]` for a title taken from film dialogue, `// title [N]` for our own (Phase 3 r2, all
thirteen: of the island titles only "Julafton bland palmerna" is `[N]`).

### 1.5 Brands, real people, music

- Fictional only: **SunTrip** (the film's own), plane **"Sol-Viking"** reg. **SE-SOL**, crispbread
  **"SPORT-KNÄCKE"**, petrol sign **"GASOLINA"**, drinks machine **"REFRESCOS"**. No Scanair, SAS,
  Vingresor, Wasa, DISA, KAS, Fantasy Island, Arehucas, Tropical, SEAT, Renault, Land Rover (in
  player-facing text). No real businesses or resort complexes on signs or map labels: no Grill
  Paco, Kasbah, CITA, Las Olas, Los Caracoles, Las Arenas, Las Brisas (internal ids may keep the
  short names `grillpaco`, `kasbah`, `cita`). Public landmarks (Faro de Maspalomas, Templo
  Ecuménico, Fataga, Gando) may be named.
- Real people's names appear **only inside quoted film lines** (Stenmark, Lennart Swahn, Karin
  Falk, Magnus Uggla). No "Gurli". The grisfest host is unnamed (**Grisfestvärden**). The cleaner
  (Gösta Ekman cameo) is credited only as **"Städerskan"**.
- **Music:** synthesised originals per mood plus only public-domain traditional melodies:
  *Små grodorna*, *Hej tomtegubbar*, *Helan går*. No film songs ("Freight Train" welcome song,
  "Feliz", Kostervalsen, Bengt Palmers). Song lyrics at most one spoken line.

### 1.6 What is invented (label it in code comments and the README)

Turbulence; PANIK and FLYGRÄDSLA as mechanics; holding on during turbulence; the trolley bowling
people over; collecting rolling bottles; rounding up standing passengers; the Guardia Civil
pursuit and ¡MULTA!; haggling as a timing game; the wet-paint "SKICK" bar; the ÅKSJUKA bar; the
porter bribe as a hideout; Oles prylar and hajfenor as collectibles; the grisbil being lent to
Stig-Helmer; rounding up the Christmas-party guests; the Rio end card as a playable epilogue;
the serving trolley itself (the film shows stewardesses with trays only) and fetching juice from
it (in the film the stewardess brings it); the luggage stowers blocking the aisle; locking
yourself into the plane's toilet against the fear (the on-board toilet hideout) and helping
yourself to juice in the galleys (`toilet:L/R`, `juice:front/back`, §5.10); Stig-Helmer
driving SunTrip bus 17 (in the film Lasse ends up taking the transfer); "Plocka kulor" as a chase
after wind-blown beach balls; the Fataga sheep stampede and round-up; the night-bus race; porcelain
smashing as a timed game; following José's car and the pig truck; the Guardia jeep chase; Ole's
gadgets scattered over the island; Majsan saying the mantra together with Stig-Helmer.
The film's flight has **no turbulence** and **no in-flight toilet scene**: both toilet scenes are
at Arlanda (we keep them there). The plane's toilets are only an invented hideout.

---

## 2. Cast

All humans are `kind: 'adult'`. Keys are canonical (Appendix A). `voice` = talk-blip pitch (Hz).
`ring` = dialogue-portrait ring colour (replaces the hard-coded `'nick'` check).
Look fields marked † are **new model fields** implemented by WP-E (§14.6); Phase 0 approximates them
with existing fields so nothing blocks.

### 2.1 Cast table

| key | display name (`name`) | role | voice | ring | look (CHARS def; outfits below) |
|---|---|---|---|---|---|
| `stig` | Stig-Helmer | **player** | 250 | `#4a9ad6` | scale 1.12 ("Giraffen": tall, thin, `wide` .85), skin `0xf1c9a5`, hair `swoop` `0x2a1e18` + `tuft`† (cowlick), brows `0x2a1e18`, mustache `0x2a1e18`, round glasses `0x6b4a2a`, nose `long` |
| `ole` | Ole | companion, main giver | 270 | `#f7c31b` | `wide` 1.35, skin `0xf2b89a`, hair `balding` `0xa0522d` (curly sides), big mustache `0xa0522d`, `shades`† `0x2a2a2a` (island, aviator) |
| `majsan` | Majsan | love interest | 340 | `#fff8e6` | scale .97, hair `page`† `0x8a3b22` (bangs), `dress`† `0x4a7fd0` + `print`† white dots, `hairFlower`† white (island) |
| `siv` | Sivan | Majsan's sister, hands out points | 360 | `#fff8e6` | hair `bun` `0x7a3018`, pink top `0xffb0c0` with `print`† white and red flowers, `dress`† `0xd8321e` + `skirtPrint` `0xffb0c0`/white dots |
| `berra` | Berra | bodega hunter | 220 | `#fff8e6` | `wide` .9, hair `long` `0x5a3a22`, walrus mustache, big tinted glasses `0x3a3a3a`, shirt `0x2a4fa0` (plain, **no text**), `vest`† denim `0x4a6a9a`; gate: cream cowichan cardigan `0xf0ead8` + stripe `0x4a3a2a` |
| `robban` | Robban | Berra's Gothenburg mate | 235 | `#fff8e6` | `wide` 1.25, hair `short` thin `0x6a5a48`, glasses; flight: shirt `0xf07a1e` + blue collar; island: `0x1f2f6a` with small yellow dots + yellow collar, white `hat:'cap'`† with a blue peak |
| `angerud` | Gösta Angerud | antagonist (comic) | 200 | `#fff8e6` | `wide` 1.35, skin ruddy `0xf0b8a0`, hair `balding` `0x5a4a3a`; flight: dark suit `0x3a3a44`, blue shirt `0x8ab0d8` + `tie`† `0xc8202a`; gate: + camel coat, brown fur hat; island: light-blue suit `0x9cc4e4` longSleeves + `shades`† |
| `levander` | Dr Levander | radio/phone/portrait only | 290 | `#c8c8d8` | tall thin, hair `slick` `0x2a2a2a`, big glasses, shirt white (coat) longSleeves, `tie`† navy |
| `lasse` | Lasse | SunTrip platschef, giver | 300 | `#f07a1e` | athletic, skin tan `0xc98f62`, hair `curly` `0x1d1426`, sun-yellow suit `0xffd23f` (shirt+pants, longSleeves), `print`† on the orange shirt in the jacket's V; julafton: red, shorts with a white hem + `hat:'tomte'`† |
| `affe` | Affe | guide, accordion | 280 | `#f07a1e` | thin, hair `short` `0xc9a66b`, shirt print†, pants `0xffd23f`, `shades`†, `held:'accordion'`† |
| `gabbe` | Gabbe | guide, congas, night bus | 190 | `#f07a1e` | `wide` 1.4, hair `afro` `0xc0602a`, `beard`† `0xc0602a`, `shades`†, pants `0xffd23f`, `held:'congas'`† (decor) |
| `jose` | José | "pizza-racern" | 280 | `#d8321e` | hair `slick` `0x1d1426`, thick mustache, shiny royal-blue shirt `0x2048c8` longSleeves |
| `mamma` | Josés mamma | chaperone | 380 | `#d8321e` | hair `bun` grey `0x9a9a9a`, glasses, `dress`† black `0x1d1426` |
| `pappa` | Josés pappa | Josés pappa (in game a shepherd: invented, a nod to the actor Juan Socorra Vega, a real shepherd) | 180 | `#d8321e` | black suit `0x1d1426`, `hat:'trilby'`† black |
| `carmencita` | Carmencita | Viking Bar, José's sister | 360 | `#d8321e` | hair `short` `0x1d1426`, `dress`† black, stripe `0xd8321e` (red scarf) |
| `herrStorch` | Herr Storch | newlywed from Mjölby | 300 | `#fff8e6` | young tall, hair `curly` `0x9a7a52`, dark floral shirt `0x3a2a4a` print† (shows in the vest's opening), `vest`† suede `0xb07a5a`, `held:'camera'`† (Super 8, lens cap ON) |
| `fruStorch` | Fru Storch | newlywed, "Storch, inte Stork" | 410 | `#fff8e6` | `wide` 1.15, hair `curly` blonde `0xf0dca0`, glasses, shirt cerise `0xd0307a`, `hairFlower`† |
| `portier` | Portiern | Flamenco reception | 255 | `#d8321e` | white shirt, black `vest`†, `bowtie`†, mustache |
| `sulan` | Sulan | gate only: the bodega tip | 245 | `#fff8e6` | hair `short` `0x6a4a2a`, shirt `0x6a4a2a`, tanned `0xd9a07a` (just home) |
| `vardinna` | Flygvärdinnan | flight giver | 370 | `#1e9aa0` | `dress`† turquoise `0x1e9aa0` (sleeveless) over white shirt, hair `bun` blonde `0xf0d890` |
| `vardinna2` | Flygvärdinnan | trolley pusher (cabin-owned) | 390 | `#1e9aa0` | as `vardinna`, hair `bun` `0x8a5a2a` |
| `kapten` | Kaptenen | PA voice only | 185 | `#1e9aa0` | white shirt, `hat:'pilot'`† navy |
| `pa` | Högtalaren | Arlanda/cabin PA voice only | 400 | `#1e9aa0` | portrait = a loudspeaker-ish SunTrip agent: yellow jacket `0xffd23f`, hair `bun` |
| `kontrollant` | Kontrollanten | Arlanda security | 230 | `#fff8e6` | shirt `0x3a4a6a` longSleeves, `hat:'cap'`† navy |
| `hittegods` | Killen från flygplatsen | brings the suitcase | 300 | `#d8321e` | shirt `0xd8d0b0`, `hat:'cap'`† |
| `saljare` | Bungalowförsäljaren | sells Angerud the plot | 310 | `#fff8e6` | white suit `0xf4f0e6` longSleeves, hair `swoop` fair `0xe0c890`, `shades`† |
| `souvenir` | Souvenirförsäljaren | the donkey seller | 225 | `#d8321e` | `wide` 1.2, shirt `0xe8d8a8`, mustache, `hat:'sunhat'`† straw |
| `stadare` | Städerskan | cleaner (cameo) | 260 | `#d8321e` | tall, `hat:'scarf'`† (headscarf), `dress`† black + stripe pink `0xf0a0c0` (apron), `held:'broom'`† green |
| `eslov` | Rullskidåkaren | "Heja Eslöv!" set dressing | 320 | `#fff8e6` | blue ski suit `0x2a4fa0` + stripe yellow `0xffd23f`, `hat:'cap'`† |
| `grisbonde` | Grisbonden | pig-truck driver (bust/NPC) | 200 | `#d8321e` | shirt `0x6a5a3a`, `hat:'sunhat'`† |
| `varden` | Grisfestvärden | grisfest host (unnamed) | 210 | `#d8321e` | `wide` 1.3, white shirt, red sash stripe, mustache |
| `guardia` | Guardia Civil | pursuer officer + vehicle busts | 210 | `#3d5a3a` | green uniform `0x3d5a3a` shirt+pants longSleeves, `hat:'tricorn'`† black gloss, mustache |
| `pax` | Medpassagerare | anonymous voice for (t) lines (a fellow tourist; not for the Spaniards' lines) | 280 | `#fff8e6` | random 1979 tourist (brown/orange clothes) |
| `telefonist` | Telefonisten | portrait only: the Las Palmas telephone-station clerk, "Hytt två!" (Phase 3) | 330 | `#d8321e` | skin ES, hair `short` `0x1d1426`, glasses, pale-blue shirt `0xd8e4f0` longSleeves + collar |

Removed Bigmouth keys: `nick maurice andrew steve jay jessi connie duke shame` (delete from
`CHARS`; the monster/ghost/wizard builders may stay as dead code).

### 2.2 Outfits (`def.outfits`, shallow-merged over the base def by `Character.setDef`)

| key | outfits (name: fields) | when |
|---|---|---|
| `stig` | `arlanda`: shirt `0x3a2a1e` longSleeves (dark brown coat), pants `0x2e2620`, `hat:'cap'`† tweed `0x8a7a5a`, white mittens `hands` `0xf4f0e6` with a red `mittenBand` `0x9a3a2a` (the research's Nordic pattern) · `kostym`: shirt `0x4a3426` longSleeves, pants `0x3a2a1e`, `tie`† `0x7a2a2a` · `hawaii`: shirt `0xd8321e` `print`† `[0xffd23f,0x3f7a3a,0x2f6ad8]`, short sleeves, `shorts:true` (oversized), pants `0xe8dcb8` · `rio`: shirt `0xf4f0e6` longSleeves, `bowtie`† `0x1d1426`, pants `0x1d1426` | `arlanda` mission 1 (gate) → `kostym` from mission 1 outro (boarding) → `hawaii` from the buss17 outro → `rio` only in the end card |
| `ole` | `arlanda`: + `hat:'trilby'`† `0xe8e2d0`, shirt beige `0xd8c8a0` longSleeves, `held:'boombox'`† (black, chrome speaker rims) · `flyg`: white polo `0xf4f4f0` · `flygRadio`: `flyg` + `held:'boombox'` (seated, the box lies on his lap, speakers to the front; the sprit outro, §8.4) · `sol`: shirt `0xf2c94c` `print`† check, pants `0xe8dcb8`, `shades`† · `gris`: shirt `0xf4f4f0` stripe `0xd8321e`, gold `chain` (the pendant) · `rio`: white jacket + `bowtie`† + `shades`† | per level/home set (§4.5) and by dialogue cue |
| `berra` | `arlanda` (cowichan), `flyg`, `sol` (+ `hat:'cap'`† white) | per level |
| `robban` | `flyg` (orange, `collar` `0x1f2f6a`), `sol` (navy with yellow dots, `collar` `0xffd23f`, white cap with `peakC` `0x2a4fa0`) | per level |
| `angerud` | `arlanda` (`coat` camel `0xc8a06a`, `hat:'fur'` `0x5a3a22`), `flyg` (dark suit, blue shirt), `sol` (light-blue suit, white shirt + shades) | `arlanda` at the gate (mission 1), then per level |
| `lasse` | `sol` (yellow suit), `jul` (red T-shirt, red shorts with a white `shortsHem` + tomte hat) | `jul` in julafton |
| `majsan`, `siv` | `flyg` (cardigan over dress: shirt colour on top; no print, no `skirtPrint`), `sol` | per level |

Invented look details (§1.6): Stig's arlanda scarf and Fru Storch's white dress. The other looks in
§2.1/§2.2 follow `notes/research-characters.md` (Ole's beige coat and black boombox, Robban's dots and
collars, Lasse's jul shorts "med vit kant", Stig's white patterned mittens, Angerud's Stockholm coat
and fur hat).

`Character.setDef(def, outfitName)` rebuilds the model under the same parent and keeps the transform
(Phase 0). Player outfit changes re-render the portrait. **Fallback (cut):** keep the base look.

### 2.3 Where everyone stands (`HOMES`, per home set — format in §4.5)

| key | `HOMES.gate` (mission 1 only, index 0) | `HOMES.flight` (missions 2–5, any phase) | `HOMES.island` |
|---|---|---|---|
| `ole` | `['gateOle', 0, 0]` | `{ seat: '14A' }` | `['flamenco', 2.0, 1.0, 0]` (yaw 0: facing the pool) |
| `majsan` | `null` (in the ladies' room) | `{ seat: '16E' }` | `['flamencoPool', -2.0, 0]` |
| `siv` | `null` | `{ seat: '16F' }` | `['flamencoPool', 2.0, 0]` |
| `jose` | `['gateLounge', 5.0, -1.0]` | `{ seat: '16D' }` | `['cita', 0, 0]` |
| `berra` | `['gateLounge', -1.2, 0]` | `{ seat: '22C' }` | `['flamencoBar', 0, 0]` |
| `robban` | `['gateLounge', 0.6, 0]` | `{ seat: '22D' }` | `['flamencoBar', 1.6, 0]` |
| `sulan` | `['gateLounge', 2.2, 0.4]` | `null` | `null` |
| `angerud` | `['gateDesk', 2.0, -2.0]` | `{ seat: '6C' }` | `['vikingbar', 2.0, 1.0]` |
| `herrStorch` | `['gateLounge', -4.0, 2.0]` | `{ seat: '10A' }` | `['playa', 0, 0]` |
| `fruStorch` | `['gateLounge', -4.8, 2.0]` | `{ seat: '10B' }` | `['playa', 1.4, 0]` |
| `kontrollant` | `['gateArch', -1.8, 3.0]` (= local (30.0, 3.2): airside, beside the arch exit, clear of the barriers and the passage) | `null` | `null` |
| `vardinna` | `['cabinDoor', 0, 0]` | `['galleyFront', 1.0, 0]` (= lx −1.2, lz 13.0: beside the aisle, so the trolley never waits for her) | `null` |
| `lasse` | `null` | `null` | `['suntrip', 0, 0]` |
| `affe` | `null` | `null` | `['scen', -3.0, 0]` |
| `gabbe` | `null` | `null` | `['scen', 3.0, 0]` |
| `mamma` | `null` | `null` | `['fatagaDukar', 0, 0]` |
| `pappa` | `null` | `null` | `['fatagaFold', 0, 0]` |
| `carmencita` | `null` | `null` | `['vikingbar', -2.0, 0]` |
| `portier` | `null` | `null` | `['flamencoRecepcion', 0, 0]` |
| `hittegods` | `null` | `null` | `['hittegods', 0, 0]` |
| `saljare` | `null` | `null` | `['bungalow', 0, 0]` |
| `souvenir` | `null` | `null` | `['asnestand', 0, 1.2]` |
| `eslov` | `null` | `null` | `['eslovVag', 0, 0]` |
| `stadare` | `null` | `null` | `null` (appears only in the julafton chaos scene) |
| `grisbonde`, `varden` | `null` | `null` | `['grisfest', -3.0, 0]`, `['grisfest', 3.0, 0]` |

- `null` = hidden in that home set (`busy = true`, `state = 'hidden'`, `root.visible = false`).
- `{ seat }` = seated by `cabin.seatCharacter` and `busy = true` (so `placeNpcs` skips it).
- `vardinna2` is **not** in HOMES: the cabin owns it (trolley pusher).
- Radio/portrait-only keys (no NPC instance): `levander kapten pa guardia pax telefonist` (`guardia` officers
  are spawned by the meter). They still get portraits (§14.3).
- **NPC instances** (Phase 0, §14.2): one `Character` for **every** `CHARS` key except `stig` (the
  player), the radio-only keys above and the cabin-owned `vardinna2`, whether or not any home set
  places it. A key that is `null`/absent in the current home set is created hidden. (So `stadare`,
  null everywhere, exists for the julafton room-113 scene.)
- Mission `extra` lists and stage `place` cues move NPCs for scenes (§9).

---

## 3. Controls

Physical keys are unchanged from Bigmouth. The level config turns verbs on and off (§4.2).

| action | keys / pad | island | flight (gate lounge + cabin) |
|---|---|---|---|
| move | WASD / arrows / left stick | walk 5.4, Shift sprint 8.8 / drive | walk **3.6**, Shift **5.2** (sprinting adds fear) |
| look | mouse / right stick | free camera | camera with pitch clamp (§5.3) |
| `jump` | Space / A | jump, double jump; handbrake in car | **HÅLL I DIG** (hold): grab the nearest seat back, you stop moving; protects against turbulence. First press shows toast "Space: håll i dig (vid turbulens)" |
| `attack` | J / left click / X | kick, stomp in the air | **hold = mantra** "Jag kan flyga, jag är inte rädd": `wings` pose, cannot move, fear −25/s after 0.3 s wind-up, bubble every 2.5 s |
| `interact` | E / F / Enter / Y | talk, enter/exit car, steal car, interactables | talk, **sit/stand** ("E Sätt dig" / "E Res dig"), toilets ("E Lås in dig"), call button, trolley |
| `map` | M / Tab | big map | cabin/gate plan |
| `reset` | R | unstick (back to the road) | `resetSpot(g)` (§4.3): inside the cabin, back into the **aisle at the same row** (the free spot on the centre line nearest his z, within 2 m; never along the tube); in the terminal, `gateLounge`; on a **timed** stage (the toilet dash) the lounge's approach spot, or else `gateOle`'s (the PANIK home, behind the dash start), whichever is not nearer the stage's target than he is, and when both are, **R does nothing** and toasts `Inte härifrån!` (a guide waypoint's own `goal` counts, not the waypoint: §8.1 [3]). Phase 3 r2: R to `cabinRow14` was a free 14B for ombord's 7 s and landning's 5 s seat dashes, and a jump over the sprit sweep. Phase 3 r3: R did nothing, silently, whenever the lounge was nearer the target, on the untimed stages too (the queue, boarding, to Ole), where it is the only way out of a wedge (the flight level has no jump); an untimed stage has nothing to gain from it. Seated: `standPlayer()` first; ignored while a `timeline` locks the seat; both levels: ignored while `frozenT > 0` or during PANIK; a reset while `carrying` sets `bumpedT = 0.4` (spills/fails the carry: R is never a free teleport to a carry goal) |
| horn / mute / pause | H / N / Esc, P | as Bigmouth | same (no horn) |

- **Mantra on the island**: J is kick. A `mantra` stage sets `game.mantraMode = true` so J holds
  the mantra instead (julafton duet).
- **Seated** (flight): movement input is ignored; E uses a `whileSeated` interactable if one is in
  range, else stands up (giver talk is **not** offered while seated: stand up first, §14.3); J
  mantra still works; Space does nothing. Phase 0: `handleOneShots` handles E, J and R when
  `player.state === 'seated'` (Bigmouth returns early for any non-`normal` state) and `updateHud`
  computes prompts while seated.
- Pad Start = pause (Phase 0 maps the unused `pause` action). Pad Start also **resumes** from the
  pause card (`input.padPressed('pause')`, polled while paused); keyboard Esc/P only pause, since
  pointer lock cannot be re-taken from a key press, so the keyboard resumes with the `Fortsätt` button.

---

## 4. Level system contract

### 4.1 Principle

One static world built once at init. Two **levels** are configurations, not scenes:
- `flight`: the gate set and cabin at **x = +3000** (world/cabin.js), floor at `CURB` (0.15).
- `island`: the existing 7×7 grid around the origin (P 80, N 7, HALF 280, BOUND 314).
- Off-world set: the Rio end card at **x = −3000** (world/rio.js), used only by a cinematic.

Island geometry stays inside **|x|, |z| < 1150** (sea plane included: x, z ±1150). The camera far
plane is 1800 m, so from the cabin (x ≥ 2996) everything at x > 1196 is in view range: keeping the
island inside 1150 means nothing island-side (domes, lighthouse, sea edge) renders as a silhouette
behind the flight scenery. Rio at x = −3000 is > 4000 m from the cabin and > 1800 m from the town.

### 4.2 `LEVELS` (src/level.js, Phase 0)

```js
// src/level.js
import { CAM_CABIN, FLIGHT_PALETTES } from './world/cabin.js';
import { BOUND } from './world/layout.js';
import { HOMES, MAP_LABELS, LEVEL_OUTFITS } from './content/index.js';
import { METERS } from './meters.js';                 // §5.9, §7.1 (meters.js: Phase 0, then WP-H)

export const ISLAND_PALETTES = { day: {...}, night: {...}, sunset: {...} };   // §13.3

export const LEVELS = {
  flight: {
    name: 'flight', title: 'Flygresan',
    meter: 'flygradsla',            // METERS key → game.shame.configure()
    camProfile: CAM_CABIN,          // §5.3
    map: 'cabin',                   // game asks cabin.mapSource(phase)
    clouds: false,                  // town sky clouds hidden
    shadows: false,                 // sun.castShadow
    sim: { traffic: false, peds: false },   // skip traffic AI/peds stepping + hide them
    verbs: { jump: false, kick: false, hold: true, mantra: true, enterCars: false },
    speeds: { walk: 3.6, sprint: 5.2 },
    tune: 'muzak',
    phaseForIndex: (i) => (i <= 1 ? 'gate' : 'cruise'),
    paletteFor: (phase) => FLIGHT_PALETTES[phase],
    // Cast keyed on mission progress, never on phase: ombord (index 1) starts in phase 'gate' with
    // the player already on board, and its cast must be seated from the first frame.
    homes: (g) => (g.missions.index === 0 ? HOMES.gate : HOMES.flight),
    outfits: (g) => (g.missions.index === 0 ? LEVEL_OUTFITS.gate : LEVEL_OUTFITS.flight),
    inBounds: (x, z, g) => g.cabin.inside(x, z),
    spawn: (g, i) => (i === 0 ? 'gateStart' : i === 1 ? 'cabinDoor' : 'cabinRow14'),
    // Spots keyed on where the player is (cabin.inCabin = the interior rect only). Phase 0 shape;
    // shipped since Phase 3 r2/r3: the cabin aisle at his row, the terminal rule of §3.
    resetSpot: (g) => (g.cabin.inCabin(g.player.x, g.player.z) ? 'cabinRow14' : 'gateLounge'),
    panicHome: (g) => (g.cabin.inCabin(g.player.x, g.player.z) ? { seat: '14B' } : { lm: 'gateOle' }),
    routeAim: false,                // markers/guide arrow aim straight at the target (§5.2)
    labels: () => MAP_LABELS.flight,
    titleOrbit: { x: 3012, z: 8, r: 32, h: 20 },
  },
  island: {
    name: 'island', title: 'Nueva Estocolmo',
    meter: 'skandal', camProfile: null, map: 'town', clouds: true, shadows: true,
    sim: { traffic: true, peds: true },
    verbs: { jump: true, kick: true, hold: false, mantra: false, enterCars: true },
    speeds: { walk: 5.4, sprint: 8.8 },
    tune: 'sol', palette: 'day',
    homes: () => HOMES.island,
    outfits: () => LEVEL_OUTFITS.island,
    routeAim: true,
    inBounds: (x, z) => Math.abs(x) < BOUND - 5 && Math.abs(z) < BOUND - 5,
    spawn: (g, i) => (i === 5 ? 'airport' : 'flamencoDeck'),   // pool deck, outside the pergola (Phase 2)
    resetSpot: null,                 // null = Bigmouth "nearest road" reset (use P/HALF constants)
    labels: () => MAP_LABELS.island,
    titleOrbit: { lm: 'flamencoPool', r: 45, h: 24 },
  },
};
```

### 4.3 Level-dependent behaviour (Phase 0 wires all of these in main.js)

| concern | flight | island |
|---|---|---|
| meter | FLYGRÄDSLA, mode `panic` | SKANDAL, mode `pursuit` |
| camera | `cam.profile = CAM_CABIN` | `cam.profile = null` (Bigmouth) |
| minimap/big map | `hud.setMapSource(cabin.mapSource(phase))`, rim badge "FRAM" (+z up) | town base map, "N" |
| sky/fog/body bg/lights | `FLIGHT_PALETTES[phase]` | `ISLAND_PALETTES.day` (or `night`/`sunset` via cue) |
| town clouds (`MAT._clouds`) | hidden | visible |
| traffic + peds | not stepped, `root.visible = false` | normal |
| jump / stomp / kick | off (Space = hold, J = mantra) | on |
| entering cars | off; `car.noEnter` always skipped anyway | on |
| `freeSpot()` bounds | `cabin.inside(x, z)` | `|x|,|z| < BOUND − 5` |
| R reset | `resetSpot(g)` (by player position): a landmark name, a spot `{x, z, yaw}` (the cabin aisle at his row; the lounge's or Ole's approach spot) or `null` (R does nothing and toasts `Inte härifrån!`; §3) | nearest road (layout constants, not literals) |
| HOMES / NPC outfits | `HOMES.gate` + `LEVEL_OUTFITS.gate` while `missions.index === 0`, else `HOMES.flight` + `LEVEL_OUTFITS.flight` (any phase) | `HOMES.island` |
| guide arrow / minimap route (`updateMarkers`) | `aim = target`, `nodes = []` (no `routeAim`) | `routeAim` |
| title orbit | around the cabin, gate phase, snowing | around `flamencoPool` |
| music | `muzak` + fear low-pass + heartbeat | `sol` (pursuit: `skandal`) |
| ped/NPC chatter | `CHATTER_FLIGHT` | `CHATTER` |
| collectibles | none (cabin coins only) | prylar + hajfenor |
| audio drone | `audio.drone()` driven by cabin | off |

### 4.4 Level API (main.js, Phase 0)

```js
game.level              // 'flight' | 'island'
game.levelDef           // LEVELS[game.level]
game.timeScale          // 3 in ?test=1 (override &ts=1), else 1. Cabin phases, timelines,
                        // turbulence, mantra seconds all advance by dt * timeScale.
game.levelFor(index)    // MISSIONS[Math.min(index, MISSIONS.length - 1)].level
game.setLevel(name, { index = missions.index, instant = true } = {})
   // applies every row of §4.3: shame.configure(METERS[def.meter]) (v = 0), cam.profile + pitch0,
   // map source, palette, clouds, shadows, sim, tune, NPC home set (placeNpcs(true) after
   // hiding/seating), player outfit for the level, flight: cabin.setPhase(def.phaseForIndex(index),
   // {instant:true}); drone on/off.
async game.transitionTo(name)
   // flight → island (after mission index 4's outro):
   //  1 letterbox(true); flash white; banner 'LAS PALMAS' / 'Soldis och 22 grader varmt.' [F*]
   //  2 cabin.unseatAll(); trolley parked; cabin stops ticking exterior
   //  3 setLevel('island')
   //  4 player.teleport to lm('airport') + 2 m along its yaw; cam.snapNext; placeNpcs(true); save()
   //  5 await wait(1.2); letterbox(false)
   //  6 toast 'Nytt uppdrag: hitta <b>Lasse</b> vid flygplatsen <span class="bang">!</span>'
   //    (this toast replaces the runner's generic new-mission toast for that one completion)
```

**On load** (`init`): after `load()`, `game.setLevel(game.levelFor(missions.index))`, then spawn the
player at `levelDef.spawn(game, index)` (landmark + 1.5 m along its yaw, facing back along it).
That spot is computed by `game.approachSpot(lm)` (Phase 0a): if the +1.5 m spot is not free ground
at the landmark's own height or lies outside `levelDef.inBounds` (the cabin aisle landmarks
`cabinRow14`/`cabinRow16` face into a seat row, so +1.5 m lands on the cushions), the landmark
itself is used, facing its yaw. The same rule is used by the R reset, PANIK's `gateOle`, the
checkpoint `retry()` teleport and `T.startMission()`.
`?mission=N` sets the index before this, so `?mission=3` boots straight into the cabin in cruise.
`index === MISSIONS.length` (game complete) → island, spawn `flamencoDeck`.

**Mission → level → first phase** (each flight mission's first stage carries
`startCue: { phase: [phase, { instant: true }] }` in its literal (§8), so retries and `?mission=N`
always start right):

| index | id | level | phase at start |
|---|---|---|---|
| 0 | gate | flight | `gate` |
| 1 | ombord | flight | `gate` (then takeoff → climb → cruise inside the mission) |
| 2 | juice | flight | `cruise` |
| 3 | sprit | flight | `cruise` |
| 4 | landning | flight | `cruise` (then approach → landing → landed inside the mission) |
| 5–12 | island missions | island | — |

### 4.5 HOMES format (src/content/flight.js + island.js; merged in content/index.js)

```js
HOMES = {
  gate:   { key: [landmark, dx, dz] | { seat: '14A' } | null, ... },
  flight: { ... },
  island: { ... },
};
// dx = metres to the landmark's left (local +X), dz = metres forward (Bigmouth convention).
// Optional 4th element (Phase 2): an absolute world yaw for the idle pose, e.g.
// ole: ['flamenco', 2.0, 1.0, 0] (under the pergola facing the pool; `flamenco` itself faces π).
// A giver placed at its mission's `at` still faces the landmark's yaw.
// Keys absent from a set are treated as null (hidden).
LEVEL_OUTFITS = { gate: { stig:'arlanda', ole:'arlanda', berra:'arlanda', angerud:'arlanda' },
                  flight: { stig:'kostym', ole:'flyg', berra:'flyg', robban:'flyg', angerud:'flyg', majsan:'flyg', siv:'flyg' },
                  island: { ole:'sol', berra:'sol', robban:'sol', angerud:'sol', majsan:'sol', siv:'sol', lasse:'sol' } };
// The player's island outfit is 'kostym' until the buss17 outro cue switches it to 'hawaii'
// (persisted in the save).
```

`placeNpcs(force)` (Phase 0 rewrite): iterate the **current** home set; for each NPC: hidden →
hide; `{seat}` → `cabin.seatCharacter` if not already seated there; array → Bigmouth logic
(giver to `cur.at` offset 0; `extra` to `cur.at` with home offsets). A giver whose home in the
current set is a plane seat (`ole` 14A for `juice`, `majsan` 16E for `landning`) **stays seated**:
`at` is where the player stands to talk to them (Phase 0a). Every NPC not in the set is
hidden. NPCs that are `busy` (mission-owned or seated) are skipped unless `force`. Any NPC that is
moved, hidden or re-seated is **first unseated** from whatever it sits in (car: `g.unseat(ch)`;
plane seat: `cabin.unseatCharacter(ch)`).

---

## 5. Level 1 "Flygresan" (world/cabin.js, WP-A1; §5.6 visuals in world/flightScenery.js, WP-A2)

### 5.1 Placement and frame

- `CABIN_X = 3000`. A `Frame(S, F, 3000, 0, 0)` (yaw 0): **local (lx, lz) = world (x − 3000, z)**.
- **The nose points +z.** Seated passengers face +z (yaw 0).
- **Port (left) side = +x local** (yaw convention: left of forward +z is +X). Seats A B C are on
  +x, D E F on −x. Doors are on the port side. Ole 14A is the port window, Stig 14B middle.
- Floor = the engine's infinite `CURB` plane (0.15): **no floor solid**. Altitude, takeoff, clouds
  and landing are purely visual (§5.6).
- Scale: interior 4.9 m wide vs the real DC-8-62's 3.51 m (**about 1.4×**) so 2.1 m toon adults fit.
- Two set pieces in the same frame: the **cabin** (always) and the **gate set** (Arlanda gate
  lounge + jet bridge + snowy apron; visible and solid **only in phase `gate`**).

### 5.2 Geometry and collision (all local coordinates; tops are absolute heights)

**Row positions.** Rows 1–12 and 14–24 (**no row 13**, true of the real Scanair DC-8 seat map):
`k = row <= 12 ? row - 1 : row - 2` (0..22), `rowZ(row) = 12.4 − 1.2·k`.
Examples: row 1 → 12.4, row 6 → 6.4, row 10 → 1.6, row 12 → −0.8, **row 14 → −2.0**,
row 16 → −4.4, row 22 → −11.6, row 24 → −14.0.

**Seat x (centre):** A +2.0, B +1.45, C +0.9 | aisle |x| < 0.6 (1.2 m) | D −0.9, E −1.45, F −2.0.
Seat object: `{ id: '14B', row: 14, letter: 'B', x: 3001.45, z: −2.22, y: 0.55, yaw: 0,
aisle: { x: 3000.25, z: −2.1 }, taken: null }` (seat z = rowZ − 0.22; `aisle` is the standing spot
used for **stand/unseat only**, x = ±0.25 on the seat's side; three seats share it). `taken` is
`null`, a character key, `'stig'`, or **`'bust'`** for seats filled by passenger busts (never
offered). Sitting down is chosen per seat, not per aisle spot (§5.10).

**Interior extents:** lx ∈ [−2.45, 2.45], lz ∈ [−19.0, 17.4].

| solid (`box(minX, minZ, maxX, maxZ, top, kind)`) | footprint (local) | top | kind | notes |
|---|---|---|---|---|
| left wall, aft part | x [2.45, 3.45], z [−19.0, 14.0] | 99 | `bound` | ≥ 1 m thick (camera samples, tunnelling) |
| left wall, fwd part | x [2.45, 3.45], z [15.4, 17.4] | 99 | `bound` | |
| **front door** (`cabin.doorBlock`) | x [2.45, 3.45], z [14.0, 15.4] | 99 | `door` | `dead = true` in phase `gate` (open to the jet bridge), alive otherwise |
| right wall | x [−3.45, −2.45], z [−19.0, 17.4] | 99 | `bound` | |
| cockpit wall | x [−3.45, 3.45], z [17.4, 18.4] | 99 | `bound` | door sign "BESÄTTNING" (visual) |
| rear wall | x [−3.45, 3.45], z [−20.0, −19.0] | 99 | `bound` | |
| seat back, per row and side | x [0.6, 2.45] (and [−2.45, −0.6]), z [rowZ−0.52, rowZ−0.40] | **1.25** | `seatback` | wall for people (step 0.45) and the trolley (car skip ≤ y+0.6) |
| seat cushion, per row and side | same x, z [rowZ−0.40, rowZ−0.05] | **0.55** | `cushion` | a step-up floor (0.15 + 0.45 ≥ 0.55): you can stand in a row |
| front galley counter (starboard) | x [−2.45, −0.7], z [13.6, 16.8] | 1.0 | `galley` | sign "FRÄMRE BYSSAN" |
| coat closet (port, fwd of door) | x [0.7, 2.45], z [15.6, 17.4] | 2.0 | `galley` | |
| rear toilet L | x [1.0, 2.45], z [−16.4, −14.9] | 99 | `toilet` | door faces the aisle; "TOALETT" + UPPTAGET lamp |
| rear toilet R | x [−2.45, −1.0], z [−16.4, −14.9] | 99 | `toilet` | |
| rear galley L / R | x [0.8, 2.45] / [−2.45, −0.8], z [−19.0, −16.6] | 1.0 | `galley` | sign "BAKRE BYSSAN"; the aisle stays open to z −19 |

- **Leg room**: cushion front (rowZ − 0.05) to the next-forward row's back (rowZ + 0.68) = 0.73 m
  of free floor plus the 0.35 m cushion you can step onto: you **can** step out of the aisle into
  any row with free seats to let the trolley pass (judge trap fixed: pitch 1.2 m, not 1.0).
- No breakable props in the cabin. Mission items are `Collectible`s.
- **Coins**: 24 fixed coins (`placeCoin`) in the aisle and galleys, placed by `cabin.placeCoins()`
  **after `initCoins`** (Phase 0 calls it in init order, §14.2). Budget: cabin ≤ 30 fixed coins.
  The aisle line runs every 1.8 m from z **9.8** to **−10.0** (12 coins); the rest are in the
  galleys (one at the front, (−1.2, 12.9); two at the rear) and the leg room of the dodge rows 3,
  8 (both sides), 15, 18 (both sides), 20 (both sides) and 23 (x ±1.0, rowZ + 0.31). (Phase 3 r2:
  the line went on to z −13.6, and the `row22Cam` cut showed the coin at z −11.8 between Berra and
  Robban; it and the one at −13.6 moved to rows 3 and 18. Then the `galleyCam` cut, looking
  forward along the aisle, showed the line's coin at z 11.6 and the front galley's at (−0.3, 14.2)
  and (0.3, 15.6); they moved to the other side of rows 8, 18 and 20 (behind both cut cameras, and
  more than the 3.4 m coin magnet from 14B, where the `panic` checks count coins).)

**Gate set** (only in phase `gate`; `cabin.setGateActive(on)` toggles `group.visible` and every
gate block's `dead`):

| solid | footprint (local) | top | kind |
|---|---|---|---|
| jet bridge walls | x [3.45, 14.0], z [12.7, 13.7] and [15.7, 16.7] | 99 | `gatewall` |
| lounge west wall (two parts, bridge gap z 13.7–15.7) | x [13.0, 14.0], z [0, 13.7] and [15.7, 30.0] | 99 | `gatewall` |
| lounge east wall | x [38.0, 39.0], z [0, 30.0] | 99 | `gatewall` |
| lounge north / south walls | z [−1.0, 0] and [30.0, 31.0], x [13.0, 39.0] | 99 | `gatewall` |
| security barriers (x-ray belt on top) | x [31.0, 35.0], z [0, 3.9] and [6.1, 10.0] | 1.1 | `counter` |
| landside pocket wall (forces you through the arch) | x [35.0, 38.0], z [10.0, 11.0] | 99 | `gatewall` |
| metal-detector arch posts | circles r 0.15 at (33.0, 3.85) and (33.0, 6.15) | 2.4 | `gatewall` |
| men's toilet walls (door gap z 24.4–26.0) | x [29.5, 30.5], z [22.0, 24.4] and [26.0, 30.0]; z [21.5, 22.5], x [30.0, 38.0] | 99 | `gatewall` |
| ladies' toilet (closed room, door drawn at z 17.6–19.2) | x [29.5, 30.5], z [14.0, 21.5]; z [13.5, 14.5], x [30.0, 38.0] | 99 | `gatewall` |
| gate desk | x [16.0, 17.2], z [18.5, 22.5] | 1.1 | `counter` |
| lounge chair rows (3) | x [19.0, 27.0], z [6.6, 7.4], [12.6, 13.4], [18.6, 19.4] | 0.95 | `bench` |
| men's-room cubicle (A1) | x [35.8, 38.0], z [27.9, 30.0] | 2.2 | `gatewall` |
| newsstand front / back (A1) | x [20, 24], z [26.8, 27.6] / z [29.3, 30.0] | 1.1 / 2.0 | `counter` |
| newsstand sides (A1) | x [19.9, 20.05] and [23.95, 24.1], z [26.7, 30.0] | 2.4 | `counter` |

Visuals (WP-A1): cut-away walls 2.6 m high, no roof; signs (`signMesh`): `ARLANDA UTRIKES` (facade),
`SÄKERHETSKONTROLL`, `GATE 8 · LAS PALMAS 09.40`, departures board `LAS PALMAS 09.40 · GATE 8 ·
I TID`, `HERRAR`, `DAMER`, poster `SUNTRIP – SOLEN VÄNTAR`, window wall at x 14 looking at the plane,
orange-and-wood 1976 terminal palette, brown carpet. Men's room: mirror, 3 basins (visual), a
cubicle (solid, top 2.2). Newsstand (A1) with a vendor bust. No landmark or HOMES spot is affected
by the A1 solids. The terminal facade box around the lounge is part of the gate group; A2's
`gateVisual` adds only the far apron and terminal backdrop. Lounge passengers: busts on ~30 % of
the chairs, none at the east end of the front row (x ≥ 26, z 6.6; Phase 3 r2: from the arch
two-shot's eye a face there filled the bottom-left corner). The wall clock right of the departures
board (x 30, y 2.0) has its ink rim behind the face and reads 9.05 (Phase 3 r2: the rim sat in
front and drew a black disc).

**Flight bounds** for `cabin.inside(x, z)`: the cabin interior rect; plus, in phase `gate`, the jet
bridge interior (x 3.45–14, z 13.7–15.7) and the lounge interior (x 14–38, z 0–30). Level-wide
extent for debug: lx [−3.45, 39], lz [−20, 31]. `cabin.inCabin(x, z)` = the cabin interior rect
only (used by `resetSpot`, `panicHome` and the camera clamp). Flight targets can be ~60 m apart
(lounge corner to the rear galley), so **the flight level never uses `routeAim`**: `updateMarkers`
aims straight at the target with `nodes = []` (`levelDef.routeAim === false`, Phase 0).

### 5.3 Camera and lighting

```js
export const CAM_CABIN = { pivotH: 1.5, dist: 6.5, pitchMin: 0.72, pitchMax: 1.1, pitch0: 0.9,
  noPull: true, fov: 58, cineSide: 2.0, cineUp: 3.6, clampZ: [-19.2, 17.2], clampPitch: 1.22 };
```

- **`clampPitch`** (A1): the most the z-clamp may steepen the pitch (camera.js default 1.5); past
  it the clamped camera looks further ahead instead of turning straight down.

- At pitch ≥ 0.72 the camera is ≥ 4.3 m above the pivot (~6 m above the floor), above every 2.6 m
  wall top: no wall can occlude, so the wall pull-in is skipped (`noPull`). Free yaw.
- **`clampZ`** (Phase 0, camera.js): while the focus is inside `cabin.inCabin()`, the eye's z is
  clamped to the cabin's z range and the pitch steepens to keep the distance (instead of the eye
  going aft into the tail cone/fin when the player stands at `galleyBack` or the rear toilets
  facing the nose). Not applied in the gate lounge (z up to 30). WP-A2 also keeps every airframe
  part higher than y 3 at least 7 m aft of the rear wall (fin root at z ≤ −26) and hides any
  airframe sub-mesh whose bounding box contains the camera.
- `cam.frame(a, b)` with a profile: `pos = mid + perp·min(d, cineSide) + up·cineUp`, look at head
  height — never the 4.5 m side two-shot. `cam.frameOne(target)` (new) frames one character the
  same way. **Exception (Phase 3): the open gate lounge.** `cam.openFloor` (main, every frame:
  phase `gate` and the focus at lx > 14, except the 3 m wide landside pocket lx > 34.5, z < 10.5;
  the spawn stands at lx 35.0)
  gives `frame`/`frameOne` the Bigmouth framing (side two-shot ≥ 4.5 m out at eye level with the
  `clearSide` flip, fov 50; `cine.open`): the 61°-down dollhouse showed the tops of hats in every
  mission-1 scene, and at the arch the hanging `SÄKERHETSKONTROLL` sign cut across Stig. In the
  pocket the side shot ended up across the security counters with the arch post or beam over a
  speaker, so the pocket keeps the dollhouse. The cabin and the jet bridge keep it too. **Fixed
  eye-level cuts (Phase 3 r2)** stage the mission scenes there that the dollhouse showed as hat
  tops, backs or heads under the door frame, each with its speakers placed for it (§5.5 `*Cam`
  landmarks, `{ at, dist: 0, height }`): the gate intro in the pocket (`queueCam`), the gate
  statistics (`statsCam`, which no longer depends on where the player arrived), the jet-bridge
  outro (`bridgeCam`), the ombord intro at the front door (`doorCam`) and the landning
  stewardess at the front galley (`galleyCam`); §8.1, §8.2, §8.5. Two
  speakers on one spot (< 0.3 m) are framed from in front of the first (both modes). In the
  dollhouse, two speakers facing the same way (|sum of facings| > 1.2) are framed from the side
  they face; **when that shared facing runs along the line between them (within 35°: one behind
  the other, as in the jet-bridge queue), from in front along it** (Phase 3 r2: the side vector
  there put the eye out over the bridge wall, with Majsan's crown behind Siv and Stig under the
  door frame).
- **The ceiling** is one `PlaneGeometry` at y 2.6 facing **down** (`FrontSide`, `outline: 0`,
  `cast: false`): invisible from above. **Hat racks** are drawn the same way: down-facing planes
  only (|x| ∈ [1.9, 2.45], y 2.1), invisible from the camera above. Even a narrow solid rack hides
  Ole in 14A from the default camera behind 14B (the sight line crosses y 2.1 at x ≈ 1.97). So are
  the **passenger service units** (one 0.36 × 0.1 m plane per row over the B/E seats, y 2.06,
  z rowZ − 0.3, merged into one mesh) and there is **no rail** along the rack lip: A1 drew both as
  outlined solids, and from the high camera the strip lay across every seated B/E forehead and the
  rail ran down the A/F faces (Phase 3). The only overhead solid is the 5 cm orange call button
  over 14B (the juice gag's "knappen ovanför", `call14`). The `cabin` scenario casts a 9 × 9 ray
  grid over each seated head (aisle view at row 14, the 14A/14B and 16E/16F two-shots) and fails
  if any sample is covered by cabin geometry over head height inside the walls. The row-number
  strip "…11 12 14 15…" is painted on the inner wall face above the windows, at y 1.7–1.9, on both
  sides.
- **Hanging signs turn to the camera** (Phase 3 r2; r1 turned only the galley signs between yaw 0
  and π): `FRÄMRE BYSSAN` (−1.6, y 2.4, z 13.5), `BAKRE BYSSAN` (0, y 2.3, z −18.45), the two
  `SPÄNN FAST BÄLTET / RÖKNING FÖRBJUDEN` signs (z 13.1 and −14.7) and the two `TOALETT` signs
  with their `UPPTAGET` lamps hanging under them (±0.8, y 2.42, z −15.65: 0.2 m out from the door
  wall, so the turning lamp, below the 2.3 m wall top, never enters it) turn about the vertical
  every rendered frame to face the render camera (`scene.onBeforeRender`, chained; the Euler order
  YXZ keeps each sign's up-tilt). A fixed sign was edge-on from the side cameras (a red strip
  across Stig in the ombord intro) and read upside down from beyond its top edge ("NASSYB ERKAB",
  "TTELAOT" from the rear-galley camera). The turn takes the sign's own facing or its reverse,
  whichever is nearer the camera, capped at ±90° from it; `BAKRE BYSSAN` (0.45 m off the rear
  wall) is capped at ±0.6 rad so it never swings into the wall. The wall signs (`BESÄTTNING`,
  `NÖDUTGÅNG`, `RÖKARE`) stay fixed.
- Flight level: `sun.castShadow = false`, hemisphere light raised (palette `hemiI`).
- **No global fog on the interior**: every flight palette keeps `fogNear ≥ 40` m (the interior is
  ≤ 12 m from the camera). The climb whiteout is faked with cloud puffs streaming past the plane
  and the window-pane colour, not with short fog.
- Markers: the Bang "!" over a seated giver sits at `ch.y + height + 0.9` (seated `ch.y` = cushion
  0.55); GuideArrow and Beacon are above the invisible ceiling and stay visible (the Beacon's
  arrow is hidden in the flight level, Phase 3 r3 below). Any marker
  shape (the giver's "!", the Beacon's arrow, the GuideArrow) hides while its centre is within 3 m
  of the camera (`main.camNear`): the z-clamped aisle eye is only 2.5 m above the seats, and the
  "!" over Ole in 14A filled a quarter of the frame. (Phase 2, both levels.) The
  giver's "!" also hides while the player is within 3 m of the giver (Phase 3, both levels): the
  steep cabin eye 4–5 m from it put a quarter-screen "!" over Stig at the cabin door, in 14B and at
  the gate, and within 3 m the talk prompt (3.4 m) names the giver anyway. **Phase 3 r2:** in the
  flight level the giver's "!" hides within **5.5 m** of the camera, measured from its un-bobbed
  spot (`y + height + 0.9`): the eye 3.1–5 m from a seated giver showed it as a huge clipped yellow
  blob in a bottom corner (player a few rows forward of him, or seated beside him), and the ±0.2 m
  bob flickered it across the 3 m line. Its **beam** (`Bang.fadeBeam`) fades out between 8 and 4 m
  of horizontal distance from the eye while the giver is inside the cabin (`cabin.inCabin`): that
  near, the 0.16-opacity cylinder lay as a yellow wedge over a third of the frame. Elsewhere the
  beams stay; in the 37 m tube the minimap "!" and the talk prompt find the giver. **Phase 3 r3,
  the objective's Beacon:** its beam (`Beacon.fadeBeam`, 0.22 opacity, r 1.6 m) fades the same way
  (8 → 4 m of horizontal eye distance while the target is inside the cabin; main's `nearFade`, one
  rule for both beams): at ombord's seat-dash start the beam of the first waypoint (`cabinRow1`,
  3.5 m from the eye) washed ~40 % of the frame yellow, and it stood as a column over 14B in juice
  (4.6–5.2 m) and over the aisle in landning (6.2 m). Its **arrow is hidden in the whole flight
  level**: bobbing 4.5 m up (made to be seen over cars and hedges), under the steep eye it was
  above the frame (beyond ~7 m, measured at every gate and cabin stage start) or, nearer, a yellow
  block clipped by the top edge over 10–25 % of the frame (90 000–227 000 px² at 1280×720; it was
  the "guide arrow block" the round-3 critics saw). The floor ring, the beam, the GuideArrow and the
  minimap star mark the spot. **The GuideArrow stays** (`camNear` 3 m only): it rides 1.5 m over
  his head, always 3.9–4.8 m from the flight level's eye, at the top centre under the objective
  card, and it is the only marker that shows the way to a target off screen; a 5.5 m rule would
  have hidden it everywhere in the flight level.

### 5.4 Seat map

| seat | who | notes |
|---|---|---|
| 6C | `angerud` | "flies regular"; complains about the food (bubbles) |
| 10A / 10B | `herrStorch` / `fruStorch` | |
| 14A | `ole` | window |
| **14B** | **`stig`** | the player's seat; call button above it (`call14`) |
| 14C | empty | |
| 16D / 16E / 16F | `jose` / `majsan` / `siv` | José hits on Siv across Majsan |
| 22C / 22D | `berra` / `robban` | rear (smoking rows 20–24) |
| every other seat | passenger **busts** (≈ 70 %) or empty | keep **C and D empty in rows 3, 8, 12, 15, 18, 20, 23** as dodge-in rows; never fill 14C |

Passenger busts: ~80 busts from `randomPed` with the 1979 palette (brown, orange, beige, mustard),
merged into **one** static mesh via `buildBustGeo(def)` (exported by models.js, Phase 0). Every
bust seat has `taken: 'bust'`.
Seated cast members are full `Character`s placed by `cabin.seatCharacter` (state `seated`, `busy`,
root placed by hand, `ch.x/y/z` set for bubbles, anim flag `planeSeat` = arms on armrests).

### 5.5 Landmarks (registered by `buildCabin`; world x = 3000 + lx)

| id | lx, lz | yaw | what / used by |
|---|---|---|---|
| `gateStart` | 36.5, 5.0 | −π/2 | player spawn at index 0 (landside of the arch) |
| `gateQueue` | 35.6, 6.6 | π/2 | mission 1 `at` (Ole in the security queue, facing the player coming from `gateStart`; `+1.5 m` along the yaw = (37.1, 6.6), clear of the barriers) |
| `gateArch` | 33.0, 5.0 | −π/2 | metal detector (interact) |
| `queueCam` | 36.1, 1.2 | 0 | cut camera (height 2.0) from the pocket's south end onto the gate intro: Ole and Stig side by side across the pocket (§8.1) |
| `statsCam` | 24.0, 6.8 | 0 | cut camera (height 1.9) onto Ole's statistics: Ole on his spot, Stig on the dash start (§8.1) |
| `gateOle` | 23.0, 11.8 | π | Ole's lounge spot (stats scene); panic home outside the cabin |
| `gateLounge` | 22.0, 16.0 | 0 | Berra/Robban/Sulan cluster; R-reset outside the cabin |
| `loungeCam` | 24.4, 13.8 | −0.6 | cut camera (height 1.9) from south-east of the cluster, just north of the middle bench row, looking north-north-west at the three in an arc with the gate desk and the Storchs behind them: the Stork joke and the bodega tip (§8.1 [7]; Phase 3 r3) |
| `gateDesk` | 18.0, 20.5 | −π/2 | gate desk |
| `herrtoaGang` | 27.9, 12.2 | 0 | past the east end of the middle bench row, where the corridor to the toilets starts: the gate dash's first guide waypoint (§8.1 [3]) |
| `herrtoaDoor` | 29.0, 25.2 | π/2 | men's room door (the dash's second guide waypoint; the queue's first, §8.1 [6]) |
| `herrtoa` | 33.5, 26.0 | π/2 | inside the men's room (mantra) |
| `damtoaDoor` | 28.8, 18.4 | π/2 | facing the closed ladies' door (bubble anchor; the queue's second guide waypoint, §8.1 [6]) |
| `bridge` | 8.0, 14.7 | −π/2 | jet bridge middle; the gate outro's spots are offsets from it |
| `bridgeMouth` | 15.5, 14.7 | −π/2 | in the lounge in front of the jet bridge's opening (the window wall's gap, z 13.7–15.7): the boarding guide's waypoint (§8.1 [8]; Phase 3 r3) |
| `bridgeCam` | 3.7, 14.7 | π/2 | cut camera (height 1.9) at the plane end of the bridge, looking up it to the `GATE 8` sign: the gate outro (§8.1) |
| `cabinDoor` | 0.8, 14.7 | π | inside the front door; mission 2 `at` (vardinna) |
| `doorCam` | −1.2, 14.2 | π/2 | cut camera (height 2.0) over the front galley's worktop, looking across at the open front door: the ombord intro (§8.2) |
| `galleyFront` | −0.2, 13.0 | π | front galley (aisle side) |
| `galleyCam` | 0, 8.6 | 0 | cut camera (height 3.6) over the aisle at row 4, looking forward to the stewardess at the front galley (§8.5); no coin in its view (§5.2) |
| `cockpitDoor` | 0, 16.6 | π | |
| `cabinRow1` | 0, 12.6 | π | aisle at row 1: ombord's first seat-dash guide waypoint (§8.2 [0]) |
| `cabinRow6` / `cabinRow10` | 0, 6.3 / 0, 1.5 | 0 | aisle spots |
| `cabinRow14` | 0.25, −2.1 | π/2 | aisle beside 14ABC facing the seats; mission 3 `at`; ombord's second seat-dash guide waypoint; landning's 14B dash guide waypoint (§8.5 [1]) |
| `cabinRow16` | −0.25, −4.5 | −π/2 | aisle beside 16DEF; mission 5 `at` |
| `cabinRow22` | 0, −11.7 | π/2 | |
| `row22Cam` | 0, −9.2 | π | cut camera onto 22C/D (Berra, Robban): `{ at: 'row22Cam', dist: 0, height: 3.6 }` stands in the aisle in front of row 22 and looks aft and down at their faces (§8.4, §8.5) |
| `cabinCentre` | 0, 0 | 0 | |
| `toiletBackL` / `toiletBackR` | 0.6, −15.6 / −0.6, −15.6 | ±π/2 | toilet doors (interactables) |
| `galleyBack` | 0, −17.6 | 0 | rear galley; mission 4 `at` |
| `trolleyPark` | 0, 16.2 | π | trolley rest (behind the curtain at z 13.2) |
| `call14` | 1.45, −2.2 (y 2.2) | 0 | call button above 14B |

### 5.6 Exterior and flight phases

**Groups** (WP-A2, `world/flightScenery.js`; judge trap fixed). `buildFlightScenery(scene)` →
`{ airframe, scenery, gateVisual, setPhaseVisual(name, t), setGateVisible(on), tick(dt) }`;
`cabin.js` (WP-A1) calls it and drives it from `setPhase`/`tick`/`setGateActive` (Phase 0 ships a
stub with this exact shape):
- `airframe` (static, child of the scene): fuselage belly half-cylinder (outer r ≈ 3.6) under the
  floor along the cabin; cut wall tops get a cream rim; nose cone z 18.4 → 25 with cockpit windows
  (has its own roof); tail cone z −20 → −28; fin 8 m tall with an orange sun disc `#F07A1E` and
  "SUNTRIP" both sides; low swept wings at y ≈ −0.8, root z −4 → +6, tips x ±21; four engine pods
  under the wings at x ±8 and ±14; livery white top, metal belly `#B8BEC6`, cheat line `#1B2F6B`,
  "SOL-VIKING" on the nose, "SE-SOL" on the rear fuselage. Built by
  `buildPlaneExterior(group, {gear})` (exported by `flightScenery.js`), which the airport block reuses.
- `scenery` (animated, child of the scene, centred on the cabin): subgroups `ground` (Arlanda
  apron disc r 600 snow-white at y 0.13 + terminal facade + snow heaps + parked tug; runway strip
  with edge lights), `deck` (one InstancedMesh of ~120 toon-white cloud puffs wrapping in a box
  x ±600, z ±700), `puffs` (~30 big puffs that stream past the windows in climb/approach),
  `sea` (disc r 1200 `#1c7fb8` at y −90), `island` (ochre/red domes + white specks, +z 900),
  `landingStrip` (Gando runway + palms + low terminal). **Only `scenery.rotation.x/z` tilts**
  (pitch, turbulence wobble); the airframe never moves.
- The town clouds `MAT._clouds` are hidden for the whole flight level. Snow: flightScenery's own
  point snow (A2; it keeps out of the cabin, bridge and lounge) in phase `gate`, fading out over
  `takeoff` t 4–7. (A1's earlier cabin `fx.snow` emitter was removed in Phase 2: one snow system.)
  Over the cabin (x ±3.6, z −27…18.6), the bridge and the lounge rects no flake falls at any
  height (Phase 3: flakes between the 2.6 m wall tops and the high camera landed, on screen, on the
  roofless rooms' floors; r2 extended it from the bridge and lounge to the cabin, where flakes
  drifted over the seated passengers during boarding and the takeoff roll). From an outside camera
  the column over the plane is free of snow too, next to the free block over the terminal.
- The snowfield's ~70 drift lumps (`drifts`) show in phase `gate` only. The runway tile carries its
  own low drifts between the plough banks and the forest (|x| 50–78, 10 per tile, none at the
  turn-off), which scroll with it (Phase 3: the field's lumps stood still while the runway scrolled
  past at up to 70 m/s).
- **Pitch** is owned by `flightScenery.tick` (`scenery.rotation.x`, **positive = nose up**, rewritten
  every frame as a function of phase and t); `cabin.js` writes only `rotation.z` (turbulence wobble).
- A2 additions: `PLANE_GROUND_Y = −4.65` (plane-local; the Arlanda apron/runway and the Gando strip
  sit there, so the plane stands on its gear and wings and belly show; A1's lounge reads as an upper
  floor over A2's pier storey; gate exterior outside the lounge walls stays ≤ y 2.6);
  `buildPlaneExterior(group, { gear = true, cutaway = false })` (default a closed DC-8 spanning z
  −36.6…28, x ±21; `grp.position.set(x, 0.15 − PLANE_GROUND_Y, z)` puts the wheels on island
  ground); the returned scenery object has a read-only `phaseT`; flightScenery chains
  `scene.onBeforeRender` (per-render camera checks), so anyone setting it later must chain it too.

`cabin.setPhase(name, { instant = false })` state machine. Lengths are seconds at timeScale 1.

| phase | length | palette (§13.3) | what moves | events (cabin-driven) |
|---|---|---|---|---|
| `gate` | until set | `gate` | static apron, snow | gate set active, door open, seatbelt off |
| `takeoff` | 12 | `gate` | runway scrolls −z accelerating 0 → 70 m/s; t 8–9.5 pitch → **+0.12 rad** (nose up); t 9 ground starts dropping | t 0: gate set off, door closed, drone 0.9 bright 1; t 0–10 fear source `takeoffRoll` +4/s |
| `climb` | 8 | `clouds` | puffs sweep past (dense whiteout), deck drops to y −25; pitch eases 0.12 → 0.05 | windows white; 3 bumps at t 1.5, 4, 6.5 (shake 0.3, fear +8 each) |
| `cruise` | open | `above` | deck at y −30…−12 scrolls −z 55 m/s; pitch eases 0.05 → 0 and the cruise puffs fade in over t 0–2 (no pop at the climb boundary) | random idle turbulence every 60–90 s **only when no mission is running** |
| `approach` | 14 | `descent` | deck rises past (2 s whiteout), then sea + island domes slide closer; pitch −0.03 (nose slightly down) | fear source +1/s; drone 0.7 |
| `landing` | 6 | `island` | `landingStrip` rises to y 0.13 under the plane | t 5: touchdown thud + shake 0.6 + fear +10; t 5.5: reverse thrust (drone bright 1 for 3 s) + fear +5 |
| `landed` | — | `island` | static runway, sea on the left, terminal | — |

**Palette blend** (Phase 3 r2): a phase change without `instant` (the chained boundaries and a
mission cue's `phase`) blends the sky, fog, light and window palette from what is on screen to the
new phase's over **1.5 s into `climb`** (under the whiteout puffs) and **2 s** otherwise (into
`cruise` it matches the cruise puffs' fade-in), smoothstep, in `cabin.tick` (`stepPalette`; colours
lerped in linear space, fog near/far and intensities linearly). `instant` (level switches,
`restoreAmbience`, checkpoint retries) and `cabin.applyPalette()` with no argument snap. Before,
takeoff → climb turned grey Arlanda white in one frame while the plane was still over the runway
(fog far 300 → 520 m popped a band of trees in), and climb → cruise turned white to deep blue with
the interior brightening in the same frame (RMSE between frames 0.1 s apart, outside camera:
0.21 → 0.10 and 0.15 → 0.03; the rest of the takeoff → climb change is the scenery's own).

Phases `takeoff → climb → cruise` and `approach → landing → landed` chain automatically unless the
phase was set with `hold: true` (`cabin.setPhase(name, { instant, hold })`): a held phase stops at
its end state until the next `setPhase` call (used by landning stage 3, §8.5).
`instant: true` jumps straight to the end state of that phase (no events). On a **chained** phase
(`takeoff`, `climb`, `approach`, `landing`) that means `phaseT = PHASE_LEN[name]`, so unless `hold`
is set the **next `tick` chains on** to the following phase (animated, from its start); to park at a
chained phase's end state use `{ instant: true, hold: true }`. A checkpoint retry re-applies cue
phases as `[name, { instant: true }]` and so **drops `hold`** (§9.4 item 3). `cabin.onPhase(fn)`
listeners get `(name)` on every change. The **DUNS** (gear-up thump) and every line of dialogue are
**not** cabin events: the mission timeline triggers them at matching times (§8, mission 2).

### 5.7 Turbulence and HÅLL I DIG (invented mechanic)

`cabin.turbulence(strength 0..1, secs, { warn = 1.5, delay = 0 } = {})`; a new turbulence replaces a
running one and keeps the sign lit through its delay. `cabin.stopTurbulence()` (Phase 2) ends any
turbulence at once (wobble, drone and belt hold reset); `restoreAmbience()` calls it after a failed
or aborted flight mission:
1. Warning: chime (`audio.chime()`), seatbelt sign on, banner `TURBULENS!` (cls `count`, 1.2 s),
   prompt `<b>Space</b> Håll i dig!` while standing. **While a mission stage runs** (Phase 3 r3)
   the warning is a toast, `hud.toast('TURBULENS!', 'alert')` (§11.4), not the banner: with the
   objective card up the banner stood 40 % down, over Stig and the aisle the sprit bottles roll in,
   for 1.2 s of the 13 s sweep (and over the juice carry and the landning approach); idle turbulence
   keeps the banner. The hold prompt **wins over the seat and toilet prompts** while the cabin is
   turbulent and he stands without holding on (only a giver's talk prompt comes first; E still uses
   the nearest interactable): the "E Sätt dig" of every free seat he passed replaced it in the
   sprit sweep and the juice carry.
2. For `secs` (× timeScale): `cam.shake = max(shake, 0.5·strength)` refreshed every 0.3 s;
   `scenery.rotation.z` wobbles ±0.03·strength; rattle `audio.noise(0.3, 0.15, 300)` every 0.4 s;
   drone +30 %; trolley jitters ±0.05 m in x.
3. **Jolts** every 0.8 s. Each jolt calls every `cabin.onJolt(fn)` listener with `{ strength }`
   (the `collect` roll motion subscribes and kicks its bottles ±1.5 m/s). Per jolt, for the player:
   - hidden: nothing;
   - seated: fear +4 (+1 instead while the mantra is held); the jolt **interrupts the mantra**
     (wind-up restarts, 0.6 s instead of 0.3 s), which gives seated turbulence a rhythm;
   - standing (any case below): the jolt also interrupts a held mantra;
   - standing and holding (`game.holding`): fear +1, tiny shove (0.4 m/s);
   - standing and not holding: fear +6, lateral shove 2.5 m/s; the **second** unheld jolt in a row
     knocks him down (`player.fling(side·2, 3, 0)` → `down`), fear +12, `cabin.stats.falls++`,
     `game.bumpedT = 0.4` (a carried item spills).
4. The sign switches off 3 s after the end (unless a mission set it). `setSeatbelt(on)` records what
   missions and phases want; `cabin.seatbelt` = that OR a running turbulence (until 3 s after it).

Scripted in missions 3, 4 and 5 (§8). Random idle turbulence (strength 0.3–0.6, 4–6 s) only in
`cruise` with no mission running.

### 5.8 The trolley (cabin traffic; AI-only Car)

```js
registerCarType('trolley', { name: 'Serveringsvagn', len: 0.85, wid: 0.45, bodyH: 0.95, cabinH: 0,
  wheelR: 0.06, maxSpeed: 1.6, accel: 3, grip: 16, steer: 0.35, mass: 80, hp: 999,
  color: 0xc8ccd2, tall: true, noWheels: true, noSpeedo: true, build: buildTrolley });
// buildTrolley(spec, color) -> { geo, glass: null }: steel box with drawers, top tray with cans and
// paper cups, push bar at the rear, tiny castors drawn into geo.
```

- Spawn `new Car('trolley', {x:3000, z:16.2, yaw:Math.PI})`, `place()`, `locked = true`,
  `noEnter = true`, `game.addCar(car)`. Never `traffic`.
- Mini-AI `car.ai = { update(dt, g) {...} }` (duck-typed; main calls it): target speed 1.1 m/s aft;
  a 3 s stop every 3 rows with `vardinna2` bubble "Juice, whisky?" [F*] (every stop; at row 6 Angerud's
  complaint instead) and a juice spill (`fx.spill`); throttle 0.6 below target,
  brake 0.5 above, steer 0, x damped kinematically to the aisle centre; at z < −15.5 `place()` back
  to `trolleyPark` and wait 6 s. `cabin.trolleyStopped` is true during stops and waits. The
  trolley **waits** while any non-player character (round-up targets, aisle walkers, luggage
  stowers) stands within 1.2 m ahead of it in the aisle (`vardinna`'s home is beside the aisle): only the player gets bowled
  over, NPCs are never shoved along by depenetration. A **downed or flung player** lying up to 2 m
  ahead is waited for too, plus 1.2 s of grace once he is up (no re-bowling a player who just got up).
- **Scripted moments freeze it** (Phase 3): while `game.inDialog` or `game.inCutaway`, or the
  runner is in `intro`, `outro` or `failed`, the trolley halts where it stands (`trolleyStopped`;
  no serving stop, bubble, bowling or wait countdown) and goes on afterwards. It bowled Stig over
  in the landning intro (+12 inside a cutscene) and called "Juice, whisky?" over scripted lines.
- `cabin.trolleyEnd(g)` → `{x, z}` = the trolley end (front or back face, 0.85 m from its centre)
  nearest the player; the juice interact anchors there, so a trolley that has already passed row 14
  is still reachable.
- **Pusher**: `vardinna2` Character glued 0.9 m behind (at z + 0.9), anim `push`; at a serving stop
  she turns to a seat row with anim `cupHeld` (Phase 3 r2: a paper cup held out to the row; `cupUp`
  served empty-handed, an arm raised over her head).
- **Bowling** (invented): if the trolley is moving, the player is standing `normal`, |x| < 0.75 and
  0 < (trolley.z − player.z) < 0.95 → `player.fling(0, 3.0, −2.6)`, fear +12, `vardinna2` bubble
  "Akta tårna!" [N], `cabin.stats.bowled++`, `game.bumpedT = 0.4`, trolley pauses 1.5 s; 2 s
  cooldown. Dodge by stepping into a row with free seats (cushions are walkable).
- `cabin.startTrolley()` / `cabin.stopTrolley()` (tests and missions); `stopTrolley()` halts it
  where it is and sets `trolleyStopped = true` until the next `startTrolley()`. Default: trolley runs in
  `cruise` from mission 3 on; parked at `trolleyPark` otherwise. A manual mode set by
  `startTrolley`/`stopTrolley` belongs to the current mission run (`game.missions.m`) and reverts to
  auto when that run ends (complete, fail or abort). `cabin._t.serving` is true during a stop.
- `cabin.parkTrolley()` (cue `trolley: 'park'`; Phase 3 r3): `stopTrolley()` **at `trolleyPark`**
  (the serving, wait and grace state cleared, the next run starts at row 3). The front galley is
  clear of every flight route and target (the door at z 14.7, `galleyFront` 13.0 r 1.6, the aisle
  from row 1 aft), so a stage that needs the aisle and must not have the trolley moving parks it
  instead of freezing it: frozen wherever an intro had caught it, mid-aisle it is a wall (the
  0.45 m trolley and the firm pusher fill the aisle; seat backs stop a detour through the rows).
  `transitionTo` parks it the same way. **Rule:** no mission stage uses `trolley: false`; a moving
  trolley (`true`, juice and sprit) is a designed, passing obstacle, never a permanent one.
- Fallback if the trolley misbehaves (P0 safety): `stopTrolley()` permanently and serve juice from
  the galley interactable; missions 3–4 still work.
- P2 only: player-driven trolley (needs hard speed cap, `noBoost`, `pushed` seat, ~10 car.js edits).

### 5.9 FLYGRÄDSLA (meter mode `panic`; config in `src/meters.js`)

```js
METERS.flygradsla = { mode: 'panic', label: 'FLYGRÄDSLA', cls: 'fear', hot: 70,
  decayIdle: 2, idleDelay: 4,
  panicBanner: ['PANIK!', 'Jag kan flyga… jag kan flyga…'],          // [F*]
  panicFailText: 'Stig-Helmer fick panik! Håll J: ”Jag kan flyga, jag är inte rädd.”',   // [N] · the mantra [F]
  panicFee: 50, panicResetTo: 40, flailSecs: 2.5 };
```

**Sources** (`game.shame.add(n)`; continuous ones as `add(rate·dt)`):

| source | amount | owner |
|---|---|---|
| standing (not seated, not hidden) while the seatbelt sign is lit | +1.5/s | cabin.tick |
| sprinting in the flight level | +1/s | cabin.tick |
| takeoff roll (phase `takeoff`, t < 10) | +4/s | cabin.tick |
| climb bumps | +8 ×3 | cabin |
| approach | +1/s | cabin.tick |
| touchdown / reverse thrust | +10 / +5 | cabin |
| turbulence jolt: unheld / fall / held / seated / seated with mantra | +6 / +12 / +1 / +4 / +1 | cabin |
| trolley bowls you over | +12 | cabin |
| **Ole's statistics bark** (player within 4 m of Ole, in free play (runner `idle`) or a stage with `oleBarks: true`, every 25 s; the timer runs only outside dialogue, and a due bark waits while Ole's own bubble is up (`game.saying(ole)`; Phase 3); line from `OLE_STATS`) | +8 | cabin.tick |
| scripted dialogue/timeline cues `{fear: n}` | n | missions |
| stage `fearRate` (e.g. the toilet dash) | +n/s | missions (goto option) |

**Relief** (`game.shame.relieve(n)`):

| relief | amount | owner |
|---|---|---|
| idle decay after `idleDelay` s without an add; **not in a scene** (a dialogue, cinematic or cut: both the decay and the delay's clock pause; Phase 3 r3: it ran while a line waited for E, so a player who read Ole's statistics started the gate dash at 57, 25 at a slow pace, where the instant harness reader started at 70) | −2/s | shame.js |
| seated, sign off / sign on | −5/s / −2/s, but **0** while the phase is `takeoff`, `climb` or `approach` | cabin.tick |
| **mantra held** (after 0.3 s wind-up; also when seated) | −25/s | main.js |
| toilet: "E Lås in dig" → hidden 4 s, flush | −50 once | cabin interactable |
| galley juice "E Ta en juice" (P1; `FEAR.juice` 30, `FEAR.juiceCooldown` 30 s) | −30 | cabin interactable |
| cue "Titta, solen!" | −30 | mission cue |

- **≥ 70 (hot)**: heartbeat (`audio.heartbeat()` every 0.8 s), music low-pass (cutoff
  `4000 → 600 Hz` as v goes 70 → 100), body class `fear-hot` (red vignette), meter `.hot`.
- **At 100: PANIK!** (`shame.panic()`): banner `PANIK!` / sub, white flash, `cam.shake = 1.2`,
  heartbeat burst; the player is frozen `flailSecs` in the `flail` pose; then
  `game.missions.onPanic()`:
  - returns **true** if a mission is running and the current stage has `panicFails: true` (or the
    def has `panicFails: true`) → the mission fails with `panicFailText`, which says how to avoid
    it (hold J; Phase 3: the only other J hint was a toast at the start);
  - else `game.onPanicIdle()`: fade, `vardinna` "walks him back": the player is placed at
    `levelDef.panicHome(g)` (sit 14B inside the cabin, else stand at `gateOle`), `game.pay(50)` is
    **not** used (no Ole bail-out): `coins -= min(coins, 50)` with toast `S.panicIdle` inside the
    cabin, `S.panicIdleGate` outside it (§11.5) [N]; `v = panicResetTo`. A running mission
    continues (timers keep running).
- **No pursuit ever happens in panic mode** (judge trap: `add()` must branch before
  `startPursuit`).
- **No PANIK in the middle of a scene**: while `game.inDialog`, a cinematic or a cut is active,
  `shame.add` (panic mode) clamps v at 95 and PANIK is deferred; when the dialogue/cinematic ends
  it fires if v is still ≥ 95. `shame.locked` (§7.2) is a pursuit-mode tool only: in panic mode
  the runner never sets it, and the `fear`/`relieve` cues call `shame.add(n, { force: true })` /
  `shame.relieve(n)`, which bypass `locked`.
- **Every jolt or `fear` cue interrupts a held mantra** (0.6 s wind-up again).
- `onPanicIdle()` also sets `game.bumpedT = 0.4`, so flailing spills a carried item (PANIK is never
  a free teleport to a `carry` goal).
- **Balance target**: a seated player who never holds J reaches ≈ 100 in the ombord takeoff
  (standing during the seat search + takeoff roll 40 + DUNS 15 + climb bumps 24 + Ole's barks),
  so the takeoff and the approach can really be lost (both are `panicFails`); a player who holds J
  through the bumps never panics. The story harness holds J in every brace/mantra stage.
  Measured in the Phase 2 balance pass (scenario `calibflight`, careful vs careless autopilots;
  numbers in §8 "Timers and difficulty"): careful players never panic in missions 1–5; careless
  ones panic in the gate dash (a dawdler), the ombord takeoff (no J) and the landning approach (J
  only once the shaking stops).

### 5.10 Cabin interactables (registered by cabin.js through `game.addInteractable`)

| id | where | prompt | effect |
|---|---|---|---|
| `seat:<id>` | standing, within 0.8 m of a free seat's **cushion centre** (`x`, `z`; not `taken`, not `'bust'`); among several, the best by facing (dot of the player's forward with the direction to the cushion) then distance; the seat named by the running stage (`stage.seat`: `sit`'s and `timeline`'s `seat`, `interact`'s `seat`, `mantra`'s `seated`; Phase 3 r3, the last two: from the aisle juice's 14B gag offered 14C) gets priority +10 and reaches 1.6 m, **2.0 m level with its row** (`|seat.z − p.z| < 0.6`; the interactable's `r` is 2.0, bestSeat limits each seat; Phase 3 r3 repair: from the D half of the aisle, x ≤ −0.2, 14B is 1.7–1.8 m off, E offered 14D, and "Res dig" from 14D put him back where it did again while the objective said "Sätt dig på 14B!"; now 14B from every aisle spot at row 14) | `<b>E</b> Sätt dig` | `game.sitPlayer(id)` |
| (implicit) | while seated, unless a `timeline` stage locks the seat (`lockSeat`) | `<b>E</b> Res dig` | `game.standPlayer()` |
| `blocker:<n>` | within 1.3 m of a luggage stower (ombord stage 1, §5.12) | `<b>E</b> Ursäkta!` | the stower steps into the dodge row beside him |
| `toilet:L`, `toilet:R` | `toiletBackL/R`, r 1.0, not in phase gate | `<b>E</b> Lås in dig` | hidden 4 s, relieve 50, `audio.flush()`, UPPTAGET lamp |
| `toilet:gate` | `herrtoa`, r 1.5, phase gate | `<b>E</b> Lås in dig` | same |
| `juice:front`, `juice:back` (P1) | galley counters: local (−0.45, 14.4) and (0, −17.4), r 1.1, priority −1 | `<b>E</b> Ta en juice` | relieve 30, `audio.pickup()`, 30 s cooldown |
| `call:14` | **registered by mission 3 only** (`interact` stage, `whileSeated: true`) | `<b>E</b> Tryck där uppe` | the juice gag |

### 5.11 HUD in the flight level

- Meter label **FLYGRÄDSLA**, cold-blue → red fill (`.fear`), heartbeat vignette at ≥ 70.
- Speedo hidden (`spec.noSpeedo`, and no player car anyway).
- Minimap: `cabin.mapSource(phase)` = `hud.buildMapFromBlocks(bounds, { scale: 12, bg: '#2a3442',
  kinds: { seatback: '#d2601f', cushion: '#e8925a', galley: '#9a9a92', toilet: '#6a7a8a',
  bound: '#e6dcc4', door: '#e6dcc4', gatewall: '#c8b89a', counter: '#9a9a92', bench: '#d2601f',
  bridge: '#c8b89a' } })`, minimap zoom 9 px/m, rim badge **FRAM** pointing +z. Gate-phase source
  includes the bridge and lounge (bounds lx −3.5…39, lz −20…31); other phases crop to the cabin.
- Big-map labels `MAP_LABELS.flight` (§11.6).
- P1 fallback if the plan is not ready: hide `#minimap-wrap`; M shows toast "Ingen karta ombord –
  följ pilen." [N].

### 5.12 Ambient cabin life (cabin.tick)

- Seated cast idle bubbles from `CHATTER_FLIGHT` when the player is within 6 m (12–20 s apart),
  in free play only (runner `idle`, no dialogue) and at most one every 5 s for the whole cabin
  (`cabin._chatCd`; a member due during the cooldown skips his turn). Phase 3: they fired in the
  1.6 s gap between UPPDRAG KLART and the outro and stacked 3–4 bubbles over its first line. The
  island's chatter (main.js) has the same free-play rule.
- **Bubbles over scripted lines** (Phase 3): `game.say` records when each speaker's bubble ends
  (`saying(t)`, `sayEnd`). The mantra's auto-bubble ("Jag kan flyga, jag är inte rädd" every
  2.5 s while J is held) goes straight to `hud.say` and waits while any other bubble is up (it
  covered the takeoff's timeline lines and replaced Stig's own "Annars…?!"); Ole's bark waits for
  his own bubble (§5.9); an aisle walker's "Ursäkta!" is not said in a dialogue.
- **"Ra-tara-tara…"** [F]: when `vardinna2` (with the trolley) passes rows 21–23, Berra and Robban
  bubble it (45 s cooldown). (In the film they say it at the stewardess; never triggered by Stig.)
- Angerud (6C) bubbles the "varm middag" complaint when the trolley stops at row 6 (once per
  cruise). `cabin.skipRowSixBark()` (Phase 3 r2) spends that once for a stage that plays the
  complaint itself (juice stage 2, §8.3): both used to play, and he opened with the line twice.
- 2–3 standing passengers ("aisle walkers", P1; `cabin.walkers`, keys `walker0..2`): shuffle between
  the galleys and a toilet; when the player comes within 1.5 m in the aisle they step into the
  nearest free row ("Ursäkta!" [N]). A seat's `taken` may be `'walkerN'` or `'blockerN'`;
  `unseatAll()` leaves walkers seated; `seatCharacter` evicts a seated walker but never a stower.
- Cabin, lounge, walker and stower passengers are `randomPed(r, { flight: true })` (no locals).
- 1980 smokers: in `cruise` with the sign off, a faint `fx.wisp` rises now and then over rows 20–24.
- **Luggage stowers** (P0, invented): `cabin.setAisleBlockers(on)` (cue `blockers: bool`) puts three
  static passengers (bust-style `Character`s from `randomPed`, anim `cupUp` = an arm up at the rack)
  in the aisle beside the dodge rows **3, 8 and 12**. They are solid; walking into one costs fear +3
  (2 s cooldown each) and a bubble "Vänta lite, jag ska bara…" [N]. E within 1.3 m ("Ursäkta!")
  makes him step into the C/D seats of his dodge row and stay there. `setAisleBlockers(false)`
  removes them; the runner's `cleanupMission` calls it in the flight level.
- PA chime + `kapten`/`pa` radio lines are mission content.

### 5.13 Handover to the island

Triggered by the runner after mission index 4 (`landning`) completes (outro done, `index` → 5,
`levelFor(5) === 'island' !== game.level`) → `await game.transitionTo('island')` (§4.4) before the
runner returns to `idle`. Mission 6 (`buss17`) giver `lasse` waits at `airport`.

---

## 6. The island: Nueva Estocolmo (WP-B base, WP-C1 hotels, WP-C2 centre, WP-D1 nature, WP-D2 coast)

Fictional SunTrip resort town on southern Gran Canaria, Christmas week 1979, modelled on 1970s
Playa del Inglés + San Agustín: whitewashed 5–8 storey apartment hotels with balcony rows, low
bungalows on red rock, half-finished concrete frames with cranes, a strip mall, a two-level nightlife
centre, the Maspalomas dunes and lighthouse, tomato fields inland, Gando airport in the NE.

### 6.1 Grid and compass

Engine constants unchanged: `P = 80, N = 7, HALF = 280, RHW = 5.5, SW = 3.5, LANE = 2.75,
CURB = 0.15, EDGE = 289, BOUND = 314`. Block (i, j) centre = `(−240 + 80i, −240 + 80j)`; block
interior is 62 × 62 m (local ±31). **North (−z) is inland** (mountains, fields, airport), **south
(+z) is the sea**. Right-hand traffic (Spain).

### 6.2 MAP (`layout.js`, `MAP[j][i]`; WP-B)

```
            i=0 (-240)  1 (-160)   2 (-80)    3 (0)      4 (80)     5 (160)    6 (240)
j=0 (-240)  fataga      tomat      grisfest   tomat      golf       bungalow   flygplats
j=1 (-160)  tomat       lagenhet   marknad    kyrka      lagenhet   bygge      dromplan
j=2  (-80)  bungalowR   kasbah     lagenhet   suntrip    cita       lagenhet   bungalowR
j=3    (0)  lagenhet    bungalowR  plaza      flamenco   bensin     guardia    lagenhet
j=4   (80)  dyner       lagenhet   bungalowR  lagenhet   lagenhet   bungalowR  lagenhet
j=5  (160)  dyner       bungalowR  lagenhet   bungalowR  lagenhet   lagenhet   bungalowR
j=6  (240)  fyren       playa      playa      playa      playa      hamn       playa
```

- `bungalowR` = residential bungalow block (6 lots), `lagenhet` = residential apartment-hotel block
  (WP-B, §6.5). `bungalow` (5,0) is **Angerud's show bungalow plot** (a special block, WP-D1).
- **Hotel Flamenco is at the origin (3,3)**: home base, every drive starts at the centre.
  **Pepes Bodega** is on Flamenco's back (north) side, facing the road towards Hotel SunTrip (3,2):
  in plain view all game, noticed only on Christmas Eve.
- Unknown type strings build an empty slab (engine behaviour), so stubs never crash.

### 6.3 Block builders, landmarks, named cars

Builder signature: `fn(f, W, ctx)` with `f` a `Frame` at the block centre (yaw 0, local ±31,
local = world offset), `W = 62`, `ctx = { i, j, scene, rnd }`. Exported per file and merged in
`world/blocks/index.js` (Phase 0): `BLOCK_BUILDERS = { type: fn }`.

**Landmarks** (canonical table `src/world/landmarks-island.js`, Phase 0): Phase 0 registers every
island landmark below from this table **before** the block builders run, so missions and tests work
on stub blocks. A builder may override one of **its own block's** landmarks with `f.mark(name, lx,
lz, ly, y)` if its geometry needs it; it must stay in the same block, on a walkable ground-level
spot, not inside a solid, and the change goes in the hand-off report. Yaw = the direction a person
standing there faces. `y` (optional) = absolute height for collectible spots on roofs.

| block (i,j) | type → builder (owner, file) | content | landmarks: `id` (lx, lz, yaw[, y]) | named / parked cars |
|---|---|---|---|---|
| (3,3) | `flamenco` → `hotelFlamenco` (C1, hotels.js) | 7-storey white slab x [−26, 26], z [−27, −14] with balcony rows, terracotta accents, `HOTEL FLAMENCO` roof sign; open reception porch (canopy, desk, plastic Christmas tree `julgran` prop, `RECEPCIÓN`; Phase 3 r2: `HOTEL FLAMENCO · RECEPCIÓN` stands on a terracotta panel above the pergola's fascia, where it no longer fills the top of the chase frame, and the garland runs across the fascia's face) at the slab's south face; ground-floor room patios along the south face (Stig & Ole's room west, room 113 east) with a visible 1st-floor balcony above 113; terracotta piers at the bay lines, solid (Phase 3 r2); pool deck south with a **walkable shallow pool** (flat blue slab at CURB+0.02 + `box(..., CURB, 'water')`, sign "TRE METER DJUPT I ENA ÄNDEN, / EN METER I DEN ANDRA. / BARNVÄNLIG!" (three lines) [F*] (the bungalow seller's line, relocated)); poolbar with straw parasols (`BAR PISCINA · SVENSKT KAFFE`); the julafton party `julgran` on the pool deck at (2.2, 16), in the party and sunset-duet shots (Phase 3); room numbers: a closed room's centred above its own glass door, an open room's (107, 113) on its right-hand pier (Phase 3); parking lot on the west; the parking signs here and at SunTrip's lot are a blue `P` plate over a name strip (`HOTEL FLAMENCO`, `SUNTRIP`) on a post that stops under them (Phase 3 r2: one two-line plate had shrunk the P to the name's size, and the post ran through both faces); **PEPES BODEGA**: small whitewashed annex x [4, 12], z [−31, −27] on the north side with a green door, barrels, sign `PEPES BODEGA · VINOS · RON` facing north (`worldHooks.bodegaLit(on)` lights it after julafton) | `flamenco` (−4, −8, π) (faces the hotel, so the views/cutaway camera stands on the pool deck; Phase 2) · `flamencoRecepcion` (2, −10, 0) · `flamencoPatio` (−18, −11, 0) · `rum113` (18, −11, 0) · `flamencoBalcony` (18, −8, π) · `flamencoPool` (−3, 18, π) · cut anchors (Phase 3; a cut stands `dist` m behind one, looking the way it faces): `rum107Cam` (−18, −11, π) = `flamencoPatio` turned round (looks into room 107), `recepcionCam` (2, −10, π) = `flamencoRecepcion` turned round (the desk from the porch front) · `flamencoDeck` (−4, −2.5, 0) (the island spawn: approachSpot puts the player on the pool deck at (−4, −1) facing the hotel, the chase camera over the pool rather than under the pergola slats; Phase 2) · `flamencoBar` (16, 12, −π/2) · `flamencoDrive` (−26, 22, π) · `flamencoBack` (−6, −33.5, 0) · `bodega` (8, −33.5, 0) · `fena_flamenco` (−3, 7, 0, 0.35) | `hyrbil` (sedan `0xf4f4f0`) at `flamencoDrive` — default `getInCar` car and test car |
| (3,2) | `suntrip` → `hotelSunTrip` (C1, hotels.js) | lower U-shaped hotel on red rock; welcome **stage** with SunTrip sun backdrop (red text on yellow sun), accordion/conga props; pool; **friskotek lawn**; SunTrip office porch on the south side facing Flamenco's back; posters `GRISFEST TORSDAG · 800 PTA`, `FRISKOTEKET 9.30`; the free-standing `FRISKOTEKET / VARJE MORGON 9.30` board on the lawn's west edge is solid (Phase 3 r3: only its posts were, so he walked through it and the chase eye stood behind it) | `suntrip` (−14, 24, π) (faces the office porch; Phase 2) · `scen` (0, −14, 0) · `friskotek` (−10, 8, 0) · `suntripPool` (14, 4, π) · `suntripLot` (24, 22, π) · `fena_suntrip` (14, 8, 0, 0.35) | — |
| (1,2) | `kasbah` → `kasbah` (C2, centre.js) | **Centro La Medina** (fictional; internal id `kasbah`): two-level nightlife courtyard centre: arcade, stairs (ramp) to a roof terrace (top ≈ 6.0) with a balustrade above the bottom three steps and a sloped wall collider along it (Phase 3: the way on is over those three steps), neon signs `CENTRO LA MEDINA`, `VIKING BAR` (horned helmet), `TONGA TONGA` (mirror ball), `BAR SVENSKA · SMÖRGÅSAR` | `kasbah` (0, 22, π) · `vikingbar` (−16, 18, π) · `tongatonga` (14, 18, π) · `tongaLot` (20, 27, π) · `tongaSlump` (16.3, 17.4, 0.5) (where Berra slumps after Tonga Tonga and is picked up, at the right of the group in the street shot; Phase 3 r3) · `pryl_poolpen` (8, −6, 0, 7.2) | — |
| (4,2) | `cita` → `cita` (C2, centre.js) | **Centro Nórdico** (fictional; internal id `cita`) strip mall, sign `CENTRO NÓRDICO`: `SUPERMERCADO`, `FERRETERÍA`, `FARMACIA`, `ESTANCO`, `TELÉFONOS · HYTT 1·2·3`, `SOUVENIRS`, `SVENSKT KAFFE`, `CAMBIO · 1 KR = 17 PTA` (Phase 3: the north shop row and its canopy fit the courtyard between the wings, x ±11; `SOUVENIRS · REGALOS` and `FARMACIA` with its green cross sit on the wings' courtyard faces) | `cita` (0, 22, π) · `supermercado` (−18, 18, π) · `ferreteria` (18, 18, π) · `telefon` (0, 8, π) | — |
| (2,3) | `plaza` → `plaza` (C2, centre.js) | palms, fountain (shallow walkable pool), restaurant terraces; the north row's arcade (12 arches), shops `CAFETERÍA EL SOL` · `HELADERÍA LA PALMERA` · `CORREOS · TELÉGRAFOS` · `BANCO · CAMBIO` · `PELUQUERÍA` (Phase 3 r3: each name on a 3.5 × 0.8 m board on the arcade's front above its arch's crown (4.09), y 4.1–4.9, two lines where needed; on the shop wall at 3.62 the 5.6–6.6 m signs hung behind the 3.93 m arches, which showed only their middle third) and the arcade café tables keep to x [−19, 29], clear of the west row (x [−29, −19]) that stands on the north row's west end (Phase 3 r2: two arches, the café sign and two tables were inside it); **CASA LOLA** (`CASA LOLA · COMIDA CANARIA`, fictional; internal id `grillpaco`) terrace on the SE corner (Phase 3 r2: the bougainvillea along its eave sits above the pergola's camera cap, west of the name board; Phase 3 r3: the string lights hang from the cross beams' underside (3.08) with a 0.15 sag, the lowest bulb at 2.72, and the pergola's camera ceiling is under 2.72: capped at 2.6 under lights sagging to 2.44, a bulb sat over his head) | `plaza` (0, 6.8, π) (south of the fountain rim, facing it: the fountain column stands at (0, 0); Phase 2) · `grillpaco` (20, 22, π) · `grillpacoMamma` (25, 24, π) · `grillpacoCurb` world (−60, 36, −π/2) (westbound kerb of the z = 40 road, the `follow` endpoint) · `fena_plaza` (0, 0, 0, 0.35) | — |
| (2,1) | `marknad` → `marknad` (C2, centre.js) | rows of striped stall awnings (some `bounce` awnings as climb pads), souvenir stand with painted donkeys `BURROS 500 PTA`, postcard racks, plastic giraffes; the `MERCADILLO · MARKNAD` board on two legs over the south path hangs at 3.85–4.95, above the chase eye (Phase 3 r3: at 2.35–3.45 it covered him walking in from the south road) | `marknad` (0, 22, π) · `asnestand` (6, 2, π) · `pryl_kalkylator` (−12, −8, 0, 3.4) (on an awning roof) | — |
| (3,1) | `kyrka` → `kyrka` (C2, centre.js) | **Templo Ecuménico**: white rationalist church (flat planes, bell slab), palm plaza, crèche, small fountain; sign `ES UNA IGLESIA` / `DET ÄR EN KYRKA.` [F*] (the sisters' language record, relocated; uppercase since Phase 3 r2, §1.3) | `kyrka` (0, 18, π) | — |
| (4,3) | `bensin` → `bensin` (C2, centre.js) | gas station: canopy, `GASOLINA` (no brand), prices in pesetas, kiosk; `gaspump` props explode | `bensin` (0, 16, π) | — |
| (5,3) | `guardia` → `cuartel` (C2, centre.js) | ochre barracks, red-yellow-red flag mast beside the path at x 4.6 (Phase 3: off the axis to the `CASA CUARTEL` plaque), `CASA CUARTEL`; two parked green Land Rovers | `guardia` (0, 20, π) | `guardia1`, `guardia2` (type `guardia`, locked) |
| (1,0), (3,0), (0,1) | `tomat` → `tomatfalt` (D1, nature.js) | rows of low tomato bushes (one merged mesh, walls a car drives through: no solids, or tops ≤ 0.6), packing shed `TOMATES · EXPORTACIÓN` / `EMPAQUETADO`, `tomatlada` props, dirt tracks | on (0,1): `vischan` (6, 24, π) · cut anchor `vischanCam` (5.7, 22.7, −0.14) (on the gravel track north of the vischan scene, looking back south at the road and the `CAMINO SIN ASFALTAR` sign; Phase 3 r2) · `eslovVag` (27.5, 24, 0) (the rollerskier on the Eslöv lane, 6 m up from the z −120 road and facing it; Phase 3 r2, was (28, 4, −π/2) mid-lane, 33 m off the vischan drive) — on (3,0): `packhus` (0, 10, π) | — |
| (2,0) | `grisfest` → `grisgard` (D1, nature.js) | farm: white barn (roof top ≈ 5), pergola deck with long tables under string lights, spit-roast pig, bandstand, dance-floor platform (deck top 0.4), piglet pen, gate on the **south** road; **12 `tallrikar` prop stacks** on the tables (smash stage; `placeProp(..., baseY = table top)`, §14.7) | `grisfest` (0, 26, π) · `grisfestGate` world (−80, −204, π/2) (on the south road at the farm gate, the `follow` endpoint) · `dansgolv` (0, 0, 0) · `pryl_pung` (−18, −14, 0, 5.4) | — |
| (0,0) | `fataga` → `fataga` (D1, nature.js) | white village houses, tile roofs, narrow lanes, date palms, small church, embroidered tablecloths on lines (`MANTELES · DUKAR`), sheepfold (fence solids, gap gate); six ochre crags along the north edge, solid along their length (Phase 3 r3: rock()'s 1 m circle plus a box 0.85·sx × 0.53·sz on the long axis, the mesh's widest section; the circle alone let the player and the chase eye 2–3 m into the rock, also in the fold's back under the shelter) | `fataga` (0, 18, π) · `fatagaBus` world (−240, −204, −π/2) (westbound kerb of the z = −200 road, the `follow` endpoint) · `fatagaFold` (−18, −12, 0) · `fatagaDukar` (8, 4, π) · cut anchor `dukarCam` (8, 4, 0) = `fatagaDukar` turned round (the stall from the square; Phase 3) · `pryl_kniv` (0, 0, 0, 1.2) | — |
| (4,0) | `golf` → `golf` (D1, nature.js) | fairway, bunkers (sand slabs), **pond** (`water` circle + flat blue), flag 18, small clubhouse `CAMPO DE GOLF` | `golf` (0, 22, π) · `fena_golf` (−10, −6, 0, 0.35) | — |
| (5,0) | `bungalow` → `bungalowTomt` (D1, nature.js) | Angerud's show bungalow: one-storey white cube, pool, plot fence, `SE VENDE · BUNGALOW · 4 RUM OCH KÖK` | `bungalow` (0, 22, π) · `fena_bungalow` (6, −4, 0, 0.35) | — |
| (5,1) | `bygge` → `bygge` (D1, nature.js) | half-built hotel frame, crane, girder deck with ramp (Bigmouth construction reworked), `PRÓXIMAMENTE · HOTEL NUEVA ESTOCOLMO II`, cones/barrels; the storeys under the 2nd- and 3rd-floor slabs are closed (dark core, brick infill on the faces the floor below walks along), since their colliders are solid from the ground (Phase 3) | `bygge` (0, 22, π) · `pryl_klocka` (6, −6, 0, 7.6) | — |
| (6,1) | `dromplan` → `dromplan` (D2, coast.js) | **the old propeller "drömplanet"**: faded red 4-engine prop plane (DC-7-like) on a dirt lot by the road, wing reachable via a crate ramp, windsock, sign `AERÓDROMO` | `dromplan` (0, 20, π) · `pryl_kamera` (−4, −2, 0, 3.6) (on the wing) | — |
| (6,0) | `flygplats` → `gando` (D2, coast.js) | low terminal with open arrivals canopy `LLEGADAS · ANKOMST`, baggage carousel (animated ring of suitcases), `OBJETOS PERDIDOS · HITTEGODS` desk with a wall of suitcase silhouettes, bus bay `BUSS 17`; **the parked DC-8** (`buildPlaneExterior`) **outside the bound wall at (240, −335)** — WP-B clears the tree ring **and the hills** in that sector (§6.4) | `airport` (0, 22, π) · `hittegods` (−14, 6, 0) · `busBay` (16, 24, −π/2) · `bagageband` (6, 11, π) (south of the carousel, facing it, so the views camera stands on the forecourt; Phase 3) | `buss17` (bus, livery `suntrip`) at `busBay`; `taxiAirport` (taxi, locked) |
| (0,4), (0,5) | `dyner` → `dyner` (D1, nature.js) | large sand dunes (ramps), palm grove, lagoon pond; behind them, beyond the west bound, a row of big visual-only dunes from town.js (§6.4, Phase 3 r2) | `dyner` (0, 0, π − 0.4) on (0,4) (faces the arch, so the views camera stands on the sand south of it, clear of the boardwalk palms; Phase 3) | — |
| (0,6) | `fyren` → `fyren` (D2, coast.js) | **Faro de Maspalomas**: ~55 m grey-blue stone tower (tallest landmark, visible from everywhere), keeper's house (roof top ≈ 4.0, reachable by a dune ramp) | `fyren` (0, 10, π) (coin arc on the keeper's-house roof) | — |
| (1..4,6) | `playa` → `playa` (D2, coast.js) | sand, sunbed rows (`solstol`), parasols, `HELADOS` kiosk, lifeguard tower, pedal boats on the sand, towels on sunbeds | `playa` on (3,6): (0, 10, 0) · `fena_hav` world (0, 304) (sea shallows, y 0.35) | — |
| (5,6) | `hamn` → `hamn` (D2, coast.js) | small marina: walkable shallow basin (`water` box), pier (deck top 0.55), moored boats | `hamn` (0, 0, π) · `fena_hamn` (−8, 10, 0, 0.35) · `pryl_glasogon` (12, 28, 0, 1.2) (pier end) | — |

**Rio end card** (WP-B, `world/rio.js`, P1): `buildRioCard(scene)` at **x = −3000, z = 0**: water
plane `#1c7fb8` r 400, a white motor yacht deck (top 0.55 solid), Sugarloaf cone, a strip of
Copacabana beach with palms, a small orchestra of busts (five on the wheelhouse roof in one row across the end card's view, 0.7 m apart, left to right guitar, drum, trumpet, maracas held before the chest, accordion; Phase 3 r2), sunset palette. Landmarks `rioBoat`
(−3000, 0, 0) and `rioCam` (−3000 + 9, 6, yaw toward the boat). Used only by the julafton epilogue.

### 6.4 Edges, sea, set dressing (WP-B, town.js)

- `streets()`: asphalt and sidewalks stay; road centre dashes **white**; the grass ring becomes
  ochre volcanic sand `#c9a26b`; lamps become Spanish double-arm street lamps; sidewalk furniture
  pattern uses `papelera`, `vykort`, `correos` props (no US hydrants/newsboxes).
- `outskirts()`:
  - **North and east**: red-ochre mountain domes ("Monte Rojo", `#a5532f` / `#c27a45`), cardón cacti
    and agaves instead of trees (circle colliders as before).
  - **West**: sand dunes and palms. Opposite the dyner blocks (Phase 3 r2): two rows of big
    hip-roof dunes (`duneGeo` from nature.js, crests 7.5–17 m, centres z 40…256, the front row's lee base
    at x ≤ −318, the back row's crest at x ≈ −410), visual only (no colliders), crests running
    north–south with their slip faces (the dyner lee tone `0xd4ac70`) towards the town, so they
    read from the boardwalk and the west road; the drivable dunes stop at 2.6 m and the rounded
    outer dunes fade into the fog. The outer dunes and palms keep out of x > −480, z 10…300.
  - **South**: sand strip z 289 → 300, then the **sea plane** (`MAT.water` retinted `#1c7fb8`,
    y **0.17**, i.e. 2 cm above CURB, so walking/driving from z 300 to the bound wall at 314 reads
    as wading) out to z 1150, x ±1150 (§4.1: nothing island-side beyond 1150). The bound wall at
    z 314 stays. WP-B detail: the `MAT.water` plane starts at z 330; z 300–330 is a vertex-coloured
    foam line plus two-tone shallows at the same y 0.17 (no overlaps); beach z 289–300. Sea decor
    beyond the wall belongs to D2 at x −40…40 and 120…200 (raft, buoy line z 318, pedal boats,
    moored boats z 324–338); B's own sea decor keeps clear of those.
  - **NE sector** around (240, −335): the parked DC-8 sits there, inside today's hill ring (the
    hill at ≈ (265, −364) would bury it ~20 m deep). No hills or domes within **100 m** of
    (240, −335), and nothing taller than 1 m (trees, cacti, rocks) within **60 m**. Phase 0 cuts
    this gap in the existing hills and trees; WP-B keeps it in the Monte Rojo rework. The tree band
    also skips the whole Gando apron (x 172…308, z −388…−290; its corners are up to 82 m out).
  - Welcome sign at the west entrance: `BIENVENIDOS A NUEVA ESTOCOLMO · VÄLKOMMEN!` The entrance
    road stub (z −40, asphalt at CURB like the collision ground there) runs from the perimeter
    road's edge across the outer sidewalk ring, which is cut for it (Phase 3).
  - Road banners `GOD JUL · FELIZ NAVIDAD` over 3 roads (the banner at 7.8–9.2 m, Phase 3 r2: at
    5.6–7.1 m the bus chase eye, ≈ 7 m, passed through it); tinsel spirals on some palm trunks.
- Shallow pools everywhere are flat blue slabs + `box(..., CURB, 'water')` (a floor). Sunken pools
  are impossible (no holes in collision). `hud.buildBaseMap` draws BOX `water` blue.

### 6.5 Residential blocks (WP-B)

`residential()` and its seeded RNG stay; `house()` is replaced by two styles:
- `bungalowR` lots: one-storey whitewashed cube (solid top 99) with a flat or terracotta roof,
  white garden wall (`mur` props), sometimes a small shallow pool, a bougainvillea bush (magenta
  `#c2307a`), `butano` bottles by the door; ~1 in 8 lots keeps a trampoline (`bounce`) as a hotel
  "studsmatta".
- `lagenhet` lots: 2 of the 3 lots per side become a 4–7 storey apartment-hotel slab (solid top 99)
  with balcony stripes and coloured awnings and towels; the third is a **half-finished concrete
  frame** (ramps, girder deck) or a pool courtyard. One sign per hotel from a pool of invented
  names (never the real 1960s complexes of this coast: Las Olas, Los Caracoles, Las Arenas, Las
  Brisas): `HOTEL LAS GAVIOTAS`, `APARTAMENTOS SOL`, `BUNGALOWS LOS CACTUS`, `APARTAMENTOS VIENTO
  SUR`, `HOTEL MAR AZUL`, `HOTEL ATLÁNTICO`, `APARTAMENTOS SOL DE INVIERNO` (Phase 3: was
  `APARTAMENTOS TAMARINDO`, too close to the real 1974 Hotel Tamarindos in San Agustín).
- Ped loops: `addPedLoops()` unchanged (one loop per block).

### 6.6 Vehicles (`CAR_TYPES`, car.js; WP-E). Physics numbers unchanged unless listed.

**Player-car boost ×1.2** (binding user decision 2026-10-04): `export const PLAYER_BOOST = 1.2` in
car.js; `Car.step` uses `boost = game && game.playerCar === this ? PLAYER_BOOST : 1` (top speed and
pull ×1.2, reverse and brake impulses ×1.2, drag /1.2). Bigmouth's ×2 was a debugging speed-up;
`notes/engine-actors.md` §0 item 2 still describes that old value. Every drive timer is calibrated
against ×1.2 (§8 "Timers and difficulty").

| key | speedo name | base / flags | colour | where |
|---|---|---|---|---|
| `sedan` | Sedan | as Bigmouth | random 1979 palette | traffic ×2, `hyrbil` |
| `hatch` | Småbil | as Bigmouth | random | traffic ×4 (most common), José's car |
| `wagon` | Kombi | **no `wood`** | random | traffic ×1 |
| `van` | Skåpbil | `tall` | white/beige | traffic ×1 |
| `pickup` | Flakbil | `bed` | random | traffic ×1 |
| `bus` | SunTrip-buss | `bus`, new `livery: 'suntrip'` (white, orange/yellow stripe + sun, "17" on the front; **no school stop sign**) | `0xf4f4f0` | `buss17`, night bus, excursion bus |
| `guagua` | Guagua | `bus` + `livery: 'guagua'` | green `0x2f8a4a` | traffic, at most one bus in traffic |
| `icecream` | Glassbil | `icecream`, sign `HELADOS` | `0xfafafa` | traffic, rare |
| `taxi` | Taxi | sedan + flag `taxi` (cream body, roof `TAXI` box with a green LIBRE lamp) | `0xe8dcb8` | traffic ×1, `taxiAirport` |
| `guardia` | Guardia Civil | new: `tall`, len 4.2, wid 1.9, bodyH 1.45, cabinH 0, wheelR 0.4, maxSpeed 30, accel 12, grip 9, steer .58, mass 2000, hp 160; flag `guardia` (white roof, blue lamp, white door band, spare wheel on the bonnet) | `0x2e5e3e` | pursuit, `guardia1/2` parked |
| `grisbil` | Grisbilen | pickup + flag `pigs` (slatted rack + 3 pink pig blobs: one at −0.15 L, the back two across the bed snout to snout at −0.41/−0.425 L, scale 0.72, wholly inside the rack — Phase 3 r2, they faced aft and their snouts stuck ~0.2 m out over the tailgate; the bed-rider slots at −0.3 L stay free), maxSpeed 34, accel 14 | rust `0xa8442a` | bodega mission, unlock |
| `trolley` | Serveringsvagn | registered by cabin.js (§5.8) | `0xc8ccd2` | cabin only |

Removed: `hearse`, `muscle` (their geometry branches may stay as dead code). Traffic mix (main.js):
`['hatch','hatch','hatch','hatch','sedan','sedan','wagon','van','taxi','pickup','guagua','icecream']`
with ≤ 1 bus. Busts in traffic use `randomPed` (tourists and locals). Number plates (optional P2):
`GC-1234-A` white with black letters.

**AI buses** (Phase 2): `BUS.aiSteer = 0.9` is the steering limit whenever the bus is not the
player's car (the night bus's `oppSpec` steer matches it); the player's bus keeps steer 0.52.

**Occupants** (Phase 2; replaces Bigmouth's heads through the roof): `car.seatY()` = wheelR·0.95 +
0.2 for ordinary cars (sedan, hatch, wagon, taxi, pickup, grisbil: people sit low, the opaque body
sides hide the legs), + 0.36 for the cab of `van`/`icecream`/`guardia`, + 0.55 for buses (the bus
floor and seat backs sit under it, so the heads fill the window band: sill 1.595, roof underside
2.455); `car.roofY()` = the roof underside − 0.08 (wheelR·0.95 + bodyH (+ cabinH for open-cabin cars),
− 0.22 for a bus's roof slab). A driver bust stands at seatY, rear/window rider busts too; each is scaled by
`fitScale(userData.h)` (≥ 0.72; ≈ 0.82 in a sedan) so the head clears the roof. A seated character
(player included) has its hips at seatY + 0.12 and is scaled about them by `fitScale(headTop −
legLen, hips)` (bus 17: Stig ≈ 0.81, Ole ≈ 0.99, Gabbe ≈ 0.87); `unseat` restores scale 1. **Who
is still taller than the room at the 0.72 floor sits lower by the rest** (Phase 3 r2: hips −=
`max(0, (headTop − legLen)·k − (roofY − hips))`, so the head top never passes roofY): Stig ≈ 0.15 m
lower in a van, 0.19 in a sedan or taxi, 0.20 in the Guardia jeep; his cowlick stood 7 cm out of
a van's roof (its slab is `top − 0.12 … top`, roofY = top − 0.08) and 1 cm out of the jeep's. Bed riders
(`slot: 'bed'`) stand in the open load bed. A rider given by cast key wears that character's current
outfit (`npc(key).def`).

### 6.7 Pedestrians (models.js `randomPed`, peds.js; WP-E)

- **0 % kids**; scale .94–1.08.
- 70 % Swedish charter tourists: skins sunburn `0xf2b8a0`, `0xe89a7a`, pale `0xf6d3c0`; loud shirts
  (Hawaiian `print` 30 %), shorts 55 % (white socks), `hat: 'sunhat' | 'bucket'` 35 %, a camera
  `held` 10 %.
- 30 % locals: skins `0xc99a6e`, `0xa8774f`; white shirt + black trousers (waiters) or black dress.
- Dodge shouts (`peds.js`): tourists `'Akta!' 'Hallå där!' 'Herre jävlar!'`, locals `'¡Cuidado!'
  '¡Turistas!'` (`Herre jävlar` [F*], relocated; others [N]). Their barks when kicked, run over or
  carjacked follow the same split (Phase 3 r2, `Game.bark`, §14.10): locals use the `_LOCAL` tables.

### 6.8 Props (`props.js` `TYPES`; WP-B)

Type flags replace hard-coded names: `debris: n`, `splash: true`, `explode: 'big' | 'small'`.
**Every car-smashable prop has `top > 0.75`** (cars ride over anything with top ≤ y + 0.6).
Coins = number of 25-pta coins burst. `shame` = SKANDAL added (× 1.2 in a car, × 0.7 on foot).

| type | replaces | footprint | top | coins | shame | minSpeed | flags / look | placed by |
|---|---|---|---|---|---|---|---|---|
| `papelera` | trashcan | r 0.38 | 1.05 | 1 | 1 | 3 | green bin | B streets |
| `correos` | mailbox | r 0.32 | 1.3 | 2 | 1 | 3 | yellow Correos box | B, C; **`smash` test target** |
| `vykort` | newsbox | r 0.35 | 1.6 | 2 | 1 | 3 | postcard rack, paper debris | B, C |
| `dusch` | hydrant | r 0.25 | 2.2 | 3 | 2 | 6 | beach shower, `splash` | D playa, B |
| `parasoll` | flamingo | r 0.25 | 2.55 | 1 | 1 | 3 | striped canopy, its rim at 2.07 (Phase 3 r3: 1.72 cut through his head); `canopy: [1.15, 2.07, 2.6]` = a camera ceiling (§14.7) while it stands (Phase 3 r3) | C, D |
| `solstol` | tombstone | 0.7 × 1.9 | 0.8 | 1 | 1 | 3 | sunbed with towel | C, D |
| `palmkruka` | gnome | r 0.4 | 1.4 | 1 | 1 | 4 | potted palm | B, C |
| `mur` | woodfence | 2.5 × 0.3 | 1.1 | 0 | 1 | 2 | white garden wall, `debris: 9` | B |
| `tomatlada` | crate | 1.2 × 1.2 | 1.2 | 2 | 0 | 5 | tomato crate | D, B |
| `tunna` | barrel | r 0.42 | 1.05 | 2 | 0 | 4 | wine barrel | C (bodega), D |
| `bank` | bench | 1.9 × 0.7 | 0.55 | 1 | 1 | 4 | (driven over; kick to break) | B, C |
| `kon` | cone | r 0.28 | 0.75 | 1 | 0 | 1 | | D bygge |
| `bagagevagn` | cart | r 0.45 | 1.0 | 1 | 0 | 1 | luggage cart | D airport |
| `automat` | vending | 1.0 × 0.8 | 2.0 | 8 | 2 | 6 | `REFRESCOS` machine | C |
| `gaspump` | pump | 0.9 × 0.6 | 1.9 | 12 | 6 | 5 | `explode: 'big'` | C bensin |
| `butano` | (new) | r 0.22 | 0.85 | 3 | 3 | 3 | orange gas bottle, `explode: 'small'` | B, D |
| `julgran` | (new) | r 0.5 | 2.0 | 3 | 2 | 3 | plastic Christmas tree, tinsel debris | C (Flamenco lobby, plaza) |
| `tallrikar` | (new) | r 0.4 | 0.9 | 2 | 0 | 2 | plate stack (grisfest smash) | D grisfest (12) |
| `resvaska` | (new) | 0.8 × 0.5 | 0.9 | 2 | 0 | 3 | suitcase | D airport |
| `glasskylt` | (new) | 0.8 × 0.2 | 1.3 | 1 | 1 | 3 | ice-cream board | D playa |

Dropped: `mailbox newsbox flamingo gnome fence woodfence hay tombstone hydrant pump crate barrel
trashcan bench cone cart vending` (renamed as above). `main.js` reads `def.splash` / `def.explode`
instead of type names (Phase 0).

**Phase 0 registers every key of this table in `TYPES`** with the footprint, top, coins, shame,
minSpeed and flags above; geometry = the old Bigmouth type it replaces (brand-new keys get a
coloured box or cylinder of the right footprint). The old keys stayed as aliases (nothing placed
them) until Phase 3 removed them: `TYPES` holds the §6.8 keys only. `placeProp`/`finalizeProps`
**skip unknown types with a `console.warn`** instead of
throwing. WP-B's Phase-1 job is then only to restyle `build()` of the existing keys (no renames),
so C and D can place every §6.8 name in their sandboxes from day one.

### 6.9 Set dressing (all blocks)

Christmas week: plastic Christmas trees, tinsel on palms, `GOD JUL · FELIZ NAVIDAD`, a crèche at
the church. Charter Sweden: `SVENSKT KAFFE`, `SMÖRGÅSAR`, `HÄR TALAS SVENSKA`, `KVÄLLSTIDNINGAR`,
SunTrip posters, towels on sunbeds. Spain 1979: orange butano bottles, Correos boxes, green Farmacia
crosses, `ESTANCO`, Guardia barracks, green guaguas. Landscape: whitewash, terracotta,
bougainvillea, Canary palms, cardón cactus, red barrancos, tomato rows, the lighthouse, dunes.
Avoid anachronisms: no Yumbo Centrum, no Nissan Patrol, no turquoise "Global" buses, no euro.

The nature blocks (D1, Phase 3) carry a few touches on open ground, none of them solid where a
timed stage runs: Fataga, tinsel on the square's palm by the entry lane and a `julgran` on the
azotea of the corner house (16.75, 21) (its collider inside the house's, so the measured sheep
chase is unchanged); golf, a `julgran` by the clubhouse door under the veranda; the grisfest gate,
a bauble garland along the arch and up its posts and a `FELIZ NAVIDAD · GOD JUL` board on top;
the show bungalow, two `SUNTRIP · JUL I SOLEN` posters on the plot wall facing the road.

---

## 7. SKANDAL and the Guardia Civil (island; meter mode `pursuit`)

### 7.1 Config (src/meters.js; Phase 0, then WP-H)

```js
METERS.skandal = { mode: 'pursuit', label: 'SKANDAL', cls: 'skandal', hot: 70,
  vehicle: 'guardia', vehicleCount: 2, vehicleMaxSpeed: 33, pursuerDef: 'guardia',
  spawnDist: [40, 80],                             // m from the player (Phase 2; was 70–150)
  catchUp: [70, 1.3],                              // a Land Rover beyond 70 m drives × 1.3 (Phase 2)
  pursuerPhysics: 'walk', onFootSpeed: 7.0,          // sprint 8.8 outruns him, walking does not
  penalty: { share: 0.2, min: 250, max: 1500 },   // fine = clamp(round25(0.2·coins), 250, 1500), floored at coins
  bustFreeze: 3,                                   // s frozen beside the officer after a bust
  decayIdle: 5, idleDelay: 4, bands: [[70, 3], [35, 1]], allDeadDecay: 12,   // Phase 2 (was [[42, 9], [22, 3]])
  siren: true,
  taunts: ['¡Alto! ¡Guardia Civil!', '¡Documentación, por favor!', '¡Usted! ¡El de la camisa!',
           '¡Turistas!', 'De där svenskarna är heltokiga!'],   // [N] ×4, last [F*] (Spaniards at the julfest)
  bannerStart:  ['¡GUARDIA CIVIL!', 'Nu blev det skandal'],                              // [N]
  bannerCaught: ['¡MULTA!', 'Guardia Civil tog {n} pesetas i böter', 'Du har inga pesetas kvar att förlora'], // [N]
  bannerEscape: ['SKANDALEN TYSTAD', 'Guardia Civil gav upp'],                           // [N]
  bustedFailText: 'Guardia Civil tog dig!',                                               // [N]
  hideouts: [ { at: 'flamencoRecepcion', r: 2.6, cost: 500,                               // P1
    prompt: '<b>E</b> Muta portiern (500 pta)',
    line: ['portier', '…för 500 pesetas kanske vi kommer överens.'],                       // [F*]
    banner: ['PORTIERN TITTADE BORT', 'Skandalen är som bortblåst'], cooldown: 60 } ],    // [N]
  witnessToast: { who: 'herrStorch', r: 20, text: 'Ingen fara: linsskyddet sitter på.', cooldown: 60, // [N] P1; offence adds 0
    say: 'Lite film.' },                             // [F*] (WP-H); toast + filming never during a scene/cutaway (Phase 2)
  bustRadio: ['lasse', 'Friskotek i morgon bitti, Olsson!'],   // [N] (WP-H) after a free-roam bust only (Phase 2)
  bustLine: '¡Documentación!',                     // [N] the officer's bubble at a bust (Phase 0a)
};
```

### 7.2 Mechanics (shame.js, Phase 0 engine + WP-H polish)

- **Offences** (main.js amounts kept): carjack +8; prop break `def.shame` ×1.2 car / ×0.7 foot;
  ramming a non-target unlocked car `min(9, impact·0.55)`; wrecking traffic/unnamed parked car +12;
  running over a named NPC +14 / pedestrian +18; kicking a ped +9; kicking a traffic car +2.
- **Decay**: after `idleDelay` s clean, −`decayIdle`/s. In pursuit (`bands`): −3/s beyond 70 m
  from the nearest pursuer, −1/s at 35–70 m, 0 closer (so an escape is ≈ 33 s of staying more than
  70 m away); −12/s extra when all pursuer cars are wrecked and the officer is gone. `forced`
  (stage `shame: true`) → no decay.
- **At 100**: `startPursuit()`: banner, siren (two-tone 650/500 Hz square, alternating 0.45 s, while
  pursuit), music → `skandal`, flash `rgba(60,110,70,.45)`. Two `guardia` Land Rovers spawn on the
  streets `spawnDist` (40–80 m) away: on any block edge, 12 m past a junction or mid-block, in the
  right-hand lane, heading towards him, ≥ 30 m apart, never in the cone ahead of a moving player
  (a head-on bust in the first seconds) (`vehicle` from config),
  `isPursuer = true` (rename of `isHearse`), `AIDriver` chase at `vehicleMaxSpeed − 2` with a
  `catchUp` rubber band (× 1.3 beyond 70 m) and less braking for bends than traffic (a chaser drops
  to 55 % of cruise at most, traffic to 38 %), bust = `CHARS.guardia`.
- **Balance** (Phase 2, binding §8: escaping must be possible but hard; scenario `calibrate`, case
  `pursuit`, a ×1.2 sedan at full speed fleeing to far intersections). With both Land Rovers on
  the street (spawned 40–80 m off on any block edge, outside the forward cone, heading towards
  the player, ≥ 30 m apart): clean driving escaped in 4 of 5 runs after 37–42 s (≈ 1 000 m flat
  out), one was busted at 22 s; with one crash on the way (1 s at the kerb) 4 of 5 escaped after
  38–50 s (one with a Land Rover 18 m behind), one was busted at 16 s. With the Phase 1 numbers
  every escape took 11.1 s and no Land Rover ever came within 75 m, even for a driver at 80 % of
  top speed. (Spawning only at junctions, as at first, often gave a one-car pursuit.) The final
  exit run: clean 3 of 3 escaped after 38–39 s; with one crash 1 of 3 escaped, 2 were busted.
- **The officer on foot** (`pursuerPhysics: 'walk'`, judge trap fixed): a solid `Character(CHARS
  .guardia)` that **walks with collision**: each fixed step `wish = normalize(routeAim(officer →
  player) − officer) · onFootSpeed`, then `step()`. Wall-slide comes from `collideWalls`. The aim
  (shame.js `planOfficer`, four times a second): straight at the player when nothing solid is in
  between; else, when the first solid in between is a box (a house), round its corners 0.8 m out
  (one or two of them, along its faces, the shortest path whose legs are all clear; Phase 3 r3);
  else along the streets to the kerb point nearest the player, moved up to 16 m along the street to
  the nearest one that sees him (Phase 3 r3: with Fataga's crags solid he stood at the kerb behind
  one, and round a village house the street route took 10 s). **Stuck
  rule**: if he moved < 0.6 m in the last 3 s, or is > 60 m away, and is outside the camera frustum
  or > 25 m from the camera, teleport him to `freeSpot(player, 22, 32)` behind the player (opposite
  the camera yaw). He is created once per pursuit (reuse the Character; don't rebuild meshes).
  Removed when the player enters a car; re-spawned 30 m away when the player leaves it.
- **Busted** (officer within 1.4 m, or a pursuer car rams the player's car with impact > 1.5):
  fine `n = min(coins, clamp(round25(0.2·coins), 250, 1500))`, `coins −= n`, banner ¡MULTA!
  (`Guardia Civil tog {n} pesetas i böter`, `{n}` with thin-space thousands, `pta()`; 1.8 s), flash;
  the player is **pulled out of the car** (if in one) and frozen `bustFreeze` = 3 s beside the
  officer, who bubbles "¡Documentación!" once the stamp is gone (1.8 s in, for 1.2 s; the banner is
  drawn over bubbles and hid it) (in timed stages the bust costs time); `endPursuit(true)`, then `missions.onBusted()` (fails only
  `bustFails` missions). The 500-pta porter bribe beats the fine once the purse is ≈ 2 500 pta. P1 flavour: radio `lasse` "Friskotek i morgon bitti, Olsson!" [N] (`bustRadio`), only for a bust in free roam (no mission running, then or 3.3 s later).
- **Escape**: banner SKANDALEN TYSTAD + `complete` jingle. **Music after a pursuit** (escape, bust
  or bribe): the tune that played when it started if that was a mission's (the night grisfest's
  `vals`, the julafton party's `jul`; `shame.tuneBefore`), else `game.levelTune()` read at the end
  (`sol`, or `samba` if the player picked it meanwhile). (Until Phase 3 it was always the level
  tune: a pursuit at the grisfest ended in daytime `sol`.)
- **Hideout** (P1): the porter at `flamencoRecepcion`: during a pursuit, on foot within 2.6 m,
  prompt `<b>E</b> Muta portiern (500 pta)`; pays via `game.pay(500)` (**Ole pays** if short), clears
  the meter, ends the pursuit; the porter says his `line` first (bubble, 1 s + 0.045 s a character,
  halved in test mode; a radio toast if he is not there) and the hideout banner, flash and jingle
  follow when it ends (Phase 3: the banner, drawn over bubbles, hid the [F*] line). 60 s cooldown.
- **Witness rule** (P1): an offence within 20 m of `herrStorch` adds **0** SKANDAL (no evidence:
  the lens cap is on) and shows the toast `Ingen fara: linsskyddet sitter på.` (≤ once per 60 s;
  offences inside the cooldown still add 0).
- `shame.locked = true` freezes the meter (cinematics, the smash stage, the buss17 intro) **in
  `pursuit` mode only** (panic mode: §5.9); the runner resets it to false on stage change unless
  the stage sets `lockMeter: true`.
- **Phase 0 vs WP-H**: Phase 0 ships the walking officer as a solid `Character` that walks
  **straight** at the player with `step()` collision plus the stuck teleport (the safety net), the
  fine, the bust freeze and the witness rule; WP-H adds `routeAim` steering, siren polish, the
  hideout and the toast. **Fallback** if the walking officer misbehaves: pursuit stays car-only and
  a Land Rover that comes within 6 m of an on-foot player stops and busts him.
- Flight: the same class in `panic` mode (§5.9). `configure()` resets v, ends any pursuit, removes
  pursuers and the officer.

---

## 8. Missions (13)

**Numbering**: "Mission N" is 1-based (what the player sees: `Uppdrag N av 13`); `index` is 0-based
(`missions.index`, `?mission=index`, story script `M[index]`). The story test ends at **`#13 idle`**.

**Notation** in every mission sheet:
- Header: `index · id · "Swedish title" · giver @ at · level · reward pta [· cost] [· flags]`.
- Dialogue: `who: "text"  [tag]` (§1.4); optional cue in braces `{...}` = the line's third element
  (§9.3). Lines without a speaker change are consecutive lines by the same speaker.
- Stages: `kind({options})` with every option the stage needs (§9 defines each kind).
- Radio lines inside stages are `[who, text]` pairs, fired in order every 9–13 s (goto/follow) unless
  a stage gives explicit times.
- Fail texts are the `failText` options; the runner shows them under `UPPDRAG MISSLYCKAT`.
- **Givers' HOMES** may differ from `at`; the runner moves the giver to `at` (offset 0) while idle
  and re-runs `placeNpcs(true)` right after `state = 'idle'` (race fix).

### Timers and difficulty (binding; user decision 2026-10-04)

- **Difficulty target: Simpsons: Hit & Run, i.e. tight.** The game should be fairly hard. Every
  timer is tuned so that a clean run on a sensible route finishes with **about 15–20 % of the time
  left**; one big crash, a wrong turn or dawdling should fail it. Fail → retry is the normal loop
  (checkpoints and `retryAt` keep retries short).
- **The player's car runs at ×1.2, not Bigmouth's ×2** (§6.6). At ×1.2 a sedan tops out around
  37 m/s (≈ 130 km/h) instead of ≈ 60 m/s, so drives take roughly 1.6× as long as on the Bigmouth
  car, and the Guardia can actually keep up.
- **Timers are measured, not guessed** (the Phase 2 balance pass, §15.3 step 5, on the merged
  world; scenarios `calibrate` (island) and `calibflight` (flight)):
  - **Drives** (`goto … inCar`, `destroy`, `collect … inCar`; `follow` has no timer): `T_ref` = a
    headless autopilot in the player's car (boost 1.2, `timeScale` 1, traffic on) from where the
    stage starts to the target radius, on the shortest sensible road route, including required
    stops (`stop`) and, for `smooth`/`fragile`, driving within those limits (lateral accel ≤ 5.2
    m/s², no impacts). The autopilot drives like a good human: lane-following pure pursuit, full
    throttle, braking before corners from a curvature profile, a long vehicle turning at the radius
    it can hold, overtaking slower traffic, reversing out of plazas, and an A* route for the car's
    footprint where a target stands off the road. **Statistic**: the median of the clean runs (no
    impact; within the ÅKSJUKA limit) for a deterministic stage; the 75th percentile for a random
    one (the jeep's flee route). **timer = ceil(1.2 × T_ref)**.
  - **On foot** (`rabbits`, `smash`, on-foot `collect`/`goto`, the gate dash, cabin stages):
    `T_ref` = a measured run through the real collision geometry (a grid A* over every solid,
    props included, with the 0.45 m step and, on the island, jumps onto ledges; sprinting unless
    sprint fear matters next to the stage's own) **+ 0.5 s per target** (a human's reaction and
    aim, which the autopilot does not have). The median for deterministic layouts, the 75th
    percentile for random spawns and fleeing targets. **timer = ceil(1.25 × T_ref)**.
  - **Rounding: up to a whole second.** (Phase 1 rounded up to 5 s; a 5 s step alone added up to
    5 s of slack, e.g. vischan 30.6 → 35 = 27 % left, or the gate dash 5.1 → 10 = 50 %.)
  - **Percentiles interpolate** linearly between order statistics (h = (n − 1)·q). The
    nearest-rank form first used returned the slowest run for n = 4, i.e. a worst case. A random
    stage's pool holds at least 24 runs on foot (36 for the balls) and 40 jeep chases, on the final
    walker / chase autopilot. The default `calibrate` run (`FOOT_RUNS` 4, `JEEP_RUNS` 12,
    `PLATE_RUNS` 6; about 35 min) is a regression check, not a measurement of a random timer: its
    samples are too small for that (gate 2's two n = 4 balls samples: timer ranges 28–51 and 31–47) and
    enter a pool only as one more sample. Raising the defaults to the pool sizes would take a
    default run past an hour.
  - **One sample does not pin a random stage's timer down** (Phase 3 r1): on the same code the p75
    of 12 ball chases gave timers of 31–38 and 20 jeep chases 35–42. A random stage's shipped timer
    is **the rule applied to the pooled samples in `notes/calibration-samples.md`** (the raw-sample
    ledger: every run's time, the code and autopilot it ran on, the runs left out and why), and
    `node tools/pool.mjs` re-derives each pool's n, median, p75, timer and range from it. Pool only
    samples taken on the same stage code and the same autopilot code: a change to either starts a
    new pool. (Phase 3 r1 repair 1 shipped the balls timer from 72 runs whose logs were lost; the
    next gate's 20 runs pooled to 41 against the shipped 33, and nobody could check which was
    right.) `calibrate` (`CAL CHECK`) / `calibflight` (`CALF CHECK`) print each new sample's 90 %
    bootstrap range of the timer (`timerRange` in tools/lib.mjs). A shipped timer inside that range
    agrees with the sample; one outside it means re-measure: pool more runs, and look for a change
    in the stage or the autopilot. A measurement is only as good as its autopilot: a random stage
    whose runs split into clusters is first checked for an autopilot artefact (the jeep wedged on
    houses in Phase 2, the sprit sweeper hid in a row behind three serve stops until Phase 3 r1,
    the walker's straight-line progress rule called a detour round a wall "stuck" until Phase 3 r1
    repair 2).
  - `rabbits` targets (balls, sheep, flowers) spawn only where the player can run to from the
    `near` landmark (`g.footReach`, §9.2): a sheep used to spawn behind the 2.55 m tomato-field
    wall north of Fataga, 14 m from the player and about 50 m round.
  - A stage that starts at a random place gets a timer that follows the distance: `goto`'s
    `timer` may be `(g, m) => seconds` (§9.2). Bodega s10 uses `homeTimer(wreck)` =
    ceil(1.2 × (7.9 + d / 34.4)) with d the Manhattan distance from the jeep wreck to
    `flamencoBack` (least-squares fit 4.9 + d/34.4 over 12 clean drives from 6 spots, 3 each, + 3 s
    to turn round at the wreck; Phase 2 gate. The Phase 2 balance fit 6.3 + d/28.6 came from older
    code: five later fits all gave v 30–35 m/s). A line in d cannot follow every route: each spot's
    own clean drives sit within ±2 s of it, so a given spot's timer is 1.12–1.37 × its drive + 3 s.
  - **Races and chases**: a clean race is won by a few seconds and one crash loses it; a `destroy`
    target is catchable at ×1.2, but only by driving a direct line; follows keep a fair band.
- **The table** (Phase 2 measurements; `n` = runs, * = not clean, excluded):

| stage | route | T_ref (n runs) | timer (Phase 1) | slack: (timer − clean time) / timer |
|---|---|---|---|---|
| 8.1 gate [3] toilet dash | gateOle → round the ladies' room → herrtoa (r 1.8), sprint 3.6 s (walk 5.0; Phase 3 r2 from the statistics' placed start (25.0, 11.6): 3.6 / 5.1) | 4.1 (3.6 + 0.5; 1) | **6** (was 10) | 40 % sprint, 16 % walk |
| 8.2 ombord [0] find 14B | the intro's spot at the front door (1.6, 13.55) → 14B past three stowers (E each), sprint 3.1 s (walk 4.4) | 5.1 (3.1 + 4 × 0.5; 1; Phase 3 r2, the intro places him there; from `cabinDoor`'s approach spot 2.9 → 4.9) | **7** (15) | 56 % sprint, 37 % walk |
| 8.4 sprit [0] five bottles | sprint after the nearest, wait in the aisle clear of the trolley for the bottles it pushes out, Space while the 3.0–6.0 s turbulence shakes | 10.1 (p75 7.60 of 101 + 2.5; 5.4–7.8 s, median 7.32; pool `sweeper-r2fm/b69c64e` in `notes/calibration-samples.md`: r2 flight-missions' 36 + 5, r2 gate's 5, r3 flight-flow's 10, r3 flight-look's 5, r3 flight-trolley's 10, r3 repair-flight's 5, r3 gate 1's 5, r3 ledger's 5, r3 gate 2's 5, the verify2 of r3 repair-flight's 5, r3 repair2-flight's 5; Phase 3 r2, the turbulence moved inside the sweep. Before it, with none: p75 6.0 of 48 → 11 (r1 repair); the old sweeper that hid in a row was bimodal, 4–12 s or 28–30 s, p75 14.4 → 22, Phase 2 17.1 → 25) | **13** (35) | 42 % at p75 |
| 8.5 landning [0] round-up | row 16 → José → Berra → Herr Storch (walk, sign lit) | 9.1 (7.6 + 1.5; 2 orders) | **12** (20) | 37 % |
| 8.5 landning [1] back to 14B | from the far end (Berra) | 3.7 (3.2 + 0.5; 2) | **5** (10) | 36 % |
| 8.6 buss17 s2 | busBay → 7,1 > 3,1 > 3,4 → flamencoDrive, ÅKSJUKA, stop | 45.0 (median of 10 clean in 4 sets, 44.4–47.0) | **54** (60) | 17 % |
| 8.7 friskotek s1 | six fleeing beach balls round the friskotek lawn, from Stig's placed spot in the intro's group shot (−11.0, −69.4) | 18.3 (p75 15.34 of 48 + 3; median 13.32; Phase 3 r3 island-camera's 36 runs and the default runs of r3 gate 1, r3 ledger and r3 gate 2 (4 + 4 + 4), pool `walker-r1r2/r3-island-camera`: the notice board on the lawn's west edge is solid; at 44 runs p75 15.56 → 24. Before it: 18.4 (p75 15.41 of 40 + 3; median 13.59; Phase 3 r2 island-staging's 36 runs and r2 gate's 4: the intro places the cast, a new pool `walker-r1r2/r2-island-staging` in `notes/calibration-samples.md`; island-staging's 36 alone: p75 15.29 → 23; before it, from the approach spot: p75 15.59 of 44 + 3 → 24, Phase 3 r1 repair 2, the fixed walker: no pacing, an A* that reaches round the hotel. The old walker: gate 2's 20 runs p75 29.40 → 41, r1 repair's lost 72 runs 23.1 → 33, Phase 2 21.9 of 12 → 32) | **23** (20) | 33 % at p75 |
| 8.8 asnan s9 | Centro Nórdico lot → 5,3 > 1,3 → vikingbar, SKICK | 15.5 (median of 3 clean; 15.5–15.6) | **19** (20) | 18 % |
| 8.9 bodega s4 | playa → 4,7 > 4,2 > 0,2 → vischan | 25.8 (median of 8 clean in 3 runs, 25.4–26.8: 25.4 unless traffic held it up 1–1.5 s; Phase 2 gate) | **31** (35) | 17 % |
| 8.9 bodega s9 jeep | farm gate, road-route chase, rams | 34.05 (p75 of 130 usable chases in 10 samples on the fixed chase autopilot: Phase 3 r1 repair 2's 83, the r2 gate's, r3 gate 1's and r3 ledger's default runs, 12 each, and r3 gate 2's 11; 5 more lost the truck and 1 wedged, excluded; median 28.00; single samples' p75 28.5–43.0; pool `chase-r1if/d9451f8` since r1 repair 2, whose 83 gave p75 34.45 → 42 (and 107 34.97 → 42, 119 34.05 → 41); the 98 chases behind the earlier 40 (p75 32.5) are lost; island-flow's first 40: 30.6 → 37; Phase 2: 34.4 → 42) | **41** (45) | 17 % at p75 |
| 8.9 bodega s10 home | wreck → flamencoBack | 7.9 + d/34.4 (fit 4.9 + d/34.4 of 12 clean, 6 spots, + 3 s turn) | **homeTimer**: 17–30 (30 without a wreck) | 17 % of the fit (11–27 % of a spot's own drive) |
| 8.11 fataga s5 | six fleeing sheep round Fataga | 21.8 (p75 18.80 of 48 + 3; median 16.32; Phase 3 r3 island-camera's 36 runs and the default runs of r3 gate 1, r3 ledger and r3 gate 2 (4 + 4 + 4), pool `walker-r1r2/r3-island-camera`: the north crags got colliders that match the rock; the 36 alone: p75 18.80 → 28, at 44 runs 18.40 → 27. Before it: 21.5 (p75 18.53 of 32 + 3, later 18.36 of 36 → still 27; median 15.90; Phase 3 r1 repair 2, the fixed walker, pool `walker-r1r2/d9451f8`); the old walker: 18 runs p75 27.94 → 39, Phase 2 30.3 of 12 → 42) | **28** (25) | 33 % at p75 |
| 8.12 grisfest s1 | five flowers round Hotel Flamenco (random spawns) | 20.7 (p75 18.24 of 48 + 2.5; median 16.22; Phase 3 r3 ledger: the r3 intro places Ole 1.6 m beside Stig's start, a new pool `walker-r1r2/r3-island-staging`: r3 gate 1's 4 runs, three batches of 12 and a default run's 4 on the final code, and r3 gate 2's 4. The world, the start spot and the spawns are those of the round-2 pool `walker-r1r2/46a0938` (Phase 3 r2 gate + orchestrator on ca2a3a6, the Flamenco piers solid since 46a0938: p75 15.73 of 28 → 23), whose 28 runs were the short side: this pool's times match the round-1 world's; before it, r1 repair 2's fixed walker on d9451f8: p75 17.79 of 32 → 26; the old walker: 8 runs p75 29.51 → 41, Phase 2 31.1 of 12 → 42) | **26** (30) | 30 % at p75 |
| 8.12 grisfest s4 | ten of the twelve plate stacks at the dance floor (kick; a fixed layout, three per table) | 25.8 (median 20.77 of 44 + 5, 20.77–21.03: the same tour every run; Phase 3 r1 repair 2, the fixed walker; a deterministic stage now, it was timed at the p75 of "random spawns"; the old walker: 30.33 (one run 37.95, pacing) → 45) | **33** (35) | 37 % at the median |
| 8.12 grisfest s6 | dance floor → car at the finish → 3,1 > 2,3 → tongatonga | 15.8 (walk 3.9 + 0.5 + drive 11.4: walk + drive median 15.28 of 20 clean, + 0.5; Phase 3 r1 repair 2, the fixed walker: 33 m in 3.9 s where the old one took 44–45 m and 6.3–6.5 s; was 19.0 → 23) | **19** (30) | 17 % |
| 8.13 julafton s1 | patio → hire car → Majsan, Fru Storch, Berra, Herr Storch | 67.4 (median of 17 clean runs, 67.0–81.7: all within 67.0–68.6 but one held up 14.5 s by traffic, 81.7; Phase 3 r1 repair 2, the fixed walker reaches the hire car in 3.5 s (30 m) where the old one took 8.3–8.4 s (50 m); the drives are unchanged; was 72.4, Phase 2 gate) | **81** (80) | 17 % |

  On foot the slack is larger than 20 % by design: the 0.5 s per target is a human's reaction,
  not slack, and × 1.25 is the on-foot rule. The flight's short stages keep more for a sprinter
  because 1 s is the smallest step (the gate dash is limited by fear as much as by time: below). Random stages are timed at their
  75th percentile, so a quarter of clean attempts with unlucky spawns need a second go.
- **Races and chases** (measured the same way):
  - Night-bus race (§8.12 s3): the bus starts in its own lane on the start spot and the player
    beside it on the left, noses level (§9.2 race); `TUNING.nattbuss` cruise 31, spec maxSpeed 35,
    accel 12, steer 0.9; rubber band only at the extremes. 3 clean runs: **won by 2.0 s** each; 3
    runs with one crash (a stop at the kerb at 165 m, 1 s to recover): **all lost** (by 2–6 s).
    Later runs (attempt 2): clean won 13 of 14, by 0.9–2.0 s, once by 5.7 s when traffic held up
    the bus. The one loss sat behind the bus for 18 s without overtaking, an autopilot limit. One
    crash lost in 12 of 13. The exception was a crash that left the car in the bus's lane: the bus
    shunted it, lost time itself, and the crashed run won. Being rammed like that is a real-game
    outcome, but the measured crash now spins out into the left lane, clear of the bus.
    Phase 2 gate: cross traffic still decided races. The gate's runs had a player's car wrecked
    at the second junction before the crash point, which `calibrate` counted as a win
    (`won = !failed`; now `won` = the stage completed), and a crashed run that won by 4.3 s after
    a hit at the first junction held up the bus. With the impacts logged, 2 of 16 runs on open
    roads had traffic hit the player's car and the bus (`avoid: false`) in the first junction. The race
    now runs on a closed course (§9.2 race): on the final code 12 clean runs **all won by 1.7–2.0 s**
    and 12 runs with one crash **all lost by 2.2–2.4 s**, with no car-car impact in any of them.
    **Phase 3 r2**: the race is the one measured only in that car, so stage 2 now takes the hire
    car (a sedan) and a retry races in it again (§8.12); bus 17, a van or the ice-cream van could
    not win. On that code a sedan won clean by 2.0 / 1.6 s and lost with one crash by 2.3 / 2.5 s;
    the race kind's spare hatch (a wrecked hire car) won clean by 2.8 s ×2 and lost with one crash
    by 1.1 s ×2.
  - Guardia jeep (§8.9 s9): cruise 20, damageScale 4, the truck takes half damage. **Phase 3 r1
    (island-flow)**: the chase autopilot kept its unstick state in the route controller it
    re-builds every 1.2 s, so the stuck timer reset and every reverse was cut short: a truck nosed
    into a kerbside tree or the Flamenco bins pushed and backed off in place (3 of 5 baseline
    chases wedged, 2 of them for the whole 150 s). The chase now keeps that state itself, a repeat
    within 6 s backs up longer with the wheel the other way (1, 1.6, 2.2 … 3 s), and after backing
    out it follows the road for 2.5 s before it rams across a corner again. Two runs of
    `JEEP_RUNS=20` on that code: 40 usable chases, **none wedged** (6 needed one unstick), 9–39 s,
    median 26.9 s, **p75 30.6 s** → timer 37 (was 42); the single runs' p75 were 28.7 and 31.6. The
    gate's and r1 repair's three more runs of 20 on the same code gave 34.2, 34.1 and 30.4: pooled
    over 98 usable chases (2 more lost the truck after 2–3 unsticks, excluded) 9–73 s, median
    27.8 s, **p75 32.5 s** → timer **40** (90 % range 37–42). Those 98 chases' raw times were
    lost, and 1.2 × 32.5 is 39, not 40. **Phase 3 r1 repair 2**: the timer is now the rule on the
    83 usable chases kept raw in `notes/calibration-samples.md` (gate 2's 22, two new runs of
    `JEEP_RUNS=20` and the repair's two default `calibrate` runs, all on the same chase code; 4 lost
    the truck and 1 wedged, excluded): 8–90 s, median 28.38, **p75 34.45 s** → ceil(1.2 × 34.45 =
    41.34) = **42** (90 % range 37–48). The r2 gate's, r3 gate 1's and r3 ledger's default runs added
    12 chases each on the same chase code (none wedged or lost), and r3 gate 2's 11 more (its twelfth
    lost the truck, excluded): 130 usable chases, median 28.00, **p75 34.05 s** → ceil(1.2 × 34.05 =
    40.86) = **41** (90 % range 38–43; Phase 3 r3 ledger, at 119 chases, and r3 ledger2; at 107
    chases still 42). The p75 is noisy: the ten samples of 11–19 alone gave 28.5–43.0, and the pool
    gave 45 at 60 chases, 43 at 72, 42 at 83–107 and 41 at 119–130. The tail is the chases where the
    truck had to back out: 54 with no unstick have a median of 26.0 s, the 8 with two or more
    47.0 s (max 89.5).
    Phase 2 gate (old autopilot): 35 usable chases of 6–124 s (p75 34.4 → 42) and 15 wedges
    excluded; the long tail was largely time spent stuck. The flee route is random, so the timer
    is at the 75th percentile: a chase that follows the jeep round every block instead of cutting
    it off runs out of time. Default `JEEP_RUNS` is 12 (6 gave a p75 of 4 usable chases that swung
    33–50 s).
  - Follows: tails at 24–26 m stayed inside the bands (grisbil 20.6–27.8 of 55, José 22.3–29.6 of
    14–55, excursion bus 21.7–25.0 of 55).
  - SKANDAL escape: §7.2 "Balance".
  - Haggle (§8.8 s4; `HAGGLE` in missions/island.js): zones 0.30 / 0.23 / 0.17, speeds 0.7 / 0.95 /
    1.2 cycles/s. A model player who aims at the zone middle with a Gaussian timing error σ wins
    97 % at σ 25 ms (practised), 81 % at 40 ms, 53 % at 60 ms (a first go). The Phase 1 values
    (0.30/0.22/0.15 at 0.8/1.1/1.4) left a 34 ms window in round 3: 66 % at 40 ms, 39 % at 60 ms.
- **FLYGRÄDSLA** (binding: a careful player never panics; a careless one does in missions 1, 2
  and 5), `calibflight` careful vs careless autopilots. The current numbers are Phase 3 r3's,
  below. **Phase 2 balance pass** (superseded): gate — a sprinter arrives at the men's room
  at ≈ 94, a walker at ≈ 98, a dawdler (2 s idle, then walking) panics at 5.5 s (`fearRate` 5,
  timer 6); ombord — holding J at 70 peaks at ≈ 75, never holding J panics at t 21.5 of the
  takeoff; landning — J from the start of the approach peaks at ≈ 20, J only after the shaking
  panics at t 24. Missions 3 and 4 never came near 70 for a careful player (sprit peaks 12–17 over
  36 sweeps through the turbulence, Phase 3 r2; ≈ 5 with none; ≈ 20–35 while the old sweeper stood
  in a row for up to 18 s).
  **Phase 3 r3** (current): with the idle decay paused in scenes (§5.9) the meter no longer drains
  while a line waits for E, so the gate dash no longer depends on how fast the player reads.
  `calibflight` at the default 55 chars/s and at `DIALOG_CPS=20`: gate — the dash starts at
  70.1 / 70.3, a sprinter arrives at 95.6 / 95.8, a walker at 99.4 / 99.4 (0.6 under PANIK: the
  objective says "fort!"), a dawdler panics at 5.2 s; ombord — J at 70 peaks at 75.7 / 75.6, no J
  panics at t 21.7; landning — J from the start peaks at 17.9–19.7 / 25.3–27.1 (the lit sign's
  standing fear during the longer intro), J only after the shaking panics at t 24.2 / 23.3; sprit
  peaks 15.3–17.0. Both runs PASS. (Before, a reader at 20 chars/s started the dash at 57, a
  sprinter arrived at 85 and a dawdler never panicked; at 12 chars/s it started at 25.) Since r3
  repair a retried dash starts at the first attempt's ≈ 70 (`retryFear`, §8.1 [2]; 70.0–70.5 for
  70.1–70.2), and the r3 gates' walkers arrived at 99.3–99.6.

### Mission summary

| # | index | id | title | giver @ at | level / start phase | reward | flags |
|---|---|---|---|---|---|---|---|
| 1 | 0 | `gate` | Jag kan flyga, jag är inte rädd | `ole` @ `gateQueue` | flight / gate | 200 | |
| 2 | 1 | `ombord` | Rad 13 finns inte | `vardinna` @ `cabinDoor` | flight / gate→cruise | 250 | stage panicFails |
| 3 | 2 | `juice` | Mer juice | `ole` (14A) @ `cabinRow14` | flight / cruise | 300 | checkpoint |
| 4 | 3 | `sprit` | Medhavd sprit | `vardinna` @ `galleyBack` | flight / cruise | 300 | |
| 5 | 4 | `landning` | Inflygning Las Palmas | `majsan` (16E) @ `cabinRow16` | flight / cruise→landed | 400 | stage panicFails; → island |
| 6 | 5 | `buss17` | SunTrips buss nummer 17 | `lasse` @ `airport` | island | 500 | outfit → hawaii |
| 7 | 6 | `friskotek` | Plocka kulor! | `lasse` @ `friskotek` | island | 500 | |
| 8 | 7 | `asnan` | Caballo folklorístico | `ole` @ `flamenco` | island | 600 | haggle pays 200, checkpoint |
| 9 | 8 | `bodega` | Pepes Bodega | `berra` @ `flamencoBar` | island | 700 | unlock `grisbil`, checkpoint |
| 10 | 9 | `ropavieja` | Gamla kläder | `siv` @ `flamencoPool` | island | 700 | |
| 11 | 10 | `fataga` | En skock får | `majsan` @ `flamencoPool` | island | 800 | **P1: cut first**, checkpoint |
| 12 | 11 | `grisfest` | Grisfesten | `ole` @ `flamenco` | island | 1000 | cost 800, night, checkpoints |
| 13 | 12 | `julafton` | Julafton bland palmerna | `ole` @ `flamencoPatio` | island | 2000 | cost 100, unlock `bodega`, end card |

If `fataga` is cut, remove it from `ISLAND_MISSIONS` and the story script; the story then ends at
`#12 idle` (the integration agent updates CLAUDE.md/README).

---

### 8.1 · index 0 · `gate` · "Jag kan flyga, jag är inte rädd" · `ole` @ `gateQueue` · flight · 200

Fun: fear as a resource from minute one. A beeping arch, a timed toilet dash with the heartbeat
thumping, holding the mantra in the men's room, and the bodega tip in the queue to the plane.

No `extra` (the gate cast already stands at its `HOMES.gate` spots; an `extra` would pull them into the security queue). Player outfit `arlanda`. Ole outfit `arlanda`
(trilby, boombox), Angerud `arlanda` (camel coat, fur hat). Phase `gate` (stage 1 `startCue: { phase: ['gate', { instant: true }] }`).

**Intro** (in the security queue; the first line's cue stages it, Phase 3 r2: `{place: {ole: ['gateQueue', 0, 1.2, -PI/2], stig: ['gateQueue', 0, -0.2, PI/2]}, cut: {at: 'queueCam', dist: 0, height: 2.0}}` — side by side across the 3 m pocket, facing each other, Stig clear of the tray counter, seen at eye level from the pocket's south end, held to the end of the intro; the dollhouse showed two hat tops and a side shot ran across the counters):
- stig: "Vad ska de göra?"  [F](t)
- ole: "Rutinekontroll. Narkotika, våpen, bomber…"  [F*](t)
- stig: "Bomber…?!"  [F]  {fear: 10}
- ole: "Du ser nervøs ut, du. Første gang du flyr?"  [N]
- stig: "Jag kan flyga, jag är inte rädd."  [F]

**Stages** (0-based `stageI` in brackets, for the story script):
1. [0] `interact({ at: 'gateArch', radius: 1.4, prompt: '<b>E</b> Gå genom metallbågen', text: 'Gå genom säkerhetskontrollen', startCue: { phase: ['gate', { instant: true }], place: { berra: ['gateArch', -0.4, -2.8] } }, useCue: { sfx: 'beep', fear: 12, flash: 'rgba(255,60,40,.35)' }, lines: [...] })` — Berra waits in the queue behind Stig (local (35.8, 4.6), by the x-ray belt's landside end, clear of the walk from Ole to the arch; in both the side two-shot and the landside dollhouse frame of the arch he is in shot, so his heckle is not spoken from the lounge 14.5 m away). On use the `useCue` fires, then the `lines`:
   - kontrollant: "Vill ni vara vänlig och ta av er skon."  [F]  {anim: {who:'stig', flag:'shoeOff', secs: 2}, sfx: 'laugh'}
   - berra: "Kolla terroristen!"  [F](t)
2. [1] `goto({ to: 'gateOle', radius: 2.5, text: 'Gå till Ole vid gate 8', startCue: { place: { ole: ['gateOle', 0, 0] } } })`
3. [2] `scene({ checkpoint: true, retryAt: 'gateOle', retryFear: true, frame: ['ole', 'stig'], place: { stig: ['gateOle', -2.0, 0.2, -1.47] }, cam: { at: 'statsCam', dist: 0, height: 1.9 }, lines: [...] })` — Ole's statistics (a failed dash replays them, which rebuilds the fear the dash needs; WP-F). **`retryFear`** (Phase 3 r3 repair, §9.4 item 3): the fail empties the meter (`shame.clear()`), so a retry first gives back what it held when this stage first started ("Bomber" +10 and the arch +12, ≈ 22), and the replayed +48 brings the retried dash to the first attempt's ≈ 70 with the heartbeat on (it started at 48, without it, and a dawdler could not panic: 48 + 6 × 5 + 4 = 82; measured after: 70.3 at 20 chars/s from the giver, `calibflight`'s dawdler retry 70.4 / 70.0 against 70.1 / 70.2, and a dawdler panics in the retried dash too). Stig stands on the measured dash start (25.0, 11.6), turned to Ole, and the fixed cut frames both from the south (Phase 3 r2: the side two-shot followed the arrival, and a player coming from the arch got José's head across the bottom of the frame for all nine lines). **Only Ole's six
   statistics lines carry `{fear: 8}`** (+48; with "Bomber" and the arch the meter sits ≈ 70 when
   the dash starts, so the heartbeat is on):
   - ole: "Du vet vel at det er 50 prosent sjanse å overleve en flyulykke."  [F]  {fear: 8}
   - ole: "Det er farligere å kjøre bil enn å fly."  [F]  {fear: 8}
   - ole: "Man regner mellom to og fem millioner flytimer pr. kræsj."  [F]  {fear: 8}
   - stig: "Krasch?"  [F]
   - ole: "Kræsj."  [F*]  {fear: 8} (our bokmål echo of the Swedish "Krasch."; SUB-NO stops at "pr kræsj.")
   - ole: "Leste du om en sånn jumbopilot som gjorde en looping?"  [F]  {fear: 8}
   - stig: "Looping med en jumbo?"  [F]
   - ole: "Ja. To ganger."  [F]  {fear: 8}
   - stig: "Det går väl inte? Kan du se till mitt handbagage ett tag, jag måste…"  [F]
4. [3] `goto({ to: 'herrtoa', radius: 1.8, fearRate: 5, timer: 6, text: 'Till herrtoaletten – fort!', failText: 'Du hann inte fram…', radio: [['ole', 'To ganger, Stig-Helmer! Looping med en jumbo!', { gap: 3, fear: 4 }]] })`
   ([N] texts; radio [F*]). PANIK here does **not** fail: idle-panic returns him to `gateOle` and
   the 6 s timer keeps running. (Phase 2 balance, `calibflight`: about 18 m, sprint 3.6 s / walk
   5.0 s; fear at the start ≈ 69; a sprinter arrives at ≈ 94, a walker at ≈ 98, a dawdler panics
   at ≈ 5.5 s. Phase 3 r3, with the idle decay paused in scenes, §5.9: the start is ≈ 70 at any
   reading pace (70.1 at 55 chars/s, 70.2 at 20, 70.4 at 12; it was 57 at 20 and 25 at 12), a
   sprinter arrives at ≈ 96, a walker at ≈ 99.4, a dawdler panics at ≈ 5.2 s.) **Guide** (Phase 3 r2, shipped as a stage decorator `via` in missions/flight.js,
   not a kind option): the beacon and arrow lead along the measured route, `herrtoaGang` (past the
   middle bench row's east end), then `herrtoaDoor`, then `herrtoa`. The guide aims at the furthest
   point of that chain the player is on his way to: one he is nearer than the point before it is,
   or within `pass` m of that point (`via(stage, names, pass = 1.5)`; 0.5 in the cabin aisle, §8.2
   [0]), and only with a clear line to it (`segmentBlocked` from his hip height, 0.1 m steps: seat
   backs, benches and walls block it), re-derived every frame (Phase 3 r3: a stored index only
   stepped forward, so after a PANIK returned him to Ole mid-dash the arrow aimed at the men's door
   through the benches; without the clear line the "nearer" rule skipped the queue's men's door from
   the room's far corner). **Over the furniture** (Phase 3 r3 repair): when none of the points he
   is on his way to is in clear sight, the guide aims at the furthest one he is nearer than the
   point before it is, with a line clear of everything that stands above head height (his feet
   + 2.0 m: walls, doors, the toilet blocks; not benches, counters or seat backs); `pass` does not
   count here (it is for rounding a waypoint, whose corner is the obstacle: over the middle bench's
   end it sent the dash's arrow-follower into the bench, 3.8 s instead of 3.6). Only when he is on
   his way to none does it fall back to the first point (Ole's spot after a PANIK: `herrtoaGang`).
   Without it the first point was also the answer whenever the clear line failed: in ombord's seat
   dash a player in a seat row's legroom (row 3's or row 12's past a stower, row 15's one row too
   far; 111 of the verifier's cabin grid cells) got the arrow at row 1 with 1–2 s left, and north of
   the back bench row the queue's arrow turned back to the men's door. After, the grids: ombord aims
   at row 1 only forward of it (12 cells), at `cabinRow14` from the rows (98 cells; r3 repair2: the
   aisle beside him first, below) and at 14B from row 15 behind it (where E reaches 14B); the queue
   aims at the lounge from 56 more cells (north of the back bench row and south of the middle one);
   the dash at the men's door from 31 cells between the middle and back bench rows (it sent him back
   past the middle bench's end, the r2 aim; r3 repair2: the corridor beside him first, below);
   boarding is unchanged. The arrow-followers keep their times (dash 3.6 s, seat dash 3.1 s, queue
   5.7–6.5 s, boarding 3.9–4.9 s, landning's 14B 0.4–2.2 s). **Onto the route first** (Phase 3 r3
   repair2): when that look over the furniture picks a waypoint (not the stage's own target), the
   arrow first aims at the nearest point of the leg into it (the segment from the point before it),
   if that point is more than 0.3 m off and in clear sight from his hip: in a seat row's legroom the
   aisle beside him, between the middle and back bench rows the corridor east of them at his own z
   (x ≈ 28.0–28.4). Aimed over the seat backs straight at row 14, an arrow-follower in the forward
   rows' A/B legroom slid along the seat back ahead and stalled on its aisle end (6 of the verifier's
   32 cells, 3.9–6.3 s); aimed over the back bench at the men's door, one from (23, 17) wedged on the
   bench's east end, 7.1 s for the 6 s dash (R in the dash puts him at (22, 17.5), in that strip).
   Grids (terminal 0.5 m, cabin 0.2 × 0.25 m): the dash's 116 cells between the bench rows (x 18–26.5,
   z 14–18.5) and ombord's 528 legroom cells of rows 1–12 (both sides) change; the queue, boarding,
   landning [1], the rest of ombord (the aisle, row 15 behind 14B, forward of row 1) and the PANIK
   aim (`herrtoaGang`) do not. Arrow-followers (ts 1, E on every "Ursäkta!"): ombord's legroom, one
   cell per side and seat column in rows 1–12 (72), stalls of 1 s or more 13 → 0, mean 3.05 → 1.74 s
   (max 7.43, row 1's door corner → 3.08), none slower; the verifier's 44 cells, 9 stalls → 0 (mean
   2.41 / 2.28 → 1.58 / 1.45 s); the dash's 31 cells mean 3.83 → 3.13 s (max 7.08 → 3.85), every one
   faster than with r3's rule too (3.66 s), (22, 17.5) 3.93 → 3.13 s. The followers from the stage
   starts keep their times (dash 3.62 s, seat dash 3.1 s, queue 5.7–6.5 s, boarding 3.9–4.9 s,
   landning's 14B 0.4–2.2 s). The waypoint target carries the
   stage's own as `goal`, which R's terminal rule uses (§3). The flight level aims straight
   (`routeAim: false`), and the straight line from the dash start crossed the middle bench row
   and the toilet block's west wall: an arrow-follower was pinned on the men's door jamb and failed
   2 of 2; on the guide it arrives in 3.9 s at fear ≈ 97 (Phase 3 r3: 3.6 s, 3 of 3). No timer
   change (the measured route already went that way; re-measured 3.6 s).
5. [4] `mantra({ at: 'herrtoa', radius: 2.2, secs: 3, text: 'Håll J: sträck ut armarna – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA' })`
6. [5] `scene({ place: { berra: ['herrtoaDoor', 0, 2.2, 1.25], stig: ['herrtoa', 0, 0, -1.9] }, frame: ['berra', 'stig'], doneCue: { place: { berra: ['gateLounge', -1.2, 0] } }, lines: [...] })` (inside the men's room; the old offset was behind the wall; Stig turns to the door where Berra stands (Phase 3 r2: `scene` leaves an unplaced player as he arrived, and he faced the urinals with his back to Berra); Berra goes back to the lounge when the scene ends: a `place` cue on his last line fired as the line started and emptied the frame for the punchline):
   - berra: "Hur mår du?"  [F](t)
   - stig: "Bra."  [F]
   - stig: "Jag håller på med yoga, avslappningsövningar. Isometrisk träning…"  [F]
   - berra: "Jaha… Ja, själv tar jag mig ett järn. Ska du ha?"  [F]
   - stig: "Nej tack, jag tål inte starksprit."  [F]
   - berra: "Nej, vem fan gör det?"  [F]
7. [6] `goto({ to: 'gateLounge', radius: 4, text: 'Ställ dig i kön till gate 8', radio: [['pa', 'Herr Stork ombedes kontakta informationen i avgångshallen.', { gap: 1, pa: true }]], overhear: [...], awaitOverhear: true })`
   - PA right after the stage starts (ding-dong first) [F].
   - `overhear` at `damtoaDoor`, **r 8** (it starts as he leaves the men's room; bubbles anchored on
     the closed ladies' door, §9.2): siv "Du har väl med dig dom fyra p:na? Pass, pesetas,
     p-piller, piljetter." [F](t) · majsan "Jag har piral." [F](t) · siv "Pass, pesetas, piral och
     piljetter!" [F](t) · majsan "…och prit!" [F](t)
   - `awaitOverhear: true`: the stage cannot complete while a started overhear is still playing.
   - **Guide** (Phase 3 r3, `via(goto(…), ['herrtoaDoor', 'damtoaDoor'])`, the §8.1 [3] decorator):
     out of the men's door, down the corridor past the ladies' door, then to the lounge. Aimed
     straight at the lounge from the men's room, the arrow pointed through the room's south-west
     wall, and from the door across the back bench row: an arrow-follower stayed pinned in the
     room's corner for 60 s. On the guide it reaches the queue in 5.7–6.5 s from the Berra scene's
     spot and from four spots round the room, its south-west corner among them (5 of 5). Untimed.
     North of the back bench row (on the way to the GATE 8 desk, along the bench) and south of the
     middle row the arrow looks over the benches at the lounge (the §8.1 [3] furniture pass; it
     turned back to the men's door there, Phase 3 r3 repair). Where he is on his way to none of the
     points (the lounge's north end, z ≥ 23–25, more than 7.2 m from the lounge; its south end,
     z ≤ 9; the column by the window wall, x 15) it still aims at the men's door, the chain's first
     point: a known issue (a route-aware guide would be a redesign).
8. [7] `scene({ frame: ['berra', 'sulan'], place: { berra: ['gateLounge', -0.8, 0.6, 2.0], robban: ['gateLounge', 0.3, 1.1, 2.66], sulan: ['gateLounge', 1.4, 0.5, -2.6], stig: ['gateLounge', 2.3, 1.2, -1.77] }, cam: { at: 'loungeCam', dist: 0, height: 1.9 }, lines: [...] })` — the Stork joke and **the bodega tip
   as a mandatory beat** (it sets up missions 9 and 13). **Staging** (Phase 3 r3): the three stand in
   an arc, each turned halfway between the lens and the group's middle, and a fixed eye-level cut
   from south-east of the cluster (`loungeCam`, §5.5) frames them with the gate desk and Herr and
   Fru Storch behind; Stig listens side-on at the left of the frame, turned to them. Unplaced, he
   came from the men's room and the open-floor side two-shot filmed from the north with him between
   the lens and the speakers (Sulan's face behind his head on all four of Sulan's lines, the flight
   critic's real play), or an arrow-follower walked into the middle of the cluster and the shot
   looked away across the security area with the speakers 29–34 px tall at the frame's edges. Now
   every arrival (the queue's guide, and warps north, south, west and east of the cluster) gives the
   same shot: Robban 91 px, Berra 86 px, Sulan 126 px tall, facing 0.62–1.0, nothing in front. The
   boarding guide from Stig's spot still boards (arrow-follower: walk 6.3 s, sprint 4.4 s, never
   stuck). Lines:
   - robban: "Han måste vara bror med Lennart Swahn."  [F](t)
   - berra: "Och Karin Falk!"  [F](t)
   - robban: "Och Magnus Uggla!"  [F](t)
   - berra: "Har du köpt vin?"  [F]
   - sulan: "Det är 80-procentig rom."  [F]
   - sulan: "Här ligger Pepes Bodega. Det står på skylten."  [F]
   - berra: "De häller upp och allt är klart?"  [F]
   - sulan: "Plomberat och klart."  [F]
   - berra: "Robban! Sulan har varit på Pepes Bodega. De häller 80-procentig rom på vinflaskor."  [F*] (+ "Robban!")
   - robban: "Vad hette det, sa du?"  [F]
   - berra: "Pepes Bodega."  [F]
   - robban: "Glöm aldrig det, du."  [F]
9. [8] `goto({ to: 'cabinDoor', radius: 2.0, text: 'Gå ombord – gate 8' })`
   - **Guide** (Phase 3 r3, `via(goto(…), ['bridgeMouth'])`): to the lounge side of the jet bridge's
     opening first, then down the bridge. Aimed straight at the plane's door, the arrow pointed into
     the window wall 2 m north of the opening, where an arrow-follower stayed pinned for 60 s. On
     the guide it boards in 3.9–4.9 s from where the queue ends, the cluster, north of the back
     bench row, north of the desk, the lounge's east end and its south side (6 of 6). Untimed.

**Outro** (`outroPlace: { majsan: ['bridge', 0.55, 1.4, -2.79], siv: ['bridge', -0.15, 0.2, -1.04], stig: ['bridge', -0.55, 1.4, -0.35] }`, `outroCam: { at: 'bridgeCam', dist: 0, height: 1.9 }`; first line
cue `{outfit: {who: 'stig', name: 'kostym'}}` — he hands his coat in). On the jet bridge (Phase 3
r2): Stig and Majsan face each other across the 2 m tube, both turned 20° to the lens, Siv between
them 1.2 m further up it, turned to Majsan; the eye-level camera at the plane end looks up the
bridge to the `GATE 8` sign. The dollhouse saw them from 51–61° above, with Stig under the door
frame and Majsan behind Siv (the r2 `frame` fix turned their faces to the lens but kept it steep).
After the outro Stig stands on the bridge, 5 m from the stewardess (mission 2's giver).
- majsan: "Nämen… hejsan!"  [F](t)
- stig: "Jaså, vi kom på samma resa."  [F](t)
- siv: "Jag dör! Såg du vad han stötte på dig? Han som såg ut som en giraff."  [F]

---

### 8.2 · index 1 · `ombord` · "Rad 13 finns inte" · `vardinna` @ `cabinDoor` · flight · 250

Fun: find your seat against the clock past passengers stowing their luggage in the aisle (and
discover there is no row 13), then survive the takeoff in your seat with the mantra while the gear
goes DUNS.

The cast is already seated (`HOMES.flight` from index 1 on, §4.2) although the phase is still `gate`.

**Intro** (the first line's cue stages it, Phase 3 r2: `{place: {vardinna: ['cabinDoor', -0.8, -0.15, 3.49], stig: ['cabinDoor', -0.8, 1.15, -0.35]}, cut: {at: 'doorCam', dist: 0, height: 2.0}}` — at the open front door, forward of the galley curtain: she by the coat closet, Stig just in, facing each other along the cabin and turned 20° to the lens, which looks across from the galley worktop with the door and the jet bridge between them; held to the end of the intro. The dollhouse showed her back and Stig's hair under the door frame; from the aisle, the curtain rail (y 2.24, at the head height of the 2.6 m Stig) crossed both faces. The seat dash starts from Stig's spot, (1.6, 13.55)):
- vardinna: "God morgon och välkommen ombord!"  [N]
- stig: "Fjorton B… Efter rad tolv kommer väl rad tretton?"  [N]
- vardinna: "Inte hos oss. Fjorton B ligger mitt i planet."  [N]
- vardinna: "Skynda dig – vi ska taxa ut."  [N]

**Stages:**
1. `sit({ seat: '14B', timer: 7, text: 'Hitta plats 14B och sätt dig', failText: 'Planet kunde inte taxa ut. Kaptenen väntar på dig!', startCue: { phase: ['gate', { instant: true }], seatbelt: true, blockers: true }, doneCue: { blockers: false } })`
   - Seatbelt sign lit (standing +1.5/s). **Luggage stowers** in the aisle at rows 3, 8 and 12
     (P0, §5.12: E "Ursäkta!" moves them; bumping costs fear). Aisle walkers (P1). Crossing
     **lz −1.4** going aft (the midpoint between row 12's seats at −1.02 and row 14's at −2.22) the
     first time shows the toast `Rad 13 finns inte!` [N] (cabin-owned, once per load).
   - **Guide** (Phase 3 r2, the §8.1 [3] decorator: `via(sit(…), ['cabinRow1', 'cabinRow14'], 0.5)`):
     the beacon and arrow lead into the aisle at row 1 (0, 12.6), down it past the stowers to row 14,
     then to 14B, the `calibflight` route. Aimed straight at 14B from the dash start, the arrow ran
     down the A/B seat column, and an arrow-follower (E on every "Ursäkta!") stuck on row 1's seats
     for the whole 7 s, 2 of 2. On the guide it sits down in 3.1 s, 2 of 2. The aisle waypoint is
     passed within 0.5 m: at the default 1.5 m it was passed 1.5 m short and the arrow cut the corner
     into row 1's C seat. No timer change (`FLIGHT=ombord calibflight`: sprint 3.1 s, walk 4.4 s).
     From a seat row's legroom in rows 1–12 (stepping into row 3 or 12 past a stower, or into row 1's
     by the door on a diagonal from it) the arrow points into the aisle beside him, then down it to
     row 14; from row 15 behind 14B it points at 14B, where E reaches 14B (§8.1 [3]: Phase 3 r3 it
     aimed at row 1 from the legroom; r3 repair looked over the seat backs at row 14, and an
     arrow-follower slid along the seat back ahead and stalled on its aisle end, 13 of 72 legroom cells,
     up to 7.4 s from row 1's door corner, where the arrow pointed aft over row 1's C seat; r3 repair2
     leads onto the aisle first: 0 stalls, every cell faster). Beside a stower (rows 3, 8, 12) the
     aisle point is where he stands, and "Ursäkta!" is offered there.
2. `timeline({ checkpoint: true, retryAt: 'cabinRow14', seat: '14B', lockSeat: true, panicFails: true, oleBarks: true, secs: 27, text: 'Starten! Håll J om det blir för mycket', barLabel: 'STARTEN', events: [...] })`
   (times in scaled seconds; the cabin phases run on the same clock; `lockSeat` hides "Res dig"
   and ignores R for the stage, so time never pauses while the phases run on)
   - t 0: `{phase: 'takeoff', toast: 'Håll <b>J</b>: Jag kan flyga, jag är inte rädd'}`
   - t 10: `{sfx: 'thud', fear: 20, shake: 0.4, say: ['stig', 'Vad är det för ljud?', 1.5]}`  [F](t)
   - t 11.5: `{say: ['ole', 'Landingshjulene som går opp. Hydraulikk, vet du.', 2.4]}`  [F](t)
   - t 14: `{say: ['ole', 'De går opp sånn, og så lukker lemmene seg. Så flyet ikke skal stoppe, men få fart. Ellers…', 3.4]}`  [F*](t) (Ole's Norwegian "Ellers…" = the Swedish subtitle's "annars…"; the speaker is uncertain in the sources)
   - t 17.5: `{say: ['stig', 'Annars…?!'], fear: 8}`  [N] (echoes the subtitle's "annars…")
   - (t 12–20: phase `climb` runs by itself: whiteout puffs, 3 bumps)
   - t 20: phase `cruise` begins (automatic)
   - t 21: `{say: ['majsan', 'Titta, solen!'], applause: 2.5, relieve: 30, seatbelt: false}`  [F](t)
   - done at t 27.

**Outro** (seated, cruise; outro camera `player`; the Concorde dream is film row 10, before the
captain's PA and the juice gag of mission 3):
- ole: "Hva er det for et merke du har?"  [F*](t)
- stig: "Hammarby. Känner du till Hammarby?"  [F]
- ole: "Eneste svenske byene jeg kjenner til er Stockholm og Göteborg og Malmö."  [F](t)
- stig: "Det här är ett fotbollslag."  [F]
- ole: "Min drøm er å fly med Concorde fra Paris til Rio. 2 300 km i timen. Det er flyging!"  [F](t)
- ole: "Tre ganger så fort som en geværkule."  [F](t)
- stig: "Usch…"  [F](t)
- ole: "Og så Rio! Stranda, jentene og samba."  [F](t)
  (The sources do not say for sure who speaks the Concorde exchange, research-flight.md row 11.)
- stig: "Kanarieöarna är inte så dumt heller."  [F](t)
- ole: "Det får duge."  [F*](t)

---

### 8.3 · index 2 · `juice` · "Mer juice" · `ole` (seated 14A) @ `cabinRow14` · flight · 300

Fun: the film's best-known gag as an interaction, then a trolley-dodging, turbulence-surviving
juice run down the aisle.

Phase `cruise` (stage 1 `startCue`). Trolley running (stage 2 `startCue: { trolley: true }`). The
player talks to Ole from the aisle (giver talk is not offered while seated, §14.3) and sits down
for stage 1.

**Intro** (Stig in the aisle at row 14; a PA chime first):
- kapten: "Mina damer och herrar, det är kapten. Vi flyger just nu ut över Atlanten."  [F]  {pa: true}
- kapten: "Vi beräknas landa om en timme och 35 minuter. Vädret i Las Palmas är bra – soldis och 22 grader varmt."  [F]
- kapten: "Jag kan även meddela att Stenmark ligger trea efter första åket."  [F]  {applause: 2}
- stig: "Du, om man vill ha lite mer juice?"  [F]
- ole: "Ja, da trykker du der oppe."  [F*]

**Stages:**
1. `interact({ at: 'call14', whileSeated: true, seat: '14B', prompt: '<b>E</b> Tryck där uppe', text: 'Sätt dig på 14B och tryck på knappen ovanför', startCue: { phase: ['cruise', { instant: true }] }, useCue: { sfx: 'pling' }, lines: [...] })` — on use the `useCue` fires, then (the cup goes up on "Ja.", as in the film, so "Nei…!" answers it; a cup raised on the press as well would end under the punchline when the lines go quickly; Phase 3 r2: `cupHeld`, the paper cup in his hand, where `cupUp` raised an empty fist; Phase 3 r3: the stage's `seat` gets the seat priority, §5.10, so "E Sätt dig" from the aisle at row 14 offers 14B: it offered 14C, where the objective said "Sätt dig på 14B!" and "Res dig" put him back on the same spot):
   - ole: "Nei…"  [F*](t)
   - stig: "Där?"  [F]
   - ole: "Ja."  [F]  {anim: {who: 'stig', flag: 'cupHeld', secs: 6}}
   - ole: "Nei…!"  [F*](t)  {anim: {who: 'ole', flag: 'laugh', secs: 3}}
   - ole: "Så… så kommer flyvertinnen. Juice, whisky."  [F*]
   - stig: "Hon har visst fullt upp."  [N]
2. `interact({ at: (g) => g.cabin.trolleyEnd(g), radius: 1.3, enabled: g => g.cabin.trolleyStopped, prompt: '<b>E</b> Ta en juice', text: 'Hämta juicen vid serveringsvagnen – men akta tårna!', checkpoint: true, startCue: { trolley: true } })`
   (`cabin.trolleyEnd(g)` = the trolley end nearest the player, §5.8; `interact` re-reads a
   function `at` every frame through `addInteractable({ pos })`, §14.3.)
   Bubbles (shipped as a stage wrapper in missions/flight.js, not `timedCues`: they start when the trolley stands at row 6 and the player is within 7.5 m of Angerud in 6C; `pax` speaks from a passenger bust across the aisle; the wrapper calls `cabin.skipRowSixBark()` from the stage's first frame, so the cabin's own row-6 bark (§5.12) does not open the complaint a second time, Phase 3 r2) while the trolley serves near row 6: angerud "Kallar ni det här 'varm middag'? Så ser
   det inte ut när jag flyger reguljärt." [F](t) · angerud "Jag har inte fått resan gratis. Jag har
   betalat 3 000 för den." [F](t) · pax "Jag betalade bara 995. Sista minuten." [F](t) · angerud
   "Det fattades bara det…!" [F](t)
3. `carry({ item: 'juice', to: 'cabinRow14', radius: 1.2, text: 'Bär juicen till 14B – gå, spring inte!', failText: 'Du spillde juicen!', failOn: { bumped: true, sprintSecs: 1.0 }, startCue: { turbulence: [0.6, 5, { delay: 2 }] } })`
   - Hold Space through the turbulence; getting bowled by the trolley, falling or PANIK
     (`onPanicIdle` sets `bumpedT`) spills it.
4. `sit({ seat: '14B', text: 'Sätt dig och njut av juicen', doneCue: { relieve: 30, sfx: 'pickup' } })`

**Outro** (seated):
- ole: "Neste gang trykker du og venter, Stig-Helmer."  [N]
- stig: "Usch…"  [F*]

---

### 8.4 · index 3 · `sprit` · "Medhavd sprit" · `vardinna` @ `galleyBack` · flight · 300

Fun: a scramble for rolling bottles in a moving aisle while turbulence tips them back and forth
and the trolley keeps coming.

`extra: []` (Berra/Robban stay seated at 22C/D). Phase `cruise` (stage 1 `startCue`). Trolley running.

**Intro:**
- vardinna: "Tack. Det är förbjudet att dricka medhavd sprit."  [F]
- vardinna: "Tar du det inte lugnt med spriten, kan det bli problem att komma in i Spanien."  [F]
- berra: "Ta det vackert, vi har varit ute och flugit förr."  [F]  {cut: {at: 'row22Cam', dist: 0, height: 3.6}}
- vardinna: "Och resten av flaskorna rullar runt i hela planet."  [N]  {cut: null}
- stig: "Jag tål inte starksprit."  [F*]
- vardinna: "Då är du rätt man."  [N]

**Stages:**
1. `collect({ kind: 'flaska', motion: 'roll', items: [{x:3000.2,z:9.0},{x:2999.8,z:2.5},{x:3000.3,z:-6.0},{x:2999.7,z:-10.5},{x:3000.0,z:-13.5}], radius: 0.9, timer: 13, text: 'Fånga flaskorna som rullar i gången', barLabel: 'FLASKOR', failText: 'Flaskorna rullade in under sätena.', startCue: { phase: ['cruise', { instant: true }], trolley: true }, timedCues: [[1.5, {turbulence: [0.5, 3]}], [8, {radio: ['pa', 'Herr Storch ombedes kontakta kabinpersonalen.'], pa: true}]] })`
   - `roll`: bottles slide along the aisle (|x| ≤ 0.45) at 0.6–1.4 m/s, bounce at z +12.5 / −16,
     roll out from under the serving trolley towards the player's side (Phase 2: a bottle beyond a
     trolley stopped at a row was out of reach for 20–45 s), get kicked ±1.5 m/s by every
     turbulence jolt (`cabin.onJolt`); touching collects one.
   - PA line [F]: the film's cabin PA [SUB-SV 00:25:43]. Seatbelt on during the turbulence (standing costs fear; hold Space).
   - **Turbulence inside the sweep (Phase 3 r2)**: warned at 1.5 s, shaking 3.0–6.0 s (three
     jolts that kick the bottles), so every sweep meets it. Until r2 the cue sat at 20 s, past the
     measured 11 s timer (timed cues run on scaled stage time, the timer on real time, so only test
     mode ever saw it). Re-measured with `FLIGHT=sprit SPRIT_RUNS=36 calibflight`, the sweeper
     holding Space only while it shakes: 36 clean sweeps 5.5–7.8 s, median 7.4, p75 7.6 → T_ref
     10.1 → timer **13** (90 % range 13–13); a careful sweeper's FLYGRÄDSLA peaks at 12–17. The
     pool (`notes/calibration-samples.md`, `node tools/pool.mjs`) has since grown to 101 sweeps on
     the same stage and sweeper code (r2's 5 more, the r2 gate's 5, r3 flight-flow's 10, r3
     flight-look's 5, r3 flight-trolley's 10, r3 repair-flight's 5, r3 gate 1's 5, r3 ledger's 5,
     r3 gate 2's 5, the verify2 of r3 repair-flight's 5, r3 repair2-flight's 5): 5.4–7.8 s, median
     7.32, p75 7.60 → still **13** (90 % range 13–13).
2. `goto({ to: 'galleyFront', radius: 1.6, text: 'Lämna flaskorna i främre byssan' })`

**Outro** (`outroPlace: { stig: ['cabinRow14', 0, 0] }`, `outroCam: ['ole', 'stig']`; Berra at row 22, then back at row 14, where Ole has his boombox on his lap: outfit `flygRadio`, §2.2; the next mission's home set gives him `flyg` again):
- berra: "Ja, vad fan, man var ju nykter i morse, men nu börjar det ordna upp sig!"  [F*] (Arlanda line, relocated)  {cut: {at: 'row22Cam', dist: 0, height: 3.6}, outfit: {who: 'ole', name: 'flygRadio'}}
- stig: "Är den bra den där?"  [F]  {cut: null}
- ole: "Ja… Kvarts og digital. Level her, input, FM, tape, tape run."  [F]
- ole: "Hører du? Samba."  [F]  {music: {tune: 'samba', secs: 6}}
- stig: "Fin musik!"  [F](t)
- pax: "Sch…"  [F](t)

---

### 8.5 · index 4 · `landning` · "Inflygning Las Palmas" · `majsan` (seated 16E) @ `cabinRow16` · flight · 400

Fun: overhear that you are worth "four points", round up the passengers who won't sit down before
the sign goes red, race back to 14B, then hold the mantra through a bumpy approach until the wheels
touch Gran Canaria.

Phase `cruise` at start (stage 1 `startCue`). After the outro: **handover to the island** (§5.13).

**Intro** (Stig in the aisle by row 16, overhearing the sisters; in the film the points scene comes
just after takeoff, ~0:23, so every line is relocated `[F*]`, and the siv/majsan split is ours):
- siv: "Pizza-racern, då? Han får fem poäng."  [F*](t)
- majsan: "Sex, tycker jag."  [F*](t)
- siv: "Giraffen, då? Fyra."  [F*](t)
- majsan: "Mindre än pizza-racern?"  [F*](t)
- siv: "Han är så bortkommen. Det blir minuspoäng."  [F*](t)
- stig: "…Fyra?"  [N]
- kapten: "Vi har påbörjat inflygningen mot Las Palmas. Var vänliga och fäst säkerhetsbältena."  [N]  {pa: true, seatbelt: true}
- vardinna: "Alla ska sitta! Hjälp mig få folk på plats, är du snäll."  [N]  {cut: {at: 'galleyCam', dist: 0, height: 3.6}, trolley: 'park'} (Phase 3 r2: she stands at the front galley, 16 m behind the row-16 shot's lens, and spoke off screen; the cut looks forward along the aisle to her, the `row22Cam` recipe, and holds to the end of the intro. She is not placed in the aisle: the timed round-up runs both ways from row 16. Phase 3 r3: the trolley is parked in the galley behind her on this cut, which hides the move; see stage 1.)

**Stages:**
1. `collect({ who: ['herrStorch', 'jose', 'berra'], standAt: { herrStorch: [3000.2, 3.4], jose: [2999.8, -9.2], berra: [3000.0, -14.4] }, seatOnTouch: true, timer: 12, text: 'Få de stående passagerarna att sätta sig', barLabel: 'STÅENDE', failText: 'Värdinnan fick göra det själv.', lines: {...}, startCue: { phase: ['cruise', { instant: true }], trolley: 'park', seatbelt: true } })` (the intro's PA lights the sign; `seatbelt: true` relights it on a retry, which has no intro, so standing costs fear there too). **The trolley is parked** in the front galley for the whole mission (Phase 3 r3, the user's own play: §5.8 `parkTrolley`, re-applied by a checkpoint retry, §9.4 item 3). `trolley: false` froze it where the intro had caught the auto trolley (it runs in cruise from mission 3): anywhere between Herr Storch (z 3.4) and Berra (−14.4) it walled off one of them, with the pusher, for the 12 s and for every retry, and the 14B dash inherited it (a probe: the trolley caught on its way to row 19, at z −6.5, Stig stuck at −4.9 behind the pusher, failed twice). The timers stand: `calibflight` logs the trolley, and the shipped measurement had it frozen at z 15.7 in the front galley, as parked now (round-up 7.62 / 6.9 s, back to 14B 1.3 / 3.2 s). No turbulence here (Phase 3 r2): the `timedCues: [[12, {turbulence: [0.3, 4]}]]` shake fired on the frame its 12 s timer failed (timed cues run on scaled stage time, the timer on real time, so only test mode ever saw it); the approach (stage 3) is the mission's turbulence. Measured times unchanged (the clean round-up, 7.6 s, never reached the cue).
   - herrStorch: "Lite film."  [F*](t) (Arlanda line)  {anim: {who:'herrStorch', flag:'film', secs:2}}
   - jose: siv "Vad skönt att komma bort!" [F*] then jose "Jag ska inte bort, jag ska hem." [F*] (mid-flight in the film, relocated)
   - berra: "Ska vi inte landa snart?"  [N]
2. `sit({ checkpoint: true, seat: '14B', timer: 5, text: 'Skylten lyser! Tillbaka till 14B', failText: 'Alla måste sitta vid landningen.', startCue: { seatbelt: true } })` (the intro already lit the sign; a retry re-lights it)
   - **Guide** (Phase 3 r3, `via(sit(…), ['cabinRow14'], 0.5)`, the §8.1 [3] decorator): up or
     down the aisle to row 14, then into 14B, the `calibflight` route. Aimed straight at 14B, the
     arrow cut across the seat rows: an arrow-follower wedged on row 11's seats from the front and
     row 16's from the back and failed 6 of 6 from the three round-up ends (Herr Storch, José,
     Berra; the retry from row 16 had the same line). On the guide it sits in 0.9–2.2 s, 6 of 6, and in 0.4 s from
     the retry, which now faces the guide (§9.4 item 3; the `cabinRow16` spot faces row 16's
     seats). No timer change (`calibflight`: from Berra 3.2 s, from Herr Storch 1.3 s).
3. `mantra({ seated: '14B', secs: 8, panicFails: true, text: 'Inflygning! Håll J – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA', startCue: { phase: ['approach', { hold: true }], turbulence: [0.75, 14] }, fillCue: { phase: 'landing' }, waitPhase: 'landed' })`
   - The approach plays its 14 s and then **holds** at its end state (no auto-chain) until the bar
     is full. The bar fills only while J is held; `fillCue` is applied when it fills, and its
     `phase` only if `cabin.phase === 'approach'` (never replays a touchdown). The stage completes
     when the bar is full **and** `cabin.phase === 'landed'` (landing runs 6 s after the bar is
     full).
   - Standing in the aisle (he stood up), "E Sätt dig" offers 14B: `seated` is the stage's seat
     (§5.10; Phase 3 r3, it offered the nearest free seat, 14C).

**Outro** (`landed`; outro camera `player`):
- berra: "Om de kraschar, kastar man tomater på piloterna då?"  [F*](t)  {applause: 3, cut: {at: 'row22Cam', dist: 0, height: 3.6}}
- robban: "Nej, skärpning nu, Berra, annars får vi ena jävla problem här."  [F]
- ole: "Ser du, Stig-Helmer? Hydraulikk, vet du. Helt normalt!"  [N]  {cut: null}

Then `transitionTo('island')`.

---

### 8.6 · index 5 · `buss17` · "SunTrips buss nummer 17" · `lasse` @ `airport` · island · 500

Fun: you are suddenly driving a 10 m coach full of people with "anlag för åksjuka": take corners
gently while Lasse's welcome speech plays. Ends in the overbooked hotel and Ole's clothes.

`extra: [['ole', 2.5, 1.0], ['siv', -3.0, 2.0], ['majsan', -3.8, 2.4], ['jose', 4.5, 3.0], ['mamma', 5.3, 3.0], ['robban', -1.5, 4.0], ['berra', -2.2, 4.4], ['affe', 3.5, -1.0]]`
(`[key, dx, dz]` = placed at `at` with that offset while idle; §9.2). `idleAnim: { berra: 'slump' }`
(asleep while the mission waits, §9.4); the first intro line carries `{anim: {who: 'berra', flag:
'slump', secs: 20}}` so he sleeps through the intro too, and `cut: { at: 'airport', dist: -10,
height: 3.2 }`: a group shot of the whole arrivals crowd from the terminal side, facing them (a
negative `dist` stands the camera in front of the landmark, looking back), held to the end of the
intro (`begin()` ends the cut). Phase 3: the giver two-shot left Robban, Majsan and the Guardia
off screen and Siv's head in the lens.

**Intro:**
- robban: "Invalido."  [F]  {anim: …, cut: {at: 'airport', dist: -10, height: 3.2}, place: {lasse: ['airport', 0, 0, 5π/4], stig: ['airport', 1.2, 0.8, 3π/4], robban: ['airport', -1.5, 4.0, 2.75]}} (Lasse and Stig half turned to each other and the camera; Stig stood between the camera and Lasse)
- guardia: "Gracias."  [F](t) (portrait-only speaker: the Spanish officer at passport control)
- mamma: "¡Josito! ¡Josito!"  [F]
- mamma: "Inga svenskor!"  [F]
- siv: "Hälsa familjen."  [F]
- majsan: "Och hönsen!"  [F](t)
- lasse: "Några problem?"  [F](t)
- stig: "Min väska har inte kommit."  [F]
- lasse: "Den dyker upp. Det gör de alltid."  [N]
- lasse: "Affe, du får ta transfern."  [F*] (a hotel cutaway in the film, relocated)
- affe: "Va fan, jag hade ju natturen i natt! Jag har haft två grisfester i veckan."  [F*]
- lasse: "Olsson! Du ser ut som en man med körkort."  [N]
- lasse: "SunTrips buss nummer 17 står där borta!"  [F](t) (the research names no speaker)

**Stages:**
1. `getInCar({ car: 'buss17', atHome: true, any: false, passenger: 'ole', riders: ['majsan', 'siv', 'fruStorch', 'herrStorch'], hideRiders: true, lockMeter: true, text: 'Hoppa in i SunTrips buss nummer 17' })`
   (`passenger` is seated in the bus at init; `riders` are decorative window busts and
   `hideRiders` hides those NPCs for the mission so nobody appears twice. `atHome` (Phase 3)
   puts the bus back on its bay at init: a retry starts at `airport` with the bus where the
   timer's T_ref assumes it, not wherever the failed drive left it.)
2. `goto({ to: 'flamencoDrive', radius: 12, inCar: true, passenger: 'ole', stop: true, timer: 54, failText: 'Gästerna missade välkomstdrinken.', smooth: { label: 'ÅKSJUKA', failText: 'Någon blev åksjuk i bussen!' }, text: 'Kör gruppen till Hotell Flamenco – mjukt!', radio: [...] })`  ([N] for the texts)
   radio (`[who, text, {gap}]`, gap = seconds after the previous line):
   - lasse: "Hjärtligt välkomna till Nueva Estocolmo och SunTrip!"  [F]  {gap: 3}
   - lasse: "Klockan är tre spansk tid – alltså en timme tidigare än svensk tid."  [F]  {gap: 5}
   - lasse: "Ni bör inte dricka vattnet."  [F]  {gap: 5.5}
   - lasse: "Grisfesten är på torsdag och kostar 800 pesetas. Några frågor?"  [F]  {gap: 3.5}
   - fruStorch: "Finns det svenskt kaffe på hotellet?"  [F]  {gap: 4}
   - lasse: "Ja."  [F]  {gap: 2}
   - ole: "Norsk, da?"  [F]  {gap: 1.5}
   - lasse: "Ja."  [F]  {gap: 1.5}
   - siv: "Majsan, en niopoängare!"  [F]  {gap: 3}
   - stig: "Jag har lite anlag för åksjuka."  [F](t)  {gap: 3} (research: the speaker is interpreted; the subtitles give Majsan the travel sickness on the bus)
   - ole: "Jeg har reisesyketabletter."  [F](t)  {gap: 2.5}
   - stig: "Jättefint! Tack. Du kanske vill ha en Argotal av mig. Mot allergi…"  [F](t)  {gap: 2.5}

   (Phase 3 r2: the lines run 3–37 s, inside a clean drive (T_ref 45 s; a bold one ≈ 42 s), and
   every toast is up for its full reading time with at most three at once. A radio stops with its
   stage, and the old spacing (4–63.5 s) cut the last four lines from every successful run, the
   åksjuka exchange that sets up the ÅKSJUKA bar among them: the autopilot heard 8 of 12 at 44.8 s;
   now 12 of 12.)

**Outro** (`outroPlace: { lasse: ['flamencoRecepcion', 1.5, 1.5], portier: ['flamencoRecepcion', 0, 0], ole: ['flamencoRecepcion', -1.4, 4.4], stig: ['flamencoRecepcion', 0, 3.0] }`; the player ends the drive at `flamencoDrive`, 42 m away, so `stig` moves him to the desk; Ole stands off the camera-to-Stig line, Phase 3):
- lasse: "Det har dessvärre uppstått ett litet problem på grund av överbokning."  [F](t)
- lasse: "Olsson, Stig-Helmer… och Bramserud, Ole… Kan ni dela rum?"  [F*](t) (shortened: the subtitle opens "Jag undrar om", research-plot §7.3)
- stig: "Ja…"  [F]
- stig: "Kallar ni det här för havsutsikt?"  [F](t)  {cut: {at: 'rum107Cam', dist: 5.5, height: 2.1}, place: {stig: ['flamencoPatio', 0, -2.4, 0], portier: ['flamencoPatio', 1.3, -1.2, -0.25], ole: ['flamencoPatio', -1.6, -3.6, 0.3]}}
- portier: "Momento."  [F]  {anim: {who: 'portier', flag: 'mirror', secs: 3}}
- ole: "Litt lenger inn mot veggen. Snu den litt mer mot meg. Sånn ja… Kom og hør nå! Fin lyd."  [F]  {place: {portier: ['flamencoRecepcion', 0, 0]}}
- ole: "Du kan ikke gå sånn her nede! Den buksa og det slipset! … Shorts."  [F]
- stig: "Är den inte lite skrikig?"  [F]
- ole: "Du skal ha sterke farger, du som er mørk."  [F]  {outfit: {who: 'stig', name: 'hawaii'}, flash: 'white', sfx: 'helanGar'}

(Phase 3: from "havsutsikt" on, the outro plays in Stig and Ole's room 107, as in the film: the
`rum107Cam` cut stands on the patio front looking into the room, Stig in the doorway, the porter
beside him holding up his mirror to show the sea, Ole inside with his boombox (research-plot §7.3:
"Ole möblerar för bergsprängaren"); the porter goes back to the desk on Ole's line and the cut
holds to the end. The film's room 113 balcony cut showed the porter alone at Angerud's room.)

---

### 8.7 · index 6 · `friskotek` · "Plocka kulor!" · `lasse` @ `friskotek` · island · 500

Fun: the welcome meeting as a short cinematic, then chasing the wind-blown beach balls round the
SunTrip lawn and pool while Berra and Robban heckle; ends with "Hä-pååre!".

`extra: [['affe', -4, -6], ['gabbe', 4, -6], ['ole', -1.5, 3], ['siv', -3, 4], ['majsan', -4, 4], ['fruStorch', 3, 4], ['herrStorch', 4, 4]]`

**Intro:**
- lasse: "Välkommen till våran ö, sluta tänk på regn och snö!"  [F] (one spoken line of the song)
- lasse: "Vi befinner oss i höjd med Egypten och 500 mil hemifrån… som väl är."  [F]
- lasse: "Jag heter Lasse och har hand om SunTrips friskotek. Friskoteket börjar halv tio varje morgon."  [F]
- lasse: "Sträck upp höger hand, lägg vänster hand på hjärtat och säg efter mig: Jag lovar att bli en sundare och friskare människa under semestern."  [F]  {anim: {who: 'stig', flag: 'oath', secs: 4}}
- stig: "Jag lovar att bli en sundare och…"  [F*]
- siv: "Gud, vad han är söt!"  [F]  {cut: {at: 'friskotek', dist: 6, height: 2.4}, place: {lasse: ['friskotek', 0, 1.5, π], stig: ['friskotek', −1.0, 2.6, 2.5], siv: ['friskotek', −2.3, 1.3, π], majsan: ['friskotek', −3.2, 1.6, π], fruStorch: ['friskotek', 1.7, 2.3, −2.6], herrStorch: ['friskotek', 2.6, 2.5, −2.6], ole: ['friskotek', 3.6, 2.0, −2.6]}} (Phase 3 r2: from here the outro's group shot, everyone who speaks facing it, held to the end of the intro; the giver two-shot followed the arrival, and Fru Storch said her line off screen with her back to the lens, Siv too from some sides. The balls start from Stig's spot here, so the stage was re-measured, §8 table)
- lasse: "Finns det en familjen Stork här?"  [F](t)
- fruStorch: "Vi heter faktiskt Storch, inte Stork."  [F]
- lasse: "Till brudparet från Rutan och Nisse: Heja på och tappa inte orken, för om nio månader kommer storken."  [F](t) (research-plot §7.4 names no reader)  {applause: 2}
- lasse: "Och nu – friskotek! Men vinden har tagit badbollarna!"  [N]

**Stages:**
1. `rabbits({ mesh: 'badboll', count: 6, near: 'friskotek', rMin: 6, rMax: 30, timer: 23, text: 'Plocka kulor! Plocka med höger… plocka med vänster!', barLabel: 'KULOR', gotText: 'Plocka med höger!', failText: 'Bollarna rullade ner till stranden.', radio: [['berra', 'Kolla storken!'], ['robban', 'Att de bara orkar, våra storkar…']] })`
   text [F]; gotText [F*]; failText [N]; radio [F](t) ×2 (the research does not say who).
2. `goto({ to: 'friskotek', radius: 5, text: 'Lämna bollarna till Lasse' })`

**Outro** (`outroPlace: { lasse: ['friskotek', 0, 1.5, π], angerud: ['friskotek', 1.6, 2.4, -2.4], berra: ['friskotek', -2.4, 1.0, π], robban: ['friskotek', -3.4, 1.4, π], ole: ['friskotek', 2.8, 1.0, π], stig: ['friskotek', -1.0, 2.6, 2.5] }`, `outroCam: { at: 'friskotek', dist: 6, height: 2.4 }`: everyone who speaks in one group shot from the north, facing it; Phase 3: Berra, Robban and Ole spoke from 60–86 m away and the two-shot side was arbitrary):
- lasse: "Ni lufsar som troll!"  [F*](t)
- berra: "Fan… Herr Ober? De har inte öppnat än. Klockan är ju snart tio."  [F]
- robban: "Ska vi inte käka frukost först?"  [F]
- berra: "Det gör vi här. Bacon och ägglikör."  [F]
- angerud: "Ska du ta och springa upp på rum 113 och hämta mina röka?"  [F]
- lasse: "Ja, du, det ingår inte i mina åtaganden."  [F]
- angerud: "Då skulle jag vilja prata med platschefen."  [F]
- lasse: "Tja, det är ju jag, det…"  [F]
- angerud: "Du vet att jag känner chefen för SunTrip?"  [F]
- lasse: "Ja, det gör jag med. Hälsa från mig. Hä-pååre!"  [F]
- angerud: "Det är sista gången jag åker med SunTrip!"  [F]
- lasse: "Hajar i poolen? Delirium – ring kliniken."  [F*] (a phone call in the film)  {toast: 'Hajfenor <b>0/7</b> – sparka dem i poolerna!'}
- ole: "Bagen min revnet på bussen – dingsene mine er spredt over hele øya!"  [N]  {toast: 'Oles prylar <b>0/7</b>'}

---

### 8.8 · index 7 · `asnan` · "Caballo folklorístico" · `ole` @ `flamenco` · island · 600

Fun: Ole haggles like a smålänning (a timing minigame), a hunt for the right crispbread packet,
then a nervous drive with a wet-painted donkey on board.

**Intro:**
- stig: "Det var julmat – i julklappen. Och väskan är borta."  [F*]  {cut: {at: 'flamenco', dist: 6, height: 2.2}, place: {ole: ['flamenco', 0.8, 0.4, 1.07], stig: ['flamenco', −0.8, 0.4, −1.07]}} (Phase 3 r3: a fixed porch shot from the pool deck, held to the end of the intro, the two half turned to each other under the pergola with the reception behind; walking straight from the island spawn to Ole put the giver two-shot's eye 0.85–0.93 m from the reception porch's west post, which has no collider, so `clearSide` never rejected that side, and the post filled 15–30 % of the frame on every line)
- ole: "Tenk ikke mer på det. Vi fikser en ny julegave."  [F]
- stig: "Undrar vad dalahäst heter på spanska."  [F]
- ole: "Cabalho folkloristico…"  [F]
- ole: "Det fikser vi. Vi fikser alt!"  [F]

**Stages:**
1. `getInCar({ text: 'Hoppa in i en bil' })`
2. `pickup({ who: 'ole', name: 'Ole', at: 'flamencoDrive', hello: 'Til markedet!' })`  [N]
3. `goto({ to: 'marknad', radius: 9, inCar: true, passenger: 'ole', text: 'Till marknaden' })`
4. `haggle({ at: 'asnestand', who: 'souvenir', partner: 'ole', start: 500, steps: [400, 300, 200], zones: [0.30, 0.23, 0.17], speeds: [0.7, 0.95, 1.2], maxMiss: 3, pay: 200, text: 'Pruta! Tryck E när markören är i det gröna', barLabel: 'PRIS', failText: 'Säljaren stängde ståndet.', lines: {...} })`  (texts [N])
   - `start`: souvenir "Hallå där!" [F] · ole "Hvor mye?" [F*](t) · souvenir "500 pesetas." [F] · ole "To hundre?" [F*](t)
   - `hit[0]`: ole "Jeg gir deg to hundre. Det er… 18 norske kroner." [F*] (SUB-NO has only the first sentence) · souvenir "400 pesetas. Titta, den är jättelustig." [F]
   - `hit[1]`: ole "Så morsom er den ikke. To hundre." [F*] · souvenir "300 pesetas! Sista pris!" [N]
   - `hit[2]`: ole "To hundre er siste bud." [F]
   - `miss`: souvenir "¡No, no, no!" [N] (price +50, shown on the bar)
   - `win`: ole "Første, andre, tredje – to hundre pesetas!" [F*](t) · souvenir "Kör till." [F](t) · souvenir "Por favor." [F](t) · souvenir "Jävla smålänningar!" [F]
   - On win: `game.pay(200)` (Ole pays if short: radio ole "Jeg spanderer!" [N]).
   - `checkpoint: true, retryAt: 'asnestand'` (Phase 3 r2): a first go wins about half the time
     (σ 60 ms, §8 "Races and chases"), and a lost haggle retried from `flamenco` on foot: a new car,
     Ole picked up again, the market drive. Now the retry is on foot at the stall; the car stays
     where he parked it (`lastCar`, which the arrow shows once he has the donkey), Ole steps up
     beside him again (`bringPartner`), and the 200 is paid only on a win.
5. `grab({ at: 'asnestand', mesh: 'asna', text: 'Ta åsnan' })`
6. `goto({ to: 'supermercado', radius: 8, inCar: true, passenger: 'ole', text: 'Leta knäckebröd – samma sort som i julklappen' })`
7. `grab({ at: 'supermercado', mesh: 'knacke', text: 'Ta ett SPORT-KNÄCKE-paket', say: ['stig', 'Det är ungefär så här stort.'] })`  [F](t)
8. `scene({ frame: ['ole', 'stig'], lines: [['ole', 'Og så maler vi den rød.', { cut: 'ferreteria' }], ['stig', 'Och blommor där.']], doneCue: { flash: 'rgba(216,50,30,.4)', toast: 'Åsnan är nu en dalahäst. Nästan.' } })`  [F*](t) · [F](t) · toast [N]
   (played in the car in the Centro Nórdico lot right after the knäcke grab: `frame` alone keeps
   both seated, their positions are live, §9.2; the cut shows the FERRETERÍA front, so there is no
   separate drive 36 m down the mall. **Both lines play over the shop** (Phase 3 r2): the seated
   two-shot that "Och blommor där." went back to framed neither speaker, from a drive-in (Stig's
   head above the frame, Ole off screen), on foot (a 14 m shot of Stig's back) or at all (Ole
   behind the car body, Stig's head behind the lens). `scene` ends the cut.)
9. `goto({ to: 'vikingbar', radius: 7, inCar: true, passenger: 'ole', timer: 19, fragile: { label: 'SKICK', failText: 'Färgen blev förstörd!' }, text: 'Kör försiktigt till Viking Bar – färgen är våt!', checkpoint: true, retryAt: 'supermercado', retryCar: { at: { ...lm('supermercado'), yaw: 0 }, passenger: 'ole' }, startCue: { hide: ['angerud'] } })`  [N]
   (Phase 3: a checkpoint. A failed paint drive retries in the Centro Nórdico lot with Ole beside
   the player, facing the street, the calibrate start; it used to replay the market drive and the
   haggle, which pays the 200 again.)
   `startCue: { hide: ['angerud'] }` (Phase 3 r3 repair): his home is the bar door
   (`['vikingbar', 2.0, 1.0]`, 1.1 m from Stig's outro spot), so he stood there in plain view as the
   car pulled up and through the walk-up to the door, spoiling the outro's gag. He is hidden from the
   lot, three blocks from the bar, and a retry from this checkpoint hides him again. The fail screen
   keeps him hidden too (Phase 3 r3 repair2, §9.4 item 3: `fail()`'s placement put him back at the
   door, in view under "Tiden är ute!" when the timer ran out or the SKICK bar emptied on the last
   stretch); Q (give up) sends him home. He stands 2.2 m from `vikingbar` and the drive ends at 7 m,
   so the car can never reach him: the timer stands (§8 table).
10. `goto({ to: 'vikingbar', radius: 2.5, onFoot: true, text: 'Lämna paketet i baren' })`

**Outro** (`outroPlace: { carmencita: ['vikingbar', -0.8, 1.6, 0], stig: ['vikingbar', 0.9, 1.3, 1.75] }`, `outroHide: ['angerud']`, `outroCam: { at: 'vikingbar', dist: 6.5, height: 3.4 }`: one shot of the bar front from the street, high enough to see over a car parked at the door, held to the end; Carmencita faces it (Phase 3, she showed her back) and Stig stands side-on to her on the spot where Angerud stands later. Phase 3 r3: Angerud, placed there by `outroPlace`, stood between Stig and Carmencita while Stig handed the package in, before "Senare samma dag…", and Stig said his line three-quarters from behind; now the two never meet. Do not only drop Angerud from `outroPlace`: the giver two-shot then loses the VIKING BAR sign and the old `cut: null` went back to it with Angerud over Carmencita. Phase 3 r3 repair: the first line's `hide` came too late, since `complete()`'s placement put him back at his bar door, beside Stig and Carmencita, through the 1.6 s UPPDRAG KLART! wait; `outroHide` (§9.4 item 5) keeps him hidden from there, and stage 9's `startCue` before it):
- stig: "Ett paket till Viking Bar. Det är till en moster."  [N] (Angerud, whose home is the bar, hidden by `outroHide`)
- carmencita: "Jag lägger det bakom disken."  [N]  {toast: 'Senare samma dag…'}
- angerud: "Buenas dias, lilla vikingen. Har paketet kommit?"  [F]  {place: {stig: ['vikingbar', 4, -9, 0], angerud: ['vikingbar', 0.9, 1.3, 0]}} (Stig, who has left, out of the shot; Angerud where Stig stood, facing the street)
- angerud: "God jul, moster."  [F] (he reads the card)
- angerud: "Hur såg han som lämnade in det ut?"  [F]
- carmencita: "Han var lång, mörkhårig… hade glasögon och mustasch."  [F]
- angerud: "Då är det grönt."  [F] (the bar cut holds to the end: a `cut: null` would release the `outroCam`)

(The answering-machine call is Angerud's panic after he opens the package: it plays in the bodega
outro, in film order.)

---

### 8.9 · index 8 · `bodega` · "Pepes Bodega" · `berra` @ `flamencoBar` · island · 700 · `unlock: 'grisbil'`

Fun: Berra's navigation ("havet är där, då måste bodegan ligga ditåt") sends you to the beach, then
deep into the tomato fields; they hitch a pig truck, you tail it to the farm, the farmer lends you the
truck, you run a Guardia jeep into the ditch and drive the pigs home, arriving right under the PEPES BODEGA sign
nobody notices.

Hitch-hike logic (judge fix): Stig refuses the dirt road (åksjuka), drops them, **then** they hitch.

**Intro:**
- berra: "Det är ju fan vad solen tar här nere, Robban."  [F]  {place: {robban: ['flamencoBar', 1.4, −1.0]}} (Phase 3 r2: Robban steps back to the counter behind Berra's shoulder, (17.0, 13.4); beside him at his home spot the giver two-shot from the side put him in front of Berra on all four of Berra's lines. Checked from five arrival sides: neither covers the other)
- berra: "Ska vi ta Pepes Bodega i dag eller ska vi sola?"  [F]
- robban: "Men va fan, vi kan väl ta det lite lugnt! Vi har ju semester!"  [F]
- berra: "Vi är på södra Gran Canaria och havet är där, va. Då måste bodegan ligga ditåt."  [F]
- berra: "Du, terroristen, du har ju bil. Kör oss!"  [N]

**Stages:**
1. `getInCar({ text: 'Hoppa in i en bil' })`
2. `pickup({ who: 'berra', name: 'Berra', at: 'flamencoBar', rider: 'robban', hello: 'Ditåt!' })`  [N]
3. `goto({ to: 'playa', radius: 14, inCar: true, passenger: 'berra', text: 'Bodegan ligger ditåt – mot havet!', radio: [['robban', 'Fan Berra, ja ä tösstig.'], ['berra', 'Fan Robban, du har ingen karaktär!']], doneCue: { radio: ['berra', 'Ingen bodega här. Då ligger den åt andra hållet.'] } })`  [F] [F] · doneCue [N]
4. `goto({ to: 'vischan', radius: 14, inCar: true, passenger: 'berra', timer: 31, text: 'Leta inåt land', radio: [['berra', 'Det här är ju rena vischan. Vi måste ha kört för långt.'], ['robban', 'Fan, vad jag är törstig.']], overhear: [{ at: 'eslovVag', r: 40, radio: true, lines: [['berra', 'Heja Eslöv!'], ['robban', 'Herre jävlar!']] }], checkpoint: true, retryAt: 'playa', retryCar: { at: { x: 0, z: 236, yaw: 0 }, passenger: 'berra', rider: 'robban' } })`  [F*](t) (the film's "gått", said on foot) · [F](t) · [F] · [F](t) (research-plot §7.11 leaves the exchange unattributed)
   (Phase 3 r2: the overhear never started on the measured route, which came no nearer than 33 m
   to the rollerskier mid-lane at `eslovVag` (28, 4), r 25. `eslovVag` moved to the lane's south
   end, (27.5, 24) facing the z −120 road (§6.3), so the rollerskier stands where the drive passes
   him, and r 40 starts the exchange 2.8–4.6 s before the stop: both lines play while the stage
   runs, 2 of 2. A checkpoint: a failed drive retried from `flamencoBar` (the pickup and the beach
   drive again); now the car waits at the beach with Berra beside the player and Robban in the back,
   facing the promenade, the `calibrate` start, so the 31 s is the one measured; `CAL=vischan`
   on this code: 25.4 s ×3, timer 31.)
5. `dropoff({ who: 'berra', at: 'vischan', riderOff: true, text: 'Stanna vid tomatfälten' })`  [N]
6. `scene({ place: { stig: ['vischan', 2.0, −4.4, 2.03], berra: ['vischan', −0.2, −4.3, −2.0], robban: ['vischan', −1.7, −5.3, −2.4] }, cam: { at: 'vischanCam', dist: 0, height: 1.9 }, lines: [['stig', 'Jag kör inte längre på grusvägen. Jag har anlag för åksjuka.'], ['berra', 'Jag går inte en meter till. Vi liftar.']], doneCue: { toast: 'En grisbil stannar…' } })`  [N] · [F](t) · [N]
   (Phase 3: Stig steps out to refuse the dirt road; seated, the two-shot saw the car roof. Phase
   3 r2: the three stand on the track at the field's edge, Stig by the `CAMINO SIN ASFALTAR` sign
   facing Berra, Robban behind Berra's shoulder, seen from the track to the north looking back at
   the road the pig truck comes along; the two-shot followed the stop, showed Stig's back and put
   Robban in front of Berra. **Shipped as a stage decorator** `parkCar(stage, ['vischan', 0, 7,
   0])` in missions/island.js, not a kind option (the fixture carries the scene literal): at the
   scene's init the player's car parks on the track at (−234, −143), nose to the road, behind the
   camera, wherever he stopped it inside the dropoff's 9 m (unnamed parked cars there make room),
   so the shot never depends on the stop. The follow is untouched: the truck's start is its lane
   spot, and its tail starts once he is back in a car within 40 m of it, from 42.6 m here (a stop
   at the far end of the dropoff radius was ≈ 44 m; §9.2); `CAL=follow` checks the band.)
7. `follow({ type: 'grisbil', carName: 'grisbilFollow', driver: 'grisbonde', riders: ['berra', 'robban'], hideRiders: true, start: { lane: [[0, 2], [1, 2]], t: 12 }, via: [[1, 2], [1, 1], [2, 1]], to: 'grisfestGate', maxDist: 55, cruise: 15, wobble: 0.12, checkpoint: true, retryAt: 'vischan', retryCar: { at: { x: -234, z: -143, yaw: 0 } }, text: 'Följ grisbilen – Berra och Robban har liftat!', radio: [['robban', 'Fan, de luktar.'], ['berra', 'Skit i det. Vi slipper gå.', { gap: 4.5 }], ['robban', 'Snacka om grisfest.', { gap: 4.5 }]] })`  [N] · [F](t) ×3
   (Phase 3 r2: the lines at 8, 12.5 and 17 s of the tail, which takes ≈ 21 s; the follow's
   default 10 s spacing put the third at 28 s, after the radio had stopped.)
   (Phase 3 r3: a checkpoint. Losing the truck ("Du tappade bort Grisbonden!") or wrecking it
   before he is in (stage 8, "Du kvaddade Grisbondens bil!") retried from the vischan drive's
   checkpoint: the 31 s timed drive from the beach, the dropoff, the hitch scene and the tail
   again, for losing an untimed tail. Now the retry puts him at the wheel of the car he last drove
   (repaired; `retryCar` without `park`) on the vischan track where the scene parked it,
   (−234, −143) = the decorator's `['vischan', 0, 7, 0]`, nose to the road, the truck on its lane
   spot ahead to the left with its riders: the tail starts as on the first attempt, from 42.6 m.
   At the wheel rather than parked: on foot the retry turns him to the stage's guide, the truck,
   and the car would be behind him. No timer: the stage is untimed.)
   (`via` given as `[i, j]` node pairs; `start.lane` = edge from node (0,2) to (1,2), 12 m in; the
   route runs east along z = −200 from node (2,1) and ends at the kerbside `grisfestGate` 40 m
   ahead, ≈ 270 m in all (§9.2 `follow`: `to` must be kerbside and ahead of the last via node).
   Riders are busts in the bed; the berra/robban NPCs are hidden for the stage and re-shown in
   stage 8.)
8. `getInCar({ missionCar: 'grisbilFollow', any: false, passenger: 'berra', rider: 'robban', text: 'Grisbonden lånar ut grisbilen – hoppa in!', say: ['grisbonde', 'Ta bilen, señor. Ställ den vid hotellet – jag hämtar den på torsdag.'] })`  [N]
   (stage init unseats the `grisbonde` driver to the roadside.)
9. `destroy({ type: 'guardia', carName: 'guardiaJeep', driver: 'guardia', spawn: { lane: [[3, 1], [3, 2]], t: 25 }, cruise: 20, damageScale: 4, playerDamageScale: 0.5, noExplode: true, timer: 41, lockMeter: true, barLabel: 'JEEPEN', text: 'Guardia Civil såg grisarna – stoppa jeepen innan den hämtar förstärkning!', failText: 'Jeepen hann fram till kasernen.', checkpoint: true, retryAt: 'grisfestGate', retryCar: { at: 'grisfestGate', type: 'grisbil', name: 'grisbilFollow', passenger: 'berra', rider: 'robban' } })`  [N] (invented, §1.6)
   - The jeep drives away (flee AI); wrecked, it stops in steam and two officers climb out shaking
     their fists. It is a mission target (no SKANDAL for ramming it; `lockMeter`).
   - Checkpoint (Phase 3): a failed chase or drive home (stage 10) retries the chase from the farm
     gate in a fresh pig truck (`retryCar` with `type`: the failed mission's `grisbilFollow` went
     with its cars), Berra beside the player and Robban in the bed. It used to replay all ten
     stages from `flamencoBar`.
10. `goto({ to: 'flamencoBack', radius: 10, inCar: true, passenger: 'berra', timer: (g, m) => homeTimer(m.data.wreck), text: 'Kör hem grisarna till hotellet!', failText: 'Ni kom aldrig fram.' })`  [N] — the stage starts wherever the jeep died: `homeTimer` = ceil(1.2 × (7.9 + d / 34.4)), d = Manhattan distance wreck → `flamencoBack` (17–30 s; 30 without a wreck; §8 "Timers and difficulty").

**Outro** (`outroPlace: { berra: ['bodega', -1.6, -1.0, π], robban: ['bodega', 1.6, -1.0, π], stig: ['bodega', -3.4, -1.4, π/2] }`, both facing **away** from the shop; first line cues the camera on the sign; Stig beside them, side-on and off the cut's line (Phase 3 r2: the drive ends at `flamencoBack`, 14 m away, and the runner's 8 m rule put him 2 m in front of Berra, his back to the lens and Berra's cap all that showed); the answering-machine call is Angerud's panic after opening the package, so it comes before Levander's reaction, in film order):
- robban: "Ja, herre jävlar, minns du Benidorm? Snacka om grisfest!"  [F]  {cut: 'bodega'}
- berra: "Var jag med där? Hade jag kul?"  [F]
- berra: "Pepes Bodega… Den måste ligga nånstans, Robban."  [N]  {cut: null}
- telefonist: "Hytt två!"  [F](t) (the phone-station clerk, said in English in the film)  {cut: 'telefon', place: {angerud: ['telefon', 0.6, 2.4]}, toast: 'Samtidigt har direktör Angerud öppnat sitt paket…'} (Angerud at the booths)
- levander: "Detta är dr Levanders automatiska telefonsvarare. Solariet, flygrädslekliniken, bantningen och örtshopen är stängda över jul."  [F]
- levander: "Viktiga meddelanden kan lämnas till hotell Ambassadör i Åre."  [F]
- levander: "En målad åsna…? Idén med paketet var idiotisk redan från början."  [F]  {toast: 'Senare, i Åre…'}
- levander: "Nu måste du få tillbaka pengarna. Snacka med honom. Han vill kanske ha hittelön. Gör nåt!"  [F]
- angerud: "Man måste ha mycket svenska pengar med sig hit… om man säger."  [F]  {cut: 'flamencoPool', place: {angerud: ['flamencoPool', 1.2, 1.0, π/2], stig: ['flamencoPool', -0.3, 0.8, -π/2], siv: ['flamencoPool', 3.0, 0.2, 0], majsan: ['flamencoPool', -2.6, 0.2, 0]}} (the sisters face the cut camera for their two lines)
- angerud: "Men det är ju inte samma sak att hitta något som att stjäla."  [F]
- angerud: "För om man hittar något, så kan man få hittelön. Tänk på det."  [F]  {sfx: 'slap'}
- stig: "Aj! Det ska jag göra."  [F]
- siv: "Vad konstig han var!"  [F](t)
- majsan: "Det är kombinationen av sol och…"  [F](t)  {cut: null}

Unlock toast: `Upplåst: <b>Grisbilen</b> – parkerad vid Hotell Flamenco. Den luktar.` [N]

---

### 8.10 · index 9 · `ropavieja` · "Gamla kläder" · `siv` @ `flamencoPool` · island · 700

Fun: a tail mission with a **minimum** distance: stay close enough not to lose José, far enough that
he doesn't see you. The reveal: his mother is sitting in the back seat the whole time.

`extra: ['majsan']`.

**Intro:**
- siv: "Han heter José. Och han jobbar inte på pizzeria."  [F*](t) (a plane line, relocated to the pool; research-plot §6 #9 says only "Systrarna om José")  {cut: {at: 'flamencoPool', dist: 5.5, height: 2.1}, place: {siv: ['flamencoPool', 0.2, 0.5, π/4], majsan: ['flamencoPool', 1.3, 1.1, π/5], stig: ['flamencoPool', −1.3, 0.5, −π/4]}} (Phase 3 r3: a fixed pool shot, held to the end of the intro, the sisters side by side half turned to the lens and Stig facing them, the hotel and the pool behind; the giver two-shot followed the arrival and placed nobody else, so Majsan said her three lines with her back to the lens or behind Siv from three of six arrival sides)
- majsan: "Datatekniker."  [F](t)
- siv: "Äkta spansk restaurang. Klockan sju."  [F*](t)
- majsan: "Ta pepparn. Om han blir närgången."  [F*]
- majsan: "Stig-Helmer, kan inte du hålla ett öga på dem? Diskret."  [N]

**Stages:**
1. `getInCar({ text: 'Hoppa in i en bil' })`
2. `follow({ type: 'hatch', color: 0x2a4fa8, carName: 'joseBil', driver: 'jose', passenger: 'siv', riders: ['mamma'], start: { lane: [[5, 3], [4, 3]], t: 12 }, via: [[4, 4], [3, 4]], to: 'grillpacoCurb', maxDist: 55, minDist: 14, minGrace: 2, minText: 'José såg dig! Håll avståndet.', cruise: 13, text: 'Följ José – men inte för nära!', radio: [['jose', 'Jag ska bjuda dig på ett ställe som inga turister kommer till.'], ['siv', 'Det låter ju trevligt.', { gap: 4.5 }], ['jose', 'Äkta spanska maten på en restaurang.', { gap: 4.5 }]] })`
   minText/text [N]; radio [F*] · [F] · [F*] (Phase 3 r2: at 8, 12.5 and 17 s, inside the ≈ 21 s
   tail; at the default spacing the third line was due at 28 s and never played). The rear rider bust is `mamma` (visible gag). Route
   ≈ 250 m: south on x = 40, then west on z = 40, ending kerbside at `grillpacoCurb` 20 m past
   node (3,4) (§9.2 `follow`); the outro still places the family at `grillpaco`.
3. `goto({ to: 'plaza', radius: 4, onFoot: true, text: 'Parkera och spana diskret från fontänen' })`  [N]

**Outro** (`outroPlace: { jose: ['grillpaco', 0, 0], siv: ['grillpaco', 1.2, 0], mamma: ['grillpacoMamma', 0, 0, π] }` (Mamma faces the table), outro camera `['jose', 'siv']`):
- jose: "Kanarisk specialitet! Ropa vieja – gamla kläder."  [F]
- siv: "Vad sa du?"  [F]
- jose: "Gamla kläder. Det är ungefär som pyttipanna."  [F]
- jose: "Är det säkert att det inte gör nåt att mamma följde med?"  [F]  {cut: {at: 'grillpaco', dist: −7, height: 2.2}} (Phase 3 r3: from the plaza side of the table, José centred facing the lens, Siv at the right, Mamma behind them at the left at her own table, turned to it; the `grillpacoMamma` cut (Phase 3: the default 9 m cut stood in the Casa Lola pergola) showed José at the frame's left edge with his back to the lens. `{at: 'grillpacoMamma', dist: −9}` put him at the right edge, `{at: 'grillpaco', dist: −6}` Mamma at the edge)
- siv: "Vill hon inte sitta här?"  [F]  {cut: null} (back to the two-shot)
- jose: "Nej, hon vill inte vara i vägen."  [F]
- siv: "Jag fick användning för din peppar."  [F]  {toast: 'Dagen efter, vid poolen…', place: {siv: ['flamencoPool', 1.2, 0.6, π/2], majsan: ['flamencoPool', -1.2, 0.6, -π/2]}, cut: 'flamencoPool'} (the sisters face each other, side-on to the cut)
- siv: "Han kom och hämtade mig. Gissa vem han hade med sig… Morsan!"  [F]
- siv: "Jag ska satsa på Ole nu. Jag har inga fördomar mot norrmän."  [F]
- majsan: "Nej, bara de inte går på tur…"  [F](t) (research-plot §7.13.4 names no speaker)  {cut: null}

---

### 8.11 · index 10 · `fataga` · "En skock får" · `majsan` @ `flamencoPool` · island · 800 · **P1 (cut first)**

Fun: pool small talk, a chase after the excursion bus into the mountains, and José's mother turning
the tourists' pity into a sheep stampede you have to round up.

`extra: ['siv']`.

**Intro:**
- stig: "Om du köper en brödrost, och det står 'Kontrollerad av G17', så är det jag."  [F]  {cut: {at: 'flamencoPool', dist: 5.5, height: 2.1}, place: {majsan: ['flamencoPool', 0.2, 0.5, π/4], siv: ['flamencoPool', 1.3, 1.1, π/5], stig: ['flamencoPool', −1.3, 0.5, −π/4]}} (Phase 3 r3: the ropavieja intro's pool shot with the sisters swapped, held to the end of the intro; Siv said her line with her back to the lens or behind Majsan from three of six arrival sides, and from a fresh load)
- majsan: "Själv brukar jag säga att jag går på gatan."  [F*]
- majsan: "Gillar du fotboll också?"  [F](t)
- majsan: "Du, vill du smörja in mig på ryggen?"  [F](t)
- majsan: "Ta inte för mycket, då kan det börja koka."  [F](t)
- siv: "Lasses utflyktsbuss till Fataga har redan gått! Ta bilen, Giraffen!"  [N]

**Stages:**
1. `getInCar({ text: 'Hoppa in i en bil' })`
2. `pickup({ who: 'majsan', name: 'Majsan', at: 'flamencoDrive', rider: 'siv', hello: 'Kör!' })`  [N]
3. `follow({ type: 'bus', carName: 'utflyktsbuss', driver: 'affe', start: { lane: [[3, 2], [3, 1]], t: 14 }, via: [[3, 1], [2, 1], [1, 1]], to: 'fatagaBus', maxDist: 55, cruise: 14, text: 'Följ utflyktsbussen till Fataga', radio: [['lasse', 'Fataga är en av de få ursprungliga byar som finns kvar på Gran Canaria.'], ['lasse', 'Om ni vill köpa deras broderade dukar, så pruta inte. Prutning och sånt kan ni hålla på med på marknaden.']] })`  [N] · [F] ×2 (radio voiced by Lasse, the bus driven by Affe). The bus stops kerbside at
   `fatagaBus`, 40 m west of node (1,1); the scene and the outro use `fataga`/`fatagaFold`.
4. `scene({ place: { mamma: ['fatagaDukar', 0, 0], fruStorch: ['fatagaDukar', -1.8, 2.2, π + 0.5], siv: ['fatagaDukar', 1.5, 2.4, π - 0.5], majsan: ['fatagaDukar', 2.9, 1.8, π - 0.8] }, cam: { at: 'dukarCam', dist: 7.5, height: 2.1 }, lines: [['fruStorch', 'Stackars människor som lever så här.'], ['mamma', 'Stackars människor. Släpas runt på dagarna som en skock får…!'], ['mamma', '¡Las ovejas!', { sfx: 'baa' }]] })`  [F](t) · [F] · [N]
   (Phase 3: everyone at Mamma's stall, shot from the square (`dukarCam` is `fatagaDukar` turned
   round), Mamma facing the camera and the tourists either side of her, half turned to her. With
   the tourists at `fataga`, 13 m away, the two-shot stood 24 m out inside a village house, and a
   two-shot at the stall put the sisters in front of Mamma from one side.)
5. `rabbits({ mesh: 'faar', count: 6, near: 'fataga', rMin: 10, rMax: 35, timer: 28, text: 'Fånga fåren åt Josés pappa', barLabel: 'FÅR', gotText: 'Bäää!', failText: 'Fåren sprang hela vägen till Maspalomas.', checkpoint: true, retryAt: { x: -240, z: -208.5, yaw: 0 } })`  [N]
   (Phase 3: a checkpoint. The retry is on foot by the bus stop: `approachSpot` puts the player on
   the pavement at (−240, −207) facing the village (Phase 3 r3: then turned to the nearest sheep,
   the retry's guide, §9.4 item 3), where the calibrate starts the chase
   (`fatagaBus` itself is at the kerb of the lane). It used to replay the car, the pickup, the bus
   tail and the scene.)
6. `goto({ to: 'fatagaFold', radius: 4, text: 'Tillbaka till fårfållan' })`  [N]

**Outro** (`outroPlace: { pappa: ['fatagaFold', 1.5, 0], mamma: ['fatagaFold', -0.2, 0.4], majsan: ['fatagaFold', -1.5, 0.9], siv: ['fatagaFold', -2.5, 1.4], stig: ['fatagaFold', 2.6, 1.0, -1.3] }`, `outroCam: { at: 'fatagaFold', dist: -7, height: 2.3 }`: everyone at the fold, Phase 3; Phase 3 r2: a group shot from the fold side, all facing it, the sisters on the left and Stig side-on at the right; the two-shot followed the arrival, cut Majsan at the frame's edge on her own line and left Siv out):
- pappa: "¡Gracias, señor!"  [N]
- mamma: "Det är hon som vill ta min Josito ifrån mig."  [F]
- majsan: "Ska du inte köpa dukar av svärmor?"  [F](t)

---

### 8.12 · index 11 · `grisfest` · "Grisfesten" · `ole` @ `flamenco` · island · 1000 · `cost: 800` · night

Fun: the film's big set piece as a chain: flowers, a night race against Gabbe's bus, a
plate-smashing frenzy, the dance, Tonga Tonga, "Bärra hem Berra", and the porter scene.

`cost: 800` ("Grisfesten kostar 800 pesetas" [F*]) is charged when the intro ends; **Ole pays** if
the player is short. Dusk (`sunset`) from stage 2, when the player is still at the hotel, night
from the race (Phase 3: stage 2 went straight to the darkest palette). Checkpoints at stages 3, 4,
5, 6 and 10 (Phase 3: 6 and 10 added; Phase 3 r2: 3 carries `retryCar`, the hire car). 4–6 carry `retryAt: 'dansgolv'` and `retryCar: { at: { x:
−86, z: −202.75, yaw: −π/2 }, park: true }`: the player on foot at the dance floor and the car he
last drove parked where the race left it, just past the finish heading west, the calibrate Tonga
start, so the 23 s drive is the one measured (without it a failed Tonga drive retried with the car
wherever the timer ran out, often 190 m away). 10 (the carry) retries in the aisle of the Flamenco
lot, `{ x: −24, z: 16, yaw: −π/2 }` (`approachSpot` puts the player 1.5 m west of it, facing the
gap in the pool hedge; `flamencoDrive` is the hire car's bay). A retry re-applies stage 2's sunset,
then stage 3's night, and `vals` (§9.4 item 3). `onEnd`: on complete → banner `MORGONEN EFTER`
/ `Julafton på Gran Canaria` [N] + palette `day` + the island tune `g.levelTune()` (`sol`, or the
player's `samba`; Phase 3, was a fixed `sol`); on fail/abort → palette `day` + the same tune (no
banner).

**Intro:**
- ole: "Skal du ha B-vitaminer? Bra for leveren. Grisefest, vet du. Ta to."  [F]  {cut: {at: 'flamenco', dist: 6, height: 2.2}, place: {stig: ['flamenco', 0, 1.5, −1.07], ole: ['flamenco', 1.6, 1.4, 1.07]}} (Phase 3 r3: the asnan intro's porch shot, §8.8, held to the end of the intro; Stig stands on `approachSpot('flamenco')`, (−4, −9.5), where `calibrate` starts the flowers, so the flowers stage always starts from the measured spot; the runner then turns him to the guide. Ole now stands 1.6 m beside that start, not on the landmark in front of it: the flowers have a new pool, `walker-r1r2/r3-island-staging` → 26, §8 table, Phase 3 r3 ledger)
- ole: "Og jeg har C-vitaminer… jerntabletter, ginseng, tannkrem…?"  [F*]
- ole: "Du, de er fine de rødhårete. Vi skulle ha satt inn et støt der."  [F]
- ole: "Vi kan be resepsjonen sette blomster på rommet deres."  [F*](t) (rendered in Norwegian: "blomster" is Ole's word)
- ole: "Blomster? … Meloner? Agurker? Bananer?"  [F]
- stig: "Men blommor… Gör man så i Norge?"  [F](t)
- ole: "Blomsterspråket er internasjonalt."  [F]
- ole: "Fikser du ikke damer på grisefesten, da er det slutt. I kveld setter vi inn støtet!"  [F]

**Stages:**
1. `rabbits({ mesh: 'blomma', flee: false, count: 5, near: 'flamenco', rMin: 8, rMax: 40, timer: 26, text: 'Plocka blomster till Siv och Maj-Britt', barLabel: 'BLOMSTER', gotText: 'Blomster!', failText: 'Blommorna vissnade.', radio: [['ole', 'Man må skifte vannet hver fjerde time og gi dem en hodepinetablett.']] })`  [N] · radio [F*]
2. `getInCar({ car: 'hyrbil', any: false, atHome: true, text: 'Hoppa in i hyrbilen – det börjar skymma', startCue: { sky: 'sunset', music: 'vals' } })`  [N]
   (Phase 3 r2: the hire car, the sedan the race is measured with. Any car used to do: bus 17,
   which stands at the Flamenco drive from mission 6 on in a session played straight through (top
   speed 25 m/s at ×1.2), a van (31) or the ice-cream van (29) cannot beat the night bus (35), and
   the first attempt was lost without a word. `atHome` puts the hire car back on its bay
   (`flamencoDrive`) if he left it elsewhere; the arrow shows it, and another car does not complete
   the stage.)
3. `race({ who: 'gabbe', type: 'bus', carName: 'nattbuss', cruise: 31, oppSpec: { maxSpeed: 35, accel: 12, steer: 0.9 }, playerPassenger: 'ole', start: { lane: [[3, 3], [4, 3]], t: 14 }, checkpoints: [[4, 3], [4, 2], [4, 1], [3, 1]], finish: { x: -80, z: -200 }, text: 'Bussen till grisfesten går nu – kom först!', radio: [['gabbe', 'Grisfestbussen går nu – sista man bjuder på sangrian!']], checkpoint: true, retryCar: { at: { lane: [[3, 3], [4, 3]], t: 14 } }, startCue: { sky: 'night' } })`  [N] · radio [N] (§1.5: the song already has its one spoken line in mission 7)
   (Phase 3 r2: `retryCar` puts a retry back in the hire car (the car he last drove, repaired; the
   kind moves it onto the grid), where it used to give the player on foot the kind's spare hatch.
   A wrecked hire car still gets the hatch, which wins too: `CAL=race RACE_CAR=hatch`, clean won
   by 2.8 s ×2, one crash lost by 1.1 s ×2.)
   (start: behind Hotel Flamenco (z −40) heading east past Pepes Bodega, 14 m past the junction
   (Phase 2: at t 6 the grid stood on the zebra crossing among pedestrians); left up x 40 past
   Centro Nórdico, left again along the farm road to the gate: ≈ 340 m, **two left turns** (WP-G:
   a 10.5 m bus cannot take the grid's right-turn lanes, radius 5.75 m against its ≈ 11.4 m
   turning circle). `oppSpec` makes the night bus raceable at ×1.2: Phase 2 measured 3 clean runs
   won by 2.0 s and 3 runs with one crash all lost (§8 "Timers and difficulty"). `start.lane`
   makes the kind compute `{x, z, yaw}` with `laneSpot`; Gabbe's bus goes on that right-hand lane
   spot (its own lane: its lane path never merges) and the player's car on the left lane beside
   it, noses level, `spot − r·2·LANE` with `r = (−cos yaw, sin yaw)`, i.e. side by side across the
   road, never offset along world z (§9.2). Fail text = the kind's default `${name} vann!` →
   "Gabbe vann!".)
4. `smash({ type: 'tallrikar', area: { lm: 'dansgolv', r: 22 }, count: 10, timer: 33, lockMeter: true, onFoot: true, text: 'Porslinskross! Sparka sönder tallrikarna (J) medan bandet spelar', barLabel: 'TALLRIKAR', failText: 'Bandet slutade spela.', radio: [['pax', 'Vad skickliga de är!']], checkpoint: true, retryAt: 'dansgolv', retryCar: { at: { x: -86, z: -202.75, yaw: -π/2 }, park: true } })`  [N] · radio [F](t)
   (Phase 3: the text names the kick; only a kick or a stomp breaks a stack, walking into one does nothing.)
5. `scene({ place: { majsan: ['dansgolv', 1.2, 1.6, -π/2], siv: ['dansgolv', 2.8, 1.9, -π/2], ole: ['dansgolv', -1.8, 1.9, π/2], stig: ['dansgolv', -0.2, 1.6, π/2] }, frame: ['majsan', 'stig'], checkpoint: true, retryAt: 'dansgolv', retryCar: { at: { x: -86, z: -202.75, yaw: -π/2 }, park: true }, startCue: { outfit: { who: 'ole', name: 'gris' } }, lines: [...] })`
   (Ole's `gris` outfit goes on the stage's `startCue`, not on a line, so a retry re-applies it, §10.4;
   Phase 3: a row across the floor, Ole, Stig facing Majsan, Siv, so the two-shot sees all four in
   profile from either side; Stig stood wherever he broke the last plate, so the two-shot was shot
   from ~36 m and the pair danced up to 20 m apart. His spot is the calibrate Tonga start,
   `approachSpot('dansgolv')`, within 0.2 m):
   - ole: "Neida, det er bare å spørre: Skal vi danse! Eller kjør litt større: Sånn! … Voulez-vous danse avec moi? Fransk."  [F]
   - stig: "Jag är skraj att de ska nobba."  [F]
   - majsan: "Vill du dansa med mig?"  [F]
   - stig: "Får jag lov…"  [F](t)  {anim: {who: ['stig', 'majsan'], flag: 'dance', secs: 6}}
   - siv: "Nu blev hon uppbjuden."  [F](t)
   - ole: "Heia Norge!"  [F]  {anim: {who: 'ole', flag: 'dance', secs: 4}, applause: 2}
   - siv: "Majsan, ta med dig giraffen så går vi på Tonga Tonga."  [F]
6. `goto({ to: 'tongatonga', radius: 10, inCar: true, timer: 19, text: 'Till Tonga Tonga!', checkpoint: true, retryAt: 'dansgolv', retryCar: { at: { x: -86, z: -202.75, yaw: -π/2 }, park: true } })`  [N]
   (Phase 3: its own checkpoint, so a failed drive does not replay the dance.)
7. `scene({ place: { ole: ['tongatonga', -2.2, 3.2, 0], majsan: ['tongatonga', 2.0, 3.0, 0], siv: ['tongatonga', 3.0, 3.4, 0], robban: ['tongatonga', -0.8, 1.2, -π/2], berra: ['tongaSlump', 0, 0], stig: ['tongatonga', 0.8, 1.2, π/2] }, anim: { berra: 'slump' }, cam: { at: 'tongatonga', dist: 6, height: 2.6 }, lines: [['ole', 'Samba er fine greier!', { music: 'samba' }], ['robban', 'Kan du hjälpa mig bära hem Berra?'], ['stig', 'Vilket snack! "Bärra hem Berra!"']] })`  [F] ×3
   (Phase 3 r2: shipped wrapped in the decorator `parkCar(stage, ['tongatonga', -10, -10, 0])`,
   §8.9 stage 6: the car he came in parks in the lot at (−136, −52), nose to the street, behind
   the camera, which stands in the same lot; parked where he stopped, a bus covered the lens (5 of
   5 rays). Phase 3 r3: Berra slumps at `tongaSlump` (−143.7, −62.6), at the right of the group in
   the shot (`tongatonga` offset (−2.3, 0.6), yaw 0.5), so he is in the frame of the two lines
   about him; at `tongaLot` he lay behind the camera. The car is 13 m from him. No timer follows:
   the pickup, the drive home and the carry are untimed.)
8. `pickup({ who: 'berra', name: 'Berra', at: 'tongaSlump', rider: 'robban', hello: '…zzz' })`  [N]
   (Phase 3 r3: `pickup` places its NPC at `at`, so with `tongaLot` he would pop away in view.)
9. `goto({ to: 'flamencoDrive', radius: 10, inCar: true, passenger: 'berra', text: 'Kör hem till Hotell Flamenco' })`  [N]
10. `carry({ who: 'berra', to: 'flamencoRecepcion', radius: 2.2, walkSpeed: 3.2, failOn: { fall: true }, text: 'Bärra hem Berra!', failText: 'Berra vaknade och började sjunga.', checkpoint: true, retryAt: { x: -24, z: 16, yaw: -π/2 } })`  [F*] · [N] — **P1**; P0 fallback:
    `dropoff({ who: 'berra', at: 'flamencoDrive', text: 'Släpp av Berra vid hotellet' })`.

**Outro** (night; `outroPlace: { portier: ['flamencoRecepcion', 0, 0, 0], angerud: ['flamencoRecepcion', -1.4, 1.4, π/2], carmencita: ['flamencoRecepcion', -2.2, 1.6, π/2], majsan: ['flamencoPool', 0, 0], stig: ['flamencoRecepcion', 1.6, 2.6, -π/2] }`, `outroCam: { at: 'recepcionCam', dist: 7.5, height: 2.0 }`: the desk from the porch front, the porter facing the camera, Angerud and Carmencita on his left and Stig on his right side-on; Phase 3, the two-shot from under the porch put Angerud in front of the porter. `stig` matters for the P0 `dropoff` fallback, which ends at `flamencoDrive`):
- portier: "Det är förbjudet att ta med damer på rummet. Men för 500 pesetas kanske vi kommer överens."  [F]
- angerud: "500 pesetas…? Det här är ju min fru."  [F]
- portier: "Det tror jag inte."  [F]
- angerud: "En cigarrett, älskling?"  [F](t)
- carmencita: "Nej tack. Jag röker inte."  [F](t)
- portier: "Jaså, din fru…?"  [F](t)
- angerud: "Måtte djävulen ta alla fruntimmer!"  [F]  {cut: 'flamencoBalcony', place: {angerud: ['flamencoBalcony', 0, 1.2, 0]}} (on his room-113 patio)
- majsan: "Vad härligt det är med de här varma nätterna. Snart ska man hem till slasket igen. Jag vill inte åka hem."  [F*](t)  {cut: 'flamencoPool', place: {majsan: ['flamencoPool', 0, 0, π/2], stig: ['flamencoPool', -1.3, 0, -π/2]}, hide: ['siv']} (just the two of them; Siv's home is beside the pool)
- majsan: "Jag gruvar mig lite för flygresan."  [F*]
- stig: "Jag kan flyga, jag är inte rädd."  [F*]  {anim: {who: 'stig', flag: 'wings', secs: 3}}
- majsan: "Nu skulle Levander se oss!"  [F*](t)
- majsan: "Du… gillar du bruna bönor?"  [F*](t)
- stig: "Jag avskyr bruna bönor."  [F*](t)  {cut: null}

(Order note: the film has the warm-nights talk before Tonga Tonga; the orchestrator's decision
puts the mantra exchange last as the mission's emotional button. Keep it; hence `[F*]`.)

---

### 8.13 · index 12 · `julafton` · "Julafton bland palmerna" · `ole` @ `flamencoPatio` · island · 2000 · `cost: 100` · `unlock: 'bodega'`

Fun: the suitcase comes back, you round up the party guests all over town against the clock, and
then every running gag pays off by the pool before the fear-of-flying arc closes.

**Intro:**
- ole: "Morn, gutten min!"  [F](t)
- stig: "Morrn morrn."  [F](t)
- ole: "Feliz navidad."  [F](t)
- stig: "Vad sa du?"  [F](t)
- ole: "Det betyr 'god jul' på spansk."  [F*](t)
- stig: "Javisst, det är julafton i dag."  [F](t)  {sfx: 'knock', cut: {at: 'rum107Cam', dist: 7.5, height: 2.1}, place: {ole: ['flamencoPatio', -1.5, 0.9, 0.6], stig: ['flamencoPatio', 0, 1.5, 1.3], hittegods: ['flamencoPatio', 1.5, 2.7, -1.6]}} (Phase 3: a cut to the patio front of room 107, held to the end of the intro; Stig on his approach spot, the man from the airport facing him. In the giver two-shot he stood behind Stig)
- hittegods: "Hammarby…?"  [F]
- stig: "Ja!"  [F]  {toast: 'Väskan är tillbaka!'}
- hittegods: "Hittelön."  [F](t)  {coins: -25}
- stig: "Tack så mycket."  [F](t)
- lasse: "Alla är välkomna på julfesten. Men man måste ha julmat och en julklapp för 100 pesetas."  [F*](t) (an unnamed voice answers Ole in the film; Lasse on the PA is ours)  {pa: true}
- ole: "Da tar jeg med sild og Stig-Helmer."  [F*]
- stig: "Norsk humor."  [F](t)

`cost: 100` charged after the intro (Ole pays if short).

**Stages:**
1. `collect({ who: ['herrStorch', 'fruStorch', 'berra', 'majsan'], findAt: { herrStorch: ['playa', 0, 0], fruStorch: ['kyrka', 0, 2], berra: ['bodega', -2.0, 0.5], majsan: ['marknad', 1, 1] }, sendTo: { herrStorch: ['flamencoPool', 4, 2], fruStorch: ['flamencoPool', 5, 2], berra: ['flamencoBar', 0, 0], majsan: ['flamencoPool', -2, 0] }, inCar: true, radius: 1.6, carRadius: 4.0, timer: 81, text: 'Samla ihop gästerna till julfesten – ta bilen!', barLabel: 'GÄSTER', failText: 'Julfesten började utan dem.', lines: {...} })`  [N]
   (Phase 3: the text says to take the car. The timer is measured walking to the hire car and
   driving; a first-timer ran on foot to Berra, 35 m away, and back.)
   - herrStorch: stig "Herr Storch! Julfesten!" [N] · herrStorch "Jag ska bara filma lite till." [N]
   - fruStorch: stig "Fru Stork, julfesten börjar!" [N] · fruStorch "Vi heter faktiskt Storch, inte Stork." [F*]
   - berra (behind the hotel, staring at nothing in particular): stig "Berra! Julfesten!" [N] · berra "Jag kommer, jag ska bara kolla en grej." [N]
   - majsan (at the market, hiding something): majsan "Titta inte! Det är en hemlighet." [N]
2. `goto({ to: 'flamencoPool', radius: 8, text: 'Till julfesten vid poolen!', startCue: { music: 'jul', outfit: { who: 'lasse', name: 'jul' } } })`  [N]
3. `scene({ place: { lasse: ['flamencoPool', 0, 3], ole: ['flamencoPool', -1.5, 1], herrStorch: ['flamencoPool', 3, 2], fruStorch: ['flamencoPool', 4, 2], majsan: ['flamencoPool', -2.5, 0.5], siv: ['flamencoPool', -3.5, 1], berra: ['flamencoPool', 5, -1], robban: ['flamencoPool', 6, -1], portier: ['flamencoPool', -6, 0.5, -π/4] }, lines: [...] })` — the party payoffs (the porter watches from the side, by the pool-deck Christmas tree; Phase 3 r3 repair: at dx −7 the edge of a parasol canopy between him and the lens, raised to 2.07 m for the on-foot camera (island-camera), crossed his face on his line, 3 of 5 rays; at −6 he stands left of the parasol, face clear, 35 px, facing 0.95; an untimed scene, no timer moves):
   - lasse: "Hej tomtegubbar, slå i glasen… Skål och god jul!"  [F](t)  {music: 'hejTomtegubbar', applause: 2}
   - ole: "Ta av lokket! Objektivlokket. Må ta av det, vet du."  [F]
   - ole: "Har du filmet sånn lenge?"  [F]
   - herrStorch: "Hela veckan."  [F]
   - ole: "Det var synd. Det blir ikke noe film da."  [F]
   - herrStorch: "Blir'e inge film?"  [F]
   - majsan: "Jag har köpt en julklapp till dig."  [F*] (the morning conversation, relocated)  {anim: {who: 'stig', flag: 'giraffe', secs: 6}}
   - stig: "Precis en sån har jag önskat mig."  [F](t)
   - berra: "Robban! Jag hittade Pepes Bodega!"  [F]
   - robban: "Det var som fan! Var låg det?"  [F]
   - berra: "Det ligger på baksidan av hotellet."  [F]  {cut: 'bodega'}
   - robban: "Och vi som har letat igenom hela jävla Nueva Estocolmo!"  [F]  {cut: null}
   - portier: "De där svenskarna är heltokiga!"  [F](t) (the Spaniards' line, research-plot §8.3; was `pax`)  {music: 'smaGrodorna'}
   - stig: "Julmaten från väskan… och knäckebrödet."  [N]  {anim: {who: 'stig', flag: 'butterKnife', secs: 3}}
   - ole: "Hva i all verden…"  [N]  {sparkle: true, sfx: 'pryl'}
   - stig: "Femtio… tusen… kronor. I knäckebrödet."  [N]
   - ole: "Femti tusen… Rio, Stig-Helmer! Stranda, jentene og samba!"  [F*]
4. `scene({ cam: { at: 'rum113', dist: 6, height: 3 }, place: { angerud: ['rum113', 0, 0.8], stadare: ['rum113', -1.5, 1.6], saljare: ['rum113', 1.5, 1.6], mamma: ['rum113', -2.5, 2.4], pappa: ['rum113', -3.2, 2.4], carmencita: ['rum113', 2.5, 2.4], jose: ['rum113', 3.2, 2.4], siv: ['rum113', 0.9, 3.0] }, lines: [...] })` — the chaos at room 113 (heart attack **off-screen**; Phase 3 r3: Siv off the lens axis between Carmencita and Angerud; at (0, 3.2) she stood straight behind him and only her hair showed on her line):
   - stadare: "Limpio!"  [F]
   - saljare: "Jag var tvungen att sälja tomten i morse. De skrev på."  [F]
   - mamma: "Ni har dragit skam över vår familj!"  [F](t)
   - carmencita: "Det är inte han. Den andre!"  [F](t)
   - mamma: "Så gammal! Du skickar mig i graven!"  [F](t)
   - stadare: "God jul! Hoppsan. Stör jag?"  [F]
   - siv: "Gösta, ska du inte med på julfesten?"  [F]
   - angerud: "Ut! Ut!"  [F]  {sfx: 'doorSlam', flash: 'white', hide: ['angerud']}
   - siv: "…"  {sfx: 'ambulance', toast: 'En ambulans hämtade direktör Angerud. Han kommer att bli bra igen.'}  [N] (Siv's silent beat carries the caption; the text shown is "…". Phase 3: it was the PA voice, which read as a loudspeaker announcing the ambulance)
5. `mantra({ duet: 'majsan', at: 'flamencoPool', radius: 4, secs: 4, text: 'Visa Majsan övningen – håll J', barLabel: 'JAG KAN FLYGA', startCue: { sky: 'sunset', place: { majsan: ['flamencoPool', 1.2, 0] }, say: ['majsan', 'Visa mig igen. Inför hemresan.'] } })`  [N] ×2

**Outro** (sunset, both in the `wings` pose; `outroPlace: { majsan: ['flamencoPool', 0.9, 0.6, 0], stig: ['flamencoPool', -0.9, 0.6, 0], ole: ['flamencoPool', -2.6, 1.6, 0], siv: ['flamencoPool', 2.6, 1.6, 0] }`, `outroCam: { at: 'flamencoPool', dist: 7, height: 2.4 }`: the pair in front, Ole and Siv behind them, the four of the Rio card; Phase 3, Ole said the last line from his pergola 34 m away):
- stig: "Jag kan flyga, jag är inte rädd."  [F]
- majsan: "Jag kan flyga, jag är inte rädd."  [F*] (our staging of the binding duet; in the film Stig
  says it to Majsan at night, research-plot §8.1; the "two voices" before Rio are probably
  Levander's clinic, §8.4)
- ole: "Og så Rio!"  [F*]  {endCard: true}

**After the outro** (index 13 = complete): `game.playEndCard()` (P1; §11.7) → Rio card → back to the
island: `unlock('bodega')` (applied and saved before the card, its toast held until the player is
back at the pool, under the completion banner; Phase 3 r3: the toast lay over the Rio card and was
gone before the pool; lit sign, map label "Pepes Bodega", Berra and Robban posted at
`bodega` in free roam with chatter berra "Robban! Jag hittade Pepes Bodega!" [F*] and robban
"Pepes Bodega. Glöm aldrig det, du." [F*], relocated: the unlock's `chatter` replaces their
CHATTER, which is about looking for it; Angerud's home is `null`, so he is gone from the Viking
Bar: an ambulance took him in the julafton scene, §1.2 (Phase 3 r2: he stood chatting there and
could be run over for OUCH barks, §10.3), banner
`NUEVA ESTOCOLMO KLARAT!` / `God jul – och tack för resan!` [N]. P0 fallback: skip the card, show
the banners.

---

### Shipped staging beyond the literals (WP-G data; Phase 2 note)

The shipped missions (src/game/missions/island.js) add camera/placement polish that the §8 literals
above (and the `fullstory` fixture) do not carry:
- julafton party: the scene's `cam` is a group shot from the pool deck (`PARTY_CAM`); every guest
  gets yaw 0, Stig is placed in the group, and the bodega cut returns to the group shot instead of
  `null`. Room 113: the `place` tuples carry yaw π, so the cast faces the in-room camera.
- the last line's `cut: null` is dropped in the grisfest, bodega and ropavieja outros, so the pool
  cut holds to the end.
- julafton outro: Majsan's own line carries a `wings` cue.
- `grisfestGate` stays at world (−80, −204), on the farm side of the z −200 road: the truck pulls
  across into the farm gate (G checked it; Phase 0a's z ≈ −195.5 idea is not needed).
- Phase 3 r1 (island-staging) moved the rest of this list into the §8 literals and the fixture:
  the room-107 "havsutsikt"/"Momento." cut, the Tonga Tonga street shot, Stig at the pool cuts and
  on the dance floor, the julafton outro four and camera, the hittegods cut, the porter outro's
  desk camera and the friskotek group shot. The haggle talks' framing is the `haggle` kind's
  (§9.2), not mission data.

## 9. Stage kinds and the mission runner

All kinds are implemented **fully** in Phase 0 (so Phase 1 mission agents only write data) and the
kinds files are **frozen after Phase 0** (P1 owner none, §14.1): flight missions use `goto`/`scene`
and island missions use `collect`/`carry`/`mantra`, so no single package may own them. Phase-1
agents change behaviour only through options; a kind bug goes under CONTRACT CHANGES (with a
proposed patch) for the Phase 2 agent. Files: `src/game/missions/kinds/core.js` (existing kinds +
`scene`), `kinds/flight.js` (`collect sit interact carry mantra timeline`), `kinds/island.js`
(`haggle smash`); `kinds/index.js` re-exports all of them. Mission files import from
`kinds/index.js`.

### 9.1 Stage interface (unchanged Bigmouth shape + additions)

```js
stage = {
  text, sub?,                       // HUD objective text; sub overrides it
  init(g, m), update(g, m, dt) -> 'done' | { fail: string } | undefined,
  target(g) -> { x, z, r, follow?, checkpoint? } | null,  altTarget?(g),
  obj?(g) -> { timer?, bar?, barLabel?, barColor?, zone?: [a, b], marker?: number },   // zone/marker: haggle
  markers?(g) -> [{ type, x, z, edge }],
  cleanup?(g, m),
  // common options (any kind; handled by the runner, §9.4). Their names never collide with a
  // stage method (`init`, `update`, …) or a kind option (`events`, `useCue`, `fillCue`, …):
  checkpoint?: bool, panicFails?: bool, lockMeter?: bool, shame?: bool (forced pursuit),
  oleBarks?: bool,
  startCue?: cue,              // applied by the runner right before the kind's init()
  timedCues?: [[t, cue]],      // ticked by the runner on scaled stage time
  doneCue?: cue,               // applied when the stage returns 'done'
  retryAt?: landmark,          // checkpoint retry spot (§9.4 item 3)
  retryCar?: { at, type?, name?, passenger?, rider?, park? },   // the car waiting on a retry
                               // from this checkpoint (§9.4 item 3; Phase 3)
  retryFear?: bool,            // a retry from this checkpoint gives back the meter it held at the
                               // stage's first start (§9.4 item 3; Phase 3 r3 repair)
}
```

**Normative:** every kind factory copies exactly these keys from its options onto the returned
stage object: `checkpoint panicFails lockMeter shame oleBarks timedCues startCue doneCue retryAt
retryCar retryFear` (Bigmouth's `({...pickup(), shame: true})` pattern). No other option name is read by the
runner.
Phase 0a: the factories also keep their whole option object as `stage.o` (read-only, for tests and
the `missions` data checks); `kinds/core.js` exports `COMMON` and `common(o, stage)` for this.
`timeline` reads only its own `events`; `interact` fires its own `useCue` on use; `mantra` its own
`fillCue` when the bar fills.

`m = { def, cars: [], items: [cleanupFn], data: {} }`. Positions may be landmark names or
`{x, z, yaw?}`. Node references may be ids or `[i, j]` pairs. **Lane spots**:
`{ lane: [[i1, j1], [i2, j2]], t }` = the right-hand lane of the edge node(i1,j1) → node(i2,j2),
`t` m from the first node, yaw along the edge (`layout.laneSpot(a, b, t)`, Phase 0).

### 9.2 Kinds and options (every option listed; defaults after `=`)

| kind | options | done / fail | test fields |
|---|---|---|---|
| `getInCar` | `car?` (named car, recreated if wrecked) · `atHome?` (Phase 3; with `car`: a named car the player is not in goes back to its parking spot at init, e.g. bus 17 on a retry) · `missionCar?` (name of a car in `m.cars`) · `passenger?` (NPC seated in that car at init) · `rider?` / `riders?` (decorative busts) · `hideRiders?` (hide those NPCs for the mission) · `any = true` (set `any: false` whenever `car`/`missionCar` is given and only that car will do) · `say?` | player in a car (the named one if `any:false`) / a `missionCar` wrecked before the player is in it ("Du kvaddade {driver}s bil!", the driver it was handed over from; else "KVADDAD!"; Phase 3, was a soft lock) | `stage.car` |
| `goto` | `to` · `radius = 7` · `timer?` (seconds, or `(g, m) => seconds` evaluated at init: a timer that depends on where the stage starts; Phase 2) · `failText = 'Tiden är ute!'` · `inCar?` · `onFoot?` (must arrive on foot; sub "Kliv ur bilen!") · `passenger?` (marker: on foot with `inCar` or a `passenger`, `runner.lastCar` while it is alive and in `g.cars` (r 3.5; Phase 3 r2: asnan pointed at Ole 1.8 m away with the car 25 m off, and grisfest's Tonga drive at the club); in a car, a passenger left behind (or their car)) · `stop?` (speed < 2 to finish) · `smooth?: {label, failText}` · `fragile?: {label, failText}` · `fearRate?` (+n/s FLYGRÄDSLA) · `radio?: [[who, text, {gap?, ...cue}?]]` (gap = s after the previous line, default 9–13 random) · `overhear?: [{at, r, lines, radio?}]` · `awaitOverhear = false` (the stage cannot finish while a started overhear is still playing) | within radius (and stopped) / timer, bar | `stage.dest` |
| `pickup` | `who` · `name` · `at` · `hello?` · `rider?` (bust added beside the passenger; the rider NPC is hidden while it rides) · `hideRiders?` (hide the rider NPC already at init) · `text?` | NPC seated as passenger | `stage.npc` |
| `dropoff` | `who` · `at` · `riderOff?` (remove the rider bust, show the rider NPC beside) · `text` | NPC out at `at` | `stage.dest` |
| `follow` | `type` · `color?` · `carName?` · `driver` (key; `who` accepted as alias) · `passenger?` (NPC in the **followed** car) · `riders?` (busts, removed when the stage ends) · `hideRiders?` (hide those NPCs; they stay hidden until a later stage seats/places them or the mission ends) · `start` (landmark / `{x,z,yaw}` / lane spot) · `via` · `to` (**kerbside**, see below) · `maxDist` · `minDist?` · `minGrace = 2` · `minText?` · `cruise = 12` · `wobble?` · `arriveDist = 35` · `radio?: [[who, text] \| text]` (string = driver speaks) | arrived and within `arriveDist` / lost > 3 s beyond `maxDist`, closer than `minDist` for > `minGrace` s, car wrecked | `stage.car`, `stage.minDist` |
| `rabbits` | `mesh = 'badboll'` (`badboll faar blomma gris`) · `count` (**≤ 6** for the test) · `near` · `rMin = 18` · `rMax = 55` (spawns only on spots reachable on foot from `near`: `game.footReach`, Phase 2) · `flee = true` (false = static bobbing) · `timer` · `barLabel` · `gotText` · `failText` · `radio?` · `onFoot?` | all caught / timer | `stage.list[] {x, z, alive}` |
| `race` | `who` (opponent driver) · `type` · `color?` · `carName?` · `cruise` · `start` (a lane spot, or `{x, z, yaw}`; Phase 2: the **opponent** goes on that spot (its own lane, so its lane path never merges into the player) and the **player** on the lane to its left, noses level, `spot − r·2·LANE` with `r = (−cos yaw, sin yaw)`: offsets are **lateral to `yaw`, never along world z**; rubber band only at the extremes: × 1.1 while the player leads by > 120 m, × 0.85 while the opponent leads by > 150 m) · `checkpoints: [[i, j]]` · `finish: {x, z}` · `playerPassenger?` (NPC seated in the **player's** car at init) · `oppPassenger?` (old `passenger`: NPC in the opponent car) · `radio?` · `oppSpec?` (Phase 2: fields merged over a copy of the opponent car's spec, e.g. the night bus's `{ maxSpeed, accel, steer }`) | all checkpoints first / opponent first ("`${name} vann!`") | `stage.cps, stage.pi, stage.opp, stage.oi` |
| `destroy` | `type` · `carName?` · `driver = 'guardia'` (bust def key; replaces `CHARS.shame`) · `spawn?` (landmark / `{x,z,yaw}` / lane spot; default: random node 70–130 m away) · `timer` · `cruise = 20` · `damageScale = 1.5` · `noExplode = false` (wreck stops in steam, occupants step out, no fire) · `barLabel = 'MÅL'` · `failText = 'Den kom undan!'` · `playerDamageScale?` (Phase 2: the player's car at the stage start takes this damage scale while the stage runs, restored on cleanup) | wrecked (`m.data.wreck`) / timer | `stage.car` |
| `grab` | `at?` (or `m.data.wreck`) · `mesh = 'pryl'` (any `COLLECT_KINDS` key) · `scale = 1.8` · `say?` · `gotText?` | touched | `stage.item` |
| `collect` | `items?: [{x, z, y?} \| landmark]` + `kind` + `motion = 'spin'` (`spin bob roll`) · **or** `who?: [keys]` with `standAt?` (flight: `{key: [x, z]}` world, NPC unseated and stood there) / `findAt?` (island: `{key: [lm, dx, dz]}`) and `seatOnTouch?` (flight: back to its HOMES seat) / `sendTo?` (island: `{key: [lm, dx, dz]}`) · `lines?: {key: [[who, text]]}` (played as bubbles on touch) · `radius = 1.0` · `carRadius = 4` · `inCar = false` (true: touching from a car counts, within `carRadius`) · `timer?` · `barLabel` · `failText` | all touched / timer | `stage.list[] {x, z, alive, key?}` |
| `sit` | `seat` · `timer?` · `failText?` | `g.player.seatId === seat` / timer | `stage.seat` (seat object) |
| `interact` | `at` (landmark, `{x, z, y?}` or `(g) => {x, z}`) · `radius = 1.4` · `prompt` · `whileSeated = false` · `seat?` (only from this seat; also the stage's `seat`, so "E Sätt dig" offers it first, §5.10; Phase 3 r3) · `enabled?(g)` · `lines?` (dialogue played on use) · `use?: async (g, m)` · `useCue?` (applied on use, before `lines`) | after use/lines finish | `stage.at` (live `{x, z}`), `stage.ready` |
| `carry` | `item?: 'juice'` (mesh above the head) **or** `who?: key` (NPC over the shoulders; walk only) · `to` · `radius = 1.2` · `walkSpeed?` · `failOn: { bumped = true, fall = true, sprintSecs? }` · `failText` | arrived / failOn | `stage.to` |
| `mantra` | `secs` (scaled) · `at?` + `radius = 2.2` · `seated?: seatId` (also the stage's `seat`, §5.10; Phase 3 r3) · `duet?: key` (NPC copies the pose) · `waitPhase?` (also wait for `cabin.phase`) · `fillCue?` (applied when the bar fills; its `phase` only if `cabin.phase` is still the phase the stage started) | bar full (+ phase) / panic if `panicFails` | `stage.t`, `stage.secs` |
| `timeline` | `secs` · `seat?` (time pauses unless seated there; sub "Sätt dig på 14B!") · `lockSeat?` (with `seat`: "Res dig" hidden and R ignored for the stage, so time never pauses) · `events: [[t, cue]]` (the timeline's own list; not the runner's `timedCues`) · `barLabel?` | t ≥ secs / panic if `panicFails` | `stage.t` |
| `scene` | `lines: [[who, text, cue?]]` · `frame?: [a, b]` · `cam?: {at, dist, height}` · `place?` · `anim?: {key: flag}` · `exitCar?` (with `place` the player always exits the car first, `exitCar(true)`; with `frame` only, car-seated characters stay seated: their `x/y/z` are live, §14.3) | dialogue finished (`doneCue` applies) | — |
| `haggle` | `at` · `who` · `partner` · `onFoot = true` (the bar runs only on foot within 3 m of `at`; sub "Kliv ur bilen!") · `start` · `steps` · `zones` · `speeds` · `maxMiss = 3` · `pay` · `lines: {start, hit: [lines…], miss, win}` · `barLabel` · `failText` | price reaches the last step / misses | `stage.inZone`, `stage.round` |
| `smash` | `type` · `area: {lm, r}` · `count` · `timer` · `onFoot?` · `barLabel` · `failText` · `radio?` | `count` props of `type` broken in the area since the stage began / timer | `stage.list` (prop refs) |

Behaviour notes (normative):
- **`goto.smooth`** (ÅKSJUKA, invented): bar 0→100; rises by `|lateral accel|` above 6 m/s²
  (×1.2 per m/s² excess per s), braking above 14 m/s² (+8/s), any car impact > 3 (+impact×2),
  landing from air (+15); decays 3/s; fail at 100. Teleports (`place`) never count.
- **`goto.fragile`** (SKICK, invented): bar 100→0; impact > 4 costs impact×3; landing −15; fail at 0.
- **`goto.overhear`**: when the player is within `r` of `at`, play `lines` once as world bubbles on
  the speakers (NPC `say`; for absent or hidden speakers the anchor is built by the overhear code as
  `{ x: l.x, y: groundAt(l.x, l.z), z: l.z, height: 1.9 }` from landmark `l`, since landmarks have
  no `y`/`height` and `hud.say` would place the bubble at NaN); `radio: true` plays them as radio
  toasts instead (for drive-bys). With `awaitOverhear`, a started overhear holds the stage open
  until its last line has played; an overhear that never started does not.
- **`follow` route** (Phase 0 fix): the route is start → `via` nodes (shortest paths between them)
  → **`endPoint = to`**; Bigmouth's extra `nearestNode(to)` is **not** appended. `to` must be
  **kerbside**: ≤ 8 m from the road centre line, no solid between it and the road, and ahead on the
  edge leaving the last `via` node (so the AI car never U-turns or cuts across a block). The car
  arrives within 7 m of `to`. Use kerbside landmarks (`grisfestGate`, `fatagaBus`,
  `grillpacoCurb`) for `to` and the block landmarks for the scenes.
- **`follow.minDist`**: the bar shows a green band between `minDist` and `maxDist`; closer than
  `minDist` for more than `minGrace` s fails with `minText`. Phase 3: the closeness counts only
  once the player has **trailed** the quarry (behind it, i.e. `(player − car) · forward < 0`, and
  at least `minDist` back); a quarry that starts towards the player (José in ropavieja) and
  passes him never fails the stage head-on, while tailgating and overtaking still do.
- **`follow` before the start** (Phase 3): until the tail starts (player in a car within 40 m)
  `obj()` returns no bar, so no red "DU TAPPAR DEM!" while he is still driving to the waiting car;
  the arrow and the minimap point at the car.
- **`collect` roll motion** (flight): items stay in |x − 3000| ≤ 0.45, z velocity 0.6–1.4 m/s,
  reflect at lz +12.5 / −16; an item at the serving trolley (in the aisle) or beyond it as seen from
  the player rolls towards the player's side at ≥ 0.9 m/s (it rolls out from under the trolley;
  Phase 2); the kind subscribes `cabin.onJolt` at init (removed in cleanup) and adds ±1.5 m/s per
  jolt. Items are `Collectible(kind)`.
- **`interact`** registers through `game.addInteractable` at init and removes it in cleanup; a
  function `at` is passed as `pos: (g) => at(g)` and re-evaluated every frame.
- **`carry`** sets `game.carrying = {item|who}`; `failOn.bumped` reads `game.bumpedT > 0`
  (trolley/turbulence), `fall` = player state `flung`/`down`, `sprintSecs` = continuous sprint time.
- **`mantra`** sets `game.mantraMode = true` (island J = mantra) for its duration.
- **`haggle`** (invented): the objective bar shows a marker oscillating 0…1 (`sin`, `speeds[round]`
  cycles/s) and a green `zone` of width `zones[round]` at a random position each round; **E** in
  the zone = hit (price → `steps[round]`, play `hit[round]`), outside = miss (+50 shown, play
  `miss`); `maxMiss` misses fail. Win plays `win`, then `game.pay(pay)`. In `?test=1` zone widths
  are 0.6 and speeds × 0.5. The bid is an interactable registered at init with `priority: 100`
  (`prompt '<b>E</b> Bjud!'`) that consumes E while the player is on foot within 3 m of `at`, so E
  never enters/exits a car or talks to someone instead; in a car the stage shows "Kliv ur bilen!".
- **`haggle` staging** (Phase 0b): the seller is placed at `at` (offset 0, 1.2) unless already within
  4 m; when the player arrives on foot the `partner` steps out of the car (if he rode along) and
  stands beside the stall; `start`, `hit[round]` and `win` play as framed dialogues (the marker and
  `stage.inZone` pause meanwhile), `miss` plays as bubbles so the rhythm keeps going. The
  dialogues frame **seller + partner** while the partner stands in the open (Phase 3: he does all
  the haggling, and the seller + player two-shot showed him from behind or hidden by Stig), else
  seller + player. Before each framed talk the two **turn to face each other** (Phase 3 r2, as
  `runner.begin()` turns the giver): at his stall yaw the seller had his back to the side two-shot
  on all seven of his lines when Stig came up the street.
- **`collect` with `who`**: on a touch the guest's `lines` play as bubbles, then `seatOnTouch` /
  `sendTo` moves him. A dialogue or cutaway that starts meanwhile (julafton's party scene right
  after the last guest) takes the live bubble down at once (`game.unsay`: no empty bubble is left
  behind), plays no more lines and drops the late move: the scene has placed everyone it needs
  (Phase 3; a late `sendTo` pulled Berra out of the group shot to the pool bar).
- **`smash.onFoot`**: a prop broken from a car does not count and is revived at once.
- **`follow` / `race` routes** are cleared at init of abandoned cars (unlocked, unnamed, no driver,
  no AI, not the player's) standing within 3.5 m of a lane point: a route car would otherwise wait
  behind a car the player left on the road in an earlier stage or mission.
- **`race` runs on a closed course** (Phase 2 gate fix; `closeCourse` in kinds/core.js, `game.closure`):
  at init moving traffic within 7 m of the course (both lanes) or 28 m of one of its junctions is
  removed; while the race runs no traffic spawns on a road touching a course junction, and a
  traffic car heading into a course junction stops ≈ 11 m short of its centre (nose clear of the
  crossing road), parks, and does not push on into the car ahead, until **both** racers have been
  through that junction (within 10 m of its centre, then 15 m beyond); the grid's own junction
  counts as passed. The stage's `cleanup` reopens the roads (`game.closure = null`). On open roads
  cross traffic met the racers at 35 m/s: a player's car T-boned at the first junction or wrecked at
  the second, and the night bus (`avoid: false`) ploughed through a guagua, lost ≈ 6 s and let a
  crashed player win.
- **`destroy.noExplode`**: the wreck stops in steam and two occupants (`driver` def) step out and
  shake their fists; they stay until the mission ends.
- **`carry.who`**: while the player is still in the car the NPC keeps his seat (sub "Kliv ur
  bilen!"); he is lifted onto the shoulders once the player is on foot. Walk only: `game.speedCap`
  = `walkSpeed` (default the level walk speed); the player cannot enter cars meanwhile.
- **`getInCar`**: a locked named car is unlocked for the mission; a `missionCar` is handed over (AI
  off, unlocked, its driver steps out to the roadside, any driver bust removed); with `any: true`
  the `passenger` moves into whatever car the player took.
- **`dropoff`**: a passenger left behind must be fetched first ("Åk tillbaka efter {name}!"; he
  re-boards when the car stops within 10 m), never an instant 'done'.
- **Rider busts never double a character**: `game.placeNpc`/`showNpc(key)` remove that key's rider
  bust from every car (`game.removeRiderOf(key)`), e.g. fataga's scene placing Siv.
- **`smash`** calls `reviveProps(type, area)` at init (judge trap: retries must find intact
  plates), counts props of `type` within `area` whose `alive` went false after the stage began.
- **`scene`** runs (with `place`/`exitCar`: `exitCar(true)` first) → `place` → `game.cinematic(frame)`
  (or `cam`) → `game.dialog(lines)` → `endCinematic`. Without `place`/`exitCar` a player in a car
  stays seated and the car stops dead first (`car.place` at its own spot zeroes the velocity;
  Phase 3): the framing is computed once, and a car still rolling under the dialogue brake slid
  out of the shot (asnan's paint scene).

### 9.3 Dialogue lines and cues

A line is `[who, text, cue?]`. `hud.runDialog` calls `game.cue(cue)` when the line **starts**. The
same cue objects are used by `timeline.events`, the common `startCue`/`timedCues`/`doneCue` and the
kind cues `useCue` (interact) and `fillCue` (mantra).

| cue field | effect |
|---|---|
| `say: [who, text, secs = 2.6]` | world bubble on that character (`'stig'` = player) |
| `radio: [who, text]` | radio toast with portrait |
| `pa: true` | `audio.dingdong()` before the line/radio |
| `sfx: name` | `audio[name]()` (§12.3); a jingle name (`start complete fail pryl`) plays `audio.jingle(name)`, a trad name (`smaGrodorna hejTomtegubbar helanGar`) `audio.trad(name)` |
| `fear: n` / `relieve: n` | `shame.add(n, { force: true })` / `shame.relieve(n)` (flight meter; bypass `locked`; `fear` interrupts a held mantra) |
| `shake: n` | `cam.shake = max(cam.shake, n)` |
| `applause: secs` | `audio.applause(secs)` |
| `phase: name \| [name, { instant, hold }]` · `seatbelt: bool` · `turbulence: [s, secs, {delay}?]` · `trolley: bool \| 'park'` · `blockers: bool` | cabin calls (`phase` animates unless `instant`; `trolley` = `startTrolley`/`stopTrolley`, `'park'` = `parkTrolley` (Phase 3 r3, §5.8); `blockers` = `setAisleBlockers`) |
| `outfit: {who, name}` | `setPlayerOutfit` / `setNpcOutfit` (re-renders the portrait) |
| `music: name \| {tune, secs}` | `audio.setTune(name)`; with `secs`, revert to the previous tune after; a trad name plays `audio.trad(name)` over the current tune |
| `sky: 'day' \| 'night' \| 'sunset'` | island palette |
| `place: {key: [lm, dx, dz, yaw?]}` · `hide: [keys]` · `show: [keys]` | `game.placeNpc` / `hideNpc` / `showNpc`; the optional 4th element is an **absolute** world yaw (radians; forward = (sin yaw, cos yaw)) that replaces the landmark's yaw; `dx`/`dz` stay landmark-relative (`dx` = left, `dz` = forward) |
| `anim: {who: key \| [keys], flag, secs}` | set `ch.anim[flag] = true` for `secs` (on the player too: fixedStep clears `wings`/`hold`/`flail` only when it set them itself, so a cue pose survives a dialogue) |
| `coins: n` | add (negative = remove, floored at 0) |
| `pay: n` | `game.pay(n)` (Ole pays if short) |
| `flash: css \| 'white'` · `banner: [main, sub, cls]` · `toast: html` | HUD |
| `cut: lm \| {at, dist, height} \| null` | cutaway camera (`game.cutTo`) without moving the player; `null` returns to the dialogue framing |
| `unlock: name` · `sparkle: true` · `endCard: true` | unlock / fx around the player / play the end card after the mission |

### 9.4 Mission def and runner (src/game/missions/runner.js; Phase 0)

```js
def = { id, title, level: 'flight' | 'island', giver, at, reward,
  cost?,                       // pta charged after the intro via game.pay (Ole pays if short)
  extra?: [key | [key, dx, dz]],   // placed at `at` while idle (offset from the tuple, else HOMES offset)
  unlock?, bustFails?, panicFails?,
  intro: [lines], stages: [() => stage], outro: [lines],
  outroPlace?: { key: [lm, dx, dz, yaw?] },  // placed before the outro; key 'stig' = the player;
                               // yaw = optional absolute world yaw (else the landmark's yaw)
  idleAnim?: { key: flag | [flags] },  // anim flags held on the giver/extras while idle (Polish)
  outroCam?: 'player' | [a, b] | { at, dist, height },
  outroHide?: [key],           // hidden through the UPPDRAG KLART! wait until an outro cue shows them
  onEnd?(g, reason),           // 'complete' | 'fail' | 'abort'
};
```

Runner changes (Phase 0):
1. `MISSIONS = [...FLIGHT_MISSIONS, ...ISLAND_MISSIONS]` from `missions/index.js`.
2. `begin()`: intro cinematic with the title card (banner `def.title` / `Uppdrag ${index + 1} av
   ${MISSIONS.length}`, cls `mission intro`, 3.2 s, and the `start` jingle) in the top letterbox
   bar while the intro plays; it is hidden when the intro ends if still up → `if (def.cost) await
   g.pay(def.cost)` → `startMission(0)`. Stage 0 starts on a clear screen (Phase 3: the 2.8 s
   banner in mid-screen covered 40 % of ombord's 7 s seat dash). A def without an intro gets the
   banner (cls `mission`) after the talk, 1.4 s. Stage timers are not paused or delayed for it.
   **After a scene, facing the guide** (Phase 3 r3, `runner.faceTimedGuide()`): when a **timed**
   stage (its objective has a `timer`) starts right after the intro, or right after a stage that
   played a framed dialogue (`g.inDialog` at any frame of it: a `scene`, interact lines), he and the
   camera turn to its guide on foot, as on a retry (item 3, the shared `faceGuide()`); in a car, or
   for an untimed stage, nothing changes. The camera kept its yaw from before the dialogue (`cam.release`
   resumes the follow camera on it): the first gate dash started 168° off its route (the camera of the
   walk from the arch), ombord's seat dash 121° (at the stewardess), sprit's sweep and landning's
   round-up 90°, friskotek's balls 93°, grisfest's flowers 179° and the Tonga drive 160° (at the
   dancers). Measured after: 0° (10° and 26° where `routeAim` leads along the road, fataga and Tonga).
   Only the yaws change, never a position, and every autopilot sets the camera itself, so no timer
   moves (the walk's velocity follows the camera, not his facing; §8 "Timers and difficulty").
3. **Checkpoints**: entering a stage with `checkpoint: true` records `cpI`; `retry()` restarts
   from `cpI` with a fresh `m`: it teleports to `stage.retryAt ?? def.at` (its `approachSpot`,
   facing its yaw, the camera too), then, on the fresh `m` (startMission's `before`, ahead of a
   `retryCar`), re-applies in stage order the **ambient fields** (`sky music phase seatbelt outfit
   trolley blockers`; `phase` always instant) of the `startCue` and `doneCue` of every stage before
   `cpI` (so a grisfest retry is still at night with `vals`), and starts the stage. (Phase 3 r3:
   they were applied before the teleport, under the failed run's `m`, and a manual trolley mode,
   which belongs to the run that set it, §5.8, fell back to auto at once: landning's re-parked
   trolley set off down the aisle in the retried 14B dash. No other field depends on the order.)
   On foot he and the camera then turn to the started stage's guide (the arrow's
   aim: `routeAim` on the island, straight in the flight level; `runner.faceGuide()`), and a stage
   without a target (a scene) keeps the spot's yaw (a timed stage after that scene then faces its
   guide, item 2). Phase 3 r3: the camera kept the yaw it had when the stage failed
   (W walks along the camera), and the spots face their landmark rather than the way to go:
   ombord's seat dash faced the cockpit door, sprit's sweep the rear galley, landning's 14B dash
   row 16's seats and grisfest's Tonga walk away from the car. With the toast `Försök igen!` and
   the `start` jingle (Phase 3 r2: no banner; the 2 s mid-screen title over Stig and the aisle ate
   2 of ombord's 7 s and covered the plates while their clocks ran, and the objective card names
   the mission anyway). The re-applied `phase` is always
   `[name, { instant: true }]`, so a `hold` from the original cue is **dropped** on retry (a chained
   phase then chains on at the next tick, §5.6); a stage that needs the hold after a retry sets it
   again in its own `startCue`. **Rule:** every `checkpoint: true`
   stage whose action happens more than 60 m from `def.at` sets `retryAt` (the Phase-0 `missions`
   scenario asserts it from the data; a stage that repositions the player itself, like `race`, is
   exempt).
   **The fail screen** (`updateFailed`): after 0.8 s, **E** retries and **Q** gives up; there is
   no time-out (Phase 3: a silent 15 s give-up lost the checkpoint and a restart pays `cost`
   again). The keys in the checkpoint stage's `startCue.hide` (stage `cpI`, resolved from its
   factory as `retry()` does) stay hidden on it: `fail()` hides them again (`hideNpc`) right after
   `cleanupMission()`'s `placeNpcs(true)`, in the same frame; the retry's `startStage` re-applies the
   cue, and Q's `placeNpcs(true)` puts them home. (Phase 3 r3 repair2: the placement showed them at
   home at once, and Angerud popped in at his Viking Bar door, under "Tiden är ute!", when asnan's
   paint drive failed in sight of the bar, §8.8 stage 9; that is the only such stage.)
   **`retryCar`** (Phase 3; common option on the checkpoint stage, `kinds/core.js retryCar`): a
   retry otherwise leaves the player on foot at `retryAt` with his car wherever the mission failed
   and the mission cars gone, so a checkpoint before a timed drive could not be won. With
   `retryCar: { at, type?, name?, passenger?, rider?, park? }` a car waits at `at` (landmark,
   `{x, z, yaw}` or lane spot) before the stage's `init` runs (`startMission(from, before)`; e.g.
   `destroy.playerDamageScale` reads `g.playerCar` at init): without `type`, the car the player
   last drove in the mission (`runner.lastCar`, if it is still alive and in the world; repaired),
   else a spare `hatch` he keeps. `lastCar` is kept up to date while the mission runs and survives
   a retry (the retry's car becomes it; Phase 3 r1 island-flow): a stage failed on foot (grisfest's
   plates) still finds the car he left at the finish, where the car he had when the mission failed
   was none, and a spare stood on top of a named car (the hire car) parked at the spot; with `type`, a new mission car named `name` (in
   `m.cars`, removed at the mission's end like the car it stands in for, e.g. bodega's
   `grisbilFollow`). Unnamed parked cars on the spot are cleared; pick a spot without a named
   parked car. `passenger` is seated in it (busy), `rider` rides as a bust (NPC hidden), and the
   player takes the wheel, facing `at`'s yaw; with `park: true` the player stays on foot at
   `retryAt` and the car is parked for a later stage (grisfest's dance floor, then the Tonga
   drive). The `missions` data checks resolve `retryCar.at`, `passenger` and `rider`.
   **`retryFear`** (Phase 3 r3 repair; common option on the checkpoint stage, only the gate's
   statistics, §8.1 [2]): `fail()` empties the meter (`shame.clear()`), and a stage that rebuilds
   only its own share of the fear left a retry short of the first attempt (the gate's retried dash
   started at 48, not ≈ 70). The runner records the meter (`shame.v`) when the stage first starts in
   a run of the mission (`cpFear[stageI]`, kept by its retries, reset by `begin()`), and a retry from
   it adds that back (`shame.add`) on the fresh `m` before the stage starts. First attempts do not
   change.
4. **Common stage options** applied in `startStage()`: `lockMeter` → `shame.locked = true`
   (else false; pursuit mode only, §7.2); `shame` → `shame.forced`; `startCue` → `game.cue()`
   right before the kind's `init`; `timedCues` ticked in `update()` on scaled stage time;
   `doneCue` on 'done'.
5. **Outro**: exit the car first (`exitCar(true)`); then `outroPlace` (every placed NPC is
   unseated first, §14.3). If `outroPlace.stig` is given, the player is teleported there facing the
   first placed NPC; else, if `outroPlace` is set and the player is more than 8 m from the first
   placed NPC, he is teleported to a level-aware `freeSpot` 2 m in front of that NPC, facing it.
   An `outroPlace.stig` tuple with a 4th element (absolute yaw) keeps that yaw instead of facing
   the first placed NPC. Speaker = the **first NPC placed by `outroPlace`**; without `outroPlace`, the first outro `who`
   that is an NPC and not `busy`/seated/hidden, moved next to the player with `freeSpot` (skip if
   none). Camera: `outroCam`, else `frame(speaker, player)`, else `frameOne(player)`. (When
   `outroCam` is given the player is not moved, e.g. ropavieja's spying shot.) The `UPPDRAG
   KLART!` banner (`+{reward} pesetas`, `pta()`), shown when the last stage is done, is hidden when
   the outro dialogue starts 1.6 s later (Phase 3: it sat over the framed faces of the first line).
   **`outroHide`** (Phase 3 r3 repair): `complete()` runs `cleanupMission()` and `placeNpcs(true)`
   before that 1.6 s wait, which shows every NPC with a home again, so a hide cue from a stage or the
   first outro line could not keep someone out of the wait. The keys in `outroHide` are hidden
   (`hideNpc`) right after that placement, in the same frame; an outro `place`/`show` cue shows them
   again, and the idle `placeNpcs(true)` after the outro puts them home (asnan: Angerud, whose home is
   the Viking Bar's door, §8.8). The `missions` data checks resolve its keys.
6. **Ambience**: `fail()` and `abort()` call `def.onEnd?.(g, reason)` and `g.restoreAmbience()`
   (level tune, `mantraMode = false`; island: level palette; flight: the cabin goes back to the
   level's ambient state for the current index: `cabin.stopTurbulence()` (Phase 2), then
   `cabin.setPhase(levelDef.phaseForIndex(index),
   { instant: true })` with no `hold` (so an unheld or held mission phase chain stops), seatbelt sign
   off (no chime), then palette and map source for that phase. A retry re-applies the mission's
   ambient cues on top, item 3); `abort()` also runs
   `cleanupMission()` if needed. `complete()` calls `onEnd(g, 'complete')` after the outro.
7. `cleanupMission()` NPC list = `Object.keys(g.npcs)`; seated home NPCs are re-seated by
   `placeNpcs(true)`; stage-registered interactables, `onJolt` listeners and rider busts are
   removed; hidden riders are shown; flight level: `cabin.setAisleBlockers(false)`; `freezeCar`,
   `carrying`, `holding`, `mantraMode` reset.
8. **After the outro**: `index++` → unlock → save → **if `g.levelFor(index) !== g.level` await
   `g.transitionTo(...)`** → `state = 'idle'` → **`g.placeNpcs(true)`** (giver race fix) →
   toast `Nytt uppdrag: hitta <b>${name}</b> <span class="bang">!</span>` or game complete
   (+ end card). When the end card follows (the last mission, `pendingEndCard`), the unlock is
   `g.unlock(name, { holdToast: true })` and its toast is shown after `playEndCard()` returns
   (Phase 3 r3, §11.7).
9. `onBusted()`: fails `bustFails` missions with `METERS.skandal.bustedFailText`.
   `onPanic()`: returns true and fails with `panicFailText` when running and
   `stage.panicFails || def.panicFails`; else false.
10. English strings → `strings.js` keys (§11).
11. **`idleAnim`** (Phase 0 polish): `{ key: flag | [flags] }` on the def. While the runner is
    `idle` with this mission current and the player is in its level, `runner.syncIdleAnim()`
    (called by main.js every frame) holds `npc.anim[flag] = true` on those characters (meant for the
    giver and `extra`; hidden ones are skipped) and clears exactly the flags it set when that stops
    being true, i.e. **on `begin()`** (before the intro) or when the mission changes. Posed NPCs
    (`runner.idlePose(key)` non-null) do not wave, turn to the player or chatter. Example: buss17
    `idleAnim: { berra: 'slump' }` (§8.6). A pose wanted during the intro is an intro-line `anim` cue.

---

## 10. Collectibles, currency, unlocks, outfits, save

### 10.1 Collectible sets (content/island.js `COLLECTIBLES`; generic code in main.js, Phase 0)

```js
COLLECTIBLES = {
  prylar: { kind: 'pryl', motion: 'spin', beam: true, pickup: 'touch', jingle: 'pryl',
    label: 'Oles prylar', marker: 'pryl', icon: 'pryl-icon', bonus: 1000,
    first: ['ole', 'En av dingsene mine! Finn resten, Stig-Helmer.'],               // [N]
    complete: ['ole', 'Det fikser vi. Vi fikser alt!'], completeUnlock: 'samba',     // [F*]
    items: [
      { id: 'klocka',     lm: 'pryl_klocka',     line: 'Digital, analog, spansk, norsk, svensk tid, kronometer, og så klokke.' }, // [F*]
      { id: 'poolpen',    lm: 'pryl_poolpen',    line: 'Penn som skriver under vannet.' },          // [F*]
      { id: 'kalkylator', lm: 'pryl_kalkylator', line: 'Kalkulator – med vekkerklokke!' },          // [F*]
      { id: 'kniv',       lm: 'pryl_kniv',       line: 'Swiss Army Knife… Saks – uten skrutrekker.' }, // [F*]
      { id: 'kamera',     lm: 'pryl_kamera',     line: 'Kamera. Skjerpe. Smil.' },                  // [F*]
      { id: 'glasogon',   lm: 'pryl_glasogon',   line: 'Mot klor.' },                               // [F*]
      { id: 'pung',       lm: 'pryl_pung',       line: 'Å ha penger i når man svømmer.' },         // [F*]
    ] },
  fenor: { kind: 'fena', motion: 'circle', pickup: 'squash', jingle: 'squeak',
    label: 'Hajfenor', marker: 'fena', icon: 'fena-icon', bonus: 1000,
    first: ['lasse', 'Hajar i poolen igen? Ring kliniken!'],                           // [F*] Lasse's film line, adapted
    complete: ['lasse', 'Inga fler hajar i poolerna. Berra lovar att sluta dricka. Till lunch.'], // [N]
    items: ['fena_flamenco', 'fena_suntrip', 'fena_plaza', 'fena_golf', 'fena_bungalow', 'fena_hamn', 'fena_hav']
      .map((lm, i) => ({ id: lm, lm })) },
};
```

| set | spots (block) | how to reach |
|---|---|---|
| prylar | klocka: bygge girder deck (5,1) y 7.6 · poolpen: Kasbah roof terrace (1,2) y 7.2 · kalkylator: market awning roof (2,1) y 3.4 · kniv: Fataga square (0,0) · kamera: dream-plane wing (6,1) y 3.6 · glasogon: harbour pier end (5,6) · pung: grisfest barn roof (2,0) y 5.4 | ramps, bounce awnings, crate stacks (block agents provide a route and screenshot it) |
| fenor | inflatable shark fins circling (r 1.2, y 0.35) in: Flamenco pool, SunTrip pool, plaza fountain, golf pond, bungalow pool, harbour basin, sea shallows (0, 304) | walk in, kick/stomp (or drive through) |

- Per pickup: +250 pta, `hud.showCollect('<span class="pryl-icon"></span> Oles prylar <b>n/7</b>')`
  and Ole's radio line (prylar) / squeak + splash (fenor). 7/7: `bonus` pta + `complete` radio.
- Collectibles exist on the island only; the big-map legend comes from `game.mapLegend()`:
  `M stänger · ! uppdrag · ● Oles prylar n/7 · ● Hajfenor n/7` (flight: `M stänger · ! uppdrag`).
- Minimap markers within 45 m: types `pryl` (orange dot) and `fena` (blue dot), drawn by hud.js.

### 10.2 Currency: pesetas

- `game.coins` **is pesetas**. A coin pickup is worth **25 pta** (`coin.value = 25`). HUD:
  `1 250 pta` (thin-space thousands).
- Fixed coins: island ≤ 260 (sidewalk lines 26×7, arcs on bygge ramps, dunes, Kasbah stairs,
  lighthouse roof, dream-plane wing), cabin ≤ 30. The pool stays 500 (bursts recycle).
- Prop bursts: `def.coins` coins. Wreck bursts: 8 coins.
- **Sinks**: ¡MULTA! 20 % of the purse, 250–1500 (§7.2) · PANIK −50 · porter bribe −500 · donkey −200 · grisfest −800 ·
  julafton −100 · hittelön −25.
- **No soft locks** — `game.pay(n)`: if `coins ≥ n` deduct; else Ole pays (radio `ole`
  "Jeg spanderer!" [N] + toast `Ole betalade ${n} pta.` [N]) and nothing is deducted. Fines and
  the panic fee are **not** paid by Ole (they just floor at 0).
- Big-map flavour sign at Centro Nórdico (`cita`): `CAMBIO · 1 KR = 17 PTA`.

### 10.3 Unlocks (`UNLOCKS`, content/island.js; generic `game.unlock(name)`, Phase 0)

```js
UNLOCKS = {
  grisbil: { car: { type: 'grisbil', name: 'grisbil', at: 'flamencoDrive', dx: 4, dz: 0 },
             toast: 'Upplåst: <b>Grisbilen</b> – parkerad vid Hotell Flamenco. Den luktar.' },   // [N]
  samba:   { tune: 'samba', toast: 'Upplåst: <b>Musik: samba</b> i pausmenyn' },                 // [N] P1
  bodega:  { hook: 'bodegaLit', label: ['Pepes Bodega', 'bodega'], home: { berra: ['bodega', -1.5, 0.5], robban: ['bodega', 1.5, 0.5], angerud: null },
             chatter: { berra: ['Robban! Jag hittade Pepes Bodega!' /* [F*] */], robban: ['Pepes Bodega. Glöm aldrig det, du.' /* [F*] */] },
             toast: 'Pepes Bodega har öppnat – på baksidan av hotellet.' },                        // [N]
};
```
`home` overrides the island HOMES entry (main.js `homeOverrides`); a `null` home hides the NPC
(`key in homeOverrides`, Phase 3 r2: a falsy override used to be ignored). `chatter` (Phase 3 r2,
main.js `chatterOverrides`) replaces that NPC's free-roam CHATTER on the island. Both are applied
by `applyUnlock`, so a loaded save gets them too. The toast shows on the first unlock only;
`game.unlock(name, { holdToast: true })` (Phase 3 r3) applies and saves the unlock but returns the
toast (or null) instead of showing it, for the runner to show after the end card (§9.4 item 8).
P2: `guardiaJeep` (buyable Land Rover that halves SKANDAL gain).

### 10.4 Outfits

Player: `arlanda` (mission 1) → `kostym` (from mission 1's outro, flight, island until buss17) →
`hawaii` (buss17 outro cue; persisted) → `rio` (end card only). NPC outfits by home set from
`LEVEL_OUTFITS` via `levelDef.outfits(g)` (gate set only while `missions.index === 0`, §4.2) and by cue (`ole` `gris` on grisfest stage 5's `startCue`, `lasse` `jul` in
julafton). Cut fallback: no swaps.
**Re-application (review fix 1):** `placeNpcs(true)` re-applies the home set's outfits
(`applyOutfits`) whenever the runner is not in `outro`, so the gate → flight set follows
`missions.index` without a level change, a cue outfit lasts through its mission's outro and reverts
when the runner goes idle (or on fail; a checkpoint retry re-applies `startCue`/`doneCue` outfits,
so put a mid-mission NPC outfit on a stage `startCue`, not on a dialogue line). The player on the
island keeps `islandOutfit` (persisted by cue); in the flight level the set's `stig` wins.

### 10.5 Save

Key **`charter-and-run-v1`** (localStorage):

```js
{ v: 1, mission: index, coins, collected: { prylar: [ids], fenor: [ids] },
  unlocked: ['grisbil', ...], outfit: 'kostym' | 'hawaii', tune: 'sol' | 'samba' }
```

`load()` clamps `mission ≤ MISSIONS.length`; `?mission=N` overrides; `?fresh` skips loading.
Saved on mission complete, collectible pickup, level transition, and every 30 s.

---

## 11. HUD / UI strings (Swedish; `src/strings.js` owned by WP-H, created by Phase 0)

`strings.js` exports `S` (flat object) and `fmt(key, vars)`. Engine code uses `S.key` only.
Tags: all UI strings are [N] unless noted.

### 11.1 Title screen (index.html)

- `<html lang="sv">`, `<title>Charter & Run</title>`.
- Logo: `<h1><span class="t1">CHARTER</span><span class="amp">&amp;</span><span class="t2">RUN</span></h1>`
  in **Shrikhand** (Google Fonts; fallback Luckiest Guy). `.t1` SunTrip yellow `#f7c31b`, `.t2`
  butano orange `#f07a1e`, `.amp` a spinning sun disc.
- Subtitle (Luckiest Guy): **SÄLLSKAPSRESAN** (uppercase literal, §1.3).
- Line: **Julen 1979. Stig-Helmer är flygrädd.**
- Tagline (italic, small): *"Svenskarna reser inte till någonting… dom reser från någonting."* [F]
  (the film's opening card).
- Buttons: `SPELA` / `Laddar…`.
- Controls card (two columns; the keycaps are Luckiest Guy, so uppercase): `WASD / PILAR` gå · kör
  — `MUS` titta — `SHIFT` spring — `SPACE` hoppa · handbroms · i planet: håll i dig — `J / KLICK`
  sparka · i planet: håll för "Jag kan flyga!" — `E` prata · sätt dig · kliv in/ur — `M` karta —
  `H` tuta — `N` ljud av — `R` loss — `ESC` paus.
- Fine print: `Ett hyllningsspel gjort av fans. Inte knutet till filmens upphovsmän – eller till
  SunTrip, som inte finns. Bränsletillägg tillkommer.`
- Background: the live 3D orbit (§4.2 `titleOrbit`) under a 1979 charter-brochure gradient
  `radial-gradient(#f7a21b55, #1c7fb8cc)` with a halftone dot overlay and a rounded "brochure"
  card (cream `#fff8e6`, ink border).

### 11.2 Loading lines (main.js via `S.loading[]`)

`Avisar vingarna…` · `Bygger Nueva Estocolmo…` · `Överbokar Hotell Flamenco…` ·
`Häller 80-procentig rom på vinflaskor…` · `Målar åsnan röd…` · `Ritar mustascher…`

### 11.3 Pause

`Paus` (Shrikhand) · the Luckiest Guy buttons, uppercase (§1.3): `FORTSÄTT` · `MUSIK: PÅ` /
`MUSIK: AV` / `MUSIK: SAMBA` (P1, after the unlock) · `LJUD: PÅ` / `LJUD: AV` · `RADERA RESAN` →
confirm `Vill du radera resan och börja om på Arlanda?`
Opening the card refreshes both the Musik and the Ljud label from the live state (Phase 3: **N**
mutes without touching the button, which then said `Ljud: på` while muted).

### 11.4 HUD elements

| element | text |
|---|---|
| coins | `{n} pta` |
| meter label | `FLYGRÄDSLA` (flight) / `SKANDAL` (island); pursuit suffix (CSS `::after`) ` · ¡ALTO!` |
| speedo unit | `KM/H` (× 3.6); car name = Swedish `spec.name` or `NAMED_CARS[name]` (`buss17`: "SunTrips buss 17", `hyrbil`: "Hyrbilen", `grisbil`: "Grisbilen", `nattbuss`: "Nattbussen", `joseBil`: "Josés bil", `guardiaJeep`: "Guardia-jeepen") |
| dialogue next | `E ▸` |
| minimap rim badge | `N` (island) / `FRAM` (flight) |
| big-map legend | from `game.mapLegend()` (§10.1) |
| prompts | `<b>E</b> Prata med {name}` · `<b>E</b> Kliv in` · `<b>E</b> Ta bilen` · `<b>E</b> Sätt dig` · `<b>E</b> Res dig` · `<b>E</b> Lås in dig` · `<b>E</b> Ta en juice` · `<b>SPACE</b> Håll i dig!` · `<b>J</b> håll: Jag kan flyga!` (the `<b>` keycap is Luckiest Guy: uppercase). Order (`updateHud`): talk, then `Håll i dig!` while the cabin is turbulent and he stands without holding on (Phase 3 r3, §5.7), then the car, interactable (seats, toilets…) and stand prompts |

**Toasts, bubbles and the objective card** (Phase 3):
- **Toasts** (`hud.toast(text, cls = '', secs)`; radio lines are toasts) stay up `secs`, by default
  by length: `min(7, max(2.4, 1 + 0.06 · characters))` s (the 99-character PANIK toast 6.9 s; it was
  a fixed 2.2 s). At most three at once: a fourth fades the oldest out. A dialogue fades out the
  toasts up when it starts (`hud.clearToasts()`; its own cue toasts come after): the GÄSTER n/4
  toasts stood over the julafton party shot. The column starts at 104 px, or at 196 px while the
  objective card is shown (`#objective.show ~ #toasts`; a stage's radio line overlapped the card by
  7×40 px at 1280×720, 115×40 px at 1024×576). **Under a wide banner** (Phase 3 r2): while a
  banner whose layout box reaches the column (`W/2 + width/2 + 12 > W − 24 − min(430, 0.4 W)`;
  never the `intro` card in the top bar) shows, `hud.showBanner` gives it cls `wide` and sets
  `--banner-drop` on `#hud` (half its height + its tilt's reach, 4 %, 13 % for `multa`, of half its
  width + 12 px), and the column starts at `32 % + --banner-drop` (`40 % + …` with the objective
  card), `transition: top 0.25s`. ¡GUARDIA CIVIL!, UPPDRAG KLART!, KVADDAD!, TURBULENS! and
  SKANDALEN TYSTAD covered the radio toasts' portraits and names (~3 900 px² each at 1280×720).
  There, **with the speedo up**, only the newest two live toasts show (Phase 3 r3, CSS
  `:nth-last-child(n+3 of .toast:not(.out))` → `display: none`; the rest come back when the banner
  goes): at 1280×720 a third toast under UPPDRAG KLART! reached 13–35 px into the speedo for the
  banner's 2.4 s (measured: three 2–3-line radio toasts end at y 598, the speedo's top is 563).
  **Cls `alert`** (Phase 3 r3): `TURBULENS!` while a mission stage runs (§5.7 step 1), in Luckiest
  Guy, red, with a red left edge.
- **Speech bubbles** wrap at 300 px (they were one line up to 750 px), are kept on screen (8 px
  margin), under the coins / meter row (top ≥ 96 px) and under a shown objective card they would
  overlap; a stacked bubble with no room left above waits hidden until the ones below it end.
  **Anchor** (Phase 3 r2): the speaker's real head top, `root.localToWorld(0, model.headTop, 0)`,
  so a plane seat, a car seat (scaled about the hips) and a lean count; the tail tip stops 6 px
  above it (`BUBBLE_GAP`; tail 11 px). A flung or fallen body keeps the steady `y + height`, and a
  plain anchor `{ x, y, z, height }` gives its own head height. The old standing height + 0.6 m put
  a seated passenger's bubble ~1.5 m (113 px) up over the bins and Stig's 40–55 px above his head.
  **Tails point at the speaker** (Phase 3 r3): a bubble stacked above another (or held on screen at
  an edge, `|dx| > 4 px`) gets cls `lead` and a longer, slanted tail (`--tx` its base along the
  bottom edge, at most 18 px from a corner; `--tl` its length; `--ta` its angle) from its bottom
  edge to where a plain tail would end over its speaker's head (8 px below an unstacked bubble's
  bottom edge, `TAIL_H`). Older bubbles are drawn on top (`z-index` 100 − the placing order, kept
  inside `#bubbles` by `isolation: isolate`, so `#banner`'s `z-index: 2` still wins), so the tail
  runs behind the bubble below and comes out under it. The plain tail of a stacked bubble pointed
  at the bubble below: Ole's beside Stig ended 72 px (on foot), 43 px (14A/14B) and 48 px (a sedan)
  above Ole's head; now 9 px, as an unstacked one.
  `game.say` keeps a line up at least `1 + 0.045 · characters` s (halved in test mode, like the
  kinds' `lineSecs`): chatter of 97 characters went after the fixed 2.6 s.
- **The objective card** slides up out of view while the letterbox is on (an in-stage talk:
  haggle, collect, interact lines), where only its bar stuck out under the top bar, and comes back
  with the play. Its **timer** shows the whole seconds left rounded up, `ceil(t)` as `m:ss`, red
  (`urgent`) at ≤ 0:10 (Phase 3 r2): a 6 s stage starts at 0:06 and its last second reads 0:01.
  Flooring showed 0:05 at the start and a whole second of 0:00 with the stage still running.

### 11.5 Engine/stage strings

| key | Swedish |
|---|---|
| getInCar default | `Hoppa in i en bil` |
| out of time | `Tiden är ute!` |
| back in car | `Tillbaka in i bilen!` |
| go back for X | `Åk tillbaka efter {name}!` |
| never leave me | `Lämna mig aldrig igen!`; Ole: `Ikke kjør fra meg igjen!` (`S.neverLeaveOle`, Phase 3 r2: `reboard` picks it for Ole, §1.3) |
| pick up X | `Hämta {name}` |
| slow down | `Sakta in så de kan hoppa in!` |
| go go go | `Kör, kör, kör!` |
| stop the car | `Stanna bilen!` |
| losing / distance / too close | `DU TAPPAR DEM!` / `AVSTÅND` / `FÖR NÄRA!` |
| wrecked X's ride | `Du kvaddade {name}s bil!` (`follow`'s quarry; Phase 3 also `getInCar`'s wrecked `missionCar`, `{name}` = the driver it was handed over from: "Du kvaddade Grisbondens bil!") |
| lost X | `Du tappade bort {name}!` |
| race places | `1:A · KONTROLL {i}/{n}` / `2:A · KONTROLL {i}/{n}` |
| go | `KÖR!` |
| X won | `{name} vann!` |
| target | `MÅL` |
| got away | `Den kom undan!` |
| caught one | `{label} {n}/{m}` |
| mission banner sub | `Uppdrag {i} av {n}` |
| complete | `UPPDRAG KLART!` sub `+{reward} pesetas` (`{reward}` with thin-space thousands, `pta()`: `+2 000 pesetas`) |
| failed | `UPPDRAG MISSLYCKAT` |
| retry prompt | `<b>E</b> Försök igen &nbsp;·&nbsp; <b>Q</b> Ge upp` |
| retry toast | `Försök igen!` (`S.retryToast`; Phase 3 r2: a toast, no longer a banner sub) |
| new mission | `Nytt uppdrag: hitta <b>{name}</b> <span class="bang">!</span>` |
| first start toast | `Prata med <b>Ole</b> i säkerhetskontrollen <span class="bang">!</span> – tryck <b>E</b>` |
| wrecked | `KVADDAD!` |
| reset | `Tillbaka på vägen!` / flight: `Tillbaka i gången!` / R does nothing (the terminal on the toilet dash, §3; `S.resetNone`, Phase 3 r3): `Inte härifrån!` |
| car busy | `Den är upptagen!` |
| no cars in plane | `Det finns inga bilar i ett flygplan.` |
| space first time | `Space: håll i dig (vid turbulens)` |
| sound | `Ljud av` / `Ljud på` |
| fatal | `Något gick sönder: ` |
| game complete | `NUEVA ESTOCOLMO KLARAT!` / `God jul – och tack för resan!` |
| Ole pays | `Ole betalade {n} pta.` (`pta()`) |
| panic idle (`S.panicIdle`, in the cabin) | `Värdinnan följde dig tillbaka till din plats och bjöd på ett glas vatten. Serviceavgift: −50 pta.` |
| panic idle (`S.panicIdleGate`, outside the cabin) | `En SunTrip-värdinna gav dig ett glas vatten vid gate 8. Serviceavgift: −50 pta.` |
| busted | `Guardia Civil tog {n} pesetas i böter` (`pta()`: `1 500`) |
| PANIK fail (`METERS.flygradsla.panicFailText`, §5.9) | `Stig-Helmer fick panik! Håll J: ”Jag kan flyga, jag är inte rädd.”` |

### 11.6 Big-map labels (`MAP_LABELS`)

- flight (gate phase adds the first three): `Säkerhetskontroll` gateArch · `Gate 8` gateDesk ·
  `Herrar` herrtoa · `Cockpit` cockpitDoor · `Främre byssan` galleyFront · `Rad 14` cabinRow14 ·
  `Bakre byssan` galleyBack · `Toaletter` toiletBackL.
- island: `Hotell Flamenco` flamenco · `Hotell SunTrip` suntrip · `La Medina` kasbah · `Viking Bar`
  vikingbar · `Tonga Tonga` tongatonga · `Centro Nórdico` cita · `Plaza · Casa Lola` plaza · `Marknaden`
  marknad · `Templo Ecuménico` kyrka · `Gasolina` bensin · `Guardia Civil` guardia · `Vischan`
  vischan · `Grisfesten` grisfest · `Fataga` fataga · `Golfbanan` golf · `Bungalowen` bungalow ·
  `Bygget` bygge · `Drömplanet` dromplan · `Flygplatsen` airport · `Dynerna` dyner ·
  `Faro de Maspalomas` fyren · `Stranden` playa · `Hamnen` hamn. **`Pepes Bodega` bodega only
  after the `bodega` unlock.** Labels whose landmark is missing are skipped with a console warning.
- The names are data in mixed case; hud.js draws them uppercase (Luckiest Guy, §1.3). The layout
  (`layoutLabels`) avoids other landmark dots and, since Phase 3, the giver's "!" and the objective
  star (13 px boxes; their spots in 8 px steps are part of the layout key): on the gate map, the
  first one a player opens, Ole's "!" covered `SÄKE!ETSKONTROLL`.

### 11.7 Banners and end card

- Mission start: `def.title` / `Uppdrag i av 13` (cls `mission intro`): a one-line title card in
  the top letterbox bar while the intro plays (§9.4 item 2), clear of the framed faces and gone
  before stage 0 starts. `#hud #banner.intro`: top 4.5vh, flex row (main + pill), main
  `clamp(22px, 5vh, 40px)`, no tilt.
- Transition: `LAS PALMAS` / `Soldis och 22 grader varmt.` [F*].
- Grisfest end: `MORGONEN EFTER` / `Julafton på Gran Canaria`.
- **End card** (`game.playEndCard()`, P1, ~10 s, letterboxed): fade to white; camera to `rioCam`
  looking at `rioBoat` with Stig (outfit `rio`), Majsan, Ole (`rio`), Siv placed on the deck and an
  orchestra of busts; tune `samba`; banner `RIO…?` / *"Svenskarna reser inte till någonting… dom
  reser från någonting."* [F] (6 s); fade back; player at `flamencoPool`; banner
  `NUEVA ESTOCOLMO KLARAT!` / `God jul – och tack för resan!`; free roam continues.
  **Wired in Phase 2** (`main.js playEndCard`, called by the runner after the last mission when a
  cue set `endCard`): `shame.clear()`, out of any car, `inDialog` (input frozen), letterbox, every
  toast dropped (`hud.clearToasts()`, Phase 3 r3), white
  flash; sky `sunset`, tune `samba`, Stig `rio` (not persisted), Ole `rio`; Stig, Majsan, Ole and Siv
  on the aft deck at `rioBoat` offsets (0.76, 1.83), (0.45, 2.46), (0, 3.35), (−0.31, 3.98), each
  turned to `rioCam` (Phase 3 r2: one row across rioCam's view at one depth, the couples side by
  side 0.7 m apart and 1 m between the couples, left to right Siv, Ole, Majsan, Stig; the Phase 2
  offsets split the couples and put Majsan half behind Ole, 2.1 m nearer the lens) with every
  `ANIM_FLAGS` pose off (Phase 3 r3: the julafton duet's `wings`, 6 s on Stig and 4 s on Majsan,
  ran on into the card for a player who read on, Majsan's arm across Ole's chest); camera cut from (rioCam, y 3.2) at (rioBoat, y 2.3, z + 1.5); the `S.endCardMain` /
  `S.endCardSub` banner (cls `mission`, 6 s); after 6.6 s another white flash, camera released, sky
  back, `placeNpcs(true)` + `applyOutfits()`, player at `approachSpot('flamencoPool')`, level tune,
  letterbox off, then the completion banner and the `complete` jingle. The runner then shows the
  last mission's held unlock toast (julafton's `Pepes Bodega har öppnat – på baksidan av
  hotellet.`) under the completion banner (Phase 3 r3: unlocked in the frame the card started, it
  lay over the Rio shot for 3.7 s and was gone before the pool). Scenario `endcard` checks the
  card (it calls `playEndCard()` directly, without the runner's unlock).
- Fallback (cut): only the last banner (used when no `endCard` cue fired).
- Width (Phase 3): `width: max-content; max-width: 94vw` (shrink-to-fit at `left: 50%` had only half
  the screen, so a sub longer than its main wrapped at 50 vw: the end card's quote left
  "någonting." alone). `hud.hideBanner()` only drops `show`, so a banner fades where it stood.
- Placement (Phase 2): the banner sits at 32 % of the height, or 40 % while the objective card
  is shown (`#objective.show ~ #banner`), so the two never overlap; it is drawn above the speech
  bubbles (`z-index` 2 inside `#hud`, which is `isolation: isolate`, so the pause and title cards
  still cover it). The end card's banner adds cls `endcard` (top 20 %), clear of the cast and the
  orchestra busts on the wheelhouse roof. A banner wide enough to reach the toast column (cls
  `wide`, Phase 3 r2) moves the column under it while it shows (§11.4 "Under a wide banner").

---

## 12. Music and sound (src/audio.js; WP-H; all synthesised)

### 12.1 Tunes (`audio.setTune(name)` switches at the next bar; scheduler reads the tune table per bar)

| tune | used | sketch (original material only) |
|---|---|---|
| `muzak` | flight level (gate + cabin), title on a fresh save | 92 bpm bossa-muzak, Dmaj7–Bm7–Em7–A7, soft sine pad chords, brushed hats, a sine "chime" melody every 8 bars. Routed through the **fear low-pass** |
| `sol` | island default, title on an island save | 116 bpm straight-eighths charter schlager in A minor, Andalusian cadence Am–G–F–E; "accordion" lead (detuned square pair, 5 Hz tremolo, low-passed) playing an original 8-bar phrase; conga voice (sine 220→170 / 330→250); "timple" triangle arpeggios; root–fifth bass |
| `skandal` | island pursuit | 132 bpm 2/4 paso-doble feel, Am–E7–Am–Dm–E7; brass stabs (filtered saw), snare rolls (noise). The two-tone siren plays on top |
| `vals` | grisfest night (cue) | 3/4 at 150 bpm oom-pah, C–G7–G7–C / F–C–G7–C; bass on 1, chord stabs on 2–3, accordion lead |
| `jul` | julafton (cue) | `sol` re-voiced in A major + sleigh-bell noise ticks |
| `samba` | Ole's boombox (cue), Tonga Tonga, Rio card, unlock | 100 bpm, Dm7–G7–Cmaj7–A7; surdo (sine 60→45 Hz) on 2, tamborim (short high noise ticks), agogô (two square tones) |

**Public-domain traditional cues only** (`audio.trad(name)`, one-shot accordion/square melody over
a ducked music bus): `smaGrodorna` (julafton pool dance), `hejTomtegubbar` (julafton toast),
`helanGar` (faint, end of the buss17 outro). **Never** "Freight Train", "Feliz", Kostervalsen or any
Bengt Palmers theme.

Scheduler fixes (Phase 0): catch-up guard `if (next < ctx.currentTime) next = ctx.currentTime +
0.05`; a `TUNES` table + `registerTune(name, def)` so WP-H can add tunes; music bus → `BiquadFilter`
(low-pass, default 20 kHz) → master, for the fear effect.

### 12.2 Per level / per state

- Flight: `muzak`; FLYGRÄDSLA ≥ 70 → `audio.setMusicLowpass(lerp(4000, 600, (v − 70)/30))` and
  `audio.heartbeat()` every 0.8 s (main.updateAudio, Phase 0); below 70 → `setMusicLowpass(null)`.
- **Cabin drone channel** `audio.drone(level 0..1, bright 0..1)`: a looped 2 s noise buffer through
  a low-pass 300 → 900 Hz (bright) + a 45 Hz saw at low gain; gain `level·0.08`. **Not** touched by
  `main.updateAudio()` (which zeroes the car engine every frame on foot). Silenced by `pause()` and
  by `setLevel('island')`. Cabin levels: gate 0.25 (APU-less DC-8: an external ground unit hum),
  takeoff 0.9/1.0, climb 0.7, cruise 0.45/0.3, approach 0.6, landing reverse 1.0/1.0, landed 0.2.
- Island: `sol`; pursuit → `skandal` + `siren(true)`; escape/bust/bribe → back to the tune before
  the pursuit if it was a mission's (`vals`, `jul`), else the level tune (§7.2).
- **Every mission complete**: `audio.applause(2)` + `jingle('complete')` (the film's applause gag).

### 12.3 Sound effects (Phase 0 placeholders with these names; WP-H polishes)

| name | recipe |
|---|---|
| `chime()` | seatbelt "pling-plong": `tone(659,.5,'sine',.1)` + `tone(523,.8,'sine',.1,null,.4)` |
| `pling()` | call button: `tone(1300,.35,'sine',.12)` |
| `dingdong()` | PA: 659 then 523 Hz sine, 0.45 s each |
| `beep()` | metal detector: 880 Hz square ×3 pulses |
| `applause(secs = 2)` | ~60 short band-passed noise bursts at random times over `secs` |
| `heartbeat()` | 55 Hz sine double thump |
| `rattle()` | `noise(0.3, 0.15, 300)` |
| `flush()` | noise sweep down 2 kHz → 300 Hz, 1.2 s |
| `squeak()` | fin pop: tone slide 900 → 1400 Hz, 0.12 s |
| `siren(on)` | two-tone 650/500 Hz square, alternating 0.45 s, gain 0.05 while on |
| `laugh()` | crowd: 8 short formant-ish noise bursts |
| `knock()`, `slap()`, `doorSlam()` | short filtered noise thumps |
| `ambulance()` | distant two-tone 960/770 Hz sine fading in and out over 4 s |
| `baa()` | tone slide 420 → 300 Hz with vibrato |
| `oink()` | P2 grisbil horn |
| `thud()`, `crash()`, `coin()`, `pickup()`, `splash()` | existing |
| `jingle(kind)` | `start`, `complete`, `fail`, `pryl` (replaces `record`) |
| `trad(name)` | §12.1 |

---

## 13. Visual style and palette

### 13.1 Look

Keep the engine's toon/cel-shading, four-band ramp and ink outlines (`#1d1426`). Re-palette to a
**1979 charter brochure**: sun-bleached whitewash, terracotta, ochre, turquoise pools, palm greens,
orange 70s cabin seats, SunTrip yellow. Colour dramaturgy: grey snowy Arlanda → orange cabin →
cloud whiteout → blue above-cloud sky → hazy descent over the ocean → white-and-ochre island →
orange-violet grisfest night → sunset on Christmas Eve.

### 13.2 Material palette

| group | colours |
|---|---|
| cabin | seat `#D2601F`, antimacassar `#F2EFE6`, wall `#E6DCC4`, rack `#D8CDB4`, curtain `#1F4F55`, stewardess `#1E9AA0`, tray `#9A9A92`, sign red `#E0342A`, carpet `#5a4a3a` |
| plane | white `#F4F4F0`, cheat line `#1B2F6B`, sun `#F07A1E`, belly `#B8BEC6`, fin cap `#C8202A` |
| Arlanda 1976 | orange counters `#d8743a`, wood `#9a6a3a`, brown carpet `#6a4a32`, cream walls `#e8e0cc`, snow `#f2f4f6` |
| island | whitewash `#f4efe6`, terracotta `#c0623a`, ochre sand `#c9a26b`, beach sand `#e8cf98`, Monte Rojo `#a5532f` / `#c27a45`, bougainvillea `#c2307a`, palm `#3f7a3a`, butano `#f07a1e`, sea/pools `#1c7fb8`, SunTrip yellow `#f7c31b`, SunTrip red text `#d8321e`, Guardia green `#2e5e3e` |

### 13.3 Sky / fog / light palettes (fog colour = sky horizon = `body` background, always together)

`setSkyPalette({ top, horizon, fogNear, fogFar, sun, sunI, hemiSky, hemiGround, hemiI, sunDir, cloudRim })`.

**Cloud rim** (Phase 3 r2, optional field): the town clouds' outline colour (`MAT.cloudRim`, the
clouds' own `outlineMat(0.6, …)`). The island palettes set it: `day` `0x6f9ccc` (as before),
`night` `0x101433`, `sunset` `0xa0605a`. A fixed sky-blue rim glowed cyan round the dark night
clouds over the farm, the lighthouse and the race, and blue round the peach sunset clouds on the
julafton mantra and the Rio card; now night clouds get a dark ink-like line and sunset ones a warm
one. The flight palettes leave it out (the town clouds are hidden in the flight level).

| palette | top | horizon | fog near/far | sun / I | hemi sky / ground / I | cabin window |
|---|---|---|---|---|---|---|
| `gate` (flight: gate, takeoff) | `0x8e99a6` | `0xc7ccd2` | 40 / 300 | `0xdfe8f2` 0.8 | `0xc8d4e0` / `0xf0f4f8` 1.5 | `0xb8c0c8` |
| `clouds` (climb) | `0xe8eef4` | `0xf4f6f8` | 160 / 520 | `0xffffff` 1.0 | `0xffffff` / `0xe8eef4` 1.7 | `0xf8f8f8` |
| `above` (cruise) | `0x1f6fd0` | `0xbfe0ff` | 300 / 900 | `0xfff4dc` 2.6 | `0xe6f2ff` / `0xffffff` 1.6 | `0x7fb8ef` |
| `descent` (approach) | `0x2a86e0` | `0xf2e4c4` | 260 / 820 | `0xffe7b8` 2.8 | `0xd8ecff` / `0xa08060` 1.5 | `0x9ad0f0` |
| `island` (landing, landed; island `day`) | `0x2a86e0` | `0xf2e4c4` | 220 / 760 | `0xffe7b8` 2.9 | `0xd8ecff` / `0xa08060` 1.45 | `0xa8d8f8` |
| `night` (grisfest) | `0x141a3c` | `0x3a2f4e` | 120 / 600 | `0x9fb4ff` 0.9 | `0x5a6aa0` / `0x3a2a20` 0.9 | — |
| `sunset` (grisfest dusk, julafton mantra, Rio) | `0x3a4fa0` | `0xf7a26b` | 200 / 760 | `0xffb070` 2.2 | `0xffd8b0` / `0x8a5a40` 1.3 | — |

Flight palettes keep `fogNear ≥ 40` so the interior is never fogged. Night: string lights are unlit
`MeshBasicMaterial` bulbs (grisfest block, Kasbah neon). Lit windows and lamps that glow only after
dark draw while the sky `top` is dark (r + g + b < 0.8: `night` and `sunset`): the hotels' windows
(hotels.js `nightMesh`) and, since Phase 3, the street lamps' lantern panes and star centres
(town.js `nightGlow`, one unlit mesh for the whole island; block builders may add their own night
lights to it in world coordinates while `buildTown` runs). The coast adds the marina's quay-lamp
globes and green harbour light and Gando's apron floodlight faces (each glow a centimetre larger
than the lit face, so they never z-fight). The lighthouse beam (night only) is additive light
fading from warm at the lantern to nothing at its 140 m end, unfogged and outer faces only (Phase 3:
plain alpha read as a grey tube with a disc on its end).

**Sun direction** (Phase 3): the island palettes carry `sunDir`, the sun's offset from the point
`followSun` tracks (+z = south): `day` and `night` `[70, 130, 45]` (high, from the ESE, as before),
`sunset` `[-105, 60, 60]` (low, ≈ 26°, from the WSW: 28° N in December), so the julafton mantra and
the Rio card get long shadows pointing away from the sunset instead of short noon shadows towards
it. The flight palettes have none and keep the default `[70, 130, 45]`; every island palette sets
it, so switching back restores it. The 150 m shadow frustum holds the long shadows.

### 13.4 CSS tokens (style.css; WP-H)

Keep `--ink #1d1426`, `--cream #fff8e6`, `--yellow #ffd23f`. Replace purple/pink with `--sun
#f7c31b`, `--orange #f07a1e`, `--sea #1c7fb8`, `--teal #1e9aa0`, `--terracotta #c0623a`,
`--sand #e8cf98`. Meter fills: `.fear` `linear-gradient(90deg, #6ab0e8, #e0342a)`, `.skandal`
`linear-gradient(90deg, #f7c31b, #d8321e)` (as shipped by WP-H, each with a middle stop for a
richer ramp: `.fear` `#6ab0e8, #b070c0 60%, #e0342a`, `.skandal` `sun, orange 55%, red`; same end
colours, gradient over the whole bar). `body.fear-hot` adds a pulsing red vignette.
Pause card `--sea`. Big-map/minimap outside fill sand `#d9bf86`. Icons: `.pryl-icon` (a watch),
`.fen-icon` (a fin). Banner cls `skandal` replaces `shame`; add cls `fear`.

---

## 14. Architecture: files, owners and engine APIs

### 14.1 File map (Phase 0 creates/changes everything listed; "P1 owner" may edit in Phase 1)

| file | status | P1 owner | contents |
|---|---|---|---|
| `src/main.js` | edit | **none** (Phase 0 / Phase 2 only) | level system, cues, interactables, seats, pay, collectibles (generic), NPC homes, init order, test hooks |
| `src/level.js` | new | none | `LEVELS`, `ISLAND_PALETTES` (imports `CAM_CABIN`, `FLIGHT_PALETTES` from cabin.js, `METERS` from meters.js) |
| `src/meters.js` | new | **H** | `METERS.flygradsla`, `METERS.skandal` (§5.9, §7.1) |
| `src/strings.js` | new | **H** | `S`, `fmt()` (§11) |
| `src/content/index.js` | new | none | merges `HOMES`, `MAP_LABELS`, `LEVEL_OUTFITS`, re-exports all content |
| `src/content/flight.js` | new | **F** | `HOMES_GATE`, `HOMES_FLIGHT`, `MAP_LABELS_FLIGHT`, `CHATTER_FLIGHT`, `OLE_STATS`, `LEVEL_OUTFITS_GATE`, `LEVEL_OUTFITS_FLIGHT` |
| `src/content/island.js` | new | **G** | `HOMES_ISLAND`, `MAP_LABELS_ISLAND`, `CHATTER`, `OUCH`, `GETUP`, `CARJACK`, `NPC_KICKED` (+ the `_OLE` / `_LOCAL` tables, `LOCAL_CAST`, `BARKS`: Phase 3 r2, §14.10), `COLLECTIBLES`, `UNLOCKS`, `NAMED_CARS`, `LEVEL_OUTFITS_ISLAND` |
| `src/game/missions/index.js` | new | none | `MISSIONS = [...FLIGHT_MISSIONS, ...ISLAND_MISSIONS]`, `MissionRunner` re-export |
| `src/game/missions/runner.js` | new (from missions.js) | none | `MissionRunner` (§9.4) |
| `src/game/missions/kinds/core.js` | new | **none** (frozen after Phase 0) | getInCar goto pickup dropoff follow rabbits race destroy grab scene |
| `src/game/missions/kinds/flight.js` | new | **none** (frozen) | collect sit interact carry mantra timeline |
| `src/game/missions/kinds/island.js` | new | **none** (frozen) | haggle smash |
| `src/game/missions/kinds/index.js` | new | none | re-exports |
| `src/game/missions/flight.js` | new | **F** | `FLIGHT_MISSIONS` (indices 0–4) |
| `src/game/missions/island.js` | new | **G** | `ISLAND_MISSIONS` (indices 5–12) |
| `src/game/missions.js` | **deleted** | — | |
| `src/game/shame.js` | edit | **H** | configure/panic/pursuit/walker/hideouts |
| `src/game/hud.js` | edit | **H** | map sources, meter, strings, legend, ring, blips, zone bar, markers; `renderPortrait` restores the model transform (§14.8) |
| `src/game/camera.js` | edit | **A1** | profile, frameOne, cutTo, `clampZ` |
| `src/game/fx.js` | edit | **A1** | `snow`, `steam`, `meterPuff` (rename of `shame`) |
| `src/game/markers.js` | unchanged | none | |
| `src/gfx.js` | edit | none | `setSkyPalette`, `setCloudsVisible`, `setShadows`, `MAT.sky`, `MAT.water` sea colour |
| `src/audio.js` | edit | **H** | §12 API |
| `src/input.js` | edit | none | pad Start → `pause` |
| `src/util.js` | unchanged | none | |
| `src/world/frame.js` | new (from town.js) | none | `Frame` |
| `src/world/registry.js` | new | none | `worldHooks` |
| `src/world/layout.js` | edit | **B** | `MAP`, `BLOCK_MAP_COLORS`, `laneSpot` (Phase 0) |
| `src/world/landmarks-island.js` | new | none (Phase 2 applies reported changes) | canonical island landmark table |
| `src/world/town.js` | edit | **B** | streets, outskirts, residential, dispatch via `BLOCK_BUILDERS` |
| `src/world/props.js` | edit | **B** | `TYPES` (§6.8), flags, `reviveProps`, `propsOfType` |
| `src/world/collision.js` | edit | none | `segmentBlocked` nearest hit |
| `src/world/blocks/index.js` | new | none | `BLOCK_BUILDERS` merge |
| `src/world/blocks/hotels.js` | new | **C1** | `flamenco`, `suntrip` |
| `src/world/blocks/centre.js` | new | **C2** | `kasbah`, `cita`, `plaza`, `marknad`, `kyrka`, `bensin`, `guardia` |
| `src/world/blocks/nature.js` | new | **D1** | `tomat`, `grisfest`, `fataga`, `golf`, `bungalow`, `bygge`, `dyner` |
| `src/world/blocks/coast.js` | new | **D2** | `flygplats`, `dromplan`, `fyren`, `playa`, `hamn` |
| `src/world/cabin.js` | new | **A1** | §5 interior, collision, seats, trolley, turbulence, fear, interactables, blockers, `CAM_CABIN`, `FLIGHT_PALETTES`, `FEAR`; calls `buildFlightScenery` |
| `src/world/flightScenery.js` | new | **A2** | §5.6 visuals: gate-set visuals, airframe, animated scenery per phase, `buildFlightScenery`, `buildPlaneExterior` |
| `src/world/rio.js` | new | **B** | `buildRioCard` (P1) |
| `src/actors/models.js` | edit | **E** | `CHARS`, `CAST`, new def fields, anim flags, `buildBustGeo`, `outfitDef`, `randomPed` palette |
| `src/actors/character.js` | edit | **E** | `setDef`, `hidden`, `seatAt`, `standAt`, new anim flag defaults |
| `src/actors/car.js` | edit | **E** | §6.6 types/flags, `registerCarType`, `build`/`noWheels`/`noSpeedo`/`noExplode`/`livery` |
| `src/actors/pickups.js` | edit | **E** | `COLLECT_KINDS`, `registerCollectKind`, `Collectible` table, `Rabbit` meshes, coin value 25 |
| `src/actors/peds.js` | edit | **E** | Swedish/Spanish shouts |
| `src/actors/drivers.js` | Phase 2 edit | none | (accepts duck-typed paths); an AI bus's lane path starts its turns 11 m from the junction centre instead of 8.5 (left-turn radius 13.75 m > the bus's ≈ 12 m minimum), so the excursion bus no longer swings into the grisfest farm wall; right turns stay too tight for buses (mission bus routes turn left only); traffic holds short of a closed race junction (`game.closure`, §9.2 race) |
| `index.html`, `style.css` | edit | **H** | §11, §13.4 |
| `tools/shot.mjs`, `tools/lib.mjs`, `tools/scenarios/core.mjs`, `tools/story/common.mjs` | edit/new | none (Phase 2) | harness, `T` API, core scenarios `start walk aerial drive traffic title talk missions views transition` + `levels` (boots into both levels) + `api` (Game API smoke test) |
| `tools/fixtures/full-missions.js`, `tools/scenarios/kinds.mjs` | new (Phase 0b) | none (Phase 2) | the literal §8 missions as a test fixture; scenarios `fullstory` (plays them per §16.3) and `kinds` (option checks) |
| `notes/calibration-samples.md`, `tools/pool.mjs` | new (Phase 3 r1 repair 2) | none | the raw-sample ledger of the random stages' timers (every run's time, code, autopilot version, exclusions) and the tool that pools it by stage and pool and prints n, median, p75, T_ref, timer and the 90 % range (§8 "Timers and difficulty") |
| `src/world/blocks/stub.js` | **deleted** (Phase 2 docs step) | — | was `stubBlock()`, the shared placeholder look of the Phase 0 stub block builders; unused once every block had its real builder |
| `tools/scenarios/flight.mjs` | new | **A1** | gate, cabin, trolley, turbulence, panic |
| `tools/scenarios/scenery.mjs` | new | **A2** | phases (one shot per flight phase from inside and outside) |
| `tools/scenarios/island.mjs` | new | **B** | smash, foot |
| `tools/scenarios/cast.mjs` | new | **E** | castsheet, cars |
| `tools/scenarios/meter.mjs` | new | **H** | skandal, ui |
| `tools/story/flight.mjs` | new | **F** | `M_FLIGHT` (M[0..4]) |
| `tools/story/island.mjs` | new | **G** | `M_ISLAND` (M[5..12]) |

**Scenario names are unique across all scenario modules** (shot.mjs merges them into one table;
a duplicate name is a load-time error). A package may run any scenario as a self-check, whoever
owns it.
| `README.md`, `CLAUDE.md`, `Makefile`, `package.json`, `package-lock.json`, `../CLAUDE.md` | edit | none (Phase 2) | docs (README: Swedish player-facing overview + English code map and tests), `#13 idle`, port 8840, `name: charter-and-run`, `test` → story, latest-game pointer (§15.3 step 6) |

### 14.2 Init order and frame order (main.js, Phase 0)

Init: `initGfx` → `input.init` → `hud.init` → `fx.init` → fonts (Luckiest Guy ≤ 2.5 s) →
`buildTown(scene)` (calls `registerIslandLandmarks()` first, then `streets`, every block via
`BLOCK_BUILDERS[MAP[j][i]]`, `outskirts`, ped loops) → `this.cabin = buildCabin(scene, this)` →
`buildRioCard(scene)` (if present) → `finalizeProps(scene)` → `initCoins(scene)` →
`hud.buildBaseMap()` → `placeWorldCoins()` → `this.cabin.placeCoins()` → parked cars → traffic (20)
→ peds (34) → NPC `Character`s (one per `CHARS` key except `stig`, the radio-only keys `levander
kapten pa guardia pax telefonist` and the cabin-owned `vardinna2`; `key` field; hidden until placed, §2.3) →
player `Character(CHARS.stig)` (`key = 'stig'`) → collectibles (`COLLECTIBLES`) → markers → `Shame`
→ `MissionRunner` → `CamRig` → `load()` → `setLevel(levelFor(index), {instant:true})` →
`placeNpcs(true)` → spawn the player → portraits for every key in `CAST` (`renderPortrait`
restores each model's parent and transform, so seated cast members stay in their seats) →
`applySaveToWorld()` →
loop → `window.__ready = true` → `start()` in test mode.

Frame (`update`): hooks → one-shots (incl. E/J/R while seated) → fixed steps (player intent incl.
mantra/hold, AI, cars, people — traffic/peds skipped when `!levelDef.sim.*`) → `syncAll` (also
writes `ch.x/y/z` from `car.seatWorld(ch.seatSide)` for every car-seated character, player
included, so framing, bubbles and distance checks see where they really are) → `missions.update` →
`missions.updateFailed` → `shame.update` → `cabin.tick(dt·timeScale, t, game)` (flight only) →
pickups/collectibles → props → `fx.tick` → `tickTown` → markers → camera → sun/sky → HUD → audio →
traffic recycling (island) → autosave.

### 14.3 Game API (main.js; Phase 0; **the contract every agent codes against**)

```js
// ---- state ----
game.level; game.levelDef; game.timeScale;            // §4.4
game.cabin;                                           // cabin object (§14.7)
game.player;  game.npcs[key];  game.cars;  game.named[name];
game.coins;                                           // pesetas
game.collected = { prylar: Set, fenor: Set };  game.unlocked: Set;
game.holding;      // bool: Space held in flight (set in fixedStep)
game.mantraOn;     // bool: mantra currently held (after wind-up)
game.mantraMode;   // bool: island J = mantra (mantra stage)
game.carrying;     // null | { item } | { who }
game.bumpedT;      // > 0 for 0.4 s after a trolley bowl / turbulence fall
game.inDialog;  game.autoDialog;  game.dialogSpeed (55, TEST 220);
game.closure;      // null | a race's closed course { nodes: Set<nodeId>, update(), closed(nodeId) }
                   // (Phase 2 gate; set by race init, cleared by its cleanup; §9.2 race)

// ---- levels ----
game.levelFor(index) -> 'flight' | 'island'
game.setLevel(name, { index, instant = true } = {})
async game.transitionTo(name)
game.restoreAmbience()                    // level tune, mantraMode=false; island palette; flight:
                                          // cabin.stopTurbulence() (Phase 2), then
                                          // setPhase(phaseForIndex(index), {instant}) no hold,
                                          // seatbelt off, palette + map for it (§9.4 item 6)
game.levelTune() -> name                  // review fix 1: the level's ambient tune (flight `muzak`;
                                          // island game.islandTune). Everything that reverts the
                                          // music uses it (setLevel, restoreAmbience, shame.endPursuit
                                          // unless a mission's tune played before, grisfest onEnd)
game.islandTune                           // 'sol' | 'samba' (saved as `tune`, §10.5)
game.setIslandTune(name)                  // switches now only if the island's ambient tune is
                                          // playing (never over `skandal` or a music cue); saves
game.cycleMusic() -> label;  game.musicLabel()   // pause-menu Musik: på → samba (after the
                                          // unlock) → av → på (§11.3)
game.setSky(name)                         // island palettes: 'day' | 'night' | 'sunset'

// ---- NPCs ----
game.npc(key)                             // 'stig' → player
game.charDef(key)                         // CHARS[key]
game.placeNpc(key, lm, dx = 0, dz = 0, yaw?)   // unseat first (car: g.unseat(ch); plane seat:
                                          // cabin.unseatCharacter(ch)), then teleport, show,
                                          // busy = true until placeNpcs(true); key 'stig' = player
game.hideNpc(key);  game.showNpc(key)     // hideNpc unseats first too
game.placeNpcs(force = false)             // §4.5; force also re-applies levelDef.outfits(g)
                                          // (applyOutfits) except during an outro (§10.4)
game.setNpcOutfit(key, name);  game.setPlayerOutfit(name)   // re-render portraits
game.say(target, text, secs = 2);  game.radio(who, text)   // say: at least 1 + 0.045 s a character
                                          // (halved in test mode; Phase 3, §11.4); an empty text or
                                          // secs <= 0 is an unsay
game.unsay(target)                        // takes target's bubble down now (hud.unsay); saying(t)
                                          // false, sayEnd back to the bubbles still up (Phase 3)
game.bark(ch, kind) -> text               // kind ouch | getUp | kicked | carjack: a line from the
                                          // speaker's table (Ole / local / Swedish; §14.10, r2)

// ---- flight seats ----
game.sitPlayer(seatId) -> bool            // via cabin.seatCharacter; sets player.seatId
game.standPlayer()                        // to the seat's aisle spot; player.seatId = null

// ---- interactables ----
game.addInteractable({ id, x, z, y = 0.15, pos?(g) -> { x, z, y? }, r = 1.2, prompt, priority = 0,
                       whileSeated = false, enabled?(g), use(g) }) -> remove()
// pos (if given) is evaluated every frame and overrides x/z/y (moving anchors such as the trolley).
// nearestInteractable order, standing: interactables with priority ≥ 100 (haggle bid) > mission
// giver talk (idle, < 3.4 m) > other interactables (enabled, in range) by priority then distance >
// cars (if verbs.enterCars and !car.noEnter and !locked shown as prompt).
// Seated: whileSeated interactables by priority then distance > 'stand' (unless the stage has
// lockSeat). Giver talk is never offered while seated (stand up first).

// ---- cars and riders ----
game.ensureNamedCar(name);  game.spawnMissionCar(m, type, x, z, yaw, opts)
game.seat(ch, car, side);  game.unseat(ch, x?, z?)          // existing
car.seatWorld(side) -> { x, y, z }                           // Phase 0 (car.js): world seat position
game.addRider(defKey, car, slot = 'rear') -> Object3D        // decorative bust; slots 'rear' | 'bed' | 'window1..4'
game.removeRiders(car)
game.removeRiderOf(key)                  // Phase 0b: drop that character's rider busts (placeNpc/showNpc call it)
game.speedCap                            // Phase 0b: null | m/s cap on walk/sprint (carry); sprint off while set

// ---- cinematics / dialogue / cues ----
game.cinematic(a, b);  game.cinematicOne(a);  game.endCinematic()
game.cutTo(spec);  game.endCut()          // spec = lm name | { at, dist, height } ; camera only
game.inCutaway -> bool                    // Polish: true while a cutaway camera is active (cutTo,
                                          // a `cut` cue, a scene `cam`, a cutTo outroCam) until
                                          // endCut/endCinematic. shame.js (WP-H) defers PANIK
                                          // while it is true
async game.dialog(lines)                  // lines: [who, text, cue?]
game.cue(c)                               // §9.3
game.wait(secs)

// ---- money / unlocks / end ----
async game.pay(n) -> true                 // Ole pays if short (§10.2)
game.addCoins(n)                          // negative allowed, floors at 0
game.unlock(name, { holdToast }?) -> held toast | null   // UNLOCKS[name] (§10.3)
async game.playEndCard()                  // §11.7: the Rio cinematic (wired in Phase 2), then
                                          // back at flamencoPool with the completion banner

// ---- meter hooks ----
game.onPanicIdle()                        // §5.9
game.interruptMantra()                    // jolts and fear cues: a held mantra restarts its wind-up (0.6 s)
game.frozenT                              // > 0 while frozen (bust freeze); input ignored (R too)
// Frozen player car (inDialog, mission 'failed', frozenT, PANIK, or game.freezeCar: the race
// countdown): brake only while rolling forward (car.js reads brake at < 0.5 m/s as reverse),
// handbrake on, so it stops and holds. Phase 3 r2: brake 1 crept every car but the bus backwards
// to −0.35 × top speed, 22 m back off the race grid by "KÖR!".

// ---- map ----
game.mapMarkers(all);  game.mapLabels();  game.mapLegend() -> html

// ---- tests ----
game.debugWarp(x, z, yaw)                 // stands up first if seated; snapNext
game.approachSpot(lm) -> { x, z, yaw }    // §4.4 spawn rule (landmark + 1.5 m facing back, else the landmark)
game.freeSpot(cx, cz, rMin, rMax, ok?) -> { x, z }   // random free ground spot; ok(x, z) filters (Phase 2)
game.footReach(cx, cz, R) -> (x, z) => bool   // on-foot flood fill (0.5 m grid, 0.45 m step, no jumps; Phase 2)
game.lmOffset(lm, dx, dz) -> { x, z, yaw }   // a HOMES-style offset from a landmark
game.unseatAny(ch)                        // off a car seat or a plane seat
game.testMode                             // ?test=1
window.__game, __lm(name), __props, __stats(), __ready, __frame
```

Hard-coded Bigmouth names removed: `'nick'` (→ `PLAYER_KEY = 'stig'`), the `cleanupMission` key
list, `got.records/mosquitoes`, `spawnMuscle`, `'hydrant'`/`'pump'` special cases, `isHearse`
(→ `isPursuer`), the "Hey Nick." fallback, `BRIDGETON COMPLETE!`, `resetToRoad` literals 80/280.

### 14.4 gfx.js (Phase 0)

```js
export function setSkyPalette({ top, horizon, fogNear, fogFar, sun, sunI, hemiSky, hemiGround, hemiI, sunDir, cloudRim })
  // sky uniforms (sky material stashed as MAT.sky), scene.fog colour/near/far, document.body bg,
  // sun colour/intensity, hemi colours/intensity, sunDir [x, y, z] = the sun's offset from the
  // followSun point (Phase 3, §13.3), cloudRim = the town clouds' outline colour (MAT.cloudRim;
  // Phase 3 r2, §13.3). Missing fields keep their value.
export function setCloudsVisible(on)     // MAT._clouds.visible
export function setShadows(on)           // sun.castShadow
export function signMesh(text, w, h, opts) -> Mesh   // opts.double (Polish): adds a child plane
  // turned π about Y with the same material, so the text reads unmirrored from both sides (each
  // plane FrontSide). Callers position/rotate the returned mesh as before.
// MAT.water retinted 0x1c7fb8 (sea and pools). tickSky unchanged (clouds hidden in flight).
```

### 14.5 camera.js (Phase 0; WP-A1 may tune)

```js
cam.profile = null | { pivotH, dist, pitchMin, pitchMax, pitch0, noPull, fov, cineSide, cineUp, clampZ? }
cam.clampActive = bool     // set each frame by main: flight level && cabin.inCabin(focus); then the eye z
                           // is clamped to profile.clampZ and pitch steepens (§5.3)
cam.openFloor = bool       // set each frame by main: the gate lounge (§5.3); frame/frameOne then use the
                           // Bigmouth framing despite the profile (cine.open: fov 50)
cam.setProfile(p)          // sets profile, snaps pitch to p.pitch0, snapNext; null = Bigmouth
cam.frame(a, b)            // profile-aware (§5.3); two people < 0.3 m apart: from in front of a
cam.frameOne(a)            // single-target framing (both modes)
cam.cutTo({ x, y, z }, { x, y, z })   // cine pos/look; release() returns
// on-foot branch: pivotH/dist/fov from profile; pitch clamped to [pitchMin, pitchMax] in both the
// mouse branch and every frame; pull-in skipped when noPull.
```

**Pull-in** (Phase 3; on foot and in cars, no `noPull` profile): the pivot→eye sight line is
tested with `segmentBlocked(…, 'prop', 0.25)` (0.25 m samples; at 0.8 m palm trunks and poles were
missed) and the eye stops 0.45 m (level) short of the first sample inside a solid, but never
closer than `ARM` 1.6 m. With less level room than that arm allows at the current pitch (his back
to a wall), the eye **climbs** on the 1.6 m arm (`pitch = acos(room / 1.6)`); past `CAP` 1.25 rad
it stays at that angle, moves in over the head (level offset = the room, ≥ 0.05 m) and looks
further ahead instead (as the cabin `clampPitch`). Until Phase 3 the 1.6 m floor put the eye
inside the wall (a one-colour frame at 2.4–8.9 % of standable spots × 8 headings in the hotel and
centre blocks); a sweep of the real rig over the same spots finds 0. Bushes and other `prop`
solids stay see-through by design. **Stand-off disc** (Phase 3 r2, both modes): the eye then keeps
`EYE_R` 0.45 m off every solid's face (`discPush` with top ≥ the eye − 0.3), not only along the
sight line: met at a slant the line's 0.45 m left it 0.05–0.3 m from the wall, inside façade relief
(Flamenco's piers 0.31 m, the band 0.21 m, window boxes 0.42 m). It is pushed out; if a solid then
stands between it and the pivot (a corner), it is pulled in along the sight line until the disc is
clear. **Camera ceilings** (§14.7) keep the eye out of registered overhangs, on foot and (Phase 3
r2) in cars. **Side slide** (Phase 3 r2, on foot; continuous since r3): his back to a wall under a
low ceiling, the capped climb left the eye 0.35–0.6 m over his head (a top-down view of his
shoulders), and a capped eye 1.6–2.6 m out sat against his back with his head cut off. When a
ceiling caps the eye or hangs within 0.5 m above it (`ceilingOver`, grown 0.3 m) and the eye is
nearer the pivot than `SIDE` 2.6 m, the eye's target is a slide along the wall to `SIDE` from the
pivot (the side it is on; tested at 0.25 m with the 0.45 m stand-off; no slide with less than 0.3 m
of room), and down to 0.6 m above the pivot only as far as that keeps it no nearer than before: a
three-quarter view of him with the way ahead (at 1.5–1.9 m he filled the frame). **The side** is kept
`SLIDE_HOLD` 0.3 s (`cam.slideT`, from when the slide took it) before the other side may take over
with `SLIDE_HYST` 0.5 m more room; sooner only when this side has collapsed and the other has more
room: 0.3 m or less, or cut this frame by more than `SLIDE_CUT` 0.2 m (a room sample) so far that the
slid eye would come within `NEAR` 1.2 m (level) of the pivot, with `SLIDE_HYST`/2 more room on the
other side (r3 repair2: without the hold the eye cut from shoulder to shoulder 4 frames apart in the
1.3 m slot by the friskotek's notice board; on any cut by 0.5 m it cut 3 m to the other shoulder for
0.1 m more room). The slide is a lateral offset kept in the rig (`cam.slide`, + = his right), eased
towards its target within one side, out at `SLIDE_K` 6/s (towards 0 once no ceiling is near or the
eye is `SIDE` out) and in at `SLIDE_IN` 12/s (the eye starts out close over his head), and cut each
frame to the room each side has; it is 0 in cars, with a profile and after a snap. Four cases are
cuts (the slide goes straight to its target and the eye snaps with it): a **swap of sides** (eased
through 0, the eye passed through his head as the camera turned under a low ceiling with a wall
near: r3 repair); a slide that **starts** (under 0.3 m) **as the eye is cut in** by more than 1 m
relative to him (`cam.lpx/lpy/lpz`, last frame's pivot; a pole pulls it in as the camera turns, or a
canopy starts to cap it and drops it: the eye jumps anyway, and eased in it sat over his head for a
frame or two); a slide that, eased, **would hold the eye within `CLOSE`** 1.0 m of the pivot where
its target would not (r3 repair2: strafing under the bungalow awning the cap dropped the eye 0.95 m
and the eased slide held it 0.72 m from his head; not at `NEAR`: walking under a balcony row with the
eye 1.1–1.2 m over his head that turned the ease into a 2.6 m sideways cut); and a **wedged** eye:
0.1 m or more behind the pivot with so little room to either side that the slid eye would stay
nearer than `ARM` (his back in a corner: the back of the fold between its wall and crag 1's end),
when a slide measured from the pivot itself (beside him) takes it further out, to the side with more
room. Once wedged (`cam.wedged`, `cam.wedgeT`) it stays so for `SLIDE_HOLD` and then until the slid
eye would be `ARM` + 0.3 m out, and keeps its side unless the other has `SLIDE_HYST` more room or this
one 0.3 m or less (r3 repair2: the room is sampled every 0.25 m, and the bare test toggled as the
camera turned under the fold's shelter, 3–4 cuts out to the side view and back per turn; a 0.3 m
band alone still let a slow turn in and out twice, as the pull-in's 0.25 m steps moved the eye's
base). Until r3 it was all or nothing (only
nearer than `ARM` − 0.05) and every frame with a wall behind snapped the eye: walking out from under
a porch, the eye jumped 2.2–2.7 m in one frame (141 of 606 real-input walks under the island's
ceilings). Every pull-in or push snaps the eye (no
damping lag into the wall) — in height only downwards: a ceiling that stops capping lets the eye
rise at the damped rate (9.8/s). **Dialogue framing** (`frame`, `frameOne` without a profile): the side whose sight line is
clear; when both are blocked, the side with more room, the eye 0.45 m short of the solid (≥ 1.6 m
out) instead of inside a house (fataga's 13 m two-shot).

### 14.6 Actors (Phase 0 minimal; WP-E owns afterwards)

**models.js**
```js
export const CHARS = { stig: {...}, ... };         // keys = Appendix A; Phase 0: approximate looks
export const CAST = Object.keys(CHARS).filter((k) => CHARS[k].portrait !== false);
export function buildCharacter(def), animateCharacter(m, st, dt), randomPed(r, { flight } = {}), buildBust(def)
export function buildBustGeo(def) -> BufferGeometry   // merged bust, origin at torso bottom, +z forward
// randomPed(r, { flight: true }): Swedish charter passengers only (no locals) for the cabin, lounge,
//   walkers and stowers; a ped def has `local: bool` (Spanish local, ~30 % on the island). Random
//   sequences changed in WP-E (the shorts draw follows the dress draw), and buildBust/buildBustGeo
//   drop a random ped's sunhat or bucket hat. buildBust(def).userData.h = the bust's height (seat fit).
//   The model has m.legLen and m.headTop (= m.height).
export function outfitDef(key, outfit) -> def         // { ...CHARS[key], ...CHARS[key].outfits?.[outfit] }
```
New def fields (WP-E implements; unknown fields are ignored until then): `hat`
(`'trilby' | 'pilot' | 'tricorn' | 'bucket' | 'sunhat' | 'tomte' | 'scarf' | 'cap'`; `'cap'` as a
hat on top of hair; its colour is `hatC`, Phase 0a), `dress` (colour; cone skirt), `shades` (colour; filled lenses), `beard`,
`print: [c1, c2, c3]` (confetti blobs on the torso), `tuft`, `tie`, `bowtie`, `vest`, `held`
(`'camera' | 'boombox' | 'accordion' | 'congas' | 'cup' | 'mirror' | 'broom' | 'giraffe' |
'butterKnife' | 'knacke' | 'handbag'`), hair `'page'`, `hairFlower`, `ring` (css), `outfits`, `portrait`.
WP-E added (full list in the models.js header): `capStyle`, `printStyle` (`confetti | dots | floral |
check`), `stripe`/`stripes`, `sash`, `scarf` (neck), `apron`, `belly`, `collar`, `suit` (shirt colour
in the jacket's V), `coat`, `epaulets`, `badge`, `chain`, `belt`, `pinafore`, `shorts`/`baggy`,
`legsC`, `hands`, `glassesBig`, `lens`, `aviator`, `lashes`, `curlySides`, `thin`, `sideburns`, `nose`
shapes. Phase 3: `skirtPrint` (the dress's dots, else `print`), `mittenBand`, `shortsHem`, `peakC`
(a cap's peak), hat `'fur'`. Prints (shirt and dress) are a second mesh without an outline (one extra
draw call on printed models; the cabin and Rio busts keep them merged); under a `suit` or a `vest`
the shirt print is a few dots in the V or the vest's opening only. An outfit clears a base field with
`null` (e.g. the flyg cardigans drop the dress print).
Carmencita's scarf, Städerskan's apron, the Grisfestvärd's sash and a real `hat: 'cap'` replace the
Phase 0 stand-ins. Content may give an outfit a `held` field or use the `giraffe`, `butterKnife`,
`film`, `mirror` or `shoeOff` anim flags, which bring their own props.

Anim flags on `Character.anim` (Phase 0 adds them all with a minimal arm pose where noted; WP-E
polishes): `wings` (arms straight out — Phase 0), `cupUp` (right arm up+forward, empty-handed —
Phase 0; the luggage stowers' arm at the rack and the carried juice, which is its own mesh),
`cupHeld` (Phase 3 r2: the `cup` prop in the right hand, raised like `cupUp` when seated — Stig's
"Ja." in juice, §8.3 — and held out at shoulder height standing — the trolley stewardess serving,
§5.8),
`push` (both arms forward at waist — Phase 0), `planeSeat` (seated, arms on armrests — Phase 0),
`hold` (arms out to the sides low — Phase 0), `flail` (Phase 0), `oath` (right hand up, left on
chest — Phase 0), `dance` (Phase 0: cheer variant), `laugh`, `slump`, `shoeOff`, `mirror`, `film`,
`giraffe`, `butterKnife`, `carryOver` (WP-E).

**character.js**: `ch.setDef(def)` (rebuild model under the same parent; keep x/y/z/yaw/state;
`height` updated); state `'hidden'` (step no-op, `root.visible = false`, skipped by
`carsVsPeople`); `ch.seatAt({ x, y, z, yaw })` (state `seated`, `anim.planeSeat`, root placed by
hand at hip height, `x/y/z` set for bubbles); `ch.standAt(x, z, yaw)` (state `normal`, teleport).

**main.js `carsVsPeople`** (Phase 3 r1 repair): a car knocks a `normal` character over (`fling`,
`onCharHit`) only when its **own** speed into him (`car.v · n`, n from the car to him) is over
4.5 m/s; slower contact only pushes him out. Bigmouth used the relative speed, so anyone who
walked (island 5.4 m/s) or sprinted (8.8) into a parked car, or sprinted (5.2) into the stopped
trolley (a kinematic car with v = 0), was flung as if run over. The trolley's bowling is
cabin.js's own rule (§5.8).

**car.js**
```js
export const CAR_TYPES = {...};                       // §6.6
export function registerCarType(key, spec)            // used by cabin.js for 'trolley'
// buildCarModel: `if (s.build) return s.build(s, color);` first (it may return { geo, glass, extras });
// wheels skipped when s.noWheels; glass null-guarded (existing). spec flags: livery
// ('suntrip'|'guagua'), guardia, taxi, pigs, hatch, wagon, colors (random colour palette).
// car fields: noEnter (never offered to the player), noExplode (damage → dead + fx.steam, no fire,
// no burn), isPursuer, riders[], decals[].
// Occupants (Phase 2, §6.6): car.seatY() (bust base / hips − 0.12, car-local), car.roofY() (roof
// underside − 0.08; buses too), car.fitScale(h, base = seatY()) = clamp((roofY − base) / h,
// 0.72, 1). main.addBust / addRider (not 'bed') / seat use them, so no head pokes through a roof.
```

**pickups.js**
```js
export const COLLECT_KINDS = { pryl, fena, flaska, juice, knacke, asna, vaska, giraff };
//   each { build(id) -> Object3D, motion: 'spin' | 'circle' | 'bob' | 'roll' | 'none', beam?: bool, scale? }
//   pryl.build(id) picks the gadget by prylar id (the watch as fallback)
export function registerCollectKind(kind, def)
export class Collectible { constructor(scene, kind, id, x, y, z, opts = {}) }   // unknown kind → yellow box
export class Rabbit { constructor(scene, x, z, { mesh = 'badboll', flee = true } = {}) }
//   meshes: badboll, faar, blomma, gris
// coin value = 25
```

### 14.7 World (Phase 0 provides these; owners in §14.1)

```js
// world/frame.js
export class Frame { constructor(S, F, ox, oz, yaw = 0, scene) ...  mark(name, lx, lz, ly = 0, y) ... }
// Collision kinds: block builders must **not** use kind 'prop' (reserved: car.collideStatic treats it
// as a smashable prop and reads b.ref.def, which a static solid lacks); use 'solid' etc. Block
// interiors sit on a fill at CURB−0.04 inside a sidewalk ring at CURB (WP-B): keep block ground at
// CURB+0.01 or higher.

// world/town.js (WP-B): lamps, animated, pedLoops, DC8_SPOT, parkedCars, bouncers (the trampoline
//   'bounce' blocks), frameRamps [{ x, z, yaw, top, top2 }] (foot of each half-built frame's ramp 1,
//   both deck heights). world/rio.js: RIO_X (= −3000).
//   all Bigmouth Frame methods; sign() adds to this.scene; car(type, lx, lz, ly = 0, extra)

// world/layout.js
export function laneSpot(a, b, t = 12) -> { x, z, yaw }    // a, b: node ids or [i, j]
export const BLOCK_MAP_COLORS = { flamenco: '#f4efe6', ... }  // minimap lot colours per MAP type

// world/landmarks-island.js
export const ISLAND_LANDMARKS = { name: { b: [i, j], at: [lx, lz], yaw, y? } | { world: [x, z], yaw, y? } };
export function registerIslandLandmarks()                 // writes layout.landmarks

// world/registry.js
export const worldHooks = {};   // e.g. worldHooks.bodegaLit = (on) => {...} set by the flamenco builder

// world/blocks/*.js
export const BUILDERS = { type: (f, W, ctx) => void };   // ctx = { i, j, scene, rnd }

// world/props.js
placeProp(type, x, z, yaw, baseY = CURB);  finalizeProps(scene);   // unknown type → console.warn, skipped
//   baseY (Phase 0): the prop is drawn at baseY, its block top = baseY − CURB + def.top, debris spawns
//   at baseY + 0.25 (grisfest plates on the tables)  breakProp(p, vx, vz, game);  tickProps(dt, x, z);
propsNear(x, z, r);  props;
export function reviveProps(type, { x, z, r })   // re-alive + revive blocks + show instances now
export function propsOfType(type, { x, z, r }) -> props[]

// world/collision.js: segmentBlocked returns the nearest hit (min t over all blocks); the hit is
//   tracked as an integer sample index (0.8 m samples), so it is exact to the sample (Polish)
//   segmentBlocked(ax, az, bx, bz, y, ignoreKind = 'prop', step = 0.8) (Phase 3: `step`; the
//   chase camera samples every 0.25 m, §14.5)
// world/collision.js (Phase 2): camera ceilings, not solids (nothing collides with them)
ceiling(minX, minZ, maxX, maxZ, under, top);  ceilingOver(x, z, y, margin = 0) -> lowest ceiling over (x, z) with under > y, or null
ceilingHit(ax, ay, az, bx, by, bz, minUnder, out, grow = 0.3, below = 0.3) -> out.first (nearest along a→b, out.t 0..1)
//   or null; out.low = the hit with the lowest underside. Each ceiling is a box: footprint grown by
//   `grow`, from under − `below` up to top; ceilings with under ≤ minUnder are skipped (Phase 3 r2)
//   Phase 3 r3: a ceiling may carry `underOnly: true` (it counts only when a is under its grown footprint or b inside its box:
//   the `parasoll` props, which stand in rows on the beach, where the sight-line rule would pump the
//   eye down and up every few metres) and `block` (the prop's collision block: skipped while the prop
//   is smashed, `block.dead`); ceilingOver skips dead ones too.
discPush(x, z, r, y, out, ignoreKind = 'prop') -> bool; out.x/out.z = the push that takes a disc of radius r
//   out of every solid with top ≥ y (two passes, for corners) (Phase 3 r2)
//   Frame.ceiling(lx, lz, w, d, under, top) registers one from a local rectangle. CamRig.update
//   (Phase 3 r2; on foot without a profile, and in cars): a ceiling counts when the sight line from
//   the pivot to the eye passes through its box (`ceilingHit`, minUnder = the player's feet + 0.5),
//   i.e. the eye is in it, or it would come between the eye and the player (the eye above the roof).
//   On foot the eye then stays at the lowest hit's under − 0.3 (not below the feet + 0.6; a second
//   pass catches a lower one); a ceiling the line passes under (the eye out in the open, the player
//   just under the edge) leaves the eye where it is (until r2: any eye within 1.5 m of the footprint,
//   or the player under it, capped the eye, below top + 2). A car's eye stops 0.45 m short of the
//   first hit along the line, as at a wall, if that leaves more than half the car's length + 2 m and
//   the car is not under that ceiling; otherwise it stays below the underside as on foot.
//   Registered (C = CURB): Hotel Flamenco's reception pergola (under C + 3.1 = the fascia, top
//   C + 4.7); Phase 3: Flamenco's pool-bar thatch over the counter and the bartender's aisle
//   (x 16.7–20, under C + 2.15 = the sign board's bottom), the SunTrip office awning (under
//   C + 2.45 = the valance); every centre.js `arcade()` (La Medina's two, the plaza's north row:
//   under = the roof slab), Centro Nórdico's canopy (x ±11, under 3.5), the Casa Lola pergola
//   (under 2.72 = the lowest bulb, Phase 3 r3; was 2.9 with the lights sagging to 2.44), the church
//   portico (4.0), Gasolina's pump canopy (5.0), shop canopy (3.4) and
//   workshop bays (4.0). Phase 3 r2: the whole pool-bar thatch (x 16.7–25.3, z 6.9–17.1, under
//   C + 2.45 = the fringe); Flamenco's south strip from the open rooms' back wall to the balcony
//   edge (x ±26.15, z −21.5…−12.65: rooms 107/113, the patios' piers and band, the balcony row;
//   under C + 3.45 = the band, top = the roof), the north access galleries (z −28.25…−27, under
//   Y1 − 0.2 = C + 3.6, top the roof) and the back door's canopy (C + 2.45); every straw parasol
//   (2.8 m square, under C + 2.14 = the fringe, top C + 3.2: Flamenco's deck, SunTrip's terrace);
//   Phase 3 r3: every café parasol (`cafeTable` with `parasol`, 2.9 m square, under
//   its floor + 2.34 = the rim, top + 3.0: La Medina's courtyard, Bar Svenska and upper terrace,
//   the plaza's El Patio) and every standing `parasoll` prop (2.3 m square, under its foot +
//   2.07, top + 2.6; `canopy` in props.js, §6.8: the plaza's arcade tables, Flamenco's deck, the
//   beach rows; `underOnly`);
//   SunTrip's four courtyard balcony rows (1.25 m deep, under Y1 − 0.2 = C + 3.0, top the roof);
//   Centro Nórdico's SUPERMERCADO and FERRETERÍA awnings (x −28.7…−11.3 and 11.3…28.7, z 12–13.4,
//   under 2.74 = the valance); every `lagenhet` slab's entrance canopy (under C + 2.65), first
//   balcony row (front − 1.46…front, under C + fh − 0.2 = the fins' bottom, top the roof) and café
//   awning (C + 2.5); the grisfest pergolas (x ±16 ± 6.6, z −7…9, under C + 2.95, top C + 3.9), the
//   Fataga fold shelter (C + 2.2), the golf clubhouse veranda (C + 3.0), the show bungalow's door
//   awning (C + 2.42); the marina's reed terrace (C + 2.7).

// world/cabin.js (WP-A1; Phase 0 stub has the full API)
export const CABIN_X = 3000;
export const CAM_CABIN = {...};  export const FLIGHT_PALETTES = {...};  export const FEAR = {...};
export const PHASES = ['gate','takeoff','climb','cruise','approach','landing','landed'];
export const PHASE_LEN = { takeoff: 12, climb: 8, approach: 14, landing: 6 };
export function buildCabin(scene, game) -> cabin
cabin = {
  bounds, phase, phaseT, seatbelt, trolley, trolleyStopped, stats: { bowled, falls, jolts },
  seats: { [id]: { id, row, letter, x, z, y, yaw, aisle: { x, z }, taken } },   // taken: key | 'bust' | null
  inside(x, z) -> bool,          // whole flight level (gate set only in phase gate)
  inCabin(x, z) -> bool,         // the cabin interior rect only
  setPhase(name, { instant = false, hold = false } = {}),  onPhase(fn) -> remove,
  onJolt(fn) -> remove,          // fn({ strength }) per turbulence jolt
  setSeatbelt(on, { chime = true } = {}),
  turbulence(strength, secs, { warn = 1.5, delay = 0 } = {}),
  turbulent -> bool,             // getter (review fix 1): true from the warning until the shaking
                                 // ends; main.js shows the `Håll i dig!` prompt on it (§5.7 step 1)
  seatCharacter(ch, seatId),  unseatCharacter(ch, spot?),  unseatAll(),  seatOf(ch) -> id | null,
  startTrolley(),  stopTrolley(),  parkTrolley(),  trolleyEnd(g) -> { x, z },
  stopTurbulence(),              // Phase 2: ends a running turbulence now (restoreAmbience)
  skipRowSixBark(),              // Phase 3 r2: a stage takes Angerud's row-6 line (§5.12)
  walkers,                       // the aisle walkers (keys walker0..2; §5.12); _t.serving
  setAisleBlockers(on),
  setGateActive(on),
  placeCoins(),
  tick(dt, t, game),            // dt already scaled by timeScale
  mapSource(phase) -> src,
};
// Phase 0a extras (additive): FLIGHT_PALETTES is keyed by PHASE (gate takeoff climb cruise approach
// landing landed -> the §13.3 palettes, which are exported by name as PALETTES); also exported:
// ROWS, rowZ(row), SEAT_X, CAST_SEATS, DODGE_ROWS. cabin.bestSeat(g) (the §5.10 seat choice),
// cabin.applyPalette(secs = 0) (Phase 3 r2: secs > 0 blends, §5.6), cabin.pusher (the vardinna2
// Character; game.npc('vardinna2') returns it),
// cabin.blockers (the stower Characters). Plane seats live on the Character as ch.seatId (player
// and NPCs alike); seatOf(ch) reads it.

// world/flightScenery.js (WP-A2; Phase 0 stub with this exact shape)
export function buildFlightScenery(scene) -> { airframe, scenery, gateVisual,
  setPhaseVisual(name, t), setGateVisible(on), tick(dt), phaseT /* getter */ }
export function buildPlaneExterior(group, { gear = true, cutaway = false } = {})   // also the airport block
export const PLANE_GROUND_Y = -4.65

// world/rio.js (WP-B, P1)
export function buildRioCard(scene)   // landmarks rioBoat, rioCam at x = -3000
```

### 14.8 HUD, meter, missions, fx (Phase 0)

```js
// hud.js
hud.setMapSource(src)   // src = { canvas, scale, x0, z0, zoom, crop: { x0, z0, x1, z1 }, north: 'N' | 'FRAM' }
hud.buildBaseMap() -> src                         // town; BLOCK_MAP_COLORS; BOX 'water' blue
hud.buildMapFromBlocks(bounds, { scale, bg, kinds, zoom, north }) -> src
hud.setMeter(v, hot, pursuit);  hud.setMeterLabel(text, cls);  hud.setFear(v01)
hud.setObjective({ title, text, timer?, bar?, barColor?, barLabel?, zone?: [a, b], marker? })
hud.runDialog(lines, game)      // lines [{ who, text, cue }]; ring from def.ring; blips /\p{L}/u;
                                // speed game.dialogSpeed; auto-advance pad 30 (TEST: 8)
hud.setSpeedo(car)              // KM/H; hidden when !car or car.spec.noSpeedo
hud.renderPortrait(renderer, model)   // Phase 0 fix: saves root.parent/position/rotation/scale and
                                // restores them after rendering (Bigmouth left the root at the
                                // origin, which teleports seated characters into Hotel Flamenco)
// marker types: mission objective enemy friend item pryl fena

// shame.js
shame.configure(cfg);  shame.cfg;  shame.add(n, { force } = {});  shame.relieve(n);  shame.update(dt);
shame.panic();  shame.startPursuit();  shame.endPursuit(caught);  shame.busted();  shame.clear();
shame.onRam(car, impact);  shame.pursuers;  shame.officer;  shame.v / pursuit / forced / locked

// fx.js
fx.snow(x, y, z);  fx.steam(x, y, z);  fx.meterPuff(x, y, z, color, n)   // (fx.shame removed)
fx.spill(x, y, z, color, n);  fx.wisp(x, y, z)   // A1: trolley juice spill, smokers' wisp

// WP-H additions (all additive):
// hud.panic(secs); hud.labelLayout (big-map label layout, cached on labels + crop); body classes
//   pursuit / panik / in-dialog; banner classes multa (bust) and fear; toast classes witness and
//   alert (Phase 3 r3: TURBULENS! in a stage); HUD
//   elements #vignette #sirenlights #panik. hud.say: one bubble per speaker (a new line replaces
//   it; hud.unsay(target) takes it down, Phase 3) and overlapping bubbles stack upwards, the
//   newer above (Phase 2), with a tail to its speaker behind the older one (cls lead, Phase 3 r3);
//   wrapped at 300 px, kept on screen and under the top HUD row and a
//   shown objective card (Phase 3). hud.toast(text, cls,
//   secs?) (by length, ≤ 3 at once), hud.clearToasts() (runDialog calls it), hideBanner() drops
//   only `show` (Phase 3, §11.4, §11.7).
// shame.inScene (getter: inDialog || inCutaway); shame.hideoutT; steer state; a teleports debug
//   counter; hideout interactable id 'hideout:<landmark>' (registered in configure());
//   shame.tuneBefore (a mission tune to restore after the pursuit, else null; Phase 3, §7.2).
// audio.sirenNear(d); audio.trad(name, { vol }) -> length in s (respects mute and the music toggle);
//   audio.sweep(...); audio.level() test hook { rms, state, tune }; export TRAD_NAMES; tune bar()
//   voices snare/accordion/chime/pad/conga/pluck/brass/surdo/agogo/sleigh/flute; setTune(current)
//   cancels a pending switch.
// strings.js: mapTitleIsland, mapTitleFlight, mapTitleGate, noMap, morningAfter, morningAfterSub,
//   endCardMain 'RIO…?', endCardSub (the film's opening card, [F]).
```

### 14.9 Data formats in content files

```js
// content/flight.js (WP-F)
export const HOMES_GATE = { ole: ['gateOle', 0, 0], ... };           // §2.3
export const HOMES_FLIGHT = { ole: { seat: '14A' }, ... };
export const MAP_LABELS_FLIGHT = [['Säkerhetskontroll', 'gateArch', { phase: 'gate' }], ...];
export const CHATTER_FLIGHT = { ole: [...], angerud: [...], ... };   // tagged lines
export const OLE_STATS = ['Du vet vel at det er 50 prosent sjanse å overleve en flyulykke.', ...];
export const LEVEL_OUTFITS_GATE = {...};  export const LEVEL_OUTFITS_FLIGHT = {...};

// content/island.js (WP-G)
export const HOMES_ISLAND = {...};  export const MAP_LABELS_ISLAND = [['Hotell Flamenco', 'flamenco'], ...,
  ['Pepes Bodega', 'bodega', { unlock: 'bodega' }]];
export const CHATTER = {...};  export const OUCH = [...];  export const GETUP = [...];
export const CARJACK = [...];  export const NPC_KICKED = [...];
export const OUCH_OLE, GETUP_OLE, NPC_KICKED_OLE, LOCAL_CAST, OUCH_LOCAL, GETUP_LOCAL, CARJACK_LOCAL, NPC_KICKED_LOCAL, BARKS;   // Phase 3 r2, §14.10
export const COLLECTIBLES = {...};  export const UNLOCKS = {...};
export const NAMED_CARS = { buss17: 'SunTrips buss 17', hyrbil: 'Hyrbilen', grisbil: 'Grisbilen', nattbuss: 'Nattbussen', joseBil: 'Josés bil', guardiaJeep: 'Guardia-jeepen' };
export const LEVEL_OUTFITS_ISLAND = {...};

// content/index.js (Phase 0; frozen)
export const HOMES = { gate: HOMES_GATE, flight: HOMES_FLIGHT, island: HOMES_ISLAND };
export const MAP_LABELS = { flight: MAP_LABELS_FLIGHT, island: MAP_LABELS_ISLAND };
export const LEVEL_OUTFITS = { gate: ..., flight: ..., island: ... };
export * from './flight.js'; export * from './island.js';
```

Initial content (Phase 0 writes it from this document so the game runs): all HOMES tables (§2.3),
labels (§11.6), outfits (§4.5), `COLLECTIBLES`/`UNLOCKS` (§10), `OLE_STATS` (§14.10), chatter
(§14.10).

### 14.10 Chatter and bark tables (initial content)

Every film line here is a bark outside its own scene, so it is tagged `[F*]` (§1.4). Chatter plays
in free play only, Ole's barks in free play and `oleBarks` stages; neither over a dialogue or in
the gap before an outro (§5.9, §5.12). The flight tables also play at the gate (Ole's first bark
comes 10 s after the start, before mission 1's intro where he and Stig meet): no line may need the
air, a served meal, Stig's name or the Concorde dream of the ombord outro.

```js
OLE_STATS = [
  'Du vet vel at det er 50 prosent sjanse å overleve en flyulykke.',          // [F*]
  'Det er farligere å kjøre bil enn å fly.',                                   // [F*]
  'Man regner mellom to og fem millioner flytimer pr. kræsj.',                // [F*]
  'Leste du om en sånn jumbopilot som gjorde en looping? To ganger.',         // [F*]
  'Det blir nok litt luftlommer underveis. Helt normalt!',                    // [N]
  'Concorde flyr tre ganger så fort som en geværkule!',                       // [F*]
  'Statistisk sett er det tryggest å sitte bakerst. Eller var det fremst?',   // [N] (WP-F)
  'Hører du den lyden? Helt normalt. Tror jeg.',                              // [N] (WP-F)
];
CHATTER_FLIGHT = {
  ole: ['Hører du? Samba.' /*[F*]*/, 'Kvarts og digital.' /*[F*]*/, 'Ja, men dyr!' /*[F*]*/,
        'Min drøm er å fly med Concorde fra Paris til Rio.' /*[F*]*/],
  angerud: ['Det är sista gången jag åker med SunTrip!' /*[F*]*/, 'Jag har inte fått resan gratis.' /*[F*](t)*/],
           // (not "Kallar ni det här 'varm middag'?": it played at the gate and before takeoff; the
           // complaint has its scene at the trolley's row-6 stop, §5.8, §8.3)
  berra: ['Ra-tara-tara…' /*[F*]*/, 'Ta det vackert, vi har varit ute och flugit förr.' /*[F*]*/],
  robban: ['Fan, vad jag är törstig.' /*[F*]*/],   // (not "Pepes Bodega…": it would come before the gate's bodega tip)
  siv: ['Bara de inte är ingenjörer.' /*[F*](t)*/, 'Vilket gäng man har hamnat i!' /*[F*](t)*/],
  majsan: ['De är säkert trevliga.' /*[F*](t)*/],
  fruStorch: ['Vi heter faktiskt Storch, inte Stork.' /*[F*]*/],
  herrStorch: ['Lite film.' /*[F*](t)*/],
  jose: ['Jag ska inte bort, jag ska hem.' /*[F*]*/],
  sulan: ['Plomberat och klart.' /*[F*]*/],
  kontrollant: ['Nästa!' /*[N]*/],
};
CHATTER = {
  ole: ['Samba er fine greier!' /*[F*]*/, 'Blomsterspråket er internasjonalt.' /*[F*]*/,
        'Farlige saker. Der dør det mellom to og tre mennesker hver dag. Understrømmer, solstikk og haier.' /*[F*]*/,
        'Vi fikser alt!' /*[F*]*/],
  lasse: ['Friskoteket börjar halv tio varje morgon.' /*[F*]*/, 'Hä-pååre!' /*[F*]*/],
  berra: ['Det är ju fan vad solen tar här nere, Robban.' /*[F*]*/, 'Ra-tara-tara!' /*[F*]*/],
  robban: ['Fan, vad jag är törstig.' /*[F*]*/, 'Pepes Bodega. Glöm aldrig det, du.' /*[F*]*/],
  angerud: ['Det är sista gången jag åker med SunTrip!' /*[F*]*/,
            'Jag har hört att kriminaliteten har gått upp här nere sedan Franco dog.' /*[F*]*/],
  siv: ['Gud, vad han är söt!' /*[F*]*/], majsan: ['Här nere parkerar de hursomhelst.' /*[F*]*/],
  fruStorch: ['Det var så kallt på rummet i natt, och ändå har vi betalat bränsletillägg!' /*[F*]*/],
  herrStorch: ['Lite film.' /*[F*](t)*/], jose: ['Jag ska inte bort, jag ska hem.' /*[F*]*/],
  mamma: ['Inga svenskor!' /*[F*]*/], portier: ['Momento.' /*[F*]*/],
  affe: ['Va fan, jag hade ju natturen i natt!' /*[F*]*/], gabbe: ['Natturen går klockan nio!' /*[N]*/],
  souvenir: ['Hallå där!' /*[F*]*/], saljare: ['Välkommen i det gröna!' /*[F*]*/],
  carmencita: ['Jag är 28 år, mamma.' /*[F*]*/], hittegods: ['Hammarby…?' /*[F*]*/],
};
// The Swedish tourists' barks (charter complaints; no names: strangers and the gate crowd bark too).
OUCH = ['Jag ska tala med platschefen!' /*[F*]*/, 'Det är sista gången jag åker med SunTrip!' /*[F*]*/,
        'Och ändå har vi betalat bränsletillägg!' /*[F*]*/, 'Aj!' /*[N]*/];
GETUP = ['Det måste vara värmen.' /*[F*]*/, 'Det är kombinationen av sol och…' /*[F*]*/,
         'Det är ju fan vad solen tar här nere.' /*[F*]*/];
CARJACK = ['Det fattades bara det…!' /*[F*]*/, 'Jag har betalat 3 000 för den!' /*[F*]*/];
NPC_KICKED = ['Aj!' /*[N]*/, 'Hallå!' /*[N]*/, 'Var inte så typiskt svensk.' /*[F*]*/, 'Va fan håller du på med?' /*[N]*/];
// Ole's (bokmål, cheerful and unshakeable; no names: he barks at the gate before they have met).
OUCH_OLE = ['Au! Hva i all verden…' /*[N]*/, 'Oi! Se deg for, da!' /*[N]*/, 'Det gikk bra, det!' /*[N]*/,
            'Au, au… Godt jeg tok B-vitaminene mine i dag.' /*[N]*/];
GETUP_OLE = ['Tenk ikke mer på det.' /*[F*]*/, 'Ingen fare. Jeg har reisesyketabletter.' /*[F*]*/, 'Sånn ja! Helt normalt.' /*[N]*/];
NPC_KICKED_OLE = ['Au!' /*[N]*/, 'Au! Hva er det med deg?' /*[N]*/, 'Ta det rolig, kompis!' /*[N]*/,
                  'Oi! Er det sånn man gjør i Sverige?' /*[N]*/];
// The Spanish cast and the local pedestrians: Spanish exclamations a Swedish player understands (§1.3).
LOCAL_CAST = ['jose', 'mamma', 'pappa', 'carmencita', 'portier', 'hittegods', 'souvenir', 'stadare', 'grisbonde', 'varden', 'telefonist'];
OUCH_LOCAL = ['¡Ay, mi madre!' /*[N]*/, '¡Ay, ay, ay!' /*[N]*/, '¡Turistas!' /*[N]*/, '¡Cuidado!' /*[N]*/];
GETUP_LOCAL = ['¡Madre mía…!' /*[N]*/, 'Suecos…' /*[N]*/, 'Nada, nada.' /*[N]*/];
CARJACK_LOCAL = ['¡Ladrón!' /*[N]*/, '¡Mi coche!' /*[N]*/, '¡Policía!' /*[N]*/];
NPC_KICKED_LOCAL = ['¡Ay!' /*[N]*/, '¡Señor, por favor!' /*[N]*/, '¡Loco!' /*[N]*/, '¡Basta!' /*[N]*/];
// SunTrip's staff and the resident bungalow seller (Phase 3 r3): only their run-over table differs.
STAFF_CAST = ['lasse', 'affe', 'gabbe', 'saljare'];
OUCH_STAFF = ['Aj!' /*[N]*/, 'Hoppsan!' /*[N]*/, 'Det ingår inte i mina åtaganden!' /*[F*] Lasse's reply to Angerud*/];
BARKS = { ouch: { sv, ole, local, staff }, getUp: { sv, ole, local }, kicked: { sv, ole, local }, carjack: { sv, local } };
```

**Barks by speaker** (Phase 3 r2). `Game.bark(ch, kind)` (main.js; kind `ouch` run over or a
pedestrian kicked, `getUp`, `kicked` a cast NPC kicked, `carjack`) picks `BARKS[kind].ole` for
Ole, `.local` for `LOCAL_CAST` keys and `randomPed` locals (`def.local`), else `.sv`. One shared
Swedish table gave Ole "Va fan, Stig-Helmer!" and "Det är sista gången jag åker med SunTrip!"
(§1.3: Ole never speaks Swedish), and the porter, Josés mamma and the souvenir seller complained
about SunTrip and the fuel surcharge. José is in `LOCAL_CAST`: Swedish in his scenes, a Spaniard
(and a mamma's boy) on the pavement. `reboard` gives Ole `S.neverLeaveOle` (§11.5).
Phase 3 r3: a fourth class, `STAFF_CAST` (SunTrip's platschef Lasse, the guides Affe and Gabbe,
and the resident bungalow seller), takes `BARKS[kind].staff` where the kind has one (only `ouch`):
run over, Lasse said "Jag ska tala med platschefen!" although he is the platschef (in the film
Angerud says it to him and he answers "Tja, det är ju jag, det…"), and all four swore off SunTrip
and the fuel surcharge (3 of the 4 `OUCH` lines, which play on 80 % of hits). Their `getUp` and
`kicked` barks stay the tourists' (no complaint among them). Order in `Game.bark`: Ole, local,
staff, Swedish.

---

## 15. Build plan

### 15.0 Working method (all phases)

- **Isolation for parallel agents.** `charter_and_run__sallskapsresan/` is its own git repo
  (base commit `09cc093`). Recommended: Phase 0 ends with a commit tagged `phase0`; each Phase 1
  agent works in its own worktree
  `git worktree add /home/ran/src/html/everything_and_run/.wt/charter-<WP> -b p1-<WP> phase0`, symlinks
  `node_modules` into it, edits **only its owned files** (check with
  `git diff --name-only phase0 | grep -v -f owned.txt` → must be empty), self-tests there, and
  commits on its branch. Phase 2 merges the branches; files are disjoint, so merges are trivial.
  If the orchestrator does not allow commits, use a sandbox copy instead
  (`rsync -a --exclude node_modules --exclude out <game>/ $SANDBOX/<WP>/` + symlinked
  `node_modules`) and copy back only the owned files at hand-off.
- **DESIGN.md and `notes/` are untracked** in the base commit. Phase 0 commits both before
  tagging `phase0`, so every worktree has them; the orchestrator still tells every agent to read
  them from the **main tree by absolute path**
  (`/home/ran/src/html/everything_and_run/charter_and_run__sallskapsresan/DESIGN.md`), so later
  DESIGN edits reach everyone.
- **Never leave a syntax error on disk** in a shared location; in your sandbox, keep `node --check`
  green after every edit batch.
- **Ports / output** (each `node tools/shot.mjs` run starts its own server): Phase 0 `PORT=8850`;
  WP-A1 8861 · B 8862 · C1 8863 · D1 8864 · E 8865 · F 8866 · G 8867 · H 8868 · A2 8869 ·
  C2 8880 · D2 8881; Phase 2 8870; Phase 3 8871–8879. `OUT=<your scratchpad>/out-<WP>`. Never use `make run` (opens a browser).
- **Hand-off report** (final message of every agent): files changed; what is done / P1 left /
  cut; self-check commands and their last output lines (`[t] done -> …`, `RESULT: …`);
  **CONTRACT CHANGES** (renamed/moved landmarks, new options, changed signatures); screenshots
  path.
- Bash: the `rtk` hook strips comments from `cat`/`grep` output; use the Read tool or
  `rtk proxy cat -n` / `/usr/bin/grep -n` when line numbers matter.

### 15.1 Phase 0: the spine (one serial agent, port 8850)

Goal: every contract in this document exists and works on **stub content**, so Phase 1 agents only
fill in their own files. Phase 0 is still one serial agent, but it works in two halves with a
commit in between, so a fresh agent can take over at the boundary if context runs out:
**0a** = items 1–9 and 12 (restructure, renames, level system, Game API, stub cabin and island,
harness; exit: `node --check` all and `start walk aerial drive title` green, the game boots into
both levels), commit + tag `phase0a`; **0b** = items 10–11 and 13 (all stage kinds, the runner, placeholder missions, exit
criteria), commit + tag `phase0`. Polish that a Phase-1 owner can do is **not** Phase 0 scope:
officer `routeAim` steering, hideouts and the witness toast (→ H), real SFX/tunes (→ H), real
visuals (→ A1/A2/B/C/D/E). Exact scope:

1. **Extract and create files** (§14.1): `world/frame.js` (Frame from town.js, `scene` param,
   `mark(..., y)`), `world/registry.js`, `world/landmarks-island.js` (all island landmarks from
   §6.3, incl. `pryl_*`/`fena_*` with `y` and the kerbside `grisfestGate`/`fatagaBus`/
   `grillpacoCurb`), `world/blocks/{index,hotels,centre,nature,coast}.js`
   with **stub builders** for every block type (flat coloured slab, a `signMesh` with the block
   name, a `water` slab where a pool/fountain/pond is specified, the named cars `hyrbil`,
   `buss17`, `guardia1`, `guardia2`, `taxiAirport` at their landmarks, and the 12 `tallrikar`
   placements in the grisfest stub), `world/flightScenery.js` stub (§14.7 shape: plain boxes,
   `buildPlaneExterior` as simple boxes), `content/{index,flight,island}.js` with the initial
   content from §2.3, §4.5, §10, §11.6, §14.10, `strings.js` (§11), `level.js`, `meters.js`,
   `game/missions/{index,runner}.js`, `kinds/{core,flight,island,index}.js`; delete
   `game/missions.js`. **Commit `DESIGN.md` and `notes/`** (untracked in the base commit).
2. **gfx / camera / collision / input / fx** APIs (§14.4, §14.5, §14.8): `setSkyPalette`,
   `setCloudsVisible`, `setShadows`, `MAT.sky`; camera `profile`/`setProfile`/`frameOne`/`cutTo`/
   `clampZ` + `clampActive`; nearest-hit `segmentBlocked`; pad Start → pause;
   `fx.snow/steam/meterPuff`.
3. **audio** (§12): `TUNES` table + `registerTune`, `setTune` (existing jazz registered as every
   tune name as a placeholder), catch-up fix, music-bus low-pass + `setMusicLowpass`, `drone`
   channel, every SFX name from §12.3 mapped to **one shared placeholder tone** (WP-H writes the
   recipes), `trad()` no-op, `jingle('pryl')`.
4. **hud** (§14.8): map sources + `buildMapFromBlocks`, `setMeter`/`setMeterLabel`/`setFear`,
   objective `zone`/`marker`, dialogue `[who, text, cue]` + `game.cue`, ring from `def.ring`,
   `/\p{L}/u` blips, `game.dialogSpeed` + test auto-advance pad 8, KM/H + `noSpeedo`, legend from
   `game.mapLegend()`, marker types `pryl`/`fena`, strings from `S`; **`renderPortrait` saves and
   restores `root.parent`, `position`, `rotation`, `scale`** (or renders a throwaway
   `buildCharacter(def)` model and disposes it).
5. **shame.js** (§5.9, §7): `configure`, `relieve`, `add(n, {force})`, panic mode (branch before
   pursuit; clamp at 95 and defer PANIK during dialogue/cinematics; `locked` ignored in panic
   mode), pursuit config (vehicle type/busts/taunts/banners from cfg; scaled fine, bust freeze,
   pulled out of the car), walking officer = solid `Character` walking **straight** at the player
   with collision + the stuck teleport (WP-H adds `routeAim` steering), witness rule (0 SKANDAL near
   Herr Storch), `isPursuer`, siren on/off, tune switch. Hideouts: WP-H (P1).
6. **main.js** (§4, §14.2, §14.3): the whole Game API; level system and every row of §4.3 (homes
   and NPC outfits by mission index, reset/panic spots by `inCabin`, no `routeAim` in the flight
   level); init order (NPC instances for every CHARS key except `stig`, radio-only keys and
   `vardinna2`, §2.3); `nick` → `stig` everywhere; mantra (J) and hold (Space) in `fixedStep`,
   mantra interrupts; jump/kick gating; level speeds; R reset per level; `freeSpot` level-aware;
   `placeNpcs` per home set (seated, hidden; unseat before moving); seats (`sitPlayer`/
   `standPlayer`, per-cushion choice, §5.10); `handleOneShots` E/J/R **while seated** and seated
   prompts in `updateHud`; interactables (`pos`) + prompt priority; `syncAll` writes `ch.x/y/z` of
   car-seated characters; `placeNpc`/`hideNpc` unseat first; riders; cues; cutaways; `pay`;
   generic collectibles/unlocks; save format v1; title orbit per level; heartbeat/low-pass in
   `updateAudio`; `timeScale` (TEST 3); portraits from `CAST`; outfits; `playEndCard()` stub
   (banners only).
7. **actors** (§14.6): `CHARS` for every key in Appendix A (existing fields only, colours from §2),
   `CAST`, `outfitDef`, `buildBustGeo`, minimal anim poses (`wings cupUp push planeSeat hold flail
   oath dance`), `setDef`, `hidden`, `seatAt`/`standAt`; car.js `registerCarType`, `build`,
   `noWheels`, `noSpeedo`, `noEnter`, `noExplode`, `seatWorld(side)`, the §6.6 types with existing
   geometry (names Swedish; `guardia` = `tall` box green; `taxi`/`grisbil`/`guagua` = recoloured
   sedan/pickup/bus), traffic mix; pickups `COLLECT_KINDS` placeholders + `registerCollectKind`,
   `Collectible(kind)` table, `Rabbit(..., {mesh, flee})`, coin value 25; props: flags (`splash`,
   `explode`, `debris`), **every §6.8 type name registered** (old geometry or a coloured box; old
   keys kept as aliases), unknown types skipped with `console.warn`, `placeProp(..., baseY)`,
   `reviveProps`, `propsOfType`.
8. **Stub cabin** (`world/cabin.js`): the **real** collision table (§5.2), seat map and seat
   objects (`taken: 'bust'` for bust seats), gate set solids, all landmarks (§5.5), `inside()`,
   `inCabin()`, `setGateActive`, door block, `setPhase` with phase timing/chaining/`hold` and
   palette switching (calls the flightScenery stub), `onPhase`, `onJolt`, `setSeatbelt` (flag +
   chime), `turbulence` (shake + jolts on the player exactly as §5.7),
   `seatCharacter`/`unseatCharacter`/`unseatAll`/`seatOf`, the trolley Car spawned and parked
   (`startTrolley` = simple constant-speed kinematic run that waits for NPCs ahead; bowling per
   §5.8; `trolleyEnd`), `setAisleBlockers` (three static stowers, §5.12), standing/seated fear
   sources (§5.9), toilet + seat + blocker interactables, the `Rad 13 finns inte!` toast,
   `mapSource`, `placeCoins` (a few coins), plain box visuals (floor slab, walls, seat boxes, a
   down-facing ceiling plane and rack planes, a big box "plane" outside), `CAM_CABIN`,
   `FLIGHT_PALETTES` (§13.3), `FEAR`.
9. **Stub island**: `MAP` (§6.2) in layout.js, `laneSpot`, `BLOCK_MAP_COLORS`; town.js dispatches
   through `BLOCK_BUILDERS`, `bungalowR`/`lagenhet` use the old `residential()`; streets and
   outskirts unchanged except the NE gap at (240, −335) (no hills within 100 m, nothing taller
   than 1 m within 60 m) and the sea plane (±1150, §4.1).
10. **All 18 stage kinds, fully implemented** (§9.2) and the runner (§9.4), including the round-1
    fixes: common options `startCue`/`timedCues`/`doneCue` copied by every factory, `useCue`,
    `fillCue`, `lockSeat`, `awaitOverhear`, overhear anchors, `follow` ending at `to` (no
    `nearestNode`), `race` lateral offsets, `haggle` on foot with a priority-100 bid, `scene`
    exit rules, retry re-applying ambient cues, the outro placement rule. After Phase 0 the kinds
    files are frozen (§9).
11. **Placeholder missions**: `FLIGHT_MISSIONS` / `ISLAND_MISSIONS` with the final `id`, `title`,
    `level`, `giver`, `at`, `reward`, `cost`, `unlock` (§8 summary), 1–2 intro/outro lines each,
    and 1–4 stages that exercise the main kind of each mission on stub content (e.g. `gate`:
    `interact gateArch` → `mantra herrtoa` → `goto cabinDoor`; `ombord`: `sit 14B` → `timeline`
    with phase takeoff until cruise; `juice`: `interact call14 whileSeated` → `carry` → `sit`;
    `sprit`: `collect` 2 rolling bottles; `landning`: `mantra` with approach (held) → landed;
    `buss17`: `getInCar buss17` → `goto flamencoDrive smooth`; `friskotek`: `rabbits` 3; `asnan`:
    `haggle`; `bodega`: `follow` grisbil to `grisfestGate` → `destroy` guardia; `ropavieja`:
    `follow` with `minDist` to `grillpacoCurb`; `fataga`: `rabbits faar`; `grisfest`: `race` with
    `playerPassenger` → `smash` 3 `tallrikar`; `julafton`: `collect who` → `scene` with `stadare`
    → `mantra duet`).
12. **Tools**: `tools/lib.mjs` with the `T` API (§16.2); `shot.mjs` loads scenario modules
    (§14.1; duplicate scenario names are an error) and the story arrays; `startMission` fix;
    `FROM`/`TO`; final `RESULT: PASS|FAIL (…reason)` line; `tools/story/{flight,island}.mjs` for
    the placeholders; core scenarios `start walk aerial drive(hyrbil) traffic title talk(→ ole at
    gateQueue) missions views transition` (§16.4).
13. **Exit criteria**: `node --check` on every `.js/.mjs`; `PORT=8850 node tools/shot.mjs story`
    → `[t] done -> #13 idle`, no `scenario failed`, last line `no errors`, `RESULT: PASS`;
    `missions title views cabin(phase screenshots via a tiny inline check)` pass; commit + tag
    `phase0`. Hand-off report lists any deviation from this document.

### 15.2 Phase 1: eleven parallel work packages

Each WP edits **only** its owned files (§14.1) and must keep every name in Appendix A. The kinds
files (`game/missions/kinds/*.js`) belong to nobody in Phase 1: F and G change behaviour only
through options and report kind bugs (with a proposed patch) under CONTRACT CHANGES.

| WP | owned files | delivers | consumes (stable from Phase 0) | provides (to others) | self-check (own PORT/OUT, in its sandbox) |
|---|---|---|---|---|---|
| **A1 · Cabin** | `world/cabin.js`, `game/camera.js`, `game/fx.js`, `tools/scenarios/flight.mjs` | §5 except §5.6 visuals: gate set and cabin interior visuals, turbulence feel, trolley AI + `vardinna2` + bowling, luggage stowers, aisle walkers (P1), ambient barks, fear sources, interactables, `mapSource`, coins, camera `clampZ` | Game API, `registerCarType`, `buildBustGeo`, `CHARS.vardinna2`, `audio.drone/chime/rattle/flush`, `gfx.setSkyPalette`, `hud.buildMapFromBlocks`, `buildFlightScenery` (stub until A2 merges) | cabin API unchanged | `node tools/shot.mjs gate cabin trolley turbulence panic` + `TO=5 node tools/shot.mjs story` (Phase 0 placeholder flight missions) |
| **A2 · Flight scenery** | `world/flightScenery.js`, `tools/scenarios/scenery.mjs` | §5.6: airframe (fin root z ≤ −26), animated scenery per phase (apron, cloud deck, puffs, sea, island, landing strip), snow, `buildPlaneExterior` (real) | cabin API (`setPhase`/`onPhase`), `FLIGHT_PALETTES` | `buildFlightScenery`, `buildPlaneExterior` for D2 | `node tools/shot.mjs phases cabin` |
| **B · Island base** | `world/layout.js`, `world/town.js`, `world/props.js`, `world/rio.js`, `tools/scenarios/island.mjs` | §6.2, §6.4–6.8: streets, outskirts (mountains, dunes, sea ±1150, NE gap, welcome sign, banners), residential `bungalowR`/`lagenhet`, prop `build()` restyle for every §6.8 key (names already registered by Phase 0), `BLOCK_MAP_COLORS`, Rio card (P1), ped loops | Frame, `BLOCK_BUILDERS`, landmark table | prop looks for C/D; ground/sea | `node tools/shot.mjs views traffic smash foot title` (`views` reads `MAP_LABELS.island`; env `VIEWS=a,b` filters) |
| **C1 · Hotels** | `world/blocks/hotels.js` | §6.3 rows `flamenco suntrip`: the hero Hotel Flamenco (pool, reception, patios, room 113, Pepes Bodega + `worldHooks.bodegaLit`), Hotel SunTrip (stage, friskotek lawn), fins water, named car `hyrbil` | Frame, prop types (§6.8, all registered from Phase 0), landmark table | landmark overrides (reported) | `VIEWS=flamenco,flamencoPool,bodega,suntrip,friskotek node tools/shot.mjs views aerial` |
| **C2 · Centre** | `world/blocks/centre.js` | §6.3 rows `kasbah cita plaza marknad kyrka bensin guardia`: geometry, signs, props, fountain, routes to `pryl_poolpen`/`pryl_kalkylator`, named cars `guardia1 guardia2` | as C1 | landmark overrides (reported) | `VIEWS=kasbah,vikingbar,tongatonga,cita,plaza,marknad,kyrka,bensin,guardia node tools/shot.mjs views aerial` |
| **D1 · Nature** | `world/blocks/nature.js` | §6.3 rows `tomat grisfest fataga golf bungalow bygge dyner`: 12 `tallrikar` on the tables (`baseY`), farm, Fataga, golf pond, show bungalow, bygge, dunes, routes to `pryl_klocka/kniv/pung` | Frame, prop types, landmark table | landmark overrides (reported) | `VIEWS=vischan,grisfest,dansgolv,fataga,golf,bungalow,bygge,dyner node tools/shot.mjs views aerial` |
| **D2 · Coast** | `world/blocks/coast.js` | §6.3 rows `flygplats dromplan fyren playa hamn`: the parked DC-8 at (240, −335) via `buildPlaneExterior`, baggage carousel, dream plane, lighthouse, beach, marina, routes to `pryl_kamera/glasogon`, named cars `buss17 taxiAirport` | Frame, prop types, landmark table, `buildPlaneExterior` (stub until A2 merges) | landmark overrides (reported) | `VIEWS=airport,dromplan,fyren,playa,hamn node tools/shot.mjs views aerial` |
| **E · Cast & vehicles** | `actors/models.js`, `actors/character.js`, `actors/car.js`, `actors/pickups.js`, `actors/peds.js`, `tools/scenarios/cast.mjs` | §2 looks and outfits, new def fields, all anim flags, `randomPed` 1979 palette (0 % kids), nicer `buildBustGeo`, §6.6 car looks (`guardia`, `taxi`, `grisbil` pigs, liveries), `COLLECT_KINDS` meshes (7 pryl variants, fin, bottle, juice cup, knäcke pack "SPORT-KNÄCKE", painted donkey, suitcase, giraffe), Rabbit meshes (`badboll faar blomma gris`), ped shouts | def/flag names (§14.6), Game API | the same names | `node tools/shot.mjs castsheet cars walk drive` (castsheet: every `CAST` key in a row in each outfit + every anim flag; cars: every type) |
| **F · Flight missions** | `game/missions/flight.js`, `content/flight.js`, `tools/story/flight.mjs` | §8.1–8.5 exactly, flight content (§2.3 gate/flight homes, chatter, OLE_STATS, labels) | stub cabin API (§14.7), Game API, cues, frozen kinds | `M_FLIGHT` | `TO=5 node tools/shot.mjs story` → `[t] done -> #5 idle`, `RESULT: PASS` |
| **G · Island missions** | `game/missions/island.js`, `content/island.js`, `tools/story/island.mjs` | §8.6–8.13 exactly, island content (homes, chatter, collectibles, unlocks, named-car names, labels), route tuning (`via`, race checkpoints) on the stub grid | landmark table, Game API, frozen kinds, `laneSpot` | `M_ISLAND` | `FROM=5 node tools/shot.mjs story` → `[t] done -> #13 idle`, `RESULT: PASS`; plus `TO=5 node tools/shot.mjs story` as a regression gate |
| **H · Audio, UI, meters** | `audio.js`, `index.html`, `style.css`, `strings.js`, `meters.js`, `game/hud.js`, `game/shame.js`, `tools/scenarios/meter.mjs` | §11 (title, pause, HUD, strings), §12 (all tunes incl. PD trad melodies, SFX recipes, drone timbre), §13.4 CSS, §7 polish (officer `routeAim` steering, siren, hideout P1, witness toast P1), meter visuals (fear vignette) | Game API, METERS shape, hud API names | strings keys, tune/SFX names | `node tools/shot.mjs title ui skandal` (ui: HUD with long Swedish strings, åäöæø on banners and signs, dialogue portrait rings) |

(Optional further split, to be decided **before** Phase 0 starts: G2 takes `fataga grisfest
julafton` into a new `game/missions/island2.js` + `tools/story/island2.mjs`, port 8882. That
needs Phase 0 to create `island2.js` exporting `ISLAND_MISSIONS_2` and `missions/index.js` to
concatenate it. With the kinds frozen, G is data-only, so the default is no split.)

### 15.3 Phase 2: integration (one serial agent, port 8870)

1. Merge in order **E → B → C1 → C2 → D1 → D2 → A2 → A1 → H → F → G** (geometry before data). After each merge:
   `node --check` all, `node tools/shot.mjs start title`.
2. Apply every hand-off's CONTRACT CHANGES everywhere (landmark table, content, tests).
3. Full `story` three times in a row; all three must print `RESULT: PASS`. Fix flakes at the root
   (giver placement, timers, warps), never by loosening the pass check.
4. Run every scenario: `start walk aerial drive traffic title talk missions gate cabin trolley
   turbulence panic phases views smash foot castsheet cars ui skandal transition`.
   Wire the Rio end-card cinematic into `game.playEndCard()` (P1; Phase 0 left a banner stub).
5. Balance pass: FLYGRÄDSLA numbers (a careful player never panics; a careless one does in
   missions 1, 2 and 5), timers (re-measured per §8 "Timers and difficulty": tight, about 15–20 %
   slack on a clean run, player car ×1.2), haggle zones, follow distances, race rubber-banding.
6. Docs: README (premise, controls, cast, mission list, invented-mechanics list §1.6, source-tag
   policy, credits: "Städerskan" etc., disclaimer), CLAUDE.md (title, port 8840, `#13 idle`,
   scenario list, worktree note), Makefile/package.json (`name: charter-and-run`, `test` →
   `node tools/shot.mjs story`), **`../CLAUDE.md`**: latest game = `charter_and_run__sallskapsresan/`.

### 15.4 Phase 3: QA loop (critics + fixers)

- **Screenshot critics** (read-only agents, ports 8871+): contact sheets (`montage … -tile 3x3`)
  of: title; gate (arch, lounge, toilet, bridge); cabin in every phase (seated cast visible, row
  13 gag, windows, wings, clouds); trolley + turbulence; panic; every island landmark (`views`);
  night grisfest; sunset mantra; end card; HUD (meters, prompts, banners with å ä ö æ ø);
  dialogue (portraits, rings, Norwegian lines). Each critic returns a ranked list: *bug / ugly /
  off-brand / factual* with file owner.
- **Fixers**: one agent per owner area, same file ownership as Phase 1, fixes the ranked list,
  re-runs its self-check plus the full story (serially, one fixer at a time on the shared tree,
  or in worktrees then merged by the integrator).
- At most three rounds; the final round ends with three green story runs.
- **Outcome** (2026-10-08 to 10-11): three rounds, the fixers serial on `main` (round 1's repair 2
  on a branch, merged as 61bbcea). Each round's critics (flight, island, cast, HUD, staging, film,
  playtest) reported ranked findings; fixers by owner group verified, fixed or rejected each with a
  reason and committed once; an independent gate ran every scenario, `calibrate`, `calibflight`
  and contact sheets, a read-only diff review read every hunk, and repairs closed what they found.
  Round 3 added an adversarial verifier per fixer and per repair. Since round 1 the raw-sample ledger
  (`notes/calibration-samples.md`) is the only source of a random stage's timer. Tags `phase3-r1`
  (45eaead), `phase3-r2` (90775a7), `phase3`. The rounds and the timer changes are summarised at
  the top of "Changelog (Phase 3)"; the fixers' reports are
  `notes/build-reports/phase3-r{1,2,3}-*.md`; the open known issues are in HANDOFF.md §4.

### 15.5 Priority / cut list

**P0 (must ship)**: level system; cabin + gate set with all phases; CAM_CABIN; FLYGRÄDSLA/PANIK;
mantra; hold + turbulence; trolley (AI + bowling); interactables; all 13 missions (fataga P1);
handover; island map with every landmark and the 23 block types (simple is fine); props retheme;
SKANDAL with Guardia cars + walking officer (fallback: car-only pursuit, a Land Rover busts an
on-foot player, §7.2); ¡MULTA! (scaled fine, bust freeze); Ole-pays; prylar + hajfenor; pesetas;
Swedish UI; `muzak` + `sol` tunes; applause; fear low-pass + heartbeat; **night and sunset
palettes** (`setSkyPalette` is P0 and the palettes are data in §13.3; the grisfest night bus and
Tonga Tonga depend on them); the three static luggage stowers; `smooth`/`fragile`/`haggle`/
`smash`/`minDist`/`playerPassenger`/`destroy` (bodega's Guardia jeep); save v1; story `#13 idle`.

**P1 (ship if possible; each has a fallback)**:
1. Rio end card (fallback: final banner only).
2. `fataga` mission (fallback: cut; story ends `#12 idle`).
3. Carry-Berra on foot (fallback: `dropoff`).
4. Outfit swaps (fallback: base looks).
5. Porter bribe hideout; Storch witness toast.
6. Cabin minimap plan (fallback: hidden minimap + toast).
7. Moving aisle walkers; galley juice; Ole barks fine-tuning.
8. (moved to P0: night/sunset palettes)
9. `vals`, `jul`, `skandal`, `samba` tunes and the trad cues (fallback: `sol`).
10. Parked DC-8 at the airport; the dream plane detail; grisbil unlock; samba unlock.
11. Angerud/Levander cutaways (`cut` cues; fallback: lines without camera cuts).
12. (replaced: the bodega Guardia jeep is a P0 `destroy` stage; no forced pursuit)

**P2 (only if everything else is done)**: player-driven trolley; Guardia jeep unlock; witness
multiplier; "steady arms" mantra minigame (turbulence drifts a marker, A/D keeps it in the zone);
Eslöv time trials; SunTrip-office hideout; Angerud searching Stig's room
("Buenas noches, señor"); piglets falling off the grisbil; sheep flock as Fataga decor; oink horn;
number plates; day cards ("Dag 2").

---

## 16. Test plan

### 16.1 Pass criteria

A story run passes only when **all** hold: a line `[t] done -> #13 idle stage …`; no line
starting `scenario failed`; the last error line is `no errors`; and the harness's own summary
`RESULT: PASS` (Phase 0 adds it: it checks the first three and that the final `missions.index`
equals `MISSIONS.length`). `shot.mjs` exits non-zero on FAIL.

```sh
PORT=8870 OUT=$OUT node tools/shot.mjs story 2>&1 | tee story.log
grep -q "RESULT: PASS" story.log && echo PASS
```

### 16.2 Harness (`tools/lib.mjs`, Phase 0)

```js
T = { page, ev, frames, sleep, shot, hold(keys, ms), tap(key), fresh(query),
      until(fn, timeout = 90000, ...args), warp(x, z, yaw), L(name), state(), log(...),
      startMission(), anyCar(), enterNamed(name), waitIdle(idx),
      holdUntil(key, fnDone, timeout = 60000),   // keyboard.down(key) until fnDone() is true
      sit(seatId) };                             // __game.sitPlayer(seatId)
```

- `startMission()` (race fix): `frames(3)`; exit any car; read `missions.current.at` → warp to
  `game.approachSpot(at)` (§4.4); `frames(3)`; if the giver is > 3 m away (and not
  seated) warp beside the giver; tap `KeyE`; `until(state === 'running')`. Phase 0a: the warp + tap
  is retried up to 6 times (3 s each), because the running trolley can bowl him over first.
- `story`: `M = [...M_FLIGHT, ...M_ISLAND]`; `FROM` reloads with `&mission=FROM`; `TO` stops
  before index `TO`; each `M[k](T)` ends with `T.waitIdle(k + 1)`.
- Test mode (`?test=1`): no title, no pointer lock, `autoDialog`, **dialogue 220 chars/s with a
  short auto-advance pad**, `timeScale = 3` (cabin phases, timelines, turbulence, mantra seconds),
  haggle zones 0.6 and speeds × 0.5. Rabbit counts ≤ 6.

### 16.3 Story scripts (outline; F/G own the real scripts)

| M | mission | script |
|---|---|---|
| 0 | gate | start → warp `stage.at` (arch), tap E → until stage ≥ 1 → warp `gateOle` → until stage ≥ 3 → warp `herrtoa` → until stage ≥ 4 → `holdUntil('KeyJ', stage ≥ 5)` → until stage ≥ 6 → warp `gateLounge` → until stage ≥ 8 → warp `cabinDoor` → `waitIdle(1)` |
| 1 | ombord | start → `sit('14B')` → `holdUntil('KeyJ', idle-or-outro)` → `waitIdle(2)` |
| 2 | juice | start (talk to Ole standing in the aisle) → `sit('14B')` → tap E (call14) → until stage ≥ 1 → `cabin.stopTrolley()` + force stopped, warp to `stage.at` (`trolleyEnd`), tap E → until stage ≥ 2 → warp `cabinRow14` (before the turbulence delay) → until stage ≥ 3 → `sit('14B')` → `waitIdle(3)` |
| 3 | sprit | start → for each alive `stage.list` item: warp onto it (≤ 6) → warp `galleyFront` → `waitIdle(4)` |
| 4 | landning | start → warp onto each `stage.list` NPC → `sit('14B')` → `holdUntil('KeyJ', phase === 'landed' && stage done)` → `waitIdle(5)` → assert `level === 'island'` and player within 20 m of `airport` |
| 5 | buss17 | start → `enterNamed('buss17')` → warp `flamencoDrive` → `waitIdle(6)` → assert outfit `hawaii` |
| 6 | friskotek | start → ≤ 6 warps onto `stage.list` → warp `friskotek` → `waitIdle(7)` |
| 7 | asnan | start → `anyCar` → warp beside Ole → warp `marknad` → haggle: 3× `until(stage.inZone)` + tap E → warp onto `stage.item` (donkey) → warp `supermercado` → warp onto `stage.item` → (paint scene in the car) → warp `vikingbar` (in car) → exit car, warp `vikingbar` → `waitIdle(8)` |
| 8 | bodega | start → `anyCar` → warp beside Berra → warp `playa` → warp `vischan` → (dropoff, scene) → follow: warp 12 m behind `stage.car` every 1.5 s until the stage changes → enter `stage.car` (getInCar missionCar) → until stage ≥ 8 → `__game.missions.stage.car.damage(999, __game)` (Guardia jeep) → until stage ≥ 9 → warp `flamencoBack` → `waitIdle(9)` |
| 9 | ropavieja | start → `anyCar` → follow: warp **20 m** behind `stage.car` every 1.5 s → exit car, warp `plaza` → `waitIdle(10)` |
| 10 | fataga | start → `anyCar` → warp beside Majsan → follow warps (12 m) → (scene) → ≤ 6 warps onto sheep → warp `fatagaFold` → `waitIdle(11)` |
| 11 | grisfest | start (cost; Ole pays if short) → ≤ 5 warps onto flowers → `anyCar` → race: warp checkpoint by checkpoint keeping yaw → exit car, `__game.breakProp` on `stage.list` until done → (scene) → warp `tongatonga` in car → (scene) → warp beside Berra → warp `flamencoDrive` → carry: warp `flamencoRecepcion` (or dropoff) → `waitIdle(12)` → assert palette day |
| 12 | julafton | start → for each `stage.list` NPC: warp onto it → warp `flamencoPool` → (scenes) → `holdUntil('KeyJ', stage done)` → `waitIdle(13)` |

### 16.4 Scenarios (owner in brackets)

`T.state().stage` is the 0-based `missions.stageI`. Scenario names are unique across modules (§14.1).

| scenario | asserts / shots |
|---|---|
| `missions` [Phase 0] | for N = 0..12: `fresh('&mission=N')`: `level === levelFor(N)`, giver visible within 40 m of `at`, no errors; at `&mission=1`: `cabin.seatOf(npc('ole')) === '14A'` and Majsan seated in 16E (cast seated from the start of ombord); **data checks**: every key used in any `place`/`extra`/`outroPlace`/`outroHide`/`who`/`findAt`/`standAt`/`sendTo`/`frame`/`duet` resolves via `game.npc(key)`; every `checkpoint: true` stage acting > 60 m from `def.at` has `retryAt` (§9.4) |
| `gate` [A1] | mission 0 loaded: shots of arch, lounge, toilet, bridge; walking into every gate wall for 2 s keeps `cabin.inside()` true; the arch is the only way out of the landside pocket; `kontrollant` and the `gateQueue` warp spot are not inside a solid |
| `cabin` [A1] | `setPhase(p, {instant})` for every phase → shot each; walk into each cabin wall 2 s → still inside; `camera.position.y > 4`; seated heads clear of the overhead (a 9 × 9 ray grid per head: no rack, rail or service unit in front of any sample, from the row-14 aisle view and the 14A/14B and 16E/16F two-shots; Phase 3, §5.3); row-number strip shot; after `?mission=2` boots and after `setNpcOutfit('ole', 'flyg')`, Ole's root world position is within 0.5 m of seat 14A; player at `galleyBack` and `toiletBackL` with camera yaw toward the nose → shot + raycast: no airframe mesh between camera and player; juice [0] running: from the aisle at row 14 (x −0.3, −0.2 and 0.25, four facings) the seat prompt is 14B, and E from x −0.3 seats him in 14B (Phase 3 r3 repair, §5.10) |
| `trolley` [A1] | `startTrolley`; stand in the aisle ahead for 40 s: `stats.bowled ≥ 1`, fear rose, no NaN; stepping into a free row avoids it; an NPC standing in the aisle makes the trolley wait (not shoved); Phase 3 r3: landning started with the auto trolley aft of row 16 has it parked at `trolleyPark` (`stop`) in the round-up, and a stage-1 checkpoint retry keeps it there (§5.8, §9.4 item 3) |
| `turbulence` [A1] | standing, not holding: `turbulence(0.8, 6)` → `stats.falls ≥ 1`; repeat holding Space → no fall |
| `panic` [A1] | cruise idle: `addCoins(100)`; `shame.add(100)` → within 4 s player seated in 14B, coins 50, v 40; player in the lounge (outside the cabin) → player at `gateOle`, gate toast text; mission 2 takeoff stage → mission failed with the panic text; PANIK during a `scene` is deferred until it ends |
| `phases` [A2] | every phase at `t = 0.5·len`: one shot from the default cabin camera and one from outside the plane |
| `transition` [Phase 0] | `FROM=4 TO=5 story` then `level === 'island'`, player within 20 m of `airport`, giver `lasse` there |
| `views` [Phase 0] | every `MAP_LABELS.island` landmark (or `VIEWS`), one shot each from 14 m out / 6 m up; a missing landmark is a warning, not a failure; `aerial` |
| `traffic` [Phase 0] | 60 s: stuck cars reported (≤ 2), ≤ 1 bus |
| `title` [Phase 0] | title card shot (fresh save → cabin orbit; `&mission=6` → Flamenco orbit) |
| `smash` [B] | ram the nearest `correos` with `hyrbil`, then a ped: SKANDAL rose, coins burst |
| `foot` [B] | trampoline bounce, kick a fin (`fena`), stand on a car roof, double jump |
| `castsheet`, `cars` [E] | lineups; no errors |
| `ui` [H] | long Swedish strings in toasts/banners/objective; glyph check shot; dialogue with Norwegian line |
| `skandal` [H] | `addCoins(2000)`, `shame.add(100)`: 2 `guardia` cars spawn; exit car → officer walks at the player (closes 3 m within 10 s without a stuck teleport, round a block corner if a building stands between them; Phase 3 r2, was 1.5 s) and never stands inside a solid; block him behind a building → teleported within 6 s; get busted → coins −400 (20 %), ¡MULTA!, player frozen ~3 s; an offence within 20 m of Herr Storch adds 0; the porter bribe: his line shows before the `PORTIERN TITTADE BORT` banner (Phase 3) |
| `talk` [Phase 0] | `autoDialog = false`, walk to Ole at `gateQueue`, E, Space twice |
| `fullstory` [Phase 0b] | swaps the literal §8 missions (`tools/fixtures/full-missions.js`) into `MISSIONS` and plays all 13 per §16.3 (`FROM`/`TO` as `story`); must end `#13 idle`, `RESULT: PASS` |
| `kinds` [Phase 0b] | fixture data checks; haggle misses fail; follow `minDist` fails; smooth/fragile bars (teleports never count); carry spill; checkpoint retry re-applies night + `vals` and revives plates at `dansgolv`; destroy default spawn; grab at the wreck; scene `exitCar`; Phase 3: follow shows no bar before the start and a head-on quarry does not fail it, `retryCar` (the last car reused, a typed named car, `park`), getInCar `atHome` and a wrecked `missionCar` failing, a frame-only scene stopping the car dead, a scene cutting a `collect` guest's bubbles (3 frames in: no bubble over the guest or Stig, no empty one) and keeping his placement |
| `heads` [E] | light face check: one head per hair style and hat, plus the portraits (run after any head/hat change) |
| `flightshots` [A1] | review shots of the gate and cabin (lounge, toilet, trolley waiting for a downed player, …) |
| `sceneryPeek`, `flightseq`, `dc8` [A2] | outside views of the flight scenery; the takeoff→cruise chain driven through `cabin.setPhase`; the parked airframe |
| `propsheet`, `riocard`, `islandtour`, `islandstats` [B] | every §6.8 prop in a row; the Rio set from `rioCam`; streets/outskirts/sea tour; triangle budget |
| `endcard` [Phase 2] | `game.playEndCard()`: Stig on the Rio deck in `rio`, Ole in `rio`, sunset, letterbox, frozen input, `RIO…?`; then back within 2.5 m of `flamencoPool` in island clothes, free roam, `NUEVA ESTOCOLMO KLARAT!` |
| `calibrate` [G, Phase 2] | island timer calibration and difficulty checks (§8 "Timers and difficulty"): a headless autopilot in the player's car (env `CAL=id,…` from buss17 asnan vischan jeep home flowers plates tonga race guests balls sheep follow pursuit haggle; `RUNS` = 3, `JEEP_RUNS` = 12, `HOME_RUNS` = 2 (per spot), `FOOT_RUNS` = 4 (balls, sheep, flowers), `PLATE_RUNS` = 6, `RACE_RUNS` = 2 (+ 2 with one crash; every car-car impact of the player's car or the bus is logged, and a run whose car was lost counts as lost), `PURSUIT_RUNS` = 3, `RACE_SWEEP`, `JEEP`, `RACE_CAR`); medians of clean runs (the plates' fixed layout too) / 75th percentiles, on-foot A* walker (round static solids and stopped cars; it tracks its place on the route, measures progress along it (12 s without 1 m of it, or 30 s without getting 1 m closer along the route, is stuck and fails the run), re-plans at once on a new target, and backs out along its trail from a spot the grid cannot leave; walk results log `falls` and `wedges`), crash injection; the default run is a regression check, and a random stage's timer comes from its pool in `notes/calibration-samples.md` (`node tools/pool.mjs`); `CAL CHECK` compares each measured timer with the shipped one and, for a random stage (jeep, balls, sheep, flowers), says whether the shipped timer lies inside this sample's 90 % bootstrap range of the timer (`timerRange` in `tools/lib.mjs`; §8 "Timers and difficulty"); checks: deterministic shipped timers ≥ T_ref, a clean race wins and a crashed one loses, a clean SKANDAL escape is possible, follows stay in band; prints the timer table. `story` supports `SHOTS=1` (key-scene screenshots; every mission script slows the dialogue, which a `FROM` reload resets, and a shot wait gives up once the mission reaches the stage it names in `before`, so a missed line never holds the script while a timed stage runs; Phase 3 r2) |
| `calibflight` [Phase 2] | flight timer calibration and FLYGRÄDSLA balance (env `FLIGHT=gate/sprint,…`, `SPRIT_RUNS` = 5, `DEBUG_SPRIT=1` traces the player, the trolley and the bottles twice a second, `DIALOG_CPS` = 55 the dialogue's typing speed, 20 for a player who reads every line: Phase 3 r3, FLYGRÄDSLA must not depend on it, §5.9): careful vs careless autopilots at timeScale 1; the landning round-up logs where the trolley stands at its start and end (Phase 3 r3); the sprit sweeper waits for bottles in the aisle clear of the trolley (2.4 m moving, 1.7 m stopped), steps into a free row only in turbulence and holds Space only while it shakes (not through the 1.5 s warning; Phase 3 r2); `CALF CHECK sprit[0]` compares with the shipped timer and the sample's 90 % bootstrap range; checks that careful players never panic (and the sprit sweeper is never bowled over and never falls) and careless ones do in missions 1, 2 and 5; the gate dawdler's failed dash is retried from the statistics and the retried dash must start within 2 of the first attempt's fear (Phase 3 r3 repair, §8.1 [2] `retryFear`) |
| `perf` [Phase 2] | frame rate (2 s of play) plus the mean `game.update` ms and the GPU-synced `renderer.render` ms in the cabin in every phase (seated in 14B and from the aisle), at the gate, and on the island (spawn, plaza, marknad, kasbah, a drive through the centre, the high view); fails below 45 fps or above 1000/45 ms per frame. Phase 2: worst cabin 7.2 ms, worst island 9.0 ms (marknad, ~810 calls, 3.3 M triangles), all at 60 fps |

---

## 17. Risks and mitigations

| # | risk | mitigation |
|---|---|---|
| 1 | Camera in a 1.2 m aisle (clipping, pull-in, ceilings) | Cut-away dollhouse, down-facing ceiling, narrow racks, steep `CAM_CABIN` with `noPull`, profile-aware `frame`; `cabin` scenario screenshots |
| 2 | Gate set visible beside the "flying" plane | Gate group visible + solid only in phase `gate`; door block toggled; scenery moves, airframe static |
| 3 | Global fog washing out the interior | Flight palettes keep fog near ≥ 40 m; whiteout faked with puffs + window colour |
| 4 | Town helpers misfiring at x = 3000 (`freeSpot`, R reset, `routeAim`, pursuit, minimap, title, outro relocation) | §4.3 table wired in Phase 0; no `routeAim` in the flight level (markers aim straight); `missions` + `panic` scenarios |
| 5 | Pursuit starting in the plane | Panic mode branches before `startPursuit`; `configure` clears pursuers |
| 6 | Seated NPCs teleported by `placeNpcs` / outro relocation | `busy` + `{seat}` homes; outro skips busy/seated speakers; `frameOne` fallback |
| 7 | Trolley physics (soft speed cap, broken tall model, wheel swap, climbing cushions) | AI-only P-control, custom `build`, `noWheels`, x clamped to the aisle; seat backs top 1.25 are walls for cars; player-driven trolley is P2 |
| 8 | Coins/props silently dropped (placed before `initCoins` / after `finalizeProps`) | Init order §14.2; cabin has no props; `cabin.placeCoins()` after `initCoins`; coin budget |
| 9 | Grisfest plates already broken on retry | `reviveProps` at `smash` init |
| 10 | Night palette / tune leaking after fail/abort | `def.onEnd` + `restoreAmbience()` on fail/abort |
| 11 | Walking Guardia officer snagging on walls | `routeAim` steering + stuck teleport out of view |
| 12 | Soft-locks on costs (grisfest, haggle, julafton, bribe) | `game.pay` → Ole pays |
| 13 | Story-test flakes (giver race, long dialogues, cabin phase timing) | `startMission` fix + `placeNpcs(true)` after idle; test dialogue speed-up; `timeScale` 3; `RESULT` line; three green runs required |
| 14 | Parallel agents colliding | Disjoint ownership (§14.1), main.js/level.js/content index **and the stage kinds** frozen after Phase 0, worktrees/sandboxes, per-agent PORT/OUT, unique scenario names, CONTRACT CHANGES section |
| 15 | Swedish/Norwegian glyphs on canvas signs and banners | Luckiest Guy + Nunito Latin-1 cover them; Shrikhand for the logo only; `ui` scenario shot |
| 16 | Factual errors / unlabelled inventions | Source tags on every line; §1.6 invented list in README; speakers marked (t); judges' fixes applied (José/Siv, Momento = porter, Fru Storch's kaffe line, Ole haggles, Berra tells Robban, points scene on the plane, Tonga Tonga before Bärra hem Berra, chaos in room 113) |
| 17 | Brands/real people/music rights | Fictional SunTrip, Sol-Viking SE-SOL, SPORT-KNÄCKE, GASOLINA, REFRESCOS; real names only inside film quotes; no "Gurli"; PD trad melodies only |
| 18 | Tone (heart attack, drinking, stereotypes) | Heart attack off-screen with a gentle caption; no ramming José's mother; no T-shirt slogan; no corrupt-police joke |
| 19 | Scope (13 missions, 23 block types, 34 cast keys) | Phase 0 stubs make everything playable from day one; P1/P2 cut list with fallbacks; fataga cut first |
| 20 | Performance (cabin + town simulated together) | Traffic/peds not stepped in flight; busts merged into one mesh; cloud deck instanced; town beyond the far plane |
| 21 | Outfit swap (`setDef`) breaking references (portrait, talk anim, seated root) | Keeps the Character object; `renderPortrait` restores the root transform; `cabin` scenario checks Ole stays in 14A; fallback to base looks |
| 23 | Characters seated in cars reporting stale positions (framing, bubbles, outro distance) | `syncAll` writes `ch.x/y/z` from `car.seatWorld`; `placeNpc`/`hideNpc` unseat first |
| 24 | Option-name collisions between runner and kinds | Common options renamed `startCue`/`timedCues`/`doneCue`; kind cues `useCue`/`fillCue`; factories copy a fixed key list (§9.1) |
| 22 | Music scheduler bursts after stalls | Catch-up guard in Phase 0 |

---

## Appendix A — canonical registries (every id in one place)

**Mission ids** (index order): `gate ombord juice sprit landning buss17 friskotek asnan bodega
ropavieja fataga grisfest julafton`.

**CHARS keys**: `stig ole majsan siv berra robban angerud levander lasse affe gabbe jose mamma pappa
carmencita herrStorch fruStorch portier sulan vardinna vardinna2 kapten pa kontrollant hittegods
saljare souvenir stadare eslov grisbonde varden guardia pax telefonist`. Player key `stig`.

**Home sets**: `gate flight island`. **Levels**: `flight island`. **Flight phases**: `gate takeoff
climb cruise approach landing landed`. **Palettes**: flight `gate clouds above descent island`;
island `day night sunset`. **Meters**: `flygradsla skandal`.

**Flight landmarks**: `gateStart gateQueue queueCam gateArch statsCam gateOle gateLounge loungeCam gateDesk
herrtoaGang herrtoaDoor herrtoa damtoaDoor bridge bridgeMouth bridgeCam cabinDoor doorCam galleyFront galleyCam
cockpitDoor cabinRow1 cabinRow6 cabinRow10 cabinRow14 cabinRow16 cabinRow22 row22Cam cabinCentre toiletBackL
toiletBackR galleyBack trolleyPark call14`.
**Seats**: `<row><A–F>`, rows 1–12 and 14–24.

**Island landmarks**: `flamenco flamencoRecepcion flamencoPatio rum113 flamencoBalcony flamencoPool
flamencoBar flamencoDrive flamencoBack bodega suntrip scen friskotek suntripPool suntripLot kasbah
vikingbar tongatonga tongaLot tongaSlump cita supermercado ferreteria telefon plaza grillpaco grillpacoMamma
marknad asnestand kyrka bensin guardia vischan eslovVag packhus grisfest dansgolv fataga fatagaFold
fatagaDukar golf bungalow bygge dromplan airport hittegods busBay bagageband dyner fyren playa hamn`
+ kerbside `follow` endpoints `grisfestGate fatagaBus grillpacoCurb`
+ cut anchors `rum107Cam recepcionCam dukarCam vischanCam` (Phase 3)
+ collectibles `pryl_klocka pryl_poolpen pryl_kalkylator pryl_kniv pryl_kamera pryl_glasogon
pryl_pung fena_flamenco fena_suntrip fena_plaza fena_golf fena_bungalow fena_hamn fena_hav` + Rio
`rioBoat rioCam`.

**MAP block types**: `flamenco suntrip kasbah cita plaza marknad kyrka bensin guardia tomat grisfest
fataga golf bungalow bygge dromplan flygplats dyner fyren playa hamn bungalowR lagenhet`.

**Named cars**: `hyrbil buss17 guardia1 guardia2 taxiAirport grisbil` (unlock) + mission cars
`grisbilFollow joseBil utflyktsbuss nattbuss guardiaJeep`.

**Car types**: `sedan hatch wagon van pickup bus guagua icecream taxi guardia grisbil trolley`.

**Prop types**: `papelera correos vykort dusch parasoll solstol palmkruka mur tomatlada tunna bank
kon bagagevagn automat gaspump butano julgran tallrikar resvaska glasskylt`.

**Collect kinds**: `pryl fena flaska juice knacke asna vaska giraff`. **Rabbit meshes**: `badboll
faar blomma gris`. **Collectible sets**: `prylar fenor`. **Unlocks**: `grisbil samba bodega`.

**Stage kinds**: `getInCar goto pickup dropoff follow rabbits race destroy grab collect sit interact
carry mantra timeline scene haggle smash`.

**Anim flags**: `wings cupUp cupHeld push planeSeat hold flail oath dance laugh slump shoeOff mirror film
giraffe butterKnife carryOver` (+ existing `kick talk wave cheer sprint spin look`).

**Tunes**: `muzak sol skandal vals jul samba`; trad cues `smaGrodorna hejTomtegubbar helanGar`.
**SFX**: `chime pling dingdong beep applause heartbeat rattle flush squeak siren laugh knock slap
doorSlam ambulance baa oink thud crash coin pickup splash` + `jingle(start|complete|fail|pryl)`.

**Cue fields**: `say radio pa sfx fear relieve shake applause phase seatbelt turbulence trolley blockers
outfit music sky place hide show anim coins pay flash banner toast cut unlock sparkle endCard`.

**Common stage options** (copied by every kind factory): `checkpoint panicFails lockMeter shame
oleBarks timedCues startCue doneCue retryAt`. **Kind cue options**: `useCue` (interact), `fillCue`
(mantra), `events` (timeline only).

**Save key**: `charter-and-run-v1`. **Ports**: game 8840, harness default 8841, Phase 0 8850,
WP-A1…H 8861–8868, A2 8869, C2 8880, D2 8881, Phase 2 8870, Phase 3 8871–8879.

---

## Changelog (review round 1)

Three reviewers (engine, film, fun). 69 findings; 69 applied, 4 of them with a changed fix (see
"Modified"). Sections touched are listed so agents can re-read only those.

**Engine contracts**
- NPC instances for every CHARS key except `stig`, radio-only keys and `vardinna2` (`stadare` existed nowhere) (§2.3, §14.2).
- `renderPortrait` restores the model transform (seated cast no longer jumps into Hotel Flamenco) (§14.2, §14.8, §15.1).
- Common stage options renamed: `init`/`cue` → `startCue`, common `events` → `timedCues`; interact `cue` → `useCue`; mantra `done` → `fillCue`; scene `done` → `doneCue`; factories copy a fixed key list (§9.1–9.4, every §8 literal, Appendix A).
- Flight cast/outfits keyed on `missions.index` (gate set only in mission 1); R reset and PANIK home keyed on `cabin.inCabin()` (§2.3, §4.2, §4.3).
- `follow` ends at `to` (no `nearestNode`); `to` must be kerbside; new landmarks `grisfestGate`, `fatagaBus`, `grillpacoCurb`; bodega/fataga/ropavieja routes changed (§6.3, §8.9–8.11, §9.2).
- Seats: per-cushion sit choice (facing + distance, stage seat +10), bust seats `taken: 'bust'`, E/J/R handled while seated, seated prompts (§3, §5.2, §5.10, §14.3).
- Car-seated characters get live `x/y/z` (`car.seatWorld`); `placeNpc`/`hideNpc` unseat first; `scene` exits the car only with `place`/`exitCar` (§9.2, §14.2, §14.3).
- `race` offsets lateral to yaw (§8.12, §9.2). Every §6.8 prop type registered in Phase 0; unknown types warn (§6.8, §15.1). `placeProp(..., baseY)` (§14.7).
- Retry re-applies ambient cues of earlier stages; `retryAt` rule + grisfest `retryAt: 'dansgolv'` (§8.12, §9.4).
- Outro: exit car, `outroPlace.stig`, player moved to the first placed NPC when > 8 m away, speaker = first placed NPC (§8.6, §8.12, §9.4).
- Kinds files frozen after Phase 0 (owner none) (§9, §14.1, §15.2).
- New APIs: `cabin.onJolt`, `cabin.inCabin`, `setPhase({hold})`, `trolleyEnd`, `setAisleBlockers`, `addInteractable({pos})`, haggle bid priority 100 on foot, `goto.awaitOverhear`, overhear anchors, `timeline.lockSeat`, cue `phase: [name, opts]` + `blockers` (§5, §9, §14.3, §14.7).
- No `routeAim` in the flight level; the "< 45 m" claim removed (§5.2, §4.3). Gate placements fixed (§2.3, §5.5). Row-13 toast at lz −1.4 (§8.2). Rack planes down-facing (§5.3). Camera `clampZ` in the cabin (§5.3). Island ≤ 1150 (§4.1, §6.4). DC-8 hill gap (§6.4). Trolley waits for NPCs; `vardinna` home beside the aisle (§2.3, §5.8).
- PANIK deferred during dialogue, `locked` pursuit-only, fear cues bypass it (§5.9, §7.2).

**Gameplay**
- Gate: stats fear only on Ole's 6 lines; timed dash; bodega tip is a mandatory scene; sisters' overhear r 8 with `awaitOverhear` (§8.1).
- Level 1 stakes: takeoff +4/s, climb bumps +8, no seated relief during takeoff/climb/approach, seated jolts +4 and interrupt the mantra; ombord timer 25 s with three luggage stowers (P0) (§5.6–5.9, §5.12, §8.2).
- Landning approach holds until the bar fills (§8.5). PANIK spills a carried item (§5.9).
- SKANDAL fine 20 % of the purse (250–1500), bust freeze 3 s, Storch witness adds 0 (§7, §10.2).
- Bodega stage 9: Guardia jeep `destroy` (P0) replaces the forced pursuit (§8.9, §15.5). Asnan ferretería leg dropped (§8.8).
- Cut list: night/sunset palettes and static aisle blockers P0; officer fallback (§15.5).

**Film / language**
- Flower exchange speakers fixed (Ole proposes, in Norwegian) (§8.12). No real brands/businesses (SEAT, Renault, Grill Paco → Casa Lola, Kasbah → La Medina, CITA → Centro Nórdico, real hotel names) (§1.5, §6.3, §6.5, §6.6, §11, §14.9).
- Concorde dream moved to the ombord outro; new juice outro (§8.2, §8.3). Answering-machine call moved to the bodega outro (§8.8, §8.9).
- "Gracias." → `guardia`; tags `[F*]`/`(t)` corrected throughout; bark tables `[F*]` with a §1.4 rule; Gabbe's lyric and Ole's "heldige femti prosentene" replaced; heart-attack caption softened; "morsom", "Annars…?!", "Inga svenskor!", "det börjar skymma", "Nästan."; panic-idle gate text; §1.6 invented list extended; pappa's role.

**Build plan**
- Phase 0 split into 0a/0b checkpoints in one serial agent; polish moved to Phase-1 owners; DESIGN.md + notes committed (§15.0, §15.1).
- Packages A → A1 (cabin) + A2 (new `world/flightScenery.js`), C → C1/C2, D → D1/D2; ports 8869/8880/8881 (§14.1, §15.0, §15.2).
- `views`, `traffic`, `title`, `transition` move to Phase 0's core.mjs; scenario names unique; story outline M0/M2/M7/M8 fixed (0-based); `missions`/`cabin`/`panic`/`skandal` assertions extended (§14.1, §16.3, §16.4).

**Modified fixes**
- Kontrollant home: the proposed `['gateArch', -1.6, 0.6]` resolves to (32.4, 3.4), inside the south barrier; used `['gateArch', -1.8, 3.0]` = (30.0, 3.2) instead.
- Phase 0 sizing: kept as one serial agent (binding decision 9) with a 0a/0b commit boundary, not two parallel 0b agents; kinds stay in Phase 0 (frozen) rather than moving to F/G.
- Level-1 fun: "steady arms" minigame → P2; the extra UPPTAGET cubicle not added (the 15 s timer gives the dash its stakes).
- Sisters' "fyra p:na" stays at the ladies' door (r 8, `awaitOverhear`) instead of moving onto the 2 m jet bridge, where standing sisters would block the only path; "Skål!" dropped.

## Changelog (user decisions, 2026-10-04)

- Local git commits, tags and per-package worktrees approved (never push; superseded 2026-10-14:
  the repo has a remote, push when the user asks).
- Phase 1 runs all 11 packages, in two waves because of RAM (A1 A2 B C1 C2 D1 D2 E, then F G H).
- Bodega stage 9 Guardia-jeep chase approved as designed. The invented stand-in names (CASA LOLA,
  LA MEDINA, CENTRO NÓRDICO, HOTEL LAS GAVIOTAS, BUNGALOWS LOS CACTUS, APARTAMENTOS VIENTO SUR,
  HOTEL MAR AZUL) are approved. G is not split.
- **Player-car boost ×2 → ×1.2** (`PLAYER_BOOST`, §6.6), and **tight, measured timers** in the
  Simpsons: Hit & Run spirit (§8 "Timers and difficulty", §15.3 step 5).

## Changelog (Phase 0a, contract additions)

- `game.approachSpot(lm)` and the §4.4 spawn-rule clarification (the landmark itself when +1.5 m is
  not free ground, e.g. `cabinRow14`/`cabinRow16`); used by spawn, R, PANIK, retry, `T.startMission`.
- A giver whose home is a plane seat stays seated while idle (§4.5).
- New Game API members: `interruptMantra()`, `frozenT`, `lmOffset()`, `unseatAny()`, `testMode` (§14.3).
- `METERS.skandal.bustLine` (§7.1); `hatC` hat-colour def field (§14.6); stage `o` + `COMMON`/`common`
  (§9.1); cabin extras (§14.7); `tools/story/common.mjs`, `blocks/stub.js`, core scenarios `levels`
  and `api` (§14.1); `T.startMission` retries (§16.2).
- `PLAYER_BOOST = 1.2` applied in car.js (user decision above).

## Changelog (Phase 0b, contract additions)

- All 18 kinds implemented (§9.2) with the behaviour clarifications listed under §9.2 "Behaviour
  notes" (haggle staging, smash.onFoot, destroy.noExplode crew, carry.who lift, getInCar handover,
  dropoff fetch-back, rider busts never doubling a character); `pickup.rider` hides the rider NPC
  while it rides; `follow.hideRiders` keeps them hidden until re-seated/placed or the mission ends;
  `collect.inCar`/`carRadius = 4`; `mantra.radius = 2.2`.
- Game API: `removeRiderOf(key)`, `speedCap` (§14.3). Cue `sfx`/`music` accept jingle and trad names
  (§9.3). `S.promptBid = '<b>E</b> Bjud!'` (§11).
- Runner: `cleanupMission()` ends with `placeNpcs(true)` (fail/abort/complete all return everyone
  to the home set; stages re-place what they need on retry).
- Harness: `missionDataProblems` in `tools/lib.mjs` (used by `missions`; checks every character key
  and landmark in def fields, stage options, lines and cues, seat ids, the `retryAt` rule);
  `tools/story/common.mjs` story helpers; new `fullstory` and `kinds` scenarios (§16.4).
- Rabbits (pickups.js): a rabbit at distance 0 no longer turns NaN; the `rabbits` kind catches
  before it lets the rabbit hop.

## Changelog (Phase 0 polish)

Last change to the frozen files before tag `phase0` (owner-none audit findings).
- `collision.segmentBlocked`: the early-out bound came from `floor(best * steps) - 1`, which
  floating point could round one sample short, skipping sample s−1 of a nearer block (a hit up to
  0.8 m too far). The hit is now kept as an integer sample index (§14.7).
- `gfx.signMesh(…, { double: true })`: two back-to-back front-sided planes (child turned π), so
  double-sided signs read correctly from behind (§14.4). Block owners need no change.
- Runner/`restoreAmbience()`: fail/abort in the flight level restore the cabin's ambient state for
  the current index (`phaseForIndex`, instant, no hold, seatbelt off; §9.4 item 6, §14.3).
- Runner: mission def field `idleAnim: { key: flag | [flags] }` (§9.4 def + item 11); buss17 uses
  `{ berra: 'slump' }` (§8.6). `outroPlace`/`place` tuples take an optional 4th element, an absolute
  yaw (§9.3, §9.4); `outroPlace.stig` with a yaw keeps it.
- Game API: `game.inCutaway` (§14.3). Pad Start resumes from pause (§3; `input.padPressed`). The
  debug `aerial` camera comes in to ~85 m in the flight level (fog ends at 300 m there).
- §5.6/§9.4: `setPhase(name, { instant: true })` on a chained phase jumps to its end state and the
  next tick chains on; a checkpoint retry drops `hold`.
- §8.12 grisfest stage 5: Ole's `gris` outfit is on the stage's `startCue` (§10.4); the fixture
  (`tools/fixtures/full-missions.js`) matches, and its buss17 has the `idleAnim`.
- Harness: `T.startMission()` waits until the player is back in state `normal` (after
  `flung`/`down`) before pressing E; `story` without `TO` expects `MISSIONS.length` (§16.1) and fails
  with a clear error when a mission has no story script.

## Changelog (Phase 2)

Integration on `main` (§15.3). Entries name the step they belong to.
- Step 1, merge: the eleven Phase 1 packages merged in the §15.3 order (E, B, C1, C2, D1, D2, A2,
  A1, H, F, G) with `--no-ff`; no conflicts (owned files are disjoint) and no duplicate scenario
  names. After every merge `node --check` and `start title` passed; after the last, `api levels`
  and the full `story` (`#13 idle`) pass. Tag `phase2-merged`.
- §6.4 parked DC-8 (coast.js): A2's real airframe no longer receives shadows when parked at Gando.
  Under the low island sun its round fuselage self-shadowed in stripes along the belly; it still
  casts onto the apron.
- Step 2, contract changes and integration gaps (tag `phase2-contracts`). Applied from the Phase 1
  hand-offs: landmark table `flamenco (−4, −8, π)`, `suntrip (−14, 24, π)`, `plaza (0, 6.8, π)`
  folded into landmarks-island.js (the builders' `f.mark` overrides removed; §6.3); HOMES tuples take
  an optional 4th world yaw, Ole idles facing the pool (§2.3, §4.5); `race.oppSpec` and
  `destroy.playerDamageScale` kind options replace G's wrappers (§9.2); F's and G's measured timers,
  checkpoints, follow tuning, race route and turbulence numbers written into the §8 literals and the
  `fullstory` fixture (§8, "Timers and difficulty"), G's extra staging noted after §8; chatter/bark
  table changes (§14.10); E's API (§14.6) and seat fit for every car (`seatY/roofY/fitScale`, no head
  through a roof; §6.6); cabin passengers are flight peds (§5.12); A1's gate solids, `clampPitch`,
  walkers, belt semantics, trolley ownership/grace, juice spots, fx (§5.2–5.12, §14.7–14.8); A2's
  ground level, exterior options and pitch ownership (§5.6); B's sea layout, block ground, exports
  (§6.4, §14.7); C2's reserved collision kind 'prop' (§14.7); H's API additions (§7.1, §14.8);
  `.gitignore` `node_modules` (matches the worktree symlinks).
- Integration fixes: one pitch owner (flightScenery, positive = nose up; cabin.js no longer writes
  `rotation.x`; §5.6 signs corrected: takeoff +0.12, approach −0.03); one snow system (A2's; A1's
  cabin `fx.snow` emitter removed); `cabin.stopTurbulence()` called by `restoreAmbience()` (§5.7);
  the climb→cruise pitch/puff pop and the takeoff→climb altitude step eased (§5.6); every standing
  jolt interrupts a held mantra (§5.7); "Juice, whisky?" at every trolley stop (§5.8); hud.say keeps
  one bubble per speaker and stacks overlapping bubbles, and the scripted row-6/takeoff bubble
  sequences wait a line's full time; the witness toast never fires during a scene or cutaway, and
  Lasse's bust radio line only after a free-roam bust (§7.1–7.2); Spanish dodge shout `¡Turistas!`
  (`Herre jävlar` [F*]; §6.7); C2 signs without English/German (`CAMBIO · VÄXLING`, `MISA 10.00 /
  GUDSTJÄNST 11.30`); flyg cardigans without the dress print, Lasse's floral shirt print, invented
  look details commented; F's tag fixes (cabin Storch PA [F], (t) on the takeoff explanation and the
  Concorde exchange) and Robban's bodega bark out of CHATTER_FLIGHT; B's half-built frame columns are
  solid ('pole'); the outskirts tree band skips the whole Gando apron (D2); D1's mowing bands above
  the fairway, water discs 4–5 mm apart, crags/rocks clear of the north ped loop, [N] tags.
- §11.7 Rio end card wired into `game.playEndCard()`; new scenario `endcard`.
- Story flake found in the step-2 story run: the fataga excursion bus (`follow`) swung wide on its
  left turn (3,1)→(2,1) and stuck on the grisfest farm wall (D1's wall 4 m behind the kerb). At
  steer 0.52 (speed-scaled) a bus turns no tighter than ≈ 12–17 m, wider than any lane-path turn.
  Fix: AI-driven buses steer with `spec.aiSteer` 0.9 (car.js; the player's bus keeps 0.52, §6.6),
  and an AI bus's lane path starts its turns 11 m from the junction centre (drivers.js; §14.1).
- **Balance pass (§15.3 step 5)**, all on the merged world; numbers and method in §8 "Timers and
  difficulty" (the table) and §7.2 "Balance":
  - Timer rule: medians of clean runs (deterministic) / 75th percentiles (random), on foot + 0.5 s
    per target, ×1.2 driving / ×1.25 on foot, **rounded up to a whole second** (was 5 s).
  - New literals (final, after the re-measurement below): gate dash timer 6 + `fearRate` 5; ombord
    seat 7; sprit bottles 25; landning round-up 12, back to 14B 5; buss17 54; friskotek balls 33;
    asnan paint 19; vischan 31; jeep 40; fataga sheep 42; grisfest flowers 42, plates 45, Tonga 23;
    julafton guests 87; bodega home `homeTimer(wreck)` (16–33 s by distance; `goto.timer` may be a
    function, §9.2).
  - Night-bus race: the bus starts in its own lane on the start spot and the player beside it on
    the left (its lane path merged a 10.5 m bus into the player's car at "KÖR!"), the grid 14 m
    past the junction (off the zebra crossing), rubber band only at the extremes (a mid-range band
    forgave a crash: it cost ≈ 0.5 s), `nattbuss` cruise 31 / maxSpeed 35 / accel 12: clean runs
    win by 2.0 s, a crash loses.
  - SKANDAL: `vehicleMaxSpeed` 33, `spawnDist` [40, 80] (never ahead of a moving player, facing
    him), `catchUp` [70, 1.3], `bands` [[70, 3], [35, 1]]; chasers brake less for bends
    (drivers.js). Before: every escape took 11.1 s and no Land Rover came within 75 m.
  - Haggle `HAGGLE` zones 0.30/0.23/0.17, speeds 0.7/0.95/1.2 (round 3 had a 34 ms window).
  - Rolling bottles roll out from under the serving trolley (a bottle beyond a stopped trolley was
    out of reach for 20–45 s: the bottle timer was a lottery).
  - `calibrate` reworked (multi-run statistics, A* walker with jumps, lead-ins and reversing out of
    plazas, crash injection, `home`, `pursuit`, `haggle` cases; the autopilot's lane checks were
    measured from the wrong reference and its overtaking only fired behind cars slower than its
    current speed) and new `calibflight` (§16.4).
- **Balance pass, finishing run** (the first attempt's numbers re-checked on the committed code):
  - The exit `calibrate` run disagreed with several committed timers. The deterministic drives
    repeat to ±0.5 s, so the old values were measured before later changes in the same pass
    (which ones is not recorded). buss17 measured 44.8 s (was 42.7) → 54; Tonga 19.0 → 23.
  - `pct` used the nearest rank floor(q·n). With the default 4 runs that is the slowest run, so a
    "p75" was a worst case. It now interpolates (calibrate, calibflight). Plates (random stacks)
    now use the 75th percentile too.
  - A Fataga sheep spawned on the far side of the 2.55 m tomato-field wall, and the chase got
    stuck. `rabbits` now spawns only on spots reachable on foot from `near` (`game.footReach`, a
    0.5 m flood fill; `game.freeSpot` takes an optional filter; §9.2, §14.3).
  - The `calibrate` walker had three bugs. Each one stalled it and inflated on-foot times, or
    reported a reachable target as stuck:
    - It skipped a jump cell from 0.5 m away and then walked into the wall.
    - Its line of sight came from `collision.segmentBlocked`, which samples every 0.8 m and so
      missed Hotel Flamenco's 0.22 m patio dividers. Three parallel lines 0.3 m apart also missed
      a 0.12 m pole at the pool bar. It now sweeps a 0.38 m body every 0.1 m.
    - Its A* stayed within 14 m of the start/target box. It now widens to 45 m when the target
      is not reached, avoids cells it stalled at, and after a stall plans without jumps.
  - Re-measured fresh with the final walker and spawn rule (12 runs each): friskotek balls 32,
    fataga sheep 42, grisfest flowers 42, plates 45. Jeep 40 (20 usable chases, median 27 s).
  - SKANDAL spawned only at junctions. On the 80 m grid, the 40–80 m ring outside the forward cone
    often held one junction, sometimes none. The exit run's spawn log showed one Land Rover every
    time from the test start, and in two runs none, which became a free "escape" after 6.7 s.
    Land Rovers now spawn on any street, 12 m past a junction or mid-block, heading towards the
    player, at least 30 m apart (shame.js; §7.2). `calibrate` logs the spawn distances and fails
    a pursuit that spawned nobody.
  - The race check flaked once: the injected crash ("3.5 m to the right") put a car that had moved
    into the right lane into the bus's lane, and the bus shunted it. The race crash now spins out
    into the left lane (`crashSide: 'left'`). 4 of 4 crash runs then lost, by 2.2–5.3 s.
- **Stability pass (every scenario, three green stories, performance)**:
  - The island spawn (`level.spawn` for missions 6–12 and after the game) put the player under
    Hotel Flamenco's reception pergola with the chase camera among the slats, which filled the top
    quarter of the first island frame. New landmark `flamencoDeck` (−4, −2.5, 0): the player now
    starts on the pool deck facing the hotel, with the camera over the pool (§6.3).
  - Walking under that pergola still put the eye among the slats, or above them on a jump. New
    camera ceilings (`collision.ceiling`/`ceilingOver`, `Frame.ceiling`, §14.3): on foot, the eye
    stays 0.3 m under a registered pergola's underside, also when looking in from 1.5 m outside.
  - A mission/fail banner overlapped the objective card's timer bar (`ui_hud`), and a chatter
    bubble covered the `LAS PALMAS` banner (`transition`). The banner moves to 40 % while the card
    is shown and is drawn above the bubbles (§11.7).
  - The giver's "!" over Ole in 14A filled a quarter of `trolley_waits` (the z-clamped aisle eye
    passes 2.6 m from it). Marker shapes (the "!", the Beacon arrow, the GuideArrow) now hide
    within 3 m of the camera; their beams stay (§5.3).
  - New scenario `perf` (§16.4). Measured twice on the RTX 4070, headless at 1280×720: every view
    holds 60 fps. The costliest cabin frame was 7.2 ms (aisle view, 1.3 update + 5.9 render), the
    costliest island frame 9.0 ms (marknad, about 810 draw calls, 3.3 M triangles; the GPU-synced
    render time varies ±2 ms between runs). That is ≥ 110 fps of headroom, so nothing was optimised.
  - The Rio end card's banner covered the orchestra busts on the wheelhouse roof: cls `endcard`
    puts it at 20 % (§11.7).
- **Docs (§15.3 step 6)**:
  - README.md rewritten for Charter & Run. The player-facing overview is in Swedish: premise, how
    to run (`make run` → http://127.0.0.1:8840), controls for both levels, the cast, the 13
    missions, collectibles/pesetas/SKANDAL/unlocks, the §1.6 invented list, the §1.4 source-tag
    policy, credits (Grisfestvärden, Städerskan; no real people's names outside film quotes, §1.5)
    and the disclaimer (fan game, SunTrip and the signs fictional, no affiliation). The code map
    and the headless-test commands stay in English, as in Bigmouth's README.
  - CLAUDE.md (project): title Charter & Run, port 8840 (harness 8841), story ends `#13 idle` with
    `RESULT: PASS`, the scenario list by module, and new conventions: the level system and the
    cabin at x = 3000, `PLAYER_BOOST` 1.2, the tight-timer rule, AI buses turn left only, source
    tags, Ole pays, the Phase 1 frozen-file history and the `p1-<WP>` worktrees (leave them alone).
  - Makefile (run message, `test` comment), package.json (`name: charter-and-run`, description,
    `test` → `node tools/shot.mjs story`) and package-lock.json (`name`).
  - `src/world/blocks/stub.js` deleted (unused since Phase 1; §14.1).
  - `../CLAUDE.md`: the "latest created game" pointer now names `charter_and_run__sallskapsresan/`.
- **Gate fix 1** (the independent Phase 2 check failed `calibrate` and the difficulty rule):
  - Night-bus race on a **closed course** (§9.2 race, `game.closure` §14.3, drivers.js): moving
    traffic on the course or within 28 m of a course junction is removed at the start, nothing
    spawns next to a course junction, and traffic stops ≈ 11 m short of a closed junction (parked,
    no pushing on into the car ahead) until both racers are through it. Cross traffic had wrecked a
    player's car at the second junction and held up the bus (`avoid: false`) at the first, so a
    crashed run won. Final code: 12 clean runs won by 1.7–2.0 s, 12 one-crash runs lost by 2.2–2.4 s,
    no car-car impact (§8 "Races and chases").
  - `calibrate` race: `won` is "the stage completed" (a lost car no longer counts as a win); every
    car-car impact of the player's car or the bus is logged with who hit what; the drive autopilot
    logs what held it up (`blockedBy`: traffic, parked, ped, the bus).
  - Jeep timer **42** (was 40): p75 34.4 s of 35 chases in four runs on the same code (§8 table).
    `JEEP_RUNS` default 12 (6 gave a p75 of 4 usable chases).
  - Home timer refit: `HOME` { c 7.9, v 34.4 } (was 6.3 / 28.6), the fit 4.9 + d/34.4 of 12 clean
    drives (`HOME_RUNS` 3 per spot; default 2) + 3 s; fallback `TIMERS.bodegaHome` 30 (was 33).
    homeTimer now 17–30 s.
  - Comment/table consistency: asnan T_ref "median of 3 clean" in both island.js and §8.
  - Re-measured, unchanged: vischan 25.8 s (median of 8 clean over the gate run and two fix runs;
    a single run of 3 gives 25.4–26.2 depending on traffic) → 31; julafton guests 72.4 s (median of
    8 clean in 6 runs, 72.1–74.5) → 87.

## Changelog (Phase 3)

The QA loop (§15.4): critics, triage, serial fixers on `main`. Lines are prefixed with the round and
the fixer's group.

**Summary** (written at the tag `phase3`; the open known issues are in HANDOFF.md §4):
- **Round 1** (tag `phase3-r1`, 45eaead; nine fixer groups, then repairs after gates 1 and 2):
  checkpoint retries that put a car at the spot (`retryCar`) and a fail screen that waits for E or
  Q; a chase eye that stops short of walls, and camera ceilings under the centre's arcades and
  canopies; world fixes (Centro Nórdico's courtyard, La Medina's balustrade, Flamenco's room numbers,
  signs, night glow); bus occupants and the cast's looks from the research; the cabin's overhead
  clear of seated faces and the trolley frozen in scenes; readable toasts and bubbles, uppercase
  Luckiest Guy; staged intros and outros for the island missions, checkpoints where a failure
  replayed a whole mission, source tags. Repair 1: `unsay` and the car-vs-person rule. Repair 2: the
  raw-sample ledger `notes/calibration-samples.md` with `tools/pool.mjs`, and the fixed `calibrate`
  walker (`walker-r1r2`), from whose pools the on-foot timers were re-set.
- **Round 2** (tag `phase3-r2`, 90775a7; eight fixer groups, 64 findings, gate PASS, review clean): a
  frozen car that holds, R in the flight level, the retry toast; camera ceilings counted by the sight
  line and in cars, the 0.45 m eye disc, the first side slide, solid Flamenco piers; the plaza's
  north row, parking signs, big dunes; hanging cabin signs that face the camera, palette blends;
  eye-level cuts for the flight scenes and the first `via` guides (the gate dash, ombord's seat
  dash); staging in asnan, bodega, friskotek, fataga and the vischan scene; radio inside the drives,
  checkpoints on the haggle and the vischan drive, the night race in the hire car; barks by speaker,
  bubbles at the real head top, the objective timer rounding up.
- **Round 3** (tag `phase3`; 26 critic findings and the user's own hand-play bug; five fixer groups,
  flight-trolley among them; two post-gate repair rounds, each followed by verifiers; two ledger
  steps; this docs step): `via` guides on every gate and cabin stage whose straight line crosses
  furniture (re-derived each frame, the over-the-furniture pass, the leg point), R in the terminal,
  FLYGRÄDSLA's idle decay paused in scenes and `retryFear`, the stage's seat for E; the objective
  Beacon's beam faded and its arrow hidden in the flight level, TURBULENS! as a toast, the Stork
  scene staged, timed stages and retries turned to their guide (`faceGuide`); fixed giver-intro
  shots, the Viking Bar outro (`outroHide`, and the fail screen keeps the hide), the end card without
  toasts or poses, staff barks; the continuous side slide (hold, swap as a cut, wedge), solid Fataga
  crags and friskotek notice board, café parasol ceilings; landning's trolley parked in the front
  galley (`trolley: 'park'`); every gate's raw runs in the ledger, the pool text re-synced, and
  Phase 3's sampling closed (2026-10-11).
- **Timers over Phase 3** (at `phase2` → at `phase3`; each change measured and backed by the ledger,
  none padded):
  - sprit 25 → **13**: the trolley frozen in scenes (r1 cabin-flight, 22), the sweeper waiting in the
    aisle instead of hiding in a row behind three serve stops (r1 repair, 11), the turbulence moved
    inside the sweep (r2 flight-missions, 13; pool n 101 since).
  - bodega jeep 42 → **41**: the chase autopilot's unstick fix (r1 island-flow, 37; r1 repair, 40, on
    chases whose logs were lost), the rule on 83 raw chases (r1 repair 2, 42), then on 119 and 130
    (r3 ledger and ledger2, 41).
  - friskotek balls 32 → **23**: r1 repair's 33 (the walker round parked cars, 72 runs whose logs
    were lost), the fixed walker (r1 repair 2, 24), the intro placing the cast (r2 island-staging,
    23; r2 gate, 24), the solid notice board, a new pool (r3 island-camera, 24; r3 ledger2, 23 with
    r3 gate 2's runs).
  - fataga sheep 42 → **28**: the fixed walker (r1 repair 2, 27); the solid crags, a new pool (r3
    island-camera, 28), then 27 (r3 ledger) and 28 (r3 ledger2) as default runs joined a pool on a
    rounding boundary.
  - grisfest flowers 42 → **26**: the fixed walker (r1 repair 2, 26); the solid Flamenco piers, a new
    pool (r2 gate, 23); the r3 porch intro placing Ole beside the start, a new pool (r3 ledger, 26).
  - grisfest plates 45 → **33**: timed as a deterministic tour, the median of a fixed layout (r1
    repair 2).
  - grisfest Tonga 23 → **19** and julafton guests 87 → **81**: the fixed walker's shorter on-foot
    legs (r1 repair 2).
  - Unchanged: gate dash 6, ombord 7 (re-measured from the intro's spot in r2), landning 12 / 5,
    buss17 54, asnan 19, vischan 31, `homeTimer` 17–30.
  - The balls, sheep and flowers pools sit on a rounding boundary: one more default run can move
    one of them by a second, by the rule.

- r1 spine: `retryCar` common option (§9.1, §9.4 item 3): a checkpoint retry puts a car at the spot
  (the last car repaired, a spare hatch, or a typed named mission car; passenger, rider; `park`),
  before the stage's init (`runner.startMission(from, before)`, `runner.lastCar`); data checks
  resolve its landmark and characters; new `kinds` checks.
- r1 spine: the fail screen waits for E or Q; the 15 s auto give-up is gone (§9.4 item 3).
- r1 spine: `getInCar.atHome` (§9.2) and buss17 stage 0 `atHome: true` (§8.6, fixture): a retry
  finds the bus on its bay.
- r1 spine: `getInCar` fails when its `missionCar` is wrecked before the player is in it ("Du
  kvaddade Grisbondens bil!", existing `wreckedRide`; §9.2, §11.5): was a soft lock in bodega.
- r1 spine: `follow.minDist` counts only after the player has trailed the quarry, and `follow.obj`
  shows no bar before the tail starts (§9.2): José driving at the player no longer fails ropavieja.
  `CAL=follow calibrate`: all three tails in band, no timer involved.
- r1 spine: `scene` without `place`/`exitCar` stops the player's car dead first (§9.2).
- r1 spine: `collect` bubbles end and the late `sendTo`/`seatOnTouch` is dropped when a dialogue or
  cutaway starts meanwhile (§9.2): Berra stays in the julafton group shot.
- r1 spine: `haggle` dialogues frame seller + partner (§9.2): Ole, who does the haggling, faces the
  camera.
- r1 spine: chase camera pull-in samples every 0.25 m, stops 0.45 m short and climbs on a 1.6 m arm
  (cap 1.25 rad, then looks ahead) instead of entering the wall; `frame`/`frameOne` check the second
  side (§14.5); `segmentBlocked` takes a `step` (§14.7). Sweep: 0 eyes in a solid (was 2.4–8.9 %).
- r1 spine: the giver's "!" also hides within 3 m of the player (§5.3).
- r1 spine: the pause card refreshes the Ljud label (§11.3).
- r1 spine: island palettes carry `sunDir`; the sunset sun is low in the WSW (§13.3, §14.4).
- r1 world-town: camera ceilings (§14.3) under every centre `arcade()` (La Medina's two, the plaza's
  north row), Centro Nórdico's canopy, the Casa Lola pergola, the church portico, Gasolina's pump
  canopy, shop canopy and workshop bays, the SunTrip office awning and Flamenco's pool-bar thatch:
  the chase eye no longer rises into or above them and hides the player.
- r1 world-town: Centro Nórdico's north shop row and canopy fit the courtyard between the wings
  (x ±11), so `SVENSKT KAFFE · KONDITORI` and `ESTANCO · TABACOS` read whole; `SOUVENIRS ·
  REGALOS` and `FARMACIA` (its lit cross on a bracket) moved onto the wings' courtyard faces; the
  canopy posts inside the wings are gone (§6.3).
- r1 world-town: La Medina's stair balustrade starts above the bottom three steps (newel post) and
  has a sloped wall collider along it: the player walked through it and fell up to 5.85 m. A
  full-length collider would have closed the only way on, over those three steps (§6.3).
- r1 world-town: street lamps glow after dark: lantern panes and star centres in one unlit mesh,
  `town.js` `nightGlow`, which block builders may add to (§13.3).
- r1 world-town: Casa Cuartel's flag mast stands beside the path (x 4.6), off the axis to the
  `CASA CUARTEL` plaque (§6.3).
- r1 world-town: Hotel Flamenco: a closed room's number is centred above its own glass door (it read
  as the next room's opening's); the julafton party `julgran` moved to the pool deck at (2.2, 16),
  into the party and sunset-duet shots (§6.3).
- r1 world-town: the west entrance stub's asphalt crosses the outer sidewalk ring to the perimeter
  road (§6.4).
- r1 world-town: signs `CERVECERÍA · ÖL` (was the German `BIERSTUBE · ÖL · BIER`) and `APARTAMENTOS
  SOL DE INVIERNO` (was `APARTAMENTOS TAMARINDO`, a real San Agustín hotel's name; §6.5).
- r1 world-town: the old Bigmouth prop aliases are gone from `props.js` `TYPES` (§6.8).
- r1 world-town: the SunTrip lawn's east bench stands off the stage at (8.4, −12) (it stood on the
  stage, seat at plank level). `CAL=balls` with it moved (27 runs) and as a control at its old spot
  (12 runs): p75 25.6 / 26.8 s, median 21.8 / 21.6 s, i.e. no effect, so §8's 32 s stays. Both sit
  above the Phase 2 measurement (p75 21.9 of 12, median 18.6); left to the difficulty pass.
- r1 world-outskirts: the bygge storey under the 2nd-floor slab is closed like the 3rd floor's
  (dark core, brick infill along x 2 and z −3, corner columns): its collider is solid from the
  ground, so the 1st floor ran into an invisible wall at x 2 and z −3 (§6.3).
- r1 world-outskirts: landmarks `dyner` (0, 0, π − 0.4) and `bagageband` (6, 11, π): the views
  camera stood north of the dunes arch (the board hid the player) and inside the terminal (§6.3).
- r1 world-outskirts: the Gando arrivals board says `GOTEMBURGO`; `LLEGADAS · ANKOMST` stands in
  front of the fascia's orange stripe, which sliced its letters; `ESLÖV 3 900 KM` (≈ 3 880 km).
- r1 world-outskirts: sign source tags in nature.js (`SE VENDE · BUNGALOW / 4 RUM OCH KÖK` is the
  bungalow seller's line, `[F*]`; the invented ones `[N]`; real place names untagged).
- r1 world-outskirts: Christmas-week and charter-Sweden touches in the nature blocks (§6.9): Fataga,
  golf, the grisfest gate, the show bungalow; nothing solid where a timed stage runs.
- r1 world-outskirts: the lighthouse beam is additive light that fades along its length (was a
  grey tube with a disc on its end); the marina's quay lamps and harbour light and Gando's apron
  floodlights glow after dark in `nightGlow` (§13.3).
- r1 world-outskirts: no towel on the sand in front of each sunbed pair (`solstol` carries its own,
  §6.9); the Gando canopy roof hides with 1.5 m hysteresis (a player shuffling outside the hall
  flipped it 8 times in 2.3 s, now 0).
- r1 cast-vehicles: bus occupants (§6.6): `seatY` wheelR·0.95 + 0.55 for buses (was + 0.9) and
  `roofY` = the roof underside (− 0.22 slab) − 0.08 (was Infinity), so bus 17's driver, passenger
  and window riders, Gabbe's night bus and the guagua/SunTrip driver busts have their heads in the
  window band, not in or through the roof; the bus floor, seat backs and steering wheel moved down
  with them.
- r1 cast-vehicles: rider busts by cast key wear the character's current outfit (`main.addRider`
  uses `npc(key).def`): Robban's island shirt and cap, Berra's cap, Majsan's flower (§6.6).
- r1 cast-vehicles: the porter's "Momento." mirror shows its glass to the camera (it showed its gold
  back).
- r1 cast-vehicles: prints are a second mesh without an outline (each petal and dot had a black
  ring), dress dots are flat discs on the skirt cone (they sank in or stuck out as pearls), and under
  a suit or vest the shirt print shows only in the V or the opening: Lasse's yellow jacket is plain,
  his orange shirt patterned; Herr Storch's vest is plain (§2.1, §14.6).
- r1 cast-vehicles: curly hair has a cap and a nape under the curls (the back of the head was bald).
- r1 cast-vehicles: looks from the research (§2.1, §2.2): Siv's top white and red flowers on pink
  (`skirtPrint` keeps the dress's pink dots), Stig's white mittens with a red band, Ole's black
  boombox and grisfest pendant, Robban's collars and blue-peaked cap, Angerud's blue shirt and his
  gate look (camel coat, fur hat; `LEVEL_OUTFITS.gate`), Lasse's jul shorts with a white hem; the
  invented-details note names only Stig's arlanda scarf and Fru Storch's white dress.
- r1 cast-vehicles: `castsheet` frames the anim-flag rows wider, so the giraffe is not cut off.
- r1 cabin-flight: the hat-rack rail is gone and the passenger service units are down-facing planes
  (one merged mesh); only 14B's call button is a solid (§5.3). From the high camera the cream strip
  lay across every seated B/E forehead and the rail ran down the A/F faces. The `cabin` scenario
  checks every seated head with a 9 × 9 ray grid from the aisle and the two-shots (§16.4).
- r1 cabin-flight: the trolley freezes during a dialogue or cutaway and in the runner's intro,
  outro and fail screen (§5.8): it bowled Stig over in the landning intro and called "Juice,
  whisky?" over scripted lines. Sprit re-measured (`calibflight`, 12 runs): p75 14.4 → T_ref 16.9
  → timer **22** (was 25; §8 table, flight.js, fixture).
- r1 cabin-flight: cabin and island chatter in free play only, the cabin's at most one per 5 s;
  Ole's bark timer stops in dialogue and a due bark waits for his own bubble; the mantra
  auto-bubble waits while any other bubble is up (`game.say` records `sayEnd`, `saying(t)`); a
  walker's "Ursäkta!" not in a dialogue (§5.9, §5.12, §14.10).
- r1 cabin-flight: `cam.openFloor` (§5.3, §14.5): in the gate lounge (not the landside pocket)
  `frame`/`frameOne` use the Bigmouth side two-shot at eye level instead of the dollhouse; two
  speakers < 0.3 m apart are framed from in front of the first.
- r1 cabin-flight: the galley signs turn to the camera's side (§5.3); no snow over the bridge and
  lounge at any height; the snowfield drifts show at the gate only and the runway tile carries its
  own scrolling drifts (§5.6).
- r1 cabin-flight: the on-board toilet hideout and the galley self-serve juice are labelled
  invented (§1.6, README, cabin.js).
- r1 audio-ui-meters: toasts stay up by length (2.4–7 s, was a fixed 2.2 s), at most three at once,
  are faded out when a dialogue starts, and sit below a shown objective card (§11.4).
- r1 audio-ui-meters: speech bubbles wrap at 300 px, stay on screen, under the coins/meter row and
  a shown objective card; a stacked one with no room above waits hidden; `game.say` keeps a line
  up ≥ 1 + 0.045 s a character (halved in test mode) (§11.4, §14.3).
- r1 audio-ui-meters: the mission title card shows in the top letterbox bar during the intro (cls
  `mission intro`) and is gone before stage 0, so timed first stages start on a clear screen; no
  stage timer changed (§9.4 item 2, §11.7).
- r1 audio-ui-meters: `UPPDRAG KLART!` is hidden when the outro starts (§9.4 item 5); banners are
  `width: max-content` (the end card's quote on one line) and fade where they stood (§11.7).
- r1 audio-ui-meters: the porter's bribe line plays before the hideout banner, the officer's
  "¡Documentación!" after the 1.8 s ¡MULTA! (§7.2); `skandal` checks the bribe order (§16.4).
- r1 audio-ui-meters: after a pursuit the music returns to a mission's tune (`vals`, `jul`) or the
  level tune read at the end; grisfest `onEnd` uses `g.levelTune()` (a chosen `samba` survives)
  (§7.2, §8.12, §12.2; fixture).
- r1 audio-ui-meters: peseta amounts in banners and the Ole-pays toast use `pta()` thin-space
  thousands (`+2 000 pesetas`, `1 500`) (§7.2, §11.5).
- r1 audio-ui-meters: the PANIK fail text says how to avoid it: `Stig-Helmer fick panik! Håll J:
  ”Jag kan flyga, jag är inte rädd.”` (§5.9, §11.5).
- r1 audio-ui-meters: the objective card slides out of view under the letterbox (in-stage talks)
  (§11.4).
- r1 audio-ui-meters: big-map labels keep clear of the giver's "!" and the objective star (§11.6).
- r1 audio-ui-meters: all Luckiest Guy text is uppercase: mission titles on banners and the
  objective card, dialogue names and big-map labels uppercased in hud.js; the title subtitle, pause
  buttons and keycaps as uppercase literals (§1.3, §11.1, §11.3, §11.4).
- r1 flight-missions: gate stage 0 places Berra in the security queue behind Stig (`gateArch`
  −0.4, −2.8), so "Kolla terroristen!" comes from the shot; his men's-room exit to the lounge is the
  scene's `doneCue` (the `place` cue on "Nej, vem fan gör det?" emptied the frame as the punchline
  started) (§8.1, fixture).
- r1 flight-missions: cabin landmark `row22Cam` (0, −9.2, π); Berra's lines in the sprit intro and
  outro and the landning outro cut to it (`{ at: 'row22Cam', dist: 0, height: 3.6 }`, `cut: null`
  on the next line not at row 22): they were spoken off screen from 12–13 m away (§5.5, §8.4, §8.5,
  fixture).
- r1 flight-missions: Ole outfit `flygRadio` (`flyg` + `held: 'boombox'`) by cue on the sprit
  outro's first line, so the boombox the outro is about is there; a seated character holds a boombox
  on his lap, speakers to the front (it hung into the next seat) (§2.2, §8.4, models.js, fixture).
- r1 flight-missions: the juice cup goes up on Ole's "Ja." (6 s), not on the press, as in the film
  (§8.3, fixture).
- r1 flight-missions: landning stage 0 `startCue` adds `seatbelt: true`: a retry (no intro) ran the
  round-up with the sign dark (§8.5, fixture).
- r1 flight-missions: texts: gate stage 1 `Gå till Ole vid gate 8` (it said "Sätt dig", the seat
  prompt's verb, with nothing to sit on); juice carry `Bär juicen till 14B – gå, spring inte!` (one
  second of sprinting spills it); the takeoff timeline's bar is `STARTEN` (labelled `FLYGRÄDSLA` it
  read as the fear meter) (§8.1–8.3, fixture).
- r1 flight-missions: Ole's barks work at the gate: `Det blir nok litt luftlommer underveis. Helt
  normalt!` [N] and `Concorde flyr tre ganger så fort som en geværkule!` [F*]; Angerud's "varm
  middag" chatter is gone (no meal at the gate or before takeoff; the row-6 trolley stop keeps it)
  (§14.10).
- r1 flight-missions: source tags: `(t)` on "Vad ska de göra?", "Vad är det för ljud?" and "Hva er
  det for et merke du har?" (the speakers are our reading); `[F*]` on Ole's "Kræsj." (our bokmål echo)
  and Berra's "Robban! Sulan har varit…" (adds "Robban!") (§8.1, §8.2, fixture).
- r1 flight-missions: `story` takes key-scene shots of missions 1–5 with `SHOTS=1` (`fl_*.png`, as
  the island's `isl_*`) (§16.4).
- r1 island-staging: buss17 intro: the first line cuts to a group shot of the arrivals crowd
  (`airport`, dist −10, height 3.2) and places Lasse, Stig and Robban (Stig stood between the camera
  and Lasse) (§8.6, fixture).
- r1 island-staging: buss17 outro: Ole off the camera-to-Stig line (−1.4, 4.4); from "havsutsikt" on
  the outro plays in room 107 (new cut anchor `rum107Cam`): Stig in the doorway, the porter's mirror
  beside him, Ole at his boombox; the cut holds to the end (§6.3, §8.6, fixture).
- r1 island-staging: friskotek outro: everyone who speaks in one group shot (`outroPlace` with yaws,
  `outroCam` friskotek 6/2.4); Berra, Robban and Ole spoke from 60–86 m away (§8.7, fixture).
- r1 island-staging: asnan outro: Carmencita and Angerud face the street; the Viking Bar cut 6.5/3.4
  sees over a car parked at the door; Stig is placed out of the shot (§8.8, fixture).
- r1 island-staging: bodega: the vischan scene has `exitCar` (Stig steps out; seated, the shot saw the
  car roof); "Hytt två!" is the new portrait-only `telefonist`'s (§2.1, §2.3, RADIO_ONLY), Angerud
  at the booths; the sisters face the pool cut (§8.9, fixture).
- r1 island-staging: ropavieja: Mamma faces her cut, 5 m out and 1.9 m up (the 9 m cut stood in the
  Casa Lola pergola); Siv's line returns to the two-shot; the pool sisters face each other (§8.10).
- r1 island-staging: fataga: the stall scene is shot from the square (new cut anchor `dukarCam`,
  everyone at the stall); the outro places everyone at the fold (§6.3, §8.11, fixture).
- r1 island-staging: grisfest: "sette blomster" (bokmål); the dance places Stig on the calibrate Tonga
  start (`approachSpot('dansgolv')` within 0.2 m, so `grisfestTonga` keeps its T_ref) and the four in
  a row; the Tonga scene is a street shot (`cam` tongatonga 6/2.6); the porter outro a fixed desk
  camera (new cut anchor `recepcionCam`) with side-on placement; Angerud curses on his 113 patio;
  Siv is hidden for the warm-nights cut (§8.12, fixture).
- r1 island-staging: julafton: the knock cuts to room 107 (`rum107Cam` 7.5/2.1) with Ole, Stig on his
  approach spot (the collect start the calibrate assumes) and the man from the airport; the porter
  speaks the Spaniards' "De där svenskarna är heltokiga!" from the party's side (was `pax`); Siv's
  silent beat carries the ambulance caption (was the PA); the duet outro holds the Rio four
  (`outroPlace` + `outroCam` now in the literal) (§8.13, fixture).
- r1 island-staging: source tags: `(t)` where the research leaves the speaker open (§8.6, §8.8–§8.10,
  §8.12); `[F*]` on Ole's "…18 norske kroner.", the relocated pickup barks and Lasse's fenor line;
  `[F*](t)` on Herr Storch's "Lite film." chatter (§10.1, §14.10).
- r1 island-staging: "Shipped staging beyond the literals" trimmed (the staging is in the §8
  literals and the fixture now); the story arrives at Tonga Tonga 9.5 m short of the club, as from
  the street, and parks 6 m short of the Viking Bar door (`tools/story/island.mjs`).
- r1 island-flow: checkpoints with `retryCar` where a failure replayed a whole mission (§8.8, §8.9,
  §8.11, §8.12, fixture): asnan's SKICK drive retries in the Centro Nórdico lot with Ole aboard (it
  replayed the haggle, which pays 200 again); bodega's jeep chase is a checkpoint, so a failed chase
  or drive home retries the chase from the farm gate in a fresh pig truck with Berra and Robban;
  fataga's sheep retry on the pavement by the bus stop (the calibrate start).
- r1 island-flow: grisfest: the plates, the dance and the Tonga drive (now a checkpoint itself, so
  a failure does not replay the dance) retry at the dance floor with the car parked at the race
  finish (`retryCar` `park`, the calibrate Tonga start); the carry is a checkpoint retrying in the
  Flamenco lot aisle (§8.12, fixture).
- r1 island-flow: `runner.lastCar` is the car the player last drove in the mission, kept while he is
  on foot and across a retry (the retry's car becomes it): a plates failure found no car and put a
  spare on top of the hire car parked at the finish (§9.4 item 3; runner.js, spine's file).
- r1 island-flow: grisfest dusk: stage 2 cues `sunset` (it went straight to night at the hotel), the
  race `night` (§8.12, §13.3, fixture).
- r1 island-flow: texts: the plates `Porslinskross! Sparka sönder tallrikarna (J) medan bandet
  spelar` (only a kick or a stomp breaks them); julafton's round-up `Samla ihop gästerna till
  julfesten – ta bilen!` (the timer is measured by car) (§8.12, §8.13, fixture).
- r1 island-flow: the fixture's bodega home stage uses the literal `timer: (g, m) =>
  homeTimer(m.data.wreck)` (it had 30), so `fullstory` runs the function-timer path.
- r1 island-flow: `calibrate` jeep chase autopilot: the unstick state lives in the chase (the route
  controller re-built every 1.2 s reset it and cut each reverse short), a repeat within 6 s backs up
  longer with the wheel the other way, and after backing out it follows the road for 2.5 s; wedged
  chases get a shot (`jeep_wedged_k`) and results log `unsticks`. 40 chases, none wedged (baseline
  3 of 5): p75 30.6 s → jeep timer **37** (was 42; §8 table, §8.9, island.js, fixture).
- r1 repair: a scene cutting a `collect` guest's bubbles takes the bubble down at the HUD
  (`game.unsay` → `hud.unsay`; §9.2, §14 Game API, hud contract): the empty `say` it used (spine)
  met audio-ui-meters' minimum reading time and left an empty bubble with a tail over the speaker
  for 1 s (0.5 s in test mode) at the start of the julafton party shot, and held the mantra
  auto-bubble back. `game.say` with an empty text or `secs <= 0` is an unsay. `kinds` asserts it
  frame-exact 3 frames into the scene (it failed on the old code: an empty bubble live).
- r1 repair: `castsheet` expects 34 `CHARS` keys with portraits (island-staging's portrait-only
  `telefonist`; §17 row 19 says 34).
- r1 repair: timer statistics for random stages (§8 "Timers and difficulty", §16.4): `pct` and
  `timerRange` (a fixed-seed bootstrap of the timer, 2000 resamples) live in tools/lib.mjs;
  `calibrate`'s `CAL CHECK` (jeep, balls, sheep, flowers, plates) and `calibflight`'s new
  `CALF CHECK sprit[0]` say whether the shipped timer is inside the sample's 90 % range. A random
  stage's shipped timer comes from a pooled sample: the gate's single samples gave 31 / 42 / 18
  against shipped 32 / 37 / 22.
- r1 repair: the `calibflight` sprit sweeper waited out the trolley in the nearest free row (row 8,
  3 m back) until it had passed 1.6 m beyond it: behind the serve stops at rows 3, 6 and 9 that was
  up to 18 s, while the last bottle rolled past him (`DEBUG_SPRIT=1` trace). The stage measured
  bimodal (4–12 s or 28–30 s), and one sample's p75 ranged 11.7–14.4 s (90 % range of the timer
  18–39 over 32 runs). The sweeper now waits in the aisle 2.4 m from a moving trolley (1.7 m from
  a stopped one) for the bottles the roll rule pushes out from under it, and steps into a free row
  only in turbulence; a new check fails a run that is bowled over or falls. 48 clean runs:
  3.8–6.4 s, p75 6.0 + 2.5 → sprit timer **11** (was 22; 90 % range 11–11; §8 table, §8.4,
  flight.js, fixture). The 20 s turbulence cue now lies past the timer (§8.4 "Open").
- r1 repair: jeep timer **40** (was 37; §8 table, "Races and chases", §8.9, island.js, fixture):
  island-flow's 40 chases (p75 30.6) and three more runs of 20 on the same code (the gate's 34.2,
  r1 repair's 34.1 and 30.4) pool to 98 usable chases, p75 32.5 s → ceil(1.2 × 32.5) = 40 (90 %
  range 37–42). 2 of 100 lost the truck after 2–3 unsticks (excluded, as wedges are).
- r1 repair: `carsVsPeople` (main.js; §14 "main.js carsVsPeople") counts the car's own speed into
  a person, not the relative speed: walking or sprinting into a parked car knocked Stig flat as if
  run over (a probe: sprinting and walking into a parked hatch, both `down` before, neither after).
  That was the `calibrate` balls flake: the walker, pathing round static solids only, kept running
  into a parked car in the SunTrip car park, was flung each time and "got stuck" (world-town's run
  11 and r1 repair's, both at (15.9, −59)).
- r1 repair: the `calibrate` on-foot walker plans round stopped cars (under 1.5 m/s, within 30 m:
  `footPath(…, cars)`, and the straight-line `clear` test), as a player walks round a parked car;
  car routes (`footPath` for a car's footprint off the road) are unchanged.
- r1 repair: friskotek balls timer **33** (was 32; §8 table, §8.7, island.js, fixture): 72 runs on
  the final code (walker round stopped cars, the new car rule): median 19.5, p75 23.1 + 3 → 26.1 →
  ceil(1.25 × 26.1) = 33 (90 % range 31–35; 12 more runs with the old car rule and the new walker,
  0 knock-overs, give 33 too). The old walker's 84 runs this round (world-town, the gate, r1
  repair: median 22.1, p75 25.9 → 37) were slower by 2.9 s at the median (Mann-Whitney z 3.3),
  with only 1 knock-over in the 12 that counted them: most of the time went on running into and
  round parked cars the walker did not plan for (the friskotek lawn borders the SunTrip car park).
  That, not the bench, was the "drift" world-town reported.
- r1 repair 2: the raw-sample ledger `notes/calibration-samples.md` and `tools/pool.mjs` (§8
  "Timers and difficulty", §14 file table, README, CLAUDE.md). Every run of a random stage goes in
  raw (date, code, autopilot version, env, every time, every exclusion and why); a stage's timer is
  the rule on its current pool, and pools only join samples on the same stage and autopilot code.
  `node tools/pool.mjs` re-derives n, median, p75, T_ref, the timer and the 90 % range (it
  reproduces gate 2's balls pool: 20 runs, p75 29.40 → 41, 34–47). Seeded with gate 2's samples;
  repair 1's, gate 1's, island-flow's and Phase 2's runs are listed as lost, not poolable.
- r1 repair 2: the `calibrate` on-foot walker (`walker-r1r2`; §16.4). Gate 2's B1 (the sheep
  walker gave up at the tomato-field wall, `calibrate` FAIL) did not recur in 24 old-walker runs
  and re-enactments; the traces showed three defects, all fixed: (1) **pacing**: the route index
  advanced only within 0.7 m of a cell, so it fell behind and the walker ran back and forth round
  its aim window's end for 2–3 s at a time (about 40 % of a traced sheep chase; plates walked
  200 m for a 147 m tour); now it moves on to the nearest next cell it can walk straight to;
  (2) **progress was the straight line to the target**, so a detour round a wall counted as
  stalling; now progress is measured along the route (12 s without 1 m of it, or 30 s without
  getting 1 m closer along the route, is stuck; the 2 s stall re-plan uses the same measure);
  (3) **`footPath`'s A* failed round large obstacles**: its Float32Array costs let equal paths
  "better" each other by rounding, cells were expanded 3–4 times, and from Hotel Flamenco's north
  side to the pool deck 160000 expansions ran out and the part path led into the hotel's back wall
  (two flowers runs stuck); now float64 costs and a real improvement only (4057 expansions), exact
  √2 diagonals, jumps ordered by their full cost, stale entries not counted, and a walker in a spot
  the grid cannot leave backs out along its trail. It also re-plans at once on a new target and
  keeps a target until another is 1 m nearer. A better player, so faster: its samples start new
  pools, and the old walker's (gate 2, Phase 2, repair 1) do not pool with them.
- r1 repair 2: on-foot timers from the fixed walker's pools (§8 table, §8.7, §8.11, §8.12,
  island.js, fixture): friskotek balls **24** (was 33; p75 15.59 of 44 + 3; range 22–25), fataga
  sheep **27** (was 42; p75 18.53 of 32 + 3; range 25–31), grisfest flowers **26** (was 42; p75
  17.79 of 32 + 2.5; range 25–28), grisfest plates **33** (was 45; median 20.77 of 20 + 5). The
  pools hold the three 12-run measurement batches (balls; two for sheep and flowers; one 8-run
  batch for the plates) and the two default check runs of this repair.
- r1 repair 2: the plates are a deterministic stage in `calibrate` (a fixed layout of 12 stacks;
  §8 table, §16.4): T_ref = the median + 0.5 s × 10, `PLATE_RUNS` (default 6), no bootstrap range,
  checked like a deterministic stage (shipped ≥ T_ref). It was the p75 of 2 runs, which a single
  37.9 s run could fail.
- r1 repair 2: jeep timer **42** (was 40; §8 table, "Races and chases", §8.9, island.js,
  fixture): 83 usable chases kept raw (gate 2's 22, two new `JEEP_RUNS=20` runs and the two default
  `calibrate` check runs, all on the same chase code), p75 34.45 → ceil(41.34) = 42 (range 37–48).
  The 98 chases behind 40 were lost, and "ceil(1.2 × 32.5) = 40" was 39 at the shown precision
  (gate 2, N1).
- r1 repair 2: the default `calibrate` run (`FOOT_RUNS` 4, `JEEP_RUNS` 12, `PLATE_RUNS` 6, about
  35 min) is a regression check, not the measurement of a random timer (§8, §16.4, calibrate.mjs
  header; gate 2 N5): the pools hold at least 24 runs on foot (36 for the balls) and 40 jeep chases.
- r1 repair 2: the fixed walker also walks the on-foot legs of two deterministic stages, so they
  were re-measured (`CAL=tonga,guests RUNS=9`, 8 runs each; §8 table, §8.12, §8.13, island.js,
  fixture): grisfest Tonga **19** (was 23; walk 3.9 s for 33 m instead of 6.3–6.5 s for 44–45 m,
  + 0.5 + drive 11.4: T_ref 15.8, median of 12 clean with the check runs) and julafton guests
  **81** (was 87; the walk to the hire car 3.5 s for 30 m instead of 8.3–8.4 s for 50 m, every
  drive leg unchanged: T_ref 67.4, median of 11 clean with the check runs). The default run's 2 guests runs (67.1, and 81.7 with a 14.5 s
  traffic hold-up) and buss17's (49.7 with a 7.1 s hold-up, 44.8; the route is unchanged) show why
  a deterministic drive is measured over more than two runs.
- r2 spine: a frozen player car (dialogue, fail screen, `frozenT`, PANIK, `freezeCar`) brakes only
  while rolling forward and holds on the handbrake (§14.3, under `game.frozenT`): brake 1 read as
  reverse below 0.5 m/s, and every car but the bus crept back to −0.35 × top speed (the night race
  start: 22 m back over the zebra, 45 km/h in reverse by "1"). `calibrate`'s autopilot already
  parked through the countdown, so the measured race margins stand (§8 "Races and chases").
- r2 spine: R in the flight level (§3, §4.3): in the cabin, back into the aisle at the same row
  (`cabinRow14` was a free 14B for ombord's and landning's seat dashes and a jump over the sprit
  sweep); in the terminal, `gateLounge` unless it is nearer the running stage's target than the
  player is (then R does nothing: the toilet dash, the queue goto). `resetSpot` may return a spot
  or `null`; `resetPlayer()` returns whether it moved him, and only then spills a carry.
- r2 spine: a checkpoint retry shows the toast `Försök igen!` (`S.retryToast`, §11.5) with the
  `start` jingle, no banner (§9.4 item 3): the 2 s mid-screen title covered Stig and the aisle for
  2 of ombord's 7 s and the dance floor while the plates ran.
- r2 spine: `goto` with `inCar` or a `passenger`, the player on foot: the marker is
  `runner.lastCar` while it is alive and in the world (§9.2), not Ole beside him (asnan s5) or the
  club (grisfest's Tonga drive).
- r2 spine: the haggle talks turn seller and partner to face each other before the two-shot
  (§9.2 haggle staging): the seller's back was to the lens on all seven of his lines; settled, all
  13 lines now show both in profile (0.15).
- r2 spine: "Bärra hem Berra!" (`carry` with `who`): Berra lies across Stig's raised hands, body
  along Stig's right, his middle over Stig (rotation (0, yaw, π/2), the root half a body to the
  left, y = p.y + height); yaw + π/2 had laid him along Stig's forward, sticking out of his face.
- r2 spine: the giver's "!" hides within 5.5 m of the camera in the flight level (un-bobbed
  spot), and its beam fades out between 8 and 4 m from the eye while the giver is in the cabin
  (§5.3; `Bang.fadeBeam`).
- r2 spine: `frame`'s dollhouse frames two speakers who face the same way along the line between
  them (within 35°) from in front along that facing (§5.3). The line audit of the whole story
  (280 lines) has no line on this branch; on the real jet-bridge walk the outro's three now face
  the lens (0.97–1.0; before −0.18, 0.62, 0.66).
- r2 spine: the Rio end card's deck offsets (§11.7): one row across rioCam's view at one depth,
  couples together (Siv, Ole, Majsan, Stig from the left); Majsan was half behind Ole.
- r2 island-camera: camera ceilings count by the sight line (§14.7 `ceilingHit`): the eye stays
  under one when the line from the pivot passes through it (the eye in it, or the roof between the
  eye and the player), not whenever it is within 1.5 m or the player is under it; in cars too, where
  the eye stops 0.45 m short of it (or stays under it with no room, or the car under it).
- r2 island-camera: the chase eye keeps a 0.45 m disc off every solid (`discPush`, §14.5), not
  0.45 m along the sight line; capped under a low ceiling with no room behind him it slides
  sideways to 2.6 m from the pivot instead of sitting over his head.
- r2 island-camera: new camera ceilings (§14.7 list): the whole pool-bar thatch, Flamenco's rooms
  107/113 + patio strip + south balcony row, its north galleries and back-door canopy, every straw
  parasol, SunTrip's courtyard balcony rows, Centro Nórdico's two street awnings, each `lagenhet`
  slab's entrance canopy, first balcony row and café awning, the grisfest pergolas, the Fataga fold
  shelter, the golf veranda, the show bungalow's awning, the marina's reed terrace.
- r2 island-camera: Flamenco's eight ground-floor terracotta piers are solid (0.6 × 0.32 m, §6.3):
  the eye stood behind one in room 107's doorway. No mission places anyone there; no timed route
  runs along the façade.
- r2 island-camera: `HOTEL FLAMENCO · RECEPCIÓN` stands on a panel above the porch fascia and the
  Christmas garland runs across the fascia's face (it hung under it, in the capped eye's way); Casa
  Lola's eave bougainvillea sits above the pergola cap; Flamenco's back-wall air-con units are 0.4 m
  deep; the road banners hang at 7.8–9.2 m, over the bus chase eye (§6.3, §6.4).
- r2 world: the plaza's north row keeps to x −19…29, clear of the west row on its west end: 12
  arches from x −18.6 to 28.6, the five shops re-laid with each sign centred in an arch, the
  upper windows over the arch centres, the three arcade café tables at x −17…−10 (two arches,
  `CAFETERÍA EL SOL` and two tables with parasols were inside the west row; §6.3).
- r2 world: the Flamenco and SunTrip parking signs are a `P` plate (1.2 × 0.8) over a name strip
  (1.2 × 0.3) on a post that stops under them (§6.3).
- r2 world: in-world signs are uppercase and Spanish or Swedish (§1.3): `DET ÄR EN KYRKA.` (was
  mixed case in Luckiest Guy), `TASCA LOS AMIGOS` (was the English `PUB LOS AMIGOS`, `[N]`).
- r2 world: big visual-only hip-roof dunes beyond the west bound opposite the dyner blocks (two
  rows, crests 7.5–17 m, slip faces towards the town; §6.4); no collider, route or timer changes.
- r2 world: the Rio card's five band busts stand in one row across the end card's view, and the
  maracas are held before the chest (§6.3): two busts stood behind the others and the maracas at
  head height read as earmuffs.
- r2 cabin-flight: every hanging cabin sign (both galley signs, both seatbelt signs, both `TOALETT`
  signs with their `UPPTAGET` lamps now hanging under them at ±0.8) turns about the vertical to
  face the render camera each frame, replacing the galley signs' two-way flip; `FRÄMRE BYSSAN` at
  y 2.4 (clears the curtain rail), `BAKRE BYSSAN` at z −18.45 capped at ±0.6 rad (§5.3).
- r2 cabin-flight: a phase change without `instant` blends the flight palette over 1.5 s (into
  climb) or 2 s (`stepPalette`, §5.6); tests that park a phase call `applyPalette()` to snap.
- r2 cabin-flight: no snow over the cabin at any height (was only below y 2.7; §5.6).
- r2 cabin-flight: no lounge busts at the east end of the front chair row (the arch two-shot's
  corner face); the lounge clock's rim is behind its face, with hands at 9.05 (§5.2).
- r2 cabin-flight: the aisle coins stop at z −10.0; the two at −11.8 and −13.6 (in the `row22Cam`
  cut) moved to the leg room of dodge rows 3 and 18; still 24 (§5.2).
- r2 cabin-flight: `cabin.skipRowSixBark()`; juice stage 2's `rowSixComplaint` calls it, so Angerud
  opens the complaint once (§5.12, §8.3).
- r2 cabin-flight: optional palette field `cloudRim` (town clouds' outline): day `0x6f9ccc`, night
  `0x101433`, sunset `0xa0605a` (§13.3).
- r2 flight-missions: fixed eye-level cuts for the mission scenes the dollhouse could not frame
  (§5.3, new §5.5 landmarks `queueCam statsCam bridgeCam doorCam galleyCam`), each with its
  speakers placed: the gate intro in the landside pocket (Ole and Stig across it, §8.1), Ole's
  statistics (Stig on the measured dash start; a player from the arch had José's head across the
  frame), the jet-bridge outro (Stig and Majsan across the tube, Siv between them, looking up to
  `GATE 8`; `bridgeQueue1/2` removed), the ombord intro at the open front door (forward of the
  galley curtain, whose rail at y 2.24 crossed every face from the aisle; §8.2) and the landning
  stewardess at the front galley (§8.5). The men's-room scene turns Stig to Berra (§8.1 [5]).
- r2 flight-missions: the gate dash's guide (`via` in missions/flight.js, new landmark
  `herrtoaGang`): the beacon and arrow lead past the middle bench row and up the corridor to the
  men's door, then in (§8.1 [3]); R in the terminal judges the waypoint's `goal` (§3). An
  arrow-follower failed 2 of 2 (pinned on the door jamb) and now arrives in 3.9 s. No timer change
  (`calibflight` gate: 3.6 s sprint, 5.1 s walk, fear 69 → 94).
- r2 flight-missions: ombord's seat dash starts from the intro's spot by the door (1.6, 13.55):
  re-measured 3.1 s (walk 4.4), T_ref 5.1, timer still 7 (§8 table).
- r2 flight-missions: landning's round-up has no turbulence cue (it fired on the frame its 12 s
  timer failed; §8.5); its measured times are unchanged.
- r2 flight-missions: three cabin coins out of the `galleyCam` view (the aisle line starts at z
  9.8; the front galley's two and the line's first moved to dodge-row leg room); still 24 (§5.2).
- r2 flight-missions: tags (§1.4): Ole's "Eneste svenske byene…" is `[F](t)` (§8.2); the five
  flight mission titles carry `// title [F*]` / `// title [N]`.
- r2 flight-missions: sprit's turbulence moved inside the sweep (`timedCues [[1.5, {turbulence:
  [0.5, 3]}], [8, PA]]`: warned at 1.5 s, shaking 3–6 s; it sat at 20 s, past the 11 s timer). The
  `calibflight` sweeper holds Space only while it shakes, not through the warning (§16.4).
  `FLIGHT=sprit SPRIT_RUNS=36`: 36 clean sweeps 5.5–7.8 s, median 7.4, p75 7.6 → T_ref 10.1 →
  timer **13** (was 11; 90 % range 13–13); FLYGRÄDSLA peaks 12–17 (§8 table, §8.4, fixture).
- r2 island-staging: asnan's paint scene plays both lines over the FERRETERÍA cut (Stig's `cut:
  null` dropped; §8.8, fixture): the seated two-shot it returned to framed neither speaker.
- r2 island-staging: the bodega outro places Stig beside Berra and Robban, side-on and off the
  `bodega` cut's line (`outroPlace.stig`; §8.9, fixture): the 8 m rule put his back in front of
  Berra.
- r2 island-staging: the friskotek intro cuts to the outro's group shot from Siv's line, everyone
  who speaks placed for it and Ole beside the Storchs, held to the end (§8.7, fixture): Fru Storch
  spoke off screen with her back to the lens. The balls now start from Stig's placed spot with the
  cast standing elsewhere: a new pool, `CAL=balls FOOT_RUNS=12` ×3, 36 runs 5.98–20.83 s, median
  13.59, p75 15.29 → T_ref 18.29 → timer **23** (was 24; 90 % range 22–24; §8 table, §8.7,
  island.js, fixture, ledger).
- r2 island-staging: the fataga outro is a fixed group shot from the fold side (`outroCam: { at:
  'fatagaFold', dist: -7, height: 2.3 }`, Stig placed side-on at the right; §8.11, fixture): Majsan
  was half out of frame on her own line, and Siv out of the shot.
- r2 island-staging: the bodega intro steps Robban back to the counter behind Berra's shoulder (a
  `place` on the first line; §8.9, fixture): beside him, Robban covered Berra on all four of his
  lines.
- r2 island-staging: the vischan scene stands Stig, Berra and Robban on the track by the `CAMINO
  SIN ASFALTAR` sign, shot from the new cut anchor `vischanCam` (§6.3 table, Appendix A) looking
  back at the road (§8.9 s6, fixture).
- r2 island-staging: a stage decorator `parkCar(stage, spot)` in missions/island.js (not a kind
  option; the fixture keeps the scene literals) parks the player's car on a fixed spot at a
  scene's init, out of its fixed camera, wherever he stopped inside the stage radius. Unnamed
  parked cars there make room. It is used for the vischan scene, the car on the track behind the
  camera nose to the road, and for Tonga Tonga, the car in the lot beside Berra behind the camera;
  a bus parked there had covered the lens (§8.9 s6, §8.12 s7). The follow's start is unchanged
  (`CAL=follow` in band); nothing after Tonga Tonga is timed.
- r2 island-staging: tags (§1.4, film-4). "Kan ni dela rum?" is `[F*](t)`. "Till brudparet…", the
  vischan radio pair, Siv's two José lines, "Nej, bara de inte går på tur…" and the julfest PA
  line carry `(t)`. The §8.13 bodega chatter is `[F*]`. The eight island titles carry `// title
  [F*]`; "Julafton bland palmerna" is `// title [N]`.
- r2 island-flow: film radio lines a successful run now hears (§8.6, §8.9, §8.10, fixture; no
  timer touched). buss17's twelve lines re-spaced to 3–37 s (were 4–63.5 s against a 45 s clean
  drive; the åksjuka exchange that sets up the ÅKSJUKA bar never played): 12 of 12 heard at 44.8 s.
  The grisbil and José follows' second and third lines carry `{gap: 4.5}` (8, 12.5, 17 s inside the
  ≈ 21 s tail; the third was due at 28 s): 3 of 3.
- r2 island-flow: the rollerskier moved where the vischan drive passes him: `eslovVag` (27.5, 24,
  0), the Eslöv lane's south end facing the z −120 road (§6.3; was (28, 4) mid-lane, 33 m off the
  route), and the overhear's r 25 → 40: "Heja Eslöv!" / "Herre jävlar!" start 2.8–4.6 s before
  the stop, both heard 2 of 2 (§8.9 s4, fixture). `CAL=vischan`: 25.4 s ×3, timer 31 unchanged.
- r2 island-flow: checkpoints on asnan's haggle (`retryAt: 'asnestand'`: on foot at the stall, the
  car where he parked it, Ole steps up again; a first go wins ≈ 53 %) and bodega's timed vischan
  drive (`retryAt: 'playa'`, `retryCar` at the calibrate start (0, 236, yaw 0) with Berra beside
  and Robban in the back). Both used to restart the mission at `def.at` (§8.8 s4, §8.9 s4,
  fixture).
- r2 island-flow: grisfest's stage 2 takes the hire car (`getInCar({ car: 'hyrbil', any: false,
  atHome: true, … 'Hoppa in i hyrbilen – det börjar skymma' })`), the sedan the race is measured
  with, and the race's checkpoint carries `retryCar` (the hire car again, not the kind's spare
  hatch). Bus 17 (left at the Flamenco drive since mission 6), a van or the ice-cream van could not
  win. `CAL=race`: sedan clean won by 2.0 / 1.6 s, one crash lost by 2.3 / 2.5 s; `RACE_CAR=hatch`:
  won by 2.8 s ×2, lost by 1.1 s ×2 (§8 "Races and chases", §8.12, fixture, story scripts).
- r2 island-flow: after the end, a `null` unlock home hides the NPC (main.js `key in
  homeOverrides`; a falsy override was ignored) and an unlock's `chatter` replaces free-roam
  CHATTER (`chatterOverrides`). `UNLOCKS.bodega` hides Angerud (the ambulance took him; he stood
  chatting at the Viking Bar) and gives Berra "Robban! Jag hittade Pepes Bodega!" and Robban "Pepes
  Bodega. Glöm aldrig det, du." (both `[F*]`) instead of their looking-for-it lines (§8.13, §10.3).
- r2 island-flow: ombord's seat dash has a guide, `via(sit(…), ['cabinRow1', 'cabinRow14'], 0.5)`:
  the aisle at row 1 (new cabin landmark `cabinRow1` (0, 12.6), §5.5), down it past the stowers,
  then 14B, the `calibflight` route. An arrow-follower stuck on row 1's seats for all 7 s (2 of 2);
  now it sits down in 3.1 s (2 of 2). `via` takes a pass radius (default 1.5, the gate dash; 0.5
  in the aisle, where 1.5 m cut the corner into a seat). `FLIGHT=ombord calibflight` 3.1 / 4.4 s,
  timer 7 unchanged (§8.1 [3], §8.2 [0]).
- r2 island-flow: tools. `story` with `SHOTS=1` slows the dialogue in every island script (a `FROM`
  reload reset it, and `FROM=11 TO=13 SHOTS=1 story` failed), and `shotWhen` takes `before`, the
  stage at which a wait gives up, in both story files: a missed "Heia Norge!" had blocked 60 s and
  run the 19 s Tonga drive out four times. `skandal`'s officer check polls up to 10 s for 3 m of
  closing without a stuck teleport: from behind a building he first walks to a block corner, and
  from inside the market block closed 3 m only after 5.3–6.7 s (it failed ~1 run in 3 at 1.5 s)
  (§16.4).
- r2 voices-ui-cast: barks by speaker. `Game.bark(ch, kind)` picks Ole's bokmål tables
  (`OUCH_OLE`, `GETUP_OLE`, `NPC_KICKED_OLE`), the local ones for `LOCAL_CAST` (José, his family,
  the porter, the lost-property boy, the souvenir seller, the cleaner, the pig farmer, the grisfest
  host, the telephonist) and local pedestrians (`OUCH_LOCAL`, `GETUP_LOCAL`, `CARJACK_LOCAL`,
  `NPC_KICKED_LOCAL`: Spanish exclamations), else the Swedish tourists' tables, all new lines
  `[N]` but two relocated Ole lines `[F*]`. Ole had said "Va fan, Stig-Helmer!" and "Det är sista
  gången jag åker med SunTrip!", and the porter complained about the fuel surcharge.
  `¡Ay, mi madre!`, `Turister!` and `¡Ladrón!` moved out of the tourist tables; the tourists'
  "Va fan, Stig-Helmer!" is now "Va fan håller du på med?" (strangers and the gate crowd do not
  know his name). `reboard` gives Ole `S.neverLeaveOle` "Ikke kjør fra meg igjen!" (§1.3, §1.4,
  §6.7, §11.5, §14.3, §14.9, §14.10).
- r2 voices-ui-cast: the toast column moves under a wide banner while it shows (cls `wide`,
  `--banner-drop`; §11.4, §11.7): ¡GUARDIA CIVIL! and UPPDRAG KLART! covered the radio toasts'
  portraits and names by ~3 900 / 4 660 px² at 1280×720; now 0.
- r2 voices-ui-cast: speech bubbles anchor at the real head top (`root.localToWorld(0, headTop,
  0)`) with the tail tip 6 px above it (§11.4). The tail tip was 113 px over Stig's head in 14B,
  134 px over him in a sedan and 39–55 px on foot; now 2–6 px.
- r2 voices-ui-cast: the objective timer rounds up (`ceil`, red at ≤ 0:10; §11.4): a 6 s stage read
  0:05 at its start and its last second read 0:00.
- r2 voices-ui-cast: the grisbil's back two pigs stand across the bed snout to snout, inside the
  rack (§6.6); facing aft, their heads and snouts stuck ~0.2 m out over the tailgate and into the
  bed-rider slots.
- r2 voices-ui-cast: a seated character still taller than the room at fitScale's 0.72 floor sits
  lower by the rest, so no head passes roofY (§6.6): Stig's cowlick stood 7 cm out of a van's roof
  and 1 cm out of the Guardia jeep's (and 2 cm under a sedan's roof top).
- r2 voices-ui-cast: new anim flag `cupHeld`, the `cup` prop in the right hand (raised seated,
  held out standing): Stig's "Ja." in juice (§8.3 cue, fixture) and the trolley stewardess's
  serving stops (§5.8). `cupUp` stays the empty-handed arm of the luggage stowers and the juice
  carry (§14.6, Appendix A; `castsheet` shows `vardinna2 cupHeld`).
- r2 gate (orchestrator): the gate's raw runs and 12 more flowers runs on ca2a3a6 went into
  `notes/calibration-samples.md`. friskotek balls **24** (was 23): island-staging's 36 runs plus the
  gate's 4 give p75 15.41 → ceil(1.25 × 18.41 = 23.01) (§8 table, §8.7, island.js, fixture).
  grisfest flowers **23** (was 26): the round-2 world (the Flamenco piers solid since 46a0938) starts
  a new pool `walker-r1r2/46a0938`, 28 runs, median 13.32, p75 15.73 → ceil(1.25 × 18.23) (§8 table,
  §8.12, island.js, fixture).
- r3 flight-flow: landning [1] "Tillbaka till 14B" gets the guide `via(sit(…), ['cabinRow14'], 0.5)`
  (§8.5, §5.5): aimed straight at 14B, an arrow-follower wedged on row 11's or row 16's seats and
  failed 6 of 6 from the three round-up ends; on the guide it sits in 0.9–2.2 s
  (6 of 6) and 0.4 s from the retry. No timer change.
- r3 flight-flow: `interact`'s `seat` and `mantra`'s `seated` are also the stage's `seat` (§5.10,
  §9.2, §8.3, §8.5): from the aisle at row 14 "E Sätt dig" offered 14C in juice's call-button
  stage (and in landning's approach), and E then alternated between standing and 14C while the
  objective said 14B.
- r3 flight-flow: the gate's untimed queue [6] and boarding [8] get guides (§8.1):
  `via(goto(…), ['herrtoaDoor', 'damtoaDoor'])` and `via(goto(…), ['bridgeMouth'])`, new landmark
  `bridgeMouth` (15.5, 14.7) in front of the jet bridge's opening (§5.5, Appendix A). The arrow
  aimed through the men's room wall and into the window wall north of the bridge, pinning an
  arrow-follower for 60 s each; on the guides 5 of 5 and 6 of 6 starts arrive.
- r3 flight-flow: `via` aims at the furthest point of its chain the player is on his way to (nearer
  it than the point before it is, or within `pass` of that point) with a clear line to it
  (`segmentBlocked`), re-derived every frame (§8.1 [3]; review R2): its forward-only index aimed
  through the benches after a PANIK sent Stig back to Ole mid-dash, and the plain "nearer" rule
  skipped a door from a room's far corner. The dash (3.6 s, 3 of 3) and ombord's seat dash (3.1 s,
  2 of 2) are unchanged.
- r3 flight-flow: FLYGRÄDSLA's idle decay and its delay pause in a scene (dialogue, cinematic,
  cut; shame.js, §5.9, §8 "FLYGRÄDSLA"): a player who read Ole's statistics at 20 chars/s started
  the gate dash at 57 (25 at 12 chars/s), arrived at 85 and never panicked as a dawdler; now 70 at
  any pace. `calibflight` takes `DIALOG_CPS` (§16.4); at 55 and at 20 chars/s it passes with the
  same gate numbers (70 → 95.6 sprint, 99.4 walk, dawdler PANIK at 5.2 s).
- r3 flight-flow: R in the terminal (§3, §4.3, §11.5, README; review R3): an untimed stage always
  goes to the lounge; the toilet dash to the lounge or Ole's spot, whichever is not nearer the men's
  room than he is, else nothing with the toast `Inte härifrån!` (`S.resetNone`). It did nothing,
  silently, whenever the lounge was nearer the target (the queue, boarding, to Ole), and R is the
  flight level's only way out of a wedge. main.js loses the duplicate comment above `resetPlayer`.
- r3 flight-flow: a retry turns the camera with the player (§9.4 item 3; r3 playtest-2): to the
  retry spot's yaw, then on foot both turn to the started stage's guide. The camera kept the yaw it
  had at the fail, and the spots faced their landmark: ombord's seat dash faced the cockpit door,
  sprit's sweep the rear galley (180° from the bottles), landning's 14B dash row 16's seats and
  grisfest's Tonga walk away from the car. 13 on-foot retries checked: 0° between camera, player
  and guide; the gate's statistics retry keeps the spot's yaw (a scene).
- r3 flight-flow: wording (review R4, gate N7): the sprit pool is n 56 (r2's 36 + 5, the r2 gate's
  5, this round's 10 on the same stage and sweeper code; p75 7.60 → 13, §8 table, §8.4, flight.js
  header, `notes/calibration-samples.md`), and `calibflight`'s ombord row names its real start, the
  intro's spot at the front door.
- r3 flight-look: the objective Beacon in the flight level (§5.3; r3flight-7, r3text-1): its beam
  fades between 8 and 4 m of horizontal eye distance while the target is inside the cabin
  (`Beacon.fadeBeam`, the giver's rule; main's `nearFade` serves both), and its arrow is hidden in
  the whole flight level. At ombord's seat-dash start the first waypoint's beam washed ~40 % of the
  frame yellow and the arrow was a block clipped by the top edge (90 000–227 000 px² at 1280×720;
  beyond ~7 m it was above the frame at every gate and cabin stage start). The GuideArrow stays: the
  critics' "guide arrow block" was the Beacon's arrow (their probe hid it for one frame, and
  `updateMarkers` showed it again before the screenshot), and a 5.5 m rule would have hidden the
  guide arrow in the whole flight level (it is 3.9–4.8 m from the eye there).
- r3 flight-look: TURBULENS! during a mission stage is a toast (cls `alert`, §5.7 step 1, §11.4;
  r3flight-6), not the mid-screen banner that covered Stig and the sprit aisle for 1.2 s of the
  13 s sweep (round 2 moved the turbulence inside it); and `Håll i dig!` wins over the seat and
  toilet prompts while the cabin shakes and he stands without holding on (the "E Sätt dig" of every
  free seat replaced it in the sprit sweep and the juice carry).
- r3 flight-look: the gate's Stork joke / bodega tip scene [7] is staged (§8.1, §5.5, Appendix A,
  fixture; r3flight-5): Berra, Robban and Sulan in an arc, Stig side-on at the left, a fixed cut
  from the new landmark `loungeCam` (24.4, 13.8, yaw −0.6, height 1.9). Unplaced, Stig stood
  between the open-floor two-shot and the speakers (Sulan's face behind his head on his four
  lines), or an arrow-follower walked into the cluster and the shot looked across the security area
  with the speakers 29–34 px tall; now every arrival gives the same shot (86–126 px, facing
  0.62–1.0, nothing in front). Boarding from Stig's spot: 6.3 s walking, 4.4 s sprinting.
- r3 flight-look: speech-bubble tails point at the speaker (§11.4; voices-ui-cast follow-up): a
  stacked bubble (or one held on screen at an edge) gets a longer, slanted tail (cls `lead`, CSS
  vars `--tx --tl --ta`) that runs behind the older bubble below (`#bubbles` isolated, older
  bubbles on top). The plain tail of a stacked bubble ended 43–72 px above its speaker's head;
  now 9 px, as an unstacked one. Under a wide banner with the speedo up only the newest two toasts
  show: a third reached 13–35 px into the speedo at 1280×720.
- r3 flight-look: a timed stage that starts after the intro or after a framed dialogue (a scene,
  interact lines) turns him and the camera to its guide on foot (§9.4 item 2; `runner.faceGuide()`,
  shared with the retry, item 3; flight-flow follow-up): the camera kept its yaw from before the
  dialogue, and the first gate dash started 168° off its route, ombord's seat dash 121°, grisfest's
  flowers 179° and the Tonga drive 160°; now 0° (10–26° where `routeAim` leads along the road).
  No position changes and the autopilots set the camera themselves: `calibflight` measures the
  same timers (gate 3.6 → 6, ombord 3.1 → 7, sprit inside 13, landning 7.6 → 12 and 3.2 → 5); its
  5 sprit sweeps join the pool (n 61, p75 7.60 → still 13; §8 table, §8.4, flight.js header,
  `notes/calibration-samples.md`).
- r3 island-staging: the pool and porch giver intros get a fixed shot from the first line, held to
  the end of the intro (§8.8, §8.10, §8.11, §8.12, fixture; r3staging-1, -4): ropavieja and fataga
  place the sisters side by side half turned to the lens, Stig facing them, cut `{ at:
  'flamencoPool', dist: 5.5, height: 2.1 }` (the giver two-shot followed the arrival and placed
  nobody else: the second sister spoke with her back to the lens or behind the other from three of
  six sides); asnan and grisfest place Ole and Stig under the pergola, cut `{ at: 'flamenco', dist:
  6, height: 2.2 }` (walking straight from the spawn to Ole, the two-shot's eye stood 0.9 m from the
  un-collided porch post, 15–30 % of the frame). Grisfest's Stig stands on `approachSpot('flamenco')`
  (−4, −9.5), the `calibrate` flowers start, so the flowers pool and timer stand.
- r3 island-staging: asnan's Viking Bar outro is one `outroCam` shot of the bar front (§8.8,
  fixture; r3staging-2): Stig hands the package in side-on to Carmencita on the spot where Angerud
  stands later, Angerud is hidden until his own line (he stood between them before "Senare samma
  dag…"), and the last line's `cut: null` is gone (it would release the outroCam).
- r3 island-staging: ropavieja's "…mamma följde med?" is cut from the plaza side of the table,
  `{ at: 'grillpaco', dist: −7, height: 2.2 }`, Mamma turned to the table (`outroPlace` yaw π)
  (§8.10, fixture; r3staging-3): José was at the frame's left edge with his back to the lens.
- r3 island-staging: room 113's Siv at `['rum113', 0.9, 3.0]`, off the lens axis (§8.13 stage 4,
  fixture; r3staging-5): straight behind Angerud only her hair showed on her line.
- r3 island-staging: new landmark `tongaSlump` (−143.7, −62.6, yaw 0.5) = `tongatonga` offset
  (−2.3, 0.6) for Berra in the Tonga Tonga scene and his pickup (§8.12 stages 7–8, §6.3 table,
  Appendix A, fixture; r3staging-6): at `tongaLot` he lay behind the camera on the lines about
  carrying him. Untimed stages only.
- r3 island-staging: the bodega pig-truck follow is a checkpoint, `retryAt: 'vischan'`, `retryCar:
  { at: { x: −234, z: −143, yaw: 0 } }` (§8.9 stage 7, fixture; r3play-1): losing the truck or
  wrecking it before getting in retried the 31 s timed vischan drive, the dropoff and the hitch
  scene; now he is back at the wheel of his car on the track where the scene parked it, the truck
  on its lane spot. Untimed stage, no timer.
- r3 island-staging: the end card (§11.7, §9.4 item 8, §10.3, §8.13 "After the outro"; r3text-2,
  -4): `playEndCard` drops every toast and turns every `ANIM_FLAGS` pose off on the four on deck
  (the duet's `wings` ran into the Rio card), and the last mission's unlock holds its toast
  (`game.unlock(name, { holdToast: true })`, applied and saved as before) until the card is over:
  "Pepes Bodega har öppnat – på baksidan av hotellet." lay over the Rio shot and was gone before the
  pool; now it shows under the completion banner.
- r3 island-staging: barks by speaker get a fourth class, `STAFF_CAST` (Lasse, Affe, Gabbe, the
  bungalow seller) with `OUCH_STAFF` (`Aj!`, `Hoppsan!`, `Det ingår inte i mina åtaganden!` [F*])
  for `ouch` (§14.10; r3text-3): run over, the platschef threatened to talk to the platschef, and
  SunTrip's own staff swore off SunTrip and the fuel surcharge.
- r3 island-camera: the side slide is continuous (§14.5; r3island-1, a regression of r2 islandA-4 a):
  it triggers when a ceiling caps the eye or hangs within 0.5 m above it and the eye is nearer the
  pivot than `SIDE` (was: capped and nearer than `ARM` − 0.05, so a capped eye 1.6–2.6 m out sat
  against his back); the lateral offset lives in the rig (`cam.slide`), eases in at `SLIDE_IN` 12/s
  and out at `SLIDE_K` 6/s, keeps its side unless the other has `SLIDE_HYST` 0.5 m more room, and is
  cut each frame to the room each side has; a snap moves the eye's height only down. Real-input walks
  (ts 1) under every island ceiling, out of them and along them (the r3 island critic's `jitter`):
  one-frame eye jumps over 1 m in 140 of 604 walks → 1 (a 1.03 m drop under the SUPERMERCADO awning,
  the same before: the cap snaps the eye down when a pole pulls it in at once), sideways jumps over
  0.5 m in 139 walks → 0, the largest move otherwise 0.67 m; on ordinary sidewalks none before or
  after (96 walks); frames with the eye within 1.5 m of the head 532 in 68 walks → 406 in 17 (the 242
  walks run on both). The chase-camera sweep (16 blocks):
  eye in a collider 0 → 0, eye inside a mesh 94 → 78, player hidden 1004 → 805; cars 0 → 0, 34 → 34,
  456 → 426.
- r3 island-camera: camera ceilings over every café parasol (`cafeTable` with `parasol`) and every
  standing `parasoll` prop (§14.7, §6.8; r3island-5): the El Patio, La Medina and Viking Bar terrace
  tables hid a player at them from the 3.47 m eye. The props' ceilings are `underOnly` (they count
  only with him under one or the eye in one: walking past a beach row the sight-line rule would pump
  the eye down and up) and carry the prop's `block` (gone while it is smashed); `ceilingHit` and
  `ceilingOver` skip a dead one. The `parasoll` canopy is raised from a 1.72 to a 2.07 m rim (top
  2.2 → 2.55): at 1.72 it cut through his head from either side of it. No collider, route or timer
  changes (the pole stays r 0.25).
- r3 island-camera: Fataga's six north crags get the mesh's widest section as a collider, a box
  0.85·sx × 0.53·sz along the long axis besides `rock()`'s circle (§6.3; r3island-2): the 1 m circle
  let the player 2–3 m into the 4–7 m rocks (2.8–5.5 m² of rock taller than 1 m per crag outside any
  solid → 0.6–1.3 m² of slivers at most 0.3 m deep), and under the fold's shelter the chase eye ended
  inside the rock (the sweep's Fataga eye-inside 17 → 3, hidden 172 → 82). The sheep run there: a new
  pool, `CAL=balls,sheep FOOT_RUNS=12` ×3, 36 runs 10.22–29.52 s, median 15.82, p75 18.80 → fataga
  sheep **28** (was 27; range 25–29; §8 table, §8.11 s5, island.js, fixture,
  `notes/calibration-samples.md`).
- r3 island-camera: the plaza north row's shop names stand on 3.5 × 0.8 m boards on the arcade's front
  above each arch's crown, two lines where needed (§6.3; r3island-3): the 5.6–6.6 m signs on the shop
  wall at 3.62 hung behind 3.93 m arches and read "CAF…", "…MERA", "…CAMBIO".
- r3 island-camera: the friskotek notice board is solid along its 2.2 m (§6.3; r3island-4): with only
  its posts solid he walked through it and the eye, capped under the wing's balconies, stood behind it
  with the board filling the frame. The balls lawn's edge: a new pool, 36 runs 7.20–20.93 s, median
  13.40, p75 15.56 → friskotek balls **24** (unchanged; range 22–25).
- r3 island-camera: the `MERCADILLO · MARKNAD` entrance board hangs at 3.85–4.95 (was 2.35–3.45, at
  the chase eye's height; §6.3; r3island-6); its legs and their colliders stay where they were.
- r3 island-camera: Casa Lola's string lights hang from the cross beams' underside (3.08) with a 0.15
  sag, the lowest bulb at 2.72, and the pergola's camera ceiling is under 2.72 (cap 2.42; was 2.9 /
  2.6 under lights sagging to 2.44, a bulb over his head; §6.3, §14.7; r3island-7).
- r3 island-camera: the SKANDAL officer's route (§7.2; shame.js `planOfficer`, a consequence of the
  solid crags): one box between him and the player is rounded by its corners (`cornerDetour`), and
  the street route's kerb point moves along the street to one that sees the player. With the crags
  solid, `skandal`'s "behind a building" check failed (deterministically: he went out to the north
  kerb, where the crag stood between him and the player, and needed about 10 s; on 302d4c2 he took
  about 7 s by walking through the rock); now he rounds the house in 4 s. `skandal`, `CAL=pursuit`
  (the car escape: clean 2 of 3 escaped, one crash 0 of 3) pass.
- r3 flight-trolley: landning's round-up and 14B dash have the trolley **parked** in the front galley
  (`trolley: 'park'` on stage 1's `startCue` and on the intro's galleyCam line, whose cut hides the
  move; new `cabin.parkTrolley()`, a `stopTrolley` at `trolleyPark`; §5.8, §8.5, §9.3; r3user-1, the
  user's own play). `trolley: false` froze it where the intro had caught the auto trolley: mid-aisle,
  trolley and pusher walled off Herr Storch or José and Berra, and the round-up failed on every retry
  (a probe: caught on its way to row 19, z −6.5, Stig stuck at −4.9, failed twice). Rule: no stage uses
  `trolley: false`. `transitionTo` parks it through the same call. No timer changes: `calibflight`
  now logs the trolley, and the shipped measurement had it frozen at z 15.7 in the front galley
  (round-up 7.62 / 6.9 s, back to 14B 1.3 / 3.2 s, as before).
- r3 flight-trolley: a checkpoint retry re-applies the ambient cue fields on the retried run's fresh
  `m`, after the teleport (§9.4 item 3; runner.js `retry`): under the failed run's `m`, a manual
  trolley mode fell back to auto at once, so landning's retried 14B dash had the trolley set off from
  the galley (16.2 → 12.1 in 4 s). `trolley` checks both (the park, the retry).
- r3 flight-trolley: two full `calibflight` runs' 10 sprit sweeps join the pool (same stage and
  sweeper code): n 71, 5.40–7.80 s, median 7.40, p75 7.60 → still **13** (90 % range 13–13; §8
  table, §8.4, flight.js header, `notes/calibration-samples.md` r3ft-C1/C2).
- r3 repair-flight: `via`'s **over-the-furniture pass** (§8.1 [3]; missions/flight.js; RF-1, the
  flight-flow verifier's two regressions): when none of the points he is on his way to is in clear
  sight, the guide aims at the furthest one he is nearer than the point before it is, with a line
  clear of walls only (feet + 2.0 m), and falls back to the first point only when he is on his way
  to none (the PANIK case stays fixed: after a PANIK from the corridor the target is `herrtoaGang`).
  r3's fallback to the first point whenever the clear line failed aimed ombord's 7 s seat dash at
  row 1 from a seat row's legroom (rows 3 and 12 past a stower, row 15 one row too far) and turned the
  queue's arrow back to the men's door north of the back bench row. The verifier's proposal (keep
  last frame's index) was measured on the same walks and left the queue's arrow on the ladies' door
  all the way to the GATE 8 desk and on the men's door for a walk west from it; `pass` is left out
  of the furniture pass (with it the dash's arrow-follower clipped the middle bench's end, 3.8 s for
  3.6). Grids, walks and
  arrow-followers in §8.1 [3], [6] and §8.2 [0]; no timer moves (the autopilots walk their own
  waypoints). Known issue: where he is on his way to none of the points (the lounge's north and
  south ends, the window column) the queue still aims at the men's door.
- r3 repair-flight: the stage's seat reaches **2.0 m level with its row** (`cabin.bestSeat`, the seat
  interactable's `r` 1.6 → 2.0; §5.10; RF-2, r3flight-2's other half): from the D half of the aisle at
  row 14 (x ≤ −0.2) E offered 14D and "Res dig" put him back there; now 14B from every aisle spot and
  facing (x 0.45 to −0.4), and the juice gag follows. `cabin` checks it.
- r3 repair-flight: common stage option **`retryFear`** (§9.2, §9.4 item 3; runner.js, kinds/core.js
  `COMMON`) on the gate's statistics checkpoint (§8.1 [2], the fixture too; RF-3, r3flight-4's retry
  half): a retry gives back the meter the stage first started at, so the retried dash starts at the
  first attempt's ≈ 70 with the heartbeat on (it started at 48 and a dawdler could not panic).
  Measured: real play at 20 chars/s 70.2 → retried 70.3, and the dawdler panics again; `calibflight`
  (default and `FLIGHT=gate DIALOG_CPS=20`) checks the dawdler's retry within 2 of the first attempt
  (70.4 / 70.1 and 70.0 / 70.2). First attempts unchanged (gate 70.1–70.3 → sprint 95.7–95.8, walk
  99.3–99.6, dawdler PANIK at 5.2 s).
- r3 repair-flight: a full `calibflight` run's 5 sprit sweeps join the pool (same stage and sweeper
  code): n 76, 5.40–7.80 s, median 7.36, p75 7.60 → still **13** (90 % range 13–13; §8 table, §8.4,
  flight.js header, `notes/calibration-samples.md` r3rf-C).
- r3 repair-island-staging: asnan's Viking Bar gag no longer spoiled in play (§8.8, §9.4 item 5;
  island.js, runner.js, fixture; RS-1, r3staging-2's residual): Angerud's home is the bar door,
  1.1 m from Stig's outro spot, so he stood there while the car pulled up, through the walk-up to the
  door and, re-placed by `complete()`'s `placeNpcs(true)`, beside Stig through the 1.6 s UPPDRAG
  KLART! wait. The paint drive (stage 9, the checkpoint) hides him in its `startCue`, three blocks
  from the bar (a retry hides him again), and the new def field **`outroHide: ['angerud']`** keeps
  him hidden after `complete()`'s placement until his own line places him; the first outro line's
  `hide` is gone (the field does its job). Measured at ts 1, two parking spots, one with a failed and
  retried paint drive: hidden at the drive's start, through the walk-up and the banner, shown again
  on the fail screen and hidden on the retry; the outro lines unchanged (Stig 58 px, facing −0.06;
  Angerud 51 px, 0.99). The drive ends 7 m from `vikingbar` and he stood 2.2 m from it, so the car
  could never reach him: the timer stands (checked: `CAL=asnan RUNS=3 calibrate` 15.5 / 18.2 /
  15.5 s, T_ref 15.5 → 19 as shipped). The `missions` data checks resolve `outroHide`.
- r3 repair-island-staging: julafton's party: the porter at `['flamencoPool', -6, 0.5, -π/4]` (was
  −7; §8.13 stage 3, island.js, fixture; RS-2, a regression from island-camera's 2.07 m parasol
  canopy): on "De där svenskarna är heltokiga!" the canopy's edge crossed his face (3 of 5 rays);
  now he stands left of the parasol, face clear (line audit: 35 px, facing 0.95, no occluder; no
  line of missions 7–12 worse). An untimed scene: no timer moves.
- r3 repair-island-camera: the side slide **swaps sides in a cut** and eases only within one side
  (§14.5; camera.js; RC-1, the island-camera verifier's regression: the eased offset passed through 0,
  so turning the camera under a low ceiling with a wall near put the eye through his head). The side
  is kept unless the other has `SLIDE_HYST` 0.5 m more room, or more room than this side once this
  side has collapsed (0.3 m or less, or new `SLIDE_CUT` 0.5 m less than the slide this frame: the
  clamp would drop the eye towards his head); a swap sets the slide straight to the other side's
  target and snaps the eye. A **wedged** eye (0.1 m or more behind the pivot, the slid eye nearer
  than `ARM`: the back of the fold between its wall and crag 1's west end) slides from the pivot
  instead when that takes it further out. One camera turn (16 px/frame, the verifier's `rotsweep`)
  at 456 ceiling spots: frames with the eye within 1.0 m of his head 1 (302d4c2) → 1212 at 291 spots
  (08c1104) → **15 at 1 spot** (the fold's NW pocket, below); spots under 0.7 m 0 → 185 → 1; within
  1.5 m 2463 → 4265 → 1686; one-frame jumps over 1 m 2669 → 1571 → 1871. The walk fix stands: the
  `jitter` walks under every island ceiling (672) keep 1 jump over 1 m (the SUPERMERCADO drop, as
  before) and 0 sideways jumps; streets (96) unchanged; the 68 walk-ins and 292 walk-outs unchanged
  but for the café walk below. No collider or route changes: no timer moves.
- r3 repair-island-camera: a slide that **starts as the eye is cut in** by more than 1 m relative to
  him (new `cam.lpx/lpy/lpz`, last frame's pivot) starts at its target (§14.5; RC-2): walking east
  under the plaza arcade, a `parasoll` canopy started to cap the eye as he walked under it and the
  eased-in slide held the eye 0.52 m from his head for 2 frames (now 1.47 m, the climb he starts in;
  302d4c2 1.40); turning at a straw parasol's edge as its pole pulled the eye in left one frame at
  0.75 m (18 spots; now none). Measured relative to him: on an absolute test a collision push that
  moved him 1 m in a frame cut the eye in at the SunTrip balcony rows (4 new sideways jumps).
- r3 repair-island-camera: known issue: in the fold's NW pocket (local (−20, −27.94), the back wall
  0.36 m north, crag 1's west end 0.9 m east) with the camera looking SW, every spot behind or beside
  him is within 0.5 m of a solid, so the eye sits 0.37–0.97 m from his head over about 30° of yaw (on
  302d4c2 it stood inside the rock). The close band outside the slide's trigger (r3island-1's second
  half: `tonga_arcade` 1.72 m, the eye on the 1.6 m `ARM` under La Medina's 3.6 m arcade; the
  `sweepnear` low eyes within 1.8 m, 58 / 129 / 61 / 10 / 89 / 63 in six blocks, 0–1 under a ceiling
  within 0.5 m) is Bigmouth's arm, not a low ceiling: unchanged.
- r3 ledger: r3 gate 1's raw runs (on ea6c96a) are in `notes/calibration-samples.md` (`r3g1-D`,
  `r3g1-C`), one row per stage, every time in run order; only julafton's run with an impact is left
  out. The repair commits after ea6c96a change no pooled stage's code, world, actors or autopilot,
  so each row joins the pool its stage was in on ea6c96a (per stage in the ledger and the report);
  for the flowers that is a new pool (below).
- r3 ledger: grisfest flowers **26** (was 23; §8 table, §8.12 stage 1 and the intro's note,
  island.js, fixture). r3 island-staging's porch intro places Ole 1.6 m beside Stig's start (he
  stood on the landmark in front of it): a change to the actors, so a new pool
  `walker-r1r2/r3-island-staging`: r3 gate 1's 4 runs (outside the shipped 23's range, gate N1),
  three `CAL=flowers FOOT_RUNS=12` batches and the default run's 4 on the final code. n 44,
  6.53–23.85 s, median 16.22, p75 18.24 → ceil(1.25 × 20.74) = 26 (90 % range 25–27; at n 40 it
  was 27). The start, the world and the spawns are unchanged (a probe on ca2a3a6 and on 6d5b919:
  the same start (−4, −9.5), the same reachable spawn cells, the same simulated nearest-first tour,
  median 120.8 / 120.5 m), and so is the walker's speed: the new pool matches the round-1 world's
  (`walker-r1r2/d9451f8`, median 16.18 → 26), and the round-2 pool's 28 runs (median 13.32 → 23)
  were the short side.
- r3 ledger: fataga sheep **27** (was 28) and the bodega jeep **41** (was 42): the rule on their
  current pools with the r3 gate's and r3 ledger's default runs. Sheep `walker-r1r2/r3-island-camera`
  n 44, p75 18.40 → ceil(1.25 × 21.40) = 27 (90 % range 26–29); jeep `chase-r1if/d9451f8` n 119,
  median 27.98, p75 34.05 → ceil(1.2 × 34.05) = 41 (37–44) (§8 table, the jeep paragraph of "Races
  and chases", §8.9 stage 9, §8.11 stage 5, island.js, fixture).
- r3 ledger: stale pool text re-synced with `node tools/pool.mjs` (r3 gate N2): balls n 44 (still
  24), plates n 38 (33), Tonga 18 clean runs (19), julafton 15 clean runs, median 67.3 (81), sprit
  n 86, median 7.31 (13), in the §8 table, the island.js TIMERS comments, the flight.js header and
  the ledger's Current-pool lines (Tonga's and julafton's now carry their numbers).
- r3 repair2-island-camera: the side slide **holds its side** `SLIDE_HOLD` 0.3 s (`cam.slideT`) before
  the other side may take over with `SLIDE_HYST` more room; sooner only once this side has collapsed:
  0.3 m or less, or cut this frame by more than `SLIDE_CUT` (now 0.2 m, a room sample; was 0.5) so
  far that the slid eye would come within new `NEAR` 1.2 m (level) of the pivot, with `SLIDE_HYST`/2
  more room on the other side (§14.5; camera.js; verifier 2's regression 2 and review 2's R2). In the
  1.3 m slot between the friskotek and its notice board (block 3,2, local (−22.2, 4)) the collapse
  rule fired both ways and the eye cut from shoulder to shoulder 4 frames apart (3.8–5.0 m); on any
  cut by 0.5 m it also cut 3 m to the other shoulder for 0.1 m more room. Rapid swaps (two within 15
  frames) in the verifier's 114 named-spot turns 7 → **0** (302d4c2 has no slide state); out-and-back
  flicks there 61 → 41 (302d4c2 33); one turn at all 507 ceiling spots (456 shared with 302d4c2):
  one-frame jumps over 1 m 1876 → **1867** (302d4c2 2666), flicks 42 → **33** (37), rapid 0, frames
  with the eye within 1.0 m of his head 15 at 1 spot → 15 at 1 (the fold's NW pocket, unchanged).
- r3 repair2-island-camera: the **wedged** eye stays wedged `SLIDE_HOLD` and then until the slid eye
  would be `ARM` + 0.3 m out, and keeps its side unless the other has `SLIDE_HYST` more room or this
  one 0.3 m or less (`cam.wedged`, `cam.wedgeT`; §14.5; verifier 2's regression 1). Under the fold's
  shelter (local (−20, −26.7)) the bare test toggled frame to frame as the camera turned (the room is
  sampled every 0.25 m): 3–4 cuts out to the side view and back per turn, 18 in 6 turns. Now 1 in 6
  (at 16 px/frame: the cut out to the side view and, 8 frames later, the swap to the other shoulder,
  not back), 0 in the slow, steep turns (3 before); a distance band alone left a slow turn going in
  and out twice, as the pull-in's 0.25 m steps moved the eye's base.
- r3 repair2-island-camera: a slide that starts under 0.3 m (was: exactly 0) as the eye is cut in
  starts at its target, and a growing slide whose eased eye would come within new `CLOSE` 1.0 m of
  the pivot where its target's would not goes straight to its target (§14.5; verifier 2's regression
  3, the strafe residual of r3 island-camera). Strafing along the island's canopies (184 walks) the
  eye came within 1.0 m of his head 6 frames at 5 walks (lagenhet canopies x −266.2 / −25.9, La
  Medina's arcade, the bungalow awning (160, −248): a slide of 0.01 / −0.16 missed the cut-in test, and
  the awning's cap dropped the eye 0.95 m and the slide eased in) → **0** (min 0.72 → 1.11 m;
  302d4c2 0, 1.37). At `NEAR` the same rule turned the eased slide into 2.6 m sideways cuts walking
  under the SunTrip balcony rows and out from under the porch roof at (−64, −239), with the eye
  1.1–1.2 m over his head.
- r3 repair2-island-camera: kept, on the final code: the walk fix (the `jitter` walks under every
  island ceiling, 672: 1 jump over 1 m, the SUPERMERCADO drop, as before; 0 sideways jumps), the 68
  walk-ins (identical; the arcade café's `arcadecafe_y90` 1.47 m) and the 16 café-table walk-ins,
  walk + turn (376 walks: eye within 1.0 m 0 frames, as before; flicks 127 → 124), the reverse turn
  (253 spots: 0 frames within 1.0 m; flicks 15 → 14) and the slow, steep one (67 spots: flicks 13 →
  10). No collider, route or autopilot changed and the camera offset does not steer the walker: no
  timer moves. Known issues: the fold's NW pocket as before (15 frames within 1 m per fast turn, 39 per
  slow one); at the notice board the eye still goes in and out as the sight line crosses the board's
  posts (flicks 18 in 6 turns there, 302d4c2 8), and with the hold the right shoulder is kept at
  1.16–1.26 m from his head where it used to cut across behind the board; on a slow turn the other
  way (6 px/frame, not in the verifier's set) the eye can still take the other side (cut in from far
  out, or at the hold's end) 8–11 frames before that side collapses: two cuts (HEAD none there; 2
  rapid pairs in 38 slow turns, 0 in the verifier's 114).
- r3 repair2-flight: `via` leads **onto the route first** (§8.1 [3], §8.2 [0]; missions/flight.js;
  verifier 2's regressions 1 and 2 of r3 repair-flight): when the over-the-furniture pass picks a
  waypoint (not the stage's own target), the arrow first aims at the nearest point of the leg into it,
  if that is more than 0.3 m off and in clear sight from his hip (in a seat row's legroom the aisle
  beside him; between the middle and back bench rows the corridor at his own z), then along the chain.
  Over the seat backs at row 14, an arrow-follower in the forward rows' A/B legroom slid along the
  seat back ahead and stalled on its aisle end; over the back bench at the men's door, one wedged on
  the bench's east end (7.08 s for the 6 s dash, from (23, 17)). Measured (ts 1): ombord's 72
  legroom cells (rows 1–12, both sides, three seat columns) stalls of 1 s or more 13 → 0, mean 3.05 →
  1.74 s, max 7.43 → 3.08 s, none slower; the verifier's 44 cells 9 → 0; the dash's 31 cells mean
  3.83 → 3.13 s, (23, 17) 7.08 → 2.98 s, every cell faster than r3's rule too. The queue, boarding
  and landning [1] grids, the PANIK aim and the followers from the stage starts are unchanged (dash
  3.62 s, seat dash 3.1 s, queue 5.7–6.5 s, boarding 3.9–4.9 s, landning's 14B 0.4–2.2 s). Row 1's
  door corner (a known issue of r3 repair) is gone: the arrow points into the aisle there. The
  verifier's proposal, (0.25, his z) in the cabin when |x| > 0.45, is the same aim in the cabin; the
  leg point is its general form and also covers the terminal. No timer moves (the arrow is a guide;
  the `calibflight` autopilots walk their own waypoints): on the final code gate 3.6 s → 6 (walk
  5.12, the dawdler's PANIK at 5.2 s, retry 70.4 for 70.1), ombord 3.1 / 4.42 s → 7, landning 7.6 /
  6.9 s → 12 and 1.3 / 3.22 s → 5.
- r3 repair2-island-staging: the **fail screen keeps the checkpoint stage's `startCue.hide`** (§9.4
  item 3, §8.8 stage 9; runner.js `fail()`; verifier 2's regression r3v2-staging-1 of r3
  repair-island-staging): `fail()` hides those keys again right after `cleanupMission()`'s
  `placeNpcs(true)`, in the same frame, so the fail screen shows what the retry will; Q's
  `placeNpcs(true)` puts them home. asnan's paint drive is the only checkpoint stage with a `hide`:
  with its timer run out 17 m from the bar (ts 1, the real drive and route), Angerud was `normal` at
  his door 23 m from the lens beside Carmencita under "Tiden är ute!" from the fail on; now he stays
  `hidden` through the fail screen (+0/150/600/1200 ms), is hidden on E's retry (the drive done again,
  14.9 s, hidden out of the car and through the banner; his outro lines unchanged), and Q puts him
  back at the door (`normal`, (−178, −63), not busy). A SKICK fail takes the same path. The fail
  screen only: no timer moves.
- r3 ledger2: r3 gate 2's raw runs (on 4887ede: `r3g2-D`, its default `calibrate`; `r3g2-C`, its
  default `calibflight`), the default `calibflight` of the verify2 of r3 repair-flight (4887ede,
  `r3v2-C`) and r3 repair2-flight's (`r3rf2-C`) are in `notes/calibration-samples.md`, every time in
  run order; gate 2's jeep run 5 is excluded as a lost truck (48.71 s, 823 m driven, 3 unsticks), not
  a wedge. Pool decisions: none of b014460 (camera.js, the side slide; `cam.yaw` untouched), bf50e87
  (flight.js `via`'s leg point; the sprit sweep has no `via`) and cd39361 (runner.js `fail()`
  re-hides a checkpoint stage's `startCue` hides; asnan stage 9 only) changes a pooled stage's code,
  world, actors or autopilot, so every row joins its stage's current pool. No new calibration run.
- r3 ledger2: by the rule on the current pools (gate 2 N1), friskotek balls **23** (was 24;
  `walker-r1r2/r3-island-camera` n 48, median 13.32, p75 15.34 → ceil(1.25 × 18.34) = 23, range
  22–25) and fataga sheep **28** (was 27; its pool `walker-r1r2/r3-island-camera` n 48, median 16.32,
  p75 18.80 → ceil(1.25 × 21.80) = 28, range 26–30) (§8 table, §8.7 s1, §8.11 s5, island.js TIMERS,
  fixture, ledger). Gate 2's n 4 sample moved both (balls 10.05 12.32 11.67 9.78, sheep 23.10 15.90
  23.12 18.07); the sheep pool has gone 28 → 27 → 28 over the last two default runs. The other pools
  keep their timers: flowers 26 (n 48), jeep 41 (n 130, median 28.00, range 38–43), sprit 13 (n 101,
  median 7.32), plates 33 (n 44), Tonga 19 (n 20), julafton 81 (n 17, median 67.40).
- r3 ledger2: stale pool text re-synced with `node tools/pool.mjs` (gate 2 N2, review 2 R1): §8.4's
  sprit paragraph (it said 76 sweeps, median 7.36: now 101, 7.32, every sample named), the julafton
  row ("15 clean runs … and one held up 14.5 s by traffic, 81.7" read as 16: now "17 clean runs,
  67.0–81.7", the held-up run one of them), the §8 table's n and medians, the jeep paragraph of
  "Races and chases", the island.js TIMERS comments and the flight.js header (101 sweeps).
- r3 ledger2: `calibrate`'s `CAL TABLE` jeep row labels a lost truck "(truck lost, excluded)" where it
  said "(wedged, excluded)" (gate 2 N5; tools/scenarios/calibrate.mjs): still excluded as before;
  nothing measured or pooled changes, and the walker and chase code are untouched.
- r3 ledger2: **Phase 3's sampling is closed** (2026-10-11): every run made up to here is pooled, and
  the ledger says so above its stage tables. The balls and sheep pools sit on a rounding boundary and
  flip with an n 4 sample, so no further default run feeds them before the tag. The pools stay open:
  every future run goes in, and a timer follows its pool.
- r3 docs: the summary at the top of this changelog (the three rounds, every Phase 3 timer change
  with its reason) and §15.4's outcome paragraph (rounds, how they ran, the tags, where the reports
  and the known issues are).
- r3 docs: stale text against the code (the r3 completeness critic's doc gaps, checked at 9b4044d;
  its pool-count gaps 5 and 6 were already fixed by r3 ledger and ledger2): the header line no longer
  calls `src/` an unchanged Bigmouth copy; the §8 "FLYGRÄDSLA" paragraph labels its Phase 2 numbers
  as superseded by the Phase 3 r3 ones and adds `retryFear`'s retried start (70.0–70.5 for
  70.1–70.2) and the r3 gates' walkers (99.3–99.6); the missions/flight.js FLYGRÄDSLA header comment
  (comment only) says ombord's careless PANIK at t 21.7 (was 21.5), landning's held-J peaks by
  reading pace (~18–20 at 55 chars/s, ~25–27 at 20), the walker's 99.3–99.6 and the retry.
- r3 docs: CLAUDE.md (build status Phases 0–3 at `phase3`, the Phase 3 reports, the tags
  `phase2-docs`, `phase3-r1`, `phase3-r2`, `phase3`; Phase 3's conventions: camera ceilings by sight
  line and the side slide, the ledger's pool rule and boundary pools, `via` guides and `faceGuide`,
  `trolley: 'park'`, `retryFear` / `outroHide` / the fail screen's re-hide, the disk check);
  HANDOFF.md rewritten as the post-Phase-3 hand-off (state and tags, where to read, Phase 3's
  workflow lessons, §4 the deduplicated known issues with where and severity, the marker rules that
  replaced "`main.camNear` hides markers within 3 m", §6 met at `phase3`); README (R in the terminal:
  the lounge or Ole's spot during the dash, else "Inte härifrån!"; E/Q after a fail; the guide
  markers and the turbulence prompt; measured timers; the telephonist; the code map's ledger, pool
  tool, HANDOFF and build reports). No code, timer, fixture or ledger change.

## Changelog (user decisions, 2026-10-14)

- The repo has a remote: `origin` = `git@github.com:Ran4/charter_and_run.git` (SSH; it was the
  HTTPS URL). Push only when the user asks. Supersedes 2026-10-04's "never push".
