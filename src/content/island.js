// Level 2 content (DESIGN §2.3, §10, §11.6, §14.9, §14.10): homes on the island, map labels, chatter
// and bark tables, collectibles, unlocks, named-car names, outfits. Owner: WP-G. Source tags per
// DESIGN §1.4 (bark tables are [F*]: every film line is relocated there). Invented (§1.6): Oles
// prylar and hajfenor as collectibles, the grisbil unlock, the glide after julafton, the sisters
// judging his dives at Flamenco's pool, the island answering his horn, Herr Storch filming his
// tricks and his film night, the rollerskier's training, his answer to the horn and his race, the
// pool fest after the end (Små grodorna in Flamenco's pool, Stig hopping with them in his suit),
// Majsan ticketing cars on the island, the tow and her praise for a car parked straight (§10.17), and
// the grisfest's evening bought again at the farm's gate with a tourist's refusal (§10.18), the
// market's fruit stalls his car goes through, with their seller's cry (§10.19), the watchdogs in
// the bungalow gardens and the farmyard on vischan, with their owners' calls (§10.21), and the
// bathers on the sun loungers, their burn and the fly-off, Berra waking for five minutes more
// (§10.22), the SOLKRÄM meter for Majsan's sun cream, Siv's cards for it and the cream running
// (§10.26), the gang's short exchanges on E between missions, Stig answering (§10.28), Stig
// reading Lasse's announcements at the SunTrip stage's microphone, the island doing what he says
// (§10.30), the island's birds that lift and land again, Stig's sorry to them, and the stork
// that flies from La Charca to the Storches on the beach with Fru Storch's correction there (§10.31),
// two gags on E, Ole's flash at his camera bag and Stig's cup under Viking Bar's lamp (§10.32), and
// the towel at the water's edge, Stig's daydream in the surf, the wave and the visitors on the sand
// (§10.33), and the borrowed Guardia jeep, its siren on H and the traffic giving way to it (§10.34).

export const HOMES_ISLAND = {
  ole: ['flamenco', 2.0, 1.0, 0],     // yaw 0: under the pergola, facing the pool (flamenco faces π)
  majsan: ['flamencoPool', -2.0, 0],
  siv: ['flamencoPool', 2.0, 0],
  jose: ['cita', 0, 0],
  berra: ['flamencoBar', 0, 0],
  robban: ['flamencoBar', 1.6, 0],
  sulan: null,
  angerud: ['vikingbar', 2.0, 1.0],
  herrStorch: ['playa', 0, 0],
  fruStorch: ['playa', 1.4, 0],
  kontrollant: null,
  vardinna: null,
  lasse: ['suntrip', 0, 0],
  affe: ['scen', -3.0, 0],
  gabbe: ['scen', 3.0, 0],
  mamma: ['fatagaDukar', 0, 0],
  pappa: ['fatagaFold', 0, 0],
  carmencita: ['vikingbar', -2.0, 0],
  portier: ['flamencoRecepcion', 0, 0],
  hittegods: ['hittegods', 0, 0],
  saljare: ['bungalow', 0, 0],
  souvenir: ['asnestand', 0, 1.2],
  eslov: ['eslovVag', 0, 0],
  stadare: null,                       // appears only in the julafton chaos scene
  grisbonde: ['grisfest', -3.0, 0],
  varden: ['grisfest', 3.0, 0],
};

// [label, landmark, { unlock? }]: unlock-limited labels show only after that unlock.
export const MAP_LABELS_ISLAND = [
  ['Hotell Flamenco', 'flamenco'], ['Hotell SunTrip', 'suntrip'], ['La Medina', 'kasbah'], ['Viking Bar', 'vikingbar'],
  ['Tonga Tonga', 'tongatonga'], ['Centro Nórdico', 'cita'], ['Plaza · Casa Lola', 'plaza'], ['Marknaden', 'marknad'],
  ['Templo Ecuménico', 'kyrka'], ['Gasolina', 'bensin'], ['Guardia Civil', 'guardia'], ['Vischan', 'vischan'],
  ['Grisfesten', 'grisfest'], ['Fataga', 'fataga'], ['Golfbanan', 'golf'], ['Bungalowen', 'bungalow'], ['Bygget', 'bygge'],
  ['Drömplanet', 'dromplan'], ['Flygplatsen', 'airport'], ['Dynerna', 'dyner'], ['Faro de Maspalomas', 'fyren'],
  ['Stranden', 'playa'], ['Hamnen', 'hamn'],
  ['Pepes Bodega', 'bodega', { unlock: 'bodega' }],
];

// Bubbles from idle NPCs near the player (no mission running). Every film line here is relocated
// from its own scene, so it is [F*] (§1.4); [N] lines are ours. Ole speaks Norwegian.
export const CHATTER = {
  ole: ['Samba er fine greier!' /* [F*] */, 'Blomsterspråket er internasjonalt.' /* [F*] */,
    'Farlige saker. Der dør det mellom to og tre mennesker hver dag. Understrømmer, solstikk og haier.' /* [F*] */,
    'Vi fikser alt!' /* [F*] */, 'Tenk ikke mer på det.' /* [F*] */, 'Heia Norge!' /* [F*] */],
  lasse: ['Friskoteket börjar halv tio varje morgon.' /* [F*] */, 'Hä-pååre!' /* [F*] */,
    'Ni bör inte dricka vattnet.' /* [F*] */, 'Klockan är tre spansk tid.' /* [F*] */],
  berra: ['Det är ju fan vad solen tar här nere, Robban.' /* [F*] */, 'Ra-tara-tara!' /* [F*] */,
    'Ska vi ta Pepes Bodega i dag eller ska vi sola?' /* [F*] */, 'Vi tar första bästa.' /* [F*](t) speaker unnamed in the notes (Robban och Berra) */],
  robban: ['Fan, vad jag är törstig.' /* [F*] */, 'Pepes Bodega. Glöm aldrig det, du.' /* [F*] */,
    'Fan Berra, ja ä tösstig.' /* [F*] */],
  angerud: ['Det är sista gången jag åker med SunTrip!' /* [F*] */,
    'Jag har hört att kriminaliteten har gått upp här nere sedan Franco dog.' /* [F*] */,
    'Undrar hur länge man ska stå här.' /* [F*] */, 'Jag ska tala med platschefen.' /* [F*] */],
  siv: ['Gud, vad han är söt!' /* [F*] */, 'Spänn av, Majsan. Du är ledig.' /* [F*](t) */],
  majsan: ['Här nere parkerar de hursomhelst.' /* [F*] */, 'Jag gör bara mitt jobb.' /* [F*] */],
  fruStorch: ['Det var så kallt på rummet i natt, och ändå har vi betalat bränsletillägg!' /* [F*] */,
    'Finns det svenskt kaffe på hotellet?' /* [F*] */],
  herrStorch: ['Lite film.' /* [F*](t) */],
  jose: ['Jag ska inte bort, jag ska hem.' /* [F*] */],
  mamma: ['Inga svenskor!' /* [F*] */, '¡Josito! ¡Josito!' /* [F*] */],
  portier: ['Momento.' /* [F*] */],
  affe: ['Va fan, jag hade ju natturen i natt!' /* [F*] */, 'Jag måste få kvarta nån gång.' /* [F*] */],
  gabbe: ['Natturen går klockan nio!' /* [N] */, 'Grisfestbussen går från SunTrip!' /* [N] */],
  souvenir: ['Hallå där!' /* [F*] */, 'Titta, den är jättelustig.' /* [F*] */],
  saljare: ['Välkommen i det gröna!' /* [F*] */, 'Bungalow – fyra rum och kök.' /* [F*] */,
    'Tre meter djupt i ena änden, en meter i den andra – barnvänlig.' /* [F*] */],
  carmencita: ['Jag är 28 år, mamma.' /* [F*] */],
  hittegods: ['Hammarby…?' /* [F*] */],
  varden: ['Sangrian, grabbar.' /* [F*](t) */],
  grisbonde: ['Akta grisarna, señor!' /* [N] */],
  // Said while he stands at the lane's south end between laps (game/eslov.js, §10.12).
  eslov: ['Man får passa på när det är barmark.' /* [N] */, 'Hemma i Eslöv är det slask nu.' /* [N] */],
};

// Prata med gänget – E talks to the gang (free roam; feature 39, DESIGN §10.28; game/gangTalk.js).
// On the island with no mission running (`missions.state === 'idle'`), Stig on foot within `r` m of
// one of `people` who stands free (normal, shown, not walked anywhere, not held by a mission's idle
// pose or a free-roam module (main.npcPosed), not the idle mission's giver, not Robban waving Stig
// over to the napping Berra) gets S.promptTalk; main asks after every interactable (so the sun
// cream's E at Majsan's back, 1.8 m, wins) and before the cars. E plays that person's next exchange as bubbles, a line at a
// time (each up as long as game.say holds it, `secs` at least, then `gap` s), Stig turned to them.
// An exchange holds while the idle mission lies from `from` to `to` (mission ids; `to: 'julafton'` =
// until julafton is done, 'end' = after the end); `hours` ([from, to) on the free-roam clock, §10.10)
// and `pryl` (Ole's gadget found) narrow it, and `with` names third speakers, who must stand free
// within `withR` m of the person. E again plays the next one in table order, round and round (per
// session). A line's `anim` holds a pose flag on its speaker while it is up; `{es}` / `{no}` are the
// clock's Spanish and Norwegian (= Swedish) time. The chain stops when Stig is more than `leaveR` m
// off, in a car or knocked down, when a speaker is no longer free, or when free roam ends (a mission,
// a dialogue: then its bubbles come down). While it runs no chatter bubble starts, and after it the
// NPCs within `hushR` m keep quiet `after` s. No line here repeats a chatter line (CHATTER,
// CHATTER_FLIGHT, an unlock's). Angerud has nothing after the end (hospital, and nothing about it).
// Invented (§1.6): the exchanges; most lines are the film's, relocated ([F*]), the rest ours.
export const TALK_ISLAND = {
  r: 3.0, leaveR: 8, withR: 6, secs: 2.2, gap: 0.35, hushR: 9, after: 4,
  people: {
    ole: [
      { id: 'rio', from: 'buss17', to: 'julafton', lines: [
        ['ole', 'Tenk å sitte her i desember. Det er som i Rio.'],       // [F*](t) the welcome meeting (research-plot.md:268), in Norwegian
        ['stig', 'Har du varit i Rio?'],                                   // [F*](t)
        ['ole', 'Nei, men jeg skal reise dit.'],                           // [F*](t) the end card is his trip there
      ] },
      { id: 'asna', from: 'bodega', to: 'julafton', lines: [
        ['stig', 'Undrar vad åsna heter på spanska.'],                     // [F*] his dalahäst question, about the donkey
        ['ole', 'Cabalho folkloristico… nativo!'],                         // [F*] his answer to it
        ['stig', 'Det var ju dalahästen.'],                                // [N]
        ['ole', 'Samme sak. Vi fikset det!'],                              // [N]
      ] },
      { id: 'klokka', from: 'asnan', to: 'end', pryl: 'klocka', lines: [
        ['ole', 'Hva er klokka, Stig-Helmer?'],                            // [N] Stig has his watch (§10.10)
        ['stig', 'Spansk, norsk eller svensk tid?'],                       // [F*] the watch's "spansk, norsk, svensk tid", asked
        ['ole', 'Alle tre!'],                                              // [N]
        ['stig', '{es} spansk tid. {no} norsk och svensk.'],               // [N]
      ] },
      { id: 'morn', from: 'friskotek', to: 'end', hours: [6, 11], lines: [
        ['ole', 'Morn, gutten min!'],                                      // [F*](t) julafton morning's greeting, relocated
        ['stig', 'Morrn morrn.'],                                          // [F*](t)
        ['ole', 'Ta to B-vitaminer til frokost. Bra for leveren!'],        // [F*] his B-vitamins before the grisfest, relocated
      ] },
      { id: 'concorde', from: 'end', to: 'end', lines: [
        ['ole', 'Concorde til Rio! 2 300 km i timen!'],                    // [F*] his dream on the plane (research-characters.md:177)
        ['stig', 'Jag kan flyga, jag är inte rädd.', { anim: 'wings' }],   // [F*] the mantra
        ['ole', 'Sånn, ja! Nå er du klar for Rio.'],                       // [N]
      ] },
    ],
    majsan: [
      { id: 'karlar', from: 'buss17', to: 'friskotek', lines: [
        ['stig', 'Hej igen… Stig-Helmer. Från planet.'],                   // [N]
        ['majsan', 'Lägg av, jag är trött på karlar!'],                    // [F*] (research-characters.md:222), relocated
        ['stig', 'Förlåt. Jag ville bara säga hej.'],                      // [N]
      ] },
      { id: 'fr', from: 'asnan', to: 'grisfest', lines: [
        ['stig', 'Var det inte du som satt hos Levander?'],                // [N]
        ['majsan', 'Jag vaccinerade mig och tänkte att jag kunde ta lite FR-terapi samtidigt.'],   // [F*] at the clinic in the film
        ['stig', 'Hjälpte det?'],                                          // [N]
        ['majsan', 'Fråga mig på hemresan.'],                              // [N]
      ] },
      { id: 'julfest', from: 'julafton', to: 'julafton', lines: [
        ['stig', 'Måste man gå på den?'],                                  // [F*](t) julafton morning (research-plot.md:365), relocated to the pool
        ['majsan', 'Var inte så typiskt svensk.'],                         // [F*](t)
        ['stig', 'Det är väl typiskt svenskt att ha julfest bland palmerna.'],   // [F*](t)
        ['majsan', 'Du kan väl komma för min skull?'],                     // [F*] (research-characters.md:225)
      ] },
      { id: 'hem', from: 'end', to: 'end', lines: [
        ['majsan', 'Jag vill inte åka hem.'],                              // [F*] her warm night by the pool, shortened
        ['stig', 'Vi kan ju åka hit igen. Nästa jul.'],                    // [N]
        ['majsan', 'Med SunTrip?'],                                        // [N]
        ['stig', 'Fast utan bränsletillägg.'],                             // [N]
      ] },
    ],
    siv: [
      { id: 'whisky', from: 'buss17', to: 'julafton', lines: [
        ['siv', 'En stor whisky och Sivan Åman är i form.'],               // [F*] (research-characters.md:245), relocated
        ['stig', 'Och om det inte räcker?'],                               // [N]
        ['siv', 'I värsta fall får jag ta Valium.'],                       // [F*]
      ] },
      { id: 'sture', from: 'buss17', to: 'grisfest', lines: [
        ['stig', 'Har Majsan någon där hemma?'],                           // [N]
        ['siv', 'Bara namnet – Sture! Kunde han prata om annat än fotboll och bruna bönor?'],   // [F*] (research-characters.md:246)
        ['stig', 'Jag gillar Hammarby. Men inte bruna bönor.'],            // [N]
      ] },
      { id: 'ole', from: 'fataga', to: 'julafton', lines: [
        ['siv', 'Du som delar rum med Ole… snarkar han?'],                 // [N]
        ['stig', 'Han har en kalkylator med väckarklocka.'],               // [F*] his gadget (research-plot.md:255)
        ['siv', 'Gud, vad praktiskt!'],                                    // [N]
      ] },
      { id: 'rio', from: 'end', to: 'end', lines: [
        ['siv', 'Ole ska ta med mig till Rio!'],                           // [N]
        ['stig', 'Har han varit i Rio?'],                                  // [F*](t) the welcome meeting's question
        ['siv', 'Nej, men han ska resa dit.'],                             // [F*](t) Ole's answer there; Siv gives it
      ] },
    ],
    berra: [
      { id: 'bagage', from: 'buss17', to: 'julafton', lines: [
        ['stig', 'Har du inget bagage?'],                                  // [N]
        ['berra', 'Jag reser lätt.'],                                      // [F*] his plastic bag at Arlanda (research-characters.md:346)
        ['stig', 'Min väska har inte kommit än.'],                         // [F*] his line at Las Palmas, adapted
      ] },
      { id: 'skaduha', from: 'end', to: 'end', lines: [
        ['berra', 'Ska du ha?'],                                           // [F*] the Arlanda men's room (research-plot.md:177), an echo of the gate
        ['stig', 'Nej tack, jag tål inte starksprit.'],                    // [F*]
        ['berra', 'Nej, vem fan gör det?'],                                // [F*]
      ] },
    ],
    robban: [
      { id: 'tullen', from: 'buss17', to: 'julafton', with: ['berra'], lines: [
        ['stig', 'Hur kom ni egentligen igenom tullen?'],                  // [N]
        ['robban', 'Invalido.'],                                           // [F*] at customs, an echo of buss17's intro
        ['berra', 'Va? Var jag med där?'],                                 // [F*] his Benidorm answer, adapted
      ] },
      { id: 'rom', from: 'end', to: 'end', lines: [
        ['robban', 'Åttioprocentig rom. På vinflaskor!'],                  // [F*] Sulan's tip at Arlanda, relocated
        ['stig', 'Jag håller mig till juice.'],                            // [N]
        ['robban', 'Du har ingen karaktär, du.'],                          // [F*] Berra's to him, relocated
      ] },
    ],
    angerud: [
      { id: 'tullare', from: 'buss17', to: 'asnan', lines: [
        ['angerud', 'Alla tullare har varit barn.'],                       // [F*] Operation Julklapp (research-characters.md:287), relocated
        ['stig', 'Förlåt?'],                                               // [N]
        ['angerud', 'Psykologi.'],                                         // [F*] "Psykologi, Levander.", shortened
      ] },
      { id: 'mustasch', from: 'bodega', to: 'bodega', lines: [
        ['angerud', 'Har du sett en lång, mörkhårig karl med glasögon och mustasch?'],   // [F*] Carmencita's description, he asks
        ['stig', 'Nej… inte vad jag vet.'],                                // [N]
      ] },
      { id: 'hittelon', from: 'ropavieja', to: 'julafton', lines: [
        ['angerud', 'Har du tänkt på det där med hittelön?'],              // [N]
        ['stig', 'Jag har inte hittat något.'],                            // [N]
        ['angerud', 'Tänk på det.'],                                       // [F*] the end of his hittelön speech
      ] },
    ],
    lasse: [
      { id: 'program', from: 'asnan', to: 'grisfest', lines: [
        ['stig', 'Är det något program i veckan?'],                        // [N]
        ['lasse', 'Grisfest på torsdag och julfest på julafton – med svensk julmat och svenska jullekar!'],   // [F*] the welcome meeting's reminder, adapted
        ['stig', 'Jullekar… bland palmerna.'],                             // [N]
      ] },
      { id: 'eden', from: 'end', to: 'end', lines: [
        ['lasse', 'Kommer du ihåg vad du lovade, Olsson?'],                // [N]
        ['stig', 'Jag lovar att bli en sundare och friskare människa under semestern.', { anim: 'oath' }],   // [F*] the friskotek oath, an echo
        ['lasse', 'Det gäller ända fram till hemresan!'],                  // [N]
      ] },
    ],
    affe: [
      { id: 'trott', from: 'friskotek', to: 'julafton', lines: [
        ['stig', 'Du ser trött ut.'],                                      // [N]
        ['affe', 'Transfern, natturen och frukostmötet. Och så dragspelet.'],   // [N]
        ['stig', 'Du kanske ska kvarta en stund?'],                        // [F*] his own "kvarta", turned back on him
      ] },
      { id: 'grodor', from: 'end', to: 'end', lines: [
        ['affe', 'Små grodorna en gång till, sen går jag och lägger mig.'],   // [N]
        ['stig', 'Det har du sagt tre gånger nu.'],                        // [N]
      ] },
    ],
    gabbe: [
      { id: 'natt', from: 'buss17', to: 'grisfest', lines: [
        ['gabbe', 'Följer du med på natturen, Olsson? Tonga Tonga öppnar klockan tio.'],   // [N]
        ['stig', 'Jag brukar gå och lägga mig vid tio.'],                  // [N]
        ['gabbe', 'Vi med. Fast på morgonen.'],                            // [N]
      ] },
      { id: 'bodega', from: 'end', to: 'end', lines: [
        ['gabbe', 'Pepes Bodega låg på baksidan av hotellet hela tiden!'], // [F*] Berra's find, relocated
        ['stig', 'Och de har letat i en hel vecka.'],                      // [N]
        ['gabbe', 'Det kallar jag semester.'],                             // [N]
      ] },
    ],
    herrStorch: [
      { id: 'film', from: 'buss17', to: 'julafton', lines: [
        ['stig', 'Har du filmat länge sådär?'],                            // [F*](t) Ole's question at the julfest ([WQ]), Stig asks
        ['herrStorch', 'Hela resan.'],                                     // [F*] [WQ]'s answer
        ['stig', 'Det blir säkert en fin film.'],                          // [N]
      ] },
      { id: 'omtag', from: 'end', to: 'end', lines: [
        ['stig', 'Blev det någon film till slut?'],                        // [N]
        ['herrStorch', 'Jag har börjat om från början.'],                  // [N]
      ] },
    ],
    fruStorch: [
      { id: 'mjolby', from: 'buss17', to: 'julafton', lines: [
        ['stig', 'Var bor ni någonstans?'],                                // [N]
        ['fruStorch', 'Vi bor i Mjölby.'],                                 // [F*] at the travel agency (research-characters.md:422), relocated
        ['stig', 'Jag menade här nere.'],                                  // [N]
      ] },
      { id: 'stork', from: 'buss17', to: 'julafton', lines: [
        ['fruStorch', 'Vi är på bröllopsresa, ska du veta.'],              // [N]
        ['stig', 'Grattis, fru Stork!'],                                   // [N]
        ['fruStorch', 'Storch.'],                                          // [F*] her "Vi heter faktiskt Storch, inte Stork.", shortened
      ] },
      { id: 'locket', from: 'end', to: 'end', lines: [
        ['fruStorch', 'Nu har min man äntligen tagit av locket.'],         // [N]
        ['stig', 'Då blir det film.'],                                     // [N]
        ['fruStorch', 'Av julgranen. I tjugo minuter.'],                   // [N]
      ] },
    ],
    jose: [
      { id: 'jobb', from: 'buss17', to: 'ropavieja', lines: [
        ['stig', 'Jobbar du på pizzeria?'],                                // [N]
        ['jose', 'Nej. Datatekniker.'],                                    // [F*](t) the sisters' word for him, relocated: he says it
        ['stig', 'Jag kontrollerar brödrostar.'],                          // [F*] his G17 job, shortened
      ] },
      { id: 'mamma', from: 'fataga', to: 'end', lines: [
        ['stig', 'Hur gick middagen med Siv?'],                            // [N]
        ['jose', 'Bra. Mamma följde med.'],                                // [N]
        ['stig', 'Ville hon inte sitta med er?'],                          // [F*](t) Siv's question at the restaurant, adapted
        ['jose', 'Nej, hon ville inte vara i vägen.'],                     // [F*] his answer there, in the past tense
      ] },
    ],
  },
};

