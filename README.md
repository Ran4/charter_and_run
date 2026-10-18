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
| E | prata (med uppdragsgivaren, och mellan uppdragen med gänget), kliv in, sno en bil, kvarta en stund i Stigs säng i rum 107, titta i herr Storchs kamera, heja på rullskidåkaren, dansa med i poolen, smörja in Majsans rygg (**håll in** och släpp i det gröna), byta om i garderoben i rum 107, söka skydd i kyrkan, ringa efter en bil från hytt 2, meta från piren (och **dra upp** när flötet dyker), lifta på landsvägen (på flaket: hoppa av), ta livräddarens kikare (och sänka den igen), ta ett skift vid packhusets sorteringsband, spela strandvolley (och ta revansch), ta ett kort åt ett turistpar (och ge tillbaka kameran), vänta på guaguan vid en hållplats och kliva på (i bussen: kliva av vid vald hållplats), låna bondens traktor vid tomatfälten | kliv ur (i fart: rulla ur) | prata, **sätt dig / res dig**, lås in dig på toaletten, anropsknappen, serveringsvagnen |
| H | | tuta (utanför uppdragen hör folk den; i den lånade Guardia-jeepen: sirenen) | |
| B | | titta bakåt | |
| M / Tab | stor karta | stor karta | plan över gaten/kabinen |
| N | ljud av | ljud av | ljud av |
| R | fast? tillbaka till vägen | fast? tillbaka till vägen | fast? tillbaka ut i gången på samma rad (i terminalen: loungen; under rusningen till toaletten loungen eller Oles plats, aldrig närmare toaletten – annars "Inte härifrån!") |
| Esc / P | paus | paus | paus |

Sitter Stig-Helmer ner i planet rör han sig inte; E reser honom upp (eller trycker på knappen
ovanför stolen), J håller mantrat. På julafton blir J mantrat även på ön, liksom uppe på fyrens
galleri (där man inte kan hoppa), och efter julafton kan
Stig-Helmer glidflyga: tryck J i luften och håll in (ett kort tryck stampar som förut). Handkontroll fungerar
också: A hopp/handbroms, B spring, X sparka/mantra, Y prata, Start paus, triggrarna kör. I telefonens
bilmeny väljer W/S (pilarna, styrkorsets upp och ner), E ringer och Q (Backspace, B) lägger på. När
Stig metar lägger Q ner spöt medan han väntar. Står han på grisflaket när han liftar lutar A/D honom
emot i kurvorna. Med livräddarens kikare vrider musen eller W/A/S/D (pilarna) kikaren, och E eller Q
sänker den. Vid packhusets sorteringsband slänger A (←) tomaten i ROJOS, S (↓) i hinken och D (→) i
VERDES (styrkorset på handkontrollen), och Q avslutar skiftet. I strandvolleyn sparkar J bollen över nätet,
Space hoppar för att nicka och Q ger upp matchen; E gör ingenting under matchen. I turistparets kamera
siktar musen, W/A/S/D (pilarna) flyttar Stig, högerklick eller V vänder kameran på högkant och tillbaka,
Space eller vänsterklick knäpper och E eller Q ger tillbaka kameran utan kort. Väntar Stig på guaguan
slutar Q vänta, och sitter han i den väljer W/S (pilarna, styrkorsets upp och ner) hållplats och E
kliver av där.

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
- **G17-brödrostar** (7): krombrödrostar står runt ön där en brödrost hör hemma – på färglådan
  utanför FERRETERÍA, på bardisken vid Flamencopoolen, bland radioapparaterna på marknadens
  elektronikstånd, på portierns disk, i en fruktlåda vid SUPERMERCADO, på ett bord hos Casa Lola och
  på hittegodsets disk på flygplatsen. Mellan uppdragen: tryck E vid en rost, så trycker Stig ner
  spaken och mätaren går från blekt till bränt. Tryck E igen när brödet är gyllenbrunt: "Gyllenbrun.
  Godkänd!", och rosten får etiketten KONTROLLERAD AV G17. För tidigt blir det blekt, för sent bränt
  (och kanske en kommentar från någon av systrarna), men du kan försöka igen direkt. Mätaren går lite
  fortare för varje godkänd rost. Alla sju: bonus och ett radiosamtal från Majsan.
- **Borttappade väskor** (6): främmande resväskor med LAS PALMAS-lappar står där de inte hör hemma –
  vid HANGAR 2 bakom drömplanet, vid byggets bod, på packhusets lastkaj, i tomatraderna på vischan,
  utanför grisfestgårdens hus och på golfbanans artonde green. Mellan uppdragen: gå fram till en, så
  lyfter Stig upp den över huvudet ("Om man hittar något, så kan man få hittelön…") och bär den i
  gångfart, eller tar bilen. Ramlar han tappar han den; R lämnar den där han stod. Vid hittegodsdisken
  på flygplatsen: E, så läser killen på lappen ("Hammarby…?"), Stig svarar "Nej, inte min." och får
  100 pesetas i hittelön. Alla sex: bonus och ett radiosamtal från Angerud.
- **Rum 107**: det Stig hittar kommer hem till hans och Oles rum på Hotel Flamenco. Oles prylar
  ställs på en hylla ovanför tavlan, var och en på sin plats, och de nedtrampade hajfenorna ligger
  platta i en hög vid Stigs säng. Efter julafton står också väskan, plastgiraffen och
  knäckebrödspaketet där. Mellan uppdragen: E vid hyllan, så kontrollerar Stig den som den G17 han är
  och Ole räknar sina prylar i radion; E vid giraffen ("Precis en sån har jag önskat mig."); och E vid
  Oles bergsprängare: innan sambamusiken är upplåst svarar Ole bara "Kvarts og digital.", sedan slår
  den på samban och av den igen.
- **Garderoben i rum 107**: mellan uppdragen, när ingen jagar dig, byter Stig kläder med E vid
  garderoben innanför dörren. Kostymen och Arlanda-rocken med kepsen och vantarna hänger där från
  början, hawaiiskjortan efter buss 17 och den vita Rio-smokingen när resan är slut. Varje tryck tar
  nästa plagg, med en vit blixt, Helan går och en replik från filmen ("Det måste vara värmen." i
  rocken, Oles "Du kan ikke gå sånn her nede!" i kostymen). Valet sparas och följer med ut på ön, men
  i uppdragen har Stig de kläder berättelsen ger honom: kostymen före buss 17 och skjortan efter.
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
  Flamenco (500 pta). Mellan uppdragen, till fots och i hawaiiskjortan, kan du också springa hem
  till **garderoben i rum 107** och byta till kostymen. Bytet tar ett par sekunder, och hinner
  polisen ikapp dig där inne blir du tagen ändå. Hinner du byta letar han efter skjortan, kommer fram
  till uteplatsen, frågar "¿Dónde está el de la camisa?" och går förbi medan Stig artigt säger
  "Buenas tardes.". Ole tycker inte om kostymen. Du byter tillbaka vid garderoben när ingen jagar dig,
  och nästa uppdrag har du skjortan på dig igen. Mellan uppdragen kan du också springa till
  **Templo Ecuménico** och söka skydd i kyrkan (**E** vid dörren). Stig slinker in och dörren slår igen.
  Ute på torget läser polisen skylten ES UNA IGLESIA högt, stavar sig igenom svenskan och kliar sig i
  huvudet medan jeeparna väntar vid gatan med blåljusen på, och sedan ger de upp: "De där svenskarna är
  heltokiga!". Stig kikar försiktigt ut och mumlar "Hoppas vi inte får användning för det.". Kyrkan är
  gratis men har dubbelt så lång spärrtid som portiern, och hinner polisen ikapp dig vid dörren blir du
  tagen ändå. Sitter du i en vanlig bil kan du i stället köra till **verkstaden vid
  Gasolina** och stanna i den gula rutan när ingen jeep är nära: för 1 000 pta målar Ole och Stig
  bilen röd med blommor som en dalahäst, och Guardia Civil känner inte igen den. Men bara en gång
  per bil, och krockar du innan färgen har torkat känner de igen den igen. Och gör du något dumt
  nära Herr Storch: ingen fara, linsskyddet sitter på.
- **Upplåsningar**: grisbilen (parkerad vid Hotell Flamenco efter uppdrag 9) och samtidigt den ena
  Guardia-jeepen vid kasernen (se nedan), samba-musik (alla prylar) och Pepes Bodega på hotellets
  baksida (efter julafton).
