# 134. Helan går från balkongen

**Betyg:** 3,3/10 · wow 3 · film 2,7 · Stig-Helmer 3,3 — *Att leta efter en fest på gehör är ett nytt grepp, men ”Helan går” är en fotnot, det kräver natten och belöningen är liten.*

*På kvällen hörs ”Helan går” mellan lägenhetshusen. Spelaren följer sången med öronen till en balkong där Affe spelar dragspel och Gabbe congas under en ljusslinga, och Stig står nedanför och vågar inte riktigt gå upp.*

**Kategori:** Sidoaktivitet · **Var:** lägenhetskvarteren, en ny balkong varje kväll (skissen: lägenhetshuset i kvarter (4,4), x ≈ 80, z ≈ 55, andra våningen, sett från gatan norr om huset) · **Insats:** M – om [Dygnet runt](dygnet_runt.md) (nr 30, kväll i free roam) och en balkonglista byggs först, annars L

![Lägenhetshuset i (4,4) en vanlig dag i free roam](free_roam_bilder/helan-gar-festen-1.jpg)
*Bild 1 (nuläge): Lägenhetshuset i kvarter (4,4), sett från gatan norr om det, som free roam ser ut i dag: alltid dag, tomma balkonger och inget ljud från husen. Festen i skissen står på balkongen med den gula handduken, ovanför den gröna markisen.*

![Balkongfest med Affe och Gabbe, Stig nedanför](free_roam_bilder/helan-gar-festen-2.jpg)
*Bild 2 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): Samma hus på kvällen. Himlen är tvingad till natt, för free roam har ingen kväll i dag. På andra våningen hänger en ljusslinga. Affe står med dragspel och solglasögon, Gabbes congas syns bredvid, en gäst skålar (”Skål, grannen! Kom upp!”) och en annan jublar. Nedanför står Stig: ”Det känns fånigt att gå upp…”.*

**Idén.** När det är kväll i free roam (och inget uppdrag pågår) ligger en fest på en slumpad balkong i lägenhetskvarteren. Man hittar den bara på örat: ”Helan går” på dragspel och umpa blir starkare ju närmare man kommer och panoreras åt det håll festen ligger. Står Stig under balkongen ropar gästerna ner till honom, han svarar blygt, och en gäst kastar ner en servett med några pesetas (”Här, grannen – till en sangria!”). Nästa kväll är festen på en annan balkong i ett annat kvarter, så det blir ett litet letande varje kväll. Om musiken är avstängd i pausmenyn syns ljusslingan på långt håll, och en prick på minikartan tar över som ledtråd.

**Filmkopplingen.** Kvällen efter att systrarna skrattat åt hans namn (”Stig Helmer.” / ”Jag dör!”) står det i notes/research-plot.md:276: ”Den kvällen hörs ’Helan går’ på avstånd”. Var sången kommer ifrån visas aldrig, så **festen är påhittad [N]**. Musikerna hör däremot hemma i filmen. Affe spelar dragspel och Gabbe congas när reseledarna uppträder (research-plot.md:260), och Affe (talaren är tolkad) suckar ”Va fan, jag hade ju natturen i natt!” … ”Jag har haft två grisfester i veckan.” (research-plot.md:231). Stigs repliker under balkongen ekar grisfesten, där Ole frågar ”Ska inte du dansa?” och Stig svarar ”Nej, det känns fånigt att bjuda upp.” och ”Jag är skraj att de ska nobba.” (research-plot.md:346).

**Varför vi borde göra det.**
- ”Wow, vad kul!”: att leta med öronen är helt nytt i spelet. Ingen pil och ingen markör, bara en sång som växer mellan husen tills man står under rätt balkong.
- ”Det är ju från filmen!”: sången från filmens kväll får en källa, med Affe på dragspel och Gabbe på congas som de reseledare de är i filmen. Affe kan sucka sin egen filmreplik mellan verserna (”Jag har haft två grisfester i veckan.” [F]).
- ”Typiskt Stig-Helmer”: han blir inbjuden varje kväll och vågar aldrig gå upp, med i stort sett samma ord som när han inte vågar bjuda upp på grisfesten. Den blygheten känner man igen direkt.
- Det passar Hit & Run-formen: en återkommande sak att hitta i free roam med en liten belöning och ny plats varje kväll. Melodin finns redan syntetiserad (bara en gång i dag, svagt, i buss17-uppdragets outro, island.js:184), och Affe och Gabbe har redan sina instrument (models.js:84, 86).

