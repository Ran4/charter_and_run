# 80. Hytt två! – ring efter en bil

**Implementerat.** (2026-10-17) Mellan uppdragen, till fots: **E** vid hytt 2 i telefonpaviljongen på
Centro Nórdico ("E Ring efter bil") ställer Stig vid dörren, kameran klipper till en bild över hans axel,
telefonisten ropar "Hytt två!" i radiorutan och menyn HYTT TVÅ · VILKEN BIL? glider in till vänster:
Hyrbilen, SunTrips buss 17 och Grisbilen (bara när den är upplåst), 25 pta styck. W/S (pilarna,
styrkorset) väljer, Q (Backspace) lägger på utan att något händer och E ringer: signalen går fram två
gånger, Stig säger "Ja, hej. Hyrbilen, tack.", den namngivna bilen själv flyttas, hel och lagad, till
den första lediga av tre rutor på parkeringen bakom kameran, telefonisten säger "Señor, betala!", 25 pta
dras (Ole betalar om det inte räcker) och Stig säger "Tack så mycket!". Sedan har han klivit ett par
steg bort från hytten och vänt sig mot bilen, kameran står bakom honom och en ruta säger att bilen står
på parkeringen vid Centro Nórdico. Vid grisbilen säger han dessutom "Den luktar lite.".
- **Var:** `src/game/phoneBooth.js` (`PhoneBooth`, `game.hytt`), konfigurationen och replikerna i
  `HYTT_TVA` (`src/content/island.js`), rutorna `hyttBil1–3` i `src/world/landmarks-island.js`,
  valrutan `hud.menu` i `src/game/hud.js` och `#menu` i `style.css`, menytangenterna `menuUp`,
  `menuDown`, `hangUp` i `src/input.js`, och två rader i `src/main.js`. DESIGN §10.43 (plus §1.6, §3,
  §6.3, §10.2, §11.4, §14, §16.4, Appendix A och changeloggen), README och CLAUDE.md.
- **Hel och lagad:** en bucklig bil repareras (samma bil), en kvaddad (eller borttagen) kommer
  tillbaka genom `ensureNamedCar` som en enda ny bil med det namnet. En grisbil vars grisar redan är
  levererade kommer med tomt flak, så att leveransen inte kan betalas två gånger. Bilens `home` är
  orörd, så bärgningen och uppdragens `getInCar` med `atHome` (buss 17, grisfestens hyrbil) ställer
  tillbaka den som förut: ingen genväg i uppdragen.
- **Avvikelser från idén:** tre egna rutor i parkeringens körfält (11, 18.6), (11, 22.4) och (−11,
  18.6) i stället för en vid ungefär (87, −63), alla bakom kamerans öga och fria från lyktstolparna och
  Josés plats; en egen kamerabild över axeln i stället för `cutTo('telefon')`, vars öga 9 m bak står på
  parkeringen; Stig beställer högt, och "Tack så mycket! … Den luktar lite." är två repliker (tacket
  till telefonisten, lukten när han har vänt sig mot grisbilen); han kliver bakåt innan han vänder sig,
  annars hamnade kameran rakt ovanför honom mot paviljongväggen; en full parkering ("Ingen plats på
  parkeringen, señor!") kostar inget. Lapplisans lapp ger upp av sig själv när bilen flyttas, så
  `lapplisa.js` är orörd. "Hytt två! – Stig ringer hem" är inte byggd.
- **Verifierat headless (port 8861):** nytt scenario `hytt` (prompten, menyn och dess rader, W/S med
  omslag, att Stig står still, Q, ett samtal där bilen flyttas utanför kamerans bild och betalningen
  kommer efter, Ole som betalar, lagning, buss 17 på nästa ruta utan krock med väggar eller bilar, en
  kvaddad grisbil som kommer tillbaka ny, ett levererat flak som förblir tomt, full parkering, ingen
  prompt i bil, under jakt eller i uppdrag, och buss 17 tillbaka på flygplatsen när Lasses uppdrag
  börjar): `RESULT: PASS`. `story` och `fullstory` gav `RESULT: PASS`, liksom `ui`, `snackrutor`,
  `grisar` och `api`. Skärmbilderna (menyn, samtalet, bilen på parkeringen, grisbilen) är granskade.

**Betyg:** 5/10 · wow 3 · film 2,7 · Stig-Helmer 2,3 — *Hit & Runs telefonkiosk gör upplåsta bilar användbara och lagar den kvaddade grisbilen, men ”Hytt två!” räcker inte för en filmupplevelse.*

*Stig går fram till telefonpaviljongen i Centro Nórdico och väljer Hyrbilen, SunTrips buss 17 eller Grisbilen i en liten meny. När han vänder sig om står bilen och väntar på parkeringen.*

**Kategori:** Fordon · **Var:** Centro Nórdico i kvarter (4,2): telefonpaviljongen TELÉFONOS · HYTT 1·2·3 vid (80, −72) och parkeringen söder om den, där bilen ställs vid ungefär (87, −63) · **Insats:** M – det enda helt nya är en liten valmeny som styrs med tangenterna. Resten är en interaktionspunkt och att flytta och laga tre bilar som redan finns.

![Centro Nórdico med telefonpaviljongen och den tomma parkeringen](../free_roam_bilder/hytt-tva-ring-efter-bil-1.jpg)
*Bild 1 (nuläge): Centro Nórdico sett snett uppifrån från sydväst. Stig står vid hytterna under skylten TELÉFONOS · HYTT 1·2·3. José står på parkeringen, och rutorna till höger är tomma. Paviljongen är bara kuliss i dag. De namngivna bilarna står långt härifrån: Hyrbilen och Grisbilen vid Hotell Flamenco, ungefär 140 m bort, och buss 17 vid flygplatsen, ungefär 230 m bort.*

![Skiss: menyn ”Hytt två · vilken bil?” vid hytterna](../free_roam_bilder/hytt-tva-ring-efter-bil-2.jpg)
*Bild 2 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): Stig står vid hytterna. Menyn HYTT TVÅ · VILKEN BIL? visar bara de tre namngivna bilar som spelaren faktiskt får köra: Hyrbilen, SunTrips buss 17 och Grisbilen, 25 pta styck. Under raderna står ”Bilen väntar på parkeringen.” och tangenterna ”W/S välj · E ring · Q lägg på”. Uppe till höger ropar telefonisten ”Hytt två!” i porträttrutan. Menyn är en ruta som lagts ovanpå spelet för skissens skull.*

