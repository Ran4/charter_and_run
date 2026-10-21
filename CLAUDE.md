# Charter & Run

*Sällskapsresan* (1980) × Simpsons Hit & Run, in plain three.js ES modules (no build step), built
on the Bigmouth & Run engine. Two levels, 13 missions. `DESIGN.md` is the design bible and the
module contracts: it wins over `notes/`, and every change to a contract, a literal or a timer
goes into it (plus a line in its changelog). README.md has the player-facing overview (Swedish)
and the code map.

**Build status: Phases 0–3 are done (tag `phase3`).** Phase 3 was the QA loop: three rounds of
critics, serial fixers, gates and (round 3) adversarial verifiers and repairs (tags `phase3-r1`,
`phase3-r2`, `phase3`). `HANDOFF.md` is the hand-off for whoever continues: the state at `phase3`,
the binding user decisions (player car ×1.2, tight measured timers), the workflow lessons, the
**known issues** (§4) and the gotchas. Read it before changing anything. Every fixer's report is in
`notes/build-reports/` (Phase 3: `phase3-r{1,2,3}-<group>.md`); DESIGN's "Changelog (Phase 3)"
opens with a summary of the rounds and the timer changes.

## Running and checking changes

- The game is on port **8840** (`make run` / `npm start`). The user starts it themselves: never
  run `make run` or `npm start`, never open a browser or window.
- Verify headlessly: `PORT=<port> OUT=<dir> node tools/shot.mjs <scenarios>` (serves the game
  itself, headless Chrome on the real GPU; default port **8841**, screenshots in `out/`). It
  prints `RESULT: PASS` or `RESULT: FAIL (reasons)` and exits non-zero on FAIL. One run at a
  time when RAM is tight (`free -g`; wait under 4 GB available) and check the disk (`df -h /`, it
  holds /tmp): a full disk shows as WebGL shader errors, `ERR_INSUFFICIENT_RESOURCES` or `ENOSPC`
  (`TMPDIR=/dev/shm` and an OUT there work round it; re-run before calling a FAIL a regression).
  `montage a.png b.png … -tile 3x3 -geometry 640x360+4+4 sheet.png` makes contact sheets; look at
  the shots with the Read tool.
- `story` plays every mission via debug warps and must end with `[t] done -> #13 idle`, no
  `scenario failed`, `no errors` and **`RESULT: PASS`** (the story prints `no errors` even after
  a failure; only the RESULT line counts). Run it after touching missions, stage kinds, drivers,
  seating, the cabin or the car/character physics. A clean run takes about 190 s.
  `FROM=n TO=m` plays mission indices n..m-1; `SHOTS=1` saves key-scene shots.
