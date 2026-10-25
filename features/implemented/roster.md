# Röster – ett fullt röstsatt Charter & Run

**Implementerat.** Byggt 2026-10-21–24 som jobb 1 av två (avsnitt 10.1), DESIGN §12.4. Replikerna i de 13
uppdragen, mantrat (tre tagningar), "Prata med gänget", SKANDAL och free roam-featurerna (utom mikrofonen och
tutan) är tal: 775 klipp, 36 minuter, 19 MB i `assets/voice/` (`index.json` och en mp3 per replik), sagda av
32 roller med Voice Library-röster och `eleven_v4`. Spelet anropar inget API. Ole pratar norska, och
lokalbefolkningen (Josés mamma och pappa, Carmencita, portiern, souvenirförsäljaren, grisbonden, städerskan,
hittegodsexpediten, telefonisten och Guardia Civil) säger sin svenska undertext på spanska. Dialogrutans text
skrivs fram i takt med talet, radion låter som en walkie-talkie och kaptenen som en högtalare, en replik ute på ön
hörs från den som pratar, musiken och motorn tonas ner under talet, och munnarna följer klippens kurva.
Pausmenyn har RÖSTER: PÅ / AV. Koden: `src/voice.js` (kön, platserna och pausen), `src/content/script.js`
(`allLines()`, klockrepliken i ord) och `scriptFeatures.js`, `audio.voiceChain`, `hud.runDialog`/`_sayLine`,
`game.say`/`speak`/`radio`, verktyget `tools/voice/` (voice.mjs, analyze.py, cast.json, lines.json,
qc.json) och make-målen `voice`, `voice-cast`, `voice-check` och `voice-hear`. Provlyssningssidan
(`review.mjs`, `make voice-review`) togs bort 2026-10-25 på användarens begäran. CLAUDE.md
"Voices" har regeln att en ny feature gör sina egna klipp, högst 1 500 tecken.

*Rollerna:*
- **Huvudrollerna**, valda på betalda provläsningar (vad lokal taligenkänning hörde, tonhöjd, tempo och roll):
  - Stig: Christer
  - Ole: Thomas Magne, bokmål
  - Lasse: Kim
  - Berra: Mathias
  - Robban: Sovn
  - Siv: Sanna Hartfield
  - Majsan: Elin, lägre än Siv så att systrarna hörs isär
  - Angerud: Andreas
  - José: Rafa N, en spansk röst som talar svenska
  - Josés mamma: Rosa
- **De 22 små rollerna:** valda på Voice Librarys gratisprov.

*Kostnad:* 29 836 credits enligt API:ets `character-cost`, under taket på 30 000:
- provläsningar 3 281
- replikerna 25 658 tecken
- omtagningar ungefär 890
- en kontroll av nyckeln 10

Kontots egen räknare visade 29 946. Kvar på kontot: 15 047 (nollställs 2026-11-09).

*Avvikelser:*
- **Jobb 2 väntar.** Det är statisternas pool, ropen, småpratet, mikrofonen, tutan och figurerna utan roll:
  541 repliker, 12 781 tecken, ungefär 14 000 credits. Det ligger i `features/roster_v2.md`, under "Vänta med
  dessa".
- **Josés brytning går inte att mäta.** Språkigenkänningen ger båda kandidaterna 0,99–1,00 svenska, precis som
  de svenska rösterna. Ingen har lyssnat i högtalare, så lyssna på provläsningarna i `.cache/voice/cast/jose/`
  och byt med `node tools/voice/voice.mjs choose jose <id>` om den låter för svensk.
- **Nio spanska repliker saknade spanska.** De spanska rollerna hade nio repliker med svensk undertext utan
  spansk `tts`: Guardian tre, grisbonden tre, telefonisten två och souvenirförsäljaren en. De sades först
  på svenska och fick sedan en `tts`. Kontrollen märkte det bara delvis, eftersom faster-whisper översätter
  svenskt tal till spanska när den ombeds höra spanska. Fällan står i CLAUDE.md "Voices" och DESIGN §12.4.
- **Taket stoppade den sista omtagningsrundan.** Tio repliker behåller sin bästa tagning (`note` i
  `lines.json`). Verktyget föll först inte tillbaka för fyra av dem, som då saknade klipp. Det är rättat:
  en omtagning som taket stoppar faller nu tillbaka på replikens bästa tagning.
- **31 klipp ligger på granskningslistan.** Det är korta repliker och interjektioner, siffror som Whisper
  skriver med siffror, och namn som "Hammarby…?" och "Cabalho folkloristico". Inget av dem är fel ord
  enligt taligenkänningen för rätt språk.
- **Ingenting har spelats upp i högtalare.** Allt är kontrollerat med lokal taligenkänning per språk och med
  Praats tonhöjd.

*Verifierat:*
- **`vstory`** (berättelsen med rösterna på): 320 repliker sagda, 306 med röst och 10 pratbubblor
  släppta efter 2,5 s väntan. 5 repliker klipptes av (1,6 %), ingen pratade i munnen på någon, ingen
  radiotoast försvann för tidigt, alla repliker fanns i `allLines()` och inget klipp misslyckades att ladda.
- **`voice`, `prata`, `story` och `fullstory`:** `RESULT: PASS`. `story` slutar i `#13 idle`.
- **`make voice-check`:** ok. Alla 775 repliker i omfånget har klipp.

*Replikerna blir riktigt tal i stället för pip. Stig-Helmer pratar, Ole pratar norska, Berra och Robban
göteborgska, och lokalbefolkningen pratar spanska under svenska undertexter, precis som i filmen.
Talet görs i förväg med ElevenLabs och checkas in som små mp3-filer, så spelet anropar aldrig något
API. Saab- och Seinfeld-spelen har redan gjort samma sak, och verktyget och designen tas därifrån.*

**Kategori:** Ljud / teknik · **Var:** hela spelet (dialogrutan, radion, pratbubblorna, utropen) ·
**Insats:** L – verktyget finns i Saab-spelet och kopieras, men varje väg där någon pratar ska
kopplas in, och rollbesättningen och lyssnandet tar tid. Kostar ElevenLabs-credits (avsnitt 10).

## Kortversion

