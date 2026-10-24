# Röster, version 2 – statisterna, ropen och resten av replikerna

*Version 1 (`features/implemented/roster.md`) gav uppdragen, SKANDAL, "Prata med gänget", mantrat och
nästan alla free roam-repliker röst, sagda av rollfigurerna. Här är resten: en pool med tio röster för
de anonyma turisterna och lokalborna, ropen, småpratet, mikrofonen, tutan och de free roam-repliker
som sägs av figurer utan roll. Verktyget, röstkön, ljudkedjan och läppsynken finns redan. Det som
behövs är rollbesättningen av poolen, lite kod för att välja poolröst, inkopplingen av talarna utan
identitet och credits (avsnitt 5).*

**Kategori:** Ljud / teknik · **Var:** hela ön, mest free roam · **Insats:** M – mest
rollbesättning och inkoppling; verktyget har allt utom poolen · Kostar ElevenLabs-credits (avsnitt 5).

## Kortversion

- **Kvar efter version 1** (torrkörningen 2026-10-23, `make voice DRY=1 ALL=1`): 541 repliker och
  12 781 tecken. Dessutom ska statisternas repliker sägas med flera röster var (avsnitt 3).
- **Poolen:** sex svenska turiströster (tre kvinnor, tre män) och fyra spanska (två och två), valda
  på Voice Librarys gratisprov. En statist får en röst av sitt kön och sin sort ur sitt eget frö och
  låter alltid likadant.
- **Ropen:** de nio största rollfigurerna ropar med sin egen röst; de små rollerna lånar en poolröst
  (svar 3 i roster.md §13: "kan låna en poolröst").
- **Kostnad:** ungefär **14 000 credits** med omtagningar (avsnitt 5).
- **Tester:** `vpool` (statisterna har röster av sitt kön och sin sort, alltid samma) och `vfree` (ett
  urval av free roam-featurerna med rösterna på).

## 1. Det som redan finns

- `tools/voice/voice.mjs` (torrkörning, tak, kontroll med lokal taligenkänning, omtagningar,
  efterbehandling, manifestet), `review.mjs`, `analyze.py`. Make-målen står i CLAUDE.md ("Voices").
- `src/content/script.js` `allLines()` och `src/content/scriptFeatures.js`: varje tabell med sin
  talare. Pseudotalarna (`@tourist`, `@local`, `@shopClerk`, `@guaguaDriver`, `@foreman`,
  `@bartender`, `@farmer`, `@coupleWoman`, `@coupleMan`, `@partyGuestMan`, `@partyGuestWoman`,
  `@vendor`, `@kiosk`, `@grocer`, `@fruitSeller`) står där i dag men har inga röster.
- `tools/voice/cast.json`: 32 roller. `scope` gör version 1 och free roam-featurerna för talare med
  en roll, utom `feature:mikrofon` och `feature:honk` (`not`). Version 2 tar bort `not` och lägger till
  `chatter` och `barks` i `parts`.
- `src/voice.js`: `voiceFor` ger i dag `null` för en statist (ingen röst, som förut).

## 2. Det som är kvar

| Del | Repliker | Tecken | Talare |
|---|---|---|---|
| **Ropen** (`barks`: BARKS och deras varianter) | 293 | 5 338 | 28 rollfigurer med samma tabeller (svenska 10 repliker / 260 tecken, lokala 11 / 110), `@tourist` 9 / 256, `@local` 10 / 102 |
| **Småpratet** (`chatter`) | 49 | 1 616 | rollfigurerna (Ole 491, Angerud 164, Siv 131 …) |
| **Mikrofonen** (`feature:mikrofon`) | 41 | 2 053 | Stig 1 842 (utropen i läget `pa`), publiken 118 |
| **Tutan** (`feature:honk`) | 45 | 694 | rollfigurerna och de lokala |
| **Free roam, statisterna** | 93 | 2 499 | `@tourist` 777, `@shopClerk` 438, `@guaguaDriver` 337, `@foreman` 328, `@local` 262, `@coupleWoman` 229, `@bartender` 184, `@farmer` 107 och sju små |
| **Free roam, figurer utan roll** | 20 | 581 | rullskidåkaren (`eslov`), bartendern (`camarero`), grisfestvärden (`varden`) med flera |

Mikrofonen och tutan väntade med flit: båda har publik eller statister som svarar, och de ska låta
som en helhet.

## 3. Poolen

- **Tio röster ur Voice Library,** valda på gratisprovklippen och mätta med `analyze.py` som de små
  rollerna i version 1 (`audition: false`, inga betalda provläsningar): sex svenska turister (kvinnor
  och män, 25–65 år) och fyra spanska lokalbor. Inga röster som härmar någon.
- **I `cast.json`:** rollerna `pool_sv_f1` … `pool_es_m2` med `"pool": { "sex": "f", "kind":
  "tourist" }`. Verktyget expanderar en pseudotalares replik till varje poolröst som kan säga den.