- Scenarios (`node tools/shot.mjs` lists them; names are unique across `tools/scenarios/*.mjs`):
  - core: `start walk aerial drive traffic title talk missions views transition levels api story`
  - flight [cabin]: `gate cabin trolley turbulence panic flightshots`
  - scenery: `phases sceneryPeek flightseq dc8`
  - island: `smash foot propsheet riocard endcard islandstats islandtour`
  - cast: `castsheet cars heads` · meter/UI: `ui skandal carbust snackrutor` (`carbust`: SKANDAL's gain
    and delay and the in-car bust rules, DESIGN §7.2; `snackrutor`: the longest line in the dialogue
    box, the radio toast and a bubble, at any `W`/`H`, §14.8) · `perf` (fails below 45 fps; its
    island views include the main beach with its bathers and La Medina's roof terrace)
  - free roam: `pintura dalasheet` (the paint shop at Gasolina, DESIGN §7.2), `berra` (Bärra hem
    Berra after the grisfest, DESIGN §10.6), `glide` (Jag kan flyga, the glide after julafton,
    DESIGN §10.7), `simhopp` (Siv och Majsan sätter poäng, the diving judges at Flamenco's pool,
    DESIGN §10.8), `tuta` (Tutan som folk reagerar på, the horn in free roam, DESIGN §10.9),
    `dygn dygnGiver` (Dygnet runt, the island's clock, Ole's watch and the nap in room 107, DESIGN
    §10.10; the clock holds at 15:00 in test mode unless a test sets `__game.day.run`), `super8
    filmkvall` (Lite film., Herr Storch filming the tricks, his viewfinder, the stills and the film
    night after the end, DESIGN §10.11), `eslov eslovlopp` (Heja Eslöv!, the rollerskier training
    on the Eslöv lane, his answer to the horn and Eslövloppet round the tomato fields, DESIGN
    §10.12; `eslovlopp` measures the race's timer with calibrate's walker, `ESLOV_RUNS`), `grodorna
    grodtakt` (Små grodorna i poolen, the pool fest after the end: the ring in Flamenco's shallow end,
    the porter, Stig in the ring and the hop counter, DESIGN §10.13), `artig` (Förlåt, förlåt!,
    Stig's sorry after a kick, a knock-down, a broken thing or a carjacking, and the driver's "Nej.",
    DESIGN §10.14), `grisar` (Grisarna ramlar av grisbilen, the unlocked grisbil's pigs tumbling off,
    the catch on foot and by creeping, Lasse's refusal and the delivery to the farm's pen, DESIGN
    §10.15), `bagage` (Åk bagageband, the belt at Gando carrying Stig, his seat on a bag, the turns'
    toasts and lines, Space and E off, DESIGN §10.16), `lapplisa lappfilm` (Lapplisan Majsan, her
    ticket and the tow for a car left on the sidewalk, her praise for a car straight in a Flamenco bay;
    Angerud's hire car outside Centro La Medina and the film's first meeting with the GRÚA truck,
    DESIGN §10.17), `torsdag torsdagOle` (Grisfest varje torsdag, 800 pesetas at the farm's gate after
    the grisfest: the evening with the band and the dancers, the tourist's refusal and Majsan's
    invitation, the morning after; Ole only after julafton; DESIGN §10.18), `frukt fruktFore` (Rakt genom fruktståndet, his car through the market's five fruit
    stalls, the seller's "¡Mis tomates!", the souvenir seller's swear after asnan, the stalls back at a
    mission start, DESIGN §10.19), `hopptorn` (Från fjärde våningen, the 10 m diving tower at Flamenco's
    deep end: the ladder's E points, the dive with the mantra, the belly flop and the cannonball,
    Lasse's line; its solids only between missions, DESIGN §10.20), `hund` (Fin hund…, the watchdogs
    in the bungalow gardens and at the farm on vischan: the wall, the rush, Stig's hands up, the
    trampoline, the tank and the car roof, the owner's call from the house, a mission start, DESIGN §10.21),
    `badgaster stekt` (Badgäster på solstolarna, the bathers on the island's sun loungers by day, their
    burn and the fly-off from a kicked or smashed lounger; Berra and Robban fried and asleep on
    Flamenco's deck between buss17 and the bodega, and the wake, DESIGN §10.22), `butik butikbil`
    (Bränsletillägg tillkommer, SunTrip-butiken on the office porch: the receipts' add-ons, the Trapp
    Trull account's instalments, "Paketet!", his bought look as a layer in free roam only, saved; the
    look seated in every car, DESIGN §10.23), `brodrost rostar`
    (Kontrollerad av G17, the seven toasters' timing game, the label, 7/7 and the save; the seven
    spots and their looks, DESIGN §10.24), `hittelon hittelonshots` (Hittelön, the six lost suitcases
    inland between missions: walking into one lifts it onto Stig's head with Angerud's tip in his mouth,
    walk speed, the card and the beacon at the lost-and-found counter at Gando, hidden in a car, dropped
    by a fall, left by R; "E Lämna in väskan" at the counter, the bag on it, "Hammarby…?", "Nej, inte
    min.", +100 pta at "Hittelön.", "Tack så mycket."; a mission start sends it home and hides them all;
    6/6 with the set's 1000 and Angerud on the radio, the save; the spots, the carry and the counter as
    seen, DESIGN §10.52), `rum107 troferum` (Rum 107 fylls med resans minnen, the
    keepsake shelf and Ole's count, the giraffe, the boombox's samba and the save; the room from the
    patio and the nap, DESIGN §10.25), `solkram` (Smörj in Majsans rygg, the SOLKRÄM meter at
    Flamenco's pool after fataga: the film's pair once, the held E, 7/6/5, early, the cream running from
    behind, Siv's cards, the record and `sjuPoang`, a mission start, after the end, DESIGN §10.26),
    `skjortbyte garderob` (Skjortbytet, room 107's wardrobe as a SKANDAL hideout in free roam: the
    change into the suit with the officer coming, busted in there, the officer walking past and his
    scene, the way back to the shirt, the shirt taunt, a mission start; and the Land Rovers' wall hits
    that are no rams on foot, DESIGN §7.2), `stunthopp stuntzoner` (Stunthopp med G17-stämpel, his car's
    jumps judged: the plank off the bygge's first floor to the dream plane, LUFTTID, the stamp
    KONTROLLERAD AV G17 or UNDERKÄND, the pay, the record and the save, his arms out by the plane; the
    yellow ramp, a hop too small, a garage deck, GODKÄND before fataga, nothing in a mission, DESIGN
    §10.27), `prata` (Prata med gänget, E on the gang between missions: the exchanges by part of the
    trip with Stig answering, who can be talked to at every index, the round, the stops, the julfest,
    after the end, DESIGN §10.28), `takhopp` (Hoppet mellan hotelltaken, the roofs of HOTEL ATLÁNTICO and
    APARTAMENTOS SOL DE INVIERNO walkable between missions: the stairs up and the arrival out of breath,
    the coins, the jump over the gap with the mantra, the view by the brochure's sign, the stairs down,
    the belly flop and the cannonball in the pool next door, the stairs shut in a pursuit, a mission
    start and the world as before in the mission, DESIGN §10.29), `mikrofon utrop` (Mikrofonen på
    scenen, E at the SunTrip stage's mic between missions: Lasse's announcements in turn, the terrace's
    guests spitting, the crowd on the lawn and the question time with Stig's "Ja.", Ole and the time,
    the slump at friskoteket, the bathers fleeing the shark warning, a mission start; the crowd's ways
    in, the terrace's hours, index 6, after the end, DESIGN §10.30), `faglar storken` (Fåglarna som
    lyfter, the flocks between missions: the pigeons at the plaza's fountain, the gulls at the beach
    kiosk and on the pier, La Charca's herons; the lift on foot, by car and by the horn, never traffic,
    the landing on their spots, Stig's sorry, a mission start; the stork's trip to the Storches on the
    beach, "Oj, en stork!", the correction once, Herr Storch filming it, DESIGN §10.31), `gags
    gagshots` (Gags på E, two film scenes between missions: Ole's camera bag under Flamenco's pergola
    and his flash, "Si omelett!"; Stig's cup under the lamp at Viking Bar's door with Angerud and
    Carmencita; the cast put back, the pay, Gags n/2 and the save, no prompt in a pursuit or a mission,
    the Viking gag gone after the end; every line as seen, DESIGN §10.32), `strandkyssen
    strandefter` (Strandkyssen i bränningen, the towel at the water's edge below Flamenco: Stig's
    daydream with Majsan's double in the surf, the sunset, DAGDRÖM and the waltz, the camera gliding
    away, the white flash and the real wave, "Blött.", Siv's score on the sand, by night, a mission
    start mid-dream; after the end Majsan asking him to dance, DESIGN §10.33), `guardiajeep
    jeepsiren` (Låna Guardia-jeepen, guardia1 at the Casa Cuartel open between missions after the
    bodega: the loan and its SKANDAL, his once shaken off, the bust's "Ursäkta, är det din bil?",
    "Nej." and the tow, the respawn, locked in a mission; the siren on H, its lamp and corners,
    traffic giving way with no pursuit, Stig's surprise, Angerud's outburst, DESIGN §10.34), `fyren`
    (Uppför fyren, the lighthouse's gallery 51.3 m up between missions: the keeper's door and the
    fade, the clock on to the sunset by day, "Femtio meter …", the gallery's cameras and the vertigo,
    the closed railing and no jump, J as Levander's exercise against the lantern with his eyes shut,
    the long blink to the night and the beam, the way down, R, a pursuit, a mission start, DESIGN
    §10.35; `perf` has two gallery rows), `klader kladshots` (Garderoben och bergsprängaren i rum 107, E
    at room 107's wardrobe between missions with no pursuit: the outfits in turn (the suit and the
    Arlanda coat, the shirt after buss17, the Rio jacket after the end), the change's shot, the lines,
    the save, the story's outfit in a mission (`islandWear`), Skjortbytet's spot kept; the boombox's
    locked answer and the samba on and off, DESIGN §10.36), `ringklocka ringshots` (Ringklockan i
    receptionen, the departing guests' queue at Flamenco's desk between missions: out unseen, the
    suitcases solid, "Och när ska vi lämna rummen?" and "Momento.", E at the bell, the toaster beside it
    keeping its front, the tenth pling's call with Lasse on the radio, "Förlåt…", the bell under the desk
    and back with the card, a mission start, DESIGN §10.37), `kyrkfrid kyrkshots` (Kyrkfrid i Templo
    Ecuménico, the church door as a SKANDAL hideout on foot between missions: the walk in with the officer
    still coming, the slam and the plaza shot, the Land Rovers waiting at the street with their lamps, the
    meter held till the officer has read ES UNA IGLESIA, spelt it out and scratched his head, the give-up
    and "De där svenskarna är heltokiga!", the peek out and "Hoppas vi inte får användning för det.", the
    banner, busted at the door, 8.5 m behind, the cooldown, a mission start, DESIGN §7.2), `gatlopp
    gatloppkal` (Gatlopp mot pizza-racern, José's three street races after Gamla kläder: his "!" and
    E close by him (his talk a step off), the bet at the chalkboard by Berra and Robban, the fade to the
    SALIDA · START grid in the hire car with José and his mother in his blue hatch, the race kind run
    outside the runner, the prize and `records.gatlopp`, a loss, a wreck, José's drive back and walk
    home, a mission start, the sisters' six; `gatloppkal` measures the courses' balance with calibrate's
    autopilot: a clean run wins by a few seconds, one crash loses, DESIGN §10.38), `skidor
    eslovrundan eslovrundankal` (Låna rullskidorna, the rollerskier's skis after Pepes Bodega: E at his
    rest by the sign (Stig waiting there brings him back), Stig poling on asphalt, wobbling on the
    sidewalk, falling off a kerb, into a car or a person, on his back on the sand, "Heja Eslöv!" at the
    bib and "Jag är från Stockholm, egentligen…", the return, back by themselves in a car, a pursuit or
    a mission; Eslövrundan on the skis with its result list, first, second and third; `eslovrundankal`
    measures the skier's two times with the ski pilot, `ESLOVRUNDAN_RUNS`, DESIGN §10.39), `golfbil`
    (Golfbilen – pip-pip!, the two golf carts by the golf clubhouse between missions: E, about 23 km/h,
    the pip-pip, a bunker with "Jag pliktar ett slag.", the pond's splash, a wreck back on its spot;
    never a mission's car: no prompt and the toast in a mission, home at a mission start, DESIGN §10.40),
    `battur batturrio` (Båtturen med PALOMA, the PASEOS EN BARCO kiosk at the marina between missions by
    day: 300 pta, PALOMA out of the basin past the shark fin with Ole's statistics, along the beach, the
    lighthouse in the sunset with the Rio exchange, the quay; Ole a double, E's skip, a mission start;
    after the end the end card again with the Rio suits, Majsan and Siv, the cups and the banner,
    DESIGN §10.41),
    `balkong balkongshots` (Balkongerna lever, the residents on the slabs' balconies between missions:
    the 52 slabs' spots, at most ten bodies placed by hand and never stepped, the waves, "Hallå där
    nere!", the mirror tourist's "Kallar ni det här för havsutsikt?", "Här nere parkerar de
    hursomhelst." at a car left on the sidewalk; at siesta (13–17, the held test clock's 15:00) the
    horn or a smash brings "¡Silencio! ¡Siesta!", the slipper on his head or the car's roof and
    "Förlåt!"; nobody at night, in a mission or in the flight level, DESIGN §10.42), `hytt` (Hytt två!,
    E at booth 2 of Centro Nórdico's phone pavilion between missions on foot: the cut, "Hytt två!", the
    menu of named cars (the hire car, bus 17, the grisbil once unlocked; W/S, Q hangs up), the call:
    the named car itself moved whole to a free spot in the car park out of the camera's view, "Señor,
    betala!" and 25 pta (Ole when short), Stig turned to it; a dent, a wreck, a delivered grisbil's bed,
    a full car park; no prompt in a car, a pursuit or a mission; bus 17 home at its mission's start,
    DESIGN §10.43),
    `kaffe kaffestorch` (Poolbaren öppnar, BAR PISCINA after friskoteket: shut and nobody behind it
    before, the bartender by the percolator after; E at the counter's north end: 40 pta, the head shaken
    when short, the cup in Stig's hand and 30 s of sprint × 1.2 with the box under the meter, "Påtår",
    cold; no prompt in a pursuit, ended by Eslövloppet's or a mission's start; Berra's "Ska du ha?" at
    index 8; the toaster's E kept; `kaffestorch`: the cup for Fru Storch, her question and his "Ja.", 50
    pta, and calibrate's walker from the counter to her within the coffee's 30 s, `KAFFE_RUNS`, DESIGN
    §10.44), `meta` (Meta från piren, the rod in its holder on the green harbour light at the marina's
    pier end between missions: E casts, the float's nibbles and dive, E within 0.5 s, the fish, the shoe,
    the plastic fin (never collected) and the rare wet SPORT-KNÄCKE pack with "En julklapp. Den är inte
    till mig.", the face shot, too early, too late, Q, the FÅNGST card and `records.fiske`, the draw's
    weights and pity rule, by night, a mission start mid-cast, DESIGN §10.45),
    `marknadstak marknadstakFore` (Pesetas på marknadstaken, the second ¡SALTA! shade in the market's
    lane and the coin trail over the awnings to the souvenir stand's roof, taken only from 2.5 m up
    (`minY`): no coin from the ground or a car; the route run as a player runs it (bounce, the aisle's
    double jump, the lane, the lone fruit stall, the roof); after asnan the roof's four, the last one's
    "Jävla smålänningar!" and Stig's "Förlåt, förlåt…"; on the roof "¡No, no, no!" once a visit and
    every 8 s, before asnan too; nothing in a mission, DESIGN §10.46), `lifta liftaFall` (Vi liftar, E
    at the hitch-hiking spots by the CAMINO SIN ASFALTAR sign and on the packing shed's road between
    missions: the thumb, a grisbil from up the road stopping just past him, the cut, his question and the
    farmer's answer, the hop into the bed, Stig 'seated' on the truck's tilt with the chase camera on the
    truck, A/D's lean against its pull and ÅKSJUKA, the drop behind Hotel Flamenco with "Jättefint!
    Tack."; the fall and the farmer's "¡Adiós, señor!", walking off, E's step and jump, a debug warp, a
    traffic knock, a mission start mid-ride, DESIGN §10.47), `kikare kikareshots` (Livräddarens kikare,
    E up on the SOCORRISTA tower's platform between missions: the binoculars at Stig's eyes, the camera's
    `scope` at 12°, the round glasses, the list SPANING and the bar, Ole's warning in Stig's mouth, the
    turn by keys, Herr Storch filming the tower; a target held in the middle 1 s (the ring) found, 25 pta,
    his line, `records.kikare`; E or Q down, a taken fin counted, all eight and the cut to him with "Inga
    hajar. Bara svenskar.", no prompt in a car, a pursuit or a mission, a mission start mid-look; the
    tower's raised roof and its camera ceiling; every target through the binoculars, DESIGN §10.48),
    `packhus packhusbalans` (Stig på löpande band, the foreman in his cap on the packing shed's yard by
    day between missions: his wave and call, "E Ta ett skift", the fade, the belt, its bins and two
    workers (built at the first shift, hidden after it), A/S/D into ROJOS, the bucket and VERDES, a wrong
    bin and a miss on the ground, a box stamped KONTROLLERAD AV G17 and stacked, the foreman's hurries, a
    whole shift's 100 pta and `records.packhus`, TOMATRAS at eight dropped with Stig's arms full, Q,
    Siv's "Spänn av, Stig-Helmer. Du är ledig." once, a kick, by night, the locks and a mission start;
    `packhusbalans` models the shift's balance with the autopilot, `PACKHUS_RUNS`, DESIGN §10.49),
    `volley volleyfree volleyshots` (Strandvolley mot Berra och Robban, the court's live ball by the
    pedal-boat rental: "E Spela volley" between missions with Ole, Berra and Robban free, the fade and the
    marks, J's kick over the net and the header, Ole's set, their walk, lob, smash and misses, the points'
    reasons on the board STIG & OLE n – m BERRA & ROBBAN, the thirst lines, first to five, the walk off,
    "E Revansch!", Q, off the court, a mission start; an autopilot in Stig's place plays a match out; no
    prompt while Ole or Berra has a mission to give; the ball kicked and knocked about in free roam and
    back once Stig is away, DESIGN §10.50), `kort kortshots` ("Kan du ta ett kort på oss?", the sunburnt
    tourist couple after asnan by day between missions, at the lighthouse's plaza, the dunes' boardwalk
    and the gate of LA MEDINA in turn: her ask, his wave, "E Ta ett kort"; the hand-over, the viewfinder
    (the camera's `scope`, a 3:2 frame holding a 76° lens, Stig unseen), the mouse, W/A/S/D and the leash,
    V or the right button on end; the reading (both heads in, not a speck under 5.5°, the landmark whole);
    at the compass rose only on end takes both the couple and the lantern; Space's "Säg… omelett.", the
    frozen picture and its stamp, the fetch (a fade if far), the tip (100 or 10 pta), `records.kort`, the
    walk off and the next spot; a miss asked again, a speck, given back unused, a knock, no prompt in a
    car, a pursuit or at night, a mission start mid-view; every view lying and on end, DESIGN §10.51), `guagua
    guaguaKant guaguaLinje` (Guaguan, the 13 PARADA GUAGUA stops between missions: "E Vänta på guaguan",
    the cut, the green guagua from behind the camera stopping with its door by the bench, "E Kliv på
    guaguan" (a traffic guagua's stays "E Ta bilen"), the seat beside the driver and 10 pta, the chase
    camera on the bus, the film's football talk with Ole's bust (the driver's line when Ole is in sight)
    until heard through (`records.guagua`), the later rides' lines, W/S's stop, E off at once, the fade and
    the arrival with the bus, "¡Hasta luego, señor!"; Q, walking off ("¡Vámonos!"), a car on the stop,
    held up short of it, no prompt in a car, a pursuit or a mission, a warp and a mission start mid-ride;
    every stop's start out of view, its door by the bench and its ride, DESIGN §10.53), `traktor traktorshots`
    (Traktorn med släpkärran, the farmer's tractor by the tomato fields' tool hut between missions: "E Låna
    traktorn", 18 km/h, the farmer out of the hut's door running after it and never nearer than 3.2 m behind
    its tail, his shouts and Stig's answers, his give-up and walk home, Stig out near him and "¡Mi tractor!
    ¡Por fin!"; the furrows' jolts and "Jag har lite anlag för åksjuka.", tomatoes off at a knock, the
    honking queue on the road and Stig's sorry, the fetch home unseen, a wreck, the mission lock and home
    at a mission start; the shots, DESIGN §10.54), `systrar
    systrarshots` (Systrarnas balkong, at index 11 between fataga and the grisfest: Stig walking onto room
    105's patio by day brings Siv and Majsan up on the balcony above it (perched by hand, no solid) with the
    cut and the ask, "Giraffen! Fixa en whisky!"; the bottle at SUPERMERCADO or BAR PISCINA (`game.pay`), in
    his left hand, broken by a fall or R; "E Skicka upp whiskyn": the basket on the knotted towel, the
    delivery's lines; Siv's reminder, Majsan's waves, the parking line by the west gable (no neighbour's);
    a mission start puts them back at the pool; the pool's features at index 11 untouched until then;
    every scene as seen, DESIGN §10.55), `kran kranshots` (Åk med byggkranen, the bygge's tower crane
    carrying its brick pallet from the yard east of the frame to the 3rd floor's slab and back, about 55 s
    a cycle: between missions the pallet a floor that carries Stig (in the air over it too, `platformAt`),
    his arms out and the mantra high up, the slab's four coins (`minY`, not from the 2nd floor) and
    Angerud's pitch as a toast at its north edge, the thud of a fall of 5 m or more (not a glide or a
    stomp), the pallet home and held in a pursuit, Stig put down at `kranFot` out of free roam; the shots,
    DESIGN §10.56), `trampbat trampbatshots` (Hyr en trampbåt, E at the PATINES · TRAMPBÅTAR sign on the
    beach between missions with the SKANDAL meter down: 200 pta (Ole when short), the fade, the pedal boat at
    the water's edge with Ole's double beside Stig and the samba; 7 km/h, the glide, no engine, horn or skid;
    out past the bound wall into its own water (z 352, x ±250, the raft, the buoys and the anchored boats walls
    for it), the chase eye never pulled in; past the buoy line the Rio exchange with Ole's wave, further out
    the statistics; the raft's eight coins (out only during a ride) and Ole's lines; E ashore only at the
    water's edge (else the toast), Ole pedalling it back and gone out of view; R at the rental; a forced exit
    at sea a splash, a pursuit, a warp and a mission start ending the ride on the sand; the minimap's sea; the
    shots, DESIGN §10.57), `utflykt utflyktKvar utflyktSpar` (Utflykt med Lasse, E on the SunTrip office's
    sidewalk between missions after fataga: 50 pta, the cut with Lasse's "Hä-pååre! …", the fade into SunTrip's
    bus beside Affe's bust with tourists at the windows, the chase camera on the bus; the whole loop of left
    turns driven for real (about 3 minutes): Gando in the lane in front of bus 17's bay, Grisfesten, Fataga,
    each stop within 1 m, Lasse on the radio, the tourist's and Stig's lines; E off at a stop, at Fataga the
    two minutes' card, back on at the door, the missed bus ("Bussen har redan gått!"), home off by himself and
    `records.utflykt`; the bus on without him at Gando, through Fataga aboard, the queue behind the parked bus
    waiting, a warp and a mission start mid-ride, a car on the bus's spot, no trip from the wheel or in a
    pursuit; `utflyktKvar` moves the bus near a stop with `utflykt.jump`, DESIGN §10.58),
    `terraza terrazashots` (Takterrassen på La Medina vaknar, up the courtyard stairs between missions: six guests at the roof tables and the bartender behind the new counter before TERRAZA · BAR (10–23,
    popped out of view), the brochure line on the first time up, his greeting once a visit and "¡Olé!" at a
    splash, the tanks' four coins out only during a visit (minY 7.6), the roof pool lengthened with a `water`
    floor at 6.02 and Flamenco's board (a hop lands in it from 11.7 m), the two old loungers' dozing bathers
    (`role` 'asleep') and Stig's (`kept`, placed last); E there by day: "Bara en liten stund.", the black, the
    clock 1.5 h on, red, "Aj!" and the toast; the burn as a layer over his outfit till the next morning, "Aj!" at
    a bump or a car's knock; a mission start heals him and clears the roof; the shots, DESIGN §10.59)
  - `fullstory kinds` (the literal DESIGN §8 missions in `tools/fixtures/full-missions.js`, and
    stage-kind checks; keep the fixture in step with §8)
  - `calibrate calibflight` (slow timer and FLYGRÄDSLA calibration; env vars in DESIGN §16.4)
- Test mode is `?test=1` (no title, no pointer lock, dialogue auto-advances, `timeScale` 3,
  `&ts=n` overrides). `?fresh` skips the save, `?mission=N` starts at index N (0–12).
  `window.__game`, `__lm(name)`, `__props`, `__missions()`, `__stats()` are exposed.

## Conventions that bite

- Yaw: forward = (sin yaw, cos yaw), matching three's `rotation.y` on +Z-facing models.
  Right = (-cos yaw, sin yaw) = local -X. Positive steer turns right, which *decreases* yaw.
  Drivers sit on the car's left (+X local).
- Everything off the asphalt is at `CURB` (0.15). Solids are footprints with a top height:
  a wall if `top > y + step`, a floor otherwise (characters step 0.45, cars 0.6). Ramps are
  oriented boxes whose top rises along their yaw. Camera ceilings (`collision.ceiling`,
  `Frame.ceiling`) keep the chase eye under pergolas and canopies: they count by the sight line
  from the pivot, prop ceilings (parasols) are `underOnly`, and under a low ceiling the on-foot eye
  slides sideways (`cam.slide`: hold, swap as a cut, wedge; DESIGN §14.5). Camera changes are
  judged with sweep probes, not single shots; the remaining camera residue is a known issue.
- Static geometry goes through `GeoBuilder` (vertex colours, merged per block) and gets an
  inverted-hull outline from `toonMesh`. Keep new materials to a minimum.
- `teleport`/`place` snap to ground-level floors only (`groundAt(x, z, 0.2, 0.6)`), never
  roofs; landmarks must not sit inside a building footprint. Island landmarks live in one table,
  `src/world/landmarks-island.js` (block builders don't override them).
- The module `fx` (particles) is easy to shadow with a local `const fx = Math.sin(...)`.
  car.js imports it as `FX` for that reason.
- One-shot inputs (jump, kick, E) are handled once per frame in `handleOneShots`, continuous
  ones in `fixedStep` (60 Hz). `input.pressed` stays true for the whole frame.
- **Levels are configurations, not scenes** (`src/level.js`, DESIGN §4). One static world:
  the island grid around the origin and the gate set + DC-8 cabin at **x = 3000**
  (`CABIN_X`, local lx = x − 3000). `setLevel` switches spawn, camera profile, meter mode
  (FLYGRÄDSLA `panic` / SKANDAL `pursuit`), palettes and `sim` flags (no traffic or peds in the
  flight level). Town helpers (`freeSpot` with its ±309 bounds, R reset, `routeAim`, pursuit)
  are branched per level (§4.3); new code at x = 3000 must not call them directly. The cabin is
  stationary; `flightScenery.js` moves the outside past it and is the only writer of the airframe
  pitch.
- **The player's car runs at `PLAYER_BOOST` 1.2** (car.js), not Bigmouth's ×2. AI cars never
  get it; a race opponent that must keep up gets a spec through `race.oppSpec`.
- **Timers are tight and measured** (DESIGN §8 "Timers and difficulty", a binding user rule): a
  clean run on a sensible route keeps about 15–20 % of the time. Drives: ceil(1.2 × T_ref), on
  foot: ceil(1.25 × T_ref) (+0.5 s per target), random stages at the 75th percentile, rounded up
  to a whole second. Re-measure with `calibrate`/`calibflight` after changing a route, a car or
  the world; never pad a timer to make a test pass, and update the §8 table and the fixture. A
  random stage's raw run times go into `notes/calibration-samples.md` (pool only runs on the same
  stage, world, actors and autopilot code; a change to any starts a new pool); `node tools/pool.mjs`
  derives its timer. Every run goes in, a gate's or a verifier's too; logs in a scratchpad are
  lost. The balls, sheep and flowers pools sit on a rounding boundary: one more default run can move
  a timer by a second, which is the rule working, not a regression.
- AI buses (steer 0.9, lane-path turns from 11 m) turn left fine but are too wide for right
  turns: mission bus routes turn left only.
- Every scripted line in `src/content/*.js` and `src/game/missions/*.js` carries a source tag
  comment (`// [F]`, `[F*]`, `[N]`, `(t)`; DESIGN §1.4). Player-facing text is Swedish, Ole
  speaks Norwegian bokmål, no real brands or businesses (§1.5).
- `game.pay(n)` never soft-locks: Ole pays when the purse is short (not fines or the PANIK fee).
- **Flight-level guides.** Markers and the guide arrow aim straight there (`routeAim: false`), so a
  stage whose straight line crosses seats, benches or walls is wrapped in `via(stage, [landmarks],
  pass)` (missions/flight.js, DESIGN §8.1 [3]). A timed stage that starts after the intro or a
  dialogue, and every on-foot retry, turn player and camera to the guide (`runner.faceGuide()`).
  Check a guide with an arrow-follower probe, not by eye.
- **Trolley cues.** No stage uses `trolley: false` (it froze the trolley mid-aisle and walled off
  landning's round-up); `trolley: 'park'` sends it to the front galley (`cabin.parkTrolley`). A
  checkpoint retry re-applies the ambient cues on the retried run's fresh `m`.
- **Retries and hides.** `retryFear` (common stage option) gives a retry the meter the stage first
  started at; the def field `outroHide` keeps NPCs hidden after `complete()`'s `placeNpcs(true)`;
  `fail()` re-hides the checkpoint stage's `startCue.hide` keys (DESIGN §9.2, §9.4).
- **Frozen-file history.** In Phase 1 eleven packages worked in parallel with disjoint file
  ownership (DESIGN §14.1); `main.js`, `level.js`, `content/index.js` and the stage kinds
  (`game/missions/kinds/*`) were frozen. That is why some features are reached through options
  and hooks (`worldHooks`, kind options, `addInteractable`) instead of edits to those files. The
  freeze is over: since Phase 2 any file may change, but the DESIGN contract changes with it.
- **Branches and tags.** Only `main`. The Phase 1 branches `p1-<WP>` and their worktrees in
  `../.wt/charter-<WP>` were merged in Phase 2 and removed on 2026-10-12 at the user's request (their
  commits are in main's history; `../.wt/saab_work` belongs to another project). Tags: `phase0a`,
  `phase0`, `phase2-merged`, `phase2-contracts`, `phase2-balance`, `phase2-docs`, `phase2`,
  `phase3-r1`, `phase3-r2`, `phase3`. The remote is `origin` =
  `git@github.com:Ran4/charter_and_run.git` (SSH, set 2026-10-14); push only when the user asks.
