# Charter & Run: game design (film-faithful version)

*Fan-made Hit & Run-style game based on* Sällskapsresan *(1980). It is built on a copy of the Bigmouth & Run engine in `charter_and_run__sallskapsresan/`. Player-facing text is Swedish, Ole speaks Norwegian (bokmål), and the islanders speak Spanish-flavoured Swedish, the way the film's subtitles render them.*

---

## 0. One-page summary

**Pitch.** It is December 1979. Stig-Helmer Olsson tests toasters for a living (G17) and is terrified of flying. Levander has slipped him a "Christmas present" that is really 50 000 smuggled kronor hidden in a crispbread packet, and he is heading for a package tour to Nueva Estocolmo. **Level 1 is the trip itself:** Arlanda, then the DC-8, then the landing in Las Palmas. The meter on that level is **FLYGRÄDSLA** (fear of flying). The only weapon against it is Levander's exercise: hold **V**, stretch the arms straight out and say *"Jag kan flyga, jag är inte rädd."* **Level 2 is the island:** an open 7×7 resort town where Stig-Helmer survives the group trip with Ole Bramserud. Along the way you run SunTrip's errands, drive bus no. 17, buy a donkey, carry Berra home, get to the pig party, and on Christmas Eve find out what was in the crispbread. On the island the meter is **TYPISKT SVENSK** (typically Swedish). Fill it and SunTrip's tour guides come after you. Getting caught means **FRISKOTEKET**, the morning gym session.

