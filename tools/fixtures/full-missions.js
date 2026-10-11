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
import { homeTimer } from '../../src/game/missions/island.js';
import { lm } from '../../src/world/layout.js';

export const FULL_MISSIONS = [
  // ===== §8.1 · 0 · gate =====================================================================
  {
    id: 'gate', title: 'Jag kan flyga, jag är inte rädd', level: 'flight', giver: 'ole', at: 'gateQueue', reward: 200,   // title [F*]
    intro: [
      ['stig', 'Vad ska de göra?', { place: { ole: ['gateQueue', 0, 1.2, -Math.PI / 2], stig: ['gateQueue', 0, -0.2, Math.PI / 2] }, cut: { at: 'queueCam', dist: 0, height: 2.0 } }],   // [F](t)
      ['ole', 'Rutinekontroll. Narkotika, våpen, bomber…'],                  // [F*](t)
      ['stig', 'Bomber…?!', { fear: 10 }],                                  // [F]
      ['ole', 'Du ser nervøs ut, du. Første gang du flyr?'],                 // [N]
      ['stig', 'Jag kan flyga, jag är inte rädd.'],                          // [F]
    ],
    stages: [
      () => interact({ at: 'gateArch', radius: 1.4, prompt: '<b>E</b> Gå genom metallbågen', text: 'Gå genom säkerhetskontrollen', startCue: { phase: ['gate', { instant: true }], place: { berra: ['gateArch', -0.4, -2.8] } }, useCue: { sfx: 'beep', fear: 12, flash: 'rgba(255,60,40,.35)' }, lines: [
        ['kontrollant', 'Vill ni vara vänlig och ta av er skon.', { anim: { who: 'stig', flag: 'shoeOff', secs: 2 }, sfx: 'laugh' }],   // [F]
        ['berra', 'Kolla terroristen!'],                                                                                             // [F](t)
      ] }),
      () => goto({ to: 'gateOle', radius: 2.5, text: 'Gå till Ole vid gate 8', startCue: { place: { ole: ['gateOle', 0, 0] } } }),
      () => scene({ checkpoint: true, retryAt: 'gateOle', retryFear: true, frame: ['ole', 'stig'], place: { stig: ['gateOle', -2.0, 0.2, -1.47] }, cam: { at: 'statsCam', dist: 0, height: 1.9 }, lines: [
        ['ole', 'Du vet vel at det er 50 prosent sjanse å overleve en flyulykke.', { fear: 8 }],   // [F]
        ['ole', 'Det er farligere å kjøre bil enn å fly.', { fear: 8 }],                          // [F]
        ['ole', 'Man regner mellom to og fem millioner flytimer pr. kræsj.', { fear: 8 }],        // [F]
        ['stig', 'Krasch?'],                                                                       // [F]
        ['ole', 'Kræsj.', { fear: 8 }],                                                            // [F*]
        ['ole', 'Leste du om en sånn jumbopilot som gjorde en looping?', { fear: 8 }],             // [F]
        ['stig', 'Looping med en jumbo?'],                                                         // [F]
        ['ole', 'Ja. To ganger.', { fear: 8 }],                                                    // [F]
        ['stig', 'Det går väl inte? Kan du se till mitt handbagage ett tag, jag måste…'],          // [F]
      ] }),
      () => goto({ to: 'herrtoa', radius: 1.8, fearRate: 5, timer: 6, text: 'Till herrtoaletten – fort!', failText: 'Du hann inte fram…', radio: [['ole', 'To ganger, Stig-Helmer! Looping med en jumbo!', { gap: 3, fear: 4 }]] }),
      () => mantra({ at: 'herrtoa', radius: 2.2, secs: 3, text: 'Håll J: sträck ut armarna – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA' }),
      () => scene({ place: { berra: ['herrtoaDoor', 0, 2.2, 1.25], stig: ['herrtoa', 0, 0, -1.9] }, frame: ['berra', 'stig'], doneCue: { place: { berra: ['gateLounge', -1.2, 0] } }, lines: [
        ['berra', 'Hur mår du?'],                                                          // [F](t)
        ['stig', 'Bra.'],                                                                  // [F]
        ['stig', 'Jag håller på med yoga, avslappningsövningar. Isometrisk träning…'],     // [F]
        ['berra', 'Jaha… Ja, själv tar jag mig ett järn. Ska du ha?'],                      // [F]
        ['stig', 'Nej tack, jag tål inte starksprit.'],                                     // [F]
        ['berra', 'Nej, vem fan gör det?'],                                                 // [F]
      ] }),
      () => goto({ to: 'gateLounge', radius: 4, text: 'Ställ dig i kön till gate 8', radio: [['pa', 'Herr Stork ombedes kontakta informationen i avgångshallen.', { gap: 1, pa: true }]], overhear: [{ at: 'damtoaDoor', r: 8, lines: [
        ['siv', 'Du har väl med dig dom fyra p:na? Pass, pesetas, p-piller, piljetter.'],   // [F](t)
        ['majsan', 'Jag har piral.'],                                                     // [F](t)
        ['siv', 'Pass, pesetas, piral och piljetter!'],                                   // [F](t)
        ['majsan', '…och prit!'],                                                         // [F](t)
      ] }], awaitOverhear: true }),
      () => scene({ frame: ['berra', 'sulan'], place: { berra: ['gateLounge', -0.8, 0.6, 2.0], robban: ['gateLounge', 0.3, 1.1, 2.66], sulan: ['gateLounge', 1.4, 0.5, -2.6], stig: ['gateLounge', 2.3, 1.2, -1.77] }, cam: { at: 'loungeCam', dist: 0, height: 1.9 }, lines: [
        ['robban', 'Han måste vara bror med Lennart Swahn.'],                                          // [F](t)
        ['berra', 'Och Karin Falk!'],                                                                  // [F](t)
        ['robban', 'Och Magnus Uggla!'],                                                               // [F](t)
        ['berra', 'Har du köpt vin?'],                                                                 // [F]
        ['sulan', 'Det är 80-procentig rom.'],                                                         // [F]
        ['sulan', 'Här ligger Pepes Bodega. Det står på skylten.'],                                    // [F]
        ['berra', 'De häller upp och allt är klart?'],                                                 // [F]
        ['sulan', 'Plomberat och klart.'],                                                             // [F]
        ['berra', 'Robban! Sulan har varit på Pepes Bodega. De häller 80-procentig rom på vinflaskor.'],   // [F*]
        ['robban', 'Vad hette det, sa du?'],                                                           // [F]
        ['berra', 'Pepes Bodega.'],                                                                    // [F]
        ['robban', 'Glöm aldrig det, du.'],                                                            // [F]
      ] }),
      () => goto({ to: 'cabinDoor', radius: 2.0, text: 'Gå ombord – gate 8' }),
    ],
    outroPlace: { majsan: ['bridge', 0.55, 1.4, -2.79], siv: ['bridge', -0.15, 0.2, -1.04], stig: ['bridge', -0.55, 1.4, -0.35] },
    outroCam: { at: 'bridgeCam', dist: 0, height: 1.9 },
    outro: [
      ['majsan', 'Nämen… hejsan!', { outfit: { who: 'stig', name: 'kostym' } }],                    // [F](t)
      ['stig', 'Jaså, vi kom på samma resa.'],                                                     // [F](t)
      ['siv', 'Jag dör! Såg du vad han stötte på dig? Han som såg ut som en giraff.'],               // [F]
    ],
  },

  // ===== §8.2 · 1 · ombord ===================================================================
  {
    id: 'ombord', title: 'Rad 13 finns inte', level: 'flight', giver: 'vardinna', at: 'cabinDoor', reward: 250,   // title [N]
    intro: [
      ['vardinna', 'God morgon och välkommen ombord!', { place: { vardinna: ['cabinDoor', -0.8, -0.15, 3.49], stig: ['cabinDoor', -0.8, 1.15, -0.35] }, cut: { at: 'doorCam', dist: 0, height: 2.0 } }],   // [N]
      ['stig', 'Fjorton B… Efter rad tolv kommer väl rad tretton?'],             // [N]
      ['vardinna', 'Inte hos oss. Fjorton B ligger mitt i planet.'],             // [N]
      ['vardinna', 'Skynda dig – vi ska taxa ut.'],                               // [N]
    ],
    stages: [
      () => sit({ seat: '14B', timer: 7, text: 'Hitta plats 14B och sätt dig', failText: 'Planet kunde inte taxa ut. Kaptenen väntar på dig!', startCue: { phase: ['gate', { instant: true }], seatbelt: true, blockers: true }, doneCue: { blockers: false } }),
      () => timeline({ checkpoint: true, retryAt: 'cabinRow14', seat: '14B', lockSeat: true, panicFails: true, oleBarks: true, secs: 27, text: 'Starten! Håll J om det blir för mycket', barLabel: 'STARTEN', events: [
        [0, { phase: 'takeoff', toast: 'Håll <b>J</b>: Jag kan flyga, jag är inte rädd' }],
        [10, { sfx: 'thud', fear: 20, shake: 0.4, say: ['stig', 'Vad är det för ljud?', 1.5] }],                                                              // [F](t)
        [11.5, { say: ['ole', 'Landingshjulene som går opp. Hydraulikk, vet du.', 2.4] }],                                                                   // [F](t)
        [14, { say: ['ole', 'De går opp sånn, og så lukker lemmene seg. Så flyet ikke skal stoppe, men få fart. Ellers…', 3.4] }],                           // [F*](t)
        [17.5, { say: ['stig', 'Annars…?!'], fear: 8 }],                                                                                                     // [N]
        [21, { say: ['majsan', 'Titta, solen!'], applause: 2.5, relieve: 30, seatbelt: false }],                                                              // [F](t)
      ] }),
    ],
    outroCam: 'player',
    outro: [
      ['ole', 'Hva er det for et merke du har?'],                                                          // [F*](t)
      ['stig', 'Hammarby. Känner du till Hammarby?'],                                                      // [F]
      ['ole', 'Eneste svenske byene jeg kjenner til er Stockholm og Göteborg og Malmö.'],                  // [F](t)
      ['stig', 'Det här är ett fotbollslag.'],                                                             // [F]
      ['ole', 'Min drøm er å fly med Concorde fra Paris til Rio. 2 300 km i timen. Det er flyging!'],       // [F](t)
      ['ole', 'Tre ganger så fort som en geværkule.'],                                                     // [F](t)
      ['stig', 'Usch…'],                                                                                   // [F](t)
      ['ole', 'Og så Rio! Stranda, jentene og samba.'],                                                    // [F](t)
      ['stig', 'Kanarieöarna är inte så dumt heller.'],                                                    // [F](t)
      ['ole', 'Det får duge.'],                                                                            // [F*](t)
    ],
  },

  // ===== §8.3 · 2 · juice ====================================================================
  {
    id: 'juice', title: 'Mer juice', level: 'flight', giver: 'ole', at: 'cabinRow14', reward: 300,   // title [F*]
    intro: [
      ['kapten', 'Mina damer och herrar, det är kapten. Vi flyger just nu ut över Atlanten.', { pa: true }],                          // [F]
      ['kapten', 'Vi beräknas landa om en timme och 35 minuter. Vädret i Las Palmas är bra – soldis och 22 grader varmt.'],           // [F]
      ['kapten', 'Jag kan även meddela att Stenmark ligger trea efter första åket.', { applause: 2 }],                               // [F]
      ['stig', 'Du, om man vill ha lite mer juice?'],                                                                                // [F]
      ['ole', 'Ja, da trykker du der oppe.'],                                                                                        // [F*]
    ],
    stages: [
      () => interact({ at: 'call14', whileSeated: true, seat: '14B', prompt: '<b>E</b> Tryck där uppe', text: 'Sätt dig på 14B och tryck på knappen ovanför', startCue: { phase: ['cruise', { instant: true }] }, useCue: { sfx: 'pling' }, lines: [
        ['ole', 'Nei…'],                                                              // [F*](t)
        ['stig', 'Där?'],                                                             // [F]
        ['ole', 'Ja.', { anim: { who: 'stig', flag: 'cupHeld', secs: 6 } }],             // [F]
        ['ole', 'Nei…!', { anim: { who: 'ole', flag: 'laugh', secs: 3 } }],             // [F*](t)
        ['ole', 'Så… så kommer flyvertinnen. Juice, whisky.'],                        // [F*]
        ['stig', 'Hon har visst fullt upp.'],                                         // [N]
      ] }),
      () => interact({ at: (g) => g.cabin.trolleyEnd(g), radius: 1.3, enabled: (g) => g.cabin.trolleyStopped, prompt: '<b>E</b> Ta en juice', text: 'Hämta juicen vid serveringsvagnen – men akta tårna!', checkpoint: true, startCue: { trolley: true },
        timedCues: [   // the row-6 complaints, as bubbles (one way to stage them with the frozen kinds)
          [6, { say: ['angerud', 'Kallar ni det här \'varm middag\'? Så ser det inte ut när jag flyger reguljärt.', 3] }],   // [F](t)
          [10, { say: ['angerud', 'Jag har inte fått resan gratis. Jag har betalat 3 000 för den.', 3] }],                   // [F](t)
        ] }),
      () => carry({ item: 'juice', to: 'cabinRow14', radius: 1.2, text: 'Bär juicen till 14B – gå, spring inte!', failText: 'Du spillde juicen!', failOn: { bumped: true, sprintSecs: 1.0 }, startCue: { turbulence: [0.6, 5, { delay: 2 }] } }),
      () => sit({ seat: '14B', text: 'Sätt dig och njut av juicen', doneCue: { relieve: 30, sfx: 'pickup' } }),
    ],
    outro: [
      ['ole', 'Neste gang trykker du og venter, Stig-Helmer.'],   // [N]
      ['stig', 'Usch…'],                                          // [F*]
    ],
  },

  // ===== §8.4 · 3 · sprit ====================================================================
  {
    id: 'sprit', title: 'Medhavd sprit', level: 'flight', giver: 'vardinna', at: 'galleyBack', reward: 300, extra: [],   // title [F*]
    intro: [
      ['vardinna', 'Tack. Det är förbjudet att dricka medhavd sprit.'],                                        // [F]
      ['vardinna', 'Tar du det inte lugnt med spriten, kan det bli problem att komma in i Spanien.'],           // [F]
      ['berra', 'Ta det vackert, vi har varit ute och flugit förr.', { cut: { at: 'row22Cam', dist: 0, height: 3.6 } }],   // [F]
      ['vardinna', 'Och resten av flaskorna rullar runt i hela planet.', { cut: null }],                        // [N]
      ['stig', 'Jag tål inte starksprit.'],                                                                    // [F*]
      ['vardinna', 'Då är du rätt man.'],                                                                      // [N]
    ],
    stages: [
      () => collect({ kind: 'flaska', motion: 'roll', items: [{ x: 3000.2, z: 9.0 }, { x: 2999.8, z: 2.5 }, { x: 3000.3, z: -6.0 }, { x: 2999.7, z: -10.5 }, { x: 3000.0, z: -13.5 }], radius: 0.9, timer: 13, text: 'Fånga flaskorna som rullar i gången', barLabel: 'FLASKOR', failText: 'Flaskorna rullade in under sätena.', startCue: { phase: ['cruise', { instant: true }], trolley: true }, timedCues: [[1.5, { turbulence: [0.5, 3] }], [8, { radio: ['pa', 'Herr Storch ombedes kontakta kabinpersonalen.'], pa: true }]] }),
      () => goto({ to: 'galleyFront', radius: 1.6, text: 'Lämna flaskorna i främre byssan' }),
    ],
    outroPlace: { stig: ['cabinRow14', 0, 0] },
    outroCam: ['ole', 'stig'],
    outro: [
      ['berra', 'Ja, vad fan, man var ju nykter i morse, men nu börjar det ordna upp sig!', { cut: { at: 'row22Cam', dist: 0, height: 3.6 }, outfit: { who: 'ole', name: 'flygRadio' } }],   // [F*]
      ['stig', 'Är den bra den där?', { cut: null }],                                         // [F]
      ['ole', 'Ja… Kvarts og digital. Level her, input, FM, tape, tape run.'],                 // [F]
      ['ole', 'Hører du? Samba.', { music: { tune: 'samba', secs: 6 } }],                      // [F]
      ['stig', 'Fin musik!'],                                                                 // [F](t)
      ['pax', 'Sch…'],                                                                        // [F](t)
    ],
  },

  // ===== §8.5 · 4 · landning =================================================================
  {
    id: 'landning', title: 'Inflygning Las Palmas', level: 'flight', giver: 'majsan', at: 'cabinRow16', reward: 400,   // title [N]
    intro: [
      ['siv', 'Pizza-racern, då? Han får fem poäng.'],                                                                       // [F*](t)
      ['majsan', 'Sex, tycker jag.'],                                                                                       // [F*](t)
      ['siv', 'Giraffen, då? Fyra.'],                                                                                       // [F*](t)
      ['majsan', 'Mindre än pizza-racern?'],                                                                                // [F*](t)
      ['siv', 'Han är så bortkommen. Det blir minuspoäng.'],                                                                // [F*](t)
      ['stig', '…Fyra?'],                                                                                                   // [N]
      ['kapten', 'Vi har påbörjat inflygningen mot Las Palmas. Var vänliga och fäst säkerhetsbältena.', { pa: true, seatbelt: true }],   // [N]
      ['vardinna', 'Alla ska sitta! Hjälp mig få folk på plats, är du snäll.', { cut: { at: 'galleyCam', dist: 0, height: 3.6 }, trolley: 'park' }],   // [N]
    ],
    stages: [
      () => collect({ who: ['herrStorch', 'jose', 'berra'], standAt: { herrStorch: [3000.2, 3.4], jose: [2999.8, -9.2], berra: [3000.0, -14.4] }, seatOnTouch: true, timer: 12, text: 'Få de stående passagerarna att sätta sig', barLabel: 'STÅENDE', failText: 'Värdinnan fick göra det själv.', lines: {
        herrStorch: [['herrStorch', 'Lite film.', { anim: { who: 'herrStorch', flag: 'film', secs: 2 } }]],   // [F*](t)
        jose: [['siv', 'Vad skönt att komma bort!'], ['jose', 'Jag ska inte bort, jag ska hem.']],            // [F*] · [F*]
        berra: [['berra', 'Ska vi inte landa snart?']],                                                    // [N]
      }, startCue: { phase: ['cruise', { instant: true }], trolley: 'park', seatbelt: true } }),
      () => sit({ checkpoint: true, seat: '14B', timer: 5, text: 'Skylten lyser! Tillbaka till 14B', failText: 'Alla måste sitta vid landningen.', startCue: { seatbelt: true } }),
      () => mantra({ seated: '14B', secs: 8, panicFails: true, text: 'Inflygning! Håll J – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA', startCue: { phase: ['approach', { hold: true }], turbulence: [0.75, 14] }, fillCue: { phase: 'landing' }, waitPhase: 'landed' }),
    ],
    outroCam: 'player',
    outro: [
      ['berra', 'Om de kraschar, kastar man tomater på piloterna då?', { applause: 3, cut: { at: 'row22Cam', dist: 0, height: 3.6 } }],   // [F*](t)
      ['robban', 'Nej, skärpning nu, Berra, annars får vi ena jävla problem här.'],                  // [F]
      ['ole', 'Ser du, Stig-Helmer? Hydraulikk, vet du. Helt normalt!', { cut: null }],              // [N]
    ],
  },

  // ===== §8.6 · 5 · buss17 ===================================================================
  {
    id: 'buss17', title: 'SunTrips buss nummer 17', level: 'island', giver: 'lasse', at: 'airport', reward: 500,   // title [F*]
    extra: [['ole', 2.5, 1.0], ['siv', -3.0, 2.0], ['majsan', -3.8, 2.4], ['jose', 4.5, 3.0], ['mamma', 5.3, 3.0], ['robban', -1.5, 4.0], ['berra', -2.2, 4.4], ['affe', 3.5, -1.0]],
    idleAnim: { berra: 'slump' },   // asleep while the mission waits (§9.4); the intro cue keeps it
    intro: [
      ['robban', 'Invalido.', { anim: { who: 'berra', flag: 'slump', secs: 20 }, cut: { at: 'airport', dist: -10, height: 3.2 }, place: { lasse: ['airport', 0, 0, 5 * Math.PI / 4], stig: ['airport', 1.2, 0.8, 3 * Math.PI / 4], robban: ['airport', -1.5, 4.0, 2.75] } }],   // [F]
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
      ['lasse', 'SunTrips buss nummer 17 står där borta!'],                          // [F](t)
    ],
    stages: [
      () => getInCar({ car: 'buss17', atHome: true, any: false, passenger: 'ole', riders: ['majsan', 'siv', 'fruStorch', 'herrStorch'], hideRiders: true, lockMeter: true, text: 'Hoppa in i SunTrips buss nummer 17' }),
      () => goto({ to: 'flamencoDrive', radius: 12, inCar: true, passenger: 'ole', stop: true, timer: 54, failText: 'Gästerna missade välkomstdrinken.', smooth: { label: 'ÅKSJUKA', failText: 'Någon blev åksjuk i bussen!' }, text: 'Kör gruppen till Hotell Flamenco – mjukt!', radio: [
        ['lasse', 'Hjärtligt välkomna till Nueva Estocolmo och SunTrip!', { gap: 3 }],                  // [F]
        ['lasse', 'Klockan är tre spansk tid – alltså en timme tidigare än svensk tid.', { gap: 5 }],   // [F]
        ['lasse', 'Ni bör inte dricka vattnet.', { gap: 5.5 }],                                         // [F]
        ['lasse', 'Grisfesten är på torsdag och kostar 800 pesetas. Några frågor?', { gap: 3.5 }],      // [F]
        ['fruStorch', 'Finns det svenskt kaffe på hotellet?', { gap: 4 }],                              // [F]
        ['lasse', 'Ja.', { gap: 2 }],                                                                   // [F]
        ['ole', 'Norsk, da?', { gap: 1.5 }],                                                            // [F]
        ['lasse', 'Ja.', { gap: 1.5 }],                                                                 // [F]
        ['siv', 'Majsan, en niopoängare!', { gap: 3 }],                                                 // [F]
        ['stig', 'Jag har lite anlag för åksjuka.', { gap: 3 }],                                        // [F](t)
        ['ole', 'Jeg har reisesyketabletter.', { gap: 2.5 }],                                           // [F](t)
        ['stig', 'Jättefint! Tack. Du kanske vill ha en Argotal av mig. Mot allergi…', { gap: 2.5 }],   // [F](t)
      ] }),
    ],
    outroPlace: { lasse: ['flamencoRecepcion', 1.5, 1.5], portier: ['flamencoRecepcion', 0, 0], ole: ['flamencoRecepcion', -1.4, 4.4], stig: ['flamencoRecepcion', 0, 3.0] },
    outro: [
      ['lasse', 'Det har dessvärre uppstått ett litet problem på grund av överbokning.'],                                   // [F](t)
      ['lasse', 'Olsson, Stig-Helmer… och Bramserud, Ole… Kan ni dela rum?'],                                                // [F*](t)
      ['stig', 'Ja…'],                                                                                                       // [F]
      ['stig', 'Kallar ni det här för havsutsikt?', { cut: { at: 'rum107Cam', dist: 5.5, height: 2.1 }, place: { stig: ['flamencoPatio', 0, -2.4, 0], portier: ['flamencoPatio', 1.3, -1.2, -0.25], ole: ['flamencoPatio', -1.6, -3.6, 0.3] } }],   // [F](t)
      ['portier', 'Momento.', { anim: { who: 'portier', flag: 'mirror', secs: 3 } }],                                         // [F]
      ['ole', 'Litt lenger inn mot veggen. Snu den litt mer mot meg. Sånn ja… Kom og hør nå! Fin lyd.', { place: { portier: ['flamencoRecepcion', 0, 0] } }],   // [F]
      ['ole', 'Du kan ikke gå sånn her nede! Den buksa og det slipset! … Shorts.'],                                           // [F]
      ['stig', 'Är den inte lite skrikig?'],                                                                                 // [F]
      ['ole', 'Du skal ha sterke farger, du som er mørk.', { outfit: { who: 'stig', name: 'hawaii' }, flash: 'white', sfx: 'helanGar' }],   // [F]
    ],
  },

  // ===== §8.7 · 6 · friskotek ================================================================
  {
    id: 'friskotek', title: 'Plocka kulor!', level: 'island', giver: 'lasse', at: 'friskotek', reward: 500,   // title [F*]
    extra: [['affe', -4, -6], ['gabbe', 4, -6], ['ole', -1.5, 3], ['siv', -3, 4], ['majsan', -4, 4], ['fruStorch', 3, 4], ['herrStorch', 4, 4]],
    intro: [
      ['lasse', 'Välkommen till våran ö, sluta tänk på regn och snö!'],                                                       // [F]
      ['lasse', 'Vi befinner oss i höjd med Egypten och 500 mil hemifrån… som väl är.'],                                     // [F]
      ['lasse', 'Jag heter Lasse och har hand om SunTrips friskotek. Friskoteket börjar halv tio varje morgon.'],              // [F]
      ['lasse', 'Sträck upp höger hand, lägg vänster hand på hjärtat och säg efter mig: Jag lovar att bli en sundare och friskare människa under semestern.', { anim: { who: 'stig', flag: 'oath', secs: 4 } }],   // [F]
      ['stig', 'Jag lovar att bli en sundare och…'],                                                                          // [F*]
      ['siv', 'Gud, vad han är söt!', { cut: { at: 'friskotek', dist: 6, height: 2.4 }, place: { lasse: ['friskotek', 0, 1.5, Math.PI], stig: ['friskotek', -1.0, 2.6, 2.5], siv: ['friskotek', -2.3, 1.3, Math.PI], majsan: ['friskotek', -3.2, 1.6, Math.PI], fruStorch: ['friskotek', 1.7, 2.3, -2.6], herrStorch: ['friskotek', 2.6, 2.5, -2.6], ole: ['friskotek', 3.6, 2.0, -2.6] } }],   // [F]
      ['lasse', 'Finns det en familjen Stork här?'],                                                                          // [F](t)
      ['fruStorch', 'Vi heter faktiskt Storch, inte Stork.'],                                                                 // [F]
      ['lasse', 'Till brudparet från Rutan och Nisse: Heja på och tappa inte orken, för om nio månader kommer storken.', { applause: 2 }],   // [F](t)
      ['lasse', 'Och nu – friskotek! Men vinden har tagit badbollarna!'],                                                     // [N]
    ],
    stages: [
      () => rabbits({ mesh: 'badboll', count: 6, near: 'friskotek', rMin: 6, rMax: 30, timer: 23, text: 'Plocka kulor! Plocka med höger… plocka med vänster!', barLabel: 'KULOR', gotText: 'Plocka med höger!', failText: 'Bollarna rullade ner till stranden.', radio: [['berra', 'Kolla storken!'], ['robban', 'Att de bara orkar, våra storkar…']] }),
      () => goto({ to: 'friskotek', radius: 5, text: 'Lämna bollarna till Lasse' }),
    ],
    outroPlace: { lasse: ['friskotek', 0, 1.5, Math.PI], angerud: ['friskotek', 1.6, 2.4, -2.4], berra: ['friskotek', -2.4, 1.0, Math.PI], robban: ['friskotek', -3.4, 1.4, Math.PI], ole: ['friskotek', 2.8, 1.0, Math.PI], stig: ['friskotek', -1.0, 2.6, 2.5] },
    outroCam: { at: 'friskotek', dist: 6, height: 2.4 },
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
    id: 'asnan', title: 'Caballo folklorístico', level: 'island', giver: 'ole', at: 'flamenco', reward: 600,   // title [F*]
    intro: [
      ['stig', 'Det var julmat – i julklappen. Och väskan är borta.', { cut: { at: 'flamenco', dist: 6, height: 2.2 }, place: { ole: ['flamenco', 0.8, 0.4, 1.07], stig: ['flamenco', -0.8, 0.4, -1.07] } }],   // [F*]
      ['ole', 'Tenk ikke mer på det. Vi fikser en ny julegave.'],       // [F]
      ['stig', 'Undrar vad dalahäst heter på spanska.'],                 // [F]
      ['ole', 'Cabalho folkloristico…'],                                 // [F]
      ['ole', 'Det fikser vi. Vi fikser alt!'],                          // [F]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),
      () => pickup({ who: 'ole', name: 'Ole', at: 'flamencoDrive', hello: 'Til markedet!' }),
      () => goto({ to: 'marknad', radius: 9, inCar: true, passenger: 'ole', text: 'Till marknaden' }),
      () => haggle({ at: 'asnestand', who: 'souvenir', partner: 'ole', start: 500, steps: [400, 300, 200], zones: [0.30, 0.23, 0.17], speeds: [0.7, 0.95, 1.2], maxMiss: 3, pay: 200, text: 'Pruta! Tryck E när markören är i det gröna', barLabel: 'PRIS', failText: 'Säljaren stängde ståndet.', checkpoint: true, retryAt: 'asnestand', lines: {
        start: [['souvenir', 'Hallå där!'], ['ole', 'Hvor mye?'], ['souvenir', '500 pesetas.'], ['ole', 'To hundre?']],                                   // [F] · [F*](t) · [F] · [F*](t)
        hit: [
          [['ole', 'Jeg gir deg to hundre. Det er… 18 norske kroner.'], ['souvenir', '400 pesetas. Titta, den är jättelustig.']],                         // [F*] · [F]
          [['ole', 'Så morsom er den ikke. To hundre.'], ['souvenir', '300 pesetas! Sista pris!']],                                                      // [F*] · [N]
          [['ole', 'To hundre er siste bud.']],                                                                                                         // [F]
        ],
        miss: [['souvenir', '¡No, no, no!']],                                                                                                           // [N]
        win: [['ole', 'Første, andre, tredje – to hundre pesetas!'], ['souvenir', 'Kör till.'], ['souvenir', 'Por favor.'], ['souvenir', 'Jävla smålänningar!']],   // [F*](t) · [F](t) · [F](t) · [F]
      } }),
      () => grab({ at: 'asnestand', mesh: 'asna', text: 'Ta åsnan' }),
      () => goto({ to: 'supermercado', radius: 8, inCar: true, passenger: 'ole', text: 'Leta knäckebröd – samma sort som i julklappen' }),
      () => grab({ at: 'supermercado', mesh: 'knacke', text: 'Ta ett SPORT-KNÄCKE-paket', say: ['stig', 'Det är ungefär så här stort.'] }),   // [F](t)
      () => scene({ frame: ['ole', 'stig'], lines: [['ole', 'Og så maler vi den rød.', { cut: 'ferreteria' }], ['stig', 'Och blommor där.']], doneCue: { flash: 'rgba(216,50,30,.4)', toast: 'Åsnan är nu en dalahäst. Nästan.' } }),   // [F*](t) · [F](t)
      () => goto({ to: 'vikingbar', radius: 7, inCar: true, passenger: 'ole', timer: 19, fragile: { label: 'SKICK', failText: 'Färgen blev förstörd!' }, text: 'Kör försiktigt till Viking Bar – färgen är våt!', checkpoint: true, retryAt: 'supermercado', retryCar: { at: { ...lm('supermercado'), yaw: 0 }, passenger: 'ole' }, startCue: { hide: ['angerud'] } }),
      () => goto({ to: 'vikingbar', radius: 2.5, onFoot: true, text: 'Lämna paketet i baren' }),
    ],
    outroPlace: { carmencita: ['vikingbar', -0.8, 1.6, 0], stig: ['vikingbar', 0.9, 1.3, 1.75] },
    outroHide: ['angerud'],
    outroCam: { at: 'vikingbar', dist: 6.5, height: 3.4 },
    outro: [
      ['stig', 'Ett paket till Viking Bar. Det är till en moster.'],   // [N]
      ['carmencita', 'Jag lägger det bakom disken.', { toast: 'Senare samma dag…' }],      // [N]
      ['angerud', 'Buenas dias, lilla vikingen. Har paketet kommit?', { place: { stig: ['vikingbar', 4, -9, 0], angerud: ['vikingbar', 0.9, 1.3, 0] } }],   // [F]
      ['angerud', 'God jul, moster.'],                                                   // [F]
      ['angerud', 'Hur såg han som lämnade in det ut?'],                                 // [F]
      ['carmencita', 'Han var lång, mörkhårig… hade glasögon och mustasch.'],            // [F]
      ['angerud', 'Då är det grönt.'],                                                   // [F]
    ],
  },

  // ===== §8.9 · 8 · bodega ===================================================================
  {
    id: 'bodega', title: 'Pepes Bodega', level: 'island', giver: 'berra', at: 'flamencoBar', reward: 700, unlock: 'grisbil',   // title [F*]
    intro: [
      ['berra', 'Det är ju fan vad solen tar här nere, Robban.', { place: { robban: ['flamencoBar', 1.4, -1.0] } }],   // [F]
      ['berra', 'Ska vi ta Pepes Bodega i dag eller ska vi sola?'],                                    // [F]
      ['robban', 'Men va fan, vi kan väl ta det lite lugnt! Vi har ju semester!'],                     // [F]
      ['berra', 'Vi är på södra Gran Canaria och havet är där, va. Då måste bodegan ligga ditåt.'],    // [F]
      ['berra', 'Du, terroristen, du har ju bil. Kör oss!'],                                          // [N]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),
      () => pickup({ who: 'berra', name: 'Berra', at: 'flamencoBar', rider: 'robban', hello: 'Ditåt!' }),
      () => goto({ to: 'playa', radius: 14, inCar: true, passenger: 'berra', text: 'Bodegan ligger ditåt – mot havet!', radio: [['robban', 'Fan Berra, ja ä tösstig.'], ['berra', 'Fan Robban, du har ingen karaktär!']], doneCue: { radio: ['berra', 'Ingen bodega här. Då ligger den åt andra hållet.'] } }),
      () => goto({ to: 'vischan', radius: 14, inCar: true, passenger: 'berra', timer: 31, text: 'Leta inåt land', radio: [['berra', 'Det här är ju rena vischan. Vi måste ha kört för långt.'], ['robban', 'Fan, vad jag är törstig.']], overhear: [{ at: 'eslovVag', r: 40, radio: true, lines: [['berra', 'Heja Eslöv!'], ['robban', 'Herre jävlar!']] }], checkpoint: true, retryAt: 'playa', retryCar: { at: { x: 0, z: 236, yaw: 0 }, passenger: 'berra', rider: 'robban' } }),
      () => dropoff({ who: 'berra', at: 'vischan', riderOff: true, text: 'Stanna vid tomatfälten' }),
      () => scene({ place: { stig: ['vischan', 2.0, -4.4, 2.03], berra: ['vischan', -0.2, -4.3, -2.0], robban: ['vischan', -1.7, -5.3, -2.4] }, cam: { at: 'vischanCam', dist: 0, height: 1.9 }, lines: [['stig', 'Jag kör inte längre på grusvägen. Jag har anlag för åksjuka.'], ['berra', 'Jag går inte en meter till. Vi liftar.']], doneCue: { toast: 'En grisbil stannar…' } }),   // [N] · [F](t) · [N]
      () => follow({ type: 'grisbil', carName: 'grisbilFollow', driver: 'grisbonde', riders: ['berra', 'robban'], hideRiders: true, start: { lane: [[0, 2], [1, 2]], t: 12 }, via: [[1, 2], [1, 1], [2, 1]], to: 'grisfestGate', maxDist: 55, cruise: 15, wobble: 0.12, checkpoint: true, retryAt: 'vischan', retryCar: { at: { x: -234, z: -143, yaw: 0 } }, text: 'Följ grisbilen – Berra och Robban har liftat!', radio: [['robban', 'Fan, de luktar.'], ['berra', 'Skit i det. Vi slipper gå.', { gap: 4.5 }], ['robban', 'Snacka om grisfest.', { gap: 4.5 }]] }),
      () => getInCar({ missionCar: 'grisbilFollow', any: false, passenger: 'berra', rider: 'robban', text: 'Grisbonden lånar ut grisbilen – hoppa in!', say: ['grisbonde', 'Ta bilen, señor. Ställ den vid hotellet – jag hämtar den på torsdag.'] }),
      () => destroy({ type: 'guardia', carName: 'guardiaJeep', driver: 'guardia', spawn: { lane: [[3, 1], [3, 2]], t: 25 }, cruise: 20, damageScale: 4, playerDamageScale: 0.5, noExplode: true, timer: 41, lockMeter: true, barLabel: 'JEEPEN', text: 'Guardia Civil såg grisarna – stoppa jeepen innan den hämtar förstärkning!', failText: 'Jeepen hann fram till kasernen.', checkpoint: true, retryAt: 'grisfestGate', retryCar: { at: 'grisfestGate', type: 'grisbil', name: 'grisbilFollow', passenger: 'berra', rider: 'robban' } }),
      () => goto({ to: 'flamencoBack', radius: 10, inCar: true, passenger: 'berra', timer: (g, m) => homeTimer(m.data.wreck), text: 'Kör hem grisarna till hotellet!', failText: 'Ni kom aldrig fram.' }),
    ],
    outroPlace: { berra: ['bodega', -1.6, -1.0, Math.PI], robban: ['bodega', 1.6, -1.0, Math.PI], stig: ['bodega', -3.4, -1.4, Math.PI / 2] },
    outro: [
      ['robban', 'Ja, herre jävlar, minns du Benidorm? Snacka om grisfest!', { cut: 'bodega' }],                                                         // [F]
      ['berra', 'Var jag med där? Hade jag kul?'],                                                                                                       // [F]
      ['berra', 'Pepes Bodega… Den måste ligga nånstans, Robban.', { cut: null }],                                                                       // [N]
      ['telefonist', 'Hytt två!', { cut: 'telefon', place: { angerud: ['telefon', 0.6, 2.4] }, toast: 'Samtidigt har direktör Angerud öppnat sitt paket…' }],   // [F](t)
      ['levander', 'Detta är dr Levanders automatiska telefonsvarare. Solariet, flygrädslekliniken, bantningen och örtshopen är stängda över jul.'],      // [F]
      ['levander', 'Viktiga meddelanden kan lämnas till hotell Ambassadör i Åre.'],                                                                      // [F]
      ['levander', 'En målad åsna…? Idén med paketet var idiotisk redan från början.', { toast: 'Senare, i Åre…' }],                                     // [F]
      ['levander', 'Nu måste du få tillbaka pengarna. Snacka med honom. Han vill kanske ha hittelön. Gör nåt!'],                                         // [F]
      ['angerud', 'Man måste ha mycket svenska pengar med sig hit… om man säger.', { cut: 'flamencoPool', place: { angerud: ['flamencoPool', 1.2, 1.0, Math.PI / 2], stig: ['flamencoPool', -0.3, 0.8, -Math.PI / 2], siv: ['flamencoPool', 3.0, 0.2, 0], majsan: ['flamencoPool', -2.6, 0.2, 0] } }],   // [F]
      ['angerud', 'Men det är ju inte samma sak att hitta något som att stjäla.'],                                                                       // [F]
      ['angerud', 'För om man hittar något, så kan man få hittelön. Tänk på det.', { sfx: 'slap' }],                                                     // [F]
      ['stig', 'Aj! Det ska jag göra.'],                                                                                                                 // [F]
      ['siv', 'Vad konstig han var!'],                                                                                                                   // [F](t)
      ['majsan', 'Det är kombinationen av sol och…', { cut: null }],                                                                                     // [F](t)
    ],
  },

  // ===== §8.10 · 9 · ropavieja ===============================================================
  {
    id: 'ropavieja', title: 'Gamla kläder', level: 'island', giver: 'siv', at: 'flamencoPool', reward: 700, extra: ['majsan'],   // title [F*]
    intro: [
      ['siv', 'Han heter José. Och han jobbar inte på pizzeria.', { cut: { at: 'flamencoPool', dist: 5.5, height: 2.1 }, place: { siv: ['flamencoPool', 0.2, 0.5, Math.PI / 4], majsan: ['flamencoPool', 1.3, 1.1, Math.PI / 5], stig: ['flamencoPool', -1.3, 0.5, -Math.PI / 4] } }],   // [F*](t)
      ['majsan', 'Datatekniker.'],                                            // [F](t)
      ['siv', 'Äkta spansk restaurang. Klockan sju.'],                         // [F*](t)
      ['majsan', 'Ta pepparn. Om han blir närgången.'],                       // [F*]
      ['majsan', 'Stig-Helmer, kan inte du hålla ett öga på dem? Diskret.'],   // [N]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),
      () => follow({ type: 'hatch', color: 0x2a4fa8, carName: 'joseBil', driver: 'jose', passenger: 'siv', riders: ['mamma'], start: { lane: [[5, 3], [4, 3]], t: 12 }, via: [[4, 4], [3, 4]], to: 'grillpacoCurb', maxDist: 55, minDist: 14, minGrace: 2, minText: 'José såg dig! Håll avståndet.', cruise: 13, text: 'Följ José – men inte för nära!', radio: [['jose', 'Jag ska bjuda dig på ett ställe som inga turister kommer till.'], ['siv', 'Det låter ju trevligt.', { gap: 4.5 }], ['jose', 'Äkta spanska maten på en restaurang.', { gap: 4.5 }]] }),
      () => goto({ to: 'plaza', radius: 4, onFoot: true, text: 'Parkera och spana diskret från fontänen' }),
    ],
    outroPlace: { jose: ['grillpaco', 0, 0], siv: ['grillpaco', 1.2, 0], mamma: ['grillpacoMamma', 0, 0, Math.PI] },
    outroCam: ['jose', 'siv'],
    outro: [
      ['jose', 'Kanarisk specialitet! Ropa vieja – gamla kläder.'],                                                                                       // [F]
      ['siv', 'Vad sa du?'],                                                                                                                             // [F]
      ['jose', 'Gamla kläder. Det är ungefär som pyttipanna.'],                                                                                          // [F]
      ['jose', 'Är det säkert att det inte gör nåt att mamma följde med?', { cut: { at: 'grillpaco', dist: -7, height: 2.2 } }],                         // [F]
      ['siv', 'Vill hon inte sitta här?', { cut: null }],                                                                                                // [F]
      ['jose', 'Nej, hon vill inte vara i vägen.'],                                                                                                      // [F]
      ['siv', 'Jag fick användning för din peppar.', { toast: 'Dagen efter, vid poolen…', place: { siv: ['flamencoPool', 1.2, 0.6, Math.PI / 2], majsan: ['flamencoPool', -1.2, 0.6, -Math.PI / 2] }, cut: 'flamencoPool' }],   // [F]
      ['siv', 'Han kom och hämtade mig. Gissa vem han hade med sig… Morsan!'],                                                                           // [F]
      ['siv', 'Jag ska satsa på Ole nu. Jag har inga fördomar mot norrmän.'],                                                                            // [F]
      ['majsan', 'Nej, bara de inte går på tur…', { cut: null }],                                                                                        // [F](t)
    ],
  },

  // ===== §8.11 · 10 · fataga (P1, cut first) =================================================
  {
    id: 'fataga', title: 'En skock får', level: 'island', giver: 'majsan', at: 'flamencoPool', reward: 800, extra: ['siv'],   // title [F*]
    intro: [
      ['stig', 'Om du köper en brödrost, och det står \'Kontrollerad av G17\', så är det jag.', { cut: { at: 'flamencoPool', dist: 5.5, height: 2.1 }, place: { majsan: ['flamencoPool', 0.2, 0.5, Math.PI / 4], siv: ['flamencoPool', 1.3, 1.1, Math.PI / 5], stig: ['flamencoPool', -1.3, 0.5, -Math.PI / 4] } }],   // [F]
      ['majsan', 'Själv brukar jag säga att jag går på gatan.'],                                   // [F*]
      ['majsan', 'Gillar du fotboll också?'],                                                      // [F](t)
      ['majsan', 'Du, vill du smörja in mig på ryggen?'],                                          // [F](t)
      ['majsan', 'Ta inte för mycket, då kan det börja koka.'],                                    // [F](t)
      ['siv', 'Lasses utflyktsbuss till Fataga har redan gått! Ta bilen, Giraffen!'],              // [N]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),
      () => pickup({ who: 'majsan', name: 'Majsan', at: 'flamencoDrive', rider: 'siv', hello: 'Kör!' }),
      () => follow({ type: 'bus', carName: 'utflyktsbuss', driver: 'affe', start: { lane: [[3, 2], [3, 1]], t: 14 }, via: [[3, 1], [2, 1], [1, 1]], to: 'fatagaBus', maxDist: 55, cruise: 14, text: 'Följ utflyktsbussen till Fataga', radio: [['lasse', 'Fataga är en av de få ursprungliga byar som finns kvar på Gran Canaria.'], ['lasse', 'Om ni vill köpa deras broderade dukar, så pruta inte. Prutning och sånt kan ni hålla på med på marknaden.']] }),
      () => scene({ place: { mamma: ['fatagaDukar', 0, 0], fruStorch: ['fatagaDukar', -1.8, 2.2, Math.PI + 0.5], siv: ['fatagaDukar', 1.5, 2.4, Math.PI - 0.5], majsan: ['fatagaDukar', 2.9, 1.8, Math.PI - 0.8] }, cam: { at: 'dukarCam', dist: 7.5, height: 2.1 }, lines: [['fruStorch', 'Stackars människor som lever så här.'], ['mamma', 'Stackars människor. Släpas runt på dagarna som en skock får…!'], ['mamma', '¡Las ovejas!', { sfx: 'baa' }]] }),
      () => rabbits({ mesh: 'faar', count: 6, near: 'fataga', rMin: 10, rMax: 35, timer: 28, text: 'Fånga fåren åt Josés pappa', barLabel: 'FÅR', gotText: 'Bäää!', failText: 'Fåren sprang hela vägen till Maspalomas.', checkpoint: true, retryAt: { x: -240, z: -208.5, yaw: 0 } }),
      () => goto({ to: 'fatagaFold', radius: 4, text: 'Tillbaka till fårfållan' }),
    ],
    outroPlace: { pappa: ['fatagaFold', 1.5, 0], mamma: ['fatagaFold', -0.2, 0.4], majsan: ['fatagaFold', -1.5, 0.9], siv: ['fatagaFold', -2.5, 1.4], stig: ['fatagaFold', 2.6, 1.0, -1.3] },
    outroCam: { at: 'fatagaFold', dist: -7, height: 2.3 },
    outro: [
      ['pappa', '¡Gracias, señor!'],                                  // [N]
      ['mamma', 'Det är hon som vill ta min Josito ifrån mig.'],      // [F]
      ['majsan', 'Ska du inte köpa dukar av svärmor?'],               // [F](t)
    ],
  },

  // ===== §8.12 · 11 · grisfest ===============================================================
  {
    id: 'grisfest', title: 'Grisfesten', level: 'island', giver: 'ole', at: 'flamenco', reward: 1000, cost: 800,   // title [F*]
    intro: [
      ['ole', 'Skal du ha B-vitaminer? Bra for leveren. Grisefest, vet du. Ta to.', { cut: { at: 'flamenco', dist: 6, height: 2.2 }, place: { stig: ['flamenco', 0, 1.5, -1.07], ole: ['flamenco', 1.6, 1.4, 1.07] } }],   // [F]
      ['ole', 'Og jeg har C-vitaminer… jerntabletter, ginseng, tannkrem…?'],                            // [F*]
      ['ole', 'Du, de er fine de rødhårete. Vi skulle ha satt inn et støt der.'],                       // [F]
      ['ole', 'Vi kan be resepsjonen sette blomster på rommet deres.'],                                 // [F*](t)
      ['ole', 'Blomster? … Meloner? Agurker? Bananer?'],                                                // [F]
      ['stig', 'Men blommor… Gör man så i Norge?'],                                                     // [F](t)
      ['ole', 'Blomsterspråket er internasjonalt.'],                                                    // [F]
      ['ole', 'Fikser du ikke damer på grisefesten, da er det slutt. I kveld setter vi inn støtet!'],    // [F]
    ],
    stages: [
      () => rabbits({ mesh: 'blomma', flee: false, count: 5, near: 'flamenco', rMin: 8, rMax: 40, timer: 26, text: 'Plocka blomster till Siv och Maj-Britt', barLabel: 'BLOMSTER', gotText: 'Blomster!', failText: 'Blommorna vissnade.', radio: [['ole', 'Man må skifte vannet hver fjerde time og gi dem en hodepinetablett.']] }),
      () => getInCar({ car: 'hyrbil', any: false, atHome: true, text: 'Hoppa in i hyrbilen – det börjar skymma', startCue: { sky: 'sunset', music: 'vals' } }),
      () => race({ who: 'gabbe', type: 'bus', carName: 'nattbuss', cruise: 31, oppSpec: { maxSpeed: 35, accel: 12, steer: 0.9 }, playerPassenger: 'ole', start: { lane: [[3, 3], [4, 3]], t: 14 }, checkpoints: [[4, 3], [4, 2], [4, 1], [3, 1]], finish: { x: -80, z: -200 }, text: 'Bussen till grisfesten går nu – kom först!', radio: [['gabbe', 'Grisfestbussen går nu – sista man bjuder på sangrian!']], checkpoint: true, retryCar: { at: { lane: [[3, 3], [4, 3]], t: 14 } }, startCue: { sky: 'night' } }),
      () => smash({ type: 'tallrikar', area: { lm: 'dansgolv', r: 22 }, count: 10, timer: 33, lockMeter: true, onFoot: true, text: 'Porslinskross! Sparka sönder tallrikarna (J) medan bandet spelar', barLabel: 'TALLRIKAR', failText: 'Bandet slutade spela.', radio: [['pax', 'Vad skickliga de är!']], checkpoint: true, retryAt: 'dansgolv', retryCar: { at: { x: -86, z: -202.75, yaw: -Math.PI / 2 }, park: true } }),
      () => scene({ place: { majsan: ['dansgolv', 1.2, 1.6, -Math.PI / 2], siv: ['dansgolv', 2.8, 1.9, -Math.PI / 2], ole: ['dansgolv', -1.8, 1.9, Math.PI / 2], stig: ['dansgolv', -0.2, 1.6, Math.PI / 2] }, frame: ['majsan', 'stig'], checkpoint: true, retryAt: 'dansgolv', retryCar: { at: { x: -86, z: -202.75, yaw: -Math.PI / 2 }, park: true }, startCue: { outfit: { who: 'ole', name: 'gris' } }, lines: [
        ['ole', 'Neida, det er bare å spørre: Skal vi danse! Eller kjør litt større: Sånn! … Voulez-vous danse avec moi? Fransk.'],   // [F]
        ['stig', 'Jag är skraj att de ska nobba.'],                                                              // [F]
        ['majsan', 'Vill du dansa med mig?'],                                                                    // [F]
        ['stig', 'Får jag lov…', { anim: { who: ['stig', 'majsan'], flag: 'dance', secs: 6 } }],                  // [F](t)
        ['siv', 'Nu blev hon uppbjuden.'],                                                                       // [F](t)
        ['ole', 'Heia Norge!', { anim: { who: 'ole', flag: 'dance', secs: 4 }, applause: 2 }],                    // [F]
        ['siv', 'Majsan, ta med dig giraffen så går vi på Tonga Tonga.'],                                        // [F]
      ] }),
      () => goto({ to: 'tongatonga', radius: 10, inCar: true, timer: 19, text: 'Till Tonga Tonga!', checkpoint: true, retryAt: 'dansgolv', retryCar: { at: { x: -86, z: -202.75, yaw: -Math.PI / 2 }, park: true } }),
      () => scene({ place: { ole: ['tongatonga', -2.2, 3.2, 0], majsan: ['tongatonga', 2.0, 3.0, 0], siv: ['tongatonga', 3.0, 3.4, 0], robban: ['tongatonga', -0.8, 1.2, -Math.PI / 2], berra: ['tongaSlump', 0, 0], stig: ['tongatonga', 0.8, 1.2, Math.PI / 2] }, anim: { berra: 'slump' }, cam: { at: 'tongatonga', dist: 6, height: 2.6 }, lines: [['ole', 'Samba er fine greier!', { music: 'samba' }], ['robban', 'Kan du hjälpa mig bära hem Berra?'], ['stig', 'Vilket snack! "Bärra hem Berra!"']] }),   // [F] ×3
      () => pickup({ who: 'berra', name: 'Berra', at: 'tongaSlump', rider: 'robban', hello: '…zzz' }),
      () => goto({ to: 'flamencoDrive', radius: 10, inCar: true, passenger: 'berra', text: 'Kör hem till Hotell Flamenco' }),
      () => carry({ who: 'berra', to: 'flamencoRecepcion', radius: 2.2, walkSpeed: 3.2, failOn: { fall: true }, text: 'Bärra hem Berra!', failText: 'Berra vaknade och började sjunga.', checkpoint: true, retryAt: { x: -24, z: 16, yaw: -Math.PI / 2 } }),
    ],
    onEnd(g, reason) {
      if (reason === 'complete') g.cue({ banner: ['MORGONEN EFTER', 'Julafton på Gran Canaria', 'mission'] });   // [N]
      g.cue({ sky: 'day', music: g.levelTune() });
    },
    outroPlace: { portier: ['flamencoRecepcion', 0, 0, 0], angerud: ['flamencoRecepcion', -1.4, 1.4, Math.PI / 2], carmencita: ['flamencoRecepcion', -2.2, 1.6, Math.PI / 2], majsan: ['flamencoPool', 0, 0], stig: ['flamencoRecepcion', 1.6, 2.6, -Math.PI / 2] },
    outroCam: { at: 'recepcionCam', dist: 7.5, height: 2.0 },
    outro: [
      ['portier', 'Det är förbjudet att ta med damer på rummet. Men för 500 pesetas kanske vi kommer överens.'],                          // [F]
      ['angerud', '500 pesetas…? Det här är ju min fru.'],                                                                              // [F]
      ['portier', 'Det tror jag inte.'],                                                                                                // [F]
      ['angerud', 'En cigarrett, älskling?'],                                                                                           // [F](t)
      ['carmencita', 'Nej tack. Jag röker inte.'],                                                                                      // [F](t)
      ['portier', 'Jaså, din fru…?'],                                                                                                   // [F](t)
      ['angerud', 'Måtte djävulen ta alla fruntimmer!', { cut: 'flamencoBalcony', place: { angerud: ['flamencoBalcony', 0, 1.2, 0] } }],   // [F]
      ['majsan', 'Vad härligt det är med de här varma nätterna. Snart ska man hem till slasket igen. Jag vill inte åka hem.', { cut: 'flamencoPool', place: { majsan: ['flamencoPool', 0, 0, Math.PI / 2], stig: ['flamencoPool', -1.3, 0, -Math.PI / 2] }, hide: ['siv'] }],   // [F*](t)
      ['majsan', 'Jag gruvar mig lite för flygresan.'],                                                                                 // [F*]
      ['stig', 'Jag kan flyga, jag är inte rädd.', { anim: { who: 'stig', flag: 'wings', secs: 3 } }],                                   // [F*]
      ['majsan', 'Nu skulle Levander se oss!'],                                                                                         // [F*](t)
      ['majsan', 'Du… gillar du bruna bönor?'],                                                                                         // [F*](t)
      ['stig', 'Jag avskyr bruna bönor.', { cut: null }],                                                                               // [F*](t)
    ],
  },

  // ===== §8.13 · 12 · julafton ===============================================================
  {
    id: 'julafton', title: 'Julafton bland palmerna', level: 'island', giver: 'ole', at: 'flamencoPatio', reward: 2000, cost: 100, unlock: 'bodega',   // title [N]
    intro: [
      ['ole', 'Morn, gutten min!'],                                                                                       // [F](t)
      ['stig', 'Morrn morrn.'],                                                                                           // [F](t)
      ['ole', 'Feliz navidad.'],                                                                                          // [F](t)
      ['stig', 'Vad sa du?'],                                                                                             // [F](t)
      ['ole', 'Det betyr \'god jul\' på spansk.'],                                                                        // [F*](t)
      ['stig', 'Javisst, det är julafton i dag.', { sfx: 'knock', cut: { at: 'rum107Cam', dist: 7.5, height: 2.1 }, place: { ole: ['flamencoPatio', -1.5, 0.9, 0.6], stig: ['flamencoPatio', 0, 1.5, 1.3], hittegods: ['flamencoPatio', 1.5, 2.7, -1.6] } }],   // [F](t)
      ['hittegods', 'Hammarby…?'],                                                                                        // [F]
      ['stig', 'Ja!', { toast: 'Väskan är tillbaka!' }],                                                                  // [F]
      ['hittegods', 'Hittelön.', { coins: -25 }],                                                                         // [F](t)
      ['stig', 'Tack så mycket.'],                                                                                        // [F](t)
      ['lasse', 'Alla är välkomna på julfesten. Men man måste ha julmat och en julklapp för 100 pesetas.', { pa: true }],  // [F*](t)
      ['ole', 'Da tar jeg med sild og Stig-Helmer.'],                                                                     // [F*]
      ['stig', 'Norsk humor.'],                                                                                           // [F](t)
    ],
    stages: [
      () => collect({ who: ['herrStorch', 'fruStorch', 'berra', 'majsan'], findAt: { herrStorch: ['playa', 0, 0], fruStorch: ['kyrka', 0, 2], berra: ['bodega', -2.0, 0.5], majsan: ['marknad', 1, 1] }, sendTo: { herrStorch: ['flamencoPool', 4, 2], fruStorch: ['flamencoPool', 5, 2], berra: ['flamencoBar', 0, 0], majsan: ['flamencoPool', -2, 0] }, inCar: true, radius: 1.6, carRadius: 4.0, timer: 81, text: 'Samla ihop gästerna till julfesten – ta bilen!', barLabel: 'GÄSTER', failText: 'Julfesten började utan dem.', lines: {
        herrStorch: [['stig', 'Herr Storch! Julfesten!'], ['herrStorch', 'Jag ska bara filma lite till.']],           // [N] · [N]
        fruStorch: [['stig', 'Fru Stork, julfesten börjar!'], ['fruStorch', 'Vi heter faktiskt Storch, inte Stork.']],   // [N] · [F*]
        berra: [['stig', 'Berra! Julfesten!'], ['berra', 'Jag kommer, jag ska bara kolla en grej.']],                   // [N] · [N]
        majsan: [['majsan', 'Titta inte! Det är en hemlighet.']],                                                     // [N]
      } }),
      () => goto({ to: 'flamencoPool', radius: 8, text: 'Till julfesten vid poolen!', startCue: { music: 'jul', outfit: { who: 'lasse', name: 'jul' } } }),
      () => scene({ place: { lasse: ['flamencoPool', 0, 3], ole: ['flamencoPool', -1.5, 1], herrStorch: ['flamencoPool', 3, 2], fruStorch: ['flamencoPool', 4, 2], majsan: ['flamencoPool', -2.5, 0.5], siv: ['flamencoPool', -3.5, 1], berra: ['flamencoPool', 5, -1], robban: ['flamencoPool', 6, -1], portier: ['flamencoPool', -6, 0.5, -Math.PI / 4] }, lines: [
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
        ['portier', 'De där svenskarna är heltokiga!', { music: 'smaGrodorna' }],                                   // [F](t)
        ['stig', 'Julmaten från väskan… och knäckebrödet.', { anim: { who: 'stig', flag: 'butterKnife', secs: 3 } }],   // [N]
        ['ole', 'Hva i all verden…', { sparkle: true, sfx: 'pryl' }],                                               // [N]
        ['stig', 'Femtio… tusen… kronor. I knäckebrödet.'],                                                         // [N]
        ['ole', 'Femti tusen… Rio, Stig-Helmer! Stranda, jentene og samba!'],                                       // [F*]
      ] }),
      () => scene({ cam: { at: 'rum113', dist: 6, height: 3 }, place: { angerud: ['rum113', 0, 0.8], stadare: ['rum113', -1.5, 1.6], saljare: ['rum113', 1.5, 1.6], mamma: ['rum113', -2.5, 2.4], pappa: ['rum113', -3.2, 2.4], carmencita: ['rum113', 2.5, 2.4], jose: ['rum113', 3.2, 2.4], siv: ['rum113', 0.9, 3.0] }, lines: [
        ['stadare', 'Limpio!'],                                                                                                 // [F]
        ['saljare', 'Jag var tvungen att sälja tomten i morse. De skrev på.'],                                                  // [F]
        ['mamma', 'Ni har dragit skam över vår familj!'],                                                                       // [F](t)
        ['carmencita', 'Det är inte han. Den andre!'],                                                                          // [F](t)
        ['mamma', 'Så gammal! Du skickar mig i graven!'],                                                                       // [F](t)
        ['stadare', 'God jul! Hoppsan. Stör jag?'],                                                                             // [F]
        ['siv', 'Gösta, ska du inte med på julfesten?'],                                                                        // [F]
        ['angerud', 'Ut! Ut!', { sfx: 'doorSlam', flash: 'white', hide: ['angerud'] }],                                          // [F]
        ['siv', '…', { sfx: 'ambulance', toast: 'En ambulans hämtade direktör Angerud. Han kommer att bli bra igen.' }],         // [N]
      ] }),
      () => mantra({ duet: 'majsan', at: 'flamencoPool', radius: 4, secs: 4, text: 'Visa Majsan övningen – håll J', barLabel: 'JAG KAN FLYGA', startCue: { sky: 'sunset', place: { majsan: ['flamencoPool', 1.2, 0] }, say: ['majsan', 'Visa mig igen. Inför hemresan.'] } }),   // [N] ×2
    ],
    outroPlace: { majsan: ['flamencoPool', 0.9, 0.6, 0], stig: ['flamencoPool', -0.9, 0.6, 0], ole: ['flamencoPool', -2.6, 1.6, 0], siv: ['flamencoPool', 2.6, 1.6, 0] },
    outroCam: { at: 'flamencoPool', dist: 7, height: 2.4 },
    outro: [
      ['stig', 'Jag kan flyga, jag är inte rädd.', { anim: { who: ['stig', 'majsan'], flag: 'wings', secs: 6 } }],   // [F]
      ['majsan', 'Jag kan flyga, jag är inte rädd.'],                                                              // [F*]
      ['ole', 'Og så Rio!', { endCard: true }],                                                                    // [F*]
    ],
  },
];