- **Läget i dag:** inga röster. Dialogrutan skriver fram texten och spelar ett syntetiskt pip ungefär
  varannan bokstav (`audio.talk`, `src/audio.js:243`), med en tonhöjd per figur (`voice` i CHARS).
  Radiotoasten piper åtta gånger. Pratbubblorna är helt tysta. Det finns inga ljudfiler, allt ljud
  syntetiseras.
- **Förebilden är Saab-spelet** (`../saab_and_run__en_man_som_heter_ove`). Det har ett komplett och
  beprövat röstsystem: verktyget `tools/voice/voice.mjs`, provlyssningssidan, röstkön `src/voice.js`,
  ljudkedjan, läppsynken och kvalitetskontrollen med lokal taligenkänning. Läs dess
  `features/implemented/a_fully_voiced_game.md` (avsnittet "Det här gjordes" först) och
  `resten_av_replikerna_for_a_fully_voiced_game.md` innan du börjar. Det mesta här är "gör som där",
  och den här specen beskriver det som är annorlunda i Charter.
- **Manuset:** de flesta replikerna ligger redan i rena datafiler (`src/content/island.js`,
  `src/content/flight.js`, `src/meters.js` och `src/strings.js` importerar ingenting). Uppdragens
  repliker ligger i `src/game/missions/*.js`. En ny `allLines()` samlar alla röstade repliker med
  talare, och verktyget och testerna läser den (avsnitt 5).
- **Tre språk:** svenska för nästan alla, norska (bokmål) för Ole och spanska för lokalbefolkningen.
  Undertexten är alltid den som står i koden i dag (avsnitt 4.2).
- **Två omgångar, som i Saab-spelet:** version 1 är berättelsen, det vill säga de 13 uppdragen,
  SKANDAL och "Prata med gänget". Version 2 är resten: free roam-featurerna, småpratet,
  statisternas rop och en pool av röster för de anonyma turisterna och lokalborna.
- **Kostnad:** `eleven_v4` kostar 1 credit per tecken (uppmätt i Saab-spelet 2026-10-15, när
  rabatten hade gått ut). Version 1 blir ungefär 20 000 credits och hela spelet ungefär 45 000–50 000
  (avsnitt 10). Det är mer än Saab-spelet betalade, eftersom det fick rabatten.
- **Ingen kloning.** Rösterna ska passa rollerna, aldrig härma skådespelarna i filmen (Lasse Åberg,
  Jon Skolmen, Lottie Ejebrant, Kim Anderzon och de andra).

## 1. Läget i dag

Kartlagt i koden 2026-10-17.

### 1.1 Vägarna där någon pratar

| Väg | Var | Ljud i dag | Talaren |
|---|---|---|---|
| **Dialogrutan** `hud.runDialog` | `src/game/hud.js:453–499`, via `Game.dialog` (`src/main.js:1161`) | pip ungefär varannan bokstav (`hud.js:482`) | `who` |
| **Radiotoasten** `game.radio(who, text)` | `main.js:1155–1158` | 8 pip med 70 ms mellanrum, oavsett längd | `who` |
| **Etappernas radio** (`radio:` på goto, follow, rabbits, race, smash) | `src/game/missions/kinds/core.js:98–123` | via radiotoasten | `[who, text, cue]` |
| **Pratbubblan** `game.say(target, text, secs)` | `main.js:1135–1143` → `hud.say` (`hud.js:506`) | tyst | en Character med `.key`, en nyckel, eller ett ankare `{x, y, z, height}` utan identitet |
| `hud.say` direkt, förbi `game.say` | mantrat när J hålls (`main.js:1709`), glidflykten (`src/game/glide.js:174`) | tyst | Stig |
| **Tjuvlyssning** (`goto.overhear`) | `core.js:128–161` | tyst | talaren, eller ett landmärke om talaren är borta |
| **Cue-repliker** (`say`, `radio`, `pa`) | `main.js:1167–1211` | `pa: true` ger bara `audio.dingdong()` | nyckel |
| **Småpratet** | `main.js:1927–1936`, kabinen `src/world/cabin.js:1485` och Oles statistik `cabin.js:1253` | tyst | nyckel |
| **Rop** `Game.bark(ch, kind)` | `main.js:1057–1060`, statisternas undanhopp `src/actors/peds.js:68` | tyst | ofta en anonym statist |
| **SKANDAL** | `src/game/shame.js` (vittnet :140, gripandet :298–301, portiern :342, hånen :572) | tyst eller radio | konstapeln (ingen nyckel), ett ankare eller en nyckel |
| **Mikrofonen** | `src/game/mic.js:129` och `:150` | dingdong | Stig, sedan publiken |
| **Storchs sökare och filmkvällen** | `src/game/storchFilm.js:390` och `:404–415` | bara `audio.whirr` | Herr Storch |
| **Free roam-featurerna** | ett fyrtiotal moduler i `src/game/` (gangTalk, receptionBell, church, closet, room107, streetRace, rollerskis …) | som vägarna ovan | mest nycklar |

Toasts utan talare, banderoller, titelskärmen och slutkortet är berättartext och röstsätts inte.

### 1.2 Mängden

Grovt räknat med en tillfällig parser: ungefär **750 olika repliker och 22 000–25 000 tecken**, i
snitt drygt 30 tecken per replik. `allLines()` ger de exakta siffrorna (avsnitt 5).

- Uppdragen har ungefär 320 repliker: `missions/island.js` cirka 215 och `missions/flight.js`
  cirka 105.
- `content/island.js` har resten, i ett trettiotal tabeller. De största är TALK_ISLAND (cirka 100),
  CHATTER (cirka 47), BARKS (cirka 41), DOGS, MIKROFON, GATLOPP, SOLKRAM, SKIDOR och HONK.
- Dessutom finns `content/flight.js` (CHATTER_FLIGHT och OLE_STATS), `meters.js` (cirka 25
  SKANDAL-repliker), `strings.js` (5) och några som står direkt i koden (`peds.js:13–14`,
  `cabin.js`).

Flest repliker har, räknat bara i formen `['vem', 'text']` (tabellerna kommer till):

