# Charter & Run

*Simpsons: Hit & Run* möter *Sällskapsresan* (1980). Ett fan-gjort open world-spel i three.js:
julen 1979 tar den flygrädde brödrostkontrollanten **Stig-Helmer Olsson** SunTrips charter till
Kanarieöarna, med norske prylmannen **Ole Bramserud** i stolen bredvid. Först ska han överleva
själva flygresan – sedan gruppresan.

- **Nivå 1, "Flygresan"** (uppdrag 1–5): en liten Arlanda-gate (säkerhetsbåge, lounge,
  herrtoalett, flygbrygga) och sedan flygningen i en uppskuren DC-8, "Sol-Viking" SE-SOL, från
  snöiga Arlanda genom molnen till "soldis och 22 grader". Mätaren heter **FLYGRÄDSLA** – blir
  den full får Stig-Helmer **PANIK**. Det enda som hjälper är Dr Levanders övning: armarna rakt
  ut, *"Jag kan flyga, jag är inte rädd."*
- **Nivå 2, "Nueva Estocolmo"** (uppdrag 6–13): en påhittad SunTrip-ort på södra Gran Canaria,
  sju gånger sju kvarter med hotell, marknad, bodega, golfbana, dyner, fyr och hamn. Bussen,
  friskoteket, den målade åsnan, Berras och Robbans jakt på Pepes Bodega, José och hans mamma,
  Fataga, grisfesten och julafton vid poolen. Mätaren heter **SKANDAL** – blir den full kommer
  **Guardia Civil** och delar ut en **¡MULTA!**.
- Flygrädslan får sitt slut på julafton: Stig-Helmer och Majsan säger mantrat tillsammans i
  solnedgången, och sedan … Rio?

## Starta

```sh
make run           # installerar beroenden vid behov, startar servern på http://127.0.0.1:8840 och öppnar sidan
```

Klicka **SPELA**. `make serve` startar bara servern (ingen webbläsare), `PORT=9000 make run`
väljer en annan port, `NOOPEN=1 make run` öppnar ingen flik och `make test` spelar hela storyn
headless. Modulerna behöver en HTTP-server; `file://` fungerar inte. Typsnitten kommer från
Google Fonts (utan nät faller de tillbaka på Impact).

URL-flaggor: `?fresh` struntar i sparfilen, `?mission=N` börjar på uppdrag N (0–12, nollbaserat).
Spelet sparas i localStorage (`charter-and-run-v1`); "Radera resan" i pausmenyn börjar om på
Arlanda.

## Kontroller

Samma tangenter i båda nivåerna; nivån bestämmer vad de gör.

| tangent | på ön, till fots | på ön, i bil | på Arlanda och i planet |
|---|---|---|---|
| W A S D / pilar | gå | gasa, bromsa, styr | gå (långsammare i den trånga gången) |
| Mus | titta | titta (svänger tillbaka bakom bilen) | titta |
| Shift | spring | | skynda – men det ökar rädslan |
| Space | hoppa, i luften igen för dubbelhopp | handbroms (sladd!) | **håll i dig**: ta tag i närmaste stolsrygg vid turbulens |
| J / klick | sparka, i luften: stampa (efter julafton: **håll in i luften** för att glidflyga) | | **håll in**: "Jag kan flyga, jag är inte rädd" – sänker FLYGRÄDSLA |
| E | prata, kliv in, sno en bil, kvarta en stund i Stigs säng i rum 107, titta i herr Storchs kamera, heja på rullskidåkaren, dansa med i poolen | kliv ur (i fart: rulla ur) | prata, **sätt dig / res dig**, lås in dig på toaletten, anropsknappen, serveringsvagnen |
| H | | tuta (utanför uppdragen hör folk den) | |
| B | | titta bakåt | |
| M / Tab | stor karta | stor karta | plan över gaten/kabinen |
| N | ljud av | ljud av | ljud av |
| R | fast? tillbaka till vägen | fast? tillbaka till vägen | fast? tillbaka ut i gången på samma rad (i terminalen: loungen; under rusningen till toaletten loungen eller Oles plats, aldrig närmare toaletten – annars "Inte härifrån!") |
| Esc / P | paus | paus | paus |

Sitter Stig-Helmer ner i planet rör han sig inte; E reser honom upp (eller trycker på knappen
ovanför stolen), J håller mantrat. På julafton blir J mantrat även på ön, och efter julafton kan
Stig-Helmer glidflyga: tryck J i luften och håll in (ett kort tryck stampar som förut). Handkontroll fungerar
också: A hopp/handbroms, B spring, X sparka/mantra, Y prata, Start paus, triggrarna kör.

Vägen visas av den gula pilen över Stig-Helmers huvud, ljuskäglan och ringen vid målet och
stjärnan på kartan. På Arlanda och i planet går pilen runt bänkar, väggar och stolsrader i
stället för rakt över dem, och när ett tidsatt moment börjar vänds Stig-Helmer och kameran åt
rätt håll. När planet börjar skaka visas **TURBULENS!**, och står han upp går prompten **Håll i dig!**
(Space) före "Sätt dig" och toaletten.

## Rollista