- **Låna Guardia-jeepen**: efter uppdrag 9 står den västra av de två gröna jeeparna vid Guardia Civils
  kasern olåst mellan uppdragen. Tryck **E** (Låna jeepen), så kliver Stig in och säger artigt "Jag
  lånar den bara en liten stund…" – och sedan slår SKANDAL i taket och jakten börjar. Skakar du av dig
  poliserna (eller mutar portiern eller byter om i garderoben) är jeepen din resten av spelomgången.
  Håll **H** i den, så tjuter sirenen, blåljuset på taket blinkar och bilar framför dig åt samma håll
  saktar in och glider åt höger (men inte under en jakt). Första gången blir Stig själv förvånad, och
  kör du förbi Viking Bar med sirenen på får Angerud ett utbrott. Åker du fast med jeepen frågar polisen
  "Ursäkta, är det din bil?", Stig svarar ärligt "Nej.", och jeepen bärgas tillbaka till kasernen.
  Under uppdragen är den låst som förut.
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
- **Låna rullskidorna** (efter Pepes Bodega): när rullskidåkaren står still vid sin plats vid
  skylten (vänta där, så kommer han) frågar Stig med **E**: "Får jag… låna dem en liten stund?" –
  "Ta dem du. Men håll dig på asfalten." Med skidor, stavar och en nummerlapp med ESLÖV över
  hawaiiskjortan stakar Stig fram på asfalten i en och en halv gång sprintfarten, men han kommer
  långsamt upp i fart, svänger brett och har ingen broms (S plogar lite). På trottoaren vinglar han
  med armarna i luften, en trottoarkant eller en vägg i full fart fäller honom, och på sanden ligger
  han på rygg med skidorna i vädret: "Jaha… de rullar visst inte på sand." Berra och svenska turister
  ropar "Heja Eslöv!" efter nummerlappen, och Stig rättar artigt: "Jag är från Stockholm,
  egentligen…". Vid startlinjen vid skylten startar **Eslövrundan**, samma varv som Eslövloppet men
  på skidor, mot rullskidåkarens egna tider, med en resultatlista som på tv: "Stig-Helmer ligger trea
  efter första åket." Skidorna lämnas tillbaka med E, och de går tillbaka av sig själva när Stig
  sätter sig i en bil eller ett uppdrag börjar.
- **Golfbilen – pip-pip!**: de två golfbilarna vid golfbanans klubbhus går att köra mellan
  uppdragen. Kliv in med **E** och puttra fram i drygt 20 km/h över fairwayn, med en tuta som säger
  ett ynkligt "pip-pip". Kör ner i en bunker så tar det stopp i sanden och Stig konstaterar "Jag
  pliktar ett slag."; i dammen plaskar det: "Oj… ett vattenhinder." Under ett uppdrag är golfbilen
  för långsam: "Golfbilen är för långsam – ta en riktig bil."
- **Båtturen med PALOMA**: biljettkiosken PASEOS EN BARCO vid hamnens pir säljer båtturer mellan
  uppdragen, på dagen, för 300 pta (räcker inte kassan betalar Ole). Utflyktsbåten PALOMA tar Stig och
  Ole ut ur hamnbassängen förbi en uppblåsbar hajfena, där Ole pekar och drar sin olycksstatistik medan
  Stig håller hårt i bänken, längs playan och bort till fyren i solnedgången: "Tenk å sitte her i
  desember. Det er som i Rio." – "Har du varit i Rio?" – "Nei, men jeg skal reise dit." Efter slutet
  blir turen slutbilden igen: Rio-kostymerna, Majsan och Siv med, glasen i händerna och samban. **E**
  hoppar över turen.
- **Balkongerna lever**: på lägenhetshotellens balkonger står det folk mellan uppdragen (från sju
  på morgonen till elva på kvällen). Svenska turister vänder sig mot Stig, vinkar och ropar "Hallå där
  nere! Är du också från Sverige?", och en gäst håller ut en handspegel som portiern i rum 107:
  "Kallar ni det här för havsutsikt?". Lämnar du bilen med hjulen uppe på trottoaren under en balkong
  får du höra "Här nere parkerar de hursomhelst.", och tutar du vinkar svenskarna. Men på siestan,
  mellan ett och fem spansk tid, ska man inte tuta eller slå sönder något framför en señoras balkong:
  "¡Silencio! ¡Siesta!", och en rosa toffel kommer farande ner i huvudet på Stig (eller på biltaket).
  "Förlåt!", säger Stig till balkongen, och grannarna skrattar.
- **Hytt två! – ring efter en bil**: i telefonpaviljongen TELÉFONOS · HYTT 1·2·3 på Centro Nórdico
  kan Stig ringa efter en bil mellan uppdragen. Tryck **E** vid hytt 2: telefonisten ropar "Hytt två!"
  och en meny visar de namngivna bilar han får köra – Hyrbilen, SunTrips buss 17 och, när den är
  upplåst, Grisbilen – för 25 pta styck. **W/S** väljer, **E** ringer och **Q** lägger på. "Ja, hej.
  Hyrbilen, tack." Medan kameran är på hytten ställs bilen på parkeringen bakom honom, hel och lagad
  (en kvaddad bil kommer tillbaka som ny), telefonisten säger "Señor, betala!" (räcker inte kassan
  betalar Ole) och Stig tackar artigt. När han vänder sig om står bilen och väntar. Grisbilen? "Den
  luktar lite."
- **Poolbaren öppnar** (efter friskoteket): Berra hade rätt, "De har inte öppnat än", men när
  friskoteket är avklarat står det en bartender bakom BAR PISCINA vid Flamencos pool. Ställ dig vid
  diskens norra ände, vid perkolatorn, och tryck **E**: en kopp svenskt kaffe för 40 pesetas.
  "Äntligen riktigt bryggkaffe." I 30 sekunder springer Stig 20 % fortare (Shift) med koppen i
  handen, och en ruta under mätaren räknar ner. En påtår startar om de 30 sekunderna men ger inte mer
  fart. Har du inte råd skakar bartendern på huvudet. Står Berra vid baren höjer han glaset: "Ska du
  ha?" – "Nej tack, jag tål inte starksprit." Och hinner du ner till fru Storch på stranden innan
  kaffet är slut kan du ge henne koppen (**E**): "Finns det svenskt kaffe på hotellet?" – "Ja." Hon
  betalar 50 pesetas. Kaffet finns bara mellan uppdragen: när ett uppdrag börjar är det slut.
