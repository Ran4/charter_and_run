// Level 2 missions, indices 5-12 (DESIGN §8.6-8.13). Owner: WP-G.
// Phase 0a placeholders: final ids, titles, levels, givers, `at`, rewards, costs, unlocks; one
// trivial stage each. Phase 0b replaces the stages; WP-G writes §8.

import { goto } from './kinds/index.js';

export const ISLAND_MISSIONS = [
  {
    id: 'buss17', title: 'SunTrips buss nummer 17', level: 'island', giver: 'lasse', at: 'airport', reward: 500,
    intro: [['lasse', 'SunTrips buss nummer 17 står där borta!']],   // [F]
    stages: [() => goto({ to: 'flamencoDrive', radius: 12, text: 'Kör gruppen till Hotell Flamenco – mjukt!' })],  // [N]
    outro: [['ole', 'Du skal ha sterke farger, du som er mørk.', { outfit: { who: 'stig', name: 'hawaii' } }]],  // [F]
  },
  {
    id: 'friskotek', title: 'Plocka kulor!', level: 'island', giver: 'lasse', at: 'friskotek', reward: 500,
    intro: [['lasse', 'Friskoteket börjar halv tio varje morgon.']],   // [F*]
    stages: [() => goto({ to: 'suntripPool', radius: 5, text: 'Plocka kulor! Plocka med höger… plocka med vänster!' })],  // [F]
    outro: [['lasse', 'Ja, du, det ingår inte i mina åtaganden.']],   // [F*]
  },
  {
    id: 'asnan', title: 'Caballo folklorístico', level: 'island', giver: 'ole', at: 'flamenco', reward: 600,
    intro: [['ole', 'Det fikser vi. Vi fikser alt!']],                // [F]
    stages: [() => goto({ to: 'marknad', radius: 9, text: 'Till marknaden' })],  // [N]
    outro: [['stig', 'Ett paket till Viking Bar. Det är till en moster.']],   // [N]
  },
  {
    id: 'bodega', title: 'Pepes Bodega', level: 'island', giver: 'berra', at: 'flamencoBar', reward: 700, unlock: 'grisbil',
    intro: [['berra', 'Vi är på södra Gran Canaria och havet är där, va. Då måste bodegan ligga ditåt.']],  // [F]
    stages: [() => goto({ to: 'playa', radius: 14, text: 'Bodegan ligger ditåt – mot havet!' })],  // [N]
    outro: [['berra', 'Pepes Bodega… Den måste ligga nånstans, Robban.']],   // [N]
  },
  {
    id: 'ropavieja', title: 'Gamla kläder', level: 'island', giver: 'siv', at: 'flamencoPool', reward: 700,
    intro: [['siv', 'Äkta spansk restaurang. Klockan sju.']],         // [F*]
    stages: [() => goto({ to: 'plaza', radius: 4, text: 'Spana diskret från fontänen' })],  // [N]
    outro: [['jose', 'Kanarisk specialitet! Ropa vieja – gamla kläder.']],   // [F]
  },
  {
    id: 'fataga', title: 'En skock får', level: 'island', giver: 'majsan', at: 'flamencoPool', reward: 800,
    intro: [['majsan', 'Gillar du fotboll också?']],                  // [F](t)
    stages: [() => goto({ to: 'fataga', radius: 9, text: 'Följ utflyktsbussen till Fataga' })],  // [N]
    outro: [['mamma', 'Det är hon som vill ta min Josito ifrån mig.']],   // [F]
  },
  {
    id: 'grisfest', title: 'Grisfesten', level: 'island', giver: 'ole', at: 'flamenco', reward: 1000, cost: 800,
    intro: [['ole', 'Fikser du ikke damer på grisefesten, da er det slutt. I kveld setter vi inn støtet!']],  // [F]
    stages: [() => goto({ to: 'grisfest', radius: 10, text: 'Till grisfesten!', startCue: { sky: 'night', music: 'vals' } })],  // [N]
    outro: [['stig', 'Jag avskyr bruna bönor.']],                      // [F*](t)
    onEnd: (g) => g.cue({ sky: 'day', music: 'sol' }),
  },
  {
    id: 'julafton', title: 'Julafton bland palmerna', level: 'island', giver: 'ole', at: 'flamencoPatio', reward: 2000, cost: 100, unlock: 'bodega',
    intro: [['ole', 'Feliz navidad.']],                                // [F](t)
    stages: [() => goto({ to: 'flamencoPool', radius: 8, text: 'Till julfesten vid poolen!' })],  // [N]
    outro: [['ole', 'Og så Rio!', { endCard: true }]],                 // [F*]
  },
];
