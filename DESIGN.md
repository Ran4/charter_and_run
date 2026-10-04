# CHARTER & RUN — Design bible and module contracts

*Fan-made Simpsons: Hit & Run-style three.js game based on* Sällskapsresan *(1980). Folder:
`charter_and_run__sallskapsresan/`, built on a copy of Bigmouth & Run (`src/`, unchanged so far).*

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

Any film line used in a CHATTER / OUCH / GETUP / CARJACK / NPC_KICKED / OLE_STATS table, or as a
sign, outside its own film scene is `[F*]` (relocated), never plain `[F]`.

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
it (in the film the stewardess brings it); the luggage stowers blocking the aisle; Stig-Helmer
driving SunTrip bus 17 (in the film Lasse ends up taking the transfer); "Plocka kulor" as a chase
after wind-blown beach balls; the Fataga sheep stampede and round-up; the night-bus race; porcelain
smashing as a timed game; following José's car and the pig truck; the Guardia jeep chase; Ole's
gadgets scattered over the island; Majsan saying the mantra together with Stig-Helmer.
The film's flight has **no turbulence** and **no in-flight toilet scene**: both toilet scenes are
at Arlanda (we keep them there).

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
| `siv` | Sivan | Majsan's sister, hands out points | 360 | `#fff8e6` | hair `bun` `0x7a3018`, `dress`† `0xd8321e` + `print`† `0xffb0c0` |
| `berra` | Berra | bodega hunter | 220 | `#fff8e6` | `wide` .9, hair `long` `0x5a3a22`, walrus mustache, big tinted glasses `0x3a3a3a`, shirt `0x2a4fa0` (plain, **no text**), `vest`† denim `0x4a6a9a`; gate: cream cowichan cardigan `0xf0ead8` + stripe `0x4a3a2a` |
| `robban` | Robban | Berra's Gothenburg mate | 235 | `#fff8e6` | `wide` 1.25, hair `short` thin `0x6a5a48`, glasses; flight: shirt `0xf07a1e`; island: `0x1f2f6a` + `hat:'cap'`† |
| `angerud` | Gösta Angerud | antagonist (comic) | 200 | `#fff8e6` | `wide` 1.35, skin ruddy `0xf0b8a0`, hair `balding` `0x5a4a3a`; flight: dark suit `0x3a3a44` + `tie`† `0xc8202a`; island: light-blue suit `0x9cc4e4` longSleeves + `shades`† |
| `levander` | Dr Levander | radio/phone/portrait only | 290 | `#c8c8d8` | tall thin, hair `slick` `0x2a2a2a`, big glasses, shirt white (coat) longSleeves, `tie`† navy |
| `lasse` | Lasse | SunTrip platschef, giver | 300 | `#f07a1e` | athletic, skin tan `0xc98f62`, hair `curly` `0x1d1426`, sun-yellow suit `0xffd23f` (shirt+pants, longSleeves), `print`† shirt; julafton: red + `hat:'tomte'`† |
| `affe` | Affe | guide, accordion | 280 | `#f07a1e` | thin, hair `short` `0xc9a66b`, shirt print†, pants `0xffd23f`, `shades`†, `held:'accordion'`† |
| `gabbe` | Gabbe | guide, congas, night bus | 190 | `#f07a1e` | `wide` 1.4, hair `afro` `0xc0602a`, `beard`† `0xc0602a`, `shades`†, pants `0xffd23f`, `held:'congas'`† (decor) |
| `jose` | José | "pizza-racern" | 280 | `#d8321e` | hair `slick` `0x1d1426`, thick mustache, shiny royal-blue shirt `0x2048c8` longSleeves |
| `mamma` | Josés mamma | chaperone | 380 | `#d8321e` | hair `bun` grey `0x9a9a9a`, glasses, `dress`† black `0x1d1426` |
| `pappa` | Josés pappa | Josés pappa (in game a shepherd: invented, a nod to the actor Juan Socorra Vega, a real shepherd) | 180 | `#d8321e` | black suit `0x1d1426`, `hat:'trilby'`† black |
| `carmencita` | Carmencita | Viking Bar, José's sister | 360 | `#d8321e` | hair `short` `0x1d1426`, `dress`† black, stripe `0xd8321e` (red scarf) |
| `herrStorch` | Herr Storch | newlywed from Mjölby | 300 | `#fff8e6` | young tall, hair `curly` `0x9a7a52`, dark floral shirt `0x3a2a4a` print†, `vest`† suede `0xb07a5a`, `held:'camera'`† (Super 8, lens cap ON) |
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
| `pax` | Medpassagerare | anonymous voice for (t) lines | 280 | `#fff8e6` | random 1979 tourist (brown/orange clothes) |

Removed Bigmouth keys: `nick maurice andrew steve jay jessi connie duke shame` (delete from
`CHARS`; the monster/ghost/wizard builders may stay as dead code).

### 2.2 Outfits (`def.outfits`, shallow-merged over the base def by `Character.setDef`)

| key | outfits (name: fields) | when |
|---|---|---|
| `stig` | `arlanda`: shirt `0x3a2a1e` longSleeves (dark brown coat), pants `0x2e2620`, `hat:'cap'`† tweed `0x8a7a5a` · `kostym`: shirt `0x4a3426` longSleeves, pants `0x3a2a1e`, `tie`† `0x7a2a2a` · `hawaii`: shirt `0xd8321e` `print`† `[0xffd23f,0x3f7a3a,0x2f6ad8]`, short sleeves, `shorts:true` (oversized), pants `0xe8dcb8` · `rio`: shirt `0xf4f0e6` longSleeves, `bowtie`† `0x1d1426`, pants `0x1d1426` | `arlanda` mission 1 (gate) → `kostym` from mission 1 outro (boarding) → `hawaii` from the buss17 outro → `rio` only in the end card |
| `ole` | `arlanda`: + `hat:'trilby'`† `0xe8e2d0`, shirt beige `0xd8c8a0` longSleeves, `held:'boombox'`† · `flyg`: white polo `0xf4f4f0` · `sol`: shirt `0xf2c94c` `print`† check, pants `0xe8dcb8`, `shades`† · `gris`: shirt `0xf4f4f0` stripe `0xd8321e` · `rio`: white jacket + `bowtie`† + `shades`† | per level/home set (§4.5) and by dialogue cue |
| `berra` | `arlanda` (cowichan), `flyg`, `sol` (+ `hat:'cap'`† white) | per level |
| `robban` | `flyg` (orange), `sol` (navy + cap) | per level |
| `angerud` | `flyg` (dark suit), `sol` (light-blue suit + shades) | per level |
| `lasse` | `sol` (yellow suit), `jul` (red + tomte hat) | `jul` in julafton |
| `majsan`, `siv` | `flyg` (cardigan over dress: shirt colour on top), `sol` | per level |

`Character.setDef(def, outfitName)` rebuilds the model under the same parent and keeps the transform
(Phase 0). Player outfit changes re-render the portrait. **Fallback (cut):** keep the base look.

### 2.3 Where everyone stands (`HOMES`, per home set — format in §4.5)