| figur | vem |
|---|---|
| **Stig-Helmer** | du. Lång, blyg, flygrädd, "Giraffen". Kontrollerad av G17. |
| **Ole** | norsk, pratar bara norska, har en pryl för allt och flygolycksstatistik för resten. Ger flest uppdrag. |
| **Majsan** och **Sivan** | systrarna i rad 16. Sivan delar ut poäng. |
| **Berra** och **Robban** | på jakt efter Pepes Bodega och 80-procentig rom. |
| **Gösta Angerud** | affärsmannen med svarta pengar i en knäckebrödsförpackning. |
| **Dr Levander** | bara på radion och i minnet: övningen. |
| **Lasse**, **Affe**, **Gabbe** | SunTrips platschef och guider (dragspel, congas, nattbussen). |
| **José**, **Josés mamma**, **Josés pappa**, **Carmencita** | "pizza-racern" och hans familj. |
| **Herr och Fru Storch** | nygifta från Mjölby. Storch, inte Stork. Linsskyddet sitter på. |
| **Flygvärdinnan**, **Kaptenen**, **Högtalaren** | besättningen i Sol-Viking. |
| **Portiern** | Hotell Flamencos reception. "Momento." |
| **Städerskan** | ett kort besök på julafton. |
| och fler | Kontrollanten, Sulan, Killen från flygplatsen, Bungalowförsäljaren, Souvenirförsäljaren, Rullskidåkaren, Grisbonden, Grisfestvärden, Telefonisten (bara rösten: "Hytt två!"), Guardia Civil |

## Uppdragen (13)

| # | uppdrag | ger uppdraget | vad du gör |
|---|---|---|---|
| 1 | Jag kan flyga, jag är inte rädd | Ole, vid gate 8 | Metallbågen piper, Ole läser statistik, du spurtar till herrtoaletten innan rädslan tar över, gör Levanders övning och hör tipset om Pepes Bodega i kön. |
| 2 | Rad 13 finns inte | Flygvärdinnan | Hitta 14B förbi folk som stuvar bagage (det finns ingen rad 13) och klara starten med mantrat när landningsstället går DUNS. |
| 3 | Mer juice | Ole | Anropsknappen, juicen vid serveringsvagnen – akta tårna – och tillbaka till 14B genom turbulensen utan att spilla. |
| 4 | Medhavd sprit | Flygvärdinnan | Fånga fem flaskor som rullar i gången medan vagnen kommer – och håll i dig när planet skakar och flaskorna far åt alla håll. |
| 5 | Inflygning Las Palmas | Majsan | Fyra poäng? Få de stående passagerarna att sätta sig, hinn tillbaka till 14B och håll mantrat genom inflygningen tills hjulen tar Gran Canaria. |
| 6 | SunTrips buss nummer 17 | Lasse, på flygplatsen | Kör gruppen till Hotell Flamenco – mjukt, annars blir de åksjuka. |
| 7 | Plocka kulor! | Lasse, vid friskoteket | Jaga sex vindblåsta badbollar. Plocka med höger, plocka med vänster. |
| 8 | Caballo folklorístico | Ole | Ole till marknaden, pruta på åsnan, hitta samma knäckebröd som i julklappen och kör den nymålade åsnan varsamt till Viking Bar. |
| 9 | Pepes Bodega | Berra | Leta bodegan med Berra och Robban, följ grisbilen, låna den, stoppa Guardia-jeepen och kör hem grisarna. |
| 10 | Gamla kläder | Sivan | Skugga José – men inte för nära – och spana diskret från fontänen. |
| 11 | En skock får | Majsan | Följ utflyktsbussen till Fataga och fånga Josés pappas får. |
| 12 | Grisfesten | Ole (kostar 800 pta) | Blommor till Siv och Maj-Britt, kappkörning i hyrbilen mot nattbussen, porslinskross, Tonga Tonga – och bärra hem Berra. |
| 13 | Julafton bland palmerna | Ole (kostar 100 pta) | Samla gästerna till julfesten vid poolen och visa Majsan övningen. Sedan: Rio? |

Tiderna är **tajta, som i Hit & Run**: en ren körning på en vettig väg har ungefär 15–20 %
kvar, en krasch eller en felsväng kostar uppdraget. Varje tid är uppmätt med en autopilot på den
riktiga banan (DESIGN §8), aldrig gissad; till fots får du en halv sekund extra per mål för att
reagera och sikta. Misslyckas du väljer du: **E** försöker igen från senaste kontrollpunkten
("Försök igen!"), **Q** ger upp – då tar du uppdraget igen hos den som gav det. Bilen du kör går
×1,2 mot trafikens bilar, inte mer.

## Samla, betala, låsa upp

- **Oles prylar** (7): Oles dingsar ligger utspridda över ön – på en byggställning, en
  takterrass, ett marknadstak, Fatagas torg, drömplanets vinge, hamnpirens ände och
  grisfestladans tak. Varje pryl får en replik av Ole. Alla sju: bonus och samba i pausmenyn.
- **Hajfenor** (7): uppblåsbara hajfenor cirklar i poolerna, fontänen, golfdammen, hamnen och
  havet. Spring i och sparka (eller kör igenom).
- **Pesetas**: mynten i gatorna, i trasiga prylar och i vrak är värda 25 pta styck. De går åt
  till grisfesten (800), julafton (100), åsnan, hittelön, böter (¡MULTA!: 20 % av kassan,
  250–1500), PANIK (−50), portiern (500) och målarverkstaden (1 000). Har du inte råd betalar Ole – men inte
  böter, PANIK-avgiften eller målningen.