**Så kan det byggas.**
- **Ljud:** en egen ”feströst” i audio.js som spelar helanGar-tonerna ur TRAD-tabellen (audio.js:767–781) i slinga genom en egen GainNode och en StereoPannerNode, med volym efter avstånd och panorering efter kamerans yaw. Använd inte `audio.trad()`. Den spelar bara en gång, sänker hela musikbussen (tradDuck 0,3), nollställer `audio._tradT`, som uppdragens trad-signaler också använder, och returnerar 0 när musiken är av (audio.js:348–366). Sol- och sambalåten tonas ner bara nära festen, eftersom de krockar i tonart och tempo.
- **Figurer:** egna Character-instanser byggda från `CHARS.affe` och `CHARS.gabbe` plus två poolade extrafigurer, inte `g.npc('affe')`, så att `placeNpcs(true)` och uppdragen aldrig rör dem (de riktiga NPC:erna göms medan festen pågår). De står utan fysik. Balkonggolven är bara grafik (town.js:397–427), och en golvsolid skulle bli en vägg över trottoaren. Det behövs en liten stående variant av `seatAt` (character.js:58, som ger sittande pose). Gästerna får `cupHeld` + `cheer` (models.js:1022; `cupUp` är en tom hand).
- **Balkonglista:** balkongernas positioner exporteras inte i dag (`balconies()` i hotels.js:191 är en byggfunktion och `slabLot` ritar dem som grafik). Listan behöver exporteras och kan delas med [Balkongerna lever](balkonglivet.md) (nr 77).
- **Ljusslinga:** ett litet obelyst nät per fest (MAT.mouth, som town.js:984) som flyttar med festen, inte det statiska `nightGlow`-nätet (town.js:57, 981–985).
- **Belöning och repliker:** `game.addCoins(n)` (main.js:966) med en fallande servett. Repliker via `g.say` inom cirka 12 m: textraden som trad [N], ”Skål, grannen! Kom upp!” [N], Stigs ”Det känns fånigt att gå upp…” / ”Jag är skraj att de ska…” [F*].
- **Villkor och dokumentation:** visas bara när runnern är `idle` och det är kväll, och allt göms vid uppdragsstart. Festen läggs in i DESIGN §1.6:s lista över påhittat och i README:n.

**Att tänka på.**
- **Beroende:** free roam är alltid dag i dag (ön har paletten `day`, level.js:79, main.js). Natt finns bara inne i grisfestuppdraget, som återställer till dag (island.js:531, 571). Utan ”Dygnet runt” blir idén L, eller en dagversion (”siestafest”) som tappar filmens ”den kvällen”. Risken för uppdragen ligger i kvällen själv: ett uppdrag som startar på kvällen måste sätta dagshimmel. Själva festen rör inga uppdrag eller timers.
- **DESIGN §1.5:** högst en sjungen textrad, bara trad-melodin och ingen av filmens låtar (inte välkomstsången). Ingen julklapp kastas ner, eftersom julklappen är filmens och uppdragens föremål (island.js:240, 269, 613, 647). Därför blir det en servett med pesetas.
- **Överlapp:** Idén [Ljudlandskap per kvarter](ljudlandskap_per_kvarter.md) (nr 131) föreslår redan ett avlägset ”Helan går”, så de bör dela ljudröst. ”Systrarnas balkong” ligger nära, och en kväll på systrarnas balkong kunde ge deras ”Stig Helmer.” / ”Jag dör!”, men bara med Siv och Majsan själva där, aldrig i främlingars mun.
- **Läsbarhet:** figurerna är små sedda från gatan (se skissen), så ljusslingan och ljudet får göra jobbet. Stig ska höra festen innan han ser den.