| key | `HOMES.gate` (mission 1 only, index 0) | `HOMES.flight` (missions 2–5, any phase) | `HOMES.island` |
|---|---|---|---|
| `ole` | `['gateOle', 0, 0]` | `{ seat: '14A' }` | `['flamenco', 2.0, 1.0]` |
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
- Radio/portrait-only keys (no NPC instance): `levander kapten pa guardia pax` (`guardia` officers
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
| `reset` | R | unstick (back to the road) | back to the level's reset spot (`cabinRow14` if inside the cabin, else `gateLounge`); seated: `standPlayer()` first; ignored while a `timeline` locks the seat |
| horn / mute / pause | H / N / Esc, P | as Bigmouth | same (no horn) |

- **Mantra on the island**: J is kick. A `mantra` stage sets `game.mantraMode = true` so J holds
  the mantra instead (julafton duet).
- **Seated** (flight): movement input is ignored; E uses a `whileSeated` interactable if one is in
  range, else stands up (giver talk is **not** offered while seated: stand up first, §14.3); J
  mantra still works; Space does nothing. Phase 0: `handleOneShots` handles E, J and R when
  `player.state === 'seated'` (Bigmouth returns early for any non-`normal` state) and `updateHud`
  computes prompts while seated.
- Pad Start = pause (Phase 0 maps the unused `pause` action).

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
    // Spots keyed on where the player is (cabin.inCabin = the interior rect only).
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
    spawn: (g, i) => (i === 5 ? 'airport' : 'flamenco'),
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
| R reset | teleport to `resetSpot(g)` (by player position) | nearest road (layout constants, not literals) |
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
`index === MISSIONS.length` (game complete) → island, spawn `flamenco`.

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
// Keys absent from a set are treated as null (hidden).
LEVEL_OUTFITS = { gate: { stig:'arlanda', ole:'arlanda', berra:'arlanda' },
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

Visuals (WP-A1): cut-away walls 2.6 m high, no roof; signs (`signMesh`): `ARLANDA UTRIKES` (facade),
`SÄKERHETSKONTROLL`, `GATE 8 · LAS PALMAS 09.40`, departures board `LAS PALMAS 09.40 · GATE 8 ·
I TID`, `HERRAR`, `DAMER`, poster `SUNTRIP – SOLEN VÄNTAR`, window wall at x 14 looking at the plane,
orange-and-wood 1976 terminal palette, brown carpet. Men's room: mirror, 3 basins (visual), a
cubicle (visual box top 2.2). The terminal facade box around the lounge is part of the gate group.

**Flight bounds** for `cabin.inside(x, z)`: the cabin interior rect; plus, in phase `gate`, the jet
bridge interior (x 3.45–14, z 13.7–15.7) and the lounge interior (x 14–38, z 0–30). Level-wide
extent for debug: lx [−3.45, 39], lz [−20, 31]. `cabin.inCabin(x, z)` = the cabin interior rect
only (used by `resetSpot`, `panicHome` and the camera clamp). Flight targets can be ~60 m apart
(lounge corner to the rear galley), so **the flight level never uses `routeAim`**: `updateMarkers`
aims straight at the target with `nodes = []` (`levelDef.routeAim === false`, Phase 0).

### 5.3 Camera and lighting

```js
export const CAM_CABIN = { pivotH: 1.5, dist: 6.5, pitchMin: 0.72, pitchMax: 1.1, pitch0: 0.9,
  noPull: true, fov: 58, cineSide: 2.0, cineUp: 3.6, clampZ: [-19.2, 17.2] };
```

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
  same way.
- **The ceiling** is one `PlaneGeometry` at y 2.6 facing **down** (`FrontSide`, `outline: 0`,
  `cast: false`): invisible from above. **Hat racks** are drawn the same way: down-facing planes
  only (|x| ∈ [1.9, 2.45], y 2.1), invisible from the camera above. Even a narrow solid rack hides
  Ole in 14A from the default camera behind 14B (the sight line crosses y 2.1 at x ≈ 1.97). The
  row-number strip "…11 12 14 15…" is painted on the inner wall face above the windows, at
  y 1.7–1.9, on both sides.
- Flight level: `sun.castShadow = false`, hemisphere light raised (palette `hemiI`).
- **No global fog on the interior**: every flight palette keeps `fogNear ≥ 40` m (the interior is
  ≤ 12 m from the camera). The climb whiteout is faked with cloud puffs streaming past the plane
  and the window-pane colour, not with short fog.
- Markers: the Bang "!" over a seated giver sits at `ch.y + height + 0.9` (seated `ch.y` = cushion
  0.55); GuideArrow and Beacon are above the invisible ceiling and stay visible.

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
| `gateOle` | 23.0, 11.8 | π | Ole's lounge spot (stats scene); panic home outside the cabin |
| `gateLounge` | 22.0, 16.0 | 0 | Berra/Robban/Sulan cluster; R-reset outside the cabin |
| `gateDesk` | 18.0, 20.5 | −π/2 | gate desk |
| `herrtoaDoor` | 29.0, 25.2 | π/2 | men's room door |
| `herrtoa` | 33.5, 26.0 | π/2 | inside the men's room (mantra) |
| `damtoaDoor` | 28.8, 18.4 | π/2 | facing the closed ladies' door (bubble anchor) |
| `bridge` | 8.0, 14.7 | −π/2 | jet bridge middle |
| `bridgeQueue1` / `bridgeQueue2` | 4.2, 14.2 / 5.2, 15.2 | −π/2 | outro spots (Majsan, Siv) |
| `cabinDoor` | 0.8, 14.7 | π | inside the front door; mission 2 `at` (vardinna) |
| `galleyFront` | −0.2, 13.0 | π | front galley (aisle side) |
| `cockpitDoor` | 0, 16.6 | π | |
| `cabinRow6` / `cabinRow10` | 0, 6.3 / 0, 1.5 | 0 | aisle spots |
| `cabinRow14` | 0.25, −2.1 | π/2 | aisle beside 14ABC facing the seats; mission 3 `at`; R-reset |
| `cabinRow16` | −0.25, −4.5 | −π/2 | aisle beside 16DEF; mission 5 `at` |
| `cabinRow22` | 0, −11.7 | π/2 | |
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
- The town clouds `MAT._clouds` are hidden for the whole flight level. Snow: `fx` white puffs
  (~20/s around the camera) in phase `gate` and the first half of `takeoff`.

`cabin.setPhase(name, { instant = false })` state machine. Lengths are seconds at timeScale 1.

| phase | length | palette (§13.3) | what moves | events (cabin-driven) |
|---|---|---|---|---|
| `gate` | until set | `gate` | static apron, snow | gate set active, door open, seatbelt off |
| `takeoff` | 12 | `gate` | runway scrolls −z accelerating 0 → 70 m/s; t 8 pitch → −0.12 rad; t 9 ground starts dropping | t 0: gate set off, door closed, drone 0.9 bright 1; t 0–10 fear source `takeoffRoll` +4/s |
| `climb` | 8 | `clouds` | puffs sweep past (dense whiteout), deck drops to y −25 | windows white; 3 bumps at t 1.5, 4, 6.5 (shake 0.3, fear +8 each) |
| `cruise` | open | `above` | deck at y −30…−12 scrolls −z 55 m/s; pitch 0 | random idle turbulence every 60–90 s **only when no mission is running** |
| `approach` | 14 | `descent` | deck rises past (2 s whiteout), then sea + island domes slide closer; pitch +0.04 | fear source +1/s; drone 0.7 |
| `landing` | 6 | `island` | `landingStrip` rises to y 0.13 under the plane | t 5: touchdown thud + shake 0.6 + fear +10; t 5.5: reverse thrust (drone bright 1 for 3 s) + fear +5 |
| `landed` | — | `island` | static runway, sea on the left, terminal | — |

Phases `takeoff → climb → cruise` and `approach → landing → landed` chain automatically unless the
phase was set with `hold: true` (`cabin.setPhase(name, { instant, hold })`): a held phase stops at
its end state until the next `setPhase` call (used by landning stage 3, §8.5).
`instant: true` jumps straight to the end state of that phase (no events). `cabin.onPhase(fn)`
listeners get `(name)` on every change. The **DUNS** (gear-up thump) and every line of dialogue are
**not** cabin events: the mission timeline triggers them at matching times (§8, mission 2).

### 5.7 Turbulence and HÅLL I DIG (invented mechanic)

`cabin.turbulence(strength 0..1, secs, { warn = 1.5 } = {})`:
1. Warning: chime (`audio.chime()`), seatbelt sign on, banner `TURBULENS!` (cls `count`, 1.2 s),
   prompt `<b>Space</b> Håll i dig!` while standing.
2. For `secs` (× timeScale): `cam.shake = max(shake, 0.5·strength)` refreshed every 0.3 s;
   `scenery.rotation.z` wobbles ±0.03·strength; rattle `audio.noise(0.3, 0.15, 300)` every 0.4 s;
   drone +30 %; trolley jitters ±0.05 m in x.
3. **Jolts** every 0.8 s. Each jolt calls every `cabin.onJolt(fn)` listener with `{ strength }`
   (the `collect` roll motion subscribes and kicks its bottles ±1.5 m/s). Per jolt, for the player:
   - hidden: nothing;
   - seated: fear +4 (+1 instead while the mantra is held); the jolt **interrupts the mantra**
     (wind-up restarts, 0.6 s instead of 0.3 s), which gives seated turbulence a rhythm;
   - standing and holding (`game.holding`): fear +1, tiny shove (0.4 m/s);
   - standing and not holding: fear +6, lateral shove 2.5 m/s; the **second** unheld jolt in a row
     knocks him down (`player.fling(side·2, 3, 0)` → `down`), fear +12, `cabin.stats.falls++`,
     `game.bumpedT = 0.4` (a carried item spills).
4. The sign switches off 3 s after the end (unless a mission set it).

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
  a 3 s stop every 3 rows with `vardinna2` bubble "Juice, whisky?" [F*]; throttle 0.6 below target,
  brake 0.5 above, steer 0, x damped kinematically to the aisle centre; at z < −15.5 `place()` back
  to `trolleyPark` and wait 6 s. `cabin.trolleyStopped` is true during stops and waits. The
  trolley **waits** while any non-player character (round-up targets, aisle walkers, luggage
  stowers) stands within 1.2 m ahead of it in the aisle (`vardinna`'s home is beside the aisle): only the player gets bowled
  over, NPCs are never shoved along by depenetration.
- `cabin.trolleyEnd(g)` → `{x, z}` = the trolley end (front or back face, 0.85 m from its centre)
  nearest the player; the juice interact anchors there, so a trolley that has already passed row 14
  is still reachable.
- **Pusher**: `vardinna2` Character glued 0.9 m behind (at z + 0.9), anim `push`.
- **Bowling** (invented): if the trolley is moving, the player is standing `normal`, |x| < 0.75 and
  0 < (trolley.z − player.z) < 0.95 → `player.fling(0, 3.0, −2.6)`, fear +12, `vardinna2` bubble
  "Akta tårna!" [N], `cabin.stats.bowled++`, `game.bumpedT = 0.4`, trolley pauses 1.5 s; 2 s
  cooldown. Dodge by stepping into a row with free seats (cushions are walkable).
- `cabin.startTrolley()` / `cabin.stopTrolley()` (tests and missions); `stopTrolley()` halts it
  where it is and sets `trolleyStopped = true` until the next `startTrolley()`. Default: trolley runs in
  `cruise` from mission 3 on; parked at `trolleyPark` otherwise.
- Fallback if the trolley misbehaves (P0 safety): `stopTrolley()` permanently and serve juice from
  the galley interactable; missions 3–4 still work.
- P2 only: player-driven trolley (needs hard speed cap, `noBoost`, `pushed` seat, ~10 car.js edits).

### 5.9 FLYGRÄDSLA (meter mode `panic`; config in `src/meters.js`)

```js
METERS.flygradsla = { mode: 'panic', label: 'FLYGRÄDSLA', cls: 'fear', hot: 70,
  decayIdle: 2, idleDelay: 4,
  panicBanner: ['PANIK!', 'Jag kan flyga… jag kan flyga…'],          // [F*]
  panicFailText: 'Stig-Helmer fick panik!',                           // [N]
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
| **Ole's statistics bark** (player within 4 m of Ole, no mission running or stage `oleBarks: true`, every 25 s; line from `OLE_STATS`) | +8 | cabin.tick |
| scripted dialogue/timeline cues `{fear: n}` | n | missions |
| stage `fearRate` (e.g. the toilet dash) | +n/s | missions (goto option) |

**Relief** (`game.shame.relieve(n)`):

| relief | amount | owner |
|---|---|---|
| idle decay after `idleDelay` s without an add | −2/s | shame.js |
| seated, sign off / sign on | −5/s / −2/s, but **0** while the phase is `takeoff`, `climb` or `approach` | cabin.tick |
| **mantra held** (after 0.3 s wind-up; also when seated) | −25/s | main.js |
| toilet: "E Lås in dig" → hidden 4 s, flush | −50 once | cabin interactable |
| galley juice "E Ta en juice" (P1; 30 s cooldown) | −30 | cabin interactable |
| cue "Titta, solen!" | −30 | mission cue |

- **≥ 70 (hot)**: heartbeat (`audio.heartbeat()` every 0.8 s), music low-pass (cutoff
  `4000 → 600 Hz` as v goes 70 → 100), body class `fear-hot` (red vignette), meter `.hot`.
- **At 100: PANIK!** (`shame.panic()`): banner `PANIK!` / sub, white flash, `cam.shake = 1.2`,
  heartbeat burst; the player is frozen `flailSecs` in the `flail` pose; then
  `game.missions.onPanic()`:
  - returns **true** if a mission is running and the current stage has `panicFails: true` (or the
    def has `panicFails: true`) → the mission fails with `panicFailText`;
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

### 5.10 Cabin interactables (registered by cabin.js through `game.addInteractable`)

| id | where | prompt | effect |
|---|---|---|---|
| `seat:<id>` | standing, within 0.8 m of a free seat's **cushion centre** (`x`, `z`; not `taken`, not `'bust'`); among several, the best by facing (dot of the player's forward with the direction to the cushion) then distance; the seat named by the running stage (`stage.seat`) gets priority +10 | `<b>E</b> Sätt dig` | `game.sitPlayer(id)` |
| (implicit) | while seated, unless a `timeline` stage locks the seat (`lockSeat`) | `<b>E</b> Res dig` | `game.standPlayer()` |
| `blocker:<n>` | within 1.3 m of a luggage stower (ombord stage 1, §5.12) | `<b>E</b> Ursäkta!` | the stower steps into the dodge row beside him |
| `toilet:L`, `toilet:R` | `toiletBackL/R`, r 1.0, not in phase gate | `<b>E</b> Lås in dig` | hidden 4 s, relieve 50, `audio.flush()`, UPPTAGET lamp |
| `toilet:gate` | `herrtoa`, r 1.5, phase gate | `<b>E</b> Lås in dig` | same |
| `juice:front`, `juice:back` (P1) | galley counters | `<b>E</b> Ta en juice` | relieve 30, `audio.pickup()`, 30 s cooldown |
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

- Seated cast idle bubbles from `CHATTER_FLIGHT` when the player is within 6 m (12–20 s apart).
- **"Ra-tara-tara…"** [F]: when `vardinna2` (with the trolley) passes rows 21–23, Berra and Robban
  bubble it (45 s cooldown). (In the film they say it at the stewardess; never triggered by Stig.)
- Angerud (6C) bubbles the "varm middag" complaint when the trolley stops at row 6 (once per
  cruise).
- 2–3 standing passengers ("aisle walkers", P1): shuffle between the galleys and a toilet; when the
  player comes within 1.5 m in the aisle they step into the nearest free row ("Ursäkta!" [N]).
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
| (3,3) | `flamenco` → `hotelFlamenco` (C1, hotels.js) | 7-storey white slab x [−26, 26], z [−27, −14] with balcony rows, terracotta accents, `HOTEL FLAMENCO` roof sign; open reception porch (canopy, desk, plastic Christmas tree `julgran` prop, `RECEPCIÓN`) at the slab's south face; ground-floor room patios along the south face (Stig & Ole's room west, room 113 east) with a visible 1st-floor balcony above 113; pool deck south with a **walkable shallow pool** (flat blue slab at CURB+0.02 + `box(..., CURB, 'water')`, sign "TRE METER DJUPT I ENA ÄNDEN, EN METER I DEN ANDRA – BARNVÄNLIG" [F*] (the bungalow seller's line, relocated)); poolbar with straw parasols (`BAR PISCINA · SVENSKT KAFFE`); parking lot on the west; **PEPES BODEGA**: small whitewashed annex x [4, 12], z [−31, −27] on the north side with a green door, barrels, sign `PEPES BODEGA · VINOS · RON` facing north (`worldHooks.bodegaLit(on)` lights it after julafton) | `flamenco` (−4, −8, 0) · `flamencoRecepcion` (2, −10, 0) · `flamencoPatio` (−18, −11, 0) · `rum113` (18, −11, 0) · `flamencoBalcony` (18, −8, π) · `flamencoPool` (−3, 18, π) · `flamencoBar` (16, 12, −π/2) · `flamencoDrive` (−26, 22, π) · `flamencoBack` (−6, −33.5, 0) · `bodega` (8, −33.5, 0) · `fena_flamenco` (−3, 7, 0, 0.35) | `hyrbil` (sedan `0xf4f4f0`) at `flamencoDrive` — default `getInCar` car and test car |
| (3,2) | `suntrip` → `hotelSunTrip` (C1, hotels.js) | lower U-shaped hotel on red rock; welcome **stage** with SunTrip sun backdrop (red text on yellow sun), accordion/conga props; pool; **friskotek lawn**; SunTrip office porch on the south side facing Flamenco's back; posters `GRISFEST TORSDAG · 800 PTA`, `FRISKOTEKET 9.30` | `suntrip` (−14, 24, 0) · `scen` (0, −14, 0) · `friskotek` (−10, 8, 0) · `suntripPool` (14, 4, π) · `suntripLot` (24, 22, π) · `fena_suntrip` (14, 8, 0, 0.35) | — |
| (1,2) | `kasbah` → `kasbah` (C2, centre.js) | **Centro La Medina** (fictional; internal id `kasbah`): two-level nightlife courtyard centre: arcade, stairs (ramp) to a roof terrace (top ≈ 6.0), neon signs `CENTRO LA MEDINA`, `VIKING BAR` (horned helmet), `TONGA TONGA` (mirror ball), `BAR SVENSKA · SMÖRGÅSAR` | `kasbah` (0, 22, π) · `vikingbar` (−16, 18, π) · `tongatonga` (14, 18, π) · `tongaLot` (20, 27, π) · `pryl_poolpen` (8, −6, 0, 7.2) | — |
| (4,2) | `cita` → `cita` (C2, centre.js) | **Centro Nórdico** (fictional; internal id `cita`) strip mall, sign `CENTRO NÓRDICO`: `SUPERMERCADO`, `FERRETERÍA`, `FARMACIA`, `ESTANCO`, `TELÉFONOS · HYTT 1·2·3`, `SOUVENIRS`, `SVENSKT KAFFE`, `CAMBIO · 1 KR = 17 PTA` | `cita` (0, 22, π) · `supermercado` (−18, 18, π) · `ferreteria` (18, 18, π) · `telefon` (0, 8, π) | — |
| (2,3) | `plaza` → `plaza` (C2, centre.js) | palms, fountain (shallow walkable pool), restaurant terraces; **CASA LOLA** (`CASA LOLA · COMIDA CANARIA`, fictional; internal id `grillpaco`) terrace on the SE corner | `plaza` (0, 0, 0) · `grillpaco` (20, 22, π) · `grillpacoMamma` (25, 24, π) · `grillpacoCurb` world (−60, 36, −π/2) (westbound kerb of the z = 40 road, the `follow` endpoint) · `fena_plaza` (0, 0, 0, 0.35) | — |
| (2,1) | `marknad` → `marknad` (C2, centre.js) | rows of striped stall awnings (some `bounce` awnings as climb pads), souvenir stand with painted donkeys `BURROS 500 PTA`, postcard racks, plastic giraffes | `marknad` (0, 22, π) · `asnestand` (6, 2, π) · `pryl_kalkylator` (−12, −8, 0, 3.4) (on an awning roof) | — |
| (3,1) | `kyrka` → `kyrka` (C2, centre.js) | **Templo Ecuménico**: white rationalist church (flat planes, bell slab), palm plaza, crèche, small fountain; sign `ES UNA IGLESIA` / `Det är en kyrka.` [F*] (the sisters' language record, relocated) | `kyrka` (0, 18, π) | — |
| (4,3) | `bensin` → `bensin` (C2, centre.js) | gas station: canopy, `GASOLINA` (no brand), prices in pesetas, kiosk; `gaspump` props explode | `bensin` (0, 16, π) | — |
| (5,3) | `guardia` → `cuartel` (C2, centre.js) | ochre barracks, red-yellow-red flag mast, `CASA CUARTEL`; two parked green Land Rovers | `guardia` (0, 20, π) | `guardia1`, `guardia2` (type `guardia`, locked) |
| (1,0), (3,0), (0,1) | `tomat` → `tomatfalt` (D1, nature.js) | rows of low tomato bushes (one merged mesh, walls a car drives through: no solids, or tops ≤ 0.6), packing shed `TOMATES · EXPORTACIÓN` / `EMPAQUETADO`, `tomatlada` props, dirt tracks | on (0,1): `vischan` (6, 24, π) · `eslovVag` (28, 4, −π/2) (road side, rollerskier) — on (3,0): `packhus` (0, 10, π) | — |
| (2,0) | `grisfest` → `grisgard` (D1, nature.js) | farm: white barn (roof top ≈ 5), pergola deck with long tables under string lights, spit-roast pig, bandstand, dance-floor platform (deck top 0.4), piglet pen, gate on the **south** road; **12 `tallrikar` prop stacks** on the tables (smash stage; `placeProp(..., baseY = table top)`, §14.7) | `grisfest` (0, 26, π) · `grisfestGate` world (−80, −204, π/2) (on the south road at the farm gate, the `follow` endpoint) · `dansgolv` (0, 0, 0) · `pryl_pung` (−18, −14, 0, 5.4) | — |
| (0,0) | `fataga` → `fataga` (D1, nature.js) | white village houses, tile roofs, narrow lanes, date palms, small church, embroidered tablecloths on lines (`MANTELES · DUKAR`), sheepfold (fence solids, gap gate) | `fataga` (0, 18, π) · `fatagaBus` world (−240, −204, −π/2) (westbound kerb of the z = −200 road, the `follow` endpoint) · `fatagaFold` (−18, −12, 0) · `fatagaDukar` (8, 4, π) · `pryl_kniv` (0, 0, 0, 1.2) | — |
| (4,0) | `golf` → `golf` (D1, nature.js) | fairway, bunkers (sand slabs), **pond** (`water` circle + flat blue), flag 18, small clubhouse `CAMPO DE GOLF` | `golf` (0, 22, π) · `fena_golf` (−10, −6, 0, 0.35) | — |
| (5,0) | `bungalow` → `bungalowTomt` (D1, nature.js) | Angerud's show bungalow: one-storey white cube, pool, plot fence, `SE VENDE · BUNGALOW · 4 RUM OCH KÖK` | `bungalow` (0, 22, π) · `fena_bungalow` (6, −4, 0, 0.35) | — |
| (5,1) | `bygge` → `bygge` (D1, nature.js) | half-built hotel frame, crane, girder deck with ramp (Bigmouth construction reworked), `PRÓXIMAMENTE · HOTEL NUEVA ESTOCOLMO II`, cones/barrels | `bygge` (0, 22, π) · `pryl_klocka` (6, −6, 0, 7.6) | — |
| (6,1) | `dromplan` → `dromplan` (D2, coast.js) | **the old propeller "drömplanet"**: faded red 4-engine prop plane (DC-7-like) on a dirt lot by the road, wing reachable via a crate ramp, windsock, sign `AERÓDROMO` | `dromplan` (0, 20, π) · `pryl_kamera` (−4, −2, 0, 3.6) (on the wing) | — |
| (6,0) | `flygplats` → `gando` (D2, coast.js) | low terminal with open arrivals canopy `LLEGADAS · ANKOMST`, baggage carousel (animated ring of suitcases), `OBJETOS PERDIDOS · HITTEGODS` desk with a wall of suitcase silhouettes, bus bay `BUSS 17`; **the parked DC-8** (`buildPlaneExterior`) **outside the bound wall at (240, −335)** — WP-B clears the tree ring **and the hills** in that sector (§6.4) | `airport` (0, 22, π) · `hittegods` (−14, 6, 0) · `busBay` (16, 24, −π/2) · `bagageband` (6, 0, 0) | `buss17` (bus, livery `suntrip`) at `busBay`; `taxiAirport` (taxi, locked) |
| (0,4), (0,5) | `dyner` → `dyner` (D1, nature.js) | large sand dunes (ramps), palm grove, lagoon pond | `dyner` (0, 0, 0) on (0,4) | — |
| (0,6) | `fyren` → `fyren` (D2, coast.js) | **Faro de Maspalomas**: ~55 m grey-blue stone tower (tallest landmark, visible from everywhere), keeper's house (roof top ≈ 4.0, reachable by a dune ramp) | `fyren` (0, 10, π) (coin arc on the keeper's-house roof) | — |
| (1..4,6) | `playa` → `playa` (D2, coast.js) | sand, sunbed rows (`solstol`), parasols, `HELADOS` kiosk, lifeguard tower, pedal boats on the sand, towels on sunbeds | `playa` on (3,6): (0, 10, 0) · `fena_hav` world (0, 304) (sea shallows, y 0.35) | — |
| (5,6) | `hamn` → `hamn` (D2, coast.js) | small marina: walkable shallow basin (`water` box), pier (deck top 0.55), moored boats | `hamn` (0, 0, π) · `fena_hamn` (−8, 10, 0, 0.35) · `pryl_glasogon` (12, 28, 0, 1.2) (pier end) | — |

**Rio end card** (WP-B, `world/rio.js`, P1): `buildRioCard(scene)` at **x = −3000, z = 0**: water
plane `#1c7fb8` r 400, a white motor yacht deck (top 0.55 solid), Sugarloaf cone, a strip of
Copacabana beach with palms, a small orchestra of busts, sunset palette. Landmarks `rioBoat`
(−3000, 0, 0) and `rioCam` (−3000 + 9, 6, yaw toward the boat). Used only by the julafton epilogue.

### 6.4 Edges, sea, set dressing (WP-B, town.js)

- `streets()`: asphalt and sidewalks stay; road centre dashes **white**; the grass ring becomes
  ochre volcanic sand `#c9a26b`; lamps become Spanish double-arm street lamps; sidewalk furniture
  pattern uses `papelera`, `vykort`, `correos` props (no US hydrants/newsboxes).
- `outskirts()`:
  - **North and east**: red-ochre mountain domes ("Monte Rojo", `#a5532f` / `#c27a45`), cardón cacti
    and agaves instead of trees (circle colliders as before).
  - **West**: sand dunes and palms.
  - **South**: sand strip z 289 → 300, then the **sea plane** (`MAT.water` retinted `#1c7fb8`,
    y **0.17**, i.e. 2 cm above CURB, so walking/driving from z 300 to the bound wall at 314 reads
    as wading) out to z 1150, x ±1150 (§4.1: nothing island-side beyond 1150). The bound wall at
    z 314 stays.
  - **NE sector** around (240, −335): the parked DC-8 sits there, inside today's hill ring (the
    hill at ≈ (265, −364) would bury it ~20 m deep). No hills or domes within **100 m** of
    (240, −335), and nothing taller than 1 m (trees, cacti, rocks) within **60 m**. Phase 0 cuts
    this gap in the existing hills and trees; WP-B keeps it in the Monte Rojo rework.
  - Welcome sign at the west entrance: `BIENVENIDOS A NUEVA ESTOCOLMO · VÄLKOMMEN!`
  - Road banners `GOD JUL · FELIZ NAVIDAD` over 3 roads; tinsel spirals on some palm trunks.
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
  SUR`, `HOTEL MAR AZUL`, `HOTEL ATLÁNTICO`, `APARTAMENTOS TAMARINDO`.
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
| `grisbil` | Grisbilen | pickup + flag `pigs` (slatted rack + 3 pink pig blobs), maxSpeed 34, accel 14 | rust `0xa8442a` | bodega mission, unlock |
| `trolley` | Serveringsvagn | registered by cabin.js (§5.8) | `0xc8ccd2` | cabin only |

Removed: `hearse`, `muscle` (their geometry branches may stay as dead code). Traffic mix (main.js):
`['hatch','hatch','hatch','hatch','sedan','sedan','wagon','van','taxi','pickup','guagua','icecream']`
with ≤ 1 bus. Busts in traffic use `randomPed` (tourists and locals). Number plates (optional P2):
`GC-1234-A` white with black letters.

### 6.7 Pedestrians (models.js `randomPed`, peds.js; WP-E)

- **0 % kids**; scale .94–1.08.
- 70 % Swedish charter tourists: skins sunburn `0xf2b8a0`, `0xe89a7a`, pale `0xf6d3c0`; loud shirts
  (Hawaiian `print` 30 %), shorts 55 % (white socks), `hat: 'sunhat' | 'bucket'` 35 %, a camera
  `held` 10 %.
- 30 % locals: skins `0xc99a6e`, `0xa8774f`; white shirt + black trousers (waiters) or black dress.
- Dodge shouts (`peds.js`): `'Akta!' 'Hallå där!' 'Herre jävlar!' '¡Cuidado!' 'Turister!'`
  (`Herre jävlar` [F], others [N]).

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
| `parasoll` | flamingo | r 0.25 | 2.2 | 1 | 1 | 3 | striped canopy | C, D |
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
coloured box or cylinder of the right footprint). The old keys stay as aliases until Phase 2
removes them. `placeProp`/`finalizeProps` **skip unknown types with a `console.warn`** instead of
throwing. WP-B's Phase-1 job is then only to restyle `build()` of the existing keys (no renames),
so C and D can place every §6.8 name in their sandboxes from day one.

### 6.9 Set dressing (all blocks)

Christmas week: plastic Christmas trees, tinsel on palms, `GOD JUL · FELIZ NAVIDAD`, a crèche at
the church. Charter Sweden: `SVENSKT KAFFE`, `SMÖRGÅSAR`, `HÄR TALAS SVENSKA`, `KVÄLLSTIDNINGAR`,
SunTrip posters, towels on sunbeds. Spain 1979: orange butano bottles, Correos boxes, green Farmacia
crosses, `ESTANCO`, Guardia barracks, green guaguas. Landscape: whitewash, terracotta,
bougainvillea, Canary palms, cardón cactus, red barrancos, tomato rows, the lighthouse, dunes.
Avoid anachronisms: no Yumbo Centrum, no Nissan Patrol, no turquoise "Global" buses, no euro.

---

## 7. SKANDAL and the Guardia Civil (island; meter mode `pursuit`)

### 7.1 Config (src/meters.js; Phase 0, then WP-H)

```js
METERS.skandal = { mode: 'pursuit', label: 'SKANDAL', cls: 'skandal', hot: 70,
  vehicle: 'guardia', vehicleCount: 2, vehicleMaxSpeed: 28, pursuerDef: 'guardia',
  pursuerPhysics: 'walk', onFootSpeed: 7.0,          // sprint 8.8 outruns him, walking does not
  penalty: { share: 0.2, min: 250, max: 1500 },   // fine = clamp(round25(0.2·coins), 250, 1500), floored at coins
  bustFreeze: 3,                                   // s frozen beside the officer after a bust
  decayIdle: 5, idleDelay: 4, bands: [[42, 9], [22, 3]], allDeadDecay: 12,
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
    banner: ['PORTIERN TITTADE BORT', 'Skandalen är som bortblåst'] } ],                  // [N]
  witnessToast: { who: 'herrStorch', r: 20, text: 'Ingen fara: linsskyddet sitter på.', cooldown: 60 }, // [N] P1; offence adds 0
  bustLine: '¡Documentación!',                     // [N] the officer's bubble at a bust (Phase 0a)
};
```

### 7.2 Mechanics (shame.js, Phase 0 engine + WP-H polish)

- **Offences** (main.js amounts kept): carjack +8; prop break `def.shame` ×1.2 car / ×0.7 foot;
  ramming a non-target unlocked car `min(9, impact·0.55)`; wrecking traffic/unnamed parked car +12;
  running over a named NPC +14 / pedestrian +18; kicking a ped +9; kicking a traffic car +2.
- **Decay**: after `idleDelay` s clean, −`decayIdle`/s. In pursuit: −9/s beyond 42 m from the
  nearest pursuer, −3/s at 22–42 m, 0 closer; −12/s extra when all pursuer cars are wrecked and the
  officer is gone. `forced` (stage `shame: true`) → no decay.
- **At 100**: `startPursuit()`: banner, siren (two-tone 650/500 Hz square, alternating 0.45 s, while
  pursuit), music → `skandal`, flash `rgba(60,110,70,.45)`. Two `guardia` Land Rovers spawn on road
  nodes 70–150 m away (existing code, `vehicle` from config), `isPursuer = true` (rename of
  `isHearse`), `AIDriver` chase, bust = `CHARS.guardia`.
- **The officer on foot** (`pursuerPhysics: 'walk'`, judge trap fixed): a solid `Character(CHARS
  .guardia)` that **walks with collision**: each fixed step `wish = normalize(routeAim(officer →
  player) − officer) · onFootSpeed`, then `step()`. Wall-slide comes from `collideWalls`. **Stuck
  rule**: if he moved < 0.6 m in the last 3 s, or is > 60 m away, and is outside the camera frustum
  or > 25 m from the camera, teleport him to `freeSpot(player, 22, 32)` behind the player (opposite
  the camera yaw). He is created once per pursuit (reuse the Character; don't rebuild meshes).
  Removed when the player enters a car; re-spawned 30 m away when the player leaves it.
- **Busted** (officer within 1.4 m, or a pursuer car rams the player's car with impact > 1.5):
  fine `n = min(coins, clamp(round25(0.2·coins), 250, 1500))`, `coins −= n`, banner ¡MULTA!
  (`Guardia Civil tog {n} pesetas i böter`), flash; the player is **pulled out of the car** (if in
  one) and frozen `bustFreeze` = 3 s beside the officer, who bubbles "¡Documentación!" (in timed
  stages the bust costs time); `endPursuit(true)`, then `missions.onBusted()` (fails only
  `bustFails` missions). The 500-pta porter bribe beats the fine once the purse is ≈ 2 500 pta. P1 flavour: radio `lasse` "Friskotek i morgon bitti, Olsson!" [N].
- **Escape**: banner SKANDALEN TYSTAD + `complete` jingle; music back to `sol`.
- **Hideout** (P1): the porter at `flamencoRecepcion`: during a pursuit, on foot within 2.6 m,
  prompt `<b>E</b> Muta portiern (500 pta)`; pays via `game.pay(500)` (**Ole pays** if short), clears
  the meter, ends the pursuit with the hideout banner. 60 s cooldown.
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
  36 m/s (≈ 130 km/h) instead of ≈ 60 m/s, so drives take roughly 1.6× as long as on the Bigmouth
  car, and the Guardia (`vehicleMaxSpeed` 28) can actually keep up.
- **The `timer` values in the §8 literals are placeholders**: first guesses, never measured, partly
  written against the ×2 car. They are recalibrated by measurement, not by guessing:
  - **Drives** (`goto … inCar`, `destroy`, `collect … inCar`, `follow` has no timer):
    `T_ref` = the time of a clean drive by a headless autopilot in the player's car (boost 1.2,
    `timeScale` 1, traffic on) along the shortest sensible road route from where the stage starts to
    the target radius, including required stops (`stop`) and, where the stage has `smooth`/`fragile`,
    driving within those limits (lateral accel ≤ 6 m/s², no impacts). The autopilot is a test tool
    (a calibration scenario that writes `playerCar.ctrl` toward successive road nodes / lane spots,
    full throttle, braking before corners). If it is clearly slower than a good human (brakes too
    early, swings wide), correct for that. **timer = T_ref × 1.2, rounded up to 5 s.**
  - **On foot** (`rabbits`, `smash`, on-foot `collect`/`goto`, the gate dash, cabin stages):
    `T_ref` = nearest-neighbour path length over the targets / sprint speed (island 8.8, flight 5.2;
    walking 3.6 where sprinting adds fear and the stage punishes it) + 1.5 s per target, or measured
    when targets flee. **timer = T_ref × 1.25, rounded up to 5 s.**
  - **Races and chases**: tune opponent `cruise` and rubber-banding so that a clean race is won by
    a few seconds and one crash loses it; a `destroy` target must be catchable at ×1.2, but only by
    driving a direct line.
- **Who does it**: F (flight timers) and G (island timers) calibrate their own missions in Phase 1
  on the stub world and put a table `mission/stage → route, T_ref, timer` in their hand-off report;
  the Phase 2 balance pass (§15.3 step 5) re-measures on the merged real world (C/D geometry changes
  the routes) and adjusts. The story test is unaffected (it warps).

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
| 8 | 7 | `asnan` | Caballo folklorístico | `ole` @ `flamenco` | island | 600 | haggle pays 200 |
| 9 | 8 | `bodega` | Pepes Bodega | `berra` @ `flamencoBar` | island | 700 | unlock `grisbil` |
| 10 | 9 | `ropavieja` | Gamla kläder | `siv` @ `flamencoPool` | island | 700 | |
| 11 | 10 | `fataga` | En skock får | `majsan` @ `flamencoPool` | island | 800 | **P1: cut first** |
| 12 | 11 | `grisfest` | Grisfesten | `ole` @ `flamenco` | island | 1000 | cost 800, night, checkpoints |
| 13 | 12 | `julafton` | Julafton bland palmerna | `ole` @ `flamencoPatio` | island | 2000 | cost 100, unlock `bodega`, end card |

If `fataga` is cut, remove it from `ISLAND_MISSIONS` and the story script; the story then ends at
`#12 idle` (the integration agent updates CLAUDE.md/README).

