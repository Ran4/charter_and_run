// The 13 missions in index order (flight 0-4, island 5-12) and the runner.
import { FLIGHT_MISSIONS } from './flight.js';
import { ISLAND_MISSIONS } from './island.js';

export const MISSIONS = [...FLIGHT_MISSIONS, ...ISLAND_MISSIONS];
export { MissionRunner } from './runner.js';
