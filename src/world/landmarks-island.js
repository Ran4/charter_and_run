// The canonical island landmark table (DESIGN §6.3). Registered before any block builder runs, so
// missions and tests work on stub blocks. A builder may override a landmark of its own block with
// f.mark(...) (reported in its hand-off); Phase 2 folds reported changes back into this table.
//   { b: [i, j], at: [lx, lz], yaw, y? }  block-local (block centre = (-240 + 80i, -240 + 80j))
//   { world: [x, z], yaw, y? }            world coordinates
// yaw = the direction a person standing there faces; y = absolute height for collectible spots.

import { landmarks, P, HALF } from './layout.js';

const PI = Math.PI;

export const ISLAND_LANDMARKS = {
  // (3,3) Hotel Flamenco
  flamenco: { b: [3, 3], at: [-4, -8], yaw: PI },     // faces the hotel: views camera on the pool deck (C1)
  flamencoRecepcion: { b: [3, 3], at: [2, -10], yaw: 0 },
  flamencoPatio: { b: [3, 3], at: [-18, -11], yaw: 0 },
  rum113: { b: [3, 3], at: [18, -11], yaw: 0 },
  flamencoBalcony: { b: [3, 3], at: [18, -8], yaw: PI },
  flamencoPool: { b: [3, 3], at: [-3, 18], yaw: PI },
  // Cut anchors (Phase 3; also dukarCam in Fataga): a cut stands `dist` m behind one, looking the way
  // it faces. rum107Cam is flamencoPatio turned round (the camera on the patio front, looking into
  // Stig and Ole's room 107); recepcionCam is flamencoRecepcion turned round (the desk seen from
  // south of the porch).
  rum107Cam: { b: [3, 3], at: [-18, -11], yaw: PI },
  recepcionCam: { b: [3, 3], at: [2, -10], yaw: PI },
  // The island spawn (level.spawn): approachSpot steps 1.5 m along yaw and turns round, so the
  // player stands on the pool deck at (-4, -1) facing the hotel, Ole under the pergola ahead and
  // the chase camera over the pool, not under the pergola slats.
  flamencoDeck: { b: [3, 3], at: [-4, -2.5], yaw: 0 },
  flamencoBar: { b: [3, 3], at: [16, 12], yaw: -PI / 2 },
  // Badgäster på solstolarna (free roam, §10.22): the two pool-deck sun loungers 7–8 m from BAR
  // PISCINA (their `solstol` props, hotels.js flamencoPool; yaw = the prop's facing, the backrest
  // end), where Berra and Robban lie and sleep in the sun after buss17. Not standing spots.
  stektBerra: { b: [3, 3], at: [8.2, 21.6], yaw: 0 },
  stektRobban: { b: [3, 3], at: [6.6, 21.6], yaw: 0 },
  flamencoDrive: { b: [3, 3], at: [-26, 22], yaw: PI },
  flamencoBack: { b: [3, 3], at: [-6, -33.5], yaw: 0 },
  bodega: { b: [3, 3], at: [8, -33.5], yaw: 0 },
  fena_flamenco: { b: [3, 3], at: [-3, 7], yaw: 0, y: 0.35 },
  // Siv och Majsan sätter poäng (free roam, §10.8): the middle of the diving board's bounce pad (top
  // 0.97, hotels.js), facing along it out over the deep end. Not a standing spot: the sisters' places
  // at the pool's edge are offsets from it (POOL_JUDGES.spots), and its block is the judged board.
  flamencoBoard: { b: [3, 3], at: [-14.1, 7], yaw: PI / 2 },
  // Från fjärde våningen (free roam, §10.20): the foot of the 10 m tower's ladder (its north face,
  // hotels.js diveTower), facing it: the E spot KLÄTTRA UPP and where KLÄTTRA NER puts him (turned
  // round); and the platform (y = its top, 9.95) beside the ladder's top, facing along the board out
  // over the deep end: the E spot KLÄTTRA NER and where KLÄTTRA UPP puts him. Not standing spots for
  // `teleport` (the platform is no ground-level floor; the tower solid only between missions).
  hopptorn: { b: [3, 3], at: [-15.5, 1.55], yaw: 0 },
  hopptornTopp: { b: [3, 3], at: [-15.6, 3.15], yaw: PI / 2, y: 9.95 },
  // Små grodorna (free roam, §10.13): the middle of the pool fest's ring in the shallow end (pool x
  // [-7, 6], z [1.5, 12.5]), 2.5 m east of the circling fin's path (fena_flamenco, r 1.2 round (-3, 7)).
  // Lasse stands here; the ring's places and Stig's gap (POOL_FEST) are round it.
  flamencoRing: { b: [3, 3], at: [2, 8], yaw: 0 },
  // Dygnet runt (free roam, §10.10): the middle of Stig's turquoise bed in room 107 (top 0.70,
  // hotels.js stigOleRoom), the way a sleeper on his back faces (feet to the patio, head on the
  // pillow by the back wall). The nap's E spot, and Ole's and Stig's places are offsets from it
  // (DAY.nap). Not a standing spot: `teleport` would put him on the mattress.
  stigSang: { b: [3, 3], at: [-19.75, -20.35], yaw: 0 },
  // Rum 107 fylls med resans minnen (free roam, §10.25): the room's three E spots, each where Stig
  // stands, facing what it is for (hotels.js stigOleRoom): the keepsake shelf over the print (between
  // the beds' feet), the plastic giraffe on his bed by the pillow (from the gap between the bed's head
  // and the dresser; the nap's spot is the middle of that side) and Ole's boombox on the dresser.
  rum107Hylla: { b: [3, 3], at: [-18, -18.9], yaw: PI },
  rum107Giraff: { b: [3, 3], at: [-18.85, -21.05], yaw: -PI / 2 },
  rum107Radio: { b: [3, 3], at: [-18, -20.45], yaw: PI },
  // (3,2) Hotel SunTrip
  suntrip: { b: [3, 2], at: [-14, 24], yaw: PI },     // faces the office porch (C1)
  // Bränsletillägg tillkommer (free roam, §10.23): Stig's spot in front of the middle of SunTrip-
  // butiken's counter on the office porch (hotels.js suntripShop), facing it.
  butik: { b: [3, 2], at: [-10.2, 22.95], yaw: PI },
  scen: { b: [3, 2], at: [0, -14], yaw: 0 },
  friskotek: { b: [3, 2], at: [-10, 8], yaw: 0 },
  suntripPool: { b: [3, 2], at: [14, 4], yaw: PI },
  suntripLot: { b: [3, 2], at: [24, 22], yaw: PI },
  fena_suntrip: { b: [3, 2], at: [14, 8], yaw: 0, y: 0.35 },
  // Bärra hem Berra (free roam, §10.6): the sun lounger by the SunTrip pool where Berra naps (its
  // `solstol` prop; yaw = the prop's facing, the backrest end).
  berraSolstol: { b: [3, 2], at: [17.4, 2.2], yaw: 0 },
  // (1,2) Centro La Medina
  kasbah: { b: [1, 2], at: [0, 22], yaw: PI },
  vikingbar: { b: [1, 2], at: [-16, 18], yaw: PI },
  tongatonga: { b: [1, 2], at: [14, 18], yaw: PI },
  tongaLot: { b: [1, 2], at: [20, 27], yaw: PI },
  // Where Berra slumps after Tonga Tonga (`tongatonga` offset (−2.3, 0.6)): at the right of the group
  // in the street shot of "bära hem Berra", and his pickup spot (Phase 3 r3; tongaLot is behind it).
  tongaSlump: { b: [1, 2], at: [16.3, 17.4], yaw: 0.5 },
  pryl_poolpen: { b: [1, 2], at: [8, -6], yaw: 0, y: 7.2 },
  // Lapplisan Majsan (free roam, §10.17): Angerud's hire car on the sidewalk outside the centre,
  // facing west with the traffic on that side (the palm 5 m ahead of its nose, the post box behind).
  angerudBil: { b: [1, 2], at: [-7, 32.75], yaw: -PI / 2 },
  // (4,2) Centro Nórdico
  cita: { b: [4, 2], at: [0, 22], yaw: PI },
  supermercado: { b: [4, 2], at: [-18, 18], yaw: PI },
  ferreteria: { b: [4, 2], at: [18, 18], yaw: PI },
  telefon: { b: [4, 2], at: [0, 8], yaw: PI },
  // (2,3) Plaza · Casa Lola
  plaza: { b: [2, 3], at: [0, 6.8], yaw: PI },        // south of the fountain rim, facing it (C2)
  grillpaco: { b: [2, 3], at: [20, 22], yaw: PI },
  grillpacoMamma: { b: [2, 3], at: [25, 24], yaw: PI },
  grillpacoCurb: { world: [-60, 36], yaw: -PI / 2 },
  fena_plaza: { b: [2, 3], at: [0, 0], yaw: 0, y: 0.35 },
  // Bärra hem Berra (free roam, §10.6): the bench south of the fountain where Berra naps (its `bank`
  // prop; yaw = the way the seat faces, away from the fountain).
  berraBank: { b: [2, 3], at: [0, 8.6], yaw: 0 },
  // (2,1) market
  marknad: { b: [2, 1], at: [0, 22], yaw: PI },
  asnestand: { b: [2, 1], at: [6, 2], yaw: PI },
  pryl_kalkylator: { b: [2, 1], at: [-12, -8], yaw: 0, y: 3.4 },
  // (3,1) Templo Ecuménico
  kyrka: { b: [3, 1], at: [0, 18], yaw: PI },
  // (4,3) gas station
  bensin: { b: [4, 3], at: [0, 16], yaw: PI },
  // The paint shop (free roam, §7.2): the zone in front of the workshop's left bay, facing out of it
  // (paintshop.js places the scene and the drive-by by offsets from it), and its cut anchor, the bay
  // seen from the forecourt.
  pintura: { b: [4, 3], at: [11.25, -8], yaw: 0 },
  pinturaCam: { b: [4, 3], at: [11.25, -9.6], yaw: PI },
  // (5,3) Guardia Civil barracks
  guardia: { b: [5, 3], at: [0, 20], yaw: PI },
  // tomato fields (0,1) and (3,0)
  vischan: { b: [0, 1], at: [6, 24], yaw: PI },
  vischanCam: { b: [0, 1], at: [5.7, 22.7], yaw: -0.14 },   // cut anchor (Phase 3): on the track north of the vischan scene, looking back at the road
  // The rollerskier's spot ("Heja Eslöv!"): on the Eslöv lane 6 m up from the z −120 road, facing it, so
  // the vischan drive passes him (Phase 3 r2: mid-lane at (28, 4) he stood 33 m off the route).
  eslovVag: { b: [0, 1], at: [27.5, 24], yaw: 0 },
  packhus: { b: [3, 0], at: [0, 10], yaw: PI },
  // (2,0) the grisfest farm
  grisfest: { b: [2, 0], at: [0, 26], yaw: PI },
  grisfestGate: { world: [-80, -204], yaw: PI / 2 },
  // Grisarna ramlar av grisbilen (free roam, §10.15): where the grisbil stops to send its pigs over
  // the piglet pen's east fence (x -14.8, nature.js), facing the pen, between the café table at
  // (-9.5, 16), the palm at (-8, 26) and the cart; and the pen's free middle (the shelter and the
  // trough left out), round which the delivered pigs wander.
  grisfalla: { b: [2, 0], at: [-11, 20.5], yaw: -PI / 2 },
  grisfallaIn: { b: [2, 0], at: [-18.5, 20.6], yaw: -PI / 2 },
  dansgolv: { b: [2, 0], at: [0, 0], yaw: 0 },
  pryl_pung: { b: [2, 0], at: [-18, -14], yaw: 0, y: 5.4 },
  // (0,0) Fataga
  fataga: { b: [0, 0], at: [0, 18], yaw: PI },
  fatagaBus: { world: [-240, -204], yaw: -PI / 2 },
  fatagaFold: { b: [0, 0], at: [-18, -12], yaw: 0 },
  fatagaDukar: { b: [0, 0], at: [8, 4], yaw: PI },
  dukarCam: { b: [0, 0], at: [8, 4], yaw: 0 },        // cut anchor: fatagaDukar turned round (camera on the square)
  pryl_kniv: { b: [0, 0], at: [0, 0], yaw: 0, y: 1.2 },
  // (4,0) golf
  golf: { b: [4, 0], at: [0, 22], yaw: PI },
  fena_golf: { b: [4, 0], at: [-10, -6], yaw: 0, y: 0.35 },
  // (5,0) Angerud's show bungalow
  bungalow: { b: [5, 0], at: [0, 22], yaw: PI },
  fena_bungalow: { b: [5, 0], at: [6, -4], yaw: 0, y: 0.35 },
  // (5,1) building site
  bygge: { b: [5, 1], at: [0, 22], yaw: PI },
  pryl_klocka: { b: [5, 1], at: [6, -6], yaw: 0, y: 7.6 },
  // (6,1) the old dream plane
  dromplan: { b: [6, 1], at: [0, 20], yaw: PI },
  pryl_kamera: { b: [6, 1], at: [-4, -2], yaw: 0, y: 3.6 },
  // (6,0) Gando airport
  airport: { b: [6, 0], at: [0, 22], yaw: PI },
  hittegods: { b: [6, 0], at: [-14, 6], yaw: 0 },
  busBay: { b: [6, 0], at: [16, 24], yaw: -PI / 2 },
  bagageband: { b: [6, 0], at: [6, 11], yaw: PI },   // south of the carousel, facing it: views camera on the forecourt (Phase 3)
  // (0,4) dunes
  dyner: { b: [0, 4], at: [0, 0], yaw: PI - 0.4 },    // faces the arch: views camera on the sand south of it, clear of the boardwalk palms (Phase 3)
  // (0,6) lighthouse
  fyren: { b: [0, 6], at: [0, 10], yaw: PI },
  // (3,6) beach, (5,6) harbour
  playa: { b: [3, 6], at: [0, 10], yaw: 0 },
  fena_hav: { world: [0, 304], yaw: 0, y: 0.35 },
  hamn: { b: [5, 6], at: [0, 0], yaw: PI },
  fena_hamn: { b: [5, 6], at: [-8, 10], yaw: 0, y: 0.35 },
  pryl_glasogon: { b: [5, 6], at: [12, 28], yaw: 0, y: 1.2 },
  // The G17 toasters (feature 33, §10.24), on things that were there, with no collider of their own:
  // `y` is the top a toaster stands on, `yaw` the side Stig checks it from (its front).
  brodrost_ferreteria: { b: [4, 2], at: [25.6, 13.0], yaw: 0, y: 0.65 },          // FERRETERÍA's paint-can crate
  brodrost_poolbar: { b: [3, 3], at: [18.0, 15.45], yaw: -PI / 2, y: 1.33 },      // BAR PISCINA's counter, its south end
  brodrost_marknad: { b: [2, 1], at: [-11.186, -6.4], yaw: 0, y: 1.08 },          // stall K's counter, among the radios
  brodrost_portier: { b: [3, 3], at: [3.75, -11.2], yaw: 0, y: 1.28 },            // the porter's desk, east of the bell
  brodrost_supermercado: { b: [4, 2], at: [-24.15, 13.0], yaw: 0, y: 0.6 },       // SUPERMERCADO's east fruit crate
  brodrost_grillpaco: { b: [2, 3], at: [15.0, 19.0], yaw: PI / 2, y: 0.945 },     // a café table on Casa Lola's terrace
  brodrost_hittegods: { b: [6, 0], at: [-17.4, 7.35], yaw: 0, y: 1.23 },          // the lost-and-found counter
};

export const blockCentre = (i, j) => ({ x: -HALF + P / 2 + P * i, z: -HALF + P / 2 + P * j });

export function registerIslandLandmarks() {
  for (const [name, d] of Object.entries(ISLAND_LANDMARKS)) {
    let x, z;
    if (d.world) [x, z] = d.world;
    else { const c = blockCentre(d.b[0], d.b[1]); x = c.x + d.at[0]; z = c.z + d.at[1]; }
    const l = { x, z, yaw: d.yaw };
    if (d.y !== undefined) l.y = d.y;
    landmarks[name] = l;
  }
}