| Roll | Repliker | Tecken |
|---|---|---|
| Stig | 108 | 2 934 |
| Ole | 81 | 3 073 |
| Majsan | 41 | 1 238 |
| Berra | 37 | 1 231 |
| Lasse | 36 | 1 856 |
| Siv | 33 | 1 141 |
| Angerud | 26 | 962 |
| Robban | 20 | 619 |
| José | 14 | 429 |
| Fru Storch | 10 | 278 |
| övriga, 20-talet roller | 2–8 var | 10–360 var |

### 1.3 Det som gör Charter annorlunda än Saab-spelet

- **Inga barn** (`models.js:1513`, DESIGN §6.7). Barnrösterna, som krävde en egen feature i
  Saab-spelet, behövs inte.
- **Tre språk** i stället för ett (avsnitt 4.2).
- **Uppdragen har tighta, uppmätta timers** (CLAUDE.md, DESIGN §8). Rösterna får aldrig göra en
  tidsatt etapp längre (avsnitt 12).
- **Featurerna byggs parallellt** (⟨par N⟩ i TODO.md) och lägger hela tiden till nya repliker. En ny
  replik låter som i dag (pip) tills nästa `make voice`.
- **Djur och saker "pratar":** hundarnas "VOFF! VOFF!", grisarnas "NÖFF!", ringklockans "\*pling\*",
  fårens "Bäää!" och "Zzz…". De har redan ljudeffekter (`audio.woof`, `audio.oink` och de andra) och
  röstsätts inte.

## 2. Förebilderna

### 2.1 Det vi tar från Saab-spelet (och Seinfeld-spelet)

Allt nedan finns och fungerar där. Kopiera och anpassa.

- **Klippen görs i förväg och checkas in:** `assets/voice/<vem>/<hash>.mp3`, mono, 64 kbps,
  44,1 kHz, −20 LUFS, limiter vid −1,5 dBTP. Manifestet `assets/voice/index.json` är nycklat på vem
  och exakt text och har längden, tidsstämplarna och läppkurvan för varje klipp. Spelet räknar ingen
  hash, det slår bara upp texten.
- **Filnamnet är en hash** av vem, text, röst, modell, inställningar och omtagningsnummer, och seeden
  tas ur samma hash. En ändrad replik saknas och görs nästa gång. Den gamla blir föräldralös och tas
  bort med `PRUNE=1`.
- **Verktyget:** torrkörning med tecken och credits per roll, ett hårt tak i tecken, stopp vid första
  API-felet, två anrop åt gången, kostnaden ur svarets `character-cost`, råa tagningar i `.cache/`
  så att efterbehandlingen kan göras om gratis, `check` utan anrop som kan köras bland testerna.
- **Kvalitetskontrollen:** lokal taligenkänning (`tools/voice/analyze.py`, faster-whisper och Praat,
  gratis). En tagning som hoppar över ord, glider över i fel språk eller har orimlig längd görs om
  automatiskt, högst två gånger. Korta rop underkänns aldrig automatiskt, de hamnar på
  granskningslistan.
- **Provlyssningssidan** (`tools/voice/review.mjs`): kandidaterna per roll med mätvärden, "Välj"
  byter röst, replikerna scen för scen, "Gör om" med regi, `locked` för en bra tagning.
- **Röstkön** (`src/voice.js`, avsnitt 7.2): ingen pratar i munnen på någon. Seinfeld-spelet utan kö
  klippte av vart fjärde klipp, Saab-spelet med kö under 2 %.
- **Utan klipp låter det som i dag.** Kön och längderna fungerar med pip och gissade längder, så
  turordningen kan byggas och testas innan det finns en enda röst.

### 2.2 Det vi gör annorlunda

- **Manuset flyttas inte till en enda fil.** Saab-spelet flyttade alla repliker till
  `src/game/script.js`. Här ligger de flesta redan i datafiler, och en central fil skulle krocka med
  varje parallell feature. `allLines()` hämtar dem där de ligger (avsnitt 5).
- **Norska och spanska** behöver egna taligenkänningsmodeller i kvalitetskontrollen (avsnitt 6).
- **Fullpris.** Saab-spelet betalade 0,13–0,14 credits per tecken med rabatten. Nu är det 1 credit
  per tecken, så provläsningarna och poolen kostar sju gånger mer och planeras därefter (avsnitt 10).

## 3. Röstmotorn och kontot

- **Modell:** `eleven_v4` för alla roller, med `language_code` per roll: `sv`, `no` eller `es`.
  Audio tags som `[sighs]`, `[whispers]` och `[shouts]` fungerar (prövat i Saab-spelet).
- **Kontot** är troligen detsamma som Saab- och Seinfeld-spelens:
  - **Alla 10 platser för egna röster är upptagna.** Voice Design går alltså inte.
  - **Röster ur Voice Library tar ingen plats.** De läggs till på kontot vid första anropet (Saab-spelet
    har 40-talet sådana). Alla roller tas därifrån.
  - Utvecklarens beslut för Saab-spelet (2026-10-11) var: ingen uppgradering, inga borttagna röster,
    bara Voice Library. Det antas gälla här också (fråga 7).
  - **Saldot går inte att läsa:** nyckeln saknar `user_read`. Saab-dokumenten antyder att det fanns
    ungefär 50 000 credits kvar efter dess röster, men det är en gissning. Kontots sida har siffran,
    och den ska kollas innan version 1 (avsnitt 11, steg 0).
- **API-nyckeln:**
  - Lägg först till `.env` och `.cache/` i `.gitignore`. **Charters `.gitignore` har bara
    `node_modules` och `out/` i dag.**
  - Därefter lägger utvecklaren själv in nyckeln i `.env` i spelmappen, till exempel
    `! cp ../saab_and_run__en_man_som_heter_ove/.env .env`. Aldrig i chatten.
  - `.env` skrivs aldrig ut och grep:as aldrig. Nyckeln används bara av verktygen under `tools/`.
- **Uttal:** en uttalsordlista (`tools/voice/lexicon.pls`) för namn och ord modellen kan snubbla på:
  Stig-Helmer, Majsan, Angerud, Levander, Storch, SunTrip, Eslöv, Maspalomas, Ecuménico, pesetas,
  G17. Dessutom kan en replik ha en egen `tts`-text i `tools/voice/lines.json`, till exempel
  "2 300 km i timen" → "to tusen tre hundre kilometer i timen" för Ole, eller `[whispers] Sch…`.