- **SKANDAL**: kör på folk, kvadda bilar, sno bilar och slå sönder saker så stiger mätaren – fort,
  och den står still i tio sekunder innan den börjar sjunka. Full mätare = två Guardia
  Civil-jeepar och en polis till fots. Håll dig mer än 70 m bort så lägger sig skandalen. Till fots
  tar polisen dig när han hinner ikapp; i bil blir du tagen om du står still eller kryper fram
  nära en jeep i fyra sekunder, eller om jeeparna prejar dig två gånger inom fjorton sekunder (en
  gång går bra). Blir du tagen åker du på böter. Under jakten kan du **muta portiern** på Hotell
  Flamenco (500 pta). Sitter du i en vanlig bil kan du i stället köra till **verkstaden vid
  Gasolina** och stanna i den gula rutan när ingen jeep är nära: för 1 000 pta målar Ole och Stig
  bilen röd med blommor som en dalahäst, och Guardia Civil känner inte igen den. Men bara en gång
  per bil, och krockar du innan färgen har torkat känner de igen den igen. Och gör du något dumt
  nära Herr Storch: ingen fara, linsskyddet sitter på.
- **Upplåsningar**: grisbilen (parkerad vid Hotell Flamenco efter uppdrag 9), samba-musik (alla
  prylar) och Pepes Bodega på hotellets baksida (efter julafton).
- **Bärra hem Berra**: efter grisfesten somnar Berra då och då, på bänken vid fontänen på plazan
  eller på en solstol vid SunTrips pool, och Robban står bredvid och vinkar. Prata med Robban, så
  lyfter Stig upp Berra på axlarna och bär honom till receptionen på Hotell Flamenco. Gå, spring
  inte: springer du, ramlar, blir påkörd eller trycker R tappar du honom, och då får du lyfta upp
  honom igen (E). Vid receptionen vaknar Berra, och Robban betalar en hundring, 25 pta mindre för
  varje gång du tappade honom. En stund senare sover Berra igen, på det andra stället.
- **Jag kan flyga**: efter julafton kan Stig-Helmer glidflyga. Hoppa, dubbelhoppa och håll in J i
  luften: han sträcker ut armarna som hos Levander, säger mantrat och singlar stelt nedåt och
  framåt, och W A S D svänger honom lite. Ett kort tryck på J stampar som förut. Varje landning
  slutar i en kullerbytta, och landar han i en pool blir det plask (och Lasse ringer, en gång).
  Prova från drömplanets vinge, trampolinen eller hopptornet vid Flamencos pool. Står Ole i närheten
  ropar han "Det er flyging!".
- **Siv och Majsan sätter poäng**: studsa på trampolinen vid Flamencos pool. Första gången säger
  Stig "Mina ögon tål inte klor.", och systrarna går fram till poolkanten. Varje hopp som slutar i
  vattnet får poäng: ett vanligt hopp blir ett svanhopp (Siv ger fyra, "Giraffen, då?"), ett
  dubbelhopp en volt (Siv ger nio, mer blir det aldrig) och stampar du i luften (J) blir det ett
  magplask och minuspoäng. Majsan håller alltid upp en tia. Resultatet visas längst ned, och ditt
  bästa hopp sparas som rekord.
- **Från fjärde våningen**: vid djupa änden av Flamencos pool står ett tio meter högt hopptorn,
  TRAMPOLÍN 10 M. Tryck E vid stegens fot för att klättra upp, så står Stig på plattformen i höjd med
  hotellets fjärde våning (E där uppe tar honom ned igen). Gå ut över brädans kant: han sträcker ut
  armarna och säger mantrat på vägen ned. Trycker du J i luften blir det en bomb med ett jätteplask,
  annars ett magplask, och Stig reser sig och säger "Oj.". Första gången ringer Lasse: "Från fjärde
  våningen? Ner i poolen? Ring kliniken." Under uppdragen kan du inte klättra upp.
- **Tutan**: utanför uppdragen hör ön när du tutar (H). Fotgängare framför bilen hoppar undan, och
  gänget i närheten svarar, om de ser bilen: Ole vinkar och påminner om att det är farligare att
  köra bil än att flyga, Lasse ropar "Hä-pååre!", Angerud ska tala med platschefen och Berra och
  Robban tror att du visslar efter tjejerna. Första gången ber Stig-Helmer om ursäkt. Grisbilen
  tutar inte, den grymtar. Kör runt och hör vad alla säger!
- **Dygnet runt**: mellan uppdragen går tiden på ön, en timme i minuten och dubbelt så fort på
  natten. Vid sju glider himlen över i solnedgång, vid åtta tänds fönstren, lyktorna och fyren, och
  vid sex ljusnar det igen. Har du hittat Oles klocka sitter den under pesetas, med spansk tid och
  norsk och svensk tid bredvid (samma tid två gånger). I rum 107 kan Stig "kvarta en stund" i sin
  turkosa säng (E): bilden tonar ner, klockan snurrar fram till nästa del av dygnet och Ole väcker
  honom med miniräknarens alarm. Pratar du med en uppdragsgivare på kvällen blir det "NÄSTA MORGON"
  först, så uppdragen spelas alltid i dagsljus.