// Barks by speaker (§14.10; Game.bark picks the table). These four are the Swedish tourists' (charter
// complaints). Strangers and the gate crowd (before Stig has met anyone) bark too: no names.
export const OUCH = ['Jag ska tala med platschefen!' /* [F*] */, 'Det är sista gången jag åker med SunTrip!' /* [F*] */,
  'Och ändå har vi betalat bränsletillägg!' /* [F*] */, 'Aj!' /* [N] */];
export const GETUP = ['Det måste vara värmen.' /* [F*] */, 'Det är kombinationen av sol och…' /* [F*] */,
  'Det är ju fan vad solen tar här nere.' /* [F*] */];
export const CARJACK = ['Det fattades bara det…!' /* [F*] */, 'Jag har betalat 3 000 för den!' /* [F*] */];
export const NPC_KICKED = ['Aj!' /* [N] */, 'Hallå!' /* [N] */, 'Var inte så typiskt svensk.' /* [F*] */, 'Va fan håller du på med?' /* [N] */];

// Ole's (bokmål, §1.3: Ole never speaks Swedish): cheerful and unshakeable, and no names (he barks
// at the gate before the two have met).
export const OUCH_OLE = ['Au! Hva i all verden…' /* [N] */, 'Oi! Se deg for, da!' /* [N] */, 'Det gikk bra, det!' /* [N] */,
  'Au, au… Godt jeg tok B-vitaminene mine i dag.' /* [N] */];
export const GETUP_OLE = ['Tenk ikke mer på det.' /* [F*] */, 'Ingen fare. Jeg har reisesyketabletter.' /* [F*] */,
  'Sånn ja! Helt normalt.' /* [N] */];
export const NPC_KICKED_OLE = ['Au!' /* [N] */, 'Au! Hva er det med deg?' /* [N] */, 'Ta det rolig, kompis!' /* [N] */,
  'Oi! Er det sånn man gjør i Sverige?' /* [N] */];

// The Spanish cast and the local pedestrians (randomPed `local`): Spanish exclamations a Swedish
// player understands (§1.3, like the locals' ¡Cuidado! in §6.7). José is here too: Swedish in his
// scenes, but a Spaniard (and a mamma's boy) when he lands on the pavement.
export const LOCAL_CAST = ['jose', 'mamma', 'pappa', 'carmencita', 'portier', 'hittegods', 'souvenir', 'stadare', 'grisbonde', 'varden', 'telefonist'];
export const OUCH_LOCAL = ['¡Ay, mi madre!' /* [N] */, '¡Ay, ay, ay!' /* [N] */, '¡Turistas!' /* [N] */, '¡Cuidado!' /* [N] */];
export const GETUP_LOCAL = ['¡Madre mía…!' /* [N] */, 'Suecos…' /* [N] */, 'Nada, nada.' /* [N] */];
export const CARJACK_LOCAL = ['¡Ladrón!' /* [N] */, '¡Mi coche!' /* [N] */, '¡Policía!' /* [N] */];
export const NPC_KICKED_LOCAL = ['¡Ay!' /* [N] */, '¡Señor, por favor!' /* [N] */, '¡Loco!' /* [N] */, '¡Basta!' /* [N] */];

// SunTrip's own staff and the resident bungalow seller (Phase 3 r3): run over, they do not threaten
// the platschef (Lasse is one), swear off SunTrip or count the fuel surcharge. Their other barks
// are the tourists'.
export const STAFF_CAST = ['lasse', 'affe', 'gabbe', 'saljare'];
export const OUCH_STAFF = ['Aj!' /* [N] */, 'Hoppsan!' /* [N] */, 'Det ingår inte i mina åtaganden!' /* [F*] Lasse's reply to Angerud */];

// Game.bark(ch, kind): `ole` for Ole, `local` for LOCAL_CAST and local pedestrians, `staff` for
// STAFF_CAST where the kind has one, else `sv`.
export const BARKS = {
  ouch: { sv: OUCH, ole: OUCH_OLE, local: OUCH_LOCAL, staff: OUCH_STAFF },
  getUp: { sv: GETUP, ole: GETUP_OLE, local: GETUP_LOCAL },
  kicked: { sv: NPC_KICKED, ole: NPC_KICKED_OLE, local: NPC_KICKED_LOCAL },
  carjack: { sv: CARJACK, local: CARJACK_LOCAL },   // only pedestrians lose a car
};

// Förlåt, förlåt! – Stig-Helmer says sorry (free roam; feature 11, DESIGN §10.14; game/stigSorry.js).
// Stig's own lines, so not in BARKS (that one is picked by who is hurt). On the island with no
// mission running (`missions.state === 'idle'`) and no dialogue, `at` s after he bowls someone over
// with a kick or a stomp (`kick`, one line a kick however many it hits), runs someone over (`hit`),
// breaks a thing on foot or in his car (`prop`; a market fruit stall `stand`, §10.19) or makes it go
// up (`boom`: a petrol pump or a gas bottle): the session's first offence always, later ones at `chance` and no sooner than `gap` s
// after his last. A carjacking always gets `carjack` `askAt` s after the driver tumbles out; a
// Swedish tourist then answers `no` `noGap` s after the question instead of his complaint (the
// session's first one always, then at `noChance`). Never while Stig is still saying something.
// A kind's first line in a session is its first, later ones not its last. The SKANDAL is unchanged.
// Invented (§1.6): the apologies; Majsan's question and Stig's answer are the film's, roles swapped.
export const STIG_SORRY = {
  at: 0.5, gap: 7, secs: 2.2,
  chance: { kick: 0.5, hit: 0.6, prop: 0.35, stand: 1, boom: 1 },
  askAt: 0.6, noGap: 0.9, noChance: 0.35, noSecs: 1.6,
  kick: ['Oj! Förlåt, förlåt! Det var inte meningen.' /* [N] */, 'Ursäkta! Har ni slagit er?' /* [N] */,
    'Förlåt! Jag tappade balansen.' /* [N] */, 'Oj, oj… Förlåt! Jag ville inte…' /* [N] */],
  hit: ['Förlåt! Jag såg er inte!' /* [N] */, 'Oj! Förlåt! Hur gick det?' /* [N] */,
    'Förlåt! Bromsen satt inte där jag trodde.' /* [N] */],
  prop: ['Jag ersätter den, självklart!' /* [N] */, 'Oj… Den stod visst i vägen. Förlåt.' /* [N] */,
    'Förlåt! Jag betalar, så klart.' /* [N] */],
  boom: ['Oj… förlåt.' /* [N] */],
  stand: ['Oj… förlåt… jag ersätter naturligtvis!' /* [N] */],   // a fruit stall (§10.19)
  carjack: ['Ursäkta, är det din bil?' /* [F*] Majsan's question to Stig at the travel agency's window, relocated: Stig asks */],
  no: 'Nej.',                                                                      // [F*] Stig's answer there, relocated: the driver gives it
};

// Grisarna ramlar av grisbilen – the pigs tumble off the grisbil (free roam, DESIGN §10.15;
// game/pigTruck.js). Only the unlocked `car` (UNLOCKS.grisbil; the bodega's grisbilFollow never),
// only with the player at its wheel, on the island with no mission running (`missions.state ===
// 'idle'`). A landing at `land` m/s or more, a crash at `crash` m/s or more, or `skidSecs` s of
// skidding (skidAmt >= `skidAmt` at `skidMin` m/s or more; a full stop from top speed is one) tips
// one pig over the side, in `order` (the back two first), no sooner than `gap` s after the last. It
// flies out with `fly` (`keep` × the car's velocity, `back`/`side`/`up` m/s), lies `downSecs`, shakes
// itself `shakeSecs` with `oink` over it and trots off at `trot` m/s for `trotSecs`; then it potters
// round where it landed (`roamR`) and trots away from Stig within `shyR` m at `shy` m/s (slower than
// his walk). Stig on foot within `catchR` m lifts it over his head (walking only; `pickup`, the first
// always, then at `pickChance`) and carries it to the bed (`bedR` m from the bed's middle); the
// grisbil rolling at under `creep` m/s with the bed within `carCatchR` m of a pig on its feet makes
// it hop up itself, and any car coming at it faster than that makes it skip `dodge` m/s aside
// (never run over, never kicked, no SKANDAL). Stig on foot within `askR` m of a loose pig with Lasse
// within `lasseR` m asks him (`ask`, at most every `askEvery` s), and Lasse refuses `refuseGap` s
// later. With all three in the bed, the grisbil stopped (under `zone.stop` m/s) within `zone.r` m of
// `zone.lm` by the piglet pen sends them over the fence into the pen (`pen`: their wander box round
// `pen.lm`, half-sizes `hw` across and `hd` along its yaw), and the grisbonde thanks and pays `pay`
// (`cleanPay` when none fell since the bed was last full; else Stig sighs `sick` `sickGap` s later).
// He walks over to the pen (`bonde.path`, [left, forward] from `zone.lm`) when the grisbil comes
// within `bonde.r` m with pigs in the bed, and stays until it has gone or `bonde.hold` s after his
// thanks. The bed fills again when the grisbil stands within `home.r` m of its bay at Flamenco with
// Stig over `home.away` m off. Invented (§1.6): all of it.
export const PIG_TRUCK = {
  car: 'grisbil',
  land: 6, crash: 7, skidAmt: 0.5, skidMin: 6, skidSecs: 0.6, gap: 1.2,
  order: [1, 2, 0],
  fly: { keep: 0.55, back: 1.6, side: 3.2, up: 4.6 },
  downSecs: 0.55, shakeSecs: 0.7, trot: 3.2, trotSecs: 2.2, roamR: 9, shyR: 4.5, shy: 3.0,
  catchR: 1.4, bedR: 2.6, creep: 3.5, carCatchR: 2.8, dodge: 6, oinkEvery: 3,
  zone: { lm: 'grisfalla', r: 6, stop: 2 },
  pen: { lm: 'grisfallaIn', hw: 2.4, hd: 2.9 },
  home: { r: 20, away: 30 },
  pay: 100, cleanPay: 250,
  bonde: { r: 45, path: [[4.1, -6], [3.9, 2.2]], walk: 3.2, hold: 4 },
  askR: 10, lasseR: 22, askEvery: 60, refuseGap: 1.4, pickChance: 0.5,
  oink: 'NÖFF!',                                                                     // [N] the pig
  fall: 'Oj! Grisen!',                                                               // [N] Stig, the session's first fall
  pickup: ['Förlåt, lilla gris. Upp med dig.' /* [N] */, 'Ursäkta! Nu åker vi hem.' /* [N] */, 'Såja. Ingen fara.' /* [N] */],
  ask: 'Lasse! Kan du ta den där?',                                                  // [N] Stig
  refuse: 'Det ingår inte i mina åtaganden.',                                        // [F*] Lasse's reply to Angerud, relocated
  thanks: '¡Gracias, señor! Alla grisar hemma!',                                     // [N] the grisbonde
  missing: 'Det fattas grisar, señor!',                                              // [N] the grisbonde
  sick: 'Jag har lite anlag för åksjuka.',                                           // [F*](t) Stig's line from the bus, relocated
  sickGap: 1.8,
  title: 'Grisbilen',                                                                // [N]
  looseText: 'En gris har ramlat av flaket! Gå fram till den – eller krypkör intill.',   // [N]
  looseMany: '{n} grisar har ramlat av flaket! Gå fram till dem – eller krypkör intill.', // [N]
  carryText: 'Bär grisen tillbaka till flaket.',                                     // [N]
  homeText: 'Kör hem grisarna till fållan på grisfesten.',                           // [N]
  paidToast: 'Grisbonden betalade {n} pta.',                                         // [N]
};

// Lapplisan Majsan – "Ursäkta, är det din bil?" (free roam, DESIGN §10.17; game/lapplisa.js). On the
// island with no mission running (`missions.state === 'idle'`); Majsan only when she is free (shown,
// standing, nobody else's: not the waiting mission's giver or extra, not judging or dancing).
// (1) A car Stig has left still with at least `wheels` wheels on the sidewalk (layout.js sidewalkAt)
// for `delay` s while he is within `nearR` m: Majsan comes round the nearest corner (`cornerIn` m
// round it, a walk of at most `cornerMax` m; else from `alongR` m along the sidewalk; out of the
// camera's view, which counts to `seenR` m, and `minFromStig` m from him)
// at `walk` m/s on a line `ins` m in from the kerb, writes a ticket for `writeSecs` s and puts it on
// the windscreen. Stig on foot within `askR` m: `ask`, and `askGap` s later his `no` (the hire car's
// `noHyrbil`). `towGap` s after that (or after the ticket): `tow`, and `fadeAt` s later the car is
// gone: behind a `fadeSecs` s black fade with Stig within `seeR` m, else at once. A car off the
// street goes; a named one (the hire car, the grisbil) is back in its bay. Getting in first keeps it
// (and its ticket). Never a bus, a Guardia jeep, a locked car or the grisbil with a pig off it.
// (2) Between missions, with Angerud at Viking Bar, his white hire car (`angerud`) stands on the
// sidewalk outside Centro La Medina (landmark `angerudBil`); the first time Stig walks past on foot
// within `angerud.r` m the film's first meeting plays as a short scene (`film`), with the GRÚA truck
// (`angerud.truck`) and his outburst, once ever (`angerud.onceKey` in the saved unlocks); after it he
// mutters `mutter` until the next mission.
// (3) A car Stig leaves straight in one of Flamenco's painted bays (its middle inside, its axis within
// `bayYaw` rad of the bay's): Majsan at home by the pool (within `homeR` m of her spot and `praiseR`
// m of the car) `praise`, and Siv `replyGap` s later `praiseReply`; the first time ever `praisePay`
// pta (`praiseKey`). At most every `praiseEvery` s.
// Invented (§1.6): Majsan ticketing on the island, the tow, her praise. The film lines are the first
// meeting at the travel agency's window and the sisters' balcony, relocated.
export const LAPPLISA = {
  wheels: 2, still: 0.5, delay: 6, nearR: 45,
  walk: 2.6, ins: 1.9, cornerIn: 7, cornerMax: 32, alongR: 22, minFromStig: 12, seenR: 90, stuckSecs: 2, leaveMax: 25,
  writeSecs: 2.2, askR: 14, askGap: 1.1, towGap: 3.5, fadeAt: 1.2, fadeSecs: 0.6, seeR: 60, secs: 2.4,
  ask: 'Ursäkta, är det din bil?',                                                  // [F*] Majsan at the travel agency's window, relocated
  no: 'Nej.',                                                                       // [F*] Stig's answer there, relocated
  noHyrbil: 'Den är… hyrd.',                                                        // [N] Stig, of the hire car
  tow: 'Okej, grabbar!',                                                            // [F*] Majsan to the tow men, relocated
  angerud: {
    lm: 'angerudBil', type: 'hatch', color: 0xf4f4f0, r: 12, onceKey: 'lappFilm', run: 3.2,
    truck: { type: 'pickup', color: 0xf07a1e, sign: 'GRÚA' },                       // [N] the truck's sign (no firm's name, §1.5)
  },
  film: {
    outburst: ['Vad i helvete tar ni er till?' /* [F*] Angerud rushing out, relocated */,
      'Hederliga bilister ger ni er på, men få hyfs på ungdomen klarar ni inte!' /* [F*] */,
      'Förbannade förmyndarmentalitet!' /* [F*] */],
    why: 'Är det inte jobbigt när alla skäller?',                                   // [F*] Stig to Majsan, relocated
    job: 'Jo, jag gör ju bara mitt jobb.',                                          // [F*] Majsan's answer, relocated
  },
  mutter: ['Hederliga bilister ger ni er på…' /* [F*] shortened */, 'Förbannade förmyndarmentalitet!' /* [F*] */,
    'Jag ska tala med platschefen.' /* [F*] */],
  bayYaw: 0.17, homeR: 4, praiseR: 40, praiseEvery: 90, replyGap: 2.4, praisePay: 50, praiseKey: 'lappRuta',
  praise: 'Där ser man. Det går att parkera här nere också.',                       // [N] Majsan over the hedge
  praiseReply: 'Spänn av, Majsan. Du är ledig.',                                    // [F*](t) Siv on the balcony, relocated
  paidToast: 'Snyggt parkerat! {n} pta.',                                            // [N]
};

