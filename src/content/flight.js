// Level 1 content: where everyone stands at the gate and sits on the plane, flight map labels,
// chatter and Ole's statistics barks, outfits. Owner: WP-F. Source tags per DESIGN §1.4.
//   Home entry: [landmark, dx, dz] (dx = metres to the landmark's left, dz = forward) |
//               { seat: '14A' } | null (hidden). Keys absent from a set are hidden.

export const HOMES_GATE = {
  ole: ['gateOle', 0, 0],
  majsan: null,                       // in the ladies' room
  siv: null,
  jose: ['gateLounge', 5.0, -1.0],
  berra: ['gateLounge', -1.2, 0],
  robban: ['gateLounge', 0.6, 0],
  sulan: ['gateLounge', 2.2, 0.4],
  angerud: ['gateDesk', 2.0, -2.0],
  herrStorch: ['gateLounge', -4.0, 2.0],
  fruStorch: ['gateLounge', -4.8, 2.0],
  kontrollant: ['gateArch', -1.8, 3.0],   // = local (30.0, 3.2): airside, beside the arch exit
  vardinna: ['cabinDoor', 0, 0],
};

export const HOMES_FLIGHT = {
  ole: { seat: '14A' },
  majsan: { seat: '16E' },
  siv: { seat: '16F' },
  jose: { seat: '16D' },
  berra: { seat: '22C' },
  robban: { seat: '22D' },
  sulan: null,
  angerud: { seat: '6C' },
  herrStorch: { seat: '10A' },
  fruStorch: { seat: '10B' },
  kontrollant: null,
  vardinna: ['galleyFront', 1.0, 0],      // = lx -1.2, lz 13.0: beside the aisle
};

// [label, landmark, { phase? }]: phase-limited labels only show in that cabin phase.
export const MAP_LABELS_FLIGHT = [
  ['Säkerhetskontroll', 'gateArch', { phase: 'gate' }],
  ['Gate 8', 'gateDesk', { phase: 'gate' }],
  ['Herrar', 'herrtoa', { phase: 'gate' }],
  ['Cockpit', 'cockpitDoor'],
  ['Främre byssan', 'galleyFront'],
  ['Rad 14', 'cabinRow14'],
  ['Bakre byssan', 'galleyBack'],
  ['Toaletter', 'toiletBackL'],
];

// Bubbles from seated cast members near the player. Every film line here is relocated: [F*].
export const CHATTER_FLIGHT = {
  ole: ['Hører du? Samba.' /* [F*] */, 'Kvarts og digital.' /* [F*] */],
  angerud: ['Kallar ni det här \'varm middag\'?' /* [F*](t) */, 'Det är sista gången jag åker med SunTrip!' /* [F*] */],
  berra: ['Ra-tara-tara…' /* [F*] */, 'Ta det vackert, vi har varit ute och flugit förr.' /* [F*] */],
  robban: ['Fan, vad jag är törstig.' /* [F*] */],
  siv: ['Bara de inte är ingenjörer.' /* [F*] */],
  majsan: ['De är säkert trevliga.' /* [F*](t) */],
  fruStorch: ['Vi heter faktiskt Storch, inte Stork.' /* [F*] */],
  herrStorch: ['Lite film.' /* [F*] */],
  jose: ['Jag ska inte bort, jag ska hem.' /* [F*] */],
  sulan: ['Plomberat och klart.' /* [F*] */],
  kontrollant: ['Nästa!' /* [N] */],
};

// Ole's statistics barks (cabin.tick, player within 4 m of Ole, every 25 s, fear +8).
export const OLE_STATS = [
  'Du vet vel at det er 50 prosent sjanse å overleve en flyulykke.',          // [F*]
  'Det er farligere å kjøre bil enn å fly.',                                   // [F*]
  'Man regner mellom to og fem millioner flytimer pr. kræsj.',                // [F*]
  'Leste du om en sånn jumbopilot som gjorde en looping? To ganger.',         // [F*]
  'Det her er bare luftlommer, Stig-Helmer. Helt normalt!',                   // [N]
  'Tre ganger så fort som en geværkule, Concorde!',                           // [F*]
];

export const LEVEL_OUTFITS_GATE = { stig: 'arlanda', ole: 'arlanda', berra: 'arlanda' };
export const LEVEL_OUTFITS_FLIGHT = { stig: 'kostym', ole: 'flyg', berra: 'flyg', robban: 'flyg', angerud: 'flyg', majsan: 'flyg', siv: 'flyg' };
