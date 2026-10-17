# 60. Kyrkfrid i Templo Ecuménico

**Implementerat.** Byggt 2026-10-17 som `src/game/church.js` (`Church`, ägd av Shame som `shame.church`)
med konfigurationen `METERS.skandal.kyrkfrid` i `src/meters.js`, beskrivet i DESIGN §7.2 (”Kyrkfrid”) och
§7.1. Bara på ön när inget uppdrag pågår (`missions.state === 'idle'`), till fots och under en
SKANDAL-jakt. Två nya landmärken i `landmarks-island.js`: `kyrkaPuerta` (block-lokalt (0,8, 2,2), framför
dörrens högra halva under portiken, vänd utåt) och klippankaret `kyrkaCam` (−2, 9, π). Vid dörren:
”E Sök skydd i kyrkan” [N] (prioritet 100) och en grön markör på kartan. Stig vänder sig mot dörren,
högra dörrhalvan öppnas mot den mörka kyrkan och han går in på 0,8 s, fryst, medan polisen fortsätter
komma (hinner han ikapp blir Stig tagen vid dörren som vanligt; det krävs ungefär 7 m försprång).
Dörren slår igen (`audio.doorSlam`), Stig göms och kameran klipper ut till torget med dörren och
systrarnas skylt i bild, och kortet KYRKFRID / Guardia Civil väntar utanför [N] visas. Medan han är inne
lämnar `Shame.update` jakten åt kyrkan (inga avståndsband, ingen jakt, inga tillrop, inget bilgripande):
mätaren sjunker över 9 s men hålls på 4 tills skylten är läst. Jeeparna utanför bild ställs på två
stopp på gatan framför kyrkan (norra filen, vända västerut), de i bild stannar där de är, och alla står
parkerade med den lånade jeepens blinkande blåljus (`lampMesh`, nu exporterad från `guardiaJeep.js`).
Polisen går till skyltens östra ände, läser ”Es una iglesia…” [F*], stavar sig igenom ”Det… är… en…
kyr-ka.” [F*] och kliar sig i huvudet (ny anim-flagga `scratch` i `models.js`/`character.js`). Sedan ger
de upp: inga böter, ingen flyktbanderoll, en egen spärrtid på 120 s (portierns och garderobens rörs
inte), hans ”De där svenskarna är heltokiga!” [F*] när han springer iväg till sin jeep. Stig kikar ut i
dörröppningen och tittar åt båda hållen, kliver ut till strax utanför portiken, jaktkameran tar över
bakom honom med båda jeeparna i bild vid gatan, ”Hoppas vi inte får användning för det.” [F*] och sedan
banderollen KYRKFRID / Guardia Civil gav upp [N]. När polisen har kommit fram till jeepen kör jeeparna
iväg som vanlig trafik. Bilarnas jakt-AI i `startPursuit` är nu `shame.chase(car)` (samma siffror), och
den lämnar också tillbaka en väntande jeep om friläget tar slut mitt i scenen. Dörrens öppna halva är
modulens egen mesh utan kollision. Inga uppdrag, etapper, timrar, fixturen eller kalibreringspooler
ändrades, och inget sparas. `main.js` läser kortet (`church.objective()`, efter målarverkstadens) och
kartmarkören (`church.markers()`).

Avvikelser från idén: en polis i stället för två (kollegan vid dörren i skissen behövs inte). Jeeparna
körs inte fram genom stan utan ställs på gatan när de inte syns i bild. Kameran står kvar på torget
när Stig kikar ut, och repliken kommer när han har klivit ut och jaktkameran ser ut mot gatan. Mätaren
står strax över noll tills polisen har läst skylten, så det är scenen och inte en klocka som avslutar
jakten. Spärrtiden är 120 s, dubbla portierns.

Verifierat headless (port 8863): nytt scenario `tools/scenarios/kyrkfrid.mjs` med `kyrkfrid` (ingen
prompt utan jakt, prompten och markören, att han fryser vid dörren, kyrkan, klippet, kortet, jeeparna
vid gatan med blåljus, mätaren, polisen vid skylten och de tre replikerna i rätt ordning, att de ger upp
utan böter, titten ut, utklivet, Stigs replik, banderollen, att jeeparna kör, spärrtiden, tagen vid
dörren med polisen 3,5 m bakom, inne med 8,5 m försprång, polisen som kommer från torgets södra kant,
ett uppdrag som startar mitt i scenen, inget under ett uppdrag och ingen kyrka i flygnivån) och
`kyrkshots` (bilder på varje steg). Bilderna är granskade. `story` och `fullstory` gav `RESULT: PASS`,
liksom `skandal`, `carbust`, `skjortbyte`, `garderob`, `guardiajeep`, `jeepsiren`, `pintura`, `ui`,
`api` och `missions`.

