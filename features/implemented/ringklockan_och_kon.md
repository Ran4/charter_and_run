# 59. Ringklockan i receptionen – ”Och när ska vi lämna rummen?”

**Implementerat.** Byggt 2026-10-17 som `src/game/receptionBell.js` (`ReceptionBell`, `game.bell`) med
konfigurationen `RINGKLOCKA` i `src/content/island.js`, beskrivet i DESIGN §10.37. Bara på ön när
inget uppdrag pågår (`missions.state === 'idle'`). Tre avresande gäster (seedade turister, inga
lokalbor) står i kö längs disken väster om portiern, var och en med en resväska vid höger hand som är
solid bara medan kön finns. Kön kommer och går när ingen ser den, kliver undan för Bärra hem Berras
scen vid disken och går tillbaka till sin plats efter en knuff eller en spark. När Stig är nära frågar
någon då och då ”Och när ska vi lämna rummen?” [F*](t) och portiern svarar ”Momento.” [F*]. ”E Plinga
på klockan”: pling (`audio.pling`), ”\*pling\*” över klockan, Stigs hand på den (ny anim-flagga `tap`)
och ”Momento.” varje gång. Vid tionde plinget i rad vänder portiern ryggen till och ringer på
disktelefonen (nytt `audio.phone`), Lasse svarar i radiorutan ”Klockan 12. Ställ väskorna utanför
receptionen.” [F*], första gästen frågar igen medan radiorutan syns, Stig mumlar ”Förlåt…” [N] och
klockan åker under disken. När Stig har varit 20 m bort utan att se disken står klockan där igen med
den handskrivna lappen PLINGA EN GÅNG · TOQUE UNA VEZ [N] för resten av sessionen. Ett uppdrag eller
andra nivån tar bort kön, lappen och väskornas kollision och ställer klockan på disken, så inga
uppdrag, timrar, fixturen eller kalibreringspooler påverkas. Inget sparas.

Avvikelser från idén: klockan är nu modulens egen mesh (den statiska i `hotels.js` är borttagen) och
står 0,3 m längre västerut (x 3,0), eftersom G17-brödrosten `brodrost_portier` står precis öster om den
med samma prioritet; annars tog klockan brödrostens E framifrån. Klockan håller dessutom E under sin
korta vila och under samtalet, så att ett snabbt andra tryck aldrig startar brödrosten. Kön står längs
disken (som i skissen) och inte framför portiern, där uppdragens och Berras repliker ställer folk.
Portiern ringer med ryggen vänd och en signal, utan telefonmodell. Gästerna tittar på Stig från fjärde
plinget. Portierns egna pratbubblor tystnar medan kön finns, så hans ”Momento.” alltid svarar någon. Kön
och portiern tiger under en dialog eller ett samtal med gänget. Lappen sparas inte och syns inte under
uppdrag, och kön finns där dygnet runt.

Verifierat headless (port 8861): nytt scenario `tools/scenarios/ringklocka.mjs` med `ringklocka`
(kön, väskornas kollision, prompten, brödrosten bredvid, plingen, tionde plingets samtal i rätt
ordning, lappen, kön som frågar, sparken, uppdragsstart, flygnivån) och `ringshots` (bilderna), båda
`RESULT: PASS`. Dessutom `story` (`done -> #13 idle`) och `fullstory` PASS, samt `berra`, `brodrost`,
`rostar`, `gags`, `gagshots`, `prata`, `skandal`, `perf`, `api` och `views` PASS.

**Betyg:** 5,3/10 · wow 3 · film 3,7 · Stig-Helmer 3,7 — *En receptionsklocka ingen kan låta bli plus ett oanvänt löpande filmskämt är billigt, men skämtet minns bara de inbitna och klockan står nära mutan.*

*Vid portierns disk på Hotel Flamenco står avresande gäster med resväskor i kö och frågar gång på gång när rummen ska lämnas, och Stig kan plinga på klockan på disken. Portiern svarar ”Momento.” varje gång, tills det tionde plinget äntligen ger ett svar, fast på någon annans fråga.*