## 4. Rollbesättningen

### 4.1 Rollerna

Rösterna hämtas ur Voice Library. Etiketterna där är modersmål, kön, ålder och dialekt (standard,
Stockholm, Göteborg, Skåne, Norrland och så vidare). Saab-spelet har redan mätt 61 svenska röster
(provklippen ligger i dess `.cache/voice/` och `tools/voice/cast.json`), och de mätningarna kan
återanvändas gratis.

| Roll | Språk / dialekt | Rösten |
|---|---|---|
| **Stig** | svenska, stockholmska (Hammarby, Söder; research-setting.md:241) | man runt 35–40, ljus till mellanmörk, artig, försiktig och lite tvekande, blir aldrig hög. Mantrat sägs hastigt och nervöst |
| **Ole** | **norska, bokmål** (østnorsk), aldrig svenska (DESIGN §1.3) | man runt 40, jovialisk, högljudd och självsäker prylexpert, skrattar gärna |
| **Majsan** | svenska | kvinna runt 30, varm och lite blyg, mjuk |
| **Siv** | svenska | kvinna runt 35, flörtig, rapp och kaxig, skrattar lätt |
| **Berra** | svenska, göteborgska (research-setting.md:22) | man runt 40, hes och ivrig spritjägare |
| **Robban** | svenska, tydlig göteborgska (research-characters.md:367) | man runt 40, långsammare och slöare än Berra |
| **Angerud** | svenska, stockholmsk överklass | man runt 55, kolerisk direktör, högljudd och lättirriterad |
| **Lasse** | svenska | man runt 35, glad och säljande reseledare, en utroparröst |
| **Affe, Gabbe** | svenska | reseledare och husband, avslappnade (Gabbe mörkare) |
| **Dr Levander** | svenska | man runt 50, mjuk, lugn och hypnotisk, lite inställsam |
| **Herr och Fru Storch** | svenska, östgötska (Mjölby) | ett ungt par. Han är fåordig ("Lite film."), hon pigg och rättar folk ("Storch, inte Stork") |
| **Flygvärdinnorna** (`vardinna`, `vardinna2`) | svenska | professionellt vänliga, 1970-talsflyg |
| **Kaptenen** | svenska | man runt 50, lugn och lite monoton utroparröst |
| **Högtalaren** (`pa`) | svenska | neutral flygplatsröst |
| **Sulan, Kontrollanten, Bungalowförsäljaren, Rullskidåkaren** | svenska. Rullskidåkaren är stockholmare ("Jag är från Stockholm, egentligen…") | små roller, väljs på gratisprovklippen |
| **José** | svenska med spansk brytning: han bor i Sverige (research-characters.md:482) | man runt 30, ivrig och stolt. En röst med spanska som modersmål som talar svenska, som Parvanehs röst i Saab-spelet |
| **Josés mamma och pappa, Carmencita, Portiern, Souvenirförsäljaren, Grisbonden, Grisfestvärden, Städerskan, Killen från flygplatsen, Telefonisten** | **spanska** (avsnitt 4.2) | röster med spanska som modersmål. Mamman är den viktigaste: "¡Josito! ¡Josito!" |
| **Guardia Civil** (konstaplarna, `guardia`) | **spanska** | två manliga röster som turas om mellan konstaplarna, korthuggna |
| **Fruktförsäljaren och Reseförsäljaren** (`FRUKTSTAND.vendor`, `BUTIK.clerk`) | spanska / svenska | figurer utan nyckel i dag. De får en egen nyckel |

Repliker som bara är skiljetecken (Sivs "…" före ambulansen, `missions/island.js:677`) görs inte.
Raden tar sin tid men är tyst.

### 4.2 Lokalbefolkningen pratar spanska

I filmen talar lokalbefolkningen spanska med svenska undertexter (research-setting.md:22). I spelet
är deras repliker skrivna som svenska undertexter med spanska ord ("subtitle style", DESIGN §1.3:
"¡Josito!", "Momento.", "¡Alto!"). Med röster blir det bokstavligt:

- **Rösten säger repliken på spanska, och undertexten är den svenska text som står i koden i dag.**
  Den spanska översättningen är replikens `tts` i `lines.json`, markerad som vår översättning.
