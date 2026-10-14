// Level 2 content (DESIGN §2.3, §10, §11.6, §14.9, §14.10): homes on the island, map labels, chatter
// and bark tables, collectibles, unlocks, named-car names, outfits. Owner: WP-G. Source tags per
// DESIGN §1.4 (bark tables are [F*]: every film line is relocated there). Invented (§1.6): Oles
// prylar and hajfenor as collectibles, the grisbil unlock, the glide after julafton, the sisters
// judging his dives at Flamenco's pool, the island answering his horn.

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

// Speedo names for named and mission cars (§11.4); unnamed cars show their type's Swedish name.
export const NAMED_CARS = {
  buss17: 'SunTrips buss 17', hyrbil: 'Hyrbilen', grisbil: 'Grisbilen', nattbuss: 'Nattbussen', joseBil: 'Josés bil', guardiaJeep: 'Guardia-jeepen',
  grisbilFollow: 'Grisbilen', utflyktsbuss: 'Utflyktsbussen',   // [N]
};

export const LEVEL_OUTFITS_ISLAND = { ole: 'sol', berra: 'sol', robban: 'sol', angerud: 'sol', majsan: 'sol', siv: 'sol', lasse: 'sol' };
