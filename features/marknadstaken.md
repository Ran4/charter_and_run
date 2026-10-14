# 92. Pesetas på marknadstaken

**Betyg:** 4,7/10 · wow 3 · film 2,3 · Stig-Helmer 2,3 — *Ett nästan gratis myntspår över markiserna med en bra svordom, men ingen filmreferens, och studsmarkisen är ny kollision som kräver story-körning.*

*Stig-Helmer studsar upp på marknadens markiser, springer längs ett spår av pesetas från stånd till stånd och plockar till sist de sista mynten från souvenirförsäljarens eget tak. Då svär försäljaren.*

**Kategori:** Lek och fysik · **Var:** Marknaden (kvarter 2,1): raderna A och A2 (z −185 och −177, x −105…−55) och åsneståndet vid (−74, −162) · **Insats:** S – kollisionen finns redan; det nya är mynt, en kopia av ¡SALTA!-markisen och två utlösta repliker

![Stig står på FRUTAS-ståndets markis](free_roam_bilder/marknadstaken-1.jpg)
*Bild 1 (nuläge): Stig står på FRUTAS-ståndets markis i rad A. Ståndens tak är redan golv i kollisionen (2,55 m), så det här går att göra i dag. Men det finns inga mynt där uppe, ingen synlig väg upp och ingen som reagerar.*

![Stig studsar upp från en ny studsmarkis mellan raderna](free_roam_bilder/marknadstaken-2.jpg)
*Bild 2 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): en ny låg studsmarkis (röd och vit) i grusgången mellan rad A och A2, vid västra radänden. Stig studsar rakt upp med armarna i luften. Till höger går myntspåret längs rad A2:s markiser och bågar över mittgången längre bort. ¡SALTA!-skylten sitter på markisens södra sida och syns inte från den här vinkeln.*

![Stig på åsneståndets tak, försäljaren svär nedanför](free_roam_bilder/marknadstaken-3.jpg)
*Bild 3 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): Stig står på åsneståndets tak (2,9 m), och det sista myntet glänser framför SOUVENIRS · RECUERDOS-skylten. Försäljaren står på sin vanliga plats framför ståndet (spelets riktiga modell, med solhatt och mustasch). Han säger ”Jävla smålänningar!”, och Stig svarar ”Förlåt, förlåt…”.*

**Idén.** Markiserna går att stå på, men i dag leder bara kalkylatorrutten upp dit. Vi lägger ett myntspår längs raderna A och A2, med en båge över den 8 m breda mittgången. En ny låg studsmarkis med skylten ¡SALTA! i grusgången mellan raderna visar var man kommer upp. Spåret slutar på åsneståndets tak, som ligger lite högre (2,9 m), och där ligger de sista mynten. Landar Stig på försäljarens tak innan uppdrag 8 är klarat ropar mannen ”¡No, no, no!”. Efter uppdrag 8 svär han ”Jävla smålänningar!” när Stig tar den sista peseten där uppe, och Stig ber förläget om ursäkt. Spelaren får pengarna, en ny väg tvärs över marknaden och svordomen som slutpoäng.

**Filmkopplingen.** Det här är prutningen om åsnan på marknaden. Försäljaren ropar ”Hallå där!” (notes/research-plot.md:302; enligt anteckningen ropar han på engelska, så den svenska formen är anteckningarnas). Ole prutar sedan ner åsnan från 500 till 200 pesetas, och försäljaren svär på svenska: ”Jävla smålänningar!” (notes/research-plot.md:304, även notes/research-characters.md:503 och :679). Anteckningen förklarar själv poängen: ”Ole prutar alltså som en smålänning.” Svordomen handlar om snålhet. Därför ska den komma när Stig skrapar ihop lösa pesetas från mannens tak och inte vid varje landning. Det var Ole som prutade, men det är Stig som får svordomen. I spelet hörs repliken i dag bara när Ole vinner prutningen i uppdrag 8 (src/game/missions/island.js:265). Försäljarens prat i free roam är ”Hallå där!” och ”Titta, den är jättelustig.” (src/content/island.js:71). ”Förlåt, förlåt…” är vår egen replik ([N]) och inget filmcitat.