---

### 8.1 · index 0 · `gate` · "Jag kan flyga, jag är inte rädd" · `ole` @ `gateQueue` · flight · 200

Fun: fear as a resource from minute one. A beeping arch, a timed toilet dash with the heartbeat
thumping, holding the mantra in the men's room, and the bodega tip in the queue to the plane.

No `extra` (the gate cast already stands at its `HOMES.gate` spots; an `extra` would pull them into the security queue). Player outfit `arlanda`. Ole outfit `arlanda`
(trilby, boombox). Phase `gate` (stage 1 `startCue: { phase: ['gate', { instant: true }] }`).

**Intro** (in the security queue):
- stig: "Vad ska de göra?"  [F]
- ole: "Rutinekontroll. Narkotika, våpen, bomber…"  [F*](t)
- stig: "Bomber…?!"  [F]  {fear: 10}
- ole: "Du ser nervøs ut, du. Første gang du flyr?"  [N]
- stig: "Jag kan flyga, jag är inte rädd."  [F]

**Stages** (0-based `stageI` in brackets, for the story script):
1. [0] `interact({ at: 'gateArch', radius: 1.4, prompt: '<b>E</b> Gå genom metallbågen', text: 'Gå genom säkerhetskontrollen', startCue: { phase: ['gate', { instant: true }] }, useCue: { sfx: 'beep', fear: 12, flash: 'rgba(255,60,40,.35)' }, lines: [...] })` — on use the `useCue` fires, then the `lines`:
   - kontrollant: "Vill ni vara vänlig och ta av er skon."  [F]  {anim: {who:'stig', flag:'shoeOff', secs: 2}, sfx: 'laugh'}
   - berra: "Kolla terroristen!"  [F](t)
2. [1] `goto({ to: 'gateOle', radius: 2.5, text: 'Sätt dig vid gate 8', startCue: { place: { ole: ['gateOle', 0, 0] } } })`
3. [2] `scene({ frame: ['ole', 'stig'], lines: [...] })` — Ole's statistics. **Only Ole's six
   statistics lines carry `{fear: 8}`** (+48; with "Bomber" and the arch the meter sits ≈ 70 when
   the dash starts, so the heartbeat is on):
   - ole: "Du vet vel at det er 50 prosent sjanse å overleve en flyulykke."  [F]  {fear: 8}
   - ole: "Det er farligere å kjøre bil enn å fly."  [F]  {fear: 8}
   - ole: "Man regner mellom to og fem millioner flytimer pr. kræsj."  [F]  {fear: 8}
   - stig: "Krasch?"  [F]
   - ole: "Kræsj."  [F]  {fear: 8}
   - ole: "Leste du om en sånn jumbopilot som gjorde en looping?"  [F]  {fear: 8}
   - stig: "Looping med en jumbo?"  [F]
   - ole: "Ja. To ganger."  [F]  {fear: 8}
   - stig: "Det går väl inte? Kan du se till mitt handbagage ett tag, jag måste…"  [F]
4. [3] `goto({ to: 'herrtoa', radius: 1.8, fearRate: 2, timer: 15, text: 'Till herrtoaletten – fort!', failText: 'Du hann inte fram…', radio: [['ole', 'To ganger, Stig-Helmer! Looping med en jumbo!', { gap: 3, fear: 4 }]] })`
   ([N] texts; radio [F*]). PANIK here does **not** fail: idle-panic returns him to `gateOle` and
   the 15 s timer keeps running.
5. [4] `mantra({ at: 'herrtoa', radius: 2.2, secs: 3, text: 'Håll J: sträck ut armarna – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA' })`
6. [5] `scene({ place: { berra: ['herrtoaDoor', 0, -1.5] }, frame: ['berra', 'stig'], lines: [...] })`:
   - berra: "Hur mår du?"  [F](t)
   - stig: "Bra."  [F]
   - stig: "Jag håller på med yoga, avslappningsövningar. Isometrisk träning…"  [F]
   - berra: "Jaha… Ja, själv tar jag mig ett järn. Ska du ha?"  [F]
   - stig: "Nej tack, jag tål inte starksprit."  [F]
   - berra: "Nej, vem fan gör det?"  [F]  {place: {berra: ['gateLounge', -1.2, 0]}}
