// Test fixture (owner none; Phase 0b): the 13 missions of DESIGN §8.1–8.13 transcribed literally
// (every stage literal, every line, every cue; source tags as in §8). The `fullstory` scenario
// (tools/scenarios/kinds.mjs) swaps these into MISSIONS at runtime and plays them, proving that
// the frozen stage kinds, the runner and game.cue accept the real mission data. WP-F/WP-G may copy
// from here; the shipped missions live in src/game/missions/{flight,island}.js.
// Where §8 offers a P1 stage with a P0 fallback (grisfest stage 10), the P1 stage is used.

import {
  getInCar, goto, pickup, dropoff, follow, rabbits, race, destroy, grab, scene,
  collect, sit, interact, carry, mantra, timeline, haggle, smash,
} from '../../src/game/missions/kinds/index.js';

export const FULL_MISSIONS = [
  // ===== §8.1 · 0 · gate =====================================================================
  {
    id: 'gate', title: 'Jag kan flyga, jag är inte rädd', level: 'flight', giver: 'ole', at: 'gateQueue', reward: 200,
    intro: [
      ['stig', 'Vad ska de göra?'],                                        // [F]
      ['ole', 'Rutinekontroll. Narkotika, våpen, bomber…'],                  // [F*](t)
      ['stig', 'Bomber…?!', { fear: 10 }],                                  // [F]
      ['ole', 'Du ser nervøs ut, du. Første gang du flyr?'],                 // [N]
      ['stig', 'Jag kan flyga, jag är inte rädd.'],                          // [F]
    ],
    stages: [
      () => interact({ at: 'gateArch', radius: 1.4, prompt: '<b>E</b> Gå genom metallbågen', text: 'Gå genom säkerhetskontrollen', startCue: { phase: ['gate', { instant: true }] }, useCue: { sfx: 'beep', fear: 12, flash: 'rgba(255,60,40,.35)' }, lines: [
        ['kontrollant', 'Vill ni vara vänlig och ta av er skon.', { anim: { who: 'stig', flag: 'shoeOff', secs: 2 }, sfx: 'laugh' }],   // [F]
        ['berra', 'Kolla terroristen!'],                                                                                             // [F](t)
      ] }),
      () => goto({ to: 'gateOle', radius: 2.5, text: 'Sätt dig vid gate 8', startCue: { place: { ole: ['gateOle', 0, 0] } } }),
      () => scene({ frame: ['ole', 'stig'], lines: [
        ['ole', 'Du vet vel at det er 50 prosent sjanse å overleve en flyulykke.', { fear: 8 }],   // [F]
        ['ole', 'Det er farligere å kjøre bil enn å fly.', { fear: 8 }],                          // [F]
        ['ole', 'Man regner mellom to og fem millioner flytimer pr. kræsj.', { fear: 8 }],        // [F]
        ['stig', 'Krasch?'],                                                                       // [F]
        ['ole', 'Kræsj.', { fear: 8 }],                                                            // [F]
        ['ole', 'Leste du om en sånn jumbopilot som gjorde en looping?', { fear: 8 }],             // [F]
        ['stig', 'Looping med en jumbo?'],                                                         // [F]
        ['ole', 'Ja. To ganger.', { fear: 8 }],                                                    // [F]
        ['stig', 'Det går väl inte? Kan du se till mitt handbagage ett tag, jag måste…'],          // [F]
      ] }),
      () => goto({ to: 'herrtoa', radius: 1.8, fearRate: 2, timer: 15, text: 'Till herrtoaletten – fort!', failText: 'Du hann inte fram…', radio: [['ole', 'To ganger, Stig-Helmer! Looping med en jumbo!', { gap: 3, fear: 4 }]] }),
      () => mantra({ at: 'herrtoa', radius: 2.2, secs: 3, text: 'Håll J: sträck ut armarna – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA' }),
      () => scene({ place: { berra: ['herrtoaDoor', 0, -1.5] }, frame: ['berra', 'stig'], lines: [
        ['berra', 'Hur mår du?'],                                                          // [F](t)
        ['stig', 'Bra.'],                                                                  // [F]
        ['stig', 'Jag håller på med yoga, avslappningsövningar. Isometrisk träning…'],     // [F]
        ['berra', 'Jaha… Ja, själv tar jag mig ett järn. Ska du ha?'],                      // [F]
        ['stig', 'Nej tack, jag tål inte starksprit.'],                                     // [F]
        ['berra', 'Nej, vem fan gör det?', { place: { berra: ['gateLounge', -1.2, 0] } }],  // [F]
      ] }),
      () => goto({ to: 'gateLounge', radius: 4, text: 'Ställ dig i kön till gate 8', radio: [['pa', 'Herr Stork ombedes kontakta informationen i avgångshallen.', { gap: 1, pa: true }]], overhear: [{ at: 'damtoaDoor', r: 8, lines: [
        ['siv', 'Du har väl med dig dom fyra p:na? Pass, pesetas, p-piller, piljetter.'],   // [F](t)
        ['majsan', 'Jag har piral.'],                                                     // [F](t)
        ['siv', 'Pass, pesetas, piral och piljetter!'],                                   // [F](t)
        ['majsan', '…och prit!'],                                                         // [F](t)
      ] }], awaitOverhear: true }),
      () => scene({ frame: ['berra', 'sulan'], lines: [
        ['robban', 'Han måste vara bror med Lennart Swahn.'],                                          // [F](t)
        ['berra', 'Och Karin Falk!'],                                                                  // [F](t)
        ['robban', 'Och Magnus Uggla!'],                                                               // [F](t)
        ['berra', 'Har du köpt vin?'],                                                                 // [F]
        ['sulan', 'Det är 80-procentig rom.'],                                                         // [F]
        ['sulan', 'Här ligger Pepes Bodega. Det står på skylten.'],                                    // [F]
        ['berra', 'De häller upp och allt är klart?'],                                                 // [F]
        ['sulan', 'Plomberat och klart.'],                                                             // [F]
        ['berra', 'Robban! Sulan har varit på Pepes Bodega. De häller 80-procentig rom på vinflaskor.'],   // [F]
        ['robban', 'Vad hette det, sa du?'],                                                           // [F]
        ['berra', 'Pepes Bodega.'],                                                                    // [F]
        ['robban', 'Glöm aldrig det, du.'],                                                            // [F]
      ] }),
      () => goto({ to: 'cabinDoor', radius: 2.0, text: 'Gå ombord – gate 8' }),
    ],
    outroPlace: { majsan: ['bridgeQueue1', 0, 0], siv: ['bridgeQueue2', 0, 0] },
    outro: [
      ['majsan', 'Nämen… hejsan!', { outfit: { who: 'stig', name: 'kostym' } }],                    // [F](t)
      ['stig', 'Jaså, vi kom på samma resa.'],                                                     // [F](t)
      ['siv', 'Jag dör! Såg du vad han stötte på dig? Han som såg ut som en giraff.'],               // [F]
    ],
  },

  // ===== §8.2 · 1 · ombord ===================================================================
  {
    id: 'ombord', title: 'Rad 13 finns inte', level: 'flight', giver: 'vardinna', at: 'cabinDoor', reward: 250,
    intro: [
      ['vardinna', 'God morgon och välkommen ombord!'],                         // [N]
      ['stig', 'Fjorton B… Efter rad tolv kommer väl rad tretton?'],             // [N]
      ['vardinna', 'Inte hos oss. Fjorton B ligger mitt i planet.'],             // [N]
      ['vardinna', 'Skynda dig – vi ska taxa ut.'],                               // [N]
    ],
    stages: [
      () => sit({ seat: '14B', timer: 25, text: 'Hitta plats 14B och sätt dig', failText: 'Planet kunde inte taxa ut. Kaptenen väntar på dig!', startCue: { phase: ['gate', { instant: true }], seatbelt: true, blockers: true }, doneCue: { blockers: false } }),
      () => timeline({ seat: '14B', lockSeat: true, panicFails: true, oleBarks: true, secs: 27, text: 'Starten! Håll J om det blir för mycket', barLabel: 'FLYGRÄDSLA', events: [
        [0, { phase: 'takeoff', toast: 'Håll <b>J</b>: Jag kan flyga, jag är inte rädd' }],
        [10, { sfx: 'thud', fear: 15, shake: 0.4, say: ['stig', 'Vad är det för ljud?'] }],                                                                   // [F]
        [11.5, { say: ['ole', 'Landingshjulene som går opp. Hydraulikk, vet du.'] }],                                                                        // [F]
        [14, { say: ['ole', 'De går opp sånn, og så lukker lemmene seg. Så flyet ikke skal stoppe, men få fart. Ellers…'] }],                                // [F]
        [17.5, { say: ['stig', 'Annars…?!'], fear: 5 }],                                                                                                     // [N]
        [21, { say: ['majsan', 'Titta, solen!'], applause: 2.5, relieve: 30, seatbelt: false }],                                                              // [F](t)
      ] }),
    ],
    outroCam: 'player',
    outro: [
      ['ole', 'Hva er det for et merke du har?'],                                                          // [F*]
      ['stig', 'Hammarby. Känner du till Hammarby?'],                                                      // [F]
      ['ole', 'Eneste svenske byene jeg kjenner til er Stockholm og Göteborg og Malmö.'],                  // [F]
      ['stig', 'Det här är ett fotbollslag.'],                                                             // [F]
      ['ole', 'Min drøm er å fly med Concorde fra Paris til Rio. 2 300 km i timen. Det er flyging!'],       // [F]
      ['ole', 'Tre ganger så fort som en geværkule.'],                                                     // [F]
      ['stig', 'Usch…'],                                                                                   // [F]
      ['ole', 'Og så Rio! Stranda, jentene og samba.'],                                                    // [F]
      ['stig', 'Kanarieöarna är inte så dumt heller.'],                                                    // [F](t)
      ['ole', 'Det får duge.'],                                                                            // [F*](t)
    ],
  },

  // ===== §8.3 · 2 · juice ====================================================================
  {
    id: 'juice', title: 'Mer juice', level: 'flight', giver: 'ole', at: 'cabinRow14', reward: 300,
    intro: [
      ['kapten', 'Mina damer och herrar, det är kapten. Vi flyger just nu ut över Atlanten.', { pa: true }],                          // [F]
      ['kapten', 'Vi beräknas landa om en timme och 35 minuter. Vädret i Las Palmas är bra – soldis och 22 grader varmt.'],           // [F]
      ['kapten', 'Jag kan även meddela att Stenmark ligger trea efter första åket.', { applause: 2 }],                               // [F]
      ['stig', 'Du, om man vill ha lite mer juice?'],                                                                                // [F]
      ['ole', 'Ja, da trykker du der oppe.'],                                                                                        // [F*]
    ],
    stages: [
      () => interact({ at: 'call14', whileSeated: true, seat: '14B', prompt: '<b>E</b> Tryck där uppe', text: 'Sätt dig på 14B och tryck på knappen ovanför', startCue: { phase: ['cruise', { instant: true }] }, useCue: { sfx: 'pling', anim: { who: 'stig', flag: 'cupUp', secs: 6 } }, lines: [
        ['ole', 'Nei…'],                                                              // [F*](t)
        ['stig', 'Där?'],                                                             // [F]
        ['ole', 'Ja.'],                                                               // [F]
        ['ole', 'Nei…!', { anim: { who: 'ole', flag: 'laugh', secs: 3 } }],             // [F*](t)
        ['ole', 'Så… så kommer flyvertinnen. Juice, whisky.'],                        // [F*]
        ['stig', 'Hon har visst fullt upp.'],                                         // [N]
      ] }),
      () => interact({ at: (g) => g.cabin.trolleyEnd(g), radius: 1.3, enabled: (g) => g.cabin.trolleyStopped, prompt: '<b>E</b> Ta en juice', text: 'Hämta juicen vid serveringsvagnen – men akta tårna!', checkpoint: true, startCue: { trolley: true },
        timedCues: [   // the row-6 complaints, as bubbles (one way to stage them with the frozen kinds)
          [6, { say: ['angerud', 'Kallar ni det här \'varm middag\'? Så ser det inte ut när jag flyger reguljärt.', 3] }],   // [F](t)
          [10, { say: ['angerud', 'Jag har inte fått resan gratis. Jag har betalat 3 000 för den.', 3] }],                   // [F](t)
        ] }),
      () => carry({ item: 'juice', to: 'cabinRow14', radius: 1.2, text: 'Bär juicen till 14B utan att spilla', failText: 'Du spillde juicen!', failOn: { bumped: true, sprintSecs: 1.0 }, startCue: { turbulence: [0.6, 5, { delay: 2 }] } }),
      () => sit({ seat: '14B', text: 'Sätt dig och njut av juicen', doneCue: { relieve: 30, sfx: 'pickup' } }),
    ],
    outro: [
      ['ole', 'Neste gang trykker du og venter, Stig-Helmer.'],   // [N]
      ['stig', 'Usch…'],                                          // [F*]
    ],
  },

  // ===== §8.4 · 3 · sprit ====================================================================
  {
    id: 'sprit', title: 'Medhavd sprit', level: 'flight', giver: 'vardinna', at: 'galleyBack', reward: 300, extra: [],
    intro: [
      ['vardinna', 'Tack. Det är förbjudet att dricka medhavd sprit.'],                                        // [F]
      ['vardinna', 'Tar du det inte lugnt med spriten, kan det bli problem att komma in i Spanien.'],           // [F]
      ['berra', 'Ta det vackert, vi har varit ute och flugit förr.'],                                          // [F]
      ['vardinna', 'Och resten av flaskorna rullar runt i hela planet.'],                                       // [N]
      ['stig', 'Jag tål inte starksprit.'],                                                                    // [F*]
      ['vardinna', 'Då är du rätt man.'],                                                                      // [N]
    ],
    stages: [
      () => collect({ kind: 'flaska', motion: 'roll', items: [{ x: 3000.2, z: 9.0 }, { x: 2999.8, z: 2.5 }, { x: 3000.3, z: -6.0 }, { x: 2999.7, z: -10.5 }, { x: 3000.0, z: -13.5 }], radius: 0.9, timer: 75, text: 'Fånga flaskorna som rullar i gången', barLabel: 'FLASKOR', failText: 'Flaskorna rullade in under sätena.', startCue: { phase: ['cruise', { instant: true }], trolley: true }, timedCues: [[8, { radio: ['pa', 'Herr Storch ombedes kontakta kabinpersonalen.'], pa: true }], [20, { turbulence: [0.5, 6] }]] }),
      () => goto({ to: 'galleyFront', radius: 1.6, text: 'Lämna flaskorna i främre byssan' }),
    ],
    outro: [
      ['berra', 'Ja, vad fan, man var ju nykter i morse, men nu börjar det ordna upp sig!'],   // [F*]
      ['stig', 'Är den bra den där?'],                                                        // [F]
      ['ole', 'Ja… Kvarts og digital. Level her, input, FM, tape, tape run.'],                 // [F]
      ['ole', 'Hører du? Samba.', { music: { tune: 'samba', secs: 6 } }],                      // [F]
      ['stig', 'Fin musik!'],                                                                 // [F](t)
      ['pax', 'Sch…'],                                                                        // [F](t)
    ],
  },

  // ===== §8.5 · 4 · landning =================================================================
  {
    id: 'landning', title: 'Inflygning Las Palmas', level: 'flight', giver: 'majsan', at: 'cabinRow16', reward: 400,
    intro: [
      ['siv', 'Pizza-racern, då? Han får fem poäng.'],                                                                       // [F*](t)
      ['majsan', 'Sex, tycker jag.'],                                                                                       // [F*](t)
      ['siv', 'Giraffen, då? Fyra.'],                                                                                       // [F*](t)
      ['majsan', 'Mindre än pizza-racern?'],                                                                                // [F*](t)
      ['siv', 'Han är så bortkommen. Det blir minuspoäng.'],                                                                // [F*](t)
      ['stig', '…Fyra?'],                                                                                                   // [N]
      ['kapten', 'Vi har påbörjat inflygningen mot Las Palmas. Var vänliga och fäst säkerhetsbältena.', { pa: true, seatbelt: true }],   // [N]
      ['vardinna', 'Alla ska sitta! Hjälp mig få folk på plats, är du snäll.'],                                              // [N]
    ],
    stages: [
      () => collect({ who: ['herrStorch', 'jose', 'berra'], standAt: { herrStorch: [3000.2, 3.4], jose: [2999.8, -9.2], berra: [3000.0, -14.4] }, seatOnTouch: true, timer: 50, text: 'Få de stående passagerarna att sätta sig', barLabel: 'STÅENDE', failText: 'Värdinnan fick göra det själv.', lines: {
        herrStorch: [['herrStorch', 'Lite film.', { anim: { who: 'herrStorch', flag: 'film', secs: 2 } }]],   // [F*]
        jose: [['siv', 'Vad skönt att komma bort!'], ['jose', 'Jag ska inte bort, jag ska hem.']],            // [F*] · [F*]
        berra: [['berra', 'Ska vi inte landa snart?']],                                                    // [N]
      }, startCue: { phase: ['cruise', { instant: true }], trolley: false }, timedCues: [[12, { turbulence: [0.3, 4] }]] }),
      () => sit({ seat: '14B', timer: 20, text: 'Skylten lyser! Tillbaka till 14B', failText: 'Alla måste sitta vid landningen.' }),
      () => mantra({ seated: '14B', secs: 8, panicFails: true, text: 'Inflygning! Håll J – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA', startCue: { phase: ['approach', { hold: true }], turbulence: [0.7, 10] }, fillCue: { phase: 'landing' }, waitPhase: 'landed' }),
    ],
    outroCam: 'player',
    outro: [
      ['berra', 'Om de kraschar, kastar man tomater på piloterna då?', { applause: 3 }],   // [F*](t)
      ['robban', 'Nej, skärpning nu, Berra, annars får vi ena jävla problem här.'],      // [F]
      ['ole', 'Ser du, Stig-Helmer? Hydraulikk, vet du. Helt normalt!'],                 // [N]
    ],
  },

  // ===== §8.6 · 5 · buss17 ===================================================================
  {
    id: 'buss17', title: 'SunTrips buss nummer 17', level: 'island', giver: 'lasse', at: 'airport', reward: 500,
    extra: [['ole', 2.5, 1.0], ['siv', -3.0, 2.0], ['majsan', -3.8, 2.4], ['jose', 4.5, 3.0], ['mamma', 5.3, 3.0], ['robban', -1.5, 4.0], ['berra', -2.2, 4.4], ['affe', 3.5, -1.0]],
    intro: [
      ['robban', 'Invalido.', { anim: { who: 'berra', flag: 'slump', secs: 20 } }],   // [F]
      ['guardia', 'Gracias.'],                                                       // [F](t)
      ['mamma', '¡Josito! ¡Josito!'],                                                // [F]
      ['mamma', 'Inga svenskor!'],                                                   // [F]
      ['siv', 'Hälsa familjen.'],                                                    // [F]
      ['majsan', 'Och hönsen!'],                                                     // [F](t)
      ['lasse', 'Några problem?'],                                                   // [F](t)
      ['stig', 'Min väska har inte kommit.'],                                        // [F]
      ['lasse', 'Den dyker upp. Det gör de alltid.'],                                // [N]
      ['lasse', 'Affe, du får ta transfern.'],                                       // [F*]
      ['affe', 'Va fan, jag hade ju natturen i natt! Jag har haft två grisfester i veckan.'],   // [F*]
      ['lasse', 'Olsson! Du ser ut som en man med körkort.'],                        // [N]
      ['lasse', 'SunTrips buss nummer 17 står där borta!'],                          // [F]
    ],
    stages: [
      () => getInCar({ car: 'buss17', any: false, passenger: 'ole', riders: ['majsan', 'siv', 'fruStorch', 'herrStorch'], hideRiders: true, lockMeter: true, text: 'Hoppa in i SunTrips buss nummer 17' }),
      () => goto({ to: 'flamencoDrive', radius: 12, inCar: true, passenger: 'ole', stop: true, timer: 150, failText: 'Gästerna missade välkomstdrinken.', smooth: { label: 'ÅKSJUKA', failText: 'Någon blev åksjuk i bussen!' }, text: 'Kör gruppen till Hotell Flamenco – mjukt!', radio: [
        ['lasse', 'Hjärtligt välkomna till Nueva Estocolmo och SunTrip!', { gap: 4 }],                     // [F]
        ['lasse', 'Klockan är tre spansk tid – alltså en timme tidigare än svensk tid.', { gap: 9 }],      // [F]
        ['lasse', 'Ni bör inte dricka vattnet.', { gap: 8 }],                                              // [F]
        ['lasse', 'Grisfesten är på torsdag och kostar 800 pesetas. Några frågor?', { gap: 8 }],           // [F]
        ['fruStorch', 'Finns det svenskt kaffe på hotellet?', { gap: 3 }],                                // [F]
        ['lasse', 'Ja.', { gap: 2 }],                                                                     // [F]
        ['ole', 'Norsk, da?', { gap: 2 }],                                                                // [F]
        ['lasse', 'Ja.', { gap: 2 }],                                                                     // [F]
        ['siv', 'Majsan, en niopoängare!', { gap: 10 }],                                                  // [F]
        ['stig', 'Jag har lite anlag för åksjuka.', { gap: 10 }],                                          // [F](t)
        ['ole', 'Jeg har reisesyketabletter.', { gap: 2.5 }],                                             // [F](t)
        ['stig', 'Jättefint! Tack. Du kanske vill ha en Argotal av mig. Mot allergi…', { gap: 3 }],       // [F](t)
      ] }),
    ],
    outroPlace: { lasse: ['flamencoRecepcion', 1.5, 1.5], portier: ['flamencoRecepcion', 0, 0], ole: ['flamencoRecepcion', -1.5, 2.0], stig: ['flamencoRecepcion', 0, 3.0] },
    outro: [
      ['lasse', 'Det har dessvärre uppstått ett litet problem på grund av överbokning.'],                                   // [F](t)
      ['lasse', 'Olsson, Stig-Helmer… och Bramserud, Ole… Kan ni dela rum?'],                                                // [F](t)
      ['stig', 'Ja…'],                                                                                                       // [F]
      ['stig', 'Kallar ni det här för havsutsikt?', { cut: 'flamencoBalcony' }],                                              // [F](t)
      ['portier', 'Momento.', { anim: { who: 'portier', flag: 'mirror', secs: 3 } }],                                         // [F]
      ['ole', 'Litt lenger inn mot veggen. Snu den litt mer mot meg. Sånn ja… Kom og hør nå! Fin lyd.', { cut: null }],      // [F]
      ['ole', 'Du kan ikke gå sånn her nede! Den buksa og det slipset! … Shorts.'],                                           // [F]
      ['stig', 'Är den inte lite skrikig?'],                                                                                 // [F]
      ['ole', 'Du skal ha sterke farger, du som er mørk.', { outfit: { who: 'stig', name: 'hawaii' }, flash: 'white', sfx: 'helanGar' }],   // [F]
    ],
  },

  // ===== §8.7 · 6 · friskotek ================================================================
  {
    id: 'friskotek', title: 'Plocka kulor!', level: 'island', giver: 'lasse', at: 'friskotek', reward: 500,
    extra: [['affe', -4, -6], ['gabbe', 4, -6], ['ole', -1.5, 3], ['siv', -3, 4], ['majsan', -4, 4], ['fruStorch', 3, 4], ['herrStorch', 4, 4]],
    intro: [
      ['lasse', 'Välkommen till våran ö, sluta tänk på regn och snö!'],                                                       // [F]
      ['lasse', 'Vi befinner oss i höjd med Egypten och 500 mil hemifrån… som väl är.'],                                     // [F]
      ['lasse', 'Jag heter Lasse och har hand om SunTrips friskotek. Friskoteket börjar halv tio varje morgon.'],              // [F]
      ['lasse', 'Sträck upp höger hand, lägg vänster hand på hjärtat och säg efter mig: Jag lovar att bli en sundare och friskare människa under semestern.', { anim: { who: 'stig', flag: 'oath', secs: 4 } }],   // [F]
      ['stig', 'Jag lovar att bli en sundare och…'],                                                                          // [F*]
      ['siv', 'Gud, vad han är söt!'],                                                                                        // [F]
      ['lasse', 'Finns det en familjen Stork här?'],                                                                          // [F](t)
      ['fruStorch', 'Vi heter faktiskt Storch, inte Stork.'],                                                                 // [F]
      ['lasse', 'Till brudparet från Rutan och Nisse: Heja på och tappa inte orken, för om nio månader kommer storken.', { applause: 2 }],   // [F]
      ['lasse', 'Och nu – friskotek! Men vinden har tagit badbollarna!'],                                                     // [N]
    ],
    stages: [
      () => rabbits({ mesh: 'badboll', count: 6, near: 'friskotek', rMin: 6, rMax: 30, timer: 75, text: 'Plocka kulor! Plocka med höger… plocka med vänster!', barLabel: 'KULOR', gotText: 'Plocka med höger!', failText: 'Bollarna rullade ner till stranden.', radio: [['berra', 'Kolla storken!'], ['robban', 'Att de bara orkar, våra storkar…']] }),
      () => goto({ to: 'friskotek', radius: 5, text: 'Lämna bollarna till Lasse' }),
    ],
    outroPlace: { lasse: ['friskotek', 0, 1.5], angerud: ['friskotek', 2.5, 1.0] },
    outro: [
      ['lasse', 'Ni lufsar som troll!'],                                                          // [F*](t)
      ['berra', 'Fan… Herr Ober? De har inte öppnat än. Klockan är ju snart tio.'],                // [F]
      ['robban', 'Ska vi inte käka frukost först?'],                                              // [F]
      ['berra', 'Det gör vi här. Bacon och ägglikör.'],                                           // [F]
      ['angerud', 'Ska du ta och springa upp på rum 113 och hämta mina röka?'],                    // [F]
      ['lasse', 'Ja, du, det ingår inte i mina åtaganden.'],                                       // [F]
      ['angerud', 'Då skulle jag vilja prata med platschefen.'],                                   // [F]
      ['lasse', 'Tja, det är ju jag, det…'],                                                       // [F]
      ['angerud', 'Du vet att jag känner chefen för SunTrip?'],                                    // [F]
      ['lasse', 'Ja, det gör jag med. Hälsa från mig. Hä-pååre!'],                                 // [F]
      ['angerud', 'Det är sista gången jag åker med SunTrip!'],                                    // [F]
      ['lasse', 'Hajar i poolen? Delirium – ring kliniken.', { toast: 'Hajfenor <b>0/7</b> – sparka dem i poolerna!' }],   // [F*]
      ['ole', 'Bagen min revnet på bussen – dingsene mine er spredt over hele øya!', { toast: 'Oles prylar <b>0/7</b>' }],   // [N]
    ],
  },

  // ===== §8.8 · 7 · asnan ====================================================================
  {
    id: 'asnan', title: 'Caballo folklorístico', level: 'island', giver: 'ole', at: 'flamenco', reward: 600,
    intro: [
      ['stig', 'Det var julmat – i julklappen. Och väskan är borta.'],   // [F*]
      ['ole', 'Tenk ikke mer på det. Vi fikser en ny julegave.'],       // [F]
      ['stig', 'Undrar vad dalahäst heter på spanska.'],                 // [F]
      ['ole', 'Cabalho folkloristico…'],                                 // [F]
      ['ole', 'Det fikser vi. Vi fikser alt!'],                          // [F]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),
      () => pickup({ who: 'ole', name: 'Ole', at: 'flamencoDrive', hello: 'Til markedet!' }),
      () => goto({ to: 'marknad', radius: 9, inCar: true, passenger: 'ole', text: 'Till marknaden' }),
      () => haggle({ at: 'asnestand', who: 'souvenir', partner: 'ole', start: 500, steps: [400, 300, 200], zones: [0.30, 0.22, 0.15], speeds: [0.8, 1.1, 1.4], maxMiss: 3, pay: 200, text: 'Pruta! Tryck E när markören är i det gröna', barLabel: 'PRIS', failText: 'Säljaren stängde ståndet.', lines: {
        start: [['souvenir', 'Hallå där!'], ['ole', 'Hvor mye?'], ['souvenir', '500 pesetas.'], ['ole', 'To hundre?']],                                   // [F] · [F*](t) · [F] · [F*](t)
        hit: [
          [['ole', 'Jeg gir deg to hundre. Det er… 18 norske kroner.'], ['souvenir', '400 pesetas. Titta, den är jättelustig.']],                         // [F] · [F]
          [['ole', 'Så morsom er den ikke. To hundre.'], ['souvenir', '300 pesetas! Sista pris!']],                                                      // [F*] · [N]
          [['ole', 'To hundre er siste bud.']],                                                                                                         // [F]
        ],
        miss: [['souvenir', '¡No, no, no!']],                                                                                                           // [N]
        win: [['ole', 'Første, andre, tredje – to hundre pesetas!'], ['souvenir', 'Kör till.'], ['souvenir', 'Por favor.'], ['souvenir', 'Jävla smålänningar!']],   // [F*](t) · [F](t) · [F] · [F]
      } }),
      () => grab({ at: 'asnestand', mesh: 'asna', text: 'Ta åsnan' }),
      () => goto({ to: 'supermercado', radius: 8, inCar: true, passenger: 'ole', text: 'Leta knäckebröd – samma sort som i julklappen' }),
      () => grab({ at: 'supermercado', mesh: 'knacke', text: 'Ta ett SPORT-KNÄCKE-paket', say: ['stig', 'Det är ungefär så här stort.'] }),   // [F]
      () => scene({ frame: ['ole', 'stig'], lines: [['ole', 'Og så maler vi den rød.', { cut: 'ferreteria' }], ['stig', 'Och blommor där.', { cut: null }]], doneCue: { flash: 'rgba(216,50,30,.4)', toast: 'Åsnan är nu en dalahäst. Nästan.' } }),   // [F*](t) · [F](t)
      () => goto({ to: 'vikingbar', radius: 7, inCar: true, passenger: 'ole', timer: 80, fragile: { label: 'SKICK', failText: 'Färgen blev förstörd!' }, text: 'Kör försiktigt till Viking Bar – färgen är våt!' }),
      () => goto({ to: 'vikingbar', radius: 2.5, onFoot: true, text: 'Lämna paketet i baren' }),
    ],
    outroPlace: { carmencita: ['vikingbar', 0, 1.5], angerud: ['vikingbar', 2.5, 1.2] },
    outro: [
      ['stig', 'Ett paket till Viking Bar. Det är till en moster.'],                     // [N]
      ['carmencita', 'Jag lägger det bakom disken.', { toast: 'Senare samma dag…' }],      // [N]
      ['angerud', 'Buenas dias, lilla vikingen. Har paketet kommit?', { cut: 'vikingbar' }],   // [F]
      ['angerud', 'God jul, moster.'],                                                   // [F]
      ['angerud', 'Hur såg han som lämnade in det ut?'],                                 // [F]
      ['carmencita', 'Han var lång, mörkhårig… hade glasögon och mustasch.'],            // [F]
      ['angerud', 'Då är det grönt.', { cut: null }],                                    // [F]
    ],
  },

  // ===== §8.9 · 8 · bodega ===================================================================
  {
    id: 'bodega', title: 'Pepes Bodega', level: 'island', giver: 'berra', at: 'flamencoBar', reward: 700, unlock: 'grisbil',
    intro: [
      ['berra', 'Det är ju fan vad solen tar här nere, Robban.'],                                     // [F]
      ['berra', 'Ska vi ta Pepes Bodega i dag eller ska vi sola?'],                                    // [F]
      ['robban', 'Men va fan, vi kan väl ta det lite lugnt! Vi har ju semester!'],                     // [F]
      ['berra', 'Vi är på södra Gran Canaria och havet är där, va. Då måste bodegan ligga ditåt.'],    // [F]
      ['berra', 'Du, terroristen, du har ju bil. Kör oss!'],                                          // [N]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),
      () => pickup({ who: 'berra', name: 'Berra', at: 'flamencoBar', rider: 'robban', hello: 'Ditåt!' }),
      () => goto({ to: 'playa', radius: 14, inCar: true, passenger: 'berra', text: 'Bodegan ligger ditåt – mot havet!', radio: [['robban', 'Fan Berra, ja ä tösstig.'], ['berra', 'Fan Robban, du har ingen karaktär!']], doneCue: { radio: ['berra', 'Ingen bodega här. Då ligger den åt andra hållet.'] } }),
      () => goto({ to: 'vischan', radius: 14, inCar: true, passenger: 'berra', timer: 110, text: 'Leta inåt land', radio: [['berra', 'Det här är ju rena vischan. Vi måste ha kört för långt.'], ['robban', 'Fan, vad jag är törstig.']], overhear: [{ at: 'eslovVag', r: 25, radio: true, lines: [['berra', 'Heja Eslöv!'], ['robban', 'Herre jävlar!']] }] }),
      () => dropoff({ who: 'berra', at: 'vischan', riderOff: true, text: 'Stanna vid tomatfälten' }),
      () => scene({ frame: ['berra', 'stig'], lines: [['stig', 'Jag kör inte längre på grusvägen. Jag har anlag för åksjuka.'], ['berra', 'Jag går inte en meter till. Vi liftar.']], doneCue: { toast: 'En grisbil stannar…' } }),
      () => follow({ type: 'grisbil', carName: 'grisbilFollow', driver: 'grisbonde', riders: ['berra', 'robban'], hideRiders: true, start: { lane: [[0, 2], [1, 2]], t: 12 }, via: [[1, 2], [1, 1], [2, 1]], to: 'grisfestGate', maxDist: 70, cruise: 12, wobble: 0.12, text: 'Följ grisbilen – Berra och Robban har liftat!', radio: [['robban', 'Fan, de luktar.'], ['berra', 'Skit i det. Vi slipper gå.'], ['robban', 'Snacka om grisfest.']] }),
      () => getInCar({ missionCar: 'grisbilFollow', any: false, passenger: 'berra', rider: 'robban', text: 'Grisbonden lånar ut grisbilen – hoppa in!', say: ['grisbonde', 'Ta bilen, señor. Ställ den vid hotellet – jag hämtar den på torsdag.'] }),
      () => destroy({ type: 'guardia', carName: 'guardiaJeep', driver: 'guardia', spawn: { lane: [[3, 1], [3, 2]], t: 25 }, noExplode: true, timer: 60, lockMeter: true, barLabel: 'JEEPEN', text: 'Guardia Civil såg grisarna – stoppa jeepen innan den hämtar förstärkning!', failText: 'Jeepen hann fram till kasernen.' }),
      () => goto({ to: 'flamencoBack', radius: 10, inCar: true, passenger: 'berra', timer: 120, text: 'Kör hem grisarna till hotellet!', failText: 'Ni kom aldrig fram.' }),
    ],
    outroPlace: { berra: ['bodega', -1.6, -1.0, Math.PI], robban: ['bodega', 1.6, -1.0, Math.PI] },
    outro: [
      ['robban', 'Ja, herre jävlar, minns du Benidorm? Snacka om grisfest!', { cut: 'bodega' }],                                                         // [F]
      ['berra', 'Var jag med där? Hade jag kul?'],                                                                                                       // [F]
      ['berra', 'Pepes Bodega… Den måste ligga nånstans, Robban.', { cut: null }],                                                                       // [N]
      ['pax', 'Hytt två!', { cut: 'telefon', toast: 'Samtidigt har direktör Angerud öppnat sitt paket…' }],                                              // [F](t)
      ['levander', 'Detta är dr Levanders automatiska telefonsvarare. Solariet, flygrädslekliniken, bantningen och örtshopen är stängda över jul.'],      // [F]
      ['levander', 'Viktiga meddelanden kan lämnas till hotell Ambassadör i Åre.'],                                                                      // [F]
      ['levander', 'En målad åsna…? Idén med paketet var idiotisk redan från början.', { toast: 'Senare, i Åre…' }],                                     // [F]
      ['levander', 'Nu måste du få tillbaka pengarna. Snacka med honom. Han vill kanske ha hittelön. Gör nåt!'],                                         // [F]
      ['angerud', 'Man måste ha mycket svenska pengar med sig hit… om man säger.', { cut: 'flamencoPool', place: { angerud: ['flamencoPool', 1.2, 1.0] } }],   // [F]
      ['angerud', 'Men det är ju inte samma sak att hitta något som att stjäla.'],                                                                       // [F]
      ['angerud', 'För om man hittar något, så kan man få hittelön. Tänk på det.', { sfx: 'slap' }],                                                     // [F]
      ['stig', 'Aj! Det ska jag göra.'],                                                                                                                 // [F]
      ['siv', 'Vad konstig han var!'],                                                                                                                   // [F]
      ['majsan', 'Det är kombinationen av sol och…', { cut: null }],                                                                                     // [F]
    ],
  },

  // ===== §8.10 · 9 · ropavieja ===============================================================
  {
    id: 'ropavieja', title: 'Gamla kläder', level: 'island', giver: 'siv', at: 'flamencoPool', reward: 700, extra: ['majsan'],
    intro: [
      ['siv', 'Han heter José. Och han jobbar inte på pizzeria.'],             // [F*]
      ['majsan', 'Datatekniker.'],                                            // [F](t)
      ['siv', 'Äkta spansk restaurang. Klockan sju.'],                         // [F*]
      ['majsan', 'Ta pepparn. Om han blir närgången.'],                       // [F*]
      ['majsan', 'Stig-Helmer, kan inte du hålla ett öga på dem? Diskret.'],   // [N]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),
      () => follow({ type: 'hatch', color: 0x2a4fa8, carName: 'joseBil', driver: 'jose', passenger: 'siv', riders: ['mamma'], start: { lane: [[5, 3], [4, 3]], t: 12 }, via: [[4, 4], [3, 4]], to: 'grillpacoCurb', maxDist: 75, minDist: 14, minGrace: 2, minText: 'José såg dig! Håll avståndet.', cruise: 10, text: 'Följ José – men inte för nära!', radio: [['jose', 'Jag ska bjuda dig på ett ställe som inga turister kommer till.'], ['siv', 'Det låter ju trevligt.'], ['jose', 'Äkta spanska maten på en restaurang.']] }),
      () => goto({ to: 'plaza', radius: 4, onFoot: true, text: 'Parkera och spana diskret från fontänen' }),
    ],
    outroPlace: { jose: ['grillpaco', 0, 0], siv: ['grillpaco', 1.2, 0], mamma: ['grillpacoMamma', 0, 0] },
    outroCam: ['jose', 'siv'],
    outro: [
      ['jose', 'Kanarisk specialitet! Ropa vieja – gamla kläder.'],                                                                                       // [F]
      ['siv', 'Vad sa du?'],                                                                                                                             // [F]
      ['jose', 'Gamla kläder. Det är ungefär som pyttipanna.'],                                                                                          // [F]
      ['jose', 'Är det säkert att det inte gör nåt att mamma följde med?', { cut: 'grillpacoMamma' }],                                                  // [F]
      ['siv', 'Vill hon inte sitta här?'],                                                                                                               // [F]
      ['jose', 'Nej, hon vill inte vara i vägen.', { cut: null }],                                                                                       // [F]
      ['siv', 'Jag fick användning för din peppar.', { toast: 'Dagen efter, vid poolen…', place: { siv: ['flamencoPool', 2, 0], majsan: ['flamencoPool', -2, 0] }, cut: 'flamencoPool' }],   // [F]
      ['siv', 'Han kom och hämtade mig. Gissa vem han hade med sig… Morsan!'],                                                                           // [F]
      ['siv', 'Jag ska satsa på Ole nu. Jag har inga fördomar mot norrmän.'],                                                                            // [F]
      ['majsan', 'Nej, bara de inte går på tur…', { cut: null }],                                                                                        // [F]
    ],
  },

  // ===== §8.11 · 10 · fataga (P1, cut first) =================================================
  {
    id: 'fataga', title: 'En skock får', level: 'island', giver: 'majsan', at: 'flamencoPool', reward: 800, extra: ['siv'],
    intro: [
      ['stig', 'Om du köper en brödrost, och det står \'Kontrollerad av G17\', så är det jag.'],   // [F]
      ['majsan', 'Själv brukar jag säga att jag går på gatan.'],                                   // [F*]
      ['majsan', 'Gillar du fotboll också?'],                                                      // [F](t)
      ['majsan', 'Du, vill du smörja in mig på ryggen?'],                                          // [F](t)
      ['majsan', 'Ta inte för mycket, då kan det börja koka.'],                                    // [F](t)
      ['siv', 'Lasses utflyktsbuss till Fataga har redan gått! Ta bilen, Giraffen!'],              // [N]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),
      () => pickup({ who: 'majsan', name: 'Majsan', at: 'flamencoDrive', rider: 'siv', hello: 'Kör!' }),
      () => follow({ type: 'bus', carName: 'utflyktsbuss', driver: 'affe', start: { lane: [[3, 2], [3, 1]], t: 14 }, via: [[3, 1], [2, 1], [1, 1]], to: 'fatagaBus', maxDist: 70, cruise: 12, text: 'Följ utflyktsbussen till Fataga', radio: [['lasse', 'Fataga är en av de få ursprungliga byar som finns kvar på Gran Canaria.'], ['lasse', 'Om ni vill köpa deras broderade dukar, så pruta inte. Prutning och sånt kan ni hålla på med på marknaden.']] }),
      () => scene({ place: { fruStorch: ['fataga', -2, 2], mamma: ['fatagaDukar', 0, 0], siv: ['fataga', 2, 2], majsan: ['fataga', 1, 3] }, frame: ['mamma', 'fruStorch'], lines: [['fruStorch', 'Stackars människor som lever så här.'], ['mamma', 'Stackars människor. Släpas runt på dagarna som en skock får…!'], ['mamma', '¡Las ovejas!', { sfx: 'baa' }]] }),
      () => rabbits({ mesh: 'faar', count: 6, near: 'fataga', rMin: 10, rMax: 35, timer: 80, text: 'Fånga fåren åt Josés pappa', barLabel: 'FÅR', gotText: 'Bäää!', failText: 'Fåren sprang hela vägen till Maspalomas.' }),
      () => goto({ to: 'fatagaFold', radius: 4, text: 'Tillbaka till fårfållan' }),
    ],
    outroPlace: { pappa: ['fatagaFold', 1.5, 0], mamma: ['fatagaDukar', 0, 0], siv: ['fatagaDukar', 2, 1.5], majsan: ['fatagaDukar', 3, 1.5] },
    outro: [
      ['pappa', '¡Gracias, señor!'],                                  // [N]
      ['mamma', 'Det är hon som vill ta min Josito ifrån mig.'],      // [F]
      ['majsan', 'Ska du inte köpa dukar av svärmor?'],               // [F](t)
    ],
  },

  // ===== §8.12 · 11 · grisfest ===============================================================
  {
    id: 'grisfest', title: 'Grisfesten', level: 'island', giver: 'ole', at: 'flamenco', reward: 1000, cost: 800,
    intro: [
      ['ole', 'Skal du ha B-vitaminer? Bra for leveren. Grisefest, vet du. Ta to.'],                    // [F]
      ['ole', 'Og jeg har C-vitaminer… jerntabletter, ginseng, tannkrem…?'],                            // [F*]
      ['ole', 'Du, de er fine de rødhårete. Vi skulle ha satt inn et støt der.'],                       // [F]
      ['ole', 'Vi kan be resepsjonen sette en blomster på rommet deres.'],                              // [F*](t)
      ['ole', 'Blomster? … Meloner? Agurker? Bananer?'],                                                // [F]
      ['stig', 'Men blommor… Gör man så i Norge?'],                                                     // [F](t)
      ['ole', 'Blomsterspråket er internasjonalt.'],                                                    // [F]
      ['ole', 'Fikser du ikke damer på grisefesten, da er det slutt. I kveld setter vi inn støtet!'],    // [F]
    ],
    stages: [
      () => rabbits({ mesh: 'blomma', flee: false, count: 5, near: 'flamenco', rMin: 8, rMax: 40, timer: 70, text: 'Plocka blomster till Siv och Maj-Britt', barLabel: 'BLOMSTER', gotText: 'Blomster!', failText: 'Blommorna vissnade.', radio: [['ole', 'Man må skifte vannet hver fjerde time og gi dem en hodepinetablett.']] }),
      () => getInCar({ text: 'Hoppa in i en bil – det börjar skymma', startCue: { sky: 'night', music: 'vals' } }),
      () => race({ who: 'gabbe', type: 'bus', carName: 'nattbuss', cruise: 17, playerPassenger: 'ole', start: { lane: [[3, 3], [3, 2]], t: 14 }, checkpoints: [[3, 2], [4, 2], [4, 1], [3, 1]], finish: { x: -80, z: -200 }, text: 'Bussen till grisfesten går nu – kom först!', radio: [['gabbe', 'Grisfestbussen går nu – sista man bjuder på sangrian!']], checkpoint: true }),
      () => smash({ type: 'tallrikar', area: { lm: 'dansgolv', r: 22 }, count: 10, timer: 40, lockMeter: true, onFoot: true, text: 'Porslinskross! Krossa tallrikarna medan bandet spelar', barLabel: 'TALLRIKAR', failText: 'Bandet slutade spela.', radio: [['pax', 'Vad skickliga de är!']], checkpoint: true, retryAt: 'dansgolv' }),
      () => scene({ place: { majsan: ['dansgolv', 1, 0], siv: ['dansgolv', 2.5, 0.5], ole: ['dansgolv', -1.5, 0.5] }, frame: ['majsan', 'stig'], checkpoint: true, retryAt: 'dansgolv', lines: [
        ['ole', 'Neida, det er bare å spørre: Skal vi danse! Eller kjør litt større: Sånn! … Voulez-vous danse avec moi? Fransk.', { outfit: { who: 'ole', name: 'gris' } }],   // [F]
        ['stig', 'Jag är skraj att de ska nobba.'],                                                              // [F]
        ['majsan', 'Vill du dansa med mig?'],                                                                    // [F]
        ['stig', 'Får jag lov…', { anim: { who: ['stig', 'majsan'], flag: 'dance', secs: 6 } }],                  // [F](t)
        ['siv', 'Nu blev hon uppbjuden.'],                                                                       // [F](t)
        ['ole', 'Heia Norge!', { anim: { who: 'ole', flag: 'dance', secs: 4 }, applause: 2 }],                    // [F]
        ['siv', 'Majsan, ta med dig giraffen så går vi på Tonga Tonga.'],                                        // [F]
      ] }),
      () => goto({ to: 'tongatonga', radius: 10, inCar: true, timer: 120, text: 'Till Tonga Tonga!' }),
      () => scene({ place: { ole: ['tongatonga', -2, 1], majsan: ['tongatonga', 1, 1], siv: ['tongatonga', 2, 1], robban: ['tongatonga', 0, 3], berra: ['tongaLot', 0, 0] }, anim: { berra: 'slump' }, lines: [['ole', 'Samba er fine greier!', { music: 'samba' }], ['robban', 'Kan du hjälpa mig bära hem Berra?'], ['stig', 'Vilket snack! "Bärra hem Berra!"']] }),   // [F] ×3
      () => pickup({ who: 'berra', name: 'Berra', at: 'tongaLot', rider: 'robban', hello: '…zzz' }),
      () => goto({ to: 'flamencoDrive', radius: 10, inCar: true, passenger: 'berra', text: 'Kör hem till Hotell Flamenco' }),
      () => carry({ who: 'berra', to: 'flamencoRecepcion', radius: 2.2, walkSpeed: 3.2, failOn: { fall: true }, text: 'Bärra hem Berra!', failText: 'Berra vaknade och började sjunga.' }),
    ],
    onEnd(g, reason) {
      if (reason === 'complete') g.cue({ banner: ['MORGONEN EFTER', 'Julafton på Gran Canaria', 'mission'] });   // [N]
      g.cue({ sky: 'day', music: 'sol' });
    },
    outroPlace: { portier: ['flamencoRecepcion', 0, 0], angerud: ['flamencoRecepcion', -1.6, 1.2], carmencita: ['flamencoRecepcion', -2.4, 1.2], majsan: ['flamencoPool', 0, 0], stig: ['flamencoRecepcion', 1.5, 3.0] },
    outro: [
      ['portier', 'Det är förbjudet att ta med damer på rummet. Men för 500 pesetas kanske vi kommer överens.'],                          // [F]
      ['angerud', '500 pesetas…? Det här är ju min fru.'],                                                                              // [F]
      ['portier', 'Det tror jag inte.'],                                                                                                // [F]
      ['angerud', 'En cigarrett, älskling?'],                                                                                           // [F](t)
      ['carmencita', 'Nej tack. Jag röker inte.'],                                                                                      // [F](t)
      ['portier', 'Jaså, din fru…?'],                                                                                                   // [F](t)
      ['angerud', 'Måtte djävulen ta alla fruntimmer!', { cut: 'flamencoBalcony' }],                                                    // [F]
      ['majsan', 'Vad härligt det är med de här varma nätterna. Snart ska man hem till slasket igen. Jag vill inte åka hem.', { cut: 'flamencoPool' }],   // [F*]
      ['majsan', 'Jag gruvar mig lite för flygresan.'],                                                                                 // [F*]
      ['stig', 'Jag kan flyga, jag är inte rädd.', { anim: { who: 'stig', flag: 'wings', secs: 3 } }],                                   // [F*]
      ['majsan', 'Nu skulle Levander se oss!'],                                                                                         // [F*]
      ['majsan', 'Du… gillar du bruna bönor?'],                                                                                         // [F*](t)
      ['stig', 'Jag avskyr bruna bönor.', { cut: null }],                                                                               // [F*](t)
    ],
  },

  // ===== §8.13 · 12 · julafton ===============================================================
  {
    id: 'julafton', title: 'Julafton bland palmerna', level: 'island', giver: 'ole', at: 'flamencoPatio', reward: 2000, cost: 100, unlock: 'bodega',
    intro: [
      ['ole', 'Morn, gutten min!'],                                                                                       // [F](t)
      ['stig', 'Morrn morrn.'],                                                                                           // [F](t)
      ['ole', 'Feliz navidad.'],                                                                                          // [F](t)
      ['stig', 'Vad sa du?'],                                                                                             // [F](t)
      ['ole', 'Det betyr \'god jul\' på spansk.'],                                                                        // [F*](t)
      ['stig', 'Javisst, det är julafton i dag.', { sfx: 'knock', place: { hittegods: ['flamencoPatio', 1.5, 2.0] } }],   // [F](t)
      ['hittegods', 'Hammarby…?'],                                                                                        // [F]
      ['stig', 'Ja!', { toast: 'Väskan är tillbaka!' }],                                                                  // [F]
      ['hittegods', 'Hittelön.', { coins: -25 }],                                                                         // [F](t)
      ['stig', 'Tack så mycket.'],                                                                                        // [F](t)
      ['lasse', 'Alla är välkomna på julfesten. Men man måste ha julmat och en julklapp för 100 pesetas.', { pa: true }],  // [F*]
      ['ole', 'Da tar jeg med sild og Stig-Helmer.'],                                                                     // [F*]
      ['stig', 'Norsk humor.'],                                                                                           // [F](t)
    ],
    stages: [
      () => collect({ who: ['herrStorch', 'fruStorch', 'berra', 'majsan'], findAt: { herrStorch: ['playa', 0, 0], fruStorch: ['kyrka', 0, 2], berra: ['bodega', -2.0, 0.5], majsan: ['marknad', 1, 1] }, sendTo: { herrStorch: ['flamencoPool', 4, 2], fruStorch: ['flamencoPool', 5, 2], berra: ['flamencoBar', 0, 0], majsan: ['flamencoPool', -2, 0] }, inCar: true, radius: 1.6, carRadius: 4.0, timer: 200, text: 'Samla ihop gästerna till julfesten', barLabel: 'GÄSTER', failText: 'Julfesten började utan dem.', lines: {
        herrStorch: [['stig', 'Herr Storch! Julfesten!'], ['herrStorch', 'Jag ska bara filma lite till.']],           // [N] · [N]
        fruStorch: [['stig', 'Fru Stork, julfesten börjar!'], ['fruStorch', 'Vi heter faktiskt Storch, inte Stork.']],   // [N] · [F*]
        berra: [['stig', 'Berra! Julfesten!'], ['berra', 'Jag kommer, jag ska bara kolla en grej.']],                   // [N] · [N]
        majsan: [['majsan', 'Titta inte! Det är en hemlighet.']],                                                     // [N]
      } }),
      () => goto({ to: 'flamencoPool', radius: 8, text: 'Till julfesten vid poolen!', startCue: { music: 'jul', outfit: { who: 'lasse', name: 'jul' } } }),
      () => scene({ place: { lasse: ['flamencoPool', 0, 3], ole: ['flamencoPool', -1.5, 1], herrStorch: ['flamencoPool', 3, 2], fruStorch: ['flamencoPool', 4, 2], majsan: ['flamencoPool', -2.5, 0.5], siv: ['flamencoPool', -3.5, 1], berra: ['flamencoPool', 5, -1], robban: ['flamencoPool', 6, -1] }, lines: [
        ['lasse', 'Hej tomtegubbar, slå i glasen… Skål och god jul!', { music: 'hejTomtegubbar', applause: 2 }],      // [F](t)
        ['ole', 'Ta av lokket! Objektivlokket. Må ta av det, vet du.'],                                              // [F]
        ['ole', 'Har du filmet sånn lenge?'],                                                                       // [F]
        ['herrStorch', 'Hela veckan.'],                                                                             // [F]
        ['ole', 'Det var synd. Det blir ikke noe film da.'],                                                        // [F]
        ['herrStorch', 'Blir\'e inge film?'],                                                                       // [F]
        ['majsan', 'Jag har köpt en julklapp till dig.', { anim: { who: 'stig', flag: 'giraffe', secs: 6 } }],        // [F*]
        ['stig', 'Precis en sån har jag önskat mig.'],                                                              // [F](t)
        ['berra', 'Robban! Jag hittade Pepes Bodega!'],                                                             // [F]
        ['robban', 'Det var som fan! Var låg det?'],                                                                // [F]
        ['berra', 'Det ligger på baksidan av hotellet.', { cut: 'bodega' }],                                        // [F]
        ['robban', 'Och vi som har letat igenom hela jävla Nueva Estocolmo!', { cut: null }],                        // [F]
        ['pax', 'De där svenskarna är heltokiga!', { music: 'smaGrodorna' }],                                       // [F](t)
        ['stig', 'Julmaten från väskan… och knäckebrödet.', { anim: { who: 'stig', flag: 'butterKnife', secs: 3 } }],   // [N]
        ['ole', 'Hva i all verden…', { sparkle: true, sfx: 'pryl' }],                                               // [N]
        ['stig', 'Femtio… tusen… kronor. I knäckebrödet.'],                                                         // [N]
        ['ole', 'Femti tusen… Rio, Stig-Helmer! Stranda, jentene og samba!'],                                       // [F*]
      ] }),
      () => scene({ cam: { at: 'rum113', dist: 6, height: 3 }, place: { angerud: ['rum113', 0, 0.8], stadare: ['rum113', -1.5, 1.6], saljare: ['rum113', 1.5, 1.6], mamma: ['rum113', -2.5, 2.4], pappa: ['rum113', -3.2, 2.4], carmencita: ['rum113', 2.5, 2.4], jose: ['rum113', 3.2, 2.4], siv: ['rum113', 0, 3.2] }, lines: [
        ['stadare', 'Limpio!'],                                                                                                 // [F]
        ['saljare', 'Jag var tvungen att sälja tomten i morse. De skrev på.'],                                                  // [F]
        ['mamma', 'Ni har dragit skam över vår familj!'],                                                                       // [F](t)
        ['carmencita', 'Det är inte han. Den andre!'],                                                                          // [F](t)
        ['mamma', 'Så gammal! Du skickar mig i graven!'],                                                                       // [F](t)
        ['stadare', 'God jul! Hoppsan. Stör jag?'],                                                                             // [F]
        ['siv', 'Gösta, ska du inte med på julfesten?'],                                                                        // [F]
        ['angerud', 'Ut! Ut!', { sfx: 'doorSlam', flash: 'white', hide: ['angerud'] }],                                          // [F]
        ['pa', '…', { sfx: 'ambulance', toast: 'En ambulans hämtade direktör Angerud. Han kommer att bli bra igen.' }],          // [N]
      ] }),
      () => mantra({ duet: 'majsan', at: 'flamencoPool', radius: 4, secs: 4, text: 'Visa Majsan övningen – håll J', barLabel: 'JAG KAN FLYGA', startCue: { sky: 'sunset', place: { majsan: ['flamencoPool', 1.2, 0] }, say: ['majsan', 'Visa mig igen. Inför hemresan.'] } }),   // [N] ×2
    ],
    outro: [
      ['stig', 'Jag kan flyga, jag är inte rädd.', { anim: { who: ['stig', 'majsan'], flag: 'wings', secs: 6 } }],   // [F]
      ['majsan', 'Jag kan flyga, jag är inte rädd.'],                                                              // [F*]
      ['ole', 'Og så Rio!', { endCard: true }],                                                                    // [F*]
    ],
  },
];
