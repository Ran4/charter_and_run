# 140. Kvarteren tänds – adventsstjärnor och tända fönster

**Implementerat.** (2026-10-26, DESIGN §10.64) När himlen är mörk tänds bostadskvarteren, i det befintliga
`nightGlow`-nätet i `src/world/town.js` (inget nytt material, ingen ny mesh, inget nytt ritanrop):
- **Lägenhetshotellen (alla 52):** varje balkongenhets fönster mellan fenorna lyser med 55 % chans (25 %
  om enheten har en pappstjärna, så att stjärnan syns mot ett mörkt rum), lobbybandet i gatuplanet med
  75 %, sidofönstren med 35 % och baksidans glasband i enhetsbreda bitar med 40 % (inga bakom trapptornet).
- **Bungalowerna (alla 48):** fram-, bak- och sidofönster med 40 % vardera.
- **Färger:** hotellens varma `NIGHT_COLS` plus ett dovt orange; 9 % (lägenheter) och 12 % (bungalower) av
  de tända rutorna får ett kallt blått tv-sken, bara ljus utan bild (§1.5).
- **Adventsstjärnorna:** varje pappstjärna (`adventStar`, 93 st) får ett eget sken i sin färg strax framför
  papperet, lite mindre så att den konturerade kanten ramar in det.
- **Stig-momentet på Hotel Flamenco** (`src/world/blocks/hotels.js`, `roomStar`): en pappstjärna hänger i
  glasdörrarna till de stängda rummen 105, 109, 111 och 115 och lyser i hotellets eget nattnät; rum 107
  har ingen.
- **Slump:** varje tomt har en egen `mulberry32(9000 + bi·13 + bj·101 + side·3 + k)`; blockets RNG rörs
  inte. Kontrollerat mot commiten före: kollision, rekvisita, parkerade bilar, `balconyLots`, `dogLots`,
  `busStops`, `frameRamps`, lyktorna och alla statiska nät är identiska, utom `nightGlow`, Flamencos
  blocknät (de fyra stjärnorna) och dess nattnät.
- **Siffror** (`LIT_STATS`): 1115 av 2544 fönster tända (43,8 %), 106 blå (9,5 %), 42 av 52 lobbyer, 93
  stjärnor; `nightGlow` har 23 616 trianglar.

**Avvikelser från idén:** samma fönster lyser varje kväll (ett sammanslaget nät, inte en ny dragning per
kväll), och fönstren tänds inte ett och ett. Ingen ljusstake. Rum 107 är det enda *utan stjärna*, inte
mörkt, eftersom det är ett öppet rum vars taklampa redan lyste. Ingen ny kvällsbelysning behövdes, för
Dygnet runt (§10.10) ger redan free roam kväll och natt. Ljusen syns också i grisfestens natt och i
solnedgångsscenerna (julaftons mantra, Rio-kortet), som idén ville; uppdrag i dagsljus är orörda. Inga
repliker, inga röstklipp (0 repliker, 0 tecken, 0 credits) och inga timers ändrade.

**Verifiering** (headless, port 8862): nytt scenario `kvarter` (räkningen, släckt kl. 15, tänt i skymning
och natt, ett enda nattnät; bilder från gatan under HOTEL ATLÁNTICO, staden ovanifrån mot Flamenco, en
bungalowgata, Flamencos rad 105/107/109, skymning och dag) ger PASS. `story` (med `SHOTS=1`: grisfestens
kontrollpunkter, ljuspelare och tallrikar syns mot de tända fasaderna), `fullstory`, `perf` (60 fps
överallt), `dygn`, `systrar`, `helan` och `balkong` ger alla `RESULT: PASS`.

**Betyg:** 3/10 · wow 2,3 · film 1,7 · Stig-Helmer 1 — *Tända fönster är billig stämning för nattbilder, men ingen scen eller replik, och de syns bara om dygnet runt byggs först.*

*När kvällen faller över Nueva Estocolmo tänds fönstren i lägenhetshotellen och bungalowerna – varmt gult ljus, ett blått tv-sken här och där och svenskarnas pappstjärnor som lyser på balkongerna.*

**Kategori:** Liv och stämning · **Var:** alla 13 lägenhetskvarter (52 hus) och bungalowkvarteren · **Insats:** S för ljusen, M tillsammans med en kvällsbelysning i free roam – själva ljuset är ett enda sammanslaget nät, men free roam är i dag alltid dag

![Hotel Flamenco lyser, lägenhetshotellen är mörka](../free_roam_bilder/kvarteren-tands-1.jpg)
*Bild 1 (nuläge): Nattpaletten sedd över stan. Hotel Flamenco i bakgrunden har redan tända fönster och en upplyst lobby. Lägenhetshotellen i förgrunden, Hotel Atlántico och grannen till vänster, har inte ett enda tänt fönster. Det är den kontrasten idén handlar om.*

![Ett lägenhetshotell på natten utan ljus](../free_roam_bilder/kvarteren-tands-2.jpg)
*Bild 2 (nuläge): Samma sorts hus på nära håll, från gatan. Inga fönster lyser; husen står som blågrå siluetter, och bara gatlyktorna glöder.*

![Samma vy med tända fönster och stjärnor](../free_roam_bilder/kvarteren-tands-3.jpg)
*Bild 3 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): Samma gata med ungefär varannan balkongruta tänd i gult och orange, ett par blå tv-sken på huset till vänster, lysande adventsstjärnor på några balkonger och lobbyn upplyst i gatuplanet.*