**Varför vi borde göra det.**
- ”Det är ju han med åsnan!” Filmens mest citerade svordom kommer tillbaka i ett nytt, oskyldigt sammanhang, och den sitter rätt: Stig som plockar småpengar från en försäljares tak är precis den snåla smålänning som filmen skämtar om.
- Det är typiskt Stig-Helmer. Han hamnar där uppe nästan av en slump, stoppar på sig pengarna och ber sedan förläget om ursäkt till en man som han inte ens har prutat med.
- Det är ren Hit & Run. Myntspår på tak och en studsplatta som visar vägen är seriens klassiska sätt att belöna den som letar. Taken bär redan och ¡SALTA!-markisen finns som mall, så marknaden får en helt ny våning nästan gratis.

**Så kan det byggas.**
- **Mynt.** `placeCoin` finns i src/actors/pickups.js:47, och poolen räcker (MAXC 500, pickups.js:15). Hjälpkoden för mynt som läggs vid bygget (`coinAt`/`pendingCoins`) är privat i src/world/blocks/coast.js:56–66. Kopiera den till centre.js eller flytta den till en delad hjälpfunktion. Lägg mynten ungefär 2 m ovanför markiserna (y ≈ 4,5) och inte på kustens takhöjd + 0,75 (= 3,3). Myntmagneten drar till sig mynt inom ungefär 3,4 m i sidled och 3,5 m i höjd (pickups.js:87–98). På 3,3 m skulle man alltså dammsuga spåret nerifrån gången och genom glipan mellan stånden. Står Stig på taket tar han mynten ändå, eftersom höjdskillnaden då är omkring 1,2 m och gränsen för att plocka är 2,2 m.
- **Studsmarkisen.** Kopiera ¡SALTA!-blocket i src/world/blocks/centre.js:1086–1098. Det är en `f.solid(…, 'bounce')`, som src/actors/character.js:148 redan studsar på. Den ska stå i grusgången mellan rad A och A2 (lokalt z −23,5…−18,5) vid en radände, och inte på den stenlagda mittgången (lokalt x −4…4, centre.js:1063) eller på den öst-västliga gången (centre.js:1065). Skylten ska vara på spanska eller svenska, med versaler i Luckiest Guy.
- **Svordomen.** Märk mynten på åsneståndets tak (till exempel med en tagg på myntet). I `collectCoin` (src/main.js:960) läggs ett villkor: när det sista märkta myntet tas, Stig står högre än 2 m och uppdrag 8 (asnan) är klarat, körs `g.say('souvenir', 'Jävla smålänningar!' /* [F*] */)`, följt av Stigs ”Förlåt, förlåt…” (`/* [N] */`).
- **Före uppdrag 8.** Låt `onLand` (src/main.js:942, som anropas när vy < −6, character.js:144) få med blocket han landar på (`gb`). Reagera bara på åsneståndets tak (topp 2,9, centre.js:1102) och bara inom ungefär 12 m från försäljaren, med ungefär 8 s nedkylning och en gång per takbesök. Repliken är ”¡No, no, no!” (`[N]`, samma som i prutningen) eller ”Hallå där!” (`[F*]`). Båda replikerna spärras som pratet i main.js:1662: bara på ön, bara när `ms.state === 'idle'`, bara när försäljaren är `normal` och inte poserar, och aldrig under en dialog.
- **Inget sviktande tyg.** Varorna och markiserna är statisk geometri som slås ihop per kvarter (centre.js:396–410). Att animera dem skulle kräva egna nät per stånd och göra idén till M. Landningen får det damm och den squash som redan finns.

**Att tänka på.**
- Uppdrag 8:s prutning sker vid åsneståndet. Spärren mot `ms.state` håller de nya replikerna borta därifrån, och prutningen har ingen timer. Uppdragets enda timer är målarkörningen från supermercado (src/game/missions/island.js:281–283), och promenaden från 'marknad' till 'asnestand' går på den stenlagda mittgången.
- Studsmarkisen är ny kollision i världen. Den står i en gång som ingen rutt använder, men enligt CLAUDE.md startar en ändring av världen en ny pool för slumpetappernas timers. Bedöm om någon pool berörs, och kör `story` och asnan-uppdraget innan funktionen räknas som klar.
- Svordomen är mild och redan godkänd (notes/design-A-film.md:41), men i free roam ska den bara komma efter uppdrag 8. Innan dess har den inget att knyta an till.
- Hoppet upp på åsneståndets tak är inte provat. Taket ligger 0,35 m högre än de andra och ungefär 6 m snett från närmaste stånd i raden vid z −168. Blir det för långt räcker en låda eller en andra studsmarkis. Över mittgången (8 m) har Stig redan tagit sig med dubbelhopp i sprint.