**Kategori:** Liv och stämning · **Var:** receptionen på Hotel Flamenco i kvarter (3,3): portiern står vid flamencoRecepcion (2, −10), klockan ligger på disken vid x 3,3, z −10,95 · **Insats:** M (en liten M) – klockan själv är S, men kön med tre gäster, deras egna pratbubblor och spärrarna mot uppdragen gör det lite större

![Portiern vid disken med ringklockan](../free_roam_bilder/ringklockan-och-kon-1.jpg)
*Bild 1 (nuläge): portiern står framför disken i Hotel Flamencos reception, med nyckeltavlan och skylten RECEPCIÓN bakom sig. Titta på den gyllene ringklockan mitt på disken. I dag är den bara en dekoration som inte går att plinga på, och ingen står i kö.*

![Skiss: det tionde plinget, kön och Lasse i radion](../free_roam_bilder/ringklockan-och-kon-2.jpg)
*Bild 2 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): tre avresande gäster med bruna resväskor står i kö längs disken. Stig står vid klockan och har just plingat (”\*pling\*”), och portiern svarar ”Momento.”. I radiorutan uppe till höger svarar Lasse ”Klockan 12. Ställ väskorna utanför receptionen.”, och en av gästerna i kön frågar ändå ”Och när ska vi lämna rummen?”. Skissen visar allt på en gång. Skylten 10:E PLINGET överst finns bara i skissen, för i spelet ska ingen räknare synas.*

**Idén.** I free roam står två eller tre avresande gäster i kö vid disken med sina resväskor. Det är inte Stigs sällskap utan förra veckans gäster, som ska hem. När Stig kommer närmare än några meter frågar någon i kön då och då ”Och när ska vi lämna rummen?”, och portiern svarar bara ”Momento.”. Vid klockan dyker uppmaningen ”Plinga på klockan” (E) upp. Varje pling ger ett ljust ”pling” och ett nytt ”Momento.”, men ingenting händer. Vid det tionde plinget ringer portiern till slut efter platschefen, och Lasse svarar i radiorutan: ”Klockan 12. Ställ väskorna utanför receptionen.” Direkt efteråt frågar nästa gäst i kön, precis som i filmen: ”Och när ska vi lämna rummen?”. Stig mumlar ”Förlåt…” och portiern lägger klockan under disken. Nästa gång Stig kommer tillbaka står klockan där igen, med en liten handskriven skylt bredvid: PLINGA EN GÅNG · TOQUE UNA VEZ. Belöningen är skämtet, och skylten som hotellet har satt upp för Stigs skull.

**Filmkopplingen.** Medan planet flyger söderut klipper filmen till hotellet. Avresande gäster frågar gång på gång när rummen ska lämnas, Lasse svarar ”Klockan 12. Ställ väskorna utanför receptionen”, och direkt därefter frågar någon igen (notes/research-plot.md:229). Själva frågan står ordagrant som ”Och när ska vi lämna rummen?”. Den kommer precis efter Lasses utskällning av personalen och deras ”Ja, pappa.” (research-plot.md:231). Det är alltså Lasse, inte portiern, som svarar i filmen, och så ska det vara här också. En annan källa formulerar platschefens svar annorlunda (”Rummen lämnas klockan 12 och väskorna lämnas i receptionen.”, research-setting.md:286), men vi håller oss till ordalydelsen på rad 229. ”Momento.” är portierns replik i havsutsiktsscenen (research-plot.md:253 och :442). Spelet använder den redan, både i portierns pratbubblor (src/content/island.js:68) och i rum 107-scenen (src/game/missions/island.js:180). Mellanklippet i receptionen har spelet däremot inte använt alls, för ”lämna rummen” finns ingenstans i koden. Alla tre filmrepliker blir här [F*], eftersom de flyttas till free roam. Själva klockskämtet, ”Förlåt…” och skylten är våra egna [N].