// Låna Guardia-jeepen – "Ursäkta, är det din bil?" (free roam, DESIGN §10.34; game/guardiaJeep.js).
// The bodega's unlock (`unlock`, UNLOCKS.grisbil, so an old save has it too) leaves `car`, the west
// jeep at the Casa Cuartel, open, but only on the island with no mission running (`missions.state
// === 'idle'`): in a mission it is locked as before, so no mission, stage kind, timer or calibration
// pool sees it. The unlock's first time (not a loaded save's) adds its own toast, `open`. Getting in
// within `loanR` m of its bay is the loan (`prompt`): Stig's `borrow`, and `shameAt` s later SKANDAL
// `shame` (× the meter's gain: the top) and the pursuit. Shaken off (an
// escape, the porter, the wardrobe), the jeep is his for the session: `his`, and no SKANDAL when he
// gets in again. Busted in it, or in the loan's pursuit: the officer's `ask` at `askAt` s instead of
// his bust line (he lingers to `linger` s), Stig's `no` at `noAt`, and at `towAt` the jeep back in
// its bay (behind a `fadeSecs` s black fade with it within `seeR` m of him) and `towToast`; no bust
// radio. Wrecked and cleared away, a new one stands in its bay once he is `respawnR` m from it.
// H in it is the siren, not the horn: the sound, the blue lamp on its roof (on and off every `blink`
// s) and the screen's blue corners. With no pursuit, traffic ahead going his way (`yield`: within
// `r` m ahead of him, `lat` m across, heading within acos `cos`) slows to `slow` m/s and keeps
// `aside` m to the right, eased over `ease` s (drivers.js); the session's first car to give way gets
// Stig's `surprised`. Angerud free and in sight within `angerud.r` m of the siren: one of
// `angerud.lines` with his oath, at most every `angerud.every` s.
// Invented (§1.6): the loan, the siren on H and the traffic giving way. The question and the answer
// are the film's first meeting at the travel agency's window and Angerud's lines his outburst at the
// tow there, relocated.
export const GUARDIA_JEEP = {
  car: 'guardia1', unlock: 'grisbil', loanR: 20, shame: 100, shameAt: 1.2,
  prompt: '<b>E</b> Låna jeepen',                                                   // [N]
  borrow: 'Jag lånar den bara en liten stund…',                                     // [N] Stig, getting in
  open: 'Vid Guardia Civils kasern står en jeep olåst…',                             // [N] the toast after the unlock's
  his: 'Guardia-jeepen är din – håll H för sirenen.',                                // [N]
  ask: 'Ursäkta, är det din bil?',                                                  // [F*] Majsan at the travel agency's window, relocated to the officer
  no: 'Nej.',                                                                       // [F*] Stig's answer there, relocated
  askAt: 1.8, noAt: 2.9, towAt: 3.9, fadeSecs: 0.5, linger: 4.4, seeR: 60, respawnR: 80,
  towToast: 'Guardia-jeepen är bärgad – tillbaka vid kasernen.',                    // [N]
  blink: 0.225,
  yield: { r: 30, lat: 4, cos: 0.8, slow: 4, aside: 1.25, ease: 0.5 },
  surprised: 'Oj… de släpper fram mig!',                                            // [N] Stig, the first car that gives way
  angerud: { r: 30, every: 40, oath: 1.6,
    lines: ['Hederliga bilister ger ni er på…' /* [F*] his outburst at the tow, shortened */, 'Förbannade förmyndarmentalitet!' /* [F*] */] },
};

// Collectible sets (DESIGN §10.1). Generic pickup code lives in main.js.
export const COLLECTIBLES = {
  prylar: {
    kind: 'pryl', motion: 'spin', beam: true, pickup: 'touch', jingle: 'pryl',
    label: 'Oles prylar', marker: 'pryl', icon: 'pryl-icon', bonus: 1000,
    first: ['ole', 'En av dingsene mine! Finn resten, Stig-Helmer.'],               // [N]
    complete: ['ole', 'Det fikser vi. Vi fikser alt!'], completeUnlock: 'samba',     // [F*]
    items: [
      { id: 'klocka', lm: 'pryl_klocka', line: 'Digital, analog, spansk, norsk, svensk tid, kronometer, og så klokke.' }, // [F*]
      { id: 'poolpen', lm: 'pryl_poolpen', line: 'Penn som skriver under vannet.' },          // [F*]
      { id: 'kalkylator', lm: 'pryl_kalkylator', line: 'Kalkulator – med vekkerklokke!' },    // [F*]
      { id: 'kniv', lm: 'pryl_kniv', line: 'Swiss Army Knife… Saks – uten skrutrekker.' },    // [F*]
      { id: 'kamera', lm: 'pryl_kamera', line: 'Kamera. Skjerpe. Smil.' },                    // [F*]
      { id: 'glasogon', lm: 'pryl_glasogon', line: 'Mot klor.' },                             // [F*]
      { id: 'pung', lm: 'pryl_pung', line: 'Å ha penger i når man svømmer.' },                // [F*]
    ],
  },
  fenor: {
    kind: 'fena', motion: 'circle', pickup: 'squash', jingle: 'squeak', splash: true, sparkle: 0x9fdcff,
    label: 'Hajfenor', marker: 'fena', icon: 'fena-icon', bonus: 1000,
    first: ['lasse', 'Hajar i poolen igen? Ring kliniken!'],                           // [F*] Lasse's film line, adapted
    complete: ['lasse', 'Inga fler hajar i poolerna. Berra lovar att sluta dricka. Till lunch.'], // [N]
    items: ['fena_flamenco', 'fena_suntrip', 'fena_plaza', 'fena_golf', 'fena_bungalow', 'fena_hamn', 'fena_hav']
      .map((lm) => ({ id: lm, lm })),
  },
  // Kontrollerad av G17 (feature 33, §10.24): seven chrome toasters on counters, crates and a table.
  // `inspect`: no pickup by touch; game/toasters.js runs the timing game (BRODROST) and collects one
  // that passes. `keep`: a collected one stays where it stands, labelled (Collectible.mark). `idle`:
  // on the minimap only while no mission runs (they work only then).
  brodrostar: {
    kind: 'brodrost', motion: 'none', pickup: 'inspect', keep: true, idle: true, jingle: 'pling', sparkle: 0xf7c31b,
    label: 'G17-brödrostar', marker: 'rost', icon: 'rost-icon', bonus: 1000,                       // [N]
    complete: ['majsan', 'Så det är du som är G17! Nu vågar jag köpa en brödrost.'],              // [N]
    items: ['ferreteria', 'poolbar', 'marknad', 'portier', 'supermercado', 'grillpaco', 'hittegods']
      .map((id) => ({ id, lm: 'brodrost_' + id })),
  },
};

// The G17 toasters' timing game (free roam; feature 33, §10.24; game/toasters.js, invented §1.6).
// E by one pushes the lever down: the objective card shows the haggle's bar as a scale from pale
// (left) to burnt (right) and the marker crosses it once in `secs` s (× `speedUp` for each toaster
// already passed); the golden field is `zone` wide, its left edge drawn in `zoneAt` each try. E again
// pops the bread: in the field the toaster passes, before it the bread is pale, after it (or at the
// right end) burnt. A miss is tried again with E after `restSecs`; a try is off when he is over
// `cancelR` m away, in a car, in a dialogue, or a mission or a pursuit starts.
export const BRODROST = {
  r: 1.3, priority: -1, cancelR: 3, restSecs: 0.6,
  secs: 3.2, speedUp: 0.92, zone: 0.22, zoneAt: [0.48, 0.6], tick: 0.4,
  prompt: '<b>E</b> Kontrollera brödrosten',                                      // [N]
  promptPop: '<b>E</b> Upp med brödet!',                                          // [N]
  title: 'Kontrollerad av G17',                                                   // [F*] the label, research-plot.md:61
  text: 'Tryck E när brödet är gyllenbrunt',                                      // [N]
  barColor: 'linear-gradient(90deg, #f6ecc8 0%, #ecd08a 35%, #d88c2a 62%, #8a4a1a 82%, #2e231c 100%)',
  zoneColor: ['rgba(255, 214, 90, 0.45)', '#fff8e6'],                             // the golden field and its edges
  lines: {
    ok: 'Gyllenbrun. Godkänd!',                                                   // [N]
    pale: 'Blekt. Underkänd.',                                                    // [N]
    burnt: 'Det här hade aldrig gått igenom på lagret.',                          // [N]
  },
  toasts: {
    pale: 'För blekt. Tryck E för en ny provrostning.',                           // [N]
    burnt: 'Bränt! Underkänd. Tryck E för en ny provrostning.',                   // [N]
  },
  cheerSecs: 1.6, flailSecs: 1.4,
  // A burnt one with a sister near: one of them says it (the source does not say which, §10.24).
  sister: { keys: ['siv', 'majsan'], r: 25, at: 1.2, gap: 45, secs: 2.6,
    line: 'Bara de inte är ingenjörer.' },                                        // [F*] said on the plane (research-plot.md:199)
};

// Rum 107 fylls med resans minnen (free roam; feature 38, §10.25; game/room107.js). The keepsakes in
// room 107 show by themselves (hotels.js roomKeepsakes); these are the room's three E spots (their
// landmarks), on foot on the island with no mission running, each `r` m round its spot. The shelf:
// Stig checks it (`line`, or `empty` with nothing found), the collect card counts the gadgets and the
// fins, and `oleAt` s later Ole on the radio counts his gadgets (`count` with `nums[n]`, `none` or
// `full`); the next check after `gap` s. The giraffe (after julafton): Stig holds it up for `holdSecs`
// s with `line` (put back sooner with E, `putBack`, or over `dropR` m from its spot). The boombox (after the samba unlock,
// while the samba is not playing): the island tune to samba, and Ole's `line` on the radio.
// Invented (§1.6): the shelf and what is put on it.
// Garderoben och bergsprängaren i rum 107 (free roam; feature 67, §10.36): the boombox is the pause
// menu's Musik in the room. Before the samba unlock (`locked`) Ole's `quartz` on the radio and no
// tune, the next E after `gap` s; after it E plays the samba (`prompt`; Ole's `line`, then `again`
// in turn) and, while the samba plays, back to the island's sol tune (`off`). The wardrobe
// (`wardrobe`, at the Skjortbytet hideout's spot `lm`, `r` m) changes his free-roam outfit to the
// next in `order` that is in it (`from`: the missions.index it hangs there from; 13 = after the
// end): frozen `secs` s with the next on the hanger, then a white flash and the outfit (saved), the
// one he took off on the hanger, the doors shut `shutSecs` s later, and `show` s more in the shot
// (`shot`: the eye and the look in `lm`'s frame, [left, forward, height]; Stig on `mark`, [left,
// forward], beside the hanger as the shot sees it) turned to the eye. Each outfit's `say` is
// Stig's, its `radio` Ole's `radioAt` s after the flash (while it is still on).
// Invented (§1.6): the wardrobe as a menu; the lines are the film's, relocated.
export const RUM107 = {
  shelf: { lm: 'rum107Hylla', r: 1.3, gap: 4, oleAt: 1.4,
    prompt: '<b>E</b> Kontrollera hyllan',                                        // [N]
    line: 'Kontrollerad av G17.',                                                  // [F*] his boast (research-plot.md:61), relocated
    empty: 'Inget att kontrollera.',                                               // [N]
    nums: ['Ingen', 'En', 'To', 'Tre', 'Fire', 'Fem', 'Seks', 'Sju'],
    count: '{n} av sju! Snart er hylla full.',                                     // [N]
    none: 'Hylla er tom – dingsene mine er spredt over hele øya!',                // [N] after his line in friskotek's outro
    full: 'Alle sju! Nå er hylla full.' },                                         // [N]
  giraffe: { lm: 'rum107Giraff', r: 0.55, holdSecs: 3.5, dropR: 2.5,
    prompt: '<b>E</b> Ta upp giraffen',                                            // [N]
    putBack: '<b>E</b> Ställ tillbaka giraffen',                                   // [N]
    line: 'Precis en sån har jag önskat mig.' },                                   // [F*](t) Majsan's present at the julfest (research-plot.md:371)
  radio: { lm: 'rum107Radio', r: 0.8, gap: 1.5,
    prompt: '<b>E</b> Spela samba',                                                // [N]
    line: 'Ja, det er fint! Samba!',                                               // [F*] Ole furnishing for the boombox (research-plot.md:254)
    again: 'Hører du? Samba.',                                                     // [F*] his demonstration on the plane (research-characters.md:179), relocated
    locked: '<b>E</b> Bergsprängaren',                                             // [N]
    quartz: 'Kvarts og digital.',                                                  // [F*] the same demonstration, shortened
    off: '<b>E</b> Stäng av sambaen' },                                            // [N]
  wardrobe: { lm: 'rum107Garderob', r: 1.2, secs: 1.0, shutSecs: 0.8, show: 1.4, radioAt: 0.7,
    prompt: '<b>E</b> Byt kläder',                                                 // [N]
    order: ['kostym', 'arlanda', 'hawaii', 'rio'],
    from: { kostym: 0, arlanda: 0, hawaii: 6, rio: 13 },
    mark: [0.45, 0], shot: { eye: [-2.0, -3.6, 2.0], look: [0.2, 0.3, 1.15] },
    lines: {
      kostym: { radio: ['ole', 'Du kan ikke gå sånn her nede! Den buksa og det slipset! … Shorts.'] },   // [F*] room 107 in buss17's outro (research-characters.md:184), on the radio
      arlanda: { say: 'Det måste vara värmen.' },                                  // [F*] Angerud's excuse after the golf (research-plot.md:294), Stig's here
      hawaii: { say: 'Är den inte lite skrikig?',                                  // [F*] Stig in room 107 (buss17's outro), relocated
        radio: ['ole', 'Du skal ha sterke farger, du som er mørk.'] },             // [F*] Ole's answer there, on the radio
      rio: { radio: ['ole', 'Og så Rio! Stranda, jentene og samba.'] },           // [F*] his Concorde dream on the plane (research-characters.md:177), relocated
    } },
};

// Smörj in Majsans rygg – the SOLKRÄM meter (free roam; feature 35, DESIGN §10.26; game/solkram.js).
// From `fromIndex` (after fataga, whose intro first has the film's two pool lines), by day (the
// clock's `dayHours`), with both sisters at home and free: E within `r` m of Majsan plays `ask` (the
// film's pair, once ever: the `onceKey` marker in the saved unlocks; after it one of `again`), she
// turns her back (her world yaw `stage.yaw`) and Stig stands `stage.back` m behind her with his
// hands on her shoulders (anim `rub`). Holding E fills the meter, the whole bar in `secs` s (real
// time); he lets go in the green field, `zone.w0` wide on the session's first try and × `zone.shrink`
// each try after it, down to `zone.min`, centred in `zone.at`. In it: 7 within `bull` of the middle
// (the light stripe), 6 within `six`, else 5; Majsan's line, Siv's card and line from her place
// (`kinds`). Past it (or held to the end): the cream runs down her back (`drip` s) in the shot from
// behind, and Siv's minus. Short of it: Majsan asks if that was all. No hold within `readySecs`:
// `giveUp`. The best points are `records.solkram` (saved); the first 7 unlocks `sjuPoang` (Siv's
// chatter). The shots (`camAsk`/`lookAsk` the ask, `cam`/`look` the meter, `camOver`/`lookOver` the
// cream running, Stig `overStep` m further back): [forward, right, height] in Majsan's frame
// (forward = her facing with her back to Stig); `bottle` [forward, right]. Invented (§1.6): the
// meter, the scores for the cream, Siv's cards; the lines are the film's (the pool,
// research-plot.md:286; the points on the plane, :197) and ours.
export const SOLKRAM = {
  fromIndex: 11, onceKey: 'solkramFilm', r: 1.8, priority: 0, homeR: 0.8, restSecs: 0.6,
  secs: 2.4, zone: { w0: 0.26, shrink: 0.88, min: 0.12, at: [0.55, 0.74] }, bull: 0.022, six: 0.055,
  readySecs: 12, squirtEvery: 0.28, cardSecs: 4.6, drip: 1.6, flailSecs: 1.4,
  stage: { yaw: Math.PI / 2, talk: 1.3, back: 0.97, overStep: 0.45, bottle: [-0.45, 0.8],
    camAsk: [-0.5, 3.6, 2.1], lookAsk: [-0.5, 0, 1.8], cam: [3.3, 1.7, 2.1], look: [-0.3, 0, 1.6],
    camOver: [-2.2, 3.0, 2.1], lookOver: [-0.2, 0, 1.3] },
  prompt: '<b>E</b> Smörj in ryggen',                                              // [N]
  title: 'Solkräm',                                                               // [N]
  text: 'Håll E · släpp i det gröna',                                             // [N]
  textHold: 'Håll… håll…',                                                        // [N]
  textZone: 'Släpp i det gröna!',                                                 // [N]
  textOver: 'Släpp! Släpp!',                                                      // [N]
  barLabel: 'Majsans rygg', barLabelOver: 'För mycket!',                          // [N] · [N]
  barColor: '#fffbea', barColorOver: '#e0503a',                                   // the cream; past the field, red
  zoneEdge: '#e9fff0',
  // The film's pair, said once ever (it is first heard in fataga's intro).
  ask: [
    ['majsan', 'Du, vill du smörja in mig på ryggen?'],                           // [F](t) the pool (research-plot.md:286), speaker interpreted
    ['majsan', 'Ta inte för mycket, då kan det börja koka.'],                     // [F](t)
    ['stig', 'En kontrollerad mängd. Det är mitt yrke.'],                         // [N]
  ],
  again: [
    [['majsan', 'Ryggen igen, Stig-Helmer? Lagom mycket, nu.']],                  // [N]
    [['majsan', 'Du missade en bit mellan skulderbladen.']],                      // [N]
    [['majsan', 'Solen tar här nere. Smörjer du mig igen?']],                     // [N]
    [['majsan', 'Siv säger att du har varma händer.'], ['stig', 'Det är cirkulationen.']],   // [N] · [N]
  ],
  // The result: bubbles [delay s, who, text]; the scene ends `tail` s after the last (each up at
  // least `lineSecs`). The over's shot from behind cuts back to the meter's at `front` s, for Siv.
  lineSecs: 2.6, tail: 2.2,
  kinds: {
    7: { card: '7', lines: [
      [0.3, 'majsan', 'Mm… precis lagom.'],                                       // [N]
      [1.8, 'siv', 'Giraffen, då? Sju.'],                                         // [F*](t) the points scene on the plane (research-plot.md:197), the score ours
      [3.4, 'majsan', 'Mer än pizza-racern!'],                                    // [F*](t) "Mindre än pizza-racern?" turned round
    ] },
    6: { card: '6', lines: [
      [0.3, 'majsan', 'Mm. Det där var skönt.'],                                  // [N]
      [1.8, 'siv', 'Sex, tycker jag.'],                                           // [F*](t) the pizza-racer's score on the plane
    ] },
    5: { card: '5', lines: [
      [0.3, 'majsan', 'Tack, Stig-Helmer.'],                                      // [N]
      [1.8, 'siv', 'Giraffen, då? Fem.'],                                         // [F*](t) the film's four, one more
    ] },
    over: { card: '–1', laugh: true, front: 3.2, lines: [
      [0.2, 'majsan', 'Oj! Nu kokar det!'],                                       // [N]
      [1.5, 'stig', 'Den här flaskan hade aldrig gått igenom G17.'],              // [N]
      [3.4, 'siv', 'Det blir minuspoäng.'],                                       // [F*](t) the points scene on the plane
    ] },
    early: { lines: [
      [0.3, 'majsan', 'Var det allt?'],                                           // [N]
      [1.7, 'stig', 'Man ska inte slösa.'],                                       // [N]
    ] },
  },
  giveUp: [[0.3, 'majsan', 'Jaha. Då får jag väl göra det själv.']],              // [N]
  score: 'SOLKRÄM {n} P', scoreOver: 'FÖR MYCKET! –1 P', scoreEarly: 'FÖR LITE!',  // [N] · [N] · [N]
  record: 'REKORD {n} P', newRecord: 'NYTT REKORD!',                              // [N] · [N] (as the diving judges')
};