**Idén.** När himlen blir kväll eller natt tänds ungefär hälften av balkongfönstren i lägenhetshotellen i varmt gult eller dovt orange. Några få rutor får ett kallt blått tv-sken, utan bild. Ungefär 40 % av bungalowfönstren tänds också. Adventsstjärnorna som redan hänger i en del fönster får eget sken och syns på långt håll, så att gatorna mellan husen ser ut som en svensk julkväll under palmerna. I dag är öns free roam alltid dag, och natten finns bara i uppdragen: grisfesten (M12) går över i kväll och natt, mantrat i julafton (M13) är i solnedgång. Ljusen syns alltså direkt i grisfestens natt, men för att free roam-spelaren ska få se dem behöver de paras med en kväll i free roam, till exempel [Dygnet runt](dygnet_runt.md) (nr 30), eller med en kväll som ligger kvar efter M12. Belöningen är ren stämning: man kör hem genom stan en kväll och känner att här bor det folk.

**Filmkopplingen.** I filmen är grisfesten ”kvällen före julafton” (notes/research-plot.md:85). Den enda natt spelet visar är alltså lillejulafton, och då är det rimligt att svenskarnas adventsstjärnor och ljusstakar lyser i fönstren. Själva värmen sammanfattas av Levander i telefon: ”Det är typiskt decemberväder – 22 grader varmt och soligt, så klart.” (notes/research-plot.md:275). Stig-Helmers ”Det är väl typiskt svenskt att ha julfest bland palmerna.” (notes/research-plot.md:365) finns redan i M13:s intro och titel, så stjärnorna blir ett eko av den repliken snarare än en ny referens. Stjärnorna, ljusstaken och tv-skenet är påhittad scenografi i andan ”svenskar utomlands” ([N], som den befintliga adventStar i town.js). Valfritt Stig-moment, bara scenografi och inga nya repliker: i raden av tända adventsfönster på Hotel Flamencos bottenvåning är rum 107, Stig-Helmers och Oles rum, det enda mörka. Hans julklapp var ju julmat och en dalahäst och ingen adventsstjärna (notes/research-plot.md:274).

**Varför vi borde göra det.**
- ”Wow, vad mysigt!” Den enda natten i spelet går i dag genom svarta kvarter. Med fönsterljus och stjärnor blir grisfestens bussrace och Tonga Tonga-färden en julkväll på Kanarieöarna, och spelaren ser direkt att det är svenskar som bor där.
- ”Det är ju julen från filmen!” Filmens jul i värmen, med grisfest på lillejulafton och julfest vid poolen, får ett synligt uttryck i hela stan och inte bara vid Flamenco. De två namngivna hotellen har redan tända fönster (hotels.js:36-56), så i dag ser resten av stan obebodd ut bredvid dem.
- Billigt för vad det ger: allt ljus läggs i det nightGlow-nät som redan finns, utan nytt material och utan nya ritanrop, och det blir grunden som en kväll i free roam (”Dygnet runt”) behöver för att alls vara värd att visa.

**Så kan det byggas.** I `src/world/town.js` lägger `slabLot()` (cirka :397-440) en ruta i `nightGlow` för ungefär 55 % av balkongenheterna. Rutan är 0,004 djup och sitter strax framför glaset, på front − 0,075, i världskoordinater via `f.wx`/`f.wz` och yaw. Färgerna tas från `NIGHT_COLS` i `src/world/blocks/hotels.js` (:39, med blått som tv-sken). Sido- och baksidesfönstren (town.js:437-439) kan tändas på samma sätt, och lobbybandet i gatuplanet likaså. `adventStar()` (town.js:224) får en egen glödande stjärna i nightGlow, på ungefär front − 0,175, framför pappstjärnan så att rutan inte skär igenom den. `bungalowLot()` (:266-376) tänder ungefär 40 % av fönstren. Valen dras från en egen RNG per hus, till exempel `mulberry32(9000 + bi*13 + bj*101 + lot)`. Blockets delade `mulberry32(5000 + …)` (town.js:555) får inte röras, annars flyttas geometri och rekvisita i varje senare hus. Resultatet blir runt 500 boxar i det befintliga nätet, som redan bara ritas när himlen är mörk (town.js:981-991). Om free roam ska få kväll är det en separat del: en kvällspalett i free roam, och en `setSky('day')` vid varje uppdragsstart, eftersom alla uppdrag utom grisfesten och julafton förutsätter dagsljus.

**Att tänka på.** Ensamt syns det här bara i grisfestens natt och i solnedgångsscenerna. Som free roam-idé hänger det på att någon kväll byggs, och den kvällen får inte läcka in i uppdragen: ett uppdrag som startas på natten skulle annars spelas på natten. Ljusen är bara visuella, utan kollision, och påverkar inga timers. Men grisfestens nattsträcka ändrar utseende, så kör `perf` och `story` med `SHOTS=1` över M12 och kontrollera att loppets kontrollpunkter, guidepilen och tallrikarna fortfarande syns mot tända fasader. Tv-skenet ska vara rent blått ljus utan bild, så att inget riktigt program eller programledare dyker upp (DESIGN §1.5). Inga texter och ingen musik tillkommer.