- Repliker som redan är spanska ("¡Mis tomates!", "¿Dónde está el de la camisa?", "Es una
  iglesia…", de lokala ropen) sägs som de står.
- **José** är undantaget. Han bor i Sverige och talar svenska med brytning.
- Det låter äkta och undviker en härmad brytning. Alternativet är spanska röster som talar svenska
  (fråga 1).

### 4.3 Statisterna (version 2)

- **De anonyma figurerna** (statister, badgäster, publiken vid mikrofonen, gästerna i receptionen,
  grisfestens turister och passagerarna i kabinen) byggs med `randomPed()` (`models.js:1527`). Den
  ger kön (`lashes`), lokal eller turist (`local`, 30 %) och en tonhöjd ur fröet, men ingen ålder.
- **Poolen:** sex svenska turiströster (tre kvinnor och tre män) och fyra spanska (två och två). En
  statist får en röst av sitt kön och sin sort, vald med sin egen tonhöjd. Samma person låter alltid
  likadant (Saab-spelets `voiceFor`).
- **Vem som kan säga en tabell** står i `allLines()` (avsnitt 5): `@tourist`, `@local`, `@staff`,
  `@ole` (BARKS och deras `_OLE` / `_LOCAL`-varianter, DESIGN §14.10). Verktyget gör tabellen en gång
  per röst som kan säga den.
- **Rollfigurerna ropar med sin egen röst.** När Majsan blir nedknuffad säger hon den svenska
  rop-tabellen med Majsans röst. Det betyder ett klipp per rollfigur och rop-replik. Vill man spara
  kan rollfigurerna låna en poolröst för ropen (fråga 3).

## 5. Manuset: `allLines()`

### 5.1 Var replikerna samlas

- **En ny ren modul, `src/content/script.js`**, exporterar `allLines()`. Den ger
  `[{ who, text, part, lang, tmpl? }]` utan dubbletter, där `part` säger var repliken hör hemma
  (`mission:<id>`, `talk`, `skandal`, `chatter`, `barks`, `feature:<namn>` och så vidare) och `who`
  är en rollnyckel eller en pseudotalare (`@tourist`, `@local`, `@staff`).
- Den importerar bara datafilerna: `content/island.js`, `content/flight.js`, `meters.js` och
  `strings.js`. Ingen av dem importerar något, så verktyget kan importera `script.js` direkt i Node,
  utan parser.
- **För varje tabell står det i klartext vem som säger den,** som en liten generator per tabell:
  `for (const l of Object.values(MIKROFON.lines)) yield ['stig', l.text, 'mic']`. Det är listan som
  ersätter Saab-spelets `@voice`-taggar.
- **Replikerna som står direkt i koden** (`peds.js:13–14`, de 7 i `cabin.js` och de enstaka i
  `main.js`) flyttas till `content/`. Ingen text ändras.
- **Uppdragen** (`missions/*.js`) importerar stage kinds, hud och three och kan inte importeras i
  Node. Två vägar:
  - **a (rekommenderas):** uppdragens dialogtupler (intro, outro, scener, `radio:` och cue-repliker)
    flyttas till en ren datafil, `src/content/missionLines.js`, som uppdragen importerar. Det är
    cirka 320 repliker och en mekanisk flytt, som Saab-spelets. `story` och `fullstory` visar att
    inget gått sönder.
  - **b:** `allLines()` körs i den headless sidan (`window.__allLines()`, via `tools/lib.mjs`) och
    går igenom `__missions()` efter tupler. Då flyttas inget, men varje torrkörning startar Chrome,
    och repliker som byggs i funktioner syns inte.
- **Skyddsnätet:** i `&voice`-läget loggar spelet varje replik som sägs men inte står i `allLines()`,
  och `vstory` räknar dem som fel (avsnitt 9). Då kan en replik inte tappas bort, oavsett väg.

### 5.2 Repliker som byggs medan spelet körs

Fem talade repliker har en variabel. De görs i alla varianter (`tmpl` med en lista över värdena):

| Replik | Var | Varianter |
|---|---|---|
| Ole: "{n} av sju! Snart er hylla full." | `room107.js:97`, `content/island.js:622` | 6 (En…Seks) |
| Robban: "Här är {n} pesetas. Avdrag för tappningarna." | `berraJob.js:344` | 3 (75, 50, 25) |
| Reseförsäljaren: "Med alla tillägg blir det {n} pta, tyvärr." | `suntripShop.js:106` | 3 (225, 275, 350) |
| Stig vid mikrofonen: "Klockan är {tid} spansk tid – …" | `mic.js:112–137`, `content/island.js:1098` | 24 (timord och "halv X") |
| Stig: "{es} spansk tid. {no} norsk och svensk." | `gangTalk.js:122`, `content/island.js:137` | **1 440** (HH:MM) |

- Den sista går inte att göra i alla varianter. Förslaget är att den visar och säger tiden avrundad
  till halvtimme, med samma ord som mikrofonen ("Halv fyra spansk tid. Halv fem norsk och svensk."):
  48 varianter (fråga 4).
- Manifestet nycklas på den färdiga texten, så spelet slår bara upp texten som vanligt.
- Toasts och banderoller med siffror (vinster, kvitton, "3 varv på bagagebandet!", räknarna)
  röstsätts inte.

### 5.3 Fällor

- **Samma text, olika talare:** "Ja." (Stig, Lasse, Ole), mantrat (Stig, Majsan), "Ursäkta, är det
  din bil?" (Stig, Majsan, Guardia), "Det måste vara värmen." (turister, Stig, Majsan) och ett
  tjugotal till. Manifestet är nycklat på vem och text, så det är inget problem, men `allLines()`
  måste ge alla talare.
- **Text används som nyckel i koden** (`DAY.chatter`, `HONK.tease`, filtret mot upprepningar). En
  `tts` ändrar aldrig texten, så det påverkas inte.
- **Repliker som sägs ofta:** mantrat (varje gång J hålls), "Lite film." (7 ställen), "Förlåt!" och
  ropen. Ge dem tre tagningar som turas om (`takes: 3` i `lines.json`, med var sin seed), annars blir
  det tydligt att det är samma klipp.
- **Interjektioner och tysta repliker:** "Sch…", "Hä-pååre!", "…Minuspoäng?", "Det… är… en… kyr-ka."
  och "PIP-PIP-PIP! …" flaggas av verktyget och får regi eller hoppas över. "Zzz…" och djurens repliker
  röstsätts inte.

## 6. Verktyget

- **Kopiera** `tools/voice/` från Saab-spelet: `voice.mjs`, `analyze.py`, `review.mjs`,
  `lexicon.pls`, och `cast.json` och `lines.json` tomma. `shift.py` behövs inte (inga barn).
- **Anpassa:**
  - `allLines()` från `src/content/script.js` i stället för `src/game/script.js`.
  - `language_code` per roll i `cast.json` (`"lang": "sv" | "no" | "es"`).
  - **Taligenkänningen per språk:** KBLab:s `kb-whisper-small` för svenska som i Saab-spelet,
    Nasjonalbibliotekets `nb-whisper` för Oles norska, och en vanlig flerspråkig faster-whisper för
    spanskan. En spansk `tts` jämförs med den spanska texten, inte med undertexten.
  - Pseudotalarna (`@tourist`, `@local`, `@staff`) expanderas till poolrösterna.
  - `scope` i `cast.json` styr version 1 och 2 (avsnitt 11).
- **Make-mål**, som i Saab-spelet:

```sh
make voice DRY=1             # vad som skulle göras och vad det kostar, utan anrop
make voice                   # gör det som saknas, kontrollera, efterbehandla (MAX=n ändrar taket)
make voice WHO=stig LIMIT=3  # pilot: tre repliker för en roll
make voice REPROCESS=1       # gör om efterbehandlingen från råklippen, utan anrop
make voice-cast WHO=ole      # kandidater för en roll
make voice-review            # provlyssningssidan (egen port)
make voice-check             # bara kontrollen, inga anrop; felkod om något i omfånget saknas
```

- **Taket** är ett hårt tak i tecken per körning (förslag: 25 000 för version 1). Över taket görs
  ingenting.
- **Disken:** Saab-spelets körning dog två gånger av full disk. Kolla `df -h /` innan en stor körning,
  och lägg temporära wav-filer i `/dev/shm`.

## 7. Uppspelningen i spelet

### 7.1 `src/voice.js`

Kopiera Saab-spelets `src/voice.js` (354 rader) och dess API:

```js
voice.play(who, text, { slot, mode, at, ch, wait, must, now })  // -> handle | null
voice.secs(who, text, fallback)  // klippets längd, annars tecken / rollens tempo
voice.quiet()                    // ingen pratar och kön är tom
voice.waitQuiet(min, max)        // Promise
voice.prefetch(lines)            // ladda och avkoda i förväg
voice.voiceFor(target)           // rollnyckel, poolröst eller ankarets `who`
voice.stop(slot), voice.hush()
voice.update(game)               // varje bildruta: kön, positioner, munnar
```

`null` betyder att anroparen gör som i dag (pip). Det gäller när rösterna är avstängda, i testläget
utan `&voice`, och för en replik utan klipp.

### 7.2 Turordningen

Reglerna från Saab-spelet, plus Charters egna vägar:

- **Två platser:** *huvud* (dialogrutan, radion, utropen och filmkvällen) och *bubbla* (pratbubblor,
  småprat, rop, tjuvlyssning och publiken vid mikrofonen). En röst per plats, aldrig två samtidigt.
- **En dialogreplik bryter in** på allt och stoppar bubblan.
- **Radion och utropen köar** bakom den som pratar i högst 6 s och stryks sedan. Etappernas radio
  (`RadioSeq`) är `must` och stryks aldrig, och dess pauser räknas från att förra klippet *slutade*.
- **En bubbla visas direkt.** Rösten spelas om det är tyst, annars väntar den högst 2,5 s och stryks.
  Bubblan syns ändå.
- **Rop köar aldrig.** En reaktion som kommer en sekund för sent låter fel, så ett rop som inte kan
  sägas direkt stryks.
- **Småpratet** pratar bara när det är tyst och den som pratar står inom ungefär 15 m.
- **Samma talare väntar in sig själv.**
- **Ett misslyckande:** repliken spelas klart in i omstarten, och nästa försöks radio köar bakom.
- **Outrot** väntar tills det är tyst (1,6–5 s).

### 7.3 Ändringarna per väg

| Väg | Med röster |
|---|---|
| **Dialogrutan** (`hud.js:453`) | Hela samtalet förladdas när det börjar. Texten skrivs ut i 55 tecken/s som i dag och hinner alltså före talet, ungefär som en undertext. Raden är klar när både texten och klippet är klara. Första trycket visar hela texten. Ett tryck när texten är klar går vidare, och rösten tonas ut på 80 ms. Pipet spelas bara för en replik utan klipp. `autoDialog` (`&voice`) väntar på klippet plus 0,4 s |
| **Radiotoasten** (`main.js:1155`) | läget `radio`. Toasten kommer när repliken faktiskt sägs och står kvar i max(dagens tid, klippet + 0,9 s). De åtta pipen bara utan klipp |
| **Pratbubblan** (`main.js:1135`) | läget `world`, där talaren står. Bubblan står kvar i max(dagens tid, klippet + 0,4 s). **Signaturen `say(target, text, secs)` behålls**, eftersom 34 scenariofiler slår in `g.say` med exakt tre argument. Ett ankare utan identitet får i stället ett fält `who` (`{ x, y, z, height, who: 'pax' }`) |
| `hud.say` direkt (`main.js:1709`, `glide.js:174`) | går genom `game.say`, så att mantrat får röst |
| **Utropen** (cue `pa: true`, `main.js:1170`; mikrofonen) | dingdongen först (0,9 s), sedan rösten i läget `pa` |
| **Rop och SKANDAL** | `voice.voiceFor(ch)`: rollens röst, en poolröst eller en Guardia-röst. Version 2 för statisterna |
| **Storchs filmkväll** | läget `film`, en projektor bakom rösten |
| **Ankarna utan talare** | `pax`-ankaret (`missions/flight.js:132–138`), tjuvlyssningens landmärken, hundägarnas dörrar och Land Rover-ankarna får `who`. Fruktförsäljaren och Reseförsäljaren får nycklar |

### 7.4 Ljudkedjan (`audio.js`)

- **En egen `voiceBus`** till master, bredvid `sfx` och musiken. Mute med N tystar den också.
- **Duckningen:** medan någon pratar sänks musiken ungefär 8 dB, motorn ungefär 4 dB och `tradBus`
  (Små grodorna, Helan går) lika mycket som musiken. **Fälla:** `main.js:2168` skriver över
  `audio.duckMusic` varje bildruta (`pursuit ? 0.5 : 1`), så rösternas duckning ska multipliceras in
  där, inte sättas för sig.
- **Lägena:**
  - `dialog`: torrt och centrerat.
  - `radio`: bandpass 300–3 400 Hz och lätt mättnad (Lasse på radion, Levander, Ole som räknar).
  - `pa`: högtalare, alltså bandpass och lite rum (kaptenen, Högtalaren, Lasses utrop, Stig vid
    mikrofonen).
  - `world`: en `PannerNode` där talaren står, svagare på avstånd, och dämpat med lågpass när Stig
    sitter i en bil.
  - `film`: lågpass och ett svagt projektorsurr.
- **Tonhöjd och tempo** ändras aldrig. Rösterna går på AudioContexts egen klocka och påverkas inte
  av `timeScale`.
- **Pausmenyn** pausar rösterna, och de fortsätter där de var. I dag tystar pausen bara looparna
  (`main.js:264–267`).
- **Inställningen:** "RÖSTER: PÅ / AV" i pausmenyn bredvid LJUD och MUSIK (`main.js:360–365`,
  `:2222`), sparad i `localStorage` (inom try/catch). Avstängt betyder pip som i dag.
- **Minnet:** bara de 24 senast använda klippen hålls avkodade. Ett klipp som inte går att ladda
  piper resten av sessionen.

## 8. Läppsynk

- I dag flaxar munnen efter en sinus medan `st.talk` är sann (`models.js:1007–1011`), och bara den som
  har dialogrutan pratar (`setTalker`, `main.js:1159`).
- Med ett klipp följer munnen klippets volymkurva (efterbehandlingen räknar ut den, 30 bilder/s, 64
  nivåer), och den sluts på m, b och p. Saab-spelet gör exakt så, och det är ungefär 40 rader.
- **Även bubblornas talare** får röra munnen medan klippet spelar, inte bara dialogrutans. Handtaget
  har talarens Character, så det fungerar också för statister utan nyckel.

## 9. Tester

- **`?test=1` stänger av rösterna,** så alla scenarier går exakt som i dag. `&voice` slår på dem.
- **`tools/lib.mjs:31` startar Chrome utan `--mute-audio`,** men med `--autoplay-policy=…`. Ljudet går
  alltså på riktigt i headless-körningarna. Lägg till `--mute-audio` (Saab-spelet gjorde samma sak).
  Kolla efteråt att `meter`, `ui` och `tuta` fortfarande läser `audio.level()`, eftersom de mäter RMS.
- **Nya scenarier** i `tools/scenarios/voice.mjs`, som i Saab-spelet:
  - `voice`: ett påhittat manifest. Varje rad väntar in sitt klipp, en bubbla pratar inte över en
    huvudreplik, ett trasigt klipp piper, munnen följer kurvan, musiken duckas och går tillbaka, och
    avstängda röster ger `null`.
  - `vstory`: alla 13 uppdrag med rösterna. Ska sluta med `[t] done -> #13 idle`, `no errors` och
    **`RESULT: PASS`**, och räkna repliker begärda, sagda, avklippta (mer än 0,25 s osagt; målet är
    under 5 %), två röster samtidigt (målet är 0) och repliker utanför `allLines()` (målet är 0).
  - `vcut`: uppdragen i mänsklig takt, med ett misslyckande och en omstart.
  - `vpool` (version 2): statisterna har röster av sitt kön och sin sort, alltid samma.
  - `vfree` (version 2): ett urval av free roam-featurerna med rösterna på.
- **`story`, `fullstory` och alla befintliga scenarier** ska gå som förut med rösterna av.

## 10. Kostnad och storlek

Räknat med 1 credit per tecken, uppmätt i Saab-spelet 2026-10-15 (1 534 tecken kostade 1 534
credits).

| Vad | Tecken | Credits |
|---|---|---|
| **Version 1:** uppdragen, SKANDAL och "Prata med gänget" | ~14 000 | ~14 000 |
| provläsningar för de åtta största rollerna (3 kandidater × ~200 tecken). De mindre väljs på gratisprovklippen och mätningarna | ~5 000 | ~5 000 |
| pilot och omtagningar (~5 %) | ~1 300 | ~1 300 |
| **summa version 1** | | **~20 000** |
| **Version 2:** free roam-featurerna och småpratet | ~10 000 | ~10 000 |
| poolen: 10 röster × ~1 200 tecken | ~12 000 | ~12 000 |
| rollfigurernas egna rop (fråga 3) | ~6 000 | ~6 000 |
| **summa version 2** | | **~28 000** |

- **Hela spelet blir alltså ungefär 45 000–50 000 credits.** Det kan vara det mesta av det som finns
  kvar på kontot. Billigare vägar: inga betalda provläsningar (−5 000), statisterna piper som i dag
  (−12 000), rollfigurerna ropar med en poolröst (−6 000). Det minsta, bara berättelsen, kostar runt
  15 000.
- **Storlek:** tal går med ungefär 12 tecken per sekund. Version 1 blir ungefär 20 minuter och 10 MB,
  hela spelet med poolen ungefär en timme och 25–30 MB.
- **En ändrad replik** kostar lika många credits som den har tecken.

### 10.1 Uppdelningen i två jobb (2026-10-23)

Utvecklaren har 45 000 credits och får nya varje månad, och delade arbetet i två jobb. Siffrorna är
torrkörningens (`make voice DRY=1`, `allLines()` med alla free roam-featurer, 1 313 repliker och
37 955 tecken).

| | Repliker | Tecken / credits |
|---|---|---|
| **Jobb 1 (den här featuren), högst 30 000 credits** | | |
| version 1: uppdragen, mantrat (3 tagningar), "Prata med gänget" med klockans 24 former, SKANDAL | 479 | 16 773 |
| free roam-featurernas repliker av rollfigurerna (54 featurer), utom mikrofonen och tutan | 293 | 8 401 |
| summa i `scope` | 772 | 25 174 |
| provläsningar för de tio största rollerna (2–3 kandidater × 75–180 tecken) | | 3 281 |
| omtagningar, inom taket (`MAX`) | | ~1 500 |
| **summa jobb 1** | | **~30 000** |
| **Jobb 2: `features/roster_v2.md`** (väntar tills utvecklaren säger till) | | |
| ropen, småpratet, mikrofonen, tutan, statisternas och figurerna utan rolls free roam-repliker | 541 | 12 781 |
| poolen med tio röster (statisternas repliker sägs med flera röster), pilot, omtagningar | | |
| **summa jobb 2** | | **~14 000** |

- **Varför mikrofonen och tutan väntar:** de är de enda free roam-featurerna där publik eller
  statister svarar rollfigurerna, och de ska låta som en helhet med poolen. Tillsammans är de 2 573
  tecken, så jobb 1 ryms då under 30 000.
- **I `cast.json`:** `scope.parts` är `mission`, `mantra`, `talk`, `skandal` och `feature`, och
  `scope.not` är `feature:mikrofon` och `feature:honk`. En replik är i omfånget bara när talaren har
  en roll i `cast.json`; statisterna (`@tourist` med flera) väntar på poolen.
- **Utfallet av jobb 1 (2026-10-24):** 775 klipp (777 repliker i omfånget och 25 388 tecken; Berras
  "…zzz" är `skip` och Sivs "…" har inget att säga), 36 minuter och 19 MB. Det kostade **29 836
  credits** enligt API:ets `character-cost`: provläsningar 3 281, replikerna 25 658, omtagningar ~890
  och en kontroll av nyckeln 10. Kontots egen räknare visade 29 946. Taket stoppade den sista
  omtagningsrundan, så tio repliker har kvar sin bästa tagning (`note` i `lines.json`). Kvar på kontot:
  15 047 credits (nollställs 2026-11-09), och jobb 2 behöver ungefär 14 000.

## 11. Byggordning

Varje steg kan landa för sig, och spelet fungerar hela tiden. Pipet finns kvar som reserv.

0. **Spik, ingen spelkod:**
   - `.gitignore` först, sedan lägger utvecklaren in nyckeln (avsnitt 3).
   - Kontots saldo, från kontosidan.
   - En replik per språk med `eleven_v4`: håller Oles norska, och håller spanskan med svensk undertext?
   - Två göteborgska röster för Berra och Robban, och en stockholmsk för Stig.
   - `nb-whisper` på norska och faster-whisper på spanska.

   Utvecklaren lyssnar och säger ja eller nej, och bekräftar frågorna i avsnitt 13.
1. **Manuset:** `src/content/script.js` med `allLines()`, flytten av uppdragens repliker (väg a) och
   av replikerna i koden, mallarna och `make voice DRY=1`. Inga anrop. `story` och `fullstory` ska ge
   `RESULT: PASS` som förut.
2. **Röstkön:** `src/voice.js` med pip och gissade längder, inkopplad i alla vägar i 7.3, `who` på
   ankarna, `--mute-audio` och scenariot `voice`. Inga klipp behövs än.
3. **Verktyget:** kopierat och anpassat (avsnitt 6), med `scope` för version 1.
4. **Rollbesättningen och provlyssningssidan:** `cast.json` för version 1:s roller.
5. **Pilot:** 2–3 repliker per stor roll. Utvecklaren lyssnar. Sedan version 1,
   kvalitetskontrollen och `assets/voice/`.
6. **Ljudkedjan:** lägena, duckningen, pausen och inställningen.
7. **Läppsynken.**
8. **Version 2**, gärna som en egen feature (som Saab-spelets "resten av replikerna"): free
   roam-featurerna, poolen, ropen, `vpool` och `vfree`.

**Uppdelningen (avsnitt 10.1):** steg 0–7 är jobb 1, och jobb 1 tar dessutom free roam-featurernas
repliker av rollfigurerna från steg 8 (inkopplingen av deras talare, `scope` med `feature`), utom
mikrofonen och tutan. Resten av steg 8 är jobb 2, `features/roster_v2.md`, under "Vänta med dessa
tills spelaren säger till" i `features/TODO.md`.

## 12. Att tänka på

- **Timers:** rösterna är avstängda i testläget, så `calibrate` och kalibreringspoolerna påverkas
  inte. Men med rösterna på blir en dialogruta längre (tal går med ungefär 12 tecken/s, texten med 55).
  Kontrollera att ingen tidsatt etapp har en dialogruta medan klockan går (`runner.js:133`). Gör
  någon det ska klockan stå still under dialogen. Rösterna får aldrig äta av en etapps tid.
- **Parallella features:** varje ny replik piper tills `make voice` körs. CLAUDE.md får en regel: en
  feature som lägger till repliker kör `make voice DRY=1` och skriver siffrorna i sin rapport.
  Genereringen görs när utvecklaren säger till (fråga 5), eftersom den kostar pengar.
- **DESIGN.md:** rösterna blir ett nytt avsnitt under §12 (Music and sound, som i dag säger "all
  synthesised"). Röst-API:t går in i §14.3, scenarierna i §16, rollernas språk och röster i §2.1
  (kolumnen `voice` är tonhöjden för pipet och står kvar), och en rad i ändringsloggen. README får ett
  avsnitt "Röster", och CLAUDE.md får make-målen och regeln om `.env`.
- **Källtaggarna** (DESIGN §1.4) gäller texten, inte rösten. En spansk `tts` är vår översättning av en
  undertext och märks så i `lines.json`.
- **Varumärken** (DESIGN §1.5): rösterna läser bara det som står i texten, så inget nytt tillkommer.
  Röstnamnen i Voice Library ("Brage – Nordic Storyteller") syns aldrig i spelet.
- **Ingen kloning** av verkliga personer, och särskilt inte av filmens skådespelare. Ingen
  `voice_id` får komma från en röst som påstår sig härma någon.

## 13. Öppna frågor

1. **Lokalbefolkningen:** spanskt tal under svenska undertexter, som i filmen (förslaget), eller
   spanska röster som talar svenska med brytning? José talar svenska med brytning i båda fallen.
   Som du föreslog.
2. **Omfång och tak:** version 1 först (~20 000 credits) och version 2 sedan? Vilket tak i credits
   gäller för varje omgång?
   ok, v1 först, se till att det finns en ny features/xyz.md för att stoppa in resten.
3. **Statisterna och ropen:** en pool med tio röster (~12 000 credits), eller pip som i dag? Ska
   rollfigurerna ropa med sin egen röst (~6 000) eller låna en poolröst?
   pool med tio röster. kan låna en poolröst
4. **Klockrepliken:** får "Prata med gänget"s klocka avrundas till halvtimme, så att den kan
   röstsättas (avsnitt 5.2)?
   gör vad du vill
5. **Nya repliker från kommande features:** genereras de av featuren själv under ett litet tak (till
   exempel 1 500 tecken), eller piper de tills du ber om en omgång?
   genereras av featuren själv
6. **Dialogrutan:** texten i 55 tecken/s före talet (förslaget), eller utskriven i takt med talet som
   i Saab-spelet?
   i takt med talet
7. **Kontot:** samma konto som Saab- och Seinfeld-spelen, och samma regler (ingen uppgradering,
   bara Voice Library)?
   mm

## Källor

- Saab-spelet: `features/implemented/a_fully_voiced_game.md`,
  `resten_av_replikerna_for_a_fully_voiced_game.md` och `barnroster.md` (priset efter rabatten),
  `tools/voice/` och `src/voice.js`.
- Seinfeld-spelet: `tools/voices.mjs`, README-avsnittet "Voices", `docs/phase3-reports/fix-a.md`
  avsnitt 4 (röstkön).
- Charter: DESIGN §1.3–1.5, §2, §12, §14.10. `notes/research-setting.md:22` och `:241`,
  `notes/research-characters.md:367` och `:482`.
- [ElevenLabs: modeller](https://elevenlabs.io/docs/overview/models),
  [Text to Speech med tidsstämplar](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps),
  [Voice Library](https://elevenlabs.io/docs/product-guides/voices/voice-library).
