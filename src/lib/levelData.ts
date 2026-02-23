import type { LevelGrid } from "./types";

/**
 * Level 1: 10x10 grid
 * 0 = vloer, 1 = muur, 2 = speler start, 3 = deur/terminal, 4 = sleutel, 5 = uitgang
 */
export const LEVEL_1: LevelGrid = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 3, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 1],
  [1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 4, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 5, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const GRID_SIZE = 10;
export const TILE_SIZE_PX = 48;