7. [6] `goto({ to: 'gateLounge', radius: 4, text: 'Ställ dig i kön till gate 8', radio: [['pa', 'Herr Stork ombedes kontakta informationen i avgångshallen.', { gap: 1, pa: true }]], overhear: [...], awaitOverhear: true })`
   - PA right after the stage starts (ding-dong first) [F].
   - `overhear` at `damtoaDoor`, **r 8** (it starts as he leaves the men's room; bubbles anchored on
     the closed ladies' door, §9.2): siv "Du har väl med dig dom fyra p:na? Pass, pesetas,
     p-piller, piljetter." [F](t) · majsan "Jag har piral." [F](t) · siv "Pass, pesetas, piral och
     piljetter!" [F](t) · majsan "…och prit!" [F](t)
   - `awaitOverhear: true`: the stage cannot complete while a started overhear is still playing.
8. [7] `scene({ frame: ['berra', 'sulan'], lines: [...] })` — the Stork joke and **the bodega tip
   as a mandatory beat** (it sets up missions 9 and 13):
   - robban: "Han måste vara bror med Lennart Swahn."  [F](t)
   - berra: "Och Karin Falk!"  [F](t)
   - robban: "Och Magnus Uggla!"  [F](t)
   - berra: "Har du köpt vin?"  [F]
   - sulan: "Det är 80-procentig rom."  [F]
   - sulan: "Här ligger Pepes Bodega. Det står på skylten."  [F]
   - berra: "De häller upp och allt är klart?"  [F]
   - sulan: "Plomberat och klart."  [F]
   - berra: "Robban! Sulan har varit på Pepes Bodega. De häller 80-procentig rom på vinflaskor."  [F]
   - robban: "Vad hette det, sa du?"  [F]
   - berra: "Pepes Bodega."  [F]
   - robban: "Glöm aldrig det, du."  [F]
9. [8] `goto({ to: 'cabinDoor', radius: 2.0, text: 'Gå ombord – gate 8' })`

**Outro** (`outroPlace: { majsan: ['bridgeQueue1', 0, 0], siv: ['bridgeQueue2', 0, 0] }`; first line
cue `{outfit: {who: 'stig', name: 'kostym'}}` — he hands his coat in):
- majsan: "Nämen… hejsan!"  [F](t)
- stig: "Jaså, vi kom på samma resa."  [F](t)
- siv: "Jag dör! Såg du vad han stötte på dig? Han som såg ut som en giraff."  [F]

---

### 8.2 · index 1 · `ombord` · "Rad 13 finns inte" · `vardinna` @ `cabinDoor` · flight · 250

Fun: find your seat against the clock past passengers stowing their luggage in the aisle (and
discover there is no row 13), then survive the takeoff in your seat with the mantra while the gear
goes DUNS.

The cast is already seated (`HOMES.flight` from index 1 on, §4.2) although the phase is still `gate`.

**Intro:**
- vardinna: "God morgon och välkommen ombord!"  [N]
- stig: "Fjorton B… Efter rad tolv kommer väl rad tretton?"  [N]
- vardinna: "Inte hos oss. Fjorton B ligger mitt i planet."  [N]
- vardinna: "Skynda dig – vi ska taxa ut."  [N]

**Stages:**
1. `sit({ seat: '14B', timer: 25, text: 'Hitta plats 14B och sätt dig', failText: 'Planet kunde inte taxa ut. Kaptenen väntar på dig!', startCue: { phase: ['gate', { instant: true }], seatbelt: true, blockers: true }, doneCue: { blockers: false } })`
   - Seatbelt sign lit (standing +1.5/s). **Luggage stowers** in the aisle at rows 3, 8 and 12
     (P0, §5.12: E "Ursäkta!" moves them; bumping costs fear). Aisle walkers (P1). Crossing
     **lz −1.4** going aft (the midpoint between row 12's seats at −1.02 and row 14's at −2.22) the
     first time shows the toast `Rad 13 finns inte!` [N] (cabin-owned, once per load).
2. `timeline({ seat: '14B', lockSeat: true, panicFails: true, oleBarks: true, secs: 27, text: 'Starten! Håll J om det blir för mycket', barLabel: 'FLYGRÄDSLA', events: [...] })`
   (times in scaled seconds; the cabin phases run on the same clock; `lockSeat` hides "Res dig"
   and ignores R for the stage, so time never pauses while the phases run on)
   - t 0: `{phase: 'takeoff', toast: 'Håll <b>J</b>: Jag kan flyga, jag är inte rädd'}`
   - t 10: `{sfx: 'thud', fear: 15, shake: 0.4, say: ['stig', 'Vad är det för ljud?']}`  [F]
   - t 11.5: `{say: ['ole', 'Landingshjulene som går opp. Hydraulikk, vet du.']}`  [F]
   - t 14: `{say: ['ole', 'De går opp sånn, og så lukker lemmene seg. Så flyet ikke skal stoppe, men få fart. Ellers…']}`  [F] (Ole's Norwegian "Ellers…" = the Swedish subtitle's "annars…")
   - t 17.5: `{say: ['stig', 'Annars…?!'], fear: 5}`  [N] (echoes the subtitle's "annars…")
   - (t 12–20: phase `climb` runs by itself: whiteout puffs, 3 bumps)
   - t 20: phase `cruise` begins (automatic)
   - t 21: `{say: ['majsan', 'Titta, solen!'], applause: 2.5, relieve: 30, seatbelt: false}`  [F](t)
   - done at t 27.

**Outro** (seated, cruise; outro camera `player`; the Concorde dream is film row 10, before the
captain's PA and the juice gag of mission 3):
- ole: "Hva er det for et merke du har?"  [F*]
- stig: "Hammarby. Känner du till Hammarby?"  [F]
- ole: "Eneste svenske byene jeg kjenner til er Stockholm og Göteborg og Malmö."  [F]
- stig: "Det här är ett fotbollslag."  [F]
- ole: "Min drøm er å fly med Concorde fra Paris til Rio. 2 300 km i timen. Det er flyging!"  [F]
- ole: "Tre ganger så fort som en geværkule."  [F]
- stig: "Usch…"  [F]
- ole: "Og så Rio! Stranda, jentene og samba."  [F]
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
1. `interact({ at: 'call14', whileSeated: true, seat: '14B', prompt: '<b>E</b> Tryck där uppe', text: 'Sätt dig på 14B och tryck på knappen ovanför', startCue: { phase: ['cruise', { instant: true }] }, useCue: { sfx: 'pling', anim: { who: 'stig', flag: 'cupUp', secs: 6 } }, lines: [...] })` — on use the `useCue` fires, then:
   - ole: "Nei…"  [F*](t)
   - stig: "Där?"  [F]
   - ole: "Ja."  [F]
   - ole: "Nei…!"  [F*](t)  {anim: {who: 'ole', flag: 'laugh', secs: 3}}
   - ole: "Så… så kommer flyvertinnen. Juice, whisky."  [F*]
   - stig: "Hon har visst fullt upp."  [N]
2. `interact({ at: (g) => g.cabin.trolleyEnd(g), radius: 1.3, enabled: g => g.cabin.trolleyStopped, prompt: '<b>E</b> Ta en juice', text: 'Hämta juicen vid serveringsvagnen – men akta tårna!', checkpoint: true, startCue: { trolley: true } })`
   (`cabin.trolleyEnd(g)` = the trolley end nearest the player, §5.8; `interact` re-reads a
   function `at` every frame through `addInteractable({ pos })`, §14.3.)
   Bubbles while the trolley serves near row 6: angerud "Kallar ni det här 'varm middag'? Så ser
   det inte ut när jag flyger reguljärt." [F](t) · angerud "Jag har inte fått resan gratis. Jag har
   betalat 3 000 för den." [F](t) · pax "Jag betalade bara 995. Sista minuten." [F](t) · angerud
   "Det fattades bara det…!" [F](t)
3. `carry({ item: 'juice', to: 'cabinRow14', radius: 1.2, text: 'Bär juicen till 14B utan att spilla', failText: 'Du spillde juicen!', failOn: { bumped: true, sprintSecs: 1.0 }, startCue: { turbulence: [0.6, 5, { delay: 2 }] } })`
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
- berra: "Ta det vackert, vi har varit ute och flugit förr."  [F]
- vardinna: "Och resten av flaskorna rullar runt i hela planet."  [N]
- stig: "Jag tål inte starksprit."  [F*]
- vardinna: "Då är du rätt man."  [N]

**Stages:**
1. `collect({ kind: 'flaska', motion: 'roll', items: [{x:3000.2,z:9.0},{x:2999.8,z:2.5},{x:3000.3,z:-6.0},{x:2999.7,z:-10.5},{x:3000.0,z:-13.5}], radius: 0.9, timer: 75, text: 'Fånga flaskorna som rullar i gången', barLabel: 'FLASKOR', failText: 'Flaskorna rullade in under sätena.', startCue: { phase: ['cruise', { instant: true }], trolley: true }, timedCues: [[8, {radio: ['pa', 'Herr Storch ombedes kontakta kabinpersonalen.'], pa: true}], [20, {turbulence: [0.5, 6]}]] })`
   - `roll`: bottles slide along the aisle (|x| ≤ 0.45) at 0.6–1.4 m/s, bounce at z +12.5 / −16,
     get kicked ±1.5 m/s by every turbulence jolt (`cabin.onJolt`); touching collects one.
   - PA line [N] (the film's Stork PA is at Arlanda, mission 1; this cabin call is ours). Seatbelt on during the turbulence (standing costs fear; hold Space).
2. `goto({ to: 'galleyFront', radius: 1.6, text: 'Lämna flaskorna i främre byssan' })`

**Outro** (front galley, then back at row 14):
- berra: "Ja, vad fan, man var ju nykter i morse, men nu börjar det ordna upp sig!"  [F*] (Arlanda line, relocated)
- stig: "Är den bra den där?"  [F]
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
- vardinna: "Alla ska sitta! Hjälp mig få folk på plats, är du snäll."  [N]

**Stages:**
1. `collect({ who: ['herrStorch', 'jose', 'berra'], standAt: { herrStorch: [3000.2, 3.4], jose: [2999.8, -9.2], berra: [3000.0, -14.4] }, seatOnTouch: true, timer: 50, text: 'Få de stående passagerarna att sätta sig', barLabel: 'STÅENDE', failText: 'Värdinnan fick göra det själv.', lines: {...}, startCue: { phase: ['cruise', { instant: true }], trolley: false }, timedCues: [[12, {turbulence: [0.3, 4]}]] })`
   - herrStorch: "Lite film."  [F*] (Arlanda line)  {anim: {who:'herrStorch', flag:'film', secs:2}}
   - jose: siv "Vad skönt att komma bort!" [F*] then jose "Jag ska inte bort, jag ska hem." [F*] (mid-flight in the film, relocated)
   - berra: "Ska vi inte landa snart?"  [N]
2. `sit({ seat: '14B', timer: 20, text: 'Skylten lyser! Tillbaka till 14B', failText: 'Alla måste sitta vid landningen.' })`
3. `mantra({ seated: '14B', secs: 8, panicFails: true, text: 'Inflygning! Håll J – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA', startCue: { phase: ['approach', { hold: true }], turbulence: [0.7, 10] }, fillCue: { phase: 'landing' }, waitPhase: 'landed' })`
   - The approach plays its 14 s and then **holds** at its end state (no auto-chain) until the bar
     is full. The bar fills only while J is held; `fillCue` is applied when it fills, and its
     `phase` only if `cabin.phase === 'approach'` (never replays a touchdown). The stage completes
     when the bar is full **and** `cabin.phase === 'landed'` (landing runs 6 s after the bar is
     full).

**Outro** (`landed`; outro camera `player`):
- berra: "Om de kraschar, kastar man tomater på piloterna då?"  [F*](t)  {applause: 3}
- robban: "Nej, skärpning nu, Berra, annars får vi ena jävla problem här."  [F]
- ole: "Ser du, Stig-Helmer? Hydraulikk, vet du. Helt normalt!"  [N]

Then `transitionTo('island')`.

---

### 8.6 · index 5 · `buss17` · "SunTrips buss nummer 17" · `lasse` @ `airport` · island · 500

Fun: you are suddenly driving a 10 m coach full of people with "anlag för åksjuka": take corners
gently while Lasse's welcome speech plays. Ends in the overbooked hotel and Ole's clothes.

`extra: [['ole', 2.5, 1.0], ['siv', -3.0, 2.0], ['majsan', -3.8, 2.4], ['jose', 4.5, 3.0], ['mamma', 5.3, 3.0], ['robban', -1.5, 4.0], ['berra', -2.2, 4.4], ['affe', 3.5, -1.0]]`
(`[key, dx, dz]` = placed at `at` with that offset while idle; §9.2). `berra` anim `slump` (asleep).

**Intro:**
- robban: "Invalido."  [F]
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
- lasse: "SunTrips buss nummer 17 står där borta!"  [F]

**Stages:**
1. `getInCar({ car: 'buss17', any: false, passenger: 'ole', riders: ['majsan', 'siv', 'fruStorch', 'herrStorch'], hideRiders: true, lockMeter: true, text: 'Hoppa in i SunTrips buss nummer 17' })`
   (`passenger` is seated in the bus at init; `riders` are decorative window busts and
   `hideRiders` hides those NPCs for the mission so nobody appears twice.)
2. `goto({ to: 'flamencoDrive', radius: 12, inCar: true, passenger: 'ole', stop: true, timer: 150, failText: 'Gästerna missade välkomstdrinken.', smooth: { label: 'ÅKSJUKA', failText: 'Någon blev åksjuk i bussen!' }, text: 'Kör gruppen till Hotell Flamenco – mjukt!', radio: [...] })`  ([N] for the texts)
   radio (`[who, text, {gap}]`, gap = seconds after the previous line):
   - lasse: "Hjärtligt välkomna till Nueva Estocolmo och SunTrip!"  [F]  {gap: 4}
   - lasse: "Klockan är tre spansk tid – alltså en timme tidigare än svensk tid."  [F]  {gap: 9}
   - lasse: "Ni bör inte dricka vattnet."  [F]  {gap: 8}
   - lasse: "Grisfesten är på torsdag och kostar 800 pesetas. Några frågor?"  [F]  {gap: 8}
   - fruStorch: "Finns det svenskt kaffe på hotellet?"  [F]  {gap: 3}
   - lasse: "Ja."  [F]  {gap: 2}
   - ole: "Norsk, da?"  [F]  {gap: 2}
   - lasse: "Ja."  [F]  {gap: 2}
   - siv: "Majsan, en niopoängare!"  [F]  {gap: 10}
   - stig: "Jag har lite anlag för åksjuka."  [F](t)  {gap: 10} (research: the speaker is interpreted; the subtitles give Majsan the travel sickness on the bus)
   - ole: "Jeg har reisesyketabletter."  [F](t)  {gap: 2.5}
   - stig: "Jättefint! Tack. Du kanske vill ha en Argotal av mig. Mot allergi…"  [F](t)  {gap: 3}

**Outro** (`outroPlace: { lasse: ['flamencoRecepcion', 1.5, 1.5], portier: ['flamencoRecepcion', 0, 0], ole: ['flamencoRecepcion', -1.5, 2.0], stig: ['flamencoRecepcion', 0, 3.0] }`; the player ends the drive at `flamencoDrive`, 42 m away, so `stig` moves him to the desk):
- lasse: "Det har dessvärre uppstått ett litet problem på grund av överbokning."  [F](t)
- lasse: "Olsson, Stig-Helmer… och Bramserud, Ole… Kan ni dela rum?"  [F](t)
- stig: "Ja…"  [F]
- stig: "Kallar ni det här för havsutsikt?"  [F](t)  {cut: 'flamencoBalcony'}
- portier: "Momento."  [F]  {anim: {who: 'portier', flag: 'mirror', secs: 3}}
- ole: "Litt lenger inn mot veggen. Snu den litt mer mot meg. Sånn ja… Kom og hør nå! Fin lyd."  [F]  {cut: null}
- ole: "Du kan ikke gå sånn her nede! Den buksa og det slipset! … Shorts."  [F]
- stig: "Är den inte lite skrikig?"  [F]
- ole: "Du skal ha sterke farger, du som er mørk."  [F]  {outfit: {who: 'stig', name: 'hawaii'}, flash: 'white', sfx: 'helanGar'}

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
- siv: "Gud, vad han är söt!"  [F]
- lasse: "Finns det en familjen Stork här?"  [F](t)
- fruStorch: "Vi heter faktiskt Storch, inte Stork."  [F]
- lasse: "Till brudparet från Rutan och Nisse: Heja på och tappa inte orken, för om nio månader kommer storken."  [F]  {applause: 2}
- lasse: "Och nu – friskotek! Men vinden har tagit badbollarna!"  [N]

**Stages:**
1. `rabbits({ mesh: 'badboll', count: 6, near: 'friskotek', rMin: 6, rMax: 30, timer: 75, text: 'Plocka kulor! Plocka med höger… plocka med vänster!', barLabel: 'KULOR', gotText: 'Plocka med höger!', failText: 'Bollarna rullade ner till stranden.', radio: [['berra', 'Kolla storken!'], ['robban', 'Att de bara orkar, våra storkar…']] })`
   text [F]; gotText [F*]; failText [N]; radio [F](t) ×2 (the research does not say who).
2. `goto({ to: 'friskotek', radius: 5, text: 'Lämna bollarna till Lasse' })`

**Outro** (`outroPlace: { lasse: ['friskotek', 0, 1.5], angerud: ['friskotek', 2.5, 1.0] }`):
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
- stig: "Det var julmat – i julklappen. Och väskan är borta."  [F*]
- ole: "Tenk ikke mer på det. Vi fikser en ny julegave."  [F]
- stig: "Undrar vad dalahäst heter på spanska."  [F]
- ole: "Cabalho folkloristico…"  [F]
- ole: "Det fikser vi. Vi fikser alt!"  [F]

**Stages:**
1. `getInCar({ text: 'Hoppa in i en bil' })`
2. `pickup({ who: 'ole', name: 'Ole', at: 'flamencoDrive', hello: 'Til markedet!' })`  [N]
3. `goto({ to: 'marknad', radius: 9, inCar: true, passenger: 'ole', text: 'Till marknaden' })`
4. `haggle({ at: 'asnestand', who: 'souvenir', partner: 'ole', start: 500, steps: [400, 300, 200], zones: [0.30, 0.22, 0.15], speeds: [0.8, 1.1, 1.4], maxMiss: 3, pay: 200, text: 'Pruta! Tryck E när markören är i det gröna', barLabel: 'PRIS', failText: 'Säljaren stängde ståndet.', lines: {...} })`  (texts [N])
   - `start`: souvenir "Hallå där!" [F] · ole "Hvor mye?" [F*](t) · souvenir "500 pesetas." [F] · ole "To hundre?" [F*](t)
   - `hit[0]`: ole "Jeg gir deg to hundre. Det er… 18 norske kroner." [F] · souvenir "400 pesetas. Titta, den är jättelustig." [F]
   - `hit[1]`: ole "Så morsom er den ikke. To hundre." [F*] · souvenir "300 pesetas! Sista pris!" [N]
   - `hit[2]`: ole "To hundre er siste bud." [F]
   - `miss`: souvenir "¡No, no, no!" [N] (price +50, shown on the bar)
   - `win`: ole "Første, andre, tredje – to hundre pesetas!" [F*](t) · souvenir "Kör till." [F](t) · souvenir "Por favor." [F] · souvenir "Jävla smålänningar!" [F]
   - On win: `game.pay(200)` (Ole pays if short: radio ole "Jeg spanderer!" [N]).
5. `grab({ at: 'asnestand', mesh: 'asna', text: 'Ta åsnan' })`
6. `goto({ to: 'supermercado', radius: 8, inCar: true, passenger: 'ole', text: 'Leta knäckebröd – samma sort som i julklappen' })`
7. `grab({ at: 'supermercado', mesh: 'knacke', text: 'Ta ett SPORT-KNÄCKE-paket', say: ['stig', 'Det är ungefär så här stort.'] })`  [F]
8. `scene({ frame: ['ole', 'stig'], lines: [['ole', 'Og så maler vi den rød.', { cut: 'ferreteria' }], ['stig', 'Och blommor där.', { cut: null }]], doneCue: { flash: 'rgba(216,50,30,.4)', toast: 'Åsnan är nu en dalahäst. Nästan.' } })`  [F*](t) · [F](t) · toast [N]
   (played in the car in the Centro Nórdico lot right after the knäcke grab: `frame` alone keeps
   both seated, their positions are live, §9.2; the cut shows the FERRETERÍA front, so there is no
   separate drive 36 m down the mall)
9. `goto({ to: 'vikingbar', radius: 7, inCar: true, passenger: 'ole', timer: 80, fragile: { label: 'SKICK', failText: 'Färgen blev förstörd!' }, text: 'Kör försiktigt till Viking Bar – färgen är våt!' })`  [N]
10. `goto({ to: 'vikingbar', radius: 2.5, onFoot: true, text: 'Lämna paketet i baren' })`

**Outro** (`outroPlace: { carmencita: ['vikingbar', 0, 1.5], angerud: ['vikingbar', 2.5, 1.2] }`):
- stig: "Ett paket till Viking Bar. Det är till en moster."  [N]
- carmencita: "Jag lägger det bakom disken."  [N]  {toast: 'Senare samma dag…'}
- angerud: "Buenas dias, lilla vikingen. Har paketet kommit?"  [F]  {cut: 'vikingbar'}
- angerud: "God jul, moster."  [F] (he reads the card)
- angerud: "Hur såg han som lämnade in det ut?"  [F]
- carmencita: "Han var lång, mörkhårig… hade glasögon och mustasch."  [F]
- angerud: "Då är det grönt."  [F]  {cut: null}

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
- berra: "Det är ju fan vad solen tar här nere, Robban."  [F]
- berra: "Ska vi ta Pepes Bodega i dag eller ska vi sola?"  [F]
- robban: "Men va fan, vi kan väl ta det lite lugnt! Vi har ju semester!"  [F]
- berra: "Vi är på södra Gran Canaria och havet är där, va. Då måste bodegan ligga ditåt."  [F]
- berra: "Du, terroristen, du har ju bil. Kör oss!"  [N]

**Stages:**
1. `getInCar({ text: 'Hoppa in i en bil' })`
2. `pickup({ who: 'berra', name: 'Berra', at: 'flamencoBar', rider: 'robban', hello: 'Ditåt!' })`  [N]
3. `goto({ to: 'playa', radius: 14, inCar: true, passenger: 'berra', text: 'Bodegan ligger ditåt – mot havet!', radio: [['robban', 'Fan Berra, ja ä tösstig.'], ['berra', 'Fan Robban, du har ingen karaktär!']], doneCue: { radio: ['berra', 'Ingen bodega här. Då ligger den åt andra hållet.'] } })`  [F] [F] · doneCue [N]
4. `goto({ to: 'vischan', radius: 14, inCar: true, passenger: 'berra', timer: 110, text: 'Leta inåt land', radio: [['berra', 'Det här är ju rena vischan. Vi måste ha kört för långt.'], ['robban', 'Fan, vad jag är törstig.']], overhear: [{ at: 'eslovVag', r: 25, radio: true, lines: [['berra', 'Heja Eslöv!'], ['robban', 'Herre jävlar!']] }] })`  [F*] (the film's "gått", said on foot) · [F] · [F] ×2
5. `dropoff({ who: 'berra', at: 'vischan', riderOff: true, text: 'Stanna vid tomatfälten' })`  [N]
6. `scene({ frame: ['berra', 'stig'], lines: [['stig', 'Jag kör inte längre på grusvägen. Jag har anlag för åksjuka.'], ['berra', 'Jag går inte en meter till. Vi liftar.']], doneCue: { toast: 'En grisbil stannar…' } })`  [N] · [F] · [N]
7. `follow({ type: 'grisbil', carName: 'grisbilFollow', driver: 'grisbonde', riders: ['berra', 'robban'], hideRiders: true, start: { lane: [[0, 2], [1, 2]], t: 12 }, via: [[1, 2], [1, 1], [2, 1]], to: 'grisfestGate', maxDist: 70, cruise: 12, wobble: 0.12, text: 'Följ grisbilen – Berra och Robban har liftat!', radio: [['robban', 'Fan, de luktar.'], ['berra', 'Skit i det. Vi slipper gå.'], ['robban', 'Snacka om grisfest.']] })`  [N] · [F](t) ×3
   (`via` given as `[i, j]` node pairs; `start.lane` = edge from node (0,2) to (1,2), 12 m in; the
   route runs east along z = −200 from node (2,1) and ends at the kerbside `grisfestGate` 40 m
   ahead, ≈ 270 m in all (§9.2 `follow`: `to` must be kerbside and ahead of the last via node).
   Riders are busts in the bed; the berra/robban NPCs are hidden for the stage and re-shown in
   stage 8.)
8. `getInCar({ missionCar: 'grisbilFollow', any: false, passenger: 'berra', rider: 'robban', text: 'Grisbonden lånar ut grisbilen – hoppa in!', say: ['grisbonde', 'Ta bilen, señor. Ställ den vid hotellet – jag hämtar den på torsdag.'] })`  [N]
   (stage init unseats the `grisbonde` driver to the roadside.)
9. `destroy({ type: 'guardia', carName: 'guardiaJeep', driver: 'guardia', spawn: { lane: [[3, 1], [3, 2]], t: 25 }, noExplode: true, timer: 60, lockMeter: true, barLabel: 'JEEPEN', text: 'Guardia Civil såg grisarna – stoppa jeepen innan den hämtar förstärkning!', failText: 'Jeepen hann fram till kasernen.' })`  [N] (invented, §1.6)
   - The jeep drives away (flee AI); wrecked, it stops in steam and two officers climb out shaking
     their fists. It is a mission target (no SKANDAL for ramming it; `lockMeter`).
10. `goto({ to: 'flamencoBack', radius: 10, inCar: true, passenger: 'berra', timer: 120, text: 'Kör hem grisarna till hotellet!', failText: 'Ni kom aldrig fram.' })`  [N]

**Outro** (`outroPlace: { berra: ['bodega', -1.6, -1.0], robban: ['bodega', 1.6, -1.0] }`, both facing **away** from the shop; first line cues the camera on the sign; the answering-machine call is Angerud's panic after opening the package, so it comes before Levander's reaction, in film order):
- robban: "Ja, herre jävlar, minns du Benidorm? Snacka om grisfest!"  [F]  {cut: 'bodega'}
- berra: "Var jag med där? Hade jag kul?"  [F]
- berra: "Pepes Bodega… Den måste ligga nånstans, Robban."  [N]  {cut: null}
- pax: "Hytt två!"  [F](t)  {cut: 'telefon', toast: 'Samtidigt har direktör Angerud öppnat sitt paket…'}
- levander: "Detta är dr Levanders automatiska telefonsvarare. Solariet, flygrädslekliniken, bantningen och örtshopen är stängda över jul."  [F]
- levander: "Viktiga meddelanden kan lämnas till hotell Ambassadör i Åre."  [F]
- levander: "En målad åsna…? Idén med paketet var idiotisk redan från början."  [F]  {toast: 'Senare, i Åre…'}
- levander: "Nu måste du få tillbaka pengarna. Snacka med honom. Han vill kanske ha hittelön. Gör nåt!"  [F]
- angerud: "Man måste ha mycket svenska pengar med sig hit… om man säger."  [F]  {cut: 'flamencoPool', place: {angerud: ['flamencoPool', 1.2, 1.0]}}
- angerud: "Men det är ju inte samma sak att hitta något som att stjäla."  [F]
- angerud: "För om man hittar något, så kan man få hittelön. Tänk på det."  [F]  {sfx: 'slap'}
- stig: "Aj! Det ska jag göra."  [F]
- siv: "Vad konstig han var!"  [F]
- majsan: "Det är kombinationen av sol och…"  [F]  {cut: null}

Unlock toast: `Upplåst: <b>Grisbilen</b> – parkerad vid Hotell Flamenco. Den luktar.` [N]

---

### 8.10 · index 9 · `ropavieja` · "Gamla kläder" · `siv` @ `flamencoPool` · island · 700

Fun: a tail mission with a **minimum** distance: stay close enough not to lose José, far enough that
he doesn't see you. The reveal: his mother is sitting in the back seat the whole time.

`extra: ['majsan']`.

**Intro:**
- siv: "Han heter José. Och han jobbar inte på pizzeria."  [F*] (a plane line, relocated to the pool)
- majsan: "Datatekniker."  [F](t)
- siv: "Äkta spansk restaurang. Klockan sju."  [F*]
- majsan: "Ta pepparn. Om han blir närgången."  [F*]
- majsan: "Stig-Helmer, kan inte du hålla ett öga på dem? Diskret."  [N]

**Stages:**
1. `getInCar({ text: 'Hoppa in i en bil' })`
2. `follow({ type: 'hatch', color: 0x2a4fa8, carName: 'joseBil', driver: 'jose', passenger: 'siv', riders: ['mamma'], start: { lane: [[5, 3], [4, 3]], t: 12 }, via: [[4, 4], [3, 4]], to: 'grillpacoCurb', maxDist: 75, minDist: 14, minGrace: 2, minText: 'José såg dig! Håll avståndet.', cruise: 10, text: 'Följ José – men inte för nära!', radio: [['jose', 'Jag ska bjuda dig på ett ställe som inga turister kommer till.'], ['siv', 'Det låter ju trevligt.'], ['jose', 'Äkta spanska maten på en restaurang.']] })`
   minText/text [N]; radio [F*] · [F] · [F*]. The rear rider bust is `mamma` (visible gag). Route
   ≈ 250 m: south on x = 40, then west on z = 40, ending kerbside at `grillpacoCurb` 20 m past
   node (3,4) (§9.2 `follow`); the outro still places the family at `grillpaco`.
3. `goto({ to: 'plaza', radius: 4, onFoot: true, text: 'Parkera och spana diskret från fontänen' })`  [N]

**Outro** (`outroPlace: { jose: ['grillpaco', 0, 0], siv: ['grillpaco', 1.2, 0], mamma: ['grillpacoMamma', 0, 0] }`, outro camera `['jose', 'siv']`):
- jose: "Kanarisk specialitet! Ropa vieja – gamla kläder."  [F]
- siv: "Vad sa du?"  [F]
- jose: "Gamla kläder. Det är ungefär som pyttipanna."  [F]
- jose: "Är det säkert att det inte gör nåt att mamma följde med?"  [F]  {cut: 'grillpacoMamma'}
- siv: "Vill hon inte sitta här?"  [F]
- jose: "Nej, hon vill inte vara i vägen."  [F]  {cut: null}
- siv: "Jag fick användning för din peppar."  [F]  {toast: 'Dagen efter, vid poolen…', place: {siv: ['flamencoPool', 2, 0], majsan: ['flamencoPool', -2, 0]}, cut: 'flamencoPool'}
- siv: "Han kom och hämtade mig. Gissa vem han hade med sig… Morsan!"  [F]
- siv: "Jag ska satsa på Ole nu. Jag har inga fördomar mot norrmän."  [F]
- majsan: "Nej, bara de inte går på tur…"  [F]  {cut: null}

---

### 8.11 · index 10 · `fataga` · "En skock får" · `majsan` @ `flamencoPool` · island · 800 · **P1 (cut first)**

Fun: pool small talk, a chase after the excursion bus into the mountains, and José's mother turning
the tourists' pity into a sheep stampede you have to round up.

`extra: ['siv']`.

**Intro:**
- stig: "Om du köper en brödrost, och det står 'Kontrollerad av G17', så är det jag."  [F]
- majsan: "Själv brukar jag säga att jag går på gatan."  [F*]
- majsan: "Gillar du fotboll också?"  [F](t)
- majsan: "Du, vill du smörja in mig på ryggen?"  [F](t)
- majsan: "Ta inte för mycket, då kan det börja koka."  [F](t)
- siv: "Lasses utflyktsbuss till Fataga har redan gått! Ta bilen, Giraffen!"  [N]

**Stages:**
1. `getInCar({ text: 'Hoppa in i en bil' })`
2. `pickup({ who: 'majsan', name: 'Majsan', at: 'flamencoDrive', rider: 'siv', hello: 'Kör!' })`  [N]
3. `follow({ type: 'bus', carName: 'utflyktsbuss', driver: 'affe', start: { lane: [[3, 2], [3, 1]], t: 14 }, via: [[3, 1], [2, 1], [1, 1]], to: 'fatagaBus', maxDist: 70, cruise: 12, text: 'Följ utflyktsbussen till Fataga', radio: [['lasse', 'Fataga är en av de få ursprungliga byar som finns kvar på Gran Canaria.'], ['lasse', 'Om ni vill köpa deras broderade dukar, så pruta inte. Prutning och sånt kan ni hålla på med på marknaden.']] })`  [N] · [F] ×2 (radio voiced by Lasse, the bus driven by Affe). The bus stops kerbside at
   `fatagaBus`, 40 m west of node (1,1); the scene and the outro use `fataga`/`fatagaFold`.
4. `scene({ place: { fruStorch: ['fataga', -2, 2], mamma: ['fatagaDukar', 0, 0], siv: ['fataga', 2, 2], majsan: ['fataga', 1, 3] }, frame: ['mamma', 'fruStorch'], lines: [['fruStorch', 'Stackars människor som lever så här.'], ['mamma', 'Stackars människor. Släpas runt på dagarna som en skock får…!'], ['mamma', '¡Las ovejas!', { sfx: 'baa' }]] })`  [F](t) · [F] · [N]
5. `rabbits({ mesh: 'faar', count: 6, near: 'fataga', rMin: 10, rMax: 35, timer: 80, text: 'Fånga fåren åt Josés pappa', barLabel: 'FÅR', gotText: 'Bäää!', failText: 'Fåren sprang hela vägen till Maspalomas.' })`  [N]
6. `goto({ to: 'fatagaFold', radius: 4, text: 'Tillbaka till fårfållan' })`  [N]

**Outro** (`outroPlace: { pappa: ['fatagaFold', 1.5, 0], mamma: ['fatagaDukar', 0, 0], siv: ['fatagaDukar', 2, 1.5], majsan: ['fatagaDukar', 3, 1.5] }`):
- pappa: "¡Gracias, señor!"  [N]
- mamma: "Det är hon som vill ta min Josito ifrån mig."  [F]
- majsan: "Ska du inte köpa dukar av svärmor?"  [F](t)

---

### 8.12 · index 11 · `grisfest` · "Grisfesten" · `ole` @ `flamenco` · island · 1000 · `cost: 800` · night

Fun: the film's big set piece as a chain: flowers, a night race against Gabbe's bus, a
plate-smashing frenzy, the dance, Tonga Tonga, "Bärra hem Berra", and the porter scene.

`cost: 800` ("Grisfesten kostar 800 pesetas" [F*]) is charged when the intro ends; **Ole pays** if
the player is short. Checkpoints at stages 3, 4, 5 (4 and 5 carry `retryAt: 'dansgolv'`; a retry
re-applies stage 2's `startCue` night sky and `vals`, §9.4 item 3). `onEnd`: on complete → banner `MORGONEN EFTER`
/ `Julafton på Gran Canaria` [N] + palette `day` + tune `sol`; on fail/abort → palette `day` + tune
`sol` (no banner).

**Intro:**
- ole: "Skal du ha B-vitaminer? Bra for leveren. Grisefest, vet du. Ta to."  [F]
- ole: "Og jeg har C-vitaminer… jerntabletter, ginseng, tannkrem…?"  [F*]
- ole: "Du, de er fine de rødhårete. Vi skulle ha satt inn et støt der."  [F]
- ole: "Vi kan be resepsjonen sette en blomster på rommet deres."  [F*](t) (rendered in Norwegian: "blomster" is Ole's word)
- ole: "Blomster? … Meloner? Agurker? Bananer?"  [F]
- stig: "Men blommor… Gör man så i Norge?"  [F](t)
- ole: "Blomsterspråket er internasjonalt."  [F]
- ole: "Fikser du ikke damer på grisefesten, da er det slutt. I kveld setter vi inn støtet!"  [F]

**Stages:**
1. `rabbits({ mesh: 'blomma', flee: false, count: 5, near: 'flamenco', rMin: 8, rMax: 40, timer: 70, text: 'Plocka blomster till Siv och Maj-Britt', barLabel: 'BLOMSTER', gotText: 'Blomster!', failText: 'Blommorna vissnade.', radio: [['ole', 'Man må skifte vannet hver fjerde time og gi dem en hodepinetablett.']] })`  [N] · radio [F*]
2. `getInCar({ text: 'Hoppa in i en bil – det börjar skymma', startCue: { sky: 'night', music: 'vals' } })`  [N]
3. `race({ who: 'gabbe', type: 'bus', carName: 'nattbuss', cruise: 17, playerPassenger: 'ole', start: { lane: [[3, 3], [3, 2]], t: 14 }, checkpoints: [[3, 2], [4, 2], [4, 1], [3, 1]], finish: { x: -80, z: -200 }, text: 'Bussen till grisfesten går nu – kom först!', radio: [['gabbe', 'Grisfestbussen går nu – sista man bjuder på sangrian!']], checkpoint: true })`  [N] · radio [N] (§1.5: the song already has its one spoken line in mission 7)
   (start: the road on SunTrip's west side (x −40) heading north; route ≈ 350 m north → east →
   north → west to the farm gate. `start.lane` makes the kind compute `{x, z, yaw}` with
   `laneSpot`; the player's car goes on that right-hand lane spot and Gabbe's bus on the left lane
   beside it, `spot − r·2·LANE` with `r = (−cos yaw, sin yaw)`, i.e. side by side across the road,
   never offset along world z (§9.2). Fail text = the kind's default `${name} vann!` → "Gabbe
   vann!".)
4. `smash({ type: 'tallrikar', area: { lm: 'dansgolv', r: 22 }, count: 10, timer: 40, lockMeter: true, onFoot: true, text: 'Porslinskross! Krossa tallrikarna medan bandet spelar', barLabel: 'TALLRIKAR', failText: 'Bandet slutade spela.', radio: [['pax', 'Vad skickliga de är!']], checkpoint: true, retryAt: 'dansgolv' })`  [N] · radio [F](t)
5. `scene({ place: { majsan: ['dansgolv', 1, 0], siv: ['dansgolv', 2.5, 0.5], ole: ['dansgolv', -1.5, 0.5] }, frame: ['majsan', 'stig'], checkpoint: true, retryAt: 'dansgolv', lines: [...] })`:
   - ole: "Neida, det er bare å spørre: Skal vi danse! Eller kjør litt større: Sånn! … Voulez-vous danse avec moi? Fransk."  [F]
   - stig: "Jag är skraj att de ska nobba."  [F]
   - majsan: "Vill du dansa med mig?"  [F]
   - stig: "Får jag lov…"  [F](t)  {anim: {who: ['stig', 'majsan'], flag: 'dance', secs: 6}}
   - siv: "Nu blev hon uppbjuden."  [F](t)
   - ole: "Heia Norge!"  [F]  {anim: {who: 'ole', flag: 'dance', secs: 4}, applause: 2}
   - siv: "Majsan, ta med dig giraffen så går vi på Tonga Tonga."  [F]
6. `goto({ to: 'tongatonga', radius: 10, inCar: true, timer: 120, text: 'Till Tonga Tonga!' })`  [N]
7. `scene({ place: { ole: ['tongatonga', -2, 1], majsan: ['tongatonga', 1, 1], siv: ['tongatonga', 2, 1], robban: ['tongatonga', 0, 3], berra: ['tongaLot', 0, 0] }, anim: { berra: 'slump' }, lines: [['ole', 'Samba er fine greier!', { music: 'samba' }], ['robban', 'Kan du hjälpa mig bära hem Berra?'], ['stig', 'Vilket snack! "Bärra hem Berra!"']] })`  [F] ×3
8. `pickup({ who: 'berra', name: 'Berra', at: 'tongaLot', rider: 'robban', hello: '…zzz' })`  [N]
9. `goto({ to: 'flamencoDrive', radius: 10, inCar: true, passenger: 'berra', text: 'Kör hem till Hotell Flamenco' })`  [N]
10. `carry({ who: 'berra', to: 'flamencoRecepcion', radius: 2.2, walkSpeed: 3.2, failOn: { fall: true }, text: 'Bärra hem Berra!', failText: 'Berra vaknade och började sjunga.' })`  [F*] · [N] — **P1**; P0 fallback:
    `dropoff({ who: 'berra', at: 'flamencoDrive', text: 'Släpp av Berra vid hotellet' })`.

**Outro** (night; `outroPlace: { portier: ['flamencoRecepcion', 0, 0], angerud: ['flamencoRecepcion', -1.6, 1.2], carmencita: ['flamencoRecepcion', -2.4, 1.2], majsan: ['flamencoPool', 0, 0], stig: ['flamencoRecepcion', 1.5, 3.0] }`; `stig` matters for the P0 `dropoff` fallback, which ends at `flamencoDrive`):
- portier: "Det är förbjudet att ta med damer på rummet. Men för 500 pesetas kanske vi kommer överens."  [F]
- angerud: "500 pesetas…? Det här är ju min fru."  [F]
- portier: "Det tror jag inte."  [F]
- angerud: "En cigarrett, älskling?"  [F](t)
- carmencita: "Nej tack. Jag röker inte."  [F](t)
- portier: "Jaså, din fru…?"  [F](t)
- angerud: "Måtte djävulen ta alla fruntimmer!"  [F]  {cut: 'flamencoBalcony'}
- majsan: "Vad härligt det är med de här varma nätterna. Snart ska man hem till slasket igen. Jag vill inte åka hem."  [F*]  {cut: 'flamencoPool'}
- majsan: "Jag gruvar mig lite för flygresan."  [F*]
- stig: "Jag kan flyga, jag är inte rädd."  [F*]  {anim: {who: 'stig', flag: 'wings', secs: 3}}
- majsan: "Nu skulle Levander se oss!"  [F*]
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
- stig: "Javisst, det är julafton i dag."  [F](t)  {sfx: 'knock', place: {hittegods: ['flamencoPatio', 1.5, 2.0]}}
- hittegods: "Hammarby…?"  [F]
- stig: "Ja!"  [F]  {toast: 'Väskan är tillbaka!'}
- hittegods: "Hittelön."  [F](t)  {coins: -25}
- stig: "Tack så mycket."  [F](t)
- lasse: "Alla är välkomna på julfesten. Men man måste ha julmat och en julklapp för 100 pesetas."  [F*]  {pa: true}
- ole: "Da tar jeg med sild og Stig-Helmer."  [F*]
- stig: "Norsk humor."  [F](t)

`cost: 100` charged after the intro (Ole pays if short).

**Stages:**
1. `collect({ who: ['herrStorch', 'fruStorch', 'berra', 'majsan'], findAt: { herrStorch: ['playa', 0, 0], fruStorch: ['kyrka', 0, 2], berra: ['bodega', -2.0, 0.5], majsan: ['marknad', 1, 1] }, sendTo: { herrStorch: ['flamencoPool', 4, 2], fruStorch: ['flamencoPool', 5, 2], berra: ['flamencoBar', 0, 0], majsan: ['flamencoPool', -2, 0] }, inCar: true, radius: 1.6, carRadius: 4.0, timer: 200, text: 'Samla ihop gästerna till julfesten', barLabel: 'GÄSTER', failText: 'Julfesten började utan dem.', lines: {...} })`  [N]
   - herrStorch: stig "Herr Storch! Julfesten!" [N] · herrStorch "Jag ska bara filma lite till." [N]
   - fruStorch: stig "Fru Stork, julfesten börjar!" [N] · fruStorch "Vi heter faktiskt Storch, inte Stork." [F*]
   - berra (behind the hotel, staring at nothing in particular): stig "Berra! Julfesten!" [N] · berra "Jag kommer, jag ska bara kolla en grej." [N]
   - majsan (at the market, hiding something): majsan "Titta inte! Det är en hemlighet." [N]
2. `goto({ to: 'flamencoPool', radius: 8, text: 'Till julfesten vid poolen!', startCue: { music: 'jul', outfit: { who: 'lasse', name: 'jul' } } })`  [N]
3. `scene({ place: { lasse: ['flamencoPool', 0, 3], ole: ['flamencoPool', -1.5, 1], herrStorch: ['flamencoPool', 3, 2], fruStorch: ['flamencoPool', 4, 2], majsan: ['flamencoPool', -2.5, 0.5], siv: ['flamencoPool', -3.5, 1], berra: ['flamencoPool', 5, -1], robban: ['flamencoPool', 6, -1] }, lines: [...] })` — the party payoffs:
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
   - pax: "De där svenskarna är heltokiga!"  [F](t)  {music: 'smaGrodorna'}
   - stig: "Julmaten från väskan… och knäckebrödet."  [N]  {anim: {who: 'stig', flag: 'butterKnife', secs: 3}}
   - ole: "Hva i all verden…"  [N]  {sparkle: true, sfx: 'pryl'}
   - stig: "Femtio… tusen… kronor. I knäckebrödet."  [N]
   - ole: "Femti tusen… Rio, Stig-Helmer! Stranda, jentene og samba!"  [F*]
4. `scene({ cam: { at: 'rum113', dist: 6, height: 3 }, place: { angerud: ['rum113', 0, 0.8], stadare: ['rum113', -1.5, 1.6], saljare: ['rum113', 1.5, 1.6], mamma: ['rum113', -2.5, 2.4], pappa: ['rum113', -3.2, 2.4], carmencita: ['rum113', 2.5, 2.4], jose: ['rum113', 3.2, 2.4], siv: ['rum113', 0, 3.2] }, lines: [...] })` — the chaos at room 113 (heart attack **off-screen**):
   - stadare: "Limpio!"  [F]
   - saljare: "Jag var tvungen att sälja tomten i morse. De skrev på."  [F]
   - mamma: "Ni har dragit skam över vår familj!"  [F](t)
   - carmencita: "Det är inte han. Den andre!"  [F](t)
   - mamma: "Så gammal! Du skickar mig i graven!"  [F](t)
   - stadare: "God jul! Hoppsan. Stör jag?"  [F]
   - siv: "Gösta, ska du inte med på julfesten?"  [F]
   - angerud: "Ut! Ut!"  [F]  {sfx: 'doorSlam', flash: 'white', hide: ['angerud']}
   - pa: "…"  {sfx: 'ambulance', toast: 'En ambulans hämtade direktör Angerud. Han kommer att bli bra igen.'}  [N] (a silent PA line carrying the caption; the text shown is "…")
5. `mantra({ duet: 'majsan', at: 'flamencoPool', radius: 4, secs: 4, text: 'Visa Majsan övningen – håll J', barLabel: 'JAG KAN FLYGA', startCue: { sky: 'sunset', place: { majsan: ['flamencoPool', 1.2, 0] }, say: ['majsan', 'Visa mig igen. Inför hemresan.'] } })`  [N] ×2

**Outro** (sunset, both in the `wings` pose):
- stig: "Jag kan flyga, jag är inte rädd."  [F]
- majsan: "Jag kan flyga, jag är inte rädd."  [F*] (our staging of the binding duet; in the film Stig
  says it to Majsan at night, research-plot §8.1; the "two voices" before Rio are probably
  Levander's clinic, §8.4)
- ole: "Og så Rio!"  [F*]  {endCard: true}

**After the outro** (index 13 = complete): `game.playEndCard()` (P1; §11.7) → Rio card → back to the
island: `unlock('bodega')` (lit sign, map label "Pepes Bodega", Berra and Robban posted at
`bodega` in free roam with chatter "Pepes Bodega. Glöm aldrig det, du." [F]), banner
`NUEVA ESTOCOLMO KLARAT!` / `God jul – och tack för resan!` [N]. P0 fallback: skip the card, show
the banners.

---

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
}
```

**Normative:** every kind factory copies exactly these keys from its options onto the returned
stage object: `checkpoint panicFails lockMeter shame oleBarks timedCues startCue doneCue retryAt`
(Bigmouth's `({...pickup(), shame: true})` pattern). No other option name is read by the runner.
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
| `getInCar` | `car?` (named car, recreated if wrecked) · `missionCar?` (name of a car in `m.cars`) · `passenger?` (NPC seated in that car at init) · `rider?` / `riders?` (decorative busts) · `hideRiders?` (hide those NPCs for the mission) · `any = true` (set `any: false` whenever `car`/`missionCar` is given and only that car will do) · `say?` | player in a car (the named one if `any:false`) | `stage.car` |
| `goto` | `to` · `radius = 7` · `timer?` · `failText = 'Tiden är ute!'` · `inCar?` · `onFoot?` (must arrive on foot; sub "Kliv ur bilen!") · `passenger?` · `stop?` (speed < 2 to finish) · `smooth?: {label, failText}` · `fragile?: {label, failText}` · `fearRate?` (+n/s FLYGRÄDSLA) · `radio?: [[who, text, {gap?, ...cue}?]]` (gap = s after the previous line, default 9–13 random) · `overhear?: [{at, r, lines, radio?}]` · `awaitOverhear = false` (the stage cannot finish while a started overhear is still playing) | within radius (and stopped) / timer, bar | `stage.dest` |
| `pickup` | `who` · `name` · `at` · `hello?` · `rider?` (bust added beside the passenger; the rider NPC is hidden while it rides) · `hideRiders?` (hide the rider NPC already at init) · `text?` | NPC seated as passenger | `stage.npc` |
| `dropoff` | `who` · `at` · `riderOff?` (remove the rider bust, show the rider NPC beside) · `text` | NPC out at `at` | `stage.dest` |
| `follow` | `type` · `color?` · `carName?` · `driver` (key; `who` accepted as alias) · `passenger?` (NPC in the **followed** car) · `riders?` (busts, removed when the stage ends) · `hideRiders?` (hide those NPCs; they stay hidden until a later stage seats/places them or the mission ends) · `start` (landmark / `{x,z,yaw}` / lane spot) · `via` · `to` (**kerbside**, see below) · `maxDist` · `minDist?` · `minGrace = 2` · `minText?` · `cruise = 12` · `wobble?` · `arriveDist = 35` · `radio?: [[who, text] \| text]` (string = driver speaks) | arrived and within `arriveDist` / lost > 3 s beyond `maxDist`, closer than `minDist` for > `minGrace` s, car wrecked | `stage.car`, `stage.minDist` |
| `rabbits` | `mesh = 'badboll'` (`badboll faar blomma gris`) · `count` (**≤ 6** for the test) · `near` · `rMin = 18` · `rMax = 55` · `flee = true` (false = static bobbing) · `timer` · `barLabel` · `gotText` · `failText` · `radio?` · `onFoot?` | all caught / timer | `stage.list[] {x, z, alive}` |
| `race` | `who` (opponent driver) · `type` · `color?` · `carName?` · `cruise` · `start` (a lane spot, or `{x, z, yaw}`; the player goes on that spot, the opponent on the lane to its left, `spot − r·2·LANE` with `r = (−cos yaw, sin yaw)`: offsets are **lateral to `yaw`, never along world z**) · `checkpoints: [[i, j]]` · `finish: {x, z}` · `playerPassenger?` (NPC seated in the **player's** car at init) · `oppPassenger?` (old `passenger`: NPC in the opponent car) · `radio?` | all checkpoints first / opponent first ("`${name} vann!`") | `stage.cps, stage.pi, stage.opp, stage.oi` |
| `destroy` | `type` · `carName?` · `driver = 'guardia'` (bust def key; replaces `CHARS.shame`) · `spawn?` (landmark / `{x,z,yaw}` / lane spot; default: random node 70–130 m away) · `timer` · `cruise = 20` · `damageScale = 1.5` · `noExplode = false` (wreck stops in steam, occupants step out, no fire) · `barLabel = 'MÅL'` · `failText = 'Den kom undan!'` | wrecked (`m.data.wreck`) / timer | `stage.car` |
| `grab` | `at?` (or `m.data.wreck`) · `mesh = 'pryl'` (any `COLLECT_KINDS` key) · `scale = 1.8` · `say?` · `gotText?` | touched | `stage.item` |
| `collect` | `items?: [{x, z, y?} \| landmark]` + `kind` + `motion = 'spin'` (`spin bob roll`) · **or** `who?: [keys]` with `standAt?` (flight: `{key: [x, z]}` world, NPC unseated and stood there) / `findAt?` (island: `{key: [lm, dx, dz]}`) and `seatOnTouch?` (flight: back to its HOMES seat) / `sendTo?` (island: `{key: [lm, dx, dz]}`) · `lines?: {key: [[who, text]]}` (played as bubbles on touch) · `radius = 1.0` · `carRadius = 4` · `inCar = false` (true: touching from a car counts, within `carRadius`) · `timer?` · `barLabel` · `failText` | all touched / timer | `stage.list[] {x, z, alive, key?}` |
| `sit` | `seat` · `timer?` · `failText?` | `g.player.seatId === seat` / timer | `stage.seat` (seat object) |
| `interact` | `at` (landmark, `{x, z, y?}` or `(g) => {x, z}`) · `radius = 1.4` · `prompt` · `whileSeated = false` · `seat?` (only from this seat) · `enabled?(g)` · `lines?` (dialogue played on use) · `use?: async (g, m)` · `useCue?` (applied on use, before `lines`) | after use/lines finish | `stage.at` (live `{x, z}`), `stage.ready` |
| `carry` | `item?: 'juice'` (mesh above the head) **or** `who?: key` (NPC over the shoulders; walk only) · `to` · `radius = 1.2` · `walkSpeed?` · `failOn: { bumped = true, fall = true, sprintSecs? }` · `failText` | arrived / failOn | `stage.to` |
| `mantra` | `secs` (scaled) · `at?` + `radius = 2.2` · `seated?: seatId` · `duet?: key` (NPC copies the pose) · `waitPhase?` (also wait for `cabin.phase`) · `fillCue?` (applied when the bar fills; its `phase` only if `cabin.phase` is still the phase the stage started) | bar full (+ phase) / panic if `panicFails` | `stage.t`, `stage.secs` |
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
  `minDist` for more than `minGrace` s fails with `minText`.
- **`collect` roll motion** (flight): items stay in |x − 3000| ≤ 0.45, z velocity 0.6–1.4 m/s,
  reflect at lz +12.5 / −16; the kind subscribes `cabin.onJolt` at init (removed in cleanup) and
  adds ±1.5 m/s per jolt. Items are `Collectible(kind)`.
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
  `stage.inZone` pause meanwhile), `miss` plays as bubbles so the rhythm keeps going.
- **`smash.onFoot`**: a prop broken from a car does not count and is revived at once.
- **`follow` / `race` routes** are cleared at init of abandoned cars (unlocked, unnamed, no driver,
  no AI, not the player's) standing within 3.5 m of a lane point: a route car would otherwise wait
  behind a car the player left on the road in an earlier stage or mission.
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
  (or `cam`) → `game.dialog(lines)` → `endCinematic`.

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
| `phase: name \| [name, { instant, hold }]` · `seatbelt: bool` · `turbulence: [s, secs, {delay}?]` · `trolley: bool` · `blockers: bool` | cabin calls (`phase` animates unless `instant`; `trolley` = `startTrolley`/`stopTrolley`; `blockers` = `setAisleBlockers`) |
| `outfit: {who, name}` | `setPlayerOutfit` / `setNpcOutfit` (re-renders the portrait) |
| `music: name \| {tune, secs}` | `audio.setTune(name)`; with `secs`, revert to the previous tune after; a trad name plays `audio.trad(name)` over the current tune |
| `sky: 'day' \| 'night' \| 'sunset'` | island palette |
| `place: {key: [lm, dx, dz]}` · `hide: [keys]` · `show: [keys]` | `game.placeNpc` / `hideNpc` / `showNpc` |
| `anim: {who: key \| [keys], flag, secs}` | set `ch.anim[flag] = true` for `secs` |
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
  outroPlace?: { key: [lm, dx, dz] },     // placed before the outro; key 'stig' = the player
  outroCam?: 'player' | [a, b] | { at, dist, height },
  onEnd?(g, reason),           // 'complete' | 'fail' | 'abort'
};
```

Runner changes (Phase 0):
1. `MISSIONS = [...FLIGHT_MISSIONS, ...ISLAND_MISSIONS]` from `missions/index.js`.
2. `begin()`: intro cinematic → `if (def.cost) await g.pay(def.cost)` → banner
   `def.title` / `Uppdrag ${index + 1} av ${MISSIONS.length}` → `startMission(0)`.
3. **Checkpoints**: entering a stage with `checkpoint: true` records `cpI`; `retry()` restarts
   from `cpI` with a fresh `m`: it first re-applies, in stage order, the **ambient fields** (`sky
   music phase seatbelt outfit trolley blockers`; `phase` always instant) of the `startCue` and
   `doneCue` of every stage before `cpI` (so a grisfest retry is still at night with `vals`), then
   teleports to `stage.retryAt ?? def.at` and starts the stage. **Rule:** every `checkpoint: true`
   stage whose action happens more than 60 m from `def.at` sets `retryAt` (the Phase-0 `missions`
   scenario asserts it from the data; a stage that repositions the player itself, like `race`, is
   exempt).
4. **Common stage options** applied in `startStage()`: `lockMeter` → `shame.locked = true`
   (else false; pursuit mode only, §7.2); `shame` → `shame.forced`; `startCue` → `game.cue()`
   right before the kind's `init`; `timedCues` ticked in `update()` on scaled stage time;
   `doneCue` on 'done'.
5. **Outro**: exit the car first (`exitCar(true)`); then `outroPlace` (every placed NPC is
   unseated first, §14.3). If `outroPlace.stig` is given, the player is teleported there facing the
   first placed NPC; else, if `outroPlace` is set and the player is more than 8 m from the first
   placed NPC, he is teleported to a level-aware `freeSpot` 2 m in front of that NPC, facing it.
   Speaker = the **first NPC placed by `outroPlace`**; without `outroPlace`, the first outro `who`
   that is an NPC and not `busy`/seated/hidden, moved next to the player with `freeSpot` (skip if
   none). Camera: `outroCam`, else `frame(speaker, player)`, else `frameOne(player)`. (When
   `outroCam` is given the player is not moved, e.g. ropavieja's spying shot.)
6. **Ambience**: `fail()` and `abort()` call `def.onEnd?.(g, reason)` and `g.restoreAmbience()`
   (level palette for the current phase, level tune, `mantraMode = false`); `abort()` also runs
   `cleanupMission()` if needed. `complete()` calls `onEnd(g, 'complete')` after the outro.
7. `cleanupMission()` NPC list = `Object.keys(g.npcs)`; seated home NPCs are re-seated by
   `placeNpcs(true)`; stage-registered interactables, `onJolt` listeners and rider busts are
   removed; hidden riders are shown; flight level: `cabin.setAisleBlockers(false)`; `freezeCar`,
   `carrying`, `holding`, `mantraMode` reset.
8. **After the outro**: `index++` → unlock → save → **if `g.levelFor(index) !== g.level` await
   `g.transitionTo(...)`** → `state = 'idle'` → **`g.placeNpcs(true)`** (giver race fix) →
   toast `Nytt uppdrag: hitta <b>${name}</b> <span class="bang">!</span>` or game complete
   (+ end card).
9. `onBusted()`: fails `bustFails` missions with `METERS.skandal.bustedFailText`.
   `onPanic()`: returns true and fails with `panicFailText` when running and
   `stage.panicFails || def.panicFails`; else false.
10. English strings → `strings.js` keys (§11).

---

## 10. Collectibles, currency, unlocks, outfits, save

### 10.1 Collectible sets (content/island.js `COLLECTIBLES`; generic code in main.js, Phase 0)

```js
COLLECTIBLES = {
  prylar: { kind: 'pryl', motion: 'spin', beam: true, pickup: 'touch', jingle: 'pryl',
    label: 'Oles prylar', marker: 'pryl', icon: 'pryl-icon', bonus: 1000,
    first: ['ole', 'En av dingsene mine! Finn resten, Stig-Helmer.'],               // [N]
    complete: ['ole', 'Det fikser vi. Vi fikser alt!'], completeUnlock: 'samba',     // [F]
    items: [
      { id: 'klocka',     lm: 'pryl_klocka',     line: 'Digital, analog, spansk, norsk, svensk tid, kronometer, og så klokke.' }, // [F]
      { id: 'poolpen',    lm: 'pryl_poolpen',    line: 'Penn som skriver under vannet.' },          // [F]
      { id: 'kalkylator', lm: 'pryl_kalkylator', line: 'Kalkulator – med vekkerklokke!' },          // [F*]
      { id: 'kniv',       lm: 'pryl_kniv',       line: 'Swiss Army Knife… Saks – uten skrutrekker.' }, // [F]
      { id: 'kamera',     lm: 'pryl_kamera',     line: 'Kamera. Skjerpe. Smil.' },                  // [F]
      { id: 'glasogon',   lm: 'pryl_glasogon',   line: 'Mot klor.' },                               // [F]
      { id: 'pung',       lm: 'pryl_pung',       line: 'Å ha penger i når man svømmer.' },         // [F*]
    ] },
  fenor: { kind: 'fena', motion: 'circle', pickup: 'squash', jingle: 'squeak',
    label: 'Hajfenor', marker: 'fena', icon: 'fena-icon', bonus: 1000,
    first: ['lasse', 'Hajar i poolen igen? Ring kliniken!'],                           // [N]
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
  bodega:  { hook: 'bodegaLit', label: ['Pepes Bodega', 'bodega'], home: { berra: ['bodega', -1.5, 0.5], robban: ['bodega', 1.5, 0.5] },
             toast: 'Pepes Bodega har öppnat – på baksidan av hotellet.' },                        // [N]
};
```
P2: `guardiaJeep` (buyable Land Rover that halves SKANDAL gain).

### 10.4 Outfits

Player: `arlanda` (mission 1) → `kostym` (from mission 1's outro, flight, island until buss17) →
`hawaii` (buss17 outro cue; persisted) → `rio` (end card only). NPC outfits by home set from
`LEVEL_OUTFITS` via `levelDef.outfits(g)` (gate set only while `missions.index === 0`, §4.2) and by cue (`ole` `gris` in grisfest stage 5 via cue, `lasse` `jul` in
julafton). Cut fallback: no swaps.

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
- Subtitle (Luckiest Guy): **Sällskapsresan**.
- Line: **Julen 1979. Stig-Helmer är flygrädd.**
- Tagline (italic, small): *"Svenskarna reser inte till någonting… dom reser från någonting."* [F]
  (the film's opening card).
- Buttons: `SPELA` / `Laddar…`.
- Controls card (two columns): `WASD / pilar` gå · kör — `Mus` titta — `Shift` spring —
  `Space` hoppa · handbroms · i planet: håll i dig — `J / klick` sparka · i planet: håll för
  "Jag kan flyga!" — `E` prata · sätt dig · kliv in/ur — `M` karta — `H` tuta — `N` ljud av —
  `R` loss — `Esc` paus.
- Fine print: `Ett hyllningsspel gjort av fans. Inte knutet till filmens upphovsmän – eller till
  SunTrip, som inte finns. Bränsletillägg tillkommer.`
- Background: the live 3D orbit (§4.2 `titleOrbit`) under a 1979 charter-brochure gradient
  `radial-gradient(#f7a21b55, #1c7fb8cc)` with a halftone dot overlay and a rounded "brochure"
  card (cream `#fff8e6`, ink border).

### 11.2 Loading lines (main.js via `S.loading[]`)

`Avisar vingarna…` · `Bygger Nueva Estocolmo…` · `Överbokar Hotell Flamenco…` ·
`Häller 80-procentig rom på vinflaskor…` · `Målar åsnan röd…` · `Ritar mustascher…`

### 11.3 Pause

`Paus` · `Fortsätt` · `Musik: på` / `Musik: av` / `Musik: samba` (P1, after the unlock) ·
`Ljud: på` / `Ljud: av` · `Radera resan` → confirm `Vill du radera resan och börja om på Arlanda?`

### 11.4 HUD elements

| element | text |
|---|---|
| coins | `{n} pta` |
| meter label | `FLYGRÄDSLA` (flight) / `SKANDAL` (island); pursuit suffix (CSS `::after`) ` · ¡ALTO!` |
| speedo unit | `KM/H` (× 3.6); car name = Swedish `spec.name` or `NAMED_CARS[name]` (`buss17`: "SunTrips buss 17", `hyrbil`: "Hyrbilen", `grisbil`: "Grisbilen", `nattbuss`: "Nattbussen", `joseBil`: "Josés bil", `guardiaJeep`: "Guardia-jeepen") |
| dialogue next | `E ▸` |
| minimap rim badge | `N` (island) / `FRAM` (flight) |
| big-map legend | from `game.mapLegend()` (§10.1) |
| prompts | `<b>E</b> Prata med {name}` · `<b>E</b> Kliv in` · `<b>E</b> Ta bilen` · `<b>E</b> Sätt dig` · `<b>E</b> Res dig` · `<b>E</b> Lås in dig` · `<b>E</b> Ta en juice` · `<b>Space</b> Håll i dig!` · `<b>J</b> håll: Jag kan flyga!` |

### 11.5 Engine/stage strings

| key | Swedish |
|---|---|
| getInCar default | `Hoppa in i en bil` |
| out of time | `Tiden är ute!` |
| back in car | `Tillbaka in i bilen!` |
| go back for X | `Åk tillbaka efter {name}!` |
| never leave me | `Lämna mig aldrig igen!` |
| pick up X | `Hämta {name}` |
| slow down | `Sakta in så de kan hoppa in!` |
| go go go | `Kör, kör, kör!` |
| stop the car | `Stanna bilen!` |
| losing / distance / too close | `DU TAPPAR DEM!` / `AVSTÅND` / `FÖR NÄRA!` |
| wrecked X's ride | `Du kvaddade {name}s bil!` |
| lost X | `Du tappade bort {name}!` |
| race places | `1:A · KONTROLL {i}/{n}` / `2:A · KONTROLL {i}/{n}` |
| go | `KÖR!` |
| X won | `{name} vann!` |
| target | `MÅL` |
| got away | `Den kom undan!` |
| caught one | `{label} {n}/{m}` |
| mission banner sub | `Uppdrag {i} av {n}` |
| complete | `UPPDRAG KLART!` sub `+{reward} pesetas` |
| failed | `UPPDRAG MISSLYCKAT` |
| retry prompt | `<b>E</b> Försök igen &nbsp;·&nbsp; <b>Q</b> Ge upp` |
| retry banner sub | `Försök igen!` |
| new mission | `Nytt uppdrag: hitta <b>{name}</b> <span class="bang">!</span>` |
| first start toast | `Prata med <b>Ole</b> i säkerhetskontrollen <span class="bang">!</span> – tryck <b>E</b>` |
| wrecked | `KVADDAD!` |
| reset | `Tillbaka på vägen!` / flight: `Tillbaka i gången!` |
| car busy | `Den är upptagen!` |
| no cars in plane | `Det finns inga bilar i ett flygplan.` |
| space first time | `Space: håll i dig (vid turbulens)` |
| sound | `Ljud av` / `Ljud på` |
| fatal | `Något gick sönder: ` |
| game complete | `NUEVA ESTOCOLMO KLARAT!` / `God jul – och tack för resan!` |
| Ole pays | `Ole betalade {n} pta.` |
| panic idle (`S.panicIdle`, in the cabin) | `Värdinnan följde dig tillbaka till din plats och bjöd på ett glas vatten. Serviceavgift: −50 pta.` |
| panic idle (`S.panicIdleGate`, outside the cabin) | `En SunTrip-värdinna gav dig ett glas vatten vid gate 8. Serviceavgift: −50 pta.` |
| busted | `Guardia Civil tog {n} pesetas i böter` |

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

### 11.7 Banners and end card

- Mission start: `def.title` / `Uppdrag i av 13` (cls `mission`).
- Transition: `LAS PALMAS` / `Soldis och 22 grader varmt.` [F*].
- Grisfest end: `MORGONEN EFTER` / `Julafton på Gran Canaria`.
- **End card** (`game.playEndCard()`, P1, ~10 s, letterboxed): fade to white; camera to `rioCam`
  looking at `rioBoat` with Stig (outfit `rio`), Majsan, Ole (`rio`), Siv placed on the deck and an
  orchestra of busts; tune `samba`; banner `RIO…?` / *"Svenskarna reser inte till någonting… dom
  reser från någonting."* [F] (6 s); fade back; player at `flamencoPool`; banner
  `NUEVA ESTOCOLMO KLARAT!` / `God jul – och tack för resan!`; free roam continues.
- Fallback (cut): only the last banner.

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
- Island: `sol`; pursuit → `skandal` + `siren(true)`; escape/bust → back to `sol`.
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

`setSkyPalette({ top, horizon, fogNear, fogFar, sun, sunI, hemiSky, hemiGround, hemiI })`.

| palette | top | horizon | fog near/far | sun / I | hemi sky / ground / I | cabin window |
|---|---|---|---|---|---|---|
| `gate` (flight: gate, takeoff) | `0x8e99a6` | `0xc7ccd2` | 40 / 300 | `0xdfe8f2` 0.8 | `0xc8d4e0` / `0xf0f4f8` 1.5 | `0xb8c0c8` |
| `clouds` (climb) | `0xe8eef4` | `0xf4f6f8` | 160 / 520 | `0xffffff` 1.0 | `0xffffff` / `0xe8eef4` 1.7 | `0xf8f8f8` |
| `above` (cruise) | `0x1f6fd0` | `0xbfe0ff` | 300 / 900 | `0xfff4dc` 2.6 | `0xe6f2ff` / `0xffffff` 1.6 | `0x7fb8ef` |
| `descent` (approach) | `0x2a86e0` | `0xf2e4c4` | 260 / 820 | `0xffe7b8` 2.8 | `0xd8ecff` / `0xa08060` 1.5 | `0x9ad0f0` |
| `island` (landing, landed; island `day`) | `0x2a86e0` | `0xf2e4c4` | 220 / 760 | `0xffe7b8` 2.9 | `0xd8ecff` / `0xa08060` 1.45 | `0xa8d8f8` |
| `night` (grisfest) | `0x141a3c` | `0x3a2f4e` | 120 / 600 | `0x9fb4ff` 0.9 | `0x5a6aa0` / `0x3a2a20` 0.9 | — |
| `sunset` (julafton mantra, Rio) | `0x3a4fa0` | `0xf7a26b` | 200 / 760 | `0xffb070` 2.2 | `0xffd8b0` / `0x8a5a40` 1.3 | — |

Flight palettes keep `fogNear ≥ 40` so the interior is never fogged. Night: string lights are unlit
`MeshBasicMaterial` bulbs (grisfest block, Kasbah neon).

### 13.4 CSS tokens (style.css; WP-H)

Keep `--ink #1d1426`, `--cream #fff8e6`, `--yellow #ffd23f`. Replace purple/pink with `--sun
#f7c31b`, `--orange #f07a1e`, `--sea #1c7fb8`, `--teal #1e9aa0`, `--terracotta #c0623a`,
`--sand #e8cf98`. Meter fills: `.fear` `linear-gradient(90deg, #6ab0e8, #e0342a)`, `.skandal`
`linear-gradient(90deg, #f7c31b, #d8321e)`. `body.fear-hot` adds a pulsing red vignette.
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
| `src/content/island.js` | new | **G** | `HOMES_ISLAND`, `MAP_LABELS_ISLAND`, `CHATTER`, `OUCH`, `GETUP`, `CARJACK`, `NPC_KICKED`, `COLLECTIBLES`, `UNLOCKS`, `NAMED_CARS`, `LEVEL_OUTFITS_ISLAND` |
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
| `src/actors/drivers.js` | unchanged | none | (accepts duck-typed paths) |
| `index.html`, `style.css` | edit | **H** | §11, §13.4 |
| `tools/shot.mjs`, `tools/lib.mjs`, `tools/scenarios/core.mjs`, `tools/story/common.mjs` | edit/new | none (Phase 2) | harness, `T` API, core scenarios `start walk aerial drive traffic title talk missions views transition` + `levels` (boots into both levels) + `api` (Game API smoke test) |
| `tools/fixtures/full-missions.js`, `tools/scenarios/kinds.mjs` | new (Phase 0b) | none (Phase 2) | the literal §8 missions as a test fixture; scenarios `fullstory` (plays them per §16.3) and `kinds` (option checks) |
| `src/world/blocks/stub.js` | new (Phase 0a) | none | `stubBlock()`: the shared placeholder look of the stub block builders; delete when unused |
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
| `README.md`, `CLAUDE.md`, `Makefile`, `package.json`, `../CLAUDE.md` | edit | none (Phase 2) | docs, `#13 idle`, port 8840, latest-game pointer |

### 14.2 Init order and frame order (main.js, Phase 0)

Init: `initGfx` → `input.init` → `hud.init` → `fx.init` → fonts (Luckiest Guy ≤ 2.5 s) →
`buildTown(scene)` (calls `registerIslandLandmarks()` first, then `streets`, every block via
`BLOCK_BUILDERS[MAP[j][i]]`, `outskirts`, ped loops) → `this.cabin = buildCabin(scene, this)` →
`buildRioCard(scene)` (if present) → `finalizeProps(scene)` → `initCoins(scene)` →
`hud.buildBaseMap()` → `placeWorldCoins()` → `this.cabin.placeCoins()` → parked cars → traffic (20)
→ peds (34) → NPC `Character`s (one per `CHARS` key except `stig`, the radio-only keys `levander
kapten pa guardia pax` and the cabin-owned `vardinna2`; `key` field; hidden until placed, §2.3) →
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

// ---- levels ----
game.levelFor(index) -> 'flight' | 'island'
game.setLevel(name, { index, instant = true } = {})
async game.transitionTo(name)
game.restoreAmbience()                    // palette for level/phase, level tune, mantraMode=false
game.setSky(name)                         // island palettes: 'day' | 'night' | 'sunset'

// ---- NPCs ----
game.npc(key)                             // 'stig' → player
game.charDef(key)                         // CHARS[key]
game.placeNpc(key, lm, dx = 0, dz = 0, yaw?)   // unseat first (car: g.unseat(ch); plane seat:
                                          // cabin.unseatCharacter(ch)), then teleport, show,
                                          // busy = true until placeNpcs(true); key 'stig' = player
game.hideNpc(key);  game.showNpc(key)     // hideNpc unseats first too
game.placeNpcs(force = false)             // §4.5
game.setNpcOutfit(key, name);  game.setPlayerOutfit(name)   // re-render portraits
game.say(target, text, secs = 2);  game.radio(who, text)

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
async game.dialog(lines)                  // lines: [who, text, cue?]
game.cue(c)                               // §9.3
game.wait(secs)

// ---- money / unlocks / end ----
async game.pay(n) -> true                 // Ole pays if short (§10.2)
game.addCoins(n)                          // negative allowed, floors at 0
game.unlock(name)                         // UNLOCKS[name]
async game.playEndCard()                  // §11.7: Phase 0 ships a stub (the two banners only);
                                          // the Rio cinematic is wired in Phase 2 (P1)

// ---- meter hooks ----
game.onPanicIdle()                        // §5.9
game.interruptMantra()                    // jolts and fear cues: a held mantra restarts its wind-up (0.6 s)
game.frozenT                              // > 0 while frozen (bust freeze); input ignored

// ---- map ----
game.mapMarkers(all);  game.mapLabels();  game.mapLegend() -> html

// ---- tests ----
game.debugWarp(x, z, yaw)                 // stands up first if seated; snapNext
game.approachSpot(lm) -> { x, z, yaw }    // §4.4 spawn rule (landmark + 1.5 m facing back, else the landmark)
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
export function setSkyPalette({ top, horizon, fogNear, fogFar, sun, sunI, hemiSky, hemiGround, hemiI })
  // sky uniforms (sky material stashed as MAT.sky), scene.fog colour/near/far, document.body bg,
  // sun colour/intensity, hemi colours/intensity. Missing fields keep their value.
export function setCloudsVisible(on)     // MAT._clouds.visible
export function setShadows(on)           // sun.castShadow
// MAT.water retinted 0x1c7fb8 (sea and pools). tickSky unchanged (clouds hidden in flight).
```

### 14.5 camera.js (Phase 0; WP-A1 may tune)

```js
cam.profile = null | { pivotH, dist, pitchMin, pitchMax, pitch0, noPull, fov, cineSide, cineUp, clampZ? }
cam.clampActive = bool     // set each frame by main: flight level && cabin.inCabin(focus); then the eye z
                           // is clamped to profile.clampZ and pitch steepens (§5.3)
cam.setProfile(p)          // sets profile, snaps pitch to p.pitch0, snapNext; null = Bigmouth
cam.frame(a, b)            // profile-aware (§5.3)
cam.frameOne(a)            // single-target framing (both modes)
cam.cutTo({ x, y, z }, { x, y, z })   // cine pos/look; release() returns
// on-foot branch: pivotH/dist/fov from profile; pitch clamped to [pitchMin, pitchMax] in both the
// mouse branch and every frame; pull-in skipped when noPull.
```

### 14.6 Actors (Phase 0 minimal; WP-E owns afterwards)

**models.js**
```js
export const CHARS = { stig: {...}, ... };         // keys = Appendix A; Phase 0: approximate looks
export const CAST = Object.keys(CHARS).filter((k) => CHARS[k].portrait !== false);
export function buildCharacter(def), animateCharacter(m, st, dt), randomPed(r), buildBust(def)
export function buildBustGeo(def) -> BufferGeometry   // merged bust, origin at torso bottom, +z forward
export function outfitDef(key, outfit) -> def         // { ...CHARS[key], ...CHARS[key].outfits?.[outfit] }
```
New def fields (WP-E implements; unknown fields are ignored until then): `hat`
(`'trilby' | 'pilot' | 'tricorn' | 'bucket' | 'sunhat' | 'tomte' | 'scarf' | 'cap'`; `'cap'` as a
hat on top of hair; its colour is `hatC`, Phase 0a), `dress` (colour; cone skirt), `shades` (colour; filled lenses), `beard`,
`print: [c1, c2, c3]` (confetti blobs on the torso), `tuft`, `tie`, `bowtie`, `vest`, `held`
(`'camera' | 'boombox' | 'accordion' | 'congas' | 'cup' | 'mirror' | 'broom' | 'giraffe' |
'butterKnife' | 'knacke'`), hair `'page'`, `hairFlower`, `ring` (css), `outfits`, `portrait`.

Anim flags on `Character.anim` (Phase 0 adds them all with a minimal arm pose where noted; WP-E
polishes): `wings` (arms straight out — Phase 0), `cupUp` (right arm up+forward — Phase 0),
`push` (both arms forward at waist — Phase 0), `planeSeat` (seated, arms on armrests — Phase 0),
`hold` (arms out to the sides low — Phase 0), `flail` (Phase 0), `oath` (right hand up, left on
chest — Phase 0), `dance` (Phase 0: cheer variant), `laugh`, `slump`, `shoeOff`, `mirror`, `film`,
`giraffe`, `butterKnife`, `carryOver` (WP-E).

**character.js**: `ch.setDef(def)` (rebuild model under the same parent; keep x/y/z/yaw/state;
`height` updated); state `'hidden'` (step no-op, `root.visible = false`, skipped by
`carsVsPeople`); `ch.seatAt({ x, y, z, yaw })` (state `seated`, `anim.planeSeat`, root placed by
hand at hip height, `x/y/z` set for bubbles); `ch.standAt(x, z, yaw)` (state `normal`, teleport).

**car.js**
```js
export const CAR_TYPES = {...};                       // §6.6
export function registerCarType(key, spec)            // used by cabin.js for 'trolley'
// buildCarModel: `if (s.build) return s.build(s, color);` first; wheels skipped when s.noWheels;
// glass null-guarded (existing). spec flags: livery ('suntrip'|'guagua'), guardia, taxi, pigs.
// car fields: noEnter (never offered to the player), noExplode (damage → dead + fx.steam, no fire,
// no burn), isPursuer, riders[].
```

**pickups.js**
```js
export const COLLECT_KINDS = { pryl, fena, flaska, juice, knacke, asna, vaska, giraff };
//   each { build(id) -> Object3D, motion: 'spin' | 'circle' | 'bob' | 'roll' | 'none', beam?: bool, scale? }
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

// world/collision.js: segmentBlocked returns the nearest hit (min t over all blocks)

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
  seatCharacter(ch, seatId),  unseatCharacter(ch, spot?),  unseatAll(),  seatOf(ch) -> id | null,
  startTrolley(),  stopTrolley(),  trolleyEnd(g) -> { x, z },
  setAisleBlockers(on),
  setGateActive(on),
  placeCoins(),
  tick(dt, t, game),            // dt already scaled by timeScale
  mapSource(phase) -> src,
};
// Phase 0a extras (additive): FLIGHT_PALETTES is keyed by PHASE (gate takeoff climb cruise approach
// landing landed -> the §13.3 palettes, which are exported by name as PALETTES); also exported:
// ROWS, rowZ(row), SEAT_X, CAST_SEATS, DODGE_ROWS. cabin.bestSeat(g) (the §5.10 seat choice),
// cabin.applyPalette(), cabin.pusher (the vardinna2 Character; game.npc('vardinna2') returns it),
// cabin.blockers (the stower Characters). Plane seats live on the Character as ch.seatId (player
// and NPCs alike); seatOf(ch) reads it.

// world/flightScenery.js (WP-A2; Phase 0 stub with this exact shape)
export function buildFlightScenery(scene) -> { airframe, scenery, gateVisual,
  setPhaseVisual(name, t), setGateVisible(on), tick(dt) }
export function buildPlaneExterior(group, { gear = true } = {})   // also used by the airport block

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

Every film line here is a bark outside its own scene, so it is tagged `[F*]` (§1.4).

```js
OLE_STATS = [
  'Du vet vel at det er 50 prosent sjanse å overleve en flyulykke.',          // [F*]
  'Det er farligere å kjøre bil enn å fly.',                                   // [F*]
  'Man regner mellom to og fem millioner flytimer pr. kræsj.',                // [F*]
  'Leste du om en sånn jumbopilot som gjorde en looping? To ganger.',         // [F*]
  'Det her er bare luftlommer, Stig-Helmer. Helt normalt!',                   // [N]
  'Tre ganger så fort som en geværkule, Concorde!',                           // [F*]
];
CHATTER_FLIGHT = {
  ole: ['Hører du? Samba.' /*[F*]*/, 'Kvarts og digital.' /*[F*]*/],
  angerud: ['Kallar ni det här \'varm middag\'?' /*[F*](t)*/, 'Det är sista gången jag åker med SunTrip!' /*[F*]*/],
  berra: ['Ra-tara-tara…' /*[F*]*/, 'Ta det vackert, vi har varit ute och flugit förr.' /*[F*]*/],
  robban: ['Fan, vad jag är törstig.' /*[F*]*/],
  siv: ['Bara de inte är ingenjörer.' /*[F*]*/],
  majsan: ['De är säkert trevliga.' /*[F*](t)*/],
  fruStorch: ['Vi heter faktiskt Storch, inte Stork.' /*[F*]*/],
  herrStorch: ['Lite film.' /*[F*]*/],
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
  herrStorch: ['Lite film.' /*[F*]*/], jose: ['Jag ska inte bort, jag ska hem.' /*[F*]*/],
  mamma: ['Inga svenskor!' /*[F*]*/], portier: ['Momento.' /*[F*]*/],
  affe: ['Va fan, jag hade ju natturen i natt!' /*[F*]*/], gabbe: ['Natturen går klockan nio!' /*[N]*/],
  souvenir: ['Hallå där!' /*[F*]*/], saljare: ['Välkommen i det gröna!' /*[F*]*/],
  carmencita: ['Jag är 28 år, mamma.' /*[F*]*/], hittegods: ['Hammarby…?' /*[F*]*/],
};
OUCH = ['Jag ska tala med platschefen!' /*[F*]*/, 'Det är sista gången jag åker med SunTrip!' /*[F*]*/,
        'Och ändå har vi betalat bränsletillägg!' /*[F*]*/, '¡Ay, mi madre!' /*[N]*/, 'Turister!' /*[N]*/, 'Aj!' /*[N]*/];
GETUP = ['Det måste vara värmen.' /*[F*]*/, 'Det är kombinationen av sol och…' /*[F*]*/,
         'Det är ju fan vad solen tar här nere.' /*[F*]*/];
CARJACK = ['Det fattades bara det…!' /*[F*]*/, 'Jag har betalat 3 000 för den!' /*[F*]*/, '¡Ladrón!' /*[N]*/];
NPC_KICKED = ['Aj!' /*[N]*/, 'Hallå!' /*[N]*/, 'Var inte så typiskt svensk.' /*[F*]*/, 'Va fan, Stig-Helmer!' /*[N]*/];
```

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
| `missions` [Phase 0] | for N = 0..12: `fresh('&mission=N')`: `level === levelFor(N)`, giver visible within 40 m of `at`, no errors; at `&mission=1`: `cabin.seatOf(npc('ole')) === '14A'` and Majsan seated in 16E (cast seated from the start of ombord); **data checks**: every key used in any `place`/`extra`/`outroPlace`/`who`/`findAt`/`standAt`/`sendTo`/`frame`/`duet` resolves via `game.npc(key)`; every `checkpoint: true` stage acting > 60 m from `def.at` has `retryAt` (§9.4) |
| `gate` [A1] | mission 0 loaded: shots of arch, lounge, toilet, bridge; walking into every gate wall for 2 s keeps `cabin.inside()` true; the arch is the only way out of the landside pocket; `kontrollant` and the `gateQueue` warp spot are not inside a solid |
| `cabin` [A1] | `setPhase(p, {instant})` for every phase → shot each; walk into each cabin wall 2 s → still inside; `camera.position.y > 4`; seated cast visible (not hidden by racks); row-number strip shot; after `?mission=2` boots and after `setNpcOutfit('ole', 'flyg')`, Ole's root world position is within 0.5 m of seat 14A; player at `galleyBack` and `toiletBackL` with camera yaw toward the nose → shot + raycast: no airframe mesh between camera and player |
| `trolley` [A1] | `startTrolley`; stand in the aisle ahead for 40 s: `stats.bowled ≥ 1`, fear rose, no NaN; stepping into a free row avoids it; an NPC standing in the aisle makes the trolley wait (not shoved) |
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
| `skandal` [H] | `addCoins(2000)`, `shame.add(100)`: 2 `guardia` cars spawn; exit car → officer walks (not through walls); block him behind a building → teleported within 6 s; get busted → coins −400 (20 %), ¡MULTA!, player frozen ~3 s; an offence within 20 m of Herr Storch adds 0 |
| `talk` [Phase 0] | `autoDialog = false`, walk to Ole at `gateQueue`, E, Space twice |
| `fullstory` [Phase 0b] | swaps the literal §8 missions (`tools/fixtures/full-missions.js`) into `MISSIONS` and plays all 13 per §16.3 (`FROM`/`TO` as `story`); must end `#13 idle`, `RESULT: PASS` |
| `kinds` [Phase 0b] | fixture data checks; haggle misses fail; follow `minDist` fails; smooth/fragile bars (teleports never count); carry spill; checkpoint retry re-applies night + `vals` and revives plates at `dansgolv`; destroy default spawn; grab at the wreck; scene `exitCar` |

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
| 19 | Scope (13 missions, 23 block types, 33 cast keys) | Phase 0 stubs make everything playable from day one; P1/P2 cut list with fallbacks; fataga cut first |
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
saljare souvenir stadare eslov grisbonde varden guardia pax`. Player key `stig`.

**Home sets**: `gate flight island`. **Levels**: `flight island`. **Flight phases**: `gate takeoff
climb cruise approach landing landed`. **Palettes**: flight `gate clouds above descent island`;
island `day night sunset`. **Meters**: `flygradsla skandal`.

**Flight landmarks**: `gateStart gateQueue gateArch gateOle gateLounge gateDesk herrtoaDoor herrtoa
damtoaDoor bridge bridgeQueue1 bridgeQueue2 cabinDoor galleyFront cockpitDoor cabinRow6 cabinRow10
cabinRow14 cabinRow16 cabinRow22 cabinCentre toiletBackL toiletBackR galleyBack trolleyPark call14`.
**Seats**: `<row><A–F>`, rows 1–12 and 14–24.

**Island landmarks**: `flamenco flamencoRecepcion flamencoPatio rum113 flamencoBalcony flamencoPool
flamencoBar flamencoDrive flamencoBack bodega suntrip scen friskotek suntripPool suntripLot kasbah
vikingbar tongatonga tongaLot cita supermercado ferreteria telefon plaza grillpaco grillpacoMamma
marknad asnestand kyrka bensin guardia vischan eslovVag packhus grisfest dansgolv fataga fatagaFold
fatagaDukar golf bungalow bygge dromplan airport hittegods busBay bagageband dyner fyren playa hamn`
+ kerbside `follow` endpoints `grisfestGate fatagaBus grillpacoCurb`
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

**Anim flags**: `wings cupUp push planeSeat hold flail oath dance laugh slump shoeOff mirror film
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

- Local git commits, tags and per-package worktrees approved (never push).
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

