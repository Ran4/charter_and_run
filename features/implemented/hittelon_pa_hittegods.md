# 116. Hittelön – de borttappade väskorna

**Implementerat.** En fjärde samlarserie, `vaskor` i `COLLECTIBLES` (src/content/island.js), med en egen
modul `src/game/lostBags.js` (`game.bags`) och konfigurationen `HITTELON`; DESIGN §10.52. Sex främmande
resväskor (modellen `hittevaska` i src/actors/pickups.js: Stigs väska utan Hammarby-dekalen, en färg per
väska och en LAS PALMAS-lapp på båda sidor, en med AKUREYRI) står med ljuspelare vid HANGAR 2 bakom
drömplanet, vid byggets bod, på packhusets lastkaj, i en fåra i tomatfältet på vischan, framför
grisfestgårdens hus och på golfbanans artonde green (landmärkena `vaska_*` i
src/world/landmarks-island.js). Mellan uppdragen lyfter Stig en väska över huvudet när han går fram till
den (`game.carrying` = `{ item: 'vaska', bag }`, gångfart, armarna `carryOver`), första gången med
Angeruds tips i munnen: ”Om man hittar något, så kan man få hittelön…”, sedan med väskans egen replik.
Kortet ”Hittelön – Bär väskan till hittegods på Gando”, ljuspelaren och pilen pekar på disken. Han kan ta
en bil, och väskan åker då med osynlig. Ramlar han faller väskan ner vid hans fötter, och R lämnar den där
han stod. Vid disken ger E (”Lämna in väskan”, bara när killen står på sin plats) en klippbild från hallen
med väskan på disken och repliksväxlingen ”Hammarby…?” (killen kliar sig i huvudet), ”Nej, inte min.”,
”Hittelön.” (+100 pta och toasten ”Hittelön: +100 pta”) och ”Tack så mycket.”. Sedan kommer kortet
”Borttappade väskor n/6” och sparningen. Alla sex ger seriens bonus på 1000 pta och Angerud i radion: ”Sex
väskor, och du lämnade in allihop? Det var inte riktigt så jag menade.” I ett uppdrag och i flygnivån är
väskorna dolda, och en buren väska går tillbaka till sin plats, så inget uppdrag, ingen timer och ingen
kalibrering påverkas.

Avvikelser från idén: väskan bärs över huvudet mellan de lyfta händerna (liggande, med lappen uppåt) i
stället för rakt på huvudet. Bonusen är 1000 pta som för de andra serierna. Fallet, R och en annan bärning
som tar över (Berra) tappar väskan, vilket idén inte nämner. Varje väska har en egen upplockningsreplik
[N]. Ingen `first`-radio. Uppdragsgivaren går att prata med medan Stig bär en väska, och då går väskan
tillbaka när uppdraget börjar. `collect()` betalar nu seriens `pay` (standard 250, väskorna 0 eftersom
killen betalar i repliken), och ett objekt skickas till sin modells `build(id, item)`.

Verifierat headless (port 8862): det nya scenariot `hittelon` (lyftet med riktig tangent, gångfart med
Shift, bilen, fallet, R, en annan bärning, disken med och utan killen, replikerna i ordning, +100 pta bara
på ”Hittelön.”, kortet 1/6, sparningen, uppdragsstart med väska, 6/6 med bonus och Angerud, omladdning,
gammal sparfil utan serien, flygnivån) och `hittelonshots` (alla platser, bärandet, disken; bilderna
granskade) ger `RESULT: PASS`, liksom `story`, `fullstory`, `api`, `start`, `brodrost`, `rum107`,
`grisar`, `berra`, `kinds`, `foot` och `ui`.

**Betyg:** 4,3/10 · wow 2 · film 3,7 · Stig-Helmer 3,3 — *Väskor på huvudet och en omvänd ”Hittelön.” är snällt, men det är en vanlig samlarrunda med ett nytt bärläge.*

*Stig hittar andras borttappade resväskor runt om i inlandet, bär dem på huvudet till hittegodsdisken på Gando och får för en gångs skull själv hittelön.*