- **Lite film.**: gör ett trick på stranden (dubbelhopp, stampa, hoppa ned från livräddartornet,
  glidflyg, sparka sönder en solstol) nära herr Storch, så kommer han springande över sanden och
  filmar. Ställ dig vid honom och tryck E ("Titta i kameran"): bilden i hans sökare är kolsvart,
  men han är strålande nöjd. Efter julafton är linsskyddet av. Då ser du ön genom hans kamera i
  bleka smalfilmsfärger, varje trick han filmar blir en stillbild, och han frågar "Vill du se min
  film?". Filmkvällen visar sju svarta dagar och sedan dina egna bravader från julafton. Men nu finns
  det bevis: en förseelse nära honom ger SKANDAL som överallt annars.
- **Heja Eslöv!**: rullskidåkaren med ESLÖV på bröstet tränar på Eslövvägen vid tomatfälten (ute
  på vischan, vid skylten ESLÖV 3 900 KM). Tuta när du kör förbi, så ropar Stig "Heja Eslöv!" och
  skidåkaren vinkar med staven: "Bara 390 mil kvar!". Till fots räcker det att trycka E. Då stannar
  han och bjuder på **Eslövloppet**, ett varv runt tomatfälten på vägarna med start och mål vid
  skylten. Stig springer, skidåkaren stakar och klockan tickar, och han går i mål precis när tiden
  tar slut. Vinner du får du en slant och din bästa tid sparas. Loppet springs till fots, så en bil
  eller R avbryter det. Står du mitt i hans spår kommer ett "Spår!" bakifrån.
- **Små grodorna i poolen** (efter slutet): julfesten är inte riktigt över. Varje gång du kommer in
  på Flamencos pooldäck (mellan nio på morgonen och elva på kvällen) vadar SunTrip-gänget ut i den
  grunda änden och ställer sig i ring runt Lasse i tomteluva. Affe spelar Små grodorna på dragspelet,
  Gabbe trummar och alla hoppar på varannan takt, två varv och sedan en paus. Första gången frågar
  Stig om man måste, och Majsan svarar. Portiern kliver ut och tycker att svenskarna är heltokiga. I
  ringen finns en lucka som är markerad på vattnet: tryck **E** där så kliver Stig i, i kostym och
  stel som en pinne. Hoppa med **Space** i takt med ringen. Åtta hopp i rad ger jubel, "Heia Norge!"
  och en slant från Lasse. Hoppar du i otakt skrattar de (snällt). **E** igen, eller ett steg, tar dig
  ur ringen.
- **Förlåt, förlåt!**: Stig-Helmer är för väluppfostrad för det här. Sparkar du omkull någon, kör
  på en fotgängare eller har sönder något utanför uppdragen ber han om ursäkt i en egen pratbubbla
  (första gången alltid, sedan ibland: han hinner inte med). Tar du en bil frågar han föraren
  "Ursäkta, är det din bil?", och ibland svarar en svensk turist bara "Nej.". SKANDAL-mätaren stiger
  precis lika mycket ändå.
- **Grisarna ramlar av grisbilen**: kör grisbilen (upplåst efter uppdrag 9) för vilt, med en hård
  landning, en krock, en lång sladd eller en tvärnit från full fart, så tumlar en gris av flaket. Den
  ruskar på sig ("NÖFF!") och travar iväg. Gå fram till den så lyfter Stig den över huvudet (gå, spring
  inte) och bär den till flaket, eller krypkör så att flaket rullar intill den så hoppar den upp själv.
  Kör den fort mot den så skuttar den bara undan, och Lasse vägrar hjälpa till. Stanna med alla tre
  grisar vid grisfållan på grisfestgården: grisarna hoppar in, grisbonden tackar och betalar (mer om
  ingen gris ramlade av på vägen). Nästa gång grisbilen står vid Flamenco har den tre nya grisar.
- **Åk bagageband**: hoppa upp på bagagebandet CINTA 2 i ankomsthallen på Gando, så åker Stig-Helmer
  med runt bland de andras resväskor (ett varv tar ungefär 20 sekunder). Står han still en stund
  sätter han sig på närmaste väska och åker vidare som vilket bagage som helst. Första gången suckar
  han "Min väska har inte kommit.", varje varv får ett meddelande, Lasse svarar i radion efter det
  första och efter tredje varvet är Stig själv bagage. Space hoppar av väskan, E kliver av bandet.
