import type { LevelGrid } from "./types";

/**
 * 12x12 doolhof: start (2), uitgang (5), minimaal 5 deuren (3)
 * 0 = vloer, 1 = muur, 2 = speler start, 3 = deur/terminal, 4 = sleutel, 5 = uitgang
 */
export const MAZE_12X12: LevelGrid = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 0, 3, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 3, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 3, 1, 1, 0, 0, 0, 1],
  [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 5, 1],
  [1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 3, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const GRID_SIZE = 10;
export const GRID_SIZE_MAZE = 12;
export const TILE_SIZE_PX = 48;
