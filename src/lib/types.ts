/** Tegeltypes voor het level: 0=vloer, 1=muur, 2=speler start, 3=deur/terminal, 4=sleutel, 5=uitgang */
export type TileType = 0 | 1 | 2 | 3 | 4 | 5;

export type GridRow = TileType[];
export type LevelGrid = GridRow[];

export interface Position {
  row: number;
  col: number;
}
