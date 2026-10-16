// Level 2 content (DESIGN §2.3, §10, §11.6, §14.9, §14.10): homes on the island, map labels, chatter
// and bark tables, collectibles, unlocks, named-car names, outfits. Owner: WP-G. Source tags per
// DESIGN §1.4 (bark tables are [F*]: every film line is relocated there). Invented (§1.6): Oles
// prylar and hajfenor as collectibles, the grisbil unlock, the glide after julafton, the sisters
// judging his dives at Flamenco's pool, the island answering his horn, Herr Storch filming his
// tricks and his film night, the rollerskier's training, his answer to the horn and his race, the
// pool fest after the end (Små grodorna in Flamenco's pool, Stig hopping with them in his suit),
// Majsan ticketing cars on the island, the tow and her praise for a car parked straight (§10.17), and
// the grisfest's evening bought again at the farm's gate with a tourist's refusal (§10.18), and
// the market's fruit stalls his car goes through, with their seller's cry (§10.19).

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
    kind: 'fena', motion: 'circle', pickup: 'squash', jingle: 'squeak',
    label: 'Hajfenor', marker: 'fena', icon: 'fena-icon', bonus: 1000,
    first: ['lasse', 'Hajar i poolen igen? Ring kliniken!'],                           // [F*] Lasse's film line, adapted
    complete: ['lasse', 'Inga fler hajar i poolerna. Berra lovar att sluta dricka. Till lunch.'], // [N]
    items: ['fena_flamenco', 'fena_suntrip', 'fena_plaza', 'fena_golf', 'fena_bungalow', 'fena_hamn', 'fena_hav']
      .map((lm) => ({ id: lm, lm })),
  },
};

export const UNLOCKS = {
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
      herrStorch: ['Lite film.' /* [F*](t) */, 'Locket är av nu, ska du veta.' /* [N] */] },
    witness: { text: 'Linsskyddet är av – nu finns det bevis!', evidence: true },   // [N] the offence counts
    toast: 'Pepes Bodega har öppnat – på baksidan av hotellet.' },                   // [N]
  // Jag kan flyga (§10.7): the glide comes with `bodega` (julafton); this unlock only carries its
  // toast, shown the first time he is in the air in free roam after the end card (game/glide.js).
  glid: { toast: 'Upplåst: <b>Jag kan flyga</b> – håll J i luften' },             // [N]
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

// Speedo names for named and mission cars (§11.4); unnamed cars show their type's Swedish name.
export const NAMED_CARS = {
  buss17: 'SunTrips buss 17', hyrbil: 'Hyrbilen', grisbil: 'Grisbilen', nattbuss: 'Nattbussen', joseBil: 'Josés bil', guardiaJeep: 'Guardia-jeepen',
  grisbilFollow: 'Grisbilen', utflyktsbuss: 'Utflyktsbussen',   // [N]
};

export const LEVEL_OUTFITS_ISLAND = { ole: 'sol', berra: 'sol', robban: 'sol', angerud: 'sol', majsan: 'sol', siv: 'sol', lasse: 'sol' };