| Decision | Choice | Why |
|---|---|---|
| World | One static world. The flight zone (Arlanda + DC-8) sits at **x≈3000**. The island keeps the engine's **7×7 grid** (P=80, N=7). | Lowest engine risk. The engine map confirms x=3000 works, and the grid keeps drivers, peds, pursuit and minimap intact. |
| Missions | **12**: 4 in level 1, 8 on the island, in film order | Each mission is a recognisable film sequence |
| Meters | Level 1: **FLYGRÄDSLA**, which leads to **PANIK!** (no pursuit). Island: **TYPISKT SVENSK**, which triggers the **SUNTRIP-LARM** pursuit and ends in **FRISKOTEKET!** | Both are one `Shame` class with a per-level config |
| Signature verb | **V = "Jag kan flyga"** (mantra, arms out like wings) | It is the film's most famous line, so it becomes a mechanic |
| Currency | **Pesetas (PTA)**. One coin is a *duro* (5 pta). | Prices are taken from the film: the pig party costs 800 pta, the donkey 500 then 200, the bribe 500 |
| Collectibles | **Oles prylar** (Ole's gadgets, 7, ground spinners) and **Concorde-modeller** (7, flying) | Both come straight from Ole's dialogue in the film |
| Camera in interiors | Cut-away "dollhouse" with an interior camera profile | The engine has no ceilings |

**Quote tags used throughout.** These matter for the writers.
- **[F]** is a verified film line, worded as in the research (subtitles or Wikiquote).
- **[F-no]** is a film line in Ole's bokmål, taken from the Norwegian subtitles.
- **[F*]** is film content whose wording or Norwegian rendering is ours.
- **(t)** means the speaker is interpreted. The subtitles don't say who speaks.
- **[N]** is a new line written for the game. It must never be presented as a film quote: not in the README, credits or loading tips.

---

## 1. Concept and tone

- **Film-faithful first.** Every mission is a film scene with Hit & Run verbs attached. The rule of thumb is that a Swedish fan should recognise every minute: a quote, a prop, a sign or a running gag (*"Paketet!"*, Pepes Bodega, Stork/Storch, Ole's statistics, the lens cap, "Giraffen", "hepåre").
- **Exaggerate the gag, not the person.** Stig-Helmer stays polite and bewildered, and the chaos happens around him. When the player wrecks things, the HUD calls it *typiskt svensk* behaviour and does not make it Stig-Helmer's character.
- **The verbs make the film's gags literal.** "Plocka kulor!" spawns real balls to pick up. "En skock får" (a flock of sheep) releases real sheep. "Bärra hem Berra" becomes a pickup/dropoff. "Ring kliniken" sends you driving to the clinic.
- **Language rules.**
  - All UI and banners are in Swedish, with uppercase written into the literals (`'UPPDRAG KLART!'`).
  - Ole speaks only bokmål.
  - Spanish NPCs speak Swedish "subtitle-style", with a Spanish word now and then (`¡Josito!`, `Momento.`, `Señor, betala!`).
  - Internal ids stay ASCII (`stig`, `ole`, `pepes`, `rum113`).
- **Guard rails.**
  - Mild swearing as in the film ("vad fan", "jävla smålänningar", "Måtte djävulen ta alla fruntimmer!") is fine.
  - Angerud's heart attack is played as a rush to the clinic, not as a joke at his expense.
  - The Spanish family is the film's affectionate stereotype. There are no mock accents in text.
  - No melodies from the film score or songs (§11).
  - No real airline or brand logos. Use the fictional SunTrip and generic crispbread.

---

## 2. Cast

### 2.1 Player and companions
- **Stig-Helmer Olsson** (`stig`) is the only playable character, on foot and driving.
  - Outfit 1 (`stig`) is a dark suit, tie, round brown glasses, mustache and a cowlick. He wears it on level 1 and on the island until mission 6.
  - Outfit 2 (`stigSol`) is Ole's "loud" Hawaiian shirt with shorts that are far too big. It is swapped in by a scene in M6.
  - Outfit 3 (`stigRio`) is a white dinner jacket with a black bow tie. It is unlocked by collecting all 7 Concordes.
  - Mantra (**V**) is available from the first second.
- **Ole Bramserud** (`ole`) is the companion and the "engine of the film". He gives 5 of the 12 missions and rides along as a passenger in M8 and M11.
  - He carries the boombox (`carry:'boombox'`).
  - His chatter is the radio track of the game: statistics, gadgets, samba.
- **Maj-Britt "Majsan" Lindberg** (`majsan`) is the love interest. She gives M10. She is the passenger in M10's follow stage and the dance partner in M11.
- **Siv "Sivan" Åman** (`siv`) is the cheeky sister. She hands out points ("Giraffen: 4 poäng" toast in M3) and ends up choosing Ole.

### 2.2 Full `CHARS` table
All characters are `kind:'adult'`. Fields marked † are new model fields (§6.4).

| key | name (display) | look (main fields) | voice Hz | where | role |
|---|---|---|---|---|---|
| `stig` | Stig-Helmer | scale 1.08, wide .85, hair `cowlick`† dark `0x2a1e18`, mustache, glasses `0x6b4a2a`, shirt `0x3a2e28` longSleeves, pants `0x2e2620`, tie† `0x8a2a2a` | 230 | player | |
| `stigSol` | Stig-Helmer | as `stig` but print† shirt `0xd83a3a`/`0xffd23f`, shorts:true, pants `0xe8e0c8` | 230 | player (island) | outfit |
| `stigRio` | Stig-Helmer | white jacket `0xf4f0e6`, tie† black (bow), pants black | 230 | player (unlock) | outfit |
| `ole` | Ole | wide 1.35, hair `balding` `0xa0522d`, mustache same, shirt white polo (flight) / `0xf2c94c` with print† check (island), carry† `boombox` | 260 | everywhere | companion, giver M1–M4, M8, M11, M12 |
| `majsan` | Majsan | hair `bob`† `0x8a3b22`, dress† `0x4a7fd0` print† white, shoes white | 380 | flight 7E, Flamenco pool | giver M10 |
| `siv` | Sivan | hair `bun` `0x7a3018`, dress† `0xd83a3a` print† `0xffb0c0` | 400 | 7D, Flamenco pool | |
| `berra` | Berra | hair `long` `0x5a3a22`, mustache, glasses `0x3a3a3a` (big), shirt `0x2a4fa0` (Arlanda: `0xf0ead8` cardigan with stripe† `0x4a3a2a`) | 250 | lounge, 19C, poolbar | giver M4, M9 |
| `robban` | Robban | wide 1.3, hair `balding` `0x6a5a48`, glasses, shirt `0xf07a1e` (flight) / `0x1f2f6a` | 220 | lounge, 19D, poolbar | |
| `angerud` | Gösta Angerud | wide 1.3, hair `balding` `0x5a4a3a`, shades† (island), shirt/pants `0x9cc4e4` suit, longSleeves | 210 | 3C, SunTrip pool | giver M7 |
| `levander` | Dr Levander | hair `slick` dark, glasses big, shirt white (coat), tie† navy | 300 | radio only (portrait) | phone and flashback |
| `lasse` | Lasse Lundberg | hair `curly` black, skin tan `0xc98f62`, shirt+pants `0xffd23f`, whistle:true | 290 | SunTrip | giver M5, M6. Pursuer on foot |
| `affe` | Affe | thin, hair `short` `0xc9a66b`, print† shirt, pants `0xffd23f`, shades†, carry† `accordion` | 270 | SunTrip | drives van and excursion bus |
| `gabbe` | Gabbe | wide 1.4, hair `afro` `0xc0602a`, beard† same, shades†, carry† `congas` | 200 | SunTrip | drives van and night bus |
| `herrStorch` | Herr Storch | hair `curly` `0x9a7a52`, shirt `0x3a2a4a` print†, vest = stripe† `0xb07a5a`, carry† `camera` | 320 | 10A, roaming | lens cap |
| `fruStorch` | Fru Storch | wide 1.15, hair `curly` `0xf0dca0`, glasses, shirt `0xd0307a` | 420 | 10B, roaming | "Storch, inte Stork!" |
| `jose` | José | hair `slick` black, mustache thick, shirt `0x2048c8` | 280 | 7C, Fataga | |
| `mamma` | Josés mamma | hair `bun` grey, glasses, dress† black | 360 | Fataga | |
| `pappa` | Josés pappa | hair `cap` black (hat), shirt+pants black | 200 | Fataga sheepfold | shepherd |
| `carmencita` | Carmencita | hair `short` black, dress† black, stripe† `0xd8321e` (scarf) | 410 | Viking Bar | |
| `portier` | Portiern | shirt white, pants black, mustache | 260 | Flamenco reception | "Momento." / 500 pta |
| `tjansteman` | Tjänstemannen | shirt `0xd8d0b0`, cap | 240 | airport | lost bag, baggage truck |
| `saljaren` | Bungalowförsäljaren | shirt+pants white, hair `swoop` fair | 300 | Bungalow | |
| `souvenir` | Souvenirförsäljaren | wide 1.2, shirt `0xe8d8a8`, mustache | 230 | market | "Jävla smålänningar!" |
| `stadare` | Städerskan | hair `bun` + scarf (dress† black, stripe† pink apron `0xf0a0c0`) | 340 | Flamenco corridor | cameo ("Limpio!") |
| `eslov` | Rullskidåkaren | shirt `0x2a8a3a`, pants black | 300 | vischan road loop | "Heja Eslöv!" |
| `sulan` | Sulan | hair `short`, shirt `0x6a4a2a` | 260 | Arlanda lounge | Pepes tip |
| `fruAngerud` | Fru Angerud | hair `bun` `0xc8a060`, dress† `0x7a2a3a`, fur hat = cap | 380 | Arlanda entrance | "tänk på hjärtat" |
| `incheckare` | SunTrip-tjejen | shirt `0xffd23f` (yellow jacket), hair `bun` blonde | 420 | Arlanda check-in | also Arlanda PA |
| `tullare` | Tullaren | shirt `0x3a4a6a`, cap | 240 | Arlanda | dog handler |
| `vardinna` | Flygvärdinnan | dress† `0x1e9aa0` over shirt white, hair `bun` blonde | 430 | cabin (2 instances) | |
| `kapten` | Kaptenen | hair `cap` navy, shirt white | 190 | PA only (portrait) | |

Dialogue portrait ring colour (`hud.js:188` rewrite): `stig` sky blue, `ole` sun yellow, SunTrip staff orange, Spanish locals red, everyone else cream.

---

## 3. Level 1: "Flygresan" (Arlanda → Las Palmas)

### 3.1 Space (one zone at x≈3000, built before `finalizeProps`)

New module `src/world/flight.js` exports `buildFlight(scene)`. It is called after `buildTown` and before `finalizeProps`. It uses a `Frame` at (0,0) with yaw 0, so local coordinates equal world coordinates (export `Frame` from town.js or move it to `world/frame.js`). The floor is the engine's infinite CURB plane (y=0.15), so there is **no floor solid**. Outer walls are `box(...,99,'bound')` and at least 1 m thick. **There is no roof** (cut-away).

```
          z=48 ┌──────────────── ARLANDA UTRIKES (x 3016..3060) ───────────────┐
               │ [DAMER]   [HERRAR]        BAGAGEKONTROLL + BAND   (hund)     │
               │  arlDamtoa arlHerrtoa       arlBagage  arlBand               │
 PLANE         │                                                              │
 x 2997..3003  │ GATE 8   ◄── METALLBÅGE ◄──         ◄── SUNTRIP-DISKEN ◄─ ENTRÉ │
 z 0..34  ═════╪═jetway═ arlGate   arlBage   arlLounge(chairs)  arlCheckin  arlEntre
 door z≈31     │ (x3004..3016, z29.5..32.5)                                   │
          z=12 └──────────────────────────────────────────────────────────────┘
```

**Cabin** (DC-8-62 "YLVA VIKING" in SunTrip livery, scaled ×1.25 to fit the engine's 2.1 m adults):
- **Interior.** Interior is x 2997..3003 (6 m), z 0..34.
  - Facing the nose (+z), **+x is port/left**. Seats A-B-C are at x 3002.6 / 3001.85 / 3001.1, the aisle is x 2999.3..3000.7 (1.4 m), and seats D-E-F are at 2998.9 / 2998.15 / 2997.4.
  - The front galley (z 30..34) has the cockpit door. The main door is front-left in the +x wall at z 29.5..32.5. Its closing block is toggled with `dead`.
  - Rows 1–21 have **no row 13** (20 physical rows, pitch 1.15 m). Row 1 is at z=29 and physical row k is at z = 29 − 1.15·(k−1). Row 14 (k=13) is at z≈15.2.
  - The rear galley is at z 3..6 and three toilets are at z 0..3.
- **Seat solids.**
  - Each cushion box is 3 seats wide with top **0.6** (a walkable step) and kind `'seat'`.
  - Each backrest is a box 0.2 thick with top **1.35** (a wall), kind `'seat'`. It sits behind its cushion.
  - The camera ignores seats, because they are below its sample height.
- **Look.**
  - Orange seats `#D2601F` with white antimacassars `#F2EFE6`, cream walls `#E6DCC4`, and an open hat rack strip with row numbers that go "12 · 14" (the missing 13 is a visible gag).
  - A petrol drape `#1F4F55` hangs at the front galley, with a lit red sign: `FASTEN SEAT BELT` / `NO SMOKING` (the lit half toggles).
  - The exterior faces of the walls are white with a navy cheatline, so the plane reads as a plane from the terminal.
  - The nose cone, tail with SunTrip sun, wings and 4 engines are visual-only outside the walls. From the high cut-away camera, the wings below sell the flight.
- **Passengers.** About 100 seated busts (`buildBust` + `randomPed`, 1980 palette) are merged into 2 static meshes.
  - Named NPCs sit in their seats: ole 14A, siv 7D, majsan 7E, jose 7C, angerud 3C, herrStorch/fruStorch 10A/10B, berra 19C, robban 19D.
  - A sitting helper (§6.2) puts them in place.
- **Moving cabin pieces** (`flight.js`):
  - `AislePacer` moves 2 `vardinna` Characters between the galleys with pauses. It is scripted and does not use Ped.
  - `Trolley` is a **kinematic** drinks trolley. It is a mesh moved along the aisle line at 0.9 m/s by an attendant. If the player is within |x−3000|<0.75 and inside its z span, the player is pushed out along z, gets fear +8 and hears "Ursäkta!" (1.5 s cooldown). It is not a `Car`; that path needs about ten car.js changes and is not worth it.
- **Outside.**
  - A snowy apron (white plane x 2900..3200, z −150..200, y 0.12), snow piles and a parked tug. These are hidden after take-off.
  - Arlanda's windows show the same static airliner model (`buildAirliner(f, snow:true)`), which is also reused at Gando.
  - While on the ground, a snow squall: small white `fx.spawn` puffs near the camera.
  - In the air, 12 cloud puffs slide past the windows towards −z and wrap around.

### 3.2 Flight-zone landmarks

| id | world (x, z) | what |
|---|---|---|
| `arlEntre` | 3056, 30 | start; fru Angerud waves Gösta off |
| `arlCheckin` | 3048, 20 | SunTrip desk (yellow jackets) |
| `arlBagage` | 3044, 40 | baggage check, customs officer + dog |
| `arlBand` | 3038, 44 | conveyor belt (package into the suitcase) |
| `arlBage` | 3034, 30 | metal detector arch |
| `arlLounge` | 3026, 22 | lounge chairs: Berra, Robban, Sulan |
| `arlHerrtoa` | 3027, 45 | men's toilet (mirror, 3 basins) |
| `arlDamtoa` | 3021, 46 | women's toilet door (closed; voices) |
| `arlGate` | 3019, 31 | GATE 8 · LAS PALMAS |
| `cabinDoor` | 3001.5, 31 | front door, inside |
| `seat14A` / `seat14B` | 3002.6 / 3001.85, 15.2 | Ole / Stig-Helmer |
| `seat7` | 3000, 22.1 | sisters' row (aisle) |
| `seat19` | 3000, 8.3 | Berra's row (aisle) |
| `galleyFwd` / `galleyAft` / `cabinToa` | 3000, 32 / 4.5 / 1.5 | |

Signs:
- Arlanda: `ARLANDA UTRIKES`, `SUNTRIP · INCHECKNING`, `SÄKERHETSKONTROLL`, `HERRAR`, `DAMER`, `GATE 8 · LAS PALMAS`, a departures board `LAS PALMAS 09.40 · GATE 8 · I TID`, and the poster `SUNTRIP – SOLEN VÄNTAR`.
- Cabin: `TOALETT`, row numbers.
- Fuselage: `SUNTRIP` and `YLVA VIKING`.

Props: `resvaska` and `bagagevagn` in the hall, a `kaffeautomat` (`SVENSKT KAFFE?`), `soptunna`, and `resvaska` in the aisle at the rear galley.

### 3.3 Controls, camera and sitting

- **Moves.**
  - The player walks (5.4 m/s), sprints, jumps and kicks as usual. Kicking props gives pesetas, and kicking seated people does nothing.
  - **V (pad LB) is the mantra.** While held, Stig-Helmer stops, stretches both arms straight out (`anim.wings`) and shows the bubble "Jag kan flyga, jag är inte rädd" every 2.5 s. On level 1 it drains FLYGRÄDSLA. On the island it is an emote.
  - **E at your own seat sits down** (`sitPlayer`) and E stands up again, unless a timeline locks it.
- **Camera.** Interior profile `{pivotH 1.5, dist 3.4, minDist 0.45, pullPad 0.25, pitch 0.45..0.95 (default 0.7), fov 66, yawLock: aisle ± 0.7}`. The yaw lock applies in the cabin only. The terminal uses the same profile without the yaw lock.
  - When seated: pivot at the head, dist 2.4, pitch 0.6.
  - Dialogue scenes in the cabin use scripted `cam:{pos,look}` along the aisle axis, never `frame()` (both sides of the aisle are walls).
- **Lighting.** In the cabin, `sun.castShadow=false` and `hemi.intensity` 1.9, so the cabin is not lit only by the darkest toon band.
- **Hidden on level 1.** Minimap and big map are hidden. M shows the toast "Ingen karta ombord – följ pilen". The guide arrow and beacon point straight at the target (no `routeAim`). The beacon arrow sits at 2.6 m and the guide arrow at head + 0.5.

### 3.4 The FLYGRÄDSLA meter (level 1)

The HUD label is `FLYGRÄDSLA`. The fill is pale green, turning white then red.

| Source | Effect |
|---|---|
| Ole's statistics (M2 intro) | starts the stage at 75, then +2/s until you reach the toilet |
| "Bomber…?!" | +15 |
| Metal detector beep plus "Kolla terroristen!" | +10 |
| Take-off roar (timeline) | +6/s while it lasts |
| *(En duns)*, the landing gear | +25 and shake 1.0 |
| Landing (timeline) | +5/s, touchdown +10 |
| Hit by the trolley | +8 |
| Standing in the aisle while `FASTEN SEAT BELT` is lit | +1/s |
| **Holding V** (after 0.4 s ramp-up) | **−22/s** |
| Juice (M4 scene) | −50 |
| "Titta, solen!" | −40 |
| Sitting in your seat with the belt sign off | −3/s; otherwise −1/s after 4 s calm |

**At 100 the result is `PANIK!`.** This is the level-1 "busted":
- Banner `PANIK!` with the sub-text *"Jag kan flyga, jag är inte rädd… Jag kan flyga…"*.
- A white flash and `cam.shake=1`.
- The player is frozen for 3 s in the wing pose. The nearest NPC comments (Berra: "Kolla terroristen!").
- **−25 pta** ("spilld juice"), then the meter is set to 45.
- In a stage with `panicFails:true` (both timelines), the mission fails with *"Stig-Helmer fick panik!"*.

There is no pursuit on level 1.

### 3.5 How level 1 ends and hands over

1. M3's take-off timeline hides Arlanda, the apron and the snow, and closes the door block. The sky goes from `arlanda` to `clouds` to `above`.
2. M4 ends with the landing timeline. Its outro is Ole's welcome line.
3. Then `def.after:'island'` runs `game.setLevel('island')`:
   - a white flash;
   - teleport to `flygplats` (the arrival hall, in the suit);
   - sky `island`, tune `sol`, meter config `island` with v=0;
   - minimap on, island HOMES, save.
4. The toast reads *"Välkommen till Gran Canaria! Prata med <b>Lasse</b>"*.

The zone state comes from the mission index, so reloads land in the right place:

| mission index | zone |
|---|---|
| 0–1 | Arlanda, on the ground |
| 2 | in the cabin on the ground (door closed, Arlanda palette) |
| 3 | airborne |
| ≥ 4 | island at `flamenco` |

---

## 4. The island: Nueva Estocolmo

### 4.1 Grid (keep P=80, N=7, HALF=280)

`MAP[j][i]`, where j=0 is north (inland, mountains) and j=6 is south (sea).

```
j\i    0          1          2          3          4          5          6
0   vischan    fataga     grisfest   bung       golf       bung       flygplats
1   bung       apt        marknad    kyrka      apt        bungalow   flygfalt
2   apt        bung       kasbah     suntrip    paco       apt        bung
3   apt        bung       apt        flamenco   apt        klinik     apt
4   bung       apt        bung       apt        bung       apt        bygge
5   apt        bung       apt        bung       apt        bung       apt
6   dyner      playa      playa      playa      playa      playa      rocas
```

**Hotell Flamenco is at the origin (3,3).** It is the player's home and the title orbit target. **Pepes Bodega is on its north (back) side**, facing the street to Hotel SunTrip, so it is visible the whole game and noticed only on Christmas Eve.

### 4.2 Block catalogue

| type | grid | builder (reuse from) | content | landmarks | signs |
|---|---|---|---|---|---|
| `flamenco` | (3,3) | new (parts of `apartments`) | 7-storey white slab in an L with balcony rows, raised pool (kind `pool`, top CURB+0.5), poolbar under a straw roof, reception, ground-floor room doors, back alley bodega (barrels, dark doorway) | `flamenco` (front, south), `flamencoPool`, `poolbar`, `flamencoRum`, `rum113`, `flamencoLot`, `pepes` | `HOTEL FLAMENCO`, `RECEPCIÓN`, `BAR PISCINA · SVENSKT KAFFE`, back: `PEPES BODEGA` / `VINOS · RON 80%` |
| `suntrip` | (3,2) | new (parts of `school`) | Hotel SunTrip: 4 terraced storeys on red rock, big pool with the welcome stage, guide office, **circling shark fin** in the pool (`animated`), coach lot | `suntrip` (office), `suntripPool` (stage), `suntripLot` | SunTrip sun logo (red on yellow), `HOTEL SUNTRIP`, `FRISKOTEKET 9.30`, `RESELEDARE · LASSE · AFFE · GABBE`, poster `GRISFEST TORSDAG · 800 PTA` |
| `kasbah` | (2,2) | `mall` | 2-storey courtyard centre with stairs (ramps) and bars | `kasbah`, `vikingbar`, `tonga`, `bodega1` | `KASBAH`, `VIKING BAR` (horned helmet), `TONGA TONGA`, `BODEGA LOLA`, `BAR SVENSKA · SMÖRGÅSAR` |
| `paco` | (4,2) | `shops` | shop strip with terrace tables | `paco`, `supermercado`, `ferreteria`, `telefon` | `GRILL PACO`, `SUPERMERCADO`, `FERRETERÍA`, `TELEFONOS · HYTT 1·2·3`, `CAMBIO · 1 KR = 17 PTA` |
| `marknad` | (2,1) | new | market stalls with **bouncy awnings** (kind `bounce`), donkey shelf, postcard racks | `marknad`, `asnaStall` | `MERCADILLO`, `RECUERDOS · SOUVENIRS`, `BURROS 500 PTA`, `T-SHIRTS · IKVÄLL FÅR 107…` (cut off) |
| `kyrka` | (3,1) | `waterTower` slot → new | Templo Ecuménico: white modernist church with a steep angled roof, palm plaza | `kyrka` | `ES UNA IGLESIA` / small `Det är en kyrka.` |
| `klinik` | (5,3) | `cinema` | clinic with red cross, parked ambulance (van, white) | `klinik` | `CLÍNICA · SE HABLA SVENSKA` |
| `bungalow` | (5,1) | `house` + pool | Angerud's show bungalow, pool, site fence | `bungalow`, `bungalowLot` | `SE VENDE · BUNGALOW · 4 RUM OCH KÖK`, `BARNVÄNLIG POOL` |
| `golf` | (4,0) | `footballField` | green, flag 18, pond (`water` circle), bunker | `golf` | `CAMPO DE GOLF` |
| `grisfest` | (2,0) | new | farm: white barn, pergola (deck) with long tables, spit-roast pig, dance-floor platform (deck), band stage, string lights | `grisfest`, `dansgolv` | `GRISFEST · FIESTA DEL CERDO · 800 PTA` |
| `fataga` | (1,0) | new | white village houses, cobbled square, small church, palms, embroidered cloths on lines, sheepfold (fence) | `fataga`, `fatagaFar` | `FATAGA`, `MANTELES · DUKAR` |
| `vischan` | (0,0) | new | tomato rows (green with red dots), packhouse, dirt road; the pig truck parks here | `vischan`, `eslovVag` | `TOMATES · EXPORTACIÓN` |
| `flygplats` | (6,0) | new | Gando: long low terminal and tower, apron with the static SunTrip DC-8 (footprint only), baggage carts | `flygplats`, `flygplatsBand`, `apron` | `AEROPUERTO DE GRAN CANARIA`, `LLEGADAS · ANKOMST`, `OBJETOS PERDIDOS · HITTEGODS` |
| `flygfalt` | (6,1) | new | old airfield: **the DC-7 dream plane** by the road (wing reachable via a ramp), windsock, hangar | `dromplan` | `AERÓDROMO` |
| `bygge` | (6,4) | `construction` | half-built hotel frame, crane, ramps | `bygge` | `PRÓXIMAMENTE · HOTEL NUEVA ESTOCOLMO II` |
| `playa` | (1..5,6) | new | promenade, sunbeds, parasols, kiosk, lifeguard tower, pedal boats on the sand | `playa` (at (3,6)) | `HELADOS`, `SVENSKT KAFFE`, `PEDALOS`, `SOCORRISTA` |
| `dyner` | (0,6) | `construction` ramps in sand colours | dunes as sand ramps (car jumps) | `dyner` | — |
| `rocas` | (6,6) | `residential` variant | white bungalows on red rock terraces (ramps) | `rocas` | — |
| `apt` | filler | `apartments` reskin | 2 apartment hotels of 5–6 storeys with a balcony stripe pattern, pool between them | — | random hotel names: `HOTEL LAS OLAS`, `APARTAMENTOS SOL`… |
| `bung` | filler | `residential` + new `house()` | 6 lots of white flat-roofed bungalows with terracotta parapet, blue door, a pot palm and a small raised pool. **Awnings are the bounce pads** (replacing trampolines). | — | — |

**Outskirts.**
- The grass ring becomes dry ochre `#c9a66b`.
- North and east: hill spheres in volcanic ochre and rust `#b5723a` (a barranco).
- South: a sand strip from z 289 to the bound wall at 314. A visual `MAT.water` sea plane `#2f8fc8` runs from z 300 to 900 at y 0.05.
- Random trees become palms (new `tree(kind:'palm')`), dragon trees and cacti.
- Road centre dashes become **white**.
- Welcome sign: `BIENVENIDOS A NUEVA ESTOCOLMO · Välkommen till våran ö`.

**Big-map labels (`MAP_LABELS`):** Hotell Flamenco, Hotell SunTrip, Kasbah, Grill Paco, Marknaden, Kyrkan, Kliniken, Bungalowen, Golfbanan, Grisfesten, Fataga, Vischan, Flygplatsen, Gamla flygfältet, Bygget, Playan, Dynerna, Rocas Rojas. **Pepes Bodega gets a label only after M12.**

### 4.3 Vehicles (`CAR_TYPES`, Swedish `name`)

| key | name | based on | look | where |
|---|---|---|---|---|
| `hatch` | Småbil | hatch | 1980 colours: beige, orange, brown, mustard, white | traffic ×5 |
| `sedan` | Sedan | sedan | | traffic ×3 |
| `taxi` | Taxi | sedan + flag `taxi` | white, green `LIBRE` roof lamp | traffic ×3 |
| `wagon` | Kombi | wagon (no wood) | | traffic ×2 |
| `van` | Skåpbil | van | white | traffic ×2, ambulance |
| `pickup` | Flakbil | pickup | | traffic ×2 |
| `butano` | Butanobil | pickup + `butano` | orange bottles in the bed | traffic ×1 |
| `bus` | Turistbuss | bus + `suntrip` | white with yellow/red stripe and sun | `buss17`, excursion bus, night bus |
| `guagua` | Guagua | bus | green (Salcai) | traffic ×1 (one bus max) |
| `icecream` | Glassbil | icecream | `HELADOS` | traffic ×1 |
| `suntripvan` | SunTrip-buss | van (replaces hearse) | yellow, red sun on the sides | pursuit only |
| `grisbil` | Grisbilen | pickup + `pigs` (replaces muscle) | rust red, slatted rack, 3 pink pigs; horn = oink | `vischan` (locked) → unlock |
| `bagagebil` | Bagagebil | van | white, suitcases on the roof | M12 destroy target |

Named parked cars:
- `buss17` at `suntripLot`. It is first used at `flygplats` in M5 and parks at SunTrip afterwards.
- `grisbil` at `vischan`, locked until M9.
- `angerudHyrbil`: white small car, smoking, broken down near `golf`. Locked set dressing ("Jag hyr en bil").

### 4.4 Pedestrians

- 34 peds: **85 % adults** (few children on a 1980 charter).
  - 70 % Swedish charter tourists: pale `#f2d3b8`, sunburnt `#f0a08a` or tanned `#c98f62` skin; shirts in Hawaii red, orange, mustard, brown or turquoise; white shorts with white socks.
  - 30 % locals: black dress, or white shirt with black trousers (waiters).
- **Ped dodge shouts** (`peds.js:68`): "Hallå där!", "Se upp!", "Herre jävlar!", "¡Cuidado!", "Typiskt svenskar!"
- **OUCH** (hit tourist):
  - "Jag ska tala med platschefen!" [F*]
  - "Det är sista gången jag åker med SunTrip!" [F]
  - "Och ändå har vi betalat bränsletillägg!" [F*]
  - "¡Turistas!"
- **GETUP:** "Det måste vara värmen." [F], "Det är kombinationen av sol och…" [F], "Det är ju fan vad solen tar här nere." [F]
- **CARJACK:** "Det fattades bara det…!" [F], "Jag har betalat 3 000 för den här!" [F*], "¡Ladrón!"

### 4.5 Props (`props.js` TYPES)

Coins × 5 pta. Every type keeps top > 0.75 unless it is meant to be driven over.

| type | replaces | footprint / top | coins | meter | notes |
|---|---|---|---|---|---|
| `parasoll` | mailbox | r .3 / 2.2 | 2 | 1 | pools, beach |
| `soptunna` | trashcan | as is | 1 | 1 | |
| `dusch` | hydrant | r .25 / 2.2 | 3 | 2 | beach shower, **splash fx hook** |
| `vykort` | newsbox | .55×.5 / 1.6 | 3 | 1 | postcard rack |
| `kaktus` | flamingo | r .25 / 1.1 | 1 | 1 | |
| `asna` | gnome | r .3 / .9 | 2 | 1 | souvenir donkey statue |
| `vitmur` | woodfence | 2.5×.3 / 1.1 | 0 | 1 | white garden wall |
| `kon` | cone | as is | 1 | 0 | |
| `tomatlada` | crate | 1.2×1.2 / 1.2 | 2 | 0 | red debris |
| `bank` | bench | as is | 1 | 1 | |
| `bagagevagn` | cart | r .45 / 1.0 | 1 | 0 | airports |
| `butano` | pump | r .3 / .95 | 3 | 2 | orange bottle, **explosion fx hook** (cartoon) |
| `kaffeautomat` | vending | as is | 8 | 2 | "SVENSKT KAFFE?" |
| `tunna` | barrel | as is | 2 | 0 | wine barrels at bodegas |
| `solstol` | hay | 1.9×.7 / .55 | 1 | 0 | driven over; kick to break |
| `palmkruka` | tombstone | r .4 / 1.4 | 2 | 1 | |
| `resvaska` | new | .8×.45 / .8 | 3 | 1 | Arlanda, cabin, Gando |

Unused: `fence`.

---

## 5. Meters, pursuit and busted

One `Shame` class is configured per level with `shame.configure(CFG.flight | CFG.island)`. The public surface is unchanged (`add`, `update`, `v`, `pursuit`, `forced`, `locked`, `clear`, `endPursuit`, `onRam`). `hud.setShame` is renamed `hud.setMeter(v, hot, label)`.

```js
CFG.flight = { label:'FLYGRÄDSLA', mode:'panic', decayIdle:1, graceSecs:4,
  bannerStart:['PANIK!','Jag kan flyga, jag är inte rädd… Jag kan flyga…'],
  penalty:25, resetTo:45, freezeSecs:3 }
CFG.island = { label:'TYPISKT SVENSK', mode:'pursuit', vehicleType:'suntripvan', vehicleCount:2,
  drivers:['affe','gabbe'], pursuerChar:'lasse', onFootSpeed:7.4, penalty:250,
  bannerStart:['SUNTRIP-LARM!','Lasse Lundberg har tagit fram visselpipan'],
  bannerCaught:['FRISKOTEKET!','Lasse tog {n} pesetas i friskoteksavgift','Du har inga pesetas kvar att plocka'],
  bannerEscape:['LASSE GAV UPP','Han fick ett samtal: hajar i poolen'],
  taunts:[...below] }
```

**Island offences.** These keep the engine amounts:

| offence | amount |
|---|---|
| carjack | +8 |
| props | `def.shame` × 1.2 in a car / 0.7 on foot |
| ramming a car | up to 9 |
| wreck | +12 |
| running over a person | +14 (named NPC) / +18 (ped) |
| kicking a ped | +9 |
| kicking a car | +2 |

**SUNTRIP-LARM (pursuit at 100).**
- Two yellow `suntripvan`s spawn 70–150 m away on road nodes, with Affe and Gabbe busts at the wheel.
- On foot, **Lasse jogs after you** in his yellow suit with a whistle at 7.4 m/s (sprint 8.8 outruns him).
- The sting is Lasse's whistle (replaces `shameBell`).
- **Taunts** [F unless marked]:
  - "Plocka kulor!"
  - "Friskoteket börjar halv tio!"
  - "Jogga, simma och må bra!"
  - "Gäspa inte i gästers närvaro!" [F*]
  - "Ni bör inte dricka vattnet!"
  - "Det ingår inte i mina åtaganden!"
  - "Hälsa från mig – hepåre!"
  - "Och försök följa schemat!"

**Busted = FRISKOTEKET!**
- −250 pta (or all you have).
- A 1.5 s forced `cheer` pose (arms up) under letterbox, with Lasse's bubbles "Plocka med höger… plocka med vänster…" [F].
- Then the pursuit ends.

**Escape.** Banner "LASSE GAV UPP" plus the `complete` jingle.

**Not every mission can be busted.** Only M9's last stage forces a pursuit (`shame:true`, `bustFails`).

---

## 6. Engine extensions (all small and local)

### 6.1 New and extended stage kinds (`missions.js`)

| kind | params | done when |
|---|---|---|
| **`scene`** (new) | `lines:[[who,text]]`, `frame?:[a,b]` or `cam?:{pos:lm,look:lm}`, `effects?:{fear, coins, outfit, sky, music, unlockDoor, hide}` | dialogue finished. Effects are applied. |
| **`sit`** (new) | `seat:'seat14B'`, `text` | player seated there (E at the seat) |
| **`mantra`** (new) | `at?`, `radius?`, `secs:3`, `fearBelow?:15`, `text` | V held for `secs` in total (and fear < `fearBelow`) |
| **`timeline`** (new) | `seated?`, `panicFails?`, `end:secs`, `events:[[t, op, ...args]]` with ops `say` `radio` `fear` `fearRate` `shake` `sky` `sfx` `anim` `music` `prompt` `belt` `hide` `press` | clock reaches `end`. `press` pauses the clock until the action is pressed; in test mode it auto-presses after 1 s. |
| `rabbits` (extended) | `kind:'kula'|'far'|'flaska'|'hund'|'blomma'`, `rMin`, `rMax`, `flee=true`, `barLabel`, `gotText`, `failText` | as before. Mesh and motion are picked from a table. `flee:false` gives a static bobbing pickup. |
| `grab` (extended) | `item:'julklapp'|'asna'|'knacke'|'roka'|'vaska'` | as before (item mesh table instead of the record) |
| `pickup` (extended) | `also:['robban']` (rear seat, z −0.9) | as before |
| `destroy` (extended) | `driver:'tjansteman'`, `type:'bagagebil'` | as before (no hard-coded `CHARS.shame`) |
| `follow` / `race` | `who` = driver key; race `opp` type `bus` | unchanged |

**Mission-level fields:**
- `level`
- `cost` (pta). Start is blocked with the toast "Det kostar {cost} pesetas. Du har {n}." The cost is deducted at start.
- `after:'island'` (level switch after the outro).
- `panicFails`.
- `onFail` restores the sky and music.

### 6.2 Other engine hooks

1. **Level system** in `main.js`: `game.level`, `game.zone`, `setLevel(name)` and `zoneForMission(i)`. Guard these in the flight level:
   - `resetToRoad` (R resets to the seat or `arlGate`);
   - `freeSpot` bounds (taken from `game.levelBounds`);
   - `routeAim` (direct line);
   - minimap and big map (hidden);
   - pursuit spawning (off in panic mode);
   - per-level HOMES tables.
2. **Sky palettes.** Stash the sky material (`MAT._sky`) and add `setSkyPalette({top, horizon, fogNear, fogFar, sun, sunI, hemiSky, hemiGround, hemiI, cloudY, shadows})`. `tickSky` takes `cloudY`. Palettes: `arlanda`, `clouds`, `above`, `descent`, `island`, `night`.
3. **Camera interior profile.**
   - `cam.profile` with ceiling or pitch clamp, small minimum pull-in and yaw lock.
   - `segmentBlocked` returns the **nearest** hit instead of the first.
4. **Sitting** (non-car): `sitAt(ch, lm)`, `game.sitPlayer(lm)`, `game.standPlayer()`. These set state `seated`, the root pose, **and x/y/z** (bubbles read them). `placeNpcs` sits NPCs whose home is a seat.
5. **Input:** action `mantra` = KeyV / pad 4 (LB). Map `pause` to pad Start.
6. **Animation flags:** `wings` (arms straight out sideways), `cupUp` (right arm up with a cup mesh), `laugh` (Ole doubling over, hand to face).
7. **Audio:**
   - a persistent `drone(level)` channel (looped noise lowpass 400 Hz + 55 Hz sine) that pause silences;
   - `setTune(name)`, with the catch-up fix in the scheduler;
   - sfx `pling`, `plong`, `dingdong`, `thud`, `applause`, `beep`, `bark`, `baa`, `oink`, `whistle`, `whoosh`.
8. **Player outfit swap:** `game.setPlayerOutfit(key)` rebuilds the player `Character`, keeping key `stig`, position, camera focus and portrait.
9. **Text fixes:**
   - dialogue blip regex `/\p{L}/u`;
   - speedo **KM/H** (×3.6);
   - `lang="sv"`;
   - `missions.js:579` NPC key list replaced with the HOMES keys;
   - outro speaker skip `'stig'`.
10. **Currency:** coin `value` 5, label `PTA`. Rewards and penalties are in pta.

### 6.3 What the player always keeps
Coins, collectibles and unlocks carry across levels. The save key is `charter-and-run-v1`, with saved fields `{mission, coins, prylar[], concorde[], unlocked[]}`.

### 6.4 New model fields (`models.js`)
`dress` (cone skirt over the legs, copied from the ghost cone), `beard` (humans), `tie`, `shades` (filled lenses), `print` (second-colour dots on the shirt), `carry` (`boombox|camera|accordion|congas|cup`, attached to the right hand), and hair `cowlick` and `bob`. Each is about 10–25 lines.

---

## 7. Missions, in order

Speaker keys refer to §2.2. Dialogue is written as `who: text [tag]`. Every intro is ≤ 12 lines, so it fits the story test's 90 s window; longer material lives in `scene` stages.

---

### M1 `incheckning`: **"Kolla terroristen!"**

| giver | at | level | reward | extra |
|---|---|---|---|---|
| `ole` | `arlCheckin` | flight | 100 pta | incheckare, tullare, berra, robban |

**On game start** (radio toasts from `levander`, the tutorial):
```
levander: Sträck ut armarna – rakt ut åt sidorna. Slappna av. Slut ögonen. [F]
levander: Säg efter mig: Jag kan flyga, jag är inte rädd. [F]
levander: Varje gång du känner tendenser till flygrädsla så gör du övningen. [F]
toast:    Håll <b>V</b>: Jag kan flyga, jag är inte rädd
```
fruAngerud's chatter at the entrance (to angerud): "Sköt om dig nu. Ta det lugnt, tänk på hjärtat. Du har väl medicinen med?" [F] / "Cherie måste säga adjö till husse." [F]

**Intro**
```
incheckare: God morgon och välkommen. Namnet? [F]
ole:        Bramserud, Ole. [F]
incheckare: Rökare eller icke-rökare? [F]
ole:        No smoker! [F-no]
incheckare: Handbagage? Den är lite väl stor… [F]
ole:        Ja, men dyr! [F]
incheckare: God morgon! Hur var namnet? [F]
stig:       Stig-Helmer Olsson. [F]
incheckare: Tack. Handbagage? [F]
ole:        Du ser nervøs ut, du. Første gang du flyr? [N]
stig:       Jag kan flyga, jag är inte rädd. [F]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | goto | `to:'arlBagage', radius:3` | Gå till bagagekontrollen |
| 2 | scene | frame tullare/stig; effects `{fear:+15}` after "Bomber" | — |
| 3 | rabbits | `kind:'hund', count:1, near:'arlBagage', rMin:4, rMax:14, timer:40, barLabel:'HUND', gotText:'Fin hund.', failText:'Hunden åt upp julmaten!'` | Fånga hunden – den har paketet! |
| 4 | goto | `to:'arlBand', radius:2.5` | Lägg paketet i väskan på bandet |
| 5 | goto | `to:'arlBage', radius:1.6` | Gå genom metallbågen |
| 6 | scene | sfx beep; effects `{fear:+10}`; crowd `cheer` anim | — |
| 7 | goto | `to:'arlLounge', radius:5` | Gå mot gate 8 |

Stage 2 lines:
```
stig:    Vad ska de göra? [F]
ole:     Rutinekontroll. Narkotika, våpen, bomber… [F*] (t)
stig:    Bomber…?! [F]
tullare: Vad är det i paketet? [F]
stig:    En julklapp. Den är inte till mig. [F]
tullare: Vi måste öppna det här paketet. [F]
stig:    Visst, visst… [F]
stig:    Fin hund. [F]
tullare: Hallå! Paketet! [N, the running gag]
```
Stage 4 radio: stig "Det är den." [F]. Toast: *"Paketet åker i lastrummet. Vad kan gå fel?"*

Stage 6 lines:
```
tullare: Vill ni vara vänlig och ta av er skon. [F]
berra:   Kolla terroristen! [F] (t)
```

**Outro**
```
incheckare: Herr Stork ombedes kontakta informationen i avgångshallen. [F]
robban:     Han måste vara bror med Lennart Swahn. [F] (t)
berra:      Och Karin Falk! [F] (t)
robban:     Och Magnus Uggla! [F] (t)
```
Berra and Robban's queue chatter: "Ja, vad fan, man var ju nykter i morse men nu börjar det ordna upp sig!" [F] / "Har du inget bagage med dig?" – "Jag har det här. Jag reser lätt." [F]

---

### M2 `gaten`: **"Jag kan flyga, jag är inte rädd"**

| giver | at | level | reward | extra |
|---|---|---|---|---|
| `ole` | `arlGate` (seated in the lounge, headphones) | flight | 150 pta | berra, robban, sulan, siv, majsan |

**Intro.** Fear rises with every line. The stage init sets 75 and +2/s.
```
ole:  Du vet vel at det er 50 % sjanse å overleve en flyulykke. [F-no]
ole:  Det er farligere å kjøre bil enn å fly. [F-no]
ole:  Man regner mellom to og fem millioner flytimer pr. kræsj. [F-no]
stig: Krasch? [F]
ole:  Kræsj. [F-no]
ole:  Leste du om en sånn jumbopilot som gjorde en looping? [F-no]
stig: Looping med en jumbo? [F]
ole:  Ja. To ganger. [F-no]
stig: Det går väl inte? Kan du se till mitt handbagage ett tag, jag måste… [F]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | goto | `to:'arlHerrtoa', radius:2.5` (fear rising; PANIK possible but no fail) | Till herrtoaletten – fort! |
| 2 | mantra | `at:'arlHerrtoa', radius:2, secs:3, fearBelow:15` | Håll V: sträck ut armarna |
| 3 | scene | berra enters | — |
| 4 | goto | `to:'arlDamtoa', radius:3` | Tillbaka mot gaten |
| 5 | scene | `cam` on the toilet door; voices | — |
| 6 | goto | `to:'cabinDoor', radius:2` | Gå ombord – gate 8 |

Stage 3:
```
berra: Hur mår du? [F]
stig:  Bra. [F]
stig:  Jag håller på med yoga, avslappningsövningar. Isometrisk träning… [F]
berra: Jaha… Ja, själv tar jag mig ett järn. Ska du ha? [F]
stig:  Nej tack, jag tål inte starksprit. [F]
berra: Nej, vem fan gör det? [F]
```
Stage 5 (behind the door, then the sisters come out):
```
siv:    Skål! [F]
siv:    Du har väl med dig dom fyra p:na? Pass, pesetas, p-piller, piljetter. [F]
majsan: Jag har piral. [F]
siv:    Pass, pesetas, piral och piljetter! [F]
majsan: …och prit! [F]
majsan: Nämen… hejsan! [F] (t)
stig:   Jaså, vi kom på samma resa. [F] (t)
siv:    Jag dör! Såg du vad han stötte på dig? Han som såg ut som en giraff. [F]
```

**Outro.** This plants the Pepes Bodega arc.
```
berra:  Har du köpt vin? [F]
sulan:  Det är 80-procentig rom. [F]
sulan:  Här ligger Pepes Bodega. Det står på skylten. [F]
berra:  De häller upp och allt är klart? [F]
sulan:  Plomberat och klart. [F]
robban: Vad hette det sa du? [F]
berra:  Pepes Bodega. [F]
robban: Glöm aldrig det, du. [F]
```

---

### M3 `starten`: **"Titta, solen!"**

| giver | at | level | reward | `panicFails` |
|---|---|---|---|---|
| `ole` | `seat14A` (seated) | flight | 200 pta | on stage 2 |

**Intro**
```
ole:  Fjorten A og B. Rett bak rad tretten. [N]
stig: Det finns ingen rad tretten. [N]
ole:  Nei, den har de tatt bort. Av en eller annen grunn. [N]
stig: Jag kan flyga, jag är inte rädd… [F]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | sit | `seat:'seat14B'` (door block goes live, belt sign on, `pling`) | Sätt dig på 14B och spänn fast bältet |
| 2 | timeline | `seated:'seat14B', panicFails:true, end:21` (events below) | Håll V när det skakar! |
| 3 | goto | `to:'seat7', radius:1.8` (belt sign off) | Sträck på benen – gå fram till rad 7 |
| 4 | scene | `cam` along the aisle | — |
| 5 | goto | `to:'seat14B', radius:1.5` | Tillbaka till 14B |

**Stage 2 events:**

| t (s) | events |
|---|---|
| 0 | `hide:'arlanda'`, drone 0.6, `fearRate:+6`, shake 0.3 |
| 4 | sfx `thud`, `fear:+25`, shake 1.0, then: `say stig "Vad är det för ljud?" [F]` · `say ole "Landingshjulene som går opp. Hydraulikk, vet du." [F-no]` · `say ole "De går opp sånn, og så lukker lemmene seg. Så flyet ikke skal stoppe, men få fart. Ellers…" [F-no / SV "annars…"]` |
| 11 | `sky:'clouds'`, puffs whoosh past |
| 18 | `sky:'above'`, `say siv "Titta, solen!" [F] (t)`, sfx `applause`, `fear:-40`, `fearRate:0`, sfx `plong` (belt off) |

**Stage 4 lines** (they talk about Stig while he stands right there):
```
siv:    Pizza-racern, då? Han får fem poäng. [F]
majsan: Sex, tycker jag. [F]
siv:    Giraffen, då? Fyra. [F]
majsan: Mindre än pizza-racern? [F]
siv:    Han är så bortkommen. Det blir minuspoäng. [F]
siv:    Såg du snubben med bandspelaren? [F]
```
Toast: *"Giraffen: 4 poäng"*. José's bubbles to Siv: "Jag ska inte bort, jag ska hem." [F] / "…äkta spanska maten på en restaurang." [F]. PA (incheckare voice): "Herr Storch ombedes kontakta kabinpersonalen." [F]

**Outro.** This plants the Concorde set and the Rio ending.
```
ole:  Hva er det for et merke du har? [F*]
stig: Hammarby. Känner du till Hammarby? [F]
ole:  Eneste svenske byene jeg kjenner til er Stockholm og Göteborg og Malmö. [F-no]
stig: Det här är ett fotbollslag. [F]
ole:  Min drøm er å fly med Concorde fra Paris til Rio. 2 300 km i timen. Det er flyging! [F-no]
ole:  Tre ganger så fort som en geværkule. [F-no]
stig: Usch… [F]
ole:  Og så Rio! Stranda, jentene og samba. [F-no]
stig: Kanarieöarna är inte så dumt heller. [F]
ole:  Det får duga. [F]
```

---

### M4 `middagen`: **"Ta det vackert, vi har varit ute och flugit förr"**

| giver | at | level | reward | after |
|---|---|---|---|---|
| `berra` | `seat19` | flight | 250 pta | `'island'` |

**Intro** (`kapten` speaks over the PA, preceded by a `dingdong`):
```
kapten:   Mina damer och herrar, det är kapten. Vi flyger just nu ut över Atlanten. [F]
kapten:   Vi beräknas landa om en timme och 35 minuter. Vädret i Las Palmas är bra – soldis och 22 grader varmt. [F]
kapten:   Jag kan även meddela att Stenmark ligger trea efter första åket. [F]
vardinna: Tack. Det är förbjudet att dricka medhavd sprit. [F]
vardinna: Tar du det inte lugnt med spriten, kan det bli problem att komma in i Spanien. [F]
berra:    Ta det vackert, vi har varit ute och flugit förr. [F]
berra:    Psst, terroristen! Jag hade sex småflaskor i hatthyllan – nu rullar de omkring i hela planet. [N]
robban:   Hittar värdinnan dem åker vi rakt hem till kalla Sverige. [N, echoes the Norwegian subtitle line "…sendt rett hjem igjen til kalde Sverige"]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | rabbits | `kind:'flaska', count:6, near:'seat14B', rMin:3, rMax:14, timer:50, barLabel:'FLASKOR', gotText:'En till!', failText:'Värdinnan hittade flaskorna!'` (**trolley active**) | Fånga Berras flaskor innan värdinnan gör det |
| 2 | goto | `to:'seat19', radius:1.8` | Ge flaskorna till Berra |
| 3 | sit | `seat:'seat14B'` | Tillbaka till 14B |
| 4 | timeline | `seated, end:24` (juice + boombox) | — |
| 5 | timeline | `seated, panicFails:true, end:20` (landing) | Landning – håll V! |

Stage 1 bubbles:
```
angerud: Kallar ni det här 'varm middag'? Så ser det inte ut när jag flyger reguljärt. [F]
angerud: Jag har inte fått resan gratis. Jag har betalat 3 000 för den. [F]
berra:   Jag betalade bara 995. Sista minuten. [F] (t)
angerud: Det fattades bara det…! [F]
berra & robban (when a vardinna passes): Ra-tara-tara… [F]
```

Stage 4, the juice scene (the film's best-known gag):

| t | event |
|---|---|
| 0 | `say stig "Du, om man vill ha lite mer juice?" [F]` |
| 1.5 | `say ole "Ja, da trykker du der oppe." [F*]` |
| 3 | `press interact "<b>E</b> Tryck där uppe"` → sfx `pling`, `anim stig cupUp` (the cup held up to the call button and nothing comes out) |
| +0.5 | `say ole "Nei…" [F*]` · `say stig "Där?" [F]` · `say ole "Ja." [F]` |
| +3 | `anim ole laugh`, `say ole "Nei…!" [F*]` |
| +5 | `say ole "Så… så kommer flyvertinnen. Juice, whisky." [F*]` |
| +8 | vardinna walks to row 14: `say vardinna "Var så god." [F] (t)` · `say stig "Tack." [F]` · `fear:-50` |
| +11 | `say stig "Är den bra den där?" [F]` · `say ole "Ja… Kvarts og digital. Level her, input, FM, tape, tape run." [F-no]` |
| +15 | `say ole "Hører du? Samba." [F-no]`, `music:'samba', 6s`, `say stig "FIN MUSIK!" [F] (t)` · bust: `"Sch…" [F]` |

Stage 5, the landing:

| t | event |
|---|---|
| 0 | `pling` (belt on), `sky:'descent'`, `fearRate:+5`, shake 0.4 |
| 14 | sfx `thud`, shake 1.0, `fear:+10`, reverse thrust roar |
| 16 | sfx `applause`, `fearRate:0` · `say berra "Om de kraschar, kastar man tomater på piloterna då?" [F] (t)` · `say robban "Nej, skärpning nu, Berra, annars får vi ena jävla problem här." [F]` |

**Outro**
```
ole: Velkommen til Kanariøyene, gutten min! [N]
```
Then `setLevel('island')` (§3.5).

---

### M5 `transfern`: **"SunTrips buss nummer 17"**

| giver | at | level | reward | extra | unlock |
|---|---|---|---|---|---|
| `lasse` | `flygplats` | island | 300 pta | affe, berra (seated in a wheelchair prop), robban, jose, mamma, siv, majsan, tjansteman | `buss17` parked at `suntripLot` |

**Intro**
```
robban:     Invalido. [F]
tjansteman: Gracias. [F]
mamma:      ¡Josito! ¡Josito! … Inga svenskor! [F]
siv:        Hälsa familjen. [F]
majsan:     Och hönsen! [F] (t)
lasse:      Några problem? [F]
stig:       Min väska har inte kommit. [F]
lasse:      Affe, du får ta transfern. [F]
affe:       Va fan, jag hade ju natturen i natt! Jag har haft två grisfester i veckan. [F]
lasse:      Olsson! Du ser ut som en man med körkort. [N]
lasse:      SunTrips buss nummer 17 står där borta! [F]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | getInCar | `car:'buss17'` | Hoppa in i SunTrips buss nummer 17 |
| 2 | goto | `to:'flamenco', radius:12, inCar:true, timer:120, radio:[…]` | Kör gruppen till Hotell Flamenco |

Stage 2 radio (bus PA, spread over the drive). On the way, the `angerudHyrbil` is smoking by the road.
```
lasse:     Hjärtligt välkomna till Nueva Estocolmo och SunTrip. [F]
lasse:     Klockan är tre spansk tid – alltså en timme tidigare än svensk tid. [F]
lasse:     Ni bör inte dricka vattnet. [F]
lasse:     Grisfesten är på torsdag och kostar 800 pesetas. Några frågor? [F]
fruStorch: Finns det svenskt kaffe på hotellet? [F]
lasse:     Ja. [F]
ole:       Norsk, da? [F-no]
lasse:     Ja. [F]
ole:       Las Palmas! Bra fotballag… Øverste divisjon! [F*]
stig:      Hammarby är också ett bra lag. [F] (t)
ole:       Bajen… Hammarby… Bajen… [F] (t)
siv:       Majsan, en niopoängare! [F]
stig:      Jag har lite anlag för åksjuka. [F]
ole:       Jeg har reisesyketabletter. [F-no]
stig:      Jättefint! Tack. Du kanske vill ha en Argotal av mig. Mot allergi… [F]
```

**Outro** (reception, then the room). "Helan går" (traditional) plays faintly afterwards.
```
lasse:   Det har dessvärre uppstått ett litet problem på grund av överbokning. [F]
lasse:   Olsson, Stig-Helmer… och Bramserud, Ole… Kan ni dela rum? [F]
stig:    Ja… [F]
angerud: Kallar ni det här för havsutsikt? [F] (t)
portier: Momento. [F]
ole:     Litt lenger inn mot veggen. Snu den litt mer mot meg. Sånn ja. … Kom og hør nå! Fin lyd. [F-no]
```

---

### M6 `friskoteket`: **"Plocka kulor!"**

| giver | at | level | reward | extra |
|---|---|---|---|---|
| `lasse` | `suntripPool` (stage) | island | 300 pta | affe, gabbe, herrStorch, fruStorch, berra, robban, siv, ole |

**Intro** (lyrics spoken as dialogue; no melody, see §11)
```
lasse:     Välkommen till våran ö, sluta tänk på regn och snö. Sola, bada och ha kul med SunTrip över jul! [F]
gabbe:     Om du vill ha nattklubbssväng, häng då med i Gabbes gäng! [F]
lasse:     Vi befinner oss i höjd med Egypten och 500 mil hemifrån… som väl är. [F]
lasse:     Jag heter Lasse och har hand om SunTrips friskotek. Friskoteket börjar halv tio varje morgon. [F]
lasse:     Sträck upp höger hand, lägg vänster hand på hjärtat och säg efter mig: Jag lovar att bli en sundare och friskare människa under semestern. [F]
siv:       Gud, vad han är söt! [F]
lasse:     Finns det en familjen Stork här? [F]
fruStorch: Vi heter faktiskt Storch, inte Stork. [F]
lasse:     Till brudparet från Rutan och Nisse: Heja på och tappa inte orken, för om nio månader kommer storken. [F]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | goto | `to:'flamencoRum', radius:2` | Till rummet – Ole har en idé |
| 2 | scene | effects `{outfit:'stigSol'}` (flash) | — |
| 3 | goto | `to:'suntripPool', radius:6` | Friskoteket börjar halv tio! |
| 4 | rabbits | `kind:'kula', count:8, near:'suntripPool', rMin:4, rMax:18, timer:60, barLabel:'KULOR', gotText:'Plocka med höger!', failText:'Kulorna rullade iväg!'` | Plocka kulor! |

Stage 2:
```
ole:  Du kan ikke gå sånn her nede! Den buksa og det slipset! … Shorts. [F-no]
stig: Är den inte lite skrikig? [F]
ole:  Du skal ha sterke farger, du som er mørk. [F-no]
```
Stage 4 radio:
```
lasse:  Plocka kulor! Plocka med höger… plocka med vänster… [F]
berra:  Kolla storken! [F]
robban: Att de bara orkar, våra storkar… [F]
```

**Outro**
```
lasse:  Ni lufsar som troll! [F*] (t)
berra:  Herr Ober? De har inte öppnat än. [F]
robban: Ska vi inte käka frukost först? [F]
berra:  Det gör vi här. Bacon och ägglikör. [F]
lasse:  (i telefon) Hajar i poolen? Delirium – ring kliniken. [F]
```

---

### M7 `bungalowen`: **"Hälsa från mig – hepåre!"**

| giver | at | level | reward | extra |
|---|---|---|---|---|
| `angerud` | `suntripPool` (sunbed) | island | 400 pta | lasse, saljaren |

**Intro**
```
angerud: Ska du ta och springa upp på rum 113 och hämta mina röka? [F]
lasse:   Ja, du, det ingår inte i mina åtaganden. [F]
angerud: Då skulle jag vilja prata med platschefen. [F]
lasse:   Tja, det är ju jag, det… [F]
angerud: Du vet att jag känner chefen för SunTrip? [F]
lasse:   Ja, det gör jag med. Hälsa från mig. Hä-pååre! [F]
angerud: Det är sista gången jag åker med SunTrip! [F]
angerud: Du där, Giraffen. Rum 113. Sen kör du mig till bungalowen – en idiotsäker placering. [N + F "idiotsäker placering"]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | grab | `item:'roka', at:'rum113'` | Hämta Angeruds röka – rum 113 |
| 2 | pickup | `who:'angerud', name:'Angerud', at:'suntripLot'` | Hämta Angerud |
| 3 | dropoff | `who:'angerud', at:'bungalow'` (timer 100) | Kör Angerud till bungalowen |

Stage 3 radio:
```
angerud: Jag har hört att kriminaliteten har gått upp här nere sedan Franco dog. [F]
angerud: Det var bättre på Francos tid. [F] (t)
stig:    Det är likadant i Sverige. [F] (t)
```

**Outro**
```
saljaren: Välkommen i det gröna! [F]
saljaren: Bungalow – fyra rum och kök. Swimmingpool. Tre meter djupt i ena änden, en meter i den andra – barnvänlig. [F]
saljaren: Heltäckande mattor i alla rum… för en blygsam merkostnad. [F]
saljaren: 50 000 är kontantinsatsen. [F]
saljaren: Vad har du i handicap? [F] (t)
angerud:  22. [F]
```
Angerud's golf chatter afterwards: "Jag pliktar ett slag." [F] / "Jag tar en gammal boll." [F] / "Nu ska skiten i!" [F]

---

### M8 `asnan`: **"Jävla smålänningar!"**

| giver | at | level | reward | cost | extra |
|---|---|---|---|---|---|
| `ole` | `flamencoRum` | island | 500 pta | — (200 pta is spent in stage 4) | souvenir, carmencita, angerud |

**Intro**
```
ole:  Hva var det egentlig i julegaven? [N]
stig: Det var julmat – i julklappen. [F] (t)
ole:  Tenk ikke mer på det. Vi fikser en ny julegave. [F-no]
stig: Undrar vad dalahäst heter på spanska. [F]
ole:  Cabalho folkloristico… nativo. [F-no/F]
ole:  Det fikser vi. Vi fikser alt! [F-no]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | pickup | `who:'ole', name:'Ole', at:'flamencoLot'` | Hämta Ole vid parkeringen |
| 2 | goto | `to:'marknad', radius:8, passenger:'ole'` | Till marknaden |
| 3 | scene | the haggle; effects `{coins:-200}` (if under 200: "Ole betalar mellanskillnaden") | — |
| 4 | grab | `item:'asna', at:'asnaStall'` (on a shelf behind the awnings: bounce up) | Ta åsnan |
| 5 | grab | `item:'knacke', at:'supermercado'` | Leta knäckebröd |
| 6 | goto | `to:'ferreteria', radius:4` | Färghandeln |
| 7 | scene | painting: flash red | — |
| 8 | goto | `to:'vikingbar', radius:6, passenger:'ole', timer:90` | Lämna julklappen på Viking Bar |

Stage 3, the haggle:
```
souvenir: Hallå där! [F]
ole:      Hvor mye? [F*]
souvenir: 500 pesetas. [F]
ole:      Jeg gir deg to hundre. Det er… 18 norske kroner. [F-no / F]
souvenir: 400 pesetas. Titta, den är jättelustig. [F]
ole:      Så lustig er den ikke. To hundre er siste bud. [F-no]
ole:      Første, andre, tredje – to hundre pesetas! [F*]
souvenir: Kör till. [F]
souvenir: Jävla smålänningar! [F]
```
Stage 5 bubble: stig "Det är ungefär så här stort." [F]

Stage 7, the painting:
```
ole:  Og så maler vi den rød. [F*]
stig: Och blommor där. [F]
```
Toast: *"Åsnan är nu en dalahäst. Typ."*

**Outro** (Viking Bar, then the phone station):
```
angerud:    Buenas dias, lilla vikingen. Har paketet kommit? [F]
angerud:    God jul, moster. [F]
angerud:    Hur såg han som lämnade in det ut? [F]
carmencita: Han var lång, mörkhårig… hade glasögon och mustasch. [F]
angerud:    Då är det grönt. [F]
levander:   Detta är dr Levanders automatiska telefonsvarare. Solariet, flygrädslekliniken, bantningen och örtshopen är stängda över jul. [F]
levander:   Viktiga meddelanden kan lämnas till hotell Ambassadör i Åre. [F]
levander:   En målad åsna…? Idén med paketet var idiotisk redan från början. [F]
levander:   Nu måste du få tillbaka pengarna. Snacka med honom. Han vill kanske ha hittelön. Gör nåt! [F]
```
After M8, Angerud's chatter becomes the hittelön hints: "Men det är ju inte samma sak att hitta något som att stjäla." [F] / "Om man hittar något, så kan man få hittelön. Tänk på det." [F]

---

### M9 `eslov`: **"Heja Eslöv!"**

| giver | at | level | reward | unlock | bustFails |
|---|---|---|---|---|---|
| `berra` | `poolbar` | island | 500 pta | `grisbil` (to `flamencoLot`) | yes (stage 6) |

**Intro**
```
berra:  Det är ju fan vad solen tar här nere, Rob

```
berra:  Det är ju fan vad solen tar här nere, Robban. [F]
berra:  Ska vi ta Pepes Bodega i dag eller ska vi sola? [F] (t)
robban: Men va fan, vi kan väl ta det lite lugnt! Vi har ju semester! [F] (t)
berra:  Vi är på södra Gran Canaria och havet är där, va. Då måste bodegan ligga ditåt. [F]
berra:  Du, terroristen, du har ju bil. Kör oss! [N]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | pickup | `who:'berra', also:['robban'], name:'Berra och Robban', at:'poolbar'` | Hämta Berra och Robban |
| 2 | goto | `to:'bodega1', radius:8, passenger:'berra'` | Bodegan ligger ditåt! |
| 3 | goto | `to:'vischan', radius:10, passenger:'berra', timer:90` | Längre bort… |
| 4 | scene | the `eslov` NPC passes on roller skis; effects `{unlockDoor:'grisbil'}` | — |
| 5 | getInCar | `car:'grisbil'` | Lifta med grisbilen |
| 6 | goto | `to:'flamenco', radius:10, passenger:'berra', timer:100, shame:true` | Hem till Flamenco – Lasse har sett grisarna! |

Stage 2 radio, and on arrival:
```
robban: Fan Berra, ja ä tösstig. [F]
berra:  Fan Robban, du har ingen karaktär! [F]
toast:  Fel bodega. – Vi tar första bästa. [F*]
```
Stage 3 radio:
```
berra:  Det här är ju rena vischan. Vi måste ha gått för långt. [F]
robban: Fan, vad jag är törstig. [F]
```
Stage 4:
```
berra:  Jag går inte en meter till. Vi liftar. [F]
berra:  Heja Eslöv! [F]
robban: Herre jävlar! [F]
robban: Fan, de luktar. [F]
berra:  Skit i det. Vi slipper gå. [F]
```
Stage 6 radio:
```
lasse: Grisar på hotellområdet?! Det ingår inte i mina åtaganden! [N]
```
Fail text: *"Lasse tog grisbilen. Friskotek i morgon bitti."*

**Outro.** The camera briefly frames the `PEPES BODEGA` sign behind them. Nobody notices.
```
robban: Ja, herre jävlar, minns du Benidorm? Snacka om grisfest! [F]
berra:  Var jag med där? Hade jag kul? [F]
```

---

### M10 `fataga`: **"Släpas runt som en skock får"**

| giver | at | level | reward | extra |
|---|---|---|---|---|
| `majsan` | `flamencoPool` | island | 600 pta | siv, lasse, affe, mamma, pappa, jose, fruStorch |

**Intro**
```
majsan: Vad jobbar du med, då? [N]
stig:   Om du köper en brödrost, och det står 'Kontrollerad av G17', så är det jag. [F]
majsan: Själv brukar jag säga att jag går på gatan. [F*]
majsan: Gillar du fotboll också? [F] (t)
majsan: Du, vill du smörja in mig på ryggen? [F] (t)
majsan: Ta inte för mycket, då kan det börja koka. [F] (t)
siv:    Jag fick användning för din peppar. Han kom och hämtade mig. Gissa vem han hade med sig… Morsan! [F]
siv:    Ropa vieja – gamla kläder. Det är ungefär som pyttipanna. [F, José's line as Siv retells it]
majsan: Lasses utflyktsbuss till Fataga har redan gått! Kör efter! [N]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | pickup | `who:'majsan', name:'Majsan', at:'flamencoLot'` | Hämta Majsan |
| 2 | follow | `who:'affe', type:'bus', carName:'utflyktsbuss', start:'suntripLot', to:'fataga', via: intersections north on x=−40, then west on z=−200, maxDist:60, cruise:12` | Följ utflyktsbussen till Fataga |
| 3 | scene | `frame:['mamma','fruStorch']`; sheep scatter | — |
| 4 | rabbits | `kind:'far', count:6, near:'fataga', rMin:10, rMax:35, timer:75, barLabel:'FÅR', gotText:'Bäää!', failText:'Fåren sprang till Maspalomas!'` | Fånga fåren åt Josés pappa |
| 5 | goto | `to:'fatagaFar', radius:4` | Tillbaka till fårfållan |

Stage 2 radio (Lasse on the bus PA):
```
lasse: Fataga är en av de få ursprungliga byar som finns kvar på Gran Canaria. [F]
lasse: Om ni vill köpa deras broderade dukar, så pruta inte. Prutning och sånt kan ni hålla på med på marknaden. [F]
```
Stage 3:
```
fruStorch: Stackars människor som lever så här. [F] (t)
mamma:     Stackars människor. Släpas runt på dagarna som en skock får…! [F]
mamma:     ¡Las ovejas! [N]
```

**Outro**
```
mamma:  Det är hon som vill ta min Josito ifrån mig. [F]
majsan: Ska du inte köpa dukar av svärmor? [F] (t)
siv:    Jag ska satsa på Ole nu. Jag har inga fördomar mot norrmän. [F]
majsan: Nej, bara de inte går på tur… [F]
```

---

### M11 `grisfesten`: **"I kveld setter vi inn støtet!"**

| giver | at | level | reward | cost | extra |
|---|---|---|---|---|---|
| `ole` | `flamenco` | island | 800 pta | **800 pta** ("Grisfesten kostar 800 pesetas") | majsan, siv, gabbe, berra, robban, portier, angerud |

**Intro**
```
ole:  Skal du ha B-vitaminer? Bra for leveren. Grisefest, vet du. Ta to. [F-no]
ole:  Og jeg har C-vitaminer… jerntabletter, ginseng, tannkrem…? [F*]
ole:  Du, de er fine de rødhårete. Vi skulle ha satt inn et støt der. [F-no]
stig: Vi kan be receptionen sätta en blomster i deras rum. [F]
ole:  Blomster? … Meloner? Agurker? Bananer? [F-no]
stig: Men blommor… Gör man så i Norge? [F]
ole:  Blomsterspråket er internasjonalt. [F-no]
ole:  Fikser du ikke damer på grisefesten, da er det slutt. I kveld setter vi inn støtet! [F-no]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | rabbits | `kind:'blomma', flee:false, count:5, near:'flamenco', rMin:8, rMax:40, timer:60, barLabel:'BLOMSTER'` | Plocka blomster till Siv och Maj-Britt |
| 2 | race | `who:'gabbe', type:'bus', carName:'nattbuss', passenger:'ole', start:'suntripLot', checkpoints: 3 intersections between (3,2) and (2,0), finish:'grisfest'`; scene effects `{sky:'night'}` at start | Bussen till grisfesten går nu – kom först! |
| 3 | goto | `to:'dansgolv', radius:4` | Bjud upp Majsan |
| 4 | scene | `frame:['majsan','stig']`; Ole `cheer` anim; waltz tune | — |
| 5 | pickup | `who:'berra', name:'Berra', at:'tonga'` (Berra in the `down` pose until seated) | Bärra hem Berra |
| 6 | dropoff | `who:'berra', at:'flamenco'` (timer 90) | Till Hotell Flamenco |

Stage 1 radio:
```
ole: Man må skifte vannet hver fjerde time og gi dem en hodepinetablett. [F*]
```
Stage 2 radio:
```
gabbe: Häng med i Gabbes gäng! [F]
```
Stage 3 radio:
```
ole:  Neida, det er bare å spørre: Skal vi danse! Eller kjør litt større: Sånn! … Voulez-vous danse avec moi? Fransk. [F-no]
stig: Jag är skraj att de ska nobba. [F]
```
Stage 4:
```
majsan: Vill du dansa med mig? [F]
stig:   Får jag lov… [F]
siv:    Nu blev hon uppbjuden. [F] (t)
ole:    Heia Norge! [F-no]
siv:    Majsan, ta med dig giraffen så går vi på Tonga Tonga. [F]
ole:    Samba er fine greier! [F-no]
robban: Kan du hjälpa mig bära hem Berra? [F]
stig:   Vilket snack! 'Bärra hem Berra!' [F]
```

**Outro** (night at Flamenco). The sky returns to `island` afterwards, because the next morning is Christmas Eve.
```
majsan:  Vad härligt det är med de här varma nätterna. Snart ska man hem till slasket igen. Jag vill inte åka hem. [F]
majsan:  Jag gruvar mig lite för flygresan. [F]
stig:    Jag kan flyga, jag är inte rädd. [F]
majsan:  Nu skulle Levander se oss! [F]
majsan:  Du… gillar du bruna bönor? [F]
stig:    Jag avskyr bruna bönor. [F]
portier: Det är förbjudet att ta med damer på rummet. Men för 500 pesetas kanske vi kommer överens. [F]
angerud: 500 pesetas…? Det här är ju min fru. [F]
portier: Det tror jag inte. [F]
angerud: Måtte djävulen ta alla fruntimmer! [F]
```
If the mission fails or is aborted, cleanup restores the `island` sky and the `sol` tune.

---

### M12 `julafton`: **"Feliz navidad"**

| giver | at | level | reward | extra | ends |
|---|---|---|---|---|---|
| `ole` | `flamencoRum` | island | 1000 pta | tjansteman, lasse, herrStorch, majsan, berra, robban, angerud, stadare, saljaren, mamma, carmencita, siv | game-complete banner, Rio card |

**Intro**
```
ole:        Morn, gutten min! [F]
stig:       Morrn morrn. [F]
ole:        Feliz navidad. [F]
stig:       Vad sa du? [F]
ole:        Det betyr 'god jul' på spansk. [F*]
stig:       Javisst, det är julafton i dag. [F]
stig:       Måste man gå på den där julfesten? [F*]
majsan:     Var inte så typiskt svensk. [F]
stig:       Det är väl typiskt svenskt att ha julfest bland palmerna. [F]
tjansteman: (radio) Señor Olsson? Hammarby…? Er väska har kommit – men den står på bandet till Tokio! [N]
```

| # | kind | params | text |
|---|---|---|---|
| 1 | goto | `to:'flygplats', radius:12, timer:90` | Till flygplatsen – väskan ska inte till Tokio! |
| 2 | destroy | `type:'bagagebil', driver:'tjansteman', carName:'bagagebil', timer:60, cruise:18, barLabel:'BAGAGEBIL', failText:'Väskan flög till Tokio.'` | Stoppa bagagebilen! |
| 3 | grab | `item:'vaska'` (at the wreck) | Ta väskan |
| 4 | goto | `to:'suntripPool', radius:8, timer:90` | Till SunTrips julfest vid poolen |
| 5 | scene | the Christmas party at the pool (lines below) | — |
| 6 | scene | `cam` on Angerud's door at `rum113`: the chaos | — |
| 7 | pickup | `who:'angerud', name:'Angerud', at:'flamencoLot'` | Angerud har fått en hjärtattack – hämta honom! |
| 8 | dropoff | `who:'angerud', at:'klinik'` (timer 75) | Kör Angerud till kliniken! |

Stage 3 toast/bubbles:
```
tjansteman: Hittelön. [F] (t)
stig:       Tack så mycket. [F] (t)
```
Stage 5, the Christmas party at the pool. "Små grodorna" (traditional) plays in the pool.
```
lasse:      Hej tomtegubbar slå i glasen… Skål och god jul! [F]
ole:        Ta av lokket! Objektivlokket. Må ta av det, vet du. [F-no]
ole:        Har du filmet sånn lenge? [F-no]
herrStorch: Hela veckan. [F]
ole:        Det var synd. Det blir ikke noe film da. [F-no]
herrStorch: Blir'e inge film? [F]
majsan:     Jag har köpt en julklapp till dig. [F]
stig:       Precis en sån har jag önskat mig. [F] (t)
berra:      Robban! Jag hittade Pepes Bodega! [F]
robban:     Det var som fan! Var låg det? [F]
berra:      Det ligger på baksidan av hotellet. [F]
robban:     Och vi som har letat igenom hela jävla Nueva Estocolmo! [F]
ole:        Hva i all verden… [N]
stig:       Femtio… tusen… kronor. I knäckebrödet. [N]
```
Stage 5 also shows a plastic giraffe in Stig's hand and opens the knäckebröd packet with banknotes.

Stage 6, the chaos:
```
stadare:    Limpio! [F]
saljaren:   Jag var tvungen att sälja tomten i morse. De skrev på. [F]
mamma:      Ni har dragit skam över vår familj! [F]
carmencita: Det är inte han. Den andre! [F]
stadare:    God jul! Hoppsan. Stör jag? [F]
siv:        Gösta, ska du inte med på julfesten? [F]
angerud:    Ut! Ut! [F]
```
Stage 8 radio:
```
lasse: Ring kliniken! [F*]
```

**Outro** (at the clinic)
```
ole:  Og så Rio! Stranda, jentene og samba. [F-no]
ole:  Tre ganger så fort som en geværkule! [F-no]
stig: Jag kan flyga, jag är inte rädd. [F]
```

**Game complete.**
- Banner `NUEVA ESTOCOLMO KLARAT!`, sub *"Nästa stopp: Rio."*
- Optional Rio card (§9).
- Afterwards the island is free-roam:
  - the `PEPES BODEGA` sign is lit and gets a map label;
  - Berra and Robban stand outside the bodega for good, with chatter "Pepes Bodega. Glöm aldrig det, du." [F].

---

## 8. Collectibles and currency

### 8.1 Oles prylar (7, spinning items with a light beam; replaces records)
Ole explains it [N]: *"Bagen min revnet på bussen – dingsene mine er spredt over hele øya!"* Each pickup plays a radio line from Ole, and the jingle is `pryl`.

| # | gadget (mesh) | spot (a climb or jump challenge) | Ole's radio line |
|---|---|---|---|
| 1 | Digitalklokka | the church roof ridge, `kyrka` (bounce from the market awnings next door) | "Digital, analog, spansk, norsk, svensk tid, kronometer, og så klokke." [F-no] |
| 2 | Pool Pen | the diving board over the SunTrip pool | "Penn som skriver under vannet." [F-no] |
| 3 | Sveitserkniv | the crane deck at `bygge` | "Swiss Army Knife. … Saks – uten skrutrekker." [F-no] |
| 4 | Kamera to | the DC-7's wing, `dromplan` | "Kamera. Skjerpe. Smil." [F-no] |
| 5 | Kalkulator med vekkerklokke | the market stall roofs | "Kalkulator – med vekkerklokke!" [F*] |
| 6 | Svømmebriller | the lifeguard tower, `playa` | "Mot klor." [F-no] |
| 7 | Vanntett pengepung | the barn roof at `grisfest` | "Å ha penger i når man svømmer." [F*] |

**All 7:** Ole says "Uunnværlig!" [F-no], +1000 pta, and the **Samba** music track unlocks (§9).

### 8.2 Concorde-modeller (7, flying a figure-8; kick or stomp them; replaces mosquitoes)
- Each one is a small white delta wing with a drooped nose. A jet `whoosh` plays when you are within 12 m.
- Spots, at heights between 1.6 and 5 m:
  1. above the Flamenco pool;
  2. the Kasbah courtyard;
  3. the airport tower;
  4. the golf pond;
  5. Fataga square;
  6. the dyner ramps;
  7. the klinik roof.
- Each catch gives the toast *"Concorde n/7"*.
- **All 7:** Ole: "2 300 km i timen. Det er flyging!" [F-no], +1000 pta, and the `stigRio` white dinner jacket unlocks.
- The big-map legend reads "M stänger · ! uppdrag · ● Oles prylar · ● Concorde".

### 8.3 Pesetas
- A coin is a *duro*, worth 5 pta. HUD: `1 240 PTA`.
- Coin sources:
  - sidewalk coin lines (the existing generator);
  - arcs over the `bygge`, `dyner` and `rocas` ramps;
  - in level 1, loose coins under seat rows and in the terminal.
- Money flow:

  | direction | item | amount |
  |---|---|---|
  | in | mission rewards (M1–M12) | 5 550 pta total |
  | out | donkey | −200 |
  | out | pig party | −800 |
  | out | FRISKOTEKET | −250 |
  | out | PANIK | −25 |

  By M11 the player has earned 3 100 or more, which covers the 800 pta cost.
- Big-map exchange sign (flavour only): `1 KR = 17 PTA`.

---

## 9. Unlockables

| unlock | from | effect |
|---|---|---|
| **Buss 17** | M5 | drivable SunTrip coach at `suntripLot` |
| **Grisbilen** | M9 | fast pickup (maxSpeed 36, accel 15, oink horn) at `flamencoLot`. Toast: *"Grisbilen står vid Flamenco. Den luktar."* |
| **Samba** | Oles prylar 7/7 | `setTune('samba')` becomes the island day music. Ole's chatter switches to "Samba!" |
| **Vit smoking** | Concorde 7/7 | `stigRio` outfit, toggled with E at `flamencoRum` |
| **Pepes Bodega lit** | M12 | sign lights up, map label, Berra and Robban posted there |
| **Rio card** (optional, cut-able) | M12 | 15 s non-playable cinematic at x=3000, z=1200: water plane, boat (GeoBuilder), Sugarloaf cone, the four characters in white jackets, the `samba` tune, then the camera returns to the island |

---

## 10. Title screen, pause, HUD strings

**Title (`index.html`)**
- `<title>Charter & Run</title>`, `lang="sv"`.
- h1: `<span class="t1">CHARTER</span><span class="amp">&amp;</span><span class="t2">RUN</span>`. The t1 span is sun yellow and t2 is butane orange.
- Tagline: *"Svenskarna reser inte till någonting… dom reser från någonting."* [F, the film's opening card]
- Second line: *"Julen 1979. Stig-Helmer är flygrädd."*
- Buttons: `SPELA`, `Laddar…`.
- Fine print: *"Ett hyllningsspel gjort av fans. Inte knutet till SunTrip, som inte finns, eller till någon annan."*
- Background gradient: sunset orange to sea blue. The idle orbit goes around `flamencoPool` (island day palette).
- Loading texts:
  - "Fäller upp landningshjulen…"
  - "Överbokar Hotell Flamenco…"
  - "Häller 80-procentig rom på vinflaskor…"
  - "Målar åsnan röd…"

**Controls card**

| key | action |
|---|---|
| WASD / pilar | gå / kör |
| Mus | titta |
| Shift | spring |
| Space | hoppa (två gånger!) · handbroms |
| J / klick | sparka · i luften: stampa |
| E | prata · sätt dig · in i / ut ur bil · ta bil |
| **V** | **Jag kan flyga** (sträck ut armarna) |
| M | karta |
| H | tuta |
| N | ljud av |
| R | loss |
| Esc | paus |

**Pause:** `Paus`, `Fortsätt`, `Musik: på/av`, `Ljud: på/av`, `Radera framsteg` (confirm: "Radera alla framsteg och börja om?").

**HUD and engine strings**

| English | Swedish |
|---|---|
| SHAME | per level: `FLYGRÄDSLA` / `TYPISKT SVENSK`; CSS `::after` becomes `" · SPRING!"` in pursuit |
| MPH | `KM/H` |
| MISSION COMPLETE! | `UPPDRAG KLART!` with sub `+{n} pesetas` |
| MISSION FAILED | `UPPDRAG MISSLYCKAT` |
| Mission i of n | `Uppdrag {i} av {n}` |
| retry / give up | `<b>E</b> Försök igen · <b>Q</b> Ge upp` |
| Try again! | `Försök igen!` |
| new mission toast | `Nytt uppdrag: hitta <b>{name}</b>` |
| WRECKED! | `KVADDAD!` |
| Back on the road! | `Tillbaka på vägen!` |
| That one's busy! | `Den är upptagen!` |
| Talk to X / Steal car / Get in | `Prata med {name}` / `Ta bilen` / `Hoppa in` / `Sätt dig` |
| Get in a car | `Hoppa in i en bil` |
| Out of time! | `Tiden är ute!` |
| Get back in a car! | `Tillbaka in i en bil!` |
| Go back for X! | `Åk tillbaka efter {name}!` |
| Never leave me again! | `Lämna mig aldrig igen!` |
| Pick up X | `Hämta {name}` |
| Slow down to pick them up! | `Sakta in så de kan hoppa in!` |
| Go go go! | `Kör, kör, kör!` |
| Stop the car! | `Stanna bilen!` |
| LOSING HIM! / DISTANCE | `DU TAPPAR DEM!` / `AVSTÅND` |
| You wrecked X's ride! | `Du kvaddade {name}s bil!` |
| You lost X! | `Du tappade bort {name}!` |
| 1ST / 2ND · CHECKPOINT | `1:A · KONTROLL` / `2:A · KONTROLL` |
| GO! | `KÖR!` |
| X won the race! | `{name} vann!` |
| TARGET | `MÅL` |
| It got away! | `Den kom undan!` |
| Sound off / Sound on | `Ljud av` / `Ljud på` |
| fatal error prefix | `Något gick sönder: ` |

---

## 11. Music and sound

**Hard rule.** No melodies from *Freight Train* (the welcome song), *Kostervalsen*, *Feliz*, Bengt Palmers' score, or any other recognisable hit.

- Allowed public-domain traditional tunes: **"Små grodorna"**, **"Hej tomtegubbar"** and **"Helan går"**.
- Everything else is original and synthesised on the existing scheduler through `setTune(name)`.

| tune | where | sketch |
|---|---|---|
| `muzak` | Arlanda, cabin | 92 bpm, Fmaj7–Dm7–Gm7–C7, soft sine stabs, brushed shuffle. Sleigh-bell ticks at Arlanda. Above 70 % fear a tremolo LFO on the keys plus a faint high sine (tinnitus). |
| `sol` | island day, title | 116 bpm straight eighths, A-minor Andalusian cadence Am–G–F–E. Root–fifth bass; "timple" plucked triangle arpeggios; accordion pad of two detuned lowpassed squares (Affe); conga thumps and slaps (Gabbe); castanet clicks. |
| `vals` | pig party night | 3/4 at 150 bpm, oom-pah bass on 1, chord stabs on 2–3, improvised accordion arpeggios |
| `jul` | M12 | "Små grodorna" (PD) on accordion square plus sleigh bells. "Hej tomtegubbar" (PD) for the toast. |
| `samba` | Ole's boombox, unlock | 100 bpm: surdo (low sine) on 2, syncopated tamborim clicks, two-tone agogô |

**Cue:** "Helan går" (PD) plays faintly on M5's first night.

**SFX** (all `tone`/`noise`):

| sfx | sound |
|---|---|
| seat-belt | `pling` 659 Hz sine, then `plong` 523 Hz |
| PA | `dingdong` before the captain speaks |
| cabin `drone` | new persistent channel |
| landing gear | `thud` (low sine slide plus a noise thump) |
| `applause` | 12 short noise bursts over 2 s |
| metal detector `beep` | 880 Hz square pulses ×3 |
| `bark` | dog |
| `baa` | sheep: tone slide 420 → 300 Hz with vibrato |
| donkey "i-ah" | two slides |
| `oink` | grisbil horn |
| Lasse's `whistle` | 2800 Hz square trill; replaces `shameBell` |
| Concorde `whoosh` | bandpass noise sweep |
| `pryl` jingle | replaces `record` |

---

## 12. Visual style and palette

Cel-shaded toon with inverted-hull outlines, as in the engine. Ink `#1d1426` stays.

| zone / palette | sky top | horizon = fog = body bg | fog near/far | sun (colour, intensity) | hemi sky / ground (intensity) | notes |
|---|---|---|---|---|---|---|
| `arlanda` | `#4a5666` | `#9aa6b2` | 60 / 300 | `#dfe8f2` 1.2 | `#c8d4e0` / `#f0f4f8` | snow squall fx, dark winter morning |
| `clouds` | `#e8eef4` | `#f4f6f8` | 5 / 60 | — | — | white-out |
| `above` | `#1f6fd0` | `#bfe0ff` | 300 / 900 | `#fff4dc` 3.0 | `#e6f2ff` / `#ffffff` (1.9) | `cloudY` −220 gives a cloud sea below; no cabin shadows |
| `descent` | `#2a86e0` | `#f2e4c4` | 260 / 820 | — | — | soldis (sun haze), sea plane visible |
| `island` | `#2a86e0` | `#f2e4c4` | 260 / 820 | `#ffe7b8` 2.9 | `#d8ecff` / `#a08060` | |
| `night` | `#141a3c` | `#3a2f4e` | 120 / 600 | `#9fb4ff` 0.9 | `#5a6aa0` / `#3a2a20` (0.9) | string-light bulbs as unlit `MeshBasic` |

**Material palette**

| family | colours |
|---|---|
| Island | whitewash `#f4efe4`, terracotta `#c8643c`, bougainvillea `#d6337f`, palm `#3f7a3a`, sand `#e8cf8f`, volcanic ochre `#b5723a`, red rock `#a8442a`, sea and pools `#2f8fc8` (`MAT.water`), butane `#f07a1e` |
| SunTrip brand | sun `#ffd23f` with red text `#d8321e` |
| Cabin | seats `#D2601F`, antimacassars `#F2EFE6`, walls `#E6DCC4`, drape `#1F4F55`, flight attendant `#1E9AA0`, tray `#9A9A92`, sign red `#E0342A` |
| Fuselage | white `#F4F4F0`, cheatline `#1B2F6B`, belly `#B8BEC6`, tail sun `#F07A1E` |

**CSS tokens:**
- keep `--ink`, `--cream`, `--yellow`;
- replace purple/pink with `--sea #2f8fc8`, `--butano #f07a1e`, `--suntrip #d8321e`.
- `.pause-card` is sea blue.
- The title gradient runs `#f07a1e` to `#2f8fc8`.
- `#bigmap` canvas background is sand `#e8cf8f`.
- Meter fill: the panic colour on level 1, and yellow turning to SunTrip red on the island.

---

## 13. Test plan (`tools/shot.mjs story`)

**Pass criterion.** `[t] done -> #12 idle`, no `scenario failed:`, and the last line `no errors`. Update `CLAUDE.md:11` and `README.md` to match.

**Harness changes**
- At the top of `startMission`, wait `frames(3)` and re-read the giver after the warp. This fixes the giver-relocation race.
- At story start, call `__game.addCoins(3000)` so cost-gated missions start under `FROM=`.
- Add `__game.debugSit(lm)`.
- Test mode auto-presses `press` steps after 1 s, and auto-mantra holds V while a timeline or mantra stage is active. The script can also hold `KeyV` with `page.keyboard.down`.

| M[k] | script |
|---|---|
| 0 | start; warp onto `stage.list[0]` (the dog); warp `arlBand`, then `arlBage`, then `arlLounge`; `waitIdle(1)` |
| 1 | start; warp `arlHerrtoa`; hold V 4 s; warp `arlDamtoa`, then `cabinDoor`; `waitIdle(2)` |
| 2 | start; `debugSit('seat14B')`; hold V through the timeline; warp `seat7`, then `seat14B`; `waitIdle(3)` |
| 3 | start; warp onto each bottle (≤ 8 tries); warp `seat19`; `debugSit`; hold V; `waitIdle(4)`; assert `level === 'island'` |
| 4 | start; `enterCar(named.buss17)`; warp `flamenco`; `waitIdle(5)` |
| 5 | start; warp `flamencoRum`, then `suntripPool`; warp onto the balls ×8; `waitIdle(6)`; assert the outfit |
| 6 | start; warp onto the röka; anyCar; warp next to Angerud; warp `bungalow`; `waitIdle(7)` |
| 7 | start; anyCar; pickup Ole; warp `marknad`, `asnaStall`, `supermercado`, `ferreteria`, `vikingbar`; `waitIdle(8)` |
| 8 | start; anyCar; warp next to Berra; warp `bodega1`, then `vischan`; `enterCar(named.grisbil)`; warp `flamenco`; `waitIdle(9)` (the forced pursuit should not catch within the warps) |
| 9 | start; pickup Majsan; warp 12 m behind `stage.car` repeatedly; warp onto the sheep ×6; warp `fatagaFar`; `waitIdle(10)` |
| 10 | start (cost); warp onto the flowers ×5; warp through `stage.cps`; warp `dansgolv`; pickup Berra at `tonga`; warp `flamenco`; `waitIdle(11)` |
| 11 | start; warp `flygplats`; `stage.car.damage(999)`; warp onto `stage.item`; warp `suntripPool`; pickup Angerud; warp `klinik`; `waitIdle(12)` |

**Other scenarios**
- Rewrite `views` for the island landmarks plus `arlGate`, `seat14B` and `cabinDoor`. Add `cabin` (dollhouse screenshot) and `flight` (sky palettes).
- Rename the `chaos` and `wizard` scenarios to the `suntripvan` and `lasse` pursuit.
- Change `smash` to target a `parasoll`.
- Retarget `foot`: awnings at `marknad`, a Concorde, and a parked `hatch`.

---

## 14. Work packages (for a team of agents, with file ownership)

This document fixes the shared contracts: landmark ids, CHARS keys, item and rabbit kinds, palette names, stage-kind signatures and tune names. Agents build against these names in parallel.

| WP | owner files | scope | depends on |
|---|---|---|---|
| **A: engine core** | `main.js`, `gfx.js`, `camera.js`, `input.js`, `hud.js` | level system and guards (§6.2.1); sky palettes and `cloudY`; camera interior profile and nearest-hit `segmentBlocked`; mantra input and anims hook-up; `sitAt`/`sitPlayer`; outfit swap; `cost`/`after`; meter HUD rename; Swedish strings; km/h; blip regex; pesetas; NPC culling at > 190 m | — |
| **B: flight zone** | new `world/flight.js` | Arlanda hall, jetway, cabin shell and seats, apron, `buildAirliner()` (shared with Gando), `Trolley`, `AislePacer`, cloud puffs, flight landmarks, seated bust rows | A (Frame export, sit helpers) |
| **C: island world** | `world/layout.js` (MAP), `world/town.js`, `world/props.js` | 19 builders (§4.2), `house()` bungalow, palm trees, outskirts (sand, sea, hills), signs, props TYPES, named cars, ped loops | — |
| **D: cast and vehicles** | `actors/models.js`, `actors/car.js`, `actors/pickups.js`, `actors/peds.js` | 30 CHARS entries plus the new fields (§6.4); `randomPed` palettes; car types and flags (§4.3); item and collectible mesh tables; Rabbit kinds (hund, kula, far, flaska, blomma) with flee flag; ped shouts | — |
| **E: missions and meter** | `game/missions.js`, `game/shame.js` | new kinds (`scene`, `sit`, `mantra`, `timeline`) and extended ones (`rabbits`, `grab`, `pickup.also`, `destroy.driver`); the 12 MISSIONS with all dialogue from §7; Shame `configure()` with panic mode and pursuit config | A, D |
| **F: audio** | `audio.js` | `drone` channel, `setTune` with 5 tunes and the catch-up fix, sfx list (§11) | — |
| **G: tests and docs** | `tools/shot.mjs`, `README.md`, `CLAUDE.md`, `Makefile`, `package.json`, parent `../CLAUDE.md` | story `M[]` (§13), scenarios, ports 8840/8841, fix the `test` script, point the parent CLAUDE.md at `charter_and_run__sallskapsresan/` | everything |

**Merge order:** A, D, F; then B, C; then E; then G. Run `node tools/shot.mjs story views cabin flight title` after each merge.

---

## 15. Risks and cut list

| # | risk | mitigation |
|---|---|---|
| 1 | **No ceilings or overhangs.** In the cabin the camera can clip or float. | Cut-away dollhouse, interior profile with pitch clamp and yaw lock, scripted `cam` in cabin scenes. Verify with the `cabin` screenshot. |
| 2 | **Town-only helpers misbehave at x=3000** (R reset, `freeSpot`, `routeAim`, minimap, pursuit spawn, `placeNpcs`, title orbit) | One `game.level` guard list (§6.2.1); `levelBounds` per level |
| 3 | **Seated characters** don't update x/y/z, and the giver relocation would pull Ole out of his seat | `sitAt` sets x/y/z; `placeNpcs` re-sits seat homes; givers' `at` equals their home |
| 4 | **The Shame refactor** breaks island pursuit | Keep the public API; story M[8] exercises the forced pursuit; keep the `chaos` and `wizard` scenarios |
| 5 | **The `rabbits` generalisation is used in 6 stages**, so one bug breaks many | Unit-style screenshot scenario per kind; `rMin`/`rMax` and level bounds tested in the cabin (bottles) and the terminal (dog) |
| 6 | **Two passengers (`also`)** hit the duplicated seat geometry (4 places) | Rear-seat offset only in `seat()`. Fallback: Robban rides off-screen (cinematic) and only Berra is seated. |
| 7 | **Outfit swap** loses the player key, portrait or talker anim | `setPlayerOutfit` keeps `key='stig'` and re-renders the portrait; checked in M[5] |
| 8 | **Swedish, Norwegian and Spanish glyphs** (å ä ö ø æ ñ ¡ ¿) in canvas signs and HUD | Luckiest Guy's Latin-1 covers them; `views` screenshots; uppercase written in the literals |
| 9 | **Copyright and trademarks** | No film melodies (PD trad only); no Scanair, SAS or Wasa logos (fictional SunTrip, generic "KNÄCKEBRÖD"); lyrics only as short spoken quotes; real names (Stenmark, Swahn, Falk, Uggla) only inside quoted film lines; the cleaning lady is credited as "Städerskan" without the actor's name; disclaimer on the title card |
| 10 | **Scope**: 12 missions, 19 block builders, ~30 characters | See the cut list below |
| 11 | **Story flake** (giver race) and cost gates under `FROM=` | `frames(3)` and re-warp; `addCoins(3000)` at story start |
| 12 | **Unattended timelines** in test mode | Auto-press and auto-mantra in `?test=1`; timeline end ≤ 24 s |
| 13 | **Performance**: ~25 named NPCs, 100 cabin busts, 30 sign meshes on the island | Merge busts into 2 meshes; hide NPCs > 190 m like peds; flight-zone NPCs are invisible from the island |
| 14 | **Sunken pools are impossible** (no holes in collision) | Raised pools (kind `pool`, top CURB+0.5) with `splash` on landing |
| 15 | **The night palette leaks** after a failed or aborted M11 | Mission `cleanup` restores the `island` sky and `sol` tune |
| 16 | **Tone**: the heart attack, Spanish family stereotypes, Berra's T-shirt | Rescue framing (drive to the clinic); affectionate film lines only, no mock accents; the T-shirt text appears only cut off on a market sign |
| 17 | **Speaker attribution** of film quotes is uncertain in places | Lines marked (t) in this document; never claim a specific speaker in the README or credits; [N] lines never appear as film quotes |

**Cut list, in this order if time runs short:**
1. The Rio card. End on the banner instead.
2. `flygfalt`: move the DC-7 onto the `flygplats` block.
3. M7 `bungalowen`. Fold the "hepåre" exchange into M6's outro and turn the bungalow into a landmark with the seller's chatter.
4. The `dyner` and `rocas` builders. Fall back to `bung`/`playa` variants.
5. The Arlanda peds and the security-queue extras.
6. M10 stage 4 (the sheep). Keep the follow stage plus the scene.