export const UNLOCKS = {
  // The bodega's unlock also leaves the west Guardia jeep at the Casa Cuartel open between missions,
  // with a toast of its own (GUARDIA_JEEP, game/guardiaJeep.js, §10.34).
  grisbil: { car: { type: 'grisbil', name: 'grisbil', at: 'flamencoDrive', dx: 4, dz: 0 },
    toast: 'Upplåst: <b>Grisbilen</b> – parkerad vid Hotell Flamenco. Den luktar.' },   // [N]
  samba: { tune: 'samba', toast: 'Upplåst: <b>Musik: samba</b> i pausmenyn' },        // [N] P1
  // After the end: Berra and Robban posted at the bodega they found, with chatter about having found
  // it (their CHATTER is about looking for it); Angerud is in hospital (the ambulance in the julafton
  // scene), so a `null` home hides him (§8.13 "After the outro").
  // Lite film. (§10.11): the lens cap is off after julafton, so the witness rule turns round (an
  // offence near Herr Storch counts: there is evidence now; `witness` is merged over
  // METERS.skandal.witnessToast), and his chatter knows it.
  // Små grodorna (§10.13): the Christmas party is not quite over. Lasse keeps his Santa outfit
  // (`outfit`, merged over the island's set), and he, Affe, Gabbe and Fru Storch stay on Flamenco's
  // pool deck by the plastic tree (Herr Storch films on the beach, §10.11).
  bodega: { hook: 'bodegaLit', label: ['Pepes Bodega', 'bodega'],
    home: { berra: ['bodega', -1.5, 0.5], robban: ['bodega', 1.5, 0.5], angerud: null,
      lasse: ['flamencoPool', -3.4, 2.8], fruStorch: ['flamencoPool', 0.6, 2.6], affe: ['flamencoPool', 4.6, 2.4], gabbe: ['flamencoPool', 6.0, 1.2] },
    outfit: { lasse: 'jul' },
    chatter: { berra: ['Robban! Jag hittade Pepes Bodega!' /* [F*] */], robban: ['Pepes Bodega. Glöm aldrig det, du.' /* [F*] */],
      herrStorch: ['Lite film.' /* [F*](t) */, 'Locket är av nu, ska du veta.' /* [N] */],
      // Prata med gänget (§10.28): two lines the end made stale, the grisfest's bus and the lost bag.
      gabbe: ['Natturen går klockan nio!' /* [N] */, 'God fortsättning! Natturen går som vanligt.' /* [N] */],
      hittegods: ['Inga fler väskor, señor? ¡Feliz Navidad!' /* [N] */] },
    witness: { text: 'Linsskyddet är av – nu finns det bevis!', evidence: true },   // [N] the offence counts
    toast: 'Pepes Bodega har öppnat – på baksidan av hotellet.' },                   // [N]
  // Jag kan flyga (§10.7): the glide comes with `bodega` (julafton); this unlock only carries its
  // toast, shown the first time he is in the air in free roam after the end card (game/glide.js).
  glid: { toast: 'Upplåst: <b>Jag kan flyga</b> – håll J i luften' },             // [N]
  // Smörj in Majsans rygg (§10.26): the first 7 for the sun cream, and Siv's chatter is about it.
  sjuPoang: { chatter: { siv: ['Sju poäng till Giraffen. Mer än pizza-racern!' /* [N] */] },
    toast: 'Sju poäng! Nu pratar Siv om det vid poolen.' },                        // [N]
};

// Jag kan flyga – the glide (free roam after julafton, DESIGN §10.7; game/glide.js). J pressed in
// the air (more than `minAir` m up, as the stomp) and held past `tap` s spreads his arms; released
// sooner it is the stomp. The fall eases to `sink` m/s (braked at `brake` m/s² past gravity) and he
// drifts on at `speed` m/s (reached at `accel` m/s² on top of the step's air control), turning
// towards the held direction at up to `turn` rad/s. A wall or a trunk across his way is slid along
// (head-on, a `deflect` m/s nudge aside); with his headway over `stuckSecs` under `headway` ×
// `speed` (a wall) he lets go and drops. Every landing is a forward roll onto his back (`tumble`:
// `roll` s of the `secs` down) and a dazed shake of the head (`dazeSecs`); on water a splash. The
// mantra bubble every `sayEvery` s. Lasse's line the first time he lands in a pool (once ever: the
// `onceKey` marker in the saved unlocks); Ole's shout within `oleR` m after `oleAfter` s of gliding,
// at most every `oleEvery` s. Invented (§1.6): in the film's dream he stands still.
export const GLIDE = {
  tap: 0.18, minAir: 0.8, sink: 2.4, brake: 30, speed: 5, accel: 20, turn: 1.4,
  deflect: 1.5, stuckSecs: 0.6, headway: 0.3,
  tumble: { secs: 1.0, roll: 0.45 }, dazeSecs: 0.9,
  sayEvery: 2.5,
  poolRadio: ['lasse', 'Från fjärde våningen? Ner i poolen? Ring kliniken.'],   // [F*] Lasse's phone call in the film, relocated
  onceKey: 'glidPlask',
  oleShout: ['ole', 'Det er flyging!'],                                        // [F*] relocated from his Concorde dream on the plane
  oleR: 18, oleAfter: 0.5, oleEvery: 30,
};

// Bärra hem Berra – igen (free roam after the grisfest, DESIGN §10.6; game/berraJob.js). Berra naps
// at one of `spots` (a landmark on its prop: `seat` = his hips, block-local [dx, dz, y], his yaw and
// lean; `robban` = Robban's [dx, dz, yaw] beside him; `sleep` = the bubbles he snores, in turn).
// Robban asks, Stig carries him over the shoulders at `walkSpeed` to `to`; sprinting for
// `sprintSecs`, a fall, a bust or R drops him (E lifts him again); at the desk Robban pays `pay`, less
// `perDrop` a drop (never under `minPay`). `napSecs` later he naps at the next spot, never placed or
// taken away within `clearR` m of the player (as placeNpcs). Invented (§1.6): the job, the drops, the pay.
export const BERRA_JOB = {
  fromIndex: 12,   // after the grisfest (mission 12, index 11)
  spots: [
    { at: 'berraBank', prop: 'bank', seat: [0, -0.05, 0.72], yaw: 0, lean: 0, robban: [1.5, 0.5, -1.6],
      sleep: ['…zzz' /* [N] */] },
    { at: 'berraSolstol', prop: 'solstol', seat: [0, 0.2, 0.7], yaw: Math.PI, lean: -0.75, robban: [-1.05, -0.4, Math.PI / 2],
      sleep: ['…zzz' /* [N] */, 'Det är ju fan vad solen tar här nere, Robban.' /* [F*] said in his sleep, relocated */, '…zzz' /* [N] */] },
  ],
  to: 'flamencoRecepcion', radius: 2.2, walkSpeed: 3.2, sprintSecs: 0.25,
  // The desk (the grisfest outro's shot from the porch front): Berra and Robban face Stig, the
  // porter behind them; [dx, dz, yaw] from `to`.
  scene: { berra: [-0.4, 3.0, 1.0], robban: [-1.7, 1.9, 1.0], stig: [1.6, 2.6, -Math.PI / 2], cam: { at: 'recepcionCam', dist: 7.5, height: 2.0 } },
  napSecs: 150, clearR: 50, snoreR: 35,
  pay: 100, perDrop: 25, minPay: 25,
  snore: '…zzz',                                                                  // [N] carried or dropped
  title: 'Bärra hem Berra',                                                       // [F*] Stig's line
  carryText: 'Bär Berra till receptionen på Hotell Flamenco – gå, spring inte!',  // [N]
  liftText: 'Du tappade Berra! Lyft upp honom igen.',                             // [N]
  liftPrompt: '<b>E</b> Lyft upp Berra',                                          // [N]
  ask: [
    ['robban', 'Kan du hjälpa mig bära hem Berra?'],                              // [F*] relocated from Tonga Tonga
    ['stig', 'Vilket snack! "Bärra hem Berra!"'],                                 // [F*]
  ],
  drop: ['robban', 'Nej, skärpning nu, Berra, annars får vi ena jävla problem här.'],   // [F*] relocated from the plane
  home: ['berra', 'Var jag med där? Hade jag kul?'],                                    // [F*] relocated from the bodega outro
  thanks: 'Tack ska du ha. Här är en hundring.',                                        // [N]
  thanksDocked: 'Här är {n} pesetas. Avdrag för tappningarna.',                         // [N]
  paidToast: 'Robban betalade {n} pta.',                                                // [N]
};

// Grisfest varje torsdag – 800 pesetas (free roam; feature 21, DESIGN §10.18; game/grisfestFree.js).
// On the island with no mission running, from `fromIndex` (after the grisfest) the farm's `host`
// stands at his post inside the gate (his HOMES spot) with the E prompt `pay.prompt` (`pay.r` m).
// Stig on foot within `greetR` m of him: the `greet` exchange ([delay s, who, text]; again after Stig
// has been `greetAgainR` m off). E with fewer than `fee` pesetas: the host's `short` (Ole never pays
// here). E with the fee: it is paid, and in a black fade (`fadeSecs`, the `inBanner`, the watch
// spinning on to `hour` unless it is already night: from `hour` or before `nightTill`; then
// `holdSecs`) the evening is set up: the island's clock held, the `tune`, the `band` on the stage,
// the cast at `cast` (who is free; Ole from `oleFrom`, in his `gris` shirt), the `tourists` (`solo`
// ones can be asked) and Stig at `enter` (or the first free of `enterAlt`). Positions are [dx, dz,
// yaw] from `at` (the floor, yaw 0: dx east, dz south). The host walks `round` at `hostWalk` m/s,
// waiting `hostWait` s at its ends, with a cup. Lines in free play: the host's `sangria` and Ole's
// `heia` within their `r` m, every `every` s. E on a solo tourist (`ask.r` m, `ask.prompt`, until
// Majsan has asked him): `ask.line`, `turnAt` s later she turns her back, `scaredAt` s later Stig's
// `scared`; Majsan walks towards him, and `comeSecs` s later (a cut to the two-shot) she stands
// `frontR` m in front of him: `invite`, the two dance, `seen`, Ole's `heia` with applause, `danceSecs`
// s, and play. From then on Stig standing still within `partnerR` m of her dances with her. Stig
// within `coffee.r` m of Fru Storch, once an evening: her `coffee.ask` to the host and, with Ole there,
// `coffee.gap` s later his `coffee.reply`. Stig out of the walled square (`walls` + `out` m from `at`
// in x or z): a black fade, the `outBanner`, everyone home, the watch spinning on to `morning`, the
// clock running again. Invented (§1.6): the fest in free roam, the fee at the gate, the tourist's
// refusal; the plates break as ever (2 pta each, no timer).
export const GRISFEST_FREE = {
  fromIndex: 12, oleFrom: 13,   // after the grisfest (index 11); Ole is julafton's giver until it is done
  host: 'varden', at: 'dansgolv', fee: 800, walls: 30.6, out: 1.0,
  pay: { r: 2.6, prompt: '<b>E</b> Betala grisfesten ({n} pta)' },             // [N]
  greetR: 7, greetAgainR: 20,
  greet: [
    [0, 'stig', 'Är det torsdag i dag?'],                                        // [N] the bus: "Grisfesten är på torsdag" (research-plot.md:246)
    [1.8, 'varden', 'Här är det alltid torsdag, señor. Åttahundra pesetas!'],    // [N]
  ],
  short: 'Åttahundra, señor. Inte en peseta mindre.',                            // [N]
  fadeSecs: 0.7, holdSecs: 1.0, hour: 21, nightTill: 5.5, morning: 8,
  inBanner: ['TORSDAG KVÄLL', 'Grisfest på vischan'],                            // [N]
  outBanner: ['MORGONEN EFTER', 'Nästa grisfest: torsdag'],                      // [N]
  tune: 'vals',
  enter: [0, 20, Math.PI], enterAlt: [[3, 20], [-3, 20], [0, 15], [3, 15], [-3, 15]],
  cast: {
    berra: { at: [-3.2, -3.0, Math.PI / 2], dance: true },
    siv: { at: [-2.1, -3.0, -Math.PI / 2], dance: true },
    robban: { at: [1.6, -0.5, Math.PI / 2], dance: true },
    ole: { at: [0.3, 3.4, 0], dance: true },                   // front and centre, facing the gate
    majsan: { at: [7.6, 0.5, -Math.PI / 2] },                  // at the floor's east edge, watching
    herrStorch: { at: [-7.8, 5.2, 2.3], film: true },          // filming the floor from its corner
    fruStorch: { at: [-11.2, -2.5, Math.PI / 2] },             // at the west long table
  },
  tourists: [
    { at: [2.7, -0.5, -Math.PI / 2], woman: true },            // Robban's partner
    { at: [3.0, -5.5, Math.PI / 2], woman: false },
    { at: [4.1, -5.5, -Math.PI / 2], woman: true },
    { at: [-1.9, 2.3, 0.6], woman: true, solo: true },
    { at: [4.4, 2.8, -0.5], woman: true, solo: true },
  ],
  band: [
    { at: [-2.4, -18.8, 0.2], held: 'accordion' },
    { at: [0.2, -18.8, 0], sing: true },                       // behind the mic
    { at: [2.0, -19.2, -0.2], held: 'congas' },
  ],
  bandSash: 0xd8321e, seed: 2100,
  round: [[-9.0, -0.5], [-9.0, 7.6], [9.0, 7.6], [9.0, -0.5]], hostWalk: 1.3, hostWait: 5, walk: 1.5,
  sangria: { r: 10, every: [9, 14], line: 'Sangrian, grabbar.' },              // [F*](t) the host's chatter (research-plot.md:345)
  heia: { r: 16, every: [14, 22], line: 'Heia Norge!' },                       // [F] his solo dance at the grisfest (research-characters.md:192)
  ask: {
    r: 1.9, prompt: '<b>E</b> Bjud upp',                                         // [N]
    line: 'Ska vi dansa? Hej hej.',                                              // [F*] Ole's advice (research-plot.md:346), tried by Stig
    turnAt: 1.3, scaredAt: 1.2, comeSecs: 1.6, frontR: 1.1,
    scared: 'Jag är skraj att de ska nobba.',                                    // [F]
  },
  invite: [['majsan', 'Vill du dansa med mig?']],                                // [F]
  accept: ['stig', 'Får jag lov…'],                                              // [F](t)
  seen: ['siv', 'Nu blev hon uppbjuden.'],                                       // [F](t)
  danceSecs: 4.5, partnerR: 1.6,
  coffee: {
    r: 9, gap: 2.0,
    ask: ['fruStorch', 'Finns det svenskt kaffe på grisfesten?'],                // [F*] the film's subtitle (research-plot.md:37)
    reply: ['ole', 'Norsk, da?'],                                                // [F*](t) his "Norskt, då?" at the hotel (research-plot.md:247)
  },
};