- **Lapplisan Majsan**: ställ en bil uppe på trottoaren och gå ifrån den, så kommer Majsan efter en
  stund gående runt hörnet med lappblocket. Hon sätter en gul lapp på vindrutan, och står Stig kvar
  frågar hon "Ursäkta, är det din bil?". Han svarar sanningsenligt "Nej." (hyrbilen: "Den är…
  hyrd."). Kör iväg innan hon säger "Okej, grabbar!", annars tonar bilden ut och bilen är bärgad
  (hyrbilen och grisbilen står då i sina rutor vid Flamenco). Mellan uppdragen står Angeruds vita
  hyrbil på trottoaren utanför Centro La Medina: första gången Stig går förbi spelas filmens första
  möte upp, med bärgaren och Angeruds utbrott, och sedan muttrar han om hederliga bilister. Parkera
  rakt i en ruta på Flamencos parkering så berömmer Majsan dig över häcken (första gången ger det en
  liten slant).
- **Grisfest varje torsdag**: efter grisfesten står värden i grinden till gården på vischan. "Är det
  torsdag i dag?" – "Här är det alltid torsdag, señor. Åttahundra pesetas!" Betala exakt filmens 800
  pesetas (E; Ole betalar inte här) så blir det kväll: bandet spelar vals på scenen, gänget och några
  turister dansar under ljusslingorna, herr Storch filmar och fru Storch undrar om det finns svenskt
  kaffe. Gå fram till en turist som dansar ensam och tryck E: Stig provar Oles "Ska vi dansa? Hej
  hej.", men hon vänder ryggen till. Då kommer Majsan och bjuder upp honom i stället. Står Stig sedan
  stilla hos henne dansar de igen. Festen pågår tills Stig går ut från gården, och då är det morgonen
  efter.
- **Rakt genom fruktståndet**: marknadens fem fruktstånd har gul-orange randiga markiser (inga andra
  stånd har dem). Kör rakt in i ett i full fart (över ungefär 22 km/h) så går det sönder: frukten yr,
  markisen slits i bitar, mynten studsar ut och SKANDAL stiger lite. Försäljerskan dyker upp bredvid
  vraket och ropar "¡Mis tomates!", och Stig ber om ursäkt inifrån bilen utan att stanna. Efter
  åsneköpet svär souvenirförsäljaren "Jävla smålänningar!" om det händer nära hans stånd. En spark
  eller en lätt knuff rår inte på ett stånd, och under uppdrag är de lika fasta som förut. Ett trasigt
  stånd står där igen när du har varit borta en stund.
- **Fin hund…**: i bungalowkvarteren har tolv tomter en vakthund (alla som har studsmatta och några
  med bil på uppfarten), och gården på vischan har en gul byracka. Hunden ligger vid ytterdörren och
  skäller på dig bakom muren när du går förbi på trottoaren. Går du in genom grinden rusar den fram
  och står och skäller en bit ifrån dig, och Stig håller upp händerna och mumlar "Fin hund… fin
  hund…". Den biter aldrig och lämnar aldrig tomten, så det räcker att gå ut genom grinden igen.
  Roligare är att ta sig upp på något: ett biltak, muren, studsmattan bakom huset eller vattentankens
  kant på gården. Där förhandlar Stig ("Snälla hund… sitt!") och säger mantrat med utsträckta armar,
  tills ägaren visslar inifrån huset utan att synas ("¡Bobi! Hit!") och hunden lunkar hem. Sedan får
  du vara i fred en stund. Varje hund har sitt eget namn och sitt eget skall, och under uppdragen
  syns inga hundar.

## Vad är påhittat?

Allt som inte finns i filmen är märkt i koden. Det här har vi hittat på (DESIGN §1.6):

- turbulensen, och att hålla i sig när det skakar
- FLYGRÄDSLA och PANIK som spelmekanik
- serveringsvagnen (filmen har bara värdinnor med brickor), att den välter folk, och att man
  hämtar juicen vid den (i filmen kommer värdinnan med den)
- att samla rullande flaskor och att få stående passagerare att sätta sig
- passagerarna som stuvar bagage och blockerar gången
- att låsa in sig på planets toalett mot flygrädslan, och att ta juice själv i byssan
- att Stig-Helmer kör SunTrips buss 17 (i filmen tar Lasse transfern)
- "Plocka kulor" som jakt efter vindblåsta badbollar
- prutning som tajmingspel, SKICK-mätaren för den våta färgen och ÅKSJUKA-mätaren
- Guardia Civil-jakten, ¡MULTA! och portiermutan som gömställe
- målarverkstaden vid Gasolina, där en dalahästmålad bil lurar Guardia Civil (i filmen är det
  åsnan som Ole och Stig målar röd med blommor)
- att Berra somnar på stan efter grisfesten och att Stig bär hem honom om och om igen, mot betalt
  (i filmen bär Robban och Stig-Helmer hem honom tillsammans, en enda gång, efter Tonga Tonga)
- glidflygningen efter julafton, kullerbyttan han landar i, Lasses poolreplik och Oles rop (i
  filmens drömsyn står Stig-Helmer bara med utsträckta armar framför ett propellerplan, och han
  flyger aldrig)
- att Siv och Majsan sätter poäng på Stigs simhopp vid poolen, poänglapparna, Majsans tior och
  magplasket (i filmen sätter systrarna poäng på männen på planet)
- att folk reagerar på tutan, Stigs ursäkt och grisbilens grymtande tuta (replikerna är filmens,
  flyttade, eller våra egna)
- klockan som spelmekanik (kvällar och nätter mellan uppdragen, Oles klocka under pesetas, "NÄSTA
  MORGON" före ett uppdrag), Stigs tupplur i rum 107 och att Ole väcker honom med miniräknarens
  alarm (i filmen visar Ole bara upp miniräknaren med väckarklocka, och ordet "kvarta" är Affes)
- att herr Storch springer fram och filmar Stigs trick, sökaren med den svarta bilden,
  stillbilderna efter julafton och filmkvällen (linsskyddet och den förlorade veckan är filmens
  julfest, men i filmen tittar ingen i hans kamera)
- att rullskidåkaren tränar fram och tillbaka, svarar på tutan, ropar "Spår!" och tävlar med Stig
  runt tomatfälten (i filmen är det Berra som ropar "Heja Eslöv!", och Robban svarar "Herre jävlar!")
- poolfesten efter slutet: ringen runt Lasse, portierns promenad, att Stig hoppar med och
  takträknaren (i filmen dansar de andra Små grodorna i poolen på julfesten medan Stig-Helmer och Ole
  öppnar knäckebrödet, och Stig-Helmer dansar aldrig)
- att Stig ber om ursäkt för sparkar, påkörningar, sönderslagna saker och kapade bilar, och att den
  kapade föraren svarar "Nej." (i filmen är det trafikvakten Majsan som frågar Stig "Ursäkta, är det
  din bil?", och han som svarar)
- att grisbilen lånas ut till Stig-Helmer, att man följer Josés bil och grisbilen, och
  jeepjakten
- att grisarna ramlar av grisbilen när man kör vilt, att Stig fångar in dem och kör hem dem till
  grisfållan, och att Lasse vägrar hjälpa till (ingen ramlar av grisbilen i filmen, och Stig-Helmer
  är inte med i den scenen)
- att Stig åker bagageband och sitter på någon annans resväska, och att han säger "Den här väskan ska
  till Las Palmas." om sig själv (i filmen saknas hans väska när de landar, och repliken sägs på
  japanska på en flygplats där väskan irrar runt)
- att Majsan lappar och bärgar bilar på ön, att Angeruds hyrbil bärgas utanför Centro La Medina och
  att hon berömmer en bil som står rakt i rutan (i filmen sker frågan, bärgningen och Angeruds utbrott
  vid en resebyrås skyltfönster i Stockholm, och systrarnas repliker om parkering sägs på balkongen)
- att grisfesten går att köpa igen för 800 pesetas, och att en turist nobbar Stig när han provar Oles
  "Ska vi dansa? Hej hej." (i filmen är det en enda grisfest, och Stig provar aldrig Oles fras)
- att bilen kör rakt genom marknadens fruktstånd, att försäljerskan ropar "¡Mis tomates!" och att
  souvenirförsäljaren svär "Jävla smålänningar!" åt det (i filmen svär han när Ole prutar ner åsnan,
  och ingen bil kör genom marknaden)
- hopptornet vid Flamencos pool, mantrat på väg ned, bomben och magplasket, och att Lasse ringer om
  det (i filmen upprepar Lasse en gästs samtal i telefonen, och ingen hoppar)
- vakthundarna på bungalowtomterna och gården på vischan, ägarna som visslar hem dem och att Stig
  säger "Fin hund…" och mantrat till dem (i filmen nosar en narkotikahund på Stigs paket vid
  bagagekontrollen på Arlanda, och någon säger "Fin hund.")
- fårrusningen i Fataga, kappkörningen mot nattbussen och porslinskrosset på tid
- att samla ihop julfestgästerna
- Oles prylar och hajfenorna som samlarföremål, utspridda över ön
- att Majsan säger mantrat tillsammans med Stig-Helmer
- Rio-slutbilden som spelbar epilog

Filmens flygresa har **ingen turbulens** och **ingen toalettscen ombord**: båda toalettscenerna
utspelar sig på Arlanda, och där ligger de i spelet också. Toaletten ombord är bara ett påhittat
gömställe.

## Filmcitat och källmärkning

Varje manusrad i `src/content/*.js` och `src/game/missions/*.js` har en källkommentar
(DESIGN §1.4):

| märkning | betyder |
|---|---|
| `// [F]` | verifierad filmreplik (svenska undertexter, Wikiquote, norska undertexter för Ole), ordagrant som i `notes/research-*.md` |
| `// [F*]` | filminnehåll som bearbetats: förkortats, översatts till norska av oss eller **flyttats** till en annan scen eller talare |
| `// [N]` | ny replik skriven för spelet – presenteras aldrig som filmcitat |
| `(t)` | läggs till när talaren är vår tolkning (källorna säger inte vem som säger det): `// [F](t)` |

En filmreplik som används i en pratlista, en ropa-tabell eller på en skylt utanför sin egen scen
är alltid `[F*]`, aldrig `[F]`. All text i spelet är på svenska; Ole pratar alltid norska
(bokmål). José-familjen, portiern och Guardia Civil pratar svenska med spanska ord.

## Medverkande

Spelet bygger på filmen *Sällskapsresan eller Finns det svenskt kaffe på grisfesten?* (1980).
Figurerna heter som i filmen, med några undantag: grisfestens värd heter bara
**Grisfestvärden**, och cameon på julafton krediteras bara som **Städerskan**. Riktiga personers
namn förekommer bara inne i citerade filmrepliker.

Musiken är syntetiserad: egna låtar per stämning plus tre traditionella melodier som är fria
att använda (*Små grodorna*, *Hej tomtegubbar*, *Helan går*). Inga låtar ur filmen.

Spelmotorn kommer från syskonprojektet *Bigmouth & Run* i samma mapp.

## Friskrivning

Ett hyllningsspel gjort av fans, utan kommersiellt syfte. Inte knutet till filmens upphovsmän
eller rättighetsinnehavare, eller till Radical Entertainment, Fox eller någon annan. **SunTrip
finns inte** (det är filmens egen påhittade researrangör), och det gör inte heller Sol-Viking,
SPORT-KNÄCKE, Hotell Flamenco, Casa Lola, La Medina, Centro Nórdico eller de andra hotellen och
butikerna på skyltarna. Nueva Estocolmo är en påhittad ort. Bränsletillägg tillkommer.

## Code map

```
index.html, style.css           page, title/pause cards, HUD styling (SunTrip palette, §13.4)
src/main.js                     Game: init order, level system, fixed-step loop, input → player/car,
                                interactables, seats, NPC homes, collectibles, pay, save, test hooks
src/level.js                    LEVELS (flight, island): spawn, camera profile, meter, sim flags, palettes
src/meters.js                   METERS.flygradsla (panic mode) and METERS.skandal (pursuit mode)
src/strings.js                  S / fmt(): every UI string, in Swedish
src/gfx.js                      renderer, toon materials, inverted-hull outlines, GeoBuilder, sky palettes
src/input.js, audio.js          keyboard/mouse/gamepad; synthesised sfx, siren, tunes (muzak, sol, jul, skandal, vals, samba)
src/content/                    data with source tags: flight.js (gate/cabin homes, chatter, Ole's
                                statistics), island.js (homes, barks, COLLECTIBLES, UNLOCKS, named cars),
                                index.js (merges them)
src/world/cabin.js              the gate set and the DC-8 cabin at x = 3000: collision, seat map, trolley,
                                turbulence, fear, interactables, flight phases
src/world/flightScenery.js      the airframe and the scenery animated past the stationary cabin
src/world/layout.js             the 7×7 MAP, road graph, routing
src/world/landmarks-island.js   the canonical island landmark table
src/world/town.js               streets, outskirts, residential blocks, dispatch to the block builders
src/world/blocks/               hotels.js (Flamenco, SunTrip), centre.js (Kasbah, Centro Nórdico, plaza,
                                market, church, petrol, Guardia), nature.js (tomato fields, grisfest farm,
                                Fataga, golf, bungalows, building site, dunes), coast.js (airport,
                                dream plane, lighthouse, beach, harbour)
src/world/collision.js, frame.js  static solids, ground height, camera ceilings; the per-block Frame
src/world/props.js              breakable street furniture (§6.8 types)
src/world/rio.js                the Rio end-card set
src/actors/models.js            CHARS (the cast), outfits, procedural characters and car busts
src/actors/character.js         on-foot physics, seating, flinging, the landing roll (tumble)
src/actors/car.js               car types (sedan, SunTrip bus, guagua, grisbil, guardia…), physics, PLAYER_BOOST 1.2
src/actors/drivers.js           lane paths and AI drivers (traffic, route, chase, flee)
src/actors/peds.js, pickups.js  pedestrians; coins (pesetas), collectibles, rabbits (balls, sheep, flowers)
src/game/missions/              runner.js (MissionRunner), kinds/ (the stage kinds: core, flight, island),
                                flight.js (missions 1–5), island.js (missions 6–13), index.js
src/game/shame.js               the meter: FLYGRÄDSLA/PANIK and SKANDAL/Guardia pursuit, fines, hideouts
src/game/paintshop.js           the free-roam paint shop at Gasolina: the dalahäst paint job, wet paint, drive-by
src/game/berraJob.js            Bärra hem Berra in free roam: Berra's naps, Robban's ask, the carry, drops and pay
src/game/glide.js               Jag kan flyga in free roam after julafton: J held in the air glides, the landing roll
src/game/poolJudges.js          Siv och Majsan sätter poäng in free roam: dives off Flamenco's board, cards, record
src/game/honk.js                Tutan som folk reagerar på in free roam: pedestrians hop, the gang answers, the grunt
src/game/dayClock.js            Dygnet runt in free roam: the island's clock, evenings and nights, Ole's watch, the nap
src/game/storchFilm.js          Lite film. in free roam: Herr Storch films the tricks, his viewfinder, stills, film night
src/game/eslov.js               Heja Eslöv! in free roam: the rollerskier trains, answers the horn, Eslövloppet
src/game/poolFest.js            Små grodorna i poolen after the end: the ring in the pool, the porter, Stig dancing, the counter
src/game/stigSorry.js           Förlåt, förlåt! in free roam: Stig's sorry for kicks, knock-downs, breakage and carjackings
src/game/pigTruck.js            Grisarna ramlar av grisbilen in free roam: the pigs tumble off, the catch, the pen at the farm
src/game/baggageBelt.js         Åk bagageband in free roam: the belt at Gando carries Stig, he sits on a bag, the turns
src/game/lapplisa.js            Lapplisan Majsan in free roam: the ticket and the tow, Angerud's hire car and the film scene, the bay praise
src/game/grisfestFree.js        Grisfest varje torsdag in free roam: 800 pesetas at the gate, the evening, Majsan's invitation
src/game/fruitStands.js         Rakt genom fruktståndet in free roam: his car through the market's fruit stalls, the seller, the swear
src/game/diveTower.js           Från fjärde våningen in free roam: the 10 m diving tower, the ladder, the cannonball, the belly flop
src/game/dogs.js                Fin hund… in free roam: the watchdogs in the bungalow gardens and at the farm, Stig's hands and lines
src/game/hud.js                 HUD, minimap, big map, dialogue, portraits, objective card, banners
src/game/camera.js, fx.js, markers.js
tools/shot.mjs, tools/lib.mjs   headless test driver and the T API (timer statistics `pct`, `timerRange`)
tools/scenarios/*.mjs           scenarios (core, flight, scenery, island, cast, meter, kinds, perf,
                                paintshop, berra, glide, simhopp, tuta, dygn, super8, eslov, grodorna,
                                artig, grisar, bagage, lapplisa, torsdag, frukt, hopptorn, hund,
                                calibrate, calibflight)
tools/story/                    the story scripts (common, flight, island)
tools/fixtures/full-missions.js the literal DESIGN §8 missions, played by `fullstory`
tools/pool.mjs                  re-derives every random stage's timer from the ledger
DESIGN.md                       design bible and module contracts (the source of truth)
HANDOFF.md                      the state at `phase3`, known issues, workflow lessons, gotchas
notes/calibration-samples.md    the raw-sample ledger: every calibration run, pooled by stage and code
notes/build-reports/            every fixer's report, Phase 0 to Phase 3
notes/                          also film research (Swedish) and engine maps
```

## Headless tests

`tools/shot.mjs` serves the game, runs it in headless Chrome on the real GPU (no window) and
saves screenshots to `out/` (or `OUT=dir`). The last line is `RESULT: PASS` or
`RESULT: FAIL (reasons)`, and the process exits non-zero on FAIL. The harness serves on port
8841 by default (`PORT=n` for parallel runs).

```sh
node tools/shot.mjs                      # lists every scenario
node tools/shot.mjs story                # plays all 13 missions: must end '#13 idle', 'no errors', 'RESULT: PASS'
FROM=5 TO=8 node tools/shot.mjs story    # missions 6–8 only (indices 5–7)
node tools/shot.mjs start walk aerial drive traffic title talk missions views transition levels api
node tools/shot.mjs gate cabin trolley turbulence panic flightshots          # the flight level
node tools/shot.mjs phases sceneryPeek flightseq dc8                         # flight scenery
node tools/shot.mjs smash foot propsheet riocard endcard islandstats islandtour
node tools/shot.mjs castsheet cars heads ui skandal carbust perf
node tools/shot.mjs pintura dalasheet    # the free-roam paint shop and the dalahäst dress on every body
node tools/shot.mjs berra                # Bärra hem Berra in free roam: naps, the carry home, drops, the pay
node tools/shot.mjs glide                # the glide after julafton: the wing, the palm, a wall, the diving board, the lines
node tools/shot.mjs simhopp              # the sisters judge his dives: swan dive, somersault, belly flop, record, walk
node tools/shot.mjs tuta                 # the horn in free roam: the hop, the gang's answers, the sorry, the grisbil's grunt
node tools/shot.mjs dygn dygnGiver       # the clock in free roam: the sky by the hour, Ole's watch, the nap, NÄSTA MORGON
node tools/shot.mjs super8 filmkvall     # Herr Storch films the tricks: the trot, the black viewfinder, stills, the film night
node tools/shot.mjs eslov                # the rollerskier: his lane, the horn, E, "Spår!", Eslövloppet lost, aborted and won
ESLOV_RUNS=8 node tools/shot.mjs eslovlopp  # measure Eslövloppet's timer with calibrate's walker (DESIGN §10.12)
node tools/shot.mjs grodorna grodtakt    # the pool fest after the end: the ring, the porter, Stig in the ring, eight on the beat
node tools/shot.mjs artig                # Stig says sorry: kicks, run over, a pump, bins, carjackings and the driver's "Nej."
node tools/shot.mjs grisar               # the grisbil's pigs: the falls, the catch on foot and by creeping, Lasse, the pen
node tools/shot.mjs bagage               # the baggage belt: carried, sitting on a bag, the turns, Lasse, Space and E off
node tools/shot.mjs lapplisa lappfilm    # Majsan's tickets and tows, the bay praise; Angerud's hire car and the film scene
node tools/shot.mjs torsdag torsdagOle   # the grisfest's evening for 800 pta: the gate, the band, Majsan's invitation, the morning after
node tools/shot.mjs frukt fruktFore      # the fruit stalls: kick and slow car hold, 11 m/s through, the seller, the swear, the comeback
node tools/shot.mjs hopptorn             # the diving tower: the ladder, the railing, the belly flop, Lasse, the cannonball, a mission start
node tools/shot.mjs hund                 # the watchdogs: the wall, the rush, the hands up, the trampoline and the tank, the owner's call
node tools/shot.mjs fullstory kinds      # the literal §8 missions and the stage-kind checks
node tools/shot.mjs calibrate calibflight  # timer and FLYGRÄDSLA calibration (slow; see DESIGN §8, §16.4)
node tools/pool.mjs                      # random-stage timers from the raw runs in notes/calibration-samples.md
```

`make test` runs `story`. Test mode is `?test=1` (no title, no pointer lock, dialogue
auto-advances, `timeScale` 3).

Not affiliated with the makers of *Sällskapsresan*, Fox, Radical Entertainment or anyone else
with lawyers.
