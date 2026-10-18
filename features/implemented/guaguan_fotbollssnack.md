# 112. Guaguan – åk buss och snacka fotboll

**Implementerat.** En egen modul `src/game/guagua.js` (`game.guagua`) med konfigurationen `GUAGUA` i
src/content/island.js; DESIGN §10.53. Stadens 13 PARADA GUAGUA-hållplatser exporteras nu från
src/world/town.js (`busStops`, utan egna slumpdrag, så världen byggs som förut) och har fått namn
(Plaza, Casa Lola, Avenida del Mar, Playa, Playa del Este, Puerto, Sol de Invierno, Gasolina, Centro
Nórdico, Templo Ecuménico, Calle Norte, La Medina, El Faro) i en linjeordning. Mellan uppdragen, till fots
vid en hållplats, ger "E Vänta på guaguan" en klippning till trottoaren bakom Stig, som spanar uppåt
gatan. En grön guagua (BUS-specen, låst, `noEnter`, osårbar) startar 46–55 m bakom hållplatsen bakom
kameran och stannar efter cirka 5,5 s med dörren vid bänken (uppmätt inom 3 cm vid alla 13). Q slutar
vänta. Står en bil på hållplatsen blir det en toast och ingen buss, och om bussen fastnar bakom en bil
precis före hållplatsen öppnar den dörren där den står. Vid dörren säger chauffören "¡Buenas! Ska señor
med?", och "E Kliv på guaguan" sätter Stig på passagerarplatsen bredvid chauffören (`game.seat(…, −1)`,
aldrig `playerCar`) mot 10 pesetas ("Diez pesetas, señor."). Följekameran följer bussen, kortet visar
"Nästa hållplats: …", och W/S väljer hållplats. Efter 10–12 s, eller direkt med E, tonar bilden ut och
Stig står vid den valda hållplatsen med bussen bredvid sig: "¡Hasta luego, señor!" – "Tack så mycket!".
Bussen kör sedan iväg och tas bort utom synhåll. R gör ingenting ombord, och inga mynt plockas upp på
vägen. Första åkturen spelar filmens fotbollssnack som pratbubblor: Oles byst vid fönster 2 säger "Las
Palmas! Bra fotballag… Øverste divisjon!", Stig "Hammarby är också ett bra lag." och chauffören "Bajen…
Hammarby… Bajen…" (alla \[F*](t)). Står den riktiga Ole inom 70 m från hållplatsen eller turens första
140 m (från Casa Lola passerar bussen Hotel Flamenco) visas ingen byst, och då säger chauffören
Las Palmas-repliken på svenska. Snacket spelas tills en tur har hört det till slut (`records.guagua`,
sparas). Senare turer har fyra korta repliker från chauffören \[N] med svar från Stig.

Avvikelser från idén: hållplatsen väljs med W/S under åkturen (först nästa på linjen) i stället för i
en meny; chauffören pratar i bubblor och är ingen porträttalare; Ole åker bara med på filmturen;
systrarnas Sture-replik används inte; biljetten kostar 10 pesetas; `enterCar` är orörd, eftersom dörren
är en egen interaktion och bussen är `noEnter`. Ute i hörnen där varken rakt fram eller vänster finns
svänger bussen höger (det gäller bara Playa del Este), och där åker den 56 m i stället för 87–96 m.

Verifierat headless på port 8861 med nya `tools/scenarios/guagua.mjs`: `guagua` (hela filmturen från
Plaza med Oles byst, dörrens läge, biljetten, kameran, R, W/S, ankomsten med bussen, `records.guagua`, en
andra tur med E, ingen SKANDAL), `guaguaKant` (filmturen utan Ole från Casa Lola, Q, gå från dörren,
bil på hållplatsen, buss som fastnar bakom en skåpbil, ingen prompt i bil eller jakt, warp och
uppdragsstart mitt i turen) och `guaguaLinje` (alla 13 hållplatser: start utom synhåll, dörren vid
bänken, åkturen och ankomsten vid nästa). Alla gav `RESULT: PASS`, liksom `story`, `fullstory`, `lifta`,
`liftaFall`, `hytt` och `api`. Skärmbilderna är granskade.