- **Meta från piren**: längst ut på hamnens pir, vid den gröna lyktan, står ett metspö i en hållare
  och en plåthink bredvid. Tryck **E** där: Stig ställer sig vid kanten och kastar, och flötet landar ute
  i hamnbassängen. Vänta. Ibland nappar det lite, sedan dyker flötet, och då har du en halv sekund på
  dig att trycka **E** igen. Fångsten kommer upp på linan och Stig visar upp den: en liten fisk ("Det är
  ungefär så här stort."), en gammal sko, en uppblåsbar hajfena av plast eller, mycket sällan, ett blött
  och tomt SPORT-KNÄCKE-paket, och då svarar han som i tullen: "En julklapp. Den är inte till mig."
  Fisken får simma hem igen, resten hamnar i hinken. Trycker du för tidigt, eller för sent, blir det bara
  ett plask och en tom krok, och **Q** lägger ner spöt medan du väntar. En FÅNGST-lapp uppe till vänster
  håller räkningen när du är på piren, och det man jagar är att få alla fyra. Fångsten sparas. Metandet
  finns bara mellan uppdragen.
- **Pesetas på marknadstaken**: i gången mellan marknadens två norra ståndrader står en ny låg
  studsmarkis med skylten ¡SALTA!. Hoppa upp på den så kastas Stig upp på markiserna, och ett spår av
  pesetas leder längs raden, över mittgången (dubbelhopp i sprint), över gången till nästa rad, till det
  ensamma fruktståndet och vidare upp på souvenirförsäljarens eget tak. Mynten går bara att ta där uppe,
  inte nerifrån marken. Försäljaren gillar inte folk på sitt tak: "¡No, no, no!". Efter uppdraget med
  åsnan ligger de sista mynten på hans tak, och när Stig skrapar ihop den sista peseten svär han
  "Jävla smålänningar!" – "Förlåt, förlåt…"
- **Vi liftar**: vid skylten CAMINO SIN ASFALTAR ute vid tomatfälten, och på vägen vid packhuset, kan
  Stig lifta. Tryck **E**: han ställer sig vid trottoarkanten med tummen ute, och efter en stund kommer
  en grisbil och stannar precis förbi honom. "Ursäkta… skulle jag möjligen kunna få åka med en bit?" –
  "Till stan, señor? Hoppa upp bak!" Stig klättrar upp på flaket bland grisarna, och bonden kör själv in
  till baksidan av Hotell Flamenco. Du styr inte, men du måste hålla balansen: luta Stig emot i
  kurvorna med **A**/**D** (och inte för mycket på raksträckorna), annars stiger ÅKSJUKA. Blir mätaren
  full ramlar han av, och grisbilen kör vidare: "¡Adiós, señor!". Kommer han ända fram kliver han av med
  ett "Jättefint! Tack." **E** hoppar av på vägen. Ingen SKANDAL, ingen bil som behöver kapas. Lifta går
  bara mellan uppdragen.
- **Livräddarens kikare**: på stranden står livräddartornet SOCORRISTA, och på räcket uppe på plattformen
  ligger livräddarens kikare. Gå uppför rampen och tryck **E**: Stig sätter kikaren för ögonen och skärmen
  blir två runda kikarglas med kraftig zoom. Ole har varnat honom för stranden, så Stig spanar efter
  faror ("Underströmmar, solsting och hajar…"). Vrid kikaren med musen eller **W**/**A**/**S**/**D**. Åtta
  saker står på listan uppe till vänster: hajfenan innanför bojlinan, herr Storch (som vänder sig mot
  tornet och filmar, med linsskyddet på), flotten, trampbåtarna, färjan, fiskebåten, fyren och
  RESERVADO-raden. Håll kikaren stilla på en av dem tills ringen i mitten har fyllts, så bockas den av,
  Stig säger något och du får 25 pesetas. Palmerna på strandpromenaden skymmer en del, så man får vrida
  och leta. När alla åtta är hittade sänker Stig kikaren: "Inga hajar. Bara svenskar." **E** eller **Q**
  sänker kikaren när du vill. Listan sparas. Kikaren finns bara mellan uppdragen. Tornets tak sitter nu
  högre, så att Stig får plats under det.
- **Stig på löpande band**: på gården framför packhuset ute bland tomatfälten står en förman i keps och
  vinkar in Stig: "¡Señor! Vi behöver folk till skiftet!" Tryck **E** hos honom: ett sorteringsband, två
  arbetare och tre lådor dyker upp, och Stig står bakom bandet. Röda tomater ska i ROJOS (**A**), ruttna i
  hinken (**S**) och gröna i VERDES (**D**), och tangenten tar tomaten i den gula zonen framför Stig.
  Bandet går fortare och fortare. Tomater som hamnar i fel låda studsar ut på marken, och de som Stig
  missar trillar av i änden. Ligger åtta på marken rasar högen: TOMATRAS!, och Stig står där med famnen
  full: "Ursäkta… ett ögonblick bara…". Varje full låda får stämpeln KONTROLLERAD AV G17, ett helt skift
  ger 100 pesetas, och flest fyllda lådor på ett skift är rekordet (det sparas). **Q** avslutar skiftet.
  Går Stig sedan förbi Siv vid poolen säger hon: "Spänn av, Stig-Helmer. Du är ledig." Förmannen är där
  på dagen, och skiftet finns bara mellan uppdragen.
- **Strandvolley mot Berra och Robban**: volleybollplanen på stranden bredvid trampbåtsuthyrningen har
  fått en riktig boll, rödvit, som rullar när Stig sparkar på den, går in i den eller kör på den. Mellan
  uppdragen, när Ole, Berra och Robban är lediga, trycker du **E** vid bollen ("Spela volley"). Efter en
  kort övertoning står Ole bredvid Stig och Berra och Robban på andra sidan nätet: först till fem. Spring
  dit bollen ska ner (en ring på sanden visar var) och tryck **J** i rätt ögonblick, så sparkar Stig den
  över nätet åt det håll han tittar. Hoppar han in i bollen nickar han den. Ole tar de bollar som landar
  långt från Stig och lägger upp dem åt honom. Berra och Robban lunkar efter sina bollar (Robban är
  långsammast) och lobbar tillbaka, och ju fler poäng som spelats desto törstigare och slarvigare blir de:
  "Jag är törstig, Berra." – "Du har ingen karaktär alls, Robban." En boll som landar på ens egen sida är
  motståndarnas poäng, en boll utanför linjerna är den slagnas förlust. Tavlan uppe i mitten visar
  ställningen. Vinner Stig och Ole ger de andra upp och går mot baren; förlorar de kan du trycka **E** för
  revansch. **Q** ger upp. Matchen ger inga pengar, men vinster och förluster sparas. Den finns bara mellan
  uppdragen, och inte medan Ole eller Berra har ett uppdrag att ge.
- **"Kan du ta ett kort på oss?"**: när "Caballo folklorístico" är klart står ett solbränt svenskt
  turistpar på fyrplanen framför Faro de Maspalomas, han i blommig skjorta med kameran på magen och hon i
  prickig klänning. Hon vill att Stig tar ett kort på dem, och fyren ska vara med. Tryck **E** så räcker
  han över kameran ("Bara att knäppa. Den har motor!") och skärmen blir dess sökare. Sikta med musen, gå
  med **W**/**A**/**S**/**D**, vänd kameran på högkant med **högerklick** eller **V** och knäpp med
  **Space**: Stig säger "Säg… omelett." Under sökaren står om båda kommer med, om de syns ordentligt och
  om fyren är hel. Fyren är 56 meter hög, så nära paret får du bara med foten, och backar du ända ner mot
  vattnet blir paret bara prickar. Det finns ett rätt svar. Ett bra kort ger 100 pesetas i dricks ("Å, vad
  fint det blir i albumet!"), bara foten eller ett pyttelitet par 10. Kommer de inte med alls får du
  försöka igen. Sedan går paret vidare, och ett nytt par väntar vid dynerna (båda dynerna ska vara med)
  och därefter vid porten till LA MEDINA (hela porten ska vara med), och sedan vid fyren igen. Paren finns
  bara på dagen och mellan uppdragen.
- **Guaguan**: stadens tretton gröna PARADA GUAGUA-hållplatser fungerar. Ställ dig vid en och tryck
  **E** ("Vänta på guaguan"): Stig spanar uppåt gatan, och efter några sekunder rullar en grön guagua in
  och stannar med dörren vid bänken. "¡Buenas! Ska señor med?" Tryck **E** vid dörren ("Kliv på
  guaguan"), betala tio pesetas och sätt dig längst fram bredvid chauffören. Första gången sitter Ole vid
  ett fönster och snackar fotboll: "Las Palmas! Bra fotballag… Øverste divisjon!" – "Hammarby är också ett
  bra lag." – "Bajen… Hammarby… Bajen…" (står Ole inom synhåll säger chauffören Las Palmas-repliken
  själv). Senare turer har chauffören egna repliker. Medan bussen kör väljer du hållplats med
  **W**/**S** (först nästa på linjen), och efter en stund tonar bilden ut och Stig står vid den
  hållplatsen med bussen bredvid sig: "¡Hasta luego, señor!" **E** kliver av där direkt. Trafikens
  guaguor går fortfarande att sno ("Ta bilen"), men den här är inte till salu. Guaguan går bara mellan
  uppdragen.
- **Traktorn med släpkärran**: vid redskapsboden på tomatfälten (kvarteret norr om stan, väster om
  grisfesten) står bondens lilla röda traktor med tomatlådor på släpet. Tryck **E** ("Låna traktorn"):
  "Jag lånar den bara en liten stund!" Ur boden kommer bonden i halmhatt och springer efter med "¡Mi
  tractor! ¡Señor!", men i 18 km/h hinner han ändå aldrig ikapp, och Stig ropar artigt tillbaka att
  han ska ställa tillbaka den sen. Efter en stund ger bonden upp ("¡Ay… suecos!") och går in igen.
  Kliver Stig av medan bonden är nära kommer han fram och tar tillbaka sin traktor: "¡Mi tractor! ¡Por
  fin!" – "Tack för lånet!". Över tomatraderna skumpar traktorn rejält, löven yr och Stig muttrar "Jag
  har lite anlag för åksjuka."; ute på vägarna samlas en kö av tutande bilar bakom den ("Förlåt! Den går
  inte fortare."). En traktor som lämnats någonstans har bonden hämtat hem när ingen ser. Traktorn går
  bara att låna mellan uppdragen: "Traktorn går bara i 18 km/h – ta en riktig bil."
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
- **Stunthopp med G17-stämpel**: mellan uppdragen mäts varje riktigt hopp med bilen. LUFTTID tickar
  medan bilen är i luften, och när den har landat och kört vidare en sekund slår en röd stämpel ner:
  KONTROLLERAD AV G17 (GODKÄND före Fataga). Slår bilen i något under hoppet eller strax efter, eller
  kvaddas den, blir det UNDERKÄND. Flaggskeppet är en ny planka i östra änden av byggets första
  våning: kör uppför uppfarten från gatan i väster, sakta in och sväng ut på den smala remsan längs
  kanten, gasa och flyg ut över vägen mot drömplanet medan Stig mumlar "Jag kan flyga, jag är inte
  rädd.". Kliv ur vid planet så står han med armarna ute. Den gula rampen på byggets gård kräver fart
  (runt 70 km/h, annars slår bilen i uppfarten), och de halvbyggda garagens däck räknas också. Varje
  namngivet hopp ger 100 pta första gången det blir godkänt och sedan 25 pta för ett nytt rekord
  (längden sparas).
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
- **Badgäster på solstolarna**: på dagen ligger turister på solstolarna närmast Stig, på stränderna
  och vid hotellens pooler, och de blir rödare ju längre de ligger: först bleka, sedan rosa, till sist
  hummerröda. Sparka en solstol (eller kör över den) där någon ligger, så slår badgästen en baklänges
  kullerbytta över ryggstödet och klagar ("Jag ska tala med platschefen!"), reser sig och muttrar om
  solen. Det ger inte mer SKANDAL än en tom solstol. När solstolen står där igen ligger någon ny och
  blek där, och varje morgon kommer en ny skara. Mellan buss 17 och bodegan ligger Berra och Robban
  hummerröda och snarkar på två solstolar på Flamencos pooldäck. Tryck E vid Berra: Stig säger
  "Ursäkta… ni bränner er.", Berra lyfter huvudet, "Fem minuter till…", och Robban pratar i sömnen.
- **Bränsletillägg tillkommer – SunTrip-butiken**: på SunTrip-kontorets veranda står en gul disk
  mellan uppdragen, och bakom den står reseförsäljaren. Där kan Stig köpa filmens vita SunTrip-hatt,
  solglasögon, en prickig skjorta och ett nässkydd. Skylten säger 100 pta för hatten, men kvittot
  växer rad för rad med högsäsong, avbeställningsskydd, reseförsäkring och bränsletillägg, och Stig
  suckar "Det var en väldigt massa tillägg…". Hatten säljs bara på SunTrips Trapp Trull-konto: en
  tredjedel nu och två avbetalningar som dras senare, mitt i något annat. Går han därifrån utan
  strandväskan ropar försäljaren "Paketet!" efter honom, och nässkyddet är gratis, plus
  bränsletillägg. Det han köper har han på sig direkt mellan uppdragen, även efter omstart, och vid
  disken kan han ta av och på sig sakerna igen. Under uppdragen är disken borta.
- **Smörj in Majsans rygg**: efter Fataga står Majsan vid Flamencos pool och vill bli insmord. På
  dagen och mellan uppdragen: tryck E vid henne ("Smörj in ryggen"). Första gången säger hon filmens
  två repliker, "Du, vill du smörja in mig på ryggen?" och "Ta inte för mycket, då kan det börja
  koka.". Sedan vänder hon ryggen till, Stig lägger händerna på hennes axlar och SOLKRÄM-mätaren
  visas. Håll in E så fylls den, och släpp i det gröna. Mitt i det ljusa strecket blir det sju poäng,
  nära mitten sex och annars fem, och Siv håller upp poänglappen från sin plats ("Giraffen, då?
  Sju."). Håller du för länge rinner krämen nerför Majsans klänning ("Oj! Nu kokar det!"), Stig
  skyller på flaskan och Siv ger minuspoäng; släpper du för tidigt undrar Majsan om det var allt. Det
  gröna blir smalare för varje försök, och ditt bästa resultat sparas. Första sjuan slår
  pizza-racern, och då har Siv något nytt att prata om vid poolen. Efter slutet har Små grodorna
  systrarna i poolen från nio på morgonen, så då får det bli tidigt.
- **Prata med gänget**: mellan uppdragen kan du gå fram till Ole, Majsan, Siv, Berra, Robban,
  Angerud, Lasse, Affe, Gabbe, paret Storch eller José och trycka E ("Prata med Ole"). Då blir det en
  kort växling i pratbubblor där Stig själv svarar, och vad de pratar om beror på hur långt resan har
  kommit. Ole säger "Tenk å sitte her i desember. Det er som i Rio." från ankomsten fram till julafton
  (Stig frågar om han har varit där, och det har han inte, men han ska resa dit), och mellan
  grisfesten och julafton undrar Stig om man måste gå på julfesten ("Var inte så typiskt svensk.").
  Efter slutet har alla nya repliker, och vid bodegan frågar Berra "Ska du ha?". Tryck E igen så
  kommer nästa växling, och när de är slut börjar de om. Den som delar ut nästa uppdrag har sitt
  vanliga E, och de som dansar Små grodorna i poolen får du prata med på kvällen eller morgonen.
- **Hoppet mellan hotelltaken**: mitt emot bensinstationen står APARTAMENTOS SOL DE INVIERNO och HOTEL
  ATLÁNTICO, sju våningar höga med en smal glipa emellan. Mellan uppdragen kan du gå in genom
  lobbydörren till SOL DE INVIERNO (hissen är trasig, ASCENSOR AVERIADO) och trycka E, "Ta trappan
  upp". Efter en kort övertoning står Stig andfådd vid hisshuset på taket ("Sju våningar…"). Följ
  mynten till västra kanten, ta sats och hoppa: över glipan slår han ut armarna och säger "Jag kan
  flyga, jag är inte rädd.". Ett hopp i full fart räcker om du hoppar nära kanten, annars får
  dubbelhoppet hjälpa till. På ATLÁNTICOS tak står broschyrens skylt BALKONG MED HAVSUTSIKT OCH
  KVÄLLSSOL vid södra kanten, det ligger mynt bredvid, och där säger Stig äntligen "Nu har jag
  havsutsikt.". Ner kommer du med trappan (dörren på hisshuset), med R, eller genom att springa rakt
  ut över västra kanten och ner i hotellpoolen intill: ett magplask, eller en bomb om du trycker J i
  luften. Under en jakt med Guardia Civil är trappan stängd, och under uppdragen går taken inte att
  stå på.
- **Mikrofonen på scenen**: på SunTrips välkomstscen står ett mikrofonstativ mellan högtalarna. Mellan
  uppdragen kan du kliva upp på scenen och trycka E, "Läs ett utrop". Det plingar i högtalarna och
  Stig läser upp ett av Lasses utrop med tjänstemannaallvar, och hotellet gör som han säger. "Ni bör
  inte dricka vattnet." får gästerna vid terrassborden att spotta ut drinkarna. Vid "Grisfesten är på
  torsdag och kostar 800 pesetas. Några frågor?" strömmar turister och de i gänget som är lediga in på
  gräsmattan och hurrar, och sedan kommer filmens frågestund: fru Storch undrar om det finns svenskt
  kaffe, Ole om det finns norskt, och Stig svarar "Ja." båda gångerna. Klockslaget läser han från öns
  klocka, och Ole i publiken svarar (har du hittat hans klocka får du höra vad den kan). Vid
  "Friskoteket börjar halv tio varje morgon." sjunker publiken ihop och glider därifrån. Så länge
  hajfenan cirklar i SunTrip-poolen ropar han också "Hajar i poolen!", och då flyr solbadarna från
  solstolarna medan Lasse viftar bort det. Varje tryck tar nästa utrop i tur och ordning, och efter
  ett par sekunder kan du ta nästa. Under en jakt med Guardia Civil är mikrofonen avstängd, och när
  ett uppdrag börjar går alla hem.
- **Fåglarna som lyfter**: duvorna runt fontänen på plazan, måsarna vid glasskiosken HELADOS · GLASS
  på stranden och på piren i hamnen, och de två hägrarna i La Charca pickar, tar några steg och
  vänder sig. Spring, hoppa eller kör in bland dem, eller tuta, så lyfter de som är närmast med
  vingslag (måsarna skriker, hägrarna kraxar), flyger några varv och landar på sina platser igen
  efter ungefär en halv minut. Står du still kan du stå mitt bland dem, och bara du skrämmer dem,
  aldrig trafiken. Springer Stig rakt in i flocken håller han upp händerna och säger "Oj! Förlåt,
  förlåt!". Ingen fågel kommer till skada: de lyfter alltid i tid. Bland hägrarna står en stork. När
  paret Storch står på stranden cirklar den inte, utan flyger österut längs kusten och landar bredvid
  fru Storch. Följ efter, så säger Stig "Oj, en stork!", fru Storch rättar honom första gången ("Vi
  heter faktiskt Storch, inte Stork.") och herr Storch filmar storken en stund innan den flyger hem.
  Under uppdragen står fåglarna stilla.
- **Gags på E**: två korta filmscener som du hittar genom att E-prompten dyker upp. Under pergolan vid
  Hotell Flamenco ligger Oles kameraväska på den låga muren vid rum 109 ("Titta på Oles
  kameraväska"). Ole visar sin andra kamera ("Kamera to – japansk, liten, motor… Blits… Telelinse…
  Normal."), frågar om Stig har någon, fnyser "Gammelt…", och när Stig försvarar sig med "Fast det är
  blixt." lyfter Ole kameran: "Si omelett!", och blixten går. Vid Viking Bars dörr i La Medina
  ("Beställ en juice") beställer Angerud "En Viking special till, tack." och Stig en juice av
  Carmencita. Medan hon hämtar dem håller Stig upp muggen under lampan bredvid dörren, som under
  anropsknappen på planet: "Om man vill ha lite mer juice…?". Angerud tittar inte ens upp. Första
  gången ger varje gag 100 pesetas och ett streck på raden "Gags" (på den stora kartan, M), sedan kan
  den spelas om hur många gånger som helst. Bara mellan uppdragen och inte under en jakt. Efter slutet
  ligger Angerud på sjukhus, så då finns bara kameraväskan kvar.
- **Strandkyssen i bränningen**: nere i vattenbrynet nedanför Flamenco ligger en ensam handduk, blå
  med vita prickar som Majsans klänning. Ställ dig vid den mellan uppdragen och tryck **E** (Lägg dig i
  vattenbrynet), så lägger sig Stig på den och bilden bleknar till vitt. I åtta sekunder är ön en dröm:
  solnedgång, mjuk bild med vita kanter, DAGDRÖM och valsen, och Majsan ligger bredvid honom i
  bränningen medan skummet sköljer över dem. Hon viskar "Då kanske vi ses…", och kameran glider bort
  mot himlen innan något hinner hända. Sedan en vit blixt: det är som förut igen, Majsan är borta och
  en riktig våg rullar in över honom. "Blött." Ibland står Siv på sanden och sätter poäng ("Giraffen,
  då? Fyra."), och efter berättelsen står Majsan själv där och frågar om han vill dansa. Stig reser sig
  och droppar en stund. Ingenting av drömmen finns kvar under uppdragen.
- **Uppför fyren**: vid fyrvaktarbostadens välvda dörr under skylten FARO DE MASPALOMAS · 1890 kan du
  mellan uppdragen trycka **E** (Gå upp i fyren). Skärmen blir svart, "Många trappsteg senare …", och
  har det varit dag har eftermiddagen hunnit gå: Stig står på fyrens galleri 51 meter upp i
  solnedgången med hela stan under sig. "Femtio meter … det är ju nästan som att flyga." Kameran gungar
  av svindel. Gå runt galleriet med A och D (musen vrider kameran runt tornet), och står han still vid
  räcket och tittar ut ser du stan som han ser den. Håll **J**: Stig gör Levanders övning med ryggen
  mot lanterninen, armarna rakt ut och ögonen slutna, säger mantrat och svindeln lägger sig. Står han
  kvar med övningen medan lanterninen ännu är släckt blir det svart en lång stund, och när han öppnar
  ögonen är det natt, lanterninen lyser och ljuskäglan sveper förbi över hans huvud. Ner kommer du med
  **E** vid lanterninens dörr ("… och lika många ner.") eller med R. Räcket är stängt runt om och man
  kan inte hoppa där uppe. Under en jakt med Guardia Civil är dörren stängd.
- **Ringklockan i receptionen**: vid portierns disk på Hotel Flamenco står tre avresande gäster med
  resväskor i kö mellan uppdragen, förra veckans gäster och inte Stigs sällskap. Då och då frågar
  någon "Och när ska vi lämna rummen?", och portiern svarar "Momento.". Tryck **E** vid klockan på
  disken (Plinga på klockan): pling, och portiern säger "Momento." igen. Ingenting händer, ända tills
  det tionde plinget i rad. Då ringer portiern efter platschefen, Lasse svarar i radiorutan "Klockan
  12. Ställ väskorna utanför receptionen.", och direkt efteråt frågar nästa gäst i kön samma sak igen.
  Stig mumlar "Förlåt…" och portiern lägger klockan under disken. När Stig har varit borta en stund
  står den där igen, med en handskriven lapp bredvid: PLINGA EN GÅNG · TOQUE UNA VEZ. Under
  uppdragen är kön borta och klockan bara en klocka.
- **Gatlopp mot pizza-racern**: efter Gamla kläder har José ett turkost utropstecken vid Centro
  Nórdico mellan uppdragen. Gå fram till honom och tryck **E** (Gatlopp 1/3), så utmanar han: "Ett
  varv runt centrum, Stig? Mamma åker med." Det blir svart, och sedan står Stig i hyrbilen vid
  banderollen SALIDA · START bredvid José i hans blå halvkombi, med mamma i framsätet. Tre, två, ett,
  KÖR! Det finns tre lopp, och nästa öppnas när man vunnit det förra: ett varv runt centrum (runt
  Hotel Flamenco och bensinstationen), till flygplatsen och ut på vischan längs vägen norr om stan mot
  Eslöv-skylten. José är snabb, så ett rent lopp vinns med ett par sekunder och en krock förlorar det.
  Vinst ger 300, 400 och 500 pta. Före loppet kan du slå vad vid griffeltavlan bredvid Berra och
  Robban vid poolbaren (efter julafton vid Pepes Bodega): Berra satsar på spanjoren, och Robban betalar
  fem gånger pengarna om Stig vinner. Vinner du alla tre har Siv och Majsan något att säga vid poolen.

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
- garderoben i rum 107 som gömställe: Stig byter tillbaka till kostymen, och polisen som letar efter
  "el de la camisa" går förbi honom (i filmen är det Ole som får honom att byta från kostymen till
  skjortan i det rummet, och ingen jagar honom)
- kyrkfrid i Templo Ecuménico: polisen som läser systrarnas skylt ES UNA IGLESIA högt, stavar sig
  igenom svenskan och kliar sig i huvudet, och Stig som kikar ut med "Hoppas vi inte får användning för
  det." (i filmen är båda replikerna systrarnas språkkursskiva hemma, och ingen går in i kyrkan)
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
- att Stig lånar rullskidorna, hans fall på trottoarkanter och sand, att folk ropar "Heja Eslöv!"
  åt hans nummerlapp och Eslövrundan med resultatlistan (raden blinkar åt kaptenens "Stenmark ligger
  trea efter första åket.")
- golfbilarna vid klubbhuset, pip-pip-tutan, bunkrarna och dammen (i filmen finns ingen golfbil, och
  "Jag pliktar ett slag." hörs på golfrundan)
- båtturen med PALOMA från hamnkiosken till fyren och tillbaka, hajfenan i hamnbassängen och reprisen
  av slutbilden efter slutet (i filmen är slutbilden en båt utanför Copacabana, och Rio-repliken sägs
  vid välkomstmötet)
- grannarna på balkongerna, señoran och hennes toffel på siestan och Stigs "Förlåt!" (i filmen är
  spegeln portierns i rum 107, havsutsiktsrepliken sägs där och parkeringsrepliken är Majsans på
  systrarnas balkong)
- att ringa efter en bil från hytt 2 på Centro Nórdico, bilmenyn och telefonisten som ställer bilen på
  parkeringen (i filmen ringer Angerud Levander från en telefonstation; "Hytt två" sägs på engelska och
  någon kräver "Señor, betala!", men anteckningarna säger inte vem)
- poolbaren som öppnar efter friskoteket, bartendern, kaffets fart, påtåren och koppen till fru
  Storch (i filmen är Berras "Ska du ha?" på Arlandas herrtoalett, frågan om svenskt kaffe och dess
  "Ja." sägs på välkomstmötet, och ingen bar i filmen serverar Stig-Helmer)
- metandet från piren, metspöet vid lyktan, fångsterna och FÅNGST-lappen (filmen har inget metande:
  "En julklapp. Den är inte till mig." säger Stig-Helmer i tullen på Arlanda, och "Det är ungefär så här
  stort." sägs när de letar knäckebröd i affärerna, utan att det framgår vem som säger det)
- studsmarkisen och myntspåret över marknadens markiser, och souvenirförsäljarens "¡No, no, no!" och
  svordom åt Stig på hans tak (i filmen svär han "Jävla smålänningar!" när Ole prutar ner åsnan, och
  ingen klättrar upp på något stånd)
- livräddarens kikare, spaningen och listan med åtta saker att hitta (i filmen varnar Ole för stranden
  med sin statistik om underströmmar, solsting och hajar, och linsskyddet upptäcks på julfesten:
  "Du måste ta av objektivlocket.")
- skiftet vid packhusets sorteringsband, förmannen, arbetarna, tomatlådorna med stämpeln och raset (i
  filmen kontrollerar Stig-Helmer brödrostar hemma: "Om du köper en brödrost, och det står 'Kontrollerad
  av G17', så är det jag", tomaterna körs till packhusen med lastbil, och "Spänn av, Majsan. Du är ledig."
  sägs till Majsan)
- strandvolleyn mot Berra och Robban (filmen har ingen volleyboll: törstreplikerna sägs på vägen till
  bodegan, vid poolen och på vischan, och Oles "Heia Norge!" avslutar hans dans på grisfesten)
- turistparen som vill ha ett kort, kamerans sökare och dricksen (i filmen säger Ole "Säg omelett." när han
  fotograferar Stig-Helmer under julklappsjakten, och svenskarna på gatorna går med kameran på magen)
- guaguan från hållplatserna, åkturen bredvid chauffören, hans repliker, biljetten och hållplatsernas
  namn (i filmen hörs fotbollssnacket "Las Palmas! … bra fotbollslag… Högsta divisionen!" / "Hammarby är
  också ett bra lag." / "Bajen… Hammarby… Bajen…" på transferbussen, och vem som säger vad är vår tolkning)
- traktorn med släpkärran vid tomatfälten, bonden som springer efter, tutkön och skumpet över fårorna (i
  filmen finns ingen traktor, och "Jag har lite anlag för åksjuka." sägs på bussen; att det är Stig-Helmer
  som säger det är vår tolkning)
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
- stunthoppen med LUFTTID och stämpeln KONTROLLERAD AV G17 eller UNDERKÄND, hoppens rekord och
  pesetas, plankan på byggets första våning och Stigs armar ute vid drömplanet (i filmen står G17 på
  hans brödrostar, och drömplanet är en syn i dimma; ingen bil flyger)
- hopptornet vid Flamencos pool, mantrat på väg ned, bomben och magplasket, och att Lasse ringer om
  det (i filmen upprepar Lasse en gästs samtal i telefonen, och ingen hoppar)
- vakthundarna på bungalowtomterna och gården på vischan, ägarna som visslar hem dem och att Stig
  säger "Fin hund…" och mantrat till dem (i filmen nosar en narkotikahund på Stigs paket vid
  bagagekontrollen på Arlanda, och någon säger "Fin hund.")
- badgästerna som bränns på solstolarna och flyger av en sparkad solstol, och att Berra vaknar för
  "Fem minuter till…" (i filmen somnar Berra och Robban i solen och bränner sig, men ingen sparkar en
  solstol)
- SunTrip-butiken på ön och att Stig handlar där, tilläggen på varje kvitto, Trapp Trull-kontots
  avbetalningar, strandväskan och "Paketet!" vid disken, och Oles kommentar om hatten (i filmen säljer
  en resebyrå i Stockholm tilläggen, kontot och nässkyddet till paret Storch, och det är oklart vem
  som köper nässkyddet)
- brödrostarna runt ön, provrostningen och etiketten KONTROLLERAD AV G17 som Stig sätter på en
  godkänd rost (i filmen är G17 bara det han skryter om för Majsan vid poolen, och ingen rostar bröd)
- de borttappade väskorna i inlandet som Stig bär på huvudet till hittegods och får hittelön för, och
  Angeruds radiosamtal när alla sex är inlämnade (i filmen är det Stigs egen väska som kommer bort och
  kommer tillbaka på julafton med "Hammarby…?" och "Hittelön.", och Angeruds tips om hittelön är en
  vink om att stjäla)
- hyllan i rum 107 som Oles prylar hamnar på när de hittas, hajfenorna i en hög vid Stigs säng, Stigs
  "Kontrollerad av G17." vid hyllan och Oles räkning i radion (i filmen visar Ole sina prylar i rummet,
  men där finns ingen hylla)
- garderoben i rum 107 som klädmeny, med rocken, skjortan och Rio-smokingen, och Oles repliker om
  kläderna i radion (i filmen klär Ole om Stig i rummet en gång, Arlanda-rocken syns bara på
  flygplatsen och smokingen bara i slutscenen; "Det måste vara värmen." säger Angerud efter golfen och
  Oles bergsprängare demonstreras på planet)
- SOLKRÄM-mätaren när Stig smörjer in Majsans rygg, Sivs poänglappar för det och krämen som rinner
  när han tar för mycket (i filmen är solkrämen bara poolprat, och ingen sätter poäng på den)
- samtalen med gänget på E mellan uppdragen, där Stig svarar (replikerna kommer från andra scener i
  filmen eller är våra: Oles Rio-replik sägs på välkomstmötet, julfestrepliken på julaftons morgon)
- taken på HOTEL ATLÁNTICO och APARTAMENTOS SOL DE INVIERNO, trappan upp med den trasiga hissen,
  hoppet över glipan med mantrat, broschyrskylten och Stigs havsutsikt där uppe, och språnget ner i
  poolen (i filmen är havsutsikten en spegel som portiern håller ut från hotellrummet, och ingen går
  upp på något tak)
- Stig vid mikrofonen på SunTrip-scenen: gästerna som spottar ut drinkarna, publiken på gräsmattan
  med frågestunden, Oles svar om klockan, publiken som sjunker ihop vid friskoteket och solbadarna som
  flyr en hajvarning som stämmer (i filmen läser Lasse utropen i transferbussen och på välkomstmötet,
  och "Hajar i poolen?" säger han i telefon)
- fåglarna som lyfter och landar igen när Stig springer, kör eller tutar bland dem, Stigs ursäkt till
  dem, och storken i La Charca som flyger till paret Storch på stranden (i filmen syns inga fåglar, och
  storken är bara ett skämt om parets namn: på Arlanda, på välkomstmötet, i telegrammet och på
  friskoteket)
- gagsen på E, med Oles blixt under pergolan och Stigs mugg under lampan vid Viking Bar, och raden
  "Gags" (i filmen pratar Ole och Stig kameror i rum 107, "Säg omelett." sägs under köpäventyret,
  Viking special dricker Angerud i baren efter grisfesten, och muggen lyfts mot anropsknappen på
  planet)
- handduken i vattenbrynet och Stigs dagdröm där om strandkyssen med Majsan, vågen som väcker honom med
  "Blött.", Siv som sätter poäng på sanden och Majsan som efter berättelsen bjuder upp honom där (i
  filmen dagdrömmer han om kyssen i Stockholm, efter bärgningen, och ingen våg väcker honom)
- att Stig lånar Guardia-jeepen vid kasernen, sirenen på H som får trafiken att väja, Angeruds utbrott
  och polisens "Ursäkta, är det din bil?" efter en jakt (filmen har ingen Guardia-scen: frågan, svaret,
  bärgningen och Angeruds utbrott hör till trafikvakten vid resebyråns skyltfönster i Stockholm)
- klättringen upp i Faro de Maspalomas, svindeln på galleriet och Levanders övning mot lanterninen med
  slutna ögon tills det blir natt (fyren finns på riktigt men är ingen filmplats: övningen gör Stig på
  flygrädsleklinken, och mantrat säger han till Majsan en varm natt på ön)
- kön av avresande gäster vid Flamencos reception, ringklockan som först svarar på tionde plinget,
  portierns samtal till Lasse och lappen PLINGA EN GÅNG (i filmen frågar gästerna Lasse på hotellet
  medan planet flyger söderut, och portierns "Momento." hör till scenen med havsutsikten)
- Josés tre gatlopp mot Stig med mamma i bilen, vadslagningen hos Berra och Robban och systrarnas
  sexa till Giraffen när alla tre är vunna (i filmen kör José aldrig ikapp med någon: systrarna kallar
  honom "pizza-racern" och sätter poäng på männen på planet)
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
src/game/closet.js              Skjortbytet in free roam: room 107's wardrobe as a hideout, the officer walking past
src/game/church.js              Kyrkfrid in free roam: Templo Ecuménico's door as a hideout, the officer at the sign, the peek out
src/game/berraJob.js            Bärra hem Berra in free roam: Berra's naps, Robban's ask, the carry, drops and pay
src/game/glide.js               Jag kan flyga in free roam after julafton: J held in the air glides, the landing roll
src/game/poolJudges.js          Siv och Majsan sätter poäng in free roam: dives off Flamenco's board, cards, record
src/game/honk.js                Tutan som folk reagerar på in free roam: pedestrians hop, the gang answers, the grunt
src/game/dayClock.js            Dygnet runt in free roam: the island's clock, evenings and nights, Ole's watch, the nap
src/game/storchFilm.js          Lite film. in free roam: Herr Storch films the tricks, his viewfinder, stills, film night
src/game/eslov.js               Heja Eslöv! in free roam: the rollerskier trains, answers the horn, Eslövloppet
src/game/rollerskis.js          Låna rullskidorna in free roam: Stig on the skier's skis (surfaces, falls, "Heja Eslöv!"), Eslövrundan
src/game/poolFest.js            Små grodorna i poolen after the end: the ring in the pool, the porter, Stig dancing, the counter
src/game/stigSorry.js           Förlåt, förlåt! in free roam: Stig's sorry for kicks, knock-downs, breakage and carjackings
src/game/pigTruck.js            Grisarna ramlar av grisbilen in free roam: the pigs tumble off, the catch, the pen at the farm
src/game/baggageBelt.js         Åk bagageband in free roam: the belt at Gando carries Stig, he sits on a bag, the turns
src/game/lapplisa.js            Lapplisan Majsan in free roam: the ticket and the tow, Angerud's hire car and the film scene, the bay praise
src/game/grisfestFree.js        Grisfest varje torsdag in free roam: 800 pesetas at the gate, the evening, Majsan's invitation
src/game/fruitStands.js         Rakt genom fruktståndet in free roam: his car through the market's fruit stalls, the seller, the swear
src/game/diveTower.js           Från fjärde våningen in free roam: the 10 m diving tower, the ladder, the cannonball, the belly flop
src/game/dogs.js                Fin hund… in free roam: the watchdogs in the bungalow gardens and at the farm, Stig's hands and lines
src/game/bathers.js             Badgäster på solstolarna in free roam: bathers on the loungers, their burn, the fly-off, Berra and Robban fried
src/game/suntripShop.js         Bränsletillägg tillkommer in free roam: SunTrip-butiken, the receipts, the Trapp Trull account, his bought look
src/game/toasters.js            Kontrollerad av G17 in free roam: the seven toasters, the timing game, the label, the sisters' line
src/game/lostBags.js            Hittelön in free roam: the lost suitcases' lift onto his head, the carry, the drop, the counter at Gando, the exchange and the pay
src/game/room107.js             Rum 107 fylls med resans minnen in free roam: the keepsake shelf, the giraffe, the boombox; the wardrobe's outfits (feature 67)
src/game/solkram.js             Smörj in Majsans rygg in free roam: the SOLKRÄM meter, Siv's cards, the cream running
src/game/stunts.js              Stunthopp med G17-stämpel in free roam: his car's jumps measured, LUFTTID, the stamp, the records
src/game/gangTalk.js            Prata med gänget in free roam: E talks to the gang, the exchanges by part of the trip
src/game/roofJump.js            Hoppet mellan hotelltaken in free roam: the walkable hotel roofs, the stairs, the jump, the pool
src/game/mic.js                 Mikrofonen på scenen in free roam: Lasse's announcements at the SunTrip stage, the crowd, the reactions
src/game/birds.js               Fåglarna som lyfter in free roam: the flocks that lift and land, Stig's sorry, the stork's trip and scene
src/game/gags.js                Gags på E in free roam: Ole's flash at his camera bag, the juice under Viking Bar's lamp, the Gags count
src/game/beachDream.js          Strandkyssen i bränningen in free roam: the towel, the daydream with Majsan's double, the wave, Siv or Majsan on the sand
src/game/guardiaJeep.js         Låna Guardia-jeepen in free roam: the loan and its SKANDAL, the bust's question and tow, the siren on H, the traffic giving way
src/game/lighthouse.js          Uppför fyren in free roam: the stairs up the lighthouse, the gallery's cameras and vertigo, the exercise, the night
src/game/receptionBell.js       Ringklockan i receptionen in free roam: the queue at Flamenco's desk, the bell's plings, the tenth's call, the card
src/game/streetRace.js          Gatlopp mot pizza-racern in free roam: José's three street races (the race kind outside the runner), the bet, the sisters' six
src/game/golfCart.js            Golfbilen in free roam: the golf carts (never a mission's), the pip-pip, the bunkers' sand and the pond's splash
src/game/boatTrip.js            Båtturen med PALOMA in free roam: the kiosk, the trip's fixed shots, the doubles, the fin, the end card again after the end
src/game/residents.js           Balkongerna lever in free roam: the residents on the slabs' balconies, their calls, the parking line, the señora's slipper at siesta
src/game/phoneBooth.js          Hytt två! in free roam: booth 2 at Centro Nórdico, the menu of named cars, the call, the car moved whole to the car park
src/game/poolBar.js             Poolbaren öppnar in free roam after friskoteket: the bartender, the coffee and its 30 s sprint, Berra's "Ska du ha?", the cup for Fru Storch
src/game/fishing.js             Meta från piren in free roam: the rod at the pier's end, the cast, the float's dive, the catches, the FÅNGST card
src/game/marketRoofs.js         Pesetas på marknadstaken: the coin trail over the market's awnings (minY), the roof's coins after asnan, the seller's "¡No, no, no!" and swear
src/game/hitch.js               Vi liftar in free roam: the hitch-hiking spots, the grisbil that stops, Stig standing in its bed, the lean and ÅKSJUKA, the fall, the drop behind Flamenco
src/game/binoculars.js          Livräddarens kikare in free roam: the lifeguard tower's binoculars, the 12° view (the camera's scope), the eight targets, the list, "Inga hajar. Bara svenskar."
src/game/packhus.js             Stig på löpande band in free roam: the packing shed's foreman, the shift at the sorting belt, A/S/D, the G17 stamp, TOMATRAS, the record, Siv's line
src/game/volley.js              Strandvolley in free roam: the court's live ball, the match against Berra and Robban, Stig's kick and header, Ole's set, the thirst, the board
src/game/touristPhoto.js        "Kan du ta ett kort på oss?" in free roam: the tourist couples at the lighthouse, the dunes and LA MEDINA, their camera's viewfinder (the scope, on end), the reading, the snap, the tips
src/game/guagua.js              Guaguan in free roam: the 13 PARADA GUAGUA stops, the wait, the green guagua that stops at the bench, the seat beside the driver, the film's football talk, the stop chosen with W/S, the fade off there
src/game/traktor.js             Traktorn med släpkärran in free roam: the farmer's tractor at the tomato fields (a toy: never a mission's), the farmer running after it, the furrows' jolts and the åksjuka, the honking queue, the fetch home
src/game/hud.js                 HUD, minimap, big map, dialogue, portraits, objective card, banners
src/game/camera.js, fx.js, markers.js
tools/shot.mjs, tools/lib.mjs   headless test driver and the T API (timer statistics `pct`, `timerRange`)
tools/scenarios/*.mjs           scenarios (core, flight, scenery, island, cast, meter, kinds, perf,
                                paintshop, berra, glide, simhopp, tuta, dygn, super8, eslov, grodorna,
                                artig, grisar, bagage, lapplisa, torsdag, frukt, hopptorn, hund,
                                badgaster, butik, brodrost, hittelon, rum107, solkram, skjortbyte,
                                stunthopp, prata, takhopp, mikrofon, faglar, gags, strandkyssen,
                                guardiajeep, fyren, klader, ringklocka, kyrkfrid, gatlopp, skidor,
                                golfbil, battur, balkong, hytt, kaffe, meta, marknadstak, lifta,
                                kikare, packhus, volley, kort, guagua, traktor, calibrate, calibflight)
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
node tools/shot.mjs castsheet cars heads ui skandal carbust snackrutor perf
node tools/shot.mjs pintura dalasheet    # the free-roam paint shop and the dalahäst dress on every body
node tools/shot.mjs berra                # Bärra hem Berra in free roam: naps, the carry home, drops, the pay
node tools/shot.mjs glide                # the glide after julafton: the wing, the palm, a wall, the diving board, the lines
node tools/shot.mjs simhopp              # the sisters judge his dives: swan dive, somersault, belly flop, record, walk
node tools/shot.mjs tuta                 # the horn in free roam: the hop, the gang's answers, the sorry, the grisbil's grunt
node tools/shot.mjs dygn dygnGiver       # the clock in free roam: the sky by the hour, Ole's watch, the nap, NÄSTA MORGON
node tools/shot.mjs super8 filmkvall     # Herr Storch films the tricks: the trot, the black viewfinder, stills, the film night
node tools/shot.mjs eslov                # the rollerskier: his lane, the horn, E, "Spår!", Eslövloppet lost, aborted and won
ESLOV_RUNS=8 node tools/shot.mjs eslovlopp  # measure Eslövloppet's timer with calibrate's walker (DESIGN §10.12)
node tools/shot.mjs skidor eslovrundan   # the borrowed rollerskis: the loan, speeds, surfaces, falls, the cheers, the return; Eslövrundan's three places
node tools/shot.mjs eslovrundankal       # measure the skier's two times with the ski pilot (clean, one fall, two; DESIGN §10.39)
node tools/shot.mjs golfbil              # the golf carts: E, top speed, the pip-pip, a bunker, the pond, a wreck, the mission lock
node tools/shot.mjs battur batturrio     # the boat trip: the kiosk, the four shots, Ole paying, E's skip, a mission start; the end card again after the end
node tools/shot.mjs balkong balkongshots # the balconies' residents: the calls, the mirror, the parking line, the siesta's slipper
node tools/shot.mjs hytt                 # the phone at Centro Nórdico: the menu, Q, a call, the car out of view, the fare, a wreck, a full car park, the locks
node tools/shot.mjs kaffe kaffestorch    # the pool bar after friskoteket: the coffee, its sprint, Berra's glass, the cup for Fru Storch, measured
node tools/shot.mjs meta                 # fishing at the pier's end: the cast, the dive, E in time, the four catches, the FÅNGST card, early, late, Q
node tools/shot.mjs marknadstak marknadstakFore   # the market's awnings: the shade, the coin trail run as a player, the seller's no and swear
node tools/shot.mjs lifta liftaFall      # hitch-hiking: the thumb, the stop, the hop up, the ride leaning, the drop; the fall, E off, a warp, a knock, a mission start
node tools/shot.mjs kikare kikareshots   # the lifeguard's binoculars: the prompt up on the tower, the view, a find, all eight and the end shot, the locks; every target through them
node tools/shot.mjs packhus packhusbalans   # the packing shed's belt: the foreman, the keys, a box stamped, a whole shift, TOMATRAS, Q, Siv, the locks; the balance with the autopilot
node tools/shot.mjs volley volleyfree volleyshots   # beach volleyball: the prompt, the fade and the marks, a serve, a match played out by an autopilot, the rematch, Q, a mission start; the ball in free roam
node tools/shot.mjs kort kortshots       # the tourist couples: the ask, the viewfinder, on end at the compass rose, the snap and the tip, the dunes and LA MEDINA, a miss, a speck, the locks; every view
node tools/shot.mjs guagua guaguaKant guaguaLinje  # the guagua: the wait, the stop, the step in and the fare, the football talk, W/S, the fade off; Q, walking off, a car on the stop, held up, the locks, a mission start; every stop
node tools/shot.mjs traktor traktorshots # the tractor: E, 18 km/h, the farmer's chase and give-up, the rows' jolts and the åksjuka, the honking queue, the fetch home, the mission lock; the shots
node tools/shot.mjs grodorna grodtakt    # the pool fest after the end: the ring, the porter, Stig in the ring, eight on the beat
node tools/shot.mjs artig                # Stig says sorry: kicks, run over, a pump, bins, carjackings and the driver's "Nej."
node tools/shot.mjs grisar               # the grisbil's pigs: the falls, the catch on foot and by creeping, Lasse, the pen
node tools/shot.mjs bagage               # the baggage belt: carried, sitting on a bag, the turns, Lasse, Space and E off
node tools/shot.mjs lapplisa lappfilm    # Majsan's tickets and tows, the bay praise; Angerud's hire car and the film scene
node tools/shot.mjs torsdag torsdagOle   # the grisfest's evening for 800 pta: the gate, the band, Majsan's invitation, the morning after
node tools/shot.mjs frukt fruktFore      # the fruit stalls: kick and slow car hold, 11 m/s through, the seller, the swear, the comeback
node tools/shot.mjs hopptorn             # the diving tower: the ladder, the railing, the belly flop, Lasse, the cannonball, a mission start
node tools/shot.mjs hund                 # the watchdogs: the wall, the rush, the hands up, the trampoline and the tank, the owner's call
node tools/shot.mjs badgaster stekt      # bathers on the loungers: the burn, the kick and the car, the newcomer, night; Berra and Robban fried, the wake
node tools/shot.mjs butik butikbil       # SunTrip-butiken: the receipts, the Trapp Trull account, "Paketet!", the look, a mission start; the look in every car
node tools/shot.mjs brodrost rostar      # the G17 toasters: pale, burnt, golden, the label, 7/7 and Majsan, the save; the seven spots
node tools/shot.mjs hittelon hittelonshots  # the lost suitcases: the lift, the car, the drop, R, the exchange and the pay, a mission start, 6/6 and Angerud, the save; the spots, the carry, the counter
node tools/shot.mjs rum107 troferum      # room 107: the shelf and Ole's count, the giraffe, the boombox's samba, the save; the room from the patio, the nap
node tools/shot.mjs solkram              # Majsan's sun cream: the ask, the meter held, 7/6/5, early, over from behind, the record and Siv's chatter, the save
node tools/shot.mjs stunthopp stuntzoner # the stunt jumps: the plank to the dream plane, the stamp, the pay and the record, UNDERKÄND; the yellow ramp, a garage deck, GODKÄND
node tools/shot.mjs skjortbyte garderob  # room 107's wardrobe in a pursuit: the change, busted in there, the officer walking past, back to the shirt; shots
node tools/shot.mjs prata                # the gang's talk: the table, who at every index, Rio, the round, the stops, the julfest, after the end; shots
node tools/shot.mjs takhopp              # the hotel roofs: the stairs up, the jump over the gap, the view, the stairs down, into the pool, a mission start
node tools/shot.mjs mikrofon utrop       # the SunTrip stage's mic: the five announcements and their reactions, the crowd's ways in, the terrace's hours, a mission start
node tools/shot.mjs faglar storken       # the birds: the four flocks, the lift on foot, by car and by the horn, the landing, a mission start; the stork's trip and the Storch scene
node tools/shot.mjs gags gagshots        # the two gags on E: the prompts, the lines, shots and poses, the flash, everyone back, the pay, Gags n/2 and the save; every line as seen
node tools/shot.mjs strandkyssen strandefter  # the towel's daydream: the dream, the wave, Siv on the sand, by night, a mission start; after the end Majsan's invitation
node tools/shot.mjs guardiajeep jeepsiren     # the borrowed Guardia jeep: the loan, his, the bust's question and tow, a mission start; the siren, the traffic giving way, Angerud
node tools/shot.mjs fyren                # up the lighthouse: the gallery's solids, the stairs and the clock, the views, the railing, the exercise, the long blink, down, R, a pursuit, a mission start
node tools/shot.mjs klader kladshots     # room 107's wardrobe and boombox: the outfits in turn, the shot, the save, a mission start, Skjortbytet, the samba on and off; shots
node tools/shot.mjs ringklocka ringshots # the reception's queue and bell: the queue unseen, its suitcases, the prompt, the toaster beside it, plings, the tenth's call, the card, a mission start; shots
node tools/shot.mjs kyrkfrid kyrkshots   # the church door in a pursuit: in, the wait, the sign read out, the give-up, the peek and the line, busted at the door, the cooldown, a mission start; shots
node tools/shot.mjs gatlopp gatloppkal   # José's street races: the "!", the bet, the grid, a loss, wins, a wreck, the walk home, a mission start, the sisters; the courses' balance (autopilot, crash)
node tools/shot.mjs fullstory kinds      # the literal §8 missions and the stage-kind checks
node tools/shot.mjs calibrate calibflight  # timer and FLYGRÄDSLA calibration (slow; see DESIGN §8, §16.4)
node tools/pool.mjs                      # random-stage timers from the raw runs in notes/calibration-samples.md
```

`make test` runs `story`. Test mode is `?test=1` (no title, no pointer lock, dialogue
auto-advances, `timeScale` 3).

Not affiliated with the makers of *Sällskapsresan*, Fox, Radical Entertainment or anyone else
with lawyers.
