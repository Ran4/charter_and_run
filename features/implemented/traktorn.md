# 121. Traktorn med släpkärran

**Implementerat.** (2026-10-18, DESIGN §10.54) Bondens lilla röda traktor med ett fast släp fullt av
tomatlådor står på fältvägen framför redskapsboden i kvarter (1,0), vid (−159,8, −256) med nosen söderut.
Den är en namngiven parkerad bil av en ny leksakstyp, `traktor` (car.js: egen modell med stora
klackade bakhjul på gula fälgar, avgasrör framför föraren, högt sittande pannsäte och ett släp på
dragstång; nya spec-fält `wheels`, `seat`/`car.seatAt`, `open`, `height`, `wb`, `diesel`). Mellan
uppdragen ger **E** "Låna traktorn" och Stig säger "Jag lånar den bara en liten stund!". Traktorn går
i 18 km/h med ett dovt dieselputter och puffar rök ur röret. Knappt en sekund senare kommer bonden (en
egen figur i halmhatt, inte grisbonden) ut genom bodens dörr och springer efter med "¡Mi tractor!
¡Señor!" och tre rop till. Han kommer aldrig närmare än 3,2 m bakom släpet, och Stig svarar artigt två
gånger. Efter 20 s (eller 50 m från dörren, 26 m efter, eller om han blir påkörd) ger han upp med
knytnäven i luften och "¡Ay… suecos!" och går in igen. Kliver Stig av nära honom kommer han fram: "¡Mi
tractor! ¡Por fin!", och Stig svarar "Tack för lånet!". Varje tomatrad som en axel kör över ger ett
skumpande ryck med löv som yr (raderna listas i `TOMATO_ROWS` i nature.js), och efter fyra ryck på tre
sekunder säger Stig "Jag har lite anlag för åksjuka." [F*](t) eller en av två [N]-repliker. En hård
smäll kastar tomater av släpet. Trafik som hålls upp bakom traktorn tutar, och Stig svarar "Förlåt! Den
går inte fortare.". En traktor som lämnats någonstans, eller kvaddats, har bonden hämtat hem när ingen
ser. Under ett uppdrag finns ingen prompt, och E ger "Traktorn går bara i 18 km/h – ta en riktig bil.";
vid uppdragsstart går den hem. Koden ligger i `src/game/traktor.js` (`game.traktor`), konfigurationen
`TRAKTORN` i content/island.js, och krokarna i main.js, golfCart.js och audio.js.

*Avvikelser:* Traktorn står vid (0,2, −16) lokalt i stället för (3,5, −20). Där körde den rakt in i
tomatlådan vid (2,6, −8), som en traktor inte orkar slå sönder (lådan kräver 5 m/s, mer än traktorns
toppfart). Släpet är fast. Inga lådor trillar av, bara tomatskräp vid en smäll. Bonden kör aldrig
själv: en kvarlämnad traktor hämtas hem osedd. Tutkön kräver `queueUp` i traktor.js, eftersom
drivers.js egen tuta aldrig gick igång bakom traktorn (bilen glider in och ut ur sin framförhållning i
samma fart). Berra och Robban åker inte med på släpet. Traktorn är en leksak som aldrig blir ett
uppdrags bil (den bindande free-roam-regeln, som golfbilarna), så den kan inte väljas till den tidsatta
vischan-körningen. Den har ändå passagerarsäte (en uppochnervänd låda på släpet) och flak. Ingen
`calibrate`-körning gjordes för jeepen: världen där jeepjakten spelas är oförändrad, och ledgern
noterar det (notes/calibration-samples.md, "Feature 121"). Ingen timer ändrades.

*Verifierat* headless: det nya scenariot `traktor` (repliker och källtaggar, plats, prompt, säte,
bondens ut-gång och jakt med minsta avstånd, 18 km/h, raderna och åksjukan, spillet, stillastående,
återlämningen, hämtningen, uppgivandet efter 20 s, tutkön på vägen, uppdragslåset, vraket) och
`traktorshots` (bilder tittade på), samt `story`, `fullstory`, `golfbil`, `cars`, `castsheet`, `lifta`,
`guagua` och `kinds`, alla `RESULT: PASS`.

**Betyg:** 4/10 · wow 3,3 · film 1,7 · Stig-Helmer 3,3 — *En traktor med en tutande kö och en bonde som springer efter är billig fordonskomik, men filmkopplingen är en flyttad replik och bilspecen ny.*

*Vid redskapsboden på tomatfälten står en liten röd traktor med tomatlådor på släpet. Stig lånar den och tuffar i väg i 18 km/h, medan bonden springer efter och ropar.*

**Kategori:** Fordon · **Var:** tomatfälten, kvarter (1,0), parkerad bredvid redskapsboden vid ungefär (−156,5, −260) · **Insats:** M – en ny bilspec med egen modell och ett fast släp, plus en ny liten bondefigur som springer efter. Släpet med gångjärn är en L för sig och hör inte till första versionen.

![Tomatfälten i kvarter (1,0) ovanifrån, utan fordon](../free_roam_bilder/traktorn-1.jpg)
*Bild 1 (nuläge): Kvarter (1,0) sett från söder. Fältvägen går rakt upp till redskapsboden med tegeltak, och vattentanken står bredvid palmen. Lådorna och raderna finns där, men det finns inte ett fordon och inte en människa på fälten. Det enda som rör sig är trafiken på vägarna runtom.*

