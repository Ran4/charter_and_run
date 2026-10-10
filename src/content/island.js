// Level 2 content (DESIGN §2.3, §10, §11.6, §14.9, §14.10): homes on the island, map labels, chatter
// and bark tables, collectibles, unlocks, named-car names, outfits. Owner: WP-G. Source tags per
// DESIGN §1.4 (bark tables are [F*]: every film line is relocated there). Invented (§1.6): Oles
// prylar and hajfenor as collectibles, the grisbil unlock.

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
  bodega: { hook: 'bodegaLit', label: ['Pepes Bodega', 'bodega'], home: { berra: ['bodega', -1.5, 0.5], robban: ['bodega', 1.5, 0.5], angerud: null },
    chatter: { berra: ['Robban! Jag hittade Pepes Bodega!' /* [F*] */], robban: ['Pepes Bodega. Glöm aldrig det, du.' /* [F*] */] },
    toast: 'Pepes Bodega har öppnat – på baksidan av hotellet.' },                   // [N]
};

// Speedo names for named and mission cars (§11.4); unnamed cars show their type's Swedish name.
export const NAMED_CARS = {
  buss17: 'SunTrips buss 17', hyrbil: 'Hyrbilen', grisbil: 'Grisbilen', nattbuss: 'Nattbussen', joseBil: 'Josés bil', guardiaJeep: 'Guardia-jeepen',
  grisbilFollow: 'Grisbilen', utflyktsbuss: 'Utflyktsbussen',   // [N]
};

export const LEVEL_OUTFITS_ISLAND = { ole: 'sol', berra: 'sol', robban: 'sol', angerud: 'sol', majsan: 'sol', siv: 'sol', lasse: 'sol' };