![Skiss: Grisbilen levererad på parkeringen, telefonisten kräver betalt](../free_roam_bilder/hytt-tva-ring-efter-bil-3.jpg)
*Bild 3 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): Grisbilen står på parkeringen framför paviljongen, och Stig får rutan ”Kliv in”. En ruta meddelar att Grisbilen står på parkeringen vid Centro Nórdico, telefonisten säger ”Señor, betala!” och plånboken har gått från 1 250 till 1 225 PTA. Stig säger artigt ”Tack så mycket! … Den luktar lite.” José står kvar på sin vanliga plats till vänster.*

**Idén.** När inget uppdrag pågår och Stig går till fots står det ”E Ring efter bil” vid hytt 2. Kameran klipper till hytterna, telefonisten ropar ”Hytt två!”, och menyn visar de namngivna bilar han får köra. Hyrbilen och SunTrips buss 17 finns från början på ön, och Grisbilen tillkommer när den har låsts upp efter Pepes Bodega. Stig står still medan menyn är öppen. W/S väljer bil, E ringer och Q lägger på. Medan kameran fortfarande är riktad mot hytten flyttas bilen till en ledig ruta på parkeringen, hel och lagad, så att ingen bil dyker upp ur tomma luften. Sedan säger telefonisten ”Señor, betala!” och 25 pta dras. Räcker inte plånboken betalar Ole som alltid (”Jeg spanderer!”). Belöningen är att bussen från flygplatsen och grisbilen från Flamenco kommer till stan när man vill ha dem. Dessutom kommer en kvaddad Grisbil tillbaka, som i dag är borta tills spelet laddas om.

**Filmkopplingen.** I 7.12, Angeruds panik, ringer Angerud från en telefonstation. Där sägs ”Hytt två” (på engelska i filmen), och efteråt kräver någon betalt: ”Señor, betala!” (notes/research-plot.md:322). Spelet har redan telefonisten som porträtt och använder ”Hytt två!” i Pepes Bodega-outrot (src/game/missions/island.js:387), men själva paviljongen går inte att använda. Anteckningarna säger inte vem som säger någon av replikerna, så telefonisten är spelets egen tolkning, och eftersom de här flyttas till ett bilsamtal märks de \[F*](t). Att hyra bil på semestern anknyter till Angeruds ”Jag hyr en bil. Följer ni med?” på flygplatsen i Las Palmas (research-plot.md:236), men bara som stämning. Spelets Hyrbilen är den vita sedanen vid Flamenco (src/world/blocks/hotels.js:310) och inte Angeruds bil, och att hans hyrbil gick sönder är en gissning i notes. Grisbilen går tillbaka på när Berra och Robban liftar och säger ”Fan, de luktar.” (research-plot.md:319). Där är det osäkert att det var en grisbil, och spelets upplåsningsruta säger redan ”Den luktar.” [N] (src/content/island.js:151). Stigs ”Tack så mycket! … Den luktar lite.” är nyskriven [N] och artig. Den är inget filmcitat.

