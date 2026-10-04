// Level 2 missions, indices 5-12 (DESIGN §8.6-8.13). Owner: WP-G.
// Phase 0b placeholders: the final id, title, level, giver, at, reward, cost, unlock; 1-2
// intro/outro lines; and 1-4 stages that exercise each mission's main stage kind on the stub
// island. WP-G replaces them with the full §8 sheets (the stage literals below are taken from §8).

import { getInCar, goto, pickup, follow, rabbits, race, destroy, scene, collect, mantra, haggle, smash } from './kinds/index.js';

export const ISLAND_MISSIONS = [
  // ---- 5 · buss17 ----------------------------------------------------------------------------
  {
    id: 'buss17', title: 'SunTrips buss nummer 17', level: 'island', giver: 'lasse', at: 'airport', reward: 500,
    extra: [['ole', 2.5, 1.0], ['siv', -3.0, 2.0], ['majsan', -3.8, 2.4]],
    intro: [
      ['lasse', 'Olsson! Du ser ut som en man med körkort.'],     // [N]
      ['lasse', 'SunTrips buss nummer 17 står där borta!'],       // [F]
    ],
    stages: [
      () => getInCar({ car: 'buss17', any: false, passenger: 'ole', riders: ['majsan', 'siv', 'fruStorch', 'herrStorch'], hideRiders: true, lockMeter: true, text: 'Hoppa in i SunTrips buss nummer 17' }),   // [N]
      () => goto({
        to: 'flamencoDrive', radius: 12, inCar: true, passenger: 'ole', stop: true, timer: 150, failText: 'Gästerna missade välkomstdrinken.',   // [N]
        smooth: { label: 'ÅKSJUKA', failText: 'Någon blev åksjuk i bussen!' }, text: 'Kör gruppen till Hotell Flamenco – mjukt!',               // [N]
        radio: [
          ['lasse', 'Hjärtligt välkomna till Nueva Estocolmo och SunTrip!', { gap: 4 }],   // [F]
          ['lasse', 'Ni bör inte dricka vattnet.', { gap: 8 }],                            // [F]
        ],
      }),
    ],
    outroPlace: { lasse: ['flamencoRecepcion', 1.5, 1.5], portier: ['flamencoRecepcion', 0, 0], ole: ['flamencoRecepcion', -1.5, 2.0], stig: ['flamencoRecepcion', 0, 3.0] },
    outro: [
      ['ole', 'Du kan ikke gå sånn her nede! Den buksa og det slipset! … Shorts.'],                                                          // [F]
      ['ole', 'Du skal ha sterke farger, du som er mørk.', { outfit: { who: 'stig', name: 'hawaii' }, flash: 'white', sfx: 'helanGar' }],   // [F]
    ],
  },

  // ---- 6 · friskotek -------------------------------------------------------------------------
  {
    id: 'friskotek', title: 'Plocka kulor!', level: 'island', giver: 'lasse', at: 'friskotek', reward: 500,
    extra: [['affe', -4, -6], ['gabbe', 4, -6], ['ole', -1.5, 3]],
    intro: [
      ['lasse', 'Jag heter Lasse och har hand om SunTrips friskotek. Friskoteket börjar halv tio varje morgon.'],   // [F]
      ['lasse', 'Och nu – friskotek! Men vinden har tagit badbollarna!'],                                          // [N]
    ],
    stages: [
      () => rabbits({
        mesh: 'badboll', count: 3, near: 'friskotek', rMin: 6, rMax: 30, timer: 75, text: 'Plocka kulor! Plocka med höger… plocka med vänster!',   // [F]
        barLabel: 'KULOR', gotText: 'Plocka med höger!', failText: 'Bollarna rullade ner till stranden.',                                    // [F*] · [N]
        radio: [['berra', 'Kolla storken!'], ['robban', 'Att de bara orkar, våra storkar…']],                                                // [F](t) ×2
      }),
      () => goto({ to: 'friskotek', radius: 5, text: 'Lämna bollarna till Lasse' }),   // [N]
    ],
    outroPlace: { lasse: ['friskotek', 0, 1.5], angerud: ['friskotek', 2.5, 1.0] },
    outro: [
      ['lasse', 'Ni lufsar som troll!'],                                                                             // [F*](t)
      ['lasse', 'Hajar i poolen? Delirium – ring kliniken.', { toast: 'Hajfenor <b>0/7</b> – sparka dem i poolerna!' }],   // [F*] · toast [N]
    ],
  },

  // ---- 7 · asnan -----------------------------------------------------------------------------
  {
    id: 'asnan', title: 'Caballo folklorístico', level: 'island', giver: 'ole', at: 'flamenco', reward: 600,
    intro: [
      ['stig', 'Undrar vad dalahäst heter på spanska.'],   // [F]
      ['ole', 'Cabalho folkloristico…'],                   // [F]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),                                                   // [N]
      () => pickup({ who: 'ole', name: 'Ole', at: 'flamencoDrive', hello: 'Til markedet!' }),          // [N]
      () => haggle({
        at: 'asnestand', who: 'souvenir', partner: 'ole', start: 500, steps: [400, 300, 200], zones: [0.30, 0.22, 0.15], speeds: [0.8, 1.1, 1.4], maxMiss: 3, pay: 200,
        text: 'Pruta! Tryck E när markören är i det gröna', barLabel: 'PRIS', failText: 'Säljaren stängde ståndet.',   // [N]
        lines: {
          start: [['souvenir', 'Hallå där!'], ['ole', 'Hvor mye?'], ['souvenir', '500 pesetas.']],                       // [F] · [F*](t) · [F]
          hit: [
            [['ole', 'Jeg gir deg to hundre. Det er… 18 norske kroner.'], ['souvenir', '400 pesetas. Titta, den är jättelustig.']],   // [F] · [F]
            [['ole', 'Så morsom er den ikke. To hundre.'], ['souvenir', '300 pesetas! Sista pris!']],                                // [F*] · [N]
            [['ole', 'To hundre er siste bud.']],                                                                                   // [F]
          ],
          miss: [['souvenir', '¡No, no, no!']],                                                                                     // [N]
          win: [['souvenir', 'Kör till.'], ['souvenir', 'Jävla smålänningar!']],                                                    // [F](t) · [F]
        },
      }),
      () => goto({ to: 'vikingbar', radius: 7, inCar: true, passenger: 'ole', timer: 80, fragile: { label: 'SKICK', failText: 'Färgen blev förstörd!' }, text: 'Kör försiktigt till Viking Bar – färgen är våt!' }),   // [N]
    ],
    outroPlace: { carmencita: ['vikingbar', 0, 1.5], angerud: ['vikingbar', 2.5, 1.2] },
    outro: [
      ['stig', 'Ett paket till Viking Bar. Det är till en moster.'],   // [N]
      ['carmencita', 'Jag lägger det bakom disken.'],                  // [N]
    ],
  },

  // ---- 8 · bodega ----------------------------------------------------------------------------
  {
    id: 'bodega', title: 'Pepes Bodega', level: 'island', giver: 'berra', at: 'flamencoBar', reward: 700, unlock: 'grisbil',
    intro: [
      ['berra', 'Vi är på södra Gran Canaria och havet är där, va. Då måste bodegan ligga ditåt.'],   // [F]
      ['berra', 'Du, terroristen, du har ju bil. Kör oss!'],                                         // [N]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),   // [N]
      () => follow({
        type: 'grisbil', carName: 'grisbilFollow', driver: 'grisbonde', riders: ['berra', 'robban'], hideRiders: true,
        start: { lane: [[0, 2], [1, 2]], t: 12 }, via: [[1, 2], [1, 1], [2, 1]], to: 'grisfestGate', maxDist: 70, cruise: 12, wobble: 0.12,
        text: 'Följ grisbilen – Berra och Robban har liftat!',                                                          // [N]
        radio: [['robban', 'Fan, de luktar.'], ['berra', 'Skit i det. Vi slipper gå.'], ['robban', 'Snacka om grisfest.']],   // [F](t) ×3
      }),
      () => getInCar({ missionCar: 'grisbilFollow', any: false, passenger: 'berra', rider: 'robban', text: 'Grisbonden lånar ut grisbilen – hoppa in!',   // [N]
        say: ['grisbonde', 'Ta bilen, señor. Ställ den vid hotellet – jag hämtar den på torsdag.'] }),                                             // [N]
      () => destroy({
        type: 'guardia', carName: 'guardiaJeep', driver: 'guardia', spawn: { lane: [[3, 1], [3, 2]], t: 25 }, noExplode: true, timer: 60, lockMeter: true, barLabel: 'JEEPEN',
        text: 'Guardia Civil såg grisarna – stoppa jeepen innan den hämtar förstärkning!', failText: 'Jeepen hann fram till kasernen.',   // [N]
      }),
    ],
    outroPlace: { berra: ['bodega', -1.6, -1.0], robban: ['bodega', 1.6, -1.0] },
    outro: [
      ['robban', 'Ja, herre jävlar, minns du Benidorm? Snacka om grisfest!', { cut: 'bodega' }],   // [F]
      ['berra', 'Pepes Bodega… Den måste ligga nånstans, Robban.', { cut: null }],                 // [N]
    ],
  },

  // ---- 9 · ropavieja -------------------------------------------------------------------------
  {
    id: 'ropavieja', title: 'Gamla kläder', level: 'island', giver: 'siv', at: 'flamencoPool', reward: 700, extra: ['majsan'],
    intro: [
      ['siv', 'Äkta spansk restaurang. Klockan sju.'],                         // [F*]
      ['majsan', 'Stig-Helmer, kan inte du hålla ett öga på dem? Diskret.'],   // [N]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),   // [N]
      () => follow({
        type: 'hatch', color: 0x2a4fa8, carName: 'joseBil', driver: 'jose', passenger: 'siv', riders: ['mamma'],
        start: { lane: [[5, 3], [4, 3]], t: 12 }, via: [[4, 4], [3, 4]], to: 'grillpacoCurb', maxDist: 75, minDist: 14, minGrace: 2,
        minText: 'José såg dig! Håll avståndet.', cruise: 10, text: 'Följ José – men inte för nära!',                          // [N]
        radio: [['jose', 'Jag ska bjuda dig på ett ställe som inga turister kommer till.'], ['siv', 'Det låter ju trevligt.']],   // [F*] · [F]
      }),
      () => goto({ to: 'plaza', radius: 4, onFoot: true, text: 'Parkera och spana diskret från fontänen' }),   // [N]
    ],
    outroPlace: { jose: ['grillpaco', 0, 0], siv: ['grillpaco', 1.2, 0], mamma: ['grillpacoMamma', 0, 0] },
    outroCam: ['jose', 'siv'],
    outro: [
      ['jose', 'Kanarisk specialitet! Ropa vieja – gamla kläder.'],   // [F]
      ['siv', 'Vad sa du?'],                                         // [F]
    ],
  },

  // ---- 10 · fataga (P1: cut first) -----------------------------------------------------------
  {
    id: 'fataga', title: 'En skock får', level: 'island', giver: 'majsan', at: 'flamencoPool', reward: 800, extra: ['siv'],
    intro: [
      ['majsan', 'Gillar du fotboll också?'],                                   // [F](t)
      ['siv', 'Lasses utflyktsbuss till Fataga har redan gått! Ta bilen, Giraffen!'],   // [N]
    ],
    stages: [
      () => rabbits({ mesh: 'faar', count: 4, near: 'fataga', rMin: 10, rMax: 35, timer: 80, text: 'Fånga fåren åt Josés pappa', barLabel: 'FÅR', gotText: 'Bäää!', failText: 'Fåren sprang hela vägen till Maspalomas.' }),   // [N]
      () => goto({ to: 'fatagaFold', radius: 4, text: 'Tillbaka till fårfållan' }),   // [N]
    ],
    outroPlace: { pappa: ['fatagaFold', 1.5, 0], mamma: ['fatagaDukar', 0, 0] },
    outro: [
      ['pappa', '¡Gracias, señor!'],                                  // [N]
      ['mamma', 'Det är hon som vill ta min Josito ifrån mig.'],      // [F]
    ],
  },

  // ---- 11 · grisfest -------------------------------------------------------------------------
  {
    id: 'grisfest', title: 'Grisfesten', level: 'island', giver: 'ole', at: 'flamenco', reward: 1000, cost: 800,
    intro: [
      ['ole', 'Skal du ha B-vitaminer? Bra for leveren. Grisefest, vet du. Ta to.'],                      // [F]
      ['ole', 'Fikser du ikke damer på grisefesten, da er det slutt. I kveld setter vi inn støtet!'],      // [F]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil – det börjar skymma', startCue: { sky: 'night', music: 'vals' } }),   // [N]
      () => race({
        who: 'gabbe', type: 'bus', carName: 'nattbuss', cruise: 17, playerPassenger: 'ole', start: { lane: [[3, 3], [3, 2]], t: 14 },
        checkpoints: [[3, 2], [4, 2], [4, 1], [3, 1]], finish: { x: -80, z: -200 }, text: 'Bussen till grisfesten går nu – kom först!',   // [N]
        radio: [['gabbe', 'Grisfestbussen går nu – sista man bjuder på sangrian!']], checkpoint: true,                                     // [N]
      }),
      () => smash({
        type: 'tallrikar', area: { lm: 'dansgolv', r: 22 }, count: 3, timer: 40, lockMeter: true, onFoot: true,
        text: 'Porslinskross! Krossa tallrikarna medan bandet spelar', barLabel: 'TALLRIKAR', failText: 'Bandet slutade spela.',   // [N]
        radio: [['pax', 'Vad skickliga de är!']], checkpoint: true, retryAt: 'dansgolv',                                          // [F](t)
      }),
    ],
    onEnd: (g, reason) => {
      if (reason === 'complete') g.cue({ banner: ['MORGONEN EFTER', 'Julafton på Gran Canaria', 'mission'] });   // [N]
      g.cue({ sky: 'day', music: 'sol' });
    },
    outroPlace: { portier: ['flamencoRecepcion', 0, 0], angerud: ['flamencoRecepcion', -1.6, 1.2], stig: ['flamencoRecepcion', 1.5, 3.0] },
    outro: [
      ['portier', 'Det är förbjudet att ta med damer på rummet. Men för 500 pesetas kanske vi kommer överens.'],   // [F]
      ['angerud', 'Måtte djävulen ta alla fruntimmer!'],                                                         // [F]
    ],
  },

  // ---- 12 · julafton -------------------------------------------------------------------------
  {
    id: 'julafton', title: 'Julafton bland palmerna', level: 'island', giver: 'ole', at: 'flamencoPatio', reward: 2000, cost: 100, unlock: 'bodega',
    intro: [
      ['ole', 'Feliz navidad.'],                                                                                      // [F](t)
      ['lasse', 'Alla är välkomna på julfesten. Men man måste ha julmat och en julklapp för 100 pesetas.', { pa: true }],   // [F*]
    ],
    stages: [
      () => collect({
        who: ['herrStorch', 'fruStorch', 'berra', 'majsan'],
        findAt: { herrStorch: ['playa', 0, 0], fruStorch: ['kyrka', 0, 2], berra: ['bodega', -2.0, 0.5], majsan: ['marknad', 1, 1] },
        sendTo: { herrStorch: ['flamencoPool', 4, 2], fruStorch: ['flamencoPool', 5, 2], berra: ['flamencoBar', 0, 0], majsan: ['flamencoPool', -2, 0] },
        inCar: true, radius: 1.6, carRadius: 4.0, timer: 200, text: 'Samla ihop gästerna till julfesten', barLabel: 'GÄSTER', failText: 'Julfesten började utan dem.',   // [N]
        lines: {
          herrStorch: [['stig', 'Herr Storch! Julfesten!'], ['herrStorch', 'Jag ska bara filma lite till.']],           // [N] · [N]
          fruStorch: [['stig', 'Fru Stork, julfesten börjar!'], ['fruStorch', 'Vi heter faktiskt Storch, inte Stork.']],   // [N] · [F*]
          berra: [['stig', 'Berra! Julfesten!'], ['berra', 'Jag kommer, jag ska bara kolla en grej.']],                   // [N] · [N]
          majsan: [['majsan', 'Titta inte! Det är en hemlighet.']],                                                     // [N]
        },
      }),
      () => scene({
        cam: { at: 'rum113', dist: 6, height: 3 },
        place: { angerud: ['rum113', 0, 0.8], stadare: ['rum113', -1.5, 1.6], saljare: ['rum113', 1.5, 1.6], siv: ['rum113', 0, 3.2] },
        lines: [
          ['stadare', 'Limpio!'],                                                                   // [F]
          ['siv', 'Gösta, ska du inte med på julfesten?'],                                           // [F]
          ['angerud', 'Ut! Ut!', { sfx: 'doorSlam', flash: 'white', hide: ['angerud'] }],             // [F]
          ['pa', '…', { sfx: 'ambulance', toast: 'En ambulans hämtade direktör Angerud. Han kommer att bli bra igen.' }],   // [N]
        ],
      }),
      () => mantra({
        duet: 'majsan', at: 'flamencoPool', radius: 4, secs: 4, text: 'Visa Majsan övningen – håll J', barLabel: 'JAG KAN FLYGA',   // [N]
        startCue: { sky: 'sunset', place: { majsan: ['flamencoPool', 1.2, 0] }, say: ['majsan', 'Visa mig igen. Inför hemresan.'] },   // [N]
      }),
    ],
    onEnd: (g) => g.cue({ sky: 'day' }),
    outro: [
      ['stig', 'Jag kan flyga, jag är inte rädd.'],                    // [F]
      ['majsan', 'Jag kan flyga, jag är inte rädd.'],                  // [F*]
      ['ole', 'Og så Rio!', { endCard: true }],                       // [F*]
    ],
  },
];