**Kategori:** Samlarserie · **Var:** hittegodsdisken på flygplatsen i Gando (226, −234); sex väskor i inlandet: vid HANGAR 2 bakom drömplanet, vid bygget, på packhusets lastkaj, i tomatraderna på vischan, på grisfestens gård och på golfbanan · **Insats:** M – ett nytt bära-och-lämna-läge för samlarsaker och en E-prompt vid disken, cirka sex filer plus DESIGN

![Stig vid hittegodsdisken i dag](../free_roam_bilder/hittelon-pa-hittegods-1.jpg)
*Bild 1 (nuläge): Stig står vid disken under OBJETOS PERDIDOS · HITTEGODS. Killen bakom disken skyms av Stig, men hans ”Hammarby…?” syns i pratbubblan. Titta på hyllväggen full av väskor. Allt detta finns redan, men E gör ingenting här i dag.*

![Skiss: hittelön utbetald vid disken](../free_roam_bilder/hittelon-pa-hittegods-2.jpg)
*Bild 2 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): En blå väska med en LAS PALMAS-lapp står på disken. Killen säger ”Hittelön.”, Stig svarar ”Tack så mycket!”, rutan uppe till höger visar ”Hittelön: +100 pta” och kassan har gått från 0 till 100 PTA. Det är samma replikväxling som på julaftonsmorgonen, fast pengarna går åt andra hållet.*

![Skiss: en borttappad väska på packhusets lastkaj](../free_roam_bilder/hittelon-pa-hittegods-3.jpg)
*Bild 3 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): Packhuset under TOMATES · EXPORTACIÓN. En röd väska med LAS PALMAS-lapp ligger på lastkajen i en ljuspelare, likadan som spelets andra samlarsaker har. Stig står nedanför och tänker högt: ”Om man hittar något, så kan man få hittelön…”.*

**Idén.** Sex främmande resväskor har hamnat på fel ställen i inlandet. Man ser dem på minikartan och på ljuspelaren, precis som Oles prylar och hajfenorna. När Stig går fram till en väska lyfter han upp den över huvudet och bär den. Han kan också ta bilen, för packhuset ligger drygt 200 m från Gando, och då åker väskan med. Vid hittegodsdisken får han E-prompten ”Lämna in väskan”. Killen läser på lappen och frågar ”Hammarby…?”, Stig svarar ”Nej, inte min.”, och sedan betalar killen: ”Hittelön.” – ”Tack så mycket.” Det blir 100 pta per väska. När alla sex är inlämnade får han en extrabonus, på samma sätt som för de andra samlarserierna.

**Filmkopplingen.** I filmen kommer Stig-Helmers väska aldrig fram: ”Min väska har inte kommit.” Den irrar sedan jorden runt, och på en japansk flygplats säger någon ”Den här väskan ska till Las Palmas” (notes/research-plot.md:238). Därför står det LAS PALMAS på lapparna. Vid poolen ger Angerud Stig ett beslöjat tips: ”För om man hittar något, så kan man få hittelön. Tänk på det.” Stig svarar ”Aj! Det ska jag göra.” (research-plot.md:326). Spelet använder repliken redan i ett uppdrag (src/game/missions/island.js:396). Här tar Stig rådet bokstavligt. På julaftonsmorgonen kommer en kille från flygplatsen med väskan, läser ”Hammarby…?” på märket och säger ”Hittelön.” / ”Tack så mycket.” (research-plot.md:362). Anteckningarna säger inte vem som säger vad, men spelet visar det som att killen tar 25 pta av Stig (island.js:609–612). I free roam vänds rollerna: samma två repliker, men nu är det Stig som får pengarna. Hittegodskontoret med sin vägg av resväskor finns i filmen (research-characters.md:501–502) och byggdes redan i spelet (src/world/blocks/coast.js:372–412). Att kontoret saknar en massa andra väskor är vår egen påhittade fortsättning.

