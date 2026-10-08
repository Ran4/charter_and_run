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
  // The island spawn (level.spawn): approachSpot steps 1.5 m along yaw and turns round, so the
  // player stands on the pool deck at (-4, -1) facing the hotel, Ole under the pergola ahead and
  // the chase camera over the pool, not under the pergola slats.
  flamencoDeck: { b: [3, 3], at: [-4, -2.5], yaw: 0 },
  flamencoBar: { b: [3, 3], at: [16, 12], yaw: -PI / 2 },
  flamencoDrive: { b: [3, 3], at: [-26, 22], yaw: PI },
  flamencoBack: { b: [3, 3], at: [-6, -33.5], yaw: 0 },
  bodega: { b: [3, 3], at: [8, -33.5], yaw: 0 },
  fena_flamenco: { b: [3, 3], at: [-3, 7], yaw: 0, y: 0.35 },
  // (3,2) Hotel SunTrip
  suntrip: { b: [3, 2], at: [-14, 24], yaw: PI },     // faces the office porch (C1)
  scen: { b: [3, 2], at: [0, -14], yaw: 0 },
  friskotek: { b: [3, 2], at: [-10, 8], yaw: 0 },
  suntripPool: { b: [3, 2], at: [14, 4], yaw: PI },
  suntripLot: { b: [3, 2], at: [24, 22], yaw: PI },
  fena_suntrip: { b: [3, 2], at: [14, 8], yaw: 0, y: 0.35 },
  // (1,2) Centro La Medina
  kasbah: { b: [1, 2], at: [0, 22], yaw: PI },
  vikingbar: { b: [1, 2], at: [-16, 18], yaw: PI },
  tongatonga: { b: [1, 2], at: [14, 18], yaw: PI },
  tongaLot: { b: [1, 2], at: [20, 27], yaw: PI },
  pryl_poolpen: { b: [1, 2], at: [8, -6], yaw: 0, y: 7.2 },
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
  // (2,1) market
  marknad: { b: [2, 1], at: [0, 22], yaw: PI },
  asnestand: { b: [2, 1], at: [6, 2], yaw: PI },
  pryl_kalkylator: { b: [2, 1], at: [-12, -8], yaw: 0, y: 3.4 },
  // (3,1) Templo Ecuménico
  kyrka: { b: [3, 1], at: [0, 18], yaw: PI },
  // (4,3) gas station
  bensin: { b: [4, 3], at: [0, 16], yaw: PI },
  // (5,3) Guardia Civil barracks
  guardia: { b: [5, 3], at: [0, 20], yaw: PI },
  // tomato fields (0,1) and (3,0)
  vischan: { b: [0, 1], at: [6, 24], yaw: PI },
  eslovVag: { b: [0, 1], at: [28, 4], yaw: -PI / 2 },
  packhus: { b: [3, 0], at: [0, 10], yaw: PI },
  // (2,0) the grisfest farm
  grisfest: { b: [2, 0], at: [0, 26], yaw: PI },
  grisfestGate: { world: [-80, -204], yaw: PI / 2 },
  dansgolv: { b: [2, 0], at: [0, 0], yaw: 0 },
  pryl_pung: { b: [2, 0], at: [-18, -14], yaw: 0, y: 5.4 },
  // (0,0) Fataga
  fataga: { b: [0, 0], at: [0, 18], yaw: PI },
  fatagaBus: { world: [-240, -204], yaw: -PI / 2 },
  fatagaFold: { b: [0, 0], at: [-18, -12], yaw: 0 },
  fatagaDukar: { b: [0, 0], at: [8, 4], yaw: PI },
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