**Betyg:** 5,3/10 · wow 3 · film 3,7 · Stig-Helmer 3 — *Ett andra gömställe där språkkursens ”Es una iglesia” får sin pointe ger jakten ett val, men repliken är för de inbitna och fristadsläget är mer arbete än det ser ut.*

*Stig är jagad av Guardia Civil, springer in i kyrkan och dörren slår igen. Utanför läser en guardia skylten högt, ”Es una iglesia…”, och kliar sig i huvudet. Efter en stund ger de upp och kör därifrån, och Stig kikar försiktigt ut.*

**Kategori:** Lek och fysik · **Var:** Templo Ecuménico i centrum, kvarter (3,1). Kyrkdörren ligger vid ungefär (0, −159) och skylten ES UNA IGLESIA står på torget framför, vid (−6,4, −150,4). Det är omkring 150 m norr om portiern på Hotel Flamenco. · **Insats:** M – en liten ”fristad” i skandaljakten med en uppställd scen, inte bara en ny rad data som portiermutan

![Templo Ecuménico med stängd dörr och skylten ES UNA IGLESIA](../free_roam_bilder/kyrkfrid-1.jpg)
*Bild 1 (nuläge): Kyrkans framsida med dubbeldörren under portiken. Till vänster står skylten ES UNA IGLESIA / DET ÄR EN KYRKA. och till höger MISA 10.00 / GUDSTJÄNST 11.30. Stig står vid dörren, men någon prompt finns inte. Dörren är en del av väggen och skylten är bara dekor, så i dag finns ingenting att göra här.*

![Skiss: guardian läser skylten, jeepen väntar](../free_roam_bilder/kyrkfrid-2.jpg)
*Bild 2 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): Stig har gått in och dörren är stängd. En guardia står vid skylten och läser högt, ”Es una iglesia…”, medan kollegan väntar vid dörren och en jeep med blåljus har kört fram. Uppe till höger syns notisen KYRKFRID – Guardia Civil väntar utanför. I skissen står jeepen på torget. I spelet är det enklare att låta jeeparna stanna vid gatan, eftersom palmerna och granarna står i vägen.*

![Skiss: jeeparna kör iväg, Stig kikar ut](../free_roam_bilder/kyrkfrid-3.jpg)
*Bild 3 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): Det är över. Jeeparna kör iväg längs gatan, och en guardia ropar över axeln ”De där svenskarna är heltokiga!”. Stig har just klivit ut under portiken, tittar efter dem och mumlar ”Hoppas vi inte får användning för det.”. Notisen har bytts till KYRKFRID – Guardia Civil gav upp.*

**Idén.** När Stig jagas av Guardia Civil till fots i free roam får kyrkdörren en prompt: **E** Sök skydd i kyrkan. Stig slinker in och dörren slår igen. Kameran stannar ute på torget: konstapeln går fram till skylten och stavar sig igenom den, och jeeparna stannar vid gatan med blåljusen på. Efter tio sekunder ungefär tröttnar de. En guardia ropar ”De där svenskarna är heltokiga!”, jeeparna kör iväg, mätaren faller till noll och Stig kikar ut med sin replik. Kyrkan är gratis, till skillnad från portiern som kostar 500 pta, men man måste ta sig dit till fots och den får en längre spärrtid. Då blir jakten ett val: betala vid hotellet eller springa till kyrkan. Belöningen är själva scenen, och sedan blir kyrkan en plats man minns.

**Filmkopplingen.** Båda replikerna kommer från scenen där systrarna är hemma. Siv och Majsan lyssnar på en spansk språkkursskiva: ”Es una iglesia. Det är en kyrka.” / ”Hoppas vi inte får användning för det.” (notes/research-plot.md:113–115). Den första repliken är skivans. Den andra säger en av systrarna, men källan anger inte vilken. Filmen har ingen kyrkscen och ingen Guardia Civil. Spelet har redan satt skivans fras på en skylt framför kyrkan (src/world/blocks/centre.js:1200, [F*]), men den används inte till något. Här gör den nytta. Guardian läser skivans fras högt [F*], och Stig får systrarnas svar när han kliver ut [F*]. Det vänder på filmens skämt: systrarna hoppades slippa kyrkan, men Stig behövde den. ”De där svenskarna är heltokiga!” säger spanjorerna i filmen om svenskarna som dansar juldanser i poolen (research-plot.md:373). Den repliken är redan ett av Guardians tillrop i spelet (src/meters.js:27, [F*]). Själva kyrkfriden är påhittad, precis som portiermutan. Stig-momentet är den blyge och tafatte Stig (research-plot.md:61) som i panik tar skydd i en kyrka och sedan försiktigt tittar ut.