**Varför vi borde göra det.**
- ”Det är ju från filmen!” Hittelönen som kostade Stig pengar på julafton kommer tillbaka med ombytta roller. Lapparna med LAS PALMAS och ”Hammarby…?” vid varje inlämning är små blinkningar till väskans jorden runt-resa.
- ”Typiskt Stig-Helmer!” Mannen vars egen väska försvann blir öns ärligaste hittegodshjälte. Han förstår inte vad Angerud egentligen menade och gör precis som han blev tillsagd. ”Nej, inte min.” blir ett litet återkommande skämt.
- Det passar Hit & Run-formen: en samlarserie med en tydlig sista handling (bära och lämna in) i stället för att bara röra vid saken. Väskorna leder spelaren ut till inlandets platser, som i free roam annars mest är kuliss. Det mesta finns redan: boden, killen, hyllväggen och en färdig väskmodell.

**Så kan det byggas.** En tredje serie `vaskor` i `COLLECTIBLES` (src/content/island.js:123) med sex platser som landmärken i src/world/landmarks-island.js, på samma sätt som `pryl_*`. Upplockningen i dag är rör-och-klart: tickPickups (src/main.js:1681–1693) anropar `collect()`, som betalar +250 direkt. För väskorna behövs ett nytt bärläge. Det kan kopieras från stegtypen `carry` (src/game/missions/kinds/flight.js:258–326: en Collectible med `motion: 'none'` som följer med över huvudet och armposen `cupUp` eller `carryOver`), men den typen går bara att köra i uppdragsmotorn. Bärandet ska ha en egen flagga, till exempel `game.freeBag`, och inte `g.carrying`, som uppdragens bärsteg skriver över och nollställer (flight.js:269, 274, 322). Inlämningen blir en `game.addInteractable` (main.js:1217) på hallsidan av disken: disken står på lokalt z 7,35, så man står på ungefär z 8,2 med r ≈ 1,6 och prioritet 0, så att den aldrig tar över en uppdragsgivare. Den är aktiv bara när Stig bär en väska och inget uppdrag pågår. `use()` betalar ut med `addCoins` (main.js:966) och spelar replikerna. Väskmodellen `vaska` finns redan (src/actors/pickups.js:261–272) men har Stigs Hammarby-dekal och cachas som en enda modell med `shared('vaska')`. Den behöver färgvarianter per väska, utan dekalen och med en LAS PALMAS-lapp gjord med signMesh. Fyra ställen är hårdkodade för de två serier som finns: `collect()` låter alltid Ole säga raden (main.js:1708), sparningen känner bara till prylar och fenor (main.js:1290, 1302–1303), minikartans markörer finns i hud.js:640–642 och ikonerna i style.css:36–39. Bilen spärras i dag bara när man bär en person (main.js:1260), så en väska kan få åka med (modellen göms i bilen). Taggar: ”Hammarby…?” och ”Hittelön.” [F*] (flyttade, med ombytta roller), ”Tack så mycket.” \[F*](t), ”Nej, inte min.” och lapparna [N]. Kontraktet läggs till i DESIGN §10.1 och påhittet i §1.6, plus en rad i ändringsloggen.

**Att tänka på.** Uppdragen och deras timers får inte påverkas. Väskor plockas och lämnas bara in när `missions.state === 'idle'`, och bär Stig en väska när ett uppdrag startar går den tillbaka till sin plats. Då plockar story-körningens förflyttningar aldrig upp någon väska, och julaftonsintrot, där killen flyttas till Flamenco (island.js:608) och tar sina 25 pta, förblir orört. Efteråt ska `api`/`start` (sparformatet) och `story` köras och visa RESULT: PASS. Två ställen som först föreslogs är redan upptagna av Oles prylar: drömplanets vinge (pryl_kamera, landmarks-island.js:102) och byggets översta bjälklag (pryl_klocka, :99). Väskorna läggs därför vid hangaren och vid byggets bod (nature.js:1000–1001) i stället. Lapparna får bara bära ortnamn som LAS PALMAS eller AKUREYRI, aldrig flygbolaget som research-characters.md:535 nämner (DESIGN §1.5). Två andra idéer på listan rör samma sak (plånboken som lämnas in vid Casa Cuartel med ”Hittelön.” och Stigs egen väska på bagagebandet). Byggs flera av dem bör replikerna fördelas så att ”Hittelön.” inte hörs överallt.