**Varför vi borde göra det.**
- ”Det är ju från filmen!” ”Hytt två!” och ”Señor, betala!” hör hemma just vid en spansk telefonstation. ”Señor, betala!” används inte någonstans i spelet i dag.
- ”Typiskt Stig-Helmer!” Han beställer artigt en grisbil per telefon, betalar och tackar, och konstaterar sedan försiktigt att den luktar. Är plånboken tom ringer Ole in och betalar åt honom.
- Telefonkiosken där man väljer bil är ett av Hit & Runs mest använda free roam-system, och här finns byggnaden redan. Pesetas får en användning man återkommer till, och upplåsta bilar blir något man har nytta av. Idén lagar också ett verkligt glapp. En kvaddad namngiven bil tas i dag bort efter 20 s när man är mer än 60 m bort, och den kommer inte tillbaka (src/main.js:1873–1885).

**Så kan det byggas.** En `game.addInteractable` (src/main.js:1217) läggs vid hytt 2: landmärket `telefon` (src/world/landmarks-island.js:55), med dörrarna på paviljongens sydsida. `enabled` kräver ön, `missions.state === 'idle'`, att Stig går till fots, `!inDialog` och `!shame.pursuit`. `use` klipper med `g.cutTo({ at: 'telefon', … })` som i bodega-outrot och ropar med `g.radio('telefonist', 'Hytt två!')`. Telefonisten finns redan i RADIO_ONLY (main.js:36) och behöver ingen kropp. Menyn är det enda som är helt nytt. hud.js har ingen valruta, och en klickbar meny går inte, eftersom spelet pausas när muspekarlåset släpps (main.js:113). Därför byggs en liten ruta i hud.js som läses av i `handleOneShots` (main.js:1402), och gången fryses medan den är öppen. Raderna tas ur `NAMED_CARS` (src/content/island.js:162–164) och filtreras till de bilar som finns i `parkedCars` och inte är låsta: hyrbil, buss17 och grisbil när den är upplåst. `unlock()` lägger in grisbilen i `parkedCars` (main.js:1154), och upplåsningarna sparas redan, så inget nytt sparfält behövs. Själva bilen hämtas med `g.ensureNamedCar(name)` (main.js:412), som återskapar en kvaddad bil. Sedan ställs den med `car.place(x, z, yaw)` på en ledig ruta och får `hp` tillbaka till `spec.hp`. Det är alltid den namngivna bilen som flyttas, aldrig en ny med samma namn. Betalningen sker med `game.pay(25)` (main.js:968). Det nya utöver menyn är ett fåtal strängar i src/strings.js med källtaggar, en rad i DESIGN §10.2 (vad pesetas används till) och en i §1.6, och ett litet headless-scenario.

**Att tänka på.** Telefonen ska vara stängd i lägena running, intro, outro och failed, så att inget uppdrag, ingen timer och ingen kalibreringspool påverkas, och `story` ska ge RESULT: PASS efteråt. Grisbilen (maxSpeed 34 mot sedanens 31) kan redan i dag hämtas vid Flamenco efter Pepes Bodega, så telefonen ger ingen ny genväg i uppdragen. Guardia-jeepen ska inte stå i menyn. Att låsa upp den står på önskelistan P2 i DESIGN §15.5 (en upplåsbar Guardia-jeep med en egen SKANDAL-regel), och i Pepes Bodega kör man sönder den. Med jeepen blir insatsen L, och det kräver ett eget beslut. Nattbussen kör Gabbe i racet och Josés bil är en uppdragsbil, så ingen av dem hör hemma i menyn. Det finns ingen bilhandel, så att ”köpa” en bil vore ett eget tillägg. José står på parkeringen vid (80, −58), ungefär 9 m från rutan där bilen ställs. Rutan måste alltså kontrolleras att den är ledig, och buss 17 är 10,5 m lång. Idén ”Hytt två! – Stig ringer hem” använder samma hytt. Byggs båda blir det en meny med två val, Ring hem och Ring efter bil. ”Señor, betala!” delas då: här är det betalningen efter samtalet, där är det straffet för att smita. ”Hytt två!” finns redan i Pepes Bodega-outrot och blir lite mindre sällsynt. Menyn får inte innehålla några märkesnamn (DESIGN §1.5).