**Varför vi borde göra det.**
- ”Det är ju från filmen!” Skylten ES UNA IGLESIA står redan vid kyrkan och väntar på sin poäng. Nu får skivfrasen och systrarnas torra svar en riktig scen, och det är Stig som säger repliken.
- ”Typiskt Stig-Helmer!” Den räddaste mannen på ön söker kyrkfrid som i ett riddardrama. Utanför står en spansk polis och stavar sig igenom de svenska turisternas parlörskylt, och sedan kikar Stig ut som om ingenting hade hänt.
- Med två gömställen blir jakten mer taktisk, precis som i Hit & Run: antingen mutar man portiern för 500 pta eller springer 150 m till kyrkan. Nästan alla delar finns redan (gömställen, låsa-in-mönstret, tillropen, banderollerna och skylten). DESIGN §15.5 har dessutom ett andra gömställe på P2-listan, kontoret hos SunTrip (DESIGN.md:4208), och kyrkan är samma idé på en roligare plats.

**Så kan det byggas.** Lägg till ett nytt landmärke vid dörren, till exempel `kyrkaPuerta: { b: [3,1], at: [0, 2.2], yaw: 0 }`, i src/world/landmarks-island.js och en rad i DESIGN §6.3. Det befintliga `kyrka` ligger ute på torget, 17 m från dörren (landmarks-island.js:67). Prompten blir ett eget interactable i stil med `setupHideouts` (src/game/shame.js:272–285), men med en egen `use`. `bribe()` går inte att använda, eftersom den betalar, spelar myntljudet och avslutar jakten direkt (shame.js:287–310). Det nya är ett litet fristadsläge i shame.js som gör följande:
- gömmer Stig på samma sätt som `lockIn` på planet (src/world/cabin.js:1511–1520: `p.state = 'hidden'`, farten nollad, `audio.door`, `g.wait` återställer)
- pausar `officerChase`, som annars styr mot spelaren och kallar `busted()` under 1,4 m (shame.js:407–460)
- sänker mätaren själv, eftersom avklingningsbanden inte rör sig så länge en förföljare är inom 35 m (meters.js:23)
- går med konstapeln (`shame.officer`, som inte finns i `g.npcs`, så `g.say(o, …)`) till skylten
- skickar de två jagande jeeparna (AIDriver i läget `chase`, shame.js:206) till ett stopp vid gatan
- avslutar med `endPursuit` och en egen banderoll, KYRKFRID / Guardia Civil gav upp [N].

Inställningarna läggs som data i skandalblocket i meters.js (landmärke, radie, spärrtid cirka 120 s, replikerna). Att klia sig i huvudet kräver en ny armflagga `scratch` i src/actors/models.js, på 10–20 rader bredvid `oath`. Prompten ”Sök skydd i kyrkan” märks [N]. DESIGN §1.6 får raden ”kyrkfrid som gömställe” bredvid portiermutan (DESIGN.md:161), och det behövs ett testscenario.

**Att tänka på.** Kyrkfriden ska bara gå när inget uppdrag är igång (`g.missions.state === 'idle'`). Portierns `enabled` kollar bara jakt, att Stig är till fots, spärrtiden och frysningen (shame.js:280), så den fungerar även under uppdragen. Kyrkan får inte göra det, annars ändras SKANDAL-jakterna i de 13 uppdragen och deras timers. Kör `story` och `fullstory` efteråt och kontrollera att båda ger RESULT: PASS. I julaftons insamling väntar Fru Storch på kyrktorget (src/game/missions/island.js:622, cirka 19 m från dörren), så inget får stå kvar permanent på torget. Balansen behöver prövas: en gratis fristad mitt i stan får inte göra portierns 500 pta meningslösa, och därför behövs den längre spärrtiden och kravet att komma till fots. Jeeparna kan inte köra över torget, eftersom palmer, granar och skyltar står i vägen. De stannar vid gatan, cirka 38 m bort, om de inte ställs fram med skript. I spelartext står det ”jeep”, aldrig bilmärket (§1.5). Templo Ecuménico är ett offentligt landmärke och får nämnas (DESIGN.md:147–148). Skämtet ska drabba Stig och guardian, inte kyrkan (tonen i §1.2). Kyrkans insida behöver inte byggas, eftersom Stig är dold och kameran står ute på torget.