**Betyg:** 4,3/10 · wow 2,7 · film 4 · Stig-Helmer 3,7 — *Hammarby-snacket på bussen är en minnesvärd replik, men att åka passagerare är tråkigt i en sandlåda och läget måste byggas från grunden.*

*Stig ställer sig vid en PARADA GUAGUA-skylt och trycker E. Den gröna guaguan rullar in, han kliver på och åker en bit, och under tiden går fotbollssnacket från filmens transferbuss: ”Bajen… Hammarby… Bajen…”.*

**Kategori:** Fordon · **Var:** de 13 PARADA GUAGUA-hållplatserna från town.js busStop(), till exempel vid stranden (10, 208), plazan (−90, 32), La Medina (−150, −112) och Centro Nórdico (112, −70) · **Insats:** M (i överkant) – motorn har inget passagerarläge, så det är det stora nya jobbet; resten är en kort rak åktur och en toning

![Den tomma hållplatsen vid stranden](../free_roam_bilder/guaguan-fotbollssnack-1.jpg)
*Bild 1 (nuläge): Hållplatsen vid stranden (10, 208) har skärm, bänk och en grön PARADA GUAGUA-skylt. Stig kan stå här hur länge som helst utan att någon buss stannar eller någon knapp dyker upp. Det finns tolv likadana hållplatser till runt om i stan, och ingen av dem gör något.*

![Guaguan vid hållplatsen med Ole i fönstret](../free_roam_bilder/guaguan-fotbollssnack-2.jpg)
*Bild 2 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): Spelets egen gröna guagua står vid trottoarkanten, och Ole sitter som byst vid fönstret. Ole: ”Las Palmas! Bra fotballag… Øverste divisjon!” Stig: ”Hammarby är också ett bra lag.” Knappen ”E Kliv på guaguan” är bara uppställd för bilden.*

![Chauffören säger Bajen](../free_roam_bilder/guaguan-fotbollssnack-3.jpg)
*Bild 3 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): Chauffören bakom ratten provar det nya ordet: ”Bajen… Hammarby… Bajen…”.*

**Idén.** Varje PARADA-skylt får knappen ”E Vänta på guaguan”. Då kommer en egen grön guagua körande längs samma gata, från en punkt man inte ser, och stannar med dörren mot trottoaren. Med ”E Kliv på guaguan” sätter sig Stig på passagerarplatsen, och kameran följer bussen i 10–15 sekunder medan snacket pågår. Sedan tonar bilden ut och Stig kliver av vid nästa hållplats, eller vid den man har valt. Första åkturen spelar fotbollsscenen, och senare turer får korta nya repliker från chauffören. Spelaren får en lugn snabbresa genom stan utan att kapa en enda bil, och dessutom en filmscen som spelet saknar i dag. Hållplatserna står redan där, så man hittar dem bara genom att röra sig i stan.

**Filmkopplingen.** I transferbussen fotbollssnackar Ole med chauffören: ”Las Palmas! … bra fotbollslag… Högsta divisionen!” / ”Hammarby är också ett bra lag.” / ”Bajen… Hammarby… Bajen…” (notes/research-plot.md:244). Anteckningarna anger inte vem som säger vilken replik. research-characters.md:596-597 placerar dessutom jämförelsen i ankomsthallen vid hittegodset, så exakt var i filmen den hörs är osäkert. design-A-film.md:767-769 har redan skrivit om repliken till bokmål åt Ole (”Las Palmas! Bra fotballag… Øverste divisjon!”), men den kom aldrig med i spelets buss17. Att chauffören säger ”Bajen” är vår tolkning, och alla tre replikerna taggas därför \[F*](t) som flyttade. Kopplingen till Stig är stark. Han är Hammarbyfan med märke (research-plot.md:61), och på planet frågar han redan ”Hammarby. Känner du till Hammarby?” (research-plot.md:200, i spelet flight.js:318). Hans väska kommer tillbaka tack vare märket: ”Hammarby…?” (research-plot.md:362). Vid poolen frågar Majsan dessutom ”Gillar du fotboll också?” (island.js:452). En möjlig extra poäng finns i systrarnas replik om Majsans exman Sture: ”Bara namnet – Sture! Kunde han prata om annat än fotboll och bruna bönor?” (research-characters.md:246, research-plot.md:117). Repliken används inte i spelet. research-characters listar den under Siv, så talaren är osäker. Om en av systrarna sitter med som byst och suckar den efter Stigs Hammarbysnack, knyter den an till hans ”Jag avskyr bruna bönor.” (island.js:592).

