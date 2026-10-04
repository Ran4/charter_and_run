// Merges the per-level content tables (frozen after Phase 0; the owners edit flight.js/island.js).

import { HOMES_GATE, HOMES_FLIGHT, MAP_LABELS_FLIGHT, LEVEL_OUTFITS_GATE, LEVEL_OUTFITS_FLIGHT } from './flight.js';
import { HOMES_ISLAND, MAP_LABELS_ISLAND, LEVEL_OUTFITS_ISLAND } from './island.js';

export const HOMES = { gate: HOMES_GATE, flight: HOMES_FLIGHT, island: HOMES_ISLAND };
export const MAP_LABELS = { flight: MAP_LABELS_FLIGHT, island: MAP_LABELS_ISLAND };
export const LEVEL_OUTFITS = { gate: LEVEL_OUTFITS_GATE, flight: LEVEL_OUTFITS_FLIGHT, island: LEVEL_OUTFITS_ISLAND };
export * from './flight.js';
export * from './island.js';
