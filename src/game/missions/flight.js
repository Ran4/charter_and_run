// Level 1 missions, indices 0-4 (DESIGN §8.1-8.5). Owner: WP-F.
// Phase 0b placeholders: the final id, title, level, giver, at, reward; 1-2 intro/outro lines; and
// 1-4 stages that exercise each mission's main stage kind on the stub cabin. WP-F replaces them
// with the full §8 sheets (the stage literals below are taken from §8 so they already work).

import { goto, interact, mantra, sit, timeline, carry, collect } from './kinds/index.js';

export const FLIGHT_MISSIONS = [
  // ---- 0 · gate ------------------------------------------------------------------------------
  {
    id: 'gate', title: 'Jag kan flyga, jag är inte rädd', level: 'flight', giver: 'ole', at: 'gateQueue', reward: 200,
    intro: [
      ['stig', 'Vad ska de göra?'],                                     // [F]
      ['ole', 'Rutinekontroll. Narkotika, våpen, bomber…'],               // [F*](t)
    ],
    stages: [
      () => interact({
        at: 'gateArch', radius: 1.4, prompt: '<b>E</b> Gå genom metallbågen', text: 'Gå genom säkerhetskontrollen',   // [N]
        startCue: { phase: ['gate', { instant: true }] },
        useCue: { sfx: 'beep', fear: 12, flash: 'rgba(255,60,40,.35)' },
        lines: [
          ['kontrollant', 'Vill ni vara vänlig och ta av er skon.', { anim: { who: 'stig', flag: 'shoeOff', secs: 2 }, sfx: 'laugh' }],   // [F]
          ['berra', 'Kolla terroristen!'],                                                                                             // [F](t)
        ],
      }),
      () => goto({
        to: 'herrtoa', radius: 1.8, fearRate: 2, timer: 15, text: 'Till herrtoaletten – fort!', failText: 'Du hann inte fram…',   // [N]
        radio: [['ole', 'To ganger, Stig-Helmer! Looping med en jumbo!', { gap: 3, fear: 4 }]],                                   // [F*]
      }),
      () => mantra({ at: 'herrtoa', radius: 2.2, secs: 3, text: 'Håll J: sträck ut armarna – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA' }),   // [N]
      () => goto({
        to: 'cabinDoor', radius: 2.0, text: 'Gå ombord – gate 8',                                                                   // [N]
        radio: [['pa', 'Herr Stork ombedes kontakta informationen i avgångshallen.', { gap: 1, pa: true }]],                         // [F]
        overhear: [{ at: 'damtoaDoor', r: 8, lines: [
          ['siv', 'Du har väl med dig dom fyra p:na? Pass, pesetas, p-piller, piljetter.'],   // [F](t)
          ['majsan', 'Jag har piral.'],                                                     // [F](t)
          ['siv', 'Pass, pesetas, piral och piljetter!'],                                   // [F](t)
          ['majsan', '…och prit!'],                                                         // [F](t)
        ] }],
        awaitOverhear: true,
      }),
    ],
    outroPlace: { majsan: ['bridgeQueue1', 0, 0], siv: ['bridgeQueue2', 0, 0] },
    outro: [
      ['majsan', 'Nämen… hejsan!', { outfit: { who: 'stig', name: 'kostym' } }],   // [F](t)
      ['stig', 'Jaså, vi kom på samma resa.'],                                    // [F](t)
    ],
  },

  // ---- 1 · ombord ----------------------------------------------------------------------------
  {
    id: 'ombord', title: 'Rad 13 finns inte', level: 'flight', giver: 'vardinna', at: 'cabinDoor', reward: 250,
    intro: [
      ['vardinna', 'God morgon och välkommen ombord!'],                    // [N]
      ['stig', 'Fjorton B… Efter rad tolv kommer väl rad tretton?'],        // [N]
    ],
    stages: [
      () => sit({
        seat: '14B', timer: 25, text: 'Hitta plats 14B och sätt dig', failText: 'Planet kunde inte taxa ut. Kaptenen väntar på dig!',   // [N]
        startCue: { phase: ['gate', { instant: true }], seatbelt: true, blockers: true }, doneCue: { blockers: false },
      }),
      () => timeline({
        seat: '14B', lockSeat: true, panicFails: true, oleBarks: true, secs: 27, text: 'Starten! Håll J om det blir för mycket', barLabel: 'FLYGRÄDSLA',   // [N]
        events: [
          [0, { phase: 'takeoff', toast: 'Håll <b>J</b>: Jag kan flyga, jag är inte rädd' }],                    // [N]
          [10, { sfx: 'thud', fear: 15, shake: 0.4, say: ['stig', 'Vad är det för ljud?'] }],                   // [F]
          [11.5, { say: ['ole', 'Landingshjulene som går opp. Hydraulikk, vet du.'] }],                        // [F]
          [21, { say: ['majsan', 'Titta, solen!'], applause: 2.5, relieve: 30, seatbelt: false }],              // [F](t)
        ],
      }),
    ],
    outroCam: 'player',
    outro: [
      ['ole', 'Min drøm er å fly med Concorde fra Paris til Rio. 2 300 km i timen. Det er flyging!'],   // [F]
      ['ole', 'Det får duge.'],                                                                       // [F*](t)
    ],
  },

  // ---- 2 · juice -----------------------------------------------------------------------------
  {
    id: 'juice', title: 'Mer juice', level: 'flight', giver: 'ole', at: 'cabinRow14', reward: 300,
    intro: [
      ['stig', 'Du, om man vill ha lite mer juice?'],    // [F]
      ['ole', 'Ja, da trykker du der oppe.'],            // [F*]
    ],
    stages: [
      () => interact({
        at: 'call14', whileSeated: true, seat: '14B', prompt: '<b>E</b> Tryck där uppe', text: 'Sätt dig på 14B och tryck på knappen ovanför',   // [N]
        startCue: { phase: ['cruise', { instant: true }] },
        useCue: { sfx: 'pling', anim: { who: 'stig', flag: 'cupUp', secs: 6 } },
        lines: [
          ['ole', 'Nei…'],                                                              // [F*](t)
          ['stig', 'Där?'],                                                             // [F]
          ['ole', 'Nei…!', { anim: { who: 'ole', flag: 'laugh', secs: 3 } }],             // [F*](t)
        ],
      }),
      () => interact({
        at: (g) => g.cabin.trolleyEnd(g), radius: 1.3, enabled: (g) => g.cabin.trolleyStopped, prompt: '<b>E</b> Ta en juice',
        text: 'Hämta juicen vid serveringsvagnen – men akta tårna!', checkpoint: true, startCue: { trolley: true },              // [N]
      }),
      () => carry({
        item: 'juice', to: 'cabinRow14', radius: 1.2, text: 'Bär juicen till 14B utan att spilla', failText: 'Du spillde juicen!',   // [N]
        failOn: { bumped: true, sprintSecs: 1.0 }, startCue: { turbulence: [0.6, 5, { delay: 2 }] },
      }),
      () => sit({ seat: '14B', text: 'Sätt dig och njut av juicen', doneCue: { relieve: 30, sfx: 'pickup' } }),   // [N]
    ],
    outro: [
      ['ole', 'Neste gang trykker du og venter, Stig-Helmer.'],   // [N]
      ['stig', 'Usch…'],                                          // [F*]
    ],
  },

  // ---- 3 · sprit -----------------------------------------------------------------------------
  {
    id: 'sprit', title: 'Medhavd sprit', level: 'flight', giver: 'vardinna', at: 'galleyBack', reward: 300, extra: [],
    intro: [
      ['vardinna', 'Tack. Det är förbjudet att dricka medhavd sprit.'],          // [F]
      ['vardinna', 'Och resten av flaskorna rullar runt i hela planet.'],         // [N]
    ],
    stages: [
      () => collect({
        kind: 'flaska', motion: 'roll', items: [{ x: 3000.2, z: 9.0 }, { x: 2999.8, z: -6.0 }], radius: 0.9, timer: 75,
        text: 'Fånga flaskorna som rullar i gången', barLabel: 'FLASKOR', failText: 'Flaskorna rullade in under sätena.',      // [N]
        startCue: { phase: ['cruise', { instant: true }], trolley: true },
        timedCues: [[8, { radio: ['pa', 'Herr Storch ombedes kontakta kabinpersonalen.'], pa: true }], [20, { turbulence: [0.5, 6] }]],   // [N]
      }),
      () => goto({ to: 'galleyFront', radius: 1.6, text: 'Lämna flaskorna i främre byssan' }),   // [N]
    ],
    outro: [
      ['ole', 'Hører du? Samba.', { music: { tune: 'samba', secs: 6 } }],   // [F]
      ['stig', 'Fin musik!'],                                              // [F](t)
    ],
  },

  // ---- 4 · landning --------------------------------------------------------------------------
  {
    id: 'landning', title: 'Inflygning Las Palmas', level: 'flight', giver: 'majsan', at: 'cabinRow16', reward: 400,
    intro: [
      ['siv', 'Giraffen, då? Fyra.'],                                                                                      // [F*](t)
      ['kapten', 'Vi har påbörjat inflygningen mot Las Palmas. Var vänliga och fäst säkerhetsbältena.', { pa: true, seatbelt: true }],   // [N]
    ],
    stages: [
      () => collect({
        who: ['herrStorch', 'jose', 'berra'], standAt: { herrStorch: [3000.2, 3.4], jose: [2999.8, -9.2], berra: [3000.0, -14.4] }, seatOnTouch: true,
        timer: 50, text: 'Få de stående passagerarna att sätta sig', barLabel: 'STÅENDE', failText: 'Värdinnan fick göra det själv.',   // [N]
        lines: {
          herrStorch: [['herrStorch', 'Lite film.', { anim: { who: 'herrStorch', flag: 'film', secs: 2 } }]],   // [F*]
          jose: [['siv', 'Vad skönt att komma bort!'], ['jose', 'Jag ska inte bort, jag ska hem.']],            // [F*] · [F*]
          berra: [['berra', 'Ska vi inte landa snart?']],                                                    // [N]
        },
        startCue: { phase: ['cruise', { instant: true }], trolley: false }, timedCues: [[12, { turbulence: [0.3, 4] }]],
      }),
      () => sit({ seat: '14B', timer: 20, text: 'Skylten lyser! Tillbaka till 14B', failText: 'Alla måste sitta vid landningen.' }),   // [N]
      () => mantra({
        seated: '14B', secs: 8, panicFails: true, text: 'Inflygning! Håll J – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA',   // [N]
        startCue: { phase: ['approach', { hold: true }], turbulence: [0.7, 10] }, fillCue: { phase: 'landing' }, waitPhase: 'landed',
      }),
    ],
    outroCam: 'player',
    outro: [
      ['berra', 'Om de kraschar, kastar man tomater på piloterna då?', { applause: 3 }],   // [F*](t)
      ['ole', 'Ser du, Stig-Helmer? Hydraulikk, vet du. Helt normalt!'],                 // [N]
    ],
  },
];