**Varför vi borde göra det.**
- ”Det är ju från filmen!” ”Bajen… Hammarby… Bajen…” är en av de repliker folk minns, och spelet har den inte i dag. Att en kanarisk busschaufför till slut säger ”Bajen” ger ett försynt men stolt Stig-ögonblick.
- Det känns precis som Stig. Han skulle aldrig kapa en bil, men han väntar snällt vid hållplatsen och försvarar sitt lag så fort han får chansen. Det blir free roams första sätt att ta sig runt utan SKANDAL.
- Formen finns redan: 13 hållplatser med skylt och bänk står och väntar på en funktion, och den gröna guagua-modellen med dekaler finns också (car.js:28, 283-287). Snabbresan är en Hit & Run-bekvämlighet, ungefär som telefonkiosken, och efter första fotbollsturen gör korta repliker från chauffören att man vill åka igen.

**Så kan det byggas.** Hållplatsernas positioner tas fram i town.js busStop()/streetFurniture (de 13 som byggs, town.js:694-721) och exporteras. Varje hållplats registreras med game.addInteractable (main.js:1217). När spelaren trycker E skapas en egen Car('guagua') uppströms på samma väg, utom synhåll och i det körfält som har hållplatsen till höger. Den sätts som namngiven bil och inte som trafik, och den kör en LanePath med endPoint vid hållplatsen (drivers.js:27). Sträckan blir rak, så bussarnas problem med högersvängar (drivers.js:9-14) uppstår aldrig. Påstigningen grenar av i enterCar (main.js:587-612) före kapningen: när bussen står still sätts spelaren på passagerarsidan med seat(player, bus, −1), bussen får ingen playerCar och följekameran följer den. Kameraprofilen från buss17 klarar redan en buss på 10,5 m. Ole sitter som byst med addRider('ole', bus, 'window2') (main.js:352), och chauffören blir en talare med bara porträtt, på samma sätt som telefonisten (DESIGN.md:220). Åkturen är ett kort ben medan replikerna går (g.say eller en vanlig dialog), och den avslutas med en toning och en teleport till vald hållplats. Replikerna läggs i src/content/island.js med taggarna \[F*](t). Det nya är passagerarläget och hållplatslogiken. Bussen, modellen, kameran, interaktionerna och toningen finns redan.

**Att tänka på.** Uppdragen och deras timers får inte påverkas. Bussen och hållplatsknapparna ska därför bara finnas när missions.state inte är running och ingen SKANDAL-jakt pågår (annars blir bussen en flyktväg). Den tas bort vid uppdragsstart och i cleanupMission, och recycleTraffic hoppar över den. En buss som rullar under uppdragen ändrar världen och aktörerna och kräver ny kalibrering enligt CLAUDE.md. Enligt DESIGN §1.5 får Hammarby, Bajen och Las Palmas bara förekomma inne i filmreplikerna: inga klubbmärken, halsdukar eller skyltar, och inga nya [N]-repliker om riktiga klubbar. Väskans klistermärken förblir grönvita utan text (pickups.js:261). Ole talar bokmål, chauffören svenska i undertextstil med enstaka spanska ord, och om något ska spelas i bussen blir det en syntetiserad original. Ole-NPC:n får inte flyttas eftersom han är uppdragsgivare mitt i spelet. Om han står inom synhåll ska bysten inte visas, och då säger chauffören Las Palmas-repliken själv. Trafikens guagua går fortfarande att kapa (+8 SKANDAL), så knapptexterna måste skilja tydligt mellan ”Kliv på” och ”Ta bilen”. Passagerarläget är nytt för motorn och står för det mesta av kostnaden. Om man vill låta bussen köra hela vägen i stället för att tona blir det L, och då behövs också en tidsgräns för en buss som fastnar.
