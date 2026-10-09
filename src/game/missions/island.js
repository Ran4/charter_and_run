// Level 2 missions, indices 5-12 (DESIGN §8.6-8.13): the group trip on Nueva Estocolmo. Owner: WP-G.
// Every scripted line carries its DESIGN §1.4 source tag; Ole speaks Norwegian bokmål throughout.
// Invented mechanics (DESIGN §1.6): Stig-Helmer driving bus 17 and the ÅKSJUKA bar, "Plocka kulor"
// as a beach-ball chase, haggling as a timing game, the wet-paint SKICK bar, the grisbil being lent
// to Stig-Helmer and the Guardia jeep chase, following José's car and the pig truck, the Fataga
// sheep round-up, the night-bus race, porcelain smashing as a timed game, rounding up the
// Christmas-party guests, Majsan saying the mantra with Stig-Helmer.
//
// Timers (DESIGN §8 "Timers and difficulty"): measured, not guessed. `node tools/shot.mjs
// calibrate` drives every timed stage with a headless autopilot (player car ×1.2, timeScale 1,
// traffic on) and prints T_ref per stage; drives use ceil(T_ref × 1.2), on-foot stages
// ceil(T_ref × 1.25). Re-measured on the merged world in the Phase 2 balance pass.

import { getInCar, goto, pickup, dropoff, follow, rabbits, race, destroy, grab, scene, collect, carry, mantra, haggle, smash } from './kinds/index.js';
import { lm } from '../../world/layout.js';

const PI = Math.PI;
// The julafton pool party's group shot (camera on the pool deck south of the guests, looking north).
const PARTY_CAM = { at: 'flamencoPool', dist: 11, height: 4 };

// Stage timers in seconds (stage timers run on unscaled time). Phase 2 balance pass, measured on
// the merged world with `calibrate` (DESIGN §8 "Timers and difficulty", table there): T_ref = the
// median of clean autopilot runs (deterministic drives) or the 75th percentile (random spawns /
// flee routes); on foot + 0.5 s per target. timer = ceil(1.2 × T_ref) driving, ceil(1.25 × T_ref)
// on foot (whole seconds).
export const TIMERS = {
  buss17Drive: 54,        // §8.6 s2  busBay -> flamencoDrive, ÅKSJUKA limits, stop     T_ref 45.0 (median of 10 clean)
  friskotekBalls: 32,     // §8.7 s1  6 fleeing beach balls (on foot)                  T_ref 24.9 (p75 21.9 of 12 + 3)
  asnanPaint: 19,         // §8.8 s9  supermercado lot -> vikingbar, SKICK              T_ref 15.5 (median of 3 clean)
  bodegaVischan: 31,      // §8.9 s4  playa -> vischan                                  T_ref 25.8 (median of 8 clean, gate fix)
  bodegaJeep: 42,         // §8.9 s9  wreck the fleeing Guardia jeep                    T_ref 34.4 (p75 of 35 chases; median 24.5)
  bodegaHome: 30,         // §8.9 s10 fallback only: the stage uses homeTimer(wreck)    T_ref 25.0 at d 587 (far corner)
  fatagaSheep: 42,        // §8.11 s5 6 fleeing sheep (on foot)                         T_ref 33.3 (p75 30.3 of 12 + 3)
  grisfestFlowers: 42,    // §8.12 s1 5 flowers round Flamenco (on foot, random spawns) T_ref 33.6 (p75 31.1 of 12 + 2.5)
  grisfestPlates: 45,     // §8.12 s4 10 plate stacks (on foot, kick)                   T_ref 35.3 (p75 30.3 of 10 + 5)
  grisfestTonga: 23,      // §8.12 s6 dance floor -> car at the gate -> tongatonga      T_ref 19.0 (2 clean)
  julaftonGuests: 87,     // §8.13 s1 patio -> hire car -> four guests                  T_ref 72.4 (median of 8 clean in 6 runs)
};

// Opponent / quarry tuning (race, destroy, follow; DESIGN §8 "Races and chases").
export const TUNING = {
  // Gabbe's night bus. The stock bus (maxSpeed 21, accel 6.5, steer 0.52; AI cars never get
  // PLAYER_BOOST) can neither race a ×1.2 car nor take a junction at speed, so the race hands the
  // opponent this spec (the race kind's `oppSpec`). Phase 2 (calibrate 'race', the bus in its own
  // lane, the player beside it): 3 clean runs won by 2.0 s each, 3 runs with one crash all lost.
  nattbuss: { cruise: 31, spec: { maxSpeed: 35, accel: 12, steer: 0.9 } },
  // The fleeing jeep: catchable at ×1.2 only by driving a direct line; damageScale so that about
  // four solid rams wreck it before the borrowed grisbil (hp 130) is wrecked itself. The grisbil is
  // a heavy farm truck: while it rams the jeep it takes half damage (destroy's playerDamageScale;
  // without it a clean chase ended with the truck on fire as often as not).
  jeep: { cruise: 20, damageScale: 4, playerDamageScale: 0.5 },
  // Follows have no timer: the quarry drives briskly and the band is narrow.
  grisbilFollow: { cruise: 15, maxDist: 55 },
  joseFollow: { cruise: 13, minDist: 14, maxDist: 55 },
  bussFollow: { cruise: 14, maxDist: 55 },
};

// §8.9 s10 "Kör hem grisarna" starts wherever the jeep died, anywhere on the map, so its timer
// follows the distance: T_ref(d) = HOME.c + d / HOME.v with d the Manhattan distance (m) from the
// wreck to flamencoBack (the road route is within 3 % of it). Fit over clean calibrate drives
// (case 'home'), plus 3 s to turn round at the wreck (the measured drives start facing the hotel).
// timer = ceil(1.2 × T_ref); TIMERS.bodegaHome is the fallback when no wreck is known.
// Phase 2 gate: 4.9 + d/34.4 over 12 clean drives from 6 spots (3 each), + 3 s. A line in d
// cannot follow every route (the spots' own clean drives sit up to ±2 s off it), so a single
// spot's timer is 1.12–1.37 × its own drive + 3 s.
export const HOME = { c: 7.9, v: 34.4 };
export function homeTimer(w) {
  if (!w) return TIMERS.bodegaHome;
  const b = lm('flamencoBack');
  return Math.ceil(1.2 * (HOME.c + (Math.abs(w.x - b.x) + Math.abs(w.z - b.z)) / HOME.v));
}

// The haggle timing game (§8.8 stage 4; non-test zone widths and marker speeds in cycles/s per
// round). Phase 2 balance (calibrate case 'haggle', a model player aiming at the zone middle with a
// Gaussian timing error σ): σ 25 ms (practised) wins 97 %, σ 40 ms 80 %, σ 60 ms (first go) 53 %.
// The Phase 1 values (0.30/0.22/0.15 at 0.8/1.1/1.4) left a 34 ms window in round 3: 66 % at 40 ms.
export const HAGGLE = { zones: [0.30, 0.23, 0.17], speeds: [0.7, 0.95, 1.2] };