**Varför vi borde göra det.**
- ”Det är ju från filmen!” Den eviga frågan om när rummen ska lämnas är ett av filmens små löpande skämt, och nu hörs den i hotellets reception, som spelaren passerar hela tiden. Att den kommer igen direkt efter svaret är själva poängen, precis som i filmen.
- ”Typiskt Stig-Helmer!” Han vågar inte klaga, så han plingar försiktigt och sedan lite till. När han till slut får ett svar gäller det någon annans fråga, och han ber om ursäkt för att han störde. Att hotellet sedan sätter upp en skylt för hans skull är lagom förödmjukande.
- ”Wow, vad kul!” En ringklocka på en disk är omöjlig att låta bli, och att man ska plinga tio gånger för att något ska hända är precis den sortens hemliga knapptryckning som free roam i Hit & Run är full av. Det är billigt för vad det ger: disken, klockan, portiern, hans replik, plingljudet och radiorutan finns redan. Det nya är kön, tre repliker, en räknare och en skylt.

**Så kan det byggas.** En liten ny modul, till exempel src/world/islandLife.js, byggs bredvid buildCabin (src/main.js:120). Klockan blir en `addInteractable` (main.js:1217) vid x 3,3, z −10,95 med r 1,2. Den är bara aktiv när nivån är ön, `missions.state` är `'idle'`, ingen dialog pågår, Stig går till fots, portiern varken är gömd eller upptagen och ingen SKANDAL-jakt pågår. Ljudet är `audio.pling()` (src/audio.js:277), samma ding som anropsknappen i planet. Portiern svarar med `g.say` (main.js:983), och Lasse talar via `g.radio('lasse', …)` (main.js:1003), samma radioruta som uppdragen redan använder för repliker utanför bild (missions/island.js:156, 212). Kön byggs av två eller tre `Character` från `randomPed` (utan lokalbor), på samma sätt som folket vid gaten (src/world/cabin.js:709), och får rekvisitan `resvaska` (src/world/props.js:284), gärna med en `bagagevagn` (props.js:196). Kön behöver en egen bubbeltimer, eftersom pratloopen i main.js:1663–1666 bara går igenom `this.npcs`. Skylten görs med `signMesh` i versaler (DESIGN §1.3: spanska eller svenska skyltar). Räknaren behöver inte sparas. Taggar: ”Och när ska vi lämna rummen?” \[F*](t), ”Klockan 12. Ställ väskorna utanför receptionen.” [F*], ”Momento.” [F*], ”Förlåt…” och skylten [N].

**Att tänka på.** Receptionen är en uppdragsplats. I Grisfesten slutar stadiet där Stig bär hem Berra vid flamencoRecepcion med radien 2,2 (missions/island.js:567), och uppdragets avslutning ställer Angerud, Carmencita och Stig vid disken (:575). Avslutningen på SunTrips buss nummer 17, med överbokningen och rum 107, använder också receptionen (:172–181). Kön ska därför vara gömd och sakna kollision, och klockan vara avstängd, så fort `missions.state` inte är `'idle'`. Då får varken uppdragen, timrarna eller kalibreringspoolerna någon ny aktör. Kör `story` och `islandtour` efteråt och kräv RESULT: PASS. Portiersmutan under jakten ligger bara cirka 1,6 m från klockan och använder också E (DESIGN §7.2, src/game/shame.js:276–283). Den har prioritet 100 och vinner, men klockan ska ändå vara avstängd under jakt så att E aldrig plingar när Stig behöver gömma sig. Portiern får bara säga ”Momento.” och aldrig Lasses replik (HANDOFF §5 punkt 5). Gästerna i kön får inte vara Stigs egna medresenärer, för i filmen är det andra gäster som frågar. Spegeln används inte här, eftersom den redan hör till rum 107-scenen och till idén om havsutsikt i spegeln. Plingljudet är en egen syntton, så DESIGN §1.5 påverkas inte. Ole står några meter bort som uppdragsgivare, och hans pratuppmaning gäller bara inom 3,4 m (main.js:1256), så de två krockar inte.