- **Vem som säger vad:**
  - `@tourist` och `@local` i ropen: alla poolröster av den sorten (6 × 260 och 4 × 110 tecken).
  - `@tourist` och `@local` i free roam-replikerna: en kvinna och en man var, efter talarens kön.
  - De namngivna statisterna (`@shopClerk`, `@guaguaDriver`, `@foreman` …) får en fast poolröst
    var, eller en egen nyckel och roll om de finns i CHARS (`eslov`, `camarero`, `varden`).
  - De små rollernas rop: rollen får `"barks": "pool"`, och `voiceFor` ger dem poolrösten av deras
    kön och sort när de ropar. Det gäller Herr och Fru Storch, Sulan, flygvärdinnan, kontrollanten,
    Affe, Gabbe, Bungalowförsäljaren och de spanska småfigurerna.
- **I spelet:** `voiceFor` ger en statist (`randomPed()`: kön ur `lashes`, `local`) en poolröst ur
  fröet, alltid samma för samma person (Saab-spelets `voiceFor` gör så). Manifestet får `_pool`:
  `{ tourist_f: [...], tourist_m: [...], local_f: [...], local_m: [...] }`.

## 4. Inkopplingen

Talare som saknar identitet i dag och behöver `who` (eller en poolröst) för att höras:

- Ankarna utan talare: glasskioskens fönster (`glass.js`, `@kiosk`), butikernas röster över dörren
  (`sisters.js` `shopAnchor`, `@grocer`), utflyktsbussens turister (`utflykt.js`), guaguans chaufför
  (`guagua.js`), hundägarnas röst från huset (`dogs`), traktorns bonde (`traktor.js`, `@farmer`).
- Statisternas rop: `peds.js` (undanhoppet), `Game.bark`, SKANDAL:s vittnen (`shame.js`).
- Publiken vid mikrofonen (`mic.js`), terrassens gäster (`terraza.js`), grisfestens turister
  (`grisfestFree.js`), turistparet (`touristPhoto.js`), förmannen och arbetarna (`packhus.js`).
- Repliker som står direkt i koden (`peds.js`, `cabin.js`, `shame.js`) flyttas till `content/` eller
  får en generator i `scriptFeatures.js`, så att `allLines()` ser dem.

`vfree` visar om någon replik fortfarande går förbi rösten.

## 5. Kostnad

Räknat med 1 credit per tecken (`eleven_v4`, som version 1).

| Vad | Tecken | Credits |
|---|---|---|
| ropen, poolen: 6 × 260 (svenska) + 4 × 110 (lokala) | 2 000 | 2 000 |
| ropen, de nio största rollfigurerna med egen röst | 1 860 | 1 860 |
| småpratet | 1 620 | 1 620 |
| mikrofonen (publikens del två gånger) | 2 170 | 2 170 |
| tutan | 690 | 690 |
| free roam, `@tourist` och `@local` (två röster var) | 2 080 | 2 080 |
| free roam, de namngivna statisterna och figurerna utan roll | 2 040 | 2 040 |
| pilot: två repliker per poolröst | 600 | 600 |
| omtagningar (~6 %) | 800 | 800 |
| **summa** | | **~14 000** |

- Inga betalda provläsningar: poolen väljs på gratisprovklippen.
- **Kontot efter jobb 1** (2026-10-24): 15 047 credits kvar, och nya kommer 2026-11-09 (starter, 90 000
  i månaden). Jobb 1 kostade 29 836 och hade en omtagningsandel på ungefär 3,5 %. De spanska rollernas
  omtagningar blev dyrare, eftersom repliker med svensk undertext saknade spansk `tts` (CLAUDE.md
  "Voices"). Kolla att varje statistreplik på spanska har sin `tts` före körningen.
- Nya repliker som andra features lagt till sedan dess kommer till (CLAUDE.md "Voices": varje feature
  gör sina egna, under 1 500 tecken). Gör en ny torrkörning först.
- **API-nyckelns eget tak:** ElevenLabs-nyckeln kan ha ett tak i credits som är skilt från kontots
  saldo (version 1 stoppades av det: "This request exceeds your API key quota of 45000"). Kolla
  nyckelns tak innan, och kontrollera med ett anrop som kostar mer än det som kan vara kvar på nyckeln.

## 6. Byggordning

1. Torrkörning (`make voice DRY=1 ALL=1`) och nyckelns tak.
2. Poolen: kandidater ur Voice Library (`make voice-cast WHO=<roll> SEARCH=n` hämtar kandidater;
   välj på gratisprovklippen), `cast.json` med `pool`.
3. Verktyget: expansionen av pseudotalarna och `barks: 'pool'`; `_pool` i manifestet.
4. `voice.js` `voiceFor` för statister och ankare, inkopplingen i avsnitt 4.
5. Pilot, sedan generering (`make voice` med `scope` utökat), kontroll och granskning.
6. `vpool` och `vfree`; `voice`, `vstory`, `story` och `fullstory` ska fortfarande ge `RESULT: PASS`.
7. DESIGN §12.4 och README "Röster" uppdateras.