export const ISLAND_MISSIONS = [
  // ===== §8.6 · 5 · buss17 · "SunTrips buss nummer 17" =========================================
  {
    id: 'buss17', title: 'SunTrips buss nummer 17', level: 'island', giver: 'lasse', at: 'airport', reward: 500,
    extra: [['ole', 2.5, 1.0], ['siv', -3.0, 2.0], ['majsan', -3.8, 2.4], ['jose', 4.5, 3.0], ['mamma', 5.3, 3.0], ['robban', -1.5, 4.0], ['berra', -2.2, 4.4], ['affe', 3.5, -1.0]],
    idleAnim: { berra: 'slump' },   // Berra sleeps it off while the mission waits (§9.4 item 11)
    intro: [
      // A group shot of the arrivals crowd from the terminal side, facing them (a negative dist stands
      // the camera in front of the landmark); runner.begin() ends the cut after the intro. Lasse and
      // Stig half turned to each other and the camera, Robban to the camera and the sleeping Berra.
      ['robban', 'Invalido.', { anim: { who: 'berra', flag: 'slump', secs: 20 }, cut: { at: 'airport', dist: -10, height: 3.2 }, place: { lasse: ['airport', 0, 0, 5 * PI / 4], stig: ['airport', 1.2, 0.8, 3 * PI / 4], robban: ['airport', -1.5, 4.0, 2.75] } }],   // [F]
      ['guardia', 'Gracias.'],                                                       // [F](t) the officer at passport control
      ['mamma', '¡Josito! ¡Josito!'],                                                // [F]
      ['mamma', 'Inga svenskor!'],                                                   // [F]
      ['siv', 'Hälsa familjen.'],                                                    // [F]
      ['majsan', 'Och hönsen!'],                                                     // [F](t)
      ['lasse', 'Några problem?'],                                                   // [F](t)
      ['stig', 'Min väska har inte kommit.'],                                        // [F]
      ['lasse', 'Den dyker upp. Det gör de alltid.'],                                // [N]
      ['lasse', 'Affe, du får ta transfern.'],                                       // [F*] a hotel cutaway in the film, relocated
      ['affe', 'Va fan, jag hade ju natturen i natt! Jag har haft två grisfester i veckan.'],   // [F*]
      ['lasse', 'Olsson! Du ser ut som en man med körkort.'],                        // [N]
      ['lasse', 'SunTrips buss nummer 17 står där borta!'],                          // [F](t)
    ],
    stages: [
      // Ole rides up front; the sisters and the Storchs are window busts (hidden as NPCs meanwhile).
      () => getInCar({ car: 'buss17', atHome: true, any: false, passenger: 'ole', riders: ['majsan', 'siv', 'fruStorch', 'herrStorch'], hideRiders: true, lockMeter: true, text: 'Hoppa in i SunTrips buss nummer 17' }),   // [N]
      () => goto({
        to: 'flamencoDrive', radius: 12, inCar: true, passenger: 'ole', stop: true, timer: TIMERS.buss17Drive,
        failText: 'Gästerna missade välkomstdrinken.',                                           // [N]
        smooth: { label: 'ÅKSJUKA', failText: 'Någon blev åksjuk i bussen!' },                  // [N]
        text: 'Kör gruppen till Hotell Flamenco – mjukt!',                                      // [N]
        radio: [
          ['lasse', 'Hjärtligt välkomna till Nueva Estocolmo och SunTrip!', { gap: 4 }],                     // [F]
          ['lasse', 'Klockan är tre spansk tid – alltså en timme tidigare än svensk tid.', { gap: 9 }],      // [F]
          ['lasse', 'Ni bör inte dricka vattnet.', { gap: 8 }],                                              // [F]
          ['lasse', 'Grisfesten är på torsdag och kostar 800 pesetas. Några frågor?', { gap: 8 }],           // [F]
          ['fruStorch', 'Finns det svenskt kaffe på hotellet?', { gap: 3 }],                                // [F]
          ['lasse', 'Ja.', { gap: 2 }],                                                                     // [F]
          ['ole', 'Norsk, da?', { gap: 2 }],                                                                // [F]
          ['lasse', 'Ja.', { gap: 2 }],                                                                     // [F]
          ['siv', 'Majsan, en niopoängare!', { gap: 10 }],                                                  // [F]
          ['stig', 'Jag har lite anlag för åksjuka.', { gap: 10 }],                                          // [F](t) the subtitles leave the speaker open
          ['ole', 'Jeg har reisesyketabletter.', { gap: 2.5 }],                                             // [F](t)
          ['stig', 'Jättefint! Tack. Du kanske vill ha en Argotal av mig. Mot allergi…', { gap: 3 }],       // [F](t)
        ],
      }),
    ],
    outroPlace: { lasse: ['flamencoRecepcion', 1.5, 1.5], portier: ['flamencoRecepcion', 0, 0], ole: ['flamencoRecepcion', -1.4, 4.4], stig: ['flamencoRecepcion', 0, 3.0] },
    outro: [
      ['lasse', 'Det har dessvärre uppstått ett litet problem på grund av överbokning.'],          // [F](t)
      ['lasse', 'Olsson, Stig-Helmer… och Bramserud, Ole… Kan ni dela rum?'],                       // [F](t)
      ['stig', 'Ja…'],                                                                              // [F]
      // Room 107 (the cut holds to the end): Stig in the doorway, the porter holds his mirror up to
      // show the sea; Ole sets up his boombox inside, and the porter goes back to the desk.
      ['stig', 'Kallar ni det här för havsutsikt?', { cut: { at: 'rum107Cam', dist: 5.5, height: 2.1 }, place: { stig: ['flamencoPatio', 0, -2.4, 0], portier: ['flamencoPatio', 1.3, -1.2, -0.25], ole: ['flamencoPatio', -1.6, -3.6, 0.3] } }],   // [F](t)
      ['portier', 'Momento.', { anim: { who: 'portier', flag: 'mirror', secs: 3 } }],                                                    // [F]
      ['ole', 'Litt lenger inn mot veggen. Snu den litt mer mot meg. Sånn ja… Kom og hør nå! Fin lyd.', { place: { portier: ['flamencoRecepcion', 0, 0] } }],   // [F]
      ['ole', 'Du kan ikke gå sånn her nede! Den buksa og det slipset! … Shorts.'],                                                     // [F]
      ['stig', 'Är den inte lite skrikig?'],                                                                                           // [F]
      ['ole', 'Du skal ha sterke farger, du som er mørk.', { outfit: { who: 'stig', name: 'hawaii' }, flash: 'white', sfx: 'helanGar' }],   // [F]
    ],
  },

  // ===== §8.7 · 6 · friskotek · "Plocka kulor!" ===============================================
  {
    id: 'friskotek', title: 'Plocka kulor!', level: 'island', giver: 'lasse', at: 'friskotek', reward: 500,
    extra: [['affe', -4, -6], ['gabbe', 4, -6], ['ole', -1.5, 3], ['siv', -3, 4], ['majsan', -4, 4], ['fruStorch', 3, 4], ['herrStorch', 4, 4]],
    intro: [
      ['lasse', 'Välkommen till våran ö, sluta tänk på regn och snö!'],                                           // [F] one spoken line of the song
      ['lasse', 'Vi befinner oss i höjd med Egypten och 500 mil hemifrån… som väl är.'],                         // [F]
      ['lasse', 'Jag heter Lasse och har hand om SunTrips friskotek. Friskoteket börjar halv tio varje morgon.'],  // [F]
      ['lasse', 'Sträck upp höger hand, lägg vänster hand på hjärtat och säg efter mig: Jag lovar att bli en sundare och friskare människa under semestern.', { anim: { who: 'stig', flag: 'oath', secs: 4 } }],   // [F]
      ['stig', 'Jag lovar att bli en sundare och…'],                                                              // [F*]
      ['siv', 'Gud, vad han är söt!'],                                                                            // [F]
      ['lasse', 'Finns det en familjen Stork här?'],                                                              // [F](t)
      ['fruStorch', 'Vi heter faktiskt Storch, inte Stork.'],                                                     // [F]
      ['lasse', 'Till brudparet från Rutan och Nisse: Heja på och tappa inte orken, för om nio månader kommer storken.', { applause: 2 }],   // [F]
      ['lasse', 'Och nu – friskotek! Men vinden har tagit badbollarna!'],                                         // [N]
    ],
    stages: [
      () => rabbits({
        mesh: 'badboll', count: 6, near: 'friskotek', rMin: 6, rMax: 30, timer: TIMERS.friskotekBalls,
        text: 'Plocka kulor! Plocka med höger… plocka med vänster!',   // [F]
        barLabel: 'KULOR', gotText: 'Plocka med höger!',                // [F*]
        failText: 'Bollarna rullade ner till stranden.',               // [N]
        radio: [['berra', 'Kolla storken!'], ['robban', 'Att de bara orkar, våra storkar…']],   // [F](t) ×2
      }),
      () => goto({ to: 'friskotek', radius: 5, text: 'Lämna bollarna till Lasse' }),   // [N]
    ],
    // Everyone who speaks stands in one group shot, facing the camera north of them.
    outroPlace: { lasse: ['friskotek', 0, 1.5, PI], angerud: ['friskotek', 1.6, 2.4, -2.4], berra: ['friskotek', -2.4, 1.0, PI], robban: ['friskotek', -3.4, 1.4, PI], ole: ['friskotek', 2.8, 1.0, PI], stig: ['friskotek', -1.0, 2.6, 2.5] },
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
      ['lasse', 'Hajar i poolen? Delirium – ring kliniken.', { toast: 'Hajfenor <b>0/7</b> – sparka dem i poolerna!' }],   // [F*] a phone call in the film · toast [N]
      ['ole', 'Bagen min revnet på bussen – dingsene mine er spredt over hele øya!', { toast: 'Oles prylar <b>0/7</b>' }],   // [N]
    ],
  },

  // ===== §8.8 · 7 · asnan · "Caballo folklorístico" ===========================================
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
      () => getInCar({ text: 'Hoppa in i en bil' }),                                                        // [N]
      () => pickup({ who: 'ole', name: 'Ole', at: 'flamencoDrive', hello: 'Til markedet!' }),              // [N]
      () => goto({ to: 'marknad', radius: 9, inCar: true, passenger: 'ole', text: 'Till marknaden' }),     // [N]
      // Ole haggles like a smålänning (the timing game is invented, §1.6).
      () => haggle({
        at: 'asnestand', who: 'souvenir', partner: 'ole', start: 500, steps: [400, 300, 200], zones: HAGGLE.zones, speeds: HAGGLE.speeds, maxMiss: 3, pay: 200,
        text: 'Pruta! Tryck E när markören är i det gröna', barLabel: 'PRIS', failText: 'Säljaren stängde ståndet.',   // [N]
        lines: {
          start: [['souvenir', 'Hallå där!'], ['ole', 'Hvor mye?'], ['souvenir', '500 pesetas.'], ['ole', 'To hundre?']],                    // [F] · [F*](t) · [F] · [F*](t)
          hit: [
            [['ole', 'Jeg gir deg to hundre. Det er… 18 norske kroner.'], ['souvenir', '400 pesetas. Titta, den är jättelustig.']],          // [F*] · [F]
            [['ole', 'Så morsom er den ikke. To hundre.'], ['souvenir', '300 pesetas! Sista pris!']],                                       // [F*] · [N]
            [['ole', 'To hundre er siste bud.']],                                                                                          // [F]
          ],
          miss: [['souvenir', '¡No, no, no!']],                                                                                            // [N]
          win: [['ole', 'Første, andre, tredje – to hundre pesetas!'], ['souvenir', 'Kör till.'], ['souvenir', 'Por favor.'], ['souvenir', 'Jävla smålänningar!']],   // [F*](t) · [F](t) · [F](t) · [F]
        },
      }),
      () => grab({ at: 'asnestand', mesh: 'asna', text: 'Ta åsnan' }),                                                         // [N]
      () => goto({ to: 'supermercado', radius: 8, inCar: true, passenger: 'ole', text: 'Leta knäckebröd – samma sort som i julklappen' }),   // [N]
      () => grab({ at: 'supermercado', mesh: 'knacke', text: 'Ta ett SPORT-KNÄCKE-paket', say: ['stig', 'Det är ungefär så här stort.'] }),   // [N] · say [F](t)
      // Painted in the car in the Centro Nórdico lot; the cut shows the FERRETERÍA front.
      () => scene({ frame: ['ole', 'stig'], lines: [
        ['ole', 'Og så maler vi den rød.', { cut: 'ferreteria' }],   // [F*](t)
        ['stig', 'Och blommor där.', { cut: null }],                  // [F](t)
      ], doneCue: { flash: 'rgba(216,50,30,.4)', toast: 'Åsnan är nu en dalahäst. Nästan.' } }),   // toast [N]
      () => goto({ to: 'vikingbar', radius: 7, inCar: true, passenger: 'ole', timer: TIMERS.asnanPaint, fragile: { label: 'SKICK', failText: 'Färgen blev förstörd!' }, text: 'Kör försiktigt till Viking Bar – färgen är våt!' }),   // [N]
      () => goto({ to: 'vikingbar', radius: 2.5, onFoot: true, text: 'Lämna paketet i baren' }),   // [N]
    ],
    // Both face the street, where the cut camera stands; Stig has left by the time Angerud comes in.
    outroPlace: { carmencita: ['vikingbar', -0.8, 1.6, 0], angerud: ['vikingbar', 0.9, 1.3, 0] },
    outro: [
      ['stig', 'Ett paket till Viking Bar. Det är till en moster.'],                     // [N]
      ['carmencita', 'Jag lägger det bakom disken.', { toast: 'Senare samma dag…' }],      // [N]
      ['angerud', 'Buenas dias, lilla vikingen. Har paketet kommit?', { cut: { at: 'vikingbar', dist: 6.5, height: 3.4 }, place: { stig: ['vikingbar', 4, -9, 0] } }],   // [F] high enough to see over a car parked at the door
      ['angerud', 'God jul, moster.'],                                                   // [F] he reads the card
      ['angerud', 'Hur såg han som lämnade in det ut?'],                                 // [F]
      ['carmencita', 'Han var lång, mörkhårig… hade glasögon och mustasch.'],            // [F]
      ['angerud', 'Då är det grönt.', { cut: null }],                                    // [F]
    ],
  },

  // ===== §8.9 · 8 · bodega · "Pepes Bodega" ===================================================
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
      () => getInCar({ text: 'Hoppa in i en bil' }),                                                                   // [N]
      () => pickup({ who: 'berra', name: 'Berra', at: 'flamencoBar', rider: 'robban', hello: 'Ditåt!' }),            // [N]
      () => goto({
        to: 'playa', radius: 14, inCar: true, passenger: 'berra', text: 'Bodegan ligger ditåt – mot havet!',            // [N]
        radio: [['robban', 'Fan Berra, ja ä tösstig.'], ['berra', 'Fan Robban, du har ingen karaktär!']],             // [F] · [F]
        doneCue: { radio: ['berra', 'Ingen bodega här. Då ligger den åt andra hållet.'] },                             // [N]
      }),
      () => goto({
        to: 'vischan', radius: 14, inCar: true, passenger: 'berra', timer: TIMERS.bodegaVischan, text: 'Leta inåt land',   // [N]
        radio: [['berra', 'Det här är ju rena vischan. Vi måste ha kört för långt.'], ['robban', 'Fan, vad jag är törstig.']],   // [F*] the film's "gått", said on foot · [F]
        overhear: [{ at: 'eslovVag', r: 25, radio: true, lines: [['berra', 'Heja Eslöv!'], ['robban', 'Herre jävlar!']] }],     // [F] · [F](t)
      }),
      () => dropoff({ who: 'berra', at: 'vischan', riderOff: true, text: 'Stanna vid tomatfälten' }),   // [N]
      // Hitch-hike logic: Stig refuses the dirt road (åksjuka), then they hitch the pig truck. He
      // steps out to say so (seated, the two-shot saw the car roof); the tail starts once he is back in.
      () => scene({ frame: ['berra', 'stig'], exitCar: true, lines: [
        ['stig', 'Jag kör inte längre på grusvägen. Jag har anlag för åksjuka.'],   // [N]
        ['berra', 'Jag går inte en meter till. Vi liftar.'],                        // [F](t)
      ], doneCue: { toast: 'En grisbil stannar…' } }),                              // [N]
      () => follow({
        type: 'grisbil', carName: 'grisbilFollow', driver: 'grisbonde', riders: ['berra', 'robban'], hideRiders: true,
        start: { lane: [[0, 2], [1, 2]], t: 12 }, via: [[1, 2], [1, 1], [2, 1]], to: 'grisfestGate',
        maxDist: TUNING.grisbilFollow.maxDist, cruise: TUNING.grisbilFollow.cruise, wobble: 0.12,
        text: 'Följ grisbilen – Berra och Robban har liftat!',                                                         // [N]
        radio: [['robban', 'Fan, de luktar.'], ['berra', 'Skit i det. Vi slipper gå.'], ['robban', 'Snacka om grisfest.']],   // [F](t) ×3
      }),
      () => getInCar({ missionCar: 'grisbilFollow', any: false, passenger: 'berra', rider: 'robban', text: 'Grisbonden lånar ut grisbilen – hoppa in!', say: ['grisbonde', 'Ta bilen, señor. Ställ den vid hotellet – jag hämtar den på torsdag.'] }),   // [N] · [N]
      // Invented (§1.6): the jeep must not reach the barracks; a mission target, so no SKANDAL.
      () => destroy({
        type: 'guardia', carName: 'guardiaJeep', driver: 'guardia', spawn: { lane: [[3, 1], [3, 2]], t: 25 }, cruise: TUNING.jeep.cruise, damageScale: TUNING.jeep.damageScale, playerDamageScale: TUNING.jeep.playerDamageScale,
        noExplode: true, timer: TIMERS.bodegaJeep, lockMeter: true, barLabel: 'JEEPEN',
        text: 'Guardia Civil såg grisarna – stoppa jeepen innan den hämtar förstärkning!',   // [N]
        failText: 'Jeepen hann fram till kasernen.',                                         // [N]
      }),
      () => goto({ to: 'flamencoBack', radius: 10, inCar: true, passenger: 'berra', timer: (g, m) => homeTimer(m.data.wreck), text: 'Kör hem grisarna till hotellet!', failText: 'Ni kom aldrig fram.' }),   // [N]
    ],
    // Both face away from the shop: PEPES BODEGA is right behind them and nobody notices.
    outroPlace: { berra: ['bodega', -1.6, -1.0, PI], robban: ['bodega', 1.6, -1.0, PI] },
    outro: [
      ['robban', 'Ja, herre jävlar, minns du Benidorm? Snacka om grisfest!', { cut: 'bodega' }],                                                         // [F]
      ['berra', 'Var jag med där? Hade jag kul?'],                                                                                                       // [F]
      ['berra', 'Pepes Bodega… Den måste ligga nånstans, Robban.', { cut: null }],                                                                       // [N]
      // Angerud has opened the package: the answering machine, then Levander in Åre (film order).
      // Angerud is in a booth at the telephone station (he faces the booths, like the camera).
      ['telefonist', 'Hytt två!', { cut: 'telefon', place: { angerud: ['telefon', 0.6, 2.4] }, toast: 'Samtidigt har direktör Angerud öppnat sitt paket…' }],   // [F](t) the phone-station clerk (said in English in the film) · toast [N]
      ['levander', 'Detta är dr Levanders automatiska telefonsvarare. Solariet, flygrädslekliniken, bantningen och örtshopen är stängda över jul.'],      // [F]
      ['levander', 'Viktiga meddelanden kan lämnas till hotell Ambassadör i Åre.'],                                                                      // [F]
      ['levander', 'En målad åsna…? Idén med paketet var idiotisk redan från början.', { toast: 'Senare, i Åre…' }],                                     // [F] · toast [N]
      ['levander', 'Nu måste du få tillbaka pengarna. Snacka med honom. Han vill kanske ha hittelön. Gör nåt!'],                                         // [F]
      // Angerud corners Stig by the pool (the two face each other; the sisters sunbathe beside them,
      // facing the cut camera so their two lines are not said by their backs).
      ['angerud', 'Man måste ha mycket svenska pengar med sig hit… om man säger.', { cut: 'flamencoPool', place: { angerud: ['flamencoPool', 1.2, 1.0, PI / 2], stig: ['flamencoPool', -0.3, 0.8, -PI / 2], siv: ['flamencoPool', 3.0, 0.2, 0], majsan: ['flamencoPool', -2.6, 0.2, 0] } }],   // [F]
      ['angerud', 'Men det är ju inte samma sak att hitta något som att stjäla.'],                                                                       // [F]
      ['angerud', 'För om man hittar något, så kan man få hittelön. Tänk på det.', { sfx: 'slap' }],                                                     // [F]
      ['stig', 'Aj! Det ska jag göra.'],                                                                                                                 // [F]
      ['siv', 'Vad konstig han var!'],                                                                                                                   // [F](t)
      ['majsan', 'Det är kombinationen av sol och…'],                                                                                                    // [F](t) (the pool cut holds to the end)
    ],
  },

  // ===== §8.10 · 9 · ropavieja · "Gamla kläder" ===============================================
  {
    id: 'ropavieja', title: 'Gamla kläder', level: 'island', giver: 'siv', at: 'flamencoPool', reward: 700, extra: ['majsan'],
    intro: [
      ['siv', 'Han heter José. Och han jobbar inte på pizzeria.'],             // [F*] a plane line, relocated to the pool
      ['majsan', 'Datatekniker.'],                                            // [F](t)
      ['siv', 'Äkta spansk restaurang. Klockan sju.'],                         // [F*]
      ['majsan', 'Ta pepparn. Om han blir närgången.'],                       // [F*]
      ['majsan', 'Stig-Helmer, kan inte du hålla ett öga på dem? Diskret.'],   // [N]
    ],
    stages: [
      () => getInCar({ text: 'Hoppa in i en bil' }),   // [N]
      // José's mother rides in the back seat the whole time (the visible gag).
      () => follow({
        type: 'hatch', color: 0x2a4fa8, carName: 'joseBil', driver: 'jose', passenger: 'siv', riders: ['mamma'],
        start: { lane: [[5, 3], [4, 3]], t: 12 }, via: [[4, 4], [3, 4]], to: 'grillpacoCurb',
        maxDist: TUNING.joseFollow.maxDist, minDist: TUNING.joseFollow.minDist, minGrace: 2, cruise: TUNING.joseFollow.cruise,
        minText: 'José såg dig! Håll avståndet.', text: 'Följ José – men inte för nära!',                                  // [N] · [N]
        radio: [['jose', 'Jag ska bjuda dig på ett ställe som inga turister kommer till.'], ['siv', 'Det låter ju trevligt.'], ['jose', 'Äkta spanska maten på en restaurang.']],   // [F*] · [F] · [F*]
      }),
      () => goto({ to: 'plaza', radius: 4, onFoot: true, text: 'Parkera och spana diskret från fontänen' }),   // [N]
    ],
    outroPlace: { jose: ['grillpaco', 0, 0], siv: ['grillpaco', 1.2, 0], mamma: ['grillpacoMamma', 0, 0, 0] },   // Mamma faces her cut
    outroCam: ['jose', 'siv'],   // the spying shot: the player stays at the fountain; Siv answers in it
    outro: [
      ['jose', 'Kanarisk specialitet! Ropa vieja – gamla kläder.'],                       // [F]
      ['siv', 'Vad sa du?'],                                                             // [F]
      ['jose', 'Gamla kläder. Det är ungefär som pyttipanna.'],                          // [F]
      ['jose', 'Är det säkert att det inte gör nåt att mamma följde med?', { cut: { at: 'grillpacoMamma', dist: 5, height: 1.9 } }],   // [F] (in front of the Casa Lola pergola)
      ['siv', 'Vill hon inte sitta här?', { cut: null }],                                // [F]
      ['jose', 'Nej, hon vill inte vara i vägen.'],                                      // [F]
      ['siv', 'Jag fick användning för din peppar.', { toast: 'Dagen efter, vid poolen…', place: { siv: ['flamencoPool', 1.2, 0.6, PI / 2], majsan: ['flamencoPool', -1.2, 0.6, -PI / 2] }, cut: 'flamencoPool' }],   // [F] · toast [N]
      ['siv', 'Han kom och hämtade mig. Gissa vem han hade med sig… Morsan!'],           // [F]
      ['siv', 'Jag ska satsa på Ole nu. Jag har inga fördomar mot norrmän.'],            // [F]
      ['majsan', 'Nej, bara de inte går på tur…'],                                       // [F] (the pool cut holds to the end)
    ],
  },

  // ===== §8.11 · 10 · fataga · "En skock får" (P1, cut first) =================================
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
      () => getInCar({ text: 'Hoppa in i en bil' }),                                                     // [N]
      () => pickup({ who: 'majsan', name: 'Majsan', at: 'flamencoDrive', rider: 'siv', hello: 'Kör!' }),   // [N]
      // Lasse guides over the radio; Affe drives the excursion bus.
      () => follow({
        type: 'bus', carName: 'utflyktsbuss', driver: 'affe', start: { lane: [[3, 2], [3, 1]], t: 14 }, via: [[3, 1], [2, 1], [1, 1]], to: 'fatagaBus',
        maxDist: TUNING.bussFollow.maxDist, cruise: TUNING.bussFollow.cruise,
        text: 'Följ utflyktsbussen till Fataga',   // [N]
        radio: [
          ['lasse', 'Fataga är en av de få ursprungliga byar som finns kvar på Gran Canaria.'],                                                  // [F]
          ['lasse', 'Om ni vill köpa deras broderade dukar, så pruta inte. Prutning och sånt kan ni hålla på med på marknaden.'],             // [F]
        ],
      }),
      () => scene({
        // At Mamma's tablecloth stall, shot from the square: Mamma faces the camera, the tourists stand
        // either side of her, half turned to her.
        place: { mamma: ['fatagaDukar', 0, 0], fruStorch: ['fatagaDukar', -1.8, 2.2, PI + 0.5], siv: ['fatagaDukar', 1.5, 2.4, PI - 0.5], majsan: ['fatagaDukar', 2.9, 1.8, PI - 0.8] },
        cam: { at: 'dukarCam', dist: 7.5, height: 2.1 },
        lines: [
          ['fruStorch', 'Stackars människor som lever så här.'],                         // [F](t)
          ['mamma', 'Stackars människor. Släpas runt på dagarna som en skock får…!'],    // [F]
          ['mamma', '¡Las ovejas!', { sfx: 'baa' }],                                     // [N]
        ],
      }),
      () => rabbits({ mesh: 'faar', count: 6, near: 'fataga', rMin: 10, rMax: 35, timer: TIMERS.fatagaSheep, text: 'Fånga fåren åt Josés pappa', barLabel: 'FÅR', gotText: 'Bäää!', failText: 'Fåren sprang hela vägen till Maspalomas.' }),   // [N]
      () => goto({ to: 'fatagaFold', radius: 4, text: 'Tillbaka till fårfållan' }),   // [N]
    ],
    outroPlace: { pappa: ['fatagaFold', 1.5, 0], mamma: ['fatagaFold', -1.2, 0.6], siv: ['fatagaFold', -2.4, 1.6], majsan: ['fatagaFold', -1.4, 2.0] },
    outro: [
      ['pappa', '¡Gracias, señor!'],                                  // [N]
      ['mamma', 'Det är hon som vill ta min Josito ifrån mig.'],      // [F]
      ['majsan', 'Ska du inte köpa dukar av svärmor?'],               // [F](t)
    ],
  },

  // ===== §8.12 · 11 · grisfest · "Grisfesten" =================================================
  // cost 800 ("Grisfesten kostar 800 pesetas" [F*]; Ole pays if short). Checkpoints at stages 3, 4
  // and 5 (4 and 5 retry at the dance floor; a retry re-applies stage 2's night sky and `vals`).
  {
    id: 'grisfest', title: 'Grisfesten', level: 'island', giver: 'ole', at: 'flamenco', reward: 1000, cost: 800,
    intro: [
      ['ole', 'Skal du ha B-vitaminer? Bra for leveren. Grisefest, vet du. Ta to.'],                    // [F]
      ['ole', 'Og jeg har C-vitaminer… jerntabletter, ginseng, tannkrem…?'],                            // [F*]
      ['ole', 'Du, de er fine de rødhårete. Vi skulle ha satt inn et støt der.'],                       // [F]
      ['ole', 'Vi kan be resepsjonen sette blomster på rommet deres.'],                                 // [F*](t) rendered in Norwegian: "blomster" is Ole's word
      ['ole', 'Blomster? … Meloner? Agurker? Bananer?'],                                                // [F]
      ['stig', 'Men blommor… Gör man så i Norge?'],                                                     // [F](t)
      ['ole', 'Blomsterspråket er internasjonalt.'],                                                    // [F]
      ['ole', 'Fikser du ikke damer på grisefesten, da er det slutt. I kveld setter vi inn støtet!'],    // [F]
    ],
    stages: [
      () => rabbits({ mesh: 'blomma', flee: false, count: 5, near: 'flamenco', rMin: 8, rMax: 40, timer: TIMERS.grisfestFlowers, text: 'Plocka blomster till Siv och Maj-Britt', barLabel: 'BLOMSTER', gotText: 'Blomster!', failText: 'Blommorna vissnade.', radio: [['ole', 'Man må skifte vannet hver fjerde time og gi dem en hodepinetablett.']] }),   // [N] · radio [F*]
      () => getInCar({ text: 'Hoppa in i en bil – det börjar skymma', startCue: { sky: 'night', music: 'vals' } }),   // [N]
      // Start behind Hotel Flamenco (z -40) heading east past Pepes Bodega, Gabbe's bus on the lane
      // beside; left up x 40 past Centro Nórdico, left again along the farm road to the gate: ≈ 355 m,
      // two left turns (a 10.5 m bus cannot take the grid's tight right-turn lanes; route tuning, see
      // the WP-G report). Fail text: the kind's "Gabbe vann!".
      () => race({
        who: 'gabbe', type: 'bus', carName: 'nattbuss', cruise: TUNING.nattbuss.cruise, oppSpec: TUNING.nattbuss.spec, playerPassenger: 'ole',
        start: { lane: [[3, 3], [4, 3]], t: 14 }, checkpoints: [[4, 3], [4, 2], [4, 1], [3, 1]], finish: { x: -80, z: -200 },
        text: 'Bussen till grisfesten går nu – kom först!',                                   // [N]
        radio: [['gabbe', 'Grisfestbussen går nu – sista man bjuder på sangrian!']],            // [N] (§1.5: the song keeps its one line in mission 7)
        checkpoint: true,
      }),
      () => smash({ type: 'tallrikar', area: { lm: 'dansgolv', r: 22 }, count: 10, timer: TIMERS.grisfestPlates, lockMeter: true, onFoot: true, text: 'Porslinskross! Krossa tallrikarna medan bandet spelar', barLabel: 'TALLRIKAR', failText: 'Bandet slutade spela.', radio: [['pax', 'Vad skickliga de är!']], checkpoint: true, retryAt: 'dansgolv' }),   // [N] · radio [F](t)
      // Ole's `gris` shirt goes on the stage's startCue, so a checkpoint retry re-applies it (§10.4).
      () => scene({
        // A row across the floor: Ole, Stig facing Majsan, Siv. The two-shot comes from either side and
        // sees all four in profile. Stig's spot is the calibrate Tonga start (approachSpot('dansgolv')).
        place: { majsan: ['dansgolv', 1.2, 1.6, -PI / 2], siv: ['dansgolv', 2.8, 1.9, -PI / 2], ole: ['dansgolv', -1.8, 1.9, PI / 2], stig: ['dansgolv', -0.2, 1.6, PI / 2] }, frame: ['majsan', 'stig'],
        checkpoint: true, retryAt: 'dansgolv', startCue: { outfit: { who: 'ole', name: 'gris' } },
        lines: [
          ['ole', 'Neida, det er bare å spørre: Skal vi danse! Eller kjør litt større: Sånn! … Voulez-vous danse avec moi? Fransk.'],   // [F]
          ['stig', 'Jag är skraj att de ska nobba.'],                                                              // [F]
          ['majsan', 'Vill du dansa med mig?'],                                                                    // [F]
          ['stig', 'Får jag lov…', { anim: { who: ['stig', 'majsan'], flag: 'dance', secs: 6 } }],                  // [F](t)
          ['siv', 'Nu blev hon uppbjuden.'],                                                                       // [F](t)
          ['ole', 'Heia Norge!', { anim: { who: 'ole', flag: 'dance', secs: 4 }, applause: 2 }],                    // [F]
          ['siv', 'Majsan, ta med dig giraffen så går vi på Tonga Tonga.'],                                        // [F]
        ],
      }),
      () => goto({ to: 'tongatonga', radius: 10, inCar: true, timer: TIMERS.grisfestTonga, text: 'Till Tonga Tonga!' }),   // [N]
      () => scene({
        // In front of the TONGA TONGA sign, shot from the street (a side two-shot stood in the arcade).
        place: { ole: ['tongatonga', -2.2, 3.2, 0], majsan: ['tongatonga', 2.0, 3.0, 0], siv: ['tongatonga', 3.0, 3.4, 0], robban: ['tongatonga', -0.8, 1.2, -PI / 2], berra: ['tongaLot', 0, 0], stig: ['tongatonga', 0.8, 1.2, PI / 2] }, anim: { berra: 'slump' },
        cam: { at: 'tongatonga', dist: 6, height: 2.6 },
        lines: [
          ['ole', 'Samba er fine greier!', { music: 'samba' }],   // [F]
          ['robban', 'Kan du hjälpa mig bära hem Berra?'],         // [F]
          ['stig', 'Vilket snack! "Bärra hem Berra!"'],            // [F]
        ],
      }),
      () => pickup({ who: 'berra', name: 'Berra', at: 'tongaLot', rider: 'robban', hello: '…zzz' }),                                      // [N]
      () => goto({ to: 'flamencoDrive', radius: 10, inCar: true, passenger: 'berra', text: 'Kör hem till Hotell Flamenco' }),           // [N]
      () => carry({ who: 'berra', to: 'flamencoRecepcion', radius: 2.2, walkSpeed: 3.2, failOn: { fall: true }, text: 'Bärra hem Berra!', failText: 'Berra vaknade och började sjunga.' }),   // [F*] · [N] (P1; P0 fallback: dropoff at flamencoDrive)
    ],
    onEnd(g, reason) {
      if (reason === 'complete') g.cue({ banner: ['MORGONEN EFTER', 'Julafton på Gran Canaria', 'mission'] });   // [N]
      g.cue({ sky: 'day', music: g.levelTune() });   // the island's tune: `sol`, or the player's `samba`
    },
    // The desk from the porch front: the porter faces the camera, Angerud and Carmencita on his left and
    // Stig on his right face him side-on (a two-shot from under the porch put Angerud in front of him).
    outroPlace: { portier: ['flamencoRecepcion', 0, 0, 0], angerud: ['flamencoRecepcion', -1.4, 1.4, PI / 2], carmencita: ['flamencoRecepcion', -2.2, 1.6, PI / 2], majsan: ['flamencoPool', 0, 0], stig: ['flamencoRecepcion', 1.6, 2.6, -PI / 2] },
    outroCam: { at: 'recepcionCam', dist: 7.5, height: 2.0 },
    outro: [
      ['portier', 'Det är förbjudet att ta med damer på rummet. Men för 500 pesetas kanske vi kommer överens.'],                          // [F]
      ['angerud', '500 pesetas…? Det här är ju min fru.'],                                                                              // [F]
      ['portier', 'Det tror jag inte.'],                                                                                                // [F]
      ['angerud', 'En cigarrett, älskling?'],                                                                                           // [F](t)
      ['carmencita', 'Nej tack. Jag röker inte.'],                                                                                      // [F](t)
      ['portier', 'Jaså, din fru…?'],                                                                                                   // [F](t)
      ['angerud', 'Måtte djävulen ta alla fruntimmer!', { cut: 'flamencoBalcony', place: { angerud: ['flamencoBalcony', 0, 1.2, 0] } }],   // [F] on his room-113 patio
      // The orchestrator's order: the warm-nights talk and the mantra last, as the mission's button.
      // Just the two of them at the pool (Siv's home is beside it).
      ['majsan', 'Vad härligt det är med de här varma nätterna. Snart ska man hem till slasket igen. Jag vill inte åka hem.', { cut: 'flamencoPool', place: { majsan: ['flamencoPool', 0, 0, PI / 2], stig: ['flamencoPool', -1.3, 0, -PI / 2] }, hide: ['siv'] }],   // [F*](t)
      ['majsan', 'Jag gruvar mig lite för flygresan.'],                                                                                 // [F*]
      ['stig', 'Jag kan flyga, jag är inte rädd.', { anim: { who: 'stig', flag: 'wings', secs: 3 } }],                                   // [F*]
      ['majsan', 'Nu skulle Levander se oss!'],                                                                                         // [F*](t)
      ['majsan', 'Du… gillar du bruna bönor?'],                                                                                         // [F*](t)
      ['stig', 'Jag avskyr bruna bönor.'],                                                                                              // [F*](t) (the pool cut holds to the end)
    ],
  },

  // ===== §8.13 · 12 · julafton · "Julafton bland palmerna" ====================================
  // cost 100 (Ole pays if short); unlock 'bodega'; the end card after the outro.
  {
    id: 'julafton', title: 'Julafton bland palmerna', level: 'island', giver: 'ole', at: 'flamencoPatio', reward: 2000, cost: 100, unlock: 'bodega',
    intro: [
      ['ole', 'Morn, gutten min!'],                                                                                       // [F](t)
      ['stig', 'Morrn morrn.'],                                                                                           // [F](t)
      ['ole', 'Feliz navidad.'],                                                                                          // [F](t)
      ['stig', 'Vad sa du?'],                                                                                             // [F](t)
      ['ole', 'Det betyr \'god jul\' på spansk.'],                                                                        // [F*](t)
      // The knock: a cut to the patio front of room 107 (held to the end of the intro), Stig on his
      // approach spot between Ole and the man from the airport, who faces him.
      ['stig', 'Javisst, det är julafton i dag.', { sfx: 'knock', cut: { at: 'rum107Cam', dist: 7.5, height: 2.1 }, place: { ole: ['flamencoPatio', -1.5, 0.9, 0.6], stig: ['flamencoPatio', 0, 1.5, 1.3], hittegods: ['flamencoPatio', 1.5, 2.7, -1.6] } }],   // [F](t)
      ['hittegods', 'Hammarby…?'],                                                                                        // [F]
      ['stig', 'Ja!', { toast: 'Väskan är tillbaka!' }],                                                                  // [F] · toast [N]
      ['hittegods', 'Hittelön.', { coins: -25 }],                                                                         // [F](t)
      ['stig', 'Tack så mycket.'],                                                                                        // [F](t)
      ['lasse', 'Alla är välkomna på julfesten. Men man måste ha julmat och en julklapp för 100 pesetas.', { pa: true }],  // [F*]
      ['ole', 'Da tar jeg med sild og Stig-Helmer.'],                                                                     // [F*]
      ['stig', 'Norsk humor.'],                                                                                           // [F](t)
    ],
    stages: [
      // Round up the party guests all over town (invented, §1.6); Berra stands behind the hotel,
      // staring at nothing in particular.
      () => collect({
        who: ['herrStorch', 'fruStorch', 'berra', 'majsan'],
        findAt: { herrStorch: ['playa', 0, 0], fruStorch: ['kyrka', 0, 2], berra: ['bodega', -2.0, 0.5], majsan: ['marknad', 1, 1] },
        sendTo: { herrStorch: ['flamencoPool', 4, 2], fruStorch: ['flamencoPool', 5, 2], berra: ['flamencoBar', 0, 0], majsan: ['flamencoPool', -2, 0] },
        inCar: true, radius: 1.6, carRadius: 4.0, timer: TIMERS.julaftonGuests,
        text: 'Samla ihop gästerna till julfesten', barLabel: 'GÄSTER', failText: 'Julfesten började utan dem.',   // [N]
        lines: {
          herrStorch: [['stig', 'Herr Storch! Julfesten!'], ['herrStorch', 'Jag ska bara filma lite till.']],           // [N] · [N]
          fruStorch: [['stig', 'Fru Stork, julfesten börjar!'], ['fruStorch', 'Vi heter faktiskt Storch, inte Stork.']],   // [N] · [F*]
          berra: [['stig', 'Berra! Julfesten!'], ['berra', 'Jag kommer, jag ska bara kolla en grej.']],                   // [N] · [N]
          majsan: [['majsan', 'Titta inte! Det är en hemlighet.']],                                                     // [N] at the market, hiding something
        },
      }),
      () => goto({ to: 'flamencoPool', radius: 8, text: 'Till julfesten vid poolen!', startCue: { music: 'jul', outfit: { who: 'lasse', name: 'jul' } } }),   // [N]
      // The party payoffs: one group shot from the pool deck (everyone faces it, yaw 0), Stig among
      // the guests, the porter watching from the side; the bodega cutaway returns to the group shot.
      () => scene({
        cam: PARTY_CAM,
        place: { lasse: ['flamencoPool', 0, 3, 0], ole: ['flamencoPool', -1.5, 1, 0], herrStorch: ['flamencoPool', 3, 2, 0], fruStorch: ['flamencoPool', 4, 2, 0], majsan: ['flamencoPool', -2.5, 0.5, 0], siv: ['flamencoPool', -3.5, 1, 0], berra: ['flamencoPool', 5, -1, 0], robban: ['flamencoPool', 6, -1, 0], stig: ['flamencoPool', 1.0, 1.0, 0], portier: ['flamencoPool', -7, 0.5, -PI / 4] },
        lines: [
          ['lasse', 'Hej tomtegubbar, slå i glasen… Skål och god jul!', { music: 'hejTomtegubbar', applause: 2 }],      // [F](t)
          ['ole', 'Ta av lokket! Objektivlokket. Må ta av det, vet du.'],                                              // [F]
          ['ole', 'Har du filmet sånn lenge?'],                                                                       // [F]
          ['herrStorch', 'Hela veckan.'],                                                                             // [F]
          ['ole', 'Det var synd. Det blir ikke noe film da.'],                                                        // [F]
          ['herrStorch', 'Blir\'e inge film?'],                                                                       // [F]
          ['majsan', 'Jag har köpt en julklapp till dig.', { anim: { who: 'stig', flag: 'giraffe', secs: 6 } }],        // [F*] the morning conversation, relocated
          ['stig', 'Precis en sån har jag önskat mig.'],                                                              // [F](t)
          ['berra', 'Robban! Jag hittade Pepes Bodega!'],                                                             // [F]
          ['robban', 'Det var som fan! Var låg det?'],                                                                // [F]
          ['berra', 'Det ligger på baksidan av hotellet.', { cut: 'bodega' }],                                        // [F]
          ['robban', 'Och vi som har letat igenom hela jävla Nueva Estocolmo!', { cut: PARTY_CAM }],                   // [F]
          ['portier', 'De där svenskarna är heltokiga!', { music: 'smaGrodorna' }],                                   // [F](t) the Spaniards' line; the porter watches from the side
          ['stig', 'Julmaten från väskan… och knäckebrödet.', { anim: { who: 'stig', flag: 'butterKnife', secs: 3 } }],   // [N]
          ['ole', 'Hva i all verden…', { sparkle: true, sfx: 'pryl' }],                                               // [N]
          ['stig', 'Femtio… tusen… kronor. I knäckebrödet.'],                                                         // [N]
          ['ole', 'Femti tusen… Rio, Stig-Helmer! Stranda, jentene og samba!'],                                       // [F*]
        ],
      }),
      // The chaos at room 113; the heart attack stays off-screen (door, siren, one gentle caption).
      // Everyone faces the room (yaw π: north, towards the camera inside room 113).
      () => scene({
        cam: { at: 'rum113', dist: 6, height: 3 },
        place: { angerud: ['rum113', 0, 0.8, PI], stadare: ['rum113', -1.5, 1.6, PI], saljare: ['rum113', 1.5, 1.6, PI], mamma: ['rum113', -2.5, 2.4, PI], pappa: ['rum113', -3.2, 2.4, PI], carmencita: ['rum113', 2.5, 2.4, PI], jose: ['rum113', 3.2, 2.4, PI], siv: ['rum113', 0, 3.2, PI] },
        lines: [
          ['stadare', 'Limpio!'],                                                                                                 // [F]
          ['saljare', 'Jag var tvungen att sälja tomten i morse. De skrev på.'],                                                  // [F]
          ['mamma', 'Ni har dragit skam över vår familj!'],                                                                       // [F](t)
          ['carmencita', 'Det är inte han. Den andre!'],                                                                          // [F](t)
          ['mamma', 'Så gammal! Du skickar mig i graven!'],                                                                       // [F](t)
          ['stadare', 'God jul! Hoppsan. Stör jag?'],                                                                             // [F]
          ['siv', 'Gösta, ska du inte med på julfesten?'],                                                                        // [F]
          ['angerud', 'Ut! Ut!', { sfx: 'doorSlam', flash: 'white', hide: ['angerud'] }],                                          // [F]
          ['siv', '…', { sfx: 'ambulance', toast: 'En ambulans hämtade direktör Angerud. Han kommer att bli bra igen.' }],         // [N] Siv's silent beat carries the caption
        ],
      }),
      () => mantra({ duet: 'majsan', at: 'flamencoPool', radius: 4, secs: 4, text: 'Visa Majsan övningen – håll J', barLabel: 'JAG KAN FLYGA', startCue: { sky: 'sunset', place: { majsan: ['flamencoPool', 1.2, 0] }, say: ['majsan', 'Visa mig igen. Inför hemresan.'] } }),   // [N] ×2
    ],
    // Sunset, both in the wings pose, side by side facing the camera on the pool deck; Ole and Siv
    // behind them, the four of the Rio card (Ole has the last line).
    outroPlace: { majsan: ['flamencoPool', 0.9, 0.6, 0], stig: ['flamencoPool', -0.9, 0.6, 0], ole: ['flamencoPool', -2.6, 1.6, 0], siv: ['flamencoPool', 2.6, 1.6, 0] },
    outroCam: { at: 'flamencoPool', dist: 7, height: 2.4 },
    outro: [
      ['stig', 'Jag kan flyga, jag är inte rädd.', { anim: { who: ['stig', 'majsan'], flag: 'wings', secs: 6 } }],   // [F]
      ['majsan', 'Jag kan flyga, jag är inte rädd.', { anim: { who: 'majsan', flag: 'wings', secs: 4 } }],         // [F*] our staging of the binding duet
      ['ole', 'Og så Rio!', { endCard: true }],                                                                    // [F*]
    ],
  },
];