// Siv och Majsan sätter poäng – the sisters judge his dives (free roam, DESIGN §10.8;
// game/poolJudges.js). A bounce on Flamenco's diving board (the `board` landmark's bounce block)
// calls them: Stig's `call` line (at most every `callAgain` s), and they walk at `walk` m/s to
// `spots` ([dx, dz] from `board`) at the pool's edge, unless one waits at the pool as a mission's
// giver or extra (then she only turns to him); both must be within `judgeR` m of the board (not
// away as an extra at the airport or friskotek). A hop off the board that ends in the water within
// `judgeR` m of them is judged: a stomp in the air is a `magplask` (he lies face down for
// `flopSecs`), the double jump's spin a `volt`, any other a `svanhopp` (arms out on the way down).
// Per kind: Siv's and Majsan's cards (held up `cardSecs`), the result line and the `lines`
// ([delay s, who, text]; each said at most every `again` s, and a new hop drops the ones not yet
// said). The best total is the saved record. After `teaseAfter` tens from Majsan in one visit,
// Siv's `tease`, once a visit. `stayOut` s without a hop, or Stig more than `leaveR` m from the
// board, and they walk home. Invented (§1.6): the judging at the pool, Majsan's tens and the cards;
// the film's points scene is on the plane.
export const POOL_JUDGES = {
  board: 'flamencoBoard',
  spots: { siv: [-6.9, 8.3], majsan: [-6.9, 10.3] },
  walk: 1.6, judgeR: 22, leaveR: 30, stayOut: 25, again: 20, callAgain: 120, cardSecs: 3.4, flopSecs: 1.4, teaseAfter: 3,
  call: ['stig', 'Mina ögon tål inte klor.'],                                     // [F*] relocated: the morning he would not go to the pool
  kinds: {
    svanhopp: { title: 'SVANHOPP!', siv: 4, majsan: 10, lines: [
      [0.4, 'siv', 'Giraffen, då? Fyra.'],                                         // [F*](t) the points scene on the plane
      [1.9, 'majsan', 'Mindre än pizza-racern?'],                                  // [F*](t)
      [3.3, 'majsan', 'Tio!'],                                                     // [N]
    ] },
    volt: { title: 'VOLT!', siv: 9, majsan: 10, lines: [
      [0.4, 'siv', 'Majsan, en niopoängare!'],                                     // [F*] relocated from the transfer bus
      [2.0, 'majsan', 'Tio!'],                                                     // [N]
    ] },
    magplask: { title: 'MAGPLASK!', siv: -1, majsan: 10, laugh: 'majsan', lines: [
      [0.4, 'siv', 'Han är så bortkommen. Det blir minuspoäng.'],                 // [F*](t) the points scene on the plane
      [2.8, 'stig', '…Minuspoäng?'],                                               // [N]
    ] },
  },
  tease: ['siv', 'Så att du vågar stöta på giraffen.'],                           // [F*] relocated from the balcony
  result: '{kind} {a} + {b} = {sum} P',                                           // [N]
  record: 'REKORD {n} P', newRecord: 'NYTT REKORD!',                              // [N]
};

// Från fjärde våningen – the 10 m diving tower at Flamenco's deep end (free roam, DESIGN §10.20;
// game/diveTower.js, the tower in world/blocks/hotels.js). E at the ladder's foot (`foot`, within
// `r` m) climbs up, E on the platform (`top`) climbs down: a black fade of `fadeSecs` s, held
// `holdSecs` s. Off the platform he spreads his arms and says the mantra (S.mantraLine, [F*]: the
// exercise at Levander's clinic, relocated). Into the water a stomp is a cannonball (the biggest
// splash, the camera shaken), anything else a belly flop: face down `flopSecs` s, then up with `oj`
// (at most every `ojAgain` s). The session's first dive into the water brings Lasse on the radio
// `radioAt` s later (not when the glide's landing has said the line this session). Invented (§1.6):
// the tower, the cannonball and the belly flop.
export const TOWER = {
  foot: 'hopptorn', top: 'hopptornTopp', r: 1.3,
  fadeSecs: 0.35, holdSecs: 0.2,
  promptUp: '<b>E</b> Klättra upp',     // [N]
  promptDown: '<b>E</b> Klättra ner',   // [N]
  flopSecs: 1.6, ojAgain: 8, radioAt: 1.2,
  oj: 'Oj.',   // [N]
  radio: ['lasse', 'Från fjärde våningen? Ner i poolen? Ring kliniken.'],   // [F*] Lasse's phone call in the film (research-plot.md:292), now about Stig
};

// Hoppet mellan hotelltaken – the jump between the hotel roofs (free roam, DESIGN §10.29;
// game/roofJump.js, the roofs in world/town.js `roofWalk`). E at a door (`doors`: its landmark `at`,
// within `r` m) takes the stairs to the other end (`to`): a black fade of `fadeSecs` s, held
// `holdSecs` s. Up: on APARTAMENTOS SOL DE INVIERNO's roof by the lift room, facing the gap, out of
// breath (`anim.slump` for at most `puffSecs` s, until he moves) with `top`. Down: out of the lobby
// the door belongs to, `outStep` m from its E spot and turned away from it. Off a roof he spreads his arms (`anim.leap`) and says the mantra
// (S.mantraLine, [F*]: the exercise at Levander's clinic, relocated) over the gap, or as soon as he
// is `dropBy` m under the roof he left; into the water a stomp is a cannonball, anything else a belly
// flop (`flopSecs`). On HOTEL ATLÁNTICO's roof, standing within `view.r` m of `view.lm`, `view.line`
// once a visit (until he is down off the roofs). Invented (§1.6): the walkable roofs, the stairs, the
// jump and the dive into the pool.
export const TAKHOPP = {
  r: 1.3, fadeSecs: 0.5, holdSecs: 0.3, outStep: 2.8, puffSecs: 2.2, dropBy: 0.4, flopSecs: 1.6,
  promptUp: '<b>E</b> Ta trappan upp',     // [N]
  promptDown: '<b>E</b> Ta trappan ner',   // [N]
  doors: [
    { id: 'upp', at: 'takSolLobby', to: 'takSolTopp', up: true },
    { id: 'solNer', at: 'takSolTopp', to: 'takSolLobby' },
    { id: 'atlNer', at: 'takAtlTopp', to: 'takAtlLobby' },
  ],
  top: 'Sju våningar…',   // [N]
  view: { lm: 'takUtsikt', r: 2.2, line: 'Nu har jag havsutsikt.' },   // [N] (his "Kallar ni det här för havsutsikt?" answered at last, research-plot.md:252)
};

// Uppför fyren – the mantra 51 m up (free roam, DESIGN §10.35; game/lighthouse.js, the gallery's
// solids in world/blocks/coast.js `LIGHTHOUSE`). E at the keeper's house's door (`door`, within `r` m)
// climbs the tower, E at the lantern's door on the gallery (`gallery`) climbs down: a black fade of
// `fadeSecs` s with `upBanner` or `downBanner`, held `holdSecs` s. By day (the clock's day hours) the
// climb takes the clock on to `evening` (the sunset palette), spun as the nap's; at any other hour it
// stays. Down, he steps out `outStep` m from the door's E spot, turned away from it; the clock goes on
// as it is. Up there, `arriveAt` s after the fade lifts, `arrive`; the vertigo rocks the camera
// (`sway`); if he has not started the exercise `remind.after` s in, `remind.line` once a visit. J held
// (the island's mantra, game.mantraMode) is the exercise: his back to the lantern, arms out, eyes shut,
// the mantra; held `calmSecs` s (game seconds, as a mantra stage's) the vertigo is gone for the visit,
// held `nightSecs` s while the lantern is dark it is the long blink: black over `blinkSecs` s, the
// clock spun on to `night`, and he opens his eyes under the lit lantern and its beam. `cam`: the
// gallery's cameras (DESIGN §10.35). Invented (§1.6): the climb, the gallery, the vertigo.
export const FYREN = {
  door: 'fyrDorr', gallery: 'fyrGalleri', r: 1.3, outStep: 2.6,
  fadeSecs: 0.6, holdSecs: 1.0, blinkSecs: 1.4,
  promptUp: '<b>E</b> Gå upp i fyren',                                                // [N]
  promptDown: '<b>E</b> Gå ner',                                                      // [N]
  upBanner: 'Många trappsteg senare …',                                               // [N]
  downBanner: '… och lika många ner.',                                                // [N]
  evening: 19.75, night: 22,
  arriveAt: 0.4,
  arrive: 'Femtio meter … det är ju nästan som att flyga.',                           // [N]
  remind: { after: 10, line: 'Varje gång du känner tendenser till flygrädsla så gör du övningen…' },   // [F*] Levander's advice (research-plot.md:124), Stig reciting it to himself
  calmSecs: 2.5, nightSecs: 6,
  sway: { yaw: 0.04, pitch: 0.025, bob: 0.1, rate: 0.9, in: 0.8, out: 1.6 },
  cam: {
    orbit: { r: 7.4, h: 2.6, look: 1.2, turn: 0.004, max: 1.1 },
    pose: { r: 6.0, h: 1.4, look: 1.5 },
    vista: { back: 0.45, side: 0, h: 3.4, out: 34, down: 15, still: 0.8, face: 0.9, turn: 0.003, max: 0.6 },
  },
};

