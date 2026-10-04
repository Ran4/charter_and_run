// Level 1 missions, indices 0-4 (DESIGN §8.1-8.5). Owner: WP-F.
// Phase 0a placeholders: final ids, titles, levels, givers, `at`, rewards; one trivial stage each.
// Phase 0b replaces the stages with ones that exercise each mission's main kind; WP-F writes §8.

import { goto } from './kinds/index.js';

export const FLIGHT_MISSIONS = [
  {
    id: 'gate', title: 'Jag kan flyga, jag är inte rädd', level: 'flight', giver: 'ole', at: 'gateQueue', reward: 200,
    intro: [
      ['ole', 'Du ser nervøs ut, du. Første gang du flyr?'],          // [N]
      ['stig', 'Jag kan flyga, jag är inte rädd.'],                  // [F]
    ],
    stages: [
      () => goto({ to: 'cabinDoor', radius: 2.0, text: 'Gå ombord – gate 8', startCue: { phase: ['gate', { instant: true }] } }),  // [N]
    ],
    outroPlace: { majsan: ['bridgeQueue1', 0, 0], siv: ['bridgeQueue2', 0, 0] },
    outro: [
      ['majsan', 'Nämen… hejsan!', { outfit: { who: 'stig', name: 'kostym' } }],   // [F](t)
      ['stig', 'Jaså, vi kom på samma resa.'],                                    // [F](t)
    ],
  },
  {
    id: 'ombord', title: 'Rad 13 finns inte', level: 'flight', giver: 'vardinna', at: 'cabinDoor', reward: 250,
    intro: [
      ['vardinna', 'God morgon och välkommen ombord!'],               // [N]
    ],
    stages: [
      () => goto({ to: 'cabinRow14', radius: 1.6, text: 'Hitta plats 14B', startCue: { phase: ['gate', { instant: true }] }, doneCue: { phase: 'takeoff' } }),  // [N]
    ],
    outro: [
      ['ole', 'Det får duge.'],                                       // [F*](t)
    ],
  },
  {
    id: 'juice', title: 'Mer juice', level: 'flight', giver: 'ole', at: 'cabinRow14', reward: 300,
    intro: [
      ['stig', 'Du, om man vill ha lite mer juice?'],                 // [F]
      ['ole', 'Ja, da trykker du der oppe.'],                         // [F*]
    ],
    stages: [
      () => goto({ to: 'galleyFront', radius: 1.6, text: 'Hämta juice i främre byssan', startCue: { phase: ['cruise', { instant: true }] } }),  // [N]
    ],
    outro: [
      ['ole', 'Neste gang trykker du og venter, Stig-Helmer.'],       // [N]
    ],
  },
  {
    id: 'sprit', title: 'Medhavd sprit', level: 'flight', giver: 'vardinna', at: 'galleyBack', reward: 300,
    intro: [
      ['vardinna', 'Tack. Det är förbjudet att dricka medhavd sprit.'],  // [F]
    ],
    stages: [
      () => goto({ to: 'galleyFront', radius: 1.6, text: 'Lämna flaskorna i främre byssan', startCue: { phase: ['cruise', { instant: true }] } }),  // [N]
    ],
    outro: [
      ['stig', 'Fin musik!'],                                         // [F](t)
    ],
  },
  {
    id: 'landning', title: 'Inflygning Las Palmas', level: 'flight', giver: 'majsan', at: 'cabinRow16', reward: 400,
    intro: [
      ['majsan', 'Sex, tycker jag.'],                                 // [F*](t)
      ['stig', '…Fyra?'],                                              // [N]
    ],
    stages: [
      () => goto({ to: 'cabinRow14', radius: 1.6, text: 'Tillbaka till 14B', startCue: { phase: ['cruise', { instant: true }], seatbelt: true }, doneCue: { phase: ['landed', { instant: true }] } }),  // [N]
    ],
    outro: [
      ['ole', 'Ser du, Stig-Helmer? Hydraulikk, vet du. Helt normalt!'],  // [N]
    ],
  },
];
