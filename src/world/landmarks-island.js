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
  // Poolbaren öppnar (free roam, §10.44): the bartender's place behind BAR PISCINA's counter (the aisle
  // x [18.5, 20], outside the kiosk's footprint), by the percolator, facing the pool; and the coffee's E
  // spot before the counter's north end, facing it (3.56 m from flamencoBar, out of a giver's 3.4 m).
  camarero: { b: [3, 3], at: [19.1, 9.4], yaw: -PI / 2 },
  poolbarKaffe: { b: [3, 3], at: [17.05, 8.6], yaw: PI / 2 },
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
  // Skjortbytet (free roam, §7.2): where Stig stands in front of the wardrobe inside room 107's door
  // (hotels.js stigOleRoom, its front at x −20.15), facing it: the second hideout's E spot.
  rum107Garderob: { b: [3, 3], at: [-19.6, -15.6], yaw: -PI / 2 },
  gagKamera: { b: [3, 3], at: [-8.3, -11.2], yaw: -PI / 2 },   // facing Ole's camera bag on the patio wall's cap (the gag, §10.32)
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
  // Mikrofonen på scenen (free roam, §10.30): where Stig stands on the welcome stage (top 0.55)
  // behind the microphone's stand (hotels.js suntripStage, at (0, -10.6)), facing the lawn: the E spot.
  mikrofon: { b: [3, 2], at: [0, -11.2], yaw: 0 },
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
  gagViking: { b: [1, 2], at: [-14.75, 12.1], yaw: PI },        // under the lamp beside Viking Bar's door, facing it (the gag, §10.32)
  // (4,2) Centro Nórdico
  cita: { b: [4, 2], at: [0, 22], yaw: PI },
  supermercado: { b: [4, 2], at: [-18, 18], yaw: PI },
  ferreteria: { b: [4, 2], at: [18, 18], yaw: PI },
  telefon: { b: [4, 2], at: [0, 8], yaw: PI },
  // Hytt två! (free roam, §10.43): the car park's three spots for a car called from booth 2, in the
  // aisle north of the bays (z 25.7) and clear of the lamp posts at (±14, 24.6), facing the street
  // ends (out of the camera's view at the booth; a bus is 10.5 m long).
  hyttBil1: { b: [4, 2], at: [11, 18.6], yaw: PI / 2 },
  hyttBil2: { b: [4, 2], at: [11, 22.4], yaw: PI / 2 },
  hyttBil3: { b: [4, 2], at: [-11, 18.6], yaw: -PI / 2 },
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
  // Kyrkfrid (free roam, §7.2): before the church door's right leaf under the portico, facing out
  // (the E spot; the scene's spots are offsets from it, METERS.skandal.kyrkfrid), and the cut anchor
  // of the wait's shot, the door and the sisters' sign seen from the plaza.
  kyrkaPuerta: { b: [3, 1], at: [0.8, 2.2], yaw: 0 },
  kyrkaCam: { b: [3, 1], at: [-2, 9], yaw: PI },
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
  // Vi liftar (free roam, §10.47): the hitch-hiking spots, on the north sidewalk of a country road,
  // facing it, with the westbound lane's traffic coming from his left (the east): by the CAMINO SIN
  // ASFALTAR sign at the vischan track's mouth (the z −120 road), and before the packing shed's yard
  // (the z −200 road).
  liftaVischan: { b: [0, 1], at: [7, 33.2], yaw: 0 },
  liftaPackhus: { b: [3, 0], at: [6, 33.2], yaw: 0 },
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
  // The stunt jumps' take-offs (§10.27; not spots to stand on): the plank's end on the 1st floor and
  // the yellow ramp's crest.
  stunt_planka: { b: [5, 1], at: [22, -1.4], yaw: PI / 2, y: 4.45 },
  stunt_gula: { b: [5, 1], at: [-16, 4], yaw: PI, y: 1.95 },
  // (4,4) Hoppet mellan hotelltaken (feature 41, §10.29): the seven-storey pair in the north row
  // (town.js roofWalk; ATLÁNTICO lot-local x = world x − 80, SOL DE INVIERNO x − 100.667, both z − 49).
  // The lobbies' E spots face their doors (the stairs down put him there turned round); the roof
  // spots stand in front of the lift rooms' doors, SOL DE INVIERNO's facing the gap (where the stairs
  // up put him); `takUtsikt` faces the sea by ATLÁNTICO's south edge (not an E spot).
  takSolLobby: { world: [100.667, 54.3], yaw: 0 },
  takSolTopp: { world: [104.97, 61.46], yaw: -PI / 2, y: 21.09 },
  takAtlTopp: { world: [84.2, 61.65], yaw: 0, y: 21.09 },
  takAtlLobby: { world: [80, 54.85], yaw: 0 },
  takUtsikt: { world: [80.0, 65.9], yaw: 0, y: 21.09 },
  // (6,1) the old dream plane
  dromplan: { b: [6, 1], at: [0, 20], yaw: PI },
  pryl_kamera: { b: [6, 1], at: [-4, -2], yaw: 0, y: 3.6 },
  stunt_landning: { b: [6, 1], at: [-26, -1.4], yaw: PI / 2 },   // the plank jump's run-out, west of the wing tip (§10.27)
  // (6,0) Gando airport
  airport: { b: [6, 0], at: [0, 22], yaw: PI },
  hittegods: { b: [6, 0], at: [-14, 6], yaw: 0 },
  busBay: { b: [6, 0], at: [16, 24], yaw: -PI / 2 },
  bagageband: { b: [6, 0], at: [6, 11], yaw: PI },   // south of the carousel, facing it: views camera on the forecourt (Phase 3)
  // (0,4) dunes
  dyner: { b: [0, 4], at: [0, 0], yaw: PI - 0.4 },    // faces the arch: views camera on the sand south of it, clear of the boardwalk palms (Phase 3)
  // (0,6) lighthouse
  fyren: { b: [0, 6], at: [0, 10], yaw: PI },
  // Uppför fyren (free roam, §10.35): before the keeper's house's arched door on its south wall,
  // facing it (E: up the tower), and on the gallery 51.3 m up, outside the lantern's door on its
  // north-east side, facing out over the town (E: down again). Block-local: the tower's axis is (0, -8).
  fyrDorr: { b: [0, 6], at: [0, 1.4], yaw: PI },
  fyrGalleri: { b: [0, 6], at: [2.4 * Math.SQRT1_2, -8 - 2.4 * Math.SQRT1_2], yaw: PI * 0.75, y: 51.3 },
  // (3,6) beach, (5,6) harbour
  playa: { b: [3, 6], at: [0, 10], yaw: 0 },
  fena_hav: { world: [0, 304], yaw: 0, y: 0.35 },
  hamn: { b: [5, 6], at: [0, 0], yaw: PI },
  fena_hamn: { b: [5, 6], at: [-8, 10], yaw: 0, y: 0.35 },
  pryl_glasogon: { b: [5, 6], at: [12, 28], yaw: 0, y: 1.2 },
  // Båtturen med PALOMA (free roam, §10.41): before the PASEOS EN BARCO kiosk's window at the pier
  // root, facing it (E: the trip).
  battur: { b: [5, 6], at: [18.5, -0.4], yaw: PI },
  // Meta från piren (free roam, §10.45): Stig's spot at the east edge of the pier's end platform (x 9–15,
  // z 26–29.5, deck 0.55), 1.6 m north of the green harbour light, facing the basin (E: a cast); 0.6 m
  // inside the edge, 2.3 m from pryl_glasogon and out of the pier coins' pull.
  fiske: { b: [5, 6], at: [14.2, 27.4], yaw: PI / 2 },
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