// Mikrofonen på scenen – Stig reads Lasse's announcements (free roam, DESIGN §10.30; game/mic.js).
// Places are block-local to `block` (Hotel SunTrip, as in world/blocks/hotels.js). On the island
// with no mission running, Stig on foot on the welcome stage (over `stageY`) within `r` m of the mic
// (`lm`, where he stands behind its stand) and no SKANDAL pursuit: E plays the next announcement of
// `order`, round and round (per session; `hajar` only while the SunTrip pool's fin `hajar.fin` still
// circles): the PA chime (audio.dingdong), Stig turned to the line's audience (`face`) with the camera
// easing in behind him, `camOff` rad to his right, for `camSecs` s (the mouse turning it ends it), and
// `dingSecs` s later his line as a bubble. His and the others' lines follow one another (each up as
// long as game.say holds it, then `gap` s); E again only after `cool` s and once those lines are said.
// The NPCs within `hushR` m have their bubbles taken down at the chime and keep their chatter back
// meanwhile. A line of Stig's further on is dropped, and the rest with it, once he is more than
// `leaveR` m from the mic, in a car or knocked down. A body (a guest, one of the crowd) comes or goes
// only out of the camera's view, more than `popR` m from it, or within `cutSecs` s of a cut.
//   vatten: the guests at the terrace tables (`terrace.seats` [x, z, yaw], seated at `y`, there by
//     day and evening, `hours`, while he is within `terrace.r` m; seeded) lift their glasses `sipAt`
//     s after the chime and spit the drink out `spitAt` s after his line, yelling `yellSecs` s, with
//     the `spit` lines.
//   grisfest: `crowd.tourists` tourists (seeded, made once) and every free one of `crowd.gang`
//     (standing, shown, at home, nobody's, not the waiting mission's giver or extra) come to the
//     lawn's `spots` (the gang first), each from the nearest `entries` start out of view (one of the
//     gang in view walks from where he is) by its `via` points at `walk` m/s (tourists up to `lag` s
//     apart), and cheers on arrival (`cheerSecs`, `cheer` from the first two, the applause). Once they
//     are there (at most `arriveSecs` s): Robban's Benidorm line, and Fru Storch's question with
//     Stig's "Ja." in Lasse's place, Ole's "Norsk, da?" and the second "Ja." They stay `stay` s, then
//     walk out the way they came at `outWalk` m/s; at its outermost start, out of view or after
//     `outSecs` s, a tourist is hidden and one of the gang put home.
//   klocka: the hour from the island's clock (§10.10) in words (`hours`, `half` from a quarter past
//     to a quarter to); Ole in the crowd or within `klocka.r` m of the mic answers with his watch's
//     line once Stig has found it (pryl `klocka`), else `oleLost`; without Ole someone in the crowd
//     or at the terrace says `other`.
//   friskotek: the crowd sinks (`anim.slump`), stands `slumpSecs` s and shuffles off slumped at
//     `slumpWalk` m/s; the guests at the terrace slump for `terrace.slumpSecs` s; `slump` from a
//     tourist, `berraSlump` from Berra.
//   hajar: every bather on a lounger within `hajar.r` m of `hajar.at` (§10.22, bathers.scare) jumps
//     up and runs from the pool flailing for `flee.secs` s at `flee.speed` m/s (the first two cry
//     out), the lounger empty until the next morning; Lasse within `lasseR` m of the pool waves it
//     off, and Stig answers him.
// A mission start or the other level takes everything away at once (the gang home). Invented
// (§1.6): the microphone's use, the crowd, the reactions; Stig's lines are Lasse's from the bus and
// the welcome meeting, relocated, the shark warning ours.
export const MIKROFON = {
  block: [3, 2], lm: 'mikrofon', r: 1.4, stageY: 0.55, cool: 6, dingSecs: 0.9, camSecs: 1.4, camOff: 0.4, gap: 0.35,
  hushR: 14, leaveR: 12, popR: 40, cutSecs: 1.2,
  prompt: '<b>E</b> Läs ett utrop',                                                             // [N]
  order: ['vatten', 'grisfest', 'klocka', 'friskotek', 'hajar'],
  lines: {
    vatten: { face: [14.5, -14], text: 'Ni bör inte dricka vattnet.' },                         // [F*] Lasse in the bus (research-plot.md:246, :441), relocated to Stig on the stage
    grisfest: { face: [-0.5, -3.5], text: 'Grisfesten är på torsdag och kostar 800 pesetas. Några frågor?' },   // [F*] the same
    klocka: { face: [-0.5, -3.5], text: 'Klockan är {tid} spansk tid – alltså en timme tidigare än svensk tid.' },   // [F*] the same, the hour read off the island's clock
    friskotek: { face: [-0.5, -3.5], text: 'Friskoteket börjar halv tio varje morgon.' },       // [F*] Lasse at the welcome meeting (research-plot.md:266)
    hajar: { face: [14.5, 9], text: 'Hajar i poolen!' },                                        // [N] Lasse's "Hajar i poolen? Delirium – ring kliniken." (research-plot.md:292) turned round: the fin is there
  },
  hours: ['tolv', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva'],
  half: 'halv {h}',
  terrace: {
    seats: [[12.15, -11.5, Math.PI / 2], [13.85, -11.5, -Math.PI / 2], [17.65, -18, Math.PI / 2]],
    y: 0.61, r: 45, hours: [8, 23], seed: 4411, sipAt: 0.3, spitAt: 1.3, yellSecs: 1.2, slumpSecs: 4,
    spit: ['Isbitarna!' /* [N] */, 'Usch!' /* [N] */, 'Är isen också vatten?' /* [N] */],
  },
  crowd: {
    tourists: 6, seed: 4401, walk: 3.4, outWalk: 2.0, slumpWalk: 1.3, lag: 1.5, stay: 30, arriveSecs: 14, cheerSecs: 2.4,
    slumpSecs: 1.6, outSecs: 12,
    gang: ['fruStorch', 'ole', 'robban', 'berra', 'herrStorch', 'majsan', 'siv'],
    spots: [[-2.7, -5.6], [0, -5.6], [2.7, -5.6], [-5.4, -5.6], [4.6, -6.6], [-1.35, -3.4], [1.35, -3.4],
      [-4, -3.4], [4, -3.4], [-6.6, -3.4], [0, -1.2], [-2.65, -1.2], [2.65, -1.2], [-5.3, -1.2]],
    entries: {
      w: { from: [[-25.5, 7.2], [-30, 7.2], [-34.5, 7.2]], via: [[-21.6, 7.2], [-15, 3.5]] },
      e: { from: [[24, 15.3], [29, 15.3], [34.5, 15.3]], via: [[6.2, 15.3], [5.4, 5]] },
      s: { from: [[0.5, 24], [0.5, 33]], via: [[0.5, 13]] },
    },
    cheer: ['Hurra!' /* [N] */, 'Grisfest!' /* [N] */],
    robban: 'Ja, herre jävlar, minns du Benidorm? Snacka om grisfest!',                       // [F*] Robban at the bodega (research-characters.md:393), relocated
    qa: [
      ['fruStorch', 'Finns det svenskt kaffe på hotellet?'],                                  // [F*] Fru Storch in the bus (research-plot.md:247), relocated
      ['stig', 'Ja.'],                                                                        // [F*] Lasse's answer, now Stig's
      ['ole', 'Norsk, da?'],                                                                  // [F*] Ole's (research-characters.md:180), relocated
      ['stig', 'Ja.'],                                                                        // [F*] Lasse's second answer, now Stig's
    ],
    slump: 'Halv tio? På semestern?',                                                         // [N]
    berraSlump: 'Halv tio? Då har vi inte ens gått och lagt oss.',                            // [N]
  },
  klocka: {
    r: 25,
    ole: 'Digital, analog, spansk, norsk, svensk tid, kronometer, og så klokke.',             // [F*] his watch (COLLECTIBLES), Stig wears it
    oleLost: 'Og norsk tid? Klokka mi ligger et sted på øya.',                                // [N]
    other: 'Ska man ställa om klockan igen?',                                                 // [N]
  },
  hajar: {
    fin: 'fena_suntrip', at: [14.5, 9], r: 11, lasseR: 50, flee: { secs: 3.5, speed: 5.5 },
    cries: ['Hjälp!' /* [N] */, 'En haj!' /* [N] */],
    lasse: 'Hajar i poolen igen? Ring kliniken!',                                             // [F*] Lasse's phone call in the film, adapted (as COLLECTIBLES.fenor.first)
    stig: 'Men den är ju där…',                                                               // [N]
  },
};

// Fåglarna som lyfter – och storken i La Charca (free roam, DESIGN §10.31; game/birds.js). Four
// flocks: `kind` (game/birds.js KINDS), the block `b` their `spots` and `loop` are given in (block-
// local metres), the circle they fly round when scared (`loop`: centre `at`, radius `r` (±20 % a
// bird), height band `h`, after `secs` s each lands again); a spot is [lx, lz, y?, yaw?, perch?] (y
// on the floor there when left out, a perch takes no steps). Pigeons round the plaza's fountain (three
// on its rim), gulls at HELADOS · GLASS (two on the kiosk's roof) and on the marina's pier (three on
// its bollards), and La Charca's two herons where they stood in the dunes block's geometry
// (world/blocks/nature.js) with the stork between them. A bird lifts with Stig on foot within
// `foot.base` + `foot.perSpeed` × his speed m (a jump's speed counts; a kick at least `foot.kick`),
// with his car within `car.base` + `car.perSpeed` × its speed above `car.minSpeed` (else
// `car.still`), each times its kind's shyness and no more than `dy` m above or below it, after
// `react` s; the horn (game.hornAt) lifts every bird within `horn.r` m, `horn.lag` s a metre later.
// None lands while Stig stands within his radius + `clear` m of its spot; a flock `farR` m off is
// put back on its spots and not run, a kind `drawR` m from the camera is not drawn. Sounds within
// `sound.r` m: the flap, the gulls' cries every `sound.cry` s while they circle, the herons' croak
// (`sound.croak`: audio.gull's pitch). Among the take-offs he caused on foot within `sorry.r` m (a
// pigeon counts 1, a gull or heron 2; `sorry.min`) Stig says `sorry.line` with his hands up
// (`anim.placate` 1 for `sorry.poseSecs` s), at most every `sorry.every` s. The stork (`stork`, in
// `stork.flock` at `at`): scared while the Storches (`pair`) stand within `pairR` m of `beach`, not
// held by anyone, and `again` s after its last trip, it flies a Bézier over `via` (world x, z) at
// `cruise` m up and `speed` m/s to `side` m beyond Fru Storch from her husband; with Stig (or his
// car) within `sceneR` m of it: `stig`, `correctAt` s later Fru Storch's `correct` the first time
// ever (`records.stork`, saved), `filmAt` s after that Herr Storch films it (`anim.film`, the whirr)
// for `filmSecs` s, and it flies home. Unvisited it flies home after `waitSecs` s. Invented (§1.6):
// the flocks lifting and landing, the stork, its trip and the scene.
export const BIRDS = {
  seed: 4343, farR: 140, drawR: 260, dy: 6, react: [0.02, 0.14], clear: 1.5,
  foot: { base: 1.0, perSpeed: 0.5, kick: 3 },
  car: { base: 4, perSpeed: 0.5, minSpeed: 1.5, still: 2.5 },
  horn: { r: 28, lag: 0.015 },
  sound: { r: 50, cry: [1.2, 3.4], croak: 0.32 },
  sorry: { line: 'Oj! Förlåt, förlåt!', r: 7, min: 2, every: 25, poseSecs: 1.3 },   // [N]
  flocks: [
    { id: 'plaza', kind: 'duva', b: [2, 3], loop: { at: [0, 0], r: 9.5, h: [5, 8], secs: [24, 34] },
      spots: [[4.8, 5.6], [5.9, 4.4], [6.6, 6.2], [4.2, 7.0], [7.4, 3.3], [5.4, 7.8], [-6.8, 2.6], [-7.0, -2.2], [-6.2, 4.9],
        [-2.4, -6.8], [1.8, -7.2], [3.9, -6.3], [4.8, 1.99, 0.55, null, true], [-4.8, 1.99, 0.55, null, true], [1.99, -4.8, 0.55, null, true]] },
    { id: 'kiosk', kind: 'mas', b: [3, 6], loop: { at: [-17, -14], r: 12, h: [7, 11], secs: [24, 34] },
      spots: [[-19.0, -19.6, 3.1, null, true], [-15.2, -17.6, 3.1, null, true], [-23.5, -15.2], [-22.0, -13.6], [-24.8, -13.0],
        [-11.0, -15.0], [-12.6, -13.2], [-9.8, -13.8]] },
    { id: 'piren', kind: 'mas', b: [5, 6], loop: { at: [12, 17], r: 13, h: [6, 10], secs: [24, 34] },
      spots: [[13.8, 12, 1.05, null, true], [10.2, 18, 1.05, null, true], [13.8, 24, 1.05, null, true], [11.2, 8.5, 0.55], [12.6, 15.2, 0.55],
        [11.6, 21.3, 0.55], [10.6, 27.6, 0.55], [12.6, 28.6, 0.55], [13.9, 27.0, 0.55]] },
    { id: 'charca', kind: 'hager', b: [0, 5], loop: { at: [-12, 14], r: 15, h: [7, 10], secs: [26, 36] },
      spots: [[-15, 9.5, null, 0.971], [-9, 19, null, -0.829]] },
  ],
  stork: {
    flock: 'charca', at: [-12.4, 14.2], yaw: 0.4,
    pair: ['herrStorch', 'fruStorch'], beach: 'playa', pairR: 8, again: 45, side: 1.8,
    via: [[-212, 236], [-100, 262]], cruise: 16, speed: 11, sceneR: 11, waitSecs: 75,
    stig: 'Oj, en stork!',                                     // [N]
    correct: ['fruStorch', 'Vi heter faktiskt Storch, inte Stork.'],   // [F*] the welcome meeting's (research-plot.md:269), relocated
    correctAt: 1.9, filmAt: 2.6, filmSecs: 5,
  },
};

// Strandkyssen i bränningen – the daydream in the surf (free roam, DESIGN §10.33;
// game/beachDream.js). A lone towel (`towel`: world [x, z] of its middle, its length along `yaw`,
// Majsan's dress's blue with white dots; no collider) lies at the water's edge below Flamenco. On the
// island with no mission running, Stig on foot within `r` m of it and no SKANDAL pursuit: E and he lies
// down on it (sitting, then `lie.back` s onto his back, his feet to the sea, his hips `lie.hips` m
// seaward of its middle). The scene runs on a clock (`at`, s): the picture washes to white from
// `at.wash` over `washSecs`, and from `at.dream` the island is a dream (the white fading out over
// `washOutSecs`): the `sunset` palette, the soft picture (style.css body.dream), the white vignette
// and `title`, the `tune`, and Majsan (a double: the real one stays where she is) lying beside him in
// each other's arms (`pose`), the foam washing slowly over their legs (`swash`: its front's z out and
// in every `secs` s), her `whisper` at `at.whisper`; the camera holds on them (`cam.dream`) and from
// `at.glide` glides up and away to the sky over the sea (`cam.away`) before the kiss. At `at.wake` a
// white flash (`flashSecs`): the clock's palette, the music and the picture back, Majsan gone, Stig
// alone on his back (`cam.wake`); at `at.wave` a real wave (`wave`: its front's z in over `inSecs`, out
// to `back` over `outSecs`, `w` m wide) over him with three splashes; `blott` at `at.blott`. Who stands
// on the sand (`visitor`: [dx, dz] from the towel's middle), if free: after the end Majsan (`after`:
// her invitation, his answer, and she dances for `after.stay` s after the scene), else by day on every
// `siv.every`th dream from the `siv.first`th, Siv with her score (laughing `laughSecs` s; staying
// `stay` s); each `script` (and `plain` with nobody) gives the times he gets up and the scene ends.
// A visitor goes home once out of the camera's view or `popR` m from it, or at a mission start. He
// gets up beside the towel (`stand`: [dx, dz]) and drips for `dripSecs` s. The cuts (`cam`) are
// [dx, y, dz] from the towel's middle (dx to its left, dz to the sea). Invented (§1.6): the towel, the
// dream, the wave, the visitors on the sand; the pose is the famous beach kiss, left unnamed (§1.5),
// and the camera leaves before the kiss.
export const STRANDKYSSEN = {
  towel: { at: [-30, 300.9], yaw: 0, w: 0.95, len: 1.9, color: 0x4a7fd0, dots: 0xffffff, fringe: 0xf4f0e6 },
  r: 1.5, popR: 40,
  prompt: '<b>E</b> Lägg dig i vattenbrynet',                       // [N]
  title: 'Dagdröm',                                                  // [N]
  tune: 'vals',
  lie: { back: 0.7, hips: 0.55 },                                    // hips: m along the towel from its middle, to the sea
  at: { wash: 0.55, dream: 1.5, whisper: 3.4, glide: 6.4, wake: 9.6, wave: 9.9, blott: 12.4 },
  washSecs: 0.8, washOutSecs: 1.0, flashSecs: 0.7,
  // The pose of two (models.js lie: roll onto the side, head turn and tilt, [right, left] arm
  // rotations): he turned to her, his right arm over her, his left under her neck; she on her back
  // beside him (`at`: her hips from his, [to his left, to the sea]), her right arm up round his neck.
  pose: {
    stig: { roll: 0.6, turn: 0.5, tilt: -0.15, arms: [[-1.0, 0, 1.0], [-0.1, 0, 1.45]] },
    majsan: { at: [0.62, -0.12], roll: -0.15, turn: -0.05, tilt: 0.1, arms: [[-0.5, 0, -1.3], [-0.25, 0, -0.3]] },
  },
  swash: { far: 305.6, near: 302.6, secs: 3.4, crest: 0.22 },        // z of the foam's front, out and in
  wave: { from: 311.5, to: 299.2, inSecs: 2.1, back: 307, outSecs: 2.3, crest: 0.55, w: 10 },
  whisper: ['majsan', 'Då kanske vi ses…'],                          // [F*](t) the parting line after the tow in Stockholm (research-plot.md:102; the speaker unknown), relocated to the dream
  blott: 'Blött.',                                                   // [N]
  visitor: [-1.6, -1.2],
  siv: { every: 3, first: 2, laughSecs: 2.4,
    line: ['siv', 'Giraffen, då? Fyra.'],                            // [F*](t) the points scene on the plane (research-plot.md:197)
    script: { line: 13.5, up: 14.6, end: 16.4 } },
  after: { stay: 6,
    line: ['majsan', 'Vill du dansa med mig?'],                      // [F*] Majsan asks him at the grisfest (research-plot.md:346), relocated to the beach
    answer: 'Ja.',                                                   // [N]
    script: { up: 13.4, line: 14.0, answer: 15.9, end: 16.8 } },
  plain: { up: 13.6, end: 14.4 },
  stay: 6, stand: [0.6, -1.7], dripSecs: 4,
  cam: {
    lie: { eye: [2.7, 1.6, -2.4], look: [0, 0.45, 0.7] },
    dream: { eye: [2.2, 0.9, -1.6], look: [0.2, 0.45, 0.2] },
    away: { eye: [2.6, 3.2, -2.6], look: [-24, 7.5, 34] },
    wake: { eye: [2.6, 1.9, -2.8], look: [-0.6, 0.5, 0.9] },
  },
};

// Stunthopp med G17-stämpel – his car's jumps judged (free roam, DESIGN §10.27; game/stunts.js, the
// plank in world/blocks/nature.js `bygge`). A flight of his car (car.js `air`: the ground more than
// 0.35 m below it) is a jump when its first flight lasts `minAir` s and goes `minDist` m (the
// yellow ramp's 0.42 s and 8 m count, a kerb does not lift a car); hops within `settle` s of a
// landing add to it. The result line shows `live` from `showAt` s in the air; `settle` s after the
// last landing the stamp comes down for `stampSecs` s, `stampG17` from mission index `g17From`
// (after fataga, whose intro has the film's boast) and `stampOk` before, and the card for `cardSecs`
// s. An impact of his car (main.js onCarImpact) in the air or the settle, or the car wrecked, is
// `stampFail` (Stig's `failLine` `lineAt` s later, at most every `failGap` s). A named jump (its
// take-off `r` m round a landmark or over a half-built garage's deck 1 and `pad` m past its edge;
// `yMin` the lowest take-off height) pays `pay.first` the first time it passes, then `pay.record` for a new
// record (its distance, more than `recordBy` m over the best; saved in `records.stunts`). Off the
// plank Stig says the mantra in the air, and at the stamp `dreamLine`; out of the car within
// `arms.window` s and `arms.r` m of `arms.lm` he stands with his arms out to the plane for
// `arms.secs` s. The dunes lift no car (a car follows the ground unless it drops 0.35 m in a 60 Hz
// step, and their slip faces slope 0.46: 45 m/s), so they are not a named jump. Invented (§1.6):
// the judging, the stamp and the plank.
export const STUNTHOPP = {
  minAir: 0.35, minDist: 6, showAt: 0.15, settle: 1.0, recordBy: 0.5, g17From: 11,
  stampSecs: 2.2, cardSecs: 4.5, lineAt: 0.45, failGap: 20,
  pay: { first: 100, record: 25 },
  jumps: [
    { id: 'planka', name: 'Bygget – drömplanet', lm: 'stunt_planka', r: 3, yMin: 4.0, mantra: true, dream: true },   // [N]
    { id: 'gula', name: 'Gula rampen', lm: 'stunt_gula', r: 3.5, yMin: 1.2 },                                       // [N]
    { id: 'garage', name: 'Garagedäcket', frames: true, pad: 1, yMin: 3.0 },                                        // [N]
  ],
  live: 'LUFTTID {t} S',                         // [N]
  card: 'LUFTTID {t} S · {d} M',                 // [N]
  cardPay: ' · +{n} PTA',
  newRecord: 'NYTT REKORD: {name}',              // [N]
  record: '{name} · REKORD {d} M',               // [N]
  stampOk: 'GODKÄND',                            // [N]
  stampG17: 'KONTROLLERAD AV G17',               // [F*] the label on his toasters (research-plot.md:61), as a stamp on a jump
  stampFail: 'UNDERKÄND',                        // [N]
  dreamLine: {
    g17: 'Godkänd av G17. Det är ju jag.',       // [N]
    pre: 'Jag flög. Jag flög faktiskt.',         // [N]
  },
  failLine: 'Det där får jag kontrollera en gång till.',   // [N]
  wreckAt: 1.0,
  arms: { lm: 'stunt_landning', face: 'pryl_kamera', r: 24, window: 20, secs: 3 },
};

// Tutan som folk reagerar på – the horn the island hears (free roam, DESIGN §10.9; game/honk.js).
// H pressed in a car with no mission running: pedestrians within `pedR` m ahead of the car (no
// further aside than `pedLat` + `pedCone` × their distance ahead) hop aside as from a speeding car
// (§6.7), with the dodge shout (always the nearest one, the rest at `pedShout`), each at most every
// `pedEvery` s. The nearest `replies` cast NPCs within `castR` m who see the car (nothing solid
// across the line at `eye` m over their feet to it, or to `seeW` m either side of it: a palm trunk
// at the curb does not hide it, a hotel does) answer, the ones with their own lines first (35 m:
// Ole under Flamenco's pergola is 27–31 m from the west street, and an AI driver's horn is heard
// within 40 m), `replyAt` s after the press, each at most every `castEvery` s. Their own `lines`
// (with the grisbil `pig` first; a speaker's first answer in a session is his first line, later
// ones another than his last), else `local` for the Spanish cast and `sv` for the rest (one nobody
// said in the same press). `poses`: an anim flag held `poseSecs` with the answer (Ole and Lasse
// wave, Angerud raises his arm); every answerer turns to Stig meanwhile. Stig's `sorry` the first
// time in a session anyone reacts, and his `teaseReply` `teaseGap` s after a `tease`. The grisbil
// grunts instead of the horn (audio.oink every `oinkEvery` s while H is held) and, in free roam,
// shows `oinkBubble` over its bed at most every `bubbleEvery` s. Invented (§1.6): the reactions;
// the lines are relocated film lines and ours.
export const HONK = {
  pedR: 14, pedLat: 4, pedCone: 0.7, pedEvery: 3, pedShout: 0.5,
  castR: 35, eye: 1.5, seeW: 1.2, replies: 2, replyAt: [0.35, 1.1], castEvery: 8, poseSecs: 1.6,
  lines: {
    ole: ['Det er farligere å kjøre bil enn å fly.' /* [F*] his comfort to the flight-shy Stig at Arlanda, relocated */,
      'Hei hei, Stig-Helmer! Kjør forsiktig, da!' /* [N] */],
    lasse: ['Hä-pååre!' /* [F*] his signature greeting, relocated */],
    angerud: ['Jag ska tala med platschefen!' /* [F*] relocated from his row with Lasse */],
    berra: ['Ra-tara-tara!' /* [F*] relocated: at the bikini girls by the bar */],
    robban: ['Ra-tara-tara!' /* [F*] relocated: the two say it together in the film */],
  },
  pig: {
    berra: ['Skit i det. Vi slipper gå.' /* [F*](t) relocated from their lift on the country road */],
    robban: ['Fan, de luktar.' /* [F*](t) relocated from their lift */, 'Snacka om grisfest.' /* [F*](t) relocated from their lift */],
  },
  local: ['¡Turistas!' /* [N] */, '¡Ay, los suecos!' /* [N] */, '¡Hola, hola!' /* [N] */],
  sv: ['Hallå där!' /* [N] */, 'Tuta inte åt mig!' /* [N] */, 'Vad är det nu då?' /* [N] */],
  poses: { ole: 'wave', lasse: 'wave', angerud: 'oath' },
  sorry: 'Förlåt! Jag kom åt tutan!',                                              // [N]
  sorryAt: 0.6,
  tease: 'Ra-tara-tara!',
  teaseReply: 'Det var inte så jag menade!',                                       // [N]
  teaseGap: 1.5,
  oinkEvery: 0.75, bubbleEvery: 1.5,
  oinkBubble: 'NÖFF! NÖFF!',                                                       // [N]
};

// Dygnet runt – the island's clock, its evenings and the nap in room 107 (free roam, DESIGN §10.10;
// game/dayClock.js). The clock `h` (Spanish time, 0–24) starts at `start` (Lasse in the bus:
// "Klockan är tre spansk tid") and runs only between missions (island, `missions.state === 'idle'`,
// no dialogue; in test mode only when a test sets `day.run`): `hourSecs` s a game hour, `nightHourSecs`
// from `night[0]` to `night[1]` (a day ≈ 19.5 min). `sky`: [hour, palette] key frames (§13.3,
// no new palettes), eased between neighbours (dawn 6–7, the sunset 19–19.75, dusk 19.75–20.5). The
// night lights and the lighthouse burn from `lit[0]` to `lit[1]` (gfx.setNightLights). A mission
// talk outside `dayHours` (any palette but day) fades to `morningBanner`, the clock to `morning`,
// and the mission starts as by day (every timer is measured in daylight). `chatter`: lines of
// CHATTER said only within [from, to). `nap`: E at Stig's bed (landmark `stigSang`, radius `r`):
// black, the clock to the next of `wake` (at least `minGap` h on), Stig on his bed, Ole at its head
// (`oleAt`: [left, forward, world yaw] from the bed) with his calculator's alarm, then Stig up at
// `stigAt`; the camera at `cam` ([left, forward, height]) looks at `look`. When the town's lights are
// on, so is the room's: `lamp` (the hemisphere light) for the scene, as if Ole had switched on the
// ceiling lamp (the glowing pane over the room), and the clock's palette after it.
// Invented (§1.6): the clock as a mechanic, the nap and the alarm waking him; the words are the
// film's (Affe's "kvarta", Ole's gadgets) and ours.
export const DAY = {
  start: 15, hourSecs: 60, nightHourSecs: 30, night: [21, 6],
  sky: [[6, 'night'], [7, 'day'], [19, 'day'], [19.75, 'sunset'], [20.5, 'night']],
  lit: [20, 6.5], dayHours: [7, 19],
  morning: 9, fadeSecs: 0.7, spinSecs: 1.4, holdSecs: 1.2,
  morningBanner: ['NÄSTA MORGON', 'Klockan nio, spansk tid'],                       // [N] · [N]
  zone: 'SPANSK TID',                                                               // [F*] Ole's watch: "Spansk, norsk, svensk tid"
  others: '{no} norsk · {sv} svensk',                                               // [F*] the same watch
  chatter: {
    'Natturen går klockan nio!': [17, 21],
    'Friskoteket börjar halv tio varje morgon.': [6, 10],
    'Klockan är tre spansk tid.': [14, 16],
  },
  nap: {
    lm: 'stigSang', r: 2.0, minGap: 0.5,
    prompt: '<b>E</b> Kvarta en stund',                                             // [F*] Affe's "Jag måste få kvarta nån gång."
    wake: [[8, 'morgonen'], [15, 'eftermiddagen'], [20, 'kvällen'], [23, 'natten']],
    banner: 'Zzz…',                                                                 // [N]
    zzz: 'Zzz…',                                                                    // [N]
    ole: 'PIP-PIP-PIP! Kalkulator – med vekkerklokke!',                             // [F*] his gadget line (the calculator with an alarm); the alarm call ours
    toast: 'Stig kvartade till {part}.',                                            // [N]
    night: 'Vad härligt det är med de här varma nätterna…',                         // [F*](t) relocated: a warm night by the pool in the film, speaker unsure
    oleAt: [1.0, -0.2, -Math.PI / 2], stigAt: [0.15, 1.55, Math.PI],
    cam: [-0.4, 3.75, 2.45], look: [0.45, 0.15, 1.2],
    lamp: { hemiSky: 0xffe2b8, hemiGround: 0x9a7050, hemiI: 1.7 },
    pipAt: 0.7, sleepOn: 2.2, wakeAt: 1.4, after: 1.6,
  },
};

// Lite film. – herr Storchs semesterfilm (free roam, DESIGN §10.11; game/storchFilm.js). A trick by
// Stig within `r` m of `who` (a double jump, a bounce, a stomp, a drop of `drop` m or more, the glide,
// or an offence the witness rule sees) makes him notice (`notice` s, turned to Stig) and, standing
// on the `sand` ([x0, x1], [z0, z1] m from the landmark `at`: the beach of block (3,6), not the
// paseo or a road) more than `near` m off, trot at `trot` m/s to `filmDist` m from Stig (kept on the
// sand; at most `giveUp` s, or stuck `stuckSecs` s); then he films for `filmSecs` s with `say`, and
// walks home at `walk` m/s. At most every `every` s. Never in a mission, and as a mission's giver or
// extra (pinned) he films from his place. `look`: E within `r` m, his viewfinder for `secs` s (E or
// Space after `minSecs`): the day counter (`day`, mission index − `dayFrom`, 1–7) and a black picture
// with one of `capLines`; after the end (unlock `after`) the island through his lens, `julLabel` and
// `liveLine`. After the end each filming keeps a still (`stills`: from his eye at Stig, `w`×`h` jpeg;
// the first `first` s in, again when Stig is `higher` m higher, at most `grabs` takes; the best is
// kept, the newest `max` saved under `key`), and with unseen stills he offers `offer` (within
// `offerR` m, every `offerEvery` s) and E is `night`: the film night (seven black days and the newest
// `max` stills). Invented (§1.6): his reactions, the viewfinder, the stills and the film night; the
// lens cap and the black week are the film's (the julfest, notes/research-plot.md:370).
export const STORCH_FILM = {
  who: 'herrStorch', after: 'bodega',
  sand: { at: 'playa', x: [-29.5, 29.5], z: [-34.5, 19.5] },
  r: 25, every: 30, notice: 0.35, near: 7, filmDist: 5, trot: 3.4, walk: 1.5, giveUp: 7, stuckSecs: 0.6,
  filmSecs: 2.6, drop: 3,
  say: 'Lite film.',                                                              // [F*](t) his Arlanda answer (speaker unsure), as the witness toast's
  dayFrom: 5,
  look: {
    r: 2, secs: 4.5, minSecs: 0.6, eye: 1.6, ahead: 0.45,
    prompt: '<b>E</b> Titta i kameran',                                           // [N]
    title: 'I KAMERAN',                                                           // [N]
    day: 'DAG {n}',                                                               // [N]
    julLabel: 'JULAFTON',                                                         // [N]
    capLines: ['Strålande ljus i dag.' /* [N] */, 'Det här blir en fin semesterfilm.' /* [N] */],
    liveLine: 'Nu blir\'e film!',                                                 // [N] his "Blir'e inge film?" turned round
  },
  stills: { w: 320, h: 180, q: 0.75, fov: 48, first: 0.2, higher: 0.5, grabs: 3, max: 8, key: 'charter-and-run-film-v1' },
  offer: 'Vill du se min film?',                                                  // [N]
  offerR: 7, offerEvery: 25,
  night: {
    prompt: '<b>E</b> Se filmen',                                                 // [N]
    title: 'FILMKVÄLL',                                                           // [N]
    sub: 'Herr Storchs semesterfilm · dag 1–7 och julafton',                      // [N]
    weekLine: 'Blir\'e inge film?',                                               // [F*] his julfest line, said again over his black week
    julLine: 'Lite film.',                                                        // [F*](t)
    max: 4, secs: 10, minSecs: 1, steps: [[1.7, 'l1'], [3.0, 'jul'], [4.6, 'l2']],
  },
};

// Heja Eslöv! – the rollerskier trains for real (free roam, DESIGN §10.12; game/eslov.js). On the
// island with `missions.state === 'idle'` `who` skis up and down the Eslöv lane: a loop from `at`
// (yaw 0, south) `lane.to` m north and back, `lane.side` m right of the lane's middle each way,
// turning round on a half circle of that radius, at `speed` m/s (eased by `accel` m/s², `turnSpeed`
// in the turns); every `restEvery`th lap he stands `restSecs` s at the south end facing the road
// (his chatter then). At night (`day.dark`) he stands there. Stig on foot in his track (within
// `spar.ahead` m ahead, `spar.lat` m aside) gets `spar.call` (at most every `spar.every` s) and the
// skier swerves to pass him `spar.pass` m off; `spar.sorryAt` s later Stig's `spar.sorry` and a hop
// aside at `spar.hop` m/s. A car in his track within `block` m: he stops, and after `blockSecs` s
// turns back. The horn (game/honk.js) within `heja.r` m, if he sees the car: Stig's `heja.stig`
// `heja.stigAt` s after the press and his `heja.replies` (the first one first; `heja.won` after a
// won race) at `heja.replyAt` s, waving his pole `heja.waveSecs` s; at most every `heja.every` s. On
// foot E (`heja.prompt`, within `heja.r2` m): the same, he brakes to a stop facing Stig and
// `race.offerAt` s later offers the race (`race.offer`; E `race.prompt` for `race.offerSecs` s).
// The race (`race`): Stig and the skier on the start line (offsets [dx, dz] in world axes from
// `at`), a black cut, `count` s of countdown, then once round the tomato fields through `cps`
// ([dx, dz, r]) and back over the line (`line`: dz, half width) going north, within `timer` s. The
// skier skis `path` at the speed that crosses the line at `timer` s: beat him and Stig wins `prize`
// pta and his best time is kept (`game.records.eslov`). On foot only: a car or a jump in position
// (R) ends it. Invented (§1.6): his training, the horn answer, the "Spår!" gag and the race; Berra's
// "Heja Eslöv!" is the film's, given to Stig.
export const ESLOV = {
  who: 'eslov', at: 'eslovVag',
  lane: { to: -50, side: 1.0 },
  speed: 3.2, accel: 1.2, turnSpeed: 1.0, restEvery: 2, restSecs: 5,
  spar: {
    ahead: 7, lat: 1.1, pass: 1.5, every: 15, sorryAt: 0.7, hop: 3.2,
    call: 'Spår!',                                                                 // [N] the skiers' old call on the track
    sorry: 'Oj, förlåt!',                                                          // [N]
  },
  block: 5, blockSecs: 2.5,
  heja: {
    r: 22, r2: 3, every: 8, stigAt: 0.3, replyAt: 1.25, waveSecs: 1.8, greetSecs: 2.4,
    prompt: '<b>E</b> Heja Eslöv!',                                                 // [F*]
    stig: 'Heja Eslöv!',                                                           // [F*] Berra's shout at the rollerskier (research-plot.md:318), given to Stig
    replies: ['Bara 390 mil kvar!' /* [N] the sign's 3 900 km */, 'Tack! Det är bara att staka på!' /* [N] */,
      'Hälsa hem till Sverige!' /* [N] */],
    won: ['Där har vi löparen!' /* [N] */, 'Bara 390 mil kvar!' /* [N] */],
  },
  race: {
    offerAt: 1.2, offerSecs: 9,
    offer: 'Ska vi ta ett varv runt fälten? Start och mål vid skylten.',          // [N]
    prompt: '<b>E</b> Eslövloppet – ett varv runt fälten',                         // [N]
    yes: 'Ett varv? Det klarar jag.',                                              // [N]
    title: 'Eslövloppet',                                                          // [N]
    text: 'Spring ett varv runt tomatfälten – före rullskidåkaren!',              // [N]
    best: 'Rekord {t}',                                                            // [N]
    // Measured (DESIGN §8 "Timers and difficulty", on foot; §10.12, scenario `eslovlopp`): the
    // walker's median lap 28.18 s + 0.5 s × 5 targets = T_ref 30.68, ceil(1.25 × 30.68) = 39 (pool
    // `eslovLopp` in notes/calibration-samples.md).
    timer: 39, prize: 100, fadeSecs: 0.6, count: 3.5,
    stig: [-1.2, -7], skier: [1.0, -7], line: [-8, 3.6],
    cps: [[0, -59, 6], [-63, -59, 6], [-63, 11, 6], [0, 11, 6]],
    path: [[1, -7], [1, -59.1], [-62.6, -59.1], [-62.6, 11.1], [1, 11.1], [1, -8]],
    afterSecs: 3.5,
    win: { banner: 'DU VANN!', sub: 'Eslövloppet på {t}', record: 'Eslövloppet på {t} – nytt rekord!',  // [N]
      line: 'Där fick jag! Här, en slant till en läsk.',                           // [N]
      stig: 'Tack! Det var nog bara tur.',                                         // [N]
      toast: 'Rullskidåkaren gav dig {n} pta.' },                                  // [N]
    lose: { banner: 'RULLSKIDÅKAREN VANN', sub: 'Eslövloppet – försök igen',       // [N]
      line: 'Det är träningen som gör det!' },                                     // [N]
    abort: 'Eslövloppet avbrutet – det springs till fots.',                        // [N]
  },
};

// Små grodorna i poolen – the pool fest after the end (free roam, DESIGN §10.13; game/poolFest.js).
// On the island with `missions.state === 'idle'`, from `fromIndex` (after julafton) with the unlock
// `after`, between `hours` on the free-roam clock. Stig on Flamenco's pool deck (`deck`: [x0, x1],
// [z0, z1] m from `at` in world axes; the visit ends `margin` m outside it) calls the party: the
// `ring` (free, within `claimR` m of `at`) wade at `walk` m/s to their places on a circle of `r` m
// round `at` (clockwise from Stig's gap at world yaw `gapYaw`; `leader` in the middle) and stand
// `wade` m deep. The `musicians` keep their instruments; the rest hop with their hands as ears or
// tails (anim `groda`). A set: `rounds` rounds of the `tune` (`gapBeats` apart), then `pauseSecs` s;
// the first starts `startSecs` s after the last dancer is in place (or `formSecs` after the call).
// Every other beat from beat 0 the ring hops `hop.h` m for `hop.air` of the two beats (`hop.chorus`
// from beat `hop.chorusFrom`). The music's level at a round's start falls from 1 at `vol.near` m to
// `vol.min` at `vol.far` m. The first visit of a session, Stig within `askR` m of the gap: the `ask`
// exchange ([delay s, who, text]). Each visit, at the first round, the `porter` steps out to `at`
// ([dx, dz] from `at`), says `line`, shakes his head `shakeSecs` s, stays `stay` s and goes back.
// `join`: E at the gap (`r` m; marked on the water) and Stig steps into the ring (stiff as a stick);
// Space hops `hopV` m/s; within `window` s of a ring hop it is in time. `goal` in a row: the ring
// cheers `cheerSecs` s, `cheer` (Ole), and once a visit Lasse's `pay` pta (`payLine`, `payToast`).
// Off the beat the ring laughs (`laughSecs`, at most every `laughEvery` s); a ring hop missed breaks
// the row. Lines at most every `again` s. E again, or a step, takes him out (`out` m behind the gap).
// Invented (§1.6): the fest in free roam, the ring round Lasse, the hop counter, Stig dancing at all
// (in the film he and Ole open the crispbread while the others dance); the melody is traditional.
export const POOL_FEST = {
  at: 'flamencoRing', after: 'bodega', fromIndex: 13, hours: [9, 23],
  deck: { x: [-22, 23], z: [-13, 22] }, margin: 8,
  r: 2.9, gapYaw: -0.35, leader: 'lasse',
  ring: ['majsan', 'siv', 'affe', 'gabbe', 'fruStorch', 'ole'],
  musicians: ['affe', 'gabbe'],
  claimR: 40, walk: 1.7, wade: 0.5, minDancers: 3,
  tune: 'smaGrodorna', rounds: 2, gapBeats: 2, pauseSecs: 12, startSecs: 1.5, formSecs: 12,
  hop: { h: 0.3, chorus: 0.42, chorusFrom: 16, air: 0.42 },
  vol: { near: 12, far: 50, min: 0.15 },
  askR: 14,
  ask: [
    [0, 'stig', 'Måste man gå på den?'],                                          // [F*] julafton morning, about the party (research-plot.md:365), relocated to the pool's edge
    [2.4, 'majsan', 'Var inte så typiskt svensk.'],                              // [F*] her answer (research-characters.md:224)
    [5.0, 'stig', 'Det är väl typiskt svenskt att ha julfest bland palmerna.'],   // [F*](t) the same exchange (speaker interpreted)
  ],
  porter: {
    who: 'portier', at: [1.4, -9.6], walk: 1.4, shakeSecs: 2.2, stay: 6,
    line: 'De där svenskarna är heltokiga!',                                     // [F*](t) the Spaniards at the julfest; julafton gives it to the porter
  },
  join: {
    r: 2.6, hopV: 4.6, out: 2.4, camTurn: 0.4,
    prompt: '<b>E</b> Dansa med',                                                // [N]
    leave: '<b>E</b> Kliv ur ringen',                                            // [N]
    line: 'Hopp… och hopp…',                                                     // [N] Stig, counting himself in
  },
  window: 0.18, goal: 8, cheerSecs: 2.2, laughSecs: 1.3, laughEvery: 4, again: 20,
  cheer: ['ole', 'Heia Norge!'],                                                 // [F*] his solo dance at the grisfest ends "Heja Norge!" (research-plot.md:348)
  pay: 50,
  payLine: 'Bravo, Stig-Helmer! En slant från SunTrip.',                        // [N]
  payToast: 'Lasse gav dig {n} pta.',                                            // [N]
  takt: 'I TAKT', miss: 'OTAKT!',                                                // [N] · [N]
};

// Åk bagageband – the baggage belt carries Stig (free roam; feature 25, DESIGN §10.16;
// game/baggageBelt.js). On the island with no mission running (`missions.state === 'idle'`) the belt
// of CINTA 2 at Gando (world/blocks/coast.js `BELT`) carries him round at the ring's own spin, about
// 20 s a turn. Standing still on it for `sitAfter` s he sits down on the nearest bag (`seatIn` m in
// from its outer end, facing out; eased over `sitSecs` s) and rides on as luggage; Space hops him off
// the bag (`hopV` m/s), E steps him off the belt onto the hall floor (`offR` m from the middle). A
// ride ends `offSecs` s after he has left the belt. The session's first ride: `board` `boardAt` s in,
// [0] before julafton has brought his bag back (missions index under `bagBackIndex`), [1] after.
// Every full turn the belt has carried him: the toast `laps[n - 1]` (`lapN` past them); after the
// session's first, before julafton, Lasse on the radio `lasseAt` s later; after the `luggageLap`th of
// a ride, `luggageAt` s later, Stig's `luggage`. Invented (§1.6): riding the belt at all.
export const BAGGAGE_BELT = {
  sitAfter: 2.5, sitSecs: 0.35, seatIn: 0.28, hopV: 8.6, offR: 3.9, offSecs: 0.6,
  bagBackIndex: 13,   // julafton (mission 13, index 12) brings the bag back
  boardAt: 0.8,
  board: [
    'Min väska har inte kommit.',        // [F*] Stig at the airport in Las Palmas (research-plot.md:238), relocated to the belt
    'Det är faktiskt rätt rogivande.',   // [N] after julafton, with the bag back
  ],
  laps: ['Ett varv på bagagebandet!' /* [N] */, 'Två varv på bagagebandet!' /* [N] */, 'Tre varv på bagagebandet!' /* [N] */],
  lapN: '{n} varv på bagagebandet!',     // [N]
  lasse: ['lasse', 'Den dyker upp. Det gör de alltid.'],   // [N] his answer in buss17's intro (missions/island.js), relocated
  lasseAt: 1.2,
  luggageLap: 3, luggageAt: 0.6,
  luggage: 'Den här väskan ska till Las Palmas.',   // [F*] said at a Japanese airport (research-plot.md:238), relocated: Stig is the bag
  prompt: '<b>E</b> Kliv av bandet',     // [N]
};

// Rakt genom fruktståndet (free roam; feature 28, DESIGN §10.19; game/fruitStands.js). The market's
// five fruit stalls (world/props.js `frutas`) break under his car on the island with no mission
// running (`missions.state === 'idle'`): the fruit seller (`vendor`, a figure of her own) pops up beside
// the wreck for `vendorSecs` s and cries `vendorLine`; Stig's sorry is STIG_SORRY's `stand`; from
// missions index `swearFrom` (after asnan) the souvenir seller, `swearR` m off or nearer, swears
// `swearLine` `swearAt` s after the crash, at most once in `swearGap` s. Invented (§1.6): the
// breakable stalls, the seller and her cry.
export const FRUKTSTAND = {
  vendorSecs: 4, vendorLineSecs: 2.4,
  vendorLine: '¡Mis tomates!',   // [N] the form of the locals' "¡Mi coche!" (CARJACK_LOCAL)
  vendor: { kind: 'adult', scale: 0.95, wide: 1.15, skin: 0xc99a6e, hair: 'bun', hairC: 0x1d1426, brows: 0x1d1426, lashes: true, nose: 'small',
    hat: 'scarf', hatC: 0xd8321e, shirt: 0xf4f0e6, dress: 0x2f5a9a, apron: 0xf7c31b, pants: 0x2f5a9a, legsC: 0x6a4a3a, shoes: 0x2a2a2a, voice: 380 },
  swearFrom: 8, swearR: 25, swearGap: 60, swearAt: 1.4, swearSecs: 2.4,
  swearLine: 'Jävla smålänningar!',   // [F*] the souvenir seller's when Ole haggles the donkey down (research-plot.md:302–304; asnan's win), relocated
};

// Badgäster på solstolarna (free roam; feature 32, DESIGN §10.22; game/bathers.js). On the island with
// no mission running (`missions.state === 'idle'`), by day (the clock's `dayHours`), tourists lie on
// the sun loungers nearest him: a `share` of the loungers is taken (a draw per lounger, new every
// morning), and of those at most `max`, the nearest within `r` m, have a body (kept to `out` m; one
// taken lounger nearer by `swap` m takes the furthest's). A body appears or goes only while its
// lounger is out of the camera's view or `seenR` m off, or for `cutSecs` s after a cut. They turn red
// with the time on the lounger: pink after `burn[0]` s, lobster red after `burn[1]` s (`skins`, one
// of each set by the lounger's draw), rebuilt only while out of view or `seenR` m off. A kick or a car
// through a taken lounger (the props' smash and SKANDAL, nothing more): the bather goes off it
// backwards over the backrest (a somersault at `flip` rad/s, `back` m/s plus `push` of the kick's or
// `carK` of the car's speed, `up` m/s up) with an OUCH bark, gets up with a GETUP one (within
// `getUpR` m), stands, and goes once unseen (or `out` m off). A lounger back after its smash
// (tickProps) has someone new on it, pale. `stekt`: from missions index `from` to `to` (friskotek or
// asnan next: after buss17, before the bodega) Berra and Robban lie lobster red (`stekt` outfit) on
// the two pool-deck loungers by BAR PISCINA (landmarks `berra`, `robban`), asleep (`slump`), claimed
// and handed back only unseen (`clearR` m or out of view); a mission start or the other level sends
// them home at once in their own skin. Within `snoreR` m a snore every `snoreEvery` s, by turns. E
// on Berra (`wake.r` m, `wake.prompt`): Stig's `wake.stig`, `wake.liftAt` s later Berra lifts his
// head for `wake.liftSecs` s with `wake.berra`, then Robban's `wake.robban` in his sleep, `wake.gap`
// s after. Their lounger smashed: off it as a bather, asleep on the ground until it is back.
// Invented (§1.6): the bathers, their burn and the fly-off; Berra and Robban asleep in the sun are
// the film's (scene 7.8, notes/research-plot.md:296).
export const BATHERS = {
  max: 10, r: 40, out: 48, swap: 6, share: 0.4, seenR: 24, cutSecs: 1.2, seed: 3201,
  burn: [150, 360],
  skins: [[0xf6d3c0, 0xf2c9a8, 0xf4dcc8], [0xf7947a, 0xf28c74, 0xf9a086], [0xf0705a, 0xec6852, 0xf47a62]],
  flip: -11, back: 3.2, push: 0.25, carK: 0.5, up: 6.5, getUpR: 30,
  stekt: {
    from: 6, to: 8, berra: 'stektBerra', robban: 'stektRobban', clearR: 50,
    snoreR: 30, snoreEvery: 4.5,
    snore: {
      berra: ['Zzz…' /* [N] */, 'Zzz… Pepes Bodega… zzz…' /* [N] */],
      robban: ['Zzz…' /* [N] */],
    },
    wake: {
      r: 2.4, liftAt: 1.6, liftSecs: 2.4, gap: 0.9,
      prompt: '<b>E</b> Väck Berra',                     // [N]
      stig: 'Ursäkta… ni bränner er.',                   // [N]
      berra: 'Fem minuter till…',                        // [N]
      robban: 'Fan, vad jag är törstig…',                // [F*] Robban's on the countryside walk (research-plot.md:318), said in his sleep, relocated
    },
  },
};

// Speedo names for named and mission cars (§11.4); unnamed cars show their type's Swedish name.
// Fin hund… – the watchdogs (free roam, DESIGN §10.21; game/dogs.js). `lots` of the 48 bungalowR
// lots (the ones with a trampoline first, then those with a car, at most `perBlock` a block) and the
// farmyard on vischan keep a dog each, the `pack` in that order and `farm`. It lies by the front door
// and barks at him on the sidewalk (within `hearR` m of its lot) from inside the wall. Stig in its lot
// on foot: it rushes at him (`speed` m/s) and stops `stopR` m off, barking: it never bites, never
// leaves its lot by more than `reach` m (never out through the front wall) and is never kicked, run
// over or worth SKANDAL. Out of reach (`upH` m over the yard, standing: a car roof, a garden wall, the
// tank's rim, a crate, the trampoline) he talks to it; after `callAfter` s up there (or `groundCall` s
// in its lot) the owner whistles from the house unseen with the dog's `call`, and it trots home and
// lies down for `restSecs` s. Dogs further than `farR` m from him are put away. Invented (§1.6): the
// dogs, their owners and their calls; "Fin hund." is the film's (at Arlanda's baggage check, its
// speaker unknown), relocated to Stig, and the mantra is the clinic's (S.mantraLine).
export const DOGS = {
  lots: 12, perBlock: 2,
  speed: 6.5, trot: 2.4, alertSpeed: 4.2, reach: 2, wallIn: 1.35, dogR: 0.3,
  stopR: 1.3, stopUp: 0.55, stuck: 0.7, carR: 4.5, hearR: 9, upH: 0.8, climb: 0.45,
  callAfter: 7, groundCall: 18, restSecs: 40, backSecs: 2.2, alertHold: 2.5,
  barkGap: [0.9, 1.5], barkSecs: 0.9, barkHear: 35,
  lineGap: 3.4, firstR: 3.2, poseR: 5, mantraSecs: 2.6, thanksAt: 1.6, callSecs: 2.6,
  farR: 75,
  pack: [
    { name: 'Bobi', look: 'brun', bark: 'VOFF! VOFF!', call: '¡Bobi! Hit!' },                 // [N] (the idea's)
    { name: 'Bijou', look: 'pudel', bark: 'VIFF! VIFF!', call: 'Bijou! Kom till matte!' },    // [N] the poodle of Angerud's portrait, not named Chérie
    { name: 'Rufo', look: 'svart', bark: '¡Guau! ¡Guau!', call: '¡Rufo! ¡Ven aquí!' },        // [N]
    { name: 'Kasper', look: 'flack', bark: 'VOFF! VOFF!', call: 'Kasper! Hit med dig!' },     // [N]
    { name: 'Lola', look: 'gul', bark: '¡Guau! ¡Guau!', call: '¡Lola! ¡A casa!' },            // [N]
    { name: 'Pirre', look: 'gra', bark: 'VIFF! VIFF!', call: 'Pirre! Kom nu!' },              // [N]
    { name: 'Trofast', look: 'brun', bark: 'VOFF! VOFF!', call: 'Trofast! Ligg!' },           // [N]
    { name: 'Tango', look: 'svart', bark: '¡Guau! ¡Guau!', call: '¡Tango! ¡Basta ya!' },      // [N]
    { name: 'Ludde', look: 'flack', bark: 'VOFF! VOFF!', call: 'Ludde! Kom hit!' },           // [N]
    { name: 'Pelusa', look: 'gra', bark: '¡Guau! ¡Guau!', call: '¡Pelusa! ¡Aquí!' },          // [N]
    { name: 'Canelo', look: 'gul', bark: '¡Guau! ¡Guau!', call: '¡Canelo! ¡Ven!' },           // [N]
    { name: 'Sickan', look: 'brun', bark: 'VOFF! VOFF!', call: 'Sickan! Hit, sa jag!' },      // [N]
  ],
  farm: { name: 'Chispa', look: 'gul', bark: '¡Guau! ¡Guau!', call: '¡Chispa! ¡Ven aquí!' },  // [N]
  first: 'Fin hund… fin hund…',   // [F*](t) "Fin hund." at Arlanda's baggage check (research-plot.md:162; speaker unknown), relocated to Stig
  ground: [
    'Fin hund… fin hund…',        // [F*](t)
    'Lugn… lugn nu…',             // [N]
    'Jag går nu. Jag går.',       // [N]
  ],
  up: [
    'Snälla hund… sitt!',         // [N]
    null,                         // the mantra with his arms out: S.mantraLine [F*] (Levander's clinic, relocated)
    'Fin hund… fin hund…',        // [F*](t)
  ],
  thanks: 'Tack… tack så mycket!',   // [N] to the owner nobody sees
};

export const NAMED_CARS = {
  buss17: 'SunTrips buss 17', hyrbil: 'Hyrbilen', grisbil: 'Grisbilen', nattbuss: 'Nattbussen', joseBil: 'Josés bil', guardiaJeep: 'Guardia-jeepen',
  grisbilFollow: 'Grisbilen', utflyktsbuss: 'Utflyktsbussen', guardia1: 'Guardia-jeepen',   // [N]
};

export const LEVEL_OUTFITS_ISLAND = { ole: 'sol', berra: 'sol', robban: 'sol', angerud: 'sol', majsan: 'sol', siv: 'sol', lasse: 'sol' };

// Bränsletillägg tillkommer – SunTrip-butiken (free roam, DESIGN §10.23; game/suntripShop.js). On the
// island with no mission running (`missions.state === 'idle'`) a yellow counter stands on the SunTrip
// office's porch by the east shop window (world/blocks/hotels.js SUNTRIP_SHOP; gone, solids and all,
// in any mission and on the other level), and the film's travel agent (`clerk`, a figure of the
// module's own) stands behind it with four `items`. E at a ware (`r` m, Stig on foot) buys it at the
// sign's `base` price plus its `add`-ons: the receipt is a toast whose lines come one by one
// (`lineSecs` s apart), the clerk's `sell` line goes with it and Stig's `sigh` follows the total. The
// purse must hold what is paid now (`addCoins`, never `game.pay`: Ole does not pay); short of it, the
// clerk's `short` (under `poorBelow` pta, the fuel surcharge, `poor`). The hat goes only on SunTrip's Trapp Trull
// account: a third of its total now and `trapp.parts` − 1 instalments of the same, each after
// `trapp.every` s of free roam (`trapp.retry` s later when the purse is short), as a toast; and the
// account's beach bag waits by the counter until E takes it: walk `leaveR` m off without it and the
// clerk calls `paketet` after him (once each time, again after he has been back within `backR` m).
// What he buys he wears at once, as a layer of its `look` over his outfit (`setPlayerOutfit`), and
// keeps in free roam after a restart (saved, §10.5); E at an owned ware takes it off or puts it on
// again (prompt names: `name` to buy, `the` ?? `name` to take off or put on). Never in a mission (the layer comes off when one starts and back when it ends), never over
// the Rio end card's `rio`, never in the flight level. The clerk greets him within `greetR` m once a
// session; the hat bought (or put on again) Ole says his `ole` line when he next comes within `oleR` m. Invented (§1.6):
// the shop on the island and Stig buying there; the add-ons, the Trapp Trull account, the bag, the
// nose guard and "Paketet!" are the film's Stockholm travel agency (research-plot.md:133–142).
export const BUTIK = {
  r: 1.25, lineSecs: 0.45, sighAt: 0.5, sellSecs: 2.6, sighSecs: 2.6, toastSecs: 7.5,
  leaveR: 8, backR: 4, greetR: 4.5, oleR: 7, poorBelow: 50,
  trapp: { parts: 3, every: 150, retry: 15 },
  clerk: { kind: 'adult', name: 'Reseförsäljaren', scale: 1.02, skin: 0xf2c9a8, hair: 'short', hairC: 0x7a5432, brows: 0x6a4a2a, nose: 'small',
    mustache: 0x6a4a2a, stache: 'thin', shirt: 0xf8f8f4, stripe: 0xf7c31b, bib: 'SUNTRIP', bibC: '#d8321e', pants: 0x2f4a7a, shoes: 0x2a2a2a, voice: 290 },
  items: [
    { id: 'hatt', name: 'solhatten', base: 100, trapp: true,
      add: [['högsäsong', 25], ['avbeställningsskydd', 25], ['reseförsäkring', 25], ['bränsletillägg', 50]],
      look: { hat: 'bucket', hatC: 0xf4f1e8, hatBand: 0xd8321e, hatSun: true },
      receipt: 'solhatt',                                                                  // [N]
      sell: 'Solhatten säljer vi bara på SunTrips Trapp Trull-konto. Strandväskan ingår!',   // [F*] the agency's offer (research-plot.md:140)
      sigh: 'Det var en väldigt massa tillägg…' },                                         // [F*](t) the agency scene (research-plot.md:139; speaker unknown)
    { id: 'glas', name: 'solglasögonen', base: 150,
      add: [['högsäsong', 25], ['avbeställningsskydd', 25], ['reseförsäkring', 25], ['bränsletillägg', 50]],
      look: { shades: 0x2a2a2a, glasses: null },
      receipt: 'solglasögon',                                                              // [N]
      sell: 'Solglasögon. Med solfilter, för en blygsam merkostnad.',                      // [F*] the bungalow seller's "för en blygsam merkostnad" (research-plot.md:291)
      sigh: 'Det var en väldigt massa tillägg…' },                                         // [F*](t)
    { id: 'skjorta', name: 'den prickiga skjortan', base: 200,
      add: [['högsäsong', 50], ['avbeställningsskydd', 25], ['reseförsäkring', 25], ['bränsletillägg', 50]],
      look: { suit: null, tie: null, bowtie: null, coat: null, vest: null, shirt: 0xf6f3ea, print: [0x2f6ad8], printStyle: 'dots', longSleeves: false, collar: true },
      receipt: 'prickig skjorta',                                                          // [N]
      sell: 'Vad den kostar? Det beror på var du bor.',                                    // [F*] the agent's answer to the Storches (research-plot.md:136)
      sigh: 'Det var en väldigt massa tillägg…' },                                         // [F*](t)
    { id: 'nasa', name: 'ett nässkydd', the: 'nässkyddet', base: 0,
      add: [['bränsletillägg', 50]],
      look: { noseGuard: 0xfafaf6 },
      receipt: 'nässkydd',                                                                 // [N]
      sell: 'Nässkydd – det får du också gratis.',                                         // [F*] the agency scene (research-plot.md:142)
      sigh: 'Gratis… plus bränsletillägg.' },                                              // [N]
  ],
  prompt: {
    buy: '<b>E</b> Köp {name} ({n} pta)',        // [N]
    free: '<b>E</b> Ta {name} (gratis)',         // [N]
    off: '<b>E</b> Ta av {name}',                // [N]
    on: '<b>E</b> Ta på {name}',                 // [N]
    bag: '<b>E</b> Ta strandväskan',             // [N]
  },
  // The receipt: KVITTO, a line per entry ("solhatt 100", "+ högsäsong 25"…), the total; on the
  // Trapp Trull account a line of what is paid now.
  receiptHead: 'Kvitto · SunTrip',                                       // [N]
  receiptTrapp: 'Trapp Trull-konto: {n} pta nu, resten i {k} avbetalningar',   // [F*] the agency's account (research-plot.md:140)
  instalment: 'Trapp Trull-kontot: avbetalning {i} av {k}, {n} pta',     // [N]
  instalmentLast: 'Trapp Trull-kontot är betalt. Tack för att du reser med SunTrip!',   // [N]
  short: 'Med alla tillägg blir det {n} pta, tyvärr.',                   // [N] the clerk
  poor: 'Det räcker inte ens till bränsletillägget.',                    // [N] the clerk
  greet: 'Välkommen till SunTrip-butiken! Bränsletillägg tillkommer.',   // [N] (the title screen's fine print)
  paketet: 'Paketet!',                                                   // [F*] the film's running gag at the clinic and the agency (research-plot.md:133)
  bagTaken: 'Paketet. Ja. Tack.',                                        // [N] Stig
  ole: 'Nå ser du ut som en ekte sydenturist, Stig-Helmer!',             // [N] Ole
};

// Gags på E – Ole's flash and Angerud's Viking special (free roam, DESIGN §10.32; game/gags.js). Two
// short film scenes in the dialogue box behind E, Hit & Run's gags: `kamera` at Ole's camera bag on
// the patio wall at the pergola's west edge (landmark `gagKamera`, the bag built in hotels.js), with
// Ole; `viking` under the lamp beside Viking Bar's door (landmark `gagViking`), with Angerud and
// Carmencita. A gag is offered (its `prompt` within `r` m of its landmark) on the island with no
// mission running, Stig on foot and free, no SKANDAL pursuit, and everyone in `needs` standing free
// within `needR` m (shown, at home or the waiting mission's place, not walked or posed by anyone, not
// in a car or a seat; Angerud is in hospital after the end, so `viking` is gone then). E: the people
// to their `marks` (landmark-relative [dx = left, dz = forward, absolute world yaw]), the letterbox
// and a cut to `shots[shot]` (landmark-relative [dx, dz, height over the ground] for the eye and the
// look), then the `lines` one by one; a line's `do` changes the shot, moves people (`marks`), holds a
// pose (`pose`: who -> an anim flag, or null for none) or sends someone in (`hide`) as it starts.
// After the last line the `end` (a flash and a sound, or nothing) and `hold` s on the last shot, then
// the camera back behind Stig at his `after` mark and everyone else back where they stood. The first
// time each gag pays `pay` pta and counts on the Gags row (the big map's legend, the collect card;
// `gags` in the save); after that it plays again for nothing, `rest` s after the last. Invented
// (§1.6): the gags themselves; the lines are the film's, relocated, and Stig's order.
export const GAGS = {
  pay: 100, r: 1.5, needR: 16, rest: 1.5,
  label: 'Gags',                                                                   // [N]
  list: [
    { id: 'kamera', lm: 'gagKamera', needs: ['ole'],
      prompt: '<b>E</b> Titta på Oles kameraväska',                                // [N]
      marks: { stig: [2.8, -1.3, Math.PI], ole: [0.6, -1.3, 0] },
      after: [0, 0, -Math.PI / 2],
      shots: { two: [[1.7, -5.7, 1.6], [1.6, -1.1, 1.3]], ole: [[-0.3, -2.5, 1.95], [2.8, -1.3, 1.55]] },   // the two-shot from the reception; over his shoulder, the lighthouse beyond
      shot: 'two',
      lines: [
        ['ole', 'Kamera to – japansk, liten, motor… Blits… Telelinse… Normal.', { pose: { ole: 'camShow' } }],   // [F*](t) his gadget show in room 107 (research-plot.md:255), in Norwegian
        ['ole', 'Har du noe kamera?'],                                             // [F*](t) the notes leave the speakers open: Ole asks
        ['stig', 'Ja.'],                                                           // [F](t)
        ['ole', 'Gammelt…'],                                                       // [F*](t) (bokmål: et kamera)
        ['stig', 'Fast det är blixt.'],                                            // [F](t)
        ['ole', 'Si omelett!', { shot: 'ole', pose: { ole: 'film' } }],            // [F*] the shopping trip's "Säg omelett." (research-plot.md:300), in Norwegian
      ],
      end: { flash: 'white', sfx: 'shutter', sparkle: 'ole' }, hold: 0.9 },
    { id: 'viking', lm: 'gagViking', needs: ['angerud', 'carmencita'],
      prompt: '<b>E</b> Beställ en juice',                                         // [N]
      marks: { stig: [-0.3, 0.55, -1.6], carmencita: [1.3, 0.6, 0.5], angerud: [2.15, -0.15, 2.29] },
      after: [0, 0, Math.PI],
      shots: { bar: [[0.95, -6.1, 1.6], [0.85, 0.3, 1.45]], lamp: [[-3.15, -0.6, 1.7], [0.45, 0.7, 2.1]] },   // from the street, an arch each; along the arcade
      shot: 'bar',
      lines: [
        ['angerud', 'En Viking special till, tack.'],                              // [F*] his order at Viking Bar after the grisfest (research-plot.md:354)
        ['stig', 'En juice, tack.', { pose: { stig: 'cupHeld' } }],                // [N] he cannot take strong drink (research-plot.md:177)
        ['stig', 'Om man vill ha lite mer juice…?', { shot: 'lamp', hide: ['carmencita'], marks: { stig: [0.3, 0.55, Math.PI], angerud: [1.85, 0.1, Math.PI - 0.5] }, pose: { stig: ['cupHeld', 'cupUp'] } }],   // [F*] the juice scene (research-plot.md:209), the cup up under the lamp
        ['angerud', 'Undrar hur länge man ska stå här.'],                          // [F*] his line at the airport (research-plot.md:236)
      ],
      end: null, hold: 1.2 },
  ],
};