![Skiss: Stig på en röd traktor med lådor på släpet](../free_roam_bilder/traktorn-2.jpg)
*Bild 2 (SKISS – tillfälligt uppställd i en headless-körning, finns inte i spelet): Stig sitter högt uppe på en röd traktor utan märke, med stora bakhjul och ett avgasrör framför sig, och på släpet står tomatlådor. Ovanför honom står ”Jag lånar den bara en liten stund!”. I skissen står bonden med halmhatt kvar uppe vid släpet och ropar ”¡Mi tractor! ¡Señor!”. I spelet ska han i stället springa efter till fots. Båda replikerna är nyskrivna [N].*

**Idén.** Traktorn står parkerad vid boden, utanför vägarna och genvägen genom kvarteret. Spelaren tar den med E, och då kommer en bonde ut ur boden och springer efter med ”¡Mi tractor! ¡Señor!” utan att någonsin hinna ikapp, medan Stig artigt försäkrar att han bara ska låna den en liten stund. Traktorn är plågsamt långsam, hög och skumpig: på stadsvägarna samlas snart en kö av tutande bilar bakom den (AI-bilarna tutar redan när spelaren blockerar dem i 1,2 s, drivers.js:235), och vid varje guppig fåra muttrar Stig om sin åksjuka.

**Filmkopplingen.** Det finns ingen traktor i filmen. Kopplingen är i stället Stigs åksjuka: ”Jag har lite anlag för åksjuka.” (notes/research-characters.md:128, på bussen vid ungefär 0:37). Vem som säger den är tolkat, troligen Stig-Helmer (notes/research-plot.md:248), så som replik på traktorn ska den taggas \[F*](t). I uppdrag 9 vägrar spelets egen Stig att köra vidare: ”Jag kör inte längre på grusvägen. Jag har anlag för åksjuka.” (DESIGN.md:2166, [N]). Här skumpar han frivilligt fram över samma lantvägar på en traktor, och det blir både en tillbakablick och ett typiskt Stig-Helmer-ögonblick. Om man vill kan Berra och Robban hoppa upp på släpet efter bodega-uppdraget, med ”Fan, de luktar.” / ”Skit i det. Vi slipper gå.” (notes/research-plot.md:319, [F*]). Där är det dock osäkert vilket fordon de liftar med i filmen, och uppdrag 9 använder redan scenen.

**Varför vi borde göra det.**
- ”Typiskt Stig-Helmer!” Den långe, artige mannen i Oles skrikiga hawaiiskjorta sitter på en traktor och ber om ursäkt till bonden medan han kör i väg. Han klagar på åksjukan, fast det var han själv som valde fordonet.
- Det är billigt för vad det ger. Tutkön, kapningsgesten och tutan med låg ton (`audio.horn`, audio.js:240) finns redan. Tomatfälten, som i dag står helt stilla (bild 1), får sin egen leksak, och fältet får ett udda Hit & Run-fordon som man åker tillbaka till bara för att reta trafiken.

**Så kan det byggas.** I `car.js:22–32` läggs en `traktor`-spec till, med maxSpeed omkring 4,2. Spelarens bil multipliceras med `PLAYER_BOOST` 1,2 (car.js:38, 492–493), så 4,2 blir 18 km/h, medan 5 skulle ge 21,6 km/h. Den får också hög sits, egen byggfunktion med stora bakhjul och avgasrör, och ett fast långt flak via den befintliga `bed`-flaggan (car.js:15, 129) i stället för ett riktigt släp. Lådorna på flaket är bara utsmyckning. Det finns inget lastsystem än (Tomatbilarna, nr 119, är en idé och finns inte i spelet), så om lådor ska trilla av går `spawnDebris` (props.js:394) att använda som enkel ersättning. Traktorn placeras i `tomatFields` (nature.js:420–439), lokalt (3,5, −20). Bonden är en ny liten figur och ingen återanvänd `grisbonde`, eftersom han är uppdragsaktör i bodega (island.js:356, 365). Vanlig kapning hjälper inte heller: den kräver en förare i bilen och flyttar en slumpvald fotgängare (main.js:592–605). Därför behövs ett eget litet beteende, ”springer efter, hinner aldrig ikapp”, med repliker i stil med `CARJACK_LOCAL` (content/island.js:104). Ingen körslinga för bonden i första versionen, eftersom `LanePath` bara går över vägnätet (drivers.js:21–81).

**Att tänka på.** Uppdragsetapperna ”Hoppa in i en bil” (island.js:247, 320, 415, 458) godtar vilken bil som helst. I bodega sätter de därefter Berra som passagerare och Robban på flaket (island.js:320–334). Traktorn måste därför ha ett passagerarsäte och platser på flaket (`bed`, main.js:357), annars kan spelet låsa sig. Väljer spelaren den långsamma traktorn till den tidsatta vischan-körningen är det hans eget val. Jeep-poolen i bodega (island.js:74, n 130) är mätt på samma värld. Därför ska traktorn stå utanför vägar och genvägar, och efteråt ska `story` köras och `calibrate` kontrolleras för jeepen. Traktorn ska vara röd och generisk, utan märke eller emblem (§1.5). Traktorn och bonden förs in som påhittade i DESIGN §1.6 och README, och bondens spanska är vanlig spanska utan härmad brytning (§1.2).
